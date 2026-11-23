import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { dim, flagstones, glow, lit, mulberry, type G } from '../../../../art/IsleArt';
import {
  bankLamp, bench, chequerRoad, clerksDesk, coin, coinBollard, coinFlat, coinPress, coinStack, countingHouse, crucible,
  exchangeStall, exchequer, hillLip, ingotPile, ledgerLawn, lampPool, mintHall, moneyBag, queueRope, rosettePlaza,
  sootPlume, strikeSparks, suitTopiary, tollBooth, tollBox, treasuryWaystone, tributeScales, turnstile, vaultDoor,
  type Suit,
} from './art';
import {
  BAIZE_DARK, BAIZE_DEEP, BRASS, BRASS_DARK, BRASS_LIT, GOLD, GOLD_LIT, GOLD_PALE, LACQUER, MARBLE, MARBLE_DARK,
  MARBLE_LIT, POOL, POOL_DEEP, POOL_LIT, RACE, RACE_DEEP, RACE_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT, TREASURY_COLOR,
} from './palette';
import { TREASURY_CROWD, TREASURY_NPCS } from './npcs';

/**
 * The Treasury Court — the King's mint and counting-houses, west of Tosswater.
 *
 * Read it from the Tosswater road in:
 * • **the toll bridge** (east): the only way over the mint race, a channel of grey-green spill
 *   water running the court's whole east side; the tollbooth stands at its west end with its
 *   turnstiles and Tollman Levy, the waystone and the carters' forecourt on the far bank;
 * • **the Square of Tribute** (centre): a coin-rosette of red and black paving round the Scales
 *   of Tribute, where every household's Wager-Tithe is weighed — the queue ropes run out east;
 * • **the Royal Mint** (north-west): the long sooty hall with its presses thumping in front, the
 *   crucibles and the stacked ingots of the yard, where Minter Stamp keeps the beat;
 * • **the Great Vault** (north-east): a round steel door as tall as a house, set in the hill —
 *   the Lot Register is kept in there, and Miser Gilt keeps the step;
 * • **Prince Bullion's Exchequer** (west): the gilt palace with its coin-stack dome at the end of
 *   the Square's west road;
 * • **Counting-House Row** (south-west): narrow marble bank fronts, lamps lit in every window,
 *   where Banker Compound lends; and **the gilded pool** (south), where the mint's spill settles
 *   gold-bright over sunken coin. The road north climbs to the Clockwork Court.
 */

export const TREASURY_W = 2400;
export const TREASURY_H = 1600;

const MAIN_Y = 800;
const NORTH_X = 1200;
/** The Square of Tribute and its scales. */
export const SQUARE: Pt = { x: 1200, y: 800 };
const SQUARE_R = 210;
export const SCALES_AT: Pt = { x: 1200, y: 760 };
/** The mint race, the channel the toll bridge crosses. */
const RACE_X0 = 2020, RACE_X1 = 2100;
const BRIDGE_Y0 = 745, BRIDGE_Y1 = 855;
/** The tollbooth at the bridge's west end. */
export const TOLLBOOTH: Pt = { x: 1950, y: 738 };
/** The Royal Mint's front wall, and its presses. */
export const MINT: Pt = { x: 640, y: 380 };
const PRESSES = [480, 640, 800];
const PRESS_Y = 446;
/** The Great Vault door's foot. */
export const VAULT: Pt = { x: 1650, y: 300 };
/** Prince Bullion's Exchequer — the middle of its front step. */
export const EXCHEQUER: Pt = { x: 360, y: 860 };
/** The gilded pool — the court's fishing water. */
export const GILDED_POOL: Rect = { x: 1460, y: 1250, w: 420, h: 200 };
/** Counting-House Row: the house fronts' x, their base line, and the street before them. */
const BANKS = [230, 400, 570, 740, 910];
const BANK_Y = 1170;
const STREET_Y = 1262;
/** Ottilie Ledgerwhite's exchange stall. */
export const STALL: Pt = { x: 900, y: 940 };
/** Dobbin's grain cart on the far bank. */
export const CART: Pt = { x: 2290, y: 980 };

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
const lamps: Pt[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid, when?: Piece['when']): void {
  pieces.push({ x, y, w, h, draw, when });
  if (solid) solids.push(solid);
}

// ── Layout ───────────────────────────────────────────────────────────

