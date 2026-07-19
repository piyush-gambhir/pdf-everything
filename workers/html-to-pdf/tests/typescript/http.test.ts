import { type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHttpServer } from '../../deploy/docker/http.js';

// Mock renderHtmlToPdf so tests don't need Chromium
vi.mock('../../core/pdf.js', () => ({
  resolveChromiumPath: () => '/usr/bin/chromium',
  renderHtmlToPdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 fake')),
}));

function getServerOrigin(server: Server): string {
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Server is not listening.');
  }
  return `http://127.0.0.1:${address.port}`;
}

async function request(
  origin: string,
  path: string,
  opts: { method?: string; body?: string; headers?: Record<string, string> } = {},
) {
  const res = await fetch(`${origin}${path}`, {
    method: opts.method ?? 'GET',
    body: opts.body,
    headers: opts.headers,
  });
  return res;
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
    const body = await res.json();
    expect(body).toEqual({ status: 'ok', service: 'html-to-pdf' });
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
    const body = await res.json();
    expect(body).toEqual({ status: 'ready' });
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
    const body = await res.json();
    expect(body.error).toBe('bad_request');
  });

  it('POST /v1/render with missing html field returns 400', async () => {
    const res = await request(origin, '/v1/render', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('bad_request');
  });

  it('POST /v1/render with empty html returns 400', async () => {
    const res = await request(origin, '/v1/render', {
      method: 'POST',
      body: JSON.stringify({ html: '' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });

  it('POST /v1/render with valid html returns 200 + PDF', async () => {
    const res = await request(origin, '/v1/render?trace=1', {
      method: 'POST',
      body: JSON.stringify({ html: '<h1>Hello</h1>' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.toString('utf8')).toContain('%PDF');
  });
});

describe('HTTP server (with auth)', () => {
  let server: Server;
  let origin: string;
  const TOKEN = 'test-secret-token';

  beforeAll(async () => {
    server = await createHttpServer({ port: 0, apiToken: TOKEN });
    origin = getServerOrigin(server);
  });

  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  function authRequest(
    path: string,
    opts: { method?: string; body?: string; headers?: Record<string, string> } = {},
  ) {
    return fetch(`${origin}${path}`, {
      method: opts.method ?? 'GET',
      body: opts.body,
      headers: opts.headers,
    });
  }

  it('POST /v1/render without token returns 401', async () => {
    const res = await authRequest('/v1/render', {
      method: 'POST',
      body: JSON.stringify({ html: '<h1>Hi</h1>' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(401);
  });

  it('POST /v1/render with wrong token returns 401', async () => {
    const res = await authRequest('/v1/render', {
      method: 'POST',
      body: JSON.stringify({ html: '<h1>Hi</h1>' }),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong' },
    });
    expect(res.status).toBe(401);
  });

  it('POST /v1/render with correct token returns 200', async () => {
    const res = await authRequest('/v1/render', {
      method: 'POST',
      body: JSON.stringify({ html: '<h1>Hi</h1>' }),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
  });

  it('health endpoint does not require auth', async () => {
    const res = await authRequest('/health');
    expect(res.status).toBe(200);
  });
});
