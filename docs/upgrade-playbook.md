# Node and dependency upgrade playbook

PDF Everything is the first completed local verification pass, dated 25 October 2026. The comparison base is `2b7b3d8` on `main`. Review and CI results belong to
the upgrade branch until that branch is merged. A passing local build does not
establish that production is running it.

## PDF Everything results

| Area                  | Result                                                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime               | Node 24.22.1 to 26.12.1; pnpm 12.11.2 to 12.15.0                                                                                               |
| Compiler              | TypeScript 7.0.2 for checks and worker builds; TypeScript 6.0.3 compiler API for Nest, Next.js, and ESLint                                     |
| Dependency advisories | Root production audit: 5 findings (3 moderate, 2 low) to 0; final full and production audits are clear for both lockfiles                      |
| Peer dependencies     | No reported conflicts                                                                                                                          |
| Automated tests       | 20 gateway/storage, 45 PDF core, 49 renderer, and 10 real-Chromium tests pass: 124 distinct tests                                              |
| Builds                | Five root workspace builds and the standalone renderer build pass                                                                              |
| Compiled API          | All 19 operations pass through the gateway with real workers; 22 checks include file lifecycle, invalid options, and worker authentication     |
| Browser               | Built static console: Markdown render/download, PDF upload, selected-page rotation/download, reset, invalid options, and correction/retry pass |
| Linux images          | API, PDF core, Chromium, and Lambda images build on arm64; SQLite and sharp load in the fresh images                                           |
| Container behavior    | All 19 operations pass through three fresh Linux containers; all 10 integration tests also pass against the image's Chromium 155.0.8059.84     |

Audits describe known advisories in the dependency graph at the time of the run.
They do not measure production exposure or replace an application security audit.
The standalone renderer already had zero advisories before this upgrade.

Five low-value renderer tests were removed: a hardcoded valid-name check, three
HTML boilerplate checks, and a negative check for an obsolete route. Existing
split and single-input merge tests now assert page content and order. Security,
limits, recovery, and storage regression tests remain.

### Measured compiler gains

Both compilers checked identical current sources and dependencies under Node
26.12.1. Each project had one warm-up per compiler, then five samples in
alternating order, using `--noEmit --incremental false`. These are local wall-clock
medians, including compiler startup, without Turborepo task caching.

| Project            | TypeScript 6 | TypeScript 7 | Speedup |
| ------------------ | -----------: | -----------: | ------: |
| Shared types       |       266 ms |        64 ms |    4.2x |
| Backend            |       916 ms |       192 ms |    4.8x |
| Console            |     1,752 ms |       307 ms |    5.7x |
| Documentation site |     1,484 ms |       168 ms |    8.8x |
| PDF core worker    |       596 ms |        93 ms |    6.4x |
| Chromium worker    |       533 ms |        84 ms |    6.4x |

Reproduce from the repository root after installing both workspaces and building:

```bash
node scripts/benchmark-typecheck.mjs
```

This is a compiler comparison, not a complete build benchmark. Nest and Next.js
still use the TypeScript 6 API during their builds. PDF throughput, peak memory,
production latency, and hosting cost have not been benchmarked; no numerical
improvement is claimed for those measures.

### Compatibility decisions and fixes

- Node 26 does not bundle Corepack. Install the pinned package manager explicitly
  in Dockerfiles and the container integration helper.
- With the bundled npm, a plain global pnpm install left install scripts blocked
  and the subsequent pnpm command crashed. The isolated install and all four
  image builds pass with `npm install --global --allow-scripts=pnpm pnpm@12.15.0`.
  This permission applies only to that install, not global npm configuration.
- Keep the Microsoft TypeScript 6 compatibility alias where tools import the
  compiler API. Separate TypeScript 7 checks and TypeScript 6 builds must both
  pass. New syntax and declaration output can otherwise diverge between tools.
- ESLint stays on 9.39.5. The latest `eslint-plugin-react` 7.37.5 declares support
  through ESLint 9; upgrading to ESLint 10 would violate that peer requirement.
  Every other direct dependency is current according to `pnpm outdated` for
  both lockfiles at review time.
