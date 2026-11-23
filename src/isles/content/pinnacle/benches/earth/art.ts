import type Phaser from 'phaser';
import { OBS, councilMask, crackPath, seam, shard, slab, starGlow } from '../../../../art/PinnacleArt';
import { dim, lit, mixC, shadow } from '../../../../art/IsleArt';
import { poly } from './util';

/**
 * The Stone Bench's own drawings: the strata of every isle's stone set into the black glass, the
 * tithe-stones stacked like coin, the obsidian crown, the mountain of stone — and the set piece,
 * the Great Scale, where a single crown outweighs the whole Hold. The bench's one family of extra
 * colour is the Hold's: ochre, umber, sienna, sandstone and rust, always as stone trapped in or
 * stacked on the glass, never as paint on it.
 */

type G = Phaser.GameObjects.Graphics;

export const OCHRE = 0xc89a5a;
export const OCHRE_LIT = 0xe8c27e;
export const UMBER = 0x5a3e24;
export const SIENNA = 0x9a5630;
export const SANDSTONE = 0xd6b47a;
export const RUST = 0x8a3c1c;
export const BONE = 0xd9cfb4;
export const CLAY = 0xa85a36;
export const BASALT = 0x2e2a2c;
export const SLATE = 0x4a4e5a;
/** The order the layers lie in, top to bottom, wherever the glass shows them. */
export const STRATA = [SANDSTONE, OCHRE, UMBER, SIENNA, BONE, RUST, CLAY, SLATE, OCHRE, BASALT];

/**
 * Strata trapped in glass, laid horizontally in a rect: wavy bands of the Hold's stones with pale
 * bedding lines between them, then a glaze of black glass over the lot so they read as *inside* the
 * spire. `glaze` 0–1 how much of the glass sits over the stone; `fault` offsets the right half.
 */
export function strataH(g: G, x: number, y: number, w: number, h: number, rng: () => number, glaze = 0.55, fault = 0): void {
  const bands = Math.max(3, Math.round(h / 16));
  const step = Math.max(28, w / 14);
  let prev: number[] = [];
  for (let sx = 0; sx <= w + step; sx += step) prev.push(y);
  for (let b = 1; b <= bands; b++) {
    const base = y + (h * b) / bands;
    const next: number[] = [];
    for (let i = 0, sx = 0; sx <= w + step; sx += step, i++) {
      const off = sx > w / 2 ? fault : 0;
      next.push(b === bands ? y + h : clampY(base + Math.sin(sx * 0.013 + b * 1.7) * 4 + (rng() - 0.5) * 3 + off, y, y + h));
    }
    const col = STRATA[(b + Math.floor(rng() * 2)) % STRATA.length];
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < prev.length; i++) pts.push({ x: Math.min(x + w, x + i * step), y: prev[i] });
    for (let i = next.length - 1; i >= 0; i--) pts.push({ x: Math.min(x + w, x + i * step), y: next[i] });
    poly(g, pts, dim(col, 0.25), 1);
    // Grain: a few darker flecks and pale pebbles in each bed.
    for (let k = 0; k < w / 60; k++) {
      const px = x + rng() * w, py = base - (h / bands) * (0.2 + rng() * 0.6);
      g.fillStyle(rng() < 0.5 ? dim(col, 0.5) : lit(col, 0.25), 0.55);
      g.fillEllipse(px, py, 3 + rng() * 6, 1.5 + rng() * 2);
    }
    // The bedding plane.
    g.lineStyle(1, lit(col, 0.35), 0.35);
    g.beginPath();
    g.moveTo(x, next[0]);
    for (let i = 1; i < next.length; i++) g.lineTo(Math.min(x + w, x + i * step), next[i]);
    g.strokePath();
    prev = next;
  }
  g.fillStyle(OBS.glass, glaze);
  g.fillRect(x, y, w, h);
  // The glass catches a long cold reflection over the stone.
  g.fillStyle(OBS.sheen, 0.12);
  g.fillTriangle(x + w * 0.1, y, x + w * 0.32, y, x + w * 0.05, y + h);
}

function clampY(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }

