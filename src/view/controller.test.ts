import { describe, expect, it, vi } from 'vitest';
import type { BetTarget } from '../shared/bet';
import { Slip } from '../model/slip';
import type { SlipState } from '../model/types';
import { pointerAction, TableController, type UiStatus } from './controller';

const straight = (n: number): BetTarget => ({ type: 'straight', numbers: [n] });

function setup() {
  const slip = new Slip();
  const slips: SlipState[] = [];
  const statuses: UiStatus[] = [];
  const log = vi.fn<(m: string) => void>();
  const c = new TableController(slip, { renderSlip: (s) => slips.push(s), renderStatus: (s) => statuses.push(s) }, log);
  c.start();
  return { slip, c, log, slips, statuses, last: () => statuses[statuses.length - 1]! };
}

describe('pointerAction [З]', () => {
  it.each([
    [{ button: 0, shiftKey: false }, 'add'],
    [{ button: 0, shiftKey: true }, 'remove'],
    [{ button: 2, shiftKey: false }, 'remove'],
    [{ button: 2, shiftKey: true }, 'remove'],
    [{ button: 1, shiftKey: false }, null],
  ] as const)('%o → %s', (e, expected) => {
    expect(pointerAction(e)).toBe(expected);
  });
});

describe('TableController', () => {
  it('starts with chip 1 selected, empty total and disabled buttons', () => {
    const { last } = setup();
    expect(last()).toEqual({ selectedChip: 1, totalText: '0 Kup', canUndo: false, canClear: false, canDouble: false, message: null });
  });

  it('click places the selected chip; repeated click adds another', () => {
    const { c, slip, last } = setup();
    c.selectChip(25);
    c.pointerOnZone(straight(17), 'add');
    c.pointerOnZone(straight(17), 'add');
    expect(slip.toBets()).toEqual([{ type: 'straight', numbers: [17], amountMinor: '5000' }]);
    expect(last()).toMatchObject({ totalText: '50 Kup', canUndo: true, canClear: true, canDouble: true });
  });

  it('remove takes one chip off the zone', () => {
    const { c, slip } = setup();
    c.selectChip(5);
    c.pointerOnZone(straight(3), 'add');
    c.selectChip(10);
    c.pointerOnZone(straight(3), 'add');
    c.pointerOnZone(straight(3), 'remove');
    expect(slip.toBets()).toEqual([{ type: 'straight', numbers: [3], amountMinor: '500' }]);
  });

  it('a rejection shows the message and logs exactly the same text to the console, in Kup [У§2]', () => {
    const { c, log, last } = setup();
    c.selectChip(100);
    c.pointerOnZone(straight(17), 'add');
    c.pointerOnZone(straight(17), 'add');
    const expected = 'Limit per number exceeded: number 17 would have 200 Kup, max 100 Kup';
    expect(last().message).toBe(expected);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(expected);
    expect(last().totalText).toBe('100 Kup');
  });

  it('the message is cleared by the next accepted action', () => {
    const { c, last } = setup();
    c.selectChip(100);
    c.pointerOnZone(straight(17), 'add');
    c.pointerOnZone(straight(17), 'add');
    expect(last().message).not.toBeNull();
    c.pointerOnZone(straight(5), 'add');
    expect(last().message).toBeNull();
  });

  it('double rejection is shown and logged; the slip stays', () => {
    const { c, slip, log, last } = setup();
    c.selectChip(100);
    c.pointerOnZone(straight(17), 'add');
    const before = slip.toBets();
    c.double();
    expect(slip.toBets()).toEqual(before);
    expect(last().message).toMatch(/^Double rejected\. .*200 Kup.*100 Kup/);
    expect(log).toHaveBeenCalledWith(last().message);
  });

  it('CLEAR, UNDO, DOUBLE go to the slip', () => {
    const { c, slip, last } = setup();
    c.selectChip(10);
    c.pointerOnZone(straight(1), 'add');
    c.double();
    expect(last().totalText).toBe('20 Kup');
    c.undo();
    expect(last().totalText).toBe('10 Kup');
    c.clear();
    expect(slip.toBets()).toEqual([]);
    expect(last()).toMatchObject({ totalText: '0 Kup', canUndo: true, canClear: false, canDouble: false });
    c.undo();
    expect(last().totalText).toBe('10 Kup');
  });

  it('undo does not restore the selected chip [У§4]', () => {
    const { c, last } = setup();
    c.selectChip(5);
    c.pointerOnZone(straight(1), 'add');
    c.selectChip(100);
    c.undo();
    expect(last().selectedChip).toBe(100);
  });

  it('every action re-renders the slip with the current snapshot', () => {
    const { c, slip, slips } = setup();
    c.pointerOnZone(straight(1), 'add');
    expect(slips[slips.length - 1]).toBe(slip.snapshot());
  });
});
