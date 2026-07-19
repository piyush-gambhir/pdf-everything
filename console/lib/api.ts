import type { Problem, FileMeta } from '@pdf-everything/types';

/**
 * Absolute origin of the backend API.
 *
 * The console is a static export served from Cloudflare, so there is no server
 * to proxy /api/* — every call must name the API host outright. Set
 * NEXT_PUBLIC_API_ORIGIN at build time; it falls back to the local backend so
 * `pnpm dev` keeps working untouched.
 *
 * Because this is cross-origin in production, the API must allow the console's
 * origin via CORS.
 */
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:3001').replace(
  /\/+$/,
  '',
);

/** Resolve an API path (`/api/v1/...`) against the configured origin. */
export function apiUrl(path: string): string {
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

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
    await fetch(apiUrl(args.endpoint), { method: 'POST', body: fd, signal: args.signal }),
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
    await fetch(apiUrl(args.endpoint), { method: 'POST', body: fd, signal: args.signal }),
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
    await fetch(apiUrl(args.endpoint), { method: 'POST', body: fd, signal: args.signal }),
  );
  return res.text();
}

export type SplitResponse = { files: FileMeta[] };

export function fileContentUrl(id: string): string {
  return apiUrl(`/api/v1/files/${id}/content`);
}