// The hill along the north edge, open where the Clockwork road climbs out.
const GAP = 110;
for (const [x0, x1] of [[0, NORTH_X - GAP], [NORTH_X + GAP, TREASURY_W]] as [number, number][]) {
  addPiece((x0 + x1) / 2, 120, x1 - x0, 80, (g, rng) => hillLip(g, x0, x1, 120, rng), { kind: 'rect', x: x0, y: 0, w: x1 - x0, h: 116 });
}
// The vault's hill stands deeper: a dressed retaining wall either side of the door.
addPiece(1660, 252, 700, 140, (g) => {
  for (const [x0, x1] of [[NORTH_X + GAP, 1490], [1810, RACE_X0]] as [number, number][]) {
    g.fillStyle(dim(MARBLE_DARK, 0.25), 1); g.fillRect(x0, 120, x1 - x0, 132);
    for (let by = 124; by < 250; by += 18) {
      for (let bx = x0 + ((by / 18) % 2 ? 0 : 14); bx < x1 - 6; bx += 28) {
        g.fillStyle(MARBLE_DARK, 1); g.fillRect(bx, by, 26, 16);
        g.fillStyle(MARBLE, 0.4); g.fillRect(bx, by, 26, 2);
      }
    }
    g.fillStyle(BAIZE_DEEP, 1); g.fillRect(x0, 114, x1 - x0, 10);
  }
}, { kind: 'rect', x: NORTH_X + GAP, y: 116, w: RACE_X0 - NORTH_X - GAP, h: 132 });

// The Great Vault door: shut until the Prince falls, then stood ajar.
addPiece(VAULT.x, VAULT.y, 340, 300, (g) => vaultDoor(g, VAULT.x, VAULT.y, 100, 0), { kind: 'rect', x: VAULT.x - 160, y: VAULT.y - 60, w: 320, h: 56 }, { not: { prince: 'bullion' } });
addPiece(VAULT.x, VAULT.y, 340, 300, (g) => vaultDoor(g, VAULT.x, VAULT.y, 100, 0.55), undefined, { prince: 'bullion' });
for (const x of [1500, 1800]) {
  addPiece(x, 352, 30, 90, (g) => bankLamp(g, x, 352), { kind: 'circle', x, y: 348, r: 7 });
  lamps.push({ x, y: 352 });
}
addPiece(1500, 480, 50, 40, (g) => moneyBag(g, 1500, 480, 1.1), { kind: 'circle', x: 1500, y: 474, r: 12 });
addPiece(1784, 430, 60, 40, (g) => ingotPile(g, 1784, 430, 5, 0.8), { kind: 'rect', x: 1756, y: 418, w: 56, h: 14 });

// The Royal Mint and the presses before it (the presses are drawn live in `animate`).
addPiece(MINT.x, MINT.y, 700, 340, (g, rng) => mintHall(g, MINT.x, MINT.y, 640, 176, 5, rng), { kind: 'rect', x: MINT.x - 324, y: 116, w: 648, h: MINT.y - 116 });
for (const x of PRESSES) solids.push({ kind: 'rect', x: x - 34, y: PRESS_Y - 26, w: 68, h: 26 });
// The yard: crucibles, ingots, a hand-cart of blanks, coin stacks waiting for the tellers.
for (const x of [370, 910]) addPiece(x, 520, 50, 50, (g) => crucible(g, x, 520), { kind: 'rect', x: x - 18, y: 500, w: 36, h: 20 });
addPiece(430, 600, 100, 60, (g) => ingotPile(g, 430, 600, 6, 1), { kind: 'rect', x: 386, y: 584, w: 88, h: 18 });
addPiece(850, 608, 100, 60, (g) => { coinStack(g, 826, 608, 6, 9); coinStack(g, 852, 612, 9, 9); coinStack(g, 878, 606, 4, 9, 'silver'); }, { kind: 'rect', x: 812, y: 596, w: 80, h: 16 });
addPiece(560, 620, 90, 70, (g) => {
  // A hand-cart of fresh blanks.
  g.fillStyle(0x000000, 0.25); g.fillEllipse(560, 622, 90, 16);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(526, 590, 68, 24);
  g.fillStyle(TIMBER, 1); g.fillRect(528, 586, 64, 22);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(528, 586, 64, 3);
  for (let i = 0; i < 14; i++) coinFlat(g, 534 + (i % 7) * 9, 584 - Math.floor(i / 7) * 4, 4);
  for (const wx of [536, 584]) { g.fillStyle(TIMBER_DARK, 1); g.fillCircle(wx, 614, 9); g.fillStyle(BRASS, 1); g.fillCircle(wx, 614, 3); }
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(592, 596, 616, 580);
}, { kind: 'rect', x: 524, y: 598, w: 72, h: 18 });

