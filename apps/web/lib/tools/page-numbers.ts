import { Hash } from 'lucide-react';
import { PageNumberOptionsSchema, type PageNumberOptions } from '@pdf-everything/types';
import { PageNumberOptionsForm } from './forms/page-numbers-form';
import type { ToolDefinition } from './types';

export const pageNumbersTool: ToolDefinition<PageNumberOptions> = {
  id: 'page-numbers',
  category: 'edit',
  title: 'Add Page Numbers',
  description: 'Stamp page numbers in any corner using a chosen format.',
  Icon: Hash,
  acceptMimes: ['application/pdf'],
  acceptExtensions: ['.pdf'],
  multiple: false,
  minFiles: 1,
  maxFiles: 1,
  endpoint: '/api/v1/edit/page-numbers',
  fileFieldName: 'file',
  schema: PageNumberOptionsSchema,
  defaultOptions: {
    format: 'page_n_of_m',
    position: 'bottom-center',
    fontSize: 11,
    margin: 28,
    startNumber: 1,
  },
  OptionsForm: PageNumberOptionsForm,
  responseType: 'binary',
};
