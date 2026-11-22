import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { Husk } from '../../../../../invasion/Husk';
import { dim, glow, mulberry } from '../../../../art/IsleArt';
import { core, hazardStripe, trefoil } from './art';
import {
  AMBER, AMBER_LIT, CHEREN, CHEREN_DEEP, CHEREN_DIM, CHEREN_LIT, CONCRETE, CONCRETE_DARK, COPPER, COPPER_DARK,
  COPPER_LIT, GLOW, GLOW_DEEP, GLOW_DIM, GLOW_LIT, HAZARD_BLACK, IRON_DARK, IRON_LIT, ISOTOPE, ISOTOPE_CORE,
  ISOTOPE_DARK, ISOTOPE_LIT, LEAD, LEAD_DARK, LEAD_DEEP, LEAD_LIT, SLAG, SLAG_DARK, SLAG_LIT,
} from './palette';
import { clamp, dist, wrapAngle } from './util';

/**
 * Prince Isotope, the Unstable — Empress Ohmrine's son, governor of the Halflife Court.
 *
 * Isotope has glowed since he was six, when his mother had him lowered into the reactor's core
 * "to be charged" for the Endless Current. Since then everything he touches burns a little, and
 * he has never been held without someone wincing; he lives in lead, in his dome, and lends lead to
 * the households that please him because lead is the only thing that has ever kept anyone safe
 * from him. He is frightened of ending — of being spent — and talks in halves. He fights the way a
 * thing decays:
 *
 * • **Fallout** (orbiting): lobs canisters that crack into hot puddles where they land, and vents
 *   a mushroom plume that drifts over you raining hot specks.
 * • **Meltdown** (anchored, the hot tint): his core goes critical — a swelling ring of heat with
 *   three cooling channels turning through it, and a ceiling of slag coming down cell by cell; and
 *   *decay chains*, orbs that split in half and in half again, each half half as strong.
 * • **Half-Life** (hard, blinking, the sick tint): he splits — two half-Isotopes step off him,
 *   and when one falls it halves again into two quarters.
 */

const TOP = 96;

// ── Signature: Fallout canisters ─────────────────────────────────────
// Three lead canisters lobbed in high arcs: one at you, two either side. Each landing spot is
// ringed and ticked down on the floor. They crack on landing and leave a hot puddle.

interface Can { fx: number; fy: number; tx: number; ty: number; at: number; landAt: number; landed: boolean }

const canisters = (tk: BossToolkit): SignatureMove => {
  let cans: Can[] = [];
  return {
    durationMs: 1700,
    windupMs: 520,
    gesture: 'raise',
    tell: 'FALLOUT',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 4 : 3;
      const a = tk.angleToPlayer() + Math.PI / 2;
      cans = [];
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 120;
        const tx = tk.clampX(p.x + Math.cos(a) * off, 60), ty = tk.clampY(p.y + Math.sin(a) * off, 60);
        cans.push({ fx: tk.bossX, fy: tk.bossY - 30, tx, ty, at: time, landAt: time + tk.warn(950) + i * 170, landed: false });
      }
      tk.sfx('grenade-throw');
    },
    update(time) {
      for (const c of cans) {
        if (c.landed || time < c.landAt) continue;
        c.landed = true;
        tk.explode(c.tx, c.ty, 52, 12, ISOTOPE);
        tk.spawnPool({ x: c.tx, y: c.ty, radius: 64, lifeMs: 4200, damage: 4, tickMs: 500 });
        tk.sfx('explosion-small');
      }
      cans = cans.filter((c) => !c.landed || time < c.landAt + 300);
    },
    drawGround(g, time) {
      for (const c of cans) {
        if (c.landed) continue;
        const k = clamp((time - c.at) / Math.max(1, c.landAt - c.at), 0, 1);
        g.fillStyle(GLOW_DEEP, 0.2 + k * 0.2); g.fillCircle(c.tx, c.ty, 52);
        g.lineStyle(2, GLOW, 0.4 + k * 0.5); g.strokeCircle(c.tx, c.ty, 52);
        g.lineStyle(4, AMBER, 0.8); g.beginPath(); g.arc(c.tx, c.ty, 58, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        trefoil(g, c.tx, c.ty, 14, AMBER, undefined, 0.3 + k * 0.4);
        g.fillStyle(0x000000, 0.2 + k * 0.3); g.fillEllipse(c.tx, c.ty, 16 + k * 18, 6 + k * 6);
      }
    },
    drawAir(g, time) {
      for (const c of cans) {
        if (c.landed) continue;
        const k = clamp((time - c.at) / Math.max(1, c.landAt - c.at), 0, 1);
        const x = c.fx + (c.tx - c.fx) * k, y = c.fy + (c.ty - c.fy) * k - Math.sin(k * Math.PI) * 220;
        // A fizzing green trail behind it.
        for (let i = 1; i < 5; i++) {
          const kk = Math.max(0, k - i * 0.04);
          const px = c.fx + (c.tx - c.fx) * kk, py = c.fy + (c.ty - c.fy) * kk - Math.sin(kk * Math.PI) * 220;
          g.fillStyle(GLOW, 0.35 - i * 0.07); g.fillCircle(px, py, 6 - i);
        }
        // The canister, tumbling: a banded lead drum, a trefoil, a glowing seal.
        const spin = time / 120;
        const w = 12 + Math.abs(Math.cos(spin)) * 6, h = 20;
        g.fillStyle(LEAD_DARK, 1); g.fillRoundedRect(x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2, 3);
        g.fillStyle(LEAD, 1); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 3);
        g.fillStyle(AMBER, 1); g.fillRect(x - w / 2, y - 2, w, 4);
        g.fillStyle(GLOW, 0.9); g.fillCircle(x, y - h / 2, 2.5);
      }
    },
    onPhaseEnd() { cans = []; },
  };
};

