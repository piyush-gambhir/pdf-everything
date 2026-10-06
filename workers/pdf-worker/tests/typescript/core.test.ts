import { describe, expect, it } from 'vitest';
import { countPdfPages } from '../../core/html.js';
import {
  TEMPLATE_NAMES,
  TEMPLATE_POST_PROCESS,
  TEMPLATES,
  isTemplateName,
} from '../../core/templates/index.js';

describe('Markdown template registry', () => {
  it('accepts valid template names', () => {
    expect(isTemplateName('github')).toBe(true);
    expect(isTemplateName('academic')).toBe(true);
    expect(isTemplateName('rca')).toBe(true);
  });

  it('rejects unknown template names', () => {
    expect(isTemplateName('corporate')).toBe(false);
    expect(isTemplateName('')).toBe(false);
    expect(isTemplateName('GITHUB')).toBe(false);
    expect(isTemplateName('toString')).toBe(false);
    expect(isTemplateName(null)).toBe(false);
  });

  it.each(TEMPLATE_NAMES)('%s returns a complete HTML document', (name) => {
    const html = TEMPLATES[name]('<p>Hello</p>', 'Test Title');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>Test Title</title>');
    expect(html).toContain('<p>Hello</p>');
  });

  it('the RCA template carries no page script; its markup pass is a trusted post-process', () => {
    const html = TEMPLATES.rca('<p>Hello</p>', 'Test');
    expect(html).not.toContain('<script');
    expect(html).toContain('meta-table');
    expect(html).toContain('rc-callout');
    expect(TEMPLATE_POST_PROCESS.rca).toBeTypeOf('function');
  });
});

describe('countPdfPages', () => {
  it('counts page objects, not the page tree', () => {
    const pdf = Buffer.from(
      '<< /Type /Pages /Count 2 >>\n<< /Type /Page /Parent 1 0 R >>\n<</Type/Page>>',
    );
    expect(countPdfPages(pdf)).toBe(2);
  });

  it('ignores the words in strings, comments and streams', () => {
    const pdf = Buffer.from(
      [
        '%PDF-1.4 /Type /Page',
        '1 0 obj << /Title (Understanding /Type /Page \\) (nested /Type /Page)) >> endobj',
        '2 0 obj << /Author <2F54797065202F50616765> >> endobj',
        '3 0 obj << /Length 20 >>\nstream\n/Type /Page /Type /Page\nendstream\nendobj',
        '4 0 obj << /Type /Page >> endobj',
      ].join('\n'),
    );
    expect(countPdfPages(pdf)).toBe(1);
  });
});
