import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import {
  renderMarkdownToPdf,
  resolveChromiumPath,
  type RenderPdfOptions,
} from '../../core/pdf.js';
import { TEMPLATE_NAMES, isTemplateName } from '../../core/templates/index.js';

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export interface RenderRequestBody {
  markdown: string;
  options?: RenderPdfOptions;
}

function unauthorized(res: ServerResponse) {
  json(res, 401, {
    error: 'unauthorized',
    message: 'Invalid or missing Authorization bearer token.',
  });
}

/** HTTP server for Markdown → PDF rendering. */
export function createHttpServer(opts: { apiToken: string | null; port: number }): Promise<Server> {
  const server = createServer(async (req, res) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    const method = req.method ?? 'GET';

    if (method === 'GET' && (pathname === '/' || pathname === '/health')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'markdown-to-pdf' }));
      return;
    }

    if (method === 'GET' && pathname === '/ready') {
      const chromium = resolveChromiumPath();
      if (!chromium) {
        json(res, 503, {
          status: 'not_ready',
          message: 'Chromium binary not found (set PUPPETEER_EXECUTABLE_PATH).',
        });
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ready' }));
      return;
    }

    if (method === 'GET' && pathname === '/v1/templates') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ templates: TEMPLATE_NAMES }));
      return;
    }

    if (method === 'POST' && pathname === '/v1/render') {
      if (opts.apiToken) {
        const auth = req.headers.authorization?.trim();
        if (auth !== `Bearer ${opts.apiToken}`) {
          unauthorized(res);
          return;
        }
      }

      let raw: string;
      try {
        raw = await readBody(req);
      } catch {
        json(res, 400, { error: 'bad_request', message: 'Could not read body.' });
        return;
      }

      let body: RenderRequestBody;
      try {
        body = JSON.parse(raw) as RenderRequestBody;
      } catch {
        json(res, 400, { error: 'bad_request', message: 'Body must be JSON.' });
        return;
      }

      if (typeof body.markdown !== 'string' || body.markdown.length === 0) {
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

      try {
        const pdf = await renderMarkdownToPdf(body.markdown, body.options ?? {});
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Length': pdf.length,
          'Cache-Control': 'no-store',
        });
        res.end(pdf);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'render_failed';
        json(res, 500, { error: 'render_failed', message });
      }
      return;
    }

    json(res, 404, { error: 'not_found' });
  });

  return new Promise<Server>((resolve, reject) => {
    server.listen(opts.port, () => resolve(server));
    server.on('error', reject);
  });
}
