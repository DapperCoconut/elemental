import Phaser from 'phaser';
import type { Pt } from '../../../../IslesTypes';
import { OBS, councilMask, crackPath, seam, shard, slab, dim, lit, mixC } from '../../../../art/PinnacleArt';

/**
 * The Thorn Bench's own drawings. The room is black glass like every bench; its one family of
 * colour is Thornwild's green — and the green is ALIVE: real vines splitting the obsidian, a
 * sapling under a bell jar, sap in the cracks. The trees are glass (they chime); the vines are not.
 */

type G = Phaser.GameObjects.Graphics;

/** The green that is winning. */
export const GREEN = {
  vine: 0x3e9a46,
  vineLit: 0x8fe58a,
  vineDark: 0x173f1e,
  leaf: 0x5ad06a,
  leafDark: 0x2a6a32,
  /** Green light in a crack where a root has split the glass. */
  glow: 0x9dff9a,
  bud: 0xe4ffd8,
  /** A touch of blossom on the strongest vines. */
  petal: 0xf2d0e4,
} as const;

/** Points helper: flat [x0, y0, x1, y1, …] to a filled polygon. */
export function poly(g: G, pts: number[], color: number, alpha = 1): void {
  const ps: Phaser.Geom.Point[] = [];
  for (let i = 0; i < pts.length; i += 2) ps.push(new Phaser.Geom.Point(pts[i], pts[i + 1]));
  g.fillStyle(color, alpha);
  g.fillPoints(ps, true);
}

/**
 * One glass leaf: a long diamond, dark plane and lit plane, a pale edge. `a` is the direction it
 * points, `len` its length. `glint` 0–1 lights its tip (a chime catching the light).
 */
export function glassLeaf(g: G, x: number, y: number, a: number, len: number, glint = 0, alpha = 1): void {
  const w = len * 0.32;
  const cx = Math.cos(a), cy = Math.sin(a);
  const nx = -cy, ny = cx;
  const tx = x + cx * len, ty = y + cy * len;
  const mx = x + cx * len * 0.45, my = y + cy * len * 0.45;
  poly(g, [x, y, mx + nx * w, my + ny * w, tx, ty], OBS.facet, alpha);
  poly(g, [x, y, tx, ty, mx - nx * w, my - ny * w], OBS.sheen, alpha);
  g.lineStyle(1, OBS.edge, 0.55 * alpha);
  g.lineBetween(x, y, tx, ty);
  if (glint > 0) {
    g.fillStyle(0xffffff, 0.7 * glint * alpha); g.fillCircle(tx - cx * 2, ty - cy * 2, 1.6);
    g.fillStyle(OBS.seamLit, 0.18 * glint * alpha); g.fillCircle(tx, ty, len * 0.4);
  }
}

/** A real leaf (green, soft), for the vines. */
export function greenLeaf(g: G, x: number, y: number, a: number, len: number, alpha = 1): void {
  const cx = Math.cos(a), cy = Math.sin(a);
  const nx = -cy, ny = cx;
  const w = len * 0.42;
  const mx = x + cx * len * 0.5, my = y + cy * len * 0.5;
  poly(g, [x, y, mx + nx * w, my + ny * w, x + cx * len, y + cy * len, mx - nx * w * 0.6, my - ny * w * 0.6], GREEN.leafDark, alpha);
  poly(g, [x, y, mx + nx * w * 0.8, my + ny * w * 0.8, x + cx * len, y + cy * len], GREEN.leaf, alpha);
  g.lineStyle(1, GREEN.vineLit, 0.5 * alpha);
  g.lineBetween(x, y, x + cx * len * 0.85, y + cy * len * 0.85);
}

/**
 * A living vine along a path: a dark under-stroke, a green stroke, a lit thread, and leaves in
 * alternate pairs. `bloom` puts a few blossoms on it.
 */
