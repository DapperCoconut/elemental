import Phaser from 'phaser';
import type { AreaDef, NpcDef, Poi, Pt, Solid } from '../../../../IslesTypes';
import { type G, glow, mulberry, shadow } from '../../../../art/IsleArt';
import { OBS, seam, shard, slab } from '../../../../art/PinnacleArt';
import { BENCHES, above, below, benchIntroId, relicId, seatId } from '../../spec';
import { EMB, type Emblem, brandFace, cooledFlows, councilSeat, deadFurnace, emberSeam, firstBrand, heatColor, ironRack, lavaFall } from './art';

/**
 * The Ember Bench — the first of the Pinnacle's ten, where Brandmark's law was written.
 *
 * A glass-foundry gone cold. You come up the south stair from Glasswater Landing into a long hall
 * whose walls are lava-falls frozen mid-pour into black glass, ember light still trapped inside
 * them. The floor is the last pour, cooled into lobes and ropy folds with hairline embers in the
 * cracks; down its middle runs the old casting channel, a frozen river.
 *
 * Six seats climb the hall, alternating west and east, a masked councilor before each. Half way up
 * the river stops at THE FIRST BRAND: the great seal-iron that stamped the law, hung from a gantry
 * over the seal-block that took every impression — still faintly red. When the six seats are
 * emptied it finally goes cold. At the head of the hall the stair up climbs through the mouth of
 * the dead furnace that fed it all. Branding irons stand in crucibles along the walls like quills
 * in inkstands — this was a writing room.
 */

const B = BENCHES.find((b) => b.isle === 'fire')!;
const W = 1600;
const H = 2000;
const L = 200;
const R = 1400;
const MID = 800;
const DOOR = 70;

const BRAND = { x: MID, y: 1124, s: 0.9 };
const FURNACE = { x: MID, y: 96, w: 380, h: 300 };

/** The six seats, south to north, alternating sides; the councilor stands before each toward the aisle. */
const SEATS: { el: string; x: number; y: number; kind: Emblem }[] = [
  { el: 'fire', x: 380, y: 1640, kind: 'flame' },
  { el: 'magma', x: 1220, y: 1430, kind: 'volcano' },
  { el: 'pressure', x: 380, y: 1220, kind: 'gauge' },
  { el: 'gunpowder', x: 1220, y: 1010, kind: 'keg' },
  { el: 'plasma', x: 380, y: 800, kind: 'corona' },
  { el: 'wax', x: 1220, y: 590, kind: 'seal' },
];
/** Where each councilor stands (read by the councilor defs). */
export const SEAT_AT: Record<string, Pt> = Object.fromEntries(SEATS.map((s) => [s.el, { x: s.x + (s.x < MID ? 96 : -96), y: s.y + 46 }]));

const FALLS: { x: number; y: number; w: number; h: number }[] = [];
for (const y of [520, 930, 1340, 1760]) {
  FALLS.push({ x: 110, y, w: 150, h: 330 }, { x: 1490, y: y - 110, w: 150, h: 330 });
}
const RACKS: Pt[] = [{ x: 290, y: 1030 }, { x: 1310, y: 1240 }, { x: 290, y: 420 }, { x: 1310, y: 400 }, { x: 290, y: 1840 }];
const LECTERN = { x: 1110, y: 1790 };

// ── Solids ───────────────────────────────────────────────────────────

const solids: Solid[] = [
  { kind: 'rect', x: 0, y: 0, w: L, h: H },
  { kind: 'rect', x: R, y: 0, w: W - R, h: H },
  { kind: 'rect', x: L, y: 0, w: MID - DOOR - L, h: 96 },
  { kind: 'rect', x: MID + DOOR, y: 0, w: R - MID - DOOR, h: 96 },
  { kind: 'rect', x: L, y: H - 40, w: MID - DOOR - L, h: 40 },
  { kind: 'rect', x: MID + DOOR, y: H - 40, w: R - MID - DOOR, h: 40 },
  // The furnace's arch, either side of its mouth.
  { kind: 'rect', x: MID - 190, y: 96, w: 110, h: 30 },
  { kind: 'rect', x: MID + 80, y: 96, w: 110, h: 30 },
  // The First Brand's block and gantry feet.
  { kind: 'rect', x: BRAND.x - 186, y: BRAND.y - 46, w: 372, h: 50 },
  { kind: 'rect', x: LECTERN.x - 34, y: LECTERN.y - 22, w: 68, h: 24 },
];
for (const s of SEATS) solids.push({ kind: 'rect', x: s.x - 70, y: s.y - 44, w: 140, h: 46 });
for (const r of RACKS) solids.push({ kind: 'circle', x: r.x, y: r.y - 20, r: 46 });

