import type { AreaDef, NpcDef, PainterWorld, Poi, Rect, Solid } from '../../../../IslesTypes';
import { type G, glow, hashStr, mulberry, shadow } from '../../../../art/IsleArt';
import { glassFloor, starGlow } from '../../../../art/PinnacleArt';
import { BENCHES, above, below, benchIntroId, relicId, seatId } from '../../spec';
import {
  OBS, PAPER, SILK, VOICE, VOICE_DEEP, VOICE_LIT, councilSeat, hymnSheet, note, organPipe, ribbon, seam, seatRow,
  slab, stave, voiceJar,
} from './art';

/**
 * The Choir Bench — ninth bench of the Obsidian Pinnacle, where the Part was written.
 *
 * An amphitheatre of silence, cast in black glass, climbed from the stage at the south to the
 * back wall at the north. You come up the stair onto the STAGE (an empty conductor's podium, the
 * stave inlaid round the apron) and face the HOUSE: tier on tier of empty glass seats rising away
 * from you, a jar or a white ribbon or a hymn sheet left on one here and there, the house-lights
 * along every riser left burning for nobody. Three landings cross the house; on each, two
 * councilors stand before their tall seats. Up the middle runs the aisle, and inlaid in it in
 * rose light is the Part itself: one note, written over and over, all the way to the top.
 *
 * At the top — the thing you remember — is THE VOICE VAULT: the whole back wall of the house is
 * shelving, floor to ceiling and wall to wall, and on every shelf stand stoppered jars, eight
 * hundred of them in sight and thousands more in the dark, each with a stolen voice inside,
 * humming. The hum moves across the wall in slow waves, like a choir breathing. Glass organ
 * pipes stand along the sides and flank the door; the stair up to the Noon Bench goes straight
 * through the Vault, between the shelves.
 *
 *   Stage      y 1760–2000  spawn, waystone, the podium, the usher
 *   Landing A  y 1440–1612  Seat of the Part (W) · Seat of the Repeat (E)
 *   Landing B  y 1100–1288  Seat of the Rest (W) · Seat of the Mask (E)
 *   Landing C  y  760– 948  Seat of the Vow (W)  · Seat of the Word (E)
 *   Terrace    y  250– 608  the Vault's foot, the copyist, the relic
 *   The Vault  y    0– 250  shelves; the door north at x 720–880
 */

const B = BENCHES.find((x) => x.isle === 'sound')!;

const W = 1600;
const H = 2000;
const MID = 800;
const AISLE_L = 720;
const AISLE_R = 880;
const VAULT_Y = 250;

type BandKind = 'terrace' | 'rows' | 'landing' | 'stage';
interface Band { y0: number; y1: number; L: number; R: number; kind: BandKind }

/** The house, south to north it widens like a fan: each band's walkable span. */
const BANDS: Band[] = [
  { y0: VAULT_Y, y1: 608, L: 140, R: 1460, kind: 'terrace' },
  { y0: 608, y1: 760, L: 150, R: 1450, kind: 'rows' },
  { y0: 760, y1: 948, L: 160, R: 1440, kind: 'landing' },
  { y0: 948, y1: 1100, L: 180, R: 1420, kind: 'rows' },
  { y0: 1100, y1: 1288, L: 200, R: 1400, kind: 'landing' },
  { y0: 1288, y1: 1440, L: 240, R: 1360, kind: 'rows' },
  { y0: 1440, y1: 1612, L: 260, R: 1340, kind: 'landing' },
  { y0: 1612, y1: 1760, L: 330, R: 1270, kind: 'rows' },
  { y0: 1760, y1: H, L: 400, R: 1200, kind: 'stage' },
];

/** The outer aisle between a row and the wall. */
const OUTER = 110;
/** A row of seats: its solid strip, south edge = seat fronts. */
interface Row { x0: number; x1: number; y0: number; y1: number }
const ROWS: Row[] = [];
for (const b of BANDS) {
  if (b.kind !== 'rows') continue;
  for (const off of [24, 94]) {
    const y0 = b.y0 + off, y1 = y0 + 34;
    ROWS.push({ x0: b.L + OUTER, x1: AISLE_L, y0, y1 }, { x0: AISLE_R, x1: b.R - OUTER, y0, y1 });
  }
}

