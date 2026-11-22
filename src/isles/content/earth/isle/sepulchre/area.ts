import type { AreaDef, NpcDef, Poi, Pt, Rect, Solid, WorldGate, WorldHazard } from '../../../../IslesTypes';
import { type G, dim, glow, lit, mixC, motes, mulberry, shadow } from '../../../../art/IsleArt';
import {
  BONE, BRASS, BRASS_DARK, CANDLE, CHAIN, DUST, DUST_DEEP, IRON, MORTAR, SKINS, SOOT, STONE, STONE_DARK,
  STONE_DEEP, STONE_LIT, TITHE_RED, ashlar, candle, cellFront, dustDrift, gravaneSeal, headstone, rubbleHeap, sarcophagus,
  slabFloor, slitFace, strataFace,
} from './art';

/**
 * The Sepulchre — Regent Gravane's hold, dug downward into the heart of Bedrock Hold.
 *
 * The plan is drawn as you would see it from above, so "north" here is "down": every hall is a
 * level deeper than the last, and the strata on the walls get older and darker as you go. You
 * come in through the Weighing Gate at the south end and walk down through the three halls he
 * keeps his debtors in, each closed by a warden, to the throne at the very bottom — where he
 * sits on the Old King's sealed sarcophagus.
 *
 *   Weighing Gate — (y 2290–2564) arrival, a waystone, the door back up to the Rubble Court.
 *   Hall I        — The Tithe Shafts (y 1640–2250): three open shafts across the hall, crossed
 *                   only on stone lifts that sink and rise in turn (two of every four are up);
 *                   on the landings between, tithe-blocks drop from the shaft-heads onto their
 *                   own shadows. Warden: Liftwarden Corbel Haske.
 *   Hall II       — The Interment Galleries (y 980–1600): a switchback between walls of sealed
 *                   cells, faces at every slit. Stone doors grind shut across the gallery one
 *                   after the next, ahead of you and behind. The turnkey's wheel at the far end
 *                   unseals a cell back at the start. Warden: Turnkey Agathe Mortlake.
 *   Hall III      — The Old King's Crypt (y 330–940): two rows of sarcophagi whose lids slide out
 *                   into the aisles on a rhythm, and between them a drift of grave-dust deep
 *                   enough to bury you — cross on the packed sexton's path (it slides), or open
 *                   the crypt vent and blow the drift clear. Censers swing in the drift.
 *                   Warden: Sexton Lorrimer Dask.
 *   Throne        — (y 40–290): the Old King's sarcophagus, and the Regent sitting on it.
 *
 * There is no health out here: a hazard buries you and you climb out at the last checkpoint.
 */

const W = 1800;
const H = 2600;
const L = 300;
const R = 1500;
const MID = 900;
const DOOR_L = 820;
const DOOR_R = 980;

type Piece = NonNullable<AreaDef['painter']['pieces']>[number];

const near = (v: Rect, x: number, y: number, pad: number): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;
const jetPhase = (t: number, period: number, off: number): number => (((t * 1000 + off) % period) + period) % period;

// ── Hall I: the Tithe Shafts ─────────────────────────────────────────

interface ShaftRow { y: number; h: number }
/** The three shafts, south (shallow) to north (deep). Each is crossed on four lifts. */
const SHAFTS: ShaftRow[] = [{ y: 2080, h: 80 }, { y: 1910, h: 80 }, { y: 1740, h: 80 }];
const LIFT_W = (R - L) / 4;
const LIFT_PERIOD = 3600;
const LIFT_DOWN = 1800;
/** Row 0's lifts sink west→east, row 1 east→west, row 2 west→east; rows are staggered. */
const liftOffset = (row: number, i: number): number => {
  const order = row % 2 === 0 ? i : 3 - i;
  return -(order * 900 + row * 450);
};

/** Tithe-blocks dropped from the shaft-heads onto the landings, each on its own count. */
const DROPS: { x: number; y: number; period: number; off: number }[] = [
  { x: 470, y: 2035, period: 2400, off: 0 },
  { x: 1150, y: 2035, period: 2600, off: -1100 },
  { x: 690, y: 1865, period: 2300, off: -700 },
  { x: 1300, y: 1865, period: 2500, off: -1500 },
  { x: 1020, y: 1865, period: 2700, off: -300 },
];
const DROP_S = 64;
const DROP_ON = 340;

// ── Hall II: the Interment Galleries ─────────────────────────────────

/** The cell-blocks the gallery switches back between. */
const WALL_A: Rect = { x: L, y: 1400, w: 1360 - L, h: 60 };
const WALL_B: Rect = { x: 440, y: 1200, w: R - 440, h: 60 };
const WALL_C: Rect = { x: L, y: 1040, w: 760 - L, h: 40 };
/** The stone doors across the gallery, in the order you meet them. */
const DOORS: { x: number; y: number; h: number }[] = [
  { x: 1060, y: 1460, h: 140 }, { x: 1260, y: 1460, h: 140 },
  { x: 1180, y: 1260, h: 140 }, { x: 960, y: 1260, h: 140 }, { x: 740, y: 1260, h: 140 }, { x: 520, y: 1260, h: 140 },
  { x: 540, y: 1080, h: 120 }, { x: 680, y: 1080, h: 120 },
];
const DOOR_T = 40;
const DOOR_PERIOD = 3200;
const DOOR_SHUT = 1300;
const doorOffset = (k: number): number => -(k * 560);
const TURNKEY = 'sepulchre-turnkey';
const VENT = 'sepulchre-vent';

// ── Hall III: the Old King's Crypt ───────────────────────────────────

const AISLE_W = 125;
const SARC_W = 90;
const aisleX = (i: number): number => L + i * (AISLE_W + SARC_W);
const sarcX = (i: number): number => aisleX(i) + AISLE_W;
/** The two rows of sarcophagi (coffer footprints). */
const CRYPT_ROWS: { y: number; h: number; off: number }[] = [{ y: 740, h: 130, off: 0 }, { y: 420, h: 130, off: -1600 }];
const LID_PERIOD = 3000;
const LID_OUT = 1100;
const lidOffset = (row: number, i: number): number => CRYPT_ROWS[row].off - ((i * 1300) % LID_PERIOD);
/** The drift of grave-dust, the sexton's packed path through it, and the censers swinging in it. */
const DRIFT = { y: 590, h: 110 };
const PATH = { x: 840, w: 120 };
const CENSERS = [{ x: 560, y: 645, len: 90, rad: 1.4, phase: 0 }, { x: 1240, y: 645, len: 90, rad: -1.25, phase: 2 }];

// ── Hazards ──────────────────────────────────────────────────────────

