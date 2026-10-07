# Roadmap

The bigger items from the engineering review of 7 October 2026 (reviewed at
`f40cc53`), for the owner to pick from. Each says what it is, why (with the
evidence), the expected gain, a rough effort in engineering days, the main
risk, what it depends on, and the question it needs answered first. Gains are
estimates unless marked as measured.

## Done: the quick wins (7 October 2026)

- Lambda deploys keep the function's environment, memory and timeout, deploy
  by verified digest, publish a version and can move an alias
  (`scripts/deploy-lambda.sh`).
- Markdown template titles are escaped.
- Docs say what is true today: remote assets are blocked, the gateway has no
  authentication or quotas, responses are buffered, and Swagger documents the
  real render body.
- Bounds: gateway multipart limits (`MAX_UPLOAD_MB`), deadlines on both worker
  clients, and active-job caps in both workers (`503 worker_busy`).
- The real-Chromium integration tests run in CI, inside the built image.
- One structured timing line per render (`RENDER_TIMING_LOG`).

## Next

### 1. Gateway authentication, tenant ownership, quotas and CORS

- **What:** caller authentication on `/api/v1/**` (API keys or an upstream
  identity), an owner on every stored file checked by metadata, download and
  delete, per-tenant quotas and rate limits, and an explicit CORS origin list.
- **Why:** no authentication, ownership or quota exists in the gateway; file
  routes act on an ID alone (`backend/src/files/files.controller.ts`), and CORS
  reflects any origin with credentials (`backend/src/main.ts`). Worker tokens
  protect only the gateway-to-worker hop.
- **Gain:** a public deployment becomes defensible; uploaded documents and
  rendering capacity are protected.
- **Effort:** 3–5 days.
- **Risk:** authentication model and retention policy are owner decisions;
  the console needs a way to authenticate.
- **Depends on:** nothing; storage (Longer term 3) if quotas must hold across
  replicas.
- **Owner question:** is the gateway public, private, or behind an external
  authentication layer today? If public, this comes first.

### 2. Render benchmark matrix and Lambda memory sizing

- **What:** a repeatable benchmark over the timing line (now logged per
  render): Lambda memory 1,536 / 1,769 / 2,048 / 3,072 / 4,096 MB; container
  concurrency 1, 2 and 4; fresh page (today) against a fresh context and a
  reset, retained page; cold, warm and relaunch cases.
- **Why:** warm BCT renders take 0.6–0.7 s on Lambda (owner-supplied), but no
  phase measurement existed before the timing line, and the cost of a fresh
  context per render (about 0.7 s on Lambda) was measured once while
  debugging, not benchmarked. CPU scales with memory (about one vCPU at
  1,769 MB).
- **Gain:** pick memory by cost per successful render (at 0.65 s on 2,048 MB,
  3,072 MB must reach 0.433 s to break even); set `MAX_ACTIVE_RENDERS` from
  data rather than the default 4.
- **Effort:** 1–2 days.
- **Risk:** low; needs a throwaway function, never the production one.
- **Depends on:** the timing line (done).
- **Owner question:** what cold-response SLO matters for BCT, and how often
  do the slow tails happen?

### 3. Lambda image regression harness in CI

- **What:** run the actual Lambda image in CI with a read-only root and a
  writable `/tmp`; drive it through the Lambda Web Adapter with a real HTTP
  v2 event and binary response; check the font cache is accepted after the
  whole-second mtime fix (with a deliberately invalid cache as a control);
  freeze and thaw during launch and after readiness; repeated-render memory;
  graceful shutdown; plus a small representative document and font corpus.
- **Why:** CI builds the Lambda image but never runs it
  (`.github/workflows/workers-ci.yml`); the recent Lambda fixes (font cache,
  async init, launch bounding) have no automated guard. The Dockerfile checks
  build-time mtimes, which does not prove Chromium accepts the cache at run
  time.
- **Gain:** catches font-cache, filesystem, adapter and freeze/thaw
  regressions before they reach Lambda.
- **Effort:** 2–4 days.
- **Risk:** local emulation cannot reproduce AWS's regional image loading or
  rare fresh-environment tails.
- **Depends on:** nothing.
- **Owner question:** which languages and scripts must the corpus prove
  (see 4)?

### 4. Lean font profile and headless-shell A/B

- **What:** an optional image profile without Noto CJK and Noto emoji, and an
  experiment with Alpine's `chromium-headless-shell` (`headless: 'shell'`),
  each checked for glyph coverage, pagination, tagged output and the security
  tests.
- **Why:** the Lambda image installs CJK (about 88.8 MiB installed) and emoji
  (about 9.7 MiB) fonts; the headless shell package is about 89.6 MiB smaller
  installed than full Chromium. These are published Alpine package sizes,
  not measured image sizes.
