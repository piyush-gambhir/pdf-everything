'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { BookOpen, Moon, Sun } from 'lucide-react';

import { TOOLS } from '@/lib/tools/registry';
import { CATEGORY_META } from '@/lib/tools/types';
import { cn } from '@/lib/utils';

/** Resolve the current route to a page title plus its category. */
function useRouteLabel() {
  const pathname = usePathname();
  // usePathname() is already basePath-relative, so the tool id is just the
  // path segment. Strip BOTH slashes — `trailingSlash: true` means the path is
  // "/merge/", and leaving the trailing slash breaks the lookup.
  const id = pathname.replace(/^\/+|\/+$/g, '') || null;
  const tool = id ? TOOLS.find((t) => t.id === id) : undefined;

  if (!tool) {
    return { section: null as string | null, title: id ?? 'All tools' };
  }

  const meta = CATEGORY_META[tool.category as keyof typeof CATEGORY_META];
  return { section: meta?.label ?? null, title: tool.title };
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // The icon is swapped by CSS off the `dark` class next-themes puts on <html>,
  // rather than by mount state. That avoids both a hydration mismatch and the
  // first-paint icon flicker, with no effect needed.
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      title="Toggle theme (d)"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={cn(
        'grid size-8 place-items-center rounded-lg text-muted-foreground',
        'transition-colors hover:bg-surface-3 hover:text-foreground',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
      )}
    >
      <Moon className="size-4 dark:hidden" />
      <Sun className="hidden size-4 dark:block" />
    </button>
  );
}

export function SiteHeader() {
  const { section, title } = useRouteLabel();

  return (
    // Same surface as the sidebar, so the two read as one continuous top band.
    <header className="sticky top-0 z-20 shrink-0 bg-sidebar">
      <div className="flex h-14 items-center gap-3 px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <h1 className="type-title truncate">{title}</h1>
          {section ? (
            // A quiet chip instead of a slash-separated crumb trail.
            <span className="shrink-0 rounded-md bg-surface-3 px-2 py-0.5 type-eyebrow text-muted-foreground">
              {section}
            </span>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/api/docs"
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 type-caption text-muted-foreground',
              'transition-colors hover:bg-surface-3 hover:text-foreground',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            )}
          >
            <BookOpen className="size-3.5" />
            API docs
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
