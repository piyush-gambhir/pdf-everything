FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY types/package.json types/package.json
COPY backend/package.json backend/package.json
RUN pnpm install --frozen-lockfile

COPY types types
COPY backend backend
RUN pnpm --filter @pdf-everything/types build \
 && pnpm --filter @pdf-everything/backend build \
 && pnpm --filter @pdf-everything/backend deploy --prod --legacy /prod \
 && chmod -R a+rX /prod

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    API_PORT=3001 \
    STORAGE_DIR=/app/storage
LABEL org.opencontainers.image.source="https://github.com/piyush-gambhir/pdf-everything" \
      org.opencontainers.image.description="Public PDF Everything NestJS API gateway" \
      org.opencontainers.image.licenses="MIT"

COPY --from=build /prod ./
COPY --from=build /app/backend/dist ./dist
RUN mkdir -p /app/storage && chown node:node /app/storage

USER node
EXPOSE 3001
VOLUME ["/app/storage"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.API_PORT + '/api/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"
CMD ["node", "dist/main.js"]
