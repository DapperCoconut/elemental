import type { AreaDef, NpcDef, PainterWorld, Poi, Pt, Rect, Solid } from '../../../../IslesTypes';
import { type G, dim, lit, mulberry, motes } from '../../../../art/IsleArt';
import { OBS, crackPath, glassFloor, seam, shard, slab } from '../../../../art/PinnacleArt';
import { BENCHES, above, below, relicId, seatId, benchIntroId } from '../../spec';
import {
  BONE, OCHRE, OCHRE_LIT, SANDSTONE, STRATA, type SeatSigil, benchSeat, crownMark, greatScale, strataH, strataV, titheStack,
} from './art';

/**
 * The Stone Bench — fifth bench of the Obsidian Pinnacle, where the Stone Tithe was written.
 *
 * A vault cut through the strata: every isle's stone lies in the black glass in layers, the side
 * walls show them end-on and the north face shows them bedded and faulted like a quarry wall. Tithe-
 * stones are stacked about the floor like coin. You climb from the south stair:
 *
 *   The landing    (y 1760–1930) the waystone, a mason who has stopped cutting.
 *   Lower aisle    (y 1380–1760) the Seats of Bedrock (west) and Facets (east).
 *   The Scale      (y  760–1360) THE GREAT SCALE: a mountain of tithe-stone in one pan, one crown in the
 *                                other, and the beam leaning to the crown. The Seats of Likeness (west) and
 *                                Drifts (east) flank it; the Tallyman still adds stones at its foot.
 *                                When the six seats are empty, the beam has tipped back to the stone.
 *   Upper aisle    (y  300–760)  the Seats of Fetters (west) and Remainders (east).
 *   The stair up   (y    0–300)  the relic chest, and the stair to the Storm Bench, weighed shut until
 *                                every seat is empty. A hairline of starlight in the face above it.
 */

const B = BENCHES.find((x) => x.isle === 'earth')!;

const W = 1600;
const H = 2000;
const L = 170;
const R = 1430;
const MID = 800;
const NORTH = 150;
const SOUTH = 1930;
const SCALE: Pt = { x: MID, y: 1290 };

// ── Seats ────────────────────────────────────────────────────────────

interface SeatSpot { el: string; sigil: SeatSigil; chair: Pt }
/** Where each chair stands (its plinth's foot); the councilor stands 60 px in front of it. */
export const SEAT_SPOTS: SeatSpot[] = [
  { el: 'earth', sigil: 'earth', chair: { x: 420, y: 1640 } },
  { el: 'crystal', sigil: 'crystal', chair: { x: 1180, y: 1500 } },
  { el: 'clay', sigil: 'clay', chair: { x: 280, y: 1060 } },
  { el: 'dune', sigil: 'dune', chair: { x: 1320, y: 960 } },
  { el: 'metal', sigil: 'metal', chair: { x: 440, y: 560 } },
  { el: 'ruin', sigil: 'ruin', chair: { x: 1160, y: 440 } },
];
/** Where the councilor of `el` stands. */
export const seatAt = (el: string): Pt => {
  const s = SEAT_SPOTS.find((x) => x.el === el)!;
  return { x: s.chair.x, y: s.chair.y + 60 };
};

// ── Coin-stacks of tithe-stone ───────────────────────────────────────

const STACKS: { x: number; y: number; n: number; r: number }[] = [
  { x: 250, y: 1820, n: 7, r: 22 }, { x: 300, y: 1860, n: 4, r: 18 }, { x: 1350, y: 1800, n: 9, r: 24 }, { x: 1300, y: 1850, n: 5, r: 17 },
  { x: 640, y: 1500, n: 6, r: 20 }, { x: 960, y: 1640, n: 4, r: 16 },
  { x: 250, y: 1290, n: 8, r: 22 }, { x: 1360, y: 1260, n: 6, r: 20 }, { x: 1300, y: 1330, n: 3, r: 16 },
  { x: 600, y: 760, n: 7, r: 20 }, { x: 1000, y: 720, n: 9, r: 23 }, { x: 1050, y: 780, n: 4, r: 17 },
  { x: 250, y: 400, n: 10, r: 24 }, { x: 300, y: 330, n: 5, r: 18 }, { x: 1350, y: 620, n: 7, r: 21 }, { x: 640, y: 290, n: 6, r: 19 },
];

