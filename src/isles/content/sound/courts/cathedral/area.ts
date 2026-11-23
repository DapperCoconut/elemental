import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { dim, flagstones, glow, groundFill, lit, road, type G } from '../../../../art/IsleArt';
import {
  bellFrame, bellowsDoor, candelabrum, candle, candleRack, cathedral, chandlerSign, choirSign, closeHouse,
  cloisterSide, cloisterWalk, confessional, frozenPond, glassKiln, glazierSign, kneelingRail, lantern, organPipe,
  snowDrift, snowYew, tuningFork,
} from './art';
import {
  ASHLAR_DARK, CANDLELIGHT, CATHEDRAL_COLOR, CRAG, CRAG_DARK, CRAG_LIT, FLAG, FLAG_DARK, FLAG_LIT, FLAME,
  GILT, GLASS_COLORS, GROUT, PIPE_LIT, SLUSH, SNOW, SNOW_DEEP, SNOW_LIT, SNOW_SHADE, VESPER_LIT,
} from './palette';
import { CATHEDRAL_CROWD, CATHEDRAL_NPCS } from './npcs';

/**
 * The Cathedral Court — the summit of Choirholm, where the Maestro's cathedral of the Score
 * stands with the Great Organ's pipes rising out of its roof.
 *
 * Read it from the Brass Court road up:
 * • **the Pilgrim Stair** (south): broad snowy steps up from the Fanfare terraces, kneeling-
 *   rails in the drifts either side where pilgrims wait out the Hours, the waystone at the foot;
 * • **the Votive Forest** (south-west): iron hearses of candles in their hundreds, every flame
 *   paid for, with Tallowby's chandlery and the glazier's kiln-yard at its edge;
 * • **the Close** (centre): grey flags before the west front, where the great rose throws its
 *   colours on the snow at Vespers; the Angelus bell hangs in its frame at the close's east end;
 * • **the Cloisters** (east): four walks round a garth of snow and the frozen cloister pond;
 * • **the Penitents' Walk** (north-west): the confession booths and the choir school;
 * • **the Cathedral** (north): Prince Vesper's seat. Round its flanks the side-paths climb to
 * • **the Organ Yard**: a shelf under the crag where the Bellows Door is cut into the mountain,
 *   sealed until all six first chairs have fallen.
 */

export const CATHEDRAL_W = 2400;
export const CATHEDRAL_H = 1800;

const STAIR_X = 1200;

/** The west front: the foot of the great doors. */
export const WEST_DOOR: Pt = { x: 1200, y: 800 };
const CATH_W = 620;
/** The Bellows Door to the Great Organ. */
export const ORGAN_DOOR: Pt = { x: 1200, y: 150 };
/** Where you come out of the Organ. */
export const ORGAN_ARRIVE: Pt = { x: 1200, y: 260 };
/** The frozen cloister pond — the court's fishing water. */
export const CLOISTER_POND: Rect = { x: 1860, y: 960, w: 240, h: 140 };
/** The cloister garth (the walks run round it). */
const GARTH: Rect = { x: 1720, y: 820, w: 520, h: 470 };
/** The Angelus bell in its frame. */
export const ANGELUS: Pt = { x: 1620, y: 1500 };
/** Tallowby's chandlery (front-wall base). */
export const CHANDLERY: Pt = { x: 520, y: 930 };
/** The glazier's kiln-yard. */
export const KILN: Pt = { x: 790, y: 1200 };
/** The choir school. */
export const CHOIR_SCHOOL: Pt = { x: 300, y: 700 };
/** The Organ Yard's three wind-vents (grilles where the Organ draws its breath). */
export const VENTS: Pt[] = [{ x: 760, y: 250 }, { x: 1640, y: 250 }, { x: 1360, y: 210 }];
/** The pauper candles guttering in the snow along the stair. */
export const PAUPER_CANDLES: Pt[] = [{ x: 1010, y: 1500 }, { x: 1420, y: 1640 }, { x: 720, y: 1560 }, { x: 1560, y: 1380 }];
/** Ruby flash-glass the glazier hid in the kiln-yard snow. */
export const RUBY_SHARDS: Pt[] = [{ x: 640, y: 1130 }, { x: 930, y: 1260 }, { x: 760, y: 1320 }];

