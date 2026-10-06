import { existsSync } from 'node:fs';
import puppeteer, { type Browser, type HTTPRequest } from 'puppeteer-core';

export type PdfFormat = 'A4' | 'Letter' | 'Legal';

export interface PdfMargin {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

/**
 * The page settings a caller may choose. Nothing else from a request reaches
 * Chromium: operator settings live in {@link RenderRuntime}.
 */
export interface HtmlRenderOptions {
  format?: PdfFormat;
  printBackground?: boolean;
  /** Honor the document's CSS `@page` size instead of forcing `format`. */
  preferCssPageSize?: boolean;
  margin?: PdfMargin;
  /** Max time for loading the document (ms). The render deadline still applies. */
  navigationTimeoutMs?: number;
}

/** Bounds on one render. Exceeding any of them fails the render. */
export interface RenderLimits {
  /** Most pages a PDF may have. */
  maxPages: number;
  /** Largest PDF, in bytes. */
  maxOutputBytes: number;
  /** Whole-render deadline (browser launch to PDF bytes), in ms. */
  deadlineMs: number;
}

export const DEFAULT_LIMITS: RenderLimits = {
  maxPages: 200,
  maxOutputBytes: 25 * 1024 * 1024,
  deadlineMs: 50_000,
};

/** Operator and library settings. Never taken from a request body. */
export interface RenderRuntime {
  /** Explicit Chromium/Chrome binary; overrides auto-resolution. */
  executablePath?: string;
  limits?: Partial<RenderLimits>;
  /**
   * Trusted DOM post-processing, run through DevTools after the document loads.
   * Scripts inside the document never run; this is how a built-in template
   * adjusts its own markup.
   */
  postProcess?: () => void;
}

export type RenderErrorCode = 'page_limit_exceeded' | 'output_too_large' | 'render_timeout';

/** A render stopped by one of its {@link RenderLimits}. */
export class RenderLimitError extends Error {
  constructor(
    readonly code: RenderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RenderLimitError';
  }
}

const DEFAULT_OPTIONS = {
  format: 'A4' as const,
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
  navigationTimeoutMs: 30_000,
};

/**
 * Chromium flags. Besides request interception (below), every connection is
 * sent to a closed local proxy port and every host name fails to resolve, so a
 * request that somehow escapes interception (a preconnect, a DNS prefetch)
 * still reaches nothing. DevTools runs over a pipe, not a debugging port.
 */
const CHROMIUM_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--no-zygote',
  '--proxy-server=127.0.0.1:9',
  '--proxy-bypass-list=<-loopback>',
  '--host-resolver-rules=MAP * ~NOTFOUND',
];

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

/**
 * Count the page objects of a Chromium-generated PDF (Chromium never compresses
 * them into object streams). Strings, comments and stream contents are skipped,
 * so a title that reads "/Type /Page" is not a page.
 */
export function countPdfPages(pdf: Buffer): number {
  const text = pdf.toString('latin1');
  const isLetter = (char: string | undefined) => char !== undefined && /[A-Za-z]/.test(char);
  let pages = 0;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (char === '%') {
      while (i < text.length && text[i] !== '\n' && text[i] !== '\r') i++;
    } else if (char === '(') {
      let depth = 1;
      i++;
      while (i < text.length && depth > 0) {
        if (text[i] === '\\') i++;
        else if (text[i] === '(') depth++;
        else if (text[i] === ')') depth--;
        i++;
      }
    } else if (char === '<' && text[i + 1] === '<') {
      i += 2; // a dictionary opens
    } else if (char === '<') {
      const end = text.indexOf('>', i);
      i = end === -1 ? text.length : end + 1;
    } else if (
      text.startsWith('stream', i) &&
      !isLetter(text[i - 1]) &&
      (text[i + 6] === '\r' || text[i + 6] === '\n')
    ) {
      // Skip the body by its declared /Length: binary data may itself hold
      // the bytes "endstream". Chromium writes the length directly; an
      // indirect or missing one falls back to the terminator.
      const dictionary = text.slice(text.lastIndexOf(' obj', i), i);
      const length = /\/Length\s+(\d+)(?!\d)(?!\s+\d+\s+R)/.exec(dictionary);
      const bodyStart = i + 6 + (text[i + 6] === '\r' && text[i + 7] === '\n' ? 2 : 1);
      if (length) {
        i = bodyStart + Number(length[1]);
      } else {
        const end = text.indexOf('endstream', bodyStart);
        i = end === -1 ? text.length : end + 'endstream'.length;
      }
    } else if (text.startsWith('/Type', i)) {
      if (/^\/Type\s*\/Page(?![A-Za-z0-9#])/.test(text.slice(i, i + 24))) pages++;
      i += '/Type'.length;
    } else {
      i++;
    }
  }
  return pages;
}

/**
 * The document loads with no network: data: URIs load; a navigation (a meta
 * refresh, a frame) is answered with 204 so the document stays in place; every
 * other request is aborted.
 */
function blockNetwork(request: HTTPRequest): void {
  if (request.isInterceptResolutionHandled()) return;
  if (request.url().startsWith('data:')) {
    void request.continue();
  } else if (request.isNavigationRequest()) {
    void request.respond({ status: 204, body: '' });
  } else {
    void request.abort('blockedbyclient');
  }
}

/**
 * Close gracefully, or kill: aborting the launch signal makes Puppeteer
 * SIGKILL Chromium's whole process group, renderers included.
 */
async function closeBrowser(browser: Browser, kill: AbortController): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const gaveUp = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), 5_000);
  });
  const outcome = await Promise.race([browser.close().catch(() => 'closed'), gaveUp]);
  clearTimeout(timer);
  if (outcome === 'timeout') kill.abort();
}

