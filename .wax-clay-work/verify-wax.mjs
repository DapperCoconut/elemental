import { openHarness } from './harness.mjs';

const H = await openHarness();
const { ev, step, check, page } = H;

await H.startMatch({ elementId: 'wax', enemyElementId: 'dummy', difficulty: 0 });
const boot = await ev(() => {
  const sc = window.game.scene.getScene('ArenaScene');
  window.__sc = sc; window.__k = sc.waxKit;
  sc.player.setPosition(300, 320); sc.npc.setPosition(420, 320); sc.npc.body.setVelocity(0, 0); sc.npc.speed = 0;
  sc.npc.maxHp = 5000; sc.player.hp = sc.player.maxHp; sc.npc.hp = sc.npc.maxHp;
  return { el: sc.playerElement.id, avatar: !!sc.waxKit.playerAvatar, tex: sc.player.texture.key };
});
await step(3);
check('Wax loads with its rig and body texture', boot.el === 'wax' && boot.tex === 'elem-wax', JSON.stringify(boot));
const rig = await ev(() => !!window.__k.playerAvatar);
check('Wax avatar built on first frame', rig);

// ── Click: six thrusts then the stinger ──
let r = await ev(() => { const { __sc: sc, __k: k } = window; sc.npc.hp = sc.npc.maxHp; const x0 = sc.npc.x; sc.player.castAbility('wax-stinger-strikes', sc.buildPlayerContext(420, 320)); return { barrages: k.barrages.length, x0 }; });
check('Stinger Strikes opens a barrage', r.barrages === 1);
await step(45); // 720ms
let s = await ev(() => { const { __sc: sc, __k: k } = window; return { lost: sc.npc.maxHp - sc.npc.hp, poisoned: k.poisons.length, moved: Math.round(sc.npc.x), barrages: k.barrages.length }; });
check('All six land for 24 plus the 12-damage stinger (36)', s.lost === 36, `lost ${s.lost}`);
check('Stinger poisons and shoves the victim', s.poisoned === 1 && s.moved > r.x0 + 20, JSON.stringify(s));
await step(130); // ~2s more of poison
s = await ev(() => { const { __sc: sc, __k: k } = window; return { lost: sc.npc.maxHp - sc.npc.hp, stacks: k.poisons[0]?.stacks, mult: sc.npc.waxIncomingMult }; });
check('Poison ticks 1 a second and stacks vulnerability', s.lost >= 38 && s.stacks >= 2 && s.mult > 1.01, JSON.stringify(s));

// ── E: the swarm ──
await ev(() => { const { __sc: sc, __k: k } = window; k.poisons = []; sc.npc.hp = sc.npc.maxHp; sc.npc.setPosition(520, 320); sc.player.castAbility('wax-swarm', sc.buildPlayerContext(520, 320)); });
s = await ev(() => ({ bees: window.__k.bees.length }));
check('Swarm looses 15 bees', s.bees === 15);
await step(40);
s = await ev(() => { const { __sc: sc, __k: k } = window; return { attached: k.bees.filter((b) => b.state === 'attached').length, mult: sc.npc.waxIncomingMult }; });
check('Bees latch on and each adds 1% vulnerability', s.attached >= 8 && Math.abs(s.mult - (1 + s.attached * 0.01)) < 0.001, JSON.stringify(s));
await step(200);
s = await ev(() => { const { __sc: sc, __k: k } = window; return { lost: sc.npc.maxHp - sc.npc.hp, bees: k.bees.length }; });
check('Attached bees bite 2 a second for 3s then leave', s.lost >= 16 && s.bees === 0, JSON.stringify(s));

