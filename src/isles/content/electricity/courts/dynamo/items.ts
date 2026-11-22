import type {
  BakeryDef, FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef,
} from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { bolt, fuseCartridge, meterDial, sparks } from './art';
import { ARC, ARC_VIOLET, BRASS, COPPER, COPPER_DARK, COPPER_LIT, FOIL, GLASS, INSULATOR, SPARK } from './palette';
import { alive, clamp, clock, dist } from './util';

/**
 * The Dynamo Court's goods: Ottilie Spool's four charms, Prince Volt's pocket dynamo, the race's
 * two fish, and the Ovenlight's bakes. Every charm is a piece of the power station that plays one
 * of the court's own rules in your favour — the crank that turns walking into current, the jar
 * that stores a beating, the rod that calls the storm, the fuse that blows on purpose. Scripts are
 * registered below under their item ids.
 */

const ISLE = 'electricity';

export const CHARM_CRANK = 'dynamo-charm-crank-handle';
export const CHARM_LOCKET = 'dynamo-charm-leyden-locket';
export const CHARM_ROD = 'dynamo-charm-rod-pin';
export const CHARM_FUSE = 'dynamo-charm-fuse-ring';
export const ART_VOLT = 'art-volt';

export const FISH_TROUT = 'fish-turbine-trout';
export const FISH_MINNOW = 'fish-spark-minnow';
export const FISHERY = 'dynamo-race';

export const MEAL = 'dynamo-treadmeal';
export const FOOD_LOAF = 'dynamo-food-brownout-loaf';
export const FOOD_TROUT = 'dynamo-food-coil-trout';
export const FOOD_BUN = 'dynamo-food-herring-bun';
export const FOOD_PIE = 'dynamo-food-snapper-pie';
export const FOOD_PASTY = 'dynamo-food-storm-pasty';

export const BAKERY_ID = 'dynamo-ovenlight';
export const RECIPE_LOAF = 'dynamo-r-brownout-loaf';
const RECIPE_TROUT = 'dynamo-r-coil-trout';
const RECIPE_BUN = 'dynamo-r-herring-bun';
const RECIPE_PIE = 'dynamo-r-snapper-pie';
const RECIPE_PASTY = 'dynamo-r-storm-pasty';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Crank Handle ─────────────────────────────────────────────────────
// Walking turns a little dynamo on your belt: every 520px of ground you cover banks a charge (up
// to three, shown as pips round you). Each hit you land spends one for an extra jolt.

const crankHandle: ItemScriptFactory = (ctx) => {
  const STEP = 520, MAX = 3;
  let lastX = NaN, lastY = NaN;
  let walked = 0, charges = 0;
  let jolt = { at: -9999, x: 0, y: 0 };
  let crank = 0;
  return {
    update() {
      const p = ctx.player;
      if (!live(ctx)) return;
      if (!Number.isNaN(lastX)) {
        const d = Math.min(40, dist(lastX, lastY, p.x, p.y));
        crank += d * 0.05;
        if (charges < MAX) {
          walked += d;
          if (walked >= STEP) { walked -= STEP; charges++; ctx.sfx('gear-turn'); }
        }
      }
      lastX = p.x; lastY = p.y;
    },
    onHitDealt(amount) {
      if (amount < 2 || charges <= 0 || !foeLive(ctx)) return;
      charges--;
      ctx.hit(ctx.npc, 8, ctx.npc.x, ctx.npc.y - 20);
      jolt = { at: ctx.scene.time.now, x: ctx.npc.x, y: ctx.npc.y };
      ctx.sfx('zap');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      // The crank on the hip, turning as you walk.
      const hx = p.x + 20, hy = p.y - 6;
      g.fillStyle(COPPER_DARK, 1); g.fillCircle(hx, hy, 5);
      g.lineStyle(2, COPPER_LIT, 1); g.lineBetween(hx, hy, hx + Math.cos(crank) * 7, hy + Math.sin(crank) * 7);
      for (let i = 0; i < MAX; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.5;
        const x = p.x + Math.cos(a) * 34, y = p.y - 14 + Math.sin(a) * 26;
        g.fillStyle(i < charges ? ARC : 0x2a3040, i < charges ? 0.95 : 0.5); g.fillCircle(x, y, 3.2);
        if (i < charges) glow(g, x, y, 7, ARC, 0.08, 2);
      }
      if (charges < MAX) {
        g.lineStyle(1.5, ARC, 0.5);
        g.beginPath(); g.arc(p.x, p.y - 14, 40, Math.PI * 0.9, Math.PI * 0.9 + (walked / STEP) * Math.PI * 1.2, false); g.strokePath();
      }
      if (time - jolt.at < 220) bolt(g, p.x, p.y - 14, jolt.x, jolt.y - 14, Math.floor(time / 40), 2, ARC, 1 - (time - jolt.at) / 220, 10, false);
    },
  };
};

