import { openHarness } from './harness.mjs';

const H = await openHarness();
const { ev, step, check, page } = H;

await H.startMatch({ elementId: 'clay', enemyElementId: 'dummy', difficulty: 0 });
await ev(() => {
  const sc = window.game.scene.getScene('ArenaScene');
  window.__sc = sc; window.__k = sc.clayKit;
  sc.npc.speed = 0; sc.npc.maxHp = 5000; sc.npc.hp = 5000; sc.npc.body.setVelocity(0, 0);
  sc.player.setPosition(300, 320); sc.npc.setPosition(700, 320);
  const k = window.__k; k.handleInput = (_t, _p, _x, _y) => { k.aimX = window.__aimX ?? 600; k.aimY = window.__aimY ?? 300; };
});
await step(3);
let r = await ev(() => { const { __sc: sc, __k: k } = window; return { tex: sc.player.texture.key, rig: !!k.playerAvatar, golem: !!k.side('player').golem }; });
check('Clay loads with its rig, body texture and golem', r.tex === 'elem-clay' && r.rig && r.golem, JSON.stringify(r));
await step(90);
r = await ev(() => { const g = window.__k.side('player').golem; return { x: Math.round(g.x), y: Math.round(g.y) }; });
check('The golem walks to the cursor', Math.abs(r.x - 600) < 15 && Math.abs(r.y - 300) < 15, JSON.stringify(r));

// Golem swallows a hostile shot (a registry projectile sitting on it).
r = await ev(() => { const { __sc: sc, __k: k } = window; const g = k.side('player').golem; let stolen = false; sc.techProjReg.add({ owner: 'npc', getX: () => g.x, getY: () => g.y, damage: 10, steal: () => { stolen = true; } }); k.update(sc.time.now, 16); return stolen; });
check('The golem swallows hostile shots', r === true);

// Slam: the npc stands on the golem.
r = await ev(() => { const { __sc: sc, __k: k } = window; const g = k.side('player').golem; sc.npc.setPosition(g.x + 40, g.y); sc.npc.hp = sc.npc.maxHp; sc.player.castAbility('clay-slam', sc.buildPlayerContext(600, 300)); return Math.round(sc.npc.body.velocity.x); });
check('Slam shoves away from the golem', r > 100, `vx=${r}`);
await step(2);
r = await ev(() => ({ lost: window.__sc.npc.maxHp - window.__sc.npc.hp }));
check('Slam deals 20 at the golem', r.lost === 20, JSON.stringify(r));

// Rupture: eight shards from the golem; one re-aimed at the npc for 25.
await ev(() => { const { __sc: sc, __k: k } = window; sc.npc.hp = sc.npc.maxHp; sc.npc.body.setVelocity(0, 0); sc.npc.setPosition(760, 300); sc.player.castAbility('clay-rupture', sc.buildPlayerContext(600, 300)); });
r = await ev(() => { const { __sc: sc, __k: k } = window; const n = k.shards.length; const s = k.shards[0]; if (s) { const a = Math.atan2(sc.npc.y - s.y, sc.npc.x - s.x); s.angle = a; s.vx = Math.cos(a) * 475; s.vy = Math.sin(a) * 475; } return { n, hidden: k.side('player').golem.hiddenUntil > sc.time.now }; });
check('Rupture throws 8 shards and the golem re-forms', r.n === 8 && r.hidden, JSON.stringify(r));
await step(40);
r = await ev(() => ({ lost: window.__sc.npc.maxHp - window.__sc.npc.hp }));
check('A shard pierces for 25', r.lost === 25, JSON.stringify(r));

// Clot: draw an arc, then stop a shot with it.
await ev(() => { const { __sc: sc, __k: k } = window; k.shards = []; sc.player.castAbility('clay-clot', sc.buildPlayerContext(600, 300)); });
await step(2);
r = await ev(() => { const { __sc: sc, __k: k } = window; const s = k.side('player'); for (let i = 0; i < 40; i++) { const a = -1.2 + (i / 39) * 2.4; k.feedDrawing('player', sc.player.x + Math.cos(a) * 110, sc.player.y + Math.sin(a) * 110); } return { drawing: !!s.drawing, nodes: s.drawing?.nodes.length, budget: s.drawing?.budget }; });
check('Clot opens a drawing that spends clay as the stroke travels', r.drawing && r.nodes >= 25 && r.budget < 60, JSON.stringify(r));
await step(190);
r = await ev(() => { const { __sc: sc, __k: k } = window; const s = k.side('player'); const n = s.shield.length; const p = k.shieldWorld('player', s.shield[Math.floor(n / 2)]); let stolen = false; sc.techProjReg.add({ owner: 'npc', getX: () => p.x, getY: () => p.y, damage: 10, steal: () => { stolen = true; } }); k.update(sc.time.now, 16); return { before: n, after: s.shield.length, stolen, drawing: !!s.drawing }; });
check('The set clot orbits and erodes only where a shot lands', !r.drawing && r.before > 20 && r.stolen && r.after < r.before && r.after > r.before - 10, JSON.stringify(r));

