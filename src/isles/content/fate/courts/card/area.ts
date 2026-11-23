import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { dim, glow, lit, pool, type G } from '../../../../art/IsleArt';
import {
  aceLily, baizeNap, boxHedge, card, cardHouse, cardHouseLife, cardTable, cardWaystone, chequerPave, chipStack,
  cookieShop, cuttingStone, dealingHall, die, drawBoard, fortuneTent, greenLamp, hallLampGlow, lampPool, millRiffle,
  pondKerb, printStall, shuffleMill, sleeveShop, suitInlay, suitTopiary, waystoneLife, type Weight,
} from './art';
import {
  BAIZE_DARK, BAIZE_DEEP, CARD_COLOR, CARD_RED, CHIP_BLUE, CHIP_RED, CHIP_WHITE, GILT, GILT_LIT, HEDGE, HEDGE_DARK,
  HEDGE_LIT, IVORY, LAMP_LIGHT, POND, POND_DEEP, POND_LIT, TAROT_NIGHT, TAROT_VIOLET,
} from './palette';
import { CARD_CROWD, CARD_NPCS } from './npcs';
import { SUITS, type Suit } from './util';

/**
 * The Card Court — the card-sharps' town, the first court up from Tosswater.
 *
 * Read it from the Tosswater road up:
 * • **the entrance** (south): the Red-and-Black comes up through the box hedge past the waystone,
 *   with *The Fortune Cookie* on the east side of the road and the smell of it all the way down;
 * • **Deuce Row** (south-west): the street of card-houses — great houses of cards three and four
 *   storeys high, roped to the baize and held down with paperweights the size of carts — and
 *   Corvina Sleeve's charm shop at its end;
 * • **the baize pond and the tents** (south-east): a pond cut through the felt, kerbed in cream
 *   stone, suit-topiary round it; behind it the fortune-tellers' tents, where tarot is read;
 * • **the Cutting Stone** at the crossing of the Red-and-Black and the Cross Street (Clockwork
 *   west, Remembrance east): a deck the size of a hay-cart on a plinth, where quarrels are cut for;
 * • **the Shuffling Mill and the Rail** (north-west): the mill where the House's decks are shuffled
 *   by the cartload, its treadwheel walked by the busted; card tables out on the lawn before it;
 * • **the Dealing Hall** (north-east): Prince Ante's hall under its great green-glass lamp shade,
 *   on a chequered forecourt lit by green lamps; the Draw board on the road beside it, and the road
 *   north through the hedge to the War Court.
 */

export const CARD_W = 2400;
export const CARD_H = 1700;

const ROAD_X = 1200;
const CROSS_Y = 850;
const ROAD_HW = 52;
const CROSS_HW = 48;

/** The Cutting Stone at the crossing, and the plaza round it. */
export const STONE_AT: Pt = { x: 1200, y: 850 };
const PLAZA_R = 190;
/** The baize pond — the court's fishing water. */
export const POND_RECT: Rect = { x: 1520, y: 1010, w: 440, h: 210 };
/** Prince Ante's Dealing Hall — the middle of its front step. */
export const HALL: Pt = { x: 1760, y: 420 };
const HALL_W = 560, HALL_H = 170;
/** The Shuffling Mill. */
export const MILL: Pt = { x: 480, y: 560 };
/** The outdoor card tables of the Rail, before the mill. */
export const TABLES: Pt[] = [{ x: 860, y: 420 }, { x: 1010, y: 560 }, { x: 760, y: 280 }, { x: 960, y: 290 }];
/** The Draw board on the road by the Dealing Hall. */
export const DRAW_BOARD: Pt = { x: 1340, y: 700 };

