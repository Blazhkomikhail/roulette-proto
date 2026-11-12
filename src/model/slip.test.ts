import { describe, expect, it } from 'vitest';
import { RED_NUMBERS } from '../config/table';
import type { BetTarget } from '../shared/bet';
import { perNumberExposure } from './limits';
import { Slip } from './slip';

const straight = (n: number): BetTarget => ({ type: 'straight', numbers: [n] });
const split = (a: number, b: number): BetTarget => ({ type: 'split', numbers: [a, b] });
const corner = (...n: number[]): BetTarget => ({ type: 'corner', numbers: n });
const line = (from: number): BetTarget => ({ type: 'line', numbers: [0, 1, 2, 3, 4, 5].map((i) => from + i) });
const dozen1: BetTarget = { type: 'dozen', numbers: Array.from({ length: 12 }, (_, i) => i + 1) };
const red: BetTarget = { type: 'red', numbers: [...RED_NUMBERS] };
const black: BetTarget = { type: 'black', numbers: Array.from({ length: 36 }, (_, i) => i + 1).filter((n) => !RED_NUMBERS.includes(n)) };

/** Adds chips and asserts each one is accepted. */
function place(slip: Slip, target: BetTarget, ...chips: Array<1 | 5 | 10 | 25 | 100>): void {
  for (const chip of chips) expect(slip.addChip(target, chip), `${target.type} ${target.numbers.join('/')} +${chip}`).toEqual({ ok: true, changed: true });
}

/** Everything observable about the slip, deep-copied. */
function observe(slip: Slip) {
  return { bets: slip.toBets(), total: slip.totalStakeMinor(), state: structuredClone(new Map(slip.snapshot())) };
}

describe('Slip: units [У§2]', () => {
  it.each([[1, '100'], [5, '500'], [10, '1000'], [25, '2500'], [100, '10000']] as const)(
    'chip %i → amountMinor "%s"',
    (chip, expected) => {
      const slip = new Slip();
      place(slip, straight(17), chip);
      expect(slip.toBets()).toEqual([{ type: 'straight', numbers: [17], amountMinor: expected }]);
      expect(slip.totalStakeMinor()).toBe(expected);
    },
  );

  it('chips on one zone sum up; every amount is a multiple of 100', () => {
    const slip = new Slip();
    place(slip, straight(5), 1, 5, 10, 25);
    place(slip, red, 100, 1);
    for (const bet of slip.toBets()) {
      expect(bet.amountMinor).toMatch(/^[1-9]\d*00$/);
    }
    expect(slip.toBets()).toEqual([
      { type: 'straight', numbers: [5], amountMinor: '4100' },
      { type: 'red', numbers: [...RED_NUMBERS], amountMinor: '10100' },
    ]);
    expect(slip.totalStakeMinor()).toBe('14200');
  });

  it('empty slip: no bets, total "0"', () => {
    const slip = new Slip();
    expect(slip.toBets()).toEqual([]);
    expect(slip.totalStakeMinor()).toBe('0');
  });
});

