import Phaser from 'phaser';
import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import {
  BAG, BAG_DARK, BAIZE_DARK, BANNERET, BANNERET_DARK, BOG, BOG_DEEP, BOG_LIT, BRASS, BRASS_DARK, BRASS_LIT, BRONZE,
  BRONZE_LIT, CANVAS, CANVAS_DARK, CANVAS_LIT, COAT, COAT_DARK, GILT, GILT_DARK, GILT_LIT, INK, INK_LIT, IRON,
  IRON_DARK, IRON_LIT, IVORY, IVORY_DARK, LAMP, MARBLE, MARBLE_DARK, MUD, MUD_DARK, MUD_LIT, MUD_WET, RED, RED_DARK,
  RED_LIT, SAND_DARK, STONE, STONE_DARK, STONE_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT,
} from './palette';

/**
 * War Court set pieces. The summit slope is a mustering ground for a war nobody has declared:
 * everything here is either *built to be struck down and rebuilt by the morning* (tents, rails,
 * butts, palisades) or *built to last for ever* (the House's marble wall, the Drafting Wheel's
 * gilt frame). The temporary things are mud-splashed canvas and raw timber; the permanent things
 * are painted in the House's card red and card black with gilt on every edge. Numbers are
 * everywhere — on doors, on balls, on boards, on the brass Lot at every throat — and they are
 * drawn as real digits, so a player can read who was drawn.
 */

export type Suit = 'heart' | 'spade' | 'diamond' | 'club';

const P = (x: number, y: number) => new Phaser.Geom.Point(x, y);

// ── Glyphs ───────────────────────────────────────────────────────────

/** Seven-segment masks for 0–9 (a=1 top, b=2, c=4, d=8 bottom, e=16, f=32, g=64 middle). */
const SEG = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];

/** One painted digit, top-left at (x, y), `h` tall. */
export function digit(g: G, x: number, y: number, h: number, d: number, color: number, a = 1): void {
  const m = SEG[((d % 10) + 10) % 10];
  const w = h * 0.52, t = Math.max(1, h * 0.14), hh = h / 2;
  g.fillStyle(color, a);
  if (m & 1) g.fillRect(x, y, w, t);
  if (m & 2) g.fillRect(x + w - t, y, t, hh);
  if (m & 4) g.fillRect(x + w - t, y + hh, t, hh);
  if (m & 8) g.fillRect(x, y + h - t, w, t);
  if (m & 16) g.fillRect(x, y + hh, t, hh);
  if (m & 32) g.fillRect(x, y, t, hh);
  if (m & 64) g.fillRect(x, y + hh - t / 2, w, t);
}

/** A whole number, centred on (cx, cy). */
export function numberGlyph(g: G, cx: number, cy: number, h: number, n: number, color: number, a = 1): void {
  const s = String(Math.max(0, Math.round(n)));
  const step = h * 0.7;
  const x0 = cx - (s.length * step - (step - h * 0.52)) / 2;
  for (let i = 0; i < s.length; i++) digit(g, x0 + i * step, cy - h / 2, h, Number(s[i]), color, a);
}

/** A card suit, centred, `r` its half-size. */
export function suit(g: G, x: number, y: number, r: number, kind: Suit, color: number, a = 1): void {
  g.fillStyle(color, a);
  switch (kind) {
    case 'heart':
      g.fillCircle(x - r * 0.48, y - r * 0.25, r * 0.52);
      g.fillCircle(x + r * 0.48, y - r * 0.25, r * 0.52);
      g.fillTriangle(x - r * 0.98, y - r * 0.1, x + r * 0.98, y - r * 0.1, x, y + r);
      break;
    case 'diamond':
      g.fillTriangle(x, y - r, x + r * 0.72, y, x, y + r);
      g.fillTriangle(x, y - r, x - r * 0.72, y, x, y + r);
      break;
    case 'spade':
      g.fillCircle(x - r * 0.46, y + r * 0.2, r * 0.48);
      g.fillCircle(x + r * 0.46, y + r * 0.2, r * 0.48);
      g.fillTriangle(x - r * 0.92, y + r * 0.1, x + r * 0.92, y + r * 0.1, x, y - r);
      g.fillTriangle(x, y + r * 0.2, x - r * 0.35, y + r, x + r * 0.35, y + r);
      break;
    case 'club':
      g.fillCircle(x, y - r * 0.45, r * 0.42);
      g.fillCircle(x - r * 0.46, y + r * 0.12, r * 0.42);
      g.fillCircle(x + r * 0.46, y + r * 0.12, r * 0.42);
      g.fillTriangle(x, y, x - r * 0.32, y + r, x + r * 0.32, y + r);
      break;
  }
}

/** A die's face of pips inside a square of half-size `s`. */
export function pips(g: G, x: number, y: number, s: number, n: number, color: number): void {
  const o = s * 0.55, r = s * 0.17;
  const at: [number, number][] = [];
  if (n % 2) at.push([0, 0]);
  if (n >= 2) at.push([-o, -o], [o, o]);
  if (n >= 4) at.push([o, -o], [-o, o]);
  if (n === 6) at.push([-o, 0], [o, 0]);
  g.fillStyle(color, 1);
  for (const [dx, dy] of at) g.fillCircle(x + dx, y + dy, r);
}

/** A Lot: the brass token every child is given at birth, its number stamped through. */
export function lotToken(g: G, x: number, y: number, r: number, n: number, black = false): void {
  g.fillStyle(black ? INK : BRASS_DARK, 1); g.fillCircle(x, y + 0.8, r);
  g.fillStyle(black ? INK_LIT : BRASS, 1); g.fillCircle(x, y, r);
  g.lineStyle(Math.max(0.8, r * 0.12), black ? 0x000000 : BRASS_LIT, 0.8); g.strokeCircle(x, y, r * 0.78);
  if (r >= 5) numberGlyph(g, x, y, r * 0.8, n, black ? 0x8a8a90 : BRASS_DARK);
  g.fillStyle(0xffffff, black ? 0.12 : 0.35); g.fillCircle(x - r * 0.35, y - r * 0.35, r * 0.25);
}

/** An ivory lottery ball with a band and its number. */
export function drawBall(g: G, x: number, y: number, r: number, n: number, band: number): void {
  g.fillStyle(IVORY_DARK, 1); g.fillCircle(x, y + 0.6, r);
  g.fillStyle(IVORY, 1); g.fillCircle(x, y, r);
  g.fillStyle(band, 1); g.fillRect(x - r * 0.9, y - r * 0.32, r * 1.8, r * 0.64);
  g.fillStyle(IVORY, 1); g.fillCircle(x, y, r * 0.42);
  if (r >= 6) numberGlyph(g, x, y, r * 0.5, n, INK);
  g.fillStyle(0xffffff, 0.55); g.fillCircle(x - r * 0.38, y - r * 0.42, r * 0.2);
}

// ── Banners & flags ──────────────────────────────────────────────────

/**
 * A swallowtailed war banner on a gilt-finialed pole. `wave` (radians, animate with time) ripples
 * the fly; `h` is the pole's height.
 */
export function warBanner(g: G, x: number, y: number, h: number, cloth: number, kind: Suit | 'lot', wave = 0, torn = 0): void {
  shadow(g, x, y + 1, 18, 6);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 2.5, y - h, 5, h);
  g.fillStyle(TIMBER_LIT, 0.6); g.fillRect(x - 1.5, y - h, 1.5, h);
  // Gilt finial: a spearhead over a ball.
  g.fillStyle(GILT_DARK, 1); g.fillCircle(x, y - h - 2, 4.5);
  g.fillStyle(GILT, 1); g.fillCircle(x, y - h - 2.5, 3.6);
  g.fillTriangle(x - 3.5, y - h - 5, x + 3.5, y - h - 5, x, y - h - 16);
  g.fillStyle(GILT_LIT, 0.8); g.fillTriangle(x - 1, y - h - 6, x + 1, y - h - 6, x, y - h - 14);
  // Cross-bar and the cloth, rippling in vertical slices.
  const top = y - h + 6, len = h * 0.36, fly = h * 0.5;
  g.fillStyle(GILT_DARK, 1); g.fillRect(x, top - 2, fly + 4, 3);
  const slices = 10;
  for (let i = 0; i < slices; i++) {
    const k0 = i / slices, k1 = (i + 1) / slices;
    const x0 = x + 2 + k0 * fly, x1 = x + 2 + k1 * fly;
    const o0 = Math.sin(wave + k0 * 4) * 3 * k0, o1 = Math.sin(wave + k1 * 4) * 3 * k1;
    // The swallowtail: a notch cut up the last third.
    const notch = k0 > 0.66 ? (k0 - 0.66) / 0.34 * len * 0.45 : 0;
    const shade = 0.5 + Math.sin(wave + k0 * 4) * 0.5;
    const c = mixC(dim(cloth, 0.25), cloth, shade);
    g.fillStyle(c, 1);
    g.fillRect(x0, top + o0, x1 - x0 + 0.6, len * 0.5 - notch * 0.5);
    g.fillRect(x0, top + o0 + len * 0.5 + notch * 0.5, x1 - x0 + 0.6, len * 0.5 - notch * 0.5 - (torn && i > slices - 3 ? torn * 6 : 0));
    void o1;
  }
  // Gilt edging along the hoist and top.
  g.fillStyle(GILT, 1); g.fillRect(x + 2, top, fly, 2); g.fillRect(x + 2, top, 2, len);
  const ex = x + 2 + fly * 0.34, ey = top + len / 2 + Math.sin(wave + 1.4) * 1.2;
  g.fillStyle(lit(cloth, 0.75), 1); g.fillCircle(ex, ey, len * 0.27);
  if (kind === 'lot') lotToken(g, ex, ey, len * 0.2, 1);
  else suit(g, ex, ey, len * 0.17, kind, kind === 'heart' || kind === 'diamond' ? RED : INK);
  if (torn > 0) {
    // Rents in the fly: dark tears.
    g.lineStyle(1.5, dim(cloth, 0.6), 1);
    g.lineBetween(x + fly * 0.6, top + 2, x + fly * 0.7, top + len * 0.4);
    g.lineBetween(x + fly * 0.45, top + len, x + fly * 0.5, top + len * 0.6);
  }
}

