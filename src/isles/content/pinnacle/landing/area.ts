import type { AreaDef, Cond, PainterWorld, Poi, Rect, Solid } from '../../../IslesTypes';
import { groundFill, glow } from '../../../art/IsleArt';
import { crackPath, starGlow } from '../../../art/PinnacleArt';
import { BENCHES, KING_ID, PIN_LANDING } from '../spec';
import {
  EMBER, type G, ISLE_COLOR, OBS, WOOD, WOOD_DARK, apiary, balloonBasket, balloonMouth, bandstand, beachedBoat,
  bellPorts, cairn, campfire, canaryCage, cardTable, cartCoals, dim, divingBell, dockHut, groundSeam, keeperLantern,
  kitchen, lampHead, lampPost, lensCentre, lit, magpiePerch, mixC, mynahRail, poly, potAt, seam, skepDoors, stairLamps,
  stairPillar, still, stillParts, stores, tallyStone, tinkerCart, wreck, cliffRun,
} from './art';
import { PIN_LANDING_NPCS } from './people';

/**
 * Glasswater Landing — the foot of the Obsidian Pinnacle, and the last camp of the campaign.
 *
 * Where the star struck, the sea boiled to glass, and the glass broke as it cooled into a beach of
 * black shingle that rings like crockery underfoot. The spire's foot stands along the whole north of
 * it, a cliff of upthrust shards with violet seams climbing them, and in the middle the First Stair
 * goes up between two great leaning shards, ten dark lamp-niches cut up their inner faces. At the
 * stair's foot is the Tally Stone, scratched with a gate of five for every challenger who ever landed
 * here. Along the beach lie their boats: a longship's ribs, a galley's stern, a rowing boat with one oar
 * still shipped — all grown through with glass where they lay.
 *
 * And tonight, for the first time, someone has made camp: **the Muster**. Ten wanderers from ten isles
 * sailed in behind you when the Shroud broke, drew their boats up on the shingle in a row, and pitched
 * in a ring round one fire — each pitch a piece of home carried across the sea. A tinker's cart; a
 * diving bell; three straw skeps; a balloon half full of somebody's own breath; a cairn of honest grey
 * stone; a street lamp, lit; a still; a card table; a bandstand; and the lamp-head of a lighthouse,
 * pointed at the sea. They are the only warm colours here. As benches fall up the spire, the lamps in
 * the stair-niches light one by one with starlight; when the King falls, the seams go dark and the
 * glass, for the first time, is only glass.
 */

const W = 2400;
const H = 1500;
/** Where the sea begins along the south. */
const SEA_Y = 1332;
/** The jetty the crossings tie up at. */
const JETTY: Rect = { x: 1160, y: 1296, w: 80, h: H - 1296 };
/** The First Stair's corridor, from the north edge down to the shingle. */
const STAIR_X0 = 1100;
const STAIR_X1 = 1300;
const STAIR_FOOT = 318;
/** The cliff runs along the north: [x0, x1, base y]. */
const CLIFF: [number, number, number][] = [
  [0, 420, 336], [420, 800, 300], [800, STAIR_X0 - 10, 268], [STAIR_X1 + 10, 1600, 268], [1600, 1980, 300], [1980, W, 336],
];
/** The two great stair shards. */
const PILLAR_W = { x: 1056, y: 300 };
const PILLAR_E = { x: 1344, y: 300 };
/** Ten lamp niches up the pillars, bottom first, west then east — one per bench. */
const NICHES = [...stairLamps(PILLAR_W.x, PILLAR_W.y, -1), ...stairLamps(PILLAR_E.x, PILLAR_E.y, 1)];

const KING: Cond = { monarch: KING_ID };

// ── Where things stand (pitch base lines) ────────────────────────────

/** The ten pitches, the camp's own works, and the wrecks. Every NPC stands just in front of theirs. */
const PITCH = {
  tamsin: { x: 540, y: 1060 },
  odo: { x: 300, y: 1236 },
  wendeline: { x: 380, y: 800 },
  barnaby: { x: 610, y: 560 },
  gideon: { x: 880, y: 450 },
  wren: { x: 900, y: 770 },
  tansy: { x: 1540, y: 460 },
  marlo: { x: 1530, y: 780 },
  lark: { x: 1880, y: 590 },
  sable: { x: 2120, y: 860 },
  fire: { x: 1200, y: 880 },
  kitchen: { x: 1720, y: 1080 },
  stores: { x: 2080, y: 1140 },
  hut: { x: 1440, y: 1296 },
  tally: { x: 960, y: 344 },
};
const WRECKS: { x: number; y: number; len: number; era: 0 | 1 | 2; flip: boolean }[] = [
  { x: 150, y: 600, len: 210, era: 0, flip: false },
  { x: 2270, y: 470, len: 220, era: 1, flip: true },
  { x: 2290, y: 1236, len: 110, era: 2, flip: true },
  { x: 130, y: 1010, len: 150, era: 1, flip: false },
];
/** The Muster's ten boats, drawn up on the tide line in isle order. */
const BOATS: { x: number; color: number; face: -1 | 1 }[] = [
  { x: 470, color: ISLE_COLOR.fire, face: 1 }, { x: 610, color: ISLE_COLOR.water, face: 1 },
  { x: 880, color: ISLE_COLOR.life, face: 1 }, { x: 1010, color: ISLE_COLOR.air, face: 1 },
  { x: 1550, color: ISLE_COLOR.earth, face: -1 }, { x: 1680, color: ISLE_COLOR.electricity, face: -1 },
  { x: 1810, color: ISLE_COLOR.slime, face: -1 }, { x: 1940, color: ISLE_COLOR.fate, face: -1 },
  { x: 2070, color: ISLE_COLOR.sound, face: -1 }, { x: 2190, color: ISLE_COLOR.light, face: -1 },
];
const BOAT_Y = 1326;

const inView = (v: Rect, x: number, y: number, pad: number): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

// ── Ground ───────────────────────────────────────────────────────────

/** Seams cracked into the shingle, running out from the spire's foot (shared by ground and pulse). */
const SEAMS: [number, number, number, number][] = [
  [700, 300, 520, 700], [960, 280, 1060, 640], [1440, 280, 1360, 620], [1760, 300, 1980, 700],
  [300, 340, 200, 520], [2120, 340, 2260, 700], [1200, 330, 1180, 520],
];

