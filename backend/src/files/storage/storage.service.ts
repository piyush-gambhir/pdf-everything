import type { FileMeta } from '@pdf-everything/types';

export interface StorageService {
  put(input: {
    buffer: Buffer;
    originalName: string;
    mime: string;
  }): Promise<FileMeta>;
  get(id: string): Promise<{ meta: FileMeta; buffer: Buffer } | null>;
  meta(id: string): Promise<FileMeta | null>;
  delete(id: string): Promise<boolean>;
  cleanupExpired(): Promise<number>;
}

export const STORAGE = Symbol('STORAGE');
