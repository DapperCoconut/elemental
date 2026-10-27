import type { AreaDef, NpcDef, Poi, Pt, Rect, Solid, WorldGate, WorldHazard } from '../../../../IslesTypes';
import { type G, dim, glow, lit, motes, shadow } from '../../../../art/IsleArt';
import { test as saveTest } from '../../../../IslesSave';
import {
  BECALMED_SKINS, BRASS, BRASS_DARK, BREATH, CLOUD, CORK, GLASS, IRON, OAK, OAK_DARK,
  OVERDUE, ROYAL, ROYAL_DEEP, SAILCLOTH, SKY, SKY_DEEP,
  aerionSigil, bellows, breathBottle, breathMeter, cloudPuff, pipe, sailArm, sleeper, weathervane, windStreak,
} from './art';

/**
 * The Lung — King Aerion's windmill-palace on Highspire's summit, whose great bellows inhale the
 * isle's air. Every corked breath on the isle is carried up here, and every debtor it belonged to
 * lies here asleep, barely breathing, in rows.
 *
 * You come in at the Intake at the south end, where the collectors check the bottles in, and climb
 * north through the three workings of the Lung, each closed by a warden:
 *
 *   The Intake        — (y 2280–2564) arrival, a waystone, the door back down to Starfall; the
 *                       becalmed laid out in rows on pallets, the collectors' ledger desk.
 *   Hall I            — The Bellows Hall (y 1720–2240): three rows of great bellows. They breathe in
 *                       a wave that runs north — the south row blows, then the middle, then the
 *                       north — so ride behind the exhale. Between the rows the floor grilles draw a
 *                       draught toward the intake hoppers at the walls. Warden: Bellowsmaster Gasket.
 *   Hall II           — The Bottling Floor (y 1040–1680): two conveyor belts of corked breath running
 *                       opposite ways. The bottles crack and burst into gusts as they ride, and the
 *                       gusts ride with them — step on behind a burst and the belt carries you with
 *                       it. Past the second belt the capping rollers run until the line-brake on the
 *                       sorting floor is thrown. Warden: Corkwarden Seraphine Stopple.
 *   Hall III          — The Vane Gallery (y 330–1000): a zig-zag of wind tunnels, the draught against
 *                       you in each, with great weathervanes turning as blades in the way. Warden:
 *                       Vanesmith Tobin Haske.
 *   Throne            — (y 40–290): the hub of the palace's sails, where the King sits on his bellows.
 *
 * There is no health out here: a hazard throws you back to the last checkpoint.
 */

const W = 1800;
const H = 2600;
const L = 260;
const R = 1540;
const DOOR_L = 820;
const DOOR_R = 980;
const MID = 900;

// ── Hazards ──────────────────────────────────────────────────────────

const hazards: WorldHazard[] = [];

/** Hall I: three bellows rows. Each blows across the whole row; the blows run north in a wave. */
const BELLOWS_ROWS = [2130, 1995, 1860];
const ROW_H = 60;
const BELLOWS_PERIOD = 3600;
const BELLOWS_ON = 1600;
const BELLOWS_STEP = 1200;
/** Which wall a row's bellows stand on (they blow away from it). */
const rowWall = (row: number): -1 | 1 => (row % 2 === 0 ? -1 : 1);
const rowOffset = (row: number): number => -row * BELLOWS_STEP;
BELLOWS_ROWS.forEach((y, row) => {
  hazards.push({ kind: 'jet', rect: { x: L, y, w: R - L, h: ROW_H }, periodMs: BELLOWS_PERIOD, onMs: BELLOWS_ON, offsetMs: rowOffset(row), color: 0xe8fbff });
});
/** The draughts between the rows: floor grilles drawing toward an intake hopper at one wall. */
interface Draught { y: number; h: number; vx: number; hopper: Rect }
const DRAUGHTS: Draught[] = [
  { y: 2062, h: 60, vx: -60, hopper: { x: L, y: 2062, w: 70, h: 60 } },
  { y: 1927, h: 60, vx: 60, hopper: { x: R - 70, y: 1927, w: 70, h: 60 } },
];
for (const d of DRAUGHTS) {
  hazards.push(
    { kind: 'conveyor', rect: { x: L + 70, y: d.y, w: R - L - 140, h: d.h }, vx: d.vx, vy: 0, look: 'current' },
    { kind: 'floor', rect: d.hopper, safeWhen: { monarch: 'aerion' }, color: 0x2a3a5a },
  );
}

/** Hall II: two belts of bottles, with the bursts travelling along them at belt speed. */
interface Belt { y: number; h: number; vx: number }
const BELTS: Belt[] = [
  { y: 1490, h: 100, vx: 120 },
  { y: 1250, h: 100, vx: -120 },
];
const CELL = 80;
const CELLS = (R - L) / CELL;
const BURST_PERIOD = 3200;
/** A burst covers two cells as it rides. */
const BURST_ON = Math.round(((2 * CELL) / 120) * 1000);
/** Offset of cell `i` (0 = west end) on a belt — the burst reaches it `downstream index × cell time` late. */
const cellOffset = (b: Belt, i: number): number => {
  const down = b.vx > 0 ? i : CELLS - 1 - i;
  return -Math.round(((down * CELL) / Math.abs(b.vx)) * 1000);
};
/** The breaker hoppers at the downstream end of each belt — ride too far and in you go. */
const HOPPER_W = 90;
for (const b of BELTS) {
  hazards.push({ kind: 'conveyor', rect: { x: L, y: b.y, w: R - L, h: b.h }, vx: b.vx, vy: 0, look: 'belt' });
  for (let i = 0; i < CELLS; i++) {
    hazards.push({ kind: 'jet', rect: { x: L + i * CELL, y: b.y + 10, w: CELL, h: b.h - 20 }, periodMs: BURST_PERIOD, onMs: BURST_ON, offsetMs: cellOffset(b, i), color: 0xd8f4ff });
  }
}
const hopperRect = (b: Belt): Rect => ({ x: b.vx > 0 ? R - HOPPER_W : L, y: b.y - 12, w: HOPPER_W, h: b.h + 24 });
for (const b of BELTS) hazards.push({ kind: 'floor', rect: hopperRect(b), safeWhen: { monarch: 'aerion' }, color: 0x1a2a3a });
/** The capping rollers past the second belt — they stop when the line-brake is thrown. */
const PRESS_FLAG = 'lung-line-brake';
const CAPPING: Rect = { x: L, y: 1176, w: R - L, h: 58 };
hazards.push({ kind: 'floor', rect: CAPPING, safeWhen: { flag: PRESS_FLAG }, color: 0x5a6a8a });
const BRAKE_AT: Pt = { x: 1450, y: 1420 };

