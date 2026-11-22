import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { blob, flagstones, glow, groundFill, motes, pool, road, type G } from '../../../../art/IsleArt';
import {
  aqueductArch, ashlar, boulder, brokenColumn, buriedRoof, collapsedWellPit, colossusFeet, colossusHand, colossusHead,
  colossusNose, crack, fallenColumn, ghostWalker, hazardBarrier, mosaic, nameStone, noticeSlab, rubbleWaystone,
  salvageStall, screeFan, spoil, strataFace, sunkenTower, tombGate, weed, wellWindlass, wreckCrane, wreckingBall,
  wreckKeep,
} from './art';
import { RUBBLE_CROWD, RUBBLE_NPCS } from './npcs';
import {
  CHALK, DUST, DUST_DARK, DUST_LIT, FOAM, GLOW, IRON, LIME, LIME_DARK, LIME_DEEP, RUBBLE_COLOR, SCREE, SCREE_DARK,
  TARP, TARP_RED, WATER, WATER_DEEP, WATER_LIT,
} from './palette';
import { inView } from './util';

/**
 * The Rubble Court — the buried old capital of Bedrock Hold.
 *
 * Read it from the Stonehold road up:
 * • **the Breach** (south): the road comes in through a gap cut in the spoil, past the waystone and
 *   the Regent's notice, onto the old **Processional Way**, which runs straight north to the
 *   mountain;
 * • **the Pickers' Row** (south-west): the scavengers' stalls under tarps, a fallen bronze hand
 *   for a roof, and the undercroft of the old **Corn Exchange**, its mosaic floor dug out between
 *   broken columns (Krell's pillars);
 * • **the West Cut** (west): the aqueduct still marching across on its arches, broken at one span
 *   where the mountain's water pours into a cistern the pickers queue at (Lev's yard);
 * • **the landslides and the sunken towers** (north-west): two great scree fans let off the
 *   mountain, towers buried to their upper windows;
 * • **the Sepulchre gate** (north): the Way ends at a sealed door cut into the mountain's strata —
 *   the Regent's hold goes down from there;
 * • **the Wrecker's Yard** (north-east): Prince Wreck's half-demolished palace, his crane and its
 *   ball swinging over the forecourt;
 * • **the colossus** (east): the Old King's statue, toppled — his feet still on the plinth, his
 *   head lying in the yard below (Pell);
 * • **the Sunken Street and the collapsed well** (south-east): a market buried to its roofs, the
 *   Well of the Capital fallen in on itself (the court's fishing water), and Moth's cellars.
 */

export const RUBBLE_W = 2400;
export const RUBBLE_H = 1800;

const WAY_X = 1200;
const WAY_W = 110;

