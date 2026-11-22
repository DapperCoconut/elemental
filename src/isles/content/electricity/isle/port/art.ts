import type { Pt } from '../../../../IslesTypes';
import { type G, dim, glow, lit, mixC, shadow } from '../../../../art/IsleArt';
import { poly } from '../../../water/isle/port/art';

/**
 * Terminus's palette and set pieces — the harbour where the great undersea cable comes ashore.
 *
 * Everything here is night and storm-light: black basalt, soot-brick, wet cobbles that hold the blue
 * of every flash, copper gone green at the joints, and the cold white of metered bulbs in the houses
 * that paid their Draw. Houses that did not are dark, with red tags nailed by the door. The only warm
 * light on the isle is contraband: flame.
 */

// ── Palette ──────────────────────────────────────────────────────────
export const NIGHT = 0x0b0d15;
export const BASALT = 0x1c1d25;
export const BASALT_ALT = 0x25262f;
export const BASALT_LIT = 0x3c3f4c;
export const COBBLE = 0x2c2e38;
export const COBBLE_DARK = 0x17181f;
export const COBBLE_WET = 0x4c6286;
export const COPPER = 0xc8783e;
export const COPPER_DARK = 0x6e3a1c;
export const COPPER_LIT = 0xf2ac6a;
export const VERDI = 0x4aae98;
export const BRASS = 0xd2aa4a;
export const BRASS_DARK = 0x7a5c22;
export const IRON = 0x3c404c;
export const IRON_DARK = 0x1e2028;
export const IRON_LIT = 0x6c7284;
export const ARC = 0x9ad4ff;
export const ARC_CORE = 0xecf7ff;
export const GRID = 0x6a8aff;
export const GRID_DARK = 0x283270;
export const BULB = 0xdcecff;
export const FLAME = 0xffc062;
export const SEA = 0x0d1a2c;
export const SEA_DEEP = 0x050b16;
export const SEA_LIT = 0x2a4a6c;
export const FOAM = 0xa8c0d8;
export const CHALK = 0xe6e4d8;
export const TAG = 0xd8443a;
export const SLATE = 0x2a2e3c;
export const SLATE_LIT = 0x48526c;
export const BRICK = 0x4a2e28;
export const BRICK_DARK = 0x2a1a17;
export const WOOD = 0x4a3426;
export const WOOD_DARK = 0x281b13;
export const PORCELAIN = 0xd8d0c0;
export const RUBBER = 0x1a1612;

// ── Wires ────────────────────────────────────────────────────────────

/** A point `t` (0–1) of the way along a sagging wire from a to b. */
export function sagPt(a: Pt, b: Pt, sag: number, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * sag };
}

/** A sagging wire (or cable) between two points: a dark under-stroke and a copper glint on top. */
export function wire(g: G, a: Pt, b: Pt, sag: number, w: number, color = 0x0a0a0e, glint = COPPER, alpha = 1): void {
  const n = Math.max(6, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 24));
  g.lineStyle(w, color, alpha);
  g.beginPath();
  for (let i = 0; i <= n; i++) { const p = sagPt(a, b, sag, i / n); if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); }
  g.strokePath();
  if (w >= 2) {
    g.lineStyle(Math.max(1, w * 0.3), glint, alpha * 0.55);
    g.beginPath();
    for (let i = 0; i <= n; i++) { const p = sagPt(a, b, sag, i / n); if (i === 0) g.moveTo(p.x, p.y - w * 0.25); else g.lineTo(p.x, p.y - w * 0.25); }
    g.strokePath();
  }
}

/** One string of glass insulator discs hanging from a crossarm (top at x,y). */
export function insulator(g: G, x: number, y: number, discs = 4, glass = 0x5a9a8a): void {
  g.lineStyle(1.5, IRON_DARK, 1); g.lineBetween(x, y, x, y + discs * 4 + 2);
  for (let k = 0; k < discs; k++) {
    const dy = y + 3 + k * 4;
    g.fillStyle(dim(glass, 0.35), 1); g.fillEllipse(x, dy + 1, 10, 4);
    g.fillStyle(glass, 1); g.fillEllipse(x, dy, 9, 3.4);
    g.fillStyle(lit(glass, 0.5), 0.8); g.fillEllipse(x - 2, dy - 0.6, 3, 1.2);
  }
}

/**
 * A lattice pylon, x,y = the foot centre, h tall. Two splayed legs, a stack of X-braces, a crossarm
 * with three insulator strings and a little warning plate. `pylonTips` gives where the wires hang.
 */