const hazards: WorldHazard[] = [];
SHAFTS.forEach((s, row) => {
  for (let i = 0; i < 4; i++) {
    hazards.push({ kind: 'jet', rect: { x: L + i * LIFT_W, y: s.y, w: LIFT_W, h: s.h }, periodMs: LIFT_PERIOD, onMs: LIFT_DOWN, offsetMs: liftOffset(row, i), color: 0x060403 });
  }
});
for (const d of DROPS) {
  hazards.push({ kind: 'jet', rect: { x: d.x - DROP_S / 2, y: d.y - DROP_S / 2, w: DROP_S, h: DROP_S }, periodMs: d.period, onMs: DROP_ON, offsetMs: d.off, color: DUST });
}
DOORS.forEach((d, k) => {
  hazards.push({ kind: 'jet', rect: { x: d.x, y: d.y, w: DOOR_T, h: d.h }, periodMs: DOOR_PERIOD, onMs: DOOR_SHUT, offsetMs: doorOffset(k), color: STONE });
});
CRYPT_ROWS.forEach((r, row) => {
  for (let i = 0; i < 6; i++) {
    hazards.push({ kind: 'jet', rect: { x: aisleX(i), y: r.y, w: AISLE_W, h: r.h }, periodMs: LID_PERIOD, onMs: LID_OUT, offsetMs: lidOffset(row, i), color: STONE_LIT });
  }
});
hazards.push(
  { kind: 'floor', rect: { x: L, y: DRIFT.y, w: PATH.x - L, h: DRIFT.h }, safeWhen: { flag: VENT }, color: DUST },
  { kind: 'floor', rect: { x: PATH.x + PATH.w, y: DRIFT.y, w: R - PATH.x - PATH.w, h: DRIFT.h }, safeWhen: { flag: VENT }, color: DUST },
  { kind: 'conveyor', rect: { x: PATH.x, y: DRIFT.y, w: PATH.w, h: DRIFT.h }, vx: -55, vy: 0 },
);
for (const c of CENSERS) hazards.push({ kind: 'sweeper', x: c.x, y: c.y, length: c.len, radPerSec: c.rad, phase: c.phase, color: BRASS_DARK });

// ── Gates and solids ─────────────────────────────────────────────────

const TURNKEY_GATE: Rect = { x: 460, y: 1460, w: 40, h: 140 };

const gates: WorldGate[] = [
  { rect: { x: DOOR_L, y: 1600, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'sepulchre-warden-1' }, look: 'boulder', label: 'Defeat the Liftwarden' },
  { rect: TURNKEY_GATE, open: { flag: TURNKEY }, look: 'tomb', label: 'Sealed — the turnkey\'s wheel is at the far end of the gallery' },
  { rect: { x: DOOR_L, y: 940, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'sepulchre-warden-2' }, look: 'tomb', label: 'Defeat the Turnkey' },
  { rect: { x: DOOR_L, y: 290, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'sepulchre-warden-3' }, look: 'tomb', label: 'Defeat the Sexton' },
];

/** The rock between the halls, each cut through by one door. */
const CROSS_WALLS: { y: number; h: number }[] = [{ y: 2250, h: 40 }, { y: 1600, h: 40 }, { y: 940, h: 40 }, { y: 290, h: 40 }];

const solids: Solid[] = [
  { kind: 'rect', x: 0, y: 0, w: L, h: H },
  { kind: 'rect', x: R, y: 0, w: W - R, h: H },
  { kind: 'rect', x: L, y: 0, w: R - L, h: 40 },
  { kind: 'rect', x: L, y: H - 36, w: R - L, h: 36 },
];
for (const c of CROSS_WALLS) {
  solids.push({ kind: 'rect', x: L, y: c.y, w: DOOR_L - L, h: c.h }, { kind: 'rect', x: DOOR_R, y: c.y, w: R - DOOR_R, h: c.h });
}
for (const r of [WALL_A, WALL_B, WALL_C]) solids.push({ kind: 'rect', ...r });
CRYPT_ROWS.forEach((r) => {
  for (let i = 0; i < 5; i++) solids.push({ kind: 'rect', x: sarcX(i), y: r.y + 6, w: SARC_W, h: r.h - 12 });
});
/** The great scales at the Weighing Gate, and the Old King's sarcophagus at the bottom. */
const SCALES = { x: 1230, y: 2400 };
const OLD_KING = { x: MID, y: 128 };
solids.push(
  { kind: 'circle', x: SCALES.x, y: SCALES.y - 10, r: 34 },
  { kind: 'rect', x: OLD_KING.x - 70, y: OLD_KING.y - 72, w: 140, h: 72 },
);

// ── Ground ───────────────────────────────────────────────────────────

/** Quarry floor: hewn rock with the pick's scars in it, chips, and a skin of dust. */
function hewnFloor(g: G, r: Rect, base: number, rng: () => number): void {
  g.fillStyle(base, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let i = 0; i < (r.w * r.h) / 420; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    const c = rng() < 0.5 ? lit(base, 0.1) : dim(base, 0.18);
    g.fillStyle(c, 0.7); g.fillEllipse(x, y, 10 + rng() * 26, 4 + rng() * 8);
  }
  // Pick-scars in parallel runs, the way a quarryman cuts a floor level.
  for (let i = 0; i < (r.w * r.h) / 6000; i++) {
    const x = r.x + rng() * (r.w - 40), y = r.y + 4 + rng() * (r.h - 8);
    g.lineStyle(1.2, dim(base, 0.35), 0.7);
    for (let k = 0; k < 4; k++) g.lineBetween(x + k * 6, y, x + k * 6 + 8, y + 3);
  }
  for (let i = 0; i < (r.w * r.h) / 1500; i++) {
    g.fillStyle(rng() < 0.5 ? STONE_LIT : STONE_DARK, 0.6);
    g.fillRect(r.x + rng() * r.w, r.y + rng() * r.h, 2 + rng() * 2, 1.5 + rng() * 1.5);
  }
}

/** An open shaft: the far wall's strata dropping away into the dark, the near lip cut square. */
function shaftPit(g: G, s: ShaftRow, depth: number, rng: () => number): void {
  g.fillStyle(0x050302, 1); g.fillRect(L, s.y, R - L, s.h);
  // The far (north) wall of the shaft, seen going down: strata squeezed by perspective.
  for (let k = 0; k < 6; k++) {
    const y0 = s.y + k * 7, hh = 7 - k * 0.6;
    g.fillStyle(dim(mixC(STONE, DUST_DEEP, (k + depth) % 2 ? 0.4 : 0), 0.3 + k * 0.12), 1);
    g.fillRect(L, y0, R - L, hh);
  }
  for (let i = 0; i < 26; i++) {
    g.lineStyle(1, STONE_DEEP, 0.8);
    const x = L + rng() * (R - L);
    g.lineBetween(x, s.y, x + (rng() - 0.5) * 6, s.y + 34);
  }
  // Guide-rails down the shaft between the lifts.
  for (let i = 1; i < 4; i++) {
    const x = L + i * LIFT_W;
    g.fillStyle(IRON, 1); g.fillRect(x - 3, s.y, 6, s.h);
    g.fillStyle(lit(IRON, 0.25), 1); g.fillRect(x - 3, s.y, 1.5, s.h);
  }
  // The cut lips, north and south.
  g.fillStyle(STONE_LIT, 1); g.fillRect(L, s.y - 4, R - L, 4);
  g.fillStyle(STONE_DARK, 1); g.fillRect(L, s.y + s.h, R - L, 5);
  g.fillStyle(lit(STONE_LIT, 0.15), 1); g.fillRect(L, s.y + s.h + 5, R - L, 2);
  // Painted warning strokes on the south lip.
  for (let x = L + 10; x < R; x += 40) {
    g.fillStyle(TITHE_RED, 0.6);
    g.fillPoints([{ x, y: s.y + s.h + 7 }, { x: x + 14, y: s.y + s.h + 7 }, { x: x + 22, y: s.y + s.h + 13 }, { x: x + 8, y: s.y + s.h + 13 }], true, true);
  }
}

