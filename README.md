# pdf-everything

A unified PDF console + REST API. ~60 PDF features (merge, split, compress, convert, OCR, sign, etc.) in one place. The frontend consumes the same APIs that external clients use.

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Console**: Next.js + shadcn/ui
- **Backend**: NestJS (REST + OpenAPI/Swagger), includes the PDF core
- **PDF core**: pure TypeScript feature implementations (`backend/src/pdf-core`)

## Layout

```
console/              Next.js app (the PDF tool console)
web/                  Marketing site + Fumadocs documentation
backend/              NestJS API
├── src/pdf-core/     Pure PDF feature implementations
└── tests/            pdf-core test suite
types/                Zod schemas shared by console + backend
workers/
└── pdf-worker/       HTML/Markdown -> PDF (shared headless Chrome runtime)
```

> **`pdf-worker` is independently deployable.** It owns its dependencies,
> tests, standard Docker image and Lambda image. It currently supports only
> `html-to-pdf` and `markdown-to-pdf` through one shared Chromium renderer.
> See [`workers/README.md`](workers/README.md).

## Develop

```bash
pnpm install
pnpm dev          # backend on :3001, console on :3000
```

Swagger UI: http://localhost:3001/api/docs

## Verify

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```