/** Hall III: the wind tunnels and the weathervanes turning in them. */
const W1_Y = 760;
const W2_Y = 560;
const TUNNEL_T = 30;
const W1_GAP: [number, number] = [1300, 1420];
const W2_GAP: [number, number] = [380, 500];
interface Vane { x: number; y: number; len: number; rad: number; phase: number }
const VANES: Vane[] = [
  { x: 1080, y: 895, len: 104, rad: 1.05, phase: 0.4 },
  { x: 1000, y: 675, len: 82, rad: -1.25, phase: 1.1 },
  { x: 680, y: 675, len: 82, rad: 1.35, phase: 2.6 },
];
for (const v of VANES) {
  hazards.push(
    { kind: 'sweeper', x: v.x, y: v.y, length: v.len, radPerSec: v.rad, phase: v.phase, color: 0x8a9aaa },
    { kind: 'sweeper', x: v.x, y: v.y, length: v.len * 0.85, radPerSec: v.rad, phase: v.phase + Math.PI, color: 0x8a9aaa },
  );
}
/** Tunnel draughts: the bottom tunnel blows west (you go east), the middle blows east (you go west). */
const TUNNELS: { rect: Rect; vx: number }[] = [
  { rect: { x: L, y: W1_Y + TUNNEL_T, w: R - L, h: 1000 - (W1_Y + TUNNEL_T) - 40 }, vx: -75 },
  { rect: { x: L, y: W2_Y + TUNNEL_T, w: R - L, h: W1_Y - (W2_Y + TUNNEL_T) }, vx: 75 },
];
for (const tn of TUNNELS) hazards.push({ kind: 'conveyor', rect: tn.rect, vx: tn.vx, vy: 0, look: 'current' });

// ── Gates ────────────────────────────────────────────────────────────

const gates: WorldGate[] = [
  { rect: { x: DOOR_L, y: 1680, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'lung-warden-1' }, look: 'cloud', label: 'Defeat the Bellowsmaster' },
  { rect: { x: DOOR_L, y: 1000, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'lung-warden-2' }, look: 'cloud', label: 'Defeat the Corkwarden' },
  { rect: { x: DOOR_L, y: 290, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'lung-warden-3' }, look: 'lightning', label: 'Defeat the Vanesmith' },
];

/** Timber-and-louvre partitions between the halls, a door in the middle of each. */
const CROSS_WALLS: { y: number; h: number }[] = [{ y: 2240, h: 40 }, { y: 1680, h: 40 }, { y: 1000, h: 40 }, { y: 290, h: 40 }];

const solids: Solid[] = [
  { kind: 'rect', x: 0, y: 0, w: L, h: H },
  { kind: 'rect', x: R, y: 0, w: W - R, h: H },
  { kind: 'rect', x: L, y: 0, w: R - L, h: 40 },
  { kind: 'rect', x: L, y: H - 36, w: R - L, h: 36 },
];
for (const c of CROSS_WALLS) {
  solids.push({ kind: 'rect', x: L, y: c.y, w: DOOR_L - L, h: c.h }, { kind: 'rect', x: DOOR_R, y: c.y, w: R - DOOR_R, h: c.h });
}
/** The tunnel walls of the Vane Gallery, each with one gap. */
const TUNNEL_WALLS: Rect[] = [
  { x: L, y: W1_Y, w: W1_GAP[0] - L, h: TUNNEL_T }, { x: W1_GAP[1], y: W1_Y, w: R - W1_GAP[1], h: TUNNEL_T },
  { x: L, y: W2_Y, w: W2_GAP[0] - L, h: TUNNEL_T }, { x: W2_GAP[1], y: W2_Y, w: R - W2_GAP[1], h: TUNNEL_T },
];
for (const t of TUNNEL_WALLS) solids.push({ kind: 'rect', x: t.x, y: t.y, w: t.w, h: t.h });
// The throne room narrows between sail-cloth buttresses.
solids.push({ kind: 'rect', x: L, y: 40, w: 180, h: 250 }, { kind: 'rect', x: R - 180, y: 40, w: 180, h: 250 });

// ── Ground ───────────────────────────────────────────────────────────

/** Limed oak boards, scrubbed pale — the Intake's floor, worn into paths where the collectors walk. */
function oakBoards(g: G, r: Rect, rng: () => number): void {
  const S = 26;
  g.fillStyle(OAK_DARK, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let y = r.y; y < r.y + r.h; y += S) {
    let x = r.x - rng() * 120;
    while (x < r.x + r.w) {
      const len = 90 + rng() * 140;
      const x0 = Math.max(r.x, x), x1 = Math.min(r.x + r.w, x + len - 2);
      if (x1 > x0) {
        g.fillStyle(rng() < 0.5 ? OAK : dim(OAK, 0.07), 1); g.fillRect(x0, y + 1, x1 - x0, Math.min(S - 2, r.y + r.h - y - 1));
        g.fillStyle(dim(OAK, 0.25), 0.5); g.fillCircle(x0 + 4, y + S / 2, 1.2); g.fillCircle(x1 - 4, y + S / 2, 1.2);
        if (rng() < 0.2) { g.lineStyle(1, dim(OAK, 0.18), 0.6); g.lineBetween(x0 + 10, y + 8 + rng() * 8, x1 - 10, y + 8 + rng() * 8); }
      }
      x += len;
    }
  }
}

