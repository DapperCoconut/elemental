import Phaser from 'phaser';
import type { Pt, Rect } from '../../../../IslesTypes';
import { dim, lit, mixC, type G } from '../../../../art/IsleArt';

/**
 * Slickharbor's shared hand — the palette and the handful of oil-port parts (tarred planking,
 * iridescent slicks, oil drums, nodding pump-jacks, flame tongues, the Queen's lamp) that the
 * harbour, the fight floor, the gimmicks, the charms and Prince Crude all draw with, so the
 * whole court reads as one black, glossy, rainbow-sheened place.
 *
 * The look in one line: everything is coated. Timber is tarred, steel is greased, the sea is a
 * skin of crude, and the only bright colours are the thin-film rainbow on every puddle and the
 * gold of the Queen's lamps the court pumps its oil to keep lit.
 */

// ── Palette ─────────────────────────────────────────────────────────
/** Raw crude: not black — a deep brown-black that goes amber where light catches it. */
export const CRUDE = 0x1a130d;
export const CRUDE_LIT = 0x5a3c1e;
export const CRUDE_AMBER = 0xa8682a;
/** Tar: bluer and harder than crude. */
export const TAR = 0x121417;
export const TAR_LIT = 0x3a4048;
/** Tarred timber — planks, piles, jetties. */
export const TIMBER = 0x3a2c22;
export const TIMBER_DARK = 0x1e1610;
export const TIMBER_LIT = 0x5e4836;
/** Greasy galvanised steel — derricks, cranes, drums. */
export const STEEL = 0x56606a;
export const STEEL_DARK = 0x262c32;
export const STEEL_LIT = 0x8c98a4;
export const RUST = 0x8a3e1e;
export const RUST_LIT = 0xc06a34;
/** Harbour water under the slick. */
export const SEA = 0x14232a;
export const SEA_LIT = 0x2c4a56;
/** Red-and-white safety paint (this court's hazard marking — not yellow-black). */
export const SAFETY_RED = 0xc8322a;
export const SAFETY_WHITE = 0xe6e0d4;
/** The Queen's lamps: the only clean light in the harbour. */
export const LAMP_GOLD = 0xffc860;
export const LAMP_LIT = 0xfff0b8;
export const GILT = 0xd8a840;
export const GILT_DARK = 0x7a5418;
/** Fire on oil — orange, yellow cores, sooty black smoke. */
export const FLAME = 0xff7a1e;
export const FLAME_LIT = 0xffd060;
export const SOOT = 0x0e0c0b;
/** Thin-film sheen bands, cycled over every slick. */
export const SHEEN = [0xc04ad0, 0x5a6aff, 0x2ec8c0, 0x7ad84a, 0xe8c040, 0xe86a3a] as const;
/** Ownership tints used by fight rules: the player's side and the foe's side. */
export const MINE_C = 0x6ae0ff;
export const FOE_C = 0xff9a3a;

// ── Small maths ─────────────────────────────────────────────────────

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
export const inRect = (x: number, y: number, r: Rect): boolean => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** True when a point (with margin) lies inside the camera rect — animators skip the rest. */
export const inView = (x: number, y: number, view: Rect, m = 140): boolean =>
  x > view.x - m && x < view.x + view.w + m && y > view.y - m && y < view.y + view.h + m;

/** Deterministic hash noise for flicker that does not crawl (0..1). */
export const noise = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * Seconds since the previous call, from the frame clock itself — gimmicks measure their own step
 * so they never depend on the unit of the host's `dt`.
 */
export function frameClock(): (time: number) => number {
  let last = -1;
  return (time: number) => {
    const d = last < 0 ? 0 : Math.min(0.1, Math.max(0, (time - last) / 1000));
    last = time;
    return d;
  };
}

/** Distance from a point to a segment. */
export function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

/** A sheen colour at phase `p` (any real), blended smoothly between bands. */
export function sheenAt(p: number): number {
  const n = SHEEN.length;
  const f = ((p % n) + n) % n;
  const i = Math.floor(f);
  return mixC(SHEEN[i], SHEEN[(i + 1) % n], f - i);
}