// ── Signature: Fallout Plume ─────────────────────────────────────────
// He vents his core straight up: a mushroom of green-grey cloud climbs off him and drifts across
// the room toward you, raining hot specks under it as it goes (each speck ringed before it lands).

interface Plume { sx: number; sy: number; tx: number; ty: number; at: number; until: number; nextSpeck: number }

const plume = (tk: BossToolkit): SignatureMove => {
  let p: Plume | null = null;
  const TRAVEL = 3400;
  const pos = (pl: Plume, time: number) => {
    const k = clamp((time - pl.at - 500) / TRAVEL, 0, 1);
    return { x: pl.sx + (pl.tx - pl.sx) * k, y: pl.sy + (pl.ty - pl.sy) * k, k };
  };
  return {
    durationMs: 1300,
    windupMs: 600,
    gesture: 'raise',
    tell: 'FALLOUT PLUME',
    cast(time) {
      const pl = tk.player;
      // Aim past you, so it crosses you and keeps going.
      const a = tk.angleToPlayer();
      p = {
        sx: tk.bossX, sy: tk.bossY - 60,
        tx: tk.clampX(pl.x + Math.cos(a) * 160, 60), ty: tk.clampY(pl.y + Math.sin(a) * 160 - 40, 60),
        at: time, until: time + 500 + TRAVEL, nextSpeck: time + 600,
      };
      tk.sfx('geyser');
    },
    update(time) {
      if (!p) return;
      if (time > p.until + 400) { p = null; return; }
      if (time >= p.nextSpeck && time < p.until) {
        p.nextSpeck = time + (tk.hard ? 190 : 240);
        const c = pos(p, time);
        const a = Math.random() * Math.PI * 2, d = Math.random() * 84;
        tk.spawnZone({ x: tk.clampX(c.x + Math.cos(a) * d, 40), y: tk.clampY(c.y + 50 + Math.sin(a) * d * 0.6, 40), radius: 28, warnMs: 650, damage: 7 });
      }
    },
    drawGround(g, time) {
      if (!p) return;
      const c = pos(p, time);
      g.fillStyle(0x000000, 0.18); g.fillEllipse(c.x, c.y + 60, 200, 70);
    },
    drawAir(g, time) {
      if (!p) return;
      const c = pos(p, time);
      const rise = clamp((time - p.at) / 500, 0, 1);
      const fade = time > p.until ? clamp(1 - (time - p.until) / 400, 0, 1) : 1;
      // The stem, while it climbs off him.
      if (c.k < 0.25) {
        const a = 1 - c.k * 4;
        g.fillStyle(0x6a7a6a, 0.4 * a); g.fillRect(p.sx - 14, p.sy - 120 * rise, 28, 120 * rise);
        g.fillStyle(GLOW, 0.2 * a); g.fillRect(p.sx - 6, p.sy - 120 * rise, 12, 120 * rise);
      }
      // The cap: rolled cloud, its underside lit green.
      const R = 60 + rise * 30;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + time / 1500;
        const px = c.x + Math.cos(a) * R * 0.7, py = c.y - 70 * rise + Math.sin(a) * R * 0.32;
        g.fillStyle(i % 2 ? 0x5a665a : 0x707c70, 0.55 * fade); g.fillCircle(px, py, R * 0.45);
      }
      g.fillStyle(GLOW, 0.22 * fade); g.fillEllipse(c.x, c.y - 70 * rise + R * 0.3, R * 1.8, R * 0.4);
      g.fillStyle(0x848f84, 0.5 * fade); g.fillCircle(c.x, c.y - 70 * rise - R * 0.2, R * 0.5);
      // The rain falling from it.
      for (let i = 0; i < 10; i++) {
        const ph = ((time / 400) + i / 10) % 1;
        g.fillStyle(GLOW_LIT, 0.6 * fade * (1 - ph)); g.fillCircle(c.x - 70 + ((i * 37) % 140), c.y - 50 + ph * 100, 1.6);
      }
    },
    onPhaseEnd() { p = null; },
  };
};

// ── Signature: Heat Ring ─────────────────────────────────────────────
// His core goes critical. A ring of heat swells out of him across the whole room; three cooling
// channels (blue wedges, shown before it starts) turn slowly through it. Thread a channel, or
// outrun the ring to the wall and take your chances.

interface Ring { cx: number; cy: number; startAt: number; gapA: number; lastHit: number; dieAt: number }

