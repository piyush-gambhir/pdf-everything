import { z } from 'zod';

export const PageRangeStringSchema = z
  .string()
  .min(1)
  .regex(/^(\d+(-\d+)?)(,\s*\d+(-\d+)?)*$/, 'Use "1-3,5,7-9" format');

export type PageRangeString = z.infer<typeof PageRangeStringSchema>;

export function parsePageRange(input: string, totalPages: number): number[] {
  const pages = new Set<number>();
  for (const part of input.split(',').map((p) => p.trim())) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = Number(startStr);
      const end = Number(endStr);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
        throw new Error(`Invalid range "${part}"`);
      }
      for (let i = start; i <= Math.min(end, totalPages); i++) pages.add(i);
    } else {
      const n = Number(part);
      if (!Number.isInteger(n) || n < 1) throw new Error(`Invalid page "${part}"`);
      if (n <= totalPages) pages.add(n);
    }
  }
  return [...pages].sort((a, b) => a - b);
}
