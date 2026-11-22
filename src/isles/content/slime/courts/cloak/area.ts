import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { dim, glow, groundFill } from '../../../../art/IsleArt';
import {
  aspsMouth, cisternBasin, cisternColumn, cloakWaystone, cobbles, doseWindow, duckboards, earTrumpet, gallerySegment,
  hallOfLetters, lampAt, lampGlow, lampPost, letter, letterLitter, linePole, mangrove, maskStall, mire, mooringPost,
  nameBooth, queueRope, shutteredHouse, street, twoCupsSign, washLine, watchtower, type HouseLook,
} from './art';
import {
  BONE, CISTERN_LIT, CLOAK_COLOR, COBBLE_DARK, FLAG, FLAG_DARK, FLAG_LIT, LAMP, MASK_GOLD, MIRE, MOSS, PLASTER,
  PLASTER_DARK, PLASTER_LIT, ROOF, ROOF_LIT, SHUTTER, SHUTTER_LIT, SHUTTER_RED, TIMBER, WAX,
} from './palette';
import { CLOAK_CROWD, CLOAK_NPCS } from './npcs';

/**
 * The Cloak Court — the informers' town, on a hump of slate in the black mire east of the Fang.
 *
 * Read it from the Fang road in:
 * • **the Name Booth** (west): the road comes in off the duckboards past a sentry box where the
 *   gate-clerk writes down every name, and the waystone — a veiled fang of white rock;
 * • **Hush Street**, running east the length of the town between shuttered houses, eye-holes in
 *   every shutter, ear-trumpets on every corner, washing lines of cloaks strung across it;
 * • **the Pay Office** (north-west), where informers queue at a barred window to be paid in Draught;
 * • **Tattle Square** in the middle: the watchtower, and the Asp's Mouth — the stone serpent you
 *   post denunciations into — with Wenna Quill's writing-desk beside it;
 * • **the Whispering Gallery** (north): a half-ring of stone niches, each a brass mouth that runs
 *   under the streets to the Hall;
 * • **the Hall of Letters** (north-east), Prince Whisper's seat, its whole front nailed with paper;
 * • **the Two Cups** on Hush Street east, the Taster's tavern;
 * • **the Mask Market** (south-west), stalls hung with faces;
 * • **the Letter Cistern** (south-east), the court's fishing water, ink-black and scummed with
 *   sodden letters; and the duckboard road south to the Umbral Court.
 */

export const CLOAK_W = 2400;
export const CLOAK_H = 1600;

