import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow, lit } from '../../../../art/IsleArt';
import { auroraCurtain, auroraHue, horseshoe, poleBadge } from './art';
import { BRASS, BRASS_DARK, BRASS_LIT, IRON, IRON_DARK, IRON_LIT, MAGNETITE, MAGNETITE_LIT, NORTH, NORTH_LIT, SOUTH, SOUTH_LIT, SPARK } from './palette';
import { alive, clamp, dist } from './util';

/**
 * The Lodestar Court's goods: Ottilie Cobalt's four charms, Prince Polar's twin needle, and the
 * aurora tarn's three fish. Every charm is an instrument or a magnet that plays one of the
 * crag's own rules for you — the flipping pole, the stone's draw on near iron, the keeper bar that
 * closes a circuit, and the aurora that comes down where you stand. Scripts are registered below
 * under their item ids.
 */

const ISLE = 'electricity';

export const CHARM_HORSESHOE = 'lodestar-charm-horseshoe';
export const CHARM_CHIP = 'lodestar-charm-lodestone-chip';
export const CHARM_KEEPER = 'lodestar-charm-keeper-bar';
export const CHARM_GLASS = 'lodestar-charm-aurora-glass';
export const ART_POLAR = 'art-polar';

export const FISH_LOACH = 'fish-lodestone-loach';
export const FISH_PIKE = 'fish-compass-pike';
export const FISH_CHAR = 'fish-aurora-char';
export const FISHERY = 'lodestar-tarn';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Red-and-Blue Horseshoe ───────────────────────────────────────────
// The horseshoe at your hip flips its pole every 2.5s. Hits landed while it reads north leave a
// north mark on the foe; while south, a south mark. Two of each and the foe shorts out.

const horseshoeCharm: ItemScriptFactory = (ctx) => {
  const FLIP = 2500;
  let n = 0, s = 0;
  let shortFx = -9999;
  const north = (time: number) => Math.floor(time / FLIP) % 2 === 0;
  return {
    onHitDealt(amount) {
      if (amount < 2 || !foeLive(ctx) || !live(ctx)) return;
      const now = ctx.scene.time.now;
      if (north(now)) n = Math.min(3, n + 1); else s = Math.min(3, s + 1);
      if (n >= 2 && s >= 2) {
        n = 0; s = 0;
        shortFx = now;
        ctx.hit(ctx.npc, 16, ctx.npc.x, ctx.npc.y - 20);
        ctx.float(ctx.npc.x, ctx.npc.y - 58, 'SHORTED', '#f0d48a');
        ctx.flash(ctx.npc.x, ctx.npc.y, SPARK);
        ctx.sfx('zap');
      }
    },
    drawAir(g, time) {
      if (live(ctx)) {
        const p = ctx.player;
        const k = (time % FLIP) / FLIP;
        horseshoe(g, p.x + 24, p.y - 8, 0.8, Math.PI + (k > 0.9 ? (k - 0.9) * 10 * Math.PI : 0), !north(time));
      }
      if (!foeLive(ctx)) return;
      const f = ctx.npc;
      for (let i = 0; i < n; i++) { g.fillStyle(NORTH, 1); g.fillCircle(f.x - 16 + i * 8, f.y - 62, 3); }
      for (let i = 0; i < s; i++) { g.fillStyle(SOUTH, 1); g.fillCircle(f.x + 4 + i * 8, f.y - 62, 3); }
      if (time - shortFx < 450) {
        const k = (time - shortFx) / 450;
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05 + k * 2;
          g.lineStyle(2, i % 2 ? NORTH_LIT : SOUTH_LIT, 1 - k);
          g.lineBetween(f.x + Math.cos(a) * 10, f.y + Math.sin(a) * 10, f.x + Math.cos(a) * (20 + k * 30), f.y + Math.sin(a) * (20 + k * 30));
        }
      }
    },
  };
};

// ── Lodestone Chip ───────────────────────────────────────────────────
// A chip off the great stone in a brass cage. It draws on the iron in your foe's blood: within
// 160px it tugs them 26px toward you every 1.2s (3 damage, and the iron comes back to you as 1
// health); within 90px, every 0.7s. It stops drawing them once they are at arm's length.

