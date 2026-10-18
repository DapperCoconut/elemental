import Phaser from 'phaser';
import { FONT_DISPLAY, hex, mix } from './Theme';
import { tierIndexOf, divisionOf, divisionNumeral } from '../data/RankedData';

/**
 * Ranked badges — one bespoke emblem per tier, drawn entirely in code.
 *
 *   Bronze     a dented heater shield: hammer marks, a riveted rim, a crack, a central boss.
 *   Silver     the shield, cleaned up and winged — four layered feathers a side.
 *   Gold       a round-topped crest under a jewelled five-point crown, inside a laurel.
 *   Platinum   a faceted eight-point star behind a cut hexagonal crest.
 *   Diamond    a brilliant-cut gem between angular wing blades, with radiating flares.
 *   Excelsius  a celestial emblem: rotating sunburst, light wings, a starred crown, a
 *              rune ring, a faceted star and an orb at its heart, with orbiting motes.
 *
 * Shading is layered fills: each silhouette is re-filled at shrinking scales toward a
 * light source, stepping from the metal's dark tone to its light one, which reads as a
 * gradient on both renderers (`fillGradientStyle` is WebGL-only and ignores paths).
 *
 * `addRankBadge` returns a Container drawn around (0,0), so it scales and tweens in
 * place. With `animate` on, a shine band sweeps across the silhouette every few seconds
 * (clipped analytically to the outline, so it survives any container transform) and
 * Excelsius's rays, glow, motes and sparkles run per frame.
 */

type Pt = [number, number];

interface Metal {
  dark: number; mid: number; light: number; hi: number; gem: number; gemHi: number;
}

const METALS: Metal[] = [
  { dark: 0x3a1c0a, mid: 0x8a4a20, light: 0xd98a4a, hi: 0xffd2a0, gem: 0xff6a2a, gemHi: 0xffd0a0 }, // bronze
  { dark: 0x262c3a, mid: 0x76819a, light: 0xc6d0e0, hi: 0xffffff, gem: 0x6fd0ff, gemHi: 0xe6f8ff }, // silver
  { dark: 0x4a2a04, mid: 0xb07812, light: 0xffc44d, hi: 0xfff1b8, gem: 0xff2f55, gemHi: 0xffb3c2 }, // gold
  { dark: 0x0e3a3a, mid: 0x3aa69c, light: 0x9ff3e6, hi: 0xf0fffc, gem: 0x2fd3c0, gemHi: 0xd8fff8 }, // platinum
  { dark: 0x0a2558, mid: 0x2e6ad2, light: 0x8fd0ff, hi: 0xffffff, gem: 0xbfe9ff, gemHi: 0xffffff }, // diamond
  { dark: 0x2a0a4a, mid: 0x8a3ad6, light: 0xff9bf5, hi: 0xfffbe0, gem: 0xffd56b, gemHi: 0xfffbe0 }, // excelsius
];

/** Outline each tier's shine sweep is clipped to (unit coords). */
const SILHOUETTES: Pt[][] = [];

// ── Geometry helpers ──────────────────────────────────────────────────

function P(x: number, y: number): Phaser.Geom.Point {
  return new Phaser.Geom.Point(x, y);
}

function sc(pts: Pt[], s: number): Pt[] {
  return pts.map(([x, y]) => [x * s, y * s] as Pt);
}

function shrink(pts: Pt[], k: number, fx = 0, fy = 0): Pt[] {
  return pts.map(([x, y]) => [fx + (x - fx) * k, fy + (y - fy) * k] as Pt);
}

function shift(pts: Pt[], dx: number, dy: number): Pt[] {
  return pts.map(([x, y]) => [x + dx, y + dy] as Pt);
}

function mirrorX(pts: Pt[]): Pt[] {
  return pts.map(([x, y]) => [-x, y] as Pt);
}

function rot(pts: Pt[], a: number): Pt[] {
  const c = Math.cos(a), s = Math.sin(a);
  return pts.map(([x, y]) => [x * c - y * s, x * s + y * c] as Pt);
}

function fill(g: Phaser.GameObjects.Graphics, pts: Pt[], color: number, alpha = 1): void {
  if (pts.length < 3) return;
  g.fillStyle(color, alpha);
  g.fillPoints(pts.map(([x, y]) => P(x, y)), true, true);
}

function stroke(
  g: Phaser.GameObjects.Graphics, pts: Pt[], color: number, alpha = 1, w = 1, close = true,
): void {
  if (pts.length < 2) return;
  g.lineStyle(w, color, alpha);
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  if (close) g.closePath();
  g.strokePath();
}

/** Layered fill: the outline re-filled at shrinking scales toward a light point. */
function shade(
  g: Phaser.GameObjects.Graphics, pts: Pt[], outer: number, inner: number,
  fx: number, fy: number, steps = 9, minK = 0.18, alpha = 1,
): void {
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const k = 1 - t * (1 - minK);
    fill(g, shrink(pts, k, fx, fy), mix(outer, inner, t), alpha);
  }
}

/** Sampled quadratic curve, excluding the start point. */
function quad(p0: Pt, p1: Pt, p2: Pt, n = 10): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]);
  }
  return out;
}

function starPts(r1: number, r2: number, points: number, phase = -Math.PI / 2): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = phase + (i * Math.PI) / points;
    const r = i % 2 === 0 ? r1 : r2;
    out.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return out;
}

function circlePts(r: number, n = 28, cx = 0, cy = 0): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

