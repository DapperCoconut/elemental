import type { AreaDef, Cond, NpcDef, Poi, Rect, Solid, WorldGate, WorldHazard } from '../../../../IslesTypes';
import { type G, dim, flagstones, glow, groundFill, lit, mixC, motes, shadow } from '../../../../art/IsleArt';
import {
  CANDLE, EBONY, GHOST, GILT, GILT_DARK, GILT_LIT, IVORY, LEATHER, OAK, OAK_DARK, OAK_LIT, RIBBON, ROSE_BLUE, ROSE_GOLD,
  ROSE_RED, SILVER, SILVER_DARK, SILVER_DEEP, SILVER_LIT, VIOLET, WAX_RED,
  bellows, cadenzaSigil, candle, casePanel, ghostMouth, manual, noteHead, organPipe, staveLines, stopKnob, trebleClef,
} from './art';

/**
 * The Great Organ — Maestro Cadenza's instrument, built into the mountain behind the cathedral.
 *
 * You come in at the bellows door at the foot (south) and climb north through the instrument,
 * the way the wind goes: from the lungs that make it, through the pipes that sound it, past the
 * voices sealed in it, to the Console where he plays it.
 *
 *   Blowers' Landing (y 2280–2564) — the door back to the cathedral, a waystone, the blowers' wheel.
 *   Hall I   The Bellows Hall (y 1720–2240): three leather lungs the size of houses breathe in
 *            turn, the breath passing up the hall. Each exhales a gust across most of the hall
 *            (a jet band) and leaves the far side clear; between them the lungs *draw*, and the
 *            draught drags you sideways towards whichever is inhaling. Zigzag the gaps, or cross a
 *            band between breaths. Warden: Bellows-Master Hogarth Wynd.
 *   Hall II  The Pipe Forest (y 1040–1680): pipes as thick as trees. When a pipe's key lights on
 *            the floor its column sounds — a jet up the whole of the grove in front of it — one
 *            pipe after another like a scale. The way north is a rank of pipes stopped shut: draw
 *            the two stops at its west and east ends (levers) and it opens.
 *            Warden: Stopwright Ignatia Rank.
 *   Hall III The Voice Loft (y 340–1000): rows of sealed pipes, a white ribbon round every one,
 *            each with a ghostly mouth singing a voice. The song washes down the aisles against
 *            you (a current), and at each choir-stall the voices swing out of a mouth like a
 *            censer (sweepers). Switchback up the three aisles. Warden: Choirwarden Absolom Seal.
 *   The Console (y 40–300) — under the Rose of Pipes, where the Maestro plays.
 *
 * There is no health out here: a hazard throws you back to the last checkpoint.
 */

const W = 1800;
const H = 2600;
const L = 240;
const R = 1560;
const MID = 900;
const DOOR_L = 820;
const DOOR_R = 980;

// ── Hall I: the breathing lungs ──────────────────────────────────────

const BREATH_PERIOD = 3600;
const BREATH_ON = 1200;
/** Each lung exhales across its band from its own wall; `gap` is the clear stretch at the far side. */
interface Lung { y: number; face: 1 | -1; off: number; jet: Rect }
const BAND_H = 60;
const LUNGS: Lung[] = [
  { y: 2120, face: 1, off: 0, jet: { x: L, y: 2120, w: 1220 - L, h: BAND_H } },
  { y: 1980, face: -1, off: -1200, jet: { x: 580, y: 1980, w: R - 580, h: BAND_H } },
  { y: 1840, face: 1, off: -2400, jet: { x: L, y: 1840, w: 1220 - L, h: BAND_H } },
];
/** The draughts between the bands — each pulls towards the lung that is drawing next. */
const DRAUGHTS: { rect: Rect; vx: number }[] = [
  { rect: { x: L, y: 2186, w: R - L, h: 50 }, vx: -55 },
  { rect: { x: L, y: 2048, w: R - L, h: 66 }, vx: 55 },
  { rect: { x: L, y: 1908, w: R - L, h: 66 }, vx: -55 },
];

// ── Hall II: the sounding pipes ──────────────────────────────────────

const COL_PERIOD = 2800;
const COL_ON = 900;
const COL_W = 60;
const COL_TOP = 1330;
const COL_BOT = 1630;
const COLUMNS = [360, 540, 720, 1080, 1260, 1440];
const colOffset = (i: number): number => -(i * 350);
const RANK_Y = 1240;
const STOP_W = { x: 290, y: 1292 };
const STOP_E = { x: 1510, y: 1292 };
const FLAG_DIAPASON = 'organ-stop-diapason';
const FLAG_VOX = 'organ-stop-vox';
/** Great pipe trunks standing about the grove (decorative, solid). */
const TRUNKS: { x: number; y: number; r: number }[] = [
  { x: 900, y: 1480, r: 34 }, { x: 630, y: 1560, r: 24 }, { x: 1170, y: 1560, r: 24 }, { x: 450, y: 1420, r: 22 }, { x: 1350, y: 1420, r: 22 },
];

// ── Hall III: the singing rows ───────────────────────────────────────

const ROW_H = 36;
/** Each row of sealed pipes is a wall with one gap; the aisle south of it is washed by song. */
const ROWS: { y: number; gap: [number, number] }[] = [
  { y: 880, gap: [1400, R] },
  { y: 720, gap: [L, 400] },
  { y: 560, gap: [1400, R] },
];
const AISLES: { rect: Rect; vx: number }[] = [
  { rect: { x: L, y: 918, w: R - L, h: 80 }, vx: -55 },
  { rect: { x: L, y: 758, w: R - L, h: 120 }, vx: 55 },
  { rect: { x: L, y: 598, w: R - L, h: 120 }, vx: -55 },
];
const CENSERS: { x: number; y: number; length: number; rad: number; phase: number }[] = [
  { x: 1180, y: 958, length: 34, rad: 1.7, phase: 0 },
  { x: 1060, y: 818, length: 52, rad: 1.3, phase: 0.4 },
  { x: 660, y: 818, length: 52, rad: -1.3, phase: 2.0 },
  { x: 700, y: 658, length: 52, rad: 1.4, phase: 1.1 },
  { x: 1100, y: 658, length: 52, rad: -1.5, phase: 2.6 },
];

