import { z } from 'zod';
import { PageRangeStringSchema } from './page-range.js';

export const MergeOptionsSchema = z.object({
  outputFilename: z.string().min(1).max(200).optional(),
});
export type MergeOptions = z.infer<typeof MergeOptionsSchema>;

export const SplitModeSchema = z.enum(['ranges', 'each']);
export type SplitMode = z.infer<typeof SplitModeSchema>;

export const SplitOptionsSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('ranges'),
    ranges: z.array(PageRangeStringSchema).min(1),
  }),
  z.object({
    mode: z.literal('each'),
  }),
]);
export type SplitOptions = z.infer<typeof SplitOptionsSchema>;

export const RotateAngleSchema = z.union([z.literal(90), z.literal(180), z.literal(270)]);
export type RotateAngle = z.infer<typeof RotateAngleSchema>;

export const RotateOptionsSchema = z.object({
  angle: RotateAngleSchema,
  pages: PageRangeStringSchema.optional(),
});
export type RotateOptions = z.infer<typeof RotateOptionsSchema>;

export const RemovePagesOptionsSchema = z.object({
  pages: PageRangeStringSchema,
});
export type RemovePagesOptions = z.infer<typeof RemovePagesOptionsSchema>;

export const ExtractPagesOptionsSchema = z.object({
  pages: PageRangeStringSchema,
});
export type ExtractPagesOptions = z.infer<typeof ExtractPagesOptionsSchema>;

export const ReorderOptionsSchema = z.object({
  order: z.array(z.number().int().positive()).min(1),
});
export type ReorderOptions = z.infer<typeof ReorderOptionsSchema>;
