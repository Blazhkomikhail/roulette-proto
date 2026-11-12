import type { BetTarget, BetType } from '../shared/bet';
import type { Minor } from './money';

/** One bet per zone, as returned by Slip.toBets() [З]. */
export interface Bet {
  readonly type: BetType;
  /** Ascending. */
  readonly numbers: number[];
  /** Integer minor units as a decimal string, multiple of 100 [З][У§2]. */
  readonly amountMinor: string;
}

/** Chips placed on one zone, in placement order (last = top of the stack). Never empty. */
export interface ZoneStake {
  readonly target: BetTarget;
  readonly chips: readonly Minor[];
}

/** Immutable slip snapshot, keyed by zoneKey(target). Every change produces a new map. */
export type SlipState = ReadonlyMap<string, ZoneStake>;

export type RejectReason = 'PER_NUMBER_LIMIT' | 'TOTAL_LIMIT' | 'INVALID_TARGET' | 'INVALID_CHIP';

export type OpResult =
  | { readonly ok: true; readonly changed: boolean }
  | { readonly ok: false; readonly reason: RejectReason; readonly message: string };
