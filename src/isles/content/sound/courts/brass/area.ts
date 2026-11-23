import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { dim, flagstones, glow, groundFill, pool, road, type G } from '../../../../art/IsleArt';
import {
  bandhall, bandHouse, bandsman, bandstand, brassLamp, brassWaystone, bronzeBandsman, bunBakery, bunting,
  floatingStage, heraldTower, hornBell, hornFoundry, lyre, note, snowTerraces, tuningFork,
} from './art';
import {
  BRASS, BRASS_COLOR, BRASS_DARK, BRASS_LIT, CREAM, FURNACE, GRAVEL, GRAVEL_DARK, LAKE, LAKE_DEEP, LAKE_LIT,
  LAWN, LAWN_DARK, LAWN_LIT, NAVY, NAVY_DARK, PITCH_HIGH, PITCH_LOW, PITCH_MID, SCARLET, SCARLET_LIT, STONE,
  STONE_DARK, STONE_LIT, WOOD_DARK,
} from './palette';
import { BRASS_CROWD, BRASS_NPCS } from './npcs';
import { alongLoop, inView } from './util';

/**
 * The Brass Court — the bandsmen's town on a sunny green terrace, the first court up from
 * Carillon Quay.
 *
 * Read it from the quay road up:
 * • **the Parade** runs straight up the middle from the Carillon road (south) to the Fanfare
 *   Gate (north), lined with bandsmen's terraces and bronze bandsmen on plinths;
 * • **the Great Bandstand** stands where the Parade crosses the Promenade (Cavern Court west,
 *   the Masquerade east), ringed by its own carriage drive — the Score is played from here
 *   before it goes up to every terrace;
 * • **the Horn-Foundry** (south-west) with its three bell-mouthed chimneys, its cobbled test
 *   yard where the big horns are tried, and the cottages of the foundrymen behind;
 * • **the Bandlake** (south-east) with its floating stage, and *The Oompah Bun* on its shore;
 * • **the drill square** (north-west) where the bands march in step, the drill halls behind it;
 * • **the Bandhall** (north-east), Prince Fanfare's hall of trumpet-capitalled columns, with the
 *   tuning yard beside it where every child's reed is tuned against the forks;
 * • **the Fanfare Gate** (north): two herald trumpets as tall as towers, the road to the
 *   cathedral between them, the snowy upper terraces behind.
 */

export const BRASS_W = 2400;
export const BRASS_H = 1700;

const PARADE_X = 1200;
const PROM_Y = 850;

/** The Great Bandstand at the crossing. */
export const GREAT_STAND: Pt = { x: 1200, y: 850 };
const STAND_R = 110;
const RING_R = 210;
/** The small bandstand on the east lawn, where old Wheezy sits. */
export const EAST_STAND: Pt = { x: 2250, y: 1015 };
/** The Bandlake — the court's fishing water. */
export const BANDLAKE: Rect = { x: 1520, y: 1100, w: 680, h: 320 };
const STAGE: Pt = { x: 1860, y: 1300 };
/** The Bandhall's front step. */
export const BANDHALL: Pt = { x: 1860, y: 440 };
/** The Horn-Foundry's front wall base. */
export const FOUNDRY: Pt = { x: 540, y: 1170 };
/** The drill square. */
export const DRILL: Rect = { x: 240, y: 280, w: 640, h: 360 };
/** The Fanfare Gate, between the herald towers. */
export const GATE: Pt = { x: 1200, y: 200 };
/** The Oompah Bun. */
export const BAKERY: Pt = { x: 1840, y: 1610 };

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Chimney mouths that breathe smoke in `animateOver`. */
const chimneys: Pt[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

/** An ellipse as a closed polyline (the ring drive round the Great Bandstand). */
function ring(cx: number, cy: number, rx: number, ry: number, n = 40): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry }); }
  return pts;
}

// ── Layout ───────────────────────────────────────────────────────────