// ── Hazards, gates, solids ───────────────────────────────────────────

const hazards: WorldHazard[] = [];
for (const l of LUNGS) hazards.push({ kind: 'jet', rect: l.jet, periodMs: BREATH_PERIOD, onMs: BREATH_ON, offsetMs: l.off, color: 0xe8d0b0 });
for (const d of DRAUGHTS) hazards.push({ kind: 'conveyor', rect: d.rect, vx: d.vx, vy: 0, look: 'current' });
COLUMNS.forEach((x, i) => {
  hazards.push({ kind: 'jet', rect: { x: x - COL_W / 2, y: COL_TOP, w: COL_W, h: COL_BOT - COL_TOP }, periodMs: COL_PERIOD, onMs: COL_ON, offsetMs: colOffset(i), color: 0xc8dcff });
});
for (const a of AISLES) hazards.push({ kind: 'conveyor', rect: a.rect, vx: a.vx, vy: 0, look: 'current' });
for (const c of CENSERS) hazards.push({ kind: 'sweeper', x: c.x, y: c.y, length: c.length, radPerSec: c.rad, phase: c.phase, color: 0xa8d0ff });

const gates: WorldGate[] = [
  { rect: { x: DOOR_L, y: 1680, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'organ-warden-1' }, look: 'bell', label: 'Defeat the Bellows-Master' },
  { rect: { x: DOOR_L, y: RANK_Y, w: DOOR_R - DOOR_L, h: 40 }, open: { all: [{ flag: FLAG_DIAPASON }, { flag: FLAG_VOX }] }, look: 'pipes', label: 'Draw both stops (west and east)' },
  { rect: { x: DOOR_L, y: 1000, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'organ-warden-2' }, look: 'stainedglass', label: 'Defeat the Stopwright' },
  { rect: { x: DOOR_L, y: 300, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'organ-warden-3' }, look: 'curtain', label: 'Defeat the Choirwarden' },
];

const CROSS_WALLS = [2240, 1680, 1000, 300];

const solids: Solid[] = [
  { kind: 'rect', x: 0, y: 0, w: L, h: H },
  { kind: 'rect', x: R, y: 0, w: W - R, h: H },
  { kind: 'rect', x: L, y: 0, w: R - L, h: 40 },
  { kind: 'rect', x: L, y: H - 36, w: R - L, h: 36 },
];
for (const y of CROSS_WALLS) solids.push({ kind: 'rect', x: L, y, w: DOOR_L - L, h: 40 }, { kind: 'rect', x: DOOR_R, y, w: R - DOOR_R, h: 40 });
// The lungs stand against their walls.
for (const l of LUNGS) {
  if (l.face > 0) solids.push({ kind: 'rect', x: L, y: l.y - 6, w: 100, h: BAND_H + 10 });
  else solids.push({ kind: 'rect', x: R - 100, y: l.y - 6, w: 100, h: BAND_H + 10 });
}
// The blowers' wheel on the landing.
solids.push({ kind: 'circle', x: 1380, y: 2400, r: 46 });
// The pipe rank (the stopped wall), its sounding pipes and the trunks.
solids.push({ kind: 'rect', x: L, y: RANK_Y, w: DOOR_L - L, h: 40 }, { kind: 'rect', x: DOOR_R, y: RANK_Y, w: R - DOOR_R, h: 40 });
for (const x of COLUMNS) solids.push({ kind: 'circle', x, y: 1300, r: 28 });
for (const t of TRUNKS) solids.push({ kind: 'circle', x: t.x, y: t.y, r: t.r });
// The Voice Loft rows.
for (const r of ROWS) {
  if (r.gap[0] > L) solids.push({ kind: 'rect', x: L, y: r.y, w: r.gap[0] - L, h: ROW_H });
  if (r.gap[1] < R) solids.push({ kind: 'rect', x: r.gap[1], y: r.y, w: R - r.gap[1], h: ROW_H });
}
// The Console and the organ cases either side of it.
solids.push({ kind: 'rect', x: 740, y: 40, w: 320, h: 92 });
solids.push({ kind: 'rect', x: L, y: 40, w: 170, h: 260 }, { kind: 'rect', x: R - 170, y: 40, w: 170, h: 260 });

// ── Ground ───────────────────────────────────────────────────────────

/** Dark slate flags of the landing, worn hollow where the blowers trudge. */
function landingFloor(g: G, rng: () => number): void {
  flagstones(g, { x: L, y: 2280, w: R - L, h: H - 36 - 2280 }, 52, 0x3a3640, 0x1c1a20, rng);
  g.fillStyle(0x24202a, 0.5); g.fillEllipse(1380, 2400, 170, 120);
  // A runner of red carpet from the door up the middle.
  g.fillStyle(0x5a1418, 1); g.fillRect(MID - 60, 2280, 120, H - 36 - 2280);
  g.fillStyle(0x7a2026, 1); g.fillRect(MID - 54, 2280, 108, H - 36 - 2280);
  g.lineStyle(2, GILT_DARK, 0.9); g.lineBetween(MID - 50, 2280, MID - 50, H - 36); g.lineBetween(MID + 50, 2280, MID + 50, H - 36);
}

