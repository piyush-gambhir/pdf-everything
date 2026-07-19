import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { FileMeta } from '@pdf-everything/types';
import { STORAGE, type StorageService } from './storage/storage.service.js';

@Injectable()
export class FilesService {
  constructor(@Inject(STORAGE) private readonly storage: StorageService) {}

  async upload(file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<FileMeta> {
    return this.storage.put({
      buffer: file.buffer,
      originalName: file.originalname,
      mime: file.mimetype,
    });
  }

  async getRequired(id: string): Promise<{ meta: FileMeta; buffer: Buffer }> {
    const result = await this.storage.get(id);
    if (!result) throw new NotFoundException(`File ${id} not found or expired`);
    return result;
  }

  async meta(id: string): Promise<FileMeta> {
    const meta = await this.storage.meta(id);
    if (!meta) throw new NotFoundException(`File ${id} not found`);
    return meta;
  }

  async delete(id: string): Promise<void> {
    const ok = await this.storage.delete(id);
    if (!ok) throw new NotFoundException(`File ${id} not found`);
  }
}
