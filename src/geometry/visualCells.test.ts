import { describe, expect, it } from 'vitest';
import { RED_NUMBERS } from '../config/table';
import { buildTable } from './buildTable';
import { hitTest } from './hitTest';
import { TEST_LAYOUTS } from './testLayouts';
import { rectsOverlap } from './types';
import { buildVisualTable, drawnCellOf, zoneAnchor } from './visualCells';

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

describe('zoneAnchor / drawnCellOf', () => {
  const visual = buildVisualTable();
  const { zones } = buildTable();
  const byId = (id: string) => zones.find((z) => z.id === id)!;
  const centre = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

  it('numbers and the narrow "2 to 1" cells anchor at the centre of their drawn cell', () => {
    expect(zoneAnchor(byId('straight:17'), visual)).toEqual(centre(visual.numberCells.get(17)!));
    expect(zoneAnchor(byId('straight:0'), visual)).toEqual(centre(visual.numberCells.get(0)!));
    const col = visual.cells.find((c) => c.key === 'column:0')!;
    expect(zoneAnchor(byId('column:3-6-9-12-15-18-21-24-27-30-33-36'), visual)).toEqual(centre(col.rect));
  });

  it('wide captioned cells (dozens, even-money) anchor near the right edge, clear of the centred caption', () => {
    const inset = 22;
    const dozen2 = visual.cells.find((c) => c.key === 'dozen:2')!.rect;
    expect(zoneAnchor(byId('dozen:13-14-15-16-17-18-19-20-21-22-23-24'), visual, inset))
      .toEqual({ x: dozen2.x + dozen2.w - inset, y: dozen2.y + dozen2.h / 2 });
    const redCell = visual.cells.find((c) => c.key === 'outside:red')!.rect;
    expect(zoneAnchor(byId(`red:${RED_NUMBERS.join('-')}`), visual, inset))
      .toEqual({ x: redCell.x + redCell.w - inset, y: redCell.y + redCell.h / 2 });
  });

  it('bands anchor at their own centre, which lies on the edge between their numbers', () => {
    const corner = byId('corner:32-33-35-36');
    expect(drawnCellOf(corner, visual)).toBeNull();
    const n32 = visual.numberCells.get(32)!, n36 = visual.numberCells.get(36)!;
    // Corner point = shared corner of the 32 and 36 cells.
    expect(zoneAnchor(corner, visual)).toEqual({ x: n36.x, y: n32.y });
  });

  it('every anchor hits its own zone (chips sit on the bet they belong to)', () => {
    for (const z of zones) {
      const a = zoneAnchor(z, visual);
      expect(hitTest(zones, a.x, a.y)?.id, z.id).toBe(z.id);
    }
  });
});
