import type { AreaDef, NpcDef, Poi, Pt, Solid } from '../../../../IslesTypes';
import type { G } from '../../../../art/IsleArt';
import { OBS, crackPath, glassFloor, seam, shard, slab } from '../../../../art/PinnacleArt';
import { BENCHES, above, benchIntroId, below, relicId, seatId } from '../../spec';
import {
  BRASS, COPPER, COPPER_DARK, COPPER_LIT, VOLT, type SeatGlyph, bolt, cable, glassArcs, leydenJar, meterDial, seatChair, sparks,
} from './art';
import { SEAT_SPOTS } from './councilors';

/**
 * The Storm Bench — the spire's conductor, where the Draw was written.
 *
 * A long hall of black glass climbed south → north. Both walls are panes with arcs crawling inside
 * them, and ranks of Leyden jars stand along their feet, arcing to one another. Cables as thick as
 * trees rise out of the floor into the dark overhead. Halfway up stands THE METER — the dial that
 * counted the Draw, the size of a house front, its needle pinned at the stop and still arcing
 * against it; when all six seats are empty the needle has fallen back to zero. The six councilors'
 * chairs stand in alcoves, alternating west and east, so the climb passes every one.
 */

const B = BENCHES.find((x) => x.isle === 'electricity')!;
const W = 1600;
const H = 2000;
const L = 170;
const R = 1430;
const MID = 800;
const GAP = 70;
const METER: Pt = { x: MID, y: 1060 };
const METER_R = 230;

/** Cable trunks rising out of the floor like trees. */
const TRUNKS: Pt[] = [{ x: 620, y: 1440 }, { x: 990, y: 1660 }, { x: 990, y: 700 }, { x: 620, y: 480 }];
/** Jar ranks along the foot of each wall. */
const JAR_YS: number[] = [];
for (let y = 260; y <= 1820; y += 150) JAR_YS.push(y);
const JARS: Pt[] = [...JAR_YS.map((y) => ({ x: L + 50, y })), ...JAR_YS.map((y) => ({ x: R - 50, y: y + 70 }))];

/** Floor cables: from the south stair up to the Meter, and from the Meter to the north stair. */
const FLOOR_CABLES: Pt[][] = [
  [{ x: 760, y: 2010 }, { x: 700, y: 1700 }, { x: 740, y: 1380 }, { x: 700, y: 1120 }],
  [{ x: 850, y: 2010 }, { x: 900, y: 1760 }, { x: 860, y: 1400 }, { x: 900, y: 1120 }],
  [{ x: 780, y: 1000 }, { x: 740, y: 700 }, { x: 790, y: 380 }, { x: 770, y: -10 }],
];

const SEAT_KINDS: SeatGlyph[] = ['electricity', 'technology', 'magnet', 'radiation', 'rubber', 'quantum'];

// ── Solids ───────────────────────────────────────────────────────────

const solids: Solid[] = [
  { kind: 'rect', x: 0, y: 0, w: L, h: H },
  { kind: 'rect', x: R, y: 0, w: W - R, h: H },
  { kind: 'rect', x: L, y: 0, w: MID - GAP - L, h: 110 },
  { kind: 'rect', x: MID + GAP, y: 0, w: R - MID - GAP, h: 110 },
  { kind: 'rect', x: L, y: H - 70, w: MID - GAP - L, h: 70 },
  { kind: 'rect', x: MID + GAP, y: H - 70, w: R - MID - GAP, h: 70 },
  // The Meter's housing.
  { kind: 'rect', x: METER.x - METER_R - 30, y: METER.y - 50, w: (METER_R + 30) * 2, h: 70 },
  ...TRUNKS.map((t): Solid => ({ kind: 'circle', x: t.x, y: t.y, r: 26 })),
  ...JARS.map((j): Solid => ({ kind: 'circle', x: j.x, y: j.y - 8, r: 20 })),
];
// Seat plinths, just behind (north of) each councilor.
for (const el of SEAT_KINDS) {
  const s = SEAT_SPOTS[el];
  solids.push({ kind: 'rect', x: s.x - 54, y: s.y - 80, w: 108, h: 42 });
}

// ── Ground ───────────────────────────────────────────────────────────

