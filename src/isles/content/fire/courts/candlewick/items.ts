import type {
  BakeryDef, FishDef, FisheryDef, IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory, ShopDef,
} from '../../../../IslesTypes';
import { dim } from '../../../../art/IsleArt';
import {
  FLAME_MID, HONEY, HONEY_DARK, WAX, WICK, bee, dist, flame, hexPath, waxPuddle,
} from './art';

/**
 * Candlewick's goods: the four charms Mother Cerelle sells, Prince Tallow's artifact, the
 * three wax-pond fish, the honey and wax the bakery cooks with, and the Honeyed Wick's four
 * meals. Every charm, meal and the artifact runs a bespoke script (registered below under its
 * own id); `scriptText` is what the inventory prints for it.
 */

const ISLE = 'fire';

// ── Ids ──────────────────────────────────────────────────────────────

export const HONEYCOMB = 'candlewick-honeycomb';
export const BEESWAX = 'candlewick-beeswax';
export const ROYAL_JELLY = 'candlewick-royal-jelly';

export const CHARM_DRIP_RING = 'candlewick-drip-ring';
export const CHARM_SHEARS = 'candlewick-wick-shears';
export const CHARM_THIMBLE = 'candlewick-queens-thimble';
export const CHARM_TAPER = 'candlewick-vigil-taper';
export const ART_TALLOW = 'art-tallow';

export const FOOD_WICKFIN = 'candlewick-food-wickfin-taper';
export const FOOD_TROUT = 'candlewick-food-trout-in-tallow';
export const FOOD_RAY_PIE = 'candlewick-food-honeycomb-ray-pie';
export const FOOD_HIVE_LOAF = 'candlewick-food-hive-loaf';

export const RECIPE_WICKFIN = 'candlewick-recipe-wickfin-taper';
export const RECIPE_TROUT = 'candlewick-recipe-trout-in-tallow';
export const RECIPE_RAY_PIE = 'candlewick-recipe-honeycomb-ray-pie';
export const RECIPE_HIVE_LOAF = 'candlewick-recipe-hive-loaf';

export const FISH_WICKFIN = 'fish-wickfin';
export const FISH_TROUT = 'fish-tallow-trout';
export const FISH_RAY = 'fish-honeycomb-ray';
export const FISHERY = 'candlewick-waxpond';

// ── Item defs ────────────────────────────────────────────────────────