/** Four-point lens flare / sparkle. */
function sparkle(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number, alpha = 1): void {
  fill(g, shift(starPts(r, r * 0.16, 4), x, y), color, alpha);
  fill(g, shift(rot(starPts(r * 0.5, r * 0.1, 4), Math.PI / 4), x, y), color, alpha * 0.7);
  g.fillStyle(0xffffff, alpha);
  g.fillCircle(x, y, r * 0.14);
}

/** Heater-shield outline in unit coords. */
function heaterShield(w = 0.7, top = -0.8, shoulder = -0.08, bottom = 0.92): Pt[] {
  const pts: Pt[] = [[-w, top], [w, top], [w, shoulder]];
  pts.push(...quad([w, shoulder], [w * 0.92, bottom * 0.62], [0, bottom], 10));
  pts.push(...quad([0, bottom], [-w * 0.92, bottom * 0.62], [-w, shoulder], 10));
  return pts;
}

// ── Shine sweep ───────────────────────────────────────────────────────

/**
 * A diagonal shine band clipped to `poly` (even-odd), drawn as parallel hairlines whose
 * alpha follows a soft profile. Lines satisfy `x + k·y = c` for c across the band.
 */
function drawShine(
  g: Phaser.GameObjects.Graphics, poly: Pt[], centre: number, halfW: number, color: number, alpha: number,
): void {
  const k = 0.55;
  const step = 1.1;
  for (let c = centre - halfW; c <= centre + halfW; c += step) {
    const prof = 1 - Math.abs(c - centre) / halfW;
    const a = alpha * prof * prof;
    if (a <= 0.01) continue;
    const ys: number[] = [];
    for (let i = 0; i < poly.length; i++) {
      const [ax, ay] = poly[i];
      const [bx, by] = poly[(i + 1) % poly.length];
      const fa = ax + k * ay - c;
      const fb = bx + k * by - c;
      if ((fa < 0) !== (fb < 0)) {
        const t = fa / (fa - fb);
        ys.push(ay + (by - ay) * t);
      }
    }
    ys.sort((p, q) => p - q);
    g.lineStyle(step + 0.2, color, a);
    for (let i = 0; i + 1 < ys.length; i += 2) {
      g.beginPath();
      g.moveTo(c - k * ys[i], ys[i]);
      g.lineTo(c - k * ys[i + 1], ys[i + 1]);
      g.strokePath();
    }
  }
}

// ── Per-tier art ──────────────────────────────────────────────────────

function drawBronze(g: Phaser.GameObjects.Graphics, s: number, m: Metal): void {
  // Rough edge: the shield outline nudged in at a few points, like a dented, chipped plate.
  const base = heaterShield(0.68, -0.78, -0.08, 0.9);
  const rough = base.map(([x, y], i) => {
    const dent = (Math.sin(i * 2.7) * 0.5 + 0.5) * 0.035 * (i % 3 === 0 ? 1 : 0.3);
    const len = Math.hypot(x, y) || 1;
    return [x - (x / len) * dent, y - (y / len) * dent] as Pt;
  });
  const sil = sc(rough, s);
  SILHOUETTES[0] = rough;

  fill(g, shift(sil, s * 0.05, s * 0.07), 0x000000, 0.45);
  fill(g, sil, m.dark);
  const plate = shrink(sil, 0.86, 0, -s * 0.03);
  shade(g, plate, m.mid, m.light, -s * 0.28, -s * 0.48, 10, 0.12);

  // Hammer marks.
  const marks: Array<[number, number, number]> = [
    [-0.32, -0.5, 0.07], [0.3, -0.42, 0.05], [-0.4, 0.12, 0.06], [0.36, 0.2, 0.07],
    [0.05, 0.5, 0.05], [-0.15, -0.25, 0.04], [0.42, -0.1, 0.04],
  ];
  for (const [mx, my, mr] of marks) {
    g.fillStyle(m.dark, 0.28);
    g.fillEllipse(mx * s, my * s, mr * 2.2 * s, mr * 1.5 * s);
    g.fillStyle(m.hi, 0.18);
    g.fillEllipse(mx * s - mr * 0.3 * s, my * s - mr * 0.35 * s, mr * 1.2 * s, mr * 0.6 * s);
  }

  // A crack running in from the right shoulder.
  stroke(g, sc([[0.62, -0.3], [0.48, -0.22], [0.5, -0.1], [0.38, -0.02], [0.4, 0.08]], s), m.dark, 0.85, Math.max(1, s * 0.03), false);
  stroke(g, sc([[0.6, -0.27], [0.47, -0.19], [0.49, -0.08]], s), m.hi, 0.25, 1, false);

  // Chevron under the boss.
  const chev: Pt[] = [[-0.38, 0.18], [0, 0.48], [0.38, 0.18], [0.38, 0.32], [0, 0.62], [-0.38, 0.32]];
  fill(g, sc(chev, s), m.dark, 0.9);
  fill(g, sc(shrink(chev, 0.86, 0, 0.4), s), m.mid, 1);
  stroke(g, sc([[-0.38, 0.18], [0, 0.48], [0.38, 0.18]], s), m.hi, 0.55, Math.max(1, s * 0.02), false);

  // Central boss.
  const bossY = -0.2 * s;
  g.fillStyle(0x000000, 0.4); g.fillCircle(s * 0.03, bossY + s * 0.04, s * 0.24);
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    g.fillStyle(mix(m.dark, m.light, t), 1);
    g.fillCircle(-s * 0.06 * t, bossY - s * 0.06 * t, s * 0.22 * (1 - t * 0.7));
  }
  g.lineStyle(Math.max(1, s * 0.025), m.dark, 0.9); g.strokeCircle(0, bossY, s * 0.22);
  g.fillStyle(m.hi, 0.9); g.fillCircle(-s * 0.08, bossY - s * 0.09, s * 0.045);

  // Rivets round the rim.
  const rivets: Pt[] = [[-0.56, -0.66], [0.56, -0.66], [-0.58, -0.08], [0.58, -0.08], [-0.34, 0.56], [0.34, 0.56], [0, -0.66]];
  for (const [rx, ry] of rivets) {
    g.fillStyle(m.dark, 1); g.fillCircle(rx * s, ry * s, s * 0.05);
    g.fillStyle(m.light, 1); g.fillCircle(rx * s - s * 0.01, ry * s - s * 0.01, s * 0.035);
    g.fillStyle(m.hi, 0.9); g.fillCircle(rx * s - s * 0.018, ry * s - s * 0.018, s * 0.013);
  }

  stroke(g, sil, mix(m.dark, 0x000000, 0.4), 1, Math.max(1.5, s * 0.035));
  stroke(g, plate, m.dark, 0.7, 1);
  // Light catching the top-left edge.
  stroke(g, sc([[-0.62, -0.05], [-0.64, -0.72], [0.4, -0.72]], s), m.hi, 0.5, Math.max(1, s * 0.02), false);
}

