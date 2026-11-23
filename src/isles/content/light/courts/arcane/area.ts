import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { glow, lit, type G } from '../../../../art/IsleArt';
import {
  academy, anchorPylon, arcaneWaystone, balustrade, bookStack, candle, decreeBoard, familiarStall, fontBasin, fontSurface,
  marbleWalk, observatory, orrery, potionStall, rune, runestone, scribeTable, sigilCircle, slateBoard, slatePaving,
} from './art';
import {
  ARCANE_COLOR, CHALK, FONT, GOLD, GOLD_LIT, MANA, MANA_LIT, MARBLE, MARBLE_DARK, MARBLE_LIT, MARBLE_SHADE, POTIONS,
  SCORCH, SEA, SEA_GLARE, SLATE_DARK, SLATE_DEEP,
} from './palette';
import { ARCANE_CROWD, ARCANE_NPCS } from './npcs';

/**
 * The Arcane Court — the mages' town on Solmara's south-east terrace, whose sigils hold the
 * Heliostat's mirrors to the sun.
 *
 * Read it from the Meridian road in (west):
 * • **the Sigil Gate** (west): the road comes in past the waystone and the Bureau of Clarity's
 *   decree board, and Abjurer Null stands in it reading every spell that passes;
 * • **the stargazers' lawn** (north-west): two observatory towers that have pointed at nothing for
 *   twenty-two years, their scopes capped in smoked glass, an orrery between them — Fizzle's lawn;
 * • **the familiar market** (south-west): three stalls of cats, owls and toads in wicker cages;
 * • **the Anchor Circle** (centre): the great sigil burned into the slate, ringed with brass
 *   anchor-pylons, a shaft of light standing up out of it north toward the Heliostat — the thing
 *   that holds the mirrors. The road north to the Workshop runs out of it;
 * • **the Mana Font** (south): a marble basin of liquid light, Wellspring kneeling at its rim and
 *   Wren's scribing table beside it;
 * • **the potion row** (south-east): alembics bubbling under awnings slit into ribbons, and
 *   Bellamy Thrice's charm stall down the lane;
 * • **the Academy** (north-east): the Spellwrights' Academy, its gilded lecture dome — Prince
 *   Sigil's hall — and Evoke's pentacle on the east road before it.
 *
 * The whole court is paved in slate, scored with circles. The south edge is the sea cliff.
 */

export const ARCANE_W = 2400;
export const ARCANE_H = 1600;

const ROAD_Y = 800;
const NORTH_X = 1200;
const EAST_Y = 700;

/** The Anchor Circle: the great sigil. */
export const ANCHOR: Pt = { x: 1200, y: 700 };
const ANCHOR_R = 230;
const SQUASH = 0.62;
/** The Mana Font — the court's fishing water. */
export const FONT_RECT: Rect = { x: 1050, y: 1090, w: 300, h: 160 };
const FONT_C: Pt = { x: FONT_RECT.x + FONT_RECT.w / 2, y: FONT_RECT.y + FONT_RECT.h / 2 };
/** The Academy front step (Prince Sigil's hall). */
export const ACADEMY: Pt = { x: 1850, y: 440 };
/** Evoke's pentacle on the east road. */
export const PENTACLE: Pt = { x: 2060, y: 700 };
/** Where Ambrose stands at his chalked lectern. */
export const LECTERN: Pt = { x: 1540, y: 600 };

/** The six anchor-pylons round the circle. */
export const PYLONS: Pt[] = [-150, -110, -70, -30, 60, 120].map((d) => {
  const a = (d * Math.PI) / 180;
  return { x: Math.round(ANCHOR.x + Math.cos(a) * (ANCHOR_R + 40)), y: Math.round(ANCHOR.y + Math.sin(a) * (ANCHOR_R + 40) * SQUASH) };
});

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

// ── Layout ───────────────────────────────────────────────────────────

// The Academy.
addPiece(ACADEMY.x, ACADEMY.y, 640, 460, (g, rng) => academy(g, ACADEMY.x, ACADEMY.y, 560, rng),
  { kind: 'rect', x: ACADEMY.x - 285, y: ACADEMY.y - 72, w: 570, h: 40 });