export function pylon(g: G, x: number, y: number, h: number): void {
  shadow(g, x, y + 2, 60, 14, 0.4);
  const top = y - h;
  const legB = 24, legT = 7;
  // Concrete feet.
  for (const s of [-1, 1]) { g.fillStyle(0x4a4a50, 1); g.fillRect(x + s * legB - 6, y - 6, 12, 8); g.fillStyle(0x6a6a72, 1); g.fillRect(x + s * legB - 6, y - 7, 12, 2); }
  // Legs.
  g.lineStyle(3, IRON_DARK, 1);
  g.lineBetween(x - legB, y - 4, x - legT, top + 18); g.lineBetween(x + legB, y - 4, x + legT, top + 18);
  g.lineStyle(1.5, IRON_LIT, 0.6);
  g.lineBetween(x - legB + 1, y - 4, x - legT + 1, top + 18);
  // Bracing: X between each pair of rungs.
  const rungs = 6;
  for (let i = 0; i < rungs; i++) {
    const f0 = i / rungs, f1 = (i + 1) / rungs;
    const y0 = y - 4 - (y - 4 - (top + 18)) * f0, y1 = y - 4 - (y - 4 - (top + 18)) * f1;
    const w0 = legB + (legT - legB) * f0, w1 = legB + (legT - legB) * f1;
    g.lineStyle(1.2, IRON, 1);
    g.lineBetween(x - w0, y0, x + w1, y1); g.lineBetween(x + w0, y0, x - w1, y1);
    g.lineStyle(1.5, IRON_DARK, 1); g.lineBetween(x - w1, y1, x + w1, y1);
  }
  // Crossarm and peak.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 46, top + 14, 92, 5);
  g.lineStyle(1, IRON_LIT, 0.7); g.lineBetween(x - 46, top + 14, x + 46, top + 14);
  g.lineStyle(1.5, IRON_DARK, 1);
  g.lineBetween(x - 46, top + 19, x - legT, top + 30); g.lineBetween(x + 46, top + 19, x + legT, top + 30);
  g.lineBetween(x - legT, top + 18, x, top); g.lineBetween(x + legT, top + 18, x, top);
  g.fillStyle(COPPER, 1); g.fillCircle(x, top, 2.5);
  for (const t of pylonTips(x, y, h)) insulator(g, t.x, top + 19, 3);
  // The warning plate: a white bolt on black, and a little red tag of the Grid's.
  g.fillStyle(0xe8e0c8, 1); g.fillRect(x - 6, y - h * 0.38, 12, 10);
  g.fillStyle(0x0a0a0a, 1);
  poly(g, [[x + 2, y - h * 0.38 + 1], [x - 3, y - h * 0.38 + 6], [x, y - h * 0.38 + 6], [x - 2, y - h * 0.38 + 10], [x + 3, y - h * 0.38 + 4], [x, y - h * 0.38 + 4]], 0x0a0a0a);
}

/** Where a pylon's three wires hang from (the bottoms of its insulator strings). */
export function pylonTips(x: number, y: number, h: number): Pt[] {
  return [-40, 0, 40].map((dx) => ({ x: x + dx, y: y - h + 33 }));
}

// ── Seals, dials, tags ──────────────────────────────────────────────

/** The Grid's mark: half a meter dial (ticks round the top arc) with a lightning bolt for the needle. */
export function gridSeal(g: G, x: number, y: number, r: number, color = GRID, a = 1): void {
  g.lineStyle(Math.max(1.5, r * 0.12), color, a);
  g.beginPath(); g.arc(x, y, r, Math.PI, 0, false); g.strokePath();
  g.lineBetween(x - r, y, x + r, y);
  for (let i = 0; i <= 8; i++) {
    const ang = Math.PI + (i / 8) * Math.PI;
    g.lineStyle(Math.max(1, r * 0.07), color, a);
    g.lineBetween(x + Math.cos(ang) * r * 0.78, y + Math.sin(ang) * r * 0.78, x + Math.cos(ang) * r * 0.95, y + Math.sin(ang) * r * 0.95);
  }
  poly(g, [[x - r * 0.1, y], [x + r * 0.26, y - r * 0.42], [x + r * 0.06, y - r * 0.42], [x + r * 0.32, y - r * 0.84],
    [x - r * 0.14, y - r * 0.34], [x + r * 0.06, y - r * 0.34]], color, a);
}

