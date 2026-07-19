'use client';

import { useId } from 'react';
import type { PageNumberOptions, PageNumberFormat, Position } from '@pdf-everything/types';
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

const POSITIONS: Position[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

const FORMATS: { value: PageNumberFormat; label: string }[] = [
  { value: 'n', label: '1, 2, 3' },
  { value: 'n_of_m', label: '1 / 5' },
  { value: 'page_n', label: 'Page 1' },
  { value: 'page_n_of_m', label: 'Page 1 of 5' },
];

export function PageNumberOptionsForm({ value, onChange }: OptionsFormProps<PageNumberOptions>) {
  const fId = useId();
  const pId = useId();
  const sId = useId();
  const mId = useId();
  const stId = useId();
  const pgId = useId();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={fId}>Format</Label>
          <Select
            value={value.format}
            onValueChange={(v) => onChange({ ...value, format: v as PageNumberFormat })}
          >
            <SelectTrigger id={fId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor={pId}>Position</Label>
          <Select
            value={value.position}
            onValueChange={(v) => onChange({ ...value, position: v as Position })}
          >
            <SelectTrigger id={pId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor={sId}>Font size (pt)</Label>
          <Input
            id={sId}
            type="number"
            min={6}
            max={72}
            value={value.fontSize}
            onChange={(e) => onChange({ ...value, fontSize: Number(e.target.value) || 11 })}
          />
        </div>
        <div>
          <Label htmlFor={mId}>Margin (pt)</Label>
          <Input
            id={mId}
            type="number"
            min={0}
            max={200}
            value={value.margin}
            onChange={(e) => onChange({ ...value, margin: Number(e.target.value) || 28 })}
          />
        </div>
        <div>
          <Label htmlFor={stId}>Start at</Label>
          <Input
            id={stId}
            type="number"
            min={1}
            value={value.startNumber}
            onChange={(e) => onChange({ ...value, startNumber: Number(e.target.value) || 1 })}
          />
        </div>
        <div>
          <Label htmlFor={pgId}>Pages (optional)</Label>
          <Input
            id={pgId}
            placeholder="all"
            value={value.pages ?? ''}
            onChange={(e) => onChange({ ...value, pages: e.target.value || undefined })}
          />
        </div>
      </div>
    </div>
  );
}
