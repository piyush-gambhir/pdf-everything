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
pnpm install
pnpm dev
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

See the [maintenance review](docs/maintenance-review.md) for cleanup findings,
remaining reliability work, and proposed feature priorities, and the
[roadmap](docs/ROADMAP.md) for the bigger planned work, each item with its
evidence, effort, and the owner question it needs answered.

## Verify

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

### TypeScript versions

All workspace `tsc` commands use TypeScript 7.0.2. The shared types package and
both PDF workers also compile with TypeScript 7.

The backend, console, and documentation site install TypeScript 7 as
`@typescript/native`, alongside Microsoft's TypeScript 6 compatibility package
aliased as `typescript`. This keeps the `tsc` command on version 7 while tools
that import the compiler API receive version 6.0.3. The compatibility package
provides `tsc6`, so the two packages do not compete for the `tsc` executable.

Nest build/watch and the Next.js built-in build checks still use TypeScript 6.
ESLint also needs its compiler API. The separate `pnpm typecheck` runs TypeScript
7 against every workspace, including generated Next.js route types.

Both checks matter: compiler versions can disagree on diagnostics or declaration
files. New syntax accepted by TypeScript 7 can also fail in API-based tools still
using version 6. Keep source and shared declarations compatible with both until
those tools support the newer API. Replacing the `typescript` alias with version
7 directly would remove the API that Nest and ESLint require.

See Microsoft's [side-by-side setup](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0).
