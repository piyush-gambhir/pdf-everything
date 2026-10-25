import { describe, expect, it } from 'vitest';
import { splitPdf } from '../../core/organize/split.js';
import { makePdf, pageTexts } from '../fixtures.js';

describe('splitPdf', () => {
  it('splits by ranges', async () => {
    const src = await makePdf(5);
    const parts = await splitPdf(src, { mode: 'ranges', ranges: ['1-2', '3-5'] });
    expect(parts).toHaveLength(2);
    expect(await pageTexts(parts[0]!)).toEqual(['P1', 'P2']);
    expect(await pageTexts(parts[1]!)).toEqual(['P3', 'P4', 'P5']);
  });

  it('splits each page separately', async () => {
    const src = await makePdf(4);
    const parts = await splitPdf(src, { mode: 'each' });
    expect(parts).toHaveLength(4);
    expect(await Promise.all(parts.map(pageTexts))).toEqual([['P1'], ['P2'], ['P3'], ['P4']]);
  });

  it('handles non-contiguous ranges', async () => {
    const src = await makePdf(6);
    const parts = await splitPdf(src, { mode: 'ranges', ranges: ['1,3,5'] });
    expect(parts).toHaveLength(1);
    expect(await pageTexts(parts[0]!)).toEqual(['P1', 'P3', 'P5']);
  });
});