/** The Sepulchre gate in the mountain face. */
export const GATE: Pt = { x: 1200, y: 148 };
/** The collapsed well — centre of the pit; the fishing water sits on its dark middle. */
export const WELL: Pt = { x: 2010, y: 1200 };
export const WELL_WATER: Rect = { x: 1950, y: 1170, w: 120, h: 70 };
/** Prince Wreck's palace — the middle of its front, and the door. */
export const KEEP: Pt = { x: 1880, y: 330 };
const KEEP_W = 520;
export const KEEP_DOOR: Pt = { x: KEEP.x - KEEP_W / 2 + KEEP_W * 0.6 * 0.5, y: KEEP.y };
/** The crane in the Wrecker's Yard. */
export const CRANE: Pt = { x: 1380, y: 520 };
/** The colossus: his feet on the plinth, his head in the yard below. */
export const FEET: Pt = { x: 2160, y: 760 };
export const HEAD: Pt = { x: 1580, y: 900 };
/** The aqueduct: base line, first pier, span, broken arch. */
const AQ_Y = 820;
const AQ_X0 = 70;
const AQ_SPAN = 140;
const AQ_N = 7;
const AQ_BROKEN = 3;
/** The cistern under the broken arch. */
export const CISTERN: Rect = { x: 470, y: 860, w: 180, h: 80 };
/** The Corn Exchange undercroft: the dug-out mosaic floor. */
export const EXCHANGE: Rect = { x: 600, y: 1130, w: 320, h: 220 };
/** The cellar grate the Tolley boy is trapped under. */
export const GRATE: Pt = { x: 1000, y: 1420 };
/** The name-stones on old street corners, chiselled blank (quest spots stand beside them). */
export const NAME_STONES: Pt[] = [
  { x: 330, y: 1010 }, { x: 1080, y: 930 }, { x: 1660, y: 1290 }, { x: 2280, y: 960 }, { x: 760, y: 610 },
];

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Dormer windows with a candle in them, flickering in `animate`. */
const lamps: Pt[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

// ── Layout ───────────────────────────────────────────────────────────

// The mountain face along the whole north edge (drawn in the ground; solid at its foot).
solids.push({ kind: 'rect', x: 0, y: 0, w: RUBBLE_W, h: 112 });

// The Sepulchre gate.
addPiece(GATE.x, GATE.y, 260, 150, (g) => tombGate(g, GATE.x, GATE.y), { kind: 'rect', x: GATE.x - 118, y: 100, w: 236, h: 38 });

// The landslides' boulders, along their toes.
for (const [x, y, s] of [[300, 470, 1.3], [470, 520, 1.1], [560, 450, 0.9], [1960, 420, 1.2], [2180, 470, 1.4], [2300, 390, 1]] as [number, number, number][]) {
  addPiece(x, y, 60 * s, 50 * s, (g, rng) => boulder(g, x, y, s, rng), { kind: 'circle', x, y: y - 6 * s, r: 18 * s });
}

// Sunken towers.
for (const [x, y, r, h, lean] of [[230, 680, 46, 170, -10], [700, 380, 40, 140, 12], [2290, 640, 44, 160, -16]] as [number, number, number, number, number][]) {
  addPiece(x, y, r * 3, h + 40, (g, rng) => sunkenTower(g, x, y, r, h, lean, rng), { kind: 'circle', x, y: y - 6, r: r * 0.9 });
}

// The aqueduct across the West Cut: arches, one broken over the cistern.
for (let i = 0; i < AQ_N; i++) {
  const x = AQ_X0 + AQ_SPAN / 2 + i * AQ_SPAN;
  const broken = i === AQ_BROKEN;
  addPiece(x, AQ_Y, AQ_SPAN + 40, 210, (g, rng) => aqueductArch(g, x, AQ_Y, AQ_SPAN, 150, broken, rng));
}
for (let i = 0; i <= AQ_N; i++) {
  const px = AQ_X0 + i * AQ_SPAN;
  solids.push({ kind: 'rect', x: px - 18, y: AQ_Y - 16, w: 36, h: 18 });
}
// The cistern's kerb.
solids.push({ kind: 'rect', x: CISTERN.x, y: CISTERN.y, w: CISTERN.w, h: CISTERN.h });

// The Corn Exchange undercroft: broken columns round the mosaic.
for (const [x, y, h] of [
  [610, 1130, 70], [700, 1126, 40], [820, 1128, 86], [910, 1132, 30],
  [600, 1360, 50], [700, 1364, 90], [910, 1362, 60],
] as [number, number, number][]) {
  addPiece(x, y, 50, h + 40, (g, rng) => brokenColumn(g, x, y, h, 13, rng), { kind: 'circle', x, y: y - 2, r: 15 });
}

// The Pickers' Row: salvage stalls, the colossus's hand for a roof at the end.
for (const [x, cloth] of [[330, TARP], [480, TARP_RED], [630, 0x5a6a5a]] as [number, number][]) {
  addPiece(x, 1500, 140, 100, (g, rng) => salvageStall(g, x, 1500, 110, cloth, rng), { kind: 'rect', x: x - 58, y: 1478, w: 116, h: 22 });
}
addPiece(230, 1240, 240, 120, (g, rng) => colossusHand(g, 230, 1240, 1, rng), { kind: 'rect', x: 140, y: 1200, w: 190, h: 40 });

// Buried roofs: the Sunken Street, and a few more about the court. Some still have a candle in.
for (const [x, y, w, lamp] of [
  [1640, 1580, 200, true], [1900, 1640, 180, false], [2170, 1560, 220, true],
  [900, 520, 170, false], [2230, 1100, 160, true], [380, 1700, 160, false],
] as [number, number, number, boolean][]) {
  addPiece(x, y, w * 1.2, w * 0.5, (g, rng) => buriedRoof(g, x, y, w, lamp, rng), { kind: 'rect', x: x - w * 0.45, y: y - 18, w: w * 0.9, h: 22 });
  if (lamp) lamps.push({ x: x - w * 0.2, y: y - w * 0.28 * 0.75 - 6 });
}

// The collapsed well and its broken windlass.
solids.push({ kind: 'rect', x: WELL.x - 128, y: WELL.y - 72, w: 256, h: 150 });
addPiece(WELL.x, WELL.y - 70, 120, 100, (g) => wellWindlass(g, WELL.x, WELL.y - 70));

// The colossus: feet on the plinth, head in the yard, nose beside it.
addPiece(FEET.x, FEET.y, 300, 200, (g, rng) => colossusFeet(g, FEET.x, FEET.y, 1, rng), { kind: 'rect', x: FEET.x - 125, y: FEET.y - 40, w: 250, h: 42 });
addPiece(HEAD.x, HEAD.y, 260, 170, (g) => colossusHead(g, HEAD.x, HEAD.y, 1), { kind: 'rect', x: HEAD.x - 104, y: HEAD.y - 50, w: 208, h: 52 });
addPiece(HEAD.x - 160, HEAD.y + 40, 60, 40, (g) => colossusNose(g, HEAD.x - 160, HEAD.y + 40, 1.4), { kind: 'circle', x: HEAD.x - 160, y: HEAD.y + 32, r: 20 });

// Prince Wreck's palace, and his crane over the forecourt.
addPiece(KEEP.x, KEEP.y, KEEP_W + 80, 260, (g, rng) => wreckKeep(g, KEEP.x, KEEP.y, KEEP_W, 200, rng),
  { kind: 'rect', x: KEEP.x - KEEP_W / 2 - 6, y: KEEP.y - 34, w: KEEP_W + 12, h: 36 });
let craneTip: Pt = { x: CRANE.x + 230, y: CRANE.y - 182 };
addPiece(CRANE.x + 80, CRANE.y, 360, 260, (g, rng) => { craneTip = wreckCrane(g, CRANE.x, CRANE.y, rng); }, { kind: 'rect', x: CRANE.x - 52, y: CRANE.y - 24, w: 104, h: 26 });
// Hazard barriers across the streets Wreck means to drop next.
for (const [x, y, w] of [[1480, 680, 90], [2080, 520, 110], [1010, 760, 80]] as [number, number, number][]) {
  addPiece(x, y, w + 10, 30, (g) => hazardBarrier(g, x, y, w));
}

// The waystone at the Breach, the Regent's notice, and the blanked name-stones.
addPiece(1080, 1690, 60, 70, (g, rng) => rubbleWaystone(g, 1080, 1690, rng), { kind: 'circle', x: 1080, y: 1686, r: 14 });
addPiece(1330, 1650, 70, 60, (g) => noticeSlab(g, 1330, 1650), { kind: 'rect', x: 1302, y: 1636, w: 56, h: 14 });
addPiece(1330, 240, 70, 60, (g) => noticeSlab(g, 1330, 240), { kind: 'rect', x: 1302, y: 226, w: 56, h: 14 });
for (const s of NAME_STONES) {
  const x = s.x + 34, y = s.y - 6;
  addPiece(x, y, 60, 40, (g, rng) => nameStone(g, x, y, false, rng), { kind: 'rect', x: x - 20, y: y - 10, w: 40, h: 12 });
}

// ── Painter ──────────────────────────────────────────────────────────

const painter: AreaPainter = {
  ground(g, rng) {
    const W = RUBBLE_W, H = RUBBLE_H;
    // Packed dust over spoil, with grey scree drifts.
    groundFill(g, { x: 0, y: 0, w: W, h: H }, DUST, DUST_DARK, DUST_LIT, rng, 1.2);
    for (let i = 0; i < 46; i++) blob(g, rng() * W, 160 + rng() * (H - 160), 60 + rng() * 120, 30 + rng() * 60, rng() < 0.5 ? SCREE : DUST_DARK, 0.28, rng);

    // The mountain face and its landslides.
    strataFace(g, { x: 0, y: 0, w: W, h: 112 }, rng);
    screeFan(g, 420, 110, 420, 400, rng);
    screeFan(g, 2120, 110, 380, 330, rng);
    screeFan(g, 760, 110, 160, 150, rng);

    // The Processional Way: great worn flags under drifted dust, straight to the mountain.
    flagstones(g, { x: WAY_X - WAY_W / 2, y: 150, w: WAY_W, h: H - 150 }, 34, LIME, LIME_DEEP, rng);
    for (let y = 200; y < H; y += 70 + rng() * 60) {
      g.fillStyle(DUST, 0.85); g.fillEllipse(WAY_X + (rng() - 0.5) * WAY_W, y, 40 + rng() * 80, 14 + rng() * 14);
    }
    // Kerbs either side, broken in places.
    for (const k of [-1, 1]) {
      for (let y = 160; y < H; y += 26) {
        if (rng() < 0.15) continue;
        g.fillStyle(LIME_DARK, 1); g.fillRect(WAY_X + k * (WAY_W / 2) - 4, y, 8, 22);
        g.fillStyle(LIME, 1); g.fillRect(WAY_X + k * (WAY_W / 2) - 4, y, 6, 20);
      }
    }
    // The gate's forecourt: a broad apron of flags and the tithe-carts' ruts going in.
    flagstones(g, { x: 940, y: 140, w: 520, h: 170 }, 40, LIME, LIME_DEEP, rng);
    for (const dx of [-26, 26]) { g.lineStyle(5, DUST_DARK, 0.5); g.lineBetween(GATE.x + dx, GATE.y, GATE.x + dx * 1.3, 700); }

    // Side roads the pickers have dug out.
    road(g, [{ x: WAY_X, y: 1300 }, { x: 760, y: 1300 }, { x: 420, y: 1440 }, { x: 260, y: 1580 }], 60, DUST_LIT, DUST_DARK, LIME, rng);
    road(g, [{ x: WAY_X, y: 980 }, { x: 760, y: 960 }, { x: 300, y: 980 }, { x: 140, y: 1000 }], 58, DUST_LIT, DUST_DARK, LIME, rng);
    road(g, [{ x: WAY_X, y: 640 }, { x: 900, y: 640 }, { x: 600, y: 640 }], 50, DUST_LIT, DUST_DARK, LIME, rng);
    road(g, [{ x: WAY_X, y: 560 }, { x: 1500, y: 600 }, { x: 1780, y: 420 }], 64, DUST_LIT, DUST_DARK, LIME, rng);
    road(g, [{ x: WAY_X, y: 1040 }, { x: 1440, y: 1040 }, { x: 1800, y: 900 }, { x: 2100, y: 860 }], 60, DUST_LIT, DUST_DARK, LIME, rng);
    road(g, [{ x: WAY_X, y: 1400 }, { x: 1600, y: 1420 }, { x: 1900, y: 1340 }, { x: 2300, y: 1360 }], 62, DUST_LIT, DUST_DARK, LIME, rng);

    // The Corn Exchange's mosaic, dug out, and a smaller patch on the Way's east side.
    mosaic(g, EXCHANGE, rng);
    mosaic(g, { x: 1300, y: 1120, w: 140, h: 100 }, rng);

    // The cistern under the broken arch, fed by the fall.
    g.fillStyle(LIME_DARK, 1); g.fillRect(CISTERN.x - 8, CISTERN.y - 8, CISTERN.w + 16, CISTERN.h + 16);
    pool(g, CISTERN, WATER_DEEP, WATER, LIME, rng);
    // The bucket queue's worn patch in front of it.
    g.fillStyle(DUST_DARK, 0.4); g.fillEllipse(CISTERN.x + CISTERN.w / 2, CISTERN.y + CISTERN.h + 40, 220, 50);

    // The Wrecker's Yard: packed earth, chalk demolition marks, the crane's rail.
    g.fillStyle(DUST_DARK, 0.5); g.fillRect(1460, 360, 760, 260);
    for (let i = 0; i < 18; i++) {
      const x = 1480 + rng() * 720, y = 380 + rng() * 220;
      g.lineStyle(2, CHALK, 0.35); g.lineBetween(x - 8, y - 8, x + 8, y + 8); g.lineBetween(x + 8, y - 8, x - 8, y + 8);
    }
    for (const dy of [-6, 6]) { g.lineStyle(3, IRON, 0.7); g.lineBetween(1260, CRANE.y + dy, 1560, CRANE.y + dy); }
    for (let x = 1264; x < 1560; x += 18) { g.fillStyle(0x4a3422, 1); g.fillRect(x, CRANE.y - 9, 6, 18); }

    // The collapsed well's pit.
    collapsedWellPit(g, WELL.x, WELL.y, 118, 66, rng);

    // A fallen column on the Way's west verge, the colossus's broken staff by his head.
    fallenColumn(g, 1000, 1180, 150, 0.15, 16, rng);
    fallenColumn(g, 1760, 820, 220, -0.35, 14, rng);

    // The cellar grate the Tolley boy is under.
    g.fillStyle(0x0a0806, 1); g.fillRect(GRATE.x - 28, GRATE.y - 16, 56, 32);
    for (let k = 0; k < 7; k++) { g.fillStyle(IRON, 1); g.fillRect(GRATE.x - 26 + k * 8, GRATE.y - 16, 3, 32); }
    g.lineStyle(2, IRON, 1); g.strokeRect(GRATE.x - 28, GRATE.y - 16, 56, 32);
    spoil(g, GRATE.x + 50, GRATE.y + 10, 80, 30, rng);

    // Scattered spoil, cut stones, cracks and weeds everywhere.
    for (let i = 0; i < 70; i++) {
      const x = rng() * W, y = 180 + rng() * (H - 200);
      if (Math.abs(x - WAY_X) < WAY_W) continue;
      ashlar(g, x, y, 10 + rng() * 14, 6 + rng() * 6, rng() < 0.6 ? LIME : LIME_DARK);
    }
    for (let i = 0; i < 90; i++) crack(g, rng() * W, 160 + rng() * (H - 160), 20 + rng() * 40, rng() * Math.PI * 2, LIME_DEEP, 0.35);
    for (let i = 0; i < 60; i++) weed(g, rng() * W, 160 + rng() * (H - 160), 0.8 + rng() * 0.6);
    // The Breach: the cut through the spoil the road comes in by.
    for (const k of [-1, 1]) spoil(g, WAY_X + k * 150, H - 30, 160, 60, rng);
  },

  pieces,

  animate(g, t, view) {
    // The aqueduct's fall into the cistern.
    const fx = AQ_X0 + AQ_SPAN / 2 + AQ_BROKEN * AQ_SPAN - AQ_SPAN * 0.26;
    if (inView(fx, AQ_Y, view, 220)) {
      for (let i = 0; i < 6; i++) {
        const wob = Math.sin(t * 9 + i) * 2;
        g.fillStyle(i % 2 ? WATER_LIT : FOAM, 0.55); g.fillRect(fx - 16 + i * 6 + wob, AQ_Y - 184, 6, 184 + 60);
      }
      for (let i = 0; i < 4; i++) {
        const ph = (t * 1.6 + i / 4) % 1;
        g.lineStyle(1.5, FOAM, 0.6 * (1 - ph)); g.strokeEllipse(fx, CISTERN.y + 30, 20 + ph * 70, 8 + ph * 24);
      }
    }
    // The well: rings on the black water far down.
    if (inView(WELL.x, WELL.y, view, 200)) {
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.3 + i / 3) % 1;
        g.lineStyle(1, WATER_LIT, 0.35 * (1 - ph)); g.strokeEllipse(WELL.x + (i - 1) * 20, WELL.y + 10, 8 + ph * 40, 3 + ph * 12);
      }
    }
    // Dust trickling down the landslides.
    for (const [x, y, len] of [[420, 110, 400], [2120, 110, 330]] as [number, number, number][]) {
      if (!inView(x, y + len / 2, view, 300)) continue;
      for (let i = 0; i < 12; i++) {
        const ph = (t * 0.25 + i / 12) % 1;
        const px = x + ((i * 53) % 160) - 80 + ph * ((i % 2 ? 1 : -1) * 60), py = y + 20 + ph * len * 0.9;
        g.fillStyle(SCREE, 0.6 * Math.sin(ph * Math.PI)); g.fillRect(px, py, 3, 3);
      }
    }
    // Candles in the buried houses.
    for (const l of lamps) {
      if (!inView(l.x, l.y, view)) continue;
      const f = 0.5 + Math.sin(t * 7 + l.x) * 0.25 + Math.sin(t * 13 + l.y) * 0.15;
      glow(g, l.x, l.y, 14, GLOW, 0.04 * f, 2);
    }
  },

  animateOver(g, t, view) {
    // The wrecking ball on its line, swinging slowly over the forecourt.
    if (inView(craneTip.x, craneTip.y + 120, view, 300)) {
      const a = Math.sin(t * 0.7) * 0.32;
      const L = 150;
      const bx = craneTip.x + Math.sin(a) * L, by = craneTip.y + Math.cos(a) * L;
      g.lineStyle(2, IRON, 1); g.lineBetween(craneTip.x, craneTip.y, bx, by - 22);
      wreckingBall(g, bx, by, 20);
    }
    // The dead walking the Processional Way, faint, up to the gate that will not open.
    if (inView(WAY_X, 900, view, 200)) {
      for (let i = 0; i < 5; i++) {
        const ph = (t * 0.018 + i / 5) % 1;
        const y = 1500 - ph * 1200;
        const a = 0.22 * Math.sin(ph * Math.PI);
        ghostWalker(g, WAY_X + (i % 2 ? 14 : -14), y, 0.8, t * 6 + i, a, i % 3);
      }
    }
    // Dust on the air everywhere.
    motes(g, view, t, 30, DUST, 6, 14, 1.6, 7);
  },
};

