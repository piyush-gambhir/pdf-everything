import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function makePdf(
  pageCount: number,
  label = 'P',
  opts: { useObjectStreams?: boolean } = {},
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`${label}${i}`, {
      x: 50,
      y: 800,
      size: 24,
      font,
      color: rgb(0, 0, 0),
    });
  }
  const bytes = await doc.save({ useObjectStreams: opts.useObjectStreams ?? true });
  return Buffer.from(bytes);
}

export async function pageCount(buf: Buffer): Promise<number> {
  const doc = await PDFDocument.load(buf);
  return doc.getPageCount();
}

export async function pageRotations(buf: Buffer): Promise<number[]> {
  const doc = await PDFDocument.load(buf);
  return doc.getPages().map((p) => p.getRotation().angle);
}
