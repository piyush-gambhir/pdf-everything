'use client';

import { useId } from 'react';
import type { SplitOptions } from '@pdf-everything/types';
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

export function SplitOptionsForm({ value, onChange }: OptionsFormProps<SplitOptions>) {
  const modeId = useId();
  const rangesId = useId();

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={modeId}>Mode</Label>
        <Select
          value={value.mode}
          onValueChange={(v) =>
            onChange(v === 'each' ? { mode: 'each' } : { mode: 'ranges', ranges: ['1'] })
          }
        >
          <SelectTrigger id={modeId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ranges">By page ranges</SelectItem>
            <SelectItem value="each">One PDF per page</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {value.mode === 'ranges' && (
        <div className="space-y-2">
          <Label htmlFor={rangesId}>Ranges (one per output)</Label>
          <Input
            id={rangesId}
            placeholder="1-2, 3-5"
            value={value.ranges.join(', ')}
            onChange={(e) =>
              onChange({
                mode: 'ranges',
                ranges: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            Each comma-separated entry becomes a separate output PDF.
          </p>
        </div>
      )}
    </div>
  );
}
