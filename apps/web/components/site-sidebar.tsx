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
    <aside className="flex h-svh w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <Link
        href="/"
        className="flex items-center gap-2 px-4 py-4 text-base font-semibold tracking-tight"
      >
        <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
          <FileText className="size-4" />
        </span>
        pdf-everything
      </Link>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {[...grouped.entries()].map(([cat, tools]) => {
          const meta = CATEGORY_META[cat as keyof typeof CATEGORY_META];
          return (
            <div key={cat} className="mb-4">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {meta?.label ?? cat}
              </p>
              <ul>
                {tools.map((t) => {
                  const href = `/${t.id}`;
                  const active = pathname === href;
                  const Icon = t.Icon;
                  return (
                    <li key={t.id}>
                      <Link
                        href={href}
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
                          active
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
                        )}
                      >
                        <Icon className="size-4 text-muted-foreground" />
                        {t.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        Press <kbd className="rounded bg-muted px-1 py-0.5 text-[10px]">d</kbd> for dark mode
      </div>
    </aside>
  );
}