/** Bellows Hall: broad windchest planks, scuffed, with the gust bands burned pale in the grain. */
function bellowsFloor(g: G, rng: () => number): void {
  const y0 = 1720, y1 = 2240;
  for (let y = y0; y < y1; y += 22) {
    const c = rng() < 0.5 ? 0x4a3020 : 0x42281a;
    g.fillStyle(c, 1); g.fillRect(L, y, R - L, 21);
    g.fillStyle(dim(c, 0.3), 1); g.fillRect(L, y + 21, R - L, 1);
    for (let x = L + rng() * 200; x < R; x += 160 + rng() * 220) { g.fillStyle(dim(c, 0.4), 1); g.fillRect(x, y, 1.5, 21); }
    for (let i = 0; i < 6; i++) { g.fillStyle(lit(c, 0.12), 0.5); g.fillRect(L + rng() * (R - L), y + 4 + rng() * 12, 30 + rng() * 60, 1); }
  }
  for (const l of LUNGS) {
    // Scorched-pale grain where the breath is strongest, and brass studs at its edge.
    g.fillStyle(0xe8d0b0, 0.07); g.fillRect(l.jet.x, l.jet.y, l.jet.w, l.jet.h);
    for (let x = l.jet.x + 20; x < l.jet.x + l.jet.w; x += 40) {
      g.fillStyle(GILT_DARK, 1); g.fillCircle(x, l.jet.y - 3, 2.5); g.fillCircle(x, l.jet.y + l.jet.h + 3, 2.5);
    }
    // Chalk arrows on the far side: this way round.
    const gx = l.face > 0 ? 1390 : 410;
    g.lineStyle(3, IVORY, 0.35);
    g.lineBetween(gx, l.y + BAND_H - 6, gx, l.y + 8); g.lineBetween(gx - 8, l.y + 16, gx, l.y + 6); g.lineBetween(gx + 8, l.y + 16, gx, l.y + 6);
  }
  // The warden's dais: a round platform of oak with a brass pressure-gauge inlay.
  g.fillStyle(OAK_DARK, 1); g.fillCircle(MID, 1775, 82);
  g.fillStyle(OAK_LIT, 1); g.fillCircle(MID, 1775, 76);
  g.lineStyle(3, GILT, 0.9); g.strokeCircle(MID, 1775, 60);
  for (let k = 0; k <= 10; k++) {
    const a = Math.PI * 0.8 + (k / 10) * Math.PI * 1.4;
    g.lineStyle(2, GILT_LIT, 0.8); g.lineBetween(MID + Math.cos(a) * 50, 1775 + Math.sin(a) * 50, MID + Math.cos(a) * 58, 1775 + Math.sin(a) * 58);
  }
  g.lineStyle(3, WAX_RED, 0.9); g.lineBetween(MID, 1775, MID + Math.cos(-0.4) * 46, 1775 + Math.sin(-0.4) * 46);
}

/** Pipe Forest: the top of the great windchest — slate with brass rails, and a key at each column's foot. */
function forestFloor(g: G, rng: () => number): void {
  groundFill(g, { x: L, y: 1040, w: R - L, h: 640 }, 0x262a34, 0x2e323e, 0x3a4050, rng, 0.8);
  // The windchest's channels: brass rails running north-south between the grooves.
  for (let x = L + 40; x < R; x += 80) { g.fillStyle(GILT_DARK, 0.3); g.fillRect(x, 1290, 3, 380); }
  // The column beds, each a strip of polished pallet-boards; and the key at its foot.
  for (const x of COLUMNS) {
    g.fillStyle(0x1a1c24, 1); g.fillRect(x - COL_W / 2 - 3, COL_TOP, COL_W + 6, COL_BOT - COL_TOP);
    g.fillStyle(0x30364a, 1); g.fillRect(x - COL_W / 2, COL_TOP, COL_W, COL_BOT - COL_TOP);
    for (let y = COL_TOP + 20; y < COL_BOT; y += 30) { g.lineStyle(1, 0x4a5470, 0.7); g.lineBetween(x - COL_W / 2, y, x + COL_W / 2, y); }
    g.fillStyle(EBONY, 1); g.fillRect(x - COL_W / 2 - 4, COL_BOT, COL_W + 8, 30);
    g.fillStyle(IVORY, 1); g.fillRect(x - COL_W / 2, COL_BOT + 2, COL_W, 24);
    g.fillStyle(0xc8c0a8, 1); g.fillRect(x - COL_W / 2, COL_BOT + 22, COL_W, 4);
  }
  // The north lawn under the rank: parquet laid as a stave, five gilt lines across it.
  g.fillStyle(0x2a1c14, 1); g.fillRect(L, 1040, R - L, RANK_Y - 1040);
  for (let y = 1040; y < RANK_Y; y += 16) for (let x = L + ((y / 16) % 2) * 16; x < R; x += 32) { g.fillStyle(rng() < 0.5 ? 0x3a2618 : 0x34221a, 1); g.fillRect(x, y, 30, 15); }
  staveLines(g, L + 40, 1090, R - L - 80, 22, GILT_DARK, 0.65, 2);
  trebleClef(g, L + 90, 1134, 1.4, GILT, 0.7, 2.4);
  // Candles round the lawn's edge.
  for (let x = L + 60; x < R; x += 140) { g.fillStyle(CANDLE, 0.05); g.fillCircle(x, 1210, 40); }
}

/** Voice Loft: red runners down each aisle with a stave woven into them, slate between. */
function loftFloor(g: G, rng: () => number): void {
  groundFill(g, { x: L, y: 340, w: R - L, h: 660 }, 0x22202a, 0x2a2632, 0x34303e, rng, 0.6);
  for (const a of AISLES) {
    const r = a.rect;
    g.fillStyle(0x4a1016, 1); g.fillRect(r.x, r.y + 6, r.w, r.h - 12);
    g.fillStyle(0x6a181e, 1); g.fillRect(r.x, r.y + 10, r.w, r.h - 20);
    staveLines(g, r.x, r.y + r.h / 2 - 16, r.w, 8, GILT_DARK, 0.5, 1);
    // Notes woven in, running the way the song washes.
    for (let x = r.x + 40; x < r.x + r.w; x += 90) noteHead(g, x, r.y + r.h / 2 - 16 + ((x / 90) % 5) * 8, 0.9, GILT_DARK, 0.6, 1);
  }
  // The choirwarden's floor: a great compass rose of inlaid marble.
  const cx = MID, cy = 450;
  g.fillStyle(0x1a1820, 1); g.fillCircle(cx, cy, 104);
  for (let k = 0; k < 16; k++) {
    const a0 = (k / 16) * Math.PI * 2, a1 = ((k + 1) / 16) * Math.PI * 2;
    g.fillStyle(k % 2 ? 0xd8d0c0 : 0x3a3448, 1);
    g.slice(cx, cy, 98, a0, a1, false); g.fillPath();
  }
  g.fillStyle(0x1a1820, 1); g.fillCircle(cx, cy, 40);
  g.lineStyle(3, GILT, 0.9); g.strokeCircle(cx, cy, 98);
  cadenzaSigil(g, cx, cy, 34, GILT, 0.8);
}

