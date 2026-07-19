import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import Database from 'better-sqlite3';
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

export class LocalFsStorage implements StorageService {
  private readonly db: Database.Database;

  constructor(
    private readonly rootDir: string,
    private readonly ttlHours: number,
  ) {
    this.rootDir = resolve(rootDir);
    const dbPath = join(this.rootDir, '.metadata.sqlite');
    this.ensureDirSync(this.rootDir);
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

  async put(input: {
    buffer: Buffer;
    originalName: string;
    mime: string;
  }): Promise<FileMeta> {
    const sha256 = createHash('sha256').update(input.buffer).digest('hex');
    const id = randomUUID();
    const now = new Date();
    const expires = new Date(now.getTime() + this.ttlHours * 3600_000);
    const relPath = join(sha256.slice(0, 2), sha256);
    const absPath = join(this.rootDir, relPath);

    await mkdir(dirname(absPath), { recursive: true });
    let exists = false;
    try {
      await stat(absPath);
      exists = true;
    } catch {
      // not present
    }
    if (!exists) await writeFile(absPath, input.buffer);

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
  }

  async meta(id: string): Promise<FileMeta | null> {
    const row = this.db.prepare<[string], FileRow>('SELECT * FROM files WHERE id = ?').get(id);
    return row ? rowToMeta(row) : null;
  }

  async get(id: string): Promise<{ meta: FileMeta; buffer: Buffer } | null> {
    const row = this.db.prepare<[string], FileRow>('SELECT * FROM files WHERE id = ?').get(id);
    if (!row) return null;
    const buffer = await readFile(join(this.rootDir, row.path));
    return { meta: rowToMeta(row), buffer };
  }

  async delete(id: string): Promise<boolean> {
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
  }

  async cleanupExpired(): Promise<number> {
    const now = new Date().toISOString();
    const expired = this.db
      .prepare<[string], FileRow>('SELECT * FROM files WHERE expires_at < ?')
      .all(now);
    for (const row of expired) await this.delete(row.id);
    return expired.length;
  }

  private ensureDirSync(dir: string): void {
    mkdirSync(dir, { recursive: true });
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
