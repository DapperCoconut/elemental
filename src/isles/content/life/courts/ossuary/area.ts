import type Phaser from 'phaser';
import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { blob, groundFill, stroke } from '../../../../art/IsleArt';
import {
  blockStack, boneTrellis, carverShop, chapel, compostShed, cottage, cypress, knuckleBoard, limeKiln, lychGate,
  ossuaryThrone, prunedWall, rawStatue, reliquaryShrine, roodTop, skullLamp, tavern, wellHead, yewTopiary,
} from './art';
import { OSSUARY_CROWD, OSSUARY_NPCS } from './npcs';
import { O, drawBone, drawFlame, drawLily, drawMarrow, drawSkull, jit } from './util';

/**
 * THE OSSUARY COURT — the Empress's garden of the dead, where the pruned who die in her hedges
 * come down the hill to be composted.
 *
 * Layout (2400×1600): the Lily Road comes in from the Bloom Court under the lych-gate on the west
 * and runs east the length of the court, paved in crushed bone. The town hugs it at the west end
 * — sextons' cottages, Knell & Daughter's carving shop, and south of the road the Rattling Jaw with
 * Coccyx's knucklebone board, then Ossein's mason's yard in the south-west corner. North of the
 * road: the Pruned's Wall and the chapel, the old graves, and in the middle of the north side the
 * Ossuary Throne with the Rood on its roof. The Bone Garden's planted rows lie south of the road in
 * the middle of the court, either side of the Hunters' Lane that runs south to the Wildhunt. East:
 * the marrow wells and the Deep Well; north-east, the reliquary shrines; south-east, the Long Beds,
 * where the compost lies under a sea of white lilies.
 */

type G = Phaser.GameObjects.Graphics;

const W = 2400;
const H = 1600;

const KEEP = { x: 1250, y: 470 };
const SHOP = { x: 440, y: 700 };
const TAVERN = { x: 620, y: 1080 };
const BOARD = { x: 770, y: 1215 };
const CHAPEL = { x: 880, y: 430, w: 120, h: 150 };
const WALL = { x: 640, y: 420, w: 220 };
const KILN = { x: 150, y: 1430 };
const STATUES: Pt[] = [{ x: 270, y: 1480 }, { x: 440, y: 1460 }];
const BLOCKS = { x: 500, y: 1350 };
const SHED = { x: 2250, y: 1230 };
const LYCH = { x: 92, y0: 712, y1: 890 };
const COTTAGES: { x: number; y: number; w: number; h: number; wall: number; lit?: boolean; mourning?: boolean }[] = [
  { x: 160, y: 700, w: 110, h: 90, wall: 0x6e6672, lit: true },
  { x: 290, y: 700, w: 100, h: 84, wall: 0x7a6e6a, mourning: true },
  { x: 630, y: 700, w: 100, h: 86, wall: 0x686a74 },
  { x: 160, y: 1010, w: 110, h: 88, wall: 0x726a70, mourning: true },
  { x: 410, y: 1000, w: 100, h: 84, wall: 0x6a6268, lit: true },
];
const WELLS: { x: number; y: number; r: number; deep: boolean; seed: number }[] = [
  { x: 1700, y: 1000, r: 40, deep: false, seed: 1.3 },
  { x: 1880, y: 1090, r: 40, deep: false, seed: 4.1 },
  { x: 2060, y: 960, r: 46, deep: true, seed: 7.7 },
];
const FISHING: Rect = { x: 2018, y: 932, w: 84, h: 52 };
const SHRINES: Pt[] = [{ x: 1860, y: 450 }, { x: 2020, y: 425 }, { x: 2180, y: 450 }];
const BEDS: Rect = { x: 1480, y: 1240, w: 820, h: 270 };
const GARDEN: Rect[] = [{ x: 860, y: 900, w: 280, h: 270 }, { x: 1270, y: 900, w: 270, h: 270 }];
const LAMPS: Pt[] = [
  { x: 260, y: 760 }, { x: 560, y: 840 }, { x: 860, y: 760 }, { x: 1120, y: 760 }, { x: 1380, y: 850 },
  { x: 1640, y: 880 }, { x: 1300, y: 640 }, { x: 1160, y: 1220 }, { x: 1240, y: 1420 }, { x: 1960, y: 640 },
];
const CYPRESSES: Pt[] = [
  { x: 1150, y: 1260 }, { x: 1150, y: 1360 }, { x: 1100, y: 1470 }, { x: 1268, y: 1300 }, { x: 1300, y: 1520 },
  { x: 1180, y: 610 }, { x: 1320, y: 700 }, { x: 980, y: 400 }, { x: 1560, y: 380 }, { x: 1700, y: 600 },
  { x: 2300, y: 620 }, { x: 2330, y: 1100 }, { x: 60, y: 1180 }, { x: 760, y: 980 }, { x: 1600, y: 1120 },
  { x: 2300, y: 820 }, { x: 520, y: 1530 }, { x: 60, y: 320 },
];
const YEWS: Pt[] = [{ x: 1000, y: 560 }, { x: 1500, y: 560 }, { x: 1760, y: 520 }, { x: 2260, y: 540 }, { x: 980, y: 1200 }];
const TRELLISES: { x: number; y: number; w: number }[] = [{ x: 1250, y: 730, w: 96 }, { x: 1200, y: 1010, w: 100 }, { x: 700, y: 640, w: 90 }];
const HEADSTONES: Pt[] = Array.from({ length: 16 }, (_, i) => ({ x: 120 + (i % 8) * 50 + (Math.floor(i / 8) % 2) * 25, y: 400 + Math.floor(i / 8) * 90 }));

