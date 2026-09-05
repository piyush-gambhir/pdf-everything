import { describe, expect, it } from 'vitest';
import { reorderPages } from '../../core/organize/reorder.js';
import { makePdf, pageTexts } from '../fixtures.js';

describe('reorderPages', () => {
  it('reorders pages and preserves count', async () => {
    const src = await makePdf(4);
    const out = await reorderPages(src, { order: [4, 3, 2, 1] });
    expect(await pageTexts(out)).toEqual(['P4', 'P3', 'P2', 'P1']);
  });

  it('rejects an order array of wrong length', async () => {
    const src = await makePdf(3);
    await expect(reorderPages(src, { order: [1, 2] })).rejects.toThrow(/must equal/);
  });

  it('rejects a non-permutation order', async () => {
    const src = await makePdf(3);
    await expect(reorderPages(src, { order: [1, 1, 2] })).rejects.toThrow(/permutation/);
  });
});
