#!/usr/bin/env sh
# Run the real-Chromium integration tests inside a pdf-worker image, against
# the Chromium and fonts that image ships. CI runs them this way (its arm64
# runner has no Chrome); run it locally the same way after building an image:
#
#   docker build -f deploy/docker/Dockerfile -t pdf-worker:local .
#   sh scripts/integration-in-docker.sh pdf-worker:local
#
# The checkout is mounted read-only and copied inside, without node_modules,
# so the image installs its own (musl) dependencies.

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
    corepack enable
    NODE_ENV=development pnpm install --frozen-lockfile --reporter=append-only
    NODE_ENV=test RUN_BROWSER_INTEGRATION=1 pnpm exec vitest run tests/typescript/integration.test.ts
  '
