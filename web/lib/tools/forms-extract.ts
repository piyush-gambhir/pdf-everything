import { FileSearch } from 'lucide-react';
import { z } from 'zod';
import { FormsExtractOptionsForm } from './forms/forms-extract-form';
import type { ToolDefinition } from './types';

const NoOptionsSchema = z.object({});

export const formsExtractTool: ToolDefinition<Record<string, never>> = {
  id: 'forms-extract',
  category: 'forms',
  title: 'Extract Form Data',
  description: 'List every form field with its current value as JSON.',
  Icon: FileSearch,
  acceptMimes: ['application/pdf'],
  acceptExtensions: ['.pdf'],
  multiple: false,
  minFiles: 1,
  maxFiles: 1,
  endpoint: '/api/v1/forms/extract',
  fileFieldName: 'file',
  schema: NoOptionsSchema as never,
  defaultOptions: {},
  OptionsForm: FormsExtractOptionsForm,
  responseType: 'json',
};
