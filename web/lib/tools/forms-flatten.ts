import { Layers } from 'lucide-react';
import { z } from 'zod';
import { FormsFlattenOptionsForm } from './forms/forms-flatten-form';
import type { ToolDefinition } from './types';

const NoOptionsSchema = z.object({});

export const formsFlattenTool: ToolDefinition<Record<string, never>> = {
  id: 'forms-flatten',
  category: 'forms',
  title: 'Flatten Form',
  description: 'Burn interactive form fields into the page so they can no longer be edited.',
  Icon: Layers,
  acceptMimes: ['application/pdf'],
  acceptExtensions: ['.pdf'],
  multiple: false,
  minFiles: 1,
  maxFiles: 1,
  endpoint: '/api/v1/forms/flatten',
  fileFieldName: 'file',
  schema: NoOptionsSchema as never,
  defaultOptions: {},
  OptionsForm: FormsFlattenOptionsForm,
  responseType: 'binary',
};
