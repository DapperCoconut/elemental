import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

/**
 * Menu screenshot harness (scratch tool, not shipped).
 *
 *   node .shot-menu.mjs <SceneKey> '<init json>' <tag> [stepsFile]
 *
 * Boots the game, jumps to the scene, steps frames deterministically and screenshots
 * `<tag>-0.png`. A steps file is JSON: [{ js: "...", frames: 40, tag: "x" }, ...] — each
 * step runs `js` with `sc` bound to the scene, steps that many frames, and screenshots.
 */
const DIR = '/tmp/claude-1000/-home-kids-dev-elemental/8479968e-3f00-44a8-b808-87c3cc8ef1ce/scratchpad';
const URL = process.env.URL ?? 'http://localhost:5174';
const SCENE = process.argv[2] ?? 'ShopScene';
const DATA = JSON.parse(process.argv[3] ?? '{}');
const TAG = process.argv[4] ?? SCENE;
const STEPS = process.argv[5] ? JSON.parse(fs.readFileSync(process.argv[5], 'utf8')) : [];

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push('ERR ' + m.text()); });
page.on('pageerror', (e) => errors.push('EXC ' + e.message + '\n' + (e.stack ?? '').split('\n').slice(0, 5).join('\n')));

const client = await page.target().createCDPSession();
await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
try { await client.send('Page.setWebLifecycleState', { state: 'active' }); } catch {}
await page.bringToFront();
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.bringToFront();
await page.waitForFunction(() => window.game?.loop?.frame > 0, { timeout: 20000 });
await page.waitForFunction(() => window.game.scene.getScenes(true).some((s) => s.scene.key !== 'BootScene'), { timeout: 20000 });
await new Promise((r) => setTimeout(r, 600));

// Take the clock away from RAF: our steps are the only frames from here on, and delta
// smoothing is off so each one is exactly 16ms.
// Tweens (3.60+) run on Date.now(), not the loop, so the wall clock is slaved to the fake one too.
await page.evaluate(() => {
  window.game.loop.raf.stop(); window.game.loop.smoothStep = false; window.__t = window.game.loop.now;
  const t0 = window.__t; const d0 = Date.now();
  Date.now = () => d0 + (window.__t - t0);
});
const step = (n) => page.evaluate((n) => {
  for (let i = 0; i < n; i++) { window.__t += 16; window.game.loop.step(window.__t); }
}, n);

await page.evaluate((scene, data) => {
  const sc = window.game.scene.getScenes(true)[0];
  sc.scene.start(scene, data);
}, SCENE, DATA);
await step(40);
await page.screenshot({ path: `${DIR}/${TAG}-0.png` });

let i = 1;
for (const s of STEPS) {
  if (s.js) {
    await page.evaluate((code) => {
      const sc = window.game.scene.getScene(code.scene);
      return (new Function('sc', code.js))(sc);
    }, { scene: SCENE, js: s.js });
  }
  await step(s.frames ?? 40);
  await page.screenshot({ path: `${DIR}/${TAG}-${s.tag ?? i}.png` });
  i++;
}

console.log('scenes', await page.evaluate(() => window.game.scene.getScenes(true).map((s) => s.scene.key)));
console.log(errors.length ? errors.join('\n') : 'no page errors');
await page.close();
await browser.disconnect();
