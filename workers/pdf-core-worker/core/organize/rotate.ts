import { degrees } from 'pdf-lib';
import { parsePageRange, type RotateOptions } from '@pdf-everything/types';
import { loadPdf, savePdf } from '../shared/load.js';

export async function rotatePdf(input: Buffer | Uint8Array, opts: RotateOptions): Promise<Buffer> {
  const doc = await loadPdf(input);
  const total = doc.getPageCount();

  const targets =
    opts.pages === undefined
      ? Array.from({ length: total }, (_, i) => i + 1)
      : parsePageRange(opts.pages, total);

  for (const p of targets) {
    const page = doc.getPage(p - 1);
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + opts.angle) % 360));
  }
  return savePdf(doc);
}
