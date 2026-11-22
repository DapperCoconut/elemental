import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow, lit } from '../../../../art/IsleArt';
import { crack, wreckingBall } from './art';
import { BRONZE, CHALK, IRON, LANTERN, LIME, LIME_DARK, LIME_DEEP, LIME_LIT, ROPE, WATER, WATER_LIT } from './palette';
import { alive, clamp, dist, turnToward } from './util';

/**
 * The Rubble Court's goods: Magpie Orra's four charms (each one a real thing dug out of the
 * buried capital), Prince Wreck's wrecking ball, and the collapsed well's three fish. Every charm
 * plays one of the court's own rules your way — the mason's patience, the aqueduct's leak, the
 * keystone that holds until it doesn't, the colossus's glare. Scripts are registered under their
 * item ids below.
 */

const ISLE = 'earth';

export const CHARM_PLUMB = 'rubble-charm-plumb-bob';
export const CHARM_VOUSSOIR = 'rubble-charm-weeping-voussoir';
export const CHARM_KEYSTONE = 'rubble-charm-cracked-keystone';
export const CHARM_SIGHTSTONE = 'rubble-charm-sightstone';
export const ART_WRECK = 'art-wreck';

export const FISH_CAVEFISH = 'fish-blind-cavefish';
export const FISH_STURGEON = 'fish-relic-sturgeon';
export const FISH_AXOLOTL = 'fish-tomb-axolotl';
export const FISHERY = 'rubble-well';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Mason's Plumb-Bob ────────────────────────────────────────────────
// Stand still a moment and the bob hangs true. The next blow you land while it is true strikes
// true: 12 extra damage. Then it swings, and you must settle it again.

const plumbBob: ItemScriptFactory = (ctx) => {
  const SETTLE = 700, HOLD = 3000;
  let ax = ctx.player.x, ay = ctx.player.y;
  let stillSince = -1;
  let trueUntil = 0;
  let swingAt = -9999;
  return {
    update(time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (dist(ax, ay, p.x, p.y) > 8) { ax = p.x; ay = p.y; stillSince = time; }
      if (stillSince < 0) stillSince = time;
      if (time - stillSince >= SETTLE && time >= trueUntil && time - swingAt > 400) trueUntil = time + HOLD;
    },
    onHitDealt(amount) {
      const now = ctx.scene.time.now;
      if (amount < 2 || now >= trueUntil || !foeLive(ctx)) return;
      trueUntil = 0;
      swingAt = now;
      stillSince = now;
      ctx.hit(ctx.npc, 12, ctx.npc.x, ctx.npc.y - 20);
      ctx.float(ctx.npc.x, ctx.npc.y - 54, 'TRUE', '#f0ece0');
      ctx.sfx('anvil');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x + 24, y = p.y - 40;
      const isTrue = time < trueUntil;
      const swing = isTrue ? 0 : Math.sin(time / 140) * clamp(1 - (time - stillSince) / 700, 0.15, 1) * 0.5;
      const bx = x + Math.sin(swing) * 22, by = y + Math.cos(swing) * 22;
      g.lineStyle(1, ROPE, 1); g.lineBetween(x, y, bx, by);
      if (isTrue) { glow(g, bx, by, 10, CHALK, 0.1, 2); g.lineStyle(1, CHALK, 0.4); g.lineBetween(bx, by, bx, p.y + 10); }
      g.fillStyle(BRONZE, 1); g.fillTriangle(bx - 4, by, bx + 4, by, bx, by + 9);
      g.fillStyle(lit(BRONZE, 0.3), 1); g.fillCircle(bx - 1, by + 1, 1.4);
    },
  };
};

// ── Weeping Voussoir ─────────────────────────────────────────────────
// An arch-stone off the aqueduct, still wet. Every 5s it drips a puddle where you stand. In your
// own puddle you move 20% faster; while the foe stands in one, your blows land 15% harder.

