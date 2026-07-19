'use client';

import type { OptionsFormProps } from '../types';

export function FormsFlattenOptionsForm(_: OptionsFormProps<Record<string, never>>) {
  return (
    <p className="text-xs text-muted-foreground">
      No options. All interactive form fields will be made non-editable and frozen into the page.
    </p>
  );
}