// Slink: to the nearest wall, three barrages, drop off.
await ev(() => { const { __sc: sc, __k: k } = window; k.side('player').shield = []; sc.player.setPosition(120, 320); sc.player.castAbility('clay-slink', sc.buildPlayerContext(600, 300)); });
await step(20);
r = await ev(() => { const { __sc: sc, __k: k } = window; const s = k.side('player'); return { slink: s.slink, wall: s.wall, x: Math.round(sc.player.x) }; });
check('Slink launches to the nearest wall and sticks', r.slink === 'wall' && r.wall === 'left' && r.x === 54, JSON.stringify(r));
await step(30);
r = await ev(() => { const { __sc: sc, __k: k } = window; return { y: Math.round(sc.player.y), moved: Math.abs(sc.player.y - 320) > 100, x: Math.round(sc.player.x) }; });
check('On the wall you run the rim at 650px/s', r.moved && (r.x === 54 || r.y === 54), JSON.stringify(r));
await ev(() => { const { __sc: sc, __k: k } = window; sc.player.resetCooldown('clay-slam'); k.doSlam('player'); });
r = await ev(() => ({ shards: window.__k.shards.length, left: window.__k.slinkBurstsLeft('player') }));
check('A click on the wall is an eight-shard barrage', r.shards === 8 && r.left === 2, JSON.stringify(r));
await ev(() => { window.__k.leaveWall('player'); window.__k.shards = []; });
r = await ev(() => window.__k.side('player').slink);
check('F again drops off the wall', r === 'none');

// Fuse.
await ev(() => { const { __sc: sc, __k: k } = window; sc.player.setPosition(300, 320); sc.npc.setPosition(700, 320); sc.player.castAbility('clay-fuse', sc.buildPlayerContext(600, 300)); });
r = await ev(() => window.__k.isFusing('player'));
check('Fuse calls the golem in', r === true);
await step(70);
r = await ev(() => { const { __sc: sc, __k: k } = window; return { fused: k.isFused('player'), hits: k.fuseHitsLeft('player'), size: sc.player.claySizeMult, speed: k.getPlayerSpeedMult(), kb: sc.player.knockbackImmune }; });
check('Fused: eight layers, 1.42× body, 1.35× speed, unshovable', r.fused && r.hits === 8 && Math.abs(r.size - 1.42) < 0.01 && Math.abs(r.speed - 1.35) < 0.01 && r.kb, JSON.stringify(r));
r = await ev(() => { const { __sc: sc, __k: k } = window; const hp = sc.player.hp; sc.player.takeDamage(90); sc.player.takeDamage(1, { pierce: true }); return { hpSame: sc.player.hp === hp, hits: k.fuseHitsLeft('player') }; });
check('Each hit, any size, piercing or not, costs exactly one layer', r.hpSame && r.hits === 6, JSON.stringify(r));
await ev(() => { const { __sc: sc, __k: k } = window; sc.npc.hp = sc.npc.maxHp; sc.npc.setPosition(590, 320); k.doSlink('player', 520, 320); });
await step(30);
r = await ev(() => { const { __sc: sc, __k: k } = window; const p = k.puddles[0]; sc.npc.setPosition(p.x, p.y); return { x: Math.round(sc.player.x), puddles: k.puddles.length, lost: sc.npc.maxHp - sc.npc.hp, slow: k.getNpcSpeedMult() }; });
check('Fused F dashes to the cursor, leaves slip and slams on arrival', Math.abs(r.x - 520) < 20 && r.puddles >= 3 && r.lost === 20 && r.slow === 0.55, JSON.stringify(r));
r = await ev(() => { const { __sc: sc, __k: k } = window; const left = k.fuseHitsLeft('player'); k.endFuse('player', true); return { left, fused: k.isFused('player'), shards: k.shards.length, size: sc.player.claySizeMult, bar: sc.player.healthBar.visible }; });
check('Q again splits: six shards per layer left, body restored', !r.fused && r.shards === r.left * 6 && r.left >= 4 && r.size === 1 && r.bar, JSON.stringify(r));
await ev(() => { window.__k.shards = []; window.__k.puddles = []; });

