import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { glow, groundFill, lit, motes, type G } from '../../../../art/IsleArt';
import {
  atelier, colourMill, colourShop, contrabandShadow, cradle, dropCloth, dyeWorks, easel, emptyFrame, footbridge,
  gallery, gildedStatue, limeTub, millWheel, mosaicSun, muralHouse, muralWall, muralWaystone, paving, pigmentRiver,
  pigmentStall, roller, scaffold, splat, stoneBench, street, trompeDoor, wetGlint,
} from './art';
import {
  CADMIUM, GOLD, GOLD_LIT, LIME_WET, MADDER, MURAL_COLOR, OCHRE, PAVE, PAVE_DARK, PAVE_LIT, PIGMENTS, STONE_DARK,
  ULTRAMARINE, VERMILION, VIOLET, VIRIDIAN,
} from './palette';
import { MURAL_CROWD, MURAL_NPCS } from './npcs';

/**
 * The Mural Court — the painters' town, south-west on Solmara's terraces.
 *
 * Read it from the Lantern road down:
 * • **the north gate** (from the Lantern gorge): North Street comes in past the waystone and
 *   runs between the two halves of **the Great Mural** — the longest painting of the Despot on
 *   the isle, scaffolded, with painters swinging in rope cradles across it, re-painting his face
 *   every day because the sun bleaches it out by evening (there is no evening);
 * • **the dye works** (north-west) at the river's head, its five vats letting colour into **the
 *   pigment river**, which runs south in stripes down the west of the town; over the footbridge
 *   **the colour-mills** grind on the far bank, waterwheels dripping every colour;
 * • **Palette Square** at the heart: a sun mosaic, the Despot's statue mid re-gilding, easels
 *   ringed round it, and west of it **the colour market** and Madder's colour shop;
 * • **the Shadowless Gallery** (north-east), Prince Hue's glass-roofed hall, where no painting
 *   has ever had a shadow fall across it; the Meridian road runs east beneath its steps;
 * • **the Censors' Yard** (south): lime tubs, rollers and the Office of Clarity in Images;
 * • **Atelier Row** (south-east): the north-light studios of the court portraitists.
 */

export const MURAL_W = 2400;
export const MURAL_H = 1600;

