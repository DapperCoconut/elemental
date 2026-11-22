import type { BakeryDef, FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow, lit } from '../../../../art/IsleArt';
import { basaltColumn, rollingBoulder, spiralStone } from './art';
import { EMBER, LEY, MAGMA_LIT, SANDSTONE } from './palette';
import { alive, clamp, clock, dist, segDist } from './util';

/**
 * The Stonehold Court's goods: Dunstan Quoit's four keepsakes, Prince Bould's boulder, the quarry
 * pool's two fish, and Bryn Hearth's flatbreads off the Flatbread Stone. Every charm is a small
 * piece of one of the court's own rules — Cobb's rolling stone, Ballast's tithe-stones, Hazel's
 * ley, Fingal's columns — turned to your side. Scripts are registered below under their item ids.
 */

const ISLE = 'earth';

export const CHARM_MARBLE = 'stonehold-charm-cobbs-marble';
export const CHARM_COUNTERWEIGHT = 'stonehold-charm-counterweight';
export const CHARM_HAZEL = 'stonehold-charm-hazel-rod';
export const CHARM_PLINTH = 'stonehold-charm-basalt-plinth';
export const ART_BOULD = 'art-bould';

export const FISH_DACE = 'fish-pebble-dace';
export const FISH_CARP = 'fish-boulder-carp';
export const FISHERY = 'stonehold-pool';

export const SPELT = 'stonehold-quern-spelt';
export const FOOD_DACE_FLAT = 'stonehold-food-dace-flatbread';
export const FOOD_CARP_COALS = 'stonehold-food-carp-in-the-coals';
export const FOOD_BREAM_SLAB = 'stonehold-food-bream-on-the-slab';
export const FOOD_SOLE_FOLD = 'stonehold-food-slate-sole-fold';
export const FOOD_SHORT_CAKE = 'stonehold-food-short-weight-cake';
export const BAKERY_ID = 'stonehold-flatbread';

const TOP = 96;
const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Cobb's Marble ────────────────────────────────────────────────────
// A stone marble rolls about the arena, rebounding off the walls and faster with every bounce.
// When it meets the foe it strikes harder the more bounces it has stored, then starts again slow.

const marble: ItemScriptFactory = (ctx) => {
  const R = 9, BASE = 120, MAX = 420;
  let x = ctx.W / 2, y = (TOP + ctx.H) / 2, vx = BASE, vy = BASE * 0.6, spin = 0, bounces = 0, hitAt = -9999;
  const dtOf = clock();
  return {
    update(time) {
      const dt = dtOf(time);
      if (!live(ctx)) return;
      x += vx * dt; y += vy * dt; spin += (Math.hypot(vx, vy) / R) * dt;
      const bump = () => { bounces++; const v = Math.min(MAX, Math.hypot(vx, vy) * 1.15) / Math.hypot(vx, vy); vx *= v; vy *= v; };
      if (x < 44) { x = 44; vx = Math.abs(vx); bump(); }
      if (x > ctx.W - 44) { x = ctx.W - 44; vx = -Math.abs(vx); bump(); }
      if (y < TOP + 20) { y = TOP + 20; vy = Math.abs(vy); bump(); }
      if (y > ctx.H - 36) { y = ctx.H - 36; vy = -Math.abs(vy); bump(); }
      if (foeLive(ctx) && time - hitAt > 500 && dist(x, y, ctx.npc.x, ctx.npc.y) < R + 22) {
        hitAt = time;
        const dmg = Math.min(16, 4 + bounces * 2);
        ctx.hit(ctx.npc, dmg, x, y);
        ctx.float(x, y - 20, `CLACK ${dmg}`, '#e8d2a8');
        ctx.sfx('rock-throw');
        const a = Math.atan2(y - ctx.npc.y, x - ctx.npc.x);
        vx = Math.cos(a) * BASE; vy = Math.sin(a) * BASE;
        bounces = 0;
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      if (bounces >= 4) glow(g, x, y, 16, MAGMA_LIT, 0.05, 2);
      rollingBoulder(g, x, y, R, spin);
      if (time - hitAt < 250) { g.lineStyle(2, 0xffffff, 1 - (time - hitAt) / 250); g.strokeCircle(x, y, R + 6); }
      g.fillStyle(0xf0ecdc, 0.9);
      for (let k = 0; k < Math.min(6, bounces); k++) g.fillCircle(x - 7 + k * 3, y - R - 6, 1.1);
    },
  };
};

// ── Ballast's Counterweight ──────────────────────────────────────────
// Every hit you take drops a tithe-stone into your pocket. The next blow you land throws the lot.

const counterweight: ItemScriptFactory = (ctx) => {
  const MAX = 6;
  let stones = 0;
  let lastAdd = -9999;
  let throwFx = -9999;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (amount <= 0 || now - lastAdd < 400 || stones >= MAX) return;
      lastAdd = now;
      stones++;
    },
    onHitDealt(amount) {
      if (amount < 1 || stones <= 0 || !foeLive(ctx)) return;
      const dmg = stones * 3;
      ctx.hit(ctx.npc, dmg, ctx.npc.x, ctx.npc.y - 20);
      ctx.float(ctx.npc.x, ctx.npc.y - 50, `TITHE BACK ${dmg}`, '#e8c870');
      ctx.sfx('anvil');
      stones = 0;
      throwFx = ctx.scene.time.now;
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      for (let i = 0; i < stones; i++) {
        const sx = p.x - 22 + (i % 3) * 7, sy = p.y - 30 - Math.floor(i / 3) * 6;
        g.fillStyle(0x4a4640, 1); g.fillRect(sx - 3, sy - 2, 6, 5);
        g.fillStyle(i % 2 ? 0x9b958a : SANDSTONE, 1); g.fillRect(sx - 3, sy - 3, 5, 4);
      }
      if (time - throwFx < 300 && foeLive(ctx)) {
        const k = (time - throwFx) / 300;
        g.lineStyle(2, 0xe8c870, 1 - k); g.strokeCircle(ctx.npc.x, ctx.npc.y - 10, 16 + k * 24);
      }
    },
  };
};

