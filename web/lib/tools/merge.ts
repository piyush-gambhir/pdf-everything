import { Combine } from 'lucide-react';
import { MergeOptionsSchema, type MergeOptions } from '@pdf-everything/types';
import { MergeOptionsForm } from './forms/merge-form';
import type { ToolDefinition } from './types';

export const mergeTool: ToolDefinition<MergeOptions> = {
  id: 'merge',
  category: 'organize',
  title: 'Merge PDFs',
  description: 'Combine multiple PDF files into a single document.',
  Icon: Combine,
  acceptMimes: ['application/pdf'],
  acceptExtensions: ['.pdf'],
  multiple: true,
  minFiles: 2,
  maxFiles: 50,
  endpoint: '/api/v1/organize/merge',
  fileFieldName: 'files',
  schema: MergeOptionsSchema,
  defaultOptions: {},
  OptionsForm: MergeOptionsForm,
  responseType: 'binary',
  outputFilename: () => 'merged.pdf',
};
