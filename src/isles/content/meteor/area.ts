import type { AreaDef, Cond, PainterWorld, Poi, Rect, Solid } from '../../IslesTypes';
import { dim, glow, lit, mixC, mulberry } from '../../art/IsleArt';
import { crackPath, seam } from '../../art/PinnacleArt';
import {
  FP, type G, INNER, MOOD, type Mood, OUTER, P, RING_C, TEETH, CROWN_COLS, cinder, crownGlyph, glassFish, halfWidth,
  nodule, rimPt, shellFan, timber, tooth,
} from './art';
import { AT, FALL, FALLPOINT_NPCS, OPEN } from './people';
import { EMBERPORT_PIER, FALLPOINT, FALLPOINT_H as H, FALLPOINT_LANDING, FALLPOINT_W as W, METEOR_AT } from './spec';

/**
 * Fallpoint — where the star that "went out gently" came down instead.
 *
 * A ring-reef of sea-glass a few hundred yards across, standing out of deep water at night. The sea
 * boiled where the cinder struck and set as it cooled: amber where there was sand, bottle-green
 * where there was weed, and everything that was in it is in it still — shells, a ship's planking,
 * fish caught mid-turn. Round the rim the splash set standing, a crown of broken glass teeth, and
 * steam still crawls off the edge where the sea touches it. Inside the ring the water has gone: a
 * shallow bowl of fused glass ripples down to the cinder at its heart, shelled over in thin black
 * glass and shut with sixty keyholes.
 *
 * Three moods, read from the story: sealed (cold violet, quiet), open (the shell split, warm gold,
 * the keys in their locks and a small figure sitting in the light), and the Fall (ember red, the
 * whole bowl beating like a pulse, and ten lit crowns on the northern horizon).
 */

const NOT_OPEN: Cond = { not: OPEN };
const OPEN_AWAKE: Cond = { all: [OPEN, { not: FALL }] };

const moodOf = (w: PainterWorld): Mood => (w.test(FALL) ? 'fall' : w.test(OPEN) ? 'open' : 'sealed');
const inView = (v: Rect, x: number, y: number, pad: number): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;
const inEllipse = (e: { rx: number; ry: number }, x: number, y: number): boolean =>
  ((x - RING_C.x) / e.rx) ** 2 + ((y - RING_C.y) / e.ry) ** 2 <= 1;

/** The radial cracks from the cinder out to the rim — baked into the ground, lit by the mood each frame. */
const CRACKS: { x: number; y: number }[][] = (() => {
  const rng = mulberry(3301);
  const out: { x: number; y: number }[][] = [];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + rng() * 0.3;
    const end = rimPt(a, -0.05);
    out.push(crackPath({ x: METEOR_AT.x + Math.cos(a) * 52, y: METEOR_AT.y + Math.sin(a) * 30 }, end, rng, 22, 7));
  }
  return out;
})();

/** Where the rowers' boats and the Ferryman's skiff are drawn up on the south shore. */
const SKIFF = { x: 780, y: 1318 };
const LAMP_POLE = { x: 688, y: 1300 };
const BOATS: { x: number; y: number; hull: number; trim: number }[] = [
  { x: 1070, y: 1306, hull: 0x5a4030, trim: 0x8a9aa8 },
  { x: 1180, y: 1292, hull: 0x3a3a4a, trim: 0xc8c0e0 },
  { x: 1290, y: 1270, hull: 0x6a3a2a, trim: 0xe8d8b0 },
];
const TELESCOPE = { x: 1386, y: 586 };
const DESK = { x: 652, y: 612 };

// ── Ground ───────────────────────────────────────────────────────────

