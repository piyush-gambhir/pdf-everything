import {
  PDFButton,
  PDFCheckBox,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFSignature,
  PDFTextField,
} from 'pdf-lib';
import { loadPdf } from '../shared/load.js';

import type { FormFieldInfo, FormFieldType } from '@pdf-everything/types';

export type { FormFieldInfo, FormFieldType };

export async function extractFormData(input: Buffer | Uint8Array): Promise<FormFieldInfo[]> {
  const doc = await loadPdf(input);
  const form = doc.getForm();
  const fields = form.getFields();

  return fields.map((field) => {
    const name = field.getName();
    if (field instanceof PDFTextField) {
      return { name, type: 'text', value: field.getText() ?? null };
    }
    if (field instanceof PDFCheckBox) {
      return { name, type: 'checkbox', value: field.isChecked() };
    }
    if (field instanceof PDFRadioGroup) {
      return {
        name,
        type: 'radio-group',
        value: field.getSelected() ?? null,
        options: field.getOptions(),
      };
    }
    if (field instanceof PDFDropdown) {
      return {
        name,
        type: 'dropdown',
        value: field.getSelected()[0] ?? null,
        options: field.getOptions(),
      };
    }
    if (field instanceof PDFOptionList) {
      return {
        name,
        type: 'option-list',
        value: field.getSelected(),
        options: field.getOptions(),
      };
    }
    if (field instanceof PDFButton) {
      return { name, type: 'button', value: null };
    }
    if (field instanceof PDFSignature) {
      return { name, type: 'signature', value: null };
    }
    return { name, type: 'unknown', value: null };
  });
}