/** A brass meter dial: rim, cream face, ticks, a red zone, and a needle at `reading` (0–1). */
export function meterDial(g: G, x: number, y: number, r: number, reading: number): void {
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y + 1, r + 1.5);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y, r + 1);
  g.fillStyle(0xeee6cc, 1); g.fillCircle(x, y, r * 0.82);
  g.lineStyle(Math.max(1, r * 0.18), TAG, 0.85);
  g.beginPath(); g.arc(x, y, r * 0.62, Math.PI * 1.05, Math.PI * 1.3, false); g.strokePath();
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI * 1.05 + (i / 6) * Math.PI * 0.9;
    g.lineStyle(1, 0x2a2420, 1); g.lineBetween(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75);
  }
  const na = Math.PI * 1.05 + reading * Math.PI * 0.9;
  g.lineStyle(Math.max(1, r * 0.12), 0x1a1410, 1); g.lineBetween(x, y, x + Math.cos(na) * r * 0.72, y + Math.sin(na) * r * 0.72);
  g.fillStyle(0x1a1410, 1); g.fillCircle(x, y, r * 0.14);
}

/** A switched-off tag: a red card on a nail, a black bolt stamped through with a cross. */
export function offTag(g: G, x: number, y: number, s = 1): void {
  g.fillStyle(0x0a0a0a, 0.4); g.fillRect(x - 3 * s + 1, y + 1, 7 * s, 10 * s);
  g.fillStyle(TAG, 1); g.fillRect(x - 3.5 * s, y, 7 * s, 10 * s);
  g.fillStyle(0xf0d0c8, 0.6); g.fillRect(x - 3.5 * s, y, 7 * s, 1.5 * s);
  g.lineStyle(1, 0x2a0a08, 1); g.lineBetween(x - 2 * s, y + 3 * s, x + 2 * s, y + 8 * s); g.lineBetween(x + 2 * s, y + 3 * s, x - 2 * s, y + 8 * s);
  g.fillStyle(IRON_LIT, 1); g.fillCircle(x, y - 0.5, 1.2);
}

// ── Houses ──────────────────────────────────────────────────────────

export interface CrankOpts {
  /** Lit windows (the Draw paid) or dark (switched off). */
  lit: boolean;
  /** Switched-off tags by the door (0–3; three is the last before earthing). */
  tags?: number;
  /** What the household cranks on: a flywheel on the wall, a treadle by the step, or a kitchen dynamo with a belt up the wall. */
  crank?: 'wheel' | 'treadle' | 'belt';
  wall?: number;
  roof?: number;
  /** Tally of this week's Draw chalked by the door: number of strokes. */
  tally?: number;
  /** A hidden candle in a dark upstairs window — contraband. */
  candle?: boolean;
}

/**
 * A crank-house: a narrow, tall terraced house of soot-brick with a steep slate roof and a little
 * lightning rod, a copper service drop from the roof to the brass meter by the door, an electric
 * door-lock box (green pip paid, red pip off), and whatever the household cranks the Draw on.
 * x,y = the front-wall base centre. Returns the door point.
 */