/** A string of triangular bunting between two points, red/black/gilt. */
export function bunting(g: G, x0: number, y0: number, x1: number, y1: number, sag = 14, wave = 0): void {
  const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 18));
  g.lineStyle(1, INK_LIT, 0.9);
  let px = x0, py = y0;
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    const x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * sag;
    g.lineBetween(px, py, x, y);
    px = x; py = y;
  }
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n;
    const x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * sag;
    const c = [RED, INK, GILT][i % 3];
    const sw = Math.sin(wave + i) * 1.5;
    g.fillStyle(c, 1); g.fillTriangle(x - 6, y, x + 6, y, x + sw, y + 11);
  }
}

// ── People & horses ──────────────────────────────────────────────────

/**
 * A drafted conscript in House red faced with black, a brass Lot at his throat and a black-plumed
 * shako, marching with a pike at the slope. `step` animates the legs; `facing` −1/1 flips him.
 * `coat` tints the coat; anything but House red gets a gilt plume, so the two sides read apart.
 */
export function conscript(g: G, x: number, y: number, s: number, facing: number, step: number, coat = COAT, pikeLevel = 0, n = 0): void {
  shadow(g, x, y + 1, 26 * s, 7 * s);
  const sw = Math.sin(step) * 5 * s;
  // Legs: white trousers, black gaiters.
  g.fillStyle(IVORY_DARK, 1); g.fillRect(x - 6 * s + sw * 0.4, y - 16 * s, 5 * s, 12 * s); g.fillRect(x + 1 * s - sw * 0.4, y - 16 * s, 5 * s, 12 * s);
  g.fillStyle(INK, 1); g.fillRect(x - 6 * s + sw * 0.6, y - 6 * s, 5 * s, 6 * s); g.fillRect(x + 1 * s - sw * 0.6, y - 6 * s, 5 * s, 6 * s);
  // Coat with black facings and a white cross-belt.
  g.fillStyle(dim(coat, 0.3), 1); g.fillRoundedRect(x - 9 * s, y - 34 * s, 18 * s, 20 * s, 4 * s);
  g.fillStyle(coat, 1); g.fillRoundedRect(x - 8 * s, y - 34 * s, 16 * s, 19 * s, 4 * s);
  g.fillStyle(INK, 1); g.fillRect(x - 2 * s, y - 34 * s, 4 * s, 19 * s);
  g.lineStyle(2 * s, IVORY, 0.9); g.lineBetween(x - 7 * s, y - 33 * s, x + 7 * s, y - 17 * s);
  g.fillStyle(BRASS, 1); for (let i = 0; i < 3; i++) g.fillCircle(x + 3.5 * s, y - 31 * s + i * 5 * s, 1 * s);
  // Head, the Lot on its chain, shako with plume.
  g.fillStyle(0xd8b08a, 1); g.fillCircle(x, y - 39 * s, 5.5 * s);
  g.fillStyle(0x2a1a12, 1); g.fillCircle(x + facing * 2 * s, y - 39.5 * s, 0.9 * s);
  g.lineStyle(0.8 * s, BRASS, 1); g.lineBetween(x - 3 * s, y - 35 * s, x, y - 32 * s); g.lineBetween(x + 3 * s, y - 35 * s, x, y - 32 * s);
  lotToken(g, x, y - 31 * s, 2.2 * s, n);
  g.fillStyle(INK, 1); g.fillRect(x - 5 * s, y - 52 * s, 10 * s, 10 * s);
  g.fillStyle(INK_LIT, 1); g.fillRect(x - 6 * s, y - 43 * s, 12 * s, 2 * s);
  g.fillStyle(BRASS, 1); g.fillTriangle(x - 2.5 * s, y - 50 * s, x + 2.5 * s, y - 50 * s, x, y - 45 * s);
  g.fillStyle(coat === COAT ? INK : GILT, 1); g.fillEllipse(x, y - 55 * s, 4 * s, 8 * s);
  // Pike: at the slope while marching, levelled (pikeLevel 1) to thrust.
  const ang = Phaser.Math.Linear(-Math.PI / 2 + facing * 0.25, facing > 0 ? -0.05 : Math.PI + 0.05, pikeLevel);
  const hx = x + facing * 7 * s, hy = y - 26 * s;
  const L = 62 * s;
  g.lineStyle(2.2 * s, TIMBER_DARK, 1); g.lineBetween(hx - Math.cos(ang) * 12 * s, hy - Math.sin(ang) * 12 * s, hx + Math.cos(ang) * L, hy + Math.sin(ang) * L);
  const tx = hx + Math.cos(ang) * L, ty = hy + Math.sin(ang) * L;
  g.fillStyle(IRON_LIT, 1);
  g.fillTriangle(tx + Math.cos(ang) * 10 * s, ty + Math.sin(ang) * 10 * s, tx + Math.cos(ang + 1.6) * 3 * s, ty + Math.sin(ang + 1.6) * 3 * s, tx + Math.cos(ang - 1.6) * 3 * s, ty + Math.sin(ang - 1.6) * 3 * s);
  g.fillStyle(RED, 1); g.fillCircle(tx - Math.cos(ang) * 3 * s, ty - Math.sin(ang) * 3 * s, 1.8 * s);
  g.fillStyle(0xd8b08a, 1); g.fillCircle(hx, hy, 2.4 * s);
}

/**
 * A caparisoned charger at the gallop, seen from the side. `facing` 1 = running right. `t` drives
 * the gait (radians). The cloth hangs to the fetlocks in the rider's colour, chequered at the hem.
 * `rider` adds a lancer in a plumed helm with a couched lance.
 */
export function horse(g: G, x: number, y: number, s: number, facing: number, t: number, cloth: number, rider = true, coat = 0x5a3a24): void {
  const f = facing;
  const X = (dx: number) => x + dx * s * f;
  const bob = Math.abs(Math.sin(t)) * 3 * s;
  const by = y - 30 * s - bob;
  shadow(g, x, y + 2, 78 * s, 14 * s);
  // Legs: four, scissoring at the gallop.
  const leg = (bx: number, ph: number) => {
    const a = Math.sin(t + ph) * 0.7;
    const kx = X(bx) + Math.sin(a) * 8 * s * f, ky = by + 14 * s;
    const hx = kx + Math.sin(a * 1.6) * 8 * s * f, hy = Math.min(y, ky + 15 * s);
    g.lineStyle(4.5 * s, dim(coat, 0.2), 1); g.lineBetween(X(bx), by + 4 * s, kx, ky); g.lineBetween(kx, ky, hx, hy);
    g.fillStyle(INK, 1); g.fillEllipse(hx, hy, 6 * s, 3 * s);
  };
  leg(-20, 0); leg(-14, 2.2); leg(18, 1.1); leg(24, 3.3);
  // Tail streaming.
  g.lineStyle(4 * s, dim(coat, 0.45), 1);
  g.lineBetween(X(-30), by - 4 * s, X(-46), by + 6 * s + Math.sin(t * 2) * 3 * s);
  // Barrel of the body.
  g.fillStyle(dim(coat, 0.25), 1); g.fillEllipse(X(0), by + 2 * s, 64 * s, 26 * s);
  g.fillStyle(coat, 1); g.fillEllipse(X(0), by, 62 * s, 24 * s);
  // Neck and head.
  g.fillStyle(coat, 1);
  g.fillTriangle(X(18), by - 8 * s, X(30), by + 6 * s, X(38), by - 24 * s);
  g.fillEllipse(X(40), by - 24 * s, 20 * s, 11 * s);
  g.fillStyle(dim(coat, 0.3), 1); g.fillEllipse(X(48), by - 21 * s, 9 * s, 7 * s);
  g.fillStyle(INK, 1); g.fillCircle(X(40), by - 27 * s, 1.4 * s);
  g.fillTriangle(X(34), by - 30 * s, X(37), by - 30 * s, X(35), by - 37 * s);
  // Mane.
  g.lineStyle(3 * s, INK, 1); g.lineBetween(X(22), by - 10 * s, X(34), by - 30 * s);
  // Caparison: the long trapper down to the knees, chequered hem, a suit on the flank.
  g.fillStyle(dim(cloth, 0.25), 1); g.fillRect(X(f > 0 ? -32 : 32) - (f > 0 ? 0 : 64 * s), by - 6 * s, 64 * s, 22 * s);
  g.fillStyle(cloth, 1); g.fillRect(X(f > 0 ? -31 : 31) - (f > 0 ? 0 : 62 * s), by - 8 * s, 62 * s, 21 * s);
  for (let i = 0; i < 8; i++) {
    const cx = X(-31 + i * 7.75) - (f > 0 ? 0 : 7.75 * s);
    g.fillStyle(i % 2 ? INK : GILT, 1); g.fillRect(cx, by + 11 * s, 7.75 * s, 3 * s);
  }
  suit(g, X(-4), by + 1 * s, 6 * s, cloth === RED || cloth === BANNERET ? 'diamond' : 'spade', IVORY);
  // A chanfron on the face: a gilt plate with a spike.
  g.fillStyle(GILT, 1); g.fillTriangle(X(36), by - 30 * s, X(46), by - 24 * s, X(36), by - 20 * s);
  g.lineStyle(1.5 * s, GILT_LIT, 1); g.lineBetween(X(38), by - 30 * s, X(40), by - 40 * s);
  if (!rider) return;
  // The lancer: breastplate, plumed helm, couched lance with a pennon.
  const rx = X(2), ry = by - 14 * s;
  g.fillStyle(IRON, 1); g.fillRoundedRect(rx - 7 * s, ry - 20 * s, 14 * s, 18 * s, 4 * s);
  g.fillStyle(IRON_LIT, 1); g.fillRect(rx - 5 * s, ry - 18 * s, 3 * s, 12 * s);
  g.fillStyle(IRON_DARK, 1); g.fillCircle(rx, ry - 26 * s, 7 * s);
  g.fillStyle(IRON_LIT, 1); g.fillRect(rx - 6 * s, ry - 27 * s, 12 * s, 2 * s);
  g.fillStyle(cloth, 1); g.fillEllipse(rx - 5 * s * f, ry - 34 * s, 10 * s, 6 * s);
  g.lineStyle(3 * s, TIMBER_LIT, 1); g.lineBetween(rx - 14 * s * f, ry - 8 * s, rx + 70 * s * f, ry - 12 * s);
  g.fillStyle(IRON_LIT, 1); g.fillTriangle(rx + 70 * s * f, ry - 15 * s, rx + 70 * s * f, ry - 9 * s, rx + 80 * s * f, ry - 12 * s);
  g.fillStyle(GILT, 1); g.fillTriangle(rx + 6 * s * f, ry - 16 * s, rx + 6 * s * f, ry, rx + 14 * s * f, ry - 9 * s);
  const pw = Math.sin(t * 2) * 2 * s;
  g.fillStyle(cloth, 1); g.fillTriangle(rx + 56 * s * f, ry - 12 * s, rx + 44 * s * f, ry - 20 * s + pw, rx + 44 * s * f, ry - 12 * s);
}

