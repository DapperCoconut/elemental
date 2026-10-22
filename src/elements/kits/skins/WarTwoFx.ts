import Phaser from 'phaser';
import { FxBase, TAU, easeIn, easeOut } from '../ElementVisuals';
import { jitter } from '../ConquestVisuals';
import type { ConquestColorFn } from '../ConquestVisuals';

/**
 * The WW2 skin's Conquest art: every building and every unit the element puts on the board,
 * redrawn for a 1940s front. **Visual only** — each function here has exactly the signature of
 * the `ConquestVisuals.ts` primitive it replaces, so the kit swaps the whole table per owner
 * (`WW2_CONQUEST_ART`) and nothing about footprint, hitboxes or timing changes.
 *
 * The two board rules from ConquestVisuals still hold: **silhouette carries the type** (an HQ
 * bunker with a radio mast, a Quonset hut, a pillbox gun, a low sandbag wall, a depot under camo
 * netting) and **colour carries the side** — every structure wears a painted band, roundel,
 * flag or pennant in its town colour, and every unit's tunic is cut from it.
 *
 * Colours here are the skin's own and final, so they are drawn raw; only the town colour is
 * passed through the owner's mapper (whose WW2 palette maps it to itself).
 */

export const WW = {
  // Olive drab, darkest → lightest.
  odDeep: 0x232812,
  odShade: 0x39411f,
  od: 0x55602e,
  odLit: 0x717d3f,
  odPale: 0x919b5a,
  // Khaki / burlap.
  khakiShade: 0x7a6e4c,
  khaki: 0xb3a47e,
  khakiLit: 0xd3c59c,
  // Concrete.
  concDark: 0x5c5a50,
  conc: 0x9a978a,
  concLit: 0xc2bfae,
  // Leather / wood.
  leatherDark: 0x2c1d10,
  leather: 0x5a3c22,
  leatherLit: 0x82593a,
  woodDark: 0x3a2716,
  wood: 0x7a5232,
  woodLit: 0xa3733f,
  // Metal.
  gunDark: 0x1e211e,
  gun: 0x3c403b,
  gunLit: 0x7d847c,
  steel: 0xc6cbc1,
  brassDeep: 0x6e5a22,
  brass: 0xc9a94a,
  brassLit: 0xf0d886,
  // Skin and cloth.
  fleshShade: 0xb78d66,
  flesh: 0xe4c19a,
  white: 0xf2eee0,
  black: 0x15140f,
  red: 0xb8322a,
  // Fire.
  fire: 0xff7f2e,
  fireCore: 0xffe39a,
  flash: 0xfff0b8,
  smoke: 0x66625a,
};

type Pt = { x: number; y: number };
type G = Phaser.GameObjects.Graphics;

// ── Shading helpers ─────────────────────────────────────────────────────────

function mix(a: number, b: number, k: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * k) << 16) | (Math.round(ag + (bg - ag) * k) << 8) | Math.round(ab + (bb - ab) * k);
}
const dark = (c: number, k: number): number => mix(c, 0x000000, k);
const light = (c: number, k: number): number => mix(c, 0xffffff, k);

/** A local frame: `u` runs along `ang`, `v` across it. */
function frame(ox: number, oy: number, ang: number): (u: number, v: number) => Pt {
  const c = Math.cos(ang), s = Math.sin(ang);
  return (u, v) => ({ x: ox + c * u - s * v, y: oy + s * u + c * v });
}

function shadow(g: G, x: number, y: number, w: number, h: number, alpha: number): void {
  g.fillStyle(0x000000, alpha * 0.18);
  g.fillEllipse(x, y, w * 1.15, h * 1.3);
  g.fillStyle(0x000000, alpha * 0.22);
  g.fillEllipse(x, y, w * 0.8, h * 0.85);
}

/** Fill a polygon with a dark rim around it — the outline every board object carries. */
function rimmed(g: G, pts: Pt[], base: number, alpha: number, rim = 0.55): void {
  g.fillStyle(base, alpha);
  g.fillPoints(pts, true);
  g.lineStyle(1.2, dark(base, rim), alpha);
  g.strokePoints(pts, true, true);
}

function orb(g: G, x: number, y: number, r: number, base: number, alpha: number): void {
  g.fillStyle(dark(base, 0.55), alpha);
  g.fillCircle(x, y, r);
  g.fillStyle(dark(base, 0.15), alpha);
  g.fillCircle(x, y, r * 0.86);
  g.fillStyle(base, alpha);
  g.fillCircle(x, y + r * 0.06, r * 0.68);
  g.fillStyle(light(base, 0.25), alpha * 0.7);
  g.fillEllipse(x, y + r * 0.45, r * 0.9, r * 0.34);
  g.fillStyle(0xffffff, alpha * 0.7);
  g.fillEllipse(x - r * 0.32, y - r * 0.36, r * 0.38, r * 0.22);
}

/** One sandbag: a stuffed pillow with tied, pinched ends. */
function sandbag(g: G, x: number, y: number, w: number, h: number, base: number, alpha: number): void {
  const r = Math.min(h * 0.5, w * 0.5) - 0.05;
  g.fillStyle(dark(base, 0.55), alpha);
  g.fillRoundedRect(x - w / 2 - 0.9, y - h / 2 - 0.9, w + 1.8, h + 1.8, r + 0.9);
  g.fillStyle(base, alpha);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
  g.fillStyle(light(base, 0.24), alpha);
  g.fillRoundedRect(x - w / 2 + 1.2, y - h / 2 + 0.6, w - 2.4, Math.max(1, h * 0.34), Math.max(0.5, r * 0.4));
  g.lineStyle(0.8, dark(base, 0.4), alpha * 0.8);
  g.lineBetween(x - w / 2 + 2.2, y - h / 2 + 1, x - w / 2 + 2.2, y + h / 2 - 1);
  g.lineBetween(x + w / 2 - 2.2, y - h / 2 + 1, x + w / 2 - 2.2, y + h / 2 - 1);
}

/** A course of sandbags, each a slightly different burlap so a wall never reads as a texture. */
function bagRow(g: G, cx: number, y: number, totalW: number, n: number, h: number, alpha: number, seed = 0): void {
  const bw = totalW / n;
  for (let i = 0; i < n; i++) {
    const tone = mix(WW.khaki, WW.khakiShade, jitter(seed + i * 3.1, 7) * 0.45);
    sandbag(g, cx - totalW / 2 + bw * (i + 0.5), y, bw - 0.6, h, tone, alpha);
  }
}

/** A five-point star — the stencil on every vehicle and hut. */
function star(g: G, x: number, y: number, r: number, color: number, alpha: number): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * TAU;
    const rr = i % 2 ? r * 0.42 : r;
    pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
  }
  g.fillStyle(color, alpha);
  g.fillPoints(pts, true);
}

/** A lit slit — firing port or window — breathing on `t`. */
function slit(g: G, x: number, y: number, w: number, h: number, t: number, seed: number, alpha: number): void {
  const flick = 0.75 + 0.25 * Math.sin(t * 5.3 + seed * 2.1) * Math.sin(t * 3.1 + seed);
  g.fillStyle(WW.black, alpha);
  g.fillRect(x - w / 2 - 0.8, y - h / 2 - 0.8, w + 1.6, h + 1.6);
  g.fillStyle(0xffb547, alpha * flick * 0.85);
  g.fillRect(x - w / 2, y - h / 2, w, h);
  g.fillStyle(WW.flash, alpha * flick * 0.6);
  g.fillRect(x - w * 0.2, y - h / 2, w * 0.4, h * 0.7);
}

// ── The rifle ──────────────────────────────────────────────────────────────

/**
 * A bolt-action service rifle with a fixed bayonet, butt at `(x, y)` pointing along `ang`.
 * `len` is butt to muzzle, `bay` the blade beyond it, `k` the thickness scale. Built in a local
 * frame from tapered polygons — wood stock and handguard, blued barrel, a steel blade with a lit
 * edge, and a webbing sling sagging under it.
 */
