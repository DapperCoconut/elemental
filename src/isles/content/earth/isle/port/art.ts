import Phaser from 'phaser';
import type { Rect } from '../../../../IslesTypes';
import { type G, dim, glow, lit, mixC, shadow } from '../../../../art/IsleArt';

/**
 * Quarrymouth's drawing kit — the palette and set-piece bricks for a harbour cut into the face of an
 * old quarry. Nothing here was built up: it was cut down. Houses are doorways chiselled into the
 * bedding, streets are the benches the quarrymen left as they worked downward, and the stone is
 * everywhere layered — buff sandstone over grey shale over pale limestone, with the drill-scars of
 * every block ever split still showing. The Regent's brass turns up only where he wants weight read:
 * on the Tithe Scales, and on the collars.
 */

// ── Palette ──────────────────────────────────────────────────────────

/** Buff sandstone — the top bed, and most of the town. */
export const SANDSTONE = 0xc4a272;
export const SAND_LIT = 0xe0c898;
export const SAND_DARK = 0x8a6c46;
/** The grey shale band between the good beds; it splits in leaves and nobody wants it. */
export const SHALE = 0x6a6660;
export const SHALE_DARK = 0x46433e;
/** Pale limestone — the bottom bed, quarried for the Sepulchre. */
export const LIME = 0xd8ccb0;
export const LIME_DARK = 0xa89a7c;
/** Grey granite kerbs and bollards, brought in by barge. */
export const GRANITE = 0x8c8782;
export const GRANITE_DARK = 0x5e5a56;
/** Black basalt setts at the waterline. */
export const BASALT = 0x3a3634;
/** Dust over everything. */
export const DUST = 0xd8c8a0;

/** Timber: cranes, lifts, sheds — all of it bleached grey by the dust. */
export const TIMBER = 0x7a5e44;
export const TIMBER_DARK = 0x4a3828;
export const TIMBER_LIT = 0xa48a6a;
export const ROPE = 0xc8b088;
export const IRON = 0x3a3a3e;
export const IRON_LIT = 0x6a6a70;

/** The Regent's brass, and his slate-violet — the colour of his seal and his clerks' coats. */
export const BRASS = 0xc9a44a;
export const BRASS_LIT = 0xf0d88a;
export const BRASS_DARK = 0x7a5e22;
export const REGENT = 0x5a4e6a;
export const REGENT_DARK = 0x352c40;

/** Lamp and oven light. */
export const EMBER = 0xffa850;
export const HEARTH = 0xff7a2a;

/** The harbour: grey-green quarry water, milky with stone-dust near the quay. */
export const SEA = 0x3e6a70;
export const SEA_DEEP = 0x26464e;
export const SEA_SHALLOW = 0x6a9290;
export const FOAM = 0xe0e8e0;

// ── Small helpers ────────────────────────────────────────────────────

export function poly(g: G, pts: [number, number][], color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillPoints(pts.map(([x, y]) => new Phaser.Geom.Point(x, y)), true, true);
}

export const inView = (v: Rect, x: number, y: number, pad = 80): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

/**
 * The Regent's seal: a trilithon — two standing stones and a lintel — with a crown sunk beneath
 * it, only the points showing. He stamps it on every scale-weight, collar and sealed door.
 */
export function gravaneSeal(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  g.fillStyle(color, a);
  g.fillRect(x - r * 0.75, y - r * 0.55, r * 0.32, r * 1.1);
  g.fillRect(x + r * 0.43, y - r * 0.55, r * 0.32, r * 1.1);
  g.fillRect(x - r * 0.95, y - r * 0.85, r * 1.9, r * 0.32);
  // The crown, buried to its points under the lintel.
  g.fillTriangle(x - r * 0.38, y + r * 0.35, x - r * 0.26, y + r * 0.05, x - r * 0.14, y + r * 0.35);
  g.fillTriangle(x - r * 0.12, y + r * 0.35, x, y - r * 0.08, x + r * 0.12, y + r * 0.35);
  g.fillTriangle(x + r * 0.14, y + r * 0.35, x + r * 0.26, y + r * 0.05, x + r * 0.38, y + r * 0.35);
  g.fillRect(x - r * 0.42, y + r * 0.35, r * 0.84, r * 0.2);
  g.lineStyle(Math.max(1, r * 0.08), color, a * 0.8);
  g.lineBetween(x - r, y + r * 0.62, x + r, y + r * 0.62);
}

/** Drill-scars: the half-round channels left in a face when a block is split off with plug and feathers. */
export function drillMarks(g: G, x: number, y0: number, y1: number, color: number, a = 0.5): void {
  for (let y = y0; y < y1; y += 7) {
    g.fillStyle(dim(color, 0.4), a); g.fillRect(x - 1.5, y, 3, 4);
    g.fillStyle(lit(color, 0.2), a * 0.7); g.fillRect(x + 1.5, y, 1, 4);
  }
}

/**
 * A quarry face seen from above and in front: the beds lie in bands — sandstone, a grey leaf of
 * shale, limestone — each with its own chisel-work, a lit lip along the top, drill-scars dropping
 * down it, dust drifted at the foot. `top` is the lip, `bot` the foot.
 */
export function strataFace(g: G, x0: number, x1: number, top: number, bot: number, rng: () => number): void {
  const h = bot - top;
  const beds: [number, number][] = [[SANDSTONE, 0.34], [SHALE, 0.14], [mixC(SANDSTONE, LIME, 0.5), 0.2], [LIME_DARK, 0.32]];
  let y = top;
  for (const [col, frac] of beds) {
    const bh = h * frac;
    g.fillStyle(col, 1); g.fillRect(x0, y, x1 - x0, bh + 1);
    // Each bed's grain: fine horizontal laminae, a little wavy.
    for (let k = 0; k < bh / 3; k++) {
      const ly = y + 1 + k * 3 + rng();
      g.lineStyle(1, dim(col, 0.12 + rng() * 0.1), 0.5); g.lineBetween(x0, ly, x1, ly + (rng() - 0.5) * 2);
    }
    // The bedding plane under it: a dark seam.
    g.fillStyle(dim(col, 0.45), 0.8); g.fillRect(x0, y + bh - 1, x1 - x0, 1.5);
    y += bh;
  }
  // Vertical joints and drill-scars: where blocks came away.
  for (let x = x0 + 10 + rng() * 30; x < x1 - 6; x += 26 + rng() * 60) {
    if (rng() < 0.55) drillMarks(g, x, top + 3, bot - 4, SANDSTONE, 0.55);
    else { g.lineStyle(1.2, SHALE_DARK, 0.45); g.lineBetween(x, top + 2, x + (rng() - 0.5) * 6, bot - 2); }
  }
  // Pick-marks: short diagonal scores in herringbone patches.
  for (let i = 0; i < (x1 - x0) / 24; i++) {
    const px = x0 + rng() * (x1 - x0), py = top + 4 + rng() * (h - 8);
    g.lineStyle(1, SAND_DARK, 0.35);
    for (let k = 0; k < 4; k++) g.lineBetween(px + k * 3, py, px + k * 3 + 2, py + 4);
  }
  // A lit lip along the top, a shadow and drifted dust along the foot.
  g.fillStyle(SAND_LIT, 1); g.fillRect(x0, top - 3, x1 - x0, 4);
  g.fillStyle(lit(SAND_LIT, 0.3), 0.6); g.fillRect(x0, top - 3, x1 - x0, 1);
  g.fillStyle(0x000000, 0.22); g.fillRect(x0, bot, x1 - x0, 10);
  for (let x = x0; x < x1; x += 14 + rng() * 22) {
    g.fillStyle(DUST, 0.35 + rng() * 0.25); g.fillEllipse(x, bot + 3, 16 + rng() * 24, 6);
  }
}

