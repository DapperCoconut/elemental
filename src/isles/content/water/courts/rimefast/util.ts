import type Phaser from 'phaser';
import type { Fighter } from '../../../../../entities/Fighter';
import { dim, lit } from '../../../../art/IsleArt';

/**
 * Shared bits for the Rimefast Court: its palette, a frame clock, a few geometry helpers, and the
 * props that turn up both in the world and in the fights — a hole sawn in the ice, a crack spider-
 * webbing out from a point, a hanging icicle, a packed snowball, an iron warming brazier. Anything
 * else is drawn bespoke where it is used.
 */

type G = Phaser.GameObjects.Graphics;

/**
 * The court's colours. Rimefast is a harbour the Queen froze solid: clear sea-ice over black
 * water, blue-white snow, tarred hulls gone grey with rime, the Prince's glassy palace, and the
 * one warm thing in the place — the orange of a licensed brazier.
 */
export const R = {
  ice: 0xbfe3f0,
  iceLit: 0xe2f4fb,
  iceDeep: 0x7fb2cc,
  iceDark: 0x3d6f8c,
  blackIce: 0x1d3a4e,
  water: 0x0b2232,
  waterLit: 0x1d4a62,
  slush: 0x9fc2d2,
  snow: 0xf1f6fa,
  snowShade: 0xc8d6e3,
  snowBlue: 0xa3b9cf,
  frost: 0xe8f8ff,
  rime: 0xd6efff,
  timber: 0x4b3d36,
  timberLit: 0x74604f,
  timberDark: 0x2c2420,
  hull: 0x2a2630,
  hullLit: 0x4a4554,
  rope: 0xb8a27a,
  canvas: 0xd9d2c0,
  brass: 0xc9a043,
  iron: 0x343a42,
  ironLit: 0x6a7480,
  stone: 0x7b8591,
  stoneDark: 0x4d5560,
  stoneLit: 0xa3acb6,
  ember: 0xff8a3a,
  emberHot: 0xffd27a,
  flame: 0xff5a1e,
  glass: 0x9fd8f0,
  glassDeep: 0x4f94b8,
  glassLit: 0xeafaff,
  /** The Queen's livery — a drowned sea-green, with kelp-gold trim. */
  livery: 0x1f6a70,
  kelp: 0xb59a3a,
  scarf: 0xa8343a,
};

export const RCOL = {
  ice: '#bfe8ff',
  frost: '#e8f8ff',
  deep: '#6fb4dc',
  warm: '#ffb05a',
  hot: '#ffe2a8',
  red: '#ff6a5a',
  green: '#9ee8b0',
  steel: '#c8d2dc',
  snow: '#ffffff',
};

/**
 * A frame clock driven by the scene time each `update` is handed. Gimmicks and item scripts
 * derive their own step from it instead of trusting the caller's `dt` unit, so they behave the
 * same whether the host passes milliseconds or seconds.
 */
export class Clock {
  private last = -1;
  /** Seconds since the previous tick, clamped so a hitch never teleports anything. */
  tick(time: number): number {
    const dt = this.last < 0 ? 0 : Math.min(0.05, Math.max(0, (time - this.last) / 1000));
    this.last = time;
    return dt;
  }
}

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

/** Distance from a point to a segment. */
export function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const vx = x2 - x1, vy = y2 - y1;
  const L2 = vx * vx + vy * vy;
  let t = L2 > 0 ? ((px - x1) * vx + (py - y1) * vy) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + vx * t), py - (y1 + vy * t));
}

/** Does the segment a→b cross the axis-aligned rect? (Liang–Barsky, cheap and exact enough.) */
export function segHitsRect(ax: number, ay: number, bx: number, by: number, rx: number, ry: number, rw: number, rh: number): boolean {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dy = by - ay;
  const p = [-dx, dx, -dy, dy];
  const q = [ax - rx, rx + rw - ax, ay - ry, ry + rh - ay];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return false; continue; }
    const t = q[i] / p[i];
    if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}

/** Wrap an angle into −π…π. */
export const wrapA = (a: number): number => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

/**
 * A small seeded jitter so a crack or a drift drawn every frame keeps the same shape: hand it the
 * same seed and index and it returns the same number in 0..1.
 */
