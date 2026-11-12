import type { BetTarget } from '../shared/bet';

/** Axis-aligned rectangle in table-local logical px. Half-open: contains [x, x+w) × [y, y+h). */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** A clickable betting zone: what the bet is (type + numbers) and where it is. */
export interface Zone extends BetTarget {
  /** zoneKey(type, numbers), e.g. "split:0-1". */
  readonly id: string;
  readonly rect: Rect;
  /** Human-readable bet name for the tooltip, e.g. "Corner 32/33/35/36". */
  readonly label: string;
}

export interface TableGeometry {
  readonly width: number;
  readonly height: number;
  readonly zones: readonly Zone[];
}

export function rectContains(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
