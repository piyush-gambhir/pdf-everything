'use client';

import { useId } from 'react';
import type { ReorderOptions } from '@pdf-everything/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OptionsFormProps } from '../types';

export function ReorderOptionsForm({ value, onChange }: OptionsFormProps<ReorderOptions>) {
  const orderId = useId();
  const orderText = value.order.join(', ');

  return (
    <div className="space-y-2">
      <Label htmlFor={orderId}>New page order</Label>
      <Input
        id={orderId}
        placeholder="3, 1, 2, 4"
        value={orderText}
        onChange={(e) => {
          const parsed = e.target.value
            .split(',')
            .map((s) => Number(s.trim()))
            .filter((n) => Number.isFinite(n) && n > 0);
          onChange({ order: parsed });
        }}
      />
      <p className="text-xs text-muted-foreground">
        Comma-separated permutation of all page numbers (e.g. <code>3,1,2,4</code> for a 4-page PDF).
      </p>
    </div>
  );
}