// Upgrades.
await ev(() => { const { __sc: sc, __k: k } = window; sc.activeUpgrades.push('click', 'e', 'r', 'f', 'q'); sc.player.resetCooldown('clay-slam'); sc.player.resetCooldown('clay-rupture'); k.doSlam('player'); });
r = await ev(() => window.__k.shards.length);
check('Shard Smash: three shards per slam', r === 3, `shards=${r}`);
await ev(() => { window.__k.shards = []; window.__k.doRupture('player'); });
r = await ev(() => window.__k.orbitShards.length);
check('Fractal: three orbiting shards', r === 3, `orbit=${r}`);
await ev(() => { const { __sc: sc, __k: k } = window; k.shards = []; k.orbitShards = []; sc.player.resetCooldown('clay-clot'); k.doClot('player'); const g = k.side('player').golem; for (let i = 0; i < 30; i++) { const a = -1 + (i / 29) * 2; k.feedDrawing('player', g.x + Math.cos(a) * 90, g.y + Math.sin(a) * 90); } });
r = await ev(() => ({ golemNodes: window.__k.side('player').drawing.nodes.filter((n) => n.anchor === 'golem').length }));
check('Protector: the drawing can be anchored to the golem', r.golemNodes > 10, JSON.stringify(r));
await step(190);
r = await ev(() => { const { __sc: sc, __k: k } = window; const s = k.side('player'); const p = k.shieldWorld('player', s.shield[5]); sc.techProjReg.add({ owner: 'npc', getX: () => p.x, getY: () => p.y, damage: 10, steal: () => {} }); k.update(sc.time.now, 16); return k.shards.length; });
check('Protector: a blocked shot throws three shards', r === 3, `shards=${r}`);
r = await ev(() => { const k = window.__k; const a = k.hasSlipstreamCharge('player'); const c1 = k.consumeSlipstreamCharge('player'); const c2 = k.consumeSlipstreamCharge('player'); return { a, c1, c2, left: k.side('player').slipstreamCharges }; });
check('Slipstream banks three dashes', r.a && r.c1 && r.c2 && r.left === 1, JSON.stringify(r));
await step(70);
r = await ev(() => window.__k.side('player').slipstreamCharges);
check('Slipstream refills one at a time', r === 2, `charges=${r}`);
await ev(() => { const { __sc: sc, __k: k } = window; k.shards = []; k.side('player').shield = []; sc.player.resetCooldown('clay-fuse'); sc.player.castAbility('clay-fuse', sc.buildPlayerContext(600, 300)); });
await step(70);
await ev(() => { window.__sc.player.takeDamage(10); window.__sc.player.takeDamage(10); });
r = await ev(() => ({ size: window.__sc.player.claySizeMult, speed: window.__k.getPlayerSpeedMult() }));
check('Frenzy: each lost layer shrinks and hastens the fused body', r.size < 1.3 && r.speed > 1.5, JSON.stringify(r));
await ev(() => { window.__k.endFuse('player', false); window.__k.shards = []; });

// Mastery: Bedrock and Give Life.
await ev(() => { const { __sc: sc } = window; sc.clayMasteryOn = true; sc.masteryBindFor = (slot) => (slot === 'f' ? 'give-life' : null); });
await step(2);
r = await ev(() => { const { __sc: sc, __k: k } = window; const g = k.side('player').golem; sc.player.setPosition(g.x + 60, g.y); k.update(sc.time.now, 16); const near = sc.player.clayIncomingMult; sc.player.setPosition(g.x + 400, g.y); k.update(sc.time.now, 16); const far = sc.player.clayIncomingMult; return { near, far }; });
check('Bedrock: 20% less damage within 175px of the golem', r.near === 0.8 && r.far === 1, JSON.stringify(r));
await ev(() => { const { __sc: sc, __k: k } = window; sc.player.setPosition(300, 320); sc.player.resetCooldown('clay-fuse'); sc.player.castAbility('clay-fuse', sc.buildPlayerContext(600, 300)); });
await step(70);
r = await ev(() => { const { __sc: sc, __k: k } = window; sc.npc.setPosition(520, 320); sc.npc.hp = sc.npc.maxHp; sc.npc.mobilityBlockedUntil = 0; const ok = k.startBedrockLeap('player', 520, 320); return { ok, leaping: k.isLeaping('player'), cd: k.getDodgeCooldownMult('player') }; });
check('Bedrock: a fused Space becomes a leap with a tripled dash cooldown', r.ok && r.leaping && r.cd === 3, JSON.stringify(r));
await step(45);
r = await ev(() => { const { __sc: sc, __k: k } = window; return { x: Math.round(sc.player.x), leaping: k.isLeaping('player'), lost: sc.npc.maxHp - sc.npc.hp, stunned: sc.npc.mobilityBlockedUntil > sc.time.now }; });
check('The crash lands a 20-damage slam that stuns for 2s', !r.leaping && Math.abs(r.x - 520) < 3 && r.lost === 20 && r.stunned, JSON.stringify(r));
await ev(() => { window.__k.endFuse('player', false); window.__k.shards = []; });
await ev(() => { const { __sc: sc, __k: k } = window; sc.player.setPosition(300, 320); sc.npc.setPosition(640, 320); sc.npc.mobilityBlockedUntil = 0; k.tryGiveLife('player', 600, 320); });
r = await ev(() => { const { __sc: sc, __k: k } = window; const d = k.side('player').lifeDrawing; if (!d) return { d: false }; for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; const rr = i % 5 === 0 ? 70 : 38; k.feedLifeDrawing('player', d.cx + Math.cos(a) * rr, d.cy + Math.sin(a) * rr); } return { d: true, nodes: d.nodes.length }; });
check('Give Life opens a drawing circle ahead of you', r.d && r.nodes > 10, JSON.stringify(r));
await step(190);
r = await ev(() => { const k = window.__k; const c = k.creatures[0]; return { alive: k.creatures.length, dmg: c?.damage, speed: c?.speed }; });
check('The drawing wakes: a sharp star bites hard and runs slow', r.alive === 1 && r.dmg >= 18 && r.speed >= 120 && r.speed < 200, JSON.stringify(r));
await step(120);
r = await ev(() => ({ lost: window.__sc.npc.maxHp - window.__sc.npc.hp, x: Math.round(window.__k.creatures[0]?.x ?? 0) }));
check('The creature hunts the enemy and bites', r.lost > 0, JSON.stringify(r));
r = await ev(() => { const k = window.__k; const c = k.creatures[0]; const razed = k.purgeSummons(c.x, c.y, 60, 'npc'); return { razed, left: k.creatures.length }; });
check('Spikes of Ruin raze a living drawing', r.razed === 1 && r.left === 0, JSON.stringify(r));
r = await ev(() => { const { __sc: sc, __k: k } = window; sc.player.resetCooldown('clay-fuse'); k.doFuse('player'); k.enterFuse('player'); const names = k.revertForms(sc.player); return { names, fused: k.isFused('player') }; });
check('Second Skin tears the fused form off', r.names.includes('Fuse') && !r.fused, JSON.stringify(r));

