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
import { Separator } from '@/components/ui/separator';
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

  const Icon = tool.Icon;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-start gap-4">
        <div className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Icon className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tool.title}</h1>
          <p className="text-sm text-muted-foreground">{tool.description}</p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          {!result && (
            <>
              <FileDropzone
                files={files}
                onChange={setFiles}
                acceptMimes={tool.acceptMimes}
                acceptExtensions={tool.acceptExtensions}
                multiple={tool.multiple}
                maxFiles={tool.maxFiles}
                reorderable={tool.id === 'merge' || tool.id === 'images-to-pdf'}
              />
              {files.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Options</h3>
                    <tool.OptionsForm
                      value={options as never}
                      onChange={setOptions as never}
                      fileNames={files.map((f) => f.name)}
                    />
                  </div>
                  <Separator />
                  <div className="flex justify-end">
                    <Button size="lg" onClick={submit} disabled={!canSubmit}>
                      {busy ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Working…
                        </>
                      ) : (
                        <>{tool.title}</>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {result && <ResultView result={result} onReset={reset} tool={tool} />}
        </CardContent>
      </Card>
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
        <ul className="divide-y rounded-xl border bg-card">
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
        <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap">
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
      <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/30 p-3 font-mono text-xs">
        {json}
      </pre>
    </div>
  );
}

function deriveFilename(input: string | undefined, toolId: string): string {
  const base = (input ?? 'document.pdf').replace(/\.pdf$/i, '');
  return `${base}-${toolId}.pdf`;
}
