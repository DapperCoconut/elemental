import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { fulgurite, sinkCollar, wormMaw } from './art';
import {
  GLASS_LIT, SAND_LIT, SAND_PALE, STRIPE_INDIGO, STRIPE_SAFFRON, TIMBER_DARK, WATER, WATER_DEEP, WATER_LIT,
} from './palette';
import { alive, clamp, clock, dist, wrapAngle } from './util';

/**
 * The Dunesea Court's goods: Halima's four charms, Prince Sirocco's glass rose, and the sand sea's
 * three fish. Every charm is a thing of the dunes that plays one of the court's own rules for you —
 * the sand-ship's broadside, the worm that hunts the moving, the oasis, the quicksand. Scripts are
 * registered below under their item ids.
 */

const ISLE = 'earth';

export const CHARM_PENNANT = 'dunesea-charm-lateen-pennant';
export const CHARM_TOOTH = 'dunesea-charm-worm-tooth';
export const CHARM_FLASK = 'dunesea-charm-oasis-flask';
export const CHARM_ANKLET = 'dunesea-charm-quicksand-anklet';
export const ART_SIROCCO = 'art-sirocco';

export const FISH_SKIPPER = 'fish-sandskipper';
export const FISH_EEL = 'fish-dune-eel';
export const FISH_RAY = 'fish-scarab-ray';
export const FISHERY = 'dunesea-sands';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Lateen Pennant ───────────────────────────────────────────────────
// Hold one heading for 1.2s and you catch the wind: a little faster while you hold it, and your next
// hit fires a broadside.

const pennant: ItemScriptFactory = (ctx) => {
  const step = clock();
  let lx = NaN, ly = NaN;
  let heading = 0;
  let sail = 0;
  let charged = false;
  let lastBoost = 0;
  let firedAt = -9999;
  const FILL = 1.2;
  return {
    update(time) {
      const dt = step(time);
      if (!live(ctx) || dt <= 0) return;
      const p = ctx.player;
      if (Number.isNaN(lx)) { lx = p.x; ly = p.y; return; }
      const vx = (p.x - lx) / dt, vy = (p.y - ly) / dt;
      lx = p.x; ly = p.y;
      const sp = Math.hypot(vx, vy);
      if (sp > 110) {
        const a = Math.atan2(vy, vx);
        if (Math.abs(wrapAngle(a - heading)) < 0.45) sail = Math.min(FILL, sail + dt);
        else { heading = a; sail = charged ? FILL * 0.5 : 0; }
      } else if (!charged) sail = Math.max(0, sail - dt * 2);
      if (sail >= FILL && !charged) { charged = true; ctx.float(p.x, p.y - 50, 'WIND IN THE SAIL', '#f2d496'); ctx.sfx('gust'); }
      if (charged && sail >= FILL && time - lastBoost > 240) { lastBoost = time; ctx.boostSpeed(1.12, 260); }
    },
    onHitDealt(amount) {
      if (!charged || amount < 2 || !foeLive(ctx)) return;
      charged = false;
      sail = 0;
      firedAt = ctx.scene.time.now;
      ctx.hit(ctx.npc, 12, ctx.npc.x, ctx.npc.y);
      ctx.float(ctx.npc.x, ctx.npc.y - 50, 'BROADSIDE', '#ffc070');
      ctx.sfx('musket');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      // A pennant on a short staff at the shoulder, streaming longer as the sail fills.
      const sx = p.x + 20, sy = p.y - 40;
      g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(sx, sy + 18, sx, sy - 6);
      const len = 8 + (sail / FILL) * 26;
      const back = heading + Math.PI;
      const tx = sx + Math.cos(back) * len, ty = sy - 4 + Math.sin(back) * len * 0.4 + Math.sin(time / 90) * 2;
      g.fillStyle(charged ? STRIPE_SAFFRON : STRIPE_INDIGO, 1); g.fillTriangle(sx, sy - 6, sx, sy + 2, tx, ty);
      if (charged) glow(g, sx, sy - 2, 12, 0xfff0c8, 0.06, 2);
      const k = (time - firedAt) / 500;
      if (k >= 0 && k < 1) for (let i = 0; i < 3; i++) { g.fillStyle(0xe8e0d0, 0.5 * (1 - k)); g.fillCircle(ctx.npc.x - 16 + i * 16, ctx.npc.y - 20 - k * 20, 6 + k * 10); }
    },
  };
};

