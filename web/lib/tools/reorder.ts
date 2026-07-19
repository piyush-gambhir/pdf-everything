import { ArrowUpDown } from 'lucide-react';
import { ReorderOptionsSchema, type ReorderOptions } from '@pdf-everything/types';
import { ReorderOptionsForm } from './forms/reorder-form';
import type { ToolDefinition } from './types';

export const reorderTool: ToolDefinition<ReorderOptions> = {
  id: 'reorder',
  category: 'organize',
  title: 'Reorder Pages',
  description: 'Rearrange the pages of a PDF in any order.',
  Icon: ArrowUpDown,
  acceptMimes: ['application/pdf'],
  acceptExtensions: ['.pdf'],
  multiple: false,
  minFiles: 1,
  maxFiles: 1,
  endpoint: '/api/v1/organize/reorder',
  fileFieldName: 'file',
  schema: ReorderOptionsSchema,
  defaultOptions: { order: [1] },
  OptionsForm: ReorderOptionsForm,
  responseType: 'binary',
};