/** Steps cut down through a face, with low cheek walls either side. */
export function cutStair(g: G, x0: number, x1: number, top: number, bot: number): void {
  const n = Math.max(4, Math.round((bot - top) / 7));
  const sh = (bot - top) / n;
  for (let k = 0; k < n; k++) {
    const y = top + k * sh;
    g.fillStyle(k % 2 ? LIME : mixC(LIME, SANDSTONE, 0.4), 1); g.fillRect(x0, y, x1 - x0, sh + 0.5);
    g.fillStyle(LIME_DARK, 0.8); g.fillRect(x0, y + sh - 1.5, x1 - x0, 1.5);
    // Worn hollows in the middle of each tread.
    g.fillStyle(lit(LIME, 0.25), 0.5); g.fillEllipse((x0 + x1) / 2, y + sh * 0.4, (x1 - x0) * 0.4, sh * 0.5);
  }
  for (const cx of [x0 - 6, x1]) {
    g.fillStyle(SAND_DARK, 1); g.fillRect(cx, top - 4, 6, bot - top + 8);
    g.fillStyle(SANDSTONE, 1); g.fillRect(cx + 1, top - 4, 4, bot - top + 6);
  }
}

/** Ashlar paving: courses of squared blocks in running bond, each block its own buff. */
export function ashlar(g: G, r: Rect, rowH: number, fill: number, grout: number, rng: () => number): void {
  g.fillStyle(grout, 1); g.fillRect(r.x, r.y, r.w, r.h);
  let row = 0;
  for (let y = r.y; y < r.y + r.h; y += rowH) {
    let x = r.x - (row % 2 ? rowH * 0.9 : 0) - rng() * 10;
    while (x < r.x + r.w) {
      const bw = rowH * (1.4 + rng() * 1.4);
      const bx = Math.max(r.x, x + 1), bx1 = Math.min(r.x + r.w, x + bw - 1);
      const by1 = Math.min(r.y + r.h, y + rowH - 1);
      if (bx1 > bx && by1 > y + 1) {
        const c = mixC(fill, rng() < 0.5 ? lit(fill, 0.2) : dim(fill, 0.18), rng() * 0.7);
        g.fillStyle(c, 1); g.fillRect(bx, y + 1, bx1 - bx, by1 - y - 1);
        g.fillStyle(lit(c, 0.18), 0.5); g.fillRect(bx, y + 1, bx1 - bx, 1.5);
        if (rng() < 0.12) { g.lineStyle(1, dim(c, 0.35), 0.6); g.lineBetween(bx + 3, y + 3, bx + (bx1 - bx) * 0.6, by1 - 2); }
      }
      x += bw;
    }
    row++;
  }
}

/** A stack of cut blocks waiting for a barge, each scored with a household's mark. */
export function blockStack(g: G, x: number, y: number, cols: number, rows: number, s: number, color: number, rng: () => number): void {
  shadow(g, x, y + 2, cols * s * 1.3, s * 0.5);
  const bw = s * 1.2, bh = s * 0.8;
  for (let r = 0; r < rows; r++) {
    const n = cols - r;
    for (let c = 0; c < n; c++) {
      const bx = x - (n * bw) / 2 + c * bw, by = y - (r + 1) * bh;
      const col = mixC(color, rng() < 0.5 ? lit(color, 0.15) : dim(color, 0.15), rng());
      g.fillStyle(dim(col, 0.35), 1); g.fillRect(bx, by, bw - 1, bh);
      g.fillStyle(col, 1); g.fillRect(bx, by, bw - 1, bh - 3);
      g.fillStyle(lit(col, 0.25), 1); g.fillRect(bx, by, bw - 1, 2);
      // Mason's marks: a little cut sign on each face.
      g.lineStyle(1, dim(col, 0.5), 0.8);
      const mx = bx + bw / 2, my = by + bh / 2 - 1, m = Math.floor(rng() * 4);
      if (m === 0) { g.lineBetween(mx - 3, my - 2, mx + 3, my + 2); g.lineBetween(mx - 3, my + 2, mx + 3, my - 2); }
      else if (m === 1) { g.strokeCircle(mx, my, 2.5); }
      else if (m === 2) { g.lineBetween(mx - 3, my + 2, mx, my - 3); g.lineBetween(mx, my - 3, mx + 3, my + 2); }
      else { g.lineBetween(mx, my - 3, mx, my + 3); g.lineBetween(mx - 3, my, mx + 3, my); }
    }
  }
}

/** A heap of spalls — the chips and offcuts a block sheds when it is dressed. */
export function spalls(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 1, s * 2.2, s * 0.6);
  g.fillStyle(SAND_DARK, 1); g.fillEllipse(x, y - s * 0.2, s * 2, s * 0.8);
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI, d = rng() * s;
    const px = x + Math.cos(a) * d * 0.95, py = y - s * 0.25 - Math.sin(a) * d * 0.45;
    const c = [SANDSTONE, LIME, SAND_LIT, SHALE][Math.floor(rng() * 4)];
    poly(g, [[px - 3, py + 2], [px - 1, py - 3], [px + 3.5, py - 1], [px + 2, py + 2.5]], c, 1);
  }
}

/** A cast-iron bollard with a rope burn round its waist. */
export function bollard(g: G, x: number, y: number): void {
  shadow(g, x, y + 1, 16, 6);
  g.fillStyle(IRON, 1); g.fillRect(x - 5, y - 14, 10, 14);
  g.fillStyle(IRON, 1); g.fillEllipse(x, y - 15, 14, 7);
  g.fillStyle(IRON_LIT, 1); g.fillEllipse(x - 1, y - 16, 9, 4);
  g.fillStyle(ROPE, 0.5); g.fillRect(x - 5, y - 8, 10, 2);
}

// ── Set pieces ───────────────────────────────────────────────────────

/**
 * The Tithe Scales — a brass balance the size of a chapel on a stepped plinth of the Hold's three
 * stones. The beam rests tipped toward the Regent's side, where his weights sit in their pan: cubes
 * of black basalt, each stamped with the trilithon. The other pan is the household's, and today it
 * holds a block and a heap of spalls. The column carries a dial with a needle, and a little iron
 * cage hangs off the Regent's side — where the short are made to stand while the beam is read.
 * `x,y` = the front of the plinth.
 */
