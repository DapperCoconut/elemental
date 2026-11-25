// Headless smoke test for Venom (element id `slime`). Needs the dev server and Chrome on :9222.
//   node .verify-venom.mjs [screenshot-dir]
import puppeteer from 'puppeteer-core';
const URL = process.env.URL ?? 'http://localhost:5173';
const SHOTS = process.argv[2] ?? null;
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE EXC', e.message, '\n', (e.stack || '').split('\n').slice(0, 8).join('\n')); });
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) { errors.push(m.text()); console.log('CONSOLE', m.text().slice(0, 300)); } });
const client = await page.target().createCDPSession();
await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
try { await client.send('Page.setWebLifecycleState', { state: 'active' }); } catch {}
await page.bringToFront();
await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => window.game && window.game.loop.frame > 5, { timeout: 60000 });
await new Promise((r) => setTimeout(r, 1500));
const ev = (fn, ...a) => page.evaluate(fn, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(ok ? '  ✓' : '  ✗', name, detail); };
async function startMatch(P, N, D = 0) {
  await ev((P, N, D) => {
    for (const s of window.game.scene.getScenes(true)) window.game.scene.stop(s.sys.settings.key);
    window.game.scene.start('ArenaScene', { elementId: P, enemyElementId: N, difficulty: D });
  }, P, N, D);
  await sleep(1500);
  await ev(() => { window.game.loop.sleep(); window.__t = performance.now(); });
}
const step = (n) => ev((n) => { for (let i = 0; i < n; i++) { window.__t += 16; window.game.loop.step(window.__t); } }, n);
const sc = (fn, ...a) => ev((src, ...a) => { const sc = window.game.scene.getScene('ArenaScene'); return (new Function('sc', ...a.map((_, i) => 'a' + i), 'return (' + src + ')(sc,' + a.map((_, i) => 'a' + i).join(',') + ')'))(sc, ...a); }, fn.toString(), ...a);
const shot = async (name) => { if (SHOTS) { await step(1); await page.screenshot({ path: `${SHOTS}/${name}.png` }); } };
const still = () => sc((sc) => {
  sc.npc.doAI = () => { sc.npc.body.setVelocity(0, 0); return null; };
  sc.npc.speed = 0; sc.npc.maxHp = 5000; sc.npc.hp = 5000;
  sc.npc.setPosition(560, 320); sc.player.setPosition(300, 320);
  sc.slimeKit.handleInput = () => {};
});

console.log('\n[1] player Venom vs a still Fire bot');
await startMatch('slime', 'fire');
await step(10);
await still();
await step(5);
check('kit + masked avatar', await sc((sc) => !!sc.slimeKit && !!sc.slimeKit.playerAvatar));
check('five abilities, new ids', (await sc((sc) => sc.player.element.abilities.map((a) => a.id).join(','))) === 'venom-inject,pick-your-poison,acid-reflux,venom-burrow,acid-apocalypse');
await shot('01-idle');

// Inject: three shots, then the reload refuses a fourth.
const hp0 = await sc((sc) => sc.npc.hp);
for (let i = 0; i < 3; i++) { await sc((sc) => sc.slimeKit.doInject('player', sc.npc.x, sc.npc.y)); await step(8); if (i === 0) await shot('02-inject'); }
const s1 = await sc((sc) => { const s = sc.slimeKit.sides.player; return { ammo: s.ammo, reloading: s.reloadUntil > sc.time.now, blobs: sc.slimeKit.blobs.length }; });
check('third shot empties the barrel and starts the reload', s1.ammo === 0 && s1.reloading, JSON.stringify(s1));
await sc((sc) => sc.slimeKit.doInject('player', sc.npc.x, sc.npc.y));
await step(2);
await shot('03-reload-stab');
await step(30);
const s2 = await sc((sc) => ({ hp: sc.npc.hp, tox: sc.npc.toxinStacks, cov: sc.slimeKit.coverage('player'), onAcid: sc.slimeKit.sides.player.grid.isAcid(sc.npc.x, sc.npc.y) }));
check('3 hits: 36 damage (+floor), 6+ toxin, puddle under target, a refused 4th', hp0 - s2.hp >= 36 && hp0 - s2.hp < 48 + 6 && s2.tox >= 6 && s2.tox < 10 && s2.onAcid, JSON.stringify({ lost: hp0 - s2.hp, ...s2 }));
const tr = await sc((sc) => { const g = sc.slimeKit.sides.player.grid; const row = []; for (let x = 360; x < 550; x += 16) { const k = (x - sc.player.x) / (sc.npc.x - sc.player.x); row.push(g.isAcid(x, sc.player.y + (sc.npc.y - sc.player.y) * k) ? 1 : 0); } return { row: row.join(''), p: [Math.round(sc.player.x), Math.round(sc.player.y)], n: [Math.round(sc.npc.x), Math.round(sc.npc.y)] }; });
check('trickle laid along the flight path', !tr.row.includes('0'), JSON.stringify(tr));
await step(60);
check('reload refills the barrel', (await sc((sc) => sc.slimeKit.sides.player.ammo)) === 3);