/** A wobbly closed outline around (x, y) — the shape of a spill. Stable for a given seed. */
export function blobPts(x: number, y: number, rx: number, ry: number, seed: number, lumps = 11, wob = 0.22): Phaser.Geom.Point[] {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < lumps; i++) {
    const a = (i / lumps) * Math.PI * 2;
    const k = 1 - wob / 2 + noise(seed * 31.7 + i * 7.3) * wob;
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k));
  }
  return pts;
}

// ── Oil ─────────────────────────────────────────────────────────────

/**
 * A slick on the ground: a near-black body with thin-film rainbow rings toward its rim. `ph`
 * shifts the bands (animate it to make the sheen crawl); `a` fades the whole thing.
 */
export function slick(g: G, x: number, y: number, rx: number, ry: number, seed: number, ph: number, a = 1): void {
  g.fillStyle(CRUDE, 0.82 * a);
  g.fillPoints(blobPts(x, y, rx, ry, seed), true, true);
  // Rings of sheen, outer to inner, each a little smaller and shifted in hue.
  for (let k = 0; k < 4; k++) {
    const s = 0.92 - k * 0.17;
    g.lineStyle(Math.max(1.5, rx * 0.07), sheenAt(ph + k * 0.9 + seed), (0.34 - k * 0.05) * a);
    g.strokePoints(blobPts(x + k * 1.5, y - k, rx * s, ry * s, seed + k * 0.37), true, true);
  }
  g.fillStyle(0xffffff, 0.07 * a);
  g.fillEllipse(x - rx * 0.25, y - ry * 0.3, rx * 0.6, ry * 0.25);
}

/** Thick crude (sticky, glossy, no rainbow) — the kind that holds you. */
export function crudePuddle(g: G, x: number, y: number, r: number, seed: number, a = 1): void {
  g.fillStyle(0x000000, 0.25 * a);
  g.fillPoints(blobPts(x + 3, y + 4, r * 1.05, r * 0.72, seed), true, true);
  g.fillStyle(CRUDE, 0.95 * a);
  g.fillPoints(blobPts(x, y, r, r * 0.68, seed), true, true);
  g.fillStyle(CRUDE_LIT, 0.55 * a);
  g.fillPoints(blobPts(x - r * 0.12, y - r * 0.1, r * 0.66, r * 0.4, seed + 3), true, true);
  g.fillStyle(CRUDE_AMBER, 0.45 * a); g.fillEllipse(x - r * 0.3, y - r * 0.22, r * 0.42, r * 0.14);
  g.fillStyle(0xffffff, 0.22 * a); g.fillEllipse(x - r * 0.34, y - r * 0.26, r * 0.16, r * 0.06);
}

/** A falling droplet of crude seen from the side — a teardrop with an amber glint. */
export function droplet(g: G, x: number, y: number, s: number, a = 1): void {
  g.fillStyle(CRUDE, a);
  g.fillCircle(x, y, s);
  g.fillTriangle(x - s * 0.9, y - s * 0.3, x + s * 0.9, y - s * 0.3, x, y - s * 2.4);
  g.fillStyle(CRUDE_AMBER, 0.7 * a); g.fillCircle(x - s * 0.35, y - s * 0.2, s * 0.32);
}

/** One flame tongue rising from (x, y), height `h`, flickering on `t` (seconds). */
export function flameTongue(g: G, x: number, y: number, h: number, t: number, seed: number, a = 1): void {
  const f = 0.75 + 0.25 * Math.sin(t * 13 + seed * 5.1) + 0.12 * noise(Math.floor(t * 14) + seed);
  const hh = h * f;
  const sway = Math.sin(t * 7 + seed) * h * 0.18;
  g.fillStyle(FLAME, 0.85 * a);
  g.fillTriangle(x - h * 0.32, y, x + h * 0.32, y, x + sway, y - hh);
  g.fillStyle(FLAME_LIT, 0.9 * a);
  g.fillTriangle(x - h * 0.16, y, x + h * 0.16, y, x + sway * 0.6, y - hh * 0.6);
  g.fillStyle(0xffffff, 0.5 * a); g.fillCircle(x, y - h * 0.08, h * 0.08);
}

