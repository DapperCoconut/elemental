import type { AreaDef, NpcDef, Poi, Pt, Rect, Solid, WorldGate, WorldHazard } from '../../../../IslesTypes';
import { type G, dim, flagstones, glow, lit, motes, shadow } from '../../../../art/IsleArt';
import {
  ABYSS, BARNACLE, CORAL, FOAM, GOLD, KELP, PEARL, STONE, STONE_LIT, TEAL,
  caustics, coralBranch, coralPillar, kelp, maresaSigil, nacre, rippledSand, sleeperInBubble,
} from './art';

/**
 * The Undertow — Queen Maresa's drowned palace at the bottom of the maelstrom.
 *
 * You come down the Drowning Stair from the Abyssal Court and climb *up* through the palace,
 * against the water: three halls, each a different way the sea tries to keep you, each closed
 * by a warden. The walls are lined with the drowned — every household that could not pay the
 * Dry Tithe, asleep in bubbles of held water, kept as "ballast for the crown".
 *
 *   Stair     — (y 2300–2560) the landing, a waystone, the door home.
 *   Hall I    — The Sluice Hall (y 1760–2300): three rows of sluice-mouths in the walls. Each row
 *               fires from the west and then from the east, never both — weave through the side
 *               that has gone quiet. Warden: Sluicemaster Grue.
 *   Hall II   — The Current Hall (y 1040–1720): two opposing undertow lanes that drag you into
 *               the drain-mouths, then the Great Eel coiled round its pillar, sweeping its disc,
 *               with side currents that pull you into its reach. Warden: Eel-Wrangler Voss.
 *   Hall III  — The Flooded Gallery (y 330–1000): the old portrait gallery, sunk under black
 *               water. Run the spout-walk to the Sluice Lever and the gallery drains — all but the
 *               throne sumps, which drain for no one but the Queen. Warden: Bell-Diver Mire.
 *   Throne    — (y 40–290): the clam throne.
 *
 * There is no health out here: a hazard throws you back to the last checkpoint.
 */

const W = 1800;
const H = 2600;
const L = 280;
const R = 1520;
const DOOR_L = 820;
const DOOR_R = 980;
const MID = 900;

// ── Hazards ──────────────────────────────────────────────────────────

const hazards: WorldHazard[] = [];

/** Hall I sluice rows: the west mouth and the east mouth take turns, overlapping in the middle. */
const SLUICE_ROWS = [2180, 2060, 1940];
const SLUICE_H = 44;
const SLUICE_PERIOD = 3200;
const SLUICE_ON = 1300;
const SPAN = Math.round((R - L) * 0.6);
SLUICE_ROWS.forEach((y, row) => {
  const off = row * 820;
  hazards.push(
    { kind: 'jet', rect: { x: L, y, w: SPAN, h: SLUICE_H }, periodMs: SLUICE_PERIOD, onMs: SLUICE_ON, offsetMs: off, color: 0x7ad8f0 },
    // The east mouth fires half a period later — while the west is quiet.
    { kind: 'jet', rect: { x: R - SPAN, y, w: SPAN, h: SLUICE_H }, periodMs: SLUICE_PERIOD, onMs: SLUICE_ON, offsetMs: off + SLUICE_PERIOD / 2, color: 0x7ad8f0 },
  );
});

/** Hall II undertow lanes: one runs east, the one above it west; each ends in a drain-mouth. */
const LANES: { rect: Rect; vx: number }[] = [
  { rect: { x: L, y: 1570, w: R - L, h: 60 }, vx: 170 },
  { rect: { x: L, y: 1480, w: R - L, h: 60 }, vx: -170 },
];
for (const ln of LANES) hazards.push({ kind: 'conveyor', rect: ln.rect, vx: ln.vx, vy: 0, look: 'current' });
const DRAINS: Rect[] = [
  { x: R - 90, y: 1570, w: 90, h: 60 },
  { x: L, y: 1480, w: 90, h: 60 },
];
hazards.push(
  { kind: 'jet', rect: DRAINS[0], periodMs: 1700, onMs: 950, color: 0x2a6a9a },
  { kind: 'jet', rect: DRAINS[1], periodMs: 1700, onMs: 950, offsetMs: 850, color: 0x2a6a9a },
);
/** The Great Eel — coiled round its pillar, sweeping the whole disc of the hall's middle. */
const EEL = { x: MID, y: 1310, length: 200, rad: 1.05, phase: 0 };
hazards.push({ kind: 'sweeper', x: EEL.x, y: EEL.y, length: EEL.length, radPerSec: EEL.rad, phase: EEL.phase, color: 0x3aa87a });
/** The side currents: safe of the eel, but they pull you sideways into its reach. */
const SIDE_CURRENTS: { rect: Rect; vx: number }[] = [
  { rect: { x: L, y: 1140, w: 400, h: 320 }, vx: 105 },
  { rect: { x: R - 400, y: 1140, w: 400, h: 320 }, vx: -105 },
];
for (const sc of SIDE_CURRENTS) hazards.push({ kind: 'conveyor', rect: sc.rect, vx: sc.vx, vy: 0, look: 'current' });

/** Hall III spout-walk: water spouts across the landing either side of the gallery door. */
const SPOUTS: { x: number; off: number }[] = [
  { x: 460, off: 0 }, { x: 600, off: 1100 },
  { x: 1140, off: 550 }, { x: 1280, off: 1650 },
];
for (const s of SPOUTS) {
  hazards.push({ kind: 'jet', rect: { x: s.x, y: 890, w: 60, h: 110 }, periodMs: 2200, onMs: 1100, offsetMs: s.off, color: 0x9ae8ff });
}
/** The flooded gallery — black water until the Sluice Lever is pulled. */
const GALLERY: Rect = { x: L, y: 560, w: R - L, h: 320 };
hazards.push({ kind: 'floor', rect: GALLERY, safeWhen: { flag: 'undertow-sluice' }, color: 0x123a6a });
/** The throne sumps: deep holes in the gallery floor that drain only when the Queen falls. */
const SUMPS: Rect[] = [
  { x: L, y: 640, w: 500, h: 70 },
  { x: R - 500, y: 640, w: 500, h: 70 },
  { x: 520, y: 770, w: 760, h: 60 },
];
for (const s of SUMPS) hazards.push({ kind: 'floor', rect: s, safeWhen: { monarch: 'maresa' }, color: 0x0a1a3a });
/** Bubble vents before the warden's dais: four geysers of rising air taking turns. */
const VENTS: Rect[] = [0, 1, 2, 3].map((i) => ({ x: 400 + i * 270, y: 470, w: 80, h: 70 }));
VENTS.forEach((v, i) => hazards.push({ kind: 'jet', rect: v, periodMs: 2400, onMs: 900, offsetMs: (i % 2) * 1200 + i * 150, color: 0xd8f8ff }));

