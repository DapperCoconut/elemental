import Phaser from 'phaser';
import type {
  FishDef, FisheryDef, IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory, ShopDef,
} from '../../../../IslesTypes';
import {
  BRASS, BRASS_DARK, BRASS_LIT, COPPER, CSS_BRASS, CSS_LODE, CSS_SKY, CSS_VERD, IRON_LIT, LAMPLIGHT, LODE_GLINT,
  LODE_SHEEN, LODE_WASH, POOL, POOL_LIT, VERD, WHITE,
} from './palette';
import { chainLite, dashedEllipse, dist, lodestone, planet } from './orbitArt';

/**
 * The Orbit Court's goods: four charms from the Brass Almanac, Prince Perigee's Lodestone, and
 * the two catches of the Moonpool. Every charm and the artifact carries a bespoke script.
 *
 * The engine reports all damage the foe takes to `onHitDealt` except a script's or rule's own
 * `ctx.hit`, so no script here needs a re-entrancy guard — but none of them hits from inside that
 * hook anyway.
 */

const live = (f: { active: boolean; hp: number }): boolean => f.active && f.hp > 0;

// ── Pocket Orrery ───────────────────────────────────────────────────────

/**
 * Three brass planets the size of cherries orbit you on wires that are not there. Each one that
 * sweeps through the foe raps them for 4 — so a foe who stands close takes a planet every few
 * moments. Each planet raps once per revolution.
 */
const pocketOrrery: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const R = [46, 60, 74];
  const W = [2.6, 2.0, 1.5];
  const COL = [COPPER, VERD, BRASS];
  const ang = [0, 2.1, 4.2];
  const armed = [true, true, true];
  const raps: { x: number; y: number; at: number }[] = [];
  const pos = (i: number): { x: number; y: number } => ({ x: ctx.player.x + Math.cos(ang[i]) * R[i], y: ctx.player.y - 8 + Math.sin(ang[i]) * R[i] * 0.6 });
  return {
    update(time, dt) {
      const n = ctx.npc;
      for (let i = 0; i < 3; i++) {
        const before = ang[i];
        ang[i] += W[i] * dt;
        // A new revolution re-arms the planet.
        if (Math.floor(ang[i] / (Math.PI * 2)) !== Math.floor(before / (Math.PI * 2))) armed[i] = true;
        const p = pos(i);
        if (armed[i] && live(n) && dist(p.x, p.y, n.x, n.y - 8) < 26) {
          armed[i] = false;
          ctx.hit(n, 4, n.x, n.y);
          raps.push({ x: p.x, y: p.y, at: time });
          ctx.sfx('clang');
        }
      }
      while (raps.length && time - raps[0].at > 400) raps.shift();
    },
    drawGround(g) {
      const p = ctx.player;
      for (let i = 0; i < 3; i++) dashedEllipse(g, p.x, p.y - 8, R[i], R[i] * 0.6, 12, 0, 1, BRASS, 0.18);
    },
    drawAir(g, time) {
      for (let i = 0; i < 3; i++) {
        const p = pos(i);
        planet(g, p.x, p.y, 5 + i, COL[i], i === 2, armed[i] ? 1 : 0.45);
      }
      for (const r of raps) {
        const q = (time - r.at) / 400;
        g.lineStyle(2, BRASS_LIT, 1 - q); g.strokeCircle(r.x, r.y, 6 + q * 16);
      }
    },
  };
};

// ── Tether Link ─────────────────────────────────────────────────────────

/**
 * One of Agnes's forged links on a short length of chain. Strike the foe and the chain hooks on
 * to them. Keep them within 280px for four seconds and it **yanks** taut: 16 damage, and it
 * unhooks. Let them get further than that and it snaps — hook them again with your next hit.
 */
