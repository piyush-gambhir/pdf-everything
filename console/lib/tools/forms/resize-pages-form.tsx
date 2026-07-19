'use client';

import { useId } from 'react';
import type { ResizePagesOptions } from '@pdf-everything/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OptionsFormProps } from '../types';

export function ResizePagesOptionsForm({
  value,
  onChange,
}: OptionsFormProps<ResizePagesOptions>) {
  const sId = useId();
  const pId = useId();
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor={sId}>Scale (0.1 – 4)</Label>
        <Input
          id={sId}
          type="number"
          min={0.1}
          max={4}
          step={0.05}
          value={value.scale}
          onChange={(e) => onChange({ ...value, scale: Number(e.target.value) || 1 })}
        />
        <p className="text-xs text-muted-foreground mt-1">0.5 = half size, 2 = double size.</p>
      </div>
      <div>
        <Label htmlFor={pId}>Pages (optional)</Label>
        <Input
          id={pId}
          placeholder="all pages"
          value={value.pages ?? ''}
          onChange={(e) => onChange({ ...value, pages: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}