export function vine(g: G, pts: Pt[], w: number, rng: () => number, o: { leaves?: number; bloom?: number; alpha?: number } = {}): void {
  if (pts.length < 2) return;
  const a = o.alpha ?? 1;
  const line = (width: number, c: number, al: number, dx = 0, dy = 0) => {
    g.lineStyle(width, c, al);
    g.beginPath();
    g.moveTo(pts[0].x + dx, pts[0].y + dy);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x + dx, pts[i].y + dy);
    g.strokePath();
  };
  line(w + 2.5, GREEN.vineDark, 0.9 * a, 1, 1.5);
  line(w, GREEN.vine, a);
  line(Math.max(1, w * 0.35), GREEN.vineLit, 0.7 * a, -w * 0.15, -w * 0.15);
  const every = o.leaves ?? 22;
  let side = 1;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const seg = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    for (let d = rng() * every; d < seg; d += every * (0.7 + rng() * 0.6)) {
      const x = p0.x + Math.cos(ang) * d, y = p0.y + Math.sin(ang) * d;
      greenLeaf(g, x, y, ang + side * (0.9 + rng() * 0.4), w * (2.2 + rng() * 1.6), a);
      side = -side;
      if (o.bloom && rng() < o.bloom) {
        g.fillStyle(GREEN.petal, 0.9 * a);
        for (let k = 0; k < 5; k++) g.fillCircle(x + Math.cos(k * 1.256) * w * 0.9, y + Math.sin(k * 1.256) * w * 0.9, w * 0.6);
        g.fillStyle(GREEN.bud, a); g.fillCircle(x, y, w * 0.45);
      }
    }
  }
}

/**
 * Where a root has split the obsidian: a jagged violet seam that turns green along the split, and
 * a tuft of vine pushing up out of it.
 */
export function rootSplit(g: G, x: number, y: number, len: number, a: number, rng: () => number): void {
  const b = { x: x + Math.cos(a) * len, y: y + Math.sin(a) * len };
  const path = crackPath({ x, y }, b, rng, len * 0.12, 6);
  seam(g, path, 1.6, 0.8, 0.2);
  seam(g, path.slice(0, 4), 1.4, 0.9, 0.5, GREEN.glow);
  vine(g, path.slice(0, 3).map((p) => ({ x: p.x + 2, y: p.y - 3 })), 2.4, rng, { leaves: 9 });
}

/**
 * An obsidian tree: a faceted black-glass trunk forking into glass branches, hung with glass
 * leaves that chime (and catch a glint), a real green vine wound up it, and the crack at its root
 * where something living came through. `x, y` foot of the trunk; `s` ≈ 1 for a 230 px tree.
 */