/** Strata running vertically in a rect (a side wall seen from above shows its layers end-on). */
export function strataV(g: G, x: number, y: number, w: number, h: number, rng: () => number, glaze = 0.6): void {
  const bands = Math.max(3, Math.round(w / 14));
  for (let b = 0; b < bands; b++) {
    const x0 = x + (w * b) / bands, bw = w / bands + 1;
    const col = STRATA[(b * 3 + Math.floor(rng() * 2)) % STRATA.length];
    g.fillStyle(dim(col, 0.3), 1);
    g.fillRect(x0, y, bw, h);
    for (let k = 0; k < h / 50; k++) {
      g.fillStyle(rng() < 0.5 ? dim(col, 0.55) : lit(col, 0.2), 0.5);
      g.fillEllipse(x0 + rng() * bw, y + rng() * h, 1.5 + rng() * 2, 3 + rng() * 6);
    }
    g.lineStyle(1, lit(col, 0.3), 0.3);
    g.lineBetween(x0, y, x0, y + h);
  }
  g.fillStyle(OBS.glass, glaze);
  g.fillRect(x, y, w, h);
}

/**
 * A stack of tithe-stones cut round and flat, stacked like coin: `n` stones of radius `r`, each
 * a little off true, a lit top face and a dark rim, the top one stamped with the crown hallmark.
 * `x, y` is the foot of the stack.
 */
export function titheStack(g: G, x: number, y: number, n: number, r: number, rng: () => number): void {
  const th = r * 0.34;
  shadow(g, x + r * 0.2, y + 2, r * 2.6, r * 0.8, 0.4);
  let cx = x;
  for (let i = 0; i < n; i++) {
    const cy = y - i * th;
    cx += (rng() - 0.5) * r * 0.12;
    const col = STRATA[(i + Math.floor(rng() * 3)) % 6];
    g.fillStyle(dim(col, 0.45), 1);
    g.fillEllipse(cx, cy, r * 2, r * 0.8);
    g.fillRect(cx - r, cy - th, r * 2, th);
    g.fillStyle(dim(col, 0.2), 1);
    g.fillRect(cx - r, cy - th, r * 0.5, th);
    g.fillStyle(col, 1);
    g.fillEllipse(cx, cy - th, r * 2, r * 0.8);
    g.fillStyle(lit(col, 0.3), 0.6);
    g.fillEllipse(cx - r * 0.25, cy - th - r * 0.08, r * 1.1, r * 0.34);
    g.lineStyle(1, dim(col, 0.6), 0.8);
    g.strokeEllipse(cx, cy - th, r * 2, r * 0.8);
  }
  const ty = y - n * th;
  crownMark(g, cx, ty, r * 0.42, OBS.seam, 0.85);
}

/** The hallmark the Council stamped on every tithe-stone: a five-pointed crown in a ring. */
export function crownMark(g: G, x: number, y: number, s: number, color: number, a = 1): void {
  g.lineStyle(Math.max(1, s * 0.16), color, a);
  g.strokeEllipse(x, y, s * 2.2, s * 0.9);
  const pts = [
    { x: x - s * 0.7, y: y + s * 0.18 }, { x: x - s * 0.7, y: y - s * 0.3 }, { x: x - s * 0.35, y: y - s * 0.05 },
    { x, y: y - s * 0.42 }, { x: x + s * 0.35, y: y - s * 0.05 }, { x: x + s * 0.7, y: y - s * 0.3 }, { x: x + s * 0.7, y: y + s * 0.18 },
  ];
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.strokePath();
}

/**
 * The crown in the scale's pan: a band of black glass with five shard points and the King's violet
 * in its seams — and, deep in it, a pinprick of the star. That is why it is heavy. `crack` 0–1
 * splits it open and lets the star out (the law undone). `x, y` the middle of its base.
 */
