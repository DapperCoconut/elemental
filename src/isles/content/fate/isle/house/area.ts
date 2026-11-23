import type { AreaDef, NpcDef, PainterWorld, Poi, Pt, Rect, Solid, WorldGate, WorldHazard } from '../../../../IslesTypes';
import { type G, dim, glow, lit, mulberry, shadow } from '../../../../art/IsleArt';
import {
  BAIZE, BAIZE_DEEP, BAIZE_LIT, CARD_BLACK, CARD_RED, CARD_RED_DEEP, GILT, GILT_DARK, GILT_LIT, INK, IVORY, IVORY_SHADE,
  LAMP_GREEN, MAHOGANY, MAHOGANY_DEEP, MAHOGANY_LIT, VELVET, blackChip, chip, chipStack, die, gamingTable, greenLamp,
  lotToken, playingCard, rake, rouletteWheel, suitPip, wheelSeal,
} from './art';

/**
 * The House — the Croupier-King's casino-palace on the summit of Lotterhaven, its great Wheel
 * turning on the roof where the whole isle can see it.
 *
 * You come in by the cellar door from the War Court and climb north, floor by floor, through the
 * three games the House plays with the people it has busted. Each floor closes on a warden.
 *
 *   The Counting Cellar — (y 2280–2564) arrival, a waystone, the cashier's cage, the numbers board.
 *   Floor I   — The Roulette Floor (y 1720–2240): a hall-wide wheel. A ball as big as a boulder runs
 *               the rim track round and round (it is a ring of timed pockets); the gilt turret in the
 *               middle sweeps two arms. Cross the rim behind the ball, mind the turret, cross again.
 *               The gaming tables wall the floor in. Warden: Pit Boss Ormolu Vane.
 *   Floor II  — The Dice Stair (y 1040–1680): five lanes of stair between balustrades of stacked
 *               dice, two flights with a landing between. A die as tall as a man tumbles down each
 *               lane on its own beat. Climb behind it; change lanes on the landing. Warden: Bones
 *               Mallory.
 *   Floor III — The Card Gallery (y 330–1000): a floor of giant face-down cards. Most are blanks;
 *               the aces flip up on their beat and strike, and Quillon's ink nick marks every ace's
 *               back. A river of spilt ink cuts the gallery — blot it at the Blotter (east). Warden:
 *               Quillon the Marker.
 *   The High Table — (y 40–290): under the Wheel, where Lucan deals.
 *
 * There is no health out here: a hazard busts you back to the last checkpoint.
 */

const W = 1800;
const H = 2600;
const L = 260;
const R = 1540;
const MID = 900;
const DOOR_L = 820;
const DOOR_R = 980;

const jetPhase = (t: number, period: number, off: number): number => (((t * 1000 + off) % period) + period) % period;
const near = (v: Rect, x: number, y: number, pad: number): boolean => x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

// ── Hazards ──────────────────────────────────────────────────────────

const hazards: WorldHazard[] = [];

/** Floor I: the wheel. The ball's track is a ring of pockets that fire one after the next. */
const WHEEL = { x: MID, y: 2010 };
const TRACK_R = 186;
const BALL_N = 16;
const BALL_S = 52;
const BALL_PERIOD = 2400;
const BALL_STEP = BALL_PERIOD / BALL_N;
const BALL_ON = 320;
const pocketAt = (k: number): Pt => {
  const a = (k / BALL_N) * Math.PI * 2;
  return { x: WHEEL.x + Math.cos(a) * TRACK_R, y: WHEEL.y + Math.sin(a) * TRACK_R };
};
for (let k = 0; k < BALL_N; k++) {
  const p = pocketAt(k);
  hazards.push({ kind: 'jet', rect: { x: p.x - BALL_S / 2, y: p.y - BALL_S / 2, w: BALL_S, h: BALL_S }, periodMs: BALL_PERIOD, onMs: BALL_ON, offsetMs: -(k * BALL_STEP), color: IVORY });
}
/** The turret's two gilt arms, sweeping the inside of the wheel. */
const TURRET_LEN = 110;
const TURRET_RAD = 1.0;
hazards.push(
  { kind: 'sweeper', x: WHEEL.x, y: WHEEL.y, length: TURRET_LEN, radPerSec: TURRET_RAD, phase: 0, color: GILT },
  { kind: 'sweeper', x: WHEEL.x, y: WHEEL.y, length: TURRET_LEN, radPerSec: TURRET_RAD, phase: Math.PI, color: GILT },
);

/** Floor II: five lanes, two flights each; a die tumbles down every lane on its own beat. */
const LANE_W = 196;
const LANE_X0 = L + 50;
const LANE_PITCH = LANE_W + 50;
const laneX = (i: number): number => LANE_X0 + i * LANE_PITCH;
const STAIR_ROWS = [1200, 1280, 1440, 1520];
const STAIR_H = 80;
const DIE_PERIOD = 3100;
const DIE_ON = 380;
const DIE_STEP = 240;
const rowTime = (r: number): number => r * DIE_STEP + (r >= 2 ? DIE_STEP : 0);
const LANE_PHASE = [0, 1240, 620, 1860, 310];
for (let i = 0; i < 5; i++) {
  STAIR_ROWS.forEach((y, r) => {
    hazards.push({ kind: 'jet', rect: { x: laneX(i), y, w: LANE_W, h: STAIR_H }, periodMs: DIE_PERIOD, onMs: DIE_ON, offsetMs: -(rowTime(r) + LANE_PHASE[i]), color: IVORY_SHADE });
  });
}

/** Floor III: the gallery of cards. Aces are timed jets; blanks are just cards. */
const CARD_W = 120;
const CARD_H = 92;
const CARD_COLS = 8;
const cardX = (c: number): number => 345 + c * 158;
const CARD_ROWS = [450, 560, 790, 900];
const ACE_PERIOD = 2800;
const ACE_ON = 700;
interface GalleryCard { x: number; y: number; ace: boolean; off: number; suit: number }
const GALLERY: GalleryCard[] = [];
{
  const rng = mulberry(0xace5);
  CARD_ROWS.forEach((y, r) => {
    for (let c = 0; c < CARD_COLS; c++) {
      // The middle two columns (the obvious way up) are mostly aces; elsewhere about a third.
      const centre = c === 3 || c === 4;
      const ace = centre ? (r + c) % 4 !== 0 : rng() < 0.34;
      GALLERY.push({ x: cardX(c), y, ace, off: -Math.floor(rng() * ACE_PERIOD), suit: Math.floor(rng() * 4) });
    }
  });
}
for (const c of GALLERY) {
  if (!c.ace) continue;
  hazards.push({ kind: 'jet', rect: { x: c.x - CARD_W / 2, y: c.y - CARD_H / 2, w: CARD_W, h: CARD_H }, periodMs: ACE_PERIOD, onMs: ACE_ON, offsetMs: c.off, color: CARD_BLACK });
}
/** The river of spilt ink across the gallery: lethal until the Blotter is pulled. */
const BLOTTER = 'house-blotter';
const INK_RIVER: Rect = { x: L, y: 625, w: R - L, h: 66 };
hazards.push({ kind: 'floor', rect: INK_RIVER, safeWhen: { flag: BLOTTER }, color: INK });
const BLOTTER_AT: Pt = { x: 1490, y: 716 };

