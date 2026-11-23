import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { glow, mulberry } from '../../../../art/IsleArt';
import {
  batRoost, bat, caveFloor, cavePath, cavernWaystone, caveSign, chasm, chime, chimeCrates, chimeShadow, chimeStall,
  choirStall, cressPatch, drip, echoWall, galleryBench, galleryFloor, grottoHouse, hymnSheet, listeningPost,
  northCliff, poolRings, ringingPool, ropeBridge, ropeCoil, soundingShell, stalagmite, wallMass, wormLamp,
} from './art';
import { CAVERN_CROWD, CAVERN_NPCS } from './npcs';
import {
  BRONZE_LIT, CAVERN_COLOR, FLOW_LIT, GHOST, GLOW, GLOW_SOFT, LAMP, LAMP_HOT, REPRISE_LIT, ROCK_DEEP,
} from './palette';
import {
  BRIDGES, BRIDGE_HALF, CAVERN_H, CAVERN_W, CHASM, CHASM_W, CHIME_HALL, CHOIR, DEAD_SPOT, ECHO_WALL, ECHO_WALL_W,
  EAST_X, EXIT_E_Y, EXIT_S_X, GALLERY, GALLERY_RX, GALLERY_RY, GATE_HALF, HOUSES, NORTH_Y, POOL_RECT, POST, ROOST,
  SHELL, SOUTH_Y, STALL, WAYSTONE, WEST_X,
} from './spots';

/**
 * The Cavern Court — the Echo Caves, a town built inside a vast sea-cave under Choirholm's
 * western cliffs, where the Score was sung into the rock so long ago that it has never stopped
 * coming back. See `spots.ts` for the layout read from the Brass road in. Everything is lit by
 * the glowworm roof (cold) and doorway lamps (warm); everything rings.
 */

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: Piece['draw'], solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

// ── Walls ────────────────────────────────────────────────────────────

// The north wall: a cliff with its stalactite lip, drawn as pieces so it stands behind everything.
for (let x0 = 0; x0 < CAVERN_W; x0 += 400) {
  addPiece(x0 + 200, NORTH_Y, 420, 120, (g, rng) => northCliff(g, x0, x0 + 400, NORTH_Y, rng));
}
solids.push({ kind: 'rect', x: 0, y: 0, w: CAVERN_W, h: NORTH_Y - 10 });
// South wall, open at the road down to Libretto.
solids.push({ kind: 'rect', x: 0, y: SOUTH_Y, w: EXIT_S_X - GATE_HALF, h: CAVERN_H - SOUTH_Y });
solids.push({ kind: 'rect', x: EXIT_S_X + GATE_HALF, y: SOUTH_Y, w: CAVERN_W - EXIT_S_X - GATE_HALF, h: CAVERN_H - SOUTH_Y });
// West wall.
solids.push({ kind: 'rect', x: 0, y: 0, w: WEST_X, h: CAVERN_H });
// East wall, open at the cave mouth.
solids.push({ kind: 'rect', x: EAST_X, y: 0, w: CAVERN_W - EAST_X, h: EXIT_E_Y - GATE_HALF });
solids.push({ kind: 'rect', x: EAST_X, y: EXIT_E_Y + GATE_HALF, w: CAVERN_W - EAST_X, h: CAVERN_H - EXIT_E_Y - GATE_HALF });

// The chasm: solid except where the bridges cross.
{
  const x = 800, w = 130;
  const cuts = BRIDGES.map((b) => [b.y - BRIDGE_HALF - 4, b.y + BRIDGE_HALF + 4]);
  let y0 = NORTH_Y - 10;
  for (const [a, b] of cuts) { solids.push({ kind: 'rect', x, y: y0, w, h: a - y0 }); y0 = b; }
  solids.push({ kind: 'rect', x, y: y0, w, h: CHASM[CHASM.length - 1].y + 18 - y0 });
}

