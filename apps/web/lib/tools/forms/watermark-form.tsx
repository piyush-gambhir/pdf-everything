'use client';

import { useId } from 'react';
import type { WatermarkOptions, Position } from '@pdf-everything/types';
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
  'middle-left',
  'middle-center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

export function WatermarkOptionsForm({ value, onChange }: OptionsFormProps<WatermarkOptions>) {
  const tId = useId();
  const pId = useId();
  const fId = useId();
  const oId = useId();
  const rId = useId();
  const pgId = useId();

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor={tId}>Watermark text</Label>
        <Input
          id={tId}
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          placeholder="DRAFT"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
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
          <Label htmlFor={fId}>Font size</Label>
          <Input
            id={fId}
            type="number"
            min={8}
            max={400}
            value={value.fontSize}
            onChange={(e) => onChange({ ...value, fontSize: Number(e.target.value) || 60 })}
          />
        </div>
        <div>
          <Label htmlFor={oId}>Opacity (0–1)</Label>
          <Input
            id={oId}
            type="number"
            min={0.05}
            max={1}
            step={0.05}
            value={value.opacity}
            onChange={(e) => onChange({ ...value, opacity: Number(e.target.value) || 0.25 })}
          />
        </div>
        <div>
          <Label htmlFor={rId}>Rotation (deg)</Label>
          <Input
            id={rId}
            type="number"
            min={-180}
            max={180}
            value={value.rotation}
            onChange={(e) => onChange({ ...value, rotation: Number(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div>
        <Label htmlFor={pgId}>Pages (optional)</Label>
        <Input
          id={pgId}
          placeholder="all pages"
          value={value.pages ?? ''}
          onChange={(e) => onChange({ ...value, pages: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}