// ── Ground ───────────────────────────────────────────────────────────

/** Cracks the painter pulses — laid once, deterministically, so ground and animate agree. */
const CRACKS: Pt[][] = (() => {
  const rng = mulberry(0xe3b1);
  const out: Pt[][] = [];
  for (let i = 0; i < 70; i++) {
    const a = { x: L + 20 + rng() * (R - L - 40), y: 140 + rng() * (H - 200) };
    const ang = rng() * Math.PI * 2, len = 50 + rng() * 120;
    const pts: Pt[] = [a];
    for (let k = 1; k <= 5; k++) pts.push({ x: a.x + Math.cos(ang) * len * (k / 5) + (rng() - 0.5) * 16, y: a.y + Math.sin(ang) * len * (k / 5) * 0.6 + (rng() - 0.5) * 8 });
    out.push(pts);
  }
  return out;
})();

/** The walls behind the falls: courses of dressed black glass, seen from above. */
function wall(g: G, x: number, w: number, rng: () => number): void {
  g.fillStyle(0x07050b, 1); g.fillRect(x, 0, w, H);
  for (let y = 0; y < H; y += 46) {
    const off = (y / 46) % 2 ? 0 : 40;
    for (let bx = x - off; bx < x + w; bx += 80) {
      g.fillStyle(rng() < 0.5 ? OBS.glass : OBS.facet, 0.9); g.fillRect(bx + 2, y + 2, 76, 42);
      g.lineStyle(1, OBS.edge, 0.12); g.strokeRect(bx + 2, y + 2, 76, 42);
    }
  }
  // The inner face catches the light along its whole length.
  const edgeX = x === 0 ? w : x;
  g.lineStyle(3, OBS.sheen, 1); g.lineBetween(edgeX, 0, edgeX, H);
  g.lineStyle(1, OBS.edge, 0.8); g.lineBetween(edgeX + (x === 0 ? -1 : 1), 0, edgeX + (x === 0 ? -1 : 1), H);
}

/** Broad stair treads of black glass, `n` of them from `y` toward `dy`. */
function stair(g: G, x: number, y: number, w: number, n: number, dy: number): void {
  for (let i = 0; i < n; i++) {
    const ty = y + i * dy;
    g.fillStyle(i % 2 ? OBS.facet : OBS.glass, 1); g.fillRect(x - w / 2, ty, w, Math.abs(dy) - 2);
    g.fillStyle(OBS.sheen, 0.8); g.fillRect(x - w / 2, ty + (dy > 0 ? 0 : Math.abs(dy) - 6), w, 4);
    g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(x - w / 2, ty, x + w / 2, ty);
  }
}

function paintGround(g: G, rng: () => number): void {
  g.fillStyle(0x050308, 1); g.fillRect(0, 0, W, H);
  cooledFlows(g, L, 96, R - L, H - 136, rng, 1.1);
  // The casting channel: a frozen river down the aisle, ember deep inside it.
  const river: Pt[] = [];
  for (let y = 200; y <= H - 40; y += 60) river.push({ x: MID + Math.sin(y / 210) * 70, y });
  for (let i = 1; i < river.length; i++) {
    const a = river[i - 1], b = river[i];
    g.lineStyle(150, OBS.glass, 1); g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(110, OBS.facet, 0.7); g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(40, EMB.deep, 0.12); g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(10, EMB.ember, 0.1); g.lineBetween(a.x, a.y, b.x, b.y);
  }
  for (const p of river) {
    g.fillStyle(OBS.glass, 1); g.fillCircle(p.x, p.y, 75);
    g.fillStyle(OBS.facet, 0.55); g.fillCircle(p.x, p.y, 55);
    // Ropy folds across the river, bowed downstream (south).
    for (let k = 0; k < 3; k++) {
      g.lineStyle(1.4, OBS.sheen, 0.45);
      g.beginPath(); g.arc(p.x, p.y - 30 - k * 10, 60 - k * 8, Math.PI * 0.2, Math.PI * 0.8, false); g.strokePath();
    }
  }
  g.lineStyle(2, OBS.edge, 0.35);
  for (const s of [-1, 1]) {
    g.beginPath();
    river.forEach((p, i) => { if (i === 0) g.moveTo(p.x + s * 76, p.y); else g.lineTo(p.x + s * 76, p.y); });
    g.strokePath();
  }
  for (const c of CRACKS) emberSeam(g, c, 0.8, 0.3);
  wall(g, 0, L, rng);
  wall(g, R, W - R, rng);
  // The north stair up through the furnace mouth; the south stair down to the landing.
  stair(g, MID, 96, 2 * DOOR + 20, 6, 22);
  stair(g, MID, H - 40, 2 * DOOR + 20, 3, -24);
  // Plinth shadows and scorched rings where the seats stand.
  for (const s of SEATS) { g.fillStyle(0x000000, 0.3); g.fillEllipse(s.x, s.y + 6, 220, 60); }
  // Old brands struck into the floor round the block — test strikes, a century of them.
  for (let i = 0; i < 22; i++) {
    const a = rng() * Math.PI * 2, d = 230 + rng() * 140;
    brandFace(g, BRAND.x + Math.cos(a) * d, BRAND.y + Math.sin(a) * d * 0.55, 14 + rng() * 8, 0.12, 0.45);
  }
}

