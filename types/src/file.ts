import { z } from 'zod';

export const FileMetaSchema = z.object({
  id: z.string().min(1),
  sha256: z.string().length(64),
  size: z.number().int().nonnegative(),
  mime: z.string(),
  originalName: z.string(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});
export type FileMeta = z.infer<typeof FileMetaSchema>;

export const FileRefSchema = z.object({
  fileId: z.string().min(1),
});
export type FileRef = z.infer<typeof FileRefSchema>;

export const FileRefsInputSchema = z.object({
  fileIds: z.array(z.string().min(1)).min(1),
});
export type FileRefsInput = z.infer<typeof FileRefsInputSchema>;
