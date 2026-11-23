import type Phaser from 'phaser';
import type { AreaDef, Poi, Rect, Solid, WorldGate } from '../../../IslesTypes';
import { type G, glow, lit, mixC } from '../../../art/IsleArt';
import { OBS, councilMask, crackPath, glassFloor, seam, shard, starGlow, throne } from '../../../art/PinnacleArt';
import { BENCHES, KING_ID, PIN_SUMMIT, SEAT_COUNT } from '../spec';
import { DUST, VOID, crownMould, niche } from './art';

/**
 * The Crownless Hall — the top of the spire, the last room in the game before the last fight.
 *
 * You come up out of the Noon Bench into a low antechamber (y 1740–2160) where the challengers
 * before you left what they carried, and the Ferryman's tally of them is scratched by the door.
 * The door itself is the Door of Sixty Seals: it will not open while any councilor still sits.
 * Past it the nave runs north for a thousand paces of black glass (y 600–1700) between sixty empty
 * niches — two files of stelae down each wall, three per side for each bench, the bench's colour
 * inlaid at their feet, bottom bench nearest the door. Down the middle stand the ten crown-moulds,
 * alternating sides in the order the isles fell. A single seam runs the length of the floor from the
 * door to the throne, and every few seconds a pulse of violet runs down it toward you: a heartbeat.
 * The masks are gone from the niches, but their reflections are still in the floor, and they watch.
 * Then the last stair (y 440–600), the dais, and the throne against the north wall, where the shell
 * is cracked and the star shows gold through it. No one else is here. No one has been for a while.
 */

const W = 1400;
const H = 2200;
const L = 300;
const R = 1100;
const MID = 700;
/** The north wall's foot. */
const NORTH = 150;
/** The door wall (the Door of Sixty Seals) and its opening. */
const DOOR_Y = 1700;
const DOOR_L = 600;
const DOOR_R = 800;
/** The antechamber's south wall, with the stair down in its middle. */
const SOUTH = 2160;
/** The final stair. */
const STAIR_TOP = 440;
const STAIR_BOT = 600;
/** The dais narrows the hall between the spire's inner ribs. */
const DAIS_L = 470;
const DAIS_R = 930;
const THRONE = { x: MID, y: 300 };
const KING_AT = { x: MID, y: 372 };

// ── The sixty niches ─────────────────────────────────────────────────

interface Niche { x: number; y: number; h: number; bench: number }
/** Two files of stelae down each wall: a tall outer file and a low inner one, staggered. */
const NICHES: Niche[] = [];
for (const side of [-1, 1]) {
  const wall = side < 0 ? L : R;
  for (let k = 0; k < 30; k++) {
    const row = Math.floor(k / 2);
    const outer = k % 2 === 0;
    NICHES.push({
      x: wall - side * (outer ? 34 : 96),
      y: 1650 - row * 70 - (outer ? 0 : 35),
      h: outer ? 150 : 76,
      bench: BENCHES[Math.floor(k / 3)].color,
    });
  }
}

// ── The ten moulds ───────────────────────────────────────────────────

const MOULD_ROWS = [1560, 1360, 1160, 960, 760];
const MOULDS = BENCHES.map((b, i) => ({ isle: b.isle, color: b.color, x: i % 2 === 0 ? 500 : 900, y: MOULD_ROWS[Math.floor(i / 2)] }));

// ── Light through the shell ──────────────────────────────────────────

/** Where the star shows through a crack in the vault: `x, y` the pool on the floor, `w` its width, `lean` the slant. */
const SHAFTS = [
  { x: 560, y: 1520, w: 54, lean: -70 }, { x: 860, y: 1300, w: 70, lean: 60 }, { x: 620, y: 1060, w: 62, lean: -50 },
  { x: 820, y: 850, w: 84, lean: 80 }, { x: 540, y: 700, w: 58, lean: -60 }, { x: 700, y: 520, w: 120, lean: 20 },
  { x: 900, y: 1620, w: 44, lean: 40 },
];

// ── Solids, gates ────────────────────────────────────────────────────

