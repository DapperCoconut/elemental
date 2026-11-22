import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import {
  ARC, AURORA_CRIMSON, AURORA_GREEN, AURORA_TEAL, AURORA_VIOLET, BASALT, BASALT_DARK, BASALT_LIT, BRASS, BRASS_DARK,
  BRASS_LIT, COPPER, COPPER_DARK, COPPER_LIT, FILINGS, FILINGS_LIT, INSULATOR, IRON, IRON_DARK, IRON_LIT, MAGNETITE,
  MAGNETITE_LIT, MOSS, NORTH, NORTH_LIT, RUST, RUST_DARK, RUST_LIT, SLATE, SLATE_DARK, SLATE_DEEP, SLATE_LIT, SOUTH,
  SOUTH_LIT, SPARK, TARN, TARN_DEEP, TARN_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT, WINDOW,
} from './palette';

/**
 * Lodestar set pieces — the shapes only a magnetised hill has. Nothing here stands quite
 * straight: every loose thing leans toward the great lodestone, every compass in every case
 * points at it, nails grow out of the stone like fur, and the boulders the court quarries hang
 * in the air on chains because they would rather not come down. Iron is black and wet and red
 * at the edges; brass is the colour of instruments; the copper of the Grid sags overhead; and
 * the light comes down from the aurora, green and violet, onto everything wet.
 */

// ── Small shared shapes ──────────────────────────────────────────────

/** A horseshoe magnet: an iron U with a red north tip and a blue south tip. `a` turns it. */
export function horseshoe(g: G, x: number, y: number, s: number, a = 0, flipped = false): void {
  const c = Math.cos(a), sn = Math.sin(a);
  const P = (px: number, py: number): Pt => ({ x: x + (px * c - py * sn) * s, y: y + (px * sn + py * c) * s });
  const arc: Pt[] = [];
  for (let i = 0; i <= 12; i++) { const t = Math.PI + (i / 12) * Math.PI; arc.push(P(Math.cos(t) * 8, Math.sin(t) * 8 - 2)); }
  g.lineStyle(6 * s, IRON_DARK, 1); g.strokePoints(arc, false);
  g.lineStyle(4.5 * s, IRON_LIT, 1); g.strokePoints(arc, false);
  const l0 = P(-8, -2), l1 = P(-8, 8), r0 = P(8, -2), r1 = P(8, 8);
  g.lineStyle(5 * s, IRON_LIT, 1); g.lineBetween(l0.x, l0.y, l1.x, l1.y); g.lineBetween(r0.x, r0.y, r1.x, r1.y);
  const lt = P(-8, 6), rt = P(8, 6);
  g.lineStyle(5 * s, flipped ? SOUTH : NORTH, 1); g.lineBetween(lt.x, lt.y, l1.x, l1.y);
  g.lineStyle(5 * s, flipped ? NORTH : SOUTH, 1); g.lineBetween(rt.x, rt.y, r1.x, r1.y);
  g.fillStyle(0xffffff, 0.3); const hl = P(-6, -6); g.fillCircle(hl.x, hl.y, 1.4 * s);
}

/** A riveted iron plate seen from above, rusting at the rim. */
export function ironPlate(g: G, x: number, y: number, w: number, h: number, a = 0, glint = 0): void {
  const c = Math.cos(a), s = Math.sin(a);
  const corner = (px: number, py: number): Pt => ({ x: x + px * c - py * s, y: y + px * s + py * c });
  const pts = [corner(-w / 2, -h / 2), corner(w / 2, -h / 2), corner(w / 2, h / 2), corner(-w / 2, h / 2)];
  g.fillStyle(0x000000, 0.3); g.fillPoints(pts.map((p) => ({ x: p.x + 3, y: p.y + 4 })), true);
  g.fillStyle(RUST_DARK, 1); g.fillPoints(pts, true);
  const inner = [corner(-w / 2 + 3, -h / 2 + 3), corner(w / 2 - 3, -h / 2 + 3), corner(w / 2 - 3, h / 2 - 3), corner(-w / 2 + 3, h / 2 - 3)];
  g.fillStyle(IRON, 1); g.fillPoints(inner, true);
  g.lineStyle(1, IRON_LIT, 0.6); g.lineBetween(inner[0].x, inner[0].y, inner[1].x, inner[1].y);
  for (const [px, py] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const p = corner(px * (w / 2 - 6), py * (h / 2 - 6));
    g.fillStyle(IRON_DARK, 1); g.fillCircle(p.x, p.y + 0.6, 2.2);
    g.fillStyle(IRON_LIT, 1); g.fillCircle(p.x, p.y, 1.6);
  }
  // A rust bloom and a weld seam across it.
  const r0 = corner(-w * 0.15, h * 0.1);
  g.fillStyle(RUST, 0.55); g.fillCircle(r0.x, r0.y, Math.min(w, h) * 0.18);
  const s0 = corner(-w / 2 + 4, 0), s1 = corner(w / 2 - 4, 0);
  g.lineStyle(1.2, IRON_DARK, 0.7); g.lineBetween(s0.x, s0.y, s1.x, s1.y);
  if (glint > 0) { g.lineStyle(2, SPARK, glint); g.strokePoints(pts, true); }
}

/** An iron ingot: a little trapezoid bar, stamped with a pole mark. */
export function ingot(g: G, x: number, y: number, s = 1, mark = NORTH): void {
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 2, y + 6 * s, 26 * s, 8 * s);
  g.fillStyle(IRON_DARK, 1); g.fillPoints([{ x: x - 13 * s, y: y + 4 * s }, { x: x + 13 * s, y: y + 4 * s }, { x: x + 9 * s, y: y - 6 * s }, { x: x - 9 * s, y: y - 6 * s }], true);
  g.fillStyle(IRON_LIT, 1); g.fillPoints([{ x: x - 9 * s, y: y - 6 * s }, { x: x + 9 * s, y: y - 6 * s }, { x: x + 7 * s, y: y - 9 * s }, { x: x - 7 * s, y: y - 9 * s }], true);
  g.fillStyle(IRON, 1); g.fillRect(x - 10 * s, y - 5 * s, 20 * s, 8 * s);
  g.fillStyle(mark, 1); g.fillCircle(x, y - 1 * s, 2.4 * s);
  g.lineStyle(1, SPARK, 0.4); g.lineBetween(x - 8 * s, y - 8 * s, x + 6 * s, y - 8 * s);
}

/** A sagging copper cable between two points: two strands, the near one lit. */
export function cable(g: G, a: Pt, b: Pt, sag: number, alpha = 1): void {
  const pts: Pt[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * sag });
  }
  g.lineStyle(3, COPPER_DARK, alpha); g.strokePoints(pts, false);
  g.lineStyle(1.4, COPPER_LIT, alpha * 0.8); g.strokePoints(pts, false);
}

/** A point along a cable drawn by `cable` (for the spark that runs down it). */
export function cableAt(a: Pt, b: Pt, sag: number, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * sag };
}

/**
 * A curtain of aurora: soft vertical folds of light hanging from `yTop` to `yBot`, rippling with
 * `t` (ms), brightest at the hem the way the real thing is. Used over the tarn, in fights, and
 * coming down to the floor in Prince Polar's storm.
 */
export function auroraCurtain(g: G, x: number, yTop: number, yBot: number, w: number, color: number, t: number, a = 1): void {
  const folds = Math.max(3, Math.round(w / 14));
  const h = yBot - yTop;
  for (let i = 0; i < folds; i++) {
    const k = i / (folds - 1) - 0.5;
    const fx = x + k * w + Math.sin(t / 700 + i * 1.3) * 6;
    const bright = 0.5 + Math.sin(t / 380 + i * 2.1) * 0.5;
    const fw = w / folds + 3;
    g.fillStyle(color, (0.05 + bright * 0.07) * a); g.fillRect(fx - fw / 2, yTop, fw, h);
    g.fillStyle(lit(color, 0.3), (0.1 + bright * 0.18) * a); g.fillRect(fx - fw / 2, yBot - h * 0.22, fw, h * 0.22);
    g.fillStyle(lit(color, 0.6), (0.25 + bright * 0.35) * a); g.fillRect(fx - fw / 2, yBot - 4, fw, 4);
  }
  // A hem of tiny falling sparks.
  for (let i = 0; i < folds; i++) {
    const ph = ((t / 900) + i * 0.37) % 1;
    g.fillStyle(lit(color, 0.7), (1 - ph) * 0.6 * a);
    g.fillCircle(x + (i / folds - 0.5) * w, yBot - 4 + ph * 18, 1.3);
  }
}

// ── Ground ───────────────────────────────────────────────────────────

