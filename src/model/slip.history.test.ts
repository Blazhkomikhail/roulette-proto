import { describe, expect, it } from 'vitest';
import { RED_NUMBERS } from '../config/table';
import type { BetTarget } from '../shared/bet';
import { DEFAULT_HISTORY_DEPTH, Slip } from './slip';

const straight = (n: number): BetTarget => ({ type: 'straight', numbers: [n] });
const split = (a: number, b: number): BetTarget => ({ type: 'split', numbers: [a, b] });
const corner = (...n: number[]): BetTarget => ({ type: 'corner', numbers: n });
const red: BetTarget = { type: 'red', numbers: [...RED_NUMBERS] };

type Chip = 1 | 5 | 10 | 25 | 100;
function place(slip: Slip, target: BetTarget, ...chips: Chip[]): void {
  for (const chip of chips) expect(slip.addChip(target, chip)).toEqual({ ok: true, changed: true });
}
function observe(slip: Slip) {
  return { bets: slip.toBets(), total: slip.totalStakeMinor(), state: structuredClone(new Map(slip.snapshot())) };
}
const NO_CHANGE = { ok: true, changed: false } as const;
const CHANGED = { ok: true, changed: true } as const;

describe('Slip.double [У§4]', () => {
  it('doubles every bet and the total', () => {
    const slip = new Slip();
    place(slip, straight(17), 25);
    place(slip, corner(32, 33, 35, 36), 5, 1);
    place(slip, red, 100);
    expect(slip.double()).toEqual(CHANGED);
    expect(slip.toBets()).toEqual([
      { type: 'straight', numbers: [17], amountMinor: '5000' },
      { type: 'corner', numbers: [32, 33, 35, 36], amountMinor: '1200' },
      { type: 'red', numbers: [...RED_NUMBERS], amountMinor: '20000' },
    ]);
    expect(slip.totalStakeMinor()).toBe('26200');
  });

  it('repeats the chip stack, so each chip keeps its denomination', () => {
    const slip = new Slip();
    place(slip, straight(5), 5, 25);
    slip.double();
    expect([...(slip.snapshot().get('straight:5')?.chips ?? [])]).toEqual([500, 2500, 500, 2500]);
  });

  it('reaching exactly the limits is allowed: 50 → 100 on a number, 500 → 1000 total', () => {
    const a = new Slip();
    place(a, straight(17), 25, 25);
    expect(a.double()).toEqual(CHANGED);
    expect(a.toBets()[0]?.amountMinor).toBe('10000');

    const b = new Slip();
    place(b, red, 100, 100, 100, 100, 100);
    expect(b.double()).toEqual(CHANGED);
    expect(b.totalStakeMinor()).toBe('100000');
  });

  it('per-number overflow rejects the whole double; slip unchanged (no partial doubling)', () => {
    const slip = new Slip();
    place(slip, straight(17), 25, 25, 1); // 51 → 102 after doubling
    place(slip, straight(5), 5); // would be fine on its own
    place(slip, red, 10);
    const ref = slip.snapshot();
    const before = observe(slip);
    const r = slip.double();
    expect(r).toEqual({
      ok: false,
      reason: 'PER_NUMBER_LIMIT',
      message: 'Double rejected. Limit per number exceeded: number 17 would have 102 Kup, max 100 Kup',
    });
    expect(slip.snapshot()).toBe(ref);
    expect(observe(slip)).toEqual(before);
  });

  it('per-number overflow through aggregation: straight + corner on 17 = 51 → 102', () => {
    const slip = new Slip();
    place(slip, straight(17), 25, 1);
    place(slip, corner(17, 18, 20, 21), 25);
    const before = observe(slip);
    expect(slip.double()).toMatchObject({ ok: false, reason: 'PER_NUMBER_LIMIT' });
    expect(observe(slip)).toEqual(before);
  });

  it('total overflow rejects the whole double: 501 → 1002', () => {
    const slip = new Slip();
    place(slip, red, 100, 100, 100, 100, 100, 1);
    const before = observe(slip);
    expect(slip.double()).toEqual({
      ok: false,
      reason: 'TOTAL_LIMIT',
      message: 'Double rejected. Total limit exceeded: slip would be 1002 Kup, max 1000 Kup',
    });
    expect(observe(slip)).toEqual(before);
  });

  it('on an empty slip does nothing', () => {
    const slip = new Slip();
    expect(slip.double()).toEqual(NO_CHANGE);
    expect(slip.toBets()).toEqual([]);
    expect(slip.canUndo()).toBe(false);
  });
});

