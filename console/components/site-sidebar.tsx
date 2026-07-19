'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TOOLS } from '@/lib/tools/registry';
import { CATEGORY_META } from '@/lib/tools/types';

export function SiteSidebar() {
  const pathname = usePathname();
  const grouped = new Map<string, typeof TOOLS>();
  for (const t of TOOLS) {
    const list = grouped.get(t.category) ?? [];
    list.push(t);
    grouped.set(t.category, list);
  }

  return (
    // h-full (not h-svh) so the sidebar fills the fixed-height shell exactly.
    // Separated from the content pane by surface elevation, not a border.
    <aside className="flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 shrink-0 items-center px-4">
        <Link
          href="/"
          className={cn(
            'flex items-center gap-2 rounded-lg type-section',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          )}
        >
          <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="size-4" />
          </span>
          pdf-everything
        </Link>
      </div>

      {/* Only this region scrolls, and its scrollbar is never painted. */}
      <nav className="scroll-none min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {[...grouped.entries()].map(([cat, tools]) => {
          const meta = CATEGORY_META[cat as keyof typeof CATEGORY_META];
          return (
            <div key={cat} className="mb-5">
              <p className="type-eyebrow px-2 pb-1.5 text-muted-foreground">
                {meta?.label ?? cat}
              </p>
              <ul className="space-y-0.5">
                {tools.map((t) => {
                  const href = `/${t.id}`;
                  const active = pathname === href;
                  const Icon = t.Icon;
                  return (
                    <li key={t.id}>
                      <Link
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg px-2 py-1.5 type-body',
                          'transition-colors',
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                          active
                            ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                            : 'text-muted-foreground hover:bg-sidebar-accent/55 hover:text-foreground',
                        )}
                      >
                        <Icon
                          className={cn(
                            'size-4 shrink-0',
                            active ? 'text-foreground' : 'text-muted-foreground',
                          )}
                        />
                        <span className="truncate">{t.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

    </aside>
  );
}
