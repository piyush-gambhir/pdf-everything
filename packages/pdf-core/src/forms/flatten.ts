import { loadPdf, savePdf } from '../shared/load.js';

export async function flattenForm(input: Buffer | Uint8Array): Promise<Buffer> {
  const doc = await loadPdf(input);
  const form = doc.getForm();
  form.flatten();
  return savePdf(doc);
}