// ── Gates ────────────────────────────────────────────────────────────

const gates: WorldGate[] = [
  { rect: { x: DOOR_L, y: 1680, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'house-warden-1' }, look: 'dice', label: 'Beat the Pit Boss' },
  { rect: { x: DOOR_L, y: 1000, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'house-warden-2' }, look: 'dice', label: 'Beat Bones Mallory' },
  { rect: { x: DOOR_L, y: 290, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'house-warden-3' }, look: 'vault', label: 'Beat Quillon the Marker' },
];

// ── Solids ───────────────────────────────────────────────────────────

const CROSS_WALLS = [2240, 1680, 1000, 290];
const solids: Solid[] = [
  { kind: 'rect', x: 0, y: 0, w: L, h: H },
  { kind: 'rect', x: R, y: 0, w: W - R, h: H },
  { kind: 'rect', x: L, y: 0, w: R - L, h: 40 },
  { kind: 'rect', x: L, y: H - 36, w: R - L, h: 36 },
];
for (const y of CROSS_WALLS) solids.push({ kind: 'rect', x: L, y, w: DOOR_L - L, h: 40 }, { kind: 'rect', x: DOOR_R, y, w: R - DOOR_R, h: 40 });
/** Floor I: the gaming tables wall the wheel in on both sides. */
const TABLE_BLOCK_Y = 1850;
const TABLE_BLOCK_H = 2170 - TABLE_BLOCK_Y;
solids.push({ kind: 'rect', x: L, y: TABLE_BLOCK_Y, w: 700 - L, h: TABLE_BLOCK_H }, { kind: 'rect', x: 1100, y: TABLE_BLOCK_Y, w: R - 1100, h: TABLE_BLOCK_H });
/** Floor II: the dice balustrades between the lanes, and the margins at the walls (flights only). */
for (const [y0, y1] of [[1200, 1360], [1440, 1600]]) {
  solids.push({ kind: 'rect', x: L, y: y0, w: LANE_X0 - L, h: y1 - y0 }, { kind: 'rect', x: laneX(4) + LANE_W, y: y0, w: R - laneX(4) - LANE_W, h: y1 - y0 });
  for (let i = 0; i < 4; i++) solids.push({ kind: 'rect', x: laneX(i) + LANE_W, y: y0, w: 50, h: y1 - y0 });
}
/** The High Table narrows between the bank's towers. */
solids.push({ kind: 'rect', x: L, y: 40, w: 180, h: 250 }, { kind: 'rect', x: R - 180, y: 40, w: 180, h: 250 });
/** The High Table itself. */
solids.push({ kind: 'rect', x: MID - 200, y: 96, w: 400, h: 74 });

// ── Ground ───────────────────────────────────────────────────────────

