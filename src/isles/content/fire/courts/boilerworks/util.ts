import type { Pt, Rect } from '../../../../IslesTypes';
import { dim, lit, type G } from '../../../../art/IsleArt';

/**
 * The Boilerworks' shared hand — palette and the few machine parts (rivets, copper pipe,
 * pressure dials, steam puffs) that the yard, the fight floor, the gimmicks and Prince Gauge
 * all draw with, so the whole court reads as one riveted, steaming place.
 */

// ── Palette ─────────────────────────────────────────────────────────
export const IRON = 0x3b3f45;
export const IRON_DARK = 0x1d2024;
export const IRON_LIT = 0x6a7078;
export const RIVET = 0x9aa0a8;
export const COPPER = 0xb5683a;
export const COPPER_LIT = 0xe8a46a;
export const COPPER_DARK = 0x5e2f16;
export const VERDIGRIS = 0x4f9a86;
export const BRASS = 0xd6ad4a;
export const BRASS_DARK = 0x7a5a1c;
export const STEAM = 0xeef3f6;
export const SOOT = 0x26221f;
export const CINDER = 0x2f2b28;
export const HOT = 0xff6a2a;
export const HOT_LIT = 0xffc070;
export const REDLINE = 0xe0262a;
export const DIAL_FACE = 0xf1e6c8;
export const HAZARD_YELLOW = 0xe8b923;
/** Ownership tints used by the fight rules: the player's side and the foe's side. */
export const MINE_C = 0x5fd8ff;
export const FOE_C = 0xff8a3a;

// ── Small maths ─────────────────────────────────────────────────────

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
export const inRect = (x: number, y: number, r: Rect): boolean => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/** True when a point (with margin) lies inside the camera rect — animators skip the rest. */
export const inView = (x: number, y: number, view: Rect, m = 120): boolean =>
  x > view.x - m && x < view.x + view.w + m && y > view.y - m && y < view.y + view.h + m;

/**
 * Seconds since the previous call, derived from the frame clock itself. Gimmicks measure their
 * own step this way so they never depend on whether the host passes `dt` in ms or seconds.
 */
export function frameClock(): (time: number) => number {
  let last = -1;
  return (time: number) => {
    const d = last < 0 ? 0 : Math.min(0.1, Math.max(0, (time - last) / 1000));
    last = time;
    return d;
  };
}

/** Deterministic hash noise for per-frame flicker that does not crawl (0..1). */
export const noise = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ── Machine parts ───────────────────────────────────────────────────

/** A row of rivets along a line. */
export function rivets(g: G, a: Pt, b: Pt, step = 14, r = 1.7, color = RIVET): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(1, Math.floor(len / step));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    g.fillStyle(dim(color, 0.55), 1); g.fillCircle(x + 0.6, y + 0.8, r);
    g.fillStyle(color, 1); g.fillCircle(x, y, r);
    g.fillStyle(lit(color, 0.5), 1); g.fillCircle(x - r * 0.35, y - r * 0.35, r * 0.4);
  }
}

/** One riveted iron deck plate. */
export function plate(g: G, x: number, y: number, w: number, h: number, base: number, rng: () => number): void {
  g.fillStyle(dim(base, 0.45), 1); g.fillRect(x, y, w, h);
  g.fillStyle(base, 1); g.fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle(lit(base, 0.08), 1); g.fillRect(x + 2, y + 2, w - 4, 2);
  // Scuffs and oil.
  for (let i = 0; i < 3; i++) {
    g.fillStyle(rng() < 0.5 ? dim(base, 0.2) : lit(base, 0.05), 0.4);
    g.fillEllipse(x + 8 + rng() * (w - 16), y + 8 + rng() * (h - 16), 8 + rng() * 22, 3 + rng() * 6);
  }
  rivets(g, { x: x + 6, y: y + 6 }, { x: x + w - 6, y: y + 6 }, 18, 1.4);
  rivets(g, { x: x + 6, y: y + h - 6 }, { x: x + w - 6, y: y + h - 6 }, 18, 1.4);
}

