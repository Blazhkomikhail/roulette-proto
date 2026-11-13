import { Container, Graphics, Text } from 'pixi.js';
import type { CellFill, VisualTable } from '../geometry/visualCells';
import { THEME } from './theme';

const FILL: Record<CellFill, number> = { zero: THEME.zero, red: THEME.red, black: THEME.black, felt: THEME.felt };

/** Static table drawing: cell fills, grid lines, captions, red/black diamonds. */
export function createTableView(visual: VisualTable): Container {
  const root = new Container({ label: 'table' });
  const g = new Graphics();
  root.addChild(g);

  for (const cell of visual.cells) {
    const { x, y, w, h } = cell.rect;
    g.rect(x, y, w, h).fill(FILL[cell.fill]);
  }
  for (const cell of visual.cells) {
    if (!cell.diamond) continue;
    const { x, y, w, h } = cell.rect;
    const cx = x + w / 2, cy = y + h / 2, rx = Math.min(w * 0.28, h * 0.7), ry = h * 0.32;
    g.poly([cx - rx, cy, cx, cy - ry, cx + rx, cy, cx, cy + ry]).fill(cell.diamond === 'red' ? THEME.red : THEME.black);
    g.stroke({ width: 1.5, color: THEME.line });
  }
  for (const cell of visual.cells) {
    const { x, y, w, h } = cell.rect;
    g.rect(x, y, w, h).stroke({ width: THEME.lineWidth, color: THEME.line, alignment: 0.5 });
  }

  for (const cell of visual.cells) {
    if (!cell.caption) continue;
    const isNumber = cell.key.startsWith('number:');
    const text = new Text({
      text: cell.caption,
      style: {
        fontFamily: THEME.font,
        fontSize: isNumber ? THEME.numberFontSize : THEME.captionFontSize,
        fontWeight: isNumber ? '700' : '600',
        fill: THEME.text,
      },
    });
    text.anchor.set(0.5);
    text.position.set(cell.rect.x + cell.rect.w / 2, cell.rect.y + cell.rect.h / 2);
    root.addChild(text);
  }
  return root;
}
