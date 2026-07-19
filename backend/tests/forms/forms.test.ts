import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { fillForm } from '../../src/pdf-core/forms/fill.js';
import { flattenForm } from '../../src/pdf-core/forms/flatten.js';
import { extractFormData } from '../../src/pdf-core/forms/extract-data.js';

async function makeFormPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 300]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const form = doc.getForm();

  const name = form.createTextField('user.name');
  name.addToPage(page, { x: 50, y: 200, width: 200, height: 20, font });

  const subscribe = form.createCheckBox('user.subscribe');
  subscribe.addToPage(page, { x: 50, y: 150, width: 16, height: 16 });

  const country = form.createDropdown('user.country');
  country.setOptions(['US', 'UK', 'IN']);
  country.addToPage(page, { x: 50, y: 100, width: 200, height: 20, font });

  return Buffer.from(await doc.save());
}

describe('forms', () => {
  it('fillForm fills text + checkbox + dropdown', async () => {
    const src = await makeFormPdf();
    const { pdf, filled, missing } = await fillForm(src, {
      fields: { 'user.name': 'Alice', 'user.subscribe': true, 'user.country': 'IN' },
    });
    expect(filled).toEqual(['user.name', 'user.subscribe', 'user.country']);
    expect(missing).toEqual([]);

    const data = await extractFormData(pdf);
    const byName = Object.fromEntries(data.map((d) => [d.name, d]));
    expect(byName['user.name']!.value).toBe('Alice');
    expect(byName['user.subscribe']!.value).toBe(true);
    expect(byName['user.country']!.value).toBe('IN');
  });

  it('extractFormData lists fields and types', async () => {
    const src = await makeFormPdf();
    const fields = await extractFormData(src);
    expect(fields).toHaveLength(3);
    expect(fields.find((f) => f.name === 'user.name')?.type).toBe('text');
    expect(fields.find((f) => f.name === 'user.subscribe')?.type).toBe('checkbox');
    expect(fields.find((f) => f.name === 'user.country')?.type).toBe('dropdown');
  });

  it('flattenForm removes interactivity', async () => {
    const src = await makeFormPdf();
    const out = await flattenForm(src);
    const doc = await PDFDocument.load(out);
    expect(doc.getForm().getFields()).toHaveLength(0);
  });

  it('fillForm reports missing fields', async () => {
    const src = await makeFormPdf();
    const { missing } = await fillForm(src, {
      fields: { 'user.name': 'Bob', nonexistent: 'x' },
    });
    expect(missing).toEqual(['nonexistent']);
  });
});