/** A gallery floor: long flags down the middle, a gutter each side, mortar drips from the cells. */
function galleryFloor(g: G, r: Rect, rng: () => number): void {
  slabFloor(g, r.x, r.y, r.w, r.h, 0x6e6454, rng);
  for (let i = 0; i < (r.w * r.h) / 3000; i++) {
    g.fillStyle(MORTAR, 0.35); g.fillEllipse(r.x + rng() * r.w, r.y + rng() * r.h, 4 + rng() * 8, 2 + rng() * 3);
  }
}

function paintGround(g: G, rng: () => number): void {
  g.fillStyle(STONE_DEEP, 1); g.fillRect(0, 0, W, H);
  // The rock of the shaft walls either side — strata that get older as you go down.
  strataFace(g, 0, 0, L, H, rng, 2);
  strataFace(g, R, 0, W - R, H, rng, 3);
  g.fillStyle(0x000000, 0.35); g.fillRect(0, 0, W, 300);
  g.fillStyle(0x000000, 0.2); g.fillRect(0, 300, W, 700);

  // The Weighing Gate.
  slabFloor(g, L, 2290, R - L, H - 36 - 2290, 0x8a7a62, rng);
  dustDrift(g, L, 2290, R - L, 270, rng, 0.35);
  // The worn path from the door up to the hall, and the great seal laid into it.
  g.fillStyle(DUST, 0.18); g.fillRect(MID - 70, 2290, 140, 274);
  gravaneSeal(g, MID, 2360, 54, dim(BRASS, 0.2), 0.7);
  g.fillStyle(STONE_DEEP, 0.5); g.fillCircle(SCALES.x, SCALES.y + 4, 56);

  // Hall I: quarry floor, the three shafts cut across it.
  hewnFloor(g, { x: L, y: 1640, w: R - L, h: 610 }, 0x7a6a56, rng);
  SHAFTS.forEach((s, i) => shaftPit(g, s, i, rng));
  // Dust lies in the corners where the lifts throw it.
  dustDrift(g, L, 1640, 120, 610, rng, 0.4);
  dustDrift(g, R - 120, 1640, 120, 610, rng, 0.4);
  for (const d of DROPS) {
    // Every drop-spot is a crater of chips and split blocks, the tally-mark chalked by it.
    g.fillStyle(STONE_DARK, 0.6); g.fillCircle(d.x, d.y, DROP_S * 0.62);
    for (let i = 0; i < 14; i++) {
      const a = rng() * Math.PI * 2, r = DROP_S * (0.4 + rng() * 0.5);
      g.fillStyle(rng() < 0.5 ? STONE_LIT : STONE, 0.8); g.fillRect(d.x + Math.cos(a) * r, d.y + Math.sin(a) * r, 3 + rng() * 4, 2 + rng() * 3);
    }
  }
  // The warden's dais at the hall's foot: a ring of set blocks.
  g.fillStyle(STONE_DARK, 0.6); g.fillEllipse(MID, 1690, 360, 80);
  g.lineStyle(3, STONE_LIT, 0.4); g.strokeEllipse(MID, 1690, 340, 70);

  // Hall II: the galleries.
  galleryFloor(g, { x: L, y: 980, w: R - L, h: 620 }, rng);
  // Mortar trowelled thick round the turnkey's dead-end cell.
  g.fillStyle(MORTAR, 0.25); g.fillRect(L, 1460, 200, 140);
  // The Turnkey's yard at the gallery's foot: a cleared floor of tally-slabs.
  for (let i = 0; i < 9; i++) {
    const x = 820 + (i % 3) * 200 + rng() * 40, y = 1000 + Math.floor(i / 3) * 60 + rng() * 10;
    g.lineStyle(1.4, TITHE_RED, 0.45);
    for (let k = 0; k < 4; k++) g.lineBetween(x + k * 6, y, x + k * 6, y + 14);
    g.lineBetween(x - 3, y + 12, x + 22, y + 2);
  }

  // Hall III: the crypt.
  slabFloor(g, L, 330, R - L, 610, 0x5e564a, rng);
  // The drift of grave-dust right across the crypt, and the sexton's packed path through it.
  g.fillStyle(DUST_DEEP, 1); g.fillRect(L, DRIFT.y, R - L, DRIFT.h);
  dustDrift(g, L, DRIFT.y - 10, R - L, DRIFT.h + 20, rng, 1);
  g.fillStyle(dim(DUST_DEEP, 0.2), 1); g.fillRect(PATH.x, DRIFT.y, PATH.w, DRIFT.h);
  for (let y = DRIFT.y + 6; y < DRIFT.y + DRIFT.h; y += 12) {
    g.lineStyle(1, dim(DUST_DEEP, 0.4), 0.8); g.lineBetween(PATH.x + 4, y, PATH.x + PATH.w - 4, y + 3);
  }
  // Bones and candle-stubs washed up at the drift's edges.
  for (let i = 0; i < 40; i++) {
    const x = L + rng() * (R - L), y = DRIFT.y + (rng() < 0.5 ? -4 : DRIFT.h + 4) + (rng() - 0.5) * 8;
    if (x > PATH.x - 10 && x < PATH.x + PATH.w + 10) continue;
    g.fillStyle(BONE, 0.7); g.fillRect(x, y, 6 + rng() * 6, 2);
    g.fillCircle(x, y + 1, 1.8); g.fillCircle(x + 9, y + 1, 1.8);
  }
  dustDrift(g, L, 330, R - L, 90, rng, 0.25);

  // The throne at the bottom of everything: black slabs, rings of the seal, dust everywhere.
  slabFloor(g, L, 40, R - L, 250, 0x3e3830, rng);
  g.fillStyle(0x000000, 0.25); g.fillRect(L, 40, R - L, 250);
  g.lineStyle(3, BRASS_DARK, 0.55); g.strokeEllipse(MID, 200, 520, 130);
  g.lineStyle(1.5, BRASS_DARK, 0.4); g.strokeEllipse(MID, 200, 600, 160);
  gravaneSeal(g, MID, 220, 44, BRASS_DARK, 0.6);
  dustDrift(g, L, 40, R - L, 250, rng, 0.3);
}

// ── Set pieces ───────────────────────────────────────────────────────

const pieces: Piece[] = [];

/**
 * A run of cut rock between halls (or a gallery cell-block): its rough top seen from above,
 * strata showing where the cutters went through, and a dressed south face. `cells` sets a row
 * of sealed cells into that face, a face at most slits.
 */