export const CANDLEWICK_ITEMS: IsleItemDef[] = [
  // Materials.
  {
    id: HONEYCOMB, name: 'Honeycomb Slab', emoji: '🍯', kind: 'material', price: 18, sell: 6, isle: ISLE,
    flavor: 'Cut from the beehive towers before the Inchwardens could weigh it. Still warm from the bees.',
  },
  {
    id: BEESWAX, name: 'Beeswax Cake', emoji: '🧈', kind: 'material', price: 14, sell: 5, isle: ISLE,
    flavor: 'Pale, sweet-smelling wax. Too good for a tithe candle, which is why it is sold under the counter.',
  },
  {
    id: ROYAL_JELLY, name: 'Royal Jelly', emoji: '🫙', kind: 'material', price: 45, sell: 18, isle: ISLE,
    flavor: 'What the hives feed their queens. The Prince had it spooned into his wax so he would grow taller.',
  },

  // Charms.
  {
    id: CHARM_DRIP_RING, name: 'Dripping Ring', emoji: '💍', kind: 'charm', price: 180, isle: ISLE,
    flavor: 'A chandler\'s ring with a cup of wax set in it. It never stops dripping and never runs dry.',
    script: CHARM_DRIP_RING,
    scriptText: [
      'While you move, you leave a drip of wax behind you every 1.4s (up to 5).',
      'Drips set after a moment; a foe who steps on a set drip cracks it for 7 damage.',
    ],
  },
  {
    id: CHARM_SHEARS, name: 'Wick-Trimmer\'s Shears', emoji: '✂️', kind: 'charm', price: 240, isle: ISLE,
    flavor: 'A trimmed wick burns cleaner. Every chandler in Candlewick carries a pair on a cord.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_SHEARS,
    scriptText: [
      'Taking a hit trims your wick: the next ability you cast within 2.5s gets 1.5s back on its cooldown.',
      'Trims at most once every 4s.',
    ],
  },
  {
    id: CHARM_THIMBLE, name: 'Queen\'s Thimble', emoji: '🐝', kind: 'charm', price: 320, isle: ISLE,
    flavor: 'A wax thimble from a beehive tower. Something small and loyal still lives in it.',
    script: CHARM_THIMBLE,
    scriptText: [
      'Every 5th hit you land wakes a bee that circles you (up to 3).',
      'After a few seconds each bee dives at the foe and stings for 9.',
    ],
  },
  {
    id: CHARM_TAPER, name: 'Vigil Taper', emoji: '🕯️', kind: 'charm', price: 420, isle: ISLE,
    flavor: 'A cathedral taper, stolen from the nave and very sorry about it. It burns down as you fight.',
    script: CHARM_TAPER,
    scriptText: [
      'A taper burns over your shoulder for about 50s.',
      'Stand still for a moment in its light and it heals 2.5 HP/s — burning faster while it does.',
      'Casting your ultimate relights it to full.',
    ],
  },

  // Artifact.
  {
    id: ART_TALLOW, name: 'Tallow\'s Last Inch', emoji: '🕯️', kind: 'artifact', isle: ISLE,
    flavor: 'The last inch of the Tall Candle, wick and all. It will not go out, and it will not stop growing.',
    effect: { maxHp: 15 },
    script: ART_TALLOW,
    scriptText: [
      'The Tall Candle: while above 60% HP, your wick flares every 6s, scorching a foe within 150px for 6.',
      'Last Light: the first time you fall below 30% HP, you burn down — heal 25% of your max HP over 3s,',
      'and deal 30% more damage and move 15% faster for 7s.',
    ],
  },

  // Fish.
  {
    id: FISH_WICKFIN, name: 'Wickfin', emoji: '🐟', kind: 'fish', sell: 14, isle: ISLE,
    flavor: 'A pale little fish with a dorsal fin like a burnt wick. Grows on the candle-ends the court drowns.',
    effect: { speedMult: 1.04 },
  },
  {
    id: FISH_TROUT, name: 'Tallow Trout', emoji: '🐠', kind: 'fish', sell: 22, isle: ISLE,
    flavor: 'Fat, slow and greasy. Its flesh sets like suet when it cools. Bettony swears by it.',
    effect: { maxHp: 8 },
  },
  {
    id: FISH_RAY, name: 'Honeycomb Ray', emoji: '🐡', kind: 'fish', sell: 40, isle: ISLE,
    flavor: 'A flat ray patterned in hexagons, with honey in the cells of its back. Bees follow it to the shore.',
    effect: { regenPerSecond: 0.5 },
  },

  // Meals — The Honeyed Wick.
  {
    id: FOOD_WICKFIN, name: 'Wickfin on a Taper', emoji: '🍢', kind: 'food', sell: 20, isle: ISLE,
    flavor: 'Two wickfin threaded on a beeswax taper and lit. You eat it while it is still burning.',
    script: FOOD_WICKFIN,
    scriptText: ['For the first 25s you trail little flames; a foe who walks through one is scorched for 3.'],
  },
  {
    id: FOOD_TROUT, name: 'Trout Sealed in Tallow', emoji: '🥘', kind: 'food', sell: 34, isle: ISLE,
    flavor: 'A tallow trout baked inside a shell of beeswax. Crack the seal at the table.',
    effect: { shieldHp: 25 },
    script: FOOD_TROUT,
    scriptText: ['The third hit you take cracks the tallow seal: you heal 12 and the shards hit a foe within 160px for 10.'],
  },
  {
    id: FOOD_RAY_PIE, name: 'Honeycomb Ray Pie', emoji: '🥧', kind: 'food', sell: 60, isle: ISLE,
    flavor: 'A ray baked whole under a lattice of comb, with a spoon of royal jelly. Bettony\'s pride.',
    script: FOOD_RAY_PIE,
    scriptText: ['Hits you land fill a six-cell honeycomb (one cell per 0.4s). A full comb heals 24 and empties.'],
  },
  {
    id: FOOD_HIVE_LOAF, name: 'Mackerel Hive-Loaf', emoji: '🍞', kind: 'food', sell: 26, isle: ISLE,
    flavor: 'Smoked ashfin mackerel baked into a domed loaf scored like a skep, honey brushed over the top.',
    script: FOOD_HIVE_LOAF,
    scriptText: ['Cast your Click, E, R and F abilities each once within 8s to work every cell: +25% damage for 5s.'],
  },
];

