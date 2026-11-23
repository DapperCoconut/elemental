import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { glow, type G } from '../../../../art/IsleArt';
import {
  boltSign, bootSign, chimneySmoke, feltHouse, feltRack, feltStall, fineBox, footprints, fullingMill, hushBell,
  hushWaystone, listeningTrumpet, mereLamp, mereRing, mereWater, millHammer, paddedStreet, planks, quietHouse,
  quietTable, ribbon, ribbonRow, sentryBox, signPost, signSchool, snowbank, snowGround, snowman, snowPine,
  stitchedMouth, wardenLantern, windowGlow, type FeltHouseOpts, type HandShape,
} from './art';
import {
  FELT, FELT_BLUE, FELT_MOSS, FELT_OAT, FELT_PLUM, HUSH, HUSH_COLOR, LAMP, LAMP_GLOW, PLASTER, SILK, SNOW_DEEP,
  SNOW_SHADE, TRODDEN,
} from './palette';
import { HUSH_CROWD, HUSH_NPCS } from './npcs';

/**
 * The Hush Court — the wardens' town of the silence, snowbound and muffled, on the high east
 * terrace between Carillon Quay and the masked canals.
 *
 * Read it from the Carillon road in:
 * • **the West Gate** (west): the Padded Way comes in past a warden's sentry box and the first
 *   fine box, the waystone, and Fleece Hartwell's felt stall — the first thing you buy in Hush is
 *   something to muffle yourself with;
 * • **Lantern Lane** (north-west): a lane of hooded warden lanterns climbing to Cordwain Soft's
 *   bootshop, where the wardens' silent soles are sewn;
 * • **the fulling mill** (south-west): where wool is beaten into felt by hammers that make no
 *   sound, its drying racks hung with every grey in the world;
 * • **Bell Green** (the middle): the clapperless Hush Bell in its frame on a trodden common, the
 *   Quiet Table where the muted eat south of it;
 * • **the Hush Mere** (south-east): still as a mirror, a boardwalk of loose boards along its north
 *   shore, the Ashbys' cottage on the far side;
 * • **the Sign School** (east), where children learn the four permitted hand-shapes;
 * • **the Quiet House** (north-east): Prince Mute's padded hall, its railing tied end to end with
 *   the white ribbons of everyone taken; the north road runs past it to the masked canals.
 *
 * The whole court is banked in shovelled snow. Everything that could make a sound is padded.
 */

export const HUSH_W = 2400;
export const HUSH_H = 1600;

const WEST_Y = 1000;
const NORTH_X = 1500;

/** Bell Green and the Hush Bell in its frame. */
export const GREEN: Pt = { x: 1150, y: 880 };
const GREEN_R = 220;
export const BELL: Pt = { x: 1150, y: 830 };
/** The Hush Mere — the court's fishing water. */
export const MERE_RECT: Rect = { x: 1480, y: 1180, w: 620, h: 250 };
/** The boardwalk along its north shore (Sneak Tiptoe's beat). */
export const BOARDWALK: Rect = { x: 1430, y: 1112, w: 720, h: 48 };
/** The Quiet House — the middle of its front step. */
export const QUIET_HOUSE: Pt = { x: 1960, y: 500 };
/** The Quiet Table (soup kitchen for the muted). */
export const QUIET_TABLE: Pt = { x: 960, y: 1250 };
/** The fulling mill. */
export const MILL: Pt = { x: 520, y: 1420 };
/** The Sign School. */
export const SCHOOL: Pt = { x: 2150, y: 850 };
/** Cordwain Soft's bootshop at the top of Lantern Lane. */
export const BOOTSHOP: Pt = { x: 760, y: 560 };
/** The Ashbys' cottage across the mere. */
export const ASHBY_COTTAGE: Pt = { x: 2260, y: 1110 };

