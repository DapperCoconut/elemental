import Phaser from 'phaser';
import type { Pt, Rect } from '../../../../IslesTypes';
import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import {
  BOTTLE, BOTTLE_EDGE, BRASS, BRASS_DARK, BRASS_LIT, BREATH, CANVAS, CANVAS_SHADE, CLOUD, CLOUD_DEEP, CLOUD_LILAC,
  CLOUD_SHADE, CORK, FLAG, FLAG_DARK, FLAG_LIT, FLOUR, GRAIN, KITE_COLORS, LEATHER, LEATHER_DARK, LEATHER_LIT, LIME,
  LIME_SHADE, ROCK, ROCK_DARK, ROCK_LIT, ROPE, ROPE_DARK, SACK, SACK_DARK, SKY, SLATE, SLATE_DARK, SLATE_LIT, TAR,
  TAR_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT, TURF, TURF_DARK, TURF_DEEP, TURF_GOLD, TURF_LIT,
} from './palette';

/**
 * The Galeward Court's drawing kit — every windmill, vane, kite and bridge in the mill town, the
 * five fights and the Prince's weather-house is drawn from here, so they share one hand.
 *
 * The rule of the place: *the wind is always from the west.* Grass is combed east, smoke leans
 * east, sails face west, kites stream east of their posts, cloud tears off the cliff edges east.
 * Anything that moves (sails, vanes, kites, cloud) is split into a static part for a piece and an
 * animated part that takes `t` (seconds) for the painter's `animate` / `animateOver`.
 */

// ── Ground ───────────────────────────────────────────────────────────

/** Wind-combed turf: a base, mottling, and thousands of short strokes all leaning east. */
export function combedTurf(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(TURF, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const area = (r.w * r.h) / 1e6;
  for (let i = 0; i < 46 * area; i++) {
    g.fillStyle(rng() < 0.5 ? TURF_LIT : TURF_DARK, 0.18 + rng() * 0.25);
    g.fillEllipse(r.x + rng() * r.w, r.y + rng() * r.h, 160 + rng() * 260, 40 + rng() * 70);
  }
  for (let i = 0; i < 14 * area; i++) {
    g.fillStyle(TURF_GOLD, 0.2 + rng() * 0.2);
    g.fillEllipse(r.x + rng() * r.w, r.y + rng() * r.h, 120 + rng() * 200, 30 + rng() * 40);
  }
  // Blades, combed east by the wind.
  for (let i = 0; i < 2600 * area; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    const len = 4 + rng() * 6;
    g.lineStyle(1, rng() < 0.5 ? TURF_LIT : TURF_DEEP, 0.3 + rng() * 0.3);
    g.lineBetween(x, y, x + len, y - len * 0.25);
  }
  // Clover and thrift, flattened.
  for (let i = 0; i < 180 * area; i++) {
    g.fillStyle(rng() < 0.6 ? 0xf0b8c8 : 0xf6f0d0, 0.6);
    g.fillCircle(r.x + rng() * r.w, r.y + rng() * r.h, 1.4);
  }
}

/** A flagged lane: pale slabs laid lengthwise down a polyline, kerbed in turf-dark. */
export function flagLane(g: G, pts: Pt[], w: number, rng: () => number): void {
  const strokeLine = (width: number, color: number, a = 1) => {
    g.lineStyle(width, color, a);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
    g.fillStyle(color, a);
    for (const p of pts) g.fillCircle(p.x, p.y, width / 2);
  };
  strokeLine(w + 10, TURF_DEEP, 0.55);
  strokeLine(w, FLAG_DARK);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / (len || 1), uy = (b.y - a.y) / (len || 1);
    const step = 26;
    for (let d = 0; d < len; d += step) {
      for (let k = -1; k <= 1; k += 2) {
        const off = k * w * 0.24 + (rng() - 0.5) * 4;
        const cx = a.x + ux * d - uy * off, cy = a.y + uy * d + ux * off;
        const ang = Math.atan2(uy, ux);
        const sl = step - 3, sw = w * 0.44;
        const c = mixC(FLAG, rng() < 0.5 ? FLAG_LIT : FLAG_DARK, rng() * 0.5);
        g.fillStyle(c, 1);
        const pts4 = [[-sl / 2, -sw / 2], [sl / 2, -sw / 2], [sl / 2, sw / 2], [-sl / 2, sw / 2]].map(([px, py]) =>
          new Phaser.Geom.Point(cx + px * Math.cos(ang) - py * Math.sin(ang), cy + px * Math.sin(ang) + py * Math.cos(ang)));
        g.fillPoints(pts4, true, true);
      }
    }
  }
  // Grit blown into the joints, always on the east side.
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const n = Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 14);
    for (let k = 0; k < n; k++) {
      const t = k / Math.max(1, n);
      g.fillStyle(TURF_GOLD, 0.3);
      g.fillCircle(a.x + (b.x - a.x) * t + w * 0.4 + rng() * 4, a.y + (b.y - a.y) * t + (rng() - 0.5) * w * 0.8, 1.2);
    }
  }
}

/**
 * The cloud sea filling a polygon of the map — the drop off the shoulder. White on top, lilac
 * in the folds, with the wisps of the far sky showing through holes.
 */
export function cloudSea(g: G, poly: Pt[], rng: () => number): void {
  const P = poly.map((p) => new Phaser.Geom.Point(p.x, p.y));
  g.fillStyle(CLOUD_DEEP, 1); g.fillPoints(P, true, true);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of poly) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  const shape = new Phaser.Geom.Polygon(P);
  const n = ((x1 - x0) * (y1 - y0)) / 2600;
  for (let i = 0; i < n; i++) {
    const x = x0 + rng() * (x1 - x0), y = y0 + rng() * (y1 - y0);
    if (!Phaser.Geom.Polygon.Contains(shape, x, y)) continue;
    const r = 18 + rng() * 46;
    g.fillStyle(rng() < 0.4 ? CLOUD_LILAC : CLOUD_SHADE, 0.55); g.fillCircle(x, y + r * 0.25, r);
    g.fillStyle(CLOUD, 0.85); g.fillCircle(x - r * 0.15, y - r * 0.1, r * 0.82);
  }
  // A few holes down to the sea far below — a glint of sky-blue.
  for (let i = 0; i < n / 30; i++) {
    const x = x0 + rng() * (x1 - x0), y = y0 + rng() * (y1 - y0);
    if (!Phaser.Geom.Polygon.Contains(shape, x, y)) continue;
    g.fillStyle(SKY, 0.5); g.fillEllipse(x, y, 30 + rng() * 40, 8 + rng() * 10);
  }
}

/**
 * A cliff lip along a polyline: the turf breaks off into grey rock that falls away into the
 * cloud. `outward` is the side the drop is on (+1 = left of travel, -1 = right).
 */
export function cliffLip(g: G, pts: Pt[], outward: 1 | -1, rng: () => number): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / (len || 1), uy = (b.y - a.y) / (len || 1);
    const nx = uy * outward, ny = -ux * outward;
    for (let d = 0; d < len; d += 14) {
      const x = a.x + ux * d, y = a.y + uy * d;
      const depth = 16 + rng() * 22;
      g.fillStyle(ROCK_DARK, 1);
      g.fillTriangle(x, y, x + ux * 18, y + uy * 18, x + nx * depth + ux * 9, y + ny * depth + uy * 9);
      g.fillStyle(ROCK, 1);
      g.fillTriangle(x, y, x + ux * 15, y + uy * 15, x + nx * depth * 0.6 + ux * 7, y + ny * depth * 0.6 + uy * 7);
      g.fillStyle(ROCK_LIT, 0.7); g.fillRect(x - 1, y - 1, 5, 2);
    }
    // The turf's torn edge.
    g.lineStyle(4, TURF_DEEP, 1); g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(2, TURF_LIT, 0.7); g.lineBetween(a.x - nx * 3, a.y - ny * 3, b.x - nx * 3, b.y - ny * 3);
  }
}

