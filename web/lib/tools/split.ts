import { Scissors } from 'lucide-react';
import { SplitOptionsSchema, type SplitOptions } from '@pdf-everything/types';
import { SplitOptionsForm } from './forms/split-form';
import type { ToolDefinition } from './types';

export const splitTool: ToolDefinition<SplitOptions> = {
  id: 'split',
  category: 'organize',
  title: 'Split PDF',
  description: 'Split a PDF into multiple files by page ranges or one-per-page.',
  Icon: Scissors,
  acceptMimes: ['application/pdf'],
  acceptExtensions: ['.pdf'],
  multiple: false,
  minFiles: 1,
  maxFiles: 1,
  endpoint: '/api/v1/organize/split',
  fileFieldName: 'file',
  schema: SplitOptionsSchema,
  defaultOptions: { mode: 'ranges', ranges: ['1'] },
  OptionsForm: SplitOptionsForm,
  responseType: 'multi-files',
};
