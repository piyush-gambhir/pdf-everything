export function outputName(input: string | undefined, suffix: string): string {
  const base = (input ?? 'document.pdf').replace(/\.pdf$/i, '');
  return `${base}-${suffix}.pdf`;
}
