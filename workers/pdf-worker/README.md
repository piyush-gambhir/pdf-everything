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
sh scripts/integration-in-docker.sh <image>  # the same, inside a built image (CI)
```

Release CI runs the integration tests inside the production image, then renders
both operations with it.

Published images:

```bash
docker pull ghcr.io/piyush-gambhir/pdf-everything-pdf-worker:latest
docker pull ghcr.io/piyush-gambhir/pdf-everything-pdf-worker-lambda:latest
```

## HTTP API

| Method | Path                  | Description                               |
| ------ | --------------------- | ----------------------------------------- |
| GET    | `/health`             | Liveness and supported-operation list     |
| GET    | `/ready`              | Readiness; answers once Chromium is up    |
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

Options are page settings only: `format` (`A4`, `Letter`, `Legal`),
`printBackground`, `preferCssPageSize`, `margin` (`top`, `right`, `bottom`,
`left`, each a length in `px`, `in`, `cm` or `mm`), and `navigationTimeoutMs`
(1000 to 120000). Any other option is refused with `400`. Set
`preferCssPageSize` to `true` when the HTML declares custom geometry with
CSS `@page` (for example, a 16:9 presentation).

The document renders sealed: JavaScript is off and nothing is fetched over the
network. Only `data:` URIs load, so embed images, stylesheets and fonts. A
successful response carries the page count in `X-PDF-Page-Count`. A render
that passes a limit answers `422` (`page_limit_exceeded`, `output_too_large`)
or `504` (`render_timeout`).

The images install Manrope (variable, 200 to 800), FreeFont, Noto Sans and
Serif CJK and Noto Color Emoji as system fonts. Each installed Manrope file is
one Unicode subset, and Chromium does not stitch system subsets together, so a
document that needs Manrope beyond Latin should embed its subsets with
`unicode-range`.

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

These are two package targets for one worker, not separate HTML and Markdown
services. The standard image serves both operation-specific routes. See the
complete [deployment and migration guide](../DEPLOYMENT.md) for Docker, Cloud
Run, Lambda, Kubernetes-style platforms, image tags, authentication, scaling,
and the old-to-new endpoint map.

For Lambda:

```bash
cp .env.deploy.example .env.deploy.lambda
bash scripts/deploy-lambda.sh
```

Use at least 1536 MB memory for Chromium; the deployment script defaults to
2048 MB and a 60-second timeout. The worker keeps one Chromium running between
requests, and the Lambda image reports ready only once it is up (`/ready`).
AWS Lambda container images must be copied to ECR in the same region as the
function. The published Lambda image is multi-arch (`linux/amd64`,
`linux/arm64`); Lambda needs one platform's manifest, so deploy its
per-platform digest (see the deployment guide).

## Configuration

| Variable                    | Default   | Description                             |
| --------------------------- | --------- | --------------------------------------- |
| `PORT`                      | `8010`    | HTTP listen port                        |
| `API_TOKEN`                 | unset     | Optional bearer token for render routes |
| `MAX_REQUEST_BYTES`         | `5242880` | Maximum request-body size               |
| `MAX_PDF_PAGES`             | `200`     | Most pages a PDF may have               |
| `MAX_PDF_BYTES`             | `26214400` | Largest PDF (Lambda image: `4194304`)  |
| `RENDER_DEADLINE_MS`        | `50000`   | Whole-render deadline                   |
| `PUPPETEER_EXECUTABLE_PATH` | auto      | Chromium/Chrome binary                  |

## Library use

```ts
import { renderHtmlToPdf, shutdownBrowser } from './core/html.js';
import { renderMarkdownToPdf } from './core/markdown.js';

// Page settings, then operator settings (never taken from a request).
await renderHtmlToPdf(html, { format: 'Letter' }, { executablePath, limits: { maxPages: 20 } });

// Renders share one Chromium, started on first use; a script closes it when done.
await shutdownBrowser();
```

The Markdown CLI remains available:

```bash
corepack pnpm render input.md --template academic --out output.pdf
```

## License

MIT