// ── Buildings ────────────────────────────────────────────────────────

/**
 * A barracks hut: long timber walls on a stone footing, a tarred roof, and a row of doors each
 * painted with a Lot number — one door to a drafted household's son. A stove pipe smokes.
 */
export function barracks(g: G, x: number, y: number, w: number, h: number, firstNum: number, rng: () => number): void {
  shadow(g, x, y + 4, w * 1.05, 26);
  const x0 = x - w / 2;
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 4, y - 10, w + 8, 10);
  g.fillStyle(STONE, 1); g.fillRect(x0 - 4, y - 12, w + 8, 4);
  // Clapboard walls.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0, y - 10 - h, w, h);
  for (let k = 0; k < h; k += 7) { g.fillStyle(k % 14 ? TIMBER : dim(TIMBER, 0.08), 1); g.fillRect(x0 + 1, y - 10 - h + k, w - 2, 6); }
  // House paint: a red-and-black band under the eaves.
  for (let bx = x0; bx < x0 + w; bx += 16) { g.fillStyle(((bx - x0) / 16) % 2 ? INK : RED, 1); g.fillRect(bx, y - 10 - h, Math.min(16, x0 + w - bx), 6); }
  // Tarred roof.
  const ry = y - 10 - h;
  g.fillStyle(0x24222a, 1); g.fillTriangle(x0 - 10, ry, x0 + w + 10, ry, x0 + w / 2, ry - h * 0.55);
  g.fillStyle(0x34323c, 1); g.fillRect(x0 - 10, ry - h * 0.32, w + 20, h * 0.32);
  for (let k = 0; k < 4; k++) { g.lineStyle(1, 0x46444e, 0.7); g.lineBetween(x0 - 10, ry - k * h * 0.08, x0 + w + 10, ry - k * h * 0.08); }
  // Stove pipe.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x0 + w * 0.78, ry - h * 0.6, 6, h * 0.34);
  g.fillStyle(IRON, 1); g.fillRect(x0 + w * 0.78 - 2, ry - h * 0.62, 10, 3);
  // Numbered doors.
  const doors = Math.max(2, Math.floor(w / 70));
  for (let i = 0; i < doors; i++) {
    const dx = x0 + (i + 0.5) * (w / doors);
    g.fillStyle(INK, 1); g.fillRect(dx - 10, y - 10 - 30, 20, 30);
    g.fillStyle(RED_DARK, 1); g.fillRect(dx - 8, y - 10 - 28, 16, 28);
    g.fillStyle(IVORY, 1); g.fillRect(dx - 9, y - 10 - 40, 18, 9);
    numberGlyph(g, dx, y - 10 - 35.5, 6, firstNum + i * 37, INK);
    g.fillStyle(BRASS, 1); g.fillCircle(dx + 5, y - 22, 1.3);
    // Little windows between the doors.
    if (i < doors - 1) {
      const wx = dx + w / doors / 2;
      g.fillStyle(INK, 1); g.fillRect(wx - 7, y - 10 - h * 0.7, 14, 12);
      g.fillStyle(rng() < 0.5 ? LAMP : 0x3a3a48, 0.8); g.fillRect(wx - 6, y - 10 - h * 0.7 + 1, 12, 10);
      g.lineStyle(1, INK, 1); g.lineBetween(wx, y - 10 - h * 0.7, wx, y - 10 - h * 0.7 + 12);
    }
  }
  // A rain barrel at one end, mud splashed up the boards.
  g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(x0 + w + 2, y - 2, 18, 7);
  g.fillStyle(TIMBER, 1); g.fillRect(x0 + w - 7, y - 20, 18, 18);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x0 + w - 7, y - 16, 18, 2); g.fillRect(x0 + w - 7, y - 7, 18, 2);
  for (let i = 0; i < w / 6; i++) { g.fillStyle(MUD, 0.5); g.fillCircle(x0 + rng() * w, y - 11 - rng() * 8, 1 + rng() * 2); }
}

/** A bell tent: a cone of mud-hemmed canvas, guy ropes, a pennant and a stencilled suit. */
export function bellTent(g: G, x: number, y: number, s: number, kind: Suit, rng: () => number): void {
  shadow(g, x, y + 2, 70 * s, 16 * s);
  const r = 32 * s, h = 54 * s;
  // Guy ropes and pegs.
  for (const k of [-1, 1]) {
    g.lineStyle(1, CANVAS_DARK, 0.9); g.lineBetween(x + k * r * 0.6, y - h * 0.55, x + k * r * 1.5, y + 4);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * r * 1.5 - 1, y, 2, 5);
  }
  g.fillStyle(CANVAS_DARK, 1); g.fillTriangle(x - r, y, x + r, y, x, y - h);
  g.fillStyle(CANVAS, 1); g.fillTriangle(x - r + 3 * s, y, x + r * 0.3, y, x, y - h + 2);
  g.fillStyle(CANVAS_LIT, 0.5); g.fillTriangle(x - r * 0.6, y, x - r * 0.2, y, x, y - h + 4);
  // Mud hem.
  g.fillStyle(MUD, 0.55); g.fillRect(x - r, y - 6 * s, r * 2, 6 * s);
  // The flap, tied back, dark inside.
  g.fillStyle(0x2a2420, 1); g.fillTriangle(x + r * 0.1, y, x + r * 0.55, y, x + r * 0.15, y - h * 0.5);
  g.fillStyle(CANVAS_LIT, 1); g.fillTriangle(x + r * 0.55, y, x + r * 0.75, y, x + r * 0.2, y - h * 0.5);
  suit(g, x - r * 0.35, y - h * 0.35, 6 * s, kind, kind === 'heart' || kind === 'diamond' ? RED : INK, 0.8);
  // Pole tip and pennant.
  g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(x, y - h, x, y - h - 10 * s);
  g.fillStyle(rng() < 0.5 ? RED : INK, 1); g.fillTriangle(x, y - h - 10 * s, x, y - h - 4 * s, x + 12 * s, y - h - 7 * s);
}

/**
 * A trebuchet: two timber A-frames, an iron-bound counterweight box painted with a die face, and
 * the long throwing arm. `arm` is the arm's angle from horizontal (−1.1 cocked, +0.9 thrown).
 */