// ── Wormcaller's Tooth ───────────────────────────────────────────────
// Stand still a second while your foe is on the move, and a worm surfaces under them.

const tooth: ItemScriptFactory = (ctx) => {
  const step = clock();
  let still = 0;
  let lx = NaN, ly = NaN, fx = NaN, fy = NaN;
  let foeMoved = 0;
  let ready = 0;
  let strike: { x: number; y: number; fromX: number; fromY: number; at: number; hitAt: number; dealt: boolean } | null = null;
  return {
    update(time) {
      const dt = step(time);
      if (!live(ctx) || dt <= 0) return;
      const p = ctx.player, n = ctx.npc;
      if (Number.isNaN(lx)) { lx = p.x; ly = p.y; fx = n.x; fy = n.y; return; }
      still = Math.hypot(p.x - lx, p.y - ly) / dt < 20 ? still + dt : 0;
      foeMoved = foeMoved * Math.max(0, 1 - dt) + Math.hypot(n.x - fx, n.y - fy);
      lx = p.x; ly = p.y; fx = n.x; fy = n.y;
      if (!strike && time >= ready && still >= 1 && foeMoved > 110 && foeLive(ctx)) {
        strike = { x: n.x, y: n.y, fromX: p.x, fromY: p.y, at: time, hitAt: time + 700, dealt: false };
        ready = time + 7000;
        ctx.sfx('quake');
      }
      if (strike && !strike.dealt && time >= strike.hitAt) {
        strike.dealt = true;
        if (foeLive(ctx) && dist(n.x, n.y, strike.x, strike.y) < 60) {
          ctx.hit(n, 15, n.x, n.y);
          ctx.float(n.x, n.y - 50, 'THE WORM', '#ffb070');
        }
        ctx.sfx('roar');
      }
      if (strike && time > strike.hitAt + 800) strike = null;
    },
    drawGround(g, time) {
      if (!strike) return;
      const k = clamp((time - strike.at) / 700, 0, 1);
      // A furrow running from you to where they stood.
      for (let i = 0; i < 10; i++) {
        const f = i / 9;
        if (f > k) break;
        const x = strike.fromX + (strike.x - strike.fromX) * f, y = strike.fromY + (strike.y - strike.fromY) * f;
        g.fillStyle(SAND_LIT, 0.5); g.fillEllipse(x, y + 8, 22, 9);
      }
      if (time < strike.hitAt) { g.lineStyle(2, 0xb8382c, 0.4 + k * 0.4); g.strokeCircle(strike.x, strike.y, 60); }
    },
    drawAir(g, time) {
      if (!strike || time < strike.hitAt) return;
      const k = clamp((time - strike.hitAt) / 800, 0, 1);
      wormMaw(g, strike.x, strike.y + 16, 22, k < 0.3 ? 1 : 1 - (k - 0.3) / 0.7, time);
    },
  };
};

// ── Oasis Flask ──────────────────────────────────────────────────────
// Every 10s a little pool wells up near you for 4s. Step in: heal 8, and every ability you have used
// this fight comes 1.5s sooner.

