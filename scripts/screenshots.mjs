// Takes acceptance screenshots [З]: starts the Vite dev server, drives headless Chrome over the
// DevTools protocol (Node's built-in WebSocket, no extra deps) with real mouse events, saves PNGs.
// Usage: npm run screenshots
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VITE_PORT = 5199;
const CDP_PORT = 9333;
const OUT = 'screenshots';
const VIEWPORT = { width: 980, height: 560, deviceScaleFactor: 2 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function startVite() {
  const proc = spawn('npx', ['vite', '--port', String(VITE_PORT), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('vite did not start')), 20000);
    proc.stdout.on('data', (d) => {
      if (String(d).includes(`${VITE_PORT}`)) { clearTimeout(timer); resolve(proc); }
    });
    proc.on('exit', (code) => reject(new Error(`vite exited ${code}`)));
  });
}

async function startChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'roulette-chrome-'));
  const proc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank',
  ], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return { proc, profile, wsUrl: page.webSocketDebuggerUrl };
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('chrome did not start');
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(String(ev.data));
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
  return new Promise((resolve) => ws.addEventListener('open', () => resolve({ send, close: () => ws.close() })));
}

async function evaluate(cdp, expression) {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  return r.result.value;
}

async function shot(cdp, name) {
  await sleep(150); // let Pixi render the frame after the last event
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, name), Buffer.from(data, 'base64'));
  console.log(`saved ${OUT}/${name}`);
}

async function hover(cdp, zoneId) {
  const p = await evaluate(cdp, `window.__roulette.zoneClientPoint(${JSON.stringify(zoneId)})`);
  if (!p) throw new Error(`zone ${zoneId} not found`);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y });
}

const vite = await startVite();
const chrome = await startChrome();
try {
  mkdirSync(OUT, { recursive: true });
  const cdp = await connect(chrome.wsUrl);
  await cdp.send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, mobile: false });
  await cdp.send('Page.navigate', { url: `http://localhost:${VITE_PORT}/` });
  for (let i = 0; i < 100 && (await evaluate(cdp, 'document.body.dataset.ready')) !== '1'; i++) await sleep(100);

  await shot(cdp, '01-empty-table.png');
  await hover(cdp, 'corner:32-33-35-36');
  await shot(cdp, '02-hover-corner-32-33-35-36.png');
  await hover(cdp, 'split:0-1');
  await shot(cdp, '03-hover-split-0-1.png');
  await hover(cdp, 'line:1-2-3-4-5-6');
  await shot(cdp, '04-hover-line-1-6.png');
  await hover(cdp, 'dozen:13-14-15-16-17-18-19-20-21-22-23-24');
  await shot(cdp, '05-hover-dozen-2nd12.png');
  cdp.close();
} finally {
  chrome.proc.kill();
  vite.kill();
  await sleep(300);
  rmSync(chrome.profile, { recursive: true, force: true });
}
