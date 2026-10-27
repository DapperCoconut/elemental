import type { Pt } from '../../../../IslesTypes';
import { type G, dim, lit, mixC, shadow } from '../../../../art/IsleArt';
import { poly } from '../../../water/isle/port/art';

/**
 * Windlass's own drawing kit — the palette and set-piece bricks for a harbour cut into the foot of
 * a cliff. Everything here is granite, rope and wind: houses are doors and windows quarried into
 * the rock face, the quays are dressed stone blocks, and anything that is not stone is lashed down.
 * Colour comes only from what the wind is allowed to carry — kites, washing, gull-white — and from
 * the King's brass, which turns up wherever somebody's breath is being counted.
 */

// ── Palette ──────────────────────────────────────────────────────────

/** The spire's rock: pale cold granite, banded where the strata run. */
export const GRANITE = 0x8a9098;
export const GRANITE_DARK = 0x50565f;
export const GRANITE_LIT = 0xbac0c8;
export const STRATA_A = 0x7a8089;
export const STRATA_B = 0x9aa0a8;
/** Sea-cliff lichen, egg-yolk yellow, and the white the gulls leave on every ledge. */
export const LICHEN = 0xd0b850;
export const GUANO = 0xeceae2;

/** The Shelf's paving: small granite setts, worn lighter down the middle of every street. */
export const SETT = 0x7c7a76;
export const SETT_ALT = 0x8e8b84;
export const SETT_DARK = 0x4e4c48;
/** The quays: big dressed blocks, salt-bleached. */
export const QUAY = 0xa8a49a;
export const QUAY_DARK = 0x5e5a52;

/** The cold harbour water under the cliff. */
export const SEA_SHALLOW = 0x4a8494;
export const SEA = 0x2e6278;
export const SEA_DEEP = 0x1c425a;
export const FOAM = 0xf0f6fa;
/** Cloud — the line that hangs across the clifftop, above which every breath is metered. */
export const CLOUD = 0xf2f6fa;
export const CLOUD_SHADE = 0xc8d4e0;

/** Timber, tarred rope and canvas — everything that has to be tied down. */
export const TIMBER = 0x7a5c40;
export const TIMBER_DARK = 0x3e2e22;
export const ROPE = 0xc8ac74;
export const CANVAS = 0xe4dcc8;
export const IRON = 0x34383e;

/** Lamp-light, warm against all that grey. */
export const LAMP = 0xffd48a;
export const OVEN = 0xffa850;

/** King Aerion's colours: thin sky blue and the brass of his breath-meters. */
export const AERION = 0x86d0f0;
export const AERION_DARK = 0x2a5a7a;
export const BRASS = 0xd4aa4a;
export const BRASS_DARK = 0x7a5e26;
/** Bottled breath: the faint blue-white mist the collectors cork. */
export const BREATH = 0xd8f0ff;

/** Kite-market cloth, every colour the wind will take. */
export const KITE_COLS = [0xe85a4a, 0xf0c040, 0x4ab0d8, 0x7ac85a, 0xc85ab0, 0xf08a3a, 0xf4f0e0, 0x5a6ad8];

export { poly };

// ── Emblems ──────────────────────────────────────────────────────────

/**
 * King Aerion's seal: a pair of bellows under a three-pointed crown, two lines of wind drawn in
 * at the nozzle. Stamped on every breath-meter, every cork and every crate that goes up the lift.
 */
