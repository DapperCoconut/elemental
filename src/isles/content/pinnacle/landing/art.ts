import type Phaser from 'phaser';
import { OBS, crackPath, dim, lit, mixC, seam, shard, slab } from '../../../art/PinnacleArt';
import { shadow } from '../../../art/IsleArt';

/**
 * Glasswater Landing's drawings: the Muster's ten pitches (each one its isle, carried across the sea
 * and set down on black glass), the camp's kitchen and stores, the wrecks of older challengers'
 * boats, the Muster's own beached fleet, and the shard-walls of the spire's foot.
 *
 * Every pitch is drawn at `x` = its centre and `y` = its base line, in world space, once (its piece
 * is baked); whatever moves on it — bees, the moth, the magpie, a flame — is drawn per frame by the
 * area's `animate` from the `*_AT` anchors exported here. The rule of the place holds even here: the
 * ground and the cliffs are black glass with violet seams; the colour on the beach is all the
 * Muster's, brought in boats.
 */

export type G = Phaser.GameObjects.Graphics;
type P = { x: number; y: number };

/** The ten isles' colours, in Muster order (fire … light). */
export const ISLE_COLOR = {
  fire: 0xff6a2a, water: 0x3aa0ff, life: 0x5ad06a, air: 0xbfe8ff, earth: 0xc89a5a,
  electricity: 0xffe14a, slime: 0x9be04a, fate: 0xd9a8ff, sound: 0xff8ac8, light: 0xfff2b0,
} as const;

/** Driftwood and camp timber — the only brown on the beach, and all of it brought. */
export const WOOD = 0x6a4a32;
export const WOOD_DARK = 0x3a281a;
export const WOOD_LIT = 0x9a7452;
export const BRASS = 0xc9a44a;
export const BRASS_DARK = 0x7a5a24;
export const CANVAS = 0xc8b898;
export const CANVAS_DARK = 0x8a7a60;
export const IRON = 0x2a2a30;
export const EMBER = 0xff9a3a;

/** Fill a polygon from a list of points. */
export function poly(g: G, pts: [number, number][], color: number, a = 1): void {
  g.fillStyle(color, a);
  g.fillPoints(pts.map(([x, y]) => ({ x, y })), true);
}

/** A plank of driftwood between two points, grain and a lit top edge. */
function plank(g: G, x0: number, y0: number, x1: number, y1: number, w: number, color = WOOD): void {
  g.lineStyle(w + 1.5, dim(color, 0.45), 1); g.lineBetween(x0, y0 + 1, x1, y1 + 1);
  g.lineStyle(w, color, 1); g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(Math.max(1, w * 0.25), lit(color, 0.25), 0.8); g.lineBetween(x0, y0 - w * 0.3, x1, y1 - w * 0.3);
}

/** A crate: front, lit top, banding, an isle-colour stencil stripe. */
export function crateBox(g: G, x: number, y: number, s: number, stripe?: number): void {
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x - s / 2, y - s, s, s);
  g.fillStyle(WOOD, 1); g.fillRect(x - s / 2 + 1.5, y - s + 1.5, s - 3, s - 3);
  g.fillStyle(WOOD_LIT, 1); g.fillRect(x - s / 2, y - s - s * 0.22, s, s * 0.22);
  g.lineStyle(1, WOOD_DARK, 0.9);
  g.lineBetween(x - s / 2 + 2, y - s + 2, x + s / 2 - 2, y - 2); g.lineBetween(x + s / 2 - 2, y - s + 2, x - s / 2 + 2, y - 2);
  g.strokeRect(x - s / 2, y - s, s, s);
  if (stripe !== undefined) { g.fillStyle(stripe, 0.9); g.fillRect(x - s / 2 + 2, y - s * 0.62, s - 4, s * 0.14); }
}

/** A barrel standing up. */
export function cask(g: G, x: number, y: number, s: number, band = IRON): void {
  shadow(g, x, y, s * 1.5, s * 0.45, 0.3);
  g.fillStyle(WOOD_DARK, 1); g.fillRoundedRect(x - s * 0.6, y - s * 1.5, s * 1.2, s * 1.5, s * 0.25);
  g.fillStyle(WOOD, 1); g.fillRoundedRect(x - s * 0.55, y - s * 1.48, s * 1.0, s * 1.44, s * 0.22);
  g.fillStyle(WOOD_LIT, 0.5); g.fillRect(x - s * 0.35, y - s * 1.45, s * 0.18, s * 1.38);
  for (const f of [0.22, 0.75, 1.28]) { g.fillStyle(band, 1); g.fillRect(x - s * 0.6, y - s * f - 1.5, s * 1.2, 3); }
  g.fillStyle(WOOD_LIT, 1); g.fillEllipse(x, y - s * 1.5, s * 1.2, s * 0.35);
  g.lineStyle(1, WOOD_DARK, 1); g.strokeEllipse(x, y - s * 1.5, s * 1.2, s * 0.35);
}

// ── The spire's foot ─────────────────────────────────────────────────

/**
 * A run of the spire's foot: a wall of upthrust black-glass shards along the north cliff, from `x0`
 * to `x1` with its base on `y`. Tall in the middle of the run, a seam or two glowing in the cracks,
 * and broken shingle-glass heaped at the foot.
 */
export function cliffRun(g: G, x0: number, x1: number, y: number, rng: () => number, tall = 1): void {
  // Back rank: very tall, dark, mostly off the top of the world.
  for (let x = x0; x < x1; x += 46 + rng() * 30) {
    shard(g, x, y - 40 - rng() * 30, 70 + rng() * 50, (260 + rng() * 200) * tall, (rng() - 0.5) * 50, 0.05);
  }
  // Middle rank.
  for (let x = x0 + 20; x < x1; x += 38 + rng() * 26) {
    shard(g, x, y - 12 - rng() * 14, 48 + rng() * 40, (150 + rng() * 120) * tall, (rng() - 0.5) * 40, 0.2 + rng() * 0.2);
  }
  // Seams in the wall: violet, climbing.
  for (let i = 0; i < Math.ceil((x1 - x0) / 160); i++) {
    const sx = x0 + rng() * (x1 - x0);
    seam(g, crackPath({ x: sx, y: y - 6 }, { x: sx + (rng() - 0.5) * 60, y: y - 160 - rng() * 120 }, rng, 9, 6), 1.3, 0.7, rng() * 0.4);
  }
  // Front rank: short, bright-edged, leaning out over the shingle.
  for (let x = x0 + 8; x < x1; x += 22 + rng() * 22) {
    shard(g, x, y + 4, 20 + rng() * 22, 34 + rng() * 60, (rng() - 0.5) * 22, 0.35 + rng() * 0.3);
  }
  // Scree: broken glass at the foot, every chip with a pale edge.
  for (let i = 0; i < (x1 - x0) / 7; i++) {
    const px = x0 + rng() * (x1 - x0), py = y + 2 + rng() * 26;
    const s = 2 + rng() * 6;
    poly(g, [[px - s, py], [px + s * 0.2, py - s * 1.2], [px + s, py]], rng() > 0.5 ? OBS.facet : OBS.glass);
    g.lineStyle(1, OBS.edge, 0.4); g.lineBetween(px + s * 0.2, py - s * 1.2, px + s, py);
  }
}

/**
 * One of the two great shards that flank the First Stair. `side` -1 west / 1 east; they lean in
 * toward each other over the stair so the gap between them reads as a door. Five lamp-niches are cut
 * up the inner face (lit per frame by the area: one for every bench broken).
 */
export function stairPillar(g: G, x: number, y: number, side: -1 | 1, rng: () => number): void {
  shadow(g, x, y + 2, 110, 26, 0.5);
  shard(g, x + side * 30, y - 6, 70, 300, -side * 40, 0.1);
  shard(g, x, y, 96, 380, -side * 60, 0.3);
  shard(g, x - side * 26, y + 2, 40, 130, -side * 14, 0.45);
  // The lamp niches: dark cups cut into the inner face.
  for (const p of stairLamps(x, y, side)) {
    g.fillStyle(0x000000, 0.7); g.fillEllipse(p.x, p.y, 16, 20);
    g.lineStyle(1, OBS.edge, 0.55); g.strokeEllipse(p.x, p.y, 16, 20);
    g.fillStyle(OBS.sheen, 1); g.fillRect(p.x - 8, p.y + 9, 16, 3);
  }
  seam(g, crackPath({ x: x - side * 4, y: y - 10 }, { x: x - side * 30, y: y - 330 }, rng, 7, 8), 1.4, 0.85, 0.3);
}

