import { RotateCw } from 'lucide-react';
import { RotateOptionsSchema, type RotateOptions } from '@pdf-everything/types';
import { RotateOptionsForm } from './forms/rotate-form';
import type { ToolDefinition } from './types';

export const rotateTool: ToolDefinition<RotateOptions> = {
  id: 'rotate',
  category: 'organize',
  title: 'Rotate PDF',
  description: 'Rotate all or specific pages by 90, 180, or 270 degrees.',
  Icon: RotateCw,
  acceptMimes: ['application/pdf'],
  acceptExtensions: ['.pdf'],
  multiple: false,
  minFiles: 1,
  maxFiles: 1,
  endpoint: '/api/v1/organize/rotate',
  fileFieldName: 'file',
  schema: RotateOptionsSchema,
  defaultOptions: { angle: 90 },
  OptionsForm: RotateOptionsForm,
  responseType: 'binary',
};
