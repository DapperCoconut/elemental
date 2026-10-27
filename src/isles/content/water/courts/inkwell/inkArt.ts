import Phaser from 'phaser';
import type { Pt, Rect } from '../../../../IslesTypes';
import type { G } from '../../../../art/IsleArt';
import { BLUE, BLUE_DEEP, BLUE_LIT, INK, PAPER, WHITE } from './palette';

/**
 * The Inkwell's drawing hand — shared by the town painter, the fight floor, the five fight rules,
 * Prince Blot and the shop's charms, so the whole court is drawn with one pen.
 *
 * The house style is the Ink element's: a toon in ink on paper. Solid shapes get a thick black
 * outline; shading is hatching (parallel ink strokes clipped to the shape), never a grey fill;
 * highlights are bare white strokes; the only colour is the Queen's blue.
 */

export const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

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

// ── Hatching ──────────────────────────────────────────────────────────

/**
 * Clip the infinite line through `o` along unit direction `d` to a rect (Liang–Barsky).
 * Returns the segment, or null when the line misses.
 */
function clipToRect(o: Pt, d: Pt, r: Rect): [Pt, Pt] | null {
  let t0 = -1e6, t1 = 1e6;
  const tests: [number, number][] = [
    [-d.x, o.x - r.x], [d.x, r.x + r.w - o.x], [-d.y, o.y - r.y], [d.y, r.y + r.h - o.y],
  ];
  for (const [p, q] of tests) {
    if (Math.abs(p) < 1e-9) { if (q < 0) return null; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return null; if (t > t0) t0 = t; } else { if (t < t0) return null; if (t < t1) t1 = t; }
  }
  return [{ x: o.x + d.x * t0, y: o.y + d.y * t0 }, { x: o.x + d.x * t1, y: o.y + d.y * t1 }];
}

/** Parallel ink strokes across a rect at `angle` — the court's only way of drawing shade. */
export function hatchRect(g: G, r: Rect, spacing: number, color: number, alpha: number, width = 1, angle = -Math.PI / 4): void {
  if (r.w <= 0 || r.h <= 0) return;
  const d = { x: Math.cos(angle), y: Math.sin(angle) };
  const n = { x: -d.y, y: d.x };
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const reach = Math.hypot(r.w, r.h) / 2;
  g.lineStyle(width, color, alpha);
  for (let c = -reach; c <= reach; c += spacing) {
    const seg = clipToRect({ x: cx + n.x * c, y: cy + n.y * c }, d, r);
    if (seg) g.lineBetween(seg[0].x, seg[0].y, seg[1].x, seg[1].y);
  }
}

/** Hatching clipped to an axis-aligned ellipse — contact shadows, round shade. */
export function hatchEllipse(
  g: G, cx: number, cy: number, rx: number, ry: number, spacing: number, color: number, alpha: number, width = 1,
  angle = -Math.PI / 4,
): void {
  if (rx <= 0 || ry <= 0) return;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const nx = -dy, ny = dx;
  const reach = Math.max(rx, ry);
  g.lineStyle(width, color, alpha);
  for (let c = -reach; c <= reach; c += spacing) {
    const ox = nx * c, oy = ny * c;
    // ((ox + t dx)/rx)^2 + ((oy + t dy)/ry)^2 = 1
    const A = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
    const B = 2 * ((ox * dx) / (rx * rx) + (oy * dy) / (ry * ry));
    const C = (ox * ox) / (rx * rx) + (oy * oy) / (ry * ry) - 1;
    const disc = B * B - 4 * A * C;
    if (disc <= 0) continue;
    const s = Math.sqrt(disc);
    const t0 = (-B - s) / (2 * A), t1 = (-B + s) / (2 * A);
    g.lineBetween(cx + ox + dx * t0, cy + oy + dy * t0, cx + ox + dx * t1, cy + oy + dy * t1);
  }
}

/** A toon contact shadow: a hatched ellipse with a firm ink underline. */
export function inkShadow(g: G, x: number, y: number, w: number, h = w * 0.3, alpha = 0.55): void {
  hatchEllipse(g, x, y, w / 2, h / 2, 4, INK, alpha, 1.2);
  g.lineStyle(1.5, INK, alpha * 0.7);
  g.beginPath(); g.arc(x, y, w / 2, 0.15, Math.PI - 0.15, false); g.strokePath();
}

// ── Ink marks ─────────────────────────────────────────────────────────

/**
 * An ink blot: a lumpy black body, a ring of flung droplets and a couple of runs, with one
 * bare-paper glint on top so it reads as wet.
 */
export function inkBlot(g: G, x: number, y: number, r: number, rng: () => number, color = INK, alpha = 1, wet = true): void {
  const lumps = 11;
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < lumps; i++) {
    const a = (i / lumps) * Math.PI * 2;
    const k = 0.7 + rng() * 0.45;
    pts.push(P(x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * 0.7));
  }
  g.fillStyle(color, alpha); g.fillPoints(pts, true, true);
  for (let i = 0; i < 7; i++) {
    const a = rng() * Math.PI * 2;
    const d = r * (1.1 + rng() * 0.9);
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, 1 + rng() * r * 0.14);
  }
  for (let i = 0; i < 2; i++) {
    const a = rng() * Math.PI * 2;
    g.lineStyle(Math.max(1, r * 0.12), color, alpha);
    g.lineBetween(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.5, x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.05);
  }
  if (wet) { g.fillStyle(WHITE, alpha * 0.7); g.fillEllipse(x - r * 0.3, y - r * 0.25, r * 0.4, r * 0.14); }
}