/** Where a stair pillar's five lamp niches sit (bottom first). */
export function stairLamps(x: number, y: number, side: -1 | 1): P[] {
  const out: P[] = [];
  for (let i = 0; i < 5; i++) {
    const f = 0.14 + i * 0.15;
    out.push({ x: x - side * (6 + f * 50), y: y - 380 * f });
  }
  return out;
}

/**
 * The Tally Stone: a slab of black glass at the foot of the stair, scratched with tally marks by
 * every challenger who ever landed here — hundreds, in gates of five — and a clean space under the
 * last row. Nobody has ever scratched the mark on the other side, the one for coming back.
 */
export function tallyStone(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 120, 20, 0.45);
  slab(g, x, y, 96, 120, rng, 1);
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 40, y - 104, 80, 92);
  g.lineStyle(1, OBS.edge, 0.3); g.strokeRect(x - 40, y - 104, 80, 92);
  // Scratches: gates of five in rows, each a slightly different hand.
  for (let row = 0; row < 9; row++) {
    const ry = y - 98 + row * 9;
    for (let gate = 0; gate < 5; gate++) {
      if (row === 8 && gate > 1) break;
      const gx = x - 36 + gate * 15 + (rng() - 0.5) * 1.5;
      const slant = (rng() - 0.5) * 1.2;
      g.lineStyle(1, OBS.seamLit, 0.35 + rng() * 0.3);
      for (let k = 0; k < 4; k++) g.lineBetween(gx + k * 2.4, ry, gx + k * 2.4 + slant, ry + 6.5);
      g.lineBetween(gx - 1, ry + 5, gx + 9, ry + 1);
    }
  }
  // The other column, headed with an oar: empty.
  g.lineStyle(1, OBS.edge, 0.4); g.lineBetween(x + 1, y - 22, x + 36, y - 22);
  g.lineStyle(1.5, OBS.seamLit, 0.6); g.lineBetween(x + 8, y - 18, x + 30, y - 14);
  g.fillStyle(OBS.seamLit, 0.6); g.fillEllipse(x + 31, y - 14, 6, 3);
}

// ── Wrecks of the ones before ────────────────────────────────────────

/**
 * An old challenger's boat, half sunk in the shingle: a keel and a fan of ribs, some planking left at
 * the bow, and black glass grown up through the hull where it lay. `era` changes the build: 0 a
 * longship (high curled prow), 1 a galley (oar-ports, a stern castle), 2 a rowing boat (one oar left
 * in the rowlock).
 */
export function wreck(g: G, x: number, y: number, len: number, era: 0 | 1 | 2, rng: () => number, flip = false): void {
  const d = flip ? -1 : 1;
  shadow(g, x, y + 4, len * 1.1, len * 0.18, 0.45);
  // Sunk hull: a dark sand-dip with glass grown over its lip.
  g.fillStyle(0x060509, 0.9); g.fillEllipse(x, y, len, len * 0.24);
  // Keel.
  plank(g, x - (len / 2) * d, y - 2, x + (len / 2) * d, y - 4, 6, dim(WOOD, 0.35));
  // Ribs, rising out of the shingle, bleached at the tips.
  const ribs = era === 2 ? 5 : 9;
  for (let i = 0; i < ribs; i++) {
    const f = (i + 0.5) / ribs;
    const rx = x - len / 2 + f * len;
    const rh = len * (era === 2 ? 0.16 : 0.26) * (0.55 + Math.sin(f * Math.PI) * 0.6);
    const broken = rng() < 0.3;
    const top = broken ? rh * (0.4 + rng() * 0.3) : rh;
    for (const s of [-1, 1]) {
      g.lineStyle(4, dim(WOOD, 0.3), 1);
      g.beginPath();
      g.moveTo(rx, y - 2);
      g.lineTo(rx + s * len * 0.05, y - top * 0.6);
      g.lineTo(rx + s * len * 0.035, y - top);
      g.strokePath();
      g.lineStyle(1.5, 0xb8a888, 0.6); g.lineBetween(rx + s * len * 0.045, y - top * 0.75, rx + s * len * 0.035, y - top);
    }
  }
  // Planking left at the bow end.
  const bow = x + (len / 2) * d;
  for (let k = 0; k < 4; k++) plank(g, bow - d * len * 0.28, y - 6 - k * 7, bow - d * 6, y - 10 - k * 8, 4, dim(WOOD, 0.2 + k * 0.05));
  if (era === 0) {
    // The longship's curled prow, its beast-head worn to a knob.
    g.lineStyle(7, dim(WOOD, 0.3), 1);
    g.beginPath(); g.arc(bow + d * 6, y - len * 0.28, len * 0.16, d > 0 ? Math.PI * 0.5 : Math.PI * 0.5, d > 0 ? Math.PI * 1.6 : -Math.PI * 0.6, d < 0); g.strokePath();
    g.fillStyle(dim(WOOD, 0.2), 1); g.fillCircle(bow + d * (6 + len * 0.1), y - len * 0.42, 6);
  } else if (era === 1) {
    // A stern castle, three oar-ports, a snapped mast lying across.
    const st = x - (len / 2) * d;
    g.fillStyle(dim(WOOD, 0.3), 1); g.fillRect(Math.min(st, st + d * 50), y - 50, 50, 46);
    g.fillStyle(0x0a0808, 1); for (let k = 0; k < 3; k++) g.fillRect(Math.min(st, st + d * 50) + 6 + k * 15, y - 30, 7, 7);
    plank(g, x - len * 0.4, y - 30, x + len * 0.35, y - 70, 7, dim(WOOD, 0.25));
  } else {
    // A single oar still shipped in its rowlock.
    plank(g, x - d * 4, y - 20, x + d * len * 0.55, y - 44, 3, WOOD_LIT);
    g.fillStyle(WOOD_LIT, 1); g.fillEllipse(x + d * len * 0.6, y - 46, 14, 6);
  }
  // Glass has grown through it where it lay: shards up between the ribs.
  for (let i = 0; i < 4 + (era === 2 ? 0 : 3); i++) {
    shard(g, x - len * 0.4 + rng() * len * 0.8, y + 2, 10 + rng() * 14, 20 + rng() * 40, (rng() - 0.5) * 12, 0.3);
  }
}

/**
 * One of the Muster's boats, beached on the shingle at the tide line, its sail furled on the yard in
 * its isle's colour and a pennant at the masthead. `face` -1 / 1 which way the bow points.
 */
export function beachedBoat(g: G, x: number, y: number, len: number, sail: number, face: -1 | 1, rng: () => number): void {
  shadow(g, x, y + 3, len * 1.15, 14, 0.45);
  const hull = mixC(WOOD, sail, 0.18);
  const bow = x + face * len / 2, stern = x - face * len / 2;
  // Hull: a wedge, heeled a little on the glass.
  poly(g, [[stern, y - 16], [bow + face * 8, y - 22], [bow - face * 6, y], [stern + face * 6, y + 2]], dim(hull, 0.4));
  poly(g, [[stern, y - 16], [bow + face * 8, y - 22], [bow + face * 2, y - 12], [stern + face * 3, y - 8]], hull);
  g.lineStyle(2, lit(hull, 0.3), 1); g.lineBetween(stern, y - 16, bow + face * 8, y - 22);
  // A painted strake in the isle's colour.
  g.lineStyle(2.5, sail, 0.9); g.lineBetween(stern + face * 4, y - 10, bow, y - 14);
  // Mast, yard, furled sail.
  const mx = x + face * len * 0.08;
  g.lineStyle(3, WOOD_DARK, 1); g.lineBetween(mx, y - 16, mx + face * 2, y - 16 - len * 0.9);
  g.lineStyle(2, WOOD_DARK, 1); g.lineBetween(mx - len * 0.3, y - len * 0.7, mx + len * 0.3, y - len * 0.74);
  g.fillStyle(dim(sail, 0.3), 1); g.fillEllipse(mx, y - len * 0.7 + 4, len * 0.62, 10);
  g.fillStyle(sail, 1); g.fillEllipse(mx, y - len * 0.7 + 2, len * 0.58, 7);
  for (let k = 0; k < 4; k++) { g.lineStyle(1, dim(sail, 0.4), 1); g.lineBetween(mx - len * 0.22 + k * len * 0.15, y - len * 0.7 - 2, mx - len * 0.2 + k * len * 0.15, y - len * 0.7 + 6); }
  // Pennant.
  const top = y - 16 - len * 0.9;
  poly(g, [[mx + face * 2, top], [mx + face * 2 + 18, top + 4 + rng() * 2], [mx + face * 2, top + 8]], sail);
  // A coil of rope up the beach to a stake.
  g.lineStyle(1.5, 0xa89878, 0.8);
  g.lineBetween(bow, y - 12, bow + face * 30, y - 34);
  g.fillStyle(WOOD_DARK, 1); g.fillRect(bow + face * 30 - 2, y - 44, 4, 12);
}

