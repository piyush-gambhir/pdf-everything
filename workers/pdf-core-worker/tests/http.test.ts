import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCoreWorkerServer } from '../http/server.js';
import { makePdf, pageCount } from './fixtures.js';

describe('pdf-core-worker HTTP boundary', () => {
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    server = await createCoreWorkerServer({ port: 0, apiToken: 'test-token' });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP server address.');
    origin = `http://127.0.0.1:${address.port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('reports every operation', async () => {
    const response = await fetch(`${origin}/health`);
    const body = (await response.json()) as { operations: string[] };
    expect(response.status).toBe(200);
    expect(body.operations).toContain('merge');
    expect(body.operations).toContain('forms-extract');
    expect(body.operations).toHaveLength(17);
  });

  it('protects execution routes', async () => {
    const response = await fetch(`${origin}/v1/execute/merge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ files: [] }),
    });
    expect(response.status).toBe(401);
  });

  it('executes PDF operations behind the internal protocol', async () => {
    const first = await makePdf(1, 'A');
    const second = await makePdf(2, 'B');
    const response = await fetch(`${origin}/v1/execute/merge`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        files: [first.toString('base64'), second.toString('base64')],
        options: {},
      }),
    });
    const result = (await response.json()) as { kind: string; data: string };
    expect(response.status).toBe(200);
    expect(result.kind).toBe('pdf');
    expect(await pageCount(Buffer.from(result.data, 'base64'))).toBe(3);
  });

  it('returns worker-domain errors without exposing a gateway stack', async () => {
    const response = await fetch(`${origin}/v1/execute/merge`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ files: [], options: {} }),
    });
    const body = (await response.json()) as { error: string };
    expect(response.status).toBe(422);
    expect(body.error).toBe('EMPTY_INPUT');
  });
});
