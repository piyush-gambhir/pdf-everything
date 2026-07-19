import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { editMetadata } from '../../src/edit/metadata.js';
import { makePdf } from '../fixtures.js';

describe('editMetadata', () => {
  it('sets metadata fields', async () => {
    const src = await makePdf(1);
    const out = await editMetadata(src, {
      title: 'Test Title',
      author: 'Jane Doe',
      subject: 'Unit Test',
      keywords: ['pdf', 'test'],
      creator: 'pdf-everything',
    });
    const doc = await PDFDocument.load(out);
    expect(doc.getTitle()).toBe('Test Title');
    expect(doc.getAuthor()).toBe('Jane Doe');
    expect(doc.getSubject()).toBe('Unit Test');
    expect(doc.getKeywords()).toContain('pdf');
    expect(doc.getCreator()).toBe('pdf-everything');
  });

  it('leaves untouched fields alone', async () => {
    const src = await makePdf(1);
    const first = await editMetadata(src, { title: 'First' });
    const second = await editMetadata(first, { author: 'Author Only' });
    const doc = await PDFDocument.load(second);
    expect(doc.getTitle()).toBe('First');
    expect(doc.getAuthor()).toBe('Author Only');
  });
});