/** Cloud tearing off a cliff edge: puffs drifting east, born at the lip. Animated. */
export function cloudWisps(g: G, x: number, y: number, w: number, t: number, n = 8, seed = 0): void {
  for (let i = 0; i < n; i++) {
    const ph = ((t * 0.06) + (i * 0.618 + seed) % 1) % 1;
    const px = x + ((i * 97 + seed * 31) % Math.max(1, w)) + ph * 220;
    const py = y + Math.sin(i * 2.1 + t * 0.5) * 10 - ph * 18;
    const a = Math.sin(ph * Math.PI) * 0.55;
    g.fillStyle(CLOUD, a); g.fillEllipse(px, py, 40 + ph * 50, 14 + ph * 10);
    g.fillStyle(CLOUD_SHADE, a * 0.5); g.fillEllipse(px + 6, py + 4, 30 + ph * 40, 8 + ph * 6);
  }
}

// ── Windmills ────────────────────────────────────────────────────────

/** Where a windmill's sails hang from: its hub point, for `sails`. */
export interface MillHub { x: number; y: number; r: number }

/**
 * A limewashed tower mill seen three-quarters on: tapering round tower, a gallery, a tarred
 * boat-shaped cap turned into the west wind, a door and two little windows. `x,y` is the middle
 * of the tower's base. Returns the hub for the sails (drawn separately, animated).
 */
export function towerMill(g: G, x: number, y: number, s: number, rng: () => number): MillHub {
  const hb = 62 * s, ht = 46 * s, h = 150 * s;
  shadow(g, x + 18 * s, y + 4, hb * 1.9, 26 * s);
  // Tower: tapering, a shade side to the east.
  g.fillStyle(LIME_SHADE, 1);
  g.fillPoints([new Phaser.Geom.Point(x - hb / 2 - 2, y), new Phaser.Geom.Point(x + hb / 2 + 2, y), new Phaser.Geom.Point(x + ht / 2 + 2, y - h), new Phaser.Geom.Point(x - ht / 2 - 2, y - h)], true, true);
  g.fillStyle(LIME, 1);
  g.fillPoints([new Phaser.Geom.Point(x - hb / 2, y), new Phaser.Geom.Point(x + hb * 0.12, y), new Phaser.Geom.Point(x + ht * 0.12, y - h), new Phaser.Geom.Point(x - ht / 2, y - h)], true, true);
  // Weathering streaks.
  for (let i = 0; i < 6; i++) {
    const k = rng();
    g.fillStyle(LIME_SHADE, 0.35); g.fillRect(x - hb * 0.35 + k * hb * 0.6, y - h * (0.2 + rng() * 0.7), 2, 14 * s + rng() * 20 * s);
  }
  // Stone plinth.
  g.fillStyle(ROCK_DARK, 1); g.fillRect(x - hb / 2 - 4, y - 10 * s, hb + 8, 10 * s);
  g.fillStyle(ROCK, 1); g.fillRect(x - hb / 2 - 4, y - 10 * s, hb + 8, 4 * s);
  // Door and windows.
  g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(x - 9 * s, y - 34 * s, 18 * s, 26 * s, { tl: 8 * s, tr: 8 * s, bl: 0, br: 0 });
  g.fillStyle(TIMBER, 1); g.fillRoundedRect(x - 7 * s, y - 32 * s, 14 * s, 24 * s, { tl: 7 * s, tr: 7 * s, bl: 0, br: 0 });
  for (const wy of [0.48, 0.74]) {
    g.fillStyle(TAR, 1); g.fillRect(x - 5 * s, y - h * wy - 6 * s, 10 * s, 12 * s);
    g.fillStyle(0x6a7a96, 1); g.fillRect(x - 3.5 * s, y - h * wy - 4.5 * s, 7 * s, 9 * s);
  }
  // Gallery: a timber ring with railings.
  const gy = y - h * 0.62;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - hb * 0.62, gy, hb * 1.24, 5 * s);
  g.lineStyle(1.5, TIMBER_DARK, 1);
  for (let k = -3; k <= 3; k++) g.lineBetween(x + k * hb * 0.19, gy, x + k * hb * 0.19, gy - 9 * s);
  g.lineBetween(x - hb * 0.62, gy - 9 * s, x + hb * 0.62, gy - 9 * s);
  // Cap: a tarred boat shape, prow to the west.
  const cy = y - h;
  g.fillStyle(TAR, 1);
  g.fillPoints([
    new Phaser.Geom.Point(x - ht * 0.75, cy + 2), new Phaser.Geom.Point(x + ht * 0.62, cy + 2),
    new Phaser.Geom.Point(x + ht * 0.5, cy - 20 * s), new Phaser.Geom.Point(x - ht * 0.2, cy - 28 * s),
    new Phaser.Geom.Point(x - ht * 0.8, cy - 12 * s),
  ], true, true);
  g.fillStyle(TAR_LIT, 1); g.fillRect(x - ht * 0.6, cy - 16 * s, ht * 0.9, 2);
  // Fantail at the back (east): a little wheel that keeps her into the wind.
  g.lineStyle(1.5, TIMBER_DARK, 1); g.lineBetween(x + ht * 0.5, cy - 8 * s, x + ht * 0.95, cy - 22 * s);
  g.fillStyle(CANVAS_SHADE, 1); g.fillCircle(x + ht * 0.95, cy - 22 * s, 6 * s);
  g.lineStyle(1, TIMBER_DARK, 1); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; g.lineBetween(x + ht * 0.95 - Math.cos(a) * 6 * s, cy - 22 * s - Math.sin(a) * 6 * s, x + ht * 0.95 + Math.cos(a) * 6 * s, cy - 22 * s + Math.sin(a) * 6 * s); }
  return towerMillHub(x, y, s);
}

/** Where `towerMill(x, y, s)` hangs its sails — for painters that animate them without redrawing the mill. */
export function towerMillHub(x: number, y: number, s: number): MillHub {
  return { x: x - 46 * s * 0.72, y: y - 150 * s - 10 * s, r: 92 * s };
}

/**
 * A post mill: a weatherboarded box on a trestle, the whole body turned on its post. Lighter and
 * older than the tower mills. Returns the hub.
 */
export function postMill(g: G, x: number, y: number, s: number, rng: () => number): MillHub {
  shadow(g, x + 10 * s, y + 4, 90 * s, 20 * s);
  // Trestle and post.
  g.lineStyle(4 * s, TIMBER_DARK, 1);
  g.lineBetween(x - 30 * s, y, x, y - 46 * s); g.lineBetween(x + 30 * s, y, x, y - 46 * s);
  g.lineBetween(x - 34 * s, y, x + 34 * s, y);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 4 * s, y - 60 * s, 8 * s, 60 * s);
  // Steps up to the door at the back.
  g.lineStyle(2 * s, TIMBER, 1); g.lineBetween(x + 16 * s, y, x + 30 * s, y - 50 * s);
  for (let k = 1; k < 6; k++) g.lineBetween(x + 16 * s + k * 2.8 * s - 5 * s, y - k * 10 * s, x + 16 * s + k * 2.8 * s + 5 * s, y - k * 10 * s);
  // The body: weatherboard.
  const bw = 52 * s, bh = 70 * s, by = y - 56 * s;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - bw / 2 - 2, by - bh - 2, bw + 4, bh + 4);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - bw / 2, by - bh, bw, bh);
  for (let k = 0; k < bh; k += 6 * s) { g.lineStyle(1, TIMBER, 1); g.lineBetween(x - bw / 2, by - bh + k, x + bw / 2, by - bh + k); }
  for (let i = 0; i < 4; i++) { g.fillStyle(TIMBER, 0.5); g.fillRect(x - bw / 2 + rng() * bw, by - bh + rng() * bh, 6, 3); }
  // Pitched roof.
  g.fillStyle(SLATE_DARK, 1); g.fillTriangle(x - bw / 2 - 5, by - bh, x + bw / 2 + 5, by - bh, x, by - bh - 22 * s);
  g.fillStyle(SLATE, 1); g.fillTriangle(x - bw / 2 - 2, by - bh, x + bw / 2 + 2, by - bh, x, by - bh - 19 * s);
  // A little window.
  g.fillStyle(TAR, 1); g.fillRect(x - 6 * s, by - bh * 0.6, 12 * s, 10 * s);
  return postMillHub(x, y, s);
}