// ── The Muster's pitches ─────────────────────────────────────────────

/**
 * Tamsin's tinker cart (Brandmark): two wheels, a soot-streaked canvas hood, pans hung all down the
 * side, a grindstone, a little brazier for mending. Her coal never goes out now.
 */
export function tinkerCart(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 170, 26, 0.45);
  // Shafts resting on the shingle.
  plank(g, x + 50, y - 26, x + 118, y - 4, 4, WOOD);
  plank(g, x + 50, y - 18, x + 114, y + 4, 4, dim(WOOD, 0.15));
  // Bed.
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x - 64, y - 52, 128, 30);
  g.fillStyle(WOOD, 1); g.fillRect(x - 62, y - 50, 124, 24);
  for (let k = 0; k < 6; k++) { g.lineStyle(1, WOOD_DARK, 0.6); g.lineBetween(x - 62 + k * 21, y - 50, x - 62 + k * 21, y - 26); }
  // Hood: a soot-streaked canvas barrel vault.
  g.fillStyle(CANVAS_DARK, 1); g.fillRoundedRect(x - 60, y - 110, 120, 62, { tl: 40, tr: 40, bl: 0, br: 0 });
  g.fillStyle(CANVAS, 1); g.fillRoundedRect(x - 56, y - 108, 112, 56, { tl: 36, tr: 36, bl: 0, br: 0 });
  for (let k = 0; k < 5; k++) { g.lineStyle(2, CANVAS_DARK, 0.8); g.lineBetween(x - 44 + k * 22, y - 104, x - 44 + k * 22, y - 52); }
  for (let k = 0; k < 9; k++) { g.fillStyle(0x2a2420, 0.25 + rng() * 0.3); g.fillEllipse(x - 50 + rng() * 100, y - 100 + rng() * 40, 6 + rng() * 14, 3 + rng() * 6); }
  // The brand-sigil she painted out with soot and then painted back on, crossed through.
  g.lineStyle(2, ISLE_COLOR.fire, 0.9); g.strokeCircle(x + 22, y - 80, 9);
  g.lineBetween(x + 14, y - 72, x + 30, y - 88);
  // Pans down the side, big to small.
  for (let k = 0; k < 6; k++) {
    const px = x - 52 + k * 19, py = y - 40, r = 9 - k * 0.8;
    g.lineStyle(2, IRON, 1); g.lineBetween(px, py - r, px, py - r - 8);
    g.fillStyle(0x3a3436, 1); g.fillCircle(px, py, r);
    g.fillStyle(0x5a5254, 1); g.fillCircle(px - 1, py - 1, r * 0.75);
    g.fillStyle(0xd8c8b8, 0.4); g.fillEllipse(px - r * 0.3, py - r * 0.35, r * 0.5, r * 0.25);
  }
  // Wheels.
  for (const wx of [x - 38, x + 38]) {
    g.lineStyle(5, WOOD_DARK, 1); g.strokeCircle(wx, y - 18, 20);
    g.lineStyle(3, WOOD, 1); g.strokeCircle(wx, y - 18, 19);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.lineStyle(2, WOOD, 1); g.lineBetween(wx, y - 18, wx + Math.cos(a) * 18, y - 18 + Math.sin(a) * 18); }
    g.fillStyle(IRON, 1); g.fillCircle(wx, y - 18, 4);
  }
  // Grindstone on its frame, behind the cart's tail.
  g.lineStyle(3, WOOD_DARK, 1); g.lineBetween(x - 92, y, x - 84, y - 30); g.lineBetween(x - 70, y, x - 78, y - 30);
  g.fillStyle(0x7a7068, 1); g.fillCircle(x - 81, y - 32, 13);
  g.fillStyle(0x9a9088, 1); g.fillCircle(x - 82, y - 33, 9);
  g.lineStyle(2, IRON, 1); g.lineBetween(x - 81, y - 32, x - 66, y - 42);
  // The mending brazier (its coals are drawn live).
  g.fillStyle(IRON, 1); g.fillRect(x + 64, y - 22, 24, 16);
  g.lineStyle(2, IRON, 1); g.lineBetween(x + 66, y - 6, x + 62, y + 2); g.lineBetween(x + 86, y - 6, x + 90, y + 2);
}
/** Where Tamsin's brazier coals glow, relative to her cart. */
export const cartCoals = (x: number, y: number): P => ({ x: x + 76, y: y - 24 });

/**
 * Odo's diving bell (the Drowned Reach): a great riveted brass bell on a timber sheerlegs, its chain
 * to a hand-winch, three portholes lit teal from a lamp inside, barnacles round the hem, an air hose
 * coiled on the shingle. He salvaged it from the Ladle's wreck. He keeps it, he says, for the view.
 */
export function divingBell(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 150, 26, 0.45);
  // Sheerlegs.
  g.lineStyle(6, WOOD_DARK, 1); g.lineBetween(x - 66, y + 2, x - 4, y - 160); g.lineBetween(x + 66, y + 2, x + 4, y - 160);
  g.lineStyle(4, WOOD, 1); g.lineBetween(x - 64, y, x - 4, y - 158); g.lineBetween(x + 64, y, x + 4, y - 158);
  g.fillStyle(IRON, 1); g.fillCircle(x, y - 158, 7);
  // Chain to the bell's crown.
  for (let k = 0; k < 7; k++) { g.lineStyle(2, 0x8a8a90, 1); g.strokeEllipse(x, y - 150 + k * 6, 4, 6); }
  // The bell: a brass dome.
  const by = y - 4;
  g.fillStyle(BRASS_DARK, 1); g.fillRoundedRect(x - 44, by - 100, 88, 100, { tl: 40, tr: 40, bl: 6, br: 6 });
  g.fillStyle(BRASS, 1); g.fillRoundedRect(x - 40, by - 98, 76, 94, { tl: 36, tr: 36, bl: 4, br: 4 });
  g.fillStyle(0xf0d890, 0.5); g.fillRoundedRect(x - 30, by - 92, 10, 70, 5);
  // Rivet bands.
  for (const ry of [by - 70, by - 40, by - 12]) {
    g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(x - 42, ry, x + 42, ry);
    for (let k = 0; k < 9; k++) { g.fillStyle(0xe8c870, 1); g.fillCircle(x - 38 + k * 9.5, ry - 3, 1.3); }
  }
  // Portholes (their light is drawn live).
  for (const p of bellPorts(x, y)) {
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(p.x, p.y, 10);
    g.fillStyle(0x0a2a30, 1); g.fillCircle(p.x, p.y, 7);
  }
  // Barnacles and weed round the hem.
  for (let k = 0; k < 16; k++) {
    const bx = x - 42 + rng() * 84;
    g.fillStyle(0xd8d0c0, 1); g.fillCircle(bx, by - 2 - rng() * 8, 1.5 + rng() * 2);
    g.fillStyle(0x3a5a4a, 0.8); g.fillEllipse(bx + 3, by + 1, 4, 2);
  }
  // Winch and the hose coiled beside it.
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x + 70, y - 26, 30, 22);
  g.fillStyle(IRON, 1); g.fillCircle(x + 85, y - 22, 9);
  g.lineStyle(2, IRON, 1); g.lineBetween(x + 85, y - 22, x + 104, y - 34);
  for (let k = 0; k < 4; k++) { g.lineStyle(3, 0x3a3a2a, 1); g.strokeEllipse(x - 90, y - 4 - k * 3, 40 - k * 6, 14 - k * 2); }
}
/** The bell's three portholes. */
export const bellPorts = (x: number, y: number): P[] => [{ x: x - 22, y: y - 54 }, { x, y: y - 58 }, { x: x + 22, y: y - 54 }];