// ── Leyden Locket ────────────────────────────────────────────────────
// A thumb-sized Leyden jar on a chain. Every blow you take charges it; at 32 stored, it
// discharges into the foe for 18 and the jolt runs through you too — a burst of speed.

const leydenLocket: ItemScriptFactory = (ctx) => {
  const FULL = 32;
  let stored = 0;
  let firedAt = -9999;
  return {
    onHitTaken(amount) {
      if (!live(ctx) || amount <= 0) return;
      stored += amount;
      if (stored < FULL || !foeLive(ctx)) return;
      stored = 0;
      firedAt = ctx.scene.time.now;
      ctx.hit(ctx.npc, 18, ctx.npc.x, ctx.npc.y - 20);
      ctx.boostSpeed(1.25, 1500);
      ctx.float(ctx.player.x, ctx.player.y - 52, 'DISCHARGE', '#bff0ff');
      ctx.sfx('plasma-arc');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x - 22, y = p.y - 30;
      const k = clamp(stored / FULL, 0, 1);
      g.lineStyle(1, BRASS, 0.8); g.lineBetween(p.x - 8, p.y - 40, x, y - 9);
      g.fillStyle(GLASS, 0.35); g.fillRoundedRect(x - 5, y - 8, 10, 15, 3);
      g.fillStyle(FOIL, 0.9); g.fillRect(x - 4, y - 1, 8, 7);
      g.fillStyle(ARC, 0.2 + k * 0.7); g.fillRect(x - 4, y - 7 + (1 - k) * 6, 8, k * 6);
      g.fillStyle(BRASS, 1); g.fillCircle(x, y - 10, 2);
      if (k > 0.75) sparks(g, x, y - 10, 7, time, 3, ARC);
      if (time - firedAt < 300 && foeLive(ctx)) bolt(g, x, y - 10, ctx.npc.x, ctx.npc.y - 14, Math.floor(time / 40), 3, ARC, 1 - (time - firedAt) / 300, 14);
    },
  };
};

// ── Lightning-Rod Pin ────────────────────────────────────────────────
// A tiny copper rod pinned to your collar draws the storm — at your foe. Every 9s a cloud gathers
// over them, follows them for a moment, then holds; 1.6s later it strikes there for 16. It does
// not care who else is standing in it: within its reach, you take 6.

