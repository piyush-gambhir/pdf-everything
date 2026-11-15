import { marked } from 'marked';
import { renderHtmlToPdf, type HtmlRenderOptions, type RenderRuntime } from './html.js';
import {
  TEMPLATES,
  TEMPLATE_POST_PROCESS,
  isTemplateName,
  type TemplateName,
} from './templates/index.js';

export type { TemplateName };

export interface MarkdownRenderOptions extends HtmlRenderOptions {
  template?: TemplateName;
  title?: string;
}

const DEFAULT_OPTIONS = {
  template: 'github' as TemplateName,
  margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
};

export async function renderMarkdownToPdf(
  markdown: string,
  options: MarkdownRenderOptions = {},
  runtime: RenderRuntime = {},
): Promise<Buffer> {
  const templateName = options.template ?? DEFAULT_OPTIONS.template;
  if (!isTemplateName(templateName)) {
    throw new Error(`Unknown template "${templateName}". Valid templates: github, academic, rca.`);
  }

  const bodyHtml = await marked(markdown, { async: true });
  const html = TEMPLATES[templateName](bodyHtml, options.title ?? 'Document');
  const { template: _template, title: _title, ...htmlOptions } = options;

  return renderHtmlToPdf(
    html,
    { ...htmlOptions, margin: { ...DEFAULT_OPTIONS.margin, ...options.margin } },
    { ...runtime, postProcess: TEMPLATE_POST_PROCESS[templateName] },
  );
}
