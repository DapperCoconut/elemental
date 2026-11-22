import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { glow, lit, road, type G } from '../../../../art/IsleArt';
import {
  blackFlame, blackLampPost, blackMirror, canopyTrunk, clothRack, dialGnomon, draughtHouse, duskHalo, ghostCaps,
  greyCart, hollowHouse, looseShadow, moonflowers, moth, mouldGround, nightDialFace, nightDialHand, oilCart,
  rationBoard, shadowLoom, shadowMere, starglass, umbralBole, umbralWaystone,
} from './art';
import {
  BARK, BARK_DARK, CANDLE, CANDLE_LIT, FOXFIRE, MERE_LIT, MOON, MOULD_DARK, PATH, PATH_DARK, PATH_LIT, UMBRAL_COLOR,
} from './palette';
import { UMBRAL_CROWD, UMBRAL_NPCS } from './npcs';

/**
 * The Umbral Court — a town under a canopy so thick no light has reached the ground in living
 * memory. Read it from the Dimming Road in:
 * • **the Dimming Road** (west): in from Stilthaven between black lamps on crook-posts, past the
 *   waystone and Lampwarden Oriel's oil cart; the Draught House stands north of it with its queue
 *   rope and ration board, hollow-tree houses round it;
 * • **the Night-Dial** at the crossing: a great stone dial in the square that has never shown
 *   anything but night, the moon-hand turning; Mother Velvet's shop, *The Unlit Window*, south-west
 *   of it;
 * • **the Cloak Road** (north): up past the moonflower beds to the starglass — the one hole ever cut
 *   in the canopy, a shaft of moonlight coming down it — and the grey cart waiting by the road;
 * • **the looms** (south-west): the shadow-weavers' yard, two great looms and the drying racks of
 *   shadow-cloth, the Moult-Tithe of Umbral;
 * • **the mirror-works and the Bole** (east): Twin's black mirrors propped along the road, and at
 *   its end the Umbral Bole, the hollow tree that is Prince Dusk's hall;
 * • **the Shadow Mere** (south-east): still black water, Perrin Gloam's landing on its west bank.
 *
 * The whole court is walled in by the trunks of the canopy and their stilt-roots.
 */

export const UMBRAL_W = 2400;
export const UMBRAL_H = 1600;

const WEST_Y = 800;
const NORTH_X = 1200;

