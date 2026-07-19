import { z } from 'zod';

export const PageSizeSchema = z.enum(['a4', 'a3', 'a5', 'letter', 'legal', 'auto']);
export type PageSize = z.infer<typeof PageSizeSchema>;

export const OrientationSchema = z.enum(['portrait', 'landscape', 'auto']);
export type Orientation = z.infer<typeof OrientationSchema>;

export const ImagesToPdfOptionsSchema = z.object({
  pageSize: PageSizeSchema.default('a4'),
  orientation: OrientationSchema.default('auto'),
  margin: z.number().int().min(0).max(144).default(20),
  fit: z.enum(['contain', 'cover', 'stretch']).default('contain'),
});
export type ImagesToPdfOptions = z.infer<typeof ImagesToPdfOptionsSchema>;

export const ExtractTextOptionsSchema = z.object({
  preserveBlankLines: z.boolean().default(false),
});
export type ExtractTextOptions = z.infer<typeof ExtractTextOptionsSchema>;