export const RUBBLE_AREA: AreaDef = {
  id: 'rubble',
  isle: 'earth',
  court: 'rubble',
  name: 'The Rubble Court',
  subtitle: 'The old capital, buried under its own stone',
  w: RUBBLE_W,
  h: RUBBLE_H,
  bg: SCREE_DARK,
  accent: RUBBLE_COLOR,
  weather: 'dust',
  gloom: 0.12,
  spawn: { x: 1200, y: 1700 },
  painter,
  solids,
  exits: [
    { side: 's', to: 'stonehold', label: 'Out through the Breach to the Stonehold Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 1080, y: 1720 } },
    { kind: 'prince', id: 'wreck', at: { x: KEEP_DOOR.x, y: KEEP_DOOR.y + 50 } },
    { kind: 'water', id: 'rubble-well', shape: WELL_WATER, fishery: 'rubble-well' },
    {
      kind: 'door', at: { x: GATE.x, y: 150 }, to: 'sepulchre', arrive: { x: 900, y: 2440 },
      label: 'The Sepulchre', open: { princesOfIsle: 'earth', count: 6 },
      lockedText: 'The slab is mortared in the Regent\'s red. It will not move while his six children hold the Hold.',
    },
    { kind: 'encounter', id: 'rubble-collapse' },
    { kind: 'encounter', id: 'rubble-sinkhole' },
    { kind: 'encounter', id: 'rubble-aqueduct' },
    { kind: 'encounter', id: 'rubble-procession' },
    { kind: 'encounter', id: 'rubble-colossus' },
    {
      kind: 'sign', at: { x: 1330, y: 1670 },
      text: 'BURIED BY ORDER. This city is closed. Its name is withdrawn. Salvage is theft of the Tithe. — G., Regent',
    },
    {
      kind: 'sign', at: { x: 1330, y: 262 },
      text: 'HERE THE OLD KING RESTS UNTIL HE WAKES. Do not knock. Do not sing. Do not wait. The Sepulchre is closed to the living.',
    },
    {
      kind: 'sign', at: { x: 1890, y: 1300 },
      text: 'THE WELL OF THE CAPITAL. (Scratched under it:) still deep. still good. bring a long rod.',
    },
    { kind: 'chest', id: 'rubble-chest-hand', at: { x: 120, y: 1290 }, coins: 120 },
    { kind: 'chest', id: 'rubble-chest-keep', at: { x: 2190, y: 380 }, orbs: 3, open: { prince: 'wreck' } },
  ],
  npcs: RUBBLE_NPCS,
  crowd: RUBBLE_CROWD,
};
