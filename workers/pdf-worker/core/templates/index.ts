import { githubTemplate } from './github.js';
import { academicTemplate } from './academic.js';
import { rcaPostProcess, rcaTemplate } from './rca.js';

export type TemplateName = 'github' | 'academic' | 'rca';
/** `bodyHtml` is markup; `title` is plain text, which the template escapes. */
export type TemplateFunction = (bodyHtml: string, title: string) => string;

export const TEMPLATES: Record<TemplateName, TemplateFunction> = {
  github: githubTemplate,
  academic: academicTemplate,
  rca: rcaTemplate,
};

/** Trusted markup adjustments a template runs after its document loads. */
export const TEMPLATE_POST_PROCESS: Partial<Record<TemplateName, () => void>> = {
  rca: rcaPostProcess,
};

export const TEMPLATE_NAMES = Object.keys(TEMPLATES) as TemplateName[];

export function isTemplateName(value: unknown): value is TemplateName {
  return typeof value === 'string' && Object.hasOwn(TEMPLATES, value);
}