export function titheScales(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 8, 420, 60);
  // The plinth: three steps — limestone, shale, sandstone, the Hold's beds in order.
  const steps: [number, number, number][] = [[260, 22, LIME_DARK], [210, 20, SHALE], [160, 20, SANDSTONE]];
  let sy = y;
  for (const [w, h, c] of steps) {
    g.fillStyle(dim(c, 0.3), 1); g.fillRect(x - w / 2, sy - h, w, h);
    g.fillStyle(c, 1); g.fillRect(x - w / 2, sy - h, w, h - 4);
    g.fillStyle(lit(c, 0.25), 1); g.fillRect(x - w / 2, sy - h, w, 2);
    for (let bx = x - w / 2 + 20; bx < x + w / 2; bx += 32 + rng() * 10) { g.fillStyle(dim(c, 0.4), 0.7); g.fillRect(bx, sy - h + 2, 1.5, h - 6); }
    sy -= h;
  }
  // The column: fluted brass on a square foot.
  const colTop = sy - 170;
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 22, sy - 16, 44, 16);
  g.fillStyle(BRASS, 1); g.fillRect(x - 20, sy - 16, 40, 12);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 13, colTop, 26, sy - 16 - colTop);
  g.fillStyle(BRASS, 1); g.fillRect(x - 11, colTop, 22, sy - 16 - colTop);
  for (let k = -8; k <= 8; k += 4) { g.fillStyle(k < 0 ? BRASS_LIT : BRASS_DARK, 0.55); g.fillRect(x + k, colTop + 4, 1.5, sy - 24 - colTop); }
  // The dial on the column: white enamel, the needle well over toward the Regent.
  const dy = sy - 80;
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, dy, 19);
  g.fillStyle(0xf0e8d8, 1); g.fillCircle(x, dy, 15);
  for (let k = -4; k <= 4; k++) {
    const a = -Math.PI / 2 + k * 0.28;
    g.lineStyle(1, 0x3a3020, 1); g.lineBetween(x + Math.cos(a) * 11, dy + Math.sin(a) * 11, x + Math.cos(a) * 14, dy + Math.sin(a) * 14);
  }
  g.lineStyle(2, 0x9a2a1a, 1); g.lineBetween(x, dy, x + Math.cos(-Math.PI / 2 + 0.85) * 13, dy + Math.sin(-Math.PI / 2 + 0.85) * 13);
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, dy, 2.5);
  // The beam, tipped: the Regent's end (right) down, the household's (left) up.
  const tilt = 0.12;
  const half = 190;
  const lx = x - Math.cos(tilt) * half, ly = colTop - Math.sin(-tilt) * half - 4;
  const rx = x + Math.cos(tilt) * half, ry = colTop + Math.sin(tilt) * half;
  g.lineStyle(14, BRASS_DARK, 1); g.lineBetween(lx, ly, rx, ry);
  g.lineStyle(10, BRASS, 1); g.lineBetween(lx, ly - 1, rx, ry - 1);
  g.lineStyle(2, BRASS_LIT, 0.8); g.lineBetween(lx + 6, ly - 4, rx - 6, ry - 4);
  // Fulcrum: a knife-edge in a cradle, with the trilithon cast on its cap.
  g.fillStyle(BRASS_DARK, 1); g.fillTriangle(x - 18, colTop + 8, x + 18, colTop + 8, x, colTop - 18);
  g.fillStyle(BRASS, 1); g.fillTriangle(x - 13, colTop + 5, x + 13, colTop + 5, x, colTop - 13);
  gravaneSeal(g, x, colTop - 30, 10, BRASS_DARK, 1);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, colTop - 46, 4);
  // Pans: hung on three chains each, the household's high, the Regent's low.
  const pan = (px: number, top: number, py: number, contents: (cx: number, cy: number) => void): void => {
    for (const ox of [-40, 0, 40]) {
      g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(px, top, px + ox, py - 10);
      for (let k = 0; k < 8; k++) {
        const t = k / 8;
        g.fillStyle(BRASS, 1); g.fillEllipse(px + ox * t, top + (py - 10 - top) * t, 3, 4);
      }
    }
    contents(px, py - 10);
    g.fillStyle(BRASS_DARK, 1); g.fillEllipse(px, py, 104, 26);
    g.fillStyle(BRASS, 1); g.fillEllipse(px, py - 2, 98, 20);
    g.fillStyle(BRASS_LIT, 0.5); g.fillEllipse(px - 20, py - 5, 40, 5);
    g.fillStyle(0x000000, 0.25); g.fillEllipse(px, py + 26, 90, 14);
  };
  pan(lx, ly, y - 64, (cx, cy) => {
    // The household's block, and the spalls they scraped together to make it up.
    g.fillStyle(SAND_DARK, 1); g.fillRect(cx - 24, cy - 26, 48, 26);
    g.fillStyle(SANDSTONE, 1); g.fillRect(cx - 24, cy - 26, 48, 22);
    g.fillStyle(SAND_LIT, 1); g.fillRect(cx - 24, cy - 26, 48, 3);
    g.lineStyle(1, SAND_DARK, 1); g.strokeCircle(cx, cy - 14, 4);
    for (let i = 0; i < 6; i++) { g.fillStyle(LIME, 1); g.fillRect(cx + 26 + (i % 3) * 5, cy - 6 - Math.floor(i / 3) * 4, 4, 3); }
  });
  pan(rx, ry, y - 18, (cx, cy) => {
    // The Regent's weights: black basalt cubes, each with the seal in brass.
    const cubes: [number, number][] = [[-28, 0], [0, 0], [28, 0], [-14, -22], [14, -22]];
    for (const [ox, oy] of cubes) {
      g.fillStyle(0x1e1c1c, 1); g.fillRect(cx + ox - 12, cy + oy - 22, 24, 22);
      g.fillStyle(BASALT, 1); g.fillRect(cx + ox - 12, cy + oy - 22, 24, 18);
      g.fillStyle(0x5a5452, 1); g.fillRect(cx + ox - 12, cy + oy - 22, 24, 2);
      gravaneSeal(g, cx + ox, cy + oy - 12, 5, BRASS, 0.9);
    }
  });
  // The short-cage: an iron birdcage of a thing on a hook off the Regent's end of the beam.
  const cx = rx + 54, cyTop = ry + 6;
  g.lineStyle(2, IRON, 1); g.lineBetween(rx - 8, ry, cx, cyTop); g.lineBetween(cx, cyTop, cx, cyTop + 26);
  g.fillStyle(IRON, 1); g.fillEllipse(cx, cyTop + 28, 30, 10);
  for (let k = -12; k <= 12; k += 6) { g.lineStyle(1.5, IRON, 1); g.lineBetween(cx + k * 0.4, cyTop + 28, cx + k, cyTop + 92); }
  g.lineStyle(2, IRON, 1); g.strokeEllipse(cx, cyTop + 92, 28, 8);
  g.lineStyle(1, IRON_LIT, 0.6); g.strokeEllipse(cx, cyTop + 60, 24, 7);
}

/**
 * A treadwheel crane — the great wheel a quarryman walks inside like a mouse to wind the rope — on
 * a timber deck, with a jib and pulley leaning out over the water. `face` +1 leans the jib right.
 */
