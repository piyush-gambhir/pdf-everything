'use client';

import { useId } from 'react';
import type {
  ImagesToPdfOptions,
  PageSize,
  Orientation,
} from '@pdf-everything/types';
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

const PAGE_SIZES: PageSize[] = ['a4', 'a3', 'a5', 'letter', 'legal', 'auto'];
const ORIENTATIONS: Orientation[] = ['portrait', 'landscape', 'auto'];
const FITS: ImagesToPdfOptions['fit'][] = ['contain', 'cover', 'stretch'];

export function ImagesToPdfOptionsForm({
  value,
  onChange,
}: OptionsFormProps<ImagesToPdfOptions>) {
  const psId = useId();
  const orId = useId();
  const mId = useId();
  const fId = useId();

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label htmlFor={psId}>Page size</Label>
        <Select
          value={value.pageSize}
          onValueChange={(v) => onChange({ ...value, pageSize: v as PageSize })}
        >
          <SelectTrigger id={psId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor={orId}>Orientation</Label>
        <Select
          value={value.orientation}
          onValueChange={(v) => onChange({ ...value, orientation: v as Orientation })}
        >
          <SelectTrigger id={orId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORIENTATIONS.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor={mId}>Margin (pt)</Label>
        <Input
          id={mId}
          type="number"
          min={0}
          max={144}
          value={value.margin}
          onChange={(e) => onChange({ ...value, margin: Number(e.target.value) || 0 })}
        />
      </div>
      <div>
        <Label htmlFor={fId}>Fit</Label>
        <Select
          value={value.fit}
          onValueChange={(v) =>
            onChange({ ...value, fit: v as ImagesToPdfOptions['fit'] })
          }
        >
          <SelectTrigger id={fId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FITS.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