const HUSH_Y = 800;
/** Tattle Square. */
export const SQUARE: Pt = { x: 1200, y: 830 };
const SQ_RX = 240, SQ_RY = 160;
/** The Whispering Gallery: centre of its half-ring (the arc runs west → north → east). */
export const GALLERY: Pt = { x: 1200, y: 430 };
const GAL_RX = 230, GAL_RY = 150;
/** Prince Whisper's Hall of Letters — the middle of its front step. */
export const HALL: Pt = { x: 1900, y: 430 };
/** The Two Cups tavern. */
export const TAVERN: Pt = { x: 1560, y: 715 };
/** The Pay Office (the Dose Window). */
export const PAY: Pt = { x: 520, y: 520 };
/** The Asp's Mouth, the denunciation box in Tattle Square. */
export const MOUTH: Pt = { x: 1080, y: 715 };
/** The Letter Cistern — the court's fishing water. */
export const CISTERN: Rect = { x: 1690, y: 1160, w: 360, h: 170 };
/** The watchtower over the square. */
const TOWER: Pt = { x: 1330, y: 720 };
/** The town's southern shore: mire beyond it. */
const SHORE_Y = 1460;

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Lantern points that glow in `animate`. */
const lamps: Pt[] = [];
/** Eye-holes with someone behind them: blink in `animate`. */
const peeps: Pt[] = [];
/** Washing lines strung pole-top to pole-top, drawn over actors. */
const lines: { a: Pt; b: Pt; seed: number }[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: Piece['draw'], solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

// ── Houses ───────────────────────────────────────────────────────────

const WALLS = [PLASTER, PLASTER_DARK, PLASTER_LIT, 0x5a4a52, 0x4e5660];
let hi = 0;
function addHouse(x: number, y: number, w: number, h: number, o: Partial<HouseLook> = {}): void {
  const look: HouseLook = {
    wall: o.wall ?? WALLS[hi % WALLS.length], shutter: o.shutter ?? (hi % 3 === 2 ? SHUTTER_RED : hi % 2 ? SHUTTER_LIT : SHUTTER),
    roof: o.roof ?? (hi % 2 ? ROOF : ROOF_LIT), trumpet: o.trumpet ?? ([0, 1, -1, 0][hi % 4] as -1 | 0 | 1), lit: o.lit ?? hi % 3 === 0,
    storeys: o.storeys ?? (h > 200 ? 3 : 2),
  };
  hi++;
  addPiece(x, y, w + 60, h + 110, (g, rng) => { shutteredHouse(g, x, y, w, h, look, rng); }, { kind: 'rect', x: x - w / 2, y: y - 30, w, h: 30 });
  peeps.push({ x: x - 10, y: y - h + 17 }, { x: x + w * 0.3, y: y - h + 17 });
}

// North of Hush Street, west.
addHouse(250, 720, 150, 200);
addHouse(830, 720, 140, 190, { trumpet: 1 });
// The back streets north-west.
addHouse(200, 420, 150, 220, { lit: true });
addHouse(800, 400, 130, 200, { trumpet: -1 });
// South of Hush Street.
addHouse(200, 1000, 150, 190);
addHouse(930, 990, 140, 180, { shutter: SHUTTER, lit: true }); // the Ashbys' green door
addHouse(1560, 1010, 150, 190, { trumpet: 1 });
addHouse(1780, 1010, 140, 210);
addHouse(1990, 1000, 150, 200, { trumpet: -1, lit: true }); // Brother Cobb's
// East, past the Hall and the cistern.
addHouse(2180, 860, 130, 190);
addHouse(2190, 1300, 120, 180, { trumpet: -1 });

// ── Set pieces ───────────────────────────────────────────────────────

// The Hall of Letters.
addPiece(HALL.x, HALL.y, 560, 420, (g, rng) => hallOfLetters(g, HALL.x, HALL.y, 460, 230, rng),
  { kind: 'rect', x: HALL.x - 230, y: HALL.y - 50, w: 460, h: 40 });
// The Two Cups tavern, its sign swinging (sign drawn in animate).
addPiece(TAVERN.x, TAVERN.y, 280, 280, (g, rng) => {
  shutteredHouse(g, TAVERN.x, TAVERN.y, 220, 160, { wall: 0x5a4048, shutter: SHUTTER_RED, roof: ROOF, lit: true, storeys: 2 }, rng);
  // A bench and a barrel by the door, cups left on the barrel head.
  g.fillStyle(TIMBER, 1); g.fillRect(TAVERN.x + 40, TAVERN.y - 14, 50, 6); g.fillRect(TAVERN.x + 44, TAVERN.y - 8, 4, 8); g.fillRect(TAVERN.x + 82, TAVERN.y - 8, 4, 8);
}, { kind: 'rect', x: TAVERN.x - 110, y: TAVERN.y - 30, w: 220, h: 30 });
// The Pay Office and its queue rope.
addPiece(PAY.x, PAY.y, 320, 180, (g, rng) => doseWindow(g, PAY.x, PAY.y, 260, 120, rng),
  { kind: 'rect', x: PAY.x - 130, y: PAY.y - 30, w: 260, h: 30 });
addPiece(PAY.x - 10, 600, 240, 40, (g) => queueRope(g, PAY.x - 120, PAY.x + 100, 600));
// Tattle Square: the watchtower and the Asp's Mouth.
addPiece(TOWER.x, TOWER.y, 120, 280, (g) => watchtower(g, TOWER.x, TOWER.y, 1), { kind: 'circle', x: TOWER.x, y: TOWER.y - 6, r: 36 });
addPiece(MOUTH.x, MOUTH.y, 70, 140, (g) => aspsMouth(g, MOUTH.x, MOUTH.y, 1), { kind: 'circle', x: MOUTH.x, y: MOUTH.y - 8, r: 24 });
// Wenna's writing desk beside the Mouth.
addPiece(965, 735, 60, 60, (g) => {
  g.fillStyle(0x000000, 0.25); g.fillEllipse(965, 736, 50, 12);
  g.fillStyle(TIMBER, 1); g.fillRect(944, 706, 42, 26); g.fillRect(946, 732, 4, 6); g.fillRect(980, 732, 4, 6);
  g.fillStyle(0xd8d0b8, 1); g.fillRect(950, 708, 16, 12);
  letter(g, 976, 714, 0.7, 0.2);
  g.fillStyle(0x15111d, 1); g.fillCircle(980, 708, 3);
  g.lineStyle(1, 0xe8e0c8, 1); g.lineBetween(980, 706, 986, 694);
}, { kind: 'rect', x: 944, y: 712, w: 42, h: 22 });
// The Name Booth and the waystone at the west road.
addPiece(110, 665, 120, 130, (g, rng) => nameBooth(g, 110, 665, rng), { kind: 'rect', x: 88, y: 645, w: 44, h: 20 });
addPiece(240, 880, 50, 90, (g) => cloakWaystone(g, 240, 880), { kind: 'circle', x: 240, y: 874, r: 16 });
// The Mask Market: two rows of stalls, and Hesper Latch's.
for (const [x, y, s] of [[360, 1160, 1], [560, 1160, 4], [760, 1160, 2], [360, 1340, 7], [560, 1340, 3], [760, 1340, 5]] as [number, number, number][]) {
  addPiece(x, y, 180, 150, (g, rng) => maskStall(g, x, y, 150, s, rng), { kind: 'rect', x: x - 78, y: y - 30, w: 156, h: 30 });
}
addPiece(980, 1150, 150, 150, (g, rng) => maskStall(g, 980, 1150, 120, 6, rng), { kind: 'rect', x: 918, y: 1120, w: 124, h: 30 });
// The Letter Cistern's four broken columns.
for (const [x, y, b] of [[1660, 1145, true], [2080, 1145, false], [1660, 1355, false], [2080, 1355, true]] as [number, number, boolean][]) {
  addPiece(x, y, 80, 120, (g) => cisternColumn(g, x, y, 90, b), { kind: 'circle', x, y: y - 6, r: 14 });
}

// The Whispering Gallery: its half-ring, one piece per stretch so you can walk inside it.
const GAL_SEGS = 6;
for (let i = 0; i < GAL_SEGS; i++) {
  const a0 = Math.PI + (i / GAL_SEGS) * Math.PI, a1 = Math.PI + ((i + 1) / GAL_SEGS) * Math.PI;
  const y0 = GALLERY.y + Math.sin(a0) * GAL_RY, y1 = GALLERY.y + Math.sin(a1) * GAL_RY;
  const xm = GALLERY.x + Math.cos((a0 + a1) / 2) * GAL_RX;
  addPiece(xm, Math.max(y0, y1), 140, 160, (g, rng) => gallerySegment(g, GALLERY.x, GALLERY.y, GAL_RX, GAL_RY, a0, a1, rng));
}
for (let i = 0; i <= 20; i++) {
  const a = Math.PI + (i / 20) * Math.PI;
  solids.push({ kind: 'circle', x: GALLERY.x + Math.cos(a) * GAL_RX, y: GALLERY.y + Math.sin(a) * GAL_RY - 4, r: 18 });
}

// Ear-trumpets on the corners, every bell turned toward a door.
const TRUMPETS: [number, number, number][] = [
  [420, 735, 0.3], [1460, 870, Math.PI - 0.4], [1050, 975, -0.6], [650, 1060, Math.PI], [1880, 610, Math.PI + 0.3],
  [1270, 560, 0.4], [300, 875, -0.4], [1100, 1300, 0.2], [2120, 1010, Math.PI],
];
for (const [x, y, d] of TRUMPETS) addPiece(x, y, 60, 80, (g) => earTrumpet(g, x, y, 1, d, 54), { kind: 'circle', x, y: y - 2, r: 7 });
// Lamp posts along the streets.
for (const [x, y] of [[330, 870], [640, 735], [900, 870], [1480, 735], [1720, 870], [1960, 600], [1130, 1120], [1270, 1350], [1130, 560], [360, 1440], [2000, 1420]] as [number, number][]) {
  addPiece(x, y, 50, 90, (g) => lampPost(g, x, y, 1), { kind: 'circle', x, y: y - 2, r: 7 });
  lamps.push(lampAt(x, y, 1));
}
// Washing lines over the streets: two poles each, the line itself in animateOver.
for (const [ax, ay, bx, by, seed] of [
  [470, 870, 610, 740, 0], [1700, 870, 1840, 735, 2], [1880, 1125, 2080, 1125, 4], [280, 1430, 500, 1430, 1], [950, 640, 1120, 610, 3],
] as [number, number, number, number, number][]) {
  for (const [x, y] of [[ax, ay], [bx, by]]) addPiece(x, y, 30, 130, (g) => linePole(g, x, y, 110), { kind: 'circle', x, y: y - 2, r: 6 });
  lines.push({ a: { x: ax, y: ay - 108 }, b: { x: bx, y: by - 108 }, seed });
}
// Mangroves round the shore, standing in the mire.
for (const [x, y, s] of [
  [60, 300, 1.1], [40, 1150, 1.2], [140, 1540, 1], [520, 1560, 1.15], [880, 1540, 0.95], [1520, 1560, 1.1], [1880, 1540, 1],
  [2320, 1450, 1.2], [2340, 980, 1.05], [2330, 420, 1.15], [2050, 90, 1], [700, 90, 1.1], [1500, 80, 0.9], [300, 70, 1],
] as [number, number, number][]) {
  addPiece(x, y, 180 * s, 200 * s, (g, rng) => mangrove(g, x, y, s, rng));
}
// Mooring posts where the duckboards meet the shore.
for (const [x, y] of [[1150, 1470], [1250, 1470], [60, 740], [60, 870]] as [number, number][]) addPiece(x, y, 20, 40, (g) => mooringPost(g, x, y));

// ── The mire round the town (open at the Fang road, west, and the Umbral boards, south) ──

solids.push({ kind: 'rect', x: 0, y: 0, w: CLOAK_W, h: 110 });
solids.push({ kind: 'rect', x: 2270, y: 0, w: 130, h: CLOAK_H });
solids.push({ kind: 'rect', x: 0, y: 0, w: 66, h: 722 });
solids.push({ kind: 'rect', x: 0, y: 878, w: 66, h: CLOAK_H - 878 });
solids.push({ kind: 'rect', x: 0, y: SHORE_Y, w: 1112, h: CLOAK_H - SHORE_Y });
solids.push({ kind: 'rect', x: 1288, y: SHORE_Y, w: CLOAK_W - 1288, h: CLOAK_H - SHORE_Y });
// The cistern keeps you to its rim.
solids.push({ kind: 'rect', x: CISTERN.x - 10, y: CISTERN.y - 10, w: CISTERN.w + 20, h: CISTERN.h + 20 });

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 160): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