export function obsidianCrown(g: G, x: number, y: number, s: number, t: number, crack = 0): void {
  shadow(g, x, y + 2 * s, 46 * s, 10 * s, 0.5);
  // The band.
  g.fillStyle(OBS.glass, 1);
  g.fillRect(x - 22 * s, y - 12 * s, 44 * s, 12 * s);
  g.fillStyle(OBS.facet, 1);
  g.fillRect(x - 22 * s, y - 12 * s, 44 * s, 4 * s);
  // Five points, the middle tallest.
  const pts: [number, number, number][] = [[-18, 16, -3], [-9, 22, -1], [0, 30, 0], [9, 22, 1], [18, 16, 3]];
  for (const [dx, h, lean] of pts) shard(g, x + dx * s, y - 11 * s, 9 * s, h * s, lean * s, 0.35);
  g.lineStyle(1.2, OBS.edge, 0.8);
  g.strokeRect(x - 22 * s, y - 12 * s, 44 * s, 12 * s);
  // Set stones along the band: violet glass beads.
  for (let i = -2; i <= 2; i++) {
    g.fillStyle(OBS.seam, 0.9); g.fillCircle(x + i * 8 * s, y - 6 * s, 2 * s);
    g.fillStyle(OBS.seamLit, 0.9); g.fillCircle(x + i * 8 * s - 0.6 * s, y - 6.6 * s, 0.8 * s);
  }
  // The star inside, showing through the middle point.
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.1);
  const heat = 0.35 + crack * 0.65;
  g.fillStyle(OBS.starDeep, 0.12 * heat + 0.05 * pulse); g.fillCircle(x, y - 22 * s, 14 * s * (1 + crack));
  g.fillStyle(OBS.star, 0.5 + 0.3 * pulse); g.fillCircle(x, y - 22 * s, (1.4 + crack * 2.4) * s);
  g.fillStyle(OBS.starCore, 0.9); g.fillCircle(x, y - 22 * s, (0.7 + crack * 1.2) * s);
  if (crack > 0) {
    seam(g, [{ x: x - 2 * s, y: y - 40 * s }, { x: x + 2 * s, y: y - 26 * s }, { x: x - 3 * s, y: y - 14 * s }, { x: x + 1 * s, y: y - 1 * s }], 1.2 * s, crack, crack, OBS.star);
    if (crack > 0.5) starGlow(g, x, y - 22 * s, 3 * s, t, crack * 0.6);
  }
}

/**
 * The mountain in the other pan: tithe-stones heaped in a cone, cut blocks and coin-stones together,
 * each with a lit top and the hallmark on a few. `cx, baseY` the middle of the heap's foot.
 */
export function stoneMountain(g: G, cx: number, baseY: number, w: number, h: number, rng: () => number): void {
  const rows = Math.max(5, Math.round(h / 13));
  for (let r = 0; r < rows; r++) {
    const f = r / rows;
    const rowW = w * (1 - f) * (0.96 + rng() * 0.08);
    const y = baseY - r * (h / rows);
    const n = Math.max(1, Math.round(rowW / 17));
    for (let i = 0; i < n; i++) {
      const x = cx - rowW / 2 + (i + 0.5) * (rowW / n) + (rng() - 0.5) * 5;
      const col = STRATA[Math.floor(rng() * 7)];
      const bw = 12 + rng() * 8, bh = 8 + rng() * 5;
      if (rng() < 0.55) {
        // A cut block.
        g.fillStyle(dim(col, 0.45), 1); g.fillRect(x - bw / 2, y - bh, bw, bh);
        g.fillStyle(col, 1); g.fillRect(x - bw / 2, y - bh, bw, bh * 0.38);
        g.fillStyle(dim(col, 0.25), 1); g.fillRect(x - bw / 2, y - bh * 0.62, bw * 0.3, bh * 0.62);
      } else {
        // A coin-stone, on its side or flat.
        g.fillStyle(dim(col, 0.45), 1); g.fillEllipse(x, y - bh * 0.4, bw, bh * 0.9);
        g.fillStyle(col, 1); g.fillEllipse(x, y - bh * 0.6, bw, bh * 0.6);
      }
      if (rng() < 0.08) crownMark(g, x, y - bh * 0.6, 3.2, OBS.seam, 0.7);
    }
  }
  // A last stone balanced on the very top.
  g.fillStyle(lit(OCHRE, 0.15), 1); g.fillRect(cx - 6, baseY - h - 9, 12, 9);
  g.fillStyle(OCHRE_LIT, 1); g.fillRect(cx - 6, baseY - h - 9, 12, 3);
}

