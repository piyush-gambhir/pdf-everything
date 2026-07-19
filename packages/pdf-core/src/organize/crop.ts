import { parsePageRange, type CropOptions } from '@pdf-everything/types';
import { loadPdf, savePdf } from '../shared/load.js';
import { PageOutOfRangeError } from '../shared/errors.js';

export type { CropOptions };

export async function cropPdf(input: Buffer | Uint8Array, opts: CropOptions): Promise<Buffer> {
  const doc = await loadPdf(input);
  const total = doc.getPageCount();
  const targets =
    opts.pages === undefined
      ? Array.from({ length: total }, (_, i) => i + 1)
      : parsePageRange(opts.pages, total);

  for (const p of targets) {
    if (p < 1 || p > total) throw new PageOutOfRangeError(p, total);
    const page = doc.getPage(p - 1);
    const { width, height } = page.getSize();
    const newWidth = Math.max(1, width - opts.marginPoints.left - opts.marginPoints.right);
    const newHeight = Math.max(1, height - opts.marginPoints.top - opts.marginPoints.bottom);
    page.setCropBox(opts.marginPoints.left, opts.marginPoints.bottom, newWidth, newHeight);
  }
  return savePdf(doc);
}