/** Where `postMill(x, y, s)` hangs its sails. */
export function postMillHub(x: number, y: number, s: number): MillHub {
  return { x: x - 26 * s - 2, y: y - 56 * s - 70 * s * 0.72, r: 78 * s };
}

/**
 * Four sails on a hub, turned to angle `a`. Each sail is a lattice frame half-clothed in canvas
 * (reefed on the inside), the way working mills carry them in a stiff wind. `face` squashes the
 * sweep horizontally — sails seen a little edge-on, since they face west.
 */
export function sails(g: G, hub: MillHub, a: number, face = 0.55, cloth = CANVAS, reef = 0.7): void {
  const { x, y, r } = hub;
  for (let i = 0; i < 4; i++) {
    const sa = a + (i * Math.PI) / 2;
    const cx = Math.cos(sa) * face, cy = Math.sin(sa);
    const px = -Math.sin(sa) * face, py = Math.cos(sa);
    const w = r * 0.2;
    // The cloth, on the trailing side.
    const c0 = r * (1 - reef), c1 = r * 0.98;
    g.fillStyle(cloth, 0.95);
    g.fillPoints([
      new Phaser.Geom.Point(x + cx * c0, y + cy * c0), new Phaser.Geom.Point(x + cx * c1, y + cy * c1),
      new Phaser.Geom.Point(x + cx * c1 + px * w, y + cy * c1 + py * w), new Phaser.Geom.Point(x + cx * c0 + px * w, y + cy * c0 + py * w),
    ], true, true);
    g.fillStyle(dim(cloth, 0.12), 0.8);
    g.fillPoints([
      new Phaser.Geom.Point(x + cx * c0 + px * w * 0.55, y + cy * c0 + py * w * 0.55), new Phaser.Geom.Point(x + cx * c1 + px * w * 0.55, y + cy * c1 + py * w * 0.55),
      new Phaser.Geom.Point(x + cx * c1 + px * w, y + cy * c1 + py * w), new Phaser.Geom.Point(x + cx * c0 + px * w, y + cy * c0 + py * w),
    ], true, true);
    // The stock and lattice.
    g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x, y, x + cx * r, y + cy * r);
    g.lineStyle(1, TIMBER_DARK, 0.9);
    g.lineBetween(x + cx * r * 0.15 + px * w, y + cy * r * 0.15 + py * w, x + cx * r + px * w, y + cy * r + py * w);
    for (let k = 0.2; k <= 1.001; k += 0.13) g.lineBetween(x + cx * r * k, y + cy * r * k, x + cx * r * k + px * w, y + cy * r * k + py * w);
  }
  g.fillStyle(TAR, 1); g.fillCircle(x, y, 6);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y, 2.5);
}

// ── Weathervanes, windsocks, kites ───────────────────────────────────

/**
 * A weathervane on a pole: N/E/S/W letters on a cross, and an arrow with a cockerel riding it,
 * turned to `a` (the way the wind blows *to*). Static parts and the arrow both — call it from an
 * animate pass with a live angle. `x,y` is the pole's foot.
 */
export function weathervane(g: G, x: number, y: number, h: number, a: number, s = 1, metal = BRASS): void {
  const top = y - h;
  g.fillStyle(0x000000, 0.2); g.fillEllipse(x, y, 16 * s, 5 * s);
  g.fillStyle(dim(metal, 0.45), 1); g.fillRect(x - 2 * s, top, 4 * s, h);
  // The compass cross, seen at a slant.
  g.lineStyle(1.5 * s, dim(metal, 0.3), 1);
  g.lineBetween(x - 16 * s, top + 10 * s, x + 16 * s, top + 10 * s);
  g.lineBetween(x, top + 4 * s, x, top + 16 * s);
  g.fillStyle(dim(metal, 0.2), 1);
  for (const [dx, dy] of [[-18, 10], [18, 10], [0, 2], [0, 18]] as [number, number][]) g.fillCircle(x + dx * s, top + dy * s, 2 * s);
  // The arrow, foreshortened: its x reach is full, y reach squashed.
  const ax = Math.cos(a), ay = Math.sin(a) * 0.4;
  const L = 22 * s;
  const tipX = x + ax * L, tipY = top - 6 * s + ay * L;
  const tailX = x - ax * L, tailY = top - 6 * s - ay * L;
  g.lineStyle(2 * s, metal, 1); g.lineBetween(tailX, tailY, tipX, tipY);
  g.fillStyle(metal, 1);
  g.fillTriangle(tipX, tipY, tipX - ax * 8 * s - ay * 4 * s, tipY - ay * 8 * s + ax * 4 * s * 0.4 - 3 * s, tipX - ax * 8 * s + ay * 4 * s, tipY - ay * 8 * s - ax * 4 * s * 0.4 + 3 * s);
  // The tail feather.
  g.fillTriangle(tailX, tailY - 5 * s, tailX, tailY + 5 * s, tailX + ax * 10 * s, tailY + ay * 10 * s);
  // The cockerel on the shaft, facing into the wind (toward the tail), a silhouette.
  const bx = x - ax * 4 * s, by = top - 12 * s;
  const f = ax >= 0 ? -1 : 1;
  g.fillStyle(lit(metal, 0.1), 1);
  g.fillEllipse(bx, by, 14 * s, 9 * s);
  g.fillCircle(bx + f * 6 * s, by - 6 * s, 3.5 * s);
  g.fillTriangle(bx + f * 9 * s, by - 6 * s, bx + f * 13 * s, by - 5 * s, bx + f * 9 * s, by - 4 * s);
  g.fillStyle(0xd0402a, 1); g.fillCircle(bx + f * 6 * s, by - 10 * s, 1.8 * s);
  g.fillStyle(lit(metal, 0.1), 1);
  g.fillTriangle(bx - f * 6 * s, by - 2 * s, bx - f * 12 * s, by - 12 * s, bx - f * 4 * s, by - 6 * s);
  g.fillStyle(lit(metal, 0.5), 0.8); g.fillCircle(x, top - 6 * s, 2 * s);
}

/** A windsock on a pole: a striped cone streaming east, flapping by `t`. `x,y` is the foot. */
export function windsock(g: G, x: number, y: number, t: number, strength = 1, a = 0): void {
  g.fillStyle(0x000000, 0.2); g.fillEllipse(x, y, 14, 5);
  g.fillStyle(0xd8d8d8, 1); g.fillRect(x - 1.5, y - 58, 3, 58);
  const top = y - 56;
  const n = 5;
  const droop = (1 - strength) * 1.1;
  const ang = a + droop;
  for (let i = 0; i < n; i++) {
    const k0 = i / n, k1 = (i + 1) / n;
    const len = 34;
    const wob = Math.sin(t * 9 - i * 0.9) * 2.5 * strength;
    const r0 = 6 - k0 * 3, r1 = 6 - k1 * 3;
    const x0 = x + Math.cos(ang) * len * k0, y0 = top + Math.sin(ang) * len * k0 + wob * k0;
    const x1 = x + Math.cos(ang) * len * k1, y1 = top + Math.sin(ang) * len * k1 + wob * k1;
    g.fillStyle(i % 2 ? 0xf6f2ea : 0xe8642a, 1);
    g.fillPoints([
      new Phaser.Geom.Point(x0 - Math.sin(ang) * r0, y0 + Math.cos(ang) * r0), new Phaser.Geom.Point(x1 - Math.sin(ang) * r1, y1 + Math.cos(ang) * r1),
      new Phaser.Geom.Point(x1 + Math.sin(ang) * r1, y1 - Math.cos(ang) * r1), new Phaser.Geom.Point(x0 + Math.sin(ang) * r0, y0 - Math.cos(ang) * r0),
    ], true, true);
  }
  g.lineStyle(1.5, 0x888888, 1); g.strokeEllipse(x + 1, top, 4, 12);
}