/**
 * Wendeline's apiary (Thornwild): three straw skeps on a plank bench raised on two glass chips, a
 * smoker, a honey crock — and a clay pot of primroses at the end of the bench, which she waters from
 * her own cup and will not explain. The bees are drawn live.
 */
export function apiary(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 170, 22, 0.45);
  // Bench on two black-glass blocks she found on the beach.
  slab(g, x - 56, y, 26, 26);
  slab(g, x + 56, y, 26, 26);
  plank(g, x - 78, y - 30, x + 78, y - 30, 8, WOOD);
  // Three skeps: banded straw domes, a dark door at the foot of each.
  for (const [sx, s] of [[x - 46, 1], [x, 1.15], [x + 46, 0.95]] as [number, number][]) {
    const h = 44 * s, w = 38 * s, base = y - 34;
    g.fillStyle(0x8a6a2a, 1); g.fillEllipse(sx, base - h * 0.45, w + 4, h + 4);
    g.fillStyle(0xd8b058, 1); g.fillEllipse(sx, base - h * 0.48, w, h);
    for (let k = 0; k < 6; k++) {
      const ky = base - h * 0.08 - k * h * 0.15;
      const half = Math.sqrt(Math.max(0, 1 - Math.pow((ky - (base - h * 0.48)) / (h / 2), 2))) * w / 2;
      g.lineStyle(2, 0x9a7430, 0.9); g.lineBetween(sx - half, ky, sx + half, ky);
      for (let j = -half + 3; j < half - 2; j += 5) { g.fillStyle(0xf0d080, 0.6); g.fillRect(sx + j, ky - 1.2, 2, 1); }
    }
    g.fillStyle(0x2a1a0a, 1); g.fillEllipse(sx, base - 3, 9 * s, 6 * s);
  }
  // Smoker: a tin can with bellows.
  g.fillStyle(0x7a7a80, 1); g.fillRect(x - 108, y - 26, 14, 24);
  g.fillStyle(0x9a9aa0, 1); g.fillTriangle(x - 108, y - 26, x - 94, y - 26, x - 101, y - 36);
  g.fillStyle(0x6a4a2a, 1); g.fillRect(x - 92, y - 22, 10, 16);
  // Honey crock.
  g.fillStyle(0x8a5a2a, 1); g.fillEllipse(x + 96, y - 12, 22, 24);
  g.fillStyle(0xe8a020, 1); g.fillEllipse(x + 96, y - 22, 16, 6);
  g.fillStyle(0xfff0b0, 0.5); g.fillRect(x + 90, y - 16, 2, 8);
  // Primroses in a clay pot.
  g.fillStyle(0xa85a3a, 1); g.fillRect(x + 64, y - 52, 22, 18);
  g.fillStyle(0xc87a5a, 1); g.fillRect(x + 62, y - 54, 26, 5);
  for (let k = 0; k < 7; k++) {
    const fx = x + 66 + rng() * 18, fy = y - 60 - rng() * 10;
    g.fillStyle(0x4a8a3a, 1); g.fillEllipse(fx, fy + 4, 7, 3);
    g.fillStyle(0xf8e878, 1); for (let p = 0; p < 5; p++) g.fillCircle(fx + Math.cos(p * 1.26) * 2.4, fy + Math.sin(p * 1.26) * 2.4, 1.8);
    g.fillStyle(0xe89a20, 1); g.fillCircle(fx, fy, 1.2);
  }
}
/** The skeps' doors, where the bees come and go. */
export const skepDoors = (x: number, y: number): P[] => [{ x: x - 46, y: y - 37 }, { x, y: y - 37 }, { x: x + 46, y: y - 37 }];

/**
 * Barnaby's balloon (Highspire) — the basket. The *Dandelion*'s envelope, half filled and breathing,
 * is drawn live over it; here are the wicker gondola, the burner frame, Old Needle the altimeter on
 * the rim, sandbags, and the tether ropes staked into the glass.
 */
export function balloonBasket(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 140, 24, 0.45);
  // Tether ropes out to stakes (the envelope's ropes are drawn live).
  for (const [sx, sy] of [[x - 96, y + 6], [x + 100, y + 2], [x - 60, y - 30], [x + 70, y - 34]] as [number, number][]) {
    g.fillStyle(WOOD_DARK, 1); g.fillRect(sx - 2, sy - 12, 4, 14);
    g.lineStyle(1.2, 0xc8b890, 0.7); g.lineBetween(sx, sy - 10, x + (sx < x ? -24 : 24), y - 46);
  }
  // The gondola: wicker weave.
  g.fillStyle(0x6a4a22, 1); g.fillRect(x - 30, y - 48, 60, 48);
  g.fillStyle(0xb08848, 1); g.fillRect(x - 28, y - 46, 56, 44);
  for (let r = 0; r < 7; r++) for (let c = 0; c < 9; c++) {
    g.fillStyle((r + c) % 2 ? 0x8a6a32 : 0xc89a58, 1);
    g.fillRect(x - 27 + c * 6.1, y - 45 + r * 6.2, 5, 3);
  }
  g.fillStyle(0x6a3a1a, 1); g.fillRect(x - 32, y - 52, 64, 6);
  // Burner frame posts.
  g.lineStyle(2, IRON, 1); g.lineBetween(x - 22, y - 52, x - 14, y - 84); g.lineBetween(x + 22, y - 52, x + 14, y - 84);
  g.fillStyle(0x4a4a52, 1); g.fillRect(x - 16, y - 90, 32, 8);
  // Old Needle — the altimeter strapped to the rim, needle hopefully up.
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x + 34, y - 54, 9);
  g.fillStyle(0xf0e8d0, 1); g.fillCircle(x + 34, y - 54, 7);
  g.lineStyle(1.5, 0xc83a3a, 1); g.lineBetween(x + 34, y - 54, x + 35, y - 60);
  // Sandbags.
  for (let k = 0; k < 5; k++) {
    const bx = x - 30 + k * 15 + (rng() - 0.5) * 3;
    g.fillStyle(0x9a8a6a, 1); g.fillEllipse(bx, y - 1, 14, 10);
    g.fillStyle(0xb8a888, 1); g.fillEllipse(bx - 1, y - 3, 10, 5);
  }
}
/** Where the balloon envelope's mouth hangs over the basket. */
export const balloonMouth = (x: number, y: number): P => ({ x, y: y - 92 });

/**
 * Gideon's cairn (Bedrock Hold): the only grey stone on the whole glass beach — he brought it, one
 * stone from each court of the Hold in his pack, and stacked them true. On top, like a crown on a
 * pillow, his stone collar, split in two. His pick leans on it; the Duchess's cage hangs off the haft.
 */
