import Phaser from 'phaser';
import type { Pt, Rect } from '../../../../IslesTypes';
import type { G } from '../../../../art/IsleArt';
import { dim, lit } from '../../../../art/IsleArt';
import {
  CAP_RED, GILL, GLOW, GLOW_DEEP, GLOW_WASH, ROT, ROT_LIT, SPORE, SPOT, STEM, STEM_SHADE, WHITE,
} from './palette';

/**
 * The Spore Court's drawing hand — toadstools, glowcaps, puffballs, hyphal threads and spore
 * clouds — shared by the town painter, the fight floor, the five fight rules, Prince Mycel and
 * the shop's charms, so the whole court grows from one bed.
 */

export const inView = (v: Rect, x: number, y: number, pad: number): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

export function polyline(g: G, pts: Pt[]): void {
  if (pts.length < 2) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();
}

export function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

/**
 * A toadstool standing on (x, y): a stem that flares at the foot, a domed cap with a dark gill
 * rim under it, and (optionally) the cream spots of a fly agaric. `s` is the cap's half-width.
 */
export function toadstool(g: G, x: number, y: number, s: number, cap: number, spots = true, alpha = 1, seed = 1): void {
  const stemW = s * 0.42, stemH = s * 1.05;
  g.fillStyle(0x000000, 0.28 * alpha); g.fillEllipse(x, y + 1, s * 1.5, s * 0.4);
  // Stem with its skirt (the annulus) and a shaded right side.
  g.fillStyle(STEM_SHADE, alpha); g.fillRoundedRect(x - stemW / 2 - 1, y - stemH, stemW + 2, stemH, Math.min(4, stemW / 3));
  g.fillStyle(STEM, alpha); g.fillRoundedRect(x - stemW / 2, y - stemH, stemW * 0.72, stemH, Math.min(4, stemW / 3));
  g.fillStyle(STEM_SHADE, alpha); g.fillEllipse(x, y - stemH * 0.62, stemW * 1.5, stemW * 0.42);
  g.fillStyle(STEM_SHADE, alpha); g.fillEllipse(x, y - 1, stemW * 1.35, stemW * 0.5);
  // Gill rim, then the cap dome.
  const cy = y - stemH;
  g.fillStyle(GILL, alpha); g.fillEllipse(x, cy + 1, s * 1.9, s * 0.42);
  g.fillStyle(dim(cap, 0.35), alpha);
  g.beginPath(); g.arc(x, cy, s, Math.PI, 0, false); g.closePath(); g.fillPath();
  g.fillStyle(cap, alpha);
  g.beginPath(); g.arc(x - s * 0.06, cy - 1, s * 0.92, Math.PI, 0, false); g.closePath(); g.fillPath();
  g.fillStyle(lit(cap, 0.25), alpha * 0.8); g.fillEllipse(x - s * 0.35, cy - s * 0.6, s * 0.6, s * 0.22);
  if (!spots) return;
  const n = 3 + (seed % 4);
  for (let i = 0; i < n; i++) {
    const a = Math.PI + 0.35 + ((i * 0.9 + seed * 0.37) % 1) * (Math.PI - 0.7);
    const r = s * (0.35 + ((i * 0.53 + seed * 0.21) % 1) * 0.45);
    g.fillStyle(SPOT, 0.92 * alpha);
    g.fillEllipse(x + Math.cos(a) * r, cy + Math.sin(a) * r * 0.95, s * 0.2, s * 0.13);
  }
}

/** A cluster of glowcaps — thin stems, bell caps lit from inside, a teal halo. */
export function glowcaps(g: G, x: number, y: number, s: number, bright = 1, seed = 1): void {
  g.fillStyle(GLOW, 0.08 * bright); g.fillCircle(x, y - s * 1.2, s * 3.2);
  g.fillStyle(GLOW, 0.1 * bright); g.fillCircle(x, y - s * 1.1, s * 1.9);
  const n = 3 + (seed % 3);
  for (let i = 0; i < n; i++) {
    const dx = (i - (n - 1) / 2) * s * 0.75 + Math.sin(seed + i * 2.3) * s * 0.2;
    const h = s * (1.1 + ((i * 0.61 + seed * 0.13) % 1) * 1.2);
    const lean = Math.sin(seed * 1.7 + i) * s * 0.25;
    g.lineStyle(Math.max(1, s * 0.16), GLOW_WASH, 0.55); g.lineBetween(x + dx, y, x + dx + lean, y - h);
    const cs = s * (0.38 + ((i * 0.37 + seed * 0.29) % 1) * 0.28);
    g.fillStyle(GLOW_DEEP, 0.9); g.fillEllipse(x + dx + lean, y - h, cs * 2.1, cs * 1.3);
    g.fillStyle(GLOW, 0.75 + 0.25 * bright); g.fillEllipse(x + dx + lean, y - h - cs * 0.15, cs * 1.7, cs * 0.95);
    g.fillStyle(WHITE, 0.5 * bright); g.fillCircle(x + dx + lean - cs * 0.3, y - h - cs * 0.3, cs * 0.25);
  }
}

/**
 * A puffball: a fat white globe sat on the moss, its skin pebbled. `ripe` 0–1 browns it, cracks
 * the top and lets a wisp of spore leak — a ripe puffball is about to go.
 */
