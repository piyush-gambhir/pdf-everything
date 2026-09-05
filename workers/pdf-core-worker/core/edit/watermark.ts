import { degrees, rgb, StandardFonts } from 'pdf-lib';
import { parsePageRange, type WatermarkOptions } from '@pdf-everything/types';
import { loadPdf, savePdf } from '../shared/load.js';
import { computeAnchor } from '../shared/positioning.js';

export type { WatermarkOptions };

export async function watermarkPdf(
  input: Buffer | Uint8Array,
  opts: WatermarkOptions,
): Promise<Buffer> {
  const doc = await loadPdf(input);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const total = doc.getPageCount();
  const targets =
    opts.pages === undefined
      ? Array.from({ length: total }, (_, i) => i + 1)
      : parsePageRange(opts.pages, total);

  const textWidth = font.widthOfTextAtSize(opts.text, opts.fontSize);
  const textHeight = font.heightAtSize(opts.fontSize);

  for (const p of targets) {
    const page = doc.getPage(p - 1);
    const { x, y } = computeAnchor(
      opts.position,
      page.getSize(),
      { width: textWidth, height: textHeight },
      40,
    );
    page.drawText(opts.text, {
      x: x + textWidth / 2,
      y: y + textHeight / 2,
      size: opts.fontSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity: opts.opacity,
      rotate: degrees(opts.rotation),
    });
  }
  return savePdf(doc);
}