export function treadCrane(g: G, x: number, y: number, face: 1 | -1, rng: () => number): void {
  shadow(g, x, y + 4, 150, 34);
  // The deck: heavy baulks on a sandstone footing.
  g.fillStyle(SAND_DARK, 1); g.fillRect(x - 60, y - 10, 120, 12);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 56, y - 20, 112, 12);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 56, y - 22, 112, 6);
  // The wheel: a double rim of planks, spokes, and the treads inside.
  const wx = x - face * 14, wy = y - 70, R = 48;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(wx - 6, wy, 12, 50);
  for (const off of [-4, 4]) {
    g.lineStyle(6, off < 0 ? TIMBER_DARK : TIMBER, 1); g.strokeCircle(wx + off, wy, R);
  }
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    g.lineStyle(2.5, TIMBER_DARK, 1); g.lineBetween(wx, wy, wx + Math.cos(a) * R, wy + Math.sin(a) * R);
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(wx + Math.cos(a) * (R - 3) - 3, wy + Math.sin(a) * (R - 3) - 2, 6, 4);
  }
  g.fillStyle(IRON, 1); g.fillCircle(wx, wy, 7);
  g.fillStyle(IRON_LIT, 1); g.fillCircle(wx - 1, wy - 1, 3);
  // The post and jib: a raked spar out over the edge, braced back to the deck.
  const px = x + face * 34;
  const tipX = px + face * 88, tipY = y - 170;
  g.lineStyle(9, TIMBER_DARK, 1); g.lineBetween(px, y - 20, tipX, tipY);
  g.lineStyle(6, TIMBER, 1); g.lineBetween(px, y - 21, tipX, tipY - 1);
  g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(x - face * 50, y - 20, tipX - face * 30, tipY + 40);
  for (let k = 0; k < 4; k++) { const t = 0.2 + k * 0.2; g.fillStyle(IRON, 1); g.fillRect(px + (tipX - px) * t - 3, y - 20 + (tipY - y + 20) * t - 2, 6, 4); }
  // The pulley block at the tip, the rope running back down to the wheel's axle.
  g.fillStyle(IRON, 1); g.fillCircle(tipX, tipY, 7);
  g.fillStyle(TIMBER_LIT, 1); g.fillCircle(tipX, tipY, 3);
  g.lineStyle(1.5, ROPE, 1); g.lineBetween(tipX, tipY, wx, wy);
  // Dust worn into the treads; a pair of boots left on the deck.
  g.fillStyle(DUST, 0.4); g.fillEllipse(wx, wy + R - 6, 40, 6);
  g.fillStyle(0x2a2018, 1); g.fillEllipse(x + face * 10, y - 22, 8, 4); g.fillEllipse(x + face * 18, y - 22, 8, 4);
  // A dust-cloth hung on a spoke to keep the grit out of the axle.
  const ca = rng() * Math.PI * 2;
  g.fillStyle(0xb8a888, 0.9); g.fillRect(wx + Math.cos(ca) * (R - 16) - 4, wy + Math.sin(ca) * (R - 16), 8, 12);
}

/** A flat stone barge, low in the water under a load of blocks, a tiller at the stern. */
export function stoneBarge(g: G, x: number, y: number, w: number, rng: () => number): void {
  g.fillStyle(SEA_DEEP, 0.6); g.fillEllipse(x, y + 6, w + 30, 26);
  g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(x - w / 2, y - 22, w, 30, 10);
  g.fillStyle(TIMBER, 1); g.fillRoundedRect(x - w / 2 + 4, y - 22, w - 8, 18, 8);
  for (let k = 0; k < 4; k++) { g.lineStyle(1, TIMBER_DARK, 0.7); g.lineBetween(x - w / 2 + 8, y - 16 + k * 5, x + w / 2 - 8, y - 16 + k * 5); }
  g.fillStyle(FOAM, 0.4); g.fillEllipse(x - w / 2 + 4, y + 6, 20, 5);
  blockStack(g, x - 10, y - 14, 4, 2, 15, LIME, rng);
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x + w / 2 - 6, y - 16, x + w / 2 + 20, y - 26);
  g.fillStyle(IRON, 1); g.fillCircle(x - w / 2 + 10, y - 20, 3);
}

/**
 * A house cut into the face: a dark rectangle of doorway under a dressed lintel, a shuttered
 * window, a lamp bracket — and above the door, a plaque where the street name has been chiselled
 * smooth by the Regent's order. `x,y` = foot of the face at the doorway.
 */
export function rockHouse(g: G, x: number, y: number, w: number, h: number, o: { glow?: number; wash?: number; plaque?: boolean; steps?: boolean }, rng: () => number): void {
  const x0 = x - w / 2;
  // A dressed front: the face squared off flat where the house is.
  g.fillStyle(dim(o.wash ?? SANDSTONE, 0.25), 1); g.fillRect(x0 - 4, y - h - 4, w + 8, h + 4);
  g.fillStyle(o.wash ?? SANDSTONE, 1); g.fillRect(x0, y - h, w, h);
  for (let k = 0; k < h / 9; k++) { g.lineStyle(1, dim(o.wash ?? SANDSTONE, 0.15), 0.5); g.lineBetween(x0, y - h + 4 + k * 9, x0 + w, y - h + 4 + k * 9); }
  // Doorway and lintel.
  const dw = Math.min(28, w * 0.3), dh = Math.min(h - 10, 40);
  g.fillStyle(0x1a140e, 1); g.fillRect(x - dw / 2, y - dh, dw, dh);
  if (o.glow) { g.fillStyle(o.glow, 0.35); g.fillRect(x - dw / 2 + 3, y - dh + 6, dw - 6, dh - 6); }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - dw / 2 + 2, y - dh + 2, dw / 2 - 2, dh - 2);
  g.fillStyle(LIME, 1); g.fillRect(x - dw / 2 - 6, y - dh - 8, dw + 12, 8);
  g.fillStyle(LIME_DARK, 1); g.fillRect(x - dw / 2 - 6, y - dh - 2, dw + 12, 2);
  // Window with a slatted shutter half open.
  const wx = x + dw / 2 + (w / 2 - dw / 2) / 2;
  if (w > 70) {
    g.fillStyle(0x1a140e, 1); g.fillRect(wx - 8, y - dh, 16, 14);
    if (o.glow) { g.fillStyle(o.glow, 0.6); g.fillRect(wx - 6, y - dh + 2, 12, 10); }
    g.fillStyle(TIMBER, 1); g.fillRect(wx - 16, y - dh - 1, 8, 16);
    for (let k = 0; k < 4; k++) { g.lineStyle(1, TIMBER_DARK, 1); g.lineBetween(wx - 16, y - dh + 2 + k * 4, wx - 8, y - dh + 2 + k * 4); }
    // A window-box of hardy grey succulents.
    g.fillStyle(SAND_DARK, 1); g.fillRect(wx - 10, y - dh + 14, 20, 5);
    for (let k = 0; k < 4; k++) { g.fillStyle(0x7a8a6a, 1); g.fillCircle(wx - 7 + k * 5, y - dh + 13, 2.5); }
  }
  // The chiselled-out plaque: a frame with nothing in it but tool-marks.
  if (o.plaque !== false) {
    const py = y - dh - 22;
    g.fillStyle(LIME_DARK, 1); g.fillRect(x - 22, py - 7, 44, 13);
    g.fillStyle(LIME, 1); g.fillRect(x - 20, py - 5, 40, 9);
    for (let k = 0; k < 9; k++) { g.lineStyle(1, LIME_DARK, 0.7); g.lineBetween(x - 18 + k * 4.4, py - 4, x - 16 + k * 4.4 + rng() * 2, py + 3); }
  }
  // A lamp on a bracket by the door.
  g.lineStyle(2, IRON, 1); g.lineBetween(x - dw / 2 - 10, y - dh + 4, x - dw / 2 - 18, y - dh + 4);
  g.fillStyle(IRON, 1); g.fillRect(x - dw / 2 - 22, y - dh + 4, 8, 10);
  g.fillStyle(o.glow ?? 0x5a4a3a, o.glow ? 0.95 : 0.6); g.fillRect(x - dw / 2 - 21, y - dh + 6, 6, 6);
  if (o.glow) glow(g, x - dw / 2 - 18, y - dh + 9, 18, o.glow, 0.05, 3);
  if (o.steps) {
    g.fillStyle(LIME, 1); g.fillRect(x - dw / 2 - 4, y, dw + 8, 4);
    g.fillStyle(LIME_DARK, 1); g.fillRect(x - dw / 2 - 8, y + 4, dw + 16, 4);
  }
}

