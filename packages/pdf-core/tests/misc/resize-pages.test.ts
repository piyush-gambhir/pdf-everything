import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { resizePages } from '../../src/misc/resize-pages.js';
import { makePdf } from '../fixtures.js';

describe('resizePages', () => {
  it('halves page dimensions when scale=0.5', async () => {
    const src = await makePdf(2);
    const out = await resizePages(src, { scale: 0.5 });
    const doc = await PDFDocument.load(out);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(595 * 0.5, 1);
    expect(height).toBeCloseTo(842 * 0.5, 1);
  });
});
