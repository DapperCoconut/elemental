import Phaser from 'phaser';
import type { Pt } from '../../../../IslesTypes';
import { dim, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import {
  BRASS, CANVAS, CANVAS_OLD, CANVAS_SHADE, CHALK, HEMP, HEMP_DARK, HEM_GOLD, HEM_VELVET, IRON, OAK,
  OAK_DARK, PINE, QUEEN, QUEEN_DARK, RED_THREAD, TAN_SAIL, TAR,
  cleat, dressForm, grommet, patch, peg, polyline, rope, sag, sheet, stitches, tideMark,
} from './art';

/**
 * The Sailmaker's Court's set pieces. Every function draws at a base point (`x,y` = the middle
 * of the piece's foot line) so the area can hand it straight to a y-sorted piece. Functions that
 * own something animated (a pennant, a chimney, a mast-head) return the point it should play at.
 */

type Rng = () => number;

// ── Timber ───────────────────────────────────────────────────────────

/** Tarred weatherboard: overlapping horizontal boards, each with a lit lip and a dark lap. */
function weatherboard(g: G, x0: number, y0: number, w: number, h: number, wood: number, rng: Rng): void {
  g.fillStyle(wood, 1); g.fillRect(x0, y0, w, h);
  for (let y = y0 + 9; y < y0 + h; y += 9) {
    g.fillStyle(dim(wood, 0.35), 0.9); g.fillRect(x0, y, w, 2);
    g.fillStyle(lit(wood, 0.12), 0.6); g.fillRect(x0, y + 2, w, 1);
  }
  for (let i = 0; i < (w * h) / 500; i++) {
    g.fillStyle(rng() < 0.5 ? dim(wood, 0.18) : lit(wood, 0.08), 0.45);
    g.fillRect(x0 + rng() * (w - 8), y0 + rng() * (h - 4), 6 + rng() * 14, 1.5);
  }
}

/** A small sash window; `glow` 0 for dark glass. */
function sash(g: G, x: number, y: number, w: number, h: number, frame: number, glow = 0): void {
  g.fillStyle(frame, 1); g.fillRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4);
  if (glow) {
    g.fillStyle(glow, 0.12); g.fillCircle(x, y, w * 1.1);
    g.fillStyle(glow, 0.9); g.fillRect(x - w / 2, y - h / 2, w, h);
  } else {
    g.fillStyle(0x24343c, 1); g.fillRect(x - w / 2, y - h / 2, w, h);
    g.fillStyle(0x6a8a96, 0.4); g.fillTriangle(x - w / 2, y - h / 2, x - w / 2 + w * 0.6, y - h / 2, x - w / 2, y + h * 0.1);
  }
  g.fillStyle(frame, 1); g.fillRect(x - w / 2, y - 1, w, 2); g.fillRect(x - 1, y - h / 2, 2, h);
}

// ── Sail lofts ───────────────────────────────────────────────────────

export interface LoftOpts {
  wood: number;
  /** Colour of the sail spilling from the loft door. */
  sail: number;
  /** The loft door hangs open with canvas pouring out (true), or closed. */
  open?: boolean;
  glow?: number;
}

/**
 * A sail loft: a tall gabled timber building, tarred black-brown, with the whole top storey one
 * long open floor where sails are laid out. A hoist beam juts from the gable with a block and
 * fall, and through the loft doors a sail spills down the face of the building to dry.
 * Returns the hoist-beam tip (for the swinging block).
 */
export function sailLoft(g: G, x: number, y: number, w: number, h: number, o: LoftOpts, rng: Rng): Pt {
  shadow(g, x, y + 4, w * 1.2, 24);
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(dim(o.wood, 0.5), 1); g.fillRect(x0 - 2, top - 2, w + 4, h + 4);
  weatherboard(g, x0, top, w, h, o.wood, rng);
  // Corner posts.
  g.fillStyle(dim(o.wood, 0.45), 1); g.fillRect(x0, top, 6, h); g.fillRect(x0 + w - 6, top, 6, h);
  // Gable.
  const rh = w * 0.42;
  g.fillStyle(dim(o.wood, 0.55), 1); g.fillTriangle(x0 - 12, top + 2, x0 + w + 12, top + 2, x, top - rh - 4);
  g.fillStyle(dim(o.wood, 0.15), 1); g.fillTriangle(x0 - 6, top, x0 + w + 6, top, x, top - rh);
  // Barge-boards.
  g.lineStyle(5, dim(o.wood, 0.6), 1);
  g.lineBetween(x0 - 12, top + 2, x, top - rh - 4); g.lineBetween(x, top - rh - 4, x0 + w + 12, top + 2);
  // Hoist beam with block and fall.
  const beamY = top - rh * 0.45;
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 5, beamY - 5, 10, 10);
  g.fillStyle(OAK, 1); g.fillRect(x - 4, beamY - 4, 8, 34);
  const tip = { x: x + 4, y: beamY + 30 };
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 6, beamY - 40, 12, 40);
  g.fillStyle(OAK, 1); g.fillRect(x - 5, beamY - 46, 10, 6);
  // Loft doors at the top storey.
  const dy = top + 16, dh = h * 0.32, dw = w * 0.42;
  g.fillStyle(TAR, 1); g.fillRect(x - dw / 2, dy, dw, dh);
  if (o.open) {
    // Doors swung outward, and the sail pouring through.
    g.fillStyle(dim(o.wood, 0.25), 1);
    g.fillRect(x - dw / 2 - dw * 0.35, dy - 2, dw * 0.33, dh + 4);
    g.fillRect(x + dw / 2 + 2, dy - 2, dw * 0.33, dh + 4);
    const drop = h * 0.62;
    const sw = dw * 0.92;
    const pts = [
      new Phaser.Geom.Point(x - sw / 2, dy + 4),
      new Phaser.Geom.Point(x + sw / 2, dy + 4),
      new Phaser.Geom.Point(x + sw / 2 + 10, dy + drop * 0.6),
      new Phaser.Geom.Point(x + sw / 2 + 4, dy + drop),
      new Phaser.Geom.Point(x - sw / 2 - 6, dy + drop + 6),
      new Phaser.Geom.Point(x - sw / 2 - 12, dy + drop * 0.55),
    ];
    g.fillStyle(dim(o.sail, 0.4), 1); g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x + 3, p.y + 3)), true, true);
    g.fillStyle(o.sail, 1); g.fillPoints(pts, true, true);
    for (let k = 1; k < 4; k++) {
      const fx = x - sw / 2 + (sw / 4) * k;
      g.lineStyle(4, dim(o.sail, 0.13), 0.7); g.lineBetween(fx, dy + 8, fx + (k - 2) * 5, dy + drop - 2);
    }
    stitches(g, x - sw / 2 - 4, dy + drop - 2, x + sw / 2 + 2, dy + drop - 4, RED_THREAD, 1.4, 5, 4);
    for (let k = 0; k < 4; k++) grommet(g, x - sw / 2 + 6 + (sw - 12) * (k / 3), dy + 10, 2.6);
  } else {
    g.fillStyle(dim(o.wood, 0.2), 1);
    g.fillRect(x - dw / 2 + 2, dy + 2, dw / 2 - 3, dh - 4); g.fillRect(x + 1, dy + 2, dw / 2 - 3, dh - 4);
    g.lineStyle(2, dim(o.wood, 0.5), 1);
    g.lineBetween(x - dw / 2 + 4, dy + 4, x - 2, dy + dh - 4); g.lineBetween(x + dw / 2 - 4, dy + 4, x + 2, dy + dh - 4);
  }
  // Ground-floor windows and big double doors.
  const wins = Math.max(2, Math.floor(w / 60));
  for (let i = 0; i < wins; i++) {
    const wx = x0 + (w / (wins + 1)) * (i + 1);
    if (Math.abs(wx - x) < 36) continue;
    sash(g, wx, y - h * 0.4, 18, 22, dim(o.wood, 0.55), o.glow ?? 0);
  }
  g.fillStyle(dim(o.wood, 0.6), 1); g.fillRect(x - 26, y - 50, 52, 50);
  g.fillStyle(dim(o.wood, 0.25), 1); g.fillRect(x - 24, y - 48, 23, 48); g.fillRect(x + 1, y - 48, 23, 48);
  g.lineStyle(1.5, dim(o.wood, 0.55), 1);
  for (const s of [-1, 1]) { g.lineBetween(x + s * 2, y - 46, x + s * 22, y - 2); g.lineBetween(x + s * 22, y - 46, x + s * 2, y - 2); }
  g.fillStyle(IRON, 1); g.fillCircle(x - 5, y - 24, 2); g.fillCircle(x + 5, y - 24, 2);
  return tip;
}