export function rifle(g: G, x: number, y: number, ang: number, len: number, bay: number, alpha: number, k = 1): void {
  const P = frame(x, y, ang);
  // Sling first, under everything.
  g.lineStyle(Math.max(0.6, 0.9 * k), WW.khakiShade, alpha * 0.9);
  g.beginPath();
  const s0 = P(len * 0.1, 2.6 * k), s1 = P(len * 0.36, 4.6 * k), s2 = P(len * 0.62, 1.8 * k);
  g.moveTo(s0.x, s0.y);
  g.lineTo(s1.x, s1.y);
  g.lineTo(s2.x, s2.y);
  g.strokePath();
  // Barrel, running the whole way out.
  const b0 = P(len * 0.28, -0.2 * k), b1 = P(len, -0.2 * k);
  g.lineStyle(2.2 * k, WW.gunDark, alpha);
  g.lineBetween(b0.x, b0.y, b1.x, b1.y);
  g.lineStyle(0.8 * k, WW.gunLit, alpha * 0.8);
  const bl0 = P(len * 0.3, -0.8 * k), bl1 = P(len * 0.98, -0.8 * k);
  g.lineBetween(bl0.x, bl0.y, bl1.x, bl1.y);
  // Stock: a wedge from the butt plate to the wrist.
  rimmed(g, [P(0, -2.2 * k), P(len * 0.3, -1.2 * k), P(len * 0.3, 1.5 * k), P(len * 0.08, 1.9 * k), P(0, 3 * k)], WW.wood, alpha);
  g.fillStyle(WW.woodLit, alpha * 0.8);
  g.fillPoints([P(0.6 * k, -1.6 * k), P(len * 0.28, -0.9 * k), P(len * 0.28, -0.2 * k), P(0.6 * k, -0.2 * k)], true);
  g.fillStyle(WW.gunDark, alpha);
  g.fillPoints([P(0, -2.2 * k), P(1 * k, -2.2 * k), P(1 * k, 3 * k), P(0, 3 * k)], true);
  // Receiver and bolt handle.
  rimmed(g, [P(len * 0.3, -1.6 * k), P(len * 0.42, -1.6 * k), P(len * 0.42, 1 * k), P(len * 0.3, 1 * k)], WW.gun, alpha, 0.6);
  const bh = P(len * 0.36, 1.2 * k), bk = P(len * 0.33, 3 * k);
  g.lineStyle(0.9 * k, WW.gunLit, alpha);
  g.lineBetween(bh.x, bh.y, bk.x, bk.y);
  g.fillStyle(WW.gunLit, alpha);
  g.fillCircle(bk.x, bk.y, 0.8 * k);
  // Handguard.
  rimmed(g, [P(len * 0.42, -1.3 * k), P(len * 0.8, -1.05 * k), P(len * 0.8, 1.05 * k), P(len * 0.42, 1.3 * k)], WW.wood, alpha);
  const h0 = P(len * 0.44, -0.8 * k), h1 = P(len * 0.78, -0.6 * k);
  g.lineStyle(0.7 * k, WW.woodLit, alpha * 0.9);
  g.lineBetween(h0.x, h0.y, h1.x, h1.y);
  // Barrel band and front sight.
  const band = P(len * 0.8, 0);
  g.fillStyle(WW.gunLit, alpha);
  g.fillCircle(band.x, band.y, 1.3 * k);
  const fs = P(len * 0.96, -1.5 * k);
  g.fillCircle(fs.x, fs.y, 0.6 * k);
  // Bayonet: lug, crossguard, blade with a lit edge.
  if (bay > 0) {
    const cg0 = P(len - 0.6 * k, -2 * k), cg1 = P(len - 0.6 * k, 1.6 * k);
    g.lineStyle(1.1 * k, WW.gunDark, alpha);
    g.lineBetween(cg0.x, cg0.y, cg1.x, cg1.y);
    rimmed(g, [P(len, -1 * k), P(len + bay * 0.82, -0.7 * k), P(len + bay, 0.2 * k), P(len + bay * 0.8, 0.9 * k), P(len, 0.9 * k)], WW.steel, alpha, 0.5);
    const e0 = P(len + 0.5 * k, -0.6 * k), e1 = P(len + bay * 0.9, -0.3 * k);
    g.lineStyle(0.6 * k, 0xffffff, alpha * 0.85);
    g.lineBetween(e0.x, e0.y, e1.x, e1.y);
  }
  const mz = P(len, -0.2 * k);
  g.fillStyle(WW.gunDark, alpha);
  g.fillCircle(mz.x, mz.y, 1.2 * k);
}

// ── Buildings ──────────────────────────────────────────────────────────────

/**
 * Town center → a command bunker. A chamfered concrete blockhouse with a glowing firing slit,
 * sandbags along the roof and a sandbagged front with the doorway left open, a radio mast with a
 * blinking beacon on one side and the town's flag on the other. Still the tallest, widest thing
 * on the board.
 */
export function ww2Headquarters(
  g: G, tint: ConquestColorFn, x: number, y: number, s: number, color: number, t: number, alpha: number,
): void {
  const col = tint(color);
  shadow(g, x, y + s * 0.34, s * 0.92, s * 0.2, alpha);

  // Radio mast behind the bunker's right shoulder: a lattice tower with guy wires.
  const mx = x + s * 0.26, mBase = y - s * 0.1, mTop = y - s * 0.54;
  g.lineStyle(0.6, WW.gunLit, alpha * 0.55);
  g.lineBetween(mx, mTop + 3, mx - s * 0.17, y - s * 0.06);
  g.lineBetween(mx, mTop + 3, mx + s * 0.18, y - s * 0.04);
  g.lineStyle(1.4, WW.gun, alpha);
  g.lineBetween(mx - 3, mBase, mx, mTop);
  g.lineBetween(mx + 3, mBase, mx, mTop);
  g.lineStyle(0.8, WW.gunLit, alpha * 0.9);
  for (let i = 0; i < 5; i++) {
    const k0 = i / 5, k1 = (i + 1) / 5;
    const y0 = mBase + (mTop - mBase) * k0, y1 = mBase + (mTop - mBase) * k1;
    const w0 = 3 * (1 - k0), w1 = 3 * (1 - k1);
    g.lineBetween(mx - w0, y0, mx + w1, y1);
    g.lineBetween(mx - w1, y1, mx + w1, y1);
  }
  // Crossbar dipole and the beacon.
  g.lineStyle(1, WW.gun, alpha);
  g.lineBetween(mx - 5, mTop + 5, mx + 5, mTop + 5);
  const blink = Math.sin(t * 3.4) > 0.2 ? 1 : 0.25;
  g.fillStyle(WW.red, alpha * 0.3 * blink);
  g.fillCircle(mx, mTop - 1, 4.4);
  g.fillStyle(WW.red, alpha * (0.4 + 0.6 * blink));
  g.fillCircle(mx, mTop - 1, 1.8);

  // Flag on the roof's left, waving in two segments — the side read from across the board.
  const fx = x - s * 0.2, fTop = y - s * 0.5, fBase = y - s * 0.17;
  g.lineStyle(2, WW.gunDark, alpha);
  g.lineBetween(fx, fBase, fx, fTop);
  const w1 = Math.sin(t * 3.2) * s * 0.03;
  const w2 = Math.sin(t * 3.2 - 1.1) * s * 0.05;
  const fl = s * 0.24;
  const flag: Pt[] = [
    { x: fx, y: fTop }, { x: fx + fl * 0.5, y: fTop + w1 }, { x: fx + fl, y: fTop + w2 },
    { x: fx + fl, y: fTop + s * 0.12 + w2 }, { x: fx + fl * 0.5, y: fTop + s * 0.12 + w1 }, { x: fx, y: fTop + s * 0.12 },
  ];
  rimmed(g, flag, col, alpha, 0.45);
  g.fillStyle(light(col, 0.3), alpha);
  g.fillTriangle(fx, fTop, fx + fl * 0.5, fTop + w1, fx, fTop + s * 0.05);
  star(g, fx + fl * 0.45, fTop + s * 0.06 + w1, s * 0.035, WW.white, alpha * 0.95);
  g.fillStyle(WW.brass, alpha);
  g.fillCircle(fx, fTop - 1.2, 1.8);

  // The blockhouse.
  const bw = s * 0.68, top = y - s * 0.16, bot = y + s * 0.2, ch = s * 0.07;
  const house: Pt[] = [
    { x: x - bw / 2, y: bot }, { x: x - bw / 2, y: top + ch }, { x: x - bw / 2 + ch, y: top },
    { x: x + bw / 2 - ch, y: top }, { x: x + bw / 2, y: top + ch }, { x: x + bw / 2, y: bot },
  ];
  rimmed(g, house, WW.conc, alpha);
  g.fillStyle(WW.concLit, alpha);
  g.fillRect(x - bw / 2 + ch, top + 0.6, bw - ch * 2, s * 0.03);
  g.fillStyle(light(WW.conc, 0.08), alpha);
  g.fillRect(x - bw / 2 + 1, top + ch, s * 0.06, bot - top - ch - 1);
  g.fillStyle(dark(WW.conc, 0.12), alpha);
  g.fillRect(x + bw / 2 - s * 0.07, top + ch, s * 0.065, bot - top - ch - 1);
  // Formwork seams in the pour.
  g.lineStyle(0.8, WW.concDark, alpha * 0.45);
  g.lineBetween(x - bw / 2 + 2, top + s * 0.2, x + bw / 2 - 2, top + s * 0.2);
  g.lineBetween(x - bw * 0.18, top + s * 0.2, x - bw * 0.18, bot - 1);
  g.lineBetween(x + bw * 0.22, top + ch, x + bw * 0.22, top + s * 0.2);
  // Painted band in the town colour.
  g.fillStyle(dark(col, 0.4), alpha);
  g.fillRect(x - bw / 2 + 1, top + s * 0.075, bw - 2, s * 0.045);
  g.fillStyle(col, alpha);
  g.fillRect(x - bw / 2 + 1, top + s * 0.08, bw - 2, s * 0.03);
  // Firing slit, lit from inside.
  slit(g, x + s * 0.04, top + s * 0.155, s * 0.3, s * 0.04, t, 1, alpha);
  g.lineStyle(0.8, WW.concDark, alpha * 0.4);
  for (let i = 0; i < 3; i++) {
    const sx = x - s * 0.06 + i * s * 0.09;
    g.lineBetween(sx, top + s * 0.18, sx + 0.6, top + s * 0.25);
  }
  // A star roundel stencilled on the wall.
  g.fillStyle(WW.white, alpha * 0.9);
  g.fillCircle(x - s * 0.21, top + s * 0.25, s * 0.055);
  star(g, x - s * 0.21, top + s * 0.25, s * 0.045, dark(col, 0.2), alpha);

  // Sandbags on the roof line.
  bagRow(g, x, top - s * 0.02, bw - ch * 2 - 2, 4, s * 0.055, alpha, 11);

  // The sandbagged front, with the doorway left open in the middle.
  const fy = y + s * 0.22, bh = s * 0.075, segW = s * 0.3;
  // Doorway: a dark recess and a steel door swung half open.
  g.fillStyle(WW.black, alpha);
  g.fillRect(x - s * 0.06, fy - s * 0.12, s * 0.12, s * 0.16);
  g.fillStyle(WW.gun, alpha);
  g.fillPoints([
    { x: x - s * 0.06, y: fy - s * 0.12 }, { x: x - s * 0.01, y: fy - s * 0.1 },
    { x: x - s * 0.01, y: fy + s * 0.04 }, { x: x - s * 0.06, y: fy + s * 0.04 },
  ], true);
  g.fillStyle(0xffb547, alpha * (0.35 + 0.15 * Math.sin(t * 4.1)));
  g.fillRect(x - s * 0.005, fy - s * 0.1, s * 0.05, s * 0.13);
  for (const side of [-1, 1]) {
    const cx = x + side * (s * 0.09 + segW / 2);
    bagRow(g, cx, fy + bh * 0.85, segW, 3, bh, alpha, 20 + side);
    bagRow(g, cx + side * s * 0.02, fy, segW - s * 0.04, 3, bh, alpha, 30 + side);
  }
}

