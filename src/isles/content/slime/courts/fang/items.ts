import type {
  BakeryDef, FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef,
} from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { charmerBasket, risenCobra, shedHusk, venomSlick, vial } from './art';
import { BRUISE_LIT, COBRA_HOOD, FANG_LIT, VENIN_EYE, VENOM, VENOM_DARK, VENOM_LIT } from './palette';
import { alive, arcPoint, clamp, dist } from './util';

/**
 * The Fang Court's goods: Ossic Scaleby's four charms and his snakeroot meal, Prince Venin's
 * milk-tooth, the venom fen's two fish, and the five dishes of *The Charmer's Basket*. Every charm
 * is a milker's or a charmer's thing that plays one of the court's own rules in your favour —
 * milking, the charmer's basket, the moult, the double puncture of a bite. Scripts are registered
 * below under their item ids.
 */

const ISLE = 'slime';

export const CHARM_HOOK = 'fang-charm-milkers-hook';
export const CHARM_REED = 'fang-charm-charmers-reed';
export const CHARM_LOCKET = 'fang-charm-moult-locket';
export const CHARM_RING = 'fang-charm-twin-fang-ring';
export const ART_VENIN = 'art-venin';

export const FISH_MINNOW = 'fish-adder-minnow';
export const FISH_CATFISH = 'fish-cobra-catfish';
export const FISHERY = 'fang-fen';

export const MEAL = 'fang-snakeroot-meal';
export const FOOD_FRITTERS = 'fang-food-adder-fritters';
export const FOOD_COIL = 'fang-food-catfish-coil';
export const FOOD_PIE = 'fang-food-herring-pie';
export const FOOD_EEL = 'fang-food-eel-basket';
export const FOOD_STEW = 'fang-food-mullet-stew';

export const BAKERY_ID = 'fang-basket';
export const RECIPE_FRITTERS = 'fang-r-adder-fritters';
export const RECIPE_COIL = 'fang-r-catfish-coil';
const RECIPE_PIE = 'fang-r-herring-pie';
const RECIPE_EEL = 'fang-r-eel-basket';
const RECIPE_STEW = 'fang-r-mullet-stew';

/** Sea fish from Stilthaven that the Basket bakes with. */
const FISH_HERRING = 'fish-fanged-herring';
const FISH_EEL = 'fish-viper-eel';
const FISH_MULLET = 'fish-mire-mullet';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);
const now = (ctx: ItemScriptCtx) => ctx.scene.time.now;

// ── Milker's Hook ────────────────────────────────────────────────────
// Land three hits inside 2.5s and you have milked your foe: a vial of their venom fills at your
// belt (two at most). Take a blow of 9 or more and you drink one — the Draught is made of venom.

const milkersHook: ItemScriptFactory = (ctx) => {
  const WINDOW = 2500, NEED = 3, MAX = 2;
  let hits: number[] = [];
  let vials = 0;
  let fillFx = -9999, drinkFx = -9999;
  return {
    onHitDealt(amount) {
      if (amount < 1 || !live(ctx) || !foeLive(ctx)) return;
      const t = now(ctx);
      hits = hits.filter((h) => t - h < WINDOW);
      hits.push(t);
      if (hits.length >= NEED && vials < MAX) {
        hits = [];
        vials++;
        fillFx = t;
        ctx.float(ctx.npc.x, ctx.npc.y - 50, 'MILKED', '#d8f088');
        ctx.sfx('bubble');
      }
    },
    onHitTaken(amount) {
      if (amount < 9 || vials <= 0 || !live(ctx)) return;
      vials--;
      drinkFx = now(ctx);
      ctx.heal(ctx.player, 9);
      ctx.float(ctx.player.x, ctx.player.y - 50, 'DRAUGHT', '#bff6f0');
      ctx.sfx('heal');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      // The hook on a cord at the hip, and the vials hanging off it.
      g.lineStyle(2, 0x9a9a92, 1);
      g.beginPath(); g.arc(p.x + 22, p.y + 2, 5, -0.4, Math.PI + 0.6, false); g.strokePath();
      for (let i = 0; i < vials; i++) vial(g, p.x + 18 + i * 9, p.y + 22, 0.55, 1, 0.03);
      if (time - fillFx < 500) { const k = (time - fillFx) / 500; g.lineStyle(2, VENOM_LIT, 1 - k); g.strokeCircle(p.x + 22, p.y + 14, 6 + k * 14); }
      if (time - drinkFx < 600) { const k = (time - drinkFx) / 600; glow(g, p.x, p.y - 10, 20 + k * 20, 0x9ee6e0, 0.08 * (1 - k), 3); }
    },
  };
};