// ── The rope walk ────────────────────────────────────────────────────

/**
 * The walk-house: a long low lean-to roof of tarred boards on posts, open to the south, running
 * the length of the rope walk. Hemp hangs in hanks from its rafters. `x0..x1` its length.
 */
export function walkHouse(g: G, x0: number, x1: number, y: number, rng: Rng): void {
  const roofY = y - 92;
  g.fillStyle(0x000000, 0.25); g.fillRect(x0, y - 6, x1 - x0, 12);
  // Back wall.
  weatherboard(g, x0, roofY - 10, x1 - x0, 92, 0x4a3a2c, rng);
  // Hanks of hemp hanging in the shade.
  for (let hx = x0 + 30; hx < x1 - 20; hx += 46 + rng() * 20) {
    const len = 26 + rng() * 22;
    g.fillStyle(dim(HEMP, 0.25), 1); g.fillRoundedRect(hx - 5, roofY + 6, 10, len, 4);
    g.fillStyle(HEMP, 1); g.fillRoundedRect(hx - 4, roofY + 6, 7, len - 2, 3);
    g.lineStyle(1, HEMP_DARK, 0.8); g.lineBetween(hx - 4, roofY + 12, hx + 3, roofY + 12);
  }
  // Posts.
  for (let px = x0 + 4; px <= x1 - 4; px += 64) {
    g.fillStyle(OAK_DARK, 1); g.fillRect(px - 4, roofY, 8, 92);
    g.fillStyle(OAK, 1); g.fillRect(px - 3, roofY, 4, 92);
  }
  // The lean-to roof.
  g.fillStyle(dim(TAR, 0.2), 1); g.fillRect(x0 - 10, roofY - 26, x1 - x0 + 20, 26);
  g.fillStyle(0x3a3430, 1); g.fillRect(x0 - 10, roofY - 26, x1 - x0 + 20, 20);
  for (let bx = x0 - 10; bx < x1 + 10; bx += 18) {
    g.fillStyle(lit(0x3a3430, 0.08), 0.8); g.fillRect(bx, roofY - 26, 2, 20);
  }
  g.fillStyle(lit(0x3a3430, 0.2), 1); g.fillRect(x0 - 10, roofY - 8, x1 - x0 + 20, 3);
}

/** A stake-head: the T-post every few yards along a rope walk that holds the yarns off the ground. */
export function stakeHead(g: G, x: number, y: number): void {
  shadow(g, x, y + 1, 18, 5, 0.25);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 3, y - 34, 6, 34);
  g.fillStyle(OAK, 1); g.fillRect(x - 2, y - 34, 3, 34);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 16, y - 38, 32, 6);
  g.fillStyle(PINE, 1); g.fillRect(x - 15, y - 37, 30, 3);
  for (let i = -2; i <= 2; i++) { g.fillStyle(PINE, 1); g.fillRect(x + i * 6 - 1, y - 44, 2, 7); }
}

/**
 * The spinning jack: a great spoked wheel on a frame with a row of whirl-hooks on its face, where
 * yarns are twisted into strands. Returns the hub (the wheel turns in `animateOver`).
 */
export function spinningJack(g: G, x: number, y: number): Pt {
  shadow(g, x, y + 3, 110, 22);
  g.fillStyle(OAK_DARK, 1);
  g.fillRect(x - 44, y - 16, 88, 16);
  g.fillTriangle(x - 40, y - 8, x - 18, y - 8, x - 6, y - 96);
  g.fillTriangle(x + 40, y - 8, x + 18, y - 8, x + 6, y - 96);
  g.fillStyle(OAK, 1);
  g.fillTriangle(x - 36, y - 10, x - 22, y - 10, x - 7, y - 92);
  g.fillTriangle(x + 36, y - 10, x + 22, y - 10, x + 7, y - 92);
  // Whirl-hooks on the front board.
  g.fillStyle(PINE, 1); g.fillRect(x - 40, y - 46, 80, 12);
  for (let i = 0; i < 5; i++) {
    g.lineStyle(2, IRON, 1); g.beginPath(); g.arc(x - 30 + i * 15, y - 30, 4, 0, Math.PI, false); g.strokePath();
  }
  return { x, y: y - 92 };
}

/** Draw the spinning jack's wheel at an angle (animated). */
export function jackWheel(g: G, hub: Pt, angle: number): void {
  const R = 46;
  g.lineStyle(6, OAK_DARK, 1); g.strokeCircle(hub.x, hub.y, R);
  g.lineStyle(3, OAK, 1); g.strokeCircle(hub.x, hub.y, R - 1);
  for (let i = 0; i < 8; i++) {
    const a = angle + (i / 8) * Math.PI * 2;
    g.lineStyle(2.5, OAK, 1);
    g.lineBetween(hub.x, hub.y, hub.x + Math.cos(a) * R, hub.y + Math.sin(a) * R);
  }
  g.fillStyle(IRON, 1); g.fillCircle(hub.x, hub.y, 6);
  g.fillStyle(lit(IRON, 0.4), 1); g.fillCircle(hub.x - 1.5, hub.y - 1.5, 2);
  const ha = angle * 0.7;
  g.lineStyle(3, PINE, 1); g.lineBetween(hub.x, hub.y, hub.x + Math.cos(ha) * (R + 14), hub.y + Math.sin(ha) * (R + 14));
}

/** The traveller: a wheeled sledge that walks the far end of the rope walk as the strands close. */
export function traveller(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 80, 16);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 34, y - 26, 68, 18);
  g.fillStyle(OAK, 1); g.fillRect(x - 32, y - 25, 64, 14);
  g.fillStyle(PINE, 1); g.fillRect(x - 6, y - 58, 12, 34);
  g.fillStyle(OAK_DARK, 1); g.fillCircle(x - 22, y - 6, 9); g.fillCircle(x + 22, y - 6, 9);
  g.fillStyle(OAK, 1); g.fillCircle(x - 22, y - 6, 6); g.fillCircle(x + 22, y - 6, 6);
  for (let i = 0; i < 3; i++) { g.fillStyle(IRON, 1); g.fillCircle(x, y - 52 + i * 10, 2.5); }
}

// ── The Loom House ───────────────────────────────────────────────────

/**
 * The Loom House: a brick weaving mill, the only brick building on the cliffs, with a sawtooth
 * roof of north-lights, a square chimney, and tall windows through which the loom frames show.
 * The Queen's tithe board is bolted beside the door. Returns the chimney mouth.
 */
