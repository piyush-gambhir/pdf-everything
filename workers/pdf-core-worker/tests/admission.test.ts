import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { executeOperation } from '../http/dispatch.js';
import { createCoreWorkerServer } from '../http/server.js';

vi.mock('../http/dispatch.js', () => ({
  executeOperation: vi.fn(async () => ({ kind: 'json', value: 'done' })),
}));

describe('pdf-core-worker admission', () => {
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    server = await createCoreWorkerServer({ port: 0, apiToken: null, maxActiveOperations: 1 });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP server address.');
    origin = `http://127.0.0.1:${address.port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const execute = () =>
    fetch(`${origin}/v1/execute/merge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ files: [], options: {} }),
    });

  it('refuses an operation past the cap with 503, and takes the next once the slot frees', async () => {
    let finish: ((result: { kind: 'json'; value: unknown }) => void) | undefined;
    vi.mocked(executeOperation).mockImplementationOnce(
      () => new Promise((resolve) => (finish = resolve)),
    );
    const first = execute();
    await vi.waitFor(() => expect(finish).toBeDefined());

    const refused = await execute();
    expect(refused.status).toBe(503);
    expect(refused.headers.get('retry-after')).toBe('1');
    expect(await refused.json()).toMatchObject({ error: 'worker_busy' });

    finish!({ kind: 'json', value: 'first' });
    expect((await first).status).toBe(200);
    expect((await execute()).status).toBe(200);
  });

  it('frees the slot when an operation fails', async () => {
    vi.mocked(executeOperation).mockRejectedValueOnce(new Error('broken'));
    expect((await execute()).status).toBe(500);
    expect((await execute()).status).toBe(200);
  });
});
