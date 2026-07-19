import type { Problem, FileMeta } from '@pdf-everything/types';

export class ApiError extends Error {
  constructor(public readonly problem: Problem) {
    super(problem.detail ?? problem.title);
    this.name = 'ApiError';
  }
}

async function unwrap(res: Response): Promise<Response> {
  if (res.ok) return res;
  let problem: Problem;
  try {
    problem = (await res.json()) as Problem;
  } catch {
    problem = {
      type: 'about:blank',
      title: res.statusText || 'Request failed',
      status: res.status,
    };
  }
  throw new ApiError(problem);
}

export async function postBinary(args: {
  endpoint: string;
  files: File[];
  fileFieldName: 'file' | 'files';
  options: unknown;
  signal?: AbortSignal;
}): Promise<Blob> {
  const fd = new FormData();
  for (const f of args.files) fd.append(args.fileFieldName, f, f.name);
  fd.append('options', JSON.stringify(args.options ?? {}));
  const res = await unwrap(
    await fetch(args.endpoint, { method: 'POST', body: fd, signal: args.signal }),
  );
  return res.blob();
}

export async function postJson<T>(args: {
  endpoint: string;
  files: File[];
  fileFieldName: 'file' | 'files';
  options: unknown;
  signal?: AbortSignal;
}): Promise<T> {
  const fd = new FormData();
  for (const f of args.files) fd.append(args.fileFieldName, f, f.name);
  fd.append('options', JSON.stringify(args.options ?? {}));
  const res = await unwrap(
    await fetch(args.endpoint, { method: 'POST', body: fd, signal: args.signal }),
  );
  return (await res.json()) as T;
}

export async function postText(args: {
  endpoint: string;
  files: File[];
  fileFieldName: 'file' | 'files';
  options: unknown;
  signal?: AbortSignal;
}): Promise<string> {
  const fd = new FormData();
  for (const f of args.files) fd.append(args.fileFieldName, f, f.name);
  fd.append('options', JSON.stringify(args.options ?? {}));
  const res = await unwrap(
    await fetch(args.endpoint, { method: 'POST', body: fd, signal: args.signal }),
  );
  return res.text();
}

export type SplitResponse = { files: FileMeta[] };

export function fileContentUrl(id: string): string {
  return `/api/v1/files/${id}/content`;
}
