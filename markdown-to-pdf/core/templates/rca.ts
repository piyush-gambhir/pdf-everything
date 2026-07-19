export function rcaTemplate(bodyHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.7;
    color: #334155;
    max-width: 820px;
    margin: 0 auto;
  }

  /* ── H1: Incident title banner ── */
  h1 {
    font-size: 2em;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin-top: 0;
    margin-bottom: 0.2em;
    padding-top: 1.1em;
    position: relative;
  }
  h1::before {
    content: '';
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 5px;
    background: linear-gradient(90deg, #dc2626 0%, #ea580c 50%, #d97706 100%);
    border-radius: 3px;
  }
  /* Eyebrow label above H1 */
  h1::after {
    content: 'ROOT CAUSE ANALYSIS';
    display: block;
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: #dc2626;
    margin-bottom: 0.35em;
    margin-top: 0.6em;
    order: -1;
  }

  /* ── H2: Section headings with auto counter ── */
  body { counter-reset: rca-section; }
  h2 {
    counter-increment: rca-section;
    font-size: 1.05em;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: 0em;
    margin-top: 2em;
    margin-bottom: 0.5em;
    padding-bottom: 0.4em;
    border-bottom: 1.5px solid #e2e8f0;
    display: flex;
    align-items: center;
    gap: 0.5em;
  }
  h2::before {
    content: '§ ' counter(rca-section);
    display: inline-block;
    font-size: 8pt;
    font-weight: 800;
    color: #dc2626;
    background: #fef2f2;
    border: 1.5px solid #fecaca;
    border-radius: 5px;
    padding: 2px 8px;
    letter-spacing: 0.04em;
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* ── H3: Subsection headings ── */
  h3 {
    font-size: 0.95em;
    font-weight: 700;
    color: #0f172a;
    margin-top: 1.4em;
    margin-bottom: 0.35em;
    padding-left: 10px;
    border-left: 3px solid #dc2626;
  }

  /* ── RC callout boxes (applied via JS below) ── */
  .rc-callout {
    border-radius: 8px;
    padding: 13px 16px;
    margin-bottom: 12px;
  }
  .rc-callout-high {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-left: 4px solid #dc2626;
  }
  .rc-callout-medium {
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-left: 4px solid #d97706;
  }
  .rc-callout-low {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-left: 4px solid #2563eb;
  }
  .rc-callout h3 {
    border-left: none;
    padding-left: 0;
    font-size: 8.5pt;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-top: 0;
    margin-bottom: 0.4em;
  }
  .rc-callout-high h3 { color: #dc2626; }
  .rc-callout-medium h3 { color: #d97706; }
  .rc-callout-low h3 { color: #2563eb; }
  .rc-callout p { margin-bottom: 0.3em; font-size: 10pt; color: #1c1917; }
  .rc-callout p:last-child { margin-bottom: 0; }

  /* ── Metadata table (first headerless 2-col table) ── */
  table.meta-table {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    border-collapse: separate;
    border-spacing: 0;
    overflow: hidden;
    width: 100%;
    margin-bottom: 1.5em;
    font-size: 9.5pt;
  }
  table.meta-table tr { border-bottom: 1px solid #e2e8f0; }
  table.meta-table tr:last-child { border-bottom: none; }
  table.meta-table td:first-child {
    background: #f8fafc;
    border-right: 1px solid #e2e8f0;
    font-weight: 700;
    color: #475569;
    padding: 7px 14px;
    width: 200px;
    vertical-align: top;
  }
  table.meta-table td:last-child {
    padding: 7px 14px;
    color: #334155;
    vertical-align: top;
  }
  table.meta-table td { border-bottom: 1px solid #e2e8f0; }
  table.meta-table tr:last-child td { border-bottom: none; }

  /* ── Regular tables ── */
  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 1em;
    font-size: 9.5pt;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    overflow: hidden;
  }
  thead tr { background: #0f172a; color: #fff; }
  th { padding: 8px 13px; text-align: left; font-size: 8pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
  td { padding: 7px 13px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  tbody tr:last-child td { border-bottom: none; }

  /* ── Paragraphs ── */
  p { margin-top: 0; margin-bottom: 0.8em; }
  strong { font-weight: 700; color: #0f172a; }

  /* ── Inline code ── */
  code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 83%;
    background: #f1f5f9;
    color: #7c3aed;
    padding: 0.15em 0.4em;
    border-radius: 3px;
  }

  /* ── Code blocks ── */
  pre {
    background: #0f172a;
    border-radius: 8px;
    padding: 16px 18px;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 83%;
    line-height: 1.6;
    color: #94a3b8;
    margin-bottom: 1em;
    overflow: auto;
  }
  pre code { background: transparent; color: inherit; padding: 0; font-size: 100%; border: none; }

  /* ── Blockquotes ── */
  blockquote {
    border-left: 4px solid #e2e8f0;
    padding: 0.3em 1em;
    margin: 0 0 0.8em;
    color: #64748b;
    font-style: italic;
  }

  ul, ol { padding-left: 1.8em; margin-bottom: 0.8em; }
  li { margin-bottom: 0.3em; }

  hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5em 0; }
  img { max-width: 100%; }

  a { color: #2563eb; text-decoration: none; }

  @media print {
    body { max-width: 100%; }
    pre { white-space: pre-wrap; word-break: break-word; }
  }
</style>
</head>
<body>
${bodyHtml}
<script>
(function () {
  // 1. Mark the first headerless two-column table as the metadata table
  var tables = document.querySelectorAll('table');
  for (var i = 0; i < tables.length; i++) {
    var t = tables[i];
    if (!t.querySelector('thead') && t.querySelector('tr')) {
      var firstRowCells = t.querySelectorAll('tr:first-child td, tr:first-child th');
      if (firstRowCells.length === 2) {
        t.classList.add('meta-table');
        break;
      }
    }
  }

  // 2. Wrap RC-N headings + following content in callout divs
  var headings = document.querySelectorAll('h3');
  headings.forEach(function (h) {
    var text = h.textContent || '';
    var rcMatch = text.match(/^RC-\d+/i);
    if (!rcMatch) return;

    var severityClass = 'rc-callout-low';
    var lc = text.toLowerCase();
    if (lc.includes('high') || lc.includes('critical')) {
      severityClass = 'rc-callout-high';
    } else if (lc.includes('medium') || lc.includes('contributing')) {
      severityClass = 'rc-callout-medium';
    }

    // Collect following siblings until the next heading or hr
    var siblings = [];
    var node = h.nextSibling;
    while (node) {
      var next = node.nextSibling;
      var tag = node.nodeName ? node.nodeName.toLowerCase() : '';
      if (/^h[1-6]$/.test(tag) || tag === 'hr') break;
      siblings.push(node);
      node = next;
    }

    // Wrap in callout div
    var div = document.createElement('div');
    div.className = 'rc-callout ' + severityClass;
    h.parentNode.insertBefore(div, h);
    div.appendChild(h);
    siblings.forEach(function (s) { div.appendChild(s); });
  });
})();
</script>
</body>
</html>`;
}