// ── Solids ───────────────────────────────────────────────────────────

const solids: Solid[] = [
  { kind: 'rect', x: 0, y: 0, w: L, h: H },
  { kind: 'rect', x: R, y: 0, w: W - R, h: H },
  // The north face, leaving the stair (x 700–900) open.
  { kind: 'rect', x: L, y: 0, w: 700 - L, h: NORTH },
  { kind: 'rect', x: 900, y: 0, w: R - 900, h: NORTH },
  // The south lip, leaving the stair down open.
  { kind: 'rect', x: L, y: SOUTH, w: 700 - L, h: H - SOUTH },
  { kind: 'rect', x: 900, y: SOUTH, w: R - 900, h: H - SOUTH },
  // The Scale's plinth and the footings under its two pans.
  { kind: 'rect', x: SCALE.x - 150, y: SCALE.y - 40, w: 300, h: 44 },
  { kind: 'circle', x: SCALE.x - 330, y: SCALE.y - 36, r: 92 },
  { kind: 'circle', x: SCALE.x + 330, y: SCALE.y - 70, r: 62 },
];
for (const s of SEAT_SPOTS) solids.push({ kind: 'rect', x: s.chair.x - 72, y: s.chair.y - 34, w: 144, h: 36 });
for (const s of STACKS) solids.push({ kind: 'circle', x: s.x, y: s.y - 4, r: s.r + 4 });

// ── Ground ───────────────────────────────────────────────────────────

/** Fixed crack lines across the floor (shared by the baked ground and the breathing seams). */
const CRACKS: Pt[][] = (() => {
  const rng = mulberry(5505);
  const out: Pt[][] = [];
  const add = (a: Pt, b: Pt) => out.push(crackPath(a, b, rng, 14, 9));
  add({ x: L + 10, y: 1700 }, { x: 640, y: 1560 });
  add({ x: 1020, y: 1720 }, { x: R - 10, y: 1580 });
  add({ x: 560, y: 1360 }, { x: 1040, y: 1380 });
  add({ x: L + 10, y: 880 }, { x: 560, y: 820 });
  add({ x: 1100, y: 860 }, { x: R - 10, y: 760 });
  add({ x: 700, y: 640 }, { x: 960, y: 420 });
  add({ x: L + 10, y: 220 }, { x: 520, y: 470 });
  return out;
})();

/** A ribbon of inlaid strata crossing the floor under the glass. */
function strataRibbon(g: G, y: number, h: number, rng: () => number): void {
  strataH(g, L, y, R - L, h, rng, 0.62, (rng() - 0.5) * 8);
  g.lineStyle(1, OBS.edge, 0.3);
  g.lineBetween(L, y, R, y);
  g.lineBetween(L, y + h, R, y + h);
}

/** The north face: a quarry wall of glass, every layer of the Hold bedded and faulted in it. */
function northFace(g: G, rng: () => number): void {
  g.fillStyle(OBS.glass, 1); g.fillRect(0, 0, W, NORTH + 10);
  strataH(g, L, 6, 530, NORTH - 10, rng, 0.38, 10);
  strataH(g, 900, 6, R - 900, NORTH - 10, rng, 0.38, -12);
  // Faults: dark steps across the layers.
  for (const fx of [360, 1180]) {
    g.lineStyle(3, OBS.glass, 1); g.lineBetween(fx, 6, fx + 22, NORTH);
    g.lineStyle(1, OBS.edge, 0.5); g.lineBetween(fx + 2, 6, fx + 24, NORTH);
  }
  // The face's foot: a lit ledge.
  g.fillStyle(OBS.sheen, 1); g.fillRect(L, NORTH - 6, R - L, 6);
  g.lineStyle(1.2, OBS.edge, 0.7); g.lineBetween(L, NORTH, R, NORTH);
  // The stair up, cut into the face: steps climbing into the dark.
  g.fillStyle(0x050408, 1); g.fillRect(700, 0, 200, NORTH);
  for (let i = 0; i < 7; i++) {
    const y = NORTH - 8 - i * 20;
    const inset = i * 9;
    g.fillStyle(i % 2 ? OBS.facet : OBS.sheen, 1); g.fillRect(712 + inset, y, 176 - inset * 2, 7);
    g.lineStyle(1, OBS.edge, 0.4); g.lineBetween(712 + inset, y, 888 - inset, y);
  }
  // The jambs.
  for (const jx of [690, 910]) { g.fillStyle(OBS.facet, 1); g.fillRect(jx - 10, 0, 20, NORTH); g.lineStyle(1, OBS.edge, 0.6); g.strokeRect(jx - 10, 0, 20, NORTH); }
  // The hairline of starlight in the face over the stair: the only warm thing in the room.
  seam(g, [{ x: 790, y: 2 }, { x: 806, y: 14 }, { x: 796, y: 30 }, { x: 812, y: 44 }], 1, 0.9, 0.4, OBS.star);
}

