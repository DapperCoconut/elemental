import type { AreaDef, NpcDef, Poi, Rect, Solid } from '../../../../IslesTypes';
import { type G, glow, motes } from '../../../../art/IsleArt';
import { OBS, glassFloor, seam, crackPath, shard, starGlow } from '../../../../art/PinnacleArt';
import { BENCHES, above, below, benchIntroId, relicId, seatId } from '../../spec';
import {
  NOON, type Emblem, ceilingSeam, councilSeat, crackCaustic, glassStair, lectern, lightPool, sunShaft, sunWell,
  ticketDesk, wallMirror,
} from './art';
import { SEAT_AT } from './councilors';

/**
 * The Noon Bench — the tenth and highest bench, directly under the throne hall.
 *
 * You come up the south stair into the brightest room on the spire. A long nave of black glass
 * runs north between two walls of obsidian mirrors; down its middle lies a brass meridian strip
 * with every hour-mark reading XII (the Endless Noon was written here). Halfway up, the captured
 * sunbeam — the Heliostat's own light, piped up the spire — falls down a shaft into a mirrored
 * well. And at the head of the room is THE CEILING SEAM: the underside of the King's floor, its
 * plates split open, the star burning straight through and pouring gold down a last stair.
 *
 *   South landing (y 1700–1960)  stair down, waystone, the Dusk-Ticket clerk still at his desk
 *   The nave      (y 700–1700)   four seats climbing it, mirrors either side, the sunwell
 *   The Noon floor (y 260–700)   the two presiding seats in a pool of starlight, the scribe
 *   The Seam      (y 0–260)      the last stair up into the light — to the Crownless Hall
 */

const B = BENCHES.find((b) => b.isle === 'light')!;
const W = 1600;
const H = 2000;
const L = 170;
const R = 1430;
const MID = 800;
const GAP_L = 690;
const GAP_R = 910;
const NORTH = 200;
const SOUTH = 1960;
const WELL = { x: MID, y: 1110, r: 96 };
const DESK = { x: 1180, y: 1800 };
const LECTERN = { x: 620, y: 390 };

/** Which emblem each seat bears (what clause that seat drafted). */
const EMBLEM: Record<string, Emblem> = { light: 'sun', justice: 'scales', soul: 'lantern', magic: 'sigil', creation: 'compass', chalk: 'brush' };

// ── Solids ───────────────────────────────────────────────────────────

const solids: Solid[] = [
  { kind: 'rect', x: 0, y: 0, w: L, h: H },
  { kind: 'rect', x: R, y: 0, w: W - R, h: H },
  { kind: 'rect', x: L, y: 0, w: GAP_L - L, h: NORTH },
  { kind: 'rect', x: GAP_R, y: 0, w: R - GAP_R, h: NORTH },
  { kind: 'rect', x: L, y: SOUTH, w: GAP_L - L, h: H - SOUTH },
  { kind: 'rect', x: GAP_R, y: SOUTH, w: R - GAP_R, h: H - SOUTH },
  { kind: 'circle', x: WELL.x, y: WELL.y, r: 74 },
  { kind: 'rect', x: DESK.x - 75, y: DESK.y - 34, w: 150, h: 34 },
  { kind: 'circle', x: LECTERN.x, y: LECTERN.y - 4, r: 16 },
];
/** Each seat's plinth (the councilor stands 50 px in front of it). */
for (const el of B.elements) {
  const at = SEAT_AT[el];
  solids.push({ kind: 'rect', x: at.x - 66, y: at.y - 50 - 36, w: 132, h: 36 });
}

// ── Ground ───────────────────────────────────────────────────────────

