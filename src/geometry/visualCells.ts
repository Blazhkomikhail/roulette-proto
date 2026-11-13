// What to draw: the nominal table cells (not the clickable zones). Zones are narrower bands
// around the cell edges; cells are the full rectangles the player sees. Pure, no Pixi.

import { LABELS, OUTSIDE_ORDER, RED_NUMBERS, TABLE, type TableLayout } from '../config/table';
import { numberAt } from './buildTable';
import type { Rect } from './types';

export type CellFill = 'zero' | 'red' | 'black' | 'felt';

export interface VisualCell {
  /** Stable key, e.g. "number:17", "dozen:1", "outside:red". */
  readonly key: string;
  readonly rect: Rect;
  /** Text to draw; empty for the red/black diamonds. */
  readonly caption: string;
  readonly fill: CellFill;
  /** Red/black even-money cells are drawn as a coloured diamond, as on the reference. */
  readonly diamond?: 'red' | 'black';
}

export interface VisualTable {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly VisualCell[];
  /** Full cell rect of every number 0..36, for highlighting the numbers a bet covers. */
  readonly numberCells: ReadonlyMap<number, Rect>;
}

export function buildVisualTable(layout: TableLayout = TABLE, redNumbers: readonly number[] = RED_NUMBERS): VisualTable {
  const { cols, rows, zeroW: Z, columnBetW: CB, dozenH: D, outsideH: O } = layout;
  const { w: W, h: H } = layout.cell;
  const red = new Set(redNumbers);
  const colLeft = (c: number): number => Z + c * W;
  const gridBottom = rows * H;

  const cells: VisualCell[] = [];
  const numberCells = new Map<number, Rect>();

  const zero: Rect = { x: 0, y: 0, w: Z, h: gridBottom };
  cells.push({ key: 'number:0', rect: zero, caption: '0', fill: 'zero' });
  numberCells.set(0, zero);

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const n = numberAt(c, r);
      const rect: Rect = { x: colLeft(c), y: r * H, w: W, h: H };
      cells.push({ key: `number:${n}`, rect, caption: String(n), fill: red.has(n) ? 'red' : 'black' });
      numberCells.set(n, rect);
    }
  }

  for (let r = 0; r < rows; r++) {
    cells.push({ key: `column:${r}`, rect: { x: colLeft(cols), y: r * H, w: CB, h: H }, caption: LABELS.column, fill: 'felt' });
  }

  LABELS.dozen.forEach((caption, k) => {
    cells.push({ key: `dozen:${k + 1}`, rect: { x: colLeft(4 * k), y: gridBottom, w: 4 * W, h: D }, caption, fill: 'felt' });
  });

  OUTSIDE_ORDER.forEach((type, k) => {
    const rect: Rect = { x: colLeft(2 * k), y: gridBottom + D, w: 2 * W, h: O };
    if (type === 'red' || type === 'black') cells.push({ key: `outside:${type}`, rect, caption: '', fill: 'felt', diamond: type });
    else cells.push({ key: `outside:${type}`, rect, caption: LABELS[type], fill: 'felt' });
  });

  return { width: colLeft(cols) + CB, height: gridBottom + D + O, cells, numberCells };
}
