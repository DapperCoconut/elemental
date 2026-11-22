import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { dim, glow, groundFill, lamp, lit, mixC, type G } from '../../../../art/IsleArt';
import {
  bottleKiln, castingFloor, clayPit, clayStack, dryingRack, glazeVat, glostHouse, mouldBench, pot, pugMill, saggarStack,
  saggarWall, sgraffitoBench, shardRuck, sherd, sherdRoad, slipChannel, slipPond, strataCliff, terracottaSoldier,
  throwingHouse,
} from './art';
import {
  BISQUE, BISQUE_DARK, CELADON, CELADON_DARK, CELADON_LIT, COBALT, FIRE, FIRE_LIT, GLAZE, GOLD, MARL,
  MARL_DARK, MARL_DEEP, MARL_LIT, OXBLOOD, SAGGAR_DARK, SLIP, SLIP_DARK, SLIP_LIT, SOOT, SOOT_LIT, STRATA,
  STRATA_DARK, TERRA, TERRA_DARK, TIMBER, TIMBER_DARK, TIMBER_LIT, POTTER_COLOR,
} from './palette';
import { POTTER_CROWD, POTTER_NPCS } from './npcs';
import { inView } from './util';

/**
 * The Potter's Court — a pottery town in the lee of the mesa's west cliff.
 *
 * Read it from the Stonehold road in (east):
 * • **the Kiln Road** comes in through a gap in the saggar wall past the waystone and the tithe
 *   board, between the glaze house and its vats (north) and the drying terraces above them;
 * • **Wheel Square** at the middle: a rose of sherds laid in the paving round the Founders' Wheel,
 *   the court's first wheel-head, set flat in the ground with the Tithe Urn on it; Mabyn's
 *   throwing house (the court shop) on its north-east corner, the Muster House south-east;
 * • **the Glost House** (north): Prince Glaze's seat, the great glaze kiln with its gilded cuff,
 *   up the short avenue from the square, under the banded cliff;
 * • **Kiln Row** (north-west): four bottle kilns smoking in a line along the cliff foot, saggar
 *   stacks at their wickets and the placers' lane in front;
 * • **the clay pits** (west): the benches cut down through the marl, the idle pug mill, and the
 *   slip channel running south from the sump to **the slip pond** (south-west) — the fishery;
 * • **the casting shed** (south, by the pond road): Grogg's plaster moulds on the casting floor;
 * • **the Tithe Ranks** (south-east): the terracotta army, rank on rank on the muster ground,
 *   a soldier from every household every season, and the Shard Ruck where the ones that rang
 *   false were thrown;
 * • **the Dunesea road** leaves south from the square through the saggar wall.
 */

export const POTTER_W = 2400;
export const POTTER_H = 1600;

/** Wheel Square. */
export const SQUARE: Pt = { x: 1200, y: 820 };
const SQUARE_R = 190;
/** The Glost House's front step. */
export const GLOST: Pt = { x: 1200, y: 420 };
/** The four bottle kilns of Kiln Row (foot centres) and their foot half-width. */
export const KILNS: Pt[] = [{ x: 180, y: 470 }, { x: 380, y: 470 }, { x: 580, y: 470 }, { x: 780, y: 470 }];
const KILN_R = 52;
/** The clay pit and the slip pond (the court's fishing water). */
export const CLAY_PIT: Rect = { x: 70, y: 640, w: 330, h: 220 };
export const SLIP_POND: Rect = { x: 200, y: 1130, w: 460, h: 230 };
/** The casting floor in front of the shed. */
export const CASTING: Rect = { x: 840, y: 1180, w: 240, h: 120 };
/** The pug mill whose donkey was taken. */
export const PUG_MILL: Pt = { x: 500, y: 760 };
/** The Shard Ruck: where rejected soldiers are thrown. */
export const SHARD_RUCK: Pt = { x: 2270, y: 1000 };
/** The muster ground and its ranks. */
export const MUSTER: Rect = { x: 1460, y: 1060, w: 800, h: 470 };
export const ARMY_COLS = [1500, 1578, 1656, 1734, 1812, 1968, 2046, 2124, 2202];
export const ARMY_ROWS = [1110, 1202, 1294, 1386, 1478];
/** The drying-terrace racks: rows (base y) and centres. */
const RACK_ROWS = [300, 420, 540];
const RACK_XS = [1660, 1800, 2080, 2220];
const RACK_W = 110;
/** The glaze house and its vats. */
export const GLAZE_HOUSE: Pt = { x: 2120, y: 680 };
const VATS: [number, number][] = [[2040, 728], [2100, 728], [2160, 728]];
const VAT_COLORS = [CELADON, COBALT, OXBLOOD];