// Pick Your Poison: the four quadrants.
const picks = [];
for (const [dx, dy] of [[0, -100], [100, 0], [0, 100], [-100, 0]]) {
  picks.push(await sc((sc, dx, dy) => { sc.slimeKit.doPoison('player', sc.player.x + dx, sc.player.y + dy); return sc.slimeKit.sides.player.loaded; }, dx, dy));
}
check('wheel: up/right/down/left = rot/para/purge/melt', picks.join(',') === '0,1,2,3', picks.join(','));
await sc((sc) => { sc.slimeKit.sides.player.wheelOpen = true; sc.slimeKit.sides.player.wheelAt = sc.time.now; sc.slimeKit.sides.player.aimX = sc.player.x; sc.slimeKit.sides.player.aimY = sc.player.y - 100; });
await step(20);
await shot('04-wheel');
await sc((sc) => { sc.slimeKit.sides.player.wheelOpen = false; });

// Each poison lands through an Inject shot.
const fire = async (kind) => {
  await sc((sc, kind) => { const k = sc.slimeKit; const s = k.sides.player; s.ammo = 3; s.reloadUntil = 0; s.loaded = kind; s.loadedShots = 1; k.doInject('player', sc.npc.x, sc.npc.y); }, kind);
  await step(30);
};
await sc((sc) => { sc.npc.toxinStacks = 0; });
await fire(0);
const r0 = await sc((sc) => ({ left: sc.npc.venomRotUntil - sc.time.now, loaded: sc.slimeKit.sides.player.loaded }));
check('Disintegrating applied (~5s, stretched by toxin) and the load is spent', r0.left > 4400 && r0.left < 5600 && r0.loaded === null, JSON.stringify(r0));
const hpR = await sc((sc) => sc.npc.hp);
await step(200);
const r1 = await sc((sc) => ({ hp: sc.npc.hp, stacks: sc.npc.venomVulnStacks, mult: sc.npc.venomVulnMult() }));
check('rot ticks 5 and stacks 3% vulnerability', hpR - r1.hp >= 15 && r1.stacks >= 3 && r1.mult > 1.08, JSON.stringify({ lost: hpR - r1.hp, ...r1 }));
await shot('05-rot');
await fire(1);
const p1 = await sc((sc) => ({ para: sc.npc.venomParalyzedUntil > sc.time.now, blocked: sc.npc.mobilityBlockedUntil > sc.time.now, walk: sc.npc.walkSpeedMult, slip: sc.npc.inkSlipUntil > Date.now() }));
check('Paralyzing: mobility blocked; slow + slip on acid', p1.para && p1.blocked && p1.walk <= 0.6 && p1.slip, JSON.stringify(p1));
await sc((sc) => { sc.npc.shieldHp = 40; sc.npc.shieldCharges = 2; });
await fire(2);
const pg = await sc((sc) => ({ purged: sc.npc.purgedUntil > sc.time.now, sh: sc.npc.shieldHp, ch: sc.npc.shieldCharges }));
check('Purging strips shields', pg.purged && pg.sh === 0 && pg.ch === 0, JSON.stringify(pg));
await sc((sc) => { sc.npc.shieldHp = 40; });
await step(30);
check('…and keeps them off while it lasts', (await sc((sc) => sc.npc.shieldHp)) === 0);
await fire(3);
const m1 = await sc((sc) => ({ melting: sc.npc.venomMeltingUntil > sc.time.now, mult: sc.npc.venomMeltIncomingMult }));
check('Melting: double damage on acid', m1.melting && m1.mult === 2, JSON.stringify(m1));
await shot('06-all-poisons');

// Toxin stretches a fresh debuff.
await sc((sc) => { sc.npc.toxinStacks = 100; sc.npc.venomParalyzedUntil = 0; });
await step(3);
await sc((sc) => { sc.npc.burningUntil = sc.time.now + 3000; });
await step(3);
const burn = await sc((sc) => sc.npc.burningUntil - sc.time.now);
check('100 toxin: a 3s burn becomes ~9s', burn > 8500 && burn < 9100, `${Math.round(burn)}ms`);
await step(20);
const burn2 = await sc((sc) => sc.npc.burningUntil - sc.time.now);
check('…and is stretched once, not every frame', burn2 < burn, `${Math.round(burn2)}ms`);

