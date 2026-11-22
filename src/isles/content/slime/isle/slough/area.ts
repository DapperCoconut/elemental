import type { AreaDef, NpcDef, PainterWorld, Poi, Pt, Rect, Solid, WorldGate, WorldHazard } from '../../../../IslesTypes';
import { type G, dim, glow, lit, mixC, motes, shadow } from '../../../../art/IsleArt';
import {
  BONE, BRUISE, COPPER, GOLD, MIRE, NYXA, NYXA_DARK, SKIN, SKIN_DARK, SKIN_DEEP, SKIN_LIT, VENOM, VENOM_DEEP, VENOM_LIT,
  WOOD, WOOD_DARK, clutchEgg, cornerWeb, draughtStill, duckboard, fangRock, hangingSkin, markSigil, milkingRack,
  scaleField, serpentBody, skinWall, venomTrough, wigglePath,
} from './art';

/**
 * The Slough — Matriarch Nyxa's own cast skin, a hill-long hollow serpent lying coiled in the
 * deepest mire of the Grave Court. You go in at the tail (south) and walk up the inside of it to
 * the head, under a roof of old scale with the marsh-light coming green through it.
 *
 *   The Tail      — (y 2280–2564) a puckered opening in the tail-tip, the door back to the churchyard,
 *                   a waystone, the old milker's tally.
 *   Hall I        — The Milking Sheds (y 1720–2240): three venom troughs across the body, crossed on
 *                   duckboards. Serpents on racks beside each board spit across it on the beat — the
 *                   two boards of a trough alternate, so one is always dry. Warden: Milkmaster Vatch.
 *   Hall II       — The Moulting Hollow (y 1060–1680): her old skins hang in the dark in staggered
 *                   rows and drop to strike in a rolling wave; an old empty head on its neck still
 *                   turns in the east of the hall. Warden: Skinwarden Hask.
 *   Hall III      — The Clutch (y 360–1020): eggs as tall as a man in clutches; linger by one and the
 *                   things in them lunge out. A band of hot brood-sand crosses the hall — bank the
 *                   brood-fire at its damper, or time the hatching eggs either side of the path.
 *                   Warden: Broodnurse Ophel.
 *   The Nest      — (y 40–320) inside the skull: the Matriarch coiled round her still.
 *
 * There is no health out here: a hazard throws you back to the last checkpoint.
 */

const W = 1800;
const H = 2600;
const MID = 900;
const DOOR_L = 820;
const DOOR_R = 980;

/** Walkable x-range of each stretch of the body (the skin narrows to the tail and the neck). */
interface Band { y0: number; y1: number; L: number; R: number }
const TAIL: Band = { y0: 2280, y1: 2564, L: 600, R: 1200 };
const SHEDS: Band = { y0: 1720, y1: 2240, L: 340, R: 1460 };
const HOLLOW: Band = { y0: 1060, y1: 1680, L: 300, R: 1500 };
const CLUTCH: Band = { y0: 360, y1: 1020, L: 300, R: 1500 };
const NEST: Band = { y0: 40, y1: 320, L: 420, R: 1380 };
const BANDS = [TAIL, SHEDS, HOLLOW, CLUTCH, NEST];

// ── Hazards ──────────────────────────────────────────────────────────

const hazards: WorldHazard[] = [];

/** Hall I: three venom troughs, two duckboards each. The boards' racks spit in turn. */
const TROUGH_H = 56;
interface Trough { y: number; boards: [number, number]; shift: number }
const TROUGHS: Trough[] = [
  { y: 2110, boards: [480, 1180], shift: 0 },
  { y: 1975, boards: [420, 940], shift: 600 },
  { y: 1840, boards: [700, 1240], shift: 1200 },
];
const BOARD_W = 100;
const BEAT = 2400;
const SPIT_ON = 520;
const boardOffset = (t: Trough, i: number): number => -(t.shift + i * (BEAT / 2));
for (const t of TROUGHS) {
  const [a, b] = t.boards;
  const segs: [number, number][] = [[SHEDS.L, a], [a + BOARD_W, b], [b + BOARD_W, SHEDS.R]];
  for (const [x0, x1] of segs) {
    hazards.push({ kind: 'floor', rect: { x: x0, y: t.y, w: x1 - x0, h: TROUGH_H }, safeWhen: { monarch: 'nyxa' }, color: VENOM });
  }
  t.boards.forEach((bx, i) => {
    hazards.push({ kind: 'jet', rect: { x: bx, y: t.y, w: BOARD_W, h: TROUGH_H }, periodMs: BEAT, onMs: SPIT_ON, offsetMs: boardOffset(t, i), color: VENOM_LIT });
  });
}
/** Each board's rack stands on the walkway just south of the trough, east of the board. */
const RACKS: { x: number; y: number; board: number; trough: Trough; i: number }[] = [];
for (const t of TROUGHS) t.boards.forEach((bx, i) => RACKS.push({ x: bx + BOARD_W + 64, y: t.y + TROUGH_H + 22, board: bx, trough: t, i }));