/** Iron deck-plates with breath-grilles — the Bellows Hall. */
function ironDeck(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(0x24282e, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const S = 64;
  for (let y = r.y; y < r.y + r.h; y += S) {
    for (let x = r.x; x < r.x + r.w; x += S) {
      g.fillStyle(rng() < 0.5 ? 0x3a3f46 : 0x343940, 1); g.fillRect(x + 2, y + 2, S - 4, Math.min(S - 4, r.y + r.h - y - 4));
      g.fillStyle(0x5a6068, 1);
      for (const [dx, dy] of [[6, 6], [S - 6, 6], [6, S - 6], [S - 6, S - 6]]) if (y + dy < r.y + r.h) g.fillCircle(x + dx, y + dy, 2);
    }
  }
}

/** White-glazed tiles with drains, like a dairy — the Bottling Floor, where everything must be clean. */
function glazedTiles(g: G, r: Rect, rng: () => number): void {
  const S = 30;
  g.fillStyle(0x8a98a8, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let y = r.y; y < r.y + r.h; y += S) {
    for (let x = r.x; x < r.x + r.w; x += S) {
      g.fillStyle(rng() < 0.12 ? 0xc8dcec : 0xe4eef4, 1); g.fillRect(x + 1, y + 1, S - 2, Math.min(S - 2, r.y + r.h - y - 1));
    }
  }
  for (let x = r.x + 160; x < r.x + r.w; x += 320) {
    g.fillStyle(0x4a5868, 1); g.fillCircle(x, r.y + r.h / 2, 10);
    g.lineStyle(1.5, 0x8a98a8, 1); for (let k = -6; k <= 6; k += 4) g.lineBetween(x + k, r.y + r.h / 2 - 8, x + k, r.y + r.h / 2 + 8);
  }
}

/** Herringbone parquet — the long Vane Gallery, polished till the vanes are reflected in it. */
function herringbone(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(0x4a3220, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const S = 22;
  for (let y = r.y; y < r.y + r.h; y += S) {
    for (let x = r.x; x < r.x + r.w; x += S * 2) {
      const k = Math.floor((x - r.x) / (S * 2) + (y - r.y) / S) % 2;
      const c = rng() < 0.5 ? 0x8a6a42 : 0x7a5a38;
      g.fillStyle(c, 1);
      if (k === 0) g.fillRect(x + 1, y + 1, S * 2 - 2, Math.min(S / 2 - 1, r.y + r.h - y - 1));
      else g.fillRect(x + 1, y + 1, S - 2, Math.min(S - 2, r.y + r.h - y - 1));
      g.fillStyle(lit(c, 0.12), 0.5); g.fillRect(x + 1, y + 1, S * 2 - 2, 1);
    }
  }
}

/** A compass rose inlaid in brass under a vane. */
function compassRose(g: G, x: number, y: number, r: number): void {
  g.fillStyle(0x2a1a10, 0.6); g.fillCircle(x, y, r + 6);
  g.lineStyle(3, BRASS, 0.8); g.strokeCircle(x, y, r);
  g.lineStyle(1.5, BRASS, 0.5); g.strokeCircle(x, y, r * 0.7);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
    const len = k % 2 === 0 ? r * 0.95 : r * 0.55;
    const nx = -Math.sin(a) * r * 0.1, ny = Math.cos(a) * r * 0.1;
    g.fillStyle(k % 2 === 0 ? BRASS : BRASS_DARK, 0.85);
    g.fillTriangle(x + nx, y + ny, x - nx, y - ny, x + Math.cos(a) * len, y + Math.sin(a) * len);
  }
}

/** Beyond the palace walls: open sky and the tops of the clouds, far below the summit. */
function skyBeyond(g: G, rng: () => number): void {
  g.fillStyle(SKY, 1); g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 200) { g.fillStyle(SKY_DEEP, 0.05 + (y / H) * 0.12); g.fillRect(0, y, W, 200); }
  for (let i = 0; i < 70; i++) {
    const x = rng() < 0.5 ? rng() * (L - 40) : R + 40 + rng() * (W - R - 40);
    cloudPuff(g, x, rng() * H, 0.7 + rng() * 1.1, 0.75 + rng() * 0.25);
  }
}

/** The palace's outer walls: tall timber frames glazed with sky-glass, so the wind can be watched. */
function outerWall(g: G, x0: number, x1: number, rng: () => number): void {
  for (let y = 0; y < H; y += 90) {
    g.fillStyle(OAK_DARK, 1); g.fillRect(x0, y, x1 - x0, 90);
    g.fillStyle(lit(SKY, 0.25), 0.55); g.fillRect(x0 + 6, y + 8, x1 - x0 - 12, 74);
    g.fillStyle(0xffffff, 0.35); g.fillRect(x0 + 10, y + 12, 4, 40);
    if (rng() < 0.15) { g.lineStyle(1, 0xffffff, 0.6); g.lineBetween(x0 + 8, y + 20, x1 - 8, y + 60); }
  }
}

function paintGround(g: G, rng: () => number): void {
  skyBeyond(g, rng);

  // The Intake.
  oakBoards(g, { x: L, y: 2280, w: R - L, h: H - 36 - 2280 }, rng);
  // The collectors' path, worn grey down the middle of the boards.
  g.fillStyle(0x8a8478, 0.3); g.fillRect(MID - 60, 2280, 120, H - 36 - 2280);
  // The ledger rug under the assessor's desk: royal violet, the sigil woven in.
  g.fillStyle(ROYAL_DEEP, 1); g.fillRect(1120, 2370, 220, 130);
  g.fillStyle(ROYAL, 1); g.fillRect(1126, 2376, 208, 118);
  aerionSigil(g, 1230, 2440, 36, BRASS, 0.8);
  // The weighing ring at the door: a brass circle with a meter-dial inlaid, where breath is checked in.
  g.fillStyle(0x2a2418, 0.5); g.fillCircle(MID, 2400, 72);
  g.lineStyle(4, BRASS, 0.7); g.strokeCircle(MID, 2400, 68);
  aerionSigil(g, MID, 2400, 48, BRASS_DARK, 0.9);

  // Hall I — the Bellows Hall.
  ironDeck(g, { x: L, y: 1720, w: R - L, h: 520 }, rng);
  BELLOWS_ROWS.forEach((y, row) => {
    // The blow-channel: a long grille the bellows' breath runs along.
    g.fillStyle(0x161a20, 1); g.fillRect(L, y - 4, R - L, ROW_H + 8);
    g.fillStyle(0x2a3038, 1); g.fillRect(L, y, R - L, ROW_H);
    g.lineStyle(2, 0x4a525c, 1);
    for (let x = L + 8; x < R; x += 14) g.lineBetween(x, y + 4, x, y + ROW_H - 4);
    // Chevrons showing the way it blows.
    const d = -rowWall(row);
    for (let x = L + 80; x < R; x += 160) {
      g.lineStyle(3, BRASS, 0.3);
      g.lineBetween(x - d * 10, y + ROW_H / 2 - 12, x + d * 6, y + ROW_H / 2);
      g.lineBetween(x + d * 6, y + ROW_H / 2, x - d * 10, y + ROW_H / 2 + 12);
    }
  });
  for (const d of DRAUGHTS) {
    // Floor grilles drawing toward the hopper.
    g.fillStyle(0x1e2228, 1); g.fillRect(L, d.y, R - L, d.h);
    for (let x = L + 20; x < R - 20; x += 40) { g.fillStyle(0x0c0e12, 1); g.fillRect(x, d.y + 10, 24, d.h - 20); }
    const hp = d.hopper;
    g.fillStyle(0x060810, 1); g.fillRect(hp.x, hp.y, hp.w, hp.h);
    g.lineStyle(3, OVERDUE, 0.6); g.strokeRect(hp.x + 2, hp.y + 2, hp.w - 4, hp.h - 4);
  }
  // Warden I's dais: a round of riveted plate with the bellows' pressure gauge set in it.
  g.fillStyle(0x1a1e24, 1); g.fillCircle(MID, 1790, 70);
  g.lineStyle(5, BRASS, 0.8); g.strokeCircle(MID, 1790, 64);
  breathMeter(g, MID, 1790, 40, 0.8, 0.9);

  // Hall II — the Bottling Floor.
  glazedTiles(g, { x: L, y: 1040, w: R - L, h: 640 }, rng);
  // The capping line's bed, and the brake's floor plate on the sorting floor.
  g.fillStyle(0x3a4250, 1); g.fillRect(CAPPING.x, CAPPING.y - 6, CAPPING.w, CAPPING.h + 12);
  g.fillStyle(0x2a2e36, 1); g.fillRect(BRAKE_AT.x - 40, BRAKE_AT.y - 20, 80, 50);
  g.lineStyle(2, OVERDUE, 0.7); g.strokeRect(BRAKE_AT.x - 40, BRAKE_AT.y - 20, 80, 50);
  for (const b of BELTS) {
    const hr = hopperRect(b);
    g.fillStyle(0x0a1018, 1); g.fillRect(hr.x, hr.y, hr.w, hr.h);
  }
  // Warden II's dais: a ring of cork tiles with a great wax seal at the middle.
  g.fillStyle(dim(CORK, 0.3), 1); g.fillCircle(MID, 1105, 62);
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    g.fillStyle(k % 2 ? CORK : lit(CORK, 0.15), 1); g.fillCircle(MID + Math.cos(a) * 50, 1105 + Math.sin(a) * 50, 8);
  }
  g.fillStyle(ROYAL, 1); g.fillCircle(MID, 1105, 30);
  aerionSigil(g, MID, 1105, 22, lit(ROYAL, 0.5), 0.9);

  // Hall III — the Vane Gallery.
  herringbone(g, { x: L, y: 330, w: R - L, h: 670 }, rng);
  for (const v of VANES) compassRose(g, v.x, v.y, v.len);
  // Warden III's dais: a great compass rose of his own.
  compassRose(g, MID, 440, 70);

  // The Throne — the hub of the sails: boards laid radiating from the axle like a millstone's dress.
  g.fillStyle(0x3a2a1a, 1); g.fillRect(L + 180, 40, R - L - 360, 250);
  for (let k = 0; k < 40; k++) {
    const a = Math.PI * (k / 39);
    g.lineStyle(10, k % 2 ? 0x7a5a3a : 0x6a4a2e, 1);
    g.lineBetween(MID, 60, MID + Math.cos(a) * 520, 60 + Math.sin(a) * 520);
  }
  g.fillStyle(ROYAL_DEEP, 1); g.fillRect(MID - 46, 140, 92, 150);
  g.fillStyle(ROYAL, 1); g.fillRect(MID - 40, 140, 80, 150);
  for (let y = 160; y < 290; y += 34) aerionSigil(g, MID, y, 9, BRASS, 0.6);

  // The palace walls: sky-glass in timber, the wind visible beyond.
  outerWall(g, L - 40, L, rng);
  outerWall(g, R, R + 40, rng);
  // The breath-mains up both walls — the glass tubes from the sleepers' lips all feed into them.
  pipe(g, L - 10, 40, L - 10, H - 36, 12);
  pipe(g, R + 10, 40, R + 10, H - 36, 12);
  for (const c of CROSS_WALLS) {
    for (const [x0, x1] of [[L, DOOR_L], [DOOR_R, R]] as [number, number][]) {
      g.fillStyle(0x2a1e14, 1); g.fillRect(x0, c.y - 4, x1 - x0, c.h + 8);
      g.fillStyle(OAK_DARK, 1); g.fillRect(x0, c.y, x1 - x0, c.h);
      // Louvres — the partitions breathe too.
      g.lineStyle(3, dim(OAK_DARK, 0.4), 1);
      for (let x = x0 + 8; x < x1; x += 12) g.lineBetween(x, c.y + 4, x + 6, c.y + c.h - 4);
      g.fillStyle(BRASS, 1); g.fillRect(x0, c.y + c.h - 4, x1 - x0, 3);
    }
  }
  for (const t of TUNNEL_WALLS) {
    g.fillStyle(0x2a1e14, 1); g.fillRect(t.x, t.y - 4, t.w, t.h + 8);
    g.fillStyle(0x5a4630, 1); g.fillRect(t.x, t.y, t.w, t.h);
    g.lineStyle(2, dim(OAK_DARK, 0.4), 1);
    for (let x = t.x + 6; x < t.x + t.w; x += 10) g.lineBetween(x, t.y + 3, x + 5, t.y + t.h - 3);
  }
}

