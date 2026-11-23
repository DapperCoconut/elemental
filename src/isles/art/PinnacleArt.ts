import Phaser from 'phaser';
import { mixC, lit, dim } from './IsleArt';

/**
 * The Obsidian Pinnacle's shared look. Every bench, the landing, the throne hall, the King, the
 * sea crossing, the chart and the cinematics draw the spire, the glass, the masks and the star
 * through these, so the place reads as one place wherever it is seen.
 *
 * The rule of the palette: the Pinnacle is BLACK GLASS — never grey stone. Faces are near-black
 * with a cold violet sheen, edges catch a thin pale line, and wherever the glass is cracked a
 * violet seam glows. Under the glass there is a star: anything that breaks open bleeds warm gold-
 * white light, and that warm light is the only warm colour on the whole spire.
 */
export const OBS = {
  /** The glass in shadow. */
  glass: 0x0e0b14,
  /** A lit facet. */
  facet: 0x241d33,
  /** The brightest plane of a block. */
  sheen: 0x3b3152,
  /** The thin highlight along an edge. */
  edge: 0x8f84b8,
  /** The violet in the cracks — the King's colour. */
  seam: 0x8a5cff,
  seamLit: 0xc9b0ff,
  /** Starlight: what is under the glass. */
  star: 0xffe9b0,
  starCore: 0xfffbea,
  starDeep: 0xffa23a,
  /** The sea round the spire and the sky over it. */
  sea: 0x0a1020,
  seaLit: 0x1c2a4a,
  sky: 0x07060d,
  skyGlow: 0x2a1a4a,
} as const;

type G = Phaser.GameObjects.Graphics;
interface P { x: number; y: number }

/** A glowing crack: a wide soft violet line under a thin bright one. `pulse` 0–1 brightens it. */
export function seam(g: G, pts: P[], w = 2, alpha = 1, pulse = 0, color: number = OBS.seam): void {
  if (pts.length < 2) return;
  const pass = (width: number, c: number, a: number) => {
    g.lineStyle(width, c, a);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
  };
  pass(w * 4.5, color, 0.1 * alpha * (1 + pulse));
  pass(w * 2.2, color, 0.32 * alpha * (1 + pulse * 0.6));
  pass(w, lit(color, 0.45 + pulse * 0.4), 0.95 * alpha);
}

/** A jagged crack from a to b (seeded), for `seam`. */
export function crackPath(a: P, b: P, rng: () => number, jag = 10, steps = 6): P[] {
  const pts: P[] = [a];
  const nx = -(b.y - a.y), ny = b.x - a.x;
  const len = Math.hypot(nx, ny) || 1;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const off = (rng() - 0.5) * 2 * jag;
    pts.push({ x: a.x + (b.x - a.x) * t + (nx / len) * off, y: a.y + (b.y - a.y) * t + (ny / len) * off });
  }
  pts.push(b);
  return pts;
}

/**
 * One upthrust shard of black glass: `x, y` is the middle of its base, `h` its height, `w` its base
 * width, `lean` how far the tip sits off-centre (px). Two planes (dark / lit), an edge highlight, a
 * glint.
 */
export function shard(g: G, x: number, y: number, w: number, h: number, lean = 0, tone = 0): void {
  const tipX = x + lean, tipY = y - h;
  const ridgeX = x + w * 0.12 + lean * 0.55;
  const dark = mixC(OBS.glass, OBS.facet, tone);
  g.fillStyle(dark, 1);
  g.fillTriangle(x - w / 2, y, ridgeX, y, tipX, tipY);
  g.fillStyle(mixC(OBS.facet, OBS.sheen, 0.35 + tone * 0.5), 1);
  g.fillTriangle(ridgeX, y, x + w / 2, y, tipX, tipY);
  // The near edge catches the light; the far one only just.
  g.lineStyle(1.4, OBS.edge, 0.75);
  g.lineBetween(ridgeX, y, tipX, tipY);
  g.lineStyle(1, OBS.edge, 0.22);
  g.lineBetween(x - w / 2, y, tipX, tipY);
  g.fillStyle(0xffffff, 0.5);
  g.fillCircle(ridgeX + (tipX - ridgeX) * 0.62, y + (tipY - y) * 0.62, Math.max(0.8, w * 0.04));
}