// Prince Bullion's Exchequer.
addPiece(EXCHEQUER.x, EXCHEQUER.y, 460, 420, (g, rng) => exchequer(g, EXCHEQUER.x, EXCHEQUER.y, 340, 150, rng),
  { kind: 'rect', x: EXCHEQUER.x - 196, y: EXCHEQUER.y - 150, w: 392, h: 140 });
for (const x of [EXCHEQUER.x - 240, EXCHEQUER.x + 240]) {
  addPiece(x, 900, 30, 90, (g) => bankLamp(g, x, 900), { kind: 'circle', x, y: 896, r: 7 });
  lamps.push({ x, y: 900 });
}

// Counting-House Row.
const BANK_LOOKS: { wall: number; sign: 'coin' | 'scales' | 'bag' | 'key'; h: number }[] = [
  { wall: 0x3a5a4a, sign: 'scales', h: 210 }, { wall: 0x5a2a30, sign: 'coin', h: 236 }, { wall: 0x2c3448, sign: 'bag', h: 220 },
  { wall: 0x4a3a28, sign: 'key', h: 248 }, { wall: 0x2e4a3a, sign: 'coin', h: 214 },
];
BANKS.forEach((x, i) => {
  const o = BANK_LOOKS[i];
  addPiece(x, BANK_Y, 170, o.h + 70, (g, rng) => countingHouse(g, x, BANK_Y, 148, o.h, { wall: o.wall, sign: o.sign }, rng),
    { kind: 'rect', x: x - 78, y: BANK_Y - 120, w: 156, h: 120 });
});
for (const x of [315, 655, 995]) {
  addPiece(x, STREET_Y + 50, 30, 90, (g) => bankLamp(g, x, STREET_Y + 50), { kind: 'circle', x, y: STREET_Y + 46, r: 7 });
  lamps.push({ x, y: STREET_Y + 50 });
}
addPiece(485, STREET_Y + 52, 80, 40, (g) => bench(g, 485, STREET_Y + 52));
addPiece(825, STREET_Y + 52, 80, 40, (g) => bench(g, 825, STREET_Y + 52));
// The row's back fence: a black railing along the south wall.
addPiece(700, 1560, 1200, 40, (g) => {
  g.fillStyle(LACQUER, 1); g.fillRect(100, 1540, 1200, 4);
  for (let x = 104; x < 1300; x += 12) { g.fillRect(x, 1528, 2, 28); g.fillStyle(GOLD, 1); g.fillCircle(x + 1, 1527, 2); g.fillStyle(LACQUER, 1); }
});

// The Square of Tribute: the scales, the tithe clerks' desks, the queue ropes out east.
addPiece(SCALES_AT.x, SCALES_AT.y, 300, 300, (g) => tributeScales(g, SCALES_AT.x, SCALES_AT.y, 1, 0.05, 4, 2),
  { kind: 'rect', x: SCALES_AT.x - 46, y: SCALES_AT.y - 36, w: 92, h: 36 });
for (const x of [1060, 1340]) addPiece(x, 880, 90, 70, (g) => clerksDesk(g, x, 880), { kind: 'rect', x: x - 38, y: 860, w: 76, h: 20 });
addPiece(1520, 880, 380, 50, (g) => { queueRope(g, { x: 1360, y: 868 }, { x: 1680, y: 868 }, 6); queueRope(g, { x: 1360, y: 930 }, { x: 1680, y: 930 }, 6); },
  undefined, { not: { prince: 'bullion' } });
// Suit-topiary down the Clockwork road and round the square.
const TOPI: [number, number, Suit][] = [
  [1110, 230, 'spade'], [1290, 230, 'heart'], [1110, 380, 'diamond'], [1290, 380, 'club'], [1110, 530, 'heart'], [1290, 530, 'spade'],
  [960, 690, 'club'], [1440, 690, 'diamond'], [1000, 980, 'spade'], [1440, 910, 'heart'],
];
for (const [x, y, s] of TOPI) addPiece(x, y, 50, 70, (g) => suitTopiary(g, x, y, s, 1), { kind: 'circle', x, y: y - 6, r: 14 });
for (const [x, y] of [[1130, 640], [1270, 640], [1500, 730], [1800, 730], [700, 740], [880, 740]] as [number, number][]) {
  addPiece(x, y, 30, 90, (g) => bankLamp(g, x, y), { kind: 'circle', x, y: y - 4, r: 7 });
  lamps.push({ x, y });
}

