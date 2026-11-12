import { describe, expect, it } from 'vitest';
import { RED_NUMBERS, TABLE, type TableLayout } from '../config/table';
import { BET_ARITY, BET_TYPES, type BetType } from '../shared/bet';
import { buildTable } from './buildTable';
import { TEST_LAYOUTS } from './testLayouts';
import { rectsOverlap, type Zone } from './types';

const byType = (zones: readonly Zone[], t: BetType): Zone[] => zones.filter((z) => z.type === t);
const numbersOf = (zones: readonly Zone[]): number[][] => zones.map((z) => [...z.numbers]);
const sortRows = (rows: number[][]): number[][] =>
  [...rows].sort((a, b) => a.length - b.length || a.join(',').localeCompare(b.join(','), 'en', { numeric: true }));

// Expected sets derived from the roulette rules, not from the builder.
const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const sameColumn = (a: number, b: number): boolean => Math.ceil(a / 3) === Math.ceil(b / 3);

function expectedSplits(): number[][] {
  const out: number[][] = [[0, 1], [0, 2], [0, 3]];
  for (let n = 1; n <= 36; n++) {
    if (n + 3 <= 36) out.push([n, n + 3]); // horizontal neighbours
    if (n + 1 <= 36 && sameColumn(n, n + 1)) out.push([n, n + 1]); // vertical neighbours in one column
  }
  return out;
}
const expectedCorners = (): number[][] =>
  range(1, 32).filter((a) => a % 3 !== 0).map((a) => [a, a + 1, a + 3, a + 4]);
const expectedStreets = (): number[][] => range(0, 11).map((k) => [3 * k + 1, 3 * k + 2, 3 * k + 3]);
const expectedLines = (): number[][] => range(0, 10).map((k) => range(3 * k + 1, 3 * k + 6));

describe.each(TEST_LAYOUTS)('buildTable (%s)', (_name, layout: TableLayout) => {
  const { zones, width, height } = buildTable(layout);

  it('154 zones with the expected count per type', () => {
    const counts = Object.fromEntries(BET_TYPES.map((t) => [t, byType(zones, t).length]));
    expect(counts).toEqual({
      straight: 37, split: 60, street: 12, corner: 22, line: 11, column: 3, dozen: 3,
      red: 1, black: 1, odd: 1, even: 1, low: 1, high: 1,
    });
    expect(zones).toHaveLength(154);
  });

  it('ids are unique; numbers ascending, unique, within 0..36, arity per type', () => {
    expect(new Set(zones.map((z) => z.id)).size).toBe(zones.length);
    for (const z of zones) {
      expect(z.numbers, z.id).toEqual([...new Set(z.numbers)].sort((a, b) => a - b));
      expect(z.numbers.every((n) => Number.isInteger(n) && n >= 0 && n <= 36), z.id).toBe(true);
      expect(z.numbers, z.id).toHaveLength(BET_ARITY[z.type]);
    }
  });

  it('straights: each of 0..36 exactly once', () => {
    expect(byType(zones, 'straight').map((z) => z.numbers[0]).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual(range(0, 36));
  });

  it('splits, corners, streets, lines are exactly the ones the roulette rules allow', () => {
    expect(sortRows(numbersOf(byType(zones, 'split')))).toEqual(sortRows(expectedSplits()));
    expect(sortRows(numbersOf(byType(zones, 'corner')))).toEqual(sortRows(expectedCorners()));
    expect(sortRows(numbersOf(byType(zones, 'street')))).toEqual(sortRows(expectedStreets()));
    expect(sortRows(numbersOf(byType(zones, 'line')))).toEqual(sortRows(expectedLines()));
  });

  it('zero is only in straight 0 and splits 0/1, 0/2, 0/3; never in corner, street, line or outside bets [З]', () => {
    const withZero = zones.filter((z) => z.numbers.includes(0)).map((z) => z.id).sort();
    expect(withZero).toEqual(['split:0-1', 'split:0-2', 'split:0-3', 'straight:0']);
  });

  it('outside bets cover the right numbers', () => {
    const one = (t: BetType): number[] => [...(byType(zones, t)[0]?.numbers ?? [])];
    expect(one('low')).toEqual(range(1, 18));
    expect(one('high')).toEqual(range(19, 36));
    expect(one('even')).toEqual(range(1, 36).filter((n) => n % 2 === 0));
    expect(one('odd')).toEqual(range(1, 36).filter((n) => n % 2 === 1));
    expect(one('red')).toEqual([...RED_NUMBERS]);
    expect(one('black')).toEqual(range(1, 36).filter((n) => !RED_NUMBERS.includes(n)));
    expect(sortRows(numbersOf(byType(zones, 'dozen')))).toEqual([range(1, 12), range(13, 24), range(25, 36)]);
    expect(sortRows(numbersOf(byType(zones, 'column')))).toEqual(
      sortRows([1, 2, 3].map((s) => range(0, 11).map((k) => s + 3 * k))),
    );
  });

  it('no two zone rects overlap [З]', () => {
    const overlaps: string[] = [];
    for (let i = 0; i < zones.length; i++) {
      for (let j = i + 1; j < zones.length; j++) {
        const a = zones[i]!, b = zones[j]!;
        if (rectsOverlap(a.rect, b.rect)) overlaps.push(`${a.id} × ${b.id}`);
      }
    }
    expect(overlaps).toEqual([]);
  });

  it('every rect is at least 3 px in both directions and inside the table bounds', () => {
    for (const { id, rect: r } of zones) {
      expect(r.w, id).toBeGreaterThanOrEqual(3);
      expect(r.h, id).toBeGreaterThanOrEqual(3);
      expect(r.x >= 0 && r.y >= 0 && r.x + r.w <= width && r.y + r.h <= height, id).toBe(true);
    }
  });

  it('smaller zones are smaller: corner/line < split/street < straight; street < dozen', () => {
    const area = (z: Zone): number => z.rect.w * z.rect.h;
    const max = (t: BetType): number => Math.max(...byType(zones, t).map(area));
    const min = (t: BetType): number => Math.min(...byType(zones, t).map(area));
    expect(max('corner')).toBeLessThan(min('split'));
    expect(max('line')).toBeLessThan(min('street'));
    expect(max('split')).toBeLessThan(min('straight'));
    expect(max('street')).toBeLessThan(min('straight'));
    expect(max('street')).toBeLessThan(min('dozen'));
  });
});

describe('buildTable: layout validation', () => {
  it.each([
    ['odd stripe', { ...TABLE, stripe: 11 }],
    ['zero stripe', { ...TABLE, stripe: 0 }],
    ['stripe eats the cell', { ...TABLE, stripe: TABLE.cell.w - 2 }],
    ['fractional size', { ...TABLE, cell: { w: 60.5, h: 72 } }],
  ])('throws on %s', (_n, bad) => {
    expect(() => buildTable(bad as TableLayout)).toThrow(RangeError);
  });
});
