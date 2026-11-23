import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { glow, mixC, type G } from '../../../../art/IsleArt';
import {
  aurielStatue, bareAwning, bleachRing, burningGlass, clarityNotice, clearFigure, duskHouse, fishShape, flourCart, glint,
  kerb, marbleHouse, marbleSlabs, mirrorPost, noonBelfry, noonLamp, opticianShop, queueRope, reflectingPool, ropePost,
  solarium, strawUrn, sunburstInlay, sundial, sunriseBunBakery, sunTemple, sunWaystone,
} from './art';
import {
  BEAM, BRASS_DARK, CANVAS, GOLD, GOLD_DARK, GOLD_LIT, GROUT, LIME, LIME_DARK, LIME_LIT, MARBLE, MARBLE_DARK,
  MARBLE_LIT, NOON_COLOR, POOL_GLINT, SPECTRUM, SUN,
} from './palette';
import { NOON_CROWD, NOON_NPCS } from './npcs';

/**
 * The Noon Court — the sun-plaza on Solmara's central terrace, straight up the Sun Road from
 * Meridian Quay.
 *
 * Read it from the quay road up:
 * • **the south terraces**: the Sun Road comes up past the waystone between Squint's optician's
 *   and the noon belfry; the Sunrise Bun bakes on the south-east corner beside the mill cart;
 * • **the Dusk-house** (south-west): the one licensed shade, its queue rail and its stopwatch,
 *   with the Shade-Warden's stripped awning frames along the Lantern road;
 * • **the Sun-Plaza** in the middle: a vast square of white marble with a gilt sunburst inlaid
 *   at its heart, the Despot's colossus standing on the crossing of the Sun Road and the Meridian
 *   Line (the gilt line ruled across the whole court, west to the Lantern gorge, east to the
 *   Workshop), and four sundials whose shadows never move;
 * • **the Burning Glass** (west of the plaza): the lens on its gantry over the scorched bleaching
 *   ring, the accused waiting along the rope, two Clears stood by it as a warning;
 * • **the reflecting pool** (south-east): too bright to look into;
 * • **the signal terrace** (east): Flash's mirror-posts on the Workshop road;
 * • **the north terrace**: the gilded sun-temple (north-west), Prince Lumen's glass Solarium
 *   (north-east), and between them the Sun Road climbing on to the Tribunal.
 *
 * Nothing in the court casts a shadow longer than a coin.
 */

export const NOON_W = 2400;
export const NOON_H = 1700;

const ROAD_X = 1200;
/** The Meridian Line: the gilt line across the court, and the line of the west/east exits. */
export const LINE_Y = 850;
const GAP = 80;

export const PLAZA: Rect = { x: 780, y: 560, w: 840, h: 580 };
/** The Despot's colossus at the crossing. */
export const COLOSSUS: Pt = { x: 1200, y: 862 };
/** The Burning Glass gantry's base line, and the bleaching ring under its lens. */
export const GLASS_AT: Pt = { x: 560, y: 700 };
export const BLEACH_RING: Pt = { x: 560, y: 690 };
/** The sun-temple and Prince Lumen's Solarium (middle of each front step). */
export const TEMPLE: Pt = { x: 520, y: 330 };
export const SOLARIUM: Pt = { x: 1820, y: 380 };
/** The Dusk-house and its ticket hatch. */
export const DUSK_HOUSE: Pt = { x: 430, y: 1180 };
export const DUSK_HATCH: Pt = { x: 475, y: 1210 };
/** The reflecting pool — the court's fishing water. */
export const POOL_RECT: Rect = { x: 1480, y: 1180, w: 380, h: 150 };
/** The noon belfry, the optician's, the bakery. */
export const BELFRY: Pt = { x: 1420, y: 1520 };
export const SHOP_AT: Pt = { x: 820, y: 1560 };
export const BAKERY_AT: Pt = { x: 2080, y: 1560 };
/** The Clarity notice boards where confiscated things are pinned up. */
export const NOTICES: Pt[] = [{ x: 1080, y: 1180 }, { x: 1560, y: 610 }, { x: 290, y: 1000 }, { x: 1990, y: 1250 }];

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid, when?: Piece['when']): void {
  pieces.push(when ? { x, y, w, h, draw, when } : { x, y, w, h, draw });
  if (solid) solids.push(solid);
}

