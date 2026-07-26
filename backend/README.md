# NestJS API gateway

The backend owns the public `/api/v1/**` contract used by the static Next.js
console and external clients. It handles uploads, stored file references,
validation, output persistence, Swagger, and problem responses.

PDF execution is delegated to `workers/pdf-core-worker`; this package does not
depend on `pdf-lib`, `pdfjs-dist`, `sharp`, or Chromium.

HTML and Markdown routes are delegated to `workers/pdf-worker`.

```bash
PDF_CORE_WORKER_URL=http://127.0.0.1:8020 \
pnpm --filter @pdf-everything/backend dev
```

In production, keep the worker on a private network and configure matching
`PDF_CORE_WORKER_TOKEN` and `WORKER_API_TOKEN` secrets.

Build the gateway image from the repository root:

```bash
docker build -f backend/Dockerfile -t pdf-everything-api .
```
