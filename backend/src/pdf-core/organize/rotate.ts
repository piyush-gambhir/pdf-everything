import { degrees } from 'pdf-lib';
import { parsePageRange } from '@pdf-everything/types';
import { loadPdf, savePdf } from '../shared/load.js';
import { PageOutOfRangeError } from '../shared/errors.js';

export type RotateAngle = 90 | 180 | 270;

export async function rotatePdf(
  input: Buffer | Uint8Array,
  opts: { angle: RotateAngle; pages?: string },
): Promise<Buffer> {
  const doc = await loadPdf(input);
  const total = doc.getPageCount();

  const targets =
    opts.pages === undefined
      ? Array.from({ length: total }, (_, i) => i + 1)
      : parsePageRange(opts.pages, total);

  for (const p of targets) {
    if (p < 1 || p > total) throw new PageOutOfRangeError(p, total);
    const page = doc.getPage(p - 1);
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + opts.angle) % 360));
  }
  return savePdf(doc);
}
