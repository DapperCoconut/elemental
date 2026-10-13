// Close-up screenshots at 2× device scale, clipped around the player, for judging rigs.
// Usage: node shot-closeup.mjs <element> <setupName>
import puppeteer from 'puppeteer-core';

const [element, setup = 'idle'] = process.argv.slice(2);
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 2 }, protocolTimeout: 240000 });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGE EXC', e.message));
const client = await page.target().createCDPSession();
await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
await page.bringToFront();
await page.goto('http://localhost:5173', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.game, { timeout: 30000 });
await new Promise((r) => setTimeout(r, 1500));
await page.evaluate(() => { window.game.loop.stop(); window.__t = performance.now(); });
const ev = (fn, ...a) => page.evaluate(fn, ...a);
const step = (n) => page.evaluate((n) => { for (let i = 0; i < n; i++) { window.__t += 16; window.game.loop.step(window.__t); } }, n);
await ev((element) => { for (const s of window.game.scene.getScenes(true)) window.game.scene.stop(s.scene.key); window.game.scene.start('ArenaScene', { elementId: element, enemyElementId: 'dummy', difficulty: 0 }); }, element);
await step(30);
await ev(() => { const sc = window.game.scene.getScene('ArenaScene'); window.__sc = sc; sc.npc.speed = 0; sc.npc.maxHp = 5000; sc.npc.hp = 5000; sc.player.setPosition(480, 340); sc.npc.setPosition(700, 340); });
await step(5);
const setups = {
  idle: async () => { await step(40); },
  wax: async () => {
    await ev(() => { const sc = window.__sc; const k = sc.waxKit; k.doCandleMount('player', 400, 400); k.doHiveHearth('player', 600, 420); k.hives[0].cells = 4; sc.player.castAbility('wax-swarm', sc.buildPlayerContext(700, 340)); sc.player.castAbility('wax-sticky-bombs', sc.buildPlayerContext(700, 340)); });
    await step(30);
    await ev(() => { const sc = window.__sc; sc.player.castAbility('wax-stinger-strikes', sc.buildPlayerContext(700, 340)); });
    await step(12);
  },
  clay: async () => {
    await ev(() => { const sc = window.__sc; const k = sc.clayKit; sc.player.castAbility('clay-rupture', sc.buildPlayerContext(700, 340)); k.doClot('player'); });
    await step(10);
    await ev(() => { const sc = window.__sc; const k = sc.clayKit; const d = k.side('player').drawing; if (d) { for (let i = 0; i < 40; i++) { const a = -1 + (i / 39) * 2; k.feedDrawing('player', sc.player.x + Math.cos(a) * 110, sc.player.y + Math.sin(a) * 110); } } });
    await step(200);
  },
  clayfuse: async () => {
    await ev(() => { const sc = window.__sc; sc.player.castAbility('clay-fuse', sc.buildPlayerContext(700, 340)); });
    await step(80);
    await ev(() => { const sc = window.__sc; sc.player.castAbility('clay-slam', sc.buildPlayerContext(700, 340)); });
    await step(8);
  },
};
await (setups[setup] ?? setups.idle)();
const box = await ev(() => { const sc = window.__sc; return { x: sc.player.x, y: sc.player.y }; });
// Logical 960×640 maps onto the 1280×800 CSS canvas with letterboxing; measure the canvas rect.
const rect = await ev(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
const sx = rect.w / 960, sy = rect.h / 640;
const cx = rect.x + box.x * sx, cy = rect.y + box.y * sy;
await page.screenshot({ path: `close-${element}-${setup}.png`, clip: { x: Math.max(0, cx - 220), y: Math.max(0, cy - 150), width: 440, height: 300 } });
console.log('saved', `close-${element}-${setup}.png`, JSON.stringify({ rect, box }));
await page.close();
await browser.disconnect();
