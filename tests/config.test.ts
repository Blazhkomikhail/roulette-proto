import { describe, expect, it } from 'vitest';
import { LABELS, OUTSIDE_ORDER, RED_NUMBERS, TABLE } from '../src/config/table';
import { BET_ARITY, BET_TYPES, INSIDE_BET_TYPES, isBetType, isInsideBetType, zoneKey } from '../src/shared/bet';

/** Independent oracle: on a European wheel, in 1–10 and 19–28 odd numbers are red; in 11–18 and 29–36 even ones are. */
function isRedByRule(n: number): boolean {
  const oddIsRed = (n >= 1 && n <= 10) || (n >= 19 && n <= 28);
  return oddIsRed ? n % 2 === 1 : n % 2 === 0;
}

describe('config: table data', () => {
  it('red numbers: 18 unique values in 1..36, ascending, matching the standard colour rule', () => {
    expect(RED_NUMBERS).toHaveLength(18);
    expect(new Set(RED_NUMBERS).size).toBe(18);
    expect([...RED_NUMBERS]).toEqual([...RED_NUMBERS].sort((a, b) => a - b));
    for (let n = 1; n <= 36; n++) expect(RED_NUMBERS.includes(n), `number ${n}`).toBe(isRedByRule(n));
  });

  it('grid is 3 × 12', () => {
    expect(TABLE.rows).toBe(3);
    expect(TABLE.cols).toBe(12);
  });

  it('stripe is even and leaves room for a straight zone ≥ 3 px after shrinking', () => {
    expect(TABLE.stripe % 2).toBe(0);
    expect(TABLE.stripe).toBeGreaterThanOrEqual(4);
    expect(TABLE.cell.w - TABLE.stripe).toBeGreaterThanOrEqual(3);
    expect(TABLE.cell.h - TABLE.stripe).toBeGreaterThanOrEqual(3);
    expect(TABLE.dozenH - TABLE.stripe / 2).toBeGreaterThanOrEqual(3);
  });

  it('all sizes are positive integers', () => {
    const sizes = [TABLE.cell.w, TABLE.cell.h, TABLE.zeroW, TABLE.columnBetW, TABLE.dozenH, TABLE.outsideH, TABLE.stripe];
    for (const s of sizes) expect(Number.isInteger(s) && s > 0).toBe(true);
  });

  it('even-money row order matches the reference: 1-18, EVEN, red, black, ODD, 19-36 [У§1]', () => {
    expect([...OUTSIDE_ORDER]).toEqual(['low', 'even', 'red', 'black', 'odd', 'high']);
    expect([...LABELS.dozen]).toEqual(['1st12', '2nd12', '3rd12']);
    expect(LABELS.column).toBe('2 to 1');
  });
});

describe('shared: bet vocabulary', () => {
  it('13 bet types, 5 of them inside', () => {
    expect(BET_TYPES).toHaveLength(13);
    expect([...INSIDE_BET_TYPES]).toEqual(['straight', 'split', 'street', 'corner', 'line']);
    for (const t of BET_TYPES) expect(isInsideBetType(t)).toBe((INSIDE_BET_TYPES as readonly string[]).includes(t));
  });

  it('arity per type', () => {
    expect(BET_ARITY).toEqual({
      straight: 1, split: 2, street: 3, corner: 4, line: 6, column: 12, dozen: 12,
      red: 18, black: 18, odd: 18, even: 18, low: 18, high: 18,
    });
  });

  it('isBetType guards unknown values', () => {
    expect(isBetType('corner')).toBe(true);
    expect(isBetType('basket')).toBe(false);
    expect(isBetType(1)).toBe(false);
  });

  it('zoneKey is stable and readable', () => {
    expect(zoneKey({ type: 'corner', numbers: [32, 33, 35, 36] })).toBe('corner:32-33-35-36');
    expect(zoneKey({ type: 'split', numbers: [0, 1] })).toBe('split:0-1');
  });
});
