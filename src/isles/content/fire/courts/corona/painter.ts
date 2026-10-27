import Phaser from 'phaser';
import type { AreaPainter, Pt, Rect } from '../../../../IslesTypes';
import {
  G, blob, dim, glow, groundFill, lit, mixC, mulberry, rock, shadow, stroke,
} from '../../../../art/IsleArt';
import {
  BRASS, BRASS_DARK, BRASS_LIT, COPPER, GLASS_CRACK, GLASS_DEEP, GLASS_GLINT, GLASS_SAND, GLASS_SAND_DARK,
  GLASS_SHEEN, IRON, PLASMA, PLASMA_CORE, PLASMA_DEEP, PLASMA_LIT, PLASTER, SHADE, STONE, STONE_LIT,
  SUN, SUN_CAGE, SUN_CORE, SUN_DEEP, SUN_RIM,
} from './palette';
import {
  AREA_H, AREA_W, BOTTLE, CONDUITS, COTTAGES, FULGURITES, LAMPS, LONE_STONES, OBS_NE, OBS_S, OBS_W, PALACE,
  PLAZA, POOL, PYLON_CHAINS, PYLON_H, RIM_E, RIM_N, ROADS, SHOP, STONE_RING,
} from './layout';

/**
 * The Corona Court's plateau. Nothing here is drawn twice in the isle:
 *
 * • The ground is sand the captive sun fused into glass — plates of amber-teal glaze with a
 *   specular streak each, crack networks with a lit lip, Lichtenberg scorches where plasma
 *   grounded, and a gold reflection of the sun pooled on the plaza.
 * • Plasma conduits run out from under the palace in glass-lidded grooves; pulses of violet-white
 *   travel along them every frame.
 * • Tesla pylons stand in chains and crackle to each other; standing stones throw hard black
 *   shadows *away from the sun* (radially — the light source is in the middle of the map).
 * • Over everything hangs the captive sun in a three-ring brass armillary that turns in true 3D,
 *   back halves of the rings passing behind the star and front halves across it.
 */

// ── Small helpers ───────────────────────────────────────────────────────

const inView = (v: Rect, x: number, y: number, pad: number): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

/** Length-indexed polyline sampling, cached per conduit so the pulse animation stays cheap. */
interface PathCache { pts: Pt[]; cum: number[]; total: number }
const cachePath = (pts: Pt[]): PathCache => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, cum, total: cum[cum.length - 1] };
};
const sampleAt = (c: PathCache, d: number): Pt => {
  const dd = Phaser.Math.Clamp(d, 0, c.total);
  for (let i = 1; i < c.pts.length; i++) {
    if (dd <= c.cum[i]) {
      const seg = c.cum[i] - c.cum[i - 1] || 1;
      const t = (dd - c.cum[i - 1]) / seg;
      return { x: c.pts[i - 1].x + (c.pts[i].x - c.pts[i - 1].x) * t, y: c.pts[i - 1].y + (c.pts[i].y - c.pts[i - 1].y) * t };
    }
  }
  return c.pts[c.pts.length - 1];
};
const CONDUIT_CACHE = CONDUITS.map(cachePath);

/** Fixed glint points — sparkles on the glass, twinkling one at a time. */
const GLINTS: Pt[] = (() => {
  const r = mulberry(0xc0a0a);
  const out: Pt[] = [];
  for (let i = 0; i < 260; i++) out.push({ x: 30 + r() * (RIM_E - 60), y: RIM_N + 20 + r() * (AREA_H - RIM_N - 40) });
  return out;
})();

// ── Ground pieces ───────────────────────────────────────────────────────

/** One plate of fused glass: an irregular polygon, sheen fill, dark lip, and one specular streak. */
function glassPlate(g: G, x: number, y: number, s: number, rng: () => number): void {
  const n = 5 + Math.floor(rng() * 3);
  const pts: Phaser.Geom.Point[] = [];
  const rot = rng() * Math.PI;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2 + (rng() - 0.5) * 0.5;
    const k = s * (0.7 + rng() * 0.45);
    pts.push(P(x + Math.cos(a) * k, y + Math.sin(a) * k * 0.62));
  }
  const tint = mixC(GLASS_SHEEN, GLASS_SAND, rng() * 0.55);
  g.fillStyle(GLASS_CRACK, 0.35); g.fillPoints(pts.map((p) => P(p.x + 1.5, p.y + 2)), true, true);
  g.fillStyle(tint, 0.22 + rng() * 0.22); g.fillPoints(pts, true, true);
  // Upper-left lip catches the light, the rest of the edge is a crack.
  g.lineStyle(1.2, GLASS_CRACK, 0.55); g.strokePoints(pts, true, true);
  g.lineStyle(1, GLASS_GLINT, 0.25);
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y - 1);
  for (let i = 1; i <= Math.floor(n / 2); i++) g.lineTo(pts[i].x, pts[i].y - 1);
  g.strokePath();
  // Specular streak: a thin diagonal slash of white, as if the sun is caught in it.
  const sx = x - s * 0.25, sy = y - s * 0.12;
  g.lineStyle(2, GLASS_GLINT, 0.18 + rng() * 0.2);
  g.lineBetween(sx, sy, sx + s * 0.4, sy - s * 0.2);
  g.lineStyle(1, GLASS_GLINT, 0.35);
  g.lineBetween(sx + s * 0.08, sy + 4, sx + s * 0.26, sy - s * 0.05);
}

/** A crack network: a random walk that forks, dark line with a lit lip. */
function crack(g: G, x: number, y: number, len: number, a0: number, rng: () => number, depth = 0): void {
  let cx = x, cy = y, a = a0;
  const steps = 4 + Math.floor(rng() * 4);
  for (let s = 0; s < steps; s++) {
    const l = len / steps * (0.6 + rng() * 0.8);
    const nx = cx + Math.cos(a) * l, ny = cy + Math.sin(a) * l * 0.7;
    g.lineStyle(depth ? 1 : 1.6, GLASS_CRACK, 0.75);
    g.lineBetween(cx, cy, nx, ny);
    g.lineStyle(1, GLASS_GLINT, 0.16);
    g.lineBetween(cx, cy - 1.5, nx, ny - 1.5);
    if (depth < 2 && rng() < 0.35) crack(g, nx, ny, len * 0.45, a + (rng() < 0.5 ? 0.9 : -0.9), rng, depth + 1);
    cx = nx; cy = ny; a += (rng() - 0.5) * 0.9;
  }
}

/** A Lichtenberg figure — where a bolt grounded, the sand fused into a branching violet-black fern. */
function lichtenberg(g: G, x: number, y: number, r: number, rng: () => number): void {
  g.fillStyle(PLASMA_DEEP, 0.18); g.fillEllipse(x, y, r * 1.2, r * 0.7);
  const branch = (bx: number, by: number, a: number, len: number, w: number, d: number): void => {
    if (d > 4 || len < 5) return;
    const nx = bx + Math.cos(a) * len, ny = by + Math.sin(a) * len * 0.62;
    g.lineStyle(w, d < 2 ? 0x1a0b2a : PLASMA_DEEP, 0.75);
    g.lineBetween(bx, by, nx, ny);
    const kids = d < 2 ? 3 : 2;
    for (let k = 0; k < kids; k++) branch(nx, ny, a + (rng() - 0.5) * 1.3, len * (0.55 + rng() * 0.2), Math.max(0.8, w * 0.65), d + 1);
  };
  for (let i = 0; i < 6; i++) branch(x, y, (i / 6) * Math.PI * 2 + rng() * 0.4, r * 0.4, 2.6, 0);
  g.fillStyle(GLASS_GLINT, 0.5); g.fillCircle(x, y, 2.5);
}

/** A conduit groove: a dark channel with a glass lid and a dim violet seam (the pulses ride on it). */
function conduitGroove(g: G, pts: Pt[]): void {
  stroke(g, pts, 20, GLASS_CRACK, 0.8);
  stroke(g, pts, 14, dim(PLASMA_DEEP, 0.45), 1);
  stroke(g, pts, 7, PLASMA_DEEP, 0.9);
  stroke(g, pts, 2.5, PLASMA, 0.75);
  // Brass clamps across the groove.
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / (len || 1), uy = (b.y - a.y) / (len || 1);
    for (let d = 30; d < len; d += 70) {
      const cx = a.x + ux * d, cy = a.y + uy * d;
      g.lineStyle(4, BRASS_DARK, 1); g.lineBetween(cx - uy * 12, cy + ux * 12, cx + uy * 12, cy - ux * 12);
      g.lineStyle(1.5, BRASS_LIT, 0.8); g.lineBetween(cx - uy * 11, cy + ux * 11 - 1, cx + uy * 11, cy - ux * 11 - 1);
    }
  }
}