/** A curl of black oil smoke at life phase `ph` 0..1. */
export function sootPuff(g: G, x: number, y: number, ph: number, size: number, a = 0.6): void {
  const rise = ph * size * 3;
  const r = size * (0.4 + ph);
  const al = a * (ph < 0.12 ? ph / 0.12 : 1 - (ph - 0.12) / 0.88);
  g.fillStyle(0x161210, al * 0.7); g.fillCircle(x + Math.sin(ph * 4) * size * 0.4, y - rise, r);
  g.fillStyle(0x2a2420, al * 0.45); g.fillCircle(x + r * 0.5, y - rise + r * 0.2, r * 0.65);
}

// ── Timber ──────────────────────────────────────────────────────────

/** A tarred plank deck over a rect — planks run across `horizontal` (true: planks laid left-right). */
export function planks(g: G, r: Rect, horizontal: boolean, rng: () => number, base = TIMBER, pw = 18): void {
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(r.x, r.y, r.w, r.h);
  if (horizontal) {
    for (let y = r.y; y < r.y + r.h; y += pw) {
      const hh = Math.min(pw - 2, r.y + r.h - y - 1);
      if (hh <= 0) continue;
      let x = r.x - rng() * 80;
      while (x < r.x + r.w) {
        const len = 70 + rng() * 120;
        const x0 = Math.max(r.x, x), x1 = Math.min(r.x + r.w, x + len - 2);
        if (x1 > x0) {
          g.fillStyle(mixC(base, rng() < 0.5 ? 0x000000 : 0xffffff, rng() * 0.12), 1);
          g.fillRect(x0, y + 1, x1 - x0, hh);
          g.fillStyle(lit(base, 0.12), 0.5); g.fillRect(x0, y + 1, x1 - x0, 1.5);
          // Nail heads at each plank end.
          g.fillStyle(STEEL_DARK, 0.8); g.fillCircle(x0 + 4, y + hh * 0.3 + 1, 1.2); g.fillCircle(x0 + 4, y + hh * 0.75 + 1, 1.2);
        }
        x += len;
      }
    }
  } else {
    for (let x = r.x; x < r.x + r.w; x += pw) {
      const ww = Math.min(pw - 2, r.x + r.w - x - 1);
      if (ww <= 0) continue;
      let y = r.y - rng() * 80;
      while (y < r.y + r.h) {
        const len = 70 + rng() * 120;
        const y0 = Math.max(r.y, y), y1 = Math.min(r.y + r.h, y + len - 2);
        if (y1 > y0) {
          g.fillStyle(mixC(base, rng() < 0.5 ? 0x000000 : 0xffffff, rng() * 0.12), 1);
          g.fillRect(x + 1, y0, ww, y1 - y0);
          g.fillStyle(lit(base, 0.12), 0.5); g.fillRect(x + 1, y0, 1.5, y1 - y0);
          g.fillStyle(STEEL_DARK, 0.8); g.fillCircle(x + ww * 0.3 + 1, y0 + 4, 1.2); g.fillCircle(x + ww * 0.75 + 1, y0 + 4, 1.2);
        }
        y += len;
      }
    }
  }
  // Tar seams blotting the deck.
  for (let i = 0; i < (r.w * r.h) / 9000; i++) {
    g.fillStyle(TAR, 0.35 + rng() * 0.3);
    g.fillEllipse(r.x + rng() * r.w, r.y + rng() * r.h, 8 + rng() * 26, 3 + rng() * 7);
  }
}

/**
 * A boardwalk along a polyline: tar-black stringers either side and planks laid across the
 * direction of travel. Bends get a round landing so the planks meet cleanly.
 */
