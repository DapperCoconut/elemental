// World-boss harness 1: does the fight run, does every move announce itself,
// how often does it swing, how hard does it hit, and does the body move?
import puppeteer from 'puppeteer-core';

const URL = 'http://localhost:5181';
const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9222',
  defaultViewport: { width: 1280, height: 800 },
  protocolTimeout: 240000,
});
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => { errs.push(e.message); });
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

const client = await page.target().createCDPSession();
await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
try { await client.send('Page.setWebLifecycleState', { state: 'active' }); } catch {}
await page.bringToFront();
await page.goto(URL, { waitUntil: 'networkidle0' });
await page.bringToFront();
await new Promise((r) => setTimeout(r, 2500));
console.log('loop frame (0 would mean throttled):', await page.evaluate(() => window.game?.loop?.frame));

await page.evaluate(() => {
  window.game.scene.stop('TitleScene');
  window.game.scene.start('ArenaScene', {
    mode: 'worldboss', bossId: 'fire', elementId: 'fire', enemyElementId: 'fire', difficulty: 0,
  });
});
await new Promise((r) => setTimeout(r, 1800));
console.log('scenes:', await page.evaluate(() => window.game.scene.getScenes(true).map((s) => s.scene.key)));

// One evaluate drives the whole simulation: 2500 fake frames (~40s of game
// time) with a sample taken every frame, so nothing is lost to round trips.
const run = await page.evaluate(() => {
  const sc = window.game.scene.getScene('ArenaScene');
  const kit = sc.worldBossKit;
  if (!kit) return { err: 'no worldBossKit' };
  window.__t = performance.now();

  // Park the player so it neither dies nor wanders; the boss AI reads its position.
  sc.player.setPosition(480, 420);
  sc.player.hp = sc.player.maxHp;

  const samples = [];
  let lastBusy = 0;
  let windupStart = null;
  const casts = [];
  const windups = [];
  let castsWithoutWindup = 0;
  let travelled = 0;
  let px = kit.bx, py = kit.by;
  let maxHandReach = 0;

  for (let i = 0; i < 2500; i++) {
    window.__t += 16;
    window.game.loop.step(window.__t);
    const now = sc.time.now;

    // Keep the player alive and planted: we are measuring the boss, not survival.
    sc.player.hp = sc.player.maxHp;
    sc.player.setPosition(480, 420);

    if (kit.pendingMove && windupStart === null) windupStart = { at: now, move: kit.pendingMove, tell: kit.pendingStyle?.tell };
    if (!kit.pendingMove && windupStart !== null) {
      windups.push({ move: windupStart.move, tell: windupStart.tell, ms: Math.round(now - windupStart.at) });
      windupStart = null;
    }
    if (kit.busyUntil > lastBusy + 1) {
      const w = windups[windups.length - 1];
      casts.push({ at: Math.round(now), move: w?.move ?? '(unknown)', windupMs: w?.ms ?? -1 });
      if (!w) castsWithoutWindup++;
      lastBusy = kit.busyUntil;
    }

    travelled += Math.hypot(kit.bx - px, kit.by - py);
    px = kit.bx; py = kit.by;
    const h0 = kit.rig.handAt(0);
    maxHandReach = Math.max(maxHandReach, Math.hypot(h0.x - kit.bx, h0.y - kit.by));

    if (i % 250 === 0) {
      samples.push({
        i, flow: kit.flow, phase: kit.phaseIdx,
        bx: Math.round(kit.bx), by: Math.round(kit.by),
        distToPlayer: Math.round(Math.hypot(kit.bx - 480, kit.by - 420)),
        speed: Math.round(Math.hypot(kit.vx, kit.vy)),
        bossHp: Math.round(sc.npc.hp),
      });
    }
  }

  const gaps = [];
  for (let i = 1; i < casts.length; i++) gaps.push(casts[i].at - casts[i - 1].at);

  return {
    def: { name: kit.def.name, damageMult: kit.def.damageMult ?? 1, look: kit.look },
    scales: { damage: kit.tk.damageScale, telegraph: kit.tk.telegraphScale },
    flow: kit.flow, phase: kit.phaseIdx,
    movement: kit.style.movement, gimmick: kit.gimmick,
    casts: casts.length, castsWithoutWindup,
    windupMs: windups.map((w) => w.ms),
    moveNames: [...new Set(windups.map((w) => w.tell))],
    meanGapMs: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null,
    minGapMs: gaps.length ? Math.min(...gaps) : null,
    travelled: Math.round(travelled),
    maxHandReach: Math.round(maxHandReach),
    samples,
  };
});

console.log('\n=== FIRE SOVEREIGN, 40s of stepped game time ===');
console.log(JSON.stringify(run, null, 1));
console.log('\npage errors:', errs.length ? errs : 'none');
await page.close();
await browser.disconnect();
