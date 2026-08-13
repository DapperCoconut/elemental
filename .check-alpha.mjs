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

const before = await page.evaluate(() => {
  window.__t = performance.now();
  const sc = window.game.scene.getScene('ArenaScene');
  const kit = sc.soulKit;
  sc.player.setPosition(500, 400);
  sc.npc.setPosition(1150, 700);
  kit.spawnHostileAlpha();
  const a = kit.alphaHusk;
  a.body.reset(560, 400);          // stand it right next to the player
  return { state: kit.alphaState, hp: a.hp, maxHp: a.maxHp };
});
console.log('alpha up:', before);

// Click: hold Lantern Light on it — a spark per frame-batch at wherever it is now.
for (let i = 0; i < 13; i++) {
  await page.evaluate(() => {
    const kit = window.game.scene.getScene('ArenaScene').soulKit;
    const a = kit.alphaHusk;
    if (a) kit.doLanternTick(a.x, a.y, 'player');
  });
  await step(10);
}
const afterClick = await page.evaluate(() => {
  const kit = window.game.scene.getScene('ArenaScene').soulKit;
  return { hp: kit.alphaHusk?.hp ?? null, puddles: kit.puddles.length };
});
console.log('after lantern hold:', afterClick, '(expect hp < ' + before.hp + ')');

// Q: Hell's Torment AoE off a burning amalgam should reach it too.
const afterTorment = await page.evaluate(() => {
  const kit = window.game.scene.getScene('ArenaScene').soulKit;
  kit.alphaHusk.body.reset(560, 400);
  const hpBefore = kit.alphaHusk.hp;
  kit.spawnAmalgam('player', { maxHp: 60 });
  const rec = kit.amalgams[kit.amalgams.length - 1];
  rec.husk.body.reset(560, 400);
  kit.emitTormentTick(rec);
  return { hpBefore, hpAfter: kit.alphaHusk.hp };
});
console.log('after torment tick:', afterTorment);

await page.screenshot({ path: `${DIR}/alpha-click.png` });
await page.close();
await browser.disconnect();
