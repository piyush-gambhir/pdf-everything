import { type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { RenderLimitError, prepareBrowser, renderHtmlToPdf } from '../../core/html.js';
import { renderMarkdownToPdf } from '../../core/markdown.js';
import { createHttpServer } from '../../deploy/docker/http.js';

vi.mock('../../core/html.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../core/html.js')>()),
  resolveChromiumPath: () => '/usr/bin/chromium',
  prepareBrowser: vi.fn().mockResolvedValue(undefined),
  renderHtmlToPdf: vi
    .fn()
    .mockResolvedValue(
      Buffer.from('%PDF-1.4 html\n<< /Type /Page >>\n<< /Type /Pages /Count 1 >>'),
    ),
}));

vi.mock('../../core/markdown.js', () => ({
  renderMarkdownToPdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 markdown')),
}));

function getServerOrigin(server: Server): string {
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Server is not listening.');
  }
  return `http://127.0.0.1:${address.port}`;
}

function request(
  origin: string,
  path: string,
  opts: { method?: string; body?: string; headers?: Record<string, string> } = {},
) {
  return fetch(`${origin}${path}`, {
    method: opts.method ?? 'GET',
    body: opts.body,
    headers: opts.headers,
  });
}

const jsonHeaders = { 'Content-Type': 'application/json' };