const heatRing = (tk: BossToolkit): SignatureMove => {
  let r: Ring | null = null;
  const SPEED = 115, BAND = 24, GAP = 0.34, RMAX = 600;
  const radius = (time: number) => (r ? Math.max(0, (time - r.startAt) / 1000) * SPEED + 30 : 0);
  const gaps = (time: number) => {
    if (!r) return [] as number[];
    const base = r.gapA + Math.max(0, time - r.startAt) / 1000 * 0.32;
    return [0, 1, 2].map((k) => base + (k / 3) * Math.PI * 2);
  };
  return {
    durationMs: 2200,
    windupMs: 750,
    gesture: 'flex',
    hold: 'brace',
    locksBody: true,
    tell: 'MELTDOWN',
    cast(time) {
      const startAt = time + tk.warn(800);
      r = { cx: tk.bossX, cy: tk.bossY, startAt, gapA: tk.angleToPlayer() + Math.PI / 3, lastHit: 0, dieAt: startAt + (RMAX / SPEED) * 1000 };
      tk.sfx('beam-charge');
    },
    update(time) {
      if (!r) return;
      if (time > r.dieAt) { r = null; return; }
      if (time < r.startAt) return;
      const p = tk.player;
      const R = radius(time);
      const d = dist(p.x, p.y, r.cx, r.cy);
      if (Math.abs(d - R) < BAND + 12 && time - r.lastHit > 700) {
        const a = Math.atan2(p.y - r.cy, p.x - r.cx);
        if (!gaps(time).some((gA) => Math.abs(wrapAngle(a - gA)) < GAP)) {
          r.lastHit = time;
          tk.hitPlayer(13, p.x, p.y);
          tk.sfx('sizzle');
        }
      }
    },
    drawGround(g, time) {
      if (!r) return;
      const gs = gaps(time);
      const R = radius(time);
      // The cooling channels, from the centre out — shown from the moment he braces.
      for (const gA of gs) {
        const L = time < r.startAt ? 120 + clamp(1 - (r.startAt - time) / 800, 0, 1) * 500 : 700;
        g.fillStyle(CHEREN, 0.12);
        g.fillTriangle(r.cx, r.cy, r.cx + Math.cos(gA - GAP) * L, r.cy + Math.sin(gA - GAP) * L, r.cx + Math.cos(gA + GAP) * L, r.cy + Math.sin(gA + GAP) * L);
        g.lineStyle(1.5, CHEREN_LIT, 0.4);
        g.lineBetween(r.cx, r.cy, r.cx + Math.cos(gA - GAP) * L, r.cy + Math.sin(gA - GAP) * L);
        g.lineBetween(r.cx, r.cy, r.cx + Math.cos(gA + GAP) * L, r.cy + Math.sin(gA + GAP) * L);
      }
      if (time < r.startAt) return;
      // The ring: a band of white-orange heat, broken at the channels.
      const steps = 60;
      for (let i = 0; i < steps; i++) {
        const a0 = (i / steps) * Math.PI * 2, a1 = ((i + 1) / steps) * Math.PI * 2;
        const mid = (a0 + a1) / 2;
        if (gs.some((gA) => Math.abs(wrapAngle(mid - gA)) < GAP)) continue;
        g.lineStyle(BAND * 2, SLAG, 0.35); g.beginPath(); g.arc(r.cx, r.cy, R, a0, a1, false); g.strokePath();
        g.lineStyle(BAND, SLAG_LIT, 0.55); g.beginPath(); g.arc(r.cx, r.cy, R, a0, a1, false); g.strokePath();
        g.lineStyle(3, 0xffffff, 0.6); g.beginPath(); g.arc(r.cx, r.cy, R, a0, a1, false); g.strokePath();
      }
      // Heat shimmer inside it.
      g.lineStyle(1, SLAG_LIT, 0.15); g.strokeCircle(r.cx, r.cy, R * 0.8); g.strokeCircle(r.cx, r.cy, R * 0.6);
    },
    onPhaseEnd() { r = null; },
  };
};

// ── Signature: Slag Fall ─────────────────────────────────────────────
// The hall is split into twelve cells. The ceiling cracks over half of them (crazed lines, drips
// of glowing slag), then comes down; three waves, alternating, the last at random but always
// leaving two cells clear. Where it falls it lies molten for a moment.

interface Cell { c: number; r: number; warnAt: number; fallAt: number; fell: boolean; poolUntil: number; lastTick: number }

