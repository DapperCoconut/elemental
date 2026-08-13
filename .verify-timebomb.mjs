import puppeteer from 'puppeteer-core';

const URL = process.env.URL ?? 'http://localhost:5173';
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGE EXC', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERR', m.text()); });
const client = await page.target().createCDPSession();
await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
try { await client.send('Page.setWebLifecycleState', { state: 'active' }); } catch {}
await page.bringToFront();
await page.goto(URL, { waitUntil: 'networkidle0' });
await page.bringToFront();
await new Promise((r) => setTimeout(r, 2000));

// Seed the save: Time Mastery on, Time Bomb bound to F, dummy opponent unlocked.
await page.evaluate(() => {
  const raw = localStorage.getItem('elemental_save');
  const d = raw ? JSON.parse(raw) : {};
  d.masteryEnabled = { ...(d.masteryEnabled ?? {}), sand: true };
  d.masteryBinds = { ...(d.masteryBinds ?? {}), sand: { f: 'time-bomb' } };
  d.masteryProgress = { ...(d.masteryProgress ?? {}), sand: { perfectReloads: 99, lassos: 99, remainAbsorbed: 999, rifleHits: 99 } };
  d.dummyUnlocked = true;
  localStorage.setItem('elemental_save', JSON.stringify(d));
});
await page.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2000));

await page.evaluate(() => {
  window.game.scene.stop('TitleScene');
  window.game.scene.start('ArenaScene', { elementId: 'sand', enemyElementId: 'dummy', difficulty: 0 });
});
await new Promise((r) => setTimeout(r, 1500));

const step = (n) => page.evaluate((n) => {
  for (let i = 0; i < n; i++) { window.__t += 16; window.game.loop.step(window.__t); }
}, n);
const ev = (fn, ...a) => page.evaluate(fn, ...a);

await ev(() => { window.__t = performance.now(); });