// The cave mouth's flanking rocks.
for (const y of [EXIT_E_Y - GATE_HALF - 20, EXIT_E_Y + GATE_HALF + 20]) {
  addPiece(EAST_X - 10, y, 120, 140, (g, rng) => { stalagmite(g, EAST_X - 30, y, 1.5, rng); stalagmite(g, EAST_X - 6, y + 6, 1.1, rng); },
    { kind: 'circle', x: EAST_X - 20, y: y - 4, r: 26 });
}

// ── Set pieces ───────────────────────────────────────────────────────

// The Sounding Shell — Prince Reprise's hall.
addPiece(SHELL.x, SHELL.y, 460, 340, (g, rng) => soundingShell(g, SHELL.x, SHELL.y, 380, 280, rng),
  { kind: 'rect', x: SHELL.x - 180, y: SHELL.y - 58, w: 360, h: 56 });
solids.push({ kind: 'circle', x: SHELL.x - 160, y: SHELL.y - 4, r: 8 }, { kind: 'circle', x: SHELL.x + 160, y: SHELL.y - 4, r: 8 });

// The Whispering Gallery's back bench.
addPiece(GALLERY.x, GALLERY.y - GALLERY_RY - 10, 320, 40, (g) => galleryBench(g, GALLERY.x, GALLERY.y - GALLERY_RY - 10, 300),
  { kind: 'rect', x: GALLERY.x - 150, y: GALLERY.y - GALLERY_RY - 24, w: 300, h: 14 });

// The Bat Hollow roost.
addPiece(ROOST.x, ROOST.y, 300, 240, (g, rng) => batRoost(g, ROOST.x, ROOST.y, rng),
  { kind: 'rect', x: ROOST.x - 100, y: ROOST.y - 34, w: 200, h: 34 });

// The Echo Wall and the cave-choir's stalls.
addPiece(ECHO_WALL.x, ECHO_WALL.y, ECHO_WALL_W + 40, 230, (g, rng) => echoWall(g, ECHO_WALL.x, ECHO_WALL.y, ECHO_WALL_W, 170, rng),
  { kind: 'rect', x: ECHO_WALL.x - ECHO_WALL_W / 2, y: ECHO_WALL.y - 34, w: ECHO_WALL_W, h: 34 });
addPiece(CHOIR.x, CHOIR.y, 180, 60, (g, rng) => choirStall(g, CHOIR.x, CHOIR.y, 150, rng),
  { kind: 'rect', x: CHOIR.x - 75, y: CHOIR.y - 30, w: 150, h: 30 });

// The grotto houses.
for (const h of HOUSES) {
  addPiece(h.x, h.y, h.w * 1.4, h.h * 1.8, (g, rng) => grottoHouse(g, h.x, h.y, h.w, h.h, rng, { muted: h.muted }),
    { kind: 'rect', x: h.x - h.w * 0.45, y: h.y - 36, w: h.w * 0.9, h: 36 });
}

// The Tuners' listening post.
addPiece(POST.x, POST.y, 260, 130, (g, rng) => listeningPost(g, POST.x, POST.y, rng),
  { kind: 'rect', x: POST.x - 70, y: POST.y - 26, w: 210, h: 26 });

// Mabyn's stall at the crossing.
addPiece(STALL.x, STALL.y, 240, 160, (g, rng) => chimeStall(g, STALL.x, STALL.y, rng),
  { kind: 'rect', x: STALL.x - 84, y: STALL.y - 34, w: 196, h: 34 });

// The waystone inside the mouth.
addPiece(WAYSTONE.x, WAYSTONE.y, 60, 90, (g) => cavernWaystone(g, WAYSTONE.x, WAYSTONE.y), { kind: 'circle', x: WAYSTONE.x, y: WAYSTONE.y - 4, r: 16 });

// Hamish's rope stock by the upper bridge, crates at the market corner.
addPiece(1080, 520, 40, 30, (g) => ropeCoil(g, 1080, 520, 1.1), { kind: 'circle', x: 1080, y: 516, r: 12 });
addPiece(1110, 540, 40, 30, (g) => ropeCoil(g, 1110, 540, 0.9));
addPiece(1140, 960, 70, 70, (g) => chimeCrates(g, 1140, 960), { kind: 'rect', x: 1112, y: 944, w: 56, h: 16 });

