import { describe, expect, it } from 'vitest';
import type { TableLayout } from '../config/table';
import { buildTable } from './buildTable';
import { hitTest } from './hitTest';
import { TEST_LAYOUTS } from './testLayouts';
import type { Zone } from './types';

// Nominal table lines from the layout semantics: zero | 12 columns | column bets; 3 rows | dozens | outside.
function lines(l: TableLayout) {
  const Z = l.zeroW, W = l.cell.w, H = l.cell.h, half = l.stripe / 2;
  return {
    Z, W, H, half,
    colLeft: (c: number) => Z + c * W, // c = 0..12
    colMid: (c: number) => Z + c * W + W / 2,
    rowTop: (r: number) => r * H, // r = 0..3
    rowMid: (r: number) => r * H + H / 2,
    gridBottom: 3 * H,
    dozenMid: 3 * H + l.dozenH / 2,
    outsideMid: 3 * H + l.dozenH + l.outsideH / 2,
    columnBetMid: Z + 12 * W + l.columnBetW / 2,
  };
}

const at = (zones: readonly Zone[], x: number, y: number): string | null => hitTest(zones, x, y)?.id ?? null;

describe.each(TEST_LAYOUTS)('hitTest (%s)', (_name, layout) => {
  const { zones, width, height } = buildTable(layout);
  const L = lines(layout);

  describe('required cases [З]', () => {
    it('corner 32/33/35/36 at the crossing of the column 10|11 edge and the row 0|1 edge', () => {
      // 33, 36 in the top row; 32, 35 in the middle row; columns 10 and 11.
      expect(hitTest(zones, L.colLeft(11), L.rowTop(1))?.numbers).toEqual([32, 33, 35, 36]);
      expect(hitTest(zones, L.colLeft(11), L.rowTop(1))?.type).toBe('corner');
    });

    it('split 0/1 on the zero edge of the bottom row', () => {
      const z = hitTest(zones, L.colLeft(0), L.rowMid(2));
      expect(z?.type).toBe('split');
      expect(z?.numbers).toEqual([0, 1]);
    });

    it('line 1-6 on the bottom edge between the first two columns', () => {
      const z = hitTest(zones, L.colLeft(1), L.gridBottom);
      expect(z?.type).toBe('line');
      expect(z?.numbers).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  it('grid order: top row 3…36, middle 2…35, bottom 1…34; zero left; columns right', () => {
    const rowAt = (r: number) => Array.from({ length: 12 }, (_, c) => hitTest(zones, L.colMid(c), L.rowMid(r))?.numbers[0]);
    expect(rowAt(0)).toEqual([3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]);
    expect(rowAt(1)).toEqual([2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35]);
    expect(rowAt(2)).toEqual([1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]);
    for (const r of [0, 1, 2]) expect(at(zones, L.Z / 2, L.rowMid(r))).toBe('straight:0');
    expect([0, 1, 2].map((r) => hitTest(zones, L.columnBetMid, L.rowMid(r))?.numbers[0])).toEqual([3, 2, 1]);
  });

  it('outside rows: 1st12 2nd12 3rd12, then 1-18 EVEN red black ODD 19-36 [У§1]', () => {
    expect([0, 1, 2].map((k) => hitTest(zones, L.colMid(4 * k + 1.5), L.dozenMid)?.numbers[0])).toEqual([1, 13, 25]);
    expect([0, 1, 2, 3, 4, 5].map((k) => hitTest(zones, L.colLeft(2 * k + 1), L.outsideMid)?.type)).toEqual(
      ['low', 'even', 'red', 'black', 'odd', 'high'],
    );
  });

  it('centre and points 1 px inside every edge and corner give the same zone [З]', () => {
    const bad: string[] = [];
    for (const z of zones) {
      const { x, y, w, h } = z.rect;
      const cx = x + w / 2, cy = y + h / 2;
      const probes: Array<[number, number]> = [
        [cx, cy],
        [x + 1, cy], [x + w - 1, cy], [cx, y + 1], [cx, y + h - 1],
        [x + 1, y + 1], [x + w - 1, y + 1], [x + 1, y + h - 1], [x + w - 1, y + h - 1],
        [x, y], // half-open: the top-left edge belongs to the zone
      ];
      for (const [px, py] of probes) if (at(zones, px, py) !== z.id) bad.push(`${z.id} @ (${px}, ${py}) → ${at(zones, px, py)}`);
    }
    expect(bad).toEqual([]);
  });

  it('on the number | split boundary the split wins; the band is exactly `stripe` wide [З]', () => {
    const bad: string[] = [];
    const { half } = L;
    // Every vertical edge (incl. zero | first column), probed at each row's middle.
    for (let c = 0; c < 12; c++) {
      for (let r = 0; r < 3; r++) {
        const edge = L.colLeft(c), y = L.rowMid(r);
        const split = hitTest(zones, edge, y);
        if (split?.type !== 'split') { bad.push(`v-edge c=${c} r=${r}: ${split?.id}`); continue; }
        for (const dx of [-half, -1, 0, 1, half - 1]) if (at(zones, edge + dx, y) !== split.id) bad.push(`v c=${c} r=${r} dx=${dx}`);
        if (hitTest(zones, edge - half - 1, y)?.type !== 'straight') bad.push(`v c=${c} r=${r} left of band`);
        if (hitTest(zones, edge + half, y)?.type !== 'straight') bad.push(`v c=${c} r=${r} right of band`);
      }
    }
    // Every horizontal inner edge, probed at each column's middle.
    for (let r = 1; r < 3; r++) {
      for (let c = 0; c < 12; c++) {
        const edge = L.rowTop(r), x = L.colMid(c);
        const split = hitTest(zones, x, edge);
        if (split?.type !== 'split') { bad.push(`h-edge r=${r} c=${c}: ${split?.id}`); continue; }
        for (const dy of [-half, -1, 0, 1, half - 1]) if (at(zones, x, edge + dy) !== split.id) bad.push(`h r=${r} c=${c} dy=${dy}`);
        if (hitTest(zones, x, edge - half - 1)?.type !== 'straight') bad.push(`h r=${r} c=${c} above band`);
        if (hitTest(zones, x, edge + half)?.type !== 'straight') bad.push(`h r=${r} c=${c} below band`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('on the grid | dozen boundary the street wins over both the number and the dozen', () => {
    const { half } = L;
    for (let c = 0; c < 12; c++) {
      const x = L.colMid(c), edge = L.gridBottom;
      const streetId = `street:${3 * c + 1}-${3 * c + 2}-${3 * c + 3}`;
      for (const dy of [-half, -1, 0, 1, half - 1]) expect(at(zones, x, edge + dy), `c=${c} dy=${dy}`).toBe(streetId);
      expect(at(zones, x, edge - half - 1)).toBe(`straight:${3 * c + 1}`);
      expect(hitTest(zones, x, edge + half)?.type).toBe('dozen');
    }
  });

  it('corners own the crossing of inner edges; lines own bottom-edge crossings', () => {
    for (let r = 1; r < 3; r++) for (let c = 1; c < 12; c++) {
      expect(hitTest(zones, L.colLeft(c), L.rowTop(r))?.type, `corner r=${r} c=${c}`).toBe('corner');
    }
    for (let c = 1; c < 12; c++) expect(hitTest(zones, L.colLeft(c), L.gridBottom)?.type, `line c=${c}`).toBe('line');
  });

  it('zero | grid crossings (0/1/2, 0/2/3, 0/1/2/3) have no zone', () => {
    for (const y of [L.rowTop(1), L.rowTop(2), L.gridBottom]) {
      for (const [dx, dy] of [[0, 0], [-L.half, -L.half], [L.half - 1, L.half - 1]] as const) {
        expect(at(zones, L.colLeft(0) + dx, y + dy), `y=${y} d=(${dx},${dy})`).toBeNull();
      }
    }
  });

  it('full coverage: every pixel of the table is in exactly one zone, except the designated empty areas', () => {
    const inDead = (x: number, y: number): boolean => {
      const nearZeroEdge = x >= L.colLeft(0) - L.half && x < L.colLeft(0) + L.half;
      const nearRowEdge = [L.rowTop(1), L.rowTop(2), L.gridBottom].some((e) => y >= e - L.half && y < e + L.half);
      const underZero = x < L.colLeft(0) && y >= L.gridBottom;
      const underColumnBets = x >= L.colLeft(12) && y >= L.gridBottom;
      return (nearZeroEdge && nearRowEdge) || underZero || underColumnBets;
    };
    const problems: string[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let hits = 0;
        for (const z of zones) {
          const r = z.rect;
          if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) hits++;
        }
        const expected = inDead(x, y) ? 0 : 1;
        if (hits !== expected && problems.length < 20) problems.push(`(${x}, ${y}): ${hits} zones, expected ${expected}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('outside the table, NaN and Infinity → null', () => {
    expect(hitTest(zones, -1, 10)).toBeNull();
    expect(hitTest(zones, 10, -1)).toBeNull();
    expect(hitTest(zones, width, 10)).toBeNull();
    expect(hitTest(zones, 10, height)).toBeNull();
    expect(hitTest(zones, Number.NaN, 10)).toBeNull();
    expect(hitTest(zones, 10, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('labels name the bet for the tooltip', () => {
    expect(hitTest(zones, L.colLeft(11), L.rowTop(1))?.label).toBe('Corner 32/33/35/36');
    expect(hitTest(zones, L.colLeft(0), L.rowMid(2))?.label).toBe('Split 0/1');
    expect(hitTest(zones, L.colLeft(1), L.gridBottom)?.label).toBe('Line 1-6');
    expect(hitTest(zones, L.colMid(0), L.gridBottom)?.label).toBe('Street 1/2/3');
    expect(hitTest(zones, L.colMid(0), L.dozenMid)?.label).toBe('1st12 (1-12)');
    expect(hitTest(zones, L.columnBetMid, L.rowMid(2))?.label).toBe('Column 1st 2 to 1 (1, 4 … 34)');
    expect(hitTest(zones, L.colLeft(1), L.outsideMid)?.label).toBe('Low 1-18');
  });
});
