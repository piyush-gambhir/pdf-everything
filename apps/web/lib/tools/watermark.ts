import { Stamp } from 'lucide-react';
import { WatermarkOptionsSchema, type WatermarkOptions } from '@pdf-everything/types';
import { WatermarkOptionsForm } from './forms/watermark-form';
import type { ToolDefinition } from './types';

export const watermarkTool: ToolDefinition<WatermarkOptions> = {
  id: 'watermark',
  category: 'edit',
  title: 'Add Watermark',
  description: 'Stamp diagonal text across every page (DRAFT, CONFIDENTIAL, etc.)',
  Icon: Stamp,
  acceptMimes: ['application/pdf'],
  acceptExtensions: ['.pdf'],
  multiple: false,
  minFiles: 1,
  maxFiles: 1,
  endpoint: '/api/v1/edit/watermark',
  fileFieldName: 'file',
  schema: WatermarkOptionsSchema,
  defaultOptions: {
    text: 'DRAFT',
    position: 'middle-center',
    fontSize: 80,
    opacity: 0.25,
    rotation: -45,
  },
  OptionsForm: WatermarkOptionsForm,
  responseType: 'binary',
};
