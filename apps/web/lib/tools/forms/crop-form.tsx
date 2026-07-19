'use client';

import { useId } from 'react';
import type { CropOptions } from '@pdf-everything/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OptionsFormProps } from '../types';

export function CropOptionsForm({ value, onChange }: OptionsFormProps<CropOptions>) {
  const tId = useId();
  const rId = useId();
  const bId = useId();
  const lId = useId();
  const pId = useId();

  const update = (key: keyof CropOptions['marginPoints'], n: number) =>
    onChange({ ...value, marginPoints: { ...value.marginPoints, [key]: n } });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={tId}>Top (pt)</Label>
          <Input
            id={tId}
            type="number"
            min={0}
            value={value.marginPoints.top}
            onChange={(e) => update('top', Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor={rId}>Right (pt)</Label>
          <Input
            id={rId}
            type="number"
            min={0}
            value={value.marginPoints.right}
            onChange={(e) => update('right', Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor={bId}>Bottom (pt)</Label>
          <Input
            id={bId}
            type="number"
            min={0}
            value={value.marginPoints.bottom}
            onChange={(e) => update('bottom', Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor={lId}>Left (pt)</Label>
          <Input
            id={lId}
            type="number"
            min={0}
            value={value.marginPoints.left}
            onChange={(e) => update('left', Number(e.target.value) || 0)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor={pId}>Pages (optional)</Label>
        <Input
          id={pId}
          placeholder="all pages"
          value={value.pages ?? ''}
          onChange={(e) => onChange({ ...value, pages: e.target.value || undefined })}
        />
        <p className="text-xs text-muted-foreground mt-1">72pt = 1 inch. Leave pages blank for all.</p>
      </div>
    </div>
  );
}