describe('Slip.clear', () => {
  it('empties the slip: no bets, total "0"', () => {
    const slip = new Slip();
    place(slip, straight(1), 100);
    place(slip, red, 25);
    expect(slip.clear()).toEqual(CHANGED);
    expect(slip.toBets()).toEqual([]);
    expect(slip.totalStakeMinor()).toBe('0');
    expect(slip.snapshot().size).toBe(0);
  });

  it('frees the limits: after clear the full 100 fits on the number again', () => {
    const slip = new Slip();
    place(slip, straight(1), 100);
    slip.clear();
    expect(slip.addChip(straight(1), 100)).toEqual(CHANGED);
  });

  it('on an empty slip does nothing', () => {
    const slip = new Slip();
    expect(slip.clear()).toEqual(NO_CHANGE);
    expect(slip.canUndo()).toBe(false);
  });
});

describe('Slip.undo: one step per user action [У§4]', () => {
  type Action = [name: string, setup: (s: Slip) => void, act: (s: Slip) => unknown];
  const actions: Action[] = [
    ['addChip', (s) => place(s, straight(7), 5), (s) => s.addChip(straight(7), 25)],
    ['removeChip', (s) => place(s, straight(7), 5, 25), (s) => s.removeChip(straight(7))],
    ['clear', (s) => { place(s, straight(7), 5); place(s, red, 10); }, (s) => s.clear()],
    ['double', (s) => { place(s, straight(7), 5, 1); place(s, corner(1, 2, 4, 5), 10); place(s, red, 25); }, (s) => s.double()],
  ];

  it.each(actions)('undo after %s restores the previous state in exactly one step', (_n, setup, act) => {
    const slip = new Slip();
    setup(slip);
    const ref = slip.snapshot();
    const before = observe(slip);
    expect(act(slip)).toEqual(CHANGED);
    expect(observe(slip)).not.toEqual(before);
    expect(slip.undo()).toEqual(CHANGED);
    expect(slip.snapshot()).toBe(ref);
    expect(observe(slip)).toEqual(before);
  });

  it('double with many zones is one step, not N', () => {
    const slip = new Slip();
    place(slip, straight(1), 5);
    place(slip, straight(2), 5);
    place(slip, straight(3), 5);
    const before = observe(slip);
    slip.double();
    slip.undo();
    expect(observe(slip)).toEqual(before);
    slip.undo(); // next undo reverts the last add, not a "part" of the double
    expect(slip.toBets().map((b) => b.numbers[0])).toEqual([1, 2]);
  });

  it('undo after clear brings the whole slip back', () => {
    const slip = new Slip();
    place(slip, straight(17), 25, 25);
    place(slip, corner(17, 18, 20, 21), 25);
    place(slip, red, 100);
    const before = observe(slip);
    slip.clear();
    slip.undo();
    expect(observe(slip)).toEqual(before);
  });

  it('a chain of undos walks back through every action to the empty slip', () => {
    const slip = new Slip();
    const states = [observe(slip)];
    place(slip, straight(1), 5); states.push(observe(slip));
    place(slip, straight(1), 10); states.push(observe(slip));
    slip.double(); states.push(observe(slip));
    slip.removeChip(straight(1)); states.push(observe(slip));
    slip.clear(); states.push(observe(slip));
    for (let i = states.length - 2; i >= 0; i--) {
      expect(slip.undo()).toEqual(CHANGED);
      expect(observe(slip), `after undo to step ${i}`).toEqual(states[i]);
    }
    expect(slip.canUndo()).toBe(false);
  });

  it('undo is not itself recorded (no redo): undo, undo goes two actions back', () => {
    const slip = new Slip();
    place(slip, straight(1), 5);
    place(slip, straight(2), 5);
    slip.undo();
    slip.undo();
    expect(slip.toBets()).toEqual([]);
  });

  it('undo on an empty history is safe and repeatable', () => {
    const slip = new Slip();
    expect(slip.undo()).toEqual(NO_CHANGE);
    expect(slip.undo()).toEqual(NO_CHANGE);
    expect(slip.toBets()).toEqual([]);
    place(slip, straight(1), 5);
    slip.undo();
    expect(slip.undo()).toEqual(NO_CHANGE);
    expect(slip.toBets()).toEqual([]);
  });

  it('a new action after undo continues from the restored state', () => {
    const slip = new Slip();
    place(slip, straight(1), 5);
    place(slip, straight(2), 5);
    slip.undo();
    place(slip, straight(3), 5);
    expect(slip.toBets().map((b) => b.numbers[0])).toEqual([1, 3]);
    slip.undo();
    expect(slip.toBets().map((b) => b.numbers[0])).toEqual([1]);
  });
});