/** Hall II: rows of hanging skins. Each drops in turn, so a wave of strikes rolls along the row. */
const SKIN_ROWS = [1580, 1460, 1340, 1220];
const SKIN_W = 110;
const SKIN_H = 64;
const SKIN_PERIOD = 2800;
const SKIN_ON = 560;
interface HangSkin { x: number; y: number; off: number; len: number }
const SKINS: HangSkin[] = [];
SKIN_ROWS.forEach((y, r) => {
  const first = r % 2 === 0 ? 400 : 500;
  for (let x = first, c = 0; x <= 1400; x += 200, c++) {
    SKINS.push({ x, y, off: -(c * 380 + r * 650), len: 50 + ((x * 7 + r * 13) % 40) });
  }
});
for (const s of SKINS) {
  hazards.push({ kind: 'jet', rect: { x: s.x - SKIN_W / 2, y: s.y - SKIN_H / 2, w: SKIN_W, h: SKIN_H }, periodMs: SKIN_PERIOD, onMs: SKIN_ON, offsetMs: s.off, color: SKIN_LIT });
}
/** The Old Head: an empty cast head on a length of neck, still turning in the east of the Hollow. */
const OLD_HEAD = { x: 1300, y: 1400, length: 150, rad: 1.05, phase: 0.4 };
hazards.push({ kind: 'sweeper', x: OLD_HEAD.x, y: OLD_HEAD.y, length: OLD_HEAD.length, radPerSec: OLD_HEAD.rad, phase: OLD_HEAD.phase, color: SKIN_LIT });

/** Hall III: eggs in clutches. Each egg's ring is where the thing inside lunges when it stirs. */
interface Egg { x: number; y: number; off: number; s: number }
const EGGS: Egg[] = [
  ...[420, 560, 1240, 1380].map((x, i) => ({ x, y: 930, off: -i * 850, s: 1 })),
  ...[560, 760, 1040, 1240].map((x, i) => ({ x, y: 780, off: -(i * 850 + 400), s: 1.05 })),
  ...[480, 700, 1100, 1320].map((x, i) => ({ x, y: 520, off: -(i * 850 + 200), s: 0.95 })),
];
const EGG_PERIOD = 3400;
const EGG_ON = 600;
const eggRect = (e: Egg): Rect => ({ x: e.x - 65, y: e.y - 60, w: 130, h: 90 });
for (const e of EGGS) hazards.push({ kind: 'jet', rect: eggRect(e), periodMs: EGG_PERIOD, onMs: EGG_ON, offsetMs: e.off, color: 0xffb04a });
/** The brood-sand: kept hot under the Clutch. Safe once the brood-fire is banked. */
const BANKED = 'slough-brood-banked';
const SAND = { y: 620, h: 60, gap: [840, 960] as [number, number] };
hazards.push(
  { kind: 'floor', rect: { x: CLUTCH.L, y: SAND.y, w: SAND.gap[0] - CLUTCH.L, h: SAND.h }, safeWhen: { flag: BANKED }, color: 0xff8a3a },
  { kind: 'floor', rect: { x: SAND.gap[1], y: SAND.y, w: CLUTCH.R - SAND.gap[1], h: SAND.h }, safeWhen: { flag: BANKED }, color: 0xff8a3a },
  { kind: 'jet', rect: { x: SAND.gap[0], y: SAND.y, w: SAND.gap[1] - SAND.gap[0], h: SAND.h }, periodMs: 2600, onMs: 800, offsetMs: 0, color: 0xffb04a },
);
const DAMPER: Pt = { x: 1440, y: 740 };

// ── Gates ────────────────────────────────────────────────────────────

const gates: WorldGate[] = [
  { rect: { x: DOOR_L, y: 1680, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'slough-warden-1' }, look: 'fang', label: 'Defeat the Milkmaster' },
  { rect: { x: DOOR_L, y: 1020, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'slough-warden-2' }, look: 'web', label: 'Defeat the Skinwarden' },
  { rect: { x: DOOR_L, y: 320, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'slough-warden-3' }, look: 'fang', label: 'Defeat the Broodnurse' },
];

// ── Solids ───────────────────────────────────────────────────────────

/** The skin pinches at each joint between halls: a constriction with one way through. */
const JOINTS = [2240, 1680, 1020, 320];

