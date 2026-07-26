# Deploying the PDF workers

The Nest gateway uses `pdf-core-worker` for the 17 public file-based
operations. Deploy it from
`ghcr.io/piyush-gambhir/pdf-everything-pdf-core-worker`, keep port `8020`
private, and configure matching `WORKER_API_TOKEN` and
`PDF_CORE_WORKER_TOKEN` values on the worker and Nest respectively.

The remainder of this guide covers the separately packaged Chromium worker.

`pdf-worker` is one independently deployable HTTP service with two rendering
operations:

```text
POST /v1/render/html ──────────────────────┐
                                           ├─> shared HTML renderer ─> Chromium ─> PDF
POST /v1/render/markdown ─> template HTML ─┘
```

It replaces the former `html-to-pdf` and `markdown-to-pdf` services. Consumers
now run one image and select the operation through the request path.

## What changed

| Before                                                 | Now                                                |
| ------------------------------------------------------ | -------------------------------------------------- |
| `piyushgambhir/html-to-pdf`                            | `ghcr.io/piyush-gambhir/pdf-everything-pdf-worker` |
| `piyushgambhir/markdown-to-pdf`                        | The same unified image                             |
| HTML `POST /v1/render` on port `8010`                  | `POST /v1/render/html` on port `8010`              |
| Markdown `POST /v1/render` on port `8011`              | `POST /v1/render/markdown` on port `8010`          |
| Separate Chromium installations and release lifecycles | One Chromium installation and release lifecycle    |

The legacy images are not updated by this repository. Existing deployments can
continue using them until they migrate, but new deployments should use
`pdf-worker`.

The unified image does not force both operations to share scaling. If HTML and
Markdown have different traffic profiles, deploy the same image as two services
and expose only the appropriate route through each gateway or reverse proxy.

## Choose an image

| Target                                                      | Image                                                     | Architectures                |
| ----------------------------------------------------------- | --------------------------------------------------------- | ---------------------------- |
| Docker, Cloud Run, ECS, Kubernetes, Railway, Render, Fly.io | `ghcr.io/piyush-gambhir/pdf-everything-pdf-worker`        | `linux/amd64`, `linux/arm64` |
| AWS Lambda container function                               | `ghcr.io/piyush-gambhir/pdf-everything-pdf-worker-lambda` | `linux/amd64`                |

The Lambda image contains the same HTTP server plus the AWS Lambda Web Adapter.
Do not deploy the Lambda image to an ordinary container host.

Both images are public. Production deployments should use an immutable
`sha-<full-commit>` tag or image digest rather than `latest`.

Published tags:

- `sha-<full-commit>`: immutable image for every publishing run.
- `latest`: newest build from `main`.
- `edge`: build from an `agent/**` branch.
- `<version>`: release created from a Git tag such as `workers-v1.0.0`.

## Runtime contract

The standard container listens on `PORT` (`8010` by default) and writes the PDF
to the HTTP response. It does not need a database or persistent volume.

| Variable                    | Default       | Purpose                                |
| --------------------------- | ------------- | -------------------------------------- |
| `PORT`                      | `8010`        | HTTP listen port                       |
| `API_TOKEN`                 | unset         | Bearer token required on render routes |
| `MAX_REQUEST_BYTES`         | `5242880`     | Maximum JSON request-body size         |
| `PUPPETEER_EXECUTABLE_PATH` | image-defined | Chromium binary path                   |

Routes:

| Method | Path                  | Authentication               | Purpose                             |
| ------ | --------------------- | ---------------------------- | ----------------------------------- |
| `GET`  | `/health`             | None                         | Liveness and supported operations   |
| `GET`  | `/ready`              | None                         | Confirms that Chromium is available |
| `GET`  | `/v1/templates`       | None                         | Lists Markdown templates            |
| `POST` | `/v1/render/html`     | `API_TOKEN`, when configured | HTML to PDF                         |
| `POST` | `/v1/render/markdown` | `API_TOKEN`, when configured | Markdown to PDF                     |

`API_TOKEN` is application-level authentication. A platform can instead keep
the entire service private with IAM, a private network, or an authenticated
gateway. Do not expose an unauthenticated render route to the public internet.

Each request starts a Chromium browser and closes it after rendering. Begin with
low per-instance concurrency—`1` or `2` is a conservative default—and raise it
only after measuring memory, CPU, latency, and document complexity.

### Production hardening

Treat every render as untrusted browser input:

- HTML and Markdown can reference remote images, fonts, stylesheets, and other
  URLs. The worker currently allows Chromium to fetch those resources.
