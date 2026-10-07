/** A positive number from an environment value, or undefined to use the default. */
export function positiveNumber(value: string | undefined): number | undefined {
  const number = Number(value ?? '');
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

/** The largest delay a Node timer takes; a longer one fires after 1 ms. */
const MAX_TIMER_MS = 2 ** 31 - 1;

/** A timer delay from an environment value: whole milliseconds a timer accepts, or undefined. */
export function timerMs(value: string | undefined): number | undefined {
  const number = Number(value ?? '');
  return Number.isInteger(number) && number > 0 && number <= MAX_TIMER_MS ? number : undefined;
}
