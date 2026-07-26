import { PDFDocument } from 'pdf-lib';
import { EmptyInputError } from '../shared/errors.js';
import { loadPdf, savePdf } from '../shared/load.js';

export async function mergePdfs(inputs: Array<Buffer | Uint8Array>): Promise<Buffer> {
  if (inputs.length === 0) throw new EmptyInputError();

  const out = await PDFDocument.create();
  for (const input of inputs) {
    const src = await loadPdf(input);
    const indices = src.getPageIndices();
    const copied = await out.copyPages(src, indices);
    for (const page of copied) out.addPage(page);
  }
  return savePdf(out);
}
