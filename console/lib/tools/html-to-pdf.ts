import { Code2 } from "lucide-react"
import {
  HtmlToPdfRequestSchema,
  type HtmlToPdfRequest,
} from "@pdf-everything/types"
import { HtmlToPdfOptionsForm } from "./forms/html-to-pdf-form"
import type { ToolDefinition } from "./types"

export const htmlToPdfTool: ToolDefinition<HtmlToPdfRequest> = {
  id: "html-to-pdf",
  category: "convert-to",
  title: "HTML to PDF",
  description:
    "Render an HTML document as PDF through the isolated Chromium worker.",
  Icon: Code2,
  acceptMimes: [],
  acceptExtensions: [],
  multiple: false,
  minFiles: 0,
  maxFiles: 0,
  requiresFiles: false,
  endpoint: "/api/v1/render/html",
  fileFieldName: "file",
  schema: HtmlToPdfRequestSchema,
  defaultOptions: {
    html: "<!doctype html><html><body><h1>Hello</h1></body></html>",
    format: "A4",
    printBackground: true,
    navigationTimeoutMs: 30000,
  },
  OptionsForm: HtmlToPdfOptionsForm,
  responseType: "binary",
  outputFilename: () => "html.pdf",
}