// Ottilie Ledgerwhite's exchange stall on the west road.
addPiece(STALL.x, STALL.y, 160, 120, (g, rng) => exchangeStall(g, STALL.x, STALL.y, rng), { kind: 'rect', x: STALL.x - 64, y: STALL.y - 28, w: 128, h: 28 });

// The toll bridge: the booth, its turnstiles, its railings over the race.
addPiece(TOLLBOOTH.x, TOLLBOOTH.y, 110, 110, (g) => tollBooth(g, TOLLBOOTH.x, TOLLBOOTH.y), { kind: 'rect', x: TOLLBOOTH.x - 30, y: TOLLBOOTH.y - 24, w: 92, h: 24 });
addPiece(1990, 880, 40, 50, (g) => tollBox(g, 1990, 880, 1.1), { kind: 'circle', x: 1990, y: 876, r: 8 });
for (const y of [BRIDGE_Y0, BRIDGE_Y1 + 14]) {
  addPiece((RACE_X0 + RACE_X1) / 2, y, 140, 40, (g) => {
    g.fillStyle(BRASS_DARK, 1); g.fillRect(RACE_X0 - 14, y - 22, RACE_X1 - RACE_X0 + 28, 4);
    g.fillStyle(BRASS, 1); g.fillRect(RACE_X0 - 14, y - 23, RACE_X1 - RACE_X0 + 28, 2);
    for (let x = RACE_X0 - 12; x <= RACE_X1 + 12; x += 16) { g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 1.5, y - 22, 3, 22); g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, y - 24, 2.4); }
  });
}
// Brass-plated race walls up and down the channel (flat; the water is in the ground).
solids.push({ kind: 'rect', x: RACE_X0, y: 0, w: RACE_X1 - RACE_X0, h: BRIDGE_Y0 });
solids.push({ kind: 'rect', x: RACE_X0, y: BRIDGE_Y1, w: RACE_X1 - RACE_X0, h: TREASURY_H - BRIDGE_Y1 });

// The far bank: waystone, coin bollards, Dobbin's grain cart.
addPiece(2250, 700, 60, 80, (g) => treasuryWaystone(g, 2250, 700), { kind: 'circle', x: 2250, y: 694, r: 17 });
for (const [x, y] of [[2140, 700], [2140, 905], [2330, 700], [2330, 905]] as [number, number][]) addPiece(x, y, 30, 50, (g) => coinBollard(g, x, y), { kind: 'circle', x, y: y - 4, r: 9 });
addPiece(CART.x, CART.y, 150, 100, (g) => {
  g.fillStyle(0x000000, 0.28); g.fillEllipse(CART.x, CART.y + 2, 140, 22);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(CART.x - 56, CART.y - 46, 112, 30);
  g.fillStyle(TIMBER, 1); g.fillRect(CART.x - 54, CART.y - 50, 108, 28);
  for (let k = 0; k < 5; k++) { g.fillStyle(0xd8c48a, 1); g.fillEllipse(CART.x - 40 + k * 20, CART.y - 54, 22, 16); g.fillStyle(0xb8a46a, 1); g.fillRect(CART.x - 44 + k * 20, CART.y - 58, 8, 2); }
  for (const wx of [CART.x - 36, CART.x + 36]) { g.fillStyle(TIMBER_DARK, 1); g.fillCircle(wx, CART.y - 12, 14); g.fillStyle(TIMBER_LIT, 1); g.fillCircle(wx, CART.y - 12, 5); }
  g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(CART.x - 56, CART.y - 30, CART.x - 86, CART.y - 22);
}, { kind: 'rect', x: CART.x - 58, y: CART.y - 30, w: 116, h: 30 });

// The gilded pool's kerb keeps you to its rim; a culvert brings the race's spill in.
solids.push({ kind: 'rect', x: GILDED_POOL.x - 10, y: GILDED_POOL.y - 10, w: GILDED_POOL.w + 20, h: GILDED_POOL.h + 20 });
solids.push({ kind: 'rect', x: GILDED_POOL.x + GILDED_POOL.w + 10, y: 1330, w: RACE_X0 - GILDED_POOL.x - GILDED_POOL.w - 10, h: 26 });
addPiece(1420, 1240, 40, 70, (g) => bankLamp(g, 1420, 1240), { kind: 'circle', x: 1420, y: 1236, r: 7 });
lamps.push({ x: 1420, y: 1240 });
addPiece(1700, 1190, 80, 40, (g) => bench(g, 1700, 1190));

