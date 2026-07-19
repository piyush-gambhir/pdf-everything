import { parsePageRange, type ResizePagesOptions } from '@pdf-everything/types';
import { loadPdf, savePdf } from '../shared/load.js';
import { PageOutOfRangeError } from '../shared/errors.js';

export type { ResizePagesOptions };

export async function resizePages(
  input: Buffer | Uint8Array,
  opts: ResizePagesOptions,
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
    page.scale(opts.scale, opts.scale);
  }
  return savePdf(doc);
}
