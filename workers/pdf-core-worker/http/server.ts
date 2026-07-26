import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { ZodError } from 'zod';
import { PdfCoreError } from '../core/shared/errors.js';
import { executeOperation } from './dispatch.js';
import {
  CORE_OPERATIONS,
  isCoreOperation,
  type ExecuteRequest,
  type ExecuteResult,
} from './protocol.js';

// Nest sends buffered inputs as base64 JSON. Leave enough headroom for the
// public 100 MiB upload ceiling plus base64 and envelope overhead.
const DEFAULT_MAX_REQUEST_BYTES = 150 * 1024 * 1024;

export interface CoreWorkerServerOptions {
  port: number;
  apiToken: string | null;
  maxRequestBytes?: number;
}

class RequestTooLargeError extends Error {}

function json(res: ServerResponse, status: number, body: unknown): void {
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
      } else if (!tooLarge) {
        chunks.push(chunk);
      }
    });
    req.on('end', () => {
      if (tooLarge) reject(new RequestTooLargeError());
      else resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function decodeRequest(value: unknown): { files: Buffer[]; options: unknown } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Body must be a JSON object.');
  }
  const input = value as Partial<ExecuteRequest>;
  if (!Array.isArray(input.files) || input.files.some((file) => typeof file !== 'string')) {
    throw new TypeError('files must be an array of base64 strings.');
  }
  return {
    files: input.files.map((file) => Buffer.from(file, 'base64')),
    options: input.options ?? {},
  };
}

function isAuthorized(req: IncomingMessage, token: string | null): boolean {
  return !token || req.headers.authorization?.trim() === `Bearer ${token}`;
}

function sendError(res: ServerResponse, error: unknown): void {
  if (error instanceof RequestTooLargeError) {
    json(res, 413, { error: 'payload_too_large', message: error.message });
  } else if (
    error instanceof SyntaxError ||
    error instanceof TypeError ||
    error instanceof ZodError
  ) {
    json(res, 400, {
      error: 'bad_request',
      message: error instanceof Error ? error.message : 'Invalid request.',
    });
  } else if (error instanceof PdfCoreError) {
    json(res, 422, { error: error.code, message: error.message });
  } else {
    json(res, 500, {
      error: 'operation_failed',
      message: error instanceof Error ? error.message : 'Unknown operation failure.',
    });
  }
}

export function createCoreWorkerServer(options: CoreWorkerServerOptions): Promise<Server> {
  const maxBytes = options.maxRequestBytes ?? DEFAULT_MAX_REQUEST_BYTES;
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      json(res, 200, { status: 'ok', service: 'pdf-core-worker', operations: CORE_OPERATIONS });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/ready') {
      json(res, 200, { status: 'ready' });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/v1/operations') {
      json(res, 200, { operations: CORE_OPERATIONS });
      return;
    }

    const match = /^\/v1\/execute\/([^/]+)$/.exec(url.pathname);
    if (req.method !== 'POST' || !match) {
      json(res, 404, { error: 'not_found' });
      return;
    }
    if (!isAuthorized(req, options.apiToken)) {
      json(res, 401, { error: 'unauthorized', message: 'Invalid worker bearer token.' });
      return;
    }

    const operation = match[1] ?? '';
    if (!isCoreOperation(operation)) {
      json(res, 404, { error: 'unknown_operation', message: `Unknown operation "${operation}".` });
      return;
    }

    try {
      const request = decodeRequest(JSON.parse(await readBody(req, maxBytes)));
      const result: ExecuteResult = await executeOperation(
        operation,
        request.files,
        request.options,
      );
      json(res, 200, result);
    } catch (error) {
      sendError(res, error);
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(options.port, '0.0.0.0', () => resolve(server));
    server.on('error', reject);
  });
}
