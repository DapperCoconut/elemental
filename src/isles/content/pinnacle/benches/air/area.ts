import type Phaser from 'phaser';
import type { AreaDef, NpcDef, PainterWorld, Poi, Rect, Solid } from '../../../../IslesTypes';
import { type G, glow, mixC, motes } from '../../../../art/IsleArt';
import { crackPath, glassFloor, seam, shard, slab } from '../../../../art/PinnacleArt';
import { above, below, benchIntroId, relicId, seatId } from '../../spec';
import {
  CLOUD, CLOUD_DEEP, GALE, GALE_LIT, OBS, VOID, bannerCloth, bannerPole, breathBottle, breathMeterBody, breathMeterLive,
  cloudBank, cloudWisp, councilSeat, meterSigil, windRune,
} from './art';
import { BENCH, SEAT_AT } from './councilors';

/**
 * The Gale Bench — the fourth bench of the Obsidian Pinnacle, and the only one *outside* the spire.
 *
 * The Breath-Tax was written out here, on the flank, where the air is thinnest: a ladder of black-
 * glass platforms and narrow bridges slung between shards over a sea of cloud, banners cracking
 * on every corner, stars close enough to have rays. You climb south → north:
 *
 *   The Landing      (y 1720–2000) the south stair up from the Thorn Bench, a waystone.
 *   The Lower Span   (y 1280–1520) the Seat of the Gale (west) and the Seat of Squalls (east).
 *   The Meter Terrace(y 600–1080)  THE BREATH-METER — the vast bellows-and-anemometer that counted
 *                                  every breath owed on Highspire — with the Seat of the Plumb Line
 *                                  and the Seat of the Long Sleep either side; its tallyman still
 *                                  writing.
 *   The Upper Span   (y 160–400)   the Seat of the Zenith and the Seat of the Last Word, the relic,
 *                                  and the stair up to the Stone Bench (sealed until six seats empty).
 *
 * Two bridges cross each gap but the first, so the climb loops past every seat. Everything not a
 * platform or a bridge is cloud and is solid (you cannot walk on air — that was the point).
 */

const W = 1600;
const H = 2000;
const MID = 800;
const CELL = 40;

/** Walkable ground: platforms and the bridges between them. */
const PLATFORMS: Rect[] = [
  { x: 480, y: 1720, w: 640, h: 280 },   // the Landing
  { x: 240, y: 1280, w: 1120, h: 240 },  // the Lower Span
  { x: 160, y: 600, w: 1280, h: 480 },   // the Meter Terrace
  { x: 240, y: 160, w: 1120, h: 240 },   // the Upper Span
];
const BRIDGES: Rect[] = [
  { x: 760, y: 1520, w: 80, h: 200 },
  { x: 280, y: 1080, w: 120, h: 200 },
  { x: 1200, y: 1080, w: 120, h: 200 },
  { x: 360, y: 400, w: 120, h: 200 },
  { x: 1120, y: 400, w: 120, h: 200 },
];
const STAIR: Rect = { x: 680, y: 0, w: 240, h: 160 };
const WALK: Rect[] = [...PLATFORMS, ...BRIDGES, STAIR];

/** The Breath-Meter: the front of its dais. */
const MX = MID;
const MY = 820;
const CLERK = { x: 690, y: 910 };
const WAYSTONE = { x: 620, y: 1820 };
const RELIC_AT = { x: 800, y: 250 };
const BANNERS: { x: number; y: number; dir: number }[] = [
  { x: 500, y: 1740, dir: -1 }, { x: 1100, y: 1740, dir: 1 },
  { x: 260, y: 1300, dir: -1 }, { x: 1340, y: 1300, dir: 1 },
  { x: 180, y: 620, dir: -1 }, { x: 1420, y: 620, dir: 1 }, { x: 180, y: 1060, dir: -1 }, { x: 1420, y: 1060, dir: 1 },
  { x: 260, y: 180, dir: -1 }, { x: 1340, y: 180, dir: 1 },
];
const BANNER_H = 120;
/** Seats stand just north of where their councilor waits. */
const SEATS = BENCH.elements.map((el) => ({ el, x: SEAT_AT[el].x, y: SEAT_AT[el].y - 34 }));
/** Tall shards out in the cloud, for the silhouette of the place. */
const OUT_SHARDS: [number, number, number, number, number][] = [
  [80, 1990, 120, 520, 12], [1520, 1990, 110, 600, -16], [70, 1240, 100, 460, 10], [1530, 1240, 120, 520, -10],
  [60, 560, 110, 420, 14], [1540, 560, 100, 480, -12], [300, 2000, 70, 260, 6], [1300, 2000, 80, 300, -8],
  [1500, 120, 90, 120, -6], [100, 140, 80, 140, 8],
];