- Keep the worker away from sensitive internal networks and cloud metadata
  endpoints, or enforce an outbound proxy/egress policy.
- Put rate limits, request timeouts, and request-size limits at the gateway as
  well as using `MAX_REQUEST_BYTES`.
- The standard image runs as a non-root user, but Chromium uses
  `--no-sandbox`; retain container/platform isolation.
- Do not mount credentials, host paths, or a Docker socket into the container.
- Log request metadata, latency, status, and output size at the gateway. Do not
  log raw documents unless the data policy explicitly permits it.

The current worker does not implement a URL allowlist, per-tenant quotas, a
browser pool, a queue, or durable job storage. Add those controls at the
platform boundary before accepting untrusted multi-tenant traffic.

## Run with Docker

For a local evaluation:

```bash
docker pull ghcr.io/piyush-gambhir/pdf-everything-pdf-worker:latest

docker run --rm --name pdf-worker \
  --publish 127.0.0.1:8010:8010 \
  --env API_TOKEN=replace-with-a-long-random-value \
  ghcr.io/piyush-gambhir/pdf-everything-pdf-worker:latest
```

In production, replace `latest` with a `sha-...` tag or digest and provide the
token through the host's secret manager.

Verify both operations:

```bash
export PDF_WORKER_URL=http://127.0.0.1:8010
export PDF_WORKER_TOKEN=replace-with-a-long-random-value

curl --fail "${PDF_WORKER_URL}/ready"

curl --fail "${PDF_WORKER_URL}/v1/render/html" \
  --header "Authorization: Bearer ${PDF_WORKER_TOKEN}" \
  --header 'content-type: application/json' \
  --data '{"html":"<!doctype html><h1>Hello from HTML</h1>"}' \
  --output html.pdf

curl --fail "${PDF_WORKER_URL}/v1/render/markdown" \
  --header "Authorization: Bearer ${PDF_WORKER_TOKEN}" \
  --header 'content-type: application/json' \
  --data '{"markdown":"# Hello from Markdown","options":{"template":"github"}}' \
  --output markdown.pdf
```

## Deploy to Cloud Run

The included script can either copy the published standard image into Artifact
Registry or build the current source with Cloud Build.

One-time setup:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com

gcloud artifacts repositories create pdf-everything \
  --repository-format=docker \
  --location=asia-south1

gcloud auth configure-docker asia-south1-docker.pkg.dev
```

Deploy the published image:

```bash
cd workers/pdf-worker

GCP_PROJECT_ID=YOUR_PROJECT_ID \
GCP_REGION=asia-south1 \
ALLOW_UNAUTHENTICATED=false \
bash deploy/cloudrun/deploy.sh --from-ghcr
```

Or build the checked-out source:

```bash
GCP_PROJECT_ID=YOUR_PROJECT_ID \
GCP_REGION=asia-south1 \
ALLOW_UNAUTHENTICATED=false \
bash deploy/cloudrun/deploy.sh
```

The safe default is a private Cloud Run service protected by Cloud Run IAM. To
make the service publicly reachable while protecting render routes with the
worker token, first store a token in Secret Manager and then deploy:

```bash
printf '%s' 'replace-with-a-long-random-value' \
  | gcloud secrets create pdf-worker-token --data-file=-

PROJECT_NUMBER="$(
  gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)'
)"

gcloud secrets add-iam-policy-binding pdf-worker-token \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role=roles/secretmanager.secretAccessor

GCP_PROJECT_ID=YOUR_PROJECT_ID \
GCP_REGION=asia-south1 \
ALLOW_UNAUTHENTICATED=true \
API_TOKEN_SECRET=pdf-worker-token \
API_TOKEN_SECRET_VERSION=1 \
bash deploy/cloudrun/deploy.sh --from-ghcr
```

Do not configure both Cloud Run IAM and `API_TOKEN` on the same direct endpoint:
both use the `Authorization` header. Put an authenticated gateway in front if
both layers are required.

The IAM command above assumes Cloud Run's default Compute Engine service
account. Grant the accessor role to the service's configured identity instead
if it uses a dedicated service account.

The script defaults to 2 GiB memory, one CPU, 60 seconds, concurrency `2`, and
zero minimum instances. Increase the timeout for documents that load slow
remote assets. Set a minimum instance if cold-start latency matters.

## Deploy to AWS Lambda

Lambda cannot pull the published image directly from GHCR. The Lambda image
must be copied into a private ECR repository in the same AWS Region as the
function. The published Lambda image is `linux/amd64`, so the Lambda function
must use `x86_64`.

The simplest supported path builds the image from the checked-out source,
pushes it to ECR, and creates or updates the function:

```bash
cd workers/pdf-worker
cp .env.deploy.example .env.deploy.lambda
```

Set at least:

```dotenv
AWS_REGION=ap-south-1
ECR_REPOSITORY=pdf-everything-pdf-worker
FUNCTION_NAME=pdf-everything-pdf-worker
LAMBDA_EXECUTION_ROLE_ARN=arn:aws:iam::<account-id>:role/<lambda-exec-role>