const solids: Solid[] = [
  { kind: 'rect', x: 0, y: 0, w: L, h: H },
  { kind: 'rect', x: R, y: 0, w: W - R, h: H },
  { kind: 'rect', x: L, y: 0, w: R - L, h: NORTH },
  // The niche files.
  { kind: 'rect', x: L, y: STAIR_BOT, w: 130, h: DOOR_Y - STAIR_BOT },
  { kind: 'rect', x: R - 130, y: STAIR_BOT, w: 130, h: DOOR_Y - STAIR_BOT },
  // The inner ribs either side of the dais.
  { kind: 'rect', x: L, y: NORTH, w: DAIS_L - L, h: STAIR_BOT - NORTH },
  { kind: 'rect', x: DAIS_R, y: NORTH, w: R - DAIS_R, h: STAIR_BOT - NORTH },
  // The door wall.
  { kind: 'rect', x: L, y: DOOR_Y, w: DOOR_L - L, h: 40 },
  { kind: 'rect', x: DOOR_R, y: DOOR_Y, w: R - DOOR_R, h: 40 },
  // The antechamber's south wall, open in the middle for the stair down.
  { kind: 'rect', x: L, y: SOUTH, w: 330, h: H - SOUTH },
  { kind: 'rect', x: MID + 70, y: SOUTH, w: R - MID - 70, h: H - SOUTH },
  // The throne.
  { kind: 'rect', x: THRONE.x - 115, y: THRONE.y - 38, w: 230, h: 48 },
  // What the last ones left.
  { kind: 'circle', x: 1030, y: 1980, r: 50 },
  ...MOULDS.map((m): Solid => ({ kind: 'circle', x: m.x, y: m.y - 6, r: 38 })),
];

const gates: WorldGate[] = [
  { rect: { x: DOOR_L, y: DOOR_Y, w: DOOR_R - DOOR_L, h: 40 }, open: { seats: SEAT_COUNT }, look: 'starseal', label: 'The Door of Sixty Seals — every seat below must be empty' },
];

// ── Ground ───────────────────────────────────────────────────────────

/** The wall's top seen from above: black glass in long facets, the inner edge catching the light. */
function wallTop(g: G, r: Rect, inner: 'e' | 'w', rng: () => number): void {
  g.fillStyle(OBS.glass, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let y = r.y; y < r.y + r.h; y += 90 + rng() * 80) {
    const h = 40 + rng() * 120;
    g.fillStyle(rng() < 0.5 ? OBS.facet : mixC(OBS.glass, OBS.facet, 0.5), 0.6);
    g.fillTriangle(r.x, y, r.x + r.w, y + h * 0.4, r.x, y + h);
  }
  for (let i = 0; i < r.h / 140; i++) {
    const y0 = r.y + rng() * r.h;
    // Higher up the hall, a crack is more likely to show the star than the King's violet.
    const warm = rng() < (1 - y0 / H) * 0.5;
    seam(g, crackPath({ x: r.x + rng() * r.w, y: y0 }, { x: r.x + rng() * r.w, y: y0 + 60 + rng() * 120 }, rng, 10, 5), 1.2, 0.7, 0, warm ? OBS.star : OBS.seam);
  }
  const ex = inner === 'e' ? r.x + r.w : r.x;
  g.lineStyle(3, OBS.edge, 0.35); g.lineBetween(ex, r.y, ex, r.y + r.h);
  g.lineStyle(1, 0xffffff, 0.25); g.lineBetween(ex, r.y, ex, r.y + r.h);
}

/** The final stair: six broad treads of glass, each with a pale nosing and a darker riser. */
function stair(g: G): void {
  const n = 6;
  const step = (STAIR_BOT - STAIR_TOP) / n;
  for (let i = 0; i < n; i++) {
    const y = STAIR_TOP + i * step;
    const inset = (n - i) * 4;
    g.fillStyle(OBS.facet, 1); g.fillRect(DAIS_L + inset, y, DAIS_R - DAIS_L - inset * 2, step * 0.62);
    g.fillStyle(OBS.glass, 1); g.fillRect(DAIS_L + inset, y + step * 0.62, DAIS_R - DAIS_L - inset * 2, step * 0.38);
    g.lineStyle(1.5, OBS.edge, 0.6); g.lineBetween(DAIS_L + inset, y, DAIS_R - inset, y);
    g.fillStyle(0xffffff, 0.06); g.fillRect(DAIS_L + inset, y + 1, DAIS_R - DAIS_L - inset * 2, 3);
  }
}

