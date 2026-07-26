"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowUpRight, Blocks, BookOpen, LayoutGrid, Radio } from "lucide-react"
import { cn } from "@/lib/utils"
import { TOOLS } from "@/lib/tools/registry"
import { CATEGORY_META } from "@/lib/tools/types"
import { DOCS_URL } from "@/lib/links"

export function SiteSidebar() {
  const pathname = usePathname()
  const grouped = new Map<string, typeof TOOLS>()
  for (const t of TOOLS) {
    const list = grouped.get(t.category) ?? []
    list.push(t)
    grouped.set(t.category, list)
  }

  return (
    <aside className="hidden h-full w-56 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-12 shrink-0 items-center px-3">
        <Link
          href="/"
          className={cn(
            "group flex items-center gap-2.5 rounded-lg",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          )}
        >
          <span className="relative grid size-7 place-items-center overflow-hidden rounded-md bg-accent text-accent-foreground">
            <Blocks className="size-3.5" />
          </span>
          <span>
            <span className="ui-heading block font-semibold tracking-[-0.01em] text-foreground">
              pdf-everything
            </span>
            <span className="ui-micro block font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              Console
            </span>
          </span>
        </Link>
      </div>

      <nav className="scroll-none min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <ul className="mb-3">
          <li>
            <Link
              href="/"
              aria-current={!pathname.replaceAll("/", "") ? "page" : undefined}
              className={cn(
                "ui-caption flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-medium transition-all",
                !pathname.replaceAll("/", "")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground"
              )}
            >
              <LayoutGrid className="size-4" />
              All tools
              <span className="ui-micro ml-auto rounded-md bg-background px-1.5 py-0.5 text-muted-foreground">
                {TOOLS.length}
              </span>
            </Link>
          </li>
        </ul>

        {[...grouped.entries()].map(([cat, tools]) => {
          const meta = CATEGORY_META[cat as keyof typeof CATEGORY_META]
          return (
            <div key={cat} className="mb-3.5">
              <p className="ui-micro px-2.5 pb-1 font-semibold tracking-[0.1em] text-subtle-foreground uppercase">
                {meta?.label ?? cat}
              </p>
              <ul className="space-y-0.5">
                {tools.map((t) => {
                  const href = `/${t.id}`
                  // `trailingSlash: true` yields "/merge/", so compare on the
                  // normalised segment rather than the raw pathname.
                  const active = pathname.replace(/^\/+|\/+$/g, "") === t.id
                  const Icon = t.Icon
                  return (
                    <li key={t.id}>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group ui-caption flex items-center gap-2.5 rounded-lg px-2.5 py-1.5",
                          "transition-all",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                          active
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                            : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground"
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-3.5 shrink-0 transition-colors",
                            active
                              ? "text-accent"
                              : "text-subtle-foreground group-hover:text-muted-foreground"
                          )}
                        />
                        <span className="truncate">{t.title}</span>
                        {active && (
                          <span className="ml-auto size-1.5 rounded-full bg-accent" />
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className="m-2 rounded-lg bg-background p-2.5">
        <div className="ui-micro flex items-center gap-1.5 font-semibold text-foreground">
          <Radio className="size-3 text-success" />
          Built for your workers
        </div>
        <a
          href={DOCS_URL}
          className="ui-micro mt-1.5 flex items-center gap-1.5 font-semibold text-accent transition-opacity hover:opacity-75"
        >
          <BookOpen className="size-3" />
          Read the docs
          <ArrowUpRight className="ml-auto size-3" />
        </a>
      </div>
    </aside>
  )
}
