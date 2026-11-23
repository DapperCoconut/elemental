import type { AreaDef, NpcDef, Poi, PainterWorld, Pt, Rect, Solid, WorldGate, WorldHazard } from '../../../../IslesTypes';
import { type G, glow, mixC, shadow } from '../../../../art/IsleArt';
import {
  BRASS, BRASS_DARK, GOLD, GOLD_DARK, GOLD_LIT, IRON, IRON_BLUE, IRON_LIT, MARBLE, MARBLE_SHADE, MARBLE_VEIN, MIRROR,
  MIRROR_DARK, RIVET, SCORCH, SKY, SUN, SUN_HOT,
  beam, caustics, chainLink, cog, girder, lens, lightShaft, mirrorPane, scorch, standingMirror, sunDisc, sunburst,
} from './art';

/**
 * The Heliostat — Despot Auriel's crown of tilting mirrors on the summit of Solmara, the machine
 * that has held the sun straight overhead for twenty-two years. You climb it from its foot (south)
 * to the Crown (north), through the three halls that keep the sun pinned:
 *
 *   The Foot      — (y 2280–2564) marble landing, a waystone, the stair back down to the Tribunal.
 *   Hall I        — The Lens Gallery (y 1720–2240): great lenses run on brass rails overhead, each
 *                   focusing a burning spot that walks the floor in its own pattern — a long rail
 *                   that runs there-and-back, two lenses circling the pedestals, a pendulum in the
 *                   middle aisle, and a fast rail in front of the warden that only runs one way.
 *                   Warden: Focal-Warden Corisande Brule.
 *   Hall II       — The Mirror Maze (y 1080–1680): a beam of sun comes in through a port in the west
 *                   wall and bounces between the great mirrors. Turn Mirror I and it leaves the
 *                   south walk and climbs the wall to Mirror II; turn Mirror II and it goes up the
 *                   shaft to the Chain. Warden: Glass-Warden Isembard Silvering.
 *   Hall III      — The Sun Chain (y 380–1040): a gear-tower beside the giant cogs and the chain that
 *                   holds the sun. The cogs' long teeth sweep the catwalks and the chain itself
 *                   grinds across the middle of the hall, dragging you east toward the teeth.
 *                   Warden: Ratchet-Warden Maud Pawlesby.
 *   The Crown     — (y 40–340): the Crown of Mirrors, under the pinned sun. Auriel.
 *
 * There is no health out here: a burn throws you back to the last checkpoint.
 */

const W = 1800;
const H = 2600;
const L = 240;
const R = 1560;
const DOOR_L = 820;
const DOOR_R = 980;
const MID = 900;
const TAU = Math.PI * 2;

// ── Hall I: the walking spots ────────────────────────────────────────

/**
 * One lens on one rail. Its focus visits `cells` in `seq` order, one step every `step` ms, lit for
 * `on` ms each; `spots` lenses share the rail, spaced evenly round its circuit.
 */
interface Rail { cells: Rect[]; seq: number[]; step: number; spots: number; on: number; phase: number; kind: 'line' | 'ring' }

const cellRow = (y: number, h: number, x0: number, n: number, w: number): Rect[] =>
  Array.from({ length: n }, (_, i) => ({ x: x0 + i * w, y, w, h }));
const pingPong = (n: number): number[] => [...Array.from({ length: n }, (_, i) => i), ...Array.from({ length: n - 2 }, (_, i) => n - 2 - i)];

/** A ring of eight cells round a pedestal cell (the pedestal itself is solid). */
const ringCells = (cx: number, cy: number, cw: number, ch: number): Rect[] => {
  const order: [number, number][] = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
  return order.map(([c, r]) => ({ x: cx - cw / 2 + c * cw, y: cy - ch / 2 + r * ch, w: cw, h: ch }));
};

const ROW_A_Y = 2140;
const ROW_D_Y = 1805;
const RING_W = { x: 575, y: 1960 };
const RING_E = { x: 1225, y: 1960 };
const RING_CW = 100;
const RING_CH = 70;
const PENDULUM_Y = 1925;

const RAILS: Rail[] = [
  // The Long Lens: twelve cells wall to wall, there and back, two lenses chasing.
  { cells: cellRow(ROW_A_Y, 60, L, 12, 110), seq: pingPong(12), step: 230, spots: 2, on: 300, phase: 0, kind: 'line' },
  // The west pedestal lens circles clockwise; the east one widdershins.
  { cells: ringCells(RING_W.x, RING_W.y, RING_CW, RING_CH), seq: [0, 1, 2, 3, 4, 5, 6, 7], step: 320, spots: 2, on: 380, phase: 0, kind: 'ring' },
  { cells: ringCells(RING_E.x, RING_E.y, RING_CW, RING_CH), seq: [0, 7, 6, 5, 4, 3, 2, 1], step: 320, spots: 2, on: 380, phase: 160, kind: 'ring' },
  // The pendulum in the middle aisle.
  { cells: cellRow(PENDULUM_Y, 70, 750, 3, 100), seq: [0, 1, 2, 1], step: 420, spots: 1, on: 480, phase: 0, kind: 'line' },
  // The Quick Rail in front of the warden: east to west only, two lenses.
  { cells: cellRow(ROW_D_Y, 60, L, 12, 110), seq: Array.from({ length: 12 }, (_, i) => 11 - i), step: 210, spots: 2, on: 270, phase: 0, kind: 'line' },
];

const hazards: WorldHazard[] = [];
const SPOT_COLOR = 0xfff0b0;
for (const r of RAILS) {
  const P = r.seq.length * r.step;
  r.seq.forEach((ci, j) => {
    for (let k = 0; k < r.spots; k++) {
      hazards.push({
        kind: 'jet', rect: r.cells[ci], periodMs: P, onMs: r.on,
        offsetMs: -Math.round(j * r.step + r.phase + (k * P) / r.spots), color: SPOT_COLOR,
      });
    }
  });
}

/** Where spot `k` of a rail is right now (fractional, for the lens gliding along the rail). */
const spotAt = (r: Rail, k: number, nowMs: number): { x: number; y: number; cell: number; heat: number } => {
  const P = r.seq.length * r.step;
  const ph = (((nowMs - r.phase - (k * P) / r.spots) % P) + P) % P;
  const jf = ph / r.step;
  const j = Math.floor(jf);
  const f = jf - j;
  const a = r.cells[r.seq[j % r.seq.length]];
  const b = r.cells[r.seq[(j + 1) % r.seq.length]];
  const m = f < 0.55 ? 0 : (f - 0.55) / 0.45;
  const s = m * m * (3 - 2 * m);
  return {
    x: a.x + a.w / 2 + (b.x - a.x) * s,
    y: a.y + a.h / 2 + (b.y - a.y) * s,
    cell: r.seq[j % r.seq.length],
    heat: 1 - s * 0.6,
  };
};

// ── Hall II: the beam ────────────────────────────────────────────────

const MIRROR_1 = 'heliostat-mirror-1';
const MIRROR_2 = 'heliostat-mirror-2';
const BEAM_COLOR = 0xfff6c8;

/** The beam's floor bands. The engine reads `safeWhen`; the painter reads the same flags. */
const BEAM_A: Rect = { x: 360, y: 1560, w: R - 360, h: 40 };   // south walk, until Mirror I turns
const BEAM_B_COL: Rect = { x: L, y: 1310, w: 60, h: 230 };       // up the west wall, after Mirror I
const BEAM_B_ROW: Rect = { x: 360, y: 1260, w: R - 360, h: 40 }; // across the north walk, until Mirror II
const BEAM_C_COL: Rect = { x: L, y: 1080, w: 60, h: 170 };       // up the shaft, after Mirror II
const MIRROR_I_AT: Pt = { x: 300, y: 1580 };
const MIRROR_II_AT: Pt = { x: 300, y: 1280 };
const PORT_AT: Pt = { x: L, y: 1580 };
const CRANK_1: Pt = { x: 420, y: 1640 };
const CRANK_2: Pt = { x: 1440, y: 1350 };

