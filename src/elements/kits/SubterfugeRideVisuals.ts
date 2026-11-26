import Phaser from 'phaser';
import { SUB, SubColorFn } from './SubterfugeVisuals';

/**
 * Pure painters for Subterfuge's Hijack: the four top-down vehicles (drawn in two layers so the
 * driver's orb can sit between them), their HP bar, the tank's shell, the charge-up dial and the
 * "press SPACE" keycap.
 *
 * Nothing here owns a game object. Every function draws one frame into a Graphics the caller
 * owns; every colour goes through `tint` so a skin recolours the lot.
 */

type G = Phaser.GameObjects.Graphics;
interface Pt { x: number; y: number }
type At = (lx: number, ly: number) => Pt;

const TAU = Math.PI * 2;
/** Colours the shared palette lacks. */
const X = {
  drab: 0x4b5238,
  drabDark: 0x30361f,
  drabHi: 0x6c7652,
  rubber: 0x141214,
  leather: 0x6b3a22,
  lamp: 0xfff2b0,
} as const;

// ── Path helpers (module-private copies of the ones in SubterfugeVisuals) ──

function fillPts(g: G, pts: Pt[]): void {
  if (pts.length < 3) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
}

function strokePts(g: G, pts: Pt[], close = false): void {
  if (pts.length < 2) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  if (close) g.closePath();
  g.strokePath();
}

/** Local-to-world for a shape drawn along `angle` at (cx, cy). */
function frame(cx: number, cy: number, angle: number): At {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return (lx, ly) => ({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos });
}

/** A local axis-aligned box pushed through a frame. */
function box(g: G, at: At, x0: number, y0: number, x1: number, y1: number): void {
  fillPts(g, [at(x0, y0), at(x1, y0), at(x1, y1), at(x0, y1)]);
}

/** A local box with its corners knocked off by `c`. */
function cbox(g: G, at: At, x0: number, y0: number, x1: number, y1: number, c: number): void {
  fillPts(g, [
    at(x0 + c, y0), at(x1 - c, y0), at(x1, y0 + c), at(x1, y1 - c),
    at(x1 - c, y1), at(x0 + c, y1), at(x0, y1 - c), at(x0, y0 + c),
  ]);
}

function seg(g: G, a: Pt, b: Pt): void { g.lineBetween(a.x, a.y, b.x, b.y); }
function dot(g: G, p: Pt, r: number): void { g.fillCircle(p.x, p.y, r); }
function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }

// ── Rides ─────────────────────────────────────────────────────────────────

export type RideKind = 'car' | 'bike' | 'sports' | 'tank';
export interface RideLook {
  /** 0..1 — below 0.5 dents, scorches and thin smoke; below 0.25 flames. */
  hpRatio: number;
  /** 0..1 of top speed — speed lines, exhaust, tread and wheel animation. */
  speed: number;
  /** -1..1 — front wheels turned. */
  steer: number;
  /** Someone is driving (headlights on, exhaust). */
  occupied: boolean;
  /** Tank only: world angle of the barrel. */
  turret: number;
  /** Tank only: 0..1 barrel recoil just after firing (1 = just fired). */
  recoil: number;
  /** The opponent's: wine instead of blood on house-colour trim. */
  enemy: boolean;
}

/** Approx footprint (length x width) the art fits: car 64x34, bike 46x16, sports 70x34, tank 84x52. */
export const RIDE_SIZE: Record<RideKind, { len: number; wid: number }> = {
  car: { len: 64, wid: 34 },
  bike: { len: 46, wid: 16 },
  sports: { len: 70, wid: 34 },
  tank: { len: 84, wid: 52 },
};

/** Where each ride's engine sits (local x) — where the damage shows. */
const ENGINE_X: Record<RideKind, number> = { car: 20, bike: 3, sports: 22, tank: -30 };

/** Ground shadow: the footprint, knocked-corner, slid down-right. */
function rideShadow(g: G, tint: SubColorFn, kind: RideKind, x: number, y: number, heading: number, alpha: number): void {
  const { len, wid } = RIDE_SIZE[kind];
  const sh = frame(x + 3, y + 5, heading);
  g.fillStyle(tint(SUB.ink), alpha * 0.3);
  cbox(g, sh, -len / 2, -wid / 2, len / 2, wid / 2, Math.min(7, wid * 0.3));
}

/** One tyre seen from above: rubber, an optional sidewall band, and a tread tick that rolls. */
function tyre(g: G, tint: SubColorFn, at: At, len: number, wid: number, roll: number, wall: number, alpha: number): void {
  const hl = len / 2, hw = wid / 2;
  g.fillStyle(tint(X.rubber), alpha);
  cbox(g, at, -hl, -hw, hl, hw, Math.min(1.6, hw * 0.6));
  if (wall !== 0) {
    g.fillStyle(tint(wall), alpha);
    box(g, at, -hl + 1.6, -hw + 0.9, hl - 1.6, hw - 0.9);
    g.fillStyle(tint(X.rubber), alpha);
    box(g, at, -hl + 3, -hw + 0.9, hl - 3, hw - 0.9);
  }
  g.lineStyle(0.9, tint(SUB.graphite), alpha);
  for (let i = 0; i < 2; i++) {
    const tx = -hl + 1 + ((roll + i * 0.5) % 1) * (len - 2);
    seg(g, at(tx, -hw + 0.4), at(tx, hw - 0.4));
  }
}

/** Streaks peeling off the tail at speed. */
function speedLines(g: G, tint: SubColorFn, at: At, tailX: number, halfW: number, speed: number, t: number, alpha: number): void {
  const k = clamp01((speed - 0.45) / 0.55);
  if (k <= 0) return;
  for (let i = 0; i < 3; i++) {
    const p = (t * 3.2 + i * 0.37) % 1;
    const ly = (i - 1) * halfW * 0.85;
    g.lineStyle(1.2, tint(SUB.paper), alpha * k * (1 - p) * 0.55);
    seg(g, at(tailX - 3 - p * 18, ly), at(tailX - 9 - p * 18 - k * 8, ly));
  }
}

/** Exhaust puffs drifting back from a tailpipe. */
function exhaust(g: G, tint: SubColorFn, at: At, px: number, py: number, speed: number, t: number, alpha: number): void {
  for (let i = 0; i < 3; i++) {
    const p = (t * (1.3 + speed * 1.5) + i / 3) % 1;
    const q = at(px - p * (7 + speed * 9), py + Math.sin(t * 4 + i * 2) * 1.5 * p);
    g.fillStyle(tint(SUB.ash), alpha * (1 - p) * 0.38);
    g.fillCircle(q.x, q.y - p * 2, 1.4 + p * 3);
  }
}

/** Headlight: chrome bezel, lens, and a thrown beam when someone is at the wheel. */
function headlight(g: G, tint: SubColorFn, at: At, lx: number, ly: number, r: number, on: boolean, alpha: number): void {
  if (on) {
    g.fillStyle(tint(X.lamp), alpha * 0.1);
    fillPts(g, [at(lx, ly - r * 0.6), at(lx + 34, ly - 9), at(lx + 34, ly + 9), at(lx, ly + r * 0.6)]);
  }
  g.fillStyle(tint(SUB.steel), alpha);
  dot(g, at(lx, ly), r);
  g.fillStyle(tint(on ? X.lamp : SUB.ashDark), alpha);
  dot(g, at(lx + 0.3, ly), r * 0.62);
}

