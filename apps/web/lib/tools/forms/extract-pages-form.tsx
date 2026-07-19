'use client';

import { useId } from 'react';
import type { ExtractPagesOptions } from '@pdf-everything/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OptionsFormProps } from '../types';

export function ExtractPagesOptionsForm({
  value,
  onChange,
}: OptionsFormProps<ExtractPagesOptions>) {
  const pagesId = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={pagesId}>Pages to extract</Label>
      <Input
        id={pagesId}
        placeholder="1-3, 5, 7-9"
        value={value.pages}
        onChange={(e) => onChange({ pages: e.target.value })}
      />
      <p className="text-xs text-muted-foreground">
        These pages will be extracted into a new PDF, in the order listed.
      </p>
    </div>
  );
}
