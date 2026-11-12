import { describe, expect, it } from 'vitest';
import { LABELS, OUTSIDE_ORDER, RED_NUMBERS, TABLE } from './table';

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
