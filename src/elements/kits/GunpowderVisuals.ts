import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Gunpowder renders: the powder-monkey rig (bomb hands, eyes, a
 * bandolier worn over the crown and a musket actually held in the lead fist), the hoard and heat
 * auras, and every one-shot effect its abilities throw off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts and are shared with the other elements. What stays here is what makes
 * gunpowder gunpowder: the muzzle petal, the rolling smoke puff, and the hardware they come out
 * of.
 *
 * Every structural colour must come from the GUNPOWDER palette below. Gunpowder has no
 * skin yet, but every call still routes through the owner's `gunpowderColor`
 * mapper, so the day one lands it is a table edit in SkinsKit rather than a sweep through
 * this file.
 */

/** `(base) => displayed` — SkinsKit.gunpowderColor bound to one owner. */
export type GunpowderColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const GUNPOWDER = {
  /** Burnt powder, from the black grain up to spent smoke. */
  void: 0x140a1c,
  soot: 0x241428,
  char: 0x3a2436,
  ash: 0x6b5f66,
  smoke: 0x9a8f94,
  /** The element's own funeral violet — the skull on its badge. */
  plum: 0x440066,
  violet: 0x6a2088,
  orchid: 0xcc44ff,
  lilac: 0xe0a8ff,
  /** Ignition, from the first spark to the white heart of a blast. */
  ember: 0xff4411,
  flame: 0xff7722,
  blaze: 0xffaa33,
  gold: 0xffcc55,
  glow: 0xffeeaa,
  white: 0xffffff,
  /** Hardware — stocks, locks, barrels. */
  stock: 0x5c4326,
  wood: 0x7a5a34,
  brass: 0xd9a441,
  steel: 0x8d97a3,
  chrome: 0xd8e0e8,
  /** BlunderBlast's silver vacuum. */
  silver: 0xcfd4da,
  /**
   * The regimentals. Gunpowder is a line-infantry musketeer out of the revolutionary era, so the
   * character wears a uniform rather than a colour scheme: a blue coat with buff facings turned
   * back over a linen waistcoat, pipeclayed white cross-belts, and a black felt tricorn with a
   * cockade on the brim. These are the only cold-warm colours in the element and they are only
   * ever allowed on the rig — never on an effect.
   */
  coatDeep: 0x101c38,
  coat: 0x1d3364,
  coatLit: 0x33518f,
  buff: 0xcbb489,
  linen: 0xe3dbc6,
  belt: 0xf4efe2,
  crimson: 0xa61f2c,
  felt: 0x15121e,
  feltLit: 0x2c2738,
} as const;

export interface Pt { x: number; y: number }

// ── Path helpers ──────────────────────────────────────────────────────────

function fillPts(g: Phaser.GameObjects.Graphics, pts: Pt[]): void {
  if (pts.length < 3) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
}

function strokePts(g: Phaser.GameObjects.Graphics, pts: Pt[], close = false): void {
  if (pts.length < 2) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  if (close) g.closePath();
  g.strokePath();
}

/** Local-to-world for a shape drawn along `angle` at (cx, cy). */
function frame(cx: number, cy: number, angle: number): (lx: number, ly: number) => Pt {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return (lx, ly) => ({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos });
}

/** Blend two palette entries — used for barrels cooling from red-hot back to iron. */
export function mixColor(from: number, to: number, t: number): number {
  const k = Phaser.Math.Clamp(t, 0, 1);
  const r = Math.round(((from >> 16) & 0xff) + (((to >> 16) & 0xff) - ((from >> 16) & 0xff)) * k);
  const g = Math.round(((from >> 8) & 0xff) + (((to >> 8) & 0xff) - ((from >> 8) & 0xff)) * k);
  const b = Math.round((from & 0xff) + ((to & 0xff) - (from & 0xff)) * k);
  return (r << 16) | (g << 8) | b;
}

// ── The primitive ─────────────────────────────────────────────────────────

/**
 * Gunpowder's primitive: a blast petal — the lobe a charge of powder throws when it lets go. It
 * leaves the origin narrow, flares hard, then tears into a ragged crown of tongues at the far
 * end.
 *
 * Muzzle flashes, grenade blooms, the retreat charge, firework shells and the BlunderBlast cough
 * are all rosettes of these at different scales. The ragged tip is the whole point — a smooth
 * cone reads as a spotlight, a torn one reads as combustion.
 */
export function blastPetal(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, angle: number, len: number, flare: number, seed: number,
): void {
  const at = frame(cx, cy, angle);
  const pts: Pt[] = [at(0, -flare * 0.16), at(len * 0.32, -flare * 0.62)];
  // Ragged crown: alternating tongues and notches across the mouth of the petal.
  const teeth = 5;
  for (let i = 0; i <= teeth; i++) {
    const u = i / teeth;
    const y = -flare + flare * 2 * u;
    const bite = i % 2 === 0 ? 1 : 0.62 + 0.2 * Math.abs(Math.sin(seed + i * 2.3));
    pts.push(at(len * bite, y * (0.72 + 0.28 * Math.abs(Math.sin(seed * 1.7 + i)))));
  }
  pts.push(at(len * 0.32, flare * 0.62), at(0, flare * 0.16));
  fillPts(g, pts);
}

/** The primitive in three passes: a smoky outer shell, the flame body, and a white-hot heart. */
export function blastPetalLayered(
  g: Phaser.GameObjects.Graphics, tint: GunpowderColorFn,
  cx: number, cy: number, angle: number, len: number, flare: number, seed: number,
  color: number, alpha: number,
): void {
  g.fillStyle(tint(GUNPOWDER.char), alpha * 0.42);
  blastPetal(g, cx, cy, angle, len * 1.12, flare * 1.25, seed + 0.7);
  g.fillStyle(tint(color), alpha * 0.92);
  blastPetal(g, cx, cy, angle, len, flare, seed);
  g.fillStyle(tint(GUNPOWDER.glow), alpha * 0.9);
  blastPetal(g, cx, cy, angle, len * 0.6, flare * 0.5, seed + 1.9);
  g.fillStyle(tint(GUNPOWDER.white), alpha * 0.85);
  g.fillCircle(cx, cy, flare * 0.28);
}

/**
 * A rolling puff of powder smoke: a cluster of lobes rather than one disc, so it boils outward
 * instead of inflating. The second half of this element's vocabulary — half of what gunpowder
 * *is* is what it leaves hanging in the air afterwards.
 */
export function smokePuff(
  g: Phaser.GameObjects.Graphics, tint: GunpowderColorFn,
  cx: number, cy: number, radius: number, seed: number, color: number, alpha: number,
): void {
  g.fillStyle(tint(color), alpha);
  g.fillCircle(cx, cy, radius * 0.72);
  for (let i = 0; i < 5; i++) {
    const a = seed + i * 1.9;
    const d = radius * (0.4 + ((i * 0.53) % 1) * 0.5);
    const r = radius * (0.34 + ((i * 0.29) % 1) * 0.34);
    g.fillCircle(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.85, r);
  }
}

/**
 * A musket: a shaped wooden stock, a brass lock and trigger guard, a banded steel barrel with a
 * muzzle ring, and a ramrod tucked underneath. `heat` runs 0 (cold iron) → 1 (glowing).
 *
 * One function paints every musket in the element — the one the character carries, the ones it
 * drops behind itself, the one it hurls with a bayonet on the end, and the ones an Overload sits
 * up and aims.
 */
