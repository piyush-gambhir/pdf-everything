import type {
  CropOptions,
  ExtractPagesOptions,
  ExtractTextOptions,
  FormFieldInfo,
  FormsFillOptions,
  ImagesToPdfOptions,
  MetadataOptions,
  PageNumberOptions,
  PageSizeConvertOptions,
  RemovePagesOptions,
  ReorderOptions,
  ResizePagesOptions,
  RotateOptions,
  SplitOptions,
  WatermarkOptions,
} from '@pdf-everything/types';

type WorkerResult =
  | { kind: 'pdf'; data: string; meta?: Record<string, unknown> }
  | { kind: 'pdfs'; data: string[] }
  | { kind: 'text'; text: string; meta?: Record<string, unknown> }
  | { kind: 'json'; value: unknown };

export class PdfCoreWorkerError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'PdfCoreWorkerError';
  }
}

const workerOrigin = (process.env.PDF_CORE_WORKER_URL ?? 'http://127.0.0.1:8020').replace(
  /\/+$/,
  '',
);
const workerToken = process.env.PDF_CORE_WORKER_TOKEN?.trim();

async function execute(
  operation: string,
  files: Array<Buffer | Uint8Array>,
  options: unknown = {},
): Promise<WorkerResult> {
  let response: Response;
  try {
    response = await fetch(`${workerOrigin}/v1/execute/${operation}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(workerToken ? { authorization: `Bearer ${workerToken}` } : {}),
      },
      body: JSON.stringify({
        files: files.map((file) => Buffer.from(file).toString('base64')),
        options,
      }),
    });
  } catch (error) {
    throw new PdfCoreWorkerError(
      'worker_unavailable',
      503,
      error instanceof Error ? error.message : 'PDF core worker is unavailable.',
    );
  }

  const body = (await response.json().catch(() => null)) as
    WorkerResult | { error?: string; message?: string } | null;
  if (!response.ok) {
    const problem = body && 'error' in body ? body : null;
    throw new PdfCoreWorkerError(
      problem?.error ?? 'worker_failed',
      response.status,
      problem?.message ?? `PDF core worker returned HTTP ${response.status}.`,
    );
  }
  if (!body || !('kind' in body)) {
    throw new PdfCoreWorkerError(
      'invalid_worker_response',
      502,
      'Invalid PDF core worker response.',
    );
  }
  return body;
}

async function expectPdf(
  operation: string,
  files: Array<Buffer | Uint8Array>,
  options?: unknown,
): Promise<{ pdf: Buffer; meta: Record<string, unknown> }> {
  const result = await execute(operation, files, options);
  if (result.kind !== 'pdf') {
    throw new PdfCoreWorkerError('invalid_worker_response', 502, `Expected PDF from ${operation}.`);
  }
  return { pdf: Buffer.from(result.data, 'base64'), meta: result.meta ?? {} };
}

export async function mergePdfs(inputs: Array<Buffer | Uint8Array>): Promise<Buffer> {
  return (await expectPdf('merge', inputs)).pdf;
}

export async function splitPdf(
  input: Buffer | Uint8Array,
  options: SplitOptions,
): Promise<Buffer[]> {
  const result = await execute('split', [input], options);
  if (result.kind !== 'pdfs') {
    throw new PdfCoreWorkerError('invalid_worker_response', 502, 'Expected PDFs from split.');
  }
  return result.data.map((part) => Buffer.from(part, 'base64'));
}

export async function rotatePdf(
  input: Buffer | Uint8Array,
  options: RotateOptions,
): Promise<Buffer> {
  return (await expectPdf('rotate', [input], options)).pdf;
}

export async function removePages(
  input: Buffer | Uint8Array,
  options: RemovePagesOptions,
): Promise<Buffer> {
  return (await expectPdf('remove-pages', [input], options)).pdf;
}

export async function extractPages(
  input: Buffer | Uint8Array,
  options: ExtractPagesOptions,
): Promise<Buffer> {
  return (await expectPdf('extract-pages', [input], options)).pdf;
}

export async function reorderPages(
  input: Buffer | Uint8Array,
  options: ReorderOptions,
): Promise<Buffer> {
  return (await expectPdf('reorder', [input], options)).pdf;
}

export async function cropPdf(input: Buffer | Uint8Array, options: CropOptions): Promise<Buffer> {
  return (await expectPdf('crop', [input], options)).pdf;
}

export async function watermarkPdf(
  input: Buffer | Uint8Array,
  options: WatermarkOptions,
): Promise<Buffer> {
  return (await expectPdf('watermark', [input], options)).pdf;
}

export async function addPageNumbers(
  input: Buffer | Uint8Array,
  options: PageNumberOptions,
): Promise<Buffer> {
  return (await expectPdf('page-numbers', [input], options)).pdf;
}

export async function editMetadata(
  input: Buffer | Uint8Array,
  options: MetadataOptions,
): Promise<Buffer> {
  return (await expectPdf('metadata', [input], options)).pdf;
}

export async function imagesToPdf(
  inputs: Array<Buffer | Uint8Array>,
  options: ImagesToPdfOptions,
): Promise<Buffer> {
  return (await expectPdf('images-to-pdf', inputs, options)).pdf;
}

export async function extractText(
  input: Buffer | Uint8Array,
  options: ExtractTextOptions,
): Promise<{ text: string; pageCount: number }> {
  const result = await execute('extract-text', [input], options);
  if (result.kind !== 'text') {
    throw new PdfCoreWorkerError('invalid_worker_response', 502, 'Expected text response.');
  }
  return { text: result.text, pageCount: Number(result.meta?.pageCount ?? 0) };
}

export async function resizePages(
  input: Buffer | Uint8Array,
  options: ResizePagesOptions,
): Promise<Buffer> {
  return (await expectPdf('resize-pages', [input], options)).pdf;
}

export async function convertPageSize(
  input: Buffer | Uint8Array,
  options: PageSizeConvertOptions,
): Promise<Buffer> {
  return (await expectPdf('page-size-convert', [input], options)).pdf;
}

export async function fillForm(
  input: Buffer | Uint8Array,
  options: FormsFillOptions,
): Promise<{ pdf: Buffer; filled: string[]; missing: string[] }> {
  const result = await expectPdf('forms-fill', [input], options);
  return {
    pdf: result.pdf,
    filled: Array.isArray(result.meta.filled) ? result.meta.filled.map(String) : [],
    missing: Array.isArray(result.meta.missing) ? result.meta.missing.map(String) : [],
  };
}

export async function flattenForm(input: Buffer | Uint8Array): Promise<Buffer> {
  return (await expectPdf('forms-flatten', [input])).pdf;
}

export async function extractFormData(input: Buffer | Uint8Array): Promise<FormFieldInfo[]> {
  const result = await execute('forms-extract', [input]);
  if (result.kind !== 'json' || !Array.isArray(result.value)) {
    throw new PdfCoreWorkerError('invalid_worker_response', 502, 'Expected form field data.');
  }
  return result.value as FormFieldInfo[];
}