/**
 * Barracks → a Quonset hut. The barrel roof is built back-to-front out of corrugated slices, so
 * the rib of each one shows over the crown; the plywood end wall carries the door, two lit
 * windows and a sign board in the town colour, with a stovepipe on top. The broad arch is its
 * silhouette — nothing else on the board has a round top this wide.
 */
export function ww2Barracks(
  g: G, tint: ConquestColorFn, x: number, y: number, s: number, color: number, alpha: number,
): void {
  const col = tint(color);
  const base = y + s * 0.25;
  const R = s * 0.3;
  const fx = x - s * 0.07, fy = base;
  const dx = s * 0.18, dy = -s * 0.1;
  shadow(g, x + s * 0.04, base + 1, s * 0.9, s * 0.18, alpha);

  const arch = (cx: number, cy: number, r: number): void => {
    g.beginPath();
    g.arc(cx, cy, r, Math.PI, TAU, false);
    g.closePath();
    g.fillPath();
  };

  // The stovepipe sits behind the front slices, poking up off the barrel.
  const px = x + s * 0.12, py = base - s * 0.42;
  g.fillStyle(WW.gunDark, alpha);
  g.fillRect(px - 2.2, py - s * 0.12, 4.4, s * 0.14);
  g.fillStyle(WW.gun, alpha);
  g.fillRect(px - 1.4, py - s * 0.12, 1.6, s * 0.14);
  g.fillStyle(WW.gunDark, alpha);
  g.fillRect(px - 3.4, py - s * 0.14, 6.8, 2.4);

  // The corrugated barrel: six slices from the back to the front.
  const N = 6;
  for (let i = N; i >= 1; i--) {
    const k = i / N;
    const cx = fx + dx * k, cy = fy + dy * k;
    g.fillStyle(WW.odDeep, alpha);
    arch(cx, cy, R + 1.2);
    g.fillStyle(mix(WW.od, WW.odShade, k * 0.6), alpha);
    arch(cx, cy, R);
    g.lineStyle(1, light(WW.od, 0.18), alpha * 0.6);
    g.beginPath();
    g.arc(cx, cy, R - 1.2, Math.PI * 1.25, Math.PI * 1.75, false);
    g.strokePath();
  }

  // The plywood end wall.
  g.fillStyle(WW.odDeep, alpha);
  arch(fx, fy, R + 1.2);
  g.fillStyle(WW.khakiShade, alpha);
  arch(fx, fy, R);
  g.fillStyle(light(WW.khakiShade, 0.12), alpha);
  g.beginPath();
  g.arc(fx, fy, R, Math.PI, Math.PI * 1.5, false);
  g.lineTo(fx, fy);
  g.closePath();
  g.fillPath();
  g.lineStyle(0.8, dark(WW.khakiShade, 0.35), alpha * 0.55);
  for (const ox of [-R * 0.5, R * 0.5]) {
    const hh = Math.sqrt(R * R - ox * ox);
    g.lineBetween(fx + ox, fy - hh + 1, fx + ox, fy - 1);
  }
  // Rim of the arch: the first corrugation, lit.
  g.lineStyle(2, WW.odLit, alpha);
  g.beginPath();
  g.arc(fx, fy, R - 0.4, Math.PI, TAU, false);
  g.strokePath();

  // Door with a sandbag either side of the step, and a lit window each side.
  const dw = s * 0.13, dh = s * 0.19;
  g.fillStyle(WW.woodDark, alpha);
  g.fillRect(fx - dw / 2 - 1.2, fy - dh - 1.2, dw + 2.4, dh + 1.2);
  g.fillStyle(WW.od, alpha);
  g.fillRect(fx - dw / 2, fy - dh, dw, dh);
  g.fillStyle(WW.odLit, alpha);
  g.fillRect(fx - dw / 2, fy - dh, dw * 0.3, dh);
  g.fillStyle(WW.brass, alpha);
  g.fillCircle(fx + dw * 0.28, fy - dh * 0.45, 0.9);
  slit(g, fx - R * 0.62, fy - R * 0.42, s * 0.07, s * 0.06, 0, 2, alpha);
  slit(g, fx + R * 0.62, fy - R * 0.42, s * 0.07, s * 0.06, 0, 4, alpha);
  // Sign board over the door in the town colour, with the star stencilled on it.
  const sy = fy - dh - s * 0.075;
  g.fillStyle(dark(col, 0.5), alpha);
  g.fillRoundedRect(fx - s * 0.13 - 1, sy - s * 0.045 - 1, s * 0.26 + 2, s * 0.09 + 2, 1.6);
  g.fillStyle(col, alpha);
  g.fillRoundedRect(fx - s * 0.13, sy - s * 0.045, s * 0.26, s * 0.09, 1.4);
  g.fillStyle(light(col, 0.3), alpha);
  g.fillRect(fx - s * 0.12, sy - s * 0.04, s * 0.24, 1.2);
  star(g, fx, sy + 0.3, s * 0.035, WW.white, alpha);
  // Footing sandbags.
  sandbag(g, fx - dw / 2 - s * 0.07, fy - s * 0.02, s * 0.11, s * 0.06, WW.khaki, alpha);
  sandbag(g, fx + dw / 2 + s * 0.07, fy - s * 0.02, s * 0.11, s * 0.06, mix(WW.khaki, WW.khakiShade, 0.3), alpha);
  // A rifle rack: two rifles leaning on the wall, bayonets up.
  for (let i = 0; i < 2; i++) {
    rifle(g, fx + R + s * 0.02 + i * 3.4, fy - 1, -Math.PI / 2 + 0.16, s * 0.22, s * 0.07, alpha, 0.55);
  }
}

/**
 * Turret → a hexagonal concrete pillbox with a sandbagged gun pit on its roof and a shielded
 * anti-tank gun in it. `ang` still aims the barrel live and `recoil` still kicks it back.
 */