const slagFall = (tk: BossToolkit): SignatureMove => {
  let cells: Cell[] = [];
  const COLS = 4, ROWS = 3;
  const cw = () => tk.W / COLS, ch = () => (tk.H - TOP) / ROWS;
  const inCell = (cl: Cell, x: number, y: number) => {
    const x0 = cl.c * cw(), y0 = TOP + cl.r * ch();
    return x >= x0 && x < x0 + cw() && y >= y0 && y < y0 + ch();
  };
  return {
    durationMs: 2600,
    windupMs: 700,
    gesture: 'slam',
    tell: 'SLAG FALL',
    cast(time) {
      cells = [];
      const flip = Math.random() < 0.5 ? 0 : 1;
      for (let w = 0; w < 3; w++) {
        const warnAt = time + w * 1050;
        const fallAt = warnAt + tk.warn(1150);
        const pick: [number, number][] = [];
        if (w < 2) {
          for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if ((c + r + w + flip) % 2 === 0) pick.push([c, r]);
        } else {
          const all: [number, number][] = [];
          for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) all.push([c, r]);
          all.sort(() => Math.random() - 0.5);
          pick.push(...all.slice(0, tk.hard ? 8 : 6));
        }
        for (const [c, r] of pick) cells.push({ c, r, warnAt, fallAt, fell: false, poolUntil: 0, lastTick: 0 });
      }
      tk.sfx('quake');
    },
    update(time) {
      const p = tk.player;
      for (const cl of cells) {
        if (!cl.fell && time >= cl.fallAt) {
          cl.fell = true;
          cl.poolUntil = time + 1600;
          if (inCell(cl, p.x, p.y)) tk.hitPlayer(14, p.x, p.y);
          tk.sfx('stone-slam');
        }
        if (cl.fell && time < cl.poolUntil && time - cl.lastTick > 500 && inCell(cl, p.x, p.y)) {
          cl.lastTick = time;
          tk.hitPlayer(4, p.x, p.y);
          tk.slowPlayer(0.75, 500);
        }
      }
      cells = cells.filter((cl) => !cl.fell || time < cl.poolUntil);
    },
    drawGround(g, time) {
      for (const cl of cells) {
        if (time < cl.warnAt) continue;
        const x0 = cl.c * cw(), y0 = TOP + cl.r * ch(), w = cw(), h = ch();
        if (cl.fell) {
          const k = clamp((cl.poolUntil - time) / 1600, 0, 1);
          g.fillStyle(SLAG_DARK, 0.6 * k); g.fillRect(x0 + 2, y0 + 2, w - 4, h - 4);
          g.fillStyle(SLAG, 0.4 * k); g.fillRect(x0 + 10, y0 + 10, w - 20, h - 20);
          for (let i = 0; i < 6; i++) { g.fillStyle(SLAG_LIT, 0.5 * k); g.fillEllipse(x0 + w * ((i * 37) % 100) / 100, y0 + h * ((i * 61) % 100) / 100, 20, 8); }
          continue;
        }
        const k = clamp((time - cl.warnAt) / Math.max(1, cl.fallAt - cl.warnAt), 0, 1);
        g.fillStyle(0x000000, 0.1 + k * 0.3); g.fillRect(x0 + 4, y0 + 4, w - 8, h - 8);
        g.lineStyle(2, SLAG, 0.3 + k * 0.6); g.strokeRect(x0 + 4, y0 + 4, w - 8, h - 8);
        // Crazing, spreading from the cell's centre.
        const cx = x0 + w / 2, cy = y0 + h / 2;
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9 + cl.c, L = (30 + (i * 23) % 50) * k * 1.6;
          g.lineStyle(1.5, SLAG_LIT, 0.4 + k * 0.4);
          g.lineBetween(cx, cy, cx + Math.cos(a) * L, cy + Math.sin(a) * L * 0.7);
        }
      }
    },
    drawAir(g, time) {
      for (const cl of cells) {
        if (cl.fell || time < cl.warnAt) continue;
        const x0 = cl.c * cw(), y0 = TOP + cl.r * ch(), w = cw(), h = ch();
        const k = clamp((time - cl.warnAt) / Math.max(1, cl.fallAt - cl.warnAt), 0, 1);
        // Drips of glowing slag pattering down into the cell.
        for (let i = 0; i < 5; i++) {
          const ph = ((time / 380) + i / 5 + cl.r * 0.3) % 1;
          g.fillStyle(SLAG_LIT, 0.4 + k * 0.5); g.fillCircle(x0 + w * (0.15 + i * 0.17), y0 + h * 0.1 + ph * h * 0.8, 2 + k);
        }
        if (k > 0.85) { g.fillStyle(SLAG, 0.25); g.fillRect(x0, y0 - 40 * (1 - k) * 6, w, h * 0.2); }
      }
    },
    onPhaseEnd() { cells = []; },
  };
};

// ── Signature: Decay Chain ───────────────────────────────────────────
// A volley of glowing orbs. Each one, a beat after leaving him, splits in two — two halves,
// half as strong — and then in two again, and again: a fan of ever smaller, ever weaker sparks.

interface Orb { x: number; y: number; vx: number; vy: number; gen: number; r: number; dmg: number; splitAt: number; bornAt: number }

