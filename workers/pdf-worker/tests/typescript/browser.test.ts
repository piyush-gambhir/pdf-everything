import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { renderHtmlToPdf, shutdownBrowser, type RenderTimings } from '../../core/html.js';

/** A "browser" that records each start, waits, and exits without a DevTools pipe. */
function failingBrowser(seconds: number) {
  const dir = mkdtempSync(join(tmpdir(), 'pdf-worker-browser-'));
  const starts = join(dir, 'starts');
  const path = join(dir, 'chromium');
  writeFileSync(path, `#!/bin/sh\necho started >> "${starts}"\nsleep ${seconds}\nexit 1\n`);
  chmodSync(path, 0o755);
  const count = () =>
    existsSync(starts) ? readFileSync(starts, 'utf8').split('\n').length - 1 : 0;
  return { path, count };
}

describe('the shared browser', () => {
  afterEach(() => shutdownBrowser());

  it('is launched once more when it fails to start', async () => {
    const browser = failingBrowser(0);
    await expect(
      renderHtmlToPdf('<p>x</p>', {}, { executablePath: browser.path }),
    ).rejects.toThrow();
    expect(browser.count()).toBe(2);
  });

  it('reports a render that could not start, and survives a failing timing logger', async () => {
    const browser = failingBrowser(0);
    const reports: RenderTimings[] = [];
    await expect(
      renderHtmlToPdf(
        '<p>x</p>',
        {},
        {
          executablePath: browser.path,
          onTimings: async (timings) => {
            reports.push(timings);
            throw new Error('The log is unavailable.');
          },
        },
      ),
    ).rejects.toThrow();
    expect(reports).toMatchObject([{ outcome: 'failed', failedIn: 'browser', browser: 'launch' }]);
  });

  it('is not launched again for a render its deadline abandoned', async () => {
    const browser = failingBrowser(0.5);
    await expect(
      renderHtmlToPdf('<p>x</p>', {}, { executablePath: browser.path, limits: { deadlineMs: 50 } }),
    ).rejects.toMatchObject({ code: 'render_timeout' });
    await shutdownBrowser();
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    expect(browser.count()).toBe(1);
  });
});
