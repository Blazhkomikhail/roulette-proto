import { Application } from 'pixi.js';

// Iteration 0: Pixi v8 bootstrap only. Table, zones and controls come in later iterations.
async function main(): Promise<void> {
  const host = document.getElementById('table-host');
  if (!host) throw new Error('#table-host not found');

  const app = new Application();
  await app.init({
    width: 1000,
    height: 420,
    background: '#1f5f3a',
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  host.appendChild(app.canvas);
}

void main();