// The north wall of the terrace, broken only by the Fanfare Gate.
solids.push({ kind: 'rect', x: 0, y: 0, w: 1090, h: 78 }, { kind: 'rect', x: 1310, y: 0, w: 1090, h: 78 });

// The Fanfare Gate: two herald towers and the iron arch between them.
addPiece(1050, 200, 160, 300, (g, rng) => heraldTower(g, 1050, 200, 230, -1, rng), { kind: 'rect', x: 1012, y: 172, w: 76, h: 30 });
addPiece(1350, 200, 160, 300, (g, rng) => heraldTower(g, 1350, 200, 230, 1, rng), { kind: 'rect', x: 1312, y: 172, w: 76, h: 30 });
addPiece(GATE.x, 196, 240, 200, (g) => {
  // The arch: wrought iron scrolled like a treble clef, gilt lyre at the keystone.
  g.lineStyle(6, NAVY_DARK, 1);
  g.beginPath(); g.arc(GATE.x, 120, 112, Math.PI, 0, false); g.strokePath();
  g.lineStyle(3, BRASS, 1);
  g.beginPath(); g.arc(GATE.x, 120, 112, Math.PI, 0, false); g.strokePath();
  g.beginPath(); g.arc(GATE.x, 120, 98, Math.PI * 1.05, Math.PI * 1.95, false); g.strokePath();
  for (let k = 0; k < 9; k++) {
    const a = Math.PI + ((k + 0.5) / 9) * Math.PI;
    g.lineStyle(2, BRASS_DARK, 1);
    g.lineBetween(GATE.x + Math.cos(a) * 98, 120 + Math.sin(a) * 98, GATE.x + Math.cos(a) * 112, 120 + Math.sin(a) * 112);
  }
  g.lineStyle(4, NAVY_DARK, 1); g.lineBetween(GATE.x - 112, 120, GATE.x - 112, 196); g.lineBetween(GATE.x + 112, 120, GATE.x + 112, 196);
  g.fillStyle(NAVY, 1); g.fillCircle(GATE.x, 8, 20);
  lyre(g, GATE.x, 12, 13, BRASS_LIT);
  // A scroll banner with a stave on it, hung under the arch.
  g.fillStyle(CREAM, 1); g.fillRect(GATE.x - 70, 38, 140, 20);
  g.fillStyle(dim(CREAM, 0.2), 1); g.fillCircle(GATE.x - 70, 48, 10); g.fillCircle(GATE.x + 70, 48, 10);
  g.lineStyle(0.8, 0x2a1e14, 0.6); for (let k = 0; k < 5; k++) g.lineBetween(GATE.x - 62, 41 + k * 3.5, GATE.x + 62, 41 + k * 3.5);
  for (let k = 0; k < 9; k++) note(g, GATE.x - 56 + k * 14, 54 - (k % 4) * 3, 2, 0x2a1e14, k % 3 ? 'crotchet' : 'quaver');
});

// Bronze bandsmen on plinths along the Parade.
for (const y of [430, 580, 1120, 1380]) {
  for (const x of [1105, 1295]) addPiece(x, y, 50, 90, (g, rng) => bronzeBandsman(g, x, y, rng), { kind: 'circle', x, y: y - 8, r: 17 });
}

// The Great Bandstand and its ring drive.
addPiece(GREAT_STAND.x, GREAT_STAND.y + STAND_R * 0.45, 280, 260, (g, rng) => bandstand(g, GREAT_STAND.x, GREAT_STAND.y + STAND_R * 0.45, STAND_R, rng),
  { kind: 'rect', x: GREAT_STAND.x - 112, y: GREAT_STAND.y - 34, w: 224, h: 96 });
