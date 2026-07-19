# Template System Design — markdown-to-pdf

**Date:** 2026-04-20  
**Status:** Approved — shipping as v1  
**Author:** Piyush Gambhir

---

## Problem

`markdown-to-pdf` currently renders all Markdown with a single GitHub-flavoured CSS style. Different use-cases (documentation, academic papers, incident reports) need different visual treatments of the same raw Markdown input.

## Solution

Add a named **template** system. Callers pass `options.template` in the POST body. The service applies the corresponding CSS+HTML wrapper before Puppeteer renders to PDF. No frontmatter or metadata required — raw Markdown in, styled PDF out.

---

## Templates (v1)

### `github` (default)
Clean, minimal, GitHub-flavoured. System sans-serif, code blocks with gray backgrounds, bordered tables. Best for docs, READMEs, changelogs.

### `academic`
Georgia serif, centered title block, justified text, minimal border tables (top/bottom rules only), code blocks with border-left accent. Best for papers, essays, reports.

### `rca`
Premium dark-accent design for Root Cause Analysis documents. Highlights: large H1 title with red gradient top bar, first two-column table rendered as a metadata key-value grid, CSS counter–based section numbering on H2s, inline JS to detect and style `RC-N` H3 headings as left-bordered callout boxes, dark code blocks with syntax color-coding, priority-pill table rows. Best for incident reports, post-mortems.

---

## Architecture — Option B (chosen)

One TypeScript file per template under `core/templates/`. Each exports a single function:

```typescript
export type TemplateFunction = (bodyHtml: string, title: string) => string;
```

A registry in `core/templates/index.ts` maps name → function. `core/pdf.ts` looks up the template from the registry — no switch/case sprawl, no touching existing templates to add new ones.

```
core/
  pdf.ts                  ← accepts template option, delegates to registry
  templates/
    index.ts              ← TemplateName union, TEMPLATES registry, isTemplateName()
    github.ts             ← wrapHtml for github
    academic.ts           ← wrapHtml for academic
    rca.ts                ← wrapHtml for rca (CSS + inline JS post-processing)
```

---

## API

No breaking changes. `template` is added to the existing `options` object:

```json
POST /v1/render
{
  "markdown": "# RCA: Payment Gateway...\n\n...",
  "options": {
    "template": "rca",
    "format": "A4"
  }
}
→ 200 application/pdf
```

New endpoint for discovery:

```
GET /v1/templates
→ 200 { "templates": ["github", "academic", "rca"] }
```

`template` defaults to `"github"` when omitted. Unknown template name → 400 with `error: "bad_request"`.

---

## RCA Template: Smart Post-Processing

The RCA template uses a small inline `<script>` that runs before Puppeteer captures the page:

1. **Metadata grid** — first `<table>` with no `<thead>` (the key-value metadata table) gets class `meta-table`, rendered as a two-column grid with muted key labels.
2. **Section counters** — CSS `counter-increment` on `h2` auto-prefixes `§ N` in red without touching the HTML.
3. **RC callouts** — JS wraps each `h3` whose text starts with `RC-` plus its following content in a `<div class="rc-callout">`. Severity (`High` / `Medium`) is detected from the text and determines border colour (red vs amber).

---

## Testing

- Unit: `resolveChromiumPath`, `isTemplateName`, template function signature
- HTTP: `GET /v1/templates` returns all names; unknown template → 400; valid template → 200 PDF
- Existing tests unchanged (default template stays `github`)

---

## Out of scope (v1)

- Corporate / Dark-developer templates (deferred)
- Custom CSS overrides per-request
- YAML frontmatter metadata parsing
- Template hot-reload
