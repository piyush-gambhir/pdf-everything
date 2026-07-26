"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { Blocks, BookOpen, Moon, Sun } from "lucide-react"

import { TOOLS } from "@/lib/tools/registry"
import { CATEGORY_META } from "@/lib/tools/types"
import { DOCS_URL } from "@/lib/links"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/** Resolve the current route to a page title plus its category. */
function useRouteLabel() {
  const pathname = usePathname()
  // usePathname() is already basePath-relative, so the tool id is just the
  // path segment. Strip BOTH slashes — `trailingSlash: true` means the path is
  // "/merge/", and leaving the trailing slash breaks the lookup.
  const id = pathname.replace(/^\/+|\/+$/g, "") || null
  const tool = id ? TOOLS.find((t) => t.id === id) : undefined

  if (!tool) {
    return { section: null as string | null, title: id ?? "All tools" }
  }

  const meta = CATEGORY_META[tool.category as keyof typeof CATEGORY_META]
  return { section: meta?.label ?? null, title: tool.title }
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  // The icon is swapped by CSS off the `dark` class next-themes puts on <html>,
  // rather than by mount state. That avoids both a hydration mismatch and the
  // first-paint icon flicker, with no effect needed.
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Toggle theme"
      title="Toggle theme (d)"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="text-muted-foreground"
    >
      <Moon className="size-4 dark:hidden" />
      <Sun className="hidden size-4 dark:block" />
    </Button>
  )
}

export function SiteHeader() {
  const { section, title } = useRouteLabel()

  return (
    <header className="sticky top-0 z-20 shrink-0 bg-muted/40 backdrop-blur-md">
      <div className="flex h-11 items-center gap-3 px-4 sm:px-5 lg:px-6">
        <Link href="/" className="mr-1 flex items-center gap-2 md:hidden">
          <span className="grid size-7 place-items-center rounded-md bg-accent text-accent-foreground">
            <Blocks className="size-4" />
          </span>
          <span className="ui-heading hidden font-semibold sm:block">
            pdf-everything
          </span>
        </Link>
        <div className="flex min-w-0 items-center gap-2.5">
          <h1 className="ui-heading truncate font-semibold tracking-[-0.01em]">
            {title}
          </h1>
          {section ? (
            <span className="ui-micro hidden shrink-0 rounded bg-brand-soft px-1.5 py-0.5 font-semibold tracking-[0.08em] text-accent uppercase sm:inline">
              {section}
            </span>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <a
            href={DOCS_URL}
            className={cn(
              "ui-caption flex h-7 items-center gap-1.5 rounded-md bg-background px-2 font-medium text-muted-foreground shadow-xs",
              "transition-colors hover:bg-muted hover:text-foreground",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            )}
          >
            <BookOpen className="size-3.5" />
            API docs
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