describe('Slip: per-number limit 100 Kup = 10000 minor [У§2][У§3]', () => {
  it('10000 on one number is allowed, 10100 is not', () => {
    const slip = new Slip();
    place(slip, straight(17), 100);
    expect(slip.toBets()[0]?.amountMinor).toBe('10000');
    const r = slip.addChip(straight(17), 1);
    expect(r).toMatchObject({ ok: false, reason: 'PER_NUMBER_LIMIT' });
    expect(slip.toBets()[0]?.amountMinor).toBe('10000');
  });

  it('aggregation: 50 on straight 17 + 25 on corner 17/18/20/21 = 75 on number 17', () => {
    const slip = new Slip();
    place(slip, straight(17), 25, 25);
    place(slip, corner(17, 18, 20, 21), 25);
    const exposure = perNumberExposure(slip.snapshot());
    expect(exposure.get(17)).toBe(7500);
  });

  it('a corner amount is not divided: 25 on the corner is 25 on each of its four numbers', () => {
    const slip = new Slip();
    place(slip, corner(17, 18, 20, 21), 25);
    const exposure = perNumberExposure(slip.snapshot());
    expect(Object.fromEntries(exposure)).toEqual({ 17: 2500, 18: 2500, 20: 2500, 21: 2500 });
  });

  it('the limit counts all inside zones on the number: straight + corner + split reaching 100 is ok, 101 is not', () => {
    const slip = new Slip();
    place(slip, straight(17), 25, 25); // 50
    place(slip, corner(17, 18, 20, 21), 25); // 75
    place(slip, split(17, 20), 25); // 100 on 17, 50 on 20
    expect(perNumberExposure(slip.snapshot()).get(17)).toBe(10000);
    const before = observe(slip);
    // +1 on the corner pushes 17 to 101 while 18, 20, 21 stay well under 100: still rejected.
    const r = slip.addChip(corner(17, 18, 20, 21), 1);
    expect(r).toMatchObject({ ok: false, reason: 'PER_NUMBER_LIMIT' });
    expect(observe(slip)).toEqual(before);
  });

  it('a line puts its full amount on each of its six numbers', () => {
    const slip = new Slip();
    place(slip, line(13), 100);
    expect(slip.addChip(straight(18), 1)).toMatchObject({ ok: false, reason: 'PER_NUMBER_LIMIT' });
    expect(slip.addChip(straight(13), 1)).toMatchObject({ ok: false, reason: 'PER_NUMBER_LIMIT' });
    expect(slip.addChip(straight(19), 100)).toEqual({ ok: true, changed: true });
  });

  it('zero has the per-number limit too (via straight and 0/x splits)', () => {
    const slip = new Slip();
    place(slip, straight(0), 25, 25);
    place(slip, split(0, 2), 25, 25);
    expect(slip.addChip(split(0, 1), 1)).toMatchObject({ ok: false, reason: 'PER_NUMBER_LIMIT' });
  });
});

describe('Slip: outside bets [У§3]', () => {
  it('are not added to their numbers: 100 on a dozen + 100 on straight 1 is fine', () => {
    const slip = new Slip();
    place(slip, dozen1, 100);
    place(slip, straight(1), 100);
    expect(perNumberExposure(slip.snapshot()).get(1)).toBe(10000);
    expect(slip.totalStakeMinor()).toBe('20000');
  });

  it('have no per-number limit: 1000 on red in one zone is allowed', () => {
    const slip = new Slip();
    place(slip, red, ...Array<100>(10).fill(100));
    expect(slip.toBets()).toEqual([{ type: 'red', numbers: [...RED_NUMBERS], amountMinor: '100000' }]);
    expect(perNumberExposure(slip.snapshot()).size).toBe(0);
  });
});

describe('Slip: total limit 1000 Kup = 100000 minor [У§2][У§3]', () => {
  it('100000 in the slip is allowed, 100100 is not (outside + inside together)', () => {
    const slip = new Slip();
    place(slip, red, ...Array<100>(9).fill(100)); // 900 outside
    place(slip, straight(7), 100); // 100 inside → 1000 total
    expect(slip.totalStakeMinor()).toBe('100000');
    const before = observe(slip);
    const r = slip.addChip(black, 1);
    expect(r).toMatchObject({ ok: false, reason: 'TOTAL_LIMIT' });
    expect(observe(slip)).toEqual(before);
  });

  it('check order: when both limits break, the per-number limit is reported (lowest number first)', () => {
    const slip = new Slip();
    place(slip, red, ...Array<100>(9).fill(100));
    place(slip, line(1), 100); // 1000 total; numbers 1..6 at 100
    const r = slip.addChip(corner(1, 2, 4, 5), 5); // breaks both
    expect(r).toMatchObject({ ok: false, reason: 'PER_NUMBER_LIMIT' });
    expect(r.ok === false && r.message).toContain('number 1 ');
  });
});