// ── Solids ───────────────────────────────────────────────────────────

const inWalk = (x: number, y: number): boolean => WALK.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);

/** Everything off the platforms is cloud: a grid of solid cells, merged into runs, then into blocks. */
function cloudSolids(): Solid[] {
  const runs: { x: number; w: number; y: number; h: number }[] = [];
  let prev: { x: number; w: number; y: number; h: number }[] = [];
  for (let y = 0; y < H; y += CELL) {
    const row: { x: number; w: number; y: number; h: number }[] = [];
    let start = -1;
    for (let x = 0; x <= W; x += CELL) {
      const solid = x < W && !inWalk(x + CELL / 2, y + CELL / 2);
      if (solid && start < 0) start = x;
      if (!solid && start >= 0) { row.push({ x: start, w: x - start, y, h: CELL }); start = -1; }
    }
    // Grow a run from the row above when it has the same span.
    const next: typeof row = [];
    for (const r of row) {
      const up = prev.find((p) => p.x === r.x && p.w === r.w && p.y + p.h === y);
      if (up) { up.h += CELL; next.push(up); } else { runs.push(r); next.push(r); }
    }
    prev = next;
  }
  return runs.map((r) => ({ kind: 'rect' as const, x: r.x, y: r.y, w: r.w, h: r.h }));
}

const solids: Solid[] = [
  ...cloudSolids(),
  // The Meter's dais and its bellows' stands.
  { kind: 'rect', x: MX - 150, y: MY - 60, w: 300, h: 60 },
  { kind: 'circle', x: MX - 210, y: MY - 4, r: 18 },
  { kind: 'circle', x: MX + 210, y: MY - 4, r: 18 },
  // The seats' plinths.
  ...SEATS.map((s): Solid => ({ kind: 'rect', x: s.x - 60, y: s.y - 30, w: 120, h: 30 })),
  // Banner poles.
  ...BANNERS.map((b): Solid => ({ kind: 'circle', x: b.x, y: b.y, r: 10 })),
];

// ── Ground ───────────────────────────────────────────────────────────

/** A platform of black glass: a cliff of it falling into the cloud below, a tiled top, a pale lip. */
function ledge(g: G, r: Rect, rng: () => number): void {
  // The underside, jagged, dropping away south into the cloud.
  g.fillStyle(OBS.glass, 1);
  const pts: { x: number; y: number }[] = [{ x: r.x, y: r.y + r.h }];
  for (let x = r.x; x <= r.x + r.w; x += 40) pts.push({ x, y: r.y + r.h + 30 + rng() * 60 });
  pts.push({ x: r.x + r.w, y: r.y + r.h });
  g.fillPoints(pts.map((p) => ({ x: p.x, y: p.y }) as Phaser.Geom.Point), true);
  for (let x = r.x + 20; x < r.x + r.w; x += 40 + rng() * 30) {
    g.lineStyle(1, OBS.edge, 0.2); g.lineBetween(x, r.y + r.h, x + (rng() - 0.5) * 10, r.y + r.h + 30 + rng() * 40);
  }
  g.fillStyle(OBS.facet, 0.5); g.fillRect(r.x, r.y + r.h, r.w, 8);
  glassFloor(g, r.x, r.y, r.w, r.h, 40, rng);
  g.lineStyle(2, OBS.edge, 0.75); g.strokeRect(r.x, r.y, r.w, r.h);
  g.lineStyle(1, GALE, 0.2); g.strokeRect(r.x + 5, r.y + 5, r.w - 10, r.h - 10);
  for (let i = 0; i < Math.round((r.w * r.h) / 90000) + 1; i++) {
    const a = { x: r.x + 30 + rng() * (r.w - 60), y: r.y + 20 + rng() * (r.h - 40) };
    seam(g, crackPath(a, { x: a.x + (rng() - 0.5) * 200, y: a.y + (rng() - 0.5) * 90 }, rng, 8, 5), 1.1, 0.55);
  }
}

