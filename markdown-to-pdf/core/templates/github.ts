export function githubTemplate(bodyHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #24292e;
    max-width: 860px;
    margin: 0 auto;
  }
  h1, h2, h3, h4, h5, h6 {
    margin-top: 1.4em;
    margin-bottom: 0.5em;
    font-weight: 600;
    line-height: 1.25;
  }
  h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
  h3 { font-size: 1.25em; }
  p { margin-top: 0; margin-bottom: 1em; }
  a { color: #0366d6; text-decoration: none; }
  code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 85%;
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    padding: 0.2em 0.4em;
    border-radius: 4px;
    color: #953800;
  }
  pre {
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    padding: 16px;
    overflow: auto;
    font-size: 85%;
    line-height: 1.45;
    margin-bottom: 1em;
  }
  pre code { background: transparent; border: none; padding: 0; color: #24292e; font-size: 100%; }
  blockquote {
    margin: 0 0 1em;
    padding: 0 1em;
    color: #6a737d;
    border-left: 0.25em solid #dfe2e5;
  }
  table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
  th, td { padding: 6px 13px; border: 1px solid #dfe2e5; }
  th { background: #f6f8fa; font-weight: 600; }
  tr:nth-child(even) td { background: #f6f8fa; }
  ul, ol { padding-left: 2em; margin-bottom: 1em; }
  li { margin-bottom: 0.25em; }
  img { max-width: 100%; }
  hr { border: none; border-top: 1px solid #eaecef; margin: 1.5em 0; }
  @media print { body { max-width: 100%; } pre { white-space: pre-wrap; word-break: break-word; } }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