function paintGround(g: G, rng: () => number): void {
  g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, W, H);
  glassFloor(g, L, 0, R - L, H, 64, rng);
  // Arcs frozen in the floor glass.
  for (let i = 0; i < 46; i++) {
    const x = L + 30 + rng() * (R - L - 60), y = 120 + rng() * (H - 200);
    const a = rng() * Math.PI * 2, l = 40 + rng() * 120;
    bolt(g, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, i * 5.3 + 1, 1, VOLT, 0.14, 1);
  }
  for (let i = 0; i < 22; i++) {
    const a = { x: L + rng() * (R - L), y: rng() * H };
    seam(g, crackPath(a, { x: a.x + (rng() - 0.5) * 300, y: a.y + (rng() - 0.5) * 200 }, rng, 12, 6), 1.2, 0.5);
  }
  // A copper runner inlaid up the middle of the hall, rivetted.
  for (const dx of [-120, 120]) {
    g.lineStyle(5, COPPER_DARK, 1); g.lineBetween(MID + dx, 110, MID + dx, H - 70);
    g.lineStyle(1.5, COPPER_LIT, 0.6); g.lineBetween(MID + dx - 1, 110, MID + dx - 1, H - 70);
    for (let y = 140; y < H - 70; y += 80) { g.fillStyle(BRASS, 0.9); g.fillCircle(MID + dx, y, 2.4); }
  }
  // Floor cables, the colour of the dark, running to and from the Meter.
  for (const c of FLOOR_CABLES) cable(g, c, 30);
  // Wall bases: a dark skirt so the shards stand in something.
  g.fillStyle(OBS.glass, 1); g.fillRect(0, 0, L, H); g.fillRect(R, 0, W - R, H);
  g.fillStyle(OBS.sheen, 1); g.fillRect(L - 4, 0, 4, H); g.fillRect(R, 0, 4, H);
  // The stairs: south down, north up — broad steps of dressed glass.
  for (let i = 0; i < 5; i++) {
    const w = 2 * GAP + 80 - i * 8;
    g.fillStyle(i % 2 ? OBS.facet : OBS.glass, 1); g.fillRect(MID - w / 2, H - 70 + i * 14, w, 14);
    g.lineStyle(1, OBS.edge, 0.5); g.lineBetween(MID - w / 2, H - 70 + i * 14, MID + w / 2, H - 70 + i * 14);
    g.fillStyle(i % 2 ? OBS.facet : OBS.glass, 1); g.fillRect(MID - w / 2, 110 - (i + 1) * 22, w, 22);
    g.lineStyle(1, OBS.edge, 0.5); g.lineBetween(MID - w / 2, 110 - (i + 1) * 22, MID + w / 2, 110 - (i + 1) * 22);
  }
  // A ring of scorched glass round the Meter's foot, where a hundred years of sparks fell.
  g.fillStyle(VOLT, 0.05); g.fillEllipse(METER.x, METER.y + 30, METER_R * 3, 160);
  for (let i = 0; i < 60; i++) {
    const a = rng() * Math.PI * 2, d = METER_R * (0.6 + rng() * 0.9);
    g.fillStyle(VOLT, 0.2 + rng() * 0.3); g.fillCircle(METER.x + Math.cos(a) * d, METER.y + 40 + Math.sin(a) * d * 0.3, 1 + rng() * 1.5);
  }
}

// ── Pieces ───────────────────────────────────────────────────────────

type Piece = NonNullable<AreaDef['painter']['pieces']>[number];
const pieces: Piece[] = [];

/** The Meter itself: housing, the cables it drinks from, the dial — pinned, or fallen. */
const meterPiece = (needle: number, when: Piece['when']): Piece => ({
  x: METER.x, y: METER.y + 20, w: 760, h: 980, when,
  draw(g, rng) {
    // Cables climbing out of the back of the housing into the dark — trees of them.
    for (const dx of [-0.8, -0.45, 0.45, 0.8]) {
      cable(g, [{ x: METER.x + dx * METER_R, y: METER.y - 20 }, { x: METER.x + dx * METER_R * 1.15, y: METER.y - METER_R * 1.4 }, { x: METER.x + dx * METER_R * 0.7, y: METER.y - 940 }], 34);
    }
    slab(g, METER.x, METER.y + 20, (METER_R + 50) * 2, 34, rng, 3);
    slab(g, METER.x, METER.y - 10, (METER_R + 24) * 2, 18);
    meterDial(g, METER.x, METER.y - 28, METER_R, needle, 2.1, { mask: true, tremble: 0 });
    // Brass plate under the dial: the Draw's ledger in ruled lines.
    g.fillStyle(BRASS, 0.9); g.fillRect(METER.x - 90, METER.y + 0, 180, 14);
    g.lineStyle(1, 0x5a4418, 1);
    for (let i = 0; i < 6; i++) g.lineBetween(METER.x - 80 + i * 32, METER.y + 3, METER.x - 60 + i * 32, METER.y + 3);
  },
});
pieces.push(meterPiece(1, { not: { courtReady: B.id } }), meterPiece(0, { courtReady: B.id }));

