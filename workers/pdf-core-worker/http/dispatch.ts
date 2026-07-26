import {
  CropOptionsSchema,
  ExtractPagesOptionsSchema,
  ExtractTextOptionsSchema,
  FormsFillOptionsSchema,
  ImagesToPdfOptionsSchema,
  MergeOptionsSchema,
  MetadataOptionsSchema,
  PageNumberOptionsSchema,
  PageSizeConvertOptionsSchema,
  RemovePagesOptionsSchema,
  ReorderOptionsSchema,
  ResizePagesOptionsSchema,
  RotateOptionsSchema,
  SplitOptionsSchema,
  WatermarkOptionsSchema,
} from '@pdf-everything/types';
import {
  addPageNumbers,
  convertPageSize,
  cropPdf,
  editMetadata,
  extractFormData,
  extractPages,
  extractText,
  fillForm,
  flattenForm,
  imagesToPdf,
  mergePdfs,
  removePages,
  reorderPages,
  resizePages,
  rotatePdf,
  splitPdf,
  watermarkPdf,
} from '../core/index.js';
import type { CoreOperation, ExecuteResult } from './protocol.js';

function one(files: Buffer[]): Buffer {
  const file = files[0];
  if (!file) throw new Error('This operation requires one input file.');
  return file;
}

function pdf(data: Buffer, meta?: Record<string, unknown>): ExecuteResult {
  return { kind: 'pdf', data: data.toString('base64'), ...(meta ? { meta } : {}) };
}

export async function executeOperation(
  operation: CoreOperation,
  files: Buffer[],
  rawOptions: unknown,
): Promise<ExecuteResult> {
  const options = rawOptions ?? {};

  switch (operation) {
    case 'merge':
      MergeOptionsSchema.parse(options);
      return pdf(await mergePdfs(files));
    case 'split':
      return {
        kind: 'pdfs',
        data: (await splitPdf(one(files), SplitOptionsSchema.parse(options))).map((part) =>
          part.toString('base64'),
        ),
      };
    case 'rotate':
      return pdf(await rotatePdf(one(files), RotateOptionsSchema.parse(options)));
    case 'remove-pages':
      return pdf(await removePages(one(files), RemovePagesOptionsSchema.parse(options)));
    case 'extract-pages':
      return pdf(await extractPages(one(files), ExtractPagesOptionsSchema.parse(options)));
    case 'reorder':
      return pdf(await reorderPages(one(files), ReorderOptionsSchema.parse(options)));
    case 'crop':
      return pdf(await cropPdf(one(files), CropOptionsSchema.parse(options)));
    case 'watermark':
      return pdf(await watermarkPdf(one(files), WatermarkOptionsSchema.parse(options)));
    case 'page-numbers':
      return pdf(await addPageNumbers(one(files), PageNumberOptionsSchema.parse(options)));
    case 'metadata':
      return pdf(await editMetadata(one(files), MetadataOptionsSchema.parse(options)));
    case 'images-to-pdf':
      return pdf(await imagesToPdf(files, ImagesToPdfOptionsSchema.parse(options)));
    case 'extract-text': {
      const result = await extractText(one(files), ExtractTextOptionsSchema.parse(options));
      return { kind: 'text', text: result.text, meta: { pageCount: result.pageCount } };
    }
    case 'resize-pages':
      return pdf(await resizePages(one(files), ResizePagesOptionsSchema.parse(options)));
    case 'page-size-convert':
      return pdf(await convertPageSize(one(files), PageSizeConvertOptionsSchema.parse(options)));
    case 'forms-fill': {
      const result = await fillForm(one(files), FormsFillOptionsSchema.parse(options));
      return pdf(result.pdf, { filled: result.filled, missing: result.missing });
    }
    case 'forms-flatten':
      return pdf(await flattenForm(one(files)));
    case 'forms-extract':
      return { kind: 'json', value: await extractFormData(one(files)) };
  }
}
