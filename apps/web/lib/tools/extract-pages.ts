import { FileOutput } from 'lucide-react';
import { ExtractPagesOptionsSchema, type ExtractPagesOptions } from '@pdf-everything/types';
import { ExtractPagesOptionsForm } from './forms/extract-pages-form';
import type { ToolDefinition } from './types';

export const extractPagesTool: ToolDefinition<ExtractPagesOptions> = {
  id: 'extract-pages',
  category: 'organize',
  title: 'Extract Pages',
  description: 'Pull specific pages out of a PDF into a new file.',
  Icon: FileOutput,
  acceptMimes: ['application/pdf'],
  acceptExtensions: ['.pdf'],
  multiple: false,
  minFiles: 1,
  maxFiles: 1,
  endpoint: '/api/v1/organize/extract-pages',
  fileFieldName: 'file',
  schema: ExtractPagesOptionsSchema,
  defaultOptions: { pages: '1' },
  OptionsForm: ExtractPagesOptionsForm,
  responseType: 'binary',
};