/** The pigment river's channel (water) and its banks. */
export const RIVER_X = 300;
export const RIVER_W = 140;
const RIVER_TOP = 540;
/** The footbridge's centre line. */
export const BRIDGE_Y = 960;
/** The court's fishing water — the stretch below the bridge. */
export const RIVER_POOL: Rect = { x: RIVER_X, y: 1090, w: RIVER_W, h: 420 };
/** Palette Square. */
export const SQUARE: Pt = { x: 1200, y: 880 };
/** The Shadowless Gallery — the middle of its bottom step. */
export const GALLERY: Pt = { x: 1980, y: 600 };
/** The Great Mural: two runs of wall, either side of North Street. */
export const MURAL_LEFT = { x0: 560, w: 520 };
export const MURAL_RIGHT = { x0: 1320, w: 580 };
export const MURAL_BASE = 360;
/** The scaffold Tobiah Fresco works from. */
export const SCAFFOLD: Pt = { x: 820, y: 392 };
/** The colour-mills on the west bank. */
export const MILL_N: Pt = { x: 170, y: 820 };
export const MILL_S: Pt = { x: 170, y: 1330 };
/** The dye works at the river's head. */
export const DYE_WORKS: Pt = { x: 330, y: 540 };
/** The Censors' Yard. */
export const CENSOR_YARD: Pt = { x: 1340, y: 1360 };
/** Madder's colour shop. */
export const SHOP: Pt = { x: 980, y: 1110 };

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Fresh paint that catches the sun in `animate`. */
const glints: { x: number; y: number; s: number }[] = [];
/** Rope cradles hanging on the Great Mural: x, rope top, hang y, coat colour. */
const cradles: { x: number; top: number; y: number; coat: number; ph: number }[] = [];
/** Mill wheels. */
const wheels: { x: number; y: number; r: number }[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

// ── Layout ───────────────────────────────────────────────────────────

// The Great Mural, scaffolded on the west run.
for (const run of [MURAL_LEFT, MURAL_RIGHT]) {
  addPiece(run.x0 + run.w / 2, MURAL_BASE, run.w + 30, 260, (g, rng) => muralWall(g, run.x0, MURAL_BASE, run.w, 210, rng, run === MURAL_LEFT ? 2 : 1),
    { kind: 'rect', x: run.x0 - 4, y: MURAL_BASE - 28, w: run.w + 8, h: 28 });
  for (let k = 0; k < 3; k++) glints.push({ x: run.x0 + 60 + k * (run.w / 3), y: MURAL_BASE - 120 - (k % 2) * 40, s: k * 0.29 + run.x0 * 0.001 });
}
addPiece(SCAFFOLD.x, SCAFFOLD.y, 300, 220, (g, rng) => scaffold(g, SCAFFOLD.x - 130, SCAFFOLD.y, 260, 190, rng),
  { kind: 'rect', x: SCAFFOLD.x - 136, y: SCAFFOLD.y - 14, w: 272, h: 14 });
cradles.push(
  { x: 640, top: MURAL_BASE - 226, y: MURAL_BASE - 120, coat: VERMILION, ph: 0 },
  { x: 1440, top: MURAL_BASE - 226, y: MURAL_BASE - 90, coat: ULTRAMARINE, ph: 1.7 },
  { x: 1840, top: MURAL_BASE - 226, y: MURAL_BASE - 150, coat: VIRIDIAN, ph: 3.1 },
);
// A trompe-l'œil doorway painted on the east run — Faux's joke on the censors.
addPiece(1700, MURAL_BASE + 1, 70, 110, (g) => trompeDoor(g, 1700, MURAL_BASE - 18, 54, 92, GOLD));

// The dye works and the river's head.
addPiece(DYE_WORKS.x, DYE_WORKS.y, 400, 230, (g, rng) => dyeWorks(g, DYE_WORKS.x, DYE_WORKS.y, 360, rng),
  { kind: 'rect', x: DYE_WORKS.x - 182, y: DYE_WORKS.y - 70, w: 364, h: 70 });

// The colour-mills on the west bank, their wheels in the river.
for (const m of [MILL_N, MILL_S]) {
  addPiece(m.x, m.y, 200, 190, (g, rng) => colourMill(g, m.x, m.y, rng), { kind: 'rect', x: m.x - 62, y: m.y - 40, w: 124, h: 40 });
  wheels.push({ x: m.x + 100, y: m.y - 36, r: 34 });
}

// Houses north-west of the Mural, behind the dye works.
for (const [x, y, w, f, o] of [
  [110, 300, 150, VERMILION, { skylight: true }], [270, 300, 140, CADMIUM, { limed: true }], [430, 290, 130, VIRIDIAN, { dome: true }],
] as [number, number, number, number, { skylight?: boolean; limed?: boolean; dome?: boolean }][]) {
  addPiece(x, y, w + 20, 220, (g, rng) => muralHouse(g, x, y, w, 170, rng, { field: f, ...o }), { kind: 'rect', x: x - w / 2, y: y - 30, w, h: 30 });
}

// Houses along the north-east, past the Mural.
for (const [x, w, f, o] of [
  [2030, 150, ULTRAMARINE, { skylight: true }], [2190, 140, MADDER, { dome: true }], [2330, 120, OCHRE, { limed: true }],
] as [number, number, number, { skylight?: boolean; limed?: boolean; dome?: boolean }][]) {
  addPiece(x, 300, w + 20, 220, (g, rng) => muralHouse(g, x, 300, w, 180, rng, { field: f, ...o }), { kind: 'rect', x: x - w / 2, y: 270, w, h: 30 });
}

// The Shadowless Gallery.
addPiece(GALLERY.x, GALLERY.y, 520, 330, (g, rng) => gallery(g, GALLERY.x, GALLERY.y, 420, 150, rng),
  { kind: 'rect', x: GALLERY.x - 234, y: GALLERY.y - 40, w: 468, h: 40 });
addPiece(GALLERY.x - 290, GALLERY.y + 70, 80, 120, (g) => emptyFrame(g, GALLERY.x - 290, GALLERY.y + 70, 56, 84),
  { kind: 'rect', x: GALLERY.x - 318, y: GALLERY.y + 60, w: 56, h: 10 });

// Palette Square: the statue, easels ringed round it.
addPiece(SQUARE.x, SQUARE.y - 10, 120, 200, (g) => gildedStatue(g, SQUARE.x, SQUARE.y - 10, 1), { kind: 'circle', x: SQUARE.x, y: SQUARE.y - 20, r: 40 });
for (const [x, y, half] of [[1010, 790, false], [1390, 790, true], [1040, 1000, true], [1370, 1005, false], [1200, 1060, false]] as [number, number, boolean][]) {
  addPiece(x, y, 80, 80, (g, rng) => easel(g, x, y, 1, rng, half), { kind: 'circle', x, y: y - 4, r: 14 });
}
for (const [x, y] of [[1450, 920], [950, 900]] as [number, number][]) addPiece(x, y, 70, 30, (g) => stoneBench(g, x, y), { kind: 'rect', x: x - 30, y: y - 14, w: 60, h: 12 });

// The colour market and Madder's shop.
addPiece(SHOP.x, SHOP.y, 170, 190, (g, rng) => colourShop(g, SHOP.x, SHOP.y, 130, 150, rng), { kind: 'rect', x: SHOP.x - 66, y: SHOP.y - 30, w: 132, h: 30 });
for (const [x, y] of [[690, 1150], [840, 1250], [660, 1330]] as [number, number][]) {
  addPiece(x, y, 130, 110, (g, rng) => pigmentStall(g, x, y, rng), { kind: 'rect', x: x - 56, y: y - 36, w: 112, h: 36 });
}

// The Censors' Yard: the Office of Clarity in Images (limed), tubs and rollers.
addPiece(1520, 1450, 200, 230, (g, rng) => muralHouse(g, 1520, 1450, 180, 180, rng, { field: 0xf6f6f2, limed: true, skylight: true }),
  { kind: 'rect', x: 1430, y: 1420, w: 180, h: 30 });
for (const [x, y] of [[1260, 1420], [1330, 1450], [1410, 1290]] as [number, number][]) {
  addPiece(x, y, 60, 50, (g) => limeTub(g, x, y), { kind: 'circle', x, y: y - 8, r: 15 });
}
addPiece(1180, 1470, 80, 20, (g) => roller(g, 1180, 1470, 40, -2.6, false, 50));

// Atelier Row.
for (const [x, f] of [[1700, VERMILION], [1900, ULTRAMARINE], [2100, CADMIUM], [2290, VIOLET]] as [number, number][]) {
  addPiece(x, 1100, 190, 300, (g, rng) => atelier(g, x, 1100, 150, 170, rng, f), { kind: 'rect', x: x - 76, y: 1070, w: 152, h: 30 });
}

// Houses along the south edge.
for (const [x, w, f, o] of [
  [700, 150, OCHRE, { dome: true }], [880, 140, VIRIDIAN, { skylight: true }], [1700, 150, MADDER, {}],
  [1880, 140, CADMIUM, { limed: true }], [2060, 150, ULTRAMARINE, { skylight: true }], [2250, 160, VERMILION, { dome: true }],
] as [number, number, number, { skylight?: boolean; limed?: boolean; dome?: boolean }][]) {
  addPiece(x, 1590, w + 20, 220, (g, rng) => muralHouse(g, x, 1590, w, 160, rng, { field: f, ...o }), { kind: 'rect', x: x - w / 2, y: 1560, w, h: 30 });
}

// The waystone by the north gate.
addPiece(1080, 190, 50, 90, (g) => muralWaystone(g, 1080, 190), { kind: 'circle', x: 1080, y: 184, r: 15 });

// The river channel (water is solid; the bridge crosses it).
solids.push(
  { kind: 'rect', x: RIVER_X - 14, y: RIVER_TOP, w: RIVER_W + 28, h: BRIDGE_Y - 36 - RIVER_TOP },
  { kind: 'rect', x: RIVER_X - 14, y: BRIDGE_Y + 36, w: RIVER_W + 28, h: MURAL_H - BRIDGE_Y - 36 },
);

// ── Painter ──────────────────────────────────────────────────────────

const painter: AreaPainter = {
  ground(g, rng) {
    // The whole court is paved in white limestone, the gaps grassless and bleached.
    groundFill(g, { x: 0, y: 0, w: MURAL_W, h: MURAL_H }, PAVE, PAVE_DARK, PAVE_LIT, rng, 0.6);
    paving(g, { x: 0, y: 0, w: MURAL_W, h: MURAL_H }, rng, 32);
    // Streets: North Street, the Meridian road, the West Lane, South Street, Atelier Row.
    street(g, { x: 1140, y: 0, w: 120, h: 900 }, rng, true);
    street(g, { x: 1300, y: 750, w: 1100, h: 100 }, rng, false);
    street(g, { x: 454, y: BRIDGE_Y - 40, w: 620, h: 80 }, rng, false);
    street(g, { x: 1150, y: 900, w: 100, h: 700 }, rng, true);
    street(g, { x: 1250, y: 1140, w: 1150, h: 90 }, rng, false);
    street(g, { x: 0, y: BRIDGE_Y - 34, w: RIVER_X - 14, h: 68 }, rng, false);
    // Palette Square's sun.
    mosaicSun(g, SQUARE.x, SQUARE.y, 210, rng);
    // The river and its bridge.
    pigmentRiver(g, RIVER_X, RIVER_W, RIVER_TOP - 10, MURAL_H, rng);
    footbridge(g, RIVER_X - 20, RIVER_X + RIVER_W + 20, BRIDGE_Y, 64);
    // Coloured run-off: where the dye works' sluices meet the river, every colour.
    for (let i = 0; i < 5; i++) {
      const sx = RIVER_X + 14 + i * 28;
      g.fillStyle([VERMILION, CADMIUM, VIRIDIAN, ULTRAMARINE, MADDER][i], 0.8); g.fillRect(sx - 6, RIVER_TOP - 18, 12, 22);
      g.fillStyle(STONE_DARK, 1); g.fillRect(sx - 8, RIVER_TOP - 22, 16, 5);
    }
    // Drop-cloths under the scaffold and in front of the Gallery.
    dropCloth(g, SCAFFOLD.x, SCAFFOLD.y + 30, 280, 46, rng);
    dropCloth(g, 1600, MURAL_BASE + 34, 200, 40, rng);
    // Spilt paint all over the market, the square and the yard.
    for (let i = 0; i < 70; i++) {
      const zone = i % 3;
      const x = zone === 0 ? 600 + rng() * 420 : zone === 1 ? 1000 + rng() * 400 : 1600 + rng() * 700;
      const y = zone === 0 ? 1080 + rng() * 300 : zone === 1 ? 760 + rng() * 300 : 860 + rng() * 260;
      splat(g, x, y, 2 + rng() * 5, PIGMENTS[Math.floor(rng() * PIGMENTS.length)], rng, 0.55);
    }
    // The Censors' Yard: a wide grey-white skin of old lime on the flags, roller tracks across it.
    g.fillStyle(LIME_WET, 0.55); g.fillRect(1180, 1250, 360, 220);
    for (let k = 0; k < 8; k++) { g.fillStyle(0xffffff, 0.25); g.fillRect(1180, 1258 + k * 26, 360, 12); }
    // Chalked contraband shadows under things in the back lanes, waiting for the censors.
    for (const [x, y, w] of [[1050, 1340, 60], [2280, 960, 50], [80, 1200, 46], [560, 1440, 54]] as [number, number, number][]) contrabandShadow(g, x, y, w, rng);
    // Pigment dust round the mills.
    for (const m of [MILL_N, MILL_S]) for (let i = 0; i < 14; i++) {
      g.fillStyle(PIGMENTS[i % PIGMENTS.length], 0.18); g.fillEllipse(m.x - 80 + rng() * 140, m.y + 10 + rng() * 40, 26, 10);
    }
  },
  pieces,

  animate(g, t, view) {
    const inView = (x: number, y: number, m = 80) => x > view.x - m && x < view.x + view.w + m && y > view.y - m && y < view.y + view.h + m;
    // The river: flecks of colour carried south in their own stripes.
    if (view.x < RIVER_X + RIVER_W + 40) {
      const bw = RIVER_W / 6;
      for (let i = 0; i < 42; i++) {
        const lane = i % 6;
        const y = RIVER_TOP + ((t * (38 + lane * 4) + i * 97) % (MURAL_H - RIVER_TOP));
        if (y < view.y - 20 || y > view.y + view.h + 20) continue;
        if (Math.abs(y - BRIDGE_Y) < 34) continue;
        const x = RIVER_X + lane * bw + bw * 0.5 + Math.sin(y / 70) * 4;
        g.fillStyle(lit([VERMILION, CADMIUM, VIRIDIAN, ULTRAMARINE, MADDER, OCHRE][lane], 0.45), 0.7);
        g.fillEllipse(x, y, 3, 9);
      }
    }
    // The mill wheels, turning.
    for (const w of wheels) if (inView(w.x, w.y)) millWheel(g, w.x, w.y, w.r, t);
    // Coloured steam from the dye-works chimney.
    if (inView(DYE_WORKS.x + 160, DYE_WORKS.y - 220, 140)) {
      for (let i = 0; i < 8; i++) {
        const ph = (t * 0.3 + i / 8) % 1;
        g.fillStyle(PIGMENTS[i % PIGMENTS.length], 0.18 * (1 - ph));
        g.fillCircle(DYE_WORKS.x + 153 + Math.sin(t + i) * 8 + ph * 30, DYE_WORKS.y - 216 - ph * 90, 8 + ph * 16);
      }
    }
  },

  animateOver(g, t, view) {
    // Painters swinging in rope cradles on the Great Mural.
    for (const c of cradles) {
      if (c.x < view.x - 60 || c.x > view.x + view.w + 60 || c.y < view.y - 80 || c.top > view.y + view.h) continue;
      cradle(g, c.x, c.y + Math.sin(t * 0.4 + c.ph) * 10, c.top, Math.sin(t * 1.3 + c.ph), c.coat);
    }
    // Wet paint glinting: fresh strokes on the Mural catch the noon in hard white stars.
    for (const gl of glints) {
      if (gl.x < view.x || gl.x > view.x + view.w || gl.y < view.y || gl.y > view.y + view.h) continue;
      const k = Math.max(0, Math.sin(t * 1.6 + gl.s * 9)) ** 6;
      wetGlint(g, gl.x, gl.y, k);
    }
    // The gilt sun in the Gallery's pediment pulses in the glare.
    if (GALLERY.x > view.x - 200 && GALLERY.x < view.x + view.w + 200 && GALLERY.y - 220 > view.y - 200 && GALLERY.y - 220 < view.y + view.h + 100) {
      glow(g, GALLERY.x, GALLERY.y - 238, 40, GOLD_LIT, 0.03 + Math.sin(t * 2) * 0.015, 3);
    }
    // A haze of fine pigment over the market.
    motes(g, view, t, 18, OCHRE, -6, 14, 1.4, 41);
    motes(g, view, t, 12, GOLD, -4, 10, 1.2, 77);
  },
};

export const MURAL_AREA: AreaDef = {
  id: 'mural',
  isle: 'light',
  court: 'mural',
  name: 'The Mural Court',
  subtitle: 'Every wall His likeness, every likeness at noon',
  w: MURAL_W,
  h: MURAL_H,
  bg: 0xd8ccb4,
  accent: MURAL_COLOR,
  weather: 'pigment',
  spawn: { x: 1200, y: 170 },
  painter,
  solids,
  exits: [
    { side: 'n', to: 'lantern', label: 'North Street up to the Lantern gorge' },
    { side: 'e', to: 'meridian', at: 800, label: 'The Meridian road down to the quay' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 1080, y: 220 } },
    { kind: 'prince', id: 'hue', at: { x: GALLERY.x, y: GALLERY.y + 44 } },
    { kind: 'water', id: 'mural-river', shape: RIVER_POOL, fishery: 'mural-river' },
    { kind: 'encounter', id: 'mural-colour-wheel' },
    { kind: 'encounter', id: 'mural-trompe' },
    { kind: 'encounter', id: 'mural-whitewash' },
    { kind: 'encounter', id: 'mural-paint-by-numbers' },
    { kind: 'encounter', id: 'mural-still-life' },
    {
      kind: 'sign', at: { x: 1300, y: 200 },
      text: 'THE MURAL COURT. Every wall a likeness of His Radiance, at noon. A shadow is not a style. It is a crime.',
    },
    {
      kind: 'sign', at: { x: 1250, y: 1250 },
      text: 'OFFICE OF CLARITY IN IMAGES. Report any shadow, painted or cast. Lime is free. Silence is not.',
    },
    {
      kind: 'sign', at: { x: 1700, y: 680 },
      text: 'THE SHADOWLESS GALLERY. Glass-roofed by order of Prince Hue, so no picture within has ever known shade.',
    },
    {
      kind: 'sign', at: { x: 560, y: 1010 },
      text: 'TO THE COLOUR-MILLS. Umber, lamp-black and Payne\'s grey may not be ground, sold or kept. By order.',
    },
    { kind: 'chest', id: 'mural-chest-dyeworks', at: { x: 60, y: 470 }, coins: 140 },
    { kind: 'chest', id: 'mural-chest-gallery', at: { x: 2330, y: 640 }, orbs: 2, open: { prince: 'hue' } },
  ],
  npcs: MURAL_NPCS,
  crowd: MURAL_CROWD,
};
