import puppeteer from 'puppeteer-core';
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE EXC', e.message, (e.stack || '').split('\n').slice(1, 4).join(' | ')); });
page.on('console', (m) => { if (m.type() === 'error') { errors.push(m.text()); console.log('CONSOLE', m.text().slice(0, 300)); } });
const client = await page.target().createCDPSession();
await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
try { await client.send('Page.setWebLifecycleState', { state: 'active' }); } catch {}
await page.bringToFront();
await page.goto('http://localhost:5173', { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => window.game && window.game.loop.frame > 5, { timeout: 60000 });
await page.bringToFront();
await new Promise((r) => setTimeout(r, 1500));
const ev = (fn, ...a) => page.evaluate(fn, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await ev(() => { for (const s of window.game.scene.getScenes(true)) window.game.scene.stop(s.sys.settings.key); window.game.scene.start('MenuScene'); });
await sleep(1500);
await ev(() => { window.game.loop.sleep(); window.__t = performance.now(); });
const step = (n) => ev((n) => { for (let i = 0; i < n; i++) { window.__t += 16; window.game.loop.step(window.__t); } }, n);
const sel = [
  { kind: 'ability', id: 'tempest-gale' }, { kind: 'ability', id: 'tempest-kick' }, { kind: 'ability', id: 'tempest-front' },
  { kind: 'ability', id: 'tempest-updraft' }, { kind: 'ability', id: 'tempest-forecast' }, { kind: 'passive', index: 0 }, { kind: 'passive', index: 1 },
];
for (const s of sel) {
  const before = errors.length;
  await ev((s) => { const sc = window.game.scene.getScene('MenuScene'); const p = sc.panels; p.infoSelected = s; p.showElementInfo('tempest', sc.scale.width, sc.scale.height, sc.scale.width / 2); }, s);
  // Run the loop for 18s of script time so every ctx.at fires at least once (longest is 16s).
  for (let i = 0; i < 20; i++) await step(50);
  const has = await ev(() => { const sc = window.game.scene.getScene('MenuScene'); return !!sc.panels.infoPreview; });
  console.log(errors.length === before ? '  ✓' : '  ✗', JSON.stringify(s), has ? 'preview box built' : 'NO PREVIEW BOX');
  if (s.id === 'tempest-forecast') { await step(0); await page.screenshot({ path: '/tmp/claude-1000/-home-kids-dev-elemental/d299bfcc-47a5-4713-abd4-d5f70d9f634f/scratchpad/tempest-codex.png' }); }
}
console.log(`page errors: ${errors.length}`);
await page.close(); await browser.disconnect();