export function ww2Pillbox(
  g: G, tint: ConquestColorFn, x: number, y: number, s: number, color: number, ang: number, recoil: number, alpha: number,
): void {
  const col = tint(color);
  const r = s * 0.33;
  const topY = y - s * 0.02;
  const H = s * 0.2;
  shadow(g, x, topY + H + s * 0.04, r * 2.4, s * 0.16, alpha);

  const v = (deg: number, dyy = 0): Pt => {
    const a = (deg * Math.PI) / 180;
    return { x: x + Math.cos(a) * r, y: topY + Math.sin(a) * r * 0.45 + dyy };
  };
  // Two visible wall faces, the left lit, the right in shade.
  rimmed(g, [v(90), v(150), v(150, H), v(90, H)], light(WW.conc, 0.05), alpha);
  rimmed(g, [v(30), v(90), v(90, H), v(30, H)], dark(WW.conc, 0.14), alpha);
  // Painted band and firing slits on each face.
  for (const [a0, a1] of [[90, 150], [30, 90]] as const) {
    const p0 = v(a0, H * 0.2), p1 = v(a1, H * 0.2);
    g.lineStyle(2.2, col, alpha);
    g.lineBetween(p0.x, p0.y, p1.x, p1.y);
    const m0 = v(a0, H * 0.58), m1 = v(a1, H * 0.58);
    const mxx = (m0.x + m1.x) / 2, myy = (m0.y + m1.y) / 2;
    slit(g, mxx, myy, s * 0.14, s * 0.03, recoil * 6, a0, alpha);
  }
  // Roof slab.
  const roof = [v(330), v(30), v(90), v(150), v(210), v(270)];
  rimmed(g, roof, WW.concLit, alpha);
  g.fillStyle(dark(WW.concLit, 0.18), alpha);
  g.fillEllipse(x, topY + 0.6, r * 1.3, r * 0.5);

  // The sandbag ring: the back half, then the gun, then the front half.
  const bags = 9;
  const ring = (front: boolean): void => {
    for (let i = 0; i < bags; i++) {
      const a = (i / bags) * TAU + 0.15;
      if ((Math.sin(a) >= 0) !== front) continue;
      const bx = x + Math.cos(a) * r * 0.74, by = topY - 3 + Math.sin(a) * r * 0.34;
      sandbag(g, bx, by, s * 0.13, s * 0.065, mix(WW.khaki, WW.khakiShade, jitter(i, 5) * 0.4), alpha);
    }
  };
  ring(false);

  const hy = topY - s * 0.09;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const back = -recoil * 4;
  const gx = x + ca * back, gy = hy + sa * back;
  const P = frame(gx, gy, ang);
  const bl = s * 0.42;
  const gun = (): void => {
    // Barrel with a perforated recoil jacket and a muzzle brake.
    const b0 = P(0, 0), b1 = P(bl, 0);
    g.lineStyle(4.4, WW.gunDark, alpha);
    g.lineBetween(b0.x, b0.y, b1.x, b1.y);
    g.lineStyle(2.6, WW.od, alpha);
    g.lineBetween(b0.x, b0.y, b1.x, b1.y);
    g.lineStyle(0.9, WW.odPale, alpha * 0.7);
    const l0 = P(2, -0.9), l1 = P(bl - 2, -0.9);
    g.lineBetween(l0.x, l0.y, l1.x, l1.y);
    const j1 = P(bl * 0.4, 0);
    g.lineStyle(5.4, WW.gunDark, alpha);
    g.lineBetween(b0.x, b0.y, j1.x, j1.y);
    g.lineStyle(3.6, WW.gun, alpha);
    g.lineBetween(b0.x, b0.y, j1.x, j1.y);
    g.fillStyle(WW.gunDark, alpha);
    for (let i = 1; i <= 3; i++) {
      const h = P(bl * 0.1 * i, 0);
      g.fillCircle(h.x, h.y, 0.7);
    }
    rimmed(g, [P(bl - 3, -2.6), P(bl + 1, -2.6), P(bl + 1, 2.6), P(bl - 3, 2.6)], WW.gun, alpha, 0.6);
    // Gun shield: a bent steel plate across the barrel in olive with the town stripe.
    rimmed(g, [P(4, -7.5), P(7, -6.5), P(7, 6.5), P(4, 7.5)], WW.od, alpha);
    const st0 = P(5.5, -5.5), st1 = P(5.5, 5.5);
    g.lineStyle(1.4, col, alpha);
    g.lineBetween(st0.x, st0.y, st1.x, st1.y);
  };
  if (sa < 0) gun();
  // The breech and its gunner's sight, glowing at the target — "it has seen you".
  orb(g, x, hy, s * 0.1, WW.od, alpha);
  const lx = x + ca * s * 0.05, ly = hy + sa * s * 0.04 - 1;
  g.fillStyle(WW.fire, alpha * 0.4);
  g.fillCircle(lx, ly, 2.6);
  g.fillStyle(WW.fireCore, alpha);
  g.fillCircle(lx, ly, 1.2);
  if (sa >= 0) gun();
  ring(true);
}

/**
 * Barricade → a low sandbag wall with a picket flying a rag in the town colour. Spiked Walls is
 * the one upgrade that changes the outline: Czech hedgehogs rise behind the bags and a coil of
 * concertina wire runs along the front.
 */
export function ww2Sandbags(
  g: G, tint: ConquestColorFn, x: number, y: number, s: number, color: number, spiked: boolean, alpha: number,
): void {
  const col = tint(color);
  const w = s * 0.84;
  const bh = s * 0.12;
  const top = y - s * 0.02;
  shadow(g, x, top + bh * 2.2, w * 1.05, s * 0.16, alpha);

  if (spiked) {
    // Hedgehogs: three welded girders each, standing proud of the wall.
    for (let i = 0; i < 3; i++) {
      const hx = x - w * 0.32 + i * w * 0.32;
      const hy = top - s * 0.04;
      const beams: [number, number, number, number][] = [
        [-6, 5, 6, -10], [6, 5, -6, -10], [-1.5, 7, 1.5, -12],
      ];
      for (const [x0, y0, x1, y1] of beams) {
        g.lineStyle(3.2, WW.gunDark, alpha);
        g.lineBetween(hx + x0, hy + y0, hx + x1, hy + y1);
        g.lineStyle(1.6, WW.gunLit, alpha);
        g.lineBetween(hx + x0, hy + y0, hx + x1, hy + y1);
      }
      g.fillStyle(0x8e2a1e, alpha * 0.6);
      g.fillCircle(hx + 1.5, hy - 12, 1.1);
    }
  }

  // The picket at the right end with its rag — behind the bags so it reads as driven in.
  const px = x + w * 0.44;
  g.lineStyle(2, WW.woodDark, alpha);
  g.lineBetween(px, top + bh * 1.6, px + 0.6, top - s * 0.24);
  g.lineStyle(0.9, WW.woodLit, alpha);
  g.lineBetween(px - 0.4, top + bh * 1.6, px + 0.2, top - s * 0.24);
  const rag: Pt[] = [
    { x: px + 0.6, y: top - s * 0.24 }, { x: px - s * 0.15, y: top - s * 0.2 },
    { x: px - s * 0.11, y: top - s * 0.165 }, { x: px - s * 0.17, y: top - s * 0.13 }, { x: px + 0.6, y: top - s * 0.15 },
  ];
  rimmed(g, rag, col, alpha, 0.45);

  // Two staggered courses, the top one shorter — a parapet, not a block.
  bagRow(g, x, top + bh * 1.05, w, 4, bh, alpha, 3);
  bagRow(g, x - w * 0.04, top, w * 0.78, 3, bh, alpha, 9);
  // A strip of town-coloured tape tied round the middle bag of the top course.
  g.lineStyle(1.6, col, alpha);
  g.lineBetween(x - w * 0.04, top - bh * 0.5, x - w * 0.04, top + bh * 0.5);

  if (spiked) {
    // Concertina wire: overlapping loops along the front, barbs ticked on.
    const wy = top + bh * 2;
    g.lineStyle(0.9, WW.gunLit, alpha * 0.95);
    const loops = 7;
    for (let i = 0; i < loops; i++) {
      const lx = x - w * 0.45 + (i + 0.5) * (w * 0.9 / loops);
      g.strokeEllipse(lx, wy, w * 0.9 / loops * 1.5, bh * 1.1);
      g.lineBetween(lx - 1.4, wy - bh * 0.55 - 1.2, lx + 1.4, wy - bh * 0.55 + 1.2);
      g.lineBetween(lx + 1.4, wy + bh * 0.55 - 1.2, lx - 1.4, wy + bh * 0.55 + 1.2);
    }
  }
}

/**
 * Market → a supply depot: oil drums and stencilled crates under a camo net strung between two
 * poles, a swinging sign board, and a hurricane lamp. The net's sagging, tufted lower edge keeps
 * the "scalloped top" silhouette the market has always had. A vault with money in it puts an ammo
 * can on the crates with brass shells standing out of it; Propaganda mounts a PA horn.
 */
