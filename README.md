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
workers/              Standalone rendering workers (one folder per worker)
├── html-to-pdf/      HTML -> PDF (headless Chrome)
└── markdown-to-pdf/  Markdown -> PDF (headless Chrome)
```

> **Rendering workers are independently deployable services.** They keep their
> own dependencies, tests, standard Docker image and Lambda image. Root-level
> GitHub workflows verify them and publish public images to GHCR. They are not
> yet called by the NestJS API or console. See [`workers/README.md`](workers/README.md).

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
