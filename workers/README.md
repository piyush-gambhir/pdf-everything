# workers/

Standalone rendering workers. Each subfolder is a self-contained service with
its own dependencies, tests and deployment images.

| Worker             | Does                  | Port | Standard image                                          | Lambda image                                                   |
| ------------------ | --------------------- | ---: | ------------------------------------------------------- | -------------------------------------------------------------- |
| `html-to-pdf/`     | HTML → PDF            | 8010 | `ghcr.io/piyush-gambhir/pdf-everything-html-to-pdf`     | `ghcr.io/piyush-gambhir/pdf-everything-html-to-pdf-lambda`     |
| `markdown-to-pdf/` | Markdown → HTML → PDF | 8011 | `ghcr.io/piyush-gambhir/pdf-everything-markdown-to-pdf` | `ghcr.io/piyush-gambhir/pdf-everything-markdown-to-pdf-lambda` |

## Why a single `workers/` folder

One folder per worker keeps each image independently buildable while allowing
CI, releases and security policy to be managed in one repository.

## Independence

The workers deliberately sit outside the root pnpm workspace and Turbo graph.
Each worker owns its `package.json`, lockfile and TypeScript build, so its folder
can be used directly as a Docker build context.

They are independently deployable but are not yet integrated into the NestJS API
or console. Call their `/v1/render` endpoints directly until the backend gains
render-service adapters.

## Image targets

Each worker publishes two image variants:

- `deploy/docker/Dockerfile`: multi-platform `linux/amd64` + `linux/arm64`
  image for Cloud Run, ECS, Kubernetes, Railway, Render, Fly.io and Docker hosts.
- `deploy/lambda/Dockerfile`: single-platform `linux/amd64` image containing the
  AWS Lambda Web Adapter. Copy this image to same-region ECR before creating a
  Lambda function.

Build locally from the repository root:

```bash
docker build \
  -f workers/html-to-pdf/deploy/docker/Dockerfile \
  -t html-to-pdf:local \
  workers/html-to-pdf

docker build \
  -f workers/markdown-to-pdf/deploy/lambda/Dockerfile \
  -t markdown-to-pdf-lambda:local \
  workers/markdown-to-pdf
```

## Releases

The root workflows are authoritative:

- `.github/workflows/workers-ci.yml` installs, builds, tests and smoke-tests
  both standard images, then verifies both Lambda images build.
- `.github/workflows/publish-worker-images.yml` publishes all four GHCR images
  with OCI metadata and build attestations.

Every publishing run creates an immutable `sha-<commit>` tag. `main` also gets
`latest`; other branches get `edge`. A tag such as `workers-v1.0.0` publishes
the corresponding `1.0.0` image tag.

## Runtime configuration

| Variable                    | Purpose                                                                      |
| --------------------------- | ---------------------------------------------------------------------------- |
| `PORT`                      | HTTP listen port; injected by Cloud Run and set by the images                |
| `API_TOKEN`                 | Optional bearer token for `POST /v1/render`; required for public deployments |
| `PUPPETEER_EXECUTABLE_PATH` | Chromium binary path; already set by the images                              |

Keep secrets in the target platform's secret manager. Never bake them into an
image or commit them to this repository.

## Future integration

Both services share the same Puppeteer rendering path. A shared render core is
the natural next de-duplication step, while keeping Chromium outside the main
NestJS process.
