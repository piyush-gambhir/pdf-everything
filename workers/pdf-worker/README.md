# pdf-worker

One independently deployable Chromium service for exactly two operations:

- `html-to-pdf`
- `markdown-to-pdf`

Markdown is converted to styled HTML and then passed to the same HTML renderer,
so both operations share the Chromium dependency, page configuration, tests and
deployment lifecycle.

## Quick start

```bash
corepack pnpm install
corepack pnpm dev
```

Or run the standard container:

```bash
docker build -f deploy/docker/Dockerfile -t pdf-worker .
docker run --rm -p 8010:8010 pdf-worker
```

Verification is split intentionally:

```bash
corepack pnpm test              # deterministic unit and HTTP tests
corepack pnpm test:integration  # real locally installed Chromium
```

Release CI also renders both operations inside the production container.

Published images:

```bash
docker pull ghcr.io/piyush-gambhir/pdf-everything-pdf-worker:latest
docker pull ghcr.io/piyush-gambhir/pdf-everything-pdf-worker-lambda:latest
```

## HTTP API

| Method | Path                  | Description                               |
| ------ | --------------------- | ----------------------------------------- |
| GET    | `/health`             | Liveness and supported-operation list     |
| GET    | `/ready`              | Readiness; verifies Chromium is available |
| GET    | `/v1/templates`       | Markdown template names                   |
| POST   | `/v1/render/html`     | Render HTML to PDF                        |
| POST   | `/v1/render/markdown` | Render Markdown to PDF                    |

### HTML

```bash
curl --fail http://localhost:8010/v1/render/html \
  -H 'content-type: application/json' \
  -d '{"html":"<!doctype html><h1>Hello</h1>"}' \
  -o out.pdf
```

Options support `format`, `printBackground`, `margin`,
`navigationTimeoutMs`, and `executablePath` for direct library use.

### Markdown

```bash
curl --fail http://localhost:8010/v1/render/markdown \
  -H 'content-type: application/json' \
  -d '{"markdown":"# Hello","options":{"template":"github"}}' \
  -o out.pdf
```

Markdown options add `template` (`github`, `academic`, or `rca`) and `title`.

Requests must use the operation-specific endpoint. Supplying both fields or
using the wrong field returns `400`.

If `API_TOKEN` is set, every render route requires
`Authorization: Bearer <token>`. Health, readiness and template discovery stay
unauthenticated. Public deployments should set a token or use platform-level
authentication.

## Internal architecture

```text
HTML request ───────────────────────┐
                                    ├─> shared HTML renderer ─> Chromium ─> PDF
Markdown ─> marked ─> template HTML ┘
```

- `core/html.ts`: Chromium discovery and the shared HTML-to-PDF renderer.
- `core/markdown.ts`: Markdown conversion and template selection.
- `core/templates/`: Markdown presentation templates.
- `deploy/docker/http.ts`: HTTP validation, authentication and routing.

## Deployments

The same server is packaged in two forms:

- `deploy/docker/Dockerfile` for container platforms.
- `deploy/lambda/Dockerfile` with the AWS Lambda Web Adapter.

For Lambda:

```bash
cp .env.deploy.example .env.deploy.lambda
bash scripts/deploy-lambda.sh
```

Use at least 1536 MB memory for Chromium; the deployment script defaults to
2048 MB and a 60-second timeout. AWS Lambda container images must be copied to
ECR in the same region as the function.

## Configuration

| Variable                    | Default   | Description                             |
| --------------------------- | --------- | --------------------------------------- |
| `PORT`                      | `8010`    | HTTP listen port                        |
| `API_TOKEN`                 | unset     | Optional bearer token for render routes |
| `MAX_REQUEST_BYTES`         | `5242880` | Maximum request-body size               |
| `PUPPETEER_EXECUTABLE_PATH` | auto      | Chromium/Chrome binary                  |

## Library use

```ts
import { renderHtmlToPdf } from './core/html.js';
import { renderMarkdownToPdf } from './core/markdown.js';
```

The Markdown CLI remains available:

```bash
corepack pnpm render input.md --template academic --out output.pdf
```

## License

MIT
