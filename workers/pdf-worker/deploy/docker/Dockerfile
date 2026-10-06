# Pinned inputs. The base image is a multi-arch index digest (linux/amd64 and
# linux/arm64); Chromium is an exact Alpine package version from that release.
# Alpine keeps only the newest build of a package in a branch, so when it ships
# a Chromium update this build fails at `apk add` until CHROMIUM_VERSION is
# bumped: a renderer change is always a deliberate commit.
ARG NODE_IMAGE=node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402
ARG CHROMIUM_VERSION=152.0.7977.82-r0

FROM ${NODE_IMAGE} AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.15.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY core ./core
COPY deploy/docker ./deploy/docker
RUN pnpm run build

FROM ${NODE_IMAGE} AS prod-deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.15.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM ${NODE_IMAGE} AS runner
ARG CHROMIUM_VERSION
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8010 \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
LABEL org.opencontainers.image.source="https://github.com/piyush-gambhir/pdf-everything" \
      org.opencontainers.image.description="Standalone browser-based HTML and Markdown to PDF service" \
      org.opencontainers.image.licenses="MIT"

RUN apk add --no-cache \
    chromium=${CHROMIUM_VERSION} \
    nss \
    freetype \
    harfbuzz \
    fontconfig \
    ca-certificates \
    ttf-freefont \
    font-noto-cjk \
    font-noto-emoji \
  && addgroup -g 1001 nodejs \
  && adduser -u 1001 -G nodejs -D nodejs

COPY deploy/fonts /usr/share/fonts/pdf-worker
RUN fc-cache -f

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

USER nodejs
EXPOSE 8010
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - "http://127.0.0.1:${PORT}/health" >/dev/null || exit 1
CMD ["node", "dist/deploy/docker/index.js"]
