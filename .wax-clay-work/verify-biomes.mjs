import { openHarness } from './harness.mjs';

const H = await openHarness();
const { ev, step, check } = H;

// ── Player Earth vs a dummy ──
await H.startMatch({ elementId: 'earth', enemyElementId: 'dummy', difficulty: 0 });

const boot = await ev(() => {
  const sc = window.game.scene.getScene('ArenaScene');
  window.__sc = sc; window.__kit = sc.earthKit; window.__b = sc.earthKit.biomes;
  sc.player.setPosition(200, 300); sc.npc.setPosition(760, 300);
  sc.player.hp = sc.player.maxHp; sc.npc.hp = sc.npc.maxHp;
  return { q: sc.playerElement.abilities[4].id, w: sc.scale.width, h: sc.scale.height };
});
check('Earth Q is biome-builder', boot.q === 'biome-builder', JSON.stringify(boot));

// Cast through the real signal path.
await ev(() => { const { __sc: sc, __kit: kit } = window; sc.player.castAbility('biome-builder', sc.buildPlayerContext(500, 300)); kit.playerEarthCastId = 'biome-builder'; });
await step(2);
let r = await ev(() => { const { __sc: sc, __b: b } = window; return { rite: b.isRiteActive('player'), inv: sc.player.isInvincible, stones: b.rites.player?.stones.length, cd: sc.player.getCooldownRatio('biome-builder') }; });
check('Rite starts, player invincible, four stones', r.rite && r.inv && r.stones === 4, JSON.stringify(r));
check('Cooldown stamped', r.cd < 0.1, `cd=${r.cd}`);
await step(25);
r = await ev(() => { const { __sc: sc } = window; return { x: Math.round(sc.player.x), y: Math.round(sc.player.y), speed: sc.playerSpeedMult }; });
check('Player drawn to the arena centre and rooted', Math.abs(r.x - 480) < 3 && Math.abs(r.y - 320) < 3 && r.speed === 0, JSON.stringify(r));

// Pick the NW stone by clicking it, and the SE one.
const picked = await ev(() => {
  const { __sc: sc, __b: b } = window;
  const rite = b.rites.player;
  const kinds = rite.stones.map((s) => s.kind);
  const s0 = rite.stones[0], s3 = rite.stones[3];
  b.handleInput(sc.time.now, { isDown: true }, false, s0.x, s0.y - 6, false);
  b.handleInput(sc.time.now, { isDown: true }, false, s3.x, s3.y - 6, false);
  return { kinds, picked: rite.stones.filter((s) => s.slamAt > 0).length };
});
check('Two stones picked', picked.picked === 2, JSON.stringify(picked));
await step(20);
r = await ev(() => { const { __b: b } = window; return { zones: b.zones.map((z) => ({ q: z.quadrant, k: z.kind, owner: z.owner, floor: z.floor.active })), rite: b.isRiteActive('player') }; });
check('Both quarters raised with live floors', r.zones.length === 2 && r.zones.every((z) => z.floor) && r.zones[0].q === 0 && r.zones[1].q === 3, JSON.stringify(r));
check('Rite still open with two stones left', r.rite === true);

// Q again finishes early and restores the body.
await ev(() => { const { __sc: sc, __b: b } = window; b.handleInput(sc.time.now, { isDown: false }, false, 0, 0, true); });
await step(2);
r = await ev(() => { const { __sc: sc, __b: b } = window; return { rite: b.isRiteActive('player'), inv: sc.player.isInvincible, speed: sc.playerSpeedMult, label: !!b.rites.player }; });
check('Q again ends the rite, invincibility and root lifted', !r.rite && !r.inv && r.speed === 1, JSON.stringify(r));

