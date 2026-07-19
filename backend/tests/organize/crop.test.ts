import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { cropPdf } from '../../src/pdf-core/organize/crop.js';
import { makePdf } from '../fixtures.js';

describe('cropPdf', () => {
  it('reduces the crop box by the specified margins', async () => {
    const src = await makePdf(2);
    const out = await cropPdf(src, {
      marginPoints: { top: 50, right: 40, bottom: 30, left: 20 },
    });
    const doc = await PDFDocument.load(out);
    const page = doc.getPage(0);
    const cropBox = page.getCropBox();
    expect(cropBox.x).toBe(20);
    expect(cropBox.y).toBe(30);
    expect(cropBox.width).toBe(595 - 20 - 40);
    expect(cropBox.height).toBe(842 - 30 - 50);
  });

  it('only crops specified pages', async () => {
    const src = await makePdf(3);
    const out = await cropPdf(src, {
      marginPoints: { top: 10, right: 10, bottom: 10, left: 10 },
      pages: '2',
    });
    const doc = await PDFDocument.load(out);
    expect(doc.getPage(0).getCropBox().width).toBe(595);
    expect(doc.getPage(1).getCropBox().width).toBe(595 - 20);
    expect(doc.getPage(2).getCropBox().width).toBe(595);
  });
});