/** Houses whose eaves carry a warden's listening-trumpet (Cordwain's quest takes them down). */
export const TRUMPET_SPOTS: Pt[] = [
  { x: 272, y: 1224 }, { x: 930, y: 650 }, { x: 1520, y: 830 }, { x: 1190, y: 372 },
];

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Lit windows, breathing in `animate`. */
const windows: { x: number; y: number; s: number }[] = [];
/** Chimney tops, smoking in `animateOver`. */
const chimneys: { x: number; y: number; s: number }[] = [];
/** Lantern heads, glowing in `animate`. */
const lanterns: Pt[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

/** A felted house with its footprint, its windows and its chimney registered for animation. */
function house(x: number, y: number, w: number, h: number, o: FeltHouseOpts = {}): void {
  addPiece(x, y, w + 60, h * 1.8 + 60, (g, rng) => feltHouse(g, x, y, w, h, o, rng),
    { kind: 'rect', x: x - w / 2 - 6, y: y - 34, w: w + 12, h: 34 });
  const top = y - h;
  if (o.lit !== false) for (const wx of [x - w / 2 + w * 0.2, x - w / 2 + w * 0.8]) windows.push({ x: wx, y: top + (h - 10) * 0.26 + 9, s: x * 0.01 + wx * 0.003 });
  if (o.chimney !== false) chimneys.push({ x: x + w * 0.24, y: top - h * 0.62 * 0.35 - 40, s: (x % 97) / 97 });
}

function lantern(x: number, y: number): void {
  addPiece(x, y, 50, 100, (g) => wardenLantern(g, x, y), { kind: 'circle', x, y: y - 2, r: 7 });
  lanterns.push({ x: x + 18, y: y - 72 });
}

function post(x: number, y: number, shape: HandShape): void {
  addPiece(x, y, 50, 110, (g, rng) => signPost(g, x, y, shape, rng), { kind: 'circle', x, y: y - 2, r: 6 });
}

// ── Layout ───────────────────────────────────────────────────────────

// The Quiet House and its ribbon railing.
addPiece(QUIET_HOUSE.x, QUIET_HOUSE.y, 620, 360, (g, rng) => quietHouse(g, QUIET_HOUSE.x, QUIET_HOUSE.y, 480, 190, rng),
  { kind: 'rect', x: QUIET_HOUSE.x - 250, y: QUIET_HOUSE.y - 60, w: 500, h: 72 });
lantern(QUIET_HOUSE.x - 300, 560);
lantern(QUIET_HOUSE.x + 300, 560);

// Bell Green: the Hush Bell, lanterns at the four quarters, fine box and posts.
addPiece(BELL.x, BELL.y, 220, 260, (g) => hushBell(g, BELL.x, BELL.y, 1), { kind: 'rect', x: BELL.x - 96, y: BELL.y - 16, w: 192, h: 16 });
for (const [dx, dy] of [[-200, -70], [200, -70], [-200, 110], [200, 110]] as [number, number][]) lantern(GREEN.x + dx, GREEN.y + dy);
addPiece(1330, 1060, 30, 70, (g) => fineBox(g, 1330, 1060), { kind: 'circle', x: 1330, y: 1058, r: 6 });
post(980, 1062, 'palm');
post(1340, 700, 'point');

// The Quiet Table south of the green.
addPiece(QUIET_TABLE.x, QUIET_TABLE.y, 330, 160, (g, rng) => quietTable(g, QUIET_TABLE.x, QUIET_TABLE.y, rng),
  { kind: 'rect', x: QUIET_TABLE.x - 116, y: QUIET_TABLE.y - 36, w: 232, h: 36 });
solids.push({ kind: 'circle', x: QUIET_TABLE.x + 144, y: QUIET_TABLE.y - 12, r: 18 });

// The West Gate: sentry box, fine box, waystone.
addPiece(150, 900, 60, 100, (g) => sentryBox(g, 150, 900), { kind: 'rect', x: 132, y: 884, w: 36, h: 16 });
addPiece(270, 940, 30, 70, (g) => fineBox(g, 270, 940), { kind: 'circle', x: 270, y: 938, r: 6 });
addPiece(230, 1080, 60, 80, (g) => hushWaystone(g, 230, 1080), { kind: 'circle', x: 230, y: 1074, r: 17 });
post(340, 1068, 'bell');

// Fleece's felt stall on the Padded Way.
addPiece(640, 930, 200, 160, (g, rng) => feltStall(g, 640, 930, rng), { kind: 'rect', x: 562, y: 904, w: 156, h: 26 });

// Houses along the Padded Way.
house(200, 1196, 130, 92, { felt: FELT_PLUM, fined: true });
house(380, 1186, 120, 86, { felt: FELT, ribbon: true });
house(840, 1180, 120, 90, { felt: FELT_MOSS });
house(860, 880, 120, 88, { felt: FELT_OAT, fined: true });
// Around the green and up the north road.
house(1000, 620, 130, 94, { felt: FELT_BLUE });
house(1452, 800, 120, 88, { felt: FELT_PLUM, ribbon: true });
house(1260, 340, 130, 92, { felt: FELT, fined: true });
house(1700, 300, 120, 86, { felt: FELT_OAT });
// The north-west: Cordwain's bootshop and the lane above it.
house(BOOTSHOP.x, BOOTSHOP.y, 140, 96, { felt: FELT_MOSS, sign: bootSign });
house(260, 560, 130, 92, { felt: FELT_OAT, ribbon: true });
house(240, 300, 120, 86, { felt: FELT_BLUE, lit: false, chimney: false, fined: true });
house(760, 300, 130, 90, { felt: FELT_PLUM });
// Fleece's own house behind her stall.
house(250, 800, 120, 86, { felt: FELT_PLUM, sign: boltSign });
// The Ashbys' cottage across the mere.
house(ASHBY_COTTAGE.x, ASHBY_COTTAGE.y, 120, 84, { felt: FELT, ribbon: true });
// South of the east street.
house(2300, 1400, 120, 86, { felt: FELT_MOSS });

// The listening-trumpets on the eaves (decor; the quest's spots are in front of these houses).
const TRUMPET_EAVES: [number, number, number][] = [[200 + 72, 1196 - 92 + 4, 1], [1000 - 74, 620 - 94 + 4, -1], [1452 + 68, 800 - 88 + 4, 1], [1260 - 74, 340 - 92 + 4, -1]];
for (const [x, y, d] of TRUMPET_EAVES) addPiece(x, y + 100, 40, 140, (g) => listeningTrumpet(g, x, y, d));

// The Sign School and its yard.
addPiece(SCHOOL.x, SCHOOL.y, 330, 250, (g, rng) => signSchool(g, SCHOOL.x, SCHOOL.y, 260, 110, rng),
  { kind: 'rect', x: SCHOOL.x - 136, y: SCHOOL.y - 34, w: 272, h: 34 });
windows.push({ x: SCHOOL.x - 130 + 52, y: SCHOOL.y - 110 + 35, s: 1.2 }, { x: SCHOOL.x - 130 + 208, y: SCHOOL.y - 110 + 35, s: 2.4 });
chimneys.push({ x: SCHOOL.x + 62, y: SCHOOL.y - 110 - 24 - 40, s: 0.3 });
addPiece(2330, 990, 50, 80, (g) => snowman(g, 2330, 990), { kind: 'circle', x: 2330, y: 984, r: 14 });
post(1960, 870, 'fist');
post(2300, 870, 'point');

// The fulling mill, its racks, and the yard.
addPiece(MILL.x, MILL.y, 360, 240, (g, rng) => fullingMill(g, MILL.x, MILL.y, 300, 120, rng),
  { kind: 'rect', x: MILL.x - 156, y: MILL.y - 44, w: 312, h: 44 });
for (const [x, w] of [[790, 110], [930, 90], [250, 100]] as [number, number][]) {
  const y = x === 250 ? 1330 : 1440;
  addPiece(x, y, w + 30, 100, (g, rng) => feltRack(g, x, y, w, rng), { kind: 'rect', x: x - w / 2 - 4, y: y - 8, w: w + 8, h: 10 });
}

// Lantern Lane, climbing north-west from the Padded Way.
for (const [x, y] of [[360, 930], [395, 800], [560, 690], [380, 640], [520, 500], [420, 420]] as [number, number][]) lantern(x, y);
post(600, 420, 'bell');

// The north road: lanterns and a fine box.
lantern(1420, 560);
lantern(1590, 300);
addPiece(1440, 470, 30, 70, (g) => fineBox(g, 1440, 470), { kind: 'circle', x: 1440, y: 468, r: 6 });

// Lanterns along the east street and the boardwalk.
for (const x of [1600, 1860, 2140]) lantern(x, 1100);
lantern(1700, 960);

// Snow-laden firs in the corners and round the mere.
const PINES: [number, number, number][] = [
  [90, 180, 1.2], [180, 120, 1], [560, 150, 1.1], [980, 140, 1.2], [1120, 200, 0.9], [2000, 140, 1.1], [2150, 200, 1.3],
  [2300, 130, 1], [2320, 330, 1.1], [90, 1500, 1.2], [160, 1420, 0.9], [1300, 1530, 1.1], [1420, 1500, 0.9],
  [2200, 1500, 1.2], [2340, 1250, 1], [1650, 1510, 1], [1900, 1520, 1.2], [720, 1530, 0.9], [2330, 700, 1],
];
for (const [x, y, s] of PINES) addPiece(x, y, 70 * s, 140 * s, (g, rng) => snowPine(g, x, y, s, rng), { kind: 'circle', x, y: y - 6, r: 12 * s });

// The mere keeps you to its shore; the boardwalk runs along the north rim.
solids.push({ kind: 'rect', x: MERE_RECT.x - 10, y: MERE_RECT.y - 8, w: MERE_RECT.w + 20, h: MERE_RECT.h + 22 });

// ── The snowbanks round the court (open at the two roads) ────────────

const GAP = 110;
for (const [x0, x1] of [[0, NORTH_X - GAP], [NORTH_X + GAP, HUSH_W]] as [number, number][]) {
  addPiece((x0 + x1) / 2, 64, x1 - x0, 80, (g, rng) => snowbank(g, x0, 64, x1 - x0, 56, rng), { kind: 'rect', x: x0, y: 0, w: x1 - x0, h: 60 });
}
addPiece(HUSH_W / 2, HUSH_H, HUSH_W, 60, (g, rng) => snowbank(g, 0, HUSH_H, HUSH_W, 34, rng), { kind: 'rect', x: 0, y: HUSH_H - 30, w: HUSH_W, h: 30 });
solids.push({ kind: 'rect', x: 0, y: 0, w: 34, h: WEST_Y - GAP });
solids.push({ kind: 'rect', x: 0, y: WEST_Y + GAP, w: 34, h: HUSH_H - WEST_Y - GAP });
solids.push({ kind: 'rect', x: HUSH_W - 34, y: 0, w: 34, h: HUSH_H });

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 160): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

