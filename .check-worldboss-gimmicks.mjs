// World-boss harness 3: exact damage on a single isolated hit, and each of the
// phase gimmicks on the Sovereign that actually ships with it.
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9222',
  defaultViewport: { width: 1280, height: 800 },
  protocolTimeout: 240000,
});
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const client = await page.target().createCDPSession();
await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
try { await client.send('Page.setWebLifecycleState', { state: 'active' }); } catch {}
await page.bringToFront();
await page.goto('http://localhost:5181', { waitUntil: 'networkidle0' });
await page.bringToFront();
await new Promise((r) => setTimeout(r, 2500));

const startBoss = async (bossId, elementId = 'fire') => {
  await page.evaluate((bossId, elementId) => {
    window.game.scene.stop('TitleScene');
    window.game.scene.start('ArenaScene', {
      mode: 'worldboss', bossId, elementId, enemyElementId: 'fire', difficulty: 0,
    });
  }, bossId, elementId);
  await new Promise((r) => setTimeout(r, 1600));
};

// ── 1. One clean hit, with nothing else allowed to land on the frame it does.
await startBoss('fire');
const hit = await page.evaluate(() => {
  const sc = window.game.scene.getScene('ArenaScene');
  const kit = sc.worldBossKit; const tk = kit.tk;
  window.__t = performance.now();
  const step = (n) => { for (let i = 0; i < n; i++) { window.__t += 16; window.game.loop.step(window.__t); } };
  sc.player.setPosition(480, 420); step(200);

  // Silence the harass track so the only thing that can touch the player is
  // the move under test — the previous run's stray 27 was an h-rune landing.
  kit.harassNextAt = Number.MAX_SAFE_INTEGER;
  kit.nextMoveAt = Number.MAX_SAFE_INTEGER;
  kit.pendingMove = null; kit.busyUntil = 0;
  tk.clearHazards();
  sc.player.maxHp = 400; sc.player.hp = 400;

  kit.beginWindup(sc.time.now, 'sanctuary');
  let blast = null;
  for (let i = 0; i < 700; i++) {
    step(1);
    kit.harassNextAt = Number.MAX_SAFE_INTEGER;
    kit.nextMoveAt = Number.MAX_SAFE_INTEGER;
    sc.player.hp = 400;
    blast = tk.safeBlasts[0] ?? blast;
    if (blast && sc.time.now >= blast.firesAt - 120) break;
  }
  if (!blast) return { err: 'no sanctuary blast spawned' };
  // Stand as far from the safe circle as the arena allows.
  const W = sc.scale.width, H = sc.scale.height;
  sc.player.setPosition(blast.x < W / 2 ? W - 60 : 60, blast.y < H / 2 ? H - 70 : 110);
  sc.player.hp = 400;
  const before = sc.player.hp;
  step(20);
  const taken = before - sc.player.hp;

  // And the same blast survived from inside the circle.
  tk.clearHazards();
  kit.beginWindup(sc.time.now, 'sanctuary');
  let b2 = null;
  for (let i = 0; i < 700; i++) {
    step(1);
    kit.harassNextAt = Number.MAX_SAFE_INTEGER;
    kit.nextMoveAt = Number.MAX_SAFE_INTEGER;
    sc.player.hp = 400;
    b2 = tk.safeBlasts[0] ?? b2;
    if (b2 && sc.time.now >= b2.firesAt - 120) break;
  }
  sc.player.setPosition(b2.x, b2.y);
  const beforeSafe = sc.player.hp;
  step(20);
  return {
    damageScale: tk.damageScale,
    outsideSafeCircle: taken,
    expected: Math.round(55 * tk.damageScale),
    insideSafeCircle: beforeSafe - sc.player.hp,
  };
});
console.log('\n=== a single ONE SAFE PLACE, isolated ===');
console.log(hit);

