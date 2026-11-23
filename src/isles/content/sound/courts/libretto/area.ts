import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { dim, glow, road, shadow, type G } from '../../../../art/IsleArt';
import {
  bindery, bookStack, censorsOffice, copybookHouse, craneString, dryingLines, fleuron, giantPen, handPress,
  inkwellPond, lanternString, lectern, librettoWaystone, litter, loosePage, millRace, nib, noticeBoard, paperLantern,
  paperMill, pressHall, provingStage, pulpVat, ragCart, redStain, scriptorium, snowyGrass, stall, typeCase,
  typeSetts, waterWheel,
} from './art';
import {
  GILT, GILT_DARK, GLOW, INK, IRON, LIBRETTO_COLOR, OAK_DARK, PAPER, RACE_LIT, RED, RED_DARK, RED_LIT, SETT,
  SETT_DARK, SETT_LIT, SNOW, WELL_SHEEN,
} from './palette';
import { LIBRETTO_CROWD, LIBRETTO_NPCS } from './npcs';

/**
 * The Libretto Court — the copyists' town, west of Carillon Quay on the isle's lower terraces.
 *
 * Read it from the Carillon road in:
 * • **Lantern Street** (east): the road from the Quay comes in past the waystone under strings
 *   of paper lanterns, copybook houses jettied over it on both sides — Wick lights it at dusk;
 * • **the Bindery** (north-east): Prince Folio's hall, built as a great book standing on its
 *   tail, its spine to the street and a red silk bookmark hanging to the step;
 * • **Proof Square** (centre): the brass eagle lectern holding the Book of the Score open at
 *   today's page, the Galley board where the day's verses are posted half-struck, and Odile
 *   Foolscap's stall;
 * • **the North Road**: between the two scriptoria with their tall lit windows, up past the
 *   Proving Stage to the cave-mouth stair to the Cavern Court, origami cranes hung across it;
 * • **the mill yard** (west, over the race): the paper mill and its water-wheel, the pulp vat,
 *   the rag cart and the drying lines;
 * • **the Inkwell** (south-west): the black pond the race runs into, with Gall's ink-house;
 * • **the Censor's Office** (south): soot-dark brick under the giant red pen, with the Press Hall
 *   and its yard of presses east of it.
 */

export const LIBRETTO_W = 2400;
export const LIBRETTO_H = 1600;

/** Proof Square. */
export const SQUARE: Pt = { x: 1200, y: 820 };
const SQUARE_R = 200;
/** The Inkwell pond — its well-head ellipse and the fishing rect. */
export const INKWELL: Pt = { x: 660, y: 1300 };
const WELL_RX = 150, WELL_RY = 80;
export const INKWELL_RECT: Rect = { x: 510, y: 1220, w: 300, h: 160 };
/** The Bindery's front step (Prince Folio). */
export const BINDERY: Pt = { x: 1990, y: 500 };
/** The Censor's Office and its pen. */
export const OFFICE: Pt = { x: 1250, y: 1330 };
export const PEN: Pt = { x: 1470, y: 1385 };
/** The Press Hall and the mill. */
export const PRESS: Pt = { x: 1960, y: 1180 };
export const MILL: Pt = { x: 330, y: 560 };
/** The Galley notice-board in Proof Square. */
export const GALLEY: Pt = { x: 1390, y: 690 };
/** The water-wheel's hub, in the race. */
const WHEEL: Pt = { x: 560, y: 498 };
const RACE: Pt[] = [{ x: 560, y: 0 }, { x: 560, y: 760 }, { x: 575, y: 900 }, { x: 600, y: 1060 }, { x: 640, y: 1220 }];

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Chimneys that smoke in `animateOver`. */
const chimneys: Pt[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid, when?: Piece['when']): void {
  pieces.push({ x, y, w, h, draw, when });
  if (solid) solids.push(solid);
}