export function crankHouse(g: G, x: number, y: number, w: number, h: number, o: CrankOpts, rng: () => number): Pt {
  const wall = o.wall ?? BRICK, roof = o.roof ?? SLATE;
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 3, w * 1.1, 16, 0.4);
  // Wall: brick courses, soot streaks.
  g.fillStyle(dim(wall, 0.3), 1); g.fillRect(x0 - 1, top, w + 2, h);
  g.fillStyle(wall, 1); g.fillRect(x0, top, w, h);
  for (let ry = top + 5; ry < y; ry += 6) {
    g.lineStyle(1, dim(wall, 0.4), 0.6); g.lineBetween(x0, ry, x0 + w, ry);
    const off = ((ry - top) / 6) % 2 ? 0 : 7;
    for (let rx = x0 + off; rx < x0 + w; rx += 14) { g.lineBetween(rx, ry - 6, rx, ry); }
  }
  for (let k = 0; k < 3; k++) { g.fillStyle(0x000000, 0.18); g.fillRect(x0 + rng() * w, top, 3 + rng() * 5, h * (0.3 + rng() * 0.5)); }
  // Quoins: pale stone at the corners.
  for (let qy = top + 2; qy < y - 4; qy += 12) {
    g.fillStyle(0x6a6a70, 1); g.fillRect(x0, qy, 6, 6); g.fillRect(x0 + w - 6, qy + 6, 6, 6);
  }
  // Steep roof with a chimney pot (cold — flame is contraband) and a lightning rod.
  const rh = h * 0.42;
  poly(g, [[x0 - 6, top + 2], [x0 + w + 6, top + 2], [x + w * 0.1, top - rh], [x - w * 0.1, top - rh]], dim(roof, 0.35));
  poly(g, [[x0 - 4, top], [x0 + w + 4, top], [x + w * 0.1 - 2, top - rh + 2], [x - w * 0.1 + 2, top - rh + 2]], roof);
  for (let sy = top - 6; sy > top - rh + 6; sy -= 6) {
    const f = (top - sy) / rh;
    const hw = (w / 2 + 4) * (1 - f) + w * 0.1 * f;
    g.lineStyle(1, dim(roof, 0.4), 0.8); g.lineBetween(x - hw, sy, x + hw, sy);
  }
  g.lineStyle(1.5, SLATE_LIT, 0.5); g.lineBetween(x0 - 4, top, x - w * 0.1 + 2, top - rh + 2);
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x + w * 0.22, top - rh * 0.8, 9, rh * 0.55);
  g.fillStyle(0x6a6a70, 1); g.fillRect(x + w * 0.22 - 1, top - rh * 0.8, 11, 3);
  g.lineStyle(1.5, COPPER, 1); g.lineBetween(x - w * 0.05, top - rh, x - w * 0.05, top - rh - 18);
  g.fillStyle(COPPER_LIT, 1); g.fillCircle(x - w * 0.05, top - rh - 18, 2);
  // Windows: two up, one down. Lit = cold metered white; dark = switched off.
  const winY = [top + h * 0.18, top + h * 0.18, top + h * 0.5];
  const winX = [x - w * 0.22, x + w * 0.22, x + w * 0.22];
  for (let i = 0; i < 3; i++) {
    const wx = winX[i], wy = winY[i];
    g.fillStyle(0x6a6a70, 1); g.fillRect(wx - 9, wy - 2, 18, 22);
    const candle = o.candle && i === 0 && !o.lit;
    const col = o.lit ? (rng() < 0.85 ? BULB : 0xa8c0e0) : candle ? 0x3a2410 : 0x0c0e14;
    g.fillStyle(col, 1); g.fillRect(wx - 7, wy, 14, 18);
    if (o.lit) { g.fillStyle(0xffffff, 0.6); g.fillRect(wx - 6, wy + 1, 4, 7); }
    if (candle) { g.fillStyle(FLAME, 1); g.fillEllipse(wx + 2, wy + 12, 3, 5); g.fillStyle(0xe8e0d0, 1); g.fillRect(wx + 1, wy + 14, 2, 4); }
    g.lineStyle(1, 0x1a1a1e, 1); g.lineBetween(wx, wy, wx, wy + 18); g.lineBetween(wx - 7, wy + 9, wx + 7, wy + 9);
    g.fillStyle(0x7a7a80, 1); g.fillRect(wx - 10, wy + 18, 20, 3);
  }
  // Door, with the electric lock box: a copper plate, a pip — green paid, red off.
  const dx = x - w * 0.18;
  g.fillStyle(0x6a6a70, 1); g.fillRect(dx - 11, y - 34, 22, 34);
  g.fillStyle(o.lit ? 0x2a3040 : 0x1a1c22, 1); g.fillRect(dx - 9, y - 32, 18, 32);
  g.lineStyle(1, 0x0a0a0e, 0.8); g.strokeRect(dx - 7, y - 30, 14, 12); g.strokeRect(dx - 7, y - 15, 14, 12);
  g.fillStyle(COPPER_DARK, 1); g.fillRect(dx + 5, y - 20, 6, 9);
  g.fillStyle(o.lit ? 0x6aff8a : TAG, 1); g.fillCircle(dx + 8, y - 17, 1.6);
  // The service drop: copper wire off the eave, down the wall, into the brass meter by the door.
  const mx = dx + 18, my = y - 40;
  g.lineStyle(1.5, COPPER_DARK, 1); g.lineBetween(x0 + w - 6, top + 2, mx, my - 8);
  g.lineStyle(1, COPPER, 0.8); g.lineBetween(x0 + w - 7, top + 2, mx - 1, my - 8);
  g.fillStyle(IRON_DARK, 1); g.fillRect(mx - 7, my - 8, 14, 16);
  meterDial(g, mx, my, 5, o.lit ? 0.4 + rng() * 0.4 : 0.02);
  // Switched-off tags: red cards on nails beside the door.
  for (let i = 0; i < (o.tags ?? 0); i++) offTag(g, dx - 16, y - 34 + i * 12, 0.9);
  // Chalked tally of this week's Draw: strokes in fives.
  const tally = o.tally ?? 0;
  for (let i = 0; i < tally; i++) {
    const tx = x0 + 6 + (i % 5) * 3 + Math.floor(i / 5) * 18, ty = y - 18;
    g.lineStyle(1, CHALK, 0.8);
    if (i % 5 === 4) g.lineBetween(tx - 14, ty - 1, tx, ty - 9); else g.lineBetween(tx, ty, tx, ty - 9);
  }
  // What they crank on.
  const crank = o.crank ?? 'wheel';
  if (crank === 'wheel') {
    // An iron flywheel bolted to the wall, a wooden handle on its rim.
    const cx = x + w * 0.24, cy = y - 22;
    g.fillStyle(IRON_DARK, 1); g.fillCircle(cx, cy, 13);
    g.lineStyle(2.5, IRON_LIT, 1); g.strokeCircle(cx, cy, 12);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.lineStyle(1.5, IRON, 1); g.lineBetween(cx, cy, cx + Math.cos(a) * 11, cy + Math.sin(a) * 11); }
    g.fillStyle(BRASS, 1); g.fillCircle(cx, cy, 2.5);
    g.fillStyle(WOOD, 1); g.fillRect(cx + 9, cy - 12, 4, 10);
    g.lineStyle(1, COPPER, 0.8); g.lineBetween(cx - 12, cy, mx + 7, my);
  } else if (crank === 'treadle') {
    // A treadle and pedal-board on the step, belt to a little dynamo under the window.
    const cx = x + w * 0.22;
    g.fillStyle(WOOD_DARK, 1); g.fillRect(cx - 14, y - 6, 28, 5);
    g.fillStyle(WOOD, 1); poly(g, [[cx - 12, y - 6], [cx + 12, y - 6], [cx + 10, y - 13], [cx - 10, y - 11]], WOOD);
    g.fillStyle(IRON, 1); g.fillCircle(cx, y - 32, 7);
    g.fillStyle(COPPER, 1); g.fillCircle(cx, y - 32, 4);
    g.lineStyle(1.5, RUBBER, 1); g.lineBetween(cx - 7, y - 32, cx - 9, y - 10); g.lineBetween(cx + 7, y - 32, cx + 9, y - 10);
  } else {
    // A kitchen dynamo's belt run up the outside wall through a hole, and a coil drum on a bracket.
    const cx = x + w * 0.3;
    g.lineStyle(2, RUBBER, 1); g.lineBetween(cx, y - 4, cx, top + h * 0.38); g.lineBetween(cx + 6, y - 4, cx + 6, top + h * 0.38);
    g.fillStyle(IRON_DARK, 1); g.fillCircle(cx + 3, top + h * 0.38, 6);
    g.fillStyle(COPPER, 1); g.fillRect(cx - 3, y - 14, 12, 12);
    for (let k = 0; k < 5; k++) { g.lineStyle(1, COPPER_DARK, 1); g.lineBetween(cx - 3, y - 13 + k * 2.4, cx + 9, y - 13 + k * 2.4); }
  }
  return { x: dx, y: y + 16 };
}

