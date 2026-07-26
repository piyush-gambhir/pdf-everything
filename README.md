# pdf-everything

A unified PDF console + REST API. ~60 PDF features (merge, split, compress, convert, OCR, sign, etc.) in one place. The frontend consumes the same APIs that external clients use.

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Console**: Next.js + shadcn/ui
- **Backend**: thin NestJS REST gateway + OpenAPI/Swagger
- **PDF core worker**: 17 `pdf-lib`/`pdfjs-dist`/`sharp` operations
- **Browser worker**: HTML/Markdown rendering through Chromium

## Layout

```
console/              Next.js app (the PDF tool console)
web/                  Marketing site + Fumadocs documentation
backend/              NestJS API
types/                Zod schemas shared by console + backend
workers/
├── pdf-core-worker/  Existing PDF/image/text/form operations
└── pdf-worker/       HTML/Markdown -> PDF (shared headless Chrome runtime)
```

> **PDF execution lives in workers.** Nest owns the stable public API, file
> storage, validation, and orchestration; the static Next.js console calls that
> same API. See [`workers/README.md`](workers/README.md).

## Develop

```bash
pnpm install
pnpm dev          # backend :3001, console :3000, core worker :8020
```

Swagger UI: http://localhost:3001/api/docs

## Verify

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```