hazards.push(
  { kind: 'floor', rect: BEAM_A, safeWhen: { flag: MIRROR_1 }, color: BEAM_COLOR },
  { kind: 'floor', rect: BEAM_B_COL, safeWhen: { not: { flag: MIRROR_1 } }, color: BEAM_COLOR },
  { kind: 'floor', rect: BEAM_B_ROW, safeWhen: { any: [{ not: { flag: MIRROR_1 } }, { flag: MIRROR_2 }] }, color: BEAM_COLOR },
  { kind: 'floor', rect: BEAM_C_COL, safeWhen: { not: { flag: MIRROR_2 } }, color: BEAM_COLOR },
);

/** The maze's standing mirror walls (real walls — they reflect you, too). */
const MAZE_PANELS: Rect[] = [
  { x: 420, y: 1400, w: 40, h: 155 },
  { x: 600, y: 1440, w: 500, h: 30 },
  { x: 1180, y: 1300, w: 40, h: 200 },
  { x: 1300, y: 1420, w: R - 1300, h: 30 },
];

// ── Hall III: the cogs and the chain ────────────────────────────────

interface Cog { x: number; y: number; len: number; rad: number; phase: number; teeth: number }
const COGS: Cog[] = [
  { x: 520, y: 900, len: 140, rad: 1.1, phase: 0, teeth: 14 },
  { x: 1280, y: 880, len: 150, rad: -1.0, phase: 1.3, teeth: 16 },
  { x: 900, y: 700, len: 150, rad: 1.3, phase: 2.2, teeth: 16 },
  { x: 520, y: 560, len: 130, rad: -1.2, phase: 0.7, teeth: 12 },
  { x: 1280, y: 560, len: 130, rad: 1.0, phase: 3.0, teeth: 12 },
];
const CHAIN_BELT: Rect = { x: L, y: 770, w: R - L, h: 40 };
const CHAIN_VX = 115;
for (const c of COGS) hazards.push({ kind: 'sweeper', x: c.x, y: c.y, length: c.len, radPerSec: c.rad, phase: c.phase, color: 0xc84a1a });
hazards.push({ kind: 'conveyor', rect: CHAIN_BELT, vx: CHAIN_VX, vy: 0, look: 'belt' });

// ── Gates and walls ──────────────────────────────────────────────────

const gates: WorldGate[] = [
  { rect: { x: DOOR_L, y: 1680, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'heliostat-warden-1' }, look: 'lens', label: 'Defeat the Focal-Warden' },
  { rect: { x: DOOR_L, y: 1040, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'heliostat-warden-2' }, look: 'mirror', label: 'Defeat the Glass-Warden' },
  { rect: { x: DOOR_L, y: 340, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'heliostat-warden-3' }, look: 'sunbar', label: 'Defeat the Ratchet-Warden' },
];

const CROSS_WALLS = [2240, 1680, 1040, 340];

const solids: Solid[] = [
  { kind: 'rect', x: 0, y: 0, w: L, h: H },
  { kind: 'rect', x: R, y: 0, w: W - R, h: H },
  { kind: 'rect', x: L, y: 0, w: R - L, h: 40 },
  { kind: 'rect', x: L, y: H - 36, w: R - L, h: 36 },
  // The Foot is narrower than the halls: marble piers either side.
  { kind: 'rect', x: L, y: 2280, w: 160, h: H - 36 - 2280 },
  { kind: 'rect', x: R - 160, y: 2280, w: 160, h: H - 36 - 2280 },
  // The Crown narrows between mirror buttresses.
  { kind: 'rect', x: L, y: 40, w: 180, h: 300 },
  { kind: 'rect', x: R - 180, y: 40, w: 180, h: 300 },
  // Lens pedestals.
  { kind: 'rect', x: RING_W.x - RING_CW / 2, y: RING_W.y - RING_CH / 2, w: RING_CW, h: RING_CH },
  { kind: 'rect', x: RING_E.x - RING_CW / 2, y: RING_E.y - RING_CH / 2, w: RING_CW, h: RING_CH },
  // The two great pivot mirrors.
  { kind: 'rect', x: L, y: 1540, w: 120, h: 20 },
  { kind: 'rect', x: L, y: 1250, w: 120, h: 10 },
  { kind: 'rect', x: L + 60, y: 1260, w: 60, h: 40 },
  // The Sun Chain hangs against the east wall of Hall III.
  { kind: 'rect', x: R - 50, y: 380, w: 50, h: 660 },
];
for (const y of CROSS_WALLS) {
  solids.push({ kind: 'rect', x: L, y, w: DOOR_L - L, h: 40 }, { kind: 'rect', x: DOOR_R, y, w: R - DOOR_R, h: 40 });
}
for (const p of MAZE_PANELS) solids.push({ kind: 'rect', x: p.x, y: p.y, w: p.w, h: p.h });
for (const c of COGS) solids.push({ kind: 'circle', x: c.x, y: c.y, r: 26 });

// ── Ground ───────────────────────────────────────────────────────────

/** Beyond the walls: the sea a long way down, white with glare, seen between the crown's trusses. */
function farSea(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(0xcfe0ea, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let i = 0; i < (r.w * r.h) / 900; i++) {
    g.fillStyle(rng() < 0.6 ? 0xffffff : 0xa8c4d8, 0.5 + rng() * 0.5);
    g.fillRect(r.x + rng() * r.w, r.y + rng() * r.h, 2 + rng() * 6, 1);
  }
  // The isle below: marble terraces in the haze.
  for (let i = 0; i < 6; i++) {
    g.fillStyle(0xf4f0e6, 0.35); g.fillEllipse(r.x + rng() * r.w, r.y + rng() * r.h, 60 + rng() * 80, 20 + rng() * 30);
  }
  // Trusses: X-braced iron.
  const step = 220;
  for (let y = r.y - step; y < r.y + r.h; y += step) {
    g.lineStyle(10, IRON, 0.85);
    g.lineBetween(r.x, y, r.x + r.w, y + step); g.lineBetween(r.x + r.w, y, r.x, y + step);
    g.lineStyle(3, IRON_LIT, 0.6);
    g.lineBetween(r.x, y - 3, r.x + r.w, y + step - 3); g.lineBetween(r.x + r.w, y - 3, r.x, y + step - 3);
    girder(g, r.x, y, r.w, 18);
  }
}

/** White marble slabs with grey veins and a gold fillet between them — the Foot. */
function marbleFloor(g: G, r: Rect, rng: () => number): void {
  const S = 80;
  g.fillStyle(GOLD_DARK, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let y = r.y; y < r.y + r.h; y += S) {
    for (let x = r.x; x < r.x + r.w; x += S) {
      const w = Math.min(S - 3, r.x + r.w - x - 1.5), h = Math.min(S - 3, r.y + r.h - y - 1.5);
      if (w <= 0 || h <= 0) continue;
      g.fillStyle(rng() < 0.5 ? MARBLE : mixC(MARBLE, MARBLE_SHADE, 0.35), 1); g.fillRect(x + 1.5, y + 1.5, w, h);
      for (let v = 0; v < 2; v++) {
        let vx = x + rng() * S, vy = y + 2;
        g.lineStyle(1, MARBLE_VEIN, 0.45);
        g.beginPath(); g.moveTo(vx, vy);
        for (let k = 0; k < 5; k++) { vx += (rng() - 0.5) * 26; vy += h / 5; g.lineTo(Math.max(x + 2, Math.min(x + w, vx)), vy); }
        g.strokePath();
      }
      g.fillStyle(0xffffff, 0.35); g.fillRect(x + 3, y + 3, w - 4, 2);
    }
  }
}