/** Dents and burn marks ground into the bodywork once it is under half health. */
function scorch(g: G, tint: SubColorFn, at: At, kind: RideKind, hp: number, alpha: number): void {
  if (hp >= 0.5) return;
  const bad = clamp01((0.5 - hp) / 0.5);
  const ex = ENGINE_X[kind];
  const sc = kind === 'bike' ? 0.45 : kind === 'tank' ? 1.3 : 1;
  g.fillStyle(tint(SUB.ink), alpha * (0.35 + 0.35 * bad));
  dot(g, at(ex + 2 * sc, -2 * sc), (3.4 + bad * 2) * sc);
  dot(g, at(ex - 5 * sc, 3 * sc), (2.4 + bad * 2) * sc);
  dot(g, at(-ex * 0.6, -5 * sc), 2.6 * sc);
  g.lineStyle(1, tint(SUB.ashDark), alpha * 0.85);
  strokePts(g, [at(ex - 7 * sc, -5 * sc), at(ex - 3 * sc, -2.6 * sc), at(ex - 5 * sc, 0), at(ex - 1 * sc, 2 * sc)]);
  strokePts(g, [at(-ex * 0.6 - 4 * sc, 4 * sc), at(-ex * 0.6, 5.4 * sc), at(-ex * 0.6 + 2 * sc, 3 * sc)]);
}

/** Smoke off the engine under half health, flames licking under a quarter. Drawn in the top layer. */
function burning(g: G, tint: SubColorFn, at: At, kind: RideKind, hp: number, t: number, alpha: number): void {
  if (hp >= 0.5) return;
  const bad = clamp01((0.5 - hp) / 0.5);
  const e = at(ENGINE_X[kind], 0);
  const sc = kind === 'bike' ? 0.6 : kind === 'tank' ? 1.35 : 1;
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.75 + i / 4) % 1;
    g.fillStyle(tint(i % 2 === 0 ? SUB.ashDark : SUB.ash), alpha * (1 - p) * (0.25 + 0.3 * bad));
    g.fillCircle(e.x + Math.sin(t * 1.8 + i * 2.4) * 4 * p * sc + p * 5, e.y - p * 26 * sc, (2 + p * (4 + bad * 4)) * sc);
  }
  if (hp >= 0.25) return;
  for (let i = 0; i < 4; i++) {
    const fx = e.x + (i - 1.5) * 4 * sc + Math.sin(t * 5 + i) * 1.2;
    const fh = (7 + 6 * Math.abs(Math.sin(t * 9 + i * 1.7))) * sc;
    g.fillStyle(tint(i % 2 === 0 ? SUB.ember : SUB.flame), alpha * 0.85);
    g.fillTriangle(fx - 2.6 * sc, e.y + 2 * sc, fx + 2.6 * sc, e.y + 2 * sc, fx + Math.sin(t * 11 + i) * 1.5, e.y - fh);
    g.fillStyle(tint(SUB.gold), alpha * 0.8);
    g.fillTriangle(fx - 1.2 * sc, e.y + 2 * sc, fx + 1.2 * sc, e.y + 2 * sc, fx, e.y - fh * 0.5);
  }
}

// ── Car: a stolen 1930s sedan ─────────────────────────────────────────────

function carBase(g: G, tint: SubColorFn, at: At, x: number, y: number, heading: number, t: number, alpha: number, look: RideLook, house: number): void {
  const roll = (t * look.speed * 5) % 1;
  if (look.occupied) exhaust(g, tint, at, -33, 7, look.speed, t, alpha);
  speedLines(g, tint, at, -32, 15, look.speed, t, alpha);

  // Whitewall tyres; the fronts turn with the wheel.
  for (let i = -1; i <= 1; i += 2) {
    tyre(g, tint, frame(at(-19, i * 14.2).x, at(-19, i * 14.2).y, heading), 12, 5.4, roll, SUB.paper, alpha);
    const fp = at(20, i * 14.2);
    tyre(g, tint, frame(fp.x, fp.y, heading + look.steer * 0.45), 12, 5.4, roll, SUB.paper, alpha);
  }
  void x; void y;

  // Bumpers, running boards.
  g.lineStyle(1.8, tint(SUB.steel), alpha);
  seg(g, at(32, -11), at(32, 11));
  seg(g, at(-32, -10), at(-32, 10));
  g.fillStyle(tint(SUB.graphite), alpha);
  box(g, at, -12, -16.4, 12, -12.5);
  box(g, at, -12, 12.5, 12, 16.4);
  g.lineStyle(0.8, tint(SUB.ashDark), alpha);
  seg(g, at(-11, -15), at(11, -15));
  seg(g, at(-11, 15), at(11, 15));

  // Rounded fenders swelling over each wheel.
  g.fillStyle(tint(SUB.ink), alpha);
  for (let i = -1; i <= 1; i += 2) {
    fillPts(g, [at(11, i * 9), at(14, i * 15.4), at(25, i * 16.2), at(30, i * 13), at(31, i * 8), at(26, i * 6)]);
    fillPts(g, [at(-11, i * 10), at(-13, i * 15.6), at(-24, i * 16), at(-29, i * 12.4), at(-30, i * 8)]);
    g.lineStyle(0.9, tint(SUB.graphite), alpha);
    strokePts(g, [at(14, i * 15), at(25, i * 15.8), at(29.6, i * 12.6)]);
    strokePts(g, [at(-13, i * 15.2), at(-24, i * 15.6), at(-28.6, i * 12)]);
  }

  // Body: trunk, cabin tub, long tapering hood.
  g.fillStyle(tint(SUB.ink), alpha);
  fillPts(g, [at(-31, -7.5), at(-23, -12.6), at(8, -12.6), at(12, -8), at(30, -5.4), at(30, 5.4), at(12, 8), at(8, 12.6), at(-23, 12.6), at(-31, 7.5)]);
  g.fillStyle(tint(SUB.charcoal), alpha);
  fillPts(g, [at(11, -7), at(29, -4.6), at(29, 4.6), at(11, 7)]);
  fillPts(g, [at(-30, -6.6), at(-23, -10.6), at(-23, 10.6), at(-30, 6.6)]);
  // Hood: centre hinge, a sheen down one side, louvres.
  g.fillStyle(tint(SUB.graphite), alpha * 0.7);
  fillPts(g, [at(12, -6.2), at(28.4, -4), at(28.4, -2.2), at(12, -3)]);
  g.lineStyle(0.9, tint(SUB.steel), alpha * 0.8);
  seg(g, at(11, 0), at(29.4, 0));
  g.lineStyle(0.8, tint(SUB.ink), alpha);
  for (let i = 0; i < 4; i++) {
    seg(g, at(14.5 + i * 3, 2), at(14.5 + i * 3, 5.6 - i * 0.3));
  }
  // House pinstripe down both flanks and round the hood.
  g.lineStyle(1.1, tint(house), alpha);
  strokePts(g, [at(-29, -7.6), at(-22.6, -11.4), at(8, -11.4), at(11.6, -7.6), at(29, -5.2)]);
  strokePts(g, [at(-29, 7.6), at(-22.6, 11.4), at(8, 11.4), at(11.6, 7.6), at(29, 5.2)]);

  // The open cabin: floor, bench seats in oxblood leather.
  g.fillStyle(tint(SUB.slate), alpha);
  cbox(g, at, -20, -10.2, 7.4, 10.2, 2);
  g.fillStyle(tint(X.leather), alpha);
  cbox(g, at, -19, -9.2, -12, 9.2, 1.6);
  cbox(g, at, -8, -9.2, -2, 9.2, 1.6);
  g.lineStyle(0.8, tint(SUB.ink), alpha * 0.7);
  seg(g, at(-15.5, -9), at(-15.5, 9));
  seg(g, at(-5, -9), at(-5, 9));
  seg(g, at(-8, 0), at(-2, 0));

  // Spare wheel strapped to the trunk.
  g.fillStyle(tint(X.rubber), alpha);
  dot(g, at(-27, 0), 4.6);
  g.fillStyle(tint(SUB.paper), alpha);
  dot(g, at(-27, 0), 3.2);
  g.fillStyle(tint(SUB.steel), alpha);
  dot(g, at(-27, 0), 1.7);

  // Chrome: grille with bars, cap ornament, lamps, tail lights.
  g.fillStyle(tint(SUB.steel), alpha);
  fillPts(g, [at(29, -4.8), at(31.4, -3.6), at(31.4, 3.6), at(29, 4.8)]);
  g.lineStyle(0.7, tint(SUB.ink), alpha);
  for (let i = -1; i <= 1; i++) seg(g, at(29.3, i * 2.2), at(31.2, i * 2.2));
  g.fillStyle(tint(SUB.gold), alpha);
  dot(g, at(28.4, 0), 1.2);
  headlight(g, tint, at, 29.5, -9.6, 2.7, look.occupied, alpha);
  headlight(g, tint, at, 29.5, 9.6, 2.7, look.occupied, alpha);
  g.fillStyle(tint(SUB.scarlet), alpha * (look.occupied ? 1 : 0.6));
  dot(g, at(-31, -8.4), 1.3);
  dot(g, at(-31, 8.4), 1.3);
}

