import { BadRequestException } from '@nestjs/common';
import type { z, ZodTypeAny } from 'zod';

export function parseOptions<T extends ZodTypeAny>(raw: unknown, schema: T): z.output<T> {
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