function paintGround(g: G, rng: () => number): void {
  // The whole world starts as dark glass.
  g.fillStyle(OBS.glass, 1); g.fillRect(0, 0, W, H);
  // Shingle: black glass pebbles, the odd violet glint.
  groundFill(g, { x: 0, y: 220, w: W, h: SEA_Y - 220 }, 0x100d17, 0x17131f, 0x3b3152, rng, 1.2);
  for (let i = 0; i < 5200; i++) {
    const x = rng() * W, y = 240 + rng() * (SEA_Y - 230);
    const s = 1.5 + rng() * 3.8;
    const tone = rng();
    g.fillStyle(mixC(OBS.glass, OBS.facet, tone), 1);
    g.fillEllipse(x, y, s * 2, s * 1.2);
    if (tone > 0.55) { g.fillStyle(OBS.edge, 0.18 + tone * 0.25); g.fillEllipse(x - s * 0.3, y - s * 0.3, s * 0.8, s * 0.35); }
    if (rng() > 0.985) { g.fillStyle(OBS.seamLit, 0.5); g.fillCircle(x, y - s * 0.3, 0.9); }
  }
  // The trodden way: jetty → fire → stair, the shingle crushed pale-grey and flat.
  const path: [number, number][] = [[1200, 1300], [1186, 1160], [1214, 1020], [1240, 940], [1200, 820], [1168, 700], [1196, 560], [1200, 420], [1200, STAIR_FOOT]];
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, ay] = path[i], [bx, by] = path[i + 1];
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 3);
    for (let k = 0; k < n; k++) {
      const f = k / n, x = ax + (bx - ax) * f + (rng() - 0.5) * 70, y = ay + (by - ay) * f + (rng() - 0.5) * 8;
      g.fillStyle(mixC(OBS.facet, 0x4a4458, rng() * 0.6), 0.35); g.fillEllipse(x, y, 3 + rng() * 3, 2 + rng() * 1.5);
    }
  }
  // Side paths to every pitch, fainter.
  for (const p of Object.values(PITCH)) {
    const ax = 1200, ay = 880 + (p.y - 880) * 0.2;
    const n = Math.ceil(Math.hypot(p.x - ax, p.y - ay) / 6);
    for (let k = 0; k < n; k++) {
      const f = k / n;
      g.fillStyle(0x3a344a, 0.22); g.fillEllipse(ax + (p.x - ax) * f + (rng() - 0.5) * 30, ay + (p.y + 30 - ay) * f + (rng() - 0.5) * 6, 4, 2);
    }
  }
  // The apron at the stair's foot: dressed glass flags, polished by everyone who stopped here to look up.
  for (let y = STAIR_FOOT - 10; y < 430; y += 26) {
    for (let x = 1050; x < 1350; x += 34) {
      const d = Math.abs(x + 17 - 1200) / 150 + (y - STAIR_FOOT) / 110;
      if (d > 1.2 + rng() * 0.2) continue;
      g.fillStyle(rng() > 0.5 ? OBS.facet : 0x1a1526, 0.9); g.fillRect(x + 1, y + 1, 32, 24);
      g.lineStyle(1, OBS.seam, 0.18); g.strokeRect(x + 1, y + 1, 32, 24);
      if (rng() > 0.8) { g.fillStyle(OBS.sheen, 0.4); g.fillTriangle(x + 3, y + 3, x + 20, y + 3, x + 3, y + 14); }
    }
  }
  // The First Stair, climbing north between the pillars: glass treads, pale nosings, a seam up the middle.
  for (let y = 0; y < STAIR_FOOT; y += 18) {
    const f = y / STAIR_FOOT;
    const half = 74 + f * 26;
    g.fillStyle(OBS.glass, 1); g.fillRect(1200 - half, y, half * 2, 18);
    g.fillStyle(OBS.facet, 1); g.fillRect(1200 - half, y + 2, half * 2, 9);
    g.fillStyle(OBS.sheen, 0.8); g.fillRect(1200 - half, y + 1, half * 2, 2);
    g.lineStyle(1, OBS.edge, 0.55); g.lineBetween(1200 - half, y + 1, 1200 + half, y + 1);
    g.fillStyle(0x000000, 0.35); g.fillRect(1200 - half, y + 12, half * 2, 6);
  }
  // Starlight in the topmost treads: the only warm thing on the cliff, and it comes from upstairs.
  seam(g, [{ x: 1200, y: 0 }, { x: 1196, y: 40 }, { x: 1204, y: 90 }, { x: 1198, y: 150 }], 1.3, 0.55, 0.2, OBS.star);
  seam(g, [{ x: 1198, y: 150 }, { x: 1204, y: 220 }, { x: 1199, y: 290 }, { x: 1201, y: STAIR_FOOT }], 1.2, 0.8);
  // Seams in the beach.
  for (const [ax, ay, bx, by] of SEAMS) groundSeam(g, { x: ax, y: ay }, { x: bx, y: by }, rng, 1.3);
  // Rain pools from the glassrain, each holding a little violet sky.
  for (let i = 0; i < 46; i++) {
    const x = 80 + rng() * (W - 160), y = 420 + rng() * (SEA_Y - 520);
    const w = 18 + rng() * 40;
    g.fillStyle(0x05040a, 0.7); g.fillEllipse(x, y, w, w * 0.32);
    g.fillStyle(OBS.skyGlow, 0.55); g.fillEllipse(x, y - 1, w * 0.86, w * 0.22);
    g.lineStyle(1, OBS.edge, 0.3); g.strokeEllipse(x, y, w, w * 0.32);
    g.fillStyle(OBS.seamLit, 0.25); g.fillEllipse(x - w * 0.2, y - 1, w * 0.25, 1.4);
  }
  // Scorch where the Muster's fire has burned three nights.
  g.fillStyle(0x000000, 0.35); g.fillEllipse(PITCH.fire.x, PITCH.fire.y, 200, 80);
  // The tide line: the shingle goes wet and glossy, a ribbon of wrack.
  g.fillStyle(0x07060c, 1); g.fillRect(0, SEA_Y - 44, W, 44);
  for (let x = 0; x < W; x += 6) {
    const y = SEA_Y - 38 + Math.sin(x * 0.013) * 6 + rng() * 4;
    g.fillStyle(OBS.sheen, 0.25); g.fillEllipse(x, y, 7, 1.6);
    if (rng() > 0.7) { g.fillStyle(0x2a3a3a, 0.6); g.fillEllipse(x, y + 8, 8, 2.5); }
  }
  // The sea: glass-black water, lit from the violet sky in long bands.
  const bands = 8;
  for (let b = 0; b < bands; b++) {
    const y0 = SEA_Y + b * ((H - SEA_Y) / bands);
    g.fillStyle(mixC(OBS.seaLit, OBS.sea, b / (bands - 1)), 1); g.fillRect(0, y0, W, (H - SEA_Y) / bands + 1);
  }
  // The spire's reflection on the water: a long violet column under the stair.
  for (let k = 0; k < 18; k++) {
    const y = SEA_Y + 8 + k * 9;
    g.fillStyle(OBS.seam, 0.08 + (18 - k) * 0.004); g.fillEllipse(1200 + Math.sin(k * 1.7) * 10, y, 160 - k * 4, 4);
  }
  // The jetty: old planking, many repairs, piles going down into the black.
  for (let y = JETTY.y; y < H; y += 12) {
    const c = mixC(WOOD, 0x8a8a7a, rng() * 0.4);
    g.fillStyle(WOOD_DARK, 1); g.fillRect(JETTY.x - 2, y, JETTY.w + 4, 12);
    g.fillStyle(c, 1); g.fillRect(JETTY.x, y + 1, JETTY.w, 9);
    g.fillStyle(lit(c, 0.25), 0.6); g.fillRect(JETTY.x, y + 1, JETTY.w, 2);
    if (rng() > 0.8) { g.fillStyle(0x6a6a70, 1); g.fillCircle(JETTY.x + 6 + rng() * (JETTY.w - 12), y + 5, 1.2); }
  }
  for (const y of [1350, 1420, 1484]) for (const x of [JETTY.x - 4, JETTY.x + JETTY.w + 4]) {
    g.fillStyle(WOOD_DARK, 1); g.fillCircle(x, y, 7);
    g.fillStyle(WOOD, 1); g.fillCircle(x, y - 1, 5);
    g.lineStyle(1, dim(WOOD, 0.4), 1); g.strokeCircle(x, y - 1, 3);
  }
}

