"use client"

import { useId } from "react"
import type { HtmlToPdfRequest } from "@pdf-everything/types"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { OptionsFormProps } from "../types"

export function HtmlToPdfOptionsForm({
  value,
  onChange,
}: OptionsFormProps<HtmlToPdfRequest>) {
  const htmlId = useId()
  const formatId = useId()
  const backgroundId = useId()
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor={htmlId}>HTML document</Label>
        <Textarea
          id={htmlId}
          className="ui-caption min-h-60 font-mono"
          value={value.html}
          onChange={(event) => onChange({ ...value, html: event.target.value })}
          placeholder="<!doctype html><html>…</html>"
        />
        <div className="ui-micro mt-1.5 flex items-center justify-between gap-3 text-muted-foreground">
          <span>Inline critical CSS and use absolute asset URLs.</span>
          <span className="shrink-0 font-mono">
            {value.html.length.toLocaleString()} chars
          </span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={formatId}>Page format</Label>
          <Select
            value={value.format}
            onValueChange={(format) =>
              onChange({
                ...value,
                format: format as HtmlToPdfRequest["format"],
              })
            }
          >
            <SelectTrigger id={formatId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A4">A4</SelectItem>
              <SelectItem value="Letter">Letter</SelectItem>
              <SelectItem value="Legal">Legal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <div className="flex w-full items-center justify-between rounded-lg bg-surface-1 px-3 py-2">
            <Label htmlFor={backgroundId} className="mb-0">
              Print backgrounds
            </Label>
            <Switch
              id={backgroundId}
              checked={value.printBackground}
              onCheckedChange={(printBackground) =>
                onChange({ ...value, printBackground })
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}