for (const a of [0.25, 0.75, 1.25, 1.75]) {
  const x = GREAT_STAND.x + Math.cos(a * Math.PI) * (RING_R + 46), y = GREAT_STAND.y + Math.sin(a * Math.PI) * (RING_R + 46) * 0.8;
  addPiece(x, y, 30, 80, (g) => brassLamp(g, x, y), { kind: 'circle', x, y: y - 3, r: 6 });
}

// The small bandstand on the east lawn.
addPiece(EAST_STAND.x, EAST_STAND.y + 27, 170, 170, (g, rng) => bandstand(g, EAST_STAND.x, EAST_STAND.y + 27, 60, rng),
  { kind: 'rect', x: EAST_STAND.x - 62, y: EAST_STAND.y - 20, w: 124, h: 56 });

// The drill halls behind the drill square, and its saluting base.
for (const [x, w, c] of [[380, 220, 0xe8dcc6], [700, 240, 0xd8c4a4]] as [number, number, number][]) {
  addPiece(x, 232, w + 40, 200, (g, rng) => bandHouse(g, x, 232, w, 100, c, rng), { kind: 'rect', x: x - w / 2, y: 204, w, h: 30 });
  chimneys.push({ x: x + (w * 0.28) * (x < 500 ? -1 : 1), y: 232 - 100 - 35 - 24 });
}
addPiece(900, 470, 70, 80, (g) => {
  // The saluting base: a little dais with a flagstaff and the band's colours.
  g.fillStyle(STONE_DARK, 1); g.fillRect(876, 452, 48, 18);
  g.fillStyle(STONE, 1); g.fillRect(878, 448, 44, 16);
  g.lineStyle(3, NAVY_DARK, 1); g.lineBetween(912, 448, 912, 360);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(912, 358, 3);
  g.fillStyle(SCARLET, 1); g.fillTriangle(912, 364, 950, 372, 912, 384);
  lyre(g, 924, 374, 4, BRASS_LIT);
}, { kind: 'rect', x: 876, y: 448, w: 48, h: 22 });

// The Horn-Foundry and its yard: horns waiting to be tried, a rack of tubes.
addPiece(FOUNDRY.x, FOUNDRY.y, 600, 320, (g, rng) => hornFoundry(g, FOUNDRY.x, FOUNDRY.y, 520, 150, rng),
  { kind: 'rect', x: FOUNDRY.x - 262, y: FOUNDRY.y - 32, w: 524, h: 34 });
for (const u of [0.14, 0.5, 0.86]) chimneys.push({ x: FOUNDRY.x - 260 + 520 * u + (u - 0.5) * 50, y: FOUNDRY.y - 150 - 150 * 0.55 * (u === 0.5 ? 1.25 : 1) - 34 });
for (const [x, y, a] of [[300, 1400, -1.2], [380, 1410, -1.9], [720, 1405, -1.4]] as [number, number, number][]) {
  addPiece(x, y, 60, 70, (g) => {
    g.fillStyle(WOOD_DARK, 1); g.fillRect(x - 18, y - 10, 36, 10);
    hornBell(g, x + Math.cos(a) * 20, y - 14 + Math.sin(a) * 20, a, 14, 22, BRASS);
  }, { kind: 'circle', x, y: y - 4, r: 16 });
}

// Cottages behind the foundry and along the Parade.
for (const [x, y, w, c] of [
  [300, 1560, 180, 0xecdcc0], [540, 1560, 170, 0xd8c8e0], [780, 1560, 180, 0xe8d0b0],
  [1010, 1250, 150, 0xe4d8c4], [1010, 1520, 150, 0xd8e0c8], [1390, 1250, 150, 0xf0d8c8],
] as [number, number, number, number][]) {
  addPiece(x, y, w + 50, 190, (g, rng) => bandHouse(g, x, y, w, 90, c, rng, x < 1200), { kind: 'rect', x: x - w / 2, y: y - 28, w, h: 30 });
  chimneys.push({ x: x + (x < 1200 ? -w * 0.28 : w * 0.28), y: y - 90 - 32 - 24 });
}

