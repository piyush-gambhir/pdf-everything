'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Blocks, BookOpen, Boxes, GitFork, Menu, Moon, Sun, Terminal, X } from 'lucide-react';
import { useTheme } from 'next-themes';

import { CONSOLE_URL, REPOSITORY_URL } from '@/lib/layout.shared';

const NAV_ITEMS = [
  { label: 'Tools', href: '/#toolbox', icon: Blocks },
  { label: 'Architecture', href: '/#architecture', icon: Boxes },
  { label: 'Docs', href: '/docs', icon: BookOpen },
];

export function FloatingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="floating-site-header">
      <div className="floating-site-header__bar">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          aria-label="pdf-everything home"
          onClick={() => setMenuOpen(false)}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-brand-foreground shadow-sm">
            <Blocks className="size-4" />
          </span>
          <span className="truncate text-sm font-semibold tracking-[-0.015em]">pdf-everything</span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleTheme}
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label="Toggle color theme"
          >
            <Sun className="size-4 dark:hidden" />
            <Moon className="hidden size-4 dark:block" />
          </button>
          <a
            href={REPOSITORY_URL}
            className="hidden size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:grid"
            aria-label="View pdf-everything on GitHub"
          >
            <GitFork className="size-4" />
          </a>
          <a
            href={CONSOLE_URL}
            className="hidden h-9 items-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-semibold text-brand-foreground shadow-sm transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:inline-flex"
          >
            <Terminal className="size-3.5" />
            Open console
          </a>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="floating-site-menu">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 rounded-xl bg-surface-1 px-3.5 py-3 text-sm font-medium transition-colors hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              onClick={() => setMenuOpen(false)}
            >
              <Icon className="size-4 text-brand" />
              {label}
            </Link>
          ))}
          <a
            href={REPOSITORY_URL}
            className="flex items-center gap-3 rounded-xl bg-surface-1 px-3.5 py-3 text-sm font-medium transition-colors hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:hidden"
          >
            <GitFork className="size-4 text-brand" />
            GitHub
          </a>
          <a
            href={CONSOLE_URL}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-brand-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:hidden"
          >
            <Terminal className="size-4" />
            Open console
          </a>
        </nav>
      ) : null}
    </header>
  );
}