// ── Pieces and solids ────────────────────────────────────────────────

type Piece = NonNullable<AreaDef['painter']['pieces']>[number];
const pieces: Piece[] = [];
const solids: Solid[] = [];

// The spire's foot along the north.
for (const [x0, x1, y] of CLIFF) {
  pieces.push({ x: (x0 + x1) / 2, y, w: x1 - x0 + 120, h: 620, draw: (g, rng) => cliffRun(g, x0, x1, y, rng, y > 300 ? 0.9 : 1.15) });
  solids.push({ kind: 'rect', x: x0, y: 0, w: x1 - x0, h: y - 14 });
}
// The First Stair's pillars, and the Tally Stone at the foot.
pieces.push({ x: PILLAR_W.x, y: PILLAR_W.y, w: 220, h: 420, draw: (g, rng) => stairPillar(g, PILLAR_W.x, PILLAR_W.y, -1, rng) });
pieces.push({ x: PILLAR_E.x, y: PILLAR_E.y, w: 220, h: 420, draw: (g, rng) => stairPillar(g, PILLAR_E.x, PILLAR_E.y, 1, rng) });
solids.push({ kind: 'circle', x: PILLAR_W.x - 10, y: PILLAR_W.y - 10, r: 34 }, { kind: 'circle', x: PILLAR_E.x + 10, y: PILLAR_E.y - 10, r: 34 });
pieces.push({ x: PITCH.tally.x, y: PITCH.tally.y, w: 120, h: 140, draw: (g, rng) => tallyStone(g, PITCH.tally.x, PITCH.tally.y, rng) });
solids.push({ kind: 'rect', x: PITCH.tally.x - 48, y: PITCH.tally.y - 30, w: 96, h: 32 });

// The wrecks of the ones before.
for (const w of WRECKS) {
  pieces.push({ x: w.x, y: w.y, w: w.len * 1.3, h: w.len * 0.6 + 60, draw: (g, rng) => wreck(g, w.x, w.y, w.len, w.era, rng, w.flip) });
  solids.push({ kind: 'rect', x: w.x - w.len * 0.42, y: w.y - 16, w: w.len * 0.84, h: 22 });
}

// The Muster's boats on the tide line.
for (const b of BOATS) {
  pieces.push({ x: b.x, y: BOAT_Y, w: 140, h: 120, draw: (g, rng) => beachedBoat(g, b.x, BOAT_Y, 92, b.color, b.face, rng) });
  solids.push({ kind: 'rect', x: b.x - 46, y: BOAT_Y - 20, w: 92, h: 20 });
}

// The ten pitches.
const pitch = (x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, foot: Solid[]): void => {
  pieces.push({ x, y, w, h, draw });
  solids.push(...foot);
};
const P = PITCH;
pitch(P.tamsin.x, P.tamsin.y, 260, 140, (g, r) => tinkerCart(g, P.tamsin.x, P.tamsin.y, r),
  [{ kind: 'rect', x: P.tamsin.x - 96, y: P.tamsin.y - 26, w: 196, h: 28 }]);
pitch(P.odo.x, P.odo.y, 240, 190, (g, r) => divingBell(g, P.odo.x, P.odo.y, r),
  [{ kind: 'rect', x: P.odo.x - 62, y: P.odo.y - 22, w: 170, h: 24 }]);
pitch(P.wendeline.x, P.wendeline.y, 240, 120, (g, r) => apiary(g, P.wendeline.x, P.wendeline.y, r),
  [{ kind: 'rect', x: P.wendeline.x - 110, y: P.wendeline.y - 26, w: 220, h: 28 }]);
pitch(P.barnaby.x, P.barnaby.y, 220, 130, (g, r) => balloonBasket(g, P.barnaby.x, P.barnaby.y, r),
  [{ kind: 'rect', x: P.barnaby.x - 34, y: P.barnaby.y - 30, w: 68, h: 32 }]);
pitch(P.gideon.x, P.gideon.y, 180, 150, (g, r) => cairn(g, P.gideon.x, P.gideon.y, r),
  [{ kind: 'rect', x: P.gideon.x - 52, y: P.gideon.y - 26, w: 120, h: 28 }]);
