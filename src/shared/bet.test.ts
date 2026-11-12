import { describe, expect, it } from 'vitest';
import { BET_ARITY, BET_TYPES, INSIDE_BET_TYPES, isBetType, isInsideBetType, zoneKey } from './bet';

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