/** Walkway: polished dark glass with a brass kerb line and studs. */
function walkway(g: G, pts: Pt[], rng: () => number): void {
  stroke(g, pts, 64, GLASS_SAND_DARK, 0.9);
  stroke(g, pts, 54, dim(GLASS_DEEP, 0.35), 1);
  stroke(g, pts, 44, GLASS_DEEP, 1);
  // Long reflective streak down the middle.
  stroke(g, pts, 6, lit(GLASS_DEEP, 0.25), 0.35);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / (len || 1), uy = (b.y - a.y) / (len || 1);
    for (let d = 0; d < len; d += 26) {
      for (const side of [-1, 1]) {
        const sx = a.x + ux * d - uy * 25 * side, sy = a.y + uy * d + ux * 25 * side;
        g.fillStyle(BRASS_DARK, 1); g.fillCircle(sx, sy + 0.8, 2.6);
        g.fillStyle(BRASS_LIT, 0.9); g.fillCircle(sx, sy, 1.8);
      }
      // Tile seams across the lane.
      if (rng() < 0.7) {
        g.lineStyle(1, GLASS_CRACK, 0.5);
        g.lineBetween(a.x + ux * d - uy * 21, a.y + uy * d + ux * 21, a.x + ux * d + uy * 21, a.y + uy * d - ux * 21);
      }
    }
  }
}

/** The plaza orrery: concentric brass orbits in the glass with planets fixed at noon. */
function plaza(g: G, rng: () => number): void {
  const { x, y, r } = PLAZA;
  g.fillStyle(GLASS_SAND_DARK, 1); g.fillEllipse(x, y, r * 2 + 18, r * 1.3 + 12);
  g.fillStyle(GLASS_DEEP, 1); g.fillEllipse(x, y, r * 2, r * 1.3);
  g.fillStyle(lit(GLASS_DEEP, 0.12), 0.6); g.fillEllipse(x - r * 0.2, y - r * 0.18, r * 1.2, r * 0.5);
  for (let k = 1; k <= 4; k++) {
    const rr = r * k / 4.3;
    g.lineStyle(3, BRASS_DARK, 1); g.strokeEllipse(x, y + 1, rr * 2, rr * 1.3);
    g.lineStyle(1.5, BRASS_LIT, 0.85); g.strokeEllipse(x, y, rr * 2, rr * 1.3);
    const a = rng() * Math.PI * 2;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.65;
    g.fillStyle(dim(BRASS, 0.3), 1); g.fillCircle(px, py + 1, 6 - k * 0.6);
    g.fillStyle(k === 3 ? COPPER : BRASS, 1); g.fillCircle(px, py, 5 - k * 0.6);
  }
  // Hour marks round the rim, noon (north, toward the sun) in gold.
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
    const r0 = r * 0.96, r1 = r * (i % 6 === 0 ? 0.84 : 0.9);
    g.lineStyle(i === 0 ? 4 : 2, i === 0 ? SUN : BRASS_LIT, 0.9);
    g.lineBetween(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * 0.65, x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.65);
  }
  // The hub — a sun disc of gold glass.
  g.fillStyle(SUN_DEEP, 1); g.fillCircle(x, y, 13);
  g.fillStyle(SUN, 1); g.fillCircle(x, y - 1, 10);
  g.fillStyle(SUN_CORE, 0.9); g.fillCircle(x - 3, y - 4, 4);
}

/** A standing stone's hard black shadow, cast radially away from the captive sun. */
function stoneShadow(g: G, x: number, y: number, w: number, len: number): void {
  const a = Math.atan2(y - SUN_CAGE.y, x - SUN_CAGE.x);
  const ux = Math.cos(a), uy = Math.sin(a);
  const px = -uy, py = ux;
  const hw = w * 0.5;
  g.fillStyle(SHADE, 0.82);
  g.fillPoints([
    P(x + px * hw, y + py * hw * 0.6),
    P(x + px * hw * 1.1 + ux * len, y + (py * hw * 0.6) * 1.1 + uy * len * 0.7),
    P(x - px * hw * 1.1 + ux * len, y - (py * hw * 0.6) * 1.1 + uy * len * 0.7),
    P(x - px * hw, y - py * hw * 0.6),
  ], true, true);
  g.fillStyle(SHADE, 0.82); g.fillEllipse(x, y, w * 1.1, w * 0.45);
}

/** The plateau rim: sky haze beyond, then a cliff lip of fused glass. */
function rims(g: G, rng: () => number): void {
  // North sky band.
  for (let i = 0; i < 8; i++) {
    g.fillStyle(mixC(0x2a1640, 0xff9a4a, i / 10), 1);
    g.fillRect(0, i * (RIM_N - 30) / 8, AREA_W, (RIM_N - 30) / 8 + 1);
  }
  // Far islands of cloud.
  for (let i = 0; i < 14; i++) {
    blob(g, rng() * AREA_W, 20 + rng() * 50, 60 + rng() * 90, 8 + rng() * 8, lit(0x5b3a6e, 0.2 + rng() * 0.2), 0.6, rng, 7);
  }
  // Cliff face.
  g.fillStyle(GLASS_SAND_DARK, 1); g.fillRect(0, RIM_N - 34, AREA_W, 40);
  for (let x = 0; x < AREA_W; x += 18 + rng() * 22) {
    g.fillStyle(dim(GLASS_SAND_DARK, 0.3 + rng() * 0.3), 1);
    g.fillTriangle(x, RIM_N - 34, x + 14 + rng() * 10, RIM_N - 34, x + 6, RIM_N - 34 - 8 - rng() * 14);
  }
  g.fillStyle(lit(GLASS_SAND, 0.15), 1); g.fillRect(0, RIM_N + 2, AREA_W, 5);
  g.lineStyle(2, GLASS_GLINT, 0.35); g.lineBetween(0, RIM_N + 3, AREA_W, RIM_N + 3);
  // East cliff.
  for (let i = 0; i < 6; i++) {
    g.fillStyle(mixC(0x2a1640, 0x6a3a7a, i / 6), 1);
    g.fillRect(RIM_E + 30 + i * 12, 0, 13, AREA_H);
  }
  g.fillStyle(GLASS_SAND_DARK, 1); g.fillRect(RIM_E, RIM_N, 34, AREA_H - RIM_N);
  for (let y = RIM_N; y < AREA_H; y += 20 + rng() * 26) {
    g.fillStyle(dim(GLASS_SAND_DARK, 0.3 + rng() * 0.3), 1);
    g.fillTriangle(RIM_E + 34, y, RIM_E + 34, y + 16 + rng() * 10, RIM_E + 46 + rng() * 14, y + 8);
  }
  g.fillStyle(lit(GLASS_SAND, 0.15), 1); g.fillRect(RIM_E - 5, RIM_N, 5, AREA_H - RIM_N);
}

/** The glass pool: still water in a basin of clear glass, the sun mirrored in it. */
function poolBasin(g: G, rng: () => number): void {
  const r = POOL;
  g.fillStyle(GLASS_CRACK, 0.5); g.fillRoundedRect(r.x - 18, r.y - 12, r.w + 36, r.h + 32, 40);
  g.fillStyle(lit(GLASS_SHEEN, 0.35), 1); g.fillRoundedRect(r.x - 14, r.y - 14, r.w + 28, r.h + 28, 40);
  g.fillStyle(GLASS_SHEEN, 1); g.fillRoundedRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12, 34);
  g.fillStyle(0x2f6f86, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 30);
  g.fillStyle(0x1d4a66, 1); g.fillRoundedRect(r.x + 26, r.y + 22, r.w - 52, r.h - 44, 24);
  g.fillStyle(0x12304a, 1); g.fillRoundedRect(r.x + 70, r.y + 52, r.w - 140, r.h - 104, 20);
  // Glass shelves visible through the shallows.
  for (let i = 0; i < 9; i++) {
    g.lineStyle(1.5, lit(GLASS_SHEEN, 0.3), 0.35);
    const sx = r.x + 20 + rng() * (r.w - 40), sy = r.y + 16 + rng() * (r.h - 32);
    g.lineBetween(sx, sy, sx + 20 + rng() * 30, sy + (rng() - 0.5) * 10);
  }
  // Rim highlight.
  g.lineStyle(2, GLASS_GLINT, 0.5);
  g.beginPath(); g.arc(r.x + 34, r.y + 34, 30, Math.PI, Math.PI * 1.5, false); g.strokePath();
  g.lineBetween(r.x + 34, r.y + 4, r.x + r.w - 60, r.y + 4);
}