export function cairn(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 120, 24, 0.45);
  const stones: [number, number, number, number, number][] = [
    // dx, dy(base), w, h, colour
    [-26, 0, 50, 28, 0x8c8782], [24, 0, 46, 26, 0xa89a7a], [0, -26, 56, 24, 0x7a7470],
    [-14, -48, 40, 22, 0xc89a5a], [16, -48, 34, 20, 0x9a8a7a], [0, -68, 40, 20, 0x6a6a72],
    [-4, -86, 30, 18, 0xb8a888],
  ];
  for (const [dx, dy, w, h, c] of stones) {
    const sx = x + dx, sy = y + dy;
    g.fillStyle(dim(c, 0.45), 1); g.fillRoundedRect(sx - w / 2, sy - h, w, h, 7);
    g.fillStyle(c, 1); g.fillRoundedRect(sx - w / 2 + 1, sy - h, w - 3, h - 3, 7);
    g.fillStyle(lit(c, 0.3), 0.7); g.fillRoundedRect(sx - w / 2 + 4, sy - h + 2, w * 0.5, 4, 2);
    for (let k = 0; k < 3; k++) { g.fillStyle(dim(c, 0.3), 0.6); g.fillCircle(sx - w / 3 + rng() * w * 0.6, sy - h * 0.3 - rng() * h * 0.4, 1 + rng()); }
  }
  // The collar: a ring of cut granite, split clean in two, the iron pin still through one half.
  const cy = y - 112;
  g.fillStyle(0x5a5a62, 1); g.fillEllipse(x - 8, cy + 4, 30, 14);
  g.fillStyle(0x8c8782, 1); g.fillEllipse(x - 9, cy + 2, 28, 12);
  g.fillStyle(0x2a2a30, 1); g.fillEllipse(x - 4, cy + 2, 12, 5);
  g.fillStyle(0x8c8782, 1); g.fillEllipse(x + 14, cy - 2, 20, 10);
  g.fillStyle(0x2a2a30, 1); g.fillEllipse(x + 10, cy - 2, 8, 4);
  g.lineStyle(2, 0x5a4a3a, 1); g.lineBetween(x - 22, cy, x - 18, cy + 8);
  // The pick, leaning on the cairn.
  plank(g, x + 40, y + 2, x + 62, y - 96, 4, WOOD_LIT);
  g.lineStyle(5, 0x5a5a62, 1); g.beginPath(); g.arc(x + 62, y - 82, 26, Math.PI * 1.2, Math.PI * 1.85, false); g.strokePath();
  // The Duchess's cage, hung off the haft (she is drawn live).
  const c = canaryCage(x, y);
  g.lineStyle(1, BRASS, 1); g.lineBetween(c.x, c.y - 26, x + 57, y - 78);
  g.fillStyle(BRASS, 1); g.fillEllipse(c.x, c.y, 26, 6);
  for (let k = 0; k < 7; k++) { g.lineStyle(1, BRASS, 0.9); g.lineBetween(c.x - 12 + k * 4, c.y, c.x - 6 + k * 2, c.y - 24); }
  g.lineStyle(1.5, BRASS, 1); g.beginPath(); g.arc(c.x, c.y - 18, 8, Math.PI, 0, false); g.strokePath();
}
/** The canary cage's floor. */
export const canaryCage = (x: number, y: number): P => ({ x: x + 54, y: y - 40 });

/**
 * Wren's lamp-post (Voltreach): a real cast-iron street lamp she carried down off Terminus on her
 * back and planted in the shingle — the ladder-bar, the scrolled bracket, the four-paned head. Her
 * pole with its hook and snuffer leans on it; Radio Candle sits on a crate at its foot, aerial up.
 */
export function lampPost(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 90, 18, 0.45);
  // A heap of shingle round the foot to hold it up.
  for (let k = 0; k < 10; k++) { g.fillStyle(k % 2 ? OBS.facet : OBS.glass, 1); g.fillEllipse(x - 18 + k * 4, y - 2 - (k % 3) * 2, 12, 7); }
  // Post: fluted, base collar, the ladder-bar.
  g.fillStyle(IRON, 1); g.fillRect(x - 9, y - 22, 18, 20);
  g.fillStyle(0x3a3a44, 1); g.fillRect(x - 4, y - 168, 8, 150);
  g.fillStyle(0x5a5a66, 0.8); g.fillRect(x - 3, y - 168, 2, 150);
  g.fillStyle(IRON, 1); g.fillRect(x - 18, y - 140, 36, 4);
  // Scrolled bracket under the head.
  g.lineStyle(2, IRON, 1);
  g.beginPath(); g.arc(x - 8, y - 172, 6, 0, Math.PI * 1.5, false); g.strokePath();
  g.beginPath(); g.arc(x + 8, y - 172, 6, Math.PI * 1.5, Math.PI, true); g.strokePath();
  // Head: four panes, a cap, a finial (the flame is live).
  const h = lampHead(x, y);
  poly(g, [[h.x - 13, h.y + 14], [h.x + 13, h.y + 14], [h.x + 16, h.y - 14], [h.x - 16, h.y - 14]], 0x1a1a22);
  g.fillStyle(0xffe0a0, 0.28); g.fillRect(h.x - 11, h.y - 12, 22, 24);
  g.lineStyle(1.5, IRON, 1); g.lineBetween(h.x, h.y - 14, h.x, h.y + 14);
  poly(g, [[h.x - 20, h.y - 14], [h.x + 20, h.y - 14], [h.x, h.y - 30]], IRON);
  g.fillStyle(IRON, 1); g.fillCircle(h.x, h.y - 32, 3);
  // Her pole, leaning: hook and snuffer at the top.
  g.lineStyle(3, WOOD, 1); g.lineBetween(x + 30, y + 2, x + 12, y - 150);
  g.lineStyle(2, BRASS, 1); g.beginPath(); g.arc(x + 16, y - 156, 6, Math.PI * 0.2, Math.PI * 1.3, true); g.strokePath();
  g.fillStyle(BRASS, 1); g.fillTriangle(x + 8, y - 150, x + 16, y - 150, x + 12, y - 140);
  // Radio Candle on its crate.
  crateBox(g, x - 40, y, 26, ISLE_COLOR.electricity);
  g.fillStyle(0x6a3a2a, 1); g.fillRoundedRect(x - 52, y - 46, 24, 16, 3);
  g.fillStyle(0xe8d8b8, 1); g.fillCircle(x - 46, y - 38, 4);
  for (let k = 0; k < 3; k++) { g.lineStyle(1, 0x2a1a10, 1); g.lineBetween(x - 40, y - 43 + k * 4, x - 32, y - 43 + k * 4); }
  g.lineStyle(1, 0xa0a0a8, 1); g.lineBetween(x - 32, y - 46, x - 20, y - 76);
  g.fillStyle(0xff6a3a, 1); g.fillCircle(x - 20, y - 76, 1.6);
}
/** The lamp's head (where the flame burns). */
export const lampHead = (x: number, y: number): P => ({ x, y: y - 188 });

/**
 * Tansy's still (Fangmire): a squat copper pot on a fire-ring of glass chips, the swan-neck and the
 * worm coiled in a tub, a drip into a row of stoppered jars, her satchel of vials hung on a peg. The
 * fire, steam and the drip, and Pestle on his crate, are drawn live.
 */
export function still(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 160, 24, 0.45);
  // Fire-ring.
  for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; shard(g, x - 30 + Math.cos(a) * 26, y + Math.sin(a) * 7, 10, 10 + rng() * 6, 0, 0.3); }
  // Pot.
  g.fillStyle(0x7a3a1a, 1); g.fillEllipse(x - 30, y - 34, 64, 52);
  g.fillStyle(0xc87a3a, 1); g.fillEllipse(x - 32, y - 36, 58, 46);
  g.fillStyle(0xf0b070, 0.55); g.fillEllipse(x - 44, y - 46, 14, 20);
  for (let k = 0; k < 7; k++) { g.fillStyle(0x5a8a5a, 0.5); g.fillCircle(x - 50 + k * 7, y - 16 - (k % 2) * 3, 2); }
  // Dome and swan-neck to the worm-tub.
  g.fillStyle(0xb06a30, 1); g.fillEllipse(x - 30, y - 62, 30, 20);
  g.lineStyle(6, 0x8a4a20, 1); g.beginPath(); g.moveTo(x - 30, y - 70); g.lineTo(x - 18, y - 92); g.lineTo(x + 22, y - 78); g.strokePath();
  g.lineStyle(4, 0xd08a4a, 1); g.beginPath(); g.moveTo(x - 30, y - 70); g.lineTo(x - 18, y - 92); g.lineTo(x + 22, y - 78); g.strokePath();
  // Tub with the coiled worm showing over the rim.
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x + 14, y - 62, 40, 50);
  g.fillStyle(WOOD, 1); g.fillRect(x + 16, y - 60, 36, 46);
  for (const by of [y - 52, y - 24]) { g.fillStyle(IRON, 1); g.fillRect(x + 14, by, 40, 3); }
  for (let k = 0; k < 3; k++) { g.lineStyle(3, 0xd08a4a, 1); g.strokeEllipse(x + 34, y - 66 + k * 4, 26, 8); }
  // Drip spout and jars.
  g.lineStyle(3, 0xd08a4a, 1); g.lineBetween(x + 54, y - 30, x + 66, y - 30);
  for (let k = 0; k < 4; k++) {
    const jx = x + 66 + k * 13;
    g.fillStyle(0x3a5a2a, 0.6); g.fillRoundedRect(jx - 5, y - 18, 10, 16, 3);
    g.fillStyle(0x9be04a, 0.25 + k * 0.15); g.fillRoundedRect(jx - 4, y - 12 + k, 8, 9 - k, 2);
    g.fillStyle(0x8a6a4a, 1); g.fillRect(jx - 3, y - 21, 6, 3);
  }
  // Satchel of vials on a driftwood peg.
  g.lineStyle(3, WOOD, 1); g.lineBetween(x - 92, y, x - 88, y - 70);
  g.fillStyle(0x5a4a2a, 1); g.fillRoundedRect(x - 102, y - 58, 26, 22, 4);
  for (let k = 0; k < 4; k++) { g.fillStyle([0x9be04a, 0xd06aa0, 0x6ac0e0, 0xe0c04a][k], 0.9); g.fillRect(x - 100 + k * 6, y - 66, 4, 9); }
  // Pestle's crate.
  crateBox(g, x + 64, y + 22, 22, ISLE_COLOR.slime);
}
/** The still's fire, its drip-spout, and Pestle's crate-top. */
export const stillParts = (x: number, y: number): { fire: P; drip: P; pestle: P } => ({
  fire: { x: x - 30, y: y - 4 }, drip: { x: x + 66, y: y - 30 }, pestle: { x: x + 64, y: y - 4 },
});

