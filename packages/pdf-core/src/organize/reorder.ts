import { PDFDocument } from 'pdf-lib';
import { loadPdf, savePdf } from '../shared/load.js';
import { PageOutOfRangeError } from '../shared/errors.js';

export async function reorderPages(
  input: Buffer | Uint8Array,
  opts: { order: number[] },
): Promise<Buffer> {
  const src = await loadPdf(input);
  const total = src.getPageCount();

  if (opts.order.length !== total) {
    throw new Error(
      `Order array length (${opts.order.length}) must equal total page count (${total})`,
    );
  }
  const sorted = [...opts.order].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== i + 1) {
      const bad = opts.order.find((p) => p < 1 || p > total);
      if (bad !== undefined) throw new PageOutOfRangeError(bad, total);
      throw new Error('Order must be a permutation of 1..N covering every page exactly once');
    }
  }

  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    src,
    opts.order.map((p) => p - 1),
  );
  for (const page of copied) out.addPage(page);
  return savePdf(out);
}
