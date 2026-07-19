import type { Response } from 'express';
import type { FilesService } from '../files/files.service.js';

export function streamPdf(res: Response, buffer: Buffer, filename: string): void {
  res
    .status(200)
    .setHeader('Content-Type', 'application/pdf')
    .setHeader('Content-Length', String(buffer.byteLength))
    .setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    .send(buffer);
}

export async function respondWithPdf(args: {
  res: Response;
  buffer: Buffer;
  filename: string;
  outputMode: 'binary' | 'ref';
  files: FilesService;
}): Promise<void> {
  if (args.outputMode === 'ref') {
    const meta = await args.files.upload({
      buffer: args.buffer,
      originalname: args.filename,
      mimetype: 'application/pdf',
    });
    args.res.status(200).json(meta);
    return;
  }
  streamPdf(args.res, args.buffer, args.filename);
}