export function loomHouse(g: G, x: number, y: number, rng: Rng): Pt {
  const w = 440, h = 150;
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 5, w * 1.12, 30);
  const brick = 0x9a5a44;
  g.fillStyle(dim(brick, 0.5), 1); g.fillRect(x0 - 3, top - 3, w + 6, h + 6);
  g.fillStyle(brick, 1); g.fillRect(x0, top, w, h);
  for (let by = top + 2, row = 0; by < y; by += 7, row++) {
    for (let bx = x0 + (row % 2) * 9; bx < x0 + w; bx += 18) {
      g.fillStyle(mixC(brick, rng() < 0.5 ? 0x000000 : 0xffffff, rng() * 0.14), 1);
      g.fillRect(bx + 1, by + 1, 16, 5);
    }
  }
  // Sawtooth roof: five teeth, glazed north faces glinting.
  const teeth = 5, tw = (w + 20) / teeth;
  for (let i = 0; i < teeth; i++) {
    const tx = x0 - 10 + i * tw;
    g.fillStyle(0x3c3a40, 1); g.fillTriangle(tx, top, tx + tw, top, tx + tw, top - 46);
    g.fillStyle(0x56535a, 1); g.fillTriangle(tx + 3, top - 1, tx + tw - 2, top - 1, tx + tw - 2, top - 42);
    g.fillStyle(0x9ac0cc, 0.75); g.fillRect(tx + tw - 7, top - 42, 5, 41);
    g.fillStyle(0xffffff, 0.35); g.fillRect(tx + tw - 6, top - 40, 2, 16);
  }
  g.fillStyle(dim(brick, 0.4), 1); g.fillRect(x0 - 6, top - 4, w + 12, 8);
  // Chimney.
  const cx = x0 + w - 60;
  g.fillStyle(dim(brick, 0.35), 1); g.fillRect(cx - 16, top - 130, 32, 130);
  g.fillStyle(brick, 1); g.fillRect(cx - 13, top - 128, 24, 126);
  g.fillStyle(dim(brick, 0.5), 1); g.fillRect(cx - 19, top - 136, 38, 10);
  // Tall windows with loom frames behind the glass.
  for (let i = 0; i < 6; i++) {
    const wx = x0 + 40 + i * 72;
    if (Math.abs(wx - x) < 50) continue;
    g.fillStyle(dim(brick, 0.5), 1); g.fillRoundedRect(wx - 17, top + 26, 34, 74, { tl: 16, tr: 16, bl: 0, br: 0 });
    g.fillStyle(0x2c3840, 1); g.fillRoundedRect(wx - 14, top + 29, 28, 70, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.lineStyle(1.5, PINE, 0.6);
    g.strokeRect(wx - 11, top + 50, 22, 40);
    for (let k = 0; k < 6; k++) g.lineBetween(wx - 9 + k * 3.6, top + 50, wx - 9 + k * 3.6, top + 90);
    g.fillStyle(0xffffff, 0.15); g.fillRect(wx - 12, top + 34, 6, 60);
  }
  // The great arched door.
  g.fillStyle(dim(brick, 0.55), 1); g.fillRoundedRect(x - 40, y - 86, 80, 86, { tl: 40, tr: 40, bl: 0, br: 0 });
  g.fillStyle(OAK_DARK, 1); g.fillRoundedRect(x - 34, y - 80, 68, 80, { tl: 34, tr: 34, bl: 0, br: 0 });
  g.lineStyle(2, dim(OAK_DARK, 0.4), 1);
  for (let k = -24; k <= 24; k += 12) g.lineBetween(x + k, y - 76 + Math.abs(k) * 0.4, x + k, y);
  g.fillStyle(IRON, 1); g.fillRect(x - 34, y - 52, 68, 4); g.fillRect(x - 34, y - 22, 68, 4);
  // The tithe board.
  const bx = x + 74, byy = y - 74;
  g.fillStyle(QUEEN_DARK, 1); g.fillRect(bx - 26, byy - 22, 52, 44);
  g.fillStyle(QUEEN, 1); g.fillRect(bx - 24, byy - 20, 48, 40);
  tideMark(g, bx, byy - 6, 9, CHALK, 0.9);
  g.fillStyle(CHALK, 0.8);
  for (let k = 0; k < 3; k++) g.fillRect(bx - 18, byy + 8 + k * 4, 36 - k * 6, 1.5);
  // A sign over the door.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 70, top + 4, 140, 18);
  g.fillStyle(PINE, 1); g.fillRect(x - 68, top + 6, 136, 14);
  g.fillStyle(TAR, 0.85);
  for (let k = 0; k < 11; k++) g.fillRect(x - 58 + k * 11, top + 10, 7, 6);
  return { x: cx, y: top - 136 };
}

// ── The Pattern House (Prince Hem) ───────────────────────────────────

/**
 * The Pattern House: Prince Hem's manor. A white stucco front with a portico whose columns are
 * enormous thread spools, a roof that is not a roof at all but a great canopy of velvet-blue
 * sailcloth stretched taut over spars and trimmed with gold braid, and tall windows in which dress
 * forms stand like a row of waiting courtiers. Crossed shears over the door. Returns the tip of
 * the canopy's king-post (where his pennant flies).
 */