// ── Lamps ───────────────────────────────────────────────────────────

/**
 * An old lamplighter's street lamp, cold since the lamplighters were earthed: a cast-iron post with
 * a ladder-bar, a soot-blind glass head with a dead wick, and a Grid notice pasted over its plate.
 */
/**
 * A street lamp. `trimmed`: Wren has been round — the glass wiped clean, a fresh wick, the Grid's
 * notice torn off the maker's plate (the flame itself is the overlay's, see `lampFlame`).
 */
export function streetLamp(g: G, x: number, y: number, rng: () => number, trimmed = false): void {
  shadow(g, x, y + 2, 22, 7, 0.4);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 5, y - 6, 10, 6);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 2, y - 70, 4, 66);
  g.fillStyle(IRON_LIT, 0.4); g.fillRect(x - 2, y - 70, 1, 66);
  // Fluted collar and the ladder-bar the lamplighters leaned on.
  g.fillStyle(IRON, 1); g.fillRect(x - 4, y - 30, 8, 5);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 12, y - 64, 24, 3);
  g.fillStyle(IRON, 1); g.fillCircle(x - 12, y - 63, 2); g.fillCircle(x + 12, y - 63, 2);
  // The head: a four-pane lantern, glass sooted over (or wiped and warm).
  poly(g, [[x - 8, y - 72], [x + 8, y - 72], [x + 10, y - 90], [x - 10, y - 90]], 0x1a1a1e);
  poly(g, [[x - 6, y - 73], [x + 6, y - 73], [x + 8, y - 88], [x - 8, y - 88]], trimmed ? 0x6a5030 : 0x2a2c30);
  if (!trimmed) { g.fillStyle(0x0a0a0a, 0.5); g.fillRect(x - 7, y - 86, 14, 6); }
  g.lineStyle(1, 0xe8e0c8, 0.5); g.lineBetween(x, y - 80, x, y - 75);
  g.fillStyle(0x1a1410, 1); g.fillRect(x - 0.5, y - 81, 1, 3);
  poly(g, [[x - 12, y - 90], [x + 12, y - 90], [x, y - 99]], IRON_DARK);
  g.fillStyle(IRON, 1); g.fillCircle(x, y - 100, 2);
  if (trimmed) {
    // The notice torn off: the old brass maker's plate, and a scrap of paper left on a nail.
    g.fillStyle(0x8a6a2a, 1); g.fillRect(x - 5, y - 49, 10, 12);
    g.fillStyle(0xc8a050, 1); g.fillRect(x - 5, y - 49, 10, 2);
    g.fillStyle(0xd8d0b8, 0.7); g.fillTriangle(x + 5, y - 49, x + 5, y - 45, x + 8, y - 48);
    return;
  }
  // The Grid's notice over the old maker's plate.
  g.fillStyle(0xd8d0b8, 0.9); g.fillRect(x - 6, y - 50, 12, 14);
  gridSeal(g, x, y - 41, 4, GRID_DARK, 0.9);
  if (rng() < 0.5) { g.fillStyle(0xd8d0b8, 0.7); g.fillTriangle(x + 6, y - 50, x + 6, y - 44, x + 10, y - 47); }
}

