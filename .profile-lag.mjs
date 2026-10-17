import puppeteer from 'puppeteer-core';
import fs from 'fs';
const URL = process.env.URL ?? 'http://localhost:5173';
const P = process.env.P ?? 'fire', N = process.env.N ?? 'water';
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGE EXC', e.message));
const client = await page.target().createCDPSession();
await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
try { await client.send('Page.setWebLifecycleState', { state: 'active' }); } catch {}
await page.bringToFront();
await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => window.game && window.game.loop.frame > 5, { timeout: 60000 });
await new Promise((r) => setTimeout(r, 2000));
const ev = (fn, ...a) => page.evaluate(fn, ...a);
await ev((P, N) => {
  for (const s of window.game.scene.getScenes(true)) window.game.scene.stop(s.sys.settings.key);
  window.game.scene.start('ArenaScene', { elementId: P, enemyElementId: N, difficulty: 2 });
}, P, N);
await new Promise((r) => setTimeout(r, 2500));
// Split per-frame cost into scene update vs render.
const res = await ev(() => {
  const g = window.game; const sc = g.scene.getScene('ArenaScene');
  const origUpd = sc.update.bind(sc); let upd = 0;
  sc.update = (t, d) => { const a = performance.now(); origUpd(t, d); upd += performance.now() - a; };
  const r = g.renderer; const origRender = r.render ? null : null;
  let t = performance.now(); window.__t = t;
  const a = performance.now();
  for (let i = 0; i < 300; i++) { window.__t += 16.6; g.loop.step(window.__t); }
  const total = performance.now() - a;
  sc.update = origUpd;
  const objs = sc.children.list.length;
  const gfx = sc.children.list.filter(o => o.type === 'Graphics').length;
  return { msPerFrame: total / 300, updateMs: upd / 300, displayObjects: objs, graphics: gfx, renderer: g.renderer.type === 2 ? 'WebGL' : 'Canvas' };
});
console.log(JSON.stringify(res));
await client.send('Profiler.enable');
await client.send('Profiler.setSamplingInterval', { interval: 200 });
await client.send('Profiler.start');
await ev(() => { const g = window.game; for (let i = 0; i < 300; i++) { window.__t += 16.6; g.loop.step(window.__t); } });
const { profile } = await client.send('Profiler.stop');
const self = new Map(); const byId = new Map(profile.nodes.map(n => [n.id, n]));
const counts = new Map(); for (const s of profile.samples) counts.set(s, (counts.get(s) ?? 0) + 1);
let tot = 0;
for (const [id, c] of counts) { const n = byId.get(id); const cf = n.callFrame; const k = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop().split('?')[0]}:${cf.lineNumber + 1}`; self.set(k, (self.get(k) ?? 0) + c); tot += c; }
const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, 30);
for (const [k, c] of top) console.log((100 * c / tot).toFixed(1).padStart(5) + '%  ' + k);
// per-file totals
const files = new Map();
for (const [id, c] of counts) { const f = byId.get(id).callFrame.url.split('/').pop().split('?')[0] || '(native)'; files.set(f, (files.get(f) ?? 0) + c); }
console.log('--- by file');
for (const [k, c] of [...files].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log((100 * c / tot).toFixed(1).padStart(5) + '%  ' + k);
await page.close(); await browser.disconnect();