export function obsidianTree(g: G, x: number, y: number, s: number, rng: () => number, o: { vines?: number; lean?: number } = {}): void {
  const lean = (o.lean ?? 0) * s;
  g.fillStyle(0x000000, 0.4); g.fillEllipse(x + 8 * s, y + 4 * s, 120 * s, 26 * s);
  // Roots: shards splaying from the foot.
  for (const [dx, h, w, l] of [[-30, 22, 30, -18], [28, 18, 26, 20], [-8, 26, 22, -4], [12, 20, 20, 10]] as number[][]) {
    shard(g, x + dx * s, y + 2 * s, w * s, h * s, l * s, 0.1);
  }
  // The trunk: two planes, tapering, with a lean.
  const tw = 30 * s, th = 120 * s;
  const tx = x + lean, ty = y - th;
  poly(g, [x - tw / 2, y, x + tw * 0.08, y, tx + tw * 0.06, ty, tx - tw * 0.28, ty + 6 * s], OBS.glass);
  poly(g, [x + tw * 0.08, y, x + tw / 2, y, tx + tw * 0.3, ty + 4 * s, tx + tw * 0.06, ty], mixC(OBS.facet, OBS.sheen, 0.4));
  g.lineStyle(1.3, OBS.edge, 0.7); g.lineBetween(x + tw * 0.08, y, tx + tw * 0.06, ty);
  g.lineStyle(1, OBS.edge, 0.25); g.lineBetween(x - tw / 2, y, tx - tw * 0.28, ty + 6 * s);
  // Branches: thin shards fanning up and out, each tipped with a crown of glass leaves.
  const branches = 5;
  const tips: Pt[] = [];
  for (let i = 0; i < branches; i++) {
    const f = i / (branches - 1);
    const a = -Math.PI / 2 + (f - 0.5) * 1.9 + (rng() - 0.5) * 0.2;
    const by = ty + (8 + rng() * 30) * s;
    const len = (60 + rng() * 40) * s * (1 - Math.abs(f - 0.5) * 0.4);
    const ex = tx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
    const bw = 7 * s;
    poly(g, [tx - bw * 0.5, by, tx + bw * 0.5, by, ex, ey], OBS.facet);
    g.lineStyle(1, OBS.edge, 0.5); g.lineBetween(tx + bw * 0.5, by, ex, ey);
    tips.push({ x: ex, y: ey });
    // A twig off each branch.
    const mx = tx + (ex - tx) * 0.6, my = by + (ey - by) * 0.6;
    const a2 = a + (rng() < 0.5 ? -0.7 : 0.7);
    const tl = len * 0.35;
    g.lineStyle(2 * s, OBS.facet, 1); g.lineBetween(mx, my, mx + Math.cos(a2) * tl, my + Math.sin(a2) * tl);
    tips.push({ x: mx + Math.cos(a2) * tl, y: my + Math.sin(a2) * tl });
  }
  // The leaves: clusters at every tip, hanging, some glinting.
  for (const p of tips) {
    const n = 5 + Math.floor(rng() * 4);
    for (let k = 0; k < n; k++) {
      const a = Math.PI / 2 + (rng() - 0.5) * 2.6;
      glassLeaf(g, p.x + (rng() - 0.5) * 14 * s, p.y + (rng() - 0.5) * 10 * s, a, (9 + rng() * 8) * s, rng() < 0.2 ? 1 : 0);
    }
  }
  // A seam up the trunk.
  seam(g, crackPath({ x: x - 2 * s, y: y - 6 * s }, { x: tx - 2 * s, y: ty + 20 * s }, rng, 5 * s, 5), 1.2 * s, 0.6);
  // The vine: up from the root crack, round the trunk, out along a branch.
  const vines = o.vines ?? 1;
  for (let v = 0; v < vines; v++) {
    const side = v % 2 ? 1 : -1;
    const pts: Pt[] = [{ x: x + side * 26 * s, y: y + 2 * s }];
    for (let k = 1; k <= 7; k++) {
      const f = k / 7;
      pts.push({ x: x + lean * f + Math.sin(f * 7 + v * 2) * tw * 0.55, y: y - th * f * 0.95 });
    }
    const tip = tips[(v * 3 + 1) % tips.length];
    pts.push({ x: (pts[pts.length - 1].x + tip.x) / 2, y: (pts[pts.length - 1].y + tip.y) / 2 + 6 * s }, tip);
    vine(g, pts, 2.6 * s, rng, { leaves: 13 * s, bloom: 0.12 });
  }
  // The split at the root, glowing green.
  seam(g, crackPath({ x: x - 4 * s, y: y + 2 * s }, { x: x - 40 * s, y: y + 22 * s }, rng, 5, 4), 1.2, 0.9, 0.4, GREEN.glow);
}

/**
 * A bell jar of clear glass. `x, y` the middle of its rim on the floor; `r` rim half-width; `h`
 * height to the top of the dome. `crack` 0–1 splits it.
 */
