# AWS Lambda container image for pdf-worker.
#
# This runs the SAME HTTP server as the Docker/Cloud Run image, fronted by the
# AWS Lambda Web Adapter, a Lambda extension that bridges the Lambda Runtime
# API to a local web server. No application code changes are required: Lambda
# invocations are translated into HTTP requests to the server on $PORT, and the
# (binary) PDF response is returned base64-encoded. Invoke the function
# directly with an HTTP event, or expose it with a Lambda Function URL.
#
# Build for the architecture of your Lambda function (arm64 is cheaper on
# Graviton and native on Apple Silicon). The published image is multi-arch;
# Lambda needs a single-architecture manifest, so deploy the per-platform
# digest (see the deployment guide):
#
#   docker buildx build --platform linux/arm64 --provenance=false \
#     -f deploy/lambda/Dockerfile -t <ecr-uri>:<tag> --push .
#
# See scripts/deploy-lambda.sh for the full ECR + function flow.

# Pinned inputs. The base image is a multi-arch index digest (linux/amd64 and
# linux/arm64); Chromium is an exact Alpine package version from that release.
# Alpine keeps only the newest build of a package in a branch, so when it ships
# a Chromium update this build fails at `apk add` until CHROMIUM_VERSION is
# bumped: a renderer change is always a deliberate commit.
ARG NODE_IMAGE=node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402
ARG CHROMIUM_VERSION=152.0.7977.82-r0
ARG LAMBDA_ADAPTER_IMAGE=public.ecr.aws/awsguru/aws-lambda-adapter:1.0.1@sha256:1e5ab4d9242167500ed8a7bed8a79b448228aaa51cf382fb51fe4bf8a5f9a811

FROM ${LAMBDA_ADAPTER_IMAGE} AS lambda-adapter

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

# Lambda Web Adapter (the index digest covers both architectures; buildx takes
# the one matching --platform).
COPY --from=lambda-adapter /lambda-adapter /opt/extensions/lambda-adapter

# The server and adapter share port 8080. The adapter's readiness check is
# /ready, which answers once the shared Chromium is up, so the browser starts
# during the environment's init and the first render finds it running; with
# async init, a start slower than Lambda's 10-second init limit finishes inside
# the first invocation instead of restarting the environment. Lambda's
# filesystem is read-only outside /tmp, so Chromium writes its home and cache
# data there. A buffered Lambda response is at most 6 MB after base64, so PDFs
# stop at 4 MiB, and the render deadline sits under a 60-second function timeout.
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
# Lambda's image filesystem keeps whole-second times, and fontconfig refuses a
# cache whose directory time differs even in nanoseconds, so a cache built from
# the precise times made every new environment rescan all the fonts (CJK
# included) when Chromium first started. Truncate the font directories' times,
# build the cache, and fail the build if any time is still fractional.
RUN find /usr/share/fonts -type d -exec sh -c \
      'for d; do touch -c -d "@$(stat -c %Y "$d")" "$d"; done' _ {} + \
  && fc-cache -f \
  && ! find /usr/share/fonts -type d -exec stat -c %y {} + | grep -v '\.000000000 '

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Lambda manages the sandbox user; do not drop privileges here.
CMD ["node", "dist/deploy/docker/index.js"]
