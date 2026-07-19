import { z } from 'zod';
import { PageRangeStringSchema } from './page-range.js';

export const PositionSchema = z.enum([
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'middle-center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]);
export type Position = z.infer<typeof PositionSchema>;

export const WatermarkOptionsSchema = z.object({
  text: z.string().min(1).max(200),
  position: PositionSchema.default('middle-center'),
  fontSize: z.number().int().min(8).max(400).default(60),
  opacity: z.number().min(0.05).max(1).default(0.25),
  rotation: z.number().min(-180).max(180).default(-45),
  pages: PageRangeStringSchema.optional(),
});
export type WatermarkOptions = z.infer<typeof WatermarkOptionsSchema>;

export const PageNumberFormatSchema = z.enum(['n', 'n_of_m', 'page_n', 'page_n_of_m']);
export type PageNumberFormat = z.infer<typeof PageNumberFormatSchema>;

export const PageNumberOptionsSchema = z.object({
  format: PageNumberFormatSchema.default('page_n_of_m'),
  position: PositionSchema.default('bottom-center'),
  fontSize: z.number().int().min(6).max(72).default(11),
  margin: z.number().int().min(0).max(200).default(28),
  startNumber: z.number().int().min(1).default(1),
  pages: PageRangeStringSchema.optional(),
});
export type PageNumberOptions = z.infer<typeof PageNumberOptionsSchema>;

export const MetadataOptionsSchema = z.object({
  title: z.string().max(500).optional(),
  author: z.string().max(200).optional(),
  subject: z.string().max(500).optional(),
  keywords: z.array(z.string().min(1).max(100)).max(50).optional(),
  producer: z.string().max(200).optional(),
  creator: z.string().max(200).optional(),
});
export type MetadataOptions = z.infer<typeof MetadataOptionsSchema>;
