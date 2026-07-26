import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { InvalidPdfError } from '../shared/errors.js';

export interface ExtractTextOptions {
  preserveBlankLines?: boolean;
}

export async function extractText(
  input: Buffer | Uint8Array,
  opts: ExtractTextOptions = {},
): Promise<{ text: string; pageCount: number }> {
  // Copy into a fresh Uint8Array: pdf.js may detach the underlying ArrayBuffer,
  // which would corrupt a caller-owned Buffer.
  const data = new Uint8Array(input);

  // `destroy()` lives on the loading task, not the document proxy.
  const task = getDocument({
    data,
    useSystemFonts: true,
  });

  let doc;
  try {
    doc = await task.promise;
  } catch (err) {
    await task.destroy();
    throw new InvalidPdfError(err instanceof Error ? err.message : undefined);
  }

  try {
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      let pageText = '';
      for (const item of content.items) {
        if ('str' in item) {
          pageText += item.str;
          if (item.hasEOL) pageText += '\n';
        }
      }
      pages.push(pageText);
      page.cleanup();
    }

    const raw = pages.join('\n\n');
    const text = opts.preserveBlankLines ? raw : raw.replace(/\n{3,}/g, '\n\n');
    return { text, pageCount: doc.numPages };
  } finally {
    await task.destroy();
  }
}