// Stalagmites standing about the cave.
const STALAGMITES: [number, number, number][] = [
  [150, 620, 1.2], [300, 1100, 1], [700, 1120, 0.9], [620, 610, 0.8], [980, 1290, 1.1], [720, 1300, 0.8],
  [1100, 1180, 0.9], [1560, 1300, 1], [2280, 1260, 1.2], [2290, 560, 1], [1450, 660, 0.8], [180, 1500, 1.3],
  [1960, 900, 0.8], [1030, 300, 1], [2120, 1360, 0.9],
];
for (const [x, y, s] of STALAGMITES) {
  addPiece(x, y, 60, 110 * s, (g) => stalagmite(g, x, y, s, mulberry(x * 31 + y)), { kind: 'circle', x, y: y - 4, r: 12 * s });
}

// Glowworm lamps along the streets.
const LAMPS: Pt[] = [
  { x: 1520, y: 760 }, { x: 1900, y: 760 }, { x: 2200, y: 760 }, { x: 1250, y: 1300 }, { x: 1140, y: 700 },
  { x: 700, y: 520 }, { x: 600, y: 1020 }, { x: 1700, y: 1260 },
];
for (const l of LAMPS) addPiece(l.x, l.y, 40, 70, (g) => wormLamp(g, l.x, l.y), { kind: 'circle', x: l.x, y: l.y - 2, r: 5 });

// Signs.
const SIGNS: { at: Pt; text: string }[] = [
  { at: { x: 2120, y: 860 }, text: 'THE ECHO CAVES. Every household gives its verse at the Wall each Matins. The Repeat must never run thin.' },
  { at: { x: 1360, y: 470 }, text: 'THE ECHO WALL. One verse a household, in your own Part. A verse not given is noise owed to the Hush.' },
  { at: { x: 2150, y: 1240 }, text: 'TUNERS\' LISTENING POST. Voices that come back wrong are noted, and referred.' },
  { at: { x: 720, y: 590 }, text: 'TO THE SOUNDING SHELL AND THE GALLERY. Keepers, and the summoned.' },
  { at: { x: 1290, y: 1490 }, text: 'DOWN TO THE LIBRETTO COURT. Sheets for the Repeat come up this road.' },
];
for (const s of SIGNS) addPiece(s.at.x, s.at.y, 40, 60, (g) => caveSign(g, s.at.x, s.at.y), { kind: 'circle', x: s.at.x, y: s.at.y - 2, r: 6 });

// ── The Chime Hall's hanging chimes (drawn in animateOver; shadows in the ground) ──

const CHIMES: { x: number; y: number; len: number; seed: number }[] = [];
{
  const rng = mulberry(0xc41e);
  for (let i = 0; i < 16; i++) {
    const x = CHIME_HALL.x - 190 + (i % 6) * 76 + (rng() - 0.5) * 30;
    const y = CHIME_HALL.y - 90 + Math.floor(i / 6) * 90 + (rng() - 0.5) * 30;
    CHIMES.push({ x, y, len: 36 + rng() * 34, seed: rng() * 10 });
  }
}

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 160): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

/** Drips from the roof onto wet patches. */
const DRIPS: Pt[] = [
  { x: 1340, y: 1240 }, { x: 1720, y: 940 }, { x: 640, y: 980 }, { x: 1060, y: 1400 }, { x: 2000, y: 640 },
  { x: 480, y: 600 }, { x: 1620, y: 520 }, { x: 900, y: 1390 },
];

