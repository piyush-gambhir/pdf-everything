# pdf-everything

A unified PDF web app + REST API. ~60 PDF features (merge, split, compress, convert, OCR, sign, etc.) in one place. The frontend consumes the same APIs that external clients use.

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend**: Next.js 15 + shadcn/ui (b0 preset)
- **Backend**: NestJS (REST + OpenAPI/Swagger)
- **PDF core**: pure TypeScript functions, framework-agnostic (`packages/pdf-core`)

## Layout

```
apps/
├── web/        Next.js frontend
└── api/        NestJS backend
packages/
├── pdf-core/   Pure PDF feature implementations
├── types/      Zod schemas shared FE/BE
├── ui/         Shared shadcn components (ToolLayout, FileDropzone, ...)
├── tsconfig/   Shared tsconfig presets
└── eslint-config/
```

## Develop

```bash
pnpm install
pnpm dev          # api on :3001, web on :3000
```

Swagger UI: http://localhost:3001/api/docs

## Phase 1 features

Organize: merge · split · rotate · remove pages · extract pages · reorder

See [plan](../../../.claude/plans/what-features-we-have-optimized-tower.md) for full roadmap.