// ── Set pieces ──────────────────────────────────────────────────────────

/** Flux's laboratory-palace: glass-brick colonnade, brass wings, the cage's tripod struts. */
function drawPalace(g: G, rng: () => number): void {
  const { x, y, w, h } = PALACE;
  shadow(g, x, y + 8, w * 1.15, 40, 0.45);
  // Steps.
  for (let s = 0; s < 3; s++) {
    g.fillStyle(dim(PLASTER, 0.25 + s * 0.08), 1);
    g.fillRect(x - 70 - s * 14, y - 4 + s * 6, 140 + s * 28, 8);
  }
  // Wings: brass-clad blocks with round porthole windows of violet glass.
  for (const side of [-1, 1]) {
    const wx = x + side * (w * 0.36);
    g.fillStyle(dim(BRASS_DARK, 0.3), 1); g.fillRect(wx - 72, y - h * 0.78, 144, h * 0.78);
    g.fillStyle(BRASS_DARK, 1); g.fillRect(wx - 68, y - h * 0.78 + 4, 136, h * 0.78 - 4);
    for (let r = 0; r < 4; r++) {
      g.fillStyle(lit(BRASS_DARK, 0.12), 1); g.fillRect(wx - 68, y - h * 0.78 + 8 + r * 34, 136, 3);
    }
    for (let i = -1; i <= 1; i++) {
      const px = wx + i * 40, py = y - h * 0.48;
      g.fillStyle(BRASS, 1); g.fillCircle(px, py, 15);
      g.fillStyle(PLASMA_DEEP, 1); g.fillCircle(px, py, 11);
      g.fillStyle(PLASMA, 0.8); g.fillCircle(px, py, 8);
      g.fillStyle(PLASMA_LIT, 0.8); g.fillCircle(px - 3, py - 3, 3);
    }
    // Little dome on each wing, with a lightning rod.
    g.fillStyle(dim(COPPER, 0.4), 1); g.fillEllipse(wx, y - h * 0.78, 120, 70);
    g.fillStyle(COPPER, 1); g.fillEllipse(wx, y - h * 0.79, 112, 64);
    g.fillStyle(lit(COPPER, 0.3), 0.7); g.fillEllipse(wx - 22, y - h * 0.86, 36, 16);
    g.fillStyle(IRON, 1); g.fillRect(wx - 1.5, y - h * 0.79 - 64, 3, 34);
    g.fillStyle(PLASMA_LIT, 1); g.fillCircle(wx, y - h * 0.79 - 66, 3);
  }
  // Central hall: a colonnade of glass-brick pillars before a great sun door.
  const cw = w * 0.42;
  g.fillStyle(dim(PLASTER, 0.5), 1); g.fillRect(x - cw / 2 - 4, y - h - 4, cw + 8, h + 4);
  g.fillStyle(PLASTER, 1); g.fillRect(x - cw / 2, y - h, cw, h);
  for (let i = 0; i < 5; i++) {
    const px = x - cw / 2 + 14 + i * ((cw - 28) / 4);
    g.fillStyle(dim(GLASS_SHEEN, 0.2), 1); g.fillRect(px - 9, y - h + 18, 18, h - 22);
    for (let b = 0; b < 8; b++) {
      g.fillStyle(b % 2 ? GLASS_SHEEN : lit(GLASS_SHEEN, 0.25), 0.9);
      g.fillRect(px - 7, y - h + 21 + b * ((h - 26) / 8), 14, (h - 26) / 8 - 2);
    }
    g.fillStyle(BRASS, 1); g.fillRect(px - 11, y - h + 14, 22, 6); g.fillRect(px - 11, y - 6, 22, 6);
  }
  // The sun door.
  g.fillStyle(BRASS_DARK, 1); g.fillRoundedRect(x - 30, y - 82, 60, 82, { tl: 30, tr: 30, bl: 0, br: 0 });
  g.fillStyle(BRASS, 1); g.fillRoundedRect(x - 26, y - 78, 52, 78, { tl: 26, tr: 26, bl: 0, br: 0 });
  g.fillStyle(SUN_DEEP, 1); g.fillCircle(x, y - 52, 15);
  g.fillStyle(SUN, 1); g.fillCircle(x, y - 52, 11);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.lineStyle(2, BRASS_LIT, 1);
    g.lineBetween(x + Math.cos(a) * 15, y - 52 + Math.sin(a) * 15, x + Math.cos(a) * 22, y - 52 + Math.sin(a) * 22);
  }
  g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(x, y - 30, x, y);
  // Pediment: a brass orrery frieze.
  g.fillStyle(dim(BRASS, 0.3), 1); g.fillRect(x - cw / 2 - 12, y - h - 16, cw + 24, 16);
  g.fillStyle(BRASS, 1); g.fillRect(x - cw / 2 - 10, y - h - 14, cw + 20, 11);
  for (let i = 0; i < 9; i++) {
    g.fillStyle(i === 4 ? SUN : BRASS_LIT, 1);
    g.fillCircle(x - cw / 2 + 4 + i * ((cw - 8) / 8), y - h - 8, i === 4 ? 5 : 2.5);
  }
  // Cradle on the roof + three tripod struts climbing to the armillary.
  const cy = SUN_CAGE.y, R = SUN_CAGE.r + 64;
  g.fillStyle(dim(BRASS_DARK, 0.2), 1); g.fillEllipse(x, y - h - 18, cw + 30, 24);
  for (const k of [-1, 0, 1]) {
    const bx = x + k * (cw * 0.55), by = y - h - 16;
    const tx = x + k * R * 0.72, ty = cy + R * (k === 0 ? 0.98 : 0.66);
    g.lineStyle(12, BRASS_DARK, 1); g.lineBetween(bx, by, tx, ty);
    g.lineStyle(7, BRASS, 1); g.lineBetween(bx, by, tx, ty);
    g.lineStyle(2, BRASS_LIT, 0.9); g.lineBetween(bx - 2, by, tx - 2, ty);
    // Rivets.
    for (let s = 1; s < 6; s++) {
      g.fillStyle(BRASS_LIT, 1);
      g.fillCircle(bx + (tx - bx) * s / 6, by + (ty - by) * s / 6, 1.8);
    }
  }
  void rng;
}

