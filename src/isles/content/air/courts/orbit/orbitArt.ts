import Phaser from 'phaser';
import type { Pt, Rect } from '../../../../IslesTypes';
import type { G } from '../../../../art/IsleArt';
import { dim, lit } from '../../../../art/IsleArt';
import {
  BRASS, BRASS_DARK, BRASS_LIT, CLOUD, CLOUD_SHADE, ENAMEL, IRON, IRON_DARK, IRON_LIT, LODE, LODE_GLINT, LODE_MID,
  LODE_SHEEN, METER, NAVY_DARK, WHITE,
} from './palette';

/**
 * The Orbit Court's drawing hand — gears, brass planets, the black lodestone, iron chain, sling
 * hoops, clock-faces, dashed orbits and breath-meters — shared by the town painter, the fight
 * floor, the five fight rules, Prince Perigee and the Almanac's charms, so the whole court is cut
 * from one sheet of brass.
 */

export const inView = (v: Rect, x: number, y: number, pad: number): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

export function polyline(g: G, pts: Pt[]): void {
  if (pts.length < 2) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();
}

/** A point a fraction `t` (0–1) of the way along a polyline, by length. */
export function along(pts: Pt[], t: number): Pt {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
  let want = Phaser.Math.Clamp(t, 0, 1) * total;
  for (let i = 1; i < pts.length; i++) {
    const seg = dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
    if (want <= seg || i === pts.length - 1) {
      const k = seg > 0 ? Math.min(1, want / seg) : 0;
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k };
    }
    want -= seg;
  }
  return pts[pts.length - 1];
}

/**
 * A brass gear seen face-on: a toothed rim, a sunk web with spoke holes, and a hub. `rot` turns
 * it (radians) so a train of gears can be meshed and animated.
 */
export function gear(g: G, x: number, y: number, r: number, teeth: number, color: number, rot = 0, alpha = 1): void {
  const pts: Phaser.Geom.Point[] = [];
  const depth = Math.max(2, r * 0.16);
  for (let i = 0; i < teeth; i++) {
    const a0 = rot + (i / teeth) * Math.PI * 2;
    const step = (Math.PI * 2) / teeth;
    pts.push(new Phaser.Geom.Point(x + Math.cos(a0) * r, y + Math.sin(a0) * r));
    pts.push(new Phaser.Geom.Point(x + Math.cos(a0 + step * 0.3) * (r + depth), y + Math.sin(a0 + step * 0.3) * (r + depth)));
    pts.push(new Phaser.Geom.Point(x + Math.cos(a0 + step * 0.55) * (r + depth), y + Math.sin(a0 + step * 0.55) * (r + depth)));
    pts.push(new Phaser.Geom.Point(x + Math.cos(a0 + step * 0.85) * r, y + Math.sin(a0 + step * 0.85) * r));
  }
  g.fillStyle(dim(color, 0.45), alpha); g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x + 1.5, p.y + 1.5)), true, true);
  g.fillStyle(color, alpha); g.fillPoints(pts, true, true);
  g.fillStyle(dim(color, 0.22), alpha); g.fillCircle(x, y, r * 0.78);
  const holes = teeth > 14 ? 6 : 4;
  for (let i = 0; i < holes; i++) {
    const a = rot + (i / holes) * Math.PI * 2 + 0.4;
    g.fillStyle(dim(color, 0.6), alpha); g.fillCircle(x + Math.cos(a) * r * 0.48, y + Math.sin(a) * r * 0.48, r * 0.16);
  }
  g.fillStyle(lit(color, 0.2), alpha); g.fillCircle(x, y, r * 0.24);
  g.fillStyle(dim(color, 0.55), alpha); g.fillCircle(x, y, r * 0.1);
  g.lineStyle(1, lit(color, 0.35), 0.6 * alpha);
  g.beginPath(); g.arc(x, y, r * 0.95, Math.PI * 1.1, Math.PI * 1.6, false); g.strokePath();
}

/**
 * A brass orrery planet: a ball with a lit cap, a dark limb, an equator band — and, if `ringed`,
 * a tilted ring round it (drawn back half first so the ball sits inside it).
 */