function carTop(g: G, tint: SubColorFn, at: At, alpha: number, house: number): void {
  // Windshield: glass with a glare, chrome frame.
  g.fillStyle(tint(SUB.haze), alpha * 0.4);
  fillPts(g, [at(7.2, -11), at(11.4, -9.4), at(11.4, 9.4), at(7.2, 11)]);
  g.fillStyle(tint(SUB.white), alpha * 0.35);
  fillPts(g, [at(8, -8), at(10.6, -7), at(10.6, -2.4), at(8, -3)]);
  g.lineStyle(1.5, tint(SUB.steel), alpha);
  strokePts(g, [at(7.2, -11.4), at(11.6, -9.6), at(11.6, 9.6), at(7.2, 11.4)]);
  // Roof pillars and rails — a frame, not a lid, so the driver shows.
  g.lineStyle(2, tint(SUB.ink), alpha);
  seg(g, at(7.2, -11.6), at(-20, -11.6));
  seg(g, at(7.2, 11.6), at(-20, 11.6));
  seg(g, at(-10.4, -11.6), at(-10.4, -9));
  seg(g, at(-10.4, 11.6), at(-10.4, 9));
  g.lineStyle(0.8, tint(SUB.graphite), alpha);
  seg(g, at(6, -12.2), at(-19, -12.2));
  seg(g, at(6, 11), at(-19, 11));
  // The folded canvas top stacked behind the rear bench.
  g.fillStyle(tint(SUB.charcoal), alpha);
  cbox(g, at, -24, -12, -19.4, 12, 1.6);
  g.lineStyle(0.8, tint(SUB.graphite), alpha);
  seg(g, at(-22.6, -11), at(-22.6, 11));
  seg(g, at(-21, -11), at(-21, 11));
  // Door mirrors, and a house pennant on the fender.
  g.fillStyle(tint(SUB.steelHi), alpha);
  dot(g, at(8.6, -13.6), 1.4);
  dot(g, at(8.6, 13.6), 1.4);
  g.fillStyle(tint(house), alpha);
  fillPts(g, [at(24, -12), at(19, -13.6), at(19, -10.6)]);
}

// ── Bike: lean, black, loud ───────────────────────────────────────────────

function bikeBase(g: G, tint: SubColorFn, at: At, heading: number, t: number, alpha: number, look: RideLook, house: number): void {
  const roll = (t * look.speed * 6) % 1;
  if (look.occupied) exhaust(g, tint, at, -23, 5.6, look.speed, t, alpha);
  speedLines(g, tint, at, -22, 6, look.speed, t, alpha);

  // Rear wheel and fender.
  tyre(g, tint, frame(at(-16, 0).x, at(-16, 0).y, heading), 13, 4.6, roll, 0, alpha);
  g.fillStyle(tint(SUB.ink), alpha);
  cbox(g, at, -20, -2.9, -11, 2.9, 1.2);
  g.fillStyle(tint(SUB.scarlet), alpha * (look.occupied ? 1 : 0.6));
  box(g, at, -22.6, -1.4, -21, 1.4);

  // The fork and front wheel, swinging with the bars.
  const piv = at(12, 0);
  const fk = frame(piv.x, piv.y, heading + look.steer * 0.5);
  tyre(g, tint, (lx, ly) => fk(lx + 5.5, ly), 11, 4.2, roll, 0, alpha);
  g.lineStyle(1.4, tint(SUB.steelHi), alpha);
  seg(g, fk(-1, -3.2), fk(7.5, -3));
  seg(g, fk(-1, 3.2), fk(7.5, 3));
  g.fillStyle(tint(SUB.ink), alpha);
  fillPts(g, [fk(2, -2.4), fk(7, -2), fk(7, 2), fk(2, 2.4)]);
  g.fillStyle(tint(SUB.steel), alpha);
  dot(g, fk(5.5, 0), 1.1);

  // Engine: twin cylinders poking out past the frame, finned.
  g.fillStyle(tint(SUB.steel), alpha);
  box(g, at, -3, -6.6, 5, 6.6);
  g.lineStyle(0.7, tint(SUB.ashDark), alpha);
  for (let i = 0; i < 3; i++) {
    seg(g, at(-1.5 + i * 2.6, -6.6), at(-1.5 + i * 2.6, -3.6));
    seg(g, at(-1.5 + i * 2.6, 3.6), at(-1.5 + i * 2.6, 6.6));
  }
  // Chrome pipes sweeping back down both sides.
  g.lineStyle(1.9, tint(SUB.steel), alpha);
  strokePts(g, [at(3, -5.6), at(-6, -6.6), at(-22, -5.6)]);
  strokePts(g, [at(3, 5.6), at(-6, 6.6), at(-22, 5.6)]);
  g.lineStyle(0.7, tint(SUB.steelHi), alpha);
  seg(g, at(-6, -7), at(-21, -6));
  seg(g, at(-6, 6.2), at(-21, 5.2));
  g.fillStyle(tint(SUB.ink), alpha);
  dot(g, at(-22.4, -5.6), 1);
  dot(g, at(-22.4, 5.6), 1);

  // Frame spine, the crimson tank with its gold line, the saddle.
  g.fillStyle(tint(SUB.charcoal), alpha);
  cbox(g, at, -12, -3, 13, 3, 1.4);
  g.fillStyle(tint(house), alpha);
  fillPts(g, [at(1, -3.4), at(6, -4.8), at(11, -3.4), at(12.4, 0), at(11, 3.4), at(6, 4.8), at(1, 3.4)]);
  g.fillStyle(tint(SUB.scarlet), alpha * 0.6);
  fillPts(g, [at(2.4, -2.6), at(6, -3.8), at(10, -2.6), at(6, -1.6)]);
  g.lineStyle(0.9, tint(SUB.gold), alpha);
  seg(g, at(1.6, 0), at(11.6, 0));
  g.fillStyle(tint(SUB.steelHi), alpha);
  dot(g, at(8.4, 0), 1.1);
  g.fillStyle(tint(SUB.ink), alpha);
  cbox(g, at, -12, -3.6, 1, 3.6, 1.6);
  g.fillStyle(tint(X.leather), alpha);
  cbox(g, at, -11, -2.7, 0, 2.7, 1.2);
  g.lineStyle(0.7, tint(SUB.ink), alpha * 0.7);
  seg(g, at(-6, -2.6), at(-6, 2.6));
  // Foot pegs.
  g.lineStyle(1.3, tint(SUB.steel), alpha);
  seg(g, at(-5, -3), at(-5, -8));
  seg(g, at(-5, 3), at(-5, 8));
}

