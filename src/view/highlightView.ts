import { Container, Graphics } from 'pixi.js';
import { isInsideBetType } from '../shared/bet';
import { rectContains, type Rect, type Zone } from '../geometry/types';
import type { VisualTable } from '../geometry/visualCells';
import { THEME } from './theme';

/**
 * Hover highlight. Every number the bet covers gets a light overlay and an outline.
 * Bands (split, street, corner, line) are also filled, so a thin band or a corner point is visible.
 * Straight and outside bets are outlined by their drawn cell, not by the (slightly smaller) click zone.
 */
export class HighlightView {
  readonly container = new Container({ label: 'highlight' });
  private readonly g = new Graphics();
  private currentId: string | null = null;

  constructor(private readonly visual: VisualTable) {
    this.container.addChild(this.g);
    this.container.eventMode = 'none';
  }

  show(zone: Zone | null): void {
    const id = zone?.id ?? null;
    if (id === this.currentId) return;
    this.currentId = id;
    this.g.clear();
    if (!zone) return;

    const c = THEME.highlightCells;
    for (const n of zone.numbers) {
      const r = this.visual.numberCells.get(n);
      if (r) this.g.rect(r.x, r.y, r.w, r.h).fill({ color: c.fill, alpha: c.alpha });
    }
    for (const n of zone.numbers) {
      const r = this.visual.numberCells.get(n);
      if (r) this.g.rect(r.x, r.y, r.w, r.h).stroke({ width: c.strokeWidth, color: c.stroke, alignment: 1 });
    }

    const isBand = isInsideBetType(zone.type) && zone.type !== 'straight';
    if (isBand) {
      const { x, y, w, h } = zone.rect;
      const z = THEME.highlightZone;
      this.g.rect(x, y, w, h).fill({ color: z.fill, alpha: z.alpha }).stroke({ width: 1.5, color: z.stroke, alignment: 0 });
    } else if (zone.type !== 'straight') {
      const cell = this.drawnCellOf(zone);
      if (cell) this.g.rect(cell.x, cell.y, cell.w, cell.h).fill({ color: c.fill, alpha: c.alpha }).stroke({ width: c.strokeWidth, color: c.stroke, alignment: 1 });
    }
  }

  /** The drawn (non-number) cell under the zone's centre: "2 to 1", dozen or even-money cell. */
  private drawnCellOf(zone: Zone): Rect | null {
    const cx = zone.rect.x + zone.rect.w / 2;
    const cy = zone.rect.y + zone.rect.h / 2;
    const cell = this.visual.cells.find((v) => !v.key.startsWith('number:') && rectContains(v.rect, cx, cy));
    return cell?.rect ?? null;
  }
}