const flask: ItemScriptFactory = (ctx) => {
  const cast = new Set<string>();
  let pool: { x: number; y: number; at: number; until: number } | null = null;
  let next = 0;
  let started = false;
  return {
    update(time) {
      if (!live(ctx)) return;
      if (!started) { started = true; next = time + 6000; }
      if (!pool && time >= next) {
        const a = ctx.rng() * Math.PI * 2;
        pool = { x: clamp(ctx.player.x + Math.cos(a) * 120, 60, ctx.W - 60), y: clamp(ctx.player.y + Math.sin(a) * 100, 130, ctx.H - 50), at: time, until: time + 4000 };
        next = time + 10000;
      }
      if (pool && dist(ctx.player.x, ctx.player.y, pool.x, pool.y) < 40) {
        ctx.heal(ctx.player, 8);
        for (const id of cast) ctx.refund(id, 1500);
        ctx.float(pool.x, pool.y - 30, 'SWEET WATER', '#9ae0d8');
        ctx.sfx('splash');
        pool = null;
      }
      if (pool && time > pool.until) pool = null;
    },
    onCast(abilityId) { cast.add(abilityId); },
    drawGround(g, time) {
      if (!pool) return;
      const grow = clamp((time - pool.at) / 400, 0, 1) * clamp((pool.until - time) / 500, 0, 1);
      g.fillStyle(0x6a5a3a, 0.5 * grow); g.fillEllipse(pool.x, pool.y + 3, 92 * grow, 46 * grow);
      g.fillStyle(WATER_DEEP, grow); g.fillEllipse(pool.x, pool.y, 76 * grow, 36 * grow);
      g.fillStyle(WATER, grow); g.fillEllipse(pool.x - 2, pool.y - 2, 64 * grow, 28 * grow);
      g.fillStyle(WATER_LIT, 0.6 * grow); g.fillEllipse(pool.x - 10, pool.y - 6, 26 * grow, 5 * grow);
      const ph = (time / 900) % 1;
      g.lineStyle(1, WATER_LIT, 0.5 * (1 - ph) * grow); g.strokeEllipse(pool.x + 4, pool.y, 8 + ph * 40, 3 + ph * 16);
    },
  };
};

// ── Quicksand Anklet ─────────────────────────────────────────────────
// Every hit you land pools sinking sand round your foe's feet. Fill it and it swallows them to the
// waist: a heavy blow, and your hits land harder while they struggle.

const anklet: ItemScriptFactory = (ctx) => {
  const step = clock();
  let sink = 0;
  let swallowAt = -9999;
  return {
    update(time) {
      const dt = step(time);
      sink = Math.max(0, sink - 12 * dt);
    },
    onHitDealt(amount) {
      if (amount < 2 || !foeLive(ctx)) return;
      sink += 14;
      if (sink >= 100) {
        sink = 0;
        swallowAt = ctx.scene.time.now;
        ctx.hit(ctx.npc, 16, ctx.npc.x, ctx.npc.y);
        ctx.boostDamage(1.25, 2500);
        ctx.float(ctx.npc.x, ctx.npc.y - 50, 'TO THE WAIST', '#d8b07a');
        ctx.sfx('status-slow');
      }
    },
    drawAir(g, time) {
      if (!foeLive(ctx)) return;
      const k = (time - swallowAt) / 2500;
      const depth = k >= 0 && k < 1 ? 0.9 * (1 - k * 0.6) : sink / 140;
      if (depth > 0.04) sinkCollar(g, ctx.npc.x, ctx.npc.y, depth);
      if (k >= 0 && k < 1) for (let i = 0; i < 3; i++) { const ph = (time / 260 + i / 3) % 1; g.fillStyle(SAND_PALE, 0.6 * (1 - ph)); g.fillCircle(ctx.npc.x - 12 + i * 12, ctx.npc.y - 6 + ph * 12, 1.6); }
    },
  };
};

// ── Sirocco's Glass Rose ─────────────────────────────────────────────
// Every 4th hit calls lightning onto your foe's spot (a ring first). It leaves a fulgurite for 3s that
// shatters if they come near it.

interface Spike { x: number; y: number; at: number; until: number; seed: number }

