import {
  PDFCheckBox,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
} from 'pdf-lib';
import type { FormsFillOptions, FormFieldValue } from '@pdf-everything/types';
import { loadPdf, savePdf } from '../shared/load.js';

export type { FormsFillOptions, FormFieldValue };

export async function fillForm(
  input: Buffer | Uint8Array,
  opts: FormsFillOptions,
): Promise<{ pdf: Buffer; filled: string[]; missing: string[] }> {
  const doc = await loadPdf(input);
  const form = doc.getForm();
  const filled: string[] = [];
  const missing: string[] = [];

  for (const [name, value] of Object.entries(opts.fields)) {
    let field: ReturnType<typeof form.getFieldMaybe>;
    try {
      field = form.getFieldMaybe(name);
    } catch {
      field = undefined;
    }
    if (!field) {
      missing.push(name);
      continue;
    }
    if (field instanceof PDFTextField && typeof value === 'string') {
      field.setText(value);
      filled.push(name);
    } else if (field instanceof PDFCheckBox && typeof value === 'boolean') {
      if (value) field.check();
      else field.uncheck();
      filled.push(name);
    } else if (field instanceof PDFRadioGroup && typeof value === 'string') {
      field.select(value);
      filled.push(name);
    } else if (field instanceof PDFDropdown && typeof value === 'string') {
      field.select(value);
      filled.push(name);
    } else if (field instanceof PDFOptionList && Array.isArray(value)) {
      field.select(value);
      filled.push(name);
    } else {
      missing.push(name);
    }
  }

  if (opts.flatten) form.flatten();

  return { pdf: await savePdf(doc), filled, missing };
}