/**
 * A dressed block of obsidian — walls, plinths, benches, steps. `x` is its centre, `y` its base;
 * it has a lit top bevel, a dark front and a pale edge line. `cracks` seeds violet seams across it.
 */
export function slab(g: G, x: number, y: number, w: number, h: number, rng?: () => number, cracks = 0): void {
  const l = x - w / 2, t = y - h;
  const bevel = Math.min(10, h * 0.22);
  g.fillStyle(OBS.glass, 1);
  g.fillRect(l, t, w, h);
  // A long diagonal sheen across the front, as polished glass shows a far window.
  g.fillStyle(OBS.facet, 0.9);
  g.fillPoints([
    new Phaser.Geom.Point(l + w * 0.12, t + bevel), new Phaser.Geom.Point(l + w * 0.46, t + bevel),
    new Phaser.Geom.Point(l + w * 0.2, y), new Phaser.Geom.Point(l, y), new Phaser.Geom.Point(l, t + h * 0.55),
  ], true);
  g.fillStyle(OBS.sheen, 1);
  g.fillRect(l, t, w, bevel);
  g.fillStyle(0xffffff, 0.07);
  g.fillRect(l, t, w, Math.max(1.5, bevel * 0.3));
  g.lineStyle(1.2, OBS.edge, 0.6);
  g.lineBetween(l, t + bevel, l + w, t + bevel);
  g.lineStyle(1, OBS.edge, 0.25);
  g.strokeRect(l, t, w, h);
  if (rng) {
    for (let i = 0; i < cracks; i++) {
      const a = { x: l + rng() * w, y: t + bevel + rng() * (h - bevel) * 0.3 };
      const b = { x: a.x + (rng() - 0.5) * w * 0.5, y: y - rng() * h * 0.15 };
      seam(g, crackPath(a, b, rng, 6, 4), 1.1, 0.8);
    }
  }
}

/**
 * The mask every councilor wears — a shard of the King's own shell. A tall black-glass kite with a
 * notched brow and a single violet slit. `s` is its half-height (the mask is ~1.25·s wide);
 * `crack` 0–1 splits it and lets starlight through (a beaten councilor, the King in his second act).
 */
export function councilMask(g: G, x: number, y: number, s: number, o: { slit?: number; crack?: number; alpha?: number; glow?: number } = {}): void {
  const a = o.alpha ?? 1;
  const slit = o.slit ?? OBS.seam;
  const w = s * 0.62;
  const pts = [
    { x: x - w * 0.55, y: y - s }, { x: x - w * 0.12, y: y - s * 0.82 }, { x, y: y - s * 1.06 },
    { x: x + w * 0.12, y: y - s * 0.82 }, { x: x + w * 0.55, y: y - s },
    { x: x + w, y: y - s * 0.28 }, { x: x + w * 0.62, y: y + s * 0.5 }, { x, y: y + s },
    { x: x - w * 0.62, y: y + s * 0.5 }, { x: x - w, y: y - s * 0.28 },
  ].map((p) => new Phaser.Geom.Point(p.x, p.y));
  if (o.glow) { g.fillStyle(slit, 0.1 * o.glow * a); g.fillCircle(x, y, s * 1.5); }
  g.fillStyle(OBS.glass, a);
  g.fillPoints(pts, true);
  // The lit half-face.
  g.fillStyle(OBS.facet, a);
  g.fillPoints([pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]], true);
  g.fillStyle(OBS.sheen, 0.7 * a);
  g.fillTriangle(x + w * 0.15, y - s * 0.78, x + w * 0.5, y - s * 0.9, x + w * 0.85, y - s * 0.3);
  g.lineStyle(Math.max(1, s * 0.05), OBS.edge, 0.7 * a);
  g.strokePoints(pts, true);
  g.lineStyle(Math.max(1, s * 0.04), OBS.edge, 0.4 * a);
  g.lineBetween(x, y - s * 1.06, x, y + s);
  // The slit: one line of violet, hot in the middle.
  const sy = y - s * 0.18;
  g.fillStyle(slit, 0.25 * a);
  g.fillEllipse(x, sy, w * 1.7, s * 0.34);
  g.fillStyle(slit, a);
  g.fillPoints([
    new Phaser.Geom.Point(x - w * 0.72, sy), new Phaser.Geom.Point(x, sy - s * 0.07),
    new Phaser.Geom.Point(x + w * 0.72, sy), new Phaser.Geom.Point(x, sy + s * 0.07),
  ], true);
  g.fillStyle(0xffffff, 0.85 * a);
  g.fillEllipse(x, sy, w * 0.5, s * 0.045);
  const c = o.crack ?? 0;
  if (c > 0) {
    const path = [
      { x: x + w * 0.3, y: y - s * 0.95 }, { x: x + w * 0.08, y: y - s * 0.5 }, { x: x + w * 0.34, y: y - s * 0.12 },
      { x: x + w * 0.02, y: y + s * 0.3 }, { x: x + w * 0.2, y: y + s * 0.75 },
    ];
    const n = Math.max(2, Math.round(1 + c * (path.length - 1)));
    seam(g, path.slice(0, n), Math.max(1, s * 0.06), a, c, OBS.star);
  }
}

