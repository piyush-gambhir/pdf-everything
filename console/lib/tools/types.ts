import type { ComponentType } from "react"
import type { LucideIcon } from "lucide-react"
import type { ZodType } from "zod"

export type ToolCategory =
  "organize" | "edit" | "convert-to" | "convert-from" | "forms" | "misc"

export const CATEGORY_META: Record<
  ToolCategory,
  { label: string; description: string }
> = {
  organize: {
    label: "Organize",
    description: "Merge, split, reorder, rotate pages",
  },
  edit: { label: "Edit", description: "Watermark, page numbers, metadata" },
  "convert-to": {
    label: "Convert to PDF",
    description: "Images, HTML, and Markdown to PDF",
  },
  "convert-from": {
    label: "Convert from PDF",
    description: "Extract text from PDFs",
  },
  forms: { label: "Forms", description: "Fill, extract, and flatten forms" },
  misc: { label: "Other", description: "Resize pages and convert page sizes" },
}

export interface OptionsFormProps<TOptions> {
  value: TOptions
  onChange: (next: TOptions) => void
  fileNames: string[]
}

export interface ToolDefinition<TOptions> {
  id: string
  category: ToolCategory
  title: string
  description: string
  Icon: LucideIcon
  acceptMimes: string[]
  acceptExtensions: string[]
  multiple: boolean
  minFiles: number
  maxFiles: number
  requiresFiles?: boolean
  endpoint: string
  fileFieldName: "file" | "files"
  schema: ZodType<TOptions, unknown>
  defaultOptions: TOptions
  OptionsForm: ComponentType<OptionsFormProps<TOptions>>
  responseType: "binary" | "multi-files" | "text" | "json"
  outputFilename?: (inputs: string[], options: TOptions) => string
}

export type AnyToolDefinition = ToolDefinition<unknown>