export function boardwalk(g: G, pts: Pt[], w: number, rng: () => number): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    const nx = -uy, ny = ux;
    const hw = w / 2;
    // Underlay (the stringers' shadow).
    g.fillStyle(0x000000, 0.35);
    g.fillPoints([
      new Phaser.Geom.Point(a.x + nx * (hw + 6) + 3, a.y + ny * (hw + 6) + 5), new Phaser.Geom.Point(b.x + nx * (hw + 6) + 3, b.y + ny * (hw + 6) + 5),
      new Phaser.Geom.Point(b.x - nx * (hw + 6) + 3, b.y - ny * (hw + 6) + 5), new Phaser.Geom.Point(a.x - nx * (hw + 6) + 3, a.y - ny * (hw + 6) + 5),
    ], true);
    // Planks.
    for (let d = 0; d < len; d += 11) {
      const cx = a.x + ux * d, cy = a.y + uy * d;
      const jag = (rng() - 0.5) * 6;
      const c = mixC(TIMBER, rng() < 0.5 ? 0x000000 : 0xffffff, rng() * 0.14);
      g.lineStyle(9, c, 1);
      g.lineBetween(cx + nx * (hw + jag), cy + ny * (hw + jag), cx - nx * (hw - jag * 0.5), cy - ny * (hw - jag * 0.5));
      if (rng() < 0.12) { g.fillStyle(TAR, 0.6); g.fillEllipse(cx + nx * (rng() - 0.5) * w * 0.8, cy + ny * (rng() - 0.5) * w * 0.8, 10 + rng() * 14, 4 + rng() * 4); }
    }
    // Stringers.
    g.lineStyle(4, TIMBER_DARK, 1);
    g.lineBetween(a.x + nx * hw, a.y + ny * hw, b.x + nx * hw, b.y + ny * hw);
    g.lineBetween(a.x - nx * hw, a.y - ny * hw, b.x - nx * hw, b.y - ny * hw);
  }
  for (let i = 1; i < pts.length - 1; i++) {
    g.fillStyle(TIMBER_DARK, 1); g.fillCircle(pts[i].x, pts[i].y, w / 2 + 2);
    g.fillStyle(TIMBER, 1); g.fillCircle(pts[i].x, pts[i].y, w / 2 - 1);
    g.lineStyle(2, TIMBER_LIT, 0.4); g.strokeCircle(pts[i].x, pts[i].y, w / 2 - 6);
  }
}

/** A mooring bollard — a squat iron post painted red at the head, rope worn shiny. */
export function bollard(g: G, x: number, y: number, s = 1): void {
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x + 2, y + 2, 26 * s, 9 * s);
  g.fillStyle(STEEL_DARK, 1); g.fillRoundedRect(x - 8 * s, y - 20 * s, 16 * s, 20 * s, 4 * s);
  g.fillStyle(STEEL, 1); g.fillRoundedRect(x - 6 * s, y - 19 * s, 12 * s, 18 * s, 3 * s);
  g.fillStyle(SAFETY_RED, 1); g.fillEllipse(x, y - 21 * s, 22 * s, 9 * s);
  g.fillStyle(lit(SAFETY_RED, 0.3), 1); g.fillEllipse(x - 2 * s, y - 23 * s, 12 * s, 4 * s);
}

/** A coil of greasy hawser lying on a deck. */
export function hawserCoil(g: G, x: number, y: number, r: number): void {
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 2, y + 3, r * 2.2, r * 1.2);
  for (let k = 0; k < 4; k++) {
    g.lineStyle(3.2, k % 2 ? 0x8a7450 : 0x6a5838, 1);
    g.strokeEllipse(x, y, (r - k * r * 0.2) * 2, (r - k * r * 0.2) * 1.1);
  }
  g.fillStyle(0x2a2218, 1); g.fillEllipse(x, y, r * 0.5, r * 0.28);
}

// ── Steel ───────────────────────────────────────────────────────────

/**
 * An upright oil drum. `band` is the hoop colour; the lid shows a bung and a crude drip down
 * the side. A painted lamp-and-crown stencil marks it as tithe oil when `tithe` is set.
 */
