import { describe, expect, it } from 'vitest';
import { addPageNumbers } from '../../core/edit/page-numbers.js';
import { makePdf, pageTexts } from '../fixtures.js';

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
    expect(await pageTexts(out)).toEqual(['P1 Page 1 of 3', 'P2 Page 2 of 3', 'P3 Page 3 of 3']);
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
    expect(await pageTexts(out)).toEqual(['P1', 'P2 100', 'P3 101', 'P4 102', 'P5']);
  });
});