function wallRun(x0: number, x1: number, top: number, bot: number, cells: boolean, seed: number): void {
  const w = x1 - x0;
  pieces.push({
    x: (x0 + x1) / 2, y: bot, w: w + 20, h: bot - top + 60,
    draw: (g, rng0) => {
      const rng = mulberry(seed + Math.floor(rng0() * 1000));
      const FACE = 48;
      const capTop = top - 38;
      // The cap: the uncut rock over the cells, strata running through it.
      strataFace(g, x0, capTop, w, bot - FACE - capTop, rng, seed % 5);
      g.fillStyle(0x000000, 0.25); g.fillRect(x0, capTop, w, 6);
      g.fillStyle(lit(STONE, 0.1), 1); g.fillRect(x0, bot - FACE - 3, w, 3);
      // Rubble and dust lying on the top.
      for (let i = 0; i < w / 90; i++) {
        g.fillStyle(DUST, 0.35); g.fillEllipse(x0 + rng() * w, capTop + 8 + rng() * (bot - FACE - capTop - 16), 20 + rng() * 30, 5 + rng() * 6);
      }
      // The dressed face.
      g.fillStyle(STONE_DARK, 1); g.fillRect(x0, bot - FACE, w, FACE);
      g.fillStyle(STONE, 1); g.fillRect(x0, bot - FACE, w, FACE - 4);
      if (cells) {
        const n = Math.max(1, Math.floor(w / 72));
        const cw = w / n;
        for (let i = 0; i < n; i++) {
          const cx = x0 + cw * (i + 0.5);
          const face = rng() < 0.75 ? Math.floor(rng() * 60) : -1;
          cellFront(g, cx, bot - 2, Math.min(60, cw - 10), FACE - 6, rng, face, rng() < 0.3);
        }
      } else {
        for (let x = x0 + 4; x < x1 - 20; x += 26 + rng() * 14) {
          g.fillStyle(lit(STONE, 0.08), 1); g.fillRect(x, bot - FACE + 4, 22, FACE - 12);
          g.lineStyle(1, STONE_DARK, 0.8); g.strokeRect(x, bot - FACE + 4, 22, FACE - 12);
        }
      }
      g.fillStyle(0x000000, 0.3); g.fillRect(x0, bot - 4, w, 4);
    },
  });
}

/** A doorway between halls: jambs of dressed stone, a heavy lintel with the seal cut in it. */
function doorway(y: number, h: number, hall: string): void {
  pieces.push({
    x: MID, y: y + h, w: DOOR_R - DOOR_L + 80, h: h + 110,
    draw: (g) => {
      for (const jx of [DOOR_L, DOOR_R]) {
        g.fillStyle(STONE_DARK, 1); g.fillRect(jx - 16, y - 50, 32, h + 50);
        g.fillStyle(STONE_LIT, 1); g.fillRect(jx - 14, y - 50, 28, h + 46);
        for (let k = 0; k < 4; k++) { g.lineStyle(1, STONE_DARK, 1); g.lineBetween(jx - 14, y - 40 + k * 22, jx + 14, y - 40 + k * 22); }
      }
      g.fillStyle(STONE_DARK, 1); g.fillRect(DOOR_L - 24, y - 78, DOOR_R - DOOR_L + 48, 32);
      g.fillStyle(STONE, 1); g.fillRect(DOOR_L - 22, y - 78, DOOR_R - DOOR_L + 44, 28);
      g.fillStyle(lit(STONE, 0.15), 1); g.fillRect(DOOR_L - 22, y - 78, DOOR_R - DOOR_L + 44, 3);
      gravaneSeal(g, MID, y - 64, 11, STONE_DEEP, 0.9);
      // The hall's name chiselled either side of the seal, as notches.
      g.lineStyle(1.4, STONE_DEEP, 0.8);
      for (let k = 0; k < hall.length; k++) {
        const side = k % 2 ? 1 : -1;
        const x = MID + side * (22 + Math.floor(k / 2) * 9);
        g.lineBetween(x, y - 70, x, y - 58);
        if (k % 3 === 0) g.lineBetween(x - 3, y - 64, x + 3, y - 64);
      }
    },
  });
}

CROSS_WALLS.forEach((c, i) => {
  wallRun(L, DOOR_L - 16, c.y, c.y + c.h, i === 1 || i === 2, 11 + i * 7);
  wallRun(DOOR_R + 16, R, c.y, c.y + c.h, i === 1 || i === 2, 13 + i * 7);
  doorway(c.y, c.h, ['GATE', 'SHAFTS', 'GALLERIES', 'CRYPT'][i]);
});
wallRun(WALL_A.x, WALL_A.x + WALL_A.w, WALL_A.y, WALL_A.y + WALL_A.h, true, 41);
wallRun(WALL_B.x, WALL_B.x + WALL_B.w, WALL_B.y, WALL_B.y + WALL_B.h, true, 43);
wallRun(WALL_C.x, WALL_C.x + WALL_C.w, WALL_C.y, WALL_C.y + WALL_C.h, true, 47);

/**
 * The great Tithe Scales at the Weighing Gate: a brass beam on an iron post, two pans hung on
 * chains — one heaped with tithe-blocks, the other with the weights it is measured against — and
 * a clerk's lectern with the ledger open on it.
 */
pieces.push({
  x: SCALES.x, y: SCALES.y + 30, w: 260, h: 230,
  draw: (g, rng) => {
    const x = SCALES.x, y = SCALES.y + 24;
    shadow(g, x, y + 4, 220, 40, 0.4);
    g.fillStyle(STONE_DARK, 1); g.fillRect(x - 36, y - 18, 72, 18);
    g.fillStyle(STONE, 1); g.fillRect(x - 32, y - 22, 64, 8);
    g.fillStyle(IRON, 1); g.fillRect(x - 6, y - 178, 12, 160);
    g.fillStyle(lit(IRON, 0.3), 1); g.fillRect(x - 6, y - 178, 3, 160);
    // The beam, tipped toward the heavy pan.
    const tilt = 0.12;
    const bx0 = x - 100, by0 = y - 170 + Math.sin(tilt) * 100, bx1 = x + 100, by1 = y - 170 - Math.sin(tilt) * 100;
    g.lineStyle(9, BRASS_DARK, 1); g.lineBetween(bx0, by0, bx1, by1);
    g.lineStyle(5, BRASS, 1); g.lineBetween(bx0, by0 - 1, bx1, by1 - 1);
    g.fillStyle(BRASS, 1); g.fillCircle(x, y - 170, 9);
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y - 170, 4);
    // The pointer, and the arc it reads against.
    g.lineStyle(2, BRASS_DARK, 1); g.beginPath(); g.arc(x, y - 170, 34, -Math.PI * 0.75, -Math.PI * 0.25, false); g.strokePath();
    g.lineStyle(3, BRASS, 1); g.lineBetween(x, y - 170, x + Math.sin(tilt) * 34, y - 204);
    for (const [px, py, heavy] of [[bx0, by0, true], [bx1, by1, false]] as [number, number, boolean][]) {
      const panY = py + 92;
      g.lineStyle(1.5, CHAIN, 1);
      g.lineBetween(px, py, px - 30, panY); g.lineBetween(px, py, px + 30, panY); g.lineBetween(px, py, px, panY);
      g.fillStyle(BRASS_DARK, 1); g.fillEllipse(px, panY + 4, 74, 18);
      g.fillStyle(BRASS, 1); g.fillEllipse(px, panY, 70, 14);
      if (heavy) {
        ashlar(g, px - 14, panY - 2, 0.6, 4); ashlar(g, px + 14, panY - 2, 0.6, 5); ashlar(g, px, panY - 14, 0.6, 5);
      } else {
        for (let k = 0; k < 3; k++) {
          g.fillStyle(IRON, 1); g.fillRect(px - 18 + k * 13, panY - 12 + k, 10, 11 - k);
          g.fillStyle(lit(IRON, 0.3), 1); g.fillRect(px - 18 + k * 13, panY - 12 + k, 10, 2);
        }
      }
    }
    // The clerk's lectern and ledger.
    const lx = x + 110, ly = y + 6;
    g.fillStyle(0x3a2a1c, 1); g.fillRect(lx - 4, ly - 46, 8, 46);
    g.fillStyle(0x4a3624, 1); g.fillPoints([{ x: lx - 22, y: ly - 46 }, { x: lx + 22, y: ly - 52 }, { x: lx + 22, y: ly - 60 }, { x: lx - 22, y: ly - 54 }], true, true);
    g.fillStyle(0xe8dcc0, 1); g.fillPoints([{ x: lx - 19, y: ly - 54 }, { x: lx + 19, y: ly - 60 }, { x: lx + 19, y: ly - 66 }, { x: lx - 19, y: ly - 60 }], true, true);
    g.lineStyle(0.8, 0x6a5a48, 1);
    for (let k = 0; k < 4; k++) g.lineBetween(lx - 15, ly - 59 + k * 0.4 - k * 1.2, lx + 14, ly - 64 + k * 0.4 - k * 1.2);
    for (let i = 0; i < 6; i++) ashlar(g, x - 150 + (i % 3) * 30, y + 12 - Math.floor(i / 3) * 18, 0.65, 1 + Math.floor(rng() * 5));
  },
});