export function ww2Depot(
  g: G, tint: ConquestColorFn, x: number, y: number, s: number, color: number,
  o: { vault: number; propaganda: boolean; t: number }, alpha: number,
): void {
  const col = tint(color);
  const w = s * 0.8;
  const groundY = y + s * 0.27;
  const netTop = y - s * 0.26;
  const netBot = y - s * 0.12;
  shadow(g, x, groundY, w * 1.05, s * 0.16, alpha);

  // Poles.
  for (const side of [-1, 1]) {
    const px = x + side * w * 0.46;
    g.lineStyle(3.4, WW.woodDark, alpha);
    g.lineBetween(px, netTop - 2, px, groundY);
    g.lineStyle(1.4, WW.wood, alpha);
    g.lineBetween(px - 0.5, netTop - 2, px - 0.5, groundY);
  }

  // Oil drums on the left, banded in the town colour.
  for (let i = 0; i < 2; i++) {
    const dx = x - w * 0.3 + i * s * 0.14;
    const dw = s * 0.12, dTop = groundY - s * 0.22 + i * 1.5;
    g.fillStyle(WW.odDeep, alpha);
    g.fillRect(dx - dw / 2 - 0.8, dTop, dw + 1.6, groundY - dTop);
    g.fillStyle(i === 0 ? WW.od : WW.odShade, alpha);
    g.fillRect(dx - dw / 2, dTop, dw, groundY - dTop - 0.5);
    g.fillStyle(WW.odLit, alpha * 0.8);
    g.fillRect(dx - dw / 2 + 0.8, dTop, dw * 0.28, groundY - dTop - 1);
    g.fillStyle(col, alpha);
    g.fillRect(dx - dw / 2, dTop + (groundY - dTop) * 0.3, dw, 2);
    g.fillRect(dx - dw / 2, dTop + (groundY - dTop) * 0.7, dw, 2);
    g.fillStyle(WW.odDeep, alpha);
    g.fillEllipse(dx, dTop, dw + 1.6, s * 0.05);
    g.fillStyle(WW.odLit, alpha);
    g.fillEllipse(dx, dTop, dw, s * 0.035);
    g.fillStyle(WW.gunDark, alpha);
    g.fillCircle(dx + dw * 0.22, dTop, 0.9);
  }

  // Crates on the right: two on the ground, one on top.
  const crate = (cx: number, cy: number, cw: number, ch: number, tone: number): void => {
    rimmed(g, [{ x: cx - cw / 2, y: cy - ch }, { x: cx + cw / 2, y: cy - ch }, { x: cx + cw / 2, y: cy }, { x: cx - cw / 2, y: cy }], tone, alpha);
    g.fillStyle(light(tone, 0.22), alpha);
    g.fillRect(cx - cw / 2 + 0.6, cy - ch + 0.6, cw - 1.2, 1.4);
    g.lineStyle(0.9, dark(tone, 0.4), alpha * 0.8);
    g.lineBetween(cx - cw / 2 + 1, cy - ch + 1, cx + cw / 2 - 1, cy - 1);
    g.lineBetween(cx - cw / 2 + 1, cy - ch * 0.5, cx + cw / 2 - 1, cy - ch * 0.5);
    // Stencil: a pale block of "lettering".
    g.fillStyle(WW.khakiLit, alpha * 0.6);
    g.fillRect(cx - cw * 0.28, cy - ch * 0.36, cw * 0.56, 1.2);
  };
  const cw = s * 0.17;
  crate(x + s * 0.06, groundY, cw, s * 0.13, WW.wood);
  crate(x + s * 0.06 + cw + 0.6, groundY, cw, s * 0.13, mix(WW.wood, WW.woodDark, 0.25));
  crate(x + s * 0.06 + cw * 0.55, groundY - s * 0.13 - 0.8, cw, s * 0.12, mix(WW.wood, WW.woodLit, 0.2));
  const crateTop = groundY - s * 0.25 - 0.8;

  // Securities: an ammo can on the stack, brass shells standing as high as the vault is full.
  if (o.vault > 0) {
    const fill = Phaser.Math.Clamp(o.vault / 200, 0, 1);
    const bx = x + s * 0.06 + cw * 0.55;
    const boxW = s * 0.15, boxH = s * 0.08;
    const n = Math.max(1, Math.round(fill * 4));
    for (let i = 0; i < n; i++) {
      const sx = bx - boxW * 0.32 + i * (boxW * 0.64 / 3);
      const sh = s * 0.07 + fill * s * 0.05;
      g.fillStyle(WW.brassDeep, alpha);
      g.fillRoundedRect(sx - 1.7, crateTop - boxH - sh, 3.4, sh + 2, { tl: 1.7, tr: 1.7, bl: 0, br: 0 });
      g.fillStyle(WW.brass, alpha);
      g.fillRoundedRect(sx - 1.1, crateTop - boxH - sh + 0.6, 2.2, sh + 1, { tl: 1.1, tr: 1.1, bl: 0, br: 0 });
      g.fillStyle(WW.brassLit, alpha * 0.8);
      g.fillRect(sx - 0.8, crateTop - boxH - sh + 2, 0.7, sh * 0.6);
    }
    rimmed(g, [
      { x: bx - boxW / 2, y: crateTop - boxH }, { x: bx + boxW / 2, y: crateTop - boxH },
      { x: bx + boxW / 2, y: crateTop }, { x: bx - boxW / 2, y: crateTop },
    ], WW.gun, alpha, 0.6);
    g.fillStyle(WW.gunLit, alpha);
    g.fillRect(bx - boxW * 0.3, crateTop - boxH - 1.2, boxW * 0.6, 1.4);
    g.fillStyle(WW.brass, alpha);
    g.fillRect(bx - 1, crateTop - boxH * 0.6, 2, 2);
  }

  // The camo net: a sagging band between the poles, mottled, meshed and tufted.
  const L = x - w * 0.5, Rr = x + w * 0.5;
  const ties = 4;
  const lower: Pt[] = [];
  for (let i = 0; i <= ties * 4; i++) {
    const u = i / (ties * 4);
    const local = (u * ties) % 1;
    const sag = Math.sin(local * Math.PI) * s * 0.06;
    lower.push({ x: L + (Rr - L) * u, y: netBot + sag });
  }
  const net: Pt[] = [{ x: L - 2, y: netTop + 2 }, { x: x, y: netTop }, { x: Rr + 2, y: netTop + 2 }, ...lower.reverse()];
  rimmed(g, net, WW.od, alpha);
  for (let i = 0; i < 9; i++) {
    const bx = L + 4 + jitter(3, i) * (w - 8);
    const by = netTop + 2 + jitter(5, i) * (netBot - netTop);
    g.fillStyle(i % 3 === 0 ? WW.khakiShade : i % 3 === 1 ? WW.odDeep : WW.odLit, alpha * 0.85);
    g.fillEllipse(bx, by, 6 + jitter(7, i) * 5, 3 + jitter(9, i) * 2);
  }
  g.lineStyle(0.6, WW.odDeep, alpha * 0.5);
  for (let i = 1; i < 8; i++) {
    const nx = L + (w * i) / 8;
    g.lineBetween(nx - 3, netTop + 2, nx + 3, netBot + 2);
    g.lineBetween(nx + 3, netTop + 2, nx - 3, netBot + 2);
  }
  // Tufts of scrim hanging off the lower edge.
  for (let i = 0; i < lower.length; i += 2) {
    const p = lower[i];
    g.fillStyle(i % 4 === 0 ? WW.odLit : WW.khakiShade, alpha);
    g.fillTriangle(p.x - 2, p.y - 1, p.x + 2, p.y - 1, p.x + Math.sin(o.t * 2 + i) * 0.8, p.y + 4);
  }

  // A hurricane lamp hung under the net.
  const lx = x - w * 0.12, ly = netBot + s * 0.13;
  const flick = 0.8 + 0.2 * Math.sin(o.t * 6.1) * Math.sin(o.t * 2.3);
  g.lineStyle(0.9, WW.gunDark, alpha);
  g.lineBetween(lx, netBot + 3, lx, ly - 3.5);
  g.fillStyle(0xffb547, alpha * 0.22 * flick);
  g.fillCircle(lx, ly, 7);
  g.fillStyle(WW.gunDark, alpha);
  g.fillRoundedRect(lx - 2.8, ly - 3.8, 5.6, 7.4, 1.8);
  g.fillStyle(WW.flash, alpha * flick);
  g.fillRoundedRect(lx - 1.8, ly - 2.6, 3.6, 4.8, 1.2);

  // The sign board, swinging off a bracket over the net — a plate in the town colour with the star.
  const sy = netTop - s * 0.03;
  const swing = Math.sin(o.t * 1.8) * 0.25;
  g.lineStyle(1.4, WW.woodDark, alpha);
  g.lineBetween(x, netTop + 1, x, sy);
  g.lineBetween(x - s * 0.08, sy, x + s * 0.08, sy);
  const cx = x + Math.sin(swing) * s * 0.1, cy = sy - s * 0.02 + Math.cos(swing) * s * 0.08;
  g.lineStyle(0.8, WW.gunDark, alpha);
  g.lineBetween(x - s * 0.05, sy, cx - s * 0.06, cy - s * 0.05);
  g.lineBetween(x + s * 0.05, sy, cx + s * 0.06, cy - s * 0.05);
  g.fillStyle(dark(col, 0.5), alpha);
  g.fillRoundedRect(cx - s * 0.09 - 1, cy - s * 0.05 - 1, s * 0.18 + 2, s * 0.1 + 2, 1.6);
  g.fillStyle(col, alpha);
  g.fillRoundedRect(cx - s * 0.09, cy - s * 0.05, s * 0.18, s * 0.1, 1.4);
  star(g, cx, cy, s * 0.035, WW.white, alpha);

  // Propaganda Central: a PA horn on the left pole, calling on its own beat.
  if (o.propaganda) {
    const pulse = 0.6 + 0.4 * Math.sin(o.t * 6);
    const hx = x - w * 0.46, hy = netTop - s * 0.04;
    g.fillStyle(WW.gunDark, alpha);
    g.fillTriangle(hx + 1, hy - 1.5, hx - s * 0.2, hy - s * 0.1, hx - s * 0.2, hy + s * 0.08);
    g.fillStyle(WW.gunLit, alpha);
    g.fillTriangle(hx, hy - 1, hx - s * 0.19, hy - s * 0.085, hx - s * 0.19, hy + s * 0.065);
    g.fillStyle(WW.steel, alpha * 0.8);
    g.fillTriangle(hx, hy - 1, hx - s * 0.19, hy - s * 0.085, hx - s * 0.19, hy - s * 0.04);
    g.fillStyle(WW.gunDark, alpha);
    g.fillEllipse(hx - s * 0.2, hy - s * 0.01, 3, s * 0.18);
    g.fillStyle(col, alpha);
    g.fillCircle(hx + 1, hy - 1, 2.2);
    for (let i = 1; i <= 2; i++) {
      g.lineStyle(1.6, col, alpha * pulse * (0.7 / i));
      g.beginPath();
      g.arc(hx - s * 0.2, hy - s * 0.01, s * (0.08 + i * 0.08), Math.PI * 0.7, Math.PI * 1.3);
      g.strokePath();
    }
  }
}