/** The cellar: worn flagstones under sawdust, a spill of chips, the gutter where the takings drain. */
function cellarFloor(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(0x2a2220, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const S = 54;
  for (let y = r.y; y < r.y + r.h; y += S) {
    for (let x = r.x + ((y / S) % 2) * (S / 2) - S / 2; x < r.x + r.w; x += S) {
      const c = rng() < 0.5 ? 0x4a3e38 : 0x403630;
      g.fillStyle(c, 1); g.fillRect(Math.max(r.x, x + 2), y + 2, S - 4, Math.min(S - 4, r.y + r.h - y - 2));
      g.fillStyle(lit(c, 0.12), 0.5); g.fillRect(Math.max(r.x, x + 2), y + 2, S - 4, 2);
    }
  }
  for (let i = 0; i < 260; i++) { g.fillStyle(0xc8a878, 0.25); g.fillRect(r.x + rng() * r.w, r.y + rng() * r.h, 2, 1); }
  for (let i = 0; i < 22; i++) chip(g, r.x + rng() * r.w, r.y + 30 + rng() * (r.h - 40), 5, [CARD_RED, CARD_BLACK, GILT, IVORY][i % 4], 0.8);
}

/** Floor I: red-and-black marquetry, laid like a betting layout, every square edged in gilt. */
function marquetry(g: G, r: Rect, rng: () => number): void {
  const S = 64;
  for (let y = r.y; y < r.y + r.h; y += S) {
    for (let x = r.x; x < r.x + r.w; x += S) {
      const k = (Math.floor((x - r.x) / S) + Math.floor((y - r.y) / S)) % 2;
      const c = k ? CARD_RED_DEEP : 0x1a1418;
      g.fillStyle(c, 1); g.fillRect(x, y, Math.min(S, r.x + r.w - x), Math.min(S, r.y + r.h - y));
      g.fillStyle(lit(c, 0.1), 0.4); g.fillRect(x + 3, y + 3, Math.min(S, r.x + r.w - x) - 6, 2);
      if (rng() < 0.08) { g.lineStyle(1, 0x000000, 0.5); g.lineBetween(x + rng() * S, y + 4, x + rng() * S, y + S - 4); }
    }
  }
  g.lineStyle(1, GILT_DARK, 0.5);
  for (let x = r.x; x <= r.x + r.w; x += S) g.lineBetween(x, r.y, x, r.y + r.h);
  for (let y = r.y; y <= r.y + r.h; y += S) g.lineBetween(r.x, y, r.x + r.w, y);
}

/** Floor II: white marble treads and dark risers, a red runner up every lane with gilt stair-rods. */
function stairLane(g: G, x: number, y0: number, y1: number, rng: () => number): void {
  for (let y = y0; y < y1; y += 40) {
    g.fillStyle(0xd8d0c4, 1); g.fillRect(x, y, LANE_W, 34);
    g.fillStyle(0xf0ece4, 1); g.fillRect(x, y, LANE_W, 4);
    g.fillStyle(0x6a625a, 1); g.fillRect(x, y + 34, LANE_W, 6);
    for (let i = 0; i < 3; i++) { g.lineStyle(1, 0xa8a094, 0.6); g.lineBetween(x + rng() * LANE_W, y + 4, x + rng() * LANE_W, y + 30); }
  }
  g.fillStyle(CARD_RED_DEEP, 1); g.fillRect(x + 40, y0, LANE_W - 80, y1 - y0);
  g.fillStyle(CARD_RED, 0.5); g.fillRect(x + 44, y0, LANE_W - 88, y1 - y0);
  for (let y = y0 + 34; y < y1; y += 40) { g.fillStyle(GILT, 1); g.fillRect(x + 34, y - 2, LANE_W - 68, 3); g.fillStyle(GILT_LIT, 1); g.fillCircle(x + 34, y - 1, 2.5); g.fillCircle(x + LANE_W - 34, y - 1, 2.5); }
}

/** Landings: parquet in the House's herringbone. */
function herringbone(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(MAHOGANY_DEEP, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const Lw = 40, T = 12;
  for (let y = r.y - Lw; y < r.y + r.h; y += T * 2) {
    for (let x = r.x - Lw; x < r.x + r.w; x += Lw) {
      if (y + T * 2 < r.y || y > r.y + r.h) continue;
      const k = Math.floor(x / Lw + y / (T * 2)) % 2 === 0;
      g.fillStyle(k ? MAHOGANY : dim(MAHOGANY, 0.3), 1);
      g.fillPoints([{ x, y }, { x: x + Lw, y: y + Lw / 2 }, { x: x + Lw, y: y + Lw / 2 + T }, { x, y: y + T }], true, true);
      if (rng() < 0.1) { g.fillStyle(lit(MAHOGANY, 0.2), 0.3); g.fillRect(x + 4, y + 4, Lw - 8, 1); }
    }
  }
  // Trim the herringbone's overspill back to the landing.
  g.fillStyle(0x0e0608, 1); g.fillRect(r.x, r.y - Lw - 4, r.w, Lw + 4); g.fillRect(r.x, r.y + r.h, r.w, Lw + 4);
}

/** Floor III: black lacquer, and the cards laid on it. The aces' backs carry Quillon's nick. */
function galleryFloor(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(0x0e0c12, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let i = 0; i < 90; i++) { g.fillStyle(0x2a2836, 0.35); g.fillRect(r.x + rng() * r.w, r.y + rng() * r.h, 40 + rng() * 80, 1); }
  for (const c of GALLERY) {
    playingCard(g, c.x, c.y, CARD_W, CARD_H, 0, 'back');
    if (c.ace) {
      const mx = c.x + CARD_W / 2 - 12, my = c.y - CARD_H / 2 + 11;
      g.fillStyle(INK, 1); g.fillCircle(mx, my, 5);
      g.fillTriangle(mx - 3.5, my, mx + 3.5, my, mx, my + 13);
      g.fillStyle(0x8a9ad8, 0.6); g.fillCircle(mx - 1.5, my - 1.5, 1.5);
    }
  }
}

/** The High Table's room: baize, wall to wall, with a gilt rope and the four suits. */
function tableRoom(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(BAIZE_DEEP, 1); g.fillRect(r.x, r.y, r.w, r.h);
  g.fillStyle(BAIZE, 1); g.fillRect(r.x + 10, r.y + 10, r.w - 20, r.h - 20);
  for (let i = 0; i < 900; i++) { g.fillStyle(rng() < 0.5 ? BAIZE_LIT : BAIZE_DEEP, 0.25); g.fillRect(r.x + rng() * r.w, r.y + rng() * r.h, 2, 1); }
  g.lineStyle(3, GILT, 0.8); g.strokeRect(r.x + 14, r.y + 14, r.w - 28, r.h - 28);
  (['spade', 'heart', 'club', 'diamond'] as const).forEach((s, i) => {
    suitPip(g, r.x + 120 + i * ((r.w - 240) / 3), r.y + r.h - 40, 12, s, s === 'heart' || s === 'diamond' ? CARD_RED : CARD_BLACK, 0.6);
  });
}

/** A velvet wall band with gilt pilasters — the House's walls, everywhere. */
function wallBand(g: G, x: number, w: number, rng: () => number): void {
  g.fillStyle(0x12060a, 1); g.fillRect(x, 0, w, H);
  g.fillStyle(VELVET, 1); g.fillRect(x + 6, 0, w - 12, H);
  for (let y = 0; y < H; y += 6) { g.fillStyle(dim(VELVET, 0.2), 0.4); g.fillRect(x + 6, y, w - 12, 2); }
  for (let y = 40; y < H; y += 160) {
    g.fillStyle(GILT_DARK, 1); g.fillRect(x + w / 2 - 6, y, 12, 120);
    g.fillStyle(GILT, 1); g.fillRect(x + w / 2 - 3, y, 6, 120);
    wheelSeal(g, x + w / 2, y + 140, 10, GILT, 0.7);
  }
  for (let i = 0; i < 30; i++) { g.fillStyle(0x000000, 0.2); g.fillCircle(x + rng() * w, rng() * H, 2 + rng() * 6); }
}

function paintGround(g: G, rng: () => number): void {
  g.fillStyle(0x0e0608, 1); g.fillRect(0, 0, W, H);
  wallBand(g, 0, L, rng);
  wallBand(g, R, W - R, rng);

  // The Counting Cellar.
  cellarFloor(g, { x: L, y: 2280, w: R - L, h: H - 36 - 2280 }, rng);
  // The drain-grate in the middle, where the night's takings are swept down to the vaults.
  g.fillStyle(0x0a0808, 1); g.fillCircle(MID, 2400, 60);
  g.lineStyle(3, GILT_DARK, 0.9); g.strokeCircle(MID, 2400, 58);
  for (let k = -4; k <= 4; k++) { g.lineStyle(3, 0x3a3230, 1); g.lineBetween(MID + k * 12, 2400 - Math.sqrt(3364 - k * k * 144), MID + k * 12, 2400 + Math.sqrt(3364 - k * k * 144)); }
  wheelSeal(g, MID, 2404, 26, GILT_DARK, 0.6);

  // Floor I: the Roulette Floor.
  marquetry(g, { x: L, y: 1720, w: R - L, h: 520 }, rng);
  // The great wheel let into the floor: the static bowl (the pockets turn in animate).
  g.fillStyle(0x000000, 0.4); g.fillCircle(WHEEL.x + 6, WHEEL.y + 10, TRACK_R + 40);
  rouletteWheel(g, WHEEL.x, WHEEL.y, TRACK_R + 34, 0, 1, 1);
  // The rim track: the pockets the ball runs, each a numbered cup.
  for (let k = 0; k < BALL_N; k++) {
    const p = pocketAt(k);
    g.fillStyle(MAHOGANY_DEEP, 1); g.fillCircle(p.x, p.y, 22);
    g.fillStyle(k % 2 ? CARD_RED : CARD_BLACK, 1); g.fillCircle(p.x, p.y, 18);
    g.lineStyle(2, GILT, 1); g.strokeCircle(p.x, p.y, 22);
  }
  // Chalked arrows round the outside: which way the ball runs.
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    const x = WHEEL.x + Math.cos(a) * (TRACK_R + 46), y = WHEEL.y + Math.sin(a) * (TRACK_R + 46);
    const tx = -Math.sin(a), ty = Math.cos(a);
    g.lineStyle(2, IVORY, 0.35);
    g.lineBetween(x - tx * 8 + Math.cos(a) * 5, y - ty * 8 + Math.sin(a) * 5, x, y);
    g.lineBetween(x - tx * 8 - Math.cos(a) * 5, y - ty * 8 - Math.sin(a) * 5, x, y);
  }

  // Floor II: the Dice Stair.
  herringbone(g, { x: L, y: 1600, w: R - L, h: 80 }, rng);
  herringbone(g, { x: L, y: 1360, w: R - L, h: 80 }, rng);
  herringbone(g, { x: L, y: 1040, w: R - L, h: 160 }, rng);
  for (let i = 0; i < 5; i++) {
    stairLane(g, laneX(i), 1200, 1360, rng);
    stairLane(g, laneX(i), 1440, 1600, rng);
  }
  // Each lane's number, inlaid on the landing above it in pips.
  for (let i = 0; i < 5; i++) {
    const cx = laneX(i) + LANE_W / 2;
    g.fillStyle(IVORY, 0.8); g.fillRoundedRect(cx - 18, 1386, 36, 30, 4);
    for (let k = 0; k <= i; k++) { g.fillStyle(CARD_BLACK, 1); g.fillCircle(cx - 12 + (k % 3) * 12, 1394 + Math.floor(k / 3) * 12, 3); }
  }

  // Floor III: the Card Gallery.
  galleryFloor(g, { x: L, y: 330, w: R - L, h: 670 }, rng);
  // The ink river's bed, a stained trough across the floor.
  g.fillStyle(0x060810, 1); g.fillRect(INK_RIVER.x, INK_RIVER.y - 6, INK_RIVER.w, INK_RIVER.h + 12);
  for (let i = 0; i < 40; i++) { g.fillStyle(INK, 0.6); g.fillEllipse(L + rng() * (R - L), INK_RIVER.y - 8 + (rng() < 0.5 ? 0 : INK_RIVER.h + 16), 20 + rng() * 40, 6 + rng() * 6); }

  // The High Table.
  tableRoom(g, { x: L, y: 40, w: R - L, h: 250 }, rng);

  // The partitions between the floors: mahogany, gilt-railed, a doorway in each.
  for (const y of CROSS_WALLS) {
    for (const [x0, x1] of [[L, DOOR_L], [DOOR_R, R]]) {
      g.fillStyle(MAHOGANY_DEEP, 1); g.fillRect(x0, y, x1 - x0, 40);
      g.fillStyle(MAHOGANY, 1); g.fillRect(x0, y + 4, x1 - x0, 30);
      g.fillStyle(GILT, 1); g.fillRect(x0, y + 2, x1 - x0, 3); g.fillRect(x0, y + 34, x1 - x0, 2);
      for (let x = x0 + 30; x < x1; x += 90) wheelSeal(g, x, y + 20, 9, GILT_DARK, 0.9);
    }
  }
}

// ── Set pieces ───────────────────────────────────────────────────────

const pieces: NonNullable<AreaDef['painter']['pieces']> = [];

/** The cashier's cage: a gilt-barred booth where the takings are counted and the Lots are kept. */
pieces.push({
  x: 1260, y: 2380, w: 260, h: 200, draw: (g) => {
    const x = 1260, y = 2380;
    shadow(g, x, y + 4, 240, 26, 0.45);
    g.fillStyle(MAHOGANY_DEEP, 1); g.fillRect(x - 120, y - 70, 240, 70);
    g.fillStyle(MAHOGANY, 1); g.fillRect(x - 116, y - 66, 232, 62);
    g.fillStyle(MAHOGANY_LIT, 1); g.fillRect(x - 120, y - 74, 240, 6);
    // The cage above the counter.
    g.fillStyle(0x1a0e0a, 0.8); g.fillRect(x - 112, y - 180, 224, 106);
    for (let k = 0; k < 8; k++) { g.fillStyle(lit(MAHOGANY, 0.1), 0.6); g.fillRect(x - 106, y - 170 + k * 12, 212, 2); }
    // Pigeonholes full of Lots.
    for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) { g.fillStyle(0x0a0606, 1); g.fillRect(x - 104 + c * 21, y - 172 + r * 24, 18, 20); lotToken(g, x - 95 + c * 21, y - 160 + r * 24, 4, (r * 10 + c) % 7 === 0 ? 0 : 0.9); }
    for (let k = 0; k <= 14; k++) { g.fillStyle(GILT, 1); g.fillRect(x - 112 + k * 16, y - 184, 3, 112); }
    g.fillStyle(GILT, 1); g.fillRect(x - 116, y - 188, 232, 6);
    wheelSeal(g, x, y - 206, 16, GILT, 1);
    // The window and its little brass bell.
    g.fillStyle(0x0a0606, 1); g.fillRoundedRect(x - 26, y - 118, 52, 44, 10);
    g.fillStyle(GILT, 1); g.fillTriangle(x + 46, y - 74, x + 58, y - 74, x + 52, y - 86);
    // Chips stacked on the counter.
    chipStack(g, x - 80, y - 74, 6, CARD_RED, 8); chipStack(g, x - 56, y - 74, 4, CARD_BLACK, 8); chipStack(g, x + 76, y - 74, 7, GILT, 8);
    rake(g, x - 30, y - 80, x + 30, y - 76);
  },
});
solids.push({ kind: 'rect', x: 1140, y: 2310, w: 240, h: 70 });

