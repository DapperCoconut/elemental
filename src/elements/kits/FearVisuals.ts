import Phaser from 'phaser';
import { ArmGesture, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Fear's drawing kit: a gentleman in a smiling mask, and what is behind the mask.
 *
 * The primitive is the **black tentacle** — a tapered, curling limb with a wet highlight down
 * one side. The phobia's lapel knot, the mass behind the open mask, the claw's talons, the
 * wisps a dying phobia leaves, the shadows under a frozen fighter and the jumpscare's whole
 * backdrop are all built from it. Its two companions are the **mask half** (one side of a
 * comedy mask, hinged at the chin so it can swing open) and the **eyeball**.
 */

export type FearColorFn = ColorFn;
type G = Phaser.GameObjects.Graphics;

const F = Object.freeze({
  ink: 0x050506,
  suitDeep: 0x121317,
  suit: 0x24262d,
  suitLit: 0x3f4350,
  shirt: 0xf7f5ee,
  bone: 0xf1ede0,
  boneDim: 0xc2bcaa,
  boneShade: 0x837d6c,
  rose: 0xfbf8f0,
  leaf: 0x3f5a3a,
  blood: 0xb3121f,
  bloodDeep: 0x5c0710,
  bloodHot: 0xff3b46,
  lamp: 0xe8d36a,
  lampHot: 0xfff6b8,
  lampSick: 0x9aa23c,
  rune: 0xff8a1f,
  runeHot: 0xffd58a,
  runeDeep: 0x7a2f05,
  ash: 0x8d8f96,
  ashDeep: 0x3a3b41,
  tentacle: 0x0b0a10,
  tentacleLit: 0x3a3350,
  gum: 0x7a1a2c,
  maw: 0x1c0408,
  tooth: 0xeae2c6,
  marble: 0xe8e6e2,
  marbleShade: 0xaeadb2,
  marbleVein: 0x6f7684,
  stone: 0x4b4b54,
  stoneLit: 0x7c7c90,
  stoneDeep: 0x26262c,
  steel: 0xb4bcc5,
  steelLit: 0xeef3f7,
  steelDeep: 0x5a626c,
  jacket: 0x2e3528,
  jacketLit: 0x4c5742,
  stain: 0x4a1a12,
  sweat: 0xa9d4e6,
});

/** Fear's palette. Every colour drawn by this file is one of these, passed through the owner's `tint`. */
export const FEAR: { readonly [k: string]: number } = F;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Deterministic 0..1 noise — art that must not boil from frame to frame is seeded with this. */
const hash = (seed: number, i: number): number => {
  const s = Math.sin(seed * 127.1 + i * 311.7 + 17.3) * 43758.5453;
  return s - Math.floor(s);
};

/** Fill a flat `[x0, y0, x1, y1, ...]` polygon (and outline it if a line style is wanted). */
function poly(g: G, p: number[], stroke = false): void {
  g.beginPath();
  g.moveTo(p[0], p[1]);
  for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
  g.closePath();
  g.fillPath();
  if (stroke) g.strokePath();
}

function wedge(g: G, x: number, y: number, r: number, a0: number, a1: number): void {
  g.slice(x, y, r, a0, a1, false);
  g.fillPath();
}

/** A slice of a ring between two radii. */
function arcBand(g: G, x: number, y: number, r0: number, r1: number, a0: number, a1: number): void {
  const n = Math.max(3, Math.ceil(Math.abs(a1 - a0) * 8));
  const p: number[] = [];
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; p.push(x + Math.cos(a) * r1, y + Math.sin(a) * r1); }
  for (let i = n; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / n; p.push(x + Math.cos(a) * r0, y + Math.sin(a) * r0); }
  poly(g, p);
}

function arcLine(g: G, x: number, y: number, r: number, a0: number, a1: number): void {
  g.beginPath();
  g.arc(x, y, r, a0, a1, a1 < a0);
  g.strokePath();
}

/**
 * The primitive. A tapered limb from `(x, y)` heading `ang`, bending through `curl` radians by
 * its tip, with a root bulb so a cluster of them reads as one mass. Returns the tip.
 */
export function tentacle(
  g: G, x: number, y: number, ang: number, len: number, w: number, curl: number,
  color: number, alpha: number, lit?: number,
): { x: number; y: number } {
  const n = len > 90 ? 12 : 7;
  const L: number[] = [];
  const R: number[] = [];
  const spine: number[] = [];
  let px = x;
  let py = y;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const a = ang + curl * u * u;
    const hw = (w / 2) * Math.pow(1 - u, 0.8) + 0.35;
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    L.push(px + nx * hw, py + ny * hw);
    R.push(px - nx * hw, py - ny * hw);
    spine.push(px + nx * hw * 0.45, py + ny * hw * 0.45);
    if (i < n) { px += Math.cos(a) * (len / n); py += Math.sin(a) * (len / n); }
  }
  const p = L.slice();
  for (let i = n; i >= 0; i--) p.push(R[i * 2], R[i * 2 + 1]);
  g.fillStyle(color, alpha);
  g.fillCircle(x, y, w / 2);
  poly(g, p);
  if (lit !== undefined) {
    g.lineStyle(Math.max(0.8, w * 0.12), lit, alpha * 0.7);
    g.beginPath();
    g.moveTo(spine[0], spine[1]);
    for (let i = 1; i < n; i++) g.lineTo(spine[i * 2], spine[i * 2 + 1]);
    g.strokePath();
  }
  return { x: px, y: py };
}

/** A jagged crack with one fork, fixed by its seed. */
function crack(g: G, x: number, y: number, ang: number, len: number, seed: number, color: number, alpha: number, w: number, fork = true): void {
  const n = 5;
  g.lineStyle(w, color, alpha);
  g.beginPath();
  g.moveTo(x, y);
  let px = x;
  let py = y;
  let mx = x;
  let my = y;
  for (let i = 1; i <= n; i++) {
    const a = ang + (hash(seed, i) - 0.5) * 1.3;
    px += (Math.cos(a) * len) / n;
    py += (Math.sin(a) * len) / n;
    g.lineTo(px, py);
    if (i === 2) { mx = px; my = py; }
  }
  g.strokePath();
  if (fork) crack(g, mx, my, ang + (hash(seed, 9) > 0.5 ? 0.85 : -0.85), len * 0.45, seed + 7.7, color, alpha * 0.85, w * 0.7, false);
}

/** A flying droplet: fat head, thin tail trailing back along `ang`. */
function droplet(g: G, x: number, y: number, ang: number, r: number, tail: number, color: number, alpha: number): void {
  const nx = -Math.sin(ang) * r * 0.85;
  const ny = Math.cos(ang) * r * 0.85;
  g.fillStyle(color, alpha);
  g.fillTriangle(x + nx, y + ny, x - nx, y - ny, x - Math.cos(ang) * tail, y - Math.sin(ang) * tail);
  g.fillCircle(x, y, r);
}

/** A ragged pool: an ellipse whose rim is pushed in and out by its seed. */
function blob(g: G, x: number, y: number, rx: number, ry: number, seed: number, rough: number): void {
  const n = 16;
  const p: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const k = 1 + (hash(seed, i) - 0.5) * rough;
    p.push(x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k);
  }
  poly(g, p);
}

/**
 * An eye. `lookAmt` 0 stares straight out of the screen, 1 rolls the iris hard toward
 * `lookAng`. `shot` 0..1 is how bloodshot, `pupil` 0..1 how dilated.
 */
function eyeball(
  g: G, tint: FearColorFn, x: number, y: number, r: number, lookAng: number, lookAmt: number,
  alpha: number, shot: number, pupil: number, sclera: number = F.bone, iris: number = F.lamp,
): void {
  const big = r > 10;
  g.fillStyle(tint(F.boneShade), alpha);
  g.fillCircle(x, y, r);
  g.fillStyle(tint(sclera), alpha);
  g.fillCircle(x - r * 0.04, y - r * 0.05, r * 0.94);
  if (shot > 0.01) {
    g.fillStyle(tint(F.blood), alpha * 0.14 * shot);
    g.fillCircle(x, y, r * 0.94);
    const n = big ? 18 : 5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + hash(r, i) * 0.5;
      crack(g, x + Math.cos(a) * r * 0.96, y + Math.sin(a) * r * 0.96, a + Math.PI, r * (0.3 + 0.38 * hash(i, 3)) * shot,
        i * 3.1 + 1, tint(i % 3 ? F.blood : F.bloodHot), alpha * 0.85, Math.max(0.7, r * 0.022), big);
    }
  }
  const ix = x + Math.cos(lookAng) * r * 0.34 * lookAmt;
  const iy = y + Math.sin(lookAng) * r * 0.34 * lookAmt;
  const ir = r * 0.52;
  g.fillStyle(tint(F.lampSick), alpha);
  g.fillCircle(ix, iy, ir);
  g.fillStyle(tint(iris), alpha);
  g.fillCircle(ix, iy, ir * 0.84);
  const pr = ir * (0.22 + 0.5 * pupil);
  if (big) {
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * TAU + hash(i, 5) * 0.2;
      g.lineStyle(Math.max(1, r * 0.018), tint(i % 2 ? F.lampSick : F.runeDeep), alpha * 0.6);
      g.lineBetween(ix + Math.cos(a) * pr, iy + Math.sin(a) * pr, ix + Math.cos(a) * ir * (0.7 + 0.26 * hash(i, 8)), iy + Math.sin(a) * ir * (0.7 + 0.26 * hash(i, 8)));
    }
    g.lineStyle(r * 0.03, tint(F.lampHot), alpha * 0.6);
    g.strokeCircle(ix, iy, pr * 1.12);
  }
  g.lineStyle(Math.max(0.8, r * 0.05), tint(F.ink), alpha * 0.85);
  g.strokeCircle(ix, iy, ir);
  g.fillStyle(tint(F.ink), alpha);
  g.fillCircle(ix, iy, pr);
  g.fillStyle(tint(F.shirt), alpha * 0.9);
  g.fillCircle(ix - ir * 0.42, iy - ir * 0.46, Math.max(0.6, r * 0.09));
  if (big) g.fillCircle(ix + ir * 0.3, iy + ir * 0.5, r * 0.04);
}

/** Where a point on a mask half ends up: squashed toward the split, then swung about the chin hinge. */
function maskXf(cx: number, cy: number, side: number, ry: number, rot: number, squash: number): (lx: number, ly: number) => [number, number] {
  const c = Math.cos(side * rot);
  const s = Math.sin(side * rot);
  return (lx, ly) => {
    const x = side * lx * squash;
    const y = ly - ry;
    return [cx + x * c - y * s, cy + ry + x * s + y * c];
  };
}

/**
 * One side of the comedy mask: half an oval with an arched, laughing eye and half a crescent
 * smile. `rot` swings it outward about the chin; `jag` breaks the split edge.
 */
function maskHalf(
  g: G, cx: number, cy: number, side: number, rx: number, ry: number, rot: number, squash: number, jag: number,
  mask: number, shade: number, dark: number, alpha: number,
): void {
  const X = maskXf(cx, cy, side, ry, rot, squash);
  const p: number[] = [];
  const push = (lx: number, ly: number): void => { const q = X(lx, ly); p.push(q[0], q[1]); };
  // Split edge, top to bottom.
  for (let i = 0; i <= 6; i++) push(i === 0 || i === 6 ? 0 : jag * (hash(side + 2, i) - 0.25) * (i % 2 ? 1.6 : -0.6), -ry + (2 * ry * i) / 6);
  // Outer rim, chin back up to the brow. The jaw is a touch narrower than the brow.
  for (let i = 1; i < 12; i++) {
    const a = Math.PI / 2 - (Math.PI * i) / 12;
    push(Math.cos(a) * rx * (a > 0 ? 0.9 : 1), Math.sin(a) * ry);
  }
  g.fillStyle(mask, alpha);
  g.lineStyle(Math.max(1, rx * 0.07), shade, alpha);
  poly(g, p, true);
  // Brow light and cheek shadow.
  g.fillStyle(shade, alpha * 0.35);
  const c1 = X(rx * 0.55, ry * 0.2);
  g.fillCircle(c1[0], c1[1], rx * 0.26);
  // The laughing eye: an arch.
  const e: number[] = [];
  const ex = rx * 0.46;
  const ey = -ry * 0.2;
  const ew = rx * 0.27;
  const eh = ry * 0.2;
  for (let i = 0; i <= 8; i++) { const a = Math.PI + (Math.PI * i) / 8; const q = X(ex + Math.cos(a) * ew, ey + Math.sin(a) * eh); e.push(q[0], q[1]); }
  for (let i = 8; i >= 0; i--) { const a = Math.PI + (Math.PI * i) / 8; const q = X(ex + Math.cos(a) * ew * 0.98, ey + Math.sin(a) * eh * 0.38); e.push(q[0], q[1]); }
  g.fillStyle(dark, alpha);
  poly(g, e);
  // Half the smile, corner turned up.
  const m: number[] = [];
  for (let i = 0; i <= 6; i++) { const u = i / 6; const q = X(u * rx * 0.64, ry * (0.54 - 0.22 * u * u)); m.push(q[0], q[1]); }
  for (let i = 6; i >= 0; i--) { const u = i / 6; const q = X(u * rx * 0.64, ry * (0.36 - 0.04 * u * u)); m.push(q[0], q[1]); }
  poly(g, m);
}

interface FigureStyle {
  suit: number; suitLit: number; shirt: number; mask: number; maskShade: number; dark: number; glove: number;
  alpha: number; look: number; gaze: number; wisps: boolean; knotEye: number; knotIris: number;
}

/**
 * The phobia's silhouette — the Fear user's suit and mask, standing taller, a knot of tentacles
 * with an eye where the rose should be. Shared by the ghost and by its marble statue. Returns
 * the centre of the mask.
 */
function figure(g: G, tint: FearColorFn, x: number, y: number, t: number, seed: number, s: FigureStyle): { hx: number; hy: number } {
  const a = s.alpha;
  const suit = tint(s.suit);
  const lit = tint(s.suitLit);
  if (s.wisps) {
    for (let i = 0; i < 5; i++) {
      tentacle(g, x + (i - 2) * 6, y + 6, Math.PI / 2 + Math.sin(t * 2 + i + seed) * 0.28, 17 + hash(seed, i) * 9, 10,
        Math.sin(t * 1.7 + i * 2.1 + seed) * 0.9, suit, a * 0.8);
    }
  } else {
    g.fillStyle(suit, a);
    poly(g, [x - 13, y + 5, x + 13, y + 5, x + 17, y + 18, x - 17, y + 18]);
    g.lineStyle(1, lit, a * 0.7);
    for (let i = -1; i <= 1; i++) g.lineBetween(x + i * 6, y + 9, x + i * 8.5, y + 18);
  }
  // Sleeves and gloves hanging at the sides.
  const sway = s.wisps ? Math.sin(t * 2.3 + seed) * 1.2 : 0;
  for (const sd of [-1, 1]) {
    g.fillStyle(suit, a);
    g.fillEllipse(x + sd * 17, y - 1 + sway * sd, 9, 21);
    g.fillStyle(tint(s.glove), a);
    g.fillCircle(x + sd * 17.5, y + 10 + sway * sd, 3.6);
  }
  // Torso, shoulders.
  g.fillStyle(suit, a);
  poly(g, [x - 16, y - 12, x + 16, y - 12, x + 13, y + 9, x - 13, y + 9]);
  g.fillCircle(x - 13.5, y - 9, 5.2);
  g.fillCircle(x + 13.5, y - 9, 5.2);
  // Shirt, lapels, bow tie.
  g.fillStyle(tint(s.shirt), a);
  g.fillTriangle(x - 5, y - 13, x + 5, y - 13, x, y);
  g.fillStyle(lit, a);
  poly(g, [x - 5, y - 13, x - 11, y - 11, x - 2.5, y + 3, x, y]);
  poly(g, [x + 5, y - 13, x + 11, y - 11, x + 2.5, y + 3, x, y]);
  g.fillStyle(tint(s.dark), a);
  g.fillTriangle(x, y - 11, x - 4, y - 13.2, x - 4, y - 8.8);
  g.fillTriangle(x, y - 11, x + 4, y - 13.2, x + 4, y - 8.8);
  g.fillCircle(x, y + 5, 0.9);
  // Head.
  g.fillStyle(suit, a);
  g.fillCircle(x, y - 22, 11.5);
  const hx = x + Math.cos(s.look) * 1.6;
  const hy = y - 22 + Math.sin(s.look) * 1.2;
  const gz = clamp01(s.gaze);
  if (gz > 0.02) {
    // What the mask was hiding.
    const mr = 6.5 + 5 * gz;
    g.fillStyle(tint(F.gum), a);
    g.fillCircle(hx, hy, mr + 1.2);
    g.fillStyle(tint(F.maw), a);
    g.fillCircle(hx, hy, mr);
    for (let i = 0; i < 7; i++) {
      const ta = (i / 7) * TAU + Math.sin(t * 3 + i) * 0.3;
      tentacle(g, hx + Math.cos(ta) * mr * 0.7, hy + Math.sin(ta) * mr * 0.7, ta, (7 + 11 * hash(seed, i + 20)) * gz, 3.4,
        Math.sin(t * 4.3 + i * 1.9) * 1.4, tint(F.tentacle), a, tint(F.tentacleLit));
    }
    g.fillStyle(tint(F.tooth), a);
    const tn = 11;
    for (let i = 0; i < tn; i++) {
      const ta = (i / tn) * TAU + t * 0.8;
      const bw = 0.2;
      g.fillTriangle(hx + Math.cos(ta - bw) * mr, hy + Math.sin(ta - bw) * mr, hx + Math.cos(ta + bw) * mr, hy + Math.sin(ta + bw) * mr,
        hx + Math.cos(ta) * mr * 0.58, hy + Math.sin(ta) * mr * 0.58);
    }
    eyeball(g, tint, hx, hy, 2 + 3.8 * gz, s.look, 0.8, a, 1, 0.3 + 0.3 * Math.sin(t * 5));
  }
  const maskC = tint(s.mask);
  const shade = tint(s.maskShade);
  const dark = tint(s.dark);
  for (const sd of [-1, 1]) {
    maskHalf(g, hx + sd * gz * 5.5, hy, sd, 9.5, 11, gz * 0.85, 1 - 0.4 * gz, gz * 1.4, maskC, shade, dark, a);
  }
  // The knot on the lapel: tentacles round an eye that follows whoever it is looking at.
  const kx = x - 9;
  const ky = y - 4;
  for (let i = 0; i < 7; i++) {
    const ka = (i / 7) * TAU + (s.wisps ? Math.sin(t * 1.6 + i) * 0.25 : 0);
    tentacle(g, kx, ky, ka, 6.5 + 3 * hash(seed, i + 40), 2.8, (s.wisps ? Math.sin(t * 3.1 + i * 2.3) : hash(seed, i + 50) - 0.5) * 1.8, dark, a);
  }
  g.fillStyle(tint(s.knotEye), a);
  g.fillCircle(kx, ky, 3.2);
  g.fillStyle(tint(s.knotIris), a);
  g.fillCircle(kx + Math.cos(s.look) * 1.1, ky + Math.sin(s.look) * 1.1, 1.9);
  g.fillStyle(dark, a);
  g.fillCircle(kx + Math.cos(s.look) * 1.5, ky + Math.sin(s.look) * 1.5, 1);
  return { hx, hy };
}