// ── Units ──────────────────────────────────────────────────────────────────

type Kit = 'rifle' | 'bazooka' | 'flame';

/**
 * One infantryman, on the same body plan as Conquest's troops so stacks still pack into a
 * square: a ball torso in the town colour knocked toward olive (the side read survives at 5px),
 * an M1 helmet, two eyes looking where he is about to strike, two ball hands. What he carries is
 * his rank: a bayoneted rifle, a bazooka with a radio pack and whip antenna (the wizard — the
 * antenna is the tall silhouette the pointed hat used to be), or a flamethrower with twin tanks.
 */
function infantry(
  g: G, x: number, y: number, color: number, ang: number, march: number, s: number, alpha: number,
  kit: Kit, glow: number,
): void {
  const r = 4.7 * s;
  const bob = Math.abs(Math.sin(march)) * -1.4 * s;
  const cy = y + bob - s;
  const tunic = mix(color, WW.od, 0.38);
  const ca = Math.cos(ang), sa = Math.sin(ang);
  shadow(g, x, y + 4.6 * s, 10 * s, 3.2 * s, alpha);

  // Back gear, opposite the facing.
  const bx = x - ca * r * 0.7, by = cy - r * 0.15;
  if (kit === 'bazooka') {
    const sway = Math.sin(march * 1.3) * 1.4 * s;
    g.lineStyle(0.8 * s, WW.gunDark, alpha);
    g.lineBetween(bx + r * 0.3, by - r * 0.5, bx + r * 0.5 + sway, by - r * 2.7);
    g.fillStyle(WW.gunDark, alpha);
    g.fillCircle(bx + r * 0.5 + sway, by - r * 2.7, 0.7 * s);
    g.fillStyle(WW.odDeep, alpha);
    g.fillRoundedRect(bx - r * 0.55, by - r * 0.6, r * 1.1, r * 1.2, 1.2 * s);
    g.fillStyle(WW.odShade, alpha);
    g.fillRoundedRect(bx - r * 0.45, by - r * 0.5, r * 0.9, r, 1 * s);
    g.fillStyle(glow, alpha * (0.6 + 0.4 * Math.sin(march * 4)));
    g.fillCircle(bx + r * 0.2, by - r * 0.25, 0.6 * s);
  } else if (kit === 'flame') {
    for (const o of [-1, 1]) {
      const tx = bx + o * r * 0.32;
      g.fillStyle(WW.gunDark, alpha);
      g.fillRoundedRect(tx - r * 0.3, by - r * 0.7, r * 0.6, r * 1.45, r * 0.3);
      g.fillStyle(WW.gun, alpha);
      g.fillRoundedRect(tx - r * 0.22, by - r * 0.62, r * 0.44, r * 1.3, r * 0.22);
      g.fillStyle(WW.gunLit, alpha * 0.8);
      g.fillRect(tx - r * 0.15, by - r * 0.5, r * 0.1, r * 0.9);
    }
  }

  const hx = x + ca * r * 1.05, hy = cy + sa * r * 0.6 + r * 0.3;
  const ox = x - ca * r * 0.95, oy = cy + r * 0.5 + Math.sin(march + Math.PI) * 0.7 * s;
  const behind = sa < -0.25;

  const weapon = (): void => {
    if (kit === 'rifle') {
      const tx = hx + ca * 8 * s, ty = hy + sa * 8 * s - 2.6 * s;
      const wa = Math.atan2(ty - hy, tx - hx);
      rifle(g, hx - Math.cos(wa) * 5 * s, hy - Math.sin(wa) * 5 * s, wa, 11 * s, 4 * s, alpha, 0.45 * s);
    } else if (kit === 'bazooka') {
      // Tube over the shoulder, along the aim, with the rocket's warhead glowing in the mouth.
      const sx = x - ca * r * 0.4, sy = cy - r * 0.35;
      const P = frame(sx - ca * 4 * s, sy - sa * 4 * s, ang);
      const L = 14 * s;
      const a0 = P(0, 0), a1 = P(L, 0);
      g.lineStyle(3.6 * s, WW.odDeep, alpha);
      g.lineBetween(a0.x, a0.y, a1.x, a1.y);
      g.lineStyle(2.2 * s, WW.od, alpha);
      g.lineBetween(a0.x, a0.y, a1.x, a1.y);
      g.lineStyle(0.7 * s, WW.odPale, alpha * 0.8);
      const l0 = P(1, -0.7 * s), l1 = P(L - 1, -0.7 * s);
      g.lineBetween(l0.x, l0.y, l1.x, l1.y);
      const ring0 = P(L * 0.35, 0), ring1 = P(L * 0.7, 0);
      g.fillStyle(WW.gunDark, alpha);
      g.fillCircle(ring0.x, ring0.y, 1.4 * s);
      g.fillCircle(ring1.x, ring1.y, 1.4 * s);
      const mouth = P(L, 0);
      const pulse = 0.7 + 0.3 * Math.sin(march * 2.2);
      g.fillStyle(glow, alpha * 0.25 * pulse);
      g.fillCircle(mouth.x, mouth.y, 4.6 * s);
      g.fillStyle(WW.gunDark, alpha);
      g.fillCircle(mouth.x, mouth.y, 1.8 * s);
      g.fillStyle(glow, alpha * pulse);
      g.fillCircle(mouth.x, mouth.y, 1.1 * s);
    } else {
      // Flame wand: a hose from the tanks to the hand, the nozzle along the aim, a pilot flame.
      g.lineStyle(1 * s, WW.gunDark, alpha);
      g.lineBetween(bx, by + r * 0.5, hx, hy);
      const P = frame(hx - ca * 2 * s, hy - sa * 2 * s, ang);
      const L = 9 * s;
      const a0 = P(0, 0), a1 = P(L, 0);
      g.lineStyle(2.4 * s, WW.gunDark, alpha);
      g.lineBetween(a0.x, a0.y, a1.x, a1.y);
      g.lineStyle(1.2 * s, WW.gunLit, alpha);
      g.lineBetween(a0.x, a0.y, a1.x, a1.y);
      const tip = P(L + 1.5 * s, 0);
      const flick = 0.75 + 0.25 * Math.sin(march * 9);
      g.fillStyle(glow, alpha * 0.35 * flick);
      g.fillCircle(tip.x, tip.y, 3.6 * s);
      const f0 = P(L, -1.4 * s), f1 = P(L, 1.4 * s), f2 = P(L + 4.5 * s * flick, 0);
      g.fillStyle(glow, alpha);
      g.fillTriangle(f0.x, f0.y, f1.x, f1.y, f2.x, f2.y);
      g.fillStyle(WW.fireCore, alpha);
      g.fillCircle(tip.x - ca * s, tip.y - sa * s, 0.9 * s);
    }
  };

  if (behind) weapon();
  orb(g, ox, oy, r * 0.36, WW.khaki, alpha);
  orb(g, x, cy, r, tunic, alpha);
  // A webbing strap across the chest.
  g.lineStyle(0.9 * s, WW.khaki, alpha * 0.9);
  g.lineBetween(x - r * 0.6, cy - r * 0.15, x + r * 0.5, cy + r * 0.75);

  // Eyes.
  const er = r * 0.24, sep = r * 0.36;
  const lx = ca * r * 0.2, ly = sa * r * 0.12;
  for (const side of [-1, 1]) {
    const ex = x + side * sep + lx, ey = cy + r * 0.12 + ly;
    g.fillStyle(0xffffff, alpha);
    g.fillCircle(ex, ey, er);
    g.fillStyle(0x16121e, alpha);
    g.fillCircle(ex + ca * er * 0.35, ey + sa * er * 0.3, er * 0.62);
  }

  // M1 helmet: olive dome, flared brim, a chinstrap.
  const hy0 = cy - r * 0.18;
  g.fillStyle(WW.odDeep, alpha);
  g.fillEllipse(x, hy0, r * 2.4, r * 0.66);
  g.beginPath();
  g.arc(x, hy0, r * 0.9, Math.PI, TAU, false);
  g.closePath();
  g.fillPath();
  g.fillStyle(WW.od, alpha);
  g.fillEllipse(x, hy0, r * 2.15, r * 0.44);
  g.beginPath();
  g.arc(x, hy0 - 0.3, r * 0.78, Math.PI, TAU, false);
  g.closePath();
  g.fillPath();
  g.fillStyle(WW.odLit, alpha);
  g.fillEllipse(x - r * 0.3, hy0 - r * 0.42, r * 0.5, r * 0.26);
  g.fillStyle(0xffffff, alpha * 0.4);
  g.fillEllipse(x - r * 0.36, hy0 - r * 0.5, r * 0.22, r * 0.12);

  if (!behind) weapon();
  orb(g, hx, hy, r * 0.36, WW.khaki, alpha);
}

