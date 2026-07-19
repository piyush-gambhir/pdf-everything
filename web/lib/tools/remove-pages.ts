import { Eraser } from 'lucide-react';
import { RemovePagesOptionsSchema, type RemovePagesOptions } from '@pdf-everything/types';
import { RemovePagesOptionsForm } from './forms/remove-pages-form';
import type { ToolDefinition } from './types';

export const removePagesTool: ToolDefinition<RemovePagesOptions> = {
  id: 'remove-pages',
  category: 'organize',
  title: 'Remove Pages',
  description: 'Delete specific pages from a PDF.',
  Icon: Eraser,
  acceptMimes: ['application/pdf'],
  acceptExtensions: ['.pdf'],
  multiple: false,
  minFiles: 1,
  maxFiles: 1,
  endpoint: '/api/v1/organize/remove-pages',
  fileFieldName: 'file',
  schema: RemovePagesOptionsSchema,
  defaultOptions: { pages: '1' },
  OptionsForm: RemovePagesOptionsForm,
  responseType: 'binary',
};