/** The Console's floor: a chequer of black and white marble, the pedalboard laid into it. */
function consoleFloor(g: G): void {
  const S = 40;
  for (let y = 40; y < 300; y += S) for (let x = L; x < R; x += S) {
    const k = ((x - L) / S + (y - 40) / S) % 2;
    g.fillStyle(k ? 0xe8e0d0 : 0x18141c, 1); g.fillRect(x, y, S, S);
    g.fillStyle(k ? 0xffffff : 0x2a2430, 0.35); g.fillRect(x + 2, y + 2, S - 4, 3);
  }
  // The pedalboard: long oak pedals fanned under the bench.
  for (let i = 0; i < 13; i++) {
    const x = 760 + i * 22;
    g.fillStyle(i % 2 ? EBONY : OAK_LIT, 1); g.fillRect(x, 150, 16, 46);
    g.fillStyle(i % 2 ? 0x3a3440 : 0x7a5434, 1); g.fillRect(x, 150, 16, 4);
  }
  g.fillStyle(0x2a1012, 1); g.fillRect(MID - 70, 200, 140, 100);
  g.fillStyle(0x6a1820, 1); g.fillRect(MID - 64, 200, 128, 100);
}

/** The walls of the instrument: black oak casework the whole height, gilt-banded. */
function caseWalls(g: G): void {
  for (const [x0, x1] of [[0, L], [R, W]] as const) {
    g.fillStyle(OAK_DARK, 1); g.fillRect(x0, 0, x1 - x0, H);
    for (let y = 40; y < H - 40; y += 160) casePanel(g, x0 + 20, y, x1 - x0 - 40, 140);
    g.fillStyle(GILT_DARK, 1); g.fillRect(x0 === 0 ? L - 8 : R, 0, 8, H);
    g.fillStyle(GILT, 1); g.fillRect(x0 === 0 ? L - 6 : R + 2, 0, 3, H);
  }
  g.fillStyle(OAK_DARK, 1); g.fillRect(L, 0, R - L, 40); g.fillRect(L, H - 36, R - L, 36);
  for (const y of CROSS_WALLS) {
    for (const [x0, x1] of [[L, DOOR_L], [DOOR_R, R]] as const) {
      g.fillStyle(OAK_DARK, 1); g.fillRect(x0, y, x1 - x0, 40);
      g.fillStyle(OAK, 1); g.fillRect(x0, y + 4, x1 - x0, 26);
      g.fillStyle(GILT, 0.8); g.fillRect(x0, y + 30, x1 - x0, 3);
      for (let x = x0 + 30; x < x1 - 20; x += 60) { g.fillStyle(GILT_DARK, 1); g.fillRect(x, y + 8, 3, 18); }
    }
    // The doorway's threshold, worn brass.
    g.fillStyle(GILT_DARK, 0.9); g.fillRect(DOOR_L, y + 14, DOOR_R - DOOR_L, 10);
  }
}

function paintGround(g: G, rng: () => number): void {
  g.fillStyle(0x0c0a10, 1); g.fillRect(0, 0, W, H);
  landingFloor(g, rng);
  bellowsFloor(g, rng);
  forestFloor(g, rng);
  loftFloor(g, rng);
  consoleFloor(g);
  caseWalls(g);
  // The bellows door at the foot: an arch of gilt in the south wall.
  g.fillStyle(0x060408, 1); g.fillRect(MID - 70, H - 40, 140, 40);
  g.lineStyle(4, GILT, 1); g.strokeRect(MID - 70, H - 40, 140, 40);
}

// ── Pieces ───────────────────────────────────────────────────────────

/** The blowers' treadwheel: a great spoked oak wheel the muted walk round to fill the lungs. */
function blowersWheel(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 120, 32);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 54, y - 14, 108, 14);
  g.fillStyle(OAK, 1); g.fillRect(x - 50, y - 12, 100, 8);
  const cy = y - 70;
  g.lineStyle(10, OAK_DARK, 1); g.strokeCircle(x, cy, 58);
  g.lineStyle(6, OAK_LIT, 1); g.strokeCircle(x, cy, 58);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    g.lineStyle(4, OAK, 1); g.lineBetween(x, cy, x + Math.cos(a) * 56, cy + Math.sin(a) * 56);
    g.fillStyle(GILT_DARK, 1); g.fillCircle(x + Math.cos(a) * 58, cy + Math.sin(a) * 58, 3);
  }
  g.fillStyle(GILT, 1); g.fillCircle(x, cy, 10);
  g.fillStyle(GILT_LIT, 1); g.fillCircle(x - 3, cy - 3, 3);
  // The trunk carrying the wind away north, up the wall.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x + 60, y - 150, 26, 150);
  g.fillStyle(OAK, 1); g.fillRect(x + 63, y - 150, 20, 150);
  for (let yy = y - 140; yy < y; yy += 30) { g.fillStyle(GILT_DARK, 1); g.fillRect(x + 60, yy, 26, 3); }
}

/** A sounding pipe of the forest, with its windchest boot and a gilt mouth band. */
function grovePipe(g: G, x: number, y: number, h: number): void {
  shadow(g, x, y + 2, 76, 22);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 32, y - 18, 64, 18);
  g.fillStyle(OAK, 1); g.fillRect(x - 30, y - 16, 60, 8);
  organPipe(g, x, y - 14, 46, h, { metal: SILVER });
  g.fillStyle(GILT, 0.8); g.fillRect(x - 23, y - 14 - h * 0.55, 46, 4);
}

/** A great trunk pipe: wider, older, tarnished, with a ladder of brass rungs up it. */
function trunkPipe(g: G, x: number, y: number, r: number): void {
  shadow(g, x, y + 2, r * 2.6, r * 0.8);
  organPipe(g, x, y, r * 1.9, 260 + r * 3, { metal: mixC(SILVER, 0x9aa0a8, 0.4) });
  for (let yy = y - 60; yy > y - 220; yy -= 22) { g.fillStyle(GILT_DARK, 1); g.fillRect(x + r * 0.95 - 2, yy, 6, 3); }
}