// ── 2.  Wards, sampled every frame through the pop so the stagger window is seen.
await startBoss('crystal');
const wards = await page.evaluate(() => {
  const sc = window.game.scene.getScene('ArenaScene');
  const kit = sc.worldBossKit;
  window.__t = performance.now();
  const step = (n) => { for (let i = 0; i < n; i++) { window.__t += 16; window.game.loop.step(window.__t); } };
  sc.player.setPosition(480, 420); step(200);
  sc.npc.hp = 1; sc.npc.takeDamage(50); step(270);
  sc.player.hp = sc.player.maxHp;

  const timeline = [];
  let poppedAt = null;
  let hpAtStaggerStart = null;
  let damageWarded = null, damageStaggered = null;

  // Measure how much a fixed 100-point hit actually removes while warded.
  sc.npc.hp = sc.npc.maxHp;
  const h0 = sc.npc.hp; sc.npc.takeDamage(100); damageWarded = Math.round(h0 - sc.npc.hp);

  for (let i = 0; i < 1200; i++) {
    const spin = sc.time.now / 1100;
    const w = kit.wards.find((x) => x.alive);
    if (w) sc.player.setPosition(kit.bx + Math.cos(w.a + spin) * 96, kit.by + Math.sin(w.a + spin) * 78);
    step(1);
    sc.player.hp = sc.player.maxHp;
    const staggered = sc.time.now < kit.staggerUntil;
    if (staggered && poppedAt === null) {
      poppedAt = sc.time.now;
      sc.npc.hp = sc.npc.maxHp;
      hpAtStaggerStart = sc.npc.hp;
      sc.npc.takeDamage(100);
      damageStaggered = Math.round(hpAtStaggerStart - sc.npc.hp);
    }
    if (i % 40 === 0 || (poppedAt && sc.time.now - poppedAt < 120)) {
      timeline.push({
        ms: Math.round(sc.time.now - (poppedAt ?? sc.time.now)),
        wardsAlive: kit.wards.filter((x) => x.alive).length,
        staggered, mult: sc.npc.bossWardIncomingMult,
        respawnInMs: kit.wardsRespawnAt ? Math.round(kit.wardsRespawnAt - sc.time.now) : null,
      });
    }
    if (poppedAt && sc.time.now - poppedAt > 13000) break;
  }
  return {
    damageOf100Warded: damageWarded, damageOf100Staggered: damageStaggered,
    staggerObserved: poppedAt !== null,
    wardsBackUp: kit.wards.filter((x) => x.alive).length,
    timeline: timeline.filter((t, i) => i < 4 || t.mult !== 1 || i % 6 === 0).slice(0, 22),
  };
});
console.log('\n=== wards payout ===');
console.log(JSON.stringify(wards, null, 1));

// ── 3. Gloom, stalkers, tremor — each on a boss that ships with it.
const rest = [];
for (const [bossId, phase, label] of [['depths', 0, 'gloom'], ['life', 1, 'stalkers'], ['air', 1, 'tremor']]) {
  await startBoss(bossId);
  const r = await page.evaluate((phase, label) => {
    const sc = window.game.scene.getScene('ArenaScene');
    const kit = sc.worldBossKit; const tk = kit.tk;
    window.__t = performance.now();
    const step = (n) => { for (let i = 0; i < n; i++) { window.__t += 16; window.game.loop.step(window.__t); } };
    sc.player.setPosition(480, 420); step(200);
    if (phase > 0) { sc.npc.hp = 1; sc.npc.takeDamage(50); step(270); }
    sc.player.hp = sc.player.maxHp;
    const base = {
      boss: kit.def.name, phase: kit.phaseIdx, phaseName: kit.phases[kit.phaseIdx].name,
      gimmick: kit.gimmick, movement: kit.style.movement,
      tint: kit.style.tint ?? 'none',
      paletteShifted: kit.palette.lit !== kit.basePalette.lit || kit.palette.main !== kit.basePalette.main,
      look: { crest: kit.look.crest, arms: kit.look.arms ?? 2, eyes: kit.look.eyes ?? 2 },
    };
    let maxAdds = 0, rings = 0, gloomCmds = 0;
    for (let i = 0; i < 800; i++) {
      step(1);
      sc.player.setPosition(480, 420);
      sc.player.hp = sc.player.maxHp;
      maxAdds = Math.max(maxAdds, tk.addCount);
      rings = Math.max(rings, tk.rings.length);
      gloomCmds = Math.max(gloomCmds, kit.gloomG?.commandBuffer?.length ?? 0);
    }
    return { ...base, observed: { maxAddsAlive: maxAdds, maxRingsLive: rings, gloomDrawCommands: gloomCmds }, label };
  }, phase, label);
  rest.push(r);
}
console.log('\n=== gloom / stalkers / tremor ===');
console.log(JSON.stringify(rest, null, 1));
console.log('\npage exceptions:', errs.length ? errs : 'none');
await page.close();
await browser.disconnect();