/** The gallery floor: long planks of black-stained oak, burned along every path a spot walks. */
function galleryFloor(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(0x24160e, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let y = r.y; y < r.y + r.h; y += 22) {
    let x = r.x - rng() * 200;
    while (x < r.x + r.w) {
      const len = 140 + rng() * 160;
      g.fillStyle(rng() < 0.5 ? 0x3a2416 : 0x321e12, 1);
      g.fillRect(Math.max(r.x, x + 1), y + 1, Math.min(len - 2, r.x + r.w - Math.max(r.x, x + 1)), 20);
      g.fillStyle(0x5a3a22, 0.35); g.fillRect(Math.max(r.x, x + 1), y + 2, Math.min(len - 2, r.x + r.w - Math.max(r.x, x + 1)), 2);
      x += len;
    }
  }
  // Burns where the spots walk, deepest at the turning ends.
  for (const rail of RAILS) {
    for (const c of rail.cells) {
      scorch(g, c.x + c.w / 2, c.y + c.h / 2, Math.min(c.w, c.h) * 0.42, rng, 0.85);
    }
    if (rail.kind === 'line') {
      const a = rail.cells[0], b = rail.cells[rail.cells.length - 1];
      g.lineStyle(3, BRASS, 0.55); g.lineBetween(a.x + 8, a.y + a.h / 2, b.x + b.w - 8, b.y + b.h / 2);
    }
  }
  // Brass rings inlaid round each pedestal, the ring rail's footprint.
  for (const p of [RING_W, RING_E]) {
    g.lineStyle(3, BRASS, 0.55); g.strokeEllipse(p.x, p.y, RING_CW * 2.2, RING_CH * 2.2);
    g.lineStyle(1, GOLD_LIT, 0.4); g.strokeEllipse(p.x, p.y, RING_CW * 2.2 - 6, RING_CH * 2.2 - 6);
  }
}

/** The maze floor: tiles of polished silver, each holding a slant of sky. */
function mirrorFloor(g: G, r: Rect, rng: () => number): void {
  const S = 40;
  g.fillStyle(MIRROR_DARK, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let y = r.y; y < r.y + r.h; y += S) {
    for (let x = r.x; x < r.x + r.w; x += S) {
      const k = ((x - r.x) / S + (y - r.y) / S) % 2;
      const c = k ? MIRROR : mixC(MIRROR, MIRROR_DARK, 0.3);
      g.fillStyle(c, 1); g.fillRect(x + 1, y + 1, S - 2, Math.min(S - 2, r.y + r.h - y - 1));
      g.fillStyle(SKY, 0.5); g.fillTriangle(x + 1, y + 1, x + S * 0.55, y + 1, x + 1, y + S * 0.55);
      if (rng() < 0.15) { g.fillStyle(0xffffff, 0.6); g.fillRect(x + 6 + rng() * 20, y + 4, 2, S - 10); }
    }
  }
  // Etched guide-lines where the beam has always run: the clerks keep them polished.
  g.lineStyle(2, GOLD, 0.35);
  for (const b of [BEAM_A, BEAM_B_ROW]) { g.strokeRect(b.x, b.y, b.w, b.h); }
  for (const b of [BEAM_B_COL, BEAM_C_COL]) { g.strokeRect(b.x, b.y, b.w, b.h); }
}

/** Hall III: iron grating catwalks over the gear-shaft, pits where the cogs turn. */
function gratingFloor(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(0x0a0a10, 1); g.fillRect(r.x, r.y, r.w, r.h);
  // Deep below: the shaft, a faint gleam of more gears.
  for (let i = 0; i < 10; i++) {
    g.lineStyle(2, 0x2a2a34, 0.6); g.strokeCircle(r.x + rng() * r.w, r.y + rng() * r.h, 30 + rng() * 60);
  }
  const S = 16;
  g.lineStyle(2, IRON, 1);
  for (let x = r.x; x <= r.x + r.w; x += S) g.lineBetween(x, r.y, x, r.y + r.h);
  for (let y = r.y; y <= r.y + r.h; y += S) g.lineBetween(r.x, y, r.x + r.w, y);
  g.lineStyle(1, IRON_LIT, 0.4);
  for (let x = r.x + 1; x <= r.x + r.w; x += S * 4) g.lineBetween(x, r.y, x, r.y + r.h);
  // Cross-beams under the grating.
  for (let y = r.y + 60; y < r.y + r.h; y += 160) girder(g, r.x, y, r.w, 14);
  // The cog pits.
  for (const c of COGS) {
    g.fillStyle(0x050508, 1); g.fillCircle(c.x, c.y, c.len + 14);
    g.lineStyle(6, IRON_BLUE, 1); g.strokeCircle(c.x, c.y, c.len + 14);
    g.lineStyle(2, BRASS, 0.7); g.strokeCircle(c.x, c.y, c.len + 18);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      g.fillStyle(i % 2 ? 0xe8c020 : 0x1a1a1a, 1);
      g.fillRect(c.x + Math.cos(a) * (c.len + 20) - 3, c.y + Math.sin(a) * (c.len + 20) - 3, 6, 6);
    }
  }
  // The chain's bed, a channel of worn iron.
  g.fillStyle(0x1a1a22, 1); g.fillRect(CHAIN_BELT.x, CHAIN_BELT.y - 6, CHAIN_BELT.w, CHAIN_BELT.h + 12);
  g.fillStyle(SCORCH, 0.6); g.fillRect(CHAIN_BELT.x, CHAIN_BELT.y + 4, CHAIN_BELT.w, CHAIN_BELT.h - 8);
}

