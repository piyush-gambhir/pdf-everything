import { parsePageRange, type ResizePagesOptions } from '@pdf-everything/types';
import { loadPdf, savePdf } from '../shared/load.js';

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
    const page = doc.getPage(p - 1);
    page.scale(opts.scale, opts.scale);
  }
  return savePdf(doc);
}