for (const t of TRUNKS) {
  pieces.push({
    x: t.x, y: t.y + 10, w: 120, h: 1000,
    draw(g) {
      g.fillStyle(0x000000, 0.45); g.fillEllipse(t.x + 6, t.y + 10, 100, 30);
      // Roots: the cable splits into three where it goes into the floor.
      for (const dx of [-38, 0, 36]) cable(g, [{ x: t.x + dx, y: t.y + 8 }, { x: t.x + dx * 0.4, y: t.y - 30 }], 18);
      cable(g, [{ x: t.x, y: t.y - 10 }, { x: t.x + 12, y: t.y - 500 }, { x: t.x - 8, y: t.y - 990 }], 46);
      g.fillStyle(COPPER_DARK, 1); g.fillRect(t.x - 30, t.y - 70, 60, 12);
      g.fillStyle(COPPER, 1); g.fillRect(t.x - 30, t.y - 70, 60, 4);
    },
  });
}

for (const j of JARS) {
  pieces.push({
    x: j.x, y: j.y, w: 80, h: 160,
    draw(g, rng) {
      slab(g, j.x, j.y + 6, 62, 12);
      leydenJar(g, j.x, j.y - 4, 0.85, 0.3 + rng() * 0.5, rng() * 10, VOLT);
    },
  });
}

SEAT_KINDS.forEach((el) => {
  const s = SEAT_SPOTS[el];
  pieces.push({ x: s.x, y: s.y - 40, w: 160, h: 340, draw(g, rng) { seatChair(g, s.x, s.y - 40, 0.82, el, rng); } });
});

// The two walls: panes of black glass standing along each side.
for (const side of [L, R]) {
  for (let y = 140; y < H; y += 120) {
    const yy = y;
    pieces.push({
      x: side, y: yy, w: 160, h: 320,
      draw(g, rng) { shard(g, side + (side === L ? -30 : 30), yy, 110 + rng() * 30, 220 + rng() * 90, (side === L ? 1 : -1) * (6 + rng() * 10), 0.2 + rng() * 0.3); },
    });
  }
}
// The north wall either side of the stair.
for (let x = L; x <= R; x += 90) {
  if (Math.abs(x - MID) < GAP + 40) continue;
  const xx = x;
  pieces.push({ x: xx, y: 110, w: 120, h: 300, draw(g, rng) { shard(g, xx, 110, 100 + rng() * 30, 180 + rng() * 100, (rng() - 0.5) * 20, rng() * 0.4); } });
}

// ── Per frame ────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: { x: number; y: number; w: number; h: number }, pad = 200): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

const painter: AreaDef['painter'] = {
  ground: paintGround,
  pieces,
  animate(g, t, view) {
    // Current running along the floor cables.
    for (let i = 0; i < FLOOR_CABLES.length; i++) {
      const c = FLOOR_CABLES[i];
      if (!c.some((p) => inView(p.x, p.y, view, 400))) continue;
      cable(g, c, 0.01, t * 1.3 + i * 0.7);
    }
    // Arcs crawling inside the wall panes.
    for (const side of [L - 90, R + 10]) {
      for (let y = 140; y < H; y += 240) {
        if (!inView(side, y, view)) continue;
        glassArcs(g, side, y - 200, 80, 200, t, y + side, 1);
      }
    }
  },
  animateOver(g, t, view, world) {
    // Neighbouring jars arc to one another on a slow ripple.
    for (let i = 0; i < JARS.length - 1; i++) {
      const a = JARS[i], b = JARS[i + 1];
      if (Math.abs(a.x - b.x) > 10 || !inView(a.x, a.y, view)) continue;
      const ph = (t * 0.6 + i * 0.37) % 1;
      if (ph > 0.12) continue;
      const s = 0.85;
      bolt(g, a.x, a.y - 4 - 118 * s, b.x, b.y - 4 - 118 * s, Math.floor(t * 20) + i, 1.4, VOLT, 0.8, 1);
    }
    // The pinned needle arcs against the stop; the Meter's crest throws a bolt into the ceiling now and then.
    if (!world.test({ courtReady: B.id }) && inView(METER.x, METER.y - 200, view, 300)) {
      const a = Math.PI * 1.92;
      const tx = METER.x + Math.cos(a) * METER_R * 0.9, ty = METER.y - 28 + Math.sin(a) * METER_R * 0.9;
      sparks(g, tx, ty, 18 + Math.sin(t * 17) * 4, Math.floor(t * 14), VOLT, 0.8);
      if ((t * 0.5) % 1 < 0.06) bolt(g, METER.x, METER.y - 28 - METER_R * 1.2, METER.x + Math.sin(t) * 120, view.y - 20, Math.floor(t * 25), 2.4, VOLT, 0.9, 2);
    }
  },
};