pitch(P.wren.x, P.wren.y, 140, 230, (g) => lampPost(g, P.wren.x, P.wren.y),
  [{ kind: 'circle', x: P.wren.x, y: P.wren.y - 6, r: 16 }, { kind: 'rect', x: P.wren.x - 54, y: P.wren.y - 20, w: 28, h: 20 }]);
pitch(P.tansy.x, P.tansy.y, 240, 130, (g, r) => still(g, P.tansy.x, P.tansy.y, r),
  [{ kind: 'rect', x: P.tansy.x - 66, y: P.tansy.y - 26, w: 190, h: 28 }]);
pitch(P.marlo.x, P.marlo.y, 220, 110, (g, r) => cardTable(g, P.marlo.x, P.marlo.y, r),
  [{ kind: 'rect', x: P.marlo.x - 70, y: P.marlo.y - 26, w: 140, h: 28 }]);
pitch(P.lark.x, P.lark.y, 200, 200, (g, r) => bandstand(g, P.lark.x, P.lark.y, r),
  [{ kind: 'rect', x: P.lark.x - 84, y: P.lark.y - 24, w: 168, h: 28 }]);
pitch(P.sable.x, P.sable.y, 150, 240, (g) => keeperLantern(g, P.sable.x, P.sable.y),
  [{ kind: 'rect', x: P.sable.x - 50, y: P.sable.y - 18, w: 100, h: 22 }]);

// The camp's own.
pitch(P.fire.x, P.fire.y, 260, 120, (g, r) => campfire(g, P.fire.x, P.fire.y, r),
  [{ kind: 'circle', x: P.fire.x, y: P.fire.y, r: 34 }, { kind: 'rect', x: P.fire.x - 112, y: P.fire.y - 40, w: 54, h: 16 }]);
pitch(P.kitchen.x, P.kitchen.y, 280, 170, (g, r) => kitchen(g, P.kitchen.x, P.kitchen.y, r),
  [{ kind: 'rect', x: P.kitchen.x - 126, y: P.kitchen.y - 30, w: 252, h: 32 }]);
pitch(P.stores.x, P.stores.y, 320, 200, (g, r) => stores(g, P.stores.x, P.stores.y, r),
  [{ kind: 'rect', x: P.stores.x - 140, y: P.stores.y - 34, w: 290, h: 36 }]);
pitch(P.hut.x, P.hut.y, 200, 110, (g, r) => dockHut(g, P.hut.x, P.hut.y, r),
  [{ kind: 'rect', x: P.hut.x - 46, y: P.hut.y - 30, w: 144, h: 32 }]);

// Bunting strung between the pitches round the fire — only once the King is down.
pieces.push({
  x: 1200, y: 700, w: 1400, h: 300, when: KING, draw: (g) => {
    const cols = Object.values(ISLE_COLOR);
    const runs: [number, number, number, number][] = [[900, 600, 1200, 660], [1200, 660, 1530, 600], [610, 440, 900, 600], [1530, 600, 1880, 460]];
    runs.forEach(([ax, ay, bx, by], ri) => {
      g.lineStyle(1.2, 0xd8c8a8, 0.9);
      const sag = (f: number): number => Math.sin(f * Math.PI) * 30;
      g.beginPath();
      for (let k = 0; k <= 20; k++) { const f = k / 20; const x = ax + (bx - ax) * f, y = ay + (by - ay) * f + sag(f); if (k) g.lineTo(x, y); else g.moveTo(x, y); }
      g.strokePath();
      for (let k = 1; k < 12; k++) {
        const f = k / 12, x = ax + (bx - ax) * f, y = ay + (by - ay) * f + sag(f);
        poly(g, [[x - 6, y], [x + 6, y], [x, y + 13]], cols[(k + ri * 3) % cols.length]);
      }
    });
  },
});

// The sea, with the jetty cut out of it.
solids.push(
  { kind: 'rect', x: 0, y: SEA_Y, w: JETTY.x, h: H - SEA_Y },
  { kind: 'rect', x: JETTY.x + JETTY.w, y: SEA_Y, w: W - JETTY.x - JETTY.w, h: H - SEA_Y },
);

// ── Animation ────────────────────────────────────────────────────────