// ── Gates ────────────────────────────────────────────────────────────

const gates: WorldGate[] = [
  { rect: { x: DOOR_L, y: 1720, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'undertow-warden-1' }, look: 'sluice', label: 'Defeat the Sluicemaster' },
  { rect: { x: DOOR_L, y: 1000, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'undertow-warden-2' }, look: 'coral', label: 'Defeat the Eel-Wrangler' },
  { rect: { x: DOOR_L, y: 290, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'undertow-warden-3' }, look: 'ice', label: 'Defeat the Bell-Diver' },
];

const CROSS_WALLS: { y: number; h: number }[] = [{ y: 1720, h: 40 }, { y: 1000, h: 40 }, { y: 290, h: 40 }];

const solids: Solid[] = [
  { kind: 'rect', x: 0, y: 0, w: L, h: H },
  { kind: 'rect', x: R, y: 0, w: W - R, h: H },
  { kind: 'rect', x: L, y: 0, w: R - L, h: 40 },
  { kind: 'rect', x: L, y: H - 36, w: R - L, h: 36 },
];
for (const c of CROSS_WALLS) {
  solids.push({ kind: 'rect', x: L, y: c.y, w: DOOR_L - L, h: c.h }, { kind: 'rect', x: DOOR_R, y: c.y, w: R - DOOR_R, h: c.h });
}
// The throne room narrows between pearl buttresses.
solids.push({ kind: 'rect', x: L, y: 40, w: 190, h: 250 }, { kind: 'rect', x: R - 190, y: 40, w: 190, h: 250 });

// ── Ground ───────────────────────────────────────────────────────────

/** A sluice trough: a stone channel cut across the hall, green with weed, wet to the lip. */
function sluiceTrough(g: G, y: number, rng: () => number): void {
  g.fillStyle(0x020608, 1); g.fillRect(L, y - 6, R - L, SLUICE_H + 12);
  g.fillStyle(0x0e2a34, 1); g.fillRect(L, y, R - L, SLUICE_H);
  for (let i = 0; i < 46; i++) {
    g.fillStyle(rng() < 0.5 ? 0x1e4a3a : 0x0a1e24, 0.7);
    g.fillEllipse(L + rng() * (R - L), y + 6 + rng() * (SLUICE_H - 12), 20 + rng() * 50, 4 + rng() * 6);
  }
  g.lineStyle(3, 0x3a5a58, 1); g.lineBetween(L, y - 4, R, y - 4); g.lineBetween(L, y + SLUICE_H + 4, R, y + SLUICE_H + 4);
  // The overlap where both mouths reach — marked with a brass strip so you know it never rests.
  const ox0 = R - SPAN, ox1 = L + SPAN;
  g.fillStyle(GOLD, 0.18); g.fillRect(ox0, y - 4, ox1 - ox0, 3); g.fillRect(ox0, y + SLUICE_H + 1, ox1 - ox0, 3);
}

/** A sunken basin with steps down on every side — the drowned portrait gallery's floor. */
function galleryBasin(g: G, rng: () => number): void {
  const r = GALLERY;
  for (let k = 3; k >= 0; k--) {
    g.fillStyle(mixStep(k), 1); g.fillRect(r.x, r.y - k * 8, r.w, r.h + k * 16);
  }
  // The old chequered marble, stained by the sea.
  const S = 40;
  for (let y = r.y + 4; y < r.y + r.h - 4; y += S) {
    for (let x = r.x; x < r.x + r.w; x += S) {
      const dark = ((x - r.x) / S + (y - r.y) / S) % 2 < 1;
      g.fillStyle(dark ? 0x101820 : 0x6a7a80, 1); g.fillRect(x + 1, y + 1, S - 2, Math.min(S - 2, r.y + r.h - 4 - y));
    }
  }
  for (let i = 0; i < 60; i++) {
    g.fillStyle(0x1e4a3a, 0.35); g.fillEllipse(r.x + rng() * r.w, r.y + rng() * r.h, 50 + rng() * 80, 14 + rng() * 20);
  }
  // A portrait fallen face-down, a chandelier on its side.
  g.fillStyle(0x3a2a1a, 1); g.fillRect(1180, 600, 90, 60); g.fillStyle(0x1a120a, 1); g.fillRect(1186, 606, 78, 48);
  g.lineStyle(2, GOLD, 0.5); g.strokeCircle(460, 840, 28); g.lineBetween(432, 840, 488, 840); g.lineBetween(460, 812, 460, 868);
  for (const s of SUMPS) {
    g.fillStyle(0x000000, 1); g.fillRect(s.x, s.y - 6, s.w, s.h + 12);
    g.fillStyle(0x040a18, 1); g.fillRect(s.x + 4, s.y, s.w - 8, s.h);
    g.lineStyle(2, 0x3a4a5a, 0.9); g.strokeRect(s.x + 2, s.y - 2, s.w - 4, s.h + 4);
  }
}
const mixStep = (k: number): number => [0x2a383e, 0x222e34, 0x1a242a, 0x121a20][k];

/** The Drowning Stair at the bottom: broad wet steps down to the Abyssal door. */
function stair(g: G, rng: () => number): void {
  for (let i = 0; i < 9; i++) {
    const y = 2300 + i * 28;
    g.fillStyle(i % 2 ? 0x24343a : 0x2c3e44, 1); g.fillRect(L, y, R - L, 28);
    g.fillStyle(lit(0x2c3e44, 0.15), 1); g.fillRect(L, y, R - L, 3);
    g.fillStyle(0x0a1418, 0.6); g.fillRect(L, y + 24, R - L, 4);
    for (let k = 0; k < 12; k++) {
      g.fillStyle(0x2a5a4a, 0.4); g.fillEllipse(L + rng() * (R - L), y + 10 + rng() * 10, 20 + rng() * 40, 4);
    }
  }
  // The welcome mosaic: the sigil set into the landing, picked out in shell.
  g.fillStyle(0x0a1418, 0.7); g.fillCircle(MID, 2400, 70);
  maresaSigil(g, MID, 2400, 56, 0x8a7a5a, 0.85);
  maresaSigil(g, MID, 2400, 52, GOLD, 0.25);
}