function paintGround(g: G, rng: () => number): void {
  // Deep night sea everywhere first, with long slow swell lines.
  g.fillStyle(FP.sea, 1); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) {
    const x = rng() * W, y = rng() * H;
    if (inEllipse(OUTER, x, y)) continue;
    g.lineStyle(1.5, FP.seaLit, 0.25 + rng() * 0.25); g.lineBetween(x, y, x + 30 + rng() * 60, y + (rng() - 0.5) * 2);
  }
  // Shallow water over the reef's drowned foot: a paler halo round the ring.
  for (let i = 4; i >= 1; i--) {
    g.fillStyle(mixC(FP.sea, FP.bottleDeep, 0.25 * (5 - i)), 0.5);
    g.fillEllipse(RING_C.x, RING_C.y, (OUTER.rx + i * 22) * 2, (OUTER.ry + i * 18) * 2);
  }
  // The rim: the two glasses poured round each other in bands.
  g.fillStyle(FP.bottleDeep, 1); g.fillEllipse(RING_C.x, RING_C.y, OUTER.rx * 2, OUTER.ry * 2);
  for (let i = 0; i < 900; i++) {
    const a = rng() * Math.PI * 2, f = rng();
    const p = rimPt(a, f);
    const amber = Math.sin(a * 5 + f * 3) + (rng() - 0.5) * 1.2 > 0;
    nodule(g, p.x, p.y, 8 + rng() * 16, amber ? FP.amber : FP.bottle, rng, 0.55 + rng() * 0.35);
  }
  // Sand fused in, shells, the odd fish mid-turn, a ship's planking.
  for (let i = 0; i < 1400; i++) {
    const p = rimPt(rng() * Math.PI * 2, rng());
    g.fillStyle(rng() > 0.5 ? FP.sand : lit(FP.amber, 0.3), 0.35); g.fillRect(p.x, p.y, 1.5, 1.5);
  }
  for (let i = 0; i < 70; i++) { const p = rimPt(rng() * Math.PI * 2, 0.1 + rng() * 0.8); shellFan(g, p.x, p.y, 0.9 + rng() * 0.8, rng() * 6.28, 0.75); }
  for (let i = 0; i < 26; i++) {
    const p = rimPt(rng() * Math.PI * 2, 0.15 + rng() * 0.7);
    const col = [0xd8b048, 0x8ab8c8, 0xc87a5a, 0xa8c890][i % 4];
    glassFish(g, p.x, p.y, 0.9 + rng() * 0.7, rng() * 6.28, col, 0.55);
    g.fillStyle(0xffffff, 0.12); g.fillEllipse(p.x - 2, p.y - 3, 14, 3);
  }
  // A ship's planking, broken and fused across the western rim — and a boot, which nobody claims.
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.92 + i * 0.03);
    const p0 = rimPt(a, 0.2), p1 = rimPt(a + 0.05, 0.75);
    timber(g, p0.x, p0.y + i * 2, p1.x, p1.y, 7, 0.75);
  }
  const boot = rimPt(Math.PI * 1.15, 0.5);
  g.fillStyle(0x2a1e16, 0.8); g.fillRect(boot.x, boot.y - 10, 7, 12); g.fillEllipse(boot.x + 6, boot.y + 1, 14, 6);
  // Foam frozen along the sea's edge, and a wet dark lip.
  g.lineStyle(10, FP.sea, 0.4); g.strokeEllipse(RING_C.x, RING_C.y, OUTER.rx * 2, OUTER.ry * 2);
  g.lineStyle(3, FP.foam, 0.25); g.strokeEllipse(RING_C.x, RING_C.y, OUTER.rx * 2 - 8, OUTER.ry * 2 - 8);
  // The lip of the bowl: a lit ridge, then the slope down.
  g.lineStyle(14, dim(FP.amber, 0.3), 0.7); g.strokeEllipse(RING_C.x, RING_C.y, INNER.rx * 2 + 10, INNER.ry * 2 + 10);
  g.lineStyle(3, FP.amberLit, 0.35); g.strokeEllipse(RING_C.x, RING_C.y, INNER.rx * 2 + 16, INNER.ry * 2 + 16);
  // The bowl: concentric bands darkening toward the heart (it slopes down to the cinder).
  for (let i = 0; i < 14; i++) {
    const f = i / 13;
    const cx = RING_C.x + (METEOR_AT.x - RING_C.x) * f, cy = RING_C.y + (METEOR_AT.y - RING_C.y) * f;
    g.fillStyle(mixC(mixC(FP.bottle, FP.amber, 0.35), FP.bowlDeep, 0.35 + f * 0.6), 1);
    g.fillEllipse(cx, cy, INNER.rx * 2 * (1 - f * 0.86), INNER.ry * 2 * (1 - f * 0.84));
  }
  // Big slow glass swirls, where the boil turned over as it set.
  for (let i = 0; i < 160; i++) {
    const a = rng() * Math.PI * 2, f = Math.sqrt(rng()) * 0.95;
    const x = RING_C.x + Math.cos(a) * INNER.rx * f, y = RING_C.y + Math.sin(a) * INNER.ry * f;
    g.fillStyle(rng() > 0.5 ? FP.bottle : FP.amber, 0.08 + rng() * 0.08);
    g.fillEllipse(x, y, 40 + rng() * 80, 10 + rng() * 20);
  }
  // The frozen ripples of the impact, rings round the cinder.
  for (let i = 1; i <= 9; i++) {
    const r = 70 + i * i * 4.4 + i * 14;
    g.lineStyle(2 + (i % 3), lit(FP.bowl, 0.18), 0.35 - i * 0.025);
    g.strokeEllipse(METEOR_AT.x, METEOR_AT.y + i * 4, r * 2.1, r * 1.45);
    g.lineStyle(1, 0x000000, 0.25); g.strokeEllipse(METEOR_AT.x, METEOR_AT.y + i * 4 + 4, r * 2.1, r * 1.45);
  }
  // The cracks, dark in the glass (their light is drawn by the mood).
  for (const c of CRACKS) {
    g.lineStyle(5, 0x000000, 0.4); g.beginPath(); g.moveTo(c[0].x, c[0].y); for (const p of c) g.lineTo(p.x, p.y); g.strokePath();
    g.lineStyle(1.4, dim(FP.amberLit, 0.2), 0.45); g.beginPath(); g.moveTo(c[0].x, c[0].y); for (const p of c) g.lineTo(p.x, p.y); g.strokePath();
  }
  // Scorch round the heart.
  for (let i = 5; i >= 1; i--) { g.fillStyle(0x050404, 0.12); g.fillEllipse(METEOR_AT.x, METEOR_AT.y, 120 + i * 40, 50 + i * 22); }
  // The landing's worn path: scuffed glass from the skiff up over the rim and down to the heart.
  const path = [FALLPOINT_LANDING, { x: 905, y: 1120 }, { x: 890, y: 940 }, { x: 905, y: 760 }, { x: 900, y: 600 }];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    for (let k = 0; k < 60; k++) {
      const f = rng();
      g.fillStyle(lit(FP.sand, 0.2), 0.12); g.fillCircle(a.x + (b.x - a.x) * f + (rng() - 0.5) * 50, a.y + (b.y - a.y) * f + (rng() - 0.5) * 10, 1 + rng() * 3);
    }
  }
  // Ida's oysters, cracked open on a flat bit of the shore, and Nell's net laid out beside a fish.
  for (let i = 0; i < 9; i++) {
    const x = AT.ida.x + 34 + (i % 3) * 9, y = AT.ida.y + 8 + Math.floor(i / 3) * 6;
    g.fillStyle(0x8a8a80, 1); g.fillEllipse(x, y, 9, 5); g.fillStyle(0xe0d8d0, 1); g.fillEllipse(x, y - 1, 6, 3);
  }
  g.lineStyle(1, 0xc8b890, 0.6);
  for (let i = 0; i < 6; i++) { g.lineBetween(AT.nell.x + 30 + i * 6, AT.nell.y + 6, AT.nell.x + 36 + i * 6, AT.nell.y + 30); g.lineBetween(AT.nell.x + 28, AT.nell.y + 10 + i * 4, AT.nell.x + 66, AT.nell.y + 10 + i * 4); }
  glassFish(g, AT.nell.x + 50, AT.nell.y + 44, 1.8, 0.4, 0xd8b048, 0.8);
  g.fillStyle(0xffffff, 0.15); g.fillEllipse(AT.nell.x + 46, AT.nell.y + 40, 30, 5);
}

