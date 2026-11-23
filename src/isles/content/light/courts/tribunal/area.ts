import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { glow, type G } from '../../../../art/IsleArt';
import {
  balustrade, bronzeScale, caustics, clarityStatue, clearFigure, courthouse, crossGirder, docketBoard, fountainBasin,
  gildedRailing, glassGlint, hallOfRecords, heliostatLeg, heliostatLift, heliostatMirror, juryGallery, lawStone,
  marbleTerrace, mirrorCage, noonBeam, notaryKiosk, palaceOfNoon, processional, robeSwag, scalePlaza, sideWalk,
  signalMirror, tribunalWaystone, waitingBench, witnessStand,
} from './art';
import { GOLD, MARBLE_DEEP, MARBLE_SHADE, SUN, SUN_HOT, TRIBUNAL_COLOR, WATER_LIT } from './palette';
import { TRIBUNAL_CROWD, TRIBUNAL_NPCS } from './npcs';

/**
 * The Tribunal Court — the summit terrace under the Heliostat, where shade-thieves are tried.
 *
 * Read it from the Noon Court's steps up:
 * • **the Steps of Appeal** (south): the road comes up through a gap in the white balustrade past
 *   the waystone and the Docket, and the Processional runs straight north from there, a walk of
 *   whiter stone inlaid with gold suns, all the way to the Heliostat door;
 * • **the Mirror Cages** (south-west): the accused wait for trial in cages of mirror in the full
 *   sun, a bench of Clears beside them — and the notary's kiosk at the corner of the yard;
 * • **the Fountain of Testimony** (south-east): a long bright basin under a statue of Clarity
 *   holding up a lens, where witnesses wash their faces before they swear;
 * • **the Scale Plaza** at the crossing: the great bronze scale on its dais, the Cross Walk running
 *   west to the public gallery (the public must watch) and east to the Records walk;
 * • **the Courthouse of Clarity** (east): glass on every side — you can watch the trial from the
 *   plaza, and you are meant to; Prince Verdict's bench is inside;
 * • **the Palace of Noon** (north-west): the Despot's white palace behind gilded railings, every
 *   window a mirror — and the **Hall of Records** (north-east), every sentence filed under glass;
 * • **the Heliostat** (north): four iron legs come down out of the sky over everything, and between
 *   them, at the end of the Processional, the lift-house door to the mirror-crown.
 */

export const TRIB_W = 2400;
export const TRIB_H = 1800;

const PROC_X = 1200;
const CROSS_Y = 1080;

/** The Scale Plaza at the crossing, and the great scale on its dais. */
export const PLAZA: Pt = { x: 1200, y: 1080 };
const PLAZA_R = 230;
export const SCALE: Pt = { x: 1200, y: 1066 };
/** The Courthouse of Clarity: the middle of its bottom step. */
export const COURTHOUSE: Pt = { x: 1830, y: 830 };
const COURT_W = 600;
const COURT_H = 210;
/** The Palace of Noon, behind its railings. */
export const PALACE: Pt = { x: 560, y: 470 };
const RAIL_Y = 610;
/** The Hall of Records. */
export const RECORDS: Pt = { x: 2010, y: 470 };
/** The Heliostat's lift-house door. */
export const LIFT: Pt = { x: 1200, y: 112 };
/** The public gallery (its front step). */
export const GALLERY: Pt = { x: 430, y: 1004 };
/** The Fountain of Testimony — the court's fishing water. */
export const FOUNTAIN: Rect = { x: 1640, y: 1350, w: 420, h: 190 };
/** The mirror cage Hesper Dimm waits in. */
export const HESPER_CAGE: Pt = { x: 520, y: 1384 };
/** The notary's kiosk. */
export const KIOSK: Pt = { x: 930, y: 1262 };

/** The Heliostat's four legs: foot → toward the crown, far above. */
const LEGS: [Pt, Pt][] = [
  [{ x: 1000, y: 196 }, { x: 1150, y: -520 }],
  [{ x: 1400, y: 196 }, { x: 1250, y: -520 }],
  [{ x: 800, y: 336 }, { x: 1110, y: -520 }],
  [{ x: 1600, y: 336 }, { x: 1290, y: -520 }],
];

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