/** The great night-dial in the square. */
export const DIAL: Pt = { x: 1180, y: 860 };
const DIAL_R = 150;
const SQUASH = 0.6;
/** The Shadow Mere — the court's fishing water. */
export const MERE: Rect = { x: 1600, y: 1150, w: 520, h: 250 };
/** The Umbral Bole, Prince Dusk's hall — the middle of its doorstep. */
export const BOLE: Pt = { x: 2000, y: 520 };
/** The starglass platform up the Cloak road. */
export const STARGLASS: Pt = { x: 1440, y: 330 };
/** The Draught House north of the Dimming Road. */
export const DRAUGHT: Pt = { x: 760, y: 560 };
/** The weavers' yard: the two looms. */
export const LOOMS: Pt[] = [{ x: 420, y: 1200 }, { x: 650, y: 1200 }];
/** Mother Velvet's hollow-tree shop. */
export const SHOP: Pt = { x: 860, y: 1000 };
/** Hesper and Perrin Gloam's house, south of the mere. */
export const GLOAM_HOUSE: Pt = { x: 2040, y: 1500 };

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Black-lamp flame points, animated in `animate`. */
const flames: Pt[] = [];
/** Cloth racks, whose hems stir. */
const racks: { x: number; y: number; w: number }[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

function lampPost(x: number, y: number, flip = false): void {
  const s = 1;
  const d = flip ? -1 : 1;
  flames.push({ x: x + d * 18 * s, y: y - 78 * s + 14 * s + 6 * s });
  addPiece(x, y, 60, 100, (g) => { blackLampPost(g, x, y, s, flip); }, { kind: 'circle', x, y: y - 4, r: 8 });
}

function hollow(x: number, y: number, w: number, h: number, o: Parameters<typeof hollowHouse>[6] = {}): void {
  addPiece(x, y, w * 1.6, h + 70, (g, rng) => { hollowHouse(g, x, y, w, h, rng, o); }, { kind: 'circle', x, y: y - w * 0.22, r: w * 0.4 });
}

// ── Layout ───────────────────────────────────────────────────────────

// The Umbral Bole, Prince Dusk's hall, with black lamps flanking the door.
addPiece(BOLE.x, BOLE.y, 640, 520, (g, rng) => umbralBole(g, BOLE.x, BOLE.y, 420, 440, rng),
  { kind: 'rect', x: BOLE.x - 175, y: BOLE.y - 50, w: 350, h: 48 });
solids.push({ kind: 'rect', x: BOLE.x - 290, y: BOLE.y - 30, w: 110, h: 26 }, { kind: 'rect', x: BOLE.x + 180, y: BOLE.y - 30, w: 110, h: 26 });
lampPost(BOLE.x - 90, BOLE.y + 40);
lampPost(BOLE.x + 90, BOLE.y + 40, true);

// Twin's mirror-works: black mirrors propped along the east road.
for (const [x, y, t] of [[1650, 700, -2], [1710, 690, 1], [1770, 682, -1], [1830, 676, 2]] as [number, number, number][]) {
  addPiece(x, y, 40, 80, (g) => blackMirror(g, x, y, 1, t), { kind: 'circle', x, y: y - 4, r: 10 });
}
lampPost(1500, 900);
lampPost(1760, 820, true);

// The Night-Dial's gnomon.
addPiece(DIAL.x, DIAL.y, 70, 130, (g) => dialGnomon(g, DIAL.x, DIAL.y, 1), { kind: 'circle', x: DIAL.x, y: DIAL.y - 6, r: 20 });

// The Dimming Road: lamps both sides, the oil cart, the waystone.
for (const x of [180, 420, 680]) { lampPost(x, WEST_Y - 70); lampPost(x + 120, WEST_Y + 80, true); }
addPiece(230, 690, 60, 90, (g) => umbralWaystone(g, 230, 690), { kind: 'circle', x: 230, y: 684, r: 16 });
addPiece(500, 735, 160, 80, (g) => oilCart(g, 500, 735), { kind: 'rect', x: 452, y: 705, w: 96, h: 30 });

// The Draught House north of the road, its ration board.
addPiece(DRAUGHT.x, DRAUGHT.y, 260, 170, (g, rng) => draughtHouse(g, DRAUGHT.x, DRAUGHT.y, rng),
  { kind: 'rect', x: DRAUGHT.x - 82, y: DRAUGHT.y - 40, w: 164, h: 36 });
addPiece(930, 590, 80, 90, (g) => rationBoard(g, 930, 590), { kind: 'rect', x: 902, y: 582, w: 56, h: 10 });

// Hollow-tree houses.
hollow(380, 470, 120, 170, { ladder: true });
hollow(560, 330, 110, 160, { candle: true });
hollow(1000, 380, 120, 170, { grey: true });
hollow(1640, 470, 110, 160, { ladder: true, candle: true });
hollow(2240, 900, 130, 180, { grey: true });
hollow(220, 1020, 120, 160, { candle: true });
hollow(2240, 1180, 110, 150, { ladder: true });
hollow(GLOAM_HOUSE.x, GLOAM_HOUSE.y, 110, 150, { grey: true });
// Mother Velvet's shop: a fat hollow tree with bolts of cloth hung by the door.
addPiece(SHOP.x, SHOP.y, 230, 260, (g, rng) => {
  hollowHouse(g, SHOP.x, SHOP.y, 140, 190, rng, { candle: true });
  clothRack(g, SHOP.x + 96, SHOP.y + 6, 70, 0);
  // The shop sign: a black window-frame with nothing in it.
  g.lineStyle(2, BARK_DARK, 1); g.lineBetween(SHOP.x - 40, SHOP.y - 120, SHOP.x - 40, SHOP.y - 96);
  g.fillStyle(BARK_DARK, 1); g.fillRect(SHOP.x - 58, SHOP.y - 98, 36, 28);
  g.fillStyle(0x000000, 1); g.fillRect(SHOP.x - 54, SHOP.y - 94, 28, 20);
  g.lineStyle(1.5, BARK, 1); g.lineBetween(SHOP.x - 40, SHOP.y - 94, SHOP.x - 40, SHOP.y - 74); g.lineBetween(SHOP.x - 54, SHOP.y - 84, SHOP.x - 26, SHOP.y - 84);
}, { kind: 'circle', x: SHOP.x, y: SHOP.y - 30, r: 56 });
solids.push({ kind: 'rect', x: SHOP.x + 58, y: SHOP.y - 6, w: 76, h: 14 });
racks.push({ x: SHOP.x + 96, y: SHOP.y + 6, w: 70 });

// The Cloak road: the starglass, the moonflowers, the grey cart.
addPiece(STARGLASS.x, STARGLASS.y, 180, 220, (g) => starglass(g, STARGLASS.x, STARGLASS.y), { kind: 'rect', x: STARGLASS.x - 64, y: STARGLASS.y - 26, w: 128, h: 32 });
addPiece(1360, 200, 140, 70, (g) => greyCart(g, 1360, 200), { kind: 'rect', x: 1316, y: 172, w: 88, h: 28 });
lampPost(1110, 300);
lampPost(1290, 520, true);

// The weavers' yard: the looms, the drying racks.
for (const p of LOOMS) addPiece(p.x, p.y, 200, 160, (g, rng) => shadowLoom(g, p.x, p.y, 150, rng), { kind: 'rect', x: p.x - 80, y: p.y - 18, w: 160, h: 26 });
for (const [x, y, w] of [[330, 1400, 120], [560, 1420, 140], [790, 1440, 110]] as [number, number, number][]) {
  addPiece(x, y, w + 20, 80, (g) => clothRack(g, x, y, w, 0), { kind: 'rect', x: x - w / 2 - 4, y: y - 8, w: w + 8, h: 12 });
  racks.push({ x, y, w });
}
lampPost(880, 1180, true);

// Perrin's landing and lamps on the mere's west bank.
lampPost(1540, 1110);
lampPost(1560, 1440);

// Great trunks of the canopy standing in the court.
for (const [x, y, r, h] of [[1360, 1500, 30, 300], [140, 1520, 34, 320], [2280, 600, 32, 320], [100, 260, 30, 260]] as [number, number, number, number][]) {
  addPiece(x, y, r * 6, h + 40, (g, rng) => canopyTrunk(g, x, y, r, h, rng), { kind: 'circle', x, y: y - r * 0.4, r: r * 1.15 });
}

// ── The wall of the canopy: trunks round the edge, open at the two roads ─────────

const GAP = 110;
// North: a row of trunks drawn as pieces (behind everything).
for (let x = 50; x < UMBRAL_W; x += 170) {
  if (Math.abs(x - NORTH_X) < GAP + 40) continue;
  const r = 24 + ((x * 7) % 11), h = 120 + ((x * 13) % 60);
  addPiece(x, 70, r * 6, h + 40, (g, rng) => canopyTrunk(g, x, 70, r, h, rng));
}
solids.push({ kind: 'rect', x: 0, y: 0, w: NORTH_X - GAP, h: 70 });
solids.push({ kind: 'rect', x: NORTH_X + GAP, y: 0, w: UMBRAL_W - NORTH_X - GAP, h: 70 });
// South and the sides: flat strips of root in the ground, solid.
solids.push({ kind: 'rect', x: 0, y: UMBRAL_H - 34, w: UMBRAL_W, h: 34 });
solids.push({ kind: 'rect', x: 0, y: 0, w: 34, h: WEST_Y - GAP });
solids.push({ kind: 'rect', x: 0, y: WEST_Y + GAP, w: 34, h: UMBRAL_H - WEST_Y - GAP });
solids.push({ kind: 'rect', x: UMBRAL_W - 34, y: 0, w: 34, h: UMBRAL_H });
// The mere keeps you to its banks.
solids.push({ kind: 'rect', x: MERE.x - 10, y: MERE.y - 10, w: MERE.w + 20, h: MERE.h + 20 });

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 160): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

