'use client';

import { useId } from 'react';
import type { ExtractTextOptions } from '@pdf-everything/types';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { OptionsFormProps } from '../types';

export function ExtractTextOptionsForm({
  value,
  onChange,
}: OptionsFormProps<ExtractTextOptions>) {
  const id = useId();
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className="flex flex-col items-start gap-1">
        <span>Preserve blank lines</span>
        <span className="text-xs font-normal text-muted-foreground">
          Keep multi-line whitespace intact in the output.
        </span>
      </Label>
      <Switch
        id={id}
        checked={value.preserveBlankLines}
        onCheckedChange={(checked) => onChange({ ...value, preserveBlankLines: checked })}
      />
    </div>
  );
}
