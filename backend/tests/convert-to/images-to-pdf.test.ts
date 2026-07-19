import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { imagesToPdf } from '../../src/pdf-core/convert-to/images-to-pdf.js';
import { EmptyInputError } from '../../src/pdf-core/shared/errors.js';

async function makeJpegBuffer(width: number, height: number, color = 0xff_88_44): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: (color >> 16) & 0xff, g: (color >> 8) & 0xff, b: color & 0xff },
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
}

async function makePngBuffer(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 200, b: 0, alpha: 1 } },
  })
    .png()
    .toBuffer();
}

describe('imagesToPdf', () => {
  it('combines jpeg images into a single PDF', async () => {
    const a = await makeJpegBuffer(400, 600);
    const b = await makeJpegBuffer(800, 400);
    const out = await imagesToPdf([a, b], {
      pageSize: 'a4',
      orientation: 'auto',
      margin: 20,
      fit: 'contain',
    });
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(2);
  });

  it('handles png input', async () => {
    const png = await makePngBuffer(300, 300);
    const out = await imagesToPdf([png], {
      pageSize: 'auto',
      orientation: 'auto',
      margin: 0,
      fit: 'contain',
    });
    expect((await PDFDocument.load(out)).getPageCount()).toBe(1);
  });

  it('throws on empty input', async () => {
    await expect(
      imagesToPdf([], {
        pageSize: 'a4',
        orientation: 'portrait',
        margin: 20,
        fit: 'contain',
      }),
    ).rejects.toBeInstanceOf(EmptyInputError);
  });
});