function paintGround(g: G, rng: () => number): void {
  // The seabed outside the palace walls.
  g.fillStyle(ABYSS, 1); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 420; i++) {
    g.fillStyle(rng() < 0.5 ? 0x061420 : 0x0a1a28, 1);
    g.fillEllipse(rng() * W, rng() * H, 40 + rng() * 140, 20 + rng() * 60);
  }

  stair(g, rng);

  // Hall I — slick green flagstones running with water between the troughs.
  flagstones(g, { x: L, y: 1760, w: R - L, h: 540 }, 44, 0x22383a, 0x0a1618, rng);
  for (let i = 0; i < 80; i++) {
    g.fillStyle(0x5ac8d8, 0.06 + rng() * 0.06); g.fillEllipse(L + rng() * (R - L), 1760 + rng() * 540, 30 + rng() * 60, 6 + rng() * 6);
  }
  for (const y of SLUICE_ROWS) sluiceTrough(g, y, rng);
  // Warden I's dais: a round sluice-gate set flat into the floor.
  g.fillStyle(0x0a1418, 1); g.fillCircle(MID, 1830, 74);
  g.fillStyle(0x3a4a4a, 1); g.fillCircle(MID, 1830, 66);
  g.lineStyle(5, 0x5a6a62, 1);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    g.lineBetween(MID + Math.cos(a) * 18, 1830 + Math.sin(a) * 18, MID + Math.cos(a) * 62, 1830 + Math.sin(a) * 62);
  }
  g.lineStyle(4, 0x7a6a3a, 1); g.strokeCircle(MID, 1830, 66);
  maresaSigil(g, MID, 1830, 16, GOLD, 0.6);

  // Hall II — rippled sand swept by the currents.
  rippledSand(g, L, 1040, R - L, 680, rng);
  for (const ln of [...LANES, ...SIDE_CURRENTS]) {
    g.fillStyle(0x0a1a22, 0.5); g.fillRect(ln.rect.x, ln.rect.y, ln.rect.w, ln.rect.h);
  }
  for (const d of DRAINS) {
    g.fillStyle(0x000000, 1); g.fillRoundedRect(d.x + (d.x === L ? -10 : 10), d.y - 10, d.w, d.h + 20, 18);
  }
  // The eel's pillar and the bone-white scour mark its tail has worn into the sand.
  g.lineStyle(1.5, PEARL, 0.25); g.strokeCircle(EEL.x, EEL.y, EEL.length);
  g.lineStyle(10, 0x0a1a1a, 0.3); g.strokeCircle(EEL.x, EEL.y, EEL.length * 0.7);
  for (let i = 0; i < 30; i++) {
    const a = rng() * Math.PI * 2, rr = 40 + rng() * (EEL.length - 50);
    g.fillStyle(PEARL, 0.4); g.fillEllipse(EEL.x + Math.cos(a) * rr, EEL.y + Math.sin(a) * rr, 5, 3);
  }
  // Warden II's dais: a ring of eel-eggs (black purses) round a pale stone.
  flagstones(g, { x: L, y: 1040, w: R - L, h: 90 }, 36, 0x2a3a3c, 0x0e1618, rng);
  g.fillStyle(0x6a7a72, 1); g.fillCircle(MID, 1080, 34);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    g.fillStyle(0x0a0e10, 1); g.fillEllipse(MID + Math.cos(a) * 46, 1080 + Math.sin(a) * 24, 12, 8);
  }

  // Hall III — the gallery: marble landing, the sunken basin, the dais.
  flagstones(g, { x: L, y: 880, w: R - L, h: 120 }, 40, 0x3a4448, 0x121a1e, rng);
  for (const s of SPOUTS) {
    g.fillStyle(0x000000, 0.8); g.fillEllipse(s.x + 30, 1000 - 4, 64, 14);
    g.fillStyle(0x0a1418, 1); g.fillRect(s.x + 4, 890, 52, 110);
    g.lineStyle(2, 0x5a7a7a, 0.9); g.strokeRect(s.x + 4, 890, 52, 110);
  }
  galleryBasin(g, rng);
  flagstones(g, { x: L, y: 330, w: R - L, h: 230 }, 40, 0x3a4448, 0x121a1e, rng);
  for (const v of VENTS) {
    g.fillStyle(0x000000, 0.8); g.fillEllipse(v.x + v.w / 2, v.y + v.h / 2, v.w, v.h * 0.8);
    g.lineStyle(3, 0x6a8a8a, 1); g.strokeEllipse(v.x + v.w / 2, v.y + v.h / 2, v.w, v.h * 0.8);
    g.lineStyle(2, 0x6a8a8a, 0.8);
    for (let k = -2; k <= 2; k++) g.lineBetween(v.x + v.w / 2 + k * 12, v.y + 10, v.x + v.w / 2 + k * 12, v.y + v.h - 10);
  }
  // Warden III's dais: a diving-bell's mooring ring.
  g.fillStyle(0x0a1418, 1); g.fillCircle(MID, 410, 60);
  g.lineStyle(8, 0x8a6a3a, 1); g.strokeCircle(MID, 410, 52);
  g.lineStyle(2, GOLD, 0.6); g.strokeCircle(MID, 410, 44);

  // The throne room: mother-of-pearl, a sailcloth runner, the sigil in gold.
  nacre(g, L + 190, 40, R - L - 380, 250, 26, rng);
  g.fillStyle(0x1a2a3a, 1); g.fillRect(MID - 44, 120, 88, 170);
  g.fillStyle(0x4a6a8a, 1); g.fillRect(MID - 38, 120, 76, 170);
  g.lineStyle(2, GOLD, 0.6); g.lineBetween(MID - 34, 120, MID - 34, 290); g.lineBetween(MID + 34, 120, MID + 34, 290);
  maresaSigil(g, MID, 240, 30, GOLD, 0.7);

  // The sleepers' niches: dark arches cut into the foot of each wall (the bubbles bob in them).
  for (const sl of SLEEPERS) {
    const left = sl.x < MID;
    const nx = left ? L : R - 44;
    g.fillStyle(0x020608, 1);
    g.fillRoundedRect(nx, sl.y - 58, 44, 58, { tl: left ? 0 : 20, tr: left ? 20 : 0, bl: 0, br: 0 });
    g.lineStyle(2, 0x3a5a58, 0.7);
    g.strokeRoundedRect(nx, sl.y - 58, 44, 58, { tl: left ? 0 : 20, tr: left ? 20 : 0, bl: 0, br: 0 });
  }

  // The palace walls: barnacled ashlar, with a tide line every flood has left.
  for (const [x0, x1] of [[L - 40, L], [R, R + 40]] as [number, number][]) {
    for (let y = 0; y < H; y += 18) {
      const off = (y / 18) % 2 ? 0 : 12;
      for (let x = x0 - off; x < x1; x += 24) {
        g.fillStyle(rng() < 0.5 ? STONE : STONE_LIT, 1);
        g.fillRect(Math.max(x0, x), y + 1, Math.min(22, x1 - Math.max(x0, x)), 16);
      }
      if (rng() < 0.3) { g.fillStyle(BARNACLE, 0.7); g.fillCircle(x0 + rng() * 40, y + rng() * 18, 1.5 + rng() * 1.5); }
    }
    g.fillStyle(TEAL, 0.14); g.fillRect(x0 === L - 40 ? L - 3 : R, 0, 3, H);
  }
  for (const c of CROSS_WALLS) {
    for (const [x0, x1] of [[L, DOOR_L], [DOOR_R, R]] as [number, number][]) {
      g.fillStyle(0x020608, 1); g.fillRect(x0, c.y - 4, x1 - x0, c.h + 8);
      for (let x = x0; x < x1; x += 26) {
        g.fillStyle(rng() < 0.5 ? STONE : STONE_LIT, 1); g.fillRect(x + 1, c.y, 24, c.h);
      }
      g.fillStyle(lit(STONE_LIT, 0.2), 1); g.fillRect(x0, c.y, x1 - x0, 3);
      for (let i = 0; i < 6; i++) coralBranch(g, x0 + 20 + rng() * (x1 - x0 - 40), c.y + c.h, 8 + rng() * 10, rng() < 0.5 ? CORAL : 0xd8608a, rng);
    }
  }
}

