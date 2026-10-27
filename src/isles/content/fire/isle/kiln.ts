import type { AreaDef, Poi, Pt, Rect, Solid, WorldGate, WorldHazard } from '../../../IslesTypes';
import { type G, brandSigil, flagstones, glow, lit, motes, shadow } from '../../../art/IsleArt';

/**
 * The Kiln — King Ashgrave's citadel furnace, built into the throat of the volcano.
 *
 * A vertical climb, bottom to top. You come in through the barge door from the Caldera rim and
 * walk up through three furnace halls, each a different machine and a different kind of danger,
 * each closed by a warden. Above the last gate is the throne room, where the King has sat
 * without moving since his fourth child fell.
 *
 *   Hall I   — The Tithe Furnace  (y 1800–2560): rows of timed flame jets, then a slag channel
 *              that only crusts over once the east Quench Lever is pulled. Warden: Mordaunt.
 *   Hall II  — The Brandline      (y 1000–1760): conveyor belts of branding irons running into
 *              presses, three sweeping arms, and a grate opened by the west lever. Warden: Vell.
 *   Hall III — The Bellows Gallery (y  330– 960): a bellows draught that shoves you back, a
 *              second slag channel (west lever), a travelling wave of jets and two great arms.
 *              Warden: Grisle.
 *   Throne   — (y 40–300): the monarch.
 *
 * There is no health in the world: a hazard throws you back to the last checkpoint.
 */

const W = 1800;
const H = 2600;
/** Hall interiors run between the citadel walls. */
const L = 300;
const R = 1500;
const DOOR_L = 820;
const DOOR_R = 980;

// Palette — firebrick, iron, slag and the King's red.
const BRICK = 0x2a1612;
const BRICK_LIT = 0x4a2418;
const IRON = 0x2a2422;
const SLAG = 0x3a1a0a;
const EMBER = 0xff6a1a;
const GOLD = 0xffc65a;

// ── Hazards ──────────────────────────────────────────────────────────

const hazards: WorldHazard[] = [];

// Hall I: three rows of jets, each split into three nozzle runs whose bursts roll across the hall.
for (let row = 0; row < 3; row++) {
  const y = 2250 - row * 80;
  for (let seg = 0; seg < 3; seg++) {
    hazards.push({
      kind: 'jet', rect: { x: L + seg * 400, y, w: 400, h: 40 },
      periodMs: 2600, onMs: 1000, offsetMs: seg * 520 + row * 700, color: EMBER,
    });
  }
}
// Hall I slag channel — safe once the east Quench Lever is pulled.
hazards.push({ kind: 'floor', rect: { x: L, y: 1960, w: R - L, h: 60 }, safeWhen: { flag: 'kiln-lever-1' }, color: 0xff4a0a });

// Hall II: two brand belts, each feeding a press at its far end.
const BELTS: { rect: Rect; vx: number }[] = [
  { rect: { x: L, y: 1600, w: R - L, h: 60 }, vx: 150 },
  { rect: { x: L, y: 1510, w: R - L, h: 60 }, vx: -170 },
];
for (const b of BELTS) hazards.push({ kind: 'conveyor', rect: b.rect, vx: b.vx, vy: 0 });
hazards.push(
  { kind: 'jet', rect: { x: R - 80, y: 1600, w: 80, h: 60 }, periodMs: 1800, onMs: 1100, color: 0xffa040 },
  { kind: 'jet', rect: { x: L, y: 1510, w: 80, h: 60 }, periodMs: 1800, onMs: 1100, offsetMs: 900, color: 0xffa040 },
);
// Hall II: the brandline arms — two flanking, one in the middle turning the other way.
const ARMS: { x: number; y: number; length: number; rad: number; phase: number }[] = [
  { x: 560, y: 1240, length: 160, rad: 1.5, phase: 0 },
  { x: 1240, y: 1240, length: 160, rad: -1.5, phase: Math.PI },
  { x: 900, y: 1320, length: 180, rad: -1.1, phase: Math.PI / 2 },
  // Hall III: the gallery's two great arms.
  // Mirrored, so both arms meet in the middle at once — wait for them to pass, then go.
  { x: 640, y: 500, length: 270, rad: 1.25, phase: 0 },
  { x: 1160, y: 500, length: 270, rad: -1.25, phase: Math.PI },
];
for (const a of ARMS) hazards.push({ kind: 'sweeper', x: a.x, y: a.y, length: a.length, radPerSec: a.rad, phase: a.phase, color: EMBER });

