"use client"

import {
  useCallback,
  useRef,
  useState,
  type DragEvent,
  type ChangeEvent,
} from "react"
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
  Trash2,
  UploadCloud,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatBytes } from "@/lib/format"
import { Button } from "@/components/ui/button"

interface FileDropzoneProps {
  files: File[]
  onChange: (files: File[]) => void
  acceptMimes: string[]
  acceptExtensions: string[]
  multiple: boolean
  maxFiles: number
  reorderable?: boolean
}

export function FileDropzone({
  files,
  onChange,
  acceptMimes,
  acceptExtensions,
  multiple,
  maxFiles,
  reorderable = false,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const addFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming || incoming.length === 0) return
      const arr = Array.from(incoming)
      const filtered = arr.filter((f) =>
        isAccepted(f, acceptMimes, acceptExtensions)
      )
      const rejected = arr.length - filtered.length
      const next = multiple
        ? [...files, ...filtered].slice(0, maxFiles)
        : filtered.slice(0, 1)
      if (rejected > 0) {
        setFeedback(
          `${rejected} ${rejected === 1 ? "file was" : "files were"} skipped because the format is not supported.`
        )
      } else if (multiple && files.length + filtered.length > maxFiles) {
        setFeedback(`Only the first ${maxFiles} files were added.`)
      } else {
        setFeedback(null)
      }
      onChange(next)
    },
    [files, multiple, maxFiles, acceptMimes, acceptExtensions, onChange]
  )

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files)
    e.target.value = ""
  }

  const remove = (idx: number) => onChange(files.filter((_, i) => i !== idx))
  const move = (from: number, to: number) => {
    if (to < 0 || to >= files.length) return
    const next = [...files]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item!)
    onChange(next)
  }

  const acceptStr = [...acceptMimes, ...acceptExtensions].join(",")

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        className={cn(
          "group flex cursor-pointer flex-col items-center justify-center rounded-xl px-6 text-center",
          "transition-colors duration-150",
          files.length > 0 ? "py-5" : "py-8",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          isDragging ? "bg-brand-soft" : "bg-surface-2 hover:bg-brand-soft/35"
        )}
      >
        <span
          className={cn(
            "mb-2.5 grid size-9 place-items-center rounded-lg transition-colors",
            isDragging
              ? "bg-accent text-accent-foreground"
              : "bg-background text-muted-foreground group-hover:text-accent"
          )}
        >
          <UploadCloud className="size-4.5" />
        </span>
        <p className="ui-heading font-semibold">
          {isDragging
            ? "Release to add"
            : multiple
              ? "Drop files here"
              : "Drop a file here"}
        </p>
        <p className="ui-caption mt-1 text-muted-foreground">
          Drag and drop or{" "}
          <span className="font-medium text-accent">
            choose from your device
          </span>
        </p>
        <p className="ui-micro mt-2 text-subtle-foreground">
          {acceptExtensions.length > 0
            ? acceptExtensions
                .map((extension) => extension.slice(1).toUpperCase())
                .join(", ")
            : "Supported files"}
          {multiple ? ` · up to ${maxFiles} files` : ""}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={acceptStr}
          multiple={multiple}
          className="hidden"
          onChange={onPick}
        />
      </div>

      {feedback && (
        <div className="ui-caption flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-warning">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          {feedback}
        </div>
      )}

      {files.length > 0 && (
        <div className="overflow-hidden rounded-xl bg-surface-1 p-1">
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="ui-micro font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Queue · {files.length} {files.length === 1 ? "file" : "files"}
            </p>
            {multiple && files.length < maxFiles && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => inputRef.current?.click()}
                className="text-accent"
              >
                <Plus className="size-3" />
                Add more
              </Button>
            )}
          </div>
          <ul className="space-y-1">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center gap-3 rounded-lg bg-background px-3 py-2.5"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-1 text-muted-foreground">
                  <FileText className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="ui-body truncate font-medium">{f.name}</p>
                  <p className="ui-micro mt-0.5 text-muted-foreground">
                    {formatBytes(f.size)}
                    {reorderable && files.length > 1
                      ? ` · position ${i + 1}`
                      : ""}
                  </p>
                </div>
                {reorderable && files.length > 1 && (
                  <div className="flex gap-0.5">
                    <Button
                      type="button"
                      onClick={() => move(i, i - 1)}
                      disabled={i === 0}
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Move ${f.name} up`}
                    >
                      <ChevronUp className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      onClick={() => move(i, i + 1)}
                      disabled={i === files.length - 1}
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Move ${f.name} down`}
                    >
                      <ChevronDown className="size-3" />
                    </Button>
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => remove(i)}
                  aria-label={`Remove ${f.name}`}
                  className="text-muted-foreground hover:text-danger"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function isAccepted(file: File, mimes: string[], exts: string[]): boolean {
  if (mimes.length === 0 && exts.length === 0) return true
  if (mimes.includes(file.type)) return true
  const lower = file.name.toLowerCase()
  return exts.some((e) => lower.endsWith(e.toLowerCase()))
}
