import type { AreaDef, Poi, Rect, Solid } from '../../../../IslesTypes';
import { type G, blob, dim, glow, groundFill, lit, mixC, road, rock, shadow } from '../../../../art/IsleArt';
import {
  BASALT, BRASS, DUST, EMBER, FOAM, GRANITE, GRANITE_DARK, IRON, LIME, LIME_DARK, REGENT, ROPE, SAND_DARK, SAND_LIT,
  SANDSTONE, SEA, SEA_DEEP, SEA_SHALLOW, SHALE, TIMBER, TIMBER_DARK, TIMBER_LIT, ashlar, blockStack, boatOnStocks,
  bollard, chockShop, collarCart, cutStair, frameSaw, gravaneSeal, headframe, hearthstone, inView, liftCage, masonLodge, poly,
  regentStatue, rockHouse, spalls, stoneBarge, strataFace, tackleShack, titheRoll, titheScales, treadCrane,
} from './art';
import { AT, QUARRYMOUTH_CROWD, QUARRYMOUTH_NPCS } from './people';

/**
 * Quarrymouth — the harbour cut into an old quarry face, and where every crossing to Bedrock Hold
 * makes landfall.
 *
 * For three hundred years the Hold was quarried from the sea inward, and when the quarrymen had cut
 * the face back far enough the sea came in after them: the floor of the old pit is the harbour. They
 * left the face behind them in three great steps, and the town lives on the steps. The Rim at the
 * top is still working ground — the stonecutters' yards, the mason's lodge, the head of the lift and
 * the Haul Road north to the Stonehold. The Long Step in the middle is the street: doorways cut
 * straight into the bedding, the Hearthstone, the Chock & Chisel, and the plaza where the Regent's
 * statue stands on the buried Old King. The quay at the bottom is cut stone to the water's edge, with
 * treadwheel cranes lowering blocks onto barges, the boatwright's slip, the tackle shop at the crane
 * pier — and in the middle of it, the size of a chapel, the Tithe Scales.
 *
 * You land at the end of the Barge Pier and walk up it straight at the Scales' right-hand pan,
 * which is down, full of the Regent's black basalt.
 */

const W = 2600;
const H = 1500;

/** The two cliff faces between the benches: [top, bottom], and the gaps cut through them. */
const FACE_A: [number, number] = [290, 345];
const FACE_B: [number, number] = [860, 915];
const GAPS_A: [number, number][] = [[380, 480], [1240, 1360], [1880, 1980]];
const GAPS_B: [number, number][] = [[640, 740], [1240, 1360], [2040, 2140]];
/** Where the harbour begins. */
const SEA_Y = 1300;
/** The two piers out over the water. */
const BARGE_PIER: Rect = { x: 1250, y: 1290, w: 100, h: 210 };
const CRANE_PIER: Rect = { x: 1960, y: 1290, w: 80, h: 150 };
/** The lift: its x, the quay landing and the Rim landing. */
const LIFT_X = 2480;
const LIFT_LOW = 958;
const LIFT_HIGH = 246;
/** The Scales' plinth front. */
const SCALES = { x: 860, y: 1180 };
/** The Name-Pit on the Rim, where the Regent's men threw the chiselled-off street plaques. */
const NAME_PIT = { x: 1760, y: 150 };

// ── Ground ──────────────────────────────────────────────────────────

/** Spans of a face that are solid rock (the complement of its gaps). */
function faceSpans(gaps: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  let x = 0;
  for (const [a, b] of gaps) { out.push([x, a]); x = b; }
  out.push([x, W]);
  return out;
}

