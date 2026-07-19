import { parsePageRange, type PageSizeConvertOptions } from '@pdf-everything/types';
import { loadPdf, savePdf } from '../shared/load.js';
import { PageOutOfRangeError } from '../shared/errors.js';

export type { PageSizeConvertOptions };

type FixedPageSize = PageSizeConvertOptions['targetSize'];

const SIZES: Record<FixedPageSize, [number, number]> = {
  a4: [595, 842],
  a3: [842, 1191],
  a5: [420, 595],
  letter: [612, 792],
  legal: [612, 1008],
};

export async function convertPageSize(
  input: Buffer | Uint8Array,
  opts: PageSizeConvertOptions,
): Promise<Buffer> {
  const doc = await loadPdf(input);
  const total = doc.getPageCount();
  const targets =
    opts.pages === undefined
      ? Array.from({ length: total }, (_, i) => i + 1)
      : parsePageRange(opts.pages, total);

  let [targetW, targetH] = SIZES[opts.targetSize];
  if (opts.orientation === 'landscape') [targetW, targetH] = [targetH, targetW];

  for (const p of targets) {
    if (p < 1 || p > total) throw new PageOutOfRangeError(p, total);
    const page = doc.getPage(p - 1);
    const { width, height } = page.getSize();

    if (opts.fitMode === 'scale') {
      const scale = Math.min(targetW / width, targetH / height);
      page.scaleContent(scale, scale);
    }
    page.setSize(targetW, targetH);
  }
  return savePdf(doc);
}
