#!/usr/bin/env sh

set -eu

IMAGE="${1:?usage: sh scripts/integration-in-docker.sh <image>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

docker run --rm --user root \
  --volume "${ROOT}:/src:ro" \
  --entrypoint sh \
  "$IMAGE" -euc '
    # procps: the tests find the browser process with `ps -o ppid`.
    apk add --no-cache procps >/dev/null
    cp -R /src /work
    rm -rf /work/node_modules /work/dist
    cd /work
    npm install --global --allow-scripts=pnpm pnpm@12.15.0
    NODE_ENV=development pnpm install --frozen-lockfile --reporter=append-only
    NODE_ENV=test RUN_BROWSER_INTEGRATION=1 pnpm exec vitest run tests/typescript/integration.test.ts
  '
