# Maintenance review

Reviewed on 25 October 2026 for the Node 26 dependency upgrade.

The repository provides 19 operations: 17 PDF core operations and HTML/Markdown
rendering through Chromium. The console, Nest gateway, storage, PDF core worker,
and standalone renderer remain separate components.

## Cleanup

The upgrade removes an obsolete dependency override, uses explicit pnpm setup
where Node 26 no longer bundles Corepack, and updates runtime and dependency
pins. TypeScript 7 handles workspace checks and worker builds; the Microsoft
TypeScript 6 compatibility package supplies the compiler API required by Nest,
Next.js, and ESLint. See the [compiler setup](../README.md#typescript-versions).

Five renderer tests that repeated template boilerplate or checked an obsolete
route were removed. Tests for title escaping, script restrictions, egress,
limits, deadlines, authentication, browser recovery, and storage remain.
Existing split and single-input merge tests now check page text and order,
which catches incorrect output that a page-count assertion would miss.

## Remaining work

- Apply aggregate input budgets consistently to uploaded and referenced files.
  Upload size limits exist; base64 transport still copies document buffers.
- Define authentication, allowed CORS origins, ownership, and quotas before
  offering shared public hosting. Worker tokens protect internal execution.
- Propagate client cancellation through the gateway to workers. Explicit worker
  deadlines, concurrency limits, browser reuse, and renderer egress restrictions
  already exist.
- Add cleanup retries and orphan reconciliation for local storage failures.
  Its mutation queue coordinates one storage instance only.
- Extend console workflow coverage and representative PDF fixtures, including
  Unicode, rotated pages, forms, scans, and malformed input.

The [roadmap](ROADMAP.md) contains the larger product and reliability proposals.
The [upgrade playbook](upgrade-playbook.md) records verification, measured gains,
and the process to apply to the next repository. Historical review results are
available in Git history rather than repeated as current test counts.
