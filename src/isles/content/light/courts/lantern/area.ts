import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { flagstones, glow, groundFill, road, type G } from '../../../../art/IsleArt';
import {
  boatLanding, capstan, cliffBand, cliffStrip, columbarium, featherScale, frameStack, ladder, lakeBed, lampStandard,
  lanternShop, lanternTree, lanternWaystone, lightPool, mourningHouse, paperBoat, seanceParlour, shadeRack, soulLantern,
  soulWisp, waxDrips, wickYard, wirePost, wireSpan,
} from './art';
import {
  BRASS, CREPE, ECTO, FLAG, FLAG_GROUT, LAKE_LIT, LANTERN_COLOR, LIME, LIME_DARK, LIME_LIT, SOUL, SOUL_LIT, WAX,
} from './palette';
import { LANTERN_CROWD, LANTERN_NPCS } from './npcs';

/**
 * The Lantern Court — the town of caught souls, down in a white limestone gorge west of the Noon.
 *
 * Read it from the Noon road in (east) to the lake (west):
 * • **the Lantern Stair** (east): the road drops into the gorge past the waystone onto **Lantern
 *   Row**, the lantern-makers' street — glass shopfronts racked with frames, shades drying on lines;
 * • **Wick Square** in the middle, round the iron lantern-tree where families tie white ribbons for
 *   the newly hung — the south road leaves it for the Mural Court, the north road climbs to
 *   **the Columbarium of Lights**, Prince Wisp's hall of ten thousand niches;
 * • **the Thread-walk** (north-east): the binders' wire capstan, paying new wire up to the rim;
 * • **the Wick Yard** and **the Mourning House** (south-east): Chandler Snuff's vats, and the long
 *   white hall where the bereaved sit up behind shutters nailed open;
 * • **the Lantern Lake** (west): still dark water, paper boats carrying lanterns across, the landing
 *   on its east shore; the Feather Scale on the ledge above it and Séance's glass parlour below;
 * • over all of it, **the wires**: fourteen spans from the north rim to the south, numbered on brass
 *   plates at their south posts, every one hung with lanterns, every lantern a person.
 */

export const LANTERN_W = 2400;
export const LANTERN_H = 1600;

/** The rim cliffs: the walkable floor of the gorge lies between them. */
const NORTH_RIM = 150;
const SOUTH_RIM = 1500;
const WEST_RIM = 90;
const EAST_RIM = 2330;
const ROAD_Y = 800;
const SOUTH_GAP: [number, number] = [1080, 1320];
const EAST_GAP: [number, number] = [690, 910];

/** The Lantern Lake — the court's fishing water. */
export const LAKE: Rect = { x: 300, y: 620, w: 640, h: 360 };
/** Wick Square: the lantern-tree at its heart. */
export const SQUARE: Pt = { x: 1450, y: 820 };
const SQUARE_R = 130;
/** Prince Wisp's Columbarium of Lights: the middle of its front step. */
export const COLUMBARIUM: Pt = { x: 1150, y: 330 };
/** The Mourning House. */
export const MOURNING: Pt = { x: 1660, y: 1300 };
/** The Wick Yard. */
export const WICK_YARD: Pt = { x: 2050, y: 1260 };
/** The Thread-walk capstan. */
export const CAPSTAN: Pt = { x: 1900, y: 420 };
/** The Feather Scale on the ledge. */
export const SCALE: Pt = { x: 560, y: 330 };
/** Séance's parlour. */
export const PARLOUR: Pt = { x: 560, y: 1260 };
/** The paper-boat landing on the east shore of the lake. */
export const LANDING: Pt = { x: 1010, y: 840 };
/** The wires: x of each span (1-based numbering west to east), and where their south posts stand. */
export const WIRE_X: number[] = Array.from({ length: 14 }, (_, i) => 200 + i * 160);
export const WIRE_POST_Y = 1494;
/** Where you stand to read a wire's plate. */
export const wireFoot = (n: number): Pt => ({ x: WIRE_X[n - 1], y: 1440 });

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

// ── The rims ─────────────────────────────────────────────────────────