export function musket(
  g: Phaser.GameObjects.Graphics, tint: GunpowderColorFn,
  cx: number, cy: number, angle: number, len: number, heat: number, alpha: number, bayonet = false,
): void {
  const at = frame(cx, cy, angle);
  const hl = len / 2;
  const barrelColor = mixColor(GUNPOWDER.steel, GUNPOWDER.ember, heat);

  if (heat > 0.02) {
    g.fillStyle(tint(GUNPOWDER.ember), alpha * 0.16 * heat);
    g.fillCircle(cx, cy, len * 0.4);
  }
  g.fillStyle(tint(GUNPOWDER.void), alpha * 0.4);
  g.fillEllipse(cx, cy + 3.5, len * 0.9, 5);

  // Stock: butt plate, comb, and a wrist narrowing into the lock.
  g.fillStyle(tint(GUNPOWDER.stock), alpha);
  fillPts(g, [at(-hl, -2.4), at(-hl * 0.62, -3.4), at(-hl * 0.1, -2.2), at(-hl * 0.1, 2), at(-hl * 0.5, 3.6), at(-hl, 3.4)]);
  g.fillStyle(tint(GUNPOWDER.wood), alpha * 0.85);
  fillPts(g, [at(-hl * 0.98, -2.2), at(-hl * 0.62, -3), at(-hl * 0.1, -1.9), at(-hl * 0.1, -0.4), at(-hl * 0.98, -0.6)]);

  // Lock plate, hammer and trigger guard.
  g.fillStyle(tint(GUNPOWDER.brass), alpha);
  fillPts(g, [at(-hl * 0.12, -2.6), at(hl * 0.16, -2.6), at(hl * 0.16, 1.8), at(-hl * 0.12, 1.8)]);
  fillPts(g, [at(-hl * 0.06, 1.8), at(hl * 0.1, 1.8), at(hl * 0.06, 4.4), at(-hl * 0.02, 4.4)]);
  g.fillStyle(tint(GUNPOWDER.char), alpha);
  fillPts(g, [at(-hl * 0.02, -2.8), at(hl * 0.06, -5.4), at(hl * 0.16, -4.6), at(hl * 0.08, -2.6)]);

  // Barrel with three bands and a flared muzzle.
  g.fillStyle(tint(barrelColor), alpha);
  fillPts(g, [at(hl * 0.14, -2.1), at(hl, -2.3), at(hl, 2.1), at(hl * 0.14, 1.9)]);
  g.fillStyle(tint(mixColor(GUNPOWDER.chrome, GUNPOWDER.glow, heat)), alpha * 0.75);
  fillPts(g, [at(hl * 0.14, -2.1), at(hl, -2.3), at(hl, -1.1), at(hl * 0.14, -0.9)]);
  g.fillStyle(tint(GUNPOWDER.brass), alpha * 0.9);
  for (const k of [0.4, 0.68]) g.fillCircle(at(hl * k, 0).x, at(hl * k, 0).y, 2.3);
  g.fillStyle(tint(mixColor(GUNPOWDER.steel, GUNPOWDER.glow, heat)), alpha);
  g.fillCircle(at(hl, 0).x, at(hl, 0).y, 2.8);
  g.fillStyle(tint(GUNPOWDER.void), alpha * 0.9);
  g.fillCircle(at(hl - 0.4, 0).x, at(hl - 0.4, 0).y, 1.3);

  // Ramrod slung under the barrel.
  g.lineStyle(1.2, tint(GUNPOWDER.wood), alpha * 0.8);
  strokePts(g, [at(hl * 0.2, 3), at(hl * 0.94, 2.6)]);

  if (bayonet) {
    const tip = at(hl + 2, 0);
    g.fillStyle(tint(GUNPOWDER.chrome), alpha);
    fillPts(g, [{ x: tip.x, y: tip.y }, at(hl + 14, -0.4), at(hl + 2.4, 3.4)]);
    g.fillStyle(tint(GUNPOWDER.white), alpha * 0.7);
    strokePts(g, [{ x: tip.x, y: tip.y }, at(hl + 14, -0.4)]);
  }
}

/** A cartridge: a paper-wrapped charge with a brass base. The bandolier is a row of these. */
export function cartridge(
  g: Phaser.GameObjects.Graphics, tint: GunpowderColorFn,
  cx: number, cy: number, angle: number, size: number, spent: boolean, alpha: number,
): void {
  const at = frame(cx, cy, angle);
  g.fillStyle(tint(spent ? GUNPOWDER.char : GUNPOWDER.wood), alpha);
  fillPts(g, [at(-size, -size * 0.42), at(size * 0.5, -size * 0.42), at(size * 0.5, size * 0.42), at(-size, size * 0.42)]);
  g.fillStyle(tint(spent ? GUNPOWDER.ash : GUNPOWDER.brass), alpha);
  fillPts(g, [at(size * 0.5, -size * 0.48), at(size, -size * 0.3), at(size, size * 0.3), at(size * 0.5, size * 0.48)]);
  if (!spent) {
    g.fillStyle(tint(GUNPOWDER.glow), alpha * 0.55);
    strokePts(g, [at(-size * 0.8, -size * 0.2), at(size * 0.3, -size * 0.2)]);
  }
}

// ── Regimentals ───────────────────────────────────────────────────────────

/**
 * The tricorn: a black felt round hat with the brim cocked up on three sides, worn point-forward.
 * Drawn as one silhouette rather than three separate flaps — at play zoom the read is the two
 * horns and the notch between them, so that is what gets the geometry budget.
 *
 * `lean` shifts the whole hat along the aim so the character looks like it is leaning into the
 * shot. `officer` swaps the front point for the fore-and-aft sweep of a bicorne and adds the
 * lace edge and a plume socket — the mastered silhouette.
 */
export function tricorn(
  g: Phaser.GameObjects.Graphics, tint: GunpowderColorFn,
  cx: number, cy: number, lean: number, scale: number, alpha: number,
  officer = false, t = 0,
): void {
  const s = scale;
  const x = cx + lean;

  // Crown: a low truncated dome sitting inside the brim.
  g.fillStyle(tint(GUNPOWDER.felt), alpha);
  fillPts(g, [
    { x: x - 7.5 * s, y: cy + 1 * s },
    { x: x - 6 * s, y: cy - 7.5 * s },
    { x: x + 6 * s, y: cy - 7.5 * s },
    { x: x + 7.5 * s, y: cy + 1 * s },
  ]);
  g.fillStyle(tint(GUNPOWDER.feltLit), alpha * 0.7);
  fillPts(g, [
    { x: x - 5.6 * s, y: cy - 1 * s },
    { x: x - 4.6 * s, y: cy - 6.6 * s },
    { x: x - 1.4 * s, y: cy - 6.9 * s },
    { x: x - 2.4 * s, y: cy - 1 * s },
  ]);

  // Brim. Unmastered it comes to a point dead ahead with a horn cocked either side; the officer's
  // bicorne loses the point and throws both horns out much further instead.
  const horn = officer ? 21 * s : 15.5 * s;
  const point = officer ? 4 * s : 11.5 * s;
  const brim: Pt[] = [
    { x: x - horn, y: cy + 2.4 * s },
    { x: x - horn * 0.55, y: cy + 5.4 * s },
    { x: x, y: cy + 2.2 * s + point * 0.34 },
    { x: x + horn * 0.55, y: cy + 5.4 * s },
    { x: x + horn, y: cy + 2.4 * s },
    { x: x + horn * 0.62, y: cy + 0.6 * s },
    { x: x + point * 0.5, y: cy - 1.2 * s },
    { x: x, y: cy - (officer ? 2.2 : 4.4) * s },
    { x: x - point * 0.5, y: cy - 1.2 * s },
    { x: x - horn * 0.62, y: cy + 0.6 * s },
  ];
  g.fillStyle(tint(GUNPOWDER.felt), alpha);
  fillPts(g, brim);
  // Lace edging round the brim — gold for an officer, plain white tape for the ranks.
  g.lineStyle(officer ? 1.9 : 1.2, tint(officer ? GUNPOWDER.brass : GUNPOWDER.belt), alpha * 0.9);
  strokePts(g, brim, true);

  // Cockade on the left horn: a black rosette pinned under a brass loop and button.
  const kx = x - horn * 0.66, ky = cy + 1.4 * s;
  g.fillStyle(tint(GUNPOWDER.void), alpha);
  g.fillCircle(kx, ky, 3.1 * s);
  g.fillStyle(tint(officer ? GUNPOWDER.buff : GUNPOWDER.crimson), alpha * 0.95);
  g.fillCircle(kx, ky, 2 * s);
  g.fillStyle(tint(GUNPOWDER.brass), alpha);
  g.fillCircle(kx, ky, 0.95 * s);

  if (!officer) return;

  // Officer's plume, standing out of the cockade and drifting on its own slow loop.
  const sway = Math.sin(t * 1.6) * 0.16;
  for (let i = 0; i < 5; i++) {
    const u = i / 4;
    const ang = -Math.PI / 2 - 0.5 + u * 0.34 + sway;
    const len = (13 + Math.sin(t * 2.2 + i) * 1.6) * s * (1 - Math.abs(u - 0.5) * 0.5);
    g.fillStyle(tint(i < 3 ? GUNPOWDER.belt : GUNPOWDER.crimson), alpha * (0.9 - u * 0.15));
    fillPts(g, [
      { x: kx - 1.4 * s, y: ky },
      { x: kx + Math.cos(ang) * len - 1.8 * s, y: ky + Math.sin(ang) * len },
      { x: kx + Math.cos(ang) * len + 1.8 * s, y: ky + Math.sin(ang) * len * 0.94 },
      { x: kx + 1.4 * s, y: ky },
    ]);
  }
}

/**
 * One coat sleeve: a tapered blue cuff running from the shoulder out to a ball hand, with the
 * turned-back facing at the wrist and a seam of piping down the top edge.
 *
 * Drawn on the *body* layer so it passes over the sprite but under the hand itself — a sleeve
 * painted over the glove would swallow the hand it is supposed to be attached to.
 */
