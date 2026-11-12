// Builds all betting zones from the table config. No coordinate lists: every rect is derived
// from the layout sizes and grid indices [З].
//
// Coordinates: table-local logical px, origin at the top-left of the zero.
//   x: zero [0, Z) | 12 number columns of width W | "2 to 1" column bets of width CB
//   y: 3 number rows of height H | dozens (D) | even-money row (O)
//
// Clickable bands of thickness s straddle every inner edge of the number grid (s/2 on each side).
// The neighbouring larger zones are shrunk by s/2, so the rects never overlap and the smaller zone
// owns the boundary [З]:
//   vertical edge between two numbers, or zero | first column  → split
//   horizontal edge between two rows                          → split
//   crossing of two inner edges                                → corner
//   bottom edge of the grid (towards the dozens)               → street
//   bottom edge × edge between two columns                     → line
//   zero | first column × row edge or bottom edge              → no zone (would be 0/1/2, 0/2/3, 0/1/2/3,
//                                                                which are not implemented [CLAUDE.md §3])
// The outer edges (top of the grid, grid | column bets) have no bands.

import { OUTSIDE_ORDER, RED_NUMBERS, TABLE, type TableLayout } from '../config/table';
import { zoneKey, type BetType } from '../shared/bet';
import { zoneLabel } from './labels';
import type { TableGeometry, Zone } from './types';

/** Number in grid cell (col 0..11 left→right, row 0..2 top→bottom). Top row 3…36, bottom row 1…34. */
export function numberAt(col: number, row: number): number {
  return 3 * col + 3 - row;
}

const MIN_ZONE_PX = 3;

function assertLayout(l: TableLayout): void {
  const sizes = [l.cell.w, l.cell.h, l.zeroW, l.columnBetW, l.dozenH, l.outsideH, l.stripe];
  if (!sizes.every((v) => Number.isInteger(v) && v > 0)) throw new RangeError('table sizes must be positive integers');
  if (l.stripe % 2 !== 0) throw new RangeError(`stripe must be even, got ${l.stripe}`);
  const half = l.stripe / 2;
  const smallest = Math.min(l.cell.w - l.stripe, l.cell.h - l.stripe, l.zeroW - half, l.dozenH - half);
  if (smallest < MIN_ZONE_PX) throw new RangeError(`stripe ${l.stripe} leaves a zone thinner than ${MIN_ZONE_PX}px`);
}

function range(from: number, toInclusive: number): number[] {
  return Array.from({ length: toInclusive - from + 1 }, (_, i) => from + i);
}

function outsideNumbers(type: (typeof OUTSIDE_ORDER)[number], red: ReadonlySet<number>): number[] {
  const all = range(1, 36);
  switch (type) {
    case 'low': return range(1, 18);
    case 'high': return range(19, 36);
    case 'even': return all.filter((n) => n % 2 === 0);
    case 'odd': return all.filter((n) => n % 2 === 1);
    case 'red': return all.filter((n) => red.has(n));
    case 'black': return all.filter((n) => !red.has(n));
  }
}

export function buildTable(layout: TableLayout = TABLE, redNumbers: readonly number[] = RED_NUMBERS): TableGeometry {
  assertLayout(layout);
  const { cols, rows, zeroW: Z, columnBetW: CB, dozenH: D, outsideH: O } = layout;
  const { w: W, h: H } = layout.cell;
  const half = layout.stripe / 2;
  const red = new Set(redNumbers);

  const colLeft = (c: number): number => Z + c * W;
  const rowTop = (r: number): number => r * H;
  const gridBottom = rowTop(rows);
  const columnBetX = colLeft(cols);
  const lastCol = cols - 1;

  // Extent of a cell's own area along each axis, after giving s/2 to every banded edge.
  // Every column has a band on its left (split, or zero split for c = 0); all but the last on its right.
  // Every row has a band below it (split, or street for the bottom row); all but the first above it.
  const cellX0 = (c: number): number => colLeft(c) + half;
  const cellX1 = (c: number): number => colLeft(c) + W - (c === lastCol ? 0 : half);
  const cellY0 = (r: number): number => rowTop(r) + (r === 0 ? 0 : half);
  const cellY1 = (r: number): number => rowTop(r) + H - half;

  const zones: Zone[] = [];
  const add = (type: BetType, numbers: readonly number[], x0: number, y0: number, x1: number, y1: number): void => {
    const sorted = [...numbers].sort((a, b) => a - b);
    zones.push({
      id: zoneKey({ type, numbers: sorted }),
      type,
      numbers: sorted,
      rect: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
      label: zoneLabel(type, sorted),
    });
  };

  const cols0 = range(0, cols - 1);
  const rows0 = range(0, rows - 1);

  // Straight: zero (full grid height) and the 36 numbers.
  add('straight', [0], 0, 0, Z - half, gridBottom);
  for (const c of cols0) for (const r of rows0) add('straight', [numberAt(c, r)], cellX0(c), cellY0(r), cellX1(c), cellY1(r));

  // Split across a vertical edge: left of column c (c = 0 is the zero edge).
  for (const c of cols0) {
    for (const r of rows0) {
      const left = c === 0 ? 0 : numberAt(c - 1, r);
      add('split', [left, numberAt(c, r)], colLeft(c) - half, cellY0(r), colLeft(c) + half, cellY1(r));
    }
  }

  // Split across a horizontal edge: above row r.
  for (const r of range(1, rows - 1)) {
    for (const c of cols0) {
      add('split', [numberAt(c, r - 1), numberAt(c, r)], cellX0(c), rowTop(r) - half, cellX1(c), rowTop(r) + half);
    }
  }

  // Corner: crossing of the vertical edge left of column c and the horizontal edge above row r.
  for (const r of range(1, rows - 1)) {
    for (const c of range(1, cols - 1)) {
      const nums = [numberAt(c - 1, r - 1), numberAt(c, r - 1), numberAt(c - 1, r), numberAt(c, r)];
      add('corner', nums, colLeft(c) - half, rowTop(r) - half, colLeft(c) + half, rowTop(r) + half);
    }
  }

  // Street: bottom edge of column c.
  for (const c of cols0) {
    add('street', rows0.map((r) => numberAt(c, r)), cellX0(c), gridBottom - half, cellX1(c), gridBottom + half);
  }

  // Line: bottom edge × vertical edge left of column c.
  for (const c of range(1, cols - 1)) {
    const nums = [c - 1, c].flatMap((cc) => rows0.map((r) => numberAt(cc, r)));
    add('line', nums, colLeft(c) - half, gridBottom - half, colLeft(c) + half, gridBottom + half);
  }

  // Column bets ("2 to 1"), one per row, right of the grid.
  for (const r of rows0) {
    add('column', cols0.map((c) => numberAt(c, r)), columnBetX, rowTop(r), columnBetX + CB, rowTop(r) + H);
  }

  // Dozens: 4 columns each. Their top s/2 belongs to the street/line bands.
  const dozenY0 = gridBottom + half;
  const dozenY1 = gridBottom + D;
  for (const k of range(0, 2)) add('dozen', range(12 * k + 1, 12 * k + 12), colLeft(4 * k), dozenY0, colLeft(4 * k + 4), dozenY1);

  // Even-money row: 2 columns each, in reference order.
  OUTSIDE_ORDER.forEach((type, k) => {
    add(type, outsideNumbers(type, red), colLeft(2 * k), dozenY1, colLeft(2 * k + 2), dozenY1 + O);
  });

  return { width: columnBetX + CB, height: dozenY1 + O, zones };
}
