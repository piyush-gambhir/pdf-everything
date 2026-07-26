import type { ReactNode } from 'react';

import { FloatingHeader } from '@/components/floating-header';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="marketing-shell flex min-h-svh flex-col">
      <FloatingHeader />
      {children}
    </div>
  );
}