// ── R: candlelight ──
await ev(() => { const { __sc: sc } = window; sc.player.castAbility('wax-candle-mount', sc.buildPlayerContext(300, 320)); });
await step(3);
s = await ev(() => { const { __sc: sc, __k: k } = window; return { candles: k.candles.length, inside: k.inCandle('player'), mult: sc.player.waxIncomingMult }; });
check('A candle under your feet is 15% armour', s.candles === 1 && s.inside && Math.abs(s.mult - 0.85) < 0.001, JSON.stringify(s));
await ev(() => { const { __sc: sc, __k: k } = window; k.candles.push({ ...k.candles[0], seed: 3 }); k.candles.push({ ...k.candles[0], seed: 4 }); k.candles.push({ ...k.candles[0], seed: 5 }); });
await step(2);
s = await ev(() => window.__sc.player.waxIncomingMult);
check('Candlelight stacks and caps at 45%', Math.abs(s - 0.55) < 0.001, `mult=${s}`);
s = await ev(() => { const { __sc: sc, __k: k } = window; return k.latchMs('player', false); });
check('Bees loosed in candlelight latch 2s longer per candle', s === 3000 + 4 * 2000, `latch=${s}`);
await ev(() => { window.__k.candles.length = 1; });

// ── F: the hive ──
await ev(() => { const { __sc: sc } = window; sc.npc.setPosition(620, 320); sc.player.castAbility('wax-hive-hearth', sc.buildPlayerContext(440, 320)); });
await step(2);
await ev(() => { const { __sc: sc } = window; sc.player.resetCooldown('wax-swarm'); sc.player.castAbility('wax-swarm', sc.buildPlayerContext(620, 320)); });
await step(50);
s = await ev(() => ({ hives: window.__k.hives.length, cells: window.__k.hives[0]?.cells }));
check('Bees flown through the hive fill its cells', s.hives === 1 && s.cells === 5, JSON.stringify(s));
await ev(() => { const { __sc: sc, __k: k } = window; sc.player.setPosition(440, 300); k.doHiveHearth('player', 0, 0); });
await step(2);
s = await ev(() => { const { __sc: sc, __k: k } = window; return { hives: k.hives.length, orbit: k.bees.filter((b) => b.state === 'orbit').length, shield: k.sides.player.shields[0]?.beesPerHit }; });
check('Redeeming a full hive gives 25 orbiting bees and a 3-bee shield', s.hives === 0 && s.orbit === 25 && s.shield === 3, JSON.stringify(s));
await ev(() => { const { __sc: sc, __k: k } = window; k.bees = k.bees.filter((b) => b.state === 'orbit'); sc.npc.setPosition(700, 320); sc.player.takeDamage(5); });
await step(3);
s = await ev(() => window.__k.bees.filter((b) => b.state === 'attached').length);
check('A hit taken under the bee shield sends 3 bees at the enemy', s === 3, `attached=${s}`);
await ev(() => { window.__k.bees = []; });

// ── Q: sticky bombs ──
await ev(() => { const { __sc: sc } = window; sc.npc.hp = sc.npc.maxHp; sc.npc.setPosition(560, 300); sc.player.setPosition(440, 300); sc.player.castAbility('wax-sticky-bombs', sc.buildPlayerContext(560, 300)); });
await step(60);
s = await ev(() => { const { __sc: sc, __k: k } = window; return { attached: k.attachedBombs('player').length, mult: sc.npc.waxIncomingMult, flying: k.bombs.filter((b) => b.state === 'flying').length }; });
check('Bombs stick and open the target by 10%', s.attached >= 3 && s.mult >= 1.1 && s.mult < 1.2, JSON.stringify(s));
const n = s.attached;
await step(40);
const nn = await ev(() => { const { __sc: sc, __k: k } = window; sc.npc.hp = sc.npc.maxHp; k.bees = []; k.poisons = []; k.puddles = []; const n = k.attachedBombs('player').length; k.detonateAttached('player'); return n; });
s = await ev(() => ({ lost: window.__sc.npc.maxHp - window.__sc.npc.hp, left: window.__k.bombs.length }));
check('Detonation deals 10 per bomb, +10% per bomb stacked', s.lost === Math.round(10 * nn * (1 + 0.1 * nn)) && s.left === 0, `n=${nn} lost=${s.lost}`);

