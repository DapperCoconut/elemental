import puppeteer from 'puppeteer-core';

const CHROME = '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.argv[2] || '/tmp/claude-1000/-home-kids-dev-elemental/82030937-c64a-4e36-b230-1512d600a139/scratchpad/amalgams.png';

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9222',
  defaultViewport: { width: 1280, height: 800 },
});
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERR', m.text()); });
page.on('pageerror', (e) => console.log('PAGE EXC', e.message));

const client = await page.target().createCDPSession();
await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
try { await client.send('Page.setWebLifecycleState', { state: 'active' }); } catch {}
await page.bringToFront();
await page.goto('http://localhost:5181', { waitUntil: 'networkidle0' });
await page.bringToFront();

await new Promise((r) => setTimeout(r, 2500));
console.log('frame', await page.evaluate(() => window.game?.loop?.frame));

await page.evaluate(() => {
  window.game.scene.start('BootScene');
});
await new Promise((r) => setTimeout(r, 1200));
await page.evaluate(() => {
  window.game.scene.stop('TitleScene');
  window.game.scene.start('ArenaScene', { elementId: 'soul', enemyElementId: 'fire', difficulty: 0 });
});
await new Promise((r) => setTimeout(r, 1500));
console.log('scenes', await page.evaluate(() => window.game.scene.getScenes(true).map((s) => s.scene.key)));

const step = (n) => page.evaluate((n) => {
  for (let i = 0; i < n; i++) { window.__t += 16; window.game.loop.step(window.__t); }
}, n);

const res = await page.evaluate(() => {
  window.__t = performance.now();
  const sc = window.game.scene.getScene('ArenaScene');
  const kit = sc.soulKit;
  if (!kit) return { err: 'no soulKit' };
  const TANK = { id: 'tank', name: 'Tank', color: 0x9a9a9a, hpMult: 2.5, speedMult: 0.5, damageMult: 1.3, sizeMult: 1.25, behavior: 'melee', minWave: 3, weight: 10, weightRamp: 2, weightCap: 40 };
  const SPITTER = { id: 'spitter', name: 'Spitter', color: 0x9944cc, hpMult: 0.9, speedMult: 1, damageMult: 0.6, sizeMult: 0.95, behavior: 'ranged', minWave: 5, weight: 8, weightRamp: 2, weightCap: 38, preferredRange: 270 };
  const BLASTER = { id: 'blaster', name: 'Blaster', color: 0xdd2222, hpMult: 1, speedMult: 0.75, damageMult: 1, sizeMult: 1.05, behavior: 'melee', minWave: 5, weight: 8, weightRamp: 2, weightCap: 38, explodes: true };
  // Park the fighters out of the way and freeze the NPC so the amalgams are the picture.
  sc.player.setPosition(120, 620);
  sc.npc.setPosition(1160, 620);
  const specs = [
    { maxHp: 60 },
    { maxHp: 60, angered: true },
    { maxHp: 100, inflamed: true },
    { maxHp: 80, variant: TANK },
    { maxHp: 70, variant: SPITTER },
    { maxHp: 70, variant: BLASTER },
  ];
  for (const s of specs) kit.spawnAmalgam('player', s);
  // Lay them out on a row and stop them walking so the art is legible in one shot.
  kit.amalgams.forEach((rec, i) => {
    rec.husk.setPosition(180 + i * 160, 300);
    rec.husk.body.setVelocity(0, 0);
    rec.waypoint = { x: 180 + i * 160, y: 300 };
  });
  // Last one burns, to show a torment seam split.
  kit.amalgams[kit.amalgams.length - 1].burning = true;
  return { count: kit.amalgams.length };
});
console.log('spawned', res);

await step(30);
// Freeze positions again after the sim moved them, then let a few frames animate.
await page.evaluate(() => {
  const kit = window.game.scene.getScene('ArenaScene').soulKit;
  kit.amalgams.forEach((rec, i) => {
    rec.husk.setPosition(180 + i * 160, 300);
    rec.husk.body.setVelocity(0, 0);
    rec.waypoint = { x: 180 + i * 160, y: 300 };
  });
});
await step(4);
await page.screenshot({ path: OUT });
console.log('shot ->', OUT);

// Second shot: mid-walk, so the shamble/lean/arms read.
await page.evaluate(() => {
  const kit = window.game.scene.getScene('ArenaScene').soulKit;
  kit.amalgams.forEach((rec, i) => {
    rec.waypoint = null;
    rec.husk.setPosition(180 + i * 160, 300);
    rec.husk.body.setVelocity(90, 20);
  });
});
await step(8);
await page.screenshot({ path: OUT.replace('.png', '-walk.png') });
console.log('shot ->', OUT.replace('.png', '-walk.png'));

await page.close();
await browser.disconnect();