/** A terrace balustrade along a top or bottom edge: marble posts and a capping rail. */
function balustrade(g: G, x0: number, x1: number, y: number): void {
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0, y - 8, x1 - x0, 8);
  for (let x = x0 + 4; x < x1 - 4; x += 12) {
    g.fillStyle(MARBLE_DARK, 1); g.fillEllipse(x + 3, y - 18, 7, 18);
    g.fillStyle(MARBLE_LIT, 1); g.fillEllipse(x + 2, y - 19, 4, 15);
  }
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0, y - 32, x1 - x0, 7);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x0, y - 33, x1 - x0, 3);
  for (let x = x0 + 60; x < x1 - 20; x += 180) {
    g.fillStyle(MARBLE, 1); g.fillRect(x - 8, y - 42, 16, 42);
    g.fillStyle(GOLD, 1); g.fillCircle(x, y - 48, 5);
    g.fillStyle(GOLD_LIT, 1); g.fillCircle(x - 1.5, y - 49.5, 1.8);
  }
}

// ── Layout ───────────────────────────────────────────────────────────

// North terrace: the sun-temple, the Solarium, two domed houses either side of the Sun Road.
addPiece(TEMPLE.x, TEMPLE.y, 380, 380, (g, rng) => sunTemple(g, TEMPLE.x, TEMPLE.y, 300, 240, rng),
  { kind: 'rect', x: TEMPLE.x - 170, y: TEMPLE.y - 34, w: 340, h: 34 });
addPiece(SOLARIUM.x, SOLARIUM.y, 620, 400, (g, rng) => solarium(g, SOLARIUM.x, SOLARIUM.y, 520, 170, rng),
  { kind: 'rect', x: SOLARIUM.x - 270, y: SOLARIUM.y - 36, w: 540, h: 36 });
addPiece(930, 250, 260, 240, (g, rng) => marbleHouse(g, 930, 250, 220, 160, { roof: 'dome' }, rng), { kind: 'rect', x: 820, y: 222, w: 220, h: 28 });
addPiece(1470, 250, 260, 240, (g, rng) => marbleHouse(g, 1470, 250, 220, 160, { roof: 'balustrade', trim: GOLD_DARK }, rng), { kind: 'rect', x: 1360, y: 222, w: 220, h: 28 });
addPiece(160, 250, 220, 220, (g, rng) => marbleHouse(g, 160, 250, 180, 150, { roof: 'glass' }, rng), { kind: 'rect', x: 70, y: 222, w: 180, h: 28 });
addPiece(2260, 250, 220, 220, (g, rng) => marbleHouse(g, 2260, 250, 180, 150, { roof: 'glass', trim: GOLD_DARK }, rng), { kind: 'rect', x: 2170, y: 222, w: 180, h: 28 });

// West and east terraces.
addPiece(150, 560, 240, 220, (g, rng) => marbleHouse(g, 150, 560, 200, 150, { roof: 'balustrade' }, rng), { kind: 'rect', x: 50, y: 532, w: 200, h: 28 });
addPiece(2260, 560, 260, 220, (g, rng) => marbleHouse(g, 2260, 560, 220, 150, { roof: 'dome', trim: GOLD_DARK }, rng), { kind: 'rect', x: 2150, y: 532, w: 220, h: 28 });
addPiece(2270, 1300, 240, 220, (g, rng) => marbleHouse(g, 2270, 1300, 200, 150, { roof: 'balustrade' }, rng), { kind: 'rect', x: 2170, y: 1272, w: 200, h: 28 });