const voussoir: ItemScriptFactory = (ctx) => {
  const EVERY = 5000, LIFE = 7000, R = 46;
  const puddles: { x: number; y: number; at: number }[] = [];
  let next = 0;
  let boostUntil = 0, speedUntil = 0;
  const inAny = (x: number, y: number, time: number) => puddles.some((p) => time - p.at < LIFE && dist(p.x, p.y, x, y) < R);
  return {
    update(time) {
      if (!live(ctx)) return;
      if (next === 0) next = time + 1500;
      if (time >= next) {
        next = time + EVERY;
        puddles.push({ x: ctx.player.x, y: ctx.player.y + 10, at: time });
        if (puddles.length > 3) puddles.shift();
        ctx.sfx('bubble');
      }
      if (inAny(ctx.player.x, ctx.player.y, time) && time >= speedUntil) { ctx.boostSpeed(1.2, 260); speedUntil = time + 250; }
      if (foeLive(ctx) && inAny(ctx.npc.x, ctx.npc.y, time) && time >= boostUntil) { ctx.boostDamage(1.15, 260); boostUntil = time + 250; }
    },
    drawGround(g, time) {
      for (const p of puddles) {
        const age = time - p.at;
        if (age > LIFE) continue;
        const fade = clamp((LIFE - age) / 800, 0, 1) * clamp(age / 300, 0, 1);
        g.fillStyle(WATER, 0.4 * fade); g.fillEllipse(p.x, p.y, R * 2, R * 1.1);
        g.fillStyle(WATER_LIT, 0.25 * fade); g.fillEllipse(p.x - 8, p.y - 4, R * 0.8, R * 0.3);
        const ph = (time / 900 + p.x * 0.01) % 1;
        g.lineStyle(1, WATER_LIT, 0.5 * fade * (1 - ph)); g.strokeEllipse(p.x, p.y, 10 + ph * R, 5 + ph * R * 0.5);
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x - 26, y = p.y - 36;
      // The wedge-shaped arch-stone and its drip.
      g.fillStyle(LIME_DARK, 1); g.fillTriangle(x - 7, y - 6, x + 7, y - 6, x + 4, y + 6); g.fillTriangle(x - 7, y - 6, x - 4, y + 6, x + 4, y + 6);
      g.fillStyle(LIME, 1); g.fillTriangle(x - 6, y - 6, x + 5, y - 6, x - 3, y + 4);
      const ph = (time % 900) / 900;
      g.fillStyle(WATER_LIT, 1 - ph); g.fillCircle(x, y + 8 + ph * 18, 1.8);
    },
  };
};

// ── Cracked Keystone ─────────────────────────────────────────────────
// Every blow you take chips it. At the fourth chip it gives — a burst of masonry round you (18 to
// the foe within 150px) and you shake off 8 health's worth of dust. It sets again after 6s.

const keystone: ItemScriptFactory = (ctx) => {
  let chips = 0;
  let resetAt = 0;
  let burstAt = -9999;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (amount < 1 || now < resetAt || !live(ctx)) return;
      chips++;
      ctx.sfx('hit-light');
      if (chips < 4) return;
      chips = 0;
      resetAt = now + 6000;
      burstAt = now;
      const p = ctx.player;
      if (foeLive(ctx) && dist(p.x, p.y, ctx.npc.x, ctx.npc.y) < 150) ctx.hit(ctx.npc, 18, ctx.npc.x, ctx.npc.y);
      ctx.heal(p, 8);
      ctx.float(p.x, p.y - 50, 'KEYSTONE GIVES', '#e6d2a8');
      ctx.flash(p.x, p.y, LIME_LIT);
      ctx.sfx('stone-slam');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (time - burstAt < 600) {
        const k = (time - burstAt) / 600;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          g.fillStyle(i % 2 ? LIME : LIME_DARK, 1 - k); g.fillRect(p.x + Math.cos(a) * (20 + k * 130) - 4, p.y - 10 + Math.sin(a) * (16 + k * 100) - 4, 8, 7);
        }
        g.lineStyle(2, LIME_LIT, 0.6 * (1 - k)); g.strokeCircle(p.x, p.y, 20 + k * 130);
      }
      // The keystone over your head: a wedge, cracked once per chip; greyed while it sets.
      const x = p.x, y = p.y - 58;
      const setting = time < resetAt;
      g.fillStyle(setting ? 0x6a6458 : LIME_DARK, 1); g.fillTriangle(x - 9, y - 7, x + 9, y - 7, x + 5, y + 7); g.fillTriangle(x - 9, y - 7, x - 5, y + 7, x + 5, y + 7);
      g.fillStyle(setting ? 0x8a8478 : LIME, 1); g.fillRect(x - 7, y - 7, 14, 3);
      for (let c = 0; c < chips; c++) crack(g, x - 6 + c * 4, y - 6, 10, 1.3 + c * 0.2, LIME_DEEP, 1, 1.2);
    },
  };
};

// ── Sightstone of the Colossus ───────────────────────────────────────
// A chip of the colossus's eye. It glares a thin line from you that turns slowly toward your foe;
// whenever the foe stands in it, it burns them for 4 every half second. Out-turn it if you can't.

