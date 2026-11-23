import type { AreaDef, NpcDef, Poi, Pt, Rect, Solid } from '../../../../IslesTypes';
import type { G } from '../../../../art/IsleArt';
import { glow, motes, mulberry } from '../../../../art/IsleArt';
import { OBS, councilMask, crackPath, glassFloor, seam, shard, slab, starfield } from '../../../../art/PinnacleArt';
import { BENCHES, above, below, benchIntroId, relicId, seatId } from '../../spec';
import {
  GREEN, bellJar, councilSeat, glassLeaf, lit, obsidianTree, poly, pruningShears, rootSplit, sapling, vine,
} from './art';

/**
 * The Thorn Bench — the third bench of the Obsidian Pinnacle, where the Pruning was written.
 *
 * A hothouse made of obsidian. The walls are ribs of black glass with the night between them;
 * the trees are black glass, and their glass leaves chime. But the vines are real: green, alive,
 * pushing up through every crack in the floor and splitting the glass as they come. The isles
 * are winning, and this room knows it.
 *
 * You climb from the south stair up a polished aisle. In the middle of the room, hung on chains
 * from a ceiling nobody can see, are THE PRUNING SHEARS — house-sized, blades open — and under
 * them, on a round dais, a living sapling kept in a bell jar: the law's own specimen, kept alive
 * and never allowed to grow. Six seats stand up the room in pairs, a councilor before each. When
 * the sixth falls the jar splits, the sapling grows, and vines take the shears.
 */

const B = BENCHES.find((x) => x.isle === 'life')!;
const W = 1600;
const H = 2000;
const WALL_L = 130;
const WALL_R = 1470;
const TOP = 70;
const BOT = 1940;
const MID = 800;
const GAP = 70; // half the stair gaps
/** The dais the jar sits on, and the shears over it. */
const DAIS: Pt = { x: MID, y: 1060 };
const DAIS_R = 110;

/** Where each councilor stands (in court order); the seat stands behind them. */
export const SEATS: Record<string, Pt> = {
  life: { x: 420, y: 1580 },
  growth: { x: 1180, y: 1580 },
  gluttony: { x: 380, y: 1140 },
  hunt: { x: 1220, y: 1140 },
  marrow: { x: 440, y: 660 },
  gum: { x: 1160, y: 660 },
};

const TREES: { x: number; y: number; s: number; lean: number; vines: number }[] = [
  { x: 214, y: 1830, s: 1.05, lean: 12, vines: 2 },
  { x: 1390, y: 1840, s: 1.1, lean: -10, vines: 1 },
  { x: 220, y: 1370, s: 1.15, lean: 8, vines: 1 },
  { x: 1385, y: 1360, s: 1.0, lean: -14, vines: 2 },
  { x: 205, y: 900, s: 1.2, lean: 6, vines: 2 },
  { x: 1395, y: 905, s: 1.15, lean: -6, vines: 1 },
  { x: 230, y: 420, s: 1.0, lean: 10, vines: 1 },
  { x: 1370, y: 430, s: 1.05, lean: -12, vines: 2 },
  { x: 560, y: 260, s: 0.85, lean: -6, vines: 1 },
  { x: 1040, y: 250, s: 0.9, lean: 6, vines: 1 },
  { x: 560, y: 1880, s: 0.75, lean: 4, vines: 1 },
  { x: 1040, y: 1885, s: 0.7, lean: -4, vines: 1 },
];

// ── Solids ────────────────────────────────────────────────────────────

const solids: Solid[] = [
  { kind: 'rect', x: 0, y: 0, w: WALL_L, h: H },
  { kind: 'rect', x: WALL_R, y: 0, w: W - WALL_R, h: H },
  { kind: 'rect', x: WALL_L, y: 0, w: MID - GAP - WALL_L, h: TOP },
  { kind: 'rect', x: MID + GAP, y: 0, w: WALL_R - MID - GAP, h: TOP },
  { kind: 'rect', x: WALL_L, y: BOT, w: MID - GAP - WALL_L, h: H - BOT },
  { kind: 'rect', x: MID + GAP, y: BOT, w: WALL_R - MID - GAP, h: H - BOT },
  { kind: 'circle', x: DAIS.x, y: DAIS.y - 10, r: DAIS_R - 8 },
];
for (const t of TREES) solids.push({ kind: 'circle', x: t.x, y: t.y - 4, r: 22 * t.s });
for (const p of Object.values(SEATS)) solids.push({ kind: 'rect', x: p.x - 74, y: p.y - 86, w: 148, h: 46 });

