import Phaser from 'phaser';
import type { Fighter } from '../../../../../entities/Fighter';
import type { Pt } from '../../../../IslesTypes';
import { mixC } from '../../../../art/IsleArt';

/**
 * The Heartwood Court's colours and the drawing bricks every part of it shares — the world
 * painter, the arena floor, the five gimmicks, Prince Birchbark and the charms all paint with
 * these, so the tree city reads as one place from the map to the fight.
 *
 * The look: the Heartwood is a birch the size of a mountain. Its outside is silver-white bark
 * barred with black lenticels and the almond "eyes" a birch grows where a branch has fallen —
 * so the whole city is watched, always, by the tree. Cut into it (a knot-hole door, a tap, a
 * storm-split) and the wood inside is dark heartwood red. Its sap runs gold and sets to amber.
 * Its leaves have turned: butter-yellow, rust and the last green. Around it is air — the lesser
 * forest far below, then mist, then sky. At the crown sits the Empress's Glasshouse, verdigris
 * iron and green glass, the only cold colour in the court.
 */
export const HW = {
  /** Birch bark. */
  bark: 0xece6d8,
  barkLit: 0xfaf7ef,
  barkMid: 0xd2c9b6,
  barkShade: 0xa69a84,
  barkDark: 0x6b6152,
  /** Lenticels and eye-scars — the black marks on birch. */
  mark: 0x1f1b18,
  markSoft: 0x3a332c,
  /** The wood inside. */
  heart: 0x7c2f1d,
  heartLit: 0xa9492a,
  heartDeep: 0x441709,
  sapwood: 0xd9b27a,
  /** Sap and amber. */
  sap: 0xe9b743,
  amber: 0xf0a024,
  amberLit: 0xffd76e,
  amberHot: 0xfff2c0,
  amberDeep: 0xa65a0b,
  /** Turned leaves. */
  leafGold: 0xe9bc33,
  leafButter: 0xf4d870,
  leafRust: 0xc9642b,
  leafRed: 0x9e3622,
  leafGreen: 0x8ea63c,
  leafDark: 0x55662a,
  /** Moss on the north faces, lichen on the old bark. */
  moss: 0x6f8c3a,
  mossDark: 0x3e5523,
  lichen: 0xa8b88a,
  /** The forest floor round the roots. */
  soil: 0x3d2f22,
  soilMid: 0x54412d,
  litter: 0x7a5530,
  /** The air round the tree: forest canopy far below, then mist, then sky. */
  canopy: 0x3f5a35,
  canopyLit: 0x6d8a45,
  canopyGold: 0x9a8a3a,
  mist: 0xc9d3cc,
  mistDeep: 0x8fa3a0,
  sky: 0xb3c8cc,
  /** Boardwalk planks (cut from fallen boughs — never from the tree itself). */
  plank: 0x9b7a50,
  plankLit: 0xbd9a6a,
  plankDark: 0x5a4329,
  rope: 0xc4a774,
  /** The sawmill's iron, and the Glasshouse's verdigris and glass. */
  iron: 0x2c2f31,
  ironLit: 0x585e60,
  rust: 0x8a4a28,
  verdigris: 0x4f9e86,
  verdigrisDark: 0x2a5a4c,
  glass: 0xbfe6dc,
  glassDeep: 0x6fa898,
  /** Pruning-paint: the white ring the tithe-markers daub round a short household's bough. */
  whitewash: 0xf6f3ea,
  /** Wasps (the heartrot). */
  wasp: 0xf2c21a,
  waspDark: 0x231a0c,
  rot: 0x3b2a1a,
  rotLit: 0x6d5a2a,
};

/** Seconds since the last call — gimmicks and scripts keep their own clock so dt units never matter. */
export function makeClock(): (time: number) => number {
  let last = -1;
  return (time: number): number => {
    if (last < 0) { last = time; return 0; }
    const dt = Math.min(0.05, Math.max(0, (time - last) / 1000));
    last = time;
    return dt;
  };
}

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

/** Shortest signed difference between two angles. */
export function angDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Distance from a point to the segment a–b. */
export function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const L = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / L, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

/** Distance from a point to a polyline. */
export function polyDist(px: number, py: number, pts: Pt[]): number {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) best = Math.min(best, segDist(px, py, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y));
  return best;
}

