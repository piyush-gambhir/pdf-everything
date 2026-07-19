import { PDFDocument } from 'pdf-lib';
import { InvalidPdfError } from './errors.js';

export async function loadPdf(input: Buffer | Uint8Array): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(input, { ignoreEncryption: false });
  } catch (err) {
    throw new InvalidPdfError(err instanceof Error ? err.message : undefined);
  }
}

export async function savePdf(doc: PDFDocument): Promise<Buffer> {
  const bytes = await doc.save();
  return Buffer.from(bytes);
}