- **Gain:** possibly 100 MiB or more off the image; any cold-start gain is
  unmeasured (Lambda loads images lazily by block).
- **Effort:** 2–4 days.
- **Risk:** glyph coverage for passenger names and destinations; rendering
  parity.
- **Depends on:** 2 (to measure) and 3 (to guard).
- **Owner question:** which languages, scripts, symbols and emoji must BCT and
  the public image support, and is a separate BCT-optimized image profile
  acceptable?

### 5. Contract unification

- **What:** one documented contract for gateway and workers: byte limits,
  input cardinality, option behavior and response schemas; OpenAPI generated
  from it; gateway requests tested against the real workers.
- **Why:** the gateway's render schema drops `preferCssPageSize` silently,
  accepts any margin string the worker then rejects, and counts HTML in
  characters while the worker limits UTF-8 bytes (`types/src/render.ts`);
  uploads silently win over `fileIds` (`backend/src/common/load-inputs.ts`);
  file-reference arrays are not consistently checked for count.
- **Gain:** options that work end to end, one set of limits, accurate API
  documentation.
- **Effort:** 2–3 days.
- **Risk:** callers relying on today's permissive behavior.
- **Depends on:** nothing.
- **Owner question:** may the gateway start refusing requests it accepts
  today (for example both uploads and `fileIds`)?

### 6. Core worker execution limits

- **What:** the rest of the review's top item for the core worker: bounds on
  decoded bytes per file and in total, file count, pages, image pixels, split
  results and output bytes, and a bounded process pool so an operation can be
  stopped at a deadline.
- **Why:** the core protocol accepts up to 150 MiB of JSON, decodes every
  file, runs without an operation deadline and serializes the whole result
  (`workers/pdf-core-worker/http/server.ts`). A JavaScript timeout cannot
  interrupt synchronous parser work on the same event loop. The active-job cap
  (done) limits how many run at once, not how big one is.
- **Gain:** no single document can exhaust memory or hold a worker
  indefinitely.
- **Effort:** 2–3 days.
- **Risk:** limits must admit legitimate documents.
- **Depends on:** 7 (corpus) to choose the limits.
- **Owner question:** what are the input and output size percentiles?

### 7. Core PDF correctness fixes and a document corpus

- **What:** fix watermark anchoring (`core/edit/watermark.ts`), annotation and
  box handling in page-size conversion, crop geometry for non-zero origins and
  rotation, Unicode text in overlays and form appearances, multi-select
  dropdown extraction, page-number semantics, and text extraction spacing;
  add a corpus of real PDFs (forms, links, outlines, tags, rotated pages,
  encrypted and signed files).
- **Why:** reproduced by reading the code; current tests check presence and
  dimensions, not placement or preservation.
- **Gain:** correct output, and documented behavior for what is not
  supported (cropping is not redaction; rewriting invalidates signatures).
- **Effort:** 3–5 days to start.
- **Risk:** complex PDFs need explicit supported behavior.
- **Depends on:** nothing.
- **Owner question:** must core operations preserve forms, annotations,
  outlines, tagging and signatures, or refuse inputs they cannot preserve?

### 8. Worker-side object output instead of base64 transport

- **What:** the browser worker uploads the PDF to object storage and returns
  a small reference; the core protocol moves to binary or object references
  where file sizes warrant it.
- **Why:** the Lambda image caps PDFs at 4 MiB to fit a buffered, base64
  response (`deploy/lambda/Dockerfile`); gateway `?output=ref` stores a PDF
  only after receiving it, so it cannot lift that cap; base64 adds a third
  and several copies (a synthetic 25 MiB core round trip retained about
  209 MiB).
- **Gain:** larger documents and less memory per job.
- **Effort:** 3–7 days.
- **Risk:** IAM, object ownership, cleanup and protocol compatibility.
- **Depends on:** 1 (ownership) for a public gateway.
- **Owner question:** should generated documents be kept in object storage,
  and under what retention and access policy?

### 9. Native-architecture builds, tested-artifact promotion, SBOMs, reproducibility

- **What:** build and test each architecture natively instead of under QEMU,
  publish the images that were tested instead of rebuilding them, share the
  browser runtime layers between the standard and Lambda images, pin the
  gateway and core base images and the pruning tool by digest, attach SBOMs,
  attest per-platform manifests, and add root build inputs to the workflow
  path filters.
- **Why:** publishing rebuilds four variants after verification
  (`.github/workflows/publish-worker-images.yml`); base images and the global
  `turbo@^2` are mutable (`backend/Dockerfile`); root `package.json`,
  `tsconfig.base.json`, `turbo.json` and `.dockerignore` do not trigger the
  workflows.
- **Gain:** faster publishing (unmeasured), fewer mutable inputs, verifiable
  artifacts.