export function patternHouse(g: G, x: number, y: number, rng: Rng): Pt {
  const w = 380, h = 170;
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 6, w * 1.2, 34);
  // Plinth and walls.
  g.fillStyle(0xb8b2a4, 1); g.fillRect(x0 - 16, y - 14, w + 32, 14);
  g.fillStyle(0xd8d2c4, 1); g.fillRect(x0 - 14, y - 14, w + 28, 4);
  g.fillStyle(0x9a948a, 1); g.fillRect(x0 - 2, top - 2, w + 4, h - 10);
  g.fillStyle(0xf0ebe0, 1); g.fillRect(x0, top, w, h - 14);
  for (let i = 0; i < 60; i++) {
    g.fillStyle(rng() < 0.5 ? 0xe2dccc : 0xfaf6ee, 0.5);
    g.fillRect(x0 + rng() * (w - 12), top + rng() * (h - 20), 6 + rng() * 10, 2);
  }
  // Tall windows, each with a dress form behind the glass in a different velvet.
  const forms = [HEM_VELVET, 0x7a2a4a, QUEEN, 0x5a3a7a, 0x2a5a3a, 0x8a5a2a];
  for (let i = 0; i < 6; i++) {
    const wx = x0 + 32 + i * ((w - 64) / 5);
    if (Math.abs(wx - x) < 40) continue;
    g.fillStyle(0xb8b2a4, 1); g.fillRect(wx - 18, top + 28, 36, 92);
    g.fillStyle(0x26303a, 1); g.fillRect(wx - 15, top + 31, 30, 86);
    dressForm(g, wx, top + 112, 28, forms[i % forms.length]);
    g.fillStyle(0xffffff, 0.12); g.fillRect(wx - 13, top + 33, 8, 80);
    g.fillStyle(0xb8b2a4, 1); g.fillRect(wx - 15, top + 72, 30, 3);
    // Velvet swag over each window.
    g.fillStyle(HEM_VELVET, 1);
    g.fillTriangle(wx - 20, top + 24, wx + 20, top + 24, wx, top + 40);
    g.fillStyle(HEM_GOLD, 1); g.fillRect(wx - 20, top + 22, 40, 3);
  }
  // Portico: two spool columns either side of the door.
  for (const s of [-1, 1]) {
    const cx = x + s * 46;
    g.fillStyle(OAK_DARK, 1); g.fillRect(cx - 18, top + 6, 36, 10); g.fillRect(cx - 18, y - 26, 36, 12);
    g.fillStyle(PINE, 1); g.fillRect(cx - 16, top + 8, 32, 6); g.fillRect(cx - 16, y - 24, 32, 8);
    const thread = s < 0 ? HEM_GOLD : RED_THREAD;
    g.fillStyle(dim(thread, 0.35), 1); g.fillRect(cx - 12, top + 16, 24, y - 26 - top - 16);
    g.fillStyle(thread, 1); g.fillRect(cx - 11, top + 16, 20, y - 26 - top - 16);
    g.lineStyle(1, dim(thread, 0.4), 0.7);
    for (let k = top + 20; k < y - 28; k += 5) g.lineBetween(cx - 11, k, cx + 9, k - 2);
    g.fillStyle(lit(thread, 0.35), 0.8); g.fillRect(cx - 9, top + 16, 4, y - 26 - top - 16);
  }
  // Door with crossed shears above it.
  g.fillStyle(0x9a948a, 1); g.fillRoundedRect(x - 26, y - 84, 52, 70, { tl: 26, tr: 26, bl: 0, br: 0 });
  g.fillStyle(HEM_VELVET, 1); g.fillRoundedRect(x - 22, y - 80, 44, 66, { tl: 22, tr: 22, bl: 0, br: 0 });
  g.lineStyle(2, HEM_GOLD, 1); g.lineBetween(x, y - 78, x, y - 14);
  g.fillStyle(HEM_GOLD, 1); g.fillCircle(x - 6, y - 44, 2.4); g.fillCircle(x + 6, y - 44, 2.4);
  for (const s of [-1, 1]) {
    g.lineStyle(5, 0xc8ccd4, 1); g.lineBetween(x - s * 26, y - 128, x + s * 22, y - 96);
    g.lineStyle(3, HEM_GOLD, 1); g.strokeCircle(x - s * 30, y - 131, 6);
  }
  g.fillStyle(HEM_GOLD, 1); g.fillCircle(x, y - 112, 3);
  // The canopy roof: a sail stretched over a ridge spar, scalloped and braided at its hem.
  const ridgeY = top - 96;
  const eave = top + 6;
  const cl = x0 - 34, cr = x0 + w + 34;
  g.fillStyle(dim(HEM_VELVET, 0.55), 1); g.fillTriangle(cl, eave + 6, cr, eave + 6, x, ridgeY - 4);
  g.fillStyle(HEM_VELVET, 1); g.fillTriangle(cl + 6, eave, cr - 6, eave, x, ridgeY);
  // Panels of the canopy.
  for (let k = 1; k < 8; k++) {
    const t = k / 8;
    const ex = cl + 6 + (cr - cl - 12) * t;
    g.lineStyle(2, lit(HEM_VELVET, 0.14), 0.8); g.lineBetween(x, ridgeY + 4, ex, eave - 2);
  }
  // Scalloped hem with gold braid.
  for (let sx = cl + 6; sx < cr - 6; sx += 24) {
    g.fillStyle(HEM_VELVET, 1); g.fillEllipse(sx + 12, eave + 2, 26, 18);
    g.lineStyle(2, HEM_GOLD, 1); g.beginPath(); g.arc(sx + 12, eave + 2, 13, 0.1, Math.PI - 0.1, false); g.strokePath();
    g.fillStyle(HEM_GOLD, 1); g.fillCircle(sx + 12, eave + 15, 2.5);
  }
  g.fillStyle(HEM_GOLD, 1); g.fillRect(cl + 6, eave - 4, cr - cl - 12, 3);
  // The tide-mark of the Queen on the canopy's breast.
  tideMark(g, x, top - 36, 20, HEM_GOLD, 0.9);
  // King-post.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 4, ridgeY - 50, 8, 52);
  g.fillStyle(HEM_GOLD, 1); g.fillCircle(x, ridgeY - 52, 5);
  return { x, y: ridgeY - 48 };
}

/** The colossal dress form in the Pattern House's forecourt, cut to the Queen's measure. */
export function queenForm(g: G, x: number, y: number): void {
  // A plinth with tithe-tally notches.
  shadow(g, x, y + 4, 120, 26);
  g.fillStyle(0x8a8478, 1); g.fillRect(x - 42, y - 26, 84, 26);
  g.fillStyle(0xc8c2b4, 1); g.fillRect(x - 40, y - 26, 80, 6);
  for (let i = 0; i < 12; i++) { g.fillStyle(0x5a554c, 0.8); g.fillRect(x - 34 + i * 6, y - 16, 2, 10); }
  dressForm(g, x, y - 24, 62, QUEEN, HEM_GOLD);
  // A train of real sailcloth pooling down the plinth.
  g.fillStyle(dim(QUEEN, 0.3), 1);
  g.fillTriangle(x - 24, y - 110, x + 24, y - 110, x + 46, y - 22);
  g.fillTriangle(x - 24, y - 110, x - 44, y - 22, x + 46, y - 22);
  g.fillStyle(QUEEN, 1);
  g.fillTriangle(x - 20, y - 108, x + 20, y - 108, x + 40, y - 26);
  g.fillTriangle(x - 20, y - 108, x - 40, y - 26, x + 40, y - 26);
  stitches(g, x - 38, y - 30, x + 38, y - 30, HEM_GOLD, 1.6, 6, 4);
  // A crown of pins.
  for (let i = -3; i <= 3; i++) {
    g.lineStyle(1.6, 0xd8dee6, 1); g.lineBetween(x + i * 5, y - 192, x + i * 6, y - 206 + Math.abs(i));
    g.fillStyle(i % 2 ? HEM_GOLD : RED_THREAD, 1); g.fillCircle(x + i * 6, y - 207 + Math.abs(i), 2.6);
  }
}

// ── The drying green ─────────────────────────────────────────────────

export interface LineSheet { at: number; w: number; drop: number; color: number; billow: number }

/**
 * A drying line between two tall props, sagging under the weight of whole sails pegged along it.
 * `ax..bx` are the prop positions at foot-line `y`; `sheets[i].at` is 0–1 along the line.
 */
export function dryingLine(g: G, ax: number, bx: number, y: number, height: number, sheets: LineSheet[], rng: Rng): void {
  const A = { x: ax, y: y - height }, B = { x: bx, y: y - height };
  for (const px of [ax, bx]) {
    shadow(g, px, y + 1, 26, 8);
    g.fillStyle(OAK_DARK, 1); g.fillRect(px - 4, y - height - 10, 8, height + 10);
    g.fillStyle(OAK, 1); g.fillRect(px - 3, y - height - 10, 4, height + 10);
    // Forked prop-top.
    g.lineStyle(3, OAK_DARK, 1);
    g.lineBetween(px, y - height - 6, px - 7, y - height - 16); g.lineBetween(px, y - height - 6, px + 7, y - height - 16);
    // Guy-line pegged to the turf.
    const out = px < (ax + bx) / 2 ? -1 : 1;
    g.lineStyle(1.2, HEMP_DARK, 0.85); g.lineBetween(px, y - height, px + out * 40, y + 6);
    g.fillStyle(OAK_DARK, 1); g.fillRect(px + out * 40 - 2, y + 2, 4, 6);
  }
  const line = sag(A, B, 26, 20);
  polyline(g, line, 1.8, HEMP_DARK);
  for (const s of sheets) {
    const idx = Math.round(s.at * (line.length - 1));
    const p = line[Math.max(0, Math.min(line.length - 1, idx))];
    // Shadow the sheet casts on the turf.
    g.fillStyle(0x000000, 0.12); g.fillEllipse(p.x + s.billow * 14, y + 4, s.w * 1.05, 16);
    sheet(g, p.x, p.y, s.w, s.drop, s.billow, s.color, 1, rng() * 6);
  }
}

