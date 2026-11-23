import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { glow, mulberry } from '../../../../art/IsleArt';
import {
  ballroom, ballroomWindowRects, ballroomWindows, bridge, campo, canalWater, chevalMirror, dryingRack, facciata,
  fireworkBurst, fireworksBarge, gondola, kerb, lampPost, maskShop, masqueWaystone, mirrorHall, mirrorHallRects,
  mirrorSheen, palazzo, palina, quay, rocketStand, rooftops, squero, teatrino, wellhead, gondola as gondolaArt,
} from './art';
import {
  CANAL_LIT, CANDLE, FIREWORKS, GILT, ISTRIA, LAGOON, LAGOON_DEEP, MASQUE_COLOR, STUCCO_CREAM,
  STUCCO_OCHRE, STUCCO_ROSE, STUCCO_SIENNA, STUCCO_TEAL, VELVET,
} from './palette';
import { MASQUE_CROWD, MASQUE_NPCS } from './npcs';

/**
 * The Masquerade Court — Choirholm's canal town of masked balls, on the terrace east of the
 * Brass Court.
 *
 * Read it from the Brass road in (west):
 * • **the riva** runs the whole width of the town from the Brass gate to the bridge over the Grand
 *   Canal, past the waystone and the lamp-posts with their tin-masked lanterns;
 * • **the Campo della Danza** (north-west): the brick square before the Ballroom of the Hundred
 *   Lamps, its five great windows full of chandeliers and turning couples — the ball never ends;
 * • **the Campo Facciata** (north): Prince Facade's palazzo, whose whole front is a face — two eye
 *   windows behind gilt lashes, a mouth for a water-door, a plume of carved feathers on the roof;
 * • **the Fondamenta dei Mascherai** (south of the riva): four mask-makers' workshops opening onto
 *   the Rio dei Mascherai, where the court fishes; Ottavia Gesso's is the second;
 * • **across the Rio**: the Hall of Mirrors and a quiet campiello, and the road south to the Hush;
 * • **over the Grand Canal** (east): the fireworks quay on the lagoon with its moored barges, the
 *   Campo del Teatro with the commedia's Teatrino, and the Squero, the gondola yard on its basin.
 */

export const MASQUE_W = 2400;
export const MASQUE_H = 1600;

const RIVA_Y = 800;

/** The Grand Canal (north–south) and the lagoon it opens into. */
const GRAND: Rect = { x: 1480, y: 330, w: 120, h: 1270 };
const LAGOON_R: Rect = { x: 1480, y: 0, w: 920, h: 330 };
/** The Rio dei Mascherai (east–west) behind the mask shops. */
const RIO: Rect = { x: 240, y: 1100, w: 1240, h: 80 };
/** The fishing reach of the Rio — between its two bridges. */
export const CANAL_WATER: Rect = { x: 700, y: 1100, w: 420, h: 80 };