/** The red pen, pulled out of its plinth and laid down on the stones once the Prince yields. */
function fallenPen(g: G, x: number, y: number): void {
  // The empty plinth, the hole where the nib went in, the old pool dried brown.
  g.fillStyle(RED_DARK, 0.5); g.fillEllipse(x + 8, y + 4, 92, 22);
  g.fillStyle(SETT_DARK, 1); g.fillRect(x - 40, y - 18, 80, 18);
  g.fillStyle(SETT, 1); g.fillRect(x - 38, y - 22, 76, 14);
  g.fillStyle(0x1a1414, 1); g.fillEllipse(x, y - 16, 22, 6);
  // The pen lying along the street, its nib turned up, a child's chalk flowers round it.
  shadow(g, x + 120, y + 30, 230, 18, 0.3);
  g.lineStyle(26, RED_DARK, 1); g.lineBetween(x + 40, y + 26, x + 230, y + 30);
  g.lineStyle(20, RED, 1); g.lineBetween(x + 40, y + 24, x + 230, y + 28);
  g.lineStyle(5, RED_LIT, 0.5); g.lineBetween(x + 44, y + 18, x + 226, y + 22);
  for (const bx of [110, 170]) { g.fillStyle(GILT, 1); g.fillRect(x + bx, y + 12, 6, 26); }
  g.fillStyle(GILT_DARK, 1); g.fillRect(x + 30, y + 12, 12, 26);
  nib(g, x - 2, y + 22, 40, Math.PI, PAPER);
  for (let i = 0; i < 6; i++) {
    const fx = x + 60 + i * 30, fy = y + (i % 2 ? 52 : 0);
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; g.fillStyle([0xf0c040, 0x9ab8e8, 0xf0a0b0][i % 3], 0.85); g.fillCircle(fx + Math.cos(a) * 4, fy + Math.sin(a) * 4, 2.4); }
    g.fillStyle(0xfff0c0, 1); g.fillCircle(fx, fy, 1.6);
  }
}

// ── Layout ───────────────────────────────────────────────────────────

// The two scriptoria flanking the North Road.
for (const x of [880, 1520]) {
  addPiece(x, 470, 420, 340, (g, rng) => scriptorium(g, x, 470, 380, 130, rng), { kind: 'rect', x: x - 190, y: 440, w: 380, h: 32 });
}

// Prince Folio's Bindery.
addPiece(BINDERY.x, BINDERY.y, 520, 420, (g, rng) => bindery(g, BINDERY.x, BINDERY.y, 460, 290, rng),
  { kind: 'rect', x: BINDERY.x - 220, y: BINDERY.y - 40, w: 440, h: 40 });
for (const [x, y, n] of [[1730, 548, 6], [2250, 540, 5], [2280, 556, 3]] as [number, number, number][]) {
  addPiece(x, y, 50, 60, (g, rng) => bookStack(g, x, y, n, rng), { kind: 'circle', x, y: y - 6, r: 16 });
}

// The paper mill, the vat, the rag cart and the drying lines over the race.
addPiece(MILL.x, MILL.y, 360, 400, (g, rng) => paperMill(g, MILL.x, MILL.y, 300, 210, rng), { kind: 'rect', x: MILL.x - 155, y: MILL.y - 36, w: 310, h: 36 });
chimneys.push({ x: MILL.x + 300 * 0.18 + 8, y: MILL.y - 210 - 210 * 0.55 + 20 });
addPiece(260, 745, 90, 60, (g) => pulpVat(g, 260, 745), { kind: 'circle', x: 260, y: 731, r: 32 });
addPiece(190, 690, 100, 60, (g, rng) => ragCart(g, 190, 690, rng), { kind: 'rect', x: 158, y: 672, w: 66, h: 18 });
for (const y of [880, 1010]) {
  addPiece(300, y, 240, 90, (g, rng) => dryingLines(g, 300, y, 220, rng));
  solids.push({ kind: 'circle', x: 190, y: y - 2, r: 6 }, { kind: 'circle', x: 410, y: y - 2, r: 6 });
}