/** Tonight's Draw: the numbers board, its brass plates showing the numbers that were called. */
pieces.push({
  x: 520, y: 2370, w: 260, h: 220, draw: (g, rng) => {
    const x = 520, y = 2370;
    shadow(g, x, y + 4, 220, 22, 0.4);
    for (const px of [x - 110, x + 104]) { g.fillStyle(MAHOGANY_DEEP, 1); g.fillRect(px, y - 200, 8, 200); }
    g.fillStyle(0x0e0a08, 1); g.fillRect(x - 112, y - 200, 224, 150);
    g.lineStyle(4, GILT, 1); g.strokeRect(x - 112, y - 200, 224, 150);
    wheelSeal(g, x, y - 216, 14, GILT, 1);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 6; c++) {
        const bx = x - 98 + c * 34, by = y - 188 + r * 28;
        const drawn = rng() < 0.4;
        g.fillStyle(drawn ? GILT : 0x3a3028, 1); g.fillRoundedRect(bx, by, 28, 22, 4);
        // Pips stand for the numbers — the busted cannot read the names, so the board never shows any.
        const n = 1 + Math.floor(rng() * 6);
        for (let k = 0; k < Math.min(n, 4); k++) { g.fillStyle(drawn ? CARD_BLACK : 0x5a5048, 1); g.fillCircle(bx + 6 + k * 5.5, by + 11, 2); }
      }
    }
    // The favourites' row: always dark, never called.
    g.fillStyle(CARD_RED_DEEP, 0.6); g.fillRect(x - 100, y - 50, 200, 14);
  },
});
solids.push({ kind: 'rect', x: 404, y: 2356, w: 232, h: 16 });

