import type {
  BakeryDef, FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef,
} from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { breathBottle, kite, sails, windsock } from './art';
import { BRASS, BRASS_DARK, BRASS_LIT, BREATH, CANVAS, KITE_BLUE, KITE_RED, ROPE, TAR } from './palette';
import { alive, clamp, clock, dist, segDist, turnToward, wrapAngle } from './util';

/**
 * The Galeward Court's goods: Hesper Lanyard's four charms from the Ropewalk, Prince Zephyr's
 * weathercock, the Cloudbank's two fish, the Millstone's bakes and the flour they are baked from.
 * Every charm is a Galeward thing that plays one of the court's own winds in your favour — the
 * windsock's quarter, a glass-lined kite, a mill's sails, a corked breath. Scripts are registered
 * below under their item ids.
 */

const ISLE = 'air';

export const CHARM_WINDSOCK = 'galeward-charm-windsock-pin';
export const CHARM_SPOOL = 'galeward-charm-glass-spool';
export const CHARM_SAILBEAD = 'galeward-charm-millsail-bead';
export const CHARM_BOTTLE = 'galeward-charm-spare-breath';
export const ART_ZEPHYR = 'art-zephyr';

export const FISH_SPRAT = 'fish-cirrus-sprat';
export const FISH_FLYINGFISH = 'fish-gale-flyingfish';
export const FISHERY = 'galeward-cloudbank';

export const FLOUR_ITEM = 'galeward-stone-flour';
export const FOOD_BAP = 'galeward-food-sprat-bap';
export const FOOD_PIE = 'galeward-food-flyingfish-pie';
export const FOOD_WINDBREAD = 'galeward-food-herring-windbread';
export const FOOD_CLOUDCAKE = 'galeward-food-cod-cloudcake';
export const FOOD_SLEEPERS = 'galeward-food-sleepers-bun';

export const RECIPE_BAP = 'galeward-r-sprat-bap';
export const RECIPE_PIE = 'galeward-r-flyingfish-pie';
export const RECIPE_WINDBREAD = 'galeward-r-herring-windbread';
export const RECIPE_CLOUDCAKE = 'galeward-r-cod-cloudcake';
export const RECIPE_SLEEPERS = 'galeward-r-sleepers-bun';

export const BAKERY_ID = 'galeward-millstone';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

/** The player's walking velocity, smoothed — for the charms that care which way you go. */
function walker(ctx: ItemScriptCtx): (dt: number) => { vx: number; vy: number } {
  let lx = ctx.player.x, ly = ctx.player.y, vx = 0, vy = 0;
  return (dt) => {
    if (dt > 0) { vx = vx * 0.7 + ((ctx.player.x - lx) / dt) * 0.3; vy = vy * 0.7 + ((ctx.player.y - ly) / dt) * 0.3; }
    lx = ctx.player.x; ly = ctx.player.y;
    return { vx, vy };
  };
}

// ── Windsock Pin ─────────────────────────────────────────────────────
// A thumb-sized windsock on your collar. Its wind turns a quarter every 5s. While your foe stands
// downwind of you your blows ride the wind (+25%); walking with it, you are quicker (+12%).