// The court's outer walls.
solids.push({ kind: 'rect', x: 0, y: 0, w: 34, h: TREASURY_H });
solids.push({ kind: 'rect', x: 0, y: TREASURY_H - 34, w: TREASURY_W, h: 34 });
solids.push({ kind: 'rect', x: TREASURY_W - 34, y: 0, w: 34, h: MAIN_Y - GAP });
solids.push({ kind: 'rect', x: TREASURY_W - 34, y: MAIN_Y + GAP, w: 34, h: TREASURY_H - MAIN_Y - GAP });

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 160): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

/** Coins sunk in the pool, fixed, glinting in `animate`. */
const SUNK: { x: number; y: number; s: number }[] = (() => {
  const rng = mulberry(0x7ea5);
  return Array.from({ length: 26 }, () => ({ x: GILDED_POOL.x + 20 + rng() * (GILDED_POOL.w - 40), y: GILDED_POOL.y + 16 + rng() * (GILDED_POOL.h - 32), s: rng() }));
})();

/** One press's die over time: struck every 2.4s, offset per press. */
function pressDrop(t: number, i: number): { drop: number; since: number } {
  const P = 2.4;
  const ph = ((t + i * 0.8) % P) / P;
  if (ph < 0.55) return { drop: 0, since: 9 };
  if (ph < 0.72) return { drop: ((ph - 0.55) / 0.17) ** 3, since: 9 };
  return { drop: Math.max(0, 1 - (ph - 0.72) / 0.12), since: (ph - 0.72) * P };
}

