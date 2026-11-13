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
const VIEWPORT = { width: 980, height: 680, deviceScaleFactor: 2 };

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
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log(`[page console.${msg.params.type}] ${msg.params.args.map((a) => a.value).join(' ')}`);
    }
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

async function click(cdp, x, y, { button = 'left', shift = false } = {}) {
  const modifiers = shift ? 8 : 0;
  const buttons = button === 'right' ? 2 : 1;
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, modifiers });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button, buttons, clickCount: 1, modifiers });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button, buttons: 0, clickCount: 1, modifiers });
}

async function clickZone(cdp, zoneId, opts) {
  const p = await evaluate(cdp, `window.__roulette.zoneClientPoint(${JSON.stringify(zoneId)})`);
  if (!p) throw new Error(`zone ${zoneId} not found`);
  await click(cdp, p.x, p.y, opts);
}

async function clickSelector(cdp, selector) {
  const p = await evaluate(cdp, `(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  await click(cdp, p.x, p.y);
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

  // Table with bets: left clicks place chips, Shift+click and right click remove one.
  await cdp.send('Runtime.enable');
  await clickSelector(cdp, '[data-chip="25"]');
  await clickZone(cdp, 'straight:17');
  await clickZone(cdp, 'straight:17');
  await clickZone(cdp, 'corner:17-18-20-21');
  await clickSelector(cdp, '[data-chip="5"]');
  for (let i = 0; i < 3; i++) await clickZone(cdp, 'split:0-1');
  await clickZone(cdp, 'split:0-1', { shift: true }); // Shift+click removes one → 2 chips left
  await clickSelector(cdp, '[data-chip="10"]');
  await clickZone(cdp, 'line:1-2-3-4-5-6');
  await clickZone(cdp, 'street:13-14-15');
  await clickZone(cdp, 'corner:32-33-35-36');
  await clickZone(cdp, 'corner:32-33-35-36', { button: 'right' }); // right click removes it again
  await clickZone(cdp, 'corner:32-33-35-36');
  await clickSelector(cdp, '[data-chip="100"]');
  await clickZone(cdp, 'red:1-3-5-7-9-12-14-16-18-19-21-23-25-27-30-32-34-36');
  await clickZone(cdp, 'dozen:25-26-27-28-29-30-31-32-33-34-35-36');
  await clickSelector(cdp, '[data-chip="1"]');
  await clickZone(cdp, 'column:3-6-9-12-15-18-21-24-27-30-33-36');
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 }); // no hover
  await shot(cdp, '06-table-with-bets.png');
  console.log('bets:', JSON.stringify(await evaluate(cdp, 'window.__roulette.toBets()')));
  console.log('totalStakeMinor:', await evaluate(cdp, 'window.__roulette.totalStakeMinor()'));

  // Limit rejection: 50 + 25 (corner) already on 17; +100 would make 175 > 100.
  await clickSelector(cdp, '[data-chip="100"]');
  await clickZone(cdp, 'straight:17');
  await shot(cdp, '07-limit-rejected.png');
  cdp.close();
} finally {
  chrome.proc.kill();
  vite.kill();
  await sleep(300);
  rmSync(chrome.profile, { recursive: true, force: true });
}