// ── Charmer's Reed ───────────────────────────────────────────────────
// Every 9s a little charmer's basket drops at your feet and a cobra rises from it. The first time
// your foe comes within 130px of it, it spits in their eyes: 9 damage and stunned for 0.4s.

const charmersReed: ItemScriptFactory = (ctx) => {
  const EVERY = 9000, REACH = 130;
  let basket: { x: number; y: number; at: number } | null = null;
  let nextAt = -1;
  let spit: { sx: number; sy: number; tx: number; ty: number; at: number } | null = null;
  return {
    update(time) {
      if (!live(ctx)) return;
      if (nextAt < 0) nextAt = time + 2500;
      if (!basket && time >= nextAt) {
        basket = { x: ctx.player.x, y: ctx.player.y + 10, at: time };
        ctx.sfx('sonic-pulse');
      }
      if (basket && time - basket.at > EVERY) { basket = null; nextAt = time + 400; }
      if (basket && time - basket.at > 700 && foeLive(ctx) && dist(ctx.npc.x, ctx.npc.y, basket.x, basket.y) < REACH) {
        spit = { sx: basket.x, sy: basket.y - 40, tx: ctx.npc.x, ty: ctx.npc.y - 20, at: time };
        ctx.hit(ctx.npc, 9, ctx.npc.x, ctx.npc.y);
        ctx.stun(ctx.npc, 400);
        ctx.float(ctx.npc.x, ctx.npc.y - 52, 'SPAT IN THE EYE', '#c8f060');
        ctx.sfx('slime-splat');
        basket = null;
        nextAt = time + EVERY;
      }
    },
    drawGround(g) {
      if (!basket) return;
      g.lineStyle(1, COBRA_HOOD, 0.3); g.strokeEllipse(basket.x, basket.y, REACH * 2, REACH * 1.2);
    },
    drawAir(g, time) {
      if (basket) {
        const k = clamp((time - basket.at) / 700, 0, 1);
        charmerBasket(g, basket.x, basket.y + 8, 0.55);
        risenCobra(g, basket.x, basket.y - 2, 34 * k, Math.sin(time / 380), 0, 0.6);
      }
      if (spit && time - spit.at < 300) {
        const k = (time - spit.at) / 300;
        const p = arcPoint(spit.sx, spit.sy, spit.tx, spit.ty, 30, k);
        g.fillStyle(VENOM, 1 - k * 0.3); g.fillCircle(p.x, p.y, 4);
      }
    },
  };
};

// ── Moult Locket ─────────────────────────────────────────────────────
// Once every 12s, a blow of 8 or more sheds you out of your skin: you heal back 60% of it, and the
// hollow skin stays where you stood. A second later it bursts in scales — 8 to your foe if they
// are within 100px of it.

const moultLocket: ItemScriptFactory = (ctx) => {
  const COOL = 12000;
  let ready = 0;
  let husk: { x: number; y: number; at: number; burst: boolean } | null = null;
  return {
    onHitTaken(amount) {
      const t = now(ctx);
      if (amount < 8 || t < ready || !live(ctx)) return;
      ready = t + COOL;
      ctx.heal(ctx.player, Math.round(amount * 0.6));
      husk = { x: ctx.player.x, y: ctx.player.y, at: t, burst: false };
      ctx.float(ctx.player.x, ctx.player.y - 52, 'SHED', '#f0ecd0');
      ctx.sfx('snap-back');
    },
    update(time) {
      if (!husk) return;
      if (!husk.burst && time - husk.at >= 1000) {
        husk.burst = true;
        if (foeLive(ctx) && dist(ctx.npc.x, ctx.npc.y, husk.x, husk.y) < 100) ctx.hit(ctx.npc, 8, ctx.npc.x, ctx.npc.y);
        ctx.flash(husk.x, husk.y, 0xd8d4b8);
        ctx.sfx('crystal-shatter');
      }
      if (time - husk.at > 1600) husk = null;
    },
    drawGround(g, time) {
      if (husk && !husk.burst) { const k = (time - husk.at) / 1000; g.lineStyle(1.5, 0xd8d4b8, 0.2 + k * 0.5); g.strokeEllipse(husk.x, husk.y + 14, 200 * (0.6 + k * 0.4), 70 * (0.6 + k * 0.4)); }
    },
    drawAir(g, time) {
      if (husk) shedHusk(g, husk.x, husk.y - 4, 0x9ad0ff, 1, time, husk.burst ? clamp((time - husk.at - 1000) / 600, 0, 1) : 0);
      // The locket itself: a little silver scale-case at the throat, open while it recharges.
      if (!live(ctx)) return;
      const p = ctx.player;
      const ok = time >= ready;
      g.fillStyle(ok ? 0xd8d4b8 : 0x7a786a, 1); g.fillEllipse(p.x, p.y - 18, 7, 9);
      if (ok) { g.fillStyle(0xffffff, 0.6); g.fillCircle(p.x - 1, p.y - 20, 1.2); }
    },
  };
};

