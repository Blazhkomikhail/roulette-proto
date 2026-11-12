import { describe, expect, it } from 'vitest';
import {
  CHIP_DENOMINATIONS_KUP, MINOR_PER_KUP, PER_NUMBER_LIMIT_MINOR, TOTAL_LIMIT_MINOR,
} from '../config/money';
import {
  addMinor, chipToMinor, formatKup, kupToMinor, minorToKup, minorToString, multiplyMinor,
  parseAmountMinor, type Minor,
} from './money';

describe('money: units [У§2]', () => {
  it('multiplier is 100', () => {
    expect(MINOR_PER_KUP).toBe(100);
  });

  it.each([
    [1, '100'], [5, '500'], [10, '1000'], [25, '2500'], [100, '10000'],
  ] as const)('chip %i Kup → "%s" minor', (chip, expected) => {
    expect(minorToString(chipToMinor(chip))).toBe(expected);
  });

  it('chip set is exactly 1/5/10/25/100 and every chip is a multiple of 100 minor', () => {
    expect([...CHIP_DENOMINATIONS_KUP]).toEqual([1, 5, 10, 25, 100]);
    for (const chip of CHIP_DENOMINATIONS_KUP) expect(chipToMinor(chip) % 100).toBe(0);
  });

  it('limits: 100 Kup per number = 10000, 1000 Kup total = 100000', () => {
    expect(PER_NUMBER_LIMIT_MINOR).toBe(10000);
    expect(TOTAL_LIMIT_MINOR).toBe(100000);
  });
});

describe('money: parseAmountMinor (strict)', () => {
  it.each(['100', '2500', '10000', '10100', '100000', '100100'])('accepts "%s"', (s) => {
    const r = parseAmountMinor(s);
    expect(r).toEqual({ ok: true, value: Number(s) });
  });

  it.each([
    ['150', 'not whole Kup'],
    ['1', 'not whole Kup'],
    ['99', 'not whole Kup'],
    ['0', 'zero is not a bet'],
    ['', 'empty'],
    ['-100', 'negative'],
    ['+100', 'sign'],
    ['1e2', 'exponent (Number("1e2") === 100)'],
    [' 100', 'leading space (Number(" 100") === 100)'],
    ['100 ', 'trailing space'],
    ['0100', 'leading zero'],
    ['100.0', 'decimal point'],
    ['1.5', 'fraction'],
    ['0x64', 'hex (Number("0x64") === 100)'],
    ['1_00', 'separator'],
    ['９００', 'full-width digits'],
    ['90071992547409900', 'beyond safe integer (rounds to a non-multiple of 100)'],
    ['100000000000000000000', 'beyond safe integer, exact double and multiple of 100: only the safe-integer check rejects it'],
  ])('rejects "%s" (%s)', (s) => {
    const r = parseAmountMinor(s);
    expect(r.ok).toBe(false);
  });

  it.each([100, null, undefined, 100n])('rejects non-string %s', (v) => {
    expect(parseAmountMinor(v).ok).toBe(false);
  });
});

describe('money: conversions and arithmetic', () => {
  it('kupToMinor accepts non-negative integers, rejects the rest', () => {
    expect(kupToMinor(0)).toBe(0);
    expect(kupToMinor(1000)).toBe(100000);
    for (const bad of [1.5, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER]) {
      expect(() => kupToMinor(bad)).toThrow(RangeError);
    }
  });

  it('minorToKup / formatKup show whole Kup and refuse fractional minor', () => {
    expect(minorToKup(2500 as Minor)).toBe(25);
    expect(formatKup(10000 as Minor)).toBe('100 Kup');
    expect(formatKup(0 as Minor)).toBe('0 Kup');
    expect(() => formatKup(150 as Minor)).toThrow(RangeError);
    expect(() => minorToString(150 as Minor)).toThrow(RangeError);
    expect(() => minorToString(-100 as Minor)).toThrow(RangeError);
  });

  it('addMinor / multiplyMinor stay integer and multiple of 100', () => {
    expect(addMinor(5000 as Minor, 2500 as Minor)).toBe(7500);
    expect(multiplyMinor(2500 as Minor, 2)).toBe(5000);
    expect(() => addMinor(100 as Minor, 50 as Minor)).toThrow(RangeError);
    expect(() => multiplyMinor(100 as Minor, 1.5)).toThrow(RangeError);
    expect(() => multiplyMinor(100 as Minor, -1)).toThrow(RangeError);
  });

  it('minorToString round-trips through parseAmountMinor', () => {
    for (const chip of CHIP_DENOMINATIONS_KUP) {
      const m = chipToMinor(chip);
      expect(parseAmountMinor(minorToString(m))).toEqual({ ok: true, value: m });
    }
  });
});