// ── Pieces ───────────────────────────────────────────────────────────

const pieces: NonNullable<AreaDef['painter']['pieces']> = [
  // The cinder, three ways.
  {
    x: METEOR_AT.x, y: METEOR_AT.y + 6, w: 170, h: 120, when: NOT_OPEN,
    draw: (g) => cinder(g, METEOR_AT.x, METEOR_AT.y + 6, 1, { mood: 'sealed', t: 0 }),
  },
  {
    x: METEOR_AT.x, y: METEOR_AT.y + 6, w: 200, h: 130, when: OPEN_AWAKE,
    draw: (g) => cinder(g, METEOR_AT.x, METEOR_AT.y + 6, 1, { mood: 'open', t: 0, turned: 1, keys: 1, split: 1, king: 1, sitUp: 0.4 }),
  },
  {
    x: METEOR_AT.x, y: METEOR_AT.y + 6, w: 200, h: 130, when: FALL,
    draw: (g) => cinder(g, METEOR_AT.x, METEOR_AT.y + 6, 1, { mood: 'fall', t: 0, turned: 1, keys: 1, split: 1 }),
  },
  // The rim's broken teeth.
  ...TEETH.map((tt, i) => ({
    x: tt.x, y: tt.y, w: tt.r * 2 + Math.abs(tt.lean) * 2 + 30, h: tt.h + 20,
    draw: (g: G) => tooth(g, tt.x, tt.y, tt.r, tt.h, tt.lean, tt.green, mulberry(700 + i)),
  })),
  // The Ferryman's skiff, drawn up on the glass, bow to the bowl.
  {
    x: SKIFF.x, y: SKIFF.y, w: 150, h: 60,
    draw: (g) => {
      const { x, y } = SKIFF;
      g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y + 2, 140, 16);
      g.fillStyle(0x2a1e18, 1); g.fillPoints([P(x - 58, y - 12), P(x + 44, y - 12), P(x + 64, y - 30), P(x + 58, y - 8), P(x + 44, y + 4), P(x - 46, y + 4), P(x - 60, y - 6)], true);
      g.fillStyle(0x4a3628, 1); g.fillPoints([P(x - 58, y - 12), P(x + 44, y - 12), P(x + 64, y - 30), P(x + 61, y - 24), P(x + 44, y - 8), P(x - 57, y - 8)], true);
      g.fillStyle(0x1a120e, 1); g.fillEllipse(x - 4, y - 12, 92, 8);
      g.fillStyle(0x6a5038, 1); g.fillRect(x - 10, y - 15, 26, 4); g.fillRect(x - 40, y - 15, 18, 4);
      g.lineStyle(3, 0x6a5038, 1); g.lineBetween(x - 24, y - 16, x + 30, y - 22); g.fillStyle(0x6a5038, 1); g.fillEllipse(x + 34, y - 23, 14, 5);
      g.lineStyle(1, 0x8a6a4a, 0.8); g.lineBetween(x - 58, y - 12, x + 44, y - 12); g.lineBetween(x + 44, y - 12, x + 64, y - 30);
      g.lineStyle(2, 0x3a2a20, 1); g.lineBetween(x + 60, y - 26, x + 66, y - 50);
      g.fillStyle(0x2a2420, 1); g.fillRect(x + 66, y - 50, 8, 10);
      g.fillStyle(0xffd890, 0.9); g.fillRect(x + 67.5, y - 48, 5, 6);
      // The painter line, tied off to a lump of glass.
      g.lineStyle(1, 0xb8a888, 0.8); g.lineBetween(x - 58, y - 8, x - 84, y - 2);
      nodule(g, x - 88, y - 2, 8, FP.bottle, mulberry(5), 1);
    },
  },
  // The Ferryman's lamp on its pole, stuck in a crack in the glass.
  {
    x: LAMP_POLE.x, y: LAMP_POLE.y, w: 40, h: 130,
    draw: (g) => {
      const { x, y } = LAMP_POLE;
      g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 1, 26, 8);
      nodule(g, x - 6, y, 7, FP.amber, mulberry(9), 1); nodule(g, x + 7, y + 1, 6, FP.bottle, mulberry(10), 1);
      g.lineStyle(4, 0x3a2a1e, 1); g.lineBetween(x, y, x + 3, y - 104);
      g.lineStyle(1, 0x6a5038, 1); g.lineBetween(x - 1, y - 2, x + 2, y - 102);
      g.lineStyle(3, 0x3a2a1e, 1); g.lineBetween(x + 3, y - 104, x + 16, y - 100);
      g.lineStyle(1, 0x2a2420, 1); g.lineBetween(x + 16, y - 100, x + 16, y - 94);
      g.fillStyle(0x2a2420, 1); g.fillTriangle(x + 10, y - 94, x + 22, y - 94, x + 16, y - 99); g.fillRect(x + 11, y - 80, 10, 3);
      g.fillStyle(0xffd890, 1); g.fillRect(x + 12, y - 94, 8, 14);
      g.fillStyle(0xffffff, 0.9); g.fillEllipse(x + 16, y - 87, 3, 6);
    },
  },
  // The onlookers' boats.
  ...BOATS.map((b) => ({
    x: b.x, y: b.y, w: 100, h: 40,
    draw: (g: G) => {
      const { x, y } = b;
      g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 2, 90, 12);
      g.fillStyle(dim(b.hull, 0.35), 1); g.fillPoints([P(x - 40, y - 10), P(x + 38, y - 10), P(x + 30, y + 3), P(x - 32, y + 3)], true);
      g.fillStyle(b.hull, 1); g.fillPoints([P(x - 40, y - 10), P(x + 38, y - 10), P(x + 36, y - 6), P(x - 38, y - 6)], true);
      g.fillStyle(0x140e0a, 1); g.fillEllipse(x, y - 10, 66, 6);
      g.lineStyle(2, b.trim, 0.9); g.lineBetween(x - 40, y - 10, x + 38, y - 10);
      g.fillStyle(lit(b.hull, 0.2), 1); g.fillRect(x - 6, y - 13, 18, 3);
    },
  })),
  // Anselm's telescope on its tripod, aimed at the gap in the sky.
  {
    x: TELESCOPE.x, y: TELESCOPE.y, w: 60, h: 80,
    draw: (g) => {
      const { x, y } = TELESCOPE;
      g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 1, 36, 8);
      g.lineStyle(2, 0x5a4430, 1);
      g.lineBetween(x, y - 40, x - 14, y); g.lineBetween(x, y - 40, x + 14, y); g.lineBetween(x, y - 40, x + 2, y + 4);
      g.fillStyle(0x7a5a24, 1); g.fillPoints([P(x - 16, y - 34), P(x + 22, y - 62), P(x + 25, y - 57), P(x - 13, y - 30)], true);
      g.fillStyle(0xc9a44a, 1); g.fillPoints([P(x - 16, y - 34), P(x + 22, y - 62), P(x + 23, y - 60), P(x - 15, y - 32)], true);
      g.fillStyle(0xc9a44a, 1); g.fillCircle(x + 24, y - 60, 4); g.fillStyle(0x8ab8e0, 0.9); g.fillCircle(x + 24, y - 60, 2.4);
      g.fillStyle(0x2a2420, 1); g.fillCircle(x, y - 42, 3);
      // A chart pinned under a stone at its foot: the Ladle, one rung circled.
      g.fillStyle(0xd8d0b8, 1); g.fillRect(x - 34, y - 6, 22, 14);
      g.fillStyle(0x3a3a5a, 1); for (const [dx, dy] of [[-30, -2], [-26, 0], [-22, -1], [-18, 2], [-16, 5]]) g.fillCircle(x + dx, y + dy, 0.9);
      g.lineStyle(0.8, 0xa83a2a, 1); g.strokeCircle(x - 22, y - 1, 2.6);
      g.fillStyle(0x4a4a4a, 1); g.fillCircle(x - 14, y + 6, 3);
    },
  },
  // Corwen's lap-desk on an upturned crate: inkpot, a roll of the Ten Laws, a pen laid down.
  {
    x: DESK.x, y: DESK.y, w: 50, h: 40,
    draw: (g) => {
      const { x, y } = DESK;
      g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 1, 36, 8);
      g.fillStyle(0x5a4028, 1); g.fillRect(x - 13, y - 16, 26, 16);
      g.lineStyle(1, 0x3a281a, 1); g.strokeRect(x - 13, y - 16, 26, 16); g.lineBetween(x - 13, y - 8, x + 13, y - 8);
      g.fillStyle(0x7a5a3a, 1); g.fillPoints([P(x - 15, y - 16), P(x + 15, y - 16), P(x + 13, y - 22), P(x - 13, y - 20)], true);
      g.fillStyle(0xe8e0c8, 1); g.fillRect(x - 10, y - 22, 12, 4);
      g.lineStyle(0.6, 0x6a6a6a, 0.7); for (let i = 0; i < 3; i++) g.lineBetween(x - 9, y - 21 + i, x + 1, y - 21 + i);
      g.fillStyle(0x1a1a24, 1); g.fillCircle(x + 8, y - 21, 2.4);
      g.lineStyle(1, 0xe8e0d0, 1); g.lineBetween(x + 3, y - 18, x + 12, y - 24);
      g.fillStyle(0xd8cca8, 1); g.fillEllipse(x - 18, y - 2, 8, 6); g.lineStyle(0.6, 0x8a2a2a, 1); g.lineBetween(x - 22, y - 2, x - 14, y - 2);
    },
  },
];

