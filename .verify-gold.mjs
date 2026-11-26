// Headless smoke test for Gold (element id `fortune`). Needs the dev server and Chrome on :9222.
//   node .verify-gold.mjs [screenshot-dir]
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
const still = () => sc((sc) => { sc.npc.doAI = () => { sc.npc.body.setVelocity(0, 0); return null; }; sc.npc.speed = 0; sc.npc.maxHp = 5000; sc.npc.hp = 5000; });

console.log('\n[1] the tycoon');
await startMatch('fortune', 'fire');
await step(10);
await still();
// The harness has no real cursor; the kit's own input is switched off and its methods called directly.
await sc((sc) => { sc.fortuneKit.handleInput = () => {}; sc.npc.setPosition(620, 380); sc.player.setPosition(300, 380); });
check('kit + avatar', await sc((sc) => !!sc.fortuneKit && !!sc.fortuneKit.playerAvatar));
await step(62 * 8);
const g1 = await sc((sc) => sc.fortuneKit.sides.player.gold);
check('first dropper pays about 1 gold per 2s', g1 >= 2 && g1 <= 4, `gold ${g1} after 8s`);
await shot('01-tycoon-start');
await sc((sc) => { sc.fortuneKit.sides.player.gold = 30; });
const pads = await sc((sc) => sc.fortuneKit.padsOf('player').map((p) => `${p.id}:${p.price}`));
check('three pads on show', pads.length === 3, pads.join(' '));
await sc((sc) => { const k = sc.fortuneKit; k.pressPad('player', k.padsOf('player').find((p) => p.id === 'drop2')); k.pressPad('player', k.padsOf('player').find((p) => p.id === 'up1')); });
check('bought drop2 + up1', await sc((sc) => { const s = sc.fortuneKit.sides.player; return s.tycoon.owned.has('drop2') && s.tycoon.owned.has('up1') && s.gold === 16; }));
await step(62 * 3);
await shot('02-tycoon-two-parts');
await sc((sc) => { const k = sc.fortuneKit; const s = k.sides.player; s.gold = 999; for (let i = 0; i < 12; i++) { const p = s.tycoon.cheapest(); if (p) k.pressPad('player', p); } s.gold = 0; });
check('complete', await sc((sc) => sc.fortuneKit.sides.player.tycoon.complete && sc.fortuneKit.canRebirth('player')));
await step(62 * 8);
const g2 = await sc((sc) => sc.fortuneKit.sides.player.gold);
check('a complete tycoon pays a lot more', g2 > 40, `gold ${g2} in 8s`);
await shot('03-tycoon-complete');

console.log('\n[2] rebirth + gold health');
await sc((sc) => { sc.player.resetCooldown('fortune-rebirth'); sc.player.castAbility('fortune-rebirth', sc.buildPlayerContext(600, 380)); });
await step(20);
await shot('04-rebirth-flash');
await step(60);
const rb = await sc((sc) => { const s = sc.fortuneKit.sides.player; return { n: s.rebirths, owned: s.tycoon.owned.size, ghp: sc.player.goldHp }; });
check('rebirth: tycoon reset, 150 gold health', rb.n === 1 && rb.owned === 0 && rb.ghp === 150, JSON.stringify(rb));
const gb = await sc((sc) => { sc.fortuneKit.sides.player.gold = 0; sc.fortuneKit.sides.player.frac = 0; const hp = sc.player.hp; sc.player.takeDamage(40); return { hp, after: sc.player.hp, ghp: sc.player.goldHp }; });
await step(5);
const gold3 = await sc((sc) => sc.fortuneKit.sides.player.gold);
check('gold health is spent first and pays', gb.after === gb.hp && gb.ghp < 150 && gold3 >= 3, `${JSON.stringify(gb)} gold ${gold3}`);
check('second rebirth refused until complete', await sc((sc) => { sc.fortuneKit.doRebirth('player'); return sc.fortuneKit.sides.player.rebirths === 1; }));
await shot('05-reborn');