// Bomb: held, thrown, shot into clusters.
await sc((sc) => { sc.npc.toxinStacks = 0; sc.npc.setPosition(840, 320); sc.slimeKit.holdBomb('player'); });
await step(20);
check('bomb is held', await sc((sc) => sc.slimeKit.sides.player.bombHeld));
await shot('07-bomb-held');
await sc((sc) => sc.slimeKit.doBomb('player', sc.npc.x, sc.npc.y));
await step(12);
await sc((sc) => { const k = sc.slimeKit; const s = k.sides.player; s.ammo = 3; s.reloadUntil = 0; const aim = k.bombs[0]; k.doInject('player', aim.x + 60, aim.y); });
await step(14);
await shot('08-cluster');
const c1 = await sc((sc) => ({ clustered: sc.slimeKit.bombs[0]?.clustered ?? null, lets: sc.slimeKit.bomblets.length }));
check('an Inject shot bursts the flying bomb into 5 bomblets', c1.clustered === true && c1.lets === 5, JSON.stringify(c1));
const hpB = await sc((sc) => sc.npc.hp);
const covB = await sc((sc) => sc.slimeKit.coverage('player'));
await step(90);
const b1 = await sc((sc) => ({ hp: sc.npc.hp, tox: sc.npc.toxinStacks, bombs: sc.slimeKit.bombs.length, lets: sc.slimeKit.bomblets.length, cov: sc.slimeKit.coverage('player') }));
check('bomb bursts on the target: damage, toxin, a lot more acid', hpB - b1.hp >= 25 && b1.tox >= 5 && b1.bombs === 0 && b1.lets === 0 && b1.cov > covB + 0.02, JSON.stringify({ lost: hpB - b1.hp, ...b1, covB }));
await shot('09-crater');

// Burrow and the bite.
await sc((sc) => { const k = sc.slimeKit; sc.npc.setPosition(840, 320); sc.player.setPosition(790, 320); sc.npc.toxinStacks = 40; sc.npc.venomMeltingUntil = sc.time.now + 8000; });
await step(5);
await sc((sc) => { sc.npc.venomMeltingUntil = sc.time.now + 1000; });
await step(2);
await sc((sc) => sc.slimeKit.doBurrow('player'));
await step(10);
const u1 = await sc((sc) => ({ under: sc.slimeKit.isBurrowed('player'), inv: sc.player.isInvincible, spd: sc.slimeKit.getPlayerSpeedMult() }));
check('burrowed: invincible, ×1.35', u1.under && u1.inv && Math.abs(u1.spd - 1.35) < 0.001, JSON.stringify(u1));
await sc((sc) => sc.slimeKit.doInject('player', sc.npc.x, sc.npc.y));
check('no attacking underground', (await sc((sc) => sc.slimeKit.blobs.length)) === 0);
await shot('10-burrowed');
const hpU = await sc((sc) => sc.npc.hp);
await sc((sc) => sc.slimeKit.surface('player'));
await step(3);
await shot('11-bite');
const u2 = await sc((sc) => ({ lost: 0, hp: sc.npc.hp, tox: sc.npc.toxinStacks, melt: sc.npc.venomMeltingUntil - sc.time.now, inv: sc.player.isInvincible }));
check('bite: 30+ damage (×2 melting on acid), toxin ×1.25, Melting restored to full', hpU - u2.hp >= 30 && Math.abs(u2.tox - 50) < 1.5 && u2.melt > 7000 && !u2.inv, JSON.stringify({ ...u2, lost: hpU - u2.hp }));

// Rain still works.
await sc((sc) => sc.slimeKit.doApocalypse('player'));
const hpQ = await sc((sc) => sc.npc.hp);
await step(70);
check('acid rain hits a target on acid', (await sc((sc) => sc.npc.hp)) < hpQ - 10);
await shot('12-rain');

console.log('\n[2] a Venom bot vs the player');
await startMatch('fire', 'slime', 3);
await step(10);
await sc((sc) => { sc.player.maxHp = 9000; sc.player.hp = 9000; });
let casts = {};
for (let i = 0; i < 120; i++) {
  await sc((sc) => { for (const id of ['venom-inject', 'pick-your-poison', 'acid-reflux', 'venom-burrow', 'acid-apocalypse']) sc.npc.resetCooldown(id); sc.npc.ultCharge = 9999; });
  await step(10);
  const snap = await sc((sc) => { const k = sc.slimeKit; const s = k.sides.npc; return { loaded: s.loaded, bombs: k.bombs.length, lets: k.bomblets.length, under: s.burrowed, cov: k.coverage('npc'), tox: sc.player.toxinStacks, rain: s.rainUntil > sc.time.now }; });
  if (snap.loaded !== null) casts.poison = true;
  if (snap.bombs > 0) casts.bomb = true;
  if (snap.lets > 0) casts.cluster = true;
  if (snap.under) casts.burrow = true;
  if (snap.rain) casts.rain = true;
  casts.cov = snap.cov; casts.tox = snap.tox;
  if (i === 50) await shot('13-bot');
}
check('bot: loads poisons, throws bombs, lays acid, lays toxin', !!casts.poison && !!casts.bomb && casts.cov > 0.01 && casts.tox > 0, JSON.stringify(casts));
check('bot: shoots its own bomb into clusters', !!casts.cluster, JSON.stringify(casts));
await shot('14-bot-late');

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed, ${errors.length} page error(s)`);
await page.close();
await browser.disconnect();
process.exit(results.every((r) => r.ok) && errors.length === 0 ? 0 : 1);