/** The six seats: plinth foot, which side, element, where the councilor stands. */
interface Seat { el: string; px: number; py: number; at: { x: number; y: number } }
export const SEATS: Seat[] = [
  { el: 'sound', px: 410, py: 1540, at: { x: 500, y: 1566 } },
  { el: 'echo', px: 1190, py: 1540, at: { x: 1100, y: 1566 } },
  { el: 'silence', px: 350, py: 1210, at: { x: 440, y: 1236 } },
  { el: 'illusion', px: 1250, py: 1210, at: { x: 1160, y: 1236 } },
  { el: 'passion', px: 310, py: 870, at: { x: 400, y: 896 } },
  { el: 'paper', px: 1290, py: 870, at: { x: 1200, y: 896 } },
];
/** Where each councilor stands, by element. */
export const seatAt = (el: string): { x: number; y: number } => SEATS.find((s) => s.el === el)!.at;

const PODIUM = { x: MID, y: 1786 };
const PIPE_FLANKS = [{ x: 640, y: 272 }, { x: 960, y: 272 }];
const LADDER = { x: 1190, y: 262 };

// ── Solids ───────────────────────────────────────────────────────────

const solids: Solid[] = [];
for (const b of BANDS) {
  solids.push({ kind: 'rect', x: 0, y: b.y0, w: b.L, h: b.y1 - b.y0 }, { kind: 'rect', x: b.R, y: b.y0, w: W - b.R, h: b.y1 - b.y0 });
}
// The Vault: shelving wall to wall, the door in the middle left open.
solids.push({ kind: 'rect', x: 0, y: 0, w: AISLE_L, h: VAULT_Y }, { kind: 'rect', x: AISLE_R, y: 0, w: W - AISLE_R, h: VAULT_Y });
for (const r of ROWS) solids.push({ kind: 'rect', x: r.x0, y: r.y0, w: r.x1 - r.x0, h: r.y1 - r.y0 });
for (const s of SEATS) solids.push({ kind: 'circle', x: s.px, y: s.py - 14, r: 46 });
solids.push({ kind: 'circle', x: PODIUM.x, y: PODIUM.y - 6, r: 26 });
for (const p of PIPE_FLANKS) solids.push({ kind: 'rect', x: p.x - 56, y: VAULT_Y, w: 112, h: 26 });
solids.push({ kind: 'rect', x: LADDER.x - 34, y: VAULT_Y, w: 68, h: 18 });

// ── The Vault's jars (fixed, so the painter and the hum agree) ────────

interface Jar { x: number; y: number; s: number; row: number }
const SHELVES = [54, 82, 110, 138, 166, 194, 222, 248];
const JARS: Jar[] = (() => {
  const rng = mulberry(hashStr('voice-vault'));
  const out: Jar[] = [];
  SHELVES.forEach((sy, row) => {
    let x = 16 + rng() * 8;
    while (x < W - 14) {
      const s = 13 + rng() * 9 + (rng() < 0.06 ? 4 : 0);
      const w = s * 0.62;
      if (x + w / 2 > AISLE_L - 14 && x - w / 2 < AISLE_R + 14) { x = AISLE_R + 20; continue; }
      out.push({ x: x + w / 2, y: sy, s: Math.min(s, 25), row });
      x += w + 2 + rng() * 4;
    }
  });
  return out;
})();

// ── Ground ───────────────────────────────────────────────────────────