function paintGround(g: G, rng: () => number): void {
  // ── The Rim: rough quarried bedrock, levelled and dusty.
  groundFill(g, { x: 0, y: 0, w: W, h: FACE_A[0] }, mixC(SANDSTONE, SAND_LIT, 0.2), SANDSTONE, SAND_DARK, rng, 1.2);
  // Old bed-floors where blocks were lifted: shallow rectangular steps in the rock.
  for (let i = 0; i < 26; i++) {
    const bx = rng() * W, by = 20 + rng() * (FACE_A[0] - 60), bw = 60 + rng() * 140, bh = 24 + rng() * 40;
    if (Math.abs(bx + bw / 2 - 1300) < 120) continue;
    g.fillStyle(dim(SANDSTONE, 0.12), 0.5); g.fillRect(bx, by, bw, bh);
    g.fillStyle(SAND_LIT, 0.4); g.fillRect(bx, by, bw, 2);
    g.fillStyle(SAND_DARK, 0.35); g.fillRect(bx, by + bh - 2, bw, 2);
  }
  // The stonecutters' yard: a broad pale apron of dust and chips.
  blob(g, 600, 170, 420, 110, DUST, 0.45, rng, 14);
  for (let i = 0; i < 300; i++) {
    const c = [LIME, SAND_LIT, SHALE][Math.floor(rng() * 3)];
    g.fillStyle(c, 0.7); g.fillRect(200 + rng() * 820, 70 + rng() * 200, 2 + rng() * 2, 1.5 + rng() * 1.5);
  }
  // The Haul Road north: a worn track with two deep cart-ruts and dragged-block scars.
  road(g, [{ x: 1300, y: -10 }, { x: 1296, y: 120 }, { x: 1300, y: FACE_A[0] }], 120, mixC(SANDSTONE, DUST, 0.5), SAND_DARK, SAND_LIT, rng);
  for (const ox of [-26, 26]) {
    g.lineStyle(5, dim(SANDSTONE, 0.35), 0.8); g.lineBetween(1300 + ox, 0, 1300 + ox, FACE_A[0]);
    g.lineStyle(1, SAND_LIT, 0.6); g.lineBetween(1300 + ox + 3, 0, 1300 + ox + 3, FACE_A[0]);
  }
  for (let y = 10; y < FACE_A[0]; y += 30) { g.lineStyle(1, SAND_DARK, 0.25); g.lineBetween(1270, y, 1330, y + 8); }
  // The Name-Pit: a ragged hole, its floor a jumble of plaques face-down.
  g.fillStyle(SAND_DARK, 1); g.fillEllipse(NAME_PIT.x, NAME_PIT.y, 140, 78);
  g.fillStyle(dim(SAND_DARK, 0.4), 1); g.fillEllipse(NAME_PIT.x, NAME_PIT.y + 4, 120, 60);
  for (let i = 0; i < 18; i++) {
    const a = rng() * Math.PI * 2, d = rng() * 44;
    const px = NAME_PIT.x + Math.cos(a) * d, py = NAME_PIT.y + 4 + Math.sin(a) * d * 0.45;
    const ang = rng() * 0.8 - 0.4;
    poly(g, [[px - 14, py - 4 + ang * 10], [px + 14, py - 4 - ang * 10], [px + 14, py + 4 - ang * 10], [px - 14, py + 4 + ang * 10]], rng() < 0.5 ? LIME : LIME_DARK, 1);
    if (rng() < 0.3) { g.lineStyle(1, SAND_DARK, 0.9); g.lineBetween(px - 9, py, px + 9, py); }
  }
  g.lineStyle(2, SAND_LIT, 0.6); g.strokeEllipse(NAME_PIT.x, NAME_PIT.y - 2, 142, 78);

  // ── The Long Step: ashlar street running the length of the middle bench, plain rock either side.
  groundFill(g, { x: 0, y: FACE_A[1], w: W, h: FACE_B[0] - FACE_A[1] }, mixC(SANDSTONE, LIME, 0.25), SANDSTONE, SAND_DARK, rng, 1);
  ashlar(g, { x: 0, y: 700, w: W, h: 100 }, 20, mixC(LIME, SANDSTONE, 0.4), SAND_DARK, rng);
  g.fillStyle(LIME_DARK, 1); g.fillRect(0, 698, W, 3); g.fillRect(0, 800, W, 3);
  // The plaza at the head of the Grand Stair: a square of big flags round the statue.
  ashlar(g, { x: 1110, y: 400, w: 420, h: 300 }, 30, LIME, LIME_DARK, rng);
  g.lineStyle(3, LIME_DARK, 1); g.strokeRect(1110, 400, 420, 300);
  // Door-paths from each rock-cut house down to the street.
  for (const x of [160, 600, 1000, 1600, 2200, 2340]) {
    g.fillStyle(mixC(LIME, SANDSTONE, 0.5), 0.8); g.fillRect(x - 16, FACE_A[1] + 4, 32, 700 - FACE_A[1] - 4);
    for (let y = FACE_A[1] + 14; y < 700; y += 18) { g.fillStyle(LIME_DARK, 0.6); g.fillRect(x - 16, y, 32, 1.5); }
  }
  // Dust drifted into the bench corners; a grey runnel where water comes down off the Rim.
  for (let i = 0; i < 30; i++) blob(g, rng() * W, FACE_A[1] + 10 + rng() * 40, 30 + rng() * 40, 8, DUST, 0.3, rng, 7);
  g.lineStyle(6, dim(SANDSTONE, 0.25), 0.6); g.lineBetween(2010, FACE_A[1], 2050, 700);

  // ── The quay: big granite flags, a basalt kerb at the water.
  groundFill(g, { x: 0, y: FACE_B[1], w: W, h: SEA_Y - FACE_B[1] }, mixC(GRANITE, SANDSTONE, 0.45), GRANITE, GRANITE_DARK, rng, 0.8);
  ashlar(g, { x: 0, y: 1000, w: W, h: SEA_Y - 1000 }, 34, mixC(GRANITE, SANDSTONE, 0.35), GRANITE_DARK, rng);
  // The weighing-floor round the Scales: a great ring of pale limestone, worn by the queue.
  g.fillStyle(LIME_DARK, 1); g.fillEllipse(SCALES.x, SCALES.y - 10, 520, 220);
  g.fillStyle(LIME, 1); g.fillEllipse(SCALES.x, SCALES.y - 12, 504, 206);
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    g.lineStyle(1.5, LIME_DARK, 0.8);
    g.lineBetween(SCALES.x + Math.cos(a) * 150, SCALES.y - 12 + Math.sin(a) * 60, SCALES.x + Math.cos(a) * 252, SCALES.y - 12 + Math.sin(a) * 103);
  }
  gravaneSeal(g, SCALES.x - 180, SCALES.y + 50, 22, dim(LIME, 0.3), 0.8);
  // The queue's footpath worn into the ring, from the Grand Stair down to the household's pan.
  g.fillStyle(dim(LIME, 0.12), 0.6); g.fillEllipse(640, 1220, 180, 40);
  // The slipway: timber ways running down into the water.
  for (const ox of [-36, 36]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(1640 + ox - 6, 1180, 12, SEA_Y + 60 - 1180);
    g.fillStyle(TIMBER, 1); g.fillRect(1640 + ox - 4, 1180, 8, SEA_Y + 60 - 1180);
  }
  for (let y = 1186; y < SEA_Y + 50; y += 14) { g.fillStyle(TIMBER_DARK, 0.8); g.fillRect(1598, y, 84, 4); }
  // Rope-scars and pitch-stains along the boatwright's apron.
  for (let i = 0; i < 12; i++) blob(g, 1500 + rng() * 300, 1120 + rng() * 140, 10 + rng() * 14, 5, 0x1a1410, 0.25, rng, 6);
  // The lift landing on the quay: an iron plate set in the flags.
  g.fillStyle(IRON, 1); g.fillRect(LIFT_X - 30, LIFT_LOW - 10, 60, 30);
  g.lineStyle(1, 0x6a6a70, 1); for (let k = 0; k < 6; k++) g.lineBetween(LIFT_X - 28 + k * 11, LIFT_LOW - 8, LIFT_X - 28 + k * 11, LIFT_LOW + 18);

  // ── The faces between the benches, with the stairs cut through them.
  for (const [face, gaps] of [[FACE_A, GAPS_A], [FACE_B, GAPS_B]] as [[number, number], [number, number][]][]) {
    for (const [a, b] of faceSpans(gaps)) strataFace(g, a, b, face[0], face[1], rng);
    for (const [a, b] of gaps) cutStair(g, a, b, face[0] - 2, face[1] + 2);
  }
  // The lift's guide-rails down both faces.
  for (const [t, b] of [FACE_A, FACE_B]) {
    for (const ox of [-26, 26]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(LIFT_X + ox - 3, t - 6, 6, b - t + 12); }
    for (let y = t; y < b; y += 12) { g.fillStyle(TIMBER, 1); g.fillRect(LIFT_X - 26, y, 52, 3); }
  }

  // ── The harbour: milky green-grey near the quay, darker out where the old pit floor drops.
  g.fillStyle(SEA_SHALLOW, 1); g.fillRect(0, SEA_Y, W, H - SEA_Y);
  g.fillStyle(SEA, 1); g.fillRect(0, SEA_Y + 50, W, H - SEA_Y - 50);
  g.fillStyle(SEA_DEEP, 1); g.fillRect(0, SEA_Y + 130, W, H - SEA_Y - 130);
  for (let i = 0; i < 60; i++) { g.fillStyle(DUST, 0.08 + rng() * 0.06); g.fillEllipse(rng() * W, SEA_Y + 10 + rng() * 60, 60 + rng() * 120, 8); }
  // Blocks that fell off barges, pale under the water.
  for (let i = 0; i < 16; i++) {
    const bx = rng() * W, by = SEA_Y + 60 + rng() * 120;
    g.fillStyle(LIME, 0.12); g.fillRect(bx, by, 24 + rng() * 18, 14 + rng() * 8);
  }
  // The basalt kerb along the quay edge, with iron mooring rings.
  g.fillStyle(BASALT, 1); g.fillRect(0, SEA_Y - 12, W, 16);
  for (let x = 0; x < W; x += 22) { g.fillStyle(mixC(BASALT, GRANITE_DARK, 0.4), 1); g.fillRect(x + 1, SEA_Y - 12, 20, 6); }
  for (let x = 120; x < W; x += 260) { g.lineStyle(2, IRON, 1); g.strokeCircle(x, SEA_Y + 2, 5); }
  // The piers: courses of cut blocks on their sides, mooring rings along both edges.
  for (const p of [BARGE_PIER, CRANE_PIER]) {
    g.fillStyle(0x000000, 0.25); g.fillRect(p.x - 6, p.y + 8, p.w + 12, p.h);
    ashlar(g, p, 16, mixC(GRANITE, LIME, 0.3), GRANITE_DARK, rng);
    g.fillStyle(BASALT, 1); g.fillRect(p.x - 3, p.y, 4, p.h); g.fillRect(p.x + p.w - 1, p.y, 4, p.h);
    g.fillStyle(FOAM, 0.35); g.fillRect(p.x - 6, p.y + p.h - 4, p.w + 12, 4);
  }
}