/**
 * The Hearthstone — Quarrymouth's bakery, built round one enormous flat hearthstone that was too
 * heavy to tithe. A beehive oven of fieldstone, domed and smoke-blacked, sits on it; a lean-to of
 * ashlar holds the counter; flatbreads lean against the hearthstone's edge to cool, and a long
 * bread paddle hangs over the door. The sign is a round loaf carved in relief on a millstone.
 */
export function hearthstone(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 6, 300, 50);
  // The hearthstone itself: a huge flat slab, edge showing.
  g.fillStyle(SHALE_DARK, 1); g.fillEllipse(x, y - 4, 290, 46);
  g.fillStyle(SHALE, 1); g.fillEllipse(x, y - 10, 284, 40);
  g.fillStyle(lit(SHALE, 0.2), 0.5); g.fillEllipse(x - 40, y - 16, 160, 12);
  // The lean-to on the left: ashlar walls, a timber roof, a counter hatch.
  const lx = x - 110;
  g.fillStyle(SAND_DARK, 1); g.fillRect(lx - 40, y - 80, 84, 70);
  ashlar(g, { x: lx - 38, y: y - 78, w: 80, h: 64 }, 10, SANDSTONE, SAND_DARK, rng);
  g.fillStyle(TIMBER_DARK, 1); poly(g, [[lx - 48, y - 78], [lx + 52, y - 78], [lx + 44, y - 100], [lx - 40, y - 100]], TIMBER_DARK, 1);
  for (let k = 0; k < 8; k++) { g.lineStyle(1, TIMBER, 1); g.lineBetween(lx - 44 + k * 12, y - 78, lx - 36 + k * 11, y - 99); }
  g.fillStyle(0x1a120a, 1); g.fillRect(lx - 22, y - 60, 44, 24);
  g.fillStyle(EMBER, 0.45); g.fillRect(lx - 20, y - 58, 40, 20);
  g.fillStyle(TIMBER, 1); g.fillRect(lx - 26, y - 38, 52, 6);
  for (let i = 0; i < 4; i++) { g.fillStyle(0xc89058, 1); g.fillEllipse(lx - 16 + i * 11, y - 40, 10, 5); g.fillStyle(0xe8c088, 1); g.fillEllipse(lx - 16 + i * 11, y - 41, 6, 2); }
  // The beehive oven: courses of rounded fieldstone stepping in to a dome.
  const ox = x + 30, oy = y - 20;
  for (let c = 0; c < 9; c++) {
    const cw = 150 - c * c * 1.6, cy = oy - c * 13;
    if (cw < 20) break;
    for (let sx = ox - cw / 2; sx < ox + cw / 2; sx += 13) {
      const sc = mixC(GRANITE, rng() < 0.5 ? SANDSTONE : SHALE, rng() * 0.6);
      g.fillStyle(dim(sc, 0.4), 1); g.fillEllipse(sx + 6, cy, 14, 13);
      g.fillStyle(sc, 1); g.fillEllipse(sx + 6, cy - 1, 12, 10);
    }
  }
  // Smoke-black up the front where the flue breathes; the oven mouth, glowing.
  g.fillStyle(0x1a1410, 0.45); g.fillEllipse(ox, oy - 70, 60, 70);
  g.fillStyle(0x140c08, 1); g.fillEllipse(ox, oy - 14, 50, 36);
  g.fillStyle(HEARTH, 0.95); g.fillEllipse(ox, oy - 12, 40, 26);
  g.fillStyle(0xffd88a, 0.95); g.fillEllipse(ox, oy - 6, 24, 10);
  glow(g, ox, oy - 12, 50, HEARTH, 0.05, 4);
  g.fillStyle(LIME, 1); g.fillRect(ox - 30, oy - 34, 60, 6);
  // The flue: a squat chimney of slabs on the crown.
  g.fillStyle(SHALE_DARK, 1); g.fillRect(ox - 10, oy - 132, 20, 26);
  g.fillStyle(SHALE, 1); for (let k = 0; k < 3; k++) g.fillRect(ox - 12, oy - 130 + k * 9, 24, 4);
  // Flatbreads cooling on edge against the hearthstone.
  for (let i = 0; i < 5; i++) {
    const fx = x + 110 + i * 9, fy = y - 18;
    g.fillStyle(0x8a5a2a, 1); g.fillEllipse(fx, fy - 8, 9, 22);
    g.fillStyle(0xd8a868, 1); g.fillEllipse(fx - 1, fy - 9, 6, 18);
    for (let k = 0; k < 3; k++) { g.fillStyle(0x6a3a1a, 0.8); g.fillCircle(fx - 1, fy - 14 + k * 5, 1); }
  }
  // The sign: a millstone with a loaf in relief, on an iron arm.
  g.lineStyle(3, IRON, 1); g.lineBetween(lx + 44, y - 96, lx + 74, y - 96); g.lineBetween(lx + 74, y - 96, lx + 74, y - 88);
  g.fillStyle(GRANITE_DARK, 1); g.fillCircle(lx + 74, y - 70, 18);
  g.fillStyle(GRANITE, 1); g.fillCircle(lx + 74, y - 71, 16);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.lineStyle(1, GRANITE_DARK, 0.8); g.lineBetween(lx + 74 + Math.cos(a) * 5, y - 71 + Math.sin(a) * 5, lx + 74 + Math.cos(a) * 15, y - 71 + Math.sin(a) * 15); }
  g.fillStyle(0xc89058, 1); g.fillEllipse(lx + 74, y - 72, 16, 9);
  g.fillStyle(0x8a5a2a, 1); g.fillRect(lx + 68, y - 74, 1.5, 4); g.fillRect(lx + 73, y - 75, 1.5, 4); g.fillRect(lx + 78, y - 74, 1.5, 4);
  // The bread paddle hung over the lean-to door.
  g.lineStyle(2.5, TIMBER_LIT, 1); g.lineBetween(lx - 30, y - 92, lx + 10, y - 84);
  g.fillStyle(TIMBER_LIT, 1); g.fillEllipse(lx + 18, y - 82, 22, 12);
}

/**
 * The Chock & Chisel — the general store, a two-storey house built of tithe-rejected blocks (every
 * one a different stone, so the walls are patchwork), with a striped awning, barrels of lamp-oil,
 * coils of rope, and a giant wooden chisel for a sign.
 */