/** Wet slate: a base fill, plates of a lighter shade, hairline cracks and puddles. */
export function slateGround(g: G, r: Rect, rng: () => number, density = 1): void {
  g.fillStyle(SLATE, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const n = Math.round((r.w * r.h) / 9000 * density);
  for (let i = 0; i < n; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    const w = 30 + rng() * 70, h = 16 + rng() * 30;
    g.fillStyle(rng() < 0.5 ? SLATE_LIT : SLATE_DARK, 0.35 + rng() * 0.3);
    g.fillPoints([{ x, y }, { x: x + w, y: y + rng() * 8 }, { x: x + w - rng() * 10, y: y + h }, { x: x - rng() * 8, y: y + h - rng() * 6 }], true);
  }
  for (let i = 0; i < n * 0.6; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    g.lineStyle(1, SLATE_DEEP, 0.5);
    g.lineBetween(x, y, x + (rng() - 0.5) * 40, y + (rng() - 0.5) * 20);
  }
  for (let i = 0; i < n * 0.15; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    g.fillStyle(SLATE_DEEP, 0.6); g.fillEllipse(x, y, 20 + rng() * 30, 6 + rng() * 6);
    g.fillStyle(TARN_LIT, 0.18); g.fillEllipse(x - 3, y - 1, 10 + rng() * 10, 2);
  }
}

/** A path of iron-shod setts: square slate blocks with an iron stud in every other one. */
export function settPath(g: G, pts: Pt[], w: number, rng: () => number): void {
  g.lineStyle(w + 8, SLATE_DEEP, 1); g.strokePoints(pts, false);
  g.lineStyle(w, SLATE_LIT, 1); g.strokePoints(pts, false);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    for (let d = 0; d < len; d += 18) {
      for (let k = -w / 2 + 9; k < w / 2 - 4; k += 18) {
        const x = a.x + ux * d - uy * k, y = a.y + uy * d + ux * k;
        g.fillStyle(rng() < 0.5 ? SLATE : mixC(SLATE, SLATE_LIT, 0.5), 1); g.fillRect(x - 7, y - 7, 14, 14);
        if (rng() < 0.3) { g.fillStyle(IRON_LIT, 0.9); g.fillCircle(x, y, 1.6); g.fillStyle(RUST, 0.6); g.fillCircle(x + 1, y + 1, 1.2); }
      }
    }
  }
}

/**
 * Iron filings combed into field lines round a pole: `lines` curves leave the pole and bend away
 * (all the same way, as round one end of a long magnet), dashed in tiny dark grains.
 */
export function filingField(g: G, cx: number, cy: number, rIn: number, rOut: number, rng: () => number, lines = 40, bend = 0.5): void {
  for (let i = 0; i < lines; i++) {
    const a0 = (i / lines) * Math.PI * 2;
    let x = cx + Math.cos(a0) * rIn, y = cy + Math.sin(a0) * rIn;
    let a = a0;
    const steps = Math.round((rOut - rIn) / 9);
    for (let s = 0; s < steps; s++) {
      a += Math.sin(a0) * bend * 0.02;
      const nx = x + Math.cos(a) * 9, ny = y + Math.sin(a) * 9;
      const fade = 1 - s / steps;
      g.lineStyle(1.6, FILINGS, 0.75 * fade); g.lineBetween(x, y, nx - Math.cos(a) * 3, ny - Math.sin(a) * 3);
      if (rng() < 0.25) { g.fillStyle(FILINGS_LIT, 0.4 * fade); g.fillRect(nx - 1, ny - 1, 1.5, 1.5); }
      x = nx; y = ny;
    }
  }
}

/** A great compass rose set into slate: brass and iron points, N in red. */
export function compassRose(g: G, x: number, y: number, r: number, squash = 0.6): void {
  g.fillStyle(SLATE_DEEP, 1); g.fillEllipse(x, y, r * 2 + 16, (r * 2 + 16) * squash);
  g.fillStyle(BASALT, 1); g.fillEllipse(x, y, r * 2, r * 2 * squash);
  g.lineStyle(3, BRASS, 1); g.strokeEllipse(x, y, r * 2 - 6, (r * 2 - 6) * squash);
  g.lineStyle(1, BRASS_DARK, 1); g.strokeEllipse(x, y, r * 1.6, r * 1.6 * squash);
  // Degree ticks round the rim.
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const r0 = r - (i % 4 ? 8 : 14);
    g.lineStyle(i % 4 ? 1 : 2, BRASS_LIT, 0.7);
    g.lineBetween(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * squash, x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4) * squash);
  }
  const point = (a: number, len: number, wid: number, c1: number, c2: number) => {
    const tip = { x: x + Math.cos(a) * len, y: y + Math.sin(a) * len * squash };
    const l = { x: x + Math.cos(a - Math.PI / 2) * wid, y: y + Math.sin(a - Math.PI / 2) * wid * squash };
    const rr = { x: x + Math.cos(a + Math.PI / 2) * wid, y: y + Math.sin(a + Math.PI / 2) * wid * squash };
    g.fillStyle(c1, 1); g.fillTriangle(x, y, tip.x, tip.y, l.x, l.y);
    g.fillStyle(c2, 1); g.fillTriangle(x, y, tip.x, tip.y, rr.x, rr.y);
  };
  for (let i = 0; i < 8; i++) point((i / 8) * Math.PI * 2 + Math.PI / 8, r * 0.5, r * 0.07, IRON, IRON_LIT);
  for (let i = 0; i < 4; i++) point((i / 4) * Math.PI * 2 + Math.PI / 4, r * 0.62, r * 0.1, BRASS_DARK, BRASS);
  for (let i = 0; i < 4; i++) point((i / 4) * Math.PI * 2 - Math.PI / 2, r * 0.86, r * 0.13, i === 0 ? dim(NORTH, 0.2) : BRASS_DARK, i === 0 ? NORTH : BRASS_LIT);
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, r * 0.08);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, y - 1, r * 0.05);
}

/** The aurora tarn: black water with a frost-cracked stone rim and the sky lying in it. */
export function tarnBed(g: G, r: Rect, rng: () => number): void {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  g.fillStyle(SLATE_DEEP, 1); g.fillEllipse(cx, cy + 4, r.w + 40, r.h + 34);
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2;
    const px = cx + Math.cos(a) * (r.w / 2 + 12), py = cy + Math.sin(a) * (r.h / 2 + 10);
    g.fillStyle(i % 3 ? BASALT : BASALT_LIT, 1); g.fillEllipse(px, py, 22 + rng() * 14, 12 + rng() * 6);
    g.fillStyle(0xdde8f0, 0.25); g.fillEllipse(px - 2, py - 3, 10, 3);
  }
  g.fillStyle(TARN, 1); g.fillEllipse(cx, cy, r.w, r.h);
  g.fillStyle(TARN_DEEP, 1); g.fillEllipse(cx + 10, cy + 8, r.w * 0.7, r.h * 0.6);
  // The aurora lying in the water, baked faint — `animate` makes it move.
  for (let i = 0; i < 5; i++) {
    const bx = r.x + r.w * (0.2 + i * 0.15);
    g.fillStyle(i % 2 ? AURORA_GREEN : AURORA_TEAL, 0.07); g.fillRect(bx - 18, cy - r.h * 0.38, 36, r.h * 0.76);
  }
  // Ice skins at the shallows.
  for (let i = 0; i < 9; i++) {
    const a = rng() * Math.PI * 2;
    const px = cx + Math.cos(a) * r.w * 0.42, py = cy + Math.sin(a) * r.h * 0.4;
    g.fillStyle(0xcfe4f0, 0.18); g.fillEllipse(px, py, 40 + rng() * 30, 10 + rng() * 8);
    g.lineStyle(1, 0xffffff, 0.2); g.lineBetween(px - 12, py, px + 10, py - 3);
  }
}

// ── Set pieces ───────────────────────────────────────────────────────

/** An outcrop of the iron crag: black faceted rock, rust streaks, moss on its north side. */
export function ironCrag(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 2, 70 * s, 18 * s, 0.4);
  const pts: Pt[] = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (i / (n - 1)) * Math.PI;
    const rr = (26 + rng() * 14) * s;
    pts.push({ x: x + Math.cos(a) * rr * 1.2, y: y + Math.sin(a) * rr * (1.2 + rng() * 0.6) });
  }
  pts.push({ x: x + 30 * s, y }, { x: x - 30 * s, y });
  g.fillStyle(IRON_DARK, 1); g.fillPoints(pts, true);
  // Facets: lit on the left, the aurora's side.
  const top = pts.reduce((b, p) => (p.y < b.y ? p : b), pts[0]);
  g.fillStyle(IRON, 1); g.fillTriangle(pts[0].x + 4, y - 2, top.x, top.y + 4, x + 4 * s, y - 4);
  g.fillStyle(IRON_LIT, 0.8); g.fillTriangle(pts[1].x + 4, pts[1].y + 4, top.x, top.y + 4, x - 6 * s, y - 14 * s);
  g.fillStyle(MAGNETITE_LIT, 0.35); g.fillTriangle(top.x - 6, top.y + 6, top.x + 2, top.y + 4, top.x - 2, top.y + 18);
  for (let i = 0; i < 4; i++) {
    const rx = x + (rng() - 0.5) * 40 * s;
    g.lineStyle(2 * s, RUST, 0.6); g.lineBetween(rx, y - 6 * s - rng() * 10 * s, rx + 2, y - 1);
  }
  g.fillStyle(MOSS, 0.6); g.fillEllipse(top.x + 6 * s, top.y + 8 * s, 18 * s, 6 * s);
  // Iron bits that have crept up its flank, all pointing at the lodestone.
  for (let i = 0; i < 5; i++) { g.lineStyle(1, FILINGS_LIT, 0.8); const fx = x - 20 * s + i * 9 * s; g.lineBetween(fx, y - 4, fx + 2, y - 9); }
}