// ── World-space painters ─────────────────────────────────────────────────────

/** A phobia: the ghost of the gentleman. `gaze` swings the mask open; `claw` 0..1 is a slash in progress (-1 = none). */
export function drawPhobia(
  g: G, tint: FearColorFn, x: number, y: number, t: number,
  o: { look: number; gaze: number; claw: number; clawAng: number; alpha: number; seed: number },
): void {
  if (o.alpha <= 0.01) return;
  const bob = Math.sin(t * 1.8 + o.seed) * 2;
  const a = o.alpha * (0.72 + 0.06 * Math.sin(t * 3.3 + o.seed));
  // It has no feet. Something darker pools where they would be.
  g.fillStyle(tint(F.ink), o.alpha * 0.4);
  g.fillEllipse(x, y + 26, 38 + bob, 10);
  g.fillStyle(tint(F.ink), o.alpha * 0.14);
  g.fillCircle(x, y - 6 + bob, 34);
  figure(g, tint, x, y + bob, t, o.seed, {
    suit: F.suit, suitLit: F.suitLit, shirt: F.boneDim, mask: F.bone, maskShade: F.boneShade, dark: F.ink, glove: F.boneDim,
    alpha: a, look: o.look, gaze: o.gaze, wisps: true, knotEye: F.bone, knotIris: F.blood,
  });
  if (o.claw >= 0) {
    const p = clamp01(o.claw);
    const reach = Math.sin(Math.PI * Math.min(1, p * 1.1 + 0.08));
    const sweep = o.clawAng + (-1 + 2 * easeOut(p)) * 0.9;
    const sx = x + Math.cos(o.clawAng) * 9;
    const sy = y - 8 + bob;
    const ca = o.alpha * Math.min(1, reach * 2.5);
    const ink = tint(F.tentacle);
    const lit = tint(F.tentacleLit);
    // The smear it leaves through the air.
    g.fillStyle(ink, ca * 0.22);
    arcBand(g, sx, sy, 34, 62 * reach + 10, o.clawAng - 0.9, sweep);
    const len = 30 + 30 * reach;
    const wrist = tentacle(g, sx, sy, sweep - 0.25, len, 13, 0.5, ink, ca, lit);
    g.fillStyle(ink, ca);
    g.fillCircle(wrist.x, wrist.y, 7.5);
    for (let i = 0; i < 4; i++) {
      const fa = sweep + (i - 1.5) * 0.5;
      const tip = tentacle(g, wrist.x + Math.cos(fa) * 4, wrist.y + Math.sin(fa) * 4, fa - 0.5, 21, 6.5, 1.5, ink, ca, lit);
      g.fillStyle(tint(F.boneShade), ca * 0.8);
      g.fillCircle(tip.x, tip.y, 1);
    }
    // It drips.
    for (let i = 0; i < 7; i++) {
      const u = 0.2 + 0.8 * hash(o.seed, i + 60);
      const fall = (t * 46 + i * 9) % 22;
      const dx = sx + (wrist.x - sx) * u;
      const dy = sy + (wrist.y - sy) * u + 5;
      g.lineStyle(1.2, ink, ca * 0.7);
      g.lineBetween(dx, dy, dx, dy + fall);
      g.fillStyle(ink, ca * (1 - fall / 26));
      g.fillCircle(dx, dy + fall, 2.1 - fall * 0.04);
    }
  }
}

/** The phobia in white marble on a plinth. It bleeds from the eyes the longer it is looked at, and cracks as it is hit. */
export function drawStatue(g: G, tint: FearColorFn, x: number, y: number, t: number, o: { hp: number; bleed: number; seed: number; flash: number }): void {
  const bleed = clamp01(o.bleed);
  const hp = clamp01(o.hp);
  if (bleed > 0.01) {
    g.fillStyle(tint(F.bloodDeep), 0.85);
    blob(g, x, y + 27, 20 + 24 * bleed, 7 + 9 * bleed, o.seed, 0.35);
    g.fillStyle(tint(F.blood), 0.8);
    blob(g, x - 1, y + 27, 15 + 18 * bleed, 4.5 + 6.5 * bleed, o.seed + 3, 0.3);
    g.fillStyle(tint(F.bloodHot), 0.35);
    g.fillEllipse(x - 6 - 6 * bleed, y + 25, 8 + 6 * bleed, 2.2);
  } else {
    g.fillStyle(tint(F.ink), 0.4);
    g.fillEllipse(x, y + 27, 46, 12);
  }
  // Plinth: a stepped block with a lit top face.
  g.fillStyle(tint(F.stoneDeep), 1);
  poly(g, [x - 21, y + 20, x + 21, y + 20, x + 23, y + 29, x - 23, y + 29]);
  g.fillStyle(tint(F.stone), 1);
  poly(g, [x - 18, y + 15, x + 18, y + 15, x + 20, y + 24, x - 20, y + 24]);
  g.fillStyle(tint(F.stoneLit), 1);
  g.fillEllipse(x, y + 16, 37, 6);
  g.lineStyle(1, tint(F.stoneDeep), 0.8);
  g.lineBetween(x - 19, y + 20, x + 19, y + 20);
  const m = figure(g, tint, x, y - 2, t, o.seed, {
    suit: F.marble, suitLit: F.marbleShade, shirt: F.marbleShade, mask: F.marble, maskShade: F.marbleShade, dark: F.marbleVein, glove: F.marbleShade,
    alpha: 1, look: Math.PI / 2, gaze: 0, wisps: false, knotEye: F.marble, knotIris: bleed > 0.5 ? F.blood : F.marbleShade,
  });
  // Shade down one side so it reads as carved, then the veins.
  g.fillStyle(tint(F.marbleVein), 0.16);
  poly(g, [x + 4, y - 14, x + 16, y - 14, x + 17, y + 16, x + 8, y + 16]);
  for (let i = 0; i < 6; i++) {
    crack(g, x - 14 + hash(o.seed, i + 70) * 28, y - 30 + hash(o.seed, i + 80) * 42, hash(o.seed, i + 90) * TAU, 9 + hash(o.seed, i) * 8,
      o.seed + i, tint(F.marbleVein), 0.5, 0.8, false);
  }
  // Damage.
  const cracks = Math.round((1 - hp) * 8);
  for (let i = 0; i < cracks; i++) {
    crack(g, x - 13 + hash(o.seed + 5, i) * 26, y - 32 + hash(o.seed + 6, i) * 44, hash(o.seed + 7, i) * TAU, 10 + hash(o.seed + 8, i) * 12,
      o.seed + i * 2.3, tint(F.ink), 0.9, 1.5);
  }
  if (hp < 0.4) {
    g.fillStyle(tint(F.ink), 0.9);
    g.fillTriangle(x + 9, y - 33, x + 13, y - 27, x + 6, y - 29);
    g.fillTriangle(x - 17, y - 3, x - 12, y + 2, x - 18, y + 4);
    g.fillStyle(tint(F.marbleShade), 1);
    g.fillTriangle(x + 22, y + 26, x + 27, y + 29, x + 21, y + 30);
    g.fillTriangle(x - 26, y + 27, x - 22, y + 24, x - 21, y + 29);
  }
  // Blood from the eyes: down the mask, off the chin, onto the suit.
  if (bleed > 0.01) {
    for (const sd of [-1, 1]) {
      const ex = m.hx + sd * 4.4;
      const ey = m.hy - 1.6;
      const len = 6 + bleed * 34;
      g.lineStyle(1.8, tint(F.bloodDeep), 0.95);
      g.beginPath();
      g.moveTo(ex, ey);
      for (let i = 1; i <= 6; i++) g.lineTo(ex + Math.sin(i * 1.7 + o.seed + sd) * 0.9 - sd * i * 0.15, ey + (len * i) / 6);
      g.strokePath();
      g.lineStyle(0.9, tint(F.bloodHot), 0.8);
      g.lineBetween(ex, ey, ex, ey + len * 0.5);
      g.fillStyle(tint(F.blood), 1);
      g.fillCircle(ex, ey, 1.5);
      if (bleed > 0.45) {
        const fall = (t * 0.9 + (sd > 0 ? 0.5 : 0)) % 1;
        droplet(g, ex - sd * 0.9, ey + len + fall * (46 - len), Math.PI / 2, 1.5, 4, tint(F.blood), 1 - fall * 0.5);
      }
    }
  }
  if (o.flash > 0.01) {
    g.fillStyle(tint(F.shirt), o.flash * 0.5);
    g.fillEllipse(x, y - 8, 44, 62);
    g.lineStyle(2, tint(F.shirt), o.flash * 0.8);
    g.strokeEllipse(x, y - 8, 50 + (1 - o.flash) * 14, 68 + (1 - o.flash) * 14);
  }
}

/** The lamp-light that pours out of the open mask's eye. */
export function drawGazeCone(g: G, tint: FearColorFn, x: number, y: number, ang: number, halfAng: number, len: number, t: number, alpha: number): void {
  if (alpha <= 0.01) return;
  const fl = 0.86 + 0.1 * Math.sin(t * 23) + 0.04 * Math.sin(t * 57);
  const a = alpha * fl;
  g.fillStyle(tint(F.lampSick), a * 0.1);
  wedge(g, x, y, len, ang - halfAng, ang + halfAng);
  g.fillStyle(tint(F.lamp), a * 0.11);
  wedge(g, x, y, len * 0.92, ang - halfAng * 0.72, ang + halfAng * 0.72);
  g.fillStyle(tint(F.lampHot), a * 0.13);
  wedge(g, x, y, len * 0.8, ang - halfAng * 0.36, ang + halfAng * 0.36);
  // Bands of light walking out along the beam.
  for (let i = 0; i < 4; i++) {
    const f = (t * 0.55 + i / 4) % 1;
    g.lineStyle(2, tint(F.lampHot), a * 0.3 * (1 - f));
    arcLine(g, x, y, len * (0.12 + 0.88 * f), ang - halfAng, ang + halfAng);
  }
  g.lineStyle(1.5, tint(F.lamp), a * 0.55);
  g.lineBetween(x, y, x + Math.cos(ang - halfAng) * len, y + Math.sin(ang - halfAng) * len);
  g.lineBetween(x, y, x + Math.cos(ang + halfAng) * len, y + Math.sin(ang + halfAng) * len);
  // Dust caught in it.
  for (let i = 0; i < 12; i++) {
    const f = (hash(i, 1) + t * (0.05 + 0.05 * hash(i, 2))) % 1;
    const da = ang + (hash(i, 3) - 0.5) * 2 * halfAng * 0.9 + Math.sin(t * 1.3 + i) * 0.03;
    g.fillStyle(tint(F.lampHot), a * 0.6 * Math.sin(Math.PI * f));
    g.fillCircle(x + Math.cos(da) * len * f, y + Math.sin(da) * len * f, 1 + hash(i, 4) * 1.3);
  }
  g.fillStyle(tint(F.lampHot), a * 0.7);
  g.fillCircle(x, y, 5);
}

/** The claw's reach on the floor. `k` is its strength: ramp it up as a telegraph, down as an afterimage. */
export function drawGraspCone(g: G, tint: FearColorFn, x: number, y: number, ang: number, halfAng: number, range: number, k: number): void {
  k = clamp01(k);
  if (k <= 0.01) return;
  g.fillStyle(tint(F.ink), 0.2 * k);
  wedge(g, x, y, range, ang - halfAng, ang + halfAng);
  g.lineStyle(1.5, tint(F.ashDeep), 0.7 * k);
  g.lineBetween(x, y, x + Math.cos(ang - halfAng) * range, y + Math.sin(ang - halfAng) * range);
  g.lineBetween(x, y, x + Math.cos(ang + halfAng) * range, y + Math.sin(ang + halfAng) * range);
  arcLine(g, x, y, range, ang - halfAng, ang + halfAng);
  // Four talon tracks raked across it.
  for (let i = 0; i < 4; i++) {
    const r = range * (0.5 + i * 0.14);
    g.lineStyle(3.2 - i * 0.4, tint(F.tentacle), 0.55 * k);
    arcLine(g, x, y, r, ang - halfAng * 0.92 * k, ang + halfAng * (0.92 - i * 0.07) * k);
    g.lineStyle(1, tint(F.ash), 0.25 * k);
    arcLine(g, x, y, r + 2, ang - halfAng * 0.8 * k, ang + halfAng * 0.6 * k);
  }
}

/** Fear being drawn out of a victim at `(x1, y1)` into the drainer at `(x2, y2)`. */
export function drawDrainLine(g: G, tint: FearColorFn, x1: number, y1: number, x2: number, y2: number, t: number, strength: number): void {
  const s = clamp01(strength);
  if (s <= 0.01) return;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const d = Math.hypot(dx, dy) || 1;
  const nx = -dy / d;
  const ny = dx / d;
  const amp = Math.min(14, d * 0.08);
  const at = (u: number, ph: number): [number, number] => {
    const off = Math.sin(u * 9 - t * 6 + ph) * amp * Math.sin(Math.PI * u);
    return [x1 + dx * u + nx * off, y1 + dy * u + ny * off];
  };
  for (const [w, col, al, ph] of [[5, F.ink, 0.35, 0], [2, F.ash, 0.75, 0], [1, F.ashDeep, 0.6, 2.1]] as const) {
    g.lineStyle(w * (0.6 + 0.4 * s), tint(col), al * s);
    g.beginPath();
    g.moveTo(x1, y1);
    for (let i = 1; i <= 18; i++) { const p = at(i / 18, ph); g.lineTo(p[0], p[1]); }
    g.strokePath();
  }
  for (let i = 0; i < 6; i++) {
    const u = (t * 0.9 + i / 6) % 1;
    const p = at(u, 0);
    const q = at(Math.max(0, u - 0.05), 0);
    g.lineStyle(1.6, tint(F.boneDim), s * 0.6 * Math.sin(Math.PI * u));
    g.lineBetween(q[0], q[1], p[0], p[1]);
    g.fillStyle(tint(i % 2 ? F.bone : F.ash), s * Math.sin(Math.PI * u));
    g.fillCircle(p[0], p[1], 1.4 + 1.4 * u);
  }
  g.fillStyle(tint(F.ash), s * (0.2 + 0.1 * Math.sin(t * 9)));
  g.fillCircle(x2, y2, 9);
}