/** The point at fraction t along a leg (for slinging girders between them). */
function legAt(i: number, t: number): Pt {
  const [a, b] = LEGS[i];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// ── Layout ───────────────────────────────────────────────────────────

// The Heliostat: back legs (with their girders) first, then the lift, then the front legs.
for (const i of [0, 1]) {
  const [a, b] = LEGS[i];
  addPiece(a.x, a.y, 260, 760, (g) => {
    heliostatLeg(g, a.x, a.y, b.x, b.y, 40);
    if (i === 1) {
      for (const t of [0.16, 0.3]) crossGirder(g, legAt(0, t), legAt(1, t), 14);
    }
  }, { kind: 'circle', x: a.x, y: a.y - 10, r: 42 });
}
addPiece(LIFT.x, LIFT.y, 300, 560, (g) => heliostatLift(g, LIFT.x, LIFT.y, false),
  { kind: 'rect', x: LIFT.x - 112, y: LIFT.y - 46, w: 224, h: 48 });
for (const i of [2, 3]) {
  const [a, b] = LEGS[i];
  addPiece(a.x, a.y, 460, 900, (g) => {
    heliostatLeg(g, a.x, a.y, b.x, b.y, 52);
    if (i === 3) {
      for (const t of [0.22, 0.38]) crossGirder(g, legAt(2, t), legAt(3, t), 18);
      // Diagonal ties from the front legs back to the rear ones.
      crossGirder(g, legAt(2, 0.12), legAt(0, 0.3), 10);
      crossGirder(g, legAt(3, 0.12), legAt(1, 0.3), 10);
    }
  }, { kind: 'circle', x: a.x, y: a.y - 12, r: 52 });
}

// The Palace of Noon and its gilded railings (the gate is shut; the Despot is up the Heliostat).
addPiece(PALACE.x, PALACE.y, 760, 520, (g) => palaceOfNoon(g, PALACE.x, PALACE.y, 640, 220),
  { kind: 'rect', x: PALACE.x - 340, y: PALACE.y - 90, w: 680, h: 92 });
for (const [x0, x1] of [[40, 520], [600, 1040]] as [number, number][]) {
  addPiece((x0 + x1) / 2, RAIL_Y, x1 - x0, 90, (g) => gildedRailing(g, x0, x1, RAIL_Y), { kind: 'rect', x: x0, y: RAIL_Y - 14, w: x1 - x0, h: 16 });
}
// The gate itself: two leaves, chained, a gilt sun where they meet.
addPiece(560, RAIL_Y, 100, 120, (g) => {
  gildedRailing(g, 520, 600, RAIL_Y, 84);
  g.lineStyle(3, 0x8a7a68, 1); g.lineBetween(526, RAIL_Y - 50, 594, RAIL_Y - 30); g.lineBetween(526, RAIL_Y - 30, 594, RAIL_Y - 50);
  g.fillStyle(GOLD, 1); g.fillCircle(560, RAIL_Y - 40, 8);
}, { kind: 'rect', x: 520, y: RAIL_Y - 14, w: 80, h: 16 });

// The Hall of Records.
addPiece(RECORDS.x, RECORDS.y, 480, 320, (g, rng) => hallOfRecords(g, RECORDS.x, RECORDS.y, 420, 210, rng),
  { kind: 'rect', x: RECORDS.x - 220, y: RECORDS.y - 56, w: 440, h: 58 });

// The Courthouse of Clarity.
addPiece(COURTHOUSE.x, COURTHOUSE.y, 700, 460, (g, rng) => courthouse(g, COURTHOUSE.x, COURTHOUSE.y, COURT_W, COURT_H, rng),
  { kind: 'rect', x: COURTHOUSE.x - COURT_W / 2 - 10, y: COURTHOUSE.y - 120, w: COURT_W + 20, h: 92 });
// Robe-purple swags along the foot of the courthouse glass, either side of the doors.
addPiece(COURTHOUSE.x, COURTHOUSE.y - 58, 620, 40, (g) => {
  for (let k = 0; k < 8; k++) {
    if (k === 3 || k === 4) continue;
    const x1 = COURTHOUSE.x - COURT_W / 2 + k * 75;
    robeSwag(g, x1, x1 + 75, COURTHOUSE.y - 86, 14);
  }
});
// Witness stands on the courthouse steps (used for swearing in the open).
for (const x of [COURTHOUSE.x - 220, COURTHOUSE.x + 220]) {
  addPiece(x, COURTHOUSE.y - 6, 60, 90, (g) => witnessStand(g, x, COURTHOUSE.y - 6, 1, 0.8), { kind: 'circle', x, y: COURTHOUSE.y - 18, r: 18 });
}

// The great bronze scale on its dais in the plaza.
addPiece(SCALE.x, SCALE.y, 280, 380, (g) => bronzeScale(g, SCALE.x, SCALE.y, 1, 0.14),
  { kind: 'rect', x: SCALE.x - 95, y: SCALE.y - 38, w: 190, h: 40 });
// Law-stones round the plaza rim.
for (let i = 0; i < 10; i++) {
  const a = (i / 10) * Math.PI * 2 + Math.PI / 10;
  const x = PLAZA.x + Math.cos(a) * (PLAZA_R - 16), y = PLAZA.y + Math.sin(a) * (PLAZA_R - 16) * 0.8;
  if (Math.abs(Math.sin(a)) > 0.9 || Math.abs(Math.cos(a)) > 0.95) continue; // keep the four walks open
  addPiece(x, y, 30, 50, (g) => lawStone(g, x, y, 1, 0.4), { kind: 'circle', x, y: y - 6, r: 11 });
}

// The public gallery (west of the plaza), facing the courthouse across the Cross Walk.
addPiece(GALLERY.x, GALLERY.y, 400, 160, (g, rng) => juryGallery(g, GALLERY.x, GALLERY.y, 360, 5, rng),
  { kind: 'rect', x: GALLERY.x - 182, y: GALLERY.y - 120, w: 364, h: 122 });

// The Mirror Cages yard (south-west): six cages in two rows, one of them Hesper's.
const CAGES: [number, number, number | null][] = [
  [360, 1384, 0xb8a888], [680, 1384, 0x7a8aa0], [360, 1564, null], [520, 1564, 0xa07a6a], [680, 1564, 0xc8b8a0],
];
for (const [x, y, c] of CAGES) addPiece(x, y, 80, 120, (g) => mirrorCage(g, x, y, 26, c), { kind: 'circle', x, y: y - 4, r: 30 });
// Hesper's cage draws over her (its piece sits a touch south of where she sits).
addPiece(HESPER_CAGE.x, HESPER_CAGE.y + 14, 80, 120, (g) => mirrorCage(g, HESPER_CAGE.x, HESPER_CAGE.y + 14, 26, null, 0.18),
  { kind: 'circle', x: HESPER_CAGE.x, y: HESPER_CAGE.y + 2, r: 30 });
// The bench of Clears beside the yard.
for (const [x, y] of [[860, 1640], [980, 1640]] as [number, number][]) {
  addPiece(x, y, 90, 70, (g) => { waitingBench(g, x, y, 76); clearFigure(g, x - 16, y - 12, 1); if (x < 900) clearFigure(g, x + 18, y - 12, 0.9); });
}
// The notary's kiosk at the corner of the yard.
addPiece(KIOSK.x, KIOSK.y, 170, 190, (g) => notaryKiosk(g, KIOSK.x, KIOSK.y), { kind: 'rect', x: KIOSK.x - 70, y: KIOSK.y - 30, w: 140, h: 32 });

// The Fountain of Testimony and its statue.
addPiece(FOUNTAIN.x + FOUNTAIN.w / 2, FOUNTAIN.y + FOUNTAIN.h / 2 + 10, 90, 200,
  (g) => clarityStatue(g, FOUNTAIN.x + FOUNTAIN.w / 2, FOUNTAIN.y + FOUNTAIN.h / 2 + 10));
solids.push({ kind: 'rect', x: FOUNTAIN.x - 16, y: FOUNTAIN.y - 16, w: FOUNTAIN.w + 32, h: FOUNTAIN.h + 30 });

// The entrance: waystone, Docket, law-stones down both sides of the Processional.
addPiece(1070, 1640, 60, 100, (g) => tribunalWaystone(g, 1070, 1640), { kind: 'circle', x: 1070, y: 1634, r: 16 });
addPiece(1340, 1560, 110, 130, (g) => docketBoard(g, 1340, 1560), { kind: 'rect', x: 1300, y: 1552, w: 80, h: 10 });
for (const y of [1380, 1500]) {
  for (const k of [-1, 1]) {
    const x = PROC_X + k * 92;
    addPiece(x, y, 30, 50, (g) => lawStone(g, x, y, 0.9, 0.3), { kind: 'circle', x, y: y - 6, r: 10 });
  }
}
// Signal mirrors along the Processional north of the plaza and by the cages, aimed at corners.
const MIRRORS: [number, number, number][] = [
  [1110, 720, 0.4], [1290, 720, -0.5], [1110, 460, 0.9], [1290, 460, -0.2], [240, 1460, 0.6], [1500, 1300, -0.7], [2240, 1340, 0.3],
];
for (const [x, y, a] of MIRRORS) addPiece(x, y, 40, 90, (g) => signalMirror(g, x, y, a), { kind: 'circle', x, y: y - 4, r: 9 });
// A waiting bench by the courthouse steps, a Clear on it.
addPiece(1430, 960, 90, 70, (g) => { waitingBench(g, 1430, 960, 76); clearFigure(g, 1410, 948, 1); });

// ── The terrace edge ────────────────────────────────────────────────

const GAP = 110;
// South: a balustrade drawn as pieces, so it stands over anyone walking along it.
for (const [x0, x1] of [[0, PROC_X - GAP], [PROC_X + GAP, TRIB_W]] as [number, number][]) {
  addPiece((x0 + x1) / 2, TRIB_H, x1 - x0, 60, (g) => balustrade(g, x0, x1, TRIB_H), { kind: 'rect', x: x0, y: TRIB_H - 34, w: x1 - x0, h: 34 });
}
// West and east: flat in the ground; solid strips. North: the rock the Heliostat stands on.
solids.push({ kind: 'rect', x: 0, y: 0, w: 40, h: TRIB_H });
solids.push({ kind: 'rect', x: TRIB_W - 40, y: 0, w: 40, h: TRIB_H });
solids.push({ kind: 'rect', x: 0, y: 0, w: TRIB_W, h: 64 });

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 160): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

