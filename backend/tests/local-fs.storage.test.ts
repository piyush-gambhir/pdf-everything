import { mkdtemp, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalFsStorage } from '../src/files/storage/local-fs.storage.js';

describe('local file retention', () => {
  let root: string;
  let storage: LocalFsStorage;
  const input = {
    buffer: Buffer.from('shared PDF bytes'),
    originalName: 'input.pdf',
    mime: 'application/pdf',
  };

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'pdf-everything-storage-'));
    storage = new LocalFsStorage(root, 1);
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-09-05T12:00:00Z'));
  });

  afterEach(async () => {
    await storage?.onModuleDestroy();
    vi.useRealTimers();
    if (root) await rm(root, { recursive: true, force: true });
  });

  it('stops serving content and metadata exactly at expiry, before the next cleanup', async () => {
    const file = await storage.put(input);
    expect((await storage.get(file.id))?.buffer).toEqual(input.buffer);
    vi.setSystemTime(new Date(file.expiresAt));
    expect(await storage.get(file.id)).toBeNull();
    expect(await storage.meta(file.id)).toBeNull();
  });

  it('keeps shared bytes until the final file reference expires', async () => {
    const first = await storage.put(input);
    vi.setSystemTime(new Date('2026-09-05T12:30:00Z'));
    const second = await storage.put(input);
    vi.setSystemTime(new Date(first.expiresAt));
    expect(await storage.cleanupExpired()).toBe(1);
    expect((await storage.get(second.id))?.buffer).toEqual(input.buffer);
    vi.setSystemTime(new Date(second.expiresAt));
    expect(await storage.cleanupExpired()).toBe(1);
    await expect(access(join(root, first.sha256.slice(0, 2), first.sha256))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('removes expired files during startup and periodic maintenance', async () => {
    const first = await storage.put(input);
    vi.setSystemTime(new Date(first.expiresAt));
    await storage.onModuleInit();
    expect(await storage.delete(first.id)).toBe(false);
    const second = await storage.put(input);
    vi.setSystemTime(new Date(second.expiresAt));
    await vi.advanceTimersByTimeAsync(60_000);
    await storage.onModuleDestroy();
    storage = new LocalFsStorage(root, 1);
    expect(await storage.delete(second.id)).toBe(false);
  });

  it('preserves a concurrent upload when deleting the last reference to the same bytes', async () => {
    const first = await storage.put(input);
    const [, replacement] = await Promise.all([storage.delete(first.id), storage.put(input)]);
    expect((await storage.get(replacement.id))?.buffer).toEqual(input.buffer);
  });
});