// Screenshots.
await ev(() => { const { __sc: sc, __k: k } = window; k.shards = []; k.puddles = []; sc.player.setPosition(330, 380); sc.npc.setPosition(700, 330); sc.npc.hp = sc.npc.maxHp; k.aimX = 560; k.aimY = 330; });
await step(60);
await ev(() => { const { __sc: sc, __k: k } = window; sc.player.resetCooldown('clay-clot'); k.doClot('player'); for (let i = 0; i < 36; i++) { const a = -1.3 + (i / 35) * 2.6; k.feedDrawing('player', sc.player.x + Math.cos(a) * 100, sc.player.y + Math.sin(a) * 100); } });
await step(195);
await ev(() => { const { __sc: sc, __k: k } = window; sc.player.resetCooldown('clay-rupture'); k.doRupture('player'); sc.player.resetCooldown('clay-slam'); });
await step(14);
await page.screenshot({ path: 'shot-clay.png' });
await ev(() => { const { __sc: sc, __k: k } = window; k.shards = []; k.orbitShards = []; sc.player.resetCooldown('clay-fuse'); k.doFuse('player'); });
await step(80);
await ev(() => { const { __sc: sc, __k: k } = window; sc.player.takeDamage(5); sc.player.takeDamage(5); k.doSlink('player', 560, 330); });
await step(14);
await page.screenshot({ path: 'shot-clay-fused.png' });

// Bot at Nightmare.
await ev(() => { const k = window.__k; window.__casts = { slam: 0, rupture: 0, clot: 0, slink: 0, fuse: 0 }; for (const [m, key] of [['doSlam', 'slam'], ['doRupture', 'rupture'], ['doClot', 'clot'], ['doSlink', 'slink'], ['doFuse', 'fuse']]) { const o = k[m].bind(k); k[m] = (...a) => { if (a[0] === 'npc') window.__casts[key]++; o(...a); }; } });
await H.startMatch({ elementId: 'fire', enemyElementId: 'clay', difficulty: 5 });
await ev(() => { const sc = window.game.scene.getScene('ArenaScene'); window.__sc = sc; sc.player.setPosition(250, 320); sc.npc.setPosition(650, 320); });
await step(750);
r = await ev(() => ({ casts: window.__casts, golem: !!window.__k.side('npc').golem, rig: !!window.__k.npcAvatar, playerHp: window.__sc.player.hp }));
check('Nightmare bot slams, ruptures, draws a clot and uses the wall or the fuse', r.casts.slam >= 1 && r.casts.rupture >= 1 && r.casts.clot >= 1 && (r.casts.slink + r.casts.fuse) >= 1 && r.golem && r.rig, JSON.stringify(r));
await page.screenshot({ path: 'shot-clay-bot.png' });

await H.done();