// ── Each biome's rule, forced one at a time via spawnZone ──
const rule = async (kind, q, fn) => {
  await ev((kind, q) => { const { __sc: sc, __b: b } = window; for (const z of [...b.zones]) b.destroyZone(z, sc.time.now, false); b.apples = []; b.spawnZone('player', kind, q, sc.time.now); }, kind, q);
  await step(40);
  return fn();
};
// Lava: 3 per 0.5s on the npc standing in it (NW quarter: x<480,y<320).
await rule('lava', 0, async () => {
  const before = await ev(() => { const { __sc: sc } = window; sc.npc.setPosition(200, 200); sc.npc.hp = sc.npc.maxHp; return sc.npc.hp; });
  await step(125); // 2s
  const after = await ev(() => window.__sc.npc.hp);
  check('Lava burns 3 every 0.5s (12 over 2s)', before - after >= 9 && before - after <= 15, `lost ${before - after}`);
});
// Ice: enemy speed mult 0.5 in the quarter, 1 outside.
await rule('ice', 0, async () => {
  const r = await ev(() => { const { __sc: sc, __kit: kit } = window; sc.npc.setPosition(200, 200); const inside = kit.getNpcBiomeSpeedMult(); sc.npc.setPosition(700, 500); const outside = kit.getNpcBiomeSpeedMult(); return { inside, outside }; });
  check('Ice halves enemy speed inside, not outside', r.inside === 0.5 && r.outside === 1, JSON.stringify(r));
});
// Ocean: enemy dragged toward the caster.
await rule('ocean', 0, async () => {
  const r = await ev(() => { const { __sc: sc } = window; sc.player.setPosition(430, 290); sc.npc.setPosition(120, 120); return sc.npc.x; });
  await step(62);
  const after = await ev(() => Math.round(window.__sc.npc.x));
  check('Ocean drags the enemy toward the caster (~70px/s)', after - r > 40 && after - r < 140, `moved ${after - r}px`);
});
// Jungle: apples fall; the owner eats one for 25.
await rule('jungle', 0, async () => {
  await ev(() => { const { __sc: sc } = window; sc.npc.setPosition(760, 520); sc.npc.body.setVelocity(0, 0); sc.player.setPosition(760, 480); });
  await step(250); // 4s: at least one apple spawned and landed
  const r = await ev(() => { const { __sc: sc, __b: b } = window; const a = b.apples[0]; sc.player.hp = sc.player.maxHp - 60; if (a) sc.player.setPosition(a.x, a.groundY); return { apples: b.apples.length, hp: sc.player.hp }; });
  await step(3);
  const after = await ev(() => ({ hp: window.__sc.player.hp, apples: window.__b.apples.length }));
  check('Jungle drops apples', r.apples >= 1, `apples=${r.apples}`);
  check('Eating an apple heals 25', after.hp - r.hp === 25, `${r.hp} -> ${after.hp}`);
});
// Mountain: spikes hurt, launch, and quake rains.
await rule('mountain', 0, async () => {
  const r = await ev(() => { const { __sc: sc, __b: b } = window; const z = b.zones[0]; const s = z.spikes[0]; sc.npc.setPosition(s.x, s.y); sc.npc.hp = sc.npc.maxHp; return { spikes: z.spikes.length, hp: sc.npc.hp }; });
  await step(30);
  const hit = await ev(() => window.__sc.npc.hp);
  check('Mountain grows 9 spikes', r.spikes === 9);
  check('Touching a spike deals 8 (once per 0.85s)', r.hp - hit === 8, `lost ${r.hp - hit}`);
  const launched = await ev(() => {
    const { __sc: sc, __b: b } = window;
    const z = b.zones[0]; const s = z.spikes[1];
    // Stand 60px left of the spike and aim straight through it.
    sc.player.setPosition(s.x - 60, s.y);
    const ok = b.tryLaunchSpike('player', Math.atan2(s.y - sc.player.y, s.x - sc.player.x), sc.time.now);
    // Park the target 240px down the shot's own line so the landing can be asserted.
    const f = b.flying[0];
    if (f) { f.angle = 0; f.vx = 520; f.vy = 0; sc.npc.setPosition(f.x + 240, f.y); sc.npc.body.setVelocity(0, 0); sc.npc.hp = sc.npc.maxHp; }
    return { ok, flying: b.flying.length, spikes: z.spikes.length };
  });
  check('Click launches a spike in front of the plate', launched.ok && launched.flying === 1 && launched.spikes === 8, JSON.stringify(launched));
  await step(45);
  const shot = await ev(() => ({ hp: window.__sc.npc.hp, max: window.__sc.npc.maxHp, flying: window.__b.flying.length }));
  check('Launched spike lands for 30', shot.max - shot.hp === 30 && shot.flying === 0, JSON.stringify(shot));
  // Quake on the mountain → stalactites.
  await ev(() => { const { __sc: sc, __b: b } = window; sc.npc.setPosition(200, 200); b.onQuake('player', 200, 200, 3000, sc.time.now); });
  await step(60);
  const rain = await ev(() => ({ rains: window.__b.rains.length, stal: window.__b.stalactites.length }));
  check('Quake on own mountain starts the rockfall', rain.rains === 1 && rain.stal >= 1, JSON.stringify(rain));
});

