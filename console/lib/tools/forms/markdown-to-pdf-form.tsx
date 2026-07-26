"use client"

import { useId } from "react"
import type { MarkdownToPdfRequest } from "@pdf-everything/types"
import { Input } from "@/components/ui/input"
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

export function MarkdownToPdfOptionsForm({
  value,
  onChange,
}: OptionsFormProps<MarkdownToPdfRequest>) {
  const markdownId = useId()
  const titleId = useId()
  const templateId = useId()
  const formatId = useId()
  const backgroundId = useId()
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={templateId}>Template</Label>
          <Select
            value={value.template}
            onValueChange={(template) =>
              onChange({
                ...value,
                template: template as MarkdownToPdfRequest["template"],
              })
            }
          >
            <SelectTrigger id={templateId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="github">GitHub</SelectItem>
              <SelectItem value="academic">Academic</SelectItem>
              <SelectItem value="rca">Root-cause analysis</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor={formatId}>Page format</Label>
          <Select
            value={value.format}
            onValueChange={(format) =>
              onChange({
                ...value,
                format: format as MarkdownToPdfRequest["format"],
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
      </div>
      <div>
        <Label htmlFor={markdownId}>Markdown</Label>
        <Textarea
          id={markdownId}
          className="ui-caption min-h-56 font-mono"
          value={value.markdown}
          onChange={(event) =>
            onChange({ ...value, markdown: event.target.value })
          }
          placeholder="# Document"
        />
        <div className="ui-micro mt-1.5 flex items-center justify-between text-muted-foreground">
          <span>Markdown with headings, tables, lists, and code blocks</span>
          <span className="font-mono">
            {value.markdown.length.toLocaleString()} chars
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-surface-1 px-3 py-2.5">
        <Label
          htmlFor={backgroundId}
          className="mb-0 flex flex-col items-start gap-1"
        >
          <span>Print backgrounds</span>
          <span className="ui-caption font-normal text-muted-foreground">
            Include template colors and backgrounds.
          </span>
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
  )
}