/** The dais: one sheet of glass, rings let into it round the throne, gold cracks running out from its foot. */
function dais(g: G, rng: () => number): void {
  g.fillStyle(OBS.glass, 1); g.fillRect(DAIS_L, NORTH, DAIS_R - DAIS_L, STAIR_TOP - NORTH);
  g.fillStyle(OBS.facet, 0.5);
  g.fillTriangle(DAIS_L, NORTH, DAIS_L + 260, NORTH, DAIS_L, STAIR_TOP);
  for (let i = 1; i <= 4; i++) {
    g.lineStyle(i === 4 ? 2 : 1, OBS.seam, 0.1 + i * 0.03);
    g.strokeEllipse(KING_AT.x, KING_AT.y - 20, 120 + i * 70, 60 + i * 32);
  }
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.1 + (i / 8) * 0.8);
    const from = { x: THRONE.x + Math.cos(a) * 70, y: THRONE.y + 14 + Math.sin(a) * 26 };
    const to = { x: THRONE.x + Math.cos(a) * (180 + rng() * 120), y: THRONE.y + 14 + Math.sin(a) * (110 + rng() * 60) };
    seam(g, crackPath(from, to, rng, 9, 5), 1.3, 0.75, 0.2, i % 3 === 1 ? OBS.seam : OBS.star);
  }
}