const inView = (v: Rect, x: number, y: number, pad = 140): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

// ── Ground ───────────────────────────────────────────────────────────

/** Crushed-bone road: a dark kerb of loam, pale gravel, and the odd whole knuckle in it. */
function boneRoad(g: G, pts: Pt[], w: number, rng: () => number): void {
  stroke(g, pts, w + 10, O.loamDeep, 1);
  stroke(g, pts, w, O.gravelDark, 1);
  stroke(g, pts, w - 8, O.gravel, 1);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const n = Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 6);
    for (let k = 0; k < n; k++) {
      const t = rng();
      const x = a.x + (b.x - a.x) * t + (rng() - 0.5) * w * 0.8, y = a.y + (b.y - a.y) * t + (rng() - 0.5) * w * 0.8;
      g.fillStyle(rng() < 0.5 ? O.boneLit : O.boneShade, 0.5); g.fillRect(x, y, 1 + rng() * 3, 1 + rng() * 2);
    }
    for (let k = 0; k < n / 14; k++) {
      const t = rng();
      g.fillStyle(O.bone, 0.8); g.fillEllipse(a.x + (b.x - a.x) * t + (rng() - 0.5) * w * 0.6, a.y + (b.y - a.y) * t + (rng() - 0.5) * w * 0.6, 6, 4);
    }
  }
}