// Hall III: the bellows draught pushing you back down the gallery.
const DRAUGHT: Rect = { x: L, y: 790, w: R - L, h: 80 };
hazards.push({ kind: 'conveyor', rect: DRAUGHT, vx: 0, vy: 130 });
// Hall III slag channel — safe once the west Quench Lever is pulled.
hazards.push({ kind: 'floor', rect: { x: L, y: 720, w: R - L, h: 60 }, safeWhen: { flag: 'kiln-lever-3' }, color: 0xff4a0a });
// Hall III: a travelling wave of jets — walk with the gap.
for (let seg = 0; seg < 6; seg++) {
  hazards.push({
    kind: 'jet', rect: { x: L + seg * 200, y: 600, w: 200, h: 50 },
    periodMs: 2100, onMs: 1100, offsetMs: seg * 350, color: 0xffb347,
  });
}

// ── Gates ────────────────────────────────────────────────────────────

const gates: WorldGate[] = [
  { rect: { x: DOOR_L, y: 1760, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'kiln-warden-1' }, look: 'portcullis', label: 'Defeat the Tithe-Warden' },
  { rect: { x: DOOR_L, y: 1100, w: DOOR_R - DOOR_L, h: 30 }, open: { flag: 'kiln-lever-2' }, look: 'grate', label: 'Pull the brandline lever' },
  { rect: { x: DOOR_L, y: 960, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'kiln-warden-2' }, look: 'portcullis', label: 'Defeat the Brand-Master' },
  { rect: { x: DOOR_L, y: 300, w: DOOR_R - DOOR_L, h: 30 }, open: { encounter: 'kiln-warden-3' }, look: 'barrier', label: 'Defeat the Bellows-Keeper' },
];

/** The cross-walls with their doorways (the gates fill the doorways). */
const CROSS_WALLS: { y: number; h: number }[] = [
  { y: 1760, h: 40 }, { y: 1100, h: 30 }, { y: 960, h: 40 }, { y: 300, h: 30 },
];

const solids: Solid[] = [
  { kind: 'rect', x: 0, y: 0, w: L, h: H },
  { kind: 'rect', x: R, y: 0, w: W - R, h: H },
  { kind: 'rect', x: L, y: 0, w: R - L, h: 44 },
  { kind: 'rect', x: L, y: H - 44, w: R - L, h: 44 },
];
for (const c of CROSS_WALLS) {
  solids.push({ kind: 'rect', x: L, y: c.y, w: DOOR_L - L, h: c.h }, { kind: 'rect', x: DOOR_R, y: c.y, w: R - DOOR_R, h: c.h });
}
// The throne room is narrower — buttresses either side.
solids.push({ kind: 'rect', x: L, y: 44, w: 160, h: 256 }, { kind: 'rect', x: R - 160, y: 44, w: 160, h: 256 });

// ── Ground ───────────────────────────────────────────────────────────

/** A slag channel bed — a stone trough, its floor scorched black-orange. */
function channelBed(g: G, y: number, h: number, rng: () => number): void {
  g.fillStyle(0x0a0404, 1); g.fillRect(L, y - 6, R - L, h + 12);
  g.fillStyle(SLAG, 1); g.fillRect(L, y, R - L, h);
  for (let i = 0; i < 70; i++) {
    g.fillStyle(rng() < 0.5 ? 0x5a2a0e : 0x1a0a04, 0.8);
    g.fillEllipse(L + rng() * (R - L), y + 6 + rng() * (h - 12), 30 + rng() * 60, 6 + rng() * 8);
  }
  g.lineStyle(3, 0x5a3a2a, 1); g.lineBetween(L, y - 4, R, y - 4); g.lineBetween(L, y + h + 4, R, y + h + 4);
}

/** A jet row's nozzle plates, so you can see where the fire will come from when it is off. */
function nozzles(g: G, r: Rect): void {
  g.fillStyle(0x0e0806, 1); g.fillRect(r.x, r.y, r.w, r.h);
  g.fillStyle(0x1e1412, 1); g.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  const n = Math.max(2, Math.floor(r.w / 34));
  for (let i = 0; i < n; i++) {
    const x = r.x + (r.w / n) * (i + 0.5);
    g.fillStyle(0x0a0404, 1); g.fillCircle(x, r.y + r.h / 2, Math.min(9, r.h * 0.22));
    g.lineStyle(2, 0x4a3a32, 1); g.strokeCircle(x, r.y + r.h / 2, Math.min(9, r.h * 0.22) + 2);
  }
}