for (const [x, n] of [[1610, 5], [2100, 4]] as [number, number][]) {
  addPiece(x, 480, 30, 40, (g, rng) => bookStack(g, x, 480, n, rng), { kind: 'circle', x, y: 476, r: 10 });
}

// The stargazers' lawn: two observatories and the orrery between.
addPiece(380, 400, 220, 360, (g, rng) => observatory(g, 380, 400, 1.15, rng, -0.8), { kind: 'rect', x: 380 - 72, y: 368, w: 144, h: 32 });
addPiece(780, 320, 180, 300, (g, rng) => observatory(g, 780, 320, 0.9, rng, -2.3), { kind: 'rect', x: 780 - 56, y: 295, w: 112, h: 25 });
addPiece(600, 470, 80, 100, (g) => orrery(g, 600, 470, 1.1), { kind: 'circle', x: 600, y: 462, r: 16 });
addPiece(250, 560, 80, 100, (g, rng) => slateBoard(g, 250, 560, 74, rng), { kind: 'rect', x: 220, y: 550, w: 60, h: 10 });

// The Sigil Gate: waystone and decree board.
addPiece(200, 700, 60, 80, (g) => arcaneWaystone(g, 200, 700), { kind: 'circle', x: 200, y: 694, r: 16 });
addPiece(330, 900, 80, 110, (g, rng) => decreeBoard(g, 330, 900, rng), { kind: 'rect', x: 322, y: 892, w: 16, h: 8 });

// The anchor-pylons round the circle.
for (const p of PYLONS) addPiece(p.x, p.y, 40, 130, (g) => anchorPylon(g, p.x, p.y, 1), { kind: 'circle', x: p.x, y: p.y - 6, r: 15 });

// The familiar market.
const STALLS: [number, 'cat' | 'owl' | 'toad'][] = [[360, 'cat'], [540, 'owl'], [720, 'toad']];
for (const [x, kind] of STALLS) addPiece(x, 1150, 140, 150, (g, rng) => familiarStall(g, x, 1150, kind, rng), { kind: 'rect', x: x - 55, y: 1122, w: 110, h: 28 });

// The Mana Font and Wren's table.
addPiece(930, 1300, 100, 60, (g, rng) => scribeTable(g, 930, 1300, rng), { kind: 'rect', x: 886, y: 1280, w: 88, h: 20 });

// The potion row and Thrice's stall.
[1700, 1880, 2060].forEach((x, i) => addPiece(x, 1030, 140, 150, (g, rng) => potionStall(g, x, 1030, rng, i * 2), { kind: 'rect', x: x - 60, y: 1002, w: 120, h: 28 }));
addPiece(2000, 1290, 140, 150, (g, rng) => potionStall(g, 2000, 1290, rng, 3), { kind: 'rect', x: 1940, y: 1262, w: 120, h: 28 });

// Ambrose's lectern-board and the Academy's street boards.
addPiece(LECTERN.x - 60, LECTERN.y + 10, 80, 100, (g, rng) => slateBoard(g, LECTERN.x - 60, LECTERN.y + 10, 66, rng), { kind: 'rect', x: LECTERN.x - 86, y: LECTERN.y, w: 52, h: 10 });
addPiece(2250, 560, 80, 100, (g, rng) => slateBoard(g, 2250, 560, 70, rng), { kind: 'rect', x: 2222, y: 550, w: 56, h: 10 });
addPiece(2260, 1460, 80, 100, (g) => orrery(g, 2260, 1460, 0.9), { kind: 'circle', x: 2260, y: 1454, r: 14 });

// ── Edges: balustrade north (gap for the Workshop road) and along the sea cliff; walls east and west ──