// ── Ground ────────────────────────────────────────────────────────────

/** The hothouse wall: ribs of obsidian, and between them panes of black glass with the night in them. */
function wallBand(g: G, x0: number, x1: number, rng: () => number): void {
  g.fillStyle(OBS.sky, 1); g.fillRect(x0, 0, x1 - x0, H);
  starfield(g, x0, 0, x1 - x0, H, rng, 160, 0);
  // Panes: a faint violet sheen, a reflection stripe.
  for (let y = 0; y < H; y += 150) {
    g.fillStyle(OBS.skyGlow, 0.25); g.fillRect(x0, y + 8, x1 - x0, 134);
    g.fillStyle(0xffffff, 0.04); g.fillRect(x0 + 10, y + 14, 6, 120);
  }
  // Ribs.
  for (let y = 0; y <= H; y += 150) {
    g.fillStyle(OBS.glass, 1); g.fillRect(x0, y - 8, x1 - x0, 16);
    g.fillStyle(OBS.sheen, 1); g.fillRect(x0, y - 8, x1 - x0, 4);
    g.lineStyle(1, OBS.edge, 0.5); g.lineBetween(x0, y - 4, x1, y - 4);
  }
  // The sill where wall meets floor.
  const sx = x0 === 0 ? x1 - 14 : x0;
  g.fillStyle(OBS.facet, 1); g.fillRect(sx, 0, 14, H);
  g.lineStyle(1.4, OBS.edge, 0.7); g.lineBetween(x0 === 0 ? x1 : x0, 0, x0 === 0 ? x1 : x0, H);
  // Vines have got in at the sill and climb the ribs.
  for (let y = 120; y < H - 60; y += 150 + rng() * 120) {
    const bx = x0 === 0 ? x1 - 6 : x0 + 6;
    const dir = x0 === 0 ? -1 : 1;
    const pts: Pt[] = [{ x: bx, y }];
    for (let k = 1; k <= 5; k++) pts.push({ x: bx + dir * k * ((x1 - x0) / 6) + Math.sin(k * 1.9) * 8, y: y - k * 22 + Math.sin(k * 2.7) * 10 });
    vine(g, pts, 2.4, rng, { leaves: 12, bloom: 0.12 });
  }
}

/** The polished aisle up the middle: big slabs with pale joints, worn bright down the centre. */
function aisle(g: G, rng: () => number): void {
  const x0 = MID - 110, x1 = MID + 110;
  for (let y = TOP; y < BOT + 60; y += 90) {
    const h = Math.min(90, H - y);
    g.fillStyle(OBS.facet, 1); g.fillRect(x0, y, x1 - x0, h);
    g.fillStyle(OBS.sheen, 0.35); g.fillRect(x0 + 40, y + 2, 140, h - 4);
    g.fillStyle(0xffffff, 0.03); g.fillRect(x0 + 80, y + 2, 60, h - 4);
    g.lineStyle(1, OBS.edge, 0.35); g.lineBetween(x0, y, x1, y);
    if (rng() < 0.35) seam(g, crackPath({ x: x0 + 20 + rng() * 60, y: y + 10 }, { x: x0 + 120 + rng() * 80, y: y + h - 10 }, rng, 8, 4), 1, 0.5);
  }
  g.lineStyle(2, OBS.edge, 0.6); g.lineBetween(x0, TOP, x0, BOT + 60); g.lineBetween(x1, TOP, x1, BOT + 60);
  // Inlaid down the aisle at intervals: a vine glyph in green-lit glass (put there by the law,
  // as an ornament; now there are real ones beside it).
  for (let y = 180; y < BOT; y += 220) {
    if (Math.abs(y - DAIS.y) < DAIS_R + 60) continue;
    g.lineStyle(1.4, GREEN.leaf, 0.4);
    g.strokeCircle(MID, y, 22);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      g.lineBetween(MID + Math.cos(a) * 8, y + Math.sin(a) * 8, MID + Math.cos(a) * 20, y + Math.sin(a) * 20);
    }
    g.fillStyle(GREEN.glow, 0.35); g.fillCircle(MID, y, 5);
  }
}

