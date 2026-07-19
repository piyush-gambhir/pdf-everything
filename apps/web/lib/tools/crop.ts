import { Crop } from 'lucide-react';
import { CropOptionsSchema, type CropOptions } from '@pdf-everything/types';
import { CropOptionsForm } from './forms/crop-form';
import type { ToolDefinition } from './types';

export const cropTool: ToolDefinition<CropOptions> = {
  id: 'crop',
  category: 'organize',
  title: 'Crop PDF',
  description: 'Trim margins from PDF pages (in points; 72pt = 1 inch).',
  Icon: Crop,
  acceptMimes: ['application/pdf'],
  acceptExtensions: ['.pdf'],
  multiple: false,
  minFiles: 1,
  maxFiles: 1,
  endpoint: '/api/v1/organize/crop',
  fileFieldName: 'file',
  schema: CropOptionsSchema,
  defaultOptions: { marginPoints: { top: 36, right: 36, bottom: 36, left: 36 } },
  OptionsForm: CropOptionsForm,
  responseType: 'binary',
};