function bikeTop(g: G, tint: SubColorFn, at: At, heading: number, alpha: number, look: RideLook): void {
  const piv = at(12, 0);
  const fk = frame(piv.x, piv.y, heading + look.steer * 0.5);
  // Headlamp out front of the yoke.
  headlight(g, tint, fk, 4.4, 0, 2.6, look.occupied, alpha);
  // Swept-back bars, grips, levers and mirrors.
  g.lineStyle(3, tint(SUB.ink), alpha * 0.55);
  strokePts(g, [fk(-3.4, -8), fk(0.6, -3), fk(0.6, 3), fk(-3.4, 8)]);
  g.lineStyle(1.7, tint(SUB.steelHi), alpha);
  strokePts(g, [fk(-3.4, -8), fk(0.6, -3), fk(0.6, 3), fk(-3.4, 8)]);
  g.lineStyle(2.6, tint(SUB.ink), alpha);
  seg(g, fk(-3.4, -8), fk(-1.8, -6));
  seg(g, fk(-3.4, 8), fk(-1.8, 6));
  g.fillStyle(tint(SUB.steel), alpha);
  dot(g, fk(1.4, -7.4), 1.3);
  dot(g, fk(1.4, 7.4), 1.3);
  g.fillStyle(tint(SUB.graphite), alpha);
  dot(g, fk(0.6, 0), 1.9);
  g.fillStyle(tint(SUB.gold), alpha);
  dot(g, fk(0.6, 0), 0.9);
}

// ── Sports: a low, wide roadster ──────────────────────────────────────────

function sportsBase(g: G, tint: SubColorFn, at: At, heading: number, t: number, alpha: number, look: RideLook, house: number): void {
  const roll = (t * look.speed * 7) % 1;
  speedLines(g, tint, at, -35, 14, look.speed, t, alpha);

  // Twin exhausts — breath at idle, flame at speed.
  for (let i = -1; i <= 1; i += 2) {
    if (look.speed > 0.7) {
      const k = (look.speed - 0.7) / 0.3;
      const fl = 5 + k * 9 + Math.sin(t * 40 + i) * 2.5;
      g.fillStyle(tint(SUB.ember), alpha * 0.85);
      fillPts(g, [at(-35, i * 3.4 - 1.7), at(-35 - fl, i * 3.4), at(-35, i * 3.4 + 1.7)]);
      g.fillStyle(tint(SUB.gold), alpha * 0.9);
      fillPts(g, [at(-35, i * 3.4 - 0.9), at(-35 - fl * 0.55, i * 3.4), at(-35, i * 3.4 + 0.9)]);
    } else if (look.occupied) {
      exhaust(g, tint, at, -36, i * 3.4, look.speed, t, alpha);
    }
  }

  // Fat tyres on chrome wire wheels.
  for (let i = -1; i <= 1; i += 2) {
    const rp = at(-21, i * 14);
    const fp = at(21, i * 14);
    const rear = frame(rp.x, rp.y, heading);
    const front = frame(fp.x, fp.y, heading + look.steer * 0.42);
    tyre(g, tint, rear, 14, 6, roll, 0, alpha);
    tyre(g, tint, front, 13, 5.6, roll, 0, alpha);
    g.lineStyle(1.1, tint(SUB.steelHi), alpha);
    seg(g, rear(-4, i * 2.6), rear(4, i * 2.6));
    seg(g, front(-4, i * 2.4), front(4, i * 2.4));
  }

  // Body: round nose, front wings, a waist, rear haunches, a long boat tail.
  const hull: Array<[number, number]> = [[35, 4.6], [31, 9.6], [24, 14.8], [16, 14.6], [6, 11.6], [-10, 12], [-18, 15], [-25, 14], [-31, 8], [-35, 3.2]];
  const outline: Pt[] = [];
  for (const [lx, ly] of hull) outline.push(at(lx, ly));
  for (let i = hull.length - 1; i >= 0; i--) outline.push(at(hull[i][0], -hull[i][1]));
  g.fillStyle(tint(SUB.wine), alpha);
  fillPts(g, outline);
  // The lit upper surface, inset.
  g.fillStyle(tint(house), alpha);
  fillPts(g, [
    at(33.6, 3.8), at(30, 8), at(23.6, 12.6), at(16, 12.4), at(6, 9.8), at(-10, 10.2), at(-18, 12.8), at(-24.4, 12), at(-30, 6.8), at(-33.6, 2.6),
    at(-33.6, -2.6), at(-30, -6.8), at(-24.4, -12), at(-18, -12.8), at(-10, -10.2), at(6, -9.8), at(16, -12.4), at(23.6, -12.6), at(30, -8), at(33.6, -3.8),
  ]);
  // Sheen down the hood and along one haunch.
  g.fillStyle(tint(SUB.scarlet), alpha * 0.6);
  fillPts(g, [at(31, -3), at(12, -5.6), at(12, -2), at(31, -0.8)]);
  fillPts(g, [at(-12, -9), at(-19, -11.6), at(-27, -8), at(-20, -8.6)]);
  // Gold: the spine, the wing lines.
  g.lineStyle(1.2, tint(SUB.gold), alpha);
  seg(g, at(34, 0), at(9, 0));
  seg(g, at(-14, 0), at(-34.6, 0));
  g.lineStyle(0.9, tint(SUB.brass), alpha);
  strokePts(g, [at(30, 8.6), at(23.6, 13.4), at(16, 13.2), at(6, 10.6)]);
  strokePts(g, [at(30, -8.6), at(23.6, -13.4), at(16, -13.2), at(6, -10.6)]);
  // Hood vents and strap.
  g.lineStyle(0.9, tint(SUB.ink), alpha * 0.85);
  for (let i = 0; i < 4; i++) {
    seg(g, at(15 + i * 3, 2.4), at(16.2 + i * 3, 6));
    seg(g, at(15 + i * 3, -2.4), at(16.2 + i * 3, -6));
  }
  g.fillStyle(tint(X.leather), alpha);
  box(g, at, 26, -7.6, 27.4, 7.6);

  // Cockpit: black tub, two tan buckets, a gold-rimmed coaming.
  g.fillStyle(tint(SUB.ink), alpha);
  fillPts(g, [at(8, -8.6), at(8, 8.6), at(-8, 9.6), at(-13, 6), at(-13, -6), at(-8, -9.6)]);
  g.fillStyle(tint(X.leather), alpha);
  cbox(g, at, -11, -8, -3, -1, 1.6);
  cbox(g, at, -11, 1, -3, 8, 1.6);
  g.fillStyle(tint(SUB.wood), alpha);
  box(g, at, 5, -7.6, 7.2, 7.6);
  g.lineStyle(1, tint(SUB.gold), alpha);
  strokePts(g, [at(8, -8.6), at(-8, -9.6), at(-13, -6), at(-13, 6), at(-8, 9.6), at(8, 8.6)]);
  // Headrest fairings running into the tail.
  g.fillStyle(tint(SUB.wine), alpha);
  fillPts(g, [at(-13, -6.4), at(-13, -1.6), at(-27, -2.6), at(-24, -4.6)]);
  fillPts(g, [at(-13, 6.4), at(-13, 1.6), at(-27, 2.6), at(-24, 4.6)]);

  // Chrome: oval grille, lamps, tail lamps, pipe tips.
  g.fillStyle(tint(SUB.steel), alpha);
  fillPts(g, [at(35.4, -3.6), at(35.4, 3.6), at(33, 4.4), at(33, -4.4)]);
  g.lineStyle(0.7, tint(SUB.ink), alpha);
  seg(g, at(33.2, -1.5), at(35.2, -1.5));
  seg(g, at(33.2, 1.5), at(35.2, 1.5));
  headlight(g, tint, at, 30.6, -9.4, 2.5, look.occupied, alpha);
  headlight(g, tint, at, 30.6, 9.4, 2.5, look.occupied, alpha);
  g.fillStyle(tint(SUB.scarlet), alpha * (look.occupied ? 1 : 0.6));
  dot(g, at(-31, -7), 1.2);
  dot(g, at(-31, 7), 1.2);
  g.fillStyle(tint(SUB.steelHi), alpha);
  dot(g, at(-35, -3.4), 1.3);
  dot(g, at(-35, 3.4), 1.3);
}