function drawWing(g: Phaser.GameObjects.Graphics, s: number, m: Metal, side: number): void {
  for (let i = 3; i >= 0; i--) {
    const ang = (-0.42 + i * 0.3) * side; // fan from low to high
    const len = 0.62 + i * 0.1;
    const w = 0.12;
    const feather: Pt[] = [
      [0, -w * 0.5], [len * 0.55, -w * 0.9], [len, -w * 0.15], [len * 1.04, 0.02], [len * 0.6, w * 0.6], [0, w * 0.5],
    ];
    const placed = shift(rot(side > 0 ? feather : mirrorX(feather), side > 0 ? -ang - 0.25 : -ang + 0.25), side * 0.5, -0.32 + i * 0.05);
    const pts = sc(placed, s);
    fill(g, shift(pts, s * 0.03, s * 0.04), 0x000000, 0.35);
    shade(g, pts, m.dark, mix(m.light, m.hi, i * 0.1), pts[0][0], pts[0][1], 6, 0.3);
    stroke(g, pts, mix(m.dark, 0x000000, 0.3), 0.9, 1);
    // Quill.
    const q0 = pts[0], q1 = pts[3];
    g.lineStyle(1, m.hi, 0.55);
    g.beginPath();
    g.moveTo(q0[0] + (pts[5][0] - q0[0]) * 0.5, q0[1] + (pts[5][1] - q0[1]) * 0.5);
    g.lineTo(q1[0], q1[1]);
    g.strokePath();
  }
}

function drawSilver(g: Phaser.GameObjects.Graphics, s: number, m: Metal): void {
  drawWing(g, s, m, -1);
  drawWing(g, s, m, 1);

  const shield = heaterShield(0.56, -0.74, -0.08, 0.86);
  const sil = sc(shield, s);
  SILHOUETTES[1] = shield;
  fill(g, shift(sil, s * 0.04, s * 0.06), 0x000000, 0.45);
  fill(g, sil, m.dark);
  const plate = shrink(sil, 0.88, 0, -s * 0.03);
  shade(g, plate, m.mid, m.light, -s * 0.22, -s * 0.45, 10, 0.12);
  // Inner bevel.
  const bevel = shrink(sil, 0.72, 0, -s * 0.02);
  stroke(g, bevel, m.hi, 0.45, Math.max(1, s * 0.018));
  stroke(g, shift(bevel, s * 0.012, s * 0.016), m.dark, 0.4, 1);

  // Central star.
  const star = sc(shift(starPts(0.3, 0.13, 5), 0, -0.06), s);
  fill(g, shift(star, s * 0.025, s * 0.035), 0x000000, 0.4);
  shade(g, star, m.mid, m.hi, -s * 0.05, -s * 0.15, 6, 0.2);
  stroke(g, star, m.dark, 0.9, Math.max(1, s * 0.02));
  // Facet lines from the star's centre to its points.
  for (let i = 0; i < 5; i++) {
    const [px, py] = star[i * 2];
    g.lineStyle(1, i < 2 ? m.hi : m.dark, 0.45);
    g.beginPath(); g.moveTo(0, -0.06 * s); g.lineTo(px, py); g.strokePath();
  }

  // A small gem at the top of the shield.
  const gy = -0.58 * s;
  const gem = sc([[0, -0.08], [0.07, 0], [0, 0.08], [-0.07, 0]], s).map(([x, y]) => [x, y + gy] as Pt);
  fill(g, gem, m.gem);
  fill(g, [[gem[0][0], gem[0][1]], [gem[1][0], gem[1][1]], [0, gy]], m.gemHi, 0.8);
  stroke(g, gem, m.dark, 0.9, 1);

  stroke(g, sil, mix(m.dark, 0x000000, 0.4), 1, Math.max(1.5, s * 0.03));
  stroke(g, sc([[-0.5, -0.05], [-0.52, -0.68], [0.3, -0.68]], s), m.hi, 0.6, Math.max(1, s * 0.02), false);
}