// ── Pieces ──────────────────────────────────────────────────────────

type Piece = { x: number; y: number; w: number; h: number; draw: (g: G, rng: () => number) => void };
const pieces: Piece[] = [];
const solids: Solid[] = [];

// ── The Rim.

// The mason's lodge, collars on the peg.
pieces.push({ x: 640, y: 210, w: 250, h: 140, draw: (g, rng) => masonLodge(g, 640, 210, rng) });
solids.push({ kind: 'rect', x: 528, y: 180, w: 224, h: 30 });
// The frame saw and block stacks of the stonecutters' yard.
pieces.push({ x: 900, y: 120, w: 120, h: 70, draw: (g) => frameSaw(g, 900, 120) });
solids.push({ kind: 'rect', x: 858, y: 98, w: 84, h: 22 });
for (const [x, y, c, r, col] of [[300, 120, 4, 3, LIME], [1060, 230, 3, 2, SANDSTONE], [1560, 240, 4, 2, LIME], [2140, 140, 3, 3, SANDSTONE]] as [number, number, number, number, number][]) {
  pieces.push({ x, y, w: c * 24 + 20, h: r * 16 + 20, draw: (g, rng) => blockStack(g, x, y, c, r, 20, col, rng) });
  solids.push({ kind: 'rect', x: x - c * 12, y: y - 14, w: c * 24, h: 14 });
}
// Spall heaps — offcuts, free to anyone who can carry them.
for (const [x, y] of [[180, 250], [460, 70], [980, 270], [1660, 120]] as [number, number][]) {
  pieces.push({ x, y, w: 50, h: 24, draw: (g, rng) => spalls(g, x, y, 14, rng) });
}
// The Name-Pit's edge: a crude rail of two posts and a rope, and one plaque propped up the wrong way round.
pieces.push({
  x: NAME_PIT.x, y: NAME_PIT.y + 44, w: 180, h: 70, draw: (g) => {
    for (const ox of [-80, 80]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(NAME_PIT.x + ox - 3, NAME_PIT.y - 6, 6, 44); }
    g.lineStyle(2, ROPE, 1);
    g.beginPath(); g.moveTo(NAME_PIT.x - 80, NAME_PIT.y - 2);
    for (let k = 1; k <= 8; k++) g.lineTo(NAME_PIT.x - 80 + k * 20, NAME_PIT.y - 2 + Math.sin((k / 8) * Math.PI) * 12);
    g.strokePath();
    g.fillStyle(LIME_DARK, 1); g.fillRect(NAME_PIT.x + 30, NAME_PIT.y + 10, 40, 16);
    g.fillStyle(LIME, 1); g.fillRect(NAME_PIT.x + 32, NAME_PIT.y + 12, 36, 12);
  },
});
solids.push({ kind: 'circle', x: NAME_PIT.x, y: NAME_PIT.y, r: 58 });
// The lift's headframe at the Rim landing, and the counterweight in its cradle beside it.
pieces.push({ x: LIFT_X, y: LIFT_HIGH - 6, w: 140, h: 190, draw: (g) => headframe(g, LIFT_X, LIFT_HIGH - 6) });
solids.push({ kind: 'circle', x: LIFT_X - 36, y: LIFT_HIGH - 8, r: 8 }, { kind: 'circle', x: LIFT_X + 36, y: LIFT_HIGH - 8, r: 8 });
pieces.push({
  x: 2566, y: 230, w: 70, h: 200, draw: (g, rng) => {
    // Two posts and a crossbar, and from it on a chain a cradle of forty tithe-blocks.
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(2536, 40, 8, 190); g.fillRect(2588, 40, 8, 190);
    g.fillRect(2530, 36, 72, 10);
    g.lineStyle(3, IRON, 1); g.lineBetween(2566, 46, 2566, 80); g.lineBetween(2566, 46, LIFT_X + 20, LIFT_HIGH - 146);
    g.fillStyle(IRON, 1); g.fillRect(2546, 80, 40, 4); g.fillRect(2546, 196, 40, 4);
    g.fillRect(2546, 80, 3, 120); g.fillRect(2583, 80, 3, 120);
    for (let r = 0; r < 10; r++) for (let c = 0; c < 2; c++) {
      const bx = 2550 + c * 16, by = 86 + r * 11;
      const col = mixC(SANDSTONE, rng() < 0.5 ? LIME : SHALE, rng() * 0.5);
      g.fillStyle(dim(col, 0.3), 1); g.fillRect(bx, by, 15, 10);
      g.fillStyle(col, 1); g.fillRect(bx, by, 15, 8);
      g.lineStyle(1, dim(col, 0.5), 0.9); g.strokeCircle(bx + 7.5, by + 4, 2);
    }
    shadow(g, 2566, 230, 60, 14);
  },
});
solids.push({ kind: 'rect', x: 2532, y: 214, w: 68, h: 18 });

