import { parsePageRange } from '@pdf-everything/types';
import { loadPdf, savePdf } from '../shared/load.js';
import { EmptyInputError, PageOutOfRangeError } from '../shared/errors.js';

export async function removePages(
  input: Buffer | Uint8Array,
  opts: { pages: string },
): Promise<Buffer> {
  const doc = await loadPdf(input);
  const total = doc.getPageCount();
  const toRemove = new Set(parsePageRange(opts.pages, total));

  for (const p of toRemove) {
    if (p < 1 || p > total) throw new PageOutOfRangeError(p, total);
  }
  if (toRemove.size >= total) {
    throw new EmptyInputError('Cannot remove all pages — at least one page must remain');
  }

  // Remove from highest index to lowest to keep indices stable.
  const sortedDesc = [...toRemove].sort((a, b) => b - a);
  for (const page of sortedDesc) doc.removePage(page - 1);

  return savePdf(doc);
}