// ── The Queen's fleet ────────────────────────────────────────────────

/**
 * One of the Queen's half-built ships on the stocks, seen broadside: keel blocks and shores, the
 * hull planked from the stern forward with the bow still bare ribs, a tar line at the waterline
 * she has never touched, two masts crossed with yards, and her sails half-sewn — finished
 * canvas above, the lower half only a bolt-rope frame with loose threads trailing to the deck.
 * A ladder of weavers' bosun-chairs hangs at the mainmast. `dir` = 1 faces the bow east.
 * Returns the two mast heads (for pennants).
 */
export function hullOnStocks(g: G, x: number, y: number, len: number, dir: 1 | -1, done: number, rng: Rng): Pt[] {
  const hh = 70;
  const deckY = y - 26 - hh;
  shadow(g, x, y + 4, len * 1.1, 26);
  // Keel blocks and shores.
  for (let i = 0; i < 6; i++) {
    const bx = x - len * 0.42 + (len * 0.84) * (i / 5);
    g.fillStyle(OAK_DARK, 1); g.fillRect(bx - 12, y - 20, 24, 20);
    g.fillStyle(OAK, 1); g.fillRect(bx - 10, y - 19, 20, 6); g.fillRect(bx - 10, y - 10, 20, 6);
  }
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const sx = x - len * 0.3 + i * len * 0.3;
      g.lineStyle(5, OAK_DARK, 1); g.lineBetween(sx + s * 4, y + 2, sx + s * 30, deckY + 40);
    }
  }
  // The hull outline (stern at -dir, bow at +dir).
  const stern = x - dir * len / 2, bow = x + dir * len / 2;
  const keelY = y - 22;
  const hullPts = (k: number): Phaser.Geom.Point[] => [
    new Phaser.Geom.Point(stern, deckY - 10 * k),
    new Phaser.Geom.Point(bow + dir * 18, deckY - 16 * k),
    new Phaser.Geom.Point(bow - dir * 10, deckY + hh * 0.55),
    new Phaser.Geom.Point(bow - dir * len * 0.22, keelY),
    new Phaser.Geom.Point(stern + dir * len * 0.12, keelY),
    new Phaser.Geom.Point(stern + dir * 6, deckY + hh * 0.45),
  ];
  // Ribs everywhere (the bare bow shows them).
  g.fillStyle(dim(OAK, 0.6), 1); g.fillPoints(hullPts(1), true, true);
  const ribs = 18;
  for (let i = 0; i <= ribs; i++) {
    const rx = stern + dir * (len * (i / ribs));
    g.lineStyle(4, OAK, 1); g.lineBetween(rx, deckY - 6, rx + dir * 3, keelY - 2);
  }
  // Planking from the stern up to `done` of the length.
  const plankTo = stern + dir * len * done;
  for (let row = 0; row < 7; row++) {
    const py = deckY + row * (hh / 7);
    const x1 = plankTo - dir * row * 6 + dir * (rng() * 10);
    const lo = Math.min(stern + dir * 4, x1), hi = Math.max(stern + dir * 4, x1);
    g.fillStyle(row % 2 ? 0x2e2824 : 0x3a322c, 1);
    g.fillRect(lo, py, hi - lo, hh / 7 - 1);
    g.fillStyle(lit(0x3a322c, 0.2), 0.7); g.fillRect(lo, py, hi - lo, 1.5);
  }
  // Wale and tar line.
  g.fillStyle(QUEEN_DARK, 1); g.fillRect(Math.min(stern, plankTo), deckY - 4, Math.abs(plankTo - stern), 6);
  g.fillStyle(QUEEN, 1); g.fillRect(Math.min(stern, plankTo), deckY - 3, Math.abs(plankTo - stern), 3);
  // Gunwale rail across the full length.
  g.fillStyle(OAK_DARK, 1); g.fillRect(Math.min(stern, bow), deckY - 12, len, 6);
  // Stern castle.
  g.fillStyle(0x3a322c, 1); g.fillRect(stern - (dir > 0 ? 0 : 50), deckY - 36, 50, 26);
  g.fillStyle(lit(0x3a322c, 0.15), 1); g.fillRect(stern - (dir > 0 ? 0 : 50), deckY - 36, 50, 3);
  for (let i = 0; i < 3; i++) {
    g.fillStyle(0xd8b85a, 0.7); g.fillRect(stern - (dir > 0 ? -6 : 44) + i * 15, deckY - 28, 8, 9);
  }
  // Bowsprit.
  g.lineStyle(6, OAK_DARK, 1); g.lineBetween(bow, deckY - 12, bow + dir * 70, deckY - 46);
  // Masts, yards, half-sewn sails.
  const heads: Pt[] = [];
  const masts = [x - dir * len * 0.18, x + dir * len * 0.2];
  masts.forEach((mx, mi) => {
    const mh = mi === 0 ? 250 : 220;
    const top = deckY - mh;
    g.fillStyle(OAK_DARK, 1); g.fillRect(mx - 5, top, 10, mh);
    g.fillStyle(OAK, 1); g.fillRect(mx - 3, top, 4, mh);
    // Shrouds down to the gunwale.
    g.lineStyle(1.2, TAR, 0.8);
    for (let k = -3; k <= 3; k++) if (k) g.lineBetween(mx, top + 20, mx + k * 16, deckY - 10);
    // Ratlines.
    g.lineStyle(1, TAR, 0.5);
    for (let ry = top + 50; ry < deckY - 20; ry += 14) {
      const spread = ((ry - top - 20) / (deckY - 30 - top)) * 48;
      g.lineBetween(mx - spread, ry, mx - 6, ry); g.lineBetween(mx + 6, ry, mx + spread, ry);
    }
    // Two yards, each with a half-sewn course.
    for (let yi = 0; yi < 2; yi++) {
      const yy = top + 30 + yi * 92;
      const yw = (mi === 0 ? 120 : 104) - yi * -14;
      g.fillStyle(OAK_DARK, 1); g.fillRect(mx - yw / 2, yy - 4, yw, 7);
      const sailH = 80;
      const sewn = yi === 0 ? 0.75 : 0.35 + rng() * 0.2;
      const sTop = yy + 3;
      // Finished canvas.
      g.fillStyle(dim(CANVAS, 0.3), 1); g.fillRect(mx - yw / 2 + 4, sTop + 2, yw - 6, sailH * sewn);
      g.fillStyle(CANVAS, 1); g.fillRect(mx - yw / 2 + 2, sTop, yw - 6, sailH * sewn);
      for (let k = 1; k < 5; k++) {
        g.lineStyle(1, CANVAS_SHADE, 0.8); g.lineBetween(mx - yw / 2 + 2 + (yw - 6) * (k / 5), sTop, mx - yw / 2 + 2 + (yw - 6) * (k / 5), sTop + sailH * sewn);
      }
      stitches(g, mx - yw / 2 + 4, sTop + sailH * sewn - 2, mx + yw / 2 - 6, sTop + sailH * sewn - 2, RED_THREAD, 1.6, 4, 3);
      // Bolt-rope frame for the rest, threads trailing.
      g.lineStyle(1.6, HEMP_DARK, 1);
      g.lineBetween(mx - yw / 2 + 2, sTop + sailH * sewn, mx - yw / 2 + 2, sTop + sailH);
      g.lineBetween(mx + yw / 2 - 4, sTop + sailH * sewn, mx + yw / 2 - 4, sTop + sailH);
      g.lineBetween(mx - yw / 2 + 2, sTop + sailH, mx + yw / 2 - 4, sTop + sailH);
      for (let k = 0; k < 6; k++) {
        const tx = mx - yw / 2 + 8 + k * ((yw - 16) / 5);
        g.lineStyle(1, k % 2 ? RED_THREAD : CHALK, 0.8);
        g.lineBetween(tx, sTop + sailH * sewn, tx + (rng() - 0.5) * 8, sTop + sailH * sewn + 14 + rng() * 26);
      }
    }
    heads.push({ x: mx, y: top });
  });
  // A bosun's chair with a weaver's ladder at the mainmast.
  const lm = masts[0] + dir * 22;
  g.lineStyle(1.2, HEMP_DARK, 0.9); g.lineBetween(lm, deckY - 220, lm, deckY - 70);
  g.fillStyle(OAK, 1); g.fillRect(lm - 9, deckY - 72, 18, 5);
  // The Queen's pennant at the stern.
  g.lineStyle(2, OAK_DARK, 1); g.lineBetween(stern, deckY - 36, stern, deckY - 90);
  return heads;
}