/** The south lip, where the stair from the Gale Bench comes up. */
function southLip(g: G, rng: () => number): void {
  g.fillStyle(OBS.glass, 1); g.fillRect(0, SOUTH, W, H - SOUTH);
  strataH(g, L, SOUTH + 6, 530, H - SOUTH - 6, rng, 0.5);
  strataH(g, 900, SOUTH + 6, R - 900, H - SOUTH - 6, rng, 0.5);
  g.fillStyle(0x050408, 1); g.fillRect(700, SOUTH, 200, H - SOUTH);
  for (let i = 0; i < 4; i++) { g.fillStyle(i % 2 ? OBS.facet : OBS.sheen, 1); g.fillRect(708, SOUTH + 6 + i * 16, 184, 6); }
  g.lineStyle(1.2, OBS.edge, 0.7); g.lineBetween(L, SOUTH, 700, SOUTH); g.lineBetween(900, SOUTH, R, SOUTH);
}

/** A side wall from above: its layers end-on, a pale lip along the inner edge. */
function sideWall(g: G, x0: number, x1: number, inner: number, rng: () => number): void {
  g.fillStyle(OBS.glass, 1); g.fillRect(x0, 0, x1 - x0, H);
  strataV(g, x0 + 16, 0, x1 - x0 - 32, H, rng, 0.55);
  g.fillStyle(OBS.sheen, 1); g.fillRect(inner - 4, 0, 8, H);
  g.lineStyle(1.2, OBS.edge, 0.7); g.lineBetween(inner, 0, inner, H);
}

function paintGround(g: G, rng: () => number): void {
  g.fillStyle(OBS.glass, 1); g.fillRect(0, 0, W, H);
  glassFloor(g, L, NORTH, R - L, SOUTH - NORTH, 64, rng);
  for (const [y, h] of [[330, 30], [700, 22], [1120, 36], [1420, 26], [1780, 30]] as [number, number][]) strataRibbon(g, y, h, rng);
  // The processional runner up the middle: polished, bordered in inlaid ochre.
  g.fillStyle(OBS.facet, 0.55); g.fillRect(MID - 70, NORTH, 140, SOUTH - NORTH);
  g.lineStyle(3, OCHRE, 0.35); g.lineBetween(MID - 70, NORTH, MID - 70, SOUTH); g.lineBetween(MID + 70, NORTH, MID + 70, SOUTH);
  g.lineStyle(1, OBS.edge, 0.4); g.lineBetween(MID - 64, NORTH, MID - 64, SOUTH); g.lineBetween(MID + 64, NORTH, MID + 64, SOUTH);
  for (let y = NORTH + 60; y < SOUTH; y += 120) crownMark(g, MID, y, 9, OCHRE, 0.25);
  // The Scale's floor: concentric weighing rings with graduations, round the plinth.
  for (const [r, a] of [[420, 0.18], [360, 0.22], [250, 0.3]] as [number, number][]) {
    g.lineStyle(2, OCHRE, a); g.strokeEllipse(SCALE.x, SCALE.y - 40, r * 2, r * 0.9);
  }
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    g.lineStyle(1, OBS.edge, 0.3);
    g.lineBetween(SCALE.x + Math.cos(a) * 360, SCALE.y - 40 + Math.sin(a) * 162, SCALE.x + Math.cos(a) * (i % 4 ? 380 : 400), SCALE.y - 40 + Math.sin(a) * (i % 4 ? 171 : 180));
  }
  // Dust drifted against everything: the fine grit that tithe-stone sheds.
  for (let i = 0; i < 900; i++) {
    const x = L + rng() * (R - L), y = NORTH + rng() * (SOUTH - NORTH);
    g.fillStyle(rng() < 0.5 ? SANDSTONE : BONE, 0.07 + rng() * 0.08);
    g.fillCircle(x, y, 0.6 + rng() * 1.2);
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle(SANDSTONE, 0.05); g.fillEllipse(L + rng() * (R - L), NORTH + rng() * (SOUTH - NORTH), 30 + rng() * 60, 8 + rng() * 10);
  }
  // Loose chips of tithe-stone.
  for (let i = 0; i < 70; i++) {
    const col = STRATA[i % 7];
    const x = L + 20 + rng() * (R - L - 40), y = NORTH + 30 + rng() * (SOUTH - NORTH - 60);
    g.fillStyle(dim(col, 0.4), 0.9); g.fillRect(x, y, 4 + rng() * 4, 3);
    g.fillStyle(col, 0.9); g.fillRect(x, y, 4, 1.2);
  }
  for (const c of CRACKS) seam(g, c, 1.3, 0.55, 0);
  sideWall(g, 0, L, L, rng);
  sideWall(g, R, W, R, rng);
  northFace(g, rng);
  southLip(g, rng);
}

