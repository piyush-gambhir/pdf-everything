import { describe, expect, it } from 'vitest';
import { watermarkPdf } from '../../core/edit/watermark.js';
import { makePdf, pageTexts } from '../fixtures.js';

describe('watermarkPdf', () => {
  it('adds the watermark text to every page by default', async () => {
    const src = await makePdf(3);
    const out = await watermarkPdf(src, {
      text: 'CONFIDENTIAL',
      position: 'middle-center',
      fontSize: 60,
      opacity: 0.3,
      rotation: -45,
    });
    expect(await pageTexts(out)).toEqual(['P1 CONFIDENTIAL', 'P2 CONFIDENTIAL', 'P3 CONFIDENTIAL']);
  });

  it('only watermarks specified pages', async () => {
    const src = await makePdf(4);
    const out = await watermarkPdf(src, {
      text: 'DRAFT',
      position: 'top-right',
      fontSize: 24,
      opacity: 1,
      rotation: 0,
      pages: '1,3',
    });
    expect(await pageTexts(out)).toEqual(['P1 DRAFT', 'P2', 'P3 DRAFT', 'P4']);
  });
});