/** The dais floor round the jar: a compass of rings and spokes, the Pruning's clauses cut into it. */
function daisFloor(g: G, rng: () => number): void {
  const { x, y } = DAIS;
  for (let i = 5; i >= 0; i--) {
    g.fillStyle(i % 2 ? OBS.facet : OBS.glass, 1);
    g.fillEllipse(x, y, (DAIS_R + 70 + i * 16) * 2, (DAIS_R + 70 + i * 16) * 1.4);
  }
  g.lineStyle(1.2, OBS.edge, 0.4);
  for (let i = 0; i < 6; i++) g.strokeEllipse(x, y, (DAIS_R + 70 + i * 16) * 2, (DAIS_R + 70 + i * 16) * 1.4);
  // Sixty clause-marks round the outer ring — one per seat on the whole Pinnacle; the six of this
  // bench glow green.
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const r0 = DAIS_R + 150, r1 = DAIS_R + 162;
    const mine = i >= 12 && i < 18;
    g.lineStyle(mine ? 2.4 : 1.2, mine ? GREEN.glow : OBS.edge, mine ? 0.9 : 0.4);
    g.lineBetween(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * 0.7, x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.7);
  }
  // The shears' shadow lies across the dais: an open X.
  g.fillStyle(0x000000, 0.28);
  poly(g, [x - 40, y - 30, x - 230, y + 120, x - 200, y + 136, x - 10, y - 10], 0x000000, 0.28);
  poly(g, [x + 40, y - 30, x + 230, y + 120, x + 200, y + 136, x + 10, y - 10], 0x000000, 0.28);
  // Roots have come up round the dais from below and split its rings.
  for (let i = 0; i < 7; i++) {
    const a = rng() * Math.PI * 2;
    rootSplit(g, x + Math.cos(a) * (DAIS_R + 20), y + Math.sin(a) * (DAIS_R + 20) * 0.7, 120 + rng() * 80, a, rng);
  }
}

/** The dais around each seat: a half-moon of polished slab, the seat's glyph ring in green. */
function seatFloor(g: G, p: Pt, rng: () => number): void {
  const y = p.y - 50;
  g.fillStyle(OBS.facet, 1); g.fillEllipse(p.x, y, 280, 150);
  g.fillStyle(OBS.glass, 1); g.fillEllipse(p.x, y, 250, 128);
  g.lineStyle(1.2, OBS.edge, 0.5); g.strokeEllipse(p.x, y, 280, 150);
  g.lineStyle(1.5, GREEN.leaf, 0.35); g.strokeEllipse(p.x, y, 232, 116);
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2;
    g.fillStyle(GREEN.glow, 0.25); g.fillCircle(p.x + Math.cos(a) * 116, y + Math.sin(a) * 58, 2);
  }
  rootSplit(g, p.x + (rng() - 0.5) * 120, y + 40, 90, Math.PI / 2 + (rng() - 0.5), rng);
}