/** The black-glass walls of the house outside each band, stepping in toward the stage. */
function walls(g: G, rng: () => number): void {
  for (const b of BANDS) {
    for (const [x0, x1] of [[0, b.L], [b.R, W]] as [number, number][]) {
      g.fillStyle(OBS.glass, 1); g.fillRect(x0, b.y0, x1 - x0, b.y1 - b.y0);
      for (let x = x0 + 18; x < x1 - 8; x += 54) {
        g.fillStyle(OBS.facet, 0.5); g.fillRect(x, b.y0, 22, b.y1 - b.y0);
        g.fillStyle(OBS.sheen, 0.25); g.fillRect(x + 2, b.y0, 3, b.y1 - b.y0);
      }
      if (rng() < 0.6) {
        const cx = x0 + 20 + rng() * Math.max(10, x1 - x0 - 40);
        seam(g, [{ x: cx, y: b.y0 + 8 }, { x: cx + 9, y: b.y0 + (b.y1 - b.y0) * 0.4 }, { x: cx - 6, y: b.y0 + (b.y1 - b.y0) * 0.7 }, { x: cx + 4, y: b.y1 - 6 }], 1.1, 0.6);
      }
    }
    // The pale edge where the wall meets the floor.
    g.lineStyle(2, OBS.edge, 0.55);
    g.lineBetween(b.L, b.y0, b.L, b.y1); g.lineBetween(b.R, b.y0, b.R, b.y1);
  }
  // The steps of the wall line between bands.
  for (let i = 1; i < BANDS.length; i++) {
    const a = BANDS[i - 1], b = BANDS[i];
    g.lineStyle(2, OBS.edge, 0.55);
    g.lineBetween(Math.min(a.L, b.L), b.y0, Math.max(a.L, b.L), b.y0);
    g.lineBetween(Math.min(a.R, b.R), b.y0, Math.max(a.R, b.R), b.y0);
  }
}

/** The stage apron: polished glass in a half-moon, a stave inlaid round its rim, the stair down. */
function stage(g: G, rng: () => number): void {
  const b = BANDS[BANDS.length - 1];
  glassFloor(g, b.L, b.y0, b.R - b.L, b.y1 - b.y0, 48, rng);
  // A half-moon of brighter polish, centred on the stair.
  g.fillStyle(OBS.facet, 0.55); g.fillEllipse(MID, H - 20, 760, 420);
  g.fillStyle(OBS.sheen, 0.18); g.fillEllipse(MID - 80, H - 90, 380, 120);
  // The stave round the apron: five rose lines in an arc, with the same note on it again and again.
  for (let i = 0; i < 5; i++) {
    g.lineStyle(1.2, VOICE, 0.28);
    g.beginPath(); g.arc(MID, H + 40, 300 + i * 9, Math.PI * 1.08, Math.PI * 1.92, false); g.strokePath();
  }
  for (let k = 0; k < 13; k++) {
    const a = Math.PI * (1.12 + k * 0.061);
    note(g, MID + Math.cos(a) * 318, H + 40 + Math.sin(a) * 318, 4, VOICE, 0.45);
  }
  // Footlights along the apron's front edge, unlit but one.
  for (let k = 0; k < 11; k++) {
    const x = b.L + 40 + k * ((b.R - b.L - 80) / 10);
    g.fillStyle(OBS.sheen, 1); g.fillEllipse(x, b.y0 + 10, 16, 6);
    g.fillStyle(k === 6 ? VOICE_LIT : OBS.glass, 1); g.fillEllipse(x, b.y0 + 9, 9, 3);
  }
  // The stair down at the south edge: treads getting darker as they drop.
  for (let i = 0; i < 6; i++) {
    const y = H - 70 + i * 12;
    g.fillStyle(i % 2 ? OBS.glass : OBS.facet, 1); g.fillRect(MID - 90 - i * 4, y, 180 + i * 8, 12);
    g.lineStyle(1, OBS.edge, 0.45 - i * 0.06); g.lineBetween(MID - 90 - i * 4, y, MID + 90 + i * 4, y);
  }
}

/** The aisle: a runner of glass with the Part inlaid up it — one note, all the way to the top. */
function aisle(g: G): void {
  const y0 = VAULT_Y + 10, y1 = BANDS[BANDS.length - 1].y0;
  g.fillStyle(0x07050c, 0.7); g.fillRect(AISLE_L + 22, y0, AISLE_R - AISLE_L - 44, y1 - y0);
  g.lineStyle(1, OBS.edge, 0.3);
  g.lineBetween(AISLE_L + 22, y0, AISLE_L + 22, y1); g.lineBetween(AISLE_R - 22, y0, AISLE_R - 22, y1);
  // Five stave lines running north.
  for (let i = 0; i < 5; i++) {
    const x = MID - 32 + i * 16;
    g.lineStyle(1.2, VOICE, 0.3); g.lineBetween(x, y0, x, y1);
  }
  // The Part: a note on the middle line every 64 px. The same one. For ever.
  for (let y = y1 - 40; y > y0 + 20; y -= 64) {
    g.fillStyle(VOICE, 0.5); g.fillEllipse(MID, y, 11, 8);
    g.lineStyle(1.6, VOICE, 0.5); g.lineBetween(MID + 5, y, MID + 22, y);
  }
}