/** Under the actors: the sea, the light pools, the stair lamps, the spire's breath. */
function animateUnder(g: G, t: number, view: Rect, world: PainterWorld): void {
  const free = world.test(KING);
  // ── The sea: slow black swells, violet catchlights (a dawn gold once the King is down).
  if (view.y + view.h > SEA_Y - 40) {
    const catchC = free ? 0xffd8a0 : OBS.seamLit;
    for (let row = 0; row < 8; row++) {
      const y = SEA_Y + 16 + row * 21;
      if (y < view.y - 20 || y > view.y + view.h + 20) continue;
      const speed = 6 + row * 2;
      for (let x = Math.floor(view.x / 110) * 110 - 110; x < view.x + view.w + 110; x += 110) {
        const ox = x + ((t * speed + row * 41) % 110);
        if (ox > JETTY.x - 10 && ox < JETTY.x + JETTY.w + 10) continue;
        const yy = y + Math.sin(t * 0.7 + x * 0.01 + row) * 3;
        g.lineStyle(2, OBS.seaLit, 0.5); g.lineBetween(ox, yy, ox + 50, yy - 1);
        if ((row + Math.floor(x / 110)) % 4 === 0) { g.fillStyle(catchC, 0.22); g.fillEllipse(ox + 30, yy - 1, 12, 1.8); }
      }
    }
    // Wash on the tide line: a lip of pale foam breathing in and out over the glass.
    for (let x = Math.floor(view.x / 40) * 40; x < view.x + view.w + 40; x += 40) {
      const k = 0.5 + 0.5 * Math.sin(t * 0.9 + x * 0.02);
      g.fillStyle(0xc8c0e0, 0.08 + k * 0.1); g.fillEllipse(x + 20, SEA_Y - 2 - k * 8, 48, 4);
    }
    // Foam round the jetty piles.
    for (const y of [1350, 1420, 1484]) for (const x of [JETTY.x - 4, JETTY.x + JETTY.w + 4]) {
      if (!inView(view, x, y, 30)) continue;
      g.fillStyle(0xc8c0e0, 0.25 + Math.sin(t * 1.7 + y) * 0.12); g.fillEllipse(x, y + 6, 18, 4);
    }
    if (free) {
      // Dawn on the water south of the jetty.
      glow(g, 1200, H + 40, 260, 0xffb070, 0.03, 4);
    }
  }

  // ── The spire breathes: a violet pulse runs down each seam from the cliff every few seconds.
  if (!free) {
    for (let i = 0; i < SEAMS.length; i++) {
      const [ax, ay, bx, by] = SEAMS[i];
      if (!inView(view, (ax + bx) / 2, (ay + by) / 2, 400)) continue;
      const ph = ((t * 0.22 + i * 0.37) % 1);
      if (ph > 0.6) continue;
      const f = ph / 0.6;
      const x = ax + (bx - ax) * f, y = ay + (by - ay) * f;
      g.fillStyle(OBS.seam, 0.12 * (1 - f)); g.fillCircle(x, y, 26);
      g.fillStyle(OBS.seamLit, 0.5 * (1 - f)); g.fillCircle(x, y, 3);
    }
  }

  // ── The stair-niches: one lamp of starlight for every bench broken.
  if (inView(view, 1200, 200, 400)) {
    BENCHES.forEach((b, i) => {
      const p = NICHES[i];
      if (!world.test({ courtReady: b.id })) {
        g.fillStyle(OBS.seam, 0.12 + 0.06 * Math.sin(t * 1.3 + i)); g.fillCircle(p.x, p.y, 5);
        return;
      }
      const f = 0.85 + 0.15 * Math.sin(t * 2.2 + i * 1.3);
      glow(g, p.x, p.y, 26 * f, OBS.star, 0.05, 4);
      g.fillStyle(OBS.starDeep, 0.9); g.fillCircle(p.x, p.y, 5);
      g.fillStyle(OBS.starCore, 1); g.fillCircle(p.x, p.y - 1, 3);
    });
    // All sixty: the stair's top seam floods with starlight.
    if (world.test({ seats: 60 }) && !free) {
      const k = 0.6 + 0.4 * Math.sin(t * 1.1);
      for (let y = 10; y < STAIR_FOOT; y += 26) { g.fillStyle(OBS.star, 0.05 * k * (1 - y / STAIR_FOOT)); g.fillEllipse(1200, y, 180, 14); }
    }
  }

  // ── Light on the shingle: the fire, Wren's lamp, Tamsin's coals, Odo's portholes, the kitchen.
  const f = 0.85 + 0.1 * Math.sin(t * 7) + 0.05 * Math.sin(t * 13);
  if (inView(view, P.fire.x, P.fire.y, 260)) {
    g.fillStyle(EMBER, 0.05 * f); g.fillEllipse(P.fire.x, P.fire.y + 6, 440 * f, 200 * f);
    g.fillStyle(EMBER, 0.06 * f); g.fillEllipse(P.fire.x, P.fire.y + 4, 260 * f, 110 * f);
    g.fillStyle(0xffc070, 0.07 * f); g.fillEllipse(P.fire.x, P.fire.y + 2, 130, 50);
  }
  if (inView(view, P.wren.x, P.wren.y, 200)) {
    const h = lampHead(P.wren.x, P.wren.y);
    g.fillStyle(0xffd890, 0.05 + 0.01 * Math.sin(t * 5)); g.fillEllipse(P.wren.x, P.wren.y + 4, 240, 90);
    g.fillStyle(0xffd890, 0.035); g.fillTriangle(h.x - 12, h.y + 16, h.x + 12, h.y + 16, P.wren.x, P.wren.y + 30);
  }
  if (inView(view, P.tamsin.x, P.tamsin.y, 160)) {
    const c = cartCoals(P.tamsin.x, P.tamsin.y);
    g.fillStyle(EMBER, 0.06 * f); g.fillEllipse(c.x, c.y + 28, 90, 30);
    g.fillStyle(0xff6a2a, 0.9); g.fillEllipse(c.x, c.y, 20, 6);
    g.fillStyle(0xffd070, 0.7 + 0.3 * Math.sin(t * 9)); g.fillEllipse(c.x - 3, c.y - 1, 8, 3);
  }
  if (inView(view, P.odo.x, P.odo.y, 160)) {
    for (const [i, p] of bellPorts(P.odo.x, P.odo.y).entries()) {
      const k = 0.7 + 0.3 * Math.sin(t * 1.4 + i);
      g.fillStyle(0x6af0e0, 0.08 * k); g.fillCircle(p.x, p.y, 18);
      g.fillStyle(0x6af0e0, 0.75 * k); g.fillCircle(p.x, p.y, 6);
      g.fillStyle(0xe0fff8, 0.6); g.fillCircle(p.x - 2, p.y - 2, 1.6);
    }
    g.fillStyle(0x6af0e0, 0.03); g.fillEllipse(P.odo.x, P.odo.y + 6, 200, 50);
  }
  if (inView(view, P.kitchen.x, P.kitchen.y, 200)) {
    const p = potAt(P.kitchen.x, P.kitchen.y);
    g.fillStyle(EMBER, 0.07 * f); g.fillEllipse(p.x, P.kitchen.y + 6, 140, 40);
  }
  if (inView(view, P.tansy.x, P.tansy.y, 200)) {
    const s = stillParts(P.tansy.x, P.tansy.y);
    g.fillStyle(0xff8a3a, 0.08 * f); g.fillEllipse(s.fire.x, s.fire.y + 4, 70, 18);
    g.fillStyle(0xffb050, 0.8); g.fillEllipse(s.fire.x, s.fire.y, 26 * f, 6);
  }
  // ── Sable's beam: the Meridian lens sweeping slow across the sea.
  if (inView(view, P.sable.x, P.sable.y + 200, 700)) {
    const c = lensCentre(P.sable.x, P.sable.y);
    const a = Math.PI * 0.62 + Math.sin(t * 0.25) * 0.5;
    const len = 900;
    const tipX = c.x + Math.cos(a) * len, tipY = c.y + Math.sin(a) * len;
    const nx = -Math.sin(a), ny = Math.cos(a);
    g.fillStyle(0xfff4d0, 0.035); g.fillTriangle(c.x, c.y, tipX + nx * 140, tipY + ny * 140, tipX - nx * 140, tipY - ny * 140);
    g.fillStyle(0xfff4d0, 0.04); g.fillTriangle(c.x, c.y, tipX + nx * 50, tipY + ny * 50, tipX - nx * 50, tipY - ny * 50);
  }
}