/** A bridge: a span of planks crosswise, glass balusters along both sides, a breath-line down the middle. */
function bridge(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(OBS.glass, 1); g.fillRect(r.x - 4, r.y, r.w + 8, r.h);
  for (let y = r.y; y < r.y + r.h; y += 16) {
    g.fillStyle(rng() > 0.5 ? OBS.facet : OBS.glass, 1); g.fillRect(r.x, y + 1, r.w, 14);
    g.fillStyle(OBS.sheen, 0.25); g.fillRect(r.x, y + 1, r.w, 2);
  }
  g.fillStyle(GALE, 0.12); g.fillRect(r.x + r.w / 2 - 3, r.y, 6, r.h);
  for (const ex of [r.x - 6, r.x + r.w + 2]) {
    g.fillStyle(OBS.sheen, 1); g.fillRect(ex, r.y, 4, r.h);
    g.lineStyle(1, OBS.edge, 0.8); g.lineBetween(ex + 2, r.y, ex + 2, r.y + r.h);
    for (let y = r.y + 10; y < r.y + r.h; y += 24) { g.fillStyle(OBS.edge, 0.8); g.fillRect(ex - 1, y, 6, 4); }
  }
  // The shadow of the bridge on the cloud far below.
  g.fillStyle(CLOUD_DEEP, 0.3); g.fillRect(r.x + 30, r.y + 10, r.w, r.h);
}

function paintGround(g: G, rng: () => number): void {
  for (let i = 0; i < 20; i++) { g.fillStyle(mixC(VOID, 0x121a34, i / 19), 1); g.fillRect(0, (i * H) / 20, W, H / 20 + 1); }
  // The cloud sea, in rows, with gaps where the sea far below glints.
  for (let y = 20; y < H + 60; y += 64) {
    for (let x = -60; x < W + 80; x += 80 + rng() * 70) {
      if (rng() < 0.12) { g.fillStyle(OBS.seaLit, 0.5); g.fillEllipse(x, y, 30, 4); continue; }
      cloudBank(g, x, y, 110 + rng() * 90, 44 + rng() * 26, rng, 0.75 + rng() * 0.25);
    }
  }
  // Lower shards poking up through the cloud.
  for (let i = 0; i < 26; i++) {
    const x = rng() * W, y = rng() * H;
    if (inWalk(x, y) || inWalk(x, y - 60)) continue;
    shard(g, x, y, 24 + rng() * 30, 40 + rng() * 70, (rng() - 0.5) * 20, 0.1);
  }
  for (const b of BRIDGES) bridge(g, b, rng);
  for (const p of PLATFORMS) ledge(g, p, rng);
  // The north stair, rising toward the Stone Bench.
  for (let i = 0; i < 8; i++) {
    const y = STAIR.y + i * 20;
    g.fillStyle(mixC(OBS.facet, OBS.sheen, i / 8), 1); g.fillRect(STAIR.x, y, STAIR.w, 18);
    g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(STAIR.x, y, STAIR.x + STAIR.w, y);
  }
  g.lineStyle(2, OBS.edge, 0.8); g.lineBetween(STAIR.x, 0, STAIR.x, STAIR.h); g.lineBetween(STAIR.x + STAIR.w, 0, STAIR.x + STAIR.w, STAIR.h);
  // The south stair, down to the Thorn Bench.
  for (let i = 0; i < 4; i++) {
    const y = H - 80 + i * 20;
    g.fillStyle(mixC(OBS.sheen, OBS.glass, i / 4), 1); g.fillRect(700, y, 200, 18);
    g.lineStyle(1, OBS.edge, 0.5); g.lineBetween(700, y, 900, y);
  }
  // The Meter terrace's inlay: breath-channels running in from every edge to the dais.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const ex = MX + Math.cos(a) * 560, ey = MY - 20 + Math.sin(a) * 210;
    g.lineStyle(6, GALE, 0.05); g.lineBetween(MX, MY - 20, ex, ey);
    g.lineStyle(1.5, GALE, 0.3); g.lineBetween(MX, MY - 20, ex, ey);
    windRune(g, ex, ey, 10, GALE, 0.35);
  }
  g.lineStyle(2, GALE, 0.2); g.strokeEllipse(MX, MY - 10, 520, 220);
  g.lineStyle(1, GALE, 0.15); g.strokeEllipse(MX, MY - 10, 700, 300);
  // Seals of the Tax in the floor of each span, and trapped breath.
  for (const [x, y] of [[MID, 1400], [MID, 280], [MID, 1860]] as [number, number][]) meterSigil(g, x, y, 26, GALE, 0.25);
  for (let i = 0; i < 160; i++) {
    const x = rng() * W, y = rng() * H;
    if (!inWalk(x, y)) continue;
    g.lineStyle(1, GALE, 0.2 + rng() * 0.25); g.strokeCircle(x, y, 1.5 + rng() * 3);
  }
  // Under each seat a dark apron where the councilor stands.
  for (const s of SEATS) { g.fillStyle(OBS.seam, 0.06); g.fillEllipse(s.x, s.y + 40, 180, 70); }
}

