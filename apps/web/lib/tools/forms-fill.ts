import { FormInput } from 'lucide-react';
import { FormsFillOptionsSchema, type FormsFillOptions } from '@pdf-everything/types';
import { FormsFillOptionsForm } from './forms/forms-fill-form';
import type { ToolDefinition } from './types';

export const formsFillTool: ToolDefinition<FormsFillOptions> = {
  id: 'forms-fill',
  category: 'forms',
  title: 'Fill Form',
  description: 'Set field values in a fillable PDF form. Optionally flatten the result.',
  Icon: FormInput,
  acceptMimes: ['application/pdf'],
  acceptExtensions: ['.pdf'],
  multiple: false,
  minFiles: 1,
  maxFiles: 1,
  endpoint: '/api/v1/forms/fill',
  fileFieldName: 'file',
  schema: FormsFillOptionsSchema,
  defaultOptions: { fields: {}, flatten: false },
  OptionsForm: FormsFillOptionsForm,
  responseType: 'binary',
};
