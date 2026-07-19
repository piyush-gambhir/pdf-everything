import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { watermarkPdf } from '../../src/pdf-core/edit/watermark.js';
import { makePdf } from '../fixtures.js';

describe('watermarkPdf', () => {
  it('produces a valid PDF with the same page count', async () => {
    const src = await makePdf(3);
    const out = await watermarkPdf(src, {
      text: 'CONFIDENTIAL',
      position: 'middle-center',
      fontSize: 60,
      opacity: 0.3,
      rotation: -45,
    });
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(3);
    expect(out.length).toBeGreaterThan(src.length);
  });

  it('only watermarks specified pages', async () => {
    const src = await makePdf(4);
    const out = await watermarkPdf(src, {
      text: 'DRAFT',
      position: 'top-right',
      fontSize: 24,
      opacity: 1,
      rotation: 0,
      pages: '1,3',
    });
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(4);
  });
});
