import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { convertPageSize } from '../../src/misc/page-size-convert.js';
import { makePdf } from '../fixtures.js';

describe('convertPageSize', () => {
  it('converts pages to letter portrait', async () => {
    const src = await makePdf(2);
    const out = await convertPageSize(src, {
      targetSize: 'letter',
      orientation: 'portrait',
      fitMode: 'scale',
    });
    const doc = await PDFDocument.load(out);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBe(612);
    expect(height).toBe(792);
  });

  it('converts pages to a3 landscape', async () => {
    const src = await makePdf(1);
    const out = await convertPageSize(src, {
      targetSize: 'a3',
      orientation: 'landscape',
      fitMode: 'box-only',
    });
    const { width, height } = (await PDFDocument.load(out)).getPage(0).getSize();
    expect(width).toBe(1191);
    expect(height).toBe(842);
  });
});
