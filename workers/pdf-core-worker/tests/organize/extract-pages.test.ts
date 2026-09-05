import { describe, expect, it } from 'vitest';
import { extractPages } from '../../core/organize/extract-pages.js';
import { makePdf, pageTexts } from '../fixtures.js';

describe('extractPages', () => {
  it('extracts a single page', async () => {
    const src = await makePdf(5);
    const out = await extractPages(src, { pages: '3' });
    expect(await pageTexts(out)).toEqual(['P3']);
  });

  it('extracts a range', async () => {
    const src = await makePdf(8);
    const out = await extractPages(src, { pages: '2-5' });
    expect(await pageTexts(out)).toEqual(['P2', 'P3', 'P4', 'P5']);
  });

  it('extracts a mixed selection and dedupes', async () => {
    const src = await makePdf(10);
    const out = await extractPages(src, { pages: '1,3,5,1' });
    expect(await pageTexts(out)).toEqual(['P1', 'P3', 'P5']);
  });
});