// The Burning Glass on its gantry over the bleaching ring.
addPiece(GLASS_AT.x, GLASS_AT.y, 420, 320, (g) => burningGlass(g, GLASS_AT.x, GLASS_AT.y, 300, 230));
for (const fx of [GLASS_AT.x - 176, GLASS_AT.x - 124, GLASS_AT.x + 124, GLASS_AT.x + 176]) solids.push({ kind: 'circle', x: fx, y: GLASS_AT.y - 3, r: 10 });
// A dust-sheet over the lens once the Prince has fallen.
addPiece(GLASS_AT.x, GLASS_AT.y + 2, 260, 320, (g) => {
  const lx = GLASS_AT.x, ly = GLASS_AT.y - 230 + 230 * 0.42;
  g.fillStyle(CANVAS, 0.96); g.fillEllipse(lx, ly + 4, 210, 150);
  for (let i = -3; i <= 3; i++) { g.lineStyle(2, mixC(CANVAS, LIME_DARK, 0.4), 0.8); g.lineBetween(lx + i * 26, ly - 60, lx + i * 30, ly + 70); }
  g.lineStyle(3, BRASS_DARK, 1); g.lineBetween(lx - 104, ly + 4, lx + 104, ly + 4);
}, undefined, { prince: 'lumen' });
// The rope where the accused wait, and two Clears stood by the gantry as a warning.
for (let i = 0; i < 4; i++) addPiece(420 + i * 80, 792, 20, 50, (g) => ropePost(g, 420 + i * 80, 792), { kind: 'circle', x: 420 + i * 80, y: 790, r: 6 });
addPiece(540, 793, 260, 40, (g) => { for (let i = 0; i < 3; i++) queueRope(g, 420 + i * 80, 792, 500 + i * 80, 792); });
for (const [x, y, f] of [[352, 640, 1], [330, 708, 1], [770, 640, -1]] as [number, number, number][]) {
  addPiece(x, y, 30, 60, (g) => clearFigure(g, x, y, 1, 1, f));
}

// The colossus at the crossing, and the four sundials of the plaza.
addPiece(COLOSSUS.x, COLOSSUS.y, 120, 260, (g) => aurielStatue(g, COLOSSUS.x, COLOSSUS.y, 1.45), { kind: 'circle', x: COLOSSUS.x, y: COLOSSUS.y - 14, r: 40 });
for (const [x, y] of [[900, 660], [1500, 660], [900, 1060], [1500, 1060]] as [number, number][]) {
  addPiece(x, y, 70, 70, (g) => sundial(g, x, y, 26), { kind: 'circle', x, y: y - 8, r: 20 });
}
// Statues lining the Sun Road.
for (const [x, y] of [[1105, 480], [1295, 480], [1105, 1270], [1295, 1270]] as [number, number][]) {
  addPiece(x, y, 70, 150, (g) => aurielStatue(g, x, y, 0.85), { kind: 'circle', x, y: y - 6, r: 22 });
}

// The Dusk-house and its queue.
addPiece(DUSK_HOUSE.x, DUSK_HOUSE.y, 300, 230, (g) => duskHouse(g, DUSK_HOUSE.x, DUSK_HOUSE.y, 260, 140),
  { kind: 'rect', x: DUSK_HOUSE.x - 130, y: DUSK_HOUSE.y - 32, w: 260, h: 32 });
for (let i = 0; i < 4; i++) {
  const x = 300 + i * 70;
  addPiece(x, 1240, 20, 50, (g) => ropePost(g, x, 1240), { kind: 'circle', x, y: 1238, r: 6 });
}
addPiece(405, 1241, 220, 40, (g) => { for (let i = 0; i < 3; i++) queueRope(g, 300 + i * 70, 1240, 370 + i * 70, 1240); });
// A bench where Granny Wren sits out her lack of an hour.
addPiece(640, 1316, 90, 40, (g) => {
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(604, 1300, 72, 8);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(604, 1298, 72, 3);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(608, 1306, 6, 10); g.fillRect(666, 1306, 6, 10);
}, { kind: 'rect', x: 604, y: 1302, w: 72, h: 12 });
// The stripped awning frames along the Lantern road.
for (const [x, y] of [[380, 960], [900, 1240]] as [number, number][]) {
  addPiece(x, y, 140, 120, (g) => bareAwning(g, x, y, 120, 54));
  for (const px of [x - 60, x + 60]) solids.push({ kind: 'circle', x: px, y: y - 2, r: 5 });
}

// South terraces: the optician's, a townhouse, the waystone, the belfry, the bakery and mill cart.
addPiece(SHOP_AT.x, SHOP_AT.y, 240, 240, (g, rng) => opticianShop(g, SHOP_AT.x, SHOP_AT.y, 200, 160, rng),
  { kind: 'rect', x: SHOP_AT.x - 100, y: SHOP_AT.y - 28, w: 200, h: 28 });
