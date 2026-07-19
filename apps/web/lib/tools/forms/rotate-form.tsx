'use client';

import { useId } from 'react';
import type { RotateOptions } from '@pdf-everything/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OptionsFormProps } from '../types';

export function RotateOptionsForm({ value, onChange }: OptionsFormProps<RotateOptions>) {
  const angleId = useId();
  const pagesId = useId();
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={angleId}>Rotation</Label>
        <Select
          value={String(value.angle)}
          onValueChange={(v) =>
            onChange({ ...value, angle: Number(v) as RotateOptions['angle'] })
          }
        >
          <SelectTrigger id={angleId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="90">90° clockwise</SelectItem>
            <SelectItem value="180">180° (upside-down)</SelectItem>
            <SelectItem value="270">90° counter-clockwise</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={pagesId}>Pages (optional)</Label>
        <Input
          id={pagesId}
          placeholder="all pages"
          value={value.pages ?? ''}
          onChange={(e) =>
            onChange({ ...value, pages: e.target.value || undefined })
          }
        />
        <p className="text-xs text-muted-foreground">
          Leave blank to rotate every page. Format: <code>1-3, 5, 7-9</code>
        </p>
      </div>
    </div>
  );
}