function paintGround(g: G, rng: () => number): void {
  g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, W, H);
  // The walls' tops: a crust of black shards, lit only on their inner faces.
  for (const [x0, x1, lean] of [[0, L, 6], [R, W, -6]] as [number, number, number][]) {
    g.fillStyle(OBS.glass, 1); g.fillRect(x0, 0, x1 - x0, H);
    for (let y = 30; y < H; y += 46 + rng() * 30) {
      shard(g, x0 + (x1 - x0) * (0.2 + rng() * 0.6), y, 30 + rng() * 40, 40 + rng() * 60, lean * (1 + rng()), rng() * 0.4);
    }
  }
  // The nave floor: polished black glass, big tiles.
  glassFloor(g, L, 0, R - L, H, 64, rng);
  // Pools of starlight where cracks overhead let the gold through — more of it toward the Seam.
  for (let i = 0; i < 14; i++) {
    const y = 260 + rng() * 1500;
    const warm = 1 - (y - 260) / 1600;
    const x = L + 80 + rng() * (R - L - 160);
    lightPool(g, x, y, 60 + rng() * 60, 26 + rng() * 20, 0.5 + warm);
    crackCaustic(g, x - 40, y - 10, 70 + rng() * 60, Math.floor(rng() * 9999), 0.35 + warm * 0.5, rng() * 0.6 - 0.3);
  }
  // The Noon floor: a great warm pool under the Seam.
  lightPool(g, MID, 360, 560, 200, 2.2);
  for (let i = 0; i < 6; i++) crackCaustic(g, MID - 420 + i * 150, 250 + rng() * 60, 160 + rng() * 120, 77 + i * 13, 0.9, Math.PI / 2 + (rng() - 0.5) * 0.6);
  // The meridian strip: brass let into the glass down the whole nave, every hour-mark a XII.
  g.fillStyle(NOON.brassDark, 1); g.fillRect(MID - 5, NORTH + 60, 10, SOUTH - NORTH - 100);
  g.fillStyle(NOON.brass, 1); g.fillRect(MID - 3, NORTH + 60, 6, SOUTH - NORTH - 100);
  g.fillStyle(0xffffff, 0.3); g.fillRect(MID - 1, NORTH + 60, 1, SOUTH - NORTH - 100);
  for (let y = NORTH + 120; y < SOUTH - 60; y += 120) {
    if (Math.abs(y - WELL.y) < 110) continue;
    g.fillStyle(NOON.brass, 1); g.fillRect(MID - 22, y - 1.5, 44, 3);
    // XII, in brass strokes.
    g.lineStyle(1.6, NOON.brass, 1);
    g.lineBetween(MID + 28, y - 6, MID + 36, y + 6); g.lineBetween(MID + 36, y - 6, MID + 28, y + 6);
    g.lineBetween(MID + 40, y - 6, MID + 40, y + 6); g.lineBetween(MID + 44, y - 6, MID + 44, y + 6);
    // A tiny pinned sun beside it.
    g.fillStyle(NOON.gold, 0.9); g.fillCircle(MID - 34, y, 4);
    g.lineStyle(1, OBS.glass, 1); g.lineBetween(MID - 37, y + 3, MID - 31, y - 3);
  }
  // A dais ring of brass under each seat.
  for (const el of B.elements) {
    const at = SEAT_AT[el];
    g.fillStyle(0x000000, 0.35); g.fillEllipse(at.x, at.y - 30, 210, 90);
    g.lineStyle(2, NOON.brass, 0.6); g.strokeEllipse(at.x, at.y - 30, 200, 84);
    g.lineStyle(1, NOON.gold, 0.25); g.strokeEllipse(at.x, at.y - 30, 214, 94);
  }
  // Violet seams in the glass, the King's colour, fewer toward the light.
  for (let i = 0; i < 22; i++) {
    const a = { x: L + rng() * (R - L), y: 700 + rng() * 1250 };
    seam(g, crackPath(a, { x: a.x + (rng() - 0.5) * 220, y: a.y + (rng() - 0.5) * 120 }, rng, 10, 5), 1.1, 0.45);
  }
  // The south landing: a worn band where the queues stood, ticket-stubs swept into the corners.
  g.fillStyle(OBS.facet, 0.4); g.fillRect(GAP_L, SOUTH - 120, GAP_R - GAP_L, 120);
  for (let i = 0; i < 60; i++) {
    const x = (rng() < 0.5 ? L + 10 + rng() * 120 : R - 130 + rng() * 120), y = SOUTH - 160 + rng() * 150;
    g.fillStyle(rng() < 0.5 ? 0xe8dcae : 0xd8c890, 0.6); g.fillRect(x, y, 7, 3);
  }
}

// ── Set pieces ───────────────────────────────────────────────────────

type Piece = NonNullable<AreaDef['painter']['pieces']>[number];
const pieces: Piece[] = [];

// The mirror walls: tall obsidian mirrors set into both walls, the length of the room.
for (let y = 330, i = 0; y < SOUTH - 60; y += 170, i++) {
  const yy = y;
  pieces.push({ x: L - 22, y: yy, w: 80, h: 220, draw: (g) => wallMirror(g, L - 22, yy, 58, 150, -1, i % 3 === 1 ? 1 : 0, 300 + i) });
  pieces.push({ x: R + 22, y: yy + 85, w: 80, h: 220, draw: (g) => wallMirror(g, R + 22, yy + 85, 58, 150, 1, i % 4 === 2 ? 1 : 0, 500 + i) });
}

