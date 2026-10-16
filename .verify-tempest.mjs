import puppeteer from 'puppeteer-core';
const URL = process.env.URL ?? 'http://localhost:5173';
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE EXC', e.message, '\n', (e.stack || '').split('\n').slice(0, 6).join('\n')); });
page.on('console', (m) => { if (m.type() === 'error') { errors.push(m.text()); console.log('CONSOLE', m.type(), m.text().slice(0, 300)); } });
const client = await page.target().createCDPSession();
await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
try { await client.send('Page.setWebLifecycleState', { state: 'active' }); } catch {}
await page.bringToFront();
await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => window.game && window.game.loop.frame > 5, { timeout: 60000 });
await page.bringToFront();
await new Promise((r) => setTimeout(r, 1500));
const ev = (fn, ...a) => page.evaluate(fn, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(ok ? '  ✓' : '  ✗', name, detail); };

async function startMatch(P, N) {
  await ev((P, N) => {
    for (const s of window.game.scene.getScenes(true)) window.game.scene.stop(s.sys.settings.key);
    window.game.scene.start('ArenaScene', { elementId: P, enemyElementId: N, difficulty: 0 });
  }, P, N);
  await sleep(1500);
  // Freeze the real loop and drive it from here.
  await ev(() => { window.game.loop.sleep(); window.__t = performance.now(); });
}
const step = (n) => ev((n) => { for (let i = 0; i < n; i++) { window.__t += 16; window.game.loop.step(window.__t); } }, n);
const sc = (fn, ...a) => ev((src, ...a) => { const sc = window.game.scene.getScene('ArenaScene'); return (new Function('sc', ...a.map((_, i) => 'a' + i), 'return (' + src + ')(sc,' + a.map((_, i) => 'a' + i).join(',') + ')'))(sc, ...a); }, fn.toString(), ...a);

// ── 1. Tempest player vs Fire bot ──────────────────────────────────────
console.log('\n[1] tempest vs fire');
await startMatch('tempest', 'fire');
await step(10);
check('kit exists', await sc((sc) => !!sc.tempestKit));
check('player avatar built', await sc((sc) => !!sc.tempestKit.playerAvatar));
check('3 currents on the floor', (await sc((sc) => sc.tempestKit.currents.length)) === 3, String(await sc((sc) => sc.tempestKit.currents.length)));
check('starts with 2 gale charges', (await sc((sc) => sc.tempestKit.sides.player.charges)) === 2);

// Disable the bot's own movement/casting so measurements are clean.
await sc((sc) => { sc.npc.doAI = () => null; sc.npc.speed = 0; });

// Wall slam: npc parked next to the right wall, gale aimed just short of it.
await sc((sc) => {
  const b = sc.physics.world.bounds;
  sc.npc.body.reset(b.right - 30, 320); sc.player.body.reset(b.right - 260, 320);
  sc.player.resetCooldown('tempest-gale');
});
const hp0 = await sc((sc) => sc.npc.hp);
await sc((sc) => sc.tempestKit.doGale('player', sc.npc.x - 24, sc.npc.y));
await step(60);
const hp1 = await sc((sc) => sc.npc.hp);
check('gale burst + wall slam = 22 damage', hp0 - hp1 === 22, `${hp0} → ${hp1}`);
check('charge spent', (await sc((sc) => sc.tempestKit.sides.player.charges)) === 1);

// Recharge by walking: slide the player 260px over frames.
await sc((sc) => { sc.player.body.reset(300, 320); });
for (let i = 0; i < 26; i++) { await sc((sc) => { sc.player.body.reset(sc.player.x + 10, sc.player.y); }); await step(1); }
check('charge back after walking 260px', (await sc((sc) => sc.tempestKit.sides.player.charges)) === 2, String(await sc((sc) => sc.tempestKit.sides.player.charges)));