/**
 * A diamond fighting-kite with a bowed spar and a ribbon tail. `x,y` is the kite's centre,
 * `a` the way its nose points (the line runs back from its tail), `t` flutters the tail.
 */
export function kite(g: G, x: number, y: number, s: number, color: number, a: number, t: number, alpha = 1): void {
  const c = Math.cos(a), sn = Math.sin(a);
  const P = (fx: number, fy: number) => new Phaser.Geom.Point(x + (fx * c - fy * sn) * s, y + (fx * sn + fy * c) * s);
  // Tail ribbons streaming behind.
  const tx = x - c * 14 * s, ty = y - sn * 14 * s;
  g.lineStyle(1.5 * s, dim(color, 0.2), alpha);
  g.beginPath(); g.moveTo(tx, ty);
  for (let k = 1; k <= 6; k++) {
    const d = k * 6 * s;
    g.lineTo(tx - c * d + Math.sin(t * 8 + k) * 3 * s * -sn, ty - sn * d + Math.sin(t * 8 + k) * 3 * s * c);
  }
  g.strokePath();
  for (let k = 2; k <= 6; k += 2) {
    const d = k * 6 * s;
    const bx = tx - c * d + Math.sin(t * 8 + k) * 3 * s * -sn, by = ty - sn * d + Math.sin(t * 8 + k) * 3 * s * c;
    g.fillStyle(k % 4 ? 0xf6f2ea : color, alpha); g.fillTriangle(bx - 3 * s, by - 2 * s, bx + 3 * s, by - 2 * s, bx, by + 3 * s);
  }
  // The sail: two halves, one lit.
  g.fillStyle(dim(color, 0.35), alpha); g.fillPoints([P(12, 0), P(0, -9), P(-14, 0), P(0, 9)], true, true);
  g.fillStyle(color, alpha); g.fillPoints([P(11, 0), P(0, -8), P(-12, 0)], true, true);
  g.fillStyle(lit(color, 0.18), alpha); g.fillPoints([P(11, 0), P(-12, 0), P(0, 8)], true, true);
  // Spars.
  g.lineStyle(1, TIMBER_DARK, alpha);
  const a0 = P(12, 0), a1 = P(-14, 0), b0 = P(0, -9), b1 = P(0, 9);
  g.lineBetween(a0.x, a0.y, a1.x, a1.y); g.lineBetween(b0.x, b0.y, b1.x, b1.y);
  // A painted eye on the sail (Galeward kites all have one).
  const e = P(2, 0);
  g.fillStyle(0xf6f2ea, alpha); g.fillCircle(e.x, e.y, 2.6 * s);
  g.fillStyle(0x1a1a1a, alpha); g.fillCircle(e.x, e.y, 1.3 * s);
}

/** A kite post: a tarred stake with a reel and a coil of line. `x,y` is the foot. */
export function kitePost(g: G, x: number, y: number, color = KITE_COLORS[0]): void {
  shadow(g, x, y, 22, 6);
  g.fillStyle(TAR, 1); g.fillRect(x - 3, y - 34, 6, 34);
  g.fillStyle(TAR_LIT, 1); g.fillRect(x - 3, y - 34, 2, 34);
  // Reel.
  g.fillStyle(TIMBER, 1); g.fillCircle(x, y - 22, 7);
  g.fillStyle(ROPE, 1); g.fillCircle(x, y - 22, 5);
  g.lineStyle(1, ROPE_DARK, 1); g.strokeCircle(x, y - 22, 3);
  // A ribbon of the kite's colour round the top.
  g.fillStyle(color, 1); g.fillRect(x - 4, y - 36, 8, 4);
}

// ── Rope bridges ─────────────────────────────────────────────────────

/**
 * A rope bridge across a cloud gorge, plank by plank, sagging a little in the middle. `a` and `b`
 * are the two anchor points; `w` its width. Hand ropes on both sides, posts at the ends.
 */
export function ropeBridge(g: G, a: Pt, b: Pt, w: number, rng: () => number): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
  const nx = -uy, ny = ux;
  const sag = (k: number) => Math.sin(k * Math.PI) * 10;
  // Shadow on the cloud far below.
  g.fillStyle(CLOUD_DEEP, 0.4);
  g.fillPoints([
    new Phaser.Geom.Point(a.x + nx * w * 0.4 + 30, a.y + ny * w * 0.4 + 40), new Phaser.Geom.Point(b.x + nx * w * 0.4 + 30, b.y + ny * w * 0.4 + 40),
    new Phaser.Geom.Point(b.x - nx * w * 0.4 + 30, b.y - ny * w * 0.4 + 40), new Phaser.Geom.Point(a.x - nx * w * 0.4 + 30, a.y - ny * w * 0.4 + 40),
  ], true, true);
  // Planks.
  for (let d = 4; d < len - 2; d += 11) {
    const k = d / len;
    const cx = a.x + ux * d, cy = a.y + uy * d + sag(k);
    const tilt = (rng() - 0.5) * 0.08;
    g.fillStyle(rng() < 0.15 ? TIMBER_DARK : TIMBER, 1);
    g.fillPoints([
      new Phaser.Geom.Point(cx + nx * w / 2 - ux * 4 + tilt * 10, cy + ny * w / 2 - uy * 4), new Phaser.Geom.Point(cx + nx * w / 2 + ux * 4 + tilt * 10, cy + ny * w / 2 + uy * 4),
      new Phaser.Geom.Point(cx - nx * w / 2 + ux * 4 - tilt * 10, cy - ny * w / 2 + uy * 4), new Phaser.Geom.Point(cx - nx * w / 2 - ux * 4 - tilt * 10, cy - ny * w / 2 - uy * 4),
    ], true, true);
    g.fillStyle(TIMBER_LIT, 0.6); g.fillRect(cx + nx * w / 2 - 2, cy + ny * w / 2 - 1, 3, 2);
  }
  // Rope stringers under the planks, and hand ropes.
  for (const side of [-1, 1]) {
    g.lineStyle(2, ROPE_DARK, 1);
    g.beginPath();
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      const x = a.x + (b.x - a.x) * t + nx * side * w * 0.5, y = a.y + (b.y - a.y) * t + ny * side * w * 0.5 + sag(t);
      if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokePath();
    g.lineStyle(1.5, ROPE, 1);
    g.beginPath();
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      const x = a.x + (b.x - a.x) * t + nx * side * w * 0.55, y = a.y + (b.y - a.y) * t + ny * side * w * 0.55 + sag(t) * 1.4 - 20;
      if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokePath();
    // Hangers from hand rope to stringer.
    g.lineStyle(1, ROPE_DARK, 0.8);
    for (let k = 1; k < 8; k++) {
      const t = k / 8;
      const x = a.x + (b.x - a.x) * t + nx * side * w * 0.52, y = a.y + (b.y - a.y) * t + ny * side * w * 0.52 + sag(t);
      g.lineBetween(x, y, x, y + sag(t) * 0.4 - 20);
    }
  }
  for (const p of [a, b]) {
    for (const side of [-1, 1]) {
      const x = p.x + nx * side * w * 0.6, y = p.y + ny * side * w * 0.6;
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 3, y - 26, 6, 28);
      g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 3, y - 26, 2, 28);
      g.fillStyle(ROPE, 1); g.fillCircle(x, y - 20, 3);
    }
  }
}

