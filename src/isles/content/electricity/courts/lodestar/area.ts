import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { glow, lit, mixC, type G } from '../../../../art/IsleArt';
import {
  anodeLab, arcGlow, arcLamp, auroraCurtain, auroraHue, boulderShadow, brownoutBell, cable, cableAt, compassPost, compassRose,
  compassStall, crankHouse, diggings, drawBoard, filingField, fishRack, floatingBoulder, horseshoe, ingot, ironCrag,
  jetty, lodestone, lodeWaystone, observatory, pylon, settPath, skywatch, slateGround, smithy, tarnBed, waystoneRing,
} from './art';
import {
  AURORA_GREEN, AURORA_TEAL, AURORA_VIOLET, COPPER, IRON_DARK, LODESTAR_COLOR, MAGNETITE_LIT, MOSS, NORTH,
  SLATE_DARK, SLATE_DEEP, SOUTH, SPARK, TARN_LIT, WINDOW,
} from './palette';
import { LODESTAR_CROWD, LODESTAR_NPCS } from './npcs';

/**
 * The Lodestar Court — the iron crag round the great lodestone, north-east on Voltreach.
 *
 * Read it from the Dynamo road in:
 * • **the Needle Road** (west): in past the waystone and the Draw sign, between the crank-houses
 *   of the Upper Row (north) and Ottilie Cobalt's compass stall — every needle on it pointing up
 *   the road, at the stone;
 * • **the Bellyard** (north of the road): the Brownout Bell's iron belfry and the Draw board,
 *   where Meter-Reader Hask chalks the quota; Smith Ferrite's iron-works behind them, its yard
 *   combed into field lines;
 * • **the Lodestone** (centre): the great stone in its ring of bollards, furred with lost iron,
 *   filings combed out from it across the whole crag, boulders from the sky-quarry hanging in the
 *   air around it; Prospector Magda's diggings at its south-west foot;
 * • **the Observatory Rise** (north-east): Dr. Anode's laboratory between its coil-poles, and up
 *   the rise the Polar Observatory, Prince Polar's hall, its telescope on the aurora;
 * • **the Aurora Tarn** (east): black water with the sky in it, Skywatcher Borea's platform on the
 *   north shore and Hollin Bray's fish racks on the west;
 * • **the Crossroads Rose** (south): the great compass rose on the Halflife road, Navigator
 *   Bearing's floor; the crank-houses of Underhill to its west, the sky-quarry to its east, where
 *   Odd Gaussen's crew float cut stone on the field and chain it down.
 *
 * The aurora never goes out up here, and the storm keeps off the crag — it prefers the stone.
 */

export const LODESTAR_W = 2400;
export const LODESTAR_H = 1600;

const ROAD_Y = 810;

/** The great lodestone: the middle of its foot. */
export const STONE: Pt = { x: 1300, y: 760 };
/** The ring road round the stone. */
const RING = { rx: 330, ry: 240 };
/** The Polar Observatory — the middle of its front step. */
export const OBSERVATORY: Pt = { x: 1990, y: 330 };
/** The aurora tarn — the court's fishing water. */
export const TARN: Rect = { x: 1700, y: 1010, w: 460, h: 230 };
/** The crossroads compass rose on the Halflife road. */
export const ROSE: Pt = { x: 1220, y: 1330 };
/** Ada Lodestrom's crank-house in Underhill (the door is a little west of centre). */
export const ADA_HOUSE: Pt = { x: 520, y: 1250 };
export const ADA_DOOR: Pt = { x: 506, y: 1282 };
/** The Brownout Bell, by the Draw board. */
export const BELL: Pt = { x: 1010, y: 600 };
/** Odd Gaussen's sky-quarry winch. */
export const QUARRY: Pt = { x: 1880, y: 1420 };

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

const inView = (x: number, y: number, v: Rect, pad = 160): boolean => x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

