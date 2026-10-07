/** A positive number from an environment value, or undefined to use the default. */
export function positiveNumber(value: string | undefined): number | undefined {
  const number = Number(value ?? '');
  return Number.isFinite(number) && number > 0 ? number : undefined;
}