const solids: Solid[] = [
  { kind: 'rect', x: 0, y: 0, w: W, h: 40 },
  { kind: 'rect', x: 0, y: H - 36, w: W, h: 36 },
];
for (const b of BANDS) {
  solids.push({ kind: 'rect', x: 0, y: b.y0, w: b.L, h: b.y1 - b.y0 }, { kind: 'rect', x: b.R, y: b.y0, w: W - b.R, h: b.y1 - b.y0 });
}
for (const y of JOINTS) {
  solids.push({ kind: 'rect', x: 0, y, w: DOOR_L, h: 40 }, { kind: 'rect', x: DOOR_R, y, w: W - DOOR_R, h: 40 });
}
// The joints' wall stubs where a narrow band meets a wide one.
solids.push({ kind: 'rect', x: 0, y: 2240, w: TAIL.L, h: 40 }, { kind: 'rect', x: 0, y: 320, w: NEST.L, h: 40 });
for (const r of RACKS) solids.push({ kind: 'rect', x: r.x - 34, y: r.y - 6, w: 68, h: 10 });
for (const e of EGGS) solids.push({ kind: 'circle', x: e.x, y: e.y - 4, r: 20 * e.s });
/** The still in the skull. */
const STILL_AT: Pt = { x: MID, y: 128 };
solids.push({ kind: 'rect', x: STILL_AT.x - 60, y: STILL_AT.y - 20, w: 190, h: 26 });
/** The milker's tally post in the tail and the fang stumps either side of the tail door. */
const TALLY: Pt = { x: 1110, y: 2380 };
solids.push({ kind: 'rect', x: TALLY.x - 10, y: TALLY.y - 8, w: 20, h: 10 });
const DOOR_FANGS: Pt[] = [{ x: 800, y: 2540 }, { x: 1000, y: 2540 }];
for (const f of DOOR_FANGS) solids.push({ kind: 'circle', x: f.x, y: f.y - 6, r: 14 });

// ── Ground ───────────────────────────────────────────────────────────

/** Straw and spilled venom over belly-scute flooring: the Sheds. */
function shedFloor(g: G, r: Rect, rng: () => number): void {
  scaleField(g, r.x, r.y, r.w, r.h, mixC(SKIN_DARK, WOOD, 0.35), rng, 30);
  for (let i = 0; i < (r.w * r.h) / 900; i++) {
    g.lineStyle(1, 0xc8b070, 0.35);
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h, a = rng() * Math.PI;
    g.lineBetween(x, y, x + Math.cos(a) * 10, y + Math.sin(a) * 10);
  }
  for (let i = 0; i < (r.w * r.h) / 14000; i++) {
    g.fillStyle(VENOM, 0.18); g.fillEllipse(r.x + rng() * r.w, r.y + rng() * r.h, 20 + rng() * 30, 6 + rng() * 6);
  }
}

/** The Hollow: dark, the floor a litter of old flakes of skin. */
function hollowFloor(g: G, r: Rect, rng: () => number): void {
  scaleField(g, r.x, r.y, r.w, r.h, dim(SKIN_DARK, 0.35), rng, 24);
  for (let i = 0; i < (r.w * r.h) / 1600; i++) {
    g.fillStyle(rng() < 0.6 ? SKIN : SKIN_LIT, 0.22);
    g.fillEllipse(r.x + rng() * r.w, r.y + rng() * r.h, 6 + rng() * 10, 2 + rng() * 3);
  }
}

/** The Clutch: warm, nest-litter of shredded skin over the scutes, ochre where the brood-sand shows. */
function clutchFloor(g: G, r: Rect, rng: () => number): void {
  scaleField(g, r.x, r.y, r.w, r.h, mixC(SKIN_DARK, 0x8a5a2a, 0.3), rng, 26);
  for (let i = 0; i < (r.w * r.h) / 1100; i++) {
    g.lineStyle(2, rng() < 0.5 ? SKIN : SKIN_DARK, 0.3);
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    g.beginPath(); g.arc(x, y, 6 + rng() * 8, rng() * 3, rng() * 3 + 2, false); g.strokePath();
  }
}

/** One joint between halls: a ridge of thick old hide pinched in, scale-rowed, with a fang either side. */
function joint(g: G, y: number, rng: () => number): void {
  g.fillStyle(SKIN_DEEP, 1); g.fillRect(0, y - 6, W, 52);
  scaleField(g, 0, y, DOOR_L, 40, SKIN_DARK, rng, 20);
  scaleField(g, DOOR_R, y, W - DOOR_R, 40, SKIN_DARK, rng, 20);
  g.fillStyle(SKIN_LIT, 0.4); g.fillRect(0, y + 36, DOOR_L, 4); g.fillRect(DOOR_R, y + 36, W - DOOR_R, 4);
  // The way through: the floor carries on, worn smooth.
  scaleField(g, DOOR_L, y, DOOR_R - DOOR_L, 40, SKIN, rng, 22);
}