/** The cellar door arch back down to the War Court. */
pieces.push({
  x: MID, y: H - 30, w: 220, h: 170, draw: (g) => {
    g.fillStyle(MAHOGANY_DEEP, 1); g.fillRect(MID - 100, H - 170, 200, 140);
    g.fillStyle(0x0a0606, 1); g.fillRoundedRect(MID - 64, H - 150, 128, 120, { tl: 60, tr: 60, bl: 0, br: 0 });
    g.lineStyle(5, GILT, 1); g.strokeRoundedRect(MID - 64, H - 150, 128, 120, { tl: 60, tr: 60, bl: 0, br: 0 });
    wheelSeal(g, MID, H - 166, 14, GILT, 1);
    for (const s of [-1, 1]) greenLamp(g, MID + s * 86, H - 120, 0.9, true, H - 170);
  },
});

/** Floor I: the gaming tables walling the wheel in, each with its lamp. */
for (const [tx, ty] of [[380, 1960], [560, 1960], [380, 2140], [560, 2140], [1240, 1960], [1420, 1960], [1240, 2140], [1420, 2140]] as [number, number][]) {
  pieces.push({ x: tx, y: ty, w: 180, h: 200, draw: (g) => gamingTable(g, tx, ty, 150, mulberry(tx * 7 + ty)) });
}
/** Floor I: the turret's hub, a gilt crown on the axle. */
pieces.push({
  x: WHEEL.x, y: WHEEL.y + 14, w: 60, h: 60, draw: (g) => {
    g.fillStyle(GILT_DARK, 1); g.fillCircle(WHEEL.x, WHEEL.y, 18);
    g.fillStyle(GILT, 1); g.fillCircle(WHEEL.x, WHEEL.y - 2, 14);
    wheelSeal(g, WHEEL.x, WHEEL.y - 10, 12, GILT_LIT, 1);
  },
});

/** Floor II: the balustrades — giant dice stacked between the lanes, a gilt rail along the top. */
for (const [y0, y1] of [[1200, 1360], [1440, 1600]]) {
  const xs = [LANE_X0 - 25, ...[0, 1, 2, 3].map((i) => laneX(i) + LANE_W + 25), laneX(4) + LANE_W + 25];
  for (const x of xs) {
    pieces.push({
      x, y: y1, w: 70, h: y1 - y0 + 60, draw: (g, rng) => {
        shadow(g, x, y1, 60, 16, 0.4);
        for (let y = y1 - 24; y > y0 - 20; y -= 44) die(g, x, y, 42, 1 + Math.floor(rng() * 6), (rng() - 0.5) * 0.25, 1, true);
        g.fillStyle(GILT_DARK, 1); g.fillRect(x - 24, y0 - 46, 48, 6);
        g.fillStyle(GILT, 1); g.fillRect(x - 24, y0 - 48, 48, 3);
      },
    });
  }
}
/** The top landing: Mallory's cup on its pedestal. */
pieces.push({
  x: 560, y: 1120, w: 80, h: 110, draw: (g) => {
    shadow(g, 560, 1120, 60, 14);
    g.fillStyle(MAHOGANY_DEEP, 1); g.fillRect(538, 1080, 44, 40);
    g.fillStyle(GILT_DARK, 1); g.fillTriangle(536, 1080, 584, 1080, 560, 1010);
    g.fillStyle(GILT, 1); g.fillRect(540, 1036, 40, 44);
    g.fillStyle(GILT_LIT, 1); g.fillRect(540, 1036, 40, 3);
    g.fillStyle(GILT, 1); g.fillEllipse(560, 1034, 40, 8);
    die(g, 600, 1110, 20, 1, 0.2); die(g, 618, 1114, 20, 1, -0.3);
  },
});
solids.push({ kind: 'rect', x: 536, y: 1100, w: 48, h: 20 });

/** Floor III: card-houses along the walls, and lamps over the gallery. */
for (const [hx, side] of [[300, 1], [1500, -1]] as [number, number][]) {
  for (const hy of [520, 870]) {
    pieces.push({
      x: hx, y: hy, w: 80, h: 160, draw: (g) => {
        // A house of cards three storeys high, leant against the velvet.
        for (let s = 0; s < 3; s++) {
          const n = 3 - s;
          for (let k = 0; k < n; k++) {
            const cx = hx + side * 4 + (k - (n - 1) / 2) * 22, cy = hy - 20 - s * 40;
            playingCard(g, cx - 6, cy, 12, 40, 0.28, 'back');
            playingCard(g, cx + 6, cy, 12, 40, -0.28, 'back');
          }
          g.fillStyle(IVORY, 1); g.fillRect(hx - (n * 11), hy - 42 - s * 40, n * 22, 3);
        }
      },
    });
  }
}
for (const lx of [600, 900, 1200]) {
  for (const ly of [500, 850]) pieces.push({ x: lx, y: ly - 100, w: 60, h: 100, draw: (g) => greenLamp(g, lx, ly - 100, 1, true, ly - 200) });
}
/** The Blotter: a great rocker blotter on a stand, its handle the lever. */
pieces.push({
  x: BLOTTER_AT.x, y: BLOTTER_AT.y + 10, w: 80, h: 70, draw: (g) => {
    const { x, y } = BLOTTER_AT;
    shadow(g, x, y + 10, 70, 14);
    g.fillStyle(MAHOGANY, 1); g.fillRect(x - 30, y - 10, 60, 18);
    g.fillStyle(0xe8e0c8, 1); g.beginPath(); g.arc(x, y - 6, 30, Math.PI, 0, false); g.fillPath();
    g.fillStyle(INK, 0.6); g.fillEllipse(x - 6, y - 14, 18, 6);
    g.fillStyle(GILT, 1); g.fillRect(x - 3, y - 50, 6, 30); g.fillCircle(x, y - 52, 6);
  },
});