// ── Pieces ───────────────────────────────────────────────────────────

const FALL_EMBERS: Pt[][] = FALLS.map((f, i) => {
  const rng = mulberry(0x7a11 + i * 31);
  return Array.from({ length: 7 }, () => ({ x: f.x + (rng() - 0.5) * f.w * 0.7, y: f.y - f.h + 40 + rng() * (f.h - 70) }));
});

/** The clerk's lectern: a black-glass desk under a sloped ledger, files stacked beside it. */
function lectern(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 90, 22, 0.4);
  slab(g, x, y, 64, 18);
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 8, y - 70, 16, 54);
  g.fillStyle(OBS.facet, 1); g.fillRect(x, y - 70, 8, 54);
  g.fillStyle(OBS.glass, 1); g.fillPoints([new Phaser.Geom.Point(x - 40, y - 74), new Phaser.Geom.Point(x + 40, y - 74), new Phaser.Geom.Point(x + 34, y - 96), new Phaser.Geom.Point(x - 34, y - 96)], true);
  g.lineStyle(1.2, OBS.edge, 0.6); g.strokeRect(x - 40, y - 96, 80, 22);
  // The open register: two vellum pages ruled with names, a quill of iron.
  g.fillStyle(EMB.vellum, 0.92); g.fillRect(x - 34, y - 94, 33, 18); g.fillRect(x + 1, y - 94, 33, 18);
  g.lineStyle(1, 0x5a4a3a, 0.55);
  for (let i = 0; i < 5; i++) { g.lineBetween(x - 31, y - 91 + i * 3.4, x - 4 - rng() * 8, y - 91 + i * 3.4); g.lineBetween(x + 4, y - 91 + i * 3.4, x + 31 - rng() * 8, y - 91 + i * 3.4); }
  g.lineStyle(1.5, EMB.wax, 0.8); g.lineBetween(x + 6, y - 86, x + 26, y - 86);
  g.lineStyle(2, OBS.sheen, 1); g.lineBetween(x + 30, y - 92, x + 46, y - 118);
  // Files stacked on the floor beside it, tied in red tape.
  for (let i = 0; i < 4; i++) {
    g.fillStyle(i % 2 ? EMB.vellum : 0xc8b890, 1); g.fillRect(x + 42, y - 8 - i * 7, 34, 7);
    g.lineStyle(1, 0x5a4a3a, 0.5); g.strokeRect(x + 42, y - 8 - i * 7, 34, 7);
  }
  g.lineStyle(1.5, EMB.wax, 0.9); g.lineBetween(x + 59, y - 36, x + 59, y);
}