// ── Upgrades ──
await ev(() => { const { __sc: sc, __k: k } = window; sc.activeUpgrades.push('click', 'e', 'r', 'f', 'q'); sc.npc.setPosition(760, 300); sc.npc.hp = sc.npc.maxHp; sc.player.resetCooldown('wax-stinger-strikes'); sc.player.castAbility('wax-stinger-strikes', sc.buildPlayerContext(760, 300)); });
s = await ev(() => ({ darts: window.__k.darts.length }));
check('Click+ fires 5 darts when nobody is in reach', s.darts === 5);
await step(60);
s = await ev(() => { const { __sc: sc, __k: k } = window; return { lost: sc.npc.maxHp - sc.npc.hp, grapple: k.darts.some((d) => d.kind === 'grapple') || k.pulls.length > 0, x: Math.round(sc.npc.x) }; });
check('Five darts landing launch the grapple', s.lost >= 15 && s.grapple, JSON.stringify(s));
await step(70);
s = await ev(() => Math.round(window.__sc.npc.x));
check('The grapple hauls the target to arm\'s length', s < 440 + 100, `x=${s}`);
await ev(() => { const { __sc: sc, __k: k } = window; k.pulls = []; sc.npc.setPosition(560, 300); sc.player.resetCooldown('wax-swarm'); sc.player.castAbility('wax-swarm', sc.buildPlayerContext(560, 300)); });
s = await ev(() => window.__k.bees.filter((b) => b.elite).length);
check('Elite Swarm reddens three bees', s === 3, `elites=${s}`);
await step(30);
s = await ev(() => window.__k.poisons.length);
check('An elite landing poisons', s >= 1);
await ev(() => { const { __sc: sc, __k: k } = window; k.bees = []; k.poisons = []; k.puddles = []; sc.player.setPosition(300, 320); k.update(sc.time.now, 16); sc.player.takeDamage(6); });
await step(2);
s = await ev(() => ({ melting: window.__k.sides.player.melting.length, hot: window.__k.puddles.filter((p) => p.kind === 'hot').length }));
check('Melting Point: a hit in candlelight sets 2% armour and spits hot wax', s.melting === 1 && s.hot >= 1, JSON.stringify(s));
await ev(() => { const { __sc: sc } = window; sc.player.resetCooldown('wax-hive-hearth'); sc.player.setPosition(300, 460); sc.player.castAbility('wax-hive-hearth', sc.buildPlayerContext(200, 460)); window.__k.hives[0].cells = 5; });
await step(125);
s = await ev(() => window.__k.hives[0]?.honey);
check('Honey Making brews ~3 honey in 2s with a full hive', s > 2 && s < 4.5, `honey=${s}`);
await ev(() => { const { __sc: sc, __k: k } = window; k.hives[0].honey = 32; sc.player.hp = 200; sc.player.setPosition(200, 460); k.doHiveHearth('player', 0, 0); });
await step(2);
s = await ev(() => ({ hp: window.__sc.player.hp, honey: window.__k.puddles.filter((p) => p.kind === 'honey').length }));
check('Redeeming with honey heals it and leaves a puddle per 10', s.hp === 232 && s.honey === 3, JSON.stringify(s));
await ev(() => { const { __sc: sc, __k: k } = window; k.bombs = []; k.bees = []; sc.npc.setPosition(300, 460); sc.npc.hp = sc.npc.maxHp; sc.player.hp = 300; k.strapBombs('player'); });
await step(1);
s = await ev(() => ({ self: window.__k.selfBombs('player').length, mult: window.__sc.player.waxIncomingMult }));
check('Rule Beetanica straps 8 bombs on and opens you by 25%', s.self === 8 && s.mult > 1.2, JSON.stringify(s));
await ev(() => { window.__k.detonateSelf('player'); });
await step(2);
s = await ev(() => ({ lost: window.__sc.npc.maxHp - window.__sc.npc.hp, selfLost: 300 - window.__sc.player.hp }));
check('The self-blast deals the full stack (144) and costs a third', s.lost === 144 && s.selfLost >= 40 && s.selfLost <= 60, JSON.stringify(s));

