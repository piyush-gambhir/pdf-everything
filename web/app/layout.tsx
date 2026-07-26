import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import { RootProvider } from 'fumadocs-ui/provider/next';

import './global.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  metadataBase: new URL('https://projects.piyushgambhir.com'),
  title: {
    default: 'pdf-everything — open-source PDF tools and API',
    template: '%s | pdf-everything',
  },
  description:
    'Nineteen PDF tools in one console and one REST API. Open source, self-hostable, and powered by independently scalable PDF workers.',
  alternates: {
    canonical: '/pdf-everything/',
  },
  openGraph: {
    type: 'website',
    url: '/pdf-everything/',
    siteName: 'pdf-everything',
    title: 'Every PDF workflow. One clean API.',
    description:
      'Use the console, call the REST API, or self-host the complete open-source PDF stack.',
    images: [
      {
        url: '/pdf-everything/og.png',
        width: 1731,
        height: 909,
        alt: 'pdf-everything — Every PDF workflow. One clean API.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Every PDF workflow. One clean API.',
    description:
      'Use the console, call the REST API, or self-host the complete open-source PDF stack.',
    images: ['/pdf-everything/og.png'],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}
    >
      <body className="flex min-h-svh flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
