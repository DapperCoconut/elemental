import type { AreaDef, AreaPainter, NpcDef, Poi, Pt, Rect, Solid } from '../../../../IslesTypes';
import { type G, glow } from '../../../../art/IsleArt';
import { OBS, crackPath, seam, shard } from '../../../../art/PinnacleArt';
import { above, below, benchIntroId, relicId, seatId } from '../../spec';
import {
  alembic, alembicLive, councilSeat, fenPool, fenUnderGlass, marshLamp, marshLampLive, mistBank, plaque, quill, reeds,
  registerFace, still, stillLive,
} from './art';
import { COUNCIL_AT } from './councilors';
import { B, MIST, VEN, VEN_DEEP, VEN_LIT } from './palette';

/**
 * The Venom Bench — a fen in a glass bowl.
 *
 * The room is a great bowl of black glass with the Fangmire fen still in it: black water under a
 * glass floor, open pools where the floor has broken, glass reeds, low green mist, little stills
 * along the walls still dripping Draught into ration cups nobody comes for. An obsidian causeway
 * climbs from the south stair, swinging between the six seats (west, east, west…) to the north
 * end, where the whole wall is THE REGISTER OF THE MARKED — row on row of name-plaques, every one
 * struck through in violet — and before it, taller than a house, the alembic that brewed the Draught.
 * The stair up leaves through a cut in the Register, at its east end.
 */

const W = 1600;
const H = 2000;
const L = 120;
const R = 1480;
const NORTH = 380;
const SOUTH = 1950;
const GAP_N: [number, number] = [1100, 1280];
const STAIR_N = 1190;
const GAP_S: [number, number] = [700, 900];

const ALEMBIC: Pt = { x: 560, y: 560 };
const CHEST: Pt = { x: 900, y: 610 };
const LEDGER: Pt = { x: 1000, y: 440 };

const ORDER = ['slime', 'death', 'shadow', 'bind', 'subterfuge', 'string'];
/** Each seat sits behind its councilor, pushed toward the nearer wall. */
const SEATS = ORDER.map((el) => {
  const a = COUNCIL_AT[el];
  const west = a.x < W / 2;
  return { el, x: a.x + (west ? -40 : 40), y: a.y - 80 };
});
const POOLS: { x: number; y: number; r: number }[] = [
  { x: 580, y: 1560, r: 80 }, { x: 1050, y: 1390, r: 90 }, { x: 580, y: 1060, r: 80 }, { x: 1040, y: 880, r: 75 },
];
const STILLS: Pt[] = [{ x: 190, y: 1500 }, { x: 1410, y: 1340 }, { x: 190, y: 1080 }, { x: 1410, y: 900 }];
const LAMPS: Pt[] = [{ x: 700, y: 1760 }, { x: 900, y: 1620 }, { x: 690, y: 1360 }, { x: 910, y: 1140 }, { x: 700, y: 880 }, { x: 960, y: 700 }];
const CAUSEWAY: Pt[] = [
  { x: 800, y: 2000 }, { x: 800, y: 1820 }, { x: 640, y: 1700 }, { x: 800, y: 1560 }, { x: 960, y: 1440 }, { x: 800, y: 1300 },
  { x: 660, y: 1190 }, { x: 800, y: 1060 }, { x: 940, y: 940 }, { x: 820, y: 800 }, { x: 840, y: 650 }, { x: 1000, y: 500 },
  { x: STAIR_N, y: 400 }, { x: STAIR_N, y: 0 },
];

// ── Solids ───────────────────────────────────────────────────────────

