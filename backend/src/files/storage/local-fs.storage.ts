import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import type { FileMeta } from '@pdf-everything/types';
import type { StorageService } from './storage.service.js';

interface FileRow {
  id: string;
  sha256: string;
  size: number;
  mime: string;
  original_name: string;
  created_at: string;
  expires_at: string;
  path: string;
}

export class LocalFsStorage implements StorageService, OnModuleInit, OnModuleDestroy {
  private readonly db: Database.Database;
  private readonly logger = new Logger(LocalFsStorage.name);
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private cleanupTask?: Promise<void>;
  private mutation: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly rootDir: string,
    private readonly ttlHours: number,
  ) {
    if (!Number.isFinite(ttlHours) || ttlHours <= 0) {
      throw new Error('FILE_TTL_HOURS must be a positive number');
    }
    this.rootDir = resolve(rootDir);
    const dbPath = join(this.rootDir, '.metadata.sqlite');
    mkdirSync(this.rootDir, { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        sha256 TEXT NOT NULL,
        size INTEGER NOT NULL,
        mime TEXT NOT NULL,
        original_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        path TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_files_sha ON files(sha256);
      CREATE INDEX IF NOT EXISTS idx_files_expires ON files(expires_at);
    `);
  }

  async onModuleInit(): Promise<void> {
    await this.cleanupExpired();
    this.cleanupTimer = setInterval(() => {
      if (this.cleanupTask) return;
      this.cleanupTask = this.cleanupExpired()
        .then(() => undefined)
        .catch((error: unknown) => this.logger.error('File cleanup failed', error))
        .finally(() => {
          this.cleanupTask = undefined;
        });
    }, 60_000);
    this.cleanupTimer.unref();
  }

  async onModuleDestroy(): Promise<void> {
    clearInterval(this.cleanupTimer);
    await this.cleanupTask;
    await this.mutation;
    this.db.close();
  }

  async put(input: { buffer: Buffer; originalName: string; mime: string }): Promise<FileMeta> {
    return this.mutate(async () => {
      const sha256 = createHash('sha256').update(input.buffer).digest('hex');
      const id = randomUUID();
      const now = new Date();
      const expires = new Date(now.getTime() + this.ttlHours * 3600_000);
      const relPath = join(sha256.slice(0, 2), sha256);
      const absPath = join(this.rootDir, relPath);

      await mkdir(dirname(absPath), { recursive: true });
      try {
        await writeFile(absPath, input.buffer, { flag: 'wx' });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      }

      this.db
        .prepare(
          `INSERT INTO files (id, sha256, size, mime, original_name, created_at, expires_at, path)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          sha256,
          input.buffer.byteLength,
          input.mime,
          input.originalName,
          now.toISOString(),
          expires.toISOString(),
          relPath,
        );

      return {
        id,
        sha256,
        size: input.buffer.byteLength,
        mime: input.mime,
        originalName: input.originalName,
        createdAt: now.toISOString(),
        expiresAt: expires.toISOString(),
      };
    });
  }

  async meta(id: string): Promise<FileMeta | null> {
    const row = this.activeRow(id);
    return row ? rowToMeta(row) : null;
  }

  async get(id: string): Promise<{ meta: FileMeta; buffer: Buffer } | null> {
    const row = this.activeRow(id);
    if (!row) return null;
    const buffer = await readFile(join(this.rootDir, row.path));
    return { meta: rowToMeta(row), buffer };
  }

  async delete(id: string): Promise<boolean> {
    return this.mutate(async () => {
      const row = this.db.prepare<[string], FileRow>('SELECT * FROM files WHERE id = ?').get(id);
      if (!row) return false;
      this.db.prepare('DELETE FROM files WHERE id = ?').run(id);
      const others = this.db
        .prepare<[string], { c: number }>('SELECT COUNT(*) as c FROM files WHERE sha256 = ?')
        .get(row.sha256);
      if (!others || others.c === 0) {
        try {
          await unlink(join(this.rootDir, row.path));
        } catch {
          // best-effort
        }
      }
      return true;
    });
  }

  async cleanupExpired(): Promise<number> {
    const now = new Date().toISOString();
    const expired = this.db
      .prepare<[string], FileRow>('SELECT * FROM files WHERE expires_at <= ?')
      .all(now);
    for (const row of expired) await this.delete(row.id);
    return expired.length;
  }

  // Keep content writes and reference deletion together so cleanup cannot
  // unlink a deduplicated file while a new upload is registering its reference.
  private mutate<T>(action: () => Promise<T>): Promise<T> {
    const result = this.mutation.then(action);
    this.mutation = result.catch(() => undefined);
    return result;
  }

  private activeRow(id: string): FileRow | undefined {
    return this.db
      .prepare<[string, string], FileRow>('SELECT * FROM files WHERE id = ? AND expires_at > ?')
      .get(id, new Date().toISOString());
  }
}

function rowToMeta(row: FileRow): FileMeta {
  return {
    id: row.id,
    sha256: row.sha256,
    size: row.size,
    mime: row.mime,
    originalName: row.original_name,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}