/** The High Table: Lucan's table, his chair behind it, and the drum — broken open once he falls. */
pieces.push({
  x: MID, y: 170, w: 460, h: 150, draw: (g, rng) => {
    shadow(g, MID, 172, 440, 36, 0.5);
    // The chair: a tall back of red leather with a gilt wheel at its crown.
    g.fillStyle(CARD_RED_DEEP, 1); g.fillRoundedRect(MID - 44, 46, 88, 70, 18);
    g.lineStyle(3, GILT, 1); g.strokeRoundedRect(MID - 44, 46, 88, 70, 18);
    for (let k = 0; k < 4; k++) for (let j = 0; j < 3; j++) { g.fillStyle(GILT_DARK, 1); g.fillCircle(MID - 30 + k * 20, 62 + j * 18, 2); }
    rouletteWheel(g, MID, 40, 26, 0.3, 1, 1);
    // The table.
    g.fillStyle(MAHOGANY_DEEP, 1); g.fillEllipse(MID, 130, 420, 90);
    g.fillStyle(MAHOGANY_LIT, 1); g.fillEllipse(MID, 126, 410, 82);
    g.fillStyle(BAIZE, 1); g.fillEllipse(MID, 128, 384, 66);
    g.lineStyle(2, GILT_LIT, 0.6);
    g.beginPath(); g.arc(MID, 100, 150, 0.4, Math.PI - 0.4, false); g.strokePath();
    for (let k = 0; k < 7; k++) g.strokeRect(MID - 150 + k * 44, 132, 32, 18);
    for (let k = 0; k < 6; k++) chipStack(g, MID - 140 + rng() * 280, 118 + rng() * 14, 3 + Math.floor(rng() * 6), [CARD_RED, CARD_BLACK, GILT][k % 3], 7);
    for (let k = 0; k < 5; k++) playingCard(g, MID - 50 + k * 24, 148, 18, 26, -0.3 + k * 0.15, k === 4 ? { suit: 'spade', pips: 1 } : 'back');
    for (const s of [-1, 1]) greenLamp(g, MID + s * 130, 70, 1.2, true, 40);
  },
});
/** The great drum, whole — while the King sits. */
pieces.push({
  x: 1150, y: 230, w: 120, h: 150, when: { not: { monarch: 'lucan' } }, draw: (g) => {
    const x = 1150, y = 230;
    shadow(g, x, y, 100, 20, 0.4);
    g.fillStyle(MAHOGANY_DEEP, 1); g.fillRect(x - 46, y - 20, 8, 20); g.fillRect(x + 38, y - 20, 8, 20);
    g.lineStyle(6, GILT, 1); g.strokeCircle(x, y - 70, 48);
    g.lineStyle(2, GILT_DARK, 1);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI; g.lineBetween(x + Math.cos(a) * 48, y - 70 + Math.sin(a) * 48, x - Math.cos(a) * 48, y - 70 - Math.sin(a) * 48); }
    for (let k = 0; k < 14; k++) lotToken(g, x - 30 + (k % 5) * 15, y - 50 - Math.floor(k / 5) * 12, 5);
    g.fillStyle(GILT_LIT, 1); g.fillCircle(x, y - 70, 6);
    g.lineStyle(4, GILT_DARK, 1); g.lineBetween(x + 48, y - 70, x + 72, y - 40);
  },
});
/** ...and broken open after: its false bottom spilling the favourites' Lots across the felt. */
pieces.push({
  x: 1150, y: 230, w: 160, h: 150, when: { monarch: 'lucan' }, draw: (g, rng) => {
    const x = 1150, y = 230;
    shadow(g, x, y, 120, 20, 0.4);
    g.lineStyle(6, GILT, 1);
    g.beginPath(); g.arc(x, y - 60, 48, Math.PI * 0.9, Math.PI * 2.1, false); g.strokePath();
    g.fillStyle(MAHOGANY_DEEP, 1); g.fillRect(x - 40, y - 22, 80, 10);
    g.fillStyle(0x0a0606, 1); g.fillRect(x - 36, y - 20, 72, 6);
    for (let k = 0; k < 26; k++) lotToken(g, x - 70 + rng() * 140, y - 14 + rng() * 26, 5);
  },
});

// ── Animation ────────────────────────────────────────────────────────

function animateUnder(g: G, t: number, view: Rect, world: PainterWorld): void {
  // Floor I: the wheel's inner pockets turn slowly under the turret.
  if (near(view, WHEEL.x, WHEEL.y, 260)) {
    const N = 18, spin = t * 0.35;
    for (let i = 0; i < N; i++) {
      const a0 = spin + (i / N) * Math.PI * 2, a1 = a0 + (Math.PI * 2) / N;
      g.fillStyle(i === 0 ? 0x1a8a4a : i % 2 ? CARD_RED : CARD_BLACK, 0.55);
      g.slice(WHEEL.x, WHEEL.y, 128, a0, a1, false); g.fillPath();
    }
    g.lineStyle(2, GILT, 0.6); g.strokeCircle(WHEEL.x, WHEEL.y, 128);
    // The ball itself, running the track: it sits on whichever pocket is firing.
    const ph = jetPhase(t, BALL_PERIOD, -BALL_ON / 2);
    const a = (ph / BALL_PERIOD) * Math.PI * 2;
    const bx = WHEEL.x + Math.cos(a) * TRACK_R, by = WHEEL.y + Math.sin(a) * TRACK_R;
    g.fillStyle(0x000000, 0.35); g.fillEllipse(bx + 6, by + 18, 60, 18);
    g.fillStyle(IVORY_SHADE, 1); g.fillCircle(bx, by, 26);
    g.fillStyle(IVORY, 1); g.fillCircle(bx - 3, by - 3, 22);
    const roll = a * 7;
    g.lineStyle(1.5, IVORY_SHADE, 1);
    g.lineBetween(bx + Math.cos(roll) * 18, by - 20, bx + Math.cos(roll) * 12, by + 20);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(bx - 9, by - 10, 6);
    // A ghost of the ball's last few pockets — so you can see which way it is going.
    for (let k = 1; k <= 3; k++) {
      const ga = a - k * 0.22;
      g.fillStyle(IVORY, 0.14 - k * 0.03); g.fillCircle(WHEEL.x + Math.cos(ga) * TRACK_R, WHEEL.y + Math.sin(ga) * TRACK_R, 22);
    }
  }
  // Floor II: a die tumbling down each lane — drawn over whichever row it is on, mid-bounce.
  if (near(view, MID, 1400, 700)) {
    for (let i = 0; i < 5; i++) {
      const ph = jetPhase(t, DIE_PERIOD, -LANE_PHASE[i]);
      const cx = laneX(i) + LANE_W / 2;
      let y = -1;
      let rowK = 0;
      for (let r = 0; r < 4; r++) {
        const s = rowTime(r);
        if (ph >= s && ph < s + DIE_STEP) { y = STAIR_ROWS[r] + STAIR_H / 2; rowK = (ph - s) / DIE_STEP; }
      }
      // Over the landing between the flights it bounds high.
      const landStart = rowTime(1) + DIE_STEP, landEnd = rowTime(2);
      if (ph >= landStart && ph < landEnd) { const k = (ph - landStart) / (landEnd - landStart); y = 1360 + k * 80; rowK = k; }
      if (ph > DIE_PERIOD - 500) {
        // Waiting at the top of its lane, rattling in the cup's mouth.
        const sh = Math.sin(t * 60) * 2;
        die(g, cx + sh, 1176, 52, 1 + (Math.floor(t * 8) % 6), sh * 0.04, 0.7, true);
        continue;
      }
      if (y < 0) continue;
      const hop = Math.sin(rowK * Math.PI) * 26;
      g.fillStyle(0x000000, 0.3); g.fillEllipse(cx, y + 26, 70, 16);
      die(g, cx, y - hop, 80, 1 + ((Math.floor(t * 10) + i) % 6), (rowK - 0.5) * 1.2, 1, true);
    }
  }
  // Floor III: the aces flip face-up on their beat — and the backs wobble just before.
  if (near(view, MID, 680, 700)) {
    for (const c of GALLERY) {
      if (!c.ace || !near(view, c.x, c.y, 80)) continue;
      const ph = jetPhase(t, ACE_PERIOD, c.off);
      if (ph < ACE_ON) {
        const k = Math.min(1, ph / 120);
        playingCard(g, c.x, c.y, CARD_W, CARD_H, 0, { suit: (['spade', 'heart', 'club', 'diamond'] as const)[c.suit], pips: 1 }, 1, k);
        if (ph < 160) { g.fillStyle(0xffffff, 0.4 * (1 - ph / 160)); g.fillRect(c.x - CARD_W / 2, c.y - CARD_H / 2, CARD_W, CARD_H); }
      } else if (ph > ACE_PERIOD - 500) {
        const w = Math.sin(t * 40) * 0.04;
        playingCard(g, c.x, c.y, CARD_W, CARD_H, w, 'back');
        g.fillStyle(INK, 1); g.fillCircle(c.x + CARD_W / 2 - 12, c.y - CARD_H / 2 + 11, 5);
      }
    }
    // The ink river, rippling while it is wet; drying to a crust once blotted.
    if (near(view, MID, INK_RIVER.y, 800)) {
      const dry = world.test({ flag: BLOTTER });
      for (let x = INK_RIVER.x + ((t * 40) % 60); x < INK_RIVER.x + INK_RIVER.w; x += 60) {
        g.lineStyle(2, dry ? 0x2a2a3a : 0x3a4a8a, dry ? 0.4 : 0.5);
        g.beginPath(); g.arc(x, INK_RIVER.y + INK_RIVER.h / 2, 14, Math.PI * 0.1, Math.PI * 0.9, false); g.strokePath();
      }
    }
  }
  // The High Table's lamps, breathing.
  if (near(view, MID, 160, 500)) {
    for (const s of [-1, 1]) glow(g, MID + s * 130, 120, 70 + Math.sin(t * 2 + s) * 6, LAMP_GREEN, 0.05);
  }
  // The busted standing about the House: a black chip at every throat.
  for (const n of NPCS) {
    if (!near(view, n.at.x, n.at.y, 80)) continue;
    const s = n.look.size ?? 1;
    const lotted = world.test({ monarch: 'lucan' });
    if (lotted) lotToken(g, n.at.x, n.at.y - 26 * s, 4);
    else blackChip(g, n.at.x, n.at.y - 26 * s, 4);
  }
}

