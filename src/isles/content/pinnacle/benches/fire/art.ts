import Phaser from 'phaser';
import { type G, brandSigil, dim, glow, lit, mixC, shadow } from '../../../../art/IsleArt';
import { OBS, seam, shard, slab } from '../../../../art/PinnacleArt';
import type { Pt } from '../../../../IslesTypes';

/**
 * The Ember Bench's drawings — the glass-foundry gone cold where Brandmark's law was written.
 *
 * Everything is the Pinnacle's black glass (`OBS`, `shard`, `slab`, `seam`); the bench's one
 * colour of its own is EMBER — the light trapped inside the frozen pours, the heat still left in
 * the First Brand's face, the inlay on the six seats. Never a repaint: ember shows only as light
 * in cracks, inside the glass and in the iron.
 */

export const EMB = {
  /** Ember light — the bench's colour. */
  ember: 0xff6a2a,
  /** Hotter: the core of a crack, a fresh coal. */
  hot: 0xffb35a,
  /** White heat. */
  core: 0xffe8b8,
  /** Ember gone deep in the glass. */
  deep: 0xb8360e,
  /** A coal nearly out. */
  coal: 0x4a1406,
  /** Ash. */
  ash: 0x3a3438,
  ashLit: 0x6e666a,
  /** Sealing wax (the Seal's decree). */
  wax: 0xa8180e,
  waxLit: 0xe0402a,
  /** Old vellum (writs, the clerk's ledgers). */
  vellum: 0xd8c8a0,
} as const;

const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

/** Ember heat 0–1 as a colour: coal → ember → hot → white. */
export function heatColor(k: number): number {
  if (k < 0.35) return mixC(EMB.coal, EMB.deep, k / 0.35);
  if (k < 0.7) return mixC(EMB.deep, EMB.ember, (k - 0.35) / 0.35);
  if (k < 0.9) return mixC(EMB.ember, EMB.hot, (k - 0.7) / 0.2);
  return mixC(EMB.hot, EMB.core, (k - 0.9) / 0.1);
}

/** A crack with ember in it instead of violet — the glass here still holds the foundry's heat. */
export function emberSeam(g: G, pts: Pt[], w = 1.6, alpha = 1, pulse = 0): void {
  seam(g, pts, w, alpha, pulse, EMB.ember);
}

/**
 * The Brand of Ashgrave on a seal-face: a raised rim, the sigil, and the face's heat (0–1).
 * `x, y` the face's centre, `r` its radius, `squash` the ellipse ratio (1 = seen straight on).
 */
export function brandFace(g: G, x: number, y: number, r: number, heat: number, squash = 1): void {
  const c = heatColor(heat);
  g.fillStyle(OBS.glass, 1); g.fillEllipse(x, y, r * 2, r * 2 * squash);
  g.fillStyle(dim(c, 0.55), 0.9); g.fillEllipse(x, y, r * 1.8, r * 1.8 * squash);
  g.lineStyle(Math.max(1, r * 0.1), c, 0.9); g.strokeEllipse(x, y, r * 1.72, r * 1.72 * squash);
  g.lineStyle(1, OBS.edge, 0.5); g.strokeEllipse(x, y, r * 2, r * 2 * squash);
  if (squash > 0.75) brandSigil(g, x, y, r * 0.52, c, 0.95);
  else {
    // Foreshortened: the sigil as the iron would print it on a floor seen at a slant.
    g.lineStyle(Math.max(1, r * 0.1), c, 0.95);
    g.beginPath(); g.arc(x, y, r * 0.52, -Math.PI * 0.35, Math.PI * 1.35, false); g.strokePath();
    g.fillStyle(c, 0.95);
    g.fillTriangle(x - r * 0.24, y + r * 0.2 * squash, x + r * 0.24, y + r * 0.2 * squash, x, y - r * 0.4 * squash);
  }
  if (heat > 0.6) { g.fillStyle(EMB.core, (heat - 0.6) * 0.5); g.fillEllipse(x, y, r * 0.9, r * 0.9 * squash); }
}

