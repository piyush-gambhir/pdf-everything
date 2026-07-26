FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY types/package.json types/package.json
COPY workers/pdf-core-worker/package.json workers/pdf-core-worker/package.json
RUN pnpm install --frozen-lockfile

COPY types types
COPY workers/pdf-core-worker workers/pdf-core-worker
RUN pnpm --filter @pdf-everything/types build \
 && pnpm --filter @pdf-everything/pdf-core-worker build \
 && pnpm --filter @pdf-everything/pdf-core-worker deploy --prod --legacy /prod \
 && chmod -R a+rX /prod

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=8020
LABEL org.opencontainers.image.source="https://github.com/piyush-gambhir/pdf-everything" \
      org.opencontainers.image.description="PDF core operations worker" \
      org.opencontainers.image.licenses="MIT"

COPY --from=build /prod ./
COPY --from=build /app/workers/pdf-core-worker/dist ./dist

USER node
EXPOSE 8020
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"
CMD ["node", "dist/http/index.js"]