/** Buildings: base centre points. */
export const FACCIATA: Pt = { x: 1150, y: 360 };
const BALLROOM: Pt = { x: 560, y: 430 };
const BALL_W = 520, BALL_H = 330;
const HALL: Pt = { x: 480, y: 1450 };
const HALL_W = 400, HALL_H = 220;
const SQUERO: Pt = { x: 2050, y: 1440 };
/** The squero's basin along the south edge, east of the Grand Canal. */
const BASIN: Rect = { x: 1600, y: 1500, w: 800, h: 100 };
const TEATRINO: Pt = { x: 1980, y: 820 };
const SHOPS = [200, 430, 820, 1030];
const SHOP_Y = 1030;

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
const lamps: Pt[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: Piece['draw'], solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

// ── Layout ───────────────────────────────────────────────────────────

// The roofs behind the north palazzi, and the water.
solids.push({ kind: 'rect', x: 0, y: 0, w: 1480, h: 360 });
solids.push({ kind: 'rect', ...LAGOON_R });
solids.push({ kind: 'rect', x: GRAND.x, y: 330, w: GRAND.w, h: 430 });
solids.push({ kind: 'rect', x: GRAND.x, y: 840, w: GRAND.w, h: 490 });
solids.push({ kind: 'rect', x: GRAND.x, y: 1410, w: GRAND.w, h: 190 });
solids.push({ kind: 'rect', x: RIO.x, y: RIO.y, w: 320, h: RIO.h });
solids.push({ kind: 'rect', x: 640, y: RIO.y, w: 520, h: RIO.h });
solids.push({ kind: 'rect', x: 1240, y: RIO.y, w: 240, h: RIO.h });

// The north palazzi: a rose house by the gate, the Ballroom, the Palazzo Facciata.
addPiece(150, 430, 260, 260, (g, rng) => palazzo(g, 150, 430, 240, 230, { wall: STUCCO_ROSE, shutters: true, hangings: 2, waterDoor: false }, rng),
  { kind: 'rect', x: 30, y: 360, w: 240, h: 70 });
addPiece(BALLROOM.x, BALLROOM.y, BALL_W + 40, BALL_H + 80, (g, rng) => ballroom(g, BALLROOM.x, BALLROOM.y, BALL_W, BALL_H, rng),
  { kind: 'rect', x: BALLROOM.x - BALL_W / 2, y: 360, w: BALL_W, h: 70 });
addPiece(FACCIATA.x, FACCIATA.y, 560, 420, (g, rng) => facciata(g, FACCIATA.x, FACCIATA.y, 480, 300, rng));
const BALL_WINDOWS = ballroomWindowRects(BALLROOM.x, BALLROOM.y, BALL_W, BALL_H);

// The mask-makers' workshops on the Fondamenta.
SHOPS.forEach((x, i) => {
  addPiece(x, SHOP_Y, 190, 220, (g, rng) => maskShop(g, x, SHOP_Y, 170, [STUCCO_OCHRE, STUCCO_TEAL, STUCCO_SIENNA, STUCCO_CREAM][i], rng),
    { kind: 'rect', x: x - 85, y: 900, w: 170, h: 130 });
});
addPiece(1262, 1076, 80, 60, (g) => dryingRack(g, 1262, 1076));

// Across the Rio: the Hall of Mirrors and the Ca' Muta.
addPiece(HALL.x, HALL.y, HALL_W + 30, HALL_H + 40, (g, rng) => mirrorHall(g, HALL.x, HALL.y, HALL_W, HALL_H, rng),
  { kind: 'rect', x: HALL.x - HALL_W / 2, y: 1250, w: HALL_W, h: 200 });
const HALL_MIRRORS = mirrorHallRects(HALL.x, HALL.y, HALL_W, HALL_H);
addPiece(760, 1500, 40, 80, (g) => chevalMirror(g, 760, 1500, 1));
addPiece(900, 1460, 220, 260, (g, rng) => palazzo(g, 900, 1460, 200, 210, { wall: STUCCO_CREAM, shutters: true, glow: 0.3, waterDoor: false }, rng),
  { kind: 'rect', x: 800, y: 1270, w: 200, h: 190 });

// Over the Grand Canal: the quay, the Teatrino, the palazzi, the Squero on its basin.
addPiece(1850, 250, 300, 160, (g) => fireworksBarge(g, 1850, 250, 260));
addPiece(2230, 200, 240, 160, (g) => fireworksBarge(g, 2230, 200, 200));
for (const x of [1660, 2060]) addPiece(x, 520, 60, 70, (g) => rocketStand(g, x, 520), { kind: 'circle', x, y: 512, r: 16 });
addPiece(TEATRINO.x, TEATRINO.y, 360, 240, (g, rng) => teatrino(g, TEATRINO.x, TEATRINO.y, 280, rng),
  { kind: 'rect', x: TEATRINO.x - 140, y: 600, w: 280, h: 220 });
addPiece(2290, 700, 220, 300, (g, rng) => palazzo(g, 2290, 700, 200, 260, { wall: STUCCO_SIENNA, hangings: 1, shutters: true }, rng),
  { kind: 'rect', x: 2190, y: 560, w: 210, h: 140 });
addPiece(1760, 1240, 240, 290, (g, rng) => palazzo(g, 1760, 1240, 220, 240, { wall: STUCCO_TEAL, hangings: 3 }, rng),
  { kind: 'rect', x: 1650, y: 1080, w: 220, h: 160 });
addPiece(2310, 1250, 180, 270, (g, rng) => palazzo(g, 2310, 1250, 160, 220, { wall: STUCCO_ROSE, shutters: true, glow: 0.5 }, rng),
  { kind: 'rect', x: 2230, y: 1110, w: 160, h: 140 });
addPiece(SQUERO.x, SQUERO.y, 360, 320, (g, rng) => squero(g, SQUERO.x, SQUERO.y, 300, 220, rng),
  { kind: 'rect', x: SQUERO.x - 150, y: 1280, w: 300, h: 160 });
solids.push({ kind: 'rect', ...BASIN });
addPiece(2280, 1556, 140, 60, (g) => gondolaArt(g, 2280, 1556, 0.9, -1, false));

// The campo's wellhead, the waystone, the lamps, the mooring poles.
addPiece(430, 640, 70, 60, (g) => wellhead(g, 430, 640), { kind: 'circle', x: 430, y: 628, r: 26 });
addPiece(150, 690, 50, 120, (g) => masqueWaystone(g, 150, 690));
for (const p of [{ x: 300, y: 752 }, { x: 700, y: 752 }, { x: 1100, y: 752 }, { x: 1700, y: 610 }, { x: 2150, y: 1070 }, { x: 1300, y: 1250 }, { x: 640, y: 1245 }]) {
  lamps.push(p);
  addPiece(p.x, p.y, 40, 110, (g) => lampPost(g, p.x, p.y), { kind: 'circle', x: p.x, y: p.y - 2, r: 7 });
}
const POLES: [number, number, number, number][] = [
  [1492, 470, VELVET, ISTRIA], [1588, 620, STUCCO_OCHRE, ISTRIA], [1492, 960, STUCCO_TEAL, ISTRIA], [1588, 1120, VELVET, GILT],
  [1492, 1270, STUCCO_ROSE, ISTRIA], [1588, 1520, STUCCO_SIENNA, ISTRIA], [320, 1176, VELVET, ISTRIA], [1040, 1176, STUCCO_TEAL, ISTRIA],
];
for (const [x, y, a, b] of POLES) addPiece(x, y, 20, 90, (g) => palina(g, x, y, a, b));

// ── Painter ──────────────────────────────────────────────────────────

/** Wavering gold streaks of reflected lamplight on a stretch of water. */
function reflections(g: Parameters<NonNullable<AreaPainter['animate']>>[0], r: Rect, t: number, view: Rect, seed: number): void {
  if (r.x > view.x + view.w || r.x + r.w < view.x || r.y > view.y + view.h || r.y + r.h < view.y) return;
  const n = Math.max(4, Math.floor((r.w * r.h) / 9000));
  for (let i = 0; i < Math.min(n, 30); i++) {
    const x = r.x + ((i * 131 + seed) % Math.max(1, r.w - 20)) + 10;
    const y = r.y + ((i * 71 + seed * 3) % Math.max(1, r.h - 16)) + 8;
    if (x < view.x - 20 || x > view.x + view.w + 20 || y < view.y - 20 || y > view.y + view.h + 20) continue;
    const w = Math.sin(t * 1.4 + i) * 4;
    g.fillStyle(i % 3 ? CANDLE : CANAL_LIT, 0.18 + Math.sin(t * 2 + i * 1.7) * 0.1);
    g.fillRect(x + w, y, 10, 2);
    g.fillRect(x - w * 0.6 + 2, y + 5, 6, 2);
  }
}

const painter: AreaPainter = {
  ground(g, rng) {
    quay(g, { x: 0, y: 0, w: MASQUE_W, h: MASQUE_H }, rng);
    // The riva: a band of paler paving edged in white stone.
    g.fillStyle(ISTRIA, 0.08); g.fillRect(0, RIVA_Y - 40, GRAND.x, 80);
    g.lineStyle(4, ISTRIA, 0.6); g.lineBetween(0, RIVA_Y - 40, GRAND.x, RIVA_Y - 40); g.lineBetween(0, RIVA_Y + 40, GRAND.x, RIVA_Y + 40);
    campo(g, { x: 240, y: 430, w: 660, h: 320 }, rng);
    campo(g, { x: 900, y: 360, w: 580, h: 390 }, rng);
    campo(g, { x: 1600, y: 560, w: 800, h: 520 }, rng);
    campo(g, { x: 680, y: 1250, w: 800, h: 350 }, rng);
    campo(g, { x: 1600, y: 1240, w: 800, h: 360 }, rng);
    rooftops(g, { x: 0, y: 0, w: GRAND.x, h: 300 }, rng);
    canalWater(g, LAGOON_R, rng, LAGOON_DEEP, LAGOON);
    canalWater(g, GRAND, rng);
    canalWater(g, RIO, rng);
    canalWater(g, BASIN, rng);
    kerb(g, BASIN.x, BASIN.y - 6, BASIN.w, 6);
    // White kerbs along every quay edge.
    kerb(g, GRAND.x - 6, 330, 6, GRAND.h);
    kerb(g, GRAND.x + GRAND.w, 330, 6, GRAND.h);
    kerb(g, 1600, 330, 800, 6);
    kerb(g, RIO.x, RIO.y - 6, RIO.w, 6);
    kerb(g, RIO.x, RIO.y + RIO.h, RIO.w, 6);
    kerb(g, RIO.x - 6, RIO.y - 6, 6, RIO.h + 12);
    // Bridges.
    bridge(g, GRAND.x + GRAND.w / 2, RIVA_Y, GRAND.w + 40, 80, true);
    bridge(g, GRAND.x + GRAND.w / 2, 1370, GRAND.w + 40, 80, true);
    bridge(g, 600, RIO.y + RIO.h / 2, RIO.h + 40, 80, false);
    bridge(g, 1200, RIO.y + RIO.h / 2, RIO.h + 40, 80, false);
    // Confetti swept into the gutters along the riva and the campi.
    for (let i = 0; i < 700; i++) {
      const x = rng() * MASQUE_W, y = 360 + rng() * (MASQUE_H - 360);
      if (x > GRAND.x - 4 && x < GRAND.x + GRAND.w + 4) continue;
      if (y > RIO.y - 4 && y < RIO.y + RIO.h + 4 && x > RIO.x && x < GRAND.x) continue;
      g.fillStyle(FIREWORKS[i % FIREWORKS.length], 0.35 + rng() * 0.3);
      g.fillRect(x, y, 2 + rng() * 2, 1.5);
    }
    // Lamp pools under every lantern.
    for (const p of lamps) glow(g, p.x, p.y, 70, CANDLE, 0.03, 3);
  },

  pieces,

  animate(g, t, view, world) {
    // Water: ripples sliding along and the lamps' reflections wavering.
    for (const r of [GRAND, RIO, LAGOON_R, BASIN]) reflections(g, r, t, view, r.x);
    for (let i = 0; i < 12; i++) {
      const y = GRAND.y + ((i * 97 + t * 18) % GRAND.h);
      if (y < view.y - 10 || y > view.y + view.h + 10) continue;
      g.lineStyle(1, CANAL_LIT, 0.35); g.lineBetween(GRAND.x + 20 + (i % 3) * 26, y, GRAND.x + 40 + (i % 3) * 26, y + 2);
    }
    // A gondola working the Rio between its bridges.
    const k = Math.sin(t * 0.11) * 0.5 + 0.5;
    const gx = 720 + k * 380, gy = RIO.y + 44;
    if (gx > view.x - 80 && gx < view.x + view.w + 80 && gy > view.y - 60 && gy < view.y + view.h + 40) {
      gondola(g, gx, gy, 0.62, Math.cos(t * 0.11) >= 0 ? 1 : -1, true, t);
    }
    // Two out on the lagoon, and the wake of each.
    for (const [base, y, sp] of [[1560, 110, 26], [2340, 300, -20]] as [number, number, number][]) {
      const span = 760;
      const x = sp > 0 ? base + ((t * sp) % span) : base - ((t * -sp) % span);
      if (x < view.x - 80 || x > view.x + view.w + 80 || y < view.y - 60 || y > view.y + view.h + 40) continue;
      g.lineStyle(1.5, CANAL_LIT, 0.4); g.lineBetween(x - Math.sign(sp) * 40, y + 6, x - Math.sign(sp) * 90, y + 12);
      gondola(g, x, y, 0.7, Math.sign(sp), true, t);
    }
    // After the Prince falls the ballroom's doors stand open and the light spills on the campo.
    if (world.test({ prince: 'facade' })) glow(g, BALLROOM.x, BALLROOM.y + 30, 120, CANDLE, 0.04, 3);
  },

  animateOver(g, t, view, world) {
    if (view.y < BALLROOM.y && view.x < BALLROOM.x + BALL_W && view.x + view.w > BALLROOM.x - BALL_W) ballroomWindows(g, BALL_WINDOWS, t);
    if (view.y + view.h > HALL.y - HALL_H && view.x < HALL.x + HALL_W) mirrorSheen(g, HALL_MIRRORS, t);
    // Lantern haloes.
    for (const p of lamps) {
      if (p.x < view.x - 40 || p.x > view.x + view.w + 40 || p.y < view.y - 40 || p.y > view.y + view.h + 140) continue;
      g.fillStyle(CANDLE, 0.08 + Math.sin(t * 3 + p.x) * 0.03); g.fillCircle(p.x, p.y - 86, 20);
    }
    // Fireworks over the lagoon — until the Prince stops them.
    if (world.test({ prince: 'facade' })) return;
    if (view.x + view.w < LAGOON_R.x || view.y > 360) return;
    for (let i = 0; i < 4; i++) {
      const cycle = 2.6 + i * 0.7;
      const slot = Math.floor((t + i * 1.3) / cycle);
      const k = ((t + i * 1.3) % cycle) / cycle;
      if (k > 0.45) continue;
      const rr = mulberry(slot * 31 + i * 7);
      const x = LAGOON_R.x + 80 + rr() * (LAGOON_R.w - 160), y = 50 + rr() * 150;
      fireworkBurst(g, x, y, 60 + rr() * 40, k / 0.45, FIREWORKS[Math.floor(rr() * FIREWORKS.length)], 16);
    }
  },
};

export const MASQUE_AREA: AreaDef = {
  id: 'masque',
  isle: 'sound',
  court: 'masque',
  name: 'The Masquerade Court',
  subtitle: 'A choir has no faces, only Parts',
  w: MASQUE_W,
  h: MASQUE_H,
  bg: LAGOON_DEEP,
  accent: MASQUE_COLOR,
  weather: 'sequins',
  spawn: { x: 160, y: RIVA_Y },
  painter,
  solids,
  exits: [
    { side: 'w', to: 'brass', at: RIVA_Y, label: 'Along the riva to the Brass Court' },
    { side: 's', to: 'hush', at: 1200, label: 'Down the snow steps to the Hush Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 150, y: 700 } },
    { kind: 'prince', id: 'facade', at: { x: FACCIATA.x, y: FACCIATA.y + 50 } },
    { kind: 'water', id: 'masque-canal', shape: CANAL_WATER, fishery: 'masque-canal' },
    { kind: 'encounter', id: 'masque-masked-ball' },
    { kind: 'encounter', id: 'masque-hall-of-mirrors' },
    { kind: 'encounter', id: 'masque-fireworks-barge' },
    { kind: 'encounter', id: 'masque-commedia' },
    { kind: 'encounter', id: 'masque-gondola' },
    {
      kind: 'sign', at: { x: 250, y: 700 },
      text: 'THE MASQUERADE. By order of Prince Facade, all over seven go masked, Part on the brow. A bare face is noise.',
    },
    {
      kind: 'sign', at: { x: 1000, y: 430 },
      text: 'THE PALAZZO FACCIATA. His Highness receives no one. Cards may be left with the major-domo.',
    },
    {
      kind: 'sign', at: { x: 740, y: 1460 },
      text: 'THE HALL OF MIRRORS. Practise your mask. Look as the Tuners look: at the note, never the face.',
    },
    {
      kind: 'sign', at: { x: 1700, y: 1460 },
      text: 'THE SQUERO. Gondolas built and tarred. Night boats for the Tuners take precedence. Do not row after Compline.',
    },
    { kind: 'chest', id: 'masque-chest-garden', at: { x: 90, y: 1540 }, coins: 130 },
    { kind: 'chest', id: 'masque-chest-facciata', at: { x: 1400, y: 620 }, orbs: 2, open: { prince: 'facade' } },
  ],
  npcs: MASQUE_NPCS,
  crowd: MASQUE_CROWD,
};