export function oilDrum(g: G, x: number, y: number, s: number, body: number, tithe = false): void {
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x + 2, y + 2, s * 1.8, s * 0.6);
  g.fillStyle(dim(body, 0.5), 1); g.fillRect(x - s * 0.72, y - s * 2, s * 1.44, s * 2);
  g.fillStyle(body, 1); g.fillRect(x - s * 0.66, y - s * 2, s * 1.2, s * 2);
  g.fillStyle(lit(body, 0.25), 0.8); g.fillRect(x - s * 0.5, y - s * 2, s * 0.18, s * 2);
  g.fillStyle(dim(body, 0.35), 1);
  g.fillRect(x - s * 0.74, y - s * 1.45, s * 1.48, s * 0.12); g.fillRect(x - s * 0.74, y - s * 0.6, s * 1.48, s * 0.12);
  g.fillStyle(dim(body, 0.2), 1); g.fillEllipse(x, y - s * 2, s * 1.44, s * 0.48);
  g.fillStyle(dim(body, 0.55), 1); g.fillCircle(x + s * 0.3, y - s * 2, s * 0.12);
  // Drip.
  g.fillStyle(CRUDE, 0.9); g.fillRect(x + s * 0.2, y - s * 2, s * 0.14, s * 0.8); g.fillCircle(x + s * 0.27, y - s * 1.2, s * 0.12);
  if (tithe) queensMark(g, x, y - s * 1.02, s * 0.32, SAFETY_WHITE, 0.85);
}

/** A drum lying on its side, end towards the viewer — for stacks. */
export function drumEnd(g: G, x: number, y: number, r: number, body: number): void {
  g.fillStyle(dim(body, 0.5), 1); g.fillCircle(x, y, r + 1.5);
  g.fillStyle(body, 1); g.fillCircle(x, y, r);
  g.lineStyle(1.5, dim(body, 0.35), 1); g.strokeCircle(x, y, r * 0.72);
  g.fillStyle(dim(body, 0.6), 1); g.fillCircle(x + r * 0.35, y - r * 0.2, r * 0.16);
  g.fillStyle(lit(body, 0.3), 0.6); g.fillEllipse(x - r * 0.35, y - r * 0.45, r * 0.6, r * 0.24);
}

/**
 * The Queen's mark, stencilled on everything the tithe touches: a lamp's flame over three
 * wave-lines (the tide she owns).
 */
export function queensMark(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  g.fillStyle(color, a);
  g.fillTriangle(x - r * 0.42, y - r * 0.05, x + r * 0.42, y - r * 0.05, x, y - r * 1.05);
  g.fillCircle(x, y - r * 0.12, r * 0.4);
  g.lineStyle(Math.max(1, r * 0.16), color, a);
  for (let k = 0; k < 3; k++) {
    const yy = y + r * (0.35 + k * 0.28);
    const w = r * (1 - k * 0.12);
    g.beginPath();
    g.moveTo(x - w, yy);
    for (let s = 1; s <= 8; s++) {
      const xx = x - w + (2 * w * s) / 8;
      g.lineTo(xx, yy + Math.sin(s * Math.PI / 2) * r * 0.09);
    }
    g.strokePath();
  }
}

/**
 * A nodding pump-jack's frame — the samson post, the base skid and the gear housing. The
 * walking beam and horsehead are drawn separately (`pumpBeam`) because they move.
 * Returns the pivot point at the top of the post.
 */
