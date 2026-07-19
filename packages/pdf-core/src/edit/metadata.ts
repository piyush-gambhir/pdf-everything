import type { MetadataOptions } from '@pdf-everything/types';
import { loadPdf, savePdf } from '../shared/load.js';

export type { MetadataOptions };

export async function editMetadata(
  input: Buffer | Uint8Array,
  opts: MetadataOptions,
): Promise<Buffer> {
  const doc = await loadPdf(input);
  if (opts.title !== undefined) doc.setTitle(opts.title);
  if (opts.author !== undefined) doc.setAuthor(opts.author);
  if (opts.subject !== undefined) doc.setSubject(opts.subject);
  if (opts.keywords !== undefined) doc.setKeywords(opts.keywords);
  if (opts.producer !== undefined) doc.setProducer(opts.producer);
  if (opts.creator !== undefined) doc.setCreator(opts.creator);
  doc.setModificationDate(new Date());
  return savePdf(doc);
}