/** The candle hearses of the Votive Forest. */
const RACKS: Pt[] = [
  { x: 260, y: 1130 }, { x: 420, y: 1110 }, { x: 300, y: 1290 }, { x: 600, y: 1240 }, { x: 250, y: 1450 },
  { x: 440, y: 1420 }, { x: 620, y: 1460 }, { x: 380, y: 1580 },
];

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Flames that flicker in `animate`. */
const flames: { x: number; y: number; r: number; s: number }[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid, when?: Piece['when']): void {
  pieces.push({ x, y, w, h, draw, when });
  if (solid) solids.push(solid);
}

// ── Layout ───────────────────────────────────────────────────────────

// The crag across the north edge (solid), the Bellows Door cut into it.
solids.push({ kind: 'rect', x: 0, y: 0, w: CATHEDRAL_W, h: 108 });
addPiece(ORGAN_DOOR.x, ORGAN_DOOR.y, 520, 280, (g) => bellowsDoor(g, ORGAN_DOOR.x, ORGAN_DOOR.y),
  { kind: 'rect', x: ORGAN_DOOR.x - 230, y: 100, w: 460, h: 26 });
// The fork-shaped bar across the door, until the six first chairs are down.
addPiece(ORGAN_DOOR.x, ORGAN_DOOR.y + 2, 140, 120, (g) => {
  const x = ORGAN_DOOR.x, y = ORGAN_DOOR.y;
  g.fillStyle(0x24242a, 1); g.fillRect(x - 56, y - 74, 112, 10);
  g.fillStyle(GILT, 1); g.fillRect(x - 56, y - 74, 112, 3);
  tuningFork(g, x, y - 18, 52, GILT, 1);
  for (let i = 0; i < 6; i++) { g.fillStyle(0x24242a, 1); g.fillCircle(x - 45 + i * 18, y - 69, 4); g.fillStyle(GILT, 1); g.fillCircle(x - 45 + i * 18, y - 69, 2); }
}, undefined, { not: { princesOfIsle: 'sound', count: 6 } });
// Pipe stumps and vent grilles in the Organ Yard.
for (const v of VENTS) {
  addPiece(v.x, v.y, 70, 90, (g) => {
    g.fillStyle(0x24242a, 1); g.fillEllipse(v.x, v.y, 46, 18);
    for (let i = -3; i <= 3; i++) { g.lineStyle(2, 0x5a5e6a, 1); g.lineBetween(v.x + i * 5, v.y - 7, v.x + i * 5, v.y + 7); }
    organPipe(g, v.x + 30, v.y - 4, 12, 70, 0.4);
  }, { kind: 'circle', x: v.x + 30, y: v.y - 8, r: 9 });
}

// The cathedral — its whole depth is solid; side-paths climb round its flanks.
addPiece(WEST_DOOR.x, WEST_DOOR.y, CATH_W + 120, 560, (g, rng) => cathedral(g, WEST_DOOR.x, WEST_DOOR.y, CATH_W, rng),
  { kind: 'rect', x: WEST_DOOR.x - CATH_W / 2 - 10, y: 330, w: CATH_W + 20, h: WEST_DOOR.y - 330 - 6 });
for (const k of [-1, 1]) {
  addPiece(WEST_DOOR.x + k * 230, WEST_DOOR.y + 70, 40, 100, (g) => candelabrum(g, WEST_DOOR.x + k * 230, WEST_DOOR.y + 70, 1),
    { kind: 'circle', x: WEST_DOOR.x + k * 230, y: WEST_DOOR.y + 66, r: 10 });
  flames.push({ x: WEST_DOOR.x + k * 230, y: WEST_DOOR.y - 14, r: 34, s: k });
}

// The cloisters: north walk, two halves of the south walk, the east walk and the west walk with a gap.
addPiece(GARTH.x + GARTH.w / 2, GARTH.y, GARTH.w + 40, 120, (g) => cloisterWalk(g, GARTH.x, GARTH.y, GARTH.w),
  { kind: 'rect', x: GARTH.x - 10, y: GARTH.y - 24, w: GARTH.w + 20, h: 24 });
for (const [x0, len] of [[GARTH.x, 190], [GARTH.x + GARTH.w - 190, 190]] as [number, number][]) {
  addPiece(x0 + len / 2, GARTH.y + GARTH.h, len + 30, 120, (g) => cloisterWalk(g, x0, GARTH.y + GARTH.h, len),
    { kind: 'rect', x: x0 - 8, y: GARTH.y + GARTH.h - 22, w: len + 16, h: 22 });
}
addPiece(GARTH.x + GARTH.w, GARTH.y + GARTH.h, 60, GARTH.h + 60, (g) => cloisterSide(g, GARTH.x + GARTH.w, GARTH.y, GARTH.h - 20),
  { kind: 'rect', x: GARTH.x + GARTH.w - 22, y: GARTH.y, w: 44, h: GARTH.h - 20 });