export function trebuchet(g: G, x: number, y: number, s: number, arm = -0.9, face = 1, facing = -1, loaded = true): void {
  shadow(g, x, y + 2, 120 * s, 22 * s);
  // Base sledge.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 54 * s, y - 10 * s, 108 * s, 10 * s);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 54 * s, y - 12 * s, 108 * s, 4 * s);
  for (const k of [-1, 1]) { g.fillStyle(IRON_DARK, 1); g.fillCircle(x + k * 44 * s, y - 4 * s, 7 * s); g.fillStyle(TIMBER_LIT, 1); g.fillCircle(x + k * 44 * s, y - 4 * s, 4 * s); }
  // A-frame.
  const px = x, py = y - 78 * s;
  g.lineStyle(7 * s, TIMBER_DARK, 1); g.lineBetween(x - 36 * s, y - 10 * s, px, py); g.lineBetween(x + 36 * s, y - 10 * s, px, py);
  g.lineStyle(5 * s, TIMBER, 1); g.lineBetween(x - 35 * s, y - 11 * s, px, py + 1); g.lineBetween(x + 35 * s, y - 11 * s, px, py + 1);
  g.lineStyle(4 * s, TIMBER, 1); g.lineBetween(x - 20 * s, y - 44 * s, x + 20 * s, y - 44 * s);
  // Arm: the long end throws (toward `facing`), the short end carries the weight.
  const c = Math.cos(arm), sn = Math.sin(arm);
  const lx = px + facing * c * 86 * s, ly = py + sn * 86 * s * (facing < 0 ? 1 : 1);
  const wx = px - facing * c * 26 * s, wy = py - sn * 26 * s;
  g.lineStyle(6 * s, TIMBER_DARK, 1); g.lineBetween(wx, wy, lx, ly);
  g.lineStyle(3 * s, TIMBER_LIT, 1); g.lineBetween(wx, wy - 1, lx, ly - 1);
  // Counterweight box.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(wx - 16 * s, wy + 2 * s, 32 * s, 26 * s);
  g.fillStyle(IVORY, 1); g.fillRect(wx - 13 * s, wy + 4 * s, 26 * s, 22 * s);
  pips(g, wx, wy + 15 * s, 10 * s, face, RED);
  g.lineStyle(2 * s, IRON_DARK, 1); g.strokeRect(wx - 14 * s, wy + 3 * s, 28 * s, 24 * s);
  // Axle.
  g.fillStyle(IRON, 1); g.fillCircle(px, py, 5 * s);
  g.fillStyle(IRON_LIT, 1); g.fillCircle(px - 1, py - 1, 2 * s);
  // Sling and stone.
  g.lineStyle(1.5, CANVAS_DARK, 1); g.lineBetween(lx, ly, lx + facing * 6 * s, ly + 22 * s);
  if (loaded) { g.fillStyle(STONE_DARK, 1); g.fillCircle(lx + facing * 6 * s, ly + 26 * s, 8 * s); g.fillStyle(STONE, 1); g.fillCircle(lx + facing * 5 * s, ly + 25 * s, 6 * s); }
}

/** A bronze field gun on its carriage, with a pyramid of shot beside it. */
export function fieldGun(g: G, x: number, y: number, s: number, facing = 1): void {
  shadow(g, x, y + 2, 70 * s, 14 * s);
  g.fillStyle(TIMBER_DARK, 1); g.fillTriangle(x - facing * 34 * s, y, x - facing * 28 * s, y - 6 * s, x + facing * 10 * s, y - 16 * s);
  g.lineStyle(8 * s, BRONZE, 1); g.lineBetween(x - facing * 10 * s, y - 18 * s, x + facing * 34 * s, y - 24 * s);
  g.lineStyle(3 * s, BRONZE_LIT, 1); g.lineBetween(x - facing * 10 * s, y - 21 * s, x + facing * 34 * s, y - 27 * s);
  g.fillStyle(INK, 1); g.fillCircle(x + facing * 36 * s, y - 24 * s, 3.5 * s);
  g.fillStyle(BRONZE, 1); g.fillCircle(x - facing * 13 * s, y - 18 * s, 4 * s);
  // Wheel.
  g.lineStyle(3 * s, TIMBER_DARK, 1); g.strokeCircle(x, y - 12 * s, 12 * s);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI; g.lineStyle(1.5 * s, TIMBER, 1); g.lineBetween(x + Math.cos(a) * 11 * s, y - 12 * s + Math.sin(a) * 11 * s, x - Math.cos(a) * 11 * s, y - 12 * s - Math.sin(a) * 11 * s); }
  g.fillStyle(IRON, 1); g.fillCircle(x, y - 12 * s, 3 * s);
  // Shot.
  for (const [dx, dy] of [[0, 0], [8, 0], [16, 0], [4, -6], [12, -6], [8, -12]] as [number, number][]) {
    g.fillStyle(IRON_DARK, 1); g.fillCircle(x - facing * (40 + dx) * s, y - 4 * s + dy * s, 4 * s);
    g.fillStyle(IRON_LIT, 0.6); g.fillCircle(x - facing * (40 + dx) * s - 1, y - 5 * s + dy * s, 1.4 * s);
  }
}

/** A row of sandbags, `rows` high, with stitched seams. */
export function sandbags(g: G, x: number, y: number, w: number, rows = 2): void {
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? 9 : 0;
    for (let bx = x - w / 2 + off; bx < x + w / 2 - 6; bx += 18) {
      const by = y - 6 - r * 9;
      g.fillStyle(BAG_DARK, 1); g.fillEllipse(bx + 9, by + 1.5, 19, 10);
      g.fillStyle(BAG, 1); g.fillEllipse(bx + 9, by, 18, 9);
      g.lineStyle(1, BAG_DARK, 0.8); g.lineBetween(bx + 3, by, bx + 15, by);
      g.fillStyle(0xffffff, 0.12); g.fillEllipse(bx + 7, by - 2, 8, 3);
    }
  }
}

/** A palisade of sharpened stakes along a line, lashed with rope, a banner every so often. */
export function palisade(g: G, x0: number, x1: number, y: number, h: number, rng: () => number): void {
  g.fillStyle(0x000000, 0.25); g.fillRect(x0, y - 2, x1 - x0, 8);
  for (let x = x0; x < x1; x += 11) {
    const hh = h * (0.86 + rng() * 0.2);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x, y - hh, 10, hh);
    g.fillStyle(TIMBER, 1); g.fillRect(x + 1, y - hh, 6, hh);
    g.fillStyle(TIMBER_LIT, 0.5); g.fillRect(x + 1, y - hh, 2, hh);
    g.fillStyle(TIMBER_DARK, 1); g.fillTriangle(x, y - hh, x + 10, y - hh, x + 5, y - hh - 9);
    g.fillStyle(0xd8c09a, 1); g.fillTriangle(x + 2, y - hh, x + 7, y - hh, x + 5, y - hh - 7);
  }
  g.lineStyle(2, CANVAS_DARK, 1); g.lineBetween(x0, y - h * 0.3, x1, y - h * 0.3); g.lineBetween(x0, y - h * 0.7, x1, y - h * 0.7);
}

/**
 * The House's summit wall and its door: white marble courses capped in black, a great arched door
 * of black lacquer studded with gilt chips, a fanlight made of a roulette wheel, card-suit roundels
 * and two green-shaded lamps. The Wheel itself turns above the roof line (see `houseWheel`).
 */
export function houseGate(g: G, x: number, y: number, rng: () => number): void {
  // Steps.
  for (let k = 0; k < 4; k++) { g.fillStyle(k % 2 ? MARBLE_DARK : MARBLE, 1); g.fillRect(x - 120 + k * 8, y - 4 - k * 6, 240 - k * 16, 6); }
  const dy = y - 26;
  // Pilasters.
  for (const k of [-1, 1]) {
    const px = x + k * 96;
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(px - 18, dy - 170, 36, 170);
    g.fillStyle(MARBLE, 1); g.fillRect(px - 15, dy - 170, 30, 170);
    for (let i = 0; i < 4; i++) { g.fillStyle(MARBLE_DARK, 0.6); g.fillRect(px - 10 + i * 6, dy - 160, 2, 150); }
    g.fillStyle(GILT, 1); g.fillRect(px - 20, dy - 176, 40, 8); g.fillRect(px - 20, dy - 8, 40, 8);
    // Suit roundels.
    g.fillStyle(INK, 1); g.fillCircle(px, dy - 120, 13);
    g.lineStyle(2, GILT, 1); g.strokeCircle(px, dy - 120, 13);
    suit(g, px, dy - 120, 8, k < 0 ? 'heart' : 'spade', k < 0 ? RED : IVORY);
    g.fillStyle(INK, 1); g.fillCircle(px, dy - 60, 13);
    g.lineStyle(2, GILT, 1); g.strokeCircle(px, dy - 60, 13);
    suit(g, px, dy - 60, 8, k < 0 ? 'diamond' : 'club', k < 0 ? RED : IVORY);
  }
  // The arch and the door.
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 78, dy - 130, 156, 130);
  g.fillCircle(x, dy - 130, 78);
  g.fillStyle(INK, 1); g.fillRect(x - 66, dy - 122, 132, 122);
  g.fillCircle(x, dy - 122, 66);
  // Two leaves of black lacquer, gilt chips in a diamond lattice.
  for (const k of [-1, 1]) {
    const lx = x + k * 33;
    g.fillStyle(INK_LIT, 1); g.fillRect(lx - 31, dy - 120, 62, 120);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
      const cx = lx - 20 + j * 20 + (i % 2) * 10, cy = dy - 108 + i * 22;
      if (cx > lx + 28) continue;
      g.fillStyle(GILT_DARK, 1); g.fillCircle(cx, cy + 0.6, 4);
      g.fillStyle(GILT, 1); g.fillCircle(cx, cy, 3.4);
    }
    g.fillStyle(GILT, 1); g.fillCircle(x + k * 9, dy - 56, 4);
  }
  g.lineStyle(2, GILT, 1); g.lineBetween(x, dy - 122, x, dy);
  // Fanlight: a roulette wheel.
  const fy = dy - 128;
  for (let i = 0; i < 18; i++) {
    const a0 = Math.PI + (i / 18) * Math.PI, a1 = Math.PI + ((i + 1) / 18) * Math.PI;
    g.fillStyle(i === 9 ? 0x2a8a4a : i % 2 ? RED : INK, 1);
    g.fillTriangle(x, fy, x + Math.cos(a0) * 58, fy + Math.sin(a0) * 58, x + Math.cos(a1) * 58, fy + Math.sin(a1) * 58);
  }
  g.fillStyle(GILT, 1); g.fillCircle(x, fy, 12);
  g.lineStyle(3, GILT, 1); g.beginPath(); g.arc(x, fy, 60, Math.PI, 0, false); g.strokePath();
  g.fillStyle(GILT_LIT, 1); g.fillCircle(x, fy, 5);
  // Keystone: a gilt crown over a die.
  g.fillStyle(GILT, 1); g.fillRect(x - 12, fy - 82, 24, 22);
  g.fillStyle(IVORY, 1); g.fillRect(x - 9, fy - 79, 18, 16);
  pips(g, x, fy - 71, 7, 5, RED);
  // Green-shaded lamps.
  for (const k of [-1, 1]) {
    const lx = x + k * 140;
    g.fillStyle(IRON_DARK, 1); g.fillRect(lx - 2, dy - 90, 4, 90);
    g.fillStyle(0x2a6a3a, 1); g.fillTriangle(lx - 12, dy - 92, lx + 12, dy - 92, lx, dy - 104);
    glow(g, lx, dy - 86, 22, LAMP, 0.07, 3);
    g.fillStyle(LAMP, 1); g.fillCircle(lx, dy - 88, 3);
  }
  void rng;
}

