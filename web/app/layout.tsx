import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { RootProvider } from 'fumadocs-ui/provider/next';

import './global.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata = {
  title: 'pdf-everything',
  description:
    'Every PDF tool in one place — merge, split, convert, sign and more. Free, open-source, and driven by the same REST API the console uses.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} font-sans antialiased`}>
      <body className="flex min-h-svh flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