type Piece = NonNullable<AreaPainter['pieces']>[number];
const pieces: Piece[] = [];
const solids: Solid[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

// ── Edges ────────────────────────────────────────────────────────────

/** The south exit gap (to the Dunesea) and the east exit gap (to Stonehold). */
const S_GAP: [number, number] = [1080, 1320];
const E_GAP: [number, number] = [680, 920];

// North: the cliff, flat in the ground; west: its return.
solids.push({ kind: 'rect', x: 0, y: 0, w: POTTER_W, h: 150 });
solids.push({ kind: 'rect', x: 0, y: 0, w: 44, h: POTTER_H });
// South: a saggar wall either side of the Dunesea gap.
for (const [x0, x1] of [[44, S_GAP[0]], [S_GAP[1], POTTER_W]] as [number, number][]) {
  addPiece((x0 + x1) / 2, POTTER_H, x1 - x0, 50, (g, rng) => saggarWall(g, x0, POTTER_H - 2, x1 - x0, 3, rng),
    { kind: 'rect', x: x0, y: POTTER_H - 32, w: x1 - x0, h: 32 });
}
// East: stacks of saggars standing in a line, the Stonehold gap in the middle.
for (let y = 170; y < POTTER_H - 30; y += 40) {
  if (y > E_GAP[0] - 20 && y < E_GAP[1] + 20) continue;
  addPiece(2384, y, 30, 50, (g) => saggarStack(g, 2384, y, 3 + (Math.floor(y / 40) % 2), 11));
}
solids.push({ kind: 'rect', x: POTTER_W - 34, y: 0, w: 34, h: E_GAP[0] });
solids.push({ kind: 'rect', x: POTTER_W - 34, y: E_GAP[1], w: 34, h: POTTER_H - E_GAP[1] });
// Gate posts at the gaps: tall stacks with a glazed jar on top.
for (const [x, y] of [[S_GAP[0] - 14, POTTER_H - 6], [S_GAP[1] + 14, POTTER_H - 6], [2384, E_GAP[0] - 10], [2384, E_GAP[1] + 30]] as [number, number][]) {
  addPiece(x, y, 40, 90, (g) => { saggarStack(g, x, y, 6, 12); pot(g, x, y - 6 * 12 * 0.9, 18, 'urn', BISQUE, CELADON); },
    { kind: 'circle', x, y: y - 6, r: 14 });
}

// ── The Glost House ──────────────────────────────────────────────────

addPiece(GLOST.x, GLOST.y, 740, 440, (g, rng) => glostHouse(g, GLOST.x, GLOST.y, rng),
  { kind: 'rect', x: GLOST.x - 330, y: 300, w: 660, h: GLOST.y - 300 });
// Glazed urns flanking the avenue.
for (const k of [-1, 1]) {
  for (const y of [520, 600]) {
    const x = GLOST.x + k * 70;
    addPiece(x, y, 40, 60, (g) => pot(g, x, y, 28, 'urn', BISQUE, y === 520 ? CELADON : GLAZE), { kind: 'circle', x, y: y - 4, r: 11 });
  }
}

// ── Kiln Row ─────────────────────────────────────────────────────────

KILNS.forEach((k, i) => {
  addPiece(k.x, k.y, KILN_R * 2.4, KILN_R * 3.2, (g, rng) => bottleKiln(g, k.x, k.y, KILN_R, rng, i === 2 ? 0 : 1),
    { kind: 'circle', x: k.x, y: k.y - 24, r: KILN_R - 2 });
  // Saggar stacks at the wicket, waiting to be placed.
  const sx = k.x + (i % 2 ? -64 : 64);
  if (sx > 70) addPiece(sx, k.y + 24, 30, 70, (g) => saggarStack(g, sx, k.y + 24, 4 + (i % 2), 10), { kind: 'circle', x: sx, y: k.y + 20, r: 11 });
});
// Coal heaps at the row's end.
addPiece(90, 600, 70, 40, (g, rng) => {
  for (let i = 0; i < 40; i++) {
    const a = rng() * Math.PI, d = rng() * 30;
    g.fillStyle(rng() < 0.3 ? SOOT_LIT : SOOT, 1); g.fillCircle(90 + Math.cos(a) * d * (rng() < 0.5 ? -1 : 1), 600 - Math.sin(a) * d * 0.5, 3 + rng() * 3);
  }
}, { kind: 'circle', x: 90, y: 596, r: 22 });

// ── Clay pits, the pug mill, the slip ────────────────────────────────

solids.push({ kind: 'rect', x: CLAY_PIT.x + 40, y: CLAY_PIT.y + 40, w: CLAY_PIT.w - 80, h: CLAY_PIT.h - 70 });
addPiece(PUG_MILL.x, PUG_MILL.y, 160, 80, (g) => pugMill(g, PUG_MILL.x, PUG_MILL.y, false), { kind: 'circle', x: PUG_MILL.x, y: PUG_MILL.y - 6, r: 20 });
for (const [x, y] of [[440, 680], [610, 720]] as [number, number][]) {
  addPiece(x, y, 60, 40, (g, rng) => clayStack(g, x, y, rng), { kind: 'circle', x: x - 8, y: y - 6, r: 16 });
}
solids.push({ kind: 'rect', x: SLIP_POND.x - 10, y: SLIP_POND.y - 10, w: SLIP_POND.w + 20, h: SLIP_POND.h + 20 });

// ── Casting shed ─────────────────────────────────────────────────────

addPiece(960, 1150, 260, 110, (g, rng) => throwingHouse(g, 960, 1150, 240, rng, dim(SAGGAR_DARK, 0.1)),
  { kind: 'rect', x: 840, y: 1112, w: 240, h: 38 });
addPiece(900, 1350, 140, 50, (g, rng) => mouldBench(g, 900, 1350, 4, rng), { kind: 'rect', x: 830, y: 1330, w: 140, h: 20 });
addPiece(1060, 1350, 80, 50, (g, rng) => mouldBench(g, 1060, 1350, 2, rng), { kind: 'rect', x: 1023, y: 1330, w: 74, h: 20 });

// ── Wheel Square and its houses ──────────────────────────────────────

// The Tithe Urn on the Founders' Wheel.
addPiece(SQUARE.x, SQUARE.y + 4, 90, 140, (g) => {
  g.fillStyle(dim(STRATA[3], 0.2), 1); g.fillEllipse(SQUARE.x, SQUARE.y + 2, 62, 22);
  g.fillStyle(STRATA[2], 1); g.fillEllipse(SQUARE.x, SQUARE.y - 2, 62, 22);
  pot(g, SQUARE.x, SQUARE.y - 4, 78, 'urn', TERRA);
  // The Regent's cobalt tithe-mark painted on its belly.
  g.lineStyle(3, COBALT, 0.9); g.strokeCircle(SQUARE.x - 4, SQUARE.y - 50, 10);
  g.lineBetween(SQUARE.x - 12, SQUARE.y - 50, SQUARE.x + 4, SQUARE.y - 50);
}, { kind: 'circle', x: SQUARE.x, y: SQUARE.y - 2, r: 30 });
// Mabyn's throwing house — the court shop.
addPiece(1480, 640, 220, 110, (g, rng) => throwingHouse(g, 1480, 640, 200, rng, TERRA), { kind: 'rect', x: 1380, y: 602, w: 200, h: 38 });
// The Muster House, where the soldiers are counted.
addPiece(1450, 1010, 200, 120, (g, rng) => {
  throwingHouse(g, 1450, 1010, 180, rng, dim(COBALT, 0.25));
  // A tally board of ticks over the door.
  g.fillStyle(BISQUE, 1); g.fillRect(1420, 922, 60, 16);
  for (let i = 0; i < 14; i++) { g.lineStyle(1, COBALT, 1); g.lineBetween(1424 + i * 4, 925, 1424 + i * 4 + (i % 5 === 4 ? -14 : 0), 935); }
}, { kind: 'rect', x: 1360, y: 972, w: 180, h: 38 });
// A plain throwing house south-west of the square.
addPiece(930, 1000, 180, 110, (g, rng) => throwingHouse(g, 930, 1000, 160, rng, TERRA_DARK), { kind: 'rect', x: 850, y: 962, w: 160, h: 38 });
// Lamps round the square — pot lanterns on poles.
for (const a of [0.6, 2.2, 3.8, 5.4]) {
  const x = SQUARE.x + Math.cos(a) * (SQUARE_R + 26), y = SQUARE.y + Math.sin(a) * (SQUARE_R + 26) * 0.9;
  addPiece(x, y, 30, 70, (g) => lamp(g, x, y, FIRE_LIT, SOOT), { kind: 'circle', x, y: y - 2, r: 6 });
}

// ── Drying terraces, the glaze house ─────────────────────────────────

for (const y of RACK_ROWS) {
  for (const x of RACK_XS) {
    addPiece(x, y, RACK_W + 10, 90, (g, rng) => dryingRack(g, x, y, RACK_W, rng), { kind: 'rect', x: x - RACK_W / 2, y: y - 14, w: RACK_W, h: 16 });
  }
}
addPiece(1700, 625, 80, 50, (g) => sgraffitoBench(g, 1700, 625), { kind: 'rect', x: 1668, y: 610, w: 64, h: 16 });
addPiece(GLAZE_HOUSE.x, GLAZE_HOUSE.y, 240, 120, (g, rng) => {
  throwingHouse(g, GLAZE_HOUSE.x, GLAZE_HOUSE.y, 220, rng, CELADON_DARK);
  // Test tiles nailed up along the eaves: every glaze the house has ever mixed.
  const cols = [CELADON, COBALT, OXBLOOD, 0x9aa8e0, 0x8a2a8a, 0x3a2418, GOLD, CELADON_LIT, BISQUE];
  for (let i = 0; i < 18; i++) {
    g.fillStyle(cols[i % cols.length], 1); g.fillRect(GLAZE_HOUSE.x - 100 + i * 11, GLAZE_HOUSE.y - 92, 8, 8);
    g.fillStyle(0xffffff, 0.3); g.fillRect(GLAZE_HOUSE.x - 100 + i * 11, GLAZE_HOUSE.y - 92, 3, 2);
  }
}, { kind: 'rect', x: GLAZE_HOUSE.x - 110, y: GLAZE_HOUSE.y - 38, w: 220, h: 38 });
VATS.forEach(([x, y], i) => addPiece(x, y, 50, 50, (g) => glazeVat(g, x, y, VAT_COLORS[i]), { kind: 'circle', x, y: y - 8, r: 16 }));

// ── The Tithe Ranks ──────────────────────────────────────────────────

ARMY_ROWS.forEach((y, r) => ARMY_COLS.forEach((x, c) => {
  const v = (r * 7 + c * 3) % 11;
  // Three soldiers in the front rank already carry a hairline: they will be tapped again.
  const crack = r === 0 && (c === 2 || c === 6) ? 1 : 0;
  addPiece(x, y, 40, 70, (g) => terracottaSoldier(g, x, y, 1, v, crack), { kind: 'circle', x, y: y - 4, r: 12 });
}));
addPiece(SHARD_RUCK.x, SHARD_RUCK.y, 130, 80, (g, rng) => shardRuck(g, SHARD_RUCK.x, SHARD_RUCK.y, 0.7, rng), { kind: 'circle', x: SHARD_RUCK.x, y: SHARD_RUCK.y - 10, r: 44 });

// ── Painter ──────────────────────────────────────────────────────────

/** Slip ripples on the pond — fixed spots, animated. */
const POND_RINGS: Pt[] = [
  { x: 300, y: 1200 }, { x: 420, y: 1290 }, { x: 540, y: 1190 }, { x: 600, y: 1300 }, { x: 360, y: 1320 },
];
const CHANNEL: Pt[] = [{ x: 300, y: 830 }, { x: 330, y: 950 }, { x: 390, y: 1040 }, { x: 430, y: 1130 }];

const painter: AreaPainter = {
  ground(g, rng) {
    const W = POTTER_W, H = POTTER_H;
    groundFill(g, { x: 0, y: 0, w: W, h: H }, MARL, MARL_LIT, MARL_DEEP, rng, 1.3);
    // Trodden clay: darker where the barrows go, flecked with fallen sherds everywhere.
    for (let i = 0; i < 900; i++) {
      const x = rng() * W, y = 150 + rng() * (H - 150);
      sherd(g, x, y, 1.5 + rng() * 2.5, rng() < 0.7 ? TERRA : BISQUE, rng, 0.5);
    }

    // The north cliff and its west return.
    strataCliff(g, { x: 0, y: 0, w: W, h: 150 }, rng, [430, 1720, 2120]);
    for (let y = 0; y < H; y += 26) {
      g.fillStyle(STRATA[(y / 26) % STRATA.length | 0], 1); g.fillRect(0, y, 44, 26);
      g.fillStyle(STRATA_DARK, 0.4); g.fillRect(36, y, 8, 26);
      g.fillStyle(0xffffff, 0.08); g.fillRect(0, y, 44, 2);
    }

    // Ash and coal dust round Kiln Row; the placers' lane in front.
    for (const k of KILNS) {
      g.fillStyle(SOOT, 0.35); g.fillEllipse(k.x, k.y + 20, 190, 70);
      g.fillStyle(SOOT, 0.25); g.fillEllipse(k.x + 20, k.y + 50, 140, 40);
    }

    // The glost forecourt: celadon and bisque tiles.
    for (let y = GLOST.y; y < 560; y += 20) {
      for (let x = 960; x < 1440; x += 20) {
        const k = ((x - 960) / 20 + (y - GLOST.y) / 20) % 2;
        g.fillStyle(k ? CELADON : BISQUE, 0.95); g.fillRect(x, y, 20, 20);
        g.fillStyle(0x000000, 0.08); g.fillRect(x, y + 18, 20, 2);
      }
    }
    g.lineStyle(3, CELADON_DARK, 1); g.strokeRect(960, GLOST.y, 480, 560 - GLOST.y);

    // The drying terraces: three level benches stepping up to the cliff, each lit along its lip.
    for (let i = 0; i < 3; i++) {
      const y0 = 170 + i * 120, y1 = y0 + 120;
      g.fillStyle(mixC(MARL_LIT, BISQUE_DARK, 0.3 + i * 0.1), 1); g.fillRect(1590, y0, 730, y1 - y0);
      g.fillStyle(lit(BISQUE_DARK, 0.2), 0.8); g.fillRect(1590, y1 - 6, 730, 3);
      g.fillStyle(MARL_DARK, 0.6); g.fillRect(1590, y1 - 3, 730, 3);
    }

    // Roads: sherd-paved.
    sherdRoad(g, [{ x: W, y: 800 }, { x: 1900, y: 800 }, { x: SQUARE.x + SQUARE_R - 20, y: 812 }], 84, rng);
    sherdRoad(g, [{ x: SQUARE.x, y: SQUARE.y + SQUARE_R - 20 }, { x: SQUARE.x, y: H }], 84, rng);
    sherdRoad(g, [{ x: SQUARE.x, y: SQUARE.y - SQUARE_R + 20 }, { x: SQUARE.x, y: 560 }], 90, rng);
    sherdRoad(g, [{ x: SQUARE.x - 130, y: SQUARE.y - 130 }, { x: 800, y: 575 }, { x: 120, y: 570 }], 70, rng);
    sherdRoad(g, [{ x: SQUARE.x - SQUARE_R + 20, y: 830 }, { x: 640, y: 800 }, { x: 470, y: 770 }], 64, rng);
    sherdRoad(g, [{ x: 1940, y: 790 }, { x: 1940, y: 190 }], 60, rng);
    sherdRoad(g, [{ x: 640, y: 800 }, { x: 700, y: 1000 }, { x: 760, y: 1240 }], 54, rng);
    sherdRoad(g, [{ x: SQUARE.x + 120, y: SQUARE.y + 140 }, { x: 1890, y: 1060 }, { x: 1890, y: 1540 }], 60, rng);

    // The muster ground: square fired tiles, every one stamped with the cobalt tithe-mark.
    const M = MUSTER;
    g.fillStyle(TERRA_DARK, 1); g.fillRect(M.x - 6, M.y - 6, M.w + 12, M.h + 12);
    for (let y = M.y; y < M.y + M.h; y += 26) {
      for (let x = M.x; x < M.x + M.w; x += 26) {
        g.fillStyle(mixC(TERRA, BISQUE_DARK, rng() * 0.3), 1); g.fillRect(x + 1, y + 1, 24, 24);
        if (rng() < 0.12) { g.lineStyle(1, COBALT, 0.45); g.strokeCircle(x + 13, y + 13, 4); }
        if (rng() < 0.05) { g.lineStyle(1, dim(TERRA, 0.5), 0.8); g.lineBetween(x + 4, y + 3, x + 20, y + 22); }
      }
    }

    // Wheel Square: the Sherd Rose, laid in rings and petals round the Founders' Wheel.
    g.fillStyle(MARL_DARK, 1); g.fillCircle(SQUARE.x, SQUARE.y, SQUARE_R + 8);
    g.fillStyle(mixC(BISQUE_DARK, MARL, 0.3), 1); g.fillCircle(SQUARE.x, SQUARE.y, SQUARE_R);
    for (let ring = 0; ring < 7; ring++) {
      const rr = 80 + ring * 16;
      const n = Math.floor(rr * 0.9);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const petal = Math.floor(((a / (Math.PI * 2)) * 12 + ring * 0.5)) % 2;
        const c = petal ? (ring % 2 ? CELADON : CELADON_DARK) : ring % 3 === 0 ? TERRA : ring % 3 === 1 ? BISQUE : TERRA_DARK;
        sherd(g, SQUARE.x + Math.cos(a) * rr, SQUARE.y + Math.sin(a) * rr * 0.92, 4 + rng() * 2.5, c, rng);
      }
    }
    // The Founders' Wheel: a great stone wheel-head set flat, its throwing rings worn into it.
    g.fillStyle(dim(STRATA[3], 0.3), 1); g.fillCircle(SQUARE.x, SQUARE.y, 72);
    g.fillStyle(STRATA[2], 1); g.fillCircle(SQUARE.x, SQUARE.y, 68);
    for (let r = 16; r < 68; r += 9) { g.lineStyle(1.2, dim(STRATA[2], 0.25), 0.6); g.strokeCircle(SQUARE.x, SQUARE.y, r); }
    g.lineStyle(2, GOLD, 0.5); g.strokeCircle(SQUARE.x, SQUARE.y, 70);

    // The clay pit, the slip channel and the pond.
    clayPit(g, CLAY_PIT, rng);
    slipChannel(g, CHANNEL, 34, rng);
    // A plank bridge over the channel.
    for (const p of [{ x: 330, y: 950 }]) {
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(p.x - 34, p.y - 12, 68, 24);
      for (let k = 0; k < 7; k++) { g.fillStyle(k % 2 ? TIMBER : TIMBER_LIT, 1); g.fillRect(p.x - 32 + k * 9.5, p.y - 11, 8, 22); }
    }
    slipPond(g, SLIP_POND, rng);
    // The ware-board jetty on the east bank, and wet footprints coming off it.
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(SLIP_POND.x + SLIP_POND.w - 70, SLIP_POND.y + 96, 84, 26);
    for (let k = 0; k < 9; k++) { g.fillStyle(k % 2 ? TIMBER : TIMBER_LIT, 1); g.fillRect(SLIP_POND.x + SLIP_POND.w - 68 + k * 9, SLIP_POND.y + 98, 8, 22); }
    for (let k = 0; k < 8; k++) { g.fillStyle(SLIP_DARK, 0.6); g.fillEllipse(SLIP_POND.x + SLIP_POND.w + 26 + k * 12, SLIP_POND.y + 104 + (k % 2) * 10, 4, 7); }

    // The casting floor.
    castingFloor(g, CASTING, rng);

    // Slip spills and puddles about the town.
    for (const [x, y, rx] of [[760, 900, 30], [1500, 860, 24], [1080, 1100, 26], [2000, 900, 20], [640, 640, 22]] as [number, number, number][]) {
      g.fillStyle(SLIP_DARK, 0.7); g.fillEllipse(x, y, rx * 2.4, rx);
      g.fillStyle(SLIP, 0.8); g.fillEllipse(x - 2, y - 2, rx * 2, rx * 0.8);
      g.fillStyle(SLIP_LIT, 0.35); g.fillEllipse(x - rx * 0.4, y - rx * 0.2, rx * 0.6, rx * 0.2);
    }
  },

  pieces,

  animate(g, t, view) {
    // Firemouths flickering round each lit kiln's foot, and the great glost kiln's.
    KILNS.forEach((k, i) => {
      if (i === 2 || !inView(k.x, k.y, view)) return;
      for (const d of [-0.72, -0.24, 0.24, 0.72]) {
        const f = 0.5 + Math.sin(t * 9 + d * 7 + i) * 0.25 + Math.sin(t * 23 + i * 3) * 0.15;
        glow(g, k.x + d * KILN_R, k.y + 4, 16, FIRE, 0.05 * f, 3);
      }
    });
    if (inView(GLOST.x, GLOST.y, view, 300)) {
      for (const d of [-0.72, -0.24, 0.24, 0.72]) {
        const f = 0.6 + Math.sin(t * 7 + d * 5) * 0.3;
        glow(g, GLOST.x + d * 120, GLOST.y - 66, 24, FIRE, 0.05 * f, 3);
      }
    }
    // The slip pond: slow, thick rings and a gloop rising and popping.
    if (inView(SLIP_POND.x + SLIP_POND.w / 2, SLIP_POND.y + SLIP_POND.h / 2, view, 300)) {
      POND_RINGS.forEach((p, i) => {
        const ph = (t * 0.18 + i / POND_RINGS.length) % 1;
        g.lineStyle(1.4, SLIP_LIT, 0.4 * (1 - ph)); g.strokeEllipse(p.x, p.y, 10 + ph * 50, 4 + ph * 16);
        const gp = (t * 0.4 + i * 0.37) % 1;
        if (gp < 0.3) {
          const k = gp / 0.3;
          g.fillStyle(SLIP_DARK, 0.8); g.fillEllipse(p.x + 20, p.y - 6, 4 + k * 8, 2 + k * 5);
          g.fillStyle(SLIP_LIT, 0.6 * (1 - k)); g.fillEllipse(p.x + 18, p.y - 8, 2 + k * 3, 1 + k * 1.5);
        }
      });
      // A loach's back breaking the surface.
      const lx = SLIP_POND.x + SLIP_POND.w / 2 + Math.cos(t * 0.3) * 150, ly = SLIP_POND.y + SLIP_POND.h / 2 + Math.sin(t * 0.6) * 50;
      if (Math.sin(t * 0.9) > 0.6) { g.fillStyle(dim(SLIP, 0.35), 0.8); g.fillEllipse(lx, ly, 20, 5); }
    }
    // The slip channel creeping along.
    if (inView(360, 980, view, 200)) {
      for (let i = 0; i < CHANNEL.length - 1; i++) {
        const a = CHANNEL[i], b = CHANNEL[i + 1];
        for (let k = 0; k < 3; k++) {
          const ph = (t * 0.15 + k / 3 + i * 0.2) % 1;
          const x = a.x + (b.x - a.x) * ph, y = a.y + (b.y - a.y) * ph;
          g.lineStyle(1.4, SLIP_LIT, 0.5 * Math.sin(ph * Math.PI)); g.lineBetween(x - 6, y - 4, x + 6, y + 4);
        }
      }
    }
    // Glaze vats: a sheen sliding across each surface.
    VATS.forEach(([x, y], i) => {
      if (!inView(x, y, view)) return;
      const ph = (t * 0.3 + i * 0.33) % 1;
      g.fillStyle(0xffffff, 0.25 * Math.sin(ph * Math.PI)); g.fillEllipse(x - 12 + ph * 24, y - 26, 6, 2);
    });
    // The Founders' Wheel: a shaft of light turning slowly round its rings, as if it still spun.
    if (inView(SQUARE.x, SQUARE.y, view, 200)) {
      const a = t * 0.25;
      g.lineStyle(3, GOLD, 0.18); g.beginPath(); g.arc(SQUARE.x, SQUARE.y, 52, a, a + 0.8, false); g.strokePath();
      g.lineStyle(2, GOLD, 0.12); g.beginPath(); g.arc(SQUARE.x, SQUARE.y, 34, -a * 1.3, -a * 1.3 + 0.6, false); g.strokePath();
    }
  },

  animateOver(g, t, view) {
    // Smoke rolling off every kiln neck, leaning east on the cliff draught.
    const tops: [number, number, number][] = KILNS.filter((_, i) => i !== 2).map((k) => [k.x, k.y - KILN_R * 2.9, 1]);
    tops.push([GLOST.x, 60, 1.8]);
    for (const [x, y, s] of tops) {
      if (!inView(x, y + 120, view, 260)) continue;
      for (let i = 0; i < 7; i++) {
        const ph = (t * 0.12 + i / 7 + x * 0.001) % 1;
        const px = x + ph * 90 * s + Math.sin(t * 0.8 + i * 1.7) * 8 * s, py = y - ph * 120 * s;
        g.fillStyle(mixC(SOOT, 0x8a7a70, ph), 0.32 * (1 - ph)); g.fillCircle(px, py, (10 + ph * 26) * s);
      }
      // Heat shimmer over the neck.
      g.fillStyle(FIRE_LIT, 0.04 + Math.sin(t * 6 + x) * 0.02); g.fillEllipse(x, y + 4, 26 * s, 10 * s);
    }
    // Clay dust hanging over the pit.
    if (inView(CLAY_PIT.x + 160, CLAY_PIT.y + 100, view, 200)) {
      for (let i = 0; i < 12; i++) {
        const ph = (t * 0.07 + i / 12) % 1;
        const x = CLAY_PIT.x + 30 + ((i * 97) % (CLAY_PIT.w - 60)) + Math.sin(t + i) * 10, y = CLAY_PIT.y + 160 - ph * 140;
        g.fillStyle(MARL_LIT, 0.35 * Math.sin(ph * Math.PI)); g.fillCircle(x, y, 2);
      }
    }
    // Sparks out of the open firemouths of Kiln Row.
    KILNS.forEach((k, i) => {
      if (i === 2 || !inView(k.x, k.y, view)) return;
      for (let j = 0; j < 4; j++) {
        const ph = (t * 0.6 + j / 4 + i * 0.21) % 1;
        const x = k.x + (j - 1.5) * 26 + Math.sin(t * 3 + j) * 6, y = k.y - 10 - ph * 40;
        g.fillStyle(FIRE_LIT, 0.8 * (1 - ph)); g.fillCircle(x, y, 1.3);
      }
    });
  },
};