/** The great Wheel on the House's roof, glimpsed over the summit wall; `a` is its turn. */
export function houseWheel(g: G, x: number, y: number, r: number, a: number): void {
  g.fillStyle(GILT_DARK, 1); g.fillCircle(x, y, r + 6);
  for (let i = 0; i < 37; i++) {
    const a0 = a + (i / 37) * Math.PI * 2, a1 = a + ((i + 1) / 37) * Math.PI * 2;
    g.fillStyle(i === 0 ? 0x2a8a4a : i % 2 ? RED : INK, 1);
    g.fillTriangle(x, y, x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r);
  }
  g.fillStyle(GILT, 1); g.fillCircle(x, y, r * 0.42);
  g.fillStyle(INK, 1); g.fillCircle(x, y, r * 0.34);
  for (let i = 0; i < 4; i++) {
    const b = a * 1.5 + (i / 4) * Math.PI * 2;
    g.lineStyle(3, GILT_LIT, 1); g.lineBetween(x, y, x + Math.cos(b) * r * 0.4, y + Math.sin(b) * r * 0.4);
  }
  g.fillStyle(GILT_LIT, 1); g.fillCircle(x, y, 5);
  g.lineStyle(2, GILT_LIT, 0.8); g.strokeCircle(x, y, r + 3);
}

/** The summit wall either side of the House door: marble courses with a black coping. */
export function summitWall(g: G, x0: number, x1: number, y: number, h: number): void {
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0, y - h, x1 - x0, h);
  for (let k = 0; k < h; k += 18) {
    g.fillStyle(k % 36 ? MARBLE : lit(MARBLE, 0.2), 1); g.fillRect(x0, y - h + k, x1 - x0, 16);
    for (let bx = x0 + ((k / 18) % 2) * 30; bx < x1; bx += 60) { g.fillStyle(MARBLE_DARK, 0.7); g.fillRect(bx, y - h + k, 2, 16); }
  }
  g.fillStyle(INK, 1); g.fillRect(x0, y - h - 10, x1 - x0, 12);
  for (let bx = x0; bx < x1; bx += 28) { g.fillStyle(GILT, 1); g.fillRect(bx + 10, y - h - 14, 8, 4); }
  g.fillStyle(0x000000, 0.2); g.fillRect(x0, y - 4, x1 - x0, 4);
}

/**
 * Prince Banneret's command pavilion: a scalloped marquee in red and black stripes with gilt
 * finials, a striped valance, his swallowtail standard above, a carpeted step and two drums.
 */
export function pavilion(g: G, x: number, y: number, w: number, h: number): void {
  shadow(g, x, y + 6, w * 1.1, 30);
  const x0 = x - w / 2;
  // Walls in vertical stripes.
  const n = Math.round(w / 22);
  for (let i = 0; i < n; i++) {
    g.fillStyle(i % 2 ? INK : BANNERET, 1); g.fillRect(x0 + (i * w) / n, y - h, w / n + 0.5, h);
    g.fillStyle(0x000000, 0.12); g.fillRect(x0 + (i * w) / n, y - h, 3, h);
  }
  // Doorway: tied-back flaps showing a lamplit interior with a map on an easel.
  g.fillStyle(0x3a2418, 1); g.fillRect(x - 34, y - h * 0.8, 68, h * 0.8);
  glow(g, x, y - h * 0.4, 30, LAMP, 0.06, 3);
  g.fillStyle(CANVAS_LIT, 1); g.fillRect(x - 14, y - h * 0.62, 28, 20);
  g.lineStyle(1, RED, 0.8); g.lineBetween(x - 10, y - h * 0.58, x + 8, y - h * 0.5); g.lineBetween(x - 4, y - h * 0.6, x - 2, y - h * 0.46);
  g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(x - 10, y - h * 0.42, x - 16, y); g.lineBetween(x + 10, y - h * 0.42, x + 16, y);
  for (const k of [-1, 1]) {
    g.fillStyle(BANNERET, 1); g.fillTriangle(x + k * 34, y - h * 0.8, x + k * 34, y, x + k * 20, y - h * 0.3);
    g.fillStyle(GILT, 1); g.fillCircle(x + k * 24, y - h * 0.3, 3);
  }
  // Roof: three peaks.
  const peaks = [x0 + w * 0.2, x, x0 + w * 0.8];
  peaks.forEach((px, i) => {
    const ph = i === 1 ? h * 0.9 : h * 0.6;
    const hw = i === 1 ? w * 0.32 : w * 0.24;
    g.fillStyle(dim(BANNERET, 0.3), 1); g.fillTriangle(px - hw, y - h, px + hw, y - h, px, y - h - ph);
    g.fillStyle(BANNERET, 1); g.fillTriangle(px - hw + 6, y - h, px, y - h, px, y - h - ph + 4);
    g.fillStyle(INK, 1); g.fillTriangle(px, y - h, px + hw - 6, y - h, px, y - h - ph + 4);
    g.lineStyle(2, GILT, 1); g.lineBetween(px, y - h - ph, px, y - h - ph - 14);
    g.fillStyle(GILT, 1); g.fillCircle(px, y - h - ph - 16, 4);
  });
  // Scalloped valance.
  for (let bx = x0; bx < x0 + w; bx += 16) {
    g.fillStyle(((bx - x0) / 16) % 2 ? GILT : BANNERET, 1);
    g.fillRect(bx, y - h - 2, 16, 8);
    g.fillCircle(bx + 8, y - h + 6, 8);
  }
  // The standard on the middle peak.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 1.5, y - h - h * 0.9 - 70, 3, 56);
  // Carpet and drums.
  g.fillStyle(RED_DARK, 1); g.fillRect(x - 26, y - 2, 52, 22);
  g.fillStyle(GILT, 1); g.fillRect(x - 26, y - 2, 52, 2); g.fillRect(x - 26, y + 18, 52, 2);
  for (const k of [-1, 1]) fieldDrum(g, x + k * 56, y + 6, 1);
}

/** A field drum: a brass shell in red hoops, a white head, cords zig-zagged, sticks crossed on top. */
export function fieldDrum(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 1, 26 * s, 7 * s);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 11 * s, y - 18 * s, 22 * s, 18 * s);
  g.fillStyle(BRASS, 1); g.fillRect(x - 10 * s, y - 18 * s, 18 * s, 18 * s);
  g.lineStyle(1, IVORY, 0.9);
  for (let i = 0; i < 5; i++) { const xx = x - 10 * s + i * 5 * s; g.lineBetween(xx, y - 16 * s, xx + 2.5 * s, y - 2 * s); g.lineBetween(xx + 2.5 * s, y - 2 * s, xx + 5 * s, y - 16 * s); }
  g.fillStyle(RED, 1); g.fillRect(x - 11 * s, y - 19 * s, 22 * s, 3 * s); g.fillRect(x - 11 * s, y - 3 * s, 22 * s, 3 * s);
  g.fillStyle(IVORY, 1); g.fillEllipse(x, y - 19 * s, 22 * s, 7 * s);
  g.lineStyle(1.6 * s, TIMBER_LIT, 1); g.lineBetween(x - 9 * s, y - 24 * s, x + 6 * s, y - 18 * s); g.lineBetween(x + 9 * s, y - 24 * s, x - 6 * s, y - 18 * s);
}