// ── The King's brass: meters, bottles, bellows ───────────────────────

/** A brass breath-meter dial worn on the chest: a needle that shows how much air you owe. */
export function breathMeter(g: G, x: number, y: number, r: number, k: number, alpha = 1): void {
  g.fillStyle(BRASS_DARK, alpha); g.fillCircle(x, y, r + 1.5);
  g.fillStyle(BRASS, alpha); g.fillCircle(x, y, r);
  g.fillStyle(0xf6f0dc, alpha); g.fillCircle(x, y, r * 0.72);
  // A red zone at the top end.
  g.lineStyle(Math.max(1, r * 0.18), 0xc8402e, alpha);
  g.beginPath(); g.arc(x, y, r * 0.58, -Math.PI * 0.35, Math.PI * 0.15, false); g.strokePath();
  const a = Math.PI * 0.85 + k * Math.PI * 1.3;
  g.lineStyle(Math.max(1, r * 0.14), 0x1a1a1a, alpha);
  g.lineBetween(x, y, x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62);
  g.fillStyle(BRASS_DARK, alpha); g.fillCircle(x, y, r * 0.14);
}

/** A corked glass breath-bottle with a wisp of blue breath turning inside it. */
export function breathBottle(g: G, x: number, y: number, s: number, t = 0, fill = 1, alpha = 1): void {
  g.fillStyle(0x000000, 0.18 * alpha); g.fillEllipse(x, y + 1, 16 * s, 5 * s);
  g.fillStyle(BOTTLE_EDGE, alpha); g.fillRoundedRect(x - 7 * s, y - 20 * s, 14 * s, 20 * s, 5 * s);
  g.fillStyle(BOTTLE, 0.85 * alpha); g.fillRoundedRect(x - 6 * s, y - 19 * s, 12 * s, 18 * s, 4 * s);
  g.fillStyle(BOTTLE_EDGE, alpha); g.fillRect(x - 3 * s, y - 26 * s, 6 * s, 7 * s);
  g.fillStyle(CORK, alpha); g.fillRect(x - 3.5 * s, y - 29 * s, 7 * s, 4 * s);
  if (fill > 0) {
    for (let i = 0; i < 3; i++) {
      const a = t * 2 + i * 2.1;
      g.fillStyle(BREATH, 0.5 * fill * alpha);
      g.fillCircle(x + Math.cos(a) * 3 * s, y - 10 * s + Math.sin(a * 1.3) * 4 * s, (2.2 + i * 0.4) * s);
    }
  }
  g.fillStyle(0xffffff, 0.7 * alpha); g.fillRect(x - 4.5 * s, y - 17 * s, 1.5 * s, 9 * s);
}

/**
 * A pair of great leather bellows on a frame — the King's toll-bellows. `open` 0..1 is how far
 * the boards are spread (animated by the caller via a separate `bellowsBoards`).
 */
export function bellowsFrame(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 2, 170 * s, 30 * s);
  // A timber gantry with brass fittings.
  g.fillStyle(TIMBER_DARK, 1);
  g.fillRect(x - 78 * s, y - 120 * s, 10 * s, 120 * s);
  g.fillRect(x + 68 * s, y - 120 * s, 10 * s, 120 * s);
  g.fillRect(x - 84 * s, y - 128 * s, 168 * s, 12 * s);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 84 * s, y - 128 * s, 168 * s, 5 * s);
  g.fillStyle(BRASS, 1);
  for (const dx of [-73, 73]) { g.fillCircle(x + dx * s, y - 122 * s, 4 * s); g.fillCircle(x + dx * s, y - 10 * s, 4 * s); }
  // The brass nozzle pointing down into the gauge-box.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 8 * s, y - 34 * s, 16 * s, 26 * s);
  g.fillStyle(BRASS, 1); g.fillRect(x - 6 * s, y - 34 * s, 12 * s, 26 * s);
  // The gauge-box with the great meter on its face.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 40 * s, y - 14 * s, 80 * s, 16 * s);
  breathMeter(g, x, y - 52 * s, 14 * s, 0.7);
}

/** The bellows' leather and boards, breathing: `open` 0 (shut) .. 1 (full). Animated. */
export function bellowsBoards(g: G, x: number, y: number, s: number, open: number): void {
  const top = y - 112 * s, bottom = y - 40 * s - (1 - open) * 30 * s;
  const w = 56 * s;
  // Pleated leather between the boards.
  const folds = 5;
  for (let i = 0; i < folds; i++) {
    const y0 = top + 8 * s + ((bottom - top - 8 * s) * i) / folds, y1 = top + 8 * s + ((bottom - top - 8 * s) * (i + 1)) / folds;
    const bulge = (i % 2 ? 1 : 0.86) * (0.7 + open * 0.3);
    g.fillStyle(i % 2 ? LEATHER : LEATHER_LIT, 1);
    g.fillPoints([
      new Phaser.Geom.Point(x - w * bulge, y0), new Phaser.Geom.Point(x + w * bulge, y0),
      new Phaser.Geom.Point(x + w * (i % 2 ? 0.86 : 1) * (0.7 + open * 0.3), y1), new Phaser.Geom.Point(x - w * (i % 2 ? 0.86 : 1) * (0.7 + open * 0.3), y1),
    ], true, true);
  }
  // The boards.
  g.fillStyle(LEATHER_DARK, 1); g.fillRect(x - w - 4 * s, top, (w + 4 * s) * 2, 8 * s);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w - 4 * s, bottom - 4 * s, (w + 4 * s) * 2, 8 * s);
  g.fillStyle(BRASS, 1); g.fillRect(x - w, top + 2 * s, w * 2, 2 * s);
}

// ── Small things ─────────────────────────────────────────────────────

/** A sack of grain or flour, tied at the neck, slumped. */
export function grainSack(g: G, x: number, y: number, s: number, flour = false): void {
  shadow(g, x, y, 30 * s, 8 * s);
  const c = flour ? FLOUR : SACK;
  g.fillStyle(SACK_DARK, 1); g.fillEllipse(x, y - 12 * s, 28 * s, 26 * s);
  g.fillStyle(c, 1); g.fillEllipse(x - 1, y - 13 * s, 25 * s, 23 * s);
  g.fillStyle(SACK_DARK, 1); g.fillRect(x - 5 * s, y - 28 * s, 10 * s, 4 * s);
  g.fillStyle(c, 1); g.fillTriangle(x - 6 * s, y - 28 * s, x + 6 * s, y - 28 * s, x, y - 34 * s);
  g.fillStyle(lit(c, 0.2), 0.6); g.fillEllipse(x - 5 * s, y - 18 * s, 8 * s, 5 * s);
  if (!flour) { g.fillStyle(GRAIN, 0.8); g.fillCircle(x + 3 * s, y - 14 * s, 2 * s); }
}

/** A millstone lying flat (or leant against a wall): a grooved disc with an eye. */
export function millstone(g: G, x: number, y: number, r: number, upright = false): void {
  if (upright) {
    shadow(g, x, y, r * 1.4, r * 0.35);
    g.fillStyle(ROCK_DARK, 1); g.fillEllipse(x, y - r, r * 0.6, r * 2);
    g.fillStyle(ROCK, 1); g.fillEllipse(x - 4, y - r, r * 0.5, r * 1.96);
    g.fillStyle(ROCK_DARK, 1); g.fillEllipse(x - 4, y - r, r * 0.12, r * 0.36);
    return;
  }
  shadow(g, x, y + 3, r * 2.2, r * 0.7);
  g.fillStyle(ROCK_DARK, 1); g.fillEllipse(x, y + 3, r * 2, r * 0.7);
  g.fillStyle(ROCK, 1); g.fillEllipse(x, y, r * 2, r * 0.7);
  g.lineStyle(1, ROCK_DARK, 0.7);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.lineBetween(x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.09, x + Math.cos(a + 0.4) * r * 0.95, y + Math.sin(a + 0.4) * r * 0.33);
  }
  g.fillStyle(ROCK_DARK, 1); g.fillEllipse(x, y, r * 0.4, r * 0.14);
}

