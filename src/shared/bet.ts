// Shared bet vocabulary. The only module that both geometry/ and model/ may import (besides config/).

export const BET_TYPES = [
  'straight', 'split', 'street', 'corner', 'line',
  'column', 'dozen', 'red', 'black', 'odd', 'even', 'low', 'high',
] as const;
export type BetType = (typeof BET_TYPES)[number];

/** Inside bets count towards the per-number limit; outside bets only towards the total [У§3]. */
export const INSIDE_BET_TYPES = ['straight', 'split', 'street', 'corner', 'line'] as const;
export type InsideBetType = (typeof INSIDE_BET_TYPES)[number];

/** How many numbers each bet type covers. */
export const BET_ARITY: Readonly<Record<BetType, number>> = {
  straight: 1, split: 2, street: 3, corner: 4, line: 6,
  column: 12, dozen: 12,
  red: 18, black: 18, odd: 18, even: 18, low: 18, high: 18,
};

export function isBetType(value: unknown): value is BetType {
  return typeof value === 'string' && (BET_TYPES as readonly string[]).includes(value);
}

export function isInsideBetType(type: BetType): type is InsideBetType {
  return (INSIDE_BET_TYPES as readonly string[]).includes(type);
}

/** A place on the table a chip can go to: bet type plus covered numbers in ascending order. */
export interface BetTarget {
  readonly type: BetType;
  readonly numbers: readonly number[];
}

/** Stable identity of a zone, e.g. "corner:32-33-35-36", "split:0-1". */
export function zoneKey(target: BetTarget): string {
  return `${target.type}:${target.numbers.join('-')}`;
}