/** The star under the glass: a soft halo, a hot core and slow turning rays. `t` in seconds. */
export function starGlow(g: G, x: number, y: number, r: number, t: number, heat = 1): void {
  for (let i = 5; i >= 1; i--) {
    g.fillStyle(i > 3 ? OBS.starDeep : OBS.star, 0.045 * heat);
    g.fillCircle(x, y, r * (1 + i * 0.75));
  }
  const rays = 8;
  for (let i = 0; i < rays; i++) {
    const a = t * 0.25 + (i / rays) * Math.PI * 2;
    const len = r * (2.2 + 0.7 * Math.sin(t * 1.3 + i * 1.7)) * heat;
    const wdt = r * 0.16;
    g.fillStyle(OBS.star, 0.2 * heat);
    g.fillTriangle(
      x + Math.cos(a + Math.PI / 2) * wdt, y + Math.sin(a + Math.PI / 2) * wdt,
      x - Math.cos(a + Math.PI / 2) * wdt, y - Math.sin(a + Math.PI / 2) * wdt,
      x + Math.cos(a) * len, y + Math.sin(a) * len,
    );
  }
  g.fillStyle(OBS.starDeep, 0.9);
  g.fillCircle(x, y, r);
  g.fillStyle(OBS.star, 1);
  g.fillCircle(x, y, r * 0.78);
  g.fillStyle(OBS.starCore, 1);
  g.fillCircle(x, y, r * 0.48);
}

/**
 * THE silhouette: the Pinnacle seen from far off. `x` is the middle of its foot, `baseY` the
 * waterline, `h` its height. A leaning stack of black shards, ten ledges up its flank (the
 * benches — the lowest `lit` of them show a lamp: benches the player has broken), and at the tip
 * the throne-light. `t` seconds animates the tip and the seams; `storm` 0–1 wraps it in the Shroud.
 */