const decayChain = (tk: BossToolkit): SignatureMove => {
  let orbs: Orb[] = [];
  return {
    durationMs: 1300,
    windupMs: 480,
    gesture: 'punch',
    hold: 'charge',
    tell: 'DECAY CHAIN',
    cast(time) {
      const n = tk.hard ? 4 : 3;
      const a0 = tk.angleToPlayer();
      for (let i = 0; i < n; i++) {
        const a = a0 + (i - (n - 1) / 2) * 0.32;
        orbs.push({ x: tk.bossX, y: tk.bossY, vx: Math.cos(a) * 165, vy: Math.sin(a) * 165, gen: 0, r: 15, dmg: 16, splitAt: time + 700, bornAt: time });
      }
      tk.sfx('plasma-arc');
    },
    update(time, dt) {
      const p = tk.player;
      const next: Orb[] = [];
      let split = false;
      for (const o of orbs) {
        o.x += o.vx * dt; o.y += o.vy * dt;
        if (o.x < -20 || o.x > tk.W + 20 || o.y < TOP - 20 || o.y > tk.H + 20 || time - o.bornAt > 6000) continue;
        if (p.active && p.hp > 0 && dist(p.x, p.y, o.x, o.y) < 20 + o.r) { tk.hitPlayer(o.dmg, o.x, o.y); continue; }
        if (o.gen < 3 && time >= o.splitAt) {
          const a = Math.atan2(o.vy, o.vx), sp = Math.hypot(o.vx, o.vy) * 1.08;
          for (const k of [-1, 1]) {
            const b = a + k * 0.36;
            next.push({ x: o.x, y: o.y, vx: Math.cos(b) * sp, vy: Math.sin(b) * sp, gen: o.gen + 1, r: o.r * 0.7, dmg: Math.max(2, Math.round(o.dmg / 2)), splitAt: time + 620, bornAt: o.bornAt });
          }
          split = true;
          continue;
        }
        next.push(o);
      }
      if (split) tk.sfx('glitch');
      orbs = next.slice(0, 64);
    },
    drawAir(g, time) {
      for (const o of orbs) {
        // Each orb drawn as two halves round a seam: it is about to come apart.
        const a = Math.atan2(o.vy, o.vx) + Math.PI / 2;
        const strain = clamp(1 - (o.splitAt - time) / 620, 0, 1) * (o.gen < 3 ? 1 : 0);
        const gap = strain * o.r * 0.25;
        const c = o.gen === 0 ? ISOTOPE_CORE : o.gen === 1 ? GLOW_LIT : o.gen === 2 ? GLOW : GLOW_DIM;
        g.fillStyle(c, 0.25); g.fillCircle(o.x, o.y, o.r * 1.6);
        for (const k of [-1, 1]) {
          g.fillStyle(c, 0.95);
          g.slice(o.x + Math.cos(a) * gap * k, o.y + Math.sin(a) * gap * k, o.r, a + (k > 0 ? -Math.PI / 2 : Math.PI / 2), a + (k > 0 ? Math.PI / 2 : Math.PI * 1.5), false);
          g.fillPath();
        }
        if (strain > 0.4) { g.lineStyle(1.5, 0xffffff, strain); g.lineBetween(o.x - Math.cos(a + Math.PI / 2) * o.r, o.y - Math.sin(a + Math.PI / 2) * o.r, o.x + Math.cos(a + Math.PI / 2) * o.r, o.y + Math.sin(a + Math.PI / 2) * o.r); }
      }
    },
    onPhaseEnd() { orbs = []; },
  };
};

// ── Signature: Half-Life (the split) ─────────────────────────────────
// He comes apart down his seam and two half-Isotopes step off him, each with half a core. Strike
// one down and it halves again: two quarter-Isotopes, quick and weak, scuttle out of it.

interface Part { husk: Husk; gen: number }

const halving = (tk: BossToolkit): SignatureMove => {
  let parts: Part[] = [];
  let splitFx: { x: number; y: number; at: number }[] = [];
  const spawn = (x: number, y: number, gen: number) => {
    const husk = gen === 1
      ? tk.spawnAdd({ x, y, hp: 46, speed: 70, damage: 8, ranged: true, maxAlive: 6 })
      : tk.spawnAdd({ x, y, hp: 20, speed: 104, damage: 5, ranged: false, maxAlive: 6 });
    if (!husk) return;
    parts.push({ husk, gen });
    splitFx.push({ x, y, at: tk.now });
    if (gen === 1) {
      husk.once('defeated', () => {
        const hx = husk.x, hy = husk.y;
        spawn(hx - 30, hy, 2);
        spawn(hx + 30, hy, 2);
        tk.sfx('glitch');
      });
    }
  };
  return {
    durationMs: 1300,
    windupMs: 800,
    gesture: 'flex',
    hold: 'brace',
    tell: 'HALF-LIFE',
    cast() {
      const a = tk.angleToPlayer() + Math.PI / 2;
      for (const k of [-1, 1]) spawn(tk.clampX(tk.bossX + Math.cos(a) * 90 * k, 70), tk.clampY(tk.bossY + Math.sin(a) * 90 * k, 70), 1);
      tk.sfx('teleport');
    },
    update(time) {
      parts = parts.filter((p) => p.husk.active && p.husk.hp > 0);
      splitFx = splitFx.filter((f) => time - f.at < 600);
    },
    drawAir(g, time) {
      for (const p of parts) {
        const h = p.husk;
        if (!h.active) continue;
        // A half (or a quarter) of his core, burning on the thrall: a lit sector and the seam.
        const r = p.gen === 1 ? 14 : 9;
        const a = time / 600 + (p.gen === 1 ? 0 : Math.PI);
        g.fillStyle(GLOW, 0.18); g.fillCircle(h.x, h.y - 6, r * 2.2);
        g.fillStyle(GLOW_LIT, 0.9);
        g.slice(h.x, h.y - 6, r, a, a + (p.gen === 1 ? Math.PI : Math.PI / 2), false); g.fillPath();
        g.lineStyle(1.5, LEAD_LIT, 0.9); g.strokeCircle(h.x, h.y - 6, r);
        g.lineStyle(1.5, 0xffffff, 0.7); g.lineBetween(h.x + Math.cos(a) * r, h.y - 6 + Math.sin(a) * r, h.x - Math.cos(a) * r, h.y - 6 - Math.sin(a) * r);
      }
      for (const f of splitFx) {
        const k = (time - f.at) / 600;
        g.lineStyle(3 * (1 - k), GLOW_LIT, 1 - k); g.strokeCircle(f.x, f.y, 12 + k * 40);
        g.lineStyle(2 * (1 - k), 0xffffff, 1 - k); g.lineBetween(f.x, f.y - 30 * (1 + k), f.x, f.y + 30 * (1 + k));
      }
    },
    onPhaseEnd() { parts = []; splitFx = []; },
  };
};