for (const [y0, len] of [[GARTH.y, 150], [GARTH.y + 290, GARTH.h - 310]] as [number, number][]) {
  addPiece(GARTH.x, y0 + len, 60, len + 60, (g) => cloisterSide(g, GARTH.x, y0, len),
    { kind: 'rect', x: GARTH.x - 22, y: y0, w: 44, h: len });
}
// A yew in each corner of the garth.
for (const [x, y] of [[GARTH.x + 70, GARTH.y + 80], [GARTH.x + GARTH.w - 70, GARTH.y + 80], [GARTH.x + 80, GARTH.y + GARTH.h - 50], [GARTH.x + GARTH.w - 80, GARTH.y + GARTH.h - 50]] as [number, number][]) {
  addPiece(x, y, 60, 120, (g, rng) => snowYew(g, x, y, 0.8, rng), { kind: 'circle', x, y: y - 4, r: 12 });
}

// The Angelus bell in its frame at the east end of the close.
addPiece(ANGELUS.x, ANGELUS.y, 240, 300, (g, rng) => bellFrame(g, ANGELUS.x, ANGELUS.y, rng),
  { kind: 'rect', x: ANGELUS.x - 92, y: ANGELUS.y - 10, w: 24, h: 14 });
solids.push({ kind: 'rect', x: ANGELUS.x + 68, y: ANGELUS.y - 10, w: 24, h: 14 });

// Tallowby's chandlery, the choir school and the glazier's shed.
addPiece(CHANDLERY.x, CHANDLERY.y, 220, 230, (g, rng) => closeHouse(g, CHANDLERY.x, CHANDLERY.y, 170, 100, rng, chandlerSign),
  { kind: 'rect', x: CHANDLERY.x - 86, y: CHANDLERY.y - 60, w: 172, h: 54 });
addPiece(CHOIR_SCHOOL.x, CHOIR_SCHOOL.y, 260, 260, (g, rng) => closeHouse(g, CHOIR_SCHOOL.x, CHOIR_SCHOOL.y, 210, 120, rng, choirSign),
  { kind: 'rect', x: CHOIR_SCHOOL.x - 106, y: CHOIR_SCHOOL.y - 70, w: 212, h: 64 });
addPiece(KILN.x - 120, KILN.y - 10, 170, 200, (g, rng) => closeHouse(g, KILN.x - 120, KILN.y - 10, 120, 80, rng, glazierSign),
  { kind: 'rect', x: KILN.x - 182, y: KILN.y - 56, w: 124, h: 44 });
addPiece(KILN.x, KILN.y, 150, 110, (g) => glassKiln(g, KILN.x, KILN.y), { kind: 'circle', x: KILN.x, y: KILN.y - 14, r: 30 });

// The Penitents' Walk: two booths along the north-west path, and a yew walk behind them.
for (const [x, y] of [[420, 520], [720, 480]] as [number, number][]) {
  addPiece(x, y, 110, 170, (g) => confessional(g, x, y, 0.9, 0, x > 600), { kind: 'rect', x: x - 36, y: y - 24, w: 72, h: 22 });
}
for (const [x, y, s] of [[160, 300, 1.1], [300, 260, 0.9], [560, 250, 1.2], [180, 980, 1], [140, 1660, 1.1], [2280, 1500, 1.2], [2150, 1680, 0.9], [2300, 400, 1.1], [2080, 300, 0.9], [1880, 420, 1], [660, 760, 0.8], [2300, 1100, 1]] as [number, number, number][]) {
  addPiece(x, y, 70, 140, (g, rng) => snowYew(g, x, y, s, rng), { kind: 'circle', x, y: y - 4, r: 13 * s });
}

// The Votive Forest: candle hearses, every one with its coin box.
RACKS.forEach((r, i) => {
  addPiece(r.x, r.y, 110, 90, (g, rng) => candleRack(g, r.x, r.y, 90, 0.55 + (i % 3) * 0.15, rng), { kind: 'rect', x: r.x - 44, y: r.y - 14, w: 88, h: 14 });
  flames.push({ x: r.x, y: r.y - 42, r: 46, s: i * 0.37 });
});