// ── People & places ──────────────────────────────────────────────────

const NPCS: NpcDef[] = [
  {
    id: 'pin-storm-tallyman', name: 'Tallyman Quill', title: 'Meter-reader, still reading',
    look: { body: 0x2a2436, accent: 0xffe14a, hat: 'visor', traits: ['book', 'glasses'], size: 0.95, eye: 0xffe14a },
    at: { x: 1010, y: 1150 },
    talks: [
      { when: { monarch: 'obsidian-king' }, lines: [
        'I went up and looked at the Meter this morning. It reads zero. I have written "zero" in the ledger.',
        'It is the first honest figure in the book. I underlined it twice.',
      ] },
      { when: { courtReady: B.id }, lines: [
        'The needle fell. All at once, with a sound like a bell. I did not know it could go the other way.',
        'I keep chalking the quota out of habit. There is no quota. My hand does not know yet.',
      ] },
      { lines: [
        'Pinned. Still pinned. Every house on Voltreach, every night, and it never once came off the stop.',
        'I read it every hour. That was my whole post. Read the Meter. Write the figure. The figure is always "more".',
      ] },
    ],
  },
  {
    id: 'pin-storm-crankhand', name: 'Earthed Crank-hand', title: 'Taken up the Coil',
    look: { body: 0x3a3040, accent: 0xc8743a, hat: 'cap', traits: ['bandage', 'tool'], size: 1.05, eye: 0xd8d0ff },
    at: { x: 1250, y: 1800 },
    talks: [
      { when: { monarch: 'obsidian-king' }, lines: [
        'Wren lit the street-lamps on Voltreach. All of them, by hand. I could see them from up here.',
        'I am going home tomorrow. I will not turn a handle on the way.',
      ] },
      { when: { courtReady: B.id }, lines: [
        'My arm stopped. First time in nine years. It just... stopped turning. The handle is still warm.',
      ] },
      { lines: [
        '...forty-one, forty-two... switched off three times... forty-three... they brought me up here...',
        '...do not stop me, I am behind... the Meter is never satisfied... forty-four...',
      ] },
    ],
  },
];

const POIS: Poi[] = [
  { kind: 'waystone', at: { x: 640, y: 1830 } },
  { kind: 'chest', id: relicId(B.id), at: { x: METER.x, y: METER.y + 90 }, item: relicId(B.id), orbs: 8, open: { courtReady: B.id } },
  ...SEAT_KINDS.map((el): Poi => ({ kind: 'encounter', id: seatId(el) })),
];

export const STORM_AREA: AreaDef = {
  id: B.id,
  isle: 'pinnacle',
  name: B.name,
  subtitle: B.subtitle,
  w: W,
  h: H,
  bg: OBS.sky,
  accent: VOLT,
  weather: 'static',
  spawn: { x: MID, y: 1860 },
  painter,
  solids,
  exits: [
    { side: 's', to: below(B), label: 'Down to the Stone Bench' },
    { side: 'n', to: above(B), label: 'Up to the Venom Bench', open: { courtReady: B.id },
      lockedText: 'The stair is live. Six seats still hold the circuit closed — unseat every councilor to break it.' },
  ],
  pois: POIS,
  npcs: NPCS,
  gloom: 0.28,
  intro: benchIntroId(B.id),
};
