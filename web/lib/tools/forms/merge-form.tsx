'use client';

import type { MergeOptions } from '@pdf-everything/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OptionsFormProps } from '../types';

export function MergeOptionsForm({ value, onChange }: OptionsFormProps<MergeOptions>) {
  return (
    <div className="space-y-2">
      <Label htmlFor="merge-filename">Output filename</Label>
      <Input
        id="merge-filename"
        placeholder="merged.pdf"
        value={value.outputFilename ?? ''}
        onChange={(e) =>
          onChange({ ...value, outputFilename: e.target.value || undefined })
        }
      />
      <p className="text-xs text-muted-foreground">
        Drag PDFs in the order you want them combined.
      </p>
    </div>
  );
}