/**
 * A branding iron: a long black-glass shaft with a twisted grip, a collar and a seal-head.
 * `x, y` the head's face; `angle` points from the head up the shaft; `len` the shaft length.
 */
export function brandingIron(g: G, x: number, y: number, len: number, angle: number, heat: number, s = 1): void {
  const ex = x + Math.cos(angle) * len, ey = y + Math.sin(angle) * len;
  g.lineStyle(5 * s, OBS.glass, 1); g.lineBetween(x, y, ex, ey);
  g.lineStyle(2 * s, OBS.sheen, 1); g.lineBetween(x, y, ex, ey);
  g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(x + Math.sin(angle) * 1.6 * s, y - Math.cos(angle) * 1.6 * s, ex + Math.sin(angle) * 1.6 * s, ey - Math.cos(angle) * 1.6 * s);
  // The twisted grip: diagonal wraps along the last fifth.
  for (let i = 0; i < 6; i++) {
    const f = 0.8 + i * 0.03;
    const gx = x + Math.cos(angle) * len * f, gy = y + Math.sin(angle) * len * f;
    g.lineStyle(1.2 * s, OBS.edge, 0.55);
    g.lineBetween(gx - Math.sin(angle) * 4 * s, gy + Math.cos(angle) * 4 * s, gx + Math.cos(angle) * 4 * s + Math.sin(angle) * 4 * s, gy + Math.sin(angle) * 4 * s - Math.cos(angle) * 4 * s);
  }
  g.fillStyle(OBS.facet, 1); g.fillCircle(ex, ey, 4.5 * s);
  g.lineStyle(1.5 * s, OBS.edge, 0.7); g.strokeCircle(ex, ey, 4.5 * s);
  // Collar.
  const cx = x + Math.cos(angle) * 12 * s, cy = y + Math.sin(angle) * 12 * s;
  g.fillStyle(OBS.facet, 1); g.fillCircle(cx, cy, 5 * s);
  if (heat > 0.05) glow(g, x, y, 14 * s, heatColor(heat), 0.05 + heat * 0.06, 3);
  brandFace(g, x, y, 9 * s, heat, 0.85);
}

/**
 * A crucible used as an inkstand: a squat black-glass pot with an ember-skinned melt inside and
 * a sheaf of branding irons standing in it handle-up, like quills. `x, y` its foot.
 */