function paintGround(g: G, rng: () => number): void {
  glassFloor(g, 0, 0, W, H, 64, rng);
  // The floor's long reflection of a sky that is not there: violet sheen in bands.
  for (let i = 0; i < 9; i++) {
    g.fillStyle(OBS.skyGlow, 0.05); g.fillRect(WALL_L, 120 + i * 210, WALL_R - WALL_L, 70);
  }
  aisle(g, rng);
  daisFloor(g, rng);
  for (const p of Object.values(SEATS)) seatFloor(g, p, rng);
  // Roots splitting the glass everywhere — the green coming through.
  for (let i = 0; i < 34; i++) {
    const x = WALL_L + 40 + rng() * (WALL_R - WALL_L - 80), y = TOP + 60 + rng() * (BOT - TOP - 120);
    if (Math.abs(x - DAIS.x) < DAIS_R + 40 && Math.abs(y - DAIS.y) < DAIS_R + 40) continue;
    rootSplit(g, x, y, 50 + rng() * 90, rng() * Math.PI * 2, rng);
  }
  // Long vines crawling in from the walls across the floor.
  for (let i = 0; i < 12; i++) {
    const west = i % 2 === 0;
    const y0 = TOP + 120 + rng() * (BOT - TOP - 240);
    const pts: Pt[] = [{ x: west ? WALL_L : WALL_R, y: y0 }];
    for (let k = 1; k <= 7; k++) pts.push({ x: (west ? WALL_L : WALL_R) + (west ? 1 : -1) * k * (30 + rng() * 26), y: y0 + Math.sin(k * 1.2 + i) * 30 + (rng() - 0.5) * 20 });
    vine(g, pts, 2.2 + rng(), rng, { leaves: 14, bloom: 0.08 });
  }
  // Fallen glass leaves, swept nowhere.
  for (let i = 0; i < 260; i++) {
    glassLeaf(g, WALL_L + rng() * (WALL_R - WALL_L), TOP + rng() * (BOT - TOP), rng() * Math.PI * 2, 6 + rng() * 6, rng() < 0.06 ? 1 : 0, 0.9);
  }
  // The stair heads: worn steps north and south.
  for (const [y0, dir] of [[BOT, 1], [TOP, -1]] as [number, number][]) {
    for (let k = 0; k < 4; k++) {
      const y = y0 + dir * k * 16 - (dir < 0 ? 16 : 0);
      g.fillStyle(k % 2 ? OBS.facet : OBS.sheen, 1); g.fillRect(MID - GAP, y, GAP * 2, 14);
      g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(MID - GAP, y, MID + GAP, y);
    }
  }
  wallBand(g, 0, WALL_L, rng);
  wallBand(g, WALL_R, W, rng);
  // The north and south walls: low obsidian kerbs with a seam in each.
  for (const y of [0, BOT]) {
    for (const [x0, x1] of [[WALL_L, MID - GAP], [MID + GAP, WALL_R]]) {
      g.fillStyle(OBS.glass, 1); g.fillRect(x0, y, x1 - x0, y === 0 ? TOP : H - BOT);
      g.fillStyle(OBS.sheen, 1); g.fillRect(x0, y === 0 ? TOP - 10 : BOT, x1 - x0, 6);
      g.lineStyle(1.2, OBS.edge, 0.6); g.lineBetween(x0, y === 0 ? TOP - 4 : BOT + 6, x1, y === 0 ? TOP - 4 : BOT + 6);
      seam(g, crackPath({ x: x0 + 30, y: y === 0 ? TOP / 2 : BOT + 30 }, { x: x1 - 30, y: y === 0 ? TOP / 2 + 6 : BOT + 34 }, rng, 6, 7), 1.1, 0.6);
    }
  }
}

// ── Pieces ────────────────────────────────────────────────────────────