export function drawPinnacle(g: G, x: number, baseY: number, h: number, o: { t?: number; lit?: number; storm?: number; alpha?: number; open?: boolean } = {}): void {
  const t = o.t ?? 0;
  const k = h / 400;
  // Foothill shards, back to front, so the spire rises out of a crown of them.
  const foot: [number, number, number, number][] = [
    [-150, 110, 70, -18], [140, 130, 80, 22], [-95, 190, 86, -10], [100, 210, 92, 14], [-48, 280, 100, -6], [52, 300, 104, 8],
  ];
  for (const [dx, sh, sw, lean] of foot) shard(g, x + dx * k, baseY, sw * k, sh * k, lean * k, 0.15);
  // The spire itself: one great shard, leaning a hair east, with a second plane.
  shard(g, x, baseY, 150 * k, h, 14 * k, 0.3);
  // The ten benches: ledges cut into the lit flank, climbing.
  const lamps = o.lit ?? 0;
  for (let i = 0; i < 10; i++) {
    const f = 0.1 + i * 0.076;
    const y = baseY - h * f;
    const half = 75 * k * (1 - f) + 2;
    const cx = x + 14 * k * f + half * 0.42;
    g.lineStyle(Math.max(1, 2 * k), OBS.edge, 0.55);
    g.lineBetween(cx - half * 0.3, y, cx + half * 0.42, y);
    if (i < lamps) {
      g.fillStyle(OBS.star, 0.22); g.fillCircle(cx + half * 0.1, y - 3 * k, 6 * k);
      g.fillStyle(OBS.star, 1); g.fillCircle(cx + half * 0.1, y - 3 * k, Math.max(1, 1.8 * k));
    }
  }
  // A seam the height of it, breathing.
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.4);
  const sp: P[] = [];
  for (let i = 0; i <= 7; i++) {
    const f = i / 7;
    sp.push({ x: x + 14 * k * f - 10 * k * (1 - f) + Math.sin(i * 2.3) * 7 * k * (1 - f), y: baseY - h * f * 0.97 });
  }
  seam(g, sp, Math.max(1, 1.6 * k), 0.75, pulse * 0.6);
  // The tip: the throne-light, violet while the King sits, a star when the hall has been opened.
  const tx = x + 14 * k, ty = baseY - h;
  if (o.open) starGlow(g, tx, ty, 5 * k, t, 0.9);
  else {
    g.fillStyle(OBS.seam, 0.18 + pulse * 0.12); g.fillCircle(tx, ty, 16 * k);
    g.fillStyle(OBS.seamLit, 0.9); g.fillCircle(tx, ty, Math.max(1.4, 3 * k));
  }
  // The Shroud: bands of storm wound round the spire.
  const storm = o.storm ?? 0;
  if (storm > 0) {
    for (let i = 0; i < 7; i++) {
      const f = 0.12 + i * 0.12;
      const y = baseY - h * f;
      const rx = (150 - i * 14) * k * (1.1 + 0.15 * Math.sin(t * 0.7 + i));
      g.fillStyle(i % 2 ? 0x1a1626 : 0x262036, 0.5 * storm);
      g.fillEllipse(x + Math.sin(t * 0.5 + i * 1.3) * 16 * k, y, rx * 2, 26 * k);
    }
    if (Math.sin(t * 3.1) > 0.94) {
      g.lineStyle(2 * k, OBS.seamLit, 0.9 * storm);
      g.lineBetween(x - 90 * k, baseY - h * 0.7, x - 60 * k, baseY - h * 0.45);
      g.lineBetween(x - 60 * k, baseY - h * 0.45, x - 84 * k, baseY - h * 0.3);
    }
  }
}

/**
 * THE throne — one drawing, used by the hall in the world, the fight's floor and the cinematics.
 * `x` is its centre line, `y` the floor at the foot of the seat, `s` its scale (1 ≈ 150 px wide, 230
 * tall). Five shards for a back (the middle one tallest, split by a seam), a seat slab between two
 * arm blocks, and — until the second act — the King's sword driven down behind it, only the hilt
 * showing over the seat-back. `sword: false` once he has drawn it; `glow` 0–1 lights the seams.
 */
