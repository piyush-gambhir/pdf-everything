import type { HtmlToPdfRequest, MarkdownToPdfRequest } from '@pdf-everything/types';

export class PdfRenderWorkerError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'PdfRenderWorkerError';
  }
}

const workerOrigin = (process.env.PDF_RENDER_WORKER_URL ?? 'http://127.0.0.1:8010').replace(
  /\/+$/,
  '',
);
const workerToken = process.env.PDF_RENDER_WORKER_TOKEN?.trim();

async function render(path: 'html' | 'markdown', body: unknown): Promise<Buffer> {
  let response: Response;
  try {
    response = await fetch(`${workerOrigin}/v1/render/${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(workerToken ? { authorization: `Bearer ${workerToken}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new PdfRenderWorkerError(
      'render_worker_unavailable',
      503,
      error instanceof Error ? error.message : 'PDF render worker is unavailable.',
    );
  }

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as {
      error?: string;
      message?: string;
    } | null;
    throw new PdfRenderWorkerError(
      problem?.error ?? 'render_worker_failed',
      response.status,
      problem?.message ?? `PDF render worker returned HTTP ${response.status}.`,
    );
  }
  return Buffer.from(await response.arrayBuffer());
}

export function renderHtml(request: HtmlToPdfRequest): Promise<Buffer> {
  const { html, ...options } = request;
  return render('html', { html, options });
}

export function renderMarkdown(request: MarkdownToPdfRequest): Promise<Buffer> {
  const { markdown, template, title, ...pdfOptions } = request;
  return render('markdown', {
    markdown,
    options: { ...pdfOptions, template, title },
  });
}