/** A few links of hanging chain from a to b: a dark line with link beads on it. */
function hangChain(g: G, ax: number, ay: number, bx: number, by: number, s: number): void {
  g.lineStyle(2.2 * s, OBS.glass, 1); g.lineBetween(ax, ay, bx, by);
  const n = Math.max(3, Math.round(Math.hypot(bx - ax, by - ay) / (9 * s)));
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    g.lineStyle(1.2 * s, i % 2 ? OBS.edge : OBS.sheen, 0.8);
    g.strokeEllipse(ax + (bx - ax) * f, ay + (by - ay) * f, (i % 2 ? 3 : 5) * s, (i % 2 ? 6 : 4) * s);
  }
}

/**
 * THE GREAT SCALE — the Stone Bench's set piece. A stepped obsidian plinth, a pillar inlaid with the
 * Hold's strata, a knife-edge fulcrum, and a long glass beam with graduations; from each end three
 * chains hang a pan. The left pan holds a mountain of tithe-stone; the right, one obsidian crown —
 * and the beam leans to the crown. `tilt` radians (+ = the crown's side down). `after` draws it as
 * the law undone: the beam tipped back to the stone and the crown split with starlight.
 * `x, y` is the middle of the plinth's foot; `s` 1 ≈ 760 px across, 620 tall.
 */