// ── Twin-Fang Ring ───────────────────────────────────────────────────
// Bites come in pairs: land a second hit within 0.8s of the first and both fangs sink in, poisoning
// your foe — 2 damage every 0.5s for 3s. Up to three bites can be working at once.

const twinFangRing: ItemScriptFactory = (ctx) => {
  const PAIR = 800, TICK = 500, LAST = 3000, MAXB = 3;
  let first = -9999;
  const bites: { at: number; next: number; a: number }[] = [];
  return {
    onHitDealt(amount) {
      if (amount < 1 || !foeLive(ctx)) return;
      const t = now(ctx);
      if (t - first <= PAIR) {
        first = -9999;
        if (bites.length >= MAXB) bites.shift();
        bites.push({ at: t, next: t + TICK, a: ctx.rng() * Math.PI * 2 });
        ctx.float(ctx.npc.x, ctx.npc.y - 46, 'BITE', '#c8f060');
        ctx.sfx('stab');
      } else first = t;
    },
    update(time) {
      for (let i = bites.length - 1; i >= 0; i--) {
        const b = bites[i];
        if (time - b.at > LAST || !foeLive(ctx)) { bites.splice(i, 1); continue; }
        if (time >= b.next) { b.next += TICK; ctx.hit(ctx.npc, 2, ctx.npc.x, ctx.npc.y); }
      }
    },
    drawAir(g, time) {
      if (!foeLive(ctx)) return;
      const n = ctx.npc;
      for (const b of bites) {
        const x = n.x + Math.cos(b.a) * 14, y = n.y - 6 + Math.sin(b.a) * 12;
        const fade = 1 - (time - b.at) / LAST;
        for (const s of [-1, 1]) {
          g.fillStyle(0x3a0a14, fade); g.fillCircle(x + s * 3, y, 1.8);
          g.fillStyle(VENOM, fade * 0.8); g.fillCircle(x + s * 3, y + 3 + ((time / 200) % 1) * 4, 1.2);
        }
      }
    },
  };
};

// ── Venin's Milk-Tooth (artifact) ────────────────────────────────────
// Every 8s the tooth is full: your next hit is a lunge-bite, +12 damage, and the puncture pools
// under your foe for 3s (3 every 0.6s while they stand in it). Once a fight, dropping under 35%
// health, his hood flares round you: your foe is held 1.2s and your hits do +30% for 4s.