export function aerionSeal(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  // The bellows' boards: a rounded heart, nozzle pointing down.
  g.fillStyle(color, a);
  g.fillEllipse(x, y - r * 0.05, r * 1.15, r * 1.0);
  g.fillTriangle(x - r * 0.42, y + r * 0.25, x + r * 0.42, y + r * 0.25, x, y + r * 0.95);
  // The nozzle.
  g.fillRect(x - r * 0.07, y + r * 0.8, r * 0.14, r * 0.3);
  // The pleats, cut out of it.
  g.lineStyle(Math.max(1, r * 0.08), dim(color, 0.55), a);
  for (let k = -1; k <= 1; k++) g.lineBetween(x + k * r * 0.26, y - r * 0.35, x + k * r * 0.12, y + r * 0.45);
  // The crown above.
  g.fillStyle(color, a);
  g.fillRect(x - r * 0.45, y - r * 0.72, r * 0.9, r * 0.18);
  for (const k of [-1, 0, 1]) g.fillTriangle(x + k * r * 0.36 - r * 0.13, y - r * 0.7, x + k * r * 0.36 + r * 0.13, y - r * 0.7, x + k * r * 0.36, y - r * (k === 0 ? 1.12 : 0.98));
  // Two wind lines drawn in toward the nozzle.
  g.lineStyle(Math.max(1, r * 0.07), color, a * 0.8);
  for (const s of [-1, 1]) {
    g.beginPath(); g.arc(x + s * r * 0.75, y + r * 0.95, r * 0.42, s < 0 ? -Math.PI * 0.5 : Math.PI, s < 0 ? 0 : Math.PI * 1.5, false); g.strokePath();
  }
}

/** A brass breath-meter dial: the gauge strapped over every heart on Highspire. Needle at `ang` (rad). */
export function meterDial(g: G, x: number, y: number, r: number, ang: number, a = 1): void {
  g.fillStyle(BRASS_DARK, a); g.fillCircle(x, y, r + Math.max(1, r * 0.18));
  g.fillStyle(BRASS, a); g.fillCircle(x, y, r);
  g.fillStyle(0xf4ecd8, a); g.fillCircle(x, y, r * 0.78);
  // Ticks round the top three-quarters, the red debt-band at the end.
  for (let k = 0; k <= 8; k++) {
    const t = -Math.PI * 1.25 + (k / 8) * Math.PI * 1.5;
    g.lineStyle(Math.max(1, r * 0.06), k >= 7 ? 0xc83a3a : 0x3a3428, a);
    g.lineBetween(x + Math.cos(t) * r * 0.55, y + Math.sin(t) * r * 0.55, x + Math.cos(t) * r * 0.72, y + Math.sin(t) * r * 0.72);
  }
  g.lineStyle(Math.max(1, r * 0.08), 0x1a1612, a);
  g.lineBetween(x, y, x + Math.cos(ang) * r * 0.66, y + Math.sin(ang) * r * 0.66);
  g.fillStyle(BRASS_DARK, a); g.fillCircle(x, y, Math.max(1, r * 0.12));
}

// ── Breath ───────────────────────────────────────────────────────────

/** A corked bottle of breath: clear glass, a curl of blue-white mist inside, the King's seal on the wax. */
export function breathBottle(g: G, x: number, y: number, s: number, a = 1): void {
  g.fillStyle(0x000000, 0.18 * a); g.fillEllipse(x, y + 1, s * 1.6, s * 0.5);
  g.fillStyle(0xa8c8d8, 0.55 * a); g.fillRoundedRect(x - s * 0.6, y - s * 2, s * 1.2, s * 2, s * 0.4);
  g.fillRect(x - s * 0.24, y - s * 2.7, s * 0.48, s * 0.8);
  g.fillStyle(BREATH, 0.85 * a); g.fillEllipse(x, y - s * 0.9, s * 0.8, s * 1.1);
  g.fillStyle(0xffffff, 0.6 * a); g.fillRect(x - s * 0.45, y - s * 1.8, s * 0.14, s * 1.3);
  // Cork and the wax seal over it.
  g.fillStyle(0x8a6a44, a); g.fillRect(x - s * 0.26, y - s * 3, s * 0.52, s * 0.42);
  g.fillStyle(AERION_DARK, a); g.fillCircle(x, y - s * 2.95, s * 0.3);
}