const rodPin: ItemScriptFactory = (ctx) => {
  const EVERY = 9000, GATHER = 1600, HOLD = 450, R = 70;
  const dt = clock();
  let next = -1;
  let cloud: { x: number; y: number; at: number } | null = null;
  let struck = { at: -9999, x: 0, y: 0 };
  return {
    update(time) {
      const step = dt(time);
      if (next < 0) next = time + 4000;
      if (!cloud && time >= next && foeLive(ctx)) { cloud = { x: ctx.npc.x, y: ctx.npc.y, at: time }; ctx.sfx('rain'); }
      if (!cloud) return;
      if (time - cloud.at < GATHER - HOLD && foeLive(ctx)) {
        const k = Math.min(1, step * 2.2);
        cloud.x += (ctx.npc.x - cloud.x) * k; cloud.y += (ctx.npc.y - cloud.y) * k;
      }
      if (time - cloud.at >= GATHER) {
        const c = cloud;
        cloud = null; next = time + EVERY;
        struck = { at: time, x: c.x, y: c.y };
        ctx.sfx('thunder');
        if (foeLive(ctx) && dist(ctx.npc.x, ctx.npc.y, c.x, c.y) < R + 12) ctx.hit(ctx.npc, 16, c.x, c.y);
        if (live(ctx) && dist(ctx.player.x, ctx.player.y, c.x, c.y) < R + 12) ctx.hit(ctx.player, 6, ctx.player.x, ctx.player.y);
      }
    },
    drawGround(g, time) {
      if (cloud) {
        const k = clamp((time - cloud.at) / GATHER, 0, 1);
        const held = time - cloud.at >= GATHER - HOLD;
        g.fillStyle(0x000000, 0.15 + k * 0.25); g.fillEllipse(cloud.x, cloud.y, R * 2 * (0.6 + k * 0.4), R * 0.9 * (0.6 + k * 0.4));
        g.lineStyle(2, held ? 0xffffff : ARC, 0.4 + k * 0.5); g.strokeEllipse(cloud.x, cloud.y, R * 2, R * 0.9);
      }
    },
    drawAir(g, time) {
      if (live(ctx)) {
        const p = ctx.player;
        g.lineStyle(1.5, COPPER_LIT, 1); g.lineBetween(p.x + 10, p.y - 36, p.x + 12, p.y - 48);
        g.fillStyle(COPPER, 1); g.fillCircle(p.x + 12, p.y - 49, 1.6);
      }
      if (cloud) {
        const k = clamp((time - cloud.at) / GATHER, 0, 1);
        for (let i = 0; i < 5; i++) { g.fillStyle(0x1e2230, 0.5 + k * 0.3); g.fillCircle(cloud.x + Math.cos(i * 1.3 + time / 900) * 22, cloud.y - 110 + Math.sin(i * 1.3) * 8, 16 + (i % 2) * 6); }
      }
      if (time - struck.at < 300) {
        const k = (time - struck.at) / 300;
        bolt(g, struck.x + 20, struck.y - 120, struck.x, struck.y, Math.floor(time / 40), 5 * (1 - k) + 1, ARC, 1 - k, 20);
      }
    },
  };
};

// ── Fuse-Wire Ring ───────────────────────────────────────────────────
// A ring of fuse wire round a brass cap. Every hit you land heats it; the fifth blows it — 10 to
// the foe, and the surge shaves 1.5s off the cooldowns of the last two abilities you cast. It
// rewinds itself.

const fuseRing: ItemScriptFactory = (ctx) => {
  const BLOW = 5;
  let heat = 0;
  const recent: string[] = [];
  let blownAt = -9999;
  return {
    onCast(abilityId) {
      const i = recent.indexOf(abilityId);
      if (i >= 0) recent.splice(i, 1);
      recent.unshift(abilityId);
      if (recent.length > 2) recent.length = 2;
    },
    onHitDealt(amount) {
      if (amount < 2 || !foeLive(ctx)) return;
      heat++;
      if (heat < BLOW) return;
      heat = 0;
      blownAt = ctx.scene.time.now;
      ctx.hit(ctx.npc, 10, ctx.npc.x, ctx.npc.y - 20);
      for (const id of recent) ctx.refund(id, 1500);
      ctx.float(ctx.player.x, ctx.player.y - 52, 'FUSE BLOWN', '#ffe070');
      ctx.sfx('explosion-small');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x + 24, y = p.y - 34;
      const k = heat / BLOW;
      fuseCartridge(g, x, y, -0.4, k > 0.7 ? time : -1e9, 0.6);
      g.fillStyle(k > 0.7 ? 0xfff0c0 : k > 0.3 ? 0xff8a3a : 0x6a2a10, 0.9); g.fillCircle(x, y, 2);
      if (time - blownAt < 400) {
        const s = (time - blownAt) / 400;
        g.fillStyle(0xffffff, 0.6 * (1 - s)); g.fillCircle(x, y, 6 + s * 16);
      }
    },
  };
};