// ── Set pieces ───────────────────────────────────────────────────────

type Piece = NonNullable<AreaDef['painter']['pieces']>[number];
const pieces: Piece[] = [];

/** The becalmed, laid out in rows. Drawn in `animate` (they breathe); their pallets are solid. */
interface Sleeper { x: number; y: number; s: number; skin: number }
const SLEEPERS: Sleeper[] = [];
let si = 0;
const sleeperRow = (x0: number, y: number, n: number, dx: number): void => {
  for (let i = 0; i < n; i++) {
    SLEEPERS.push({ x: x0 + i * dx, y, s: 0.95, skin: BECALMED_SKINS[si++ % BECALMED_SKINS.length] });
  }
};
// The Intake: two rows each side of the collectors' path.
sleeperRow(330, 2330, 4, 92);
sleeperRow(330, 2520, 4, 92);
sleeperRow(1150, 2540, 4, 92);
// The Bellows Hall's north end, along the walls.
sleeperRow(330, 1760, 3, 92);
sleeperRow(1250, 1760, 2, 92);
// The Bottling Floor's sorting floor, between the belts.
sleeperRow(330, 1385, 2, 96);
sleeperRow(330, 1460, 2, 96);
sleeperRow(1050, 1385, 3, 96);
// The Vane Gallery's top tunnel.
sleeperRow(1180, 520, 3, 92);
for (const s of SLEEPERS) solids.push({ kind: 'rect', x: s.x - 32 * s.s, y: s.y - 10 * s.s, w: 64 * s.s, h: 14 * s.s });

/** Hall I: the great bellows at each row's blowing end, and the intake grille on the far wall. */
BELLOWS_ROWS.forEach((y, row) => {
  const wall = rowWall(row);
  const x = wall < 0 ? L + 10 : R - 10;
  pieces.push({
    x, y: y + ROW_H + 30, w: 120, h: 140, draw: (g) => {
      // The hanging frame the bellows work in.
      g.fillStyle(IRON, 1); g.fillRect(x - 8, y - 70, 16, ROW_H + 100);
      g.fillStyle(BRASS, 1); g.fillCircle(x, y - 70, 7);
      g.lineStyle(3, BRASS_DARK, 1); g.lineBetween(x, y - 64, x - wall * 60, y - 20);
    },
  });
  // The intake on the opposite wall: a round grille with a brass rim.
  const ix = wall < 0 ? R - 16 : L + 16;
  pieces.push({
    x: ix, y: y + ROW_H, w: 60, h: 90, draw: (g) => {
      g.fillStyle(0x0c0e12, 1); g.fillCircle(ix, y + ROW_H / 2, 26);
      g.lineStyle(4, BRASS, 1); g.strokeCircle(ix, y + ROW_H / 2, 26);
      g.lineStyle(2, 0x4a525c, 1);
      for (let k = -18; k <= 18; k += 6) g.lineBetween(ix + k, y + ROW_H / 2 - Math.sqrt(Math.max(0, 26 * 26 - k * k)) + 2, ix + k, y + ROW_H / 2 + Math.sqrt(Math.max(0, 26 * 26 - k * k)) - 2);
    },
  });
});