console.log('\n[3] billiards');
await sc((sc) => { sc.player.setPosition(300, 380); sc.npc.setPosition(560, 380); sc.player.resetCooldown('fortune-billiards'); sc.player.castAbility('fortune-billiards', sc.buildPlayerContext(560, 380)); });
await step(10);
await shot('06-toss');
await step(30);
const b0 = await sc((sc) => ({ balls: sc.fortuneKit.balls.length, cue: !!sc.fortuneKit.sides.player.cue }));
check('5 balls down, cue out', b0.balls === 5 && b0.cue, JSON.stringify(b0));
// Walk up behind the nearest ball and shoot it at the bot.
await sc((sc) => { const k = sc.fortuneKit; const b = k.balls.slice().sort((a, c) => a.x - c.x)[0]; sc.player.setPosition(b.x - 70, b.y); sc.player.body.reset(b.x - 70, b.y); sc.npc.setPosition(b.x + 160, b.y); sc.npc.body.reset(b.x + 160, b.y); for (const o of k.balls) if (o !== b) { o.y += 60; } const s = k.sides.player; s.cue.pullFrom = sc.time.now - 1000; s.aimX = b.x + 60; s.aimY = b.y; });
await step(3);
await shot('07-cue-drawn');
const hp0 = await sc((sc) => sc.npc.hp);
await sc((sc) => { const k = sc.fortuneKit; const b = k.balls.slice().sort((a, c) => a.x - c.x)[0]; k.strike('player', sc.player.x, sc.player.y, Math.atan2(sc.npc.y - b.y, sc.npc.x - b.x) * 0 + 0, 1); });
await step(8);
await shot('08-break');
await step(90);
const b1 = await sc((sc) => ({ hp: sc.npc.hp, moved: sc.fortuneKit.balls.filter((b) => Math.abs(b.vx) + Math.abs(b.vy) > 0 || b.x > 500).length, cue: !!sc.fortuneKit.sides.player.cue }));
check('balls ran and something got hit', b1.hp < hp0, `npc ${hp0} -> ${b1.hp}, ${JSON.stringify(b1)}`);
await shot('09-after-break');
const hp1 = await sc((sc) => { sc.player.setPosition(sc.npc.x - 60, sc.npc.y); sc.player.body.reset(sc.npc.x - 60, sc.npc.y); return sc.npc.hp; });
await sc((sc) => sc.fortuneKit.strike('player', sc.player.x, sc.player.y, 0, 1));
await step(4);
check('the cane itself hurts', (await sc((sc) => sc.npc.hp)) <= hp1 - 15);

console.log('\n[4] mastery dagger + glory machines + life-support (forced)');
await sc((sc) => { sc.player.setPosition(480, 420); sc.player.body.reset(480, 420); });
const hpP = await sc((sc) => sc.player.hp + sc.player.goldHp);
await sc((sc) => sc.fortuneKit.tryPain('player', 700, 420));
await step(12);
await shot('10-pain-blood');
await step(90);
const pn = await sc((sc) => ({ lost: sc.player.hp + sc.player.goldHp, patches: sc.fortuneKit.patches.length }));
check('dagger: 18 self damage (15 after one rebirth), 14 blots', Math.abs(hpP - pn.lost - 15) < 0.5 && pn.patches === 14, JSON.stringify({ hpP, ...pn }));
await sc((sc) => { const p = sc.fortuneKit.patches[2]; sc.player.setPosition(p.x, p.y - 10); sc.player.body.reset(p.x, p.y - 10); sc.fortuneKit.sides.player.gold = 0; sc.fortuneKit.sides.player.tycoon.lifeSupport = true; });
await step(62 * 5);
const fl = await sc((sc) => ({ on: sc.fortuneKit.sides.player.onFloor, gold: sc.fortuneKit.sides.player.gold }));
check('gold floor pays 1 per 2s (life-support on, so the tycoon pays none)', fl.on && fl.gold >= 2 && fl.gold <= 3, JSON.stringify(fl));
await shot('11-pain-gold');
await sc((sc) => { const s = sc.fortuneKit.sides.player; for (const g of ['midas', 'drill', 'dragon', 'tunnel', 'shredder', 'furnace']) s.tycoon.glory.add(g); s.tycoon.shardDropper = true; s.gold = 999; for (let i = 0; i < 12; i++) { const p = s.tycoon.cheapest(); if (p) sc.fortuneKit.pressPad('player', p); } });
await step(62 * 6);
await shot('12-glory-life-support');
await sc((sc) => { sc.fortuneKit.sides.player.tycoon.lifeSupport = false; });
await step(62 * 4);
await shot('13-glory-all');

console.log('\n[5] a Gold bot on its own');
await startMatch('fire', 'fortune');
await step(10);
await sc((sc) => { sc.player.maxHp = 9000; sc.player.hp = 9000; sc.npc.maxHp = 9000; sc.npc.hp = 9000; });
for (let i = 0; i < 12; i++) await step(62 * 5);
const bot = await sc((sc) => { const s = sc.fortuneKit.sides.npc; return { owned: [...s.tycoon.owned], gold: s.gold, rebirths: s.rebirths, picks: Object.values(s.plain).reduce((a, b) => a + b, 0) }; });
check('the bot shops its tycoon', bot.owned.length >= 3 || bot.rebirths > 0, JSON.stringify(bot));
await shot('14-bot');
for (let i = 0; i < 12; i++) await step(62 * 5);
const bot2 = await sc((sc) => { const s = sc.fortuneKit.sides.npc; return { owned: s.tycoon.owned.size, gold: s.gold, rebirths: s.rebirths, ghp: sc.npc.goldHp, balls: sc.fortuneKit.balls.length }; });
check('...and gets reborn inside two minutes', bot2.rebirths >= 1, JSON.stringify(bot2));
await shot('15-bot-later');

console.log('\n[6] mirror match');
await startMatch('fortune', 'fortune');
await step(62 * 6);
await shot('16-mirror');

const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} checks passed, ${errors.length} page errors`);
await page.close();
await browser.disconnect();
process.exit(bad.length || errors.length ? 1 : 0);