function paintGround(g: G, rng: () => number): void {
  // The rock the citadel is cut into, outside the walls.
  g.fillStyle(0x0a0606, 1); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 400; i++) {
    g.fillStyle(rng() < 0.5 ? 0x140c0a : 0x1e1210, 1);
    g.fillEllipse(rng() * W, rng() * H, 40 + rng() * 120, 20 + rng() * 60);
  }
  // Hall I floor: iron grating over a coal bed.
  g.fillStyle(0x3a1206, 1); g.fillRect(L, 1800, R - L, 760);
  for (let i = 0; i < 300; i++) {
    g.fillStyle(rng() < 0.4 ? 0xff6a1a : 0x7a2a0a, 0.3 + rng() * 0.4);
    g.fillCircle(L + rng() * (R - L), 1800 + rng() * 760, 2 + rng() * 4);
  }
  g.lineStyle(5, IRON, 1);
  for (let x = L; x <= R; x += 26) g.lineBetween(x, 1800, x, 2560);
  g.lineStyle(7, 0x1a1412, 1);
  for (let y = 1800; y <= 2560; y += 64) g.lineBetween(L, y, R, y);
  // The entry landing at the bottom: solid flagstones under the barge door.
  flagstones(g, { x: 700, y: 2380, w: 400, h: 180 }, 36, 0x3a2e2a, 0x140c0a, rng);
  // Warden I's dais.
  flagstones(g, { x: L, y: 1800, w: R - L, h: 150 }, 40, 0x3a2420, 0x160c0a, rng);
  brandSigil(g, 900, 1868, 46, 0x5a1a0a, 0.7);

  // Hall II floor: oily iron plates, worn into tracks by the brand carts.
  flagstones(g, { x: L, y: 1000, w: R - L, h: 760 }, 60, 0x2a2420, 0x100a08, rng);
  for (let i = 0; i < 40; i++) {
    g.fillStyle(0x0a0606, 0.5); g.fillEllipse(L + rng() * (R - L), 1000 + rng() * 760, 40 + rng() * 60, 10 + rng() * 10);
  }
  // Belt beds.
  for (const b of BELTS) {
    g.fillStyle(0x0a0606, 1); g.fillRect(b.rect.x, b.rect.y - 8, b.rect.w, b.rect.h + 16);
    g.fillStyle(0x1a1614, 1); g.fillRect(b.rect.x, b.rect.y, b.rect.w, b.rect.h);
    g.fillStyle(0x3a302c, 1); g.fillRect(b.rect.x, b.rect.y - 8, b.rect.w, 4); g.fillRect(b.rect.x, b.rect.y + b.rect.h + 4, b.rect.w, 4);
  }
  // Sweeper hubs: iron turntables bolted into the floor.
  for (const a of ARMS) {
    g.fillStyle(0x0a0606, 1); g.fillCircle(a.x, a.y, 26);
    g.fillStyle(0x3a302c, 1); g.fillCircle(a.x, a.y, 20);
    g.lineStyle(1.5, 0x5a4a42, 0.5); g.strokeCircle(a.x, a.y, a.length);
    for (let k = 0; k < 6; k++) {
      const an = (k / 6) * Math.PI * 2;
      g.fillStyle(0x5a4a42, 1); g.fillCircle(a.x + Math.cos(an) * 14, a.y + Math.sin(an) * 14, 2);
    }
  }
  // Warden II's dais above the lever grate.
  flagstones(g, { x: L, y: 1000, w: R - L, h: 100 }, 40, 0x3a2a26, 0x160c0a, rng);
  brandSigil(g, 900, 1052, 34, 0x3a2a26, 0.9);

  // Hall III floor: soot-black brick, swept clean by the draught in long streaks.
  flagstones(g, { x: L, y: 330, w: R - L, h: 630 }, 34, 0x221816, 0x0c0606, rng);
  for (let i = 0; i < 80; i++) {
    g.fillStyle(0x3a2e2a, 0.25); g.fillRect(L + rng() * (R - L), 330 + rng() * 630, 2, 30 + rng() * 60);
  }
  g.fillStyle(0x2a1e1a, 0.6); g.fillRect(DRAUGHT.x, DRAUGHT.y, DRAUGHT.w, DRAUGHT.h);
  flagstones(g, { x: L, y: 330, w: R - L, h: 90 }, 40, 0x342624, 0x140a08, rng);

  // Slag channels and jet rows.
  channelBed(g, 1960, 60, rng);
  channelBed(g, 720, 60, rng);
  for (const h of hazards) if (h.kind === 'jet') nozzles(g, h.rect);

  // The throne room: a red runner up to the dais, the sigil in gold mosaic.
  flagstones(g, { x: L + 160, y: 44, w: R - L - 320, h: 256 }, 30, 0x3a2420, 0x1a0c0a, rng);
  g.fillStyle(0x5a0e0a, 1); g.fillRect(860, 100, 80, 200);
  g.fillStyle(0x7a1a12, 1); g.fillRect(866, 100, 68, 200);
  g.lineStyle(2, GOLD, 0.6); g.lineBetween(866, 100, 866, 300); g.lineBetween(934, 100, 934, 300);
  brandSigil(g, 900, 230, 40, 0x8a6a2a, 0.8);
  brandSigil(g, 900, 230, 34, GOLD, 0.35);

  // The walls: firebrick faces on the inner edges, glowing mortar.
  for (const [x0, x1] of [[L - 40, L], [R, R + 40]] as [number, number][]) {
    for (let y = 0; y < H; y += 16) {
      const off = (y / 16) % 2 ? 0 : 10;
      for (let x = x0 - off; x < x1; x += 20) {
        g.fillStyle(rng() < 0.5 ? BRICK : BRICK_LIT, 1);
        g.fillRect(Math.max(x0, x), y + 1, Math.min(18, x1 - Math.max(x0, x)), 14);
      }
    }
    g.fillStyle(EMBER, 0.12); g.fillRect(x0 === L - 40 ? L - 3 : R, 0, 3, H);
  }
  for (const c of CROSS_WALLS) {
    for (const [x0, x1] of [[L, DOOR_L], [DOOR_R, R]] as [number, number][]) {
      g.fillStyle(0x0a0404, 1); g.fillRect(x0, c.y - 4, x1 - x0, c.h + 8);
      for (let x = x0; x < x1; x += 22) {
        g.fillStyle(rng() < 0.5 ? BRICK : BRICK_LIT, 1); g.fillRect(x + 1, c.y, 20, c.h);
      }
      g.fillStyle(lit(BRICK_LIT, 0.2), 1); g.fillRect(x0, c.y, x1 - x0, 3);
    }
  }
}

