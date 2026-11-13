import { Container, Graphics, Text } from 'pixi.js';
import type { ChipKup } from '../config/money';
import type { Zone } from '../geometry/types';
import { zoneAnchor, type VisualTable } from '../geometry/visualCells';
import { stakeOf } from '../model/limits';
import { minorToKup } from '../model/money';
import type { SlipState } from '../model/types';
import { THEME } from './theme';

/** Chip stacks on the table, redrawn from the slip snapshot after every change [З]. */
export class ChipStacksView {
  readonly container = new Container({ label: 'chips' });
  private readonly zonesById: ReadonlyMap<string, Zone>;

  constructor(zones: readonly Zone[], private readonly visual: VisualTable) {
    this.zonesById = new Map(zones.map((z) => [z.id, z]));
    this.container.eventMode = 'none'; // clicks go through to the table
  }

  render(state: SlipState): void {
    for (const child of this.container.removeChildren()) child.destroy({ children: true });
    for (const [id, stake] of state) {
      const zone = this.zonesById.get(id);
      if (!zone) continue;
      const { x, y } = zoneAnchor(zone, this.visual);
      this.container.addChild(this.stack(x, y, stake.chips.map((c) => minorToKup(c) as ChipKup), minorToKup(stakeOf(stake))));
    }
  }

  private stack(x: number, y: number, chips: readonly ChipKup[], totalKup: number): Container {
    const root = new Container();
    const g = new Graphics();
    root.addChild(g);
    const r = THEME.chipRadius;
    const discs = chips.slice(-THEME.chipStackMaxDiscs);
    discs.forEach((chip, i) => {
      const c = THEME.chips[chip];
      const cy = y - i * THEME.chipStackOffset;
      g.circle(x, cy, r).fill(c.fill).stroke({ width: 2, color: 0x000000, alpha: 0.45, alignment: 1 });
      g.circle(x, cy, r - 4).stroke({ width: 1.5, color: c.edge, alpha: 0.9 });
    });
    const top = discs[discs.length - 1] ?? 1;
    const label = new Text({
      text: String(totalKup),
      style: { fontFamily: THEME.font, fontSize: totalKup >= 1000 ? 9 : 11, fontWeight: '800', fill: THEME.chips[top].text },
    });
    label.anchor.set(0.5);
    label.position.set(x, y - (discs.length - 1) * THEME.chipStackOffset);
    root.addChild(label);
    return root;
  }
}