const sightstone: ItemScriptFactory = (ctx) => {
  let a = 0;
  let tick = 0;
  let last = -1;
  const TURN = 0.6, HALF = 16;
  const onLine = () => {
    const p = ctx.player, n = ctx.npc;
    const dx = n.x - p.x, dy = n.y - p.y;
    const along = dx * Math.cos(a) + dy * Math.sin(a);
    return along > 20 && Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)) < HALF + 14;
  };
  return {
    update(time) {
      const dt = last < 0 ? 0 : clamp((time - last) / 1000, 0, 0.1);
      last = time;
      if (!live(ctx) || !foeLive(ctx)) return;
      a = turnToward(a, Math.atan2(ctx.npc.y - ctx.player.y, ctx.npc.x - ctx.player.x), TURN * dt);
      if (onLine() && time >= tick) {
        tick = time + 500;
        ctx.hit(ctx.npc, 4, ctx.npc.x, ctx.npc.y);
      }
    },
    drawGround(g, time) {
      if (!live(ctx) || !foeLive(ctx)) return;
      const p = ctx.player;
      const len = 700;
      const on = onLine();
      g.lineStyle(on ? 10 : 6, LANTERN, on ? 0.25 : 0.1); g.lineBetween(p.x, p.y, p.x + Math.cos(a) * len, p.y + Math.sin(a) * len);
      g.lineStyle(2, 0xfff6d0, on ? 0.7 : 0.25); g.lineBetween(p.x, p.y, p.x + Math.cos(a) * len, p.y + Math.sin(a) * len);
      void time;
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x + Math.cos(a) * 26, y = p.y - 26 + Math.sin(a) * 10;
      glow(g, x, y, 10, LANTERN, 0.07 + Math.sin(time / 200) * 0.02, 2);
      g.fillStyle(LIME, 1); g.fillEllipse(x, y, 14, 9);
      g.fillStyle(0xfff0b0, 1); g.fillEllipse(x, y, 8, 5);
      g.fillStyle(0xffffff, 1); g.fillCircle(x + Math.cos(a) * 2, y, 1.6);
    },
  };
};

// ── Wreck's Wrecking Ball (artifact) ─────────────────────────────────
// A little iron ball on a chain swings round you. Whenever it passes through the foe it strikes
// for 9 (once every 0.8s). Every 3rd blow you land lets the chain out long for 3s: it swings
// wide and hits for 13.

const wreckingBallArt: ItemScriptFactory = (ctx) => {
  let a = 0;
  let last = -1;
  let hitAt = 0;
  let hits = 0;
  let longUntil = 0;
  const pos = (time: number) => {
    const r = time < longUntil ? 128 : 72;
    return { x: ctx.player.x + Math.cos(a) * r, y: ctx.player.y - 6 + Math.sin(a) * r * 0.8, r };
  };
  return {
    update(time) {
      const dt = last < 0 ? 0 : clamp((time - last) / 1000, 0, 0.1);
      last = time;
      if (!live(ctx)) return;
      a += dt * (time < longUntil ? 3.1 : 2.4);
      if (!foeLive(ctx) || time < hitAt) return;
      const b = pos(time);
      if (dist(b.x, b.y, ctx.npc.x, ctx.npc.y) < 34) {
        hitAt = time + 800;
        const long = time < longUntil;
        ctx.hit(ctx.npc, long ? 13 : 9, b.x, b.y);
        ctx.sfx(long ? 'hit-heavy' : 'clang');
      }
    },
    onHitDealt(amount) {
      if (amount < 2) return;
      hits++;
      if (hits % 3 === 0) { longUntil = ctx.scene.time.now + 3000; ctx.sfx('chain'); }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const b = pos(time);
      const p = ctx.player;
      // The chain: links from your hand to the ball.
      const n = Math.round(b.r / 12);
      for (let i = 1; i < n; i++) {
        const k = i / n;
        g.lineStyle(1.5, IRON, 1); g.strokeCircle(p.x + (b.x - p.x) * k, p.y - 6 + (b.y - p.y + 6) * k, 2.2);
      }
      wreckingBall(g, b.x, b.y, time < longUntil ? 11 : 9);
    },
  };
};