// ── Symbiosis ──
await ev(() => { const { __sc: sc, __b: b } = window; sc.activeUpgrades.push('q'); for (const z of [...b.zones]) b.destroyZone(z, sc.time.now, false); b.spawnZone('player', 'lava', 0, sc.time.now); b.spawnZone('player', 'ice', 1, sc.time.now); b.spawnZone('player', 'ocean', 2, sc.time.now); b.spawnZone('player', 'jungle', 3, sc.time.now); });
await step(40);
r = await ev(() => {
  const { __sc: sc, __kit: kit, __b: b } = window;
  const out = {};
  sc.player.setPosition(200, 200); kit.update(sc.time.now, 16); out.lavaDmg = b.damageMult('player'); out.lavaInc = sc.player.earthBiomeIncomingMult;
  sc.player.setPosition(700, 200); kit.update(sc.time.now, 16); out.iceInc = sc.player.earthBiomeIncomingMult;
  sc.player.setPosition(200, 500); kit.update(sc.time.now, 16); out.oceanSpeed = kit.getPlayerBiomeSpeedMult();
  sc.player.setPosition(700, 500); sc.player.hp = 100; return out;
});
check('Symbiosis: lava ×1.2 damage, ice 0.8 incoming, ocean 1.2 speed', r.lavaDmg === 1.2 && r.lavaInc === 1 && r.iceInc === 0.8 && r.oceanSpeed === 1.2, JSON.stringify(r));
await step(62);
const jungle = await ev(() => window.__sc.player.hp);
check('Symbiosis: jungle heals ~5/s', jungle >= 104 && jungle <= 106, `hp=${jungle}`);

// ── Expiry ──
await step(1300); // ~21s
r = await ev(() => ({ zones: window.__b.zones.length, world: window.__kit.hasActiveBiomeWorld() }));
check('Quarters expire after 20s and the world goes quiet', r.zones === 0 && r.world === false, JSON.stringify(r));

// ── Bot Earth at Nightmare ──
await H.startMatch({ elementId: 'fire', enemyElementId: 'earth', difficulty: 5 });
await ev(() => { const sc = window.game.scene.getScene('ArenaScene'); window.__sc = sc; window.__kit = sc.earthKit; window.__b = sc.earthKit.biomes; sc.player.setPosition(200, 300); sc.npc.setPosition(700, 300); });
await step(300); // let the bot fight for ~5s
r = await ev(() => { const { __sc: sc, __b: b } = window; return { npcZones: b.zones.filter((z) => z.owner === 'npc').length, rite: b.isRiteActive('npc'), cd: sc.npc.getCooldownRatio('biome-builder'), inv: sc.npc.isInvincible }; });
check('Nightmare bot casts Biome Builder and raises four quarters', r.npcZones === 4 || r.rite, JSON.stringify(r));
if (r.rite) { await step(150); r = await ev(() => ({ npcZones: window.__b.zones.filter((z) => z.owner === 'npc').length, inv: window.__sc.npc.isInvincible })); check('Bot rite completes with four quarters, invincibility lifted', r.npcZones === 4 && !r.inv, JSON.stringify(r)); }

await H.done();
