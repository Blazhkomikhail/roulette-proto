import { describe, expect, it } from 'vitest';
import { RED_NUMBERS } from '../config/table';
import { buildTable } from './buildTable';
import { hitTest } from './hitTest';
import { TEST_LAYOUTS } from './testLayouts';
import { rectsOverlap } from './types';
import { buildVisualTable } from './visualCells';

describe.each(TEST_LAYOUTS)('buildVisualTable (%s)', (_name, layout) => {
  const visual = buildVisualTable(layout);
  const { zones, width, height } = buildTable(layout);

  it('has the same size as the clickable table', () => {
    expect([visual.width, visual.height]).toEqual([width, height]);
  });

  it('draws 37 numbers + 3 columns + 3 dozens + 6 even-money cells, none overlapping', () => {
    expect(visual.cells).toHaveLength(49);
    for (let i = 0; i < visual.cells.length; i++) {
      for (let j = i + 1; j < visual.cells.length; j++) {
        expect(rectsOverlap(visual.cells[i]!.rect, visual.cells[j]!.rect), `${visual.cells[i]!.key} × ${visual.cells[j]!.key}`).toBe(false);
      }
    }
  });

  it('each number cell is drawn where clicking its centre bets on that number', () => {
    for (let n = 0; n <= 36; n++) {
      const r = visual.numberCells.get(n)!;
      const z = hitTest(zones, r.x + r.w / 2, r.y + r.h / 2);
      expect(z?.id, `number ${n}`).toBe(`straight:${n}`);
    }
  });

  it('colours: zero green, red numbers red, others black', () => {
    const fillOf = (n: number) => visual.cells.find((c) => c.key === `number:${n}`)?.fill;
    expect(fillOf(0)).toBe('zero');
    for (let n = 1; n <= 36; n++) expect(fillOf(n), `number ${n}`).toBe(RED_NUMBERS.includes(n) ? 'red' : 'black');
  });

  it('captions of the outside cells follow the reference order', () => {
    const captions = visual.cells.filter((c) => !c.key.startsWith('number:')).map((c) => c.caption || `<${c.diamond}>`);
    expect(captions).toEqual(['2 to 1', '2 to 1', '2 to 1', '1st12', '2nd12', '3rd12', '1-18', 'EVEN', '<red>', '<black>', 'ODD', '19-36']);
  });

  it('each outside cell is drawn over the zone of the same bet', () => {
    const expectType: Record<string, string> = {
      'column:0': 'column', 'dozen:1': 'dozen', 'outside:low': 'low', 'outside:red': 'red', 'outside:black': 'black', 'outside:high': 'high',
    };
    for (const [key, type] of Object.entries(expectType)) {
      const r = visual.cells.find((c) => c.key === key)!.rect;
      expect(hitTest(zones, r.x + r.w / 2, r.y + r.h / 2 + 1)?.type, key).toBe(type);
    }
  });
});
