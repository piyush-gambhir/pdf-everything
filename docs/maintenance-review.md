# Maintenance review — September 2026

The project has a useful foundation: 19 console tools, explicit Nest endpoints,
shared Zod options, a PDF operation worker, and a separate Chromium renderer.
Keep that separation. The next investment should make existing operations easier
to use and put bounds on resource consumption before adding more engines.

## Changes made

- Removed the unused validation pipe, Card and Separator components, and unused
  direct dependencies: `@nestjs/testing`, `@eslint/eslintrc`, and the marketing
  site's `@pdf-everything/types`, `clsx`, and `tailwind-merge` dependencies.
- Consolidated the console's three copies of multipart request construction.
  The sidebar now uses the existing category helper once instead of rebuilding
  the same grouping on every render.
- Removed empty future categories and descriptions advertising unsupported
  Office conversion, OCR, signing, and form creation.
- Removed unreachable page-bound checks after `parsePageRange`, which already
  returns only pages within the document. Its existing clipping behavior is
  unchanged. Reused shared rotation, split, and positioning types.
- Fixed custom merge filenames, rejected uploads clearing a valid selection,
  and object URLs being allocated during rendering without cleanup. Download
  URLs now survive rerenders and are revoked on reset or unmount. Leaving a tool
  aborts its browser request; server-side cancellation remains separate work.
- Enforced stored-file expiry for content and metadata. Cleanup now runs at
  startup and every minute, and SQLite closes on shutdown. Uploads and deletions
  are serialized within each storage instance to protect deduplicated content
  from concurrent cleanup. Existing expired files will be cleaned on next startup.
- Single-file worker operations now reject zero or multiple files with HTTP 400.
  Invalid reorder permutations also produce a client error rather than HTTP 500.
- Removed two low-value renderer tests and strengthened existing PDF tests to
  inspect actual text and page order. Added retention, shared-content deletion,
  concurrent upload, and worker input-count regression coverage.
- Untracked six runtime storage files and four generated documentation files,
  preserving local copies. Added ignore rules, and corrected the formatter's
  broad `storage` exclusion so it no longer skips storage source code. Untracking
  removes these files from future commits; it does not rewrite existing history.

## Verification

- Root tests: 53 passed (10 gateway/storage, 43 PDF core worker).
- Standalone renderer tests: 27 passed; its two opt-in Chromium integration tests
  also passed in a separate real-browser run. Total: 82 passed.
- Root lint and type checks passed. Both production Next exports, the API,
  shared types, and both worker builds passed. The renderer formatting check
  and Git whitespace check passed.
- Builds required network access for Google Fonts, and HTTP/browser tests
  required permission to open local ports and launch Chromium.

## Remaining improvements, in priority order

