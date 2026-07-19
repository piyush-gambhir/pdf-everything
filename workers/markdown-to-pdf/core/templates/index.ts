import { githubTemplate } from './github.js';
import { academicTemplate } from './academic.js';
import { rcaTemplate } from './rca.js';

export type TemplateName = 'github' | 'academic' | 'rca';
export type TemplateFunction = (bodyHtml: string, title: string) => string;

export const TEMPLATES: Record<TemplateName, TemplateFunction> = {
  github: githubTemplate,
  academic: academicTemplate,
  rca: rcaTemplate,
};

export const TEMPLATE_NAMES = Object.keys(TEMPLATES) as TemplateName[];

export function isTemplateName(s: string): s is TemplateName {
  return s in TEMPLATES;
}
