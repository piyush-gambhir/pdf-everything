import { type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHttpServer } from '../../deploy/docker/http.js';

vi.mock('../../core/pdf.js', () => ({
  resolveChromiumPath: () => '/usr/bin/chromium',
  renderMarkdownToPdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 fake')),
}));

vi.mock('../../core/templates/index.js', () => ({
  TEMPLATE_NAMES: ['github', 'academic', 'rca'],
  isTemplateName: (s: string) => ['github', 'academic', 'rca'].includes(s),
}));

function getServerOrigin(server: Server): string {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Server is not listening.');
  return `http://127.0.0.1:${address.port}`;
}

async function request(
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

describe('HTTP server (no auth)', () => {
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    server = await createHttpServer({ port: 0, apiToken: null });
    origin = getServerOrigin(server);
  });

  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it('GET /health returns 200', async () => {
    const res = await request(origin, '/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', service: 'markdown-to-pdf' });
  });

  it('GET /health ignores query string', async () => {
    const res = await request(origin, '/health?probe=1');
    expect(res.status).toBe(200);
  });

  it('GET / returns 200 (alias for health)', async () => {
    const res = await request(origin, '/');
    expect(res.status).toBe(200);
  });

  it('GET /ready returns 200 when chromium found', async () => {
    const res = await request(origin, '/ready');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ready' });
  });

  it('GET /v1/templates returns all template names', async () => {
    const res = await request(origin, '/v1/templates');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ templates: ['github', 'academic', 'rca'] });
  });

  it('GET /unknown returns 404', async () => {
    const res = await request(origin, '/unknown');
    expect(res.status).toBe(404);
  });

  it('POST /v1/render with non-JSON body returns 400', async () => {
    const res = await request(origin, '/v1/render', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'text/plain' },
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('bad_request');
  });

  it('POST /v1/render with missing markdown field returns 400', async () => {
    const res = await request(origin, '/v1/render', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('bad_request');
    expect(body.message).toMatch(/markdown/);
  });

  it('POST /v1/render with empty markdown returns 400', async () => {
    const res = await request(origin, '/v1/render', {
      method: 'POST',
      body: JSON.stringify({ markdown: '' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });

  it('POST /v1/render with unknown template returns 400', async () => {
    const res = await request(origin, '/v1/render', {
      method: 'POST',
      body: JSON.stringify({ markdown: '# Hello', options: { template: 'corporate' } }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('bad_request');
    expect(body.message).toMatch(/corporate/);
  });

  it('POST /v1/render with valid markdown returns PDF', async () => {
    const res = await request(origin, '/v1/render', {
      method: 'POST',
      body: JSON.stringify({ markdown: '# Hello\n\nWorld.' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.toString('utf8', 0, 4)).toBe('%PDF');
  });

  it('POST /v1/render with explicit template passes through', async () => {
    const res = await request(origin, '/v1/render', {
      method: 'POST',
      body: JSON.stringify({ markdown: '# RCA', options: { template: 'rca' } }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(200);
  });
});

describe('HTTP server (with auth)', () => {
  let server: Server;
  let origin: string;
  const token = 'test-secret-token';

  beforeAll(async () => {
    server = await createHttpServer({ port: 0, apiToken: token });
    origin = getServerOrigin(server);
  });

  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it('POST /v1/render without token returns 401', async () => {
    const res = await request(origin, '/v1/render', {
      method: 'POST',
      body: JSON.stringify({ markdown: '# Hello' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(401);
  });

  it('POST /v1/render with wrong token returns 401', async () => {
    const res = await request(origin, '/v1/render', {
      method: 'POST',
      body: JSON.stringify({ markdown: '# Hello' }),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong-token' },
    });
    expect(res.status).toBe(401);
  });

  it('POST /v1/render with correct token returns 200', async () => {
    const res = await request(origin, '/v1/render', {
      method: 'POST',
      body: JSON.stringify({ markdown: '# Hello' }),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
  });

  it('GET /health does not require auth', async () => {
    const res = await request(origin, '/health');
    expect(res.status).toBe(200);
  });

  it('GET /v1/templates does not require auth', async () => {
    const res = await request(origin, '/v1/templates');
    expect(res.status).toBe(200);
  });
});