// ── The Long Step.

// Rock-cut houses along the foot of the upper face. Two of them belong to people you meet.
const HOUSES: [number, number, number, number][] = [
  // [x, width, height, glow]
  [160, 110, 64, 0], [AT.hobb.x, 120, 70, EMBER], [600, 96, 60, EMBER], [1000, 130, 72, 0], [1600, 110, 66, EMBER],
  [AT.tumble.x, 104, 66, EMBER], [2340, 90, 60, 0],
];
for (const [x, w, h, gl] of HOUSES) {
  pieces.push({ x, y: FACE_A[1] + 6, w: w + 40, h: h + 50, draw: (g, rng) => rockHouse(g, x, FACE_A[1] + 6, w, h + 30, { glow: gl || undefined, steps: true }, rng) });
}
// Marl Hobb's yard: his night-blocks lined up by the door, each one perfect.
pieces.push({
  x: AT.hobb.x + 90, y: 400, w: 90, h: 40, draw: (g, rng) => blockStack(g, AT.hobb.x + 90, 400, 3, 1, 20, SANDSTONE, rng),
});
solids.push({ kind: 'rect', x: AT.hobb.x + 54, y: 388, w: 72, h: 12 });
// Granny Tumble's step: a bench, and a haulier's old rope coiled on it like a cat.
pieces.push({
  x: AT.tumble.x + 70, y: 392, w: 70, h: 40, draw: (g) => {
    shadow(g, AT.tumble.x + 70, 393, 60, 10);
    g.fillStyle(LIME_DARK, 1); g.fillRect(AT.tumble.x + 44, 376, 52, 16);
    g.fillStyle(LIME, 1); g.fillRect(AT.tumble.x + 44, 372, 52, 8);
    g.lineStyle(3, ROPE, 1); g.strokeEllipse(AT.tumble.x + 70, 368, 26, 9); g.strokeEllipse(AT.tumble.x + 70, 364, 18, 6);
  },
});
solids.push({ kind: 'rect', x: AT.tumble.x + 44, y: 378, w: 52, h: 14 });
// The Hearthstone.
pieces.push({ x: 820, y: 594, w: 320, h: 230, draw: (g, rng) => hearthstone(g, 820, 594, rng) });
solids.push({ kind: 'rect', x: 664, y: 556, w: 280, h: 38 });
// The Chock & Chisel.
pieces.push({ x: 1760, y: 604, w: 240, h: 200, draw: (g, rng) => chockShop(g, 1760, 604, rng) });
solids.push({ kind: 'rect', x: 1656, y: 574, w: 210, h: 30 });
// The plaza: the Regent on the Old King, and the season's Tithe roll.
pieces.push({ x: 1450, y: 520, w: 180, h: 200, draw: (g) => regentStatue(g, 1450, 520) });
solids.push({ kind: 'rect', x: 1418, y: 488, w: 64, h: 32 }, { kind: 'circle', x: 1384, y: 512, r: 18 });
pieces.push({ x: 1170, y: 520, w: 100, h: 90, draw: (g, rng) => titheRoll(g, 1170, 520, rng) });
solids.push({ kind: 'rect', x: 1130, y: 506, w: 80, h: 14 });
// Lamp-posts along the Long Step.
for (const x of [380, 1060, 1540, 2060]) {
  pieces.push({
    x, y: 694, w: 30, h: 90, draw: (g) => {
      shadow(g, x, 695, 18, 6);
      g.fillStyle(IRON, 1); g.fillRect(x - 2, 630, 4, 64);
      g.fillStyle(IRON, 1); g.fillRect(x - 7, 620, 14, 12);
      g.fillStyle(EMBER, 0.95); g.fillRect(x - 5, 622, 10, 8);
      glow(g, x, 626, 30, EMBER, 0.04, 4);
    },
  });
  solids.push({ kind: 'circle', x, y: 692, r: 5 });
}
// Block stacks against the lower face, waiting for the Scales.
for (const [x, c] of [[520, 3], [1060, 4], [1980, 3]] as [number, number][]) {
  pieces.push({ x, y: 852, w: c * 24 + 20, h: 50, draw: (g, rng) => blockStack(g, x, 852, c, 2, 20, SANDSTONE, rng) });
  solids.push({ kind: 'rect', x: x - c * 12, y: 838, w: c * 24, h: 14 });
}
// The lift gantry on the Long Step: two pairs of posts under the cables.
for (const y of [380, 846]) {
  pieces.push({
    x: LIFT_X, y, w: 90, h: 120, draw: (g) => {
      for (const ox of [-30, 30]) {
        shadow(g, LIFT_X + ox, y + 1, 14, 5);
        g.fillStyle(TIMBER_DARK, 1); g.fillRect(LIFT_X + ox - 4, y - 100, 8, 100);
        g.fillStyle(TIMBER, 1); g.fillRect(LIFT_X + ox - 2, y - 100, 3, 100);
      }
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(LIFT_X - 36, y - 104, 72, 8);
    },
  });
  solids.push({ kind: 'circle', x: LIFT_X - 30, y: y - 2, r: 6 }, { kind: 'circle', x: LIFT_X + 30, y: y - 2, r: 6 });
}

