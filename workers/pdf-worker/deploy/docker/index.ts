import { createHttpServer } from './http.js';

const port = Number(process.env.PORT ?? '8010') || 8010;
const apiToken = process.env.API_TOKEN?.trim() || null;
const configuredMaxRequestBytes = Number(process.env.MAX_REQUEST_BYTES ?? '');
const maxRequestBytes =
  Number.isFinite(configuredMaxRequestBytes) && configuredMaxRequestBytes > 0
    ? configuredMaxRequestBytes
    : undefined;

await createHttpServer({ port, apiToken, maxRequestBytes });

const authHint = apiToken
  ? 'Bearer token required on render routes.'
  : 'No API_TOKEN — open render endpoint (use only on private networks).';

// eslint-disable-next-line no-console
console.log(`pdf-worker listening on :${port}. ${authHint}`);