/** Where a street lamp's flame sits (for the overlay that lights them). */
export const lampFlame = (x: number, y: number): Pt => ({ x, y: y - 80 });

// ── Harbour machinery ───────────────────────────────────────────────

/**
 * An iron trestle carrying the great cable, x,y = the foot centre: an A-frame of riveted angle-iron
 * with a cross-tie and a saddle on top lined with tarred felt.
 */
export function trestle(g: G, x: number, y: number, h: number): void {
  shadow(g, x, y + 2, 54, 12, 0.35);
  const top = y - h;
  for (const s of [-1, 1]) {
    g.lineStyle(5, IRON_DARK, 1); g.lineBetween(x + s * 24, y, x + s * 8, top + 6);
    g.lineStyle(1.5, IRON_LIT, 0.5); g.lineBetween(x + s * 24 - 1, y, x + s * 8 - 1, top + 6);
    for (let k = 1; k < 5; k++) { const f = k / 5; g.fillStyle(IRON_LIT, 0.8); g.fillCircle(x + s * (24 - 16 * f), y - h * f + 4, 1.1); }
    g.fillStyle(0x4a4a50, 1); g.fillRect(x + s * 24 - 6, y - 4, 12, 6);
  }
  g.lineStyle(3, IRON_DARK, 1); g.lineBetween(x - 17, y - h * 0.45, x + 17, y - h * 0.45);
  g.lineStyle(2, IRON, 1); g.lineBetween(x - 20, y - h * 0.2, x + 12, y - h * 0.7); g.lineBetween(x + 20, y - h * 0.2, x - 12, y - h * 0.7);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 14, top, 28, 8);
  g.fillStyle(0x1a1410, 1); g.fillEllipse(x, top, 26, 7);
}

/**
 * A run of the great undersea cable: thick, black, armoured in spiralled steel wire with a tarred
 * jute serving, glinting copper where the armour has worn. Drawn as a fat stroke along `pts`.
 */