// ── Scripts ──────────────────────────────────────────────────────────

/** Dripping Ring — drips that set behind you and crack under the foe. */
const dripRing: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  interface Drop { x: number; y: number; bornAt: number }
  let drops: Drop[] = [];
  let lastX = ctx.player.x, lastY = ctx.player.y;
  let moved = 0;
  let nextAt = 0;
  return {
    update(time) {
      const p = ctx.player;
      moved += dist(lastX, lastY, p.x, p.y);
      lastX = p.x; lastY = p.y;
      if (time >= nextAt && moved > 40) {
        nextAt = time + 1400; moved = 0;
        drops.push({ x: p.x, y: p.y + 12, bornAt: time });
        if (drops.length > 5) drops.shift();
      }
      const n = ctx.npc;
      for (const d of drops) {
        if (time - d.bornAt < 900) continue;
        if (n.active && n.hp > 0 && dist(d.x, d.y, n.x, n.y) < 26) {
          ctx.hit(n, 7, d.x, d.y);
          ctx.float(d.x, d.y - 20, 'CRACK', '#f3e3bf');
          ctx.sfx('crystal-shatter');
          d.bornAt = -1;
        }
      }
      drops = drops.filter((d) => d.bornAt >= 0 && time - d.bornAt < 14000);
    },
    drawGround(g, time) {
      for (const d of drops) {
        const set = Math.min(1, (time - d.bornAt) / 900);
        waxPuddle(g, d.x, d.y, 12, time / 1000, set, 0xf6d48c, d.x);
      }
    },
  };
};

/** Wick-Trimmer's Shears — a hit taken shortens the next cast's cooldown. */
const shears: ItemScriptFactory = (ctx) => {
  let armedUntil = 0;
  let lockedUntil = 0;
  return {
    onHitTaken() {
      const now = ctx.scene.time.now;
      if (now < lockedUntil) return;
      armedUntil = now + 2500;
      lockedUntil = now + 4000;
    },
    onCast(abilityId) {
      const now = ctx.scene.time.now;
      if (now >= armedUntil) return;
      armedUntil = 0;
      ctx.refund(abilityId, 1500);
      ctx.float(ctx.player.x, ctx.player.y - 48, 'TRIMMED', '#ffe3a0');
      ctx.sfx('snap-back');
    },
    drawAir(g, time) {
      if (time >= armedUntil) return;
      const p = ctx.player;
      const open = Math.abs(Math.sin(time / 90)) * 0.5;
      for (const s of [-1, 1]) {
        g.lineStyle(2.5, 0xc0c4cc, 0.95);
        g.lineBetween(p.x + 14, p.y - 40, p.x + 14 + Math.cos(-Math.PI / 2 + s * open) * 12, p.y - 40 + Math.sin(-Math.PI / 2 + s * open) * 12);
      }
      g.fillStyle(FLAME_MID, 0.9); g.fillCircle(p.x + 14, p.y - 54, 2.2);
    },
  };
};

/** Queen's Thimble — every fifth hit wakes a bee that later dives at the foe. */
const thimble: ItemScriptFactory = (ctx) => {
  interface Bee { bornAt: number; diveAt: number; x: number; y: number; diving: boolean; seed: number }
  let hits = 0;
  let bees: Bee[] = [];
  return {
    onHitDealt() {
      hits++;
      if (hits % 5 !== 0 || bees.length >= 3) return;
      const now = ctx.scene.time.now;
      bees.push({ bornAt: now, diveAt: now + 2600, x: ctx.player.x, y: ctx.player.y, diving: false, seed: ctx.rng() * 10 });
      ctx.sfx('drone-buzz');
    },
    update(time, dt) {
      const p = ctx.player, n = ctx.npc;
      for (const b of bees) {
        if (!b.diving) {
          const a = time / 300 + b.seed;
          b.x = p.x + Math.cos(a) * 30;
          b.y = p.y - 18 + Math.sin(a) * 16;
          if (time >= b.diveAt) b.diving = true;
          continue;
        }
        const d = dist(b.x, b.y, n.x, n.y);
        const step = 360 * dt;
        if (d <= step + 12) {
          if (n.active && n.hp > 0) { ctx.hit(n, 9, n.x, n.y); ctx.sfx('stab'); }
          b.bornAt = -1;
          continue;
        }
        b.x += ((n.x - b.x) / d) * step;
        b.y += ((n.y - b.y) / d) * step;
      }
      bees = bees.filter((b) => b.bornAt >= 0 && time - b.bornAt < 9000);
    },
    drawAir(g, time) {
      for (const b of bees) bee(g, b.x, b.y, time / 1000, b.seed, b.diving ? 1.3 : 1.1);
    },
  };
};

