// Headless smoke test for Fear (element id `silence`). Needs the dev server and Chrome on :9222.
//   node .verify-fear.mjs [screenshot-dir]
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
async function startMatch(P, N) {
  await ev((P, N) => {
    for (const s of window.game.scene.getScenes(true)) window.game.scene.stop(s.sys.settings.key);
    window.game.scene.start('ArenaScene', { elementId: P, enemyElementId: N, difficulty: 0 });
  }, P, N);
  await sleep(1500);
  await ev(() => { window.game.loop.sleep(); window.__t = performance.now(); });
}
const step = (n) => ev((n) => { for (let i = 0; i < n; i++) { window.__t += 16; window.game.loop.step(window.__t); } }, n);
const sc = (fn, ...a) => ev((src, ...a) => { const sc = window.game.scene.getScene('ArenaScene'); return (new Function('sc', ...a.map((_, i) => 'a' + i), 'return (' + src + ')(sc,' + a.map((_, i) => 'a' + i).join(',') + ')'))(sc, ...a); }, fn.toString(), ...a);
const shot = async (name) => { if (SHOTS) { await step(1); await page.screenshot({ path: `${SHOTS}/${name}.png` }); } };

console.log('\n[1] player Fear vs a still Fire bot');
await startMatch('silence', 'fire');
await step(10);
check('kit + avatar', await sc((sc) => !!sc.fearKit && !!sc.fearKit.playerAvatar));
await sc((sc) => { sc.npc.doAI = () => { sc.npc.body.setVelocity(0, 0); return null; }; sc.npc.speed = 0; sc.npc.body.setVelocity(0, 0); sc.npc.maxHp = 5000; sc.npc.hp = 5000; sc.npc.setPosition(520, 320); sc.player.setPosition(300, 320); });
await sc((sc) => { const k = sc.fearKit; k.doPhobia('player', 600, 320); k.doPhobia('player', 520, 240); k.doPhobia('player', 440, 380); });
await step(30);
check('3 phobias', (await sc((sc) => sc.fearKit.sides.player.phobias.length)) === 3);
await shot('01-phobias');
const hp0 = await sc((sc) => sc.npc.hp);
await sc((sc) => sc.fearKit.doGrasp('player', sc.npc.x, sc.npc.y));
await step(20);
await shot('02-grasp');
await step(20);
const f1 = await sc((sc) => sc.fearKit.fearOf(sc.npc));
check('grasp hit and scared', f1 >= 10 && (await sc((sc) => sc.npc.hp)) < hp0, `fear ${f1}`);
await sc((sc) => sc.fearKit.doGaze('player'));
await step(60);
await shot('03-gaze');
await step(140);
const v = await sc((sc) => { const v = sc.fearKit.victims.get(sc.npc); return { fear: v.fear, frozen: v.frozenUntil > sc.time.now, gaze: v.gazeMs }; });
check('gaze: fear up + jumpscare freeze', v.fear >= 60 && v.frozen, JSON.stringify(v));
await step(60);
const hpP = await sc((sc) => { sc.player.hp = 50; return sc.player.hp; });
await step(120);
check('reassurance drains + heals', (await sc((sc) => sc.player.hp)) > hpP);
await shot('04-drain');
// full fear -> flee
await sc((sc) => { const v = sc.fearKit.victims.get(sc.npc); v.fear = 100; v.frozenUntil = 0; sc.player.setPosition(sc.npc.x - 100, sc.npc.y); });
await step(5);
check('flee at full fear', await sc((sc) => sc.fearKit.victims.get(sc.npc).fleeing && sc.npc.fearFleeUntil > Date.now()));
await step(200);
// manifest
await sc((sc) => { sc.fearKit.victims.get(sc.npc).fear = 80; sc.fearKit.doManifest('player'); });
await step(30);
const m = await sc((sc) => { const s = sc.fearKit.sides.player; return { form: s.form, rune: !!s.rune, inv: sc.player.isInvincible, lbl: sc.abilityBars[0].lbl.text, spd: sc.fearKit.getPlayerSpeedMult() }; });
check('manifest: slasher, rune, invincible, tray relabelled, 25% speed', m.form === 'slasher' && m.rune && m.inv && /Massacre/.test(m.lbl) && Math.abs(m.spd - 0.25) < 0.01, JSON.stringify(m));
await shot('05-slasher');
// The harness has no real cursor (pointer.worldX is 0), so aim is set by hand from here on.
await sc((sc) => { sc.fearKit.handleInput = () => {}; sc.npc.setPosition(760, 520); sc.player.setPosition(690, 520); });
const hp1 = await sc((sc) => sc.npc.hp);
// Massacre is a stab: the point goes to the cursor, and wounds the part it lands on. [head, heart, armL, armR, legL, legR]
const W = () => sc((sc) => [...(sc.fearKit.victims.get(sc.npc)?.wounds ?? [])]);
const stabAt = async (dx, dy) => { await sc((sc, dx, dy) => sc.fearKit.doMassacre('player', sc.npc.x + dx, sc.npc.y + dy), dx, dy); await step(6); };
await stabAt(0, 14);
await shot('06-massacre');
check('massacre hits', (await sc((sc) => sc.npc.hp)) <= hp1 - 28);
const r = await sc((sc) => sc.npc.body.radius || 20);
await sc((sc) => { sc.fearKit.victims.get(sc.npc).wounds = [0, 0, 0, 0, 0, 0]; });
await stabAt(-r * 0.4, r * 0.7);
let w = await W();
check('stab low-left damages the left leg only', w[4] === 35 && w[0] + w[1] + w[2] + w[3] + w[5] === 0, JSON.stringify(w));
await stabAt(0, -r * 0.7);
w = await W();
check('stab high damages the head', w[0] === 35, JSON.stringify(w));
await stabAt(0, 0);
w = await W();
check('stab dead centre finds the heart (lightly)', w[1] === 20, JSON.stringify(w));
const hand = await sc((sc) => { const h = sc.fearKit.handsOf(sc.npc)[0]; return { dx: h.x - sc.npc.x, dy: h.y - sc.npc.y }; });
await stabAt(hand.dx, hand.dy);
w = await W();
check('stab on a hand damages that arm', (hand.dx < 0 ? w[2] : w[3]) === 35, JSON.stringify({ hand, w }));
await sc((sc) => sc.fearKit.doMassacre('player', sc.npc.x + 300, sc.npc.y + 300));
await step(6);
check('a stab that misses wounds nothing', JSON.stringify(await W()) === JSON.stringify(w));
// effects
await sc((sc) => { sc.fearKit.victims.get(sc.npc).wounds = [35, 100, 35, 100, 100, 0]; });
await step(3);
const fx1 = await sc((sc) => ({ cd: sc.npc.fearCooldownMult, heart: sc.npc.fearHeartMult, taken: sc.npc.fearIncomingMult(), spd: sc.fearKit.getNpcSpeedMult(), swim: sc.npc.hallucinatingUntil > Date.now(), rate: sc.fearKit.bleedRate(sc.fearKit.victims.get(sc.npc)) }));
check('arms → cooldowns, heart → damage taken, legs+head → slow, head → swim', Math.abs(fx1.cd - 1.37) < 0.001 && fx1.heart === 1.3 && fx1.taken >= 1.3 && Math.abs(fx1.spd - 0.78 * 0.94) < 0.001 && fx1.swim, JSON.stringify(fx1));
check('bleed: 3 severe (one the heart), 5 hurt → 2.1%/s', Math.abs(fx1.rate - 1.5 * 1.4) < 0.001, `${fx1.rate}`);
// The percentage is of at most 400 max hp (this dummy has 5000): 2.1% of 400 = 8.4 a second. No fear, so no drain on top.
// Their own severe heart makes the bleed hit 30% harder: ~10.9 a second.
const hpB = await sc((sc) => { sc.fearKit.victims.get(sc.npc).fear = 0; sc.npc.fearFleeUntil = 0; return sc.npc.hp; });
await step(190);
const bled = hpB - (await sc((sc) => sc.npc.hp));
check('severe parts bleed % of max hp and leave puddles', bled >= 30 && bled <= 36 && (await sc((sc) => sc.fearKit.puddles.length)) >= 2, `bled ${bled} in 3s`);
await shot('07-bleeding-chart');
const cut0 = await sc((sc) => ({ st: sc.fearKit.sides.player.speedStacks, n: sc.fearKit.sides.player.phobias.length }));
await sc((sc) => { const p = sc.fearKit.sides.player.phobias[0]; sc.player.setPosition(p.x - 60, p.y); sc.fearKit.doMassacre('player', p.x, p.y); });
await step(5);
check('running a phobia through: +15% speed', await sc((sc, a) => sc.fearKit.sides.player.speedStacks === a.st + 1 && sc.fearKit.sides.player.phobias.length === a.n - 1, cut0));
// haunt -> hook spin -> drag -> slam
await sc((sc) => { sc.fearKit.victims.get(sc.npc).wounds = [0, 0, 0, 0, 100, 0]; sc.npc.setPosition(480, 330); sc.player.setPosition(sc.npc.x - 200, sc.npc.y); sc.npc.facingAngle = 0; sc.fearKit.doHaunt('player'); });
await step(100);
const ch = await sc((sc) => sc.fearKit.sides.player.haunt?.charge ?? -1);
await sc((sc) => { sc.fearKit.sides.player.haunt.charge = 1; sc.fearKit.releaseHaunt('player'); });
await step(3);
const sp = await sc((sc) => { const s = sc.fearKit.sides.player.spin; return s ? s.until - s.start : -1; });
check('haunt charged; letting go spins the hook (full charge 4.2s)', ch > 0.2 && sp === 4200, `charge ${ch.toFixed(2)} spin ${sp}`);
await step(60);
check('out of reach, the hook catches nobody', await sc((sc) => !sc.fearKit.sides.player.drag && !!sc.fearKit.sides.player.spin));
await shot('08-hook-spin');
await sc((sc) => sc.player.setPosition(sc.npc.x - 70, sc.npc.y));
await step(50);
check('in reach, it catches: dragging', await sc((sc) => sc.fearKit.sides.player.drag?.victim === sc.npc && !sc.fearKit.sides.player.spin));
for (let i = 0; i < 20; i++) { await sc((sc) => sc.player.setPosition(sc.player.x - 6, sc.player.y)); await step(2); }
await shot('09-drag');
const dg = await sc((sc) => ({ d: Math.hypot(sc.npc.x - sc.player.x, sc.npc.y - sc.player.y), px: sc.player.x, spd: sc.fearKit.getPlayerSpeedMult() }));
check('the victim comes along on a 50px chain; hauling is 1.5x slasher speed', dg.d <= 52 && dg.px < 300 && Math.abs(dg.spd - 0.25 * 1.15 * 1.5) < 0.01, JSON.stringify(dg));
const hpS = await sc((sc) => sc.npc.hp);
const wS = await W();
await sc((sc) => { const s = sc.fearKit.sides.player; s.aimX = sc.player.x + 100; s.aimY = sc.player.y; sc.fearKit.doHaunt('player'); });
await step(4);
const sl = await sc((sc) => ({ drag: !!sc.fearKit.sides.player.drag, dx: sc.npc.x - sc.player.x, hp: sc.npc.hp }));
w = await W();
check('recast slams them down in front: 22 dmg, every part lightly', !sl.drag && sl.dx > 40 && sl.hp <= hpS - 22 && w.every((x, i) => x === Math.min(100, wS[i] + 10)), JSON.stringify({ sl, w }));
// drag onto a butcher's hook
const hk = await sc((sc) => sc.fearKit.hookSpots()[0]);
await sc((sc, hk) => { sc.npc.setPosition(hk.x + 120, hk.y); sc.player.setPosition(hk.x + 60, hk.y); sc.fearKit.startDrag('player', sc.npc); }, hk);
await step(3);
for (let i = 0; i < 30 && !(await sc((sc) => sc.fearKit.snared(sc.npc))); i++) { await sc((sc) => sc.player.setPosition(sc.player.x - 6, sc.player.y)); await step(2); }
check('dragged onto a butcher\'s hook: hung, drag over', await sc((sc) => sc.fearKit.snared(sc.npc) && !sc.fearKit.sides.player.drag));
const hpH = await sc((sc) => sc.npc.hp);
await sc((sc) => sc.fearKit.doMassacre('player', sc.npc.x, sc.npc.y));
await step(6);
check('the slasher cannot hurt them on the hook', (await sc((sc) => sc.npc.hp)) >= hpH - 60 && JSON.stringify(await W()) === JSON.stringify(w), `hp ${hpH} -> ${await sc((sc) => sc.npc.hp)}`);
await step(60);
await shot('10-hung');
const hpH2 = await sc((sc) => { sc.npc.fearFleeUntil = 0; return sc.npc.hp; });
await step(125);
const hungBleed = hpH2 - (await sc((sc) => sc.npc.hp));
check('…but they bleed three times as fast (1 severe leg: 1.2/s → 3.6/s)', hungBleed >= 6 && hungBleed <= 9, `bled ${hungBleed} in 2s`);
await step(60);
check('off the hook after 3s', await sc((sc) => !sc.fearKit.snared(sc.npc)));
// signature
await sc((sc) => { sc.fearKit.doSignature('player'); });
await step(5);
await sc((sc) => { const s = sc.fearKit.sides.player; s.aimX = sc.npc.x; s.aimY = sc.npc.y; });
await step(5);
await shot('08-signature');
const hp2 = await sc((sc) => sc.npc.hp);
await sc((sc) => sc.fearKit.armSignature('player'));
await step(110);
const wSig = await W();
check('signature line catches without ending the move, and wounds one part (never the heart) by 60', (await sc((sc) => sc.npc.hp)) < hp2 && (await sc((sc) => sc.fearKit.sides.player.sig !== null)) && wSig[1] === w[1] && wSig.reduce((a, x, i) => a + (x - w[i]), 0) > 0 && wSig.filter((x, i) => x !== w[i]).length === 1, JSON.stringify(wSig));
// rune
await sc((sc) => { const r = sc.fearKit.sides.player.rune; sc.npc.setPosition(r.x, r.y); });
await step(150);
check('standing on the rune ends the slasher', await sc((sc) => sc.fearKit.sides.player.form === 'fear' && !sc.player.isInvincible && /Phobia/.test(sc.abilityBars[0].lbl.text)));
// the hole and the maze
await sc((sc) => { sc.npc.setPosition(200, 200); sc.fearKit.victims.get(sc.npc).fear = 80; sc.player.resetCooldown('fear-manifest'); sc.fearKit.doManifest('player'); sc.fearKit.doFall('player'); });
await step(60);
await shot('09-hole');
await sc((sc) => { const h = sc.fearKit.sides.player.hole; sc.npc.setPosition(h.x, h.y); });
await step(5);
check('falling in opens the maze', await sc((sc) => !!sc.fearKit.maze));
await ev(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW', keyCode: 87 })));
await step(120);
await shot('10-maze-hunter');
check('maze runs (hunter view)', await sc((sc) => !!sc.fearKit.maze && sc.fearKit.maze.run.timeLeftMs < 45000));
await sc((sc) => { const r = sc.fearKit.maze.run; r.victim.x = r.hunter.x; r.victim.y = r.hunter.y; r.botGoal = null; });
await step(3);
check('catch -> REDACTED', await sc((sc) => !!sc.fearKit.redacted));
await step(60);
await shot('11-redacted');
const hp3 = await sc((sc) => sc.npc.hp);
await step(160);
check('back in the arena, 75 dealt', await sc((sc) => !sc.fearKit.maze && !sc.fearKit.redacted) && (await sc((sc) => sc.npc.hp)) <= hp3 - 60, `hp ${hp3} -> ${await sc((sc) => sc.npc.hp)}`);
check('caught in the maze: every part severe', (await W()).every((x) => x === 100), JSON.stringify(await W()));
await shot('12-all-severe');
await sc((sc) => sc.fearKit.doDescent('player'));
await step(20);
// claustrophobia
await sc((sc) => { sc.npc.setPosition(700, 500); sc.fearKit.doPhobia('player', 300, 200); sc.fearKit.doPhobia('player', 660, 420); sc.fearKit.doClaustro('player'); });
await step(240);
await shot('12-claustro');
const nPh = await sc((sc) => sc.fearKit.sides.player.phobias.length);
const cl = await sc((sc) => { const s = sc.fearKit.sides.player; return { on: !!s.claustro, statues: s.phobias.filter((p) => p.statue).length, real: s.phobias.filter((p) => p.statue?.real).length, b: sc.npc.x }; });
check('claustrophobia: walls + statues, half occupied', cl.on && cl.statues >= 2 && cl.real === Math.floor(cl.statues / 2), JSON.stringify(cl));
await sc((sc) => { const p = sc.fearKit.sides.player.phobias.find((q) => q.statue.real); sc.npc.setPosition(p.x + 30, p.y); });
await step(230);
await shot('13-statue-bleeds');
check('an occupied statue bleeds when watched, and breaks under contact', await sc((sc) => !sc.fearKit.sides.player.claustro) && (await sc((sc) => sc.fearKit.sides.player.phobias.length)) === nPh - 1);
await step(60);

console.log('\n[2] Fire player vs a Fear bot (AI on)');
await startMatch('fire', 'silence');
await step(600);
// A bot that has already manifested may have cut its own phobias down for the speed.
check('bot is playing its kit', await sc((sc) => sc.fearKit.sides.npc.phobias.length > 0 || sc.fearKit.sides.npc.form === 'slasher' || sc.fearKit.fearOf(sc.player) > 0));
await sc((sc) => { sc.player.maxHp = 9000; sc.player.hp = 9000; sc.fearKit.addFear('npc', sc.player, 70); });
await step(400);
await shot('20-bot-fear');
const b = await sc((sc) => ({ form: sc.fearKit.sides.npc.form, dark: !!sc.fearKit.darkRect?.visible, fear: sc.fearKit.fearOf(sc.player) }));
check('bot manifests; the player is in the dark', b.form === 'slasher' && b.dark, JSON.stringify(b));
await shot('21-flashlight');
await step(1500);
await sc((sc) => { const s = sc.fearKit.sides.npc; if (s.form !== 'slasher') { sc.npc.resetCooldown('fear-manifest'); sc.fearKit.victims.get(sc.player).fear = 90; sc.fearKit.doManifest('npc'); } s.hole = null; sc.fearKit.doFall('npc'); });
await step(5);
await sc((sc) => { const h = sc.fearKit.sides.npc.hole; if (h) sc.player.setPosition(h.x, h.y); });
await step(120);
check('player falls: victim view', await sc((sc) => !!sc.fearKit.maze && sc.fearKit.maze.owner === 'npc'));
await shot('22-maze-victim');
await sc((sc) => { const r = sc.fearKit.maze.run; r.hunter.x = r.victim.x + Math.cos(r.victim.yaw) * 1.6; r.hunter.y = r.victim.y + Math.sin(r.victim.yaw) * 1.6; r.hunter.yaw = r.victim.yaw + Math.PI; r.botGoal = null; });
await step(2);
await shot('23-maze-slasher-close');
await step(400);
await shot('24-after');
check('maze resolved', await sc((sc) => !sc.fearKit.maze || sc.fearKit.maze.run.timeLeftMs < 40000));
await sc((sc) => { sc.fearKit.showScare(0); });
await step(4);
await shot('25-jumpscare');
await step(2000);

console.log('\n[3] mirror: Fear vs Fear bot, long run');
await startMatch('silence', 'silence');
await step(3000);
check('mirror ran', true);

const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} checks passed, ${errors.length} page errors`);
await ev(() => window.game.loop.wake());
await page.close();
await browser.disconnect();
process.exit(bad.length || errors.length ? 1 : 0);
