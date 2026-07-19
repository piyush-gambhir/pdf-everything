'use client';

import { useId } from 'react';
import type { MetadataOptions } from '@pdf-everything/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OptionsFormProps } from '../types';

export function MetadataOptionsForm({ value, onChange }: OptionsFormProps<MetadataOptions>) {
  const tId = useId();
  const aId = useId();
  const sId = useId();
  const kId = useId();
  const pId = useId();
  const cId = useId();

  const set = (key: keyof MetadataOptions, raw: string) =>
    onChange({ ...value, [key]: raw || undefined });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label htmlFor={tId}>Title</Label>
          <Input id={tId} value={value.title ?? ''} onChange={(e) => set('title', e.target.value)} />
        </div>
        <div>
          <Label htmlFor={aId}>Author</Label>
          <Input id={aId} value={value.author ?? ''} onChange={(e) => set('author', e.target.value)} />
        </div>
        <div>
          <Label htmlFor={sId}>Subject</Label>
          <Input
            id={sId}
            value={value.subject ?? ''}
            onChange={(e) => set('subject', e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor={kId}>Keywords (comma-separated)</Label>
          <Input
            id={kId}
            value={(value.keywords ?? []).join(', ')}
            onChange={(e) =>
              onChange({
                ...value,
                keywords: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
        <div>
          <Label htmlFor={pId}>Producer</Label>
          <Input
            id={pId}
            value={value.producer ?? ''}
            onChange={(e) => set('producer', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={cId}>Creator</Label>
          <Input
            id={cId}
            value={value.creator ?? ''}
            onChange={(e) => set('creator', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
