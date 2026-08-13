import puppeteer from 'puppeteer-core';

const OUT = '/tmp/claude-1000/-home-kids-dev-elemental/195100c9-2156-4c5c-b986-68054ea2f6e6/scratchpad/husk-tiers.png';

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
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.bringToFront();
await page.waitForFunction(() => window.game?.loop?.frame > 0, { timeout: 20000 });
await new Promise((r) => setTimeout(r, 2000));
console.log('frame', await page.evaluate(() => window.game?.loop?.frame));

// Lay out husk textures for a few elements x 3 tiers on a plain scene.
const res = await page.evaluate(() => {
  const game = window.game;
  const sc = game.scene.getScenes(true)[0];
  if (!sc) return { err: 'no active scene' };
  sc.add.rectangle(480, 320, 960, 640, 0x101018).setDepth(9000);
  const fams = ['fire', 'water', 'earth', 'shadow', 'radiation'];
  const missing = [];
  fams.forEach((f, row) => {
    [1, 2, 3].forEach((t, col) => {
      const key = `husk-elem-${f}-t${t}`;
      if (!game.textures.exists(key)) { missing.push(key); return; }
      const img = sc.add.image(200 + col * 140, 100 + row * 110, key).setDepth(9001);
      img.setScale(2);
      sc.add.text(200 + col * 140, 155 + row * 110, `${f} t${t}`, { fontSize: '12px', color: '#ffffff' })
        .setOrigin(0.5).setDepth(9001);
    });
  });
  return { missing };
});
console.log('layout', JSON.stringify(res));

await new Promise((r) => setTimeout(r, 300));
await page.evaluate(() => {
  window.__t = performance.now();
  for (let i = 0; i < 4; i++) { window.__t += 16; window.game.loop.step(window.__t); }
});
await page.screenshot({ path: OUT });
console.log('shot ->', OUT);
await page.close();
await browser.disconnect();