function sportsTop(g: G, tint: SubColorFn, at: At, alpha: number): void {
  // A raked wraparound screen on stub pillars.
  g.fillStyle(tint(SUB.haze), alpha * 0.4);
  fillPts(g, [at(8, -9.4), at(11.6, -7), at(12.4, 0), at(11.6, 7), at(8, 9.4), at(9.4, 0)]);
  g.fillStyle(tint(SUB.white), alpha * 0.35);
  fillPts(g, [at(9, -7), at(11.2, -5.6), at(11.8, -1.4), at(9.8, -1.4)]);
  g.lineStyle(1.4, tint(SUB.steelHi), alpha);
  strokePts(g, [at(8, -9.6), at(11.8, -7), at(12.6, 0), at(11.8, 7), at(8, 9.6)]);
  g.lineStyle(1.8, tint(SUB.gold), alpha);
  seg(g, at(8, -9.6), at(4, -10.2));
  seg(g, at(8, 9.6), at(4, 10.2));
  // Wing mirrors on stalks.
  g.lineStyle(1, tint(SUB.steel), alpha);
  seg(g, at(9, -10), at(11, -13));
  seg(g, at(9, 10), at(11, 13));
  g.fillStyle(tint(SUB.steelHi), alpha);
  dot(g, at(11, -13.4), 1.5);
  dot(g, at(11, 13.4), 1.5);
  // Roll hoop behind the seats.
  g.lineStyle(2.2, tint(SUB.steel), alpha);
  strokePts(g, [at(-12.6, -8), at(-14.6, -5), at(-14.6, 5), at(-12.6, 8)]);
  g.lineStyle(0.8, tint(SUB.steelHi), alpha);
  seg(g, at(-15, -4.6), at(-15, 4.6));
}

// ── Tank: an Abrams silhouette ────────────────────────────────────────────

function tankBase(g: G, tint: SubColorFn, at: At, t: number, alpha: number, look: RideLook, house: number): void {
  if (look.occupied) {
    exhaust(g, tint, at, -41, -8, look.speed, t, alpha);
    exhaust(g, tint, at, -41, 8, look.speed, t, alpha);
  }
  // Dust kicked up behind the tracks.
  if (look.speed > 0.2) {
    for (let i = 0; i < 4; i++) {
      const p = (t * 1.6 + i / 4) % 1;
      const q = at(-42 - p * 14, (i % 2 === 0 ? -21 : 21) + Math.sin(i * 3 + t) * 2);
      g.fillStyle(tint(SUB.ash), alpha * (1 - p) * 0.3 * look.speed);
      g.fillCircle(q.x, q.y, 2 + p * 5);
    }
  }

  // Tracks: rubber bands, scrolling links, sprocket and idler ends.
  const scroll = (t * look.speed * 46) % 6;
  for (let i = -1; i <= 1; i += 2) {
    g.fillStyle(tint(X.rubber), alpha);
    cbox(g, at, -42, i * 21.5 - 4.5, 42, i * 21.5 + 4.5, 2.4);
    g.fillStyle(tint(SUB.slate), alpha);
    box(g, at, -40, i * 21.5 - 3.4, 40, i * 21.5 + 3.4);
    g.lineStyle(1.5, tint(X.rubber), alpha);
    g.beginPath();
    for (let lx = -39 + scroll; lx < 40; lx += 6) {
      const a = at(lx, i * 21.5 - 3.6), b = at(lx, i * 21.5 + 3.6);
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
    }
    g.strokePath();
    g.lineStyle(0.8, tint(SUB.ashDark), alpha * 0.8);
    seg(g, at(-40, i * 21.5), at(40, i * 21.5));
  }

  // Hull: dark skirt edge, drab deck, sloped glacis up front.
  g.fillStyle(tint(X.drabDark), alpha);
  fillPts(g, [at(-39, -18), at(34, -18), at(41, -11), at(41, 11), at(34, 18), at(-39, 18)]);
  g.fillStyle(tint(X.drab), alpha);
  fillPts(g, [at(-37.6, -16.4), at(33, -16.4), at(39.4, -10.4), at(39.4, 10.4), at(33, 16.4), at(-37.6, 16.4)]);
  g.fillStyle(tint(X.drabHi), alpha * 0.75);
  fillPts(g, [at(27, -16.4), at(33, -16.4), at(39.4, -10.4), at(39.4, 10.4), at(33, 16.4), at(27, 16.4)]);
  g.lineStyle(0.9, tint(X.drabDark), alpha);
  seg(g, at(27, -16.4), at(27, 16.4));
  // Side-skirt panel breaks.
  for (let i = 0; i < 5; i++) {
    seg(g, at(-28 + i * 12, -18), at(-28 + i * 12, -15.4));
    seg(g, at(-28 + i * 12, 18), at(-28 + i * 12, 15.4));
  }
  // Driver's hatch on the glacis, and the lamps.
  g.fillStyle(tint(X.drabDark), alpha);
  cbox(g, at, 29, -4.4, 36, 4.4, 1.6);
  g.fillStyle(tint(SUB.haze), alpha * 0.8);
  box(g, at, 34.4, -2.6, 35.6, 2.6);
  headlight(g, tint, at, 38, -12.6, 2, look.occupied, alpha);
  headlight(g, tint, at, 38, 12.6, 2, look.occupied, alpha);

  // Engine deck: louvred grilles either side of a spine, glowing a little when running.
  g.fillStyle(tint(SUB.charcoal), alpha);
  box(g, at, -36, -14, -22, -2);
  box(g, at, -36, 2, -22, 14);
  g.lineStyle(0.8, tint(SUB.ashDark), alpha);
  for (let i = 0; i < 5; i++) {
    seg(g, at(-34.6 + i * 2.8, -13.4), at(-34.6 + i * 2.8, -2.6));
    seg(g, at(-34.6 + i * 2.8, 2.6), at(-34.6 + i * 2.8, 13.4));
  }
  if (look.occupied) {
    g.fillStyle(tint(SUB.ember), alpha * (0.14 + 0.08 * Math.sin(t * 9)));
    box(g, at, -36, -14, -22, 14);
  }
  // House band and a gold tactical bar across the rear deck; tow shackles.
  g.fillStyle(tint(house), alpha);
  box(g, at, -21, -16.4, -18, 16.4);
  g.fillStyle(tint(SUB.gold), alpha);
  box(g, at, -18, -16.4, -17.2, 16.4);
  g.fillStyle(tint(SUB.steel), alpha);
  dot(g, at(-38.6, -11), 1.3);
  dot(g, at(-38.6, 11), 1.3);
  // The turret ring showing under the turret.
  g.lineStyle(1.4, tint(X.drabDark), alpha);
  const c = at(0, 0);
  g.strokeCircle(c.x, c.y, 18.6);
}