const painter: AreaPainter = {
  ground(g, rng) {
    const W = CAVERN_W, H = CAVERN_H;
    caveFloor(g, { x: 0, y: 0, w: W, h: H }, rng);

    // Paths.
    cavePath(g, [{ x: W, y: EXIT_E_Y }, { x: 1900, y: 810 }, { x: 1500, y: 790 }, { x: 1200, y: 800 }, { x: 1060, y: 680 }, { x: 960, y: 570 }], 70, rng);
    cavePath(g, [{ x: 1200, y: 800 }, { x: 1240, y: 620 }, { x: 1280, y: 440 }], 56, rng);
    cavePath(g, [{ x: 1200, y: 800 }, { x: 1200, y: 1300 }, { x: EXIT_S_X, y: H }], 64, rng);
    cavePath(g, [{ x: 1200, y: 1050 }, { x: 980, y: 1044 }], 48, rng);
    cavePath(g, [{ x: 1900, y: 810 }, { x: 2000, y: 600 }, { x: 2080, y: 480 }], 48, rng);
    cavePath(g, [{ x: 1500, y: 790 }, { x: 1600, y: 540 }, { x: 1640, y: 420 }], 40, rng);
    cavePath(g, [{ x: 1900, y: 810 }, { x: 1880, y: 1000 }, { x: 1980, y: 1220 }], 46, rng);
    cavePath(g, [{ x: 1200, y: 1380 }, { x: 1700, y: 1400 }, { x: 2250, y: 1400 }], 44, rng);
    cavePath(g, [{ x: 784, y: 556 }, { x: 640, y: 500 }, { x: 430, y: 450 }], 52, rng);
    cavePath(g, [{ x: 784, y: 556 }, { x: 660, y: 700 }, { x: 600, y: 760 }], 44, rng);
    cavePath(g, [{ x: 806, y: 1044 }, { x: 650, y: 980 }], 44, rng);
    cavePath(g, [{ x: 806, y: 1044 }, { x: 600, y: 1200 }, { x: 430, y: 1420 }], 46, rng);
    cavePath(g, [{ x: 1200, y: 1380 }, { x: 900, y: 1400 }, { x: 600, y: 1440 }, { x: 430, y: 1420 }], 44, rng);

    // The cave walls seen from above.
    wallMass(g, { x: 0, y: SOUTH_Y, w: EXIT_S_X - GATE_HALF, h: H - SOUTH_Y }, rng);
    wallMass(g, { x: EXIT_S_X + GATE_HALF, y: SOUTH_Y, w: W - EXIT_S_X - GATE_HALF, h: H - SOUTH_Y }, rng);
    wallMass(g, { x: 0, y: 0, w: WEST_X, h: H }, rng);
    wallMass(g, { x: EAST_X, y: 0, w: W - EAST_X, h: EXIT_E_Y - GATE_HALF }, rng);
    wallMass(g, { x: EAST_X, y: EXIT_E_Y + GATE_HALF, w: W - EAST_X, h: H - EXIT_E_Y - GATE_HALF }, rng);
    // Daylight spilling in at the mouth from the Brass Court.
    for (let k = 6; k >= 1; k--) { g.fillStyle(LAMP_HOT, 0.025 * k); g.fillEllipse(W, EXIT_E_Y, 160 + k * 70, 120 + k * 30); }
    // Steps carved down toward Libretto.
    for (let k = 0; k < 5; k++) {
      g.fillStyle(k % 2 ? 0x4a4a4c : 0x5a5856, 1); g.fillRect(EXIT_S_X - 60 + k * 2, SOUTH_Y + 6 + k * 12, 120 - k * 4, 8);
      g.fillStyle(FLOW_LIT, 0.3); g.fillRect(EXIT_S_X - 60 + k * 2, SOUTH_Y + 6 + k * 12, 120 - k * 4, 2);
    }

    // The chasm and its two rope bridges.
    chasm(g, CHASM, CHASM_W, rng);
    for (const b of BRIDGES) ropeBridge(g, b.x0, b.x1, b.y, BRIDGE_HALF, rng);

    // The Whispering Gallery's floor.
    galleryFloor(g, GALLERY.x, GALLERY.y, GALLERY_RX, GALLERY_RY);

    // The ringing pool in its gours.
    ringingPool(g, POOL_RECT, rng);

    // The Chime Hall's shadows.
    for (const c of CHIMES) chimeShadow(g, c.x, c.y, 14 + c.len * 0.12, 0.2);

    // The dead spot: soft wet floor under the chasm's foot.
    g.fillStyle(0x0a0c10, 0.5); g.fillEllipse(DEAD_SPOT.x, DEAD_SPOT.y, 200, 80);
    g.fillStyle(0x1a2028, 0.6); g.fillEllipse(DEAD_SPOT.x, DEAD_SPOT.y, 150, 56);
    for (let i = 0; i < 6; i++) cressPatch(g, DEAD_SPOT.x - 80 + i * 32, DEAD_SPOT.y + (i % 2 ? 18 : -14), rng);

    // Dropped hymn sheets and cress about the streets.
    for (let i = 0; i < 26; i++) hymnSheet(g, 900 + rng() * 1400, 500 + rng() * 950, rng() * 6);
    for (let i = 0; i < 12; i++) cressPatch(g, 100 + rng() * 2200, 260 + rng() * 1250, rng);
    // Lamp pools of warm light at the north grotto doors.
    for (const h of HOUSES) { g.fillStyle(LAMP, 0.05); g.fillEllipse(h.x, h.y + 24, h.w * 1.1, 50); }
  },

  pieces,

  animate(g, t, view) {
    // Rings on the ringing pool.
    if (inView(POOL_RECT.x + POOL_RECT.w / 2, POOL_RECT.y + POOL_RECT.h / 2, view, 300)) poolRings(g, POOL_RECT, t);
    // Drips.
    for (let i = 0; i < DRIPS.length; i++) if (inView(DRIPS[i].x, DRIPS[i].y, view)) drip(g, DRIPS[i].x, DRIPS[i].y, t, i * 0.37);
    // The Repeat leaving the Echo Wall: little notes drifting out of the stone and fading.
    if (inView(ECHO_WALL.x, ECHO_WALL.y, view, 400)) {
      for (let i = 0; i < 10; i++) {
        const ph = (t * 0.12 + i / 10) % 1;
        const x = ECHO_WALL.x - ECHO_WALL_W / 2 + 40 + ((i * 97) % (ECHO_WALL_W - 80)) + Math.sin(t + i) * 8;
        const y = ECHO_WALL.y + 10 + ph * 160;
        const a = 0.5 * Math.sin(ph * Math.PI);
        g.fillStyle(BRONZE_LIT, a); g.fillEllipse(x, y, 7, 5);
        g.lineStyle(1.2, BRONZE_LIT, a); g.lineBetween(x + 3, y, x + 3, y - 12);
      }
      // A shimmer running along the carved stave, as the Repeat goes round.
      const sx = ECHO_WALL.x - ECHO_WALL_W / 2 + 20 + ((t * 90) % (ECHO_WALL_W - 40));
      glow(g, sx, ECHO_WALL.y - 170 * 0.66 + 18, 20, BRONZE_LIT, 0.05, 3);
    }
    // The gallery's plates breathing.
    if (inView(GALLERY.x, GALLERY.y, view, 300)) {
      const c = Math.sqrt(GALLERY_RX * GALLERY_RX - GALLERY_RY * GALLERY_RY);
      for (const k of [-1, 1]) {
        const ph = (t * 0.5 + (k > 0 ? 0.5 : 0)) % 1;
        g.lineStyle(1.5, GHOST, 0.5 * (1 - ph)); g.strokeEllipse(GALLERY.x + k * c, GALLERY.y, 30 + ph * 60, 12 + ph * 24);
      }
    }
    // The listening post's valve flickering.
    if (inView(POST.x, POST.y, view)) glow(g, POST.x + 70, POST.y - 30, 16 + Math.sin(t * 9) * 3, 0xffa860, 0.04, 2);
    // The dead spot's worms: brightest in the cave.
    if (inView(DEAD_SPOT.x, DEAD_SPOT.y, view)) {
      for (let i = 0; i < 18; i++) {
        const tw = 0.5 + Math.sin(t * 2 + i * 1.7) * 0.4;
        g.fillStyle(GLOW, tw); g.fillCircle(DEAD_SPOT.x - 90 + ((i * 47) % 180), DEAD_SPOT.y - 30 + ((i * 29) % 60), 1.6);
      }
    }
    // Lamp flicker in the grotto windows.
    for (const h of HOUSES) {
      if (!inView(h.x, h.y, view)) continue;
      const f = 0.03 + Math.sin(t * 7 + h.x) * 0.015;
      glow(g, h.x, h.y - h.h * 0.42, 30, LAMP, f, 2);
    }
  },

  animateOver(g, t, view) {
    // The Chime Hall: banded stalactites on chains, swinging a little, one ringing now and then.
    if (inView(CHIME_HALL.x, CHIME_HALL.y, view, 400)) {
      for (const c of CHIMES) {
        const sway = Math.sin(t * 0.9 + c.seed) * 0.05;
        const ring = Math.max(0, Math.sin(t * 0.7 + c.seed * 3) - 0.9) * 10;
        chime(g, c.x, c.y - 150 - c.len * 0.5, c.len, sway, ring);
      }
    }
    // Bats flitting out of the Hollow.
    if (inView(ROOST.x, ROOST.y, view, 300)) {
      for (let i = 0; i < 6; i++) {
        const a = t * (0.8 + i * 0.13) + i * 1.3;
        bat(g, ROOST.x + Math.cos(a) * (90 + i * 20), ROOST.y - 140 + Math.sin(a * 1.7) * 40, 0.8, (Math.sin(t * 14 + i) + 1) / 2);
      }
    }
    // A cold glow off the Shell's nacre.
    if (inView(SHELL.x, SHELL.y, view, 300)) glow(g, SHELL.x + 30, SHELL.y - 160, 90 + Math.sin(t * 0.6) * 10, REPRISE_LIT, 0.02, 3);
    // Glowworm light pooling along the north cliff.
    if (inView(view.x + view.w / 2, NORTH_Y, view, 0)) {
      for (let i = 0; i < 6; i++) {
        const x = view.x + ((i * 331 + 40) % Math.max(1, view.w));
        glow(g, x, NORTH_Y - 20, 60, GLOW_SOFT, 0.015, 2);
      }
    }
  },
};