function paintGround(g: G, rng: () => number): void {
  g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, W, H);
  // The nave and the antechamber: polished glass.
  glassFloor(g, L, NORTH, R - L, DOOR_Y - NORTH, 64, rng);
  glassFloor(g, L, DOOR_Y, R - L, SOUTH - DOOR_Y, 48, rng);
  // Shadow pooled at the feet of the niche files.
  for (let i = 0; i < 6; i++) {
    g.fillStyle(0x000000, 0.08);
    g.fillRect(L + 130, STAIR_BOT, 20 + i * 14, DOOR_Y - STAIR_BOT);
    g.fillRect(R - 150 - i * 14, STAIR_BOT, 20 + i * 14, DOOR_Y - STAIR_BOT);
  }
  // The runner: a lane of deeper glass from the door to the stair, edged in pale lines.
  g.fillStyle(0x050309, 0.75); g.fillRect(MID - 80, STAIR_BOT, 160, DOOR_Y - STAIR_BOT);
  g.lineStyle(1.5, OBS.edge, 0.4);
  g.lineBetween(MID - 80, STAIR_BOT, MID - 80, DOOR_Y); g.lineBetween(MID + 80, STAIR_BOT, MID + 80, DOOR_Y);
  g.lineStyle(1, OBS.edge, 0.15);
  g.lineBetween(MID - 70, STAIR_BOT, MID - 70, DOOR_Y); g.lineBetween(MID + 70, STAIR_BOT, MID + 70, DOOR_Y);
  // A long reflection down the runner, as polished glass shows a far window.
  g.fillStyle(OBS.sheen, 0.12);
  g.fillPoints([{ x: MID - 60, y: STAIR_BOT }, { x: MID - 30, y: STAIR_BOT }, { x: MID + 40, y: DOOR_Y }, { x: MID - 10, y: DOOR_Y }] as Phaser.Types.Math.Vector2Like[], true);
  // The seam: one crack from the door to the throne, and the heartbeat runs down it.
  const spine = [{ x: MID, y: DOOR_Y }];
  for (let y = DOOR_Y - 60; y > STAIR_TOP; y -= 60) spine.push({ x: MID + Math.sin(y * 0.031) * 6 + (rng() - 0.5) * 6, y });
  spine.push({ x: MID, y: KING_AT.y + 30 });
  seam(g, spine, 1.4, 0.55);
  // Pools of starlight where the vault is cracked.
  for (const s of SHAFTS) {
    glow(g, s.x, s.y, s.w * 0.9, OBS.star, 0.035, 4);
    g.fillStyle(OBS.star, 0.07); g.fillEllipse(s.x, s.y, s.w * 1.3, s.w * 0.45);
  }
  // Under each mould, a ring of tiles darker than the rest.
  for (const m of MOULDS) {
    g.fillStyle(0x000000, 0.35); g.fillEllipse(m.x, m.y - 4, 130, 56);
    g.lineStyle(1, m.color, 0.12); g.strokeEllipse(m.x, m.y - 4, 120, 50);
  }
  // The antechamber: scuffed, and in the dust before the door the prints of everyone who stopped there.
  for (let i = 0; i < 70; i++) {
    const x = DOOR_L - 60 + rng() * 320, y = DOOR_Y + 60 + rng() * 260;
    g.fillStyle(DUST, 0.05 + rng() * 0.05); g.fillEllipse(x, y, 7, 4);
  }
  stair(g);
  dais(g, rng);
  wallTop(g, { x: 0, y: 0, w: L, h: H }, 'e', rng);
  wallTop(g, { x: R, y: 0, w: W - R, h: H }, 'w', rng);
  g.fillStyle(OBS.glass, 1); g.fillRect(L, 0, R - L, NORTH);
  // The inner ribs' footprint either side of the dais.
  g.fillStyle(0x000000, 0.4); g.fillRect(L, NORTH, DAIS_L - L, STAIR_BOT - NORTH); g.fillRect(DAIS_R, NORTH, R - DAIS_R, STAIR_BOT - NORTH);
  // The south wall and the stair down through it.
  g.fillStyle(OBS.glass, 1); g.fillRect(L, SOUTH, 330, H - SOUTH); g.fillRect(MID + 70, SOUTH, R - MID - 70, H - SOUTH);
  g.lineStyle(2, OBS.edge, 0.5); g.lineBetween(L, SOUTH, MID - 70, SOUTH); g.lineBetween(MID + 70, SOUTH, R, SOUTH);
  for (let i = 0; i < 4; i++) {
    g.fillStyle(i % 2 ? OBS.facet : OBS.glass, 1); g.fillRect(MID - 70, SOUTH + i * 10, 140, 10);
    g.lineStyle(1, OBS.edge, 0.4); g.lineBetween(MID - 70, SOUTH + i * 10, MID + 70, SOUTH + i * 10);
  }
  g.fillStyle(OBS.star, 0.04); g.fillRect(MID - 70, SOUTH + 30, 140, H - SOUTH - 30);
}

// ── Pieces ───────────────────────────────────────────────────────────

/** The north wall: the shell itself, cracked from the vault to the floor, the star showing gold through it. */
function shellWall(g: G, rng: () => number): void {
  const y = NORTH, top = NORTH - 150;
  g.fillStyle(OBS.glass, 1); g.fillRect(L, top, R - L, 150);
  for (let i = 0; i < 14; i++) {
    const x = L + (i / 14) * (R - L);
    g.fillStyle(i % 2 ? OBS.facet : mixC(OBS.glass, OBS.facet, 0.4), 0.8);
    g.fillTriangle(x, top, x + 57, top, x + 20 + rng() * 20, y);
  }
  g.lineStyle(2, OBS.edge, 0.5); g.lineBetween(L, y, R, y);
  // The great crack behind the throne: a wedge of gold, fraying into a dozen smaller seams.
  const cx = MID;
  g.fillStyle(OBS.starDeep, 0.25);
  g.fillPoints([{ x: cx - 40, y: top }, { x: cx + 50, y: top }, { x: cx + 12, y }, { x: cx - 6, y }] as Phaser.Types.Math.Vector2Like[], true);
  g.fillStyle(OBS.star, 0.6);
  g.fillPoints([{ x: cx - 14, y: top }, { x: cx + 22, y: top }, { x: cx + 4, y: y - 30 }, { x: cx - 2, y: y - 30 }] as Phaser.Types.Math.Vector2Like[], true);
  g.fillStyle(OBS.starCore, 0.9);
  g.fillPoints([{ x: cx - 4, y: top }, { x: cx + 8, y: top }, { x: cx + 2, y: y - 60 }] as Phaser.Types.Math.Vector2Like[], true);
  for (let i = 0; i < 12; i++) {
    const a = { x: cx + (rng() - 0.5) * 40, y: top + rng() * 120 };
    const side = i % 2 ? 1 : -1;
    const b = { x: a.x + side * (80 + rng() * 260), y: a.y + (rng() - 0.3) * 80 };
    seam(g, crackPath(a, b, rng, 12, 6), 1.2 + rng(), 0.85, 0.3, i % 4 === 3 ? OBS.seam : OBS.star);
  }
}

