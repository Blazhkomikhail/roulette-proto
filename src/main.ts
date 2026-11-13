import { Application } from 'pixi.js';
import { buildTable } from './geometry/buildTable';
import { buildVisualTable } from './geometry/visualCells';
import { Slip } from './model/slip';
import { pointerAction, TableController } from './view/controller';
import { createControls } from './view/controls';
import { mountScene, sceneSize } from './view/scene';
import { THEME } from './view/theme';

async function main(): Promise<void> {
  const tableHost = document.getElementById('table-host');
  const controlsHost = document.getElementById('controls');
  if (!tableHost || !controlsHost) throw new Error('#table-host / #controls not found');

  const geometry = buildTable();
  const visual = buildVisualTable();
  const size = sceneSize(visual);

  const app = new Application();
  await app.init({
    ...size,
    background: THEME.pageBackground,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  app.canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // right click removes a chip
  tableHost.appendChild(app.canvas);

  const slip = new Slip();
  let controller: TableController | null = null;
  const scene = mountScene(app, geometry, visual, (zone, e) => {
    const action = pointerAction(e);
    if (action && controller) controller.pointerOnZone({ type: zone.type, numbers: zone.numbers }, action);
  });
  const controls = createControls(controlsHost, {
    selectChip: (chip) => controller?.selectChip(chip),
    clear: () => controller?.clear(),
    undo: () => controller?.undo(),
    double: () => controller?.double(),
  });
  controller = new TableController(slip, {
    renderSlip: (state) => scene.chips.render(state),
    renderStatus: (status) => controls.render(status),
  });
  controller.start();

  // Dev-only hooks for scripts/screenshots.mjs.
  if (import.meta.env.DEV) {
    Object.assign(window, {
      __roulette: {
        /** Page (CSS px) coordinates of a zone's centre. */
        zoneClientPoint(id: string): { x: number; y: number } | null {
          const zone = geometry.zones.find((z) => z.id === id);
          if (!zone) return null;
          const { x, y, w, h } = zone.rect;
          const global = scene.table.toGlobal({ x: x + w / 2, y: y + h / 2 });
          const canvasRect = app.canvas.getBoundingClientRect();
          return { x: canvasRect.left + global.x, y: canvasRect.top + global.y };
        },
        toBets: () => slip.toBets(),
        totalStakeMinor: () => slip.totalStakeMinor(),
      },
    });
  }
  document.body.dataset.ready = '1';
}

void main();
