"use client"

import { useId } from "react"
import type { HtmlToPdfRequest } from "@pdf-everything/types"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { OptionsFormProps } from "../types"

export function HtmlToPdfOptionsForm({
  value,
  onChange,
}: OptionsFormProps<HtmlToPdfRequest>) {
  const htmlId = useId()
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlId}>HTML document</Label>
      <Textarea
        id={htmlId}
        className="min-h-80 font-mono text-xs"
        value={value.html}
        onChange={(event) => onChange({ ...value, html: event.target.value })}
        placeholder="<!doctype html><html>…</html>"
      />
      <p className="text-xs text-muted-foreground">
        Inline critical CSS and use absolute URLs for external assets.
      </p>
    </div>
  )
}
