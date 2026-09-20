# ---------- prepare: prune the workspace to what this image needs ----------
FROM --platform=$BUILDPLATFORM node:24-bookworm-slim AS prepare
RUN corepack enable && corepack prepare pnpm@11.15.0 --activate
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME/bin:$PNPM_HOME:$PATH
ENV TURBO_TELEMETRY_DISABLED=1
WORKDIR /app
COPY package.json ./
RUN pnpm add -g turbo@^2
COPY . .
RUN turbo prune @pdf-everything/backend --docker

FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.15.0 --activate
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME/bin:$PNPM_HOME:$PATH

FROM base AS deps
COPY --from=prepare /app/out/json/ ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.base.json ./
COPY --from=prepare /app/out/full/ ./

ARG TURBO_TEAMID=
RUN --mount=type=secret,id=turbo_token \
    TURBO_TOKEN="$(cat /run/secrets/turbo_token 2>/dev/null || true)" \
    pnpm exec turbo run build --filter=@pdf-everything/backend...

RUN pnpm --filter @pdf-everything/backend deploy --prod --legacy /prod \
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