export function ironRack(g: G, x: number, y: number, s: number, rng: () => number, heat = 0.35): void {
  shadow(g, x, y + 4 * s, 110 * s, 26 * s, 0.4);
  // The irons first (behind the pot's front lip), fanned like quills.
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.16 + (rng() - 0.5) * 0.06;
    const len = (120 + rng() * 40) * s;
    const bx = x + (i - (n - 1) / 2) * 7 * s, by = y - 56 * s;
    const tx = bx + Math.cos(a) * len, ty = by + Math.sin(a) * len;
    g.lineStyle(4.4 * s, OBS.glass, 1); g.lineBetween(bx, by, tx, ty);
    g.lineStyle(1.6 * s, OBS.sheen, 1); g.lineBetween(bx, by, tx, ty);
    g.lineStyle(1, OBS.edge, 0.45); g.lineBetween(bx + 1.5 * s, by, tx + 1.5 * s, ty);
    // A grip ring and a pale tip, the "feather" of the quill.
    g.fillStyle(OBS.facet, 1); g.fillCircle(tx, ty, 4 * s);
    g.lineStyle(1.2 * s, OBS.edge, 0.7); g.strokeCircle(tx, ty, 4 * s);
    g.lineStyle(1.2 * s, OBS.edge, 0.4); g.strokeCircle(tx, ty, 6.5 * s);
  }
  // The pot: a fat bowl with a thick lip.
  g.fillStyle(OBS.glass, 1);
  g.fillPoints([P(x - 44 * s, y - 58 * s), P(x + 44 * s, y - 58 * s), P(x + 52 * s, y - 30 * s), P(x + 38 * s, y), P(x - 38 * s, y), P(x - 52 * s, y - 30 * s)], true);
  g.fillStyle(OBS.facet, 1);
  g.fillPoints([P(x + 6 * s, y - 58 * s), P(x + 44 * s, y - 58 * s), P(x + 52 * s, y - 30 * s), P(x + 38 * s, y), P(x + 14 * s, y)], true);
  g.fillStyle(OBS.sheen, 0.7); g.fillTriangle(x + 30 * s, y - 54 * s, x + 46 * s, y - 34 * s, x + 36 * s, y - 10 * s);
  g.lineStyle(1.2, OBS.edge, 0.55);
  g.strokePoints([P(x - 44 * s, y - 58 * s), P(x + 44 * s, y - 58 * s), P(x + 52 * s, y - 30 * s), P(x + 38 * s, y), P(x - 38 * s, y), P(x - 52 * s, y - 30 * s)], true);
  // The melt at the mouth: an ember skin with a crust, the irons standing in it.
  g.fillStyle(OBS.glass, 1); g.fillEllipse(x, y - 58 * s, 96 * s, 22 * s);
  g.fillStyle(heatColor(heat * 0.8), 0.85); g.fillEllipse(x, y - 57 * s, 84 * s, 16 * s);
  g.fillStyle(EMB.coal, 0.85);
  for (let i = 0; i < 6; i++) g.fillEllipse(x - 30 * s + rng() * 60 * s, y - 58 * s + (rng() - 0.5) * 8 * s, (8 + rng() * 10) * s, (3 + rng() * 2) * s);
  g.lineStyle(1.4, OBS.edge, 0.7); g.strokeEllipse(x, y - 58 * s, 96 * s, 22 * s);
  // A band of ember inlay round the belly — the bench's mark.
  emberSeam(g, [{ x: x - 49 * s, y: y - 34 * s }, { x: x - 20 * s, y: y - 30 * s }, { x: x + 20 * s, y: y - 30 * s }, { x: x + 49 * s, y: y - 34 * s }], 1.1 * s, 0.6);
}

/**
 * A lava-fall frozen mid-pour as black glass, ember light still trapped inside: a curtain
 * spilling off a wall-top, tongues of different lengths, each ending in a rounded drip, the
 * whole thing pooling in a fan on the floor. `x` centre, `y` the floor line, `h` the drop.
 * Returns the trapped-ember points (world space) so the painter can make them breathe.
 */
