import { type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolveChromiumPath } from '../../core/html.js';
import { createHttpServer } from '../../deploy/docker/http.js';

const chromium = resolveChromiumPath();

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