// ── Set pieces ───────────────────────────────────────────────────────

type Piece = NonNullable<AreaDef['painter']['pieces']>[number];
const pieces: Piece[] = [];

/** A bronze sluice-mouth in a side wall — a fish's open jaws — at a trough's height. */
function sluiceMouth(y: number, side: -1 | 1): void {
  const x = side < 0 ? L : R;
  pieces.push({
    x, y: y + SLUICE_H, w: 90, h: 90, draw: (g) => {
      const cy = y + SLUICE_H / 2;
      const s = -side;
      g.fillStyle(0x2a1e0e, 1); g.fillEllipse(x + s * 12, cy, 56, 70);
      g.fillStyle(0x8a6a2a, 1); g.fillEllipse(x + s * 12, cy, 50, 62);
      g.fillStyle(lit(0x8a6a2a, 0.25), 1); g.fillEllipse(x + s * 6, cy - 16, 20, 10);
      // The open mouth.
      g.fillStyle(0x020608, 1); g.fillEllipse(x + s * 22, cy, 26, 32);
      g.fillStyle(0xe8e0c8, 1);
      for (let k = -2; k <= 2; k++) g.fillTriangle(x + s * 16, cy + k * 6 - 3, x + s * 16, cy + k * 6 + 3, x + s * 24, cy + k * 6);
      // A bronze eye.
      g.fillStyle(0x1a120a, 1); g.fillCircle(x + s * 2, cy - 14, 5);
      g.fillStyle(GOLD, 1); g.fillCircle(x + s * 2, cy - 14, 2.5);
      maresaSigil(g, x + s * 6, cy + 18, 6, 0x3a2a12, 0.9);
    },
  });
}
for (const y of SLUICE_ROWS) { sluiceMouth(y, -1); sluiceMouth(y, 1); }

/** A drowned sleeper in a ballast bubble, set into a wall niche. Drawn in animate (they bob). */
interface Sleeper { x: number; y: number; r: number; skin: number; cloth: number }
const SLEEPERS: Sleeper[] = [];
const sleeperLooks: [number, number][] = [
  [0xc8b098, 0x5a4a6a], [0xa88a70, 0x3a5a5a], [0xd8c0a8, 0x6a3a3a], [0x9a7a62, 0x4a4a2a],
  [0xc0a080, 0x2a3a5a], [0xb89a82, 0x5a5a5a], [0xd0b8a0, 0x3a2a4a],
];
const SLEEPER_ROWS = [2360, 2282, 2162, 2042, 1890, 1100, 960, 520, 390];
SLEEPER_ROWS.forEach((y, i) => {
  for (const side of [-1, 1] as const) {
    const [skin, cloth] = sleeperLooks[(i * 2 + (side > 0 ? 1 : 0)) % sleeperLooks.length];
    SLEEPERS.push({ x: side < 0 ? L + 22 : R - 22, y, r: 18 + ((i * 7) % 5), skin, cloth });
  }
});
/** Coral pillars standing in the open halls. */
const PILLARS: Pt[] = [
  { x: 520, y: 2380 }, { x: 1280, y: 2380 },
  { x: 470, y: 400 }, { x: 1330, y: 400 },
  { x: 640, y: 200 }, { x: 1160, y: 200 },
];
for (const p of PILLARS) {
  pieces.push({ x: p.x, y: p.y, w: 90, h: 180, draw: (g, rng) => coralPillar(g, p.x, p.y, 20, 150, rng) });
  solids.push({ kind: 'circle', x: p.x, y: p.y - 6, r: 24 });
}

/** The eel's pillar — broken off at waist height, the eel coiled round it. */
pieces.push({
  x: EEL.x, y: EEL.y + 10, w: 90, h: 100, draw: (g, rng) => {
    shadow(g, EEL.x, EEL.y + 10, 80, 24, 0.45);
    g.fillStyle(dim(STONE_LIT, 0.3), 1); g.fillRect(EEL.x - 26, EEL.y - 50, 52, 60);
    g.fillStyle(STONE_LIT, 1); g.fillRect(EEL.x - 22, EEL.y - 50, 44, 60);
    g.fillStyle(0x1a2a2a, 1);
    for (let k = 0; k < 6; k++) g.fillTriangle(EEL.x - 22 + k * 8, EEL.y - 50, EEL.x - 14 + k * 8, EEL.y - 50, EEL.x - 18 + k * 8, EEL.y - 58 - (k % 2) * 6);
    coralBranch(g, EEL.x + 16, EEL.y - 10, 14, CORAL, rng);
  },
});
solids.push({ kind: 'circle', x: EEL.x, y: EEL.y - 4, r: 26 });

