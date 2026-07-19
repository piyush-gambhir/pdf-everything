import { describe, expect, it } from 'vitest';
import { extractPages } from '../../src/pdf-core/organize/extract-pages.js';
import { makePdf, pageCount } from '../fixtures.js';

describe('extractPages', () => {
  it('extracts a single page', async () => {
    const src = await makePdf(5);
    const out = await extractPages(src, { pages: '3' });
    expect(await pageCount(out)).toBe(1);
  });

  it('extracts a range', async () => {
    const src = await makePdf(8);
    const out = await extractPages(src, { pages: '2-5' });
    expect(await pageCount(out)).toBe(4);
  });

  it('extracts a mixed selection and dedupes', async () => {
    const src = await makePdf(10);
    const out = await extractPages(src, { pages: '1,3,5,1' });
    expect(await pageCount(out)).toBe(3);
  });
});
