import { LayoutGrid } from 'lucide-react';
import {
  PageSizeConvertOptionsSchema,
  type PageSizeConvertOptions,
} from '@pdf-everything/types';
import { PageSizeConvertOptionsForm } from './forms/page-size-convert-form';
import type { ToolDefinition } from './types';

export const pageSizeConvertTool: ToolDefinition<PageSizeConvertOptions> = {
  id: 'page-size-convert',
  category: 'misc',
  title: 'Convert Page Size',
  description: 'Change all pages to a standard size like A4, Letter, A3, A5, or Legal.',
  Icon: LayoutGrid,
  acceptMimes: ['application/pdf'],
  acceptExtensions: ['.pdf'],
  multiple: false,
  minFiles: 1,
  maxFiles: 1,
  endpoint: '/api/v1/misc/page-size-convert',
  fileFieldName: 'file',
  schema: PageSizeConvertOptionsSchema,
  defaultOptions: { targetSize: 'a4', orientation: 'portrait', fitMode: 'scale' },
  OptionsForm: PageSizeConvertOptionsForm,
  responseType: 'binary',
};
