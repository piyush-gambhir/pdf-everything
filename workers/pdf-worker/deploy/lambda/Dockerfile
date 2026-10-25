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
ARG NODE_IMAGE=node:26.12.1-alpine@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797
ARG CHROMIUM_VERSION=155.0.8059.84-r0
# Child manifests of the official 1.1.0 index:
# sha256:17cfd08eff1dfea3f6a9a1e9c65fdac80aa4919b6085e746615530f43f57d2f1.
# Pin each architecture directly: publishing runners hit HTTP 429 on the index.
ARG LAMBDA_ADAPTER_ARM64_IMAGE=public.ecr.aws/awsguru/aws-lambda-adapter@sha256:98d6d1dc9ad3f18c6af7baaa397fb033a57d82f5bffb58ff33bef1c2e1f4f0fe
ARG LAMBDA_ADAPTER_AMD64_IMAGE=public.ecr.aws/awsguru/aws-lambda-adapter@sha256:9d6b29a45b14a4a70f88d53c68b6d5bab1b22d75baca733958fee59308c509b8
ARG TARGETARCH

FROM ${LAMBDA_ADAPTER_ARM64_IMAGE} AS lambda-adapter-arm64
FROM ${LAMBDA_ADAPTER_AMD64_IMAGE} AS lambda-adapter-amd64
FROM lambda-adapter-${TARGETARCH} AS lambda-adapter

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

# Copy the adapter from the manifest selected for the target architecture.
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