describe('Slip: rejection messages are in Kup [У§2]', () => {
  it('per-number message names the number and both amounts in Kup', () => {
    const slip = new Slip();
    place(slip, straight(17), 100);
    const r = slip.addChip(straight(17), 1);
    expect(r).toEqual({
      ok: false,
      reason: 'PER_NUMBER_LIMIT',
      message: 'Limit per number exceeded: number 17 would have 101 Kup, max 100 Kup',
    });
  });

  it('total message shows Kup, not minor units', () => {
    const slip = new Slip();
    place(slip, red, ...Array<100>(10).fill(100));
    const r = slip.addChip(black, 25);
    expect(r).toEqual({ ok: false, reason: 'TOTAL_LIMIT', message: 'Total limit exceeded: slip would be 1025 Kup, max 1000 Kup' });
    expect(r.ok === false && r.message).not.toMatch(/102500|100000/);
  });
});

describe('Slip: atomicity [У§3]', () => {
  it('a rejected add leaves the slip deeply identical and keeps the same snapshot object', () => {
    const slip = new Slip();
    place(slip, straight(17), 100);
    place(slip, corner(32, 33, 35, 36), 25);
    const snapshotRef = slip.snapshot();
    const before = observe(slip);
    expect(slip.addChip(split(17, 18), 1).ok).toBe(false);
    expect(slip.addChip(straight(17), 100).ok).toBe(false);
    expect(slip.snapshot()).toBe(snapshotRef);
    expect(observe(slip)).toEqual(before);
  });
});

describe('Slip: removeChip', () => {
  it('removes the last chip placed on the zone', () => {
    const slip = new Slip();
    place(slip, straight(5), 5, 25);
    expect(slip.removeChip(straight(5))).toEqual({ ok: true, changed: true });
    expect(slip.toBets()).toEqual([{ type: 'straight', numbers: [5], amountMinor: '500' }]);
    expect([...(slip.snapshot().get('straight:5')?.chips ?? [])]).toEqual([500]);
  });

  it('removing the last chip drops the zone from toBets', () => {
    const slip = new Slip();
    place(slip, straight(5), 1);
    place(slip, red, 1);
    slip.removeChip(straight(5));
    expect(slip.toBets().map((b) => b.type)).toEqual(['red']);
    expect(slip.snapshot().has('straight:5')).toBe(false);
  });

  it('on an empty zone does nothing and reports changed: false', () => {
    const slip = new Slip();
    place(slip, red, 5);
    const ref = slip.snapshot();
    expect(slip.removeChip(straight(5))).toEqual({ ok: true, changed: false });
    expect(slip.snapshot()).toBe(ref);
  });

  it('frees room under the limit', () => {
    const slip = new Slip();
    place(slip, straight(17), 100);
    slip.removeChip(straight(17));
    expect(slip.addChip(straight(17), 100)).toEqual({ ok: true, changed: true });
  });
});