export function coatSleeve(
  g: Phaser.GameObjects.Graphics, tint: GunpowderColorFn,
  sx: number, sy: number, hx: number, hy: number, alpha: number, laced: boolean,
): void {
  const dx = hx - sx, dy = hy - sy;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  // Shoulder is wide, wrist is narrow — the taper is the whole reason this reads as a sleeve.
  const w0 = 5.4, w1 = 3.6;
  // Pull the far end back so the cuff stops at the wrist instead of running through the glove.
  const ex = sx + ux * (len - 3.4), ey = sy + uy * (len - 3.4);

  g.fillStyle(tint(GUNPOWDER.coatDeep), alpha * 0.95);
  fillPts(g, [
    { x: sx + px * w0, y: sy + py * w0 },
    { x: ex + px * w1, y: ey + py * w1 },
    { x: ex - px * w1, y: ey - py * w1 },
    { x: sx - px * w0, y: sy - py * w0 },
  ]);
  g.fillStyle(tint(GUNPOWDER.coat), alpha * 0.95);
  fillPts(g, [
    { x: sx + px * (w0 - 1.1), y: sy + py * (w0 - 1.1) },
    { x: ex + px * (w1 - 0.9), y: ey + py * (w1 - 0.9) },
    { x: ex - px * (w1 - 1.6), y: ey - py * (w1 - 1.6) },
    { x: sx - px * (w0 - 1.8), y: sy - py * (w0 - 1.8) },
  ]);
  // Lit piping along the upper seam.
  g.lineStyle(1, tint(GUNPOWDER.coatLit), alpha * 0.8);
  strokePts(g, [{ x: sx + px * (w0 - 1), y: sy + py * (w0 - 1) }, { x: ex + px * (w1 - 0.8), y: ey + py * (w1 - 0.8) }]);

  // Turned-back cuff in the facing colour, with a button on it once the wearer is an officer.
  const cx0 = sx + ux * (len - 8), cy0 = sy + uy * (len - 8);
  g.fillStyle(tint(GUNPOWDER.buff), alpha);
  fillPts(g, [
    { x: cx0 + px * (w1 + 1.5), y: cy0 + py * (w1 + 1.5) },
    { x: ex + px * (w1 + 0.9), y: ey + py * (w1 + 0.9) },
    { x: ex - px * (w1 + 0.9), y: ey - py * (w1 + 0.9) },
    { x: cx0 - px * (w1 + 1.5), y: cy0 - py * (w1 + 1.5) },
  ]);
  if (laced) {
    g.lineStyle(1.2, tint(GUNPOWDER.brass), alpha * 0.95);
    strokePts(g, [
      { x: cx0 + px * (w1 + 1.3), y: cy0 + py * (w1 + 1.3) },
      { x: cx0 - px * (w1 + 1.3), y: cy0 - py * (w1 + 1.3) },
    ]);
    g.fillStyle(tint(GUNPOWDER.brass), alpha);
    g.fillCircle(cx0 + px * 1.2, cy0 + py * 1.2, 1.2);
  }
}

/** A gold epaulette: the bullion fringe that turns a private into an officer. */
export function epaulette(
  g: Phaser.GameObjects.Graphics, tint: GunpowderColorFn,
  cx: number, cy: number, side: number, alpha: number, t: number,
): void {
  g.fillStyle(tint(GUNPOWDER.brass), alpha);
  fillPts(g, [
    { x: cx - 4.4, y: cy - 2.6 },
    { x: cx + side * 5.2, y: cy - 3.4 },
    { x: cx + side * 5.6, y: cy + 1.4 },
    { x: cx - 4.4, y: cy + 1.8 },
  ]);
  g.fillStyle(tint(GUNPOWDER.gold), alpha * 0.9);
  fillPts(g, [
    { x: cx - 3.4, y: cy - 1.9 },
    { x: cx + side * 4.2, y: cy - 2.5 },
    { x: cx + side * 4.4, y: cy - 0.6 },
    { x: cx - 3.4, y: cy - 0.2 },
  ]);
  // Bullion strands, swinging a little out of phase with each other.
  g.lineStyle(1, tint(GUNPOWDER.brass), alpha * 0.9);
  for (let i = 0; i < 4; i++) {
    const fx = cx + side * (1.4 + i * 1.3);
    const swing = Math.sin(t * 2.4 + i * 0.8) * 1.1;
    strokePts(g, [{ x: fx, y: cy + 1.4 }, { x: fx + swing, y: cy + 6.4 }]);
  }
}

// ── GunpowderFx ───────────────────────────────────────────────────────────

export interface GunpowderBoomOpts {
  /** Petals in the bloom. Defaults to radius/7. */
  petals?: number;
  /** Bits of casing thrown clear. Defaults to petals. */
  shrapnel?: number;
  /** Smoke puffs left hanging. Defaults to 3. */
  smoke?: number;
  duration?: number;
  depth?: number;
  color?: number;
  /** Leave a scorch ring on the floor. Default true. */
  mark?: boolean;
}

/**
 * One-shot gunpowder effects. Cheap to construct — build one per owner and hand it that owner's
 * colour mapper.
 */