/** Each band's floor: plain glass for the rows, brighter polish and a step nosing for landings. */
function floors(g: G, rng: () => number): void {
  for (const b of BANDS) {
    if (b.kind === 'stage') continue;
    glassFloor(g, b.L, b.y0, b.R - b.L, b.y1 - b.y0, 40, rng);
    if (b.kind === 'landing' || b.kind === 'terrace') {
      g.fillStyle(OBS.facet, 0.35); g.fillRect(b.L, b.y0, b.R - b.L, b.y1 - b.y0);
      // A ring of inlaid stave round each landing's middle, faintly lit.
      g.lineStyle(1, VOICE, 0.14);
      for (let i = 0; i < 3; i++) g.strokeEllipse(MID, (b.y0 + b.y1) / 2, 380 + i * 18, 90 + i * 10);
    }
    // The step up at the band's south edge: a dark riser face and a pale nosing.
    g.fillStyle(0x040309, 0.9); g.fillRect(b.L, b.y1 - 8, b.R - b.L, 8);
    g.lineStyle(1.4, OBS.edge, 0.5); g.lineBetween(b.L, b.y1 - 8, b.R, b.y1 - 8);
  }
}

/**
 * THE VOICE VAULT. Shelving from wall to wall and floor to ceiling; eight hundred jars in sight,
 * each a voice; uprights every few metres with a paper index pinned on; the door north.
 */
function vault(g: G, rng: () => number): void {
  g.fillStyle(0x05040a, 1); g.fillRect(0, 0, W, VAULT_Y);
  // Back panels of the shelving, each bay a slightly different black.
  for (let x = 0; x < W; x += 120) {
    g.fillStyle(rng() < 0.5 ? OBS.glass : 0x0b0912, 1); g.fillRect(x, 0, 120, VAULT_Y);
  }
  // Shelf boards.
  for (const sy of SHELVES) {
    g.fillStyle(OBS.facet, 1); g.fillRect(0, sy, W, 5);
    g.fillStyle(OBS.sheen, 1); g.fillRect(0, sy, W, 1.5);
    g.fillStyle(0x000000, 0.4); g.fillRect(0, sy + 5, W, 3);
  }
  // The jars.
  for (const j of JARS) voiceJar(g, j.x, j.y, j.s, { glow: 0.35 + rng() * 0.4, label: j.s > 15 });
  // Uprights, with the index cards pinned to them.
  for (let x = 120; x < W; x += 120) {
    if (x > AISLE_L - 30 && x < AISLE_R + 30) continue;
    g.fillStyle(OBS.glass, 1); g.fillRect(x - 6, 0, 12, VAULT_Y);
    g.fillStyle(OBS.facet, 1); g.fillRect(x, 0, 6, VAULT_Y);
    g.lineStyle(1, OBS.edge, 0.5); g.lineBetween(x + 6, 0, x + 6, VAULT_Y);
    for (let k = 0; k < 3; k++) {
      const cy = 40 + k * 78 + rng() * 10;
      g.fillStyle(PAPER, 0.85); g.fillRect(x - 5, cy, 10, 13);
      g.lineStyle(0.6, 0x3a2a3a, 0.6);
      for (let l = 0; l < 3; l++) g.lineBetween(x - 3, cy + 3 + l * 3, x + 3, cy + 3 + l * 3);
    }
  }
  // The door: a passage straight through the shelving, its stair climbing into faint warm light.
  g.fillStyle(0x030208, 1); g.fillRect(AISLE_L, 0, AISLE_R - AISLE_L, VAULT_Y);
  for (let y = VAULT_Y - 12; y > 0; y -= 13) {
    const k = y / VAULT_Y;
    g.fillStyle(k > 0.5 ? OBS.glass : OBS.facet, 1); g.fillRect(AISLE_L + 8, y, AISLE_R - AISLE_L - 16, 11);
    g.lineStyle(1, OBS.edge, 0.15 + (1 - k) * 0.35); g.lineBetween(AISLE_L + 8, y, AISLE_R - 8, y);
  }
  // Up there the star is closer: a thread of gold-white through the ceiling over the stair.
  g.fillStyle(OBS.star, 0.05); g.fillRect(AISLE_L + 20, 0, AISLE_R - AISLE_L - 40, 90);
  g.fillStyle(OBS.star, 0.07); g.fillRect(MID - 14, 0, 28, 46);
  // Side jambs of the passage.
  for (const x of [AISLE_L, AISLE_R - 10]) {
    g.fillStyle(OBS.facet, 1); g.fillRect(x, 0, 10, VAULT_Y);
    g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(x + (x === AISLE_L ? 10 : 0), 0, x + (x === AISLE_L ? 10 : 0), VAULT_Y);
  }
  // The Vault's foot: a long plinth the jars' hum has worn a stave into.
  g.fillStyle(OBS.glass, 1); g.fillRect(0, VAULT_Y - 2, W, 12);
  g.lineStyle(1.2, OBS.edge, 0.55); g.lineBetween(0, VAULT_Y - 2, AISLE_L, VAULT_Y - 2); g.lineBetween(AISLE_R, VAULT_Y - 2, W, VAULT_Y - 2);
}