/** A training mast in the rigging yard: a single tall pole with a top, shrouds and ratlines. */
export function riggingMast(g: G, x: number, y: number, h: number): Pt {
  shadow(g, x, y + 3, 120, 22);
  const top = y - h;
  // Chainplates and deadeyes on posts.
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const px = x + s * (40 + k * 14);
      g.fillStyle(OAK_DARK, 1); g.fillRect(px - 3, y - 14, 6, 14);
      g.fillStyle(OAK, 1); g.fillCircle(px, y - 16, 4);
      g.lineStyle(1.3, TAR, 0.9); g.lineBetween(px, y - 16, x + s * 5, top + 50);
    }
  }
  g.lineStyle(1, TAR, 0.6);
  for (let ry = top + 70; ry < y - 24; ry += 13) {
    const t = (ry - (top + 50)) / (y - 16 - (top + 50));
    for (const s of [-1, 1]) g.lineBetween(x + s * 6, ry, x + s * (6 + t * 62), ry);
  }
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 6, top, 12, h);
  g.fillStyle(OAK, 1); g.fillRect(x - 4, top, 5, h);
  // The top platform.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 26, top + 44, 52, 8);
  g.fillStyle(PINE, 1); g.fillRect(x - 24, top + 44, 48, 4);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 34, top + 14, 68, 6);
  return { x, y: top };
}

// ── The court ───────────────────────────────────────────────────────

/**
 * The Yardstick: the tithe post in the middle of the square. A ship's spar planted upright,
 * painted in alternating teal and white yards, notched with each household's chalked yardage,
 * a crossbar hung with the official ell-measures, and the Queen's board at its foot.
 */
export function yardstick(g: G, x: number, y: number): Pt {
  shadow(g, x, y + 3, 80, 20);
  // Stepped stone base.
  g.fillStyle(0x8a8476, 1); g.fillRect(x - 36, y - 16, 72, 16);
  g.fillStyle(0xb8b2a2, 1); g.fillRect(x - 28, y - 26, 56, 12);
  g.fillStyle(0xd8d2c2, 1); g.fillRect(x - 28, y - 26, 56, 3);
  // The spar, banded by the yard.
  const h = 210, top = y - 26 - h;
  for (let i = 0; i < 7; i++) {
    const by = y - 26 - (i + 1) * (h / 7);
    g.fillStyle(i % 2 ? CHALK : QUEEN, 1); g.fillRect(x - 7, by, 14, h / 7);
    g.fillStyle(0x000000, 0.18); g.fillRect(x + 3, by, 4, h / 7);
  }
  // Notches and chalked tallies.
  for (let i = 0; i < 14; i++) {
    const ny = y - 34 - i * 14;
    g.fillStyle(TAR, 0.8); g.fillRect(x - 7, ny, 5, 2);
    g.fillStyle(CHALK, 0.85); g.fillRect(x - 22 - (i % 3) * 3, ny - 1, 12 + (i % 4) * 2, 1.5);
  }
  // Crossbar with three hanging ell-measures.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 46, top + 10, 92, 7);
  for (let k = -1; k <= 1; k++) {
    const hx = x + k * 34;
    g.lineStyle(1, TAR, 1); g.lineBetween(hx, top + 17, hx, top + 26);
    g.fillStyle(PINE, 1); g.fillRect(hx - 3, top + 26, 6, 54 - Math.abs(k) * 10);
    g.fillStyle(TAR, 0.8);
    for (let m = 0; m < 5; m++) g.fillRect(hx - 3, top + 30 + m * 10, 3, 1.4);
  }
  g.fillStyle(HEM_GOLD, 1); g.fillCircle(x, top - 2, 7);
  tideMark(g, x, top - 2, 5, QUEEN_DARK, 1);
  // The tithe board leaned on the base.
  g.fillStyle(QUEEN_DARK, 1); g.fillRect(x + 14, y - 46, 30, 34);
  g.fillStyle(QUEEN, 1); g.fillRect(x + 16, y - 44, 26, 30);
  g.fillStyle(CHALK, 0.9);
  for (let k = 0; k < 4; k++) g.fillRect(x + 19, y - 39 + k * 6, 20 - (k % 2) * 6, 1.5);
  return { x, y: top - 2 };
}

/** A weaver's cottage: low, clapboarded, a canvas-patched roof and a hand-loom at the window. */
export function cottage(g: G, x: number, y: number, w: number, h: number, wall: number, roof: number, rng: Rng, patched = true): Pt {
  shadow(g, x, y + 4, w * 1.2, 20);
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(dim(wall, 0.5), 1); g.fillRect(x0 - 2, top - 2, w + 4, h + 4);
  weatherboard(g, x0, top, w, h, wall, rng);
  const rh = h * 0.7;
  g.fillStyle(dim(roof, 0.45), 1); g.fillTriangle(x0 - 12, top + 3, x0 + w + 12, top + 3, x, top - rh - 4);
  g.fillStyle(roof, 1); g.fillTriangle(x0 - 8, top, x0 + w + 8, top, x, top - rh);
  for (let k = 1; k < 5; k++) {
    const t = k / 5;
    g.lineStyle(1.5, dim(roof, 0.15), 0.8);
    g.lineBetween(x0 - 8 + (w / 2 + 8) * t, top - rh * t, x0 + w + 8 - (w / 2 + 8) * t, top - rh * t);
  }
  if (patched) {
    for (let i = 0; i < 3; i++) {
      const px = x - w * 0.3 + rng() * w * 0.6, py = top - rh * (0.2 + rng() * 0.45);
      patch(g, px, py, 14 + rng() * 10, 10 + rng() * 6, rng() < 0.5 ? CANVAS : TAN_SAIL, 0.95, RED_THREAD);
    }
  }
  sash(g, x - w * 0.28, y - h * 0.5, 16, 18, dim(wall, 0.55), rng() < 0.5 ? 0xffd890 : 0);
  sash(g, x + w * 0.28, y - h * 0.5, 16, 18, dim(wall, 0.55), 0);
  g.fillStyle(dim(wall, 0.6), 1); g.fillRect(x - 11, y - 34, 22, 34);
  g.fillStyle(dim(wall, 0.3), 1); g.fillRect(x - 9, y - 32, 18, 32);
  g.fillStyle(BRASS, 1); g.fillCircle(x + 5, y - 16, 1.6);
  // A household's yardage chalked on the door.
  g.lineStyle(1.2, CHALK, 0.8);
  for (let k = 0; k < 4; k++) g.lineBetween(x - 6 + k * 3, y - 28, x - 6 + k * 3, y - 22);
  g.lineBetween(x - 7, y - 23, x + 5, y - 27);
  return { x, y: y + 16 };
}

