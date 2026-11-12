// Limit checks on a candidate slip state [У§3].
// Per number: every inside zone (straight, split, street, corner, line) adds its FULL amount to each of
// its numbers (not divided). Outside bets do not count per number. Total: sum of the whole slip.
// Check order is deterministic [Д]: per-number first, numbers ascending; then total.

import { PER_NUMBER_LIMIT_MINOR, TOTAL_LIMIT_MINOR } from '../config/money';
import { isInsideBetType } from '../shared/bet';
import { addMinor, formatKup, ZERO_MINOR, type Minor } from './money';
import type { SlipState, ZoneStake } from './types';

export function stakeOf(zone: ZoneStake): Minor {
  return zone.chips.reduce(addMinor, ZERO_MINOR);
}

export function totalStake(state: SlipState): Minor {
  let sum = ZERO_MINOR;
  for (const zone of state.values()) sum = addMinor(sum, stakeOf(zone));
  return sum;
}

/** Amount riding on each number from inside bets. Numbers with no inside bets are absent. */
export function perNumberExposure(state: SlipState): Map<number, Minor> {
  const exposure = new Map<number, Minor>();
  for (const zone of state.values()) {
    if (!isInsideBetType(zone.target.type)) continue;
    const amount = stakeOf(zone);
    for (const n of zone.target.numbers) exposure.set(n, addMinor(exposure.get(n) ?? ZERO_MINOR, amount));
  }
  return exposure;
}

export type Violation =
  | { readonly reason: 'PER_NUMBER_LIMIT'; readonly number: number; readonly amount: Minor; readonly limit: Minor }
  | { readonly reason: 'TOTAL_LIMIT'; readonly amount: Minor; readonly limit: Minor };

export function findViolation(state: SlipState): Violation | null {
  const perNumberLimit = PER_NUMBER_LIMIT_MINOR as Minor;
  const exposure = [...perNumberExposure(state)].sort(([a], [b]) => a - b);
  for (const [number, amount] of exposure) {
    if (amount > perNumberLimit) return { reason: 'PER_NUMBER_LIMIT', number, amount, limit: perNumberLimit };
  }
  const total = totalStake(state);
  const totalLimit = TOTAL_LIMIT_MINOR as Minor;
  if (total > totalLimit) return { reason: 'TOTAL_LIMIT', amount: total, limit: totalLimit };
  return null;
}

/** User-facing text; amounts in Kup, the same value goes to screen and console [У§2]. */
export function violationMessage(v: Violation): string {
  return v.reason === 'PER_NUMBER_LIMIT'
    ? `Limit per number exceeded: number ${v.number} would have ${formatKup(v.amount)}, max ${formatKup(v.limit)}`
    : `Total limit exceeded: slip would be ${formatKup(v.amount)}, max ${formatKup(v.limit)}`;
}
