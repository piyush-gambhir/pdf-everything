"use client"

import { useId } from "react"
import type { MarkdownToPdfRequest } from "@pdf-everything/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { OptionsFormProps } from "../types"

export function MarkdownToPdfOptionsForm({
  value,
  onChange,
}: OptionsFormProps<MarkdownToPdfRequest>) {
  const markdownId = useId()
  const titleId = useId()
  const templateId = useId()
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor={titleId}>Document title</Label>
        <Input
          id={titleId}
          value={value.title}
          onChange={(event) =>
            onChange({ ...value, title: event.target.value })
          }
        />
      </div>
      <div>
        <Label htmlFor={templateId}>Template</Label>
        <select
          id={templateId}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={value.template}
          onChange={(event) =>
            onChange({
              ...value,
              template: event.target.value as MarkdownToPdfRequest["template"],
            })
          }
        >
          <option value="github">GitHub</option>
          <option value="academic">Academic</option>
          <option value="rca">Root-cause analysis</option>
        </select>
      </div>
      <div>
        <Label htmlFor={markdownId}>Markdown</Label>
        <Textarea
          id={markdownId}
          className="min-h-72 font-mono text-xs"
          value={value.markdown}
          onChange={(event) =>
            onChange({ ...value, markdown: event.target.value })
          }
          placeholder="# Document"
        />
      </div>
    </div>
  )
}