// ── Pieces ───────────────────────────────────────────────────────────

type Piece = NonNullable<AreaDef['painter']['pieces']>[number];
const pieces: Piece[] = [];

for (const s of SEAT_SPOTS) {
  pieces.push({ x: s.chair.x, y: s.chair.y, w: 190, h: 320, draw: (g, rng) => benchSeat(g, s.chair.x, s.chair.y, 1, s.sigil, rng, s.chair.x * 0.01) });
}
for (const s of STACKS) pieces.push({ x: s.x, y: s.y, w: s.r * 3, h: s.n * s.r * 0.4 + 30, draw: (g, rng) => titheStack(g, s.x, s.y, s.n, s.r, rng) });
// The Great Scale: leaning to the crown while the Bench sits; tipped back to the stone once it is empty.
pieces.push({ x: SCALE.x, y: SCALE.y, w: 860, h: 640, when: { not: { courtReady: B.id } }, draw: (g, rng) => greatScale(g, SCALE.x, SCALE.y, 1, 0.12, rng) });
pieces.push({ x: SCALE.x, y: SCALE.y, w: 860, h: 640, when: { courtReady: B.id }, draw: (g, rng) => greatScale(g, SCALE.x, SCALE.y, 1, -0.1, rng, { after: true, t: 1 }) });
// Buttress shards along both walls.
for (let y = 260; y < SOUTH; y += 230) {
  const yl = y + ((y / 230) % 2) * 40;
  pieces.push({ x: L + 16, y: yl, w: 90, h: 260, draw: (g) => { shard(g, L + 4, yl, 50, 150 + (yl % 70), 14, 0.15); shard(g, L + 30, yl + 6, 34, 90 + (yl % 50), 8, 0.3); } });
  pieces.push({ x: R - 16, y: yl + 90, w: 90, h: 260, draw: (g) => { shard(g, R - 4, yl + 90, 50, 160 + (yl % 60), -14, 0.15); shard(g, R - 30, yl + 96, 34, 96 + (yl % 40), -8, 0.3); } });
}
// The Tallyman's desk at the mountain's foot: a lectern, a ledger open to the day's sum, a stone abacus.
pieces.push({
  x: 560, y: 1370, w: 130, h: 120, draw: (g, rng) => {
    slab(g, 560, 1370, 70, 60, rng, 1);
    g.fillStyle(OBS.sheen, 1); g.fillTriangle(518, 1312, 602, 1312, 560, 1300);
    g.fillStyle(BONE, 0.85); g.fillRect(526, 1296, 32, 20); g.fillRect(562, 1296, 32, 20);
    g.lineStyle(1, dim(BONE, 0.5), 0.8);
    for (let i = 0; i < 5; i++) { g.lineBetween(529, 1300 + i * 3.4, 555, 1300 + i * 3.4); g.lineBetween(565, 1300 + i * 3.4, 590 - (i === 4 ? 12 : 0), 1300 + i * 3.4); }
    // The abacus on the plinth beside it.
    slab(g, 620, 1370, 40, 24);
    g.lineStyle(1.4, OBS.edge, 0.7); g.strokeRect(604, 1322, 32, 22);
    for (let r = 0; r < 4; r++) {
      g.lineStyle(1, OBS.edge, 0.4); g.lineBetween(604, 1326 + r * 5, 636, 1326 + r * 5);
      for (let b = 0; b < 4; b++) { g.fillStyle(STRATA[(r + b) % 6], 1); g.fillCircle(608 + b * 5 + (r % 2) * 10, 1326 + r * 5, 2); }
    }
  },
});
// The mason's block by the landing: a half-cut tithe-stone and the chisel laid down on it.
pieces.push({
  x: 1040, y: 1800, w: 120, h: 90, draw: (g, rng) => {
    slab(g, 1040, 1800, 90, 34, rng, 1);
    g.fillStyle(dim(OCHRE, 0.4), 1); g.fillRect(1014, 1754, 44, 20);
    g.fillStyle(OCHRE, 1); g.fillRect(1014, 1754, 44, 7);
    g.fillStyle(lit(OCHRE, 0.2), 1); g.fillTriangle(1058, 1754, 1068, 1762, 1058, 1774);
    g.lineStyle(2, OBS.edge, 1); g.lineBetween(1066, 1770, 1092, 1758);
    g.fillStyle(OBS.sheen, 1); g.fillRect(1088, 1755, 8, 5);
    for (let i = 0; i < 14; i++) { g.fillStyle(OCHRE_LIT, 0.6); g.fillRect(1000 + rng() * 90, 1778 + rng() * 14, 2, 1.5); }
  },
});

