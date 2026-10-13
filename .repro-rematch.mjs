import puppeteer from 'puppeteer-core';
const URL = process.env.URL ?? 'http://localhost:5173';
const P = process.env.P ?? 'fire', N = process.env.N ?? 'water';
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGE EXC', e.message, '\n', (e.stack||'').split('\n').slice(0,8).join('\n')));
page.on('console', (m) => { if (m.type() === 'error' || m.type()==='warning') console.log('CONSOLE', m.type(), m.text().slice(0,400)); });
const client = await page.target().createCDPSession();
await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
try { await client.send('Page.setWebLifecycleState', { state: 'active' }); } catch {}
await page.bringToFront();
await page.goto(URL, { waitUntil: 'load', timeout: 60000 }); await page.waitForFunction(() => window.game && window.game.loop.frame > 5, { timeout: 60000 });
await page.bringToFront();
await new Promise((r) => setTimeout(r, 2000));
const ev = (fn, ...a) => page.evaluate(fn, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const scenes = () => ev(() => window.game.scene.getScenes(true).map(s => s.sys.settings.key));
const frame = () => ev(() => window.game.loop.frame);

async function runMatch(label) {
  await ev((P, N) => {
    for (const s of window.game.scene.getScenes(true)) window.game.scene.stop(s.sys.settings.key);
    window.game.scene.start('ArenaScene', { elementId: P, enemyElementId: N, difficulty: 0 });
  }, P, N);
  await sleep(1500);
  console.log(label, 'scenes', await scenes(), 'frame', await frame());
  const f0 = await frame(); await sleep(1000); const f1 = await frame();
  console.log(label, 'frames advanced over 1s:', f1 - f0);
  // kill the npc to end the match
  await ev(() => { const sc = window.game.scene.getScene('ArenaScene'); sc.npc.hp = 1; sc.npc.takeDamage(9999); });
  await sleep(4000);
  console.log(label, 'after kill scenes', await scenes(), 'frame', await frame());
  const g0 = await frame(); await sleep(1000); const g1 = await frame();
  console.log(label, 'frames advanced over 1s (gameover):', g1 - g0);
}
await runMatch('match1');
// go to title like the player would
await ev(() => { for (const s of window.game.scene.getScenes(true)) window.game.scene.stop(s.sys.settings.key); window.game.scene.start('TitleScene'); });
await sleep(1500);
console.log('title scenes', await scenes());
await runMatch('match2');
await runMatch('match3');
await page.close();
await browser.disconnect();