export function greatScale(g: G, x: number, y: number, s: number, tilt: number, rng: () => number, o: { t?: number; after?: boolean } = {}): void {
  const t = o.t ?? 0;
  const after = !!o.after;
  shadow(g, x, y + 6 * s, 820 * s, 120 * s, 0.4);
  // The plinth: three steps, each cracked with a seam, an inscription band of hallmarks on the top step.
  slab(g, x, y, 300 * s, 34 * s, rng, 2);
  slab(g, x, y - 34 * s, 236 * s, 30 * s, rng, 1);
  slab(g, x, y - 64 * s, 170 * s, 26 * s, rng, 1);
  for (let i = -3; i <= 3; i++) crownMark(g, x + i * 22 * s, y - 50 * s, 4.5 * s, OCHRE, 0.55);
  // The pillar, faced with strata glass, edged in pale lines.
  const pw = 74 * s, ph = 340 * s, py = y - 90 * s;
  g.fillStyle(OBS.glass, 1); g.fillRect(x - pw / 2, py - ph, pw, ph);
  strataH(g, x - pw / 2 + 8 * s, py - ph + 30 * s, pw - 16 * s, ph - 60 * s, rng, 0.42);
  g.fillStyle(OBS.facet, 0.9); g.fillRect(x - pw / 2, py - ph, 10 * s, ph);
  g.fillStyle(OBS.sheen, 0.8); g.fillRect(x + pw / 2 - 8 * s, py - ph, 8 * s, ph);
  g.lineStyle(1.4, OBS.edge, 0.7); g.strokeRect(x - pw / 2, py - ph, pw, ph);
  seam(g, crackPath({ x: x - 8 * s, y: py - 20 * s }, { x: x + 6 * s, y: py - ph + 40 * s }, rng, 7 * s, 9), 1.3 * s, 0.7, 0.3);
  // Capital: a crown of shards round the top of the pillar.
  for (let i = -3; i <= 3; i++) shard(g, x + i * 13 * s, py - ph + 4 * s, 18 * s, (30 + (3 - Math.abs(i)) * 9) * s, i * 2 * s, 0.25);
  slab(g, x, py - ph + 6 * s, 104 * s, 16 * s);
  // The dial behind the pointer: an arc of graduations.
  const P = { x, y: py - ph - 26 * s };
  g.lineStyle(3 * s, OBS.facet, 1);
  g.beginPath(); g.arc(P.x, P.y, 120 * s, -Math.PI * 0.8, -Math.PI * 0.2, false); g.strokePath();
  for (let i = 0; i <= 12; i++) {
    const a = -Math.PI * 0.8 + (i / 12) * Math.PI * 0.6;
    const r0 = (i % 3 === 0 ? 106 : 112) * s;
    g.lineStyle(i % 3 === 0 ? 2 : 1, i === 6 ? OCHRE_LIT : OBS.edge, i === 6 ? 0.9 : 0.6);
    g.lineBetween(P.x + Math.cos(a) * r0, P.y + Math.sin(a) * r0, P.x + Math.cos(a) * 124 * s, P.y + Math.sin(a) * 124 * s);
  }
  // The pointer, standing off the beam, leaning with it.
  const pa = -Math.PI / 2 + tilt;
  g.lineStyle(4 * s, OBS.glass, 1); g.lineBetween(P.x, P.y, P.x + Math.cos(pa) * 118 * s, P.y + Math.sin(pa) * 118 * s);
  g.lineStyle(1.6 * s, OBS.seamLit, 0.9); g.lineBetween(P.x, P.y, P.x + Math.cos(pa) * 118 * s, P.y + Math.sin(pa) * 118 * s);
  // The beam.
  const L = 330 * s;
  const cos = Math.cos(tilt), sin = Math.sin(tilt);
  const end = (k: number) => ({ x: P.x + cos * L * k, y: P.y + sin * L * k });
  const nx = -sin, ny = cos;
  const thick = (k: number) => (14 - Math.abs(k) * 8) * s;
  const top: { x: number; y: number }[] = [], bot: { x: number; y: number }[] = [];
  for (let i = -10; i <= 10; i++) {
    const k = i / 10, e = end(k), th = thick(k);
    top.push({ x: e.x - nx * th, y: e.y - ny * th });
    bot.push({ x: e.x + nx * th * 0.7, y: e.y + ny * th * 0.7 });
  }
  poly(g, [...top, ...bot.slice().reverse()], OBS.glass, 1);
  poly(g, [...top, ...top.slice().reverse().map((p) => ({ x: p.x + nx * 5 * s, y: p.y + ny * 5 * s }))], OBS.sheen, 0.9);
  g.lineStyle(1.4, OBS.edge, 0.85);
  g.beginPath(); g.moveTo(top[0].x, top[0].y); for (const p of top) g.lineTo(p.x, p.y); g.strokePath();
  // An ochre inlay line down the beam, and graduations along it.
  g.lineStyle(1.6 * s, OCHRE, 0.75);
  g.lineBetween(end(-0.92).x, end(-0.92).y + 1, end(0.92).x, end(0.92).y + 1);
  for (let i = -9; i <= 9; i++) {
    if (i === 0) continue;
    const e = end(i / 10);
    g.lineStyle(1, OBS.edge, 0.55);
    g.lineBetween(e.x - nx * 3 * s, e.y - ny * 3 * s, e.x + nx * (i % 3 === 0 ? 8 : 5) * s, e.y + ny * (i % 3 === 0 ? 8 : 5) * s);
  }
  // Fulcrum: a knife-edge in a ring, a violet stone at the pivot.
  g.fillStyle(OBS.facet, 1); g.fillTriangle(P.x - 22 * s, P.y + 20 * s, P.x + 22 * s, P.y + 20 * s, P.x, P.y - 4 * s);
  g.lineStyle(4 * s, OBS.sheen, 1); g.strokeCircle(P.x, P.y, 16 * s);
  g.lineStyle(1.2, OBS.edge, 0.8); g.strokeCircle(P.x, P.y, 18 * s);
  g.fillStyle(OBS.seam, 0.35); g.fillCircle(P.x, P.y, 10 * s);
  g.fillStyle(OBS.seamLit, 1); g.fillCircle(P.x, P.y, 4 * s);
  // Hooks at the ends, then chains and pans.
  const hang = 210 * s;
  for (const k of [-1, 1]) {
    const e = end(k * 0.97);
    g.lineStyle(5 * s, OBS.sheen, 1);
    g.beginPath(); g.arc(e.x, e.y + 8 * s, 7 * s, -Math.PI * 0.9, Math.PI * 0.6, false); g.strokePath();
    const panY = e.y + hang;
    const prw = (k < 0 ? 118 : 84) * s;
    hangChain(g, e.x, e.y + 14 * s, e.x - prw * 0.92, panY - 6 * s, s);
    hangChain(g, e.x, e.y + 14 * s, e.x + prw * 0.92, panY - 6 * s, s);
    hangChain(g, e.x, e.y + 14 * s, e.x, panY - 14 * s, s);
    // The pan: a shallow dish of glass with a pale rim.
    g.fillStyle(OBS.glass, 1); g.fillEllipse(e.x, panY + 8 * s, prw * 2, 34 * s);
    g.fillStyle(OBS.facet, 1); g.fillEllipse(e.x, panY, prw * 2, 26 * s);
    g.lineStyle(1.6, OBS.edge, 0.8); g.strokeEllipse(e.x, panY, prw * 2, 26 * s);
    g.fillStyle(OBS.sheen, 0.6); g.fillEllipse(e.x - prw * 0.4, panY + 10 * s, prw * 0.7, 6 * s);
    if (k < 0) stoneMountain(g, e.x, panY + 4 * s, prw * 1.7, 150 * s, rng);
    else {
      // A cushion-block of glass, and on it the crown.
      slab(g, e.x, panY + 2 * s, 54 * s, 14 * s);
      obsidianCrown(g, e.x, panY - 12 * s, 1.15 * s, t, after ? 1 : 0);
    }
  }
  if (after) {
    // Fallen stones round the foot: the mountain has begun to come down off its pan.
    for (let i = 0; i < 14; i++) {
      const px = x - 330 * s + (rng() - 0.5) * 220 * s, py2 = y - rng() * 10 * s;
      const col = STRATA[i % 7];
      g.fillStyle(dim(col, 0.4), 1); g.fillRect(px - 7 * s, py2 - 8 * s, 14 * s, 8 * s);
      g.fillStyle(col, 1); g.fillRect(px - 7 * s, py2 - 8 * s, 14 * s, 3 * s);
    }
  }
}