/** A slatted crate of corked breath bound for the lift, six bottles showing over the rim. */
export function bottleCrate(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 1, s * 3, s * 0.7);
  for (let k = 0; k < 6; k++) breathBottle(g, x - s * 1.05 + (k % 3) * s * 1.05, y - s * 1.6 - (k < 3 ? 0 : s * 0.25), s * 0.42);
  g.fillStyle(dim(TIMBER, 0.4), 1); g.fillRect(x - s * 1.4 - 1, y - s * 1.7 - 1, s * 2.8 + 2, s * 1.7 + 2);
  g.fillStyle(TIMBER, 1); g.fillRect(x - s * 1.4, y - s * 1.7, s * 2.8, s * 1.7);
  g.lineStyle(1, dim(TIMBER, 0.45), 1);
  for (let k = 1; k < 3; k++) g.lineBetween(x - s * 1.4, y - s * 1.7 + k * s * 0.57, x + s * 1.4, y - s * 1.7 + k * s * 0.57);
  aerionSeal(g, x, y - s * 0.85, s * 0.42, AERION_DARK, 0.85);
}

// ── Rock you can live in ────────────────────────────────────────────

export interface CliffHouseOpts {
  /** Door colour (painted every spring against the salt). */
  door: number;
  /** Shutters and balcony trim. */
  trim: number;
  /** A line of washing strung across the face. */
  washing?: boolean;
  /** A wooden balcony hung off the face. */
  balcony?: boolean;
  /** A wind-chime of shells by the door. */
  chime?: boolean;
  glow?: number;
}

/**
 * A house quarried into the cliff face: only its front shows — a bevelled door frame cut in the
 * rock, deep-set windows with storm shutters, a lintel stone, and whatever the family has hung off
 * it. `x, y` is the middle of the doorstep (the cliff foot). Returns the door point.
 */