// The race's bridge parapets where West Street crosses.
for (const y of [758, 866]) {
  addPiece(565, y, 130, 30, (g) => {
    g.fillStyle(SETT_DARK, 1); g.fillRect(505, y - 14, 120, 14);
    g.fillStyle(SETT, 1); g.fillRect(505, y - 16, 120, 8);
    g.fillStyle(SETT_LIT, 1); g.fillRect(505, y - 16, 120, 2);
    g.fillStyle(SNOW, 0.7); g.fillRect(510, y - 18, 110, 2);
  }, { kind: 'rect', x: 505, y: y - 10, w: 120, h: 10 });
}
// The race itself is water: walls of it, the bridge between.
solids.push(
  { kind: 'rect', x: 528, y: 50, w: 64, h: 700 },
  { kind: 'rect', x: 540, y: 872, w: 72, h: 190 },
  { kind: 'rect', x: 572, y: 1056, w: 84, h: 182 },
);

// The Inkwell (its stone rim is the bank) and Gall's ink-house beside it.
solids.push({ kind: 'rect', x: INKWELL.x - WELL_RX + 14, y: INKWELL.y - WELL_RY + 16, w: WELL_RX * 2 - 28, h: WELL_RY * 2 - 30 });
addPiece(950, 1300, 160, 260, (g, rng) => copybookHouse(g, 950, 1300, 130, 110, rng, { sign: 'ink', wall: 0xd8d0c0 }), { kind: 'rect', x: 885, y: 1274, w: 130, h: 26 });
chimneys.push({ x: 950 + 142 * 0.28, y: 1300 - 10 - 110 - 20 - 110 * 0.62 * 0.42 });

// The Censor's Office and the red pen (laid down once the Prince yields).
addPiece(OFFICE.x, OFFICE.y, 380, 320, (g, rng) => censorsOffice(g, OFFICE.x, OFFICE.y, 340, 170, rng), { kind: 'rect', x: OFFICE.x - 165, y: OFFICE.y - 30, w: 330, h: 30 });
chimneys.push({ x: OFFICE.x - 170 + 340 * 0.7, y: OFFICE.y - 170 - 70 });
addPiece(PEN.x, PEN.y, 160, 300, (g) => giantPen(g, PEN.x, PEN.y, 250), { kind: 'circle', x: PEN.x, y: PEN.y - 10, r: 36 }, { not: { prince: 'folio' } });
addPiece(PEN.x, PEN.y, 520, 120, (g) => fallenPen(g, PEN.x, PEN.y), undefined, { prince: 'folio' });

// The Press Hall and its yard.
addPiece(PRESS.x, PRESS.y, 460, 320, (g, rng) => pressHall(g, PRESS.x, PRESS.y, 420, 150, rng), { kind: 'rect', x: PRESS.x - 212, y: PRESS.y - 30, w: 424, h: 30 });
chimneys.push({ x: PRESS.x + 210 - 40, y: PRESS.y - 150 - 8 - 150 * 0.45 - 74 });
for (const x of [1820, 2110]) addPiece(x, 1305, 110, 100, (g, rng) => handPress(g, x, 1305, 0.8, rng), { kind: 'rect', x: x - 34, y: 1290, w: 68, h: 14 });
addPiece(1965, 1300, 70, 70, (g, rng) => typeCase(g, 1965, 1300, rng), { kind: 'circle', x: 1965, y: 1290, r: 24 });

// Proof Square: the lectern, the Galley, Foolscap's stall.
addPiece(SQUARE.x, SQUARE.y + 8, 110, 140, (g, rng) => lectern(g, SQUARE.x, SQUARE.y + 8, 1, rng), { kind: 'circle', x: SQUARE.x, y: SQUARE.y, r: 30 });
addPiece(GALLEY.x, GALLEY.y, 140, 120, (g, rng) => noticeBoard(g, GALLEY.x, GALLEY.y, rng));
solids.push({ kind: 'rect', x: GALLEY.x - 50, y: GALLEY.y - 6, w: 12, h: 8 }, { kind: 'rect', x: GALLEY.x + 40, y: GALLEY.y - 6, w: 12, h: 8 });
addPiece(1020, 980, 140, 100, (g, rng) => stall(g, 1020, 980, rng, RED), { kind: 'rect', x: 966, y: 950, w: 108, h: 30 });