function paintGround(g: G, rng: () => number): void {
  groundFill(g, { x: 0, y: 0, w: W, h: H }, O.loam, O.loamLit, O.boneShade, rng, 1.1);
  for (let i = 0; i < 40; i++) blob(g, rng() * W, rng() * H, 60 + rng() * 140, 30 + rng() * 60, O.moss, 0.35, rng);
  for (let i = 0; i < 20; i++) blob(g, rng() * W, rng() * H, 50 + rng() * 120, 24 + rng() * 50, O.loamDeep, 0.4, rng);

  // ── The Long Beds: raked compost under a sea of white lilies, laid out in long numbered rows ──
  g.fillStyle(O.loamDeep, 1); g.fillRoundedRect(BEDS.x - 10, BEDS.y - 10, BEDS.w + 20, BEDS.h + 20, 20);
  for (let r = 0; r < 5; r++) {
    const y = BEDS.y + 10 + r * 52;
    g.fillStyle(0x3a2a20, 1); g.fillRoundedRect(BEDS.x + 10, y, BEDS.w - 20, 40, 12);
    for (let x = BEDS.x + 16; x < BEDS.x + BEDS.w - 16; x += 7) { g.lineStyle(1, 0x2a1e16, 0.7); g.lineBetween(x, y + 4, x + 3, y + 36); }
    // A marker peg at the head of every bed, a verdigris tag on it.
    for (let b = 0; b < 4; b++) {
      const px = BEDS.x + 20 + b * 200;
      g.fillStyle(O.timber, 1); g.fillRect(px, y + 2, 4, 14);
      g.fillStyle(O.verdigris, 1); g.fillRect(px + 4, y + 4, 8, 5);
    }
    for (let i = 0; i < 46; i++) drawLily(g, BEDS.x + 24 + rng() * (BEDS.w - 48), y + 34 + rng() * 4, 6 + rng() * 3, 0.6 + rng() * 0.4, (rng() - 0.5) * 0.7);
  }

  // ── The Bone Garden: two planted beds of femurs in rows, each bone a little crown of pale shoots ──
  for (const gb of GARDEN) {
    g.fillStyle(O.loamDeep, 1); g.fillRoundedRect(gb.x, gb.y, gb.w, gb.h, 14);
    for (let r = 0; r < 4; r++) {
      const y = gb.y + 30 + r * 64;
      g.fillStyle(O.loam, 1); g.fillRoundedRect(gb.x + 10, y - 12, gb.w - 20, 28, 12);
      for (let c = 0; c < 6; c++) {
        const x = gb.x + 28 + c * ((gb.w - 56) / 5);
        drawBone(g, x, y + 6, x + (rng() - 0.5) * 4, y - 16, 4, O.boneShade, 1);
        const n = 2 + Math.floor(rng() * 4);
        for (let k = 0; k < n; k++) {
          const a = -Math.PI / 2 + (k - (n - 1) / 2) * 0.5;
          g.lineStyle(1.5, O.bone, 1); g.lineBetween(x, y - 16, x + Math.cos(a) * 10, y - 16 + Math.sin(a) * 10);
        }
      }
    }
  }

  // ── The old graves north-west: low turf mounds in rows with lilies at their heads ──
  for (const hs of HEADSTONES) {
    g.fillStyle(O.moss, 0.9); g.fillEllipse(hs.x, hs.y + 30, 34, 54);
    g.fillStyle(O.mossLit, 0.5); g.fillEllipse(hs.x - 4, hs.y + 24, 20, 30);
    drawLily(g, hs.x + 12, hs.y + 6, 5, 0.9, 0.2);
  }

  // ── Roads ──
  boneRoad(g, [{ x: -20, y: 800 }, { x: 600, y: 800 }, { x: 1150, y: 805 }, { x: 1500, y: 830 }, { x: 1760, y: 880 }, { x: 2100, y: 940 }], 74, rng);
  boneRoad(g, [{ x: 1250, y: 805 }, { x: 1250, y: 490 }], 70, rng);
  boneRoad(g, [{ x: 1200, y: 810 }, { x: 1200, y: H + 20 }], 66, rng);
  boneRoad(g, [{ x: 700, y: 800 }, { x: 700, y: 560 }, { x: 860, y: 470 }], 48, rng);
  boneRoad(g, [{ x: 700, y: 560 }, { x: 640, y: 470 }], 40, rng);
  boneRoad(g, [{ x: 330, y: 810 }, { x: 330, y: 1250 }, { x: 420, y: 1380 }], 50, rng);
  boneRoad(g, [{ x: 620, y: 810 }, { x: 620, y: 1100 }, { x: 760, y: 1240 }], 44, rng);
  boneRoad(g, [{ x: 1560, y: 830 }, { x: 1800, y: 620 }, { x: 2020, y: 520 }, { x: 2200, y: 500 }], 50, rng);
  boneRoad(g, [{ x: 1200, y: 1200 }, { x: 1480, y: 1240 }, { x: 1900, y: 1230 }], 46, rng);
  boneRoad(g, [{ x: 1880, y: 1000 }, { x: 1960, y: 1160 }], 36, rng);

  // ── The keep's forecourt: bone-white flags in a fan before the steps ──
  for (let r = 0; r < 4; r++) {
    for (let i = 0; i < 9 + r * 2; i++) {
      const a = Math.PI * 0.15 + (i / (8 + r * 2)) * Math.PI * 0.7;
      const rr = 60 + r * 34;
      const x = KEEP.x + Math.cos(a) * rr * 2.2, y = KEEP.y + 30 + Math.sin(a) * rr * 0.9;
      g.fillStyle(r % 2 ? O.boneShade : O.bone, 1); g.fillRoundedRect(x - 16, y - 10, 32, 20, 4);
    }
  }

  // ── The mason's yard: lime dust and chips of white over everything ──
  blob(g, 320, 1400, 280, 150, O.boneShade, 0.45, rng, 12);
  for (let i = 0; i < 400; i++) { g.fillStyle(O.boneLit, 0.3 + rng() * 0.4); g.fillRect(60 + rng() * 520, 1260 + rng() * 300, 1 + rng() * 3, 1 + rng() * 2); }

  // ── Round the marrow wells: dished ground, stained red, loam dragged toward the rims ──
  for (const w of WELLS) {
    g.fillStyle(O.marrowDeep, 0.22); g.fillCircle(w.x, w.y, w.r * 3);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + rng() * 0.2;
      const r0 = w.r * 1.4 + rng() * w.r * 1.4;
      g.lineStyle(2, O.loamLit, 0.5); g.lineBetween(w.x + Math.cos(a) * r0, w.y + Math.sin(a) * r0 * 0.7, w.x + Math.cos(a + 0.2) * (r0 - 18), w.y + Math.sin(a + 0.2) * (r0 - 18) * 0.7);
    }
  }

  // ── The court's edges: a black yew hedge along the top, a charnel wall of skulls down the east ──
  for (let x = 0; x < W; x += 34) {
    g.fillStyle(O.yew, 1); g.fillEllipse(x + rng() * 10, 22, 60, 60);
    g.fillStyle(O.yewLit, 0.8); g.fillEllipse(x + rng() * 10 - 8, 14, 26, 20);
  }
  g.fillStyle(0x221c20, 1); g.fillRect(W - 34, 40, 34, H - 40);
  for (let y = 46; y < H; y += 15) {
    for (let x = W - 32; x < W - 4; x += 11) {
      g.fillStyle(rng() < 0.5 ? O.boneShade : O.boneDark, 1); g.fillEllipse(x + 5, y + 5, 10, 9);
      g.fillStyle(0x120c0e, 1); g.fillCircle(x + 3, y + 5, 1.3); g.fillCircle(x + 7, y + 5, 1.3);
    }
  }
  for (let y = 40; y < H; y += 40) {
    if (y > 700 && y < 900) continue;
    g.fillStyle(O.yew, 1); g.fillEllipse(14, y + rng() * 10, 40, 56);
  }
  for (let x = 0; x < W; x += 40) {
    if (x > 1110 && x < 1290) continue;
    g.fillStyle(O.yew, 1); g.fillEllipse(x + rng() * 10, H - 12, 56, 40);
  }
}