export const RUBBLE_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_PLUMB, name: 'Mason\'s Plumb-Bob', emoji: '🪨', kind: 'charm', price: 300, isle: ISLE,
    flavor: 'A bronze bob on a waxed cord, dug out of the palace works with the mason\'s initials still on it.',
    script: CHARM_PLUMB,
    scriptText: [
      'Stand still for 0.7s and the bob hangs true (it stays true for 3s).',
      'Your next hit while it is true strikes true: 12 extra damage. Then settle it again.',
    ],
  },
  {
    id: CHARM_VOUSSOIR, name: 'Weeping Voussoir', emoji: '💧', kind: 'charm', price: 440, isle: ISLE,
    flavor: 'A wedge of arch-stone off the aqueduct. It has been dry for a year and it is still dripping.',
    script: CHARM_VOUSSOIR,
    scriptText: [
      'Every 5s it drips a puddle where you stand (up to 3, each lasts 7s).',
      'In a puddle you move 20% faster; while your foe stands in one, you deal +15% damage.',
    ],
  },
  {
    id: CHARM_KEYSTONE, name: 'Cracked Keystone', emoji: '🧱', kind: 'charm', price: 620, isle: ISLE,
    flavor: 'The stone that held up the Corn Exchange door. Krell took it out. The door stayed up for a week out of habit.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_KEYSTONE,
    scriptText: [
      'Each hit you take chips the keystone. At the 4th chip it gives:',
      '18 damage to your foe if within 150px, and you heal 8. It sets again after 6s.',
    ],
  },
  {
    id: CHARM_SIGHTSTONE, name: 'Sightstone of the Colossus', emoji: '👁️', kind: 'charm', price: 860, isle: ISLE,
    flavor: 'A chip of the colossus\'s left eye, the size of a plum. Pell swears it still blinks. It does.',
    effect: { maxHp: 5 },
    script: CHARM_SIGHTSTONE,
    scriptText: [
      'A glare runs out from you and turns slowly (about 35° a second) toward your foe.',
      'While your foe stands in it, it burns them for 4 every 0.5s.',
    ],
  },
  {
    id: ART_WRECK, name: 'Wreck\'s Wrecking Ball', emoji: '⛓️', kind: 'artifact', isle: ISLE,
    flavor: 'A wrecking ball no bigger than a fist, on a foreman\'s chain. The Prince swung it as a boy, at walls.',
    effect: { maxHp: 12 },
    script: ART_WRECK,
    scriptText: [
      'A little wrecking ball swings round you; passing through your foe it strikes for 9 (every 0.8s at most).',
      'Every 3rd hit you land lets the chain out long for 3s: it swings wide and strikes for 13.',
    ],
  },
  {
    id: FISH_CAVEFISH, name: 'Blind Cavefish', emoji: '🐟', kind: 'fish', sell: 16, isle: ISLE,
    flavor: 'Pale as a candle and eyeless. It finds the bait by the sound of it sinking.',
    effect: { dodgeChance: 0.02 },
  },
  {
    id: FISH_AXOLOTL, name: 'Tomb Axolotl', emoji: '🦎', kind: 'fish', sell: 30, isle: ISLE,
    flavor: 'A pink, frilled, smiling thing off the well\'s ledges. Old wives say it remembers every song sung down the well.',
    effect: { regenPerSecond: 0.6 },
  },
  {
    id: FISH_STURGEON, name: 'Relic Sturgeon', emoji: '🐡', kind: 'fish', sell: 46, isle: ISLE,
    flavor: 'Armoured, whiskered and as old as the city. Pickers cut them open for the coins and keys they swallow.',
    effect: { maxHp: 8 },
  },
];

export const RUBBLE_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_PLUMB]: plumbBob,
  [CHARM_VOUSSOIR]: voussoir,
  [CHARM_KEYSTONE]: keystone,
  [CHARM_SIGHTSTONE]: sightstone,
  [ART_WRECK]: wreckingBallArt,
};

export const RUBBLE_SHOPS: ShopDef[] = [
  { id: 'rubble-shop', name: 'Orra\'s Salvage', stock: [CHARM_PLUMB, CHARM_VOUSSOIR, CHARM_KEYSTONE, CHARM_SIGHTSTONE], buys: true },
];

export const RUBBLE_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Well of the Capital', kind: 'cavern' }];

export const RUBBLE_FISH: FishDef[] = [
  { id: FISH_CAVEFISH, fisheries: [FISHERY], weight: 6, fight: 2, size: [9, 22] },
  { id: FISH_AXOLOTL, fisheries: [FISHERY], weight: 3, fight: 3, size: [14, 30] },
  { id: FISH_STURGEON, fisheries: [FISHERY], weight: 1.5, fight: 4, size: [60, 180] },
];

