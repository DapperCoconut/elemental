import Phaser from 'phaser';
import { type G, dim, lit, mixC } from '../../../art/IsleArt';
import { OBS, councilMask, crackPath, seam, shard, slab } from '../../../art/PinnacleArt';

/**
 * The Crownless Hall's own drawings: the sixty empty niches, the ten crown-moulds, the King seated
 * (for the cinematic) and the Ferryman at the door. Everything here is black glass first; colour
 * only comes in as a trace — an isle's tint left in the mould it was poured from, a bench's inlay
 * under the niche its councilor slept in — and warm light only where the star shows through.
 */

/** Pale dust: where a mask hung for a thousand years and no longer does. */
export const DUST = 0xb8b0d0;
/** The near-black inside a recess, darker than the glass itself. */
export const VOID = 0x040208;

const pt = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

// ── Crowns ───────────────────────────────────────────────────────────

/**
 * Height (0–1) of a crown's upper edge at `u` (0 = left, 1 = right), one shape per isle — each
 * crown cast in the shape of the cruelty it kept order with.
 */
export function crownTop(isle: string, u: number): number {
  const saw = (n: number): number => (u * n) % 1;
  switch (isle) {
    case 'water': { // the Undertow: crests that curl and break
      const f = saw(4);
      return f < 0.78 ? 0.3 + 0.62 * (f / 0.78) ** 2 : 0.3 + 0.62 * (1 - (f - 0.78) / 0.22);
    }
    case 'life': // the Pruning: thorns
      return 0.3 + 0.7 * Math.max(0, 1 - Math.abs(saw(7) - 0.5) * 3.6);
    case 'air': // the Breath-Tax: thin vanes, like an anemometer's
      return 0.28 + 0.72 * Math.max(0, Math.cos((saw(9) - 0.5) * Math.PI)) ** 14;
    case 'earth': // the Stone Tithe: battlements
      return saw(5) < 0.55 ? 0.82 : 0.42;
    case 'electricity': { // the Draw: a zigzag of bolts, every other one taller
      const f = saw(6), i = Math.floor(u * 6);
      return 0.36 + (i % 2 ? 0.62 : 0.4) * (1 - Math.abs(f - 0.5) * 2);
    }
    case 'slime': // the Mark: a low swollen rim (its drips hang below)
      return 0.38 + 0.12 * Math.sin(u * Math.PI * 6) ** 2;
    case 'fate': // the Lot: five spikes, each tipped with a die-pip (drawn by the caller)
      return 0.32 + 0.48 * Math.max(0, 1 - Math.abs(saw(5) - 0.5) * 3);
    case 'sound': { // the Part: organ pipes
      const heights = [0.5, 0.7, 0.88, 1, 0.88, 0.7, 0.5];
      const i = Math.min(6, Math.floor(u * 7));
      const f = saw(7);
      return f < 0.12 || f > 0.88 ? 0.34 : heights[i];
    }
    case 'light': { // the Endless Noon: a sunburst, tallest at noon
      const ray = Math.max(0, 1 - Math.abs(saw(11) - 0.5) * 2.6);
      return 0.3 + 0.7 * ray * (1 - Math.abs(u - 0.5) * 1.1);
    }
    default: // fire — the Brand: tongues of flame, uneven
      return 0.34 + 0.66 * Math.abs(Math.sin(u * Math.PI * 5)) ** 2.2 * (0.72 + 0.28 * Math.sin(u * 9 + 1));
  }
}

/** The crown's outline: a band along `y`, its top edge from `crownTop`. `x` centre, `y` base. */
export function crownPoints(isle: string, x: number, y: number, w: number, h: number, squash = 1): Phaser.Geom.Point[] {
  const pts: Phaser.Geom.Point[] = [pt(x - w / 2, y)];
  const n = 44;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    pts.push(pt(x - w / 2 + u * w, y - h * squash * crownTop(isle, u)));
  }
  pts.push(pt(x + w / 2, y));
  return pts;
}

/**
 * A crown-mould on its plinth — one of ten. A block of black glass split like a book: the back half
 * stands, the cavity of a crown sunk in its face; the front half lies open on the plinth with the
 * mirrored cavity foreshortened. The cavity still holds a trace of its isle's colour, as a crucible
 * keeps the colour of the last pour. Every mould is cracked through: its crown is broken. `x`
 * centre, `y` base of the plinth, `s` scale (1 ≈ 90 px wide, 130 tall). `shine` 0–1 lifts the
 * residue (a light passing over it).
 */