/** Vigil Taper — a burning shoulder-taper that heals you while you hold still. */
const vigilTaper: ItemScriptFactory = (ctx) => {
  let wax = 100;
  let stillFor = 0;
  let lastX = ctx.player.x, lastY = ctx.player.y;
  let healAcc = 0;
  let relitFlash = 0;
  return {
    update(_time, dt) {
      const p = ctx.player;
      const moved = dist(lastX, lastY, p.x, p.y);
      lastX = p.x; lastY = p.y;
      stillFor = moved < 1.2 ? stillFor + dt : 0;
      if (wax <= 0) return;
      let burn = 2;
      if (stillFor > 0.8 && p.hp < p.maxHp) {
        burn += 4;
        healAcc += 2.5 * dt;
        if (healAcc >= 1) { const w = Math.floor(healAcc); healAcc -= w; ctx.heal(p, w); }
      }
      wax = Math.max(0, wax - burn * dt);
      if (wax <= 0) ctx.float(p.x, p.y - 50, 'THE TAPER GUTTERS', '#c9c2b8');
    },
    onCast(_id, slot) {
      if (slot !== 'q') return;
      wax = 100;
      relitFlash = ctx.scene.time.now + 500;
      ctx.float(ctx.player.x, ctx.player.y - 50, 'RELIT', '#ffd27a');
    },
    drawGround(g) {
      if (wax <= 0 || stillFor <= 0.8) return;
      const p = ctx.player;
      g.fillStyle(HONEY, 0.12); g.fillEllipse(p.x, p.y + 8, 110, 70);
    },
    drawAir(g, time) {
      const p = ctx.player;
      const x = p.x - 22, base = p.y - 26;
      const h = 4 + (wax / 100) * 24;
      g.fillStyle(dim(WAX, 0.3), 1); g.fillRect(x - 3.5, base - h, 7, h);
      g.fillStyle(WAX, 1); g.fillRect(x - 2.8, base - h, 4.6, h);
      g.lineStyle(1.2, WICK, 1); g.lineBetween(x, base - h, x, base - h - 3);
      if (wax > 0) flame(g, x, base - h - 3, time < relitFlash ? 7 : 4, time / 1000, 9, 0.04);
    },
  };
};

/** Tallow's Last Inch — flares while tall, burns down once when low. */
const lastInch: ItemScriptFactory = (ctx) => {
  let nextFlare = 0;
  let burnedDown = false;
  let healLeft = 0;
  let healAcc = 0;
  let burnUntil = 0;
  let flareAt = -9999;
  return {
    update(time, dt) {
      const p = ctx.player, n = ctx.npc;
      const r = p.hp / p.maxHp;
      if (r > 0.6 && time >= nextFlare) {
        nextFlare = time + 6000;
        flareAt = time;
        if (n.active && n.hp > 0 && dist(p.x, p.y, n.x, n.y) < 150) {
          ctx.hit(n, 6, n.x, n.y);
          ctx.sfx('flame-burst');
        }
      }
      if (healLeft > 0) {
        const step = Math.min(healLeft, (p.maxHp * 0.25 / 3) * dt);
        healLeft -= step;
        healAcc += step;
        if (healAcc >= 1) { const w = Math.floor(healAcc); healAcc -= w; ctx.heal(p, w); }
      }
    },
    onHitTaken() {
      const p = ctx.player;
      if (burnedDown || p.hp <= 0 || p.hp / p.maxHp >= 0.3) return;
      burnedDown = true;
      healLeft = p.maxHp * 0.25;
      burnUntil = ctx.scene.time.now + 7000;
      ctx.boostDamage(1.3, 7000);
      ctx.boostSpeed(1.15, 7000);
      ctx.flash(p.x, p.y, 0xfff3c4);
      ctx.float(p.x, p.y - 56, 'LAST LIGHT', '#fff3c4');
      ctx.sfx('holy-chord');
    },
    drawGround(g, time) {
      const k = (time - flareAt) / 450;
      if (k < 0 || k > 1) return;
      const p = ctx.player;
      g.lineStyle(4 * (1 - k), FLAME_MID, 0.8 * (1 - k));
      g.strokeCircle(p.x, p.y, 30 + 120 * k);
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (time < burnUntil) {
        flame(g, p.x, p.y - 34, 9 + Math.sin(time / 60) * 1.5, time / 1000, 4, 0.08);
        return;
      }
      if (!burnedDown && p.hp / p.maxHp > 0.6) {
        g.lineStyle(1.2, WICK, 1); g.lineBetween(p.x, p.y - 30, p.x, p.y - 35);
        flame(g, p.x, p.y - 35, 3.5, time / 1000, 4, 0);
      }
    },
  };
};