function drawLaurel(g: Phaser.GameObjects.Graphics, s: number, m: Metal, side: number): void {
  const leaves = 7;
  for (let i = 0; i < leaves; i++) {
    const t = i / (leaves - 1);
    const a = Math.PI * (0.5 + side * (0.12 + t * 0.62));
    const r = 0.78;
    const x = Math.cos(a) * r * 0.95;
    const y = Math.sin(a) * r + 0.06;
    const leaf: Pt[] = [[0, 0], [0.07, -0.05], [0.17, 0], [0.07, 0.05]];
    const tangent = a + side * Math.PI / 2 + side * 0.5;
    const pts = sc(shift(rot(leaf, tangent), x, y), s);
    fill(g, pts, m.mid);
    fill(g, [pts[0], pts[1], pts[2]], m.light, 0.85);
    stroke(g, pts, m.dark, 0.8, 1);
  }
  // Stem.
  const stem: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * (0.5 + side * (0.08 + (i / 12) * 0.66));
    stem.push([Math.cos(a) * 0.74 * 0.95 * s, (Math.sin(a) * 0.74 + 0.06) * s]);
  }
  stroke(g, stem, m.dark, 0.9, Math.max(1, s * 0.025), false);
}

function drawGold(g: Phaser.GameObjects.Graphics, s: number, m: Metal): void {
  drawLaurel(g, s, m, -1);
  drawLaurel(g, s, m, 1);

  // Round-topped crest.
  const crest: Pt[] = [[-0.56, -0.42]];
  crest.push(...quad([-0.56, -0.42], [0, -0.66], [0.56, -0.42], 12));
  crest.push([0.56, 0.02]);
  crest.push(...quad([0.56, 0.02], [0.5, 0.58], [0, 0.84], 10));
  crest.push(...quad([0, 0.84], [-0.5, 0.58], [-0.56, 0.02], 10));
  const sil = sc(crest, s);
  fill(g, shift(sil, s * 0.04, s * 0.06), 0x000000, 0.45);
  fill(g, sil, m.dark);
  const plate = shrink(sil, 0.88, 0, s * 0.05);
  shade(g, plate, m.mid, m.light, -s * 0.2, -s * 0.25, 10, 0.12);

  // Quartering.
  g.lineStyle(Math.max(1, s * 0.022), m.dark, 0.55);
  g.beginPath(); g.moveTo(0, -0.5 * s); g.lineTo(0, 0.74 * s); g.strokePath();
  g.beginPath(); g.moveTo(-0.5 * s, 0.08 * s); g.lineTo(0.5 * s, 0.08 * s); g.strokePath();
  g.lineStyle(1, m.hi, 0.35);
  g.beginPath(); g.moveTo(-s * 0.012, -0.5 * s); g.lineTo(-s * 0.012, 0.74 * s); g.strokePath();

  // Ruby at the cross.
  const rx = 0, ry = 0.08 * s;
  g.fillStyle(0x000000, 0.4); g.fillEllipse(rx + s * 0.02, ry + s * 0.03, s * 0.3, s * 0.38);
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    g.fillStyle(mix(mix(m.gem, 0x000000, 0.5), m.gemHi, t * 0.8), 1);
    g.fillEllipse(rx - s * 0.03 * t, ry - s * 0.05 * t, s * 0.26 * (1 - t * 0.6), s * 0.34 * (1 - t * 0.6));
  }
  g.lineStyle(Math.max(1, s * 0.03), m.light, 1); g.strokeEllipse(rx, ry, s * 0.28, s * 0.36);
  g.lineStyle(1, m.dark, 0.9); g.strokeEllipse(rx, ry, s * 0.32, s * 0.4);
  g.fillStyle(0xffffff, 0.85); g.fillCircle(rx - s * 0.05, ry - s * 0.08, s * 0.03);

  stroke(g, sil, mix(m.dark, 0x000000, 0.4), 1, Math.max(1.5, s * 0.03));

  // Crown.
  const by = -0.58;
  const crown: Pt[] = [
    [-0.5, by + 0.1], [-0.56, by - 0.24], [-0.32, by - 0.08], [-0.2, by - 0.34], [-0.08, by - 0.12],
    [0, by - 0.42], [0.08, by - 0.12], [0.2, by - 0.34], [0.32, by - 0.08], [0.56, by - 0.24], [0.5, by + 0.1],
  ];
  const cpts = sc(crown, s);
  fill(g, shift(cpts, s * 0.03, s * 0.04), 0x000000, 0.4);
  shade(g, cpts, m.mid, m.hi, 0, by * s, 7, 0.25);
  stroke(g, cpts, m.dark, 1, Math.max(1, s * 0.025));
  // Band.
  const band: Pt[] = sc([[-0.5, by + 0.02], [0.5, by + 0.02], [0.5, by + 0.12], [-0.5, by + 0.12]], s);
  fill(g, band, m.dark, 0.9);
  fill(g, shrink(band, 0.96, 0, (by + 0.07) * s), m.mid);
  stroke(g, [band[0], band[1]], m.hi, 0.7, 1, false);
  // Jewels on the band and pearls on the tips.
  const jewels: Array<[number, number]> = [[-0.32, m.gem], [0, 0x3fa0ff], [0.32, m.gem]];
  for (const [jx, jc] of jewels) {
    g.fillStyle(jc, 1); g.fillCircle(jx * s, (by + 0.07) * s, s * 0.04);
    g.fillStyle(0xffffff, 0.8); g.fillCircle(jx * s - s * 0.012, (by + 0.055) * s, s * 0.012);
  }
  for (const [tx, ty] of [[-0.56, by - 0.24], [-0.2, by - 0.34], [0, by - 0.42], [0.2, by - 0.34], [0.56, by - 0.24]] as Pt[]) {
    g.fillStyle(m.dark, 1); g.fillCircle(tx * s, ty * s - s * 0.03, s * 0.045);
    g.fillStyle(m.hi, 1); g.fillCircle(tx * s - s * 0.008, ty * s - s * 0.038, s * 0.032);
  }

  // Silhouette for the shine: crest + crown hull.
  SILHOUETTES[2] = [
    [-0.56, by - 0.24], [0, by - 0.46], [0.56, by - 0.24], [0.56, 0.02], [0.5, 0.5], [0, 0.84], [-0.5, 0.5], [-0.56, 0.02],
  ];
}