/** One of the spire's inner ribs: a cluster of tall shards hemming the dais, the hall's ceiling held up on them. */
function rib(g: G, x: number, side: number, rng: () => number): void {
  const base = STAIR_BOT;
  const set: [number, number, number, number][] = [[-50, 70, 330, -16], [40, 80, 300, 14], [-10, 90, 400, -6], [60, 60, 220, 22], [-70, 56, 200, -24]];
  for (const [dx, w, h, lean] of set) shard(g, x + dx * side, base - (60 - Math.abs(dx)) * 0.3, w, h + rng() * 40, lean * side, 0.2 + rng() * 0.2);
  seam(g, crackPath({ x: x - 4 * side, y: base - 40 }, { x: x + 10 * side, y: base - 320 }, rng, 8, 6), 1.3, 0.7, 0.2);
}

/** The door wall's south face: black glass panels, the arch of the door, the Ferryman's tally by it. */
function doorWall(g: G, rng: () => number): void {
  const y = DOOR_Y + 40, top = y - 190;
  for (const [x0, x1] of [[L, DOOR_L], [DOOR_R, R]] as [number, number][]) {
    g.fillStyle(OBS.glass, 1); g.fillRect(x0, top, x1 - x0, 190);
    for (let x = x0; x < x1; x += 50) {
      g.fillStyle(OBS.facet, 0.7); g.fillRect(x + 30, top + 6, 14, 184);
      g.lineStyle(1, OBS.edge, 0.3); g.lineBetween(x + 30, top + 6, x + 30, y);
    }
    g.fillStyle(OBS.sheen, 1); g.fillRect(x0, top, x1 - x0, 6);
    g.lineStyle(1.2, OBS.edge, 0.6); g.lineBetween(x0, top + 6, x1, top + 6);
    for (let i = 0; i < 3; i++) seam(g, crackPath({ x: x0 + rng() * (x1 - x0), y: top + 10 }, { x: x0 + rng() * (x1 - x0), y: y - 10 }, rng, 10, 5), 1, 0.7);
  }
  // The door's jambs and lintel: two great shards and a beam of glass across them.
  shard(g, DOOR_L - 6, y, 44, 230, 10, 0.3);
  shard(g, DOOR_R + 6, y, 44, 230, -10, 0.3);
  g.fillStyle(OBS.glass, 1); g.fillRect(DOOR_L - 30, top - 40, DOOR_R - DOOR_L + 60, 34);
  g.fillStyle(OBS.sheen, 1); g.fillRect(DOOR_L - 30, top - 40, DOOR_R - DOOR_L + 60, 5);
  g.lineStyle(1.2, OBS.edge, 0.6); g.strokeRect(DOOR_L - 30, top - 40, DOOR_R - DOOR_L + 60, 34);
  // The tally: one stroke for every challenger the Ferryman rowed here. Gates of five, a great many of them.
  const tx = L + 40, ty = y - 70;
  for (let i = 0; i < 23; i++) {
    const gx = tx + (i % 8) * 30, gy = ty + Math.floor(i / 8) * 22;
    g.lineStyle(1.2, DUST, 0.35);
    for (let k = 0; k < 4; k++) g.lineBetween(gx + k * 5, gy, gx + k * 5 + 1, gy + 14);
    g.lineBetween(gx - 3, gy + 12, gx + 19, gy + 2);
  }
  // The last gate unfinished: two strokes, and a third begun.
  const lx = tx + 7 * 30, ly = ty + 2 * 22;
  g.lineStyle(1.2, DUST, 0.45);
  g.lineBetween(lx, ly, lx + 1, ly + 14); g.lineBetween(lx + 5, ly, lx + 6, ly + 14); g.lineBetween(lx + 10, ly, lx + 10.5, ly + 6);
}