solids.push({ kind: 'rect', x: 0, y: 0, w: LANTERN_W, h: NORTH_RIM });
solids.push({ kind: 'rect', x: 0, y: 0, w: WEST_RIM, h: LANTERN_H });
solids.push({ kind: 'rect', x: 0, y: SOUTH_RIM, w: SOUTH_GAP[0], h: LANTERN_H - SOUTH_RIM });
solids.push({ kind: 'rect', x: SOUTH_GAP[1], y: SOUTH_RIM, w: LANTERN_W - SOUTH_GAP[1], h: LANTERN_H - SOUTH_RIM });
solids.push({ kind: 'rect', x: EAST_RIM, y: 0, w: LANTERN_W - EAST_RIM, h: EAST_GAP[0] });
solids.push({ kind: 'rect', x: EAST_RIM, y: EAST_GAP[1], w: LANTERN_W - EAST_RIM, h: LANTERN_H - EAST_GAP[1] });

// ── Layout ───────────────────────────────────────────────────────────

// The Columbarium of Lights, and the lamp-standards flanking its forecourt.
addPiece(COLUMBARIUM.x, COLUMBARIUM.y, 620, 340, (g, rng) => columbarium(g, COLUMBARIUM.x, COLUMBARIUM.y, 520, 230, rng),
  { kind: 'rect', x: COLUMBARIUM.x - 270, y: COLUMBARIUM.y - 40, w: 540, h: 40 });
for (const x of [840, 1460]) addPiece(x, 420, 80, 150, (g) => lampStandard(g, x, 420, 120), { kind: 'circle', x, y: 416, r: 9 });

// Wick Square: the lantern-tree, and a wick-keeper's ladder against the standard on the north road.
addPiece(SQUARE.x, SQUARE.y - 10, 160, 200, (g) => lanternTree(g, SQUARE.x, SQUARE.y - 10), { kind: 'circle', x: SQUARE.x, y: SQUARE.y - 14, r: 30 });
addPiece(1350, 560, 90, 160, (g) => { lampStandard(g, 1350, 560, 130); ladder(g, 1372, 562, 118, -14); }, { kind: 'circle', x: 1350, y: 556, r: 10 });

// Lantern Row: shops north and south of the Noon road.
const NORTH_SHOPS: [number, number, number][] = [[1700, 0xd8505e, 150], [1900, 0x6a9fd8, 170], [2110, 0xe8b048, 150]];
for (const [x, tint, h] of NORTH_SHOPS) {
  addPiece(x, 720, 210, h + 40, (g, rng) => lanternShop(g, x, 720, 170, h, tint, rng), { kind: 'rect', x: x - 86, y: 690, w: 172, h: 30 });
}
const SOUTH_SHOPS: [number, number, number][] = [[1700, 0x8a6ac8, 130], [1880, 0x58b0a0, 140], [2200, 0xd87a48, 130]];
for (const [x, tint, h] of SOUTH_SHOPS) {
  addPiece(x, 1010, 210, h + 40, (g, rng) => lanternShop(g, x, 1010, 170, h, tint, rng), { kind: 'rect', x: x - 86, y: 980, w: 172, h: 30 });
}
for (const [x, y] of [[1600, 732], [2010, 1018], [2245, 700]] as [number, number][]) {
  addPiece(x, y, 60, 50, (g, rng) => frameStack(g, x, y, rng), { kind: 'circle', x: x + 6, y: y - 6, r: 14 });
}
addPiece(1795, 1030, 70, 50, (g) => shadeRack(g, 1795, 1030, 0xd8505e));
addPiece(2010, 735, 70, 50, (g) => shadeRack(g, 2010, 735, 0x6a9fd8));

// The waystone at the top of the Lantern Stair.
addPiece(2200, 880, 50, 80, (g) => lanternWaystone(g, 2200, 880), { kind: 'circle', x: 2200, y: 874, r: 15 });

// The Thread-walk capstan.
addPiece(CAPSTAN.x, CAPSTAN.y, 160, 320, (g) => capstan(g, CAPSTAN.x, CAPSTAN.y), { kind: 'circle', x: CAPSTAN.x, y: CAPSTAN.y - 10, r: 44 });

