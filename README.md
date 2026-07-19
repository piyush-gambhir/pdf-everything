# pdf-everything

A unified PDF console + REST API. ~60 PDF features (merge, split, compress, convert, OCR, sign, etc.) in one place. The frontend consumes the same APIs that external clients use.

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Console**: Next.js + shadcn/ui
- **Backend**: NestJS (REST + OpenAPI/Swagger), includes the PDF core
- **PDF core**: pure TypeScript feature implementations (`backend/src/pdf-core`)

## Layout

```
console/            Next.js app (the PDF tool console)
backend/            NestJS API
├── src/pdf-core/   Pure PDF feature implementations
└── tests/          pdf-core test suite
types/              Zod schemas shared by console + backend

html-to-pdf/        standalone HTML -> PDF renderer (headless Chrome)
markdown-to-pdf/    standalone Markdown -> PDF renderer (headless Chrome)
```

> `web/` is reserved for the marketing/landing site (not yet built).
>
> **`html-to-pdf/` and `markdown-to-pdf/` are co-located as-is, not yet integrated.**
> They are deliberately excluded from the pnpm workspace and Turbo pipeline, and
> keep their own `package.json` / lockfile / deploy targets. Integrating them
> (likely folding their shared puppeteer renderer into `backend`) is a separate,
> deliberate step.

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