ARCHITECTURE=arm64
MEMORY_MB=2048
TIMEOUT_S=60
FUNCTION_URL_AUTH=AWS_IAM
```

Then deploy:

```bash
bash scripts/deploy-lambda.sh
```

That source-build path supports either `arm64` or `x86_64`. To reuse the
published GHCR Lambda image instead, copy its `linux/amd64` manifest to ECR,
then configure an `x86_64` Lambda function with that ECR URI:

```bash
export AWS_REGION=ap-south-1
export ECR_REPOSITORY=pdf-everything-pdf-worker
export SOURCE_IMAGE=ghcr.io/piyush-gambhir/pdf-everything-pdf-worker-lambda:latest
export AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
export ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
export ECR_IMAGE="${ECR_REGISTRY}/${ECR_REPOSITORY}:latest"

aws ecr describe-repositories \
  --region "${AWS_REGION}" \
  --repository-names "${ECR_REPOSITORY}" >/dev/null 2>&1 \
  || aws ecr create-repository \
    --region "${AWS_REGION}" \
    --repository-name "${ECR_REPOSITORY}"

aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

docker pull --platform linux/amd64 "${SOURCE_IMAGE}"
docker tag "${SOURCE_IMAGE}" "${ECR_IMAGE}"
docker push "${ECR_IMAGE}"
```

Use at least 1536 MiB memory for Chromium; the repository defaults to 2048 MiB
and a 60-second timeout. Prefer `AWS_IAM` Function URL authentication. If
`FUNCTION_URL_AUTH=NONE`, set `API_TOKEN` or protect the function with an
authenticated gateway.

## Deploy to another container platform

For ECS/Fargate, Kubernetes, Railway, Render, Fly.io, or a VM:

1. Deploy the standard image, not the Lambda image.
2. Expose the container's configured `PORT`.
3. Allocate about 2 GiB memory initially.
4. Set `API_TOKEN` from a secret manager, or keep the service private.
5. Use `/health` for liveness and `/ready` for readiness.
6. Start with concurrency `1` or `2` per replica.
7. Pin an immutable tag or digest and roll forward deliberately.

Example Kubernetes probes:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8010
readinessProbe:
  httpGet:
    path: /ready
    port: 8010
```

## How images are released

The repository owns release automation:

1. `.github/workflows/workers-ci.yml` installs, builds, formats, and tests the
   worker.
2. CI builds the standard image and renders one HTML and one Markdown document
   inside it.
3. CI also verifies that the Lambda image builds.
4. `.github/workflows/publish-worker-images.yml` publishes the standard and
   Lambda images to GHCR only after verification succeeds.
5. GitHub records OCI metadata and build attestations for both outputs.

Changes under `workers/**` on `main` publish new `latest` and immutable
`sha-...` images. To publish a human version:

```bash
git tag workers-v1.0.0
git push origin workers-v1.0.0
```

Consumers then deploy:

```text
ghcr.io/piyush-gambhir/pdf-everything-pdf-worker:1.0.0
ghcr.io/piyush-gambhir/pdf-everything-pdf-worker-lambda:1.0.0
```

## Gateway integration

Nest exposes the browser operations through
`/api/v1/render/html` and `/api/v1/render/markdown`. Configure
`PDF_RENDER_WORKER_URL` and `PDF_RENDER_WORKER_TOKEN` on Nest; the token must
match `API_TOKEN` on this worker. Keep the worker origin private. The static
console calls only Nest and never receives worker credentials.

## Platform references

- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Deploying container images to Cloud Run](https://docs.cloud.google.com/run/docs/deploying)
- [Cloud Run concurrency](https://docs.cloud.google.com/run/docs/about-concurrency)
- [Cloud Run secrets](https://docs.cloud.google.com/run/docs/configuring/services/secrets)
- [AWS Lambda container images](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)
- [Copying multi-platform images between registries](https://docs.docker.com/build/ci/github-actions/copy-image-registries/)
