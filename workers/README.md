# workers/

Deployable runtime services grouped by dependency and scaling profile.

## Current workers

| Worker             | Operations                               | Port | Standard image                                          |
| ------------------ | ---------------------------------------- | ---: | ------------------------------------------------------- |
| `pdf-core-worker/` | 17 PDF, image, text, and form operations | 8020 | `ghcr.io/piyush-gambhir/pdf-everything-pdf-core-worker` |
| `pdf-worker/`      | `html-to-pdf`, `markdown-to-pdf`         | 8010 | `ghcr.io/piyush-gambhir/pdf-everything-pdf-worker`      |

`pdf-core-worker` participates in the root pnpm workspace so it can share the
public Zod contracts with Nest and the console. Nest calls its private internal
protocol; the public endpoint paths and responses remain owned by Nest.

`pdf-worker` remains independently packaged because Chromium has a distinct
runtime and Lambda target. Markdown is converted to HTML before entering the
same renderer.

## Independence

Both workers own their execution implementations and tests. The core worker
uses the repository root as its Docker build context because it shares
`@pdf-everything/types`; the Chromium worker folder remains a standalone build
context.

## Image targets

- `deploy/docker/Dockerfile`: `linux/amd64` and `linux/arm64` image for Cloud
  Run, ECS, Kubernetes, Railway, Render, Fly.io and ordinary Docker hosts.
- `deploy/lambda/Dockerfile`: `linux/amd64` image with the AWS Lambda Web
  Adapter. Copy it to same-region ECR before creating a Lambda function.

Build locally from the repository root:

```bash
docker build \
  -f workers/pdf-core-worker/Dockerfile \
  -t pdf-core-worker:local \
  .

docker build \
  -f workers/pdf-worker/deploy/docker/Dockerfile \
  -t pdf-worker:local \
  workers/pdf-worker

docker build \
  -f workers/pdf-worker/deploy/lambda/Dockerfile \
  -t pdf-worker-lambda:local \
  workers/pdf-worker
```

## Releases

The root workflows are authoritative:

- `.github/workflows/workers-ci.yml` tests both workers, smoke-tests both
  standard images, renders both browser inputs, and verifies the Lambda image.
- `.github/workflows/publish-worker-images.yml` publishes the core, browser, and
  Lambda images with OCI metadata and build attestations.

Every publishing run creates an immutable `sha-<commit>` tag. `main` also gets
`latest`; other branches get `edge`. A tag such as `workers-v1.0.0` publishes
the corresponding `1.0.0` image tag.

The earlier per-operation images remain as historical artifacts but are
superseded by `pdf-worker`. For full deployment instructions, including Docker,
Cloud Run, Lambda, and generic container platforms, see
[`DEPLOYMENT.md`](DEPLOYMENT.md).

## Runtime configuration

| Variable                    | Purpose                                                |
| --------------------------- | ------------------------------------------------------ |
| `PORT`                      | HTTP listen port; defaults to `8010`                   |
| `API_TOKEN`                 | Optional bearer token required on render routes        |
| `MAX_REQUEST_BYTES`         | Maximum JSON request size; defaults to 5 MiB           |
| `PUPPETEER_EXECUTABLE_PATH` | Chromium binary path; already configured by the images |

Keep secrets in the target platform's secret manager. Never bake them into an
image or commit them to this repository.
