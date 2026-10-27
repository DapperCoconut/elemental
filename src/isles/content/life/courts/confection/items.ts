import type {
  BakeryDef, FishDef, FisheryDef, IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory, ShopDef,
} from '../../../../IslesTypes';
import { dim, lit } from '../../../../art/IsleArt';
import {
  BRASS, BRITTLE, CARAMEL, CHERRY, FLOSS, IRON, PINK_PALE, SALT, SALT_LIT, SUGAR, SYRUP, SYRUP_LIT,
  dist, floss, sugarCube, taffy, wrappedSweet,
} from './art';

/**
 * The Confection Court's goods: the four charms Mistress Marzipan sells over her counter, Prince
 * Saccharo's artifact, the Treacle Pool's three fish, the cane sugar and Saltcellar rock salt every
 * kitchen in the town runs on, and what Dame Demerara bakes out of them at *The Sugar Loaf*. Every
 * charm turns one of the court's own sweets back on the foe — the cube, the strand, the salt, and
 * the crooked weight the Sweet-Tax is paid against. Scripts are registered under their item ids.
 */

const ISLE = 'life';

// ── Ids ──────────────────────────────────────────────────────────────

export const CANE_SUGAR = 'confection-cane-sugar';
export const ROCK_SALT = 'confection-rock-salt';

export const CHARM_TONGS = 'confection-sugar-tongs';
export const CHARM_HOOK = 'confection-taffy-hook';
export const CHARM_SPOON = 'confection-salt-spoon';
export const CHARM_LOZENGE = 'confection-lead-lozenge';
export const ART_SACCHARO = 'art-saccharo';

export const FISH_MINNOW = 'fish-gummy-minnow';
export const FISH_CATFISH = 'fish-toffee-catfish';
export const FISH_EEL = 'fish-caramel-eel';
export const FISHERY = 'confection-syrup';

export const FOOD_JELLY = 'confection-food-minnow-jelly';
export const FOOD_BRITTLE = 'confection-food-salted-brittle';
export const FOOD_TONIC = 'confection-food-eel-gall-tonic';
export const FOOD_MULLET = 'confection-food-candied-mullet';
export const FOOD_MARZIPAN = 'confection-food-koi-marzipan';

export const RECIPE_JELLY = 'confection-recipe-minnow-jelly';
export const RECIPE_BRITTLE = 'confection-recipe-salted-brittle';
export const RECIPE_TONIC = 'confection-recipe-eel-gall-tonic';
export const RECIPE_MULLET = 'confection-recipe-candied-mullet';
export const RECIPE_MARZIPAN = 'confection-recipe-koi-marzipan';

/** Fish from elsewhere on Thornwild that the Sugar Loaf bakes with. */
const FISH_MULLET = 'fish-mossback-mullet';
const FISH_KOI = 'fish-petal-koi';

const TOP = 96;
const alive = (f: { active: boolean; hp: number }): boolean => f.active && f.hp > 0;

// ── Item defs ────────────────────────────────────────────────────────

