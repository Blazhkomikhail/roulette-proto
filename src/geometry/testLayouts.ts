// Layouts used by geometry tests. The second one has different sizes and stripe on purpose:
// every invariant must hold for any valid config, not only for the shipped one.
import { TABLE, type TableLayout } from '../config/table';

export const ALT_LAYOUT: TableLayout = {
  cols: 12, rows: 3,
  cell: { w: 50, h: 46 },
  zeroW: 40, columnBetW: 44,
  dozenH: 30, outsideH: 36,
  stripe: 8,
};

export const TEST_LAYOUTS: ReadonlyArray<readonly [string, TableLayout]> = [
  ['shipped TABLE', TABLE],
  ['ALT_LAYOUT', ALT_LAYOUT],
];
