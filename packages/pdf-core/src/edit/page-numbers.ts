import { rgb, StandardFonts } from 'pdf-lib';
import {
  parsePageRange,
  type PageNumberOptions,
  type PageNumberFormat,
} from '@pdf-everything/types';
import { loadPdf, savePdf } from '../shared/load.js';
import { PageOutOfRangeError } from '../shared/errors.js';
import { computeAnchor } from '../shared/positioning.js';

export type { PageNumberOptions, PageNumberFormat };

export async function addPageNumbers(
  input: Buffer | Uint8Array,
  opts: PageNumberOptions,
): Promise<Buffer> {
  const doc = await loadPdf(input);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const total = doc.getPageCount();
  const targets =
    opts.pages === undefined
      ? Array.from({ length: total }, (_, i) => i + 1)
      : parsePageRange(opts.pages, total);

  for (let i = 0; i < targets.length; i++) {
    const pageNum = targets[i]!;
    if (pageNum < 1 || pageNum > total) throw new PageOutOfRangeError(pageNum, total);
    const page = doc.getPage(pageNum - 1);
    const label = renderLabel(opts.format, opts.startNumber + i, targets.length);
    const textWidth = font.widthOfTextAtSize(label, opts.fontSize);
    const textHeight = font.heightAtSize(opts.fontSize);
    const { x, y } = computeAnchor(
      opts.position,
      page.getSize(),
      { width: textWidth, height: textHeight },
      opts.margin,
    );
    page.drawText(label, { x, y, size: opts.fontSize, font, color: rgb(0.2, 0.2, 0.2) });
  }
  return savePdf(doc);
}

function renderLabel(format: PageNumberFormat, n: number, total: number): string {
  switch (format) {
    case 'n':
      return String(n);
    case 'n_of_m':
      return `${n} / ${total}`;
    case 'page_n':
      return `Page ${n}`;
    case 'page_n_of_m':
      return `Page ${n} of ${total}`;
  }
}