export class GunpowderFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: GunpowderColorFn = (c) => c) {
    super(scene, tint);
  }

  // `color: number` is spelled out on every signature below: without it TypeScript infers the
  // literal type of the GUNPOWDER default and refuses every other palette entry at the call site.

  /** Blown-out core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 8, color: number = GUNPOWDER.blaze): void {
    this.flashIn(x, y, radius, GUNPOWDER.white, color, depth);
  }

  /** A shockwave ring, thin and fast — the pressure front rather than the fire. */
  ring(
    x: number, y: number, from: number, to: number, color: number,
    duration = 320, depth = 7, width = 3,
  ): void {
    this.anim(depth, duration, (g, t) => {
      const r = from + (to - from) * easeOut(t);
      const a = (1 - t) * 0.9;
      g.lineStyle(width * 2.4, this.tint(GUNPOWDER.char), a * 0.3);
      g.strokeCircle(x, y, r * 1.04);
      g.lineStyle(width, this.tint(color), a);
      g.strokeCircle(x, y, r);
      g.lineStyle(Math.max(0.8, width * 0.35), this.tint(GUNPOWDER.white), a * 0.85);
      g.strokeCircle(x, y, r * 0.97);
    });
  }

  /**
   * A muzzle blast: a torn petal of fire out of the barrel, a pressure ring at its mouth, sparks
   * thrown forward and a puff of powder smoke rolling off it.
   */
  muzzle(x: number, y: number, angle: number, scale = 1, depth = 10, color: number = GUNPOWDER.blaze): void {
    const seed = Math.random() * 10;
    this.anim(depth, 170, (g, t) => {
      const grow = t < 0.35 ? easeOut(t / 0.35) : 1;
      const fade = 1 - easeIn(t);
      const len = 30 * scale * (0.5 + grow * 0.7);
      const flare = 11 * scale * (0.4 + grow * 0.8);
      blastPetalLayered(g, this.tint, x, y, angle, len, flare, seed, color, fade);
      // Two side lobes, so the flash has a crown rather than a single tongue.
      for (const d of [-0.55, 0.55]) {
        blastPetalLayered(g, this.tint, x, y, angle + d, len * 0.5, flare * 0.55, seed + d, color, fade * 0.7);
      }
    });
    this.ring(x, y, 3 * scale, 20 * scale, GUNPOWDER.glow, 200, depth - 1, 2);
    this.sparks(x, y, Math.round(5 * scale), angle, depth, GUNPOWDER.gold);
    this.smoke(x, y, Math.max(2, Math.round(3 * scale)), { angle: angle + Math.PI, spread: 1.1, radius: 5 * scale, depth: depth - 2 });
  }

  /** Sparks off an ignition — short, fast, and falling. */
  sparks(x: number, y: number, count: number, angle: number, depth = 10, color: number = GUNPOWDER.gold): void {
    const parts = Array.from({ length: count }, () => ({
      a: angle + (Math.random() - 0.5) * 1.9,
      v: 130 + Math.random() * 260,
      w: 1 + Math.random() * 1.4,
      delay: Math.random() * 0.2,
    }));
    this.anim(depth, 300, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const at = (f: number): Pt => ({
          x: x + Math.cos(p.a) * p.v * easeOut(f) * 0.3,
          y: y + Math.sin(p.a) * p.v * easeOut(f) * 0.3 + 70 * f * f,
        });
        g.lineStyle(p.w * (1 - lt), this.tint(color), 0.95 * (1 - lt));
        strokePts(g, [at(Math.max(0, lt - 0.22)), at(lt)]);
      }
    });
  }

  /** Powder smoke rolling away and thinning out. */
  smoke(
    x: number, y: number, count: number,
    o: { angle?: number; spread?: number; speed?: number; radius?: number; life?: number; depth?: number; color?: number } = {},
  ): void {
    const angle = o.angle ?? -Math.PI / 2;
    const spread = o.spread ?? Math.PI;
    const speed = o.speed ?? 55;
    const radius = o.radius ?? 6;
    const life = o.life ?? 720;
    const depth = o.depth ?? 6;
    const color = o.color ?? GUNPOWDER.smoke;

    const puffs = Array.from({ length: count }, (_, i) => ({
      a: angle + (Math.random() - 0.5) * spread,
      v: speed * (0.5 + Math.random()),
      r: radius * (0.7 + Math.random() * 0.8),
      seed: i * 2.7 + Math.random() * 3,
      delay: Math.random() * 0.25,
    }));
    this.anim(depth, life, (g, t) => {
      for (const p of puffs) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        smokePuff(g, this.tint, x + Math.cos(p.a) * d, y + Math.sin(p.a) * d - 10 * lt,
          p.r * (1 + lt * 1.8), p.seed, color, 0.4 * (1 - lt));
      }
    });
  }

  /** Casing and splinters thrown clear of a blast. */
  shrapnel(
    x: number, y: number, count: number,
    o: { speed?: number; spread?: number; angle?: number; size?: number; life?: number; depth?: number; color?: number } = {},
  ): void {
    const speed = o.speed ?? 240;
    const spread = o.spread ?? Math.PI;
    const baseAngle = o.angle ?? 0;
    const size = o.size ?? 7;
    const life = o.life ?? 520;
    const depth = o.depth ?? 9;
    const color = o.color ?? GUNPOWDER.char;

    const parts = Array.from({ length: count }, () => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        a, v: speed * (0.45 + Math.random()),
        s: size * (0.5 + Math.random() * 0.9),
        spin: (Math.random() - 0.5) * 18,
        delay: Math.random() * 0.15,
      };
    });
    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        const cx = x + Math.cos(p.a) * d;
        const cy = y + Math.sin(p.a) * d + 90 * lt * lt;
        const at = frame(cx, cy, p.a + p.spin * lt);
        const s = p.s * (1 - lt * 0.3);
        g.fillStyle(this.tint(color), 0.95 * (1 - lt * lt));
        fillPts(g, [at(-s, -s * 0.4), at(s * 0.7, -s * 0.55), at(s, s * 0.3), at(-s * 0.6, s * 0.5)]);
        g.fillStyle(this.tint(GUNPOWDER.blaze), 0.6 * (1 - lt));
        g.fillCircle(cx, cy, s * 0.24);
      }
    });
  }

  /**
   * A full detonation: white core, a rosette of torn petals, staggered shockwaves, shrapnel,
   * smoke left hanging, and a scorch ring on the floor.
   */
  boom(x: number, y: number, radius: number, o: GunpowderBoomOpts = {}): void {
    const color = o.color ?? GUNPOWDER.flame;
    const petals = o.petals ?? Math.max(5, Math.round(radius / 7));
    const bits = o.shrapnel ?? petals;
    const puffs = o.smoke ?? 3;
    const dur = o.duration ?? Math.round(300 + radius * 1.1);
    const depth = o.depth ?? 8;

    if (o.mark !== false) this.scorch(x, y, radius * 0.72, depth - 6);
    this.flash(x, y, radius * 0.42, depth + 2, color);

    const seeds = Array.from({ length: petals }, () => Math.random() * 10);
    this.anim(depth, Math.round(dur * 0.8), (g, t) => {
      const grow = easeOut(Math.min(1, t / 0.45));
      const fade = 1 - easeIn(t);
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * TAU + seeds[i] * 0.1;
        blastPetalLayered(g, this.tint, x, y, a, radius * grow * (0.7 + (seeds[i] % 1) * 0.45),
          radius * 0.3 * grow, seeds[i] + t * 3, color, fade);
      }
    });

    this.ring(x, y, radius * 0.2, radius * 1.05, GUNPOWDER.glow, Math.round(dur * 0.85), depth + 1, 4);
    this.scene.time.delayedCall(90, () => this.ring(x, y, radius * 0.5, radius * 1.35, GUNPOWDER.white, dur, depth, 2));
    this.shrapnel(x, y, bits, { speed: radius * 2.3, size: 6 + radius / 12, life: Math.round(dur * 1.25), depth: depth + 1 });
    this.smoke(x, y, puffs + 2, { spread: TAU, speed: radius * 0.8, radius: radius * 0.22, life: Math.round(dur * 2.2), depth: depth - 1 });
  }

  /** Ground left scorched, with a ring of powder burn around the crater. */
  scorch(x: number, y: number, radius: number, depth = 2, color: number = GUNPOWDER.soot): void {
    const seed = Math.random() * 10;
    this.anim(depth, 1600, (g, t) => {
      const a = t < 0.08 ? t / 0.08 : 1 - (t - 0.08) / 0.92;
      g.fillStyle(this.tint(color), 0.42 * a);
      g.fillEllipse(x, y, radius * 2, radius * 1.1);
      g.fillStyle(this.tint(GUNPOWDER.char), 0.3 * a);
      for (let i = 0; i < 7; i++) {
        const ang = seed + i * 2.399;
        const d = radius * (0.7 + ((i * 0.37) % 1) * 0.55);
        smokePuff(g, this.tint, x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.6,
          radius * 0.22, seed + i, GUNPOWDER.soot, 0.3 * a);
      }
      // The last embers dying in the crater.
      g.fillStyle(this.tint(GUNPOWDER.ember), 0.35 * a * (0.4 + 0.6 * Math.abs(Math.sin(t * 14))));
      g.fillEllipse(x, y, radius * 0.7, radius * 0.4);
    });
  }

  /**
   * A hitscan shot: a tapering tracer with a heat haze around it, plus muzzle petal and smoke.
   * Every weapon in the arsenal fires one of these — the colour is what tells them apart.
   */
  tracer(
    x1: number, y1: number, x2: number, y2: number, color: number,
    width = 2.4, depth = 9, duration = 150,
  ): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    this.anim(depth, duration, (g, t) => {
      const fade = 1 - easeIn(t);
      const nx = -Math.sin(angle), ny = Math.cos(angle);
      // Tapered body: fat at the muzzle, needle-thin at the far end.
      for (const [col, w, a] of [[GUNPOWDER.char, width * 3, 0.16], [color, width, 0.85], [GUNPOWDER.white, width * 0.34, 0.9]] as const) {
        g.fillStyle(this.tint(col), a * fade);
        fillPts(g, [
          { x: x1 + nx * w, y: y1 + ny * w },
          { x: x2 + nx * w * 0.2, y: y2 + ny * w * 0.2 },
          { x: x2 - nx * w * 0.2, y: y2 - ny * w * 0.2 },
          { x: x1 - nx * w, y: y1 - ny * w },
        ]);
      }
    });
    this.muzzle(x1, y1, angle, 0.7, depth + 1, color);
  }

  /**
   * A firework going off: a white core, a ring the size of its blast, then a chrysanthemum of
   * stars that droop as they burn out.
   */
  starShell(x: number, y: number, radius: number, color: number, depth = 11): void {
    this.flash(x, y, radius * 0.3, depth + 1, color);
    this.ring(x, y, radius * 0.25, radius, color, 420, depth, 3);
    const stars = Array.from({ length: 20 }, (_, i) => ({
      a: (i / 20) * TAU + (Math.random() - 0.5) * 0.2,
      reach: radius * (0.55 + Math.random() * 0.6),
      white: i % 3 === 0,
      delay: Math.random() * 0.1,
    }));
    this.anim(depth + 1, 620, (g, t) => {
      for (const s of stars) {
        const lt = Phaser.Math.Clamp((t - s.delay) / (1 - s.delay), 0, 1);
        const d = s.reach * easeOut(lt);
        const px = x + Math.cos(s.a) * d;
        const py = y + Math.sin(s.a) * d + 18 * lt * lt;
        const fade = 1 - lt * lt;
        const at = frame(px, py, s.a);
        g.fillStyle(this.tint(s.white ? GUNPOWDER.white : color), fade);
        fillPts(g, [at(-4.5, -1.2), at(3.5, 0), at(-4.5, 1.2)]);
        g.fillStyle(this.tint(GUNPOWDER.glow), fade * 0.8);
        g.fillCircle(px, py, 1.6 * fade);
      }
    });
    this.smoke(x, y, 3, { spread: TAU, speed: 50, radius: radius * 0.18, life: 900, depth: depth - 2 });
  }

  // ── Per-frame painters ──────────────────────────────────────────────────
  // Drawn into a Graphics the caller already owns, because these ride on live gameplay state:
  // a musket's remaining heat, a grenade's fuse, how far a vacuum cone has swallowed.

  /** A grenade: a ribbed iron body with a lit fuse that shortens as it burns down. */
  static drawGrenade(
    g: Phaser.GameObjects.Graphics, tint: GunpowderColorFn,
    x: number, y: number, fuse: number, spin: number, t: number,
  ): void {
    g.fillStyle(tint(GUNPOWDER.void), 0.4);
    g.fillEllipse(x, y + 8, 16, 6);
    g.fillStyle(tint(GUNPOWDER.char), 1);
    g.fillCircle(x, y, 8.5);
    g.fillStyle(tint(GUNPOWDER.soot), 1);
    g.fillCircle(x, y, 7);
    // Ribbed casing.
    g.lineStyle(1, tint(GUNPOWDER.void), 0.8);
    for (let i = -1; i <= 1; i++) {
      const at = frame(x, y, spin);
      strokePts(g, [at(i * 3.4, -6.4), at(i * 3.4, 6.4)]);
    }
    g.fillStyle(tint(GUNPOWDER.chrome), 0.6);
    g.fillCircle(x - 2.6, y - 3, 2);
    // Brass cap and burning fuse.
    const cap = frame(x, y, spin)(0, -8);
    g.fillStyle(tint(GUNPOWDER.brass), 1);
    g.fillCircle(cap.x, cap.y, 2.8);
    const len = 8 * (1 - fuse);
    const tip = { x: cap.x + Math.sin(t * 9) * 2, y: cap.y - len };
    g.lineStyle(1.4, tint(GUNPOWDER.wood), 0.9);
    strokePts(g, [cap, tip]);
    g.fillStyle(tint(GUNPOWDER.glow), 0.95);
    g.fillCircle(tip.x, tip.y, 1.8 + fuse * 1.4 + Math.sin(t * 22) * 0.5);
    g.fillStyle(tint(GUNPOWDER.white), 0.9);
    g.fillCircle(tip.x, tip.y, 0.9);
  }

  /** An RPG rocket: a warhead on a finned body with an exhaust petal behind it. */
  static drawRocket(
    g: Phaser.GameObjects.Graphics, tint: GunpowderColorFn,
    x: number, y: number, angle: number, t: number,
  ): void {
    const at = frame(x, y, angle);
    blastPetalLayered(g, tint, at(-9, 0).x, at(-9, 0).y, angle + Math.PI,
      16 + Math.sin(t * 30) * 4, 5, t * 3, GUNPOWDER.flame, 0.9);
    g.fillStyle(tint(GUNPOWDER.char), 1);
    fillPts(g, [at(-10, -3.4), at(6, -3.4), at(6, 3.4), at(-10, 3.4)]);
    g.fillStyle(tint(GUNPOWDER.ember), 1);
    fillPts(g, [at(6, -4.4), at(14, 0), at(6, 4.4)]);
    g.fillStyle(tint(GUNPOWDER.ash), 1);
    fillPts(g, [at(-10, -3.4), at(-6, -7), at(-4, -3.4)]);
    fillPts(g, [at(-10, 3.4), at(-6, 7), at(-4, 3.4)]);
    g.fillStyle(tint(GUNPOWDER.glow), 0.7);
    strokePts(g, [at(-8, -2), at(4, -2)]);
  }

  /** A flame cloud coughed out of the flamethrower. */
  static drawFlameCloud(
    g: Phaser.GameObjects.Graphics, tint: GunpowderColorFn,
    x: number, y: number, angle: number, life: number, seed: number, t: number,
  ): void {
    smokePuff(g, tint, x, y, 9 * (1.4 - life * 0.4), seed, GUNPOWDER.char, 0.3 * life);
    blastPetalLayered(g, tint, x, y, angle + Math.sin(t * 5 + seed) * 0.4,
      15 * life + 5, 8 * life + 3, seed + t, GUNPOWDER.flame, 0.85 * life);
  }

  /** A ray-gun bullet: a green bead with a bouncing wake. */
  static drawRayBullet(
    g: Phaser.GameObjects.Graphics, tint: GunpowderColorFn,
    x: number, y: number, angle: number, hits: number, t: number,
  ): void {
    const back = frame(x, y, angle);
    for (let k = 3; k >= 1; k--) {
      g.fillStyle(tint(GUNPOWDER.lilac), 0.16 * (4 - k));
      const p = back(-k * 8, 0);
      g.fillCircle(p.x, p.y, 5 - k);
    }
    g.fillStyle(tint(GUNPOWDER.orchid), 0.35);
    g.fillCircle(x, y, 11 + Math.sin(t * 14) * 1.5);
    g.fillStyle(tint(GUNPOWDER.orchid), 1);
    g.fillCircle(x, y, 6);
    g.fillStyle(tint(GUNPOWDER.white), 1);
    g.fillCircle(x, y, 2.4);
    // Charge pips burn off with each pierce.
    for (let i = 0; i < 3 - hits; i++) {
      const a = t * 5 + (i / 3) * TAU;
      g.fillStyle(tint(GUNPOWDER.lilac), 0.9);
      g.fillCircle(x + Math.cos(a) * 10, y + Math.sin(a) * 10, 1.6);
    }
  }

  /**
   * The BlunderBlast cone: a silver funnel with intake streaks racing down its throat and a
   * count of the hoard piling up at the mouth.
   */
  static drawVacuumCone(
    g: Phaser.GameObjects.Graphics, tint: GunpowderColorFn,
    x: number, y: number, dir: number, radius: number, half: number, hoard: number, t: number,
  ): void {
    // Funnel body.
    const pts: Pt[] = [{ x, y }];
    for (let i = 0; i <= 16; i++) {
      const a = dir - half + (i / 16) * half * 2;
      pts.push({ x: x + Math.cos(a) * radius, y: y + Math.sin(a) * radius });
    }
    g.fillStyle(tint(GUNPOWDER.silver), 0.1 + 0.05 * Math.sin(t * 6));
    fillPts(g, pts);
    g.lineStyle(2, tint(GUNPOWDER.silver), 0.7);
    strokePts(g, pts, true);

    // Intake streaks pulled down the throat of it.
    for (let i = 0; i < 7; i++) {
      const a = dir - half + ((i + 0.5) / 7) * half * 2;
      const p = 1 - ((t * 0.9 + i / 7) % 1);
      const r0 = radius * p, r1 = radius * Math.max(0, p - 0.22);
      g.lineStyle(2.2, tint(GUNPOWDER.chrome), 0.65 * (1 - p));
      strokePts(g, [
        { x: x + Math.cos(a) * r0, y: y + Math.sin(a) * r0 },
        { x: x + Math.cos(a) * r1, y: y + Math.sin(a) * r1 },
      ]);
    }

    // The hoard itself, churning in the throat.
    for (let i = 0; i < Math.min(hoard, 12); i++) {
      const a = dir + Math.sin(t * 2 + i * 1.7) * half * 0.8;
      const d = 16 + (i % 4) * 6 + Math.sin(t * 3 + i) * 3;
      g.fillStyle(tint(GUNPOWDER.chrome), 0.85);
      g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 2.2);
    }
  }

  /** A firework tube stuck to a wall, wick burning down toward launch. */
  static drawFireworkTube(
    g: Phaser.GameObjects.Graphics, tint: GunpowderColorFn,
    x: number, y: number, dx: number, dy: number, fuse: number, color: number, t: number,
  ): void {
    const nx = -dy, ny = dx;
    const bx = x + dx * 3, by = y + dy * 3;
    const len = 17 + Math.sin(t * 26) * 1.2 * fuse;
    const half = 6;
    const tipX = bx + dx * len, tipY = by + dy * len;

    g.fillStyle(tint(GUNPOWDER.wood), 0.95);
    fillPts(g, [
      { x: bx + nx * half, y: by + ny * half },
      { x: bx - nx * half, y: by - ny * half },
      { x: tipX - nx * (half - 1.6), y: tipY - ny * (half - 1.6) },
      { x: tipX + nx * (half - 1.6), y: tipY + ny * (half - 1.6) },
    ]);
    g.lineStyle(1.5, tint(GUNPOWDER.brass), 0.9);
    strokePts(g, [
      { x: bx + nx * half, y: by + ny * half },
      { x: bx - nx * half, y: by - ny * half },
      { x: tipX - nx * (half - 1.6), y: tipY - ny * (half - 1.6) },
      { x: tipX + nx * (half - 1.6), y: tipY + ny * (half - 1.6) },
    ], true);
    for (const k of [0.34, 0.68]) {
      g.lineStyle(1, tint(GUNPOWDER.brass), 0.5);
      strokePts(g, [
        { x: bx + dx * len * k + nx * half, y: by + dy * len * k + ny * half },
        { x: bx + dx * len * k - nx * half, y: by + dy * len * k - ny * half },
      ]);
    }

    // Wick curling along the wall, shortening as the second runs out.
    const fuseLen = 15 * (1 - fuse);
    const fx0 = bx - dx * 2, fy0 = by - dy * 2;
    const wick: Pt[] = [{ x: fx0, y: fy0 }];
    for (let s = 1; s <= 6; s++) {
      const u = s / 6;
      const bow = Math.sin(u * 4.2) * 3;
      wick.push({ x: fx0 + nx * fuseLen * u + dx * bow, y: fy0 + ny * fuseLen * u + dy * bow });
    }
    g.lineStyle(1.5, tint(GUNPOWDER.stock), 0.9);
    strokePts(g, wick);
    const spark = wick[wick.length - 1];
    g.fillStyle(tint(GUNPOWDER.glow), 0.9);
    g.fillCircle(spark.x, spark.y, 2 + fuse * 1.6 + Math.sin(t * 22) * 0.6);
    g.fillStyle(tint(GUNPOWDER.white), 0.8);
    g.fillCircle(spark.x, spark.y, 1);

    // Spark shower out of the muzzle, thickening as launch nears.
    const ang = Math.atan2(dy, dx);
    const spurts = 2 + Math.floor(fuse * 5);
    for (let k = 0; k < spurts; k++) {
      const phase = (t * 3.8 + k / spurts) % 1;
      const a = ang + Math.sin(k * 2.7 + color) * 0.5;
      const d = phase * (10 + 16 * fuse);
      g.fillStyle(tint(k % 2 ? GUNPOWDER.blaze : GUNPOWDER.glow), (1 - phase) * (0.35 + 0.5 * fuse));
      g.fillCircle(tipX + Math.cos(a) * d, tipY + Math.sin(a) * d, 1.3 + fuse);
    }
    g.fillStyle(tint(color), 0.05 + 0.1 * fuse);
    g.fillCircle(x, y, 10 + 10 * fuse);
  }

  /** A firework shell in flight: a white-hot core in a coloured halo, dragging a smoky tail. */
  static drawFireworkFlight(
    g: Phaser.GameObjects.Graphics, tint: GunpowderColorFn,
    x: number, y: number, dx: number, dy: number, color: number, t: number,
  ): void {
    const bx = -dx, by = -dy;
    const nx = -by, ny = bx;
    for (let k = 8; k >= 1; k--) {
      const u = k / 8;
      const wob2 = Math.sin(t * 18 + k * 0.9) * 3 * u;
      g.fillStyle(tint(k > 5 ? GUNPOWDER.char : color), (1 - u) * 0.55);
      g.fillCircle(x + bx * 13 * k + nx * wob2, y + by * 13 * k + ny * wob2, 6 * (1 - u) + 1);
    }
    for (let k = 0; k < 3; k++) {
      const phase = (t * 2 + k / 3) % 1;
      const back = 16 + phase * 46;
      smokePuff(g, tint, x + bx * back + nx * (phase * 12 - 6), y + by * back + ny * (phase * 12 - 6),
        3 + phase * 7, k * 1.9, GUNPOWDER.smoke, (1 - phase) * 0.2);
    }
    g.fillStyle(tint(color), 0.32);
    g.fillCircle(x, y, 11 + Math.sin(t * 22) * 1.5);
    g.fillStyle(tint(GUNPOWDER.glow), 0.9);
    g.fillCircle(x, y, 5);
    g.fillStyle(tint(GUNPOWDER.white), 1);
    g.fillCircle(x, y, 2.4);
    for (let k = 0; k < 4; k++) {
      const a = t * 5 + (k * Math.PI) / 2;
      g.lineStyle(1, tint(GUNPOWDER.white), 0.7);
      strokePts(g, [{ x, y }, { x: x + Math.cos(a) * 9, y: y + Math.sin(a) * 9 }]);
    }
  }

  /** A bullet spat back out of the Vortex Cannon, still alight. */
  static drawBurningShot(
    g: Phaser.GameObjects.Graphics, tint: GunpowderColorFn,
    x: number, y: number, angle: number, t: number,
  ): void {
    const back = frame(x, y, angle);
    for (let k = 5; k >= 1; k--) {
      const u = k / 5;
      const wob2 = Math.sin(t * 22 + k * 1.3 + x * 0.04) * 3 * u;
      const p = back(-9 * k, wob2);
      g.fillStyle(tint(k > 3 ? GUNPOWDER.char : k > 1 ? GUNPOWDER.ember : GUNPOWDER.blaze), (1 - u) * 0.8);
      g.fillCircle(p.x, p.y, 5.5 * (1 - u) + 1.5);
    }
    blastPetalLayered(g, tint, x, y, angle, 12, 5, t * 4, GUNPOWDER.blaze, 0.9);
  }
}