/**
 * Render a complete HTML document to PDF bytes.
 *
 * Scripts in the document do not run and nothing is fetched over the network:
 * embed images and fonts as data: URIs.
 */
export async function renderHtmlToPdf(
  html: string,
  options: HtmlRenderOptions = {},
  runtime: RenderRuntime = {},
): Promise<Buffer> {
  const executablePath = runtime.executablePath ?? resolveChromiumPath();
  if (!executablePath) {
    throw new Error(
      'No Chromium/Chrome found. Set PUPPETEER_EXECUTABLE_PATH to the browser binary.',
    );
  }

  const limits: RenderLimits = {
    maxPages: runtime.limits?.maxPages ?? DEFAULT_LIMITS.maxPages,
    maxOutputBytes: runtime.limits?.maxOutputBytes ?? DEFAULT_LIMITS.maxOutputBytes,
    deadlineMs: runtime.limits?.deadlineMs ?? DEFAULT_LIMITS.deadlineMs,
  };
  const resolved = {
    ...DEFAULT_OPTIONS,
    ...options,
    margin: { ...DEFAULT_OPTIONS.margin, ...options.margin },
  };
  const startedAt = Date.now();
  const remainingMs = () => Math.max(1, limits.deadlineMs - (Date.now() - startedAt));

  let browser: Browser | undefined;
  // Aborting kills Chromium's process group, even while it is still starting.
  const kill = new AbortController();

  const render = async (): Promise<Buffer> => {
    const launched = await puppeteer.launch({
      executablePath,
      headless: true,
      pipe: true,
      args: CHROMIUM_ARGS,
      signal: kill.signal,
      timeout: limits.deadlineMs,
      protocolTimeout: limits.deadlineMs,
    });
    browser = launched;

    const page = await launched.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', blockNetwork);

    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: Math.min(resolved.navigationTimeoutMs, remainingMs()),
    });
    if (runtime.postProcess) await page.evaluate(runtime.postProcess);

    // Print at most one page past the cap: enough to detect an oversized
    // document without laying out all of it.
    const pdf = Buffer.from(
      await page.pdf({
        format: resolved.format,
        printBackground: resolved.printBackground,
        preferCSSPageSize: resolved.preferCssPageSize,
        margin: resolved.margin,
        pageRanges: `1-${limits.maxPages + 1}`,
        timeout: remainingMs(),
      }),
    );

    if (countPdfPages(pdf) > limits.maxPages) {
      throw new RenderLimitError(
        'page_limit_exceeded',
        `The document has more than ${limits.maxPages} pages.`,
      );
    }
    if (pdf.length > limits.maxOutputBytes) {
      throw new RenderLimitError(
        'output_too_large',
        `The PDF is ${pdf.length} bytes; the limit is ${limits.maxOutputBytes}.`,
      );
    }
    return pdf;
  };

  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      kill.abort();
      reject(
        new RenderLimitError(
          'render_timeout',
          `The render did not finish within ${limits.deadlineMs} ms.`,
        ),
      );
    }, limits.deadlineMs);
  });

  const rendering = render();
  // After the deadline wins, the abandoned render may still reject.
  rendering.catch(() => undefined);

  try {
    return await Promise.race([rendering, deadline]);
  } finally {
    clearTimeout(timer);
    if (kill.signal.aborted) {
      // The deadline already killed it.
    } else if (browser) {
      await closeBrowser(browser, kill);
    } else {
      kill.abort();
    }
  }
}
