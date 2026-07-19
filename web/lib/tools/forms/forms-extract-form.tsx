'use client';

import type { OptionsFormProps } from '../types';

export function FormsExtractOptionsForm(_: OptionsFormProps<Record<string, never>>) {
  return (
    <p className="text-xs text-muted-foreground">
      No options. All form fields and current values will be returned as JSON.
    </p>
  );
}
