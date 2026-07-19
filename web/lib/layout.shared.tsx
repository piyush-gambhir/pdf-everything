import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

/**
 * The console is a separate Cloudflare Worker, so it can't be a Next <Link> and
 * basePath is NOT applied to it. The path must therefore be written in full —
 * otherwise the link lands on /console instead of /pdf-everything/console.
 */
export const CONSOLE_URL = '/pdf-everything/console';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: 'pdf-everything' },
    links: [
      { text: 'Docs', url: '/docs' },
      { text: 'Console', url: CONSOLE_URL, external: true },
    ],
  };
}