const glassRose: ItemScriptFactory = (ctx) => {
  let hits = 0;
  let bolt: { x: number; y: number; at: number; fireAt: number; fired: boolean } | null = null;
  const spikes: Spike[] = [];
  return {
    update(time) {
      const n = ctx.npc;
      if (bolt && !bolt.fired && time >= bolt.fireAt) {
        bolt.fired = true;
        if (foeLive(ctx) && dist(n.x, n.y, bolt.x, bolt.y) < 55) { ctx.hit(n, 16, n.x, n.y); ctx.float(n.x, n.y - 50, 'STRUCK', '#f0fffc'); }
        spikes.push({ x: bolt.x, y: bolt.y, at: time, until: time + 3000, seed: ctx.rng() * 10 });
        ctx.flash(bolt.x, bolt.y, 0xf0fffc);
        ctx.sfx('thunder');
      }
      if (bolt && bolt.fired && time > bolt.fireAt + 250) bolt = null;
      for (let i = spikes.length - 1; i >= 0; i--) {
        const s = spikes[i];
        if (foeLive(ctx) && dist(n.x, n.y, s.x, s.y) < 45) {
          ctx.hit(n, 9, s.x, s.y);
          ctx.sfx('crystal-shatter');
          spikes.splice(i, 1);
          continue;
        }
        if (time > s.until) spikes.splice(i, 1);
      }
    },
    onHitDealt(amount) {
      if (amount < 2 || !foeLive(ctx)) return;
      hits++;
      if (hits % 4 === 0 && !bolt) {
        const now = ctx.scene.time.now;
        bolt = { x: ctx.npc.x, y: ctx.npc.y, at: now, fireAt: now + 800, fired: false };
        ctx.sfx('electric-charge');
      }
    },
    drawGround(g, time) {
      if (bolt && !bolt.fired) {
        const k = clamp((time - bolt.at) / 800, 0, 1);
        g.fillStyle(0x1a1430, 0.15 + k * 0.2); g.fillEllipse(bolt.x, bolt.y, 110, 48);
        g.lineStyle(2, GLASS_LIT, 0.3 + k * 0.6); g.strokeCircle(bolt.x, bolt.y, 55 * (1.2 - k * 0.2));
      }
      for (const s of spikes) fulgurite(g, s.x, s.y, 0.9, clamp((time - s.until + 800) / 800, 0, 1), s.seed);
    },
    drawAir(g, time) {
      if (!bolt || !bolt.fired) return;
      const k = 1 - (time - bolt.fireAt) / 250;
      if (k <= 0) return;
      let px = bolt.x + 20, py = bolt.y - 300;
      for (let i = 1; i <= 6; i++) {
        const nx = i === 6 ? bolt.x : bolt.x + Math.sin(i * 2.7 + bolt.at) * 30 * (1 - i / 6), ny = bolt.y - 300 + i * 50;
        g.lineStyle(5, GLASS_LIT, 0.4 * k); g.lineBetween(px, py, nx, ny);
        g.lineStyle(2, 0xffffff, k); g.lineBetween(px, py, nx, ny);
        px = nx; py = ny;
      }
    },
  };
};

