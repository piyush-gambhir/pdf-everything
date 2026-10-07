import { prepareBrowser, shutdownBrowser } from '../../core/html.js';
import { createHttpServer } from './http.js';

const port = Number(process.env.PORT ?? '8010') || 8010;
const apiToken = process.env.API_TOKEN?.trim() || null;

/** A positive whole number from the environment, or undefined for the default. */
function positiveInteger(name: string): number | undefined {
  const value = Number(process.env[name] ?? '');
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

const server = await createHttpServer({
  port,
  apiToken,
  maxRequestBytes: positiveInteger('MAX_REQUEST_BYTES'),
  maxActiveRenders: positiveInteger('MAX_ACTIVE_RENDERS'),
  // One timing line per render unless RENDER_TIMING_LOG is off.
  logRenderTimings: !/^(0|false|off|no)$/i.test(process.env.RENDER_TIMING_LOG?.trim() ?? ''),
  limits: {
    maxPages: positiveInteger('MAX_PDF_PAGES'),
    maxOutputBytes: positiveInteger('MAX_PDF_BYTES'),
    deadlineMs: positiveInteger('RENDER_DEADLINE_MS'),
  },
});

// Start Chromium now rather than inside the first render. A failure here is
// retried by the readiness check and by the next render.
prepareBrowser().catch(() => undefined);

process.once('SIGTERM', () => {
  server.close();
  void shutdownBrowser().finally(() => process.exit(0));
});

const authHint = apiToken
  ? 'Bearer token required on render routes.'
  : 'No API_TOKEN: open render endpoint (use only on private networks).';

// eslint-disable-next-line no-console
console.log(`pdf-worker listening on :${port}. ${authHint}`);
