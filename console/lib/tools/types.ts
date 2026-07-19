import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ZodType } from 'zod';

export type ToolCategory =
  | 'organize'
  | 'edit'
  | 'optimize'
  | 'convert-to'
  | 'convert-from'
  | 'security'
  | 'forms'
  | 'ocr'
  | 'misc';

export const CATEGORY_META: Record<ToolCategory, { label: string; description: string }> = {
  organize: { label: 'Organize', description: 'Merge, split, reorder, rotate pages' },
  edit: { label: 'Edit', description: 'Watermark, page numbers, metadata' },
  optimize: { label: 'Optimize', description: 'Compress and repair PDFs' },
  'convert-to': { label: 'Convert to PDF', description: 'Word, Excel, images to PDF' },
  'convert-from': { label: 'Convert from PDF', description: 'PDF to Word, Excel, images' },
  security: { label: 'Security', description: 'Password, sign, redact' },
  forms: { label: 'Forms', description: 'Fill, create, flatten forms' },
  ocr: { label: 'OCR', description: 'Make scanned PDFs searchable' },
  misc: { label: 'Other', description: 'Compare, extract, convert sizes' },
};

export interface OptionsFormProps<TOptions> {
  value: TOptions;
  onChange: (next: TOptions) => void;
  fileNames: string[];
}

export interface ToolDefinition<TOptions> {
  id: string;
  category: ToolCategory;
  title: string;
  description: string;
  Icon: LucideIcon;
  acceptMimes: string[];
  acceptExtensions: string[];
  multiple: boolean;
  minFiles: number;
  maxFiles: number;
  endpoint: string;
  fileFieldName: 'file' | 'files';
  // zod 4 dropped the 3-generic ZodType<Output, Def, Input> form.
  schema: ZodType<TOptions, unknown>;
  defaultOptions: TOptions;
  OptionsForm: ComponentType<OptionsFormProps<TOptions>>;
  responseType: 'binary' | 'multi-files' | 'text' | 'json';
  outputFilename?: (inputs: string[]) => string;
}

export type AnyToolDefinition = ToolDefinition<unknown>;