/** Things dropped on the terrace and the stage: hymn sheets, a ribbon or two. */
function litter(g: G, rng: () => number): void {
  for (let i = 0; i < 26; i++) {
    const b = BANDS[rng() < 0.5 ? 0 : BANDS.length - 1];
    const x = b.L + 40 + rng() * (b.R - b.L - 80), y = b.y0 + 30 + rng() * (b.y1 - b.y0 - 60);
    if (x > AISLE_L - 10 && x < AISLE_R + 10) continue;
    if (rng() < 0.7) hymnSheet(g, x, y, 6 + rng() * 3, rng() * 6.28, 0.75);
    else ribbon(g, x, y, 6, 0.85, (rng() - 0.5) * 4);
  }
}

function paintGround(g: G, rng: () => number): void {
  g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, W, H);
  floors(g, rng);
  stage(g, rng);
  walls(g, rng);
  aisle(g);
  vault(g, rng);
  litter(g, rng);
}

// ── Pieces ───────────────────────────────────────────────────────────

/** A bank of glass pipes against a side wall: `n` pipes, tallest in the middle. */
function pipeBank(g: G, x: number, y: number, n: number, tall: number, rng: () => number): void {
  shadow(g, x, y + 2, n * 26, 16, 0.4);
  slab(g, x, y + 4, n * 24 + 20, 14);
  for (let i = 0; i < n; i++) {
    const f = 1 - Math.abs(i - (n - 1) / 2) / ((n - 1) / 2 + 0.5);
    const h = tall * (0.45 + f * 0.55) * (0.94 + rng() * 0.08);
    organPipe(g, x - ((n - 1) * 24) / 2 + i * 24, y - 8, 15 + f * 5, h, 0.3 + rng() * 0.6);
  }
}

/** The arch of the Vault's door: posts of pipes, a lintel of shelving, and the great jar over it. */
function vaultDoor(g: G, rng: () => number): void {
  const top = 44;
  // Lintel: a deep beam of glass across the passage.
  slab(g, MID, top + 40, AISLE_R - AISLE_L + 40, 40, rng, 2);
  // The great jar on the lintel: the oldest voice in the Vault, the loudest. The first one taken.
  glow(g, MID, top - 6, 46, VOICE, 0.06, 4);
  voiceJar(g, MID, top + 2, 44, { glow: 1, label: true });
  // A paper banderole across the lintel, the Part written on it.
  g.fillStyle(PAPER, 0.9); g.fillRect(MID - 70, top + 12, 140, 14);
  stave(g, MID - 64, MID + 64, top + 14, 2.4, 0x3a2a3a, 0.6, 0.7);
  for (let i = 0; i < 9; i++) { g.fillStyle(0x2a1a2a, 0.9); g.fillEllipse(MID - 56 + i * 14, top + 19, 4, 3); }
  // Jamb posts: a stack of jars each side, bigger ones low.
  for (const sx of [AISLE_L - 4, AISLE_R + 4]) {
    for (let k = 0; k < 5; k++) voiceJar(g, sx, VAULT_Y + 4 - k * 40, 30 - k * 2, { glow: 0.5 + rng() * 0.4, label: true });
  }
}