/** The moon-hand: one turn every three minutes. */
const handAngle = (t: number): number => -Math.PI / 2 + (t / 180) * Math.PI * 2;

/** Loose shadows walking the court on their own (fixed loops). */
const WALKERS: { c: Pt; rx: number; ry: number; sp: number }[] = [
  { c: { x: 700, y: 640 }, rx: 160, ry: 40, sp: 0.12 },
  { c: { x: 1400, y: 1060 }, rx: 120, ry: 60, sp: -0.1 },
  { c: { x: 1900, y: 860 }, rx: 140, ry: 50, sp: 0.09 },
  { c: { x: 600, y: 1520 }, rx: 200, ry: 20, sp: 0.07 },
];

/** Ripples on the mere, fixed. */
const RIPPLES: Pt[] = [{ x: 1700, y: 1230 }, { x: 1860, y: 1320 }, { x: 2000, y: 1220 }, { x: 1780, y: 1360 }];

const painter: AreaPainter = {
  ground(g, rng) {
    const W = UMBRAL_W, H = UMBRAL_H;
    mouldGround(g, { x: 0, y: 0, w: W, h: H }, rng);

    // The root wall, seen from above, round the sides and the south.
    for (const r of [
      { x: 0, y: 0, w: 34, h: WEST_Y - GAP }, { x: 0, y: WEST_Y + GAP, w: 34, h: H - WEST_Y - GAP },
      { x: W - 34, y: 0, w: 34, h: H }, { x: 0, y: H - 34, w: W, h: 34 },
    ]) {
      g.fillStyle(BARK_DARK, 1); g.fillRect(r.x, r.y, r.w, r.h);
      for (let i = 0; i < (r.w + r.h) / 14; i++) {
        const horiz = r.w > r.h;
        const x = horiz ? r.x + i * 14 : r.x + 4 + rng() * (r.w - 8), y = horiz ? r.y + 4 + rng() * (r.h - 8) : r.y + i * 14;
        g.lineStyle(5, BARK, 1); g.lineBetween(x, y, x + (horiz ? 18 : 6), y + (horiz ? 6 : 18));
      }
    }

    // The roads: packed root-earth, edged with moss.
    road(g, [{ x: 0, y: WEST_Y }, { x: 500, y: WEST_Y + 6 }, { x: DIAL.x - DIAL_R - 50, y: DIAL.y - 30 }], 96, PATH, PATH_DARK, PATH_LIT, rng);
    road(g, [{ x: NORTH_X, y: 0 }, { x: NORTH_X, y: 420 }, { x: DIAL.x + 10, y: DIAL.y - DIAL_R * SQUASH - 50 }], 88, PATH, PATH_DARK, PATH_LIT, rng);
    road(g, [{ x: DIAL.x + DIAL_R + 50, y: DIAL.y - 10 }, { x: 1560, y: 790 }, { x: 1860, y: 640 }, { x: BOLE.x, y: BOLE.y + 70 }], 86, PATH, PATH_DARK, PATH_LIT, rng);
    road(g, [{ x: DIAL.x - 120, y: DIAL.y + 90 }, { x: 860, y: 1100 }, { x: 680, y: 1300 }, { x: 420, y: 1300 }], 70, PATH, PATH_DARK, PATH_LIT, rng);
    road(g, [{ x: DIAL.x + 120, y: DIAL.y + 90 }, { x: 1440, y: 1060 }, { x: 1560, y: 1200 }, { x: 1560, y: 1460 }, { x: 1960, y: 1500 }], 64, PATH, PATH_DARK, PATH_LIT, rng);
    road(g, [{ x: DRAUGHT.x, y: WEST_Y }, { x: DRAUGHT.x - 10, y: DRAUGHT.y + 30 }], 60, PATH, PATH_DARK, PATH_LIT, rng);
    road(g, [{ x: NORTH_X, y: 360 }, { x: STARGLASS.x - 40, y: STARGLASS.y + 30 }], 56, PATH, PATH_DARK, PATH_LIT, rng);
    road(g, [{ x: 1960, y: 640 }, { x: 2200, y: 760 }, { x: 2200, y: 1100 }], 50, PATH, PATH_DARK, PATH_LIT, rng);
    road(g, [{ x: 1960, y: 1500 }, { x: 2300, y: 1480 }], 46, PATH, PATH_DARK, PATH_LIT, rng);

    // The square round the dial: night-stone flags.
    g.fillStyle(PATH_DARK, 1); g.fillEllipse(DIAL.x, DIAL.y, DIAL_R * 2 + 150, (DIAL_R * 2 + 150) * SQUASH + 20);
    g.fillStyle(PATH, 1); g.fillEllipse(DIAL.x, DIAL.y, DIAL_R * 2 + 136, (DIAL_R * 2 + 136) * SQUASH + 14);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      g.lineStyle(1, PATH_DARK, 0.6);
      g.lineBetween(DIAL.x + Math.cos(a) * (DIAL_R + 14), DIAL.y + Math.sin(a) * (DIAL_R + 14) * SQUASH, DIAL.x + Math.cos(a) * (DIAL_R + 66), DIAL.y + Math.sin(a) * (DIAL_R + 66) * SQUASH);
    }
    nightDialFace(g, DIAL.x, DIAL.y, DIAL_R, SQUASH);

    // The Bole's forecourt: a ring of root-planks before the door, the Prince's sigil worked in.
    g.fillStyle(BARK_DARK, 1); g.fillEllipse(BOLE.x, BOLE.y + 70, 300, 110);
    g.fillStyle(BARK, 1); g.fillEllipse(BOLE.x, BOLE.y + 68, 286, 100);
    for (let k = -6; k <= 6; k++) { g.lineStyle(1, BARK_DARK, 0.7); g.lineBetween(BOLE.x + k * 22, BOLE.y + 22, BOLE.x + k * 22, BOLE.y + 116); }
    duskHalo(g, BOLE.x, BOLE.y + 70, 140);

    // The weavers' yard: trodden ground scattered with black lint.
    g.fillStyle(PATH_DARK, 0.6); g.fillEllipse(560, 1310, 720, 320);
    for (let i = 0; i < 200; i++) {
      const x = 220 + rng() * 680, y = 1170 + rng() * 300;
      g.lineStyle(1, 0x05030a, 0.5); g.lineBetween(x, y, x + (rng() - 0.5) * 10, y + (rng() - 0.5) * 6);
    }

    // The queue's worn stripe in front of the Draught House.
    g.fillStyle(PATH_DARK, 0.6); g.fillRect(DRAUGHT.x - 190, DRAUGHT.y + 6, 180, 26);

    // Moonflower beds by the Cloak road and the starglass's pool of moonlight.
    moonflowers(g, 1050, 660, 120, rng);
    moonflowers(g, 1370, 640, 110, rng);
    moonflowers(g, 1540, 420, 90, rng);
    for (let k = 4; k >= 1; k--) { g.fillStyle(MOON, 0.03); g.fillEllipse(STARGLASS.x + 18, STARGLASS.y - 10, 90 + k * 40, 40 + k * 18); }

    // The mere.
    shadowMere(g, MERE, rng);
    // Perrin's landing on the west bank.
    g.fillStyle(BARK_DARK, 1); g.fillRect(MERE.x - 40, MERE.y + 100, 66, 30);
    g.fillStyle(BARK, 1); g.fillRect(MERE.x - 38, MERE.y + 102, 62, 24);
    for (let k = 0; k < 6; k++) { g.lineStyle(1, BARK_DARK, 0.8); g.lineBetween(MERE.x - 38 + k * 11, MERE.y + 102, MERE.x - 38 + k * 11, MERE.y + 126); }

    // Ghost-caps glowing in the mould all over.
    for (const [x, y] of [[300, 600], [880, 470], [1520, 560], [2100, 1060], [640, 980], [1100, 1300], [1900, 1100], [260, 1480], [2300, 1380], [1700, 300]] as [number, number][]) {
      ghostCaps(g, x, y, 4 + Math.floor(rng() * 4), rng);
    }
  },

  pieces,

  animate(g, t, view, world) {
    const litNow = world.test({ prince: 'dusk' });
    // The lamps: black flames — or, once the Prince has given way, yellow ones.
    for (const f of flames) {
      if (!inView(f.x, f.y, view, 60)) continue;
      if (litNow) {
        glow(g, f.x, f.y, 26, CANDLE, 0.07, 3);
        g.fillStyle(CANDLE, 0.9); g.fillTriangle(f.x - 3.5, f.y, f.x + 3.5, f.y, f.x + Math.sin(t * 6 + f.x) * 1.5, f.y - 11);
        g.fillStyle(CANDLE_LIT, 1); g.fillTriangle(f.x - 1.5, f.y, f.x + 1.5, f.y, f.x, f.y - 6);
      } else {
        blackFlame(g, f.x, f.y, 0.8, t + f.x * 0.01);
      }
    }
    // The night-dial's moon-hand.
    if (inView(DIAL.x, DIAL.y, view, 220)) nightDialHand(g, DIAL.x, DIAL.y, DIAL_R, handAngle(t), SQUASH);
    // The mere: slow rings, a violet gleam crossing.
    if (inView(MERE.x + MERE.w / 2, MERE.y + MERE.h / 2, view, 300)) {
      RIPPLES.forEach((p, i) => {
        const ph = (t * 0.25 + i / 4) % 1;
        g.lineStyle(1.2, MERE_LIT, 0.4 * (1 - ph)); g.strokeEllipse(p.x, p.y, 10 + ph * 50, 4 + ph * 16);
      });
      const gx = MERE.x + 60 + ((t * 30) % (MERE.w - 120));
      g.fillStyle(MERE_LIT, 0.12); g.fillEllipse(gx, MERE.y + MERE.h * 0.45, 60, 4);
      // Something long turning under the surface.
      const ex = MERE.x + MERE.w / 2 + Math.cos(t * 0.3) * 160, ey = MERE.y + MERE.h / 2 + Math.sin(t * 0.3) * 60;
      g.fillStyle(0x000000, 0.5); g.fillEllipse(ex, ey, 46, 8);
      g.fillStyle(MOON, 0.4); g.fillCircle(ex + Math.cos(t * 0.3 + Math.PI / 2) * 18, ey, 1.5);
    }
    // Loose shadows walking their rounds.
    WALKERS.forEach((w, i) => {
      const a = t * w.sp * Math.PI * 2;
      const x = w.c.x + Math.cos(a) * w.rx, y = w.c.y + Math.sin(a) * w.ry;
      if (inView(x, y, view, 80)) looseShadow(g, x, y, t, i * 2);
    });
    // Cloth hems stirring in a wind that is not there.
    for (const r of racks) if (inView(r.x, r.y, view)) clothRack(g, r.x, r.y, r.w, t);
    // Foxfire breathing on the ghost-caps.
    for (const [x, y] of [[300, 600], [880, 470], [1520, 560], [2100, 1060], [640, 980], [1100, 1300], [1900, 1100]] as [number, number][]) {
      if (!inView(x, y, view)) continue;
      glow(g, x, y - 4, 20, FOXFIRE, 0.012 + 0.012 * Math.sin(t * 1.3 + x), 2);
    }
  },

  animateOver(g, t, view, world) {
    // Moths round the lamps — round the yellow ones, once there are yellow ones.
    const litNow = world.test({ prince: 'dusk' });
    flames.forEach((f, i) => {
      if (i % 3 || !inView(f.x, f.y, view, 60)) return;
      for (let k = 0; k < (litNow ? 4 : 2); k++) {
        const a = t * (1.8 + k * 0.4) + i + k * 2;
        moth(g, f.x + Math.cos(a) * (16 + k * 4), f.y - 6 + Math.sin(a * 1.3) * 10, 0.7, t + k, litNow ? 0xc8b48a : 0x6a5a80);
      }
    });
    // The shaft of moonlight down the starglass.
    if (inView(STARGLASS.x, STARGLASS.y - 200, view, 300)) {
      const sx = STARGLASS.x + 18, sy = STARGLASS.y - 158;
      g.fillStyle(MOON, 0.05 + Math.sin(t * 0.5) * 0.01);
      g.fillTriangle(sx - 10, sy, sx + 10, sy, sx + 60, sy - 260);
      g.fillTriangle(sx - 10, sy, sx + 60, sy - 260, sx + 20, sy - 260);
      for (let i = 0; i < 8; i++) {
        const ph = (t * 0.1 + i / 8) % 1;
        g.fillStyle(lit(MOON, 0.4), 0.5 * Math.sin(ph * Math.PI)); g.fillCircle(sx + 30 * (1 - ph) + Math.sin(t + i) * 6, sy - ph * 240, 1.2);
      }
    }
    // The candle slits flicker.
    for (const [x, y] of [[560 - 26, 330 - 99], [1640 - 26, 470 - 99], [220 - 29, 1020 - 99], [SHOP.x - 34, SHOP.y - 118]] as [number, number][]) {
      if (!inView(x, y, view, 40)) continue;
      g.fillStyle(CANDLE, 0.1 + 0.08 * Math.sin(t * 9 + x)); g.fillCircle(x, y, 9);
    }
    // Spores of the dark drifting low over the mould.
    if (inView(DIAL.x, DIAL.y, view, 900)) {
      for (let i = 0; i < 10; i++) {
        const ph = (t * 0.05 + i / 10) % 1;
        const x = view.x + ((i * 233 + t * 8) % view.w), y = view.y + view.h * (0.2 + ((i * 71) % 60) / 100) - ph * 30;
        g.fillStyle(MOULD_DARK, 0.4 * Math.sin(ph * Math.PI)); g.fillCircle(x, y, 2);
      }
    }
  },
};