// ── Set pieces ───────────────────────────────────────────────────────

type Piece = NonNullable<AreaDef['painter']['pieces']>[number];
const pieces: Piece[] = [];

/** A furnace mouth set into a side wall, the coal behind it breathing. */
function furnace(x: number, y: number, side: -1 | 1): void {
  pieces.push({
    x, y, w: 120, h: 140, draw: (g) => {
      const fx = x + side * 6;
      g.fillStyle(0x0a0404, 1); g.fillRoundedRect(fx - 50, y - 120, 100, 120, { tl: 40, tr: 40, bl: 0, br: 0 });
      g.fillStyle(BRICK_LIT, 1); g.fillRoundedRect(fx - 44, y - 114, 88, 114, { tl: 36, tr: 36, bl: 0, br: 0 });
      g.fillStyle(0x1a0604, 1); g.fillRoundedRect(fx - 32, y - 92, 64, 92, { tl: 28, tr: 28, bl: 0, br: 0 });
      g.fillStyle(EMBER, 0.75); g.fillRoundedRect(fx - 26, y - 60, 52, 60, { tl: 18, tr: 18, bl: 0, br: 0 });
      g.fillStyle(0xffd27a, 0.7); g.fillRect(fx - 20, y - 18, 40, 18);
      brandSigil(g, fx, y - 104, 8, GOLD, 0.6);
    },
  });
}
for (const y of [2200, 2000, 1700, 1400]) { furnace(L + 50, y, -1); furnace(R - 50, y, 1); }
solids.push(
  { kind: 'rect', x: L, y: 2160, w: 50, h: 40 }, { kind: 'rect', x: R - 50, y: 2160, w: 50, h: 40 },
);