export function pumpFrame(g: G, x: number, y: number, s: number): Pt {
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y + 2, 150 * s, 30 * s);
  // Skid.
  g.fillStyle(STEEL_DARK, 1); g.fillRect(x - 70 * s, y - 10 * s, 140 * s, 10 * s);
  g.fillStyle(STEEL, 1); g.fillRect(x - 68 * s, y - 9 * s, 136 * s, 5 * s);
  // Crank housing (rear) with a red counterweight.
  g.fillStyle(STEEL_DARK, 1); g.fillRect(x + 22 * s, y - 40 * s, 36 * s, 30 * s);
  g.fillStyle(STEEL, 1); g.fillRect(x + 24 * s, y - 38 * s, 32 * s, 26 * s);
  // Samson post — an A-frame.
  g.lineStyle(6 * s, STEEL_DARK, 1);
  g.lineBetween(x - 22 * s, y - 8 * s, x - 4 * s, y - 86 * s);
  g.lineBetween(x + 14 * s, y - 8 * s, x - 4 * s, y - 86 * s);
  g.lineStyle(3 * s, STEEL_LIT, 0.8);
  g.lineBetween(x - 20 * s, y - 10 * s, x - 5 * s, y - 84 * s);
  g.lineStyle(3 * s, STEEL_DARK, 1); g.lineBetween(x - 15 * s, y - 40 * s, x + 7 * s, y - 40 * s);
  // Wellhead under the horsehead: casing and a polished rod stuffing box.
  g.fillStyle(STEEL_DARK, 1); g.fillRect(x - 66 * s, y - 22 * s, 16 * s, 14 * s);
  g.fillStyle(SAFETY_RED, 1); g.fillRect(x - 64 * s, y - 20 * s, 12 * s, 5 * s);
  // Puddle of spilt crude at the wellhead.
  g.fillStyle(CRUDE, 0.9); g.fillEllipse(x - 58 * s, y + 2 * s, 44 * s, 12 * s);
  return { x: x - 4 * s, y: y - 88 * s };
}

/**
 * The moving half of a pump-jack: the walking beam rocks about the pivot by `rock` radians, the
 * horsehead at the front end drops the bridle into the well, and the pitman arm runs back to
 * the crank. `crankA` is the crank's angle.
 */
export function pumpBeam(g: G, pivot: Pt, s: number, rock: number, crankA: number, wellX: number, wellY: number): void {
  const L = 62 * s, R = 40 * s;
  const fx = pivot.x - Math.cos(rock) * L, fy = pivot.y - Math.sin(rock) * L;
  const bx = pivot.x + Math.cos(rock) * R, by = pivot.y + Math.sin(rock) * R;
  // Crank and counterweight.
  const cx = pivot.x + 44 * s, cy = pivot.y + 64 * s;
  const kx = cx + Math.cos(crankA) * 13 * s, ky = cy + Math.sin(crankA) * 13 * s;
  g.fillStyle(SAFETY_RED, 1); g.fillCircle(kx, ky, 9 * s);
  g.fillStyle(dim(SAFETY_RED, 0.4), 1); g.fillCircle(kx, ky, 3 * s);
  // Pitman arm.
  g.lineStyle(4 * s, STEEL_DARK, 1); g.lineBetween(bx, by, kx, ky);
  // Beam.
  g.lineStyle(9 * s, STEEL_DARK, 1); g.lineBetween(fx, fy, bx, by);
  g.lineStyle(5 * s, STEEL, 1); g.lineBetween(fx, fy, bx, by);
  g.fillStyle(STEEL_LIT, 1); g.fillCircle(pivot.x, pivot.y, 4.5 * s);
  // Horsehead: a curved plate at the front.
  g.fillStyle(STEEL_DARK, 1);
  g.fillPoints([
    new Phaser.Geom.Point(fx + 6 * s, fy - 8 * s), new Phaser.Geom.Point(fx - 10 * s, fy - 14 * s),
    new Phaser.Geom.Point(fx - 18 * s, fy), new Phaser.Geom.Point(fx - 10 * s, fy + 16 * s), new Phaser.Geom.Point(fx + 6 * s, fy + 10 * s),
  ], true);
  g.fillStyle(SAFETY_RED, 1);
  g.fillPoints([
    new Phaser.Geom.Point(fx + 3 * s, fy - 6 * s), new Phaser.Geom.Point(fx - 9 * s, fy - 11 * s),
    new Phaser.Geom.Point(fx - 15 * s, fy), new Phaser.Geom.Point(fx - 9 * s, fy + 13 * s), new Phaser.Geom.Point(fx + 3 * s, fy + 8 * s),
  ], true);
  // Bridle cable down to the well.
  g.lineStyle(1.5 * s, 0x1a1a1a, 1); g.lineBetween(fx - 17 * s, fy + 2 * s, wellX, wellY);
  g.fillStyle(STEEL_LIT, 1); g.fillRect(wellX - 2 * s, wellY - 8 * s, 4 * s, 8 * s);
}

