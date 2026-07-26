import { describe, expect, it } from 'vitest';
import { resolveChromiumPath } from '../../core/html.js';
import { TEMPLATE_NAMES, TEMPLATES, isTemplateName } from '../../core/templates/index.js';

describe('browser renderer core', () => {
  it('resolves Chromium to null or a string', () => {
    const path = resolveChromiumPath();
    expect(path === null || typeof path === 'string').toBe(true);
  });
});

describe('Markdown template registry', () => {
  it('exports all expected template names', () => {
    expect(TEMPLATE_NAMES).toEqual(expect.arrayContaining(['github', 'academic', 'rca']));
    expect(TEMPLATE_NAMES).toHaveLength(3);
  });

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

  it('the RCA template includes its post-processing script', () => {
    const html = TEMPLATES.rca('<p>Hello</p>', 'Test');
    expect(html).toContain('<script>');
    expect(html).toContain('meta-table');
    expect(html).toContain('rc-callout');
  });
});