// ── Pieces ───────────────────────────────────────────────────────────

type Piece = NonNullable<AreaPainter['pieces']>[number];

/** A small headstone, leaning, with a skull carved at the top. */
function headstone(g: G, x: number, y: number, rng: () => number): void {
  const lean = (rng() - 0.5) * 6;
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 2, 30, 8);
  g.fillStyle(O.stoneDark, 1); g.fillRoundedRect(x - 12 + lean * 0.3, y - 34, 24, 34, { tl: 11, tr: 11, bl: 0, br: 0 });
  g.fillStyle(O.stone, 1); g.fillRoundedRect(x - 10 + lean * 0.3, y - 32, 20, 32, { tl: 10, tr: 10, bl: 0, br: 0 });
  drawSkull(g, x + lean * 0.3, y - 22, 4, 1, { tone: O.stoneLit });
  g.fillStyle(O.stoneDark, 1); g.fillRect(x - 6, y - 12, 12, 1.5); g.fillRect(x - 5, y - 8, 10, 1.5);
  g.fillStyle(O.moss, 0.8); g.fillEllipse(x - 6, y - 2, 10, 5);
}

function pieces(): Piece[] {
  const out: Piece[] = [];
  out.push({ x: LYCH.x, y: LYCH.y1, w: 60, h: 400, draw: (g) => lychGate(g, LYCH.x, LYCH.y0, LYCH.y1) });
  for (const c of COTTAGES) out.push({ x: c.x, y: c.y, w: c.w + 30, h: c.h + c.w * 0.7, draw: (g, rng) => cottage(g, c.x, c.y, c.w, c.h, { wall: c.wall, lit: c.lit, mourning: c.mourning }, rng) });
  out.push({ x: SHOP.x, y: SHOP.y, w: 280, h: 240, draw: (g, rng) => carverShop(g, SHOP.x, SHOP.y, rng) });
  out.push({ x: TAVERN.x, y: TAVERN.y, w: 280, h: 220, draw: (g, rng) => tavern(g, TAVERN.x, TAVERN.y, rng) });
  out.push({ x: BOARD.x, y: BOARD.y, w: 140, h: 100, draw: (g) => knuckleBoard(g, BOARD.x, BOARD.y) });
  out.push({ x: CHAPEL.x, y: CHAPEL.y, w: CHAPEL.w + 40, h: CHAPEL.h + 160, draw: (g, rng) => chapel(g, CHAPEL.x, CHAPEL.y, CHAPEL.w, CHAPEL.h, rng) });
  out.push({ x: WALL.x, y: WALL.y, w: WALL.w + 20, h: 90, draw: (g, rng) => prunedWall(g, WALL.x, WALL.y, WALL.w, rng) });
  out.push({ x: KEEP.x, y: KEEP.y, w: 640, h: 460, draw: (g, rng) => ossuaryThrone(g, KEEP.x, KEEP.y, rng) });
  out.push({ x: KEEP.x, y: KEEP.y + 1, w: 260, h: 460, draw: (g) => roodTop(g, KEEP.x, KEEP.y) });
  out.push({ x: KILN.x, y: KILN.y, w: 130, h: 120, draw: (g) => limeKiln(g, KILN.x, KILN.y) });
  for (const s of STATUES) out.push({ x: s.x, y: s.y, w: 100, h: 120, draw: (g, rng) => rawStatue(g, s.x, s.y, rng) });
  out.push({ x: BLOCKS.x, y: BLOCKS.y, w: 110, h: 70, draw: (g) => blockStack(g, BLOCKS.x, BLOCKS.y) });
  out.push({ x: SHED.x, y: SHED.y, w: 320, h: 140, draw: (g) => compostShed(g, SHED.x, SHED.y) });
  for (const w of WELLS) out.push({ x: w.x, y: w.y + Math.round(w.r * 0.6), w: w.r * 3, h: 140, draw: (g) => wellHead(g, w.x, w.y, w.r, w.deep) });
  for (const s of SHRINES) out.push({ x: s.x, y: s.y, w: 100, h: 120, draw: (g, rng) => reliquaryShrine(g, s.x, s.y, rng) });
  for (const c of CYPRESSES) out.push({ x: c.x, y: c.y, w: 60, h: 150, draw: (g, rng) => cypress(g, c.x, c.y, 26 + jit(c.x, c.y) * 10, rng) });
  for (const y of YEWS) out.push({ x: y.x, y: y.y, w: 60, h: 60, draw: (g) => yewTopiary(g, y.x, y.y, 22) });
  for (const t of TRELLISES) out.push({ x: t.x, y: t.y, w: t.w + 40, h: 170, draw: (g, rng) => boneTrellis(g, t.x, t.y, t.w, rng) });
  for (const l of LAMPS) out.push({ x: l.x, y: l.y, w: 40, h: 70, draw: (g) => skullLamp(g, l.x, l.y) });
  for (const hs of HEADSTONES) out.push({ x: hs.x, y: hs.y, w: 30, h: 40, draw: (g, rng) => headstone(g, hs.x, hs.y, rng) });
  return out;
}