describe('Slip history: rejected and no-op operations create no step [У§4]', () => {
  const noStepOps: Array<[string, (s: Slip) => unknown, unknown]> = [
    ['addChip over the per-number limit', (s) => s.addChip(straight(17), 1), { ok: false, reason: 'PER_NUMBER_LIMIT' }],
    ['addChip over the total limit', (s) => s.addChip(red, 100), { ok: false, reason: 'TOTAL_LIMIT' }],
    ['double over the limit', (s) => s.double(), { ok: false, reason: 'PER_NUMBER_LIMIT' }],
    ['removeChip on an empty zone', (s) => s.removeChip(split(1, 2)), NO_CHANGE],
    ['addChip with an invalid target', (s) => s.addChip({ type: 'corner', numbers: [0, 1, 2, 3] }, 1), { ok: false, reason: 'INVALID_TARGET' }],
    ['addChip with an invalid chip', (s) => s.addChip(straight(1), 3 as Chip), { ok: false, reason: 'INVALID_CHIP' }],
  ];

  it.each(noStepOps)('%s: undo then reverts the previous real action', (_n, op, expected) => {
    const slip = new Slip();
    place(slip, red, 100, 100, 100, 100, 100, 100, 100, 100); // 800
    place(slip, straight(17), 100); // 900 total, 17 full
    const afterFirst = observe(slip);
    place(slip, straight(5), 25); // the last real action
    const before = observe(slip);
    expect(op(slip)).toMatchObject(expected as object);
    expect(observe(slip)).toEqual(before);
    slip.undo();
    expect(observe(slip)).toEqual(afterFirst);
  });

  it('clear on an empty slip and double on an empty slip leave the history as it was', () => {
    const slip = new Slip();
    place(slip, straight(1), 5);
    slip.undo(); // history now empty, slip empty
    expect(slip.clear()).toEqual(NO_CHANGE);
    expect(slip.double()).toEqual(NO_CHANGE);
    expect(slip.canUndo()).toBe(false);
  });
});

describe('Slip history depth (user decision: 30 steps)', () => {
  it('default depth is 30: after 31 actions exactly 30 can be undone', () => {
    expect(DEFAULT_HISTORY_DEPTH).toBe(30);
    const slip = new Slip();
    for (let i = 0; i < 31; i++) place(slip, red, 1);
    let undone = 0;
    while (slip.undo().changed) undone++;
    expect(undone).toBe(30);
    expect(slip.toBets()).toEqual([{ type: 'red', numbers: [...RED_NUMBERS], amountMinor: '100' }]);
  });

  it('keeps only the last N steps; the oldest are dropped', () => {
    const slip = new Slip({ historyDepth: 2 });
    place(slip, straight(1), 5);
    place(slip, straight(2), 5);
    place(slip, straight(3), 5);
    expect(slip.undo()).toEqual(CHANGED);
    expect(slip.undo()).toEqual(CHANGED);
    expect(slip.undo()).toEqual(NO_CHANGE);
    expect(slip.toBets().map((b) => b.numbers[0])).toEqual([1]);
  });

  it.each([0, -1, 1.5, Number.NaN])('rejects historyDepth %s', (d) => {
    expect(() => new Slip({ historyDepth: d })).toThrow(RangeError);
  });
});
