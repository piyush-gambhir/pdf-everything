export function academicTemplate(bodyHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body {
    font-family: "Georgia", "Times New Roman", Times, serif;
    font-size: 11pt;
    line-height: 1.75;
    color: #111;
    max-width: 740px;
    margin: 0 auto;
  }

  /* Title — centered, large, bottom border */
  h1 {
    font-size: 1.75em;
    font-weight: bold;
    text-align: center;
    border-bottom: 2px solid #222;
    padding-bottom: 0.5em;
    margin-top: 0;
    margin-bottom: 0.6em;
    line-height: 1.25;
    letter-spacing: -0.01em;
  }

  h2 {
    font-size: 1.05em;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    border-bottom: 1px solid #ccc;
    padding-bottom: 0.2em;
    margin-top: 1.8em;
    margin-bottom: 0.5em;
  }

  h3 {
    font-size: 1em;
    font-weight: bold;
    font-style: italic;
    margin-top: 1.2em;
    margin-bottom: 0.3em;
  }

  h4, h5, h6 {
    font-size: 0.95em;
    font-weight: bold;
    margin-top: 1em;
    margin-bottom: 0.3em;
  }

  p { margin-top: 0; margin-bottom: 0.8em; text-align: justify; }

  a { color: #1a0dab; text-decoration: underline; }

  code {
    font-family: "Courier New", Courier, monospace;
    font-size: 85%;
    background: #f4f4f4;
    padding: 0.15em 0.35em;
    border-radius: 2px;
  }

  pre {
    background: #f4f4f4;
    border: 1px solid #ccc;
    border-left: 3px solid #555;
    border-radius: 2px;
    padding: 12px 16px;
    font-family: "Courier New", Courier, monospace;
    font-size: 85%;
    line-height: 1.5;
    margin-bottom: 1em;
    overflow: auto;
  }
  pre code { background: transparent; padding: 0; font-size: 100%; border: none; }

  blockquote {
    border-left: 3px solid #999;
    padding: 0.3em 1em;
    margin: 0 0 0.8em;
    color: #555;
    font-style: italic;
  }

  /* Tables — minimal academic style: top/bottom rule only */
  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 1em;
    font-size: 0.9em;
  }
  thead tr { border-top: 2px solid #333; border-bottom: 1px solid #333; }
  th { padding: 5px 10px; font-weight: bold; text-align: left; }
  td { padding: 5px 10px; border-bottom: 1px dotted #bbb; }
  tbody tr:last-child td { border-bottom: 2px solid #333; }

  ul, ol { padding-left: 1.8em; margin-bottom: 0.8em; }
  li { margin-bottom: 0.2em; }

  hr {
    border: none;
    border-top: 1px solid #999;
    margin: 1.5em 0;
  }

  img { max-width: 100%; display: block; margin: 0.5em auto; }

  @media print {
    body { max-width: 100%; }
    pre { white-space: pre-wrap; word-break: break-word; }
  }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