function tankTop(g: G, tint: SubColorFn, x: number, y: number, t: number, alpha: number, look: RideLook, house: number): void {
  const tf = frame(x, y, look.turret);
  const rc = clamp01(look.recoil);
  const back = rc * 5.5;

  // Barrel first, so the mantlet sits over its root: tube, bore evacuator, muzzle collar.
  g.fillStyle(tint(X.drabDark), alpha);
  box(g, tf, 20 - back, -2.5, 53 - back, 2.5);
  g.fillStyle(tint(X.drab), alpha);
  box(g, tf, 20 - back, -1.8, 53 - back, 1.2);
  g.fillStyle(tint(X.drabHi), alpha * 0.8);
  box(g, tf, 20 - back, -1.5, 53 - back, -0.5);
  g.fillStyle(tint(X.drabDark), alpha);
  cbox(g, tf, 34 - back, -3.6, 42 - back, 3.6, 1);
  g.fillStyle(tint(X.drab), alpha);
  box(g, tf, 35 - back, -2.6, 41 - back, 1.6);
  g.fillStyle(tint(SUB.charcoal), alpha);
  box(g, tf, 52 - back, -3, 55 - back, 3);
  g.fillStyle(tint(SUB.ink), alpha);
  box(g, tf, 54.4 - back, -1.6, 55.2 - back, 1.6);

  // The turret, built round an open hatch: a thick collar, then armour blocks fore, aft and flank.
  g.lineStyle(6.4, tint(X.drab), alpha);
  g.strokeCircle(x, y, 14.2);
  g.fillStyle(tint(X.drabDark), alpha);
  fillPts(g, [tf(11.4, -17.6), tf(15, -16), tf(24.6, -6.6), tf(24.6, 6.6), tf(15, 16), tf(11.4, 17.6)]);
  fillPts(g, [tf(-11.4, -17.6), tf(-11.4, 17.6), tf(-25.6, 13), tf(-25.6, -13)]);
  box(g, tf, -12, -17.6, 12, -11.4);
  box(g, tf, -12, 11.4, 12, 17.6);
  g.fillStyle(tint(X.drab), alpha);
  fillPts(g, [tf(12, -16.2), tf(14.6, -14.8), tf(23, -6), tf(23, 6), tf(14.6, 14.8), tf(12, 16.2)]);
  fillPts(g, [tf(-12, -16.2), tf(-12, 16.2), tf(-24.2, 11.8), tf(-24.2, -11.8)]);
  box(g, tf, -12, -16.2, 12, -12);
  box(g, tf, -12, 12, 12, 16.2);
  // Angled cheek faces catching the light.
  g.fillStyle(tint(X.drabHi), alpha * 0.8);
  fillPts(g, [tf(14.6, -14.8), tf(23, -6), tf(18, -6), tf(12.6, -11.6)]);
  g.fillStyle(tint(X.drabDark), alpha * 0.7);
  fillPts(g, [tf(14.6, 14.8), tf(23, 6), tf(18, 6), tf(12.6, 11.6)]);
  // Mantlet.
  g.fillStyle(tint(SUB.charcoal), alpha);
  cbox(g, tf, 20.6, -4.6, 25.6, 4.6, 1.2);
  g.fillStyle(tint(SUB.graphite), alpha);
  box(g, tf, 21.6, -3.2, 24.6, -0.6);
  // Bustle rack slats, house band, smoke dischargers, sight box, antenna.
  g.lineStyle(0.9, tint(X.drabDark), alpha);
  for (let i = 0; i < 4; i++) seg(g, tf(-14.6 - i * 2.6, -11.6 + i * 0.5), tf(-14.6 - i * 2.6, 11.6 - i * 0.5));
  g.fillStyle(tint(house), alpha);
  fillPts(g, [tf(-12, -16.2), tf(-9.4, -16.2), tf(-9.4, -12), tf(-12, -12)]);
  fillPts(g, [tf(-12, 16.2), tf(-9.4, 16.2), tf(-9.4, 12), tf(-12, 12)]);
  g.fillStyle(tint(SUB.charcoal), alpha);
  for (let i = -1; i <= 1; i += 2) {
    dot(g, tf(4, i * 18), 1.5);
    dot(g, tf(7.4, i * 17.6), 1.5);
  }
  g.fillStyle(tint(SUB.charcoal), alpha);
  cbox(g, tf, 13.4, 6.4, 18.4, 10.8, 1);
  g.fillStyle(tint(SUB.haze), alpha * 0.9);
  box(g, tf, 17.2, 7.4, 18.2, 9.8);
  const sway = Math.sin(t * 3.1) * (1 + look.speed * 2);
  g.lineStyle(0.9, tint(SUB.ink), alpha * 0.9);
  const a0 = tf(-22, -9.6);
  g.lineBetween(a0.x, a0.y, a0.x + 5 + sway, a0.y - 15);
  g.fillStyle(tint(house), alpha);
  g.fillTriangle(a0.x + 5 + sway, a0.y - 15, a0.x + 10 + sway, a0.y - 13.4, a0.x + 4.4 + sway * 0.9, a0.y - 11.6);

  // The hatch ring the driver looks out of, with its lid thrown back.
  g.lineStyle(2.2, tint(SUB.charcoal), alpha);
  g.strokeCircle(x, y, 11.6);
  g.lineStyle(0.9, tint(X.drabHi), alpha);
  g.strokeCircle(x, y, 13);
  g.fillStyle(tint(X.drabDark), alpha);
  fillPts(g, [tf(-11, -6), tf(-11, 6), tf(-15.4, 4.6), tf(-15.4, -4.6)]);
  g.fillStyle(tint(SUB.steel), alpha);
  dot(g, tf(-11.6, -6.4), 1.1);
  dot(g, tf(-11.6, 6.4), 1.1);
  // Pintle machine gun on the ring.
  g.lineStyle(1.6, tint(SUB.ink), alpha);
  seg(g, tf(8, -10.6), tf(19, -11.6));
  g.fillStyle(tint(SUB.graphite), alpha);
  box(g, tf, 7, -12.4, 11.6, -9);

  // Muzzle flash, for the instant after the shot.
  if (rc > 0.8) {
    const k = (rc - 0.8) / 0.2;
    const mx = 55 - back;
    g.fillStyle(tint(SUB.flame), alpha * 0.8 * k);
    fillPts(g, [tf(mx, -3), tf(mx + 5, -12 * k - 3), tf(mx + 6, -2)]);
    fillPts(g, [tf(mx, 3), tf(mx + 5, 12 * k + 3), tf(mx + 6, 2)]);
    g.fillStyle(tint(SUB.gold), alpha * k);
    fillPts(g, [tf(mx, -3.4), tf(mx + 14 + 14 * k, 0), tf(mx, 3.4)]);
    g.fillStyle(tint(SUB.white), alpha * k);
    dot(g, tf(mx + 3, 0), 3 + 3 * k);
    g.fillStyle(tint(SUB.ash), alpha * 0.35 * k);
    dot(g, tf(mx + 10, -7), 5);
    dot(g, tf(mx + 10, 7), 5);
  }
}

/**
 * Chassis, wheels/treads, bodywork and ground shadow — everything BELOW the driver. Drawn
 * rotated by `heading` (0 = facing +x) about the vehicle centre (x,y).
 */
export function drawRide(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn, kind: RideKind,
  x: number, y: number, heading: number, t: number, alpha: number, look: RideLook,
): void {
  const at = frame(x, y, heading);
  const house = look.enemy ? SUB.wine : SUB.blood;
  rideShadow(g, tint, kind, x, y, heading, alpha);
  if (kind === 'car') carBase(g, tint, at, x, y, heading, t, alpha, look, house);
  else if (kind === 'bike') bikeBase(g, tint, at, heading, t, alpha, look, house);
  else if (kind === 'sports') sportsBase(g, tint, at, heading, t, alpha, look, look.enemy ? SUB.wine : SUB.crimson);
  else tankBase(g, tint, at, t, alpha, look, house);
  scorch(g, tint, at, kind, look.hpRatio, alpha);
}