- An earlier main-branch Lambda publish failed with an AWS Public ECR HTTP 429.
  The verification jobs passed in that run. Treat registry failures separately
  from application failures; this pass successfully built the Lambda image.

The Lambda image build is verified locally. An actual AWS Lambda invocation,
production deployment, and multi-architecture publication are separate release
checks. Local Docker verification used arm64.

## Repeatable sequence for each repository

1. Record the base commit, dirty files, remote, owner account, package manager,
   workspace boundaries, runtime pins, CI triggers, and deployment side effects.
   Preserve existing user changes and work in one review branch per repository.
2. Run the existing focused checks and both production and complete dependency
   audits before changing versions. Record behavior and performance baselines
   before the upgrade if runtime performance is a goal.
3. Verify current stable releases and framework/plugin peer support. Upgrade the
   runtime, CI, container bases, package-manager pin, dependencies, and lockfiles
   together. Record each deliberate holdback with its actual incompatibility.
4. Review every changed script and dependency override. Remove stale workarounds
   only when their original problem is resolved. Check native dependencies,
   compiler API consumers, install-script policies, and independent lockfiles.
5. Run a frozen install and peer checks. Run targeted tests, lint, and type checks
   before complete builds. Bypass task caches when recording final verification.
6. Remove tests only when they check deleted behavior, duplicate stronger tests,
   or assert boilerplate. Strengthen output assertions before adding more test
   cases. Preserve security and failure-recovery coverage.
7. Exercise the complete compiled application with real dependencies and
   disposable local data. Verify output contents, errors, authentication where
   present, storage lifecycle, and the main browser upload/download flows.
8. Build fresh runtime images. Load native modules inside them, test against the
   shipped browser/runtime, and exercise services together. Record architectures
   and platform behavior that have not been tested.
9. Re-run audits and outdated checks. Benchmark identical workloads in alternating
   order, retain samples and medians, and distinguish measured improvements from
   expected maintenance benefits. Do not infer lower hosting costs from versions.
10. Update setup docs and keep the verification command in CI. Push the review
    branch, inspect CI and the final diff, then merge through the normal release
    process. Record the merged commit and image digests before calling a release
    verified. Review each repository separately before starting its successor.

## Commands for this repository

Use the Node and pnpm versions pinned in `.nvmrc` and `package.json`. Install pnpm
explicitly when it is absent; Node 26 does not provide Corepack.

```bash
pnpm install --frozen-lockfile
pnpm --dir workers/pdf-worker install --frozen-lockfile
pnpm peers check
pnpm exec turbo run lint typecheck test --cache=local:,remote:
pnpm exec turbo run build --cache=local:,remote:
pnpm --dir workers/pdf-worker build
pnpm --dir workers/pdf-worker test
pnpm --dir workers/pdf-worker test:integration
pnpm --dir workers/pdf-worker format:check
pnpm verify:stack
pnpm audit
pnpm audit --prod
pnpm --dir workers/pdf-worker audit
pnpm --dir workers/pdf-worker audit --prod
pnpm outdated -r
pnpm --dir workers/pdf-worker outdated
```

`verify:stack` starts the compiled gateway and both workers on ephemeral ports,
uses a separate temporary storage directory, and checks all 19 operations.
Chrome/Chromium must be installed locally, or set `PUPPETEER_EXECUTABLE_PATH`.
The Runtime CI workflow runs this command and verifies image builds separately.

```bash
docker build -f backend/Dockerfile -t pdf-everything-api:review .
docker build -f workers/pdf-core-worker/Dockerfile -t pdf-core-worker:review .
docker build -f workers/pdf-worker/deploy/docker/Dockerfile -t pdf-worker:review workers/pdf-worker
docker build -f workers/pdf-worker/deploy/lambda/Dockerfile -t pdf-worker-lambda:review workers/pdf-worker
sh workers/pdf-worker/scripts/integration-in-docker.sh pdf-worker:review
```

For the final review, confirm CI ran on the actual pushed commit. On this repo,
merging to `main` triggers image publication, so publication results and image
digests must also be checked after an authorized merge. Roll back code through a
revert commit; use the previous known image digest for a deployment rollback.
