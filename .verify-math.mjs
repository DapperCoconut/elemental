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


const key = (k) => ev((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), k);
const typeNum = async (n) => { for (const ch of String(n)) await key(ch); };

console.log('\n[1] math vs fire');
await startMatch('magic', 'fire');
await step(10);
check('kit + avatar', await sc((sc) => !!sc.mathKit && !!sc.mathKit.playerAvatar));
await sc((sc) => { sc.npc.doAI = () => null; sc.npc.speed = 0; });
await page.mouse.move(640, 400);
await step(3);
const aim = await sc((sc) => ({ x: sc.mathKit.sides.player.aimX, y: sc.mathKit.sides.player.aimY, b: sc.physics.world.bounds }));
console.log('   aim', JSON.stringify(aim));
check('slate has a problem', await sc((sc) => !!sc.mathKit.sides.player.problem));
// wrong answer wipes, right answer makes a pillar
const ans = await sc((sc) => sc.mathKit.sides.player.problem.answer);
await typeNum(ans);
check('typed answer -> 1 pillar', (await sc((sc) => sc.mathKit.sides.player.pillars)) === 1);
for (let i = 0; i < 6; i++) { const a = await sc((sc) => sc.mathKit.sides.player.problem.answer); await typeNum(a); }
check('caps at 5', (await sc((sc) => sc.mathKit.sides.player.pillars)) === 5, String(await sc((sc) => sc.mathKit.sides.player.pillars)));
// volley through the npc, which is parked on the aim point
const ax = Math.min(Math.max(aim.x, 120), 840), ay = Math.min(Math.max(aim.y, 120), 520);
await sc((sc, ax, ay) => { sc.npc.body.reset(ax, ay); sc.player.body.reset(ax - 250, ay); sc.mathKit.sides.player.aimX = ax; sc.mathKit.sides.player.aimY = ay; }, ax, ay);
let hp0 = await sc((sc) => sc.npc.hp);
await sc((sc, ax, ay) => { sc.mathKit.sides.player.aimX = ax; sc.mathKit.sides.player.aimY = ay; sc.mathKit.doCrunch('player', ax, ay); }, ax, ay);
await step(40);
let hp1 = await sc((sc) => sc.npc.hp);
check('5 pillars = 40 damage', hp0 - hp1 === 40, `${hp0} -> ${hp1}`);
check('ring emptied, flights gone', await sc((sc) => sc.mathKit.sides.player.pillars === 0 && sc.mathKit.flights.length === 0));

// graph
check('starts at y = x', (await sc((sc) => sc.mathKit.sides.player.degree)) === 1);
await sc((sc) => sc.mathKit.doIntegrate('player')); await step(40);
check('integrate -> degree 2', (await sc((sc) => sc.mathKit.sides.player.degree)) === 2);
// rate: npc at bottom centre is under x^2 bowl (bowl floor is centre line); top centre is not
await sc((sc) => { const b = sc.physics.world.bounds; sc.npc.body.reset(b.centerX, b.bottom - 40); sc.knocks; sc.mathKit.knocks.clear(); });
hp0 = await sc((sc) => sc.npc.hp);
await sc((sc) => sc.mathKit.doRate('player')); await step(70);
hp1 = await sc((sc) => sc.npc.hp);
check('rate burns under the curve', hp0 - hp1 >= 9, `${hp0} -> ${hp1}`);
await sc((sc) => { const b = sc.physics.world.bounds; sc.npc.body.reset(b.centerX, b.top + 40); });
hp0 = await sc((sc) => sc.npc.hp); await step(60); hp1 = await sc((sc) => sc.npc.hp);
check('rate spares above the curve', hp0 === hp1, `${hp0} -> ${hp1}`);
await step(140);
// derive: npc on the curve (bowl floor at centre)
await sc((sc) => { const b = sc.physics.world.bounds; sc.npc.body.reset(b.centerX, b.centerY); });
hp0 = await sc((sc) => sc.npc.hp);
await sc((sc) => sc.mathKit.doDerive('player')); await step(120);
hp1 = await sc((sc) => sc.npc.hp);
check('derive bombs hit on the old curve', hp0 - hp1 >= 12, `${hp0} -> ${hp1}`);
check('derive -> degree 1, bombs cleared', await sc((sc) => sc.mathKit.sides.player.degree === 1 && sc.mathKit.bombs.length === 0), String(await sc((sc) => sc.mathKit.bombs.length)));
await sc((sc) => { sc.mathKit.doDerive('player'); }); await step(90);
await sc((sc) => { sc.mathKit.doDerive('player'); }); await step(90);
check('flat line derives back to y = x', (await sc((sc) => sc.mathKit.sides.player.degree)) === 1);

// 42 on a bot
await sc((sc) => sc.mathKit.doFortyTwo('player')); await step(10);
check('cine up, npc frozen + invincible', await sc((sc) => !!sc.mathKit.cine && sc.npc.isInvincible));
await step(130);
check('cine over, exam rolling, invincibility returned', await sc((sc) => !sc.mathKit.cine && sc.mathKit.exams.player?.mode === 'roll' && !sc.npc.isInvincible));
hp0 = await sc((sc) => sc.npc.hp);
for (let i = 0; i < 30 && await sc((sc) => !!sc.mathKit.exams.player); i++) { await sc((sc) => { const e = sc.mathKit.exams.player; if (e) e.rollPass = false; }); await step(30); }
hp1 = await sc((sc) => sc.npc.hp);
check('five fails = 100 damage', hp0 - hp1 === 100, `${hp0} -> ${hp1}`);

console.log('\n[2] fire vs math (bot)');
await startMatch('fire', 'magic');
await step(10);
check('npc avatar', await sc((sc) => !!sc.mathKit.npcAvatar));
await step(700);
check('bot ran 11s without errors', errors.length === 0, errors.slice(0, 2).join(' | '));
console.log('   bot state', JSON.stringify(await sc((sc) => ({ pil: sc.mathKit.sides.npc.pillars, deg: sc.mathKit.sides.npc.degree, php: sc.player.hp, exam: !!sc.mathKit.exams.npc }))));
// bot's exam on the human
await sc((sc) => { sc.npc.doAI = () => null; sc.mathKit.exams.npc = null; sc.mathKit.endCine(); sc.mathKit.doFortyTwo('npc'); });
await step(135);
check('interactive exam for the human', (await sc((sc) => sc.mathKit.exams.npc?.mode)) === 'interactive');
await step(30);
let a1 = await sc((sc) => { const e = sc.mathKit.exams.npc; return e.askedAt > 0 ? e.problems[e.index].answer : null; });
hp0 = await sc((sc) => sc.player.hp);
await typeNum(a1); await key('Enter'); await step(5);
check('right answer passes, no damage', await sc((sc) => sc.mathKit.exams.npc.results[0] === true) && (await sc((sc) => sc.player.hp)) === hp0);
await step(60);
await typeNum(1); await key('Enter'); await step(5);
hp1 = await sc((sc) => sc.player.hp);
check('wrong Enter fails for 10', await sc((sc) => sc.mathKit.exams.npc.results[1] === false) && hp0 - hp1 === 10, `${hp0} -> ${hp1}`);
await step(60 + 450);
const hp2 = await sc((sc) => sc.player.hp);
check('timeout fails for 15', hp1 - hp2 === 15, `${hp1} -> ${hp2}`);
console.log('   problems', JSON.stringify(await sc((sc) => sc.mathKit.exams.npc?.problems)));

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed, ${errors.length} page errors`);
await page.close(); await browser.disconnect();