const GAP = 110;
for (const [x0, x1] of [[0, NORTH_X - GAP], [NORTH_X + GAP, ARCANE_W]] as [number, number][]) {
  addPiece((x0 + x1) / 2, 64, x1 - x0, 60, (g) => balustrade(g, x0, 64, x1 - x0), { kind: 'rect', x: x0, y: 0, w: x1 - x0, h: 58 });
}
addPiece(ARCANE_W / 2, ARCANE_H - 6, ARCANE_W, 60, (g) => balustrade(g, 0, ARCANE_H - 6, ARCANE_W), { kind: 'rect', x: 0, y: ARCANE_H - 40, w: ARCANE_W, h: 40 });
solids.push({ kind: 'rect', x: 0, y: 0, w: 30, h: ROAD_Y - GAP });
solids.push({ kind: 'rect', x: 0, y: ROAD_Y + GAP, w: 30, h: ARCANE_H - ROAD_Y - GAP });
solids.push({ kind: 'rect', x: ARCANE_W - 30, y: 0, w: 30, h: ARCANE_H });
// The Font's basin keeps you to its rim.
solids.push({ kind: 'rect', x: FONT_RECT.x - 18, y: FONT_RECT.y - 16, w: FONT_RECT.w + 36, h: FONT_RECT.h + 32 });

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 160): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

/** Floating runestones: where each hangs, its rune, its bob phase. */
const RUNESTONES: { x: number; y: number; s: number; idx: number; ph: number }[] = [
  { x: 1120, y: 300, s: 1, idx: 0, ph: 0 }, { x: 1290, y: 240, s: 0.9, idx: 3, ph: 1.4 }, { x: 1110, y: 160, s: 0.8, idx: 6, ph: 2.6 },
  { x: 470, y: 640, s: 0.9, idx: 1, ph: 0.7 }, { x: 860, y: 520, s: 1.1, idx: 4, ph: 3.1 },
  { x: 1500, y: 1250, s: 0.9, idx: 2, ph: 1.9 }, { x: 900, y: 1150, s: 1, idx: 5, ph: 0.4 },
  { x: 2250, y: 860, s: 1.05, idx: 7, ph: 2.2 }, { x: 2300, y: 1180, s: 0.85, idx: 2, ph: 4.0 }, { x: 1560, y: 860, s: 0.9, idx: 6, ph: 5.1 },
  { x: 150, y: 1000, s: 0.95, idx: 3, ph: 2.9 }, { x: 160, y: 420, s: 0.85, idx: 0, ph: 1.1 },
];
/** Evoke's five candles. */
const PENT_PTS: Pt[] = [0, 1, 2, 3, 4].map((i) => {
  const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
  return { x: PENTACLE.x + Math.cos(a) * 84, y: PENTACLE.y + Math.sin(a) * 84 * 0.6 };
});