const tetherLink: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const RANGE = 280;
  const HOLD = 4000;
  let hookedAt = 0;
  let snapAt = -99999;
  let yankAt = -99999;
  return {
    onHitDealt() {
      if (!hookedAt && ctx.scene.time.now - yankAt > 600) {
        hookedAt = ctx.scene.time.now;
        ctx.sfx('chain');
      }
    },
    update(time) {
      if (!hookedAt) return;
      const p = ctx.player, n = ctx.npc;
      if (!live(n) || dist(p.x, p.y, n.x, n.y) > RANGE) {
        hookedAt = 0; snapAt = time;
        ctx.float(p.x, p.y - 44, 'SNAP', CSS_SKY);
        ctx.sfx('snap-back');
        return;
      }
      if (time - hookedAt >= HOLD) {
        hookedAt = 0; yankAt = time;
        ctx.hit(n, 16, n.x, n.y);
        ctx.float(n.x, n.y - 46, 'YANK!', CSS_BRASS);
        ctx.sfx('chain');
      }
    },
    drawAir(g, time) {
      const p = ctx.player, n = ctx.npc;
      if (hookedAt) {
        const k = Phaser.Math.Clamp((time - hookedAt) / HOLD, 0, 1);
        const d = dist(p.x, p.y, n.x, n.y);
        // The chain sags less as it tightens, and reddens at its limit.
        chainLite(g, { x: p.x, y: p.y - 6 }, { x: n.x, y: n.y - 6 }, (1 - k) * 34, 0.85, d > RANGE * 0.85 ? 0xb4683e : 0x3b3d47);
        g.lineStyle(2, BRASS_LIT, 0.8);
        g.beginPath(); g.arc(n.x, n.y - 6, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
      }
      const since = time - yankAt;
      if (since < 350) { g.lineStyle(4 * (1 - since / 350), WHITE, 1 - since / 350); g.lineBetween(p.x, p.y - 6, n.x, n.y - 6); }
      const sn = time - snapAt;
      if (sn < 300) { g.fillStyle(IRON_LIT, 1 - sn / 300); g.fillCircle(p.x + 14 + sn / 10, p.y - 10 - sn / 12, 3); }
    },
  };
};

// ── Perihelion Almanac ──────────────────────────────────────────────────

/**
 * A pocket almanac that keeps your orbit. Each time you swing from far (beyond 380px of the foe)
 * to close (inside 170px) within 2.5 seconds — a perihelion pass — your hits land 40% harder and
 * you run 15% faster for 2.5 seconds. Swing out, and in again.
 */
const perihelionAlmanac: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const FAR = 380, NEAR = 170, WINDOW = 2500, BOOST = 2500;
  let farAt = -99999;
  let passAt = -99999;
  let wasNear = false;
  return {
    update(time) {
      const p = ctx.player, n = ctx.npc;
      if (!live(n)) return;
      const d = dist(p.x, p.y, n.x, n.y);
      if (d > FAR) farAt = time;
      const near = d < NEAR;
      if (near && !wasNear && time - farAt < WINDOW && time - passAt > BOOST) {
        passAt = time;
        ctx.boostDamage(1.4, BOOST);
        ctx.boostSpeed(1.15, BOOST);
        ctx.float(p.x, p.y - 48, 'PERIHELION', CSS_BRASS);
        ctx.sfx('whoosh');
      }
      wasNear = near;
    },
    drawGround(g, time) {
      const p = ctx.player, n = ctx.npc;
      // While the window is open: a faint bead running the line between you, the "pass" to make.
      const open = time - farAt < WINDOW;
      if (open && live(n)) {
        const k = (time - farAt) / WINDOW;
        g.lineStyle(1.5, BRASS, 0.35 * (1 - k)); g.strokeCircle(n.x, n.y + 10, NEAR);
      }
      const since = time - passAt;
      if (since < BOOST) {
        g.lineStyle(2, LAMPLIGHT, 0.6 * (1 - since / BOOST));
        g.strokeEllipse(p.x, p.y + 16, 40, 12);
      }
    },
    drawAir(g, time) {
      // The almanac at your hip, its page fluttering open during a pass.
      const p = ctx.player;
      const x = p.x - 20, y = p.y + 4;
      const open = time - passAt < BOOST;
      g.fillStyle(0x2b3b6a, 1); g.fillRect(x - 6, y - 7, 12, 14);
      g.fillStyle(BRASS, 1); g.fillRect(x - 6, y - 7, 2, 14);
      if (open) { g.fillStyle(0xece0c4, 1); g.fillTriangle(x + 6, y - 7, x + 13, y - 11 + Math.sin(time / 60) * 3, x + 6, y + 5); }
    },
  };
};

// ── Moonpool Phial ──────────────────────────────────────────────────────

/**
 * A stoppered phial of Moonpool water that will not stay at the bottom of the glass. Every hit
 * you take knocks a droplet loose to orbit you (up to six). Every seven seconds — or after three
 * seconds without being hit — the droplets fall back in, healing 3 each.
 */