// Kneeling-rails along the Pilgrim Stair.
for (const [x, y] of [[1040, 1420], [1360, 1460], [1040, 1600], [1360, 1620], [980, 1720], [1420, 1740]] as [number, number][]) {
  addPiece(x, y, 110, 40, (g, rng) => kneelingRail(g, x, y, 90, rng), { kind: 'rect', x: x - 45, y: y - 8, w: 90, h: 8 });
}

// Lanterns along the paths.
for (const [x, y] of [[1110, 1300], [1290, 1300], [1110, 1680], [1290, 1560], [770, 700], [1630, 700], [770, 380], [1630, 380], [1660, 1080], [760, 900], [1530, 1160]] as [number, number][]) {
  addPiece(x, y, 30, 100, (g) => lantern(g, x, y), { kind: 'circle', x, y: y - 2, r: 6 });
  flames.push({ x, y: y - 66, r: 30, s: x * 0.01 });
}

// Snow drifts here and there (decor only).
for (const [x, y, w] of [[140, 840, 80], [2260, 820, 90], [980, 1360, 60], [1480, 1360, 70], [2000, 1420, 100], [620, 1680, 90], [1800, 1700, 80], [2200, 600, 90]] as [number, number, number][]) {
  addPiece(x, y, w, 30, (g, rng) => snowDrift(g, x, y, w, rng));
}

// ── Painter ──────────────────────────────────────────────────────────

