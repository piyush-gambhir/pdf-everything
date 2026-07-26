# pdf-core-worker

Internal execution service for the 17 non-browser PDF operations exposed by the
NestJS gateway. It owns all `pdf-lib`, `pdfjs-dist`, and `sharp` processing.

The public API remains in `backend/`. This worker exposes an authenticated
internal protocol at `POST /v1/execute/:operation`; callers should normally use
the Nest API rather than call it directly.

```bash
pnpm --filter @pdf-everything/pdf-core-worker dev
```

Defaults to port `8020`. Set `WORKER_API_TOKEN` on both this service and
`PDF_CORE_WORKER_TOKEN` on the Nest gateway.