/** Gilt portrait frames on the gallery walls — the Queen's ancestors, all with her chin. */
for (const [y, side] of [[700, -1], [820, -1], [700, 1], [820, 1]] as [number, -1 | 1][]) {
  const x = side < 0 ? L + 6 : R - 6;
  pieces.push({
    x, y: y + 40, w: 50, h: 90, draw: (g) => {
      const fx = side < 0 ? x : x - 22;
      g.fillStyle(0x3a2a0e, 1); g.fillRect(fx - 2, y - 32, 26, 64);
      g.fillStyle(GOLD, 0.8); g.fillRect(fx, y - 30, 22, 60);
      g.fillStyle(0x0a1a22, 1); g.fillRect(fx + 3, y - 27, 16, 54);
      g.fillStyle(0x5a6a70, 1); g.fillCircle(fx + 11, y - 10, 5);
      g.fillStyle(0x3a4a5a, 1); g.fillRect(fx + 5, y - 4, 12, 24);
      g.fillStyle(GOLD, 0.7); g.fillTriangle(fx + 7, y - 15, fx + 15, y - 15, fx + 11, y - 21);
    },
  });
}

/** Tithe-chests: the coffers the coins went into, barnacled shut. */
function titheCoffer(x: number, y: number): void {
  pieces.push({
    x, y, w: 80, h: 60, draw: (g) => {
      shadow(g, x, y + 2, 70, 14);
      g.fillStyle(0x2a1a0e, 1); g.fillRect(x - 30, y - 34, 60, 34);
      g.fillStyle(0x5a3a1e, 1); g.fillRect(x - 28, y - 32, 56, 30);
      g.fillStyle(0x6a4a2a, 1); g.fillRoundedRect(x - 30, y - 44, 60, 14, { tl: 8, tr: 8, bl: 0, br: 0 });
      g.fillStyle(GOLD, 0.8); g.fillRect(x - 30, y - 30, 60, 3); g.fillRect(x - 4, y - 36, 8, 10);
      for (let i = 0; i < 7; i++) { g.fillStyle(BARNACLE, 1); g.fillCircle(x - 26 + i * 9, y - 6 - (i % 3) * 6, 2.5); }
      maresaSigil(g, x, y - 16, 7, GOLD, 0.6);
    },
  });
  solids.push({ kind: 'rect', x: x - 30, y: y - 14, w: 60, h: 14 });
}
titheCoffer(420, 2510);
titheCoffer(1380, 2510);

/** The clam throne: a great scallop, half open, pearl the size of a head in its hinge. */
pieces.push({
  x: MID, y: 150, w: 300, h: 160, draw: (g) => {
    shadow(g, MID, 152, 260, 34, 0.5);
    // Lower valve.
    g.fillStyle(0x6a4a4a, 1); g.fillEllipse(MID, 130, 230, 60);
    g.fillStyle(0xd8b8a8, 1); g.fillEllipse(MID, 126, 220, 50);
    // Upper valve, fanned with ribs.
    for (let k = 0; k < 13; k++) {
      const a0 = Math.PI + (k / 13) * Math.PI, a1 = Math.PI + ((k + 1) / 13) * Math.PI;
      g.fillStyle(k % 2 ? 0xe8c8b8 : 0xc8a090, 1);
      g.slice(MID, 126, 120, a0, a1, false); g.fillPath();
    }
    g.lineStyle(2, 0x6a4a4a, 1);
    for (let k = 0; k <= 13; k++) {
      const a = Math.PI + (k / 13) * Math.PI;
      g.lineBetween(MID, 126, MID + Math.cos(a) * 120, 126 + Math.sin(a) * 120);
    }
    g.lineStyle(3, 0x6a4a4a, 1); g.beginPath(); g.arc(MID, 126, 120, Math.PI, 0, false); g.strokePath();
    // The pearl.
    g.fillStyle(0x8a8078, 1); g.fillCircle(MID, 112, 16);
    g.fillStyle(PEARL, 1); g.fillCircle(MID, 110, 14);
    g.fillStyle(0xffffff, 0.8); g.fillCircle(MID - 5, 105, 4);
  },
});
solids.push({ kind: 'rect', x: MID - 110, y: 100, w: 220, h: 50 });

// ── Animation ────────────────────────────────────────────────────────

const near = (v: Rect, x: number, y: number, pad: number): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

const jetPhase = (t: number, period: number, off: number): number => (((t * 1000 + off) % period) + period) % period;

function animateUnder(g: G, t: number, view: Rect): void {
  // Light from the eye of the maelstrom, far overhead.
  caustics(g, Math.max(L, view.x), Math.max(40, view.y), Math.min(R, view.x + view.w) - Math.max(L, view.x), Math.min(H - 40, view.y + view.h) - Math.max(40, view.y), t, 18, 0.045);
  // Kelp along the wall feet.
  for (let y = 120; y < H - 60; y += 150) {
    for (const x of [L + 8, R - 8]) {
      if (!near(view, x, y, 80)) continue;
      kelp(g, x + (x < MID ? 14 : -14), y, 60 + ((y * 7) % 40), t, KELP);
    }
  }
  // Sleepers in their bubbles — they stir a little when you are close to the throne.
  for (const s of SLEEPERS) {
    if (!near(view, s.x, s.y, 60)) continue;
    sleeperInBubble(g, s.x, s.y, s.r, t, s.skin, s.cloth, s.y < 600 ? 0.6 : 0);
  }
  // The courtiers who have half woken: each stands in front of the torn film of their bubble,
  // still clinging to the niche behind them, shivering in the current.
  for (const n of NPCS) {
    if (!near(view, n.at.x, n.at.y, 80)) continue;
    const r = 34 * (n.look.size ?? 1);
    const cy = n.at.y - r * 0.9;
    const wob = Math.sin(t * 1.6 + n.at.x) * 0.06;
    g.fillStyle(0x9ae8f0, 0.07); g.fillCircle(n.at.x, cy, r);
    g.lineStyle(2, 0xc8f8ff, 0.4);
    g.beginPath(); g.arc(n.at.x, cy, r, Math.PI * (0.85 + wob), Math.PI * (2.15 + wob), false); g.strokePath();
    // The torn lip of the film, flapping.
    for (const side of [-1, 1]) {
      const a = side < 0 ? Math.PI * (0.85 + wob) : Math.PI * (0.15 + wob);
      const ex = n.at.x + Math.cos(a) * r, ey = cy + Math.sin(a) * r;
      g.lineStyle(1.5, 0xc8f8ff, 0.3);
      g.lineBetween(ex, ey, ex + side * (6 + Math.sin(t * 4 + side) * 3), ey + 10);
    }
    g.fillStyle(0xffffff, 0.4); g.fillEllipse(n.at.x - r * 0.45, cy - r * 0.55, r * 0.22, r * 0.1);
  }
}