/** A rune hovering just off the floor. It burns bright enough to find in the dark; `hp` 0..1 eats its ring away. */
export function drawRune(g: G, tint: FearColorFn, x: number, y: number, t: number, hp: number, flash: number): void {
  hp = clamp01(hp);
  const pulse = 0.5 + 0.5 * Math.sin(t * 4 + x * 0.05);
  const hy = y - 5 + Math.sin(t * 2.2 + x * 0.03) * 1.8;
  const hot = tint(flash > 0.4 ? F.shirt : F.runeHot);
  // Its light on the floor.
  g.fillStyle(tint(F.runeDeep), 0.3);
  g.fillEllipse(x, y + 7, 46, 15);
  g.fillStyle(tint(F.rune), 0.2 + 0.14 * pulse);
  g.fillEllipse(x, y + 7, 28, 9);
  g.fillStyle(tint(F.rune), 0.14 + 0.1 * pulse + 0.4 * flash);
  g.fillCircle(x, hy, 19);
  // The ring: what is left of it, turning, with notches.
  const r = 12.5;
  g.lineStyle(1, tint(F.runeDeep), 0.9);
  g.strokeCircle(x, hy, r);
  g.lineStyle(2.4, tint(F.rune), 1);
  arcLine(g, x, hy, r, -Math.PI / 2 + t * 0.5, -Math.PI / 2 + t * 0.5 + TAU * Math.max(0.04, hp));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU - t * 0.7;
    g.lineStyle(1.4, tint(F.rune), 0.9);
    g.lineBetween(x + Math.cos(a) * (r + 2), hy + Math.sin(a) * (r + 2), x + Math.cos(a) * (r + 4.5), hy + Math.sin(a) * (r + 4.5));
  }
  // The glyph: a stave, two barbs and an eye-diamond. Laid wide and dim, then thin and hot.
  const glyph: number[] = [0, -8, 0, 8, 0, -8, -5, -3, 0, -8, 5, -3, -4, 4, 0, 0, 0, 0, 4, 4, 4, 4, 0, 8, 0, 8, -4, 4, -6, -1, -3, 1, 6, -1, 3, 1];
  for (const [w, col, al] of [[4.5, tint(F.rune), 0.4], [1.7, hot, 1]] as const) {
    g.lineStyle(w, col, al);
    for (let i = 0; i < glyph.length; i += 4) g.lineBetween(x + glyph[i], hy + glyph[i + 1], x + glyph[i + 2], hy + glyph[i + 3]);
  }
  if (hp < 0.6) crack(g, x - 9, hy - 6, 0.5, 20, x + y, tint(F.ink), 0.8, 1.2);
  // Embers lifting off it.
  for (let i = 0; i < 4; i++) {
    const f = (t * 0.6 + i / 4 + hash(x, i)) % 1;
    g.fillStyle(tint(F.runeHot), (1 - f) * 0.9);
    g.fillRect(x + (hash(y, i) - 0.5) * 22 + Math.sin(t * 3 + i) * 2, hy - 6 - f * 22, 1.6, 1.6);
  }
}

/** A pit opening in the floor: crumbling rim, rings going down, nothing at the bottom. */
export function drawHole(g: G, tint: FearColorFn, x: number, y: number, r: number, t: number): void {
  if (r <= 1) return;
  const seed = x * 0.013 + y * 0.031;
  const n = Math.max(14, Math.round(r * 0.5));
  const ring = (k: number, rough: number, s: number): number[] => {
    const p: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const rr = r * k * (1 + (hash(seed + s, i) - 0.5) * rough);
      p.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    return p;
  };
  // Cracks running out ahead of the edge.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + hash(seed, i + 30);
    crack(g, x + Math.cos(a) * r, y + Math.sin(a) * r, a, r * (0.25 + 0.35 * hash(seed, i + 40)) + 6, seed + i, tint(F.ink), 0.75, 1.4);
  }
  g.fillStyle(tint(F.stone), 1);
  g.lineStyle(1.5, tint(F.stoneLit), 0.9);
  poly(g, ring(1.1, 0.16, 0), true);
  g.fillStyle(tint(F.stoneDeep), 1);
  poly(g, ring(0.99, 0.12, 1));
  // Strata on the way down, each a little darker and a little off-centre.
  for (const [k, col, al] of [[0.9, F.suit, 1], [0.8, F.suitDeep, 1], [0.7, F.ink, 0.9]] as const) {
    g.fillStyle(tint(col), al);
    poly(g, ring(k, 0.08, k * 10));
    g.lineStyle(1, tint(F.ashDeep), 0.35);
    arcLine(g, x, y, r * (k - 0.03), Math.PI * 1.05, Math.PI * 1.75);
  }
  g.fillStyle(0x000000, 1);
  g.fillCircle(x, y, r * 0.62);
  // The rim keeps giving way: chips slide in and are gone.
  for (let i = 0; i < 10; i++) {
    const f = (t * (0.35 + 0.3 * hash(seed, i + 50)) + hash(seed, i + 60)) % 1;
    const a = hash(seed, i + 70) * TAU;
    const rr = r * (1.05 - 0.5 * f * f);
    const s = (2 + 3 * hash(seed, i + 80)) * (1 - f * 0.7);
    g.fillStyle(tint(i % 2 ? F.stone : F.stoneLit), 1 - f);
    g.fillTriangle(x + Math.cos(a) * rr, y + Math.sin(a) * rr - s, x + Math.cos(a) * rr + s, y + Math.sin(a) * rr + s * 0.6, x + Math.cos(a) * rr - s, y + Math.sin(a) * rr + s * 0.5);
  }
}

function bricks(g: G, tint: FearColorFn, rx: number, ry: number, rw: number, rh: number): void {
  if (rw <= 0.5 || rh <= 0.5) return;
  g.fillStyle(tint(F.stone), 1);
  g.fillRect(rx, ry, rw, rh);
  const BH = 26;
  const BW = 54;
  const r0 = Math.floor(ry / BH);
  g.lineStyle(2, tint(F.stoneDeep), 0.9);
  for (let row = r0; row * BH < ry + rh; row++) {
    const yy = row * BH;
    if (yy > ry) g.lineBetween(rx, yy, rx + rw, yy);
    const top = Math.max(ry, yy);
    const bot = Math.min(ry + rh, yy + BH);
    const off = (row & 1) * (BW / 2);
    for (let col = Math.floor((rx - off) / BW); col * BW + off < rx + rw; col++) {
      const xx = col * BW + off;
      if (xx > rx) g.lineBetween(xx, top, xx, bot);
      // The odd block is darker, or has a chip out of it.
      const h = hash(row, col);
      if (h > 0.8) {
        const bx = Math.max(rx, xx + 2);
        const bw = Math.min(rx + rw, xx + BW - 2) - bx;
        if (bw > 0 && bot - top > 4) {
          g.fillStyle(tint(h > 0.9 ? F.stoneDeep : F.stoneLit), 0.28);
          g.fillRect(bx, top + 2, bw, bot - top - 4);
        }
      }
    }
  }
}

/** Stone walls filling everything between `outer` and `inner`, with a lit lip where they meet the room. */
export function drawClosingWalls(g: G, tint: FearColorFn, outer: Phaser.Geom.Rectangle, inner: Phaser.Geom.Rectangle, t: number): void {
  const il = Math.max(outer.left, inner.left);
  const ir = Math.min(outer.right, inner.right);
  const it = Math.max(outer.top, inner.top);
  const ib = Math.min(outer.bottom, inner.bottom);
  bricks(g, tint, outer.left, outer.top, outer.width, it - outer.top);
  bricks(g, tint, outer.left, ib, outer.width, outer.bottom - ib);
  bricks(g, tint, outer.left, it, il - outer.left, ib - it);
  bricks(g, tint, ir, it, outer.right - ir, ib - it);
  const w = ir - il;
  const h = ib - it;
  if (w <= 0 || h <= 0) return;
  // The shadow the walls throw into what is left of the room.
  for (let i = 0; i < 3; i++) {
    const d = 6 * (3 - i);
    g.fillStyle(tint(F.ink), 0.16);
    g.fillRect(il, it, w, d);
    g.fillRect(il, ib - d, w, d);
    g.fillRect(il, it, d, h);
    g.fillRect(ir - d, it, d, h);
  }
  // The lip: a bevel of lit stone with a hard dark line behind it.
  g.lineStyle(7, tint(F.stoneDeep), 1);
  g.strokeRect(il - 6.5, it - 6.5, w + 13, h + 13);
  g.lineStyle(4, tint(F.stoneLit), 1);
  g.strokeRect(il - 2, it - 2, w + 4, h + 4);
  g.lineStyle(1, tint(F.bone), 0.5 + 0.2 * Math.sin(t * 5));
  g.strokeRect(il, it, w, h);
  // Grit shaken loose as they grind inward.
  for (let i = 0; i < 28; i++) {
    const f = (t * (0.8 + hash(i, 1)) + hash(i, 2)) % 1;
    const u = hash(i, 3);
    const side = i % 4;
    const px = side === 0 ? il + f * 14 : side === 1 ? ir - f * 14 : il + u * w;
    const py = side === 2 ? it + f * 14 : side === 3 ? ib - f * 14 : it + u * h;
    g.fillStyle(tint(i % 3 ? F.ash : F.stoneLit), (1 - f) * 0.8);
    g.fillRect(px, py, 2, 2);
  }
}

/** The signature's kill zone: a red wedge from its apex. Dim while it is being aimed, burning once armed. */
export function drawSignatureCone(g: G, tint: FearColorFn, x: number, y: number, ang: number, halfAng: number, len: number, armed: boolean, t: number): void {
  const a0 = ang - halfAng;
  const a1 = ang + halfAng;
  const pulse = 0.5 + 0.5 * Math.sin(t * (armed ? 11 : 4));
  g.fillStyle(tint(armed ? F.blood : F.bloodDeep), armed ? 0.3 + 0.12 * pulse : 0.16);
  wedge(g, x, y, len, a0, a1);
  if (armed) {
    g.fillStyle(tint(F.bloodHot), 0.14 + 0.1 * pulse);
    wedge(g, x, y, len * 0.9, ang - halfAng * 0.55, ang + halfAng * 0.55);
    // Cuts racing out from the apex.
    for (let i = 0; i < 9; i++) {
      const f = (t * 1.6 + hash(i, 1)) % 1;
      const a = a0 + (a1 - a0) * hash(i, 2);
      g.lineStyle(2, tint(F.bloodHot), 0.8 * (1 - f));
      g.lineBetween(x + Math.cos(a) * len * f, y + Math.sin(a) * len * f, x + Math.cos(a) * len * Math.min(1, f + 0.16), y + Math.sin(a) * len * Math.min(1, f + 0.16));
    }
    for (let i = 0; i < 3; i++) {
      const f = (t * 1.1 + i / 3) % 1;
      g.lineStyle(2.5, tint(F.bloodHot), 0.6 * (1 - f));
      arcLine(g, x, y, len * f, a0, a1);
    }
    g.lineStyle(3, tint(F.bloodHot), 0.95);
  } else {
    // A dotted sightline down the middle while aiming.
    for (let i = 0; i < 10; i++) {
      const f = (i + (t * 1.5) % 1) / 10;
      g.fillStyle(tint(F.blood), 0.6 * (1 - f));
      g.fillCircle(x + Math.cos(ang) * len * f, y + Math.sin(ang) * len * f, 1.8);
    }
    g.lineStyle(1.5, tint(F.blood), 0.5 + 0.2 * pulse);
  }
  g.lineBetween(x, y, x + Math.cos(a0) * len, y + Math.sin(a0) * len);
  g.lineBetween(x, y, x + Math.cos(a1) * len, y + Math.sin(a1) * len);
  arcLine(g, x, y, len, a0, a1);
}

/** The machete's swing: a band of smeared steel behind the blade, blood flung off its edge. `k` 0..1. */
export function drawMacheteSlash(g: G, tint: FearColorFn, x: number, y: number, ang: number, halfAng: number, range: number, k: number): void {
  k = clamp01(k);
  const a0 = ang - halfAng;
  const sweep = Math.min(1, easeOut(k / 0.55));
  const cur = a0 + 2 * halfAng * sweep;
  const fade = k < 0.5 ? 1 : 1 - (k - 0.5) / 0.5;
  // The smear, brightest just behind the blade.
  const N = 7;
  for (let i = 0; i < N; i++) {
    const b0 = a0 + ((cur - a0) * i) / N;
    const b1 = a0 + ((cur - a0) * (i + 1)) / N;
    const u = (i + 1) / N;
    g.fillStyle(tint(F.steel), fade * 0.5 * u * u);
    arcBand(g, x, y, range * (0.5 - 0.12 * u), range * 0.97, b0, b1 + 0.01);
    g.fillStyle(tint(F.steelLit), fade * 0.55 * u * u);
    arcBand(g, x, y, range * 0.84, range * 0.95, b0, b1 + 0.01);
  }
  // The blood edge.
  g.lineStyle(4, tint(F.blood), fade * 0.9);
  arcLine(g, x, y, range, a0, cur);
  g.lineStyle(1.5, tint(F.bloodHot), fade);
  arcLine(g, x, y, range + 2, a0 + (cur - a0) * 0.4, cur);
  for (let i = 0; i < 9; i++) {
    const a = a0 + (cur - a0) * hash(i, 4);
    const out = range + 4 + k * (20 + 34 * hash(i, 5));
    droplet(g, x + Math.cos(a) * out, y + Math.sin(a) * out + 18 * k * k, a, 1.6 + 1.6 * hash(i, 6), 7, tint(i % 3 ? F.blood : F.bloodDeep), fade);
  }
  // The blade itself, while it is still moving.
  if (k < 0.62) {
    const ux = Math.cos(cur);
    const uy = Math.sin(cur);
    const vx = -uy;
    const vy = ux;
    const P = (u: number, v: number): [number, number] => [x + ux * u + vx * v, y + uy * u + vy * v];
    const r = range;
    const pts: number[] = [];
    for (const [u, v] of [[0.3, -0.03], [0.9, -0.035], [1, 0], [0.96, 0.05], [0.8, 0.085], [0.5, 0.07], [0.3, 0.045]]) { const p = P(u * r, v * r); pts.push(p[0], p[1]); }
    g.fillStyle(tint(F.steel), 1);
    g.lineStyle(1.5, tint(F.ink), 0.9);
    poly(g, pts, true);
    const e0 = P(0.32 * r, 0.05 * r);
    const e1 = P(0.8 * r, 0.085 * r);
    const e2 = P(0.97 * r, 0.04 * r);
    g.lineStyle(2, tint(F.steelLit), 1);
    g.lineBetween(e0[0], e0[1], e1[0], e1[1]);
    g.lineBetween(e1[0], e1[1], e2[0], e2[1]);
  }
}

/** Wounds that do not close: `count` gashes across a body of radius `r`, bleeding harder the more there are. */
export function drawGashes(g: G, tint: FearColorFn, x: number, y: number, r: number, count: number, seed: number, t: number): void {
  const n = Math.min(12, Math.floor(count));
  for (let i = 0; i < n; i++) {
    const a = -0.9 + hash(seed, i) * 1.8 + (i % 2 ? Math.PI * 0.5 : 0);
    const cx = x + (hash(seed, i + 20) - 0.5) * r * 1.1;
    const cy = y + (hash(seed, i + 40) - 0.5) * r * 1.1;
    const len = r * (0.55 + 0.4 * hash(seed, i + 60));
    const ux = Math.cos(a) * len;
    const uy = Math.sin(a) * len;
    const nx = -Math.sin(a) * 2.6;
    const ny = Math.cos(a) * 2.6;
    g.fillStyle(tint(F.bloodDeep), 0.95);
    poly(g, [cx - ux, cy - uy, cx + nx, cy + ny, cx + ux, cy + uy, cx - nx, cy - ny]);
    g.lineStyle(1.3, tint(F.bloodHot), 0.9);
    g.lineBetween(cx - ux * 0.7, cy - uy * 0.7, cx + ux * 0.7, cy + uy * 0.7);
    // Stitches of torn edge.
    g.lineStyle(1, tint(F.ink), 0.6);
    for (let j = -1; j <= 1; j++) g.lineBetween(cx + ux * j * 0.5 + nx, cy + uy * j * 0.5 + ny, cx + ux * j * 0.5 - nx, cy + uy * j * 0.5 - ny);
    const drips = 1 + Math.floor(n / 3);
    for (let j = 0; j < drips; j++) {
      const u = hash(seed + i, j) * 1.6 - 0.8;
      const f = (t * (0.5 + 0.12 * n) + hash(seed + i, j + 9)) % 1;
      const dx = cx + ux * u;
      const dy = cy + uy * u;
      const run = r * (0.3 + 0.6 * f);
      g.lineStyle(1.4, tint(F.blood), 0.85 * (1 - f * 0.5));
      g.lineBetween(dx, dy, dx, dy + run);
      droplet(g, dx, dy + run, Math.PI / 2, 1.5, 3.5, tint(F.blood), 1 - f * 0.6);
    }
  }
}