export const CONFECTION_ITEMS: IsleItemDef[] = [
  // Materials.
  {
    id: CANE_SUGAR, name: 'Cane Sugar', emoji: '🍚', kind: 'material', price: 14, sell: 5, isle: ISLE,
    flavor: 'Brown cane sugar off the mill floor, swept up before the Weighmaster saw. Every kitchen has a jar behind the flour.',
  },
  {
    id: ROCK_SALT, name: 'Saltcellar Rock Salt', emoji: '🧂', kind: 'material', price: 12, sell: 4, isle: ISLE,
    flavor: 'Grey salt dug from under the town by the people who live under it. The sugar is the Prince\'s. The salt is theirs.',
  },

  // Charms.
  {
    id: CHARM_TONGS, name: 'Sugar Tongs', emoji: '🥢', kind: 'charm', price: 220, isle: ISLE,
    flavor: 'Silver claws for lifting cubes into a tea-cup, stolen off the Prince\'s own tray. They still reach for the bowl.',
    script: CHARM_TONGS,
    scriptText: [
      'Every 9s the tongs drop a sugar cube on the floor near you.',
      'Walk over it: +25% speed for 2s, and the ability you cast last gets 1.5s back.',
    ],
  },
  {
    id: CHARM_HOOK, name: 'Taffy Hook', emoji: '🪝', kind: 'charm', price: 340, isle: ISLE,
    flavor: 'A puller\'s brass hook with a thread of pink taffy still stuck to it. It does not like you to go far.',
    script: CHARM_HOOK,
    scriptText: [
      'When the foe is more than 340px away, a taffy strand stretches between you (at most every 6s).',
      'After 1.2s it snaps: 5 damage to the foe, +1 for every 30px of stretch beyond 340 (up to 15).',
    ],
  },
  {
    id: CHARM_SPOON, name: 'Salt Spoon', emoji: '🥄', kind: 'charm', price: 480, isle: ISLE,
    flavor: 'A horn spoon from a Saltcellar table. Grandmothers keep them for rubbing salt where it does the most good.',
    script: CHARM_SPOON,
    scriptText: [
      'Land 3 hits within 2s and you salt the wound:',
      'the foe takes 30% of all the damage you dealt in those 2s again (at least 3). Once every 3s.',
    ],
  },
  {
    id: CHARM_LOZENGE, name: 'Lead Lozenge', emoji: '⚖️', kind: 'charm', price: 700, isle: ISLE,
    flavor: 'A lead weight dipped in sugar to look like a sweet. The Sweet-Tax was weighed against these for forty years.',
    script: CHARM_LOZENGE,
    scriptText: [
      'A thumb on the scale. Every 4th hit you take is weighed short: you are healed for all of it.',
      'Every 4th hit you land is weighed heavy: the foe takes 60% of it again.',
    ],
  },

  // Artifact.
  {
    id: ART_SACCHARO, name: 'Saccharo\'s Sweet Tooth', emoji: '🦷', kind: 'artifact', isle: ISLE,
    flavor: 'A gold-capped molar from the Prince\'s own mouth, rotted black under the cap. He never let anyone see him smile.',
    effect: { maxHp: 14 },
    script: ART_SACCHARO,
    scriptText: [
      'Hard Candy: every 8s a boiled sweet spins off you and chases the foe — 10 damage when it reaches them.',
      'Melt: the first time you drop under 35% health, you go soft as syrup — heal 6 a second for 5s.',
    ],
  },

  // Fish.
  {
    id: FISH_MINNOW, name: 'Gummy Minnow', emoji: '🐟', kind: 'fish', sell: 22, isle: ISLE,
    flavor: 'A little translucent minnow that has lived in syrup so long it bounces. Children eat them raw, on a dare.',
    effect: { speedMult: 1.04 },
  },
  {
    id: FISH_CATFISH, name: 'Toffee Catfish', emoji: '🐡', kind: 'fish', sell: 36, isle: ISLE,
    flavor: 'A whiskered bottom-feeder with a hard toffee crust on its back. Crack it like a crème brûlée.',
    effect: { shieldHp: 10 },
  },
  {
    id: FISH_EEL, name: 'Caramel Eel', emoji: '🐍', kind: 'fish', sell: 54, isle: ISLE,
    flavor: 'Long, gold and sticky, and it fights like a rope in a gale. Its gall is the only bitter thing in the river.',
    effect: { regenPerSecond: 0.5 },
  },

  // Meals — The Sugar Loaf.
  {
    id: FOOD_JELLY, name: 'Minnow Jelly', emoji: '🍮', kind: 'food', sell: 26, isle: ISLE,
    flavor: 'Gummy minnows set in a sugar jelly, wobbling on the plate. The mill hands\' Sunday treat, once a season.',
    effect: { shieldHp: 16, speedMult: 1.03 },
  },
  {
    id: FOOD_BRITTLE, name: 'Salted Catfish Brittle', emoji: '🍬', kind: 'food', sell: 34, isle: ISLE,
    flavor: 'Toffee catfish flaked into caramel brittle with Saltcellar salt. Sweet on top. Salt underneath. Like the town.',
    script: FOOD_BRITTLE,
    scriptText: ['Every 6th hit you land cracks like brittle: +8 damage.'],
  },
  {
    id: FOOD_TONIC, name: 'Eel-Gall Tonic', emoji: '🧪', kind: 'food', sell: 30, isle: ISLE,
    flavor: 'The gall of a caramel eel steeped in salt water. It tastes like being slapped awake, which is the point.',
    effect: { damageTakenMult: 0.95, regenPerSecond: 0.4 },
  },
  {
    id: FOOD_MULLET, name: 'Candied Mullet', emoji: '🍢', kind: 'food', sell: 40, isle: ISLE,
    flavor: 'Mossgate mullet glazed in cane syrup and salted on the grill. The port calls it vulgar and eats three.',
    effect: { maxHp: 10, damageMult: 1.04 },
  },
  {
    id: FOOD_MARZIPAN, name: 'Petal Koi Marzipan', emoji: '🍥', kind: 'food', sell: 48, isle: ISLE,
    flavor: 'A koi from the Bloom Court\'s pond, poached and pressed into almond paste with rose sugar. For the Prince\'s table. Not today.',
    script: FOOD_MARZIPAN,
    scriptText: ['Every 12s, a petal of rose sugar: heal 4 and +15% speed for 2s.'],
  },
];