/** Lit windows reflected in the mere, from the cottage and the boardwalk lamps. */
const MERE_LAMPS: Pt[] = [{ x: 1610, y: 1196 }, { x: 1870, y: 1196 }, { x: 2050, y: 1220 }];

const painter: AreaPainter = {
  ground(g, rng) {
    const W = HUSH_W, H = HUSH_H;
    snowGround(g, { x: 0, y: 0, w: W, h: H }, rng);

    // The banks east and west, seen from above.
    for (const [x0, y0, y1] of [[0, 0, WEST_Y - GAP], [0, WEST_Y + GAP, H], [W - 34, 0, H]] as [number, number, number][]) {
      g.fillStyle(SNOW_DEEP, 1); g.fillRect(x0, y0, 34, y1 - y0);
      g.fillStyle(SNOW_SHADE, 1); g.fillRect(x0 + 4, y0, 26, y1 - y0);
    }

    // Bell Green: a trodden common, a ring of footprints worn round the bell.
    g.fillStyle(SNOW_SHADE, 1); g.fillEllipse(GREEN.x, GREEN.y + 10, GREEN_R * 2 + 30, GREEN_R * 1.3 + 30);
    g.fillStyle(TRODDEN, 1); g.fillEllipse(GREEN.x, GREEN.y + 10, GREEN_R * 2, GREEN_R * 1.3);
    for (let k = 1; k < 5; k++) { g.lineStyle(1, SNOW_DEEP, 0.4); g.strokeEllipse(GREEN.x, GREEN.y + 10, k * 90, k * 58); }
    // A ring of felt laid round the bell frame for the Hours, where the wardens stand.
    g.lineStyle(26, FELT, 0.9); g.strokeEllipse(BELL.x, BELL.y + 10, 300, 140);
    g.lineStyle(1, FELT_OAT, 0.6); g.strokeEllipse(BELL.x, BELL.y + 10, 280, 124); g.strokeEllipse(BELL.x, BELL.y + 10, 320, 156);

    // The streets.
    paddedStreet(g, [{ x: 0, y: WEST_Y }, { x: 700, y: WEST_Y }, { x: 940, y: 950 }], 96, rng);
    paddedStreet(g, [{ x: 1240, y: 690 }, { x: 1400, y: 440 }, { x: NORTH_X, y: 220 }, { x: NORTH_X, y: 0 }], 92, rng, FELT_PLUM);
    paddedStreet(g, [{ x: 1370, y: 905 }, { x: 1800, y: 915 }, { x: 2330, y: 925 }], 90, rng, FELT_BLUE);
    paddedStreet(g, [{ x: 1400, y: 440 }, { x: 1700, y: 560 }, { x: 2240, y: 570 }], 80, rng, FELT_PLUM);
    paddedStreet(g, [{ x: 1150, y: 1030 }, { x: 1150, y: 1330 }, { x: 1090, y: 1440 }], 80, rng, FELT_MOSS);
    // Lantern Lane and the mill track.
    paddedStreet(g, [{ x: 380, y: WEST_Y }, { x: 460, y: 740 }, { x: 470, y: 460 }, { x: 600, y: 330 }], 70, rng, FELT_OAT);
    paddedStreet(g, [{ x: 460, y: 620 }, { x: 760, y: 610 }], 60, rng, FELT_OAT);
    paddedStreet(g, [{ x: 560, y: WEST_Y + 30 }, { x: 600, y: 1300 }, { x: 900, y: 1330 }], 66, rng, FELT_MOSS);
    // The boardwalk lane from the green down to the mere.
    paddedStreet(g, [{ x: 1300, y: 1010 }, { x: 1440, y: 1136 }], 60, rng, FELT);

    // The boardwalk along the mere's north shore, and a little jetty.
    planks(g, BOARDWALK, rng, true, [6, 13, 22, 31, 40]);
    planks(g, { x: 1570, y: 1156, w: 40, h: 50 }, rng, false);

    // The mere.
    mereWater(g, MERE_RECT, rng);

    // The mill yard: trampled, soapy, wool tufts blown into the snow.
    g.fillStyle(TRODDEN, 1); g.fillEllipse(MILL.x + 140, MILL.y - 120, 520, 220);
    for (let i = 0; i < 70; i++) {
      const x = MILL.x - 180 + rng() * 620, y = MILL.y - 220 + rng() * 220;
      g.fillStyle([FELT, FELT_PLUM, FELT_OAT, FELT_MOSS, FELT_BLUE][i % 5], 0.6); g.fillCircle(x, y, 2 + rng() * 2);
    }

    // Before the Quiet House: a swept forecourt, felt laid wall to wall, the prince's mark inlaid.
    g.fillStyle(FELT, 1); g.fillRect(QUIET_HOUSE.x - 240, QUIET_HOUSE.y + 14, 480, 90);
    g.lineStyle(2, FELT_OAT, 0.6); g.strokeRect(QUIET_HOUSE.x - 236, QUIET_HOUSE.y + 18, 472, 82);
    for (let x = QUIET_HOUSE.x - 220; x < QUIET_HOUSE.x + 230; x += 40) { g.lineStyle(1, FELT_OAT, 0.35); g.lineBetween(x, QUIET_HOUSE.y + 20, x + 20, QUIET_HOUSE.y + 98); }
    stitchedMouth(g, QUIET_HOUSE.x, QUIET_HOUSE.y + 60, 30, SILK, 0.8);

    // The Sign School yard: snow trampled in children's rings.
    g.fillStyle(TRODDEN, 0.8); g.fillEllipse(SCHOOL.x + 120, 990, 200, 80);
    for (let k = 0; k < 4; k++) { g.lineStyle(1, SNOW_DEEP, 0.5); g.strokeEllipse(SCHOOL.x + 120, 990, 40 + k * 40, 16 + k * 16); }

    // Footprints everywhere, all the same: felt soles.
    footprints(g, { x: 1000, y: 760 }, { x: 1100, y: 640 }, rng);
    footprints(g, { x: 1700, y: 700 }, { x: 1560, y: 860 }, rng);
    footprints(g, { x: 300, y: 1300 }, { x: 520, y: 1260 }, rng);
    footprints(g, { x: 2050, y: 1000 }, { x: 2240, y: 1080 }, rng);
    footprints(g, { x: 900, y: 420 }, { x: 640, y: 360 }, rng);
    footprints(g, { x: 1820, y: 360 }, { x: 2100, y: 400 }, rng, HUSH);
  },

  pieces,

  animate(g, t, view) {
    for (const w of windows) if (inView(w.x, w.y, view, 80)) windowGlow(g, w.x, w.y, t, w.s);
    for (const l of lanterns) {
      if (!inView(l.x, l.y, view, 120)) continue;
      const k = 0.8 + Math.sin(t * 2.2 + l.x * 0.01) * 0.1;
      glow(g, l.x, l.y + 62, 40, LAMP_GLOW, 0.025 * k, 3);
      g.fillStyle(LAMP, 0.08 * k); g.fillEllipse(l.x, l.y + 74, 70, 22);
    }
    // The mere: one slow ring at a time, and the long still stripes of reflected lamps.
    if (inView(MERE_RECT.x + MERE_RECT.w / 2, MERE_RECT.y + MERE_RECT.h / 2, view, 340)) {
      const ph = (t / 7) % 1, idx = Math.floor(t / 7);
      const rx = MERE_RECT.x + 120 + ((idx * 211) % (MERE_RECT.w - 240)), ry = MERE_RECT.y + 70 + ((idx * 97) % (MERE_RECT.h - 140));
      mereRing(g, rx, ry, ph);
      MERE_LAMPS.forEach((p, i) => mereLamp(g, p.x, p.y, t, i));
    }
    // The fulling hammers, rising and falling without a sound.
    if (inView(MILL.x, MILL.y - 60, view, 260)) {
      const tx = MILL.x - 36;
      for (let i = 0; i < 2; i++) {
        const ph = (t * 0.9 + i * 0.5) % 1;
        millHammer(g, tx - 30 + i * 60, MILL.y, ph < 0.75 ? ph / 0.75 : 1 - (ph - 0.75) / 0.25);
      }
    }
    // The Quiet House's ribbons.
    if (inView(QUIET_HOUSE.x, QUIET_HOUSE.y, view, 320)) {
      ribbonRow(g, QUIET_HOUSE.x - 240, QUIET_HOUSE.x - 64, QUIET_HOUSE.y - 11, t, 1);
      ribbonRow(g, QUIET_HOUSE.x + 66, QUIET_HOUSE.x + 244, QUIET_HOUSE.y - 11, t, 2);
    }
    // A strip of white ribbon tied round the Hush Bell's rope.
    if (inView(BELL.x, BELL.y, view, 200)) ribbon(g, BELL.x + 74, BELL.y - 50, 26, t, 4, SILK, 1, 0.8);
  },

  animateOver(g, t, view) {
    for (const c of chimneys) if (inView(c.x, c.y, view, 120)) chimneySmoke(g, c.x, c.y, t, c.s);
    // Steam off the mill trough.
    if (inView(MILL.x, MILL.y - 100, view, 220)) {
      for (let i = 0; i < 8; i++) {
        const ph = (t * 0.2 + i / 8) % 1;
        g.fillStyle(0xe8eef4, 0.22 * (1 - ph)); g.fillCircle(MILL.x - 100 + i * 18 + Math.sin(t + i) * 6, MILL.y - 40 - ph * 120, 6 + ph * 14);
      }
    }
    // Snow sifting off the Quiet House roof.
    if (inView(QUIET_HOUSE.x, QUIET_HOUSE.y - 200, view, 300)) {
      for (let i = 0; i < 10; i++) {
        const ph = (t * 0.25 + i / 10) % 1;
        g.fillStyle(0xffffff, 0.6 * (1 - ph)); g.fillCircle(QUIET_HOUSE.x - 250 + i * 52 + Math.sin(t * 2 + i) * 5, QUIET_HOUSE.y - 196 + ph * 40, 1.4);
      }
    }
  },
};

