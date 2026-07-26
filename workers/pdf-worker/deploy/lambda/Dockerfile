# AWS Lambda container image for pdf-worker.
#
# This runs the SAME HTTP server as the Docker/Cloud Run image, fronted by the
# AWS Lambda Web Adapter — a Lambda extension that bridges the Lambda Runtime
# API to a local web server. No application code changes are required: Lambda
# invocations are translated into HTTP requests to the server on $PORT, and the
# (binary) PDF response is returned as-is. Expose it with a Lambda Function URL.
#
# Build for the architecture of your Lambda function (arm64 is cheaper on
# Graviton and native on Apple Silicon):
#
#   docker buildx build --platform linux/arm64 --provenance=false \
#     -f deploy/lambda/Dockerfile -t <ecr-uri>:<tag> --push .
#
# See scripts/deploy-lambda.sh for the full ECR + function flow.

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.15.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY core ./core
COPY deploy/docker ./deploy/docker
RUN pnpm run build

FROM node:22-alpine AS prod-deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.15.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM node:22-alpine AS runner
WORKDIR /app

# Lambda Web Adapter (multi-arch image — matches the build --platform).
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.0.1 /lambda-adapter /opt/extensions/lambda-adapter

# The server and adapter share port 8080. Lambda's filesystem is read-only
# outside /tmp, so Chromium writes its home and cache data there.
ENV NODE_ENV=production \
    PORT=8080 \
    AWS_LWA_PORT=8080 \
    AWS_LWA_READINESS_CHECK_PATH=/health \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    HOME=/tmp \
    XDG_CONFIG_HOME=/tmp \
    XDG_CACHE_HOME=/tmp
LABEL org.opencontainers.image.source="https://github.com/piyush-gambhir/pdf-everything" \
      org.opencontainers.image.description="AWS Lambda image for browser-based HTML and Markdown to PDF rendering" \
      org.opencontainers.image.licenses="MIT"

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Lambda manages the sandbox user; do not drop privileges here.
CMD ["node", "dist/deploy/docker/index.js"]