// The Bandhall, its kettle-drums, and the tuning yard beside it.
addPiece(BANDHALL.x, BANDHALL.y, 640, 400, (g, rng) => bandhall(g, BANDHALL.x, BANDHALL.y, 560, 170, rng),
  { kind: 'rect', x: BANDHALL.x - 282, y: BANDHALL.y - 32, w: 564, h: 34 });
const FORKS: [number, number, number][] = [[2030, 590, PITCH_LOW], [2150, 560, PITCH_MID], [2270, 610, PITCH_HIGH], [2060, 730, PITCH_HIGH], [2290, 740, PITCH_LOW]];
for (const [x, y, c] of FORKS) addPiece(x, y, 40, 90, (g) => tuningFork(g, x, y, 0.9, c), { kind: 'circle', x, y: y - 5, r: 14 });

// The Oompah Bun, and the lakeside walk's benches.
addPiece(BAKERY.x, BAKERY.y, 300, 220, (g, rng) => bunBakery(g, BAKERY.x, BAKERY.y, 260, 110, rng),
  { kind: 'rect', x: BAKERY.x - 132, y: BAKERY.y - 30, w: 264, h: 32 });
chimneys.push({ x: BAKERY.x - 130 + 260 * 0.8 + 18, y: BAKERY.y - 110 - 10 - 40 - 22 });
for (const x of [1620, 2120]) {
  addPiece(x, 1078, 70, 40, (g) => {
    g.fillStyle(WOOD_DARK, 1); g.fillRect(x - 26, 1070, 52, 6); g.fillRect(x - 24, 1076, 4, 6); g.fillRect(x + 20, 1076, 4, 6);
    g.fillStyle(SCARLET, 1); g.fillRect(x - 26, 1058, 52, 5);
  });
}

// Lamps along the Parade and the Promenade.
for (const y of [320, 700, 1000, 1240, 1480]) for (const x of [1120, 1280]) addPiece(x, y, 30, 80, (g) => brassLamp(g, x, y), { kind: 'circle', x, y: y - 3, r: 6 });
for (const x of [220, 520, 820, 1580, 1880, 2180]) for (const y of [800, 900]) addPiece(x, y, 30, 80, (g) => brassLamp(g, x, y), { kind: 'circle', x, y: y - 3, r: 6 });

// The waystone at the Carillon road.
addPiece(1090, 1630, 50, 90, (g) => brassWaystone(g, 1090, 1630), { kind: 'circle', x: 1090, y: 1624, r: 16 });

// The lake itself is no place to walk.
solids.push({ kind: 'rect', x: BANDLAKE.x + 10, y: BANDLAKE.y + 10, w: BANDLAKE.w - 20, h: BANDLAKE.h - 20 });

// ── Painter ──────────────────────────────────────────────────────────

/** The practice band drilling round the square: a little loop just inside its chalk line. */
const DRILL_LOOP: Pt[] = [
  { x: DRILL.x + 60, y: DRILL.y + 60 }, { x: DRILL.x + DRILL.w - 60, y: DRILL.y + 60 },
  { x: DRILL.x + DRILL.w - 60, y: DRILL.y + DRILL.h - 60 }, { x: DRILL.x + 60, y: DRILL.y + DRILL.h - 60 },
];