export const jit = (seed: number, i: number): number => {
  const s = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

// ── Props ────────────────────────────────────────────────────────────

/**
 * A hole sawn in the sea-ice, seen from above: a ragged rim of white slush, a blue band where the
 * ice is thick, then black water with a slow ripple and a few chips of ice turning on it.
 * `open` 0–1 lets a hole grow in or skin over.
 */
export function drawHole(g: G, x: number, y: number, r: number, t: number, seed: number, open = 1): void {
  if (open <= 0) return;
  const rr = r * open;
  g.fillStyle(R.snow, 0.85); g.fillEllipse(x, y + 2, rr * 2.5, rr * 1.75);
  g.fillStyle(R.iceDeep, 1); g.fillEllipse(x, y, rr * 2.2, rr * 1.5);
  g.fillStyle(R.iceDark, 1); g.fillEllipse(x, y + 1.5, rr * 2.0, rr * 1.32);
  g.fillStyle(R.water, 1); g.fillEllipse(x, y + 3, rr * 1.8, rr * 1.12);
  // Ripple: one ring breathing out from the middle.
  const k = ((t * 0.6 + seed) % 1);
  g.lineStyle(1, R.waterLit, 0.6 * (1 - k)); g.strokeEllipse(x, y + 3, rr * 1.7 * k, rr * 1.05 * k);
  // Chips of ice drifting on the black.
  for (let i = 0; i < 3; i++) {
    const a = t * 0.4 + seed * 3 + i * 2.1;
    const cx = x + Math.cos(a) * rr * 0.5, cy = y + 3 + Math.sin(a) * rr * 0.3;
    g.fillStyle(R.iceLit, 0.85); g.fillRect(cx - 2, cy - 1, 4, 2);
  }
  // Ragged slush lumps round the rim.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + seed;
    g.fillStyle(i % 2 ? R.snow : R.snowShade, 0.9);
    g.fillCircle(x + Math.cos(a) * rr * 1.15, y + Math.sin(a) * rr * 0.82 + 1, 2 + jit(seed, i) * 2.5);
  }
}

/**
 * A crack in the ice: jagged rays from a point, each with a branch, and a pale bruise round the
 * centre. `stage` 0–1 grows it (0 = a hairline star, 1 = about to give way).
 */
export function drawCrack(g: G, x: number, y: number, r: number, seed: number, stage: number, alpha = 1): void {
  const rays = 5 + Math.floor(jit(seed, 0) * 3);
  const len = r * (0.45 + stage * 0.55);
  g.fillStyle(R.iceLit, 0.25 * alpha * stage); g.fillCircle(x, y, len * 0.45);
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + jit(seed, i + 1) * 0.8;
    let px = x, py = y;
    const segs = 3;
    for (let s = 1; s <= segs; s++) {
      const bend = (jit(seed, i * 7 + s) - 0.5) * 0.7;
      const nx = x + Math.cos(a + bend) * len * (s / segs), ny = y + Math.sin(a + bend) * len * (s / segs) * 0.8;
      g.lineStyle(2.4 - s * 0.5, R.blackIce, 0.75 * alpha); g.lineBetween(px, py, nx, ny);
      g.lineStyle(1, R.iceLit, 0.55 * alpha); g.lineBetween(px + 1, py - 1, nx + 1, ny - 1);
      if (s === 2 && stage > 0.35) {
        const ba = a + (jit(seed, i + 40) > 0.5 ? 0.7 : -0.7);
        g.lineStyle(1.2, R.blackIce, 0.6 * alpha);
        g.lineBetween(nx, ny, nx + Math.cos(ba) * len * 0.35, ny + Math.sin(ba) * len * 0.28);
      }
      px = nx; py = ny;
    }
  }
}

/** A hanging icicle, point down, `x,y` at its root. A lit edge, a drop on the tip. */
export function drawIcicle(g: G, x: number, y: number, len: number, w: number, alpha = 1, wobble = 0): void {
  const tip = x + wobble;
  g.fillStyle(R.iceDark, 0.55 * alpha); g.fillTriangle(x - w / 2 - 1, y, x + w / 2 + 1, y, tip, y + len + 2);
  g.fillStyle(R.ice, 0.92 * alpha); g.fillTriangle(x - w / 2, y, x + w / 2, y, tip, y + len);
  g.fillStyle(R.glassLit, 0.85 * alpha); g.fillTriangle(x - w / 2 + 1, y, x - w / 6, y, tip - 0.5, y + len * 0.8);
  g.fillStyle(R.glassLit, 0.9 * alpha); g.fillCircle(tip, y + len + 1, 1.3);
}

/** A packed snowball, shaded, with the handprint dent. */
export function drawSnowball(g: G, x: number, y: number, r: number, alpha = 1): void {
  g.fillStyle(R.snowBlue, alpha); g.fillCircle(x, y, r + 0.8);
  g.fillStyle(R.snow, alpha); g.fillCircle(x - 0.5, y - 0.5, r);
  g.fillStyle(R.snowShade, alpha * 0.8); g.fillCircle(x + r * 0.3, y + r * 0.25, r * 0.4);
  g.fillStyle(0xffffff, alpha); g.fillCircle(x - r * 0.35, y - r * 0.4, r * 0.3);
}

