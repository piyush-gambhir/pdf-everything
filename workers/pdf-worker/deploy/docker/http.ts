import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import {
  RenderLimitError,
  countPdfPages,
  prepareBrowser,
  renderHtmlToPdf,
  resolveChromiumPath,
  type HtmlRenderOptions,
  type RenderLimits,
  type RenderRuntime,
  type RenderTimings,
} from '../../core/html.js';
import { renderMarkdownToPdf, type MarkdownRenderOptions } from '../../core/markdown.js';
import { InvalidOptionsError, parseHtmlOptions, parseMarkdownOptions } from '../../core/options.js';
import { TEMPLATE_NAMES } from '../../core/templates/index.js';

const DEFAULT_MAX_REQUEST_BYTES = 5 * 1024 * 1024;

/**
 * Renders one process runs at once. Each is a page in the shared Chromium, so
 * a burst would otherwise open pages without bound and exhaust memory. Lambda
 * sends one request at a time and each releases its slot before its response
 * is written, so one-at-a-time callers are never refused.
 */
const DEFAULT_MAX_ACTIVE_RENDERS = 4;

class RequestTooLargeError extends Error {}

interface RenderRequest {
  html?: unknown;
  markdown?: unknown;
  options?: unknown;
}

export interface HttpServerOptions {
  apiToken: string | null;
  port: number;
  maxRequestBytes?: number;
  /** Page, size and time bounds for every render (defaults: DEFAULT_LIMITS). */
  limits?: Partial<RenderLimits>;
  /** Renders at once; one more is refused with 503 (default 4). */
  maxActiveRenders?: number;
  /** Write one JSON line per render to stdout with its step timings (see logRender). */
  logRenderTimings?: boolean;
}

const LIMIT_STATUS: Record<RenderLimitError['code'], number> = {
  page_limit_exceeded: 422,
  output_too_large: 422,
  render_timeout: 504,
};

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let tooLarge = false;

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      if (!tooLarge) chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) {
        reject(new RequestTooLargeError());
        return;
      }
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function unauthorized(res: ServerResponse) {
  json(res, 401, {
    error: 'unauthorized',
    message: 'Invalid or missing Authorization bearer token.',
  });
}

function isAuthorized(req: IncomingMessage, apiToken: string | null): boolean {
  return !apiToken || req.headers.authorization?.trim() === `Bearer ${apiToken}`;
}

/**
 * One line per render, at info level: the route, the outcome (and the step a
 * failure stopped in), whether Chromium was warm, each step's milliseconds, the
 * request's and the PDF's sizes, and the page count. Never document contents.
 */
function logRender(route: 'html' | 'markdown', inputBytes: number, timings: RenderTimings) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ level: 'info', msg: 'render', route, ...timings, inputBytes }));
}

/** The answer to a render request, decided before anything is written. */
type Reply = { status: number; body: unknown } | { pdf: Buffer };

function bad(message: string): Reply {
  return { status: 400, body: { error: 'bad_request', message } };
}

/** Options the request may not set are a 400. */
function refusedOptions(error: unknown): Reply {
  return bad(error instanceof InvalidOptionsError ? error.message : 'Invalid options.');
}

async function rendered(render: () => Promise<Buffer>): Promise<Reply> {
  try {
    return { pdf: await render() };
  } catch (error) {
    if (error instanceof RenderLimitError) {
      return {
        status: LIMIT_STATUS[error.code],
        body: { error: error.code, message: error.message },
      };
    }
    const message = error instanceof Error ? error.message : 'render_failed';
    return { status: 500, body: { error: 'render_failed', message } };
  }
}

function send(res: ServerResponse, reply: Reply): void {
  if ('status' in reply) {
    json(res, reply.status, reply.body);
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Length': reply.pdf.length,
    'Cache-Control': 'no-store',
    'X-PDF-Page-Count': String(countPdfPages(reply.pdf)),
  });
  res.end(reply.pdf);
}

