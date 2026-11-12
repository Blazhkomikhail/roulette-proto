// Checks that a bet target is a real roulette bet: known type, numbers in 0..36, right count,
// and the right shape for the type (adjacent split, 2×2 corner, …). Pure arithmetic on numbers:
// these are game rules, independent of how the table is drawn.

import { RED_NUMBERS } from '../config/table';
import { BET_ARITY, isBetType, type BetTarget, type BetType } from '../shared/bet';

const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const sameColumnOfGrid = (a: number, b: number): boolean => Math.ceil(a / 3) === Math.ceil(b / 3);
const equals = (a: readonly number[], b: readonly number[]): boolean => a.length === b.length && a.every((v, i) => v === b[i]);

function shapeOk(type: BetType, n: readonly number[]): boolean {
  const a = n[0] ?? -1;
  const b = n[1] ?? -1;
  switch (type) {
    case 'straight': return true;
    case 'split':
      if (a === 0) return b >= 1 && b <= 3; // 0/1, 0/2, 0/3
      return b - a === 3 || (b - a === 1 && sameColumnOfGrid(a, b));
    case 'street': return a % 3 === 1 && equals(n, range(a, a + 2));
    case 'corner': return a >= 1 && a % 3 !== 0 && equals(n, [a, a + 1, a + 3, a + 4]);
    case 'line': return a % 3 === 1 && equals(n, range(a, a + 5));
    case 'column': return n.every((v) => v >= 1 && v % 3 === a % 3);
    case 'dozen': return (a === 1 || a === 13 || a === 25) && equals(n, range(a, a + 11));
    case 'low': return equals(n, range(1, 18));
    case 'high': return equals(n, range(19, 36));
    case 'odd': return equals(n, range(1, 36).filter((v) => v % 2 === 1));
    case 'even': return equals(n, range(1, 36).filter((v) => v % 2 === 0));
    case 'red': return equals(n, RED_NUMBERS);
    case 'black': return equals(n, range(1, 36).filter((v) => !RED_NUMBERS.includes(v)));
  }
}

export type TargetCheck =
  | { readonly ok: true; readonly target: BetTarget }
  | { readonly ok: false; readonly message: string };

/** Validates and normalises (numbers sorted ascending, copied, frozen). Never mutates the input. */
export function validateTarget(input: unknown): TargetCheck {
  if (typeof input !== 'object' || input === null) return { ok: false, message: 'bet target must be an object' };
  const { type, numbers } = input as { type?: unknown; numbers?: unknown };
  if (!isBetType(type)) return { ok: false, message: `unknown bet type "${String(type)}"` };
  if (!Array.isArray(numbers)) return { ok: false, message: `${type}: numbers must be an array` };
  if (!numbers.every((v) => Number.isInteger(v) && v >= 0 && v <= 36)) {
    return { ok: false, message: `${type}: numbers must be integers 0..36` };
  }
  const sorted = [...(numbers as number[])].sort((x, y) => x - y);
  if (new Set(sorted).size !== sorted.length) return { ok: false, message: `${type}: duplicate numbers` };
  if (sorted.length !== BET_ARITY[type]) {
    return { ok: false, message: `${type}: expected ${BET_ARITY[type]} numbers, got ${sorted.length}` };
  }
  if (type !== 'straight' && type !== 'split' && sorted.includes(0)) {
    return { ok: false, message: `${type}: zero is not allowed` };
  }
  if (!shapeOk(type, sorted)) return { ok: false, message: `${type} ${sorted.join('/')} is not a valid bet` };
  return { ok: true, target: Object.freeze({ type, numbers: Object.freeze(sorted) }) };
}