// ── The quay.

// Houses cut into the foot of the lower face.
for (const [x, w, h, gl] of [[200, 110, 60, EMBER], [480, 96, 56, 0], [960, 120, 64, EMBER], [1540, 104, 60, 0], [1820, 120, 64, EMBER]] as [number, number, number, number][]) {
  pieces.push({ x, y: FACE_B[1] + 6, w: w + 40, h: h + 50, draw: (g, rng) => rockHouse(g, x, FACE_B[1] + 6, w, h + 30, { glow: gl || undefined }, rng) });
}
// The Tithe Scales.
pieces.push({ x: SCALES.x, y: SCALES.y, w: 520, h: 300, draw: (g, rng) => titheScales(g, SCALES.x, SCALES.y, rng) });
solids.push(
  { kind: 'rect', x: SCALES.x - 130, y: SCALES.y - 32, w: 260, h: 32 },
  { kind: 'circle', x: SCALES.x - 189, y: SCALES.y - 46, r: 36 },
  { kind: 'circle', x: SCALES.x + 189, y: SCALES.y - 4, r: 38 },
);
// The collar cart, parked by the Scales where the short can see it.
pieces.push({ x: 1130, y: 1060, w: 220, h: 140, draw: (g) => collarCart(g, 1130, 1060) });
solids.push({ kind: 'rect', x: 1068, y: 1040, w: 124, h: 22 });
// Block stacks along the quay and a barrow.
for (const [x, y, c, r] of [[330, 1100, 4, 2], [1900, 1060, 4, 3], [2300, 1110, 3, 2]] as [number, number, number, number][]) {
  pieces.push({ x, y, w: c * 26 + 20, h: r * 18 + 20, draw: (g, rng) => blockStack(g, x, y, c, r, 22, LIME, rng) });
  solids.push({ kind: 'rect', x: x - c * 13, y: y - 14, w: c * 26, h: 14 });
}
// The boatwright's slip.
pieces.push({ x: 1640, y: 1200, w: 280, h: 110, draw: (g, rng) => boatOnStocks(g, 1640, 1200, rng) });
solids.push({ kind: 'rect', x: 1546, y: 1176, w: 188, h: 24 });
// Lode & Line, at the head of the crane pier.
pieces.push({ x: 2160, y: 1150, w: 200, h: 150, draw: (g, rng) => tackleShack(g, 2160, 1150, rng) });
solids.push({ kind: 'rect', x: 2076, y: 1124, w: 168, h: 26 });
// Treadwheel cranes at the quay edge, each over a barge.
for (const [x, face] of [[480, 1], [2380, -1]] as [number, 1 | -1][]) {
  pieces.push({ x, y: SEA_Y - 8, w: 260, h: 220, draw: (g, rng) => treadCrane(g, x, SEA_Y - 8, face, rng) });
  solids.push({ kind: 'rect', x: x - 60, y: SEA_Y - 30, w: 120, h: 24 });
}
for (const [x, w] of [[590, 150], [2270, 170]] as [number, number][]) {
  pieces.push({ x, y: SEA_Y + 92, w: w + 40, h: 70, draw: (g, rng) => stoneBarge(g, x, SEA_Y + 92, w, rng) });
}
// Bollards along the kerb and on the piers.
const BOLLARDS: [number, number][] = [
  [200, 1286], [760, 1286], [1100, 1286], [1440, 1286], [1820, 1286], [2560, 1286],
  [BARGE_PIER.x + 12, 1380], [BARGE_PIER.x + BARGE_PIER.w - 12, 1380], [CRANE_PIER.x + 12, 1400], [CRANE_PIER.x + CRANE_PIER.w - 12, 1400],
];
for (const [x, y] of BOLLARDS) {
  pieces.push({ x, y, w: 20, h: 24, draw: (g) => bollard(g, x, y) });
  solids.push({ kind: 'circle', x, y: y - 3, r: 7 });
}
// A scatter of loose rocks where the quay meets the faces.
for (const [x, y, s] of [[60, 960, 1.2], [2580, 980, 1], [1180, 950, 0.8], [40, 420, 1.1]] as [number, number, number][]) {
  pieces.push({ x, y, w: 50, h: 40, draw: (g, rng) => rock(g, x, y, s, SANDSTONE, rng) });
}

