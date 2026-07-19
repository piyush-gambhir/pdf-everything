'use client';

import { useMemo, useState } from 'react';
import { Loader2, Download, RotateCcw, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { FileMeta } from '@pdf-everything/types';
import {
  ApiError,
  postBinary,
  postJson,
  postText,
  fileContentUrl,
  type SplitResponse,
} from '@/lib/api';
import { formatBytes } from '@/lib/format';
import { getTool } from '@/lib/tools/registry';
import type { AnyToolDefinition } from '@/lib/tools/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileDropzone } from './file-dropzone';

interface ToolLayoutProps {
  toolId: string;
}

type Result =
  | { kind: 'binary'; url: string; filename: string; size: number }
  | { kind: 'multi-files'; files: FileMeta[] }
  | { kind: 'text'; text: string; filename: string }
  | { kind: 'json'; data: unknown };

export function ToolLayout({ toolId }: ToolLayoutProps) {
  const tool = useMemo(() => getTool(toolId), [toolId]);
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<unknown>(tool?.defaultOptions);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  if (!tool) return <div className="p-6">Unknown tool: {toolId}</div>;

  const reset = () => {
    if (result?.kind === 'binary') URL.revokeObjectURL(result.url);
    setFiles([]);
    setOptions(tool.defaultOptions);
    setResult(null);
  };

  const canSubmit =
    !busy && files.length >= tool.minFiles && files.length <= tool.maxFiles;

  const submit = async () => {
    setBusy(true);
    try {
      const parsed = tool.schema.safeParse(options);
      if (!parsed.success) {
        toast.error('Invalid options', {
          description: parsed.error.issues[0]?.message ?? 'Validation failed',
        });
        return;
      }
      const payload = {
        endpoint: tool.endpoint,
        files,
        fileFieldName: tool.fileFieldName,
        options: parsed.data,
      };

      if (tool.responseType === 'binary') {
        const blob = await postBinary(payload);
        const url = URL.createObjectURL(blob);
        const filename =
          tool.outputFilename?.(files.map((f) => f.name)) ??
          deriveFilename(files[0]?.name, tool.id);
        setResult({ kind: 'binary', url, filename, size: blob.size });
        toast.success('Done — your file is ready');
      } else if (tool.responseType === 'multi-files') {
        const json = await postJson<SplitResponse>(payload);
        setResult({ kind: 'multi-files', files: json.files });
        toast.success(`Done — ${json.files.length} files ready`);
      } else if (tool.responseType === 'text') {
        const text = await postText(payload);
        const filename = deriveFilename(files[0]?.name, tool.id).replace(/\.pdf$/i, '.txt');
        setResult({ kind: 'text', text, filename });
        toast.success('Done — text extracted');
      } else {
        const data = await postJson<unknown>(payload);
        setResult({ kind: 'json', data });
        toast.success('Done');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.problem.title, { description: err.problem.detail });
      } else {
        toast.error('Request failed', {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    } finally {
      setBusy(false);
    }
  };


  const formatHint = tool.acceptExtensions.length
    ? tool.acceptExtensions.map((e) => e.replace(/^\./, '').toUpperCase()).join(', ')
    : 'PDF';
  const limitHint = tool.multiple
    ? `Up to ${tool.maxFiles} files`
    : 'One file at a time';

  return (
    <div className="w-full px-6 pt-2 pb-14">
      {/* Title and category live in the app header; the page only needs the
          descriptive line. */}
      <p className="type-body mb-5 max-w-2xl text-muted-foreground">{tool.description}</p>

      {result ? (
        <Card className="bg-surface-2">
          <CardContent className="pt-6">
            <ResultView result={result} onReset={reset} tool={tool} />
          </CardContent>
        </Card>
      ) : (
        // Work area on the left, options rail on the right. The rail sticks so
        // the run button stays reachable while a long file list scrolls.
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card className="bg-surface-2">
            <CardContent className="space-y-4 pt-6">
              <StepHeading n={1} label={tool.multiple ? 'Add your files' : 'Add your file'} />
              <FileDropzone
                files={files}
                onChange={setFiles}
                acceptMimes={tool.acceptMimes}
                acceptExtensions={tool.acceptExtensions}
                multiple={tool.multiple}
                maxFiles={tool.maxFiles}
                reorderable={tool.id === 'merge' || tool.id === 'images-to-pdf'}
              />
            </CardContent>
          </Card>

          <Card className="bg-surface-2 lg:sticky lg:top-2">
            <CardContent className="space-y-4 pt-6">
              <StepHeading n={2} label="Configure & run" />

              {files.length > 0 ? (
                <tool.OptionsForm
                  value={options as never}
                  onChange={setOptions as never}
                  fileNames={files.map((f) => f.name)}
                />
              ) : (
                <p className="type-caption rounded-lg bg-surface-3 px-3 py-2.5 text-muted-foreground">
                  Add {tool.multiple ? 'files' : 'a file'} to see the options for this tool.
                </p>
              )}

              <Button className="w-full" size="lg" onClick={submit} disabled={!canSubmit}>
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Working…
                  </>
                ) : (
                  <>{tool.title}</>
                )}
              </Button>

              <dl className="space-y-1.5 pt-1">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="type-caption text-muted-foreground">Accepts</dt>
                  <dd className="type-caption truncate font-medium">{formatHint}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="type-caption text-muted-foreground">Limit</dt>
                  <dd className="type-caption font-medium">{limitHint}</dd>
                </div>
                {files.length > 0 && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="type-caption text-muted-foreground">Selected</dt>
                    <dd className="type-caption font-medium">
                      {files.length} {files.length === 1 ? 'file' : 'files'}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/** Numbered step marker so the page reads as a sequence, not a wall of controls. */
function StepHeading({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
        {n}
      </span>
      <h2 className="type-section">{label}</h2>
    </div>
  );
}

function ResultView({
  result,
  onReset,
}: {
  result: Result;
  onReset: () => void;
  tool: AnyToolDefinition;
}) {
  if (result.kind === 'binary') {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
          <Download className="size-6" />
        </div>
        <div>
          <h3 className="text-lg font-medium">Ready to download</h3>
          <p className="text-sm text-muted-foreground">
            {result.filename} · {formatBytes(result.size)}
          </p>
        </div>
        <div className="flex justify-center gap-2">
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
    );
  }
  if (result.kind === 'multi-files') {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
            <Download className="size-6" />
          </div>
          <h3 className="mt-2 text-lg font-medium">{result.files.length} files ready</h3>
        </div>
        <ul className="divide-y divide-background/60 overflow-hidden rounded-xl bg-surface-3">
          {result.files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.originalName}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(f.size)}</p>
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
    );
  }
  if (result.kind === 'text') {
    const blob = new Blob([result.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">{result.filename}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(new Blob([result.text]).size)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
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
        <pre className="max-h-96 overflow-auto rounded-lg bg-surface-3 p-3 font-mono text-xs whitespace-pre-wrap">
          {result.text || '(no text extracted)'}
        </pre>
      </div>
    );
  }
  // json
  const json = JSON.stringify(result.data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-5" />
          </div>
          <p className="text-sm font-medium">JSON result</p>
        </div>
        <div className="flex gap-2">
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
      <pre className="max-h-96 overflow-auto rounded-lg bg-surface-3 p-3 font-mono text-xs">
        {json}
      </pre>
    </div>
  );
}

function deriveFilename(input: string | undefined, toolId: string): string {
  const base = (input ?? 'document.pdf').replace(/\.pdf$/i, '');
  return `${base}-${toolId}.pdf`;
}