/** A vent grate in the turf: an iron grille over a fissure where the updraft comes up. */
export function ventGrate(g: G, x: number, y: number, r: number): void {
  g.fillStyle(ROCK_DARK, 1); g.fillEllipse(x, y, r * 2.3, r * 1.1);
  g.fillStyle(0x1e2230, 1); g.fillEllipse(x, y, r * 2, r * 0.9);
  g.lineStyle(2, 0x4a4e5c, 1);
  for (let k = -3; k <= 3; k++) g.lineBetween(x + k * r * 0.26, y - r * 0.42 * Math.sqrt(1 - (k / 3.6) ** 2), x + k * r * 0.26, y + r * 0.42 * Math.sqrt(1 - (k / 3.6) ** 2));
  g.lineStyle(1.5, ROCK_LIT, 0.5); g.strokeEllipse(x, y, r * 2.3, r * 1.1);
}

/** Air shimmering up out of a vent: rising wavy ribbons. Animated. */
export function updraftShimmer(g: G, x: number, y: number, r: number, t: number, strength = 1): void {
  for (let i = 0; i < 6; i++) {
    const ph = (t * 0.9 + i / 6) % 1;
    const bx = x + (i - 2.5) * r * 0.32;
    g.lineStyle(1.5, 0xffffff, 0.35 * Math.sin(ph * Math.PI) * strength);
    g.beginPath();
    for (let k = 0; k <= 6; k++) {
      const yy = y - ph * 70 - k * 8;
      const xx = bx + Math.sin(t * 5 + k + i) * 3;
      if (k === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy);
    }
    g.strokePath();
  }
}

/** A gull, wings in a shallow M, flapping by `t`. */
export function gull(g: G, x: number, y: number, s: number, t: number, alpha = 1): void {
  const f = Math.sin(t * 6) * 4 * s;
  g.lineStyle(1.6 * s, 0xf6f6f6, alpha);
  g.beginPath(); g.moveTo(x - 10 * s, y - f); g.lineTo(x - 4 * s, y - 2 * s); g.lineTo(x, y); g.lineTo(x + 4 * s, y - 2 * s); g.lineTo(x + 10 * s, y - f); g.strokePath();
  g.lineStyle(1 * s, 0x3a3a3a, alpha * 0.7); g.lineBetween(x - 10 * s, y - f, x - 8 * s, y - f + 0.5);
}

/** A wind streak — a thin line with a curl at its head, for the visible wind. */
export function windStreak(g: G, x: number, y: number, len: number, alpha: number, curl = 1): void {
  g.lineStyle(1.4, 0xffffff, alpha);
  g.lineBetween(x - len, y, x, y);
  g.beginPath(); g.arc(x, y - 4 * curl, 4 * curl, Math.PI / 2, -Math.PI * 0.6, true); g.strokePath();
}

/** The Galeward waystone: a menhir with a hole bored through it that whistles in the wind. */
export function galewardWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 46, 12);
  g.fillStyle(ROCK_DARK, 1);
  g.fillPoints([new Phaser.Geom.Point(x - 15, y), new Phaser.Geom.Point(x + 15, y), new Phaser.Geom.Point(x + 11, y - 56), new Phaser.Geom.Point(x - 3, y - 66), new Phaser.Geom.Point(x - 13, y - 50)], true, true);
  g.fillStyle(ROCK, 1);
  g.fillPoints([new Phaser.Geom.Point(x - 13, y - 1), new Phaser.Geom.Point(x + 6, y - 1), new Phaser.Geom.Point(x + 4, y - 58), new Phaser.Geom.Point(x - 3, y - 63), new Phaser.Geom.Point(x - 11, y - 50)], true, true);
  g.fillStyle(0x24263a, 1); g.fillCircle(x - 1, y - 40, 6);
  g.fillStyle(SKY, 0.6); g.fillCircle(x, y - 40, 3);
  // Spiral carving, the old wind-sign.
  g.lineStyle(1.5, 0x9fe2ff, 0.8);
  g.beginPath();
  for (let k = 0; k < 24; k++) { const a = k * 0.5; const r = 1 + k * 0.4; const px = x - 2 + Math.cos(a) * r, py = y - 18 + Math.sin(a) * r * 0.8; if (k === 0) g.moveTo(px, py); else g.lineTo(px, py); }
  g.strokePath();
}

/** A low limewashed cottage with a slate roof held down by stones on ropes against the gale. */
export function galeCottage(g: G, x: number, y: number, w: number, h: number, rng: () => number, door = 0x3a6fb8): Pt {
  shadow(g, x + 10, y + 4, w * 1.2, 22);
  g.fillStyle(LIME_SHADE, 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(LIME, 1); g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle(LIME_SHADE, 0.5); g.fillRect(x + w * 0.2, y - h, w * 0.3, h);
  for (let i = 0; i < 4; i++) { g.fillStyle(LIME_SHADE, 0.4); g.fillRect(x - w / 2 + rng() * w, y - h + rng() * h, 10, 3); }
  // Low slate roof, deep eaves.
  const rh = h * 0.7;
  g.fillStyle(SLATE_DARK, 1); g.fillTriangle(x - w / 2 - 14, y - h + 4, x + w / 2 + 14, y - h + 4, x, y - h - rh);
  g.fillStyle(SLATE, 1); g.fillTriangle(x - w / 2 - 10, y - h + 2, x + w / 2 + 10, y - h + 2, x, y - h - rh + 4);
  g.lineStyle(1, SLATE_LIT, 0.6);
  for (let k = 1; k < 5; k++) { const t = k / 5; g.lineBetween(x - (w / 2 + 10) * (1 - t), y - h - rh * t + 2, x + (w / 2 + 10) * (1 - t), y - h - rh * t + 2); }
  // Ropes over the roof with stones hanging.
  for (const k of [-0.25, 0.25]) {
    const rx = x + k * w;
    g.lineStyle(1.5, ROPE_DARK, 1); g.lineBetween(rx, y - h - rh * (1 - Math.abs(k) * 1.6), rx - w * 0.05, y - h * 0.55);
    g.fillStyle(ROCK, 1); g.fillCircle(rx - w * 0.05, y - h * 0.5, 5);
  }
  // A cowl chimney turned east.
  g.fillStyle(LIME_SHADE, 1); g.fillRect(x - w * 0.3, y - h - rh * 0.8, 10, rh * 0.5);
  g.fillStyle(TAR, 1); g.fillRoundedRect(x - w * 0.3 - 2, y - h - rh * 0.9, 16, 9, 4);
  // Door and windows.
  g.fillStyle(door, 1); g.fillRect(x - 9, y - 26, 18, 26);
  g.fillStyle(lit(door, 0.3), 1); g.fillRect(x - 9, y - 26, 18, 3);
  g.fillStyle(BRASS, 1); g.fillCircle(x + 5, y - 12, 1.5);
  for (const k of [-1, 1]) {
    const wx = x + k * w * 0.3;
    g.fillStyle(TAR, 1); g.fillRect(wx - 8, y - h * 0.65 - 7, 16, 14);
    g.fillStyle(0xf0d890, 0.85); g.fillRect(wx - 6, y - h * 0.65 - 5, 12, 10);
    g.fillStyle(TAR, 1); g.fillRect(wx - 1, y - h * 0.65 - 5, 2, 10);
  }
  return { x, y: y + 14 };
}

/** A breath-meter painted on a board — the toll-house's notice. */
export function tollBoard(g: G, x: number, y: number): void {
  shadow(g, x, y, 40, 8);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 2, y - 46, 4, 46);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 26, y - 64, 52, 34);
  g.fillStyle(0xe8e0c8, 1); g.fillRect(x - 24, y - 62, 48, 30);
  breathMeter(g, x - 12, y - 47, 9, 0.85);
  g.lineStyle(1, 0x3a3434, 0.8);
  for (let k = 0; k < 4; k++) g.lineBetween(x, y - 56 + k * 6, x + 19, y - 56 + k * 6);
}