const chip: ItemScriptFactory = (ctx) => {
  let last = 0;
  let tugFx = -9999;
  return {
    update(time) {
      if (!live(ctx) || !foeLive(ctx)) return;
      const d = dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y);
      if (d > 160) return;
      const every = d < 90 ? 700 : 1200;
      if (time - last < every) return;
      last = time;
      tugFx = time;
      if (d > 56) {
        const pull = Math.min(26, d - 56);
        ctx.nudge(ctx.npc, ((ctx.player.x - ctx.npc.x) / d) * pull, ((ctx.player.y - ctx.npc.y) / d) * pull);
      }
      ctx.hit(ctx.npc, 3, ctx.npc.x, ctx.npc.y);
      ctx.heal(ctx.player, 1);
      ctx.sfx('magnet-pull');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x - 22, y = p.y - 30;
      // The caged chip at your shoulder.
      g.fillStyle(MAGNETITE, 1); g.fillCircle(x, y, 5);
      g.fillStyle(MAGNETITE_LIT, 0.8); g.fillCircle(x - 1.5, y - 1.5, 2);
      g.lineStyle(1, BRASS, 1); g.strokeCircle(x, y, 7); g.lineBetween(x - 7, y, x + 7, y); g.lineBetween(x, y - 7, x, y + 7);
      if (!foeLive(ctx)) return;
      const f = ctx.npc;
      const d = dist(p.x, p.y, f.x, f.y);
      if (d <= 160) {
        g.lineStyle(1, IRON_LIT, 0.25 + (1 - d / 160) * 0.4);
        g.lineBetween(x, y, f.x, f.y - 10);
      }
      if (time - tugFx < 300) {
        const k = (time - tugFx) / 300;
        for (let i = 0; i < 5; i++) {
          const t = (k + i * 0.2) % 1;
          g.fillStyle(IRON_LIT, 1 - k); g.fillCircle(f.x + (x - f.x) * t, f.y - 10 + (y - f.y + 10) * t, 1.6);
        }
      }
    },
  };
};

// ── Keeper Bar ───────────────────────────────────────────────────────
// A bar of soft iron that closes a magnet's circuit. It charges over 6s. Struck while it is
// charged, it keeps the blow: you heal back 60% of that hit (at most 14), and the bar discharges
// into the foe for 8.

const keeper: ItemScriptFactory = (ctx) => {
  const CHARGE = 6000;
  let since = -1;
  let keptFx = -9999;
  return {
    update(time) { if (since < 0) since = time; },
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (since < 0 || now - since < CHARGE || !live(ctx) || amount < 1) return;
      since = now;
      keptFx = now;
      ctx.heal(ctx.player, Math.min(14, Math.round(amount * 0.6)));
      if (foeLive(ctx)) ctx.hit(ctx.npc, 8, ctx.npc.x, ctx.npc.y);
      ctx.float(ctx.player.x, ctx.player.y - 56, 'KEPT', '#c8d0e0');
      ctx.sfx('shield-block');
    },
    drawAir(g, time) {
      if (!live(ctx) || since < 0) return;
      const p = ctx.player;
      const k = clamp((time - since) / CHARGE, 0, 1);
      const x = p.x, y = p.y + 28;
      // The bar across your belt, a horseshoe closed on it when charged.
      g.fillStyle(IRON_DARK, 1); g.fillRect(x - 15, y - 3, 30, 6);
      g.fillStyle(IRON, 1); g.fillRect(x - 14, y - 3, 28 * k, 4);
      if (k >= 1) {
        horseshoe(g, x, y - 4, 0.9, 0);
        glow(g, x, y, 16, SPARK, 0.05 + Math.sin(time / 100) * 0.03, 2);
      }
      if (time - keptFx < 400) {
        const q = (time - keptFx) / 400;
        g.lineStyle(3 * (1 - q), IRON_LIT, 1 - q); g.strokeCircle(p.x, p.y, 24 + q * 30);
        if (foeLive(ctx)) { g.lineStyle(2 * (1 - q), SPARK, 1 - q); g.lineBetween(p.x, p.y, ctx.npc.x, ctx.npc.y); }
      }
    },
  };
};

// ── Aurora Glass ─────────────────────────────────────────────────────
// A shard of the tarn's ice that never melts, with the sky in it. Every 9s a curtain of aurora
// comes down where you stand and hangs there 4s. Inside it you regenerate 3 a second and your
// blows land 20% harder.