/** The arch of sixty seals over the door: a mask for every seat, its slit gold once the seat is empty. */
function sealArch(g: G, broken: boolean): void {
  const cx = MID, cy = DOOR_Y - 120;
  for (let ring = 0; ring < 2; ring++) {
    const r = ring ? 96 : 116;
    for (let i = 0; i < 30; i++) {
      const a = Math.PI + ((i + 0.5) / 30) * Math.PI;
      const x = cx + Math.cos(a) * r * 1.15, y = cy + Math.sin(a) * r * 0.62;
      councilMask(g, x, y, ring ? 5 : 6, { slit: broken ? OBS.star : OBS.seam, glow: broken ? 0.9 : 0.4, crack: broken ? 0.6 : 0 });
    }
  }
}

/**
 * What the last ones left: against the antechamber's east wall, the kit of the challengers who came
 * up before — a round shield, a cracked helm, a sword with no edge left, a boat's lantern gone
 * out, an oar — set down in a heap as if their owners meant to come back for them.
 */
function heap(g: G, x: number, y: number, rng: () => number): void {
  g.fillStyle(0x000000, 0.4); g.fillEllipse(x, y + 4, 140, 34);
  // The oar, leaned on the wall.
  g.lineStyle(5, 0x4a3a2a, 1); g.lineBetween(x + 30, y, x + 56, y - 120);
  g.fillStyle(0x5a4632, 1); g.fillEllipse(x + 58, y - 128, 16, 34);
  // A round shield on its rim, its boss dented.
  g.fillStyle(0x3a3a44, 1); g.fillCircle(x - 30, y - 30, 30);
  g.lineStyle(3, 0x6a6a78, 1); g.strokeCircle(x - 30, y - 30, 30);
  g.fillStyle(0x7a7a88, 1); g.fillCircle(x - 30, y - 30, 7);
  g.lineStyle(1, 0x22222a, 1); g.lineBetween(x - 50, y - 46, x - 18, y - 12);
  // A sword laid across, its edge nicked to a saw.
  g.lineStyle(4, 0x8a8a98, 1); g.lineBetween(x - 60, y - 4, x + 26, y - 18);
  for (let i = 0; i < 8; i++) { g.fillStyle(0x000000, 0.8); g.fillCircle(x - 50 + i * 10, y - 6 - i * 1.6, 1.4); }
  g.fillStyle(0x6a5028, 1); g.fillRect(x + 24, y - 24, 4, 14);
  g.fillStyle(0x3a2a1a, 1); g.fillRect(x + 28, y - 20, 12, 5);
  // A helm, split down the brow.
  g.fillStyle(0x4a4a56, 1); g.fillEllipse(x + 4, y - 8, 30, 24);
  g.fillStyle(0x1a1a22, 1); g.fillRect(x - 6, y - 10, 20, 4);
  g.lineStyle(1.5, 0x000000, 0.9); g.lineBetween(x + 4, y - 20, x + 8, y - 2);
  // The lantern, dark.
  g.fillStyle(0x2a2420, 1); g.fillRect(x + 40, y - 22, 14, 20);
  g.fillStyle(0x0e0c10, 1); g.fillRect(x + 42, y - 19, 10, 14);
  g.lineStyle(1, 0x5a5048, 1); g.strokeCircle(x + 47, y - 26, 4);
  // Dust over everything.
  for (let i = 0; i < 26; i++) { g.fillStyle(DUST, 0.12); g.fillCircle(x - 60 + rng() * 120, y - 40 + rng() * 40, 0.8 + rng()); }
}

