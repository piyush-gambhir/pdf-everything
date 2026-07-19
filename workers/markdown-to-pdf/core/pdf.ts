import { existsSync } from 'node:fs';
import { marked } from 'marked';
import puppeteer from 'puppeteer-core';
import { TEMPLATES, isTemplateName, type TemplateName } from './templates/index.js';

export type { TemplateName };

export interface RenderPdfOptions {
  /** Visual template to apply. Defaults to 'github'. */
  template?: TemplateName;
  /** e.g. 'A4', 'Letter' */
  format?: 'A4' | 'Letter' | 'Legal';
  printBackground?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  /** Document title embedded in the PDF metadata */
  title?: string;
  /** Max time for page load + network idle (ms) */
  navigationTimeoutMs?: number;
  /** Explicit Chromium/Chrome binary; overrides auto-resolution. */
  executablePath?: string;
}

const DEFAULT_OPTS = {
  template: 'github' as TemplateName,
  format: 'A4' as const,
  printBackground: true,
  margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
  navigationTimeoutMs: 30_000,
};

/** Resolve Chromium/Chrome: env first, then common paths. */
export function resolveChromiumPath(): string | null {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  for (const p of [
    // Linux
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome-stable',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  ]) {
    if (existsSync(p)) return p;
  }
  return null;
}

/** Render a Markdown string to PDF bytes using the specified template. */
export async function renderMarkdownToPdf(
  markdown: string,
  options: RenderPdfOptions = {},
): Promise<Buffer> {
  const executablePath = options.executablePath ?? resolveChromiumPath();
  if (!executablePath) {
    throw new Error(
      'No Chromium/Chrome found. Set PUPPETEER_EXECUTABLE_PATH to the browser binary.',
    );
  }

  const templateName = options.template ?? DEFAULT_OPTS.template;
  if (!isTemplateName(templateName)) {
    throw new Error(
      `Unknown template "${templateName}". Valid templates: github, academic, rca.`,
    );
  }

  const o = {
    ...DEFAULT_OPTS,
    ...options,
    margin: { ...DEFAULT_OPTS.margin, ...options.margin },
  };

  const title = options.title ?? 'Document';
  const bodyHtml = await marked(markdown, { async: true });
  const html = TEMPLATES[templateName](bodyHtml, title);

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: o.navigationTimeoutMs,
    });
    const pdf = await page.pdf({
      format: o.format,
      printBackground: o.printBackground,
      margin: o.margin,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