function animateOver(g: G, t: number, view: Rect): void {
  // Hall I: water bursting from the sluice-mouths while a jet runs, spray hanging after.
  SLUICE_ROWS.forEach((y, row) => {
    if (!near(view, MID, y, 500)) return;
    const off = row * 820;
    for (const side of [-1, 1] as const) {
      const ph = jetPhase(t, SLUICE_PERIOD, off + (side > 0 ? SLUICE_PERIOD / 2 : 0));
      const on = ph < SLUICE_ON;
      const x0 = side < 0 ? L : R;
      const dir = -side;
      if (on) {
        const k = ph / SLUICE_ON;
        for (let i = 0; i < 14; i++) {
          const fx = ((i * 0.37 + t * 2.4) % 1) * SPAN;
          g.fillStyle(FOAM, 0.35 + (i % 3) * 0.12);
          g.fillEllipse(x0 + dir * fx, y + 8 + ((i * 13) % (SLUICE_H - 16)), 26, 6);
        }
        g.fillStyle(0xffffff, 0.4 * (1 - k)); g.fillEllipse(x0 + dir * 30, y + SLUICE_H / 2, 70, SLUICE_H + 20);
      } else if (ph > SLUICE_PERIOD - 700) {
        // A gurgle and a drip from the mouth: it is about to go.
        for (let i = 0; i < 3; i++) {
          g.fillStyle(FOAM, 0.6); g.fillCircle(x0 + dir * (16 + i * 6), y + SLUICE_H / 2 + Math.sin(t * 20 + i) * 6, 3);
        }
      }
    }
  });
  // Hall II: current streaks over the lanes and side currents (drawn over the engine's belts).
  for (const ln of [...LANES, ...SIDE_CURRENTS]) {
    const r = ln.rect;
    if (!near(view, r.x + r.w / 2, r.y + r.h / 2, r.w / 2 + 50)) continue;
    const n = Math.floor((r.w * r.h) / 2600);
    for (let i = 0; i < n; i++) {
      const fx = ((i * 0.618 + t * ln.vx / r.w) % 1 + 1) % 1;
      const x = r.x + fx * r.w, y = r.y + 6 + ((i * 37) % (r.h - 12));
      g.lineStyle(2, FOAM, 0.3);
      g.lineBetween(x, y, x - Math.sign(ln.vx) * 22, y);
    }
  }
  // Drain mouths gulp.
  DRAINS.forEach((d, i) => {
    if (!near(view, d.x, d.y, 120)) return;
    const on = jetPhase(t, 1700, i * 850) < 950;
    const cx = d.x + d.w / 2, cy = d.y + d.h / 2;
    for (let k = 0; k < (on ? 5 : 2); k++) {
      const a = t * (on ? 9 : 3) + (k / 5) * Math.PI * 2;
      g.lineStyle(2, FOAM, on ? 0.6 : 0.25);
      g.beginPath(); g.arc(cx, cy, 10 + k * 6, a, a + 1.6, false); g.strokePath();
    }
  });
  // The Great Eel along the sweeper's arm: a body that thickens toward the tip, a head with a
  // pale eye, the dorsal fin rippling.
  if (near(view, EEL.x, EEL.y, EEL.length + 40)) {
    const a = EEL.phase + t * EEL.rad;
    const ca = Math.cos(a), sa = Math.sin(a);
    const nx = -sa, ny = ca;
    for (let i = 0; i <= 12; i++) {
      const k = i / 12;
      const w = 6 + k * 9 + Math.sin(t * 8 + k * 10) * 1.5;
      const px = EEL.x + ca * EEL.length * k + nx * Math.sin(t * 6 + k * 9) * 5;
      const py = EEL.y + sa * EEL.length * k + ny * Math.sin(t * 6 + k * 9) * 5;
      g.fillStyle(0x1a3a2a, 1); g.fillCircle(px, py, w);
      g.fillStyle(0x3a7a52, 1); g.fillCircle(px - nx * 2, py - ny * 2, w * 0.8);
      g.fillStyle(0xc8e070, 0.55); g.fillCircle(px - nx * w * 0.4, py - ny * w * 0.4, 1.6);
    }
    const hx = EEL.x + ca * (EEL.length + 8), hy = EEL.y + sa * (EEL.length + 8);
    g.fillStyle(0x1a3a2a, 1); g.fillEllipse(hx, hy, 34, 24);
    g.fillStyle(0xd8f070, 1); g.fillCircle(hx + nx * 6, hy + ny * 6, 3.5);
    g.fillStyle(0x000000, 1); g.fillCircle(hx + nx * 6, hy + ny * 6, 1.4);
    g.fillStyle(0xe8e0c8, 1);
    g.fillTriangle(hx + ca * 14, hy + sa * 14, hx + ca * 6 + nx * 4, hy + sa * 6 + ny * 4, hx + ca * 6 - nx * 4, hy + sa * 6 - ny * 4);
  }
  // Hall III spouts: columns of water standing up out of the floor.
  for (const s of SPOUTS) {
    if (!near(view, s.x, 940, 120)) continue;
    const ph = jetPhase(t, 2200, s.off);
    if (ph < 1100) {
      const k = Math.min(1, ph / 160);
      for (let i = 0; i < 8; i++) {
        const yy = 1000 - ((t * 400 + i * 30) % 120) * k;
        g.fillStyle(FOAM, 0.4); g.fillEllipse(s.x + 30 + Math.sin(t * 9 + i) * 10, yy, 22, 12);
      }
      g.fillStyle(0xffffff, 0.3); g.fillEllipse(s.x + 30, 880, 60, 20);
    }
  }
  // Bubble vents: a fountain of air when on, a lazy trickle otherwise.
  VENTS.forEach((v, i) => {
    if (!near(view, v.x, v.y, 120)) return;
    const on = jetPhase(t, 2400, (i % 2) * 1200 + i * 150) < 900;
    const n = on ? 12 : 2;
    for (let k = 0; k < n; k++) {
      const ph = ((t * (on ? 1.8 : 0.5)) + k / n) % 1;
      g.lineStyle(1.5, 0xe8ffff, (1 - ph) * 0.8);
      g.strokeCircle(v.x + v.w / 2 + Math.sin(k * 2.1 + t * 3) * 22, v.y + v.h / 2 - ph * (on ? 110 : 40), 3 + ph * 5);
    }
  });
  // The black water of the gallery heaves until it is drained (the engine stops it hurting; we
  // only draw the surface while it still would).
  if (near(view, MID, GALLERY.y + GALLERY.h / 2, 400)) {
    for (let i = 0; i < 16; i++) {
      const x = L + ((i * 97 + t * 26) % (R - L));
      const y = GALLERY.y + 20 + ((i * 53) % (GALLERY.h - 40));
      g.lineStyle(1.5, 0x5a8ac8, 0.12 + Math.sin(t * 2 + i) * 0.06);
      g.beginPath(); g.arc(x, y, 18, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
    }
  }
  // The throne pearl's glow and the light of the eye above.
  if (near(view, MID, 120, 300)) {
    glow(g, MID, 110, 46 + Math.sin(t * 1.4) * 6, PEARL, 0.05, 3);
    for (let i = 0; i < 4; i++) {
      const x = MID - 160 + i * 110 + Math.sin(t * 0.3 + i) * 16;
      g.fillStyle(0xbff8ff, 0.035); g.fillTriangle(x - 10, 40, x + 30, 40, x + 60, 290);
    }
  }
  // Bubbles always rising — the whole palace is breathing out.
  motes(g, view, -t, 22, 0xc8f8ff, 34, 18, 1.6, 11);
}

// ── People: the drowned courtiers ────────────────────────────────────

const NPCS: NpcDef[] = [
  {
    id: 'undertow-coralie', name: 'Lady Coralie Fenn', title: 'Lady-in-Waiting, drowned',
    look: { body: 0xd8c0a8, accent: 0x5a3a6a, hat: 'veil', traits: ['scarf'], size: 0.95, eye: 0x9ae8f0 },
    at: { x: 380, y: 2440 },
    talks: [
      {
        when: { monarch: 'maresa' },
        lines: [
          'I am awake. I am properly awake. My hair is wet and I am cold and I could kiss you for it.',
          'Twelve years I held her train. The day I tripped on it, she said I could hold my breath instead.',
          'The sea has gone down off the low streets, they say. All of it. Nobody owes it a coin.',
          'Go on up and see the throne room empty. I want to, and I am not ready to. Tell me how small it looks.',
        ],
      },
      {
        when: { encounter: 'undertow-warden-3' },
        lines: [
          '...the bell has stopped ringing. Hollis Mire is down. That means you are...',
          'She is just above. She never sleeps, you know. She counts us. All night. Ballast, ballast, ballast.',
        ],
      },
      {
        when: { encounter: 'undertow-warden-1' },
        lines: [
          '...you got past Grue. The sluices are quieter. I could almost hear myself think, for a moment...',
          'Mind the current hall. The eel was a pet once. Hers. It was smaller then. So was she.',
        ],
      },
      {
        lines: [
          '...mm. Is it tithe-time? I have it. I have it somewhere. A coin for me and one for the... for the...',
          '...you are not wet. Why are you not wet? Everyone down here is wet.',
          'The Queen keeps us. "Ballast," she says. A crown that heavy needs weight under it or it floats away.',
          'Climb, if you are climbing. Three halls, three keepers. I would come, but the bubble is so warm.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'maresa' }, lines: ['Dry. I am dry. Look at me, dry as a biscuit.', 'Twelve years. My knees have forgotten how.'] },
      { lines: ['...a coin a head... a coin a head...', '...hold the train, Coralie, hold it higher...', '...so warm in here...'] },
    ],
  },
  {
    id: 'undertow-sump', name: 'Master Abelard Sump', title: 'Tithe-Clerk, drowned',
    look: { body: 0xa88a70, accent: 0x2a3a3a, hat: 'tophat', traits: ['glasses', 'book'], size: 1.05, eye: 0x9ae8f0 },
    at: { x: 1450, y: 2262 },
    talks: [
      {
        when: { monarch: 'maresa' },
        lines: [
          'I counted the tithe for nineteen years. Then one morning I was a coin short myself. Funny, that.',
          'She had me drowned on my own ledger. I wrote my own name in the "left under" column. Neat hand.',
          'I have done some sums since I woke. The crown owes Brinehollow eleven thousand floors back. Paid in full.',
        ],
      },
      {
        when: { encounter: 'undertow-warden-1' },
        lines: [
          '...Grue. Haddon Grue. I signed his papers. Sluicemaster, first class. He timed every flood to the second.',
          'You have broken his clock. The halls above will not be so punctual. Mind yourself.',
        ],
      },
      {
        lines: [
          '...west, then east, then west... the mouths take turns, you see. Never both. Never both at once...',
          '...except the middle. The brass-marked middle. Both reach there. Do not dawdle in the middle...',
          'Sluicemaster Grue keeps the hall. Tell him Sump says his columns never added up.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'maresa' }, lines: ['Paid. In. Full.', 'I shall need a new ledger. A dry one.'] },
      { lines: ['...west... then east...', '...carry the one... carry the one under...', '...a coin short. Only one...'] },
    ],
  },
  {
    id: 'undertow-pell', name: 'Pell', title: 'Cabin Boy, drowned',
    look: { body: 0xc0a080, accent: 0x3a5a8a, hat: 'beanie', traits: ['scarf'], size: 0.72, eye: 0x9ae8f0 },
    at: { x: 1440, y: 1685 },
    talks: [
      {
        when: { monarch: 'maresa' },
        lines: [
          'Is it morning? It feels like morning. My mam is in one of the bubbles on the left. Can I go and wake her?',
          'I wasn\'t even a household! I was a deckhand! She drowned the whole crew for one missing coin!',
          'When I am big I am going to be a diver like Odo. Except I am going to take the helmet OFF.',
        ],
      },
      {
        when: { encounter: 'undertow-warden-2' },
        lines: [
          'You beat Voss! And the eel didn\'t eat you! It ate my boot once. Just the boot. I was in it, though.',
          'Up top it\'s the gallery. It\'s all flooded. There\'s a lever on the left. Go left!',
        ],
      },
      {
        lines: [
          '...psst. You. Mister. Lady. You. Don\'t go up the middle, the eel goes round and round the middle.',
          'The sides are slower, but they suck you in toward it. Lean out. Lean OUT.',
          'The lanes at the bottom drag you into the drains. Cross where they slow down. They don\'t slow down.',
          '...I\'m just going to shut my eyes for a bit. It\'s not sleeping if you\'re only resting your eyes...',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'maresa' }, lines: ['MAM! MAAAM!', 'I\'m starving. Has anyone got a herring?'] },
      { lines: ['...round and round the middle...', '...lean out...', '...not sleeping...'] },
    ],
  },
  {
    id: 'undertow-keel', name: 'Sir Dorran Keel', title: 'Captain of the Tide Guard, drowned',
    look: { body: 0x9a7a62, accent: 0x2a3a5a, hat: 'helmet', traits: ['beard', 'scarf'], size: 1.25, eye: 0x9ae8f0 },
    at: { x: 380, y: 1085 },
    talks: [
      {
        when: { monarch: 'maresa' },
        lines: [
          'I swore an oath to the crown of the Drowned Reach. I never thought about who was wearing it.',
          'When she ordered the low streets flooded the first time, I refused. She did not argue. She just let go.',
          'The guard will need a captain who knows when to say no. I have had twelve years to practise.',
        ],
      },
      {
        when: { encounter: 'undertow-warden-2' },
        lines: [
          '...the eel-mistress has fallen. Good. She fed my sergeants to that thing one by one.',
          'The gallery above was the finest hall in the Reach. Now it is the deepest. The lever, soldier. West.',
          'The sumps will not drain for any lever. Those are the Queen\'s. Walk round them.',
        ],
      },
      {
        lines: [
          '...stand to... stand to, Tide Guard... who goes there...',
          'You carry yourself like a soldier. Or a fool. Down here it comes to the same thing.',
          'Voss keeps the eel. She holds the leash and the leash holds a storm. Do not let her stand you in the wet.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'maresa' }, lines: ['Tide Guard! Fall in! ...Anyone?', 'A dry sword. I had forgotten the sound.'] },
      { lines: ['...stand to...', '...who goes there...', '...hold the line, hold your breath...'] },
    ],
  },
  {
    id: 'undertow-weir', name: 'Mother Agnes Weir', title: 'Net-mender of Brinehollow, drowned',
    look: { body: 0xd0b8a0, accent: 0x4a5a3a, hat: 'souwester', traits: ['cane', 'scarf'], size: 0.88, eye: 0x9ae8f0 },
    at: { x: 1430, y: 380 },
    talks: [
      {
        when: { monarch: 'maresa' },
        lines: [
          'Seven of us in my house and we could pay for six. I said leave me, then. Leave the old woman under.',
          'And here I am, and here are the other six, three bubbles down. She took them anyway. "Ballast."',
          'Well. Ballast can walk home now. Help me find my grandchildren, and then help me find a boat.',
        ],
      },
      {
        when: { encounter: 'undertow-warden-3' },
        lines: [
          '...you beat the bell man. I can feel her up there. She has gone quiet. She is never quiet...',
          'She will flood the room on you. She will drag you and drown you and stand the sea on end.',
          'And then she will go very, very still. Do not trust the still. The still is the worst of her.',
        ],
      },
      {
        lines: [
          '...is that the tithe-cart? I have six coins. Six. Take the six, leave the seventh under...',
          '...you are a long way down, child. The Queen is past that bell-diver and his gate of rime.',
          '...the drowned do not die here. We dream. I dream of my kitchen. The floor is dry in my dreams.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'maresa' }, lines: ['Where are my knitting needles? Twelve years and I want my needles.', 'Go on, child. Go home dry.'] },
      { lines: ['...six coins...', '...the floor is dry in my dreams...', '...leave the seventh under...'] },
    ],
  },
];

// ── POIs ─────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  {
    kind: 'door', at: { x: MID, y: 2540 }, to: 'abyssal', arrive: { x: 1200, y: 270 },
    label: 'The Drowning Stair — back up to the Abyssal Court',
  },
  { kind: 'waystone', at: { x: 700, y: 2460 } },
  { kind: 'lever', at: { x: 340, y: 950 }, flag: 'undertow-sluice', label: 'Gallery Sluice Lever' },
  { kind: 'encounter', id: 'undertow-warden-1' },
  { kind: 'encounter', id: 'undertow-warden-2' },
  { kind: 'encounter', id: 'undertow-warden-3' },
  { kind: 'monarch', id: 'maresa', at: { x: MID, y: 215 } },
  { kind: 'sign', at: { x: 1100, y: 2470 }, text: 'THE UNDERTOW. Ballast of the Crown. The Dry Tithe is a coin a head. Those who cannot pay are kept here.' },
  { kind: 'sign', at: { x: 1060, y: 2275 }, text: 'SLUICE HALL. The west mouth and the east mouth take turns. Where the brass marks the floor, both reach.' },
  { kind: 'sign', at: { x: 1080, y: 1690 }, text: 'CURRENT HALL. Do not feed the eel. The eel is fed at the Queen\'s pleasure.' },
  { kind: 'sign', at: { x: 760, y: 950 }, text: 'THE GALLERY. Flooded by royal decree. Sluice lever to the west, for the Queen\'s portrait-cleaners only.' },
  { kind: 'chest', id: 'undertow-chest-sluice', at: { x: 1470, y: 2142 }, coins: 240, orbs: 3 },
  { kind: 'chest', id: 'undertow-chest-current', at: { x: 1410, y: 1080 }, item: 'charm-eelskin-gloves', coins: 120 },
  { kind: 'chest', id: 'undertow-chest-gallery', at: { x: 1460, y: 950 }, item: 'charm-courtiers-locket', orbs: 4 },
  { kind: 'chest', id: 'undertow-chest-throne', at: { x: 560, y: 260 }, coins: 400, orbs: 6, open: { monarch: 'maresa' } },
];

export const UNDERTOW_AREA: AreaDef = {
  id: 'undertow',
  isle: 'water',
  name: 'The Undertow',
  subtitle: 'Queen Maresa\'s drowned palace, at the bottom of the maelstrom',
  w: W,
  h: H,
  bg: ABYSS,
  accent: TEAL,
  weather: 'bubbles',
  spawn: { x: MID, y: 2460 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver },
  solids,
  exits: [],
  pois: POIS,
  npcs: NPCS,
  gloom: 0.46,
  hazards,
  gates,
  checkpoints: [
    { x: MID, y: 2440 },   // the Drowning Stair landing
    { x: MID, y: 2262 },   // under the first sluice row
    { x: MID, y: 2142 },   // between rows one and two
    { x: MID, y: 2022 },   // between rows two and three
    { x: MID, y: 1880 },   // Grue's dais
    { x: MID, y: 1690 },   // Current Hall landing
    { x: MID, y: 1555 },   // between the undertow lanes
    { x: 1460, y: 1470 },  // east foot of the side current
    { x: 340, y: 1470 },   // west foot of the side current
    { x: MID, y: 1070 },   // Voss's dais
    { x: MID, y: 960 },    // gallery landing
    { x: 380, y: 960 },    // the lever balcony
    { x: MID, y: 540 },    // across the gallery
    { x: MID, y: 400 },    // Mire's dais
    { x: MID, y: 270 },    // the throne room
  ],
};