/** The bearing from a point to the lodestone (what every compass in the court reads). */
const toStone = (x: number, y: number): number => Math.atan2(STONE.y - 120 - y, STONE.x - x);

// ── Layout ───────────────────────────────────────────────────────────

// The great lodestone.
addPiece(STONE.x, STONE.y, 360, 300, (g, rng) => lodestone(g, STONE.x, STONE.y, 1, rng), { kind: 'circle', x: STONE.x, y: STONE.y - 14, r: 118 });

// The Polar Observatory.
addPiece(OBSERVATORY.x, OBSERVATORY.y, 480, 520, (g, rng) => observatory(g, OBSERVATORY.x, OBSERVATORY.y, rng),
  { kind: 'rect', x: OBSERVATORY.x - 160, y: OBSERVATORY.y - 40, w: 320, h: 30 });

// Dr. Anode's laboratory and its poles.
const LAB: Pt = { x: 1720, y: 560 };
addPiece(LAB.x, LAB.y, 300, 180, (g, rng) => anodeLab(g, LAB.x, LAB.y, rng), { kind: 'rect', x: LAB.x - 86, y: LAB.y - 30, w: 172, h: 30 });
solids.push({ kind: 'circle', x: LAB.x - 111, y: LAB.y - 4, r: 12 }, { kind: 'circle', x: LAB.x + 111, y: LAB.y - 4, r: 12 });

// Smith Ferrite's works.
const SMITHY: Pt = { x: 560, y: 470 };
addPiece(SMITHY.x, SMITHY.y, 280, 170, (g, rng) => smithy(g, SMITHY.x, SMITHY.y, rng), { kind: 'rect', x: SMITHY.x - 124, y: SMITHY.y - 36, w: 248, h: 36 });

// The Bellyard: the Brownout Bell and the Draw board.
addPiece(BELL.x, BELL.y, 120, 170, (g) => brownoutBell(g, BELL.x, BELL.y), { kind: 'rect', x: BELL.x - 32, y: BELL.y - 14, w: 64, h: 14 });
addPiece(1130, 590, 120, 110, (g, rng) => drawBoard(g, 1130, 590, rng), { kind: 'rect', x: 1080, y: 580, w: 100, h: 12 });

// Ottilie Cobalt's compass stall on the Needle Road.
const STALL: Pt = { x: 900, y: 708 };
addPiece(STALL.x, STALL.y, 160, 160, (g) => compassStall(g, STALL.x, STALL.y, toStone(STALL.x, STALL.y)), { kind: 'rect', x: STALL.x - 68, y: STALL.y - 34, w: 136, h: 34 });

// Prospector Magda's diggings at the stone's south-west foot.
const DIG: Pt = { x: 980, y: 1060 };
addPiece(DIG.x, DIG.y, 200, 90, (g, rng) => diggings(g, DIG.x, DIG.y, rng), { kind: 'rect', x: DIG.x - 4, y: DIG.y - 16, w: 70, h: 18 });

// Borea's platform on the tarn's north shore.
const SKY: Pt = { x: 2170, y: 950 };
addPiece(SKY.x, SKY.y, 240, 180, (g) => skywatch(g, SKY.x, SKY.y), { kind: 'rect', x: SKY.x - 98, y: SKY.y - 44, w: 196, h: 44 });

// Hollin's fish rack on the west shore.
addPiece(1660, 990, 80, 70, (g) => fishRack(g, 1660, 990), { kind: 'rect', x: 1626, y: 982, w: 68, h: 10 });

// The tarn is deep and very cold: its water is solid to walkers.
solids.push(
  { kind: 'circle', x: 1810, y: 1125, r: 100 },
  { kind: 'circle', x: 1930, y: 1125, r: 108 },
  { kind: 'circle', x: 2050, y: 1125, r: 100 },
);

// The waystone at the west gate.
const WAYSTONE: Pt = { x: 230, y: 700 };
addPiece(WAYSTONE.x, WAYSTONE.y, 60, 100, (g) => lodeWaystone(g, WAYSTONE.x, WAYSTONE.y), { kind: 'circle', x: WAYSTONE.x, y: WAYSTONE.y - 6, r: 18 });