export const ISOTOPE_BOSS: WorldBossDef = {
  worldId: 'isle:isotope',
  name: 'Prince Isotope',
  title: 'the Unstable',
  color: ISOTOPE,
  colorLit: ISOTOPE_LIT,
  colorDark: ISOTOPE_DARK,
  accent: CHEREN,
  // Tier 3 of the sixth isle.
  damageMult: 1.3,

  intro: [
    'Don\'t come closer. Half that. Half again. There. That is the distance people stand from me.',
    'Mother says a thing that glows is a thing that is spending itself. I am spending myself on you.',
  ],
  banter: [
    'Everything halves. Your Draw doesn\'t. That is the one thing in my court that lasts.',
    'Lead is a kindness. I lend it to people I like. I like very few people. Lead is heavy.',
    'Six years old, and down into the core on a chain. To be charged. I am still charged.',
    'You\'re burning a little. Everyone does, near me. You get used to it. I didn\'t.',
    'Half of me wants you to win. Don\'t tell the other half.',
  ],
  defeatLine: 'THE CORE COOLS',
  resumeLine: 'You came back. Things don\'t, usually. They just get smaller.',

  phases: [
    {
      name: 'Fallout',
      line: 'Fallout. It settles on everything. On everyone. Eventually.',
      hp: 510,
      cycle: [
        'sig:canister', 'volley', 'sig:plume', 'hazard', 'sig:canister',
        'radial', 'sig:plume', 'homing', 'sig:decay',
      ],
      harass: ['h-flak', 'h-snipe'],
      restMs: 1150,
      harassMs: 3300,
    },
    {
      name: 'Meltdown',
      line: 'No — no, it\'s going. It\'s going critical. Stand BACK. Stand back from me!',
      hp: 600,
      cycle: [
        'sig:heat', 'sig:slag', 'barrage', 'sig:decay', 'sig:heat',
        'spiral', 'sig:slag', 'sig:canister', 'lanes',
      ],
      harass: ['h-flak', 'h-orbs', 'h-lane'],
      restMs: 1000,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'HALF OF A HALF OF A HALF',
    extraPhase: {
      name: 'Half-Life',
      line: 'Split, then. If I halve enough times, one of me will be small enough to hold.',
      hp: 440,
      cycle: [
        'sig:split', 'sig:decay', 'sig:canister', 'sweep',
        'sig:slag', 'sig:split', 'sig:decay', 'sig:plume',
      ],
      harass: ['h-orbs', 'h-mines'],
      restMs: 900,
      harassMs: 2500,
    },
  },

  tuning: {
    volley: { count: 6, speed: 220, spreadRad: 0.55 },
    radial: { count: 16, speed: 185 },
    hazard: { radius: 62 },
    spiral: { arms: 3, speed: 170 },
    barrage: { count: 5 },
  },

  signatures: {
    canister: canisters,
    plume,
    heat: heatRing,
    slag: slagFall,
    decay: decayChain,
    split: halving,
  },

  look: {
    crest: 'orbs', pattern: 'rings', aura: 'sparks', hands: 'orb',
    torsoR: 34, mouth: 'line', eyes: 2, eyeColor: GLOW_LIT,
  },
  phaseStyles: [
    { movement: 'orbit', gimmick: 'none' },
    { movement: 'anchor', gimmick: 'none', tint: 'hot', look: { aura: 'flame', mouth: 'grate', pattern: 'cracks' } },
    { movement: 'blink', gimmick: 'none', tint: 'sick', look: { aura: 'glitch', torsoR: 28, eyes: 1, pattern: 'static' } },
  ],

  /**
   * The Unstable's tells. He is dressed in lead: a riveted hazmat collar up to the jaw, great lead
   * mitts over both hands, and a round glass port in his chest where his core shows, green and
   * breathing, three electron orbits whirling round him. Behind his head a decay-clock halo —
   * ½, ¼, ⅛ — goes dark sector by sector as he is hurt. In Meltdown the port cracks, the core goes
   * white, slag weeps down his front and the orbits flare wide. In Half-Life a seam of light runs
   * down him and his two halves stand a hand's breadth apart.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const melt = s.phaseIdx === 1;
    const halfP = s.hard && s.phaseIdx >= 2;
    const t = s.t;
    // The halving halo behind the head: sectors lit while his pool holds.
    const hy = s.y - R * 1.15;
    let a0 = Math.PI, span = Math.PI / 2;
    for (let k = 0; k < 4; k++) {
      const on = s.hpRatio > Math.pow(0.5, k + 1);
      g.fillStyle(on ? AMBER : dim(AMBER, 0.7), on ? 0.85 : 0.35);
      g.slice(s.x, hy, R * 0.8, a0, a0 + span, false); g.fillPath();
      g.lineStyle(1, HAZARD_BLACK, 0.8); g.lineBetween(s.x, hy, s.x + Math.cos(a0) * R * 0.8, hy + Math.sin(a0) * R * 0.8);
      a0 += span; span /= 2;
    }
    g.lineStyle(2, AMBER_LIT, 0.7); g.beginPath(); g.arc(s.x, hy, R * 0.8, Math.PI, Math.PI * 2, false); g.strokePath();
    // Electron orbits.
    const orbitR = R * (melt ? 1.7 + Math.sin(t / 90) * 0.08 : 1.35);
    for (let k = 0; k < 3; k++) {
      const tilt = (k / 3) * Math.PI;
      const ea = t / (melt ? 180 : 320) * (k % 2 ? 1 : -1) + k * 2;
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= 28; i++) {
        const b = (i / 28) * Math.PI * 2;
        const ox = Math.cos(b) * orbitR, oy = Math.sin(b) * orbitR * 0.32;
        pts.push({ x: s.x + ox * Math.cos(tilt) - oy * Math.sin(tilt), y: s.y + ox * Math.sin(tilt) + oy * Math.cos(tilt) });
      }
      g.lineStyle(1.5, melt ? SLAG_LIT : CHEREN_LIT, 0.45);
      g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        // In Half-Life the orbits are halved: every other half drawn.
        if (halfP && Math.floor(i / 7) % 2 === 1) g.moveTo(pts[i].x, pts[i].y); else g.lineTo(pts[i].x, pts[i].y);
      }
      g.strokePath();
      const ex = Math.cos(ea) * orbitR, ey = Math.sin(ea) * orbitR * 0.32;
      const px = s.x + ex * Math.cos(tilt) - ey * Math.sin(tilt), py = s.y + ex * Math.sin(tilt) + ey * Math.cos(tilt);
      g.fillStyle(melt ? SLAG_LIT : CHEREN_LIT, 1); g.fillCircle(px, py, 3.5);
      g.fillStyle(melt ? SLAG : CHEREN, 0.3); g.fillCircle(px, py, 7);
    }
    // The hazmat collar: riveted lead up to the jaw.
    g.lineStyle(R * 0.28, LEAD_DARK, 1); g.beginPath(); g.arc(s.x, s.y, R * 0.92, Math.PI * 0.12, Math.PI * 0.88, false); g.strokePath();
    g.lineStyle(R * 0.16, LEAD, 1); g.beginPath(); g.arc(s.x, s.y - 1, R * 0.92, Math.PI * 0.14, Math.PI * 0.86, false); g.strokePath();
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.18 + i * 0.107);
      g.fillStyle(LEAD_LIT, 1); g.fillCircle(s.x + Math.cos(a) * R * 0.92, s.y + Math.sin(a) * R * 0.92, 1.6);
    }
    // The core port in his chest.
    const cy = s.y + R * 0.18, cr = R * 0.4;
    g.fillStyle(LEAD_DEEP, 1); g.fillCircle(s.x, cy, cr + 4);
    g.fillStyle(IRON_LIT, 1); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillCircle(s.x + Math.cos(a) * (cr + 2), cy + Math.sin(a) * (cr + 2), 1.2); }
    const breathe = 0.75 + Math.sin(t / (melt ? 70 : 260)) * 0.25 + s.castGlow * 0.3;
    core(g, s.x, cy, cr * 0.55 * breathe, melt ? ISOTOPE_CORE : GLOW, 1);
    g.fillStyle(CHEREN_LIT, 0.18); g.fillCircle(s.x - cr * 0.3, cy - cr * 0.3, cr * 0.35);
    if (melt) {
      // Cracked glass, and slag weeping down his front.
      g.lineStyle(1.2, 0xffffff, 0.8);
      g.lineBetween(s.x - cr * 0.6, cy - cr * 0.4, s.x + cr * 0.1, cy + cr * 0.1); g.lineBetween(s.x + cr * 0.1, cy + cr * 0.1, s.x + cr * 0.7, cy - cr * 0.2);
      g.lineBetween(s.x + cr * 0.1, cy + cr * 0.1, s.x - cr * 0.1, cy + cr * 0.8);
      for (let i = 0; i < 3; i++) {
        const ph = ((t / 700) + i / 3) % 1;
        g.fillStyle(SLAG_LIT, 1 - ph); g.fillCircle(s.x - cr * 0.5 + i * cr * 0.5, cy + cr + ph * R * 0.9, 2.6 * (1 - ph) + 1);
      }
      glow(g, s.x, cy, R * 1.6, SLAG, 0.04, 3);
    }
    if (halfP) {
      // The seam: a hard line of light down him, the halves' outlines a hand apart.
      g.lineStyle(3, GLOW_LIT, 0.9); g.lineBetween(s.x, s.y - R * 1.05, s.x, s.y + R * 1.05);
      for (const k of [-1, 1]) {
        g.lineStyle(2, GLOW, 0.6);
        g.beginPath(); g.arc(s.x + k * 5, s.y, R * 1.02, k > 0 ? -Math.PI / 2 : Math.PI / 2, k > 0 ? Math.PI / 2 : Math.PI * 1.5, false); g.strokePath();
      }
    }
    // Lead mitts over both hands.
    for (const h of s.hands) {
      g.fillStyle(LEAD_DARK, 1); g.fillCircle(h.x, h.y, 9);
      g.fillStyle(LEAD, 1); g.fillCircle(h.x - 1, h.y - 1, 7.5);
      g.fillStyle(LEAD_LIT, 0.6); g.fillCircle(h.x - 3, h.y - 3, 2.5);
      g.lineStyle(2.5, AMBER, 0.9); g.beginPath(); g.arc(h.x, h.y, 9, Math.PI * 0.6, Math.PI * 1.1, false); g.strokePath();
    }
    if (s.enraged) { g.lineStyle(1.5, melt ? SLAG_LIT : GLOW_LIT, 0.35 + Math.sin(t / 110) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The heart of the Reactor Dome: a floor of dark lead tiles round the open core well — a
   * concrete lip, a ring of numbered control-rod hatches, the pool inside blazing Cherenkov blue
   * over the fuel grid — with coolant channels cut radially across the floor, a hazard ring, and
   * the dome's inner wall of copper ribs and blue portholes under the HUD.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x150707e);
    const T = 40;
    for (let y = 100; y < H; y += T) {
      for (let x = 0; x < W; x += T) {
        const k = ((x / T) + (y / T)) % 2;
        g.fillStyle(k ? LEAD_DARK : LEAD_DEEP, 1); g.fillRect(x, y, T, T);
        g.fillStyle(LEAD, 0.15); g.fillRect(x, y, T, 2);
      }
    }
    const cx = W / 2, cy = (H + 110) / 2;
    // Coolant channels radiating from the well.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      g.lineStyle(14, CHEREN_DEEP, 1); g.lineBetween(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120, cx + Math.cos(a) * 700, cy + Math.sin(a) * 700);
      g.lineStyle(6, CHEREN_DIM, 0.8); g.lineBetween(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120, cx + Math.cos(a) * 700, cy + Math.sin(a) * 700);
      g.lineStyle(1.5, CHEREN_LIT, 0.35); g.lineBetween(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120, cx + Math.cos(a) * 700, cy + Math.sin(a) * 700);
    }
    // The hazard ring.
    g.lineStyle(10, AMBER, 0.55); g.strokeCircle(cx, cy, 250);
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      if (i % 2) continue;
      g.lineStyle(10, HAZARD_BLACK, 0.7); g.beginPath(); g.arc(cx, cy, 250, a, a + Math.PI / 36, false); g.strokePath();
    }
    // The core well: concrete lip, rod hatches, the blue pool and the fuel grid in it.
    g.fillStyle(CONCRETE_DARK, 1); g.fillCircle(cx, cy, 116);
    g.fillStyle(CONCRETE, 1); g.fillCircle(cx, cy, 110);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const hx = cx + Math.cos(a) * 96, hy = cy + Math.sin(a) * 96;
      g.fillStyle(IRON_DARK, 1); g.fillRect(hx - 6, hy - 6, 12, 12);
      g.fillStyle(i % 4 ? LEAD_LIT : AMBER, 1); g.fillRect(hx - 4, hy - 4, 8, 8);
    }
    g.fillStyle(LEAD_DEEP, 1); g.fillCircle(cx, cy, 84);
    g.fillStyle(CHEREN_DEEP, 1); g.fillCircle(cx, cy, 78);
    g.fillStyle(CHEREN_DIM, 0.8); g.fillCircle(cx, cy, 70);
    for (let gx = -3; gx <= 3; gx++) {
      for (let gy = -3; gy <= 3; gy++) {
        const px = cx + gx * 18, py = cy + gy * 18;
        if (Math.hypot(px - cx, py - cy) > 62) continue;
        g.fillStyle(CHEREN, 0.7); g.fillRect(px - 6, py - 6, 12, 12);
        g.fillStyle(CHEREN_LIT, 0.6); g.fillRect(px - 3, py - 3, 6, 6);
      }
    }
    glow(g, cx, cy, 160, CHEREN, 0.04, 5);
    trefoil(g, cx, cy, 34, CHEREN_LIT, undefined, 0.18);
    // The inner wall of the dome under the HUD: copper ribs, portholes.
    g.fillStyle(LEAD_DEEP, 1); g.fillRect(0, 0, W, 104);
    for (let x = 0; x <= W; x += 96) {
      g.fillStyle(COPPER_DARK, 1); g.fillRect(x - 6, 0, 12, 106);
      g.fillStyle(COPPER, 1); g.fillRect(x - 3, 0, 4, 106);
      g.fillStyle(COPPER_LIT, 0.6); g.fillRect(x - 3, 0, 1.5, 106);
    }
    for (let x = 48; x < W; x += 96) {
      g.fillStyle(LEAD_DARK, 1); g.fillCircle(x, 54, 18);
      g.fillStyle(CHEREN_DIM, 1); g.fillCircle(x, 54, 13);
      g.fillStyle(CHEREN, 0.8); g.fillCircle(x, 54, 9);
      g.fillStyle(CHEREN_LIT, 0.8); g.fillCircle(x - 3, 51, 3);
    }
    hazardStripe(g, 0, 100, W, 8, 0.9);
    // Pipework down both walls, valve wheels, a cask or two.
    for (const x0 of [10, W - 26]) {
      g.fillStyle(IRON_DARK, 1); g.fillRect(x0, 108, 16, H - 108);
      g.fillStyle(IRON_LIT, 0.5); g.fillRect(x0 + 3, 108, 3, H - 108);
      for (let y = 160; y < H; y += 110) {
        g.lineStyle(3, AMBER, 0.9); g.strokeCircle(x0 + 8, y, 11);
        g.lineBetween(x0 - 3, y, x0 + 19, y); g.lineBetween(x0 + 8, y - 11, x0 + 8, y + 11);
      }
    }
    for (let i = 0; i < 40; i++) { g.fillStyle(GLOW, 0.2 + rng() * 0.3); g.fillCircle(30 + rng() * (W - 60), 120 + rng() * (H - 140), 1.2); }
  },
};