/** A line of "handwriting": ink squiggles in a row, like faded text on a manuscript. */
export function scribble(g: G, x: number, y: number, w: number, rng: () => number, color = INK, alpha = 0.4, size = 1): void {
  g.lineStyle(1 * size, color, alpha);
  let cx = x;
  while (cx < x + w) {
    const word = (8 + rng() * 26) * size;
    g.beginPath();
    g.moveTo(cx, y);
    for (let k = 0; k < word; k += 3 * size) {
      g.lineTo(cx + k, y + Math.sin(k * 1.3 + rng() * 2) * 2.4 * size - (rng() < 0.15 ? 3 * size : 0));
    }
    g.strokePath();
    cx += word + 5 * size;
  }
}

/** The Queen's seal: a blue disc, a wave crowned with three points, a scalloped rim. */
export function queenSeal(g: G, x: number, y: number, r: number, alpha = 1): void {
  g.fillStyle(BLUE_DEEP, alpha); g.fillCircle(x, y, r + Math.max(1, r * 0.12));
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.18);
  }
  g.fillStyle(BLUE, alpha); g.fillCircle(x, y, r * 0.9);
  // The wave.
  g.lineStyle(Math.max(1, r * 0.16), WHITE, alpha);
  g.beginPath();
  for (let k = 0; k <= 12; k++) {
    const t = k / 12;
    const wx = x - r * 0.6 + t * r * 1.2;
    const wy = y + r * 0.15 + Math.sin(t * Math.PI * 2) * r * 0.16;
    if (k === 0) g.moveTo(wx, wy); else g.lineTo(wx, wy);
  }
  g.strokePath();
  // The crown over it.
  g.fillStyle(WHITE, alpha);
  g.fillTriangle(x - r * 0.45, y - r * 0.12, x - r * 0.3, y - r * 0.52, x - r * 0.15, y - r * 0.12);
  g.fillTriangle(x - r * 0.15, y - r * 0.12, x, y - r * 0.62, x + r * 0.15, y - r * 0.12);
  g.fillTriangle(x + r * 0.15, y - r * 0.12, x + r * 0.3, y - r * 0.52, x + r * 0.45, y - r * 0.12);
  g.lineStyle(1, BLUE_LIT, alpha * 0.8); g.strokeCircle(x, y, r * 0.75);
}

/**
 * A pegged decree: a paper sheet (swinging by `tilt`), three lines of ink text, a fat heading
 * and the blue seal at the foot. `x, y` is the peg.
 */
export function decreeSheet(g: G, x: number, y: number, w: number, h: number, tilt: number, seed: number): void {
  const c = Math.cos(tilt), s = Math.sin(tilt);
  const pt = (u: number, v: number): Phaser.Geom.Point => P(x + u * c - v * s, y + u * s + v * c);
  const corners = [pt(-w / 2, 0), pt(w / 2, 0), pt(w / 2 + 1, h), pt(-w / 2 - 1, h)];
  g.fillStyle(INK, 1); g.fillPoints(corners.map((p) => P(p.x + 1.5, p.y + 1.5)), true, true);
  g.fillStyle(PAPER, 1); g.fillPoints(corners, true, true);
  g.lineStyle(1.2, INK, 1); g.strokePoints(corners, true, true);
  // Heading, then text lines.
  const line = (v: number, len: number, wgt: number): void => {
    const a = pt(-w / 2 + 3, v), b = pt(-w / 2 + 3 + len, v);
    g.lineStyle(wgt, INK, 0.85); g.lineBetween(a.x, a.y, b.x, b.y);
  };
  line(h * 0.18, w - 6, 2);
  for (let k = 0; k < 3; k++) line(h * (0.36 + k * 0.14), (w - 6) * (0.6 + ((seed * 7 + k * 3) % 5) / 12), 0.9);
  const sp = pt(w * 0.18, h * 0.82);
  g.fillStyle(BLUE, 1); g.fillCircle(sp.x, sp.y, Math.max(1.6, w * 0.13));
  // The peg.
  g.fillStyle(INK, 1); g.fillRect(x - 1.5, y - 3, 3, 6);
}

/** A cartoon impact burst — eight ink spikes round a white star. Used for fight flourishes. */
export function inkBurst(g: G, x: number, y: number, r: number, alpha: number, color = INK): void {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const k = i % 2 ? 0.5 : 1;
    pts.push(P(x + Math.cos(a) * r * k, y + Math.sin(a) * r * k));
  }
  g.fillStyle(WHITE, alpha); g.fillPoints(pts, true, true);
  g.lineStyle(2, color, alpha); g.strokePoints(pts, true, true);
}

/** A ring of ink droplets flung outward — splash flourishes. */
export function splashRing(g: G, x: number, y: number, r: number, alpha: number, n = 10, color = INK): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + i * 0.37;
    const d = r * (0.8 + ((i * 7) % 5) / 10);
    g.fillStyle(color, alpha); g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, 2 + (i % 3));
  }
}

/** One glyph of the court's lettering — a handful of strokes in a cell, deterministic per code. */
export function glyph(g: G, x: number, y: number, s: number, code: number, color = INK, alpha = 1, width = 2): void {
  g.lineStyle(width, color, alpha);
  const k = (code * 2654435761) >>> 0;
  const strokes = 2 + (k % 3);
  for (let i = 0; i < strokes; i++) {
    const b = (k >>> (i * 5)) & 31;
    const ax = x + (((b & 3) / 3) - 0.5) * s;
    const ay = y + ((((b >> 2) & 3) / 3) - 0.5) * s;
    const bx = x + ((((b >> 1) & 3) / 3) - 0.5) * s;
    const by = y + ((((b >> 3) & 3) / 3) - 0.5) * s;
    if (Math.abs(ax - bx) + Math.abs(ay - by) < 2) { g.strokeCircle(x, y, s * 0.3); continue; }
    g.lineBetween(ax, ay, bx, by);
  }
}