export function lavaFall(g: G, x: number, y: number, w: number, h: number, rng: () => number): Pt[] {
  const trapped: Pt[] = [];
  const top = y - h;
  // The lip it spills from: a ledge of dressed obsidian.
  slab(g, x, top + 18, w + 40, 26, rng, 1);
  // The fan pool on the floor.
  for (let i = 0; i < 5; i++) {
    g.fillStyle(i % 2 ? OBS.glass : OBS.facet, 1);
    g.fillEllipse(x + (rng() - 0.5) * w * 0.4, y - 4 + i * 2, w * (1.25 - i * 0.12), 30 - i * 3);
  }
  g.lineStyle(1, OBS.edge, 0.35); g.strokeEllipse(x, y - 2, w * 1.25, 30);
  // Tongues: sorted so the long ones are drawn first (behind).
  const n = Math.max(4, Math.round(w / 26));
  const tongues = Array.from({ length: n }, (_, i) => {
    const tx = x - w / 2 + (w * (i + 0.5)) / n + (rng() - 0.5) * 8;
    const len = h * (0.55 + rng() * 0.45);
    const tw = (w / n) * (0.9 + rng() * 0.5);
    return { tx, len, tw };
  }).sort((a, b) => b.len - a.len);
  for (const t of tongues) {
    const ty = top + 22;
    const end = Math.min(y - 6, ty + t.len);
    g.fillStyle(OBS.glass, 1); g.fillRect(t.tx - t.tw / 2, ty, t.tw, end - ty);
    g.fillCircle(t.tx, end, t.tw / 2);
    g.fillStyle(OBS.facet, 0.95); g.fillRect(t.tx, ty, t.tw / 2 - 1, end - ty);
    g.fillStyle(OBS.sheen, 0.6); g.fillRect(t.tx + t.tw * 0.18, ty, Math.max(1.5, t.tw * 0.12), (end - ty) * 0.85);
    g.lineStyle(1, OBS.edge, 0.55); g.lineBetween(t.tx + t.tw / 2, ty, t.tx + t.tw / 2, end);
    g.lineStyle(1, OBS.edge, 0.22); g.lineBetween(t.tx - t.tw / 2, ty, t.tx - t.tw / 2, end);
    g.lineStyle(1.2, OBS.edge, 0.5); g.beginPath(); g.arc(t.tx, end, t.tw / 2, 0, Math.PI, false); g.strokePath();
    // Ropy folds across the tongue — the pour wrinkled as it set.
    for (let k = ty + 14; k < end - 8; k += 12 + rng() * 10) {
      g.lineStyle(1, OBS.sheen, 0.5);
      g.beginPath(); g.arc(t.tx, k - t.tw * 0.4, t.tw * 0.5, Math.PI * 0.25, Math.PI * 0.75, false); g.strokePath();
    }
    // Ember vein down the tongue's heart, brighter low down where it was hottest.
    const vein: Pt[] = [];
    for (let k = 0; k <= 5; k++) vein.push({ x: t.tx + (rng() - 0.5) * t.tw * 0.35, y: ty + 10 + ((end - ty - 14) * k) / 5 });
    emberSeam(g, vein, 0.9, 0.35 + rng() * 0.3);
    // The drip at the end, glassy.
    g.fillStyle(0xffffff, 0.35); g.fillCircle(t.tx + t.tw * 0.15, end - t.tw * 0.1, Math.max(1, t.tw * 0.12));
    const nT = 1 + Math.floor(rng() * 3);
    for (let k = 0; k < nT; k++) trapped.push({ x: t.tx + (rng() - 0.5) * t.tw * 0.5, y: ty + 20 + rng() * (end - ty - 30) });
  }
  return trapped;
}

export type Emblem = 'flame' | 'volcano' | 'gauge' | 'keg' | 'corona' | 'seal';

