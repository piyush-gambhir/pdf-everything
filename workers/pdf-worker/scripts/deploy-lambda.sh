#!/usr/bin/env bash
# Deploy pdf-worker to AWS Lambda as a container image (Function URL).
#
# Builds deploy/lambda/Dockerfile and pushes it to ECR (or takes an image
# already in ECR by IMAGE_DIGEST), points the function at that exact digest,
# publishes a version and, when ALIAS_NAME is set, moves the alias to it.
#
# The function's existing configuration is kept: its environment variables
# survive (API_TOKEN, when set, is merged into them), and memory and timeout
# change only when MEMORY_MB or TIMEOUT_S is set. Every update names the
# revision it read, so a change made meanwhile fails the deploy instead of
# being overwritten. Idempotent: safe to re-run.
#
#   bash scripts/deploy-lambda.sh
#
# Reads config from .env.deploy.lambda (gitignored). See .env.deploy.example.
# Requires: aws CLI v2, node (to merge the environment), AWS credentials in
# the env, and docker with buildx unless IMAGE_DIGEST is set.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env.deploy.lambda"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: ${ENV_FILE} not found." >&2
  echo "       copy .env.deploy.example to ${ENV_FILE} and fill in the AWS values." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# --- required ---
: "${AWS_REGION:?set AWS_REGION in ${ENV_FILE}}"
: "${ECR_REPOSITORY:?set ECR_REPOSITORY in ${ENV_FILE} (e.g. pdf-everything-pdf-worker)}"
: "${FUNCTION_NAME:?set FUNCTION_NAME in ${ENV_FILE}}"
: "${LAMBDA_EXECUTION_ROLE_ARN:?set LAMBDA_EXECUTION_ROLE_ARN in ${ENV_FILE}}"

# --- optional ---
ARCHITECTURE="${ARCHITECTURE:-arm64}"          # arm64 | x86_64
MEMORY_MB="${MEMORY_MB:-}"                     # unset keeps the function's (2048 on create)
TIMEOUT_S="${TIMEOUT_S:-}"                     # unset keeps the function's (60 on create)
FUNCTION_URL_AUTH="${FUNCTION_URL_AUTH:-AWS_IAM}"  # AWS_IAM | NONE (NONE = public!)
API_TOKEN="${API_TOKEN:-}"                     # bearer token enforced on render routes
IMAGE_DIGEST="${IMAGE_DIGEST:-}"               # sha256:... already in ECR_REPOSITORY; skips the build
ALIAS_NAME="${ALIAS_NAME:-}"                   # alias moved to the new version, e.g. live

case "$ARCHITECTURE" in
  arm64)  DOCKER_PLATFORM="linux/arm64" ;;
  x86_64) DOCKER_PLATFORM="linux/amd64" ;;
  *) echo "error: ARCHITECTURE must be arm64 or x86_64 (got '$ARCHITECTURE')" >&2; exit 1 ;;
esac

if [[ -n "$IMAGE_DIGEST" && ! "$IMAGE_DIGEST" =~ ^sha256:[0-9a-f]{64}$ ]]; then
  echo "error: IMAGE_DIGEST must be sha256:<64 hex digits> (got '$IMAGE_DIGEST')" >&2
  exit 1
fi

# Scratch files (the merged environment holds secrets): private, removed on exit.
umask 077
SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_URI="${ECR_REGISTRY}/${ECR_REPOSITORY}"

echo "==> Account ${ACCOUNT_ID} | region ${AWS_REGION} | arch ${ARCHITECTURE}"

# 1. The image: build and push one, or take the given digest.
if [[ -z "$IMAGE_DIGEST" ]]; then
  if ! aws ecr describe-repositories --repository-names "$ECR_REPOSITORY" --region "$AWS_REGION" >/dev/null 2>&1; then
    echo "==> Creating ECR repository ${ECR_REPOSITORY}"
    aws ecr create-repository --repository-name "$ECR_REPOSITORY" --region "$AWS_REGION" >/dev/null
  fi

  echo "==> Logging in to ECR"
  aws ecr get-login-password --region "$AWS_REGION" \
    | docker login --username AWS --password-stdin "$ECR_REGISTRY"

  GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo manual)"
  TAG="${GIT_SHA}-$(date -u +%Y%m%d%H%M%S)"
  # --provenance=false avoids the OCI image index that Lambda's image loader
  # rejects. The tag is for people; the function is pointed at the digest.
  echo "==> Building and pushing ${ECR_URI}:${TAG}"
  docker buildx build \
    --platform "$DOCKER_PLATFORM" \
    --provenance=false \
    --file deploy/lambda/Dockerfile \
    --tag "${ECR_URI}:${TAG}" \
    --metadata-file "${SCRATCH}/build.json" \
    --push \
    .
  IMAGE_DIGEST="$(node -e '
    const meta = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
    process.stdout.write(meta["containerimage.digest"] ?? "");
  ' "${SCRATCH}/build.json")"
  if [[ ! "$IMAGE_DIGEST" =~ ^sha256:[0-9a-f]{64}$ ]]; then
    echo "error: the build reported no image digest." >&2
    exit 1
  fi