/** The dais, the jar and the sapling in it, and the shears hanging open over them. `freed`: after the six have fallen. */
function shearsAndJar(g: G, rng: () => number, freed: boolean): void {
  const { x, y } = DAIS;
  // The dais drum: three rings of slab stepping up to the jar.
  g.fillStyle(0x000000, 0.45); g.fillEllipse(x, y + 8, DAIS_R * 2.3, DAIS_R * 0.9);
  for (let i = 0; i < 3; i++) {
    const r = DAIS_R - i * 22;
    const yy = y - i * 14;
    g.fillStyle(OBS.glass, 1); g.fillEllipse(x, yy, r * 2, r * 0.8);
    g.fillRect(x - r, yy - 14, r * 2, 14);
    g.fillStyle(OBS.sheen, 1); g.fillEllipse(x, yy - 14, r * 2, r * 0.8);
    g.fillStyle(OBS.facet, 1); g.fillEllipse(x + r * 0.1, yy - 13, r * 1.6, r * 0.55);
    g.lineStyle(1.2, OBS.edge, 0.6); g.strokeEllipse(x, yy - 14, r * 2, r * 0.8);
  }
  const top = y - 42;
  if (!freed) {
    sapling(g, x, top, 1.2, 0, 0);
    bellJar(g, x, top + 2, 46, 132, { tint: 0xd8f0ff });
    // A brass-coloured label is forbidden here — the label is a plate of glass, a clause on it.
    g.fillStyle(OBS.facet, 1); g.fillRect(x - 26, top - 8, 52, 12);
    g.lineStyle(1, OBS.edge, 0.7); g.strokeRect(x - 26, top - 8, 52, 12);
    g.lineStyle(1, GREEN.leaf, 0.7); g.lineBetween(x - 20, top - 2, x + 20, top - 2);
  } else {
    // The jar split open; the sapling grown up through it into a young tree.
    bellJar(g, x - 8, top + 4, 46, 60, { crack: 1, alpha: 0.7 });
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + 0.3 + rng() * 2.6;
      poly(g, [x + Math.cos(a) * 60, top + 10 + Math.sin(a) * 8, x + Math.cos(a) * 74, top + 14, x + Math.cos(a + 0.2) * 66, top + 6], 0xd8f0ff, 0.4);
    }
    sapling(g, x, top, 1.5, 0, 1);
  }
  // The shears. Freed, vines have climbed both blades and wound the pivot shut.
  const tipY = y - 196;
  pruningShears(g, x, tipY, 1.3, freed ? 0.62 : 0.84, { glow: freed ? 0.2 : 0.7 });
  if (freed) {
    for (const s of [-1, 1]) {
      const pts: Pt[] = [];
      for (let k = 0; k <= 8; k++) {
        const f = k / 8;
        pts.push({ x: x + s * (Math.sin(0.31) * 270 * (1 - f)) + Math.sin(k * 1.4) * 8, y: tipY - 260 * f + 6 });
      }
      vine(g, pts, 3, rng, { leaves: 10, bloom: 0.35 });
    }
    vine(g, [{ x: x - 30, y: tipY - 250 }, { x: x - 10, y: tipY - 280 }, { x: x + 20, y: tipY - 262 }, { x: x + 28, y: tipY - 236 }, { x: x, y: tipY - 228 }], 3.2, rng, { leaves: 7, bloom: 0.5 });
  }
}

/** A councilor's split mask, laid on the seat's step once they are beaten. */
function vacantMask(g: G, p: Pt): void {
  const mx = p.x + 30, my = p.y - 56;
  g.fillStyle(0x000000, 0.4); g.fillEllipse(mx, my + 6, 40, 9);
  councilMask(g, mx - 6, my - 7, 11, { crack: 1, slit: GREEN.vine });
  councilMask(g, mx + 10, my - 3, 8, { crack: 0.7, alpha: 0.9, slit: GREEN.vine });
  glow(g, mx, my - 6, 14, OBS.star, 0.05, 3);
}

const pieces: NonNullable<AreaDef['painter']['pieces']> = [
  { x: DAIS.x, y: DAIS.y, w: 720, h: 900, draw: (g, rng) => shearsAndJar(g, rng, false), when: { not: { courtReady: B.id } } },
  { x: DAIS.x, y: DAIS.y, w: 720, h: 900, draw: (g, rng) => shearsAndJar(g, rng, true), when: { courtReady: B.id } },
  ...TREES.map((t) => ({ x: t.x, y: t.y, w: 300 * t.s, h: 300 * t.s, draw: (g: G, rng: () => number) => obsidianTree(g, t.x, t.y, t.s, rng, { lean: t.lean, vines: t.vines }) })),
  ...Object.entries(SEATS).map(([el, p]) => ({ x: p.x, y: p.y - 38, w: 200, h: 280, draw: (g: G, rng: () => number) => councilSeat(g, p.x, p.y - 38, el, rng) })),
  ...Object.entries(SEATS).map(([el, p]) => ({ x: p.x + 30, y: p.y - 37, w: 60, h: 40, draw: (g: G) => vacantMask(g, p), when: { encounter: seatId(el) } })),
  // Shards fallen from the ceiling, lying by the walls.
  ...[[300, 1700], [1290, 1240], [310, 760], [1300, 560], [700, 330], [910, 1720]].map(([x, y]) => ({
    x, y, w: 90, h: 80, draw: (g: G) => { shard(g, x - 14, y, 22, 40, -10, 0.2); shard(g, x + 8, y + 2, 30, 58, 6, 0.3); shard(g, x + 26, y, 16, 26, 8, 0.1); },
  })),
  // The ledger-lectern where the clerk keeps the Register of Cuttings.
  { x: 1000, y: 1330, w: 120, h: 120, draw: (g: G, rng: () => number) => lectern(g, 1000, 1330, rng) },
];