export const CAVERN_AREA: AreaDef = {
  id: 'cavern',
  isle: 'sound',
  court: 'cavern',
  name: 'The Cavern Court',
  subtitle: 'Where the Score is sung into the rock, and comes back for ever',
  w: CAVERN_W,
  h: CAVERN_H,
  bg: ROCK_DEEP,
  accent: CAVERN_COLOR,
  weather: 'glowworms',
  gloom: 0.28,
  spawn: { x: 2260, y: EXIT_E_Y },
  painter,
  solids,
  exits: [
    { side: 'e', to: 'brass', label: 'Out through the cave mouth to the Brass Court' },
    { side: 's', to: 'libretto', label: 'Down the carved steps to the Libretto Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: WAYSTONE.x, y: WAYSTONE.y + 40 } },
    { kind: 'prince', id: 'reprise', at: { x: SHELL.x - 20, y: SHELL.y + 50 } },
    { kind: 'water', id: 'cavern-pool', shape: POOL_RECT, fishery: 'cavern-pool' },
    { kind: 'encounter', id: 'cavern-whispering-gallery' },
    { kind: 'encounter', id: 'cavern-stalactite-chimes' },
    { kind: 'encounter', id: 'cavern-call-and-answer' },
    { kind: 'encounter', id: 'cavern-feedback' },
    { kind: 'encounter', id: 'cavern-sonar' },
    ...SIGNS.map((s) => ({ kind: 'sign' as const, at: { x: s.at.x, y: s.at.y + 20 }, text: s.text })),
    { kind: 'chest', id: 'cavern-chest-hollow', at: { x: 200, y: 1440 }, coins: 110 },
    { kind: 'chest', id: 'cavern-chest-shell', at: { x: 180, y: 440 }, orbs: 2, open: { prince: 'reprise' } },
  ],
  npcs: CAVERN_NPCS,
  crowd: CAVERN_CROWD,
};