const painter: AreaPainter = {
  ground(g, rng) {
    // The terrace lawn, mown in broad stripes.
    groundFill(g, { x: 0, y: 0, w: BRASS_W, h: BRASS_H }, LAWN, LAWN_LIT, LAWN_DARK, rng, 0.8);
    for (let x = 0; x < BRASS_W; x += 120) { g.fillStyle(LAWN_LIT, 0.16); g.fillRect(x, 0, 60, BRASS_H); }
    // The snowy upper terraces above the north wall.
    snowTerraces(g, 0, BRASS_W, 70, rng);
    // Roads: the Parade, the Promenade, the ring drive round the Great Bandstand.
    road(g, [{ x: PARADE_X, y: BRASS_H }, { x: PARADE_X, y: 40 }], 92, GRAVEL, GRAVEL_DARK, STONE_LIT, rng);
    road(g, [{ x: 0, y: PROM_Y }, { x: BRASS_W, y: PROM_Y }], 80, GRAVEL, GRAVEL_DARK, STONE_LIT, rng);
    road(g, ring(GREAT_STAND.x, GREAT_STAND.y, RING_R, RING_R * 0.8), 56, GRAVEL, GRAVEL_DARK, STONE_LIT, rng);
    // Lawn inside the ring, mown in a chequer, a scarlet bed round the stand.
    g.fillStyle(LAWN, 1); g.fillEllipse(GREAT_STAND.x, GREAT_STAND.y, (RING_R - 30) * 2, (RING_R * 0.8 - 30) * 2);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.fillStyle(i % 2 ? SCARLET : SCARLET_LIT, 0.85); g.fillCircle(GREAT_STAND.x + Math.cos(a) * 150, GREAT_STAND.y + Math.sin(a) * 120, 6);
    }
    // Paths: the foundry lane, the lakeside walk, the Bandhall drive, the drill square's approach.
    road(g, [{ x: PARADE_X - 46, y: 1300 }, { x: 820, y: 1300 }], 48, GRAVEL, GRAVEL_DARK, STONE_LIT, rng);
    road(g, [{ x: PARADE_X + 46, y: 1050 }, { x: 1480, y: 1060 }, { x: 2140, y: 1070 }, { x: 2330, y: 1090 }, { x: 2330, y: 1500 }, { x: 1500, y: 1500 }, { x: 1480, y: 1060 }], 46, GRAVEL, GRAVEL_DARK, STONE_LIT, rng);
    road(g, [{ x: PARADE_X + 46, y: 600 }, { x: 1860, y: 600 }, { x: 1860, y: 470 }], 56, GRAVEL, GRAVEL_DARK, STONE_LIT, rng);
    road(g, [{ x: 1860, y: 600 }, { x: 2160, y: 650 }], 40, GRAVEL, GRAVEL_DARK, STONE_LIT, rng);
    road(g, [{ x: PARADE_X - 46, y: 460 }, { x: DRILL.x + DRILL.w, y: 460 }], 46, GRAVEL, GRAVEL_DARK, STONE_LIT, rng);
    // The drill square: rolled gravel, a chalk border, dressing lines and markers.
    g.fillStyle(GRAVEL_DARK, 1); g.fillRect(DRILL.x - 6, DRILL.y - 6, DRILL.w + 12, DRILL.h + 12);
    g.fillStyle(GRAVEL, 1); g.fillRect(DRILL.x, DRILL.y, DRILL.w, DRILL.h);
    for (let i = 0; i < 260; i++) { g.fillStyle(rng() < 0.5 ? GRAVEL_DARK : STONE_LIT, 0.4); g.fillCircle(DRILL.x + rng() * DRILL.w, DRILL.y + rng() * DRILL.h, 1.2); }
    g.lineStyle(3, CREAM, 0.85); g.strokeRect(DRILL.x + 20, DRILL.y + 20, DRILL.w - 40, DRILL.h - 40);
    g.lineStyle(1.5, CREAM, 0.5);
    for (let x = DRILL.x + 80; x < DRILL.x + DRILL.w - 40; x += 80) g.lineBetween(x, DRILL.y + 20, x, DRILL.y + DRILL.h - 20);
    for (let k = 0; k < 4; k++) for (let j = 0; j < 8; j++) { g.fillStyle(CREAM, 0.7); g.fillCircle(DRILL.x + 80 + j * 70, DRILL.y + 70 + k * 72, 3); }
    // The foundry's cobbled test yard, scorched round the furnace door.
    flagstones(g, { x: 260, y: FOUNDRY.y, w: 560, h: 240 }, 22, 0x8a7e70, 0x5a5048, rng);
    g.fillStyle(0x1a120c, 0.25); g.fillEllipse(FOUNDRY.x, FOUNDRY.y + 30, 260, 60);
    for (let i = 0; i < 30; i++) { g.fillStyle(BRASS_LIT, 0.4); g.fillRect(260 + rng() * 560, FOUNDRY.y + 10 + rng() * 220, 3, 1); }
    // The Bandhall forecourt: cream flags and a scarlet runner to the steps.
    flagstones(g, { x: 1560, y: BANDHALL.y, w: 600, h: 130 }, 26, STONE, STONE_DARK, rng);
    g.fillStyle(SCARLET, 0.9); g.fillRect(BANDHALL.x - 30, BANDHALL.y, 60, 130);
    g.lineStyle(2, BRASS, 0.9); g.lineBetween(BANDHALL.x - 26, BANDHALL.y, BANDHALL.x - 26, BANDHALL.y + 130); g.lineBetween(BANDHALL.x + 26, BANDHALL.y, BANDHALL.x + 26, BANDHALL.y + 130);
    // The tuning yard: raked gravel round the forks in three coloured rings.
    g.fillStyle(GRAVEL, 1); g.fillEllipse(2160, 660, 360, 230);
    for (const [r, c] of [[160, PITCH_LOW], [130, PITCH_MID], [100, PITCH_HIGH]] as [number, number][]) { g.lineStyle(2, c, 0.35); g.strokeEllipse(2160, 660, r * 2, r * 1.3); }
    // The Bandlake.
    pool(g, BANDLAKE, LAKE_DEEP, LAKE, STONE, rng);
    g.lineStyle(3, BRASS_DARK, 0.6); g.strokeRect(BANDLAKE.x - 3, BANDLAKE.y - 3, BANDLAKE.w + 6, BANDLAKE.h + 6);
    // Geranium borders along the Parade.
    for (let y = 140; y < BRASS_H - 120; y += 14) {
      if (Math.abs(y - PROM_Y) < RING_R + 30) continue;
      for (const x of [PARADE_X - 56, PARADE_X + 56]) { g.fillStyle(LAWN_DARK, 1); g.fillCircle(x, y, 4); g.fillStyle((y / 14) % 2 < 1 ? SCARLET_LIT : SCARLET, 1); g.fillCircle(x + 1, y - 1, 2.4); }
    }
    // The quay road's cobbles at the south edge.
    flagstones(g, { x: PARADE_X - 46, y: 1620, w: 92, h: 80 }, 18, STONE, STONE_DARK, rng);
  },

  pieces,

  animate(g, t, view) {
    // The bandlake: rings, the floating stage bobbing, carp rising when the band plays.
    if (inView(BANDLAKE.x + BANDLAKE.w / 2, BANDLAKE.y + BANDLAKE.h / 2, view, 360)) {
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.3 + i / 6) % 1;
        const cx = BANDLAKE.x + 50 + ((i * 131) % (BANDLAKE.w - 100)), cy = BANDLAKE.y + 40 + ((i * 71) % (BANDLAKE.h - 80));
        g.lineStyle(1.2, LAKE_LIT, 0.45 * (1 - ph)); g.strokeEllipse(cx, cy, 8 + ph * 46, 3 + ph * 15);
      }
      floatingStage(g, STAGE.x, STAGE.y, 200, Math.sin(t * 1.1) * 2);
      // Reflections of the stage's lamps.
      for (const k of [-1, 1]) { g.fillStyle(0xffe6a0, 0.18 + Math.sin(t * 2 + k) * 0.06); g.fillEllipse(STAGE.x + k * 94, STAGE.y + 18, 8, 22); }
      const cx = BANDLAKE.x + 140 + Math.cos(t * 0.5) * 80, cy = BANDLAKE.y + 240 + Math.sin(t * 0.5) * 30;
      g.fillStyle(BRASS_LIT, 0.5); g.fillEllipse(cx, cy, 20, 8);
    }
    // The furnace glow flickering in the foundry bay; a glint running round the bell on the lathe.
    if (inView(FOUNDRY.x, FOUNDRY.y - 60, view, 360)) {
      glow(g, FOUNDRY.x - 50, FOUNDRY.y - 30, 70 + Math.sin(t * 7) * 6, FURNACE, 0.04 + Math.sin(t * 11) * 0.015, 3);
      const sa = t * 9;
      g.fillStyle(0xffffff, 0.6); g.fillCircle(FOUNDRY.x + 63 + Math.cos(sa) * 3, FOUNDRY.y - 36 + Math.sin(sa) * 12, 1.8);
    }
    // The practice band drilling round the square.
    if (inView(DRILL.x + DRILL.w / 2, DRILL.y + DRILL.h / 2, view, 300)) {
      const parts = ['mace', 'bass', 'drum', 'cornet', 'trombone'] as const;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = alongLoop(DRILL_LOOP, t * 0.045 - i * 0.022);
        bandsman(g, p.x, p.y, 0.85, parts[i], (t * 2) % 2, Math.cos(p.a) >= 0 ? 1 : -1, SCARLET, t * 1000);
      }
    }
    // The bells of the herald towers catching the sun.
    if (inView(GATE.x, 60, view, 300)) {
      for (const [x, k] of [[1050 - 56, 0], [1350 + 56, 1]] as [number, number][]) {
        const ph = (t * 0.25 + k * 0.5) % 1;
        g.fillStyle(0xffffff, 0.35 * Math.sin(ph * Math.PI)); g.fillCircle(x + (ph - 0.5) * 30, -6 + Math.abs(ph - 0.5) * 8, 4);
      }
    }
    // The waystone's bell-mouth breathing light.
    if (inView(1090, 1600, view)) glow(g, 1090, 1570, 18, BRASS_LIT, 0.04 + Math.sin(t * 2) * 0.02, 2);
    // A conductor's music stands catching the light on the Great Bandstand.
    if (inView(GREAT_STAND.x, GREAT_STAND.y, view, 200)) {
      const ph = (t * 0.6) % 1;
      g.fillStyle(0xffffff, 0.2 * Math.sin(ph * Math.PI)); g.fillCircle(GREAT_STAND.x - 60 + ph * 120, GREAT_STAND.y - 18, 3);
    }
  },

  animateOver(g, t, view) {
    // Notes rising off both bandstands and the floating stage, as if on a stave.
    for (const [x, y, n, seed] of [[GREAT_STAND.x, GREAT_STAND.y - 120, 7, 0], [EAST_STAND.x, EAST_STAND.y - 70, 3, 3], [STAGE.x, STAGE.y - 90, 4, 7]] as [number, number, number, number][]) {
      if (!inView(x, y, view, 200)) continue;
      for (let i = 0; i < n; i++) {
        const ph = (t * 0.22 + i / n + seed * 0.07) % 1;
        const nx = x + Math.sin(t * 0.8 + i * 1.7 + seed) * 50 + (i - n / 2) * 14, ny = y - ph * 120;
        note(g, nx, ny, 4, i % 3 ? BRASS_LIT : CREAM, (['quaver', 'crotchet', 'pair'] as const)[(i + seed) % 3], Math.sin(ph * Math.PI) * 0.85);
      }
    }
    // Smoke from the bell-mouthed chimneys.
    for (const c of chimneys) {
      if (!inView(c.x, c.y, view, 120)) continue;
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.18 + i / 4 + c.x * 0.001) % 1;
        g.fillStyle(0xe8ecf2, 0.24 * (1 - ph)); g.fillCircle(c.x + Math.sin(t + i) * 6 + ph * 22, c.y - ph * 70, 6 + ph * 14);
      }
    }
    // Bunting across the Parade and the Promenade, fluttering.
    if (inView(PARADE_X, 1440, view, 200)) bunting(g, { x: PARADE_X - 110, y: 1400 }, { x: PARADE_X + 110, y: 1400 }, [SCARLET, CREAM, NAVY, BRASS], 20, t);
    if (inView(PARADE_X, 640, view, 200)) bunting(g, { x: PARADE_X - 110, y: 620 }, { x: PARADE_X + 110, y: 620 }, [SCARLET, CREAM, NAVY, BRASS], 20, t);
    if (inView(620, PROM_Y, view, 260)) bunting(g, { x: 520, y: 772 }, { x: 820, y: 772 }, [NAVY, BRASS, SCARLET, CREAM], 24, t);
    if (inView(1880, PROM_Y, view, 260)) bunting(g, { x: 1580, y: 772 }, { x: 1880, y: 772 }, [NAVY, BRASS, SCARLET, CREAM], 24, t);
    if (inView(GATE.x, 120, view, 300)) bunting(g, { x: 1050, y: 0 }, { x: 1350, y: 0 }, [SCARLET, BRASS, SCARLET, CREAM], 40, t);
  },
};