addPiece(250, 1600, 260, 220, (g, rng) => marbleHouse(g, 250, 1600, 220, 140, { roof: 'dome' }, rng), { kind: 'rect', x: 140, y: 1572, w: 220, h: 28 });
addPiece(1060, 1600, 50, 120, (g) => sunWaystone(g, 1060, 1600), { kind: 'circle', x: 1060, y: 1594, r: 16 });
addPiece(BELFRY.x, BELFRY.y, 110, 200, (g) => noonBelfry(g, BELFRY.x, BELFRY.y, 170), { kind: 'rect', x: BELFRY.x - 36, y: BELFRY.y - 26, w: 72, h: 26 });
addPiece(BAKERY_AT.x, BAKERY_AT.y, 280, 220, (g, rng) => sunriseBunBakery(g, BAKERY_AT.x, BAKERY_AT.y, 240, 120, rng),
  { kind: 'rect', x: BAKERY_AT.x - 120, y: BAKERY_AT.y - 28, w: 240, h: 28 });
addPiece(1860, 1600, 140, 80, (g) => flourCart(g, 1860, 1600), { kind: 'rect', x: 1818, y: 1586, w: 84, h: 14 });

// The signal terrace: Flash's spare mirror-posts.
const SIGNAL_POSTS: Pt[] = [{ x: 2140, y: 700 }, { x: 2250, y: 1010 }, { x: 1960, y: 1080 }];
SIGNAL_POSTS.forEach((p, i) => {
  const q = SIGNAL_POSTS[(i + 1) % SIGNAL_POSTS.length];
  addPiece(p.x, p.y, 60, 90, (g) => mirrorPost(g, p.x, p.y, Math.atan2(q.y - p.y, q.x - p.x)), { kind: 'circle', x: p.x, y: p.y - 4, r: 10 });
});

// Clarity notices, lamps that are never lit, and straw urns.
for (const n of NOTICES) addPiece(n.x, n.y, 50, 90, (g) => clarityNotice(g, n.x, n.y), { kind: 'circle', x: n.x, y: n.y - 2, r: 6 });
for (const [x, y] of [[1140, 1390], [1260, 1390], [1140, 1500], [1260, 1500], [1140, 160], [1260, 160], [1140, 320], [1260, 320], [300, 820], [700, 880], [1700, 820], [2100, 880]] as [number, number][]) {
  addPiece(x, y, 24, 100, (g) => noonLamp(g, x, y), { kind: 'circle', x, y: y - 2, r: 5 });
}
for (const [x, y] of [[790, 570], [1610, 570], [790, 1140], [1610, 1140], [1540, 440], [2100, 440], [640, 1480], [1000, 1480]] as [number, number][]) {
  addPiece(x, y, 40, 60, (g, rng) => strawUrn(g, x, y, 1, rng), { kind: 'circle', x, y: y - 6, r: 13 });
}

// The terrace edges: balustrades north and south, plain walls west and east.
for (const [x0, x1] of [[0, ROAD_X - 70], [ROAD_X + 70, NOON_W]] as [number, number][]) {
  addPiece((x0 + x1) / 2, 34, x1 - x0, 60, (g) => balustrade(g, x0, x1, 34), { kind: 'rect', x: x0, y: 0, w: x1 - x0, h: 34 });
  addPiece((x0 + x1) / 2, NOON_H, x1 - x0, 60, (g) => balustrade(g, x0, x1, NOON_H), { kind: 'rect', x: x0, y: NOON_H - 26, w: x1 - x0, h: 26 });
}
solids.push({ kind: 'rect', x: 0, y: 0, w: 30, h: LINE_Y - GAP });
solids.push({ kind: 'rect', x: 0, y: LINE_Y + GAP, w: 30, h: NOON_H - LINE_Y - GAP });
solids.push({ kind: 'rect', x: NOON_W - 30, y: 0, w: 30, h: LINE_Y - GAP });
solids.push({ kind: 'rect', x: NOON_W - 30, y: LINE_Y + GAP, w: 30, h: NOON_H - LINE_Y - GAP });
// The pool.
solids.push({ kind: 'rect', x: POOL_RECT.x - 14, y: POOL_RECT.y - 14, w: POOL_RECT.w + 28, h: POOL_RECT.h + 26 });

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 160): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