/** A seat's emblem, inlaid in ember light: one small drawing per element. */
export function emblem(g: G, kind: Emblem, x: number, y: number, r: number, color: number, a = 1): void {
  g.lineStyle(Math.max(1, r * 0.14), color, a);
  g.fillStyle(color, a);
  switch (kind) {
    case 'flame':
      g.fillTriangle(x - r * 0.55, y + r * 0.6, x + r * 0.55, y + r * 0.6, x + r * 0.1, y - r);
      g.fillCircle(x, y + r * 0.35, r * 0.55);
      g.fillStyle(OBS.glass, a); g.fillTriangle(x - r * 0.2, y + r * 0.6, x + r * 0.25, y + r * 0.6, x + r * 0.05, y - r * 0.1);
      break;
    case 'volcano':
      g.fillTriangle(x - r, y + r * 0.7, x + r, y + r * 0.7, x, y - r * 0.4);
      g.fillStyle(OBS.glass, a); g.fillTriangle(x - r * 0.25, y - r * 0.1, x + r * 0.25, y - r * 0.1, x, y - r * 0.4);
      g.fillStyle(color, a); g.fillCircle(x - r * 0.3, y - r * 0.8, r * 0.18); g.fillCircle(x + r * 0.15, y - r, r * 0.22);
      break;
    case 'gauge':
      g.strokeCircle(x, y, r * 0.8);
      g.beginPath(); g.arc(x, y, r * 0.55, Math.PI * 0.8, Math.PI * 2.2, false); g.strokePath();
      g.lineBetween(x, y, x + r * 0.62, y - r * 0.3);
      g.fillCircle(x, y, r * 0.16);
      break;
    case 'keg':
      g.strokeEllipse(x, y, r * 1.3, r * 1.8);
      g.lineBetween(x - r * 0.62, y - r * 0.4, x + r * 0.62, y - r * 0.4);
      g.lineBetween(x - r * 0.62, y + r * 0.4, x + r * 0.62, y + r * 0.4);
      g.lineBetween(x + r * 0.2, y - r * 0.9, x + r * 0.5, y - r * 1.3);
      g.fillCircle(x + r * 0.55, y - r * 1.35, r * 0.18);
      break;
    case 'corona':
      g.fillCircle(x, y, r * 0.42);
      for (let i = 0; i < 10; i++) {
        const an = (i / 10) * Math.PI * 2;
        g.lineBetween(x + Math.cos(an) * r * 0.58, y + Math.sin(an) * r * 0.58, x + Math.cos(an) * r * (i % 2 ? 0.8 : 1), y + Math.sin(an) * r * (i % 2 ? 0.8 : 1));
      }
      break;
    case 'seal':
      for (let i = 0; i < 9; i++) {
        const an = (i / 9) * Math.PI * 2;
        g.fillCircle(x + Math.cos(an) * r * 0.72, y + Math.sin(an) * r * 0.72, r * 0.3);
      }
      g.fillCircle(x, y, r * 0.75);
      brandSigil(g, x, y, r * 0.38, OBS.glass, a);
      break;
  }
}

/**
 * A councilor's seat: a tall obsidian chair on a stepped plinth, the back three shards with an
 * ember emblem inlaid, the seat facing the aisle. `x, y` the plinth's base centre; `lit` 0–1 how
 * much ember is still in the inlay (a seat that has been emptied goes cold).
 */
export function councilSeat(g: G, x: number, y: number, kind: Emblem, color: number, rng: () => number, litK = 1): void {
  shadow(g, x, y + 4, 170, 34, 0.45);
  // Two steps of plinth.
  slab(g, x, y, 150, 22, rng, 1);
  slab(g, x, y - 22, 120, 18);
  // The back: a tall middle shard and two shoulders.
  shard(g, x - 30, y - 64, 36, 120, -8, 0.15);
  shard(g, x + 30, y - 64, 36, 126, 8, 0.15);
  shard(g, x, y - 64, 50, 186, 0, 0.3);
  // Arms and the seat itself.
  slab(g, x - 40, y - 40, 22, 46);
  slab(g, x + 40, y - 40, 22, 46);
  slab(g, x, y - 40, 62, 26);
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 30, y - 104, 60, 40);
  g.fillStyle(OBS.facet, 0.8); g.fillTriangle(x - 30, y - 104, x + 4, y - 104, x - 30, y - 70);
  g.lineStyle(1.1, OBS.edge, 0.5); g.strokeRect(x - 30, y - 104, 60, 40);
  // The inlay: a ring of ember round the emblem, set in the back above the head.
  const ey = y - 150;
  const c = mixC(dim(color, 0.75), color, litK);
  if (litK > 0.05) glow(g, x, ey, 24, color, 0.05 * litK, 3);
  g.fillStyle(OBS.glass, 1); g.fillCircle(x, ey, 17);
  g.lineStyle(1.6, c, 0.85); g.strokeCircle(x, ey, 15);
  g.lineStyle(1, OBS.edge, 0.6); g.strokeCircle(x, ey, 17.5);
  emblem(g, kind, x, ey, 9, c, 0.95);
  // Ember lines along the plinth's riser, like a cooling pour under the glass.
  emberSeam(g, [{ x: x - 68, y: y - 10 }, { x: x - 30, y: y - 8 }, { x: x + 10, y: y - 11 }, { x: x + 66, y: y - 9 }], 1, 0.35 + 0.4 * litK);
}