const windsockPin: ItemScriptFactory = (ctx) => {
  const step = clock();
  const walk = walker(ctx);
  let wind = 0, from = 0, to = 0, swingAt = -1, next = 5000, boostUntil = 0, speedUntil = 0;
  let downwind = false;
  return {
    update(time) {
      const dt = step(time);
      const v = walk(dt);
      if (!live(ctx)) return;
      if (time >= next && swingAt < 0) {
        from = wind;
        to = wind + (ctx.rng() < 0.5 ? 1 : -1) * (Math.PI / 4) * (1 + Math.floor(ctx.rng() * 3));
        swingAt = time;
      }
      if (swingAt >= 0) {
        const k = clamp((time - swingAt) / 600, 0, 1);
        wind = from + (to - from) * k;
        if (k >= 1) { swingAt = -1; next = time + 5000; }
      }
      const p = ctx.player, n = ctx.npc;
      const d = dist(p.x, p.y, n.x, n.y) || 1;
      downwind = foeLive(ctx) && ((n.x - p.x) * Math.cos(wind) + (n.y - p.y) * Math.sin(wind)) / d > 0.7;
      if (downwind && time >= boostUntil) { ctx.boostDamage(1.25, 260); boostUntil = time + 250; }
      const sp = Math.hypot(v.vx, v.vy);
      if (sp > 60 && (v.vx * Math.cos(wind) + v.vy * Math.sin(wind)) / sp > 0.6 && time >= speedUntil) { ctx.boostSpeed(1.12, 260); speedUntil = time + 250; }
    },
    drawGround(g) {
      if (!live(ctx)) return;
      const p = ctx.player;
      // The wind's line on the floor ahead of you, bright when the foe is on it.
      g.lineStyle(downwind ? 2 : 1, downwind ? 0xffffff : 0xcde9fb, downwind ? 0.55 : 0.2);
      g.lineBetween(p.x, p.y + 12, p.x + Math.cos(wind) * 110, p.y + 12 + Math.sin(wind) * 110);
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      windsock(g, p.x - 22, p.y - 6, time / 1000, 1, wind);
      if (downwind) glow(g, p.x - 22 + Math.cos(wind) * 20, p.y - 62, 10, 0xffffff, 0.06, 2);
    },
  };
};

// ── Glass Spool ──────────────────────────────────────────────────────
// A fighting kite on 120px of glass-coated line, flown off your back. It streams behind you as
// you go; whoever runs through the line — your foe — is cut for 7, at most every 0.9s.

const glassSpool: ItemScriptFactory = (ctx) => {
  const step = clock();
  const walk = walker(ctx);
  const LEN = 120;
  let a = Math.PI, kx = -1, ky = -1, lastCut = 0, cutFx = 0;
  return {
    update(time) {
      const dt = step(time);
      const v = walk(dt);
      if (!live(ctx)) return;
      const p = ctx.player;
      const sp = Math.hypot(v.vx, v.vy);
      // Streams behind your walk; when you stand still it drifts east on the Galeward wind.
      const want = sp > 40 ? Math.atan2(-v.vy, -v.vx) : Math.sin(time / 1200) * 0.6;
      a = turnToward(a, want, 2.4 * dt);
      kx = p.x + Math.cos(a) * LEN; ky = p.y - 20 + Math.sin(a) * LEN * 0.8;
      const n = ctx.npc;
      if (foeLive(ctx) && time - lastCut > 900 && segDist(n.x, n.y, p.x, p.y - 20, kx, ky) < 12) {
        lastCut = time; cutFx = time;
        ctx.hit(n, 7, n.x, n.y);
        ctx.float(n.x, n.y - 46, 'CUT', '#9fd0f2');
        ctx.sfx('slash');
      }
    },
    drawAir(g, time) {
      if (!live(ctx) || kx < 0) return;
      const p = ctx.player;
      g.lineStyle(1.5, time - cutFx < 200 ? 0xffffff : ROPE, 1); g.lineBetween(p.x, p.y - 20, kx, ky);
      for (let i = 1; i < 5; i++) {
        const t = ((time / 300) + i / 5) % 1;
        g.fillStyle(0xffffff, 0.6); g.fillRect(p.x + (kx - p.x) * t - 1, p.y - 20 + (ky - p.y + 20) * t - 1, 2, 2);
      }
      kite(g, kx, ky, 0.9, KITE_BLUE, a, time / 1000);
    },
  };
};

// ── Millsail Bead ────────────────────────────────────────────────────
// A wooden bead carved as a mill's cap. Every 5th hit you land sets four little sails turning
// round you for 3s; each one that sweeps through the foe clips them for 4.