/** Brightwell's Lenses: a glassblower's shop, its awning hung with lenses that throw tiny suns. */
function drawShop(g: G, rng: () => number): void {
  const { x, y, w, h } = SHOP;
  shadow(g, x, y + 6, w * 1.2, 24);
  g.fillStyle(dim(PLASTER, 0.45), 1); g.fillRect(x - w / 2 - 3, y - h - 3, w + 6, h + 3);
  g.fillStyle(lit(PLASTER, 0.05), 1); g.fillRect(x - w / 2, y - h, w, h);
  // Kiln chimney (a glassblower's glory-hole) with a gold mouth.
  g.fillStyle(dim(GLASS_SAND_DARK, 0.2), 1); g.fillRect(x + w * 0.24, y - h - 52, 30, 56);
  g.fillStyle(SUN_RIM, 0.9); g.fillCircle(x + w * 0.24 + 15, y - h - 30, 7);
  g.fillStyle(SUN_CORE, 0.8); g.fillCircle(x + w * 0.24 + 15, y - h - 30, 3);
  // Flat roof with a brass rail.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - w / 2 - 8, y - h - 10, w + 16, 12);
  g.fillStyle(BRASS, 1); g.fillRect(x - w / 2 - 8, y - h - 12, w + 16, 4);
  // Display window: shelves of coloured glass.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - w / 2 + 12, y - h + 22, 82, 62);
  g.fillStyle(0x1b2430, 1); g.fillRect(x - w / 2 + 16, y - h + 26, 74, 54);
  const glassColors = [PLASMA, SUN, COPPER, GLASS_SHEEN, SUN_RIM, PLASMA_LIT];
  for (let s = 0; s < 2; s++) {
    g.fillStyle(BRASS, 1); g.fillRect(x - w / 2 + 16, y - h + 50 + s * 26, 74, 3);
    for (let i = 0; i < 5; i++) {
      const c = glassColors[Math.floor(rng() * glassColors.length)];
      const bx = x - w / 2 + 24 + i * 14, by = y - h + 49 + s * 26;
      g.fillStyle(c, 0.85); g.fillRoundedRect(bx - 4, by - 14 - rng() * 4, 8, 14, 3);
      g.fillStyle(0xffffff, 0.5); g.fillRect(bx - 2, by - 12, 1.5, 6);
    }
  }
  // Door.
  g.fillStyle(BRASS_DARK, 1); g.fillRoundedRect(x + 18, y - 56, 36, 56, { tl: 14, tr: 14, bl: 0, br: 0 });
  g.fillStyle(0x3a2a40, 1); g.fillRoundedRect(x + 22, y - 52, 28, 52, { tl: 12, tr: 12, bl: 0, br: 0 });
  // Awning hung with lenses.
  g.fillStyle(dim(PLASMA_DEEP, 0.2), 1); g.fillTriangle(x - w / 2 - 6, y - h + 4, x + w / 2 + 6, y - h + 4, x, y - h - 4);
  for (let i = 0; i < 8; i++) {
    const ax = x - w / 2 + 4 + i * (w / 7.3);
    g.fillStyle(i % 2 ? PLASMA_DEEP : PLASTER, 1); g.fillRect(ax, y - h + 2, w / 7.3, 14);
    g.fillStyle(i % 2 ? PLASMA_DEEP : PLASTER, 1); g.fillCircle(ax + w / 14.6, y - h + 16, w / 14.6);
    g.lineStyle(1, BRASS_LIT, 0.8); g.lineBetween(ax + w / 14.6, y - h + 20, ax + w / 14.6, y - h + 34);
    g.fillStyle(GLASS_GLINT, 0.4); g.fillCircle(ax + w / 14.6, y - h + 38, 5);
    g.lineStyle(1.2, BRASS, 1); g.strokeCircle(ax + w / 14.6, y - h + 38, 5);
  }
  // Sign: a lens with an eye in it.
  g.fillStyle(BRASS, 1); g.fillCircle(x - w / 2 - 14, y - h + 30, 16);
  g.fillStyle(GLASS_SHEEN, 1); g.fillCircle(x - w / 2 - 14, y - h + 30, 12);
  g.fillStyle(0x12202a, 1); g.fillEllipse(x - w / 2 - 14, y - h + 30, 14, 8);
  g.fillStyle(PLASMA_LIT, 1); g.fillCircle(x - w / 2 - 14, y - h + 30, 3);
}

/** An observatory: plaster drum, copper dome with an open slit, a brass telescope poking out. */
function drawObservatory(g: G, cx: number, cy: number, r: number, aim: number, rng: () => number, vault = false): void {
  shadow(g, cx, cy + 6, r * 2.4, r * 0.5, 0.4);
  const drumH = r * 0.9;
  g.fillStyle(dim(PLASTER, 0.45), 1); g.fillRect(cx - r - 3, cy - drumH - 3, r * 2 + 6, drumH + 3);
  g.fillStyle(PLASTER, 1); g.fillRect(cx - r, cy - drumH, r * 2, drumH);
  g.fillStyle(dim(PLASTER, 0.15), 1); g.fillEllipse(cx, cy, r * 2, r * 0.4);
  for (let i = 0; i < r / 6; i++) {
    g.fillStyle(dim(PLASTER, 0.1 + rng() * 0.1), 0.6);
    g.fillRect(cx - r + rng() * r * 2 - 4, cy - drumH + rng() * drumH, 8, 2);
  }
  // Band of brass and a row of slot windows.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(cx - r, cy - drumH, r * 2, 7);
  for (let i = -2; i <= 2; i++) {
    g.fillStyle(0x221b2a, 1); g.fillRoundedRect(cx + i * r * 0.36 - 4, cy - drumH * 0.6, 8, 20, 4);
  }
  // Dome.
  const dy = cy - drumH;
  g.fillStyle(dim(COPPER, 0.45), 1);
  g.beginPath(); g.arc(cx, dy, r + 4, Math.PI, 0, false); g.closePath(); g.fillPath();
  g.fillStyle(COPPER, 1);
  g.beginPath(); g.arc(cx, dy, r, Math.PI, 0, false); g.closePath(); g.fillPath();
  // Verdigris streaks + panel ribs.
  for (let i = 1; i < 6; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    g.lineStyle(1.5, dim(COPPER, 0.25), 0.9);
    g.lineBetween(cx, dy - r + 2, cx + Math.cos(a) * r, dy + Math.sin(a) * r * 0.05);
  }
  g.fillStyle(lit(COPPER, 0.35), 0.6); g.fillEllipse(cx - r * 0.35, dy - r * 0.55, r * 0.5, r * 0.2);
  // Open slit + telescope.
  const sx = cx + Math.cos(aim) * r * 0.25;
  g.fillStyle(0x140f1c, 1); g.fillRect(sx - 9, dy - r * 0.95, 18, r * 0.95);
  const tx = sx, ty = dy - r * 0.45;
  const ex = tx + Math.cos(aim) * r * 1.0, ey = ty + Math.sin(aim) * r * 1.0;
  g.lineStyle(14, BRASS_DARK, 1); g.lineBetween(tx, ty, ex, ey);
  g.lineStyle(10, BRASS, 1); g.lineBetween(tx, ty, ex, ey);
  g.lineStyle(2, BRASS_LIT, 1); g.lineBetween(tx, ty - 3, ex, ey - 3);
  g.fillStyle(GLASS_SHEEN, 1); g.fillCircle(ex, ey, 6);
  g.fillStyle(GLASS_GLINT, 0.8); g.fillCircle(ex - 1.5, ey - 1.5, 2);
  // Door.
  g.fillStyle(BRASS_DARK, 1); g.fillRoundedRect(cx - 12, cy - 34, 24, 34, { tl: 12, tr: 12, bl: 0, br: 0 });
  if (vault) {
    // The containment vault behind the west observatory: a sealed brass hatch in a glass mound,
    // hazard chevrons painted round it and a cracked inspection port leaking violet.
    const vx = cx + r + 50, vy = cy - 8;
    g.fillStyle(dim(GLASS_SAND_DARK, 0.2), 1); g.fillEllipse(vx, vy, 96, 46);
    g.fillStyle(GLASS_SHEEN, 0.5); g.fillEllipse(vx, vy - 4, 86, 38);
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(vx, vy - 6, 22);
    g.fillStyle(BRASS, 1); g.fillCircle(vx, vy - 7, 18);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.fillStyle(i % 2 ? 0x1a1a1a : SUN, 1);
      g.fillCircle(vx + Math.cos(a) * 14, vy - 7 + Math.sin(a) * 14, 3);
    }
    g.fillStyle(PLASMA_DEEP, 1); g.fillCircle(vx, vy - 7, 7);
    g.fillStyle(PLASMA_LIT, 0.9); g.fillCircle(vx, vy - 7, 3.5);
    g.lineStyle(1.5, GLASS_CRACK, 1);
    g.lineBetween(vx - 4, vy - 12, vx + 6, vy - 2); g.lineBetween(vx + 1, vy - 7, vx - 6, vy + 1);
  }
}