const painter: AreaPainter = {
  ground(g, rng) {
    const W = TREASURY_W, H = TREASURY_H;
    ledgerLawn(g, 0, 0, W, H, rng);
    // The walls seen from above.
    g.fillStyle(dim(MARBLE_DARK, 0.3), 1); g.fillRect(0, 0, 34, H); g.fillRect(W - 34, 0, 34, H); g.fillRect(0, H - 34, W, 34);
    g.fillStyle(MARBLE, 1); g.fillRect(4, 0, 26, H); g.fillRect(W - 30, 0, 26, H); g.fillRect(0, H - 30, W, 26);
    g.fillStyle(GOLD, 0.5); g.fillRect(28, 0, 2, H); g.fillRect(W - 30, 0, 2, H); g.fillRect(0, H - 30, W, 2);
    g.fillStyle(BAIZE_DARK, 1); g.fillRect(W - 34, MAIN_Y - GAP, 34, GAP * 2);

    // The mint race: grey-green spill water between brass-plated walls.
    g.fillStyle(BRASS_DARK, 1); g.fillRect(RACE_X0 - 6, 0, RACE_X1 - RACE_X0 + 12, H);
    g.fillStyle(RACE_DEEP, 1); g.fillRect(RACE_X0, 0, RACE_X1 - RACE_X0, H);
    g.fillStyle(RACE, 1); g.fillRect(RACE_X0 + 8, 0, RACE_X1 - RACE_X0 - 16, H);
    for (let i = 0; i < 90; i++) { g.fillStyle(rng() < 0.3 ? GOLD : RACE_LIT, 0.35); g.fillRect(RACE_X0 + 10 + rng() * 60, rng() * H, 2, 5); }
    // The culvert into the pool.
    g.fillStyle(BRASS_DARK, 1); g.fillRect(GILDED_POOL.x + GILDED_POOL.w, 1326, RACE_X0 - GILDED_POOL.x - GILDED_POOL.w, 34);
    g.fillStyle(RACE, 1); g.fillRect(GILDED_POOL.x + GILDED_POOL.w, 1332, RACE_X0 - GILDED_POOL.x - GILDED_POOL.w, 22);

    // The far bank forecourt.
    flagstones(g, { x: RACE_X1 + 6, y: 640, w: W - RACE_X1 - 40, h: 320 }, 36, MARBLE, MARBLE_DARK, rng);
    // Roads.
    chequerRoad(g, { x: RACE_X1 + 6, y: MAIN_Y }, { x: W - 34, y: MAIN_Y }, 110);
    // The bridge deck: brass-shod planks across the race.
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(RACE_X0 - 12, BRIDGE_Y0, RACE_X1 - RACE_X0 + 24, BRIDGE_Y1 - BRIDGE_Y0);
    for (let x = RACE_X0 - 10; x < RACE_X1 + 12; x += 12) { g.fillStyle(rng() < 0.5 ? TIMBER : TIMBER_LIT, 1); g.fillRect(x, BRIDGE_Y0 + 2, 10, BRIDGE_Y1 - BRIDGE_Y0 - 4); }
    g.fillStyle(BRASS, 1); g.fillRect(RACE_X0 - 12, BRIDGE_Y0, RACE_X1 - RACE_X0 + 24, 4); g.fillRect(RACE_X0 - 12, BRIDGE_Y1 - 4, RACE_X1 - RACE_X0 + 24, 4);
    chequerRoad(g, { x: SQUARE.x + SQUARE_R - 10, y: MAIN_Y }, { x: RACE_X0 - 12, y: MAIN_Y }, 110);
    chequerRoad(g, { x: EXCHEQUER.x + 120, y: MAIN_Y }, { x: SQUARE.x - SQUARE_R + 10, y: MAIN_Y }, 100);
    chequerRoad(g, { x: NORTH_X, y: 0 }, { x: NORTH_X, y: SQUARE.y - SQUARE_R * 0.7 + 10 }, 110);
    chequerRoad(g, { x: NORTH_X, y: SQUARE.y + SQUARE_R * 0.7 - 10 }, { x: NORTH_X, y: STREET_Y }, 90);
    chequerRoad(g, { x: 120, y: STREET_Y }, { x: 1440, y: STREET_Y }, 90);
    chequerRoad(g, { x: 1300, y: 1182 }, { x: 1960, y: 1182 }, 64);
    chequerRoad(g, { x: 980, y: 520 }, { x: NORTH_X - 55, y: 520 }, 80);
    chequerRoad(g, { x: NORTH_X + 55, y: 420 }, { x: VAULT.x - 110, y: 420 }, 80);
    chequerRoad(g, { x: STALL.x, y: MAIN_Y + 50 }, { x: STALL.x, y: STALL.y + 20 }, 60);
    // The mint yard, flagged in marble, stained with soot and gold-dust round the presses.
    flagstones(g, { x: 320, y: MINT.y, w: 640, h: 250 }, 40, MARBLE_DARK, dim(MARBLE_DARK, 0.3), rng);
    for (let i = 0; i < 50; i++) { g.fillStyle(0x3a3434, 0.15); g.fillCircle(330 + rng() * 620, MINT.y + rng() * 120, 8 + rng() * 18); }
    for (const x of PRESSES) { g.fillStyle(GOLD, 0.15); g.fillEllipse(x, PRESS_Y + 20, 120, 34); }
    // The vault forecourt: a half-round of marble with a gold inlaid arc.
    g.fillStyle(MARBLE_DARK, 1); g.fillEllipse(VAULT.x, VAULT.y + 60, 460, 260);
    g.fillStyle(MARBLE, 1); g.fillEllipse(VAULT.x, VAULT.y + 58, 444, 246);
    g.lineStyle(3, GOLD, 0.6); g.strokeEllipse(VAULT.x, VAULT.y + 60, 360, 190);
    for (let i = 0; i < 9; i++) { const a = Math.PI * 0.1 + (i / 8) * Math.PI * 0.8; g.fillStyle(GOLD, 0.6); g.fillCircle(VAULT.x + Math.cos(a) * 180, VAULT.y + 60 + Math.sin(a) * 95, 4); }
    // The Exchequer forecourt: gold-veined marble, steps down to the road.
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(EXCHEQUER.x - 230, EXCHEQUER.y - 30, 460, 110);
    flagstones(g, { x: EXCHEQUER.x - 226, y: EXCHEQUER.y - 26, w: 452, h: 102 }, 34, MARBLE_LIT, MARBLE_DARK, rng);
    for (let i = 0; i < 18; i++) { g.lineStyle(1, GOLD, 0.35); const x = EXCHEQUER.x - 220 + rng() * 440, y = EXCHEQUER.y - 20 + rng() * 90; g.lineBetween(x, y, x + 20 + rng() * 30, y + (rng() - 0.5) * 20); }
    // The Square of Tribute.
    rosettePlaza(g, SQUARE.x, SQUARE.y, SQUARE_R, 0.7);
    // The queue lane before the clerks: worn paving, a line of brass studs.
    g.fillStyle(MARBLE_DARK, 0.6); g.fillRect(1350, 872, 340, 56);
    for (let x = 1360; x < 1690; x += 24) { g.fillStyle(BRASS, 0.8); g.fillCircle(x, 900, 2.5); }
    // Counting-House Row's pavement.
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(130, BANK_Y - 4, 900, 50);
    g.fillStyle(MARBLE, 1); g.fillRect(130, BANK_Y - 2, 900, 44);
    // The gilded pool.
    const P = GILDED_POOL;
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(P.x - 14, P.y - 14, P.w + 28, P.h + 28);
    g.fillStyle(MARBLE_LIT, 1); g.fillRect(P.x - 10, P.y - 10, P.w + 20, 5);
    g.fillStyle(POOL_DEEP, 1); g.fillRect(P.x, P.y, P.w, P.h);
    g.fillStyle(POOL, 1); g.fillRect(P.x + 8, P.y + 8, P.w - 16, P.h - 16);
    for (const c of SUNK) coinFlat(g, c.x, c.y, 3 + c.s * 3, c.s < 0.2 ? 'silver' : 'gold');
    g.fillStyle(POOL_LIT, 0.25); g.fillRect(P.x + 8, P.y + 8, P.w - 16, 24);
    // Ledger lawns get a red margin rule beside the counting houses and the mint (the court's joke).
    g.lineStyle(2, 0xc8283a, 0.35); g.lineBetween(150, BANK_Y + 60, 150, 1520); g.lineBetween(320, 640, 960, 640);
  },

  pieces,

  animate(g, t, view, world) {
    // Pools of green lamplight.
    for (let i = 0; i < lamps.length; i++) { const l = lamps[i]; if (inView(l.x, l.y, view)) lampPool(g, l.x, l.y, t, i); }
    // The presses thumping in front of the mint, a man at each (the mint never stops — until it does).
    const stopped = world.test({ monarch: 'lucan' });
    PRESSES.forEach((x, i) => {
      if (!inView(x, PRESS_Y, view, 220)) return;
      const p = stopped ? { drop: 0, since: 9 } : pressDrop(t, i);
      coinPress(g, x, PRESS_Y, 0.58, p.drop, stopped ? 0 : t * 2 + i, p.since < 0.4 ? 1 - p.since / 0.4 : 0);
      if (p.since < 0.35) strikeSparks(g, x, PRESS_Y - 26, p.since / 0.35, i);
    });
    // The gilded pool: slow light over the coins, a ring where a fish rises.
    if (inView(GILDED_POOL.x + GILDED_POOL.w / 2, GILDED_POOL.y + GILDED_POOL.h / 2, view, 300)) {
      for (const c of SUNK) {
        const tw = (t * 0.3 + c.s * 7) % 1;
        if (tw < 0.08) { g.fillStyle(GOLD_PALE, 0.8 * (1 - tw / 0.08)); g.fillCircle(c.x - 1, c.y - 1, 2); }
      }
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.3 + i / 3) % 1;
        const cx = GILDED_POOL.x + 70 + ((i * 131) % (GILDED_POOL.w - 140)), cy = GILDED_POOL.y + 50 + ((i * 67) % (GILDED_POOL.h - 100));
        g.lineStyle(1.2, POOL_LIT, 0.6 * (1 - ph)); g.strokeEllipse(cx, cy, 8 + ph * 46, 3 + ph * 16);
      }
      const sx = GILDED_POOL.x + ((t * 40) % GILDED_POOL.w);
      g.fillStyle(0xffffff, 0.07); g.fillRect(sx, GILDED_POOL.y + 8, 26, GILDED_POOL.h - 16);
    }
    // The race running south.
    if (view.x + view.w > RACE_X0 - 100 && view.x < RACE_X1 + 100) {
      for (let i = 0; i < 24; i++) {
        const y = ((t * 70 + i * 67) % (TREASURY_H + 40)) - 20;
        if (y < view.y - 40 || y > view.y + view.h + 40 || (y > BRIDGE_Y0 - 4 && y < BRIDGE_Y1 + 4)) continue;
        g.lineStyle(1.5, RACE_LIT, 0.4); g.lineBetween(RACE_X0 + 14 + ((i * 23) % 50), y, RACE_X0 + 14 + ((i * 23) % 50), y + 14);
      }
    }
    // The tollbooth's turnstiles at the bridge head, turning as the carts go through.
    if (inView(1996, 800, view)) {
      turnstile(g, 1996, BRIDGE_Y0 + 20, t * 1.5, 1.1);
      turnstile(g, 1996, BRIDGE_Y1 - 4, -t * 1.3, 1.1);
    }
  },

  animateOver(g, t, view, world) {
    // Soot off the mint chimneys (clean air once the King falls).
    if (!world.test({ monarch: 'lucan' }) && inView(MINT.x, MINT.y - 260, view, 400)) {
      [0.12, 0.38, 0.62, 0.88].forEach((f, i) => sootPlume(g, MINT.x - 320 + 640 * f, MINT.y - 176 - 80, t, i * 0.27));
    }
    // The sovereign atop the Exchequer catching the light.
    if (inView(EXCHEQUER.x, EXCHEQUER.y - 330, view, 200)) {
      const ph = (t * 0.25) % 1;
      if (ph < 0.2) {
        const k = ph / 0.2;
        g.lineStyle(2, GOLD_PALE, 0.8 * Math.sin(k * Math.PI));
        const cx = EXCHEQUER.x + 6, cy = EXCHEQUER.y - 32 - 150 - 54 - 84 - 30;
        g.lineBetween(cx - 10, cy, cx + 10, cy); g.lineBetween(cx, cy - 10, cx, cy + 10);
      }
    }
    // A coin flipped from the waystone's slot every few seconds.
    if (inView(2250, 640, view)) {
      const ph = (t * 0.33) % 1;
      if (ph < 0.4) {
        const k = ph / 0.4;
        coin(g, 2250, 652 - Math.sin(k * Math.PI) * 70, 6, 'gold', Math.cos(t * 18), 'head');
      }
      glow(g, 2250, 648, 22, GOLD_LIT, 0.03 + Math.sin(t * 2) * 0.01, 2);
    }
    // Gilt glinting off the vault's wheel.
    if (inView(VAULT.x, VAULT.y - 100, view, 200)) {
      const a = t * 0.6;
      g.fillStyle(lit(BRASS, 0.5), 0.35 + Math.sin(t * 3) * 0.15); g.fillCircle(VAULT.x + Math.cos(a) * 28, VAULT.y - 100 + Math.sin(a) * 28, 3);
    }
    // Tithe coins flicking onto the scales' pan while the Tithe stands.
    if (!world.test({ prince: 'bullion' }) && inView(SCALES_AT.x, SCALES_AT.y - 120, view, 200)) {
      const ph = (t * 0.5) % 1;
      const x = 1340 + (SCALES_AT.x + 120 - 1340) * ph, y = 860 - Math.sin(ph * Math.PI) * 160 - ph * 40;
      coin(g, x, y, 4, 'gold', Math.cos(t * 20), 'head');
    }
  },
};