// ── GunpowderAura ─────────────────────────────────────────────────────────

export type GunpowderAuraStyle =
  | 'hoard'    // BlunderBlast: a swallowed hoard armed and orbiting, waiting for the next shot
  | 'guard'    // Gunblade: the damage-reduction window
  | 'heat';    // Overload / minigun: the caster wreathed in barrel heat and smoke

/**
 * A persistent gunpowder effect riding on a fighter. One Graphics, driven by whoever owns it.
 *
 * The styles differ in *shape*: a hoard orbits, a guard encloses, heat rises. Several can be up
 * at once, so they must stay separable at a glance.
 */
export class GunpowderAura {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private intensity = 1;
  private angle = 0;
  /** How many shots the hoard is holding, for the 'hoard' style. */
  private count = 0;

  constructor(
    scene: Phaser.Scene,
    private tint: GunpowderColorFn,
    private style: GunpowderAuraStyle,
    private radius: number,
    depth = 4,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  setIntensity(v: number): void { this.intensity = v; }
  setAngle(a: number): void { this.angle = a; }
  setCount(n: number): void { this.count = n; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;
    const k = Phaser.Math.Clamp(this.intensity, 0, 1);
    const r = this.radius;

    switch (this.style) {
      case 'hoard': {
        // Swallowed shots churning in a silver ring, waiting to be coughed back out.
        g.lineStyle(1.6, this.tint(GUNPOWDER.silver), (0.3 + 0.2 * Math.sin(this.t * 4)) * alpha);
        g.strokeCircle(x, y, r);
        const n = Math.min(this.count, 16);
        for (let i = 0; i < n; i++) {
          const a = -this.t * 2.2 + (i / n) * TAU;
          const d = r * (0.82 + 0.18 * Math.sin(this.t * 5 + i));
          const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
          const at = frame(px, py, a + Math.PI / 2);
          g.fillStyle(this.tint(GUNPOWDER.chrome), 0.95 * alpha);
          fillPts(g, [at(-3.4, -1.4), at(2.6, 0), at(-3.4, 1.4)]);
        }
        // The barrel it's all going to come out of.
        g.fillStyle(this.tint(GUNPOWDER.silver), 0.18 * alpha);
        blastPetal(g, x + Math.cos(this.angle) * 12, y + Math.sin(this.angle) * 12, this.angle, 20, 9, this.t);
        break;
      }
      case 'guard': {
        // A shell of overlapping plate, flashing on the beat it was raised.
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU + this.t * 0.6;
          const px = x + Math.cos(a) * r * 0.94, py = y + Math.sin(a) * r * 0.94;
          const at = frame(px, py, a);
          g.fillStyle(this.tint(i % 2 === 0 ? GUNPOWDER.steel : GUNPOWDER.ash), 0.55 * alpha * (0.5 + 0.5 * k));
          fillPts(g, [at(-2, -7), at(3, -6), at(3, 6), at(-2, 7)]);
        }
        g.lineStyle(2, this.tint(GUNPOWDER.chrome), (0.3 + 0.3 * k) * alpha);
        g.strokeCircle(x, y, r);
        break;
      }
      case 'heat': {
        // Barrel heat: a red pool underfoot, embers climbing, smoke rolling off the shoulders.
        g.fillStyle(this.tint(GUNPOWDER.ember), 0.09 * alpha * (0.5 + 0.5 * k));
        g.fillCircle(x, y, r * (1.1 + 0.1 * Math.sin(this.t * 5)));
        for (let i = 0; i < 4; i++) {
          const p = (this.t * 0.9 + i / 4) % 1;
          g.fillStyle(this.tint(GUNPOWDER.gold), 0.75 * alpha * (1 - p));
          g.fillCircle(x + Math.sin(this.t * 2.5 + i * 2.1) * r * 0.6, y - p * (r + 12), 1.8 * (1 - p) + 0.6);
        }
        for (let i = 0; i < 3; i++) {
          const p = (this.t * 0.55 + i / 3) % 1;
          smokePuff(g, this.tint, x + Math.sin(this.t + i * 2) * 9, y - 6 - p * 26,
            5 + p * 9, i * 2.3, GUNPOWDER.smoke, 0.24 * alpha * (1 - p));
        }
        break;
      }
    }
  }