function animateOver(g: G, t: number, view: Rect): void {
  // The Wheel on the ceiling over the High Table: a vast dark disc, turning, seen from below.
  if (near(view, MID, 140, 500)) {
    const cx = MID, cy = 20, r = 320, spin = t * 0.12;
    g.fillStyle(0x000000, 0.35); g.fillEllipse(cx, cy, r * 2, r * 0.5);
    for (let k = 0; k < 24; k++) {
      const a = spin + (k / 24) * Math.PI * 2;
      g.lineStyle(6, GILT_DARK, 0.35);
      g.lineBetween(cx + Math.cos(a) * 60, cy + Math.sin(a) * 15, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.25);
    }
    g.lineStyle(8, GILT, 0.4); g.strokeEllipse(cx, cy, r * 2, r * 0.5);
  }
  // Green lamplight pooling over the gaming tables of Floor I.
  if (near(view, MID, 2050, 700)) {
    for (const [tx, ty] of [[380, 1960], [560, 1960], [380, 2140], [560, 2140], [1240, 1960], [1420, 1960], [1240, 2140], [1420, 2140]]) {
      g.fillStyle(0xd8ffb0, 0.04 + Math.sin(t * 3 + tx) * 0.01); g.fillEllipse(tx, ty - 70, 170, 60);
    }
  }
}

// ── People: the busted ───────────────────────────────────────────────

const BUSTED = (body: number, size = 1, hat: 'visor' | 'none' = 'visor') => ({ body, accent: 0x16161c, hat, traits: ['apron' as const], size, eye: 0xd8c8a8 });

