import { z } from 'zod';

export const ProblemSchema = z.object({
  type: z.string().url().or(z.literal('about:blank')),
  title: z.string(),
  status: z.number().int().min(100).max(599),
  detail: z.string().optional(),
  instance: z.string().optional(),
  errors: z.array(z.unknown()).optional(),
});
export type Problem = z.infer<typeof ProblemSchema>;
