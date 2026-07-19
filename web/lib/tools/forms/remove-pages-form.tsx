'use client';

import { useId } from 'react';
import type { RemovePagesOptions } from '@pdf-everything/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OptionsFormProps } from '../types';

export function RemovePagesOptionsForm({ value, onChange }: OptionsFormProps<RemovePagesOptions>) {
  const pagesId = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={pagesId}>Pages to remove</Label>
      <Input
        id={pagesId}
        placeholder="2, 4-6, 9"
        value={value.pages}
        onChange={(e) => onChange({ pages: e.target.value })}
      />
      <p className="text-xs text-muted-foreground">
        Comma-separated page numbers and ranges.
      </p>
    </div>
  );
}
