import type { ReactNode } from 'react';
import { Geist, Geist_Mono, Inter } from 'next/font/google';

import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteSidebar } from '@/components/site-sidebar';
import { SiteHeader } from '@/components/site-header';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const fontMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
  title: 'pdf-everything',
  description: 'Every PDF tool, in one place. Same APIs FE and external clients use.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn('antialiased', fontMono.variable, 'font-sans', inter.variable)}
    >
      <body>
        <ThemeProvider>
          {/* Fixed-height shell. The shell itself never scrolls — only the
              content pane does — which is what keeps the sidebar pinned.
              (A growing `min-h-*` shell scrolls the whole document and drags
              the sidebar out of view.) */}
          <div className="flex h-svh overflow-hidden">
            <SiteSidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <SiteHeader />
              <main className="scroll-subtle flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