  destroy(): void { this.g.destroy(); }
}

// ── GunpowderAvatar ───────────────────────────────────────────────────────

/**
 * Concentric discs of one hand, outermost first. A musketeer's hands are pipeclayed white gloves
 * with a dark coat cuff behind them — the ember halo underneath is the powder they never quite
 * wash off, and it is also the only reason a white glove reads against a bright floor.
 */
const GUNPOWDER_AVATAR: AvatarSpec = {
  hands: [
    { r: 11, color: GUNPOWDER.ember, alpha: 0.2 },
    { r: 7.6, color: GUNPOWDER.coatDeep, alpha: 1 },
    { r: 5.6, color: GUNPOWDER.linen, alpha: 1 },
    { r: 1.7, color: GUNPOWDER.white, alpha: 1, ox: -2, oy: -2.1 },
  ],
  eyeWhite: GUNPOWDER.gold,
  eyePupil: GUNPOWDER.void,
  // A loaded musket is heavy, and the hands carrying it have a lot of follow-through.
  squash: { div: 16, x: 0.46, y: 0.26 },
};

/**
 * The gunpowder character rig: a revolutionary-era line musketeer.
 *
 * The whole silhouette is uniform. A black felt **tricorn** cocked point-forward sits on the
 * crown with a cockade on the left horn; below the face is a **regimental coat** — buff lapels
 * turned back off a linen waistcoat, two rows of brass buttons, a split skirt — crossed by two
 * pipeclayed **cross-belts** meeting at a brass plate, with the cartridge box riding one hip.
 * Tapered blue **sleeves** run from the shoulders out to white-gloved ball hands, and a
 * ribbon-tied **queue** hangs out from behind the head.
 *
 * Two things on the rig are live readouts rather than decoration. The **cartridge loops** on the
 * shoulder belt empty left-to-right as the fighter shoots, so a musketeer who has run themselves
 * dry looks it before the HUD says so; and the **musket** is carried at the ready along the aim
 * while there is a charge left, then shouldered butt-down the moment there is not.
 *
 * Mastery promotes the private to an officer: the tricorn becomes a plumed bicorne, gold bullion
 * epaulettes land on both shoulders, a gorget hangs at the throat, the cuffs take gold lace, and
 * the musket fixes its bayonet. Every one of those is a change to the outline, not a tint.
 */