/** The stopped rank: a wall of short capped pipes shoulder to shoulder, from x0 to x1. */
function stoppedRank(g: G, x0: number, x1: number, y: number, rng: () => number): void {
  g.fillStyle(OAK_DARK, 1); g.fillRect(x0, y - 20, x1 - x0, 20);
  g.fillStyle(OAK, 1); g.fillRect(x0, y - 18, x1 - x0, 10);
  for (let x = x0 + 14; x < x1 - 8; x += 26) {
    const h = 90 + Math.sin(x * 0.05) * 30 + rng() * 10;
    organPipe(g, x, y - 16, 20, h, { metal: SILVER_DARK });
    // A stopper cap — these pipes are stopped.
    g.fillStyle(OAK_DARK, 1); g.fillRect(x - 11, y - 16 - h - 6, 22, 8);
    g.fillStyle(GILT_DARK, 1); g.fillRect(x - 3, y - 16 - h - 12, 6, 6);
  }
}

/** A stop jamb beside a lever: a little oak cabinet studded with drawstop knobs. */
function stopJamb(g: G, x: number, y: number, label: number): void {
  shadow(g, x, y + 2, 70, 16);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 30, y - 70, 60, 70);
  g.fillStyle(OAK, 1); g.fillRect(x - 27, y - 67, 54, 64);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) stopKnob(g, x - 12 + j * 24, y - 50 + i * 18, 0.7, false, (i + j) % 3);
  stopKnob(g, x, y - 76, 1.2, false, label);
}

/**
 * A row of sealed pipes along the top of a Voice Loft row-wall — each pipe ribboned. `freed`
 * draws them after the Maestro falls: the ribbons gone, the seals broken, the mouths dark.
 */
function sealedRow(g: G, x0: number, x1: number, y: number, freed: boolean, rng: () => number): void {
  g.fillStyle(OAK_DARK, 1); g.fillRect(x0, y - ROW_H - 4, x1 - x0, ROW_H + 4);
  g.fillStyle(OAK, 1); g.fillRect(x0, y - ROW_H, x1 - x0, ROW_H - 8);
  g.fillStyle(GILT, 0.8); g.fillRect(x0, y - 8, x1 - x0, 3);
  for (let x = x0 + 20; x < x1 - 10; x += 34) {
    const h = 110 + Math.sin(x * 0.021) * 40 + rng() * 14;
    organPipe(g, x, y - ROW_H + 4, 24, h, { metal: SILVER, sealed: !freed });
    if (freed) {
      // The ribbon cut and hanging loose; the broken seal on the plinth.
      g.fillStyle(RIBBON, 0.9); g.fillRect(x + 8, y - ROW_H - h * 0.45, 3, h * 0.35);
      g.fillStyle(WAX_RED, 1); g.fillCircle(x - 6, y - ROW_H - 2, 2.5); g.fillCircle(x - 2, y - ROW_H - 1, 2);
    }
  }
}

/** The Console under the Rose of Pipes: four manuals in a gilt case, stop jambs either side, the bench. */
function console_(g: G, x: number, y: number, rng: () => number): void {
  // The Rose of Pipes: a great fan of pipes rising behind, the longest in the middle.
  for (let i = -9; i <= 9; i++) {
    const a = -Math.PI / 2 + i * 0.13;
    const len = 210 - Math.abs(i) * 9;
    const bx = x + i * 16, by = y - 96;
    const tx = bx + Math.cos(a) * len, ty = by + Math.sin(a) * len;
    g.lineStyle(14, SILVER_DEEP, 1); g.lineBetween(bx, by, tx, ty);
    g.lineStyle(11, i % 2 ? SILVER : SILVER_DARK, 1); g.lineBetween(bx, by, tx, ty);
    g.lineStyle(2, SILVER_LIT, 0.7); g.lineBetween(bx - 3, by, tx - 3, ty);
    g.fillStyle(SILVER_DEEP, 1); g.fillCircle(tx, ty, 6);
  }
  // A rose window in the middle of the fan.
  const rx = x, ry = y - 230;
  const panes = [ROSE_RED, ROSE_BLUE, ROSE_GOLD, VIOLET];
  for (let k = 0; k < 12; k++) {
    g.fillStyle(panes[k % 4], 0.85);
    g.slice(rx, ry, 46, (k / 12) * Math.PI * 2, ((k + 1) / 12) * Math.PI * 2, false); g.fillPath();
  }
  g.lineStyle(3, EBONY, 1); for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.lineBetween(rx, ry, rx + Math.cos(a) * 46, ry + Math.sin(a) * 46); }
  g.strokeCircle(rx, ry, 46); g.strokeCircle(rx, ry, 18);
  g.fillStyle(GILT, 1); g.fillCircle(rx, ry, 14);
  cadenzaSigil(g, rx, ry, 12, EBONY, 1);
  // The case.
  shadow(g, x, y + 6, 360, 40);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 160, y - 110, 320, 110);
  g.fillStyle(OAK, 1); g.fillRect(x - 154, y - 104, 308, 100);
  g.fillStyle(GILT, 1); g.fillRect(x - 160, y - 114, 320, 6);
  for (let i = 0; i < 4; i++) manual(g, x - 120, y - 82 + i * 18, 8, 30, 14, (k) => (rng() < 0.08 ? 0.6 : 0) * (k % 2));
  for (const sx of [x - 145, x + 133]) for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) stopKnob(g, sx + j * 12, y - 86 + i * 16, 0.55, (i + j) % 3 === 0, (i * 2 + j) % 3);
  // The bench, and his score open on the music desk.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 70, y + 4, 140, 14);
  g.fillStyle(IVORY, 1); g.fillRect(x - 54, y - 140, 50, 30); g.fillRect(x + 4, y - 140, 50, 30);
  staveLines(g, x - 50, y - 134, 42, 4, INK_LINE, 0.8, 0.8); staveLines(g, x + 8, y - 134, 42, 4, INK_LINE, 0.8, 0.8);
  candle(g, x - 70, y - 112, 1, 0, false);
  candle(g, x + 70, y - 112, 1, 0, false);
}
const INK_LINE = 0x2a2030;

