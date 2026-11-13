// Table data. Geometry is generated from this; no per-zone coordinates live anywhere [З].
// Grid: column c = 0..11 (left to right), row r = 0..2 (top to bottom); number n = 3c + 3 − r.
// Top row 3, 6, …, 36; middle 2, 5, …, 35; bottom 1, 4, …, 34 [CLAUDE.md §3].

/** Layout sizes in logical px. The grid shape (3 × 12) is fixed by the game, so it is typed as literals. */
export interface TableLayout {
  readonly cols: 12;
  readonly rows: 3;
  readonly cell: { readonly w: number; readonly h: number };
  readonly zeroW: number;
  readonly columnBetW: number;
  readonly dozenH: number;
  readonly outsideH: number;
  readonly stripe: number;
}

export const TABLE: TableLayout = {
  cols: 12,
  rows: 3,
  /** Number cell size, logical px. */
  cell: { w: 60, h: 72 },
  /** Zero spans all three rows on the left. */
  zeroW: 60,
  /** "2 to 1" column bets on the right, one per row. */
  columnBetW: 60,
  /** Dozens row under the grid (each dozen spans 4 columns). */
  dozenH: 48,
  /** Even-money row under the dozens (each spans 2 columns). */
  outsideH: 48,
  /** Thickness of clickable split/street/corner/line bands, logical px. Even, so it halves exactly [Д]. */
  stripe: 12,
};

/** Red numbers [CLAUDE.md §3]. Black = the other numbers 1..36. */
export const RED_NUMBERS: readonly number[] = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

/** Left-to-right order of the even-money row under the dozens, as on the reference */
export const OUTSIDE_ORDER = ['low', 'even', 'red', 'black', 'odd', 'high'] as const;

/** Zone captions drawn on the table, as on the reference. Red/black are drawn as colour, not text. */
export const LABELS = {
  dozen: ['1st12', '2nd12', '3rd12'],
  column: '2 to 1',
  low: '1-18',
  high: '19-36',
  even: 'EVEN',
  odd: 'ODD',
} as const;
