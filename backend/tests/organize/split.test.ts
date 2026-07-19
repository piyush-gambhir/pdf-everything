import { describe, expect, it } from 'vitest';
import { splitPdf } from '../../src/pdf-core/organize/split.js';
import { makePdf, pageCount } from '../fixtures.js';

describe('splitPdf', () => {
  it('splits by ranges', async () => {
    const src = await makePdf(5);
    const parts = await splitPdf(src, { mode: 'ranges', ranges: ['1-2', '3-5'] });
    expect(parts).toHaveLength(2);
    expect(await pageCount(parts[0]!)).toBe(2);
    expect(await pageCount(parts[1]!)).toBe(3);
  });

  it('splits each page separately', async () => {
    const src = await makePdf(4);
    const parts = await splitPdf(src, { mode: 'each' });
    expect(parts).toHaveLength(4);
    for (const p of parts) expect(await pageCount(p)).toBe(1);
  });

  it('handles non-contiguous ranges', async () => {
    const src = await makePdf(6);
    const parts = await splitPdf(src, { mode: 'ranges', ranges: ['1,3,5'] });
    expect(parts).toHaveLength(1);
    expect(await pageCount(parts[0]!)).toBe(3);
  });
});