/**
 * Everything ABOVE the driver: car/sports = windshield frame and pillars (the cabin stays open so
 * the driver's orb shows), bike = handlebars and headlamp, tank = the whole turret and barrel
 * (turned to `look.turret`, pulled back by `look.recoil`) with a hatch ring the driver peeks
 * through. Engine smoke and flames ride on this layer too.
 */
export function drawRideTop(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn, kind: RideKind,
  x: number, y: number, heading: number, t: number, alpha: number, look: RideLook,
): void {
  const at = frame(x, y, heading);
  const house = look.enemy ? SUB.wine : SUB.blood;
  if (kind === 'car') carTop(g, tint, at, alpha, house);
  else if (kind === 'bike') bikeTop(g, tint, at, heading, alpha, look);
  else if (kind === 'sports') sportsTop(g, tint, at, alpha);
  else tankTop(g, tint, x, y, t, alpha, look, house);
  burning(g, tint, at, kind, look.hpRatio, t, alpha);
}

// ── Around the rides ──────────────────────────────────────────────────────

/** A small HP bar under a vehicle: centred at (x,y), width w, ratio 0..1 (gold, going crimson when low), black backing. */
export function drawRideHp(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn,
  x: number, y: number, w: number, ratio: number, alpha: number,
): void {
  const r = clamp01(ratio);
  const h = 4;
  const x0 = x - w / 2;
  g.fillStyle(tint(SUB.ink), alpha * 0.9);
  g.fillRoundedRect(x0 - 1.5, y - h / 2 - 1.5, w + 3, h + 3, 2);
  g.fillStyle(tint(SUB.slate), alpha);
  g.fillRect(x0, y - h / 2, w, h);
  if (r > 0) {
    const col = r > 0.5 ? SUB.gold : r > 0.25 ? SUB.rust : SUB.crimson;
    g.fillStyle(tint(col), alpha);
    g.fillRect(x0, y - h / 2, w * r, h);
    g.fillStyle(tint(SUB.white), alpha * 0.35);
    g.fillRect(x0, y - h / 2, w * r, 1.2);
    g.fillStyle(tint(SUB.ink), alpha * 0.3);
    g.fillRect(x0, y + h / 2 - 1, w * r, 1);
  }
  // Quarter ticks, and a brass cap each end.
  g.fillStyle(tint(SUB.ink), alpha * 0.7);
  for (let i = 1; i < 4; i++) g.fillRect(x0 + (w * i) / 4 - 0.5, y - h / 2, 1, h);
  g.fillStyle(tint(SUB.brass), alpha);
  g.fillRect(x0 - 1.5, y - h / 2 - 0.5, 1.5, h + 1);
  g.fillRect(x0 + w, y - h / 2 - 0.5, 1.5, h + 1);
}

/** A tank shell in flight at (x,y) along `angle`: brass shell, bright tracer tail, smoke. */
export function drawShell(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn,
  x: number, y: number, angle: number, t: number, alpha: number,
): void {
  const at = frame(x, y, angle);
  // Smoke corkscrewing off the tail.
  for (let i = 0; i < 4; i++) {
    const p = (t * 2.6 + i / 4) % 1;
    g.fillStyle(tint(i % 2 === 0 ? SUB.ash : SUB.ashDark), alpha * (1 - p) * 0.4);
    dot(g, at(-12 - p * 26, Math.sin(t * 12 + i * 1.9) * 3 * p), 1.8 + p * 3.6);
  }
  // Tracer: a wide ember wedge, a gold blade, a white core.
  const fl = 1 + Math.sin(t * 50) * 0.12;
  g.fillStyle(tint(SUB.ember), alpha * 0.45);
  fillPts(g, [at(-5, -3.6), at(-34 * fl, 0), at(-5, 3.6)]);
  g.fillStyle(tint(SUB.gold), alpha * 0.85);
  fillPts(g, [at(-5, -2.2), at(-24 * fl, 0), at(-5, 2.2)]);
  g.fillStyle(tint(SUB.white), alpha * 0.9);
  fillPts(g, [at(-5, -1), at(-13 * fl, 0), at(-5, 1)]);
  g.fillStyle(tint(SUB.gold), alpha * 0.2);
  g.fillCircle(x, y, 9);
  // The shell: brass body, driving band, steel ogive, a glint.
  g.fillStyle(tint(SUB.ink), alpha * 0.6);
  fillPts(g, [at(-6.6, -3.2), at(3, -3.2), at(10.4, 0), at(3, 3.2), at(-6.6, 3.2)]);
  g.fillStyle(tint(SUB.brass), alpha);
  box(g, at, -6, -2.5, 2.6, 2.5);
  g.fillStyle(tint(SUB.gold), alpha);
  box(g, at, -6, -2.5, 2.6, -0.6);
  g.fillStyle(tint(SUB.rust), alpha);
  box(g, at, -1.4, -2.7, 0.2, 2.7);
  g.fillStyle(tint(SUB.steel), alpha);
  fillPts(g, [at(2.6, -2.5), at(9.6, 0), at(2.6, 2.5)]);
  g.fillStyle(tint(SUB.steelHi), alpha);
  fillPts(g, [at(2.6, -2.5), at(9.6, 0), at(2.6, -0.8)]);
  g.fillStyle(tint(SUB.ember), alpha);
  dot(g, at(-6.4, 0), 1.6);
}

/** A tiny top-down silhouette of one ride, nose to the right, about 2·s long. */
function miniRide(g: G, kind: RideKind, cx: number, cy: number, s: number, body: number, dark: number, a: number): void {
  if (kind === 'car') {
    g.fillStyle(dark, a);
    g.fillRect(cx - s * 0.72, cy - s * 0.62, s * 0.34, s * 1.24);
    g.fillRect(cx + s * 0.36, cy - s * 0.62, s * 0.34, s * 1.24);
    g.fillStyle(body, a);
    g.fillRoundedRect(cx - s * 0.95, cy - s * 0.46, s * 1.25, s * 0.92, s * 0.16);
    g.fillRect(cx + s * 0.2, cy - s * 0.28, s * 0.75, s * 0.56);
    g.fillStyle(dark, a);
    g.fillRect(cx - s * 0.5, cy - s * 0.3, s * 0.5, s * 0.6);
  } else if (kind === 'bike') {
    g.fillStyle(dark, a);
    g.fillRect(cx - s * 0.98, cy - s * 0.15, s * 0.52, s * 0.3);
    g.fillRect(cx + s * 0.5, cy - s * 0.15, s * 0.48, s * 0.3);
    g.fillStyle(body, a);
    g.fillRect(cx - s * 0.56, cy - s * 0.2, s * 1.12, s * 0.4);
    g.fillRect(cx + s * 0.34, cy - s * 0.6, s * 0.16, s * 1.2);
  } else if (kind === 'sports') {
    g.fillStyle(dark, a);
    g.fillRect(cx - s * 0.7, cy - s * 0.64, s * 0.36, s * 1.28);
    g.fillRect(cx + s * 0.38, cy - s * 0.64, s * 0.36, s * 1.28);
    g.fillStyle(body, a);
    fillPts(g, [
      { x: cx + s, y: cy - s * 0.2 }, { x: cx + s, y: cy + s * 0.2 }, { x: cx + s * 0.5, y: cy + s * 0.5 },
      { x: cx - s * 0.5, y: cy + s * 0.5 }, { x: cx - s, y: cy + s * 0.12 }, { x: cx - s, y: cy - s * 0.12 },
      { x: cx - s * 0.5, y: cy - s * 0.5 }, { x: cx + s * 0.5, y: cy - s * 0.5 },
    ]);
    g.fillStyle(dark, a);
    g.fillRect(cx - s * 0.3, cy - s * 0.26, s * 0.44, s * 0.52);
  } else {
    g.fillStyle(dark, a);
    g.fillRect(cx - s, cy - s * 0.72, s * 2, s * 0.3);
    g.fillRect(cx - s, cy + s * 0.42, s * 2, s * 0.3);
    g.fillStyle(body, a);
    g.fillRect(cx - s * 0.9, cy - s * 0.46, s * 1.75, s * 0.92);
    g.fillRect(cx + s * 0.1, cy - s * 0.09, s * 1.05, s * 0.18);
    g.fillStyle(dark, a);
    g.fillCircle(cx - s * 0.12, cy, s * 0.34);
  }
}

