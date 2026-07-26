# pdf-everything

An open-source PDF console, REST API, and worker stack. Nineteen operations are
available through the visual console and the same versioned public endpoints.

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
pnpm dev

# Chromium worker has an independent lockfile
cd workers/pdf-worker
corepack pnpm install
corepack pnpm dev
```

| Surface         | Local URL                                     |
| --------------- | --------------------------------------------- |
| Console         | http://localhost:3000/pdf-everything/console/ |
| Nest API        | http://localhost:3001/api                     |
| Swagger UI      | http://localhost:3001/api/docs                |
| Web + docs      | http://localhost:3002/pdf-everything/         |
| PDF core worker | http://localhost:8020                         |
| Chromium worker | http://localhost:8010                         |

Read the [documentation](web/content/docs/index.mdx) or the complete
[deployment guide](web/content/docs/deployment.mdx).

## Verify

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```