/** The machete driven straight out and pulled back: a thrust, not a swing. `k` 0..1. */
export function drawMacheteStab(g: G, tint: FearColorFn, x: number, y: number, ang: number, reach: number, k: number): void {
  k = clamp01(k);
  const out = k < 0.32 ? easeOut(k / 0.32) : 1 - 0.5 * ((k - 0.32) / 0.68);
  const fade = k < 0.62 ? 1 : 1 - (k - 0.62) / 0.38;
  const ux = Math.cos(ang);
  const uy = Math.sin(ang);
  const vx = -uy;
  const vy = ux;
  const tip = Math.max(30, reach * out);
  const P = (u: number, v: number): [number, number] => [x + ux * u + vx * v, y + uy * u + vy * v];
  // The air the blade went through.
  for (let i = 0; i < 5; i++) {
    const off = (i - 2) * 4.2;
    const len = tip * (0.45 + 0.4 * hash(i, 3));
    const a = P(tip - len, off);
    const b = P(tip - 8, off * 0.45);
    g.lineStyle(2.4 - Math.abs(i - 2) * 0.6, tint(i === 2 ? F.steelLit : F.steel), fade * (k < 0.4 ? 0.5 : 0.22));
    g.lineBetween(a[0], a[1], b[0], b[1]);
  }
  // Grip, guard, blade.
  const b0 = Math.max(12, tip - Math.min(reach, 96) * 0.62);
  const grip: number[] = [];
  for (const [u, v] of [[b0 - 15, -3], [b0 - 2, -3], [b0 - 2, 3], [b0 - 15, 3]]) { const p = P(u, v); grip.push(p[0], p[1]); }
  g.fillStyle(tint(F.stain), fade);
  g.lineStyle(1.2, tint(F.ink), fade * 0.9);
  poly(g, grip, true);
  const guard: number[] = [];
  for (const [u, v] of [[b0 - 3, -8], [b0 + 1, -8], [b0 + 1, 8], [b0 - 3, 8]]) { const p = P(u, v); guard.push(p[0], p[1]); }
  g.fillStyle(tint(F.steelDeep), fade);
  poly(g, guard, true);
  const blade: number[] = [];
  for (const [u, v] of [[b0, -4.5], [tip - 18, -6], [tip, 0], [tip - 9, 6.5], [b0, 5.5]]) { const p = P(u, v); blade.push(p[0], p[1]); }
  g.fillStyle(tint(F.steel), fade);
  g.lineStyle(1.5, tint(F.ink), fade * 0.9);
  poly(g, blade, true);
  const e0 = P(b0 + 3, 4);
  const e1 = P(tip - 10, 5);
  const e2 = P(tip - 1, 0.5);
  g.lineStyle(1.8, tint(F.steelLit), fade);
  g.lineBetween(e0[0], e0[1], e1[0], e1[1]);
  g.lineBetween(e1[0], e1[1], e2[0], e2[1]);
  // The fuller, and what is on the point once it has been in something.
  const f0 = P(b0 + 6, -1);
  const f1 = P(tip - 22, -1.5);
  g.lineStyle(1, tint(F.steelDeep), fade * 0.8);
  g.lineBetween(f0[0], f0[1], f1[0], f1[1]);
  if (k > 0.3) {
    const t0 = P(tip - 20, 0);
    const t1 = P(tip, 0);
    g.lineStyle(3, tint(F.blood), fade * 0.85);
    g.lineBetween(t0[0], t0[1], t1[0], t1[1]);
    const far = P(reach, 0);
    for (let i = 0; i < 6; i++) {
      const a = ang + (hash(i, 7) - 0.5) * 1.2;
      const d = (k - 0.3) * (26 + 44 * hash(i, 8));
      droplet(g, far[0] + Math.cos(a) * d, far[1] + Math.sin(a) * d + 22 * (k - 0.3) * (k - 0.3), a, 1.3 + 1.5 * hash(i, 9), 6, tint(i % 3 ? F.blood : F.bloodDeep), fade);
    }
  }
}

/** A meat hook: an eye at `(x, y)`, a shank running along `rot`, and the curve coming back round to a point. */
function hookShape(g: G, tint: FearColorFn, x: number, y: number, rot: number, s: number, alpha: number, bloody: number): void {
  const ux = Math.cos(rot);
  const uy = Math.sin(rot);
  const vx = -uy;
  const vy = ux;
  const r = s * 0.46;
  const sx = x + ux * s;
  const sy = y + uy * s;
  const cx = sx + vx * r;
  const cy = sy + vy * r;
  const a0 = rot - Math.PI / 2;
  const a1 = rot + Math.PI * 0.62;
  const trace = (): void => {
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(sx, sy);
    g.arc(cx, cy, r, a0, a1, false);
    g.strokePath();
  };
  g.lineStyle(s * 0.2 + 3, tint(F.ink), alpha);
  trace();
  g.lineStyle(s * 0.2 + 0.6, tint(F.steel), alpha);
  trace();
  g.lineStyle(1.2, tint(F.steelLit), alpha * 0.9);
  g.beginPath();
  g.arc(cx, cy, r + s * 0.05, a0 + 0.3, a0 + 1.5, false);
  g.strokePath();
  // The point, filed thin and turned back toward the eye.
  const px = cx + Math.cos(a1) * r;
  const py = cy + Math.sin(a1) * r;
  const ta = a1 + Math.PI / 2;
  const w = s * 0.14 + 1.2;
  g.fillStyle(tint(bloody > 0.5 ? F.blood : F.steelLit), alpha);
  g.fillTriangle(
    px + Math.cos(a1) * w, py + Math.sin(a1) * w,
    px - Math.cos(a1) * w, py - Math.sin(a1) * w,
    px + Math.cos(ta) * s * 0.42, py + Math.sin(ta) * s * 0.42,
  );
  if (bloody > 0) {
    g.lineStyle(s * 0.14 + 1, tint(F.blood), alpha * bloody);
    g.beginPath();
    g.arc(cx, cy, r, a1 - 1.1, a1, false);
    g.strokePath();
  }
  // The eye the chain goes through.
  g.lineStyle(2.4, tint(F.ink), alpha);
  g.strokeCircle(x - ux * 3.5, y - uy * 3.5, 3.6);
  g.lineStyle(1.4, tint(F.steel), alpha);
  g.strokeCircle(x - ux * 3.5, y - uy * 3.5, 3.6);
}

/** A run of chain from one point to another: links alternately seen flat and edge-on. */
function chain(g: G, tint: FearColorFn, pts: number[], alpha: number): void {
  let carry = 0;
  let n = 0;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const ax = pts[i], ay = pts[i + 1], bx = pts[i + 2], by = pts[i + 3];
    const len = Math.hypot(bx - ax, by - ay);
    if (len < 0.01) continue;
    const ux = (bx - ax) / len;
    const uy = (by - ay) / len;
    let d = carry;
    for (; d < len; d += 6.5, n++) {
      const lx = ax + ux * d;
      const ly = ay + uy * d;
      if (n % 2 === 0) {
        g.lineStyle(3.4, tint(F.ink), alpha);
        g.lineBetween(lx - ux * 3.6, ly - uy * 3.6, lx + ux * 3.6, ly + uy * 3.6);
        g.lineStyle(1.6, tint(F.steel), alpha);
        g.lineBetween(lx - ux * 3, ly - uy * 3, lx + ux * 3, ly + uy * 3);
      } else {
        g.fillStyle(tint(F.ink), alpha);
        g.fillCircle(lx, ly, 3.1);
        g.fillStyle(tint(F.steelDeep), alpha);
        g.fillCircle(lx, ly, 2.1);
        g.fillStyle(tint(F.steelLit), alpha * 0.9);
        g.fillCircle(lx - 0.6, ly - 0.7, 0.8);
      }
    }
    carry = d - len;
  }
}

/**
 * Haunt let go: a hook on a chain, swung round and round the slasher. `ang` is where the hook is
 * right now; the chain lags it, and the steel leaves a smear behind it.
 */
export function drawHookSpin(g: G, tint: FearColorFn, x: number, y: number, ang: number, radius: number, t: number, alpha: number): void {
  // The smear the hook leaves.
  const N = 9;
  for (let i = 0; i < N; i++) {
    const u = (i + 1) / N;
    const b1 = ang - 1.5 * (1 - u);
    const b0 = ang - 1.5 * (1 - i / N);
    g.fillStyle(tint(F.steel), alpha * 0.28 * u * u);
    arcBand(g, x, y, radius - 5, radius + 13, b0, b1 + 0.01);
    g.fillStyle(tint(F.blood), alpha * 0.22 * u * u);
    arcBand(g, x, y, radius + 9, radius + 13, b0, b1 + 0.01);
  }
  // The chain, bowed back against the turn.
  const pts: number[] = [];
  const M = 7;
  for (let i = 0; i <= M; i++) {
    const u = i / M;
    const a = ang - 0.42 * Math.sin(u * Math.PI) * (1 - u * 0.4);
    const d = 14 + (radius - 14) * u;
    pts.push(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  chain(g, tint, pts, alpha);
  const hx = x + Math.cos(ang) * radius;
  const hy = y + Math.sin(ang) * radius;
  hookShape(g, tint, hx, hy, ang + Math.PI * 0.42 + 0.08 * Math.sin(t * 30), 15, alpha, 0.5);
}

/** The chain between the slasher and whoever is on the end of it. */
export function drawDragChain(g: G, tint: FearColorFn, x1: number, y1: number, x2: number, y2: number, t: number): void {
  const d = Math.hypot(x2 - x1, y2 - y1);
  if (d < 4) return;
  const ux = (x2 - x1) / d;
  const uy = (y2 - y1) / d;
  const sag = Math.max(0, 1 - d / 60) * 12;
  const mx = (x1 + x2) / 2 - uy * sag * 0.2;
  const my = (y1 + y2) / 2 + sag;
  chain(g, tint, [x1 + ux * 12, y1 + uy * 12, mx, my, x2 - ux * 10, y2 - uy * 10], 1);
  hookShape(g, tint, x2 - ux * 10, y2 - uy * 10, Math.atan2(uy, ux) - 0.5, 11, 1, 1);
  // It is in them: a little comes out with every yank.
  const f = (t * 1.6) % 1;
  droplet(g, x2 + (hash(3, Math.floor(t * 1.6)) - 0.5) * 12, y2 + 6 + 16 * f, Math.PI / 2, 1.8, 4, tint(F.blood), 1 - f);
}

/**
 * A butcher's hook standing in the arena: an iron post, an arm, a short chain and the hook on the
 * end of it. `ground` takes the stain and the foot, `air` everything that stands up. `lit` 0..1
 * calls it out (somebody is being dragged and this is where they are going); `loaded` means a
 * body is hanging on it.
 */
export function drawButcherHook(ground: G, air: G, tint: FearColorFn, x: number, y: number, t: number, seed: number, lit: number, loaded: boolean): void {
  // Old blood under it, and the foot of the post.
  ground.fillStyle(tint(F.bloodDeep), 0.5);
  blob(ground, x, y + 3, 26, 13, seed, 0.5);
  ground.fillStyle(tint(F.stain), 0.5);
  blob(ground, x + 4, y + 4, 15, 7, seed + 3, 0.6);
  ground.fillStyle(tint(F.ink), 0.55);
  ground.fillEllipse(x - 15, y + 5, 22, 9);
  if (lit > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 7);
    ground.lineStyle(2.5, tint(F.bloodHot), lit * (0.45 + 0.4 * pulse));
    ground.strokeEllipse(x, y + 2, 62 + 8 * pulse, 34 + 4 * pulse);
    ground.lineStyle(1.2, tint(F.bloodHot), lit * 0.35);
    ground.strokeEllipse(x, y + 2, 78 + 10 * pulse, 43 + 5 * pulse);
  }
  const px = x - 15;
  const top = y - 50;
  // Post.
  air.fillStyle(tint(F.ink), 1);
  air.fillRect(px - 4, top - 2, 8, 58);
  air.fillStyle(tint(F.stoneDeep), 1);
  air.fillRect(px - 2.5, top, 5, 55);
  air.fillStyle(tint(F.stoneLit), 0.7);
  air.fillRect(px - 2.5, top, 1.4, 55);
  air.fillStyle(tint(F.ink), 1);
  air.fillRect(px - 7, y + 1, 14, 5);
  // Rust, and what ran down it.
  for (let i = 0; i < 4; i++) {
    air.fillStyle(tint(i % 2 ? F.stain : F.bloodDeep), 0.75);
    air.fillRect(px - 2.5 + hash(seed, i) * 3.5, top + 6 + hash(seed, i + 5) * 34, 1.6, 4 + hash(seed, i + 9) * 9);
  }
  // Arm and brace.
  air.lineStyle(6, tint(F.ink), 1);
  air.lineBetween(px, top + 1, x + 4, top + 1);
  air.lineStyle(3.2, tint(F.stoneDeep), 1);
  air.lineBetween(px, top + 1, x + 3, top + 1);
  air.lineStyle(1, tint(F.stoneLit), 0.7);
  air.lineBetween(px, top, x + 3, top);
  air.lineStyle(3, tint(F.ink), 1);
  air.lineBetween(px + 1, top + 13, px + 12, top + 2);
  air.lineStyle(1.4, tint(F.stoneDeep), 1);
  air.lineBetween(px + 1, top + 13, px + 12, top + 2);
  // Chain and hook, swaying a little — hard, if something on it is still moving.
  const sway = (loaded ? 0.16 * Math.sin(t * 9 + seed) : 0.07 * Math.sin(t * 1.7 + seed));
  const cl = 15;
  const ex = x + Math.sin(sway) * cl;
  const ey = top + 2 + Math.cos(sway) * cl;
  chain(air, tint, [x, top + 3, ex, ey], 1);
  hookShape(air, tint, ex, ey + 3, Math.PI / 2 + sway, 15, 1, loaded ? 1 : 0.6);
  if (lit > 0) {
    air.lineStyle(1.5, tint(F.bloodHot), lit * (0.5 + 0.4 * Math.sin(t * 7)));
    air.strokeCircle(ex + 6, ey + 14, 13);
  }
}

/** Blood on the floor: a ragged pool with a darker heart and one wet glint. `k` 0..1 is its age. */
export function drawBloodPuddle(g: G, tint: FearColorFn, x: number, y: number, r: number, seed: number, k: number): void {
  const grow = Math.min(1, k * 14 + 0.35);
  const alpha = k < 0.75 ? 0.82 : 0.82 * (1 - (k - 0.75) / 0.25);
  const rr = r * grow;
  g.fillStyle(tint(F.bloodDeep), alpha);
  blob(g, x, y, rr, rr * 0.6, seed, 0.55);
  g.fillStyle(tint(F.blood), alpha * 0.9);
  blob(g, x + rr * 0.08, y, rr * 0.68, rr * 0.38, seed + 11, 0.5);
  // Satellites it threw when it landed.
  for (let i = 0; i < 3; i++) {
    const a = hash(seed, i + 30) * TAU;
    const d = rr * (1.05 + 0.5 * hash(seed, i + 34));
    g.fillStyle(tint(F.bloodDeep), alpha * 0.9);
    g.fillEllipse(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, 2.2 + 2 * hash(seed, i + 38), 1.4 + hash(seed, i + 42));
  }
  if (k < 0.5) {
    g.fillStyle(tint(F.bloodHot), alpha * 0.55 * (1 - k * 2));
    g.fillEllipse(x - rr * 0.25, y - rr * 0.12, rr * 0.34, rr * 0.12);
  }
}

/** What the chart paints a part with: sound, damaged (pink), severe (red). Read at a glance, so never tinted. */
const CHART_FILL = [0xb9b3a4, 0xff8fb0, 0xe0182a];
const CHART_EDGE = [0x4f4c46, 0x9c3a5a, 0x5c0710];

/**
 * The slasher's chart of the body he is working on, pinned to his own screen: head, heart, two
 * arms, two legs. `levels` is `[head, heart, armL, armR, legL, legR]`, each 0 sound / 1 damaged /
 * 2 severe; `wounds` the same parts as 0..1 of the way to severe; `flash` 0..1 per part, for the
 * one that was just struck.
 */
export function drawBodyChart(
  g: G, x: number, y: number, t: number,
  levels: readonly number[], wounds: readonly number[], flash: readonly number[], o: { bleeding: number; hooked: boolean },
): void {
  const W = 104;
  const H = 142;
  const x0 = x - W / 2;
  const y0 = y - H / 2;
  // The card: butcher's paper on a board.
  g.fillStyle(0x050506, 0.78);
  g.fillRoundedRect(x0 - 3, y0 - 3, W + 6, H + 6, 8);
  g.fillStyle(0x17161a, 0.92);
  g.fillRoundedRect(x0, y0, W, H, 6);
  g.lineStyle(1.5, o.bleeding > 0 ? 0xb3121f : 0x4b4b54, 0.95);
  g.strokeRoundedRect(x0, y0, W, H, 6);
  g.lineStyle(1, 0x3a3b41, 0.6);
  for (let i = 1; i < 6; i++) g.lineBetween(x0 + 6, y0 + (H * i) / 6, x0 + W - 6, y0 + (H * i) / 6);
  g.fillStyle(0x8d8f96, 0.9);
  g.fillCircle(x, y0 + 5, 2.2);

  const pulse = 0.5 + 0.5 * Math.sin(t * 6);
  const paint = (i: number): { fill: number; edge: number; a: number } => {
    const lv = levels[i] | 0;
    return { fill: CHART_FILL[lv], edge: CHART_EDGE[lv], a: lv === 2 ? 0.82 + 0.18 * pulse : 0.95 };
  };
  const limb = (i: number, ax: number, ay: number, bx: number, by: number, w: number): void => {
    const p = paint(i);
    g.lineStyle(w + 3, p.edge, 1);
    g.lineBetween(ax, ay, bx, by);
    g.fillStyle(p.edge, 1);
    g.fillCircle(ax, ay, (w + 3) / 2);
    g.fillCircle(bx, by, (w + 3) / 2);
    g.lineStyle(w, p.fill, p.a);
    g.lineBetween(ax, ay, bx, by);
    g.fillStyle(p.fill, p.a);
    g.fillCircle(ax, ay, w / 2);
    g.fillCircle(bx, by, w / 2);
    if (flash[i] > 0) {
      g.lineStyle(w + 8, 0xffffff, 0.75 * flash[i]);
      g.lineBetween(ax, ay, bx, by);
    }
  };
  const cy = y + 4;
  // Legs, arms (each ending in the ball of a hand), then the trunk over their roots.
  limb(4, x - 8, cy + 16, x - 13, cy + 54, 11);
  limb(5, x + 8, cy + 16, x + 13, cy + 54, 11);
  limb(2, x - 19, cy - 20, x - 34, cy + 10, 9);
  limb(3, x + 19, cy - 20, x + 34, cy + 10, 9);
  for (const [i, hx] of [[2, x - 36], [3, x + 36]] as const) {
    const p = paint(i);
    g.fillStyle(p.edge, 1);
    g.fillCircle(hx, cy + 14, 8);
    g.fillStyle(p.fill, p.a);
    g.fillCircle(hx, cy + 14, 6.2);
    if (flash[i] > 0) { g.fillStyle(0xffffff, 0.75 * flash[i]); g.fillCircle(hx, cy + 14, 9); }
  }
  g.fillStyle(0x4f4c46, 1);
  g.fillRoundedRect(x - 19, cy - 28, 38, 50, 9);
  g.fillStyle(0x8f897a, 0.95);
  g.fillRoundedRect(x - 17, cy - 26, 34, 46, 8);
  // The heart, where it is.
  {
    const p = paint(1);
    const hx = x + 3;
    const hy = cy - 10;
    const s = 1 + (levels[1] === 2 ? 0.14 * pulse : 0.05 * Math.sin(t * 4));
    const heart = (r: number, c: number, a: number): void => {
      g.fillStyle(c, a);
      g.fillCircle(hx - r * 0.5, hy - r * 0.25, r * 0.58);
      g.fillCircle(hx + r * 0.5, hy - r * 0.25, r * 0.58);
      g.fillTriangle(hx - r * 1.02, hy, hx + r * 1.02, hy, hx, hy + r * 1.15);
    };
    heart(9.5 * s, p.edge, 1);
    heart(7.6 * s, p.fill, p.a);
    if (flash[1] > 0) heart(11 * s, 0xffffff, 0.75 * flash[1]);
  }
  // Head.
  {
    const p = paint(0);
    g.fillStyle(p.edge, 1);
    g.fillCircle(x, cy - 44, 14.5);
    g.fillStyle(p.fill, p.a);
    g.fillCircle(x, cy - 44, 12.5);
    g.fillStyle(0x17161a, 0.85);
    g.fillCircle(x - 4.5, cy - 45, 2);
    g.fillCircle(x + 4.5, cy - 45, 2);
    if (flash[0] > 0) { g.fillStyle(0xffffff, 0.75 * flash[0]); g.fillCircle(x, cy - 44, 16); }
  }
  // How far along each one is: a tick under the part, filling toward severe.
  const marks: [number, number, number][] = [
    [0, x, cy - 61], [1, x + 3, cy + 5], [2, x - 36, cy + 26], [3, x + 36, cy + 26], [4, x - 13, cy + 63], [5, x + 13, cy + 63],
  ];
  for (const [i, mx, my] of marks) {
    const w = clamp01(wounds[i]);
    if (w <= 0) continue;
    g.fillStyle(0x050506, 0.9);
    g.fillRect(mx - 9, my - 2, 18, 4);
    g.fillStyle(CHART_FILL[levels[i] ? levels[i] | 0 : 1], 1);
    g.fillRect(mx - 8, my - 1, 16 * w, 2);
  }
  // Severe parts run.
  for (const [i, mx, my] of marks) {
    if (levels[i] !== 2) continue;
    const f = (t * 0.9 + hash(i, 2)) % 1;
    const sy = i === 0 ? cy - 34 : i === 1 ? cy - 2 : my - 8;
    g.lineStyle(1.6, 0xe0182a, 0.9 * (1 - f * 0.5));
    g.lineBetween(mx - 3, sy, mx - 3, sy + 10 * f);
    droplet(g, mx - 3, sy + 10 * f + 2, Math.PI / 2, 1.6, 3.5, 0xe0182a, 1 - f * 0.6);
  }
  if (o.hooked) {
    g.lineStyle(2, 0xe0182a, 0.6 + 0.4 * pulse);
    g.strokeRoundedRect(x0 + 3, y0 + 3, W - 6, H - 6, 5);
  }
  if (o.bleeding > 0) {
    // One drop per notch of how fast they are emptying.
    const n = Math.min(5, Math.ceil(o.bleeding));
    for (let i = 0; i < n; i++) droplet(g, x0 + 12 + i * 9, y0 + H - 10 + 1.5 * Math.sin(t * 5 + i), Math.PI / 2, 2.6, 6, 0xe0182a, 0.95);
  }
}

/** A victim's fear, worn over the head: a bar with an eye that opens as it fills. Shakes harder the fuller it is; turns red at the top. */
export function drawFearMeter(g: G, tint: FearColorFn, x: number, y: number, fear: number, t: number, fleeing: boolean): void {
  const f = clamp01(fear);
  const full = fleeing || f >= 0.999;
  const tr = f * f * 1.5 + (full ? 1 : 0);
  const cx = x + Math.sin(t * 47) * tr;
  const cy = y + Math.cos(t * 53) * tr * 0.6;
  const pulse = 0.5 + 0.5 * Math.sin(t * 14);
  if (full) {
    for (let i = 0; i < 3; i++) tentacle(g, cx - 6 + i * 8, cy + 3, Math.PI / 2, 6 + 2 * Math.sin(t * 6 + i), 3, Math.sin(t * 5 + i * 2) * 1.2, tint(F.ink), 0.9);
    g.fillStyle(tint(F.blood), 0.25 + 0.2 * pulse);
    g.fillRoundedRect(cx - 21, cy - 7, 42, 14, 5);
  }
  g.fillStyle(tint(F.ink), 0.85);
  g.fillRoundedRect(cx - 18, cy - 4.5, 36, 9, 3);
  g.lineStyle(1, tint(full ? F.bloodHot : F.ashDeep), 1);
  g.strokeRoundedRect(cx - 18, cy - 4.5, 36, 9, 3);
  // The bar.
  const bx = cx - 8;
  const bw = 23;
  g.fillStyle(tint(F.suit), 1);
  g.fillRect(bx, cy - 2, bw, 4);
  g.fillStyle(tint(full ? (pulse > 0.5 ? F.bloodHot : F.blood) : f > 0.66 ? F.bone : F.ash), 1);
  g.fillRect(bx, cy - 2, bw * f, 4);
  g.fillStyle(tint(F.ink), 1);
  g.fillRect(bx + bw / 3 - 0.5, cy - 2, 1, 4);
  g.fillRect(bx + (bw * 2) / 3 - 0.5, cy - 2, 1, 4);
  // The eye.
  const ex = cx - 13;
  g.fillStyle(tint(F.bone), 1);
  g.fillEllipse(ex, cy, 7.5, 1.6 + 4.6 * f);
  g.fillStyle(tint(full ? F.blood : F.ink), 1);
  g.fillCircle(ex, cy, Math.min(1.8 - 0.9 * f, 0.6 + 2.2 * f));
  if (full) {
    g.lineStyle(1.2, tint(F.bloodHot), 0.9);
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.55 + 0.225 * i);
      g.lineBetween(ex + Math.cos(a) * 5, cy + Math.sin(a) * 5, ex + Math.cos(a) * (7.5 + 1.5 * pulse), cy + Math.sin(a) * (7.5 + 1.5 * pulse));
    }
  }
}