// ── Sea & faces: solids ─────────────────────────────────────────────

for (const [face, gaps] of [[FACE_A, GAPS_A], [FACE_B, GAPS_B]] as [[number, number], [number, number][]][]) {
  for (const [a, b] of faceSpans(gaps)) solids.push({ kind: 'rect', x: a, y: face[0], w: b - a, h: face[1] - face[0] });
}
solids.push(
  { kind: 'rect', x: 0, y: SEA_Y, w: BARGE_PIER.x, h: H - SEA_Y },
  { kind: 'rect', x: BARGE_PIER.x + BARGE_PIER.w, y: SEA_Y, w: CRANE_PIER.x - BARGE_PIER.x - BARGE_PIER.w, h: H - SEA_Y },
  { kind: 'rect', x: CRANE_PIER.x + CRANE_PIER.w, y: SEA_Y, w: W - CRANE_PIER.x - CRANE_PIER.w, h: H - SEA_Y },
  { kind: 'rect', x: CRANE_PIER.x, y: CRANE_PIER.y + CRANE_PIER.h, w: CRANE_PIER.w, h: H - CRANE_PIER.y - CRANE_PIER.h },
);

// ── Animation ───────────────────────────────────────────────────────

/** The lift cycle: 16 s, a pause at each landing. Returns the cage floor y. */
function liftY(t: number): number {
  const c = (t % 16) / 16;
  const ease = (q: number): number => q * q * (3 - 2 * q);
  if (c < 0.15) return LIFT_LOW + 10;
  if (c < 0.5) return LIFT_LOW + 10 + (LIFT_HIGH - 4 - LIFT_LOW - 10) * ease((c - 0.15) / 0.35);
  if (c < 0.65) return LIFT_HIGH - 4;
  return LIFT_HIGH - 4 + (LIFT_LOW + 10 - LIFT_HIGH + 4) * ease((c - 0.65) / 0.35);
}