// ── Scripts ──────────────────────────────────────────────────────────

/** Sugar Tongs — a cube dropped near you on a clock: haste and a refund. */
const tongs: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  let next = 4000;
  let cube: { x: number; y: number; at: number } | null = null;
  let lastCast: string | null = null;
  let tongAt = -9999;
  return {
    onCast(id) { lastCast = id; },
    update(time) {
      const p = ctx.player;
      if (!alive(p)) return;
      if (!cube && time >= next) {
        const a = ctx.rng() * Math.PI * 2, r = 120 + ctx.rng() * 80;
        cube = {
          x: Math.max(50, Math.min(ctx.W - 50, p.x + Math.cos(a) * r)),
          y: Math.max(TOP + 30, Math.min(ctx.H - 40, p.y + Math.sin(a) * r)),
          at: time,
        };
        tongAt = time;
        ctx.sfx('crystal-chime');
      }
      if (cube && time - cube.at > 300 && dist(cube.x, cube.y, p.x, p.y + 12) < 30) {
        ctx.boostSpeed(1.25, 2000);
        if (lastCast) ctx.refund(lastCast, 1500);
        ctx.float(p.x, p.y - 46, 'CUBE!', '#fff6d8');
        ctx.sfx('sparkle');
        cube = null;
        next = time + 9000;
      }
      if (cube && time - cube.at > 8000) { cube = null; next = time + 9000; }
    },
    drawAir(g, time) {
      if (cube) {
        const drop = Math.min(1, (time - cube.at) / 300);
        sugarCube(g, cube.x, cube.y - (1 - drop) * 60, 8, 1);
        g.lineStyle(1.5, 0xfff6d8, 0.4 + 0.3 * Math.sin(time / 120)); g.strokeCircle(cube.x, cube.y, 22);
      }
      const k = (time - tongAt) / 400;
      if (k >= 0 && k < 1 && cube) {
        // The tongs opening over the drop.
        g.lineStyle(2, 0xd8dee6, 1 - k);
        g.lineBetween(cube.x - 4, cube.y - 70, cube.x - 10 - k * 6, cube.y - 40);
        g.lineBetween(cube.x + 4, cube.y - 70, cube.x + 10 + k * 6, cube.y - 40);
      }
    },
  };
};

/** Taffy Hook — a strand that stretches when the foe runs off, and snaps for it. */
const taffyHook: ItemScriptFactory = (ctx) => {
  let strandAt = -1;
  let maxStretch = 0;
  let readyAt = 2000;
  let snapAt = -9999;
  return {
    update(time) {
      const p = ctx.player, n = ctx.npc;
      if (!alive(p) || !alive(n)) { strandAt = -1; return; }
      const d = dist(p.x, p.y, n.x, n.y);
      if (strandAt < 0 && time >= readyAt && d > 340) { strandAt = time; maxStretch = d; ctx.sfx('snap-back'); }
      if (strandAt >= 0) {
        maxStretch = Math.max(maxStretch, d);
        if (time - strandAt >= 1200) {
          const dmg = Math.min(15, 5 + Math.floor(Math.max(0, maxStretch - 340) / 30));
          ctx.hit(n, dmg, n.x, n.y);
          ctx.float(n.x, n.y - 50, `TAFFY SNAP ${dmg}`, '#ffc8e0');
          ctx.sfx('boing');
          snapAt = time;
          strandAt = -1;
          readyAt = time + 6000;
        }
      }
    },
    drawAir(g, time) {
      const p = ctx.player, n = ctx.npc;
      if (strandAt >= 0) {
        const k = (time - strandAt) / 1200;
        taffy(g, { x: p.x, y: p.y - 6 }, { x: n.x, y: n.y - 6 }, { x: (p.x + n.x) / 2, y: (p.y + n.y) / 2 + 20 * (1 - k) }, 5 - k * 2.5, PINK_PALE, 0xffffff, 0.9);
      }
      const s = (time - snapAt) / 300;
      if (s >= 0 && s < 1) {
        g.lineStyle(3, PINK_PALE, 1 - s); g.strokeCircle(n.x, n.y, 16 + s * 30);
      }
    },
  };
};