const solids: Solid[] = [
  { kind: 'rect', x: 0, y: 0, w: L, h: H },
  { kind: 'rect', x: R, y: 0, w: W - R, h: H },
  { kind: 'rect', x: L, y: 0, w: GAP_N[0] - L, h: NORTH },
  { kind: 'rect', x: GAP_N[1], y: 0, w: R - GAP_N[1], h: NORTH },
  { kind: 'rect', x: L, y: SOUTH, w: GAP_S[0] - L, h: H - SOUTH },
  { kind: 'rect', x: GAP_S[1], y: SOUTH, w: R - GAP_S[1], h: H - SOUTH },
  // The bowl's rounded corners.
  { kind: 'circle', x: L, y: SOUTH, r: 200 }, { kind: 'circle', x: R, y: SOUTH, r: 200 },
  { kind: 'circle', x: L, y: NORTH, r: 120 }, { kind: 'circle', x: R, y: NORTH, r: 120 },
  // The alembic's furnace and catch basin.
  { kind: 'rect', x: 430, y: 520, w: 320, h: 50 },
  { kind: 'circle', x: LEDGER.x, y: LEDGER.y - 6, r: 24 },
  ...POOLS.map((p): Solid => ({ kind: 'circle', x: p.x, y: p.y, r: p.r })),
  ...STILLS.map((s): Solid => ({ kind: 'circle', x: s.x - 10, y: s.y - 8, r: 36 })),
  ...SEATS.map((s): Solid => ({ kind: 'circle', x: s.x, y: s.y - 18, r: 52 })),
];

// ── Ground ───────────────────────────────────────────────────────────

