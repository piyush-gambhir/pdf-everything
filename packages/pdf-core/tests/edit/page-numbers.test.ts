import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { addPageNumbers } from '../../src/edit/page-numbers.js';
import { makePdf } from '../fixtures.js';

describe('addPageNumbers', () => {
  it('adds page numbers to all pages by default', async () => {
    const src = await makePdf(3);
    const out = await addPageNumbers(src, {
      format: 'page_n_of_m',
      position: 'bottom-center',
      fontSize: 11,
      margin: 28,
      startNumber: 1,
    });
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(3);
    expect(out.length).toBeGreaterThan(src.length);
  });

  it('respects start number and pages range', async () => {
    const src = await makePdf(5);
    const out = await addPageNumbers(src, {
      format: 'n',
      position: 'bottom-right',
      fontSize: 10,
      margin: 20,
      startNumber: 100,
      pages: '2-4',
    });
    expect((await PDFDocument.load(out)).getPageCount()).toBe(5);
  });
});