function paintGround(g: G, rng: () => number): void {
  g.fillStyle(MIRE, 1); g.fillRect(0, 0, W, H);
  // The mire outside the skin, glimpsed past the walls: black water, scum, gas.
  for (let i = 0; i < 240; i++) {
    g.fillStyle(rng() < 0.5 ? 0x1a2410 : 0x0a0e06, 0.6);
    g.fillEllipse(rng() * W, rng() * H, 30 + rng() * 80, 8 + rng() * 14);
  }
  // Floors.
  scaleField(g, TAIL.L, TAIL.y0 - 40, TAIL.R - TAIL.L, TAIL.y1 - TAIL.y0 + 76, SKIN_DARK, rng, 22);
  shedFloor(g, { x: SHEDS.L, y: SHEDS.y0, w: SHEDS.R - SHEDS.L, h: SHEDS.y1 - SHEDS.y0 }, rng);
  hollowFloor(g, { x: HOLLOW.L, y: HOLLOW.y0, w: HOLLOW.R - HOLLOW.L, h: HOLLOW.y1 - HOLLOW.y0 }, rng);
  clutchFloor(g, { x: CLUTCH.L, y: CLUTCH.y0, w: CLUTCH.R - CLUTCH.L, h: CLUTCH.y1 - CLUTCH.y0 }, rng);
  scaleField(g, NEST.L, NEST.y0, NEST.R - NEST.L, NEST.y1 - NEST.y0, SKIN, rng, 28);
  // Walls: the skin folding up either side of each stretch.
  for (const b of BANDS) {
    skinWall(g, 0, b.y0, b.L, b.y1 - b.y0, -1, rng);
    skinWall(g, b.R, b.y0, W - b.R, b.y1 - b.y0, 1, rng);
  }
  for (const y of JOINTS) joint(g, y, rng);
  // The tail-tip: the skin puckered to a ragged hole, mire-light coming in through it.
  g.fillStyle(0x0a1206, 1); g.fillEllipse(MID, 2560, 200, 60);
  g.fillStyle(0x4a7a2a, 0.35); g.fillEllipse(MID, 2560, 160, 40);
  for (let i = 0; i < 14; i++) {
    const a = Math.PI + (i / 13) * Math.PI;
    g.fillStyle(SKIN, 0.9); g.fillTriangle(MID + Math.cos(a) * 96, 2560 + Math.sin(a) * 28, MID + Math.cos(a + 0.12) * 96, 2560 + Math.sin(a + 0.12) * 28, MID + Math.cos(a + 0.06) * 70, 2560 + Math.sin(a + 0.06) * 18);
  }
  // Hall I: the troughs and their boards.
  for (const t of TROUGHS) {
    venomTrough(g, SHEDS.L, t.y, SHEDS.R - SHEDS.L, TROUGH_H, rng);
    for (const bx of t.boards) duckboard(g, bx, t.y, BOARD_W, TROUGH_H);
  }
  // Drain gutters running from each trough to the wall, and the Mark scratched on the boards' ends.
  for (const t of TROUGHS) for (const bx of t.boards) markSigil(g, bx + BOARD_W / 2, t.y + TROUGH_H + 16, 7, VENOM_DEEP, 0.7);
  // Hall II: the shadows the skins cast in the dark, beneath each one.
  for (const s of SKINS) { g.fillStyle(0x000000, 0.28); g.fillEllipse(s.x, s.y + 8, SKIN_W * 0.8, SKIN_H * 0.5); }
  g.fillStyle(0x000000, 0.25); g.fillCircle(OLD_HEAD.x, OLD_HEAD.y, OLD_HEAD.length + 14);
  g.lineStyle(2, SKIN_LIT, 0.15); g.strokeCircle(OLD_HEAD.x, OLD_HEAD.y, OLD_HEAD.length + 10);
  // Hall III: nests of shredded skin under each egg, and the brood-sand band.
  for (const e of EGGS) {
    const r = eggRect(e);
    g.fillStyle(0x6a3a1a, 0.18); g.fillEllipse(e.x, e.y - 15, r.w, r.h);
  }
  g.fillStyle(0x8a5a2a, 1); g.fillRect(CLUTCH.L, SAND.y, CLUTCH.R - CLUTCH.L, SAND.h);
  for (let i = 0; i < 500; i++) {
    g.fillStyle(rng() < 0.5 ? 0xc8884a : 0x5a3a1a, 0.6);
    g.fillCircle(CLUTCH.L + rng() * (CLUTCH.R - CLUTCH.L), SAND.y + rng() * SAND.h, 1 + rng() * 1.5);
  }
  g.fillStyle(SKIN, 0.9); g.fillRect(SAND.gap[0], SAND.y, SAND.gap[1] - SAND.gap[0], SAND.h);
  // The skull: palate ridges across the head of the nest.
  for (let k = 0; k < 5; k++) {
    g.lineStyle(8, SKIN_DARK, 0.5);
    g.beginPath(); g.arc(MID, -60 + k * 30, 500 - k * 30, Math.PI * 0.18, Math.PI * 0.82, false); g.strokePath();
  }
  markSigil(g, MID, 230, 40, dim(BRUISE, 0.2), 0.6);
  // Webs in the corners of every hall.
  for (const b of BANDS) {
    cornerWeb(g, b.L, b.y0, 70, 0, 0.28);
    cornerWeb(g, b.R, b.y0, 70, Math.PI / 2, 0.28);
  }
}

// ── Pieces ───────────────────────────────────────────────────────────