/** Salt Spoon — three quick hits rub salt in: a share of the last two seconds again. */
const saltSpoon: ItemScriptFactory = (ctx) => {
  let hits: { at: number; amount: number }[] = [];
  let readyAt = 0;
  let saltedAt = -9999;
  return {
    onHitDealt(amount) {
      const now = ctx.scene.time.now;
      hits.push({ at: now, amount });
      hits = hits.filter((h) => now - h.at <= 2000);
      if (hits.length >= 3 && now >= readyAt) {
        const total = hits.reduce((s, h) => s + h.amount, 0);
        const n = ctx.npc;
        const dmg = Math.max(3, Math.round(total * 0.3));
        ctx.hit(n, dmg, n.x, n.y);
        ctx.float(n.x, n.y - 54, `SALTED ${dmg}`, '#e4e4dc');
        ctx.sfx('sizzle');
        saltedAt = now;
        readyAt = now + 3000;
        hits = [];
      }
    },
    drawAir(g, time) {
      const n = ctx.npc, p = ctx.player;
      // A grain of salt per hit in the window, hanging over you.
      const now = ctx.scene.time.now;
      const live = hits.filter((h) => now - h.at <= 2000).length;
      for (let i = 0; i < live; i++) { g.fillStyle(SALT_LIT, 1); g.fillRect(p.x - 9 + i * 7, p.y - 50, 4, 4); }
      const k = (time - saltedAt) / 500;
      if (k >= 0 && k < 1) {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          g.fillStyle(i % 2 ? SALT : SALT_LIT, 1 - k);
          g.fillRect(n.x + Math.cos(a) * (10 + k * 26) - 1.5, n.y - 6 + Math.sin(a) * (8 + k * 20) - 1.5, 3, 3);
        }
      }
    },
  };
};

