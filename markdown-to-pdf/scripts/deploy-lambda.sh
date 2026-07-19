#!/usr/bin/env bash
# Deploy markdown-to-pdf to AWS Lambda as a container image (Function URL).
#
# Builds deploy/lambda/Dockerfile, pushes to ECR, then creates or updates the
# Lambda function and its Function URL. Idempotent — safe to re-run.
#
#   bash scripts/deploy-lambda.sh
#
# Reads config from .env.deploy.lambda (gitignored). See .env.deploy.example.
# Requires: docker (with buildx), aws CLI v2, and AWS credentials in the env.

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
: "${ECR_REPOSITORY:?set ECR_REPOSITORY in ${ENV_FILE} (e.g. markdown-to-pdf)}"
: "${FUNCTION_NAME:?set FUNCTION_NAME in ${ENV_FILE}}"
: "${LAMBDA_EXECUTION_ROLE_ARN:?set LAMBDA_EXECUTION_ROLE_ARN in ${ENV_FILE}}"

# --- optional (sane defaults) ---
ARCHITECTURE="${ARCHITECTURE:-arm64}"          # arm64 | x86_64
MEMORY_MB="${MEMORY_MB:-2048}"                 # Chromium wants headroom
TIMEOUT_S="${TIMEOUT_S:-60}"
FUNCTION_URL_AUTH="${FUNCTION_URL_AUTH:-AWS_IAM}"  # AWS_IAM | NONE (NONE = public!)
API_TOKEN="${API_TOKEN:-}"                     # bearer token enforced on /v1/render

case "$ARCHITECTURE" in
  arm64)  DOCKER_PLATFORM="linux/arm64" ;;
  x86_64) DOCKER_PLATFORM="linux/amd64" ;;
  *) echo "error: ARCHITECTURE must be arm64 or x86_64 (got '$ARCHITECTURE')" >&2; exit 1 ;;
esac

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_URI="${ECR_REGISTRY}/${ECR_REPOSITORY}"
GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo manual)"
TAG="${GIT_SHA}-$(date -u +%Y%m%d%H%M%S)"

echo "==> Account ${ACCOUNT_ID} | region ${AWS_REGION} | arch ${ARCHITECTURE}"

# 1. Ensure the ECR repository exists.
if ! aws ecr describe-repositories --repository-names "$ECR_REPOSITORY" --region "$AWS_REGION" >/dev/null 2>&1; then
  echo "==> Creating ECR repository ${ECR_REPOSITORY}"
  aws ecr create-repository --repository-name "$ECR_REPOSITORY" --region "$AWS_REGION" >/dev/null
fi

# 2. Log in to ECR.
echo "==> Logging in to ECR"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

# 3. Build + push the image. --provenance=false avoids the OCI image index
#    that Lambda's image loader rejects.
echo "==> Building and pushing ${ECR_URI}:${TAG}"
docker buildx build \
  --platform "$DOCKER_PLATFORM" \
  --provenance=false \
  --file deploy/lambda/Dockerfile \
  --tag "${ECR_URI}:${TAG}" \
  --tag "${ECR_URI}:latest" \
  --push \
  .

IMAGE_URI="${ECR_URI}:${TAG}"

# 4. Create or update the function.
ENV_VARS="Variables={}"
if [[ -n "$API_TOKEN" ]]; then
  ENV_VARS="Variables={API_TOKEN=${API_TOKEN}}"
fi

if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
  echo "==> Updating function code: ${FUNCTION_NAME}"
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --image-uri "$IMAGE_URI" \
    --region "$AWS_REGION" >/dev/null
  aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$AWS_REGION"

  echo "==> Updating function configuration"
  aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --memory-size "$MEMORY_MB" \
    --timeout "$TIMEOUT_S" \
    --environment "$ENV_VARS" \
    --region "$AWS_REGION" >/dev/null
  aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$AWS_REGION"
else
  echo "==> Creating function: ${FUNCTION_NAME}"
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --package-type Image \
    --code "ImageUri=${IMAGE_URI}" \
    --role "$LAMBDA_EXECUTION_ROLE_ARN" \
    --architectures "$ARCHITECTURE" \
    --memory-size "$MEMORY_MB" \
    --timeout "$TIMEOUT_S" \
    --environment "$ENV_VARS" \
    --region "$AWS_REGION" >/dev/null
  aws lambda wait function-active-v2 --function-name "$FUNCTION_NAME" --region "$AWS_REGION"
fi

# 5. Ensure a Function URL exists.
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
echo "    function URL: ${FUNCTION_URL}"
echo
if [[ "$FUNCTION_URL_AUTH" == "AWS_IAM" ]]; then
  echo "    Auth is AWS_IAM — sign requests with SigV4 (e.g. 'awscurl')."
else
  echo "    Smoke test:"
  echo "      curl -X POST \"${FUNCTION_URL}v1/render\" \\"
  echo "        -H 'content-type: application/json' \\"
  echo "        -d '{\"markdown\":\"# Hello\",\"options\":{\"template\":\"rca\"}}' -o out.pdf"
fi