/** Seat sigils, one per element of the bench, inlaid in ochre on each seat's back. */
export type SeatSigil = 'earth' | 'crystal' | 'clay' | 'dune' | 'metal' | 'ruin';

/** One seat's sigil, `s` ≈ its half-size. */
export function seatSigil(g: G, kind: SeatSigil, x: number, y: number, s: number, color: number, a = 1): void {
  g.lineStyle(Math.max(1, s * 0.14), color, a);
  switch (kind) {
    case 'earth':
      g.strokeTriangle(x - s, y + s * 0.7, x + s, y + s * 0.7, x - s * 0.1, y - s * 0.8);
      g.lineBetween(x - s * 0.45, y - s * 0.05, x + s * 0.25, y - s * 0.05);
      break;
    case 'crystal':
      g.strokePoints([
        { x: x - s, y: y - s * 0.2 }, { x: x - s * 0.5, y: y - s * 0.75 }, { x: x + s * 0.5, y: y - s * 0.75 },
        { x: x + s, y: y - s * 0.2 }, { x, y: y + s },
      ], true);
      g.lineBetween(x - s, y - s * 0.2, x + s, y - s * 0.2);
      g.lineBetween(x - s * 0.5, y - s * 0.75, x, y + s);
      g.lineBetween(x + s * 0.5, y - s * 0.75, x, y + s);
      break;
    case 'clay':
      g.strokeEllipse(x, y + s * 0.25, s * 1.2, s * 1.1);
      for (let i = -2; i <= 2; i++) g.lineBetween(x + i * s * 0.22, y - s * 0.2, x + i * s * 0.3, y - s * (0.75 - Math.abs(i) * 0.08));
      break;
    case 'dune':
      for (let i = 0; i < 3; i++) {
        const yy = y - s * 0.6 + i * s * 0.6;
        g.beginPath(); g.arc(x - s * 0.5, yy + s * 0.25, s * 0.5, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
        g.beginPath(); g.arc(x + s * 0.45, yy + s * 0.25, s * 0.5, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
      }
      break;
    case 'metal':
      g.strokeEllipse(x - s * 0.45, y, s * 1.1, s * 0.6);
      g.strokeEllipse(x + s * 0.45, y, s * 1.1, s * 0.6);
      g.lineBetween(x - s, y + s * 0.8, x + s, y + s * 0.8);
      break;
    case 'ruin':
      g.strokeRect(x - s * 0.35, y - s * 0.3, s * 0.7, s * 1.2);
      g.lineBetween(x - s * 0.6, y + s * 0.9, x + s * 0.6, y + s * 0.9);
      g.lineBetween(x - s * 0.35, y - s * 0.3, x - s * 0.1, y - s * 0.55);
      g.lineBetween(x - s * 0.1, y - s * 0.55, x + s * 0.1, y - s * 0.3);
      g.lineBetween(x + s * 0.2, y - s * 0.85, x + s * 0.5, y - s * 0.65);
      break;
  }
}

/**
 * A councilor's seat: a tall obsidian chair on a stepped plinth. Three shards for a back (the middle
 * one tallest, with a strip of strata glass down it and an empty mask-niche at its head), slab arms,
 * the seat's sigil in ochre on a roundel. `x, y` the middle of the plinth's foot.
 */
export function benchSeat(g: G, x: number, y: number, s: number, sigil: SeatSigil, rng: () => number, t = 0): void {
  shadow(g, x, y + 4, 170 * s, 30 * s, 0.45);
  slab(g, x, y, 150 * s, 22 * s, rng, 1);
  slab(g, x, y - 22 * s, 118 * s, 18 * s);
  // The back.
  shard(g, x - 34 * s, y - 60 * s, 40 * s, 150 * s, -9 * s, 0.1);
  shard(g, x + 34 * s, y - 60 * s, 40 * s, 158 * s, 9 * s, 0.12);
  shard(g, x, y - 60 * s, 52 * s, 230 * s, 0, 0.3);
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 30 * s, y - 180 * s, 60 * s, 130 * s);
  strataH(g, x - 9 * s, y - 176 * s, 18 * s, 118 * s, rng, 0.35);
  g.lineStyle(1.2, OBS.edge, 0.55); g.strokeRect(x - 30 * s, y - 180 * s, 60 * s, 130 * s);
  // The empty niche at the head where the mask hangs between sittings.
  councilMask(g, x, y - 210 * s, 14 * s, { alpha: 0.35, slit: OBS.seam });
  g.lineStyle(1, OBS.edge, 0.5); g.strokeCircle(x, y - 210 * s, 22 * s);
  // The roundel with the sigil.
  g.fillStyle(OBS.facet, 1); g.fillCircle(x, y - 150 * s, 15 * s);
  g.lineStyle(1.4, OCHRE, 0.8); g.strokeCircle(x, y - 150 * s, 15 * s);
  seatSigil(g, sigil, x, y - 150 * s, 8 * s, OCHRE_LIT, 0.9);
  // Arms and seat.
  slab(g, x - 50 * s, y - 40 * s, 22 * s, 46 * s);
  slab(g, x + 50 * s, y - 40 * s, 22 * s, 46 * s);
  slab(g, x, y - 40 * s, 80 * s, 26 * s);
  // A seam down the tall shard, breathing very slowly.
  seam(g, crackPath({ x: x + 2 * s, y: y - 66 * s }, { x: x - 1 * s, y: y - 270 * s }, rng, 4 * s, 6), 1.1 * s, 0.6, 0.3 + 0.3 * Math.sin(t));
  // Tithe-stones left as offerings at the plinth's corners.
  for (const dx of [-62, 62]) {
    const col = STRATA[Math.floor(rng() * 6)];
    g.fillStyle(dim(col, 0.4), 1); g.fillRect(x + dx * s - 7 * s, y - 30 * s, 14 * s, 8 * s);
    g.fillStyle(col, 1); g.fillRect(x + dx * s - 7 * s, y - 30 * s, 14 * s, 3 * s);
  }
}

/** Mix helper re-exported for the bench's other files. */
export { mixC };
