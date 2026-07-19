import { z } from 'zod';

export const FormFieldValueSchema = z.union([
  z.string(),
  z.boolean(),
  z.array(z.string()),
]);
export type FormFieldValue = z.infer<typeof FormFieldValueSchema>;

export const FormsFillOptionsSchema = z.object({
  fields: z.record(z.string(), FormFieldValueSchema),
  flatten: z.boolean().default(false),
});
export type FormsFillOptions = z.infer<typeof FormsFillOptionsSchema>;

export const FormFieldTypeSchema = z.enum([
  'text',
  'checkbox',
  'radio-group',
  'dropdown',
  'option-list',
  'button',
  'signature',
  'unknown',
]);
export type FormFieldType = z.infer<typeof FormFieldTypeSchema>;

export const FormFieldInfoSchema = z.object({
  name: z.string(),
  type: FormFieldTypeSchema,
  value: z.union([z.string(), z.boolean(), z.array(z.string()), z.null()]),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
});
export type FormFieldInfo = z.infer<typeof FormFieldInfoSchema>;

export const FormsExtractResponseSchema = z.object({
  fields: z.array(FormFieldInfoSchema),
});
export type FormsExtractResponse = z.infer<typeof FormsExtractResponseSchema>;