/** The copyist's library ladder, leaning on the shelves, a box of blank labels on its step. */
function ladder(g: G): void {
  const { x, y } = LADDER;
  shadow(g, x, y + 4, 70, 14, 0.4);
  g.lineStyle(5, OBS.glass, 1); g.lineBetween(x - 24, y, x - 12, 30); g.lineBetween(x + 24, y, x + 12, 30);
  g.lineStyle(2, OBS.edge, 0.5); g.lineBetween(x - 22, y, x - 10, 30); g.lineBetween(x + 26, y, x + 14, 30);
  for (let k = 1; k < 9; k++) {
    const f = k / 9;
    const yy = y - (y - 30) * f, hw = 24 - 12 * f;
    g.lineStyle(3, OBS.facet, 1); g.lineBetween(x - hw, yy, x + hw, yy);
    g.lineStyle(1, OBS.edge, 0.4); g.lineBetween(x - hw, yy - 1, x + hw, yy - 1);
  }
  // Rails it rolls on, and a box of labels on the third rung.
  g.fillStyle(OBS.sheen, 1); g.fillRect(x - 30, y - 2, 60, 4);
  g.fillStyle(PAPER, 1); g.fillRect(x - 10, y - 86, 20, 12);
  g.fillStyle(0xd8ccb0, 1); for (let i = 0; i < 4; i++) g.fillRect(x - 8 + i * 4, y - 92, 3, 7);
}

/** The conductor's podium on the stage: nobody on it, the baton laid across the empty desk. */
function podium(g: G, rng: () => number): void {
  const { x, y } = PODIUM;
  shadow(g, x, y + 2, 70, 18, 0.45);
  slab(g, x, y, 58, 22, rng, 1);
  // Music desk on a stem.
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 2, y - 62, 4, 42);
  g.fillStyle(OBS.facet, 1); g.fillRect(x - 26, y - 80, 52, 22);
  g.lineStyle(1, OBS.edge, 0.6); g.strokeRect(x - 26, y - 80, 52, 22);
  // The open Score on it, and the baton across.
  g.fillStyle(PAPER, 0.95); g.fillRect(x - 22, y - 78, 21, 18); g.fillRect(x + 1, y - 78, 21, 18);
  for (let i = 0; i < 4; i++) { g.lineStyle(0.6, 0x3a2a3a, 0.6); g.lineBetween(x - 20, y - 74 + i * 4, x + 20, y - 74 + i * 4); }
  g.lineStyle(2, SILK, 1); g.lineBetween(x - 30, y - 70, x + 28, y - 82);
  g.fillStyle(OBS.glass, 1); g.fillCircle(x - 30, y - 70, 3);
}

const pieces: NonNullable<AreaDef['painter']['pieces']> = [];
for (const r of ROWS) {
  pieces.push({ x: (r.x0 + r.x1) / 2, y: r.y1, w: r.x1 - r.x0 + 30, h: 70, draw: (g, rng) => seatRow(g, r.x0, r.x1, r.y1, rng) });
}
for (const s of SEATS) {
  pieces.push({ x: s.px, y: s.py, w: 140, h: 260, draw: (g, rng) => councilSeat(g, s.px, s.py, s.el, rng) });
}
// Pipe banks along the side walls, one by each landing and the terrace.
for (const b of BANDS) {
  if (b.kind !== 'landing' && b.kind !== 'terrace') continue;
  const y = b.y1 - 14;
  const tall = b.kind === 'terrace' ? 330 : 240;
  pieces.push({ x: b.L - 60, y, w: 190, h: tall + 40, draw: (g, rng) => pipeBank(g, b.L - 60, y, 5, tall, rng) });
  pieces.push({ x: b.R + 60, y, w: 190, h: tall + 40, draw: (g, rng) => pipeBank(g, b.R + 60, y, 5, tall, rng) });
}
for (const p of PIPE_FLANKS) {
  pieces.push({ x: p.x, y: p.y, w: 160, h: 300, draw: (g, rng) => pipeBank(g, p.x, p.y, 4, 250, rng) });
}
pieces.push({ x: MID, y: VAULT_Y + 2, w: 260, h: 260, draw: vaultDoor });
pieces.push({ x: LADDER.x, y: LADDER.y, w: 80, h: 250, draw: ladder });
pieces.push({ x: PODIUM.x, y: PODIUM.y, w: 80, h: 100, draw: podium });