export function bellJar(g: G, x: number, y: number, r: number, h: number, o: { crack?: number; alpha?: number; tint?: number } = {}): void {
  const a = o.alpha ?? 1;
  const tint = o.tint ?? 0xcfe8ff;
  const top = y - h;
  // Body: straight sides up to a dome.
  g.fillStyle(tint, 0.1 * a);
  g.fillRect(x - r, top + r * 0.9, r * 2, h - r * 0.9);
  g.fillEllipse(x, top + r * 0.9, r * 2, r * 1.8);
  // Rim and outline.
  g.lineStyle(2, lit(tint, 0.4), 0.55 * a);
  g.beginPath();
  g.moveTo(x - r, y);
  g.lineTo(x - r, top + r * 0.9);
  g.arc(x, top + r * 0.9, r, Math.PI, 0, false);
  g.lineTo(x + r, y);
  g.strokePath();
  g.lineStyle(3, 0xffffff, 0.35 * a); g.strokeEllipse(x, y, r * 2, r * 0.42);
  // The knob.
  g.fillStyle(lit(tint, 0.5), 0.6 * a); g.fillCircle(x, top - 4, r * 0.12);
  g.fillStyle(0xffffff, 0.6 * a); g.fillCircle(x - r * 0.04, top - 5, r * 0.05);
  // Reflections: a long bright stripe and a short one.
  g.fillStyle(0xffffff, 0.22 * a); g.fillRect(x - r * 0.72, top + r * 0.6, r * 0.12, h * 0.62);
  g.fillStyle(0xffffff, 0.12 * a); g.fillRect(x - r * 0.5, top + r * 0.55, r * 0.05, h * 0.4);
  g.lineStyle(2, 0xffffff, 0.3 * a);
  g.beginPath(); g.arc(x, top + r * 0.9, r * 0.82, Math.PI * 1.15, Math.PI * 1.45, false); g.strokePath();
  const c = o.crack ?? 0;
  if (c > 0) {
    g.lineStyle(1.4, 0xffffff, 0.8 * a);
    const pts = [
      [x + r * 0.2, top + r * 0.2], [x + r * 0.05, top + r * 0.7], [x + r * 0.35, top + r * 1.1],
      [x + r * 0.1, top + r * 1.6], [x + r * 0.4, y - h * 0.15], [x + r * 0.25, y],
    ];
    const n = Math.max(2, Math.round(c * pts.length));
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.strokePath();
    if (c > 0.5) { g.lineBetween(pts[2][0], pts[2][1], x + r * 0.8, top + r * 1.3); g.lineBetween(pts[3][0], pts[3][1], x - r * 0.2, top + r * 2); }
  }
}

/**
 * The sapling: a slender stem, a few true leaves, a bud. `grown` 0–1 takes it from the kept
 * seedling (three leaves) to a young tree loose of its jar. `t` seconds breathes its glow.
 */
export function sapling(g: G, x: number, y: number, s: number, t: number, grown = 0): void {
  const glowA = 0.07 + 0.04 * Math.sin(t * 1.6);
  for (let i = 3; i >= 1; i--) { g.fillStyle(GREEN.glow, glowA * (1 + grown)); g.fillCircle(x, y - 26 * s, 18 * s * i * (1 + grown)); }
  // Soil in a little glass dish.
  g.fillStyle(0x1a120e, 1); g.fillEllipse(x, y, 34 * s, 9 * s);
  g.fillStyle(0x2e2018, 1); g.fillEllipse(x, y - 1, 28 * s, 6 * s);
  const h = (46 + grown * 70) * s;
  const sway = Math.sin(t * 1.1) * 2 * s;
  const stem: Pt[] = [];
  for (let k = 0; k <= 6; k++) { const f = k / 6; stem.push({ x: x + Math.sin(f * 3) * 3 * s + sway * f, y: y - h * f }); }
  g.lineStyle(3.2 * s * (1 + grown), GREEN.vineDark, 1);
  g.beginPath(); g.moveTo(stem[0].x, stem[0].y); for (const p of stem) g.lineTo(p.x, p.y); g.strokePath();
  g.lineStyle(2 * s * (1 + grown), GREEN.vine, 1);
  g.beginPath(); g.moveTo(stem[0].x, stem[0].y); for (const p of stem) g.lineTo(p.x, p.y); g.strokePath();
  const pairs = 2 + Math.round(grown * 4);
  for (let i = 0; i < pairs; i++) {
    const f = 0.35 + (i / Math.max(1, pairs)) * 0.6;
    const p = stem[Math.min(6, Math.round(f * 6))];
    const len = (12 + grown * 10) * s * (1 - f * 0.3);
    greenLeaf(g, p.x, p.y, -Math.PI / 2 - 0.9 - Math.sin(t + i) * 0.08, len);
    greenLeaf(g, p.x, p.y, -Math.PI / 2 + 0.9 + Math.sin(t * 1.2 + i) * 0.08, len);
  }
  const tip = stem[6];
  g.fillStyle(GREEN.vineLit, 1); g.fillEllipse(tip.x, tip.y - 3 * s, 6 * s, 9 * s);
  g.fillStyle(GREEN.bud, 0.9); g.fillCircle(tip.x - 1, tip.y - 5 * s, 1.6 * s);
  if (grown > 0.5) {
    g.fillStyle(GREEN.petal, 1);
    for (let k = 0; k < 5; k++) g.fillCircle(tip.x + Math.cos(k * 1.256 + t * 0.2) * 5 * s, tip.y - 6 * s + Math.sin(k * 1.256 + t * 0.2) * 5 * s, 3 * s);
    g.fillStyle(0xfff2b0, 1); g.fillCircle(tip.x, tip.y - 6 * s, 2.2 * s);
  }
}