/**
 * A fat copper pipe lying on the ground between two points (axis-aligned runs read best),
 * with flanged collars every `flangeEvery` px and a green verdigris bloom here and there.
 */
export function copperPipe(g: G, a: Pt, b: Pt, r: number, rng: () => number, flangeEvery = 120): void {
  const horiz = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
  if (horiz) {
    g.fillStyle(0x000000, 0.3); g.fillRect(x0, a.y + r * 0.6, x1 - x0, r * 0.8);
    g.fillStyle(COPPER_DARK, 1); g.fillRect(x0, a.y - r, x1 - x0, r * 2);
    g.fillStyle(COPPER, 1); g.fillRect(x0, a.y - r + 2, x1 - x0, r * 2 - 5);
    g.fillStyle(COPPER_LIT, 0.85); g.fillRect(x0, a.y - r * 0.55, x1 - x0, r * 0.32);
    for (let x = x0 + flangeEvery / 2; x < x1; x += flangeEvery) {
      g.fillStyle(COPPER_DARK, 1); g.fillRect(x - 5, a.y - r - 3, 10, r * 2 + 6);
      g.fillStyle(lit(COPPER, 0.1), 1); g.fillRect(x - 4, a.y - r - 2, 8, r * 2 + 3);
      rivets(g, { x, y: a.y - r }, { x, y: a.y + r }, r * 0.66, 1.2, BRASS);
    }
    for (let i = 0; i < (x1 - x0) / 140; i++) {
      g.fillStyle(VERDIGRIS, 0.35 + rng() * 0.25);
      g.fillEllipse(x0 + rng() * (x1 - x0), a.y + r * (0.2 + rng() * 0.5), 10 + rng() * 18, 3 + rng() * 3);
    }
  } else {
    g.fillStyle(0x000000, 0.3); g.fillRect(a.x + r * 0.5, y0, r * 0.7, y1 - y0);
    g.fillStyle(COPPER_DARK, 1); g.fillRect(a.x - r, y0, r * 2, y1 - y0);
    g.fillStyle(COPPER, 1); g.fillRect(a.x - r + 2, y0, r * 2 - 5, y1 - y0);
    g.fillStyle(COPPER_LIT, 0.85); g.fillRect(a.x - r * 0.55, y0, r * 0.32, y1 - y0);
    for (let y = y0 + flangeEvery / 2; y < y1; y += flangeEvery) {
      g.fillStyle(COPPER_DARK, 1); g.fillRect(a.x - r - 3, y - 5, r * 2 + 6, 10);
      g.fillStyle(lit(COPPER, 0.1), 1); g.fillRect(a.x - r - 2, y - 4, r * 2 + 3, 8);
      rivets(g, { x: a.x - r, y }, { x: a.x + r, y }, r * 0.66, 1.2, BRASS);
    }
    for (let i = 0; i < (y1 - y0) / 140; i++) {
      g.fillStyle(VERDIGRIS, 0.35 + rng() * 0.25);
      g.fillEllipse(a.x + r * 0.3, y0 + rng() * (y1 - y0), 4 + rng() * 3, 10 + rng() * 16);
    }
  }
}

/** An elbow joint where two pipe runs meet. */
export function pipeElbow(g: G, x: number, y: number, r: number): void {
  g.fillStyle(COPPER_DARK, 1); g.fillCircle(x, y, r + 4);
  g.fillStyle(COPPER, 1); g.fillCircle(x, y, r + 1);
  g.fillStyle(COPPER_LIT, 0.7); g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.45);
  rivets(g, { x: x - r, y: y - r - 2 }, { x: x + r, y: y - r - 2 }, r * 0.5, 1.2, BRASS);
}