// ── Animation ────────────────────────────────────────────────────────

const inView = (v: Rect, x: number, y: number, pad: number): boolean => x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

/** Under actors: the floor's cracks breathe, the weighing rings round the Scale pulse outward. */
function animateUnder(g: G, t: number, view: Rect): void {
  CRACKS.forEach((c, i) => {
    const m = c[Math.floor(c.length / 2)];
    if (!inView(view, m.x, m.y, 400)) return;
    const p = 0.5 + 0.5 * Math.sin(t * 0.9 + i * 1.3);
    seam(g, c, 1.3, 0.25 + p * 0.35, p * 0.5);
  });
  if (inView(view, SCALE.x, SCALE.y, 500)) {
    const k = (t * 0.25) % 1;
    g.lineStyle(2, OBS.seam, 0.22 * (1 - k)); g.strokeEllipse(SCALE.x, SCALE.y - 40, (260 + k * 300) * 2, (260 + k * 300) * 0.9);
  }
  if (inView(view, MID, NORTH, 300)) {
    const p = 0.5 + 0.5 * Math.sin(t * 1.7);
    g.fillStyle(OBS.seam, 0.06 + p * 0.06); g.fillEllipse(MID, NORTH + 20, 260, 60);
  }
}

/** Shafts of violet light down from the vault's cracks, at fixed spots. */
const SHAFTS: Pt[] = [{ x: 520, y: 1580 }, { x: 1100, y: 1180 }, { x: 760, y: 900 }, { x: 420, y: 760 }, { x: 980, y: 520 }, { x: 600, y: 1900 }];

/** Over actors: dust falling through shafts of violet light, and now and then a stone the Tallyman adds. */
function animateOver(g: G, t: number, view: Rect, world: PainterWorld): void {
  for (const s of SHAFTS) {
    if (!inView(view, s.x, s.y, 300)) continue;
    const p = 0.6 + 0.4 * Math.sin(t * 0.5 + s.x);
    g.fillStyle(OBS.seamLit, 0.035 * p);
    g.fillTriangle(s.x - 30, s.y - 420, s.x + 10, s.y - 420, s.x + 70, s.y + 20);
    g.fillTriangle(s.x - 30, s.y - 420, s.x + 70, s.y + 20, s.x - 50, s.y + 20);
    for (let i = 0; i < 8; i++) {
      const ph = ((t * 0.12 + i * 0.137 + s.x * 0.001) % 1);
      g.fillStyle(SANDSTONE, 0.35 * Math.sin(ph * Math.PI));
      g.fillCircle(s.x - 20 + ((i * 37) % 80) + Math.sin(t + i) * 4, s.y - 400 + ph * 420, 1.2);
    }
  }
  motes(g, view, t, 26, SANDSTONE, 10, 14, 1.1, 5);
  // A stone tumbling onto the mountain every few seconds while the law stands.
  if (!world.test({ courtReady: B.id }) && inView(view, SCALE.x - 330, SCALE.y - 200, 300)) {
    const ph = (t % 4.2) / 4.2;
    if (ph < 0.35) {
      const k = ph / 0.35;
      const x = SCALE.x - 300 + k * 14, y = SCALE.y - 520 + k * k * 180;
      g.fillStyle(dim(OCHRE, 0.35), 1); g.fillRect(x - 5, y - 4, 10, 7);
      g.fillStyle(OCHRE, 1); g.fillRect(x - 5, y - 4, 10, 2.5);
    } else if (ph < 0.45) {
      const k = (ph - 0.35) / 0.1;
      for (let i = 0; i < 5; i++) { g.fillStyle(SANDSTONE, 0.5 * (1 - k)); g.fillCircle(SCALE.x - 286 + (i - 2) * 6 * (1 + k * 2), SCALE.y - 340 - k * 6 - (i % 2) * 3, 1.4); }
    }
  }
}

