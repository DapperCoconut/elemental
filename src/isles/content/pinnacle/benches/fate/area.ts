import type { AreaDef, NpcDef, PainterWorld, Poi, Rect, Solid } from '../../../../IslesTypes';
import { type G, motes } from '../../../../art/IsleArt';
import { OBS, crackPath, glassFloor, seam, shard, slab } from '../../../../art/PinnacleArt';
import { BENCHES, above, below, benchIntroId, relicId, seatId } from '../../spec';
import { type Emblem, type PocketState, chipStack, councilSeat, drum, fusedDie, glyphs, hourglass, warTable, wheelBowl, wheelSpin } from './art';
import { SEAT_AT } from './councilors';
import { FELT, FELT_DEEP, FELT_GLOW, FELT_LIT, IVORY, ROUGE, ROUGE_DEEP } from './palette';

/**
 * The Lot Bench — the eighth bench of the Obsidian Pinnacle, where Lotterhaven's Lot was written.
 *
 * A court laid out as a gaming floor, remembered in black glass. You come up the south stair onto
 * a betting layout sunk under the glass (red and black squares, numbered), walk a felt runner up
 * the middle, and the whole floor opens round **the Wheel of Sixty** — a roulette wheel set into
 * the floor, sixty pockets, one for every seat on the spire. It turns. A ball runs its track and
 * drops; the pockets of emptied seats burn with starlight (their councilors' shells cracked). Over
 * it hangs the great hourglass on a chain out of the dark. House-sized dice are fused into both
 * walls, pips burning felt-green; war-tables stand between the seats with the isle's map under
 * glass; at the head of the room the old drum of the Draw stands idle, and the stair goes on up.
 *
 * Six seats climb the room in pairs: the Draw and the Purse by the stair, the Hour and the Pledge
 * either side of the Wheel, the Sealed Mind and the Levy under the north wall.
 */

const B = BENCHES.find((b) => b.isle === 'fate')!;
const W = 1600, H = 2000;
const WL = 150, WR = 1450;
const NORTH = 110, SOUTH = 1930;
const GAP_L = 730, GAP_R = 870;
const MID = 800;
const WHEEL = { x: 800, y: 1060, R: 300 };
const GLASS_Y = 640;
const DRUM = { x: 560, y: 290 };

const EMBLEM: Record<string, Emblem> = { fate: 'die', fortune: 'chip', sand: 'hourglass', memory: 'ticket', psychic: 'eye', conquest: 'flag' };
const DICE: { x: number; y: number; dir: 1 | -1; s: number; f: [number, number, number] }[] = [
  { x: 170, y: 380, dir: 1, s: 150, f: [5, 3, 1] },
  { x: 170, y: 860, dir: 1, s: 170, f: [6, 2, 4] },
  { x: 170, y: 1400, dir: 1, s: 150, f: [3, 6, 5] },
  { x: 170, y: 1820, dir: 1, s: 130, f: [1, 4, 2] },
  { x: 1430, y: 340, dir: -1, s: 160, f: [4, 1, 3] },
  { x: 1430, y: 820, dir: -1, s: 150, f: [2, 5, 6] },
  { x: 1430, y: 1380, dir: -1, s: 170, f: [6, 6, 1] },
  { x: 1430, y: 1800, dir: -1, s: 130, f: [3, 2, 5] },
];
const TABLES = [{ x: 330, y: 1380 }, { x: 1270, y: 1380 }];
const CHIP_TOWERS: [number, number][] = [[620, 1660], [980, 1660], [600, 420], [1000, 440], [250, 1250], [1350, 1240], [540, 1900], [1060, 1900]];

// ── Solids ───────────────────────────────────────────────────────────