/** Selvedge & Daughters: the haberdashery, all bow window, ribbons and a shears signboard. */
export function haberdashery(g: G, x: number, y: number, rng: Rng): Pt {
  const w = 170, h = 120;
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 4, w * 1.2, 22);
  const wall = 0xe8dcc6;
  g.fillStyle(dim(wall, 0.45), 1); g.fillRect(x0 - 2, top - 2, w + 4, h + 4);
  g.fillStyle(wall, 1); g.fillRect(x0, top, w, h);
  for (let i = 0; i < 40; i++) { g.fillStyle(rng() < 0.5 ? 0xd8ccb4 : 0xf6eee0, 0.6); g.fillRect(x0 + rng() * (w - 8), top + rng() * (h - 4), 8, 2); }
  // Mansard roof in slate.
  g.fillStyle(0x3a4450, 1); g.fillRect(x0 - 10, top - 34, w + 20, 36);
  g.fillStyle(0x4c5866, 1); g.fillRect(x0 - 6, top - 30, w + 12, 28);
  for (let sx = x0 - 4; sx < x0 + w + 4; sx += 10) { g.fillStyle(0x2c343e, 0.7); g.fillRect(sx, top - 30, 1.5, 28); }
  // Striped awning.
  for (let i = 0; i < 9; i++) {
    g.fillStyle(i % 2 ? CHALK : 0xa8324a, 1);
    g.fillTriangle(x0 + 4 + i * 18, top + 18, x0 + 22 + i * 18, top + 18, x0 + 13 + i * 18, top + 34);
    g.fillRect(x0 + 4 + i * 18, top + 8, 18, 11);
  }
  // Bow window with bolts of cloth and ribbon reels on display.
  const bw = 96;
  g.fillStyle(dim(wall, 0.5), 1); g.fillRoundedRect(x - bw / 2 - 4, top + 40, bw + 8, 60, 10);
  g.fillStyle(0x2a343c, 1); g.fillRoundedRect(x - bw / 2, top + 44, bw, 52, 8);
  const reels = [0xa8324a, HEM_GOLD, QUEEN, 0x6a3a8a, CANVAS, 0x3a7a4a];
  reels.forEach((c, i) => {
    const rx = x - bw / 2 + 12 + i * 15, ry = top + 82;
    g.fillStyle(PINE, 1); g.fillRect(rx - 6, ry - 16, 12, 3); g.fillRect(rx - 6, ry - 1, 12, 3);
    g.fillStyle(c, 1); g.fillRect(rx - 5, ry - 13, 10, 12);
    g.lineStyle(1.5, c, 0.9); g.lineBetween(rx, ry - 7, rx + 3, ry + 10);
  });
  g.fillStyle(0xffffff, 0.14); g.fillRect(x - bw / 2 + 4, top + 46, 10, 46);
  for (let k = 1; k < 4; k++) { g.fillStyle(dim(wall, 0.5), 1); g.fillRect(x - bw / 2 + (bw / 4) * k - 1, top + 44, 2, 52); }
  // Door (to the right of the bow).
  g.fillStyle(dim(wall, 0.55), 1); g.fillRect(x0 + w - 34, y - 46, 24, 46);
  g.fillStyle(0x6a2a3a, 1); g.fillRect(x0 + w - 32, y - 44, 20, 44);
  g.fillStyle(BRASS, 1); g.fillCircle(x0 + w - 16, y - 22, 1.8);
  // Hanging shears signboard on a bracket.
  g.lineStyle(3, IRON, 1); g.lineBetween(x0 - 2, top + 10, x0 - 30, top + 10);
  g.lineStyle(1, IRON, 1); g.lineBetween(x0 - 24, top + 10, x0 - 24, top + 18); g.lineBetween(x0 - 8, top + 10, x0 - 8, top + 18);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x0 - 30, top + 18, 28, 26);
  g.fillStyle(PINE, 1); g.fillRect(x0 - 28, top + 20, 24, 22);
  g.lineStyle(2, 0xc8ccd4, 1); g.lineBetween(x0 - 24, top + 24, x0 - 8, top + 38); g.lineBetween(x0 - 8, top + 24, x0 - 24, top + 38);
  g.lineStyle(1.5, HEM_GOLD, 1); g.strokeCircle(x0 - 25, top + 39, 3); g.strokeCircle(x0 - 7, top + 39, 3);
  return { x: x0 + w - 22, y: y + 12 };
}

/**
 * A quilting frame on trestles: a long low rectangle of rails with a half-finished patchwork
 * quilt stretched in it, needles parked in the border.
 */
export function quiltFrame(g: G, x: number, y: number, w: number, d: number, colors: number[], rng: Rng): void {
  shadow(g, x, y + 4, w * 1.1, 22);
  // Trestles.
  for (const s of [-1, 1]) {
    const tx = x + s * (w / 2 - 14);
    g.lineStyle(4, OAK_DARK, 1); g.lineBetween(tx - 10, y, tx, y - 30); g.lineBetween(tx + 10, y, tx, y - 30);
  }
  // Rails.
  const top = y - 30 - d;
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - w / 2 - 6, top - 4, w + 12, d + 8);
  g.fillStyle(OAK, 1); g.fillRect(x - w / 2 - 4, top - 3, w + 8, 3); g.fillRect(x - w / 2 - 4, top + d, w + 8, 3);
  // The quilt.
  const cols = Math.floor(w / 22), rows = Math.max(2, Math.floor(d / 14));
  const cw = w / cols, ch = d / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const filled = c < cols * (0.45 + rng() * 0.5);
      const col = filled ? colors[(r * 3 + c * 7 + Math.floor(rng() * 2)) % colors.length] : CANVAS_OLD;
      g.fillStyle(col, 1); g.fillRect(x - w / 2 + c * cw + 0.5, top + r * ch + 0.5, cw - 1, ch - 1);
      if (filled && rng() < 0.4) { g.fillStyle(lit(col, 0.2), 0.7); g.fillRect(x - w / 2 + c * cw + 2, top + r * ch + 2, cw - 4, 2); }
    }
  }
  for (let c = 1; c < cols; c++) stitches(g, x - w / 2 + c * cw, top, x - w / 2 + c * cw, top + d, CHALK, 1, 3, 2, 0.7);
  for (let i = 0; i < 3; i++) {
    const nx = x - w / 2 + 10 + rng() * (w - 20);
    g.lineStyle(1.2, 0xd8dee6, 1); g.lineBetween(nx, top - 3, nx + 4, top - 11);
    g.lineStyle(0.8, RED_THREAD, 0.9); g.lineBetween(nx + 4, top - 11, nx + 10, top + 4);
  }
}

/**
 * The test rig on Wind Bluff: a stout mast guyed to iron cleats with one huge tanned square sail
 * on its yard, the sheets hauled so it always fills off the sea. Returns the mast head.
 */
