import { Maximize2 } from 'lucide-react';
import { ResizePagesOptionsSchema, type ResizePagesOptions } from '@pdf-everything/types';
import { ResizePagesOptionsForm } from './forms/resize-pages-form';
import type { ToolDefinition } from './types';

export const resizePagesTool: ToolDefinition<ResizePagesOptions> = {
  id: 'resize-pages',
  category: 'misc',
  title: 'Resize Pages',
  description: 'Scale page dimensions up or down by a multiplier.',
  Icon: Maximize2,
  acceptMimes: ['application/pdf'],
  acceptExtensions: ['.pdf'],
  multiple: false,
  minFiles: 1,
  maxFiles: 1,
  endpoint: '/api/v1/misc/resize-pages',
  fileFieldName: 'file',
  schema: ResizePagesOptionsSchema,
  defaultOptions: { scale: 0.5 },
  OptionsForm: ResizePagesOptionsForm,
  responseType: 'binary',
};