/** Sample points along a polyline every `step` px. */
export function samplePolyline(pts: Pt[], step: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.floor(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// ── Bricks ───────────────────────────────────────────────────────────

/**
 * A birch lenticel: the short black horizontal bar that rings birch bark. `w` is its length;
 * the bar is thicker in the middle and frays at the ends, as the real ones do.
 */
export function lenticel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, alpha = 1): void {
  g.fillStyle(HW.mark, 0.85 * alpha);
  g.fillEllipse(x, y, w, Math.max(1.4, w * 0.13));
  g.fillStyle(HW.markSoft, 0.5 * alpha);
  g.fillRect(x - w * 0.62, y - 0.5, w * 0.16, 1);
  g.fillRect(x + w * 0.46, y - 0.5, w * 0.16, 1);
}

/**
 * A birch "eye" — the almond scar left where a branch fell. Drawn black with a pale lid of
 * curled bark over it, and the hint of a pupil. `open` 0–1 widens it (the tree looking at you).
 */
export function birchEye(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, open = 0.5, alpha = 1): void {
  const h = w * (0.22 + open * 0.3);
  g.fillStyle(HW.mark, 0.9 * alpha);
  g.fillEllipse(x, y, w, h);
  // The brow: the bark folds down over a fallen-branch scar in two dark wings.
  g.lineStyle(Math.max(1.5, w * 0.06), HW.mark, 0.85 * alpha);
  g.lineBetween(x - w * 0.5, y - h * 0.2, x - w * 0.9, y - h * 1.1);
  g.lineBetween(x + w * 0.5, y - h * 0.2, x + w * 0.9, y - h * 1.1);
  g.fillStyle(HW.barkLit, 0.25 * alpha);
  g.fillEllipse(x, y - h * 0.32, w * 0.7, h * 0.25);
  if (open > 0.35) {
    g.fillStyle(HW.amber, (open - 0.35) * 1.4 * alpha);
    g.fillCircle(x, y, h * 0.22);
  }
}

/**
 * A run of birch bark over a rect: pale fill, shading toward the sides as a cylinder, rows of
 * lenticels, a few peeling curls. Used for trunk bands, posts and the arena floor.
 */
export function barkPatch(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, rng: () => number, density = 1): void {
  g.fillStyle(HW.bark, 1); g.fillRect(x, y, w, h);
  for (let i = 0; i < 18 * density * (w * h) / 1e5; i++) {
    g.fillStyle(rng() < 0.5 ? HW.barkMid : HW.barkLit, 0.25 + rng() * 0.3);
    g.fillEllipse(x + rng() * w, y + rng() * h, 40 + rng() * 120, 8 + rng() * 14);
  }
  for (let i = 0; i < 110 * density * (w * h) / 1e5; i++) {
    lenticel(g, x + rng() * w, y + rng() * h, 6 + rng() * 22, 0.4 + rng() * 0.6);
  }
  for (let i = 0; i < 10 * density * (w * h) / 1e5; i++) barkCurl(g, x + rng() * w, y + rng() * h, 6 + rng() * 10, rng);
}

/** A curl of peeling birch bark — a pale scroll with a tan underside. */
export function barkCurl(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, rng: () => number): void {
  const flip = rng() < 0.5 ? -1 : 1;
  g.fillStyle(HW.sapwood, 0.7); g.fillEllipse(x, y + s * 0.15, s * 1.6, s * 0.55);
  g.fillStyle(HW.barkLit, 1); g.fillEllipse(x - flip * s * 0.2, y, s * 1.5, s * 0.45);
  g.lineStyle(1, HW.barkShade, 0.8);
  g.beginPath(); g.arc(x + flip * s * 0.55, y, s * 0.28, 0, Math.PI * 2); g.strokePath();
}

/**
 * A single turned leaf: a birch leaf is a small toothed spearhead. `a` is its pointing angle,
 * `s` its length. Used for weather in gimmicks, piles, canopy edges and the charms.
 */
export function leaf(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, s: number, color: number, alpha = 1): void {
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const tipX = x + ux * s * 0.6, tipY = y + uy * s * 0.6;
  const baseX = x - ux * s * 0.4, baseY = y - uy * s * 0.4;
  const w = s * 0.34;
  g.fillStyle(mixC(color, 0x000000, 0.35), alpha);
  g.fillTriangle(tipX, tipY, baseX + nx * w * 1.1, baseY + ny * w * 1.1, baseX - nx * w * 1.1, baseY - ny * w * 1.1);
  g.fillStyle(color, alpha);
  g.fillTriangle(tipX, tipY, baseX + nx * w, baseY + ny * w, baseX - nx * w, baseY - ny * w);
  g.fillTriangle(baseX + nx * w, baseY + ny * w, baseX - nx * w, baseY - ny * w, baseX - ux * s * 0.12, baseY - uy * s * 0.12);
  g.lineStyle(1, mixC(color, 0x000000, 0.45), 0.7 * alpha);
  g.lineBetween(baseX - ux * s * 0.2, baseY - uy * s * 0.2, tipX, tipY);
}

/** A tear of sap: a gold drop with a hot highlight and an amber skin. */
export function sapDrop(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, alpha = 1): void {
  g.fillStyle(HW.amberDeep, alpha); g.fillCircle(x, y + r * 0.15, r * 1.05);
  g.fillTriangle(x - r * 0.8, y - r * 0.2, x + r * 0.8, y - r * 0.2, x, y - r * 1.8);
  g.fillStyle(HW.amber, alpha); g.fillCircle(x, y, r * 0.88);
  g.fillTriangle(x - r * 0.62, y - r * 0.25, x + r * 0.62, y - r * 0.25, x, y - r * 1.55);
  g.fillStyle(HW.amberHot, 0.85 * alpha); g.fillCircle(x - r * 0.3, y - r * 0.25, r * 0.28);
}

/**
 * A lump of set amber round something — an uneven glassy blob with facets of light and a
 * darker core. `k` 0–1 is how far it has set (thin glaze → solid block).
 */
export function amberBlock(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, k: number, t: number): void {
  const n = 9;
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3;
    const rr = r * (0.86 + ((i * 37) % 7) / 30);
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 1.1 - r * 0.15));
  }
  g.fillStyle(HW.amberDeep, 0.25 + k * 0.35); g.fillPoints(pts, true, true);
  g.fillStyle(HW.amber, 0.18 + k * 0.32);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 0.82, y + (p.y - y) * 0.82)), true, true);
  g.lineStyle(2, HW.amberLit, 0.4 + k * 0.5); g.strokePoints(pts, true, true);
  // Facet glints that crawl round the block.
  for (let i = 0; i < 3; i++) {
    const a = t * 0.8 + i * 2.1;
    g.fillStyle(HW.amberHot, (0.3 + 0.4 * k) * (0.5 + 0.5 * Math.sin(t * 3 + i)));
    g.fillTriangle(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5 - 4, x + Math.cos(a) * r * 0.5 + 5, y + Math.sin(a) * r * 0.5, x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5 + 4);
  }
}

