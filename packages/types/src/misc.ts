import { z } from 'zod';
import { PageRangeStringSchema } from './page-range.js';
import { PageSizeSchema, OrientationSchema } from './convert.js';

export const ResizePagesOptionsSchema = z.object({
  scale: z.number().min(0.1).max(4).default(1),
  pages: PageRangeStringSchema.optional(),
});
export type ResizePagesOptions = z.infer<typeof ResizePagesOptionsSchema>;

export const PageSizeConvertOptionsSchema = z.object({
  targetSize: PageSizeSchema.exclude(['auto']),
  orientation: OrientationSchema.exclude(['auto']).default('portrait'),
  fitMode: z.enum(['scale', 'box-only']).default('scale'),
  pages: PageRangeStringSchema.optional(),
});
export type PageSizeConvertOptions = z.infer<typeof PageSizeConvertOptionsSchema>;

export const CropOptionsSchema = z.object({
  marginPoints: z.object({
    top: z.number().min(0).default(0),
    right: z.number().min(0).default(0),
    bottom: z.number().min(0).default(0),
    left: z.number().min(0).default(0),
  }),
  pages: PageRangeStringSchema.optional(),
});
export type CropOptions = z.infer<typeof CropOptionsSchema>;