const millsailBead: ItemScriptFactory = (ctx) => {
  const step = clock();
  let hits = 0, until = 0, ang = 0;
  const lastClip = [0, 0, 0, 0];
  const R0 = 26, R1 = 80;
  return {
    onHitDealt(amount) {
      if (amount < 2) return;
      const now = ctx.scene.time.now;
      if (now < until) return;
      hits++;
      if (hits % 5 === 0) { until = now + 3000; ctx.float(ctx.player.x, ctx.player.y - 50, 'SAILS UP', '#f1e8d2'); ctx.sfx('gear-turn'); }
    },
    update(time) {
      const dt = step(time);
      if (time >= until || !live(ctx)) return;
      ang += 4.2 * dt;
      const p = ctx.player, n = ctx.npc;
      if (!foeLive(ctx)) return;
      const d = dist(p.x, p.y, n.x, n.y);
      if (d < R0 || d > R1 + 16) return;
      const na = Math.atan2(n.y - p.y, n.x - p.x);
      for (let i = 0; i < 4; i++) {
        if (time - lastClip[i] < 500) continue;
        if (Math.abs(wrapAngle(na - (ang + (i * Math.PI) / 2))) < 0.2) {
          lastClip[i] = time;
          ctx.hit(n, 4, n.x, n.y);
          ctx.sfx('hit-light');
        }
      }
    },
    drawAir(g, time) {
      if (time >= until || !live(ctx)) return;
      const p = ctx.player;
      const fade = clamp((until - time) / 400, 0, 1);
      g.fillStyle(0xffffff, 0.05 * fade); g.fillCircle(p.x, p.y, R1);
      sails(g, { x: p.x, y: p.y - 4, r: R1 }, ang, 1, CANVAS, 0.6);
    },
  };
};

// ── Spare Breath ─────────────────────────────────────────────────────
// A corked breath-bottle, empty, on a cord round your neck. Each hit you take puts a fifth of a
// breath into it. Full, your next landed hit uncorks it: a gust into the foe for 18, 8 health
// back, and +20% speed for 2s.

const spareBreath: ItemScriptFactory = (ctx) => {
  let fill = 0;
  let gustFx: { x: number; y: number; at: number } | null = null;
  return {
    onHitTaken(amount) {
      if (amount < 2 || fill >= 5) return;
      fill++;
      if (fill === 5) { ctx.float(ctx.player.x, ctx.player.y - 50, 'BREATH HELD', '#9fe2ff'); ctx.sfx('bubble'); }
    },
    onHitDealt(amount) {
      if (amount < 2 || fill < 5 || !foeLive(ctx) || !live(ctx)) return;
      fill = 0;
      const n = ctx.npc;
      ctx.hit(n, 18, n.x, n.y);
      ctx.heal(ctx.player, 8);
      ctx.boostSpeed(1.2, 2000);
      ctx.float(n.x, n.y - 50, 'UNCORKED', '#9fe2ff');
      ctx.sfx('gust');
      gustFx = { x: n.x, y: n.y, at: ctx.scene.time.now };
    },
    drawAir(g, time) {
      if (live(ctx)) breathBottle(g, ctx.player.x + 18, ctx.player.y - 4, 0.55, time / 1000, fill / 5);
      if (gustFx && time - gustFx.at < 500) {
        const k = (time - gustFx.at) / 500;
        g.lineStyle(3, BREATH, 1 - k); g.strokeCircle(gustFx.x, gustFx.y, 16 + k * 50);
        g.lineStyle(1.5, 0xffffff, 1 - k); g.strokeCircle(gustFx.x, gustFx.y, 10 + k * 34);
      }
    },
  };
};

// ── Zephyr's Weathercock (artifact) ──────────────────────────────────
// The brass cockerel off the Weather House, small enough to ride your shoulder. It turns to find
// the foe — slowly. While it points at them you deal +15%. Every 6s it crows: a gust fires down
// the line it points along, 16 to the foe if they are in it.