/** Lead Lozenge — the thumb on the scale, pressing for you for once. */
const leadLozenge: ItemScriptFactory = (ctx) => {
  let taken = 0;
  let dealt = 0;
  let flashAt = -9999;
  let flashSide: 'short' | 'heavy' = 'short';
  return {
    onHitTaken(amount) {
      taken++;
      if (taken >= 4) {
        taken = 0;
        ctx.heal(ctx.player, amount);
        ctx.float(ctx.player.x, ctx.player.y - 52, 'WEIGHED SHORT', '#ffe08a');
        ctx.sfx('money');
        flashAt = ctx.scene.time.now; flashSide = 'short';
      }
    },
    onHitDealt(amount) {
      dealt++;
      if (dealt >= 4) {
        dealt = 0;
        const n = ctx.npc;
        ctx.hit(n, Math.max(1, Math.round(amount * 0.6)), n.x, n.y);
        ctx.float(n.x, n.y - 52, 'WEIGHED HEAVY', '#c8c8d8');
        ctx.sfx('anvil');
        flashAt = ctx.scene.time.now; flashSide = 'heavy';
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      // A little balance over your head: the pans tip with the count.
      const tilt = (dealt - taken) * 0.08;
      const x = p.x + 24, y = p.y - 46;
      g.lineStyle(1.5, BRASS, 0.9); g.lineBetween(x, y, x, y + 10);
      g.lineBetween(x - 9, y - tilt * 9, x + 9, y + tilt * 9);
      g.fillStyle(BRASS, 0.9); g.fillEllipse(x - 9, y + 4 - tilt * 9, 8, 3); g.fillEllipse(x + 9, y + 4 + tilt * 9, 8, 3);
      const k = (time - flashAt) / 500;
      if (k >= 0 && k < 1) {
        const tx = flashSide === 'short' ? p.x : ctx.npc.x, ty = flashSide === 'short' ? p.y : ctx.npc.y;
        g.fillStyle(IRON, 1 - k); g.fillRoundedRect(tx - 7, ty - 70 + k * 30, 14, 10, 3);
        g.fillStyle(SUGAR, (1 - k) * 0.8); g.fillRect(tx - 6, ty - 70 + k * 30, 12, 3);
      }
    },
  };
};

/** Saccharo's Sweet Tooth — hard candy on a clock, and one melt when you are low. */
const sweetTooth: ItemScriptFactory = (ctx) => {
  let nextCandy = 5000;
  let candy: { x: number; y: number; at: number; spin: number } | null = null;
  let melted = false;
  let meltUntil = 0;
  let lastTick = 0;
  return {
    update(time, dt) {
      const p = ctx.player, n = ctx.npc;
      if (!alive(p)) return;
      if (!candy && time >= nextCandy && alive(n)) { candy = { x: p.x, y: p.y - 20, at: time, spin: 0 }; ctx.sfx('whoosh'); }
      if (candy) {
        const a = Math.atan2(n.y - candy.y, n.x - candy.x);
        const sp = 260 + (time - candy.at) * 0.12;
        candy.x += Math.cos(a) * sp * dt; candy.y += Math.sin(a) * sp * dt;
        candy.spin += dt * 14;
        if (alive(n) && dist(candy.x, candy.y, n.x, n.y) < 24) {
          ctx.hit(n, 10, n.x, n.y);
          ctx.float(n.x, n.y - 50, 'HARD CANDY', '#ff9ac8');
          ctx.sfx('crystal-shatter');
          candy = null; nextCandy = time + 8000;
        } else if (time - candy.at > 3000 || !alive(n)) { candy = null; nextCandy = time + 8000; }
      }
      if (!melted && p.hp < p.maxHp * 0.35) {
        melted = true; meltUntil = time + 5000; lastTick = time;
        ctx.float(p.x, p.y - 56, 'MELT', '#e2902e');
        ctx.sfx('slime-splat');
      }
      if (time < meltUntil && time - lastTick >= 1000) { lastTick = time; ctx.heal(p, 6); }
    },
    drawGround(g, time) {
      if (time < meltUntil) {
        const p = ctx.player;
        g.fillStyle(SYRUP, 0.6); g.fillEllipse(p.x, p.y + 14, 64, 20);
        g.fillStyle(SYRUP_LIT, 0.5); g.fillEllipse(p.x - 8, p.y + 11, 20, 6);
      }
    },
    drawAir(g, time) {
      if (candy) {
        wrappedSweet(g, candy.x, candy.y, 6, CHERRY, candy.spin, 1);
        g.fillStyle(FLOSS, 0.35); g.fillCircle(candy.x - 4, candy.y + 3, 4);
      }
      if (time < meltUntil) {
        const p = ctx.player;
        for (let i = 0; i < 3; i++) {
          const ph = (time / 600 + i / 3) % 1;
          g.fillStyle(SYRUP_LIT, 0.8 * (1 - ph)); g.fillCircle(p.x - 10 + i * 10, p.y - 20 + ph * 30, 3 - ph * 2);
        }
        floss(g, p.x, p.y - 44, 8, 0.35, CARAMEL, time / 1000);
      }
    },
  };
};

/** Salted Catfish Brittle — every sixth hit cracks for extra. */
const brittle: ItemScriptFactory = (ctx) => {
  let count = 0;
  let crackAt = -9999;
  return {
    onHitDealt() {
      count++;
      if (count >= 6) {
        count = 0;
        const n = ctx.npc;
        ctx.hit(n, 8, n.x, n.y);
        ctx.float(n.x, n.y - 48, 'CRACK', '#f0c66a');
        ctx.sfx('crystal-shatter');
        crackAt = ctx.scene.time.now;
      }
    },
    drawAir(g, time) {
      const k = (time - crackAt) / 400;
      if (k < 0 || k >= 1) return;
      const n = ctx.npc;
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9;
        g.fillStyle(i % 2 ? BRITTLE : dim(BRITTLE, 0.3), 1 - k);
        g.fillTriangle(n.x + Math.cos(a) * (8 + k * 30), n.y + Math.sin(a) * (8 + k * 24), n.x + Math.cos(a + 0.3) * (14 + k * 30), n.y + Math.sin(a + 0.3) * (14 + k * 24), n.x + Math.cos(a) * (18 + k * 34), n.y + Math.sin(a) * (16 + k * 26));
      }
    },
  };
};