fi

# 2. Verify ECR holds that digest as a single-platform image, not an index.
MEDIA_TYPE="$(aws ecr describe-images \
  --repository-name "$ECR_REPOSITORY" \
  --image-ids "imageDigest=${IMAGE_DIGEST}" \
  --region "$AWS_REGION" \
  --query 'imageDetails[0].imageManifestMediaType' \
  --output text)"
case "$MEDIA_TYPE" in
  application/vnd.docker.distribution.manifest.v2+json | application/vnd.oci.image.manifest.v1+json) ;;
  *)
    echo "error: ${ECR_URI}@${IMAGE_DIGEST} is '${MEDIA_TYPE}', not a single-platform image." >&2
    echo "       Lambda needs one platform's manifest; see workers/DEPLOYMENT.md." >&2
    exit 1
    ;;
esac
IMAGE_URI="${ECR_URI}@${IMAGE_DIGEST}"
echo "==> Image ${IMAGE_URI}"

# The function's current environment with API_TOKEN merged in, written to a
# private file for --environment, and the revision the variables came from.
merged_environment() {
  aws lambda get-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --region "$AWS_REGION" \
    --query '{revision: RevisionId, variables: Environment.Variables}' \
    --output json \
  | node -e '
    let input = "";
    process.stdin.on("data", (chunk) => (input += chunk)).on("end", () => {
      const { revision, variables } = JSON.parse(input);
      const merged = { ...(variables ?? {}), API_TOKEN: process.env.API_TOKEN };
      require("node:fs").writeFileSync(process.argv[1], JSON.stringify({ Variables: merged }));
      process.stdout.write(revision);
    });
  ' "${SCRATCH}/environment.json"
}

current_revision() {
  aws lambda get-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --region "$AWS_REGION" \
    --query RevisionId \
    --output text
}

