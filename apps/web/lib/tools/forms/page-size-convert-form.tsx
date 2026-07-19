'use client';

import { useId } from 'react';
import type { PageSizeConvertOptions } from '@pdf-everything/types';
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

const TARGETS: PageSizeConvertOptions['targetSize'][] = ['a4', 'a3', 'a5', 'letter', 'legal'];

export function PageSizeConvertOptionsForm({
  value,
  onChange,
}: OptionsFormProps<PageSizeConvertOptions>) {
  const tId = useId();
  const oId = useId();
  const fId = useId();
  const pId = useId();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={tId}>Target size</Label>
          <Select
            value={value.targetSize}
            onValueChange={(v) =>
              onChange({ ...value, targetSize: v as PageSizeConvertOptions['targetSize'] })
            }
          >
            <SelectTrigger id={tId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TARGETS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor={oId}>Orientation</Label>
          <Select
            value={value.orientation}
            onValueChange={(v) =>
              onChange({ ...value, orientation: v as 'portrait' | 'landscape' })
            }
          >
            <SelectTrigger id={oId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portrait">Portrait</SelectItem>
              <SelectItem value="landscape">Landscape</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor={fId}>Fit mode</Label>
          <Select
            value={value.fitMode}
            onValueChange={(v) =>
              onChange({ ...value, fitMode: v as 'scale' | 'box-only' })
            }
          >
            <SelectTrigger id={fId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scale">Scale content to fit</SelectItem>
              <SelectItem value="box-only">Resize page only (keep content)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor={pId}>Pages (optional)</Label>
          <Input
            id={pId}
            placeholder="all"
            value={value.pages ?? ''}
            onChange={(e) => onChange({ ...value, pages: e.target.value || undefined })}
          />
        </div>
      </div>
    </div>
  );
}