// ── Volt's Pocket Dynamo (artifact) ──────────────────────────────────
// The little dynamo the Prince carried as a boy, so it would never be dark in his pocket. It spins
// up while you move (3s to full) and runs down when you stand still. At full spin it throws an arc
// at the foe every 1.3s for 6, if they are within 380px. Once a fight, dropping under 25%, it
// overloads: +20% speed for 4s and an arc every 0.5s.

const pocketDynamo: ItemScriptFactory = (ctx) => {
  const dt = clock();
  let spin = 0;
  let lastX = NaN, lastY = NaN;
  let nextArc = 0;
  let overloadUntil = 0;
  let overloaded = false;
  let rot = 0;
  let arcFx = { at: -9999, x: 0, y: 0 };
  return {
    update(time) {
      const step = dt(time);
      if (!live(ctx)) return;
      const p = ctx.player;
      const moved = !Number.isNaN(lastX) && dist(lastX, lastY, p.x, p.y) > 0.5;
      lastX = p.x; lastY = p.y;
      spin = clamp(spin + (moved ? step / 3 : -step), 0, 1);
      if (!overloaded && p.hp > 0 && p.hp < p.maxHp * 0.25) {
        overloaded = true; overloadUntil = time + 4000;
        ctx.boostSpeed(1.2, 4000);
        ctx.float(p.x, p.y - 56, 'OVERLOAD', '#bff0ff');
        ctx.sfx('electric-charge');
      }
      const over = time < overloadUntil;
      rot += step * (4 + spin * 20 + (over ? 20 : 0));
      if ((spin >= 1 || over) && time >= nextArc && foeLive(ctx) && dist(p.x, p.y, ctx.npc.x, ctx.npc.y) < 380) {
        nextArc = time + (over ? 500 : 1300);
        ctx.hit(ctx.npc, over ? 5 : 6, ctx.npc.x, ctx.npc.y - 20);
        arcFx = { at: time, x: ctx.npc.x, y: ctx.npc.y };
        ctx.sfx('zap');
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x - 26, y = p.y - 8;
      const over = time < overloadUntil;
      // Drum, windings and a little commutator spinning.
      g.fillStyle(0x22262d, 1); g.fillRoundedRect(x - 8, y - 6, 16, 12, 3);
      for (let k = 0; k < 4; k++) { g.fillStyle(k % 2 ? COPPER : COPPER_DARK, 1); g.fillRect(x - 6 + k * 3, y - 5, 2.4, 10); }
      g.lineStyle(2, INSULATOR, 0.9); g.lineBetween(x + 8, y, x + 8 + Math.cos(rot) * 5, y + Math.sin(rot) * 5);
      meterDial(g, x, y - 12, 4, spin);
      if (spin >= 1 || over) { glow(g, x, y, 14, ARC, 0.07, 2); sparks(g, x, y, 10, time, 3, over ? SPARK : ARC); }
      if (time - arcFx.at < 240) bolt(g, x, y, arcFx.x, arcFx.y - 14, Math.floor(time / 40), 2.2, over ? ARC_VIOLET : ARC, 1 - (time - arcFx.at) / 240, 12);
    },
  };
};

// ── Storm Pasty (food) ───────────────────────────────────────────────
// Cable eel and spark minnow under a crust that crackles. Every 11s static builds in you; the next
// hit you land within 3s discharges it for 9 extra.

const stormPasty: ItemScriptFactory = (ctx) => {
  let next = -1;
  let readyUntil = 0;
  return {
    update(time) {
      if (next < 0) next = time + 6000;
      if (time >= next) { next = time + 11000; readyUntil = time + 3000; ctx.sfx('electric-charge'); }
    },
    onHitDealt(amount) {
      const now = ctx.scene.time.now;
      if (amount < 2 || now >= readyUntil || !foeLive(ctx)) return;
      readyUntil = 0;
      ctx.hit(ctx.npc, 9, ctx.npc.x, ctx.npc.y - 20);
      ctx.sfx('zap');
    },
    drawAir(g, time) {
      if (!live(ctx) || time >= readyUntil) return;
      sparks(g, ctx.player.x, ctx.player.y - 16, 24, time, 5, SPARK);
    },
  };
};

// ── Item table ───────────────────────────────────────────────────────

export const DYNAMO_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_CRANK, name: 'Crank Handle', emoji: '🔧', kind: 'charm', price: 340, isle: ISLE,
    flavor: 'The handle off a kitchen crank, worn smooth by one family\'s hands. Ottilie fits a little dynamo to the boss.',
    script: CHARM_CRANK,
    scriptText: [
      'Every 520px you walk banks a charge (up to 3).',
      'Each hit you land spends one for 8 extra damage.',
    ],
  },
  {
    id: CHARM_LOCKET, name: 'Leyden Locket', emoji: '🫙', kind: 'charm', price: 480, isle: ISLE,
    flavor: 'A Leyden jar the size of a thumb, foil inside, a brass knob on top, on a fine chain. It keeps what it is given.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_LOCKET,
    scriptText: [
      'Damage you take charges the jar. At 32 stored it discharges:',
      '18 damage to your foe, and +25% speed for 1.5s.',
    ],
  },
  {
    id: CHARM_ROD, name: 'Lightning-Rod Pin', emoji: '📍', kind: 'charm', price: 680, isle: ISLE,
    flavor: 'A finger of copper with three prongs, pinned to the collar. Ferris gives them to apprentices. Some come back.',
    script: CHARM_ROD,
    scriptText: [
      'Every 9s a storm cloud gathers over your foe, follows, then holds; 1.6s on it strikes for 16.',
      'If you are standing in it, you take 6.',
    ],
  },
  {
    id: CHARM_FUSE, name: 'Fuse-Wire Ring', emoji: '💍', kind: 'charm', price: 920, isle: ISLE,
    flavor: 'Amp winds them from the wire she makes fuses with, round a brass cap. It is designed to break.',
    script: CHARM_FUSE,
    scriptText: [
      'Every 5th hit you land blows the fuse: 10 damage to your foe,',
      'and the last two abilities you cast come off cooldown 1.5s sooner.',
    ],
  },
  {
    id: ART_VOLT, name: 'Volt\'s Pocket Dynamo', emoji: '🔋', kind: 'artifact', isle: ISLE,
    flavor: 'He carried it as a boy so his pocket would never be dark. The handle is worn through to the brass.',
    effect: { maxHp: 15 },
    script: ART_VOLT,
    scriptText: [
      'Spins up while you move (3s to full). At full spin it arcs your foe within 380px every 1.3s for 6.',
      'Once a fight, under 25% health, it overloads: +20% speed and an arc every 0.5s for 4s.',
    ],
  },
  {
    id: FISH_TROUT, name: 'Turbine Trout', emoji: '🐟', kind: 'fish', sell: 26, isle: ISLE,
    flavor: 'A fat speckled trout that lies in the slack behind the wheels and lets the current bring it everything.',
    effect: { speedMult: 1.03 },
  },
  {
    id: FISH_MINNOW, name: 'Spark Minnow', emoji: '🐠', kind: 'fish', sell: 9, isle: ISLE,
    flavor: 'A finger of blue that glows when it is frightened, which is always. Shoals of them light up the race at night.',
    effect: { damageMult: 1.02 },
  },
  {
    id: MEAL, name: 'Treadwheel Meal', emoji: '🌾', kind: 'material', price: 14, sell: 5, isle: ISLE,
    flavor: 'Coarse meal ground by the yard\'s wheels. Every sack is stamped with the steps it took to grind it.',
  },
  {
    id: FOOD_LOAF, name: 'Brownout Loaf', emoji: '🍞', kind: 'food', sell: 18, isle: ISLE,
    flavor: 'A dark, close loaf with minnow baked through it, made to keep soft through a cold night in a switched-off house.',
    effect: { maxHp: 8, regenPerSecond: 0.4 },
  },
  {
    id: FOOD_TROUT, name: 'Coil-Baked Trout', emoji: '🍽️', kind: 'food', sell: 40, isle: ISLE,
    flavor: 'A whole trout baked on the Ovenlight\'s coils, the grill lines burned into its skin in a zigzag.',
    effect: { damageMult: 1.05, speedMult: 1.03 },
  },
  {
    id: FOOD_BUN, name: 'Herring Coil Bun', emoji: '🥯', kind: 'food', sell: 24, isle: ISLE,
    flavor: 'Volt herring rolled up in a spiral of dough like a wound coil. The night cranks eat them one-handed.',
    effect: { shieldHp: 12 },
  },
  {
    id: FOOD_PIE, name: 'Copper Snapper Pie', emoji: '🥧', kind: 'food', sell: 48, isle: ISLE,
    flavor: 'A deep pie with a lattice crust glazed till it shines like new copper. Bettony\'s pride.',
    effect: { damageTakenMult: 0.94, maxHp: 8 },
  },
  {
    id: FOOD_PASTY, name: 'Storm Pasty', emoji: '🥟', kind: 'food', sell: 44, isle: ISLE,
    flavor: 'Cable eel and spark minnow under a crimped crust that crackles when you bite it. Not entirely a figure of speech.',
    script: FOOD_PASTY,
    scriptText: ['Every 11s static builds in you: the next hit you land within 3s deals 9 extra.'],
  },
];