export function cliffHouse(g: G, x: number, y: number, w: number, h: number, o: CliffHouseOpts, rng: () => number): Pt {
  // The dressed face: a slightly paler panel where the rock was squared off.
  g.fillStyle(dim(GRANITE, 0.18), 1); g.fillRect(x - w / 2 - 4, y - h - 4, w + 8, h + 4);
  g.fillStyle(lit(GRANITE, 0.06), 1); g.fillRect(x - w / 2, y - h, w, h);
  for (let i = 0; i < (w * h) / 300; i++) {
    g.fillStyle(rng() < 0.5 ? STRATA_A : STRATA_B, 0.45);
    g.fillRect(x - w / 2 + rng() * (w - 12), y - h + rng() * (h - 6), 10 + rng() * 10, 2);
  }
  // Chisel marks round the edge of the panel.
  g.lineStyle(1, GRANITE_DARK, 0.5);
  for (let k = 0; k < h; k += 7) { g.lineBetween(x - w / 2, y - k, x - w / 2 + 4, y - k - 3); g.lineBetween(x + w / 2, y - k, x + w / 2 - 4, y - k - 3); }
  // The door: a round-headed opening cut deep, the door set back in it.
  g.fillStyle(GRANITE_DARK, 1); g.fillRoundedRect(x - 16, y - 46, 32, 46, { tl: 15, tr: 15, bl: 0, br: 0 });
  g.fillStyle(o.door, 1); g.fillRoundedRect(x - 12, y - 42, 24, 42, { tl: 12, tr: 12, bl: 0, br: 0 });
  g.lineStyle(1, dim(o.door, 0.4), 1); g.lineBetween(x, y - 42, x, y); g.lineBetween(x - 12, y - 22, x + 12, y - 22);
  g.fillStyle(BRASS, 1); g.fillCircle(x + 6, y - 20, 1.8);
  // Lintel stone with its keystone.
  g.fillStyle(lit(GRANITE, 0.2), 1); g.fillRect(x - 22, y - 52, 44, 6);
  g.fillStyle(lit(GRANITE, 0.28), 1); g.fillRect(x - 5, y - 56, 10, 10);
  // Deep-set windows either side, shutters latched open.
  const glowC = o.glow ?? LAMP;
  for (const s of [-1, 1]) {
    const wx = x + s * w * 0.3, wy = y - h * 0.58;
    g.fillStyle(GRANITE_DARK, 1); g.fillRect(wx - 11, wy - 13, 22, 26);
    g.fillStyle(glowC, 0.1); g.fillCircle(wx, wy, 22);
    g.fillStyle(glowC, 0.85); g.fillRect(wx - 8, wy - 10, 16, 20);
    g.fillStyle(GRANITE_DARK, 1); g.fillRect(wx - 1, wy - 10, 2, 20); g.fillRect(wx - 8, wy - 1, 16, 2);
    g.fillStyle(o.trim, 1); g.fillRect(wx - 20, wy - 13, 8, 26); g.fillRect(wx + 12, wy - 13, 8, 26);
    g.lineStyle(1, dim(o.trim, 0.4), 1); for (let k = 0; k < 4; k++) { g.lineBetween(wx - 20, wy - 8 + k * 6, wx - 12, wy - 8 + k * 6); g.lineBetween(wx + 12, wy - 8 + k * 6, wx + 20, wy - 8 + k * 6); }
    // The storm-hook that holds each shutter back.
    g.lineStyle(1, IRON, 1); g.lineBetween(wx - 20, wy, wx - 26, wy + 2); g.lineBetween(wx + 20, wy, wx + 26, wy + 2);
  }
  if (o.balcony) {
    const by = y - h * 0.32;
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + w * 0.12, by, w * 0.36, 5);
    for (let k = 0; k <= 5; k++) g.fillRect(x + w * 0.12 + k * w * 0.072, by - 14, 2, 14);
    g.fillRect(x + w * 0.12, by - 15, w * 0.36, 3);
    g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(x + w * 0.14, by + 5, x + w * 0.2, by + 18); g.lineBetween(x + w * 0.46, by + 5, x + w * 0.4, by + 18);
  }
  if (o.washing) {
    const ly = y - h + 12;
    g.lineStyle(1, ROPE, 0.9); g.lineBetween(x - w / 2 + 4, ly, x + w / 2 - 4, ly + 4);
    for (let k = 0; k < 5; k++) {
      const cx = x - w / 2 + 14 + k * (w - 28) / 4;
      const col = KITE_COLS[Math.floor(rng() * KITE_COLS.length)];
      g.fillStyle(col, 0.95); g.fillRect(cx - 5, ly + 1 + k * 0.8, 10, 12 + rng() * 6);
    }
  }
  if (o.chime) {
    g.lineStyle(1, ROPE, 1); g.lineBetween(x - 26, y - 50, x - 26, y - 40);
    for (let k = 0; k < 4; k++) { g.lineBetween(x - 30 + k * 3, y - 40, x - 30 + k * 3, y - 30 + (k % 2) * 4); g.fillStyle(0xf4ecdc, 1); g.fillCircle(x - 30 + k * 3, y - 29 + (k % 2) * 4, 1.6); }
  }
  return { x, y: y + 18 };
}

// ── Kites and gulls ──────────────────────────────────────────────────

