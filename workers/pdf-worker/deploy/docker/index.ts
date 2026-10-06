import { createHttpServer } from './http.js';

const port = Number(process.env.PORT ?? '8010') || 8010;
const apiToken = process.env.API_TOKEN?.trim() || null;

/** A positive whole number from the environment, or undefined for the default. */
function positiveInteger(name: string): number | undefined {
  const value = Number(process.env[name] ?? '');
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

await createHttpServer({
  port,
  apiToken,
  maxRequestBytes: positiveInteger('MAX_REQUEST_BYTES'),
  limits: {
    maxPages: positiveInteger('MAX_PDF_PAGES'),
    maxOutputBytes: positiveInteger('MAX_PDF_BYTES'),
    deadlineMs: positiveInteger('RENDER_DEADLINE_MS'),
  },
});

const authHint = apiToken
  ? 'Bearer token required on render routes.'
  : 'No API_TOKEN: open render endpoint (use only on private networks).';

// eslint-disable-next-line no-console
console.log(`pdf-worker listening on :${port}. ${authHint}`);
