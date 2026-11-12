import type { BetType } from '../shared/bet';
import { LABELS } from '../config/table';

const ORDINAL = ['1st', '2nd', '3rd'] as const;

/** Tooltip name of a bet. `numbers` must be ascending. */
export function zoneLabel(type: BetType, numbers: readonly number[]): string {
  const first = numbers[0];
  const last = numbers[numbers.length - 1];
  switch (type) {
    case 'straight': return `Straight ${first}`;
    case 'split': return `Split ${numbers.join('/')}`;
    case 'street': return `Street ${numbers.join('/')}`;
    case 'corner': return `Corner ${numbers.join('/')}`;
    case 'line': return `Line ${first}-${last}`;
    case 'column': {
      // Columns start at 1, 2 or 3 (bottom, middle, top row).
      const ord = ORDINAL[(first ?? 1) - 1] ?? '?';
      return `Column ${ord} ${LABELS.column} (${first}, ${numbers[1]} … ${last})`;
    }
    case 'dozen': {
      const idx = Math.floor(((first ?? 1) - 1) / 12);
      return `${LABELS.dozen[idx] ?? 'Dozen'} (${first}-${last})`;
    }
    case 'red': return 'Red';
    case 'black': return 'Black';
    case 'odd': return 'Odd';
    case 'even': return 'Even';
    case 'low': return `Low ${LABELS.low}`;
    case 'high': return `High ${LABELS.high}`;
  }
}