/** A brand rack: irons hanging cold, sigils down. */
function brandRack(x: number, y: number): void {
  pieces.push({
    x, y, w: 120, h: 100, draw: (g) => {
      shadow(g, x, y + 2, 110, 14);
      g.fillStyle(IRON, 1); g.fillRect(x - 50, y - 70, 6, 70); g.fillRect(x + 44, y - 70, 6, 70); g.fillRect(x - 52, y - 74, 104, 6);
      for (let i = 0; i < 6; i++) {
        const ix = x - 38 + i * 15;
        g.lineStyle(3, 0x3a302c, 1); g.lineBetween(ix, y - 68, ix, y - 22);
        brandSigil(g, ix, y - 16, 5, i % 3 === 0 ? 0x7a2a0a : 0x4a3a32, 1);
      }
    },
  });
  solids.push({ kind: 'rect', x: x - 52, y: y - 12, w: 104, h: 12 });
}
brandRack(420, 1730);
brandRack(1380, 1730);
brandRack(420, 1460);

/** The great bellows on the gallery walls. Animated in `animate`. */
const BELLOWS: Pt[] = [{ x: L + 10, y: 520 }, { x: R - 10, y: 520 }];

/** A stoker's alcove: a cot, a bucket, a tin cup on a ledge. */
function stokerAlcove(x: number, y: number, cup: boolean): void {
  pieces.push({
    x, y, w: 140, h: 80, draw: (g) => {
      shadow(g, x, y, 100, 14);
      g.fillStyle(0x3a2a1e, 1); g.fillRect(x - 46, y - 18, 92, 16);
      g.fillStyle(0x5a4a3a, 1); g.fillRect(x - 44, y - 22, 88, 8);
      g.fillStyle(0x2a2420, 1); g.fillRect(x - 46, y - 2, 6, 8); g.fillRect(x + 40, y - 2, 6, 8);
      g.fillStyle(0x3a302c, 1); g.fillRoundedRect(x + 54, y - 16, 16, 18, 3);
      if (cup) {
        g.fillStyle(0x1a1412, 1); g.fillRect(x - 70, y - 50, 40, 5);
        g.fillStyle(0x8a8a8a, 1); g.fillRect(x - 56, y - 60, 10, 10);
        g.lineStyle(1.5, 0x8a8a8a, 1); g.strokeCircle(x - 44, y - 55, 3);
        // Tally marks scratched into the wall above the ledge.
        g.lineStyle(1, 0x6a5a52, 0.8);
        for (let k = 0; k < 22; k++) g.lineBetween(x - 72 + k * 3, y - 80, x - 72 + k * 3 + (k % 5 === 4 ? -12 : 0), y - 68);
      }
    },
  });
  solids.push({ kind: 'rect', x: x - 46, y: y - 16, w: 92, h: 16 });
}
stokerAlcove(420, 940, true);
stokerAlcove(1380, 940, false);

// The throne itself: black iron, a crown of spikes, a brazier either side.
pieces.push({
  x: 900, y: 140, w: 240, h: 200, draw: (g) => {
    shadow(g, 900, 142, 200, 30, 0.5);
    g.fillStyle(0x0a0606, 1); g.fillRect(820, 100, 160, 44);
    g.fillStyle(0x2a1e1a, 1); g.fillRect(826, 104, 148, 36);
    g.fillStyle(0x140c0a, 1); g.fillRect(852, 34, 96, 80);
    g.fillStyle(0x3a1a12, 1); g.fillRect(858, 40, 84, 70);
    for (let k = 0; k < 7; k++) {
      const sx = 852 + k * 16;
      g.fillStyle(0x140c0a, 1); g.fillTriangle(sx, 36, sx + 12, 36, sx + 6, 6 + (k % 2) * 10);
      g.fillStyle(GOLD, 0.6); g.fillCircle(sx + 6, 14 + (k % 2) * 10, 2);
    }
    brandSigil(g, 900, 72, 18, GOLD, 0.8);
    g.fillStyle(0x7a1a12, 1); g.fillRect(860, 104, 80, 14);
  },
});
solids.push({ kind: 'rect', x: 820, y: 100, w: 160, h: 44 });
for (const bx of [700, 1100]) {
  pieces.push({
    x: bx, y: 170, w: 60, h: 90, draw: (g) => {
      shadow(g, bx, 172, 50, 12);
      g.lineStyle(4, 0x1a1412, 1); g.lineBetween(bx - 12, 170, bx, 130); g.lineBetween(bx + 12, 170, bx, 130);
      g.fillStyle(0x1a1412, 1); g.fillEllipse(bx, 126, 46, 18);
      g.fillStyle(0x7a2a12, 1); g.fillEllipse(bx, 122, 38, 10);
    },
  });
  solids.push({ kind: 'circle', x: bx, y: 160, r: 16 });
}