/** A candle-tree: a tall iron stand of candles, glow drawn in `animate`. */
function candleTree(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 40, 12);
  g.fillStyle(0x2a2a30, 1); g.fillRect(x - 2, y - 80, 4, 80);
  g.fillStyle(0x2a2a30, 1); g.fillTriangle(x - 14, y, x + 14, y, x, y - 10);
  for (const [dx, dy] of [[-14, -60], [14, -60], [0, -80], [-8, -40], [8, -40]] as const) {
    g.lineStyle(2, 0x3a3a40, 1); g.lineBetween(x, y - 50, x + dx, y + dy + 4);
    candle(g, x + dx, y + dy + 4, 0.7, 0, false);
  }
}

const pieces: NonNullable<AreaDef['painter']['pieces']> = [];
pieces.push({ x: 1380, y: 2410, w: 200, h: 220, draw: (g) => blowersWheel(g, 1380, 2410) });
for (const [x, y] of [[420, 2330], [1120, 2330], [420, 2520], [1500, 2520]] as const) pieces.push({ x, y, w: 50, h: 100, draw: (g) => candleTree(g, x, y) });
COLUMNS.forEach((x) => pieces.push({ x, y: 1310, w: 90, h: 340, draw: (g) => grovePipe(g, x, 1310, 300) }));
for (const t of TRUNKS) pieces.push({ x: t.x, y: t.y + t.r * 0.6, w: t.r * 3, h: 400, draw: (g) => trunkPipe(g, t.x, t.y + t.r * 0.6, t.r) });
pieces.push({ x: (L + DOOR_L) / 2, y: RANK_Y + 40, w: DOOR_L - L, h: 180, draw: (g, rng) => stoppedRank(g, L, DOOR_L, RANK_Y + 40, rng) });
pieces.push({ x: (DOOR_R + R) / 2, y: RANK_Y + 40, w: R - DOOR_R, h: 180, draw: (g, rng) => stoppedRank(g, DOOR_R, R, RANK_Y + 40, rng) });
pieces.push({ x: STOP_W.x + 2, y: RANK_Y + 2, w: 80, h: 100, draw: (g) => stopJamb(g, STOP_W.x + 2, RANK_Y + 2, 0) });
pieces.push({ x: STOP_E.x - 2, y: RANK_Y + 2, w: 80, h: 100, draw: (g) => stopJamb(g, STOP_E.x - 2, RANK_Y + 2, 1) });
for (const r of ROWS) {
  const segs: [number, number][] = [];
  if (r.gap[0] > L) segs.push([L, r.gap[0]]);
  if (r.gap[1] < R) segs.push([r.gap[1], R]);
  for (const [a, b] of segs) {
    pieces.push({ x: (a + b) / 2, y: r.y + ROW_H, w: b - a, h: 220, when: { not: { monarch: 'cadenza' } }, draw: (g, rng) => sealedRow(g, a, b, r.y + ROW_H, false, rng) });
    pieces.push({ x: (a + b) / 2, y: r.y + ROW_H, w: b - a, h: 220, when: { monarch: 'cadenza' }, draw: (g, rng) => sealedRow(g, a, b, r.y + ROW_H, true, rng) });
  }
}
pieces.push({ x: MID, y: 132, w: 380, h: 340, draw: (g, rng) => console_(g, MID, 132, rng) });
for (const [x, y] of [[560, 280], [1240, 280], [520, 520], [1280, 520]] as const) pieces.push({ x, y, w: 50, h: 100, draw: (g) => candleTree(g, x, y) });

// ── Animation ────────────────────────────────────────────────────────

const inView = (v: Rect, x: number, y: number, pad = 260): boolean => x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;
const phaseOf = (now: number, off: number, period: number): number => (((now + off) % period) + period) % period;