const auroraGlass: ItemScriptFactory = (ctx) => {
  const EVERY = 9000, HANG = 4000, HALF = 48;
  let nextAt = -1;
  let curtainX = 0;
  let curtainAt = -9999;
  let lastTick = 0;
  return {
    update(time) {
      if (!live(ctx)) return;
      if (nextAt < 0) nextAt = time + 3000;
      if (time >= nextAt) {
        nextAt = time + EVERY;
        curtainX = ctx.player.x;
        curtainAt = time;
        ctx.sfx('holy-chord');
      }
      const up = time - curtainAt < HANG;
      if (up && Math.abs(ctx.player.x - curtainX) < HALF) {
        if (time - lastTick >= 333) {
          lastTick = time;
          ctx.heal(ctx.player, 1);
          ctx.boostDamage(1.2, 345);
        }
      }
    },
    drawAir(g, time) {
      const age = time - curtainAt;
      if (age > HANG) return;
      const fade = clamp(Math.min(age / 300, (HANG - age) / 400), 0, 1);
      auroraCurtain(g, curtainX, 0, ctx.H, HALF * 2, auroraHue(time / 1000), time, 0.7 * fade);
      if (live(ctx) && Math.abs(ctx.player.x - curtainX) < HALF) {
        g.lineStyle(2, lit(auroraHue(time / 1000), 0.4), 0.7); g.strokeEllipse(ctx.player.x, ctx.player.y - 46, 28, 8);
      }
    },
  };
};

// ── Polar's Twin Needle (artifact) ───────────────────────────────────
// Two compass needles in one case, one red, one blue. Your pole flips every 5s, and the flip
// throws a ring: the foe within 170px is flung 70px off you and takes 10. Reading NORTH, your hits
// draw iron back: heal 2. Reading SOUTH, every hit you take repels: the foe within 150px is shoved
// 40px off you and takes 6 (at most once a second).

const twinNeedle: ItemScriptFactory = (ctx) => {
  const FLIP = 5000;
  let lastPole = -1;
  let ringFx = -9999;
  let lastRepel = 0;
  const pole = (time: number) => Math.floor(time / FLIP) % 2; // 0 north, 1 south
  /** Shove the foe straight off you. */
  const repel = (px: number) => {
    const p = ctx.player, f = ctx.npc;
    const d = dist(p.x, p.y, f.x, f.y);
    const a = d > 1 ? Math.atan2(f.y - p.y, f.x - p.x) : ctx.facing(p);
    ctx.nudge(f, Math.cos(a) * px, Math.sin(a) * px);
  };
  return {
    update(time) {
      if (!live(ctx)) return;
      const p = pole(time);
      if (lastPole < 0) { lastPole = p; return; }
      if (p === lastPole) return;
      lastPole = p;
      ringFx = time;
      ctx.sfx('magnet-pull');
      ctx.float(ctx.player.x, ctx.player.y - 60, p === 0 ? 'NORTH' : 'SOUTH', p === 0 ? '#ff8a7a' : '#8ab4ff');
      if (foeLive(ctx) && dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y) < 170) {
        repel(70);
        ctx.hit(ctx.npc, 10, ctx.npc.x, ctx.npc.y);
      }
    },
    onHitDealt(amount) {
      if (amount < 2 || !live(ctx)) return;
      if (pole(ctx.scene.time.now) === 0) ctx.heal(ctx.player, 2);
    },
    onHitTaken() {
      const now = ctx.scene.time.now;
      if (!live(ctx) || !foeLive(ctx) || pole(now) !== 1 || now - lastRepel < 1000) return;
      if (dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y) > 150) return;
      lastRepel = now;
      repel(40);
      ctx.hit(ctx.npc, 6, ctx.npc.x, ctx.npc.y);
      ctx.flash(ctx.npc.x, ctx.npc.y, SOUTH_LIT);
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const north = pole(time) === 0;
      poleBadge(g, p.x + 26, p.y - 40, north, 0.9);
      // The case: two needles, the live one bright.
      const x = p.x - 26, y = p.y - 40;
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, 8);
      g.fillStyle(0xf0ead8, 1); g.fillCircle(x, y, 6);
      const a = time / 600;
      g.lineStyle(1.6, north ? NORTH : faded(NORTH), 1); g.lineBetween(x, y, x + Math.cos(a) * 5, y + Math.sin(a) * 5);
      g.lineStyle(1.6, north ? faded(SOUTH) : SOUTH, 1); g.lineBetween(x, y, x - Math.cos(a) * 5, y - Math.sin(a) * 5);
      g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, y, 1.4);
      if (time - ringFx < 450) {
        const k = (time - ringFx) / 450;
        g.lineStyle(5 * (1 - k), north ? NORTH_LIT : SOUTH_LIT, 1 - k); g.strokeCircle(p.x, p.y, 30 + k * 140);
      }
    },
  };
};

/** A needle at rest: its pole paint washed pale. */
const faded = (c: number): number => lit(c, 0.6);