/** Petal Koi Marzipan — a petal of rose sugar on a slow clock. */
const marzipan: ItemScriptFactory = (ctx) => {
  let next = 6000;
  let petalAt = -9999;
  return {
    update(time) {
      if (time < next || !alive(ctx.player)) return;
      next = time + 12000;
      petalAt = time;
      ctx.heal(ctx.player, 4);
      ctx.boostSpeed(1.15, 2000);
      ctx.sfx('heal');
    },
    drawAir(g, time) {
      const k = (time - petalAt) / 1200;
      if (k < 0 || k >= 1) return;
      const p = ctx.player;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + k * 3;
        g.fillStyle(lit(PINK_PALE, 0.2), 1 - k);
        g.fillEllipse(p.x + Math.cos(a) * (14 + k * 16), p.y - 10 + Math.sin(a) * 8 + k * 14, 7, 4);
      }
    },
  };
};

export const CONFECTION_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_TONGS]: tongs,
  [CHARM_HOOK]: taffyHook,
  [CHARM_SPOON]: saltSpoon,
  [CHARM_LOZENGE]: leadLozenge,
  [ART_SACCHARO]: sweetTooth,
  [FOOD_BRITTLE]: brittle,
  [FOOD_MARZIPAN]: marzipan,
};

// ── Shop, bakery, fish ───────────────────────────────────────────────

export const CONFECTION_SHOPS: ShopDef[] = [{
  id: 'confection-shop',
  name: 'Marzipan\'s Sweetmeats & Notions',
  stock: [CHARM_TONGS, CHARM_HOOK, CHARM_SPOON, CHARM_LOZENGE, CANE_SUGAR, ROCK_SALT],
  buys: true,
}];

export const CONFECTION_BAKERIES: BakeryDef[] = [{
  id: 'confection-sugarloaf',
  name: 'The Sugar Loaf',
  recipes: [
    {
      id: RECIPE_JELLY, name: 'Minnow Jelly',
      inputs: [{ item: FISH_MINNOW, count: 3 }, { item: CANE_SUGAR, count: 1 }], coins: 20, output: FOOD_JELLY, makes: 2,
    },
    {
      id: RECIPE_BRITTLE, name: 'Salted Catfish Brittle',
      inputs: [{ item: FISH_CATFISH, count: 1 }, { item: CANE_SUGAR, count: 1 }, { item: ROCK_SALT, count: 1 }], coins: 28, output: FOOD_BRITTLE,
    },
    {
      id: RECIPE_TONIC, name: 'Eel-Gall Tonic',
      inputs: [{ item: FISH_EEL, count: 1 }, { item: ROCK_SALT, count: 1 }], coins: 24, output: FOOD_TONIC,
    },
    {
      id: RECIPE_MULLET, name: 'Candied Mullet',
      inputs: [{ item: FISH_MULLET, count: 2 }, { item: CANE_SUGAR, count: 1 }, { item: ROCK_SALT, count: 1 }], coins: 32, output: FOOD_MULLET,
    },
    {
      id: RECIPE_MARZIPAN, name: 'Petal Koi Marzipan',
      inputs: [{ item: FISH_KOI, count: 1 }, { item: CANE_SUGAR, count: 2 }], coins: 40, output: FOOD_MARZIPAN,
    },
  ],
}];

export const CONFECTION_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Treacle Pool', kind: 'syrup' }];

export const CONFECTION_FISH: FishDef[] = [
  { id: FISH_MINNOW, fisheries: [FISHERY], weight: 6, fight: 2, size: [5, 12] },
  { id: FISH_CATFISH, fisheries: [FISHERY], weight: 4, fight: 3, size: [28, 64] },
  { id: FISH_EEL, fisheries: [FISHERY], weight: 2, fight: 5, size: [70, 150] },
];