const milkTooth: ItemScriptFactory = (ctx) => {
  const EVERY = 8000, POOL_MS = 3000, POOL_R = 56;
  let fullAt = -1;
  let pool: { x: number; y: number; until: number; tick: number } | null = null;
  let hooded = false;
  let hoodAt = -9999;
  return {
    update(time) {
      if (fullAt < 0) fullAt = time + EVERY;
      if (pool) {
        if (time > pool.until) pool = null;
        else if (foeLive(ctx) && dist(ctx.npc.x, ctx.npc.y, pool.x, pool.y) < POOL_R && time >= pool.tick) {
          pool.tick = time + 600;
          ctx.hit(ctx.npc, 3, ctx.npc.x, ctx.npc.y);
        }
      }
      if (!hooded && live(ctx) && ctx.player.hp < ctx.player.maxHp * 0.35) {
        hooded = true;
        hoodAt = time;
        if (foeLive(ctx)) ctx.stun(ctx.npc, 1200);
        ctx.boostDamage(1.3, 4000);
        ctx.float(ctx.player.x, ctx.player.y - 60, 'THE HOOD FLARES', '#f2d232');
        ctx.sfx('roar');
      }
    },
    onHitDealt(amount) {
      const t = now(ctx);
      if (amount < 1 || fullAt < 0 || t < fullAt || !foeLive(ctx)) return;
      fullAt = t + EVERY;
      ctx.hit(ctx.npc, 12, ctx.npc.x, ctx.npc.y - 20);
      pool = { x: ctx.npc.x, y: ctx.npc.y + 6, until: t + POOL_MS, tick: t + 600 };
      ctx.float(ctx.npc.x, ctx.npc.y - 56, 'MILK-TOOTH', '#f2d232');
      ctx.sfx('slash');
    },
    drawGround(g, time) {
      if (pool) venomSlick(g, pool.x, pool.y, POOL_R, clamp((pool.until - time) / 500, 0, 1), time, 1.3);
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      // The tooth on a thong at the shoulder: a white fang, its groove filling green until it is full.
      const k = fullAt < 0 ? 0 : clamp(1 - (fullAt - time) / EVERY, 0, 1);
      const x = p.x - 24, y = p.y - 30;
      g.fillStyle(FANG_LIT, 1); g.fillTriangle(x - 4, y - 8, x + 4, y - 8, x + 1, y + 8);
      g.lineStyle(1.5, VENOM_DARK, 1); g.lineBetween(x, y - 6, x + 0.6, y - 6 + 12 * k);
      if (k >= 1) glow(g, x, y, 12, VENOM, 0.06 + Math.sin(time / 120) * 0.03, 2);
      // The hood, for its moment.
      if (time - hoodAt < 4000) {
        const fade = 1 - (time - hoodAt) / 4000;
        g.fillStyle(0x2c3a24, 0.35 * fade); g.fillEllipse(p.x, p.y - 26, 70, 60);
        g.lineStyle(2, COBRA_HOOD, 0.6 * fade); g.strokeEllipse(p.x, p.y - 26, 70, 60);
        g.fillStyle(VENIN_EYE, fade); g.fillCircle(p.x - 10, p.y - 34, 2); g.fillCircle(p.x + 10, p.y - 34, 2);
      }
    },
  };
};

// ── Food scripts ─────────────────────────────────────────────────────

/** Cobra-Catfish Coil: every 10s you coil; your next hit inside 3s strikes from the coil for +9. */
const catfishCoil: ItemScriptFactory = (ctx) => {
  const EVERY = 10000, HOLD = 3000;
  let coiledAt = -1;
  let next = -1;
  return {
    update(time) {
      if (next < 0) next = time + EVERY;
      if (coiledAt < 0 && time >= next) { coiledAt = time; ctx.sfx('status-buff'); }
      if (coiledAt >= 0 && time - coiledAt > HOLD) { coiledAt = -1; next = time + EVERY; }
    },
    onHitDealt(amount) {
      if (coiledAt < 0 || amount < 1 || !foeLive(ctx)) return;
      coiledAt = -1;
      next = now(ctx) + EVERY;
      ctx.hit(ctx.npc, 9, ctx.npc.x, ctx.npc.y);
      ctx.float(ctx.npc.x, ctx.npc.y - 48, 'UNCOILED', '#e8d070');
    },
    drawAir(g, time) {
      if (coiledAt < 0 || !live(ctx)) return;
      const p = ctx.player;
      g.lineStyle(2, COBRA_HOOD, 0.7);
      for (let k = 0; k < 2; k++) { g.strokeEllipse(p.x, p.y + 16 - k * 4, 40 - k * 12, 12 - k * 4); }
      g.fillStyle(COBRA_HOOD, 0.8 + Math.sin(time / 90) * 0.2); g.fillCircle(p.x + 18, p.y + 14, 2.5);
    },
  };
};

/** Viper Eel in the Basket: when you are hit, a 25% chance the eel bites back for 6 (at most every 2s). */
const eelBasket: ItemScriptFactory = (ctx) => {
  let ready = 0;
  let fx = -9999;
  return {
    onHitTaken(amount) {
      const t = now(ctx);
      if (amount < 1 || t < ready || !foeLive(ctx) || ctx.rng() > 0.25) return;
      ready = t + 2000;
      fx = t;
      ctx.hit(ctx.npc, 6, ctx.npc.x, ctx.npc.y);
      ctx.float(ctx.npc.x, ctx.npc.y - 46, 'EEL BITE', '#a8d060');
    },
    drawAir(g, time) {
      if (time - fx > 300 || !foeLive(ctx) || !live(ctx)) return;
      const k = (time - fx) / 300;
      const p = ctx.player, n = ctx.npc;
      g.lineStyle(4, 0x4d7a3a, 1 - k); g.lineBetween(p.x, p.y, p.x + (n.x - p.x) * k, p.y + (n.y - p.y) * k);
      g.fillStyle(BRUISE_LIT, 1 - k); g.fillCircle(p.x + (n.x - p.x) * k, p.y + (n.y - p.y) * k, 3);
    },
  };
};

