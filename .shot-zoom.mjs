import puppeteer from 'puppeteer-core';

const DIR = '/tmp/claude-1000/-home-kids-dev-elemental/82030937-c64a-4e36-b230-1512d600a139/scratchpad';
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGE EXC', e.message));
const client = await page.target().createCDPSession();
await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
try { await client.send('Page.setWebLifecycleState', { state: 'active' }); } catch {}
await page.bringToFront();
await page.goto('http://localhost:5181', { waitUntil: 'networkidle0' });
await page.bringToFront();
await new Promise((r) => setTimeout(r, 2500));
await page.evaluate(() => { window.game.scene.stop('TitleScene'); window.game.scene.start('ArenaScene', { elementId: 'soul', enemyElementId: 'fire', difficulty: 0 }); });
await new Promise((r) => setTimeout(r, 1500));

const step = (n) => page.evaluate((n) => { for (let i = 0; i < n; i++) { window.__t += 16; window.game.loop.step(window.__t); } }, n);

const SPOTS = [[500, 300], [760, 300], [500, 470], [760, 470]];

await page.evaluate((SPOTS) => {
  window.__t = performance.now();
  const sc = window.game.scene.getScene('ArenaScene');
  const kit = sc.soulKit;
  const TANK = { id: 'tank', name: 'Tank', color: 0x9a9a9a, hpMult: 2.5, speedMult: 0.5, damageMult: 1.3, sizeMult: 1.25, behavior: 'melee', minWave: 3, weight: 10, weightRamp: 2, weightCap: 40 };
  sc.player.setPosition(200, 700);
  sc.npc.setPosition(1200, 700);
  kit.spawnAmalgam('player', { maxHp: 60 });                    // plain
  kit.spawnAmalgam('player', { maxHp: 60, angered: true });     // angered
  kit.spawnAmalgam('player', { maxHp: 100, inflamed: true });   // inflamed
  kit.spawnAmalgam('player', { maxHp: 80, variant: TANK });     // recruited tank
  window.__place = (vx = 0) => kit.amalgams.forEach((rec, i) => {
    rec.husk.setPosition(SPOTS[i][0], SPOTS[i][1]);
    rec.husk.body.setVelocity(vx, 0);
    rec.waypoint = vx ? null : { x: rec.husk.x, y: rec.husk.y };
  });
  window.__place();
}, SPOTS);
await step(20);
await page.evaluate(() => window.__place());
await step(3);
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 3 });
// World → CSS pixels: the canvas is letterboxed/scaled, so ask the page for the mapping.
const clipFor = async (wx, wy, ww, wh) => page.evaluate((wx, wy, ww, wh) => {
  const c = document.querySelector('canvas');
  const r = c.getBoundingClientRect();
  const g = window.game;
  const sx = r.width / g.scale.gameSize.width;
  const sy = r.height / g.scale.gameSize.height;
  return { x: r.left + wx * sx, y: r.top + wy * sy, width: ww * sx, height: wh * sy };
}, wx, wy, ww, wh);
const CLIP = await clipFor(400, 200, 480, 400);
console.log('clip', CLIP);
await page.screenshot({ path: `${DIR}/zoom-quad.png`, clip: CLIP });
console.log('shot quad');

// Mid-walk, so the shamble, lean and swinging arms read.
await page.evaluate(() => window.__place(120));
await step(7);
await page.screenshot({ path: `${DIR}/zoom-walk.png`, clip: CLIP });
console.log('shot walk');

// Torment on everything: split, glowing seams.
await page.evaluate(() => {
  const kit = window.game.scene.getScene('ArenaScene').soulKit;
  kit.amalgams.forEach((r) => { r.burning = true; });
  window.__place();
});
await step(5);
await page.screenshot({ path: `${DIR}/zoom-burn.png`, clip: CLIP });
console.log('shot burn');
await page.close();
await browser.disconnect();