/**
 * The Drafting stage: a raised platform skirted in red-and-black chequer, a gilt A-frame carrying
 * the wire drum (drawn turning by `draftDrum`), a brass chute into the calling cup, and bunting.
 */
export function draftStage(g: G, x: number, y: number): void {
  shadow(g, x, y + 6, 280, 34);
  // Platform and chequered skirt.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 130, y - 44, 260, 44);
  for (let i = 0; i < 13; i++) for (let j = 0; j < 2; j++) {
    g.fillStyle((i + j) % 2 ? INK : RED, 1); g.fillRect(x - 130 + i * 20, y - 40 + j * 20, 20, 20);
  }
  g.fillStyle(GILT, 1); g.fillRect(x - 134, y - 48, 268, 6);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 130, y - 52, 260, 6);
  // Steps on the front.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? TIMBER : TIMBER_LIT, 1); g.fillRect(x - 26 - k * 4, y - 12 + k * 6 - 20, 52 + k * 8, 6); }
  // The gilt A-frame (the cage goes between its legs).
  for (const k of [-1, 1]) {
    g.lineStyle(8, GILT_DARK, 1); g.lineBetween(x + k * 92, y - 52, x + k * 70, y - 168);
    g.lineStyle(4, GILT, 1); g.lineBetween(x + k * 91, y - 53, x + k * 69, y - 167);
    g.fillStyle(GILT_LIT, 1); g.fillCircle(x + k * 70, y - 168, 7);
  }
  // Crank on the right.
  g.lineStyle(3, IRON, 1); g.lineBetween(x + 70, y - 168, x + 92, y - 168); g.lineBetween(x + 92, y - 168, x + 92, y - 148);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x + 88, y - 150, 8, 14);
  // Chute and cup.
  g.lineStyle(6, BRASS_DARK, 1); g.lineBetween(x - 10, y - 120, x - 40, y - 70);
  g.lineStyle(3, BRASS_LIT, 1); g.lineBetween(x - 10, y - 121, x - 40, y - 71);
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x - 44, y - 62, 30, 12);
  g.fillStyle(BRASS, 1); g.fillEllipse(x - 44, y - 65, 28, 10);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 46, y - 62, 4, 10);
  // Bunting from the frame to the corners.
  bunting(g, x - 130, y - 52, x - 70, y - 168, 10);
  bunting(g, x + 70, y - 168, x + 130, y - 52, 10);
}

/** The wire drum itself, turning: hexagonal end-plates, wire bars, balls tumbling inside. */
export function draftDrum(g: G, x: number, y: number, r: number, a: number, len: number): void {
  // Back plate.
  g.lineStyle(3, GILT_DARK, 1); g.strokeEllipse(x - len / 2, y, r * 0.5, r * 2);
  // Balls inside, tumbling as it turns.
  for (let i = 0; i < 14; i++) {
    const b = a * (1 + (i % 3) * 0.2) + i * 2.1;
    const bx = x - len * 0.4 + ((i * 37) % 100) / 100 * len * 0.8;
    const by = y + Math.sin(b) * r * 0.55 + r * 0.2;
    drawBall(g, bx, by, 5, (i * 7 + 3) % 90, [RED, INK, GILT][i % 3]);
  }
  // Bars, rotating.
  for (let i = 0; i < 8; i++) {
    const b = a + (i / 8) * Math.PI * 2;
    const yy = y + Math.sin(b) * r;
    const front = Math.cos(b) > 0;
    g.lineStyle(front ? 2.2 : 1.2, front ? GILT_LIT : GILT_DARK, front ? 1 : 0.6);
    g.lineBetween(x - len / 2, yy, x + len / 2, yy);
  }
  g.lineStyle(4, GILT, 1); g.strokeEllipse(x + len / 2, y, r * 0.5, r * 2);
  g.fillStyle(GILT_LIT, 1); g.fillCircle(x + len / 2, y, 4); g.fillCircle(x - len / 2, y, 3);
}

/**
 * The Draw board: a tall black board in a gilt frame, rows of this week's drawn numbers in white
 * enamel, the conscripted struck through in red, and a little roof to keep the rain off the ink.
 */
export function numbersBoard(g: G, x: number, y: number, seed: number): void {
  shadow(g, x, y + 2, 140, 18);
  for (const k of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * 58 - 4, y - 150, 8, 150); }
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - 64, y - 156, 128, 112);
  g.fillStyle(INK, 1); g.fillRect(x - 58, y - 150, 116, 100);
  let s = seed;
  for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const n = 100 + (s % 9000);
    const cx = x - 40 + c * 27, cy = y - 140 + r * 16;
    numberGlyph(g, cx, cy + 4, 7, n, IVORY);
    if ((s >> 5) % 3 === 0) { g.lineStyle(1.5, RED_LIT, 1); g.lineBetween(cx - 12, cy + 4, cx + 12, cy + 4); }
  }
  // Gable roof and a header plate.
  g.fillStyle(RED_DARK, 1); g.fillTriangle(x - 72, y - 156, x + 72, y - 156, x, y - 180);
  g.fillStyle(GILT, 1); g.fillRect(x - 40, y - 172, 80, 10);
  for (let i = 0; i < 5; i++) suit(g, x - 28 + i * 14, y - 167, 3.2, (['heart', 'spade', 'diamond', 'club', 'heart'] as Suit[])[i], i % 2 ? INK : RED);
  // Pasted notices at the foot.
  for (let i = 0; i < 3; i++) { g.fillStyle(IVORY, 0.9); g.fillRect(x - 50 + i * 36, y - 40, 26, 30); g.lineStyle(1, IVORY_DARK, 1); for (let k = 0; k < 4; k++) g.lineBetween(x - 47 + i * 36, y - 34 + k * 6, x - 28 + i * 36, y - 34 + k * 6); }
}

/** The tilt barrier: a striped rail on posts, red and white, running from x0 to x1 at height y. */
export function tiltRail(g: G, x0: number, x1: number, y: number): void {
  g.fillStyle(0x000000, 0.22); g.fillRect(x0, y - 2, x1 - x0, 8);
  for (let x = x0; x <= x1; x += 60) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 3, y - 30, 6, 30);
    g.fillStyle(GILT, 1); g.fillCircle(x, y - 31, 3.5);
  }
  for (let x = x0; x < x1; x += 20) {
    g.fillStyle(((x - x0) / 20) % 2 ? IVORY : RED, 1); g.fillRect(x, y - 26, 20, 8);
  }
  g.fillStyle(0x000000, 0.2); g.fillRect(x0, y - 18, x1 - x0, 2);
}

/** The grandstand over the tilt yard: tiered benches under a striped awning, pennants on top. */
export function grandstand(g: G, x: number, y: number, w: number, rng: () => number): void {
  shadow(g, x, y + 4, w * 1.05, 24);
  const x0 = x - w / 2;
  for (let k = 0; k < 4; k++) {
    g.fillStyle(k % 2 ? TIMBER : TIMBER_DARK, 1); g.fillRect(x0 + k * 6, y - 14 - k * 14, w - k * 12, 14);
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(x0 + k * 6, y - 14 - k * 14, w - k * 12, 3);
    // A scatter of the court's spectators: hats in a row.
    for (let bx = x0 + 10 + k * 6; bx < x0 + w - 10 - k * 6; bx += 14 + rng() * 10) {
      if (rng() < 0.35) continue;
      g.fillStyle([RED, INK, CANVAS, COAT_DARK][Math.floor(rng() * 4)], 1); g.fillCircle(bx, y - 20 - k * 14, 4);
      g.fillStyle(0xd8b08a, 1); g.fillCircle(bx, y - 17 - k * 14, 3);
    }
  }
  // Awning posts and stripes.
  const ay = y - 14 - 4 * 14 - 30;
  for (const k of [0, 0.5, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 + 4 + k * (w - 8) - 2, ay, 4, y - ay); }
  for (let i = 0; i < w / 20; i++) {
    g.fillStyle(i % 2 ? CANVAS_LIT : RED, 1); g.fillRect(x0 + i * 20, ay - 14, 20, 14);
    g.fillStyle(i % 2 ? CANVAS_LIT : RED, 1); g.fillTriangle(x0 + i * 20, ay, x0 + i * 20 + 20, ay, x0 + i * 20 + 10, ay + 8);
  }
  for (let i = 0; i <= 4; i++) {
    const px = x0 + (i * w) / 4;
    g.lineStyle(1.5, TIMBER_DARK, 1); g.lineBetween(px, ay - 14, px, ay - 34);
    g.fillStyle(i % 2 ? INK : GILT, 1); g.fillTriangle(px, ay - 34, px, ay - 26, px + 14, ay - 30);
  }
}