/** Hall II: the belt rollers at each end, and the capping line's gantry. */
for (const b of BELTS) {
  for (const x of [L + 6, R - 6]) {
    pieces.push({
      x, y: b.y + b.h + 6, w: 30, h: b.h + 20, draw: (g) => {
        g.fillStyle(IRON, 1); g.fillRect(x - 8, b.y - 6, 16, b.h + 12);
        g.fillStyle(0x5a6068, 1); for (let yy = b.y + 6; yy < b.y + b.h; yy += 18) g.fillCircle(x, yy, 4);
      },
    });
  }
}
pieces.push({
  x: MID, y: CAPPING.y, w: R - L, h: 80, draw: (g) => {
    // Two iron uprights and a low beam over the rollers; the cork hammers hang from it.
    const by = CAPPING.y - 30;
    g.fillStyle(IRON, 1); g.fillRect(L + 4, by, 14, CAPPING.h + 30); g.fillRect(R - 18, by, 14, CAPPING.h + 30);
    g.fillStyle(dim(IRON, 0.2), 1); g.fillRect(L + 4, by - 4, R - L - 8, 10);
    g.fillStyle(BRASS, 1); g.fillRect(L + 4, by + 4, R - L - 8, 2);
    for (let x = L + 60; x < R - 40; x += 80) { g.lineStyle(2, 0x5a6068, 1); g.lineBetween(x, by + 6, x, CAPPING.y - 12); }
    aerionSigil(g, MID, by - 6, 9, BRASS, 0.9);
  },
});
/** The line-brake: a great red-handled lever on the sorting floor. */
pieces.push({
  x: BRAKE_AT.x + 30, y: BRAKE_AT.y + 4, w: 60, h: 90, draw: (g) => {
    const bx = BRAKE_AT.x + 30, by = BRAKE_AT.y + 4;
    shadow(g, bx, by, 40, 10);
    g.fillStyle(IRON, 1); g.fillRect(bx - 14, by - 22, 28, 22);
    g.fillStyle(BRASS, 1); g.fillRect(bx - 16, by - 24, 32, 4);
    g.lineStyle(5, 0x5a6068, 1); g.lineBetween(bx, by - 20, bx - 8, by - 64);
    g.fillStyle(OVERDUE, 1); g.fillCircle(bx - 8, by - 66, 7);
  },
});
solids.push({ kind: 'rect', x: BRAKE_AT.x + 14, y: BRAKE_AT.y - 18, w: 32, h: 22 });

/** Bottle racks on the sorting floor: tiers of corked breath, tagged and waiting. */
function rack(x: number, y: number): void {
  pieces.push({
    x, y, w: 140, h: 120, draw: (g) => {
      shadow(g, x, y + 2, 140, 16);
      g.fillStyle(OAK_DARK, 1); g.fillRect(x - 64, y - 96, 8, 96); g.fillRect(x + 56, y - 96, 8, 96);
      for (let tier = 0; tier < 3; tier++) {
        const ty = y - 8 - tier * 32;
        g.fillStyle(OAK, 1); g.fillRect(x - 64, ty, 128, 5);
        for (let k = 0; k < 6; k++) breathBottle(g, x - 50 + k * 20, ty, 0.55, k + tier * 2, 1);
      }
    },
  });
  solids.push({ kind: 'rect', x: x - 64, y: y - 14, w: 128, h: 14 });
}
rack(720, 1480);
rack(700, 1080);

/** The collectors' ledger desk in the Intake: a tall clerk's desk, the great ledger open on it. */
pieces.push({
  x: 1230, y: 2400, w: 180, h: 140, draw: (g) => {
    shadow(g, 1230, 2400, 170, 22);
    g.fillStyle(OAK_DARK, 1); g.fillRect(1160, 2330, 140, 70);
    g.fillStyle(dim(OAK_DARK, 0.2), 1); g.fillRect(1160, 2320, 140, 12);
    g.fillStyle(0xf0e6c8, 1); g.fillRect(1180, 2290, 46, 32); g.fillRect(1228, 2290, 46, 32);
    g.lineStyle(1, 0x7a6a5a, 1);
    for (let k = 0; k < 6; k++) { g.lineBetween(1184, 2296 + k * 4, 1222, 2296 + k * 4); g.lineBetween(1232, 2296 + k * 4, 1270, 2296 + k * 4); }
    g.fillStyle(OVERDUE, 1); g.fillRect(1240, 2300, 26, 3);
    // An inkwell and a quill; a rack of empty bottles waiting to be filled.
    g.fillStyle(0x1a1a2a, 1); g.fillCircle(1288, 2314, 5);
    g.lineStyle(1.5, 0xf0f0f0, 1); g.lineBetween(1288, 2310, 1300, 2280);
    for (let k = 0; k < 4; k++) breathBottle(g, 1172 + k * 14, 2330, 0.42, 0, 0.6);
  },
});
solids.push({ kind: 'rect', x: 1160, y: 2370, w: 140, h: 30 });

/** The bellows-throne: two great bellows laid nose to nose under a seat of oak and violet plush. */
pieces.push({
  x: MID, y: 160, w: 300, h: 170, draw: (g) => {
    shadow(g, MID, 160, 260, 34, 0.4);
    bellows(g, MID - 70, 130, 150, 0, 0.8);
    bellows(g, MID + 70, 130, 150, Math.PI, 0.8);
    g.fillStyle(OAK_DARK, 1); g.fillRect(MID - 60, 70, 120, 20);
    g.fillStyle(ROYAL, 1); g.fillRoundedRect(MID - 54, 40, 108, 36, 10);
    g.fillStyle(lit(ROYAL, 0.25), 1); g.fillRect(MID - 48, 44, 96, 4);
    aerionSigil(g, MID, 30, 20, BRASS, 1);
  },
});
solids.push({ kind: 'rect', x: MID - 120, y: 100, w: 240, h: 60 });

/** Shelves of bottles either side of the throne — the King's own cellar, the oldest debts. */
for (const x of [600, 1200]) {
  pieces.push({
    x, y: 250, w: 100, h: 140, draw: (g) => {
      shadow(g, x, 250, 90, 14);
      g.fillStyle(OAK_DARK, 1); g.fillRect(x - 44, 140, 88, 110);
      for (let tier = 0; tier < 3; tier++) {
        g.fillStyle(OAK, 1); g.fillRect(x - 44, 172 + tier * 34, 88, 4);
        for (let k = 0; k < 4; k++) breathBottle(g, x - 30 + k * 20, 172 + tier * 34, 0.5, k * 3 + tier, 1);
      }
    },
  });
  solids.push({ kind: 'rect', x: x - 44, y: 230, w: 88, h: 20 });
}

// ── Animation ────────────────────────────────────────────────────────

const near = (v: Rect, x: number, y: number, pad: number): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

const jetPhase = (t: number, period: number, off: number): number => (((t * 1000 + off) % period) + period) % period;