export const DUNESEA_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_PENNANT, name: 'Lateen Pennant', emoji: '🚩', kind: 'charm', price: 280, isle: ISLE,
    flavor: 'A strip of striped sail on a little staff, off a sand-ship that was broken for its ballast. It still wants wind.',
    script: CHARM_PENNANT,
    scriptText: [
      'Hold one heading for 1.2s to catch the wind: +12% speed while you keep it.',
      'Your next hit after catching it fires a broadside for 12 extra damage.',
    ],
  },
  {
    id: CHARM_TOOTH, name: 'Wormcaller\'s Tooth', emoji: '🦷', kind: 'charm', price: 440, isle: ISLE,
    flavor: 'A sandworm\'s tooth on a thong, the length of a finger. Shai\'s people say it hears for you.',
    script: CHARM_TOOTH,
    scriptText: [
      'Stand still for 1s while your foe is moving and a worm surfaces where they stand (0.7s warning).',
      'It hits for 15 if they are still there. At most every 7s.',
    ],
  },
  {
    id: CHARM_FLASK, name: 'Oasis Flask', emoji: '🫗', kind: 'charm', price: 600, isle: ISLE,
    flavor: 'A gourd that is always a little damp, however long it has been in the sun. Halima will not say where it came from.',
    effect: { regenPerSecond: 0.2 },
    script: CHARM_FLASK,
    scriptText: [
      'Every 10s a pool of water wells up near you for 4s.',
      'Step in: heal 8, and every ability you have used this fight is 1.5s closer to ready.',
    ],
  },
  {
    id: CHARM_ANKLET, name: 'Quicksand Anklet', emoji: '⏳', kind: 'charm', price: 760, isle: ISLE,
    flavor: 'Brass bells strung on a cord. Ammon\'s sinkers wear them so they can be found. You wear it so others can\'t leave.',
    effect: { maxHp: 6 },
    script: CHARM_ANKLET,
    scriptText: [
      'Each hit you land pools sinking sand round your foe (it drains on its own).',
      'Seven quick hits swallow them to the waist: 16 damage, and +25% damage for 2.5s.',
    ],
  },
  {
    id: ART_SIROCCO, name: 'Sirocco\'s Glass Rose', emoji: '🌹', kind: 'artifact', isle: ISLE,
    flavor: 'Lightning fused this out of a dune — petals of sand-glass, still warm. The Prince kept it under his pillow as a boy.',
    effect: { maxHp: 12 },
    script: ART_SIROCCO,
    scriptText: [
      'Every 4th hit calls lightning onto your foe\'s spot after 0.8s: 16 damage if they are still on it.',
      'It leaves a fulgurite for 3s; if the foe comes near, it shatters on them for 9.',
    ],
  },
  {
    id: FISH_SKIPPER, name: 'Sandskipper', emoji: '🐟', kind: 'fish', sell: 12, isle: ISLE,
    flavor: 'A flat little fish that skips across the sand sea like a stone on water. Sweet, if you get the grit out.',
    effect: { speedMult: 1.03 },
  },
  {
    id: FISH_EEL, name: 'Dune Eel', emoji: '🪱', kind: 'fish', sell: 20, isle: ISLE,
    flavor: 'Long, sand-coloured and very annoyed. It swims through dune the way an eel goes through mud.',
    effect: { regenPerSecond: 0.5 },
  },
  {
    id: FISH_RAY, name: 'Scarab Ray', emoji: '🪲', kind: 'fish', sell: 44, isle: ISLE,
    flavor: 'A ray with a back like a beetle\'s wing-case, blue-green as the old city\'s tiles. They say it guards the drowned streets.',
    effect: { shieldCharges: 1 },
  },
];

export const DUNESEA_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_PENNANT]: pennant,
  [CHARM_TOOTH]: tooth,
  [CHARM_FLASK]: flask,
  [CHARM_ANKLET]: anklet,
  [ART_SIROCCO]: glassRose,
};

export const DUNESEA_SHOPS: ShopDef[] = [
  { id: 'dunesea-shop', name: 'Halima\'s Saddlebags', stock: [CHARM_PENNANT, CHARM_TOOTH, CHARM_FLASK, CHARM_ANKLET], buys: true },
];

export const DUNESEA_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Sand Sea', kind: 'sand' }];

export const DUNESEA_FISH: FishDef[] = [
  { id: FISH_SKIPPER, fisheries: [FISHERY], weight: 6, fight: 2, size: [10, 26] },
  { id: FISH_EEL, fisheries: [FISHERY], weight: 4, fight: 3, size: [40, 110] },
  { id: FISH_RAY, fisheries: [FISHERY], weight: 1, fight: 5, size: [30, 72] },
];
