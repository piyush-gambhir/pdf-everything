import pdfParse from 'pdf-parse';
import { InvalidPdfError } from '../shared/errors.js';

export interface ExtractTextOptions {
  preserveBlankLines?: boolean;
}

export async function extractText(
  input: Buffer | Uint8Array,
  opts: ExtractTextOptions = {},
): Promise<{ text: string; pageCount: number }> {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  let parsed;
  try {
    parsed = await pdfParse(buf);
  } catch (err) {
    throw new InvalidPdfError(err instanceof Error ? err.message : undefined);
  }
  const text = opts.preserveBlankLines
    ? parsed.text
    : parsed.text.replace(/\n{3,}/g, '\n\n');
  return { text, pageCount: parsed.numpages };
}
