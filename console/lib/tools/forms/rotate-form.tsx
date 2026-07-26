"use client"

import { useId } from "react"
import type { RotateOptions } from "@pdf-everything/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SegmentedControl } from "@/components/tools/segmented-control"
import type { OptionsFormProps } from "../types"

export function RotateOptionsForm({
  value,
  onChange,
}: OptionsFormProps<RotateOptions>) {
  const pagesId = useId()
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Rotation</Label>
        <SegmentedControl
          value={String(value.angle) as "90" | "180" | "270"}
          onChange={(angle) =>
            onChange({
              ...value,
              angle: Number(angle) as RotateOptions["angle"],
            })
          }
          ariaLabel="Rotation angle"
          columns={3}
          options={[
            { value: "90", label: "90°", description: "Clockwise" },
            { value: "180", label: "180°", description: "Flip" },
            { value: "270", label: "270°", description: "Counter" },
          ]}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={pagesId}>Pages (optional)</Label>
        <Input
          id={pagesId}
          placeholder="all pages"
          value={value.pages ?? ""}
          onChange={(e) =>
            onChange({ ...value, pages: e.target.value || undefined })
          }
        />
        <p className="ui-caption text-muted-foreground">
          Leave blank to rotate every page. Format:{" "}
          <code className="rounded bg-muted px-1">1-3, 5, 7-9</code>
        </p>
      </div>
    </div>
  )
}
