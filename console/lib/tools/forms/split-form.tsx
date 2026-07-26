"use client"

import { useId } from "react"
import type { SplitOptions } from "@pdf-everything/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SegmentedControl } from "@/components/tools/segmented-control"
import type { OptionsFormProps } from "../types"

export function SplitOptionsForm({
  value,
  onChange,
}: OptionsFormProps<SplitOptions>) {
  const rangesId = useId()

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Mode</Label>
        <SegmentedControl
          value={value.mode}
          onChange={(mode) =>
            onChange(
              mode === "each"
                ? { mode: "each" }
                : { mode: "ranges", ranges: ["1"] }
            )
          }
          ariaLabel="Split mode"
          options={[
            {
              value: "ranges",
              label: "Page ranges",
              description: "Choose groups",
            },
            {
              value: "each",
              label: "Every page",
              description: "One file each",
            },
          ]}
        />
      </div>
      {value.mode === "ranges" && (
        <div className="space-y-2">
          <Label htmlFor={rangesId}>Ranges (one per output)</Label>
          <Input
            id={rangesId}
            placeholder="1-2, 3-5"
            value={value.ranges.join(", ")}
            onChange={(e) =>
              onChange({
                mode: "ranges",
                ranges: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
          <p className="ui-caption text-muted-foreground">
            Each comma-separated entry becomes a separate output PDF.
          </p>
        </div>
      )}
    </div>
  )
}
