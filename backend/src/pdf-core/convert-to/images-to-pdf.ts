import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import type { ImagesToPdfOptions, PageSize } from '@pdf-everything/types';
import { EmptyInputError } from '../shared/errors.js';
import { savePdf } from '../shared/load.js';

export type { ImagesToPdfOptions };

const SIZES: Record<Exclude<PageSize, 'auto'>, [number, number]> = {
  a4: [595, 842],
  a3: [842, 1191],
  a5: [420, 595],
  letter: [612, 792],
  legal: [612, 1008],
};

export async function imagesToPdf(
  inputs: Array<Buffer | Uint8Array>,
  opts: ImagesToPdfOptions,
): Promise<Buffer> {
  if (inputs.length === 0) throw new EmptyInputError('At least one image is required');

  const doc = await PDFDocument.create();

  for (const input of inputs) {
    const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
    const meta = await sharp(buf).metadata();
    const isJpeg = meta.format === 'jpeg' || meta.format === 'jpg';

    let imgBytes: Buffer = buf;
    let asJpeg = isJpeg;
    if (!isJpeg && meta.format !== 'png') {
      imgBytes = await sharp(buf).jpeg({ quality: 90 }).toBuffer();
      asJpeg = true;
    }

    // pdf-lib's embedJpg/embedPng misreads Node's slab-allocated Buffers
    // (where byteOffset > 0). Copy into a tight Uint8Array first.
    const tight = Uint8Array.from(imgBytes);
    const embedded = asJpeg ? await doc.embedJpg(tight) : await doc.embedPng(tight);

    const imgW = embedded.width;
    const imgH = embedded.height;

    const [pageW, pageH] = computePageDims(opts, imgW, imgH);
    const page = doc.addPage([pageW, pageH]);

    const availW = pageW - opts.margin * 2;
    const availH = pageH - opts.margin * 2;
    const { drawW, drawH } = computeDrawSize(opts.fit, imgW, imgH, availW, availH);
    const x = opts.margin + (availW - drawW) / 2;
    const y = opts.margin + (availH - drawH) / 2;
    page.drawImage(embedded, { x, y, width: drawW, height: drawH });
  }

  return savePdf(doc);
}

function computePageDims(
  opts: ImagesToPdfOptions,
  imgW: number,
  imgH: number,
): [number, number] {
  if (opts.pageSize === 'auto') {
    return [imgW + opts.margin * 2, imgH + opts.margin * 2];
  }
  let [w, h] = SIZES[opts.pageSize];
  const wantLandscape =
    opts.orientation === 'landscape' || (opts.orientation === 'auto' && imgW > imgH);
  if (wantLandscape && w < h) [w, h] = [h, w];
  if (!wantLandscape && opts.orientation !== 'auto' && w > h) [w, h] = [h, w];
  return [w, h];
}

function computeDrawSize(
  fit: 'contain' | 'cover' | 'stretch',
  imgW: number,
  imgH: number,
  availW: number,
  availH: number,
): { drawW: number; drawH: number } {
  if (fit === 'stretch') return { drawW: availW, drawH: availH };
  const scaleW = availW / imgW;
  const scaleH = availH / imgH;
  const scale = fit === 'contain' ? Math.min(scaleW, scaleH) : Math.max(scaleW, scaleH);
  return { drawW: imgW * scale, drawH: imgH * scale };
}
