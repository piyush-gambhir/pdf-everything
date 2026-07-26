"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  CheckCircle2,
  Files,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TOOLS } from "@/lib/tools/registry"
import { CATEGORY_META, type ToolCategory } from "@/lib/tools/types"

const CATEGORY_STYLES: Record<string, string> = {
  organize: "bg-info-soft text-info",
  edit: "bg-brand-soft text-accent",
  "convert-to": "bg-warning-soft text-warning",
  "convert-from": "bg-success-soft text-success",
  forms: "bg-danger-soft text-danger",
  misc: "bg-muted text-muted-foreground",
}

export function ToolExplorer() {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<ToolCategory | "all">("all")

  const categories = useMemo(
    () => [...new Set(TOOLS.map((tool) => tool.category))],
    []
  )

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return TOOLS.filter((tool) => {
      const matchesCategory = category === "all" || tool.category === category
      const matchesSearch =
        !normalized ||
        tool.title.toLowerCase().includes(normalized) ||
        tool.description.toLowerCase().includes(normalized) ||
        CATEGORY_META[tool.category].label.toLowerCase().includes(normalized)
      return matchesCategory && matchesSearch
    })
  }, [category, query])

  return (
    <div className="mx-auto w-full max-w-[1680px] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,0.78fr)] lg:items-end lg:gap-8">
        <div className="max-w-2xl">
          <div className="ui-micro mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2 py-0.5 font-medium text-accent">
            <Sparkles className="size-3.5" />
            One workspace. Every PDF job.
          </div>
          <h1 className="ui-display max-w-2xl font-semibold tracking-[-0.025em]">
            What do you want to do with your PDF?
          </h1>
          <p className="ui-body mt-1.5 max-w-xl text-muted-foreground">
            Pick a tool, add your files, and tune the result. Your files stay in
            the workflow you control.
          </p>
        </div>
        <div>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search merge, watermark, forms, convert…"
              aria-label="Search PDF tools"
              className="h-9 bg-surface-2 pr-20 pl-10 shadow-xs"
            />
            <span className="ui-micro pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded bg-muted px-1.5 py-0.5 font-mono font-medium text-muted-foreground sm:block">
              {TOOLS.length} tools
            </span>
          </div>
          <div className="ui-micro mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted-foreground">
            <TrustItem icon={Zap} label="Worker powered" />
            <TrustItem icon={ShieldCheck} label="Private by design" />
            <TrustItem icon={CheckCircle2} label="API ready" />
          </div>
        </div>
      </section>

      <div className="mt-5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="scroll-none flex items-center gap-1.5 overflow-x-auto pb-1">
            <FilterButton
              active={category === "all"}
              onClick={() => setCategory("all")}
            >
              All tools
            </FilterButton>
            {categories.map((item) => (
              <FilterButton
                key={item}
                active={category === item}
                onClick={() => setCategory(item)}
              >
                {CATEGORY_META[item].label}
              </FilterButton>
            ))}
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <p className="ui-micro font-semibold tracking-[0.1em] text-subtle-foreground uppercase">
              {category === "all" ? "Toolbox" : CATEGORY_META[category].label}
            </p>
            <span className="size-1 rounded-full bg-muted-foreground/35" />
            <p className="ui-body font-semibold">
              {filtered.length}{" "}
              <span className="font-normal text-muted-foreground">
                {filtered.length === 1 ? "tool" : "tools"}
              </span>
            </p>
          </div>
        </div>

        {query && (
          <div className="ui-caption flex items-center justify-between rounded-lg bg-surface-1 px-3 py-1.5">
            <span className="text-muted-foreground">
              {filtered.length === 0
                ? `No tools match “${query}”`
                : `${filtered.length} results for “${query}”`}
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setQuery("")}
              className="text-accent"
            >
              Clear search
            </Button>
          </div>
        )}

        {filtered.length > 0 ? (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((tool) => {
              const Icon = tool.Icon
              const meta = CATEGORY_META[tool.category]
              return (
                <Link
                  key={tool.id}
                  href={`/${tool.id}`}
                  className="group app-panel relative min-h-32 overflow-hidden p-4 transition-colors duration-200 hover:bg-surface-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={cn(
                        "grid size-8 place-items-center rounded-lg",
                        CATEGORY_STYLES[tool.category] ??
                          "bg-brand-soft text-primary"
                      )}
                    >
                      <Icon className="size-4" strokeWidth={1.8} />
                    </span>
                    <span className="grid size-7 place-items-center rounded-full text-subtle-foreground transition-colors group-hover:bg-brand-soft group-hover:text-accent">
                      <ArrowUpRight className="size-3.5" />
                    </span>
                  </div>
                  <div className="mt-3.5">
                    <p className="ui-micro font-semibold tracking-[0.08em] text-subtle-foreground uppercase">
                      {meta.label}
                    </p>
                    <h3 className="ui-heading mt-1 font-semibold tracking-tight">
                      {tool.title}
                    </h3>
                    <p className="ui-caption mt-1 line-clamp-2 text-muted-foreground">
                      {tool.description}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="app-panel-muted grid min-h-64 place-items-center p-8 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-xl bg-surface-3 text-muted-foreground">
                <Files className="size-5" />
              </span>
              <p className="mt-4 font-semibold">Nothing matched “{query}”</p>
              <p className="ui-body mt-1 text-muted-foreground">
                Try a job such as merge, rotate, HTML, or forms.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="xs"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
      )}
    >
      {children}
    </Button>
  )
}

function TrustItem({ icon: Icon, label }: { icon: typeof Zap; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="size-3 text-accent" />
      {label}
    </span>
  )
}