// ── Dowser's Hazel Rod ───────────────────────────────────────────────
// Every 6s a ley stone is planted where you stand (two at most, the oldest pulled up). A line runs
// between them: the foe crossing it takes 9 and mends you 2; standing on it yourself, you hit harder.

const hazelRod: ItemScriptFactory = (ctx) => {
  const stones: { x: number; y: number; at: number }[] = [];
  let nextPlant = 0;
  let zapAt = -9999;
  let boostUntil = 0;
  const line = () => (stones.length === 2 ? stones : null);
  return {
    update(time) {
      if (!live(ctx)) return;
      if (time >= nextPlant) {
        nextPlant = time + 6000;
        stones.push({ x: ctx.player.x, y: ctx.player.y, at: time });
        if (stones.length > 2) stones.shift();
      }
      const l = line();
      if (!l) return;
      if (foeLive(ctx) && time - zapAt > 1000 && segDist(ctx.npc.x, ctx.npc.y, l[0].x, l[0].y, l[1].x, l[1].y) < 24) {
        zapAt = time;
        ctx.hit(ctx.npc, 9, ctx.npc.x, ctx.npc.y);
        ctx.heal(ctx.player, 2);
        ctx.flash(ctx.npc.x, ctx.npc.y, LEY);
        ctx.sfx('crystal-chime');
      }
      if (time >= boostUntil && segDist(ctx.player.x, ctx.player.y, l[0].x, l[0].y, l[1].x, l[1].y) < 22) {
        ctx.boostDamage(1.2, 250);
        boostUntil = time + 250;
      }
    },
    drawGround(g, time) {
      const l = line();
      if (l) {
        g.lineStyle(8, LEY, 0.12); g.lineBetween(l[0].x, l[0].y, l[1].x, l[1].y);
        g.lineStyle(2, lit(LEY, 0.3), 0.55 + (time - zapAt < 300 ? 0.4 : 0)); g.lineBetween(l[0].x, l[0].y, l[1].x, l[1].y);
      }
      for (const s of stones) spiralStone(g, s.x, s.y + 8, 0.7, 0.8);
    },
  };
};

// ── Basalt Plinth ────────────────────────────────────────────────────
// Stand still a moment and a basalt column rises under you. On it you hit a quarter harder, and
// part of every blow you take is mended back a second later. Step off and it sinks.