export function chockShop(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 6, 240, 40);
  const w = 200, h = 130, x0 = x - w / 2;
  // Patchwork walls: rejected blocks of every bed.
  const cols = [SANDSTONE, LIME, SHALE, GRANITE, SAND_LIT, mixC(SANDSTONE, SHALE, 0.5)];
  for (let r = 0; r < 10; r++) {
    let bx = x0 - (r % 2) * 9;
    while (bx < x0 + w) {
      const bw = 16 + rng() * 18;
      const c = cols[Math.floor(rng() * cols.length)];
      const ax = Math.max(x0, bx), ax1 = Math.min(x0 + w, bx + bw - 1);
      g.fillStyle(dim(c, 0.3), 1); g.fillRect(ax, y - (r + 1) * 13, ax1 - ax, 13);
      g.fillStyle(c, 1); g.fillRect(ax, y - (r + 1) * 13, ax1 - ax, 11);
      bx += bw;
    }
  }
  // A flat roof with a parapet and a pulley-arm for hoisting stock.
  g.fillStyle(SAND_DARK, 1); g.fillRect(x0 - 6, y - h - 10, w + 12, 12);
  for (let k = 0; k < 10; k++) { g.fillStyle(SANDSTONE, 1); g.fillRect(x0 - 4 + k * 21, y - h - 18, 12, 8); }
  g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(x0 + 30, y - h - 10, x0 + 30, y - h - 40); g.lineBetween(x0 + 30, y - h - 40, x0 + 6, y - h - 40);
  g.lineStyle(1, ROPE, 1); g.lineBetween(x0 + 8, y - h - 40, x0 + 8, y - h + 16);
  g.fillStyle(TIMBER, 1); g.fillRect(x0 + 2, y - h + 16, 12, 10);
  // Upper windows.
  for (const wx of [x - 50, x + 50]) {
    g.fillStyle(0x1a140e, 1); g.fillRect(wx - 12, y - 108, 24, 20);
    g.fillStyle(EMBER, 0.5); g.fillRect(wx - 10, y - 106, 20, 16);
    g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(wx, y - 108, wx, y - 88); g.lineBetween(wx - 12, y - 98, wx + 12, y - 98);
  }
  // Door and a wide display window under a striped awning.
  g.fillStyle(0x1a140e, 1); g.fillRect(x - 16, y - 46, 32, 46);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 14, y - 44, 28, 44);
  g.fillStyle(BRASS, 1); g.fillCircle(x + 8, y - 22, 2);
  g.fillStyle(0x1a140e, 1); g.fillRect(x + 30, y - 50, 56, 32);
  g.fillStyle(EMBER, 0.35); g.fillRect(x + 32, y - 48, 52, 28);
  // Goods in the window: a lamp, a coil of rope, a stack of chisels.
  g.fillStyle(BRASS, 1); g.fillRect(x + 38, y - 34, 8, 12);
  g.lineStyle(2, ROPE, 1); g.strokeCircle(x + 58, y - 28, 6); g.strokeCircle(x + 58, y - 28, 3);
  for (let k = 0; k < 3; k++) { g.lineStyle(2, IRON_LIT, 1); g.lineBetween(x + 70 + k * 4, y - 22, x + 72 + k * 4, y - 40); }
  for (let k = 0; k < 9; k++) {
    poly(g, [[x - 96 + k * 21, y - 62], [x - 75 + k * 21, y - 62], [x - 72 + k * 21, y - 48], [x - 99 + k * 21, y - 48]], k % 2 ? 0xc8b088 : REGENT, 1);
  }
  g.fillStyle(0x000000, 0.2); g.fillRect(x - 100, y - 48, 200, 4);
  // Barrels, rope coils and a crate out front.
  for (const [bx, s] of [[x - 80, 1], [x - 62, 0.9]] as [number, number][]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(bx - 8 * s, y - 22 * s, 16 * s, 22 * s, 4);
    g.fillStyle(TIMBER, 1); g.fillRoundedRect(bx - 7 * s, y - 21 * s, 14 * s, 20 * s, 4);
    g.fillStyle(IRON, 1); g.fillRect(bx - 8 * s, y - 18 * s, 16 * s, 2); g.fillRect(bx - 8 * s, y - 6 * s, 16 * s, 2);
  }
  g.lineStyle(3, ROPE, 1); g.strokeEllipse(x + 94, y - 6, 22, 8); g.strokeEllipse(x + 94, y - 10, 18, 6);
  // The sign: a giant wooden chisel on chains.
  g.lineStyle(1.5, IRON, 1); g.lineBetween(x - 30, y - 70, x - 30, y - 64); g.lineBetween(x + 10, y - 70, x + 10, y - 64);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 40, y - 72, 22, 9);
  g.fillStyle(IRON_LIT, 1); poly(g, [[x - 18, y - 72], [x + 18, y - 70], [x + 22, y - 67], [x + 18, y - 64], [x - 18, y - 63]], IRON_LIT, 1);
  g.fillStyle(lit(IRON_LIT, 0.4), 1); g.fillRect(x - 16, y - 71, 30, 1.5);
}

/**
 * Lode & Line — the tackle shop: a timber shack on a granite footing at the head of the crane
 * pier, nets drying on its gable, rods racked along the wall, and a lead sinker the size of a
 * barrel hung over the door. Silas keeps a bucket of sand by the step for testing delver rods.
 */
export function tackleShack(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 6, 190, 34);
  g.fillStyle(GRANITE_DARK, 1); g.fillRect(x - 84, y - 14, 168, 14);
  g.fillStyle(GRANITE, 1); for (let k = 0; k < 7; k++) g.fillRect(x - 82 + k * 24, y - 13, 22, 10);
  // Weatherboard walls.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 78, y - 88, 156, 74);
  for (let k = 0; k < 9; k++) { g.fillStyle(k % 2 ? TIMBER : mixC(TIMBER, TIMBER_LIT, 0.4), 1); g.fillRect(x - 76, y - 86 + k * 8, 152, 7); }
  // A pitched roof of slate.
  poly(g, [[x - 90, y - 86], [x + 90, y - 86], [x + 60, y - 132], [x - 60, y - 132]], SHALE_DARK, 1);
  for (let r = 0; r < 5; r++) for (let k = 0; k < 14; k++) {
    const sx = x - 84 + r * 6 + k * (168 - r * 12) / 14;
    g.fillStyle(rng() < 0.5 ? SHALE : mixC(SHALE, REGENT, 0.2), 1); g.fillRect(sx, y - 94 - r * 8, 10, 6);
  }
  // Net draped on the gable end, with cork floats.
  g.lineStyle(1, ROPE, 0.6);
  for (let k = 0; k < 8; k++) { g.lineBetween(x + 40 + k * 5, y - 128 + k * 4, x + 40 + k * 5, y - 60); g.lineBetween(x + 40, y - 120 + k * 8, x + 80, y - 116 + k * 8); }
  for (let k = 0; k < 5; k++) { g.fillStyle(0xd8a050, 1); g.fillEllipse(x + 42 + k * 9, y - 124 + k * 4, 6, 4); }
  // Rods racked along the wall.
  for (let k = 0; k < 6; k++) {
    g.lineStyle(2, [TIMBER_LIT, 0x8a6a4a, IRON_LIT, 0xc8c0a0, TIMBER_LIT, 0x3a3a3e][k], 1);
    g.lineBetween(x - 70 + k * 7, y - 16, x - 66 + k * 7, y - 108);
  }
  // The door, and the barrel-sized lead sinker hung over it.
  g.fillStyle(0x1a140e, 1); g.fillRect(x - 6, y - 56, 28, 42);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 4, y - 54, 12, 40);
  g.lineStyle(2, IRON, 1); g.lineBetween(x + 8, y - 86, x + 8, y - 72);
  g.fillStyle(0x6a6c74, 1); poly(g, [[x + 8, y - 74], [x + 20, y - 62], [x + 8, y - 44], [x - 4, y - 62]], 0x6a6c74, 1);
  g.fillStyle(0x9a9ca4, 1); poly(g, [[x + 8, y - 72], [x + 14, y - 62], [x + 8, y - 54], [x + 3, y - 62]], 0x9a9ca4, 1);
  // A window with a jar of worms on the sill, and the sand bucket by the step.
  g.fillStyle(0x1a140e, 1); g.fillRect(x + 34, y - 66, 22, 18);
  g.fillStyle(EMBER, 0.45); g.fillRect(x + 36, y - 64, 18, 14);
  g.fillStyle(0xc8d0c0, 0.6); g.fillRect(x + 40, y - 52, 8, 6);
  g.fillStyle(IRON, 1); g.fillRect(x - 32, y - 14, 18, 14);
  g.fillStyle(SAND_LIT, 1); g.fillEllipse(x - 23, y - 14, 18, 5);
}

