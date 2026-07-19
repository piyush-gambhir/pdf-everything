import { describe, expect, it } from 'vitest';
import { removePages } from '../../src/organize/remove-pages.js';
import { EmptyInputError } from '../../src/shared/errors.js';
import { makePdf, pageCount } from '../fixtures.js';

describe('removePages', () => {
  it('removes specified pages', async () => {
    const src = await makePdf(5);
    const out = await removePages(src, { pages: '2,4' });
    expect(await pageCount(out)).toBe(3);
  });

  it('removes a contiguous range', async () => {
    const src = await makePdf(10);
    const out = await removePages(src, { pages: '3-7' });
    expect(await pageCount(out)).toBe(5);
  });

  it('rejects removing every page', async () => {
    const src = await makePdf(3);
    await expect(removePages(src, { pages: '1-3' })).rejects.toBeInstanceOf(EmptyInputError);
  });
});
