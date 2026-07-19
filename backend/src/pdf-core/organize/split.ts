import { PDFDocument } from 'pdf-lib';
import { parsePageRange } from '@pdf-everything/types';
import { loadPdf, savePdf } from '../shared/load.js';
import { PageOutOfRangeError } from '../shared/errors.js';

export type SplitInput =
  | { mode: 'ranges'; ranges: string[] }
  | { mode: 'each' };

export async function splitPdf(
  input: Buffer | Uint8Array,
  opts: SplitInput,
): Promise<Buffer[]> {
  const src = await loadPdf(input);
  const total = src.getPageCount();

  const segments: number[][] =
    opts.mode === 'each'
      ? Array.from({ length: total }, (_, i) => [i + 1])
      : opts.ranges.map((r) => parsePageRange(r, total));

  const results: Buffer[] = [];
  for (const pages of segments) {
    if (pages.length === 0) continue;
    for (const p of pages) {
      if (p < 1 || p > total) throw new PageOutOfRangeError(p, total);
    }
    const out = await PDFDocument.create();
    const indices = pages.map((p) => p - 1);
    const copied = await out.copyPages(src, indices);
    for (const page of copied) out.addPage(page);
    results.push(await savePdf(out));
  }
  return results;
}