/** Over the actors: flames, the breathing balloon, the bees, the birds, the moth, the steam. */
function animateAbove(g: G, t: number, view: Rect, world: PainterWorld): void {
  // ── The Muster's fire.
  if (inView(view, P.fire.x, P.fire.y, 200)) {
    const x = P.fire.x, y = P.fire.y - 4;
    for (let i = 0; i < 7; i++) {
      const ph = t * 3.1 + i * 1.7;
      const h = 26 + Math.sin(ph) * 8 + (i % 3) * 6;
      const dx = (i - 3) * 6 + Math.sin(ph * 0.7) * 3;
      poly(g, [[x + dx - 7, y], [x + dx + 7, y], [x + dx + Math.sin(ph * 1.3) * 4, y - h]], i % 2 ? 0xff6a2a : 0xff9a3a, 0.85);
    }
    for (let i = 0; i < 4; i++) {
      const ph = t * 3.7 + i * 2.1;
      poly(g, [[x + (i - 1.5) * 6 - 4, y], [x + (i - 1.5) * 6 + 4, y], [x + (i - 1.5) * 5 + Math.sin(ph) * 3, y - 14 - Math.sin(ph) * 5]], 0xffe0a0, 0.9);
    }
    for (let i = 0; i < 10; i++) {
      const ph = (t * 0.6 + i * 0.13) % 1;
      g.fillStyle(0xffc060, (1 - ph) * 0.9); g.fillCircle(x + Math.sin(i * 2.7 + t * 1.5) * (8 + ph * 20), y - 20 - ph * 130, 1.4);
    }
    glow(g, x, y - 14, 34 + Math.sin(t * 8) * 3, 0xff9a3a, 0.05, 3);
  }

  // ── The *Dandelion*: half full, breathing, straining a little at her ropes.
  if (inView(view, P.barnaby.x, P.barnaby.y - 160, 260)) {
    const m = balloonMouth(P.barnaby.x, P.barnaby.y);
    const breath = 0.5 + 0.5 * Math.sin(t * 0.8);
    const fill = world.test({ seats: 40 }) ? 0.95 : world.test({ seats: 20 }) ? 0.8 : 0.66;
    const rH = (110 + breath * 10) * fill, rW = (96 + breath * 8) * (0.7 + fill * 0.3);
    const cy = m.y - rH * 0.95;
    const lean = Math.sin(t * 0.5) * 6;
    // Ropes from the basket rim to the envelope's belly.
    g.lineStyle(1, 0xc8b890, 0.85);
    for (const s of [-1, -0.4, 0.4, 1]) g.lineBetween(P.barnaby.x + s * 26, P.barnaby.y - 52, m.x + lean * 0.5 + s * rW * 0.42, cy + rH * 0.62);
    // The envelope: yellow and cream gores, sagging where it is not yet full.
    g.fillStyle(0x8a6a1a, 1); g.fillEllipse(m.x + lean, cy + 3, rW * 2 + 6, rH * 1.6 + 6);
    const gores = 8;
    for (let k = 0; k < gores; k++) {
      const a0 = -Math.PI / 2 + (k / gores) * Math.PI, a1 = -Math.PI / 2 + ((k + 1) / gores) * Math.PI;
      const x0 = m.x + lean - rW * Math.cos(a0 + Math.PI / 2), x1 = m.x + lean - rW * Math.cos(a1 + Math.PI / 2);
      poly(g, [[m.x + lean, cy - rH * 0.8], [x0, cy], [m.x + (x0 - m.x) * 0.34, cy + rH * 0.66], [m.x + (x1 - m.x) * 0.34, cy + rH * 0.66], [x1, cy]],
        k % 2 ? 0xf0c840 : 0xfff0c0);
    }
    // Sag creases while she is not full.
    if (fill < 0.9) for (let k = 0; k < 4; k++) { g.lineStyle(1.5, 0xc89a30, 0.6); g.lineBetween(m.x + lean - 40 + k * 26, cy + rH * 0.2, m.x + lean - 30 + k * 22, cy + rH * 0.5); }
    g.fillStyle(0xffffff, 0.3); g.fillEllipse(m.x + lean - rW * 0.4, cy - rH * 0.3, rW * 0.3, rH * 0.45);
    // A dandelion clock painted on her flank.
    const dx = m.x + lean + rW * 0.3, dy = cy - rH * 0.1;
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.lineStyle(1, 0xffffff, 0.8); g.lineBetween(dx, dy, dx + Math.cos(a) * 9, dy + Math.sin(a) * 9); }
    g.fillStyle(0x6a8a3a, 1); g.fillCircle(dx, dy, 2);
  }

  // ── Wendeline's Ladies, working the beach for flowers that are not there.
  if (inView(view, P.wendeline.x, P.wendeline.y, 200)) {
    for (const [i, d] of skepDoors(P.wendeline.x, P.wendeline.y).entries()) {
      for (let k = 0; k < 5; k++) {
        const a = t * (1.6 + k * 0.3) + k * 1.9 + i;
        const r = 14 + ((k * 7) % 20) + Math.sin(t * 2 + k) * 6;
        const x = d.x + Math.cos(a) * r * 1.4, y = d.y - 10 + Math.sin(a * 1.3) * r * 0.6;
        g.fillStyle(0x2a1a0a, 1); g.fillEllipse(x, y, 3.4, 2.4);
        g.fillStyle(0xf0c030, 1); g.fillRect(x - 0.6, y - 1, 1.2, 2);
        g.fillStyle(0xffffff, 0.6); g.fillEllipse(x - 0.5, y - 2, 2.4, 1.4);
      }
    }
  }

  // ── The Duchess in her cage: a hop, a fluff, a turn of the head.
  if (inView(view, P.gideon.x, P.gideon.y, 160)) {
    const c = canaryCage(P.gideon.x, P.gideon.y);
    const hop = Math.max(0, Math.sin(t * 2.4)) > 0.92 ? -3 : 0;
    const face = Math.sin(t * 0.7) > 0 ? 1 : -1;
    g.fillStyle(0xf0d030, 1); g.fillEllipse(c.x, c.y - 7 + hop, 9, 8);
    g.fillStyle(0xf8e050, 1); g.fillCircle(c.x + face * 3, c.y - 12 + hop, 3.4);
    g.fillStyle(0xe08a20, 1); g.fillTriangle(c.x + face * 6, c.y - 12 + hop, c.x + face * 9, c.y - 11 + hop, c.x + face * 6, c.y - 10 + hop);
    g.fillStyle(0x1a1a1a, 1); g.fillCircle(c.x + face * 4, c.y - 13 + hop, 0.9);
    // When the air is good, she sings: tiny notes, more of them the higher you have climbed.
    const notes = world.test({ seats: 40 }) ? 3 : world.test({ seats: 20 }) ? 2 : 1;
    for (let k = 0; k < notes; k++) {
      const ph = (t * 0.45 + k / notes) % 1;
      g.fillStyle(0xf8e878, (1 - ph) * 0.8); g.fillCircle(c.x + face * (6 + ph * 18), c.y - 18 - ph * 26, 1.8);
      g.lineStyle(1, 0xf8e878, (1 - ph) * 0.8); g.lineBetween(c.x + face * (6 + ph * 18) + 1.6, c.y - 18 - ph * 26, c.x + face * (6 + ph * 18) + 1.6, c.y - 24 - ph * 26);
    }
  }

  // ── Wren's lamp: a real flame, lit by hand.
  if (inView(view, P.wren.x, P.wren.y - 180, 140)) {
    const h = lampHead(P.wren.x, P.wren.y);
    const fl = 0.85 + 0.15 * Math.sin(t * 11) * Math.sin(t * 4.3);
    glow(g, h.x, h.y, 30 * fl, 0xffd070, 0.06, 4);
    poly(g, [[h.x - 3.5, h.y + 6], [h.x + 3.5, h.y + 6], [h.x + Math.sin(t * 6) * 1.5, h.y - 7 * fl]], 0xffb040);
    poly(g, [[h.x - 1.8, h.y + 5], [h.x + 1.8, h.y + 5], [h.x, h.y - 2 * fl]], 0xfff4c0);
  }

  // ── Tansy's still: steam off the worm, the slow green drip, Pestle on guard.
  if (inView(view, P.tansy.x, P.tansy.y, 200)) {
    const s = stillParts(P.tansy.x, P.tansy.y);
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.3 + i / 5) % 1;
      g.fillStyle(0xd8e8d0, (1 - ph) * 0.25); g.fillCircle(P.tansy.x + 34 + Math.sin(t + i) * 6 + ph * 10, P.tansy.y - 76 - ph * 90, 5 + ph * 14);
    }
    const dp = (t * 0.8) % 1;
    g.fillStyle(0x9be04a, 0.9); g.fillEllipse(s.drip.x + 2, s.drip.y + 4 + dp * 10, 2.4, 3.6);
    // Pestle: a lean grey-brown mongoose upright on his crate, head turning to watch the beach.
    const look = Math.sin(t * 0.6) * 0.8 + (Math.sin(t * 3.1) > 0.97 ? 0.6 : 0);
    const px = s.pestle.x, py = s.pestle.y;
    g.lineStyle(4, 0x6a5a48, 1); g.beginPath(); g.arc(px + 10, py - 2, 9, Math.PI * 1.1, Math.PI * 0.2, true); g.strokePath();
    g.fillStyle(0x6a5a48, 1); g.fillEllipse(px, py - 12, 10, 20);
    g.fillStyle(0x8a7a62, 1); g.fillEllipse(px - 1, py - 10, 6, 14);
    const hx = px + look * 4, hy = py - 24;
    g.fillStyle(0x6a5a48, 1); g.fillEllipse(hx, hy, 10, 8);
    g.fillStyle(0x5a4a3a, 1); g.fillTriangle(hx + look * 5, hy - 1, hx + look * 10 + (look >= 0 ? 1 : -1), hy + 1, hx + look * 5, hy + 3);
    g.fillStyle(0x1a1a1a, 1); g.fillCircle(hx + look * 3, hy - 1, 1);
    g.fillStyle(0x8a7a62, 1); g.fillCircle(hx - 3, hy - 4, 1.6); g.fillCircle(hx + 3, hy - 4, 1.6);
  }

  // ── Tuppence: on her perch, then down to the table to rearrange somebody's buttons, then back.
  if (inView(view, P.marlo.x, P.marlo.y, 180)) {
    const perch = magpiePerch(P.marlo.x, P.marlo.y);
    const cyc = t % 9;
    let bx = perch.x, by = perch.y;
    if (cyc > 5 && cyc < 7.5) {
      const f = cyc < 5.5 ? (cyc - 5) / 0.5 : cyc > 7 ? 1 - (cyc - 7) / 0.5 : 1;
      bx = perch.x + (P.marlo.x + 22 - perch.x) * f; by = perch.y + (P.marlo.y - 50 - perch.y) * f - Math.sin(f * Math.PI) * 20;
    }
    const peck = cyc > 5.6 && cyc < 7 && Math.sin(t * 12) > 0 ? 2 : 0;
    g.fillStyle(0x0a0a10, 1); g.fillTriangle(bx - 4, by - 6, bx - 16, by - 2, bx - 4, by - 2);
    g.fillStyle(0x10101a, 1); g.fillEllipse(bx, by - 7, 12, 9);
    g.fillStyle(0xffffff, 1); g.fillEllipse(bx, by - 6, 6, 5);
    g.fillStyle(0x2a3a6a, 1); g.fillEllipse(bx - 3, by - 8, 7, 3);
    g.fillStyle(0x10101a, 1); g.fillCircle(bx + 5, by - 12 + peck, 3.6);
    g.fillStyle(0x2a2a2a, 1); g.fillTriangle(bx + 8, by - 12 + peck, bx + 13, by - 11 + peck * 1.5, bx + 8, by - 10 + peck);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(bx + 6, by - 13 + peck, 0.8);
  }

  // ── Patter on the bandstand rail; and once the climb is under way, Lark's notes in the air.
  if (inView(view, P.lark.x, P.lark.y, 200)) {
    const r = mynahRail(P.lark.x, P.lark.y);
    const talk = Math.sin(t * 5) > 0.3 && Math.sin(t * 0.7) > 0;
    g.fillStyle(0x10101a, 1); g.fillEllipse(r.x, r.y - 7, 11, 11);
    g.fillStyle(0x1a1a2a, 1); g.fillCircle(r.x - 3, r.y - 14, 4.2);
    g.fillStyle(0xf0c030, 1); g.fillTriangle(r.x - 7, r.y - 15, r.x - 12, r.y - 13 + (talk ? 1.5 : 0), r.x - 7, r.y - 12);
    if (talk) g.fillTriangle(r.x - 7, r.y - 13, r.x - 11, r.y - 11, r.x - 7, r.y - 11);
    g.fillStyle(0xf0c030, 1); g.fillEllipse(r.x - 1, r.y - 13, 3, 2);
    g.fillStyle(0xffffff, 1); g.fillCircle(r.x - 4, r.y - 15, 0.8);
    g.fillStyle(0xffffff, 0.85); g.fillRect(r.x + 1, r.y - 7, 4, 2);
    const singing = world.test({ seats: 20 });
    if (singing) {
      for (let k = 0; k < 4; k++) {
        const ph = (t * 0.3 + k / 4) % 1;
        const nx = P.lark.x - 20 + Math.sin(ph * 6 + k) * 30, ny = P.lark.y - 70 - ph * 140;
        g.fillStyle(ISLE_COLOR.sound, (1 - ph) * 0.8); g.fillEllipse(nx, ny, 5, 3.6);
        g.lineStyle(1.2, ISLE_COLOR.sound, (1 - ph) * 0.8); g.lineBetween(nx + 2.4, ny, nx + 2.4, ny - 10);
      }
    }
  }

  // ── Nocturne: a great pale luna moth that always flies AWAY from the lamp, into the dark.
  if (inView(view, P.sable.x, P.sable.y - 100, 260)) {
    const c = lensCentre(P.sable.x, P.sable.y);
    const ax = c.x + 70 + Math.sin(t * 0.9) * 50, ay = c.y + 40 + Math.sin(t * 1.7) * 40;
    const flap = Math.abs(Math.sin(t * 9));
    g.fillStyle(0xd8f0e0, 0.08); g.fillCircle(ax, ay, 18);
    for (const s of [-1, 1]) {
      g.fillStyle(0xc8ecd8, 0.95); g.fillEllipse(ax + s * 7 * flap, ay - 2, 13 * flap + 2, 12);
      g.fillStyle(0xb8e0c8, 0.95); g.fillEllipse(ax + s * 5 * flap, ay + 7, 7 * flap + 2, 12);
      g.fillStyle(0x8ab8a0, 1); g.fillCircle(ax + s * 8 * flap, ay - 2, 1.6);
    }
    g.fillStyle(0xf0f8f0, 1); g.fillEllipse(ax, ay + 1, 3.4, 11);
  }

  // ── The kitchen pot simmering.
  if (inView(view, P.kitchen.x, P.kitchen.y, 200)) {
    const p = potAt(P.kitchen.x, P.kitchen.y);
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.35 + i / 5) % 1;
      g.fillStyle(0xe8e0d8, (1 - ph) * 0.3); g.fillCircle(p.x + Math.sin(t * 1.3 + i) * 6, p.y - 30 - ph * 70, 4 + ph * 12);
    }
    for (let i = 0; i < 5; i++) {
      const ph = t * 4 + i * 1.3;
      poly(g, [[p.x - 14 + i * 7 - 4, P.kitchen.y - 4], [p.x - 14 + i * 7 + 4, P.kitchen.y - 4], [p.x - 14 + i * 7, P.kitchen.y - 14 - Math.sin(ph) * 4]], i % 2 ? 0xff6a2a : 0xffb050, 0.85);
    }
  }

  // ── Glassrain catching the stair lamps: a soft violet haze down the stair while the King sits.
  if (!world.test(KING) && inView(view, 1200, 160, 300)) {
    for (let i = 0; i < 4; i++) {
      const pts = crackPath({ x: 1200 + (i - 1.5) * 60, y: 0 }, { x: 1200 + (i - 1.5) * 40, y: STAIR_FOOT - 30 }, () => ((i * 0.37 + 0.2) % 1), 4, 3);
      const k = 0.5 + 0.5 * Math.sin(t * 0.9 + i * 1.4);
      g.lineStyle(10, OBS.seam, 0.025 * k);
      g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
    }
  }
  // After the King: the throne-light at the top of the stair is warm and steady — the star let go.
  if (world.test(KING) && inView(view, 1200, 20, 200)) starGlow(g, 1200, -30, 10, t, 0.35);
}