export function planet(g: G, x: number, y: number, r: number, color: number, ringed = false, alpha = 1, band = BRASS_DARK): void {
  if (ringed) {
    g.lineStyle(Math.max(2, r * 0.22), dim(BRASS, 0.2), alpha);
    g.beginPath(); g.arc(x, y, r * 1.7, Math.PI, Math.PI * 2, false); g.strokePath();
  }
  g.fillStyle(0x000000, 0.25 * alpha); g.fillEllipse(x + r * 0.15, y + r * 0.95, r * 1.6, r * 0.45);
  g.fillStyle(dim(color, 0.45), alpha); g.fillCircle(x, y, r);
  g.fillStyle(color, alpha); g.fillCircle(x - r * 0.08, y - r * 0.08, r * 0.9);
  g.fillStyle(band, 0.8 * alpha); g.fillEllipse(x, y + r * 0.08, r * 1.82, r * 0.34);
  g.fillStyle(lit(color, 0.45), 0.75 * alpha); g.fillEllipse(x - r * 0.32, y - r * 0.38, r * 0.7, r * 0.42);
  g.fillStyle(WHITE, 0.6 * alpha); g.fillCircle(x - r * 0.42, y - r * 0.45, Math.max(1, r * 0.13));
  if (ringed) {
    g.lineStyle(Math.max(2, r * 0.22), BRASS_LIT, alpha);
    g.beginPath(); g.arc(x, y, r * 1.7, 0, Math.PI, false); g.strokePath();
  }
}

/**
 * The black lodestone: a sphere so dark it reads as a hole, with a thin violet rim where its
 * pull bends the light, a slow sheen crossing its face and filings standing on it like fur.
 * `t` in seconds animates the sheen; pass 0 for a baked one.
 */
export function lodestone(g: G, x: number, y: number, r: number, t = 0, alpha = 1): void {
  g.fillStyle(LODE_GLINT, 0.08 * alpha); g.fillCircle(x, y, r * 1.25);
  g.fillStyle(LODE_SHEEN, 0.18 * alpha); g.fillCircle(x, y, r * 1.08);
  g.fillStyle(LODE, alpha); g.fillCircle(x, y, r);
  g.fillStyle(LODE_MID, 0.9 * alpha); g.fillCircle(x - r * 0.18, y - r * 0.2, r * 0.72);
  g.fillStyle(LODE, alpha); g.fillCircle(x - r * 0.08, y - r * 0.06, r * 0.6);
  // A sheen band sliding across the face.
  const sx = x + Math.sin(t * 0.35) * r * 0.4;
  g.fillStyle(LODE_SHEEN, 0.35 * alpha); g.fillEllipse(sx - r * 0.25, y - r * 0.5, r * 0.7, r * 0.2);
  // The violet limb.
  g.lineStyle(Math.max(1.5, r * 0.04), LODE_GLINT, 0.75 * alpha); g.strokeCircle(x, y, r);
  g.lineStyle(1, LODE_GLINT, 0.25 * alpha); g.strokeCircle(x, y, r + Math.max(3, r * 0.06));
  // Filings standing up off the surface along the rim.
  const n = Math.max(10, Math.floor(r / 3));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.13;
    const len = r * (0.06 + 0.05 * ((i * 7) % 3));
    g.lineStyle(1, LODE_GLINT, 0.55 * alpha);
    g.lineBetween(x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a) * (r + len), y + Math.sin(a) * (r + len));
  }
}

/**
 * Iron chain from `a` to `b`, sagging by `sag` px at the middle. Drawn as two rails of links
 * alternating face-on and edge-on, so it reads as chain at any scale.
 */
export function chain(g: G, a: Pt, b: Pt, sag: number, alpha = 1, linkLen = 12, color = IRON): void {
  const len = dist(a.x, a.y, b.x, b.y);
  const n = Math.max(2, Math.floor(len / linkLen));
  let px = a.x, py = a.y;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * sag;
    const mx = (px + x) / 2, my = (py + y) / 2;
    const ang = Math.atan2(y - py, x - px);
    if (i % 2) {
      g.lineStyle(3, dim(color, 0.3), alpha); g.strokeEllipse(mx, my + 1, linkLen * 1.05, linkLen * 0.55);
      g.lineStyle(2, color, alpha); g.strokeEllipse(mx, my, linkLen, linkLen * 0.5);
      g.lineStyle(1, IRON_LIT, 0.5 * alpha); g.lineBetween(mx - linkLen * 0.3, my - linkLen * 0.18, mx + linkLen * 0.1, my - linkLen * 0.22);
    } else {
      g.lineStyle(3, color, alpha);
      g.lineBetween(mx - Math.cos(ang) * linkLen * 0.5, my - Math.sin(ang) * linkLen * 0.5, mx + Math.cos(ang) * linkLen * 0.5, my + Math.sin(ang) * linkLen * 0.5);
    }
    px = x; py = y;
  }
}