/** The Crown: a floor of gold and white wedges radiating from where the throne stands. */
function crownFloor(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(MARBLE, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const cx = MID, cy = 150;
  for (let i = 0; i < 48; i++) {
    const a0 = (i / 48) * TAU, a1 = ((i + 1) / 48) * TAU;
    g.fillStyle(i % 2 ? GOLD : MARBLE, i % 2 ? 0.75 : 1);
    g.fillTriangle(cx, cy, cx + Math.cos(a0) * 900, cy + Math.sin(a0) * 900, cx + Math.cos(a1) * 900, cy + Math.sin(a1) * 900);
  }
  for (let k = 1; k <= 5; k++) { g.lineStyle(3, GOLD_DARK, 0.5); g.strokeCircle(cx, cy, k * 70); g.lineStyle(1, GOLD_LIT, 0.6); g.strokeCircle(cx, cy, k * 70 - 3); }
  for (let i = 0; i < 40; i++) { g.fillStyle(0xffffff, 0.5); g.fillCircle(r.x + rng() * r.w, r.y + rng() * r.h, 1 + rng()); }
}

/** A cross-wall between halls: a girder faced with mirror panes, gilt at the door. */
function crossWall(g: G, y: number): void {
  for (const [x0, x1] of [[L, DOOR_L], [DOOR_R, R]] as [number, number][]) {
    girder(g, x0, y, x1 - x0, 40);
    for (let x = x0 + 6; x < x1 - 36; x += 44) mirrorPane(g, x, y + 30, 36, 8, GOLD, 0.9);
  }
  for (const x of [DOOR_L - 12, DOOR_R]) {
    g.fillStyle(GOLD_DARK, 1); g.fillRect(x, y - 6, 12, 52);
    g.fillStyle(GOLD, 1); g.fillRect(x + 2, y - 4, 8, 48);
    sunburst(g, x + 6, y - 8, 10, GOLD, 1);
  }
}

/** The side walls: iron and mirror, seen from above. */
function sideWalls(g: G): void {
  girder(g, L - 26, 0, 26, H);
  girder(g, R, 0, 26, H);
  for (let y = 60; y < H - 60; y += 64) {
    mirrorPane(g, L - 8, y, 8, 50, GOLD, 0.85);
    mirrorPane(g, R, y, 8, 50, GOLD, 0.85);
  }
}

function paintGround(g: G, rng: () => number): void {
  g.fillStyle(0x0c0c14, 1); g.fillRect(0, 0, W, H);
  farSea(g, { x: 0, y: 0, w: L - 26, h: H }, rng);
  farSea(g, { x: R + 26, y: 0, w: W - R - 26, h: H }, rng);

  marbleFloor(g, { x: L + 160, y: 2280, w: R - L - 320, h: H - 36 - 2280 }, rng);
  galleryFloor(g, { x: L, y: 1720, w: R - L, h: 520 }, rng);
  mirrorFloor(g, { x: L, y: 1080, w: R - L, h: 600 }, rng);
  gratingFloor(g, { x: L, y: 380, w: R - L, h: 660 }, rng);
  crownFloor(g, { x: L + 180, y: 40, w: R - L - 360, h: 300 }, rng);

  // The Foot's inlay: the Despot's seal, gold in the marble, where every visitor must stand.
  g.fillStyle(GOLD_DARK, 0.4); g.fillCircle(MID, 2400, 92);
  sunburst(g, MID, 2400, 86, GOLD, 0.85);
  g.lineStyle(3, GOLD_DARK, 0.7); g.strokeCircle(MID, 2400, 100);
  // Marble piers of the Foot and the Crown buttresses: top faces.
  for (const rr of [{ x: L, y: 2280, w: 160, h: H - 2316 }, { x: R - 160, y: 2280, w: 160, h: H - 2316 }]) {
    g.fillStyle(MARBLE_SHADE, 1); g.fillRect(rr.x, rr.y, rr.w, rr.h);
    g.fillStyle(MARBLE, 1); g.fillRect(rr.x + 6, rr.y + 6, rr.w - 12, rr.h - 12);
    g.lineStyle(2, GOLD, 0.7); g.strokeRect(rr.x + 12, rr.y + 12, rr.w - 24, rr.h - 24);
  }
  for (const rr of [{ x: L, y: 40, w: 180, h: 300 }, { x: R - 180, y: 40, w: 180, h: 300 }]) {
    girder(g, rr.x, rr.y, rr.w, rr.h);
    for (let y = rr.y + 20; y < rr.y + rr.h - 40; y += 56) mirrorPane(g, rr.x + 20, y, rr.w - 40, 44, GOLD, 1);
  }
  g.fillStyle(0x14141a, 1); g.fillRect(L, H - 36, R - L, 36);
  g.fillStyle(0x14141a, 1); g.fillRect(L, 0, R - L, 40);
  girder(g, L, 0, R - L, 40);
  for (const y of CROSS_WALLS) crossWall(g, y);
  sideWalls(g);

  // The sun port in the west wall of the maze: a round hole full of white.
  g.fillStyle(0xffffff, 1); g.fillCircle(PORT_AT.x - 8, PORT_AT.y, 18);
  g.lineStyle(4, BRASS, 1); g.strokeCircle(PORT_AT.x - 8, PORT_AT.y, 20);
  // The shaft above Mirror II, where the beam goes up to the Chain.
  g.fillStyle(0x0a0a10, 1); g.fillRect(L + 6, 1082, 48, 20);
}

// ── Pieces ───────────────────────────────────────────────────────────

/** A statue of the Despot: robed, arms raised, a sunburst for a head. */
function statue(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 70, 14, 0.12);
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x - 30, y - 22, 60, 22);
  g.fillStyle(MARBLE, 1); g.fillRect(x - 28, y - 24, 56, 18);
  g.fillStyle(GOLD, 1); g.fillRect(x - 28, y - 24, 56, 3);
  // Robe.
  g.fillStyle(MARBLE_SHADE, 1);
  g.fillTriangle(x - 22, y - 24, x + 22, y - 24, x, y - 110);
  g.fillStyle(MARBLE, 1);
  g.fillTriangle(x - 18, y - 24, x + 14, y - 24, x - 2, y - 108);
  for (let i = 0; i < 4; i++) { g.lineStyle(1, MARBLE_VEIN, 0.5); g.lineBetween(x - 12 + i * 7, y - 26, x - 4 + i * 2, y - 96); }
  // Arms raised to the sun.
  g.lineStyle(7, MARBLE_SHADE, 1); g.lineBetween(x - 6, y - 96, x - 30, y - 140); g.lineBetween(x + 6, y - 96, x + 30, y - 140);
  g.lineStyle(5, MARBLE, 1); g.lineBetween(x - 6, y - 97, x - 29, y - 139); g.lineBetween(x + 6, y - 97, x + 29, y - 139);
  sunburst(g, x, y - 122, 26, GOLD, 1, rng() * 0.2);
  glow(g, x, y - 122, 40, SUN, 0.05, 3);
  // The plaque.
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 16, y - 16, 32, 8);
  g.fillStyle(GOLD_LIT, 0.8); for (let i = 0; i < 5; i++) g.fillRect(x - 13 + i * 6, y - 13, 4, 1.5);
}

/** A great lens on its brass pedestal, tipped toward the sky, a scorched dish beneath. */
function lensPedestal(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 110, 22, 0.25);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 46, y - 18, 92, 18);
  g.fillStyle(BRASS, 1); g.fillRect(x - 44, y - 20, 88, 14);
  g.fillStyle(GOLD_LIT, 0.6); g.fillRect(x - 44, y - 20, 88, 2);
  g.fillStyle(IRON, 1); g.fillRect(x - 10, y - 110, 20, 92);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - 8, y - 110, 4, 92);
  for (let k = 0; k < 4; k++) { g.fillStyle(BRASS, 1); g.fillRect(x - 13, y - 40 - k * 20, 26, 4); }
  // The yoke and the lens, edge on: a fat ellipse of glass.
  g.lineStyle(5, BRASS, 1);
  g.beginPath(); g.arc(x, y - 130, 40, Math.PI * 0.15, Math.PI * 0.85, false); g.strokePath();
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, y - 140, 88, 38);
  g.fillStyle(0xd8eef8, 0.9); g.fillEllipse(x, y - 141, 80, 32);
  g.fillStyle(0xffffff, 0.8); g.fillEllipse(x - 14, y - 147, 30, 8);
  g.lineStyle(2, GOLD, 1); g.strokeEllipse(x, y - 141, 82, 34);
  sunburst(g, x, y - 66, 10, GOLD, 1);
}