/**
 * Marlo's card table (Lotterhaven): an upturned crate under a green baize scrap, a fan of cards dealt
 * face up (she only plays face up now), buttons in honest piles, two stools, a perch for Tuppence —
 * and the day's haul of shiny things beside it, each tied to a stamped envelope to be posted back.
 */
export function cardTable(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 150, 24, 0.45);
  // Stools.
  for (const sx of [x - 58, x + 58]) {
    g.fillStyle(WOOD_DARK, 1); g.fillRect(sx - 3, y - 20, 6, 20);
    g.fillStyle(WOOD, 1); g.fillEllipse(sx, y - 22, 26, 9);
  }
  // Crate table and baize.
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x - 34, y - 36, 68, 36);
  g.fillStyle(WOOD, 1); g.fillRect(x - 32, y - 34, 64, 32);
  g.fillStyle(0x1e4a32, 1); g.fillRect(x - 40, y - 44, 80, 12);
  g.fillStyle(0x2a6a46, 1); g.fillRect(x - 38, y - 46, 76, 8);
  poly(g, [[x - 40, y - 38], [x - 34, y - 26], [x - 28, y - 38]], 0x1e4a32);
  poly(g, [[x + 40, y - 38], [x + 34, y - 26], [x + 28, y - 38]], 0x1e4a32);
  // Cards dealt face up.
  for (let k = 0; k < 5; k++) {
    const cx = x - 26 + k * 11, cy = y - 50 - Math.sin(k / 4 * Math.PI) * 3;
    g.fillStyle(0xf0e8d8, 1); g.fillRect(cx - 4, cy - 6, 9, 12);
    g.lineStyle(0.8, 0x8a8070, 1); g.strokeRect(cx - 4, cy - 6, 9, 12);
    g.fillStyle(k % 2 ? 0xc83a3a : 0x1a1a22, 1); g.fillCircle(cx + 0.5, cy, 1.8);
  }
  // Honest piles of buttons.
  for (let p = 0; p < 3; p++) for (let k = 0; k < 4 + p; k++) {
    g.fillStyle([0xe8d8b8, 0x8a5a3a, 0x5a6a8a][p], 1); g.fillEllipse(x + 18 + p * 7, y - 48 - k * 1.6, 6, 2.4);
  }
  // Tuppence's perch (she is drawn live).
  g.lineStyle(3, WOOD_DARK, 1); g.lineBetween(x + 46, y - 4, x + 46, y - 74);
  g.lineStyle(3, WOOD, 1); g.lineBetween(x + 34, y - 74, x + 58, y - 74);
  // The day's shiny haul, each with its envelope.
  const loot: [number, number][] = [[x - 84, y - 4], [x - 74, y + 6], [x - 92, y + 8]];
  for (const [lx, ly] of loot) {
    g.fillStyle(0xe8e0d0, 1); g.fillRect(lx - 6, ly - 5, 12, 8);
    g.lineStyle(0.8, 0x9a9080, 1); g.lineBetween(lx - 6, ly - 5, lx, ly); g.lineBetween(lx + 6, ly - 5, lx, ly);
    g.fillStyle(0xc83a3a, 1); g.fillRect(lx + 2, ly - 4, 3, 3);
    g.fillStyle(rng() > 0.5 ? 0xe8d070 : 0xd0d8e0, 1); g.fillCircle(lx - 7, ly + 2, 2.4);
  }
  // A lantern on the table corner, low.
  g.fillStyle(IRON, 1); g.fillRect(x - 38, y - 64, 10, 14);
  g.fillStyle(0xffd890, 0.75); g.fillRect(x - 37, y - 62, 8, 9);
}
/** Tuppence's perch-top. */
export const magpiePerch = (x: number, y: number): P => ({ x: x + 46, y: y - 74 });

/**
 * Lark's bandstand (Choirholm): a folding bandstand she had built in pieces and carried over, six
 * slim posts under a scalloped rose canopy, a ring of little bells round the eave — every one still
 * stuffed with wool — and her hurdy-gurdy on a stand in the middle. A rail for Patter.
 */
export function bandstand(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 170, 30, 0.45);
  // Deck: a low octagon of planks.
  g.fillStyle(WOOD_DARK, 1); g.fillEllipse(x, y - 6, 150, 34);
  g.fillStyle(WOOD, 1); g.fillEllipse(x, y - 10, 144, 28);
  for (let k = -3; k <= 3; k++) { g.lineStyle(1, WOOD_DARK, 0.6); g.lineBetween(x + k * 20, y - 23, x + k * 20, y + 3); }
  // Back posts.
  const posts = [-64, -38, 0, 38, 64];
  for (const px of posts) { g.fillStyle(0xe8d8c8, 1); g.fillRect(x + px - 2.5, y - 120, 5, 110); }
  // Hurdy-gurdy on its stand.
  g.lineStyle(2, WOOD_DARK, 1); g.lineBetween(x - 10, y - 10, x, y - 40); g.lineBetween(x + 10, y - 10, x, y - 40);
  g.fillStyle(0x8a4a2a, 1); g.fillEllipse(x, y - 50, 40, 20);
  g.fillStyle(0xb86a3a, 1); g.fillEllipse(x - 2, y - 52, 34, 14);
  g.fillStyle(0x2a1a10, 1); g.fillRect(x - 4, y - 60, 22, 5);
  g.lineStyle(1.5, BRASS, 1); g.lineBetween(x - 20, y - 50, x - 28, y - 56);
  // Canopy: a scalloped rose dome.
  g.fillStyle(0x5a2a3a, 1); g.fillEllipse(x, y - 124, 164, 30);
  g.fillStyle(0x7a3a4a, 1); g.fillTriangle(x - 82, y - 124, x + 82, y - 124, x, y - 172);
  g.fillStyle(0xb85a6a, 1); g.fillTriangle(x - 70, y - 126, x + 4, y - 126, x, y - 168);
  g.fillStyle(0xf0c8d0, 0.5); g.fillTriangle(x - 40, y - 128, x - 16, y - 128, x - 4, y - 160);
  for (let k = 0; k < 12; k++) {
    const sx = x - 78 + k * 14.2;
    g.fillStyle(k % 2 ? 0x7a3a4a : 0xe8b8c0, 1);
    g.beginPath(); g.arc(sx, y - 122, 7, 0, Math.PI, false); g.fillPath();
  }
  g.fillStyle(BRASS, 1); g.fillCircle(x, y - 174, 4);
  // Wool-stuffed bells round the eave.
  for (let k = 0; k < 7; k++) {
    const bx = x - 66 + k * 22, by = y - 108 + (rng() - 0.5) * 2;
    g.lineStyle(1, BRASS_DARK, 1); g.lineBetween(bx, y - 116, bx, by - 5);
    g.fillStyle(BRASS, 1); g.fillTriangle(bx - 5, by + 3, bx + 5, by + 3, bx, by - 6);
    g.fillStyle(0xf0ece0, 1); g.fillCircle(bx, by + 3, 3);
  }
  // Front posts and the rail.
  for (const px of [-80, 80]) { g.fillStyle(0xf0e4d8, 1); g.fillRect(x + px - 3, y - 122, 6, 118); }
  g.lineStyle(3, 0xe8d8c8, 1); g.lineBetween(x - 80, y - 32, x + 80, y - 32);
  for (let k = 0; k < 11; k++) { g.lineStyle(1.5, 0xd8c8b8, 1); g.lineBetween(x - 74 + k * 15, y - 32, x - 74 + k * 15, y - 8); }
}
/** Patter's place on the bandstand rail. */
export const mynahRail = (x: number, y: number): P => ({ x: x + 52, y: y - 34 });