function animateUnder(g: G, t: number, view: Rect): void {
  // Harbour swell: slow bands of light across the milky water, foam working at the kerb and the piers.
  if (view.y + view.h > SEA_Y) {
    const x0 = Math.max(0, view.x - 40), x1 = Math.min(W, view.x + view.w + 40);
    for (let x = Math.floor(x0 / 40) * 40; x < x1; x += 40) {
      const a = 0.12 + Math.sin(t * 1.3 + x * 0.05) * 0.08;
      g.fillStyle(FOAM, a); g.fillEllipse(x + 20, SEA_Y + 6 + Math.sin(t * 2 + x) * 1.5, 30, 4);
      g.fillStyle(lit(SEA, 0.25), 0.1); g.fillEllipse(x + 20 + Math.sin(t * 0.6 + x) * 12, SEA_Y + 90 + Math.sin(x * 0.13) * 40, 50, 3);
    }
    for (const p of [BARGE_PIER, CRANE_PIER]) {
      if (!inView(view, p.x, p.y + p.h)) continue;
      for (let k = 0; k < 3; k++) {
        const r = ((t * 14 + k * 9) % 26);
        g.lineStyle(1.5, FOAM, 0.4 - r / 70); g.strokeEllipse(p.x + p.w / 2, p.y + p.h + 2, p.w + r * 2, 10 + r * 0.6);
      }
    }
  }
  // The crane ropes and their blocks, lowering and lifting to the barges.
  for (const [x, face, ph] of [[480, 1, 0], [2380, -1, 3.1]] as [number, 1 | -1, number][]) {
    if (!inView(view, x + face * 122, SEA_Y + 20, 200)) continue;
    const tipX = x + face * 122, tipY = SEA_Y - 8 - 170;
    const drop = 120 + Math.sin(t * 0.5 + ph) * 60;
    g.lineStyle(1.5, ROPE, 1); g.lineBetween(tipX, tipY, tipX, tipY + drop);
    g.fillStyle(IRON, 1); g.fillRect(tipX - 5, tipY + drop - 2, 10, 4);
    g.lineStyle(1.5, IRON, 1); g.lineBetween(tipX - 5, tipY + drop, tipX - 14, tipY + drop + 10); g.lineBetween(tipX + 5, tipY + drop, tipX + 14, tipY + drop + 10);
    g.fillStyle(dim(LIME, 0.3), 1); g.fillRect(tipX - 16, tipY + drop + 10, 32, 20);
    g.fillStyle(LIME, 1); g.fillRect(tipX - 16, tipY + drop + 10, 32, 16);
    // The treadwheel turning as the block moves.
    const wx = x - face * 14, wy = SEA_Y - 8 - 70, sp = Math.cos(t * 0.5 + ph) * t * 0.6;
    for (let k = 0; k < 3; k++) {
      const a = sp + (k / 3) * Math.PI * 2;
      g.lineStyle(2, TIMBER_LIT, 0.8); g.lineBetween(wx + Math.cos(a) * 10, wy + Math.sin(a) * 10, wx + Math.cos(a) * 44, wy + Math.sin(a) * 44);
    }
  }
  // The Hearthstone's oven mouth breathing.
  if (inView(view, 850, 560)) {
    const f = 0.5 + Math.sin(t * 3.1) * 0.2 + Math.sin(t * 7.3) * 0.1;
    g.fillStyle(0xffd88a, f * 0.6); g.fillEllipse(850, 566, 26, 10);
    glow(g, 850, 560, 46, 0xff7a2a, 0.03 * f + 0.02, 3);
  }
}

function animateAbove(g: G, t: number, view: Rect): void {
  // Dust: always in the air in Quarrymouth, drifting down off the Rim.
  for (let i = 0; i < 26; i++) {
    const s = i * 97.3;
    const x = view.x + ((s * 13.7 + t * 18 + Math.sin(t * 0.4 + i) * 40) % view.w + view.w) % view.w;
    const y = view.y + ((s * 5.1 + t * (10 + (i % 5) * 4)) % view.h + view.h) % view.h;
    g.fillStyle(DUST, 0.22 + (i % 4) * 0.06); g.fillCircle(x, y, 1 + (i % 3) * 0.7);
  }
  // The stonecutters' yard: puffs of stone-dust off the banker as the mallet falls.
  if (inView(view, 640, 150, 160)) {
    const beat = (t * 1.6) % 1;
    if (beat < 0.5) {
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + (k - 2.5) * 0.45;
        g.fillStyle(LIME, (0.5 - beat) * 1.2); g.fillCircle(640 + Math.cos(a) * beat * 40, 150 + Math.sin(a) * beat * 26, 3 + beat * 4);
      }
    }
    // The frame saw, rocking.
    const sx = 900 + Math.sin(t * 2.4) * 14;
    g.lineStyle(3, TIMBER, 1); g.strokeRect(sx - 54, 58, 108, 30);
  }
  // Smoke off the Hearthstone's flue and the chimneys of the Long Step.
  for (const [cx, cy, n] of [[850, 440, 7], [1680, 470, 4]] as [number, number, number][]) {
    if (!inView(view, cx, cy - 80, 120)) continue;
    for (let k = 0; k < n; k++) {
      const q = ((t * 0.28 + k / n) % 1);
      g.fillStyle(0xb8b0a8, (1 - q) * 0.32); g.fillCircle(cx + Math.sin(q * 5 + k) * 12 + q * 30, cy - q * 150, 7 + q * 18);
    }
  }
  // The lift: cables from the headframe wheel to the cage, the cage riding the face.
  if (view.x + view.w > LIFT_X - 80 && view.x < LIFT_X + 80) {
    const cy = liftY(t);
    g.lineStyle(1.5, IRON, 0.9); g.lineBetween(LIFT_X - 6, LIFT_HIGH - 146, LIFT_X - 6, cy - 56); g.lineBetween(LIFT_X + 6, LIFT_HIGH - 146, LIFT_X + 6, cy - 56);
    liftCage(g, LIFT_X, cy, EMBER);
    // The headframe's wheel spokes, turning while the cage moves.
    const moving = Math.abs(liftY(t + 0.05) - cy) > 0.1;
    const a0 = moving ? t * 3 : 0;
    for (let k = 0; k < 4; k++) {
      const a = a0 + (k / 4) * Math.PI;
      g.lineStyle(2, BRASS, 0.8); g.lineBetween(LIFT_X - Math.cos(a) * 22, LIFT_HIGH - 146 - Math.sin(a) * 22, LIFT_X + Math.cos(a) * 22, LIFT_HIGH - 146 + Math.sin(a) * 22);
    }
  }
  // The short-cage on the Scales, swaying on its hook.
  if (inView(view, SCALES.x + 243, 1010, 100)) {
    const sw = Math.sin(t * 0.9) * 2;
    g.lineStyle(1, 0x9a9aa0, 0.5); g.lineBetween(SCALES.x + 243 + sw, 1004, SCALES.x + 243 + sw * 2, 1062);
  }
  // The Regent's statue: a gull on his outstretched hand, every so often.
  if (inView(view, 1488, 410) && (t % 24) < 15) {
    const bob = Math.sin(t * 4) * 0.8;
    g.fillStyle(0xf0f0ea, 1); g.fillEllipse(1490, 405 + bob, 10, 6);
    g.fillStyle(0x8a8a8a, 1); g.fillEllipse(1487, 404 + bob, 6, 3);
    g.fillStyle(0xe8b040, 1); g.fillTriangle(1495, 404 + bob, 1499, 405 + bob, 1495, 406 + bob);
  }
  // A grey wash of the Regent's colour over the quay at the Scales — very faint, like a cold spot.
  if (inView(view, SCALES.x, SCALES.y - 60, 300)) {
    g.fillStyle(REGENT, 0.035 + Math.sin(t * 0.5) * 0.01); g.fillEllipse(SCALES.x + 120, SCALES.y - 40, 300, 120);
  }
  // The flatbread somebody left on the Old King's crown, still steaming in the morning.
  if (inView(view, 1386, 488) && (t % 30) < 8) {
    for (let k = 0; k < 3; k++) {
      const q = ((t * 0.5 + k / 3) % 1);
      g.fillStyle(0xf0e8e0, (1 - q) * 0.25); g.fillCircle(1386 + Math.sin(q * 6 + k) * 3, 486 - q * 24, 2 + q * 3);
    }
  }
}