export class GunpowderAvatar extends BaseAvatar {
  private fx: GunpowderFx;
  /** Warm for the player, cold for the NPC, so two gunpowder fighters never blur together. */
  private accent: number;
  /** Muskets still loaded — drives the held weapon and the bandolier. */
  private ammo = 3;
  private maxAmmo = 3;

  constructor(scene: Phaser.Scene, tint: GunpowderColorFn, owner: 'player' | 'npc' = 'player', depth = 6) {
    super(scene, tint, depth, GUNPOWDER_AVATAR);
    this.fx = new GunpowderFx(scene, tint);
    this.accent = owner === 'player' ? GUNPOWDER.blaze : GUNPOWDER.orchid;
  }

  /** Live ammo count, so the rig visibly carries what it can still fire. */
  setAmmo(ammo: number, max: number): void {
    this.ammo = ammo;
    this.maxAmmo = Math.max(1, max);
  }

  /**
   * Mastery tell — the field commission. The eyes go ember-white, the gloves grow a wider powder
   * corona ringed in gold lace, and (in the layers below) the tricorn becomes a plumed bicorne,
   * epaulettes land on the shoulders and a gorget hangs at the throat. Outline changes first.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? GUNPOWDER.glow : GUNPOWDER.gold);
    this.forEachHandLayer(0, (glow) => glow.setRadius(on ? 14.5 : 11));
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(2, this.tint(GUNPOWDER.brass), 0.95);
      else shell.setStrokeStyle();
    });
  }

  /** Where one coat sleeve leaves the body, given the hand it has to reach. */
  private shoulderFor(i: number, x: number, y: number): Pt {
    const ang = Math.atan2(this.armY[i] - y, this.armX[i] - x);
    return { x: x + Math.cos(ang) * 9, y: y + 2 + Math.sin(ang) * 5.5 };
  }

  /**
   * Whether hand `i` is close enough to the body to hang hardware off it.
   *
   * The rig lerps its hands toward their pose from wherever they were last, and on the very
   * first frame of a fighter's life that is the world origin — so anything drawn *between* the
   * body and a hand (a sleeve, the musket) would streak across the arena for one frame. Anything
   * further out than a hand can legitimately reach is that transient, and gets skipped.
   */
  private handSettled(i: number, x: number, y: number): boolean {
    return Math.hypot(this.armX[i] - x, this.armY[i] - y) < 70;
  }

  /** Fast-moving hands trail powder smoke. */
  protected emitTrail(x: number, y: number): void {
    this.fx.smoke(x, y, 1, { radius: 4, life: 460, depth: 5, speed: 30 });
  }

  /** Both hands hauled in behind a guard — the reload, and the braced blunderbuss. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    const shake = 0.5 + 0.5 * Math.sin(this.t * 8);
    return {
      ang: this.facing + side * (0.34 + shake * 0.12),
      dist: 21 + shake * 4,
      scale: idle.scale * (1.1 + shake * 0.12),
    };
  }

  /**
   * Scorched ground underfoot with spent smoke drifting off it, plus the queue — the tied
   * ponytail — hanging out from behind the head.
   *
   * The queue is painted here rather than in `drawExtras` on purpose: this layer is *under* the
   * sprite, so the disc masks the root and only the length that actually clears the body shows.
   * That is what sells it as hair coming from behind rather than a stripe pasted on the front.
   */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const k = this.intensity;
    g.fillStyle(this.tint(GUNPOWDER.soot), a * 0.24 * k);
    g.fillEllipse(x, y + 8, 54 * k, 22 * k);
    g.fillStyle(this.tint(this.accent), a * 0.12 * k);
    g.fillEllipse(x, y + 8, 34 * k, 14 * k);
    for (let i = 0; i < 2; i++) {
      const p = (this.t * 0.45 + i / 2) % 1;
      smokePuff(g, this.tint, x + Math.sin(this.t * 1.3 + i * 3) * 14, y + 6 - p * 18,
        5 + p * 8, i * 2.9, GUNPOWDER.smoke, a * 0.16 * (1 - p));
    }

