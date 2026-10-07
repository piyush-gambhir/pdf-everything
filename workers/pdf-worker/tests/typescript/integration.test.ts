import { execFileSync } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  RenderLimitError,
  countPdfPages,
  prepareBrowser,
  renderHtmlToPdf,
  resolveChromiumPath,
  shutdownBrowser,
  type RenderTimings,
} from '../../core/html.js';
import { createHttpServer } from '../../deploy/docker/http.js';

const chromium = process.env.RUN_BROWSER_INTEGRATION === '1' ? resolveChromiumPath() : null;

// The renderer keeps one browser for the whole file.
afterAll(() => shutdownBrowser());

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

/** The browser process this test process started, if one is running. */
function browserPid(): number | undefined {
  const rows = execFileSync('ps', ['-A', '-o', 'pid=,ppid=,stat='], { encoding: 'utf8' });
  for (const row of rows.trim().split('\n')) {
    const [pid, ppid, stat] = row.trim().split(/\s+/);
    if (Number(ppid) === process.pid && !stat?.startsWith('Z')) return Number(pid);
  }
  return undefined;
}

async function until(condition: () => boolean): Promise<void> {
  for (let i = 0; i < 100 && !condition(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  expect(condition()).toBe(true);
}

describe.skipIf(!chromium)('integration: one browser serves every render', () => {
  it('reuses the browser, and starts a new one after it dies', async () => {
    await prepareBrowser();
    const first = browserPid();
    expect(first).toBeDefined();
    expect(countPdfPages(await renderHtmlToPdf('<p>one</p>'))).toBe(1);
    expect(countPdfPages(await renderHtmlToPdf('<p>two</p>'))).toBe(1);
    expect(browserPid()).toBe(first);

    // Kill Chromium's whole process group, as a crash or the OOM killer would.
    process.kill(-first!, 'SIGKILL');
    await until(() => browserPid() !== first);
    expect(countPdfPages(await renderHtmlToPdf('<p>three</p>'))).toBe(1);
    expect(browserPid()).not.toBe(first);
  }, 60_000);

  it('a render past its deadline leaves the browser working for the next', async () => {
    await prepareBrowser();
    const before = browserPid();
    const rows = '<tr><td>row</td><td>cell</td><td>cell</td></tr>'.repeat(20_000);
    const heavy = `<!doctype html><table>${rows}</table>`;
    await expect(renderHtmlToPdf(heavy, {}, { limits: { deadlineMs: 300 } })).rejects.toMatchObject(
      { code: 'render_timeout' },
    );
    expect(countPdfPages(await renderHtmlToPdf('<p>after</p>'))).toBe(1);
    expect(browserPid()).toBe(before);
  }, 60_000);
});

describe.skipIf(!chromium)('integration: render timings', () => {
  it('reports every step of a render, and never the document', async () => {
    const reports: RenderTimings[] = [];
    const pdf = await renderHtmlToPdf(
      '<!doctype html><body><p>Passenger: Ada Lovelace</p></body>',
      {},
      { onTimings: (timings) => reports.push(timings) },
    );
    expect(reports).toHaveLength(1);
    const [timings] = reports;
    expect(timings).toMatchObject({ outcome: 'ok', pages: 1, bytes: pdf.length });
    for (const step of ['browser', 'newPage', 'setContent', 'pdf', 'validate', 'close', 'total'])
      expect(timings?.ms).toHaveProperty(step, expect.any(Number));
    expect(timings?.failedIn).toBeUndefined();
    expect(JSON.stringify(timings)).not.toContain('Lovelace');
  }, 30_000);

  it('names the step a render ran out of time in', async () => {
    const reports: RenderTimings[] = [];
    const rows = '<tr><td>row</td><td>cell</td></tr>'.repeat(20_000);
    await expect(
      renderHtmlToPdf(
        `<!doctype html><table>${rows}</table>`,
        {},
        {
          limits: { deadlineMs: 300 },
          onTimings: (timings) => reports.push(timings),
        },
      ),
    ).rejects.toMatchObject({ code: 'render_timeout' });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ outcome: 'render_timeout' });
    expect(['browser', 'newPage', 'setContent', 'pdf']).toContain(reports[0]?.failedIn);
  }, 30_000);

  it('logs one line per HTTP render when the server is asked to', async () => {
    const server = await createHttpServer({ port: 0, apiToken: null, logRenderTimings: true });
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const response = await fetch(`${getServerOrigin(server)}/v1/render/markdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: '# Ada Lovelace', options: { template: 'rca' } }),
      });
      expect(response.status).toBe(200);
      const lines = log.mock.calls.map(([line]) => JSON.parse(String(line)));
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({
        level: 'info',
        msg: 'render',
        route: 'markdown',
        outcome: 'ok',
      });
      expect(lines[0].ms).toHaveProperty('postProcess', expect.any(Number));
      expect(JSON.stringify(lines[0])).not.toContain('Lovelace');
    } finally {
      log.mockRestore();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }, 30_000);
});