/**
 * THE FIRST BRAND — the great seal-iron that stamped the law, still faintly red. A gantry of two
 * black-glass pylons and a beam; the iron hangs from it on four chains, its shaft as thick as a
 * mast, its seal-face the size of a cartwheel held a man's height over the seal-block that took
 * every impression. `x, y` the foot of the block; `s` scale (1 ≈ 360 px wide, 420 tall).
 */
export function firstBrand(g: G, x: number, y: number, s: number, heat: number, rng: () => number): void {
  shadow(g, x, y + 8 * s, 420 * s, 70 * s, 0.5);
  // The gantry pylons.
  for (const d of [-1, 1]) {
    const px = x + d * 168 * s;
    slab(g, px, y, 70 * s, 36 * s, rng, 1);
    shard(g, px, y - 34 * s, 54 * s, 400 * s, -d * 10 * s, 0.25);
    shard(g, px + d * 20 * s, y - 34 * s, 30 * s, 250 * s, d * 6 * s, 0.1);
  }
  // The beam across the top.
  const by = y - 360 * s;
  g.fillStyle(OBS.glass, 1);
  g.fillPoints([P(x - 210 * s, by - 18 * s), P(x + 210 * s, by - 18 * s), P(x + 196 * s, by + 18 * s), P(x - 196 * s, by + 18 * s)], true);
  g.fillStyle(OBS.sheen, 1); g.fillRect(x - 206 * s, by - 18 * s, 412 * s, 6 * s);
  g.lineStyle(1.2, OBS.edge, 0.6); g.lineBetween(x - 210 * s, by - 12 * s, x + 210 * s, by - 12 * s);
  seam(g, [{ x: x - 120 * s, y: by - 6 * s }, { x: x - 70 * s, y: by + 4 * s }, { x: x - 20 * s, y: by - 2 * s }], 1.1, 0.7);
  // The seal-block below: a stepped dais with the impression on its top face.
  slab(g, x, y, 300 * s, 30 * s, rng, 2);
  slab(g, x, y - 30 * s, 230 * s, 34 * s, rng, 1);
  const fy = y - 64 * s;
  g.fillStyle(OBS.sheen, 1); g.fillEllipse(x, fy, 200 * s, 44 * s);
  g.fillStyle(OBS.glass, 1); g.fillEllipse(x, fy + 2 * s, 180 * s, 36 * s);
  brandFace(g, x, fy + 2 * s, 80 * s, heat * 0.55, 0.2);
  // Four chains from the beam to the iron's collar.
  const hy = y - 150 * s;
  for (const cx of [-120, -46, 46, 120]) {
    const tx = x + cx * s, bx = x + cx * 0.32 * s;
    const ty = by + 18 * s, cy = hy - 120 * s;
    const n = 12;
    for (let i = 0; i < n; i++) {
      const f = i / n;
      const lx = tx + (bx - tx) * f, ly = ty + (cy - ty) * f;
      g.lineStyle(2 * s, OBS.edge, 0.55);
      if (i % 2) g.strokeEllipse(lx, ly, 5 * s, 9 * s);
      else g.strokeEllipse(lx, ly, 8 * s, 4 * s);
    }
  }
  // The shaft: a column of black glass, banded.
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 22 * s, hy - 210 * s, 44 * s, 200 * s);
  g.fillStyle(OBS.facet, 1); g.fillRect(x + 2 * s, hy - 210 * s, 20 * s, 200 * s);
  g.fillStyle(OBS.sheen, 0.7); g.fillRect(x + 8 * s, hy - 210 * s, 5 * s, 200 * s);
  for (let i = 0; i < 4; i++) {
    const ry = hy - 190 * s + i * 50 * s;
    slab(g, x, ry + 10 * s, 58 * s, 12 * s);
  }
  // The collar where the chains meet, and the great head below it.
  slab(g, x, hy - 120 * s + 14 * s, 96 * s, 22 * s);
  const headTop = hy - 30 * s;
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 96 * s, headTop, 192 * s, 44 * s);
  g.fillStyle(OBS.facet, 1); g.fillRect(x + 10 * s, headTop, 86 * s, 44 * s);
  g.fillStyle(OBS.sheen, 1); g.fillEllipse(x, headTop, 192 * s, 34 * s);
  g.fillStyle(OBS.glass, 1); g.fillEllipse(x, headTop + 2 * s, 150 * s, 22 * s);
  g.lineStyle(1.4, OBS.edge, 0.7); g.strokeEllipse(x, headTop, 192 * s, 34 * s);
  g.lineStyle(1, OBS.edge, 0.4); g.lineBetween(x - 96 * s, headTop, x - 96 * s, headTop + 44 * s); g.lineBetween(x + 96 * s, headTop, x + 96 * s, headTop + 44 * s);
  // The face underneath, seen just from its rim: still red.
  const c = heatColor(heat);
  g.fillStyle(c, 0.9); g.fillEllipse(x, headTop + 44 * s, 192 * s, 30 * s);
  g.fillStyle(lit(c, 0.25), 0.8); g.fillEllipse(x, headTop + 46 * s, 150 * s, 18 * s);
  // The sigil's raised strokes showing at the rim.
  for (let i = -3; i <= 3; i++) { g.fillStyle(dim(c, 0.4), 1); g.fillRect(x + i * 22 * s - 3 * s, headTop + 42 * s, 6 * s, 9 * s); }
  // Old impressions struck through the head's side: the long tally of brandings, scratched in.
  for (let i = 0; i < 26; i++) {
    const tx = x - 86 * s + i * 6.6 * s;
    g.lineStyle(1, OBS.edge, 0.35); g.lineBetween(tx, headTop + 8 * s, tx + (i % 5 === 4 ? -24 * s : 0), headTop + (i % 5 === 4 ? 30 * s : 28 * s));
  }
}

