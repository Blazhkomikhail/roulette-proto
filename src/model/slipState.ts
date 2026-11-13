// Pure transitions on an immutable SlipState. Each returns a new state or a rejection;
// the input state is never modified. Limits are checked on the candidate before it is accepted [У§3].

import { CHIP_DENOMINATIONS_KUP, type ChipKup } from '../config/money';
import { BET_TYPES, zoneKey } from '../shared/bet';
import { findViolation, stakeOf, violationMessage } from './limits';
import { chipToMinor, minorToString, type Minor } from './money';
import type { Bet, RejectReason, SlipState, ZoneStake } from './types';
import { validateTarget } from './validateTarget';

export const EMPTY_SLIP: SlipState = new Map();

export type Transition =
  | { readonly ok: true; readonly changed: boolean; readonly state: SlipState }
  | { readonly ok: false; readonly reason: RejectReason; readonly message: string };

function isChip(value: unknown): value is ChipKup {
  return (CHIP_DENOMINATIONS_KUP as readonly unknown[]).includes(value);
}

function withZone(state: SlipState, key: string, zone: ZoneStake | null): SlipState {
  const next = new Map(state);
  if (zone) next.set(key, zone);
  else next.delete(key);
  return next;
}

/** Candidate check shared by every growing transition (add, double). */
export function acceptIfWithinLimits(prev: SlipState, candidate: SlipState): Transition {
  const violation = findViolation(candidate);
  if (violation) return { ok: false, reason: violation.reason, message: violationMessage(violation) };
  return { ok: true, changed: candidate !== prev, state: candidate };
}

export function addChip(state: SlipState, target: unknown, chip: unknown): Transition {
  if (!isChip(chip)) {
    return { ok: false, reason: 'INVALID_CHIP', message: `Unknown chip ${String(chip)}; allowed: ${CHIP_DENOMINATIONS_KUP.join(', ')}` };
  }
  const checked = validateTarget(target);
  if (!checked.ok) return { ok: false, reason: 'INVALID_TARGET', message: `Invalid bet: ${checked.message}` };
  const key = zoneKey(checked.target);
  const current = state.get(key);
  const chips: readonly Minor[] = Object.freeze([...(current?.chips ?? []), chipToMinor(chip)]);
  const candidate = withZone(state, key, Object.freeze({ target: current?.target ?? checked.target, chips }));
  return acceptIfWithinLimits(state, candidate);
}

/** Removes the last chip placed on the zone [Д]. Empty zone: no change (same state object). */
export function removeChip(state: SlipState, target: unknown): Transition {
  const checked = validateTarget(target);
  if (!checked.ok) return { ok: false, reason: 'INVALID_TARGET', message: `Invalid bet: ${checked.message}` };
  const key = zoneKey(checked.target);
  const current = state.get(key);
  if (!current) return { ok: true, changed: false, state };
  const chips = current.chips.slice(0, -1);
  const zone = chips.length > 0 ? Object.freeze({ target: current.target, chips: Object.freeze(chips) }) : null;
  return { ok: true, changed: true, state: withZone(state, key, zone) };
}

/** Empties the slip. Already empty: no change (same state object). */
export function clear(state: SlipState): Transition {
  if (state.size === 0) return { ok: true, changed: false, state };
  return { ok: true, changed: true, state: EMPTY_SLIP };
}

/**
 * Doubles every zone by repeating its chip stack (so each chip keeps its denomination).
 * All-or-nothing: if any zone would break a limit, the whole operation is rejected [У§4].
 * Empty slip: no change.
 */
export function double(state: SlipState): Transition {
  if (state.size === 0) return { ok: true, changed: false, state };
  const candidate = new Map<string, ZoneStake>();
  for (const [key, zone] of state) {
    candidate.set(key, Object.freeze({ target: zone.target, chips: Object.freeze([...zone.chips, ...zone.chips]) }));
  }
  const t = acceptIfWithinLimits(state, candidate);
  return t.ok ? t : { ...t, message: `Double rejected. ${t.message}` };
}

const TYPE_ORDER = new Map(BET_TYPES.map((t, i) => [t, i]));

/** One bet per non-empty zone; ordered by bet type (BET_TYPES order), then numbers [Д]. Fresh objects. */
export function toBets(state: SlipState): Bet[] {
  const zones = [...state.values()].sort((a, b) => {
    const byType = (TYPE_ORDER.get(a.target.type) ?? 0) - (TYPE_ORDER.get(b.target.type) ?? 0);
    if (byType !== 0) return byType;
    const an = a.target.numbers, bn = b.target.numbers;
    for (let i = 0; i < Math.min(an.length, bn.length); i++) if (an[i] !== bn[i]) return (an[i] ?? 0) - (bn[i] ?? 0);
    return an.length - bn.length;
  });
  return zones.map((z) => ({ type: z.target.type, numbers: [...z.target.numbers], amountMinor: minorToString(stakeOf(z)) }));
}