const solids: Solid[] = [
  { kind: 'rect', x: 0, y: 0, w: WL, h: H },
  { kind: 'rect', x: WR, y: 0, w: W - WR, h: H },
  { kind: 'rect', x: WL, y: 0, w: GAP_L - WL, h: NORTH },
  { kind: 'rect', x: GAP_R, y: 0, w: WR - GAP_R, h: NORTH },
  { kind: 'rect', x: WL, y: SOUTH, w: GAP_L - WL, h: H - SOUTH },
  { kind: 'rect', x: GAP_R, y: SOUTH, w: WR - GAP_R, h: H - SOUTH },
  // The Wheel's spindle.
  { kind: 'circle', x: WHEEL.x, y: WHEEL.y, r: 36 },
  // The drum of the Draw.
  { kind: 'rect', x: DRUM.x - 95, y: DRUM.y - 26, w: 190, h: 30 },
];
for (const d of DICE) {
  const x0 = d.dir > 0 ? WL : d.x - d.s / 2;
  const x1 = d.dir > 0 ? d.x + d.s / 2 : WR;
  solids.push({ kind: 'rect', x: x0, y: d.y - 46, w: x1 - x0, h: 46 });
}
for (const el of B.elements) {
  const a = SEAT_AT[el];
  solids.push({ kind: 'rect', x: a.x - 75, y: a.y - 62, w: 150, h: 24 });
}
for (const t of TABLES) solids.push({ kind: 'rect', x: t.x - 105, y: t.y - 22, w: 210, h: 26 });

// ── Ground ───────────────────────────────────────────────────────────

/** The betting layout under the glass by the stair: three columns of numbered red and black. */
function bettingLayout(g: G): void {
  const x0 = 640, y0 = 1400, cw = 106, ch = 32;
  g.fillStyle(FELT, 0.8); g.fillRect(x0 - 12, y0 - 12, cw * 3 + 24, ch * 12 + 24);
  g.lineStyle(2, FELT_LIT, 0.8); g.strokeRect(x0 - 12, y0 - 12, cw * 3 + 24, ch * 12 + 24);
  const reds = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  for (let r = 0; r < 12; r++) for (let c = 0; c < 3; c++) {
    const n = 36 - (r * 3 + (2 - c));
    const x = x0 + c * cw, y = y0 + r * ch;
    g.fillStyle(reds.has(n) ? ROUGE_DEEP : OBS.glass, 0.95); g.fillRect(x + 2, y + 2, cw - 4, ch - 4);
    g.fillStyle(reds.has(n) ? ROUGE : OBS.facet, 0.45); g.fillRect(x + 4, y + 4, cw - 8, 6);
    glyphs(g, String(n), x + cw / 2, y + ch / 2 + 1, 13, IVORY, 0.55, 1.6);
  }
  // The zero at the head of the layout, in felt light.
  g.fillStyle(FELT_DEEP, 1); g.fillRect(x0, y0 - 52, cw * 3, 36);
  g.lineStyle(1.5, FELT_GLOW, 0.7); g.strokeRect(x0, y0 - 52, cw * 3, 36);
  glyphs(g, '0', x0 + cw * 1.5, y0 - 34, 18, FELT_GLOW, 0.8, 2.2);
  // Chips nobody collected, still on their squares.
  const spots: [number, number][] = [[700, 1470], [810, 1540], [910, 1630], [720, 1700], [880, 1470]];
  spots.forEach(([x, y], i) => chipStack(g, x, y, 1 + (i % 3), i % 2 ? ROUGE : OBS.facet, 8));
}

