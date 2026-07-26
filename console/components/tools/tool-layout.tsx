"use client"

import { useMemo, useState } from "react"
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  FileText,
  FileUp,
  Loader2,
  LockKeyhole,
  RotateCcw,
  Settings2,
} from "lucide-react"
import { toast } from "sonner"
import type { FileMeta } from "@pdf-everything/types"
import {
  ApiError,
  postBinary,
  postJson,
  postText,
  fileContentUrl,
  type SplitResponse,
} from "@/lib/api"
import { formatBytes } from "@/lib/format"
import { getTool } from "@/lib/tools/registry"
import { CATEGORY_META } from "@/lib/tools/types"
import type { AnyToolDefinition } from "@/lib/tools/types"
import { Button } from "@/components/ui/button"
import { FileDropzone } from "./file-dropzone"

interface ToolLayoutProps {
  toolId: string
}

type Result =
  | { kind: "binary"; url: string; filename: string; size: number }
  | { kind: "multi-files"; files: FileMeta[] }
  | { kind: "text"; text: string; filename: string }
  | { kind: "json"; data: unknown }

export function ToolLayout({ toolId }: ToolLayoutProps) {
  const tool = useMemo(() => getTool(toolId), [toolId])
  const [files, setFiles] = useState<File[]>([])
  const [options, setOptions] = useState<unknown>(tool?.defaultOptions)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  if (!tool) return <div className="p-6">Unknown tool: {toolId}</div>
  const requiresFiles = tool.requiresFiles !== false

  const reset = () => {
    if (result?.kind === "binary") URL.revokeObjectURL(result.url)
    setFiles([])
    setOptions(tool.defaultOptions)
    setResult(null)
  }

  const canSubmit =
    !busy && files.length >= tool.minFiles && files.length <= tool.maxFiles

  const submit = async () => {
    setBusy(true)
    try {
      const parsed = tool.schema.safeParse(options)
      if (!parsed.success) {
        toast.error("Invalid options", {
          description: parsed.error.issues[0]?.message ?? "Validation failed",
        })
        return
      }
      const payload = {
        endpoint: tool.endpoint,
        files,
        fileFieldName: tool.fileFieldName,
        options: parsed.data,
      }

      if (tool.responseType === "binary") {
        const blob = await postBinary(payload)
        const url = URL.createObjectURL(blob)
        const filename =
          tool.outputFilename?.(files.map((f) => f.name)) ??
          deriveFilename(files[0]?.name, tool.id)
        setResult({ kind: "binary", url, filename, size: blob.size })
        toast.success("Done — your file is ready")
      } else if (tool.responseType === "multi-files") {
        const json = await postJson<SplitResponse>(payload)
        setResult({ kind: "multi-files", files: json.files })
        toast.success(`Done — ${json.files.length} files ready`)
      } else if (tool.responseType === "text") {
        const text = await postText(payload)
        const filename = deriveFilename(files[0]?.name, tool.id).replace(
          /\.pdf$/i,
          ".txt"
        )
        setResult({ kind: "text", text, filename })
        toast.success("Done — text extracted")
      } else {
        const data = await postJson<unknown>(payload)
        setResult({ kind: "json", data })
        toast.success("Done")
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.problem.title, { description: err.problem.detail })
      } else {
        toast.error("Request failed", {
          description: err instanceof Error ? err.message : "Unknown error",
        })
      }
    } finally {
      setBusy(false)
    }
  }

  const formatHint = !requiresFiles
    ? "Text"
    : tool.acceptExtensions.length
      ? tool.acceptExtensions
          .map((e) => e.replace(/^\./, "").toUpperCase())
          .join(", ")
      : "PDF"
  const limitHint = !requiresFiles
    ? "No file upload"
    : tool.multiple
      ? `Up to ${tool.maxFiles} files`
      : "One file at a time"
  const ToolIcon = tool.Icon
  const category = CATEGORY_META[tool.category]
  const inputReady = !requiresFiles || files.length >= tool.minFiles
  const configureReady = inputReady

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-accent">
            <ToolIcon className="size-4" strokeWidth={1.8} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="ui-micro font-semibold tracking-[0.08em] text-accent uppercase">
                {category.label}
              </span>
              <span className="size-1 rounded-full bg-muted-foreground/35" />
              <code className="ui-micro font-mono text-subtle-foreground">
                {tool.endpoint}
              </code>
            </div>
            <h2 className="ui-title mt-0.5 font-semibold tracking-[-0.02em]">
              {tool.title}
            </h2>
            <p className="ui-body mt-0.5 max-w-2xl text-muted-foreground">
              {tool.description}
            </p>
          </div>
        </div>
        <div className="ui-micro flex shrink-0 items-center gap-1.5 rounded-md bg-success-soft px-2 py-1 font-medium text-success">
          <LockKeyhole className="size-3" />
          Processed by your workers
        </div>
      </section>

      <div className="mt-4 rounded-lg bg-surface-1 px-3 py-2.5">
        <div className="flex items-center">
          {requiresFiles && (
            <>
              <WorkflowStep
                number={1}
                label={tool.multiple ? "Add files" : "Add file"}
                complete={inputReady}
                active={!inputReady}
              />
              <StepConnector complete={inputReady} />
            </>
          )}
          <WorkflowStep
            number={requiresFiles ? 2 : 1}
            label="Configure"
            complete={Boolean(result)}
            active={configureReady && !result}
          />
          <StepConnector complete={Boolean(result)} />
          <WorkflowStep
            number={requiresFiles ? 3 : 2}
            label="Download"
            complete={Boolean(result)}
            active={Boolean(result)}
          />
        </div>
      </div>

      {result ? (
        <div className="app-panel mt-3 p-4 sm:p-5">
          <ResultView result={result} onReset={reset} tool={tool} />
        </div>
      ) : (
        <div
          className={
            requiresFiles
              ? "mt-3 grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]"
              : "mt-3 max-w-4xl"
          }
        >
          {requiresFiles && (
            <section className="app-panel p-4">
              <StepHeading
                icon={FileUp}
                eyebrow="Input"
                label={tool.multiple ? "Add your files" : "Add your file"}
                description={
                  tool.multiple
                    ? `Choose ${tool.minFiles}–${tool.maxFiles} files. You can review and reorder them before running.`
                    : "Choose a file to begin. You can replace it at any time."
                }
              />
              <div className="mt-3">
                <FileDropzone
                  files={files}
                  onChange={setFiles}
                  acceptMimes={tool.acceptMimes}
                  acceptExtensions={tool.acceptExtensions}
                  multiple={tool.multiple}
                  maxFiles={tool.maxFiles}
                  reorderable={
                    tool.id === "merge" || tool.id === "images-to-pdf"
                  }
                />
              </div>
            </section>
          )}

          <section
            className={
              requiresFiles
                ? "app-panel overflow-hidden lg:sticky lg:top-4"
                : "app-panel overflow-hidden"
            }
          >
            <div className="p-4">
              <StepHeading
                icon={Settings2}
                eyebrow="Settings"
                label="Configure the output"
                description="Adjust the options below, then run this workflow."
              />

              <div className="mt-4">
                <tool.OptionsForm
                  value={options as never}
                  onChange={setOptions as never}
                  fileNames={files.map((f) => f.name)}
                />
              </div>
            </div>

            <div className="bg-surface-2 p-4">
              <Button
                className="w-full"
                size="lg"
                onClick={submit}
                disabled={!canSubmit}
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    {tool.title}
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>

              {!canSubmit && requiresFiles && (
                <p className="ui-caption mt-2.5 text-center text-muted-foreground">
                  Add{" "}
                  {tool.minFiles === 1
                    ? "a file"
                    : `at least ${tool.minFiles} files`}{" "}
                  to continue
                </p>
              )}

              <dl className="mt-4 grid grid-cols-2 gap-2">
                <SummaryItem label="Accepts" value={formatHint} />
                <SummaryItem label="Limit" value={limitHint} />
                {files.length > 0 && (
                  <SummaryItem
                    label="Selected"
                    value={`${files.length} ${files.length === 1 ? "file" : "files"}`}
                  />
                )}
                <SummaryItem
                  label="Output"
                  value={resultLabel(tool.responseType)}
                />
              </dl>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function StepHeading({
  icon: Icon,
  eyebrow,
  label,
  description,
}: {
  icon: typeof FileUp
  eyebrow: string
  label: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="ui-micro font-semibold tracking-[0.08em] text-subtle-foreground uppercase">
          {eyebrow}
        </p>
        <h3 className="ui-heading mt-0.5 font-semibold">{label}</h3>
        <p className="ui-caption mt-1 text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function WorkflowStep({
  number,
  label,
  complete,
  active,
}: {
  number: number
  label: string
  complete: boolean
  active: boolean
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span
        className={
          complete
            ? "ui-micro grid size-5 place-items-center rounded-full bg-success font-semibold text-white"
            : active
              ? "ui-micro grid size-5 place-items-center rounded-full bg-accent font-semibold text-accent-foreground"
              : "ui-micro grid size-5 place-items-center rounded-full bg-muted font-semibold text-muted-foreground"
        }
      >
        {complete ? <Check className="size-3" /> : number}
      </span>
      <span
        className={
          active || complete
            ? "ui-caption hidden font-medium text-foreground sm:inline"
            : "ui-caption hidden font-medium text-subtle-foreground sm:inline"
        }
      >
        {label}
      </span>
    </div>
  )
}

function StepConnector({ complete }: { complete: boolean }) {
  return (
    <span
      className={
        complete
          ? "mx-2 h-px min-w-4 flex-1 bg-success/45 sm:mx-4"
          : "mx-2 h-px min-w-4 flex-1 bg-muted sm:mx-4"
      }
    />
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background px-2.5 py-2">
      <dt className="ui-micro font-semibold tracking-[0.08em] text-subtle-foreground uppercase">
        {label}
      </dt>
      <dd className="ui-caption mt-0.5 truncate font-medium">{value}</dd>
    </div>
  )
}

function resultLabel(responseType: AnyToolDefinition["responseType"]): string {
  if (responseType === "text") return "Text file"
  if (responseType === "json") return "JSON"
  if (responseType === "multi-files") return "Multiple PDFs"
  return "PDF file"
}

function ResultView({
  result,
  onReset,
  tool,
}: {
  result: Result
  onReset: () => void
  tool: AnyToolDefinition
}) {
  if (result.kind === "binary") {
    return (
      <div className="py-3 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="size-5" />
        </div>
        <div>
          <p className="ui-micro mt-4 font-semibold tracking-[0.08em] text-success uppercase">
            Processing complete
          </p>
          <h3 className="ui-title mt-1 font-semibold">
            Your {tool.title.toLowerCase()} is ready
          </h3>
          <p className="ui-body mt-1 text-muted-foreground">
            {result.filename} · {formatBytes(result.size)}
          </p>
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button asChild size="lg">
            <a href={result.url} download={result.filename}>
              <Download className="size-4" />
              Download
            </a>
          </Button>
          <Button variant="outline" size="lg" onClick={onReset}>
            <RotateCcw className="size-4" />
            Start over
          </Button>
        </div>
      </div>
    )
  }
  if (result.kind === "multi-files") {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-success-soft text-success">
            <CheckCircle2 className="size-5" />
          </div>
          <p className="ui-micro mt-4 font-semibold tracking-[0.08em] text-success uppercase">
            Processing complete
          </p>
          <h3 className="ui-title mt-1 font-semibold">
            {result.files.length} files ready
          </h3>
        </div>
        <ul className="space-y-1 overflow-hidden rounded-xl bg-surface-1 p-1">
          {result.files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 rounded-lg bg-background px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="ui-body truncate font-medium">{f.originalName}</p>
                <p className="ui-caption text-muted-foreground">
                  {formatBytes(f.size)}
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <a href={fileContentUrl(f.id)} download={f.originalName}>
                  <Download className="size-3.5" />
                  Download
                </a>
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex justify-center">
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="size-4" />
            Start over
          </Button>
        </div>
      </div>
    )
  }
  if (result.kind === "text") {
    const blob = new Blob([result.text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-lg bg-success-soft text-success">
              <FileText className="size-5" />
            </div>
            <div>
              <p className="ui-body font-medium">{result.filename}</p>
              <p className="ui-caption text-muted-foreground">
                {formatBytes(new Blob([result.text]).size)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href={url} download={result.filename}>
                <Download className="size-4" />
                Download
              </a>
            </Button>
            <Button variant="outline" onClick={onReset}>
              <RotateCcw className="size-4" />
              Start over
            </Button>
          </div>
        </div>
        <pre className="ui-caption max-h-96 overflow-auto rounded-xl bg-surface-1 p-4 font-mono whitespace-pre-wrap">
          {result.text || "(no text extracted)"}
        </pre>
      </div>
    )
  }
  // json
  const json = JSON.stringify(result.data, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-lg bg-success-soft text-success">
            <FileText className="size-5" />
          </div>
          <p className="ui-body font-medium">JSON result</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={url} download="result.json">
              <Download className="size-4" />
              Download
            </a>
          </Button>
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="size-4" />
            Start over
          </Button>
        </div>
      </div>
      <pre className="ui-caption max-h-96 overflow-auto rounded-xl bg-surface-1 p-4 font-mono">
        {json}
      </pre>
    </div>
  )
}

function deriveFilename(input: string | undefined, toolId: string): string {
  const base = (input ?? "document.pdf").replace(/\.pdf$/i, "")
  return `${base}-${toolId}.pdf`
}