// ── Per frame ────────────────────────────────────────────────────────

const inView = (v: Rect, x: number, y: number, pad = 40): boolean => x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

/**
 * The Vault hums: a slow wave of brightness rolls along the shelves, row by row, like a choir
 * breathing in. The Part runs up the aisle — one note lit at a time, read off toward the top.
 * The house-lights flicker. After the King, the hum stops being a hum and turns into singing.
 */
function animateUnder(g: G, t: number, view: Rect, world: PainterWorld): void {
  const free = world.test({ monarch: 'obsidian-king' });
  if (view.y < VAULT_Y + 60) {
    for (const j of JARS) {
      if (!inView(view, j.x, j.y, 20)) continue;
      const v = Math.sin(t * 1.1 - j.x * 0.006 + j.row * 0.55) * 0.5 + 0.5;
      if (v < 0.72) continue;
      const k = (v - 0.72) / 0.28;
      g.fillStyle(free ? VOICE_LIT : VOICE, 0.18 * k); g.fillCircle(j.x, j.y - j.s * 0.42, j.s * 0.75);
      g.fillStyle(VOICE_LIT, 0.45 * k); g.fillEllipse(j.x, j.y - j.s * 0.44, j.s * 0.3, j.s * 0.22);
    }
    // Rings of hum spreading from the door across the terrace.
    for (let i = 0; i < 3; i++) {
      const r = ((t * 46 + i * 110) % 330) + 30;
      g.lineStyle(1.4, VOICE, 0.16 * (1 - r / 360));
      g.beginPath(); g.arc(MID, VAULT_Y - 10, r, 0.15, Math.PI - 0.15, false); g.strokePath();
    }
  }
  // The Score read up the aisle.
  const ny = BANDS[BANDS.length - 1].y0 - 40 - ((t * 140) % 1460);
  if (inView(view, MID, ny)) {
    glow(g, MID, ny, 18, VOICE, 0.07, 3);
    g.fillStyle(VOICE_LIT, 0.9); g.fillEllipse(MID, ny, 11, 8);
  }
  // A few house-lights guttering along the risers.
  for (const r of ROWS) {
    if (!inView(view, (r.x0 + r.x1) / 2, r.y1, 300)) continue;
    const k = Math.sin(t * 2.3 + r.x0 * 0.03 + r.y1) * 0.5 + 0.5;
    g.fillStyle(VOICE, 0.25 * k); g.fillCircle(r.x0 + 14 + ((r.y1 * 7) % Math.max(1, r.x1 - r.x0 - 28)), r.y1 + 8, 4);
  }
  // The mask-slit glint on each seat's empty niche: a councilor still sits while it shows.
  for (const s of SEATS) {
    if (!inView(view, s.px, s.py - 190)) continue;
    if (world.test({ encounter: seatId(s.el) })) continue;
    const k = 0.5 + 0.5 * Math.sin(t * 1.6 + s.px);
    g.fillStyle(OBS.seam, 0.3 + 0.4 * k); g.fillRect(s.px - 6, s.py - 34 - 130, 12, 2);
  }
}

/**
 * Over the actors: a voice or two leaking past its stopper and climbing, while the King sits; when
 * he has fallen, the stoppers are out and the voices go home — streams of rose light rising out
 * of the Vault and away over the house.
 */
function animateOver(g: G, t: number, view: Rect, world: PainterWorld): void {
  const free = world.test({ monarch: 'obsidian-king' });
  const n = free ? 34 : 6;
  for (let i = 0; i < n; i++) {
    const j = JARS[(i * 97) % JARS.length];
    const per = free ? 5 + (i % 4) : 9 + (i % 5);
    const ph = ((t + i * 1.37) % per) / per;
    const x = j.x + Math.sin(t * 1.3 + i) * 14 * ph + (free ? (MID - j.x) * ph * 0.2 : 0);
    const y = j.y - j.s - ph * (free ? 520 : 160);
    if (!inView(view, x, y)) continue;
    const a = Math.sin(ph * Math.PI) * (free ? 0.75 : 0.45);
    g.fillStyle(VOICE, a * 0.3); g.fillCircle(x, y, 7);
    g.fillStyle(VOICE_LIT, a); g.fillCircle(x, y, 2.4);
  }
  if (free && inView(view, MID, 30, 200)) starGlow(g, MID, 0, 10, t, 0.6);
}