export function bigCable(g: G, pts: Pt[], r = 9): void {
  g.lineStyle(r * 2 + 3, 0x050506, 1); strokePts(g, pts, 2);
  g.lineStyle(r * 2, 0x18191e, 1); strokePts(g, pts, 0);
  g.lineStyle(r * 0.6, 0x3a3e4a, 0.7); strokePts(g, pts, -r * 0.45);
  // Armour spiral: short diagonal ticks along the run.
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    const nx = -uy, ny = ux;
    for (let d = 4; d < len; d += 7) {
      const cx = a.x + ux * d, cy = a.y + uy * d;
      g.lineStyle(1, 0x6a7080, 0.5);
      g.lineBetween(cx + nx * r * 0.9 - ux * 3, cy + ny * r * 0.9 - uy * 3, cx - nx * r * 0.9 + ux * 3, cy - ny * r * 0.9 + uy * 3);
      if ((i * 31 + Math.round(d)) % 23 === 0) { g.fillStyle(COPPER_LIT, 0.8); g.fillCircle(cx, cy - r * 0.3, 1.5); }
    }
  }
}

function strokePts(g: G, pts: Pt[], dy: number): void {
  g.beginPath();
  pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y + dy) : g.lineTo(p.x, p.y + dy)));
  g.strokePath();
}

/** A wooden cable drum on its side, flanges and a few turns of black cable showing. */
export function cableDrum(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 2, 56 * s, 14 * s, 0.4);
  g.fillStyle(WOOD_DARK, 1); g.fillEllipse(x - 18 * s, y - 24 * s, 14 * s, 48 * s);
  g.fillStyle(0x0e0e10, 1); g.fillRect(x - 18 * s, y - 42 * s, 36 * s, 36 * s);
  for (let k = 0; k < 6; k++) { g.lineStyle(2 * s, 0x2a2c34, 1); g.lineBetween(x - 17 * s, y - 40 * s + k * 6 * s, x + 17 * s, y - 38 * s + k * 6 * s); }
  g.fillStyle(WOOD, 1); g.fillEllipse(x + 18 * s, y - 24 * s, 16 * s, 48 * s);
  g.lineStyle(1, WOOD_DARK, 1); g.strokeEllipse(x + 18 * s, y - 24 * s, 16 * s, 48 * s);
  for (let k = 0; k < 4; k++) { g.lineStyle(1, WOOD_DARK, 0.8); g.lineBetween(x + 18 * s, y - 48 * s + 3, x + 18 * s, y - 2 * s); }
  g.fillStyle(IRON_DARK, 1); g.fillCircle(x + 18 * s, y - 24 * s, 4 * s);
  gridSeal(g, x + 18 * s, y - 30 * s, 5 * s, GRID_DARK, 0.8);
}

/**
 * The Brownout Bell on its iron gantry, x,y = the gantry's centre foot: two riveted posts, a beam,
 * a bronze bell with the Grid's mark cast in, and a pull-rope down to a cleat. The rope is worn
 * pale where Ambrose's hands go.
 */
export function brownoutBell(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 90, 16, 0.4);
  for (const s of [-1, 1]) {
    g.fillStyle(IRON_DARK, 1); g.fillRect(x + s * 34 - 4, y - 132, 8, 132);
    g.fillStyle(IRON_LIT, 0.4); g.fillRect(x + s * 34 - 4, y - 132, 2, 132);
    for (let k = 0; k < 9; k++) { g.fillStyle(IRON_LIT, 0.8); g.fillCircle(x + s * 34, y - 10 - k * 14, 1.2); }
    g.fillStyle(0x4a4a50, 1); g.fillRect(x + s * 34 - 8, y - 6, 16, 7);
    g.lineStyle(2, IRON, 1); g.lineBetween(x + s * 34, y - 110, x + s * 14, y - 130);
  }
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 46, y - 140, 92, 10);
  g.fillStyle(IRON_LIT, 0.5); g.fillRect(x - 46, y - 140, 92, 2);
  // The bell.
  const by = y - 128;
  g.fillStyle(0x3a2810, 1); g.fillRect(x - 4, by, 8, 8);
  poly(g, [[x - 10, by + 6], [x + 10, by + 6], [x + 16, by + 30], [x + 24, by + 44], [x - 24, by + 44], [x - 16, by + 30]], 0x6a4a1e);
  poly(g, [[x - 8, by + 7], [x + 2, by + 7], [x - 4, by + 30], [x - 18, by + 42], [x - 21, by + 42], [x - 14, by + 30]], 0xa87a3a);
  g.fillStyle(0x4a3010, 1); g.fillEllipse(x, by + 44, 48, 8);
  g.fillStyle(0x1a1008, 1); g.fillEllipse(x, by + 45, 40, 5);
  gridSeal(g, x + 3, by + 32, 7, 0xd0a050, 0.8);
  // The rope and its cleat.
  g.lineStyle(2, 0xb8a888, 1); g.lineBetween(x + 14, by + 10, x + 30, y - 40);
  g.lineStyle(2, 0xe8dcc0, 1); g.lineBetween(x + 27, y - 52, x + 30, y - 40);
  g.fillStyle(IRON, 1); g.fillRect(x + 28, y - 40, 6, 3);
}