/** The lift winding-gear on the shaft walls: a great wheel at each end of each shaft. */
SHAFTS.forEach((s, row) => {
  for (const side of [-1, 1]) {
    const x = side < 0 ? L - 24 : R + 24;
    pieces.push({
      x, y: s.y + s.h, w: 90, h: 160,
      draw: (g) => {
        const cy = s.y + s.h / 2 - 30;
        g.fillStyle(STONE_DARK, 1); g.fillRect(x - 30, cy - 8, 60, 70);
        g.fillStyle(IRON, 1); g.fillCircle(x, cy, 30);
        g.fillStyle(dim(IRON, 0.4), 1); g.fillCircle(x, cy, 22);
        g.lineStyle(3, lit(IRON, 0.25), 1);
        for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + row; g.lineBetween(x, cy, x + Math.cos(a) * 28, cy + Math.sin(a) * 28); }
        g.fillStyle(BRASS, 1); g.fillCircle(x, cy, 6);
        g.lineStyle(3, CHAIN, 1); g.lineBetween(x - side * 28, cy, x - side * 60, s.y + 10);
      },
    });
  }
});

/** The crypt's sarcophagi; the middle one of the deep row is crowned (a prince of the old line). */
CRYPT_ROWS.forEach((r, row) => {
  for (let i = 0; i < 5; i++) {
    const x = sarcX(i) + SARC_W / 2;
    pieces.push({
      x, y: r.y + r.h - 4, w: SARC_W + 30, h: r.h + 20,
      draw: (g) => sarcophagus(g, x, r.y + r.h - 4, SARC_W - 6, r.h - 6, 0, row === 1 && i === 2),
    });
  }
});

/** The Old King's sarcophagus at the bottom of the hold: twice the size, crowned, chained shut. */
pieces.push({
  x: OLD_KING.x, y: OLD_KING.y, w: 220, h: 160,
  draw: (g) => {
    sarcophagus(g, OLD_KING.x, OLD_KING.y, 150, 140, 0, true);
    // The Regent's chains over the lid, and his seal set in lead across the join.
    g.lineStyle(4, CHAIN, 1);
    for (const f of [0.3, 0.7]) g.lineBetween(OLD_KING.x - 80, OLD_KING.y - 140 + 110 * f, OLD_KING.x + 80, OLD_KING.y - 140 + 110 * f + 6);
    g.fillStyle(0x6a6a72, 1); g.fillCircle(OLD_KING.x, OLD_KING.y - 64, 14);
    gravaneSeal(g, OLD_KING.x, OLD_KING.y - 64, 11, 0x2a2a30, 1);
    for (const sx of [-1, 1]) {
      g.fillStyle(IRON, 1); g.fillRect(OLD_KING.x + sx * 84 - 6, OLD_KING.y - 30, 12, 26);
      g.fillStyle(lit(IRON, 0.3), 1); g.fillCircle(OLD_KING.x + sx * 84, OLD_KING.y - 32, 6);
    }
  },
});

/** Headstones and heaps of fallen rock in the throne room, and one leaning in each hall's corner. */
const HEADSTONES: { x: number; y: number; s: number; lean: number }[] = [
  { x: 380, y: 120, s: 1.1, lean: -0.15 }, { x: 440, y: 230, s: 0.9, lean: 0.1 }, { x: 1420, y: 140, s: 1.2, lean: 0.2 },
  { x: 1360, y: 250, s: 0.9, lean: -0.08 }, { x: 1450, y: 900, s: 0.8, lean: 0.12 }, { x: 350, y: 2510, s: 0.9, lean: -0.2 },
];
for (const h of HEADSTONES) pieces.push({ x: h.x, y: h.y, w: 50, h: 60, draw: (g) => headstone(g, h.x, h.y, h.s, h.lean) });
const RUBBLE: Pt[] = [{ x: 350, y: 1690 }, { x: 1450, y: 1700 }, { x: 1440, y: 2530 }, { x: 1250, y: 80 }, { x: 560, y: 70 }];
for (const r of RUBBLE) pieces.push({ x: r.x, y: r.y, w: 80, h: 40, draw: (g, rng) => rubbleHeap(g, r.x, r.y, 1, rng) });
/** Stacked tithe-blocks waiting at the gate and on the warden's dais. */
for (const [bx, by] of [[1380, 2320], [560, 2320], [1080, 1680], [700, 1700]] as [number, number][]) {
  pieces.push({
    x: bx, y: by, w: 90, h: 70,
    draw: (g, rng) => {
      for (let k = 0; k < 5; k++) ashlar(g, bx - 20 + (k % 3) * 22 - (k > 2 ? -11 : 0), by - (k > 2 ? 22 : 0), 0.7, 1 + Math.floor(rng() * 5));
    },
  });
}
solids.push({ kind: 'circle', x: 1380, y: 2310, r: 26 }, { kind: 'circle', x: 560, y: 2310, r: 26 });

// ── NPCs ─────────────────────────────────────────────────────────────