/**
 * The great lodestone: a black boulder taller than a house, faceted magnetite with rust running
 * down its seams, furred with every nail, horseshoe and hinge the hill ever lost — all stuck to it
 * point-first — inside a ring of brass-capped bollards strung with a chain no one dares unhook.
 */
export function lodestone(g: G, x: number, y: number, s: number, rng: () => number): void {
  const R = 120 * s;
  shadow(g, x, y + 6, R * 2.6, R * 0.7, 0.5);
  // The mound of spilled filings it sits in.
  g.fillStyle(FILINGS, 0.9); g.fillEllipse(x, y, R * 2.4, R * 0.62);
  g.fillStyle(IRON_DARK, 1); g.fillEllipse(x, y - 4, R * 2.1, R * 0.48);
  // The stone: a great faceted dome.
  const H = R * 1.9;
  const outline: Pt[] = [
    { x: x - R, y: y - 6 }, { x: x - R * 1.05, y: y - H * 0.35 }, { x: x - R * 0.8, y: y - H * 0.72 },
    { x: x - R * 0.35, y: y - H * 0.97 }, { x: x + R * 0.15, y: y - H }, { x: x + R * 0.62, y: y - H * 0.82 },
    { x: x + R * 0.98, y: y - H * 0.5 }, { x: x + R, y: y - 6 },
  ];
  g.fillStyle(MAGNETITE, 1); g.fillPoints(outline, true);
  // Facets: a lit flank toward the aurora, a dark one away.
  const C = { x: x - R * 0.1, y: y - H * 0.55 };
  for (let i = 0; i < outline.length - 1; i++) {
    const a = outline[i], b = outline[i + 1];
    const k = i / (outline.length - 1);
    g.fillStyle(mixC(MAGNETITE_LIT, IRON_DARK, k), 0.55 + (1 - k) * 0.3);
    g.fillTriangle(a.x, a.y, b.x, b.y, C.x, C.y);
  }
  g.fillStyle(IRON_DARK, 0.7); g.fillTriangle(C.x, C.y, outline[6].x, outline[6].y, outline[7].x, outline[7].y);
  g.lineStyle(2, IRON_DARK, 0.8);
  for (let i = 1; i < outline.length - 1; i++) g.lineBetween(C.x, C.y, outline[i].x, outline[i].y);
  // Rust weeping down the seams.
  for (let i = 0; i < 9; i++) {
    const sx = x - R * 0.8 + (i / 8) * R * 1.6;
    const sy = y - H * (0.3 + rng() * 0.4);
    g.lineStyle(3 * s, RUST, 0.45); g.lineBetween(sx, sy, sx + (rng() - 0.5) * 6, y - 10);
    g.lineStyle(1.2 * s, RUST_LIT, 0.4); g.lineBetween(sx + 1, sy + 4, sx + 1, sy + 20);
  }
  // Magnetite glitter.
  for (let i = 0; i < 40; i++) {
    const px = x + (rng() - 0.5) * R * 1.7, py = y - 10 - rng() * H * 0.9;
    g.fillStyle(rng() < 0.5 ? MAGNETITE_LIT : SPARK, 0.35 + rng() * 0.4); g.fillRect(px, py, 1.6, 1.6);
  }
  // The fur of lost iron: nails, horseshoes, a hinge, a cart tyre — all stuck point-in.
  for (let i = 0; i < 46; i++) {
    const a = Math.PI + 0.15 + rng() * (Math.PI - 0.3);
    const rr = 0.86 + rng() * 0.1;
    const px = x + Math.cos(a) * R * rr, py = y - 8 + Math.sin(a) * H * rr * 0.98;
    const out = Math.atan2(py - (y - H * 0.4), px - x);
    if (i % 9 === 0) horseshoe(g, px, py, 0.6 * s, out + Math.PI / 2);
    else {
      g.lineStyle(1.6, IRON_LIT, 0.9);
      g.lineBetween(px, py, px + Math.cos(out) * 9 * s, py + Math.sin(out) * 9 * s);
      g.fillStyle(IRON_LIT, 1); g.fillCircle(px + Math.cos(out) * 9 * s, py + Math.sin(out) * 9 * s, 1.6);
    }
  }
  // An old cart tyre gone flat against the stone.
  g.lineStyle(5 * s, IRON_DARK, 1); g.strokeEllipse(x + R * 0.45, y - H * 0.3, 40 * s, 52 * s);
  g.lineStyle(2 * s, IRON_LIT, 0.8); g.strokeEllipse(x + R * 0.45, y - H * 0.3, 36 * s, 48 * s);
  // The red and blue bands the court paints round its poles: north up top, south at the foot.
  g.lineStyle(6 * s, NORTH, 0.85);
  g.beginPath(); g.arc(x, y - H * 0.55, R * 0.7, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
  g.lineStyle(6 * s, SOUTH, 0.85);
  g.beginPath(); g.arc(x, y - H * 0.1, R * 0.95, Math.PI * 1.08, Math.PI * 1.92, false); g.strokePath();
  // A ring of bollards and a sagging chain.
  const bollards: Pt[] = [];
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * 0.05 + (i / 8) * Math.PI * 0.9;
    bollards.push({ x: x + Math.cos(a) * R * 1.3, y: y + Math.sin(a) * R * 0.34 });
  }
  for (let i = 1; i < bollards.length; i++) {
    const a = bollards[i - 1], b = bollards[i];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 8 };
    g.lineStyle(2, IRON_LIT, 0.9);
    g.lineBetween(a.x, a.y - 18, mid.x, mid.y); g.lineBetween(mid.x, mid.y, b.x, b.y - 18);
  }
  for (const b of bollards) {
    g.fillStyle(IRON_DARK, 1); g.fillRect(b.x - 5, b.y - 22, 10, 22);
    g.fillStyle(IRON, 1); g.fillRect(b.x - 4, b.y - 22, 5, 22);
    g.fillStyle(BRASS, 1); g.fillEllipse(b.x, b.y - 22, 12, 6);
    g.fillStyle(BRASS_LIT, 1); g.fillEllipse(b.x - 1, b.y - 23, 6, 2.5);
  }
}

/**
 * A boulder from the sky-quarry, hanging in the air: drawn at `lift` px above its ground point,
 * banded with iron hoops, a keeper chain hanging slack to a staple in the slate. Call every frame
 * with `bob` so it breathes.
 */
export function floatingBoulder(g: G, x: number, y: number, s: number, lift: number, bob: number, seed: number): void {
  const by = y - lift + bob;
  // The keeper chain: links hanging from the hoop to the staple.
  const links = Math.max(4, Math.round(lift / 14));
  for (let i = 0; i < links; i++) {
    const t = i / links;
    const lx = x + 10 * s + Math.sin(t * Math.PI) * 6, ly = by + 16 * s + (y - by - 16 * s) * t;
    g.lineStyle(1.5, IRON_LIT, 0.85); g.strokeEllipse(lx, ly, 4, 7);
  }
  g.fillStyle(IRON_DARK, 1); g.fillRect(x + 6 * s, y - 4, 9, 4);
  // The stone.
  const R = 26 * s;
  g.fillStyle(IRON_DARK, 1); g.fillEllipse(x, by, R * 2.2, R * 1.7);
  g.fillStyle(MAGNETITE, 1); g.fillEllipse(x - 2, by - 3, R * 2, R * 1.5);
  g.fillStyle(MAGNETITE_LIT, 0.5); g.fillEllipse(x - R * 0.4, by - R * 0.4, R * 0.9, R * 0.5);
  g.fillStyle(RUST, 0.4); g.fillEllipse(x + R * 0.4, by + R * 0.3, R * 0.7, R * 0.4);
  for (let i = 0; i < 5; i++) {
    const a = seed + i * 1.7;
    g.fillStyle(SPARK, 0.4); g.fillRect(x + Math.cos(a) * R * 0.7, by + Math.sin(a) * R * 0.5, 1.5, 1.5);
  }
  // The iron hoop round its waist.
  g.lineStyle(3, IRON_DARK, 1); g.strokeEllipse(x, by + 2, R * 2.1, R * 0.7);
  g.lineStyle(1.4, IRON_LIT, 0.9); g.strokeEllipse(x, by + 1, R * 2.05, R * 0.65);
  // Grit falling from its underside, and a faint glow where the field holds it.
  const ph = (bob * 0.3 + seed) % 1;
  g.fillStyle(IRON_LIT, 0.5 * (1 - ph)); g.fillCircle(x - 6, by + R * 0.8 + ph * lift * 0.7, 1.2);
  g.lineStyle(1, AURORA_TEAL, 0.15); g.strokeEllipse(x, by + R * 0.9, R * 1.6, R * 0.4);
}