/** The card-houses of Deuce Row: x, base y, width, storeys, paperweight. */
const HOUSES: [number, number, number, number, Weight, number][] = [
  [250, 1210, 170, 3, 'dome', CARD_RED], [500, 1210, 170, 4, 'bar', CHIP_BLUE], [760, 1210, 160, 3, 'die', CARD_RED],
  [230, 1590, 160, 2, 'bar', CHIP_BLUE], [480, 1590, 160, 3, 'dome', CARD_RED], [740, 1590, 150, 2, 'die', CHIP_BLUE],
];
const TENTS: number[] = [1700, 1930, 2160];
const TENT_Y = 1480;
const SHOP: Pt = { x: 980, y: 1210 };
const BAKERY: Pt = { x: 1450, y: 1430 };
const STALL: Pt = { x: 980, y: 760 };

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Green lamps whose pools glow in `animate`. */
const lamps: Pt[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

const inView = (x: number, y: number, v: Rect, pad = 260) => x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

// ── Layout ───────────────────────────────────────────────────────────

// The Dealing Hall and its forecourt lamps.
addPiece(HALL.x, HALL.y, HALL_W + 60, 400, (g, rng) => dealingHall(g, HALL.x, HALL.y, HALL_W, HALL_H, rng),
  { kind: 'rect', x: HALL.x - HALL_W / 2 - 14, y: HALL.y - 44, w: HALL_W + 28, h: 34 });
for (const [x, y] of [[1500, 570], [2020, 570], [1620, 720], [1900, 720]] as [number, number][]) {
  lamps.push({ x, y });
  addPiece(x, y, 50, 100, (g) => greenLamp(g, x, y, 1.1), { kind: 'circle', x, y: y - 3, r: 7 });
}
// Chips stacked high beside the step: the night's takings, waiting to be carried in.
for (const [x, n, c] of [[1540, 7, CHIP_RED], [1566, 5, CHIP_BLUE], [1980, 9, CHIP_WHITE]] as [number, number, number][]) {
  addPiece(x, 470, 30, 60, (g) => chipStack(g, x, 470, n, 9, c), { kind: 'circle', x, y: 466, r: 10 });
}

// The Draw board on the road.
addPiece(DRAW_BOARD.x, DRAW_BOARD.y, 110, 130, (g, rng) => drawBoard(g, DRAW_BOARD.x, DRAW_BOARD.y, rng),
  { kind: 'rect', x: DRAW_BOARD.x - 40, y: DRAW_BOARD.y - 8, w: 80, h: 8 });

// The Shuffling Mill, its treadwheel and its crates.
addPiece(MILL.x, MILL.y, 520, 420, (g, rng) => shuffleMill(g, MILL.x, MILL.y, rng),
  { kind: 'rect', x: MILL.x - 132, y: MILL.y - 44, w: 264, h: 44 });
solids.push({ kind: 'rect', x: MILL.x - 226, y: MILL.y - 30, w: 112, h: 30 });
solids.push({ kind: 'rect', x: MILL.x + 150, y: MILL.y - 26, w: 80, h: 26 });

// The Rail: card tables on the lawn.
for (const t of TABLES) {
  addPiece(t.x, t.y, 130, 80, (g, rng) => cardTable(g, t.x, t.y, 1, rng), { kind: 'rect', x: t.x - 52, y: t.y - 30, w: 104, h: 30 });
}
lamps.push({ x: 880, y: 520 }, { x: 680, y: 400 });
for (const p of lamps.slice(-2)) addPiece(p.x, p.y, 50, 100, (g) => greenLamp(g, p.x, p.y), { kind: 'circle', x: p.x, y: p.y - 3, r: 7 });

// Ninian's print stall by the Cross Street.
addPiece(STALL.x, STALL.y, 170, 120, (g, rng) => printStall(g, STALL.x, STALL.y, rng), { kind: 'rect', x: STALL.x - 68, y: STALL.y - 34, w: 136, h: 34 });

// Deuce Row: the houses of cards.
HOUSES.forEach(([x, y, w, n, wt, back]) => {
  addPiece(x, y, w + 60, n * w * 0.38 + 80, (g, rng) => cardHouse(g, x, y, w, n, rng, wt, back),
    { kind: 'rect', x: x - w * 0.44, y: y - 28, w: w * 0.88, h: 28 });
});
// Corvina's shop at the end of the row.
addPiece(SHOP.x, SHOP.y, 200, 160, (g, rng) => sleeveShop(g, SHOP.x, SHOP.y, rng), { kind: 'rect', x: SHOP.x - 68, y: SHOP.y - 30, w: 136, h: 30 });
for (const [x, y] of [[640, 1300], [120, 1300], [900, 1330]] as [number, number][]) {
  lamps.push({ x, y: y - 40 });
  addPiece(x, y - 40, 50, 100, (g) => greenLamp(g, x, y - 40), { kind: 'circle', x, y: y - 43, r: 7 });
}

// The baize pond's suit-topiary, and topiary down the Red-and-Black.
const TOPIARY: [number, number, Suit][] = [
  [1490, 990, 'spade'], [1990, 990, 'heart'], [1490, 1250, 'club'], [1990, 1250, 'diamond'],
  [1110, 1100, 'heart'], [1290, 1100, 'spade'], [1110, 1340, 'diamond'], [1290, 1340, 'club'],
  [1110, 560, 'club'], [1290, 560, 'diamond'], [1110, 320, 'spade'], [1290, 320, 'heart'],
  [2330, 960, 'spade'], [2330, 740, 'heart'], [100, 960, 'diamond'], [100, 740, 'club'],
];
for (const [x, y, s] of TOPIARY) addPiece(x, y, 60, 90, (g) => suitTopiary(g, x, y, s, 1), { kind: 'circle', x, y: y - 6, r: 14 });
solids.push({ kind: 'rect', x: POND_RECT.x - 14, y: POND_RECT.y - 14, w: POND_RECT.w + 28, h: POND_RECT.h + 28 });

// The fortune-tellers' tents.
for (const x of TENTS) addPiece(x, TENT_Y, 200, 170, (g, rng) => fortuneTent(g, x, TENT_Y, 1.2, rng), { kind: 'rect', x: x - 64, y: TENT_Y - 26, w: 128, h: 26 });

// The Fortune Cookie by the road up from Tosswater.
addPiece(BAKERY.x, BAKERY.y, 200, 180, (g, rng) => cookieShop(g, BAKERY.x, BAKERY.y, rng), { kind: 'rect', x: BAKERY.x - 80, y: BAKERY.y - 30, w: 160, h: 30 });

// The Cutting Stone, and a giant die standing at each mouth of the plaza.
addPiece(STONE_AT.x, STONE_AT.y + 20, 160, 120, (g) => cuttingStone(g, STONE_AT.x, STONE_AT.y + 20), { kind: 'circle', x: STONE_AT.x, y: STONE_AT.y + 6, r: 54 });
for (const [x, y, f] of [[1048, 698, 6], [1352, 698, 1], [1048, 1002, 5], [1352, 1002, 3]] as [number, number, number][]) {
  addPiece(x, y, 50, 60, (g) => die(g, x, y - 16, 16, f, 0.25), { kind: 'circle', x, y: y - 8, r: 16 });
}
for (const [x, y] of [[1090, 1480], [1310, 1480], [1310, 200], [1090, 200]] as [number, number][]) {
  lamps.push({ x, y });
  addPiece(x, y, 50, 100, (g) => greenLamp(g, x, y), { kind: 'circle', x, y: y - 3, r: 7 });
}

// The waystone at the entrance.
const WAYSTONE: Pt = { x: 1070, y: 1600 };
addPiece(WAYSTONE.x, WAYSTONE.y, 60, 110, (g) => cardWaystone(g, WAYSTONE.x, WAYSTONE.y), { kind: 'circle', x: WAYSTONE.x, y: WAYSTONE.y - 6, r: 16 });

// ── The box hedge round the court (open at the four roads) ───────────

const GAP = 110;
for (const [x0, x1] of [[0, ROAD_X - GAP], [ROAD_X + GAP, CARD_W]] as [number, number][]) {
  addPiece((x0 + x1) / 2, 60, x1 - x0, 60, (g, rng) => boxHedge(g, x0, 60, x1 - x0, 40, rng), { kind: 'rect', x: x0, y: 0, w: x1 - x0, h: 56 });
  addPiece((x0 + x1) / 2, CARD_H, x1 - x0, 50, (g, rng) => boxHedge(g, x0, CARD_H, x1 - x0, 30, rng), { kind: 'rect', x: x0, y: CARD_H - 30, w: x1 - x0, h: 30 });
}
for (const x0 of [0, CARD_W - 30]) {
  for (const [y0, y1] of [[0, CROSS_Y - GAP], [CROSS_Y + GAP, CARD_H]] as [number, number][]) solids.push({ kind: 'rect', x: x0, y: y0, w: 30, h: y1 - y0 });
}

/** The ace lilies drifting on the pond. */
const LILIES: Pt[] = [{ x: 1590, y: 1060 }, { x: 1700, y: 1150 }, { x: 1820, y: 1070 }, { x: 1900, y: 1170 }, { x: 1640, y: 1180 }];

const painter: AreaPainter = {
  ground(g, rng) {
    const W = CARD_W, H = CARD_H;
    baizeNap(g, { x: 0, y: 0, w: W, h: H }, rng);

    // The hedge east and west, seen from above.
    for (const x0 of [0, W - 30]) {
      for (const [y0, y1] of [[0, CROSS_Y - GAP], [CROSS_Y + GAP, H]] as [number, number][]) {
        g.fillStyle(HEDGE_DARK, 1); g.fillRect(x0, y0, 30, y1 - y0);
        g.fillStyle(HEDGE, 1); g.fillRect(x0 + 3, y0, 24, y1 - y0);
        g.fillStyle(HEDGE_LIT, 0.6); g.fillRect(x0 + (x0 ? 3 : 23), y0, 4, y1 - y0);
      }
    }

    // Chalked table-lines on the lawns: the court is a table, and somebody keeps it marked out.
    g.lineStyle(2, IVORY, 0.12);
    g.strokeEllipse(STONE_AT.x, STONE_AT.y, 640, 480);
    g.strokeEllipse(STONE_AT.x, STONE_AT.y, 700, 530);
    for (let i = 0; i < 6; i++) { g.lineStyle(1.5, IVORY, 0.1); g.strokeRect(1300 + i * 130, 1310 + 60, 110, 70); }

    // The roads: red-and-black squares, gilt kerbs.
    chequerPave(g, { x: ROAD_X - ROAD_HW, y: 0, w: ROAD_HW * 2, h: CROSS_Y - PLAZA_R + 20 }, 26, rng);
    chequerPave(g, { x: ROAD_X - ROAD_HW, y: CROSS_Y + PLAZA_R - 20, w: ROAD_HW * 2, h: H - CROSS_Y - PLAZA_R + 20 }, 26, rng);
    chequerPave(g, { x: 0, y: CROSS_Y - CROSS_HW, w: ROAD_X - PLAZA_R + 20, h: CROSS_HW * 2 }, 24, rng);
    chequerPave(g, { x: ROAD_X + PLAZA_R - 20, y: CROSS_Y - CROSS_HW, w: W - ROAD_X - PLAZA_R + 20, h: CROSS_HW * 2 }, 24, rng);
    // Deuce Row, the pond walk, and the lane from the Cross Street down between the houses.
    chequerPave(g, { x: 110, y: 1268, w: ROAD_X - ROAD_HW - 110, h: 64 }, 32, rng);
    chequerPave(g, { x: ROAD_X + ROAD_HW, y: 1290, w: 1080, h: 56 }, 28, rng);
    chequerPave(g, { x: 600, y: CROSS_Y + CROSS_HW, w: 60, h: 1268 - CROSS_Y - CROSS_HW }, 30, rng);
    chequerPave(g, { x: 1700, y: CROSS_Y + CROSS_HW, w: 56, h: 1010 - 14 - CROSS_Y - CROSS_HW }, 28, rng);
    // The Dealing Hall's forecourt and its walk to the road.
    chequerPave(g, { x: HALL.x - HALL_W / 2, y: HALL.y - 10, w: HALL_W, h: 150 }, 35, rng);
    chequerPave(g, { x: ROAD_X + ROAD_HW, y: 520, w: HALL.x - HALL_W / 2 - ROAD_X - ROAD_HW, h: 60 }, 30, rng);
    suitInlay(g, HALL.x, HALL.y + 80, 14, 'diamond');
    for (const [dx, s] of [[-180, 'spade'], [180, 'club']] as [number, Suit][]) suitInlay(g, HALL.x + dx, HALL.y + 80, 10, s);
    // The plaza round the Cutting Stone: squares within the circle, a gilt ring, the four suits.
    const S = 30;
    for (let y = STONE_AT.y - PLAZA_R; y < STONE_AT.y + PLAZA_R; y += S) {
      for (let x = STONE_AT.x - PLAZA_R; x < STONE_AT.x + PLAZA_R; x += S) {
        const cx = x + S / 2, cy = y + S / 2;
        if (Math.hypot(cx - STONE_AT.x, (cy - STONE_AT.y) * 1.05) > PLAZA_R) continue;
        const red = (Math.round((x - STONE_AT.x) / S) + Math.round((y - STONE_AT.y) / S)) % 2 === 0;
        g.fillStyle(red ? 0xa2343a : 0x26242c, 1); g.fillRect(x + 1, y + 1, S - 2, S - 2);
      }
    }
    g.lineStyle(5, 0x86601a, 1); g.strokeCircle(STONE_AT.x, STONE_AT.y, PLAZA_R);
    g.lineStyle(2, GILT, 1); g.strokeCircle(STONE_AT.x, STONE_AT.y, PLAZA_R - 2);
    g.lineStyle(1.5, GILT, 0.6); g.strokeCircle(STONE_AT.x, STONE_AT.y, PLAZA_R - 40);
    SUITS.forEach((s, i) => {
      const a = -Math.PI / 2 + (i / 4) * Math.PI * 2 + Math.PI / 4;
      suitInlay(g, STONE_AT.x + Math.cos(a) * 140, STONE_AT.y + Math.sin(a) * 140, 13, s);
    });

    // The mill yard: trampled baize littered with spilled cards and the treadwheel's rut.
    g.fillStyle(BAIZE_DARK, 0.6); g.fillEllipse(MILL.x, MILL.y + 30, 640, 200);
    for (let i = 0; i < 140; i++) {
      const x = MILL.x - 300 + rng() * 600, y = MILL.y - 20 + rng() * 140;
      card(g, x, y, 7, 10, rng() * 6, { face: rng() < 0.4, suit: SUITS[i % 4], rank: 1, cheap: true, alpha: 0.85 });
    }
    g.lineStyle(10, dim(BAIZE_DARK, 0.3), 0.6); g.lineBetween(MILL.x - 230, MILL.y + 6, MILL.x - 110, MILL.y + 6);

    // The pond, cut through the felt.
    pool(g, POND_RECT, POND_DEEP, POND, POND_LIT, rng);
    // Coins and lost chips glinting on the bottom.
    for (let i = 0; i < 26; i++) {
      const x = POND_RECT.x + 30 + rng() * (POND_RECT.w - 60), y = POND_RECT.y + 30 + rng() * (POND_RECT.h - 60);
      g.fillStyle([CHIP_RED, CHIP_BLUE, GILT, CHIP_WHITE][i % 4], 0.35); g.fillEllipse(x, y, 7, 4);
    }
    pondKerb(g, POND_RECT);

    // Rugs before the tents, and a violet wash of lamp-light on the baize there.
    for (const x of TENTS) {
      g.fillStyle(TAROT_NIGHT, 0.6); g.fillRoundedRect(x - 40, TENT_Y + 4, 80, 34, 6);
      g.lineStyle(2, GILT, 0.6); g.strokeRoundedRect(x - 40, TENT_Y + 4, 80, 34, 6);
      g.fillStyle(TAROT_VIOLET, 0.12); g.fillEllipse(x, TENT_Y + 20, 220, 70);
    }

    // Card litter blown into the hedge-feet along Deuce Row.
    for (let i = 0; i < 60; i++) {
      const x = 120 + rng() * 1000, y = rng() < 0.5 ? 1250 + rng() * 14 : 1340 + rng() * 14;
      card(g, x, y, 8, 11, rng() * 6, { face: rng() < 0.5, suit: SUITS[i % 4], rank: 1, cheap: true, alpha: 0.7 });
    }
    // Brass Lots trodden into the road at the entrance — dropped by children running up from the quay.
    for (let i = 0; i < 6; i++) { g.fillStyle(0xb8903e, 0.7); g.fillCircle(ROAD_X - 40 + rng() * 80, 1560 + rng() * 120, 2.5); }
  },

  pieces,

  animate(g, t, view, world) {
    const freed = world.test({ prince: 'ante' });
    for (let i = 0; i < lamps.length; i++) {
      const p = lamps[i];
      if (inView(p.x, p.y, view)) lampPool(g, p.x, p.y, 1, t, i * 1.7);
    }
    if (inView(MILL.x, MILL.y - 180, view, 400)) millRiffle(g, MILL.x, MILL.y, freed ? t * 0.25 : t);
    if (inView(HALL.x, HALL.y - 200, view, 500)) hallLampGlow(g, HALL.x, HALL.y, HALL_W, HALL_H, t);
    HOUSES.forEach(([x, y, w, n], i) => { if (inView(x, y - 150, view, 300)) cardHouseLife(g, x, y, w, n, t, i * 0.31); });
    // The pond: rings, drifting ace lilies.
    if (inView(POND_RECT.x + POND_RECT.w / 2, POND_RECT.y + POND_RECT.h / 2, view, 320)) {
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.3 + i / 4) % 1;
        const cx = POND_RECT.x + 60 + ((i * 113) % (POND_RECT.w - 120)), cy = POND_RECT.y + 40 + ((i * 61) % (POND_RECT.h - 80));
        g.lineStyle(1.2, POND_LIT, 0.5 * (1 - ph)); g.strokeEllipse(cx, cy, 8 + ph * 44, 3 + ph * 16);
      }
      LILIES.forEach((p, i) => aceLily(g, p.x + Math.sin(t * 0.2 + i) * 10, p.y + Math.cos(t * 0.25 + i * 2) * 5, 11, i % 2 === 0));
      // An ace angler's lure: a little white card-fin bobbing under the surface.
      const lx = POND_RECT.x + POND_RECT.w / 2 + Math.cos(t * 0.35) * 150, ly = POND_RECT.y + POND_RECT.h / 2 + Math.sin(t * 0.5) * 60;
      g.fillStyle(IVORY, 0.45); g.fillRect(lx - 3, ly - 4, 6, 8);
      g.fillStyle(CARD_RED, 0.5); g.fillCircle(lx, ly, 1.4);
      glow(g, lx, ly, 10, LAMP_LIGHT, 0.04, 2);
    }
    if (inView(WAYSTONE.x, WAYSTONE.y, view)) waystoneLife(g, WAYSTONE.x, WAYSTONE.y, t);
    // Crystal balls in the tents, clouding and clearing.
    for (const x of TENTS) {
      if (!inView(x, TENT_Y, view)) continue;
      const k = 0.5 + Math.sin(t * 1.4 + x) * 0.5;
      g.fillStyle(lit(0x9a80ff, 0.3), 0.25 + k * 0.3); g.fillCircle(x, TENT_Y - 26, 6 + k * 2);
    }
    // The Cutting Stone: after the Prince falls, its top card lies face up — a heart.
    if (freed && inView(STONE_AT.x, STONE_AT.y, view)) {
      card(g, STONE_AT.x, STONE_AT.y - 64, 40, 26, 0, { face: true, suit: 'heart', rank: 1 });
      glow(g, STONE_AT.x, STONE_AT.y - 64, 30, CARD_RED, 0.04, 3);
    }
  },

  animateOver(g, t, view) {
    // Moths round the green lamps.
    for (let i = 0; i < lamps.length; i++) {
      const p = lamps[i];
      if (!inView(p.x, p.y, view, 80)) continue;
      for (let k = 0; k < 3; k++) {
        const a = t * (2.2 + k * 0.4) + i + k * 2;
        const mx = p.x + 14 + Math.cos(a) * (10 + k * 4), my = p.y - 72 + Math.sin(a * 1.3) * 7;
        g.fillStyle(0xe8e0c8, 0.7); g.fillEllipse(mx, my, 3 + Math.abs(Math.sin(t * 30 + k)) * 2, 2);
      }
    }
    // A loose card tumbling off the mill's hopper now and then.
    if (inView(MILL.x, MILL.y - 300, view, 300)) {
      const ph = (t * 0.2) % 1;
      card(g, MILL.x + 40 + ph * 200, MILL.y - 372 + ph * 320 + Math.sin(ph * 12) * 10, 10, 14, ph * 12, { face: ph > 0.5, suit: 'heart', rank: 1, cheap: true, alpha: 1 - ph * 0.5 });
    }
  },
};