const TIER_KINDS: RideKind[] = ['car', 'bike', 'sports', 'tank'];

/**
 * The Hijack charge-up shown over the player's head while the key is held: four slots in an arc
 * (car, bike, sports, tank), each a tiny top-down silhouette with 1..4 banknote pips under it.
 * Slots up to `tier` are lit gold and the slot at `tier` is enlarged; slots past `afford` are
 * greyed and crossed out; `frac` 0..1 is progress toward the next tier, swept round its slot.
 * `tier` and `afford` are 1-based slot numbers (0 = nothing charged / nothing affordable).
 */
export function drawHijackCharge(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn,
  x: number, y: number, tier: number, afford: number, frac: number, t: number, alpha: number,
): void {
  const R = 50;
  const stepA = 0.56;
  const f = clamp01(frac);
  const angOf = (i: number): number => -Math.PI / 2 + (i - 1.5) * stepA;

  // The rail the slots hang on, lit as far as the charge has reached.
  g.lineStyle(3, tint(SUB.ink), alpha * 0.6);
  g.beginPath();
  g.arc(x, y, R, angOf(0), angOf(3), false);
  g.strokePath();
  const reach = Math.min(3, Math.max(0, tier - 1 + (tier < 4 ? f : 0)));
  if (tier >= 1 && reach > 0) {
    g.lineStyle(1.6, tint(SUB.gold), alpha * 0.9);
    g.beginPath();
    g.arc(x, y, R, angOf(0), angOf(reach), false);
    g.strokePath();
  }

  for (let i = 0; i < 4; i++) {
    const n = i + 1;
    const a = angOf(i);
    const lit = n <= tier;
    const cur = n === tier;
    const broke = n > afford;
    const next = n === tier + 1 && !broke;
    const pop = cur ? 1 + 0.06 * Math.sin(t * 7) : 1;
    const r = (cur ? 13.5 : 10) * pop;
    const cx = x + Math.cos(a) * R, cy = y + Math.sin(a) * R - (cur ? 3 : 0);
    const al = alpha * (broke ? 0.6 : 1);

    if (cur) {
      g.fillStyle(tint(SUB.gold), alpha * (0.2 + 0.08 * Math.sin(t * 7)));
      g.fillCircle(cx, cy, r + 5);
    }
    g.fillStyle(tint(SUB.ink), al * 0.5);
    g.fillCircle(cx + 1, cy + 1.6, r);
    g.fillStyle(tint(lit && !broke ? SUB.slate : SUB.ink), al * 0.96);
    g.fillCircle(cx, cy, r);
    g.lineStyle(cur ? 2 : 1.2, tint(broke ? SUB.graphite : lit ? SUB.gold : SUB.ashDark), al);
    g.strokeCircle(cx, cy, r - 0.5);

    // Progress toward this slot, swept clockwise from the top.
    if (next && f > 0) {
      g.lineStyle(2.4, tint(SUB.gold), alpha);
      g.beginPath();
      g.arc(cx, cy, r + 2.2, -Math.PI / 2, -Math.PI / 2 + f * TAU, false);
      g.strokePath();
      const ha = -Math.PI / 2 + f * TAU;
      g.fillStyle(tint(SUB.white), alpha);
      g.fillCircle(cx + Math.cos(ha) * (r + 2.2), cy + Math.sin(ha) * (r + 2.2), 1.5);
    }

    const body = tint(broke ? SUB.ashDark : lit ? SUB.gold : SUB.ash);
    const dark = tint(broke ? SUB.graphite : lit ? SUB.brass : SUB.ashDark);
    miniRide(g, TIER_KINDS[i], cx, cy - r * 0.16, r * 0.62, body, dark, al);

    // The price: n notes in a row along the bottom of the disc.
    const pw = r * 0.26, gap = r * 0.08;
    const total = n * pw + (n - 1) * gap;
    for (let k = 0; k < n; k++) {
      const px = cx - total / 2 + k * (pw + gap);
      g.fillStyle(tint(broke ? SUB.ashDark : SUB.paper), al);
      g.fillRect(px, cy + r * 0.42, pw, r * 0.2);
      g.fillStyle(tint(broke ? SUB.graphite : SUB.olive), al);
      g.fillRect(px + pw * 0.34, cy + r * 0.42, pw * 0.32, r * 0.2);
    }

    if (broke) {
      // Cannot pay: struck out.
      g.lineStyle(1.6, tint(SUB.wine), alpha * 0.95);
      g.lineBetween(cx - r * 0.62, cy - r * 0.62, cx + r * 0.62, cy + r * 0.62);
      g.lineBetween(cx + r * 0.62, cy - r * 0.62, cx - r * 0.62, cy + r * 0.62);
    }
  }
}

/** "Press SPACE" without text: a small keycap with a wide spacebar glyph, bobbing above (x,y) and tapping itself. */
export function drawSpaceHint(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn,
  x: number, y: number, t: number, alpha: number,
): void {
  const bob = Math.sin(t * 3) * 2;
  const w = 34, h = 13;
  const kx = x - w / 2, ky = y - 26 + bob;
  // A tap every beat: the cap sinks into its base.
  const beat = (t * 1.6) % 1;
  const press = beat < 0.22 ? Math.sin((beat / 0.22) * Math.PI) * 2.2 : 0;

  // Pointer down to the thing it is about.
  g.fillStyle(tint(SUB.gold), alpha * 0.9);
  g.fillTriangle(x - 3.6, ky + h + 3, x + 3.6, ky + h + 3, x, ky + h + 7.6);
  // Shadow, base, cap.
  g.fillStyle(tint(SUB.ink), alpha * 0.45);
  g.fillRoundedRect(kx + 1, ky + 3, w, h, 3.4);
  g.fillStyle(tint(SUB.charcoal), alpha);
  g.fillRoundedRect(kx, ky, w, h + 1.6, 3.4);
  g.lineStyle(1, tint(SUB.brass), alpha);
  g.strokeRoundedRect(kx, ky, w, h + 1.6, 3.4);
  g.fillStyle(tint(SUB.paperShade), alpha);
  g.fillRoundedRect(kx + 1.6, ky - 1.4 + press, w - 3.2, h - 1.2, 2.8);
  g.fillStyle(tint(SUB.paper), alpha);
  g.fillRoundedRect(kx + 2.4, ky - 1.8 + press, w - 4.8, h - 3.4, 2.4);
  g.fillStyle(tint(SUB.white), alpha * 0.7);
  g.fillRect(kx + 5, ky - 0.8 + press, w - 10, 1.1);
  // The spacebar glyph: a wide open-topped bracket.
  const gy = ky + 3.4 + press;
  g.lineStyle(1.7, tint(SUB.ink), alpha);
  strokePts(g, [{ x: x - 9.5, y: gy }, { x: x - 9.5, y: gy + 3.4 }, { x: x + 9.5, y: gy + 3.4 }, { x: x + 9.5, y: gy }]);
  // The press ripples out.
  if (beat < 0.5) {
    const p = beat / 0.5;
    g.lineStyle(1.2, tint(SUB.gold), alpha * (1 - p) * 0.7);
    g.strokeRoundedRect(kx - p * 5, ky - 2 - p * 4, w + p * 10, h + 4 + p * 8, 4 + p * 3);
  }
}