// ── Per frame ────────────────────────────────────────────────────────

/** Under actors: the sea, the steam on the rim's edge, the cracks lit by the mood, the crowns over the sea. */
function animateUnder(g: G, t: number, view: Rect, world: PainterWorld): void {
  const mood = moodOf(world);
  const m = MOOD[mood];
  // Sea catchlights: starlight while the sky is whole, a gap's worth of nothing, gold / red in the other moods.
  const catchC = mood === 'sealed' ? 0xb8c0e0 : m.light;
  for (let y = Math.max(0, Math.floor(view.y / 46) * 46); y < Math.min(H, view.y + view.h + 46); y += 46) {
    for (let x = Math.floor(view.x / 120) * 120 - 120; x < view.x + view.w + 120; x += 120) {
      const ox = x + ((t * (8 + (y % 5) * 2) + y * 0.7) % 120);
      const oy = y + Math.sin(t * 0.8 + x * 0.013) * 4;
      if (inEllipse({ rx: OUTER.rx + 20, ry: OUTER.ry + 20 }, ox, oy)) continue;
      g.lineStyle(2, FP.seaLit, 0.45); g.lineBetween(ox, oy, ox + 46, oy - 1);
      if ((Math.floor(x / 120) + Math.floor(y / 46)) % 3 === 0) { g.fillStyle(catchC, 0.25); g.fillEllipse(ox + 24, oy - 1, 10, 1.8); }
    }
  }
  // Where the sea laps the rim it hisses: foam breathing in and out.
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const p = rimPt(a, 1.02);
    if (!inView(view, p.x, p.y, 60)) continue;
    const k = 0.5 + 0.5 * Math.sin(t * 0.9 + i * 1.7);
    g.fillStyle(FP.foam, 0.1 + k * 0.12); g.fillEllipse(p.x, p.y, 40 + k * 16, 5 + k * 3);
  }
  // The cracks carry the mood out from the heart: a slow violet seep, a warm steady glow, or a heartbeat.
  const beat = mood === 'fall' ? heartbeat(t) : 0;
  CRACKS.forEach((c, i) => {
    const mid = c[Math.floor(c.length / 2)];
    if (!inView(view, mid.x, mid.y, 500)) return;
    if (mood === 'sealed') {
      seam(g, c, 1.2, 0.18 + 0.08 * Math.sin(t * 0.7 + i), 0, m.light);
      return;
    }
    seam(g, c, mood === 'fall' ? 1.8 : 1.4, mood === 'fall' ? 0.35 + 0.6 * beat : 0.45, mood === 'fall' ? beat : 0.2, m.light);
    // A pulse of light runs out along each one.
    const ph = (t * (mood === 'fall' ? 0.55 : 0.18) + i * 0.13) % 1;
    const seg = Math.min(c.length - 2, Math.floor(ph * (c.length - 1)));
    const f = ph * (c.length - 1) - seg;
    const px = c[seg].x + (c[seg + 1].x - c[seg].x) * f, py = c[seg].y + (c[seg + 1].y - c[seg].y) * f;
    g.fillStyle(m.light, 0.14 * (1 - ph)); g.fillCircle(px, py, 22);
    g.fillStyle(m.core, 0.6 * (1 - ph)); g.fillCircle(px, py, 3);
  });
  // The bowl's light round the heart.
  if (inView(view, METEOR_AT.x, METEOR_AT.y, 500)) {
    if (mood === 'sealed') {
      g.fillStyle(m.wash, 0.05 + 0.02 * Math.sin(t * 0.6)); g.fillEllipse(METEOR_AT.x, METEOR_AT.y + 10, 520, 300);
    } else if (mood === 'open') {
      glow(g, METEOR_AT.x, METEOR_AT.y, 280, m.wash, 0.035, 5);
      g.fillStyle(m.light, 0.06 + 0.02 * Math.sin(t * 1.3)); g.fillEllipse(METEOR_AT.x, METEOR_AT.y + 14, 340, 140);
    } else {
      glow(g, METEOR_AT.x, METEOR_AT.y, 300 + beat * 60, m.wash, 0.03 + beat * 0.03, 5);
      // The whole bowl flushes on each beat.
      g.fillStyle(m.light, 0.04 * beat); g.fillEllipse(RING_C.x, RING_C.y, INNER.rx * 2, INNER.ry * 2);
    }
  }
  // In the Fall: ten crowns burning low on the northern horizon, each over its own isle's colour.
  if (mood === 'fall' && view.y < 140) {
    for (let i = 0; i < 10; i++) {
      const x = 130 + i * 170, y = 72 + Math.abs(i - 4.5) * 4;
      if (!inView(view, x, y, 80)) continue;
      const col = CROWN_COLS[i];
      g.fillStyle(col, 0.08); g.fillEllipse(x, y + 18, 120, 14);
      g.fillStyle(dim(col, 0.8), 1); g.fillEllipse(x, y + 10, 70, 12);
      crownGlyph(g, x, y, 1.5, col, 0.75 + 0.25 * Math.sin(t * 2.4 + i), t);
      for (let j = 0; j < 4; j++) { g.fillStyle(col, 0.14 * (1 - j / 4)); g.fillRect(x - 6 + Math.sin(t * 2 + j) * 3, y + 22 + j * 9, 12 - j * 2, 2.5); }
    }
  }
}