export const POTTER_AREA: AreaDef = {
  id: 'potter',
  isle: 'earth',
  court: 'potter',
  name: 'The Potter\'s Court',
  subtitle: 'A soldier from every household, fired whole, ringing true',
  w: POTTER_W,
  h: POTTER_H,
  bg: MARL_DEEP,
  accent: POTTER_COLOR,
  weather: 'smoke',
  spawn: { x: 2250, y: 800 },
  painter,
  solids,
  exits: [
    { side: 'e', to: 'stonehold', label: 'The Kiln Road to Stonehold' },
    { side: 's', to: 'dunesea', label: 'South through the saggar wall to the Dunesea' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 2230, y: 880 } },
    { kind: 'prince', id: 'glaze', at: { x: GLOST.x, y: GLOST.y + 40 } },
    { kind: 'water', id: 'potter-slip', shape: SLIP_POND, fishery: 'potter-slip' },
    { kind: 'encounter', id: 'potter-wheel' },
    { kind: 'encounter', id: 'potter-kiln' },
    { kind: 'encounter', id: 'potter-army' },
    { kind: 'encounter', id: 'potter-slip-cast' },
    { kind: 'encounter', id: 'potter-glaze-run' },
    {
      kind: 'sign', at: { x: 2100, y: 870 },
      text: 'THE POTTER\'S TITHE. One soldier a household a season, fired whole, to the Regent\'s weight. A soldier that rings false is short.',
    },
    {
      kind: 'sign', at: { x: 1420, y: 1120 },
      text: 'THE TITHE RANKS. Every soldier is tapped at muster. Touching the ranks is a theft of the Tithe. Cracks are reported.',
    },
    {
      kind: 'sign', at: { x: 660, y: 580 },
      text: 'KILN ROW. Firing days by order of the Glost House. A household whose soldier dunts in the kiln answers for the kiln.',
    },
    {
      kind: 'sign', at: { x: 740, y: 1140 },
      text: 'THE SLIP POND. Slip is drawn by licence of the Slip-Reeve. Fish are slip. Slip is the Prince\'s.',
    },
    { kind: 'chest', id: 'potter-chest-ruck', at: { x: 2310, y: 1080 }, coins: 90 },
    { kind: 'chest', id: 'potter-chest-glost', at: { x: 1460, y: 470 }, orbs: 2, open: { prince: 'glaze' } },
  ],
  npcs: POTTER_NPCS,
  crowd: POTTER_CROWD,
};