/** The shadow a hanging boulder throws — baked into the ground under it. */
export function boulderShadow(g: G, x: number, y: number, s: number): void {
  g.fillStyle(0x000000, 0.22); g.fillEllipse(x, y, 60 * s, 18 * s);
  g.fillStyle(0x000000, 0.12); g.fillEllipse(x, y, 80 * s, 26 * s);
  g.fillStyle(IRON_DARK, 1); g.fillCircle(x + 10 * s, y - 2, 4);
}

/**
 * A Grid pylon: an iron lattice tower on four splayed legs, crossarms with green glass insulators,
 * a copper cap, a meter-plate and a warning skull. Returns the cable attach point at its head.
 */
export function pylon(g: G, x: number, y: number, h: number): Pt {
  shadow(g, x, y + 2, 50, 14, 0.35);
  const top = y - h;
  const legW = 22;
  g.lineStyle(3, IRON_DARK, 1);
  g.lineBetween(x - legW, y, x - 4, top + 20); g.lineBetween(x + legW, y, x + 4, top + 20);
  g.lineStyle(1.6, IRON_LIT, 0.9);
  g.lineBetween(x - legW + 2, y, x - 3, top + 20); g.lineBetween(x + legW - 2, y, x + 5, top + 20);
  // Lattice bracing.
  const steps = Math.round(h / 22);
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps, t1 = (i + 1) / steps;
    const w0 = legW - (legW - 4) * t0, w1 = legW - (legW - 4) * t1;
    const y0 = y - (h - 20) * t0, y1 = y - (h - 20) * t1;
    g.lineStyle(1, IRON_LIT, 0.6);
    g.lineBetween(x - w0, y0, x + w1, y1); g.lineBetween(x + w0, y0, x - w1, y1);
    g.lineBetween(x - w1, y1, x + w1, y1);
  }
  // Crossarms and insulators.
  for (const [ay, aw] of [[top + 20, 40], [top + 40, 30]] as [number, number][]) {
    g.fillStyle(IRON_DARK, 1); g.fillRect(x - aw, ay - 2, aw * 2, 4);
    for (const k of [-1, 1]) {
      const ix = x + k * (aw - 4);
      for (let d = 0; d < 3; d++) { g.fillStyle(d % 2 ? INSULATOR : lit(INSULATOR, 0.3), 0.9); g.fillEllipse(ix, ay + 4 + d * 3, 7, 3); }
    }
  }
  // Copper cap and a lightning rod.
  g.fillStyle(COPPER_DARK, 1); g.fillTriangle(x - 7, top + 20, x + 7, top + 20, x, top + 4);
  g.fillStyle(COPPER, 1); g.fillTriangle(x - 5, top + 19, x + 2, top + 19, x, top + 6);
  g.lineStyle(1.5, COPPER_LIT, 1); g.lineBetween(x, top + 4, x, top - 14);
  g.fillStyle(COPPER_LIT, 1); g.fillCircle(x, top - 14, 2);
  // The Grid's plate: a brass meter and a lightning bolt.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 7, y - 40, 14, 16);
  g.fillStyle(BRASS, 1); g.fillRect(x - 6, y - 39, 12, 14);
  g.fillStyle(0x1a1a1a, 1); g.fillTriangle(x + 1, y - 37, x - 3, y - 31, x + 1, y - 31); g.fillTriangle(x - 1, y - 31, x + 3, y - 31, x - 1, y - 26);
  return { x, y: top + 22 };
}

/**
 * A crank-house: a squat black-stone cottage under an iron-plate roof, the household's dynamo
 * crank on the side wall, the brass Draw meter by the door, and the door itself held by a horseshoe
 * lock. `marks` chalks the times it has been switched off (three, and they come for you); a house
 * that is switched off has dark windows and a dead meter.
 */
export function crankHouse(g: G, x: number, y: number, w: number, h: number, o: { lit: boolean; marks?: number; flip?: boolean }, rng: () => number): Pt {
  shadow(g, x, y + 2, w * 1.1, 22, 0.4);
  const x0 = x - w / 2, top = y - h;
  // Walls of dark dressed stone.
  g.fillStyle(BASALT_DARK, 1); g.fillRect(x0, top, w, h);
  for (let ry = top + 4; ry < y - 2; ry += 11) {
    for (let rx = x0 + ((ry / 11) % 2 ? 0 : 8); rx < x0 + w - 4; rx += 17) {
      g.fillStyle(rng() < 0.5 ? BASALT : mixC(BASALT, BASALT_LIT, 0.4), 1); g.fillRect(rx + 1, ry, 15, 9);
    }
  }
  // Rust streaks from the roof's edge.
  for (let i = 0; i < w / 18; i++) { const sx = x0 + 6 + rng() * (w - 12); g.lineStyle(2, RUST, 0.35); g.lineBetween(sx, top, sx, top + 10 + rng() * h * 0.5); }
  // The iron-plate roof: a shallow pitch of riveted plates.
  const rh = h * 0.55;
  g.fillStyle(IRON_DARK, 1); g.fillTriangle(x0 - 10, top + 2, x0 + w + 10, top + 2, x, top - rh);
  g.fillStyle(IRON, 1); g.fillTriangle(x0 - 6, top, x, top - rh + 4, x, top);
  g.fillStyle(IRON_LIT, 0.8); g.fillTriangle(x0 - 6, top, x, top - rh + 4, x0 + w * 0.2, top);
  g.fillStyle(mixC(IRON, RUST, 0.25), 1); g.fillTriangle(x, top - rh + 4, x0 + w + 6, top, x, top);
  for (let i = 1; i < 4; i++) { g.lineStyle(1, IRON_DARK, 0.8); g.lineBetween(x - (w / 2 + 6) * (i / 4), top - rh * (1 - i / 4) + 4 * (1 - i / 4), x + (w / 2 + 6) * (i / 4), top - rh * (1 - i / 4) + 4 * (1 - i / 4)); }
  for (let i = 0; i < w / 10; i++) { g.fillStyle(IRON_LIT, 0.7); g.fillCircle(x0 - 4 + i * 10, top - 1, 1); }
  // A lightning rod on the ridge, with its earth wire down the gable.
  g.lineStyle(1.5, COPPER, 1); g.lineBetween(x, top - rh + 4, x, top - rh - 18);
  g.fillStyle(COPPER_LIT, 1); g.fillCircle(x, top - rh - 18, 1.8);
  g.lineStyle(1, COPPER_DARK, 0.8); g.lineBetween(x0 + w + 4, top, x0 + w + 4, y);
  // Windows: lit gold if the house made its Draw, black if it is switched off.
  for (const k of [-1, 1]) {
    const wx = x + k * w * 0.28, wy = top + h * 0.3;
    g.fillStyle(IRON_DARK, 1); g.fillRect(wx - 10, wy - 2, 20, 18);
    g.fillStyle(o.lit ? WINDOW : 0x0a0c10, 1); g.fillRect(wx - 8, wy, 16, 14);
    if (o.lit) { g.fillStyle(0xffffff, 0.25); g.fillRect(wx - 7, wy + 1, 5, 12); }
    g.lineStyle(1.5, IRON_DARK, 1); g.lineBetween(wx, wy, wx, wy + 14); g.lineBetween(wx - 8, wy + 7, wx + 8, wy + 7);
  }
  // The door and its horseshoe lock.
  const dx = x + (o.flip ? w * 0.12 : -w * 0.12);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(dx - 11, y - 30, 22, 30);
  g.fillStyle(TIMBER, 1); g.fillRect(dx - 9, y - 28, 18, 28);
  for (let i = 0; i < 3; i++) { g.fillStyle(IRON_DARK, 1); g.fillRect(dx - 9, y - 25 + i * 9, 18, 2); }
  horseshoe(g, dx + 6, y - 15, 0.45, Math.PI / 2);
  // The Draw meter: a brass box with a dial, needle high or dead.
  const mx = dx + (o.flip ? -24 : 24);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(mx - 8, y - 34, 16, 20);
  g.fillStyle(BRASS, 1); g.fillRect(mx - 7, y - 33, 14, 18);
  g.fillStyle(0xf0ead8, 1); g.fillCircle(mx, y - 26, 5);
  const na = o.lit ? -Math.PI * 0.25 : -Math.PI * 0.95;
  g.lineStyle(1.2, NORTH, 1); g.lineBetween(mx, y - 26, mx + Math.cos(na) * 4.5, y - 26 + Math.sin(na) * 4.5);
  g.lineStyle(1, COPPER, 1); g.lineBetween(mx, y - 34, mx, top);
  // The crank on the side wall: a flywheel with a worn wooden handle.
  const cx = o.flip ? x0 + 10 : x0 + w - 10, cy = y - h * 0.45;
  g.lineStyle(3, IRON_DARK, 1); g.strokeCircle(cx, cy, 11);
  g.lineStyle(1.5, IRON_LIT, 1); g.strokeCircle(cx, cy, 10);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; g.lineBetween(cx, cy, cx + Math.cos(a) * 10, cy + Math.sin(a) * 10); }
  g.lineStyle(3, TIMBER_LIT, 1); g.lineBetween(cx + 8, cy + 6, cx + 14, cy + 12);
  // Chalk marks: once, twice, thrice switched off.
  for (let i = 0; i < (o.marks ?? 0); i++) {
    g.lineStyle(2, 0xe8e8e0, 0.85); g.lineBetween(dx - 18 - i * 6, y - 26, dx - 22 - i * 6, y - 12);
  }
  return { x: dx, y: y + 16 };
}