function paintGround(g: G, rng: () => number): void {
  g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, W, H);
  glassFloor(g, WL, NORTH, WR - WL, SOUTH - NORTH, 56, rng);
  // The felt runner up the middle, rouge-bordered, a diamond every pace.
  g.fillStyle(FELT_DEEP, 0.9); g.fillRect(MID - 70, NORTH, 140, SOUTH - NORTH + 70);
  g.fillStyle(ROUGE_DEEP, 1); g.fillRect(MID - 70, NORTH, 8, SOUTH - NORTH + 70); g.fillRect(MID + 62, NORTH, 8, SOUTH - NORTH + 70);
  for (let y = NORTH + 30; y < SOUTH + 60; y += 60) {
    g.fillStyle(FELT, 1); g.fillTriangle(MID, y - 16, MID + 12, y, MID - 12, y); g.fillTriangle(MID, y + 16, MID + 12, y, MID - 12, y);
    g.lineStyle(1, FELT_LIT, 0.6); g.strokeTriangle(MID, y - 16, MID + 12, y, MID - 12, y);
  }
  bettingLayout(g);
  wheelBowl(g, WHEEL.x, WHEEL.y, WHEEL.R, rng);
  // Walls: black glass, a cliff of shards along each inner edge.
  g.fillStyle(OBS.glass, 1); g.fillRect(0, 0, WL, H); g.fillRect(WR, 0, W - WR, H);
  g.fillRect(WL, 0, WR - WL, NORTH); g.fillRect(WL, SOUTH, WR - WL, H - SOUTH);
  g.fillStyle(OBS.sky, 1); g.fillRect(GAP_L, 0, GAP_R - GAP_L, NORTH); g.fillRect(GAP_L, SOUTH, GAP_R - GAP_L, H - SOUTH);
  for (let y = 60; y < H; y += 38) {
    shard(g, WL - 10 + rng() * 14, y, 26 + rng() * 20, 50 + rng() * 60, 8 + rng() * 10, 0.15);
    shard(g, WR + 10 - rng() * 14, y + 19, 26 + rng() * 20, 50 + rng() * 60, -8 - rng() * 10, 0.15);
  }
  for (let x = WL; x < WR; x += 34) {
    if (x > GAP_L - 30 && x < GAP_R) continue;
    shard(g, x + rng() * 12, NORTH, 26 + rng() * 16, 70 + rng() * 60, (rng() - 0.5) * 14, 0.2);
  }
  // The stairs: glass steps up out of the north gap, down out of the south one.
  for (let i = 0; i < 5; i++) slab(g, MID, NORTH - i * 20, GAP_R - GAP_L - i * 6, 14);
  for (let i = 0; i < 4; i++) slab(g, MID, H - i * 18, GAP_R - GAP_L + 20, 12);
  // Violet cracks in the floor; a pip of felt light trapped here and there.
  for (let i = 0; i < 26; i++) {
    const a = { x: WL + 30 + rng() * (WR - WL - 60), y: NORTH + 40 + rng() * (SOUTH - NORTH - 80) };
    seam(g, crackPath(a, { x: a.x + (rng() - 0.5) * 260, y: a.y + (rng() - 0.5) * 180 }, rng, 10, 6), 1.1, 0.55);
  }
  for (let i = 0; i < 40; i++) {
    const x = WL + 20 + rng() * (WR - WL - 40), y = NORTH + 20 + rng() * (SOUTH - NORTH - 40);
    g.fillStyle(FELT_GLOW, 0.12); g.fillCircle(x, y, 6); g.fillStyle(FELT_GLOW, 0.7); g.fillCircle(x, y, 1.6);
  }
  // The hourglass's shadow pooled on the floor under it.
  g.fillStyle(0x000000, 0.35); g.fillEllipse(MID, GLASS_Y + 180, 140, 34);
}

// ── Pieces ───────────────────────────────────────────────────────────

/** A tall tower of obsidian chips, tithe stacked like coin, a rouge chip every few. */
function chipTower(g: G, x: number, y: number, rng: () => number): void {
  const n = 10 + Math.floor(rng() * 10);
  for (let i = 0; i < 3; i++) chipStack(g, x - 14 + i * 14, y + (i % 2) * 4, Math.floor(n * (0.6 + rng() * 0.4)), (i + Math.floor(rng() * 3)) % 4 === 0 ? ROUGE : OBS.facet, 10);
}