function animateUnder(g: G, t: number, view: Rect): void {
  for (const s of SLEEPERS) {
    if (!near(view, s.x, s.y, 80)) continue;
    sleeper(g, s.x, s.y, s.s, t, s.skin);
  }
  // The half-woken: an empty pallet behind each, a broken bottle at their feet.
  for (const n of NPCS) {
    if (!near(view, n.at.x, n.at.y, 90)) continue;
    const x = n.at.x, y = n.at.y;
    g.fillStyle(OAK_DARK, 1); g.fillRect(x - 40, y - 30, 64, 10);
    g.fillStyle(0x5a6a8a, 0.8); g.fillRoundedRect(x - 36, y - 34, 30, 8, 3);
    breathBottle(g, x + 22, y + 6, 0.5, 0, 0.7, true);
    // Their breath coming back: a little puff every few seconds.
    const ph = (t * 0.45 + x * 0.002) % 1;
    g.fillStyle(BREATH, 0.6 * (1 - ph)); g.fillCircle(x + 4 + ph * 8, y - 52 - ph * 20, 3 + ph * 4);
  }
  // Hall I draughts: specks of dust skating toward the hopper.
  for (const d of DRAUGHTS) {
    if (!near(view, MID, d.y, 700)) continue;
    for (let i = 0; i < 14; i++) {
      const span = R - L - 140;
      const x = L + 70 + (((i * 97 + t * d.vx * 1.4) % span) + span) % span;
      g.fillStyle(BREATH, 0.35); g.fillRect(x, d.y + 10 + ((i * 17) % (d.h - 20)), 6, 1.5);
    }
  }
}

function animateOver(g: G, t: number, view: Rect): void {
  // Hall I: the bellows at each row, pumping; the blast running the row while it blows.
  BELLOWS_ROWS.forEach((y, row) => {
    if (!near(view, MID, y, 700)) return;
    const wall = rowWall(row);
    const ph = jetPhase(t, BELLOWS_PERIOD, rowOffset(row));
    const on = ph < BELLOWS_ON;
    // Full and swelling while it draws; crushed flat while it blows.
    const open = on ? Math.max(0.05, 1 - ph / 260) : Math.min(1, (ph - BELLOWS_ON) / (BELLOWS_PERIOD - BELLOWS_ON - 300));
    const warn = !on && ph > BELLOWS_PERIOD - 600;
    const shake = warn ? Math.sin(t * 60) * 2 : 0;
    const bx = wall < 0 ? L + 70 : R - 70;
    bellows(g, bx + shake, y + ROW_H / 2, 130, wall < 0 ? 0 : Math.PI, open, 1);
    if (on) {
      for (let i = 0; i < 26; i++) {
        const span = R - L;
        const along = ((i * 53 + ph * 1.1) % span);
        const x = wall < 0 ? L + along : R - along;
        windStreak(g, x, y + 8 + ((i * 23) % (ROW_H - 16)), wall < 0 ? 0 : Math.PI, 30 + (i % 4) * 10, 0.7);
      }
    } else if (warn) {
      g.fillStyle(0xffffff, 0.12 + Math.sin(t * 30) * 0.06); g.fillRect(L, y, R - L, ROW_H);
    }
  });
  // Hall II: the bottles riding the belts — and bursting into gusts where the jets are live.
  for (const b of BELTS) {
    if (!near(view, MID, b.y, 700)) continue;
    const span = R - L;
    for (let k = 0; k < 32; k++) {
      const x = L + ((((k * 40 + t * b.vx) % span) + span) % span);
      const i = Math.floor((x - L) / CELL);
      const live = jetPhase(t, BURST_PERIOD, cellOffset(b, i)) < BURST_ON;
      const y = b.y + 30 + (k % 3) * 22;
      if (live) {
        // A burst bottle: shards and a curl of loosed breath.
        for (let s = 0; s < 3; s++) {
          g.fillStyle(GLASS, 0.6); g.fillTriangle(x + s * 6 - 6, y - 4, x + s * 6 - 2, y - 10, x + s * 6, y - 2);
        }
        g.fillStyle(BREATH, 0.55); g.fillCircle(x + Math.sin(t * 8 + k) * 6, y - 18, 10);
        g.fillStyle(BREATH, 0.3); g.fillCircle(x + Math.sin(t * 6 + k) * 10, y - 28, 14);
      } else {
        breathBottle(g, x, y, 0.62, t + k, 1, jetPhase(t, BURST_PERIOD, cellOffset(b, i)) > BURST_PERIOD - 500);
      }
    }
  }
  // The capping rollers, spinning — until the brake is thrown.
  if (near(view, MID, CAPPING.y, 700)) {
    let running = true;
    try { running = !saveTest({ flag: PRESS_FLAG }); } catch { /* no save loaded (validator) */ }
    for (let x = L + 20; x < R - 10; x += 40) {
      const a = running ? t * 9 + x : x;
      g.fillStyle(0x5a6068, 1); g.fillCircle(x, CAPPING.y + CAPPING.h / 2, 16);
      g.lineStyle(2, 0x2a2e36, 1);
      g.lineBetween(x + Math.cos(a) * 14, CAPPING.y + CAPPING.h / 2 + Math.sin(a) * 14, x - Math.cos(a) * 14, CAPPING.y + CAPPING.h / 2 - Math.sin(a) * 14);
    }
    // The cork hammers: thumping corks home while the line runs, hung up idle once it is braked.
    for (let x = L + 60; x < R - 40; x += 80) {
      const hit = running ? Math.max(0, Math.sin(t * 7 + x * 0.05)) : 0;
      g.lineStyle(2, 0x5a6068, 1); g.lineBetween(x, CAPPING.y - 12, x, CAPPING.y - 12 + hit * 30);
      g.fillStyle(CORK, 1); g.fillRect(x - 7, CAPPING.y - 14 + hit * 30, 14, 10);
      g.fillStyle(ROYAL, 1); g.fillCircle(x, CAPPING.y - 9 + hit * 30, 2);
    }
  }
  // Hall III: the weathervanes over their sweepers, and the tunnel draughts made visible.
  for (const v of VANES) {
    if (!near(view, v.x, v.y, v.len + 40)) continue;
    weathervane(g, v.x, v.y, v.phase + t * v.rad, v.len, 1, 0x3a4048);
  }
  for (const tn of TUNNELS) {
    if (!near(view, MID, tn.rect.y + tn.rect.h / 2, 700)) continue;
    for (let i = 0; i < 16; i++) {
      const span = tn.rect.w;
      const along = (((i * 131 + t * tn.vx * 2.2) % span) + span) % span;
      windStreak(g, tn.rect.x + along, tn.rect.y + 14 + ((i * 41) % (tn.rect.h - 28)), tn.vx > 0 ? 0 : Math.PI, 36, 0.45);
    }
  }
  // The throne: the palace's four great sails turning overhead, their shadows sweeping the floor.
  if (near(view, MID, 160, 600)) {
    for (let k = 0; k < 4; k++) {
      const a = t * 0.22 + (k / 4) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      g.fillStyle(0x000000, 0.08);
      g.fillTriangle(MID, 20, MID + ca * 700 - sa * 60, 20 + sa * 700 + ca * 60, MID + ca * 700 + sa * 60, 20 + sa * 700 - ca * 60);
    }
    sailArm(g, MID, 0, Math.PI / 2 + Math.sin(t * 0.22) * 0.3, 40, 18, 0.6);
    glow(g, MID, 60, 70 + Math.sin(t * 1.2) * 8, ROYAL, 0.025, 3);
  }
  // Loose breath drifts everywhere up here, and the wind keeps a feather or two moving.
  motes(g, view, t, 16, BREATH, -14, 50, 1.6, 41);
  motes(g, view, t * 0.7, 6, SAILCLOTH, 22, 70, 1.4, 9);
  // Cloud blowing past the window-walls.
  for (let i = 0; i < 4; i++) {
    const y = view.y + ((t * 30 + i * 377) % (view.h + 200)) - 100;
    const x = i % 2 ? L - 20 : R + 20;
    cloudPuff(g, x, y, 0.5, 0.35, CLOUD);
  }
}