/** A diamond kite: two crossed spars, a bowed face in two colours, a tail of knotted bows. */
export function kite(g: G, x: number, y: number, s: number, tilt: number, a: number, b: number, tailSway = 0, alpha = 1): void {
  const c = Math.cos(tilt), sn = Math.sin(tilt);
  const P = (dx: number, dy: number): [number, number] => [x + dx * c - dy * sn, y + dx * sn + dy * c];
  const top = P(0, -s * 1.2), bot = P(0, s * 1.5), lft = P(-s, -s * 0.2), rgt = P(s, -s * 0.2), mid = P(0, -s * 0.2);
  poly(g, [top, rgt, bot, lft], dim(a, 0.35), alpha);
  poly(g, [top, rgt, mid], a, alpha); poly(g, [lft, bot, mid], a, alpha);
  poly(g, [top, lft, mid], b, alpha); poly(g, [rgt, bot, mid], b, alpha);
  g.lineStyle(1, TIMBER_DARK, alpha); g.lineBetween(top[0], top[1], bot[0], bot[1]); g.lineBetween(lft[0], lft[1], rgt[0], rgt[1]);
  // The tail, swinging.
  let tx = bot[0], ty = bot[1];
  g.lineStyle(1, dim(a, 0.3), alpha);
  for (let k = 1; k <= 5; k++) {
    const nx = tx + Math.sin(tailSway + k * 0.9) * s * 0.35 - sn * s * 0.5, ny = ty + c * s * 0.55;
    g.lineBetween(tx, ty, nx, ny);
    g.fillStyle(k % 2 ? a : b, alpha); g.fillTriangle(nx - 3, ny - 2, nx + 3, ny - 2, nx, ny + 1); g.fillTriangle(nx - 3, ny + 3, nx + 3, ny + 3, nx, ny + 1);
    tx = nx; ty = ny;
  }
}

/** A herring gull in flight: an M of wings, a white body, the yellow bill. `flap` -1..1. */
export function gull(g: G, x: number, y: number, s: number, flap: number, facing = 1, alpha = 1): void {
  const lift = flap * s * 0.5;
  g.lineStyle(Math.max(1.5, s * 0.22), 0x8a96a2, alpha);
  g.beginPath(); g.moveTo(x - s * 1.4, y - lift * 0.6); g.lineTo(x - s * 0.6, y - lift - s * 0.25); g.lineTo(x, y); g.lineTo(x + s * 0.6, y - lift - s * 0.25); g.lineTo(x + s * 1.4, y - lift * 0.6); g.strokePath();
  g.lineStyle(Math.max(1, s * 0.12), 0x2a2e34, alpha);
  g.lineBetween(x - s * 1.4, y - lift * 0.6, x - s * 1.15, y - lift * 0.8 - s * 0.1);
  g.lineBetween(x + s * 1.4, y - lift * 0.6, x + s * 1.15, y - lift * 0.8 - s * 0.1);
  g.fillStyle(0xf8f8f4, alpha); g.fillEllipse(x, y + s * 0.08, s * 0.9, s * 0.42);
  g.fillStyle(0xf0c040, alpha); g.fillTriangle(x + facing * s * 0.4, y, x + facing * s * 0.4, y + s * 0.14, x + facing * s * 0.62, y + s * 0.07);
}

/** A gull sitting: grey back, white breast, a red spot on the bill. */
export function gullSitting(g: G, x: number, y: number, s: number, facing = 1): void {
  g.fillStyle(0x000000, 0.18); g.fillEllipse(x, y + 1, s * 1.4, s * 0.35);
  g.fillStyle(0xf4f4f0, 1); g.fillEllipse(x, y - s * 0.4, s * 1.2, s * 0.8);
  g.fillStyle(0x8a96a2, 1); g.fillEllipse(x - facing * s * 0.12, y - s * 0.5, s * 1.0, s * 0.45);
  g.fillStyle(0x2a2e34, 1); g.fillTriangle(x - facing * s * 0.5, y - s * 0.55, x - facing * s * 0.85, y - s * 0.5, x - facing * s * 0.5, y - s * 0.35);
  g.fillStyle(0xf8f8f4, 1); g.fillCircle(x + facing * s * 0.45, y - s * 0.8, s * 0.26);
  g.fillStyle(0xf0c040, 1); g.fillTriangle(x + facing * s * 0.62, y - s * 0.84, x + facing * s * 0.62, y - s * 0.72, x + facing * s * 0.92, y - s * 0.78);
  g.fillStyle(0xd83a2a, 1); g.fillCircle(x + facing * s * 0.8, y - s * 0.76, 0.9);
  g.fillStyle(0x1a1a1a, 1); g.fillCircle(x + facing * s * 0.5, y - s * 0.86, 0.9);
  g.lineStyle(1, 0xe0a040, 1); g.lineBetween(x - s * 0.1, y - s * 0.05, x - s * 0.1, y); g.lineBetween(x + s * 0.12, y - s * 0.05, x + s * 0.12, y);
}

