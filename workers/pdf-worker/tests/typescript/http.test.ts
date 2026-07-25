import { type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHttpServer } from '../../deploy/docker/http.js';

vi.mock('../../core/html.js', () => ({
  resolveChromiumPath: () => '/usr/bin/chromium',
  renderHtmlToPdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 html')),
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

  it('reports readiness when Chromium is available', async () => {
    const res = await request(origin, '/ready');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ready' });
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

  it('keeps the legacy route for HTML requests', async () => {
    const res = await request(origin, '/v1/render', {
      method: 'POST',
      body: JSON.stringify({ html: '<p>Legacy</p>' }),
      headers: jsonHeaders,
    });
    expect(res.status).toBe(200);
  });

  it('keeps the legacy route for Markdown requests', async () => {
    const res = await request(origin, '/v1/render', {
      method: 'POST',
      body: JSON.stringify({ markdown: 'Legacy' }),
      headers: jsonHeaders,
    });
    expect(res.status).toBe(200);
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
    const res = await request(origin, '/v1/render', {
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
    const res = await request(origin, '/v1/render', {
      method: 'POST',
      body: 'not-json',
      headers: jsonHeaders,
    });
    expect(res.status).toBe(400);
  });

  it('rejects a non-object JSON body', async () => {
    const res = await request(origin, '/v1/render', {
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