// Crank-houses. The Upper Row along the Needle Road; Underhill south-west of the rose.
const HOUSES: { x: number; y: number; w: number; h: number; lit: boolean; marks: number; flip?: boolean }[] = [
  { x: 330, y: 690, w: 120, h: 72, lit: true, marks: 0 },
  { x: 500, y: 690, w: 128, h: 76, lit: false, marks: 1, flip: true },
  { x: 680, y: 694, w: 116, h: 70, lit: true, marks: 0 },
  { x: 380, y: 1000, w: 124, h: 74, lit: true, marks: 1 },
  { x: 570, y: 1004, w: 120, h: 70, lit: true, marks: 0, flip: true },
  { x: 290, y: 1200, w: 118, h: 70, lit: true, marks: 0 },
  { x: ADA_HOUSE.x, y: ADA_HOUSE.y, w: 128, h: 74, lit: false, marks: 2 },
  { x: 760, y: 1220, w: 116, h: 70, lit: true, marks: 1, flip: true },
  { x: 330, y: 1450, w: 124, h: 72, lit: false, marks: 1 },
  { x: 590, y: 1470, w: 120, h: 70, lit: true, marks: 0, flip: true },
  { x: 840, y: 1450, w: 118, h: 72, lit: true, marks: 0 },
];
for (const hs of HOUSES) {
  addPiece(hs.x, hs.y, hs.w + 40, hs.h * 2 + 40, (g, rng) => crankHouse(g, hs.x, hs.y, hs.w, hs.h, { lit: hs.lit, marks: hs.marks, flip: hs.flip }, rng),
    { kind: 'rect', x: hs.x - hs.w / 2 - 4, y: hs.y - 36, w: hs.w + 8, h: 36 });
}

// Grid pylons, and the cables between them (drawn over everything in `animateOver`).
const PYLON_CHAINS: Pt[][] = [
  [{ x: 120, y: 650 }, { x: 420, y: 590 }, { x: 790, y: 600 }, { x: 1080, y: 470 }, { x: 1380, y: 440 }, { x: 1600, y: 400 }, { x: 2260, y: 470 }],
  [{ x: 440, y: 1100 }, { x: 800, y: 1110 }, { x: 1060, y: 1180 }, { x: 1390, y: 1190 }, { x: 1640, y: 1300 }, { x: 2020, y: 1300 }, { x: 2300, y: 1250 }],
  [{ x: 2260, y: 470 }, { x: 2300, y: 760 }, { x: 2300, y: 1250 }],
];
const PYLON_H = 150;
const pylonTops: Pt[][] = PYLON_CHAINS.map((chain) => chain.map((p) => ({ x: p.x, y: p.y - PYLON_H + 22 })));
const seenPylon = new Set<string>();
for (const chain of PYLON_CHAINS) {
  for (const p of chain) {
    const key = `${p.x},${p.y}`;
    if (seenPylon.has(key)) continue;
    seenPylon.add(key);
    addPiece(p.x, p.y, 90, PYLON_H + 30, (g) => { pylon(g, p.x, p.y, PYLON_H); }, { kind: 'circle', x: p.x, y: p.y - 4, r: 16 });
  }
}

// Arc lamps along the roads.
const LAMPS: Pt[] = [
  { x: 300, y: 890 }, { x: 640, y: 890 }, { x: 960, y: 890 }, { x: 1680, y: 860 }, { x: 1110, y: 1490 }, { x: 1320, y: 1490 },
  { x: 1500, y: 600 }, { x: 1820, y: 470 },
];
for (const l of LAMPS) addPiece(l.x, l.y, 50, 90, (g) => arcLamp(g, l.x, l.y), { kind: 'circle', x: l.x, y: l.y - 3, r: 8 });