/** A rack of spare lenses in their felt cradles. */
function lensRack(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 70, 12, 0.2);
  g.fillStyle(0x4a2a1a, 1); g.fillRect(x - 34, y - 46, 68, 46);
  g.fillStyle(0x6a3a22, 1); g.fillRect(x - 32, y - 44, 64, 42);
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 3; i++) {
      const cx = x - 20 + i * 20, cy = y - 34 + r * 20;
      g.fillStyle(0x7a1a2a, 1); g.fillEllipse(cx, cy + 4, 18, 8);
      g.fillStyle(0xd8eef8, 0.9); g.fillEllipse(cx, cy, 16, 14);
      g.fillStyle(0xffffff, 0.8); g.fillEllipse(cx - 3, cy - 3, 5, 3);
      g.lineStyle(1, BRASS, 1); g.strokeEllipse(cx, cy, 16, 14);
    }
  }
}

/** A run of standing mirrors along a maze wall. */
function mirrorWall(g: G, r: Rect, rng: () => number): void {
  const horiz = r.w > r.h;
  if (horiz) {
    const n = Math.max(1, Math.round(r.w / 52));
    for (let i = 0; i < n; i++) standingMirror(g, r.x + (i + 0.5) * (r.w / n), r.y + r.h, r.w / n - 8, 74, Math.sin(i * 1.7) * 0.4, 0, rng);
  } else {
    // End-on: a stack of frames seen edgewise, glinting.
    g.fillStyle(GOLD_DARK, 1); g.fillRect(r.x + 8, r.y - 60, r.w - 16, r.h + 60);
    g.fillStyle(GOLD, 1); g.fillRect(r.x + 10, r.y - 58, r.w - 20, r.h + 56);
    for (let y = r.y - 56; y < r.y + r.h; y += 18) { g.fillStyle(MIRROR, 1); g.fillRect(r.x + 13, y, r.w - 26, 12); g.fillStyle(0xffffff, 0.7); g.fillRect(r.x + 14, y + 1, 3, 10); }
    shadow(g, r.x + r.w / 2, r.y + r.h, r.w + 10, 8, 0.18);
  }
}

/** A great pivot mirror, with its brass crank. `turned` repaints it at its new angle. */
function pivotMirror(g: G, at: Pt, turned: boolean, label: string): void {
  shadow(g, at.x, at.y + 2, 120, 16, 0.2);
  g.fillStyle(IRON, 1); g.fillRect(at.x - 56, at.y - 10, 112, 10);
  g.fillStyle(IRON_LIT, 1); g.fillRect(at.x - 56, at.y - 10, 112, 3);
  // The frame, seen at an angle: a parallelogram of gilt round silver.
  const lean = turned ? -26 : 26;
  const pts = (inset: number) => [
    { x: at.x - 50 + inset, y: at.y - 14 - inset }, { x: at.x + 50 - inset, y: at.y - 14 - inset },
    { x: at.x + 50 - inset + lean, y: at.y - 104 + inset }, { x: at.x - 50 + inset + lean, y: at.y - 104 + inset },
  ];
  g.fillStyle(GOLD_DARK, 1); g.fillPoints(pts(0), true, true);
  g.fillStyle(GOLD, 1); g.fillPoints(pts(2), true, true);
  g.fillStyle(MIRROR, 1); g.fillPoints(pts(7), true, true);
  g.fillStyle(0xffffff, 0.75); g.fillPoints([
    { x: at.x - 20, y: at.y - 21 }, { x: at.x - 6, y: at.y - 21 }, { x: at.x - 6 + lean * 0.8, y: at.y - 97 }, { x: at.x - 20 + lean * 0.8, y: at.y - 97 },
  ], true, true);
  sunburst(g, at.x + lean, at.y - 110, 12, GOLD, 1);
  // A roman numeral plate.
  g.fillStyle(IRON, 1); g.fillRect(at.x - 14, at.y - 8, 28, 8);
  g.fillStyle(GOLD_LIT, 1);
  for (let i = 0; i < label.length; i++) g.fillRect(at.x - 4 * label.length + 2 + i * 8, at.y - 7, 3, 6);
}

/** The crank that turns a pivot mirror: a brass wheel on a post. */
function crank(g: G, at: Pt, turned: boolean): void {
  shadow(g, at.x, at.y + 2, 30, 8, 0.25);
  g.fillStyle(IRON, 1); g.fillRect(at.x - 4, at.y - 34, 8, 34);
  const cx = at.x, cy = at.y - 40;
  g.lineStyle(4, BRASS, 1); g.strokeCircle(cx, cy, 13);
  for (let i = 0; i < 4; i++) {
    const a = (turned ? Math.PI / 4 : 0) + (i / 4) * TAU;
    g.lineStyle(3, BRASS, 1); g.lineBetween(cx, cy, cx + Math.cos(a) * 13, cy + Math.sin(a) * 13);
  }
  g.fillStyle(GOLD_LIT, 1); g.fillCircle(cx, cy, 4);
  g.fillStyle(turned ? 0x6ae88a : 0xe85a3a, 1); g.fillCircle(at.x + 10, at.y - 20, 3);
}

/** The Sun Chain, hanging down the east wall of Hall III: links as big as doors. */
function sunChain(g: G, x: number, y0: number, y1: number): void {
  g.fillStyle(0x000000, 0.3); g.fillRect(x - 18, y0, 44, y1 - y0);
  let k = 0;
  for (let y = y0 + 20; y < y1; y += 40) {
    chainLink(g, x, y, k % 2 ? Math.PI / 2 : Math.PI / 2, k % 2 ? 26 : 30, k % 2 ? IRON : IRON_LIT);
    k++;
  }
  // A collar plate where it passes through each girder.
  for (let y = y0 + 60; y < y1; y += 160) {
    g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 28, y - 8, 56, 16);
    g.fillStyle(BRASS, 1); g.fillRect(x - 26, y - 6, 52, 10);
    g.fillStyle(RIVET, 1); g.fillCircle(x - 20, y - 1, 2); g.fillCircle(x + 20, y - 1, 2);
  }
}

/** The Sun Throne: a disc of beaten gold on a stepped dais, mirrors fanned behind it. */
function sunThrone(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 240, 30, 0.12);
  for (let k = 0; k < 3; k++) {
    g.fillStyle(k % 2 ? MARBLE : MARBLE_SHADE, 1); g.fillRect(x - 110 + k * 14, y - 12 - k * 10, 220 - k * 28, 12);
    g.fillStyle(GOLD, 1); g.fillRect(x - 110 + k * 14, y - 12 - k * 10, 220 - k * 28, 2);
  }
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + 0.25 + (i / 8) * (Math.PI - 0.5);
    const mx = x + Math.cos(a) * 92, my = y - 60 + Math.sin(a) * 70;
    g.fillStyle(GOLD_DARK, 1); g.fillRect(mx - 13, my - 24, 26, 48);
    g.fillStyle(MIRROR, 1); g.fillRect(mx - 10, my - 21, 20, 42);
    g.fillStyle(0xffffff, 0.7); g.fillRect(mx - 7, my - 19, 3, 38);
  }
  g.fillStyle(GOLD_DARK, 1); g.fillCircle(x, y - 80, 50);
  sunburst(g, x, y - 80, 62, GOLD, 1);
  g.fillStyle(IRON, 1); g.fillRect(x - 26, y - 46, 52, 14);
  g.fillStyle(GOLD, 1); g.fillRect(x - 28, y - 48, 56, 4);
}