const results = [];
const check = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`); };

// ── Setup: put both fighters in a known spot, mastery live ──
const boot = await ev(() => {
  const sc = window.game.scene.getScene('ArenaScene');
  const kit = sc.timeKit;
  window.__sc = sc; window.__kit = kit;
  sc.player.setPosition(400, 400);
  sc.npc.setPosition(700, 400);
  sc.player.hp = sc.player.maxHp;
  sc.npc.hp = sc.npc.maxHp;
  return {
    masteryActive: kit.arena.masteryActive,
    bombSlot: kit.bombSlot(),
    cdReady: kit.getBombCooldownRatio(sc.time.now),
    npcMaxHp: sc.npc.maxHp,
  };
});
check('Time Mastery active for sand', boot.masteryActive === true, JSON.stringify(boot));
check("Time Bomb claims its bound slot (F)", boot.bombSlot === 'f');
check('Cooldown starts ready', boot.cdReady === 1, `ratio=${boot.cdReady}`);

// ── 1. Throw: bomb exists, in flight, aimed at the npc ──
const thrown = await ev(() => {
  const { __kit: kit, __sc: sc } = window;
  kit.tryCastBomb(sc.time.now, sc.npc.x, sc.npc.y);
  const b = kit.bombs.player;
  return { exists: !!b, phase: b?.phase, vx: Math.round(b?.vx ?? 0), vy: Math.round(b?.vy ?? 0), cd: kit.getBombCooldownRatio(sc.time.now) };
});
check('Throw spawns a bomb in flight', thrown.exists && thrown.phase === 'flight', JSON.stringify(thrown));
check('Bomb flies toward the target', thrown.vx > 300 && Math.abs(thrown.vy) < 5, `v=(${thrown.vx},${thrown.vy})`);
check('Live bomb reads the bar as full', thrown.cd === 1);

// A second press while it is still airborne must not throw another.
const midair = await ev(() => {
  const { __kit: kit, __sc: sc } = window;
  kit.tryCastBomb(sc.time.now, sc.npc.x, sc.npc.y);
  return { phase: kit.bombs.player?.phase };
});
check('Press mid-flight is ignored', midair.phase === 'flight');

// ── 2. Flight → stick ──
await step(30);
const stuck = await ev(() => {
  const { __kit: kit, __sc: sc } = window;
  const b = kit.bombs.player;
  return {
    phase: b?.phase, ox: Math.round(b?.ox ?? 0), oy: Math.round(b?.oy ?? 0),
    dmg: b ? kit.bombDamage(b, sc.time.now) : null,
    npcHp: sc.npc.hp, maxHp: sc.npc.maxHp,
    onNpc: b ? Math.round(Math.hypot(b.x - sc.npc.x, b.y - sc.npc.y)) : null,
  };
});
check('Bomb sticks to the enemy', stuck.phase === 'stuck', JSON.stringify(stuck));
check('Sticking deals no damage by itself', stuck.npcHp === stuck.maxHp, `hp=${stuck.npcHp}/${stuck.maxHp}`);
check('Fresh bomb is worth the base 10', stuck.dmg === 10, `dmg=${stuck.dmg}`);
check('Bomb rides the victim', stuck.onNpc !== null && stuck.onNpc <= 20, `offset=${stuck.onNpc}px`);

// It tracks them as they move.
const tracked = await ev(() => {
  const { __kit: kit, __sc: sc } = window;
  sc.npc.setPosition(900, 300);
  kit.update(sc.time.now, 16);
  const b = kit.bombs.player;
  return { dx: Math.round(b.x - sc.npc.x), dy: Math.round(b.y - sc.npc.y) };
});
check('Bomb follows the victim when they move', Math.abs(tracked.dx) <= 20 && Math.abs(tracked.dy) <= 20, JSON.stringify(tracked));

// ── 3. Damage ramp: 10 → 50 over 30s ──
const ramp = await ev(() => {
  const { __kit: kit, __sc: sc } = window;
  const b = kit.bombs.player;
  const at = (ms) => kit.bombDamage({ ...b, stuckAt: sc.time.now - ms }, sc.time.now);
  return { t0: at(0), t7500: at(7500), t15000: at(15000), t30000: at(30000), t60000: at(60000) };
});
check('Ramp: 0s = 10 damage', ramp.t0 === 10, JSON.stringify(ramp));
check('Ramp: 15s = 30 damage (halfway)', ramp.t15000 === 30);
check('Ramp: 30s = 50 damage (max)', ramp.t30000 === 50);
check('Ramp is capped past 30s', ramp.t60000 === 50);

// ── 4. Arm: white ring closes in ──
const armed = await ev(() => {
  const { __kit: kit, __sc: sc } = window;
  kit.tryCastBomb(sc.time.now, sc.npc.x, sc.npc.y);
  const b = kit.bombs.player;
  return {
    phase: b?.phase, hasRing: !!b?.ringGfx,
    r0: Math.round(kit.bombRingRadius(b, sc.time.now)),
    onBeat0: kit.bombOnBeat(b, sc.time.now),
    npcHp: sc.npc.hp,
  };
});
check('Second press arms the bomb', armed.phase === 'armed' && armed.hasRing, JSON.stringify(armed));
check('Arming does not detonate', armed.npcHp === stuck.maxHp);
check('Ring starts wide (130px)', armed.r0 === 130, `r=${armed.r0}`);
check('Not on the beat at the start', armed.onBeat0 === false);

const shrink = await ev(() => {
  const { __kit: kit, __sc: sc } = window;
  const b = kit.bombs.player;
  const at = (ms) => ({
    r: Math.round(kit.bombRingRadius({ ...b, armedAt: sc.time.now - ms }, sc.time.now)),
    beat: kit.bombOnBeat({ ...b, armedAt: sc.time.now - ms }, sc.time.now),
  });
  return { ms700: at(700), ms1200: at(1200), ms1300: at(1300), ms1400: at(1400) };
});
check('Ring shrinks over the arming window', shrink.ms700.r < 130 && shrink.ms1200.r < shrink.ms700.r, JSON.stringify(shrink));
check('Halfway through is NOT on the beat', shrink.ms700.beat === false);
check('Ring landing on the casing IS on the beat', shrink.ms1400.beat === true && shrink.ms1400.r === 13);
check('The beat window is tight (~150ms)', shrink.ms1200.beat === false && shrink.ms1300.beat === true, JSON.stringify(shrink));

// ── 5. Early detonation = normal damage ──
const early = await ev(() => {
  const { __kit: kit, __sc: sc } = window;
  const b = kit.bombs.player;
  const hpBefore = sc.npc.hp;
  const expected = kit.bombDamage(b, sc.time.now);
  const onBeat = kit.bombOnBeat(b, sc.time.now);
  kit.tryCastBomb(sc.time.now, sc.npc.x, sc.npc.y);
  return { onBeat, expected, dealt: hpBefore - sc.npc.hp, cleared: kit.bombs.player === null, cd: kit.getBombCooldownRatio(sc.time.now) };
});
check('Early third press detonates', early.cleared && early.dealt > 0, JSON.stringify(early));
check('Early detonation deals base (no 1.5x)', early.onBeat === false && early.dealt === early.expected, `dealt=${early.dealt} expected=${early.expected}`);
check('Cooldown is running after the throw', early.cd < 1, `ratio=${early.cd.toFixed(2)}`);

// Cooldown blocks a re-throw.
const onCd = await ev(() => {
  const { __kit: kit, __sc: sc } = window;
  kit.tryCastBomb(sc.time.now, sc.npc.x, sc.npc.y);
  return { bomb: kit.bombs.player };
});
check('Cooldown blocks the next throw', onCd.bomb === null);

// ── 6. On-the-beat detonation = 1.5x ──
const perfect = await ev(() => {
  const { __kit: kit, __sc: sc } = window;
  kit.bombLastCastAt = -999999;
  sc.npc.hp = sc.npc.maxHp;
  kit.tryCastBomb(sc.time.now, sc.npc.x, sc.npc.y);
  const b = kit.bombs.player;
  // Land it, ripen it 15s, arm it, then rewind the ring to the beat.
  b.phase = 'stuck'; b.stuckAt = sc.time.now - 15000; b.ox = 0; b.oy = 0;
  kit.tryCastBomb(sc.time.now, sc.npc.x, sc.npc.y);      // arm
  kit.bombs.player.armedAt = sc.time.now - 1400;          // ring is on the casing
  const base = kit.bombDamage(kit.bombs.player, sc.time.now);
  const onBeat = kit.bombOnBeat(kit.bombs.player, sc.time.now);
  const hpBefore = sc.npc.hp;
  kit.tryCastBomb(sc.time.now, sc.npc.x, sc.npc.y);      // detonate on the beat
  return { base, onBeat, dealt: hpBefore - sc.npc.hp, cleared: kit.bombs.player === null };
});
check('On-the-beat press is detected', perfect.onBeat === true, JSON.stringify(perfect));
check('On-the-beat deals 1.5x the ripened damage', perfect.dealt === Math.round(perfect.base * 1.5), `base=${perfect.base} dealt=${perfect.dealt}`);
check('On-the-beat detonation clears the bomb', perfect.cleared === true);

// ── 7. Left alone, the ring lands and it goes off for normal damage ──
const auto = await ev(() => {
  const { __kit: kit, __sc: sc } = window;
  kit.bombLastCastAt = -999999;
  sc.npc.hp = sc.npc.maxHp;
  kit.tryCastBomb(sc.time.now, sc.npc.x, sc.npc.y);
  const b = kit.bombs.player;
  b.phase = 'stuck'; b.stuckAt = sc.time.now - 15000; b.ox = 0; b.oy = 0;
  kit.tryCastBomb(sc.time.now, sc.npc.x, sc.npc.y);      // arm, then never press again
  window.__autoBase = kit.bombDamage(kit.bombs.player, sc.time.now);
  window.__autoHp = sc.npc.hp;
  return { armed: kit.bombs.player.phase };
});
check('Armed and left alone', auto.armed === 'armed');
await step(90);   // > 1.4s of arming
const autoDone = await ev(() => {
  const { __kit: kit, __sc: sc } = window;
  return { cleared: kit.bombs.player === null, dealt: window.__autoHp - sc.npc.hp, base: window.__autoBase };
});
check('Ring landing detonates on its own', autoDone.cleared && autoDone.dealt > 0, JSON.stringify(autoDone));
check('Auto-detonation gets no bonus', autoDone.dealt >= autoDone.base && autoDone.dealt <= autoDone.base + 2, `dealt=${autoDone.dealt} base=${autoDone.base}`);

// ── 8. A miss fizzles ──
const miss = await ev(() => {
  const { __kit: kit, __sc: sc } = window;
  kit.bombLastCastAt = -999999;
  sc.player.setPosition(200, 200);
  sc.npc.setPosition(200, 700);          // nowhere near the aim
  sc.npc.hp = sc.npc.maxHp;
  kit.tryCastBomb(sc.time.now, 1100, 200);
  return { phase: kit.bombs.player?.phase };
});
check('Bomb thrown at nothing is airborne', miss.phase === 'flight');
await step(120);
const missDone = await ev(() => {
  const { __kit: kit, __sc: sc } = window;
  return { cleared: kit.bombs.player === null, npcHp: sc.npc.hp, maxHp: sc.npc.maxHp };
});
check('A miss fizzles out at max range', missDone.cleared === true, JSON.stringify(missDone));
check('A miss deals nothing', missDone.npcHp === missDone.maxHp);

// ── 9. Online replay: their bomb sticks to us, arms, and hits for 1.5x ──
const npcSide = await ev(() => {
  const { __kit: kit, __sc: sc } = window;
  sc.player.setPosition(400, 400);
  sc.npc.setPosition(700, 400);
  sc.player.hp = sc.player.maxHp;
  kit.doNpcTimeBomb(sc.player.x, sc.player.y);
  return { phase: kit.bombs.npc?.phase };
});
check('Replayed throw spawns their bomb', npcSide.phase === 'flight');
await step(30);
const npcStuck = await ev(() => {
  const { __kit: kit, __sc: sc } = window;
  const tray = sc.statusHudKit?.customStatuses ?? sc.customStatuses;
  return {
    phase: kit.bombs.npc?.phase,
    playerHp: sc.player.hp,
    trayHas: !!(tray && (tray.get ? tray.get('time-bomb') : tray['time-bomb'])),
  };
});
check('Their bomb sticks to the player', npcStuck.phase === 'stuck', JSON.stringify(npcStuck));
check('It shows in the player status tray', npcStuck.trayHas === true);

const npcBoom = await ev(() => {
  const { __kit: kit, __sc: sc } = window;
  const b = kit.bombs.npc;
  b.stuckAt = sc.time.now - 30000;                  // fully ripe
  kit.doNpcTimeBombArm();
  const armed = kit.bombs.npc.phase;
  const base = kit.bombDamage(kit.bombs.npc, sc.time.now);
  const hpBefore = sc.player.hp;
  kit.doNpcTimeBombDetonate(true);                  // they claim they hit the beat
  const tray = sc.statusHudKit?.customStatuses ?? sc.customStatuses;
  return {
    armed, base, dealt: hpBefore - sc.player.hp, cleared: kit.bombs.npc === null,
    trayCleared: !(tray && (tray.get ? tray.get('time-bomb') : tray['time-bomb'])),
  };
});
check('Replayed arm lands', npcBoom.armed === 'armed', JSON.stringify(npcBoom));
check('Ripe enemy bomb hits the player for 50 base', npcBoom.base === 50);
check('Their on-the-beat call is honoured (75)', npcBoom.dealt === 75, `dealt=${npcBoom.dealt}`);
check('Their bomb clears from the tray', npcBoom.cleared && npcBoom.trayCleared);

// ── 10. Victim death and match reset clean up ──
const cleanup = await ev(() => {
  const { __kit: kit, __sc: sc } = window;
  kit.bombLastCastAt = -999999;
  kit.tryCastBomb(sc.time.now, sc.npc.x, sc.npc.y);
  const b = kit.bombs.player;
  b.phase = 'stuck'; b.stuckAt = sc.time.now; b.ox = 0; b.oy = 0;
  sc.npc.hp = 0;
  kit.update(sc.time.now, 16);
  const afterDeath = kit.bombs.player === null;
  sc.npc.hp = sc.npc.maxHp;
  kit.bombLastCastAt = -999999;
  kit.tryCastBomb(sc.time.now, sc.npc.x, sc.npc.y);
  const before = !!kit.bombs.player;
  kit.reset();
  return { afterDeath, before, afterReset: kit.bombs.player === null, cdAfterReset: kit.getBombCooldownRatio(sc.time.now) };
});
check('A dead victim takes the bomb with them', cleanup.afterDeath === true, JSON.stringify(cleanup));
check('reset() clears any live bomb', cleanup.before && cleanup.afterReset);
check('reset() leaves the ability ready', cleanup.cdAfterReset === 1);

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) console.log('FAILED:', failed.map((f) => f.name).join(' | '));
await page.close();
await browser.disconnect();