// The Proving Stage below the west scriptorium.
addPiece(820, 650, 260, 170, (g, rng) => provingStage(g, 820, 650, 240, rng), { kind: 'rect', x: 702, y: 622, w: 236, h: 28 });

// The waystone at the Carillon road.
addPiece(2180, 900, 70, 100, (g) => librettoWaystone(g, 2180, 900), { kind: 'circle', x: 2180, y: 892, r: 20 });

// Copybook houses along Lantern Street, the North Road and the lanes.
const HOUSES: [number, number, number, number, 'quill' | 'ream' | 'ink' | 'none'][] = [
  [1610, 705, 130, 120, 'quill'], [2290, 700, 140, 120, 'ream'],
  [1650, 1030, 140, 120, 'none'], [2280, 1040, 150, 130, 'quill'],
  [180, 1460, 150, 130, 'none'], [380, 1545, 120, 110, 'ream'],
  [900, 165, 150, 120, 'quill'], [1560, 160, 140, 120, 'none'],
  [1650, 1500, 140, 120, 'ream'], [2250, 1505, 150, 120, 'none'],
];
for (const [x, y, w, h, sign] of HOUSES) {
  addPiece(x, y, w + 60, h * 2.4, (g, rng) => copybookHouse(g, x, y, w, h, rng, { sign, snow: (x + y) % 3 === 0 }), { kind: 'rect', x: x - w / 2, y: y - 26, w, h: 26 });
  chimneys.push({ x: x + (w + 12) * 0.28, y: y - 10 - h - h * 0.62 * 0.42 - 26 });
}

// Lantern-string posts along Lantern Street.
const STRINGS: [Pt, Pt][] = [];
for (const x of [1420, 1640, 1860, 2080]) {
  const a = { x, y: 735 }, b = { x: x + 70, y: 902 };
  STRINGS.push([{ x: a.x, y: a.y - 92 }, { x: b.x, y: b.y - 92 }]);
  for (const p of [a, b]) {
    addPiece(p.x, p.y, 20, 110, (g) => {
      g.fillStyle(0x000000, 0.2); g.fillEllipse(p.x, p.y + 1, 16, 5);
      g.fillStyle(OAK_DARK, 1); g.fillRect(p.x - 3, p.y - 94, 6, 94);
      g.fillStyle(IRON, 1); g.fillRect(p.x - 5, p.y - 96, 10, 4);
    }, { kind: 'circle', x: p.x, y: p.y - 2, r: 6 });
  }
}
// Crane strings across the North Road between the scriptoria.
const CRANE_LINES: [Pt, Pt][] = [[{ x: 1070, y: 300 }, { x: 1330, y: 300 }], [{ x: 1070, y: 560 }, { x: 1330, y: 560 }]];

// ── Painter ──────────────────────────────────────────────────────────

const inView = (v: Rect, x: number, y: number, pad = 200) => x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