| Priority                     | Finding and evidence                                                                                                                                                                                                              | Recommended change                                                                                                                                                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High                         | Gateway file interceptors have count limits but no byte limits. `load-inputs.ts` loads referenced files without a total-byte budget. Worker requests then copy buffers into base64 JSON.                                          | Enforce per-file, total-request, field-size, and page-count budgets before processing. Apply the same rules to uploads and file references, and return clear 413 responses. Align JSON limits with the HTML/Markdown schema's advertised size. |
| High                         | Both gateway worker clients call `fetch` without an explicit deadline. The Chromium renderer launches a new browser for every request.                                                                                            | Add execution deadlines, bounded concurrency, overload responses, and cancellation propagation. Measure memory and latency with representative large documents before introducing a browser pool.                                              |
| High for public hosting      | `backend/src/main.ts` reflects arbitrary CORS origins with credentials. No public API authentication, per-user file ownership, or quotas are implemented in the repository. Worker bearer tokens protect internal execution only. | Define the public access model, configure allowed origins, and enforce tenant ownership and quotas if hosting for multiple users. Verify any controls supplied by the deployment separately.                                                   |
| High for untrusted rendering | `workers/pdf-worker/core/html.ts` renders supplied HTML with Chromium and allows network requests; all three Markdown templates interpolate titles directly into HTML.                                                            | Restrict renderer egress, including redirects and internal destinations, and allow only required resource schemes. Escape document titles. Preserve deliberate template scripts, such as RCA post-processing.                                  |
| Medium                       | `ToolDefinition<unknown>` erases the relationship between schemas, form values, and filename functions through a registry cast. Most controllers repeat the same transport plumbing.                                              | Introduce a typed tool-registration boundary and extract only repeated controller input/response handling. Keep explicit endpoint and Swagger declarations so the API remains easy to inspect.                                                 |
| Medium                       | Storage is local SQLite/filesystem; the mutation queue coordinates one instance only. Unlink failures are swallowed, so orphaned content can remain after filesystem failures.                                                    | Add observable cleanup retries and orphan reconciliation. Use shared object storage and durable metadata before scaling the API across replicas.                                                                                               |
| Medium                       | Worker tests cover operations well, but the console lacks workflow tests; `pnpm lint` runs only the two Next applications.                                                                                                        | Add a small browser suite for uploads, option editing, errors, downloads, and navigation cleanup. Add backend and worker linting. Use a small PDF corpus covering Unicode, rotated pages, forms, scans, and malformed input.                   |
| Medium                       | Root commands omit the standalone Chromium workspace. Production Next builds fetch Google Fonts.                                                                                                                                  | Provide a documented full-stack verification command, retaining the independent worker lockfile if needed for deployment. Consider locally bundled fonts for reproducible offline builds.                                                      |

These are repository findings, not claims about controls that may exist in a
running deployment. This pass did not perform a deployed security audit or a full
console browser workflow test.

## Feature priorities

Effort is relative and assumes the reliability changes above; these features are
proposals, not implemented changes.

| Order | Feature                                            | Fit and implementation                                                                                                                                                                                                                           | Effort       |
| ----- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| 1     | Page previews and visual page selection/reordering | Highest UX payoff for the existing organize tools. Render thumbnails in the console, keep selections as page indices, and submit to existing operations. [PDF.js supports page rendering to canvas](https://mozilla.github.io/pdf.js/examples/). | Medium       |
| 2     | Download all split results as ZIP                  | Completes an existing workflow that currently needs a separate download for each output. Use a streamed server archive for large results.                                                                                                        | Small–medium |
| 3     | Send a result to another tool                      | Reuse the existing `fileIds` inputs and `output=ref` responses to support merge → watermark → number pages without repeated uploads. Surface expiry and explicit deletion.                                                                       | Medium       |
| 4     | Form field discovery and typed editing             | Existing form extraction already returns field types and values. Generate suitable controls before submitting to forms-fill, and show missing-field feedback.                                                                                    | Medium       |
| 5     | Saved option presets                               | Useful for watermark styles, numbering, and Markdown templates. Persist settings without retaining document contents by default.                                                                                                                 | Small        |
| 6     | PDF pages to PNG/JPEG                              | Complements images-to-PDF. Add rasterization in a worker with DPI, page selection, output-count limits, and ZIP delivery. PDF.js has [Node rendering examples](https://mozilla.github.io/pdf.js/examples/).                                      | Medium       |
| 7     | Compression and repair diagnostics                 | Add a dedicated worker engine and report actual savings; do not promise every input will shrink. Evaluate [qpdf's transformation and checking options](https://qpdf.readthedocs.io/en/stable/cli.html) and image recompression separately.       | Medium–large |
| 8     | OCR and scan cleanup                               | A separate worker can add searchable text, deskew, and rotation. [OCRmyPDF documents those operations](https://ocrmypdf.readthedocs.io/en/latest/cookbook.html). This needs language resources, job progress, and longer execution budgets.      | Large        |

Office conversion, verifiable digital signatures, true redaction, and document
comparison should follow as separate projects with representative document
fixtures and clearly defined fidelity requirements. A rectangle over text is
not redaction, and drawing a signature is not a cryptographic signature.

The suggested first milestone is previews, ZIP downloads, and result chaining.
It improves the existing 19-tool product without introducing another conversion
engine.