export function crownMould(g: G, x: number, y: number, s: number, isle: string, color: number, rng: () => number, shine = 0): void {
  g.fillStyle(0x000000, 0.4); g.fillEllipse(x, y + 4 * s, 110 * s, 22 * s);
  // The plinth: a stepped base, then a shaft.
  slab(g, x, y, 92 * s, 14 * s);
  slab(g, x, y - 14 * s, 76 * s, 38 * s, rng, 1);
  // The isle's mark inlaid in the shaft: a thin band of its colour, dull.
  g.fillStyle(dim(color, 0.45), 0.55); g.fillRect(x - 26 * s, y - 34 * s, 52 * s, 2.2 * s);
  g.fillStyle(color, 0.25 + shine * 0.4); g.fillCircle(x, y - 33 * s, 2.6 * s);
  const top = y - 52 * s;
  // The front half, lying open toward us: a flat slab seen from above, cavity squashed.
  g.fillStyle(OBS.facet, 1);
  g.fillPoints([pt(x - 40 * s, top), pt(x + 40 * s, top), pt(x + 44 * s, top + 12 * s), pt(x - 44 * s, top + 12 * s)], true);
  g.lineStyle(1, OBS.edge, 0.45);
  g.strokePoints([pt(x - 40 * s, top), pt(x + 40 * s, top), pt(x + 44 * s, top + 12 * s), pt(x - 44 * s, top + 12 * s)], true);
  g.fillStyle(VOID, 1);
  g.fillPoints(crownPoints(isle, x, top + 9 * s, 50 * s, 24 * s, 0.28), true);
  g.lineStyle(1, color, 0.22 + shine * 0.3);
  g.strokePoints(crownPoints(isle, x, top + 9 * s, 50 * s, 24 * s, 0.28), true);
  // The back half, standing: a tall slab, the cavity sunk in its face.
  const bw = 72 * s, bh = 70 * s;
  const bl = x - bw / 2, bt = top - bh;
  g.fillStyle(OBS.glass, 1); g.fillRect(bl, bt, bw, bh);
  g.fillStyle(OBS.facet, 0.85);
  g.fillPoints([pt(bl + bw * 0.55, bt), pt(bl + bw, bt), pt(bl + bw, bt + bh), pt(bl + bw * 0.78, bt + bh)], true);
  g.fillStyle(OBS.sheen, 1); g.fillRect(bl, bt, bw, 4 * s);
  g.lineStyle(1.2, OBS.edge, 0.55); g.strokeRect(bl, bt, bw, bh);
  // The pour-hole at the top, and the runnel down to the cavity.
  g.fillStyle(VOID, 1); g.fillEllipse(x, bt + 2 * s, 14 * s, 5 * s);
  g.fillStyle(dim(color, 0.3), 0.6); g.fillRect(x - 1.5 * s, bt + 4 * s, 3 * s, 14 * s);
  // The cavity: a crown-shaped hole, black, with its isle's colour clinging to the edge.
  const cy = bt + bh - 12 * s;
  const cw = 54 * s, ch = 40 * s;
  g.fillStyle(color, (0.08 + shine * 0.12));
  g.fillPoints(crownPoints(isle, x, cy + 3 * s, cw + 8 * s, ch + 6 * s), true);
  g.fillStyle(VOID, 1);
  g.fillPoints(crownPoints(isle, x, cy, cw, ch), true);
  g.lineStyle(1.6 * s, color, 0.35 + shine * 0.45);
  g.strokePoints(crownPoints(isle, x, cy, cw, ch), true);
  g.lineStyle(0.8 * s, lit(color, 0.5), 0.15 + shine * 0.5);
  g.strokePoints(crownPoints(isle, x, cy - 1.5 * s, cw - 4 * s, ch - 3 * s), true);
  // The band's inner rim, and what makes each crown its own.
  g.lineStyle(1 * s, color, 0.25 + shine * 0.3);
  g.lineBetween(x - cw / 2 + 3 * s, cy - ch * 0.22, x + cw / 2 - 3 * s, cy - ch * 0.22);
  if (isle === 'fate') {
    for (let i = 0; i < 5; i++) {
      const px = x - cw / 2 + ((i + 0.5) / 5) * cw;
      g.fillStyle(VOID, 1); g.fillCircle(px, cy - ch * 0.82, 4 * s);
      g.lineStyle(1, color, 0.4 + shine * 0.4); g.strokeCircle(px, cy - ch * 0.82, 4 * s);
    }
  } else if (isle === 'slime') {
    for (let i = 0; i < 4; i++) {
      const px = x - cw * 0.36 + i * cw * 0.24;
      g.fillStyle(color, 0.25 + shine * 0.3); g.fillEllipse(px, cy + 4 * s + (i % 2) * 3 * s, 3 * s, 7 * s);
    }
  } else if (isle === 'light') {
    g.fillStyle(color, 0.2 + shine * 0.4); g.fillCircle(x, cy - ch * 0.36, 5 * s);
  }
  // Broken: a crack through the cavity, and a chip gone from the corner.
  const r2 = Phaser.Math.Clamp(rng(), 0, 1);
  seam(g, crackPath({ x: x - cw * 0.3 + r2 * cw * 0.2, y: bt + 6 * s }, { x: x + cw * 0.18, y: top - 2 * s }, rng, 5 * s, 5), 1.1 * s, 0.85);
  g.fillStyle(OBS.glass, 1);
  g.fillTriangle(bl + bw, bt, bl + bw - 12 * s, bt, bl + bw, bt + 16 * s);
  g.fillStyle(0x000000, 0.9);
  g.fillTriangle(bl + bw + 1, bt - 1, bl + bw - 10 * s, bt - 1, bl + bw + 1, bt + 13 * s);
  g.lineStyle(1, OBS.edge, 0.5); g.lineBetween(bl + bw - 12 * s, bt, bl + bw, bt + 16 * s);
  // The chip lies on the plinth.
  g.fillStyle(OBS.sheen, 1); g.fillTriangle(x + 30 * s, top + 8 * s, x + 38 * s, top + 4 * s, x + 36 * s, top + 10 * s);
}