// ── Item defs ────────────────────────────────────────────────────────

export const FANG_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_HOOK, name: 'Milker\'s Hook', emoji: '🪝', kind: 'charm', price: 360, isle: ISLE,
    flavor: 'A bent iron hook on a leather cord, worn bright. Every milker in the shed carries one. This one\'s owner went grey.',
    script: CHARM_HOOK,
    scriptText: [
      'Land 3 hits within 2.5s to milk your foe: a vial of their venom fills at your belt (2 at most).',
      'Take a blow of 9 or more and you drink one: heal 9.',
    ],
  },
  {
    id: CHARM_REED, name: 'Charmer\'s Reed', emoji: '🪈', kind: 'charm', price: 540, isle: ISLE,
    flavor: 'A gourd pipe with a reed tongue, played smooth by three generations of mouths. The snakes come when it calls.',
    script: CHARM_REED,
    scriptText: [
      'Every 9s a little basket drops at your feet and a cobra rises from it.',
      'The first time your foe comes within 130px, it spits in their eyes: 9 damage, stunned 0.4s.',
    ],
  },
  {
    id: CHARM_LOCKET, name: 'Moult Locket', emoji: '📿', kind: 'charm', price: 760, isle: ISLE,
    flavor: 'A silver case no bigger than a thumbnail with a scrap of shed skin inside. Vipra gives them to the milkers who stay.',
    effect: { maxHp: 6 },
    script: CHARM_LOCKET,
    scriptText: [
      'Once every 12s, a blow of 8 or more sheds you out of your skin: heal back 60% of it.',
      'The skin bursts a second later: 8 to your foe if they are within 100px of it.',
    ],
  },
  {
    id: CHARM_RING, name: 'Twin-Fang Ring', emoji: '💍', kind: 'charm', price: 980, isle: ISLE,
    flavor: 'Two adder fangs set side by side in a band of black horn. The points are still sharp. Do not try it on in a hurry.',
    effect: { critChance: 0.02 },
    script: CHARM_RING,
    scriptText: [
      'Land a second hit within 0.8s of the first and both fangs sink in:',
      'your foe is poisoned for 2 every 0.5s for 3s. Up to 3 bites work at once.',
    ],
  },
  {
    id: ART_VENIN, name: 'Venin\'s Milk-Tooth', emoji: '🦷', kind: 'artifact', isle: ISLE,
    flavor: 'The first fang the Prince ever shed, kept by his nurse on a thong. He bit her with it. She kept it anyway.',
    effect: { maxHp: 14 },
    script: ART_VENIN,
    scriptText: [
      'Every 8s your next hit is a lunge-bite: +12, and venom pools under your foe for 3s (3 every 0.6s).',
      'Once a fight, under 35% health, his hood flares: your foe is held 1.2s and you deal +30% for 4s.',
    ],
  },
  // Snakeroot meal — the Basket's flour, sold at Scaleby's.
  {
    id: MEAL, name: 'Snakeroot Meal', emoji: '🌾', kind: 'material', price: 14, sell: 5, isle: ISLE,
    flavor: 'Ground root of the fen\'s snakeroot, grey and bitter. Bakes into a flat bread that keeps a month in the wet.',
  },
  // The fen's fish.
  {
    id: FISH_MINNOW, name: 'Adder Minnow', emoji: '🐟', kind: 'fish', sell: 16, isle: ISLE,
    flavor: 'A finger of a fish banded like an adder, and it bites like one. The fen children dare each other to hold them.',
    effect: { speedMult: 1.03 },
  },
  {
    id: FISH_CATFISH, name: 'Cobra-Catfish', emoji: '🐡', kind: 'fish', sell: 44, isle: ISLE,
    flavor: 'A heavy black catfish whose gill-flaps spread like a hood when it is hooked. Its whiskers sting.',
    effect: { damageMult: 1.04, maxHp: 6 },
  },
  // The Charmer's Basket.
  {
    id: FOOD_FRITTERS, name: 'Adder Minnow Fritters', emoji: '🍤', kind: 'food', sell: 30, isle: ISLE,
    flavor: 'Minnows battered whole in snakeroot meal and fried crisp. Eaten on the walk out of the shed, by the fistful.',
    effect: { shieldHp: 14, speedMult: 1.03 },
  },
  {
    id: FOOD_COIL, name: 'Cobra-Catfish Coil', emoji: '🥨', kind: 'food', sell: 52, isle: ISLE,
    flavor: 'A catfish fillet rolled in snakeroot dough and baked in a coil, a raisin for an eye. The Basket\'s pride.',
    script: FOOD_COIL,
    scriptText: ['Every 10s you coil: your next hit within 3s strikes from the coil for +9.'],
  },
  {
    id: FOOD_PIE, name: 'Fanged Herring Pie', emoji: '🥧', kind: 'food', sell: 40, isle: ISLE,
    flavor: 'Stilthaven herring under a lid of meal-crust, the heads poking out through it the old way, fangs and all.',
    effect: { maxHp: 10, damageMult: 1.04 },
  },
  {
    id: FOOD_EEL, name: 'Viper Eel in the Basket', emoji: '🧺', kind: 'food', sell: 46, isle: ISLE,
    flavor: 'A smoked viper eel coiled in a little woven basket of flatbread, an adder minnow in its jaws. Mind it.',
    script: FOOD_EEL,
    scriptText: ['When you are hit, a 25% chance the eel bites back for 6 (at most every 2s).'],
  },
  {
    id: FOOD_STEW, name: 'Mire Mullet & Snakeroot Stew', emoji: '🍲', kind: 'food', sell: 34, isle: ISLE,
    flavor: 'Mullet stewed down with snakeroot till it goes grey and thick. Milkers swear it keeps the cold out of the fingers.',
    effect: { regenPerSecond: 0.6, damageTakenMult: 0.96 },
  },
];