export const TREASURY_AREA: AreaDef = {
  id: 'treasury',
  isle: 'fate',
  court: 'treasury',
  name: 'The Treasury Court',
  subtitle: 'Every stake weighed, every coin struck, and the House never short',
  w: TREASURY_W,
  h: TREASURY_H,
  bg: BAIZE_DEEP,
  accent: TREASURY_COLOR,
  weather: 'goldleaf',
  spawn: { x: 2270, y: 800 },
  painter,
  solids,
  exits: [
    { side: 'e', to: 'tosswater', at: MAIN_Y, label: 'Over the toll bridge to Tosswater' },
    { side: 'n', to: 'clockwork', at: NORTH_X, label: 'Up the hill road to the Clockwork Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 2250, y: 740 } },
    { kind: 'prince', id: 'bullion', at: { x: EXCHEQUER.x, y: EXCHEQUER.y + 40 } },
    { kind: 'water', id: 'treasury-pool', shape: GILDED_POOL, fishery: 'treasury-pool' },
    { kind: 'encounter', id: 'treasury-coin-press' },
    { kind: 'encounter', id: 'treasury-interest' },
    { kind: 'encounter', id: 'treasury-gilded' },
    { kind: 'encounter', id: 'treasury-toll-bridge' },
    { kind: 'encounter', id: 'treasury-scales' },
    {
      kind: 'sign', at: { x: 2180, y: 900 },
      text: 'THE KING\'S BRIDGE. Toll payable at the west end, in coin, in token, or in kind. The House thanks you for your custom.',
    },
    {
      kind: 'sign', at: { x: 1480, y: 960 },
      text: 'THE WAGER-TITHE. Drawn households bring their stake to the Scales. Short weight is made up from the household, in kind.',
    },
    {
      kind: 'sign', at: { x: 1000, y: 470 },
      text: 'THE ROYAL MINT. Every coin on Lotterhaven is struck here, under the King\'s wheel. Stand clear of the presses.',
    },
    {
      kind: 'sign', at: { x: 1440, y: 470 },
      text: 'THE GREAT VAULT. Within: the Treasury of the House, and the Lot Register. No admittance by number.',
    },
    { kind: 'chest', id: 'treasury-chest-mint', at: { x: 940, y: 600 }, coins: 140 },
    { kind: 'chest', id: 'treasury-chest-row', at: { x: 120, y: 1320 }, orbs: 2 },
    { kind: 'chest', id: 'treasury-chest-exchequer', at: { x: EXCHEQUER.x + 236, y: EXCHEQUER.y + 20 }, coins: 220, open: { prince: 'bullion' } },
  ],
  npcs: TREASURY_NPCS,
  crowd: TREASURY_CROWD,
};
