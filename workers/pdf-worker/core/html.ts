import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

export interface PdfMargin {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

export interface HtmlRenderOptions {
  /** e.g. 'A4', 'Letter' */
  format?: 'A4' | 'Letter' | 'Legal';
  printBackground?: boolean;
  margin?: PdfMargin;
  /** Max time for page load + network idle (ms). */
  navigationTimeoutMs?: number;
  /** Explicit Chromium/Chrome binary; overrides auto-resolution. */
  executablePath?: string;
}

const DEFAULT_OPTIONS = {
  format: 'A4' as const,
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
  navigationTimeoutMs: 30_000,
};

/** Resolve Chromium/Chrome from the environment or common install paths. */
export function resolveChromiumPath(): string | null {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  for (const path of [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  ]) {
    if (existsSync(path)) return path;
  }

  return null;
}

/** Render a complete HTML document to PDF bytes. */
export async function renderHtmlToPdf(
  html: string,
  options: HtmlRenderOptions = {},
): Promise<Buffer> {
  const executablePath = options.executablePath ?? resolveChromiumPath();
  if (!executablePath) {
    throw new Error(
      'No Chromium/Chrome found. Set PUPPETEER_EXECUTABLE_PATH to the browser binary.',
    );
  }

  const resolved = {
    ...DEFAULT_OPTIONS,
    ...options,
    margin: { ...DEFAULT_OPTIONS.margin, ...options.margin },
  };

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: resolved.navigationTimeoutMs,
    });
    const pdf = await page.pdf({
      format: resolved.format,
      printBackground: resolved.printBackground,
      margin: resolved.margin,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