const plinth: ItemScriptFactory = (ctx) => {
  let stillX = 0, stillY = 0, stillSince = -1;
  let up: { x: number; y: number; at: number } | null = null;
  let boostUntil = 0;
  const mends: { at: number; amount: number }[] = [];
  return {
    update(time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (up) {
        if (dist(p.x, p.y, up.x, up.y) > 30) { up = null; stillSince = -1; }
        else if (time >= boostUntil) { ctx.boostDamage(1.25, 250); boostUntil = time + 250; }
      } else {
        if (stillSince < 0 || dist(p.x, p.y, stillX, stillY) > 6) { stillX = p.x; stillY = p.y; stillSince = time; }
        else if (time - stillSince > 1200) { up = { x: p.x, y: p.y, at: time }; ctx.sfx('stone-rise'); }
      }
      for (let i = mends.length - 1; i >= 0; i--) {
        if (time < mends[i].at) continue;
        ctx.heal(p, mends[i].amount);
        mends.splice(i, 1);
      }
    },
    onHitTaken(amount) {
      if (!up || amount <= 0) return;
      mends.push({ at: ctx.scene.time.now + 1000, amount: Math.max(1, Math.round(amount * 0.4)) });
    },
    drawGround(g, time) {
      if (!up) {
        if (stillSince >= 0 && live(ctx)) {
          const k = clamp((time - stillSince) / 1200, 0, 1);
          if (k > 0.2) { g.lineStyle(2, MAGMA_LIT, 0.2 + k * 0.5); g.strokeEllipse(ctx.player.x, ctx.player.y + 16, 56 * k, 22 * k); }
        }
        return;
      }
      const h = clamp((time - up.at) / 220, 0, 1) * 10;
      basaltColumn(g, up.x, up.y + 22, 28, 3 + h, mends.length ? 0.4 : 0, 0.62);
    },
  };
};

// ── Bould's Boulder ──────────────────────────────────────────────────
// Every 7s a boulder curls up at your side and rolls straight at the foe (its line shown first).
// Once a fight, dropping under 35% health, you become a standing stone: 3s in which every blow you
// take is mended straight back.

const bouldersBoulder: ItemScriptFactory = (ctx) => {
  const R = 22;
  let next = 0;
  let roll: { x: number; y: number; vx: number; vy: number; goAt: number; spin: number; done: boolean } | null = null;
  let stoneUntil = 0;
  let stoneUsed = false;
  const dtOf = clock();
  return {
    update(time) {
      const dt = dtOf(time);
      if (!live(ctx)) return;
      const p = ctx.player;
      if (!roll && time >= next && foeLive(ctx)) {
        next = time + 7000;
        const a = Math.atan2(ctx.npc.y - p.y, ctx.npc.x - p.x);
        roll = { x: p.x + Math.cos(a + 1.4) * 34, y: p.y + Math.sin(a + 1.4) * 34, vx: Math.cos(a) * 360, vy: Math.sin(a) * 360, goAt: time + 600, spin: 0, done: false };
        ctx.sfx('stone-rise');
      }
      if (roll && time >= roll.goAt) {
        roll.x += roll.vx * dt; roll.y += roll.vy * dt; roll.spin += (360 / R) * dt;
        if (foeLive(ctx) && dist(roll.x, roll.y, ctx.npc.x, ctx.npc.y) < R + 20) {
          ctx.hit(ctx.npc, 16, roll.x, roll.y);
          ctx.float(ctx.npc.x, ctx.npc.y - 50, 'BOULDERED', '#e8d2a8');
          ctx.sfx('stone-slam');
          roll = null;
        } else if (roll.x < 20 || roll.x > ctx.W - 20 || roll.y < TOP || roll.y > ctx.H) roll = null;
      }
      if (!stoneUsed && p.hp < p.maxHp * 0.35) {
        stoneUsed = true;
        stoneUntil = time + 3000;
        ctx.float(p.x, p.y - 56, 'STANDING STONE', '#e8d2a8');
        ctx.sfx('stone-rise');
      }
    },
    onHitTaken(amount) {
      if (amount > 0 && ctx.scene.time.now < stoneUntil) ctx.heal(ctx.player, amount);
    },
    drawGround(g, time) {
      if (roll && time < roll.goAt) {
        const k = (roll.goAt - time) / 600;
        const v = Math.hypot(roll.vx, roll.vy);
        for (let d = 30; d < 420; d += 26) { g.fillStyle(0xe8d2a8, 0.4 * (1 - k * 0.5)); g.fillCircle(roll.x + (roll.vx / v) * d, roll.y + (roll.vy / v) * d + 14, 2.5); }
      }
    },
    drawAir(g, time) {
      if (roll) rollingBoulder(g, roll.x, roll.y, R, roll.spin);
      if (time < stoneUntil && live(ctx)) {
        const p = ctx.player;
        g.lineStyle(3, 0xc2bcae, 0.6 + Math.sin(time / 80) * 0.2); g.strokeEllipse(p.x, p.y, 54, 70);
        g.fillStyle(0x9b958a, 0.18); g.fillEllipse(p.x, p.y, 54, 70);
      }
    },
  };
};

// ── Carp in the Coals (food) ─────────────────────────────────────────
// Every 9s the coals catch: your next hit within 3s sears the foe for 9 more.

