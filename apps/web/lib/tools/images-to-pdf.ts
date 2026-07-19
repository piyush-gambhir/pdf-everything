import { Image } from 'lucide-react';
import { ImagesToPdfOptionsSchema, type ImagesToPdfOptions } from '@pdf-everything/types';
import { ImagesToPdfOptionsForm } from './forms/images-to-pdf-form';
import type { ToolDefinition } from './types';

export const imagesToPdfTool: ToolDefinition<ImagesToPdfOptions> = {
  id: 'images-to-pdf',
  category: 'convert-to',
  title: 'Images to PDF',
  description: 'Combine JPG, PNG, TIFF, HEIC, or WebP images into a single PDF.',
  Icon: Image,
  acceptMimes: [
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/heic',
    'image/heif',
    'image/webp',
  ],
  acceptExtensions: ['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.heic', '.heif', '.webp'],
  multiple: true,
  minFiles: 1,
  maxFiles: 100,
  endpoint: '/api/v1/convert-to/images-to-pdf',
  fileFieldName: 'files',
  schema: ImagesToPdfOptionsSchema,
  defaultOptions: { pageSize: 'a4', orientation: 'auto', margin: 20, fit: 'contain' },
  OptionsForm: ImagesToPdfOptionsForm,
  responseType: 'binary',
  outputFilename: () => 'images.pdf',
};