const painter: AreaPainter = {
  ground(g, rng) {
    const W = CLOAK_W, H = CLOAK_H;
    // The mire everywhere, then the town's hump of slate laid over it.
    mire(g, { x: 0, y: 0, w: W, h: H }, rng);
    g.fillStyle(dim(COBBLE_DARK, 0.2), 1); g.fillRect(56, 100, 2224, SHORE_Y - 90);
    groundFill(g, { x: 66, y: 110, w: 2204, h: SHORE_Y - 110 }, COBBLE_DARK, dim(FLAG_DARK, 0.2), 0x2a2a22, rng, 1.2);
    // A ragged mossy shoreline where the slate meets the water.
    for (let x = 60; x < 2270; x += 18) {
      g.fillStyle(MOSS, 0.7); g.fillEllipse(x, SHORE_Y + 2 + rng() * 6, 26, 10);
      g.fillStyle(MOSS, 0.5); g.fillEllipse(x, 106 + rng() * 6, 24, 9);
    }
    for (let y = 110; y < SHORE_Y; y += 18) {
      g.fillStyle(MOSS, 0.6); g.fillEllipse(64 + rng() * 6, y, 10, 24);
      g.fillStyle(MOSS, 0.6); g.fillEllipse(2268 + rng() * 6, y, 10, 24);
    }
    // Duckboards: the Fang road in from the west and the Umbral boards out to the south.
    duckboards(g, [{ x: 0, y: HUSH_Y }, { x: 90, y: HUSH_Y }], 120, rng);
    duckboards(g, [{ x: 1200, y: SHORE_Y - 20 }, { x: 1200, y: H }], 110, rng);

    // The streets.
    street(g, [{ x: 70, y: HUSH_Y }, { x: 1900, y: HUSH_Y }, { x: 1900, y: 560 }], 120, rng);
    street(g, [{ x: 1200, y: SQUARE.y }, { x: 1200, y: GALLERY.y + 30 }], 100, rng);
    street(g, [{ x: 1200, y: SQUARE.y }, { x: 1200, y: SHORE_Y - 10 }], 100, rng);
    street(g, [{ x: PAY.x, y: HUSH_Y }, { x: PAY.x, y: 580 }], 80, rng);
    street(g, [{ x: 280, y: 1245 }, { x: 1200, y: 1245 }], 110, rng);
    street(g, [{ x: 1200, y: 1080 }, { x: 2150, y: 1080 }], 80, rng);
    street(g, [{ x: 360, y: HUSH_Y }, { x: 360, y: 460 }, { x: 900, y: 460 }], 60, rng);

    // Tattle Square: pale flags in rings round the tower and the Mouth.
    g.fillStyle(FLAG_DARK, 1); g.fillEllipse(SQUARE.x, SQUARE.y, SQ_RX * 2 + 16, SQ_RY * 2 + 16);
    g.fillStyle(FLAG, 1); g.fillEllipse(SQUARE.x, SQUARE.y, SQ_RX * 2, SQ_RY * 2);
    for (let r = 1; r < 6; r++) { g.lineStyle(1, FLAG_DARK, 0.6); g.strokeEllipse(SQUARE.x, SQUARE.y, (SQ_RX * 2 * r) / 6, (SQ_RY * 2 * r) / 6); }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.lineStyle(1, FLAG_DARK, 0.5);
      g.lineBetween(SQUARE.x + Math.cos(a) * SQ_RX * 0.17, SQUARE.y + Math.sin(a) * SQ_RY * 0.17, SQUARE.x + Math.cos(a) * SQ_RX, SQUARE.y + Math.sin(a) * SQ_RY);
    }
    // An eye let into the square's heart in dark slate.
    g.fillStyle(dim(FLAG_DARK, 0.3), 1); g.fillEllipse(SQUARE.x, SQUARE.y, 90, 40);
    g.fillStyle(FLAG_LIT, 1); g.fillCircle(SQUARE.x, SQUARE.y, 12);
    g.fillStyle(dim(FLAG_DARK, 0.4), 1); g.fillCircle(SQUARE.x, SQUARE.y, 6);
    for (let i = 0; i < 30; i++) { const x = SQUARE.x + (rng() - 0.5) * SQ_RX * 1.6, y = SQUARE.y + (rng() - 0.5) * SQ_RY * 1.4; g.fillStyle(MIRE, 0.5); g.fillEllipse(x, y, 20 + rng() * 30, 6); }

    // The Whispering Gallery's floor: a fan of bone and slate, every line leading to the centre.
    g.fillStyle(FLAG_DARK, 1); g.fillEllipse(GALLERY.x, GALLERY.y, GAL_RX * 2, GAL_RY * 2);
    for (let i = 0; i < 16; i++) {
      const a0 = Math.PI + (i / 16) * Math.PI, a1 = Math.PI + ((i + 1) / 16) * Math.PI;
      g.fillStyle(i % 2 ? dim(BONE, 0.45) : FLAG, 1);
      g.fillTriangle(GALLERY.x, GALLERY.y, GALLERY.x + Math.cos(a0) * GAL_RX, GALLERY.y + Math.sin(a0) * GAL_RY, GALLERY.x + Math.cos(a1) * GAL_RX, GALLERY.y + Math.sin(a1) * GAL_RY);
    }
    g.fillStyle(dim(BONE, 0.3), 1); g.fillEllipse(GALLERY.x, GALLERY.y - 40, 70, 34);
    g.lineStyle(2, MASK_GOLD, 0.5); g.strokeEllipse(GALLERY.x, GALLERY.y - 40, 70, 34);
    g.fillStyle(0x15111d, 1); g.fillCircle(GALLERY.x, GALLERY.y - 40, 5);

    // The Hall's forecourt: black-and-bone flags.
    for (let y = 430; y < 560; y += 26) for (let x = 1650; x < 2150; x += 26) {
      const k = ((x - 1650) / 26 + (y - 430) / 26) % 2;
      g.fillStyle(k ? 0x1e1a24 : dim(BONE, 0.4), 1); g.fillRect(x, y, 26, 26);
    }
    g.lineStyle(2, FLAG_DARK, 1); g.strokeRect(1650, 430, 500, 130);
    // The Two Cups' step: a spill of cobbles, wine-dark, and broken glass.
    cobbles(g, { x: 1460, y: 715, w: 200, h: 30 }, rng, 10);
    g.fillStyle(0x6a1430, 0.35); g.fillEllipse(1540, 740, 40, 10);
    // The Letter Cistern.
    cisternBasin(g, CISTERN, rng);
    // Torn letters in the gutters.
    letterLitter(g, 1130, 760, 6, rng);
    letterLitter(g, 1700, 600, 7, rng);
    letterLitter(g, 600, 870, 4, rng);
    letterLitter(g, 1300, 1100, 4, rng);
    // Wax drips on the square's flags by the Mouth.
    for (let i = 0; i < 10; i++) { g.fillStyle(WAX, 0.5); g.fillCircle(MOUTH.x + (rng() - 0.5) * 50, MOUTH.y + 8 + rng() * 14, 1.5 + rng() * 2); }
  },

  pieces,

  animate(g, t, view) {
    for (let i = 0; i < lamps.length; i++) { const l = lamps[i]; if (inView(l.x, l.y, view)) lampGlow(g, l.x, l.y, t, i * 1.7); }
    // The watchtower's lantern swinging its beam across the square.
    if (inView(TOWER.x, TOWER.y, view, 400)) {
      const a = Math.PI / 2 + Math.sin(t * 0.45) * 1.1;
      const ox = TOWER.x, oy = TOWER.y - 6;
      for (let k = 0; k < 5; k++) {
        const r0 = 30 + k * 50, r1 = 30 + (k + 1) * 50;
        g.fillStyle(LAMP, 0.05 * (1 - k / 5));
        g.fillTriangle(ox + Math.cos(a - 0.25) * r0, oy + Math.sin(a - 0.25) * r0 * 0.6, ox + Math.cos(a + 0.25) * r0, oy + Math.sin(a + 0.25) * r0 * 0.6, ox + Math.cos(a + 0.25) * r1, oy + Math.sin(a + 0.25) * r1 * 0.6);
        g.fillTriangle(ox + Math.cos(a - 0.25) * r0, oy + Math.sin(a - 0.25) * r0 * 0.6, ox + Math.cos(a + 0.25) * r1, oy + Math.sin(a + 0.25) * r1 * 0.6, ox + Math.cos(a - 0.25) * r1, oy + Math.sin(a - 0.25) * r1 * 0.6);
      }
      glow(g, TOWER.x, TOWER.y - 178, 24, LAMP, 0.05, 3);
    }
    // The cistern: slow rings, a sodden letter turning, an eel's back.
    if (inView(CISTERN.x + CISTERN.w / 2, CISTERN.y + CISTERN.h / 2, view, 300)) {
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.3 + i / 4) % 1;
        const cx = CISTERN.x + 70 + ((i * 97) % (CISTERN.w - 120)), cy = CISTERN.y + 40 + ((i * 53) % (CISTERN.h - 70));
        g.lineStyle(1.2, CISTERN_LIT, 0.6 * (1 - ph)); g.strokeEllipse(cx, cy, 8 + ph * 40, 3 + ph * 12);
      }
      const ex = CISTERN.x + CISTERN.w / 2 + Math.cos(t * 0.35) * 120, ey = CISTERN.y + CISTERN.h / 2 + Math.sin(t * 0.7) * 40;
      g.lineStyle(3, 0x3a3a44, 0.6); g.lineBetween(ex - 14, ey, ex + 14, ey + Math.sin(t * 3) * 3);
      letter(g, CISTERN.x + 150 + Math.sin(t * 0.2) * 30, CISTERN.y + 90 + Math.cos(t * 0.25) * 12, 1, t * 0.1, true, 0.5);
    }
    // Eyes behind the shutters, blinking — some of them are always watching.
    for (let i = 0; i < peeps.length; i++) {
      const p = peeps[i];
      if (!inView(p.x, p.y, view, 40)) continue;
      const ph = (t * 0.25 + i * 0.37) % 1;
      if (ph < 0.55 && !(ph > 0.3 && ph < 0.33)) { g.fillStyle(0xfff0c0, 0.85); g.fillCircle(p.x - 4, p.y, 0.9); g.fillCircle(p.x + 4, p.y, 0.9); }
    }
    // The Two Cups' sign, swinging.
    if (inView(TAVERN.x + 110, TAVERN.y - 120, view)) twoCupsSign(g, TAVERN.x + 100, TAVERN.y - 120, t * 1.4);
    // Mire gas rising off the shore.
    for (let i = 0; i < 10; i++) {
      const x = 100 + ((i * 233) % 2100), ph = (t * 0.2 + i * 0.31) % 1;
      if (!inView(x, SHORE_Y + 50, view, 60)) continue;
      g.fillStyle(0x6a8a5a, 0.18 * Math.sin(ph * Math.PI)); g.fillCircle(x + Math.sin(t + i) * 8, SHORE_Y + 70 - ph * 50, 6 + ph * 8);
    }
  },

  animateOver(g, t, view) {
    for (const l of lines) if (inView((l.a.x + l.b.x) / 2, (l.a.y + l.b.y) / 2, view, 200)) washLine(g, l.a.x, l.a.y, l.b.x, l.b.y, t, l.seed);
  },
};