/** Glow of breath-blue — used for the bottles racked at the toll. */
export function breathGlow(g: G, x: number, y: number, r: number, a = 0.05): void {
  glow(g, x, y, r, BREATH, a, 3);
}

/** A tall pole of kite-ribbons — the Kite Field's maypole of colours. */
export function ribbonPole(g: G, x: number, y: number, t: number): void {
  g.fillStyle(0x000000, 0.2); g.fillEllipse(x, y, 16, 5);
  g.fillStyle(LIME, 1); g.fillRect(x - 2.5, y - 90, 5, 90);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y - 92, 4);
  for (let i = 0; i < 5; i++) {
    const c = KITE_COLORS[i % 4];
    g.lineStyle(3, c, 0.9);
    g.beginPath(); g.moveTo(x, y - 88);
    for (let k = 1; k <= 8; k++) {
      const d = k * 7;
      g.lineTo(x + d, y - 88 + i * 3 + Math.sin(t * 7 + k * 0.8 + i) * (2 + k * 0.6));
    }
    g.strokePath();
  }
}


// ── Buildings of the court ───────────────────────────────────────────

/**
 * Prince Zephyr's Weather House: a tall limewashed house of three storeys under a steep slate
 * roof, a round tower at its west end climbing to a glazed cupola, and on the cupola the great
 * brass weathercock (drawn separately, animated — this returns where it stands). Pennants on
 * every gable, a brass breath-meter over the door the size of a cartwheel.
 */
export function weatherHouse(g: G, x: number, y: number, rng: () => number): Pt {
  const w = 300, h = 170;
  shadow(g, x + 24, y + 6, w * 1.3, 40);
  // Main block.
  g.fillStyle(LIME_SHADE, 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(LIME, 1); g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle(LIME_SHADE, 0.45); g.fillRect(x + w * 0.25, y - h, w * 0.25, h);
  for (let i = 0; i < 10; i++) { g.fillStyle(LIME_SHADE, 0.35); g.fillRect(x - w / 2 + rng() * w, y - h + rng() * h, 12, 3); }
  // String courses between storeys.
  for (const k of [0.36, 0.68]) { g.fillStyle(ROCK, 1); g.fillRect(x - w / 2 - 4, y - h * k, w + 8, 5); }
  // Steep slate roof with two dormers.
  const rh = 90;
  g.fillStyle(SLATE_DARK, 1); g.fillTriangle(x - w / 2 - 16, y - h + 4, x + w / 2 + 16, y - h + 4, x + 40, y - h - rh);
  g.fillStyle(SLATE, 1); g.fillTriangle(x - w / 2 - 10, y - h + 2, x + w / 2 + 10, y - h + 2, x + 40, y - h - rh + 6);
  g.lineStyle(1, SLATE_LIT, 0.5);
  for (let k = 1; k < 7; k++) { const t = k / 7; g.lineBetween(x - (w / 2 + 10) * (1 - t) + 40 * t, y - h - rh * t + 4, x + (w / 2 + 10) * (1 - t) + 40 * t, y - h - rh * t + 4); }
  for (const dx of [-30, 90]) {
    g.fillStyle(LIME, 1); g.fillRect(x + dx - 14, y - h - 34, 28, 30);
    g.fillStyle(SLATE_DARK, 1); g.fillTriangle(x + dx - 20, y - h - 32, x + dx + 20, y - h - 32, x + dx, y - h - 52);
    g.fillStyle(0xf0d890, 0.85); g.fillRect(x + dx - 7, y - h - 26, 14, 16);
  }
  // Windows, three rows, tall and shuttered against the blow.
  for (let row = 0; row < 3; row++) {
    for (let c = 0; c < 5; c++) {
      const wx = x - w / 2 + 34 + c * 58, wy = y - h + 26 + row * 54;
      if (row === 2 && c === 2) continue;
      g.fillStyle(TAR, 1); g.fillRect(wx - 10, wy - 2, 20, 28);
      g.fillStyle(row === 0 ? 0x6a7a96 : 0xf0d890, row === 0 ? 1 : 0.8); g.fillRect(wx - 8, wy, 16, 24);
      g.fillStyle(KITE_COLORS[2], 1); g.fillRect(wx - 16, wy - 2, 5, 28); g.fillRect(wx + 11, wy - 2, 5, 28);
    }
  }
  // The great door, steps, and the breath-meter over it.
  g.fillStyle(ROCK_DARK, 1); g.fillRect(x - 44, y - 8, 88, 8);
  g.fillStyle(ROCK, 1); g.fillRect(x - 36, y - 14, 72, 6);
  g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(x - 22, y - 70, 44, 56, { tl: 20, tr: 20, bl: 0, br: 0 });
  g.fillStyle(0x2c5a8a, 1); g.fillRoundedRect(x - 18, y - 66, 36, 52, { tl: 17, tr: 17, bl: 0, br: 0 });
  g.fillStyle(BRASS, 1); g.fillCircle(x + 10, y - 38, 2.5);
  breathMeter(g, x, y - 96, 20, 0.92);
  // The west tower: round, taller, with a glazed cupola.
  const tx = x - w / 2 - 10, tw = 74, th = 300;
  g.fillStyle(LIME_SHADE, 1); g.fillRect(tx - tw / 2 - 2, y - th - 2, tw + 4, th + 2);
  g.fillStyle(LIME, 1); g.fillRect(tx - tw / 2, y - th, tw * 0.7, th);
  g.fillStyle(LIME_SHADE, 0.6); g.fillRect(tx + tw * 0.2, y - th, tw * 0.3, th);
  for (let k = 0; k < 4; k++) { g.fillStyle(TAR, 1); g.fillRect(tx - 6, y - th + 40 + k * 62, 12, 22); g.fillStyle(0x6a7a96, 1); g.fillRect(tx - 4, y - th + 42 + k * 62, 8, 18); }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(tx - tw / 2 - 8, y - th - 6, tw + 16, 8);
  // Cupola: brass ribs and glass.
  g.fillStyle(BOTTLE, 0.8); g.fillRect(tx - 24, y - th - 46, 48, 40);
  g.lineStyle(2, BRASS_DARK, 1); for (let k = -2; k <= 2; k++) g.lineBetween(tx + k * 12, y - th - 46, tx + k * 12, y - th - 6);
  g.fillStyle(BRASS, 1); g.fillEllipse(tx, y - th - 48, 60, 18);
  g.fillStyle(BRASS_LIT, 1); g.fillEllipse(tx - 6, y - th - 52, 24, 6);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(tx - 2, y - th - 80, 4, 32);
  // Pennants on the gables (static; the long streamers are animated by the area).
  for (const px of [x + w / 2 + 6, x + 40]) {
    const py = px === x + 40 ? y - h - rh : y - h;
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(px - 1.5, py - 30, 3, 30);
  }
  return { x: tx, y: y - th - 80 };
}

/**
 * The Ropewalk — Hesper Lanyard's long shed, open along its front, with kites hanging from the
 * eaves to dry and a rope-twisting jack outside. `x,y` is the middle of its front.
 */
export function ropewalk(g: G, x: number, y: number, w: number, rng: () => number): void {
  const h = 64;
  shadow(g, x + 10, y + 4, w * 1.1, 20);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle(0x3a2e24, 1); g.fillRect(x - w / 2 + 6, y - h + 10, w - 12, h - 10);
  // Coils of rope inside, a long twisted rope running the length.
  for (let i = 0; i < 5; i++) {
    const cx = x - w / 2 + 30 + i * ((w - 60) / 4);
    g.fillStyle(ROPE_DARK, 1); g.fillEllipse(cx, y - 10, 30, 12);
    g.lineStyle(2, ROPE, 1); g.strokeEllipse(cx, y - 12, 24, 9); g.strokeEllipse(cx, y - 13, 14, 5);
  }
  g.lineStyle(3, ROPE, 1); g.lineBetween(x - w / 2 + 10, y - 36, x + w / 2 - 10, y - 36);
  g.lineStyle(1, ROPE_DARK, 1); for (let k = x - w / 2 + 12; k < x + w / 2 - 10; k += 6) g.lineBetween(k, y - 38, k + 3, y - 34);
  // Posts and a low tarred roof.
  for (let k = 0; k <= 4; k++) { g.fillStyle(TIMBER, 1); g.fillRect(x - w / 2 + k * (w / 4) - 3, y - h, 6, h); }
  g.fillStyle(TAR, 1); g.fillRect(x - w / 2 - 12, y - h - 14, w + 24, 16);
  g.fillStyle(TAR_LIT, 1); g.fillRect(x - w / 2 - 12, y - h - 14, w + 24, 3);
  // Kites hung to dry under the eaves.
  for (let i = 0; i < 6; i++) {
    const kx = x - w / 2 + 20 + i * ((w - 40) / 5);
    g.lineStyle(1, ROPE_DARK, 1); g.lineBetween(kx, y - h + 2, kx, y - h + 10);
    kite(g, kx, y - h + 20, 0.8, KITE_COLORS[i % 4], Math.PI / 2 + (rng() - 0.5) * 0.3, i * 0.7);
  }
  // A sign: a kite and a coil.
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 40, y - h - 40, 80, 24);
  g.lineStyle(2, TIMBER_DARK, 1); g.strokeRect(x - 40, y - h - 40, 80, 24);
  kite(g, x - 18, y - h - 28, 0.6, KITE_COLORS[0], 0, 0);
  g.lineStyle(2, ROPE_DARK, 1); g.strokeCircle(x + 18, y - h - 28, 7); g.strokeCircle(x + 18, y - h - 28, 3);
}