/** The Fall's light is a pulse: a double thump, then rest. 0–1. */
function heartbeat(t: number): number {
  const ph = (t * 1.1) % 1;
  return Math.max(Math.exp(-((ph - 0.08) ** 2) / 0.002), 0.7 * Math.exp(-((ph - 0.26) ** 2) / 0.002));
}

/** Over actors: steam off the edge, the keyholes' light, gold motes from the split, the lamps' halos. */
function animateAbove(g: G, t: number, view: Rect, world: PainterWorld): void {
  const mood = moodOf(world);
  const m = MOOD[mood];
  // Steam crawling up off the rim where it meets the sea.
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2 + 0.07;
    const base = rimPt(a, 0.96);
    if (!inView(view, base.x, base.y, 120)) continue;
    for (let j = 0; j < 3; j++) {
      const k = (t * 0.12 + i * 0.37 + j / 3) % 1;
      g.fillStyle(0xd8dce4, 0.1 * Math.sin(k * Math.PI)); g.fillEllipse(base.x + Math.sin(t * 0.4 + i + j) * 14, base.y - k * 70, 30 + k * 40, 14 + k * 12);
    }
  }
  if (inView(view, METEOR_AT.x, METEOR_AT.y, 260)) {
    const cx = METEOR_AT.x, cy = METEOR_AT.y - 30;
    if (mood === 'sealed') {
      // The keyholes watch: a faint violet breath over the shell.
      g.fillStyle(m.light, 0.04 + 0.03 * Math.sin(t * 1.2)); g.fillEllipse(cx, cy, 120, 100);
    } else {
      // Motes going up from the split: gold and slow while open, red and quick inside the Fall.
      const n = mood === 'fall' ? 18 : 12;
      for (let i = 0; i < n; i++) {
        const k = (t * (mood === 'fall' ? 0.5 : 0.22) + i / n) % 1;
        const x = cx + Math.sin(i * 2.4 + t * 0.6) * (10 + k * 30);
        g.fillStyle(i % 3 ? m.light : m.core, (1 - k) * 0.7); g.fillRect(x, cy - 20 - k * 120, 2, 2);
      }
      if (mood === 'fall') {
        const b = heartbeat(t);
        g.fillStyle(m.light, 0.1 * b); g.fillEllipse(cx, cy, 140 + b * 30, 110 + b * 20);
      }
    }
  }
  // The lamps: the Ferryman's, and the skiff's bow lantern.
  const fl = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 5.3);
  for (const p of [{ x: LAMP_POLE.x + 16, y: LAMP_POLE.y - 87 }, { x: SKIFF.x + 70, y: SKIFF.y - 45 }]) {
    if (!inView(view, p.x, p.y, 140)) continue;
    glow(g, p.x, p.y, 46 * fl, 0xffb050, 0.05, 4);
  }
}