/** Over a fighter frozen with fear: a shaking outline, cold sweat, small shadows climbing their legs. */
export function drawFrozenFear(g: G, tint: FearColorFn, x: number, y: number, r: number, t: number): void {
  const jx = Math.sin(t * 61) * 1.6;
  const jy = Math.cos(t * 67) * 1.1;
  // Shadows first, from the floor up.
  g.fillStyle(tint(F.ink), 0.4);
  g.fillEllipse(x, y + r * 0.9, r * 2.3, r * 0.6);
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.12 + 0.152 * i);
    const bx = x + Math.cos(a) * r * 1.05;
    const by = y + Math.sin(a) * r * 0.95;
    tentacle(g, bx, by, a + Math.PI + Math.sin(t * 2 + i) * 0.3, r * (0.55 + 0.25 * Math.sin(t * 1.7 + i * 1.3)), 3.4,
      Math.sin(t * 3.4 + i * 2) * 1.5, tint(F.tentacle), 0.85, tint(F.tentacleLit));
  }
  // The outline, drawn three times because it will not hold still.
  g.lineStyle(1.5, tint(F.ash), 0.55);
  g.strokeCircle(x + jx, y + jy, r + 2);
  g.lineStyle(1.2, tint(F.bone), 0.4);
  g.strokeCircle(x - jx * 1.4, y - jy, r + 3.5);
  g.lineStyle(1, tint(F.ashDeep), 0.6);
  g.strokeCircle(x + jy, y + jx * 0.6, r + 5);
  // Shiver marks at the shoulders.
  for (const sd of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const rr = r + 8 + i * 4 + Math.abs(jx);
      g.lineStyle(1.4, tint(F.bone), 0.6 - i * 0.2);
      arcLine(g, x, y, rr, sd > 0 ? -0.75 : Math.PI - 0.15, sd > 0 ? -0.15 : Math.PI + 0.45);
    }
  }
  // Sweat.
  for (let i = 0; i < 4; i++) {
    const f = (t * 0.9 + i * 0.27) % 1;
    const sx = x + (i - 1.5) * r * 0.5 + jx;
    const sy = y - r * 0.9 + f * r * 1.1;
    droplet(g, sx, sy, Math.PI / 2, 1.7, 4.5, tint(F.sweat), 0.85 * (1 - f));
  }
}

// ── Screen-space painters ────────────────────────────────────────────────────

/** A pulse of colour closing in from the screen's edges. `color` is used as given. */
export function drawVignette(g: G, w: number, h: number, strength: number, color: number): void {
  const s = clamp01(strength);
  if (s <= 0.005) return;
  const N = 10;
  const reach = Math.min(w, h) * 0.3;
  for (let i = 0; i < N; i++) {
    const d = reach * Math.pow(1 - i / N, 1.6);
    g.fillStyle(color, s * 0.11);
    g.fillRect(0, 0, w, d);
    g.fillRect(0, h - d, w, d);
    g.fillRect(0, d, d * 1.25, h - 2 * d);
    g.fillRect(w - d * 1.25, d, d * 1.25, h - 2 * d);
    // Round the corners in.
    const c = d * 2.1;
    g.fillTriangle(0, 0, c, 0, 0, c);
    g.fillTriangle(w, 0, w - c, 0, w, c);
    g.fillTriangle(0, h, c, h, 0, h - c);
    g.fillTriangle(w, h, w - c, h, w, h - c);
  }
}

/**
 * The jumpscare. The awakened phobia, face to the glass: the mask split down the middle and
 * swung open, a throat of turning teeth, one bloodshot eye, and everything around it writhing.
 * `variant` 1 is the statue — marble, barely cracked open, pouring blood from its laughing eyes.
 */