/**
 * The Millstone's bake-house: a low stone oven-house against the mill, a fat chimney leaning east,
 * a loaf-board over the door and flour sacks stacked by it. `x,y` the middle of its front.
 */
export function bakehouse(g: G, x: number, y: number, rng: () => number): Pt {
  const w = 150, h = 74;
  shadow(g, x + 10, y + 4, w * 1.2, 22);
  g.fillStyle(ROCK_DARK, 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(ROCK, 1); g.fillRect(x - w / 2, y - h, w, h);
  for (let i = 0; i < 26; i++) { g.fillStyle(rng() < 0.5 ? ROCK_LIT : ROCK_DARK, 0.35); g.fillRoundedRect(x - w / 2 + rng() * (w - 16), y - h + rng() * (h - 10), 14, 8, 3); }
  // Roof.
  g.fillStyle(SLATE_DARK, 1); g.fillTriangle(x - w / 2 - 12, y - h + 2, x + w / 2 + 12, y - h + 2, x, y - h - 46);
  g.fillStyle(SLATE, 1); g.fillTriangle(x - w / 2 - 8, y - h, x + w / 2 + 8, y - h, x, y - h - 42);
  // The oven chimney, fat, leaning east a touch with years of wind.
  g.fillStyle(ROCK_DARK, 1);
  g.fillPoints([new Phaser.Geom.Point(x + 26, y - h - 10), new Phaser.Geom.Point(x + 50, y - h - 10), new Phaser.Geom.Point(x + 56, y - h - 70), new Phaser.Geom.Point(x + 34, y - h - 70)], true, true);
  g.fillStyle(ROCK, 1); g.fillRect(x + 32, y - h - 76, 28, 8);
  // The oven mouth glowing in the wall, a door, the loaf-board.
  g.fillStyle(0x2a1a10, 1); g.fillRoundedRect(x - 56, y - 40, 36, 30, { tl: 15, tr: 15, bl: 0, br: 0 });
  g.fillStyle(0xf09030, 0.9); g.fillRoundedRect(x - 52, y - 34, 28, 22, { tl: 12, tr: 12, bl: 0, br: 0 });
  glow(g, x - 38, y - 24, 30, 0xf0a040, 0.05, 3);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + 4, y - 40, 28, 40);
  g.fillStyle(TIMBER, 1); g.fillRect(x + 6, y - 38, 24, 38);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 20, y - h - 6, 60, 18);
  g.fillStyle(GRAIN, 1); g.fillEllipse(x - 4, y - h + 3, 20, 10); g.fillEllipse(x + 22, y - h + 3, 20, 10);
  g.lineStyle(1, TIMBER_DARK, 1); g.lineBetween(x - 10, y - h + 1, x + 2, y - h + 5); g.lineBetween(x + 16, y - h + 1, x + 28, y - h + 5);
  grainSack(g, x + 56, y, 0.9, true); grainSack(g, x + 72, y + 4, 0.8, true);
  return { x: x + 18, y: y + 16 };
}

/** A sleeping debtor's cot: a narrow bed under a blanket, the sleeper's meter needle at zero. */
export function sleeperCot(g: G, x: number, y: number, blanket: number): void {
  shadow(g, x, y + 2, 76, 14);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 34, y - 14, 68, 12);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 34, y - 4, 4, 6); g.fillRect(x + 30, y - 4, 4, 6);
  g.fillStyle(0xf2efe6, 1); g.fillRoundedRect(x - 34, y - 22, 20, 10, 4);
  g.fillStyle(blanket, 1); g.fillRoundedRect(x - 18, y - 24, 52, 14, 5);
  g.fillStyle(dim(blanket, 0.2), 1); for (let k = -10; k < 30; k += 10) g.fillRect(x + k, y - 24, 3, 14);
  breathMeter(g, x + 4, y - 30, 5, 0);
}

/** A rack of corked breath-bottles waiting for the cargo lift up to the Lung. */
export function bottleRack(g: G, x: number, y: number, rows: number, cols: number): void {
  shadow(g, x, y + 2, cols * 16 + 30, 14);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - cols * 8 - 6, y - rows * 26 - 10, cols * 16 + 12, rows * 26 + 10);
  for (let r = 0; r < rows; r++) {
    g.fillStyle(TIMBER, 1); g.fillRect(x - cols * 8 - 4, y - r * 26 - 4, cols * 16 + 8, 4);
    for (let c = 0; c < cols; c++) breathBottle(g, x - cols * 8 + 8 + c * 16, y - r * 26 - 4, 0.62, c + r, 0.8);
  }
  // A brass tally-plate on the end.
  g.fillStyle(BRASS, 1); g.fillRect(x + cols * 8 + 6, y - rows * 26, 10, 16);
}

/** The spire rising: a band of grey crags along the north edge. */
export function cragBand(g: G, x0: number, x1: number, y: number, rng: () => number): void {
  for (let x = x0; x < x1; x += 34 + rng() * 20) {
    const h = 60 + rng() * 70, w = 50 + rng() * 40;
    g.fillStyle(ROCK_DARK, 1);
    g.fillTriangle(x - w / 2, y, x + w / 2, y, x + (rng() - 0.5) * 20, y - h);
    g.fillStyle(ROCK, 1);
    g.fillTriangle(x - w / 2 + 6, y, x + w * 0.1, y, x + (rng() - 0.5) * 10 - 4, y - h + 8);
    g.fillStyle(ROCK_LIT, 0.6); g.fillTriangle(x - 8, y - h * 0.6, x - 2, y - h * 0.6, x - 4, y - h + 12);
  }
  for (let x = x0; x < x1; x += 16) { g.fillStyle(TURF_DARK, 0.9); g.fillEllipse(x, y - 2, 24, 8); }
}