const weathercock: ItemScriptFactory = (ctx) => {
  const step = clock();
  let a = 0, next = 6000, crowAt = -9999, crowA = 0, boostUntil = 0, warnAt = -1;
  const LANE = 460, HALF = 34;
  const aligned = () => foeLive(ctx) && Math.abs(wrapAngle(Math.atan2(ctx.npc.y - ctx.player.y, ctx.npc.x - ctx.player.x) - a)) < 0.35;
  return {
    update(time) {
      const dt = step(time);
      if (!live(ctx)) return;
      const p = ctx.player, n = ctx.npc;
      if (foeLive(ctx)) a = turnToward(a, Math.atan2(n.y - p.y, n.x - p.x), 1.2 * dt);
      if (aligned() && time >= boostUntil) { ctx.boostDamage(1.15, 260); boostUntil = time + 250; }
      if (warnAt < 0 && time >= next - 600) warnAt = time;
      if (time >= next) {
        next = time + 6000; warnAt = -1;
        crowAt = time; crowA = a;
        ctx.sfx('gust');
        if (foeLive(ctx) && segDist(n.x, n.y, p.x, p.y, p.x + Math.cos(a) * LANE, p.y + Math.sin(a) * LANE) < HALF) {
          ctx.hit(n, 16, n.x, n.y);
          ctx.float(n.x, n.y - 50, 'COCK-CROW', '#f4d68e');
        }
      }
    },
    drawGround(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (warnAt >= 0) {
        const k = clamp((time - warnAt) / 600, 0, 1);
        g.lineStyle(HALF * 2, BRASS, 0.05 + k * 0.08); g.lineBetween(p.x, p.y, p.x + Math.cos(a) * LANE, p.y + Math.sin(a) * LANE);
      }
      if (time - crowAt < 350) {
        const k = (time - crowAt) / 350;
        g.lineStyle(HALF * 2 * (1 - k * 0.5), 0xffffff, 0.35 * (1 - k)); g.lineBetween(p.x, p.y, p.x + Math.cos(crowA) * LANE, p.y + Math.sin(crowA) * LANE);
      }
    },
    drawAir(g) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x, y = p.y - 58;
      const on = aligned();
      if (on) glow(g, x, y, 14, BRASS_LIT, 0.07, 2);
      g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(x, y + 10, x, y - 2);
      const ax = Math.cos(a), ay = Math.sin(a) * 0.4;
      g.lineStyle(2, BRASS, 1); g.lineBetween(x - ax * 14, y - ay * 14, x + ax * 14, y + ay * 14);
      g.fillStyle(BRASS, 1); g.fillTriangle(x + ax * 18, y + ay * 18, x + ax * 10 - 3, y - 3, x + ax * 10 + 3, y + 3);
      const f = ax >= 0 ? 1 : -1;
      g.fillStyle(on ? BRASS_LIT : BRASS, 1); g.fillEllipse(x, y - 6, 12, 8); g.fillCircle(x + f * 5, y - 11, 3);
      g.fillStyle(KITE_RED, 1); g.fillCircle(x + f * 5, y - 14, 1.6);
      g.fillStyle(TAR, 1); g.fillTriangle(x + f * 8, y - 11, x + f * 11, y - 10, x + f * 8, y - 9);
    },
  };
};

// ── Flyingfish pie: a tailwind on a clock ────────────────────────────