/** Wickfin on a Taper — a trail of little flames for the opening 25s. */
const wickfinTaper: ItemScriptFactory = (ctx) => {
  interface Spot { x: number; y: number; bornAt: number; spent: boolean }
  let spots: Spot[] = [];
  let startAt = -1;
  let nextAt = 0;
  return {
    update(time) {
      if (startAt < 0) startAt = time;
      const p = ctx.player, n = ctx.npc;
      if (time - startAt < 25000 && time >= nextAt) {
        nextAt = time + 350;
        spots.push({ x: p.x, y: p.y + 10, bornAt: time, spent: false });
      }
      for (const s of spots) {
        if (s.spent || time - s.bornAt < 250) continue;
        if (n.active && n.hp > 0 && dist(s.x, s.y, n.x, n.y) < 24) {
          s.spent = true;
          ctx.hit(n, 3, s.x, s.y);
        }
      }
      spots = spots.filter((s) => !s.spent && time - s.bornAt < 1600);
    },
    drawGround(g, time) {
      for (const s of spots) {
        const k = 1 - (time - s.bornAt) / 1600;
        flame(g, s.x, s.y, 4 * k + 1, time / 1000, s.x, 0.03);
      }
    },
  };
};

/** Trout Sealed in Tallow — the third hit cracks the seal. */
const troutSeal: ItemScriptFactory = (ctx) => {
  let taken = 0;
  let crackedAt = -1;
  return {
    onHitTaken() {
      if (crackedAt >= 0) return;
      taken++;
      if (taken < 3) return;
      crackedAt = ctx.scene.time.now;
      const p = ctx.player, n = ctx.npc;
      ctx.heal(p, 12);
      ctx.float(p.x, p.y - 50, 'THE SEAL CRACKS', '#f3e3bf');
      ctx.sfx('ice-shatter');
      if (n.active && n.hp > 0 && dist(p.x, p.y, n.x, n.y) < 160) ctx.hit(n, 10, n.x, n.y);
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (crackedAt < 0) {
        // The seal: a tallow crust round your feet, one crack per hit taken.
        g.lineStyle(3, WAX, 0.55); g.strokeEllipse(p.x, p.y + 10, 46, 18);
        for (let i = 0; i < taken; i++) {
          const a = 0.6 + i * 1.9;
          g.lineStyle(1.5, dim(WAX, 0.5), 0.9);
          g.lineBetween(p.x + Math.cos(a) * 23, p.y + 10 + Math.sin(a) * 9, p.x + Math.cos(a) * 15, p.y + 10 + Math.sin(a) * 5);
        }
        return;
      }
      const k = (time - crackedAt) / 600;
      if (k > 1) return;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.fillStyle(WAX, 1 - k);
        g.fillRect(p.x + Math.cos(a) * 160 * k - 3, p.y + Math.sin(a) * 120 * k - 2, 6, 4);
      }
    },
  };
};

/** Honeycomb Ray Pie — fill six cells with hits, then drink the comb. */
const rayPie: ItemScriptFactory = (ctx) => {
  let cells = 0;
  let lastFill = 0;
  let fullFlash = 0;
  return {
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (now - lastFill < 400) return;
      lastFill = now;
      cells++;
      if (cells >= 6) {
        cells = 0;
        fullFlash = now + 600;
        ctx.heal(ctx.player, 24);
        ctx.float(ctx.player.x, ctx.player.y - 52, 'HONEYCOMB', '#ffd36a');
        ctx.sfx('bubble');
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      const full = time < fullFlash;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
        const x = p.x + Math.cos(a) * 9, y = p.y - 50 + Math.sin(a) * 9;
        hexPath(g, x, y, 4.8, full || i < cells ? HONEY : 0x3a2c18, full || i < cells ? 0.95 : 0.55, HONEY_DARK);
      }
    },
  };
};

