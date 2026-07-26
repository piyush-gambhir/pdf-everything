# workers/

Deployable runtime services that are intentionally kept outside the root pnpm
workspace and Turbo graph.

## Current worker

| Worker        | Operations                            | Port | Standard image                                     | Lambda image                                              |
| ------------- | ------------------------------------- | ---: | -------------------------------------------------- | --------------------------------------------------------- |
| `pdf-worker/` | `html-to-pdf`, `markdown-to-pdf` only | 8010 | `ghcr.io/piyush-gambhir/pdf-everything-pdf-worker` | `ghcr.io/piyush-gambhir/pdf-everything-pdf-worker-lambda` |

Both operations use one Chromium installation and one HTML-to-PDF rendering
core. Markdown is converted to templated HTML before entering that same core.
The supported operation list is deliberately explicit; unrelated PDF
operations should not be added merely because this worker exists.

## Independence

`pdf-worker` owns its `package.json`, lockfile, tests and deployment targets.
Its folder can be used directly as a Docker build context and deployed without
the console or NestJS backend.

It is not yet called by the backend or console. Until adapters are added, call
the worker's HTTP API directly.

## Image targets

- `deploy/docker/Dockerfile`: `linux/amd64` and `linux/arm64` image for Cloud
  Run, ECS, Kubernetes, Railway, Render, Fly.io and ordinary Docker hosts.
- `deploy/lambda/Dockerfile`: `linux/amd64` image with the AWS Lambda Web
  Adapter. Copy it to same-region ECR before creating a Lambda function.

Build locally from the repository root:

```bash
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

- `.github/workflows/workers-ci.yml` installs, builds and tests the package,
  renders both supported input types in its standard image, and verifies the
  Lambda image builds.
- `.github/workflows/publish-worker-images.yml` publishes the standard and
  Lambda images with OCI metadata and build attestations.

Every publishing run creates an immutable `sha-<commit>` tag. `main` also gets
`latest`; other branches get `edge`. A tag such as `workers-v1.0.0` publishes
the corresponding `1.0.0` image tag.

The earlier per-operation images remain as historical artifacts but are
superseded by `pdf-worker`.

## Runtime configuration

| Variable                    | Purpose                                                |
| --------------------------- | ------------------------------------------------------ |
| `PORT`                      | HTTP listen port; defaults to `8010`                   |
| `API_TOKEN`                 | Optional bearer token required on render routes        |
| `MAX_REQUEST_BYTES`         | Maximum JSON request size; defaults to 5 MiB           |
| `PUPPETEER_EXECUTABLE_PATH` | Chromium binary path; already configured by the images |

Keep secrets in the target platform's secret manager. Never bake them into an
image or commit them to this repository.