/**
 * The cold furnace at the head of the bench: a pointed arch of black-glass voussoirs round a
 * dark mouth, the stair up climbing into it. `x` centre, `y` threshold, `w` span, `h` height.
 */
export function deadFurnace(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  // The mouth: black, with a last ember far inside.
  g.fillStyle(0x050308, 1);
  g.fillPoints([P(x - w * 0.36, y), P(x - w * 0.36, y - h * 0.55), P(x, y - h * 0.92), P(x + w * 0.36, y - h * 0.55), P(x + w * 0.36, y)], true);
  glow(g, x, y - h * 0.5, w * 0.18, EMB.deep, 0.05, 4);
  // The voussoirs: a ring of wedges up each side to a keystone.
  const n = 9;
  for (const d of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const f0 = i / n, f1 = (i + 1) / n;
      const pt = (f: number, out: number) => {
        const yy = y - h * 0.55 * Math.min(1, f * 1.8) - (f > 0.55 ? h * 0.42 * ((f - 0.55) / 0.45) : 0);
        const xx = x + d * (w * 0.36 + out) * (f > 0.55 ? 1 - (f - 0.55) / 0.45 : 1);
        return P(xx, yy);
      };
      const tone = (i + (d > 0 ? 1 : 0)) % 2;
      g.fillStyle(tone ? OBS.facet : OBS.glass, 1);
      g.fillPoints([pt(f0, 0), pt(f0, w * 0.14), pt(f1, w * 0.14), pt(f1, 0)], true);
      g.lineStyle(1, OBS.edge, 0.45);
      g.strokePoints([pt(f0, 0), pt(f0, w * 0.14), pt(f1, w * 0.14), pt(f1, 0)], true);
    }
  }
  // Keystone, with the Brand cut into it.
  g.fillStyle(OBS.sheen, 1); g.fillTriangle(x - 22, y - h * 0.9, x + 22, y - h * 0.9, x, y - h * 1.04);
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 22, y - h * 0.9, 44, 30);
  g.lineStyle(1.2, OBS.edge, 0.7); g.strokeRect(x - 22, y - h * 0.9, 44, 30);
  brandSigil(g, x, y - h * 0.9 + 15, 8, EMB.deep, 0.9);
  // Soot licks up the arch from the mouth, and cracks with ember low down.
  for (let i = 0; i < 8; i++) {
    g.fillStyle(0x000000, 0.25); g.fillEllipse(x + (rng() - 0.5) * w * 0.5, y - h * (0.6 + rng() * 0.3), 20 + rng() * 30, 8 + rng() * 8);
  }
  emberSeam(g, [{ x: x - w * 0.42, y: y - 8 }, { x: x - w * 0.46, y: y - h * 0.2 }, { x: x - w * 0.43, y: y - h * 0.34 }], 1.1, 0.5);
  emberSeam(g, [{ x: x + w * 0.44, y: y - 10 }, { x: x + w * 0.41, y: y - h * 0.24 }], 1.1, 0.4);
}