// The Wick Yard and the Mourning House.
addPiece(WICK_YARD.x, WICK_YARD.y, 240, 150, (g, rng) => wickYard(g, WICK_YARD.x, WICK_YARD.y, 200, rng),
  { kind: 'rect', x: WICK_YARD.x - 100, y: WICK_YARD.y - 30, w: 200, h: 30 });
addPiece(MOURNING.x, MOURNING.y, 280, 150, (g, rng) => mourningHouse(g, MOURNING.x, MOURNING.y, 240, 96, rng),
  { kind: 'rect', x: MOURNING.x - 120, y: MOURNING.y - 30, w: 240, h: 30 });

// West of the square: the landing, the scale, the parlour.
addPiece(LANDING.x, LANDING.y, 120, 70, (g) => boatLanding(g, LANDING.x, LANDING.y), { kind: 'rect', x: LANDING.x - 40, y: LANDING.y - 24, w: 80, h: 20 });
addPiece(SCALE.x, SCALE.y, 240, 260, (g) => featherScale(g, SCALE.x, SCALE.y, 1), { kind: 'rect', x: SCALE.x - 60, y: SCALE.y - 22, w: 120, h: 22 });
addPiece(PARLOUR.x, PARLOUR.y, 220, 200, (g) => seanceParlour(g, PARLOUR.x, PARLOUR.y, 200, 120), { kind: 'rect', x: PARLOUR.x - 100, y: PARLOUR.y - 30, w: 200, h: 30 });

// Lamp-standards along the lanes, each with its wax drips in the ground.
const STANDARDS: Pt[] = [{ x: 1040, y: 1100 }, { x: 760, y: 520 }, { x: 1560, y: 1180 }, { x: 2180, y: 560 }, { x: 260, y: 1180 }];
for (const p of STANDARDS) addPiece(p.x, p.y, 80, 150, (g) => lampStandard(g, p.x, p.y, 112), { kind: 'circle', x: p.x, y: p.y - 4, r: 9 });

// The wire posts on the south lip (the wires' feet), out of the way on the rim.
for (let i = 0; i < WIRE_X.length; i++) {
  const x = WIRE_X[i];
  if (x > SOUTH_GAP[0] - 10 && x < SOUTH_GAP[1] + 10) continue;
  addPiece(x, WIRE_POST_Y, 30, 70, (g) => wirePost(g, x, WIRE_POST_Y, i + 1));
}

// The lake: keep to the kerb.
solids.push({ kind: 'rect', x: LAKE.x - 12, y: LAKE.y - 12, w: LAKE.w + 24, h: LAKE.h + 24 });

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 160): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

/** Paper boats crossing the lake: each its own lane and speed; positions are a function of time. */
const BOATS = [
  { y: 690, speed: 18, phase: 0.1, dir: 1 }, { y: 760, speed: 13, phase: 0.55, dir: -1 }, { y: 830, speed: 16, phase: 0.3, dir: 1 },
  { y: 900, speed: 11, phase: 0.8, dir: -1 }, { y: 940, speed: 15, phase: 0.05, dir: 1 },
];

/** Shop windows that flicker as lanterns are tested inside. */
const WINDOWS: Pt[] = [...NORTH_SHOPS.map(([x]) => ({ x, y: 690 })), ...SOUTH_SHOPS.map(([x]) => ({ x, y: 980 }))];