// ── People ───────────────────────────────────────────────────────────

const NPCS: NpcDef[] = [
  {
    id: 'pin-tallyman', name: 'Tallyman Grist', title: 'Adds the stones',
    look: { body: 0x6a5a4a, accent: OCHRE, hat: 'visor', traits: ['glasses', 'book'], size: 0.9, eye: 0xd8c8a8 },
    at: { x: 560, y: 1420 },
    talks: [
      { when: { monarch: 'obsidian-king' }, lines: [
        'I weighed the crown again this morning. Nothing. It weighs nothing at all now.',
        'I am giving the stones back. One at a time. I know whose every one of them was. I wrote it down.',
      ] },
      { when: { courtReady: B.id }, lines: [
        'The beam moved. Sixty years I have been adding stones, and the beam has moved.',
        'I shall keep counting, I think. I should like to see how far it goes now.',
      ] },
      { lines: [
        'Four hundred and eleven thousand, six hundred and two. Six hundred and three.',
        'Every stone is a season of somebody. The crown still outweighs them all. It always has.',
        'I add, challenger. I was never asked what for, and I never asked.',
      ] },
    ],
  },
  {
    id: 'pin-undermason', name: 'Undermason Quoyne', title: 'Has stopped cutting',
    look: { body: 0x7a6a58, accent: 0x3a2a1a, hat: 'miner', traits: ['apron', 'tool', 'bandage'], size: 1.05, eye: 0xe0d0b0 },
    at: { x: 1000, y: 1850 },
    talks: [
      { when: { monarch: 'obsidian-king' }, lines: [
        'I cut one more stone today. A doorstep, for a cell in the Sepulchre. So it stays open.',
      ] },
      { when: { courtReady: B.id }, lines: [
        'Six empty seats. Do you know, I never once saw them sit in them. They only stood and weighed.',
        'Go on up. I will sweep.',
      ] },
      { lines: [
        'I cut every tithe-stone to the ounce. Then the Bench weighed it and called it short.',
        'I stopped cutting this morning. Nobody has noticed. The masks never look down.',
      ] },
    ],
  },
];

// ── Points of interest ───────────────────────────────────────────────

const POIS: Poi[] = [
  { kind: 'waystone', at: { x: 640, y: 1860 } },
  ...SEAT_SPOTS.map((s): Poi => ({ kind: 'encounter', id: seatId(s.el) })),
  { kind: 'chest', id: relicId(B.id), at: { x: 1000, y: 250 }, item: relicId(B.id), orbs: 8, open: { courtReady: B.id } },
];

export const EARTH_BENCH_AREA: AreaDef = {
  id: B.id,
  isle: 'pinnacle',
  name: B.name,
  subtitle: B.subtitle,
  w: W,
  h: H,
  bg: OBS.sky,
  accent: B.color,
  weather: 'dust',
  spawn: { x: MID, y: 1860 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver },
  solids,
  exits: [
    { side: 's', to: below(B), label: 'Down to the Gale Bench' },
    { side: 'n', to: above(B), label: 'Up to the Storm Bench', open: { courtReady: B.id }, lockedText: 'The stair is weighed shut. Six seats are still occupied.' },
  ],
  pois: POIS,
  npcs: NPCS,
  gloom: 0.24,
  intro: benchIntroId(B.id),
};