function drawPlatinum(g: Phaser.GameObjects.Graphics, s: number, m: Metal): void {
  // Faceted eight-point star.
  const pts = 8;
  const R = 0.98, r = 0.42;
  const star = starPts(R, r, pts, -Math.PI / 2);
  fill(g, sc(shift(star, 0.04, 0.06), s), 0x000000, 0.4);
  for (let i = 0; i < pts; i++) {
    const tip = star[i * 2];
    const left = star[(i * 2 + pts * 2 - 1) % (pts * 2)];
    const right = star[i * 2 + 1];
    const long = i % 2 === 0;
    const k = long ? 1 : 0.78;
    const t: Pt = [tip[0] * k, tip[1] * k];
    // Light from top-left: facets facing up-left are lighter.
    const facing = Math.cos(Math.atan2(t[1], t[0]) + Math.PI * 0.75);
    const lightA = mix(m.mid, m.hi, 0.35 + 0.4 * Math.max(0, facing));
    const darkA = mix(m.dark, m.mid, 0.5 + 0.3 * Math.max(0, facing));
    fill(g, sc([[0, 0], left, t], s), lightA);
    fill(g, sc([[0, 0], t, right], s), darkA);
    stroke(g, sc([[0, 0], t], s), m.hi, 0.35, 1, false);
  }
  const starOutline: Pt[] = star.map((p, i) => (i % 2 === 0 && (i / 2) % 2 === 1 ? [p[0] * 0.78, p[1] * 0.78] : p) as Pt);
  stroke(g, sc(starOutline, s), m.dark, 0.95, Math.max(1, s * 0.022));
  SILHOUETTES[3] = starOutline;

  // Hexagonal crest.
  const hexR = 0.56;
  const hx: Pt[] = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    hx.push([Math.cos(a) * hexR, Math.sin(a) * hexR]);
  }
  fill(g, sc(shift(hx, 0.03, 0.05), s), 0x000000, 0.45);
  fill(g, sc(hx, s), m.dark);
  const inner = shrink(hx, 0.9);
  for (let i = 0; i < 6; i++) {
    const a = inner[i], b = inner[(i + 1) % 6];
    const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const facing = Math.cos(Math.atan2(mid[1], mid[0]) + Math.PI * 0.75);
    fill(g, sc([[0, 0], a, b], s), mix(m.mid, m.light, 0.35 + 0.55 * Math.max(0, facing)));
  }
  // Inner hex well and its gem.
  const well = shrink(hx, 0.5);
  fill(g, sc(well, s), mix(m.dark, 0x000000, 0.3));
  const gemHex = shrink(hx, 0.4);
  shade(g, sc(gemHex, s), mix(m.gem, 0x000000, 0.45), m.gemHi, -s * 0.06, -s * 0.08, 7, 0.2);
  for (let i = 0; i < 6; i++) {
    const p = gemHex[i];
    g.lineStyle(1, 0xffffff, i === 5 || i === 0 ? 0.55 : 0.18);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(p[0] * s, p[1] * s); g.strokePath();
  }
  stroke(g, sc(gemHex, s), m.hi, 0.7, 1);
  stroke(g, sc(hx, s), mix(m.dark, 0x000000, 0.3), 1, Math.max(1.5, s * 0.03));
  stroke(g, sc(inner, s), m.hi, 0.4, 1);
  // Rivets at each hex corner.
  for (const [x, y] of hx) {
    g.fillStyle(m.light, 1); g.fillCircle(x * s * 0.95, y * s * 0.95, s * 0.03);
    g.fillStyle(m.hi, 1); g.fillCircle(x * s * 0.95 - s * 0.008, y * s * 0.95 - s * 0.008, s * 0.012);
  }
}