/**
 * Sable's lantern (Solmara): the lamp-head of the Meridian light itself — a great Fresnel lens in a
 * brass gallery — on a three-legged driftwood frame, lit for the first time in twenty years and
 * pointed out to sea. Sable keeps it trimmed; Nocturne, who seeks the dark, keeps away from it.
 */
export function keeperLantern(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 120, 24, 0.45);
  // Tripod.
  g.lineStyle(6, WOOD_DARK, 1); g.lineBetween(x - 48, y + 2, x - 10, y - 110); g.lineBetween(x + 48, y + 2, x + 10, y - 110); g.lineBetween(x, y + 8, x, y - 110);
  g.lineStyle(3, lit(WOOD, 0.35), 1); g.lineBetween(x - 46, y, x - 9, y - 108); g.lineBetween(x + 46, y, x + 9, y - 108);
  // Gallery and lantern room.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 34, y - 118, 68, 10);
  g.fillStyle(BRASS, 1); g.fillRect(x - 32, y - 116, 64, 4);
  for (let k = 0; k < 9; k++) { g.lineStyle(1, BRASS_DARK, 1); g.lineBetween(x - 32 + k * 8, y - 108, x - 32 + k * 8, y - 100); }
  const h = lensCentre(x, y);
  g.fillStyle(0x2a2a2e, 1); g.fillRect(h.x - 26, h.y - 30, 52, 60);
  // The lens: concentric prism rings.
  for (let r = 24; r > 2; r -= 4) { g.lineStyle(2, r % 8 ? 0xe8f4ff : 0xb8d8e8, 0.55); g.strokeCircle(h.x, h.y, r); }
  g.lineStyle(2, BRASS, 1); g.strokeRect(h.x - 26, h.y - 30, 52, 60);
  g.lineBetween(h.x - 26, h.y, h.x - 18, h.y); g.lineBetween(h.x + 18, h.y, h.x + 26, h.y);
  // Cap: a dome and a vane.
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(h.x, h.y - 32, 60, 14);
  poly(g, [[h.x - 26, h.y - 32], [h.x + 26, h.y - 32], [h.x, h.y - 60]], BRASS_DARK);
  poly(g, [[h.x - 20, h.y - 33], [h.x, h.y - 58], [h.x + 4, h.y - 33]], BRASS);
  g.lineStyle(1.5, BRASS, 1); g.lineBetween(h.x, h.y - 60, h.x, h.y - 74); g.lineBetween(h.x - 8, h.y - 70, h.x + 8, h.y - 70);
  // Oil can and wick-trimmers at the foot.
  g.fillStyle(0x8a3a2a, 1); g.fillRoundedRect(x + 30, y - 18, 14, 18, 3);
  g.lineStyle(1.5, 0x8a3a2a, 1); g.lineBetween(x + 44, y - 14, x + 54, y - 22);
  g.lineStyle(1.5, 0xa0a0a8, 1); g.lineBetween(x - 40, y - 2, x - 26, y - 8); g.lineBetween(x - 40, y - 8, x - 26, y - 2);
}
/** The lens centre — where the light comes out. */
export const lensCentre = (x: number, y: number): P => ({ x, y: y - 146 });

// ── The camp's own ───────────────────────────────────────────────────

/**
 * The camp kitchen: a sailcloth lean-to over a trestle table, a black iron pot on a chain over a
 * driftwood fire, fish of ten isles hung to dry on a line, ten mismatched bowls stacked ready.
 */
export function kitchen(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 220, 30, 0.45);
  // Lean-to: two poles, a sloped sail.
  g.lineStyle(4, WOOD_DARK, 1); g.lineBetween(x - 90, y - 4, x - 90, y - 130); g.lineBetween(x + 90, y - 4, x + 90, y - 130);
  poly(g, [[x - 104, y - 132], [x + 104, y - 132], [x + 118, y - 96], [x - 118, y - 96]], 0x8a7a60);
  poly(g, [[x - 100, y - 130], [x + 100, y - 130], [x + 112, y - 100], [x - 112, y - 100]], 0xd8c8a8);
  for (let k = 0; k < 6; k++) { g.lineStyle(1.5, 0xa89878, 0.8); g.lineBetween(x - 100 + k * 40, y - 130, x - 112 + k * 44.8, y - 100); }
  // Trestle with bowls stacked and ten different spoons.
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x - 80, y - 46, 112, 8);
  g.fillStyle(WOOD_LIT, 1); g.fillRect(x - 80, y - 48, 112, 4);
  g.lineStyle(3, WOOD_DARK, 1); g.lineBetween(x - 72, y - 40, x - 64, y); g.lineBetween(x + 24, y - 40, x + 16, y);
  const bowlCols = [ISLE_COLOR.fire, ISLE_COLOR.water, ISLE_COLOR.life, ISLE_COLOR.air, ISLE_COLOR.earth, ISLE_COLOR.electricity, ISLE_COLOR.slime, ISLE_COLOR.fate, ISLE_COLOR.sound, ISLE_COLOR.light];
  for (let k = 0; k < 10; k++) {
    const bx = x - 70 + (k % 5) * 14, by = y - 50 - Math.floor(k / 5) * 7;
    g.fillStyle(dim(bowlCols[k], 0.3), 1); g.fillEllipse(bx, by, 13, 6);
    g.fillStyle(bowlCols[k], 1); g.fillEllipse(bx, by - 1, 11, 3);
  }
  // A board of chopped greens and a cleaver.
  g.fillStyle(WOOD_LIT, 1); g.fillRect(x - 6, y - 54, 30, 6);
  for (let k = 0; k < 6; k++) { g.fillStyle(0x5aa04a, 1); g.fillCircle(x + rng() * 22, y - 55, 1.6); }
  g.fillStyle(0xc8c8d0, 1); g.fillRect(x + 14, y - 62, 10, 7);
  // The pot on its chain over the fire (flames are live).
  const p = potAt(x, y);
  g.lineStyle(3, WOOD_DARK, 1); g.lineBetween(p.x - 34, y + 2, p.x, p.y - 56); g.lineBetween(p.x + 34, y + 2, p.x, p.y - 56);
  for (let k = 0; k < 5; k++) { g.lineStyle(1.5, 0x6a6a70, 1); g.strokeEllipse(p.x, p.y - 50 + k * 6, 3, 5); }
  g.fillStyle(0x1a1a1e, 1); g.fillEllipse(p.x, p.y - 12, 44, 34);
  g.fillStyle(0x2a2a30, 1); g.fillEllipse(p.x - 4, p.y - 16, 30, 18);
  g.fillStyle(0x3a2a1a, 1); g.fillEllipse(p.x, p.y - 26, 40, 9);
  g.fillStyle(0x8a6a3a, 1); g.fillEllipse(p.x, p.y - 26, 34, 6);
  for (let k = 0; k < 5; k++) { g.fillStyle(WOOD, 1); g.fillRect(p.x - 18 + k * 8, y - 6 + (k % 2) * 2, 12, 4); }
  // The drying line: a fish from every isle.
  g.lineStyle(1, 0xa89878, 1); g.lineBetween(x - 90, y - 92, x + 90, y - 92);
  for (let k = 0; k < 10; k++) {
    const fx = x - 80 + k * 18, len = 10 + rng() * 6;
    g.lineStyle(1, 0xa89878, 1); g.lineBetween(fx, y - 92, fx, y - 88);
    g.fillStyle(mixC(0x8a9aa0, bowlCols[k], 0.35), 1); g.fillEllipse(fx, y - 88 + len / 2, 6, len);
    g.fillTriangle(fx - 3, y - 88 + len, fx + 3, y - 88 + len, fx, y - 84 + len);
  }
  // Water cask and a sack of flour.
  cask(g, x + 112, y, 12);
  g.fillStyle(0xd8c8a8, 1); g.fillEllipse(x - 112, y - 12, 26, 26);
  g.fillStyle(0xb8a888, 1); g.fillEllipse(x - 112, y - 24, 12, 6);
}
/** Where the kitchen pot hangs (its fire is under it). */
export const potAt = (x: number, y: number): P => ({ x: x + 56, y: y - 6 });