/**
 * An iron warming brazier on three legs — the licensed kind, with the Prince's tag wired to it.
 * `heat` 0–1: 0 is a dead basket of black coal; the flame itself is drawn by the caller.
 */
export function drawBrazier(g: G, x: number, y: number, heat: number): void {
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 2, 34, 10);
  if (heat > 0) { g.fillStyle(R.ember, 0.1 * heat); g.fillCircle(x, y - 6, 60); }
  g.lineStyle(2.5, R.iron, 1);
  g.lineBetween(x - 11, y, x - 7, y - 20); g.lineBetween(x + 11, y, x + 7, y - 20); g.lineBetween(x, y + 3, x, y - 20);
  g.fillStyle(R.iron, 1); g.fillEllipse(x, y - 22, 28, 11);
  g.fillStyle(heat > 0 ? dim(R.ember, 0.35) : 0x14110f, 1); g.fillEllipse(x, y - 24, 22, 7);
  if (heat > 0) {
    for (let i = 0; i < 5; i++) { g.fillStyle(R.emberHot, 0.6 * heat); g.fillCircle(x - 8 + i * 4, y - 24 + (i % 2), 1.6); }
  }
  // The licence tag: a little brass plate on a wire.
  g.lineStyle(1, R.ironLit, 1); g.lineBetween(x + 12, y - 22, x + 15, y - 14);
  g.fillStyle(R.brass, 1); g.fillRect(x + 12, y - 14, 6, 5);
}

/** The brazier's flame (animated). */
export function drawBrazierFlame(g: G, x: number, y: number, t: number, heat: number): void {
  if (heat <= 0) return;
  const f = (0.85 + Math.sin(t * 9 + x) * 0.15) * heat;
  g.fillStyle(R.flame, 0.14 * heat); g.fillCircle(x, y - 34, 26 * f);
  g.fillStyle(R.flame, 0.9); g.fillTriangle(x - 9, y - 24, x + 9, y - 24, x + Math.sin(t * 7 + y) * 3, y - 24 - 22 * f);
  g.fillStyle(R.ember, 1); g.fillTriangle(x - 6, y - 24, x + 6, y - 24, x + Math.sin(t * 11) * 2, y - 24 - 14 * f);
  g.fillStyle(R.emberHot, 1); g.fillTriangle(x - 3, y - 24, x + 3, y - 24, x, y - 30 - 4 * f);
}

/** A twinkle of frost: a four-point star. */
export function drawGlint(g: G, x: number, y: number, s: number, alpha: number): void {
  g.fillStyle(0xffffff, alpha);
  g.fillTriangle(x - s, y, x + s, y, x, y - s * 0.25);
  g.fillTriangle(x - s, y, x + s, y, x, y + s * 0.25);
  g.fillTriangle(x, y - s, x, y + s, x - s * 0.25, y);
  g.fillTriangle(x, y - s, x, y + s, x + s * 0.25, y);
}

/** Breath fogging in the cold: a few pale puffs drifting off a point. */
export function drawBreath(g: G, x: number, y: number, t: number, seed: number, alpha = 0.3): void {
  for (let i = 0; i < 3; i++) {
    const ph = ((t * 0.5 + seed + i * 0.33) % 1);
    g.fillStyle(R.frost, alpha * (1 - ph));
    g.fillCircle(x + ph * 16 + i * 2, y - ph * 10, 2 + ph * 6);
  }
}

/** A snowdrift: a soft heap with a blue shadow on its lee side. */
export function drawDrift(g: G, x: number, y: number, w: number, h: number, seed: number): void {
  g.fillStyle(R.snowBlue, 0.7); g.fillEllipse(x + w * 0.06, y + h * 0.15, w * 1.02, h * 1.05);
  for (let i = 0; i < 5; i++) {
    const ox = (i / 4 - 0.5) * w * 0.7;
    const s = 0.55 + jit(seed, i) * 0.4;
    g.fillStyle(i % 2 ? R.snow : lit(R.snowShade, 0.4), 1); g.fillEllipse(x + ox, y - h * 0.1 * s, w * 0.42 * s, h * s);
  }
  g.fillStyle(0xffffff, 0.8); g.fillEllipse(x - w * 0.12, y - h * 0.35, w * 0.4, h * 0.22);
}
