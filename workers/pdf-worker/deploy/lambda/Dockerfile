
ARG NODE_IMAGE=node:26.13.0-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94
ARG CHROMIUM_VERSION=156.0.8078.79-r0
ARG LAMBDA_ADAPTER_IMAGE=public.ecr.aws/awsguru/aws-lambda-adapter:1.1.0@sha256:17cfd08eff1dfea3f6a9a1e9c65fdac80aa4919b6085e746615530f43f57d2f1

FROM ${LAMBDA_ADAPTER_IMAGE} AS lambda-adapter

FROM ${NODE_IMAGE} AS build
WORKDIR /app
RUN npm install --global --allow-scripts=pnpm pnpm@12.15.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY core ./core
COPY deploy/docker ./deploy/docker
RUN pnpm run build

FROM ${NODE_IMAGE} AS prod-deps
WORKDIR /app
RUN npm install --global --allow-scripts=pnpm pnpm@12.15.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM ${NODE_IMAGE} AS runner
ARG CHROMIUM_VERSION
WORKDIR /app

COPY --from=lambda-adapter /lambda-adapter /opt/extensions/lambda-adapter

ENV NODE_ENV=production \
    PORT=8080 \
    AWS_LWA_PORT=8080 \
    AWS_LWA_READINESS_CHECK_PATH=/ready \
    AWS_LWA_ASYNC_INIT=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    MAX_PDF_BYTES=4194304 \
    RENDER_DEADLINE_MS=50000 \
    HOME=/tmp \
    XDG_CONFIG_HOME=/tmp \
    XDG_CACHE_HOME=/tmp
LABEL org.opencontainers.image.source="https://github.com/piyush-gambhir/pdf-everything" \
      org.opencontainers.image.description="AWS Lambda image for browser-based HTML and Markdown to PDF rendering" \
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
    font-noto-emoji

COPY deploy/fonts /usr/share/fonts/pdf-worker
RUN find /usr/share/fonts -type d -exec sh -c \
      'for d; do touch -c -d "@$(stat -c %Y "$d")" "$d"; done' _ {} + \
  && fc-cache -f \
  && ! find /usr/share/fonts -type d -exec stat -c %y {} + | grep -v '\.000000000 '

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

CMD ["node", "dist/deploy/docker/index.js"]