// ── POIs ─────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  { kind: 'mooring', at: { x: 1200, y: 1462 }, isle: 'pinnacle' },
  { kind: 'waystone', at: { x: 1040, y: 1200 } },
  {
    kind: 'sign', at: { x: 1030, y: 372 },
    text: 'THE TALLY STONE. A gate of five for every one who landed. Hundreds. The column headed with an oar is empty.',
  },
  {
    kind: 'sign', at: { x: 1290, y: 1262 },
    text: 'GLASSWATER LANDING. The First Stair is north. Boats in: more than anyone counted. Boats out: none, yet.',
  },
  {
    kind: 'sign', at: { x: 260, y: 640 },
    text: 'A longship\'s ribs, glass grown up between them. A name was cut on the keel. The glass has grown over it.',
  },
  { kind: 'chest', id: 'pin-landing-chest-galley', at: { x: 2250, y: 530 }, coins: 420, orbs: 3 },
  { kind: 'chest', id: 'pin-landing-chest-oar', at: { x: 2340, y: 1290 }, coins: 260, orbs: 2, open: { seats: 30 } },
];

export const PIN_LANDING_AREA: AreaDef = {
  id: PIN_LANDING,
  isle: 'pinnacle',
  name: 'Glasswater Landing',
  subtitle: 'The foot of the Obsidian Pinnacle — the Muster',
  w: W,
  h: H,
  bg: OBS.sky,
  accent: OBS.seam,
  weather: 'glassrain',
  gloom: 0.2,
  intro: 'cine-landfall',
  spawn: { x: 1200, y: 1410 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver: animateAbove },
  solids,
  exits: [{ side: 'n', to: 'bench-fire', label: 'The First Stair — up to the Ember Bench' }],
  pois: POIS,
  npcs: PIN_LANDING_NPCS,
};