const carpInTheCoals: ItemScriptFactory = (ctx) => {
  let next = 0;
  let hotUntil = 0;
  return {
    update(time) {
      if (time >= next) { next = time + 9000; hotUntil = time + 3000; }
    },
    onHitDealt(amount) {
      const now = ctx.scene.time.now;
      if (amount < 1 || now >= hotUntil || !foeLive(ctx)) return;
      hotUntil = 0;
      ctx.hit(ctx.npc, 9, ctx.npc.x, ctx.npc.y - 20);
      ctx.float(ctx.npc.x, ctx.npc.y - 46, 'SEARED', '#ffb070');
      ctx.sfx('sizzle');
    },
    drawAir(g, time) {
      if (time >= hotUntil || !live(ctx)) return;
      const p = ctx.player;
      for (let i = 0; i < 5; i++) {
        const ph = ((time / 500) + i / 5) % 1;
        g.fillStyle(i % 2 ? EMBER : MAGMA_LIT, 0.8 * (1 - ph)); g.fillCircle(p.x - 12 + i * 6, p.y - 10 - ph * 30, 1.8);
      }
    },
  };
};

export const STONEHOLD_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_MARBLE, name: 'Cobb\'s Marble', emoji: '🪨', kind: 'charm', price: 380, isle: ISLE,
    flavor: 'A ball of granite the size of a plum, chipped off his great stone and rolled round in a barrel till it was perfect.',
    script: CHARM_MARBLE,
    scriptText: [
      'A stone marble rolls round the arena, rebounding off the walls and faster with every bounce.',
      'When it meets your foe it strikes for 4 +2 per bounce (up to 16), then starts again slow.',
    ],
  },
  {
    id: CHARM_COUNTERWEIGHT, name: 'Ballast\'s Counterweight', emoji: '⚖️', kind: 'charm', price: 260, isle: ISLE,
    flavor: 'A brass tithe-weight with a hole bored through it. Short-weight. Dunstan says he found it. Dunstan finds a lot.',
    effect: { maxHp: 4 },
    script: CHARM_COUNTERWEIGHT,
    scriptText: [
      'Each hit you take drops a tithe-stone into your pocket (up to 6).',
      'The next blow you land throws them all back: 3 extra damage per stone.',
    ],
  },
  {
    id: CHARM_HAZEL, name: 'Dowser\'s Hazel Rod', emoji: '🌿', kind: 'charm', price: 560, isle: ISLE,
    flavor: 'A forked twig of hazel, cut on the menhir avenue at dawn. It twitches near standing stones. And near trouble.',
    script: CHARM_HAZEL,
    scriptText: [
      'Every 6s a ley stone is planted where you stand; a line runs between your last two.',
      'The foe crossing it takes 9 and mends you 2 (once a second). Standing on it, you deal +20%.',
    ],
  },
  {
    id: CHARM_PLINTH, name: 'Basalt Plinth', emoji: '⬢', kind: 'charm', price: 760, isle: ISLE,
    flavor: 'A six-sided chip of the causeway, warm to the touch. Fingal says they find their way back to the ground.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_PLINTH,
    scriptText: [
      'Stand still for 1.2s and a basalt column rises under you; step off it and it sinks.',
      'On it you deal +25%, and 40% of each hit you take is mended back a second later.',
    ],
  },
  {
    id: ART_BOULD, name: 'Bould\'s Boulder', emoji: '🪨', kind: 'artifact', isle: ISLE,
    flavor: 'The Prince\'s own stone, the one that sat on his gate. It has decided to follow you. Nobody knows how it decides.',
    effect: { maxHp: 15 },
    script: ART_BOULD,
    scriptText: [
      'Every 7s a boulder curls up at your side and rolls straight at your foe (its line shown first): 16 if it hits.',
      'Once a fight, dropping under 35% health, you stand like a stone: for 3s every blow you take is mended back.',
    ],
  },
  {
    id: FISH_DACE, name: 'Pebble Dace', emoji: '🐟', kind: 'fish', sell: 10, isle: ISLE,
    flavor: 'A little grey fish speckled exactly like the gravel it hides in. You only see it when it moves. It rarely moves.',
    effect: { shieldHp: 6 },
  },
  {
    id: FISH_CARP, name: 'Boulder Carp', emoji: '🐠', kind: 'fish', sell: 30, isle: ISLE,
    flavor: 'A great slow carp with scales like slate, said to be older than the pool. The Pit-Reeve tithes them by weight.',
    effect: { maxHp: 8 },
  },
  {
    id: SPELT, name: 'Quern-Ground Spelt', emoji: '🌾', kind: 'material', price: 12, sell: 4, isle: ISLE,
    flavor: 'Coarse spelt flour ground between two millstones, with a little of the millstone in it. Stonehold\'s only crop.',
  },
  {
    id: FOOD_DACE_FLAT, name: 'Dace Flatbread', emoji: '🫓', kind: 'food', sell: 22, isle: ISLE,
    flavor: 'Two pebble dace folded into spelt dough and slapped on the hot stone. The pit gang eat them standing up.',
    effect: { shieldHp: 10, regenPerSecond: 0.3 },
  },
  {
    id: FOOD_CARP_COALS, name: 'Carp in the Coals', emoji: '🔥', kind: 'food', sell: 44, isle: ISLE,
    flavor: 'A boulder carp wrapped in spelt paste and buried in the embers under the griddle. You dig it up like treasure.',
    script: FOOD_CARP_COALS,
    scriptText: ['Every 9s the coals catch: your next hit within 3s sears the foe for 9 more.'],
  },
  {
    id: FOOD_BREAM_SLAB, name: 'Bream on the Slab', emoji: '🥙', kind: 'food', sell: 30, isle: ISLE,
    flavor: 'Quarry bream from the harbour, cooked flat on the stone with the bread round it. Heavy. Stonehold likes heavy.',
    effect: { maxHp: 12 },
  },
  {
    id: FOOD_SOLE_FOLD, name: 'Slate Sole Fold', emoji: '🌮', kind: 'food', sell: 36, isle: ISLE,
    flavor: 'A slate sole and a dace folded in one big flatbread and pressed under a stone till it holds its shape.',
    effect: { damageTakenMult: 0.95, speedMult: 1.03 },
  },
  {
    id: FOOD_SHORT_CAKE, name: 'Short-Weight Cake', emoji: '🍪', kind: 'food', sell: 14, isle: ISLE,
    flavor: 'A spelt cake baked deliberately light. Bryn sells them for a copper and calls them "a small act of tax evasion".',
    effect: { regenPerSecond: 0.5 },
  },
];