/** Mackerel Hive-Loaf — work every cell (Click, E, R, F) inside eight seconds. */
const hiveLoaf: ItemScriptFactory = (ctx) => {
  const SLOTS = ['click', 'e', 'r', 'f'];
  const worked = new Map<string, number>();
  let tunedUntil = 0;
  return {
    onCast(_id, slot) {
      if (!slot || !SLOTS.includes(slot)) return;
      const now = ctx.scene.time.now;
      worked.set(slot, now);
      for (const [k, at] of worked) if (now - at > 8000) worked.delete(k);
      if (worked.size === SLOTS.length) {
        worked.clear();
        tunedUntil = now + 5000;
        ctx.boostDamage(1.25, 5000);
        ctx.float(ctx.player.x, ctx.player.y - 52, 'THE HIVE IS IN TUNE', '#ffd36a');
        ctx.sfx('sparkle');
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      const now = time;
      SLOTS.forEach((s, i) => {
        const at = worked.get(s);
        const on = at !== undefined && now - at <= 8000;
        hexPath(g, p.x - 15 + i * 10, p.y - 46, 4.2, on ? HONEY : 0x3a2c18, on ? 0.95 : 0.4);
      });
      if (time < tunedUntil) bee(g, p.x + Math.sin(time / 120) * 18, p.y - 58, time / 1000, 3, 1);
    },
  };
};

export const CANDLEWICK_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_DRIP_RING]: dripRing,
  [CHARM_SHEARS]: shears,
  [CHARM_THIMBLE]: thimble,
  [CHARM_TAPER]: vigilTaper,
  [ART_TALLOW]: lastInch,
  [FOOD_WICKFIN]: wickfinTaper,
  [FOOD_TROUT]: troutSeal,
  [FOOD_RAY_PIE]: rayPie,
  [FOOD_HIVE_LOAF]: hiveLoaf,
};

// ── Shop, bakery, fish ───────────────────────────────────────────────

export const CANDLEWICK_SHOPS: ShopDef[] = [{
  id: 'candlewick-shop',
  name: 'Cerelle\'s Chandlery',
  stock: [CHARM_DRIP_RING, CHARM_SHEARS, CHARM_THIMBLE, CHARM_TAPER, HONEYCOMB, BEESWAX, ROYAL_JELLY],
  buys: true,
}];

export const CANDLEWICK_BAKERIES: BakeryDef[] = [{
  id: 'candlewick-bakery',
  name: 'The Honeyed Wick',
  recipes: [
    { id: RECIPE_WICKFIN, name: 'Wickfin on a Taper', inputs: [{ item: FISH_WICKFIN, count: 2 }, { item: BEESWAX, count: 1 }], coins: 20, output: FOOD_WICKFIN },
    { id: RECIPE_TROUT, name: 'Trout Sealed in Tallow', inputs: [{ item: FISH_TROUT, count: 1 }, { item: BEESWAX, count: 1 }], coins: 30, output: FOOD_TROUT },
    {
      id: RECIPE_RAY_PIE, name: 'Honeycomb Ray Pie',
      inputs: [{ item: FISH_RAY, count: 1 }, { item: HONEYCOMB, count: 1 }, { item: ROYAL_JELLY, count: 1 }],
      coins: 40, output: FOOD_RAY_PIE,
    },
    {
      id: RECIPE_HIVE_LOAF, name: 'Mackerel Hive-Loaf',
      inputs: [{ item: 'fish-ashfin-mackerel', count: 1 }, { item: HONEYCOMB, count: 1 }],
      coins: 25, output: FOOD_HIVE_LOAF, makes: 2,
    },
  ],
}];

export const CANDLEWICK_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Wax Pond', kind: 'wax' }];

export const CANDLEWICK_FISH: FishDef[] = [
  { id: FISH_WICKFIN, fisheries: [FISHERY], weight: 6, fight: 2, size: [9, 18] },
  { id: FISH_TROUT, fisheries: [FISHERY], weight: 3, fight: 3, size: [28, 52] },
  { id: FISH_RAY, fisheries: [FISHERY], weight: 1, fight: 4, size: [40, 90] },
];