const painter: AreaPainter = {
  ground(g, rng) {
    const W = LANTERN_W, H = LANTERN_H;
    // The gorge floor: pale limestone with grit.
    groundFill(g, { x: 0, y: 0, w: W, h: H }, LIME, LIME_LIT, LIME_DARK, rng, 1.2);
    // The rims.
    cliffBand(g, 0, 0, W, NORTH_RIM, rng);
    cliffStrip(g, 0, NORTH_RIM, WEST_RIM, H - NORTH_RIM, rng, true);
    cliffStrip(g, EAST_RIM, NORTH_RIM, W - EAST_RIM, EAST_GAP[0] - NORTH_RIM, rng, false);
    cliffStrip(g, EAST_RIM, EAST_GAP[1], W - EAST_RIM, H - EAST_GAP[1], rng, false);
    for (const [x0, x1] of [[0, SOUTH_GAP[0]], [SOUTH_GAP[1], W]] as [number, number][]) {
      g.fillStyle(LIME_DARK, 1); g.fillRect(x0, SOUTH_RIM, x1 - x0, H - SOUTH_RIM);
      g.fillStyle(LIME_LIT, 1); g.fillRect(x0, SOUTH_RIM, x1 - x0, 6);
      for (let i = 0; i < (x1 - x0) / 16; i++) { g.fillStyle(rng() < 0.5 ? LIME : 0xb0a589, 1); g.fillCircle(x0 + rng() * (x1 - x0), SOUTH_RIM + 10 + rng() * 80, 2 + rng() * 3); }
    }

    // The lanes.
    const lane = (pts: Pt[], w: number) => road(g, pts, w, FLAG, FLAG_GROUT, LIME_LIT, rng);
    lane([{ x: W, y: ROAD_Y }, { x: SQUARE.x + 60, y: ROAD_Y + 10 }], 96);
    lane([{ x: SQUARE.x - 60, y: ROAD_Y + 10 }, { x: LANDING.x + 40, y: ROAD_Y }], 84);
    lane([{ x: SQUARE.x - 30, y: SQUARE.y + 80 }, { x: 1300, y: 1150 }, { x: 1200, y: H }], 90);
    lane([{ x: SQUARE.x - 40, y: SQUARE.y - 80 }, { x: 1250, y: 560 }, { x: COLUMBARIUM.x, y: COLUMBARIUM.y + 40 }], 80);
    lane([{ x: SQUARE.x + 50, y: SQUARE.y - 80 }, { x: 1700, y: 560 }, { x: CAPSTAN.x, y: CAPSTAN.y + 60 }], 60);
    lane([{ x: 2040, y: ROAD_Y + 40 }, { x: 2040, y: WICK_YARD.y + 70 }], 58);
    lane([{ x: 1300, y: 1150 }, { x: MOURNING.x - 40, y: MOURNING.y + 50 }, { x: WICK_YARD.x, y: WICK_YARD.y + 70 }], 54);
    lane([{ x: LANDING.x + 10, y: ROAD_Y + 60 }, { x: 1010, y: 1060 }, { x: 640, y: 1100 }, { x: PARLOUR.x, y: PARLOUR.y + 60 }], 56);
    lane([{ x: LANDING.x + 10, y: ROAD_Y - 60 }, { x: 1000, y: 580 }, { x: 640, y: 470 }, { x: SCALE.x, y: SCALE.y + 70 }], 56);
    lane([{ x: 160, y: 1440 }, { x: 1080, y: 1440 }], 46);
    lane([{ x: 1320, y: 1440 }, { x: 2280, y: 1440 }], 46);
    lane([{ x: 640, y: 1100 }, { x: 260, y: 1220 }, { x: 160, y: 1440 }], 46);

    // Wick Square: a disc of white flags round the tree.
    g.fillStyle(FLAG_GROUT, 1); g.fillEllipse(SQUARE.x, SQUARE.y, SQUARE_R * 2 + 14, SQUARE_R * 1.5 + 14);
    g.fillStyle(FLAG, 1); g.fillEllipse(SQUARE.x, SQUARE.y, SQUARE_R * 2, SQUARE_R * 1.5);
    for (let k = 1; k < 5; k++) { g.lineStyle(1, FLAG_GROUT, 0.6); g.strokeEllipse(SQUARE.x, SQUARE.y, k * 52, k * 39); }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.lineStyle(1, FLAG_GROUT, 0.6);
      g.lineBetween(SQUARE.x + Math.cos(a) * 30, SQUARE.y + Math.sin(a) * 22, SQUARE.x + Math.cos(a) * SQUARE_R, SQUARE.y + Math.sin(a) * SQUARE_R * 0.75);
    }
    // A ring of blue glass let into the square, in memory of the hung.
    g.lineStyle(4, SOUL, 0.5); g.strokeEllipse(SQUARE.x, SQUARE.y, 170, 124);

    // The Columbarium forecourt: big squared flags.
    flagstones(g, { x: COLUMBARIUM.x - 300, y: COLUMBARIUM.y - 10, w: 600, h: 130 }, 30, LIME_LIT, FLAG_GROUT, rng);

    // The lake and the Feather Scale's ledge.
    lakeBed(g, LAKE.x, LAKE.y, LAKE.w, LAKE.h, rng);
    flagstones(g, { x: SCALE.x - 110, y: SCALE.y - 40, w: 220, h: 110 }, 26, LIME_LIT, FLAG_GROUT, rng);

    // Light pools under every wire, and wax under the standards.
    for (const x of WIRE_X) for (let y = NORTH_RIM + 90; y < SOUTH_RIM - 30; y += 140) lightPool(g, x + 20, y + ((x * 7) % 40), 22);
    for (const p of STANDARDS) waxDrips(g, p.x, p.y + 6, rng);
    waxDrips(g, 1350, 568, rng); waxDrips(g, SQUARE.x, SQUARE.y + 8, rng, 12); waxDrips(g, WICK_YARD.x, WICK_YARD.y + 20, rng, 14);
    // White ribbons dropped in the square.
    for (let i = 0; i < 18; i++) {
      const a = rng() * Math.PI * 2, d = 50 + rng() * 60;
      g.fillStyle(CREPE, 0.9); g.fillRect(SQUARE.x + Math.cos(a) * d, SQUARE.y + Math.sin(a) * d * 0.7, 6, 2);
    }
  },

  pieces,

  animate(g, t, view) {
    // The lake: lantern light shivering on the water, and the paper boats crossing.
    if (inView(LAKE.x + LAKE.w / 2, LAKE.y + LAKE.h / 2, view, 400)) {
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.25 + i / 6) % 1;
        const cx = LAKE.x + 80 + ((i * 113) % (LAKE.w - 160)), cy = LAKE.y + 50 + ((i * 61) % (LAKE.h - 100));
        g.lineStyle(1, LAKE_LIT, 0.4 * (1 - ph)); g.strokeEllipse(cx, cy, 10 + ph * 50, 3 + ph * 16);
      }
      for (const b of BOATS) {
        const span = LAKE.w - 80;
        const k = ((t * b.speed) / span + b.phase) % 1;
        const x = b.dir > 0 ? LAKE.x + 40 + k * span : LAKE.x + LAKE.w - 40 - k * span;
        const y = b.y + Math.sin(t * 0.9 + b.phase * 9) * 3;
        g.fillStyle(SOUL, 0.12); g.fillEllipse(x, y + 10, 40, 10);
        paperBoat(g, x, y, 0.7, b.dir);
        soulLantern(g, x + b.dir * 1, y - 24, 0.55, 1, t);
      }
    }
    // Shop windows flickering as a lantern is tested.
    for (const w of WINDOWS) {
      if (!inView(w.x, w.y, view)) continue;
      const f = Math.max(0, Math.sin(t * 2.3 + w.x * 0.01));
      glow(g, w.x, w.y - 30, 30, SOUL, 0.02 + f * 0.03, 2);
    }
    // Séance's candles behind the glass, and a lilac breath drifting out.
    if (inView(PARLOUR.x, PARLOUR.y, view)) {
      const ph = (t * 0.2) % 1;
      g.fillStyle(ECTO, 0.18 * (1 - ph)); g.fillCircle(PARLOUR.x + 40 + ph * 30, PARLOUR.y - 140 - ph * 60, 8 + ph * 10);
    }
    // The vats steaming in the Wick Yard.
    if (inView(WICK_YARD.x, WICK_YARD.y, view)) {
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.4 + i / 6) % 1;
        const vx = WICK_YARD.x + (i % 2 ? 76 : -76) + Math.sin(t + i) * 4;
        g.fillStyle(WAX, 0.25 * (1 - ph)); g.fillCircle(vx, WICK_YARD.y - 36 - ph * 50, 5 + ph * 8);
      }
    }
    // A wisp of a soul slipping between niches on the Columbarium façade.
    if (inView(COLUMBARIUM.x, COLUMBARIUM.y - 150, view, 300)) {
      const ph = (t * 0.07) % 1;
      soulWisp(g, COLUMBARIUM.x - 230 + ph * 460, COLUMBARIUM.y - 200 + Math.sin(ph * 12) * 20, 4, t, SOUL, 0.5 * Math.sin(ph * Math.PI), false, 0);
    }
  },

  animateOver(g, t, view) {
    // The wires: every span hung with lanterns, swaying high over everyone.
    for (let i = 0; i < WIRE_X.length; i++) {
      const x = WIRE_X[i];
      if (x < view.x - 80 || x > view.x + view.w + 80) continue;
      wireSpan(g, x, NORTH_RIM - 10, SOUTH_RIM + 10, t, i * 1.7, view.y, view.y + view.h);
    }
    // Brass glints off the Feather Scale's pans in the glare.
    if (inView(SCALE.x, SCALE.y - 120, view, 200)) {
      const f = (t * 0.5) % 1;
      g.fillStyle(0xffffff, 0.5 * Math.sin(f * Math.PI)); g.fillCircle(SCALE.x - 92 + f * 184, SCALE.y - 110, 2.5);
    }
    // Ribbon-ends lifting in the square.
    if (inView(SQUARE.x, SQUARE.y, view)) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const rx = SQUARE.x + Math.cos(a) * 38, ry = SQUARE.y - 22 + Math.sin(a) * 11;
        g.lineStyle(1.5, CREPE, 0.9); g.lineBetween(rx, ry, rx + 6 + Math.sin(t * 3 + i) * 3, ry + 3);
      }
      g.fillStyle(SOUL_LIT, 0.08 + Math.sin(t * 1.5) * 0.03); g.fillCircle(SQUARE.x, SQUARE.y - 150, 60);
    }
    // A glint of brass on the capstan as it creaks round.
    if (inView(CAPSTAN.x, CAPSTAN.y, view)) {
      const a = t * 0.3;
      g.fillStyle(BRASS, 0.9); g.fillCircle(CAPSTAN.x + Math.cos(a) * 60, CAPSTAN.y - 64 + Math.sin(a) * 19, 2);
    }
  },
};