export const CARD_AREA: AreaDef = {
  id: 'card',
  isle: 'fate',
  court: 'card',
  name: 'The Card Court',
  subtitle: 'Every quarrel cut for, every deck the House\'s',
  w: CARD_W,
  h: CARD_H,
  bg: BAIZE_DEEP,
  accent: CARD_COLOR,
  weather: 'cards',
  spawn: { x: 1200, y: 1610 },
  painter,
  solids,
  exits: [
    { side: 's', to: 'tosswater', label: 'Down the Red-and-Black to Tosswater' },
    { side: 'n', to: 'war', label: 'Through the hedge to the War Court' },
    { side: 'w', to: 'clockwork', at: CROSS_Y, label: 'The Cross Street to the Clockwork Court' },
    { side: 'e', to: 'remembrance', at: CROSS_Y, label: 'The Cross Street to the Remembrance Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: WAYSTONE.x, y: WAYSTONE.y + 24 } },
    { kind: 'prince', id: 'ante', at: { x: HALL.x, y: HALL.y + 50 } },
    { kind: 'water', id: 'card-pond', shape: POND_RECT, fishery: 'card-pond' },
    { kind: 'encounter', id: 'card-cut-the-deck' },
    { kind: 'encounter', id: 'card-house-of-cards' },
    { kind: 'encounter', id: 'card-tarot' },
    { kind: 'encounter', id: 'card-snap' },
    { kind: 'encounter', id: 'card-fifty-two-pickup' },
    {
      kind: 'sign', at: { x: 1300, y: 1560 },
      text: 'THE CARD COURT. All quarrels to be settled by the cut. All decks by order of the House. Cheating is the House\'s.',
    },
    {
      kind: 'sign', at: { x: DRAW_BOARD.x, y: DRAW_BOARD.y + 30 },
      text: 'THE DRAW. Numbers called this week, by order of the Croupier-King. The drawn report to the Dealing Hall by dusk.',
    },
    {
      kind: 'sign', at: { x: 640, y: 1360 },
      text: 'DEUCE ROW. Mind the paperweights. A house left without its weight belongs to the wind, and the wind is the House\'s.',
    },
    {
      kind: 'sign', at: { x: 1300, y: 130 },
      text: 'TO THE WAR COURT. Conscripts by the Red-and-Black. The House door is at the top of the hill.',
    },
    { kind: 'chest', id: 'card-chest-mill', at: { x: 180, y: 640 }, coins: 140 },
    { kind: 'chest', id: 'card-chest-hall', at: { x: 2120, y: 470 }, orbs: 2, open: { prince: 'ante' } },
  ],
  npcs: CARD_NPCS,
  crowd: CARD_CROWD,
};