// The six seats — full while their councilor sits, emptied (a split mask on the plinth) once beaten.
B.elements.forEach((el, i) => {
  const at = SEAT_AT[el];
  const x = at.x, y = at.y - 50;
  pieces.push({ x, y, w: 170, h: 260, when: { not: { encounter: seatId(el) } }, draw: (g) => councilSeat(g, x, y, 0.9, EMBLEM[el], 900 + i) });
  pieces.push({ x, y, w: 170, h: 260, when: { encounter: seatId(el) }, draw: (g) => councilSeat(g, x, y, 0.9, EMBLEM[el], 900 + i, true) });
});

// The sunwell — the captured beam's shaft.
pieces.push({ x: WELL.x, y: WELL.y + 60, w: 240, h: 150, draw: (g) => sunWell(g, WELL.x, WELL.y, WELL.r, 41) });

// The last stair, up through the Seam to the Crownless Hall.
pieces.push({ x: MID, y: 262, w: 260, h: 280, draw: (g) => glassStair(g, MID, 262, 200, 9, 26, 1) });

// The clerk's desk and the scribe's lectern.
pieces.push({ x: DESK.x, y: DESK.y, w: 170, h: 120, draw: (g) => ticketDesk(g, DESK.x, DESK.y, 17) });
pieces.push({ x: LECTERN.x, y: LECTERN.y, w: 70, h: 90, draw: (g) => lectern(g, LECTERN.x, LECTERN.y) });

// The head of the south stair: two shard newels flanking the way down.
for (const s of [-1, 1]) {
  const x = MID + s * 130;
  pieces.push({ x, y: SOUTH + 6, w: 70, h: 150, draw: (g) => { shard(g, x, SOUTH + 6, 46, 120, s * 8, 0.3); glow(g, x + s * 4, SOUTH - 60, 16, NOON.gold, 0.05, 2); } });
}

// ── Animation ────────────────────────────────────────────────────────

const near = (v: Rect, x: number, y: number, pad: number): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

function animate(g: G, t: number, view: Rect): void {
  // THE CEILING SEAM: the King's floor from beneath, split, the star burning through.
  if (near(view, MID, 100, 500)) ceilingSeam(g, MID, NORTH - 10, R - L - 40, 190, t, 1010, 1);
  // The sunbeam into the well: a breathing column of white-gold, its foot a disc too bright to look at.
  if (near(view, WELL.x, WELL.y, 500)) {
    const br = 0.85 + 0.15 * Math.sin(t * 1.7);
    sunShaft(g, WELL.x, WELL.y - 520, WELL.x, WELL.y, 60, 120, 1.3 * br);
    lightPool(g, WELL.x, WELL.y + 6, 80, 40, 1.4 * br);
    for (let i = 0; i < 10; i++) {
      const ph = (t * 0.6 + i / 10) % 1;
      g.fillStyle(NOON.starCore, 0.8 * (1 - ph)); g.fillCircle(WELL.x + Math.sin(i * 2.1 + t) * 36, WELL.y - 500 + ph * 500, 1.6);
    }
  }
  // The Noon floor's pool shimmers as the plates above shift a hair.
  if (near(view, MID, 360, 600)) {
    for (let i = 0; i < 5; i++) {
      const x = MID - 400 + i * 200 + Math.sin(t * 0.4 + i) * 30;
      g.fillStyle(NOON.gold, 0.035 + 0.02 * Math.sin(t * 1.1 + i * 1.7)); g.fillEllipse(x, 380 + Math.cos(t * 0.3 + i) * 20, 220, 80);
    }
  }
}

function animateOver(g: G, t: number, view: Rect): void {
  // Long gold rays from the Seam fanning down the nave, fainter the farther they reach.
  if (view.y < 1500) {
    for (let i = 0; i < 6; i++) {
      const x0 = L + 140 + i * 200 + Math.sin(t * 0.2 + i) * 10;
      const x1 = x0 + (x0 - MID) * 0.5;
      sunShaft(g, x0, NORTH - 40, x1, 1300, 18, 160, 0.22 + 0.08 * Math.sin(t * 0.7 + i * 1.3));
    }
  }
  // Glints sliding across the mirrors as the light moves.
  for (let y = 330, i = 0; y < SOUTH - 60; y += 170, i++) {
    for (const [x, yy] of [[L - 22, y], [R + 22, y + 85]] as [number, number][]) {
      if (!near(view, x, yy, 120)) continue;
      const ph = (t * 0.25 + i * 0.31 + (x > MID ? 0.5 : 0)) % 1;
      if (ph > 0.3) continue;
      const k = ph / 0.3;
      const gy = yy - 20 - k * 120;
      g.fillStyle(NOON.starCore, 0.6 * Math.sin(k * Math.PI)); g.fillEllipse(x, gy, 30, 5);
    }
  }
  // Starmotes rising from the pools, more toward the Seam.
  motes(g, view, t, 22, NOON.gold, -14, 18, 1.5, 77);
  motes(g, view, t * 0.7, 10, NOON.starCore, -22, 30, 1.1, 13);
  if (near(view, MID, 120, 400)) starGlow(g, MID, 60, 6, t, 0.5);
}