- **Effort:** 2–4 days.
- **Risk:** native runner availability; release migration.
- **Depends on:** nothing.
- **Owner question:** none beyond priority.

## Longer term, driven by workload

### 1. SnapStart experiment

- **What:** try Lambda SnapStart for the custom Node image (explicit opt-in,
  Web Adapter 1.1.0 restore support, a synthetic preload render), validating
  Chromium and its DevTools pipe after restore; compare with provisioned
  concurrency.
- **Why:** AWS documentation now allows SnapStart for custom container images;
  the image pins adapter 1.0.1 and lacks the opt-in. No BCT gain has been
  measured.
- **Gain:** possibly lower cold latency; unknown.
- **Effort:** 2–3 days for the experiment (estimate).
- **Risk:** restore correctness of a running Chromium; cache and restore
  charges; incompatible with provisioned concurrency.
- **Depends on:** Next 2 and 3.
- **Owner question:** what cold-response SLO matters, and is about $21.60 per
  30 days per provisioned 2 GB slot (x86 list price) an acceptable
  alternative?

### 2. Asynchronous jobs, idempotency and webhooks

- **What:** `202` job creation, status, results and cancellation;
  tenant-scoped idempotency keys over input, options and renderer version;
  bounded retries; signed, durable webhooks.
- **Why:** everything is synchronous today; large or bursty transformations
  have nowhere to queue.
- **Gain:** large and bursty work without long-held connections; safe
  retries.
- **Effort:** 5–10 days (estimate).
- **Risk:** a queue, storage and delivery guarantees to operate.
- **Depends on:** Next 1 and 8, Longer term 3.
- **Owner question:** what are request volume, burst concurrency and
  document size percentiles?

### 3. Storage for horizontal scale

- **What:** replace the gateway's local file store with shared object storage,
  with crash-safe creation (no orphan between file and database row) and
  scheduled cleanup of failed deletions.
- **Why:** files and their metadata live on one replica's disk; serialized
  mutations are process-local (`backend/src/files/storage/local-fs.storage.ts`).
- **Gain:** more than one gateway replica.
- **Effort:** 3–5 days (estimate).
- **Risk:** migration of stored files; cost.
- **Depends on:** Next 1 (ownership).
- **Owner question:** the retention and tenant-access policy (as Next 8).

### 4. Stronger isolation for untrusted multi-tenant documents

- **What:** a separate process or execution environment per tenant or per
  job, with container memory, PID and CPU limits and restricted egress, for
  documents from untrusted tenants.
- **Why:** Chromium runs with `--no-sandbox`; a page or incognito context is
  not a boundary against a Chromium exploit.
- **Gain:** one tenant's document cannot reach another's.
- **Effort:** 5–10 days (estimate).
- **Risk:** cold starts and cost per job.
- **Depends on:** Next 1.
- **Owner question:** will the service ever render documents from untrusted
  third parties?

### 5. PDF/A or PDF/UA output

- **What:** a validated archival (PDF/A) or accessible (PDF/UA) profile,
  with conformance validation.
- **Why:** Puppeteer already emits tagged PDFs, but tagging is not PDF/UA
  conformance, and PDF/A needs a defined profile, metadata and color rules.
- **Gain:** meets a contractual archival or accessibility requirement.
- **Effort:** 3–5 days per profile (estimate).
- **Risk:** validation tooling; core transformations must preserve tags.
- **Depends on:** Next 7.
- **Owner question:** are archival conformance, accessibility, or
  byte-identical regeneration contractual requirements?

## Also noted (small)

- Liveness and readiness: the Docker health check uses `/health`, and core
  `/ready` always succeeds; shutdown does not drain active renders.
- Stable error categories and correlation IDs; internal worker messages can
  reach public responses.
- Propagate client cancellation to the render, and bound worker response
  bytes in the gateway.
- Measure a synthetic render during init (font paths and first print) against
  total cold latency.
- Place the small adapter layer after the large runtime layer in the Lambda
  Dockerfile.
- One documented verification command covering the root workspace and the
  standalone browser worker.

## Open questions for the owner

1. Is the gateway currently public, private, or protected by an external
   authentication layer?
2. What cold-response SLO matters for BCT, and how often do the rare tails
   occur?
3. What are request volume, burst concurrency, region, and input/output size
   percentiles?
4. Which languages, scripts, symbols, and emoji must BCT and the public image
   support?
5. Should generated documents be persisted in object storage, and what
   retention/tenant-access policy applies?
6. Must core operations preserve forms, annotations, outlines, tagging, and
   signatures, or explicitly reject unsupported cases?
7. Are archival conformance, accessibility, or byte-identical regeneration
   contractual requirements?
8. Is maintaining separate general-purpose and BCT-optimized image profiles
   acceptable?