const NPCS: NpcDef[] = [
  {
    id: 'sepulchre-pike', name: 'Goodman Aldous Pike', title: 'Hurdle-maker, interred (four stone short)',
    look: { body: 0xb08a68, accent: 0x5a4a3a, hat: 'cap', traits: ['beard', 'bandage'], size: 0.95, eye: 0xd8c8a8 },
    at: { x: 430, y: 2420 },
    talks: [
      {
        when: { monarch: 'gravane' },
        lines: [
          'They are knocking the cells open all down the hold. You can hear it from here — chisel, chisel, a cheer.',
          'Four stone short, I was. Four. My wife quarried two of it before they let her stop. I owe her two stone.',
          'Is the Old King really not in there? Then who were we paying it all to? Forty years of it, to an empty box.',
        ],
      },
      {
        when: { encounter: 'sepulchre-warden-1' },
        lines: [
          'The lifts have stopped sinking. First time I have heard them quiet. Haske must be down.',
          'Below the shafts it is the galleries. The cells. Mind the doors — they shut whether you are in them or not.',
        ],
      },
      {
        lines: [
          'Do not stand on the Scales, friend. They weigh whatever stands on them, and it is never enough.',
          'They took me in through that gate, four stone short. I dug out of my cell with a hurdle-stake. Took a year.',
          'Down through the shafts, then. The lifts sink two at a time, in turn. Walk with the ones that rise.',
          'And mind the shadows on the landings. The tithe drops from the shaft-heads whether you owe or not.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'gravane' }, lines: ['Two stone. I owe her two stone.', '...an empty box. Forty years.'] },
      { lines: ['...four stone. Only four.', 'Mind the shadows.', 'The Scales are always hungry.'] },
    ],
  },
  {
    id: 'sepulchre-quoin', name: 'Master Mason Ivo Quoin', title: 'The Regent\'s mason, who sets the seals',
    look: { body: 0xc8a080, accent: 0x6a6258, hat: 'coif', traits: ['apron', 'tool', 'glasses'], size: 1.1, eye: 0xc8d0d8 },
    at: { x: 1380, y: 2205 },
    talks: [
      {
        when: { monarch: 'gravane' },
        lines: [
          'I have my chisel out and a list as long as the hold. Every seal I set, I am striking off. Every collar.',
          'A quarryman with a canary walked out of here on his own. I set his collar. He is first on my list.',
          'Forty years I walled people up because a man said "until the Old King wakes". I never asked to see him.',
        ],
      },
      {
        when: { encounter: 'sepulchre-warden-2' },
        lines: [
          'Mortlake is down? Then the gallery cells answer to nobody. I mixed that mortar thin on purpose, you know.',
          'Thin mortar. Years of it. A strong shoulder breaks it. I could never say so out loud.',
        ],
      },
      {
        lines: [
          'You are not on my list. I have a list of every cell I am to seal this season, and you are not on it. Good.',
          'I set the seals. I set the collars. I do it well, because I am interred too, in my way, if I do it badly.',
          'The turnkey keeps a wheel at the far end of the galleries. It unseals the first cell. Someone kind is in it.',
        ],
      },
    ],
    barks: [{ lines: ['Thin mortar... thin...', 'Not on the list. Good.', 'Chip, chip, chip.'] }],
  },
  {
    id: 'sepulchre-calloway', name: 'Sister Rue Calloway', title: 'Psalm-singer, interred for a buried song',
    look: { body: 0xe0c4a8, accent: 0x3a3a52, hat: 'veil', traits: ['book'], size: 0.9, eye: 0xb8c8e8 },
    at: { x: 1380, y: 1090 },
    talks: [
      {
        when: { monarch: 'gravane' },
        lines: [
          'I have been singing it all morning. The song he buried. The Quarry Psalm. Nobody has stopped me.',
          'Two hundred people in these galleries knew the words and none of us dared. Now we are all singing it, badly.',
          'Badly is how songs come back, I think. Then they get better.',
        ],
      },
      {
        when: { encounter: 'sepulchre-warden-2' },
        lines: [
          'The doors have stopped. Oh — oh, the doors have stopped. Agathe has put her keys down.',
          'Through to the crypt, then. Lorrimer sweeps it. He sweeps the dust into drifts so deep it buries people.',
          'There is a vent on the east wall of the crypt landing. He never wants anyone to know.',
        ],
      },
      {
        lines: [
          'I sang a buried song in the street. "The Quarry Psalm". He buried it, so singing it is digging, he says.',
          'They interred me for it. A cell of my own. I sang in it until Agathe let me out to sweep, so I would stop.',
          'The doors here shut one after another, the way a turnkey walks her round. Follow the open ones.',
          'The faces at the slits will watch you. They do not mean harm. They have just not seen anyone walk free.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'gravane' }, lines: ['♪ ...and the stone remembers... ♪', 'Badly. Then better.'] },
      { lines: ['♪ hm-hm, hm-hmm... ♪', '...the doors, the doors.', 'Follow the open ones.'] },
    ],
  },
  {
    id: 'sepulchre-brack', name: 'Nurse Tamsin Brack', title: 'The Old King\'s nurse, interred with his household',
    look: { body: 0xd8b898, accent: 0x7a6a5a, hat: 'hood', traits: ['cane', 'lantern'], size: 0.85, eye: 0xd0d8c8 },
    at: { x: 430, y: 905 },
    talks: [
      {
        when: { monarch: 'gravane' },
        lines: [
          'Empty. I heard them shout it all the way up the crypt. Empty, and a note. I know what the note says.',
          'He wrote it the night he went down. "Gone to see the sea. Tell Gravane the crown is in the drawer."',
          'Forty years the boy sat on that box and never once opened it. He was afraid of what he would find. Nothing.',
        ],
      },
      {
        when: { encounter: 'sepulchre-warden-3' },
        lines: [
          'Lorrimer has put his broom down. Then it is only Gravane now, at the bottom, on the box.',
          'I nursed Gravane too. A fat, serious little boy who buried his toys so nobody else could have them.',
        ],
      },
      {
        lines: [
          'I was the Old King\'s nurse. When he went down to rest, the Regent sealed his whole household in after him.',
          'The lids slide out into the aisles in turn. Go round them. And the dust in the middle — never stand in it.',
          'Lorrimer\'s path through the drift slides you sideways. Lean into it. Or find the vent, on the landing, east.',
        ],
      },
    ],
    barks: [{ lines: ['Never stand in the dust.', '...my poor boys. Both of them.', 'Lean into it.'] }],
  },
];

/** The interred whose cells have been opened: the cell's broken front behind each, mortar fallen. */
function openCell(g: G, x: number, y: number, t: number): void {
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 32, y - 84, 64, 84);
  g.fillStyle(SOOT, 1); g.fillRect(x - 24, y - 74, 48, 72);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x - 32, y - 84, 8, 84); g.fillRect(x + 24, y - 84, 8, 84); g.fillRect(x - 32, y - 84, 64, 9);
  for (let i = 0; i < 6; i++) {
    const bx = x - 30 + ((i * 23) % 60), by = y - 2 + ((i * 7) % 6);
    g.fillStyle(i % 2 ? STONE : STONE_DARK, 1); g.fillRect(bx, by - 6, 11, 7);
    g.fillStyle(MORTAR, 0.7); g.fillRect(bx, by - 6, 11, 1.5);
  }
  candle(g, x + 36, y + 2, t, 0.9);
}

// ── Animation ────────────────────────────────────────────────────────

function animateUnder(g: G, t: number, view: Rect): void {
  // The lifts: up, a platform of iron-bound stone; going down, shrinking into the dark.
  SHAFTS.forEach((s, row) => {
    if (!near(view, MID, s.y, 700)) return;
    for (let i = 0; i < 4; i++) {
      const ph = jetPhase(t, LIFT_PERIOD, liftOffset(row, i));
      const x0 = L + i * LIFT_W;
      const down = ph < LIFT_DOWN;
      const d = down ? Math.sin((ph / LIFT_DOWN) * Math.PI) : 0;
      const shudder = !down && ph > LIFT_PERIOD - 600 ? Math.sin(t * 60) * 1.5 : 0;
      const ins = 6 + d * 40;
      const px = x0 + ins + shudder, pw = LIFT_W - ins * 2, py = s.y + 4 + d * 14, ph2 = s.h - 8 - d * 28;
      if (pw <= 4 || ph2 <= 4) continue;
      const k = 1 - d * 0.85;
      g.fillStyle(dim(STONE_LIT, 1 - k * 0.6 + 0.1), 1); g.fillRect(px, py, pw, ph2);
      if (k > 0.5) {
        g.fillStyle(lit(STONE_LIT, 0.2), 1); g.fillRect(px, py, pw, 3);
        g.lineStyle(3, IRON, 1); g.strokeRect(px + 2, py + 2, pw - 4, ph2 - 4);
        g.lineStyle(1.5, STONE_DARK, 0.8);
        for (let xx = px + 30; xx < px + pw - 10; xx += 46) g.lineBetween(xx, py + 4, xx, py + ph2 - 4);
        // A tithe-block riding every lift, tally painted on it.
        ashlar(g, px + pw * 0.7, py + ph2 - 8, 0.55, 1 + ((i + row) % 5));
      }
    }
  });
  // Shadows swelling on the landings under the blocks about to drop.
  for (const d of DROPS) {
    if (!near(view, d.x, d.y, 100)) continue;
    const ph = jetPhase(t, d.period, d.off);
    const warn = ph > d.period - 900;
    if (warn) {
      const k = 1 - (d.period - ph) / 900;
      g.fillStyle(0x000000, 0.2 + k * 0.45); g.fillEllipse(d.x, d.y, DROP_S * (0.5 + k * 0.6), DROP_S * (0.35 + k * 0.4));
    }
  }
  // The crypt lids, slid out across their aisles (and the grinding dust as they go).
  CRYPT_ROWS.forEach((r, row) => {
    if (!near(view, MID, r.y, 700)) return;
    for (let i = 0; i < 6; i++) {
      const ph = jetPhase(t, LID_PERIOD, lidOffset(row, i));
      const out = ph < LID_OUT;
      const warn = !out && ph > LID_PERIOD - 600;
      const x0 = aisleX(i);
      if (warn) {
        const k = 1 - (LID_PERIOD - ph) / 600;
        for (let n = 0; n < 6; n++) {
          g.fillStyle(DUST, 0.5 * k); g.fillCircle(x0 + 8 + n * 20, r.y + 20 + ((t * 80 + n * 31) % (r.h - 40)), 3 + k * 3);
        }
      }
      if (out) {
        g.fillStyle(lit(STONE, 0.1), 1); g.fillRect(x0 + 4, r.y + 6, AISLE_W - 8, r.h - 12);
        g.lineStyle(2, STONE_DARK, 1); g.strokeRect(x0 + 6, r.y + 8, AISLE_W - 12, r.h - 16);
        g.lineStyle(1, STONE_DARK, 0.7);
        g.strokeEllipse(x0 + AISLE_W / 2, r.y + r.h / 2, AISLE_W * 0.4, r.h * 0.7);
      }
    }
  });
  // Dust streaming along the sexton's path.
  if (near(view, PATH.x + PATH.w / 2, DRIFT.y + DRIFT.h / 2, 200)) {
    for (let i = 0; i < 26; i++) {
      const y = DRIFT.y + 6 + ((i * 37) % (DRIFT.h - 12));
      const x = PATH.x + PATH.w - (((t * 55) + i * 29) % PATH.w);
      g.fillStyle(lit(DUST, 0.2), 0.5); g.fillEllipse(x, y, 10, 2.5);
    }
  }
  // The opened cells behind the interred.
  for (const n of NPCS) {
    if (!near(view, n.at.x, n.at.y, 100)) continue;
    openCell(g, n.at.x, n.at.y - 4, t);
  }
  // Candles along the walls of every hall.
  for (const c of CANDLES) {
    if (!near(view, c.x, c.y, 40)) continue;
    glow(g, c.x, c.y - 14, 26, CANDLE, 0.05, 3);
    candle(g, c.x, c.y, t);
  }
}

const CANDLES: Pt[] = [];
for (let y = 380; y < 2540; y += 150) { CANDLES.push({ x: L + 14, y }, { x: R - 14, y: y + 70 }); }
CANDLES.push({ x: OLD_KING.x - 100, y: OLD_KING.y + 8 }, { x: OLD_KING.x + 100, y: OLD_KING.y + 8 }, { x: OLD_KING.x - 120, y: OLD_KING.y - 40 }, { x: OLD_KING.x + 120, y: OLD_KING.y - 40 });

/** Where the faces at the gallery slits are — so their eyes can follow you. */
const SLITS: { x: number; y: number; seed: number }[] = [];
for (const r of [WALL_A, WALL_B, WALL_C]) {
  const n = Math.max(1, Math.floor(r.w / 72));
  const cw = r.w / n;
  for (let i = 0; i < n; i++) SLITS.push({ x: r.x + cw * (i + 0.5), y: r.y + r.h - 2 - 42 + 24, seed: i * 7 + r.y });
}

function animateOver(g: G, t: number, view: Rect): void {
  // The tithe-blocks falling from the shaft-heads, and the dust burst as they land.
  for (const d of DROPS) {
    if (!near(view, d.x, d.y, 200)) continue;
    const ph = jetPhase(t, d.period, d.off);
    if (ph > d.period - 700) {
      const k = 1 - (d.period - ph) / 700;
      const y = d.y - 280 * (1 - k * k);
      g.lineStyle(1.5, CHAIN, 0.6 * (1 - k)); g.lineBetween(d.x, y - 300, d.x, y - 20);
      ashlar(g, d.x, y, 1.4, 4, 0.5 + k * 0.5);
    } else if (ph < DROP_ON + 400) {
      const k = ph / (DROP_ON + 400);
      ashlar(g, d.x, d.y + 8, 1.4 * (1 - k * 0.2), 4, 1 - k);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        g.fillStyle(DUST, 0.6 * (1 - k)); g.fillCircle(d.x + Math.cos(a) * (20 + k * 50), d.y + Math.sin(a) * (10 + k * 26), 6 - k * 4);
      }
    }
  }
  // The lift chains, rattling up and down at each platform's corners, and a lamp at each end.
  SHAFTS.forEach((s, row) => {
    if (!near(view, MID, s.y, 700)) return;
    for (let i = 0; i < 4; i++) {
      const ph = jetPhase(t, LIFT_PERIOD, liftOffset(row, i));
      const down = ph < LIFT_DOWN;
      const warn = !down && ph > LIFT_PERIOD - 600;
      const x0 = L + i * LIFT_W;
      g.lineStyle(2, CHAIN, 0.85);
      for (const cx of [x0 + 12, x0 + LIFT_W - 12]) {
        g.lineBetween(cx, s.y - 40, cx, s.y + 4);
        const off = (t * (down ? 140 : warn ? 60 : 0)) % 8;
        for (let yy = s.y - 40 + off; yy < s.y + 4; yy += 8) { g.fillStyle(lit(CHAIN, 0.3), 0.9); g.fillRect(cx - 1.5, yy, 3, 3); }
      }
      // A lamp hung over each lift: green while it is up, red as it is about to sink.
      const lx = x0 + LIFT_W / 2, ly = s.y - 32;
      const c = down ? 0x6a1a10 : warn ? (Math.floor(t * 10) % 2 ? 0xff5a2a : 0x8a2a10) : 0x8ad86a;
      g.fillStyle(IRON, 1); g.fillRect(lx - 5, ly - 6, 10, 12);
      g.fillStyle(c, 1); g.fillCircle(lx, ly, 4);
      if (!down) { g.fillStyle(c, 0.12); g.fillCircle(lx, ly, 14); }
    }
  });
  // The gallery doors: slabs that drop from the lintel, grind shut, and haul back up.
  DOORS.forEach((d, k) => {
    if (!near(view, d.x, d.y + d.h / 2, 120)) return;
    const ph = jetPhase(t, DOOR_PERIOD, doorOffset(k));
    const shut = ph < DOOR_SHUT;
    const warn = !shut && ph > DOOR_PERIOD - 600;
    const rising = !shut && ph < DOOR_SHUT + 500;
    let f = 0;
    if (shut) f = 1;
    else if (warn) f = (1 - (DOOR_PERIOD - ph) / 600) * 0.75;
    else if (rising) f = 1 - (ph - DOOR_SHUT) / 500;
    const topY = d.y - 46;
    const slabH = (d.h + 46) * f;
    g.fillStyle(STONE_DARK, 1); g.fillRect(d.x - 6, topY - 10, DOOR_T + 12, 12);
    if (slabH > 1) {
      g.fillStyle(STONE_DARK, 1); g.fillRect(d.x, topY, DOOR_T, slabH);
      g.fillStyle(STONE, 1); g.fillRect(d.x + 3, topY, DOOR_T - 6, slabH - 3);
      g.lineStyle(1, STONE_DARK, 0.8);
      for (let yy = topY + 18; yy < topY + slabH - 6; yy += 22) g.lineBetween(d.x + 3, yy, d.x + DOOR_T - 3, yy);
      gravaneSeal(g, d.x + DOOR_T / 2, topY + slabH - 20, 9, STONE_DARK, 0.8);
      if (shut && ph < 160) {
        for (let i = 0; i < 8; i++) { g.fillStyle(DUST, 0.7 * (1 - ph / 160)); g.fillCircle(d.x - 10 + i * 8, d.y + d.h - 4 - (i % 3) * 4, 5); }
      }
    }
  });
  // The censers swinging over the drift, smoking.
  for (const c of CENSERS) {
    if (!near(view, c.x, c.y, 160)) continue;
    const a = c.phase + t * c.rad;
    const ex = c.x + Math.cos(a) * c.len, ey = c.y + Math.sin(a) * c.len;
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(ex, ey - 6, 11);
    g.fillStyle(BRASS, 1); g.fillCircle(ex, ey - 8, 8);
    g.fillStyle(0xff9a4a, 0.8); g.fillCircle(ex, ey - 9, 3);
    for (let i = 0; i < 5; i++) {
      const ph = ((t * 0.8 + i / 5) % 1);
      g.fillStyle(0xd8d0c0, 0.3 * (1 - ph)); g.fillCircle(ex - Math.cos(a) * ph * 30, ey - 12 - ph * 40, 4 + ph * 8);
    }
  }
  // The faces at the slits, following the light.
  for (const s of SLITS) {
    if (!near(view, s.x, s.y, 40)) continue;
    slitFace(g, s.x, s.y, 1, SKINS[s.seed % SKINS.length], t, s.seed, 0.9);
  }
  // Dust sifting down from the roof everywhere, thicker toward the bottom of the hold.
  motes(g, view, t, 46, DUST, 14, 10, 1.6, 3);
  if (view.y < 1000) motes(g, view, t, 30, lit(DUST, 0.2), 22, 6, 2.2, 9);
}

// ── POIs ─────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  {
    kind: 'door', at: { x: MID, y: 2530 }, to: 'rubble', arrive: { x: 1200, y: 260 },
    label: 'The Sealed Gate — back up into the Rubble Court',
  },
  { kind: 'waystone', at: { x: 680, y: 2450 } },
  { kind: 'lever', at: { x: 345, y: 1120 }, flag: TURNKEY, label: 'The Turnkey\'s Wheel' },
  { kind: 'lever', at: { x: 1440, y: 905 }, flag: VENT, label: 'The Crypt Vent' },
  { kind: 'encounter', id: 'sepulchre-warden-1' },
  { kind: 'encounter', id: 'sepulchre-warden-2' },
  { kind: 'encounter', id: 'sepulchre-warden-3' },
  { kind: 'monarch', id: 'gravane', at: { x: MID, y: 200 } },
  { kind: 'sign', at: { x: 1100, y: 2470 }, text: 'THE SEPULCHRE. The Stone Tithe is owed. What is short is interred until the debt is quarried by others.' },
  { kind: 'sign', at: { x: 1060, y: 2215 }, text: 'TITHE SHAFTS. Lifts descend in turn. Do not ride a lift that is going down. Mind the shaft-heads.' },
  { kind: 'sign', at: { x: 700, y: 1540 }, text: 'INTERMENT GALLERIES. Doors close on the turnkey\'s round. Debtors do not speak to visitors.' },
  { kind: 'sign', at: { x: 1060, y: 905 }, text: 'THE CRYPT. The Old King rests. Keep to the sexton\'s path. The vent is NOT to be opened.' },
  { kind: 'chest', id: 'sepulchre-chest-shafts', at: { x: 345, y: 1865 }, item: 'charm-tithe-weight', coins: 160 },
  { kind: 'chest', id: 'sepulchre-chest-cell', at: { x: 380, y: 1530 }, item: 'charm-turnkey-ring', orbs: 3 },
  { kind: 'chest', id: 'sepulchre-chest-crypt', at: { x: 1450, y: 375 }, coins: 320, orbs: 4 },
  { kind: 'chest', id: 'sepulchre-chest-throne', at: { x: 600, y: 200 }, coins: 520, orbs: 8, open: { monarch: 'gravane' } },
];