/** Where the signal mirrors throw their patches of noon. */
const THROWS: [number, number, number, number][] = MIRRORS.map(([x, y], i) => [x, y - 66, x + ((i * 137) % 220) - 110, y + 60 + ((i * 53) % 60)]);

/** The Heliostat's mirrors, hung across the top of the world between the legs. */
const HELIO: { x: number; y: number; w: number; h: number; s: number }[] = [];
for (let i = 0; i < 11; i++) HELIO.push({ x: 760 + i * 88, y: 36 + (i % 2) * 26, w: 56, h: 40, s: i * 0.71 });

const painter: AreaPainter = {
  ground(g, rng) {
    const W = TRIB_W, H = TRIB_H;
    marbleTerrace(g, { x: 0, y: 0, w: W, h: H }, rng, 96);
    // The terrace edges seen from above: the coping of the balustrade.
    for (const x0 of [0, W - 40]) {
      g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x0, 0, 40, H);
      g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x0 + 4, 0, 32, H);
      for (let y = 20; y < H; y += 40) { g.fillStyle(0xffffff, 0.4); g.fillRect(x0 + 8, y, 24, 3); }
    }
    // The bare rock the Heliostat stands in, along the north edge.
    g.fillStyle(0xd8d0bc, 1); g.fillRect(0, 0, W, 70);
    for (let i = 0; i < 80; i++) { g.fillStyle(rng() < 0.5 ? 0xc8bea8 : 0xeae4d4, 0.8); g.fillEllipse(rng() * W, rng() * 64, 20 + rng() * 40, 6 + rng() * 8); }

    // The walks.
    processional(g, PROC_X, 150, H, 124);
    sideWalk(g, [{ x: 40, y: CROSS_Y }, { x: PLAZA.x - PLAZA_R + 20, y: CROSS_Y }], 84);
    sideWalk(g, [{ x: PLAZA.x + PLAZA_R - 20, y: CROSS_Y }, { x: W - 40, y: CROSS_Y }], 84);
    // To the courthouse steps and the prince's door.
    sideWalk(g, [{ x: COURTHOUSE.x, y: CROSS_Y - 40 }, { x: COURTHOUSE.x, y: COURTHOUSE.y }], 120);
    // The Records walk north, and the walk along the railings to the palace gate.
    sideWalk(g, [{ x: 1500, y: CROSS_Y - 40 }, { x: 1500, y: 540 }], 60);
    sideWalk(g, [{ x: 1500, y: 540 }, { x: 2300, y: 540 }], 60);
    sideWalk(g, [{ x: 120, y: 680 }, { x: PROC_X - 62, y: 680 }], 70);
    sideWalk(g, [{ x: 560, y: 680 }, { x: 560, y: CROSS_Y - 42 }], 50);
    // Round the cages and down to the fountain.
    sideWalk(g, [{ x: 220, y: 1474 }, { x: PROC_X - 62, y: 1474 }], 64);
    sideWalk(g, [{ x: PROC_X + 62, y: 1600 }, { x: 2300, y: 1600 }], 64);
    sideWalk(g, [{ x: 2200, y: CROSS_Y + 40 }, { x: 2200, y: 1600 }], 56);
    // The Scale Plaza.
    scalePlaza(g, PLAZA.x, PLAZA.y, PLAZA_R);
    // The cage yard: a square of hot flagging, every slab white.
    g.fillStyle(0xfffcf4, 0.6); g.fillRect(270, 1300, 500, 340);
    g.lineStyle(2, GOLD, 0.5); g.strokeRect(270, 1300, 500, 340);
    // The fountain basin.
    fountainBasin(g, FOUNTAIN, rng);
    // The lift-house apron: a disc of iron plate let into the stone.
    g.fillStyle(0x5e5650, 0.5); g.fillEllipse(LIFT.x, LIFT.y + 40, 300, 70);
    g.lineStyle(2, 0x3a3634, 0.7); g.strokeEllipse(LIFT.x, LIFT.y + 40, 300, 70);
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; g.fillStyle(0x8a7a68, 1); g.fillCircle(LIFT.x + Math.cos(a) * 140, LIFT.y + 40 + Math.sin(a) * 30, 2); }
    // The Heliostat's legs throw the only long shadows in the court — hard, straight, cool.
    for (const [a, b] of LEGS) {
      g.fillStyle(0x6a7088, 0.12);
      g.fillTriangle(a.x - 30, a.y, a.x + 30, a.y, a.x + (b.x - a.x) * 0.12, a.y + 40);
    }
  },

  pieces,

  animate(g, t, view) {
    // Patches of noon thrown by the signal mirrors, sliding as clerks swivel them.
    THROWS.forEach(([ax, ay, bx, by], i) => {
      if (!inView(bx, by, view, 260)) return;
      const tx = bx + Math.sin(t * 0.3 + i) * 40, ty = by + Math.cos(t * 0.25 + i * 2) * 20;
      noonBeam(g, ax, ay, tx, ty, 0.35 + Math.sin(t * 0.8 + i) * 0.1, 3);
      g.fillStyle(SUN, 0.16); g.fillEllipse(tx, ty, 54, 20);
    });
    // The fountain: caustics, the lens jet, spray rings.
    const fr = FOUNTAIN;
    if (inView(fr.x + fr.w / 2, fr.y + fr.h / 2, view, 300)) {
      caustics(g, { x: fr.x + 20, y: fr.y + 16, w: fr.w - 40, h: fr.h - 40 }, t, 12, 3);
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.5 + i / 3) % 1;
        g.lineStyle(1.2, WATER_LIT, 0.6 * (1 - ph));
        g.strokeEllipse(fr.x + fr.w / 2 + 24, fr.y + fr.h / 2 + 18, 14 + ph * 70, 5 + ph * 22);
      }
      // Water falling from the lens's rim.
      const lx = fr.x + fr.w / 2 + 20, ly = fr.y + fr.h / 2 + 10 - 162;
      for (let i = 0; i < 6; i++) {
        const ph = (t * 1.2 + i / 6) % 1;
        g.fillStyle(WATER_LIT, 0.7 * (1 - ph)); g.fillCircle(lx + 10 + ph * 6, ly + 8 + ph * 150, 2);
      }
    }
    // The trial inside the courthouse: the judge's gavel rising and falling, light sliding over the glass.
    if (inView(COURTHOUSE.x, COURTHOUSE.y - 200, view, 420)) {
      const floorY = COURTHOUSE.y - 60;
      const bx = COURTHOUSE.x + 14, by = floorY - COURT_H * 0.42 - 26;
      const lift = Math.max(0, Math.sin(t * 2.2)) * 8;
      g.lineStyle(2, 0x6a4520, 1); g.lineBetween(bx, by, bx + 8, by - 6 - lift);
      g.fillStyle(0x341640, 1); g.fillRect(bx + 4, by - 12 - lift, 9, 6);
      glassGlint(g, COURTHOUSE.x - COURT_W / 2, floorY - COURT_H, COURT_W, COURT_H, t, 0.1);
      glassGlint(g, COURTHOUSE.x - COURT_W / 2, floorY - COURT_H, COURT_W, COURT_H, t, 0.6, 0.09);
    }
    if (inView(RECORDS.x, RECORDS.y - 140, view, 300)) glassGlint(g, RECORDS.x - 210, RECORDS.y - 236, 420, 210, t, 0.3, 0.1);
    // The great scale's pans glinting.
    if (inView(SCALE.x, SCALE.y - 200, view, 260)) {
      const k = (Math.sin(t * 1.3) + 1) / 2;
      glow(g, SCALE.x - 106, SCALE.y - 140 + 14, 20, SUN_HOT, 0.04 + k * 0.05, 2);
      glow(g, SCALE.x + 108, SCALE.y - 140 + 46, 16, SUN, 0.03 + (1 - k) * 0.04, 2);
    }
  },

  animateOver(g, t, view) {
    // The Heliostat's mirrors high overhead, tilting on their gimbals, flashing as they catch the sun.
    if (view.y < 200) {
      for (const m of HELIO) {
        if (!inView(m.x, m.y, view, 80)) continue;
        const tilt = Math.sin(t * 0.18 + m.s) * 0.9;
        const flash = Math.max(0, Math.cos(t * 0.18 + m.s) - 0.92) * 12;
        heliostatMirror(g, m.x, m.y, m.w, m.h, tilt, Math.min(1, flash));
      }
    }
    // A shaft of the pinned sun down the Processional, dust glinting in it.
    if (inView(PROC_X, 600, view, 400)) {
      for (let i = 0; i < 16; i++) {
        const ph = (t * 0.05 + i / 16) % 1;
        const x = PROC_X - 50 + ((i * 37) % 100) + Math.sin(t + i) * 6, y = 200 + ph * 1400;
        g.fillStyle(SUN, 0.5 * Math.sin(ph * Math.PI)); g.fillCircle(x, y, 1.3);
      }
    }
    // Glare off the fountain's lens.
    const lx = FOUNTAIN.x + FOUNTAIN.w / 2 + 20, ly = FOUNTAIN.y + FOUNTAIN.h / 2 + 10 - 162;
    if (inView(lx, ly, view, 120)) glow(g, lx, ly, 22 + Math.sin(t * 3) * 4, SUN, 0.07, 3);
  },
};