export const FANG_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_HOOK]: milkersHook,
  [CHARM_REED]: charmersReed,
  [CHARM_LOCKET]: moultLocket,
  [CHARM_RING]: twinFangRing,
  [ART_VENIN]: milkTooth,
  [FOOD_COIL]: catfishCoil,
  [FOOD_EEL]: eelBasket,
};

export const FANG_SHOPS: ShopDef[] = [
  { id: 'fang-shop', name: 'Scaleby\'s Phials & Charms', stock: [CHARM_HOOK, CHARM_REED, CHARM_LOCKET, CHARM_RING, MEAL], buys: true },
];

export const FANG_BAKERIES: BakeryDef[] = [{
  id: BAKERY_ID,
  name: 'The Charmer\'s Basket',
  recipes: [
    {
      id: RECIPE_FRITTERS, name: 'Adder Minnow Fritters',
      inputs: [{ item: FISH_MINNOW, count: 3 }, { item: MEAL, count: 1 }], coins: 18, output: FOOD_FRITTERS, makes: 2,
    },
    {
      id: RECIPE_COIL, name: 'Cobra-Catfish Coil',
      inputs: [{ item: FISH_CATFISH, count: 1 }, { item: MEAL, count: 1 }], coins: 30, output: FOOD_COIL,
    },
    {
      id: RECIPE_PIE, name: 'Fanged Herring Pie',
      inputs: [{ item: FISH_HERRING, count: 2 }, { item: MEAL, count: 1 }], coins: 26, output: FOOD_PIE,
    },
    {
      id: RECIPE_EEL, name: 'Viper Eel in the Basket',
      inputs: [{ item: FISH_EEL, count: 1 }, { item: FISH_MINNOW, count: 1 }, { item: MEAL, count: 1 }], coins: 34, output: FOOD_EEL,
    },
    {
      id: RECIPE_STEW, name: 'Mire Mullet & Snakeroot Stew',
      inputs: [{ item: FISH_MULLET, count: 2 }, { item: MEAL, count: 2 }], coins: 22, output: FOOD_STEW,
    },
  ],
}];

export const FANG_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Venom Fen', kind: 'venom' }];

export const FANG_FISH: FishDef[] = [
  { id: FISH_MINNOW, fisheries: [FISHERY], weight: 6, fight: 2, size: [6, 14] },
  { id: FISH_CATFISH, fisheries: [FISHERY], weight: 3, fight: 4, size: [40, 96] },
];
