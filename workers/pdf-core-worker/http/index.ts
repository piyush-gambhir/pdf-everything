import { createCoreWorkerServer } from './server.js';

const port = Number(process.env.PORT ?? '8020') || 8020;
const apiToken = process.env.WORKER_API_TOKEN?.trim() || null;
const configuredMaxRequestBytes = Number(process.env.MAX_REQUEST_BYTES ?? '');
const maxRequestBytes =
  Number.isFinite(configuredMaxRequestBytes) && configuredMaxRequestBytes > 0
    ? configuredMaxRequestBytes
    : undefined;

await createCoreWorkerServer({ port, apiToken, maxRequestBytes });

// eslint-disable-next-line no-console
console.log(
  `pdf-core-worker listening on :${port}. ${
    apiToken ? 'Bearer token required.' : 'No WORKER_API_TOKEN; use only on a private network.'
  }`,
);
