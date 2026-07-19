'use client';

import { useId, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { FormsFillOptions } from '@pdf-everything/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { OptionsFormProps } from '../types';

interface Row {
  key: string;
  name: string;
  value: string;
}

export function FormsFillOptionsForm({ value, onChange }: OptionsFormProps<FormsFillOptions>) {
  const [rows, setRows] = useState<Row[]>(() =>
    Object.entries(value.fields ?? {}).map(([name, v], i) => ({
      key: `r${i}`,
      name,
      value: typeof v === 'string' ? v : typeof v === 'boolean' ? (v ? 'true' : 'false') : v.join(','),
    })),
  );
  const flattenId = useId();

  const sync = (next: Row[]) => {
    setRows(next);
    const fields: Record<string, string | boolean | string[]> = {};
    for (const r of next) {
      if (!r.name.trim()) continue;
      if (r.value === 'true') fields[r.name] = true;
      else if (r.value === 'false') fields[r.name] = false;
      else fields[r.name] = r.value;
    }
    onChange({ ...value, fields });
  };

  const update = (idx: number, patch: Partial<Row>) =>
    sync(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const add = () => sync([...rows, { key: `r${Date.now()}`, name: '', value: '' }]);
  const remove = (idx: number) => sync(rows.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Field values</Label>
        <p className="text-xs text-muted-foreground">
          Enter <code>true</code>/<code>false</code> for checkboxes. Use the Forms → Extract tool to discover field names.
        </p>
        {rows.length === 0 && (
          <p className="text-xs text-muted-foreground">No fields yet — click Add field below.</p>
        )}
        {rows.map((r, i) => (
          <div key={r.key} className="flex gap-2">
            <Input
              placeholder="field name"
              value={r.name}
              onChange={(e) => update(i, { name: e.target.value })}
              className="flex-1"
            />
            <Input
              placeholder="value"
              value={r.value}
              onChange={(e) => update(i, { value: e.target.value })}
              className="flex-1"
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-3.5" /> Add field
        </Button>
      </div>
      <div className="flex items-center justify-between border-t pt-3">
        <Label htmlFor={flattenId} className="flex flex-col items-start gap-1">
          <span>Flatten after fill</span>
          <span className="text-xs font-normal text-muted-foreground">
            Make the filled form non-editable.
          </span>
        </Label>
        <Switch
          id={flattenId}
          checked={value.flatten}
          onCheckedChange={(checked) => onChange({ ...value, flatten: checked })}
        />
      </div>
    </div>
  );
}
