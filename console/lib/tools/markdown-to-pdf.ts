import { FileCode2 } from "lucide-react"
import {
  MarkdownToPdfRequestSchema,
  type MarkdownToPdfRequest,
} from "@pdf-everything/types"
import { MarkdownToPdfOptionsForm } from "./forms/markdown-to-pdf-form"
import type { ToolDefinition } from "./types"

export const markdownToPdfTool: ToolDefinition<MarkdownToPdfRequest> = {
  id: "markdown-to-pdf",
  category: "convert-to",
  title: "Markdown to PDF",
  description:
    "Render Markdown with a built-in template through the isolated Chromium worker.",
  Icon: FileCode2,
  acceptMimes: [],
  acceptExtensions: [],
  multiple: false,
  minFiles: 0,
  maxFiles: 0,
  requiresFiles: false,
  endpoint: "/api/v1/render/markdown",
  fileFieldName: "file",
  schema: MarkdownToPdfRequestSchema,
  defaultOptions: {
    markdown: "# Hello\n\nStart writing your document.",
    template: "github",
    title: "Document",
    format: "A4",
    printBackground: true,
    navigationTimeoutMs: 30000,
  },
  OptionsForm: MarkdownToPdfOptionsForm,
  responseType: "binary",
  outputFilename: () => "markdown.pdf",
}