// Compass posts at the crossings, every needle on the stone.
for (const p of [{ x: 150, y: 900 }, { x: 1000, y: 900 }, { x: 1560, y: 680 }, { x: 1090, y: 1210 }, { x: 1360, y: 1210 }, { x: 1500, y: 1500 }]) {
  addPiece(p.x, p.y, 30, 50, (g) => compassPost(g, p.x, p.y, toStone(p.x, p.y)));
}

// Crag outcrops: the north rim, the east rim, and a few through the court.
const CRAGS: [number, number, number][] = [
  [80, 170, 1.4], [260, 130, 1.1], [420, 200, 1.2], [760, 160, 1.5], [950, 220, 1.0], [1150, 150, 1.6], [1400, 190, 1.2],
  [1600, 140, 1.4], [2300, 160, 1.5], [2340, 330, 1.1], [2350, 600, 1.2], [2360, 900, 1.3], [2350, 1420, 1.2],
  [80, 380, 1.3], [90, 1100, 1.2], [80, 1330, 1.4], [120, 1540, 1.1], [760, 1570, 1.0], [1560, 1570, 1.2], [2100, 1570, 1.3],
  [1500, 1110, 0.9], [1580, 1180, 0.7], [860, 400, 0.9],
];
for (const [x, y, s] of CRAGS) addPiece(x, y, 110 * s, 110 * s, (g, rng) => ironCrag(g, x, y, s, rng), { kind: 'circle', x, y: y - 12 * s, r: 30 * s });

// The sky-quarry: the winch frame and stacks of cut stone waiting to be floated.
addPiece(QUARRY.x, QUARRY.y, 200, 200, (g, rng) => {
  const x = QUARRY.x, y = QUARRY.y;
  g.lineStyle(6, IRON_DARK, 1); g.lineBetween(x - 50, y, x - 10, y - 150); g.lineBetween(x + 50, y, x + 10, y - 150);
  g.lineStyle(3, 0x5a5e68, 1); g.lineBetween(x - 48, y, x - 9, y - 150); g.lineBetween(x + 48, y, x + 9, y - 150);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 24, y - 156, 48, 10);
  g.lineStyle(2, 0x5a5e68, 1); g.strokeCircle(x, y - 70, 16);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.lineBetween(x, y - 70, x + Math.cos(a) * 16, y - 70 + Math.sin(a) * 16); }
  g.lineStyle(1.5, 0x8a8e98, 1); g.lineBetween(x, y - 150, x, y - 90);
  horseshoe(g, x, y - 140, 1.6, Math.PI);
  for (let i = 0; i < 4; i++) {
    const bx = x - 90 + i * 22, by = y - 4 - (i % 2) * 6;
    g.fillStyle(SLATE_DEEP, 1); g.fillRect(bx - 12, by - 22, 24, 22);
    g.fillStyle(mixC(0x3c4350, MAGNETITE_LIT, rng() * 0.4), 1); g.fillRect(bx - 11, by - 22, 22, 6);
  }
}, { kind: 'rect', x: QUARRY.x - 104, y: QUARRY.y - 30, w: 160, h: 30 });

/** Boulders hanging over the court: ground point, scale, lift. Drawn over actors (they are up in the air). */
export const BOULDERS: { x: number; y: number; s: number; lift: number }[] = [
  { x: 1040, y: 700, s: 1.0, lift: 150 }, { x: 1560, y: 760, s: 1.2, lift: 170 }, { x: 1470, y: 1010, s: 0.9, lift: 120 },
  { x: 1180, y: 470, s: 1.1, lift: 180 }, { x: 1740, y: 1430, s: 1.3, lift: 150 }, { x: 1990, y: 1460, s: 1.0, lift: 190 },
  { x: 2130, y: 1380, s: 1.4, lift: 140 }, { x: 2240, y: 1490, s: 0.9, lift: 120 },
  // Over Underhill: Gaussen's chains are all that hold these.
  { x: 430, y: 1340, s: 1.1, lift: 160 }, { x: 690, y: 1350, s: 1.0, lift: 150 }, { x: 460, y: 1550, s: 1.2, lift: 170 },
];