export const TRIBUNAL_AREA: AreaDef = {
  id: 'tribunal',
  isle: 'light',
  court: 'tribunal',
  name: 'The Tribunal Court',
  subtitle: 'Where the shade-thieves are tried, in glass, at noon',
  w: TRIB_W,
  h: TRIB_H,
  bg: 0xcfc6b4,
  accent: TRIBUNAL_COLOR,
  weather: 'glare',
  spawn: { x: 1200, y: 1710 },
  painter,
  solids,
  exits: [
    { side: 's', to: 'noon', label: 'Down the Steps of Appeal to the Noon Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 1070, y: 1672 } },
    { kind: 'prince', id: 'verdict', at: { x: COURTHOUSE.x, y: COURTHOUSE.y + 40 } },
    {
      kind: 'door', at: { x: 1200, y: 150 }, to: 'heliostat', arrive: { x: 900, y: 2440 },
      open: { princesOfIsle: 'light', count: 6 }, label: 'The Heliostat',
      lockedText: 'Six keyholes in the brass lock, one for each Radiance. Bring down all six princes of Solmara.',
    },
    { kind: 'water', id: 'tribunal-fountain', shape: FOUNTAIN, fishery: 'tribunal-fountain' },
    { kind: 'encounter', id: 'tribunal-glass-cage' },
    { kind: 'encounter', id: 'tribunal-jury-box' },
    { kind: 'encounter', id: 'tribunal-objection' },
    { kind: 'encounter', id: 'tribunal-contempt' },
    { kind: 'encounter', id: 'tribunal-sworn-oath' },
    {
      kind: 'sign', at: { x: 1300, y: 1690 },
      text: 'THE TRIBUNAL OF CLARITY. All trials are public. All publics are to watch. Shade is evidence.',
    },
    {
      kind: 'sign', at: { x: 820, y: 1300 },
      text: 'THE MIRROR CAGES. The accused shall be seen from every side until judged. Do not shade the cages.',
    },
    {
      kind: 'sign', at: { x: 560, y: 650 },
      text: 'THE PALACE OF NOON. His Radiance is in residence above. Approach the railings with your hands visible.',
    },
    {
      kind: 'sign', at: { x: 1290, y: 260 },
      text: 'THE HELIOSTAT. By order of the Despot: no ascent without six keys. The sun is not to be disturbed.',
    },
    { kind: 'chest', id: 'tribunal-chest-records', at: { x: 2300, y: 620 }, coins: 180 },
    { kind: 'chest', id: 'tribunal-chest-bench', at: { x: 2260, y: 860 }, orbs: 3, open: { prince: 'verdict' } },
  ],
  npcs: TRIBUNAL_NPCS,
  crowd: TRIBUNAL_CROWD,
};