const flyingfishPie: ItemScriptFactory = (ctx) => {
  let next = 4000, armedUntil = 0, fxAt = -9999;
  return {
    update(time) {
      if (time < next || !live(ctx)) return;
      next = time + 10000;
      armedUntil = time + 2000;
      fxAt = time;
      ctx.boostSpeed(1.2, 2000);
      ctx.sfx('whoosh');
    },
    onHitDealt(amount) {
      const now = ctx.scene.time.now;
      if (amount < 2 || now >= armedUntil || !foeLive(ctx)) return;
      armedUntil = 0;
      ctx.hit(ctx.npc, 8, ctx.npc.x, ctx.npc.y);
      ctx.float(ctx.npc.x, ctx.npc.y - 48, 'TAILWIND', '#cde9fb');
    },
    drawAir(g, time) {
      if (time >= armedUntil && time - fxAt > 2000) return;
      const p = ctx.player;
      for (let i = 0; i < 4; i++) {
        const ph = (time / 300 + i / 4) % 1;
        g.lineStyle(1.5, 0xffffff, 0.6 * (1 - ph)); g.lineBetween(p.x - 20 - ph * 30, p.y - 20 + i * 8, p.x - 6 - ph * 30, p.y - 20 + i * 8);
      }
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const GALEWARD_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_WINDSOCK, name: 'Windsock Pin', emoji: '🎏', kind: 'charm', price: 280, isle: ISLE,
    flavor: 'A windsock the length of a thumb, sewn by Tilly\'s mother for children learning to read the weather. It is never wrong.',
    script: CHARM_WINDSOCK,
    scriptText: [
      'A windsock on your collar shows a wind that turns a quarter every 5s.',
      'While your foe is downwind of you, you deal +25%. Walking with the wind, +12% speed.',
    ],
  },
  {
    id: CHARM_SPOOL, name: 'Glass Spool', emoji: '🪁', kind: 'charm', price: 420, isle: ISLE,
    flavor: 'Fighting-kite line on a horn spool, rubbed with ground glass and rice glue. Oriel\'s recipe. Wear gloves.',
    script: CHARM_SPOOL,
    scriptText: [
      'A kite flies off your back on 120px of glass line, streaming behind the way you walk.',
      'A foe who crosses the line is cut for 7 (at most every 0.9s). Drag it through them.',
    ],
  },
  {
    id: CHARM_SAILBEAD, name: 'Millsail Bead', emoji: '🌀', kind: 'charm', price: 560, isle: ISLE,
    flavor: 'A pearwood bead carved as a mill cap, four sails pinned to it. The millers\' children spin them for luck.',
    effect: { maxHp: 6 },
    script: CHARM_SAILBEAD,
    scriptText: [
      'Every 5th hit you land sets four little sails turning round you for 3s.',
      'Each sail that sweeps through your foe (out to 80px) clips them for 4.',
    ],
  },
  {
    id: CHARM_BOTTLE, name: 'Spare Breath', emoji: '🍾', kind: 'charm', price: 760, isle: ISLE,
    flavor: 'A breath-bottle from the toll, cork and all — empty. Hesper says the cheapest air in Galeward is the air you keep.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_BOTTLE,
    scriptText: [
      'Each hit you take puts a fifth of a breath into the bottle.',
      'Full, your next landed hit uncorks it: 18 to the foe, heal 8, and +20% speed for 2s.',
    ],
  },
  {
    id: ART_ZEPHYR, name: 'Zephyr\'s Weathercock', emoji: '🐓', kind: 'artifact', isle: ISLE,
    flavor: 'The brass cockerel off the Weather House roof. It used to point at whoever owed the most. It points at whoever you are fighting now.',
    effect: { maxHp: 15 },
    script: ART_ZEPHYR,
    scriptText: [
      'A weathercock on your shoulder slowly turns to find your foe. While it points at them, you deal +15%.',
      'Every 6s it crows: a gust down the line it points along, 16 to the foe if they are in it.',
    ],
  },
  {
    id: FISH_SPRAT, name: 'Cirrus Sprat', emoji: '🐟', kind: 'fish', sell: 14, isle: ISLE,
    flavor: 'A silver sliver that swims in the tops of the clouds and feeds on the cold. Thin as a breath. Best by the dozen.',
    effect: { speedMult: 1.03 },
  },
  {
    id: FISH_FLYINGFISH, name: 'Gale Flyingfish', emoji: '🐠', kind: 'fish', sell: 38, isle: ISLE,
    flavor: 'Glides from cloud to cloud on fins like sails. It will take your line up into the sky before it lets you have it.',
    effect: { dodgeChance: 0.04 },
  },
  {
    id: FLOUR_ITEM, name: 'Stone-Ground Flour', emoji: '🌾', kind: 'material', price: 12, sell: 4, isle: ISLE,
    flavor: 'Off the Grindstone, coarse and grey-flecked. Every sack is metered for the wind that ground it. This one fell off the cart.',
  },
  {
    id: FOOD_BAP, name: 'Sprat Bap', emoji: '🥪', kind: 'food', sell: 22, isle: ISLE,
    flavor: 'Two cirrus sprats in a flour bap, eaten on the cliff with your legs over the edge. The mill hands\' lunch.',
    effect: { speedMult: 1.04, shieldHp: 10 },
  },
  {
    id: FOOD_PIE, name: 'Flyingfish Pie', emoji: '🥧', kind: 'food', sell: 46, isle: ISLE,
    flavor: 'A raised pie with the fins left sticking out of the crust like sails. You eat it before it leaves the plate.',
    script: FOOD_PIE,
    scriptText: ['Every 10s a tailwind: +20% speed for 2s, and your next hit in that time deals 8 extra.'],
  },
  {
    id: FOOD_WINDBREAD, name: 'Herring Windbread', emoji: '🥖', kind: 'food', sell: 30, isle: ISLE,
    flavor: 'A long loaf with Windlass herring baked through it, shaped to go in a pocket. The bread that climbs the spire.',
    effect: { maxHp: 10, regenPerSecond: 0.3 },
  },
  {
    id: FOOD_CLOUDCAKE, name: 'Cod & Cloud Cake', emoji: '🧁', kind: 'food', sell: 36, isle: ISLE,
    flavor: 'Cliff cod and sprat whipped into a fish-cake so light it has to be held down with a fork. Very filling. Somehow.',
    effect: { damageTakenMult: 0.95, shieldHp: 12 },
  },
  {
    id: FOOD_SLEEPERS, name: 'Sleeper\'s Bun', emoji: '🥯', kind: 'food', sell: 30, isle: ISLE,
    flavor: 'A soft bun with Slumber carp in it, baked for the families of the becalmed. You hold it under their noses. Some stir.',
    effect: { regenPerSecond: 0.6 },
  },
];

export const GALEWARD_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_WINDSOCK]: windsockPin,
  [CHARM_SPOOL]: glassSpool,
  [CHARM_SAILBEAD]: millsailBead,
  [CHARM_BOTTLE]: spareBreath,
  [ART_ZEPHYR]: weathercock,
  [FOOD_PIE]: flyingfishPie,
};