const pieces: NonNullable<AreaDef['painter']['pieces']> = [
  ...DICE.map((d, i) => ({
    x: d.x, y: d.y, w: d.s * 2, h: d.s * 1.6,
    draw: (g: G, rng: () => number) => fusedDie(g, d.x, d.y, d.s, d.f, d.dir, rng, 0.75 + (i % 3) * 0.1),
  })),
  ...B.elements.map((el) => {
    const a = SEAT_AT[el];
    return { x: a.x, y: a.y - 38, w: 180, h: 260, draw: (g: G, rng: () => number) => councilSeat(g, a.x, a.y - 38, 1, EMBLEM[el], rng) };
  }),
  ...TABLES.map((t) => ({ x: t.x, y: t.y, w: 240, h: 150, draw: (g: G, rng: () => number) => warTable(g, t.x, t.y, 200, 74, rng) })),
  ...CHIP_TOWERS.map(([x, y]) => ({ x, y, w: 60, h: 90, draw: (g: G, rng: () => number) => chipTower(g, x, y, rng) })),
  {
    x: DRUM.x, y: DRUM.y, w: 260, h: 140,
    draw: (g: G) => {
      // The drum of the Draw, idle, the last lots still in it — all of them rouge: the favourites'.
      drum(g, DRUM.x, DRUM.y - 64, 40, 0.6, [ROUGE, ROUGE, OBS.facet, ROUGE], 4, 0, 0);
    },
  },
];

// ── Per-frame: the Wheel turning, the hourglass hanging ──────────────

let pocketCache: PocketState[] = [];
let pocketAt = -99;
const ALL_ELEMENTS = BENCHES.flatMap((b) => b.elements);
const MINE = (B.n - 1) * 6;

function animate(g: G, t: number, view: Rect, world: PainterWorld): void {
  const R = WHEEL.R;
  if (view.x > WHEEL.x + R * 1.2 || view.x + view.w < WHEEL.x - R * 1.2 || view.y > WHEEL.y + R || view.y + view.h < WHEEL.y - R) return;
  if (t - pocketAt > 1) {
    pocketAt = t;
    pocketCache = ALL_ELEMENTS.map((el) => (world.test({ encounter: seatId(el) }) ? 2 : 1));
  }
  const rot = t * 0.22;
  // The ball: a 14 s cycle — it runs the track, slows, drops and sits in a pocket.
  const cyc = Math.floor(t / 14), u = t - cyc * 14;
  const pocket = Math.abs((cyc * 2654435761) | 0) % 60;
  const rest = rot + ((pocket + 0.5) / 60) * Math.PI * 2;
  const run = -(3.4 * u - 0.17 * u * u) + cyc * 1.7;
  const s = Math.max(0, Math.min(1, (u - 6.5) / 2.5));
  const sm = s * s * (3 - 2 * s);
  const ball = { a: run + (rest - run) * sm, k: 1 - sm, flare: u > 9 ? Math.min(1, (u - 9) * 2) * (0.6 + 0.4 * Math.sin(t * 6)) : 0, pocket };
  wheelSpin(g, WHEEL.x, WHEEL.y, R, rot, t, (i) => pocketCache[i] ?? 1, MINE, ball);
}

function animateOver(g: G, t: number, view: Rect): void {
  // The hourglass: swaying on its chain from the dark, running a sixty-second turn.
  if (view.y < GLASS_Y + 140 && view.y + view.h > GLASS_Y - 400 && view.x < MID + 80 && view.x + view.w > MID - 80) {
    const k = (t % 60) / 60;
    hourglass(g, MID + Math.sin(t * 0.5) * 5, GLASS_Y, 0.9, k, t, Math.max(0, view.y - 10));
  }
  motes(g, view, t, 14, 0xd9c8ff, 6, 10, 1.2, 8);
}

// ── People ───────────────────────────────────────────────────────────

