import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  RenderLimitError,
  countPdfPages,
  renderHtmlToPdf,
  resolveChromiumPath,
} from '../../core/html.js';
import { createHttpServer } from '../../deploy/docker/http.js';

const chromium = process.env.RUN_BROWSER_INTEGRATION === '1' ? resolveChromiumPath() : null;

function getServerOrigin(server: Server): string {
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Server is not listening.');
  }
  return `http://127.0.0.1:${address.port}`;
}

async function expectPdf(response: Response) {
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('application/pdf');
  const pdf = Buffer.from(await response.arrayBuffer());
  expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  expect(pdf.length).toBeGreaterThan(100);
}

describe.skipIf(!chromium)('integration: real Chromium rendering', () => {
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    server = await createHttpServer({ port: 0, apiToken: null });
    origin = getServerOrigin(server);
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('renders HTML', async () => {
    const response = await fetch(`${origin}/v1/render/html`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: '<!DOCTYPE html><html><body><h1>HTML integration test</h1></body></html>',
      }),
    });
    await expectPdf(response);
  }, 30_000);

  it('renders Markdown through the shared HTML renderer', async () => {
    const response = await fetch(`${origin}/v1/render/markdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        markdown: '# Markdown integration test\n\nRendered through the shared browser core.',
      }),
    });
    await expectPdf(response);
  }, 30_000);
});

const pageBreaks = (count: number) =>
  Array.from(
    { length: count },
    (_, i) => `<div style="break-before:page">page ${i + 2}</div>`,
  ).join('');

describe.skipIf(!chromium)('integration: the renderer is sealed', () => {
  let probe: Server;
  let probeOrigin: string;
  const hits: string[] = [];

  beforeAll(async () => {
    probe = createServer((req, res) => {
      hits.push(req.url ?? '');
      res.end('reached');
    });
    await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
    probeOrigin = getServerOrigin(probe);
  });

  afterAll(() => new Promise<void>((resolve) => probe.close(() => resolve())));

  it('fetches nothing, keeps the document through a refresh, and still loads data: URIs', async () => {
    const url = (path: string) => `${probeOrigin}/${path}`;
    const pdf = await renderHtmlToPdf(`<!doctype html><html><head>
      <link rel="stylesheet" href="${url('stylesheet')}">
      <link rel="preconnect" href="${url('preconnect')}">
      <link rel="prefetch" href="${url('prefetch')}">
      <style>@import url("${url('import')}");
        @font-face { font-family: Remote; src: url("${url('font')}"); }
        body { font-family: Remote; background: url("${url('background')}"); }</style>
      <meta http-equiv="refresh" content="0;url=${url('refresh')}">
      <script src="${url('script')}"></script>
      </head><body><p>page 1</p>
      <img src="${url('image')}"><iframe src="${url('frame')}"></iframe>
      <object data="${url('object')}"></object>
      <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==">
      ${pageBreaks(2)}</body></html>`);
    // Give a stray connection time to land before checking.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(hits).toEqual([]);
    // The refresh did not replace the document with an error page.
    expect(countPdfPages(pdf)).toBe(3);
    expect(pdf.toString('latin1')).toContain('/Subtype /Image');
  }, 30_000);

  it('does not run page scripts, but runs trusted post-processing', async () => {
    const html = `<!doctype html><body><p>page 1</p>
      <script>document.body.insertAdjacentHTML('beforeend', ${JSON.stringify(pageBreaks(4))});</script></body>`;
    expect(countPdfPages(await renderHtmlToPdf(html))).toBe(1);

    const postProcessed = await renderHtmlToPdf(
      html,
      {},
      {
        postProcess: () => {
          const div = document.createElement('div');
          div.style.breakBefore = 'page';
          div.textContent = 'added by the template';
          document.body.append(div);
        },
      },
    );
    expect(countPdfPages(postProcessed)).toBe(2);
  }, 30_000);

  it('enforces the page, size and time limits', async () => {
    const fivePages = `<!doctype html><body><p>page 1</p>${pageBreaks(4)}</body>`;
    await expect(renderHtmlToPdf(fivePages, {}, { limits: { maxPages: 4 } })).rejects.toMatchObject(
      { code: 'page_limit_exceeded' },
    );
    expect(countPdfPages(await renderHtmlToPdf(fivePages, {}, { limits: { maxPages: 5 } }))).toBe(
      5,
    );

    await expect(
      renderHtmlToPdf('<p>x</p>', {}, { limits: { maxOutputBytes: 100 } }),
    ).rejects.toMatchObject({ code: 'output_too_large' });

    const late = renderHtmlToPdf('<p>x</p>', {}, { limits: { deadlineMs: 5 } });
    await expect(late).rejects.toBeInstanceOf(RenderLimitError);
    await expect(late).rejects.toMatchObject({ code: 'render_timeout' });
  }, 60_000);
});