export const GALEWARD_SHOPS: ShopDef[] = [{
  id: 'galeward-shop',
  name: 'Lanyard\'s Ropewalk',
  stock: [CHARM_WINDSOCK, CHARM_SPOOL, CHARM_SAILBEAD, CHARM_BOTTLE, FLOUR_ITEM],
  buys: true,
}];

export const GALEWARD_BAKERIES: BakeryDef[] = [{
  id: BAKERY_ID,
  name: 'The Millstone',
  recipes: [
    {
      id: RECIPE_BAP, name: 'Sprat Bap',
      inputs: [{ item: FISH_SPRAT, count: 2 }, { item: FLOUR_ITEM, count: 1 }], coins: 18, output: FOOD_BAP, makes: 2,
    },
    {
      id: RECIPE_WINDBREAD, name: 'Herring Windbread',
      inputs: [{ item: 'fish-gull-herring', count: 2 }, { item: FLOUR_ITEM, count: 1 }], coins: 22, output: FOOD_WINDBREAD,
    },
    {
      id: RECIPE_CLOUDCAKE, name: 'Cod & Cloud Cake',
      inputs: [{ item: 'fish-cliff-cod', count: 1 }, { item: FISH_SPRAT, count: 1 }, { item: FLOUR_ITEM, count: 1 }], coins: 26, output: FOOD_CLOUDCAKE,
    },
    {
      id: RECIPE_SLEEPERS, name: 'Sleeper\'s Bun',
      inputs: [{ item: 'fish-dozing-carp', count: 1 }, { item: FLOUR_ITEM, count: 2 }], coins: 24, output: FOOD_SLEEPERS, makes: 2,
    },
    {
      id: RECIPE_PIE, name: 'Flyingfish Pie',
      inputs: [{ item: FISH_FLYINGFISH, count: 1 }, { item: FLOUR_ITEM, count: 2 }], coins: 32, output: FOOD_PIE,
    },
  ],
}];

export const GALEWARD_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Cloudbank', kind: 'cloud' }];

export const GALEWARD_FISH: FishDef[] = [
  { id: FISH_SPRAT, fisheries: [FISHERY], weight: 6, fight: 2, size: [6, 15] },
  { id: FISH_FLYINGFISH, fisheries: [FISHERY], weight: 2, fight: 4, size: [24, 46] },
];