export const BRASS_AREA: AreaDef = {
  id: 'brass',
  isle: 'sound',
  court: 'brass',
  name: 'The Brass Court',
  subtitle: 'Every Hour called first from the Fanfare Gate',
  w: BRASS_W,
  h: BRASS_H,
  bg: LAWN_DARK,
  accent: BRASS_COLOR,
  weather: 'notes',
  spawn: { x: 1200, y: 1600 },
  painter,
  solids,
  exits: [
    { side: 's', to: 'carillon', label: 'Down the Parade to Carillon Quay' },
    { side: 'n', to: 'cathedral', label: 'Through the Fanfare Gate to the Cathedral' },
    { side: 'w', to: 'cavern', at: PROM_Y, label: 'The Promenade west to the Echo Caves' },
    { side: 'e', to: 'masque', at: PROM_Y, label: 'The Promenade east to the Masquerade' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 1090, y: 1662 } },
    { kind: 'prince', id: 'fanfare', at: { x: BANDHALL.x, y: BANDHALL.y + 52 } },
    { kind: 'water', id: 'brass-bandlake', shape: BANDLAKE, fishery: 'brass-bandlake' },
    { kind: 'encounter', id: 'brass-marching-band' },
    { kind: 'encounter', id: 'brass-sousaphone' },
    { kind: 'encounter', id: 'brass-herald-trumpets' },
    { kind: 'encounter', id: 'brass-tuning-forks' },
    { kind: 'encounter', id: 'brass-bandstand' },
    {
      kind: 'sign', at: { x: 1300, y: 1650 },
      text: 'THE PARADE. Walk in step. Stand for the Hours where you are. Between the Hours: quiet, by order of the Hush.',
    },
    {
      kind: 'sign', at: { x: 940, y: 660 },
      text: 'THE DRILL SQUARE. Bands drill at the half-hour. A man out of step is out of tune. Report him to the Drum-Major.',
    },
    {
      kind: 'sign', at: { x: 1460, y: 1080 },
      text: 'THE BANDLAKE. Fishing permitted, quietly. The floating stage plays the Score at Vespers. Do not sing along.',
    },
    {
      kind: 'sign', at: { x: 1560, y: 600 },
      text: 'THE BANDHALL. Seat of the Prince of the Brass, Herald of the Hours. All reeds tuned in the yard beside.',
    },
    { kind: 'chest', id: 'brass-chest-foundry', at: { x: 860, y: 1400 }, coins: 120 },
    { kind: 'chest', id: 'brass-chest-bandhall', at: { x: 2340, y: 420 }, orbs: 2, open: { prince: 'fanfare' } },
  ],
  npcs: BRASS_NPCS,
  crowd: BRASS_CROWD,
};