/**
 * The Polar Observatory, Prince Polar's hall: a round tower of dressed basalt on a stepped plinth,
 * a copper dome green with verdigris split by an open slit, the great brass telescope pointing
 * up through it at the aurora, a compass-needle weathervane spinning over everything, and two
 * horseshoe banners in red and blue either side of the door.
 */
export function observatory(g: G, x: number, y: number, rng: () => number): void {
  const w = 280, h = 190;
  shadow(g, x, y + 8, w * 1.3, 46, 0.45);
  const x0 = x - w / 2;
  // Steps and plinth.
  for (let k = 0; k < 4; k++) { g.fillStyle(k % 2 ? BASALT : BASALT_LIT, 1); g.fillRect(x - 70 - k * 10, y - 12 + k * 4, 140 + k * 20, 6); }
  g.fillStyle(BASALT_DARK, 1); g.fillRect(x0 - 20, y - 36, w + 40, 26);
  g.fillStyle(BASALT, 1); g.fillRect(x0 - 18, y - 38, w + 36, 6);
  // The drum of the tower: courses of dressed stone with a curve to them.
  const top = y - 36 - h;
  g.fillStyle(BASALT_DARK, 1); g.fillRect(x0, top, w, h);
  for (let ry = top; ry < y - 38; ry += 14) {
    for (let i = 0; i < 12; i++) {
      const k = (i + 0.5) / 12;
      const cx = x0 + w * k;
      const shade = Math.sin(k * Math.PI);
      g.fillStyle(mixC(BASALT_DARK, BASALT_LIT, shade * (0.6 + rng() * 0.2)), 1);
      g.fillRect(cx - w / 24 + 1, ry + 1, w / 12 - 2, 12);
    }
  }
  // Tall narrow windows with the aurora behind them.
  for (const k of [-0.32, 0.32]) {
    const wx = x + k * w, wy = top + 40;
    g.fillStyle(IRON_DARK, 1); g.fillRect(wx - 10, wy - 2, 20, 70);
    g.fillStyle(0x0c1820, 1); g.fillRect(wx - 8, wy, 16, 66);
    g.fillStyle(AURORA_GREEN, 0.35); g.fillRect(wx - 8, wy + 10, 16, 40);
    g.fillStyle(AURORA_VIOLET, 0.25); g.fillRect(wx - 8, wy, 16, 16);
    g.fillStyle(IRON_DARK, 1); g.fillTriangle(wx - 10, wy - 2, wx + 10, wy - 2, wx, wy - 14);
  }
  // The great door under a fan of iron rays.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 32, y - 38 - 86, 64, 86);
  g.fillStyle(0x10141c, 1); g.fillRect(x - 28, y - 38 - 82, 56, 82);
  g.lineStyle(2, BRASS, 1); g.lineBetween(x, y - 38 - 82, x, y - 38);
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    g.lineStyle(2, i === 4 ? NORTH : IRON_LIT, 0.9);
    g.lineBetween(x, y - 38 - 86, x + Math.cos(a) * 42, y - 38 - 86 + Math.sin(a) * 34);
  }
  horseshoe(g, x - 14, y - 80, 0.7, 0); horseshoe(g, x + 14, y - 80, 0.7, 0, true);
  // The horseshoe banners.
  for (const k of [-1, 1]) {
    const bx = x + k * 70;
    g.lineStyle(3, IRON_DARK, 1); g.lineBetween(bx, y - 38, bx, top + 30);
    g.fillStyle(k < 0 ? dim(NORTH, 0.3) : dim(SOUTH, 0.3), 1); g.fillRect(bx - 16, top + 34, 32, 70);
    g.fillStyle(k < 0 ? NORTH : SOUTH, 1); g.fillRect(bx - 14, top + 34, 28, 64);
    g.fillTriangle(bx - 14, top + 98, bx + 14, top + 98, bx, top + 110);
    horseshoe(g, bx, top + 64, 1, 0, k > 0);
  }
  // The dome: copper gone green, a slit open down its face.
  const dr = w * 0.55;
  const dy = top;
  g.fillStyle(IRON_DARK, 1); g.fillRect(x0 - 8, dy - 8, w + 16, 12);
  g.fillStyle(mixC(COPPER, 0x4a9a88, 0.6), 1);
  g.beginPath(); g.arc(x, dy, dr, Math.PI, 0, false); g.closePath(); g.fillPath();
  g.fillStyle(mixC(COPPER_LIT, 0x7fd6c6, 0.5), 0.5);
  g.beginPath(); g.arc(x, dy, dr * 0.92, Math.PI * 1.05, Math.PI * 1.45, false); g.lineTo(x, dy); g.closePath(); g.fillPath();
  for (let i = 1; i < 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    g.lineStyle(1.5, dim(0x4a9a88, 0.4), 0.8); g.lineBetween(x + Math.cos(a) * dr, dy + Math.sin(a) * dr, x + Math.cos(a) * 6, dy - dr + 4);
  }
  g.lineStyle(2, COPPER_DARK, 0.7); g.strokeEllipse(x, dy - dr * 0.45, dr * 1.7, dr * 0.3);
  // The slit, and the sky inside it.
  g.fillStyle(0x060a10, 1); g.fillRect(x + 12, dy - dr + 6, 30, dr - 6);
  g.fillStyle(AURORA_GREEN, 0.3); g.fillRect(x + 12, dy - dr + 6, 30, dr * 0.5);
  // The telescope: a long brass tube angled up out of the slit.
  const tx0 = x + 27, ty0 = dy - 20, tx1 = x + 120, ty1 = dy - dr - 70;
  g.lineStyle(18, BRASS_DARK, 1); g.lineBetween(tx0, ty0, tx1, ty1);
  g.lineStyle(13, BRASS, 1); g.lineBetween(tx0, ty0, tx1, ty1);
  g.lineStyle(3, BRASS_LIT, 0.8); g.lineBetween(tx0 - 3, ty0 - 4, tx1 - 3, ty1 - 4);
  for (let k = 0.25; k < 1; k += 0.25) {
    const bx = tx0 + (tx1 - tx0) * k, by = ty0 + (ty1 - ty0) * k;
    g.lineStyle(20, BRASS_DARK, 1); g.lineBetween(bx - 2, by + 2, bx + 2, by - 2);
  }
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(tx1, ty1, 11);
  g.fillStyle(0x0a1a20, 1); g.fillCircle(tx1, ty1, 8);
  g.fillStyle(AURORA_TEAL, 0.5); g.fillCircle(tx1 - 2, ty1 - 2, 3);
  // The weathervane: a compass needle on a spire, red end north.
  g.lineStyle(3, IRON_DARK, 1); g.lineBetween(x - 20, dy - dr, x - 20, dy - dr - 54);
  g.fillStyle(BRASS, 1); g.fillCircle(x - 20, dy - dr - 54, 4);
  g.fillStyle(NORTH, 1); g.fillTriangle(x - 20, dy - dr - 58, x - 20, dy - dr - 50, x - 62, dy - dr - 54);
  g.fillStyle(SOUTH, 1); g.fillTriangle(x - 20, dy - dr - 58, x - 20, dy - dr - 50, x + 22, dy - dr - 54);
  g.lineStyle(1, BRASS_LIT, 0.8); g.strokeEllipse(x - 20, dy - dr - 54, 30, 8);
}

/**
 * Smith Ferrite's iron-works: an open-fronted forge under a slate pent roof, the hearth banked low
 * (no flame — the coals are heated off the Grid by a coil, and they glow orange-white), an anvil
 * on its block, a rack of horseshoe magnets being made, a quench trough and bundled bar.
 */