/**
 * A wooden spile (the tap driven into a sugar tree) with its little tin bucket hanging below:
 * the court's commonest street furniture. `fill` 0–1 shows sap in the bucket.
 */
export function spile(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, fill: number): void {
  // The spout, driven into bark above.
  g.fillStyle(HW.heartDeep, 1); g.fillEllipse(x, y - s * 1.6, s * 0.5, s * 0.36);
  g.lineStyle(s * 0.22, HW.plankDark, 1); g.lineBetween(x, y - s * 1.6, x + s * 0.55, y - s * 1.45);
  g.lineStyle(s * 0.12, HW.plankLit, 1); g.lineBetween(x, y - s * 1.65, x + s * 0.5, y - s * 1.52);
  // The bucket.
  g.fillStyle(HW.ironLit, 1); g.fillRect(x + s * 0.18, y - s * 1.28, s * 0.84, s * 0.88);
  g.fillStyle(0x8a9094, 1); g.fillRect(x + s * 0.22, y - s * 1.28, s * 0.3, s * 0.88);
  g.lineStyle(1, HW.iron, 1); g.strokeRect(x + s * 0.18, y - s * 1.28, s * 0.84, s * 0.88);
  if (fill > 0) {
    g.fillStyle(HW.amber, 0.95); g.fillRect(x + s * 0.2, y - s * 1.26, s * 0.8, Math.max(1, s * 0.18));
  }
  g.lineStyle(1, HW.ironLit, 1);
  g.beginPath(); g.arc(x + s * 0.6, y - s * 1.28, s * 0.42, Math.PI, 0, false); g.strokePath();
}

/**
 * A sap lantern: a lump of glowing amber hung in a cage of bent birch twigs. `x,y` is the
 * hanging point; the glow is drawn by the caller (it flickers).
 */
export function sapLantern(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
  g.lineStyle(1.2, HW.rope, 0.9); g.lineBetween(x, y, x, y + s * 0.6);
  const cy = y + s * 1.3;
  g.fillStyle(HW.amberDeep, 1); g.fillEllipse(x, cy, s * 1.05, s * 1.3);
  g.fillStyle(HW.amber, 1); g.fillEllipse(x, cy, s * 0.82, s * 1.06);
  g.fillStyle(HW.amberHot, 0.9); g.fillEllipse(x - s * 0.15, cy - s * 0.2, s * 0.3, s * 0.4);
  g.lineStyle(1.4, HW.barkDark, 1);
  for (const k of [-1, -0.35, 0.35, 1]) {
    g.beginPath();
    g.moveTo(x, cy - s * 0.72);
    g.lineTo(x + k * s * 0.56, cy);
    g.lineTo(x, cy + s * 0.72);
    g.strokePath();
  }
  g.fillStyle(HW.barkDark, 1); g.fillCircle(x, cy - s * 0.72, s * 0.14); g.fillCircle(x, cy + s * 0.74, s * 0.12);
}