/** A tall iron lamp-post with a glass lantern — one of the Queen's lamps that burn tithe oil. */
export function queensLamp(g: G, x: number, y: number, lit_ = true): void {
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 1, 22, 7);
  g.fillStyle(STEEL_DARK, 1); g.fillRect(x - 2.5, y - 70, 5, 70);
  g.fillRect(x - 7, y - 4, 14, 4);
  // Curled bracket.
  g.lineStyle(2, STEEL_DARK, 1);
  g.beginPath(); g.arc(x + 6, y - 66, 6, Math.PI, Math.PI * 1.9, false); g.strokePath();
  // Lantern: gilt cap, glass, base.
  g.fillStyle(GILT_DARK, 1); g.fillTriangle(x - 9, y - 84, x + 9, y - 84, x, y - 94);
  g.fillStyle(GILT, 1); g.fillRect(x - 8, y - 85, 16, 3);
  g.fillStyle(lit_ ? LAMP_GOLD : 0x2a2a2a, lit_ ? 0.95 : 1); g.fillRect(x - 6, y - 82, 12, 12);
  if (lit_) { g.fillStyle(LAMP_LIT, 1); g.fillTriangle(x - 2, y - 72, x + 2, y - 72, x, y - 79); }
  g.lineStyle(1, GILT_DARK, 1); g.strokeRect(x - 6, y - 82, 12, 12);
  g.fillStyle(GILT, 1); g.fillRect(x - 7, y - 70, 14, 2);
}

/** Red-and-white diagonal safety striping in a rect. */
export function safetyStripes(g: G, r: Rect, a = 0.85, step = 20): void {
  g.fillStyle(SAFETY_WHITE, a); g.fillRect(r.x, r.y, r.w, r.h);
  g.lineStyle(1.4, SAFETY_RED, a);
  for (let s = -r.h; s < r.w; s += step) {
    for (let k = 0; k < step / 2; k++) {
      const xa = r.x + s + k;
      const xs = Math.max(r.x, xa), xe = Math.min(r.x + r.w, xa + r.h);
      if (xe <= xs) continue;
      g.lineBetween(xs, r.y + (xs - xa), xe, r.y + (xe - xa));
    }
  }
}

/** A shipping crate stencilled for the tithe barges. */
export function tithCrate(g: G, x: number, y: number, s: number, stamp = true): void {
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x + 3, y + 3, s * 2.4, s * 0.7);
  g.fillStyle(0x3e2a1a, 1); g.fillRect(x - s - 1, y - s * 1.8 - 1, s * 2 + 2, s * 1.8 + 2);
  g.fillStyle(0x7a5a3a, 1); g.fillRect(x - s, y - s * 1.8, s * 2, s * 1.8);
  g.fillStyle(0x9a7a52, 1); g.fillRect(x - s, y - s * 1.8, s * 2, s * 0.32);
  g.lineStyle(2, 0x4a321e, 1);
  for (let k = 1; k < 4; k++) g.lineBetween(x - s, y - s * 1.8 + (s * 1.8 * k) / 4, x + s, y - s * 1.8 + (s * 1.8 * k) / 4);
  g.lineStyle(3, 0x4a321e, 1); g.strokeRect(x - s + 2, y - s * 1.8 + 2, s * 2 - 4, s * 1.8 - 4);
  if (stamp) queensMark(g, x, y - s * 0.85, s * 0.38, 0x1a1210, 0.6);
}

/** Tidemark lines on a wall — how high the Queen let the sea in, year on year. */
export function tidemarks(g: G, x0: number, x1: number, yTop: number, n: number): void {
  for (let k = 0; k < n; k++) {
    const y = yTop + k * 9;
    g.lineStyle(2, k === 0 ? 0x9ab8c0 : 0x5a7a80, 0.55 - k * 0.08);
    g.beginPath(); g.moveTo(x0, y);
    for (let x = x0; x <= x1; x += 8) g.lineTo(x, y + Math.sin(x * 0.3 + k) * 1.4);
    g.strokePath();
  }
}
