# markdown-to-pdf

Standalone Markdown to PDF microservice powered by headless Chromium. Ships three built-in templates (`github`, `academic`, `rca`) and exposes a small HTTP API for rendering.

## Quickstart

### Docker

```bash
docker build -f deploy/docker/Dockerfile -t markdown-to-pdf .
docker run --rm -p 8011:8011 markdown-to-pdf
```

### Local

Requires Node.js 22+ and a Chromium/Chrome binary (`PUPPETEER_EXECUTABLE_PATH` or one of `/usr/bin/chromium`, `/usr/bin/chromium-browser`, `/usr/bin/google-chrome-stable`).

```bash
pnpm install
pnpm run dev          # tsx watch on deploy/docker/index.ts
# or
pnpm run build && pnpm start
```

## HTTP API

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness probe |
| GET | `/ready` | Readiness probe (verifies Chromium is resolvable) |
| GET | `/v1/templates` | List built-in template names |
| POST | `/v1/render` | Render Markdown to PDF |

### `POST /v1/render`

Body:

```json
{
  "markdown": "# Hello\n\nWorld",
  "options": {
    "template": "github",
    "format": "A4",
    "printBackground": true,
    "margin": { "top": "20mm", "right": "20mm", "bottom": "20mm", "left": "20mm" },
    "title": "My Document",
    "navigationTimeoutMs": 30000
  }
}
```

Returns `application/pdf` on success.

```bash
curl -X POST http://localhost:8011/v1/render \
  -H 'content-type: application/json' \
  -d '{"markdown":"# Hello\n\nWorld"}' \
  -o out.pdf
```

If `API_TOKEN` is set, requests must include `Authorization: Bearer $API_TOKEN`. Without a token the render endpoint is open — only expose it on private networks.

## Deploy to AWS Lambda

The same HTTP server runs on Lambda as a container image, fronted by the
[AWS Lambda Web Adapter](https://github.com/awslabs/aws-lambda-web-adapter) — no
code changes, exposed via a Lambda Function URL.

```bash
cp .env.deploy.example .env.deploy.lambda   # fill in the AWS Lambda block
bash scripts/deploy-lambda.sh               # build → ECR → create/update function + URL
```

Notes:
- Headless Chromium needs headroom: use **≥1536 MB memory** (default 2048) and a
  **≥30 s timeout** (default 60). Cold starts run ~3–6 s.
- Build architecture must match the function (`ARCHITECTURE=arm64` by default).
- `FUNCTION_URL_AUTH=NONE` makes the URL public; prefer `AWS_IAM` (default) and
  sign requests, or set `API_TOKEN` to require a bearer token on `/v1/render`.

## Templates

- `github` (default) — GitHub-flavoured document styling
- `academic` — paper-style layout with serif typography
- `rca` — incident root-cause-analysis report layout

## Configuration

| Env | Default | Description |
|---|---|---|
| `PORT` | `8011` | HTTP listen port |
| `API_TOKEN` | _(unset)_ | Optional bearer token required on `/v1/render` |
| `PUPPETEER_EXECUTABLE_PATH` | _(auto)_ | Path to Chromium/Chrome binary |

## Library use

The renderer can also be used directly:

```ts
import { renderMarkdownToPdf } from './core/pdf.js';

const pdf = await renderMarkdownToPdf('# Hi', { template: 'academic' });
```

## License

MIT