const pieces: NonNullable<AreaDef['painter']['pieces']> = [
  { x: 520, y: 2330, w: 80, h: 170, draw: (g, rng) => statue(g, 520, 2330, rng) },
  { x: 1280, y: 2330, w: 80, h: 170, draw: (g, rng) => statue(g, 1280, 2330, rng) },
  { x: RING_W.x, y: RING_W.y + RING_CH / 2, w: 120, h: 180, draw: (g) => lensPedestal(g, RING_W.x, RING_W.y + RING_CH / 2) },
  { x: RING_E.x, y: RING_E.y + RING_CH / 2, w: 120, h: 180, draw: (g) => lensPedestal(g, RING_E.x, RING_E.y + RING_CH / 2) },
  { x: 290, y: 2096, w: 80, h: 60, draw: (g) => lensRack(g, 290, 2096) },
  { x: 1510, y: 2096, w: 80, h: 60, draw: (g) => lensRack(g, 1510, 2096) },
  ...MAZE_PANELS.map((p) => ({ x: p.x + p.w / 2, y: p.y + p.h, w: p.w + 20, h: p.h + 90, draw: (g: G, rng: () => number) => mirrorWall(g, p, rng) })),
  { x: MIRROR_I_AT.x, y: MIRROR_I_AT.y - 20, w: 140, h: 130, when: { not: { flag: MIRROR_1 } }, draw: (g) => pivotMirror(g, { x: MIRROR_I_AT.x, y: MIRROR_I_AT.y - 20 }, false, 'I') },
  { x: MIRROR_I_AT.x, y: MIRROR_I_AT.y - 20, w: 140, h: 130, when: { flag: MIRROR_1 }, draw: (g) => pivotMirror(g, { x: MIRROR_I_AT.x, y: MIRROR_I_AT.y - 20 }, true, 'I') },
  { x: MIRROR_II_AT.x, y: MIRROR_II_AT.y + 20, w: 140, h: 130, when: { not: { flag: MIRROR_2 } }, draw: (g) => pivotMirror(g, { x: MIRROR_II_AT.x, y: MIRROR_II_AT.y + 20 }, false, 'II') },
  { x: MIRROR_II_AT.x, y: MIRROR_II_AT.y + 20, w: 140, h: 130, when: { flag: MIRROR_2 }, draw: (g) => pivotMirror(g, { x: MIRROR_II_AT.x, y: MIRROR_II_AT.y + 20 }, true, 'II') },
  { x: CRANK_1.x, y: CRANK_1.y - 14, w: 40, h: 60, when: { not: { flag: MIRROR_1 } }, draw: (g) => crank(g, { x: CRANK_1.x + 30, y: CRANK_1.y - 14 }, false) },
  { x: CRANK_1.x, y: CRANK_1.y - 14, w: 40, h: 60, when: { flag: MIRROR_1 }, draw: (g) => crank(g, { x: CRANK_1.x + 30, y: CRANK_1.y - 14 }, true) },
  { x: CRANK_2.x, y: CRANK_2.y - 14, w: 40, h: 60, when: { not: { flag: MIRROR_2 } }, draw: (g) => crank(g, { x: CRANK_2.x + 30, y: CRANK_2.y - 14 }, false) },
  { x: CRANK_2.x, y: CRANK_2.y - 14, w: 40, h: 60, when: { flag: MIRROR_2 }, draw: (g) => crank(g, { x: CRANK_2.x + 30, y: CRANK_2.y - 14 }, true) },
  { x: R - 25, y: 1040, w: 70, h: 700, draw: (g) => sunChain(g, R - 25, 340, 1040) },
  { x: MID, y: 120, w: 260, h: 160, draw: (g) => sunThrone(g, MID, 120) },
  { x: 330, y: 330, w: 120, h: 140, draw: (g, rng) => standingMirror(g, 330, 330, 90, 110, 0.5, 0, rng) },
  { x: 1470, y: 330, w: 120, h: 140, draw: (g, rng) => standingMirror(g, 1470, 330, 90, 110, -0.5, 0, rng) },
];

// ── Animation ────────────────────────────────────────────────────────

const inView = (v: Rect, x: number, y: number, pad = 200): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

/** Under actors: the cogs turning with their biting teeth, burning spots, the beam, the chain. */
function animateUnder(g: G, t: number, view: Rect, world: PainterWorld): void {
  const ms = t * 1000;
  // Hall I: a white-hot disc on every lit cell, ringed with caustics.
  if (view.y < 2260 && view.y + view.h > 1700) {
    for (const r of RAILS) {
      for (let k = 0; k < r.spots; k++) {
        const s = spotAt(r, k, ms);
        if (!inView(view, s.x, s.y)) continue;
        const c = r.cells[s.cell];
        const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
        glow(g, cx, cy, 40, SUN_HOT, 0.06, 3);
        g.fillStyle(SUN, 0.35); g.fillEllipse(cx, cy, c.w * 0.8, c.h * 0.8);
        caustics(g, cx, cy, Math.min(c.w, c.h) * 0.9, ms, 0xffffff, 0.5, k + c.x * 0.01);
        // Smoke curling up off the scorched boards.
        for (let i = 0; i < 3; i++) {
          const ph = ((ms / 900) + i / 3 + k * 0.17) % 1;
          g.fillStyle(0x6a5a4a, 0.25 * (1 - ph)); g.fillCircle(cx - 10 + i * 10 + Math.sin(ph * 6 + i) * 6, cy - ph * 40, 4 + ph * 6);
        }
      }
    }
  }
  // Hall II: the beam where the mirrors send it.
  if (view.y < 1700 && view.y + view.h > 1060) {
    const m1 = world.test({ flag: MIRROR_1 }), m2 = world.test({ flag: MIRROR_2 });
    const midY = (b: Rect) => b.y + b.h / 2, midX = (b: Rect) => b.x + b.w / 2;
    beam(g, PORT_AT.x, PORT_AT.y, MIRROR_I_AT.x, PORT_AT.y, 10, ms, 1);
    if (!m1) {
      beam(g, MIRROR_I_AT.x, midY(BEAM_A), R, midY(BEAM_A), 16, ms, 1);
      // It splashes on the east wall in a white star.
      glow(g, R - 6, midY(BEAM_A), 50, SUN, 0.1, 4);
    } else {
      beam(g, midX(BEAM_B_COL), MIRROR_I_AT.y - 20, midX(BEAM_B_COL), MIRROR_II_AT.y + 20, 16, ms, 1);
      if (!m2) {
        beam(g, MIRROR_II_AT.x, midY(BEAM_B_ROW), R, midY(BEAM_B_ROW), 16, ms, 1);
        glow(g, R - 6, midY(BEAM_B_ROW), 50, SUN, 0.1, 4);
      } else {
        beam(g, midX(BEAM_C_COL), MIRROR_II_AT.y, midX(BEAM_C_COL), 1060, 16, ms, 1);
      }
    }
    // Stray reflections dance on the panels.
    for (const p of MAZE_PANELS) {
      const k = (Math.sin(ms / 500 + p.x * 0.01) + 1) / 2;
      g.fillStyle(0xffffff, 0.12 + k * 0.12); g.fillEllipse(p.x + p.w / 2 + Math.sin(ms / 700 + p.y) * p.w * 0.3, p.y + p.h + 14, 30, 8);
    }
  }
  // Hall III: the cogs, turning in step with their teeth.
  if (view.y < 1060 && view.y + view.h > 360) {
    for (const c of COGS) {
      if (!inView(view, c.x, c.y, c.len + 40)) continue;
      const a = c.phase + t * c.rad;
      cog(g, c.x, c.y, c.len * 0.42, c.teeth, a * 0.5, IRON_LIT);
      // The long biting tooth: a forged rack-arm out to the full sweep, its tip red-hot.
      const ex = c.x + Math.cos(a) * c.len, ey = c.y + Math.sin(a) * c.len;
      g.lineStyle(22, 0x000000, 0.3); g.lineBetween(c.x + 5, c.y + 7, ex + 5, ey + 7);
      g.lineStyle(18, IRON, 1); g.lineBetween(c.x, c.y, ex, ey);
      g.lineStyle(10, IRON_LIT, 1); g.lineBetween(c.x, c.y, ex, ey);
      for (let k = 0.3; k < 1; k += 0.14) {
        const px = c.x + Math.cos(a) * c.len * k, py = c.y + Math.sin(a) * c.len * k;
        g.fillStyle(RIVET, 1); g.fillCircle(px, py, 2.2);
      }
      g.fillStyle(0xff7a2a, 1); g.fillCircle(ex, ey, 10);
      g.fillStyle(0xffe0a0, 1); g.fillCircle(ex, ey, 5);
      // Sparks shed where the tooth scrapes the rim.
      for (let i = 0; i < 4; i++) {
        const ph = ((ms / 300) + i / 4) % 1;
        g.fillStyle(0xffd27a, 1 - ph);
        g.fillCircle(ex - Math.cos(a) * ph * 10 + Math.sin(a + i) * ph * 22, ey - Math.sin(a) * ph * 10 + ph * 14, 1.6);
      }
      g.fillStyle(BRASS, 1); g.fillCircle(c.x, c.y, 14);
      g.fillStyle(GOLD_LIT, 1); g.fillCircle(c.x - 3, c.y - 3, 5);
    }
    // The chain grinding along its bed.
    if (inView(view, MID, CHAIN_BELT.y)) {
      const off = (t * CHAIN_VX) % 40;
      for (let x = CHAIN_BELT.x - 40 + off; x < CHAIN_BELT.x + CHAIN_BELT.w; x += 40) {
        if (x < view.x - 40 || x > view.x + view.w + 40) continue;
        const k = Math.round((x - off) / 40);
        chainLink(g, x, CHAIN_BELT.y + CHAIN_BELT.h / 2, k % 2 ? 0 : 0, k % 2 ? 18 : 22, k % 2 ? IRON : IRON_LIT);
      }
    }
  }
}