export function smithy(g: G, x: number, y: number, rng: () => number): void {
  const w = 240, h = 120;
  shadow(g, x, y + 4, w * 1.1, 26, 0.4);
  const x0 = x - w / 2;
  // Back wall and posts.
  g.fillStyle(BASALT_DARK, 1); g.fillRect(x0, y - h, w, h);
  for (let i = 0; i < 40; i++) { g.fillStyle(rng() < 0.5 ? BASALT : SLATE_DARK, 0.7); g.fillRect(x0 + rng() * (w - 14), y - h + rng() * (h - 10), 14, 8); }
  for (const px of [x0 + 4, x0 + w - 10, x]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(px, y - h - 4, 7, h + 4); }
  // The pent roof.
  g.fillStyle(SLATE_DEEP, 1); g.fillRect(x0 - 16, y - h - 22, w + 32, 22);
  for (let i = 0; i < (w + 32) / 14; i++) { g.fillStyle(i % 2 ? SLATE : SLATE_LIT, 1); g.fillRect(x0 - 16 + i * 14, y - h - 20, 12, 18); }
  g.fillStyle(IRON_DARK, 1); g.fillRect(x0 - 18, y - h - 4, w + 36, 4);
  // The coil hearth: a brick box, copper coils glowing under a bed of coke.
  const hx = x0 + 52;
  g.fillStyle(RUST_DARK, 1); g.fillRect(hx - 36, y - 50, 72, 50);
  g.fillStyle(RUST, 1); g.fillRect(hx - 34, y - 52, 68, 6);
  g.fillStyle(0x1a0a06, 1); g.fillRect(hx - 28, y - 46, 56, 20);
  for (let i = 0; i < 5; i++) { g.lineStyle(2, COPPER, 1); g.strokeEllipse(hx - 20 + i * 10, y - 36, 8, 14); }
  for (let i = 0; i < 14; i++) { g.fillStyle(i % 2 ? 0xffa040 : 0xfff0a0, 0.8); g.fillCircle(hx - 24 + rng() * 48, y - 44 + rng() * 8, 2 + rng() * 2); }
  g.lineStyle(1.5, COPPER_DARK, 1); g.lineBetween(hx + 30, y - 40, hx + 30, y - h);
  // The hood over the hearth.
  g.fillStyle(IRON_DARK, 1); g.fillTriangle(hx - 40, y - 56, hx + 40, y - 56, hx, y - h + 4);
  // A rack of half-made horseshoe magnets on the back wall.
  for (let i = 0; i < 6; i++) horseshoe(g, x + 16 + i * 18, y - h + 30, 0.8, 0, i % 2 === 1);
  g.lineStyle(2, TIMBER_LIT, 1); g.lineBetween(x + 6, y - h + 18, x + 116, y - h + 18);
  // The anvil on its block, a hammer resting on it.
  const ax = x + 30, ay = y - 6;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(ax - 14, ay - 22, 28, 22);
  g.fillStyle(IRON_DARK, 1); g.fillRect(ax - 22, ay - 34, 44, 12);
  g.fillStyle(IRON, 1); g.fillTriangle(ax + 22, ay - 34, ax + 22, ay - 26, ax + 38, ay - 32);
  g.fillStyle(IRON_LIT, 1); g.fillRect(ax - 22, ay - 35, 44, 3);
  g.lineStyle(3, TIMBER_LIT, 1); g.lineBetween(ax - 10, ay - 38, ax + 12, ay - 48);
  g.fillStyle(IRON_DARK, 1); g.fillRect(ax + 8, ay - 54, 10, 8);
  // The quench trough and a bundle of bar stock.
  const qx = x0 + w - 44;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(qx - 26, y - 20, 52, 20);
  g.fillStyle(TARN, 1); g.fillRect(qx - 23, y - 19, 46, 6);
  g.fillStyle(TARN_LIT, 0.4); g.fillRect(qx - 20, y - 18, 16, 2);
  for (let i = 0; i < 7; i++) { g.lineStyle(3, i % 2 ? IRON_LIT : IRON, 1); g.lineBetween(qx - 30 + i * 3, y - 24, qx - 8 + i * 3, y - 70); }
  g.lineStyle(2, RUST, 1); g.lineBetween(qx - 26, y - 46, qx - 4, y - 46);
}

/**
 * Dr. Anode's laboratory: a tin shed between two tall coil-poles — one painted red and capped
 * with an N, one blue with an S — a spark-gap strung between their tops, shelves of glass jars and
 * a slate board of chalked field diagrams by the door.
 */
export function anodeLab(g: G, x: number, y: number, rng: () => number): void {
  const w = 170, h = 96;
  shadow(g, x, y + 3, w * 1.4, 24, 0.4);
  const x0 = x - w / 2;
  // The shed: corrugated tin.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x0, y - h, w, h);
  for (let i = 0; i < w / 6; i++) { g.fillStyle(i % 2 ? IRON : IRON_LIT, 0.8); g.fillRect(x0 + i * 6, y - h, 3, h); }
  g.fillStyle(RUST, 0.3); g.fillRect(x0, y - 18, w, 18);
  g.fillStyle(IRON_DARK, 1); g.fillPoints([{ x: x0 - 10, y: y - h }, { x: x0 + w + 10, y: y - h + 10 }, { x: x0 + w + 10, y: y - h - 4 }, { x: x0 - 10, y: y - h - 22 }], true);
  // A window full of jars.
  g.fillStyle(0x0e141c, 1); g.fillRect(x0 + 18, y - h + 22, 50, 34);
  for (let i = 0; i < 5; i++) {
    const jx = x0 + 24 + i * 10;
    g.fillStyle(i % 2 ? AURORA_TEAL : INSULATOR, 0.5); g.fillRect(jx - 3, y - h + 34, 7, 16);
    g.fillStyle(COPPER, 1); g.fillRect(jx - 3, y - h + 32, 7, 3);
  }
  g.lineStyle(2, IRON_DARK, 1); g.strokeRect(x0 + 18, y - h + 22, 50, 34);
  // The door and the chalk board.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + 20, y - 52, 26, 52);
  g.fillStyle(BRASS, 1); g.fillCircle(x + 40, y - 26, 2);
  g.fillStyle(SLATE_DEEP, 1); g.fillRect(x - 30, y - 44, 40, 30);
  g.lineStyle(1, 0xe8e8e0, 0.7);
  g.strokeCircle(x - 20, y - 29, 4); g.strokeCircle(x, y - 29, 4);
  for (const bz of [-6, 6, 12]) { g.beginPath(); g.arc(x - 10, y - 29, Math.abs(bz) + 6, Math.PI * (bz < 0 ? 1.1 : 0.1), Math.PI * (bz < 0 ? 1.9 : 0.9), false); g.strokePath(); }
  // The two coil poles.
  for (const k of [-1, 1]) {
    const px = x + k * (w / 2 + 26);
    const c = k < 0 ? NORTH : SOUTH;
    g.fillStyle(IRON_DARK, 1); g.fillRect(px - 8, y - 6, 16, 6);
    g.fillStyle(dim(c, 0.35), 1); g.fillRect(px - 6, y - 150, 12, 144);
    g.fillStyle(c, 1); g.fillRect(px - 5, y - 150, 6, 144);
    for (let i = 0; i < 18; i++) { g.lineStyle(1.5, COPPER, 1); g.lineBetween(px - 8, y - 40 - i * 5, px + 8, y - 37 - i * 5); }
    g.fillStyle(BRASS, 1); g.fillCircle(px, y - 156, 9);
    g.fillStyle(BRASS_LIT, 1); g.fillCircle(px - 3, y - 159, 3);
    // The letter, in white paint.
    g.lineStyle(2, 0xffffff, 0.9);
    if (k < 0) { g.lineBetween(px - 3, y - 26, px - 3, y - 14); g.lineBetween(px - 3, y - 26, px + 3, y - 14); g.lineBetween(px + 3, y - 14, px + 3, y - 26); }
    else { g.beginPath(); g.arc(px, y - 23, 3, Math.PI * 0.1, Math.PI * 1.4, true); g.strokePath(); g.beginPath(); g.arc(px, y - 17, 3, Math.PI * 1.1, Math.PI * 0.4, true); g.strokePath(); }
  }
  // Rust blooms where the spark-gap's rain runs down the tin.
  for (let i = 0; i < 8; i++) { g.fillStyle(RUST, 0.35); g.fillCircle(x0 + rng() * w, y - h + rng() * h, 2 + rng() * 4); }
}

/**
 * Skywatcher Borea's platform at the tarn's edge: a timber deck on iron legs, a great brass
 * armillary of rings on a post, a chart table under a weighted star map, and a speaking-horn on a
 * pole for calling the aurora's colours down to the court.
 */
export function skywatch(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 200, 30, 0.35);
  // Legs and deck.
  for (const k of [-80, -30, 30, 80]) { g.fillStyle(IRON_DARK, 1); g.fillRect(x + k - 3, y - 30, 6, 30); }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 96, y - 40, 192, 12);
  for (let i = 0; i < 12; i++) { g.fillStyle(i % 2 ? TIMBER : TIMBER_LIT, 1); g.fillRect(x - 94 + i * 16, y - 44, 15, 6); }
  // The rail.
  g.lineStyle(2, IRON_LIT, 0.9); g.lineBetween(x - 96, y - 66, x + 96, y - 66);
  for (let i = 0; i <= 8; i++) g.lineBetween(x - 96 + i * 24, y - 44, x - 96 + i * 24, y - 66);
  // The armillary.
  const ax = x - 30, ay = y - 110;
  g.lineStyle(4, IRON_DARK, 1); g.lineBetween(ax, y - 44, ax, ay + 20);
  g.lineStyle(3, BRASS_DARK, 1); g.strokeCircle(ax, ay, 30);
  g.lineStyle(2, BRASS, 1); g.strokeCircle(ax, ay, 29);
  g.strokeEllipse(ax, ay, 58, 18);
  g.lineStyle(2, BRASS_LIT, 0.9); g.strokeEllipse(ax, ay, 22, 58);
  g.lineStyle(1.5, NORTH, 1); g.lineBetween(ax - 34, ay + 10, ax + 34, ay - 10);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(ax, ay, 4);
  // The chart table.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + 22, y - 70, 54, 6); g.fillRect(x + 26, y - 64, 4, 20); g.fillRect(x + 68, y - 64, 4, 20);
  g.fillStyle(0xe8e0c8, 1); g.fillRect(x + 24, y - 76, 50, 8);
  for (let i = 0; i < 6; i++) { g.fillStyle(0x2a2a40, 1); g.fillCircle(x + 28 + i * 8, y - 72 + (i % 2) * 2, 1); }
  g.fillStyle(IRON_DARK, 1); g.fillCircle(x + 26, y - 74, 2.4); g.fillCircle(x + 72, y - 74, 2.4);
  // The speaking-horn.
  g.lineStyle(2, IRON_DARK, 1); g.lineBetween(x + 88, y - 44, x + 88, y - 130);
  g.fillStyle(BRASS, 1); g.fillTriangle(x + 88, y - 130, x + 110, y - 146, x + 116, y - 128);
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x + 113, y - 137, 6, 18);
}