const painter: AreaPainter = {
  ground(g, rng) {
    const W = ARCANE_W, H = ARCANE_H;
    slatePaving(g, { x: 0, y: 0, w: W, h: H }, rng, 56);

    // The sea beyond the cliff, glaring, under the south balustrade.
    g.fillStyle(SEA, 1); g.fillRect(0, H - 40, W, 40);
    g.fillStyle(SEA_GLARE, 0.8); for (let x = 0; x < W; x += 40) g.fillRect(x + rng() * 20, H - 34 + rng() * 26, 14 + rng() * 10, 2);
    g.fillStyle(MARBLE_SHADE, 1); g.fillRect(0, H - 52, W, 14);
    // The walls east and west, marble seen from above.
    for (const [x0, segs] of [[0, [[0, ROAD_Y - GAP], [ROAD_Y + GAP, H]]], [W - 30, [[0, H]]]] as [number, number[][]][]) {
      for (const [y0, y1] of segs) {
        g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0, y0, 30, y1 - y0);
        g.fillStyle(MARBLE, 1); g.fillRect(x0 + 3, y0, 24, y1 - y0);
        g.fillStyle(GOLD, 0.6); g.fillRect(x0 + (x0 ? 3 : 25), y0, 2, y1 - y0);
      }
    }

    // The roads, marble over the slate.
    marbleWalk(g, 0, ROAD_Y, ANCHOR.x - ANCHOR_R + 20, ROAD_Y, 90, rng);
    marbleWalk(g, NORTH_X, 0, NORTH_X, ANCHOR.y - ANCHOR_R * SQUASH + 10, 86, rng);
    marbleWalk(g, ANCHOR.x + ANCHOR_R - 20, EAST_Y, W - 40, EAST_Y, 80, rng);
    marbleWalk(g, ACADEMY.x, ACADEMY.y + 4, ACADEMY.x, EAST_Y - 40, 74, rng);
    marbleWalk(g, NORTH_X, ANCHOR.y + ANCHOR_R * SQUASH - 10, NORTH_X, FONT_RECT.y - 40, 80, rng);
    marbleWalk(g, 560, 470, 560, ROAD_Y - 45, 60, rng);
    marbleWalk(g, 540, ROAD_Y + 45, 540, 1240, 60, rng);
    marbleWalk(g, 250, 1240, 840, 1240, 60, rng);
    marbleWalk(g, 1450, 1080, 2300, 1080, 64, rng);
    marbleWalk(g, 1490, 1080, 1490, 1170, 60, rng);
    marbleWalk(g, 2000, 1110, 2000, 1290, 56, rng);
    marbleWalk(g, 1540, EAST_Y + 40, 1540, 640, 56, rng);

    // The Font's plaza: a ring of white marble with a gilt meander.
    g.fillStyle(MARBLE_SHADE, 1); g.fillEllipse(FONT_C.x, FONT_C.y, 600, 380);
    g.fillStyle(MARBLE, 1); g.fillEllipse(FONT_C.x, FONT_C.y, 588, 368);
    g.lineStyle(2, GOLD, 0.6); g.strokeEllipse(FONT_C.x, FONT_C.y, 560, 344);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      g.lineStyle(1.2, GOLD, 0.5);
      const x1 = FONT_C.x + Math.cos(a) * 268, y1 = FONT_C.y + Math.sin(a) * 164;
      g.lineBetween(x1, y1, FONT_C.x + Math.cos(a + 0.06) * 276, FONT_C.y + Math.sin(a + 0.06) * 170);
    }
    fontBasin(g, FONT_RECT, rng);

    // The Anchor Circle: a great sigil burned into the slate, then chalked, then burned again.
    g.fillStyle(SCORCH, 0.18); g.fillEllipse(ANCHOR.x, ANCHOR.y, ANCHOR_R * 2.5, ANCHOR_R * 2.5 * SQUASH);
    sigilCircle(g, ANCHOR.x, ANCHOR.y, ANCHOR_R, SQUASH, GOLD, 1, 6, 0);
    sigilCircle(g, ANCHOR.x, ANCHOR.y, ANCHOR_R * 0.55, SQUASH, CHALK, 0.8, 5, 4);
    // The spokes out to each pylon.
    for (const p of PYLONS) { g.lineStyle(3, GOLD, 0.45); g.lineBetween(ANCHOR.x, ANCHOR.y, p.x, p.y - 4); }
    g.fillStyle(MARBLE_LIT, 1); g.fillEllipse(ANCHOR.x, ANCHOR.y, 54, 54 * SQUASH);
    g.lineStyle(2, GOLD, 1); g.strokeEllipse(ANCHOR.x, ANCHOR.y, 54, 54 * SQUASH);

    // Evoke's pentacle on the east road.
    g.fillStyle(SCORCH, 0.3); g.fillEllipse(PENTACLE.x, PENTACLE.y, 210, 126);
    g.lineStyle(2, CHALK, 0.85); g.strokeEllipse(PENTACLE.x, PENTACLE.y, 196, 118);
    for (let i = 0; i < 5; i++) { const a = PENT_PTS[i], b = PENT_PTS[(i + 2) % 5]; g.lineStyle(2, CHALK, 0.8); g.lineBetween(a.x, a.y, b.x, b.y); }
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; rune(g, PENTACLE.x + Math.cos(a) * 106, PENTACLE.y + Math.sin(a) * 64, 4, i, CHALK, 0.6, 1.1); }

    // Practice circles on the stargazers' lawn and in the market, small and scuffed.
    for (const [x, y, r] of [[430, 560, 50], [780, 450, 40], [300, 1340, 46], [760, 1380, 38], [2240, 1000, 44], [1700, 1400, 52]] as [number, number, number][]) {
      sigilCircle(g, x, y, r, 0.6, rng() < 0.5 ? GOLD : CHALK, 0.45, rng() < 0.5 ? 5 : 6, x);
    }
    // Ambrose's chalked lectern circle.
    g.lineStyle(1.5, CHALK, 0.7); g.strokeEllipse(LECTERN.x, LECTERN.y + 6, 120, 60);
    // The Academy forecourt: chequered marble and slate.
    for (let y = 450; y < 520; y += 24) {
      for (let x = 1590; x < 2110; x += 24) {
        const k = ((x - 1590) / 24 + (y - 450) / 24) % 2;
        g.fillStyle(k ? MARBLE : SLATE_DEEP, 0.9); g.fillRect(x, y, 24, 24);
      }
    }
    g.lineStyle(2, GOLD, 0.7); g.strokeRect(1590, 450, 520, 72);
    // Pigment of spilled potions under the stalls.
    for (const x of [1700, 1880, 2060, 2000]) {
      for (let i = 0; i < 4; i++) { g.fillStyle(POTIONS[(i + x) % POTIONS.length], 0.18); g.fillEllipse(x + (rng() - 0.5) * 100, (x === 2000 ? 1300 : 1040) + rng() * 20, 20 + rng() * 20, 6 + rng() * 6); }
    }
  },

  pieces,

  animate(g, t, view) {
    // The Anchor Circle's rune ring turning, and the shaft of light it throws north.
    if (inView(ANCHOR.x, ANCHOR.y, view, 320)) {
      for (let i = 0; i < 18; i++) {
        const a = t * 0.12 + (i / 18) * Math.PI * 2;
        const pulse = 0.5 + Math.sin(t * 2 + i) * 0.3;
        rune(g, ANCHOR.x + Math.cos(a) * ANCHOR_R * 0.72, ANCHOR.y + Math.sin(a) * ANCHOR_R * 0.72 * SQUASH, 6, i, MANA_LIT, pulse, 1.6);
      }
      for (const p of PYLONS) {
        const k = 0.5 + Math.sin(t * 3 + p.x) * 0.5;
        g.lineStyle(2, MANA, 0.18 + k * 0.2); g.lineBetween(ANCHOR.x, ANCHOR.y, p.x, p.y - 4);
        glow(g, p.x, p.y - 112, 12, MANA, 0.04 + k * 0.05, 2);
      }
      glow(g, ANCHOR.x, ANCHOR.y, 70, FONT, 0.04, 4);
    }
    // The Font's surface.
    if (inView(FONT_C.x, FONT_C.y, view, 300)) fontSurface(g, FONT_RECT, t);
    // Runestones.
    for (const r of RUNESTONES) if (inView(r.x, r.y, view)) runestone(g, r.x, r.y, r.s, r.idx, t, r.ph);
    // Evoke's candles, always lit (in the old colour — orange).
    if (inView(PENTACLE.x, PENTACLE.y, view, 200)) for (const p of PENT_PTS) candle(g, p.x, p.y, 0.9, 0xff8a3a, t * 1000);
    // Bubbles rising in the alembics.
    for (const x of [1700, 1880, 2060, 2000]) {
      const by = x === 2000 ? 1290 : 1030;
      if (!inView(x, by, view)) continue;
      const ax = x + 26, ay = by - 48;
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.9 + i / 3 + x * 0.001) % 1;
        g.fillStyle(0xffffff, 0.7 * (1 - ph)); g.fillCircle(ax - 3 + i * 3, ay + 4 - ph * 10, 1.4);
      }
      const ph2 = (t * 0.5 + x * 0.003) % 1;
      g.fillStyle(0xe8f0f8, 0.4 * (1 - ph2)); g.fillCircle(ax + 4 + Math.sin(t * 2) * 3, ay - 24 - ph2 * 30, 4 + ph2 * 6);
    }
    // Glints sliding over the observatory scopes' smoked glass.
    for (const [x, y] of [[380, 400], [780, 320]] as [number, number][]) {
      if (!inView(x, y - 200, view, 300)) continue;
      const ph = (t * 0.2 + x * 0.002) % 1;
      g.fillStyle(0xffffff, 0.4 * Math.sin(ph * Math.PI)); g.fillCircle(x + (x === 380 ? 60 : -55), y - (x === 380 ? 330 : 270), 3);
    }
  },

  animateOver(g, t, view) {
    // The shaft of light standing up out of the Anchor Circle, toward the Heliostat in the north.
    if (inView(ANCHOR.x, ANCHOR.y - 300, view, 400)) {
      const w = 26 + Math.sin(t * 1.7) * 4;
      g.fillStyle(FONT, 0.1); g.fillRect(ANCHOR.x - w, ANCHOR.y - 700, w * 2, 700);
      g.fillStyle(0xffffff, 0.16); g.fillRect(ANCHOR.x - w * 0.35, ANCHOR.y - 700, w * 0.7, 700);
      for (let i = 0; i < 8; i++) {
        const ph = (t * 0.25 + i / 8) % 1;
        g.fillStyle(GOLD_LIT, 0.7 * Math.sin(ph * Math.PI)); g.fillCircle(ANCHOR.x + Math.sin(t + i * 2) * w * 0.7, ANCHOR.y - ph * 700, 1.8);
      }
    }
    // Liquid light spraying over the Font.
    if (inView(FONT_C.x, FONT_C.y, view, 260)) {
      for (let i = 0; i < 10; i++) {
        const ph = (t * 0.5 + i / 10) % 1;
        g.fillStyle(lit(FONT, 0.4), 0.6 * Math.sin(ph * Math.PI)); g.fillCircle(FONT_C.x + Math.cos(i * 2.4) * 40 * ph, FONT_C.y - 40 - ph * 40 + ph * ph * 60, 1.6);
      }
    }
  },
};