const moonpoolPhial: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  let drops = 0;
  let calmSince = ctx.scene.time.now;
  let fallAt = ctx.scene.time.now + 7000;
  let fellAt = -99999;
  let fellN = 0;
  return {
    onHitTaken() {
      calmSince = ctx.scene.time.now;
      if (drops < 6) drops++;
    },
    update(time) {
      const calm = time - calmSince > 3000 && drops >= 2;
      if (drops > 0 && (time >= fallAt || calm)) {
        const heal = drops * 3;
        ctx.heal(ctx.player, heal);
        ctx.float(ctx.player.x, ctx.player.y - 48, `+${heal}`, CSS_VERD);
        ctx.sfx('bubble');
        fellAt = time; fellN = drops;
        drops = 0;
        fallAt = time + 7000;
      } else if (time >= fallAt) fallAt = time + 7000;
    },
    drawAir(g, time) {
      const p = ctx.player;
      for (let i = 0; i < drops; i++) {
        const a = time / 600 + (i / Math.max(1, drops)) * Math.PI * 2;
        const x = p.x + Math.cos(a) * 30, y = p.y - 16 + Math.sin(a) * 12;
        g.fillStyle(POOL, 0.85); g.fillCircle(x, y, 4);
        g.fillStyle(POOL_LIT, 0.9); g.fillCircle(x - 1.2, y - 1.2, 1.5);
      }
      const since = time - fellAt;
      if (since < 400) {
        for (let i = 0; i < fellN; i++) {
          const a = (i / fellN) * Math.PI * 2;
          const r = 30 * (1 - since / 400);
          g.fillStyle(POOL, 1 - since / 400); g.fillCircle(p.x + Math.cos(a) * r, p.y - 16 + Math.sin(a) * r * 0.4, 3);
        }
      }
    },
  };
};

// ── Perigee's Lodestone (artifact) ──────────────────────────────────────

/**
 * The Prince's own moon, shrunk to a fist and still heavier than it looks. It orbits you on a
 * long, slow ellipse aimed at the foe; every eight seconds it swings in to its closest approach
 * and strikes them for 18 if they are within 300px. Every third strike locks them in its tide:
 * your hits land 25% harder for three seconds.
 */
const perigeeStone: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const PERIOD = 8000;
  const t0 = ctx.scene.time.now;
  let strikes = 0;
  let struckAt = -99999;
  let lockAt = -99999;
  let lastPhase = 0;
  const posAt = (time: number): { x: number; y: number; k: number } => {
    const p = ctx.player, n = ctx.npc;
    const a = Math.atan2(n.y - p.y, n.x - p.x);
    const ph = ((time - t0) % PERIOD) / PERIOD;
    // A long ellipse whose far end reaches toward the foe; the stone is fast there.
    const E = ph * Math.PI * 2;
    const reach = Math.min(300, Math.max(80, dist(p.x, p.y, n.x, n.y)));
    const ex = (Math.cos(E + Math.PI) + 1) / 2 * reach, ey = Math.sin(E) * 26;
    return { x: p.x + Math.cos(a) * ex - Math.sin(a) * ey, y: p.y - 10 + Math.sin(a) * ex + Math.cos(a) * ey, k: ph };
  };
  return {
    update(time) {
      const ph = ((time - t0) % PERIOD) / PERIOD;
      // Closest approach to the foe is half-way round.
      if (lastPhase < 0.5 && ph >= 0.5) {
        const p = ctx.player, n = ctx.npc;
        if (live(n) && dist(p.x, p.y, n.x, n.y) < 300) {
          strikes++;
          struckAt = time;
          ctx.hit(n, 18, n.x, n.y);
          ctx.sfx('gravity-slam');
          if (strikes % 3 === 0) {
            lockAt = time;
            ctx.boostDamage(1.25, 3000);
            ctx.float(n.x, n.y - 50, 'TIDALLY LOCKED', CSS_LODE);
          }
        }
      }
      lastPhase = ph;
    },
    drawGround(g, time) {
      const n = ctx.npc;
      if (time - lockAt < 3000) { g.lineStyle(2, LODE_GLINT, 0.6); g.strokeCircle(n.x, n.y + 10, 30 + Math.sin(time / 90) * 3); }
    },
    drawAir(g, time) {
      const s = posAt(time);
      g.fillStyle(LODE_SHEEN, 0.2); g.fillCircle(s.x, s.y, 16);
      lodestone(g, s.x, s.y, 9, time / 1000, 1);
      const since = time - struckAt;
      if (since < 450) {
        const n = ctx.npc;
        g.lineStyle(5 * (1 - since / 450), LODE_WASH, 1 - since / 450); g.strokeCircle(n.x, n.y - 6, 18 + since / 10);
      }
      // Three pips toward the next lock.
      const n = ctx.npc;
      for (let i = 0; i < 3; i++) {
        g.fillStyle(i < strikes % 3 ? LODE_GLINT : BRASS_DARK, 0.85);
        g.fillCircle(n.x - 8 + i * 8, n.y - 56, 2.4);
      }
    },
  };
};

// ── Items ───────────────────────────────────────────────────────────────