export function drawJumpscare(g: G, tint: FearColorFn, w: number, h: number, k: number, t: number, variant: 0 | 1): void {
  k = clamp01(k);
  const marble = variant === 1;
  const slam = k < 0.08 ? easeOut(k / 0.08) : 1;
  const fadeLin = k > 0.72 ? 1 - (k - 0.72) / 0.28 : 1;
  const a = fadeLin * fadeLin;
  if (a <= 0.004) return;
  // Slams in past full size, recoils, then keeps creeping closer.
  const s = (0.3 + 0.9 * slam) * (1 + 0.22 * Math.exp(-Math.max(0, k - 0.08) * 26)) * (1 + 0.14 * k);
  const amp = k < 0.08 ? 34 : 30 * Math.pow(1 - k, 2.2) + 2.5;
  const cx = w / 2 + (Math.sin(t * 97) + Math.sin(t * 61.3)) * 0.5 * amp;
  const cy = h * 0.48 + (Math.cos(t * 83) + Math.sin(t * 71.7)) * 0.5 * amp * 0.8 + (1 - fadeLin) * h * 0.16;
  const U = h * 0.5 * s;
  const ink = tint(F.ink);

  g.fillStyle(0x000000, a * 0.95);
  g.fillRect(0, 0, w, h);
  g.fillStyle(tint(F.bloodDeep), a * 0.4);
  g.fillCircle(cx, cy, U * 1.7);
  g.fillStyle(tint(F.blood), a * 0.16);
  g.fillCircle(cx, cy, U * 1.15);

  // Everything behind the mask.
  const tc = tint(F.tentacle);
  const tl = tint(F.tentacleLit);
  for (let i = 0; i < 20; i++) {
    const ta = (i / 20) * TAU + Math.sin(t * 1.3 + i) * 0.16;
    const hh = hash(i, 11);
    tentacle(g, cx + Math.cos(ta) * U * 0.45, cy + Math.sin(ta) * U * 0.45, ta, U * (1.25 + 0.7 * hh) * slam, U * (0.15 + 0.12 * hh),
      Math.sin(t * 2.1 + i * 1.7) * 1.1 + (hh - 0.5), tc, a, tl);
  }

  // The throat.
  const open = marble ? 0.32 : 1;
  g.fillStyle(tint(F.gum), a);
  g.fillCircle(cx, cy, U * 0.8);
  g.fillStyle(tint(F.bloodDeep), a);
  g.fillCircle(cx, cy, U * 0.74);
  g.fillStyle(tint(F.maw), a);
  g.fillCircle(cx, cy, U * 0.6);
  for (let j = 0; j < 3; j++) {
    const R = U * (0.74 - j * 0.14) * (1 + 0.035 * Math.sin(t * 9 + j * 2));
    const n = 24 - j * 5;
    const rot = t * (j % 2 ? -0.55 : 0.4) + j * 0.7;
    const tl2 = U * (0.15 - j * 0.02);
    const bw = (Math.PI / n) * 0.82;
    g.lineStyle(U * 0.035, tint(F.gum), a);
    g.strokeCircle(cx, cy, R);
    for (let i = 0; i < n; i++) {
      const ta = (i / n) * TAU + rot;
      const lenK = 0.7 + 0.6 * hash(i, j + 20);
      const bx0 = cx + Math.cos(ta - bw) * R;
      const by0 = cy + Math.sin(ta - bw) * R;
      const bx1 = cx + Math.cos(ta + bw) * R;
      const by1 = cy + Math.sin(ta + bw) * R;
      const tx = cx + Math.cos(ta + 0.03) * (R - tl2 * lenK);
      const ty = cy + Math.sin(ta + 0.03) * (R - tl2 * lenK);
      g.fillStyle(tint(F.boneShade), a);
      g.fillTriangle(bx0, by0, bx1, by1, tx, ty);
      g.fillStyle(tint(F.tooth), a);
      g.fillTriangle(bx0, by0, cx + Math.cos(ta + bw * 0.3) * R, cy + Math.sin(ta + bw * 0.3) * R, tx, ty);
      if (hash(i, j + 30) > 0.72) {
        g.fillStyle(tint(F.blood), a * 0.8);
        g.fillCircle(tx, ty, U * 0.012);
      }
    }
  }
  // Strands of black spit between the rings.
  for (let i = 0; i < 9; i++) {
    const sa = Math.PI * (1.15 + 0.7 * hash(i, 41));
    const r0 = U * (0.44 + 0.26 * hash(i, 42));
    const sx = cx + Math.cos(sa) * r0;
    const sy = cy + Math.sin(sa) * r0;
    const sl = U * (0.12 + 0.2 * hash(i, 43)) * (0.7 + 0.3 * Math.sin(t * 5 + i));
    g.lineStyle(Math.max(1, U * 0.008), ink, a * 0.8);
    g.lineBetween(sx, sy, sx + Math.sin(t * 3 + i) * 3, sy + sl);
    g.fillStyle(ink, a);
    g.fillCircle(sx + Math.sin(t * 3 + i) * 3, sy + sl, U * 0.012);
  }
  // The eye. It finds you at once: the pupil snaps shut to a point, and then it does not move.
  const er = U * 0.31;
  const twitch = Math.floor(t * 9);
  g.fillStyle(tint(F.gum), a);
  g.fillCircle(cx, cy, er * 1.16);
  g.fillStyle(tint(F.bloodDeep), a);
  g.fillCircle(cx, cy, er * 1.07);
  eyeball(g, tint, cx, cy, er, hash(twitch, 1) * TAU, 0.07 + (k < 0.1 ? 0.5 * (1 - k / 0.1) : 0), a, 1, 0.1 + 0.85 * Math.exp(-k * 22), marble ? F.marble : F.bone);
  g.lineStyle(er * 0.05, tint(F.bloodHot), a * 0.6);
  arcLine(g, cx, cy, er * 1.03, Math.PI * 0.1, Math.PI * 0.9);
  // Smaller limbs feeling their way out between the teeth, over the lid.
  for (let i = 0; i < 11; i++) {
    const ta = (i / 11) * TAU + 0.3 + Math.sin(t * 2.4 + i * 1.3) * 0.25;
    tentacle(g, cx + Math.cos(ta) * U * 0.42, cy + Math.sin(ta) * U * 0.42, ta + 0.5, U * (0.34 + 0.22 * hash(i, 51)) * slam, U * 0.055,
      Math.sin(t * 3.7 + i * 2.1) * 1.6 - 0.8, tc, a, tl);
  }

  // The mask, in two halves.
  const maskC = tint(marble ? F.marble : F.bone);
  const shade = tint(marble ? F.marbleShade : F.boneShade);
  const rx = U * 0.64;
  const ry = U * 0.94;
  const rot = 0.34 * open * slam;
  const squash = 1 - 0.22 * open;
  for (const sd of [-1, 1]) {
    const mx = cx + sd * U * 0.5 * open * slam + sd * Math.sin(t * 40 + sd) * amp * 0.12;
    const my = cy + U * 0.04;
    const X = maskXf(mx, my, sd, ry, rot, squash);
    maskHalf(g, mx, my, sd, rx, ry, rot, squash, U * 0.07, maskC, shade, ink, a);
    // Cracks run out from the split.
    const nc = marble ? 9 : 5;
    for (let i = 0; i < nc; i++) {
      const p = X(rx * 0.03, -ry * 0.85 + (1.7 * ry * (i + hash(i, sd + 60))) / nc);
      crack(g, p[0], p[1], (sd > 0 ? 0 : Math.PI) + (hash(i, sd + 61) - 0.5) * 1.4 + sd * rot, U * (0.2 + 0.35 * hash(i, sd + 62)), i * 5 + sd,
        ink, a * 0.9, Math.max(1.5, U * 0.01));
    }
    if (marble) {
      for (let i = 0; i < 7; i++) {
        const p = X(rx * (0.2 + 0.7 * hash(i, sd + 70)), ry * (-0.8 + 1.5 * hash(i, sd + 71)));
        crack(g, p[0], p[1], hash(i, sd + 72) * TAU, U * (0.14 + 0.2 * hash(i, sd + 73)), i * 9 + sd, tint(F.marbleVein), a * 0.6, Math.max(1, U * 0.006), false);
      }
    } else {
      // It is wet on the inside edge.
      for (let i = 0; i < 12; i++) {
        const p = X(rx * 0.25 * hash(i, sd + 80) * hash(i, sd + 81), ry * (-0.9 + 1.8 * hash(i, sd + 82)));
        g.fillStyle(tint(i % 3 ? F.blood : F.bloodDeep), a * 0.9);
        g.fillCircle(p[0], p[1], U * (0.008 + 0.022 * hash(i, sd + 83)));
      }
    }
    // Limbs hooked over the broken edge, holding it open.
    for (let i = 0; i < 4; i++) {
      const p = X(-rx * 0.04, ry * (-0.7 + 0.42 * i + 0.1 * hash(i, sd + 90)));
      tentacle(g, p[0], p[1], (sd > 0 ? 0 : Math.PI) + sd * (0.35 + Math.sin(t * 2.8 + i * 1.9) * 0.3), U * (0.24 + 0.14 * hash(i, sd + 91)) * slam, U * 0.06,
        sd * (1.5 + Math.sin(t * 3.3 + i) * 0.5), tc, a, tl);
    }
    // Blood from the laughing eye — a trickle on the mask, a flood on the statue.
    const e = X(rx * 0.46, -ry * 0.16);
    const run = clamp01(k * (marble ? 5 : 2.2));
    const bw = U * (marble ? 0.085 : 0.026);
    const bl = (h - e[1] + 40) * run * (marble ? 1 : 0.45);
    const pts: number[] = [];
    for (let i = 0; i <= 10; i++) pts.push(e[0] - bw * (1 + 0.35 * Math.sin(i * 1.3 + t * 2 + sd)) - (i === 0 ? bw : 0), e[1] + (bl * i) / 10);
    for (let i = 10; i >= 0; i--) pts.push(e[0] + bw * (1 + 0.35 * Math.sin(i * 1.7 + t * 2.6 + sd * 2)) + (i === 0 ? bw : 0), e[1] + (bl * i) / 10);
    g.fillStyle(tint(F.bloodDeep), a);
    poly(g, pts);
    g.fillStyle(tint(F.blood), a);
    g.fillRect(e[0] - bw * 0.5, e[1], bw, bl * 0.96);
    g.fillStyle(tint(F.bloodHot), a * 0.7);
    g.fillRect(e[0] - bw * 0.36, e[1], bw * 0.22, bl * 0.8);
    g.fillStyle(tint(F.blood), a);
    g.fillCircle(e[0], e[1] + bl, bw * 1.4);
    if (marble) {
      for (let i = 0; i < 3; i++) {
        const ox = (i - 1) * rx * 0.2 + sd * rx * 0.05;
        g.fillStyle(tint(F.bloodDeep), a);
        g.fillRect(e[0] + ox - bw * 0.16, e[1] + ry * 0.05, bw * 0.32, bl * (0.35 + 0.4 * hash(i, sd + 95)));
      }
      const m = X(rx * 0.3, ry * 0.46);
      g.fillStyle(tint(F.blood), a);
      g.fillRect(m[0] - bw * 0.3, m[1], bw * 0.6, bl * 0.5);
    }
  }

  // The slam itself: one white frame, then red closing in.
  if (k < 0.06) {
    g.fillStyle(tint(F.shirt), (1 - k / 0.06) * 0.6);
    g.fillRect(0, 0, w, h);
  }
  drawVignette(g, w, h, a, 0x000000);
  drawVignette(g, w, h, a * (0.3 + 0.2 * Math.sin(t * 17)), tint(F.blood));
}

/** The censor's screen: black, struck-out lines, hazard tape and a stamp frame. The centre band is left for the word itself. */
export function drawRedacted(g: G, w: number, h: number, k: number, t: number): void {
  k = clamp01(k);
  const a = k > 0.9 ? (1 - k) / 0.1 : 1;
  g.fillStyle(0x000000, a);
  g.fillRect(0, 0, w, h);
  const bandT = h / 2 - 50;
  const bandB = h / 2 + 50;
  // A page of text, nearly all of it struck out.
  let row = 0;
  for (let y = 40; y < h - 44; y += 30, row++) {
    if (y + 18 > bandT - 22 && y < bandB + 22) continue;
    const inK = clamp01((k - row * 0.004) / 0.07);
    let x = 70 + hash(row, 1) * 40;
    let i = 0;
    while (x < w - 90) {
      const wd = 26 + hash(row, i + 2) * 120;
      const end = Math.min(x + wd, w - 70);
      if (hash(row, i + 50) > 0.3) {
        // Struck out: a slab with a hard edge, slammed across from the left.
        g.fillStyle(F.ashDeep, a * 0.35);
        g.fillRect(x - 3, y - 1, (end - x + 6) * inK, 18);
        g.fillStyle(0x000000, a);
        g.fillRect(x - 1, y + 1, (end - x + 2) * inK, 14);
        g.lineStyle(1, F.ash, a * 0.5);
        g.strokeRect(x - 1, y + 1, (end - x + 2) * inK, 14);
      } else {
        g.fillStyle(F.ashDeep, a * 0.8);
        g.fillRect(x, y + 5, end - x, 6);
      }
      x = end + 12;
      i++;
    }
  }
  // Hazard tape along the top and bottom, crawling.
  const off = (t * 26) % 36;
  for (const ty of [8, h - 24]) {
    g.fillStyle(F.bloodDeep, a);
    g.fillRect(0, ty, w, 16);
    g.fillStyle(0x000000, a);
    for (let x = -36 + off; x < w + 36; x += 36) poly(g, [x, ty, x + 16, ty, x + 4, ty + 16, x - 12, ty + 16]);
    g.lineStyle(1, F.blood, a);
    g.lineBetween(0, ty, w, ty);
    g.lineBetween(0, ty + 16, w, ty + 16);
  }
  // The stamp frame round the centre band, a few degrees off true, its ink uneven.
  const stampK = clamp01((k - 0.04) / 0.05);
  const rot = -0.035;
  const sc = 1 + (1 - easeOut(stampK)) * 0.5;
  const R = (lx: number, ly: number): [number, number] => [w / 2 + (lx * Math.cos(rot) - ly * Math.sin(rot)) * sc, h / 2 + (lx * Math.sin(rot) + ly * Math.cos(rot)) * sc];
  if (stampK > 0) {
    for (const [hw, hh, lw] of [[270, 62, 6], [258, 51, 2]] as const) {
      const c = [R(-hw, -hh), R(hw, -hh), R(hw, hh), R(-hw, hh)];
      g.lineStyle(lw, F.blood, a * stampK);
      for (let i = 0; i < 4; i++) g.lineBetween(c[i][0], c[i][1], c[(i + 1) % 4][0], c[(i + 1) % 4][1]);
    }
    g.fillStyle(0x000000, a);
    for (let i = 0; i < 14; i++) {
      const top = i % 2 === 0;
      const p = R(-262 + hash(i, 7) * 524, top ? -62 : 62);
      g.fillRect(p[0] - 3 - hash(i, 8) * 7, p[1] - 4, 5 + hash(i, 8) * 12, 8);
    }
    // Corner ticks and a row of file marks under the frame.
    g.fillStyle(F.blood, a * stampK);
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const p = R(sx * 286, sy * 76);
      g.fillRect(p[0] - 5, p[1] - 1.5, 10, 3);
      g.fillRect(p[0] - 1.5, p[1] - 5, 3, 10);
    }
  }
  // Registration brackets in the corners of the screen.
  g.lineStyle(2, F.boneDim, a * 0.7);
  for (const [bx, by, sx, sy] of [[30, 38, 1, 1], [w - 30, 38, -1, 1], [30, h - 38, 1, -1], [w - 30, h - 38, -1, -1]]) {
    g.lineBetween(bx, by, bx + sx * 26, by);
    g.lineBetween(bx, by, bx, by + sy * 26);
  }
  // Tape tearing: a couple of scan lines jumping about.
  for (let i = 0; i < 3; i++) {
    const gy = hash(Math.floor(t * 12), i) * h;
    g.fillStyle(F.ash, a * 0.16);
    g.fillRect(0, gy, w, 1 + hash(i, Math.floor(t * 12)) * 3);
  }
}

/**
 * The torch, for an inverted geometry mask: white wherever the dark should be cut away. A cone
 * along `ang` and a small pool around the holder. `flicker` 0..1 starves it — shorter, narrower,
 * shaking, and near 1 it drops out for whole frames.
 */
export function drawFlashlightMask(g: G, x: number, y: number, ang: number, halfAng: number, len: number, selfR: number, flicker: number): void {
  const f = clamp01(flicker);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(x, y, Math.max(2, selfR * (1 - 0.25 * f * Math.random())));
  if (f > 0.55 && Math.random() < (f - 0.55) * 1.5) return;
  const l = len * (1 - 0.55 * f) * (1 - 0.14 * f * Math.random());
  const ha = halfAng * (1 - 0.4 * f);
  const a = ang + (Math.random() - 0.5) * 0.09 * f;
  wedge(g, x, y, l, a - ha, a + ha);
  // A soft-ish shoulder where the beam leaves the hand, so the cone does not start from a point.
  wedge(g, x, y, Math.min(l, selfR * 2.2), a - ha * 1.7, a + ha * 1.7);
}

// ── FearFx ───────────────────────────────────────────────────────────────────

const GROUND = 3.2;
const AIR = 9;