// ── Pieces ───────────────────────────────────────────────────────────

const pieces: NonNullable<AreaDef['painter']['pieces']> = [
  ...SEATS.map((s) => ({ x: s.x, y: s.y, w: 200, h: 270, draw: (g: G, rng: () => number) => councilSeat(g, s.x, s.y, 1, s.el, rng) })),
  { x: MX, y: MY, w: 560, h: 520, draw: (g: G, rng: () => number) => breathMeterBody(g, MX, MY, rng) },
  ...BANNERS.map((b) => ({ x: b.x, y: b.y, w: 40, h: BANNER_H + 20, draw: (g: G) => bannerPole(g, b.x, b.y, BANNER_H) })),
  ...OUT_SHARDS.map(([x, y, w, h, lean]) => ({ x, y, w: w + 40, h: h + 20, draw: (g: G) => shard(g, x, y, w, h, lean, 0.25) })),
  // The tallyman's desk by the dial, a ledger open on it and bottles waiting to be entered.
  {
    x: CLERK.x - 50, y: CLERK.y + 6, w: 80, h: 70,
    draw: (g: G) => {
      const x = CLERK.x - 50, y = CLERK.y + 6;
      slab(g, x, y, 54, 34);
      g.fillStyle(OBS.facet, 1); g.fillRect(x - 20, y - 40, 40, 8);
      g.lineStyle(1, GALE, 0.6); for (let i = 0; i < 4; i++) g.lineBetween(x - 16, y - 38 + i * 2, x + 16, y - 38 + i * 2);
      breathBottle(g, x - 34, y, 0.6, 0, 0.8, 1);
      breathBottle(g, x + 34, y, 0.6, 0, 0.5, 2);
    },
  },
];

const near = (view: Rect, x: number, y: number, pad: number): boolean =>
  x > view.x - pad && x < view.x + view.w + pad && y > view.y - pad && y < view.y + view.h + pad;

function animate(g: G, t: number, view: Rect, world: PainterWorld): void {
  // Cloud wisps drifting through the gaps below the bridges.
  for (let i = 0; i < 14; i++) {
    const y = view.y + ((i * 173) % Math.max(1, view.h));
    const x = view.x + (((t * (30 + (i % 4) * 12) + i * 311) % (view.w + 600)) - 300);
    if (!inWalk(x, y)) cloudWisp(g, x, y, 200 + (i % 3) * 60, 18, 0.8);
  }
  // Breath running in along the terrace's channels toward the Meter (still, once the King has fallen).
  const free = world.test({ monarch: 'obsidian-king' });
  if (!free && near(view, MX, MY, 600)) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.25 + k / 3 + i * 0.07) % 1;
        const x = MX + Math.cos(a) * 560 * (1 - ph), y = MY - 20 + Math.sin(a) * 210 * (1 - ph);
        g.fillStyle(GALE_LIT, 0.6 * Math.sin(ph * Math.PI)); g.fillCircle(x, y, 2.5);
      }
    }
  }
}