/** A black-glass lectern with a ledger open on it, glass leaves pressed between its pages. */
function lectern(g: G, x: number, y: number, rng: () => number): void {
  slab(g, x, y, 54, 12);
  slab(g, x, y - 12, 22, 58, rng, 1);
  poly(g, [x - 34, y - 70, x + 34, y - 70, x + 30, y - 86, x - 30, y - 86], OBS.sheen);
  g.fillStyle(0xe8e4d8, 1); g.fillRect(x - 28, y - 92, 26, 18); g.fillRect(x + 2, y - 92, 26, 18);
  g.lineStyle(1, 0x5a564a, 0.6);
  for (let k = 0; k < 4; k++) { g.lineBetween(x - 25, y - 88 + k * 4, x - 6, y - 88 + k * 4); g.lineBetween(x + 5, y - 88 + k * 4, x + 24, y - 88 + k * 4); }
  glassLeaf(g, x + 10, y - 82, -0.4, 11, 1);
  greenSprig(g, x - 20, y - 80);
}

function greenSprig(g: G, x: number, y: number): void {
  g.lineStyle(1.4, GREEN.vine, 1); g.lineBetween(x, y, x + 6, y - 9);
  g.fillStyle(GREEN.leaf, 1); g.fillEllipse(x + 2, y - 4, 5, 3); g.fillEllipse(x + 6, y - 8, 5, 3);
}

// ── Animation ─────────────────────────────────────────────────────────

/** Crown glint spots for each tree (seeded once): where the chimes catch the light. */
const GLINTS: { x: number; y: number; ph: number; sp: number }[] = (() => {
  const r = mulberry(31337);
  const out: { x: number; y: number; ph: number; sp: number }[] = [];
  for (const t of TREES) {
    for (let i = 0; i < 9; i++) out.push({ x: t.x + t.lean * 0.6 + (r() - 0.5) * 170 * t.s, y: t.y - (110 + r() * 110) * t.s, ph: r() * 6.28, sp: 0.6 + r() * 1.8 });
  }
  return out;
})();

const inView = (v: Rect, x: number, y: number, pad: number): boolean => x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

const animate: NonNullable<AreaDef['painter']['animate']> = (g, t, view, world) => {
  // The sapling breathes under its glass (or, freed, in the open).
  if (inView(view, DAIS.x, DAIS.y, 300)) {
    const freed = world.test({ courtReady: B.id });
    const p = 0.5 + 0.5 * Math.sin(t * 1.4);
    glow(g, DAIS.x, DAIS.y - 90, freed ? 110 : 60, GREEN.glow, 0.03 + p * 0.03, 4);
    // A glint running down the shears' cutting edges, one blade then the other.
    if (!freed) {
      const k = (t * 0.25) % 1;
      const side = Math.floor(t * 0.25) % 2 ? 1 : -1;
      const piv = { x: DAIS.x, y: DAIS.y - 196 - 260 };
      const a = Math.PI / 2 + side * 0.42;
      const gx = piv.x + Math.cos(a) * 273 * k, gy = piv.y + Math.sin(a) * 273 * k;
      g.fillStyle(0xffffff, 0.7 * Math.sin(k * Math.PI)); g.fillCircle(gx, gy, 2.2);
      g.fillStyle(OBS.seamLit, 0.2 * Math.sin(k * Math.PI)); g.fillCircle(gx, gy, 9);
    }
  }
};