/** Soldier → a rifleman with a fixed bayonet. */
export function ww2Soldier(
  g: G, tint: ConquestColorFn, x: number, y: number, color: number, ang: number, march: number, scale: number, alpha: number,
): void {
  infantry(g, x, y, tint(color), ang, march, scale, alpha, 'rifle', WW.fire);
}

/**
 * Wizard → a bazooka team with a radio pack (the long-range unit). Academy of Ash turns him into
 * a flamethrower trooper, whose pilot flame takes the ember colour the burned academy uses.
 */
export function ww2SpecialTroop(
  g: G, tint: ConquestColorFn, x: number, y: number, color: number, ang: number, march: number, ashen: boolean, alpha: number,
): void {
  infantry(g, x, y, tint(color), ang, march, 1, alpha, ashen ? 'flame' : 'bazooka', ashen ? WW.fire : 0xa8d86a);
}

/**
 * Barbarian King → a Sherman. A hull in the town colour knocked toward olive, two tracks with
 * road wheels whose treads roll with `march`, a white star on the side, a turret whose gun
 * follows `ang`, and the commander's head out of the cupola (his eyes are the king's eyes).
 * Enraged: the engine deck catches — exhaust fire and black smoke at the back, a red heat haze
 * and a glowing muzzle — since doubled attack speed is otherwise invisible.
 */
export function ww2Tank(
  g: G, tint: ConquestColorFn, x: number, y: number, color: number, ang: number, march: number, enraged: boolean, alpha: number,
): void {
  const hull = mix(tint(color), WW.od, 0.42);
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const flip = ca >= 0 ? 1 : -1;
  const cx = x, cy = y - 4;
  const hw = 15, hh = 7;
  shadow(g, x, y + 8, 36, 8, alpha);

  if (enraged) {
    const pulse = 0.7 + 0.3 * Math.sin(march * 3);
    g.fillStyle(0x8e2a1e, alpha * 0.16 * pulse);
    g.fillCircle(cx, cy, 25);
    // Smoke rolling off the engine deck, rising and fading.
    for (let i = 0; i < 4; i++) {
      const k = ((march * 0.35 + i * 0.25) % 1);
      const sx = cx - flip * (hw - 2) - flip * k * 5, sy = cy - 6 - k * 16;
      g.fillStyle(i % 2 ? WW.smoke : WW.gunDark, alpha * 0.45 * (1 - k));
      g.fillCircle(sx, sy, 3 + k * 4);
    }
  }

  // Tracks: the far one first, then the hull, then the near one with its road wheels.
  const track = (ty: number, near: boolean): void => {
    g.fillStyle(WW.gunDark, alpha);
    g.fillRoundedRect(cx - hw - 2, ty - 3.4, hw * 2 + 4, 6.8, 3.4);
    g.fillStyle(WW.gun, alpha);
    g.fillRoundedRect(cx - hw - 1.2, ty - 2.6, hw * 2 + 2.4, 5.2, 2.6);
    // Tread links scrolling with the march.
    g.lineStyle(0.8, WW.gunDark, alpha * 0.9);
    const off = ((march * 2.2 * flip) % 3 + 3) % 3;
    for (let tx = cx - hw + off; tx < cx + hw; tx += 3) g.lineBetween(tx, ty - 2.6, tx, ty + 2.6);
    if (near) {
      for (let i = 0; i < 5; i++) {
        const wx = cx - hw + 3 + i * ((hw * 2 - 6) / 4);
        g.fillStyle(WW.gunDark, alpha);
        g.fillCircle(wx, ty, 2.4);
        g.fillStyle(WW.gunLit, alpha);
        g.fillCircle(wx, ty, 1.5);
        g.fillStyle(WW.gunDark, alpha);
        g.fillCircle(wx, ty, 0.6);
      }
    }
  };
  track(cy - hh + 1, false);
  // Hull with a sloped glacis on the facing end and an engine deck at the back.
  const hullPts: Pt[] = [
    { x: cx - flip * hw, y: cy - hh }, { x: cx + flip * (hw - 4), y: cy - hh },
    { x: cx + flip * (hw + 1), y: cy - 1 }, { x: cx + flip * (hw - 1), y: cy + hh - 1 },
    { x: cx - flip * hw, y: cy + hh - 1 },
  ];
  rimmed(g, hullPts, hull, alpha);
  g.fillStyle(light(hull, 0.2), alpha);
  g.fillPoints([
    { x: cx + flip * (hw - 4), y: cy - hh }, { x: cx + flip * (hw + 1), y: cy - 1 },
    { x: cx + flip * (hw - 3), y: cy - 1 }, { x: cx + flip * (hw - 6), y: cy - hh + 1 },
  ], true);
  g.lineStyle(0.8, dark(hull, 0.4), alpha * 0.7);
  for (let i = 0; i < 3; i++) {
    const gx = cx - flip * (hw - 2.5 - i * 2.2);
    g.lineBetween(gx, cy - hh + 2, gx, cy + 1);
  }
  // The star on the hull side.
  g.fillStyle(WW.white, alpha * 0.9);
  g.fillCircle(cx + flip * 4, cy + 2.4, 3.2);
  star(g, cx + flip * 4, cy + 2.4, 2.7, hull, alpha);
  if (enraged) {
    const flick = 0.7 + 0.3 * Math.sin(march * 11);
    const ex = cx - flip * (hw + 1), ey = cy - 2;
    g.fillStyle(WW.fire, alpha * 0.9 * flick);
    g.fillTriangle(ex, ey - 2.4, ex, ey + 2.4, ex - flip * 7 * flick, ey - 1);
    g.fillStyle(WW.fireCore, alpha * flick);
    g.fillCircle(ex - flip * 1.2, ey, 1.4);
  }
  track(cy + hh, true);

  // Turret and gun.
  const tx = cx - flip * 1.5, ty = cy - 3;
  const P = frame(tx, ty, ang);
  const gun = (): void => {
    const b0 = P(4, 0), b1 = P(21, 0);
    g.lineStyle(4, WW.gunDark, alpha);
    g.lineBetween(b0.x, b0.y, b1.x, b1.y);
    g.lineStyle(2.2, hull, alpha);
    g.lineBetween(b0.x, b0.y, b1.x, b1.y);
    const mz = P(21, 0);
    g.fillStyle(WW.gunDark, alpha);
    g.fillCircle(mz.x, mz.y, 2.4);
    if (enraged) {
      g.fillStyle(WW.fire, alpha * (0.5 + 0.3 * Math.sin(march * 5)));
      g.fillCircle(mz.x, mz.y, 1.6);
    }
  };
  if (sa < 0) gun();
  g.fillStyle(dark(hull, 0.55), alpha);
  g.fillEllipse(tx, ty, 18, 12.5);
  g.fillStyle(hull, alpha);
  g.fillEllipse(tx, ty - 0.4, 16, 10.5);
  g.fillStyle(light(hull, 0.22), alpha);
  g.fillEllipse(tx - 2, ty - 2.2, 9, 4.5);
  // Mantlet on the gun side.
  const mt = P(6, 0);
  g.fillStyle(dark(hull, 0.3), alpha);
  g.fillCircle(mt.x, mt.y, 2.8);
  if (sa >= 0) gun();
  // The commander in the cupola: a head in a tanker's helmet, eyes on the target.
  const kx = tx - ca * 3, ky = ty - 4.5;
  g.fillStyle(WW.gunDark, alpha);
  g.fillEllipse(kx, ky + 2.4, 8, 3.4);
  orb(g, kx, ky, 3.4, WW.flesh, alpha);
  g.fillStyle(WW.leather, alpha);
  g.beginPath();
  g.arc(kx, ky - 0.4, 3.5, Math.PI, TAU, false);
  g.closePath();
  g.fillPath();
  for (const side of [-1, 1]) {
    const ex = kx + side * 1.3 + ca * 0.6, ey = ky + 0.6 + sa * 0.3;
    g.fillStyle(enraged ? WW.fire : 0xffffff, alpha);
    g.fillCircle(ex, ey, 0.85);
    if (!enraged) {
      g.fillStyle(0x16121e, alpha);
      g.fillCircle(ex + ca * 0.3, ey + sa * 0.25, 0.5);
    }
  }
}

/**
 * The Wizard Tower's held charge → an aerial bomb, nose down, fins up, a yellow nose band and a
 * pulsing red flare halo that says "ready" from across the board. In flight it's the same bomb.
 */