function drawDiamond(g: Phaser.GameObjects.Graphics, s: number, m: Metal): void {
  // Radiating spikes behind everything.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    const len = i % 2 === 0 ? 1.0 : 0.8;
    const spike: Pt[] = [[0, -0.05], [len, 0], [0, 0.05]];
    fill(g, sc(rot(spike, a), s), m.light, 0.22);
  }

  // Angular wing blades.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const blade: Pt[] = [[0.3, -0.1 + i * 0.16], [0.96 - i * 0.12, -0.5 + i * 0.3], [0.78 - i * 0.1, -0.24 + i * 0.3], [0.3, 0.06 + i * 0.16]];
      const pts = sc(side > 0 ? blade : mirrorX(blade), s);
      fill(g, shift(pts, s * 0.03, s * 0.04), 0x000000, 0.35);
      fill(g, pts, mix(m.dark, m.mid, 0.4 + i * 0.15));
      fill(g, [pts[0], pts[1], pts[2]], mix(m.mid, m.light, 0.3 + i * 0.1), 0.9);
      stroke(g, pts, m.light, 0.6, 1);
    }
  }

  // The brilliant cut.
  const T = -0.58, G = -0.24, B = 0.92;
  const table: Pt[] = [[-0.3, T], [0.3, T]];
  const girdle: Pt[] = [[-0.74, G], [-0.37, G], [0, G], [0.37, G], [0.74, G]];
  const culet: Pt = [0, B];
  const outline: Pt[] = [table[0], table[1], girdle[4], culet, girdle[0]];
  SILHOUETTES[4] = outline;
  fill(g, sc(shift(outline, 0.04, 0.06), s), 0x000000, 0.45);

  // Crown facets (between the table and the girdle).
  const crownFacets: Array<[Pt[], number]> = [
    [[table[0], girdle[1], girdle[0]], 0.55],
    [[table[0], table[1], girdle[2]], 0.95],
    [[table[0], girdle[2], girdle[1]], 0.75],
    [[table[1], girdle[3], girdle[2]], 0.5],
    [[table[1], girdle[4], girdle[3]], 0.3],
  ];
  for (const [tri, l] of crownFacets) fill(g, sc(tri, s), mix(m.mid, m.hi, l));
  // Table.
  const tableFace: Pt[] = [[-0.3, T], [0.3, T], [0.16, T + 0.12], [-0.16, T + 0.12]];
  fill(g, sc(tableFace, s), mix(m.light, m.hi, 0.6));
  // Pavilion facets converging to the culet.
  for (let i = 0; i < 4; i++) {
    const a = girdle[i], b = girdle[i + 1];
    const l = [0.25, 0.55, 0.4, 0.15][i];
    fill(g, sc([a, b, culet], s), mix(m.dark, m.light, l));
  }
  // Inner reflections.
  fill(g, sc([[-0.37, G], [-0.1, G], [-0.05, 0.5]], s), m.hi, 0.18);
  fill(g, sc([[0.12, G], [0.37, G], [0.05, 0.4]], s), m.dark, 0.25);
  // Facet edges.
  g.lineStyle(1, m.hi, 0.55);
  for (const p of girdle) { g.beginPath(); g.moveTo(p[0] * s, p[1] * s); g.lineTo(culet[0] * s, culet[1] * s); g.strokePath(); }
  stroke(g, sc(girdle, s), m.hi, 0.75, 1, false);
  stroke(g, sc(outline, s), mix(m.dark, 0x000000, 0.2), 1, Math.max(1.5, s * 0.028));
  stroke(g, sc([table[0], girdle[0]], s), 0xffffff, 0.8, Math.max(1, s * 0.02), false);
  stroke(g, sc([table[0], table[1]], s), 0xffffff, 0.9, Math.max(1, s * 0.02), false);
}

function drawExcelsiusStatic(g: Phaser.GameObjects.Graphics, s: number, m: Metal): void {
  // Light wings.
  for (const side of [-1, 1]) {
    for (let i = 4; i >= 0; i--) {
      const len = 0.56 + i * 0.1;
      const ang = -0.6 + i * 0.26;
      const feather: Pt[] = [[0, -0.05], [len * 0.6, -0.1], [len, -0.02], [len * 0.62, 0.07], [0, 0.05]];
      const placed = shift(rot(feather, ang), 0.5, -0.08 + i * 0.03);
      const pts = sc(side > 0 ? placed : mirrorX(placed), s);
      fill(g, pts, mix(m.mid, m.light, i * 0.18), 0.85);
      stroke(g, pts, m.hi, 0.35, 1);
    }
  }

  // Ring with runes.
  const R = 0.72;
  g.fillStyle(0x000000, 0.45); g.fillCircle(s * 0.04, s * 0.06, R * s);
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    g.fillStyle(mix(mix(m.dark, 0x000000, 0.4), m.mid, t * 0.75), 1);
    g.fillCircle(-s * 0.05 * t, -s * 0.07 * t, R * s * (1 - t * 0.6));
  }
  g.lineStyle(Math.max(2, s * 0.06), m.gem, 1); g.strokeCircle(0, 0, R * s);
  g.lineStyle(1, m.hi, 0.85); g.strokeCircle(0, 0, R * s - Math.max(1, s * 0.03));
  g.lineStyle(1, mix(m.gem, 0x000000, 0.5), 1); g.strokeCircle(0, 0, R * s + Math.max(1, s * 0.03));
  g.lineStyle(1, m.gem, 0.5); g.strokeCircle(0, 0, R * s * 0.8);
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const r0 = R * 0.82, r1 = i % 4 === 0 ? R * 0.92 : R * 0.87;
    g.lineStyle(1, m.gem, i % 4 === 0 ? 0.9 : 0.5);
    g.beginPath(); g.moveTo(Math.cos(a) * r0 * s, Math.sin(a) * r0 * s); g.lineTo(Math.cos(a) * r1 * s, Math.sin(a) * r1 * s); g.strokePath();
  }
  // Cardinal studs.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.cos(a) * R * s, y = Math.sin(a) * R * s;
    fill(g, shift(sc([[0, -0.07], [0.05, 0], [0, 0.07], [-0.05, 0]], s), x, y), m.gemHi);
    stroke(g, shift(sc([[0, -0.07], [0.05, 0], [0, 0.07], [-0.05, 0]], s), x, y), mix(m.gem, 0x000000, 0.4), 1, 1);
  }

  // Faceted eight-point star.
  const star = starPts(0.56, 0.2, 8, -Math.PI / 2);
  for (let i = 0; i < 8; i++) {
    const tip = star[i * 2];
    const k = i % 2 === 0 ? 1 : 0.7;
    const t: Pt = [tip[0] * k, tip[1] * k];
    const left = star[(i * 2 + 15) % 16];
    const right = star[i * 2 + 1];
    fill(g, sc([[0, 0], left, t], s), mix(m.gem, m.gemHi, 0.55));
    fill(g, sc([[0, 0], t, right], s), mix(m.gem, 0x6a3a00, 0.35));
  }
  stroke(g, sc(star.map((p, i) => (i % 2 === 0 && (i / 2) % 2 === 1 ? [p[0] * 0.7, p[1] * 0.7] : p) as Pt), s), mix(m.gem, 0x000000, 0.45), 1, 1);

  // The orb.
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    g.fillStyle(mix(m.mid, 0xffffff, t), 1);
    g.fillCircle(-s * 0.03 * t, -s * 0.04 * t, s * 0.2 * (1 - t * 0.75));
  }
  g.lineStyle(Math.max(1, s * 0.025), m.gemHi, 0.9); g.strokeCircle(0, 0, s * 0.2);

  // Crown of stars.
  for (const [x, y, r] of [[-0.3, -0.86, 0.08], [0, -0.98, 0.12], [0.3, -0.86, 0.08]] as Array<[number, number, number]>) {
    const st = sc(shift(starPts(r, r * 0.42, 5), x, y), s);
    fill(g, st, m.gem);
    fill(g, shrink(st, 0.55, x * s - r * s * 0.15, y * s - r * s * 0.2), m.gemHi, 0.9);
    stroke(g, st, mix(m.gem, 0x000000, 0.45), 1, 1);
  }

  SILHOUETTES[5] = circlePts(R + 0.03, 32);
}