const pieces: NonNullable<AreaDef['painter']['pieces']> = [
  ...FALLS.map((f) => ({ x: f.x, y: f.y, w: f.w + 60, h: f.h + 30, draw: (g: G, rng: () => number) => { lavaFall(g, f.x, f.y, f.w, f.h, rng); } })),
  ...SEATS.map((s) => ({ x: s.x, y: s.y, w: 180, h: 260, draw: (g: G, rng: () => number) => councilSeat(g, s.x, s.y, s.kind, B.color, rng, 1), when: { not: { encounter: seatId(s.el) } } })),
  ...SEATS.map((s) => ({ x: s.x, y: s.y, w: 180, h: 260, draw: (g: G, rng: () => number) => councilSeat(g, s.x, s.y, s.kind, B.color, rng, 0), when: { encounter: seatId(s.el) } })),
  ...RACKS.map((r, i) => ({ x: r.x, y: r.y, w: 140, h: 220, draw: (g: G, rng: () => number) => ironRack(g, r.x, r.y, 1, rng, i === 2 ? 0.55 : 0.3) })),
  { x: BRAND.x, y: BRAND.y, w: 440, h: 420, draw: (g: G, rng: () => number) => firstBrand(g, BRAND.x, BRAND.y, BRAND.s, 0.62, rng), when: { not: { courtReady: B.id } } },
  { x: BRAND.x, y: BRAND.y, w: 440, h: 420, draw: (g: G, rng: () => number) => firstBrand(g, BRAND.x, BRAND.y, BRAND.s, 0.08, rng), when: { courtReady: B.id } },
  { x: FURNACE.x, y: FURNACE.y + 30, w: FURNACE.w + 80, h: FURNACE.h + 40, draw: (g: G, rng: () => number) => deadFurnace(g, FURNACE.x, FURNACE.y + 30, FURNACE.w, FURNACE.h, rng) },
  { x: LECTERN.x, y: LECTERN.y, w: 140, h: 140, draw: (g: G, rng: () => number) => lectern(g, LECTERN.x, LECTERN.y, rng) },
  // Two shard sentinels flanking the furnace stair and two at the foot of the south stair.
  ...[[MID - 230, 220], [MID + 230, 220], [MID - 140, H - 60], [MID + 140, H - 60]].map(([x, y], i) => ({
    x, y, w: 80, h: 220,
    draw: (g: G, rng: () => number) => {
      shadow(g, x, y + 2, 70, 18, 0.4);
      shard(g, x - 14, y, 40, 150 + (i % 2) * 20, -6, 0.2);
      shard(g, x + 12, y, 46, 190 - (i % 2) * 24, 8, 0.3);
      seam(g, [{ x: x + 10, y: y - 20 }, { x: x + 16, y: y - 70 }, { x: x + 12, y: y - 120 }], 1.2, 0.8, 0, i < 2 ? OBS.seam : EMB.ember);
      void rng;
    },
  })),
];

// ── Animation ────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: { x: number; y: number; w: number; h: number }, m = 120) => x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

const painter: AreaDef['painter'] = {
  ground: paintGround,
  pieces,
  animate(g, t, view, world) {
    // The floor's cracks breathe, each on its own clock.
    CRACKS.forEach((c, i) => {
      if (!inView(c[0].x, c[0].y, view, 160)) return;
      const k = 0.5 + 0.5 * Math.sin(t * (0.5 + (i % 5) * 0.13) + i * 1.7);
      if (k > 0.55) emberSeam(g, c, 0.8, (k - 0.55) * 0.9, k);
    });
    // Embers trapped in the frozen falls drift slowly up inside the glass.
    FALLS.forEach((f, i) => {
      if (!inView(f.x, f.y - f.h / 2, view, 200)) return;
      for (const [j, e] of FALL_EMBERS[i].entries()) {
        const k = 0.5 + 0.5 * Math.sin(t * 0.8 + j * 2.1 + i);
        const y = e.y - ((t * 4 + j * 13) % 26);
        g.fillStyle(EMB.ember, 0.06 + k * 0.08); g.fillCircle(e.x, y, 8);
        g.fillStyle(heatColor(0.6 + k * 0.35), 0.5 + k * 0.4); g.fillCircle(e.x, y, 1.6 + k);
      }
    });
    // The First Brand: red heat breathing under its face, drips falling onto the block — until
    // the six seats are empty and it goes cold.
    if (inView(BRAND.x, BRAND.y - 160, view, 300)) {
      const hot = !world.test({ courtReady: B.id });
      const s = BRAND.s;
      const faceY = BRAND.y - 150 * s + 14 * s;
      const k = 0.5 + 0.5 * Math.sin(t * 1.1);
      if (hot) {
        glow(g, BRAND.x, faceY + 30, 110 * s, EMB.ember, 0.04 + k * 0.03, 4);
        g.fillStyle(EMB.ember, 0.12 + k * 0.08); g.fillEllipse(BRAND.x, BRAND.y - 62 * s, 170 * s, 34 * s);
        for (let i = 0; i < 3; i++) {
          const ph = ((t * 0.45) + i / 3) % 1;
          const x = BRAND.x - 50 * s + i * 50 * s;
          g.fillStyle(EMB.hot, 1 - ph); g.fillCircle(x, faceY + 20 * s + ph * 70 * s, 2.5);
        }
      } else {
        g.fillStyle(OBS.seam, 0.06 + k * 0.04); g.fillEllipse(BRAND.x, BRAND.y - 62 * s, 170 * s, 34 * s);
      }
    }
    // Each occupied seat's inlay pulses; an emptied one is dark.
    for (const s of SEATS) {
      if (!inView(s.x, s.y - 150, view) || world.test({ encounter: seatId(s.el) })) continue;
      const k = 0.5 + 0.5 * Math.sin(t * 1.4 + s.y * 0.01);
      g.fillStyle(B.color, 0.05 + k * 0.07); g.fillCircle(s.x, s.y - 150, 26);
    }
  },
  animateOver(g, t, view, world) {
    // Heat shimmer rising off the Brand while it is still hot.
    if (world.test({ courtReady: B.id }) || !inView(BRAND.x, BRAND.y - 200, view, 300)) return;
    for (let i = 0; i < 10; i++) {
      const ph = ((t * 0.22) + i * 0.1) % 1;
      const x = BRAND.x + Math.sin(i * 2.4 + t * 0.7) * 120;
      const y = BRAND.y - 120 - ph * 300;
      g.fillStyle(EMB.hot, 0.5 * (1 - ph)); g.fillCircle(x, y, 1.6);
    }
  },
};