// Kick: roll through the npc.
await sc((sc) => { sc.npc.body.reset(560, 320); sc.player.body.reset(400, 320); sc.tempestKit.sides.player.charges = 0; });
const hp2 = await sc((sc) => sc.npc.hp);
await sc((sc) => sc.tempestKit.doKick('player', 700, 320));
await step(8);
const dodge = await sc((sc) => sc.player.dodgeChance);
await step(95);
const hp3 = await sc((sc) => sc.npc.hp);
check('kick blast hits for 15', hp2 - hp3 >= 15, `${hp2} → ${hp3}`);
check('kick grants 50% dodge during roll', dodge >= 0.5, String(dodge));
check('kick refills charges to 2', (await sc((sc) => sc.tempestKit.sides.player.charges)) === 2);
check('dodge removed after window', (await sc((sc) => sc.player.dodgeChance)) === 0, String(await sc((sc) => sc.player.dodgeChance)));
check('player rolled ~440px', Math.abs((await sc((sc) => sc.player.x)) - 400) > 300, String(await sc((sc) => sc.player.x)));

// Fronts: cap at 2, third fades the oldest; conveyor carries the npc.
await sc((sc) => { sc.player.body.reset(300, 320); sc.npc.body.reset(420, 320); });
await sc((sc) => sc.tempestKit.doFront('player', 600, 320));
await step(2);
await sc((sc) => sc.tempestKit.doFront('player', 300, 100));
await step(2);
check('two fronts', (await sc((sc) => sc.tempestKit.fronts.length)) === 2);
await step(20); await page.screenshot({ path: '/tmp/claude-1000/-home-kids-dev-elemental/d299bfcc-47a5-4713-abd4-d5f70d9f634f/scratchpad/tempest-ground.png' });
await sc((sc) => sc.tempestKit.doFront('player', 300, 500));
await step(2);
check('third front fades the oldest', (await sc((sc) => sc.tempestKit.fronts.filter((f) => f.fadeAt !== 0).length)) === 1);
await step(30);
check('faded front removed', (await sc((sc) => sc.tempestKit.fronts.length)) === 2);
// Conveyor: a front pointing right from (300,320) covers the npc at (420,320)? That one faded. Place a fresh one.
await sc((sc) => { sc.tempestKit.fronts = []; sc.player.body.reset(300, 320); sc.npc.body.reset(420, 320); });
await sc((sc) => sc.tempestKit.doFront('player', 600, 320));
const nx0 = await sc((sc) => sc.npc.x);
await step(30);
const nx1 = await sc((sc) => sc.npc.x);
check('front conveyor carries the npc', nx1 - nx0 > 80, `${nx0.toFixed(0)} → ${nx1.toFixed(0)}`);

// Updraft: a current moved under the player; flight flags, melee immunity, landing damage.
await sc((sc) => { sc.tempestKit.fronts = []; sc.player.body.reset(480, 320); sc.npc.body.reset(540, 320); sc.tempestKit.currents[0].x = 480; sc.tempestKit.currents[0].y = 320; });
await sc((sc) => sc.tempestKit.doUpdraft('player'));
await step(5);
const air = await sc((sc) => ({ airborne: sc.tempestKit.sides.player.airborne, z: sc.tempestKit.sides.player.z, flag: sc.player.airborne, lev: sc.player.levitating, currents: sc.tempestKit.currents.length + sc.tempestKit.respawnAt.length }));
check('updraft launches', air.airborne && air.z > 20, JSON.stringify(air));
check('fighter.airborne + levitating set', air.flag && air.lev);
check('ridden current scheduled to respawn', air.currents === 3);
const php0 = await sc((sc) => sc.player.hp);
await sc((sc) => { const ctx = sc.buildNpcContext(sc.player.x, sc.player.y); ctx.dealMeleeDamage(200, 30); });
check('melee misses an airborne body', (await sc((sc) => sc.player.hp)) === php0);
const speedMult = await sc((sc) => sc.tempestKit.getPlayerSpeedMult());
check('airborne drift is half speed', speedMult === 0.5);
// Self-burst lifts
const vz0 = await sc((sc) => sc.tempestKit.sides.player.vz);
await sc((sc) => { sc.player.resetCooldown('tempest-gale'); sc.tempestKit.doGale('player', sc.player.x, sc.player.y); });
await step(1);
const vz1 = await sc((sc) => sc.tempestKit.sides.player.vz);
check('self-burst adds lift in the air', vz1 > vz0 + 200, `${vz0.toFixed(0)} → ${vz1.toFixed(0)}`);
await step(25); await page.screenshot({ path: '/tmp/claude-1000/-home-kids-dev-elemental/d299bfcc-47a5-4713-abd4-d5f70d9f634f/scratchpad/tempest-air.png' });
let landed = false; let parked = false; let hp4 = 0;
for (let i = 0; i < 120 && !landed; i++) {
  await step(5);
  const st = await sc((sc) => ({ air: sc.tempestKit.sides.player.airborne, z: sc.tempestKit.sides.player.z, vz: sc.tempestKit.sides.player.vz }));
  if (!parked && st.air && st.vz < 0 && st.z < 120) { parked = true; await sc((sc) => { sc.npc.body.reset(sc.player.x + 50, sc.player.y); }); hp4 = await sc((sc) => sc.npc.hp); }
  landed = !st.air;
}
check('comes back down', landed);
const hp5 = await sc((sc) => sc.npc.hp);
check('landing shockwave damages the npc beside it', parked && hp4 - hp5 >= 6, `${hp4} → ${hp5}`);
check('flags cleared on landing', !(await sc((sc) => sc.player.airborne || sc.player.levitating)));

