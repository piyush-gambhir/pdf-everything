import { describe, expect, it } from 'vitest';
import { mergePdfs } from '../../core/organize/merge.js';
import { EmptyInputError } from '../../core/shared/errors.js';
import { makePdf, pageCount, pageTexts } from '../fixtures.js';

describe('mergePdfs', () => {
  it('merges two PDFs by concatenating pages', async () => {
    const a = await makePdf(3, 'A');
    const b = await makePdf(2, 'B');
    const out = await mergePdfs([a, b]);
    expect(await pageTexts(out)).toEqual(['A1', 'A2', 'A3', 'B1', 'B2']);
  });

  it('handles a single PDF input', async () => {
    const a = await makePdf(4);
    const out = await mergePdfs([a]);
    expect(await pageCount(out)).toBe(4);
  });

  it('throws on empty input', async () => {
    await expect(mergePdfs([])).rejects.toBeInstanceOf(EmptyInputError);
  });
});