/** A Tesla pylon: an iron lattice tower capped with a copper torus and a ball terminal. */
function drawPylon(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 46, 14, 0.4);
  const h = PYLON_H;
  // Splayed feet.
  g.lineStyle(4, IRON, 1);
  g.lineBetween(x - 20, y, x - 6, y - h + 30); g.lineBetween(x + 20, y, x + 6, y - h + 30);
  // Lattice.
  g.lineStyle(1.5, lit(IRON, 0.25), 1);
  for (let k = 0; k < 6; k++) {
    const t0 = k / 6, t1 = (k + 1) / 6;
    const w0 = 20 - 14 * t0, w1 = 20 - 14 * t1;
    const y0 = y - (h - 30) * t0, y1 = y - (h - 30) * t1;
    g.lineBetween(x - w0, y0, x + w1, y1); g.lineBetween(x + w0, y0, x - w1, y1);
    g.lineBetween(x - w1, y1, x + w1, y1);
  }
  // Ceramic insulator stack.
  for (let i = 0; i < 3; i++) {
    g.fillStyle(0x9b8ea8, 1); g.fillEllipse(x, y - h + 28 - i * 7, 16, 6);
    g.fillStyle(0xd8d0e2, 1); g.fillEllipse(x, y - h + 27 - i * 7, 12, 3);
  }
  // Torus + terminal.
  g.lineStyle(7, dim(COPPER, 0.4), 1); g.strokeEllipse(x, y - h + 6, 40, 13);
  g.lineStyle(4, COPPER, 1); g.strokeEllipse(x, y - h + 5, 40, 13);
  g.lineStyle(1.5, lit(COPPER, 0.4), 1); g.strokeEllipse(x, y - h + 3, 36, 10);
  g.fillStyle(dim(BRASS, 0.3), 1); g.fillCircle(x, y - h - 4, 8);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x - 2, y - h - 6, 3);
  // Warning plate.
  g.fillStyle(SUN, 1); g.fillTriangle(x - 7, y - 26, x + 7, y - 26, x, y - 38);
  g.fillStyle(0x1a1a1a, 1); g.fillRect(x - 1, y - 34, 2, 5);
}

/** A standing stone — tall, dark, with a lit sun-side edge (it faces the cage). */
function drawStone(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const lean = (rng() - 0.5) * 8;
  const pts = [
    P(x - w / 2, y), P(x - w / 2 + 3 + lean * 0.3, y - h * 0.6), P(x - w * 0.3 + lean, y - h),
    P(x + w * 0.25 + lean, y - h + 6), P(x + w / 2 - 2 + lean * 0.3, y - h * 0.55), P(x + w / 2, y),
  ];
  g.fillStyle(dim(STONE, 0.5), 1); g.fillPoints(pts.map((p) => P(p.x + 2, p.y)), true, true);
  g.fillStyle(STONE, 1); g.fillPoints(pts, true, true);
  // Sun-side edge: the face toward the cage burns pale.
  const sunLeft = SUN_CAGE.x < x;
  g.fillStyle(STONE_LIT, 0.8);
  g.fillPoints(sunLeft
    ? [pts[0], pts[1], pts[2], P(pts[2].x + 6, pts[2].y + 4), P(pts[1].x + 7, pts[1].y), P(pts[0].x + 7, pts[0].y)]
    : [pts[5], pts[4], pts[3], P(pts[3].x - 6, pts[3].y + 4), P(pts[4].x - 7, pts[4].y), P(pts[5].x - 7, pts[5].y)], true, true);
  // Lichen of glass beads and an old carved ring.
  g.lineStyle(1.5, dim(STONE, 0.3), 1); g.strokeCircle(x + lean * 0.5, y - h * 0.55, w * 0.18);
  for (let i = 0; i < 5; i++) {
    g.fillStyle(GLASS_SHEEN, 0.7); g.fillCircle(x - w / 3 + rng() * w * 0.66, y - rng() * h * 0.4, 1.4);
  }
}

/** A glazed cottage with a ration mirror on a post: the mirror is the household's sun. */
function drawCottage(g: G, x: number, y: number, w: number, cold: boolean, rng: () => number): void {
  const h = 70;
  shadow(g, x, y + 4, w * 1.2, 20);
  g.fillStyle(dim(GLASS_SAND, 0.4), 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 2);
  g.fillStyle(lit(GLASS_SAND, 0.18), 1); g.fillRect(x - w / 2, y - h, w, h);
  // Glazed (vitrified) wall: glossy bands.
  for (let i = 0; i < 4; i++) {
    g.fillStyle(GLASS_SHEEN, 0.18 + rng() * 0.12); g.fillRect(x - w / 2, y - h + 8 + i * 16, w, 7);
  }
  // Dome-ish glass roof.
  g.fillStyle(dim(GLASS_DEEP, 0.3), 1); g.fillEllipse(x, y - h, w + 14, 46);
  g.fillStyle(GLASS_DEEP, 1); g.fillEllipse(x, y - h - 2, w + 6, 40);
  g.fillStyle(GLASS_GLINT, 0.35); g.fillEllipse(x - w * 0.22, y - h - 10, w * 0.3, 8);
  // Hearth window: lit gold if the tithe fire burns, black if it is cold.
  const wx = x - w * 0.25, wy = y - h * 0.55;
  g.fillStyle(BRASS_DARK, 1); g.fillRect(wx - 10, wy - 10, 20, 20);
  g.fillStyle(cold ? 0x0e0b12 : SUN_RIM, 1); g.fillRect(wx - 8, wy - 8, 16, 16);
  if (!cold) { g.fillStyle(SUN, 0.15); g.fillCircle(wx, wy, 20); }
  // Door with the King's brand.
  g.fillStyle(BRASS_DARK, 1); g.fillRoundedRect(x + w * 0.12, y - 32, 22, 32, { tl: 10, tr: 10, bl: 0, br: 0 });
  g.fillStyle(SUN_RIM, cold ? 0.3 : 0.85); g.fillCircle(x + w * 0.12 + 11, y - 18, 3);
  // Ration mirror on a post, turned toward the sun — or, for a cold hearth, turned to the ground.
  const mx = x + w / 2 + 22, my = y;
  g.fillStyle(IRON, 1); g.fillRect(mx - 2, my - 58, 4, 58);
  const toSun = Math.atan2(SUN_CAGE.y - (my - 60), SUN_CAGE.x - mx);
  const face = cold ? Math.PI / 2 + 0.3 : toSun;
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(mx + Math.cos(face) * 4, my - 62 + Math.sin(face) * 4, 26, 18);
  g.fillStyle(cold ? 0x3d3a44 : lit(GLASS_SHEEN, 0.4), 1); g.fillEllipse(mx + Math.cos(face) * 5, my - 62 + Math.sin(face) * 5, 21, 14);
  if (!cold) { g.fillStyle(GLASS_GLINT, 0.8); g.fillEllipse(mx + Math.cos(face) * 5 - 3, my - 65 + Math.sin(face) * 5, 6, 3); }
  if (cold) {
    // A clerk's seal on the post: rationed.
    g.fillStyle(PLASMA_DEEP, 1); g.fillRect(mx - 6, my - 34, 12, 9);
    g.fillStyle(PLASMA_LIT, 0.8); g.fillRect(mx - 4, my - 32, 8, 2);
  }
}

/** The magnetic bottle works: a tokamak torus in a brass cradle with banded coils. */
function drawBottle(g: G): void {
  const { x, y, rx, ry } = BOTTLE;
  const cy = y - 40;
  shadow(g, x, y + 4, rx * 2.4, ry * 1.1, 0.42);
  // Cradle legs.
  for (const k of [-0.75, -0.25, 0.25, 0.75]) {
    g.fillStyle(BRASS_DARK, 1); g.fillRect(x + k * rx - 6, cy, 12, 44);
    g.fillStyle(BRASS, 1); g.fillRect(x + k * rx - 4, cy, 8, 42);
  }
  // Back half of the torus.
  g.lineStyle(48, dim(IRON, 0.1), 1); g.beginPath(); g.arc(x, cy, rx, Math.PI, Math.PI * 2, false);
  g.strokePath();
  g.lineStyle(38, 0x3a3644, 1);
  g.strokeEllipse(x, cy, rx * 2, ry * 2);
  g.lineStyle(26, 0x4a4656, 1);
  g.strokeEllipse(x, cy - 3, rx * 2, ry * 2);
  // Coils around the tube.
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const px = x + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
    const front = Math.sin(a) > 0;
    g.fillStyle(front ? COPPER : dim(COPPER, 0.4), 1);
    g.fillEllipse(px, py, 12, 44);
    g.fillStyle(lit(COPPER, 0.3), front ? 0.8 : 0.3); g.fillRect(px - 4, py - 20, 2, 40);
  }
  // Central solenoid column.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 16, cy - 70, 32, 70);
  g.fillStyle(BRASS, 1); g.fillRect(x - 12, cy - 68, 24, 66);
  for (let i = 0; i < 9; i++) { g.fillStyle(COPPER, 1); g.fillRect(x - 13, cy - 64 + i * 7, 26, 3); }
  g.fillStyle(SUN, 1); g.fillCircle(x, cy - 72, 6);
  // Sight-glass ports (their glow is animated).
  for (const a of [Math.PI * 0.3, Math.PI * 0.7]) {
    const px = x + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
    g.fillStyle(BRASS, 1); g.fillCircle(px, py, 10);
    g.fillStyle(0x1a0b2a, 1); g.fillCircle(px, py, 7);
  }
}