// ── Animation ────────────────────────────────────────────────────────

/** Candle points that flicker: the Pruned's Wall stubs, the shrines' stands, the chapel step. */
const CANDLES: Pt[] = [
  ...Array.from({ length: 10 }, (_, i) => ({ x: WALL.x - WALL.w / 2 + 12 + i * 21, y: WALL.y - 4 })),
  ...SHRINES.flatMap((s) => [{ x: s.x - 40, y: s.y - 10 }, { x: s.x - 34, y: s.y - 14 }, { x: s.x + 34, y: s.y - 10 }, { x: s.x + 40, y: s.y - 14 }]),
];

const painter: AreaPainter = {
  ground: paintGround,
  pieces: pieces(),

  animate(g: G, t: number, view: Rect) {
    // Marrow in the wells, breathing.
    for (const w of WELLS) {
      if (!inView(view, w.x, w.y)) continue;
      drawMarrow(g, w.x, w.y - 2, w.r * 0.78, w.r * 0.44, t, w.seed, w.deep ? 0.75 : 0.5);
    }
    // Skull-lamp flames, and their light pooled on the gravel.
    for (const l of LAMPS) {
      if (!inView(view, l.x, l.y)) continue;
      g.fillStyle(O.candle, 0.07 + Math.sin(t * 3 + l.x) * 0.02); g.fillEllipse(l.x + 12, l.y + 4, 90, 30);
      drawFlame(g, l.x + 12, l.y - 50, t, 0.8, 0.85);
    }
    for (const c of CANDLES) if (inView(view, c.x, c.y, 40)) drawFlame(g, c.x, c.y, t, 0.6);
    // The chapel's skull rose window, glowing and dimming like breath.
    if (inView(view, CHAPEL.x, CHAPEL.y - 100)) {
      g.fillStyle(O.candle, 0.08 + Math.sin(t * 1.3) * 0.04); g.fillCircle(CHAPEL.x, CHAPEL.y - CHAPEL.h * 0.68, CHAPEL.w * 0.4);
    }
    // The keep's ribcage window pulses red.
    if (inView(view, KEEP.x, KEEP.y - 150, 200)) {
      g.fillStyle(O.sinewLit, 0.08 + Math.sin(t * 0.9) * 0.05); g.fillEllipse(KEEP.x, KEEP.y - 150, 160, 120);
    }
    // White petals falling off the Long Beds' lilies and lying on the paths.
    for (let i = 0; i < 24; i++) {
      const x = BEDS.x + jit(51, i) * BEDS.w, y0 = BEDS.y + jit(52, i) * BEDS.h;
      if (!inView(view, x, y0, 30)) continue;
      const ph = (t * 0.2 + jit(53, i)) % 1;
      g.fillStyle(O.lily, 0.7 * (1 - ph)); g.fillEllipse(x + Math.sin(t + i) * 8, y0 + ph * 20, 3, 2);
    }
  },

  animateOver(g: G, t: number, view: Rect) {
    // Smoke from the tavern chimney and the lime kiln; incense from the chapel's bell-cote.
    const smokes: [number, number, number][] = [[TAVERN.x + 69, TAVERN.y - 200, 0x8a8088], [KILN.x, KILN.y - 100, 0xe8e2d4], [CHAPEL.x, CHAPEL.y - CHAPEL.h - 150, 0xc8b8d8]];
    for (const [x, y, c] of smokes) {
      if (!inView(view, x, y, 200)) continue;
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.28 + i * 0.25) % 1;
        g.fillStyle(c, 0.28 * (1 - ph)); g.fillCircle(x + ph * 26 + Math.sin(t + i) * 5, y - ph * 80, 5 + ph * 14);
      }
    }
    // The Rood's strings: from its arms down to the towers' rings, and three long ones down into
    // the nave through the roof — swaying as if somebody inside were dancing.
    if (inView(view, KEEP.x, KEEP.y - 300, 400)) {
      const top = KEEP.y - 450;
      const sway = Math.sin(t * 1.1) * 6;
      g.lineStyle(1.5, O.sinew, 0.9);
      for (const side of [-1, 1]) {
        const ax = KEEP.x + side * 116, ay = top + 44;
        const tx = KEEP.x + side * 175, ty = KEEP.y - 430;
        g.lineBetween(ax, ay, tx + sway * 0.3, ty + 6);
      }
      for (let i = -1; i <= 1; i++) {
        const ax = KEEP.x + i * 70, ay = top + 42;
        const ex = KEEP.x + i * 50 + sway, ey = KEEP.y - 300 + Math.abs(i) * 30;
        g.lineStyle(1.2, O.sinewLit, 0.8);
        g.beginPath(); g.moveTo(ax, ay);
        for (let k = 1; k <= 8; k++) { const u = k / 8; g.lineTo(ax + (ex - ax) * u + Math.sin(u * Math.PI) * sway, ay + (ey - ay) * u); }
        g.strokePath();
      }
    }
    // Lime dust hanging over the mason's yard.
    if (inView(view, 320, 1400, 300)) {
      for (let i = 0; i < 14; i++) {
        const x = 80 + jit(61, i) * 480, y = 1280 + jit(62, i) * 260 + Math.sin(t * 0.6 + i) * 8;
        g.fillStyle(O.boneLit, 0.18); g.fillCircle(x, y, 2 + jit(63, i) * 3);
      }
    }
    // Heat-haze over the Deep Well.
    const dw = WELLS[2];
    if (inView(view, dw.x, dw.y)) {
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.4 + i / 4) % 1;
        g.fillStyle(O.marrowLit, 0.14 * (1 - ph)); g.fillCircle(dw.x + Math.sin(t + i * 2) * 12, dw.y - 20 - ph * 70, 7 + ph * 12);
      }
    }
  },
};