/**
 * A boat on the stocks: a half-built hull on a timber slip, ribs showing at the bow, planks
 * running back to a finished stern; a sawhorse and a pot of pitch beside it.
 */
export function boatOnStocks(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 220, 30);
  // The cradle.
  for (const ox of [-70, -20, 30, 80]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + ox - 4, y - 24, 8, 24); }
  g.fillStyle(TIMBER, 1); g.fillRect(x - 90, y - 26, 180, 5);
  // Hull: planked stern half, ribs at the bow.
  const hull = (t: number): number => 26 * Math.sin(Math.PI * (0.08 + t * 0.84));
  for (let k = 0; k < 40; k++) {
    const t = k / 40, hx = x - 90 + t * 180, hh = hull(t);
    if (t < 0.55) {
      g.fillStyle(k % 2 ? TIMBER : TIMBER_LIT, 1); g.fillRect(hx, y - 30 - hh, 5, hh);
    } else if (k % 3 === 0) {
      g.lineStyle(2.5, TIMBER_LIT, 1); g.lineBetween(hx, y - 30, hx - 3, y - 30 - hh);
    }
  }
  g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(x - 92, y - 30, x + 92, y - 30);
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x + 92, y - 30, x + 100, y - 70);
  g.lineStyle(2, TIMBER, 1); for (let k = 0; k < 4; k++) g.lineBetween(x - 88, y - 36 - k * 5, x + 8, y - 34 - k * 6);
  // Sawhorse with a plank, and the pitch pot on a little fire.
  g.lineStyle(2.5, TIMBER_DARK, 1); g.lineBetween(x - 120, y, x - 110, y - 18); g.lineBetween(x - 100, y, x - 110, y - 18);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 140, y - 20, 60, 4);
  g.fillStyle(IRON, 1); g.fillEllipse(x + 120, y - 10, 18, 14);
  g.fillStyle(0x0a0806, 1); g.fillEllipse(x + 120, y - 15, 14, 4);
  g.fillStyle(HEARTH, 0.8); g.fillTriangle(x + 114, y - 2, x + 126, y - 2, x + 120, y - 8 - rng() * 2);
}

/**
 * The lift's headframe at the quarry rim: two timber trestles carrying a great iron winding wheel,
 * a brake lever, and a ratchet. The cage itself is drawn live (see `liftCage`).
 */
export function headframe(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 120, 26);
  for (const ox of [-36, 36]) {
    g.lineStyle(7, TIMBER_DARK, 1); g.lineBetween(x + ox, y, x + ox * 0.4, y - 120);
    g.lineStyle(4, TIMBER, 1); g.lineBetween(x + ox, y - 1, x + ox * 0.4, y - 121);
  }
  g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(x - 30, y - 40, x + 30, y - 40); g.lineBetween(x - 22, y - 80, x + 22, y - 80);
  g.lineBetween(x - 30, y - 40, x + 22, y - 80); g.lineBetween(x + 30, y - 40, x - 22, y - 80);
  g.fillStyle(IRON, 1); g.fillRect(x - 20, y - 128, 40, 8);
  g.lineStyle(5, IRON, 1); g.strokeCircle(x, y - 140, 26);
  g.lineStyle(2, IRON_LIT, 1); g.strokeCircle(x, y - 140, 23);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.lineStyle(2, IRON, 1); g.lineBetween(x, y - 140, x + Math.cos(a) * 24, y - 140 + Math.sin(a) * 24); }
  g.fillStyle(BRASS, 1); g.fillCircle(x, y - 140, 4);
  // Brake lever with a worn grip; a slate tally board of rides.
  g.lineStyle(3, IRON, 1); g.lineBetween(x + 40, y - 6, x + 54, y - 52);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x + 50, y - 60, 8, 10);
  g.fillStyle(SHALE_DARK, 1); g.fillRect(x - 70, y - 50, 26, 34);
  for (let k = 0; k < 5; k++) { g.lineStyle(1, LIME, 0.9); g.lineBetween(x - 66 + k * 4, y - 44, x - 66 + k * 4, y - 30); }
  g.lineStyle(1, LIME, 0.9); g.lineBetween(x - 68, y - 32, x - 46, y - 42);
}

/** The lift cage: an iron lattice box with a timber floor and a lantern, `y` = its floor. */
export function liftCage(g: G, x: number, y: number, lamp: number): void {
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 4, 56, 12);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 24, y - 4, 48, 6);
  g.lineStyle(2, IRON, 1); g.strokeRect(x - 22, y - 52, 44, 48);
  for (let k = -16; k <= 16; k += 8) { g.lineStyle(1.5, IRON, 0.9); g.lineBetween(x + k, y - 52, x + k, y - 4); }
  g.lineBetween(x - 22, y - 28, x + 22, y - 28);
  g.fillStyle(IRON, 1); g.fillRect(x - 24, y - 56, 48, 5);
  g.fillStyle(lamp, 0.95); g.fillRect(x - 3, y - 48, 6, 7);
  glow(g, x, y - 44, 18, lamp, 0.05, 3);
}

/**
 * The mason's lodge on the rim: an open-fronted timber shed over a banker (the mason's bench), a
 * half-dressed block on it with a mallet and chisels, templates hung on the back wall — and, on a
 * peg by itself, a row of split stone collars waiting to be closed round someone's neck.
 */
export function masonLodge(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 230, 36);
  // Posts and a lean roof of boards.
  for (const ox of [-100, -34, 34, 100]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + ox - 4, y - 100, 8, 100); }
  poly(g, [[x - 112, y - 100], [x + 112, y - 100], [x + 104, y - 124], [x - 104, y - 124]], TIMBER, 1);
  for (let k = 0; k < 18; k++) { g.lineStyle(1, TIMBER_DARK, 0.9); g.lineBetween(x - 110 + k * 13, y - 100, x - 102 + k * 12, y - 123); }
  // Back wall: templates (thin boards cut to mouldings) on pegs.
  g.fillStyle(dim(TIMBER, 0.3), 1); g.fillRect(x - 96, y - 98, 192, 58);
  for (let k = 0; k < 5; k++) {
    const tx = x - 84 + k * 24;
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(tx, y - 92, 14, 34);
    g.fillStyle(dim(TIMBER, 0.3), 1); g.fillCircle(tx + 14, y - 80 + (k % 2) * 8, 6);
  }
  // The collars: split rings of stone, two halves each, iron pins through the ends.
  for (let k = 0; k < 4; k++) {
    const cx = x + 56 + (k % 2) * 22, cy = y - 84 + Math.floor(k / 2) * 22;
    g.lineStyle(5, GRANITE_DARK, 1); g.strokeCircle(cx, cy, 8);
    g.lineStyle(3, GRANITE, 1); g.strokeCircle(cx, cy - 0.5, 8);
    g.fillStyle(IRON, 1); g.fillCircle(cx - 8, cy, 1.8); g.fillCircle(cx + 8, cy, 1.8);
  }
  // The banker: a stone bench with a block half-dressed, mallet and chisels.
  g.fillStyle(LIME_DARK, 1); g.fillRect(x - 60, y - 30, 120, 30);
  g.fillStyle(LIME, 1); g.fillRect(x - 60, y - 34, 120, 8);
  g.fillStyle(SAND_DARK, 1); g.fillRect(x - 26, y - 62, 50, 30);
  g.fillStyle(SANDSTONE, 1); g.fillRect(x - 26, y - 62, 24, 28);
  g.fillStyle(SAND_LIT, 1); g.fillRect(x - 26, y - 62, 24, 2);
  for (let k = 0; k < 6; k++) { g.lineStyle(1, SAND_DARK, 0.9); g.lineBetween(x + k * 4, y - 60, x + k * 4 + 2, y - 36); }
  g.fillStyle(TIMBER_LIT, 1); g.fillEllipse(x + 42, y - 40, 16, 12);
  g.lineStyle(3, TIMBER, 1); g.lineBetween(x + 42, y - 40, x + 58, y - 30);
  for (let k = 0; k < 3; k++) { g.lineStyle(2, IRON_LIT, 1); g.lineBetween(x - 50 + k * 6, y - 36, x - 46 + k * 6, y - 48); }
  spalls(g, x - 74, y + 2, 10, rng);
}