export class FearFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: FearColorFn) {
    super(scene, tint);
  }

  /** A phobia seeps up out of the floor: a stain spreads, limbs feel their way out of it, then draw back in under the thing that rose. */
  phobiaRise(x: number, y: number): void {
    const seed = Math.random() * 100;
    this.anim(GROUND, 760, (g, t) => {
      const grow = easeOut(Math.min(1, t / 0.4));
      const a = t > 0.75 ? (1 - t) / 0.25 : 1;
      g.fillStyle(this.tint(F.ink), 0.85 * a);
      blob(g, x, y + 20, 34 * grow, 13 * grow, seed, 0.35);
      g.lineStyle(1.2, this.tint(F.ashDeep), 0.6 * a);
      g.strokeEllipse(x, y + 20, 76 * grow, 28 * grow);
    });
    this.anim(AIR, 760, (g, t) => {
      const up = Math.sin(Math.PI * Math.min(1, t * 1.15));
      for (let i = 0; i < 7; i++) {
        const bx = x + (i - 3) * 8;
        tentacle(g, bx, y + 20, -Math.PI / 2 + (i - 3) * 0.16, (26 + 26 * hash(seed, i)) * up, 6, Math.sin(t * 9 + i * 2) * 1.2,
          this.tint(F.tentacle), 0.9, this.tint(F.tentacleLit));
      }
      // The shape of it, rising.
      g.fillStyle(this.tint(F.suit), 0.5 * (1 - t));
      g.fillEllipse(x, y + 20 - 30 * easeOut(t), 30, 60 * easeOut(t));
      for (let i = 0; i < 6; i++) {
        const f = (t * 1.4 + hash(seed, i + 10)) % 1;
        droplet(g, x + (hash(seed, i + 20) - 0.5) * 50, y + 18 - f * 44, -Math.PI / 2, 2, 6, this.tint(F.ink), (1 - f) * (1 - t));
      }
    });
  }

  /** A phobia comes apart: wisps curl upward, the mask falls in two and is gone before it lands. */
  phobiaDie(x: number, y: number): void {
    const wisps = Array.from({ length: 11 }, (_, i) => ({
      ox: (Math.random() - 0.5) * 34, oy: -30 + Math.random() * 50, a: -Math.PI / 2 + (Math.random() - 0.5) * 1.3, v: 26 + Math.random() * 40, c: (i % 2 ? 1 : -1) * (1 + Math.random()),
    }));
    this.anim(AIR, 720, (g, t) => {
      const e = easeOut(t);
      for (const w of wisps) {
        tentacle(g, x + w.ox + Math.cos(w.a) * w.v * e, y + w.oy + Math.sin(w.a) * w.v * e, w.a, 22 * (1 - t * 0.5), 9 * (1 - t), w.c * (0.6 + t * 1.6),
          this.tint(F.suit), 0.8 * (1 - t));
      }
      for (const sd of [-1, 1]) {
        maskHalf(g, x + sd * (3 + 16 * e), y - 22 + 46 * t * t, sd, 9.5, 11, 0.4 + 1.6 * t, 1, 1.4,
          this.tint(F.bone), this.tint(F.boneShade), this.tint(F.ink), 1 - easeIn(t));
      }
      g.fillStyle(this.tint(F.ink), 0.5 * (1 - t));
      g.fillEllipse(x, y + 24, 44 * (1 - e * 0.6), 11);
    });
  }

  /** A victim takes on fear: a small grey-black shudder. `amount` is a 0..1 fraction (a value over 1 is read as a percentage). */
  fearBurst(x: number, y: number, amount: number): void {
    const m = Phaser.Math.Clamp(amount > 1 ? amount / 100 : amount, 0.15, 1);
    const seed = Math.random() * 100;
    this.anim(AIR, 300 + 160 * m, (g, t) => {
      const r = 16 + 14 * m + 12 * easeOut(t);
      // A ring that cannot keep its shape.
      const n = 18;
      const p: number[] = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        const rr = r + (i % 2 ? 4 : -3) * m + Math.sin(t * 40 + i) * 2;
        p.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.lineStyle(2.2 * (1 - t) + 0.5, this.tint(F.ink), 0.9 * (1 - t));
      g.beginPath();
      g.moveTo(p[0], p[1]);
      for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
      g.closePath();
      g.strokePath();
      g.lineStyle(1, this.tint(F.ash), 0.7 * (1 - t));
      g.strokeCircle(x + Math.sin(t * 60) * 2, y, r - 4);
      const k = 3 + Math.round(4 * m);
      for (let i = 0; i < k; i++) {
        const a = hash(seed, i) * TAU;
        tentacle(g, x + Math.cos(a) * 10, y + Math.sin(a) * 10, a, (10 + 12 * m) * Math.sin(Math.PI * t), 3, Math.sin(t * 20 + i) * 1.4, this.tint(F.tentacle), 0.8 * (1 - t));
      }
    });
  }

  /** Steel (or a claw) opening someone up: the cut itself, and what comes out along its line. */
  slashHit(x: number, y: number, ang: number): void {
    this.flashIn(x, y, 13, F.bone, F.blood, AIR + 0.2);
    const drops = Array.from({ length: 12 }, () => ({ a: ang + (Math.random() - 0.5) * 1.3, v: 40 + Math.random() * 90, r: 1.5 + Math.random() * 2.2 }));
    this.anim(AIR, 420, (g, t) => {
      const e = easeOut(t);
      const len = 30 * Math.min(1, t / 0.18);
      const ux = Math.cos(ang) * len;
      const uy = Math.sin(ang) * len;
      const w = 4.5 * (1 - t);
      const nx = -Math.sin(ang) * w;
      const ny = Math.cos(ang) * w;
      g.fillStyle(this.tint(F.bloodDeep), 1 - t);
      poly(g, [x - ux, y - uy, x + nx, y + ny, x + ux, y + uy, x - nx, y - ny]);
      g.lineStyle(1.6, this.tint(F.shirt), (1 - t) * 0.95);
      g.lineBetween(x - ux * 0.8, y - uy * 0.8, x + ux * 0.8, y + uy * 0.8);
      for (const d of drops) {
        const px = x + Math.cos(d.a) * d.v * e;
        const py = y + Math.sin(d.a) * d.v * e + 46 * t * t;
        droplet(g, px, py, Math.atan2(Math.sin(d.a) * d.v * (1 - t) + 92 * t, Math.cos(d.a) * d.v * (1 - t)), d.r, 8 * (1 - t) + 2, this.tint(d.r > 2.6 ? F.bloodDeep : F.blood), 1 - t * t);
      }
    });
  }

  /** A rune goes out: its ring flies apart in hot pieces and leaves a scorch. */
  runeBreak(x: number, y: number): void {
    this.flashIn(x, y - 5, 14, F.runeHot, F.rune, AIR);
    const bits = Array.from({ length: 10 }, (_, i) => ({ a: (i / 10) * TAU + Math.random() * 0.5, v: 26 + Math.random() * 50, s: 3 + Math.random() * 4, r: Math.random() * TAU }));
    this.anim(GROUND, 900, (g, t) => {
      g.fillStyle(this.tint(F.ink), 0.45 * (1 - t));
      g.fillEllipse(x, y + 6, 36, 12);
      g.lineStyle(1.2, this.tint(F.runeDeep), 0.8 * (1 - t));
      g.strokeEllipse(x, y + 6, 30, 10);
    });
    this.anim(AIR, 520, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(2.5 * (1 - t), this.tint(F.runeHot), 1 - t);
      g.strokeCircle(x, y - 5, 12 + e * 30);
      for (const b of bits) {
        const px = x + Math.cos(b.a) * b.v * e;
        const py = y - 5 + Math.sin(b.a) * b.v * e + 34 * t * t;
        const ra = b.r + t * 7;
        g.fillStyle(this.tint(t < 0.4 ? F.runeHot : F.rune), 1 - t);
        g.fillTriangle(px + Math.cos(ra) * b.s, py + Math.sin(ra) * b.s, px + Math.cos(ra + 2.3) * b.s, py + Math.sin(ra + 2.3) * b.s, px + Math.cos(ra + 4.2) * b.s * 0.7, py + Math.sin(ra + 4.2) * b.s * 0.7);
      }
      for (let i = 0; i < 7; i++) {
        g.fillStyle(this.tint(F.runeHot), (1 - t) * 0.9);
        g.fillRect(x + (hash(i, 1) - 0.5) * 30 + Math.sin(t * 8 + i) * 3, y - 6 - e * (20 + 30 * hash(i, 2)), 1.8, 1.8);
      }
    });
  }

  /** A statue breaks. A decoy is only marble and dust; the `real` one had something inside it. */
  statueShatter(x: number, y: number, real: boolean): void {
    this.flashIn(x, y - 8, 20, F.shirt, real ? F.blood : F.marbleShade, AIR);
    const chunks = Array.from({ length: 15 }, () => ({
      a: Math.random() * TAU, v: 34 + Math.random() * 96, oy: -34 + Math.random() * 54, s: 3.5 + Math.random() * 6.5, r: Math.random() * TAU, sp: (Math.random() - 0.5) * 12, n: 3 + Math.floor(Math.random() * 3),
    }));
    const seed = Math.random() * 100;
    if (real) {
      this.bloodSplash(x, y + 6);
      this.anim(AIR + 0.1, 640, (g, t) => {
        const up = Math.sin(Math.PI * Math.min(1, t * 1.2));
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * TAU + hash(seed, i);
          tentacle(g, x, y - 6, a, (30 + 34 * hash(seed, i + 9)) * up, 7, Math.sin(t * 12 + i * 2) * 1.5, this.tint(F.tentacle), 1 - t * t, this.tint(F.tentacleLit));
        }
        eyeball(g, this.tint, x + 20 * easeOut(t), y - 14 + 40 * t * t, 5.5, t * 9, 0.8, 1 - t * t, 1, 0.4);
      });
    }
    this.anim(AIR, 700, (g, t) => {
      const e = easeOut(t);
      // Dust.
      g.fillStyle(this.tint(F.marbleShade), 0.3 * (1 - t));
      g.fillCircle(x, y - 6 - 8 * t, 24 + 26 * e);
      g.fillCircle(x - 16 * e, y + 6, 14 + 14 * e);
      g.fillCircle(x + 18 * e, y + 2, 12 + 16 * e);
      for (const c of chunks) {
        const px = x + Math.cos(c.a) * c.v * e;
        const py = Math.min(y + 26, y + c.oy + Math.sin(c.a) * c.v * e * 0.6 + 120 * t * t);
        const p: number[] = [];
        for (let i = 0; i < c.n; i++) {
          const a = c.r + c.sp * t + (i / c.n) * TAU;
          const rr = c.s * (0.7 + 0.5 * hash(c.s, i));
          p.push(px + Math.cos(a) * rr, py + Math.sin(a) * rr);
        }
        g.fillStyle(this.tint(c.s > 7 ? F.marbleShade : F.marble), 1 - t * t * t);
        g.lineStyle(1, this.tint(F.marbleVein), (1 - t) * 0.8);
        poly(g, p, true);
      }
    });
  }

  /** The gentleman comes off: a column of shadow takes him, the mask splits, petals scatter, and something much larger steps out. */
  manifest(x: number, y: number): void {
    const petals = Array.from({ length: 9 }, () => ({ a: Math.random() * TAU, v: 30 + Math.random() * 50, r: Math.random() * TAU }));
    const seed = Math.random() * 100;
    this.anim(GROUND, 900, (g, t) => {
      const grow = Math.sin(Math.PI * Math.min(1, t * 1.1));
      g.fillStyle(this.tint(F.ink), 0.85 * grow);
      blob(g, x, y + 14, 58 * grow, 22 * grow, seed, 0.3);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        tentacle(g, x + Math.cos(a) * 50 * grow, y + 14 + Math.sin(a) * 18 * grow, a + 0.6, 22 * grow, 5, 1.6, this.tint(F.tentacle), 0.8 * grow);
      }
    });
    this.anim(AIR, 900, (g, t) => {
      const e = easeOut(t);
      // The column.
      const colA = t < 0.6 ? Math.min(1, t / 0.15) : 1 - (t - 0.6) / 0.4;
      const hw = 26 + 10 * Math.sin(t * 30) * (1 - t);
      const top = y - 40 - 110 * Math.min(1, t / 0.4);
      g.fillStyle(this.tint(F.ink), 0.82 * colA);
      poly(g, [x - hw, y + 18, x - hw * 0.75, top + 20, x - hw * 0.3, top, x + hw * 0.4, top + 12, x + hw * 0.8, top + 30, x + hw, y + 18]);
      for (let i = 0; i < 6; i++) {
        tentacle(g, x + (i - 2.5) * 9, top + 24, -Math.PI / 2 + (i - 2.5) * 0.2, 30 + 20 * hash(seed, i), 8, Math.sin(t * 14 + i * 2) * 1.4, this.tint(F.suitDeep), 0.9 * colA);
      }
      // The mask goes.
      if (t < 0.7) {
        const mt = t / 0.7;
        for (const sd of [-1, 1]) {
          maskHalf(g, x + sd * 30 * easeOut(mt), y - 6 - 30 * mt + 60 * mt * mt, sd, 12, 13, mt * 2.4, 1, 1.5,
            this.tint(F.bone), this.tint(F.boneShade), this.tint(F.ink), 1 - mt * mt);
        }
      }
      // The rose, in pieces, reddening as they fall.
      for (const p of petals) {
        const px = x - 12 + Math.cos(p.a) * p.v * e;
        const py = y + 12 + Math.sin(p.a) * p.v * e * 0.6 - 30 * e + 60 * t * t;
        g.fillStyle(this.tint(t > 0.35 ? F.blood : F.rose), 1 - t * t);
        g.fillEllipse(px, py, 5 * Math.abs(Math.cos(p.r + t * 9)) + 1.5, 4);
      }
      // Steel, catching what light there is, at the end.
      if (t > 0.55) {
        const gt = (t - 0.55) / 0.45;
        g.lineStyle(3 * (1 - gt), this.tint(F.steelLit), 1 - gt);
        g.lineBetween(x - 40, y + 26 - 70 * gt, x + 40, y - 30 - 70 * gt);
        g.lineStyle(2.5 * (1 - gt), this.tint(F.blood), 1 - gt);
        g.strokeCircle(x, y, 30 + 60 * easeOut(gt));
      }
    });
  }

  /** The slasher goes back under: he sinks straight down into his own shadow and it closes over him. */
  revert(x: number, y: number): void {
    const seed = Math.random() * 100;
    this.anim(GROUND, 760, (g, t) => {
      const sz = t < 0.3 ? easeOut(t / 0.3) : 1 - easeIn((t - 0.3) / 0.7);
      g.fillStyle(this.tint(F.ink), 0.92);
      blob(g, x, y + 16, 46 * sz, 17 * sz, seed, 0.25);
      for (let i = 0; i < 3; i++) {
        const f = (t * 2 + i / 3) % 1;
        g.lineStyle(1.3, this.tint(F.ashDeep), 0.7 * (1 - f) * sz);
        g.strokeEllipse(x, y + 16, 92 * sz * f, 34 * sz * f);
      }
    });
    this.anim(AIR, 620, (g, t) => {
      const sink = easeIn(t);
      const hgt = 62 * (1 - sink);
      // His outline going down, shoulders last.
      g.fillStyle(this.tint(F.suitDeep), 0.9 * (1 - t * 0.4));
      poly(g, [x - 30, y + 16, x - 32, y + 16 - hgt * 0.6, x - 14, y + 16 - hgt, x + 14, y + 16 - hgt, x + 32, y + 16 - hgt * 0.6, x + 30, y + 16]);
      g.fillStyle(this.tint(F.ash), 0.8 * (1 - t));
      g.fillEllipse(x, y + 16 - hgt * 0.86, 20, 22 * (1 - sink));
      for (let i = 0; i < 5; i++) {
        const f = (t * 1.5 + hash(seed, i)) % 1;
        g.lineStyle(1.2, this.tint(F.ink), 0.9 * (1 - f));
        g.strokeCircle(x + (hash(seed, i + 5) - 0.5) * 60, y + 15 - f * 8, 2 + 3 * f);
      }
    });
  }

  /** A shadow puddle: the slasher leaving through the floor, or arriving through it. */
  teleport(x: number, y: number): void {
    const seed = Math.random() * 100;
    this.anim(GROUND, 520, (g, t) => {
      const sz = Math.sin(Math.PI * Math.min(1, t * 1.05));
      g.fillStyle(this.tint(F.ink), 0.95);
      blob(g, x, y + 16, 52 * sz, 19 * sz, seed, 0.3);
      g.fillStyle(0x000000, 1);
      g.fillEllipse(x, y + 16, 70 * sz, 22 * sz);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        tentacle(g, x + Math.cos(a) * 46 * sz, y + 16 + Math.sin(a) * 17 * sz, a + 0.9, 16 * sz + 4, 4.5, 1.7 + Math.sin(t * 16 + i), this.tint(F.tentacle), 0.9 * sz);
      }
      g.lineStyle(1.4, this.tint(F.ash), 0.6 * (1 - t));
      g.strokeEllipse(x, y + 16, 110 * easeOut(t), 40 * easeOut(t));
    });
    this.anim(AIR, 420, (g, t) => {
      for (let i = 0; i < 9; i++) {
        const f = Math.min(1, t * (1 + hash(seed, i)));
        droplet(g, x + (hash(seed, i + 10) - 0.5) * 70, y + 12 - f * (30 + 40 * hash(seed, i + 20)), -Math.PI / 2, 2.4 * (1 - f) + 0.6, 9, this.tint(F.ink), 1 - f);
      }
      g.fillStyle(this.tint(F.suitDeep), 0.55 * (1 - t));
      g.fillEllipse(x, y - 12, 40 * (1 - t * 0.5), 76 * (1 - easeIn(t)));
    });
  }

  /** Blood thrown on the floor: a burst of droplets and a splat that stays a while. */
  bloodSplash(x: number, y: number): void {
    const seed = Math.random() * 100;
    const drops = Array.from({ length: 14 }, () => ({ a: Math.random() * TAU, v: 22 + Math.random() * 70, r: 1.4 + Math.random() * 2.4 }));
    this.anim(GROUND, 1500, (g, t) => {
      const grow = easeOut(Math.min(1, t / 0.12));
      const a = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
      g.fillStyle(this.tint(F.bloodDeep), 0.85 * a);
      blob(g, x, y + 8, 26 * grow, 11 * grow, seed, 0.6);
      g.fillStyle(this.tint(F.blood), 0.8 * a);
      blob(g, x - 2, y + 7, 17 * grow, 7 * grow, seed + 4, 0.5);
      for (let i = 0; i < 8; i++) {
        const sa = hash(seed, i + 30) * TAU;
        const sr = (26 + 22 * hash(seed, i + 40)) * grow;
        g.fillEllipse(x + Math.cos(sa) * sr, y + 8 + Math.sin(sa) * sr * 0.42, 5 + 5 * hash(seed, i + 50), 2.2);
      }
      g.fillStyle(this.tint(F.bloodHot), 0.4 * a);
      g.fillEllipse(x - 7, y + 5, 9, 2.4);
    });
    this.anim(AIR, 380, (g, t) => {
      const e = easeOut(t);
      for (const d of drops) {
        droplet(g, x + Math.cos(d.a) * d.v * e, y + Math.sin(d.a) * d.v * e * 0.7 - 16 * e + 44 * t * t, d.a, d.r, 7 * (1 - t) + 1.5, this.tint(d.r > 2.8 ? F.bloodDeep : F.blood), 1 - t * t);
      }
    });
  }
}

// ── FearAvatar ───────────────────────────────────────────────────────────────

const FEAR_AVATAR: AvatarSpec = {
  hands: [
    { r: 9, color: F.bone, alpha: 0.12 },
    { r: 6.6, color: F.boneShade, alpha: 1 },
    { r: 5.3, color: F.bone, alpha: 1 },
    { r: 1.6, color: F.shirt, alpha: 0.9, ox: -1.6, oy: -1.8 },
  ],
  // The rig's eyes are the holes in the mask.
  eyeWhite: F.ink,
  eyePupil: F.suitLit,
};

const SLASHER_SCALE = 1.35;
const SWING_GESTURES: readonly ArmGesture[] = ['punch', 'sweep', 'slam', 'dash'];

/**
 * The Fear user: a charcoal orb in a suit, bow tie and white gloves, a white rose on the lapel,
 * and a smiling comedy mask where a face should be. `setForm('slasher')` swaps him for what the
 * suit was holding in: a third again as big, a stained work jacket, a pale blank mask, and a
 * machete dragged along the floor behind him.
 */
export class FearAvatar extends BaseAvatar {
  readonly owner: 'player' | 'npc';
  private form: 'fear' | 'slasher' = 'fear';
  private haunting = false;
  private rs = 1;
  /** 1 just after a striking gesture, decaying — lifts the machete off the floor and through the swing. */
  private swing = 0;
  /** World-space history of the machete's tip, newest first: the groove it leaves. */
  private scrape: { x: number; y: number }[] = [];
  private scrapeAccum = 0;

  constructor(scene: Phaser.Scene, tint: FearColorFn, owner: 'player' | 'npc', depth = 6) {
    super(scene, tint, depth, FEAR_AVATAR);
    this.owner = owner;
  }

  /** Radians. The mask turns a little toward it; the machete trails directly away from it. */
  setFacing(angle: number): void { super.setFacing(angle); }

  setForm(form: 'fear' | 'slasher'): void {
    if (form === this.form) return;
    this.form = form;
    this.scrape = [];
    this.setRigScale(form === 'slasher' ? SLASHER_SCALE : 1);
    this.restyle();
  }

  /** Slasher only: drains him to grey and black. */
  setHaunting(on: boolean): void {
    if (on === this.haunting) return;
    this.haunting = on;
    this.restyle();
  }