// ── Solids ───────────────────────────────────────────────────────────

/** The sea outside the ring, in 20 px rows (each row's widest edge, so the glass edge never leaks). */
function seaSolids(): Solid[] {
  const out: Solid[] = [];
  const e = { rx: OUTER.rx - 14, ry: OUTER.ry - 14 };
  const top = RING_C.y - e.ry, bot = RING_C.y + e.ry;
  out.push({ kind: 'rect', x: 0, y: 0, w: W, h: Math.floor(top / 20) * 20 });
  out.push({ kind: 'rect', x: 0, y: Math.ceil(bot / 20) * 20, w: W, h: H - Math.ceil(bot / 20) * 20 });
  for (let y = Math.floor(top / 20) * 20; y < Math.ceil(bot / 20) * 20; y += 20) {
    const hw = Math.max(halfWidth(e, y), halfWidth(e, y + 20), y < RING_C.y && y + 20 > RING_C.y ? e.rx : 0);
    const x0 = Math.round(RING_C.x - hw), x1 = Math.round(RING_C.x + hw);
    if (x0 > 0) out.push({ kind: 'rect', x: 0, y, w: x0, h: 20 });
    if (x1 < W) out.push({ kind: 'rect', x: x1, y, w: W - x1, h: 20 });
  }
  return out;
}

