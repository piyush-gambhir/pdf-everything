'use client';

import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { FilePlus2, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/format';
import { Button } from '@/components/ui/button';

interface FileDropzoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  acceptMimes: string[];
  acceptExtensions: string[];
  multiple: boolean;
  maxFiles: number;
  reorderable?: boolean;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming || incoming.length === 0) return;
      const arr = Array.from(incoming);
      const filtered = arr.filter((f) => isAccepted(f, acceptMimes, acceptExtensions));
      const next = multiple ? [...files, ...filtered].slice(0, maxFiles) : filtered.slice(0, 1);
      onChange(next);
    },
    [files, multiple, maxFiles, acceptMimes, acceptExtensions, onChange],
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    e.target.value = '';
  };

  const remove = (idx: number) => onChange(files.filter((_, i) => i !== idx));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= files.length) return;
    const next = [...files];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  };

  const acceptStr = [...acceptMimes, ...acceptExtensions].join(',');

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border bg-card hover:border-foreground/30 hover:bg-muted/30',
        )}
      >
        <FilePlus2 className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          {multiple ? 'Drop PDF files here' : 'Drop a PDF file here'}
        </p>
        <p className="text-xs text-muted-foreground">
          or click to browse {multiple ? `(up to ${maxFiles})` : ''}
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

      {files.length > 0 && (
        <ul className="divide-y rounded-xl border bg-card">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-3 px-3 py-2">
              {reorderable && files.length > 1 && (
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      move(i, i - 1);
                    }}
                    disabled={i === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <GripVertical className="size-4 rotate-180" />
                  </button>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(f.size)}</p>
              </div>
              {reorderable && files.length > 1 && (
                <div className="flex gap-1 text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    className="rounded px-1.5 py-0.5 hover:bg-muted disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, i + 1)}
                    disabled={i === files.length - 1}
                    className="rounded px-1.5 py-0.5 hover:bg-muted disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(i)}
                aria-label="Remove"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function isAccepted(file: File, mimes: string[], exts: string[]): boolean {
  if (mimes.length === 0 && exts.length === 0) return true;
  if (mimes.includes(file.type)) return true;
  const lower = file.name.toLowerCase();
  return exts.some((e) => lower.endsWith(e.toLowerCase()));
}