const painter: AreaPainter = {
  ground(g, rng) {
    const W = CATHEDRAL_W, H = CATHEDRAL_H;
    groundFill(g, { x: 0, y: 0, w: W, h: H }, SNOW, SNOW_SHADE, SNOW_LIT, rng, 1.2);
    // Wind-scalloped drifts across the open snow.
    for (let i = 0; i < 90; i++) {
      const x = rng() * W, y = 120 + rng() * (H - 120), w = 60 + rng() * 140;
      g.fillStyle(SNOW_SHADE, 0.35); g.fillEllipse(x, y + 4, w, w * 0.16);
      g.fillStyle(SNOW_LIT, 0.6); g.fillEllipse(x - 6, y, w * 0.8, w * 0.1);
    }
    // The terraces: the summit is cut in tiers like a concert hall, each lip a shadowed step.
    for (const ty of [1330, 1640]) {
      g.fillStyle(SNOW_DEEP, 0.5); g.fillRect(0, ty, W, 10);
      g.fillStyle(SNOW_SHADE, 0.8); g.fillRect(0, ty + 10, W, 8);
      g.fillStyle(SNOW_LIT, 0.9); g.fillRect(0, ty - 3, W, 3);
      for (let x = 0; x < W; x += 60) { g.fillStyle(ASHLAR_DARK, 0.25); g.fillRect(x, ty + 2, 58, 6); }
    }

    // The crag: grey rock across the north edge, snow in its ledges, a dark seam at its foot.
    g.fillStyle(CRAG_DARK, 1); g.fillRect(0, 0, W, 120);
    for (let x = -40; x < W + 40; x += 56) {
      const h = 70 + rng() * 60;
      g.fillStyle(CRAG, 1); g.fillTriangle(x - 40, 120, x + 50, 120, x + rng() * 20, 120 - h);
      g.fillStyle(CRAG_LIT, 0.6); g.fillTriangle(x - 20, 120 - h * 0.3, x + rng() * 20, 120 - h, x - 4, 120 - h * 0.4);
      g.fillStyle(SNOW, 0.9); g.fillEllipse(x + 6, 120 - h * 0.7, 26, 6);
    }
    g.fillStyle(0x24262e, 0.7); g.fillRect(0, 116, W, 6);

    // The Organ Yard: dark flags under the crag.
    flagstones(g, { x: 640, y: 124, w: 1120, h: 210 }, 34, dim(FLAG, 0.15), GROUT, rng);
    g.fillStyle(SNOW, 0.5); g.fillRect(640, 124, 1120, 8);

    // Paths: the Pilgrim Stair, the close, and the trodden ways to each quarter.
    road(g, [{ x: 820, y: 340 }, { x: 820, y: 860 }], 70, SLUSH, dim(SLUSH, 0.2), FLAG_DARK, rng);
    road(g, [{ x: 1580, y: 340 }, { x: 1580, y: 860 }], 70, SLUSH, dim(SLUSH, 0.2), FLAG_DARK, rng);
    road(g, [{ x: 820, y: 640 }, { x: 560, y: 620 }, { x: 240, y: 620 }], 60, SLUSH, dim(SLUSH, 0.2), FLAG_DARK, rng);
    road(g, [{ x: 900, y: 980 }, { x: 520, y: 990 }, { x: 420, y: 1020 }], 60, SLUSH, dim(SLUSH, 0.2), FLAG_DARK, rng);
    road(g, [{ x: 520, y: 990 }, { x: 470, y: 1270 }, { x: 420, y: 1520 }, { x: 600, y: 1640 }, { x: 1100, y: 1680 }], 54, SLUSH, dim(SLUSH, 0.2), FLAG_DARK, rng);
    road(g, [{ x: 1500, y: 1050 }, { x: 1720, y: 1050 }, { x: 1980, y: 1150 }], 56, SLUSH, dim(SLUSH, 0.2), FLAG_DARK, rng);
    road(g, [{ x: 1300, y: 1320 }, { x: 1620, y: 1560 }, { x: 1900, y: 1560 }], 54, SLUSH, dim(SLUSH, 0.2), FLAG_DARK, rng);
    road(g, [{ x: 1980, y: 1290 }, { x: 1980, y: 1440 }, { x: 1760, y: 1540 }], 46, SLUSH, dim(SLUSH, 0.2), FLAG_DARK, rng);
    // The close before the west front.
    flagstones(g, { x: 850, y: 820, w: 700, h: 470 }, 40, FLAG, GROUT, rng);
    g.lineStyle(3, FLAG_LIT, 0.6); g.strokeRect(850, 820, 700, 470);
    // A labyrinth of darker flags let into the close — the pilgrims walk it on their knees.
    const lx = 1200, ly = 1080;
    for (let k = 1; k <= 6; k++) {
      g.lineStyle(5, FLAG_DARK, 0.7);
      g.beginPath(); g.arc(lx, ly, k * 26, 0.15, Math.PI * 2 - 0.15, false); g.strokePath();
    }
    g.fillStyle(FLAG_DARK, 0.8); g.fillCircle(lx, ly, 14);
    g.fillStyle(GILT, 0.5); g.fillCircle(lx, ly, 6);
    // The Pilgrim Stair: broad shallow steps, swept, snow heaped at the ends.
    for (let y = 1300; y < H; y += 26) {
      g.fillStyle(FLAG, 1); g.fillRect(STAIR_X - 96, y, 192, 26);
      g.fillStyle(FLAG_LIT, 1); g.fillRect(STAIR_X - 96, y, 192, 4);
      g.fillStyle(FLAG_DARK, 1); g.fillRect(STAIR_X - 96, y + 22, 192, 4);
      g.fillStyle(SNOW, 1); g.fillEllipse(STAIR_X - 100, y + 12, 22, 22); g.fillEllipse(STAIR_X + 100, y + 12, 22, 22);
    }
    // The cloister garth: snow lawn, a cross of paths, and the frozen pond.
    g.fillStyle(SNOW_LIT, 0.6); g.fillRect(GARTH.x, GARTH.y, GARTH.w, GARTH.h);
    flagstones(g, { x: GARTH.x - 26, y: GARTH.y - 30, w: GARTH.w + 52, h: 36 }, 24, FLAG, GROUT, rng);
    flagstones(g, { x: GARTH.x - 26, y: GARTH.y + GARTH.h - 30, w: GARTH.w + 52, h: 36 }, 24, FLAG, GROUT, rng);
    road(g, [{ x: GARTH.x, y: CLOISTER_POND.y + 90 }, { x: GARTH.x + GARTH.w, y: CLOISTER_POND.y + 90 }], 40, FLAG, FLAG_DARK, GROUT, rng);
    road(g, [{ x: CLOISTER_POND.x + 120, y: GARTH.y }, { x: CLOISTER_POND.x + 120, y: GARTH.y + GARTH.h }], 40, FLAG, FLAG_DARK, GROUT, rng);
    frozenPond(g, CLOISTER_POND, rng);
    // The Penitents' Walk: a narrow flagged path between the booths.
    flagstones(g, { x: 300, y: 520, w: 520, h: 60 }, 22, dim(FLAG, 0.1), GROUT, rng);
    // The rose's colours thrown on the snow of the close, baked in faintly (animate shimmers them).
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillStyle(GLASS_COLORS[i % 3], 0.07);
      g.fillEllipse(1200 + Math.cos(a) * 110, 1000 + Math.sin(a) * 50, 120, 40);
    }
    // Footprints in the snow: pilgrims' knees and boots off the paths.
    for (let i = 0; i < 140; i++) {
      const x = 80 + rng() * (W - 160), y = 360 + rng() * (H - 400);
      g.fillStyle(SNOW_DEEP, 0.3); g.fillEllipse(x, y, 5, 8); g.fillEllipse(x + 7, y + 10, 5, 8);
    }
    // Wax spilled in the Votive Forest.
    for (const r of RACKS) { g.fillStyle(0xf4ecd6, 0.5); g.fillEllipse(r.x + 10, r.y + 10, 80, 20); g.fillStyle(CANDLELIGHT, 0.08); g.fillEllipse(r.x, r.y, 160, 70); }
    // Pauper candles: stubs pushed into the snow along the stair, most snuffed by the wind.
    for (let i = 0; i < 30; i++) {
      const side = i % 2 ? 1 : -1;
      const x = STAIR_X + side * (120 + rng() * 260), y = 1360 + rng() * 400;
      candle(g, x, y, 4 + rng() * 4, false);
    }
    // The Organ's wind has scoured the snow round the door in long streaks.
    for (let i = 0; i < 20; i++) { g.fillStyle(SNOW_LIT, 0.5); g.fillEllipse(1200 + (rng() - 0.5) * 500, 200 + rng() * 120, 80 + rng() * 60, 3); }
  },

  pieces,

  animate(g, t, view, world) {
    const inView = (x: number, y: number, r: number) => x > view.x - r && x < view.x + view.w + r && y > view.y - r && y < view.y + view.h + r;
    // Candle flames: a breathing glow on the snow, each with its own rhythm.
    for (const f of flames) {
      if (!inView(f.x, f.y, f.r * 2)) continue;
      const fl = 0.6 + Math.sin(t * 7 + f.s * 11) * 0.2 + Math.sin(t * 13 + f.s * 5) * 0.1;
      glow(g, f.x, f.y, f.r * (0.9 + fl * 0.2), CANDLELIGHT, 0.03 + fl * 0.02, 2);
    }
    // The rose window's light on the close: twelve panes of colour crawling with the hour.
    if (inView(1200, 1000, 300)) {
      const rot = t * 0.04;
      for (let i = 0; i < 12; i++) {
        const a = rot + (i / 12) * Math.PI * 2;
        const pulse = 0.05 + Math.sin(t * 0.9 + i) * 0.02;
        g.fillStyle(GLASS_COLORS[i % 3], pulse);
        g.fillEllipse(1200 + Math.cos(a) * 130, 1010 + Math.sin(a) * 60, 110, 36);
      }
    }
    // The Organ breathes: pale streaks of wind sighing out of the Bellows Door.
    if (inView(ORGAN_DOOR.x, ORGAN_DOOR.y, 300)) {
      const open = world.test({ princesOfIsle: 'sound', count: 6 });
      const breath = (Math.sin(t * 0.8) + 1) / 2;
      for (let i = 0; i < 9; i++) {
        const ph = (t * 0.5 + i * 0.13) % 1;
        const x = ORGAN_DOOR.x - 60 + ((i * 37) % 120), y = ORGAN_DOOR.y + ph * 140;
        g.lineStyle(2, PIPE_LIT, (open ? 0.35 : 0.2) * breath * Math.sin(ph * Math.PI));
        g.lineBetween(x, y, x + Math.sin(t + i) * 10, y + 24);
      }
      if (open) glow(g, ORGAN_DOOR.x, ORGAN_DOOR.y - 70, 70, 0xdde8ff, 0.04 + breath * 0.03, 3);
    }
    // The vents hum: a ring on the snow round each grille at the top of every breath.
    for (const v of VENTS) {
      if (!inView(v.x, v.y, 80)) continue;
      const ph = (t * 0.4 + v.x * 0.001) % 1;
      g.lineStyle(1.5, PIPE_LIT, 0.4 * (1 - ph)); g.strokeEllipse(v.x, v.y, 40 + ph * 70, 14 + ph * 24);
    }
  },

  animateOver(g, t, view, world) {
    // Notes rising off the Organ's roof-pipes: the Score, never quite stopping. After the Maestro
    // falls, they come out in every colour, and out of tune.
    const free = world.test({ monarch: 'cadenza' });
    if (!(view.y < 520 && view.x < 1600 && view.x + view.w > 800)) return;
    for (let i = 0; i < 14; i++) {
      const ph = (t * 0.12 + i * 0.071) % 1;
      const x = 1040 + ((i * 53) % 320) + Math.sin(t * 1.3 + i) * 12;
      const y = 300 - ph * 220;
      const c = free ? GLASS_COLORS[i % GLASS_COLORS.length] : lit(VESPER_LIT, 0.3);
      const a = Math.sin(ph * Math.PI) * 0.7;
      g.fillStyle(c, a); g.fillEllipse(x, y, 7, 5);
      g.lineStyle(1.4, c, a); g.lineBetween(x + 3, y, x + 3, y - 13);
      if (i % 3 === 0) g.lineBetween(x + 3, y - 13, x + 8, y - 9);
    }
    // A few candle sparks lifting off the hearses into the dark.
    for (const f of flames) {
      if (f.r < 40 || f.x < view.x - 40 || f.x > view.x + view.w + 40 || f.y < view.y - 60 || f.y > view.y + view.h + 40) continue;
      for (let k = 0; k < 2; k++) {
        const ph = (t * 0.6 + f.s + k * 0.5) % 1;
        g.fillStyle(FLAME, 0.6 * (1 - ph)); g.fillCircle(f.x + Math.sin(t * 2 + k + f.s) * 14, f.y - ph * 50, 1.3);
      }
    }
  },
};