const NPCS: NpcDef[] = [
  {
    id: 'bench-fate-croupier', name: 'No. 41', title: 'A busted croupier, still turning the Wheel',
    look: { body: 0x2a2630, accent: 0xb81c36, hat: 'visor', traits: ['scarf'], size: 1.0, eye: 0xd9a8ff },
    at: { x: 1080, y: 1370 },
    talks: [
      {
        when: { monarch: 'obsidian-king' },
        lines: [
          'My name is Pell Brannagh. Pell Brannagh. I have not said it out loud in twenty-two years.',
          'The black chip came off my chain on its own. It was glass. It was only ever glass.',
          'I am going to stop turning this wheel now. Watch. ...There. It turned itself all those years. Not me.',
        ],
      },
      {
        when: { courtReady: B.id },
        lines: [
          'Six pockets lit. Six. The ball lands in them now, see? It never used to land in theirs.',
          'The stair is open. I am not allowed to say where it goes. I am not allowed to say anything. Go on up.',
        ],
      },
      {
        lines: [
          'Forty-one, if it please the House. Busted. I do not have a name; I have a number and a chip.',
          'Sixty pockets, one for every seat. When a seat empties, the pocket fills with light. I keep it turning.',
          'The six of the Lot stand at their seats. Two by the stair, two by the Wheel, two under the north wall.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'obsidian-king' }, lines: ['Pell Brannagh.', 'It was only ever glass.'] },
      { lines: ['...no more bets...', '...forty-one, if it please the House...', '...round she goes...'] },
    ],
  },
  {
    id: 'bench-fate-clerk', name: 'Ottoline Fesse', title: 'Tally-clerk of the Lot, still filing',
    look: { body: 0x3a3040, accent: 0x7af2aa, hat: 'coif', traits: ['glasses', 'book'], size: 0.9, eye: 0xd9a8ff },
    at: { x: 470, y: 1460 },
    talks: [
      {
        when: { monarch: 'obsidian-king' },
        lines: [
          'I have closed the ledger. Every Lot ever drawn. I am taking it down to the sea to read it aloud.',
          'Not the numbers. The names. Every Lot has a name on the back. Nobody upstairs ever turned one over.',
        ],
      },
      {
        when: { courtReady: B.id },
        lines: [
          'All six struck off. I have drawn a line under the bench. It is the neatest line I have ever drawn.',
          'There are two more benches above this one, and then him. Take the relic. Quill would want it used honestly.',
        ],
      },
      {
        lines: [
          'Do not touch the map, please, it is filed. Every pin is a citizen drawn for the War Court.',
          'At the Seat of the Draw, Councilor Quill keeps her own lots in the false bottom. Everyone knows.',
          'Everyone knows, and nobody strikes it. That is what a clerk is for: knowing, and filing it.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'obsidian-king' }, lines: ['The names. Not the numbers.', 'A neat line.'] },
      { lines: ['...rouge for the drawn...', '...filed...', '...everyone knows...'] },
    ],
  },
];

// ── POIs ─────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  { kind: 'waystone', at: { x: 620, y: 1860 } },
  ...B.elements.map((el): Poi => ({ kind: 'encounter', id: seatId(el) })),
  { kind: 'chest', id: relicId(B.id), at: { x: 1040, y: 250 }, item: relicId(B.id), orbs: 8, open: { courtReady: B.id } },
  { kind: 'sign', at: { x: 980, y: 1870 }, text: 'THE LOT BENCH. Every child is given a number. Every number may be called. Some numbers are kept somewhere warm.' },
];

export const FATE_BENCH_AREA: AreaDef = {
  id: B.id,
  isle: 'pinnacle',
  name: B.name,
  subtitle: B.subtitle,
  w: W,
  h: H,
  bg: OBS.sky,
  accent: B.color,
  weather: 'cards',
  spawn: { x: MID, y: 1860 },
  painter: { ground: paintGround, pieces, animate, animateOver },
  solids,
  exits: [
    { side: 's', to: below(B), label: 'Down to the Venom Bench' },
    { side: 'n', to: above(B), label: 'Up to the Choir Bench', open: { courtReady: B.id }, lockedText: 'The stair is closed by six seats. Empty every seat of the Lot first.' },
  ],
  pois: POIS,
  npcs: NPCS,
  gloom: 0.25,
  intro: benchIntroId(B.id),
  checkpoints: [{ x: MID, y: 1860 }],
};
