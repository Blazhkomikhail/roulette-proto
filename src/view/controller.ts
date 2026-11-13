// UI controller: routes user input to the Slip and tells the views what to show.
// No Pixi and no DOM here, so it is unit-tested in Node. Bet logic and limits stay in model/;
// this only decides which model call to make and how to surface the result.

import { CHIP_DENOMINATIONS_KUP, type ChipKup } from '../config/money';
import type { BetTarget } from '../shared/bet';
import { totalStake } from '../model/limits';
import { formatKup } from '../model/money';
import type { Slip } from '../model/slip';
import type { OpResult, SlipState } from '../model/types';

export type PointerAction = 'add' | 'remove';

/** Left click adds; Shift+left click or right click removes one chip [З]. Other buttons: nothing. */
export function pointerAction(e: { readonly button: number; readonly shiftKey: boolean }): PointerAction | null {
  if (e.button === 2) return 'remove';
  if (e.button === 0) return e.shiftKey ? 'remove' : 'add';
  return null;
}

export interface UiStatus {
  readonly selectedChip: ChipKup;
  /** Slip total for display, e.g. "125 Kup". */
  readonly totalText: string;
  readonly canUndo: boolean;
  readonly canClear: boolean;
  readonly canDouble: boolean;
  /** Last rejection message, or null. */
  readonly message: string | null;
}

export interface ControllerViews {
  renderSlip(state: SlipState): void;
  renderStatus(status: UiStatus): void;
}

export class TableController {
  private selectedChip: ChipKup = CHIP_DENOMINATIONS_KUP[0];
  private message: string | null = null;

  constructor(
    private readonly slip: Slip,
    private readonly views: ControllerViews,
    /** Rejections go to the console with the same text as on screen [У§2]. */
    private readonly logRejection: (message: string) => void = (m) => console.warn(m),
  ) {}

  /** Draws the initial state. */
  start(): void {
    this.render();
  }

  selectChip(chip: ChipKup): void {
    this.selectedChip = chip;
    this.render();
  }

  pointerOnZone(target: BetTarget, action: PointerAction): OpResult {
    return this.apply(action === 'add' ? this.slip.addChip(target, this.selectedChip) : this.slip.removeChip(target));
  }

  clear(): OpResult {
    return this.apply(this.slip.clear());
  }

  /** Reverts the slip only; the selected chip stays as it is [У§4]. */
  undo(): OpResult {
    return this.apply(this.slip.undo());
  }

  double(): OpResult {
    return this.apply(this.slip.double());
  }

  status(): UiStatus {
    const state = this.slip.snapshot();
    return {
      selectedChip: this.selectedChip,
      totalText: formatKup(totalStake(state)),
      canUndo: this.slip.canUndo(),
      canClear: state.size > 0,
      canDouble: state.size > 0,
      message: this.message,
    };
  }

  private apply(result: OpResult): OpResult {
    if (result.ok) {
      this.message = null;
    } else {
      this.message = result.message;
      this.logRejection(result.message);
    }
    this.render();
    return result;
  }

  private render(): void {
    this.views.renderSlip(this.slip.snapshot());
    this.views.renderStatus(this.status());
  }
}