export const CATHEDRAL_AREA: AreaDef = {
  id: 'cathedral',
  isle: 'sound',
  court: 'cathedral',
  name: 'The Cathedral Court',
  subtitle: 'Every candle bought, every voice kept',
  w: CATHEDRAL_W,
  h: CATHEDRAL_H,
  bg: CRAG_DARK,
  accent: CATHEDRAL_COLOR,
  weather: 'incense',
  spawn: { x: 1200, y: 1730 },
  painter,
  solids,
  exits: [
    { side: 's', to: 'brass', label: 'Down the Pilgrim Stair to the Brass Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 1060, y: 1680 } },
    { kind: 'prince', id: 'vesper', at: { x: WEST_DOOR.x, y: WEST_DOOR.y + 44 } },
    { kind: 'water', id: 'cathedral-cloister', shape: CLOISTER_POND, fishery: 'cathedral-cloister' },
    {
      kind: 'door', at: ORGAN_DOOR, to: 'organ', arrive: { x: 900, y: 2440 }, label: 'The Bellows Door — into the Great Organ',
      open: { princesOfIsle: 'sound', count: 6 },
      lockedText: 'A fork-shaped bar seals the door, six bolts through it — one for each first chair. The wind sighs behind it.',
    },
    { kind: 'encounter', id: 'cathedral-rose-window' },
    { kind: 'encounter', id: 'cathedral-candle-vigil' },
    { kind: 'encounter', id: 'cathedral-bell-choir' },
    { kind: 'encounter', id: 'cathedral-procession' },
    { kind: 'encounter', id: 'cathedral-confessional' },
    {
      kind: 'sign', at: { x: 1320, y: 1700 },
      text: 'THE PILGRIM STAIR. Kneel at the Hours. Rise in silence. A candle for the Organ: one penny at Tallowby\'s.',
    },
    {
      kind: 'sign', at: { x: 640, y: 1000 },
      text: 'THE VOTIVE FOREST. Every flame is a prayer to the Maestro. Unpaid flames are snuffed by the verger.',
    },
    {
      kind: 'sign', at: { x: 940, y: 600 },
      text: 'THE PENITENTS\' WALK. Confess your noise. The Confessor hears all. So, afterwards, does the Organ.',
    },
    {
      kind: 'sign', at: { x: 1060, y: 300 },
      text: 'THE BELLOWS DOOR. The Great Organ. Sealed by the six first chairs. No voice comes back out.',
    },
    { kind: 'chest', id: 'cathedral-chest-cloister', at: { x: 2180, y: 1200 }, coins: 120 },
    { kind: 'chest', id: 'cathedral-chest-yard', at: { x: 1700, y: 180 }, orbs: 3, open: { prince: 'vesper' } },
  ],
  npcs: CATHEDRAL_NPCS,
  crowd: CATHEDRAL_CROWD,
  checkpoints: [{ x: 1200, y: 1700 }, { x: 1200, y: 900 }],
};

