// Money helpers. Amounts are integer minor units, kept as safe-integer numbers inside the model
// and serialised as decimal strings at the API boundary (Bet.amountMinor) [З][У§2].
// No float parsing; Number(str) only after a strict format check.

import { CURRENCY_LABEL, MINOR_PER_KUP, type ChipKup } from '../config/money';

/** Integer amount in minor units, multiple of MINOR_PER_KUP, >= 0. */
export type Minor = number & { readonly __brand: 'Minor' };

export const ZERO_MINOR = 0 as Minor;

export type ParseResult =
  | { readonly ok: true; readonly value: Minor }
  | { readonly ok: false; readonly message: string };

const POSITIVE_INT_RE = /^[1-9]\d*$/;

function isValidMinor(n: number): boolean {
  return Number.isSafeInteger(n) && n >= 0 && n % MINOR_PER_KUP === 0;
}

/**
 * Parses a positive bet amount in minor units from its string form.
 * Rejects anything that is not a plain positive decimal integer ("1e2", " 100", "0100", "100.0"),
 * unsafe integers, and amounts that are not whole Kup ("150").
 */
export function parseAmountMinor(input: unknown): ParseResult {
  if (typeof input !== 'string') return { ok: false, message: `amountMinor must be a string, got ${typeof input}` };
  if (!POSITIVE_INT_RE.test(input)) return { ok: false, message: `amountMinor "${input}" is not a positive integer` };
  const n = Number(input);
  if (!Number.isSafeInteger(n)) return { ok: false, message: `amountMinor "${input}" is out of safe integer range` };
  if (n % MINOR_PER_KUP !== 0) return { ok: false, message: `amountMinor "${input}" is not a multiple of ${MINOR_PER_KUP}` };
  return { ok: true, value: n as Minor };
}

/** Kup (whole credits) → minor units. Throws on non-integer, negative or unsafe input (programmer error). */
export function kupToMinor(kup: number): Minor {
  if (!Number.isSafeInteger(kup) || kup < 0) throw new RangeError(`kup must be a non-negative integer, got ${kup}`);
  const minor = kup * MINOR_PER_KUP;
  if (!Number.isSafeInteger(minor)) throw new RangeError(`kup ${kup} overflows minor units`);
  return minor as Minor;
}

export function chipToMinor(chip: ChipKup): Minor {
  return kupToMinor(chip);
}

export function addMinor(a: Minor, b: Minor): Minor {
  const sum = a + b;
  if (!isValidMinor(sum)) throw new RangeError(`invalid minor sum ${a} + ${b}`);
  return sum as Minor;
}

export function multiplyMinor(a: Minor, factor: number): Minor {
  if (!Number.isSafeInteger(factor) || factor < 0) throw new RangeError(`factor must be a non-negative integer, got ${factor}`);
  const product = a * factor;
  if (!isValidMinor(product)) throw new RangeError(`invalid minor product ${a} × ${factor}`);
  return product as Minor;
}

/** Minor → the string form used in Bet.amountMinor. */
export function minorToString(m: Minor): string {
  if (!isValidMinor(m)) throw new RangeError(`invalid minor amount ${m}`);
  return String(m);
}

/** Minor → whole Kup. Amounts are always whole Kup [У§2]; anything else is a bug. */
export function minorToKup(m: Minor): number {
  if (!isValidMinor(m)) throw new RangeError(`invalid minor amount ${m}`);
  return m / MINOR_PER_KUP;
}

/** Display text, the same value on screen and in the console, e.g. "25 Kup" [У§2]. */
export function formatKup(m: Minor): string {
  return `${minorToKup(m)} ${CURRENCY_LABEL}`;
}
