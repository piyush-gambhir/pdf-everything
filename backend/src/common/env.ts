export function positiveNumber(value: string | undefined): number | undefined {
  const number = Number(value ?? '');
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

const MAX_TIMER_MS = 2 ** 31 - 1;

export function timerMs(value: string | undefined): number | undefined {
  const number = Number(value ?? '');
  return Number.isInteger(number) && number > 0 && number <= MAX_TIMER_MS ? number : undefined;
}