export function ww2Shell(
  g: G, _tint: ConquestColorFn, x: number, y: number, t: number, scale: number, alpha: number,
): void {
  const s = scale;
  const breathe = 1 + Math.sin(t * 3.4) * 0.09;
  g.fillStyle(WW.red, alpha * 0.16);
  g.fillCircle(x, y, 14 * s * breathe);
  g.lineStyle(1.4 * s, WW.fire, alpha * (0.4 + 0.3 * Math.sin(t * 6)));
  g.strokeCircle(x, y, 11 * s * breathe);
  const wob = Math.sin(t * 2.6) * 0.12;
  const P = frame(x, y, Math.PI / 2 + wob);
  // Fins.
  for (const side of [-1, 1]) {
    rimmed(g, [P(-5 * s, side * 1.6 * s), P(-10.5 * s, side * 5 * s), P(-10.5 * s, side * 1.2 * s)], WW.odShade, alpha);
  }
  const f0 = P(-10.5 * s, -5 * s), f1 = P(-10.5 * s, 5 * s);
  g.lineStyle(1.2 * s, WW.odDeep, alpha);
  g.lineBetween(f0.x, f0.y, f1.x, f1.y);
  // Body: a tapered teardrop.
  const body: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    const along = -8 * s + u * 16 * s;
    const half = (u < 0.7 ? 1.6 + u * 3.6 : 4.1 * Math.sqrt(Math.max(0, 1 - ((u - 0.7) / 0.3) ** 2))) * s;
    body.push(P(along, -half));
  }
  for (let i = 12; i >= 0; i--) {
    const u = i / 12;
    const along = -8 * s + u * 16 * s;
    const half = (u < 0.7 ? 1.6 + u * 3.6 : 4.1 * Math.sqrt(Math.max(0, 1 - ((u - 0.7) / 0.3) ** 2))) * s;
    body.push(P(along, half));
  }
  rimmed(g, body, WW.od, alpha);
  const hl: Pt[] = [P(-6 * s, -1.2 * s), P(4 * s, -3 * s), P(5 * s, -1.8 * s), P(-6 * s, -0.4 * s)];
  g.fillStyle(WW.odPale, alpha * 0.7);
  g.fillPoints(hl, true);
  // Yellow nose band.
  const n0 = P(4.6 * s, -3.8 * s), n1 = P(4.6 * s, 3.8 * s);
  g.lineStyle(1.6 * s, 0xe8c23a, alpha);
  g.lineBetween(n0.x, n0.y, n1.x, n1.y);
  const nose = P(7.6 * s, 0);
  g.fillStyle(WW.gunDark, alpha);
  g.fillCircle(nose.x, nose.y, 1.1 * s);
}

/**
 * Boom Back's bomb → a Mk 2 "pineapple" grenade tumbling through the air, its spoon flipped off
 * and the fuse sparking.
 */
export function ww2Grenade(
  g: G, _tint: ConquestColorFn, x: number, y: number, spin: number, alpha: number,
): void {
  shadow(g, x, y + 8, 10, 3, alpha * 0.7);
  const P = frame(x, y, spin);
  g.fillStyle(WW.odDeep, alpha);
  g.fillEllipse(x, y, 13, 13);
  // The segmented body, rotated with the spin.
  const body: Pt[] = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * TAU;
    body.push(P(Math.cos(a) * 5.6, Math.sin(a) * 4.6));
  }
  rimmed(g, body, WW.od, alpha);
  g.lineStyle(0.8, WW.odDeep, alpha * 0.9);
  for (let i = -1; i <= 1; i++) {
    const a0 = P(i * 2.4, -4.2), a1 = P(i * 2.4, 4.2);
    g.lineBetween(a0.x, a0.y, a1.x, a1.y);
  }
  const c0 = P(-5, 0), c1 = P(5, 0);
  g.lineBetween(c0.x, c0.y, c1.x, c1.y);
  const hlp = P(-1.6, -2.2);
  g.fillStyle(WW.odPale, alpha * 0.7);
  g.fillEllipse(hlp.x, hlp.y, 3, 1.6);
  // Fuse head and the spark.
  const fz0 = P(6.5, 0), fz1 = P(8.6, 0);
  g.lineStyle(2.4, WW.gun, alpha);
  g.lineBetween(fz0.x, fz0.y, fz1.x, fz1.y);
  g.fillStyle(WW.fire, alpha * 0.4);
  g.fillCircle(fz1.x, fz1.y, 4.4);
  g.fillStyle(WW.fireCore, alpha);
  g.fillCircle(fz1.x, fz1.y, 1.8 + Math.sin(spin * 9) * 0.6);
  for (let i = 0; i < 3; i++) {
    const a = spin * 3 + i * 2.1;
    g.fillStyle(WW.flash, alpha * 0.8);
    g.fillCircle(fz1.x + Math.cos(a) * 3.4, fz1.y + Math.sin(a) * 3.4, 0.8);
  }
}

/** The table the kit swaps in per owner: same names and signatures as the medieval art. */
export const WW2_CONQUEST_ART = {
  townCenterBody: ww2Headquarters,
  barracksBody: ww2Barracks,
  turretBody: ww2Pillbox,
  barricadeBody: ww2Sandbags,
  marketBody: ww2Depot,
  soldier: ww2Soldier,
  barbarianKing: ww2Tank,
  wizardTroop: ww2SpecialTroop,
  fireballOrb: ww2Shell,
  revengeBomb: ww2Grenade,
};

// ── Fx ─────────────────────────────────────────────────────────────────────

export class WarTwoFx extends FxBase {
  /**
   * The pike thrust as a bayonet lunge. The rifle itself stays rifle-sized and rides the tip of
   * the extension out to the full reach and back, with a dust wake along the line it travels —
   * so the line of the hit reads exactly as far as the pike's did. A muzzle flash on the first
   * frames: he fires as he charges.
   */
  thrust(x: number, y: number, ang: number, reach: number, color: number, depth = 9): void {
    this.anim(depth, 260, (g, t) => {
      const ext = t < 0.3 ? easeOut(t / 0.3) : 1 - easeIn((t - 0.3) / 0.7);
      const a = 1 - t * 0.55;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const px = -sa, py = ca;
      const rl = 36, bay = 13;
      const tipD = 30 + (reach - 30) * ext;
      const buttD = Math.max(6, tipD - rl - bay);
      const bx = x + ca * buttD, by = y + sa * buttD;
      // Wake along the lunge line.
      g.fillStyle(WW.khakiLit, a * 0.22);
      g.fillTriangle(x + ca * 10 + px * 1.5, y + sa * 10 + py * 1.5, x + ca * 10 - px * 1.5, y + sa * 10 - py * 1.5, bx, by);
      g.fillTriangle(bx + px * 4, by + py * 4, bx - px * 4, by - py * 4, x + ca * 10, y + sa * 10);
      for (const o of [-6, 6]) {
        const l0 = Math.max(10, buttD - 60 * ext), l1 = buttD - 4;
        if (l1 <= l0) continue;
        g.lineStyle(1, WW.khaki, a * 0.45);
        g.lineBetween(x + ca * l0 + px * o, y + sa * l0 + py * o, x + ca * l1 + px * o, y + sa * l1 + py * o);
      }
      // A rag in the town colour tied at the bayonet lug, streaming back off the lunge.
      const lug = { x: bx + ca * (rl - 2), y: by + sa * (rl - 2) };
      const droop = (1 - ext) * 6;
      g.fillStyle(color, a * 0.95);
      g.fillTriangle(
        lug.x, lug.y,
        lug.x - ca * 14 + px * 7, lug.y - sa * 14 + py * 7 + droop,
        lug.x - ca * 16 + px * 2, lug.y - sa * 16 + py * 2 + droop,
      );
      rifle(g, bx, by, ang, rl, bay, a, 1.3);
      // Muzzle flash on the opening frames.
      if (t < 0.2) {
        const k = 1 - t / 0.2;
        const mx = bx + ca * rl, my = by + sa * rl;
        g.fillStyle(WW.fire, k * 0.55);
        g.fillCircle(mx + ca * 6, my + sa * 6, 7 * k + 2);
        g.fillStyle(WW.flash, k);
        g.fillTriangle(mx + px * 3, my + py * 3, mx - px * 3, my - py * 3, mx + ca * 16 * k, my + sa * 16 * k);
        g.fillTriangle(mx, my, mx + ca * 6 + px * 7 * k, my + sa * 6 + py * 7 * k, mx + ca * 8, my + sa * 8);
        g.fillTriangle(mx, my, mx + ca * 6 - px * 7 * k, my + sa * 6 - py * 7 * k, mx + ca * 8, my + sa * 8);
      }
    });
  }

  /** Boot dust kicked off a running soldier's hands — the rig's trail. */
  dust(x: number, y: number, depth = 4): void {
    const seed = Math.random() * 999;
    this.anim(depth, 320, (g, t) => {
      for (let i = 0; i < 3; i++) {
        const a = jitter(seed, i) * TAU;
        const d = 3 + easeOut(t) * 7;
        g.fillStyle(i === 1 ? WW.khaki : WW.khakiShade, (1 - t) * 0.45);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6 - t * 3, 2.4 * (1 - t * 0.4));
      }
    });
  }
}