/**
 * Ottilie Cobalt's compass stall: an iron-framed booth hung with compasses of every size, each
 * needle pointing the same way — east, at the lodestone — a hanging sign of a great compass, and
 * a counter of watch-glass cases.
 */
export function compassStall(g: G, x: number, y: number, towardStone: number): void {
  shadow(g, x, y + 3, 150, 24, 0.35);
  const w = 130;
  // Frame and awning.
  for (const k of [-1, 1]) { g.fillStyle(IRON_DARK, 1); g.fillRect(x + k * (w / 2) - 3, y - 96, 6, 96); }
  g.fillStyle(SOUTH, 1); g.fillRect(x - w / 2 - 8, y - 106, w + 16, 14);
  for (let i = 0; i < 9; i++) { g.fillStyle(i % 2 ? NORTH : lit(SOUTH, 0.1), 1); g.fillTriangle(x - w / 2 - 8 + i * 16, y - 92, x - w / 2 + 8 + i * 16, y - 92, x - w / 2 + i * 16, y - 84); }
  // Hanging compasses.
  for (let i = 0; i < 6; i++) {
    const cx = x - w / 2 + 16 + i * 20, cy = y - 72 + (i % 2) * 10;
    g.lineStyle(1, IRON_LIT, 0.7); g.lineBetween(cx, y - 92, cx, cy - 7);
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(cx, cy, 7);
    g.fillStyle(0xf0ead8, 1); g.fillCircle(cx, cy, 5.5);
    g.lineStyle(1.5, NORTH, 1); g.lineBetween(cx, cy, cx + Math.cos(towardStone) * 4.5, cy + Math.sin(towardStone) * 4.5);
    g.lineStyle(1.5, SOUTH, 1); g.lineBetween(cx, cy, cx - Math.cos(towardStone) * 4.5, cy - Math.sin(towardStone) * 4.5);
  }
  // The counter of cases.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2, y - 34, w, 34);
  g.fillStyle(TIMBER, 1); g.fillRect(x - w / 2, y - 36, w, 5);
  for (let i = 0; i < 5; i++) {
    const cx = x - w / 2 + 16 + i * 25;
    g.fillStyle(BRASS, 1); g.fillCircle(cx, y - 40, 6);
    g.fillStyle(0xd8e8f0, 0.8); g.fillCircle(cx, y - 40, 4);
    g.lineStyle(1, NORTH, 1); g.lineBetween(cx, y - 40, cx + Math.cos(towardStone) * 3.5, y - 40 + Math.sin(towardStone) * 3.5);
  }
  // The sign: a great wooden compass.
  g.lineStyle(2, IRON_DARK, 1); g.lineBetween(x, y - 106, x, y - 118);
  g.fillStyle(TIMBER_DARK, 1); g.fillCircle(x, y - 132, 16);
  g.fillStyle(0xe8e0c8, 1); g.fillCircle(x, y - 132, 13);
  g.fillStyle(NORTH, 1); g.fillTriangle(x - 3, y - 132, x + 3, y - 132, x + Math.cos(towardStone) * 12, y - 132 + Math.sin(towardStone) * 12);
  g.fillStyle(SOUTH, 1); g.fillTriangle(x - 3, y - 132, x + 3, y - 132, x - Math.cos(towardStone) * 12, y - 132 - Math.sin(towardStone) * 12);
}

/**
 * The Brownout Bell's frame: an iron gallows of a belfry with a copper bell, its striker wired to
 * the Grid, a ladder, and a brass horn that relays the bell down the crag.
 */
export function brownoutBell(g: G, x: number, y: number): void {
  shadow(g, x, y + 3, 90, 20, 0.35);
  g.lineStyle(5, IRON_DARK, 1);
  g.lineBetween(x - 30, y, x - 12, y - 130); g.lineBetween(x + 30, y, x + 12, y - 130);
  g.lineStyle(2, IRON_LIT, 0.8);
  g.lineBetween(x - 28, y, x - 11, y - 130); g.lineBetween(x + 28, y, x + 11, y - 130);
  for (let i = 1; i < 5; i++) { const yy = y - i * 26; const k = i / 5; g.lineStyle(2, IRON_DARK, 1); g.lineBetween(x - 30 + 18 * k, yy, x + 30 - 18 * k, yy); }
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 24, y - 136, 48, 8);
  // The bell.
  g.fillStyle(COPPER_DARK, 1); g.fillTriangle(x - 18, y - 92, x + 18, y - 92, x, y - 126);
  g.fillStyle(COPPER, 1); g.fillEllipse(x, y - 110, 30, 34);
  g.fillStyle(COPPER_DARK, 1); g.fillEllipse(x, y - 94, 38, 8);
  g.fillStyle(COPPER_LIT, 0.7); g.fillEllipse(x - 7, y - 114, 6, 16);
  g.fillStyle(IRON_DARK, 1); g.fillCircle(x, y - 90, 4);
  // The striker and its wire.
  g.lineStyle(2, IRON_LIT, 1); g.lineBetween(x + 18, y - 104, x + 30, y - 116);
  g.fillStyle(IRON, 1); g.fillCircle(x + 18, y - 104, 4);
  g.lineStyle(1.5, COPPER, 1); g.lineBetween(x + 30, y - 116, x + 46, y - 150);
  // The relay horn.
  g.fillStyle(BRASS, 1); g.fillTriangle(x - 24, y - 132, x - 50, y - 150, x - 48, y - 122);
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x - 49, y - 136, 5, 26);
}

/**
 * The Draw board: a slate tablet in an iron frame by the Meter House door, every household on
 * the crag chalked with its quota and its tally, and the struck-through names of the earthed.
 */
export function drawBoard(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 110, 16, 0.3);
  for (const k of [-1, 1]) { g.fillStyle(IRON_DARK, 1); g.fillRect(x + k * 46 - 3, y - 80, 6, 80); }
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 52, y - 86, 104, 62);
  g.fillStyle(SLATE_DEEP, 1); g.fillRect(x - 48, y - 82, 96, 54);
  for (let r = 0; r < 7; r++) {
    const ry = y - 76 + r * 7;
    g.lineStyle(1, 0xe8e8e0, 0.6); g.lineBetween(x - 44, ry, x - 44 + 24 + rng() * 12, ry);
    const tally = 1 + Math.floor(rng() * 5);
    for (let t = 0; t < tally; t++) g.lineBetween(x + 4 + t * 4, ry - 2, x + 4 + t * 4, ry + 2);
    if (r === 2 || r === 5) { g.lineStyle(1.5, NORTH, 0.8); g.lineBetween(x - 46, ry, x + 40, ry); }
  }
  g.fillStyle(BRASS, 1); g.fillRect(x - 20, y - 94, 40, 8);
  g.lineStyle(1, BRASS_DARK, 1); g.strokeRect(x - 20, y - 94, 40, 8);
}

/**
 * Prospector Magda's diggings: a raw pit into the magnetite, a hand-winch over it, a sluice
 * box, a barrow of ore and a dowsing compass on a stick stuck in the spoil.
 */
