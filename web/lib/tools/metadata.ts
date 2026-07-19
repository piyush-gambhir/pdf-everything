import { Tag } from 'lucide-react';
import { MetadataOptionsSchema, type MetadataOptions } from '@pdf-everything/types';
import { MetadataOptionsForm } from './forms/metadata-form';
import type { ToolDefinition } from './types';

export const metadataTool: ToolDefinition<MetadataOptions> = {
  id: 'metadata',
  category: 'edit',
  title: 'Edit Metadata',
  description: 'Set title, author, subject, keywords, creator, and producer fields.',
  Icon: Tag,
  acceptMimes: ['application/pdf'],
  acceptExtensions: ['.pdf'],
  multiple: false,
  minFiles: 1,
  maxFiles: 1,
  endpoint: '/api/v1/edit/metadata',
  fileFieldName: 'file',
  schema: MetadataOptionsSchema,
  defaultOptions: {},
  OptionsForm: MetadataOptionsForm,
  responseType: 'binary',
};