export function throne(g: G, x: number, y: number, s = 1, o: { sword?: boolean; glow?: number; t?: number } = {}): void {
  const glow = o.glow ?? 0.5;
  const t = o.t ?? 0;
  g.fillStyle(0x000000, 0.45);
  g.fillEllipse(x, y + 6 * s, 190 * s, 30 * s);
  // The back: outer shards first, so the tall middle one overlaps them.
  shard(g, x - 62 * s, y - 20 * s, 44 * s, 120 * s, -12 * s, 0.1);
  shard(g, x + 62 * s, y - 20 * s, 44 * s, 126 * s, 12 * s, 0.1);
  shard(g, x - 32 * s, y - 20 * s, 50 * s, 170 * s, -6 * s, 0.2);
  shard(g, x + 32 * s, y - 20 * s, 50 * s, 176 * s, 6 * s, 0.2);
  shard(g, x, y - 20 * s, 60 * s, 230 * s, 0, 0.35);
  if (o.sword !== false) {
    // The hilt over the seat-back: crossguard, grip, a violet pommel stone.
    const hy = y - 150 * s;
    g.fillStyle(OBS.sheen, 1); g.fillRect(x - 3 * s, hy - 34 * s, 6 * s, 34 * s);
    g.fillStyle(OBS.edge, 1); g.fillRect(x - 17 * s, hy - 6 * s, 34 * s, 5 * s);
    g.fillStyle(OBS.seam, 0.35); g.fillCircle(x, hy - 38 * s, 9 * s);
    g.fillStyle(OBS.seamLit, 1); g.fillCircle(x, hy - 38 * s, 3.6 * s);
  }
  // Arms and seat.
  slab(g, x - 56 * s, y, 30 * s, 62 * s);
  slab(g, x + 56 * s, y, 30 * s, 62 * s);
  slab(g, x, y, 84 * s, 34 * s);
  g.fillStyle(OBS.glass, 1);
  g.fillRect(x - 42 * s, y - 96 * s, 84 * s, 62 * s);
  g.fillStyle(OBS.facet, 0.8);
  g.fillTriangle(x - 42 * s, y - 96 * s, x + 10 * s, y - 96 * s, x - 42 * s, y - 40 * s);
  g.lineStyle(1.2, OBS.edge, 0.5);
  g.strokeRect(x - 42 * s, y - 96 * s, 84 * s, 62 * s);
  // The seam up the tall shard, breathing.
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.3);
  seam(g, [
    { x: x - 2 * s, y: y - 100 * s }, { x: x + 5 * s, y: y - 135 * s }, { x: x - 4 * s, y: y - 172 * s },
    { x: x + 3 * s, y: y - 205 * s }, { x, y: y - 228 * s },
  ], Math.max(1, 1.6 * s), 0.4 + glow * 0.6, pulse * glow);
}

/** A field of stars in a rect — still (seeded), each twinkling on its own clock. `t` seconds. */
export function starfield(g: G, x: number, y: number, w: number, h: number, rng: () => number, n: number, t: number, color = 0xffffff): void {
  for (let i = 0; i < n; i++) {
    const sx = x + rng() * w, sy = y + rng() * h;
    const big = rng();
    const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * (0.6 + rng() * 1.6) + rng() * 6.28));
    g.fillStyle(big > 0.92 ? OBS.star : color, (0.25 + big * 0.6) * tw);
    g.fillCircle(sx, sy, big > 0.92 ? 1.6 : big > 0.6 ? 1.1 : 0.7);
  }
}

/** A polished obsidian floor: black glass tiles with faint violet grout and a long sky reflection. */
export function glassFloor(g: G, x: number, y: number, w: number, h: number, tile: number, rng: () => number): void {
  g.fillStyle(OBS.glass, 1);
  g.fillRect(x, y, w, h);
  for (let ty = y; ty < y + h; ty += tile) {
    for (let tx = x; tx < x + w; tx += tile) {
      const r = rng();
      if (r > 0.55) { g.fillStyle(OBS.facet, 0.25 + r * 0.3); g.fillRect(tx + 1, ty + 1, tile - 2, tile - 2); }
      if (r > 0.9) { g.fillStyle(OBS.sheen, 0.5); g.fillTriangle(tx + 2, ty + 2, tx + tile * 0.7, ty + 2, tx + 2, ty + tile * 0.7); }
    }
  }
  g.lineStyle(1, OBS.seam, 0.12);
  for (let tx = x; tx <= x + w; tx += tile) g.lineBetween(tx, y, tx, y + h);
  for (let ty = y; ty <= y + h; ty += tile) g.lineBetween(x, ty, x + w, ty);
}

export { mixC, lit, dim };