/**
 * A round pressure dial: brass bezel, cream face, a red arc for the redline and a needle at
 * `frac` (0 = rest, 1 = pinned in the red).
 */
export function dial(g: G, x: number, y: number, r: number, frac: number, face = DIAL_FACE): void {
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, r + 3);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y, r + 1.5);
  g.fillStyle(face, 1); g.fillCircle(x, y, r - 1);
  const a0 = Math.PI * 0.75, span = Math.PI * 1.5;
  g.lineStyle(Math.max(1.5, r * 0.16), REDLINE, 0.9);
  g.beginPath(); g.arc(x, y, r * 0.78, a0 + span * 0.78, a0 + span, false); g.strokePath();
  g.lineStyle(1, 0x2a2a2a, 0.8);
  for (let i = 0; i <= 8; i++) {
    const a = a0 + (span * i) / 8;
    g.lineBetween(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86);
  }
  const na = a0 + span * clamp(frac, 0, 1.04);
  g.lineStyle(Math.max(1.2, r * 0.1), 0x1a1a1a, 1);
  g.lineBetween(x, y, x + Math.cos(na) * r * 0.82, y + Math.sin(na) * r * 0.82);
  g.fillStyle(0x1a1a1a, 1); g.fillCircle(x, y, Math.max(1.5, r * 0.14));
}

/**
 * A rising steam puff cycle at a vent: `ph` 0..1 is the puff's life. Several of these offset in
 * phase read as continuous venting.
 */
export function steamPuff(g: G, x: number, y: number, ph: number, size: number, a = 0.5, color = STEAM): void {
  const rise = ph * size * 2.4;
  const r = size * (0.35 + ph * 0.9);
  const al = a * (ph < 0.15 ? ph / 0.15 : 1 - (ph - 0.15) / 0.85);
  g.fillStyle(color, al * 0.55); g.fillCircle(x + Math.sin(ph * 5) * size * 0.25, y - rise, r);
  g.fillStyle(color, al * 0.4); g.fillCircle(x - r * 0.45, y - rise + r * 0.25, r * 0.7);
  g.fillStyle(color, al * 0.4); g.fillCircle(x + r * 0.5, y - rise + r * 0.2, r * 0.62);
}

/** A cartoon valve handwheel seen from above: rim, four spokes, hub. */
export function valveWheel(g: G, x: number, y: number, r: number, rot: number, rim: number): void {
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 2, y + r * 0.7, r * 2.1, r * 0.7);
  g.lineStyle(r * 0.26, dim(rim, 0.45), 1); g.strokeCircle(x, y, r);
  g.lineStyle(r * 0.18, rim, 1); g.strokeCircle(x, y, r);
  for (let i = 0; i < 4; i++) {
    const a = rot + (Math.PI / 2) * i;
    g.lineStyle(r * 0.15, rim, 1);
    g.lineBetween(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r);
    g.fillStyle(lit(rim, 0.3), 1); g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.16);
  }
  g.fillStyle(dim(rim, 0.3), 1); g.fillCircle(x, y, r * 0.3);
  g.fillStyle(lit(rim, 0.35), 1); g.fillCircle(x - r * 0.08, y - r * 0.08, r * 0.14);
}

/** Black-and-yellow hazard striping inside a rect (45° bars, clipped to the rect). */
export function hazardStripes(g: G, r: Rect, a = 0.85, step = 18): void {
  g.fillStyle(HAZARD_YELLOW, a); g.fillRect(r.x, r.y, r.w, r.h);
  g.lineStyle(1.3, 0x161616, a);
  for (let s = -r.h; s < r.w; s += step) {
    for (let k = 0; k < step / 2; k++) {
      const xa = r.x + s + k;
      const xs = Math.max(r.x, xa), xe = Math.min(r.x + r.w, xa + r.h);
      if (xe <= xs) continue;
      g.lineBetween(xs, r.y + (xs - xa), xe, r.y + (xe - xa));
    }
  }
}