// ── Purge contract and expiry ──
await ev(() => { const { __sc: sc, __k: k } = window; k.candles = []; k.hives = []; k.doCandleMount('npc', 500, 500); k.doHiveHearth('npc', 540, 500); });
s = await ev(() => { const k = window.__k; const razed = k.purgeSummons(500, 500, 100, 'player'); return { razed, candles: k.candles.length, hives: k.hives.length }; });
check('Spikes of Ruin raze enemy candles and hives', s.razed === 2 && s.candles === 0 && s.hives === 0, JSON.stringify(s));
await ev(() => { const { __sc: sc, __k: k } = window; k.candles = []; k.doCandleMount('player', 300, 460); });
await step(800);
s = await ev(() => ({ candles: window.__k.candles.length, puddles: window.__k.puddles.length, who: window.__k.candles.map((c) => [c.owner, Math.round(c.until - window.__sc.time.now)]) }));
check('Candles burn out after 12s', s.candles === 0, JSON.stringify(s));

// ── Screenshots for the eye ──
await ev(() => { const { __sc: sc, __k: k } = window; k.puddles = []; k.poisons = []; k.bees = []; k.bombs = []; sc.npc.hp = sc.npc.maxHp; sc.player.setPosition(330, 360); sc.npc.setPosition(620, 330); sc.npc.hp = sc.npc.maxHp; k.doCandleMount('player', 250, 420); k.doHiveHearth('player', 470, 440); k.hives[0].cells = 3; k.hives[0].honey = 22; sc.player.resetCooldown('wax-swarm'); sc.player.castAbility('wax-swarm', sc.buildPlayerContext(620, 330)); sc.player.resetCooldown('wax-sticky-bombs'); sc.player.castAbility('wax-sticky-bombs', sc.buildPlayerContext(620, 330)); });
await step(22);
await ev(() => { const { __sc: sc } = window; sc.player.resetCooldown('wax-stinger-strikes'); sc.player.castAbility('wax-stinger-strikes', sc.buildPlayerContext(620, 330)); });
await step(14);
await page.screenshot({ path: 'shot-wax.png' });
await step(60);
await ev(() => { const { __sc: sc, __k: k } = window; k.applyPoison('player', sc.npc); k.strapBombs('player'); });
await step(8);
await page.screenshot({ path: 'shot-wax2.png' });
await ev(() => { const { __sc: sc } = window; sc.cameras.main.setZoom(2.4); sc.cameras.main.centerOn(sc.player.x + 60, sc.player.y); });
await step(2);
await page.screenshot({ path: 'shot-wax-zoom.png' });
await ev(() => { const { __sc: sc } = window; sc.cameras.main.setZoom(1); sc.cameras.main.centerOn(480, 320); });

// ── The bot at Nightmare ──
// The kit outlives the match, so the hive counter goes in before the bot's first second.
await ev(() => { const k = window.__k; window.__hives = 0; const o = k.doHiveHearth.bind(k); k.doHiveHearth = (a, b, c) => { if (a === 'npc') window.__hives++; o(a, b, c); }; });
await H.startMatch({ elementId: 'fire', enemyElementId: 'wax', difficulty: 5 });
await ev(() => { const sc = window.game.scene.getScene('ArenaScene'); window.__sc = sc; window.__k = sc.waxKit; sc.player.setPosition(250, 320); sc.npc.setPosition(650, 320); });
let seen = { candles: 0, hives: 0, bees: 0, bombs: 0, stingers: 0 };
for (let i = 0; i < 75; i++) {
  await step(10);
  const o = await ev(() => { const k = window.__k; return { candles: k.candles.filter((c) => c.owner === 'npc').length, hives: window.__hives, bees: k.bees.filter((b) => b.owner === 'npc').length, bombs: k.bombs.filter((b) => b.owner === 'npc').length, stingers: k.barrages.filter((b) => b.owner === 'npc').length + k.darts.filter((d) => d.owner === 'npc').length }; });
  for (const key of Object.keys(seen)) seen[key] = Math.max(seen[key], o[key]);
}
check('Nightmare bot plants candles, builds a hive, looses bees, lobs bombs and fences', seen.candles >= 1 && seen.hives >= 1 && seen.bees >= 1 && seen.bombs >= 1 && seen.stingers >= 1, JSON.stringify(seen));
const bot = await ev(() => ({ npcHp: window.__sc.npc.hp, playerHp: window.__sc.player.hp, npcRig: !!window.__k.npcAvatar }));
check('Bot rig exists and the fight is live', bot.npcRig && bot.playerHp < 400, JSON.stringify(bot));
await page.screenshot({ path: 'shot-wax-bot.png' });

await H.done();