/** A fulgurite: branched glass tubes standing out of the sand where plasma grounded. */
function drawFulgurite(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 1, 24, 7, 0.3);
  const arms = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < arms; i++) {
    const a = -Math.PI / 2 + (rng() - 0.5) * 1.2;
    const len = 16 + rng() * 26;
    const mx = x + Math.cos(a) * len * 0.5 + (rng() - 0.5) * 6, my = y + Math.sin(a) * len * 0.5;
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    g.lineStyle(5, dim(GLASS_SAND, 0.3), 1); g.lineBetween(x, y, mx, my); g.lineBetween(mx, my, ex, ey);
    g.lineStyle(3, lit(GLASS_SHEEN, 0.1), 1); g.lineBetween(x, y, mx, my); g.lineBetween(mx, my, ex, ey);
    g.fillStyle(GLASS_GLINT, 0.7); g.fillCircle(ex, ey, 1.5);
  }
}

/** A plasma lamp: brass post, glass globe, violet filament (the flicker is animated). */
function drawLamp(g: G, x: number, y: number): void {
  shadow(g, x, y, 18, 6);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 2.5, y - 50, 5, 50);
  g.fillStyle(BRASS, 1); g.fillRect(x - 6, y - 4, 12, 4); g.fillRect(x - 5, y - 52, 10, 4);
  g.fillStyle(0x221a2e, 0.9); g.fillCircle(x, y - 62, 10);
  g.lineStyle(1.5, BRASS_LIT, 0.9); g.strokeCircle(x, y - 62, 10);
  g.fillStyle(GLASS_GLINT, 0.5); g.fillCircle(x - 4, y - 66, 2.5);
}

// ── The sun & armillary (animated, over actors) ─────────────────────────

/**
 * A ring of the armillary, in 3D: radius `rr`, tilted `tilt` about the x axis, spun `spin` about
 * the vertical. Points are split into back (behind the star) and front halves so the star can be
 * painted between them.
 */
function ringPoints(rr: number, tilt: number, spin: number, n = 56): { x: number; y: number; z: number }[] {
  const out: { x: number; y: number; z: number }[] = [];
  const ct = Math.cos(tilt), st = Math.sin(tilt), cs = Math.cos(spin), ss = Math.sin(spin);
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * Math.PI * 2;
    // Ring in its own plane (x, z), tilted about x, then spun about y.
    const x0 = Math.cos(u) * rr, z0 = Math.sin(u) * rr;
    const y1 = -z0 * st, z1 = z0 * ct;
    const x2 = x0 * cs + z1 * ss, z2 = -x0 * ss + z1 * cs;
    out.push({ x: x2, y: y1, z: z2 });
  }
  return out;
}

function strokeRingHalf(g: G, pts: { x: number; y: number; z: number }[], cx: number, cy: number, front: boolean, width: number): void {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const z = (a.z + b.z) / 2;
    if ((z >= 0) !== front) continue;
    const shade = front ? 1 : 0.55;
    g.lineStyle(width + 4, BRASS_DARK, shade);
    g.lineBetween(cx + a.x, cy + a.y, cx + b.x, cy + b.y);
    g.lineStyle(width, front ? BRASS : dim(BRASS, 0.35), 1);
    g.lineBetween(cx + a.x, cy + a.y, cx + b.x, cy + b.y);
    if (front) {
      g.lineStyle(1.5, BRASS_LIT, 0.9);
      g.lineBetween(cx + a.x, cy + a.y - width * 0.3, cx + b.x, cy + b.y - width * 0.3);
      if (i % 7 === 0) { g.fillStyle(BRASS_LIT, 1); g.fillCircle(cx + b.x, cy + b.y, 2.4); }
    }
  }
}

function drawSunAndCage(g: G, t: number): void {
  const { x: cx, y: cy, r } = SUN_CAGE;
  const s = t / 1000;
  const rings = [
    ringPoints(r + 52, 1.25, s * 0.35),            // the ecliptic band, slowly precessing
    ringPoints(r + 66, 0.0, s * 0.22 + 1.1),       // the meridian, turning about the vertical
    ringPoints(r + 80, 0.55, -s * 0.16 + 2.4),     // the tilted colure
  ];
  // Halo — the sun's light filling the air of the whole plaza.
  for (let k = 6; k >= 1; k--) { g.fillStyle(SUN, 0.035); g.fillCircle(cx, cy, r * (1.1 + k * 0.42)); }
  for (const pts of rings) strokeRingHalf(g, pts, cx, cy, false, 6);
  // Corona rays: long thin spikes that breathe at different rates.
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + s * 0.08;
    const len = r * (0.45 + 0.35 * (0.5 + 0.5 * Math.sin(s * 1.7 + i * 2.3)));
    const w = 0.07;
    g.fillStyle(i % 2 ? SUN : SUN_CORE, 0.32);
    g.fillTriangle(
      cx + Math.cos(a - w) * r * 0.92, cy + Math.sin(a - w) * r * 0.92,
      cx + Math.cos(a + w) * r * 0.92, cy + Math.sin(a + w) * r * 0.92,
      cx + Math.cos(a) * (r + len), cy + Math.sin(a) * (r + len),
    );
  }
  // Prominences: three arches of plasma lifting off the limb, rising and falling back.
  for (let k = 0; k < 3; k++) {
    const life = (s * 0.18 + k / 3) % 1;
    const a = k * 2.1 + Math.floor(s * 0.18 + k / 3) * 1.3;
    const lift = Math.sin(life * Math.PI) * r * 0.55;
    const a0 = a - 0.22, a1 = a + 0.22;
    const x0 = cx + Math.cos(a0) * r * 0.95, y0 = cy + Math.sin(a0) * r * 0.95;
    const x1 = cx + Math.cos(a1) * r * 0.95, y1 = cy + Math.sin(a1) * r * 0.95;
    const mx = cx + Math.cos(a) * (r + lift), my = cy + Math.sin(a) * (r + lift);
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(x0, y0), new Phaser.Math.Vector2(mx, my), new Phaser.Math.Vector2(x1, y1),
    );
    const pts = curve.getPoints(14);
    g.lineStyle(9, SUN_RIM, 0.35 * Math.sin(life * Math.PI)); g.strokePoints(pts, false);
    g.lineStyle(4, SUN, 0.8 * Math.sin(life * Math.PI)); g.strokePoints(pts, false);
  }
  // The body.
  const pulse = 1 + Math.sin(s * 2.2) * 0.018;
  g.fillStyle(SUN_DEEP, 1); g.fillCircle(cx, cy, r * pulse + 4);
  g.fillStyle(SUN_RIM, 1); g.fillCircle(cx, cy, r * pulse);
  g.fillStyle(SUN, 1); g.fillCircle(cx - 2, cy - 2, r * 0.9 * pulse);
  // Granulation: slow-boiling cells.
  for (let i = 0; i < 16; i++) {
    const a = i * 2.39996 + s * 0.05 * (i % 2 ? 1 : -1);
    const d = r * 0.72 * Math.sqrt(((i * 37) % 16) / 16);
    const cr = 9 + 4 * Math.sin(s * 1.3 + i);
    g.fillStyle(lit(SUN, 0.35), 0.5); g.fillCircle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, cr);
  }
  // Two sunspots drifting across the face.
  for (let k = 0; k < 2; k++) {
    const ph = ((s * 0.03 + k * 0.5) % 1) * 2 - 1;
    const sx = cx + ph * r * 0.7, sy = cy + (k ? 18 : -24) + Math.sin(ph * 2) * 6;
    const fade = 1 - Math.abs(ph);
    g.fillStyle(SUN_DEEP, 0.55 * fade); g.fillEllipse(sx, sy, 16 * fade + 4, 11);
    g.fillStyle(0x5a1a04, 0.7 * fade); g.fillEllipse(sx, sy, 7 * fade + 2, 5);
  }
  g.fillStyle(SUN_CORE, 0.85); g.fillCircle(cx - r * 0.18, cy - r * 0.2, r * 0.42);
  g.fillStyle(0xffffff, 0.8); g.fillCircle(cx - r * 0.28, cy - r * 0.32, r * 0.14);
  for (const pts of rings) strokeRingHalf(g, pts, cx, cy, true, 6);
  // The zodiac band carries tick marks on its front half.
  const band = rings[0];
  for (let i = 0; i < band.length; i += 4) {
    const p = band[i];
    if (p.z < 0) continue;
    g.fillStyle(SUN_CORE, 0.9); g.fillRect(cx + p.x - 1, cy + p.y - 4, 2, 8);
  }
  // Polar axis spike through the cage.
  g.lineStyle(5, BRASS_DARK, 1); g.lineBetween(cx, cy - r - 96, cx, cy - r - 4);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(cx, cy - r - 98, 6);
  g.fillStyle(PLASMA_LIT, 0.4 + 0.4 * Math.sin(s * 9)); g.fillCircle(cx, cy - r - 98, 3);
}