export function puffball(g: G, x: number, y: number, r: number, ripe: number, seed = 1): void {
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + r * 0.55, r * 2.1, r * 0.6);
  const skin = Phaser.Display.Color.Interpolate.ColorWithColor(
    Phaser.Display.Color.ValueToColor(0xf1ead8), Phaser.Display.Color.ValueToColor(0x9c8259), 100, Math.round(ripe * 100),
  );
  const c = Phaser.Display.Color.GetColor(skin.r, skin.g, skin.b);
  g.fillStyle(dim(c, 0.3), 1); g.fillEllipse(x, y, r * 2.05, r * 1.8);
  g.fillStyle(c, 1); g.fillEllipse(x - r * 0.05, y - r * 0.06, r * 1.9, r * 1.65);
  g.fillStyle(lit(c, 0.35), 0.8); g.fillEllipse(x - r * 0.35, y - r * 0.4, r * 0.7, r * 0.4);
  for (let i = 0; i < 7; i++) {
    const a = seed * 1.3 + i * 0.9;
    g.fillStyle(dim(c, 0.18), 0.7);
    g.fillCircle(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.45, Math.max(1, r * 0.07));
  }
  if (ripe > 0.55) {
    // Star-crack on the crown and a leak of spore.
    const k = (ripe - 0.55) / 0.45;
    g.lineStyle(1.5, dim(c, 0.55), 0.9);
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (i - 1.5) * 0.6;
      g.lineBetween(x, y - r * 0.55, x + Math.cos(a) * r * 0.45 * k, y - r * 0.55 + Math.sin(a) * r * 0.3 * k);
    }
    g.fillStyle(SPORE, 0.35 * k); g.fillCircle(x, y - r * 0.85, r * 0.35 * k);
  }
}

/**
 * A hyphal thread from a to b — a wandering line, not a straight one, with a soft glow under it.
 * `seed` fixes its wander so the same thread draws the same way every frame.
 */
export function hypha(g: G, a: Pt, b: Pt, w: number, color: number, alpha: number, seed: number, glowA = 0.15): void {
  const pts = hyphaPoints(a, b, seed);
  if (glowA > 0) { g.lineStyle(w * 4, color, glowA * alpha); polyline(g, pts); }
  g.lineStyle(w, color, alpha); polyline(g, pts);
}

/** The wandering path a thread takes from a to b (shared by draw and hit tests). */
export function hyphaPoints(a: Pt, b: Pt, seed: number, n = 10): Pt[] {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const amp = Math.min(22, len * 0.08);
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const wob = Math.sin(t * Math.PI) * (Math.sin(seed * 3.1 + t * 7.3) * amp + Math.sin(seed * 1.7 + t * 15) * amp * 0.25);
    pts.push({ x: a.x + dx * t + nx * wob, y: a.y + dy * t + ny * wob });
  }
  return pts;
}

/** A point `t` (0–1) of the way along a polyline, by length. */
export function along(pts: Pt[], t: number): Pt {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
  let want = Phaser.Math.Clamp(t, 0, 1) * total;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const d = dist(a.x, a.y, b.x, b.y);
    if (want <= d) { const k = d > 0 ? want / d : 0; return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; }
    want -= d;
  }
  return pts[pts.length - 1];
}

/** A cloud of spores: soft overlapping puffs with motes turning inside. */
export function sporeCloud(g: G, x: number, y: number, r: number, color: number, alpha: number, t: number, seed: number): void {
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + seed + t * 0.25;
    g.fillStyle(color, 0.22 * alpha);
    g.fillCircle(x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.32, r * 0.55);
  }
  g.fillStyle(color, 0.26 * alpha); g.fillCircle(x, y, r * 0.6);
  for (let i = 0; i < 14; i++) {
    const a = seed * 2.1 + i * 2.39 + t * (0.6 + (i % 3) * 0.3);
    const rr = r * (0.2 + ((i * 0.37) % 1) * 0.7);
    g.fillStyle(lit(color, 0.4), 0.7 * alpha);
    g.fillCircle(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.75, 1.6);
  }
}

/** A patch of rot on the floor — a bruise-purple stain with pale hyphae creeping out of it. */
export function rotPatch(g: G, x: number, y: number, r: number, alpha: number, seed: number): void {
  g.fillStyle(ROT, 0.55 * alpha); g.fillEllipse(x, y, r * 2.2, r * 1.3);
  g.fillStyle(dim(ROT, 0.4), 0.6 * alpha); g.fillEllipse(x + r * 0.1, y + r * 0.08, r * 1.3, r * 0.75);
  g.lineStyle(1, ROT_LIT, 0.7 * alpha);
  for (let i = 0; i < 6; i++) {
    const a = seed + i * 1.05;
    const ex = x + Math.cos(a) * r * 1.4, ey = y + Math.sin(a) * r * 0.85;
    g.lineBetween(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.35, ex, ey);
    g.fillStyle(ROT_LIT, 0.6 * alpha); g.fillCircle(ex, ey, 1.4);
  }
}

/** A ring of little toadstools — a fairy ring — `k` 0–1 of them sprouted. */
export function fairyRing(g: G, x: number, y: number, r: number, k: number, cap = CAP_RED, count = 14, seed = 1, sMul = 1, squash = 0.72): void {
  const n = Math.floor(count * k + 0.0001);
  for (let i = 0; i < n; i++) {
    const a = (i / count) * Math.PI * 2 + seed;
    const s = (5 + ((i * 0.7 + seed) % 1) * 3) * sMul;
    toadstool(g, x + Math.cos(a) * r, y + Math.sin(a) * r * squash, s, cap, true, 1, i + seed);
  }
}
