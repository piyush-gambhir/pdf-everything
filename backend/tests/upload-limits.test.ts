import 'reflect-metadata';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { mkdtempSync, rmSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// A render worker that answers every render with a PDF and records the body.
const rendered: unknown[] = [];
const worker = createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    rendered.push(JSON.parse(body));
    res.writeHead(200, { 'content-type': 'application/pdf' }).end('%PDF-1.4');
  });
});
await new Promise<void>((resolve) => worker.listen(0, '127.0.0.1', resolve));

// Read when the modules load: one MiB uploads, a throwaway file store, the worker.
const storage = mkdtempSync(join(tmpdir(), 'pdf-everything-uploads-'));
process.env.MAX_UPLOAD_MB = '1';
process.env.STORAGE_DIR = storage;
process.env.PDF_RENDER_WORKER_URL = `http://127.0.0.1:${(worker.address() as AddressInfo).port}`;

const { NestFactory } = await import('@nestjs/core');
const { AppModule } = await import('../src/app.module.js');
const { AllExceptionsFilter } = await import('../src/common/filters/all-exceptions.filter.js');

function form(fields: Record<string, string | Blob>): FormData {
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) body.append(name, value);
  return body;
}

describe('gateway upload limits', () => {
  let app: NestExpressApplication;
  let origin: string;

  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: false,
      bodyParser: false,
    });
    app.useBodyParser('json', { limit: '8mb' });
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.listen(0, '127.0.0.1');
    origin = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await app.close();
    await new Promise((resolve) => worker.close(resolve));
    rmSync(storage, { recursive: true, force: true });
  });

  it('stores an upload within the limit', async () => {
    const response = await fetch(`${origin}/v1/files`, {
      method: 'POST',
      body: form({ file: new Blob([new Uint8Array(512 * 1024)]) }),
    });
    expect(response.status).toBe(201);
    expect((await response.json()).size).toBe(512 * 1024);
  });

  it('refuses a larger upload by its declared length, as a problem', async () => {
    const response = await fetch(`${origin}/v1/files`, {
      method: 'POST',
      body: form({ file: new Blob([new Uint8Array(1024 * 1024 + 1)]) }),
    });
    expect(response.status).toBe(413);
    expect(response.headers.get('content-type')).toMatch(/application\/problem\+json/);
    expect((await response.json()).detail).toBe('Uploads are limited to 1 MB.');
  });

  it('refuses a multipart upload that does not declare its length', async () => {
    const encoded = new Response(form({ file: new Blob(['x']) }));
    const response = await fetch(`${origin}/v1/files`, {
      method: 'POST',
      headers: { 'content-type': encoded.headers.get('content-type')! },
      body: encoded.body,
      duplex: 'half',
    } as RequestInit);
    expect(response.status).toBe(411);
  });

  it('refuses a file on a render route, and still reads its options field', async () => {
    const withFile = await fetch(`${origin}/v1/render/html`, {
      method: 'POST',
      body: form({ options: '{"html":"<p>x</p>"}', file: new Blob(['x']) }),
    });
    expect(withFile.status).toBe(400);
    expect(rendered).toEqual([]);

    const response = await fetch(`${origin}/v1/render/html`, {
      method: 'POST',
      body: form({ options: '{"html":"<p>x</p>"}' }),
    });
    expect(response.status).toBe(200);
    expect(rendered).toMatchObject([{ html: '<p>x</p>' }]);
  });
});