/** HTTP server for browser-based HTML and Markdown PDF rendering. */
export function createHttpServer(opts: HttpServerOptions): Promise<Server> {
  const maxRequestBytes = opts.maxRequestBytes ?? DEFAULT_MAX_REQUEST_BYTES;
  const maxActiveRenders = opts.maxActiveRenders ?? DEFAULT_MAX_ACTIVE_RENDERS;
  const runtime: RenderRuntime = { limits: opts.limits };
  const runtimeFor = (route: 'html' | 'markdown', inputBytes: number): RenderRuntime =>
    opts.logRenderTimings
      ? { ...runtime, onTimings: (timings) => logRender(route, inputBytes, timings) }
      : runtime;
  let activeRenders = 0;

  /** Read, validate and render one request. */
  async function handleRender(req: IncomingMessage, pathname: string): Promise<Reply> {
    let body: RenderRequest;
    let inputBytes: number;
    try {
      const raw = await readBody(req, maxRequestBytes);
      inputBytes = Buffer.byteLength(raw);
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return bad('Body must be a JSON object.');
      }
      body = parsed as RenderRequest;
    } catch (error) {
      if (error instanceof RequestTooLargeError) {
        return {
          status: 413,
          body: {
            error: 'payload_too_large',
            message: `Request body exceeds ${maxRequestBytes} bytes.`,
          },
        };
      }
      return bad('Body must be valid JSON.');
    }

    const hasHtml = 'html' in body;
    const hasMarkdown = 'markdown' in body;
    if (hasHtml && hasMarkdown) {
      return bad('Use exactly one input field: "html" or "markdown".');
    }

    if (pathname === '/v1/render/html') {
      if (hasMarkdown || typeof body.html !== 'string' || body.html.length === 0) {
        return bad('Field "html" is required and must be a non-empty string.');
      }
      const html = body.html;
      let options: HtmlRenderOptions;
      try {
        options = parseHtmlOptions(body.options);
      } catch (error) {
        return refusedOptions(error);
      }
      return rendered(() => renderHtmlToPdf(html, options, runtimeFor('html', inputBytes)));
    }

    if (hasHtml || typeof body.markdown !== 'string' || body.markdown.length === 0) {
      return bad('Field "markdown" is required and must be a non-empty string.');
    }
    const markdown = body.markdown;
    let options: MarkdownRenderOptions;
    try {
      options = parseMarkdownOptions(body.options);
    } catch (error) {
      return refusedOptions(error);
    }
    return rendered(() =>
      renderMarkdownToPdf(markdown, options, runtimeFor('markdown', inputBytes)),
    );
  }

  const server = createServer(async (req, res) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    const method = req.method ?? 'GET';

    if (method === 'GET' && (pathname === '/' || pathname === '/health')) {
      json(res, 200, {
        status: 'ok',
        service: 'pdf-worker',
        operations: ['html-to-pdf', 'markdown-to-pdf'],
      });
      return;
    }

    // Ready once the shared browser is up: the first check waits for the
    // launch, so a platform that gates traffic on it (the Lambda image does)
    // never sends a render to a cold browser.
    if (method === 'GET' && pathname === '/ready') {
      if (!resolveChromiumPath()) {
        json(res, 503, {
          status: 'not_ready',
          message: 'Chromium binary not found (set PUPPETEER_EXECUTABLE_PATH).',
        });
        return;
      }
      try {
        await prepareBrowser();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Chromium did not start.';
        json(res, 503, { status: 'not_ready', message });
        return;
      }
      json(res, 200, { status: 'ready' });
      return;
    }

    if (method === 'GET' && pathname === '/v1/templates') {
      json(res, 200, { templates: TEMPLATE_NAMES });
      return;
    }

    const isRenderRoute =
      method === 'POST' && (pathname === '/v1/render/html' || pathname === '/v1/render/markdown');
    if (!isRenderRoute) {
      json(res, 404, { error: 'not_found' });
      return;
    }

    if (!isAuthorized(req, opts.apiToken)) {
      unauthorized(res);
      return;
    }

    // Refused before the body is read, so a burst holds no memory either.
    if (activeRenders >= maxActiveRenders) {
      res.setHeader('Retry-After', '1');
      json(res, 503, {
        error: 'worker_busy',
        message: `${maxActiveRenders} renders are already running; retry shortly.`,
      });
      return;
    }
    activeRenders++;
    let reply: Reply;
    try {
      reply = await handleRender(req, pathname);
    } finally {
      activeRenders--;
    }
    send(res, reply);
  });

  return new Promise<Server>((resolve, reject) => {
    server.listen(opts.port, () => resolve(server));
    server.on('error', reject);
  });
}