export const SEPULCHRE_AREA: AreaDef = {
  id: 'sepulchre',
  isle: 'earth',
  name: 'The Sepulchre',
  subtitle: 'Regent Gravane\'s hold, dug downward into the heart of Bedrock Hold',
  w: W,
  h: H,
  bg: 0x0a0806,
  accent: 0xb89a6a,
  weather: 'dust',
  spawn: { x: MID, y: 2440 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver },
  solids,
  exits: [],
  pois: POIS,
  npcs: NPCS,
  gloom: 0.32,
  hazards,
  gates,
  checkpoints: [
    { x: MID, y: 2440 },   // the Weighing Gate
    { x: MID, y: 2205 },   // the first landing
    { x: MID, y: 2035 },   // between shafts one and two
    { x: 860, y: 1865 },   // between shafts two and three
    { x: 700, y: 1690 },   // Haske's dais
    { x: MID, y: 1530 },   // the galleries' foot
    { x: 1160, y: 1530 },  // between the first doors
    { x: 1430, y: 1430 },  // the east turn
    { x: 1360, y: 1330 },  // the second gallery, east
    { x: 1080, y: 1330 },
    { x: 850, y: 1330 },
    { x: 630, y: 1330 },
    { x: 370, y: 1230 },   // the west turn
    { x: 610, y: 1140 },   // between the last doors
    { x: 900, y: 1120 },   // Mortlake's yard
    { x: MID, y: 905 },    // the crypt landing
    { x: 700, y: 720 },    // north of the first row, west
    { x: 1100, y: 720 },   // north of the first row, east
    { x: MID, y: 570 },    // past the drift
    { x: 700, y: 375 },    // Dask's floor
    { x: MID, y: 262 },    // the throne
  ],
};
