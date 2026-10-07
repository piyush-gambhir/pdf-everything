import { existsSync } from 'node:fs';
import puppeteer, { type Browser, type HTTPRequest, type Page } from 'puppeteer-core';

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
  /** Whole-render deadline (waiting for the browser to PDF bytes), in ms. */
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
 * Printing needs no GPU process: on a host without a GPU or a working
 * software renderer (AWS Lambda), Chromium otherwise starts and loses two to
 * four of them on every launch.
 */
const CHROMIUM_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--no-zygote',
  '--disable-gpu',
  '--disable-software-rasterizer',
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

/** How long a browser may take to start, and a page to close. */
const LAUNCH_TIMEOUT_MS = DEFAULT_LIMITS.deadlineMs;
const CLOSE_TIMEOUT_MS = 5_000;

/**
 * One Chromium per process, launched on first use (or by {@link prepareBrowser})
 * and shared by every render; each render prints from its own page, closed
 * afterwards. The pages share the default browser context: with scripts off and
 * no network a document can neither leave state for the next nor read any, and
 * a fresh context per render cost about 0.7 s on AWS Lambda. Aborting `kill`
 * makes Puppeteer SIGKILL Chromium's whole process group, renderers included,
 * even while it is still starting.
 */
interface SharedBrowser {
  executablePath: string;
  browser: Promise<Browser>;
  kill: AbortController;
}

let shared: SharedBrowser | undefined;

function forget(entry: SharedBrowser): void {
  if (shared === entry) shared = undefined;
}

function discard(entry: SharedBrowser): void {
  forget(entry);
  entry.kill.abort();
}

/** The shared browser for this binary, launching it if there is none. */
function sharedBrowser(executablePath: string): SharedBrowser {
  if (shared?.executablePath === executablePath) return shared;
  if (shared) discard(shared);

  const kill = new AbortController();
  const entry: SharedBrowser = {
    executablePath,
    kill,
    browser: puppeteer.launch({
      executablePath,
      headless: true,
      pipe: true,
      args: CHROMIUM_ARGS,
      signal: kill.signal,
      timeout: LAUNCH_TIMEOUT_MS,
      // The browser outlives any one render, so it must not change how the
      // host process answers these signals; Chromium exits with its pipe.
      handleSIGTERM: false,
      handleSIGHUP: false,
    }),
  };
  shared = entry;
  // A browser that dies or never starts is relaunched by the next render.
  entry.browser.then(
    (browser) => {
      browser.once('disconnected', () => discard(entry));
      if (!browser.connected) discard(entry);
    },
    () => discard(entry),
  );
  return entry;
}

/**
 * A new page on the shared browser. A browser that failed to start (a warm-up
 * frozen with its Lambda environment times out on thaw) or has died, even one
 * whose death Puppeteer has yet to notice, is replaced once.
 */
async function openPage(executablePath: string): Promise<{ page: Page; entry: SharedBrowser }> {
  for (let attempt = 1; ; attempt++) {
    const entry = sharedBrowser(executablePath);
    try {
      return { page: await (await entry.browser).newPage(), entry };
    } catch (error) {
      const browser = await entry.browser.catch(() => undefined);
      if (attempt === 2 || browser?.connected) throw error;
      discard(entry);
    }
  }
}

/** Resolve the browser binary from the runtime settings or the environment. */
function browserPath(runtime: Pick<RenderRuntime, 'executablePath'>): string {
  const executablePath = runtime.executablePath ?? resolveChromiumPath();
  if (!executablePath) {
    throw new Error(
      'No Chromium/Chrome found. Set PUPPETEER_EXECUTABLE_PATH to the browser binary.',
    );
  }
  return executablePath;
}

/**
 * Start the shared browser ahead of the first render (a server calls this at
 * startup and from its readiness check). Resolves once Chromium is up.
 */
export async function prepareBrowser(
  runtime: Pick<RenderRuntime, 'executablePath'> = {},
): Promise<void> {
  await sharedBrowser(browserPath(runtime)).browser;
}

/** Close the shared browser, if any (a CLI or a test calls this when done). */
export async function shutdownBrowser(): Promise<void> {
  const entry = shared;
  if (!entry) return;
  forget(entry);
  const browser = await entry.browser.catch(() => undefined);
  if (!browser) return;
  if ((await bounded(browser.close(), CLOSE_TIMEOUT_MS)) === 'timeout') entry.kill.abort();
}

/** Settle with the promise's outcome, or 'timeout' after `ms`. */
async function bounded(promise: Promise<unknown>, ms: number): Promise<'done' | 'timeout'> {
  let timer: NodeJS.Timeout | undefined;
  const gaveUp = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), ms);
  });
  const outcome = await Promise.race([
    promise.then(
      () => 'done' as const,
      () => 'done' as const,
    ),
    gaveUp,
  ]);
  clearTimeout(timer);
  return outcome;
}

/**
 * Close one render's page, which ends its renderer. If Chromium cannot, the
 * browser itself is killed and the next render starts a new one.
 */
async function closePage(page: Page, entry: SharedBrowser): Promise<void> {
  if ((await bounded(page.close(), CLOSE_TIMEOUT_MS)) === 'timeout') discard(entry);
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
  const executablePath = browserPath(runtime);
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

  // The page being rendered, once open, and the browser it belongs to.
  let open: { page: Page; entry: SharedBrowser } | undefined;
  let finished = false;

  const render = async (): Promise<Buffer> => {
    const { page, entry } = await openPage(executablePath);
    if (finished) {
      // The deadline passed while the page was opening.
      void closePage(page, entry);
      throw new Error('The render was abandoned.');
    }
    open = { page, entry };
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', blockNetwork);

    // `load` waits for the document's subresources (all data: URIs); fonts
    // that layout requests later are awaited by `page.pdf` (`waitForFonts`).
    await page.setContent(html, {
      waitUntil: 'load',
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
        waitForFonts: true,
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
    finished = true;
    clearTimeout(timer);
    // Closing the page stops a render the deadline abandoned. A render still
    // waiting for the browser leaves the launch running for the next.
    if (open) await closePage(open.page, open.entry);
  }
}