// ── Niches ───────────────────────────────────────────────────────────

/**
 * One of the sixty niches: a narrow obsidian stela on a plinth, pointed at the top, a recess cut
 * near its crown where a councilor's mask hung while they sat with the King. The mask is gone. What
 * is left: an iron hook, the pale ghost of a kite-shaped face in the dust, and under the plinth a
 * thin inlay in the colour of the bench that councilor sat on. `x` centre, `y` base, `h` height.
 */
export function niche(g: G, x: number, y: number, h: number, bench: number, rng: () => number): void {
  const w = 40;
  g.fillStyle(0x000000, 0.4); g.fillEllipse(x, y + 3, w * 1.5, 12);
  slab(g, x, y, w + 10, 14);
  g.fillStyle(bench, 0.5); g.fillRect(x - w * 0.4, y - 6, w * 0.8, 1.6);
  const top = y - h;
  const bodyB = y - 14;
  // The shaft: dark plane, a lit right facet, pale edges.
  g.fillStyle(OBS.glass, 1); g.fillRect(x - w / 2, top + 16, w, bodyB - top - 16);
  g.fillStyle(OBS.facet, 0.9); g.fillRect(x + w * 0.12, top + 16, w * 0.38, bodyB - top - 16);
  g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(x + w * 0.12, top + 16, x + w * 0.12, bodyB);
  g.lineStyle(1, OBS.edge, 0.25); g.strokeRect(x - w / 2, top + 16, w, bodyB - top - 16);
  // The pointed cap.
  g.fillStyle(OBS.facet, 1); g.fillTriangle(x - w / 2 - 2, top + 17, x + w / 2 + 2, top + 17, x + 2, top - 4);
  g.fillStyle(OBS.sheen, 1); g.fillTriangle(x + 2, top - 4, x + w / 2 + 2, top + 17, x + w * 0.12, top + 17);
  g.lineStyle(1.2, OBS.edge, 0.7); g.lineBetween(x + 2, top - 4, x + w / 2 + 2, top + 17);
  // The recess: an arch of nothing.
  const ry = top + 20, rh = Math.min(38, h * 0.42);
  g.fillStyle(VOID, 1);
  g.fillRect(x - 12, ry + 8, 24, rh - 8);
  g.fillCircle(x, ry + 9, 12);
  g.lineStyle(1, OBS.edge, 0.35);
  g.beginPath(); g.arc(x, ry + 9, 12, Math.PI, 0); g.strokePath();
  g.lineBetween(x - 12, ry + 9, x - 12, ry + rh); g.lineBetween(x + 12, ry + 9, x + 12, ry + rh);
  g.fillStyle(OBS.sheen, 0.7); g.fillRect(x - 12, ry + rh - 2, 24, 2);
  // The ghost of the mask in the dust, and the hook it hung from.
  const my = ry + rh * 0.55, ms = rh * 0.34;
  g.lineStyle(1, DUST, 0.16);
  g.strokePoints([
    pt(x - ms * 0.34, my - ms), pt(x, my - ms * 1.06), pt(x + ms * 0.34, my - ms),
    pt(x + ms * 0.62, my - ms * 0.28), pt(x + ms * 0.38, my + ms * 0.5), pt(x, my + ms),
    pt(x - ms * 0.38, my + ms * 0.5), pt(x - ms * 0.62, my - ms * 0.28),
  ], true);
  g.lineStyle(1.4, 0x6a6478, 0.9); g.lineBetween(x, ry + 2, x, ry + 7);
  g.beginPath(); g.arc(x + 1.5, ry + 7, 1.5, 0, Math.PI); g.strokePath();
  if (rng() < 0.3) seam(g, crackPath({ x: x - w * 0.3, y: top + 20 + rh + 6 }, { x: x + w * 0.2, y: bodyB - 4 }, rng, 4, 4), 0.9, 0.6);
}