/** Per-frame Excelsius layer: rotating sunburst, halo glow. Drawn behind the static art. */
function drawExcelsiusBack(g: Phaser.GameObjects.Graphics, s: number, m: Metal, time: number): void {
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.0024);
  for (let k = 7; k >= 1; k--) {
    g.fillStyle(m.light, 0.035 + pulse * 0.02);
    g.fillCircle(0, 0, s * (0.75 + k * 0.08));
  }
  const a0 = time * 0.00025;
  for (let i = 0; i < 24; i++) {
    const a = a0 + (i / 24) * Math.PI * 2;
    const len = i % 2 === 0 ? 1.18 + pulse * 0.06 : 0.98;
    const w = i % 2 === 0 ? 0.07 : 0.045;
    const ray: Pt[] = [[0.5, -w], [len, 0], [0.5, w]];
    fill(g, sc(rot(ray, a), s), i % 2 === 0 ? m.gem : m.light, i % 2 === 0 ? 0.55 : 0.4);
  }
  const a1 = -time * 0.0004;
  for (let i = 0; i < 12; i++) {
    const a = a1 + (i / 12) * Math.PI * 2;
    const ray: Pt[] = [[0.8, -0.015], [1.3, 0], [0.8, 0.015]];
    fill(g, sc(rot(ray, a), s), m.hi, 0.35);
  }
}

/** Per-frame Excelsius layer in front: orbiting motes and twinkles. */
function drawExcelsiusFront(g: Phaser.GameObjects.Graphics, s: number, m: Metal, time: number): void {
  for (let i = 0; i < 7; i++) {
    const a = time * 0.0011 + (i / 7) * Math.PI * 2;
    const x = Math.cos(a) * s * 0.98;
    const y = Math.sin(a) * s * 0.42 + s * 0.05;
    const front = Math.sin(a) > 0;
    const r = s * (front ? 0.045 : 0.03);
    g.fillStyle(m.gem, front ? 0.35 : 0.18); g.fillCircle(x, y, r * 2.4);
    g.fillStyle(front ? 0xffffff : m.light, front ? 0.95 : 0.55); g.fillCircle(x, y, r);
  }
  for (let i = 0; i < 4; i++) {
    const ph = (time * 0.0013 + i * 0.37) % 1;
    const tw = Math.sin(ph * Math.PI);
    const a = i * 1.9 + 0.6;
    sparkle(g, Math.cos(a) * s * 0.86, Math.sin(a) * s * 0.78, s * 0.14 * tw, m.hi, 0.85 * tw);
  }
}

/** Per-frame Diamond twinkles. */
function drawDiamondFront(g: Phaser.GameObjects.Graphics, s: number, m: Metal, time: number): void {
  const spots: Pt[] = [[-0.22, -0.52], [0.4, -0.26], [-0.08, 0.32]];
  spots.forEach(([x, y], i) => {
    const ph = (time * 0.0009 + i * 0.33) % 1;
    const tw = Math.max(0, Math.sin(ph * Math.PI * 2));
    if (tw > 0.02) sparkle(g, x * s, y * s, s * 0.2 * tw, m.hi, 0.9 * tw);
  });
}

// ── Division ribbon ───────────────────────────────────────────────────