/** The causeway: dressed obsidian blocks, edge-lit, joint lines across, a green seam down its middle. */
function causeway(g: G, rng: () => number): void {
  const pass = (w: number, c: number, a: number) => {
    g.lineStyle(w, c, a); g.beginPath(); g.moveTo(CAUSEWAY[0].x, CAUSEWAY[0].y);
    for (let i = 1; i < CAUSEWAY.length; i++) g.lineTo(CAUSEWAY[i].x, CAUSEWAY[i].y);
    g.strokePath();
    g.fillStyle(c, a);
    for (const p of CAUSEWAY) g.fillCircle(p.x, p.y, w / 2);
  };
  pass(96, 0x000000, 0.35);
  pass(86, OBS.edge, 0.35);
  pass(82, OBS.glass, 1);
  pass(66, OBS.facet, 1);
  for (let i = 0; i < CAUSEWAY.length - 1; i++) {
    const a = CAUSEWAY[i], b = CAUSEWAY[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    for (let s = 20; s < len; s += 44) {
      const cx = a.x + ux * s, cy = a.y + uy * s;
      g.lineStyle(1.5, OBS.glass, 1); g.lineBetween(cx - uy * 33, cy + ux * 33, cx + uy * 33, cy - ux * 33);
      if (rng() < 0.35) { g.fillStyle(OBS.sheen, 0.35); g.fillTriangle(cx - uy * 30, cy + ux * 30, cx - uy * 10 + ux * 20, cy + ux * 10 + uy * 20, cx - uy * 30 + ux * 30, cy + ux * 30 + uy * 30); }
    }
    seam(g, crackPath({ x: a.x, y: a.y }, { x: b.x, y: b.y }, rng, 6, Math.max(2, Math.round(len / 60))), 1, 0.35, 0, VEN);
  }
}

/** The bowl's rim: shards leaning in off both walls and round the corners. */
function rim(g: G, rng: () => number): void {
  g.fillStyle(OBS.glass, 1);
  g.fillRect(0, 0, L, H); g.fillRect(R, 0, W - R, H);
  for (const [cx, cy, r] of [[L, SOUTH, 200], [R, SOUTH, 200], [L, NORTH, 120], [R, NORTH, 120]] as [number, number, number][]) g.fillCircle(cx, cy, r);
  for (let y = NORTH + 40; y < SOUTH + 40; y += 34) {
    shard(g, L - 10 + rng() * 20, y, 40 + rng() * 26, 60 + rng() * 70, 16 + rng() * 12, rng() * 0.6);
    shard(g, R + 10 - rng() * 20, y, 40 + rng() * 26, 60 + rng() * 70, -16 - rng() * 12, rng() * 0.6);
  }
  for (const [cx, cy, r, s] of [[L, SOUTH, 200, 1], [R, SOUTH, 200, -1], [L, NORTH, 120, 1], [R, NORTH, 120, -1]] as [number, number, number, number][]) {
    for (let i = 0; i < 9; i++) {
      const a = (i / 8) * Math.PI * 0.5 + (cy > H / 2 ? -Math.PI / 2 : 0);
      const x = cx + s * Math.cos(a) * r, y = cy + Math.sin(a) * r;
      shard(g, x, y + 30, 50, 70 + rng() * 50, s * 14, 0.3);
    }
  }
  // The bowl's lip line where glass floor meets glass wall: a thin violet seam all round.
  g.lineStyle(2, OBS.seam, 0.35); g.lineBetween(L, NORTH + 100, L, SOUTH - 180); g.lineBetween(R, NORTH + 100, R, SOUTH - 180);
}

/** Stairs: dressed steps across a gap, rising toward `toward` (-1 north, +1 south). */
function stairs(g: G, x0: number, x1: number, y0: number, y1: number, warmTop: boolean): void {
  const n = Math.round((y1 - y0) / 22);
  for (let i = 0; i < n; i++) {
    const y = y0 + i * 22;
    const k = i / n;
    g.fillStyle(i % 2 ? OBS.facet : OBS.sheen, 1); g.fillRect(x0, y, x1 - x0, 22);
    g.lineStyle(1.4, OBS.edge, 0.6); g.lineBetween(x0, y, x1, y);
    if (warmTop && k < 0.3) { g.fillStyle(OBS.star, 0.05 * (1 - k / 0.3)); g.fillRect(x0, y, x1 - x0, 22); }
  }
  g.lineStyle(3, OBS.seam, 0.4); g.strokeRect(x0, y0, x1 - x0, y1 - y0);
}

function paintGround(g: G, rng: () => number): void {
  g.fillStyle(0x040306, 1); g.fillRect(0, 0, W, H);
  fenUnderGlass(g, { x: L, y: NORTH, w: R - L, h: SOUTH - NORTH + 50 }, rng, 64, 1);
  // Fallen plaques drifted in the fen under the glass, near the Register.
  for (let i = 0; i < 40; i++) plaque(g, L + 60 + rng() * (R - L - 120), NORTH + 40 + rng() * 260, 34, 12, rng);
  for (const p of POOLS) fenPool(g, p.x, p.y, p.r, rng);
  causeway(g, rng);
  for (let i = 0; i < 26; i++) {
    const x = L + 40 + rng() * (R - L - 80), y = NORTH + 80 + rng() * (SOUTH - NORTH - 160);
    if (Math.abs(x - W / 2) < 200) continue;
    reeds(g, x, y, 4 + Math.floor(rng() * 6), 26 + rng() * 22, rng);
  }
  for (let y = NORTH + 120; y < SOUTH; y += 170) mistBank(g, L + 200 + rng() * (R - L - 400), y, 420, rng, 1.2);
  rim(g, rng);
  registerFace(g, L, R, 0, NORTH, rng, [GAP_N]);
  stairs(g, GAP_N[0], GAP_N[1], 0, NORTH, true);
  stairs(g, GAP_S[0], GAP_S[1], SOUTH, H, false);
  // A line of drips along the Register's foot where the names weep.
  for (let x = L + 30; x < R - 30; x += 36) {
    if (x > GAP_N[0] - 10 && x < GAP_N[1] + 10) continue;
    g.fillStyle(VEN_DEEP, 0.5); g.fillEllipse(x + rng() * 10, NORTH + 18, 10 + rng() * 10, 4);
  }
}

// ── Pieces ───────────────────────────────────────────────────────────

/** The clerk's ledger-desk at the Register's foot: the open book of the day's names, the quill laid in it. */
function ledgerDesk(g: G, rng: () => number): void {
  const { x, y } = LEDGER;
  g.fillStyle(0x000000, 0.4); g.fillEllipse(x, y + 2, 80, 18);
  shard(g, x - 18, y, 16, 58, -3, 0.2); shard(g, x + 18, y, 16, 58, 3, 0.2);
  g.fillStyle(OBS.facet, 1);
  g.fillTriangle(x - 40, y - 52, x + 40, y - 52, x + 34, y - 70);
  g.fillTriangle(x - 40, y - 52, x + 34, y - 70, x - 34, y - 70);
  // The book: two pages of black glass, names in green, the newest unstruck.
  for (const s of [-1, 1]) {
    g.fillStyle(OBS.glass, 1); g.fillRect(x + (s < 0 ? -34 : 2), y - 70, 32, 18);
    for (let i = 0; i < 4; i++) plaque(g, x + s * 18, y - 66 + i * 4, 26, 3, rng, s < 0 || i < 3 ? 1 : 0);
  }
  g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(x, y - 70, x, y - 52);
  quill(g, x + 12, y - 60, -1.0, 60, 1, 1);
}

const pieces: NonNullable<AreaPainter['pieces']> = [
  { x: ALEMBIC.x + 40, y: ALEMBIC.y, w: 420, h: 360, draw: (g, rng) => alembic(g, ALEMBIC.x, ALEMBIC.y, 1, rng) },
  { x: LEDGER.x, y: LEDGER.y, w: 110, h: 110, draw: ledgerDesk },
  ...SEATS.map((s) => ({ x: s.x, y: s.y, w: 190, h: 290, draw: (g: G, rng: () => number) => councilSeat(g, s.x, s.y, 1, s.el, rng) })),
  ...STILLS.map((s) => ({ x: s.x, y: s.y, w: 150, h: 140, draw: (g: G, rng: () => number) => still(g, s.x, s.y, 1, rng) })),
  ...LAMPS.map((l) => ({ x: l.x, y: l.y, w: 50, h: 140, draw: (g: G) => marshLamp(g, l.x, l.y, 1) })),
];

const inView = (v: Rect, x: number, y: number, pad: number): boolean => x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

function animateUnder(g: G, t: number, view: Rect): void {
  // Slow light moving under the glass: gas rising through the fen.
  for (let i = 0; i < 14; i++) {
    const x = L + ((i * 313 + t * (14 + (i % 4) * 5)) % (R - L));
    const y = NORTH + 60 + ((i * 577) % (SOUTH - NORTH - 120)) + Math.sin(t * 0.4 + i) * 30;
    if (!inView(view, x, y, 80)) continue;
    glow(g, x, y, 30 + (i % 3) * 10, VEN, 0.025 + 0.015 * Math.sin(t * 1.3 + i), 3);
  }
  for (const p of POOLS) {
    if (!inView(view, p.x, p.y, p.r + 20)) continue;
    for (let k = 0; k < 2; k++) {
      const ph = (t * 0.35 + k * 0.5 + p.x * 0.001) % 1;
      g.lineStyle(1.2, VEN, 0.35 * (1 - ph)); g.strokeEllipse(p.x + 14, p.y + 6, p.r * 1.4 * ph, p.r * 1.0 * ph);
    }
  }
  // The Register is never finished: somewhere along it, a new line is being struck.
  const cyc = t % 4;
  const bay = Math.floor(t / 4) % 5;
  const sx = L + 40 + bay * 210 + 30, sy = 60 + ((Math.floor(t / 4) * 53) % 240);
  if (inView(view, sx, sy, 120) && cyc < 1.6) {
    const k = Math.min(1, cyc / 0.8);
    seam(g, [{ x: sx, y: sy }, { x: sx + 130 * k, y: sy - 2 }], 1.4, 1 - Math.max(0, cyc - 0.8) / 0.8, 1, OBS.seam);
  }
}

function animateOver(g: G, t: number, view: Rect): void {
  if (inView(view, ALEMBIC.x, ALEMBIC.y - 160, 260)) alembicLive(g, ALEMBIC.x, ALEMBIC.y, 1, t);
  STILLS.forEach((s, i) => { if (inView(view, s.x, s.y - 50, 120)) stillLive(g, s.x, s.y, 1, t, i * 1.7); });
  LAMPS.forEach((l, i) => { if (inView(view, l.x, l.y - 100, 80)) marshLampLive(g, l.x, l.y, 1, t, i * 2.3); });
  // Low mist rolling across the floor.
  for (let i = 0; i < 9; i++) {
    const x = view.x + ((i * 271 + t * (10 + i * 2)) % (view.w + 600)) - 300;
    const y = view.y + ((i * 149) % view.h) + Math.sin(t * 0.2 + i) * 20;
    g.fillStyle(MIST, 0.035); g.fillEllipse(x, y, 380 + (i % 3) * 120, 50 + (i % 2) * 24);
  }
  // Drips off the Register's plinth.
  for (let i = 0; i < 6; i++) {
    const x = L + 100 + i * 170;
    if (x > GAP_N[0] - 20 && x < GAP_N[1] + 20) continue;
    if (!inView(view, x, NORTH, 60)) continue;
    const ph = (t * 0.6 + i * 0.37) % 1;
    g.fillStyle(VEN_LIT, 0.7 * (1 - ph)); g.fillCircle(x, NORTH - 6 + ph * 22, 1.8);
  }
}

// ── People and places ────────────────────────────────────────────────

const NPCS: NpcDef[] = [
  {
    id: `${B.id}-clerk`, name: 'Sub-Registrar Quillon', title: 'still striking names',
    look: { body: 0x1a1622, accent: 0x3a3a4a, hat: 'coif', traits: ['book', 'glasses'], size: 0.9, eye: VEN },
    at: { x: 930, y: 450 }, wander: 24,
    talks: [
      { when: { monarch: 'obsidian-king' }, lines: [
        '*He has the quill the wrong way round. He is rubbing the violet out of a name with the feather end.*',
        'Forty thousand to go. I have started with the ones whose families are still alive. Then the rest.',
      ] },
      { when: { courtReady: B.id }, lines: [
        '*The quill has stopped. He is reading the newest page as if he has never seen it before.*',
        'There is no one left on the bench to countersign. A line nobody countersigns is not a line. ...Is it?',
      ] },
      { lines: [
        '*He does not look up. The quill moves: a name, a line through it. The next name.*',
        'Unregistered persons will wait to be called. Unregistered persons are not called. Next.',
      ] },
    ],
  },
  {
    id: `${B.id}-warden`, name: 'Draught-Warden Pell', title: 'tends a still nobody drinks from',
    look: { body: 0x1a1a14, accent: 0x4a6a2a, hat: 'plague', traits: ['apron'], size: 1.0, eye: VEN },
    at: { x: 260, y: 1570 }, wander: 30,
    talks: [
      { when: { monarch: 'obsidian-king' }, lines: [
        'I tipped it all out. Every cup. The fen drank it and nothing happened. It was only ever water and spite.',
      ] },
      { when: { courtReady: B.id }, lines: [
        '*The beaked mask tilts toward the empty seats.*',
        'The cups still fill. Nobody is left to say who gets them. Take one. Take ten. I will not write it down.',
      ] },
      { lines: [
        '*A beaked glass mask turns to watch you. The still drips into a ration cup. The cup overflows.*',
        'A dose is not given. A dose is allotted. Have you been allotted? No. Then mind the mist, and pass.',
      ] },
    ],
  },
];

const POIS: Poi[] = [
  { kind: 'waystone', at: { x: 640, y: 1850 } },
  ...ORDER.map((el): Poi => ({ kind: 'encounter', id: seatId(el) })),
  { kind: 'chest', id: relicId(B.id), at: CHEST, item: relicId(B.id), orbs: 8, open: { courtReady: B.id } },
];

export const PIN_SLIME_AREA: AreaDef = {
  id: B.id,
  isle: 'pinnacle',
  name: B.name,
  subtitle: B.subtitle,
  w: W,
  h: H,
  bg: 0x040306,
  accent: VEN,
  weather: 'miasma',
  spawn: { x: 800, y: 1860 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver },
  solids,
  exits: [
    { side: 's', to: below(B), label: 'Down to the Storm Bench' },
    {
      side: 'n', to: above(B), at: STAIR_N, label: 'Up to the Lot Bench', open: { courtReady: B.id },
      lockedText: 'The cut in the Register will not open while a seat on this bench is held. Six masks are watching the stair.',
    },
  ],
  pois: POIS,
  npcs: NPCS,
  gloom: 0.26,
  intro: benchIntroId(B.id),
};