/** Over actors: lenses on their rails with their cones of light, the pinned sun over the Crown. */
function animateOver(g: G, t: number, view: Rect): void {
  const ms = t * 1000;
  if (view.y < 2260 && view.y + view.h > 1700) {
    for (const r of RAILS) {
      // The rail itself, overhead (drawn high: it hangs well above the floor).
      const lift = 110;
      if (r.kind === 'line') {
        const a = r.cells[0], b = r.cells[r.cells.length - 1];
        const y = a.y + a.h / 2 - lift;
        g.lineStyle(7, BRASS_DARK, 0.85); g.lineBetween(a.x, y, b.x + b.w, y);
        g.lineStyle(3, GOLD_LIT, 0.8); g.lineBetween(a.x, y - 2, b.x + b.w, y - 2);
        for (let x = a.x + 20; x < b.x + b.w; x += 110) { g.fillStyle(IRON, 0.9); g.fillRect(x - 3, y - 30, 6, 30); }
      } else {
        const c0 = r.cells[0];
        const cx = c0.x + RING_CW * 1.5, cy = c0.y + RING_CH * 1.5 - lift;
        g.lineStyle(7, BRASS_DARK, 0.85); g.strokeEllipse(cx, cy, RING_CW * 2.1, RING_CH * 2.1);
        g.lineStyle(3, GOLD_LIT, 0.8); g.strokeEllipse(cx, cy - 2, RING_CW * 2.1, RING_CH * 2.1);
      }
      for (let k = 0; k < r.spots; k++) {
        const s = spotAt(r, k, ms);
        if (!inView(view, s.x, s.y)) continue;
        const lx = s.x, ly = s.y - lift;
        // The cone of focused light from the lens to the floor.
        g.fillStyle(SUN, 0.12 + s.heat * 0.1);
        g.fillTriangle(lx - 30, ly, lx + 30, ly, s.x, s.y);
        g.fillStyle(0xffffff, 0.2 + s.heat * 0.2);
        g.fillTriangle(lx - 10, ly, lx + 10, ly, s.x, s.y);
        lens(g, lx, ly, 26, ms, s.heat, 0.95);
        // Carriage wheels on the rail.
        g.fillStyle(IRON, 1); g.fillCircle(lx - 18, ly - 28, 5); g.fillCircle(lx + 18, ly - 28, 5);
        g.lineStyle(3, IRON, 1); g.lineBetween(lx - 18, ly - 28, lx - 12, ly - 22); g.lineBetween(lx + 18, ly - 28, lx + 12, ly - 22);
      }
    }
  }
  // The Crown: the sun, straight overhead, too bright to look at.
  if (view.y < 380) {
    sunDisc(g, MID, -40, 70, ms, 0.9);
    for (let i = 0; i < 5; i++) {
      const x = 480 + i * 210 + Math.sin(ms / 2000 + i) * 20;
      lightShaft(g, x, 330, 60, 300, SUN, 0.12);
    }
  }
  // Glints of sky off the side walls' panes, everywhere you go.
  for (let i = 0; i < 6; i++) {
    const y = view.y + ((i * 397 + ms * 0.05) % view.h);
    const x = i % 2 ? L - 4 : R + 4;
    g.fillStyle(0xffffff, 0.35 + 0.3 * Math.sin(ms / 200 + i)); g.fillCircle(x, y, 3);
  }
}

// ── NPCs ─────────────────────────────────────────────────────────────

const CLEAR_LOOK = { body: 0xeef4fa, accent: 0xd8e6f2, eye: 0xb8d8f0 };