const pieces: NonNullable<AreaDef['painter']['pieces']> = [
  { x: MID, y: NORTH, w: R - L, h: 170, draw: shellWall },
  { x: THRONE.x, y: THRONE.y, w: 280, h: 330, draw: (g) => throne(g, THRONE.x, THRONE.y, 1.35, { sword: true, glow: 0.9, t: 0 }) },
  { x: 400, y: STAIR_BOT, w: 220, h: 460, draw: (g, rng) => rib(g, 400, -1, rng) },
  { x: 1000, y: STAIR_BOT, w: 220, h: 460, draw: (g, rng) => rib(g, 1000, 1, rng) },
  { x: MID, y: DOOR_Y + 40, w: R - L, h: 280, draw: doorWall },
  { x: MID, y: DOOR_Y + 41, w: 300, h: 260, when: { seats: SEAT_COUNT }, draw: (g) => sealArch(g, true) },
  { x: MID, y: DOOR_Y + 41, w: 300, h: 260, when: { not: { seats: SEAT_COUNT } }, draw: (g) => sealArch(g, false) },
  { x: 1030, y: 1990, w: 160, h: 160, draw: (g, rng) => heap(g, 1030, 1990, rng) },
  ...NICHES.map((n) => ({ x: n.x, y: n.y, w: 60, h: n.h + 10, draw: (g: G, rng: () => number) => niche(g, n.x, n.y, n.h, n.bench, rng) })),
  ...MOULDS.map((m) => ({ x: m.x, y: m.y, w: 110, h: 150, draw: (g: G, rng: () => number) => crownMould(g, m.x, m.y, 0.85, m.isle, m.color, rng) })),
];

// ── Animation ────────────────────────────────────────────────────────

const inView = (v: Rect, x: number, y: number, pad: number): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

/** The heartbeat (every 5 s a pulse runs down the seam from the throne to the door) and the masks' reflections. */
function animateUnder(g: G, t: number, view: Rect): void {
  const BEAT = 5;
  const ph = t % BEAT;
  // The beat itself: a ring off the dais, then the pulse running south.
  if (ph < 1.2 && inView(view, KING_AT.x, KING_AT.y, 300)) {
    const k = ph / 1.2;
    g.lineStyle(3 - k * 2, OBS.seamLit, 0.35 * (1 - k));
    g.strokeEllipse(KING_AT.x, KING_AT.y - 20, 160 + k * 380, 80 + k * 170);
  }
  const front = STAIR_TOP - 40 + ph * 560;
  if (front < DOOR_Y + 40 && inView(view, MID, front, 200)) {
    seam(g, [{ x: MID, y: Math.max(KING_AT.y + 30, front - 140) }, { x: MID + 2, y: front - 50 }, { x: MID - 2, y: front }], 2, 0.9, 1, OBS.seamLit);
    g.fillStyle(OBS.seamLit, 0.5); g.fillCircle(MID, front, 4);
    g.fillStyle(OBS.seam, 0.12); g.fillEllipse(MID, front, 120, 30);
  }
  // The masks are gone from the niches, but not from the glass: their reflections lie at each
  // niche's foot, and as you pass their slits wake and the glints in them follow you.
  const cx = view.x + view.w / 2, cy = view.y + view.h / 2;
  for (let i = 0; i < NICHES.length; i++) {
    const n = NICHES[i];
    if (!inView(view, n.x, n.y, 40)) continue;
    const rx = n.x, ry = n.y + 18;
    const near = Math.max(0, 1 - Math.abs(cy - ry) / 240);
    const s = n.h > 100 ? 9 : 7;
    g.fillStyle(OBS.facet, 0.18);
    g.fillPoints([{ x: rx - s * 0.6, y: ry }, { x: rx, y: ry + s }, { x: rx + s * 0.6, y: ry }, { x: rx + s * 0.4, y: ry - s * 0.4 }, { x: rx, y: ry - s * 0.9 }, { x: rx - s * 0.4, y: ry - s * 0.4 }] as Phaser.Types.Math.Vector2Like[], true);
    const wake = 0.12 + near * 0.55 + 0.08 * Math.sin(t * 1.7 + i);
    g.lineStyle(1.4, OBS.seam, wake);
    g.lineBetween(rx - s * 0.45, ry + s * 0.15, rx + s * 0.45, ry + s * 0.15);
    const dx = Math.max(-1, Math.min(1, (cx - rx) / 240)) * s * 0.35;
    g.fillStyle(0xffffff, wake * 0.9); g.fillCircle(rx + dx, ry + s * 0.15, 1);
  }
  // The starlight pools breathe, slower than the heart.
  for (let i = 0; i < SHAFTS.length; i++) {
    const s = SHAFTS[i];
    if (!inView(view, s.x, s.y, 120)) continue;
    g.fillStyle(OBS.star, 0.04 + 0.03 * Math.sin(t * 0.6 + i * 1.9)); g.fillEllipse(s.x, s.y, s.w * 1.1, s.w * 0.38);
  }
}