# 3. Create the function, or update its code and only the settings asked for.
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
  echo "==> Updating function code: ${FUNCTION_NAME}"
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --image-uri "$IMAGE_URI" \
    --revision-id "$(current_revision)" \
    --region "$AWS_REGION" >/dev/null
  aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$AWS_REGION"

  CONFIG_ARGS=()
  [[ -n "$MEMORY_MB" ]] && CONFIG_ARGS+=(--memory-size "$MEMORY_MB")
  [[ -n "$TIMEOUT_S" ]] && CONFIG_ARGS+=(--timeout "$TIMEOUT_S")
  if [[ -n "$API_TOKEN" ]]; then
    REVISION="$(merged_environment)"
    CONFIG_ARGS+=(--environment "file://${SCRATCH}/environment.json")
  else
    REVISION="$(current_revision)"
  fi
  if ((${#CONFIG_ARGS[@]})); then
    echo "==> Updating function configuration (environment variables kept)"
    aws lambda update-function-configuration \
      --function-name "$FUNCTION_NAME" \
      --revision-id "$REVISION" \
      "${CONFIG_ARGS[@]}" \
      --region "$AWS_REGION" >/dev/null
    aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$AWS_REGION"
  fi
else
  echo "==> Creating function: ${FUNCTION_NAME}"
  CREATE_ARGS=()
  if [[ -n "$API_TOKEN" ]]; then
    node -e '
      require("node:fs").writeFileSync(
        process.argv[1],
        JSON.stringify({ Variables: { API_TOKEN: process.env.API_TOKEN } }),
      );
    ' "${SCRATCH}/environment.json"
    CREATE_ARGS+=(--environment "file://${SCRATCH}/environment.json")
  fi
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --package-type Image \
    --code "ImageUri=${IMAGE_URI}" \
    --role "$LAMBDA_EXECUTION_ROLE_ARN" \
    --architectures "$ARCHITECTURE" \
    --memory-size "${MEMORY_MB:-2048}" \
    --timeout "${TIMEOUT_S:-60}" \
    ${CREATE_ARGS[@]+"${CREATE_ARGS[@]}"} \
    --region "$AWS_REGION" >/dev/null
  aws lambda wait function-active-v2 --function-name "$FUNCTION_NAME" --region "$AWS_REGION"
fi

# 4. Publish exactly the revision just made, and check it runs the digest.
VERSION="$(aws lambda publish-version \
  --function-name "$FUNCTION_NAME" \
  --revision-id "$(current_revision)" \
  --description "${IMAGE_DIGEST}" \
  --region "$AWS_REGION" \
  --query Version \
  --output text)"
aws lambda wait published-version-active --function-name "$FUNCTION_NAME" --qualifier "$VERSION" --region "$AWS_REGION"
RESOLVED="$(aws lambda get-function \
  --function-name "$FUNCTION_NAME" \
  --qualifier "$VERSION" \
  --region "$AWS_REGION" \
  --query Code.ResolvedImageUri \
  --output text)"
if [[ "$RESOLVED" != *"@${IMAGE_DIGEST}" ]]; then
  echo "error: version ${VERSION} runs ${RESOLVED}, not ${IMAGE_DIGEST}." >&2
  exit 1
fi
echo "==> Published version ${VERSION}"

# 5. Move the alias, if one is named; the previous version is the rollback.
PREVIOUS_VERSION=""
if [[ -n "$ALIAS_NAME" ]]; then
  if PREVIOUS_VERSION="$(aws lambda get-alias --function-name "$FUNCTION_NAME" --name "$ALIAS_NAME" \
      --region "$AWS_REGION" --query FunctionVersion --output text 2>/dev/null)"; then
    echo "==> Moving alias ${ALIAS_NAME}: ${PREVIOUS_VERSION} -> ${VERSION}"
    aws lambda update-alias \
      --function-name "$FUNCTION_NAME" \
      --name "$ALIAS_NAME" \
      --function-version "$VERSION" \
      --region "$AWS_REGION" >/dev/null
  else
    PREVIOUS_VERSION=""
    echo "==> Creating alias ${ALIAS_NAME} -> ${VERSION}"
    aws lambda create-alias \
      --function-name "$FUNCTION_NAME" \
      --name "$ALIAS_NAME" \
      --function-version "$VERSION" \
      --region "$AWS_REGION" >/dev/null
  fi
fi

# 6. Ensure a Function URL exists (on the unqualified function).
if ! aws lambda get-function-url-config --function-name "$FUNCTION_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
  echo "==> Creating Function URL (auth: ${FUNCTION_URL_AUTH})"
  aws lambda create-function-url-config \
    --function-name "$FUNCTION_NAME" \
    --auth-type "$FUNCTION_URL_AUTH" \
    --region "$AWS_REGION" >/dev/null
  if [[ "$FUNCTION_URL_AUTH" == "NONE" ]]; then
    # Public URL needs an explicit resource policy permitting unauthenticated invokes.
    aws lambda add-permission \
      --function-name "$FUNCTION_NAME" \
      --statement-id FunctionURLAllowPublicAccess \
      --action lambda:InvokeFunctionUrl \
      --principal '*' \
      --function-url-auth-type NONE \
      --region "$AWS_REGION" >/dev/null 2>&1 || true
  fi
fi

FUNCTION_URL="$(aws lambda get-function-url-config --function-name "$FUNCTION_NAME" --region "$AWS_REGION" --query FunctionUrl --output text)"

echo
echo "==> Deployed."
echo "    image:        ${IMAGE_URI}"
echo "    version:      ${VERSION}"
if [[ -n "$ALIAS_NAME" ]]; then
  echo "    alias:        ${ALIAS_NAME} -> ${VERSION}"
  if [[ -n "$PREVIOUS_VERSION" ]]; then
    echo "    roll back:    aws lambda update-alias --function-name ${FUNCTION_NAME} --name ${ALIAS_NAME} --function-version ${PREVIOUS_VERSION} --region ${AWS_REGION}"
  fi
fi
echo "    function URL: ${FUNCTION_URL}"
echo
if [[ "$FUNCTION_URL_AUTH" == "AWS_IAM" ]]; then
  echo "    Auth is AWS_IAM — sign requests with SigV4 (e.g. 'awscurl')."
else
  echo "    Smoke test:"
  echo "      curl -X POST \"${FUNCTION_URL}v1/render/markdown\" \\"
  echo "        -H 'content-type: application/json' \\"
  echo "        -d '{\"markdown\":\"# Hello\",\"options\":{\"template\":\"rca\"}}' -o out.pdf"
fi
