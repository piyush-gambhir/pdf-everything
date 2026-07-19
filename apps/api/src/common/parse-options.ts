import { BadRequestException } from '@nestjs/common';
import type { z, ZodTypeAny } from 'zod';

/**
 * Parses an options payload from either a multipart text field (string) or a
 * JSON body (already-parsed object), then validates with the given zod schema.
 * Returns the schema's OUTPUT type (defaults applied).
 */
export function parseOptions<T extends ZodTypeAny>(
  raw: unknown,
  schema: T,
): z.output<T> {
  let value: unknown = raw ?? {};
  if (typeof value === 'string') {
    if (value.trim().length === 0) {
      value = {};
    } else {
      try {
        value = JSON.parse(value);
      } catch {
        throw new BadRequestException('options field must be valid JSON');
      }
    }
  }
  return schema.parse(value);
}