// ── Points of interest ──────────────────────────────────────────────

const POIS: Poi[] = [
  { kind: 'waystone', at: { x: 1190, y: 1110 } },
  { kind: 'mooring', at: { x: 1300, y: 1470 }, isle: 'earth' },
  { kind: 'water', id: 'quarrymouth-sea-water', shape: { x: 0, y: SEA_Y, w: W, h: H - SEA_Y }, fishery: 'quarrymouth-sea' },
  // The lift: quay landing and Rim landing, the same cage.
  { kind: 'door', at: { x: LIFT_X, y: LIFT_LOW + 20 }, to: 'quarrymouth', arrive: { x: LIFT_X - 90, y: LIFT_HIGH + 4 }, label: 'The Lift — up to the Rim' },
  { kind: 'door', at: { x: LIFT_X, y: LIFT_HIGH + 4 }, to: 'quarrymouth', arrive: { x: LIFT_X - 70, y: LIFT_LOW + 100 }, label: 'The Lift — down to the quay' },
  { kind: 'sign', at: { x: 1400, y: 110 }, text: 'NORTH — the Haul Road to the Stonehold Court. Prince Bould\'s keep. Mind the rolling stones.' },
  { kind: 'sign', at: { x: 110, y: 690 }, text: 'WEST — the Dust Road to the Dunesea Court. Prince Sirocco\'s sands. Carry water.' },
  { kind: 'sign', at: { x: 2420, y: 690 }, text: 'EAST — the Glint Cut to the Geode Court. Prince Facet\'s town in the stone. Shade your eyes.' },
  { kind: 'sign', at: { x: 1400, y: 1260 }, text: 'THE BARGE PIER — Moorings. Hulls: H. Bollard, at the slip. Tackle: Lode & Line, by the crane pier.' },
  {
    kind: 'sign', at: { x: 600, y: 1150 },
    text: 'THE STONE TITHE. One block a season, each house, against the Regent\'s weight. The short shall rest until quarried.',
  },
  { kind: 'sign', at: { x: 1540, y: 560 }, text: 'REGENT GRAVANE, STEWARD OF THE HOLD, UNTIL THE KING WAKES. (Underneath, scratched: HE IS UNDER YOU.)' },
  { kind: 'sign', at: { x: 1660, y: 210 }, text: 'THE NAME-PIT. Street names, by order, to be retired. Do not dig. — the Regent\'s Clerk' },
  { kind: 'sign', at: { x: 1360, y: 960 }, text: 'THE GRAND STAIR. Four hundred steps to the Rim, or the lift (east). The steps disagree about the number.' },
  { kind: 'chest', id: 'quarrymouth-chest-yard', at: { x: 80, y: 60 }, coins: 120, orbs: 1 },
  { kind: 'chest', id: 'quarrymouth-chest-pier', at: { x: 2000, y: 1420 }, orbs: 2, coins: 60 },
  { kind: 'chest', id: 'quarrymouth-chest-tithe', at: { x: 1060, y: 1250 }, coins: 380, open: { monarch: 'gravane' } },
];

export const QUARRYMOUTH_AREA: AreaDef = {
  id: 'quarrymouth',
  isle: 'earth',
  name: 'Quarrymouth',
  subtitle: 'The harbour in the quarry face',
  w: W,
  h: H,
  bg: SAND_DARK,
  accent: BRASS,
  weather: 'dust',
  spawn: { x: 1300, y: 1420 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver: animateAbove },
  solids,
  exits: [
    { side: 'n', to: 'stonehold', label: 'The Haul Road — the Stonehold Court' },
    { side: 'w', to: 'dunesea', label: 'The Dust Road — the Dunesea Court' },
    { side: 'e', to: 'geode', label: 'The Glint Cut — the Geode Court' },
  ],
  pois: POIS,
  npcs: QUARRYMOUTH_NPCS,
  crowd: QUARRYMOUTH_CROWD,
  checkpoints: [{ x: 1300, y: 1420 }, { x: 1300, y: 760 }, { x: 1300, y: 200 }],
};

export { FACE_A, FACE_B, SEA_Y, SCALES, LIFT_X };