export const ARCANE_AREA: AreaDef = {
  id: 'arcane',
  isle: 'light',
  court: 'arcane',
  name: 'The Arcane Court',
  subtitle: 'The sigils that hold the mirrors to the sun',
  w: ARCANE_W,
  h: ARCANE_H,
  bg: SLATE_DARK,
  accent: ARCANE_COLOR,
  weather: 'sigils',
  spawn: { x: 110, y: ROAD_Y },
  painter,
  solids,
  exits: [
    { side: 'w', to: 'meridian', label: 'Down the Sigil Road to Meridian Quay' },
    { side: 'n', to: 'workshop', label: 'Up the Anchor Road to the Workshop Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 200, y: 738 } },
    { kind: 'prince', id: 'sigil', at: { x: ACADEMY.x, y: ACADEMY.y + 46 } },
    { kind: 'water', id: 'arcane-font', shape: FONT_RECT, fishery: 'arcane-font' },
    { kind: 'encounter', id: 'arcane-counterspell' },
    { kind: 'encounter', id: 'arcane-familiars' },
    { kind: 'encounter', id: 'arcane-wild-magic' },
    { kind: 'encounter', id: 'arcane-summoning' },
    { kind: 'encounter', id: 'arcane-mana-font' },
    {
      kind: 'sign', at: { x: 330, y: 932 },
      text: 'BUREAU OF CLARITY. A spell that casts a shadow is a shade-theft. Report shadowy casting to the Abjurer.',
    },
    {
      kind: 'sign', at: { x: 1300, y: 860 },
      text: 'THE ANCHOR CIRCLE. Holds the Heliostat to the sun. Do not scuff, smudge, chalk over or sit on the sigil.',
    },
    {
      kind: 'sign', at: { x: 640, y: 1240 },
      text: 'FAMILIAR MARKET. All familiars licensed. Black coats prohibited (a walking shadow). Bring your Dusk Ticket.',
    },
    {
      kind: 'sign', at: { x: 1960, y: 520 },
      text: 'THE SPELLWRIGHTS\' ACADEMY. Lectures hourly. There are no hours. Lectures continually.',
    },
    { kind: 'chest', id: 'arcane-chest-cliff', at: { x: 2300, y: 1500 }, coins: 160 },
    { kind: 'chest', id: 'arcane-chest-academy', at: { x: 2240, y: 640 }, orbs: 3, open: { prince: 'sigil' } },
  ],
  npcs: ARCANE_NPCS,
  crowd: ARCANE_CROWD,
};