/** Glints that slide over glass and gold in `animate`. */
const GLINTS: { x: number; y: number; s: number }[] = [
  { x: SOLARIUM.x - 40, y: SOLARIUM.y - 280, s: 0.1 }, { x: SOLARIUM.x + 120, y: SOLARIUM.y - 120, s: 0.5 },
  { x: TEMPLE.x - 50, y: TEMPLE.y - 300, s: 0.3 }, { x: 930, y: 60, s: 0.7 }, { x: GLASS_AT.x - 40, y: GLASS_AT.y - 150, s: 0.9 },
  { x: BELFRY.x - 10, y: BELFRY.y - 150, s: 0.2 }, { x: COLOSSUS.x, y: COLOSSUS.y - 190, s: 0.6 },
];

const painter: AreaPainter = {
  ground(g, rng) {
    const W = NOON_W, H = NOON_H;
    // Warm limestone streets everywhere, laid in smaller setts.
    marbleSlabs(g, { x: 0, y: 0, w: W, h: H }, 56, rng, LIME_LIT);
    // The east and west terrace walls, seen from above.
    for (const x0 of [0, W - 30]) {
      for (const [y0, y1] of [[0, LINE_Y - GAP], [LINE_Y + GAP, H]] as [number, number][]) {
        g.fillStyle(LIME_DARK, 1); g.fillRect(x0, y0, 30, y1 - y0);
        g.fillStyle(LIME, 1); g.fillRect(x0 + 3, y0, 24, y1 - y0);
        g.fillStyle(MARBLE_LIT, 0.7); g.fillRect(x0 + (x0 ? 3 : 23), y0, 4, y1 - y0);
      }
    }
    // The Sun Road: great white slabs edged in gold, quay to Tribunal.
    marbleSlabs(g, { x: ROAD_X - 70, y: 0, w: 140, h: H }, 70, rng);
    g.lineStyle(3, GOLD_DARK, 0.8); g.lineBetween(ROAD_X - 70, 0, ROAD_X - 70, H); g.lineBetween(ROAD_X + 70, 0, ROAD_X + 70, H);
    g.lineStyle(1.5, GOLD_LIT, 0.8); g.lineBetween(ROAD_X - 69, 0, ROAD_X - 69, H); g.lineBetween(ROAD_X + 71, 0, ROAD_X + 71, H);
    // The Meridian Line road across the court.
    marbleSlabs(g, { x: 0, y: LINE_Y - 60, w: W, h: 120 }, 60, rng);
    // The Sun-Plaza.
    marbleSlabs(g, PLAZA, 96, rng);
    kerb(g, PLAZA);
    sunburstInlay(g, COLOSSUS.x, LINE_Y, 360, 24, 0.62, 0.8);
    // The gilt Meridian Line itself, ruled the whole width of the court.
    g.lineStyle(4, GOLD_DARK, 0.9); g.lineBetween(0, LINE_Y, W, LINE_Y);
    g.lineStyle(1.5, GOLD_LIT, 1); g.lineBetween(0, LINE_Y - 1, W, LINE_Y - 1);
    for (let x = 40; x < W; x += 120) { g.fillStyle(GOLD, 1); g.fillCircle(x, LINE_Y, 4); }
    // Forecourts: the Solarium's of gold-veined marble, the temple's of white.
    marbleSlabs(g, { x: SOLARIUM.x - 300, y: SOLARIUM.y, w: 600, h: 120 }, 60, rng, MARBLE);
    for (let x = SOLARIUM.x - 290; x < SOLARIUM.x + 300; x += 60) { g.lineStyle(1, GOLD, 0.6); g.lineBetween(x, SOLARIUM.y, x + 30, SOLARIUM.y + 120); }
    marbleSlabs(g, { x: TEMPLE.x - 200, y: TEMPLE.y, w: 400, h: 110 }, 60, rng, MARBLE);
    // The bleaching ring under the lens.
    bleachRing(g, BLEACH_RING.x, BLEACH_RING.y, 64);
    // A dark stain of feet in front of the Dusk-house, where the queue has stood for twenty-two years.
    for (let i = 0; i < 40; i++) {
      const x = 300 + rng() * 260, y = 1200 + rng() * 60;
      g.fillStyle(LIME_DARK, 0.25); g.fillEllipse(x, y, 10, 5);
    }
    // The reflecting pool.
    reflectingPool(g, POOL_RECT, rng);
    // The bakery's doorstep, flour-dusted.
    for (let i = 0; i < 30; i++) { g.fillStyle(0xffffff, 0.5); g.fillCircle(BAKERY_AT.x + 40 + (rng() - 0.5) * 80, BAKERY_AT.y + 6 + rng() * 30, 1.5 + rng() * 2); }
    // Grout lines darker near the edges — the terrace's age.
    g.lineStyle(2, GROUT, 0.6); g.strokeRect(36, 40, W - 72, H - 80);
  },

  pieces,

  animate(g, t, view, world) {
    // The Burning Glass's focus creeping round the bleaching ring (still while the lens is sheeted).
    if (inView(BLEACH_RING.x, BLEACH_RING.y, view, 200) && !world.test({ prince: 'lumen' })) {
      const a = t * 0.6;
      const x = BLEACH_RING.x + Math.cos(a) * 30, y = BLEACH_RING.y + Math.sin(a) * 16;
      const heat = 0.5 + 0.5 * Math.sin(t * 1.3);
      g.fillStyle(mixC(GOLD_LIT, 0xffffff, heat), 0.35 + heat * 0.25); g.fillEllipse(x, y, 40, 24);
      g.fillStyle(0xffffff, 0.5 + heat * 0.4); g.fillEllipse(x, y, 12, 7);
      g.fillStyle(BEAM, 0.06); g.fillTriangle(GLASS_AT.x - 70, GLASS_AT.y - 140, GLASS_AT.x + 70, GLASS_AT.y - 140, x, y);
    }
    // The pool: shimmer bars sliding over it, and dark fish-shapes turning under the glare.
    if (inView(POOL_RECT.x + POOL_RECT.w / 2, POOL_RECT.y + POOL_RECT.h / 2, view, 300)) {
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.25 + i / 6) % 1;
        const x = POOL_RECT.x + 20 + ph * (POOL_RECT.w - 40), y = POOL_RECT.y + 16 + ((i * 41) % (POOL_RECT.h - 32));
        g.lineStyle(2, POOL_GLINT, 0.8 * Math.sin(ph * Math.PI)); g.lineBetween(x - 14, y, x + 14, y);
      }
      for (let i = 0; i < 4; i++) {
        const a = t * (0.3 + i * 0.07) + i * 1.7;
        const x = POOL_RECT.x + POOL_RECT.w / 2 + Math.cos(a) * (POOL_RECT.w * 0.34 - i * 12), y = POOL_RECT.y + POOL_RECT.h / 2 + Math.sin(a) * (POOL_RECT.h * 0.3 - i * 4);
        fishShape(g, x, y, i === 0 ? 26 : 14 + i * 2, a + Math.PI / 2, 0.35 + Math.sin(t * 2 + i) * 0.1);
      }
    }
    // Rainbows off the Solarium's crystal dome, sliding over its forecourt.
    if (inView(SOLARIUM.x, SOLARIUM.y + 60, view, 300)) {
      for (let b = 0; b < 2; b++) {
        const x0 = SOLARIUM.x - 260 + ((t * 18 + b * 260) % 520);
        for (let i = 0; i < SPECTRUM.length; i++) { g.lineStyle(5, SPECTRUM[i], 0.12); g.lineBetween(x0 + i * 5, SOLARIUM.y + 6, x0 + i * 5 + 50, SOLARIUM.y + 110); }
      }
    }
    // Heat shimmer over the open plaza.
    if (inView(PLAZA.x + PLAZA.w / 2, PLAZA.y + PLAZA.h / 2, view, 400)) {
      for (let i = 0; i < 9; i++) {
        const ph = (t * 0.45 + i * 0.111) % 1;
        const x = PLAZA.x + 40 + ((i * 197) % (PLAZA.w - 80)), y = PLAZA.y + 40 + ((i * 113) % (PLAZA.h - 80)) - ph * 30;
        g.lineStyle(1.2, SUN, 0.3 * Math.sin(ph * Math.PI));
        g.beginPath();
        for (let k = 0; k <= 8; k++) { const px = x + k * 7, py = y + Math.sin(k * 0.9 + t * 4) * 2; if (k === 0) g.moveTo(px, py); else g.lineTo(px, py); }
        g.strokePath();
      }
    }
    // Flash's posts passing a signal round the terrace.
    if (inView(2120, 900, view, 300)) {
      const k = Math.floor(t * 1.4) % SIGNAL_POSTS.length;
      const p = SIGNAL_POSTS[k], q = SIGNAL_POSTS[(k + 1) % SIGNAL_POSTS.length];
      const ph = (t * 1.4) % 1;
      if (Math.floor(t * 9) % 3 !== 0) { g.lineStyle(2, GOLD_LIT, 0.6 * (1 - ph)); g.lineBetween(p.x, p.y - 54, q.x, q.y - 54); }
      glint(g, p.x, p.y - 54, 8 * (1 - ph) + 2, 0.8);
    }
    // After the Despot falls, somebody lights the lamps — in daylight, out of spite, because they can.
    if (world.test({ monarch: 'auriel' })) {
      for (const [x, y] of [[1140, 1390], [1260, 1390], [1140, 1500], [1260, 1500], [300, 820], [700, 880], [1700, 820], [2100, 880]] as [number, number][]) {
        if (inView(x, y, view)) glow(g, x, y - 72, 18, 0xffc870, 0.1, 3);
      }
    }
  },

  animateOver(g, t, view) {
    // The sun catching edges: glints sliding over domes, lens and bell.
    for (const s of GLINTS) {
      if (!inView(s.x, s.y, view, 200)) continue;
      const ph = (t * 0.35 + s.s) % 1;
      if (ph < 0.25) glint(g, s.x, s.y, 14 * Math.sin((ph / 0.25) * Math.PI), 0.9);
    }
    // Glare dazzle: bright flecks drifting over the white stone.
    for (let i = 0; i < 18; i++) {
      const x = view.x + ((i * 233 + t * 14) % view.w), y = view.y + ((i * 151 + Math.sin(t * 0.5 + i) * 30) % view.h);
      const tw = Math.max(0, Math.sin(t * 2.2 + i * 1.7));
      g.fillStyle(0xffffff, 0.35 * tw); g.fillCircle(x, y, 1.4 + tw);
    }
  },
};