export const CLOAK_AREA: AreaDef = {
  id: 'cloak',
  isle: 'slime',
  court: 'cloak',
  name: 'The Cloak Court',
  subtitle: 'Every corner has an ear',
  w: CLOAK_W,
  h: CLOAK_H,
  bg: MIRE,
  accent: CLOAK_COLOR,
  weather: 'drip',
  spawn: { x: 160, y: HUSH_Y },
  painter,
  solids,
  exits: [
    { side: 'w', to: 'fang', label: 'The duckboards west to the Fang Court' },
    { side: 's', to: 'umbral', label: 'The boards south into the Umbral dark' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 240, y: 920 } },
    { kind: 'prince', id: 'whisper', at: { x: HALL.x, y: HALL.y + 50 } },
    { kind: 'water', id: 'cloak-cistern', shape: CISTERN, fishery: 'cloak-cistern' },
    { kind: 'encounter', id: 'cloak-informer' },
    { kind: 'encounter', id: 'cloak-masquerade' },
    { kind: 'encounter', id: 'cloak-dead-drop' },
    { kind: 'encounter', id: 'cloak-poisoned-cup' },
    { kind: 'encounter', id: 'cloak-whisper-gallery' },
    {
      kind: 'sign', at: { x: 320, y: 760 },
      text: 'CLOAK. Speak softly. The horns are for your safety. What you hear, post at the Asp\'s Mouth.',
    },
    {
      kind: 'sign', at: { x: 1150, y: 690 },
      text: 'THE ASP\'S MOUTH. Informations received at all hours. Sealed letters only. The Hall reads every one.',
    },
    {
      kind: 'sign', at: { x: 690, y: 560 },
      text: 'PAY OFFICE. Informations paid in Draught: one dose a name confirmed. No chits honoured after dusk.',
    },
    {
      kind: 'sign', at: { x: 1640, y: 580 },
      text: 'THE HALL OF LETTERS. The named are posted at first bell. Read the wall. Know your neighbours.',
    },
    {
      kind: 'sign', at: { x: 1640, y: 1390 },
      text: 'THE LETTER CISTERN. Do not drop correspondence in the water. (Correspondence for the Hall excepted.)',
    },
    { kind: 'chest', id: 'cloak-chest-cistern', at: { x: 2150, y: 1400 }, coins: 120 },
    { kind: 'chest', id: 'cloak-chest-hall', at: { x: 2190, y: 600 }, orbs: 2, open: { prince: 'whisper' } },
  ],
  npcs: CLOAK_NPCS,
  crowd: CLOAK_CROWD,
};