// ── Painter ──────────────────────────────────────────────────────────

const painter: AreaPainter = {
  ground(g, rng) {
    const W = LODESTAR_W, H = LODESTAR_H;
    slateGround(g, { x: 0, y: 0, w: W, h: H }, rng);
    // The crag's rim darker, north and east.
    g.fillStyle(SLATE_DEEP, 0.45); g.fillRect(0, 0, W, 240);
    g.fillStyle(SLATE_DEEP, 0.35); g.fillRect(W - 180, 0, 180, H);
    // Filings combed out from the stone across the whole crag.
    filingField(g, STONE.x, STONE.y - 30, 170, 720, rng, 72, 0.6);

    // The roads.
    settPath(g, [{ x: 0, y: ROAD_Y }, { x: 700, y: ROAD_Y }, { x: STONE.x - RING.rx, y: STONE.y + 40 }], 84, rng);
    const ring: Pt[] = [];
    for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2; ring.push({ x: STONE.x + Math.cos(a) * RING.rx, y: STONE.y + 40 + Math.sin(a) * RING.ry }); }
    settPath(g, ring, 70, rng);
    settPath(g, [{ x: STONE.x + 230, y: STONE.y - 140 }, { x: 1700, y: 650 }, { x: 1860, y: 470 }, { x: OBSERVATORY.x, y: OBSERVATORY.y + 30 }], 72, rng);
    settPath(g, [{ x: STONE.x - 40, y: STONE.y + 40 + RING.ry }, { x: ROSE.x, y: ROSE.y }, { x: 1200, y: H }], 84, rng);
    settPath(g, [{ x: STONE.x + RING.rx, y: STONE.y + 40 }, { x: 1600, y: 900 }, { x: 2100, y: 920 }], 62, rng);
    settPath(g, [{ x: ROSE.x, y: ROSE.y }, { x: 700, y: 1340 }, { x: 260, y: 1320 }], 60, rng);
    settPath(g, [{ x: ROSE.x, y: ROSE.y }, { x: 1600, y: 1400 }, { x: QUARRY.x, y: QUARRY.y + 20 }], 60, rng);
    settPath(g, [{ x: 640, y: ROAD_Y }, { x: SMITHY.x, y: SMITHY.y + 20 }], 50, rng);
    settPath(g, [{ x: 460, y: ROAD_Y }, { x: 470, y: 1004 }, { x: 470, y: 1180 }], 48, rng);

    // Smithy yard and Bellyard: flags of iron plate.
    for (let i = 0; i < 14; i++) {
      const px = 430 + (i % 7) * 40, py = 500 + Math.floor(i / 7) * 34;
      g.fillStyle(i % 2 ? 0x34363c : 0x2a2c32, 1); g.fillRect(px, py, 38, 32);
      g.fillStyle(0x8a4228, 0.2); g.fillCircle(px + 10 + rng() * 18, py + 10 + rng() * 12, 6);
    }
    filingField(g, SMITHY.x, SMITHY.y + 70, 14, 110, rng, 18, -1.2);

    // The crossroads rose.
    compassRose(g, ROSE.x, ROSE.y, 140, 0.62);
    // The tarn.
    tarnBed(g, TARN, rng);
    jetty(g, 1930, 1080, 70);
    // The sky-quarry floor: cut faces and spoil.
    for (let i = 0; i < 18; i++) {
      const x = 1650 + rng() * 620, y = 1360 + rng() * 200;
      g.fillStyle(SLATE_DEEP, 0.6); g.fillRect(x, y, 30 + rng() * 40, 14 + rng() * 10);
      g.fillStyle(MAGNETITE_LIT, 0.25); g.fillRect(x + 2, y, 20, 2);
    }
    // Spilled filings under the boulders, and their shadows.
    for (const b of BOULDERS) boulderShadow(g, b.x, b.y, b.s);
    // Moss on the north faces of things; frost in the shade.
    for (let i = 0; i < 60; i++) {
      const x = rng() * W, y = 240 + rng() * (H - 300);
      g.fillStyle(MOSS, 0.25); g.fillEllipse(x, y, 16 + rng() * 20, 5 + rng() * 4);
    }
    for (let i = 0; i < 40; i++) {
      const x = rng() * W, y = rng() * H;
      g.fillStyle(0xdde8f0, 0.08); g.fillEllipse(x, y, 30 + rng() * 40, 8 + rng() * 6);
    }
    // Lost iron along the road edges, all lying with its point on the stone.
    for (let i = 0; i < 70; i++) {
      const x = rng() * W, y = 300 + rng() * (H - 340);
      const a = toStone(x, y);
      g.lineStyle(1.4, 0x5a5e68, 0.7); g.lineBetween(x, y, x + Math.cos(a) * 7, y + Math.sin(a) * 7);
    }
    for (let i = 0; i < 6; i++) ingot(g, 1620 + rng() * 500, 1370 + rng() * 160, 0.8, i % 2 ? NORTH : SOUTH);
    // Chalked meter-marks at the Draw board's foot: the queue of the Brownout Bell.
    for (let i = 0; i < 9; i++) { g.lineStyle(2, 0xe8e8e0, 0.25); g.lineBetween(1060 + i * 12, 630, 1056 + i * 12, 646); }
    g.fillStyle(SLATE_DARK, 0.5); g.fillEllipse(BELL.x, BELL.y + 20, 120, 30);
  },

  pieces,

  animate(g, t, view) {
    const ms = t * 1000;
    // The aurora lying on the tarn, moving.
    if (inView(TARN.x + TARN.w / 2, TARN.y + TARN.h / 2, view, 320)) {
      const cx = TARN.x + TARN.w / 2, cy = TARN.y + TARN.h / 2;
      for (let i = 0; i < 6; i++) {
        const bx = TARN.x + 60 + i * 66 + Math.sin(t * 0.3 + i) * 14;
        const c = auroraHue(t, i * 0.15);
        const span = Math.sqrt(Math.max(0, 1 - ((bx - cx) / (TARN.w / 2)) ** 2)) * TARN.h * 0.42;
        g.fillStyle(c, 0.08 + Math.sin(t * 0.9 + i * 1.7) * 0.04); g.fillRect(bx - 16, cy - span, 32, span * 2);
        g.fillStyle(lit(c, 0.4), 0.12); g.fillRect(bx - 16, cy + span - 6, 32, 3);
      }
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.3 + i / 3) % 1;
        const rx = cx - 140 + i * 130, ry = cy + ((i * 37) % 60) - 30;
        g.lineStyle(1, TARN_LIT, 0.4 * (1 - ph)); g.strokeEllipse(rx, ry, 10 + ph * 50, 4 + ph * 16);
      }
      // A char turning far down, lit from inside.
      const fx = cx + Math.cos(t * 0.35) * 150, fy = cy + Math.sin(t * 0.35) * 50;
      g.fillStyle(AURORA_GREEN, 0.25); g.fillEllipse(fx, fy, 20, 7);
    }
    // The lodestone breathes: a slow blue pulse at its foot, filings shivering.
    if (inView(STONE.x, STONE.y - 100, view, 300)) {
      const k = 0.5 + Math.sin(t * 0.8) * 0.5;
      glow(g, STONE.x, STONE.y - 120, 170, SOUTH, 0.015 + k * 0.012, 3);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + t * 0.05;
        const r = 170 + ((t * 30 + i * 40) % 140);
        g.fillStyle(SPARK, 0.25 * (1 - (r - 170) / 140)); g.fillRect(STONE.x + Math.cos(a) * r * 1.2, STONE.y - 30 + Math.sin(a) * r * 0.6, 1.6, 1.6);
      }
    }
    // Arc lamps flickering.
    for (const [i, l] of LAMPS.entries()) if (inView(l.x, l.y, view)) arcGlow(g, l.x, l.y, t, i * 1.9);
    // Windows of the houses that made their Draw, and the Upper Row's crank going round.
    for (const [i, h] of HOUSES.entries()) {
      if (!h.lit || !inView(h.x, h.y, view)) continue;
      const f = 0.5 + Math.sin(t * 3 + i) * 0.5;
      glow(g, h.x, h.y - h.h * 0.6, 40, WINDOW, 0.01 + f * 0.01, 2);
      const cx = h.flip ? h.x - h.w / 2 + 10 : h.x + h.w / 2 - 10, cy = h.y - h.h * 0.45;
      const a = t * 4 + i;
      g.lineStyle(2, 0x6e5a46, 1); g.lineBetween(cx, cy, cx + Math.cos(a) * 10, cy + Math.sin(a) * 10);
    }
    // The waystone's floating ring.
    if (inView(WAYSTONE.x, WAYSTONE.y, view)) waystoneRing(g, WAYSTONE.x, WAYSTONE.y, t);
    // The smithy's coil hearth glowing.
    if (inView(SMITHY.x, SMITHY.y, view, 220)) glow(g, SMITHY.x - 68, SMITHY.y - 40, 60, 0xffa040, 0.03 + Math.sin(t * 5) * 0.01, 3);
    // The spark-gap between Anode's poles.
    if (inView(LAB.x, LAB.y - 150, view, 260)) {
      const on = Math.sin(t * 2.2) > 0.2;
      if (on) {
        let px = LAB.x - 111, py = LAB.y - 156;
        for (let i = 1; i <= 8; i++) {
          const nx = LAB.x - 111 + (222 * i) / 8, ny = LAB.y - 156 + (i < 8 ? Math.sin(ms / 40 + i * 2) * 12 : 0);
          g.lineStyle(2, SPARK, 0.85); g.lineBetween(px, py, nx, ny);
          px = nx; py = ny;
        }
        glow(g, LAB.x, LAB.y - 156, 50, 0xa8d8ff, 0.04, 3);
      }
    }
    // The observatory's telescope catching the sky.
    if (inView(OBSERVATORY.x, OBSERVATORY.y - 200, view, 360)) {
      glow(g, OBSERVATORY.x + 120, OBSERVATORY.y - 36 - 190 - 154 - 70, 26, auroraHue(t), 0.05, 3);
    }
  },

  animateOver(g, t, view) {
    const ms = t * 1000;
    // Copper overhead: cables sagging pylon to pylon, a spark running each one.
    for (const [ci, chain] of pylonTops.entries()) {
      for (let i = 1; i < chain.length; i++) {
        const a = chain[i - 1], b = chain[i];
        if (!inView((a.x + b.x) / 2, (a.y + b.y) / 2, view, Math.abs(b.x - a.x) / 2 + 200)) continue;
        const sag = 26 + Math.abs(b.x - a.x) * 0.05;
        for (const off of [-18, 18]) cable(g, { x: a.x + off, y: a.y }, { x: b.x + off, y: b.y }, sag, 0.9);
        const ph = ((t * 0.4) + i * 0.29 + ci * 0.5) % 1;
        const p = cableAt({ x: a.x - 18, y: a.y }, { x: b.x - 18, y: b.y }, sag, ph);
        g.fillStyle(SPARK, 0.9); g.fillCircle(p.x, p.y, 2);
        glow(g, p.x, p.y, 10, COPPER, 0.08, 2);
      }
    }
    // The hanging boulders, breathing on their chains.
    for (const [i, b] of BOULDERS.entries()) {
      if (!inView(b.x, b.y - b.lift, view, 120)) continue;
      floatingBoulder(g, b.x, b.y, b.s, b.lift, Math.sin(t * 0.9 + i * 1.3) * 5, i * 0.37);
    }
    // A curtain of aurora low over the tarn — it comes down nearest the ground here.
    if (inView(TARN.x + TARN.w / 2, TARN.y - 200, view, 400)) {
      const c = auroraHue(t);
      auroraCurtain(g, TARN.x + TARN.w / 2 + Math.sin(t * 0.1) * 60, TARN.y - 380, TARN.y - 120, 360, c, ms, 0.35);
      auroraCurtain(g, TARN.x + TARN.w / 2 - 120, TARN.y - 420, TARN.y - 200, 200, auroraHue(t, 0.3), ms + 3000, 0.25);
    }
    // Over the lodestone, faint field lines in the air, bending to it.
    if (inView(STONE.x, STONE.y - 200, view, 300)) {
      for (let i = 0; i < 6; i++) {
        const a = Math.PI + 0.3 + (i / 5) * (Math.PI - 0.6);
        const ph = (t * 0.2 + i * 0.17) % 1;
        const r = 360 - ph * 220;
        g.fillStyle(i % 2 ? AURORA_TEAL : AURORA_VIOLET, 0.3 * Math.sin(ph * Math.PI));
        g.fillCircle(STONE.x + Math.cos(a) * r, STONE.y - 120 + Math.sin(a) * r * 0.6, 1.8);
      }
    }
  },
};