    // ── The queue ──
    // Rooted at the back of the skull and swinging out behind, away from wherever the aim is.
    const back = this.facing + Math.PI;
    const sway = Math.sin(this.t * 2.1) * 0.2;
    const rx = x + Math.cos(back) * 6, ry = y - 6;
    const tipAng = back + 0.45 + sway;
    const len = this.mastered ? 30 : 26;
    const tipX = rx + Math.cos(tipAng) * len, tipY = ry + Math.sin(tipAng) * len * 0.8 + 12;
    const midX = (rx + tipX) / 2 - Math.cos(back) * 3, midY = (ry + tipY) / 2;
    g.fillStyle(this.tint(GUNPOWDER.felt), alpha * 0.95);
    fillPts(g, [
      { x: rx - 5, y: ry - 4 },
      { x: rx + 5, y: ry - 2 },
      { x: midX + 3.6, y: midY },
      { x: tipX + 1.4, y: tipY },
      { x: tipX - 1.4, y: tipY - 1 },
      { x: midX - 3.6, y: midY - 2 },
    ]);
    // Black ribbon binding the tail a third of the way down.
    g.lineStyle(3, this.tint(GUNPOWDER.void), alpha);
    strokePts(g, [
      { x: midX - 4, y: midY - 3 },
      { x: midX + 4, y: midY + 1 },
    ]);
    g.fillStyle(this.tint(this.mastered ? GUNPOWDER.brass : GUNPOWDER.belt), alpha * 0.9);
    g.fillCircle(midX, midY - 1, 1.8);
  }

  /**
   * The regimentals: sleeves, coat, waistcoat, cross-belts and the cartridge box. Painted on the
   * body layer — over the sprite, under the gloves and the eyes — so the character wears the
   * uniform instead of standing behind it.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const sway = Math.sin(this.t * 1.5) * 1.2;
    const lean = Math.cos(this.facing) * 1.6;

    // ── Sleeves ──
    // First, so the coat body closes over the shoulder seam.
    for (let i = 0; i < 2; i++) {
      if (!this.handSettled(i, x, y)) continue;
      const s = this.shoulderFor(i, x, y);
      coatSleeve(g, this.tint, s.x, s.y, this.armX[i], this.armY[i], alpha, this.mastered);
    }

    // ── Coat body ──
    // A split skirt: two tails that swing on opposite phases so walking reads at the hem.
    const skirt: Pt[] = [
      { x: x - 10, y: y + 1 },
      { x: x + 10, y: y + 1 },
      { x: x + 14 + sway * 0.4, y: y + 17 },
      { x: x + 4 + sway * 0.7, y: y + 19 },
      { x: x, y: y + 13 },
      { x: x - 4 - sway * 0.7, y: y + 19 },
      { x: x - 14 + sway * 0.4, y: y + 17 },
    ];
    g.fillStyle(this.tint(GUNPOWDER.coatDeep), alpha);
    fillPts(g, skirt);
    g.fillStyle(this.tint(GUNPOWDER.coat), alpha);
    fillPts(g, skirt.map((p) => ({ x: x + (p.x - x) * 0.88, y: y + (p.y - y) * 0.93 })));

    // ── Waistcoat ──
    // The linen V between the lapels: the one light shape on the torso, so the eye lands centre.
    g.fillStyle(this.tint(GUNPOWDER.linen), alpha);
    fillPts(g, [
      { x: x - 5.4 + lean, y: y + 1 },
      { x: x + 5.4 + lean, y: y + 1 },
      { x: x + 4.2 + lean, y: y + 14 },
      { x: x - 4.2 + lean, y: y + 14 },
    ]);
    g.lineStyle(1, this.tint(GUNPOWDER.buff), alpha * 0.7);
    strokePts(g, [{ x: x + lean, y: y + 2 }, { x: x + lean, y: y + 13 }]);

    // ── Lapels turned back in the facing colour ──
    for (const side of [-1, 1] as const) {
      g.fillStyle(this.tint(GUNPOWDER.buff), alpha);
      fillPts(g, [
        { x: x + side * 4.6 + lean, y: y + 0.5 },
        { x: x + side * 11, y: y + 2 },
        { x: x + side * 9, y: y + 12 },
        { x: x + side * 4.2 + lean, y: y + 11 },
      ]);
      g.fillStyle(this.tint(GUNPOWDER.coatLit), alpha * 0.35);
      fillPts(g, [
        { x: x + side * 5.6 + lean, y: y + 1.6 },
        { x: x + side * 9.6, y: y + 2.8 },
        { x: x + side * 8.4, y: y + 7 },
        { x: x + side * 5.4 + lean, y: y + 6.4 },
      ]);
      // Two rows of brass buttons down the coat front.
      for (let i = 0; i < 3; i++) {
        g.fillStyle(this.tint(GUNPOWDER.brass), alpha);
        g.fillCircle(x + side * 6.6 + lean * 0.6, y + 3.4 + i * 3.6, 1.35);
        g.fillStyle(this.tint(GUNPOWDER.gold), alpha * 0.8);
        g.fillCircle(x + side * 6.9 + lean * 0.6, y + 3.1 + i * 3.6, 0.6);
      }
    }

    // ── Neck stock ──
    // A black leather band with a linen ruffle over it, right under the face.
    g.fillStyle(this.tint(GUNPOWDER.void), alpha);
    fillPts(g, [
      { x: x - 6.4, y: y - 1.6 },
      { x: x + 6.4, y: y - 1.6 },
      { x: x + 5.4, y: y + 2 },
      { x: x - 5.4, y: y + 2 },
    ]);
    g.fillStyle(this.tint(GUNPOWDER.belt), alpha * 0.95);
    g.fillEllipse(x + lean * 0.5, y + 1.4, 7.6, 3.4);

    // ── Cross-belts ──
    // Two pipeclayed straps over opposite shoulders, meeting at a brass plate on the sternum.
    for (const side of [-1, 1] as const) {
      g.fillStyle(this.tint(GUNPOWDER.belt), alpha * 0.92);
      fillPts(g, [
        { x: x + side * 12.4, y: y + 1.4 },
        { x: x + side * 8.6, y: y + 0.6 },
        { x: x - side * 8.6, y: y + 15 },
        { x: x - side * 12, y: y + 14.4 },
      ]);
      g.lineStyle(0.9, this.tint(GUNPOWDER.ash), alpha * 0.45);
      strokePts(g, [{ x: x + side * 8.8, y: y + 0.9 }, { x: x - side * 12.2, y: y + 14.6 }]);
    }
    // Belt plate at the crossing — a brass oval, the regiment's badge.
    g.fillStyle(this.tint(GUNPOWDER.brass), alpha);
    g.fillEllipse(x, y + 7.8, 8.6, 6.4);
    g.fillStyle(this.tint(GUNPOWDER.gold), alpha * 0.85);
    g.fillEllipse(x, y + 7.4, 6.2, 4.2);
    g.fillStyle(this.tint(GUNPOWDER.void), alpha * 0.8);
    g.fillCircle(x, y + 7.6, 1.6);

    // ── Cartridge loops ──
    // The live ammo readout, worn on the belt where it would actually be. Loops empty
    // left-to-right, so a dry musketeer is visibly out of charges.
    const loops = Math.max(1, this.maxAmmo);
    for (let i = 0; i < loops; i++) {
      const u = loops === 1 ? 0.5 : i / (loops - 1);
      const bx = x - 9.4 + u * 18.8;
      const by = y + 3.6 + Math.abs(u - 0.5) * 2.4;
      cartridge(g, this.tint, bx, by, Math.PI / 2 + (u - 0.5) * 0.5, 3.4, i >= this.ammo, alpha * 0.95);
    }

    // ── Cartridge box on the hip ──
    g.fillStyle(this.tint(GUNPOWDER.void), alpha);
    fillPts(g, [
      { x: x + 8.6, y: y + 12 },
      { x: x + 16, y: y + 11 },
      { x: x + 16.6, y: y + 17.4 },
      { x: x + 9, y: y + 18.4 },
    ]);
    g.fillStyle(this.tint(GUNPOWDER.char), alpha);
    fillPts(g, [
      { x: x + 9.4, y: y + 12.6 },
      { x: x + 15.2, y: y + 11.8 },
      { x: x + 15.4, y: y + 14.4 },
      { x: x + 9.6, y: y + 15.2 },
    ]);
    g.fillStyle(this.tint(this.ammo > 0 ? GUNPOWDER.brass : GUNPOWDER.ash), alpha);
    g.fillCircle(x + 12.6, y + 16, 1.5);

    // ── Officer's gorget and epaulettes ──
    if (this.mastered) {
      // Crescent at the throat, hung on two ribbons.
      g.fillStyle(this.tint(GUNPOWDER.brass), alpha);
      fillPts(g, [
        { x: x - 6.6, y: y - 1.4 },
        { x: x, y: y + 3.4 },
        { x: x + 6.6, y: y - 1.4 },
        { x: x + 4.6, y: y - 0.6 },
        { x: x, y: y + 1.6 },
        { x: x - 4.6, y: y - 0.6 },
      ]);
      g.fillStyle(this.tint(GUNPOWDER.gold), alpha * 0.8);
      fillPts(g, [
        { x: x - 4.4, y: y - 0.9 },
        { x: x, y: y + 1.8 },
        { x: x + 4.4, y: y - 0.9 },
        { x: x + 3.2, y: y - 0.5 },
        { x: x, y: y + 0.8 },
        { x: x - 3.2, y: y - 0.5 },
      ]);
      for (const side of [-1, 1] as const) {
        epaulette(g, this.tint, x + side * 10.5, y + 1.5, side, alpha, this.t);
      }
    }
  }

  /**
   * The hat and the weapon — the two things that have to read from across the arena.
   *
   * Drawn over the sprite so the hardware sits in front of the body rather than peeking around
   * it, and the tricorn is rooted at the crown so its brim frames the face from above without
   * ever covering the eyes.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;

    // ── The musket ──
    // Loaded, it is carried at the ready along the aim in the leading fist. Empty, it goes to the
    // shoulder butt-down — the character never stands there weaponless, the posture just changes.
    const fx = Math.cos(this.facing), fy = Math.sin(this.facing);
    const lead = fx * (this.armX[1] - x) + fy * (this.armY[1] - y)
      >= fx * (this.armX[0] - x) + fy * (this.armY[0] - y) ? 1 : 0;
    const hx = this.armX[lead], hy = this.armY[lead];
    if (this.handSettled(lead, x, y)) {
      const len = 36 * this.intensity;
      if (this.ammo > 0) {
        const aim = Math.atan2(hy - y, hx - x);
        musket(g, this.tint, hx + Math.cos(aim) * len * 0.26, hy + Math.sin(aim) * len * 0.26,
          aim, len, 0, alpha * 0.98, this.mastered);
      } else {
        // Shouldered: butt low and behind, muzzle high and forward, riding the trailing side.
        const shoulderAng = -Math.PI / 2 - fx * 0.5;
        const bx = x - fx * 7, by = y - 3;
        musket(g, this.tint, bx + Math.cos(shoulderAng) * len * 0.16, by + Math.sin(shoulderAng) * len * 0.16,
          shoulderAng, len, 0, alpha * 0.9, this.mastered);
      }
    }

    // ── The tricorn ──
    const lean = fx * 2.2;
    tricorn(g, this.tint, x, y - 14, lean, 1 + (this.intensity - 1) * 0.3, alpha, this.mastered, this.t);

    // ── Mastery: firework tubes racked behind the bicorne, wicks lit ──
    if (this.mastered) {
      const rootY = y - 22;
      for (const i of [-1, 1] as const) {
        const ang = -Math.PI / 2 + i * 0.5 + Math.sin(this.t * 1.4 + i) * 0.06;
        GunpowderFx.drawFireworkTube(g, this.tint, x + i * 12 - lean, rootY,
          Math.cos(ang), Math.sin(ang),
          0.35 + 0.35 * Math.abs(Math.sin(this.t * 1.1 + i)), this.accent, this.t);
      }
      for (let i = 0; i < 2; i++) {
        const p = (this.t * 0.7 + i / 2) % 1;
        smokePuff(g, this.tint, x + Math.sin(this.t * 1.9 + i * 2) * 10, rootY - 18 - p * 20,
          4 + p * 8, i * 3.3, GUNPOWDER.smoke, alpha * 0.22 * (1 - p));
      }
    }
  }
}