export function diggings(g: G, x: number, y: number, rng: () => number): void {
  // The spoil heap and the pit.
  g.fillStyle(IRON_DARK, 1); g.fillEllipse(x - 40, y - 4, 90, 30);
  for (let i = 0; i < 20; i++) { g.fillStyle(rng() < 0.5 ? MAGNETITE_LIT : IRON, 0.8); g.fillCircle(x - 80 + rng() * 80, y - 14 + rng() * 18, 2 + rng() * 3); }
  g.fillStyle(SLATE_DEEP, 1); g.fillEllipse(x + 30, y - 2, 70, 24);
  g.fillStyle(0x050608, 1); g.fillEllipse(x + 30, y, 54, 16);
  // The winch.
  g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(x + 6, y, x + 30, y - 60); g.lineBetween(x + 54, y, x + 30, y - 60);
  g.lineStyle(3, TIMBER, 1); g.lineBetween(x + 14, y - 40, x + 46, y - 40);
  g.fillStyle(IRON_DARK, 1); g.fillCircle(x + 30, y - 40, 6);
  g.lineStyle(1, IRON_LIT, 1); g.lineBetween(x + 30, y - 40, x + 30, y - 4);
  g.fillStyle(IRON, 1); g.fillRect(x + 25, y - 8, 10, 8);
  // The barrow of ore.
  const bx = x - 70;
  g.fillStyle(TIMBER_DARK, 1); g.fillPoints([{ x: bx - 20, y: y - 26 }, { x: bx + 20, y: y - 26 }, { x: bx + 14, y: y - 12 }, { x: bx - 16, y: y - 12 }], true);
  for (let i = 0; i < 7; i++) { g.fillStyle(i % 2 ? MAGNETITE : MAGNETITE_LIT, 1); g.fillCircle(bx - 14 + i * 4.5, y - 28 - (i % 3) * 2, 4); }
  g.lineStyle(3, IRON_DARK, 1); g.strokeCircle(bx + 18, y - 6, 6);
  g.lineStyle(2, TIMBER, 1); g.lineBetween(bx - 20, y - 20, bx - 38, y - 8);
  // The dowsing compass on its stick.
  g.lineStyle(2, TIMBER_LIT, 1); g.lineBetween(x - 20, y - 16, x - 14, y - 50);
  g.fillStyle(BRASS, 1); g.fillCircle(x - 14, y - 54, 5);
  g.lineStyle(1.5, NORTH, 1); g.lineBetween(x - 14, y - 54, x - 10, y - 55);
}

/** A compass post at a crossing: a stone stub with a brass-cased compass on top. */
export function compassPost(g: G, x: number, y: number, a: number): void {
  shadow(g, x, y + 2, 24, 8, 0.3);
  g.fillStyle(BASALT_DARK, 1); g.fillRect(x - 6, y - 28, 12, 28);
  g.fillStyle(BASALT, 1); g.fillRect(x - 5, y - 28, 6, 28);
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, y - 30, 18, 9);
  g.fillStyle(0xf0ead8, 1); g.fillEllipse(x, y - 31, 14, 7);
  g.lineStyle(1.5, NORTH, 1); g.lineBetween(x, y - 31, x + Math.cos(a) * 6, y - 31 + Math.sin(a) * 3);
  g.lineStyle(1.5, SOUTH, 1); g.lineBetween(x, y - 31, x - Math.cos(a) * 6, y - 31 - Math.sin(a) * 3);
}

/** An arc lamp: an iron post with a glass globe and two carbon rods. `animate` gives its flicker. */
export function arcLamp(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 26, 8, 0.3);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 5, y - 6, 10, 6);
  g.lineStyle(3, IRON_DARK, 1); g.lineBetween(x, y - 6, x, y - 70);
  g.lineStyle(1, IRON_LIT, 0.8); g.lineBetween(x - 1, y - 6, x - 1, y - 70);
  g.lineStyle(2, IRON_DARK, 1); g.lineBetween(x, y - 70, x + 14, y - 76);
  g.fillStyle(0x203040, 0.8); g.fillCircle(x + 14, y - 68, 7);
  g.lineStyle(1, IRON_LIT, 0.8); g.strokeCircle(x + 14, y - 68, 7);
  g.lineStyle(1.5, IRON_DARK, 1); g.lineBetween(x + 14, y - 76, x + 14, y - 70); g.lineBetween(x + 14, y - 62, x + 14, y - 66);
}

/** The flicker of an arc lamp — call from `animate`. */
export function arcGlow(g: G, x: number, y: number, t: number, seed: number): void {
  const f = Math.sin(t * 23 + seed) * 0.5 + Math.sin(t * 7.3 + seed * 3) * 0.5;
  const out = Math.sin(t * 0.7 + seed) > 0.96;
  const a = out ? 0.01 : 0.05 + (f + 1) * 0.025;
  glow(g, x + 14, y - 68, 40, ARC, a, 3);
  g.fillStyle(SPARK, out ? 0.2 : 0.8); g.fillCircle(x + 14, y - 68, 2.4);
  g.fillStyle(ARC, out ? 0.02 : 0.08); g.fillEllipse(x + 10, y + 4, 70, 18);
}

/**
 * The lodestar waystone: an iron obelisk on a basalt foot with a free compass ring floating
 * round its waist. `animate` turns the ring.
 */
export function lodeWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 50, 14, 0.4);
  g.fillStyle(BASALT_DARK, 1); g.fillRect(x - 20, y - 12, 40, 12);
  g.fillStyle(BASALT, 1); g.fillRect(x - 18, y - 14, 36, 4);
  g.fillStyle(IRON_DARK, 1); g.fillTriangle(x - 12, y - 14, x + 12, y - 14, x, y - 92);
  g.fillStyle(MAGNETITE_LIT, 0.8); g.fillTriangle(x - 12, y - 14, x, y - 14, x, y - 92);
  g.fillStyle(NORTH, 1); g.fillTriangle(x - 3, y - 80, x + 3, y - 80, x, y - 92);
  g.lineStyle(1, BRASS_LIT, 0.7); g.lineBetween(x, y - 70, x, y - 24);
}

/** The waystone's floating ring — call from `animate`. */
export function waystoneRing(g: G, x: number, y: number, t: number): void {
  const ry = y - 50 + Math.sin(t * 1.4) * 3;
  g.lineStyle(2, BRASS, 0.9); g.strokeEllipse(x, ry, 46, 12);
  for (let i = 0; i < 4; i++) {
    const a = t * 0.8 + (i / 4) * Math.PI * 2;
    const px = x + Math.cos(a) * 23, py = ry + Math.sin(a) * 6;
    g.fillStyle(i === 0 ? NORTH : BRASS_LIT, 1); g.fillCircle(px, py, 2.2);
  }
  glow(g, x, y - 60, 30, AURORA_TEAL, 0.03 + Math.sin(t * 2) * 0.015, 3);
}

/** A timber jetty out into the tarn on iron piles. */
export function jetty(g: G, x: number, y: number, len: number): void {
  for (let i = 0; i < 3; i++) { g.fillStyle(IRON_DARK, 1); g.fillRect(x - 22, y - i * (len / 3) - 6, 5, 12); g.fillRect(x + 17, y - i * (len / 3) - 6, 5, 12); }
  for (let d = 0; d < len; d += 10) { g.fillStyle(d % 20 ? TIMBER : TIMBER_LIT, 1); g.fillRect(x - 22, y - d - 9, 44, 8); }
  g.lineStyle(1, TIMBER_DARK, 1); g.lineBetween(x - 22, y, x - 22, y - len); g.lineBetween(x + 22, y, x + 22, y - len);
}

/** A rack of drying fish — loach and pike hung by the gills — on the tarn shore. */
export function fishRack(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 70, 12, 0.3);
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x - 30, y, x - 30, y - 56); g.lineBetween(x + 30, y, x + 30, y - 56);
  g.lineStyle(2, TIMBER, 1); g.lineBetween(x - 34, y - 52, x + 34, y - 52);
  for (let i = 0; i < 6; i++) {
    const fx = x - 25 + i * 10;
    g.fillStyle(i % 2 ? 0x6a7a68 : 0x8a9aa8, 1); g.fillEllipse(fx, y - 38, 5, 22);
    g.fillStyle(i % 2 ? AURORA_GREEN : SOUTH_LIT, 0.5); g.fillEllipse(fx, y - 34, 2, 12);
  }
}

/** The colour a curtain of aurora is at time `t` seconds, cycling green → teal → violet → crimson. */
export function auroraHue(t: number, seed = 0): number {
  const cols = [AURORA_GREEN, AURORA_TEAL, AURORA_VIOLET, AURORA_CRIMSON];
  const f = ((t * 0.05 + seed) % 1 + 1) % 1 * cols.length;
  const i = Math.floor(f);
  return mixC(cols[i], cols[(i + 1) % cols.length], f - i);
}

/** A flake of NORTH_LIT / SOUTH_LIT for little pole badges over a fighter. */
export function poleBadge(g: G, x: number, y: number, north: boolean, a = 1): void {
  g.fillStyle(0x000000, 0.4 * a); g.fillCircle(x, y + 1, 10);
  g.fillStyle(north ? NORTH : SOUTH, a); g.fillCircle(x, y, 9);
  g.fillStyle(north ? NORTH_LIT : SOUTH_LIT, 0.6 * a); g.fillCircle(x - 2, y - 3, 3.5);
  g.lineStyle(2, 0xffffff, a);
  if (north) { g.lineBetween(x - 3.5, y + 4, x - 3.5, y - 4); g.lineBetween(x - 3.5, y - 4, x + 3.5, y + 4); g.lineBetween(x + 3.5, y + 4, x + 3.5, y - 4); }
  else {
    g.beginPath(); g.arc(x, y - 2, 3, Math.PI * 0.05, Math.PI * 1.5, true); g.strokePath();
    g.beginPath(); g.arc(x, y + 2, 3, Math.PI * 1.05, Math.PI * 0.5, true); g.strokePath();
  }
}