const pieces: NonNullable<AreaDef['painter']['pieces']> = [];
for (const r of RACKS) {
  pieces.push({ x: r.x, y: r.y + 4, w: 110, h: 110, draw: (g) => milkingRack(g, r.x, r.y + 4, 78, 2, r.x * 0.01, 0, -1) });
}
for (const e of EGGS) {
  pieces.push({ x: e.x, y: e.y, w: 70, h: 90, draw: (g) => clutchEgg(g, e.x, e.y, e.s, 0, 0) });
}
// The milker's tally post: a stake hung with notched slats, one for every bucket of venom.
pieces.push({
  x: TALLY.x, y: TALLY.y, w: 60, h: 110, draw: (g) => {
    shadow(g, TALLY.x, TALLY.y + 2, 30, 8);
    g.fillStyle(WOOD_DARK, 1); g.fillRect(TALLY.x - 4, TALLY.y - 96, 8, 98);
    g.fillStyle(WOOD, 1); g.fillRect(TALLY.x - 3, TALLY.y - 96, 3, 98);
    for (let k = 0; k < 6; k++) {
      const y = TALLY.y - 88 + k * 13;
      g.fillStyle(lit(WOOD, 0.15), 1); g.fillRect(TALLY.x - 18, y, 36, 8);
      g.lineStyle(1, WOOD_DARK, 1);
      for (let n = 0; n < 8; n++) g.lineBetween(TALLY.x - 15 + n * 4, y + 1, TALLY.x - 15 + n * 4, y + 7);
    }
    markSigil(g, TALLY.x, TALLY.y - 104, 9, BONE, 0.9);
  },
});
for (const f of DOOR_FANGS) pieces.push({ x: f.x, y: f.y, w: 40, h: 70, draw: (g) => fangRock(g, f.x, f.y, 58, f.x < MID ? 0.18 : -0.18) });
// The brood-fire damper: a copper hood over a grate, a wheel to bank it.
pieces.push({
  x: DAMPER.x, y: DAMPER.y - 30, w: 70, h: 80, draw: (g) => {
    const x = DAMPER.x, y = DAMPER.y - 30;
    shadow(g, x, y + 2, 50, 12);
    g.fillStyle(0x1a1410, 1); g.fillRect(x - 22, y - 16, 44, 16);
    g.fillStyle(COPPER, 1); g.fillTriangle(x - 26, y - 16, x + 26, y - 16, x, y - 54);
    g.fillStyle(lit(COPPER, 0.3), 0.6); g.fillTriangle(x - 20, y - 18, x - 6, y - 18, x - 4, y - 46);
    g.lineStyle(3, 0x3a3a3a, 1); g.strokeCircle(x + 30, y - 24, 9);
    g.lineBetween(x + 21, y - 24, x + 39, y - 24); g.lineBetween(x + 30, y - 33, x + 30, y - 15);
  },
});
// The still in the skull, and the Matriarch coiled round it (until she falls).
pieces.push({ x: STILL_AT.x, y: STILL_AT.y, w: 260, h: 200, draw: (g) => draughtStill(g, STILL_AT.x - 40, STILL_AT.y, 0.9, 0.4) });
pieces.push({
  x: MID, y: STILL_AT.y + 50, w: 420, h: 160, when: { not: { monarch: 'nyxa' } }, draw: (g) => {
    // Her coils round the still: three loops of emerald, gold-edged, her head resting on the top one.
    for (let k = 0; k < 3; k++) {
      const pts: Pt[] = [];
      for (let i = 0; i < 40; i++) {
        const a = Math.PI * 0.05 + (i / 39) * Math.PI * 1.9;
        pts.push({ x: MID - 10 + Math.cos(a) * (150 - k * 26), y: STILL_AT.y + 20 + Math.sin(a) * (44 - k * 8) - k * 10 });
      }
      for (const p of pts) {
        g.fillStyle(NYXA_DARK, 1); g.fillCircle(p.x, p.y + 3, 15 - k * 2);
        g.fillStyle(NYXA, 1); g.fillCircle(p.x, p.y, 13 - k * 2);
      }
      for (let i = 0; i < pts.length; i += 3) { g.fillStyle(GOLD, 0.6); g.fillCircle(pts[i].x, pts[i].y - 4, 2.5); }
    }
    serpentBody(g, wigglePath(MID + 150, STILL_AT.y + 10, MID + 110, STILL_AT.y + 40, 6, 3, 0, 0.5), 9, NYXA, GOLD, 0);
  },
});

// ── Animation ────────────────────────────────────────────────────────

const near = (v: Rect, x: number, y: number, pad: number): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;
const jetPhase = (t: number, period: number, off: number): number => (((t * 1000 + off) % period) + period) % period;

