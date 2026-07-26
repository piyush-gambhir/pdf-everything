import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

/**
 * The console is a separate static app. Production uses same-origin path
 * routing; local development uses the console's own Next.js server.
 */
const configuredConsoleOrigin = process.env.NEXT_PUBLIC_CONSOLE_ORIGIN?.replace(/\/+$/, '');

export const CONSOLE_URL = configuredConsoleOrigin
  ? `${configuredConsoleOrigin}/pdf-everything/console/`
  : process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000/pdf-everything/console/'
    : '/pdf-everything/console/';

export const REPOSITORY_URL = 'https://github.com/piyush-gambhir/pdf-everything';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: 'pdf-everything' },
    links: [
      { text: 'Docs', url: '/docs' },
      { text: 'Console', url: CONSOLE_URL, external: true },
      { text: 'GitHub', url: REPOSITORY_URL, external: true },
    ],
  };
}