function drawRibbon(g: Phaser.GameObjects.Graphics, s: number, m: Metal, division: number): void {
  const y = 0.9 * s;
  const w = 0.5 * s, h = 0.12 * s;
  // Tails.
  for (const side of [-1, 1]) {
    const tail: Pt[] = [[side * w * 0.8, y - h * 0.7], [side * w * 1.35, y - h * 0.5], [side * w * 1.18, y + h * 0.3], [side * w * 1.38, y + h * 1.1], [side * w * 0.8, y + h * 0.9]];
    fill(g, tail, mix(m.dark, 0x000000, 0.2));
    stroke(g, tail, m.mid, 0.8, 1);
  }
  const band: Pt[] = [[-w, y - h], [w, y - h], [w * 1.06, y], [w, y + h], [-w, y + h], [-w * 1.06, y]];
  fill(g, shift(band, s * 0.02, s * 0.03), 0x000000, 0.4);
  shade(g, band, m.dark, m.mid, 0, y - h * 0.5, 5, 0.5);
  stroke(g, band, m.light, 0.95, Math.max(1, s * 0.02));
  stroke(g, [band[0], band[1]], m.hi, 0.6, 1, false);
  // Pips: one lit per division climbed (I lights all three).
  const lit = 4 - division;
  for (let i = 0; i < 3; i++) {
    const px = (i - 1) * s * 0.14;
    const py = y + h + s * 0.1;
    const d: Pt[] = [[px, py - s * 0.045], [px + s * 0.04, py], [px, py + s * 0.045], [px - s * 0.04, py]];
    fill(g, d, i < lit ? m.light : mix(m.dark, 0x000000, 0.3));
    stroke(g, d, i < lit ? m.hi : m.mid, i < lit ? 0.9 : 0.5, 1);
  }
}

// ── Public API ────────────────────────────────────────────────────────

const DRAWERS = [drawBronze, drawSilver, drawGold, drawPlatinum, drawDiamond, drawExcelsiusStatic];

function lockedMetal(m: Metal): Metal {
  const k = (c: number) => mix(c, 0x23233a, 0.78);
  return { dark: k(m.dark), mid: k(m.mid), light: k(m.light), hi: k(m.hi), gem: k(m.gem), gemHi: k(m.gemHi) };
}

/** The palette a tier's badge is struck from — handy for matching UI to a badge. */
export function rankMetal(tierIndex: number): Readonly<Metal> {
  return METALS[Math.max(0, Math.min(5, tierIndex))];
}

/**
 * Paint a tier's static badge art into `g`, centred on (0,0). `size` is the badge's
 * half-height. Leaves the per-frame layers (shine, Excelsius rays) to `addRankBadge`.
 */
export function drawRankBadge(g: Phaser.GameObjects.Graphics, tierIndex: number, size: number, locked = false): void {
  const ti = Math.max(0, Math.min(5, tierIndex));
  const m = locked ? lockedMetal(METALS[ti]) : METALS[ti];
  DRAWERS[ti](g, size, m);
}

export interface RankBadgeOptions {
  x: number;
  y: number;
  /** Half-height of the emblem, in px. */
  size: number;
  /** Ladder step (0 = Bronze III … 15 = Excelsius). */
  step: number;
  depth?: number;
  /** Run the shine sweep and Excelsius's motion. Default true. */
  animate?: boolean;
  /** Ghosted, unearned look — the ladder's upper rungs. */
  locked?: boolean;
  /** Draw the III/II/I ribbon. Default true (Excelsius never has one). */
  showDivision?: boolean;
}

/**
 * A complete badge as a Container at (x, y). Destroying the container tears down its
 * per-frame listener.
 */
export function addRankBadge(scene: Phaser.Scene, opts: RankBadgeOptions): Phaser.GameObjects.Container {
  const ti = tierIndexOf(opts.step);
  const division = divisionOf(opts.step);
  const s = opts.size;
  const locked = !!opts.locked;
  const m = locked ? lockedMetal(METALS[ti]) : METALS[ti];
  const animate = opts.animate !== false && !locked;

  const container = scene.add.container(opts.x, opts.y);
  if (opts.depth !== undefined) container.setDepth(opts.depth);

  const back = scene.add.graphics();
  const art = scene.add.graphics();
  const fx = scene.add.graphics();
  container.add([back, art, fx]);

  // Soft aura under every earned badge.
  if (!locked && ti < 5) {
    for (let k = 6; k >= 1; k--) {
      back.fillStyle(m.light, 0.03);
      back.fillCircle(0, 0, s * (0.6 + k * 0.1));
    }
  }

  DRAWERS[ti](art, s, m);

  if (opts.showDivision !== false && division > 0) {
    drawRibbon(art, s, m, division);
    const numeral = scene.add.text(0, 0.9 * s, divisionNumeral(division), {
      fontSize: `${Math.max(8, Math.round(s * 0.2))}px`, fontFamily: FONT_DISPLAY,
      color: hex(m.hi), stroke: hex(mix(m.dark, 0x000000, 0.4)), strokeThickness: Math.max(2, s * 0.04),
      letterSpacing: Math.max(1, s * 0.02),
    }).setOrigin(0.5);
    container.add(numeral);
  }

  if (ti === 5 && !locked) drawExcelsiusBack(back, s, m, 0);

  if (animate) {
    const sil = SILHOUETTES[ti] ? sc(SILHOUETTES[ti], s) : circlePts(s * 0.8);
    // Each badge gets its own phase so a ladder of them does not flash in unison.
    const phase = (opts.step * 977) % 4200;
    const period = ti === 5 ? 3200 : 4200;
    const onUpdate = (time: number): void => {
      if (!container.active) return;
      fx.clear();
      if (ti === 5) {
        back.clear();
        drawExcelsiusBack(back, s, m, time);
      }
      const t = ((time + phase) % period) / period;
      if (t < 0.32) {
        const u = t / 0.32;
        const centre = -s * 1.6 + u * s * 3.2;
        drawShine(fx, sil, centre, s * 0.22, 0xffffff, 0.42);
      }
      if (ti === 4) drawDiamondFront(fx, s, m, time);
      if (ti === 5) drawExcelsiusFront(fx, s, m, time);
    };
    scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
    container.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
    });
  }

  return container;
}