function animateOver(g: G, t: number, view: Rect, world: PainterWorld): void {
  if (near(view, MX, MY - 200, 400)) breathMeterLive(g, MX, MY, t, 1, world.test({ monarch: 'obsidian-king' }) ? 0 : 1);
  for (let i = 0; i < BANNERS.length; i++) {
    const b = BANNERS[i];
    if (near(view, b.x, b.y - BANNER_H, 160)) bannerCloth(g, b.x, b.y - BANNER_H, 80, 28, t, b.dir, i);
  }
  // Stars close overhead — big soft points drifting very slowly across the view — and wind streaks.
  for (let i = 0; i < 6; i++) {
    const x = view.x + ((i * 263 + t * 4) % view.w), y = view.y + ((i * 191) % view.h);
    const tw = 0.5 + 0.5 * Math.sin(t * (0.8 + i * 0.3) + i);
    glow(g, x, y, 10 + tw * 4, OBS.star, 0.02, 3);
    g.fillStyle(OBS.starCore, 0.25 + tw * 0.25); g.fillCircle(x, y, 1.6);
  }
  for (let i = 0; i < 10; i++) {
    const ph = (t * 0.6 + i * 0.137) % 1;
    const y = view.y + ((i * 131) % view.h);
    const x = view.x + view.w * (1.1 - ph * 1.3);
    g.lineStyle(1.2, GALE_LIT, 0.25 * Math.sin(ph * Math.PI));
    g.lineBetween(x, y, x + 60, y - 4);
  }
  motes(g, view, t, 10, CLOUD, -6, 40, 1.4, 44);
}

// ── People ───────────────────────────────────────────────────────────

const NPCS: NpcDef[] = [
  {
    id: 'pin-air-tallyman', name: 'Hollis Wynd', title: 'Tallyman of the Breath-Meter',
    look: { body: 0x9a96b4, accent: 0x1e1a30, hat: 'visor', traits: ['book', 'glasses'], size: 0.9, eye: GALE },
    at: CLERK,
    talks: [
      {
        when: { monarch: 'obsidian-king' },
        lines: [
          'The needle came off the stop this morning. First time in two hundred years. It\'s reading nothing at all.',
          'Nothing owed. I wrote it in the ledger. In ink. I am going to frame the page.',
          'The bellows have stopped. Listen. That\'s just the wind now. Nobody\'s wind. Everybody\'s.',
        ],
      },
      {
        when: { courtReady: BENCH.id },
        lines: [
          'All six seats empty. Nobody reads the dial now but me, and I\'ve stopped writing it down.',
          'The stair up is open. ...I\'ll stay. Somebody ought to be watching when the needle finally moves.',
        ],
      },
      {
        lines: [
          '...four hundred and eleven... four hundred and twelve... don\'t breathe so loud, I\'m counting.',
          'Every breath on Highspire comes up the pipes and ticks the dial. I write it down. The Councilors read it.',
          'The needle has been on the stop since before I was hired. The stop means: owed. Everyone owes.',
          'The six of them sit along the spans. You\'ll pass every seat on the way to the stair. That\'s on purpose.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'obsidian-king' }, lines: ['Nothing owed. Nothing!', '...I\'m framing the page...'] },
      { lines: ['...four hundred and twelve...', '...owed... owed...', '...don\'t breathe so loud...'] },
    ],
  },
];

// ── POIs ─────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  { kind: 'waystone', at: WAYSTONE },
  ...BENCH.elements.map((el): Poi => ({ kind: 'encounter', id: seatId(el) })),
  { kind: 'chest', id: relicId(BENCH.id), at: RELIC_AT, item: relicId(BENCH.id), orbs: 8, open: { courtReady: BENCH.id } },
  { kind: 'sign', at: { x: 940, y: 1840 }, text: 'THE GALE BENCH. Here the Breath-Tax was drafted. Keep to the spans. The air is not yours.' },
];

export const AIR_AREA: AreaDef = {
  id: BENCH.id,
  isle: 'pinnacle',
  name: BENCH.name,
  subtitle: BENCH.subtitle,
  w: W,
  h: H,
  bg: VOID,
  accent: GALE,
  weather: 'wind',
  spawn: { x: MID, y: 1900 },
  painter: { ground: paintGround, pieces, animate, animateOver },
  solids,
  exits: [
    { side: 's', to: below(BENCH), label: 'Down to the Thorn Bench' },
    {
      side: 'n', to: above(BENCH), label: 'Up to the Stone Bench', open: { courtReady: BENCH.id },
      lockedText: 'The stair is sealed by the Gale Bench. Six seats still sit.',
    },
  ],
  pois: POIS,
  npcs: NPCS,
  gloom: 0.2,
  intro: benchIntroId(BENCH.id),
};
