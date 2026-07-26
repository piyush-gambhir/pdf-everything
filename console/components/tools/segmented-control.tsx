"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface SegmentOption<T extends string> {
  value: T
  label: string
  description?: string
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  columns = 2,
  ariaLabel,
}: {
  value: T
  options: SegmentOption<T>[]
  onChange: (value: T) => void
  columns?: 2 | 3
  ariaLabel: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "grid gap-1 rounded-xl bg-muted p-1",
        columns === 3 ? "grid-cols-3" : "grid-cols-2"
      )}
    >
      {options.map((option) => {
        const active = value === option.value
        return (
          <Button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            variant="ghost"
            onClick={() => onChange(option.value)}
            className={cn(
              "ui-caption h-auto min-h-8 rounded-lg px-2.5 py-1.5",
              active
                ? "bg-background text-foreground shadow-xs hover:bg-background"
                : "text-muted-foreground hover:bg-transparent hover:text-foreground"
            )}
          >
            <span className="min-w-0">
              <span className="block truncate">{option.label}</span>
              {option.description && (
                <span className="ui-micro mt-0.5 block truncate font-normal text-muted-foreground">
                  {option.description}
                </span>
              )}
            </span>
          </Button>
        )
      })}
    </div>
  )
}