const solids: Solid[] = [
  ...seaSolids(),
  ...TEETH.map((tt): Solid => ({ kind: 'circle', x: tt.x, y: tt.y, r: tt.r })),
  { kind: 'circle', x: METEOR_AT.x, y: METEOR_AT.y, r: 42 },
  { kind: 'rect', x: SKIFF.x - 56, y: SKIFF.y - 12, w: 112, h: 16 },
  ...BOATS.map((b): Solid => ({ kind: 'rect', x: b.x - 36, y: b.y - 10, w: 72, h: 12 })),
  { kind: 'circle', x: TELESCOPE.x, y: TELESCOPE.y, r: 10 },
  { kind: 'rect', x: DESK.x - 13, y: DESK.y - 10, w: 26, h: 10 },
];

// ── POIs ─────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  { kind: 'meteor', at: METEOR_AT },
  { kind: 'waystone', at: { x: 1030, y: 1170 } },
  { kind: 'door', at: { x: SKIFF.x, y: SKIFF.y - 34 }, to: 'emberport', arrive: EMBERPORT_PIER, label: 'The Ferryman’s skiff — back to Emberport' },
  { kind: 'chest', id: 'fallpoint-chest-wreck', at: { x: 330, y: 760 }, coins: 600, orbs: 3, item: 'charm-fallpoint-glass' },
  {
    kind: 'sign', at: { x: 1000, y: 1250 },
    text: 'Scratched in the glass with a boat-hook: FALLPOINT. Under it, smaller, in another hand: IT DID NOT GO OUT.',
  },
];

export const FALLPOINT_AREA: AreaDef = {
  id: FALLPOINT,
  isle: 'pinnacle',
  name: 'Fallpoint',
  subtitle: 'Where the second star came down',
  w: W,
  h: H,
  bg: FP.sea,
  accent: FP.amber,
  weather: 'steam',
  gloom: 0.25,
  spawn: { ...FALLPOINT_LANDING },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver: animateAbove },
  solids,
  exits: [],
  pois: POIS,
  npcs: FALLPOINT_NPCS,
};
