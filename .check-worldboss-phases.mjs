// World-boss harness 2: how hard a move hits, how long it warns for, and what
// a phase change actually changes.
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

await page.evaluate(() => {
  window.game.scene.stop('TitleScene');
  window.game.scene.start('ArenaScene', {
    mode: 'worldboss', bossId: 'fire', elementId: 'fire', enemyElementId: 'fire', difficulty: 0,
  });
});
await new Promise((r) => setTimeout(r, 1800));

const out = await page.evaluate(() => {
  const sc = window.game.scene.getScene('ArenaScene');
  const kit = sc.worldBossKit;
  const tk = kit.tk;
  window.__t = performance.now();
  const step = (n) => { for (let i = 0; i < n; i++) { window.__t += 16; window.game.loop.step(window.__t); } };
  const plant = (x, y) => { sc.player.setPosition(x, y); };
  const R = {};

  // Let the intro lapse so the fight is live.
  plant(480, 420);
  step(200);
  R.flowAfterIntro = kit.flow;

  // ── 1. One named move, end to end: ONE SAFE PLACE.
  // Stand the player where the sanctuary will not be, and take the hit.
  kit.cycleIdx = 0;
  kit.nextMoveAt = 0; kit.busyUntil = 0; kit.pendingMove = null;
  tk.clearHazards();
  sc.player.hp = 400; sc.player.maxHp = 400;
  const t0 = sc.time.now;
  kit.beginWindup(sc.time.now, 'sanctuary');
  R.tellShown = kit.pendingStyle?.tell;
  let releasedAt = null, blastFiresAt = null;
  for (let i = 0; i < 600; i++) {
    step(1);
    sc.player.hp = 400;                       // isolate the single hit below
    if (!kit.pendingMove && releasedAt === null) {
      releasedAt = sc.time.now;
      blastFiresAt = tk.safeBlasts[0]?.firesAt ?? null;
    }
    if (blastFiresAt && sc.time.now > blastFiresAt) break;
  }
  R.sanctuary = {
    windupMs: Math.round(releasedAt - t0),
    warnMs: blastFiresAt ? Math.round(blastFiresAt - releasedAt) : null,
  };
  // Now stand clear of the safe circle and let it land.
  const blast = tk.safeBlasts[0];
  if (blast) plant(Math.min(1200, blast.x + 600), blast.y);
  sc.player.hp = 400;
  const hpBefore = sc.player.hp;
  step(30);
  R.sanctuary.damageTaken = hpBefore - sc.player.hp;
  R.sanctuary.expected = Math.round(55 * tk.damageScale);

  // ── 2. A falling strike's warning, measured off a real barrage.
  tk.clearHazards();
  plant(480, 420);
  kit.castMove(sc.time.now, 'barrage');
  step(12);
  const z = tk.zones[0];
  R.barrageZoneWarnMs = z ? Math.round(z.firesAt - z.bornAt) : null;
  R.barrageZoneWarnExpected = Math.round(1650 * tk.telegraphScale);

  // ── 3. Phase change: what is different afterwards?
  const before = {
    phase: kit.phaseIdx, movement: kit.style.movement, gimmick: kit.gimmick,
    crest: kit.look.crest, main: kit.palette.main.toString(16), name: kit.phases[kit.phaseIdx].name,
  };
  sc.player.hp = 400;
  sc.npc.hp = 1;
  sc.npc.takeDamage(50);
  step(4);
  const interludeFlow = kit.flow;
  step(260);                                   // INTERLUDE_MS 2800 + slack
  sc.player.hp = 400;
  const after = {
    phase: kit.phaseIdx, movement: kit.style.movement, gimmick: kit.gimmick,
    crest: kit.look.crest, main: kit.palette.main.toString(16), name: kit.phases[kit.phaseIdx].name,
    bossHp: Math.round(sc.npc.hp), bossMaxHp: sc.npc.maxHp,
  };
  R.phaseChange = { interludeFlow, before, after };

  // ── 4. The shrink gimmick phase two brings: does the ring close, and is the
  //      Sovereign kept inside it with the player?
  const cx = sc.scale.width / 2, cy = sc.scale.height * 0.55;
  const r0 = kit.shrinkR;
  let outside = 0;
  for (let i = 0; i < 900; i++) {
    step(1);
    sc.player.hp = 400;
    plant(cx, cy);                             // stand in the middle, safe
    if (Math.hypot(kit.bx - cx, kit.by - cy) > kit.shrinkR) outside++;
  }
  R.shrink = {
    gimmick: kit.gimmick,
    radiusStart: Math.round(r0), radiusEnd: Math.round(kit.shrinkR),
    framesBossOutsideRing: outside,
    playerHpStandingInside: sc.player.hp,
  };

  return R;
});

console.log(JSON.stringify(out, null, 1));
console.log('\npage exceptions:', errs.length ? errs : 'none');
await page.close();
await browser.disconnect();