/** Light falling through the cracked vault, dust turning in it, and the great glow behind the throne. */
function animateOver(g: G, t: number, view: Rect): void {
  for (let i = 0; i < SHAFTS.length; i++) {
    const s = SHAFTS[i];
    if (!inView(view, s.x, s.y - 200, 320)) continue;
    const a = 0.045 + 0.02 * Math.sin(t * 0.5 + i * 2.3);
    const topY = s.y - 420, topX = s.x + s.lean;
    for (const [k, alpha] of [[1, a], [0.55, a * 1.2]] as [number, number][]) {
      g.fillStyle(lit(OBS.star, 0.2), alpha);
      g.fillPoints([
        { x: topX - s.w * 0.3 * k, y: topY }, { x: topX + s.w * 0.3 * k, y: topY },
        { x: s.x + s.w * 0.6 * k, y: s.y }, { x: s.x - s.w * 0.6 * k, y: s.y },
      ] as Phaser.Types.Math.Vector2Like[], true);
    }
    // Motes turning slowly down the shaft.
    for (let m = 0; m < 5; m++) {
      const f = ((t * 0.07 + m * 0.21 + i * 0.13) % 1);
      const mx = topX + (s.x - topX) * f + Math.sin(t * 0.8 + m * 2 + i) * s.w * 0.25;
      const my = topY + (s.y - topY) * f;
      g.fillStyle(OBS.starCore, 0.5 * Math.sin(f * Math.PI)); g.fillCircle(mx, my, 1.2);
    }
  }
  if (inView(view, MID, 120, 400)) {
    const pulse = 0.5 + 0.5 * Math.sin(t * (Math.PI * 2 / 5));
    glow(g, MID, 60, 150 + pulse * 20, OBS.star, 0.025 + pulse * 0.012, 4);
    starGlow(g, MID + 4, 28, 3, t, 0.35 + pulse * 0.15);
  }
}

// ── POIs ─────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  { kind: 'waystone', at: { x: 540, y: 2040 } },
  { kind: 'monarch', id: KING_ID, at: KING_AT },
  {
    kind: 'sign', at: { x: 860, y: 1800 },
    text: 'THE CROWNLESS HALL. Sixty seals on the door, one for every seat below. One chair beyond it, and nobody has ever been asked to sit.',
  },
  {
    kind: 'sign', at: { x: 620, y: 1640 },
    text: 'THE MOULDS. Ten crowns were poured in this hall, in the order the isles were given them. Each mould is cracked.',
  },
];

export const SUMMIT_AREA: AreaDef = {
  id: PIN_SUMMIT,
  isle: 'pinnacle',
  name: 'The Crownless Hall',
  subtitle: 'The top of the spire — the throne, and the one who has never left it',
  w: W,
  h: H,
  bg: VOID,
  accent: OBS.seam,
  weather: 'starmotes',
  spawn: { x: MID, y: 2050 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver },
  solids,
  exits: [{ side: 's', to: BENCHES[BENCHES.length - 1].id, label: 'Down to the Noon Bench' }],
  pois: POIS,
  npcs: [],
  gloom: 0.22,
  gates,
  intro: 'cine-throne',
};