// ── People ───────────────────────────────────────────────────────────

const NPCS: NpcDef[] = [
  {
    id: 'bench-light-clerk', name: 'Pell Abbott', title: 'Under-Clerk of Dusk Tickets, a Clear',
    look: { body: 0xe8eef4, accent: 0xb8c4d0, hat: 'visor', traits: ['glasses', 'satchel'], size: 0.95, eye: 0xf8fbff },
    at: { x: DESK.x, y: DESK.y + 40 },
    talks: [
      {
        when: { monarch: 'obsidian-king' },
        lines: [
          '...it went dark up there. Properly dark. For a whole minute. I sat in it and I could not see my own hands.',
          'I think my hands are coming back. A little grey at the knuckles. Grey is a colour. Grey is MY colour.',
          'I have punched my last ticket. Shade is free. You may have as much as you like. Nobody needs to queue.',
        ],
      },
      {
        when: { courtReady: B.id },
        lines: [
          'All six seats empty. Nobody to countersign. My tickets are worthless — I am issuing them anyway, to everyone.',
          'Here. One hour of shade. Valid upstairs. ...I do not know if it is valid upstairs. Take two.',
        ],
      },
      {
        lines: [
          'Ticket? One hour of licensed shade, punched once, non-transferable. ...No, of course you have not got one.',
          'They bleached me for an unlicensed nap. Now I issue the licences. You can see the desk through my chest, sir.',
          'The councilors sit up the nave. The higher the seat, the older the clause. Mind your eyes near the top.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'obsidian-king' }, lines: ['Grey knuckles!', 'Shade for everyone.'] },
      { lines: ['...one hour, punched once...', '...non-transferable...', '...next.'] },
    ],
  },
  {
    id: 'bench-light-scribe', name: 'Ottoline Hask', title: 'Scrivener to the Bench, who has stopped',
    look: { body: 0xd8c8b0, accent: 0x2a2440, hat: 'coif', traits: ['book'], size: 1.0, eye: 0xfff2b0 },
    at: { x: LECTERN.x + 50, y: LECTERN.y + 24 },
    talks: [
      {
        when: { monarch: 'obsidian-king' },
        lines: [
          'I wrote the last line of the Endless Noon forty years ago. Then I put the pen down, and never took it up.',
          'Now I shall write one more. "Repealed." That is the whole of it. I have been saving it.',
        ],
      },
      {
        when: { courtReady: B.id },
        lines: [
          'The stair has let you on. It has never let anyone on. Go up. I will hold the book open.',
          'If you come down again, tell me what He looks like. I have only ever seen his light through the floor.',
        ],
      },
      {
        lines: [
          '...I took the Noon down word for word. Glaze, Ashlar, Vigil, Quillon, Gauge, Varnish — every clause.',
          'Then I looked up. The ceiling is His floor, you know. You can see Him through it, like a sun through a hand.',
          'I have not written a word since. The stair will not take you until every one of their seats is empty.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'obsidian-king' }, lines: ['"Repealed."', 'There. Done.'] },
      { lines: ['...like a sun through a hand...', '...every clause...'] },
    ],
  },
];

// ── POIs ─────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  { kind: 'waystone', at: { x: 560, y: 1860 } },
  ...B.elements.map((el): Poi => ({ kind: 'encounter', id: seatId(el) })),
  { kind: 'chest', id: relicId(B.id), at: { x: 1010, y: 300 }, item: relicId(B.id), orbs: 8, open: { courtReady: B.id } },
  { kind: 'sign', at: { x: 940, y: 1880 }, text: 'THE NOON BENCH. Here the Endless Noon was written. Visitors stand in the light, where they can be seen.' },
];

export const LIGHT_BENCH_AREA: AreaDef = {
  id: B.id,
  isle: 'pinnacle',
  name: B.name,
  subtitle: B.subtitle,
  w: W,
  h: H,
  bg: OBS.sky,
  accent: NOON.gold,
  weather: 'starmotes',
  gloom: 0.15,
  spawn: { x: MID, y: 1880 },
  intro: benchIntroId(B.id),
  painter: { ground: paintGround, pieces, animate, animateOver },
  solids,
  exits: [
    { side: 's', to: below(B), label: 'Down — the Choir Bench' },
    {
      side: 'n', to: above(B), label: 'Up — through the Seam, to the Crownless Hall', open: { courtReady: B.id },
      lockedText: 'The last stair will not take a step while any seat on this bench is filled.',
    },
  ],
  pois: POIS,
  npcs: NPCS,
};