/** A splinter: a long thin pale shard with a dark heart side. Used for thrown splinters. */
export function splinter(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, len: number, alpha = 1): void {
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const w = Math.max(1.5, len * 0.12);
  g.fillStyle(HW.heart, alpha);
  g.fillTriangle(x + ux * len * 0.6, y + uy * len * 0.6, x - ux * len * 0.4 + nx * w, y - uy * len * 0.4 + ny * w, x - ux * len * 0.4, y - uy * len * 0.4);
  g.fillStyle(HW.barkLit, alpha);
  g.fillTriangle(x + ux * len * 0.6, y + uy * len * 0.6, x - ux * len * 0.4 - nx * w, y - uy * len * 0.4 - ny * w, x - ux * len * 0.4, y - uy * len * 0.4);
}

/** A termite seen from above: pale head, amber-brown body, a tick of mandibles. */
export function termite(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, s: number, alpha = 1): void {
  const ux = Math.cos(a), uy = Math.sin(a);
  g.fillStyle(0xc9a26a, alpha); g.fillEllipse(x - ux * s * 0.5, y - uy * s * 0.5, s * 1.1, s * 0.8);
  g.fillStyle(0xe6cfa0, alpha); g.fillCircle(x + ux * s * 0.35, y + uy * s * 0.35, s * 0.42);
  g.lineStyle(1, 0x3a2410, alpha);
  const mx = x + ux * s * 0.75, my = y + uy * s * 0.75;
  g.lineBetween(mx, my, mx + Math.cos(a + 0.5) * s * 0.4, my + Math.sin(a + 0.5) * s * 0.4);
  g.lineBetween(mx, my, mx + Math.cos(a - 0.5) * s * 0.4, my + Math.sin(a - 0.5) * s * 0.4);
}

/** A wasp seen from above: striped abdomen, two blurred wings. `t` beats the wings. */
export function wasp(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, s: number, t: number, alpha = 1): void {
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const beat = 0.6 + 0.4 * Math.sin(t * 60);
  g.fillStyle(0xffffff, 0.35 * alpha * beat);
  g.fillEllipse(x + nx * s * 0.6, y + ny * s * 0.6, s * 1.1, s * 0.5);
  g.fillEllipse(x - nx * s * 0.6, y - ny * s * 0.6, s * 1.1, s * 0.5);
  g.fillStyle(HW.waspDark, alpha); g.fillEllipse(x - ux * s * 0.45, y - uy * s * 0.45, s * 1.2, s * 0.8);
  g.fillStyle(HW.wasp, alpha);
  for (const k of [-0.2, 0.15]) g.fillEllipse(x - ux * s * (0.45 + k), y - uy * s * (0.45 + k), s * 0.26, s * 0.74);
  g.fillStyle(HW.waspDark, alpha); g.fillCircle(x + ux * s * 0.35, y + uy * s * 0.35, s * 0.32);
}

/** A woodpecker clinging to a trunk side-on: black-and-white back, red crown, chisel bill. */
export function woodpecker(g: Phaser.GameObjects.Graphics, x: number, y: number, dir: number, s: number, peck: number): void {
  const d = dir >= 0 ? 1 : -1;
  const hx = x + d * s * (0.55 + peck * 0.25), hy = y - s * 0.55;
  // Tail braced against the bark.
  g.fillStyle(HW.mark, 1); g.fillTriangle(x - d * s * 0.1, y + s * 0.3, x - d * s * 0.45, y + s * 1.05, x + d * s * 0.15, y + s * 0.95);
  g.fillStyle(HW.mark, 1); g.fillEllipse(x, y, s * 0.8, s * 1.15);
  g.fillStyle(0xf4f2ea, 1);
  g.fillEllipse(x + d * s * 0.12, y - s * 0.05, s * 0.3, s * 0.7);
  for (let i = 0; i < 3; i++) g.fillRect(x - d * s * 0.3 - s * 0.06, y - s * 0.2 + i * s * 0.22, s * 0.16, s * 0.08);
  g.fillStyle(HW.mark, 1); g.fillCircle(hx, hy, s * 0.32);
  g.fillStyle(0xd8262a, 1); g.fillCircle(hx - d * s * 0.05, hy - s * 0.18, s * 0.17);
  g.fillStyle(0xf4f2ea, 1); g.fillEllipse(hx, hy + s * 0.08, s * 0.32, s * 0.12);
  g.fillStyle(0x6a6050, 1); g.fillTriangle(hx + d * s * 0.25, hy - s * 0.06, hx + d * s * 0.25, hy + s * 0.08, hx + d * s * 0.72, hy + s * 0.02);
  g.fillStyle(0xffffff, 1); g.fillCircle(hx + d * s * 0.08, hy - s * 0.04, s * 0.06);
}