/** A cheaper chain for per-frame drawing: a rail and link ticks. */
export function chainLite(g: G, a: Pt, b: Pt, sag: number, alpha = 1, color = IRON): void {
  const len = dist(a.x, a.y, b.x, b.y);
  const n = Math.max(3, Math.floor(len / 26));
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * sag });
  }
  g.lineStyle(4, IRON_DARK, 0.6 * alpha); polyline(g, pts);
  g.lineStyle(2, color, alpha); polyline(g, pts);
  for (let i = 1; i < pts.length; i++) {
    const m = { x: (pts[i - 1].x + pts[i].x) / 2, y: (pts[i - 1].y + pts[i].y) / 2 };
    g.lineStyle(1.5, IRON_LIT, 0.55 * alpha); g.strokeEllipse(m.x, m.y, 8, 4);
  }
}

/**
 * A slingshot hoop standing on (x, y): a brass ring on two legs with a leather band stretched
 * across the inside. `charge` 0–1 lights it as it re-tensions.
 */
export function hoop(g: G, x: number, y: number, r: number, charge = 1, alpha = 1): void {
  const cy = y - r - 10;
  g.fillStyle(0x000000, 0.25 * alpha); g.fillEllipse(x, y + 2, r * 2.4, r * 0.4);
  g.lineStyle(4, BRASS_DARK, alpha);
  g.lineBetween(x - r * 0.75, y, x - r * 0.55, cy + r * 0.6);
  g.lineBetween(x + r * 0.75, y, x + r * 0.55, cy + r * 0.6);
  g.lineStyle(Math.max(4, r * 0.18), BRASS_DARK, alpha); g.strokeCircle(x, cy, r);
  g.lineStyle(Math.max(2, r * 0.1), charge >= 1 ? BRASS_LIT : BRASS, alpha); g.strokeCircle(x, cy, r - 1);
  // The band: taut when ready, slack while it re-tensions.
  const slack = (1 - charge) * r * 0.5;
  g.lineStyle(3, 0x6e3d22, alpha);
  g.beginPath(); g.moveTo(x - r * 0.95, cy); g.lineTo(x, cy + slack); g.lineTo(x + r * 0.95, cy); g.strokePath();
  if (charge >= 1) { g.fillStyle(BRASS_LIT, 0.12 * alpha); g.fillCircle(x, cy, r * 1.3); }
}

/** A clock-face: enamel dial, brass bezel, twelve ticks and two hands at time `t` (seconds). */
export function clockFace(g: G, x: number, y: number, r: number, t: number, alpha = 1): void {
  g.fillStyle(BRASS_DARK, alpha); g.fillCircle(x, y, r + 2);
  g.fillStyle(BRASS, alpha); g.fillCircle(x, y, r);
  g.fillStyle(ENAMEL, alpha); g.fillCircle(x, y, r * 0.82);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.lineStyle(i % 3 === 0 ? 1.6 : 1, NAVY_DARK, alpha);
    g.lineBetween(x + Math.cos(a) * r * 0.66, y + Math.sin(a) * r * 0.66, x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78);
  }
  const hA = t * 0.05 - Math.PI / 2, mA = t * 0.6 - Math.PI / 2;
  g.lineStyle(Math.max(1.5, r * 0.1), NAVY_DARK, alpha); g.lineBetween(x, y, x + Math.cos(hA) * r * 0.42, y + Math.sin(hA) * r * 0.42);
  g.lineStyle(Math.max(1, r * 0.06), NAVY_DARK, alpha); g.lineBetween(x, y, x + Math.cos(mA) * r * 0.66, y + Math.sin(mA) * r * 0.66);
  g.fillStyle(BRASS_DARK, alpha); g.fillCircle(x, y, Math.max(1, r * 0.08));
}