/**
 * A floor of cooled flows: black glass in overlapping lobes, ropy folds where each lobe's skin
 * wrinkled as it set, and hairline ember cracks. Returns the cracks so a painter can pulse them.
 */
export function cooledFlows(g: G, x: number, y: number, w: number, h: number, rng: () => number, density = 1): Pt[][] {
  g.fillStyle(OBS.glass, 1); g.fillRect(x, y, w, h);
  const lobes = Math.round((w * h) / 9000 * density);
  for (let i = 0; i < lobes; i++) {
    const lx = x + rng() * w, ly = y + rng() * h;
    const rx = 40 + rng() * 90, ry = 18 + rng() * 34;
    g.fillStyle(rng() < 0.5 ? OBS.facet : mixC(OBS.glass, OBS.facet, 0.5), 0.55 + rng() * 0.3);
    g.fillEllipse(lx, ly, rx * 2, ry * 2);
    g.lineStyle(1, OBS.edge, 0.12 + rng() * 0.1);
    g.beginPath(); g.arc(lx, ly + ry * 0.3, rx * 0.95, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
    // Ropy folds: nested arcs along the lobe's front.
    for (let k = 0; k < 3; k++) {
      g.lineStyle(1, OBS.sheen, 0.28);
      g.beginPath(); g.arc(lx, ly - ry * 0.1 - k * 6, rx * (0.6 - k * 0.12), Math.PI * 0.15, Math.PI * 0.85, false); g.strokePath();
    }
    if (rng() < 0.3) { g.fillStyle(0xffffff, 0.08); g.fillEllipse(lx - rx * 0.3, ly - ry * 0.4, rx * 0.6, ry * 0.25); }
  }
  const cracks: Pt[][] = [];
  const nC = Math.round((w * h) / 26000 * density);
  for (let i = 0; i < nC; i++) {
    const a = { x: x + rng() * w, y: y + rng() * h };
    const ang = rng() * Math.PI * 2, len = 40 + rng() * 110;
    const pts: Pt[] = [a];
    for (let k = 1; k <= 5; k++) pts.push({ x: a.x + Math.cos(ang) * len * (k / 5) + (rng() - 0.5) * 14, y: a.y + Math.sin(ang) * len * (k / 5) * 0.6 + (rng() - 0.5) * 8 });
    emberSeam(g, pts, 0.8, 0.25 + rng() * 0.25);
    cracks.push(pts);
  }
  return cracks;
}