export const HUSH_AREA: AreaDef = {
  id: 'hush',
  isle: 'sound',
  court: 'hush',
  name: 'The Hush Court',
  subtitle: 'Between the Hours, every word is noise',
  w: HUSH_W,
  h: HUSH_H,
  bg: 0x8e9aab,
  accent: HUSH_COLOR,
  weather: 'lull',
  spawn: { x: 260, y: 1000 },
  painter,
  solids,
  exits: [
    { side: 'w', to: 'carillon', at: WEST_Y, label: 'Down the Padded Way to Carillon Quay' },
    { side: 'n', to: 'masque', at: NORTH_X, label: 'The north road to the Masquerade Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 230, y: 1110 } },
    { kind: 'prince', id: 'mute', at: { x: QUIET_HOUSE.x, y: QUIET_HOUSE.y + 60 } },
    { kind: 'water', id: 'hush-mere', shape: MERE_RECT, fishery: 'hush-mere' },
    { kind: 'encounter', id: 'hush-quiet-zones' },
    { kind: 'encounter', id: 'hush-muffle' },
    { kind: 'encounter', id: 'hush-clapperless-bell' },
    { kind: 'encounter', id: 'hush-creaking-boards' },
    { kind: 'encounter', id: 'hush-sign-language' },
    {
      kind: 'sign', at: { x: 300, y: 960 },
      text: 'THE HUSH. Between the Hours, speech is noise and noise is fined. Sign, or keep still. — By order of Prince Mute',
    },
    {
      kind: 'sign', at: { x: 1020, y: 1090 },
      text: 'THE FOUR SHAPES: STOP, HOLD, GO, HUSH. No other shape is permitted. A fifth shape is noise.',
    },
    {
      kind: 'sign', at: { x: 1640, y: 610 },
      text: 'THE QUIET HOUSE. Those who are taken are taken gently. Do not tie ribbons here; the wardens tie them.',
    },
    {
      kind: 'sign', at: { x: 1460, y: 1080 },
      text: 'THE HUSH MERE. Fishing permitted. Splashing fined. A fish that is landed loudly is the Prince\'s.',
    },
    { kind: 'chest', id: 'hush-chest-mill', at: { x: 300, y: 1470 }, coins: 140 },
    { kind: 'chest', id: 'hush-chest-quiet-house', at: { x: 2310, y: 600 }, orbs: 2, open: { prince: 'mute' } },
  ],
  npcs: HUSH_NPCS,
  crowd: HUSH_CROWD,
};