export const DYNAMO_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_CRANK]: crankHandle,
  [CHARM_LOCKET]: leydenLocket,
  [CHARM_ROD]: rodPin,
  [CHARM_FUSE]: fuseRing,
  [ART_VOLT]: pocketDynamo,
  [FOOD_PASTY]: stormPasty,
};

export const DYNAMO_SHOPS: ShopDef[] = [{
  id: 'dynamo-shop',
  name: 'Spool & Sons, Cablewrights',
  stock: [CHARM_CRANK, CHARM_LOCKET, CHARM_ROD, CHARM_FUSE, MEAL],
  buys: true,
}];

export const DYNAMO_BAKERIES: BakeryDef[] = [{
  id: BAKERY_ID,
  name: 'The Ovenlight',
  recipes: [
    { id: RECIPE_LOAF, name: 'Brownout Loaf', inputs: [{ item: FISH_MINNOW, count: 2 }], coins: 10, output: FOOD_LOAF, makes: 2 },
    { id: RECIPE_TROUT, name: 'Coil-Baked Trout', inputs: [{ item: FISH_TROUT, count: 1 }, { item: MEAL, count: 1 }], coins: 22, output: FOOD_TROUT },
    { id: RECIPE_BUN, name: 'Herring Coil Bun', inputs: [{ item: 'fish-volt-herring', count: 2 }, { item: MEAL, count: 1 }], coins: 18, output: FOOD_BUN, makes: 2 },
    { id: RECIPE_PIE, name: 'Copper Snapper Pie', inputs: [{ item: 'fish-copper-snapper', count: 1 }, { item: MEAL, count: 2 }], coins: 30, output: FOOD_PIE },
    {
      id: RECIPE_PASTY, name: 'Storm Pasty',
      inputs: [{ item: 'fish-cable-eel', count: 1 }, { item: FISH_MINNOW, count: 1 }, { item: MEAL, count: 1 }], coins: 32, output: FOOD_PASTY,
    },
  ],
}];

export const DYNAMO_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Mill Race', kind: 'charged' }];

export const DYNAMO_FISH: FishDef[] = [
  { id: FISH_MINNOW, fisheries: [FISHERY], weight: 6, fight: 2, size: [5, 12] },
  { id: FISH_TROUT, fisheries: [FISHERY], weight: 3, fight: 4, size: [22, 52] },
];