export const STONEHOLD_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_MARBLE]: marble,
  [CHARM_COUNTERWEIGHT]: counterweight,
  [CHARM_HAZEL]: hazelRod,
  [CHARM_PLINTH]: plinth,
  [ART_BOULD]: bouldersBoulder,
  [FOOD_CARP_COALS]: carpInTheCoals,
};

export const STONEHOLD_SHOPS: ShopDef[] = [
  { id: 'stonehold-shop', name: 'Quoit\'s Keepsakes', stock: [CHARM_COUNTERWEIGHT, CHARM_MARBLE, CHARM_HAZEL, CHARM_PLINTH, SPELT], buys: true },
];

export const STONEHOLD_BAKERIES: BakeryDef[] = [{
  id: BAKERY_ID,
  name: 'The Flatbread Stone',
  recipes: [
    {
      id: 'stonehold-recipe-dace-flatbread', name: 'Dace Flatbread',
      inputs: [{ item: FISH_DACE, count: 2 }, { item: SPELT, count: 1 }], coins: 16, output: FOOD_DACE_FLAT, makes: 2,
    },
    {
      id: 'stonehold-recipe-carp-in-the-coals', name: 'Carp in the Coals',
      inputs: [{ item: FISH_CARP, count: 1 }, { item: SPELT, count: 1 }], coins: 26, output: FOOD_CARP_COALS,
    },
    {
      id: 'stonehold-recipe-bream-on-the-slab', name: 'Bream on the Slab',
      inputs: [{ item: 'fish-quarry-bream', count: 2 }, { item: SPELT, count: 1 }], coins: 22, output: FOOD_BREAM_SLAB,
    },
    {
      id: 'stonehold-recipe-slate-sole-fold', name: 'Slate Sole Fold',
      inputs: [{ item: 'fish-slate-sole', count: 1 }, { item: FISH_DACE, count: 1 }, { item: SPELT, count: 1 }], coins: 28, output: FOOD_SOLE_FOLD,
    },
    {
      id: 'stonehold-recipe-short-weight-cake', name: 'Short-Weight Cake',
      inputs: [{ item: SPELT, count: 3 }], coins: 10, output: FOOD_SHORT_CAKE, makes: 2,
    },
  ],
}];

export const STONEHOLD_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Quarry Pool', kind: 'pond' }];

export const STONEHOLD_FISH: FishDef[] = [
  { id: FISH_DACE, fisheries: [FISHERY], weight: 6, fight: 1, size: [7, 16] },
  { id: FISH_CARP, fisheries: [FISHERY], weight: 2, fight: 3, size: [30, 64] },
];
