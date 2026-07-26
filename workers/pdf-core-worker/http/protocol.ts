export const CORE_OPERATIONS = [
  'merge',
  'split',
  'rotate',
  'remove-pages',
  'extract-pages',
  'reorder',
  'crop',
  'watermark',
  'page-numbers',
  'metadata',
  'images-to-pdf',
  'extract-text',
  'resize-pages',
  'page-size-convert',
  'forms-fill',
  'forms-flatten',
  'forms-extract',
] as const;

export type CoreOperation = (typeof CORE_OPERATIONS)[number];

export interface ExecuteRequest {
  files: string[];
  options?: unknown;
}

export type ExecuteResult =
  | { kind: 'pdf'; data: string; meta?: Record<string, unknown> }
  | { kind: 'pdfs'; data: string[] }
  | { kind: 'text'; text: string; meta?: Record<string, unknown> }
  | { kind: 'json'; value: unknown };

export function isCoreOperation(value: string): value is CoreOperation {
  return (CORE_OPERATIONS as readonly string[]).includes(value);
}