const animateOver: NonNullable<AreaDef['painter']['animateOver']> = (g, t, view) => {
  // The chimes: glass leaves catching the light in the crowns, one and then another.
  for (const s of GLINTS) {
    if (!inView(view, s.x, s.y, 20)) continue;
    const k = Math.sin(t * s.sp + s.ph);
    if (k < 0.82) continue;
    const a = (k - 0.82) / 0.18;
    g.fillStyle(0xffffff, 0.8 * a); g.fillCircle(s.x, s.y, 1.6);
    g.lineStyle(1, lit(OBS.seamLit, 0.4), 0.6 * a);
    g.lineBetween(s.x - 5 * a, s.y, s.x + 5 * a, s.y); g.lineBetween(s.x, s.y - 5 * a, s.x, s.y + 5 * a);
  }
  // Green motes rising out of the cracks.
  motes(g, view, t, 22, GREEN.glow, -10, 8, 1.4, 3);
};

// ── People & POIs ─────────────────────────────────────────────────────

const NPCS: NpcDef[] = [
  {
    id: 'bench-life-clerk',
    name: 'Linnet Ashgrove',
    title: 'Clerk of Cuttings',
    look: { body: 0x2a2436, accent: 0x5ad06a, hat: 'coif', traits: ['book', 'glasses'], size: 0.9, eye: 0xc8ffc0 },
    at: { x: 1050, y: 1350 },
    talks: [
      {
        when: { monarch: 'obsidian-king' },
        lines: [
          '(The ledger is shut. She has a real leaf in her hand, and she is just looking at it.)',
          'It went soft. Every glass leaf in the room, the moment the light upstairs went out. They are only leaves now.',
          'I think I shall go and see a garden. One nobody has written down.',
        ],
      },
      {
        when: { courtReady: B.id },
        lines: [
          '(She is crossing out entries. All of them. Neatly.)',
          'The jar split by itself when the sixth mask did. I heard it from here. Like a bell, only once.',
          'The stair is open. Up there they wrote the Breath-Tax. The air is thinner on every step. Mind your lungs.',
        ],
      },
      {
        lines: [
          '(A clerk at a lectern, pressing a glass leaf into a ledger. It will not flatten. She keeps trying.)',
          'Register of Cuttings. Every family the Gardener pruned is in here. Name, date, shape they were clipped to.',
          'The six up the room wrote the clause. I only write down what it did. That is a different thing. Isn\'t it?',
        ],
      },
    ],
    barks: [
      { when: { courtReady: B.id }, lines: ['…struck through. Struck through. Struck through…'] },
      { lines: ['…Hollin, of Mossgate, clipped to a swan…', '…the Ladds, all five, a box hedge…', '…it will not lie flat…'] },
    ],
  },
];

const POIS: Poi[] = [
  { kind: 'waystone', at: { x: 640, y: 1820 } },
  {
    kind: 'sign', at: { x: 960, y: 1830 },
    text: 'THE THORN BENCH. Here the Pruning was drafted, clause by clause: what does not flower is cut; what is cut is kept.',
  },
  ...B.elements.map((el): Poi => ({ kind: 'encounter', id: seatId(el) })),
  { kind: 'chest', id: relicId(B.id), at: { x: MID, y: 430 }, item: relicId(B.id), orbs: 8, open: { courtReady: B.id } },
];

export const BENCH_LIFE_AREA: AreaDef = {
  id: B.id,
  isle: 'pinnacle',
  name: B.name,
  subtitle: B.subtitle,
  w: W,
  h: H,
  bg: 0x05040a,
  accent: GREEN.leaf,
  weather: 'petals',
  spawn: { x: MID, y: 1850 },
  painter: { ground: paintGround, pieces, animate, animateOver },
  solids,
  exits: [
    { side: 's', to: below(B), label: 'Down to the Tide Bench' },
    {
      side: 'n', to: above(B), label: 'Up to the Gale Bench', open: { courtReady: B.id },
      lockedText: 'The stair is grown shut with glass thorn. Six seats still hold the clause; unseat all six.',
    },
  ],
  pois: POIS,
  npcs: NPCS,
  gloom: 0.26,
  intro: benchIntroId(B.id),
};