/**
 * A kite-market stall: a trestle under a striped awning roped to stone weights against the wind,
 * kites pinned up along its back board and spools of line on the counter. `x, y` is the counter's
 * middle at ground level.
 */
export function kiteStall(g: G, x: number, y: number, w: number, a: number, b: number, rng: () => number): void {
  shadow(g, x, y + 2, w * 1.15, 18, 0.3);
  // The back board, kites pinned flat on it.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2 + 4, y - 86, w - 8, 52);
  g.fillStyle(TIMBER, 1); g.fillRect(x - w / 2 + 6, y - 84, w - 12, 48);
  const n = Math.max(2, Math.floor(w / 34));
  for (let k = 0; k < n; k++) {
    const kx = x - w / 2 + 20 + k * ((w - 40) / Math.max(1, n - 1));
    kite(g, kx, y - 64, 9, (rng() - 0.5) * 0.4, KITE_COLS[(k * 3 + Math.floor(rng() * 4)) % KITE_COLS.length], KITE_COLS[(k * 5 + 2) % KITE_COLS.length], rng() * 6);
  }
  // Uprights.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2, y - 108, 5, 108); g.fillRect(x + w / 2 - 5, y - 108, 5, 108);
  // The awning: stripes, scalloped hem, bellied by the wind.
  const top = y - 112;
  const stripes = Math.floor(w / 14);
  for (let k = 0; k < stripes; k++) {
    const sx = x - w / 2 - 6 + k * ((w + 12) / stripes);
    g.fillStyle(k % 2 ? a : b, 1); g.fillRect(sx, top, (w + 12) / stripes + 1, 20);
    g.fillCircle(sx + (w + 12) / stripes / 2, top + 20, (w + 12) / stripes / 2);
  }
  g.fillStyle(0xffffff, 0.15); g.fillRect(x - w / 2 - 6, top, w + 12, 5);
  // Guy-ropes out to stone weights at either side.
  for (const s of [-1, 1]) {
    g.lineStyle(1, ROPE, 1); g.lineBetween(x + s * (w / 2 + 6), top + 4, x + s * (w / 2 + 26), y - 4);
    g.fillStyle(GRANITE_DARK, 1); g.fillRoundedRect(x + s * (w / 2 + 26) - 6, y - 9, 12, 9, 3);
    g.fillStyle(GRANITE, 1); g.fillRoundedRect(x + s * (w / 2 + 26) - 5, y - 9, 10, 6, 3);
  }
  // Counter with spools of line and a coil of bright tail-ribbon.
  g.fillStyle(dim(TIMBER, 0.35), 1); g.fillRect(x - w / 2 + 2, y - 30, w - 4, 30);
  g.fillStyle(TIMBER, 1); g.fillRect(x - w / 2 + 2, y - 32, w - 4, 6);
  for (let k = 0; k < 3; k++) {
    const sx = x - w / 4 + k * 14;
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(sx - 4, y - 42, 8, 10);
    g.fillStyle(CANVAS, 1); g.fillRect(sx - 3, y - 40, 6, 6);
  }
  g.lineStyle(2, a, 1); g.strokeCircle(x + w / 4, y - 36, 5); g.strokeCircle(x + w / 4 + 3, y - 37, 4);
}

// ── Quay bits ────────────────────────────────────────────────────────

/** A granite bollard, rope-polished on one side, an iron cap. */
export function bollard(g: G, x: number, y: number): void {
  shadow(g, x, y + 1, 20, 6);
  g.fillStyle(GRANITE_DARK, 1); g.fillRoundedRect(x - 7, y - 20, 14, 20, 4);
  g.fillStyle(GRANITE, 1); g.fillRoundedRect(x - 6, y - 20, 12, 18, 4);
  g.fillStyle(GRANITE_LIT, 0.8); g.fillRect(x - 5, y - 18, 3, 14);
  g.fillStyle(IRON, 1); g.fillEllipse(x, y - 20, 16, 6);
  g.fillStyle(lit(IRON, 0.3), 1); g.fillEllipse(x - 2, y - 21, 6, 2);
}