function animateUnder(g: G, t: number, view: Rect, world: PainterWorld): void {
  // The troughs bubble.
  for (const tr of TROUGHS) {
    if (!near(view, MID, tr.y, 700)) continue;
    for (let i = 0; i < 16; i++) {
      const x = SHEDS.L + ((i * 137 + Math.floor(t * 0.5 + i) * 71) % (SHEDS.R - SHEDS.L));
      if (tr.boards.some((b) => x > b - 6 && x < b + BOARD_W + 6)) continue;
      const f = (t * 0.8 + i * 0.13) % 1;
      g.lineStyle(1, VENOM_LIT, 0.6 * (1 - f)); g.strokeCircle(x, tr.y + 20 + (i % 3) * 10, 2 + f * 5);
    }
  }
  // Hall III: eggs about to stir glow on the floor.
  for (const e of EGGS) {
    if (!near(view, e.x, e.y, 100)) continue;
    const ph = jetPhase(t, EGG_PERIOD, e.off);
    const warm = ph > EGG_PERIOD - 900 ? 1 - (EGG_PERIOD - ph) / 900 : ph < EGG_ON ? 1 : 0;
    if (warm > 0) glow(g, e.x, e.y - 20, 70, 0xffa040, 0.05 * warm, 3);
  }
  // The brood-sand heat shimmer, until the fire is banked.
  if (near(view, MID, SAND.y, 800) && !world.test({ flag: BANKED })) {
    for (let i = 0; i < 24; i++) {
      const x = CLUTCH.L + ((i * 97) % (CLUTCH.R - CLUTCH.L));
      if (x > SAND.gap[0] && x < SAND.gap[1]) continue;
      const f = (t * 0.6 + i * 0.21) % 1;
      g.lineStyle(1.5, 0xffc87a, 0.4 * (1 - f));
      g.lineBetween(x, SAND.y + SAND.h - f * 30, x + Math.sin(t * 4 + i) * 5, SAND.y + SAND.h - f * 30 - 10);
    }
  }
}

function animateOver(g: G, t: number, view: Rect): void {
  // Hall I: each rack spits across its board on its beat; the hood rears in the beat before.
  for (const r of RACKS) {
    if (!near(view, r.x, r.y, 220)) continue;
    const ph = jetPhase(t, BEAT, boardOffset(r.trough, r.i));
    const rear = ph > BEAT - 500 ? 1 - (BEAT - ph) / 500 : 0;
    const head = { x: r.x - 26, y: r.y - 34 };
    if (rear > 0) {
      g.fillStyle(0x24402a, 0.9); g.fillEllipse(head.x, head.y, 16 + rear * 10, 10 + rear * 6);
      g.fillStyle(0xffe040, rear); g.fillCircle(head.x - 3, head.y + 1, 1.6); g.fillCircle(head.x + 3, head.y + 1, 1.6);
    }
    if (ph < SPIT_ON) {
      const f = ph / SPIT_ON;
      const bx = r.board + BOARD_W / 2, by = r.trough.y + TROUGH_H / 2;
      // An arc of venom from the rack across the board.
      for (let i = 0; i < 12; i++) {
        const k = i / 11;
        const x = head.x + (r.board - 10 - head.x) * k, y = head.y + (by - head.y) * k - Math.sin(k * Math.PI) * 30;
        g.fillStyle(i % 2 ? VENOM : VENOM_LIT, 0.85 * (1 - f * 0.6)); g.fillCircle(x, y, 4 - k * 1.5);
      }
      g.fillStyle(VENOM, 0.4 * (1 - f)); g.fillRect(r.board, r.trough.y, BOARD_W, TROUGH_H);
      for (let i = 0; i < 6; i++) { g.fillStyle(VENOM_LIT, 0.7 * (1 - f)); g.fillCircle(bx - 40 + i * 16, by + Math.sin(t * 30 + i) * 10, 3); }
    }
  }
  // Hall II: the hanging skins; each drops and gapes on its beat.
  for (const s of SKINS) {
    if (!near(view, s.x, s.y, 160)) continue;
    const ph = jetPhase(t, SKIN_PERIOD, s.off);
    const drop = ph < SKIN_ON ? 1 : ph > SKIN_PERIOD - 600 ? (1 - (SKIN_PERIOD - ph) / 600) * 0.35 : 0;
    hangingSkin(g, s.x, s.y + 20, s.len, t + s.x * 0.003, drop, 0.95);
  }
  // The Old Head, on its neck.
  if (near(view, OLD_HEAD.x, OLD_HEAD.y, 220)) {
    const a = OLD_HEAD.phase + t * OLD_HEAD.rad;
    const tip = { x: OLD_HEAD.x + Math.cos(a) * OLD_HEAD.length, y: OLD_HEAD.y + Math.sin(a) * OLD_HEAD.length };
    const pts = wigglePath(tip.x, tip.y, OLD_HEAD.x, OLD_HEAD.y, 14, 6, t * 3, 1.5);
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      g.fillStyle(SKIN_DARK, 0.7); g.fillCircle(p.x, p.y + 2, 11 - i * 0.3);
      g.fillStyle(SKIN, 0.8); g.fillCircle(p.x, p.y, 10 - i * 0.3);
    }
    g.fillStyle(SKIN_LIT, 0.9); g.fillEllipse(tip.x, tip.y, 30, 24);
    g.fillStyle(0x0a0806, 1); g.fillEllipse(tip.x - 6, tip.y - 3, 6, 4); g.fillEllipse(tip.x + 6, tip.y - 3, 6, 4);
    g.fillStyle(BONE, 1); g.fillTriangle(tip.x - 5, tip.y + 6, tip.x - 2, tip.y + 6, tip.x - 3.5, tip.y + 13);
    g.fillTriangle(tip.x + 2, tip.y + 6, tip.x + 5, tip.y + 6, tip.x + 3.5, tip.y + 13);
  }
  // Hall III: what is in the eggs lunges out when it stirs.
  for (const e of EGGS) {
    if (!near(view, e.x, e.y, 120)) continue;
    const ph = jetPhase(t, EGG_PERIOD, e.off);
    if (ph >= EGG_ON) continue;
    const f = ph / EGG_ON;
    const reach = Math.sin(f * Math.PI) * 60;
    for (const side of [-1, 1]) {
      const tip = { x: e.x + side * reach, y: e.y - 20 + Math.sin(f * 9) * 8 };
      serpentBody(g, wigglePath(tip.x, tip.y, e.x, e.y - 40, 8, 4, t * 10, 1), 4, 0x3a3a1a, 0xe8d090, 0.6);
    }
    g.fillStyle(0xffd8a0, 0.3 * (1 - f)); g.fillEllipse(e.x, e.y - 40, 60, 80);
  }
  // Marsh-gas motes and drips, everywhere.
  motes(g, view, t, 22, VENOM_LIT, -14, 8, 1.6, 7);
}