/** A stable block: three half-doors, a horse's head over one, a caparison hung to air. */
export function stable(g: G, x: number, y: number, w: number): void {
  shadow(g, x, y + 4, w * 1.05, 22);
  const x0 = x - w / 2, h = 64;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0, y - h, w, h);
  for (let k = 0; k < h; k += 8) { g.fillStyle(k % 16 ? TIMBER : TIMBER_LIT, 1); g.fillRect(x0 + 1, y - h + k, w - 2, 7); }
  g.fillStyle(RED_DARK, 1); g.fillTriangle(x0 - 10, y - h, x0 + w + 10, y - h, x, y - h - 34);
  g.fillStyle(RED, 1); g.fillRect(x0 - 10, y - h - 6, w + 20, 8);
  const n = 3;
  for (let i = 0; i < n; i++) {
    const dx = x0 + (i + 0.5) * (w / n);
    g.fillStyle(0x1e1812, 1); g.fillRect(dx - 16, y - 46, 32, 46);
    g.fillStyle(TIMBER, 1); g.fillRect(dx - 16, y - 24, 32, 24);
    g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(dx - 16, y - 24, dx + 16, y); g.lineBetween(dx + 16, y - 24, dx - 16, y);
    g.fillStyle(IVORY, 1); g.fillRect(dx - 8, y - 56, 16, 8);
    numberGlyph(g, dx, y - 52, 5, 7 + i * 11, INK);
    if (i === 1) {
      // A grey mare looking out.
      g.fillStyle(0x9a948a, 1); g.fillEllipse(dx + 2, y - 30, 16, 26);
      g.fillStyle(0x7a746a, 1); g.fillEllipse(dx + 3, y - 20, 12, 9);
      g.fillStyle(INK, 1); g.fillCircle(dx - 2, y - 36, 1.5); g.fillCircle(dx + 6, y - 36, 1.5);
      g.fillTriangle(dx - 4, y - 42, dx - 1, y - 42, dx - 3, y - 50); g.fillTriangle(dx + 5, y - 42, dx + 8, y - 42, dx + 7, y - 50);
      g.fillStyle(IVORY, 1); g.fillRect(dx, y - 40, 4, 12);
    }
  }
  // A horseshoe over the middle door, points up, for luck.
  g.lineStyle(2.5, IRON_LIT, 1); g.beginPath(); g.arc(x, y - h + 8, 6, 0, Math.PI, false); g.strokePath();
}

/** A quintain: a post with a pivoting arm, a shield on one end and a swinging sandbag on the other. */
export function quintain(g: G, x: number, y: number, a: number): void {
  shadow(g, x, y + 1, 30, 8);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 3, y - 62, 6, 62);
  const c = Math.cos(a) * 30, sn = Math.sin(a) * 8;
  g.lineStyle(4, TIMBER, 1); g.lineBetween(x - c, y - 60 - sn, x + c, y - 60 + sn);
  g.fillStyle(RED, 1); g.fillRoundedRect(x + c - 8, y - 72 + sn, 16, 20, 4);
  suit(g, x + c, y - 62 + sn, 5, 'heart', IVORY);
  g.lineStyle(1, CANVAS_DARK, 1); g.lineBetween(x - c, y - 60 - sn, x - c - 2, y - 44 - sn);
  g.fillStyle(BAG, 1); g.fillEllipse(x - c - 2, y - 40 - sn, 12, 14);
}

/** The quartermaster's stall: a striped awning over a counter of shakos, drums, pikes on a rack. */
export function quartermaster(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 200, 22);
  // Pike rack behind.
  for (let i = 0; i < 6; i++) {
    const px = x - 70 + i * 12;
    g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(px, y - 10, px + 2, y - 120);
    g.fillStyle(IRON_LIT, 1); g.fillTriangle(px - 2, y - 120, px + 6, y - 120, px + 2, y - 134);
  }
  g.fillStyle(TIMBER, 1); g.fillRect(x - 78, y - 70, 76, 5);
  // Counter.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 84, y - 36, 168, 36);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 84, y - 40, 168, 6);
  for (let i = 0; i < 8; i++) { g.fillStyle(i % 2 ? INK : RED, 1); g.fillRect(x - 80 + i * 20, y - 30, 20, 26); }
  // Wares: shakos on stands, a drum, coiled bandoliers, a tray of brass Lots.
  for (let i = 0; i < 3; i++) {
    const sx = x - 60 + i * 26;
    g.fillStyle(INK, 1); g.fillRect(sx - 6, y - 58, 12, 16);
    g.fillStyle(BRASS, 1); g.fillTriangle(sx - 3, y - 54, sx + 3, y - 54, sx, y - 48);
    g.fillStyle(i === 1 ? GILT : RED, 1); g.fillEllipse(sx, y - 62, 5, 9);
  }
  fieldDrum(g, x + 30, y - 40, 0.9);
  for (let i = 0; i < 6; i++) lotToken(g, x + 58 + (i % 3) * 8, y - 46 + Math.floor(i / 3) * 6, 3, 0);
  // Awning on poles.
  for (const k of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * 90 - 2, y - 120, 4, 120); }
  for (let i = 0; i < 9; i++) {
    g.fillStyle(i % 2 ? CANVAS_LIT : RED, 1); g.fillRect(x - 96 + i * 21.3, y - 136, 21.3, 18);
    g.fillTriangle(x - 96 + i * 21.3, y - 118, x - 96 + (i + 1) * 21.3, y - 118, x - 96 + (i + 0.5) * 21.3, y - 108);
  }
  void rng;
}

/** The map tent: an open awning over a trestle table, the map of the isle weighted with chips. */
export function mapTable(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 180, 24);
  for (const k of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * 84 - 2, y - 110, 4, 110); }
  g.fillStyle(CANVAS_DARK, 1); g.fillRect(x - 92, y - 124, 184, 16);
  g.fillStyle(CANVAS, 1); g.fillRect(x - 92, y - 128, 184, 10);
  for (let i = 0; i < 9; i++) g.fillTriangle(x - 92 + i * 20.4, y - 108, x - 92 + (i + 1) * 20.4, y - 108, x - 92 + (i + 0.5) * 20.4, y - 100);
  // Trestles.
  g.lineStyle(3, TIMBER_DARK, 1);
  for (const k of [-1, 1]) { g.lineBetween(x + k * 54, y - 30, x + k * 64, y); g.lineBetween(x + k * 54, y - 30, x + k * 44, y); }
  // The map: baize-green island on parchment, red and black chips as markers, a pair of dividers.
  g.fillStyle(TIMBER, 1); g.fillRect(x - 70, y - 36, 140, 8);
  g.fillStyle(0xe6d6aa, 1); g.fillRect(x - 66, y - 50, 132, 16);
  g.fillStyle(BAIZE_DARK, 1); g.fillEllipse(x - 6, y - 42, 80, 12);
  for (const [dx, c] of [[-30, RED], [-12, INK], [8, RED], [26, INK], [40, GILT]] as [number, number][]) {
    g.fillStyle(dim(c, 0.3), 1); g.fillEllipse(x + dx, y - 43, 8, 4); g.fillStyle(c, 1); g.fillEllipse(x + dx, y - 44, 8, 4);
  }
  g.lineStyle(1, IRON_LIT, 1); g.lineBetween(x + 50, y - 48, x + 56, y - 36); g.lineBetween(x + 50, y - 48, x + 44, y - 36);
  // A shaded lantern hung from the awning.
  g.lineStyle(1, IRON_DARK, 1); g.lineBetween(x, y - 108, x, y - 92);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 5, y - 92, 10, 12);
  g.fillStyle(LAMP, 1); g.fillRect(x - 3, y - 90, 6, 8);
}

/** A scout's lantern on a stake: a shuttered iron box, bright when `on`. */
export function lantern(g: G, x: number, y: number, on: number): void {
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 6, y - 10, 12, 14);
  g.fillStyle(mixC(0x3a342a, LAMP, on), 1); g.fillRect(x - 4, y - 8, 8, 10);
  g.fillStyle(IRON, 1); g.fillTriangle(x - 7, y - 10, x + 7, y - 10, x, y - 16);
  g.lineStyle(1, IRON, 1); g.strokeCircle(x, y - 18, 2.5);
}

/** The court's waystone: a cannon set muzzle-down in the ground, its breech carved as a die. */
export function warWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 46, 12);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 20, y - 12, 40, 12);
  g.fillStyle(STONE, 1); g.fillRect(x - 18, y - 14, 36, 4);
  g.fillStyle(BRONZE, 1); g.fillRect(x - 10, y - 58, 20, 46);
  g.fillStyle(BRONZE_LIT, 1); g.fillRect(x - 7, y - 58, 4, 46);
  g.fillStyle(dim(BRONZE, 0.25), 1); g.fillRect(x - 12, y - 38, 24, 4); g.fillRect(x - 12, y - 24, 24, 4);
  g.fillStyle(IVORY, 1); g.fillRect(x - 14, y - 80, 28, 24);
  g.fillStyle(IVORY_DARK, 1); g.fillRect(x - 14, y - 58, 28, 3);
  pips(g, x, y - 68, 10, 6, RED);
  g.fillStyle(0x88eecc, 0.5); g.fillCircle(x, y - 68, 4);
}

/** A cookpot on a tripod over a fire pit, ringed with stones. */
export function cookfire(g: G, x: number, y: number, rng: () => number): void {
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; g.fillStyle(i % 2 ? STONE : STONE_DARK, 1); g.fillEllipse(x + Math.cos(a) * 20, y + Math.sin(a) * 8, 10, 7); }
  g.fillStyle(0x1a1410, 1); g.fillEllipse(x, y, 30, 11);
  g.lineStyle(2.5, TIMBER_DARK, 1); g.lineBetween(x - 22, y + 4, x, y - 44); g.lineBetween(x + 22, y + 4, x, y - 44); g.lineBetween(x, y + 8, x, y - 44);
  g.lineStyle(1, IRON, 1); g.lineBetween(x, y - 44, x, y - 30);
  g.fillStyle(IRON_DARK, 1); g.fillEllipse(x, y - 20, 26, 20);
  g.fillStyle(IRON, 1); g.fillEllipse(x, y - 28, 24, 6);
  g.fillStyle(0x6a5a3a, 1); g.fillEllipse(x, y - 28, 20, 4);
  void rng;
}