const NPCS: NpcDef[] = [
  {
    id: 'house-forty-one', name: 'Number Forty-One', title: 'Cashier of the Counting Cellar, busted',
    look: BUSTED(0xd8b898, 1.0),
    at: { x: 1260, y: 2420 },
    talks: [
      {
        when: { monarch: 'lucan' },
        lines: [
          'Pell. My name is Hesketh Pell. I baked bread on the Lantern Steps. I am allowed to say it now. Hesketh Pell.',
          'They broke the drum open upstairs. False bottom. Every favourite\'s Lot was in it, never once in the draw.',
          'Fourteen years I counted takings in this cage, and every coin of it was ours. I am going to bake something.',
        ],
      },
      {
        when: { encounter: 'house-warden-1' },
        lines: [
          'The Pit Boss is down? Forty years she ran that floor. The wheel has never been quiet before. Listen.',
          'The stair is next. The dice come down each lane on their own beat. Climb behind one. Use the landing.',
        ],
      },
      {
        lines: [
          'Takings in, Lots out. Takings in, Lots out. ...Sorry. I do not stop counting, even when there is nothing.',
          'Number Forty-One. That is what I am called. I lost the re-draw. Everybody loses the re-draw.',
          'The Roulette Floor is up the stair. The ball runs the rim, round and round. Cross behind it, not ahead.',
          'And the turret in the middle sweeps. Wait where its arms do not reach — just inside the rim.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'lucan' }, lines: ['Hesketh Pell. Hesketh Pell.', 'Bread. Real bread.'] },
      { lines: ['...takings in, Lots out...', '...forty-one, forty-one...', '...the House always...'] },
    ],
  },
  {
    id: 'house-nine', name: 'Number Nine', title: 'Ball-boy of the Roulette Floor, busted',
    look: BUSTED(0xe0c0a0, 0.78, 'none'),
    at: { x: 1440, y: 2205 },
    talks: [
      {
        when: { monarch: 'lucan' },
        lines: [
          'I\'m Tam! Tam Corrie! My mum bet our house on a re-draw for me and the wheel said no. It always said no.',
          'It was magnets. Under the floor. Under the WHOLE floor. I knew it. I polished that ball every night.',
          'I\'m going home. If there is a home. If not I\'m going to sit on the wheel till it stops for good.',
        ],
      },
      {
        when: { encounter: 'house-warden-1' },
        lines: [
          'You beat Old Vane! She used to hit my knuckles with the rake if the ball came back dull.',
          'She\'s not even a bad sort. She just never once looked down at the floor to see what it was doing.',
        ],
      },
      {
        lines: [
          'Psst. The ball goes round the way the arrows say. It lights each pocket a beat before it gets there.',
          'Step on the rim right after it\'s gone past. Then you\'ve got the whole lap. That\'s ages, honestly.',
          'Inside, don\'t stand near the middle. The turret swipes. I\'ve seen it swipe a whole tray of drinks.',
          '...I\'m Nine. I\'m not supposed to say anything else. I\'m not supposed to be saying this either.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'lucan' }, lines: ['Tam Corrie! That\'s me!', 'MAGNETS. I knew it.'] },
      { lines: ['...round and round...', '...behind it, not ahead...', '...polish the ball, Nine...'] },
    ],
  },
  {
    id: 'house-two-hundred', name: 'Number Two Hundred', title: 'Stair-sweeper of the Dice Stair, busted',
    look: BUSTED(0xa88a6a, 1.1),
    at: { x: 1440, y: 1640 },
    talks: [
      {
        when: { monarch: 'lucan' },
        lines: [
          'Orrin Gale. Sergeant, once, before the War Court\'s lottery drew me out of the trenches and into here.',
          'I swept up dice for six years. Every one of them came out of the same cup. Every one landed where he liked.',
          'I am going to go back down to the yard and tell them. Then I am going to sleep a whole night through.',
        ],
      },
      {
        when: { encounter: 'house-warden-2' },
        lines: [
          'Bones turned over. Never thought I\'d see it. Most folk never even think to look at the underside.',
          'The Gallery up top is worse. The aces stand up and cut. Read the backs — Quillon nicks every ace.',
        ],
      },
      {
        when: { encounter: 'house-warden-1' },
        lines: [
          'The stair. Five lanes, a die down each, each on its own count. Watch one lane through a whole roll first.',
          'Climb behind the die, not into it. Halfway there\'s a landing — safe ground. Change lanes there if you like.',
        ],
      },
      {
        lines: [
          '...sweep, sweep. Bones throws them, I sweep them. Two hundred. That is the number on my chip.',
          'You have not beaten the Pit Boss. The gate will not open for you. The House is very particular.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'lucan' }, lines: ['Orrin Gale. Sergeant.', 'A whole night through.'] },
      { lines: ['...sweep, sweep...', '...the underside...', '...watch one lane first...'] },
    ],
  },
  {
    id: 'house-seventeen', name: 'Number Seventeen', title: 'Ink-girl of the Card Gallery, busted',
    look: BUSTED(0xe8d0b8, 0.9),
    at: { x: 1460, y: 965 },
    talks: [
      {
        when: { monarch: 'lucan' },
        lines: [
          'Wren Ashby. I was a scribe at the Archive before they took my hours. I mixed his ink. Every drop.',
          'He marked every card on this isle with ink I made. I want to write something with it. Something true.',
          'A list. Everyone\'s name. All the busted. All of us. I know most of the numbers by heart. I\'ll start there.',
        ],
      },
      {
        when: { encounter: 'house-warden-3' },
        lines: [
          'Quillon\'s pen is down. I never thought it would be. He marked aces in his sleep.',
          'The King is through the vault. He\'ll deal you a hand — every card a rule. Strike every card off. Every one.',
        ],
      },
      {
        when: { flag: BLOTTER },
        lines: [
          'You blotted the river. It\'s drying already. Good. Mind the aces — the nicked corners, top-right.',
          'Don\'t walk up the middle. The middle is nearly all aces. That\'s the joke. He thinks it\'s very funny.',
        ],
      },
      {
        lines: [
          'The ink. Don\'t touch the ink. It\'s his, it\'s spilt right across the gallery, and it does not let go.',
          'The Blotter is on the east side, past the cards. Rock it and the river dries. Quillon hates it dry.',
          'And read the backs. See the little nick of ink in the corner? That one\'s an ace. It\'ll stand up and cut.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'lucan' }, lines: ['Wren Ashby. W-R-E-N.', 'A list of everyone.'] },
      { lines: ['...top-right corner...', '...do not touch the ink...', '...seventeen...'] },
    ],
  },
];

// ── POIs ─────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  {
    kind: 'door', at: { x: MID, y: 2530 }, to: 'war', arrive: { x: 1200, y: 260 },
    label: 'The Cellar Door — back out to the War Court',
  },
  { kind: 'waystone', at: { x: 700, y: 2460 } },
  { kind: 'lever', at: BLOTTER_AT, flag: BLOTTER, label: 'The Blotter' },
  { kind: 'encounter', id: 'house-warden-1' },
  { kind: 'encounter', id: 'house-warden-2' },
  { kind: 'encounter', id: 'house-warden-3' },
  { kind: 'monarch', id: 'lucan', at: { x: MID, y: 240 } },
  { kind: 'sign', at: { x: 1060, y: 2470 }, text: 'THE HOUSE. Re-draws purchased here. The House wishes every player the very best of luck.' },
  { kind: 'sign', at: { x: 1040, y: 2300 }, text: 'ROULETTE FLOOR. The ball runs as the arrows run. Players are asked not to stand on the rim.' },
  { kind: 'sign', at: { x: 1060, y: 1640 }, text: 'THE DICE STAIR. One die to a lane. Landings are for resting, not for wagering.' },
  { kind: 'sign', at: { x: 700, y: 965 }, text: 'CARD GALLERY. All cards are dealt fairly. Any card found marked is the property of the House.' },
  { kind: 'chest', id: 'house-chest-roulette', at: { x: 330, y: 2205 }, item: 'charm-house-lucky-ball', coins: 260 },
  { kind: 'chest', id: 'house-chest-stair', at: { x: 330, y: 1400 }, item: 'charm-house-loaded-die', orbs: 3 },
  { kind: 'chest', id: 'house-chest-gallery', at: { x: 330, y: 368 }, item: 'charm-house-ace-sleeve', coins: 200 },
  { kind: 'chest', id: 'house-chest-table', at: { x: 640, y: 262 }, coins: 620, orbs: 8, open: { monarch: 'lucan' } },
];

export const HOUSE_AREA: AreaDef = {
  id: 'house',
  isle: 'fate',
  name: 'The House',
  subtitle: 'the Croupier-King\'s casino-palace, under the great Wheel on the summit of Lotterhaven',
  w: W,
  h: H,
  bg: 0x0e0608,
  accent: GILT,
  weather: 'cards',
  spawn: { x: MID, y: 2440 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver },
  solids,
  exits: [],
  pois: POIS,
  npcs: NPCS,
  gloom: 0.2,
  hazards,
  gates,
  checkpoints: [
    { x: MID, y: 2440 },   // the counting cellar
    { x: MID, y: 2262 },   // the roulette floor door
    { x: 480, y: 2205 },   // the west tables
    { x: 1300, y: 2205 },  // the east tables
    { x: MID, y: 1760 },   // the north strip
    { x: 1180, y: 1755 },  // Vane's corner
    { x: MID, y: 1640 },   // the stair foot
    { x: MID, y: 1400 },   // the landing
    { x: 400, y: 1400 },   // the landing, west
    { x: 1400, y: 1400 },  // the landing, east
    { x: MID, y: 1120 },   // Mallory's landing
    { x: MID, y: 975 },    // the gallery door
    { x: 1490, y: 975 },   // the gallery, east
    { x: MID, y: 360 },    // Quillon's end
    { x: MID, y: 265 },    // under the Wheel
  ],
};