const painter: AreaPainter = {
  ground(g, rng) {
    snowyGrass(g, 0, 0, LIBRETTO_W, LIBRETTO_H, rng);
    // The terrace's retaining wall along the north edge, broken by the cave-mouth stair.
    for (const [x0, x1] of [[0, 520], [600, 1100], [1300, LIBRETTO_W]]) {
      g.fillStyle(SETT_DARK, 1); g.fillRect(x0, 0, x1 - x0, 54);
      for (let y = 2; y < 50; y += 12) for (let x = x0 + ((y / 12) % 2) * 12; x < x1; x += 24) { g.fillStyle(rng() < 0.5 ? SETT : SETT_LIT, 1); g.fillRect(x + 1, y, 22, 10); }
      g.fillStyle(SNOW, 0.85); g.fillRect(x0, 0, x1 - x0, 6);
      g.fillStyle(0x000000, 0.18); g.fillRect(x0, 54, x1 - x0, 8);
    }
    for (let k = 0; k < 7; k++) { g.fillStyle(k % 2 ? SETT : SETT_LIT, 1); g.fillRect(1110, k * 9, 180, 8); }
    // Streets: setts laid in rows like lines of type.
    typeSetts(g, 1130, 0, 140, SQUARE.y, rng);
    typeSetts(g, 1300, 755, LIBRETTO_W - 1300, 110, rng);
    typeSetts(g, 0, 765, 1060, 95, rng);
    typeSetts(g, 1150, 980, 100, 470, rng);
    road(g, [{ x: 1500, y: 860 }, { x: 1780, y: 1000 }, { x: 1960, y: 1190 }], 80, SETT, SETT_DARK, SETT_LIT, rng);
    road(g, [{ x: 1840, y: 800 }, { x: 1990, y: 650 }, { x: 1990, y: 520 }], 80, SETT, SETT_DARK, SETT_LIT, rng);
    road(g, [{ x: 760, y: 860 }, { x: 760, y: 1140 }, { x: 880, y: 1240 }, { x: 1150, y: 1380 }], 70, SETT, SETT_DARK, SETT_LIT, rng);
    road(g, [{ x: 450, y: 780 }, { x: 420, y: 620 }, { x: 330, y: 580 }], 70, SETT, SETT_DARK, SETT_LIT, rng);
    road(g, [{ x: 1000, y: 470 }, { x: 1040, y: 640 }, { x: 1100, y: 780 }], 60, SETT, SETT_DARK, SETT_LIT, rng);
    road(g, [{ x: 1250, y: 1420 }, { x: 1700, y: 1430 }, { x: 2300, y: 1420 }], 70, SETT, SETT_DARK, SETT_LIT, rng);
    // The mill yard: beaten earth, scraps of rag.
    g.fillStyle(0x6a6050, 0.6); g.fillEllipse(320, 820, 420, 420);
    for (let i = 0; i < 30; i++) { g.fillStyle([RED, 0x4a6a9a, PAPER, 0x6a8a4a][i % 4], 0.35); g.fillEllipse(140 + rng() * 360, 620 + rng() * 420, 6, 3); }
    // Proof Square: big flags in rings round the lectern, a brass fleuron rose let into them.
    g.fillStyle(SETT_DARK, 1); g.fillCircle(SQUARE.x, SQUARE.y, SQUARE_R + 6);
    g.fillStyle(SETT_LIT, 1); g.fillCircle(SQUARE.x, SQUARE.y, SQUARE_R);
    for (let ring = 1; ring < 5; ring++) {
      const r = ring * 42;
      g.lineStyle(1.5, SETT_DARK, 0.8); g.strokeCircle(SQUARE.x, SQUARE.y, r);
      const n = ring * 8;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ring;
        g.lineBetween(SQUARE.x + Math.cos(a) * (r - 42), SQUARE.y + Math.sin(a) * (r - 42), SQUARE.x + Math.cos(a) * r, SQUARE.y + Math.sin(a) * r);
      }
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.fillStyle(GILT_DARK, 0.6);
      g.fillTriangle(SQUARE.x + Math.cos(a - 0.08) * 60, SQUARE.y + Math.sin(a - 0.08) * 60, SQUARE.x + Math.cos(a + 0.08) * 60, SQUARE.y + Math.sin(a + 0.08) * 60, SQUARE.x + Math.cos(a) * 170, SQUARE.y + Math.sin(a) * 170);
      fleuron(g, SQUARE.x + Math.cos(a) * 185, SQUARE.y + Math.sin(a) * 185, 1.2, GILT, 0.7);
    }
    // The mill-race, rag-clouded, down from the mountain into the Inkwell; the bridge deck over it.
    millRace(g, RACE, 46);
    g.fillStyle(SETT_DARK, 1); g.fillRect(505, 758, 120, 108);
    typeSetts(g, 508, 762, 114, 100, rng);
    // The Inkwell, and the ink staining the setts round its rim.
    inkwellPond(g, INKWELL.x, INKWELL.y, WELL_RX, WELL_RY, rng);
    for (let i = 0; i < 14; i++) { const a = rng() * Math.PI * 2; g.fillStyle(INK, 0.18); g.fillEllipse(INKWELL.x + Math.cos(a) * (WELL_RX + 30), INKWELL.y + Math.sin(a) * (WELL_RY + 22), 18, 6); }
    // Red ink weeping from under the pen and down the South Lane gutter.
    redStain(g, PEN.x, PEN.y + 10, 120, rng);
    g.lineStyle(3, RED_DARK, 0.35); g.lineBetween(PEN.x - 40, PEN.y + 20, 1200, 1440);
    // Press yard: ink-black flags.
    g.fillStyle(dim(SETT, 0.35), 0.5); g.fillRect(1760, 1200, 420, 150);
    // Fallen sheets everywhere a copyist walks.
    litter(g, 1130, 100, 140, 600, 14, rng);
    litter(g, 1300, 760, 1000, 100, 22, rng);
    litter(g, 1000, 600, 400, 420, 16, rng);
    litter(g, 1100, 1350, 300, 120, 20, rng);
    litter(g, 120, 760, 400, 400, 16, rng);
  },
  pieces,

  animate(g, t, view) {
    // The water-wheel turning in the race; the race running; the Inkwell's slow sheen.
    if (inView(view, WHEEL.x, WHEEL.y)) {
      waterWheel(g, WHEEL.x, WHEEL.y, 62, t * 0.9);
      for (let i = 0; i < 6; i++) {
        const ph = (t * 1.4 + i / 6) % 1;
        g.fillStyle(RACE_LIT, 0.6 * (1 - ph)); g.fillCircle(WHEEL.x - 40 + i * 16, WHEEL.y + 60 + ph * 20, 3 - ph * 2);
      }
    }
    for (let i = 0; i < 26; i++) {
      const seg = i % (RACE.length - 1);
      const a = RACE[seg], b = RACE[seg + 1];
      const ph = (t * 0.6 + i * 0.173) % 1;
      const x = a.x + (b.x - a.x) * ph + Math.sin(i * 7) * 12, y = a.y + (b.y - a.y) * ph;
      if (!inView(view, x, y, 40)) continue;
      g.fillStyle(PAPER, 0.35); g.fillEllipse(x, y, 8, 4);
    }
    if (inView(view, INKWELL.x, INKWELL.y)) {
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.25 + i / 3) % 1;
        g.lineStyle(1.5, WELL_SHEEN, 0.35 * (1 - ph)); g.strokeEllipse(INKWELL.x - 30 + i * 30, INKWELL.y + (i - 1) * 16, 30 + ph * 120, 10 + ph * 40);
      }
    }
    // The Book of the Score's page lifting in the draught.
    if (inView(view, SQUARE.x, SQUARE.y)) {
      const lift = Math.max(0, Math.sin(t * 0.8)) * 10;
      g.fillStyle(PAPER, 0.9); g.fillTriangle(SQUARE.x + 2, SQUARE.y - 82, SQUARE.x + 30, SQUARE.y - 86 - lift, SQUARE.x + 28, SQUARE.y - 70 - lift * 0.6);
    }
  },

  animateOver(g, t, view, world) {
    const lit = world.test({ monarch: 'cadenza' }) ? 1 : 0.85;
    for (const [a, b] of STRINGS) if (inView(view, (a.x + b.x) / 2, (a.y + b.y) / 2)) lanternString(g, a, b, 5, t, lit, a.x);
    for (const [a, b] of CRANE_LINES) {
      if (!inView(view, (a.x + b.x) / 2, a.y)) continue;
      g.lineStyle(1, 0x3a3028, 0.9); g.lineBetween(a.x, a.y, b.x, b.y);
      for (let x = a.x + 30; x < b.x - 10; x += 40) craneString(g, x, a.y, 3, t, x);
    }
    // Chimney smoke: grey coils leaning with the cave-wind.
    for (const c of chimneys) {
      if (!inView(view, c.x, c.y, 120)) continue;
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.3 + i / 4 + c.x * 0.001) % 1;
        g.fillStyle(0xd8d8dc, 0.28 * (1 - ph)); g.fillCircle(c.x + ph * 40 + Math.sin(t + i) * 4, c.y - ph * 70, 6 + ph * 12);
      }
    }
    // The scriptoria's windows breathing light onto the North Road at night.
    for (const x of [880, 1520]) if (inView(view, x, 470)) glow(g, x, 500, 160, GLOW, 0.02 + Math.sin(t * 0.7 + x) * 0.005, 2);
    // Sheets blowing down the North Road on the cave-wind.
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.12 + i / 6) % 1;
      const x = 1150 + Math.sin(i * 3 + t * 0.7) * 90, y = 60 + ph * 760;
      if (inView(view, x, y, 40)) loosePage(g, x, y, 1, t * 2 + i, (t * 0.5 + i * 0.3) % 1, 0.8 * Math.sin(ph * Math.PI));
    }
    // Lanterns at the Bindery door and the stage footlights flicker.
    if (inView(view, BINDERY.x, BINDERY.y)) {
      for (const k of [-1, 1]) { const f = 0.08 + Math.sin(t * 6 + k) * 0.02; glow(g, BINDERY.x + k * 77, BINDERY.y - 54, 40, GLOW, f, 2); }
    }
    if (inView(view, 820, 640)) { for (const k of [-1, 1]) glow(g, 820 + k * 100, 614, 26, GLOW, 0.06 + Math.sin(t * 5 + k) * 0.02, 2); paperLantern(g, 820, 520, 7, 0.9); }
    // The red pen's slow drip, while it still stands.
    if (!world.test({ prince: 'folio' }) && inView(view, PEN.x, PEN.y)) {
      const ph = (t * 0.7) % 1;
      g.fillStyle(RED, 1 - ph); g.fillCircle(PEN.x + 2, PEN.y - 30 + ph * 26, 3);
    }
  },
};