// ── The King and the Ferryman (cinema only) ──────────────────────────

/**
 * The King seated, as the cinematic shows him before the fight: a great round body of black glass
 * under a mantle of shards, a crown of shards, gauntlets on the throne's arms, and for a face the
 * mask the councilors' masks were broken from. `x, y` the body's centre; `s` scale (1 ≈ the arena
 * rig: 40 px body). `wake` 0–1 lights the slit; `look` −1…1 turns the face; a hairline of gold
 * across his chest is the only hint of what is inside.
 */
export function kingSeated(g: G, x: number, y: number, s: number, o: { t: number; wake: number; look?: number; alpha?: number }): void {
  const a = o.alpha ?? 1;
  const look = o.look ?? 0;
  // The mantle: a cascade of shards from the shoulders to the seat.
  const mantle = [pt(x - 30 * s, y - 20 * s), pt(x + 30 * s, y - 20 * s), pt(x + 66 * s, y + 70 * s), pt(x + 40 * s, y + 80 * s),
    pt(x, y + 72 * s), pt(x - 40 * s, y + 80 * s), pt(x - 66 * s, y + 70 * s)];
  g.fillStyle(OBS.glass, a); g.fillPoints(mantle, true);
  g.fillStyle(OBS.facet, 0.9 * a);
  g.fillPoints([pt(x + 6 * s, y - 20 * s), pt(x + 30 * s, y - 20 * s), pt(x + 66 * s, y + 70 * s), pt(x + 40 * s, y + 80 * s), pt(x + 14 * s, y + 40 * s)], true);
  g.lineStyle(Math.max(1, 1.2 * s), OBS.edge, 0.55 * a); g.strokePoints(mantle, true);
  for (let i = 0; i < 6; i++) {
    const f = (i + 0.5) / 6;
    const bx = x - 52 * s + f * 104 * s;
    g.lineStyle(Math.max(1, 0.8 * s), OBS.edge, 0.22 * a);
    g.lineBetween(x + (bx - x) * 0.3, y - 10 * s, bx, y + 74 * s);
  }
  // The body.
  g.fillStyle(OBS.glass, a); g.fillCircle(x, y, 40 * s);
  g.fillStyle(OBS.facet, a);
  g.fillPoints([pt(x, y - 40 * s), pt(x + 28 * s, y - 28 * s), pt(x + 40 * s, y), pt(x + 28 * s, y + 28 * s), pt(x + 4 * s, y + 12 * s)], true);
  g.fillStyle(OBS.sheen, 0.7 * a);
  g.fillTriangle(x + 8 * s, y - 36 * s, x + 30 * s, y - 24 * s, x + 14 * s, y - 14 * s);
  g.lineStyle(Math.max(1, 1.3 * s), OBS.edge, 0.6 * a); g.strokeCircle(x, y, 40 * s);
  // The hairline of gold across the chest.
  seam(g, [{ x: x - 14 * s, y: y + 14 * s }, { x: x - 4 * s, y: y + 20 * s }, { x: x + 3 * s, y: y + 16 * s }, { x: x + 12 * s, y: y + 26 * s }],
    Math.max(1, 0.8 * s), (0.25 + 0.5 * o.wake) * a, 0.3 * Math.sin(o.t * 1.3) ** 2, OBS.star);
  // The crown: five shards, the middle one tallest.
  const crown: [number, number, number, number][] = [[-22, 12, 26, -6], [22, 12, 28, 6], [-11, 14, 38, -3], [11, 14, 40, 3], [0, 16, 52, 0]];
  for (const [dx, w, h, lean] of crown) shard(g, x + dx * s + look * 2 * s, y - 30 * s + Math.abs(dx) * 0.25 * s, w * s, h * s, lean * s, 0.3);
  // The face.
  const slit = mixC(OBS.facet, OBS.seamLit, o.wake);
  councilMask(g, x + look * 7 * s, y - 2 * s, 22 * s, { slit, glow: o.wake * 1.4, alpha: a });
  // Gauntlets on the throne's arms.
  for (const side of [-1, 1]) {
    const lift = side > 0 ? Math.max(0, Math.sin(o.t * 2.1)) * 3 * s * o.wake : 0;
    const hx = x + side * 60 * s, hy = y + 34 * s - lift;
    g.fillStyle(OBS.glass, a); g.fillCircle(hx, hy, 14 * s);
    g.fillStyle(OBS.facet, a); g.fillCircle(hx + 2 * s, hy - 2 * s, 11 * s);
    g.lineStyle(Math.max(1, 0.9 * s), OBS.edge, 0.6 * a);
    for (let k = -1; k <= 1; k++) g.lineBetween(hx - 9 * s, hy + k * 4 * s, hx + 9 * s, hy + k * 4 * s + 1);
    g.strokeCircle(hx, hy, 14 * s);
  }
}