export const UMBRAL_AREA: AreaDef = {
  id: 'umbral',
  isle: 'slime',
  court: 'umbral',
  name: 'The Umbral Court',
  subtitle: 'No light reaches; the lamps burn black',
  w: UMBRAL_W,
  h: UMBRAL_H,
  bg: 0x06040a,
  accent: UMBRAL_COLOR,
  weather: 'murk',
  gloom: 0.32,
  spawn: { x: 120, y: WEST_Y },
  painter,
  solids,
  exits: [
    { side: 'w', to: 'stilthaven', label: 'The Dimming Road to Stilthaven' },
    { side: 'n', to: 'cloak', label: 'Up the lampless road to the Cloak Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 230, y: 730 } },
    { kind: 'prince', id: 'dusk', at: { x: BOLE.x, y: BOLE.y + 70 } },
    { kind: 'water', id: 'umbral-mere', shape: MERE, fishery: 'umbral-mere' },
    { kind: 'encounter', id: 'umbral-silhouette' },
    { kind: 'encounter', id: 'umbral-shade-step' },
    { kind: 'encounter', id: 'umbral-sundown' },
    { kind: 'encounter', id: 'umbral-eclipse' },
    { kind: 'encounter', id: 'umbral-doppelganger' },
    {
      kind: 'sign', at: { x: 330, y: 870 },
      text: 'THE UMBRAL COURT. By order of Prince Dusk all lamps burn black. A yellow flame is a signal to informers. Report it.',
    },
    {
      kind: 'sign', at: { x: 980, y: 640 },
      text: 'THE DRAUGHT HOUSE. Doses at the new moon, to households in good standing. The Moult-Tithe here is shadow-cloth.',
    },
    {
      kind: 'sign', at: { x: 1270, y: 240 },
      text: 'TO THE CLOAK COURT. The grey cart leaves at the new moon. The passed-over ride free.',
    },
    {
      kind: 'sign', at: { x: 1880, y: 760 },
      text: 'THE UMBRAL BOLE. The Prince receives in the dark. Petitioners will not bring a light.',
    },
    { kind: 'chest', id: 'umbral-chest-looms', at: { x: 300, y: 1300 }, coins: 140 },
    { kind: 'chest', id: 'umbral-chest-bole', at: { x: 2260, y: 470 }, orbs: 2, open: { prince: 'dusk' } },
  ],
  npcs: UMBRAL_NPCS,
  crowd: UMBRAL_CROWD,
};