// Final Forecast: dash, grab, hold 3s, crash.
await sc((sc) => { sc.player.body.reset(300, 320); sc.npc.body.reset(420, 320); sc.npc.hp = 500; sc.npc.maxHp = 500;
  const k = sc.tempestKit; window.__log = []; const ol = k.land.bind(k); k.land = (o, sp) => { window.__log.push(`LAND ${o} speed=${sp.toFixed(0)} grab=${!!k.sides[o].grab} npcHp=${sc.npc.hp} playerHp=${sc.player.hp}`); ol(o, sp); window.__log.push(`AFTER npcHp=${sc.npc.hp}`); };
  const ors = k.reset.bind(k); k.reset = () => { window.__log.push(`RESET scenes=${window.game.scene.getScenes(true).map(x=>x.sys.settings.key)} playerHp=${sc.player.hp} npcHp=${sc.npc.hp} ${new Error().stack.split('\n').slice(1,5).join(' | ')}`); ors(); };
  const orr = k.releaseGrab.bind(k); k.releaseGrab = (o) => { window.__log.push(`RELEASE ${o} z=${k.sides[o].z.toFixed(0)} playerAlive=${sc.player.active && sc.player.hp > 0} npcAlive=${sc.npc.active && sc.npc.hp > 0} ${new Error().stack.split('\n')[2]}`); orr(o); };
});
await sc((sc) => sc.tempestKit.doForecast('player', 700, 320));
await step(12);
const grab = await sc((sc) => ({ grab: !!sc.tempestKit.sides.player.grab, air: sc.tempestKit.sides.player.airborne, z: sc.tempestKit.sides.player.z }));
check('forecast grapples the npc into the air', grab.grab && grab.air, JSON.stringify(grab));
const npcPosA = await sc((sc) => [sc.npc.x, sc.npc.y]);
await sc((sc) => { sc.player.body.reset(sc.player.x + 120, sc.player.y + 40); });
await step(2);
const npcPosB = await sc((sc) => [sc.npc.x, sc.npc.y]);
check('held npc rides with the caster', Math.hypot(npcPosB[0] - npcPosA[0], npcPosB[1] - npcPosA[1]) > 80);
const hp6 = await sc((sc) => sc.npc.hp);
let released = false;
for (let i = 0; i < 40 && !released; i++) { await step(10); released = await sc((sc) => !sc.tempestKit.sides.player.grab); }
check('grab released after ~3s and crash lands', released);
const hp7 = await sc((sc) => sc.npc.hp);
check('crash deals forecast damage (≥ 26)', hp6 - hp7 >= 26, `${hp6} → ${hp7}`);
console.log((await ev(() => window.__log)).join('\n'));
console.log('scenes now', await ev(() => window.game.scene.getScenes(true).map(x=>x.sys.settings.key)), 'playerHp', await sc((sc) => sc.player.hp), 'npcHp', await sc((sc) => sc.npc.hp), 'grab', await sc((sc) => JSON.stringify(sc.tempestKit.sides.player.grab)), 'z', await sc((sc) => sc.tempestKit.sides.player.z));