export function testRig(g: G, x: number, y: number): Pt {
  shadow(g, x, y + 4, 200, 30);
  const h = 300, top = y - h;
  // Guys out to cleats.
  for (const [dx, dy] of [[-110, 10], [110, 10], [-70, -10], [80, -8]] as [number, number][]) {
    g.lineStyle(1.6, TAR, 0.9); g.lineBetween(x, top + 40, x + dx, y + dy - 10);
    cleat(g, x + dx, y + dy, 9);
  }
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 7, top, 14, h);
  g.fillStyle(OAK, 1); g.fillRect(x - 5, top, 6, h);
  // Yard.
  const yy = top + 46, yw = 220;
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - yw / 2, yy - 5, yw, 9);
  g.fillStyle(PINE, 1); g.fillRect(x - yw / 2, yy - 5, yw, 3);
  // The great sail, full and bellied (drawn as a cupped shape billowing south toward us).
  const sh = 170;
  const pts = [
    new Phaser.Geom.Point(x - yw / 2 + 4, yy + 4),
    new Phaser.Geom.Point(x + yw / 2 - 4, yy + 4),
    new Phaser.Geom.Point(x + yw / 2 + 12, yy + sh * 0.55),
    new Phaser.Geom.Point(x + yw / 2 - 6, yy + sh),
    new Phaser.Geom.Point(x - yw / 2 + 6, yy + sh),
    new Phaser.Geom.Point(x - yw / 2 - 12, yy + sh * 0.55),
  ];
  g.fillStyle(dim(TAN_SAIL, 0.45), 1); g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x + 3, p.y + 4)), true, true);
  g.fillStyle(TAN_SAIL, 1); g.fillPoints(pts, true, true);
  // Belly highlight and cloths.
  g.fillStyle(lit(TAN_SAIL, 0.16), 0.7); g.fillEllipse(x - 18, yy + sh * 0.48, yw * 0.55, sh * 0.6);
  for (let k = 1; k < 8; k++) {
    const cx = x - yw / 2 + (yw / 8) * k;
    const bulge = Math.sin((k / 8) * Math.PI) * 10;
    g.lineStyle(1.2, dim(TAN_SAIL, 0.3), 0.8);
    g.beginPath(); g.moveTo(cx, yy + 6);
    g.lineTo(cx + (cx < x ? -bulge : bulge) * 0.6, yy + sh * 0.5);
    g.lineTo(cx, yy + sh - 2);
    g.strokePath();
  }
  // Reef points.
  for (let rr = 0; rr < 2; rr++) {
    for (let k = 0; k < 10; k++) {
      const rx = x - yw / 2 + 14 + k * ((yw - 28) / 9);
      g.lineStyle(1, CANVAS, 0.9); g.lineBetween(rx, yy + 30 + rr * 26, rx, yy + 38 + rr * 26);
    }
  }
  // Sheets to the cleats at the foot.
  g.lineStyle(1.8, HEMP_DARK, 1);
  g.lineBetween(x - yw / 2 + 6, yy + sh, x - 110, y);
  g.lineBetween(x + yw / 2 - 6, yy + sh, x + 110, y);
  return { x, y: top };
}

/** Timber stair down the cliff face to the cove: `x` centre, from `y0` (top) to `y1` (beach). */
export function cliffStair(g: G, x: number, y0: number, y1: number): void {
  const w = 70;
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - w / 2 - 4, y0, w + 8, y1 - y0);
  for (let sy = y0 + 4; sy < y1; sy += 11) {
    g.fillStyle(PINE, 1); g.fillRect(x - w / 2, sy, w, 7);
    g.fillStyle(lit(PINE, 0.2), 1); g.fillRect(x - w / 2, sy, w, 2);
    g.fillStyle(dim(PINE, 0.4), 1); g.fillRect(x - w / 2, sy + 6, w, 1.5);
  }
  for (const s of [-1, 1]) {
    for (let sy = y0; sy <= y1; sy += 30) { g.fillStyle(OAK_DARK, 1); g.fillRect(x + s * (w / 2 + 2) - 2, sy - 20, 4, 22); }
    rope(g, [{ x: x + s * (w / 2 + 2), y: y0 - 18 }, { x: x + s * (w / 2 + 2), y: y1 - 18 }], 2.4);
  }
}

/** A plank jetty out over the cove. `x,y` is its landward end. */
export function jetty(g: G, x: number, y: number, len: number, w = 50): void {
  g.fillStyle(0x000000, 0.25); g.fillRect(x - w / 2 + 4, y + 6, w, len);
  for (let py = y; py < y + len; py += 26) {
    for (const s of [-1, 1]) { g.fillStyle(TAR, 1); g.fillRect(x + s * (w / 2 - 3) - 3, py, 6, 30); }
  }
  for (let py = y; py < y + len; py += 8) {
    g.fillStyle(py % 16 ? PINE : dim(PINE, 0.1), 1); g.fillRect(x - w / 2, py, w, 7);
    g.fillStyle(dim(PINE, 0.45), 1); g.fillRect(x - w / 2, py + 6, w, 1.2);
  }
  cleat(g, x - w / 2 + 8, y + len - 6, 6);
  cleat(g, x + w / 2 - 8, y + len - 6, 6);
}

/** A sailmaker's bench outdoors: a long low bench with a palm, fid and needles laid on it. */
export function sailBench(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 90, 14);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 40, y - 18, 80, 8);
  g.fillStyle(OAK, 1); g.fillRect(x - 38, y - 18, 76, 4);
  g.fillRect(x - 34, y - 10, 5, 10); g.fillRect(x + 29, y - 10, 5, 10);
  // A palm (leather glove) and fid.
  g.fillStyle(0x8a5a32, 1); g.fillEllipse(x - 18, y - 21, 16, 8);
  g.fillStyle(PINE, 1); g.fillTriangle(x + 4, y - 20, x + 24, y - 22, x + 4, y - 24);
  g.lineStyle(1.2, 0xd8dee6, 1); g.lineBetween(x - 4, y - 22, x + 2, y - 24); g.lineBetween(x + 26, y - 21, x + 34, y - 22);
  // A twist of red twine.
  g.lineStyle(1.5, RED_THREAD, 1); g.strokeCircle(x + 30, y - 22, 3);
}

/** A tarred bollard post where boats or the walk's ropes are made fast. */
export function bollard(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 26, 8);
  g.fillStyle(TAR, 1); g.fillRoundedRect(x - 8, y - 26, 16, 26, 5);
  g.fillStyle(lit(TAR, 0.2), 1); g.fillEllipse(x, y - 26, 16, 6);
  g.fillStyle(0x4a443e, 1); g.fillRect(x - 9, y - 18, 18, 3);
}

/** A wicker basket of folded sheets (Tuck's) or pegs. */
export function laundryBasket(g: G, x: number, y: number, s = 1): void {
  shadow(g, x, y + 2, 44 * s, 12 * s);
  g.fillStyle(0x8a6a3a, 1); g.fillRoundedRect(x - 20 * s, y - 20 * s, 40 * s, 20 * s, 6 * s);
  g.lineStyle(1, 0x5a4422, 0.9);
  for (let k = 0; k < 6; k++) g.lineBetween(x - 18 * s + k * 7 * s, y - 19 * s, x - 15 * s + k * 7 * s, y - 1 * s);
  for (let k = 0; k < 3; k++) {
    g.fillStyle(k % 2 ? CANVAS : CANVAS_SHADE, 1);
    g.fillRoundedRect(x - 16 * s + k * 2 * s, y - 26 * s - k * 4 * s, 32 * s, 8 * s, 3 * s);
  }
  for (let k = 0; k < 4; k++) peg(g, x - 12 * s + k * 8 * s, y - 36 * s);
}
