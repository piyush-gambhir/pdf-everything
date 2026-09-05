import { describe, expect, it } from 'vitest';
import { removePages } from '../../core/organize/remove-pages.js';
import { EmptyInputError } from '../../core/shared/errors.js';
import { makePdf, pageTexts } from '../fixtures.js';

describe('removePages', () => {
  it('removes specified pages', async () => {
    const src = await makePdf(5);
    const out = await removePages(src, { pages: '2,4' });
    expect(await pageTexts(out)).toEqual(['P1', 'P3', 'P5']);
  });

  it('removes a contiguous range', async () => {
    const src = await makePdf(10);
    const out = await removePages(src, { pages: '3-7' });
    expect(await pageTexts(out)).toEqual(['P1', 'P2', 'P8', 'P9', 'P10']);
  });

  it('rejects removing every page', async () => {
    const src = await makePdf(3);
    await expect(removePages(src, { pages: '1-3' })).rejects.toBeInstanceOf(EmptyInputError);
  });
});