/**
 * The quartermaster's stores: a bell tent pitched against the wind, crates stacked high with an isle
 * colour stencilled on each, a ledger-desk under the flap and a slate where the stock is chalked.
 */
export function stores(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 220, 30, 0.45);
  // Bell tent.
  poly(g, [[x - 70, y - 4], [x + 70, y - 4], [x + 8, y - 150], [x - 8, y - 150]], 0x7a6a50);
  poly(g, [[x - 64, y - 6], [x + 24, y - 6], [x + 4, y - 146], [x - 6, y - 146]], 0xc8b898);
  poly(g, [[x - 18, y - 6], [x + 18, y - 6], [x + 2, y - 80]], 0x2a2018);
  poly(g, [[x + 18, y - 6], [x + 36, y - 10], [x + 4, y - 80]], 0xa89878);
  g.lineStyle(1.5, WOOD_DARK, 1); g.lineBetween(x, y - 150, x, y - 172);
  poly(g, [[x, y - 172], [x + 22, y - 166], [x, y - 160]], 0xd8c8a8);
  for (const [gx, gy] of [[x - 96, y + 4], [x + 96, y + 4]] as [number, number][]) { g.lineStyle(1, 0xa89878, 0.8); g.lineBetween(gx, gy, x, y - 140); g.fillStyle(WOOD_DARK, 1); g.fillRect(gx - 2, gy - 8, 4, 10); }
  // Crates stacked both sides.
  const cols = Object.values(ISLE_COLOR);
  const stacks: [number, number, number][] = [[x - 96, y, 24], [x - 70, y, 22], [x - 84, y - 26, 22], [x + 84, y, 26], [x + 112, y, 22], [x + 98, y - 28, 22], [x + 98, y - 52, 18]];
  stacks.forEach(([cx, cy, s], i) => crateBox(g, cx, cy, s, cols[(i * 3) % cols.length]));
  cask(g, x + 60, y, 11);
  cask(g, x + 136, y - 2, 10);
  // Ledger desk and slate.
  g.fillStyle(WOOD, 1); g.fillRect(x - 46, y - 32, 40, 6);
  g.lineStyle(2, WOOD_DARK, 1); g.lineBetween(x - 42, y - 26, x - 42, y); g.lineBetween(x - 10, y - 26, x - 10, y);
  g.fillStyle(0xe8e0c8, 1); g.fillRect(x - 40, y - 38, 26, 6);
  g.lineStyle(0.8, 0x6a5a4a, 1); for (let k = 0; k < 3; k++) g.lineBetween(x - 38, y - 37 + k * 2, x - 18, y - 37 + k * 2);
  g.fillStyle(0x2a2a2e, 1); g.fillRect(x - 128, y - 70, 30, 22);
  g.lineStyle(1, 0xe8e8e8, 0.7); for (let k = 0; k < 4; k++) g.lineBetween(x - 125, y - 66 + k * 5, x - 112 + rng() * 10, y - 66 + k * 5);
  g.lineStyle(2, WOOD, 1); g.lineBetween(x - 113, y - 48, x - 113, y);
}

/**
 * The dock hut: a lean shack built out of older challengers' planking at the root of the jetty, a
 * boat-hook on the wall, a lantern on a hook, a rack of oars with no boats left to go with them.
 */
export function dockHut(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 120, 22, 0.45);
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x - 44, y - 70, 88, 70);
  for (let k = 0; k < 8; k++) {
    const c = mixC(WOOD, 0x8a8a7a, rng() * 0.5);
    g.fillStyle(c, 1); g.fillRect(x - 42 + k * 10.6, y - 68 + rng() * 4, 9.6, 68 - rng() * 4);
  }
  poly(g, [[x - 54, y - 66], [x + 54, y - 66], [x + 40, y - 92], [x - 40, y - 92]], dim(WOOD, 0.4));
  g.fillStyle(0x0a0808, 1); g.fillRect(x - 12, y - 44, 24, 44);
  // Oar rack: a dozen oars, all ages.
  for (let k = 0; k < 7; k++) {
    const ox = x + 52 + k * 6;
    g.lineStyle(2, mixC(WOOD_LIT, 0xb8b0a0, k / 7), 1); g.lineBetween(ox, y, ox + 2, y - 66);
    g.fillStyle(mixC(WOOD_LIT, 0xb8b0a0, k / 7), 1); g.fillEllipse(ox + 2, y - 70, 5, 14);
  }
  g.lineStyle(2, WOOD_DARK, 1); g.lineBetween(x + 48, y - 40, x + 96, y - 40);
  // Hook and lantern.
  g.lineStyle(2, IRON, 1); g.lineBetween(x - 36, y - 30, x - 36, y - 60);
  g.beginPath(); g.arc(x - 32, y - 60, 4, Math.PI, Math.PI * 2.2, false); g.strokePath();
  g.fillStyle(IRON, 1); g.fillRect(x + 22, y - 62, 10, 14);
  g.fillStyle(0xffd890, 0.8); g.fillRect(x + 23, y - 60, 8, 9);
}

/**
 * The Muster's fire: a ring of black-glass chips, driftwood logs radiating, and the seats round it —
 * a log, two crates and an upturned boat-bow — where all ten sat on the first night and nobody spoke.
 * Flames and sparks are live.
 */
export function campfire(g: G, x: number, y: number, rng: () => number): void {
  // Scorched ring.
  g.fillStyle(0x000000, 0.5); g.fillEllipse(x, y, 90, 40);
  g.fillStyle(0x1a1010, 0.8); g.fillEllipse(x, y, 60, 26);
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2;
    shard(g, x + Math.cos(a) * 34, y + Math.sin(a) * 14 + 4, 12, 12 + rng() * 6, 0, 0.35);
  }
  for (let k = 0; k < 5; k++) {
    const a = k / 5 * Math.PI * 2 + 0.3;
    plank(g, x + Math.cos(a) * 6, y + Math.sin(a) * 3 - 4, x + Math.cos(a) * 26, y + Math.sin(a) * 10 - 2, 5, dim(WOOD, 0.25));
  }
  // The seats.
  plank(g, x - 110, y - 26, x - 60, y - 40, 11, WOOD);
  crateBox(g, x + 84, y - 18, 22, ISLE_COLOR.water);
  crateBox(g, x - 80, y + 46, 20, ISLE_COLOR.fate);
  poly(g, [[x + 60, y + 52], [x + 120, y + 52], [x + 112, y + 34], [x + 70, y + 30]], dim(WOOD, 0.3));
  poly(g, [[x + 64, y + 48], [x + 116, y + 48], [x + 110, y + 36], [x + 72, y + 34]], WOOD);
}

// ── Ground bits ──────────────────────────────────────────────────────

/** A seam across the shingle from `a` to `b`, cracked into the ground (baked). */
export function groundSeam(g: G, a: P, b: P, rng: () => number, w = 1.4): void {
  const pts = crackPath(a, b, rng, 14, 8);
  // A shallow dark groove first, so the light sits in a crack and not on the stones.
  g.lineStyle(w * 6, 0x000000, 0.4);
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
  seam(g, pts, w, 0.75);
  // Hairline branches.
  for (let i = 1; i < pts.length - 1; i += 2) {
    const p = pts[i];
    seam(g, crackPath(p, { x: p.x + (rng() - 0.5) * 70, y: p.y + (rng() - 0.5) * 50 }, rng, 6, 3), w * 0.5, 0.5);
  }
}

export { OBS, dim, lit, mixC, seam, shard, slab };