/**
 * The Pruning Shears: house-sized, black glass, blades OPEN, hung pivot-up on chains. `x` their
 * centre line, `y` the height of the blade tips (they hang, so the drawing goes UP from here
 * to the handles). `open` radians between the blades' centre lines. `s` 1 ≈ 400 px tall.
 * `glow` lights the edge — the edge that cut the law.
 */
export function pruningShears(g: G, x: number, y: number, s: number, open: number, o: { glow?: number; t?: number; chains?: boolean } = {}): void {
  const glow = o.glow ?? 0.5;
  const t = o.t ?? 0;
  const px = x, py = y - 200 * s; // the pivot
  const blade = (side: number) => {
    // Each blade swings from the pivot DOWN and out; its handle swings UP and out the other way.
    const a = Math.PI / 2 + side * open / 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const nx = -sa, ny = ca;
    const L = 210 * s, Wd = 34 * s;
    const tipX = px + ca * L, tipY = py + sa * L;
    // The blade: a long wedge — spine on the outside, the cutting edge inside.
    const spine = -side;
    const b0x = px + nx * Wd * 0.5 * spine, b0y = py + ny * Wd * 0.5 * spine;
    const b1x = px - nx * Wd * 0.3 * spine, b1y = py - ny * Wd * 0.3 * spine;
    const midx = px + ca * L * 0.55, midy = py + sa * L * 0.55;
    poly(g, [b0x, b0y, midx + nx * Wd * 0.62 * spine, midy + ny * Wd * 0.62 * spine, tipX, tipY, b1x, b1y], OBS.glass);
    poly(g, [b0x, b0y, midx + nx * Wd * 0.62 * spine, midy + ny * Wd * 0.62 * spine, tipX, tipY, midx + nx * Wd * 0.1 * spine, midy + ny * Wd * 0.1 * spine], OBS.facet);
    // The bevel down the cutting edge: a thin band of sheen, then the edge line itself.
    poly(g, [b1x, b1y, tipX, tipY, midx - nx * Wd * 0.05 * spine, midy - ny * Wd * 0.05 * spine, px - nx * Wd * 0.12 * spine, py - ny * Wd * 0.12 * spine], OBS.sheen, 0.9);
    g.lineStyle(5 * s, OBS.seam, 0.15 + glow * 0.25); g.lineBetween(b1x, b1y, tipX, tipY);
    g.lineStyle(1.6, lit(OBS.edge, 0.5), 0.95); g.lineBetween(b1x, b1y, tipX, tipY);
    g.lineStyle(1, OBS.edge, 0.4); g.lineBetween(b0x, b0y, tipX, tipY);
    // A notch of old green in the edge — something living it cut once and never quite cleaned.
    const nxp = px + ca * L * 0.72, nyp = py + sa * L * 0.72;
    g.fillStyle(GREEN.vine, 0.75); g.fillCircle(nxp - nx * 4 * s * spine, nyp - ny * 4 * s * spine, 3 * s);
    // The handle: an obsidian shaft up the other way into a loop.
    const ha = a + Math.PI;
    const hL = 150 * s;
    const hx = px + Math.cos(ha) * hL, hy = py + Math.sin(ha) * hL;
    g.lineStyle(16 * s, OBS.glass, 1); g.lineBetween(px, py, hx, hy);
    g.lineStyle(7 * s, OBS.facet, 1); g.lineBetween(px + 3 * s, py, hx + 3 * s, hy);
    g.lineStyle(1.2, OBS.edge, 0.6); g.lineBetween(px + 8 * s, py, hx + 8 * s, hy);
    g.lineStyle(13 * s, OBS.glass, 1); g.strokeCircle(hx, hy - 10 * s, 32 * s);
    g.lineStyle(4 * s, OBS.sheen, 1); g.strokeCircle(hx, hy - 10 * s, 32 * s);
    g.lineStyle(1, OBS.edge, 0.7); g.strokeCircle(hx, hy - 10 * s, 38 * s);
    return { hx, hy: hy - 42 * s };
  };
  const l = blade(-1);
  const r = blade(1);
  // The pivot: a bolt like a moon, a violet seam round it, and the King's slit across it.
  g.fillStyle(OBS.seam, 0.18); g.fillCircle(px, py, 34 * s);
  g.fillStyle(OBS.glass, 1); g.fillCircle(px, py, 24 * s);
  g.fillStyle(OBS.sheen, 1); g.fillCircle(px - 4 * s, py - 4 * s, 16 * s);
  g.lineStyle(2, OBS.edge, 0.8); g.strokeCircle(px, py, 24 * s);
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.5);
  g.fillStyle(OBS.seamLit, 0.6 + pulse * 0.4); g.fillEllipse(px, py, 26 * s, 4 * s);
  if (o.chains !== false) {
    // Chains up from each handle loop into the dark (the ceiling is off-picture).
    for (const h of [l, r]) {
      for (let k = 0; k < 9; k++) {
        const cy = h.hy - k * 18 * s;
        g.lineStyle(3 * s, OBS.facet, 1);
        if (k % 2) g.strokeEllipse(h.hx, cy, 7 * s, 16 * s);
        else g.strokeEllipse(h.hx, cy, 3 * s, 16 * s);
        g.lineStyle(1, OBS.edge, 0.45); g.lineBetween(h.hx + 3 * s, cy - 6 * s, h.hx + 3 * s, cy + 4 * s);
      }
    }
  }
}

