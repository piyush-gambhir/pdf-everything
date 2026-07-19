import { FileText } from 'lucide-react';
import { ExtractTextOptionsSchema, type ExtractTextOptions } from '@pdf-everything/types';
import { ExtractTextOptionsForm } from './forms/extract-text-form';
import type { ToolDefinition } from './types';

export const extractTextTool: ToolDefinition<ExtractTextOptions> = {
  id: 'extract-text',
  category: 'convert-from',
  title: 'Extract Text',
  description: 'Pull all text out of a PDF as a downloadable .txt file.',
  Icon: FileText,
  acceptMimes: ['application/pdf'],
  acceptExtensions: ['.pdf'],
  multiple: false,
  minFiles: 1,
  maxFiles: 1,
  endpoint: '/api/v1/convert-from/extract-text',
  fileFieldName: 'file',
  schema: ExtractTextOptionsSchema,
  defaultOptions: { preserveBlankLines: false },
  OptionsForm: ExtractTextOptionsForm,
  responseType: 'text',
};
