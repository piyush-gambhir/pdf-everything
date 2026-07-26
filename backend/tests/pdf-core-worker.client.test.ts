import { afterEach, describe, expect, it, vi } from 'vitest';
import { mergePdfs, PdfCoreWorkerError, splitPdf } from '../src/workers/pdf-core-worker.client.js';
import {
  PdfRenderWorkerError,
  renderHtml,
  renderMarkdown,
} from '../src/workers/pdf-render-worker.client.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Nest Chromium worker client', () => {
  it('maps the public HTML request to the worker route', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe('http://127.0.0.1:8010/v1/render/html');
      expect(JSON.parse(String(init?.body))).toMatchObject({
        html: '<h1>Hello</h1>',
        options: { format: 'A4' },
      });
      return new Response(Buffer.from('%PDF-test'), {
        status: 200,
        headers: { 'content-type': 'application/pdf' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      renderHtml({
        html: '<h1>Hello</h1>',
        format: 'A4',
        printBackground: true,
        navigationTimeoutMs: 30000,
      }),
    ).resolves.toEqual(Buffer.from('%PDF-test'));
  });

  it('maps Markdown templates into worker options', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toMatchObject({
        markdown: '# Hello',
        options: { template: 'academic', title: 'Paper' },
      });
      return new Response(Buffer.from('%PDF-test'), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await renderMarkdown({
      markdown: '# Hello',
      template: 'academic',
      title: 'Paper',
      format: 'A4',
      printBackground: true,
      navigationTimeoutMs: 30000,
    });
  });

  it('turns worker failures into public gateway errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: 'render_failed', message: 'Chromium crashed.' }), {
            status: 500,
          }),
      ),
    );

    await expect(
      renderHtml({
        html: '<h1>Hello</h1>',
        format: 'A4',
        printBackground: true,
        navigationTimeoutMs: 30000,
      }),
    ).rejects.toEqual(new PdfRenderWorkerError('render_failed', 500, 'Chromium crashed.'));
  });
});

describe('Nest PDF core worker client', () => {
  it('serializes input buffers and decodes a PDF result', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as { files: string[] };
      expect(Buffer.from(request.files[0]!, 'base64').toString()).toBe('first');
      return new Response(
        JSON.stringify({ kind: 'pdf', data: Buffer.from('merged').toString('base64') }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(mergePdfs([Buffer.from('first')])).resolves.toEqual(Buffer.from('merged'));
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('decodes multi-PDF results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              kind: 'pdfs',
              data: [Buffer.from('one').toString('base64'), Buffer.from('two').toString('base64')],
            }),
            { status: 200 },
          ),
      ),
    );

    await expect(splitPdf(Buffer.from('source'), { mode: 'each' })).resolves.toEqual([
      Buffer.from('one'),
      Buffer.from('two'),
    ]);
  });

  it('preserves worker error status and code for the public problem response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: 'INVALID_PDF', message: 'Invalid document.' }), {
            status: 422,
          }),
      ),
    );

    await expect(mergePdfs([Buffer.from('bad')])).rejects.toEqual(
      new PdfCoreWorkerError('INVALID_PDF', 422, 'Invalid document.'),
    );
  });
});