/** The element glyphs inlaid in green on each seat-back. `r` ≈ half its size. */
export function seatGlyph(g: G, el: string, x: number, y: number, r: number, color: number = GREEN.glow, a = 1): void {
  g.lineStyle(Math.max(1.4, r * 0.14), color, a);
  g.fillStyle(color, a);
  switch (el) {
    case 'life': // a leaf with a midrib
      poly(g, [x, y - r, x + r * 0.6, y, x, y + r, x - r * 0.6, y], color, 0.35 * a);
      g.lineBetween(x, y - r, x, y + r);
      g.lineBetween(x, y, x + r * 0.4, y - r * 0.35); g.lineBetween(x, y + r * 0.35, x - r * 0.4, y);
      break;
    case 'growth': // a double helix
      for (let k = 0; k < 10; k++) {
        const f = k / 9;
        const yy = y - r + f * 2 * r;
        const ox = Math.sin(f * Math.PI * 2) * r * 0.5;
        g.fillCircle(x + ox, yy, r * 0.1); g.fillCircle(x - ox, yy, r * 0.1);
        if (k % 2 === 0) g.lineBetween(x + ox, yy, x - ox, yy);
      }
      break;
    case 'gluttony': // a scythe over an acorn
      g.beginPath(); g.arc(x - r * 0.2, y - r * 0.1, r * 0.8, -Math.PI * 0.95, -Math.PI * 0.2, false); g.strokePath();
      g.lineBetween(x - r * 0.2, y - r * 0.1, x + r * 0.3, y + r);
      g.fillEllipse(x - r * 0.3, y + r * 0.45, r * 0.5, r * 0.6);
      break;
    case 'hunt': // antlers
      g.lineBetween(x, y + r, x, y - r * 0.1);
      for (const s of [-1, 1]) {
        g.lineBetween(x, y - r * 0.1, x + s * r * 0.7, y - r);
        g.lineBetween(x + s * r * 0.35, y - r * 0.55, x + s * r * 0.85, y - r * 0.45);
        g.lineBetween(x + s * r * 0.2, y - r * 0.3, x + s * r * 0.15, y - r * 0.85);
      }
      break;
    case 'marrow': // a bone
      g.lineBetween(x - r * 0.6, y + r * 0.6, x + r * 0.6, y - r * 0.6);
      for (const [bx, by] of [[x - r * 0.6, y + r * 0.6], [x + r * 0.6, y - r * 0.6]]) {
        g.fillCircle(bx - r * 0.18, by - r * 0.06, r * 0.2); g.fillCircle(bx + r * 0.06, by + r * 0.18, r * 0.2);
      }
      break;
    case 'gum': // a wrapped sweet with a salt crystal
      g.fillCircle(x, y - r * 0.2, r * 0.38);
      poly(g, [x - r * 0.38, y - r * 0.2, x - r * 0.9, y - r * 0.5, x - r * 0.9, y + r * 0.1], color, a);
      poly(g, [x + r * 0.38, y - r * 0.2, x + r * 0.9, y - r * 0.5, x + r * 0.9, y + r * 0.1], color, a);
      g.strokeRect(x - r * 0.22, y + r * 0.45, r * 0.44, r * 0.44);
      break;
    default:
      g.strokeCircle(x, y, r * 0.6);
  }
}