export const ORBIT_ITEMS: IsleItemDef[] = [
  {
    id: 'orbit-pocket-orrery', name: 'Pocket Orrery', emoji: '🪐', kind: 'charm', price: 260, sell: 85, isle: 'air',
    flavor: 'Three planets the size of cherries on wires that are not there. Tycho\'s apprentices make them on slow nights.',
    script: 'orbit-pocket-orrery',
    scriptText: [
      'Three brass planets orbit you at three speeds.',
      'Each that sweeps through the foe raps them for 4 (once per revolution).',
    ],
  },
  {
    id: 'orbit-tether-link', name: 'Tether Link', emoji: '⛓️', kind: 'charm', price: 420, sell: 135, isle: 'air',
    flavor: 'A link of Agnes\'s best iron on a yard of chain. She says it will hold anything. She has never been wrong.',
    script: 'orbit-tether-link',
    effect: { maxHp: 6 },
    scriptText: [
      'Hitting the foe hooks a chain to them.',
      'Keep them within 280px for 4s: it yanks for 16. Further, and it snaps.',
    ],
  },
  {
    id: 'orbit-perihelion-almanac', name: 'Perihelion Almanac', emoji: '📖', kind: 'charm', price: 580, sell: 185, isle: 'air',
    flavor: 'A pocket almanac with one table in it, and the table is you. Ottoline will not explain how she printed it.',
    script: 'orbit-perihelion-almanac',
    scriptText: [
      'Swing from beyond 380px to inside 170px of the foe within 2.5s:',
      'your hits land 40% harder and you run 15% faster for 2.5s.',
    ],
  },
  {
    id: 'orbit-moonpool-phial', name: 'Moonpool Phial', emoji: '🧪', kind: 'charm', price: 780, sell: 250, isle: 'air',
    flavor: 'Water from the floating pool, corked in glass. It climbs the sides. Hobb says it is homesick for the moon.',
    script: 'orbit-moonpool-phial',
    effect: { maxHp: 8 },
    scriptText: [
      'Each hit you take knocks a droplet loose to orbit you (max 6).',
      'Every 7s, or after 3s unhit, they fall back in: 3 healing each.',
    ],
  },
  {
    id: 'art-perigee', name: 'Perigee\'s Lodestone', emoji: '🌑', kind: 'artifact', isle: 'air',
    flavor: 'The Prince\'s own moon, shrunk to a fist. It is heavier than a house and lighter than a thought, depending.',
    script: 'art-perigee',
    effect: { maxHp: 15 },
    scriptText: [
      'A lodestone orbits you, swinging close to the foe every 8s: 18 damage within 300px.',
      'Every 3rd strike tidally locks them: your hits land 25% harder for 3s.',
    ],
  },
  {
    id: 'fish-orbit-goby', name: 'Orbit Goby', emoji: '🐟', kind: 'fish', sell: 32, isle: 'air',
    flavor: 'A round little fish that swims round the outside of the Moonpool forever, the long way. Tastes of tin and rain.',
    effect: { regenPerSecond: 0.35 },
  },
  {
    id: 'fish-tidal-moonfish', name: 'Tidal Moonfish', emoji: '🐠', kind: 'fish', sell: 92, isle: 'air',
    flavor: 'Silver as a spoon, and its nose always points at the nearest moon. Eat it and you never quite lose your footing.',
    effect: { dodgeChance: 0.05, speedMult: 1.04 },
  },
];

export const ORBIT_SCRIPTS: Record<string, ItemScriptFactory> = {
  'orbit-pocket-orrery': pocketOrrery,
  'orbit-tether-link': tetherLink,
  'orbit-perihelion-almanac': perihelionAlmanac,
  'orbit-moonpool-phial': moonpoolPhial,
  'art-perigee': perigeeStone,
};

export const ORBIT_SHOPS: ShopDef[] = [
  {
    id: 'orbit-shop',
    name: 'The Brass Almanac',
    stock: ['orbit-pocket-orrery', 'orbit-tether-link', 'orbit-perihelion-almanac', 'orbit-moonpool-phial'],
    buys: true,
  },
];

export const ORBIT_FISHERIES: FisheryDef[] = [
  { id: 'orbit-moonpool', name: 'The Moonpool', kind: 'pond' },
];

export const ORBIT_FISH: FishDef[] = [
  { id: 'fish-orbit-goby', fisheries: ['orbit-moonpool'], weight: 7, fight: 2, size: [8, 22] },
  { id: 'fish-tidal-moonfish', fisheries: ['orbit-moonpool'], weight: 2.4, fight: 4, size: [24, 60] },
];