/** A soot-black hull on the slip, ribs half planked — the boatwright's work in hand. */
export function hullOnStocks(g: G, x: number, y: number, len: number, rng: () => number): void {
  shadow(g, x, y + 4, len * 1.05, 18, 0.4);
  for (let k = 0; k < 4; k++) { const sx = x - len / 2 + 20 + k * (len - 40) / 3; g.fillStyle(WOOD_DARK, 1); g.fillRect(sx - 5, y - 16, 10, 16); }
  const top = y - 56;
  poly(g, [[x - len / 2, top], [x + len / 2, top - 8], [x + len / 2 - 22, y - 16], [x - len / 2 + 30, y - 16]], 0x14141a);
  // Plank courses on the near half, bare ribs on the far.
  for (let k = 0; k < 6; k++) {
    const yy = top + 4 + k * 6;
    g.lineStyle(1, 0x2a2c34, 1); g.lineBetween(x - len / 2 + 6 + k * 4, yy, x + 10, yy - 2);
  }
  for (let k = 0; k < 7; k++) {
    const rx = x + 16 + k * ((len / 2 - 40) / 6);
    g.lineStyle(3, WOOD, 1); g.lineBetween(rx, top - 4 - k, rx - 6 + rng() * 2, y - 18);
  }
  g.lineStyle(2, COPPER, 0.9); g.lineBetween(x - len / 2 + 8, top + 30, x + 10, top + 28);
  g.fillStyle(0x8a2a1a, 1); poly(g, [[x - len / 2 + 30, y - 16], [x + 10, y - 18], [x + 10, y - 22], [x - len / 2 + 22, y - 22]], 0x6a2216);
}

// ── Mixed helpers ───────────────────────────────────────────────────

/** A jagged bolt from a to b (deterministic from `seed`), drawn as a glow, a body and a core. */
export function bolt(g: G, a: Pt, b: Pt, seed: number, alpha = 1, w = 3): void {
  const n = 7;
  const pts: Pt[] = [a];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
  for (let i = 1; i < n; i++) {
    const f = i / n;
    const j = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    const off = ((j - Math.floor(j)) - 0.5) * len * 0.22;
    pts.push({ x: a.x + (b.x - a.x) * f + nx * off, y: a.y + (b.y - a.y) * f + ny * off });
  }
  pts.push(b);
  for (const [lw, c, al] of [[w * 4, ARC, 0.18], [w * 1.6, ARC, 0.8], [w * 0.6, ARC_CORE, 1]] as [number, number, number][]) {
    g.lineStyle(lw, c, al * alpha);
    g.beginPath(); pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y))); g.strokePath();
  }
}

/** The shared storm clock: true during the weather's lightning flashes (matches the `storm` weather). */
export const stormFlash = (t: number): number => {
  const ph = t % 5.3;
  if (ph < 0.09) return 1 - ph / 0.09;
  if (ph > 0.16 && ph < 0.22) return 0.7;
  return 0;
};

/** A puddle on cobbles holding the storm's light. */
export function puddle(g: G, x: number, y: number, rx: number, ry: number): void {
  g.fillStyle(0x0a0c14, 0.8); g.fillEllipse(x, y, rx * 2, ry * 2);
  g.fillStyle(mixC(COBBLE_WET, 0x0a0c14, 0.4), 0.7); g.fillEllipse(x - rx * 0.1, y - ry * 0.1, rx * 1.6, ry * 1.3);
  g.fillStyle(0x9ab8e0, 0.3); g.fillEllipse(x - rx * 0.35, y - ry * 0.3, rx * 0.6, ry * 0.3);
}

/** A warm glow — the colour of contraband — used only where flame is burning. */
export function flameGlow(g: G, x: number, y: number, r: number, a = 0.07): void { glow(g, x, y, r, FLAME, a, 4); }