export const LODESTAR_AREA: AreaDef = {
  id: 'lodestar',
  isle: 'electricity',
  court: 'lodestar',
  name: 'The Lodestar Court',
  subtitle: 'Every needle on the isle points here',
  w: LODESTAR_W,
  h: LODESTAR_H,
  bg: 0x0c0f14,
  accent: LODESTAR_COLOR,
  weather: 'aurora',
  gloom: 0.25,
  spawn: { x: 130, y: ROAD_Y },
  painter,
  solids,
  exits: [
    { side: 'w', to: 'dynamo', at: ROAD_Y, label: 'The Needle Road down to the Dynamo Court' },
    { side: 's', to: 'halflife', label: 'South off the crossroads rose, to the Halflife Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: WAYSTONE.x + 4, y: WAYSTONE.y + 40 } },
    { kind: 'prince', id: 'polar', at: { x: OBSERVATORY.x, y: OBSERVATORY.y + 46 } },
    { kind: 'water', id: 'lodestar-tarn', shape: TARN, fishery: 'lodestar-tarn' },
    { kind: 'encounter', id: 'lodestar-lodestone' },
    { kind: 'encounter', id: 'lodestar-polarity' },
    { kind: 'encounter', id: 'lodestar-filings' },
    { kind: 'encounter', id: 'lodestar-compass-rose' },
    { kind: 'encounter', id: 'lodestar-aurora' },
    {
      kind: 'sign', at: { x: 300, y: 920 },
      text: 'THE DRAW, LODESTAR. Every household cranks its quota. Meters are read at the Brownout Bell. Short is switched off.',
    },
    {
      kind: 'sign', at: { x: 1190, y: 650 },
      text: 'THE LODESTONE. Do not unhook the chain. Iron lost to the stone is the stone\'s. By order of Prince Polar.',
    },
    {
      kind: 'sign', at: { x: 1620, y: 1060 },
      text: 'THE AURORA TARN. Char caught here are the Observatory\'s, for the reading of the sky. Loach and pike, the fisher\'s.',
    },
    {
      kind: 'sign', at: { x: 1700, y: 1520 },
      text: 'THE SKY-QUARRY. Stone floated on the field. Keep from under the chains. Quarry Foreman Plumb has the keeping.',
    },
    { kind: 'chest', id: 'lodestar-chest-quarry', at: { x: 2270, y: 1530 }, coins: 110 },
    { kind: 'chest', id: 'lodestar-chest-observatory', at: { x: 2220, y: 400 }, orbs: 3, open: { prince: 'polar' } },
  ],
  npcs: LODESTAR_NPCS,
  crowd: LODESTAR_CROWD,
};