// ── Solids ───────────────────────────────────────────────────────────

const rect = (x: number, y: number, w: number, h: number): Solid => ({ kind: 'rect', x, y, w, h });
const circ = (x: number, y: number, r: number): Solid => ({ kind: 'circle', x, y, r });

const SOLIDS: Solid[] = [
  // Map borders (exit gaps: west at y 800, south at x 1200).
  rect(0, 0, W, 44),
  rect(0, 44, 30, 686), rect(0, 870, 30, H - 870),
  rect(0, H - 26, 1130, 26), rect(1270, H - 26, W - 1270, 26),
  rect(W - 34, 0, 34, H),
  // The lych-gate posts.
  circ(LYCH.x, LYCH.y0 - 4, 10), circ(LYCH.x, LYCH.y1 - 4, 10),
  // The town.
  ...COTTAGES.map((c) => rect(c.x - c.w / 2, c.y - 28, c.w, 28)),
  rect(SHOP.x - 100, SHOP.y - 28, 200, 28),
  rect(TAVERN.x - 115, TAVERN.y - 30, 230, 30),
  rect(BOARD.x - 44, BOARD.y - 20, 88, 18),
  // Chapel, wall, keep.
  rect(CHAPEL.x - CHAPEL.w / 2 - 12, CHAPEL.y - 30, CHAPEL.w + 24, 30),
  rect(WALL.x - WALL.w / 2, WALL.y - 24, WALL.w, 24),
  rect(KEEP.x - 230, KEEP.y - 60, 460, 50), rect(KEEP.x - 230, KEEP.y - 10, 180, 10), rect(KEEP.x + 50, KEEP.y - 10, 180, 10),
  // The mason's yard.
  circ(KILN.x, KILN.y - 14, 46),
  ...STATUES.map((s) => rect(s.x - 26, s.y - 22, 52, 22)),
  rect(BLOCKS.x - 46, BLOCKS.y - 22, 92, 22),
  // The compost shed.
  rect(SHED.x - 90, SHED.y - 30, 180, 30),
  // Wells (their rims), shrines, trees, trellis legs, lamps, headstones.
  ...WELLS.map((w) => circ(w.x, w.y, w.r + 10)),
  ...SHRINES.map((s) => rect(s.x - 32, s.y - 24, 64, 24)),
  ...CYPRESSES.map((c) => circ(c.x, c.y - 6, 14)),
  ...YEWS.map((y) => circ(y.x, y.y - 12, 20)),
  ...TRELLISES.flatMap((t) => [circ(t.x - t.w / 2, t.y - 4, 8), circ(t.x + t.w / 2, t.y - 4, 8)]),
  ...LAMPS.map((l) => circ(l.x, l.y - 3, 6)),
  ...HEADSTONES.map((h) => rect(h.x - 12, h.y - 12, 24, 12)),
];