/**
 * A councilor's seat: a stepped plinth, a tall split obsidian back with the seat's element inlaid
 * in living green, two arm blocks, a vine climbing one side. `x, y` = foot of the plinth's front.
 * `vacated` lays the seat's mask split on the step (the councilor is beaten).
 */
export function councilSeat(g: G, x: number, y: number, el: string, rng: () => number, o: { vacated?: boolean; t?: number } = {}): void {
  g.fillStyle(0x000000, 0.42); g.fillEllipse(x, y + 4, 170, 34);
  // The plinth: three steps.
  slab(g, x, y, 150, 18);
  slab(g, x, y - 18, 122, 16, rng, 1);
  slab(g, x, y - 34, 96, 14);
  const base = y - 48;
  // The back: a tall middle shard and two shoulders.
  shard(g, x - 30, base, 34, 120, -10, 0.1);
  shard(g, x + 30, base, 34, 124, 10, 0.1);
  shard(g, x, base, 52, 196, 0, 0.35);
  // The inlay: a green-lit panel with the glyph in it.
  const gy = base - 104;
  g.fillStyle(OBS.glass, 1); g.fillRoundedRect(x - 15, gy - 18, 30, 36, 5);
  g.fillStyle(GREEN.glow, 0.08); g.fillCircle(x, gy, 26);
  g.lineStyle(1, GREEN.vineLit, 0.6); g.strokeRoundedRect(x - 15, gy - 18, 30, 36, 5);
  seatGlyph(g, el, x, gy, 12, GREEN.glow, 0.95);
  // Seat and arms.
  slab(g, x - 40, base, 20, 40);
  slab(g, x + 40, base, 20, 40);
  slab(g, x, base, 62, 24);
  // The seam down the tall shard.
  seam(g, [{ x: x - 1, y: base - 30 }, { x: x + 3, y: base - 70 }, { x: x - 3, y: base - 130 }, { x: x + 1, y: base - 186 }], 1.3, 0.8, 0.3);
  // A vine has found it.
  const side = rng() < 0.5 ? -1 : 1;
  const pts: Pt[] = [{ x: x + side * 70, y: y + 2 }];
  for (let k = 1; k <= 6; k++) pts.push({ x: x + side * (66 - k * 6) + Math.sin(k * 1.7) * 6, y: y - k * 20 });
  pts.push({ x: x + side * 26, y: base - 112 });
  vine(g, pts, 2.2, rng, { leaves: 11, bloom: 0.15 });
  if (o.vacated) {
    // The mask, split, lying on the top step; starlight through the crack.
    const mx = x + 18, my = y - 40;
    g.fillStyle(0x000000, 0.4); g.fillEllipse(mx, my + 6, 34, 8);
    councilMask(g, mx - 5, my - 6, 11, { crack: 1, slit: GREEN.vine });
    councilMask(g, mx + 9, my - 3, 8, { crack: 0.6, alpha: 0.9, slit: GREEN.vine });
  }
}

export { OBS, dim, lit, mixC };