  setRigScale(v: number): void {
    this.rs = Phaser.Math.Clamp(v, 0.2, 3);
    super.setRigScale(v);
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    if (SWING_GESTURES.includes(gesture)) this.swing = 1;
    super.play(gesture, angle, duration);
  }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.swing = Math.max(0, this.swing - delta / 420);
    this.scrapeAccum += delta;
    super.update(delta, x, y, alpha);
  }

  protected applyMastery(_on: boolean): void { this.restyle(); }

  /** Gloves for the gentleman, work gloves for the slasher, ash for the haunt. */
  private restyle(): void {
    const slasher = this.form === 'slasher';
    const grey = slasher && this.haunting;
    const set = (layer: number, color: number, alpha: number): void =>
      this.forEachHandLayer(layer, (arc) => arc.setFillStyle(this.tint(color), alpha));
    if (slasher) {
      set(0, F.ink, 0.3);
      set(1, F.ink, 1);
      set(2, grey ? F.ashDeep : F.stain, 1);
      set(3, grey ? F.ash : F.jacketLit, 0.7);
    } else {
      set(0, this.mastered ? F.blood : F.bone, this.mastered ? 0.3 : 0.12);
      set(1, F.boneShade, 1);
      set(2, F.bone, 1);
      set(3, F.shirt, 0.9);
    }
  }

  private maskPos(x: number, y: number): { mx: number; my: number; bob: number } {
    const bob = Math.sin(this.t * 2.6) * 1.1;
    return { mx: x + Math.cos(this.facing) * 2.2, my: y - 2 + Math.sin(this.facing) * 1.8 + bob, bob };
  }

  protected drawGlow(g: G, x: number, y: number, a: number, alpha: number): void {
    const ink = this.tint(F.ink);
    if (this.form === 'fear') {
      g.fillStyle(ink, a * 0.42);
      g.fillEllipse(x, y + 18, 46, 13);
      if (this.mastered) {
        g.fillStyle(this.tint(F.bloodDeep), a * 0.35);
        g.fillEllipse(x, y + 19, 56 + Math.sin(this.t * 2) * 3, 16);
      }
      return;
    }
    // The slasher: a wide shadow, and shoulders broader than the body they sit on.
    g.fillStyle(ink, a * 0.6);
    g.fillEllipse(x, y + 19, 62, 17);
    if (this.haunting) {
      g.fillStyle(ink, a * 0.3);
      g.fillCircle(x, y, 34 + Math.sin(this.t * 3) * 2);
    }
    this.drawMachete(g, x, y, alpha);
    g.fillStyle(this.tint(F.suitDeep), alpha);
    g.fillEllipse(x, y + 7, 60, 36);
    g.fillStyle(this.tint(this.haunting ? F.ashDeep : F.jacket), alpha);
    g.fillEllipse(x, y + 6, 56, 32);
    g.lineStyle(1.2, this.tint(this.haunting ? F.ash : F.jacketLit), alpha * 0.8);
    arcLine(g, x, y + 6, 27, Math.PI * 1.08, Math.PI * 1.35);
    arcLine(g, x, y + 6, 27, Math.PI * 1.65, Math.PI * 1.92);
  }

  /** The machete, held low in the right hand and dragged behind; a strike gesture swings it out through the hand. */
  private drawMachete(g: G, x: number, y: number, alpha: number): void {
    const rs = this.rs;
    const hx = x + (this.armX[1] - x) / rs;
    const hy = y + (this.armY[1] - y) / rs;
    const drag = this.facing + Math.PI;
    const out = Math.atan2(hy - y, hx - x);
    const ang = drag + Phaser.Math.Angle.Wrap(out - drag) * Math.min(1, this.swing * 1.6);
    const ux = Math.cos(ang);
    const uy = Math.sin(ang);
    const P = (u: number, v: number): [number, number] => [hx + ux * u - uy * v, hy + uy * u + ux * v];
    const flat = (uv: number[]): number[] => {
      const o: number[] = [];
      for (let i = 0; i < uv.length; i += 2) { const p = P(uv[i], uv[i + 1]); o.push(p[0], p[1]); }
      return o;
    };
    const grey = this.haunting;
    const tip = P(48, -0.5);

    // The groove it has cut in the floor, in world space so it stays where it was scratched.
    const wx = x + (tip[0] - x) * rs;
    const wy = y + (tip[1] - y) * rs;
    const last = this.scrape[0];
    const moved = last ? Math.hypot(wx - last.x, wy - last.y) : 0;
    if (!last || moved > 90 || this.swing > 0.25) this.scrape = [{ x: wx, y: wy }];
    else if (this.scrapeAccum >= 40 && moved > 1.5) {
      this.scrapeAccum = 0;
      this.scrape.unshift({ x: wx, y: wy });
      if (this.scrape.length > 14) this.scrape.pop();
    }
    for (let i = 0; i < this.scrape.length - 1; i++) {
      const p = this.scrape[i];
      const q = this.scrape[i + 1];
      const f = 1 - i / this.scrape.length;
      g.lineStyle(2.2 * f + 0.4, this.tint(F.ink), alpha * 0.55 * f);
      g.lineBetween(x + (p.x - x) / rs, y + (p.y - y) / rs, x + (q.x - x) / rs, y + (q.y - y) / rs);
    }
    if (this.swing < 0.2 && moved > 1.5) {
      for (let i = 0; i < 3; i++) {
        g.fillStyle(this.tint(grey ? F.bone : F.lampHot), alpha * 0.9);
        g.fillRect(tip[0] + (Math.random() - 0.5) * 9, tip[1] + (Math.random() - 0.5) * 7, 1.4, 1.4);
      }
    }

    // Grip, guard, blade.
    const h0 = P(-8, 0);
    const h1 = P(5, 0);
    g.lineStyle(5.4, this.tint(F.ink), alpha);
    g.lineBetween(h0[0], h0[1], h1[0], h1[1]);
    g.lineStyle(3.4, this.tint(grey ? F.ashDeep : F.stain), alpha);
    g.lineBetween(h0[0], h0[1], h1[0], h1[1]);
    const g0 = P(5.5, -4.6);
    const g1 = P(5.5, 5);
    g.lineStyle(2.4, this.tint(F.steelDeep), alpha);
    g.lineBetween(g0[0], g0[1], g1[0], g1[1]);
    g.fillStyle(this.tint(grey ? F.ash : F.steel), alpha);
    g.lineStyle(1.3, this.tint(F.ink), alpha);
    poly(g, flat([6, -3.2, 40, -3.7, 48, -0.5, 46, 3.6, 37, 6.4, 20, 5.4, 6, 3.5]), true);
    const f0 = P(9, -0.9);
    const f1 = P(39, -1.1);
    g.lineStyle(1.1, this.tint(F.steelDeep), alpha * 0.9);
    g.lineBetween(f0[0], f0[1], f1[0], f1[1]);
    const e0 = P(8, 4);
    const e1 = P(37, 6.4);
    const e2 = P(46, 3.6);
    g.lineStyle(1.2, this.tint(grey ? F.bone : F.steelLit), alpha);
    g.lineBetween(e0[0], e0[1], e1[0], e1[1]);
    g.lineBetween(e1[0], e1[1], e2[0], e2[1]);
    // It has been used.
    g.fillStyle(this.tint(grey ? F.ink : F.bloodDeep), alpha * 0.9);
    poly(g, flat([30, 6, 37, 6.4, 46, 3.6, 48, -0.5, 42, 0.6, 38, 3, 33, 3.4]));
    if (!grey) {
      const d = P(41, 5.2);
      const f = (this.t * 0.7) % 1;
      droplet(g, d[0], d[1] + f * 9, Math.PI / 2, 1.3, 3.2, this.tint(F.blood), alpha * (1 - f));
    }
  }

  protected drawBody(g: G, x: number, y: number, _a: number, alpha: number): void {
    if (this.form === 'slasher') this.drawSlasherBody(g, x, y, alpha);
    else this.drawGentBody(g, x, y, alpha);
  }

  private drawGentBody(g: G, x: number, y: number, alpha: number): void {
    const c = this.tint;
    const { mx, my } = this.maskPos(x, y);
    // The suit: one charcoal orb, a rim light, slicked hair catching it.
    g.fillStyle(c(F.suitDeep), alpha);
    g.fillCircle(x, y, 22.5);
    g.fillStyle(c(F.suit), alpha);
    g.fillCircle(x - 0.6, y - 0.6, 20.6);
    g.lineStyle(1.4, c(F.suitLit), alpha * 0.9);
    arcLine(g, x, y, 20.4, Math.PI * 1.08, Math.PI * 1.55);
    g.lineStyle(1, c(F.suitLit), alpha * 0.6);
    arcLine(g, x + 3, y - 3, 15.5, Math.PI * 1.2, Math.PI * 1.62);
    // Shirt front, lapels, bow tie.
    g.fillStyle(c(F.shirt), alpha);
    g.fillTriangle(x - 6.5, y + 10.5, x + 6.5, y + 10.5, x, y + 21.5);
    g.fillStyle(c(F.suitLit), alpha);
    poly(g, [x - 6.5, y + 10.5, x - 14, y + 10, x - 5, y + 20.4, x, y + 21.5]);
    poly(g, [x + 6.5, y + 10.5, x + 14, y + 10, x + 5, y + 20.4, x, y + 21.5]);
    g.lineStyle(1, c(F.suitDeep), alpha);
    g.lineBetween(x - 14, y + 10, x - 9, y + 14);
    g.lineBetween(x + 14, y + 10, x + 9, y + 14);
    g.fillStyle(c(F.ink), alpha);
    g.fillTriangle(x, y + 13, x - 4.6, y + 10.6, x - 4.6, y + 15.2);
    g.fillTriangle(x, y + 13, x + 4.6, y + 10.6, x + 4.6, y + 15.2);
    g.fillCircle(x, y + 13, 1.3);
    g.fillCircle(x, y + 17.6, 0.8);
    // The mask.
    g.fillStyle(c(F.ink), alpha * 0.45);
    g.fillEllipse(mx + 0.8, my + 1.4, 28, 26);
    g.fillStyle(c(F.boneShade), alpha);
    g.fillEllipse(mx, my, 27, 25);
    g.fillStyle(c(F.bone), alpha);
    g.fillEllipse(mx - 0.6, my - 0.7, 25, 23);
    g.fillStyle(c(F.boneDim), alpha * 0.5);
    g.fillEllipse(mx + 6.5, my + 4, 7, 9);
    // The smile: a crescent with the corners pulled up. It never changes.
    const s: number[] = [];
    for (let i = 0; i <= 8; i++) { const u = -1 + i / 4; s.push(mx + u * 7.6, my + 9.2 - 3.6 * u * u); }
    for (let i = 8; i >= 0; i--) { const u = -1 + i / 4; s.push(mx + u * 7.6, my + 6.2 - 0.6 * u * u); }
    g.fillStyle(c(F.ink), alpha);
    poly(g, s);
    g.lineStyle(0.9, c(F.boneShade), alpha);
    g.lineBetween(mx - 7.6, my + 5.6, mx - 9.2, my + 4.4);
    g.lineBetween(mx + 7.6, my + 5.6, mx + 9.2, my + 4.4);
  }

  private drawSlasherBody(g: G, x: number, y: number, alpha: number): void {
    const c = this.tint;
    const grey = this.haunting;
    const { mx, my } = this.maskPos(x, y);
    const jacket = c(grey ? F.ashDeep : F.jacket);
    const lit = c(grey ? F.ash : F.jacketLit);
    g.fillStyle(c(F.suitDeep), alpha);
    g.fillCircle(x, y, 22.5);
    g.fillStyle(jacket, alpha);
    g.fillCircle(x - 0.5, y - 0.5, 20.8);
    g.lineStyle(1.3, lit, alpha * 0.8);
    arcLine(g, x, y, 20.4, Math.PI * 1.1, Math.PI * 1.5);
    // Collar flaps, a zip, stitching.
    g.fillStyle(lit, alpha);
    poly(g, [x - 2, y + 10, x - 13, y + 8.5, x - 9, y + 15, x - 1.5, y + 14]);
    poly(g, [x + 2, y + 10, x + 13, y + 8.5, x + 9, y + 15, x + 1.5, y + 14]);
    g.lineStyle(1.5, c(F.steelDeep), alpha);
    g.lineBetween(x, y + 10, x, y + 21.5);
    g.lineStyle(0.8, c(F.ink), alpha * 0.7);
    for (let i = 0; i < 4; i++) g.lineBetween(x - 1.6, y + 12.5 + i * 2.6, x + 1.6, y + 12.5 + i * 2.6);
    g.lineBetween(x - 17, y + 6, x - 13, y + 13);
    g.lineBetween(x + 17, y + 6, x + 13, y + 13);
    // What is on the jacket did not start out as his.
    const stain = c(grey ? F.ink : F.stain);
    g.fillStyle(stain, alpha * 0.9);
    g.fillCircle(x + 9, y + 16, 3.1);
    g.fillCircle(x + 12.5, y + 13, 1.7);
    g.fillCircle(x - 11.5, y + 14.5, 2.3);
    g.fillEllipse(x - 15, y + 3, 3.4, 6);
    g.fillRect(x + 8.4, y + 16, 1.3, 5);
    // The mask: long, pale, and with nothing on it but two holes.
    const pale = c(grey ? F.ash : F.boneDim);
    g.lineStyle(1.6, c(F.ink), alpha);
    g.lineBetween(mx - 11, my - 3, x - 20, y - 6);
    g.lineBetween(mx + 11, my - 3, x + 20, y - 6);
    g.fillStyle(c(F.ink), alpha * 0.6);
    g.fillEllipse(mx + 0.8, my + 1.4, 25, 28.5);
    g.fillStyle(c(grey ? F.ashDeep : F.boneShade), alpha);
    g.fillEllipse(mx, my, 24, 27.5);
    g.fillStyle(pale, alpha);
    g.fillEllipse(mx - 0.6, my - 0.8, 22, 25.5);
    if (!grey) {
      g.fillStyle(c(F.bone), alpha * 0.55);
      g.fillEllipse(mx - 4, my - 6.5, 9, 7);
    }
    g.fillStyle(c(grey ? F.ink : F.boneShade), alpha * 0.45);
    g.fillEllipse(mx + 5.5, my + 6, 8, 10);
    crack(g, mx + 3, my - 12.5, Math.PI * 0.62, 9, 3.3, c(F.ink), alpha * 0.8, 0.9);
  }

  /** Over the eyes: the mask's cheeks (which turn the round holes into laughing arches), the rose, and the slasher's grime. */
  protected drawExtras(g: G, x: number, y: number, _a: number, alpha: number): void {
    const c = this.tint;
    const bob = Math.sin(this.t * 2.6) * 1.1;
    const lx = Math.cos(this.facing);
    const ly = Math.sin(this.facing);
    if (this.form === 'slasher') {
      // Streaks run down from the eye holes.
      const grey = this.haunting;
      for (const sd of [-1, 1]) {
        const ex = x + sd * 7.2 + lx * 2.4;
        const ey = y - 4 + ly * 2 + bob;
        g.lineStyle(1.2, c(grey ? F.ink : F.ashDeep), alpha * 0.8);
        g.lineBetween(ex - 0.6, ey + 3.4, ex - 0.9 * sd, ey + 9.5);
        g.lineStyle(0.8, c(grey ? F.ink : F.stain), alpha * 0.8);
        g.lineBetween(ex + 1.3, ey + 3.2, ex + 1.5, ey + 6.5);
      }
      if (grey) {
        // Burning off him in black.
        for (let i = 0; i < 5; i++) {
          tentacle(g, x + (i - 2) * 9, y - 17 + Math.abs(i - 2) * 4, -Math.PI / 2 + (i - 2) * 0.22, 11 + 5 * Math.sin(this.t * 3 + i * 1.7), 5,
            Math.sin(this.t * 2.6 + i * 2.2) * 1.3, c(F.ink), alpha * 0.75);
        }
      }
      return;
    }
    for (const sd of [-1, 1]) {
      g.fillStyle(c(F.bone), alpha);
      g.fillCircle(x + sd * 7.2 + lx * 2.4, y - 4 + ly * 2 + bob + 3.5, 4.5);
    }
    // The rose on the left lapel: a whorl of petals over two leaves.
    const rx = x - 13;
    const ry = y + 14.5;
    const red = this.mastered;
    g.fillStyle(c(F.leaf), alpha);
    g.fillTriangle(rx - 1, ry + 1, rx - 6.5, ry + 4.5, rx - 2, ry + 5.5);
    g.fillTriangle(rx + 1, ry + 2, rx + 3.5, ry + 7, rx - 1, ry + 5);
    g.fillStyle(c(red ? F.bloodDeep : F.boneShade), alpha);
    g.fillCircle(rx, ry, 4.9);
    g.fillStyle(c(red ? F.blood : F.rose), alpha);
    g.fillCircle(rx - 0.3, ry - 0.3, 4.2);
    g.lineStyle(0.9, c(red ? F.bloodDeep : F.boneDim), alpha);
    arcLine(g, rx, ry, 2.9, 0.3, 3.4);
    arcLine(g, rx + 0.3, ry + 0.2, 1.7, 2.6, 6);
    arcLine(g, rx - 0.4, ry - 0.3, 3.5, 3.9, 5.6);
    g.fillStyle(c(red ? F.bloodHot : F.shirt), alpha);
    g.fillCircle(rx - 1.4, ry - 1.6, 0.9);
    if (red) {
      // It drips.
      const f = (this.t * 0.55) % 1;
      g.lineStyle(1.2, c(F.blood), alpha * 0.9);
      g.lineBetween(rx + 0.6, ry + 4, rx + 0.6, ry + 6.5 + 2 * Math.min(1, f * 3));
      droplet(g, rx + 0.6, ry + 7.5 + f * 9, Math.PI / 2, 1.3, 3, c(F.blood), alpha * (1 - f * f));
    }
  }
}
