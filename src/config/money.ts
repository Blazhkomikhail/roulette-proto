// Single source for the money unit, chip denominations and limits [У§2].
// Kup = credits the player sees; minor units = Kup × MINOR_PER_KUP, stored in the slip.

export const MINOR_PER_KUP = 100;

export const PER_NUMBER_LIMIT_KUP = 100;
export const TOTAL_LIMIT_KUP = 1000;

export const CHIP_DENOMINATIONS_KUP = [1, 5, 10, 25, 100] as const;
export type ChipKup = (typeof CHIP_DENOMINATIONS_KUP)[number];

export const PER_NUMBER_LIMIT_MINOR = PER_NUMBER_LIMIT_KUP * MINOR_PER_KUP; // 10000
export const TOTAL_LIMIT_MINOR = TOTAL_LIMIT_KUP * MINOR_PER_KUP; // 100000

export const CURRENCY_LABEL = 'Kup';
