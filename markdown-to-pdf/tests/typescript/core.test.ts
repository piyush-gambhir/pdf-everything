import { describe, expect, it } from 'vitest';
import { resolveChromiumPath } from '../../core/pdf.js';
import { TEMPLATE_NAMES, isTemplateName, TEMPLATES } from '../../core/templates/index.js';

describe('resolveChromiumPath', () => {
  it('returns null or a string', () => {
    const p = resolveChromiumPath();
    expect(p === null || typeof p === 'string').toBe(true);
  });
});

describe('template registry', () => {
  it('exports all expected template names', () => {
    expect(TEMPLATE_NAMES).toEqual(expect.arrayContaining(['github', 'academic', 'rca']));
    expect(TEMPLATE_NAMES).toHaveLength(3);
  });

  it('isTemplateName accepts valid names', () => {
    expect(isTemplateName('github')).toBe(true);
    expect(isTemplateName('academic')).toBe(true);
    expect(isTemplateName('rca')).toBe(true);
  });

  it('isTemplateName rejects unknown names', () => {
    expect(isTemplateName('corporate')).toBe(false);
    expect(isTemplateName('')).toBe(false);
    expect(isTemplateName('GITHUB')).toBe(false);
  });

  it.each(TEMPLATE_NAMES)('%s template returns a complete HTML document', (name) => {
    const html = TEMPLATES[name]('<p>Hello</p>', 'Test Title');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>Test Title</title>');
    expect(html).toContain('<p>Hello</p>');
  });

  it('rca template injects post-processing script', () => {
    const html = TEMPLATES.rca('<p>Hello</p>', 'Test');
    expect(html).toContain('<script>');
    expect(html).toContain('meta-table');
    expect(html).toContain('rc-callout');
  });
});
