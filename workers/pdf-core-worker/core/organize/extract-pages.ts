import { PDFDocument } from 'pdf-lib';
import { parsePageRange } from '@pdf-everything/types';
import { loadPdf, savePdf } from '../shared/load.js';
import { EmptyInputError } from '../shared/errors.js';

export async function extractPages(
  input: Buffer | Uint8Array,
  opts: { pages: string },
): Promise<Buffer> {
  const src = await loadPdf(input);
  const total = src.getPageCount();
  const pages = parsePageRange(opts.pages, total);

  if (pages.length === 0) throw new EmptyInputError('No valid pages selected');

  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    src,
    pages.map((p) => p - 1),
  );
  for (const page of copied) out.addPage(page);
  return savePdf(out);
}