// ── Ground ───────────────────────────────────────────────────────────

/** Trampled mud: churned with boot and hoof prints, puddles in the ruts. */
export function mudGround(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  g.fillStyle(MUD, 1); g.fillRect(x, y, w, h);
  for (let i = 0; i < (w * h) / 1400; i++) {
    const px = x + rng() * w, py = y + rng() * h, k = rng();
    if (k < 0.3) { g.fillStyle(MUD_DARK, 0.4); g.fillEllipse(px, py, 8 + rng() * 14, 3 + rng() * 4); }
    else if (k < 0.55) { g.fillStyle(MUD_LIT, 0.35); g.fillEllipse(px, py, 6 + rng() * 10, 2 + rng() * 3); }
    else if (k < 0.62) { g.fillStyle(MUD_WET, 0.8); g.fillEllipse(px, py, 16 + rng() * 26, 5 + rng() * 6); g.fillStyle(0x8a8a7a, 0.25); g.fillEllipse(px - 3, py - 1, 8, 2); }
    else if (k < 0.8) {
      // A boot print.
      g.fillStyle(MUD_DARK, 0.45); g.fillEllipse(px, py, 4, 7); g.fillEllipse(px + 1, py + 6, 3, 3);
    } else { g.fillStyle(BAIZE_DARK, 0.3); g.fillRect(px, py, 2, 1.5); }
  }
}

/**
 * The parade ground: raked sand in long lines, white-painted marker lines for the ranks, and a
 * painted ring with numbered stations where the drafted are stood to be counted.
 */
export function paradeGround(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  g.fillStyle(SAND_DARK, 1); g.fillRect(x - 6, y - 6, w + 12, h + 12);
  g.fillStyle(0xc8af80, 1); g.fillRect(x, y, w, h);
  for (let k = 0; k < h; k += 5) { g.lineStyle(1, SAND_DARK, 0.25); g.lineBetween(x, y + k, x + w, y + k); }
  for (let i = 0; i < w * h / 900; i++) { g.fillStyle(rng() < 0.5 ? SAND_DARK : 0xe0cca4, 0.4); g.fillCircle(x + rng() * w, y + rng() * h, 1); }
  // Rank lines.
  for (let k = 1; k < 5; k++) { g.lineStyle(2, IVORY, 0.55); g.lineBetween(x + 30, y + (k * h) / 5, x + w - 30, y + (k * h) / 5); }
  // Station marks along the lines: little numbered squares.
  for (let k = 1; k < 5; k++) for (let c = 0; c < 8; c++) {
    const sx = x + 50 + c * ((w - 100) / 7), sy = y + (k * h) / 5;
    g.fillStyle(IVORY, 0.7); g.fillRect(sx - 6, sy - 6, 12, 12);
    numberGlyph(g, sx, sy, 6, k * 10 + c, RED_DARK, 0.8);
  }
}

/**
 * A length of trench, dug into the slope: wattle revetment on both faces, a clay floor with
 * duckboards, sandbag parapets above. `flooded` fills it with bog water instead.
 */
export function trenchRun(g: G, x0: number, x1: number, y: number, h: number, rng: () => number, flooded = false): void {
  const top = y - h / 2;
  // Parapet spoil, dug earth heaped either side.
  g.fillStyle(MUD_LIT, 0.8); g.fillRect(x0, top - 14, x1 - x0, 14); g.fillRect(x0, top + h, x1 - x0, 12);
  // The cut: dark faces, lighter floor.
  g.fillStyle(MUD_DARK, 1); g.fillRect(x0, top, x1 - x0, h);
  if (flooded) {
    g.fillStyle(BOG_DEEP, 1); g.fillRect(x0, top + 8, x1 - x0, h - 14);
    g.fillStyle(BOG, 1); g.fillRect(x0, top + 12, x1 - x0, h - 22);
    for (let i = 0; i < (x1 - x0) / 30; i++) { g.fillStyle(BOG_LIT, 0.35); g.fillEllipse(x0 + rng() * (x1 - x0), top + 14 + rng() * (h - 28), 18, 3); }
    // A drowned duckboard and a floating ration tin.
    g.fillStyle(TIMBER_DARK, 0.7); g.fillRect(x0 + (x1 - x0) * 0.3, top + h * 0.45, 60, 8);
  } else {
    g.fillStyle(0x4e3c2a, 1); g.fillRect(x0, top + 10, x1 - x0, h - 20);
    for (let x = x0; x < x1; x += 14) {
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(x, top + h / 2 - 9, 12, 18);
      g.fillStyle(TIMBER, 1); g.fillRect(x + 1, top + h / 2 - 9, 10, 16);
    }
  }
  // Wattle revetment: woven stakes along each face.
  for (const fy of [top, top + h - 9]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0, fy, x1 - x0, 9);
    for (let x = x0; x < x1; x += 6) { g.fillStyle(((x - x0) / 6) % 2 ? TIMBER : TIMBER_LIT, 1); g.fillRect(x, fy + 2, 5, 5); }
  }
  // Sandbag parapet on the north lip, every so often a firestep notch.
  for (let x = x0 + 4; x < x1 - 12; x += 18) {
    g.fillStyle(BAG_DARK, 1); g.fillEllipse(x + 9, top - 5, 19, 10);
    g.fillStyle(BAG, 1); g.fillEllipse(x + 9, top - 6.5, 18, 9);
  }
}

/** A duckboard bridge over the trench, `w` wide, spanning (x, y0)–(x, y1). */
export function duckboardBridge(g: G, x: number, y0: number, y1: number, w: number): void {
  g.fillStyle(0x000000, 0.25); g.fillRect(x - w / 2 + 4, y0, w, y1 - y0);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2, y0 - 6, 8, y1 - y0 + 12); g.fillRect(x + w / 2 - 8, y0 - 6, 8, y1 - y0 + 12);
  for (let y = y0 - 4; y < y1 + 4; y += 10) {
    g.fillStyle(TIMBER, 1); g.fillRect(x - w / 2 + 2, y, w - 4, 8);
    g.fillStyle(TIMBER_LIT, 0.6); g.fillRect(x - w / 2 + 2, y, w - 4, 2);
  }
}

/** A shell crater: a ring of thrown clay, a dark bowl, a puddle in the bottom. */
export function crater(g: G, x: number, y: number, r: number, fresh = 1): void {
  g.fillStyle(MUD_LIT, 0.9); g.fillEllipse(x, y, r * 2.3, r * 1.5);
  g.fillStyle(MUD_DARK, 1); g.fillEllipse(x, y + 2, r * 1.8, r * 1.1);
  g.fillStyle(0x2a2016, 1); g.fillEllipse(x, y + 4, r * 1.2, r * 0.7);
  g.fillStyle(BOG, 0.6 * fresh + 0.2); g.fillEllipse(x, y + 6, r * 0.6, r * 0.25);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + r; g.fillStyle(MUD_LIT, 1); g.fillCircle(x + Math.cos(a) * r * 1.12, y + Math.sin(a) * r * 0.72, 3 + (i % 3)); }
}

/** A road paved in the isle's red and black slabs, kerbed with gilt-stone. */
export function chequerRoad(g: G, x0: number, y0: number, x1: number, y1: number, w: number): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / len, uy = (y1 - y0) / len;
  const nx = -uy, ny = ux;
  const cell = w / 3;
  g.fillStyle(STONE_DARK, 1);
  g.fillPoints([P(x0 + nx * (w / 2 + 6), y0 + ny * (w / 2 + 6)), P(x1 + nx * (w / 2 + 6), y1 + ny * (w / 2 + 6)), P(x1 - nx * (w / 2 + 6), y1 - ny * (w / 2 + 6)), P(x0 - nx * (w / 2 + 6), y0 - ny * (w / 2 + 6))], true);
  for (let d = 0; d < len; d += cell) {
    for (let c = 0; c < 3; c++) {
      const k = Math.floor(d / cell) + c;
      const ox = -w / 2 + c * cell;
      const ax = x0 + ux * d + nx * ox, ay = y0 + uy * d + ny * ox;
      const dl = Math.min(cell, len - d);
      g.fillStyle(k % 2 ? INK_LIT : RED_DARK, 1);
      g.fillPoints([P(ax, ay), P(ax + ux * dl, ay + uy * dl), P(ax + ux * dl + nx * cell, ay + uy * dl + ny * cell), P(ax + nx * cell, ay + ny * cell)], true);
    }
  }
  // Mud tracked across it, in patches.
  for (let d = 30; d < len; d += 70) {
    g.fillStyle(MUD, 0.35); g.fillEllipse(x0 + ux * d + nx * ((d * 13) % w - w / 2) * 0.6, y0 + uy * d + ny * ((d * 13) % w - w / 2) * 0.6, 26, 10);
  }
}