/**
 * The plaza statue: the Regent in a long coat, one hand out flat as if weighing the air — standing
 * on a plinth set straight down into the paving on top of the Old King's statue, which was not
 * moved, only buried. The Old King's stone head pokes up out of the flags beside the plinth, eyes
 * level with the street, a crown worn smooth.
 */
export function regentStatue(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 110, 26);
  // The Old King's head, half-sunk to the left of the plinth.
  const hx = x - 66, hy = y + 2;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(hx, hy + 2, 52, 14);
  g.fillStyle(GRANITE_DARK, 1); g.fillEllipse(hx, hy - 10, 40, 32);
  g.fillStyle(GRANITE, 1); g.fillEllipse(hx, hy - 12, 36, 28);
  g.fillStyle(lit(GRANITE, 0.2), 0.7); g.fillEllipse(hx - 8, hy - 18, 12, 8);
  g.fillStyle(GRANITE_DARK, 1); g.fillEllipse(hx - 7, hy - 10, 6, 3); g.fillEllipse(hx + 7, hy - 10, 6, 3);
  g.lineStyle(1.5, GRANITE_DARK, 1); g.lineBetween(hx, hy - 8, hx - 1, hy - 3);
  for (let k = 0; k < 5; k++) { g.fillStyle(GRANITE, 1); g.fillTriangle(hx - 14 + k * 7, hy - 24, hx - 10 + k * 7, hy - 33, hx - 6 + k * 7, hy - 24); }
  // Someone keeps leaving a flatbread on his crown.
  g.fillStyle(0xd8a868, 1); g.fillEllipse(hx + 2, hy - 30, 14, 4);
  // The plinth.
  g.fillStyle(SHALE_DARK, 1); g.fillRect(x - 30, y - 50, 60, 50);
  g.fillStyle(SHALE, 1); g.fillRect(x - 28, y - 50, 56, 46);
  g.fillStyle(lit(SHALE, 0.2), 1); g.fillRect(x - 32, y - 56, 64, 8);
  gravaneSeal(g, x, y - 26, 12, BRASS, 0.9);
  // The Regent: a long straight coat, high collar, bare head bowed a little, one hand out flat.
  const top = y - 56;
  poly(g, [[x - 18, top], [x + 18, top], [x + 12, top - 70], [x - 12, top - 70]], REGENT_DARK, 1);
  poly(g, [[x - 14, top], [x + 6, top], [x + 4, top - 66], [x - 10, top - 66]], REGENT, 1);
  g.fillStyle(REGENT_DARK, 1); g.fillRect(x - 13, top - 80, 26, 12);
  g.fillStyle(0x8a8296, 1); g.fillCircle(x, top - 88, 9);
  g.fillStyle(REGENT_DARK, 1); g.fillEllipse(x, top - 94, 18, 6);
  g.lineStyle(5, REGENT_DARK, 1); g.lineBetween(x + 10, top - 64, x + 34, top - 56);
  g.fillStyle(0x8a8296, 1); g.fillEllipse(x + 38, top - 56, 12, 4);
}

/**
 * The interment cart: a low stone-wheeled dray with a barred box on it, a lantern on a pole, and a
 * row of open stone collars hung along the side like horse-brasses.
 */
export function collarCart(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 140, 24);
  for (const wx of [x - 44, x + 44]) {
    g.fillStyle(GRANITE_DARK, 1); g.fillCircle(wx, y - 16, 18);
    g.fillStyle(GRANITE, 1); g.fillCircle(wx, y - 17, 15);
    g.fillStyle(IRON, 1); g.fillCircle(wx, y - 17, 4);
  }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 62, y - 36, 124, 10);
  g.fillStyle(REGENT_DARK, 1); g.fillRect(x - 54, y - 86, 108, 52);
  for (let k = -46; k <= 46; k += 10) { g.lineStyle(2.5, IRON, 1); g.lineBetween(x + k, y - 84, x + k, y - 38); }
  g.fillStyle(IRON, 1); g.fillRect(x - 56, y - 90, 112, 6);
  gravaneSeal(g, x, y - 62, 10, BRASS, 0.85);
  for (let k = 0; k < 4; k++) { g.lineStyle(3, GRANITE, 1); g.strokeCircle(x - 42 + k * 28, y - 28, 6); }
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x - 62, y - 30, x - 104, y - 18);
  g.lineStyle(2, IRON, 1); g.lineBetween(x + 54, y - 90, x + 54, y - 122);
  g.fillStyle(IRON, 1); g.fillRect(x + 48, y - 130, 12, 10);
  g.fillStyle(0x9a8ac8, 0.8); g.fillRect(x + 50, y - 128, 8, 6);
}

/** A two-handed frame saw in a stone block, half way through, the slurry tray under it. */
export function frameSaw(g: G, x: number, y: number): void {
  shadow(g, x, y + 3, 110, 22);
  g.fillStyle(LIME_DARK, 1); g.fillRect(x - 40, y - 34, 80, 34);
  g.fillStyle(LIME, 1); g.fillRect(x - 40, y - 34, 80, 30);
  g.fillStyle(lit(LIME, 0.25), 1); g.fillRect(x - 40, y - 34, 80, 2);
  g.fillStyle(0x3a3020, 1); g.fillRect(x - 1, y - 34, 2, 18);
  g.lineStyle(3, TIMBER, 1); g.strokeRect(x - 54, y - 62, 108, 30);
  g.lineStyle(1.5, IRON_LIT, 1); g.lineBetween(x - 54, y - 18, x + 54, y - 18);
  g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(x - 54, y - 62, x - 54, y - 16); g.lineBetween(x + 54, y - 62, x + 54, y - 16);
  g.fillStyle(SHALE, 1); g.fillRect(x - 46, y - 4, 92, 6);
  g.fillStyle(DUST, 0.9); g.fillEllipse(x, y - 2, 70, 4);
}

/** A stone notice-wall: a slab with the season's Tithe roll cut into it, short names crossed through. */
export function titheRoll(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 3, 90, 18);
  g.fillStyle(SHALE_DARK, 1); g.fillRect(x - 40, y - 76, 80, 76);
  g.fillStyle(LIME, 1); g.fillRect(x - 36, y - 72, 72, 66);
  gravaneSeal(g, x, y - 62, 6, REGENT, 0.9);
  for (let k = 0; k < 9; k++) {
    const ly = y - 52 + k * 5.5, lw = 30 + rng() * 26;
    g.lineStyle(1, LIME_DARK, 1); g.lineBetween(x - 30, ly, x - 30 + lw, ly);
    if (rng() < 0.3) { g.lineStyle(1.5, 0x8a2a1a, 0.8); g.lineBetween(x - 32, ly, x - 26 + lw, ly); }
  }
}