// ── People ───────────────────────────────────────────────────────────

const NPCS: NpcDef[] = [
  {
    id: 'slough-drave', name: 'Fennick Drave', title: 'Milker, forty years at the racks',
    look: { body: 0xa8a080, accent: 0x4a3a2a, hat: 'plague', traits: ['apron', 'bandage'], size: 0.95, eye: 0xc8e8a8 },
    at: { x: 420, y: 2205 },
    talks: [
      {
        when: { monarch: 'nyxa' },
        lines: [
          'The troughs are draining. Down into the mire, all of it. Forty years of venom going back where it came from.',
          'Tansy Rue came up the tail an hour since with a kettle. Said she had the true recipe now. Off the still.',
          'A cure. Not a dose. I keep saying it out loud to see if it sounds like a lie. It does not.',
        ],
      },
      {
        when: { encounter: 'slough-warden-1' },
        lines: [
          'Vatch is down? Then nobody is keeping the drum. Listen — they are spitting out of time. Ha!',
          'Go on up. The Hollow is next. She keeps every skin she ever shed in there, hung up like coats.',
        ],
      },
      {
        lines: [
          'Mind the troughs. Fall in one and you will be back at the tail with your boots smoking.',
          'Each board has a rack beside it. One, two, three, spit. The two boards on a trough take turns.',
          'Me? I am paid in doses. Double ration for a milker. My grandsons are grey and I am paid in doses.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'nyxa' }, lines: ['...no more beat. Just the drip. Just the drip, going down the drain.'] },
      { lines: ['One, two, three — spit.', 'Forty years. Forty years and not a drop for my own.'] },
    ],
  },
  {
    id: 'slough-wren', name: 'Wren Tallow', title: 'Skin-scraper, going grey',
    look: { body: 0xb8b8b0, accent: 0x5a4a6a, hat: 'cowl', traits: ['scarf'], size: 0.85, eye: 0xd8d8e8 },
    at: { x: 360, y: 1648 },
    talks: [
      {
        when: { monarch: 'nyxa' },
        lines: [
          'Look. My fingers. They were grey to the knuckle this morning and now they are only pink. Only pink!',
          'Somebody is going round with a kettle. She gave me a cup and would not take the Mark for it.',
          'I am going to take every one of these skins down and burn them in the Grave Court. Every one.',
        ],
      },
      {
        when: { encounter: 'slough-warden-2' },
        lines: [
          'You beat the Skinwarden. She used to make me sleep inside the oldest one. She said it would keep me warm.',
          'The Clutch is next. Do not stand by the eggs. Whatever you do, do not linger by the eggs.',
        ],
      },
      {
        lines: [
          'My mother was passed over at the new moon, so I came to scrape skins for her dose. She is grey all the same.',
          'They hang in rows and drop in turn, like a wave down the hall. Watch one row, then step through.',
          'And mind the old head in the east. It never stops turning. I do not think it knows it is empty.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'nyxa' }, lines: ['...pink. Pink to the wrist.'] },
      { lines: ['Shh. They can hear you walking.', 'One drops, then the next, then the next...'] },
    ],
  },
  {
    id: 'slough-ide', name: 'Ide Marrow', title: 'Egg-thief, caught',
    look: { body: 0x8a6a5a, accent: 0x6a2a2a, hat: 'hood', traits: ['satchel', 'bandage'], size: 1.0, eye: 0xffc87a },
    at: { x: 1460, y: 990 },
    talks: [
      {
        when: { monarch: 'nyxa' },
        lines: [
          'She is dead? Then the eggs — what happens to the eggs? ...Leave them. Leave them cold. Let the mire have them.',
          'I came to steal one, you know. Thought I could sell a broodling back to her for a year of doses.',
          'Stupid. You do not buy anything from her. You only ever owe.',
        ],
      },
      {
        when: { encounter: 'slough-warden-3' },
        lines: [
          'The Broodnurse let you by? Then the skull is just through there. She is coiled round the still.',
          'She will offer you a dose before she bites. She always does. It is the only kindness she knows.',
        ],
      },
      {
        lines: [
          'Do not stand near the eggs. When they stir, what is in them comes out a foot or two — and bites.',
          'The sand across the middle is kept hot for the brood. There is a damper by the east wall. Bank it.',
          'Or run the gap down the middle between hatchings. I tried that. Hence the bandages.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'nyxa' }, lines: ['Cold. Let them go cold.'] },
      { lines: ['They are warm. Why are they always so warm?', 'Do not linger.'] },
    ],
  },
];

// ── POIs ─────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  {
    kind: 'door', at: { x: MID, y: 2530 }, to: 'grave', arrive: { x: 1200, y: 260 },
    label: 'The Tail-Tip — back out into the Grave Court',
  },
  { kind: 'waystone', at: { x: 720, y: 2440 } },
  { kind: 'lever', at: DAMPER, flag: BANKED, label: 'The Brood-Fire Damper' },
  { kind: 'encounter', id: 'slough-warden-1' },
  { kind: 'encounter', id: 'slough-warden-2' },
  { kind: 'encounter', id: 'slough-warden-3' },
  { kind: 'monarch', id: 'nyxa', at: { x: MID, y: 230 } },
  { kind: 'sign', at: { x: 1080, y: 2460 }, text: 'THE SLOUGH. Cast by the Matriarch in her eleventh moult. Kept by her household. Enter Marked.' },
  { kind: 'sign', at: { x: 1060, y: 2205 }, text: 'MILKING SHEDS. Racks spit on the beat. Boards alternate. Do not touch the troughs.' },
  { kind: 'sign', at: { x: 1060, y: 1648 }, text: 'MOULTING HOLLOW. The Matriarch\'s skins are not to be taken down, worn or spoken to.' },
  { kind: 'sign', at: { x: 700, y: 990 }, text: 'THE CLUTCH. Keep moving. The brood is warm. The damper is for the Broodnurse only.' },
  { kind: 'chest', id: 'slough-chest-sheds', at: { x: 1420, y: 1945 }, item: 'charm-slough-milking-cup', coins: 220 },
  { kind: 'chest', id: 'slough-chest-hollow', at: { x: 340, y: 1400 }, item: 'charm-slough-cast-skin', orbs: 4 },
  { kind: 'chest', id: 'slough-chest-clutch', at: { x: 340, y: 590 }, coins: 360, orbs: 4 },
  { kind: 'chest', id: 'slough-chest-nest', at: { x: 560, y: 250 }, coins: 560, orbs: 8, open: { monarch: 'nyxa' } },
];

export const SLOUGH_AREA: AreaDef = {
  id: 'slough',
  isle: 'slime',
  name: 'The Slough',
  subtitle: 'Matriarch Nyxa\'s own cast skin, coiled in the deepest mire',
  w: W,
  h: H,
  bg: 0x0a0c06,
  accent: VENOM,
  weather: 'drip',
  spawn: { x: MID, y: 2440 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver },
  solids,
  exits: [],
  pois: POIS,
  npcs: NPCS,
  gloom: 0.3,
  hazards,
  gates,
  checkpoints: [
    { x: MID, y: 2440 },   // the tail
    { x: MID, y: 2205 },   // the sheds' south walk
    { x: MID, y: 2070 },   // between troughs one and two
    { x: 940, y: 1940 },   // between troughs two and three
    { x: MID, y: 1780 },   // Vatch's drum
    { x: MID, y: 1645 },   // the Hollow's south walk
    { x: MID, y: 1520 },   // between the first rows
    { x: MID, y: 1400 },   // the middle walk
    { x: MID, y: 1280 },   // between the last rows
    { x: MID, y: 1120 },   // Hask's hooks
    { x: MID, y: 990 },    // the Clutch landing
    { x: MID, y: 850 },    // between the clutches
    { x: MID, y: 720 },    // the edge of the brood-sand
    { x: MID, y: 590 },    // past the sand
    { x: MID, y: 420 },    // Ophel's nest
    { x: MID, y: 290 },    // the neck of the skull
  ],
};