/**
 * The Ferryman, as he stands at the door he will not go through: a long oilskin to the floor, the
 * hood up, two pale points of eye, a punt-pole taller than him and a cold lantern hung from it.
 * `x, y` his feet; `s` scale (1 ≈ 90 px tall).
 */
export function ferryman(g: G, x: number, y: number, s: number, t: number, alpha = 1): void {
  const a = alpha;
  const coat = 0x23302f;
  g.fillStyle(0x000000, 0.35 * a); g.fillEllipse(x, y + 2 * s, 44 * s, 10 * s);
  // The pole, and the lantern swinging a little from its crook.
  g.lineStyle(Math.max(1, 3 * s), 0x3a2e24, a); g.lineBetween(x + 22 * s, y + 2 * s, x + 30 * s, y - 118 * s);
  g.lineStyle(Math.max(1, 1.5 * s), 0x3a2e24, a); g.lineBetween(x + 30 * s, y - 118 * s, x + 40 * s, y - 112 * s);
  const sw = Math.sin(t * 1.6) * 3 * s;
  const lx = x + 40 * s + sw, ly = y - 98 * s;
  g.lineStyle(1, 0x5a5048, a); g.lineBetween(x + 40 * s, y - 112 * s, lx, ly - 8 * s);
  g.fillStyle(0xcfe4ff, 0.12 * a); g.fillCircle(lx, ly, 22 * s);
  g.fillStyle(0x2a2420, a); g.fillRect(lx - 5 * s, ly - 8 * s, 10 * s, 15 * s);
  g.fillStyle(0xdff0ff, 0.9 * a); g.fillRect(lx - 3 * s, ly - 6 * s, 6 * s, 10 * s);
  // The coat: a long tapering shape, its hem frayed.
  g.fillStyle(dim(coat, 0.3), a);
  g.fillPoints([pt(x - 10 * s, y - 70 * s), pt(x + 10 * s, y - 70 * s), pt(x + 20 * s, y), pt(x - 20 * s, y)], true);
  g.fillStyle(coat, a);
  g.fillPoints([pt(x - 2 * s, y - 70 * s), pt(x + 10 * s, y - 70 * s), pt(x + 20 * s, y), pt(x + 2 * s, y)], true);
  g.lineStyle(1, lit(coat, 0.3), 0.5 * a); g.lineBetween(x + 10 * s, y - 70 * s, x + 20 * s, y);
  for (let i = 0; i < 5; i++) { g.fillStyle(dim(coat, 0.3), a); g.fillTriangle(x - 20 * s + i * 8 * s, y, x - 14 * s + i * 8 * s, y, x - 17 * s + i * 8 * s, y + 4 * s); }
  // The hand on the pole.
  g.fillStyle(0x8a7a6a, a); g.fillCircle(x + 24 * s, y - 52 * s, 4 * s);
  // The hood: a peak, the face a hole in it.
  g.fillStyle(dim(coat, 0.2), a);
  g.fillPoints([pt(x - 14 * s, y - 66 * s), pt(x + 14 * s, y - 66 * s), pt(x + 12 * s, y - 86 * s), pt(x - 4 * s, y - 94 * s), pt(x - 14 * s, y - 84 * s)], true);
  g.fillStyle(0x07080a, a); g.fillEllipse(x + 2 * s, y - 78 * s, 16 * s, 16 * s);
  g.fillStyle(0xd8e8f0, 0.85 * a); g.fillCircle(x - 1 * s, y - 79 * s, 1.3 * s); g.fillCircle(x + 5 * s, y - 79 * s, 1.3 * s);
}
