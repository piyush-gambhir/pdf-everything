import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { renderHtmlToPdf, resolveChromiumPath, type HtmlRenderOptions } from '../../core/html.js';
import { renderMarkdownToPdf, type MarkdownRenderOptions } from '../../core/markdown.js';
import { TEMPLATE_NAMES, isTemplateName } from '../../core/templates/index.js';

const DEFAULT_MAX_REQUEST_BYTES = 5 * 1024 * 1024;

class RequestTooLargeError extends Error {}

interface RenderRequestOptions extends HtmlRenderOptions {
  template?: string;
  title?: string;
}

interface RenderRequest {
  html?: unknown;
  markdown?: unknown;
  options?: RenderRequestOptions;
}

export interface HttpServerOptions {
  apiToken: string | null;
  port: number;
  maxRequestBytes?: number;
}

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

async function sendPdf(res: ServerResponse, render: () => Promise<Buffer>) {
  try {
    const pdf = await render();
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': pdf.length,
      'Cache-Control': 'no-store',
    });
    res.end(pdf);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'render_failed';
    json(res, 500, { error: 'render_failed', message });
  }
}

/** HTTP server for browser-based HTML and Markdown PDF rendering. */
export function createHttpServer(opts: HttpServerOptions): Promise<Server> {
  const maxRequestBytes = opts.maxRequestBytes ?? DEFAULT_MAX_REQUEST_BYTES;

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

    if (method === 'GET' && pathname === '/ready') {
      if (!resolveChromiumPath()) {
        json(res, 503, {
          status: 'not_ready',
          message: 'Chromium binary not found (set PUPPETEER_EXECUTABLE_PATH).',
        });
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

    let body: RenderRequest;
    try {
      const raw = await readBody(req, maxRequestBytes);
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        json(res, 400, { error: 'bad_request', message: 'Body must be a JSON object.' });
        return;
      }
      body = parsed as RenderRequest;
    } catch (error) {
      if (error instanceof RequestTooLargeError) {
        json(res, 413, {
          error: 'payload_too_large',
          message: `Request body exceeds ${maxRequestBytes} bytes.`,
        });
        return;
      }
      json(res, 400, { error: 'bad_request', message: 'Body must be valid JSON.' });
      return;
    }

    if (
      body.options !== undefined &&
      (!body.options || typeof body.options !== 'object' || Array.isArray(body.options))
    ) {
      json(res, 400, { error: 'bad_request', message: 'Field "options" must be an object.' });
      return;
    }

    const wantsHtml = pathname === '/v1/render/html';
    const wantsMarkdown = pathname === '/v1/render/markdown';
    const hasHtml = 'html' in body;
    const hasMarkdown = 'markdown' in body;

    if (hasHtml && hasMarkdown) {
      json(res, 400, {
        error: 'bad_request',
        message: 'Use exactly one input field: "html" or "markdown".',
      });
      return;
    }

    if (wantsHtml) {
      if (hasMarkdown || typeof body.html !== 'string' || body.html.length === 0) {
        json(res, 400, {
          error: 'bad_request',
          message: 'Field "html" is required and must be a non-empty string.',
        });
        return;
      }
      const html = body.html;
      await sendPdf(res, () => renderHtmlToPdf(html, body.options ?? {}));
      return;
    }

    if (wantsMarkdown) {
      if (hasHtml || typeof body.markdown !== 'string' || body.markdown.length === 0) {
        json(res, 400, {
          error: 'bad_request',
          message: 'Field "markdown" is required and must be a non-empty string.',
        });
        return;
      }

      const templateName = body.options?.template;
      if (templateName !== undefined && !isTemplateName(templateName)) {
        json(res, 400, {
          error: 'bad_request',
          message: `Unknown template "${templateName}". Valid templates: ${TEMPLATE_NAMES.join(', ')}.`,
        });
        return;
      }

      const markdown = body.markdown;
      await sendPdf(res, () =>
        renderMarkdownToPdf(markdown, (body.options ?? {}) as MarkdownRenderOptions),
      );
      return;
    }
  });

  return new Promise<Server>((resolve, reject) => {
    server.listen(opts.port, () => resolve(server));
    server.on('error', reject);
  });
}
