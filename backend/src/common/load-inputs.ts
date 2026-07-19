import { BadRequestException } from '@nestjs/common';
import type { FilesService } from '../files/files.service.js';

export async function loadInputs(args: {
  uploads?: Array<{ buffer: Buffer; originalname: string; mimetype: string }>;
  fileIds?: string[];
  files: FilesService;
}): Promise<{ buffers: Buffer[]; originalNames: string[] }> {
  const uploads = args.uploads ?? [];
  if (uploads.length > 0) {
    return {
      buffers: uploads.map((u) => u.buffer),
      originalNames: uploads.map((u) => u.originalname),
    };
  }

  if (!args.fileIds || args.fileIds.length === 0) {
    throw new BadRequestException(
      'Provide files via multipart/form-data OR JSON body with { fileIds: [...] }',
    );
  }

  const buffers: Buffer[] = [];
  const originalNames: string[] = [];
  for (const id of args.fileIds) {
    const { meta, buffer } = await args.files.getRequired(id);
    buffers.push(buffer);
    originalNames.push(meta.originalName);
  }
  return { buffers, originalNames };
}