/** A coil of tarred hawser, flaked down in a neat round. */
export function hawser(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 1, s * 2.4, s * 0.6);
  for (let k = 0; k < 4; k++) {
    g.lineStyle(3, k % 2 ? dim(ROPE, 0.15) : ROPE, 1);
    g.strokeEllipse(x, y - s * 0.3 - k * 2, s * 2 - k * s * 0.35, s * 0.8 - k * s * 0.14);
  }
  g.fillStyle(dim(ROPE, 0.5), 1); g.fillEllipse(x, y - s * 0.3 - 8, s * 0.5, s * 0.2);
}

/** A lobster pot: a half-barrel of withy hoops, a net mouth at one end. */
export function lobsterPot(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 1, s * 2.2, s * 0.5);
  g.fillStyle(0x2e2a24, 1); g.fillRect(x - s, y - 3, s * 2, 3);
  g.lineStyle(2, 0x9a7a4a, 1);
  for (let k = 0; k < 4; k++) { const hx = x - s * 0.8 + k * s * 0.53; g.beginPath(); g.arc(hx, y - 2, s * 0.62, Math.PI, 0, false); g.strokePath(); }
  g.lineStyle(1, 0x6a5a3a, 0.9); g.lineBetween(x - s, y - s * 0.62, x + s, y - s * 0.62);
  g.fillStyle(0x3a3428, 0.7); g.fillEllipse(x + s * 0.95, y - s * 0.32, s * 0.3, s * 0.55);
}

/**
 * A wind-lamp: Windlass's street light — a stout storm lantern in an iron cage on a granite post,
 * a little tin wind-vane on top that tells the lamplighter which side to light it from.
 */
export function windLamp(g: G, x: number, y: number): void {
  shadow(g, x, y, 18, 6);
  g.fillStyle(GRANITE_DARK, 1); g.fillRect(x - 5, y - 40, 10, 40);
  g.fillStyle(GRANITE, 1); g.fillRect(x - 4, y - 40, 7, 40);
  g.fillStyle(IRON, 1); g.fillRect(x - 8, y - 60, 16, 20);
  g.fillStyle(LAMP, 0.9); g.fillRect(x - 6, y - 58, 12, 16);
  g.fillStyle(IRON, 1); g.fillRect(x - 1, y - 58, 2, 16);
  g.fillTriangle(x - 10, y - 60, x + 10, y - 60, x, y - 68);
  // The vane on its spindle.
  g.lineStyle(1, IRON, 1); g.lineBetween(x, y - 68, x, y - 80);
  g.fillStyle(0xb8b0a0, 1); g.fillTriangle(x, y - 80, x + 12, y - 78, x, y - 76);
  g.fillTriangle(x - 7, y - 80, x - 3, y - 78, x - 7, y - 76);
}

/** Where a wind-lamp's light sits, for the animator. */
export const lampLight = (x: number, y: number): Pt => ({ x, y: y - 50 });

/** A stone stair down the quay face to the water, green weed on the bottom steps. */
export function seaStair(g: G, x: number, y: number, w: number, steps: number): void {
  for (let k = 0; k < steps; k++) {
    const sy = y + k * 7;
    g.fillStyle(k > steps - 3 ? 0x3a5a4a : mixC(QUAY, 0x000000, 0.1 + k * 0.06), 1);
    g.fillRect(x - w / 2, sy, w, 6);
    g.fillStyle(lit(QUAY, 0.12), k > steps - 3 ? 0.2 : 0.5); g.fillRect(x - w / 2, sy, w, 1.5);
  }
}