// ── People and places ────────────────────────────────────────────────

const npcs: NpcDef[] = [
  {
    id: 'pin-fire-clerk', name: 'Ordwin Sallow', title: 'Clerk of the Ember Bench',
    look: { body: 0x2a2236, accent: EMB.wax, hat: 'visor', traits: ['glasses', 'book'], size: 0.92, eye: 0xc9b0ff },
    at: { x: LECTERN.x - 56, y: LECTERN.y + 20 },
    talks: [
      { when: { monarch: 'obsidian-king' }, lines: [
        'I have closed the register. Every name in it. I wrote "struck through — by order of nobody" against each.',
        'It is the first entry I ever made of my own accord. My hand shook. I should like to make another.',
      ] },
      { when: { courtReady: B.id }, lines: [
        'Six seats vacant. I have filed it under "vacancies, unforeseen". There was no such heading. I made one.',
        'The stair is open. The Tide Bench is above. Mind the water — they never let us dry the minutes up there.',
      ] },
      { lines: [
        'Name? No — don\'t. I have filed eleven thousand names here. Every one a brand. Don\'t give me yours.',
        'They sit in order of the law: Embers, Caldera, Gauge, Powder, Corona, Seal. You will want them in order.',
        'Or not. Nobody has ever wanted them out of order. I should be interested to see the paperwork.',
      ] },
    ],
  },
  {
    id: 'pin-fire-stoker', name: 'Hettie Clinker', title: 'Stoker, retired by the fire',
    look: { body: 0x3a2a24, accent: EMB.ember, hat: 'coif', traits: ['apron', 'tool'], size: 1.05, eye: 0xffb35a },
    at: { x: 430, y: 470 },
    talks: [
      { when: { monarch: 'obsidian-king' }, lines: [
        'Felt it go out, up top. Like a furnace door shutting a long way off. First time this hall\'s been quiet.',
        'Sixty years I fed that fire. I think I\'ll go and sit somewhere it\'s cold, and see if I like it.',
      ] },
      { when: { courtReady: B.id }, lines: [
        'Brand\'s gone dark. Look at it. Hanging there like any old bit of iron.',
        'I fed the furnace that heated it. Every morning. Never once thought to let it go out.',
      ] },
      { lines: [
        'That furnace fed the First Brand for longer than Brandmark had a name. I was its last stoker.',
        'Then the law was written and the furnace wasn\'t wanted. The Brand stays hot by itself now. Out of spite.',
        'Go on, then. Up the hall. They\'re watching you already — the masks always are.',
      ] },
    ],
  },
];

const pois: Poi[] = [
  { kind: 'waystone', at: { x: 620, y: 1870 } },
  ...SEATS.map((s): Poi => ({ kind: 'encounter', id: seatId(s.el) })),
  { kind: 'chest', id: relicId(B.id), at: { x: MID, y: BRAND.y + 70 }, item: relicId(B.id), orbs: 8, open: { courtReady: B.id } },
  { kind: 'sign', at: { x: 980, y: 1880 }, text: 'THE EMBER BENCH. Here was written the Brand: that every hearth be kept, and every keeper marked.' },
];

export const BENCH_FIRE_AREA: AreaDef = {
  id: B.id,
  isle: 'pinnacle',
  name: B.name,
  subtitle: B.subtitle,
  w: W,
  h: H,
  bg: 0x050308,
  accent: B.color,
  weather: 'embers',
  spawn: { x: MID, y: 1880 },
  painter,
  solids,
  exits: [
    { side: 's', to: below(B), label: 'Down to Glasswater Landing' },
    {
      side: 'n', to: above(B), label: 'Up to the Tide Bench', open: { courtReady: B.id },
      lockedText: 'The stair through the dead furnace is sealed in black glass. Six seats stand between you and it.',
    },
  ],
  pois,
  npcs,
  gloom: 0.26,
  intro: benchIntroId(B.id),
};