// ── People ───────────────────────────────────────────────────────────

const NPCS: NpcDef[] = [
  {
    id: 'pin-sound-copyist', name: 'Quaver Lisp', title: 'Copyist of the Vault',
    look: { body: 0x2a2236, accent: PAPER, hat: 'coif', traits: ['glasses', 'book'], size: 0.9, eye: 0xffd2ec },
    at: { x: LADDER.x - 52, y: 316 }, wander: 26,
    talks: [
      {
        when: { monarch: 'obsidian-king' },
        lines: [
          '(whispering, from habit) I am taking the labels off. One jar at a time. A voice goes, the label goes.',
          'It is much slower than putting them on. I find I do not mind at all.',
          'Shelf nine, row four. That one was a little girl who sang flat. She is home. I heard her go.',
        ],
      },
      {
        when: { courtReady: B.id },
        lines: [
          '(whispering) All six seats empty. I have a form for everything in this room. Not for that.',
          'The stair is open. Up there is the Noon Bench, and above that... I do not file anything from above that.',
        ],
      },
      {
        lines: [
          '(whispering) Shelf nine, row four. Row five. Please keep your voice down. They are trying to sleep.',
          'Every jar is labelled: whose voice, which isle, what note it sang flat. I have always written the labels.',
          'Choirholm is the newest wall. Behind it are walls older than any isle has a name for. I do not dust those.',
        ],
      },
    ],
  },
  {
    id: 'pin-sound-usher', name: 'The Usher', title: 'Muted, still on duty',
    look: { body: 0x1a1622, accent: SILK, hat: 'none', traits: ['scarf', 'lantern'], size: 1.0, eye: 0xc9b0ff },
    at: { x: 990, y: 1866 },
    talks: [
      {
        when: { monarch: 'obsidian-king' },
        lines: [
          '...Good evening. Ha. Good evening! I have not said that in — I have not said anything in —',
          'Forgive me. I used to show people to their seats and wish them a good evening. That was my whole job.',
          'Good evening. Good evening. Thank you. Enjoy the performance.',
        ],
      },
      {
        when: { courtReady: B.id },
        lines: [
          '(He lifts his lamp toward the top of the house, then touches the white ribbon at his throat, and bows.)',
          '(His hands: a flat palm rising — "up" — then two fingers walking. Then he points at you, and nods. "Go on.")',
        ],
      },
      {
        lines: [
          '(A white silk ribbon at his throat. He raises his lamp and shows you the house: every seat empty.)',
          '(His hands: one finger to the lips. Then six fingers, and a sweep up the aisle. Six of them, up there.)',
          '(He offers you a hymn sheet. Every line on it is the same note. He takes it back, apologetically.)',
        ],
      },
    ],
  },
];

// ── The area ─────────────────────────────────────────────────────────

const POIS: Poi[] = [
  { kind: 'waystone', at: { x: 600, y: 1880 } },
  ...SEATS.map((s): Poi => ({ kind: 'encounter', id: seatId(s.el) })),
  { kind: 'chest', id: relicId(B.id), at: { x: 1040, y: 430 }, item: relicId(B.id), orbs: 8, open: { courtReady: B.id } },
];

export const CHOIR_AREA: AreaDef = {
  id: B.id,
  isle: 'pinnacle',
  name: B.name,
  subtitle: B.subtitle,
  w: W,
  h: H,
  bg: OBS.sky,
  accent: VOICE_DEEP,
  weather: 'notes',
  spawn: { x: MID, y: 1860 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver },
  solids,
  exits: [
    { side: 's', to: below(B), label: 'Down to the Lot Bench' },
    {
      side: 'n', to: above(B), label: 'Up through the Vault — the Noon Bench', open: { courtReady: B.id },
      lockedText: 'Six seats are still filled. The Vault will not let anyone up its stair while a councilor sits.',
    },
  ],
  pois: POIS,
  npcs: NPCS,
  gloom: 0.26,
  intro: benchIntroId(B.id),
};