// Dive + Storm Currents: launch, dive, pong 3 walls.
await sc((sc) => { sc.player.body.reset(480, 320); sc.npc.body.reset(540, 320); sc.npc.hp = 500; sc.tempestKit.sides.player.airborne = true; sc.tempestKit.sides.player.z = 300; sc.tempestKit.sides.player.vz = 0; });
await step(1);
await sc((sc) => { sc.player.resetCooldown('tempest-forecast'); sc.tempestKit.doForecast('player', 540, 320); });
await step(1);
check('air Q is a dive', (await sc((sc) => sc.tempestKit.sides.player.diving)) === true);
let dived = false;
for (let i = 0; i < 30 && !dived; i++) { await step(5); dived = !(await sc((sc) => sc.tempestKit.sides.player.airborne)); }
const hp8 = await sc((sc) => sc.npc.hp);
const pong = await sc((sc) => sc.tempestKit.pongs.length);
check('dive landing starts the Storm Currents', dived && pong === 1, `pongs=${pong}`);
check('eye of the storm opens', await sc((sc) => sc.tempestKit.playerAvatar.eyeTarget === 1));
await step(12); await page.screenshot({ path: '/tmp/claude-1000/-home-kids-dev-elemental/d299bfcc-47a5-4713-abd4-d5f70d9f634f/scratchpad/tempest-eye.png' });
let bounces = 0; let ended = false;
for (let i = 0; i < 80 && !ended; i++) { await step(6); const p = await sc((sc) => sc.tempestKit.pongs[0] ? sc.tempestKit.pongs[0].bounces : -1); if (p >= 0) bounces = p; else ended = true; }
const hp9 = await sc((sc) => sc.npc.hp);
check('currents end after 3 walls', ended && bounces >= 2, `last seen bounces=${bounces}`);
check('wall slams dealt during currents (≥ 24)', hp8 - hp9 >= 24, `${hp8} → ${hp9}`);
check('eye closes', await sc((sc) => sc.tempestKit.playerAvatar.eyeTarget === 0));

// Bar ratios + statuses don't throw
const ratios = await sc((sc) => ['tempest-gale', 'tempest-kick', 'tempest-front', 'tempest-updraft', 'tempest-forecast'].map((id) => sc.tempestKit.getBarRatio(id, sc.time.now)));
check('bar ratios are finite 0..1', ratios.every((r) => r >= 0 && r <= 1), JSON.stringify(ratios));

// ── 2. Fire player vs Tempest bot: does the bot fly and fight? ─────────
console.log('\n[2] fire vs tempest bot');
await startMatch('fire', 'tempest');
await step(5);
check('npc avatar built', await sc((sc) => !!sc.tempestKit.npcAvatar));
await sc((sc) => { window.__casts = []; const oc = sc.npc.castAbility.bind(sc.npc); sc.npc.castAbility = (id, ctx) => { const ok = oc(id, ctx); if (ok) window.__casts.push(id); return ok; }; });
const casts = new Set();
let botAir = false;
for (let i = 0; i < 90; i++) {
  await step(14);
  const st = await sc((sc) => ({ id: sc.npcCastId, air: sc.tempestKit.sides.npc.airborne, hp: sc.player.hp }));
  if (st.id) casts.add(st.id);
  if (st.air) botAir = true;
}
for (const c of await ev(() => window.__casts)) casts.add(c);
check('bot cast abilities', casts.size >= 3, [...casts].join(','));
check('bot took to the air at least once', botAir);
check('bot hurt the player', (await sc((sc) => sc.player.hp)) < 400, String(await sc((sc) => sc.player.hp)));

// ── 3. Tempest mirror: both sides, nothing explodes ────────────────────
console.log('\n[3] tempest vs tempest');
await startMatch('tempest', 'tempest');
await step(600);
check('mirror runs 10s without errors', errors.length === 0, `${errors.length} errors`);

// ── 4. Rematch: reset() path ───────────────────────────────────────────
console.log('\n[4] rematch reset');
await ev(() => { const sc = window.game.scene.getScene('ArenaScene'); sc.npc.hp = 1; sc.npc.takeDamage(9999); });
await step(300);
await startMatch('tempest', 'water');
await step(60);
check('rematch: kit reset and currents respawned', (await sc((sc) => sc.tempestKit.currents.length)) === 3 && (await sc((sc) => sc.tempestKit.sides.player.z)) === 0);

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed; page errors: ${errors.length}`);
await page.close();
await browser.disconnect();