describe('Slip: input validation', () => {
  it.each([
    ['unknown type', { type: 'basket', numbers: [0, 1, 2] }],
    ['wrong arity', { type: 'corner', numbers: [1, 2, 4] }],
    ['number out of range', { type: 'straight', numbers: [37] }],
    ['negative', { type: 'straight', numbers: [-1] }],
    ['fraction', { type: 'straight', numbers: [1.5] }],
    ['duplicates', { type: 'split', numbers: [4, 4] }],
    ['zero in a corner [З]', { type: 'corner', numbers: [0, 1, 2, 3] }],
    ['zero in a street [З]', { type: 'street', numbers: [0, 1, 2] }],
    ['zero in a line [З]', { type: 'line', numbers: [0, 1, 2, 3, 4, 5] }],
    ['non-adjacent split', { type: 'split', numbers: [1, 5] }],
    ['split across columns', { type: 'split', numbers: [3, 4] }],
    ['split 0/4', { type: 'split', numbers: [0, 4] }],
    ['corner not 2×2', { type: 'corner', numbers: [3, 4, 6, 7] }],
    ['street not a column', { type: 'street', numbers: [2, 3, 4] }],
    ['line not two columns', { type: 'line', numbers: [2, 3, 4, 5, 6, 7] }],
    ['fake red', { type: 'red', numbers: Array.from({ length: 18 }, (_, i) => i + 1) }],
    ['dozen 2..13', { type: 'dozen', numbers: Array.from({ length: 12 }, (_, i) => i + 2) }],
    ['column mixed', { type: 'column', numbers: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 35] }],
    ['numbers not an array', { type: 'straight', numbers: 5 }],
    ['null', null],
  ])('rejects %s, slip unchanged', (_n, target) => {
    const slip = new Slip();
    place(slip, straight(1), 1);
    const before = observe(slip);
    const r = slip.addChip(target as BetTarget, 1);
    expect(r).toMatchObject({ ok: false, reason: 'INVALID_TARGET' });
    expect(slip.removeChip(target as BetTarget)).toMatchObject({ ok: false, reason: 'INVALID_TARGET' });
    expect(observe(slip)).toEqual(before);
  });

  it.each([
    ['corner', [0, 1, 2, 3]],
    ['street', [0, 1, 2]],
    ['line', [0, 1, 2, 3, 4, 5]],
  ] as const)('zero in a %s is rejected with an explicit "zero is not allowed" message [З]', (type, numbers) => {
    const r = new Slip().addChip({ type, numbers: [...numbers] }, 1);
    expect(r).toEqual({ ok: false, reason: 'INVALID_TARGET', message: `Invalid bet: ${type}: zero is not allowed` });
  });

  it.each([0, 2, 50, 1.5, -1, '1', null])('rejects chip %s', (chip) => {
    const slip = new Slip();
    const r = slip.addChip(straight(1), chip as 1);
    expect(r).toMatchObject({ ok: false, reason: 'INVALID_CHIP' });
    expect(slip.toBets()).toEqual([]);
  });

  it('accepts unsorted numbers and normalises them; the same zone is hit either way', () => {
    const slip = new Slip();
    place(slip, { type: 'corner', numbers: [36, 35, 33, 32] }, 5);
    place(slip, corner(32, 33, 35, 36), 5);
    expect(slip.toBets()).toEqual([{ type: 'corner', numbers: [32, 33, 35, 36], amountMinor: '1000' }]);
  });
});

describe('Slip: immutability', () => {
  it('does not mutate the target passed in', () => {
    const slip = new Slip();
    const numbers = [36, 35, 33, 32];
    const target = Object.freeze({ type: 'corner' as const, numbers: Object.freeze(numbers) as unknown as number[] });
    expect(() => slip.addChip(target, 5)).not.toThrow();
    expect(numbers).toEqual([36, 35, 33, 32]);
  });

  it('mutating the result of toBets() or the caller-owned target does not affect the slip', () => {
    const slip = new Slip();
    const numbers = [17];
    place(slip, { type: 'straight', numbers }, 25);
    numbers[0] = 18;
    const bets = slip.toBets();
    bets[0]!.numbers.push(99);
    (bets as unknown[]).length = 0;
    expect(slip.toBets()).toEqual([{ type: 'straight', numbers: [17], amountMinor: '2500' }]);
  });

  it('each change produces a new snapshot; old snapshots stay as they were', () => {
    const slip = new Slip();
    place(slip, straight(1), 5);
    const s1 = slip.snapshot();
    const s1Copy = structuredClone(new Map(s1));
    place(slip, straight(1), 5);
    place(slip, straight(2), 5);
    slip.removeChip(straight(1));
    expect(slip.snapshot()).not.toBe(s1);
    expect(new Map(s1)).toEqual(s1Copy);
    expect(Object.isFrozen(s1.get('straight:1')?.chips)).toBe(true);
  });
});

describe('Slip: toBets order [Д]', () => {
  it('ordered by bet type, then numbers, independent of placement order', () => {
    const a = new Slip();
    const b = new Slip();
    const targets = [red, straight(20), split(1, 2), straight(3), dozen1, corner(1, 2, 4, 5)];
    for (const t of targets) place(a, t, 1);
    for (const t of [...targets].reverse()) place(b, t, 1);
    expect(a.toBets()).toEqual(b.toBets());
    expect(a.toBets().map((x) => `${x.type}:${x.numbers.join('-')}`)).toEqual([
      'straight:3', 'straight:20', 'split:1-2', 'corner:1-2-4-5',
      'dozen:1-2-3-4-5-6-7-8-9-10-11-12', `red:${RED_NUMBERS.join('-')}`,
    ]);
  });
});
