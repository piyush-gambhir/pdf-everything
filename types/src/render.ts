import { z } from 'zod';

const PdfFormatSchema = z.enum(['A4', 'Letter', 'Legal']);
const PdfMarginSchema = z.object({
  top: z.string().optional(),
  right: z.string().optional(),
  bottom: z.string().optional(),
  left: z.string().optional(),
});

const BrowserPdfOptionsSchema = z.object({
  format: PdfFormatSchema.default('A4'),
  printBackground: z.boolean().default(true),
  margin: PdfMarginSchema.optional(),
  navigationTimeoutMs: z.number().int().min(1000).max(120000).default(30000),
});

export const HtmlToPdfRequestSchema = BrowserPdfOptionsSchema.extend({
  html: z.string().min(1).max(5_000_000),
});
export type HtmlToPdfRequest = z.infer<typeof HtmlToPdfRequestSchema>;

export const MarkdownToPdfRequestSchema = BrowserPdfOptionsSchema.extend({
  markdown: z.string().min(1).max(5_000_000),
  template: z.enum(['github', 'academic', 'rca']).default('github'),
  title: z.string().max(500).default('Document'),
});
export type MarkdownToPdfRequest = z.infer<typeof MarkdownToPdfRequestSchema>;