const NPCS: NpcDef[] = [
  {
    id: 'heliostat-ashby', name: 'Pell Ashby', title: 'Mirror-Polisher, a Clear',
    look: { ...CLEAR_LOOK, hat: 'cap', traits: ['apron', 'tool'], size: 1.0 },
    at: { x: 1200, y: 2390 }, wander: 40,
    talks: [
      {
        when: { monarch: 'auriel' },
        lines: [
          'They are turning the mirrors away. One by one. I can hear the bolts coming out up there.',
          'Twenty-two years I polished them. Tonight, they say, it will get dark. I do not know what dark is for.',
          'Sleeping, someone told me. You lie down in it and close your eyes. I should like to try.',
        ],
      },
      {
        when: { encounter: 'heliostat-warden-1' },
        lines: [
          'You came back past the Gallery? Then Brule is beaten. The spots still walk, mind. Lenses do not care.',
          'Above it is the Mirror Maze. Turn the great mirrors with the cranks. Turn them wrong and your skin knows.',
        ],
      },
      {
        lines: [
          'You can see the stair through me, can you not? I was bleached for a blanket. One blanket, over one window.',
          'Now I polish the Despot\'s mirrors. A Clear makes no smudge and casts no shadow on the glass. Very useful.',
          'The Gallery is north. The lenses walk their spots in patterns. Watch a pattern twice before you cross it.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'auriel' }, lines: ['Tonight. Dark, tonight.', 'I shall close my eyes.'] },
      { lines: ['...a smear on the glass is a lie...', '...polish, polish...', '...one blanket...'] },
    ],
  },
  {
    id: 'heliostat-quill', name: 'Barnaby Quill', title: 'Lens-Greaser',
    look: { body: 0xd8a070, accent: 0x6a4a28, hat: 'goggles', traits: ['apron', 'tool', 'bandage'], size: 1.1, eye: 0x3a2a1a },
    at: { x: 1470, y: 1960 },
    talks: [
      {
        when: { monarch: 'auriel' },
        lines: [
          'They told me to grease the rails for the last time. Then they told me to take the lenses down.',
          'I have burns on both arms from them. I polished every one anyway. I will miss them, a bit. Is that strange?',
        ],
      },
      {
        when: { encounter: 'heliostat-warden-1' },
        lines: [
          'You beat Brule. She will grind her own lenses again now, I expect, for telescopes. She always wanted to.',
          'You know there is no night to look at stars in? She knows. She grinds them anyway, in a drawer.',
        ],
      },
      {
        lines: [
          'Mind the boards. Every black ring is a spot that walked there. Every white one is a spot that is about to.',
          'The long rail runs there and back. The pedestal lenses go round. The quick rail by the warden only runs west.',
          'Go by the side aisles if you are slow. Nobody goes by the side aisles. That is why there is a chest there.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'auriel' }, lines: ['Last grease.', 'Telescopes, she said.'] },
      { lines: ['...there and back...', '...round they go...', '...mind your boots...'] },
    ],
  },
  {
    id: 'heliostat-marr', name: 'Ysolde Marr', title: 'Lost in the Glass, a Clear',
    look: { ...CLEAR_LOOK, hat: 'veil', traits: ['scarf'], size: 0.95 },
    at: { x: 1440, y: 1150 },
    talks: [
      {
        when: { monarch: 'auriel' },
        lines: [
          'I have been looking for my reflection in these mirrors for nine years. A Clear has none, you know.',
          'Tonight, they say, it will be dark. My colour comes back in the dark. A little. Then I will have one.',
        ],
      },
      {
        when: { encounter: 'heliostat-warden-2' },
        lines: [
          'Silvering has stepped out of the glass. I saw him. He looked frightened. He has not seen himself in years.',
          'The Chain is north. The teeth go round, and the chain drags you east toward them. Cross it in the west.',
        ],
      },
      {
        lines: [
          'The beam comes in at the port in the west wall. Mirror One sends it east along the south walk. Burning.',
          'Turn the crank by Mirror One and it climbs the wall instead. Then the north walk burns. Find the second crank.',
          'The second is in the east pocket, behind the panels. I go round and round. I never find myself. Only cranks.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'auriel' }, lines: ['Tonight I will have a reflection.', 'Dark. Imagine.'] },
      { lines: ['...not there either...', '...the crank, then the crank...', '...where am I...'] },
    ],
  },
  {
    id: 'heliostat-tallis', name: 'Hob Tallis', title: 'Chain-Oiler',
    look: { body: 0x8a5a3a, accent: 0x2a2a34, hat: 'cap', traits: ['pack', 'tool', 'beard'], size: 1.25, eye: 0x2a1a0a },
    at: { x: 310, y: 1000 },
    talks: [
      {
        when: { monarch: 'auriel' },
        lines: [
          'I oiled that chain every day for twenty-two years so it would never move. Now they want it to.',
          'Pins are out. When they knock the pawl off, the sun goes down. Bring a coat. Apparently it gets cold.',
        ],
      },
      {
        when: { encounter: 'heliostat-warden-3' },
        lines: [
          'Pawlesby is beaten? Then there is nothing between you and him but the Crown. He is under the sun. Always is.',
          'He will pull it down on himself in the end. And when the chain goes — you will see. Keep your eyes open.',
        ],
      },
      {
        lines: [
          'The long teeth bite the catwalks as they go round. Count three, then go. Everybody counts three.',
          'Mind the chain bed in the middle. It grinds east, toward the big cog. Cross it at the west wall, by me.',
          'That chain holds the sun. If it ever slipped a link — but it will not. I oil it. That is my whole job.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'auriel' }, lines: ['Bring a coat.', 'Let it slip. Go on.'] },
      { lines: ['...one, two, three, go...', '...oil, oil...', '...never a link...'] },
    ],
  },
];

// ── POIs ─────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  { kind: 'door', at: { x: MID, y: 2530 }, to: 'tribunal', arrive: { x: 1200, y: 260 }, label: 'The Clarity Stair — down to the Tribunal' },
  { kind: 'waystone', at: { x: 660, y: 2450 } },
  { kind: 'lever', at: CRANK_1, flag: MIRROR_1, label: 'Turn Mirror I' },
  { kind: 'lever', at: CRANK_2, flag: MIRROR_2, label: 'Turn Mirror II' },
  { kind: 'encounter', id: 'heliostat-warden-1' },
  { kind: 'encounter', id: 'heliostat-warden-2' },
  { kind: 'encounter', id: 'heliostat-warden-3' },
  { kind: 'monarch', id: 'auriel', at: { x: MID, y: 200 } },
  { kind: 'sign', at: { x: 1120, y: 2470 }, text: 'THE HELIOSTAT. BY ORDER OF CLARITY: NOTHING HERE CASTS A SHADOW. VISITORS WILL NOT EITHER.' },
  { kind: 'sign', at: { x: 1060, y: 2225 }, text: 'LENS GALLERY. Spots walk on the hour, every hour, which is now. Keep to the cool boards.' },
  { kind: 'sign', at: { x: 1060, y: 1640 }, text: 'MIRROR MAZE. Mirrors are to be turned by authorised staff only. Staff are bleached.' },
  { kind: 'sign', at: { x: 1060, y: 1000 }, text: 'SUN CHAIN. The sun is held by this chain. Do not touch the chain. Do not touch the sun.' },
  { kind: 'chest', id: 'heliostat-chest-gallery', at: { x: 330, y: 1960 }, item: 'charm-heliostat-heliograph', coins: 220 },
  { kind: 'chest', id: 'heliostat-chest-maze', at: { x: 1440, y: 1500 }, coins: 340, orbs: 4 },
  { kind: 'chest', id: 'heliostat-chest-chain', at: { x: 1460, y: 460 }, item: 'charm-heliostat-pawl', orbs: 3 },
  { kind: 'chest', id: 'heliostat-chest-crown', at: { x: 620, y: 260 }, coins: 600, orbs: 8, open: { monarch: 'auriel' } },
];

export const HELIOSTAT_AREA: AreaDef = {
  id: 'heliostat',
  isle: 'light',
  name: 'The Heliostat',
  subtitle: 'The Despot\'s crown of mirrors, holding the sun at noon',
  w: W,
  h: H,
  bg: 0xcfe0ea,
  accent: GOLD,
  weather: 'sunbeams',
  spawn: { x: MID, y: 2440 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver },
  solids,
  exits: [],
  pois: POIS,
  npcs: NPCS,
  hazards,
  gates,
  checkpoints: [
    { x: MID, y: 2440 },   // the Foot
    { x: MID, y: 2222 },   // the gallery door
    { x: MID, y: 2110 },   // past the Long Lens
    { x: MID, y: 2060 },   // the middle aisle
    { x: 330, y: 2060 },   // the west aisle
    { x: 1470, y: 2060 },  // the east aisle
    { x: MID, y: 1900 },   // above the pendulum
    { x: MID, y: 1765 },   // Brule's landing
    { x: MID, y: 1640 },   // the maze's south walk
    { x: 900, y: 1500 },   // under the middle panel
    { x: 1380, y: 1360 },  // the east pocket
    { x: MID, y: 1360 },   // the maze's middle walk
    { x: MID, y: 1180 },   // Silvering's landing
    { x: MID, y: 1000 },   // the chain-hall door
    { x: 310, y: 880 },    // by the oiler, west
    { x: 310, y: 680 },    // the west catwalk, past the chain
    { x: 1470, y: 680 },   // the east catwalk
    { x: MID, y: 470 },    // Pawlesby's landing
    { x: MID, y: 300 },    // the Crown
  ],
};