// ── People: the half-woken ───────────────────────────────────────────

const NPCS: NpcDef[] = [
  {
    id: 'lung-puffett', name: 'Widow Gussie Puffett', title: 'Laundress of Windlass, becalmed',
    look: { body: BECALMED_SKINS[0], accent: 0x5a6a8a, hat: 'nightcap', traits: ['apron', 'scarf'], size: 0.95, eye: 0xd8ecff },
    at: { x: 600, y: 2430 },
    talks: [
      {
        when: { monarch: 'aerion' },
        lines: [
          'Listen. LISTEN. That is me breathing. In, and out, and nobody writing it down.',
          'They corked me over a fortnight\'s washing-wind. I dried the whole quay\'s sheets on that wind. Taxed.',
          'Somebody\'s smashing the bottles upstairs. Every one that goes, somebody down here sits up and coughs.',
          'Go and tell the sky he\'s gone. It\'ll want to know.',
        ],
      },
      {
        when: { encounter: 'lung-warden-1' },
        lines: [
          '...the bellows stopped. I felt it. Like a hand coming off your chest.',
          'Mind the bottling floor. They put us on the belt in glass. Don\'t ride a belt into the end of it.',
        ],
      },
      {
        lines: [
          '...is it collection day? I paid. I paid in sighs, mostly. They don\'t count the sighs...',
          '...you\'re breathing ever so loud, dearie. They\'ll meter that. They meter everything above the clouds.',
          'The bellows hall\'s next. They breathe out in a row, south first, then on north. Go behind the breath.',
          'Never in front of it. In front of it you go out the window.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'aerion' }, lines: ['In. Out. Mine.', 'Free wind for the washing!'] },
      { lines: ['...paid in sighs...', '...they don\'t count the sighs...', '...is it collection day...'] },
    ],
  },
  {
    id: 'lung-pim', name: 'Pim Draycott', title: 'Bellows-boy, becalmed',
    look: { body: BECALMED_SKINS[4], accent: 0x6a4a2a, hat: 'nightcap', traits: ['scarf'], size: 0.72, eye: 0xd8ecff },
    at: { x: 1440, y: 1790 },
    talks: [
      {
        when: { monarch: 'aerion' },
        lines: [
          'I can SHOUT again! Listen! AAAAAAH! ...Nobody fined me! AAAAAAH!',
          'I worked the bellows before they corked me. Pumped my own mum\'s breath up the pipe. I didn\'t know.',
          'When I\'m big I\'m going to build a kite the size of this whole palace and NOT PAY FOR THE WIND.',
        ],
      },
      {
        when: { encounter: 'lung-warden-1' },
        lines: [
          'You beat old Gasket! He made us count breaths. One-and, two-and. I can still hear him.',
          'Past here\'s the bottling floor. The bottles go pop when they crack. The pop rides along the belt.',
          'So you ride behind it! Like behind a cart. That\'s what I\'d do. If I wasn\'t so sleepy.',
        ],
      },
      {
        lines: [
          '...psst. The rows go one, two, three. Back row first. Then the middle. Then this one.',
          'When the back row\'s blown out, step over it. Wait. Then the middle\'s done. Step. Easy.',
          'Don\'t stand on the grilles too long. They suck you to the hopper. That\'s where the dust goes.',
          '...I\'m not crying. It\'s the draught. It makes your eyes go.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'aerion' }, lines: ['AAAAAH! Free!', 'A kite the size of a palace!'] },
      { lines: ['...one-and, two-and...', '...back row first...', '...it\'s the draught...'] },
    ],
  },
  {
    id: 'lung-spindle', name: 'Old Corrigan Spindle', title: 'Kite-maker of Galeward, becalmed',
    look: { body: BECALMED_SKINS[3], accent: 0x8a3a2a, hat: 'aviator', traits: ['beard', 'glasses'], size: 1.1, eye: 0xd8ecff },
    at: { x: 600, y: 1420 },
    talks: [
      {
        when: { monarch: 'aerion' },
        lines: [
          'Ninety years I flew kites off the Galeward shoulder. He taxed the string. The STRING. It was holding wind.',
          'My breath was in a bottle on that rack. Third tier, sixth along. I watched it for a year.',
          'I\'m going to sit on the windward edge and breathe at the sky till it gives up and calls me Sir.',
        ],
      },
      {
        when: { encounter: 'lung-warden-2' },
        lines: [
          'Stopple beaten? Then nobody\'s corking anybody today. Ha. HA. Hoo. Careful, Spindle, you\'ve only the one.',
          'The gallery\'s past her. Tunnels with the wind in your face, and vanes turning in them like threshers.',
        ],
      },
      {
        when: { flag: 'lung-line-brake' },
        lines: [
          'You threw the brake! Listen — no hammers. First quiet on this floor in eleven years.',
          'The rollers are stopped. Walk right over them. Mind the second belt; it still runs the other way.',
        ],
      },
      {
        lines: [
          '...mm? Another one for the racks? No — you\'ve no cork. Good. Keep it that way.',
          'The bottles crack as they ride and burst into gusts. The gust rides along with them, see? Same speed.',
          'Step on just behind a burst and the belt keeps you behind it. Off the far side before the next.',
          'And the rollers past the second belt — there\'s a brake by the east wall here. Red handle. Pull it.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'aerion' }, lines: ['Taxed the STRING.', 'Third tier, sixth along. Not any more.'] },
      { lines: ['...behind the burst...', '...red handle, east wall...', '...no cork, good...'] },
    ],
  },
  {
    id: 'lung-lark', name: 'Nurse Aubade Lark', title: 'Night-nurse of the Slumber Court, becalmed',
    look: { body: BECALMED_SKINS[2], accent: 0xe8e0f0, hat: 'nightcap', traits: ['satchel', 'lantern'], size: 1.0, eye: 0xd8ecff },
    at: { x: 1450, y: 1100 },
    talks: [
      {
        when: { monarch: 'aerion' },
        lines: [
          'I\'m going down the rows taking pulses. They\'re all coming up. Slowly. Like divers.',
          'They corked me for singing. A lullaby uses a lot of breath, apparently. Forty breaths a verse. Taxed.',
          'I shall sing the longest lullaby on Highspire tonight. Every verse. Twice.',
        ],
      },
      {
        when: { encounter: 'lung-warden-2' },
        lines: [
          'Stopple\'s down. She corked me herself. She said "hold still, it\'s only air".',
          'Past the gate the wind blows against you in the tunnels. The vanes are on the wind. Watch the arrowheads.',
        ],
      },
      {
        lines: [
          '...shh. They\'re sleeping. Four breaths a minute, the meter says. Enough to live. Not enough to wake.',
          'The Corkwarden keeps this end. She stamps a cork on you in the fight. If you\'re corked, you can\'t cast.',
          'Find your own bottle on the belt and break it. Your breath goes back into you. Don\'t let her drink it.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'aerion' }, lines: ['Pulses coming up.', 'Every verse. Twice.'] },
      { lines: ['...four breaths a minute...', '...shh...', '...don\'t let her drink it...'] },
    ],
  },
  {
    id: 'lung-quill', name: 'Ossory Quill', title: 'Late Assessor of Breath, becalmed',
    look: { body: BECALMED_SKINS[1], accent: ROYAL_DEEP, hat: 'tophat', traits: ['book', 'glasses'], size: 1.05, eye: 0xd8ecff },
    at: { x: 600, y: 470 },
    talks: [
      {
        when: { monarch: 'aerion' },
        lines: [
          'I assessed breath for him for twenty years. I want you to know that before you are kind to me.',
          'Then I made an error in his favour of a quarter-breath, and he called it fraud, and corked me.',
          'I have the ledgers. All of them. I am going to read out every name to the sky.',
        ],
      },
      {
        when: { encounter: 'lung-warden-3' },
        lines: [
          'Haske is beaten. Then the hub is open and he is there, on the bellows. He will tax you first.',
          'Then he inhales. Everything. Then he wears the storm. Then — if you are still there — he lets it all out.',
          'All the breath he has ever taken. At once. I have the figures. You do not want the figures.',
        ],
      },
      {
        lines: [
          '...an assessor. I was an assessor. Every breath above the cloud line at a quarter-groat. I did the sums.',
          'The vanes in the tunnels turn on the wind. Time the arrowhead and the tail both — the tail cuts too.',
          'The Vanesmith keeps his rose by the throne door. His wind changes. Read the tunnel shutters.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'aerion' }, lines: ['Every name. To the sky.', 'A quarter-breath. A QUARTER.'] },
      { lines: ['...a quarter-groat...', '...I did the sums...', '...the tail cuts too...'] },
    ],
  },
  {
    id: 'lung-wren', name: 'Dilly Wren', title: 'Rope-bridge walker, becalmed',
    look: { body: BECALMED_SKINS[5], accent: 0x3a6a5a, hat: 'plume', traits: ['pack'], size: 0.9, eye: 0xd8ecff },
    at: { x: 1440, y: 620 },
    talks: [
      {
        when: { monarch: 'aerion' },
        lines: [
          'You know what I\'m going to do? Walk the longest rope-bridge on the isle and SHOUT halfway.',
          'They corked me for whistling on a bridge. Whistling! A girl has to keep her nerve somehow.',
        ],
      },
      {
        when: { encounter: 'lung-warden-3' },
        lines: [
          'The vanes stopped spinning! They\'re just pointing now. All at the throne. Even they don\'t like him.',
          'The King\'s through there. Go on. I\'d come but my legs think they\'re still asleep.',
        ],
      },
      {
        lines: [
          '...this tunnel blows the other way from the one below. Lean into it. Like on a bridge.',
          'Two vanes in the middle tunnel. They turn opposite ways. Wait for both arrows to point along the wall.',
          'I used to whistle at this bit. I can\'t now. You whistle for me.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'aerion' }, lines: ['SHOUT halfway!', 'Whistle, whistle!'] },
      { lines: ['...lean into it...', '...two vanes, opposite ways...', '...you whistle for me...'] },
    ],
  },
];

// ── POIs ─────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  {
    kind: 'door', at: { x: MID, y: 2530 }, to: 'starfall', arrive: { x: 1200, y: 260 },
    label: 'The Summit Stair — back down to Starfall',
  },
  { kind: 'waystone', at: { x: 760, y: 2450 } },
  { kind: 'lever', at: BRAKE_AT, flag: PRESS_FLAG, label: 'The Line-Brake' },
  { kind: 'encounter', id: 'lung-warden-1' },
  { kind: 'encounter', id: 'lung-warden-2' },
  { kind: 'encounter', id: 'lung-warden-3' },
  { kind: 'monarch', id: 'aerion', at: { x: MID, y: 215 } },
  { kind: 'sign', at: { x: 1040, y: 2460 }, text: 'THE LUNG. All breath above the cloud line is the King\'s. Bottles to be checked in at the desk.' },
  { kind: 'sign', at: { x: 1060, y: 2222 }, text: 'BELLOWS HALL. The rows blow in turn, south to north. Keep off the grilles. Mind the hoppers.' },
  { kind: 'sign', at: { x: 1060, y: 1650 }, text: 'BOTTLING FLOOR. Cracked stock bursts on the belt. The line-brake is for the Corkwarden\'s use only.' },
  { kind: 'sign', at: { x: 700, y: 970 }, text: 'VANE GALLERY. The wind is the King\'s and blows where he says. Keep clear of the vanes.' },
  { kind: 'chest', id: 'lung-chest-bellows', at: { x: 1100, y: 1800 }, coins: 300, orbs: 3 },
  { kind: 'chest', id: 'lung-chest-bottling', at: { x: 950, y: 1420 }, item: 'charm-lung-corked-breath', coins: 160 },
  { kind: 'chest', id: 'lung-chest-gallery', at: { x: 1460, y: 900 }, item: 'charm-lung-vane-feather', orbs: 4 },
  { kind: 'chest', id: 'lung-chest-throne', at: { x: 640, y: 262 }, coins: 520, orbs: 8, open: { monarch: 'aerion' } },
];

export const LUNG_AREA: AreaDef = {
  id: 'lung',
  isle: 'air',
  name: 'The Lung',
  subtitle: 'King Aerion\'s windmill-palace on the summit, where the isle\'s breath is kept',
  w: W,
  h: H,
  bg: SKY,
  accent: ROYAL,
  weather: 'wind',
  spawn: { x: MID, y: 2440 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver },
  solids,
  exits: [],
  pois: POIS,
  npcs: NPCS,
  gloom: 0.1,
  hazards,
  gates,
  checkpoints: [
    { x: MID, y: 2440 },   // the Intake
    { x: MID, y: 2215 },   // the bellows hall door
    { x: MID, y: 2088 },   // between rows one and two
    { x: MID, y: 1956 },   // between rows two and three
    { x: MID, y: 1790 },   // Gasket's dais
    { x: MID, y: 1640 },   // the bottling floor's south end
    { x: MID, y: 1420 },   // the sorting floor
    { x: MID, y: 1245 },   // between the second belt and the rollers
    { x: MID, y: 1105 },   // Stopple's dais
    { x: MID, y: 970 },    // the gallery door
    { x: 1360, y: 880 },   // past the first vane
    { x: 1360, y: 675 },   // the middle tunnel's east end
    { x: 440, y: 675 },    // the middle tunnel's west end
    { x: 440, y: 470 },    // the top tunnel
    { x: MID, y: 440 },    // Haske's rose
    { x: MID, y: 265 },    // the hub
  ],
};