function animateUnder(g: G, t: number, view: Rect, world: { test(c: Cond): boolean }): void {
  const now = t * 1000;
  // Hall I: the lungs breathe. Full as they exhale, emptying across the gust; filling between.
  for (const l of LUNGS) {
    const bx = l.face > 0 ? L + 50 : R - 50;
    const by = l.y + BAND_H + 4;
    if (!inView(view, bx, by)) continue;
    const ph = phaseOf(now, l.off, BREATH_PERIOD);
    const breath = ph < BREATH_ON ? 1 - (ph / BREATH_ON) * 0.8 : 0.2 + ((ph - BREATH_ON) / (BREATH_PERIOD - BREATH_ON)) * 0.8;
    bellows(g, bx, by, 96, 110, breath, l.face);
    if (ph < BREATH_ON) {
      // The gust: long pale streaks blown out of the nozzle across the band.
      const k = ph / BREATH_ON;
      for (let i = 0; i < 9; i++) {
        const sx = l.jet.x + ((i * 173 + now * 0.9) % l.jet.w);
        const sy = l.y + 8 + ((i * 37) % (BAND_H - 16));
        g.lineStyle(2, IVORY, 0.35 * (1 - k * 0.5)); g.lineBetween(sx, sy, sx + l.face * 60, sy + Math.sin(now / 90 + i) * 3);
      }
    } else if (ph > BREATH_PERIOD - 700) {
      // About to blow: the nozzle glows.
      const nx = bx + l.face * 82;
      glow(g, nx, by - 54, 26, 0xffd8a0, 0.12, 3);
    }
  }
  // The draughts: dust and lint dragged sideways towards the drawing lung.
  for (const d of DRAUGHTS) {
    if (!inView(view, MID, d.rect.y)) continue;
    for (let i = 0; i < 14; i++) {
      const span = d.rect.w;
      const x = d.rect.x + ((((i * 211 + now * d.vx * 0.003 * 60) % span) + span) % span);
      const y = d.rect.y + 6 + ((i * 29) % (d.rect.h - 12));
      g.fillStyle(IVORY, 0.25); g.fillRect(x, y, 6, 1.5);
    }
  }
  // Hall II: each key lights before its pipe speaks; the column shimmers with rising rings.
  COLUMNS.forEach((x, i) => {
    if (!inView(view, x, 1480)) return;
    const ph = phaseOf(now, colOffset(i), COL_PERIOD);
    const on = ph < COL_ON;
    const warn = !on && ph > COL_PERIOD - 900;
    if (warn || on) {
      const k = on ? 1 : (ph - (COL_PERIOD - 900)) / 900;
      g.fillStyle(CANDLE, 0.35 + k * 0.5); g.fillRect(x - COL_W / 2, COL_BOT + 2 + (on ? 2 : 0), COL_W, 24 - (on ? 2 : 0));
      glow(g, x, COL_BOT + 14, 40, CANDLE, 0.06 + k * 0.06, 3);
    }
    if (on) {
      for (let j = 0; j < 5; j++) {
        const yy = COL_BOT - ((ph * 0.5 + j * 60) % (COL_BOT - COL_TOP));
        g.lineStyle(2, SILVER_LIT, 0.6); g.strokeEllipse(x, yy, COL_W - 6, 12);
      }
      glow(g, x, 1290, 30, 0xc8dcff, 0.08, 3);
    }
  });
  // Hall III: the ghost mouths sing along every row, the song washing the way the aisle pulls.
  if (!world.test({ monarch: 'cadenza' })) {
    ROWS.forEach((r, ri) => {
      if (!inView(view, MID, r.y, 300)) return;
      const dir = AISLES[ri] ? Math.sign(AISLES[ri].vx) : 1;
      for (let x = L + 20; x < R - 10; x += 34) {
        if (x >= r.gap[0] && x <= r.gap[1]) continue;
        if (!inView(view, x, r.y, 60)) continue;
        const open = Math.max(0, Math.sin(t * 2.4 + dir * x * 0.012));
        ghostMouth(g, x, r.y + ROW_H - 18, 0.55, open, 0.5 + open * 0.5);
        if (open > 0.8) noteHead(g, x + dir * (8 + (t * 40) % 30), r.y + ROW_H - 40 - ((t * 30) % 30), 0.6, GHOST, 0.6 * open, 1);
      }
    });
  }
  // Candle flames on the stands.
  for (const [x, y] of [[420, 2330], [1120, 2330], [420, 2520], [1500, 2520], [560, 280], [1240, 280], [520, 520], [1280, 520]] as const) {
    if (!inView(view, x, y)) continue;
    for (const [dx, dy] of [[-14, -60], [14, -60], [0, -80], [-8, -40], [8, -40]] as const) {
      const f = Math.sin(t * 12 + x + dx) * 0.6;
      const fx = x + dx, fy = y + dy - 13;
      g.fillStyle(CANDLE, 0.12); g.fillCircle(fx, fy, 7);
      g.fillStyle(CANDLE, 0.95); g.fillEllipse(fx + f * 0.4, fy, 3, 7);
    }
  }
  // The stop knobs glow while they wait to be drawn.
  for (const [p, flag] of [[STOP_W, FLAG_DIAPASON], [STOP_E, FLAG_VOX]] as const) {
    if (!inView(view, p.x, p.y)) continue;
    const drawn = world.test({ monarch: 'cadenza' }) || world.test({ flag });
    if (!drawn) glow(g, p.x, p.y - 84, 18 + Math.sin(t * 4) * 3, GILT_LIT, 0.1, 3);
  }
  // The rose window over the Console breathes coloured light on the chequer.
  if (inView(view, MID, 200)) {
    const cols = [ROSE_RED, ROSE_BLUE, ROSE_GOLD, VIOLET];
    for (let k = 0; k < 4; k++) {
      const a = t * 0.15 + k * 1.57;
      g.fillStyle(cols[k], 0.07); g.fillEllipse(MID + Math.cos(a) * 160, 230 + Math.sin(a) * 30, 180, 60);
    }
  }
}

function animateOver(g: G, t: number, view: Rect): void {
  // Dust in the light, and loose notes drifting up through the instrument on the wind.
  motes(g, view, t, 22, 0xe8dcc0, -8, 10, 1.4, 31);
  for (let i = 0; i < 7; i++) {
    const x = view.x + ((i * 397 + t * 18) % view.w);
    const y = view.y + view.h - ((t * 30 + i * 211) % (view.h + 40));
    noteHead(g, x + Math.sin(t + i) * 10, y, 0.8, i % 2 ? GILT_LIT : SILVER_LIT, 0.18, i % 2 ? 1 : -1, i % 3 === 0);
  }
}

// ── People ───────────────────────────────────────────────────────────

const MUTED_RIBBON = ['scarf'] as const;