export const NOON_AREA: AreaDef = {
  id: 'noon',
  isle: 'light',
  court: 'noon',
  name: 'The Noon Court',
  subtitle: 'No shade longer than a coin',
  w: NOON_W,
  h: NOON_H,
  bg: LIME,
  accent: NOON_COLOR,
  weather: 'glare',
  spawn: { x: 1200, y: 1600 },
  painter,
  solids,
  exits: [
    { side: 's', to: 'meridian', label: 'Down the Sun Road to Meridian Quay' },
    { side: 'n', to: 'tribunal', label: 'Up the Sun Road to the Tribunal' },
    { side: 'w', to: 'lantern', at: LINE_Y, label: 'The Meridian Line west to the Lantern Court' },
    { side: 'e', to: 'workshop', at: LINE_Y, label: 'The Meridian Line east to the Workshop Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 1060, y: 1640 } },
    { kind: 'prince', id: 'lumen', at: { x: SOLARIUM.x, y: SOLARIUM.y + 50 } },
    { kind: 'water', id: 'noon-pool', shape: POOL_RECT, fishery: 'noon-pool' },
    { kind: 'encounter', id: 'noon-burning-glass' },
    { kind: 'encounter', id: 'noon-high-noon' },
    { kind: 'encounter', id: 'noon-awnings' },
    { kind: 'encounter', id: 'noon-heliograph' },
    { kind: 'encounter', id: 'noon-sun-dogs' },
    {
      kind: 'sign', at: { x: 1300, y: 1620 },
      text: 'CLARITY. Doors shall be glass. Curtains are contraband. Shutters stay open. What is not seen is a lie.',
    },
    {
      kind: 'sign', at: { x: 600, y: 1240 },
      text: 'THE DUSK-HOUSE. One hour of shade per household per day, on presentation of the Dusk Ticket. Time kept by the Clerk.',
    },
    {
      kind: 'sign', at: { x: 330, y: 790 },
      text: 'THE BURNING GLASS. Shade-thieves found guilty at the Tribunal are held in the focus until Clear.',
    },
    {
      kind: 'sign', at: { x: 1290, y: 120 },
      text: 'TO THE TRIBUNAL. The Courthouse of Clarity sits at all hours. All hours are noon.',
    },
    { kind: 'chest', id: 'noon-chest-dusk', at: { x: 170, y: 1160 }, coins: 140 },
    { kind: 'chest', id: 'noon-chest-solarium', at: { x: 2180, y: 460 }, orbs: 2, open: { prince: 'lumen' } },
  ],
  npcs: NOON_NPCS,
  crowd: NOON_CROWD,
};