export const LODESTAR_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_HORSESHOE, name: 'Red-and-Blue Horseshoe', emoji: '🧲', kind: 'charm', price: 340, isle: ISLE,
    flavor: 'A pocket horseshoe from Ferrite\'s rack, its ends painted the court\'s two colours. It flips when you aren\'t looking.',
    script: CHARM_HORSESHOE,
    scriptText: [
      'The horseshoe flips its pole every 2.5s. Each hit you land leaves a mark of the pole it reads.',
      'Two north and two south marks on the foe and they short out: 16 damage.',
    ],
  },
  {
    id: CHARM_CHIP, name: 'Lodestone Chip', emoji: '🪨', kind: 'charm', price: 460, isle: ISLE,
    flavor: 'A chip off the great stone, caged in brass so it won\'t take your buttons. Magda sells them, quietly.',
    effect: { maxHp: 5 },
    script: CHARM_CHIP,
    scriptText: [
      'Within 160px of your foe, the chip tugs them 26px toward you every 1.2s: 3 damage, and you heal 1.',
      'Within 90px it tugs every 0.7s.',
    ],
  },
  {
    id: CHARM_KEEPER, name: 'Keeper Bar', emoji: '🔩', kind: 'charm', price: 680, isle: ISLE,
    flavor: 'The soft-iron bar laid across a horseshoe\'s ends to keep its strength. On the crag they say it keeps people too.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_KEEPER,
    scriptText: [
      'The bar charges over 6s. Struck while it is charged, it keeps the blow: heal 60% of that hit (max 14).',
      'Then it discharges into the foe for 8 and charges again.',
    ],
  },
  {
    id: CHARM_GLASS, name: 'Aurora Glass', emoji: '🔮', kind: 'charm', price: 900, isle: ISLE,
    flavor: 'A sliver of tarn ice that has never melted, with a little of the sky caught in it. It is very cold to wear.',
    script: CHARM_GLASS,
    scriptText: [
      'Every 9s a curtain of aurora comes down where you stand and hangs 4s.',
      'Inside it you regenerate 3 health a second and deal +20% damage.',
    ],
  },
  {
    id: ART_POLAR, name: 'Polar\'s Twin Needle', emoji: '🧭', kind: 'artifact', isle: ISLE,
    flavor: 'Two needles in one brass case, one red, one blue, never at rest. The Prince carried it since he was a boy.',
    effect: { maxHp: 15 },
    script: ART_POLAR,
    scriptText: [
      'Your pole flips every 5s; each flip throws a ring that flings a foe within 170px back and deals 10.',
      'NORTH: your hits heal 2. SOUTH: hits you take shove a foe within 150px off you for 6 (once a second).',
    ],
  },
  {
    id: FISH_LOACH, name: 'Lodestone Loach', emoji: '🐟', kind: 'fish', sell: 14, isle: ISLE,
    flavor: 'A little grey bottom-feeder that eats the iron grit off the tarn floor. Leaves your knife magnetised.',
    effect: { shieldHp: 4 },
  },
  {
    id: FISH_PIKE, name: 'Compass Pike', emoji: '🐠', kind: 'fish', sell: 26, isle: ISLE,
    flavor: 'Lies in the water pointing at the lodestone, always. Lodestar fishers set their nets by it.',
    effect: { critChance: 0.03 },
  },
  {
    id: FISH_CHAR, name: 'Aurora Char', emoji: '✨', kind: 'fish', sell: 46, isle: ISLE,
    flavor: 'Green-lit from inside. A jar of its oil glows a week without a flame — a light the Grid can\'t meter.',
    effect: { regenPerSecond: 0.6 },
  },
];

export const LODESTAR_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_HORSESHOE]: horseshoeCharm,
  [CHARM_CHIP]: chip,
  [CHARM_KEEPER]: keeper,
  [CHARM_GLASS]: auroraGlass,
  [ART_POLAR]: twinNeedle,
};

export const LODESTAR_SHOPS: ShopDef[] = [
  { id: 'lodestar-shop', name: 'Cobalt\'s Compasses & Keepers', stock: [CHARM_HORSESHOE, CHARM_CHIP, CHARM_KEEPER, CHARM_GLASS], buys: true },
];

export const LODESTAR_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Aurora Tarn', kind: 'aurora' }];

export const LODESTAR_FISH: FishDef[] = [
  { id: FISH_LOACH, fisheries: [FISHERY], weight: 6, fight: 2, size: [10, 24] },
  { id: FISH_PIKE, fisheries: [FISHERY], weight: 4, fight: 3, size: [30, 70] },
  { id: FISH_CHAR, fisheries: [FISHERY], weight: 2, fight: 4, size: [24, 52] },
];