const NPCS: NpcDef[] = [
  {
    id: 'organ-tibbet', name: 'Tibbet Pump', title: 'organ-blower, muted at nine',
    look: { body: 0xd8b898, accent: 0x5a3a2a, hat: 'cap', traits: [...MUTED_RIBBON, 'apron'], size: 0.8, eye: 0x8ac8ff },
    at: { x: 1200, y: 2410 }, wander: 40,
    talks: [
      { when: { monarch: 'cadenza' }, lines: [
        '*He signs a whole sentence, then stops, opens his mouth — and a small cracked voice comes out.* ...Oh.',
        'That is me. That is what I sound like. I was nine. I sound like I was nine.',
        'We are not walking the wheel tonight. Nobody is. Let the old lungs lie flat for once.',
      ] },
      { when: { encounter: 'organ-warden-1' }, lines: [
        '*He mimes a man puffing himself up like a bellows — then pops, and sags, and grins at you.*',
        '*He points up the hall to the pipes, wiggles his fingers like keys, then mimes stepping back fast.*',
      ] },
      { lines: [
        '*A boy in a blower\'s cap, a white ribbon at his throat. He points at the wheel, then at his own feet.*',
        '*He walks two fingers round and round on his palm — the wheel — then blows into his cupped hands.*',
        '*He points north: three lungs, breathing. He shows you: go where the wind is NOT. Then wait. Then go.*',
        '*He taps his ribbon, then points up, far up, to where the Organ is singing. He shrugs. He smiles anyway.*',
      ] },
    ],
    barks: [
      { when: { monarch: 'cadenza' }, lines: ['La. La-la. ...La!'] },
      { lines: ['*He counts the breaths on his fingers: one... two... three.*'] },
    ],
  },
  {
    id: 'organ-agathe', name: 'Agathe Lowe', title: 'a Tuner who would not tune',
    look: { body: 0x2a2a34, accent: 0xc8d0dc, hat: 'hood', traits: ['tool', 'glasses'], size: 1.0, eye: 0xd8e8ff },
    at: { x: 1505, y: 1600 }, wander: 20,
    talks: [
      { when: { monarch: 'cadenza' }, lines: [
        'I have the tuning-iron that sealed four hundred pipes. Tonight I opened forty with it. My wrist aches.',
        'Every voice that comes out says the same first word. Not a name. Not a curse. Just: "Where?"',
      ] },
      { when: { encounter: 'organ-warden-2' }, lines: [
        'Ignatia let you through? Then the stops are yours. She never let me draw one in twenty years.',
        'Above is the Loft. Every ribbon up there I tied myself. ...Mind the singing. It is not their fault.',
      ] },
      { when: { all: [{ flag: FLAG_DIAPASON }, { flag: FLAG_VOX }] }, lines: [
        'Both stops drawn. The rank will speak for you now. Listen — that is the Open Diapason. That is honest.',
      ] },
      { lines: [
        '*whispering* Not so loud. The pipes listen. I should know. I tuned them.',
        'I am a Tuner. Was. They sent me up to take a choirboy\'s voice. I looked at him and could not.',
        'So I hid in here, where the noise covers me. Each pipe speaks when its key lights. Watch the keys.',
        'The rank north is stopped. Draw the Diapason at the west end and the Vox Humana at the east.',
      ] },
    ],
    barks: [
      { lines: ['*She mutters along with the pipes, a semitone flat, on purpose.*', 'Middle C. Middle C. Always middle C.'] },
    ],
  },
  {
    id: 'organ-hob', name: 'Hob Clavering', title: 'keeper of the Voice Loft ribbons',
    look: { body: 0x9a8a7a, accent: 0xfaf8f2, hat: 'nightcap', traits: [...MUTED_RIBBON, 'beard', 'cane'], size: 1.05, eye: 0xa8c8e8 },
    at: { x: 1300, y: 430 }, wander: 30,
    talks: [
      { when: { monarch: 'cadenza' }, lines: [
        '*He holds up a ribbon — his own — and lets it go. It floats down. Then, hoarse:* Forty years. Forty.',
        'My wife is in the third row, ninth pipe. I always knew which. I am going to go and let her out myself.',
      ] },
      { when: { encounter: 'organ-warden-3' }, lines: [
        '*He points at the curtain, then draws a baton in the air — the 1-2-3-4 of a bar — and makes a fist.*',
        '*He signs: four movements. When the pipes ring him round at the end — strike them. They want out.*',
      ] },
      { lines: [
        '*An old man with a white ribbon and a white beard. He keeps the ribbons. He keeps them very neat.*',
        '*He points along the rows: the song washes down the aisles. He leans against the push and walks.*',
        '*He mimes a censer swinging, ducks under it, comes up smiling.*',
        '*He taps a pipe in the third row, very gently, as if knocking on a door. Then he will not look at you.*',
      ] },
    ],
    barks: [
      { lines: ['*He straightens a ribbon that did not need straightening.*'] },
    ],
  },
];

// ── POIs ─────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  { kind: 'door', at: { x: MID, y: 2530 }, to: 'cathedral', arrive: { x: 1200, y: 260 }, label: 'The Cathedral' },
  { kind: 'waystone', at: { x: 660, y: 2430 } },
  { kind: 'sign', at: { x: 1080, y: 2480 }, text: 'THE GREAT ORGAN. Blowers to the wheel. Silence in the instrument. By order of the Maestro.' },
  { kind: 'encounter', id: 'organ-warden-1' },
  { kind: 'chest', id: 'organ-chest-valve', at: { x: 1480, y: 1770 }, item: 'charm-bellows-valve' },
  { kind: 'lever', at: STOP_W, flag: FLAG_DIAPASON, label: 'Draw the Open Diapason' },
  { kind: 'lever', at: STOP_E, flag: FLAG_VOX, label: 'Draw the Vox Humana' },
  { kind: 'sign', at: { x: 900, y: 1640 }, text: 'When the key lights, the pipe speaks. Stand off the pallet.' },
  { kind: 'chest', id: 'organ-chest-forest', at: { x: 300, y: 1600 }, coins: 160, orbs: 4 },
  { kind: 'encounter', id: 'organ-warden-2' },
  { kind: 'encounter', id: 'organ-warden-3' },
  { kind: 'chest', id: 'organ-chest-loft', at: { x: 360, y: 430 }, item: 'charm-vox-humana' },
  { kind: 'monarch', id: 'cadenza', at: { x: MID, y: 210 } },
];

export const ORGAN_AREA: AreaDef = {
  id: 'organ',
  isle: 'sound',
  name: 'The Great Organ',
  subtitle: 'Maestro Cadenza\'s instrument, built into the mountain behind the cathedral',
  w: W,
  h: H,
  bg: 0x0a080c,
  accent: GILT,
  weather: 'notes',
  spawn: { x: MID, y: 2440 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver },
  solids,
  exits: [],
  pois: POIS,
  npcs: NPCS,
  gloom: 0.24,
  hazards,
  gates,
  checkpoints: [
    { x: MID, y: 2440 },   // the blowers' landing
    { x: MID, y: 2212 },   // the bellows door
    { x: 1390, y: 2150 },  // past the first lung
    { x: MID, y: 2080 },   // the first draught
    { x: 410, y: 2010 },   // past the second lung
    { x: MID, y: 1940 },   // the second draught
    { x: 1390, y: 1870 },  // past the third lung
    { x: MID, y: 1775 },   // Wynd's dais
    { x: MID, y: 1650 },   // the forest's edge
    { x: 300, y: 1360 },   // the Diapason stop
    { x: 1500, y: 1360 },  // the Vox Humana stop
    { x: MID, y: 1320 },   // before the rank
    { x: MID, y: 1150 },   // Rank's lawn
    { x: MID, y: 960 },    // the loft door
    { x: 1480, y: 898 },   // the first row's gap
    { x: 1480, y: 818 },   // the second aisle
    { x: 320, y: 738 },    // the second row's gap
    { x: 320, y: 658 },    // the third aisle
    { x: 1480, y: 578 },   // the third row's gap
    { x: MID, y: 450 },    // the compass rose
    { x: MID, y: 262 },    // under the Rose of Pipes
  ],
};