export const LANTERN_AREA: AreaDef = {
  id: 'lantern',
  isle: 'light',
  court: 'lantern',
  name: 'The Lantern Court',
  subtitle: 'No soul shall ever lie in the dark',
  w: LANTERN_W,
  h: LANTERN_H,
  bg: 0x857a62,
  accent: LANTERN_COLOR,
  weather: 'lanterns',
  spawn: { x: 2250, y: 800 },
  painter,
  solids,
  exits: [
    { side: 'e', to: 'noon', label: 'Up the Lantern Stair to the Noon Court' },
    { side: 's', to: 'mural', label: 'Down the gorge road to the Mural Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 2200, y: 920 } },
    { kind: 'prince', id: 'wisp', at: { x: COLUMBARIUM.x, y: COLUMBARIUM.y + 56 } },
    { kind: 'water', id: 'lantern-lake', shape: LAKE, fishery: 'lantern-lake' },
    { kind: 'encounter', id: 'lantern-lantern-lake' },
    { kind: 'encounter', id: 'lantern-wick-trimming' },
    { kind: 'encounter', id: 'lantern-astral-projection' },
    { kind: 'encounter', id: 'lantern-soul-thread' },
    { kind: 'encounter', id: 'lantern-weighing' },
    {
      kind: 'sign', at: { x: 2260, y: 730 },
      text: 'THE LANTERN COURT. By order of the Radiance: no soul shall lie in the dark. Report every last breath to a Catcher.',
    },
    {
      kind: 'sign', at: { x: 1400, y: 1440 },
      text: 'THE WIRES. Fourteen spans, numbered at the foot. A lantern let gutter is a soul lost to the dark; its family is fined.',
    },
    {
      kind: 'sign', at: { x: 1060, y: 740 },
      text: 'THE LANTERN LAKE. Lanterns cross to the Columbarium by paper boat. Do not set a boat out without a lantern in it.',
    },
    {
      kind: 'sign', at: { x: 1500, y: 1340 },
      text: 'THE MOURNING HOUSE. Shutters to stand open at all hours. Grief is to be seen. — the Office of Clarity',
    },
    { kind: 'chest', id: 'lantern-chest-rim', at: { x: 170, y: 1400 }, coins: 160 },
    { kind: 'chest', id: 'lantern-chest-columbarium', at: { x: 1440, y: 370 }, orbs: 3, open: { prince: 'wisp' } },
  ],
  npcs: LANTERN_NPCS,
  crowd: LANTERN_CROWD,
};