export const OSSUARY_AREA: AreaDef = {
  id: 'ossuary',
  isle: 'life',
  court: 'ossuary',
  name: 'The Ossuary Court',
  subtitle: 'The garden of the dead — kept by Prince Sinew',
  w: W,
  h: H,
  bg: 0x231c1c,
  accent: 0xd8ccb0,
  weather: 'fireflies',
  spawn: { x: 180, y: 800 },
  painter,
  solids: SOLIDS,
  exits: [
    { side: 'w', to: 'bloom', at: 800, label: 'The Lily Road — to the Bloom Court' },
    { side: 's', to: 'wildhunt', at: 1200, label: 'The Hunters\' Lane — to the Wildhunt Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 230, y: 900 } },
    { kind: 'prince', id: 'sinew', at: { x: KEEP.x, y: KEEP.y + 70 } },
    { kind: 'water', id: 'ossuary-well-water', shape: FISHING, fishery: 'ossuary-well' },
    { kind: 'encounter', id: 'ossuary-bone-garden' },
    { kind: 'encounter', id: 'ossuary-calcify' },
    { kind: 'encounter', id: 'ossuary-marrow-wells' },
    { kind: 'encounter', id: 'ossuary-knucklebones' },
    { kind: 'encounter', id: 'ossuary-reliquary' },
    { kind: 'sign', at: { x: 170, y: 870 }, text: 'THE OSSUARY COURT. All that comes down the hill is put to use. Nothing is wasted. — S.' },
    { kind: 'sign', at: { x: 1150, y: 940 }, text: 'THE BONE GARDEN. Do not pick. Do not lean. Do not knock. The rows are tended.' },
    { kind: 'sign', at: { x: 1990, y: 1030 }, text: 'THE DEEP WELL. Half of all catch to the Glasshouse kitchens. Whalebone or briarwood rods only.' },
    { kind: 'sign', at: { x: 760, y: 470 }, text: 'Flowers on the Wall are UNTIDY and will be removed. By order of the Gardener.' },
    { kind: 'sign', at: { x: 1360, y: 590 }, text: 'THE OSSUARY THRONE. Bodies by the side door. Bones by the front. Mourners not admitted.' },
    { kind: 'chest', id: 'ossuary-chest-beds', at: { x: 2320, y: 1530 }, coins: 110 },
    { kind: 'chest', id: 'ossuary-chest-keep', at: { x: 1570, y: 330 }, orbs: 1, open: { prince: 'sinew' } },
  ],
  npcs: OSSUARY_NPCS,
  crowd: OSSUARY_CROWD,
};
