import { Application } from 'pixi.js';
import { buildTable } from './geometry/buildTable';
import { buildVisualTable } from './geometry/visualCells';
import { mountScene, sceneSize } from './view/scene';
import { THEME } from './view/theme';

async function main(): Promise<void> {
  const host = document.getElementById('table-host');
  if (!host) {
    throw new Error('#table-host not found');
  }
  
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
  app.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  host.appendChild(app.canvas);

  const scene = mountScene(app, geometry, visual);

  // Dev-only hook for scripts/screenshots.mjs: page (CSS px) coordinates of a zone's centre.
  if (import.meta.env.DEV) {
    Object.assign(window, {
      __roulette: {
        zoneClientPoint(id: string): { x: number; y: number } | null {
          const zone = geometry.zones.find((z) => z.id === id);
          if (!zone) return null;
          const { x, y, w, h } = zone.rect;
          const global = scene.table.toGlobal({ x: x + w / 2, y: y + h / 2 });
          const canvasRect = app.canvas.getBoundingClientRect();
          return { x: canvasRect.left + global.x, y: canvasRect.top + global.y };
        },
      },
    });
  }
  document.body.dataset.ready = '1';
}

void main();