export const LIBRETTO_AREA: AreaDef = {
  id: 'libretto',
  isle: 'sound',
  court: 'libretto',
  name: 'The Libretto Court',
  subtitle: 'Every word of the Score is written here, and every other word struck out',
  w: LIBRETTO_W,
  h: LIBRETTO_H,
  bg: 0x2a2e36,
  accent: LIBRETTO_COLOR,
  weather: 'pages',
  spawn: { x: 2270, y: 810 },
  painter,
  solids,
  exits: [
    { side: 'e', to: 'carillon', label: 'Lantern Street down to Carillon Quay' },
    { side: 'n', to: 'cavern', label: 'The cave-mouth stair up to the Cavern Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 2180, y: 932 } },
    { kind: 'prince', id: 'folio', at: { x: BINDERY.x, y: BINDERY.y + 50 } },
    { kind: 'water', id: 'libretto-inkwell', shape: INKWELL_RECT, fishery: 'libretto-inkwell' },
    { kind: 'encounter', id: 'libretto-lanterns' },
    { kind: 'encounter', id: 'libretto-prompter' },
    { kind: 'encounter', id: 'libretto-origami' },
    { kind: 'encounter', id: 'libretto-redacted' },
    { kind: 'encounter', id: 'libretto-folio-storm' },
    {
      kind: 'sign', at: { x: 2080, y: 940 },
      text: 'THE LIBRETTO COURT. Every word for singing is written here. Unwritten words are noise. Noise is fined.',
    },
    {
      kind: 'sign', at: { x: 1290, y: 1040 },
      text: 'THE CENSOR\'S OFFICE. Submit all writing for proof before the Hour. Struck words are not to be repeated.',
    },
    {
      kind: 'sign', at: { x: 640, y: 1110 },
      text: 'THE INKWELL. Ink is rationed by the Office. Fish taken from the Well are taken for their ink.',
    },
    {
      kind: 'sign', at: { x: 1300, y: 120 },
      text: 'TO THE CAVERN COURT. Letters for the mountain are not carried. The caves keep their own Score.',
    },
    { kind: 'chest', id: 'libretto-chest-press', at: { x: 2330, y: 1300 }, coins: 120 },
    { kind: 'chest', id: 'libretto-chest-bindery', at: { x: 2300, y: 470 }, orbs: 2, open: { prince: 'folio' } },
  ],
  npcs: LIBRETTO_NPCS,
  crowd: LIBRETTO_CROWD,
};

