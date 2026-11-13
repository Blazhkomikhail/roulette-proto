// Slip: the stateful facade the UI talks to. Holds the current immutable SlipState and an undo history.
//
// History [У§4]: one step = one user action that changed the slip (addChip, removeChip, clear, double).
// Rejected operations and no-ops (clear on empty, remove from an empty zone, double on empty)
// create no step. Snapshots are immutable, so the history stores them by reference.
// undo itself is not recorded (no redo). The selected chip lives in the UI and is not part of the slip.

import type { ChipKup } from '../config/money';
import type { BetTarget } from '../shared/bet';
import { totalStake } from './limits';
import { minorToString } from './money';
import * as ops from './slipState';
import type { Bet, OpResult, SlipState } from './types';

export const DEFAULT_HISTORY_DEPTH = 30;

export interface SlipOptions {
  readonly historyDepth?: number;
}

export class Slip {
  private state: SlipState = ops.EMPTY_SLIP;
  private history: SlipState[] = [];
  private readonly historyDepth: number;

  constructor(options: SlipOptions = {}) {
    const depth = options.historyDepth ?? DEFAULT_HISTORY_DEPTH;
    if (!Number.isSafeInteger(depth) || depth < 1) throw new RangeError(`historyDepth must be an integer >= 1, got ${depth}`);
    this.historyDepth = depth;
  }

  /** Current immutable snapshot (for rendering stacks). */
  snapshot(): SlipState {
    return this.state;
  }

  addChip(target: BetTarget, chip: ChipKup): OpResult {
    return this.commit(ops.addChip(this.state, target, chip));
  }

  removeChip(target: BetTarget): OpResult {
    return this.commit(ops.removeChip(this.state, target));
  }

  clear(): OpResult {
    return this.commit(ops.clear(this.state));
  }

  double(): OpResult {
    return this.commit(ops.double(this.state));
  }

  /** Reverts the last user action. Never rejected; empty history is a safe no-op. */
  undo(): Extract<OpResult, { ok: true }> {
    const prev = this.history.pop();
    if (prev === undefined) return { ok: true, changed: false };
    this.state = prev;
    return { ok: true, changed: true };
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  /** Total of the whole slip in minor units, as a string (e.g. "2500"). */
  totalStakeMinor(): string {
    return minorToString(totalStake(this.state));
  }

  toBets(): Bet[] {
    return ops.toBets(this.state);
  }

  private commit(t: ops.Transition): OpResult {
    if (!t.ok) return { ok: false, reason: t.reason, message: t.message };
    if (t.changed) {
      this.history.push(this.state);
      if (this.history.length > this.historyDepth) this.history.shift();
      this.state = t.state;
    }
    return { ok: true, changed: t.changed };
  }
}