describe('HTTP server without authentication', () => {
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    server = await createHttpServer({ port: 0, apiToken: null, maxRequestBytes: 256 });
    origin = getServerOrigin(server);
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('reports both supported operations', async () => {
    const res = await request(origin, '/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: 'ok',
      service: 'pdf-worker',
      operations: ['html-to-pdf', 'markdown-to-pdf'],
    });
  });

  it('treats / as a health alias', async () => {
    expect((await request(origin, '/')).status).toBe(200);
  });

  it('ignores health query parameters', async () => {
    expect((await request(origin, '/health?probe=1')).status).toBe(200);
  });

  it('reports readiness once the shared browser is up', async () => {
    const res = await request(origin, '/ready');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ready' });
    expect(prepareBrowser).toHaveBeenCalled();
  });

  it('is not ready while Chromium fails to start', async () => {
    vi.mocked(prepareBrowser).mockRejectedValueOnce(new Error('Chromium exited.'));
    const res = await request(origin, '/ready');
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: 'not_ready', message: 'Chromium exited.' });
  });

  it('lists Markdown templates', async () => {
    const res = await request(origin, '/v1/templates');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ templates: ['github', 'academic', 'rca'] });
  });

  it('renders HTML through the explicit route', async () => {
    const res = await request(origin, '/v1/render/html', {
      method: 'POST',
      body: JSON.stringify({ html: '<h1>Hello</h1>' }),
      headers: jsonHeaders,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(Buffer.from(await res.arrayBuffer()).toString()).toContain('html');
  });

  it('renders Markdown through the explicit route', async () => {
    const res = await request(origin, '/v1/render/markdown', {
      method: 'POST',
      body: JSON.stringify({ markdown: '# Hello', options: { template: 'rca' } }),
      headers: jsonHeaders,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(Buffer.from(await res.arrayBuffer()).toString()).toContain('markdown');
  });

  it('does not expose a generic render route', async () => {
    const res = await request(origin, '/v1/render', {
      method: 'POST',
      body: JSON.stringify({ html: '<p>Hello</p>' }),
      headers: jsonHeaders,
    });
    expect(res.status).toBe(404);
  });

  it('rejects mismatched explicit route input', async () => {
    const res = await request(origin, '/v1/render/html', {
      method: 'POST',
      body: JSON.stringify({ markdown: '# Wrong route' }),
      headers: jsonHeaders,
    });
    expect(res.status).toBe(400);
  });

  it('rejects requests containing both input fields', async () => {
    const res = await request(origin, '/v1/render/html', {
      method: 'POST',
      body: JSON.stringify({ html: '<p>Both</p>', markdown: 'Both' }),
      headers: jsonHeaders,
    });
    expect(res.status).toBe(400);
  });

  it('rejects empty input', async () => {
    const res = await request(origin, '/v1/render/html', {
      method: 'POST',
      body: JSON.stringify({ html: '' }),
      headers: jsonHeaders,
    });
    expect(res.status).toBe(400);
  });

  it('rejects unknown Markdown templates', async () => {
    const res = await request(origin, '/v1/render/markdown', {
      method: 'POST',
      body: JSON.stringify({ markdown: '# Hello', options: { template: 'corporate' } }),
      headers: jsonHeaders,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/corporate/);
  });

  it('rejects invalid JSON', async () => {
    const res = await request(origin, '/v1/render/html', {
      method: 'POST',
      body: 'not-json',
      headers: jsonHeaders,
    });
    expect(res.status).toBe(400);
  });

  it('rejects a non-object JSON body', async () => {
    const res = await request(origin, '/v1/render/html', {
      method: 'POST',
      body: 'null',
      headers: jsonHeaders,
    });
    expect(res.status).toBe(400);
  });

  it('rejects non-object options', async () => {
    const res = await request(origin, '/v1/render/html', {
      method: 'POST',
      body: JSON.stringify({ html: '<p>Hello</p>', options: 'invalid' }),
      headers: jsonHeaders,
    });
    expect(res.status).toBe(400);
  });

  it('rejects request bodies over the configured limit', async () => {
    const res = await request(origin, '/v1/render/html', {
      method: 'POST',
      body: JSON.stringify({ html: 'x'.repeat(300) }),
      headers: jsonHeaders,
    });
    expect(res.status).toBe(413);
  });

  it('returns 404 for unknown routes', async () => {
    expect((await request(origin, '/unknown')).status).toBe(404);
  });
});

describe('HTTP render options', () => {
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    server = await createHttpServer({ port: 0, apiToken: null, limits: { maxPages: 7 } });
    origin = getServerOrigin(server);
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const renderHtml = (options: unknown) =>
    request(origin, '/v1/render/html', {
      method: 'POST',
      body: JSON.stringify({ html: '<p>Hello</p>', options }),
      headers: jsonHeaders,
    });

  it('passes only validated page settings and the operator limits to the renderer', async () => {
    const res = await renderHtml({
      format: 'Letter',
      printBackground: false,
      preferCssPageSize: true,
      margin: { top: '12mm', left: '0.5in' },
      navigationTimeoutMs: 30000,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('x-pdf-page-count')).toBe('1');
    expect(vi.mocked(renderHtmlToPdf)).toHaveBeenLastCalledWith(
      '<p>Hello</p>',
      {
        format: 'Letter',
        printBackground: false,
        preferCssPageSize: true,
        margin: { top: '12mm', left: '0.5in' },
        navigationTimeoutMs: 30000,
      },
      { limits: { maxPages: 7 } },
    );
  });

  it.each([
    [{ executablePath: '/bin/sh' }, /executablePath/],
    [{ args: ['--remote-debugging-port=9222'] }, /args/],
    [{ format: 'Tabloid' }, /format/],
    [{ margin: { top: 'calc(1px)' } }, /top/],
    [{ margin: { gutter: '1mm' } }, /gutter/],
    [{ printBackground: 'yes' }, /printBackground/],
    [{ navigationTimeoutMs: 999999 }, /navigationTimeoutMs/],
    [{ template: 'rca' }, /template/],
  ])('refuses %j on the HTML route', async (options, message) => {
    const calls = vi.mocked(renderHtmlToPdf).mock.calls.length;
    const res = await renderHtml(options);
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(message);
    expect(vi.mocked(renderHtmlToPdf).mock.calls.length).toBe(calls);
  });

  it('accepts template and title on the Markdown route, and nothing else', async () => {
    const ok = await request(origin, '/v1/render/markdown', {
      method: 'POST',
      body: JSON.stringify({ markdown: '# Hi', options: { template: 'rca', title: 'RCA' } }),
      headers: jsonHeaders,
    });
    expect(ok.status).toBe(200);
    expect(vi.mocked(renderMarkdownToPdf)).toHaveBeenLastCalledWith(
      '# Hi',
      { template: 'rca', title: 'RCA' },
      { limits: { maxPages: 7 } },
    );

    const refused = await request(origin, '/v1/render/markdown', {
      method: 'POST',
      body: JSON.stringify({ markdown: '# Hi', options: { executablePath: '/bin/sh' } }),
      headers: jsonHeaders,
    });
    expect(refused.status).toBe(400);
  });

  it.each([
    ['page_limit_exceeded', 422],
    ['output_too_large', 422],
    ['render_timeout', 504],
  ] as const)('answers a %s render with %i', async (code, status) => {
    vi.mocked(renderHtmlToPdf).mockRejectedValueOnce(new RenderLimitError(code, 'stopped'));
    const res = await renderHtml(undefined);
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ error: code, message: 'stopped' });
  });
});

describe('HTTP admission', () => {
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    server = await createHttpServer({ port: 0, apiToken: null, maxActiveRenders: 1 });
    origin = getServerOrigin(server);
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const renderHtml = () =>
    request(origin, '/v1/render/html', {
      method: 'POST',
      body: JSON.stringify({ html: '<p>Hello</p>' }),
      headers: jsonHeaders,
    });

  it('refuses a render past the cap with 503, and takes the next once the slot frees', async () => {
    let finish: ((pdf: Buffer) => void) | undefined;
    vi.mocked(renderHtmlToPdf).mockImplementationOnce(
      () => new Promise<Buffer>((resolve) => (finish = resolve)),
    );
    const first = renderHtml();
    await vi.waitFor(() => expect(finish).toBeDefined());

    const refused = await renderHtml();
    expect(refused.status).toBe(503);
    expect(refused.headers.get('retry-after')).toBe('1');
    expect(await refused.json()).toMatchObject({ error: 'worker_busy' });

    finish!(Buffer.from('%PDF-1.4 first'));
    expect((await first).status).toBe(200);
    expect((await renderHtml()).status).toBe(200);
  });

  it('never refuses renders sent one at a time, failed ones included', async () => {
    vi.mocked(renderHtmlToPdf).mockRejectedValueOnce(
      new RenderLimitError('render_timeout', 'late'),
    );
    expect((await renderHtml()).status).toBe(504);
    vi.mocked(renderHtmlToPdf).mockRejectedValueOnce(new Error('Chromium crashed.'));
    expect((await renderHtml()).status).toBe(500);
    for (let i = 0; i < 5; i++) expect((await renderHtml()).status).toBe(200);
  });
});

describe('HTTP render timing log', () => {
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    server = await createHttpServer({ port: 0, apiToken: null, logRenderTimings: true });
    origin = getServerOrigin(server);
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('writes one JSON line per render with the timings and sizes, not the document', async () => {
    vi.mocked(renderHtmlToPdf).mockImplementationOnce(async (_html, _options, runtime) => {
      runtime?.onTimings?.({
        outcome: 'ok',
        browser: 'warm',
        ms: { browser: 0, newPage: 9, setContent: 31, pdf: 180, validate: 1, close: 6, total: 228 },
        pages: 1,
        bytes: 4321,
      });
      return Buffer.from('%PDF-1.4');
    });
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const body = JSON.stringify({ html: '<p>Passenger: Ada Lovelace</p>' });
      const res = await request(origin, '/v1/render/html', {
        method: 'POST',
        body,
        headers: jsonHeaders,
      });
      expect(res.status).toBe(200);
      expect(log).toHaveBeenCalledOnce();
      const line = String(log.mock.calls[0]?.[0]);
      expect(JSON.parse(line)).toEqual({
        level: 'info',
        msg: 'render',
        route: 'html',
        outcome: 'ok',
        browser: 'warm',
        ms: { browser: 0, newPage: 9, setContent: 31, pdf: 180, validate: 1, close: 6, total: 228 },
        pages: 1,
        bytes: 4321,
        inputBytes: Buffer.byteLength(body),
      });
      expect(line).not.toContain('Lovelace');
    } finally {
      log.mockRestore();
    }
  });
});

describe('HTTP server with authentication', () => {
  let server: Server;
  let origin: string;
  const token = 'test-secret-token';

  beforeAll(async () => {
    server = await createHttpServer({ port: 0, apiToken: token });
    origin = getServerOrigin(server);
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('rejects a render request without a bearer token', async () => {
    const res = await request(origin, '/v1/render/html', {
      method: 'POST',
      body: JSON.stringify({ html: '<h1>Hello</h1>' }),
      headers: jsonHeaders,
    });
    expect(res.status).toBe(401);
  });

  it('rejects an incorrect bearer token', async () => {
    const res = await request(origin, '/v1/render/markdown', {
      method: 'POST',
      body: JSON.stringify({ markdown: '# Hello' }),
      headers: { ...jsonHeaders, Authorization: 'Bearer wrong' },
    });
    expect(res.status).toBe(401);
  });

  it('accepts a correct bearer token', async () => {
    const res = await request(origin, '/v1/render/markdown', {
      method: 'POST',
      body: JSON.stringify({ markdown: '# Hello' }),
      headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
  });

  it('does not protect health or template endpoints', async () => {
    expect((await request(origin, '/health')).status).toBe(200);
    expect((await request(origin, '/v1/templates')).status).toBe(200);
  });
});
