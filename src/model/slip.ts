// Slip: the stateful facade the UI talks to. Holds the current immutable SlipState.
// Undo / clear / double and the history arrive in iteration 4.

import type { ChipKup } from '../config/money';
import type { BetTarget } from '../shared/bet';
import { totalStake } from './limits';
import { minorToString } from './money';
import { addChip, EMPTY_SLIP, removeChip, toBets, type Transition } from './slipState';
import type { Bet, OpResult, SlipState } from './types';

export class Slip {
  private state: SlipState = EMPTY_SLIP;

  /** Current immutable snapshot (for rendering stacks). */
  snapshot(): SlipState {
    return this.state;
  }

  addChip(target: BetTarget, chip: ChipKup): OpResult {
    return this.commit(addChip(this.state, target, chip));
  }

  removeChip(target: BetTarget): OpResult {
    return this.commit(removeChip(this.state, target));
  }

  /** Total of the whole slip in minor units, as a string (e.g. "2500"). */
  totalStakeMinor(): string {
    return minorToString(totalStake(this.state));
  }

  toBets(): Bet[] {
    return toBets(this.state);
  }

  private commit(t: Transition): OpResult {
    if (!t.ok) return { ok: false, reason: t.reason, message: t.message };
    this.state = t.state;
    return { ok: true, changed: t.changed };
  }
}