// ── Animation ────────────────────────────────────────────────────────

const near = (v: Rect, x: number, y: number, pad: number): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

function animateUnder(g: G, t: number, view: Rect): void {
  // Brand belts: slats and riding irons moving at the belt's own speed.
  for (const b of BELTS) {
    if (!near(view, 900, b.rect.y, 400)) continue;
    const off = ((t * b.vx) % 40 + 40) % 40;
    for (let x = b.rect.x - 40 + off; x < b.rect.x + b.rect.w; x += 40) {
      if (x < b.rect.x) continue;
      g.fillStyle(0x2e2622, 1); g.fillRect(x, b.rect.y + 4, 4, b.rect.h - 8);
    }
    const ioff = ((t * b.vx) % 160 + 160) % 160;
    for (let x = b.rect.x + ioff - 160; x < b.rect.x + b.rect.w; x += 160) {
      if (x < b.rect.x + 20 || x > b.rect.x + b.rect.w - 30) continue;
      const cy = b.rect.y + b.rect.h / 2;
      // Irons heat as they ride toward the press at the belt's far end.
      const prog = (x - b.rect.x) / b.rect.w;
      const heat = Math.max(0.15, b.vx > 0 ? prog : 1 - prog);
      const head = lit(0x7a1a0a, heat * 0.8);
      g.lineStyle(4, 0x2a2420, 1); g.lineBetween(x - 26 * Math.sign(b.vx), cy, x, cy);
      glow(g, x + 8 * Math.sign(b.vx), cy, 14, EMBER, 0.05 * heat, 2);
      brandSigil(g, x + 8 * Math.sign(b.vx), cy, 9, head, 1);
    }
  }
  // Bellows draught: streaks blowing down the gallery.
  if (near(view, 900, DRAUGHT.y, 300)) {
    for (let i = 0; i < 26; i++) {
      const x = L + 20 + ((i * 173) % (R - L - 40));
      const y = DRAUGHT.y + ((t * 220 + i * 37) % DRAUGHT.h);
      g.lineStyle(2, 0xd8d0c8, 0.25);
      g.lineBetween(x, y, x, y + 18);
    }
  }
  // Slag channels shimmer.
  for (const y of [1960, 720]) {
    if (!near(view, 900, y, 200)) continue;
    for (let i = 0; i < 20; i++) {
      const x = L + ((i * 211 + t * 30) % (R - L));
      const k = Math.sin(t * 2 + i) * 0.5 + 0.5;
      g.fillStyle(0xff7a2a, 0.12 + k * 0.18); g.fillEllipse(x, y + 30 + Math.sin(i) * 14, 40, 6);
    }
  }
  // Coal glow breathing under the Hall I grating.
  if (near(view, 900, 2200, 400)) {
    for (let i = 0; i < 14; i++) {
      const x = L + 60 + ((i * 331) % (R - L - 120)), y = 1820 + ((i * 197) % 700);
      glow(g, x, y, 40 + Math.sin(t * 1.5 + i) * 8, EMBER, 0.035, 2);
    }
  }
}