/** A dashed ellipse; `phase` (0–1) slides the dashes round it so an orbit can be seen turning. */
export function dashedEllipse(g: G, cx: number, cy: number, rx: number, ry: number, dashes: number, phase: number, width: number, color: number, alpha: number, rot = 0): void {
  g.lineStyle(width, color, alpha);
  const c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < dashes; i++) {
    const a0 = ((i + phase) / dashes) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2 / dashes) * 0.55;
    g.beginPath();
    for (let k = 0; k <= 4; k++) {
      const a = a0 + (a1 - a0) * (k / 4);
      const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
      const x = cx + ex * c - ey * s, y = cy + ex * s + ey * c;
      if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokePath();
  }
}

/** An arrowhead + shaft from (x, y) pointing at `ang`. */
export function arrow(g: G, x: number, y: number, ang: number, len: number, color: number, alpha: number, w = 3): void {
  const tx = x + Math.cos(ang) * len, ty = y + Math.sin(ang) * len;
  g.lineStyle(w, color, alpha); g.lineBetween(x, y, tx, ty);
  g.fillStyle(color, alpha);
  g.fillTriangle(
    tx + Math.cos(ang) * w * 3, ty + Math.sin(ang) * w * 3,
    tx + Math.cos(ang + 2.5) * w * 3, ty + Math.sin(ang + 2.5) * w * 3,
    tx + Math.cos(ang - 2.5) * w * 3, ty + Math.sin(ang - 2.5) * w * 3,
  );
}

/** A small brass breath-meter dial with the King's red needle — on chests, doors and posts. */
export function breathMeter(g: G, x: number, y: number, r: number, reading: number, alpha = 1): void {
  g.fillStyle(BRASS_DARK, alpha); g.fillCircle(x, y, r + 1.5);
  g.fillStyle(ENAMEL, alpha); g.fillCircle(x, y, r);
  g.lineStyle(1, METER, 0.6 * alpha);
  g.beginPath(); g.arc(x, y, r * 0.75, Math.PI * 1.65, Math.PI * 1.95, false); g.strokePath();
  const a = Math.PI * (1.05 + 0.9 * Phaser.Math.Clamp(reading, 0, 1));
  g.lineStyle(Math.max(1, r * 0.2), METER, alpha); g.lineBetween(x, y, x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8);
  g.fillStyle(BRASS_DARK, alpha); g.fillCircle(x, y, Math.max(1, r * 0.18));
}

/** A puff of cloud: overlapping white rounds with a blue underside. */
export function cloudPuff(g: G, x: number, y: number, r: number, alpha: number, seed: number): void {
  g.fillStyle(CLOUD_SHADE, alpha); g.fillEllipse(x, y + r * 0.25, r * 2.4, r * 0.9);
  for (let i = 0; i < 4; i++) {
    const ox = (((seed + i) * 37) % 9 - 4) / 4 * r * 0.7;
    const rr = r * (0.55 + (((seed + i) * 13) % 5) / 10);
    g.fillStyle(CLOUD, alpha); g.fillCircle(x + ox, y - rr * 0.25, rr);
  }
}

/** Iron filings in a tuft, combed in direction `ang` — the moon's pull, made visible. */
export function filings(g: G, x: number, y: number, ang: number, len: number, alpha: number): void {
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  for (let i = -2; i <= 2; i++) {
    const ox = x + nx * i * 3, oy = y + ny * i * 3;
    const l = len * (1 - Math.abs(i) * 0.18);
    g.lineStyle(1, LODE_SHEEN, alpha); g.lineBetween(ox, oy, ox + Math.cos(ang) * l, oy + Math.sin(ang) * l);
  }
}

/** A pebble or moonlet: a lumpy rock with a lit face. */
export function pebble(g: G, x: number, y: number, r: number, color: number, alpha = 1): void {
  g.fillStyle(dim(color, 0.45), alpha); g.fillEllipse(x + 1, y + 1, r * 2.1, r * 1.8);
  g.fillStyle(color, alpha); g.fillEllipse(x, y, r * 2, r * 1.7);
  g.fillStyle(lit(color, 0.3), alpha * 0.8); g.fillEllipse(x - r * 0.3, y - r * 0.35, r * 0.9, r * 0.6);
}
