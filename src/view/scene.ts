import { Container, type Application } from 'pixi.js';
import type { TableGeometry, Zone } from '../geometry/types';
import type { VisualTable } from '../geometry/visualCells';
import { ChipStacksView } from './chipStacksView';
import { HighlightView } from './highlightView';
import { bindTableInput } from './tableInput';
import { createTableView } from './tableView';
import { THEME } from './theme';
import { TooltipView } from './tooltipView';

export interface Scene {
  /** Table container; its local space is the geometry's coordinate space. */
  readonly table: Container;
  readonly chips: ChipStacksView;
}

/** Canvas size needed for the tooltip strip + table + padding. */
export function sceneSize(visual: VisualTable): { width: number; height: number } {
  const p = THEME.padding;
  return { width: visual.width + 2 * p, height: THEME.tooltip.height + p + visual.height + 2 * p };
}

export function mountScene(
  app: Application,
  geometry: TableGeometry,
  visual: VisualTable,
  onPress: (zone: Zone, e: { button: number; shiftKey: boolean }) => void,
): Scene {
  const p = THEME.padding;

  const tooltip = new TooltipView(visual.width);
  tooltip.container.position.set(p, p);

  const table = new Container({ label: 'table-root' });
  table.position.set(p, p + THEME.tooltip.height + p);
  const highlight = new HighlightView(visual);
  const chips = new ChipStacksView(geometry.zones, visual);
  table.addChild(createTableView(visual), highlight.container, chips.container);

  bindTableInput(table, geometry.zones, geometry, {
    onHover(zone: Zone | null) {
      highlight.show(zone);
      tooltip.show(zone?.label ?? null);
    },
    onPress,
  });

  app.stage.addChild(tooltip.container, table);
  return { table, chips };
}