// ── The painter ─────────────────────────────────────────────────────────

export const CORONA_PAINTER: AreaPainter = {
  ground(g, rng) {
    groundFill(g, { x: 0, y: 0, w: AREA_W, h: AREA_H }, GLASS_SAND, GLASS_SHEEN, GLASS_GLINT, rng, 0.9);
    // Unfused sand along the edges, matte and rippled.
    for (let i = 0; i < 70; i++) {
      const edge = rng();
      const x = edge < 0.5 ? rng() * 260 : rng() * AREA_W;
      const y = edge < 0.5 ? RIM_N + rng() * (AREA_H - RIM_N) : AREA_H - rng() * 160;
      blob(g, x, y, 60 + rng() * 90, 24 + rng() * 30, lit(GLASS_SAND, 0.12), 0.5, rng, 8);
      for (let k = 0; k < 4; k++) {
        g.lineStyle(1, dim(GLASS_SAND, 0.25), 0.5);
        g.lineBetween(x - 40, y - 10 + k * 7, x + 40, y - 14 + k * 7);
      }
    }
    // The sun's scorch: the glaze runs darker and glossier the nearer the cage.
    for (let k = 10; k >= 1; k--) {
      g.fillStyle(GLASS_DEEP, 0.045);
      g.fillEllipse(SUN_CAGE.x, PALACE.y + 40, 260 + k * 150, 140 + k * 80);
    }
    // Glass plates across the plateau, denser toward the middle.
    for (let i = 0; i < 520; i++) {
      const x = rng() * AREA_W, y = RIM_N + rng() * (AREA_H - RIM_N);
      const d = Math.hypot(x - SUN_CAGE.x, (y - PALACE.y) * 1.4);
      if (rng() < d / 2600) continue;
      glassPlate(g, x, y, 26 + rng() * 46, rng);
    }
    for (let i = 0; i < 120; i++) crack(g, rng() * AREA_W, RIM_N + rng() * (AREA_H - RIM_N), 80 + rng() * 140, rng() * Math.PI * 2, rng);
    for (let i = 0; i < 14; i++) lichtenberg(g, 120 + rng() * (RIM_E - 240), RIM_N + 80 + rng() * (AREA_H - RIM_N - 160), 40 + rng() * 40, rng);
    // Plasma conduits, under the walkways' studs but over the glass.
    for (const c of CONDUITS) conduitGroove(g, c);
    for (const r of ROADS) walkway(g, r, rng);
    plaza(g, rng);
    // The sun mirrored in the glass of the palace forecourt.
    for (let k = 5; k >= 1; k--) { g.fillStyle(SUN, 0.05); g.fillEllipse(SUN_CAGE.x, PALACE.y + 26, 120 + k * 60, 26 + k * 12); }
    g.fillStyle(SUN_CORE, 0.25); g.fillEllipse(SUN_CAGE.x, PALACE.y + 26, 90, 14);
    // Shadows — hard, black, radial from the sun.
    const sr = mulberry(0x5ade);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 0.95 + (i / 7) * Math.PI * 2;
      if (Math.cos(a) < -0.85) continue;
      const sx = STONE_RING.x + Math.cos(a) * STONE_RING.r, sy = STONE_RING.y + Math.sin(a) * STONE_RING.r * 0.7;
      stoneShadow(g, sx, sy, 34 + sr() * 10, 120 + sr() * 30);
    }
    for (const s of LONE_STONES) stoneShadow(g, s.x, s.y, 30, s.h * 1.4);
    // The ring's inner floor: an old dark circle no glaze ever quite took.
    g.fillStyle(SHADE, 0.18); g.fillEllipse(STONE_RING.x, STONE_RING.y, STONE_RING.r * 1.7, STONE_RING.r * 1.1);
    for (const chain of PYLON_CHAINS) for (const p of chain) {
      g.fillStyle(GLASS_CRACK, 0.5); g.fillEllipse(p.x, p.y + 2, 64, 22);
      lichtenberg(g, p.x, p.y + 4, 46, rng);
    }
    poolBasin(g, rng);
    rims(g, rng);
  },

  pieces: [
    { x: PALACE.x, y: PALACE.y, w: PALACE.w + 80, h: PALACE.y - SUN_CAGE.y + SUN_CAGE.r, draw: drawPalace },
    { x: SHOP.x, y: SHOP.y, w: SHOP.w + 40, h: SHOP.h + 60, draw: drawShop },
    { x: OBS_W.x, y: OBS_W.y, w: OBS_W.r * 2 + 200, h: OBS_W.r * 2 + 30, draw: (g, rng) => drawObservatory(g, OBS_W.x, OBS_W.y, OBS_W.r, -Math.PI * 0.7, rng, true) },
    { x: OBS_NE.x, y: OBS_NE.y, w: OBS_NE.r * 3, h: OBS_NE.r * 2 + 40, draw: (g, rng) => drawObservatory(g, OBS_NE.x, OBS_NE.y, OBS_NE.r, -Math.PI * 0.3, rng) },
    { x: OBS_S.x, y: OBS_S.y, w: OBS_S.r * 3, h: OBS_S.r * 2 + 30, draw: (g, rng) => drawObservatory(g, OBS_S.x, OBS_S.y, OBS_S.r, -Math.PI * 0.55, rng) },
    { x: BOTTLE.x, y: BOTTLE.y, w: BOTTLE.rx * 2 + 60, h: 150, draw: (g: G) => drawBottle(g) },
    ...PYLON_CHAINS.flat().map((p) => ({ x: p.x, y: p.y, w: 60, h: PYLON_H + 20, draw: (g: G) => drawPylon(g, p.x, p.y) })),
    ...(() => {
      const out: { x: number; y: number; w: number; h: number; draw: (g: G, rng: () => number) => void }[] = [];
      const sr = mulberry(0x5ade);
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * 0.95 + (i / 7) * Math.PI * 2;
        if (Math.cos(a) < -0.85) continue;
        const sx = STONE_RING.x + Math.cos(a) * STONE_RING.r, sy = STONE_RING.y + Math.sin(a) * STONE_RING.r * 0.7;
        const w = 34 + sr() * 10; sr();
        const h = 92 + ((i * 29) % 30);
        out.push({ x: sx, y: sy, w: w + 10, h: h + 10, draw: (g, rng) => drawStone(g, sx, sy, w, h, rng) });
      }
      for (const s of LONE_STONES) out.push({ x: s.x, y: s.y, w: 40, h: s.h + 10, draw: (g, rng) => drawStone(g, s.x, s.y, 30, s.h, rng) });
      return out;
    })(),
    ...COTTAGES.map((c) => ({ x: c.x, y: c.y, w: c.w + 80, h: 120, draw: (g: G, rng: () => number) => drawCottage(g, c.x, c.y, c.w, !!c.cold, rng) })),
    ...FULGURITES.map((p) => ({ x: p.x, y: p.y, w: 50, h: 50, draw: (g: G, rng: () => number) => drawFulgurite(g, p.x, p.y, rng) })),
    ...LAMPS.map((p) => ({ x: p.x, y: p.y, w: 26, h: 76, draw: (g: G) => drawLamp(g, p.x, p.y) })),
    // A few glass boulders, half-melted, along the rim.
    ...[{ x: 140, y: 220 }, { x: 2210, y: 260 }, { x: 2230, y: 1500 }, { x: 1020, y: 220 }].map((p) => ({
      x: p.x, y: p.y, w: 60, h: 50, draw: (g: G, rng: () => number) => rock(g, p.x, p.y, 22, mixC(GLASS_SHEEN, GLASS_SAND, 0.5), rng),
    })),
  ],

  animate(g, t, view) {
    const s = t / 1000;
    // Conduit pulses: violet-white slugs of plasma riding out from the palace.
    CONDUIT_CACHE.forEach((c, ci) => {
      const speed = 150 + ci * 12;
      for (let d = ((s * speed) + ci * 90) % 230; d < c.total; d += 230) {
        const p = sampleAt(c, d);
        if (!inView(view, p.x, p.y, 30)) continue;
        const q = sampleAt(c, d - 22);
        g.lineStyle(9, PLASMA, 0.3); g.lineBetween(q.x, q.y, p.x, p.y);
        g.lineStyle(4, PLASMA_LIT, 0.85); g.lineBetween(q.x, q.y, p.x, p.y);
        g.fillStyle(PLASMA_CORE, 0.95); g.fillCircle(p.x, p.y, 3);
      }
    });
    // Glints: one in a dozen points of glass catches the sun at any moment.
    for (let i = 0; i < GLINTS.length; i++) {
      const p = GLINTS[i];
      if (!inView(view, p.x, p.y, 10)) continue;
      const ph = (s * 0.6 + i * 0.137) % 1;
      if (ph > 0.12) continue;
      const k = Math.sin((ph / 0.12) * Math.PI);
      g.lineStyle(1.2, GLASS_GLINT, 0.9 * k);
      g.lineBetween(p.x - 6 * k, p.y, p.x + 6 * k, p.y);
      g.lineBetween(p.x, p.y - 6 * k, p.x, p.y + 6 * k);
      g.fillStyle(0xffffff, k); g.fillCircle(p.x, p.y, 1.5);
    }
    // The glass pool: the sun's reflection wobbling, rings spreading, photon tetras flashing.
    const pr = POOL;
    if (inView(view, pr.x + pr.w / 2, pr.y + pr.h / 2, pr.w)) {
      const rx = pr.x + pr.w * 0.62, ry = pr.y + pr.h * 0.4;
      for (let k = 0; k < 5; k++) {
        const wob = Math.sin(s * 2.4 + k) * 6;
        g.fillStyle(k % 2 ? SUN : SUN_CORE, 0.3 - k * 0.04);
        g.fillEllipse(rx + wob, ry + k * 7, 52 - k * 6, 5);
      }
      for (let i = 0; i < 3; i++) {
        const ph = (s * 0.4 + i / 3) % 1;
        const ox = pr.x + 80 + ((i * 131) % (pr.w - 160)), oy = pr.y + 60 + ((i * 71) % (pr.h - 120));
        g.lineStyle(1.2, GLASS_GLINT, 0.5 * (1 - ph));
        g.strokeEllipse(ox, oy, 10 + ph * 60, 4 + ph * 22);
      }
      for (let i = 0; i < 7; i++) {
        const a = s * (0.7 + i * 0.13) + i * 1.9;
        const fx = pr.x + pr.w / 2 + Math.cos(a) * (pr.w * 0.3 - i * 6);
        const fy = pr.y + pr.h / 2 + Math.sin(a * 1.3) * (pr.h * 0.28);
        const blink = Math.max(0, Math.sin(s * 5 + i * 2.1));
        g.fillStyle(PLASMA_LIT, 0.6 * blink); g.fillEllipse(fx, fy, 7, 3);
        g.fillStyle(0xffffff, 0.8 * blink); g.fillCircle(fx + 2, fy, 1);
      }
    }
    // Plasma lamp filaments.
    for (let i = 0; i < LAMPS.length; i++) {
      const p = LAMPS[i];
      if (!inView(view, p.x, p.y - 62, 40)) continue;
      const fl = 0.75 + 0.25 * Math.sin(s * 13 + i * 3.1);
      glow(g, p.x, p.y - 62, 26 * fl, PLASMA, 0.05, 3);
      g.lineStyle(1.2, PLASMA_LIT, 0.9);
      for (let k = 0; k < 3; k++) {
        const a = s * 4 + k * 2.1 + i;
        g.lineBetween(p.x, p.y - 62, p.x + Math.cos(a) * 8, p.y - 62 + Math.sin(a) * 8);
      }
      g.fillStyle(PLASMA_CORE, 0.95); g.fillCircle(p.x, p.y - 62, 2.2);
    }
    // The palace forecourt: the mirrored sun breathing with the real one.
    if (inView(view, SUN_CAGE.x, PALACE.y + 26, 200)) {
      const b = 0.5 + 0.5 * Math.sin(s * 2.2);
      g.fillStyle(SUN, 0.06 + b * 0.05); g.fillEllipse(SUN_CAGE.x, PALACE.y + 26, 300, 40);
    }
  },

  animateOver(g, t, view) {
    const s = t / 1000;
    const { x: cx, y: cy, r } = SUN_CAGE;
    if (inView(view, cx, cy, r + 300)) drawSunAndCage(g, t);
    // Arcs between pylon tops: a jagged bolt that re-rolls ten times a second, plus a corona glow.
    PYLON_CHAINS.forEach((chain, ci) => {
      for (let i = 0; i < chain.length - 1; i++) {
        const a = chain[i], b = chain[i + 1];
        const ax = a.x, ay = a.y - PYLON_H - 4, bx = b.x, by = b.y - PYLON_H - 4;
        if (!inView(view, (ax + bx) / 2, (ay + by) / 2, Math.abs(bx - ax) / 2 + 60)) continue;
        // Each link fires in bursts, not constantly.
        const on = Math.sin(s * 2.1 + ci * 1.7 + i * 2.3) > 0.1;
        glow(g, ax, ay, 16, PLASMA, 0.08, 2); glow(g, bx, by, 16, PLASMA, 0.08, 2);
        if (!on) continue;
        const seed = Math.floor(s * 10) + ci * 31 + i * 7;
        const rr = mulberry(seed);
        const n = 10;
        let px = ax, py = ay;
        g.lineStyle(6, PLASMA, 0.25);
        const pts: Pt[] = [{ x: ax, y: ay }];
        for (let k = 1; k <= n; k++) {
          const tt = k / n;
          const sag = Math.sin(tt * Math.PI) * 26;
          const nx = ax + (bx - ax) * tt + (k < n ? (rr() - 0.5) * 18 : 0);
          const ny = ay + (by - ay) * tt + sag + (k < n ? (rr() - 0.5) * 18 : 0);
          pts.push({ x: nx, y: ny });
          g.lineBetween(px, py, nx, ny);
          px = nx; py = ny;
        }
        g.lineStyle(2, PLASMA_LIT, 0.95);
        for (let k = 1; k < pts.length; k++) g.lineBetween(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y);
        g.lineStyle(1, PLASMA_CORE, 1);
        for (let k = 1; k < pts.length; k += 2) g.lineBetween(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y);
      }
    });
    // Bottle works: the plasma inside shows through the sight-glasses, and a faint halo leaks.
    const bcy = BOTTLE.y - 40;
    if (inView(view, BOTTLE.x, bcy, 220)) {
      for (const a of [Math.PI * 0.3, Math.PI * 0.7]) {
        const px = BOTTLE.x + Math.cos(a) * BOTTLE.rx, py = bcy + Math.sin(a) * BOTTLE.ry;
        const fl = 0.6 + 0.4 * Math.sin(s * 7 + a * 5);
        g.fillStyle(PLASMA, 0.6 * fl); g.fillCircle(px, py, 6);
        g.fillStyle(PLASMA_CORE, 0.8 * fl); g.fillCircle(px - 1, py - 1, 2.5);
      }
      const sweep = (s * 0.9) % (Math.PI * 2);
      g.fillStyle(PLASMA_LIT, 0.35); g.fillCircle(BOTTLE.x + Math.cos(sweep) * BOTTLE.rx, bcy - 30 + Math.sin(sweep) * BOTTLE.ry * 0.25, 4);
    }
    // Heat shimmer motes rising off the forecourt under the sun.
    if (inView(view, cx, PALACE.y + 60, 300)) {
      for (let i = 0; i < 14; i++) {
        const ph = (s * 0.35 + i * 0.071) % 1;
        const x = cx - 240 + ((i * 97) % 480) + Math.sin(s * 2 + i) * 6;
        const y = PALACE.y + 140 - ph * 160;
        g.fillStyle(SUN_CORE, 0.25 * (1 - ph)); g.fillCircle(x, y, 1.6);
      }
    }
  },
};