function animateOver(g: G, t: number, view: Rect): void {
  // Furnace mouths flicker.
  for (const y of [2200, 2000, 1700, 1400]) {
    for (const x of [L + 44, R - 44]) {
      if (!near(view, x, y, 120)) continue;
      const f = Math.sin(t * 7 + y + x) * 0.5 + 0.5;
      glow(g, x, y - 40, 60 + f * 12, EMBER, 0.04, 3);
      for (let i = 0; i < 3; i++) {
        const ph = (t * 1.3 + i / 3) % 1;
        g.fillStyle(0xffb347, (1 - ph) * 0.7);
        g.fillCircle(x + Math.sin(t * 4 + i) * 10, y - 30 - ph * 70, 2);
      }
    }
  }
  // The two great bellows breathe — the draught rises and falls with them.
  for (const b of BELLOWS) {
    if (!near(view, b.x, b.y, 160)) continue;
    const s = b.x < 900 ? 1 : -1;
    const open = 0.5 + Math.sin(t * 1.6) * 0.5;
    const w = 40 + open * 50;
    g.fillStyle(0x2a160c, 1); g.fillTriangle(b.x, b.y - 110, b.x, b.y + 110, b.x + s * w, b.y);
    g.fillStyle(0x6a4028, 1); g.fillTriangle(b.x, b.y - 98, b.x, b.y + 98, b.x + s * (w - 10), b.y);
    g.lineStyle(2, 0x2a160c, 1);
    for (let k = 1; k < 6; k++) g.lineBetween(b.x, b.y - 98 + k * 33, b.x + s * (w - 10) * 0.8, b.y);
    g.fillStyle(IRON, 1); g.fillRect(b.x - 8, b.y - 116, 16, 232);
  }
  // Throne braziers.
  for (const bx of [700, 1100]) {
    if (!near(view, bx, 120, 100)) continue;
    glow(g, bx, 112, 50, EMBER, 0.06, 3);
    for (let i = 0; i < 5; i++) {
      const ph = (t * 1.8 + i * 0.21) % 1;
      g.fillStyle(i % 2 ? 0xffb347 : EMBER, (1 - ph) * 0.8);
      g.fillCircle(bx + Math.sin(t * 3 + i) * 8, 118 - ph * 44, (1 - ph) * 8 + 2);
    }
  }
  // Rising sparks everywhere — the whole citadel is a chimney.
  motes(g, view, -t, 26, 0xff8a3a, 30, 14, 1.4, 7);
}

// ── POIs ─────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  {
    kind: 'door', at: { x: 900, y: 2530 }, to: 'caldera', arrive: { x: 1200, y: 300 },
    label: 'The barge door — back to the Caldera rim',
  },
  { kind: 'lever', at: { x: 1440, y: 2400 }, flag: 'kiln-lever-1', label: 'Quench Lever' },
  { kind: 'lever', at: { x: 340, y: 1190 }, flag: 'kiln-lever-2', label: 'Brandline Grate Lever' },
  { kind: 'lever', at: { x: 340, y: 910 }, flag: 'kiln-lever-3', label: 'Quench Lever' },
  { kind: 'encounter', id: 'kiln-warden-1' },
  { kind: 'encounter', id: 'kiln-warden-2' },
  { kind: 'encounter', id: 'kiln-warden-3' },
  { kind: 'monarch', id: 'ashgrave', at: { x: 900, y: 196 } },
  { kind: 'sign', at: { x: 1000, y: 2470 }, text: 'THE KILN. All tithes rendered here. By order of the Brand-King.' },
  { kind: 'sign', at: { x: 1440, y: 2330 }, text: 'QUENCH LEVER — for stokers crossing the channel. Pull and wait for the crust.' },
  { kind: 'sign', at: { x: 1440, y: 1700 }, text: 'THE BRANDLINE. Irons to the presses. Keep your arms inside the belts.' },
  { kind: 'chest', id: 'kiln-chest-stokers', at: { x: 1450, y: 892 }, coins: 180, orbs: 3 },
];

export const KILN_AREA: AreaDef = {
  id: 'kiln',
  isle: 'fire',
  name: 'The Kiln',
  subtitle: 'King Ashgrave\'s citadel furnace',
  w: W,
  h: H,
  bg: 0x0a0606,
  accent: EMBER,
  weather: 'embers',
  spawn: { x: 900, y: 2480 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver },
  solids,
  exits: [],
  pois: POIS,
  npcs: [],
  gloom: 0.45,
  hazards,
  gates,
  checkpoints: [
    { x: 900, y: 2440 },   // Hall I landing
    { x: 900, y: 2050 },   // between the jets and the slag channel
    { x: 900, y: 1920 },   // Mordaunt's dais
    { x: 900, y: 1720 },   // Hall II entry
    { x: 1440, y: 1460 },  // past the belts
    { x: 760, y: 1060 },   // Vell's dais
    { x: 900, y: 920 },    // Hall III entry
    { x: 900, y: 690 },    // past the slag channel
    { x: 1430, y: 380 },   // Grisle's dais
    { x: 900, y: 270 },    // the throne room
  ],
};
