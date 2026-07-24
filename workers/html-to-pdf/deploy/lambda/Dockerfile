# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY core ./core
COPY deploy/docker ./deploy/docker
RUN pnpm run build

FROM node:22-alpine AS prod-deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.0.1 \
  /lambda-adapter /opt/extensions/lambda-adapter

ENV NODE_ENV=production \
    PORT=8080 \
    AWS_LWA_PORT=8080 \
    AWS_LWA_READINESS_CHECK_PATH=/health \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    HOME=/tmp \
    XDG_CONFIG_HOME=/tmp \
    XDG_CACHE_HOME=/tmp
LABEL org.opencontainers.image.source="https://github.com/piyush-gambhir/pdf-everything" \
      org.opencontainers.image.description="AWS Lambda image for the HTML to PDF rendering service" \
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

CMD ["node", "dist/deploy/docker/index.js"]
