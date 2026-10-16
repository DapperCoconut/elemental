import Phaser from 'phaser';
import { ArmHold, ArmPose, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Devotion draws. (The element id is still `passion`, so the file keeps the name.)
 *
 * The element never deals a point of damage, so its art carries the whole fight: you cannot read
 * a Devotion match off the health bars, only off the faith bar over the enemy's head and the halo
 * that forms above them as it fills — a dotted ring at a quarter, a solid one at half, a blazing
 * glory at three quarters. Everything else in this file exists to make those readable at a glance.
 *
 * The element's primitive is the **holy ray**: a tapered lance of light, fat at the root and
 * needle-thin at the tip, always painted in three passes (warm halo → pale body → white core). A
 * glory is a ring of them, a burst is a fan of them, and the chariot's flames are long ones bent
 * by the wind. The second shape is the plain Latin cross, which every ability carries somewhere.
 *
 * Light yellow is never flat: every fill runs from a deep ochre shadow through the element's pale
 * gold to a near-white core, because a single mid-yellow disc reads as a coin.
 */

export type PassionColorFn = ColorFn;

export const DEV = {
  /** The dark everything is drawn against — a warm umber, never a neutral black. */
  ink: 0x2b2210,
  umber: 0x6e5626,
  ochre: 0xb98b2c,
  gold: 0xe8b93a,
  /** The element colour. */
  holy: 0xf5e08a,
  pale: 0xfff2b8,
  white: 0xfffcf0,
  /** Holy water. */
  waterDeep: 0x2f7fc0,
  water: 0x8fd3ff,
  waterLit: 0xd8f2ff,
  /** The chariot's fire. */
  fireDeep: 0xc8461a,
  fire: 0xff9a2e,
  fireHot: 0xffe07a,
  /** The crucifix. */
  woodDeep: 0x4a2a12,
  wood: 0x8a5a2c,
  woodLit: 0xc08a50,
};

// ── Primitives ────────────────────────────────────────────────────────────

/** Deterministic 0–1 noise, so anything that has to wobble the same way every frame can. */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 61.3 + i * 293.7) * 24571.317;
  return v - Math.floor(v);
}

/**
 * The holy ray: a tapered lance from (x, y) out along `ang`. Fat and rounded at the root, a
 * needle at the tip, with a slight swell a third of the way out so a ring of them reads as light
 * pouring out rather than as a starburst of spikes.
 */
export function holyRay(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, ang: number, len: number, halfW: number,
  color: number, alpha: number,
): void {
  if (alpha <= 0.01 || len <= 1) return;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const nx = -sa;
  const ny = ca;
  const swell = halfW * 1.15;
  const pts = [
    new Phaser.Geom.Point(x + nx * halfW, y + ny * halfW),
    new Phaser.Geom.Point(x + ca * len * 0.32 + nx * swell, y + sa * len * 0.32 + ny * swell),
    new Phaser.Geom.Point(x + ca * len, y + sa * len),
    new Phaser.Geom.Point(x + ca * len * 0.32 - nx * swell, y + sa * len * 0.32 - ny * swell),
    new Phaser.Geom.Point(x - nx * halfW, y - ny * halfW),
  ];
  g.fillStyle(tint(color), alpha);
  g.fillPoints(pts, true);
  // The rounded root — without it a ring of rays has a hard polygon hole in the middle.
  g.fillCircle(x, y, halfW);
}

/** Three passes of `holyRay`: warm halo, pale body, white-hot core. */
export function holyRayLayered(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, ang: number, len: number, halfW: number, alpha: number,
  outer = DEV.gold,
): void {
  holyRay(g, tint, x, y, ang, len * 1.08, halfW * 1.6, outer, alpha * 0.35);
  holyRay(g, tint, x, y, ang, len, halfW, DEV.holy, alpha * 0.8);
  holyRay(g, tint, x, y, ang, len * 0.7, halfW * 0.45, DEV.white, alpha * 0.95);
}

/** A ring of rays around a point — the glory behind a saint, and the shape of every holy burst. */
export function glory(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, r0: number, len: number, rays: number, spin: number, alpha: number,
  halfW = 2.6,
): void {
  for (let i = 0; i < rays; i++) {
    const a = spin + (i / rays) * TAU;
    // Alternate long and short, the way a gilded monstrance is cut.
    const l = len * (i % 2 ? 0.62 : 1);
    holyRayLayered(g, tint, x + Math.cos(a) * r0, y + Math.sin(a) * r0, a, l, halfW, alpha);
  }
}

/** A plain Latin cross, its long arm down, rotated so "down" points along `ang + π/2`. */
export function cross(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, size: number, ang: number, color: number, alpha: number,
  outline = DEV.ink,
): void {
  if (alpha <= 0.01) return;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const w = size * 0.2;
  // Local (u across, v down) → world.
  const P = (u: number, v: number): Phaser.Geom.Point =>
    new Phaser.Geom.Point(x + ca * u - sa * v, y + sa * u + ca * v);
  const top = -size * 0.62;
  const bot = size;
  const arm = size * 0.5;
  const armY = -size * 0.22;
  const pts = [
    P(-w, top), P(w, top), P(w, armY - w), P(arm, armY - w), P(arm, armY + w), P(w, armY + w),
    P(w, bot), P(-w, bot), P(-w, armY + w), P(-arm, armY + w), P(-arm, armY - w), P(-w, armY - w),
  ];
  g.fillStyle(tint(outline), alpha * 0.55);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x + 1, p.y + 1)), true);
  g.fillStyle(tint(color), alpha);
  g.fillPoints(pts, true);
}

/** An elliptical halo ring, seen slightly from above. */
export function halo(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, rx: number, alpha: number, width = 2.4, dotted = false, t = 0,
): void {
  if (alpha <= 0.01) return;
  const ry = rx * 0.34;
  if (dotted) {
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + t * 0.8;
      g.fillStyle(tint(DEV.holy), alpha * (0.55 + 0.45 * Math.sin(a * 2 + t * 3)));
      g.fillCircle(x + Math.cos(a) * rx, y + Math.sin(a) * ry, width * 0.6);
    }
    return;
  }
  g.lineStyle(width + 3, tint(DEV.gold), alpha * 0.3);
  g.strokeEllipse(x, y, rx * 2, ry * 2);
  g.lineStyle(width, tint(DEV.holy), alpha * 0.95);
  g.strokeEllipse(x, y, rx * 2, ry * 2);
  g.lineStyle(width * 0.4, tint(DEV.white), alpha * 0.9);
  g.strokeEllipse(x, y - 0.6, rx * 2 - 2, ry * 2 - 1);
}

/**
 * The mitre: a tall two-peaked bishop's hat with a gold band and a cross on the front. The one
 * accessory. `scale` grows it for a mastered priest and `trim` gilds its edges.
 */
export function mitre(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, alpha: number, tilt: number, scale = 1, trim = DEV.ochre,
): void {
  const ca = Math.cos(tilt);
  const sa = Math.sin(tilt);
  const P = (u: number, v: number): Phaser.Geom.Point =>
    new Phaser.Geom.Point(x + (ca * u - sa * v) * scale, y + (sa * u + ca * v) * scale);
  // The body of the hat: two arched halves meeting in a notch at the top.
  const shell = [
    P(-10, 2), P(-11, -6), P(-8.5, -14), P(-3.5, -21), P(-0.5, -16),
    P(0.5, -16), P(3.5, -21), P(8.5, -14), P(11, -6), P(10, 2),
  ];
  g.fillStyle(tint(DEV.umber), alpha * 0.6);
  g.fillPoints(shell.map((p) => new Phaser.Geom.Point(p.x + 1.2, p.y + 1.2)), true);
  g.fillStyle(tint(DEV.white), alpha);
  g.fillPoints(shell, true);
  // Shading down the right half so it reads as a folded cone, not a flat card.
  g.fillStyle(tint(DEV.pale), alpha * 0.9);
  g.fillPoints([P(0.5, -16), P(3.5, -21), P(8.5, -14), P(11, -6), P(10, 2), P(1, 2)], true);
  // Trim: the outline, the front band and the base band.
  g.lineStyle(1.3, tint(trim), alpha);
  g.strokePoints(shell, true);
  g.fillStyle(tint(trim), alpha);
  g.fillPoints([P(-1.6, -16), P(1.6, -16), P(1.6, 2), P(-1.6, 2)], true);
  g.fillPoints([P(-10.4, -1.5), P(10.4, -1.5), P(10, 2), P(-10, 2)], true);
  // The cross on the front.
  const c = P(0, -8);
  cross(g, tint, c.x, c.y, 5.4 * scale, tilt, DEV.gold, alpha, DEV.umber);
}

/** The faith bar over a victim's head, with notches at the three thresholds. */
export function faithBar(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, w: number, h: number, ratio: number, t: number,
): void {
  const left = x - w / 2;
  g.fillStyle(tint(DEV.ink), 0.82);
  g.fillRoundedRect(left - 1.5, y - 1.5, w + 3, h + 3, 2.5);
  if (ratio > 0) {
    g.fillStyle(tint(DEV.ochre), 1);
    g.fillRect(left, y, w * ratio, h);
    g.fillStyle(tint(DEV.holy), 1);
    g.fillRect(left, y, w * ratio, h * 0.6);
    // A glint running along the filled part.
    const gx = left + ((t * 40) % Math.max(1, w * ratio));
    g.fillStyle(tint(DEV.white), 0.75);
    g.fillRect(gx, y, 3, h * 0.6);
  }
  for (const m of [0.25, 0.5, 0.75]) {
    g.fillStyle(tint(ratio >= m ? DEV.white : DEV.umber), 0.9);
    g.fillRect(left + w * m - 0.5, y - 1, 1, h + 2);
  }
  // A small cross capping the bar, so it can never be mistaken for a health bar.
  cross(g, tint, left + w + 6, y + h / 2, 4.2, 0, ratio >= 1 ? DEV.white : DEV.holy, 1, DEV.ink);
}

/**
 * Holy water, boiling. A blue-white pool with a gold rim, bubbles welling and popping on a fixed
 * seed, steam curling off it, and a cross of light shimmering on the surface. `life` is 0→1 over
 * the puddle's lifetime: it shrinks a touch and pales at the end so the expiry is readable.
 */
export function holyWaterPuddle(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, r: number, t: number, seed: number, life: number, alpha = 1,
): void {
  const fade = alpha * (life > 0.85 ? 1 - (life - 0.85) / 0.15 : 1);
  if (fade <= 0.01) return;
  const rr = r * (1 - life * 0.08);
  // Lobed edge, so it reads as liquid that splashed rather than a stamped disc.
  const pts: Phaser.Geom.Point[] = [];
  const n = 26;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const k = 0.9 + jitter(seed, i) * 0.16 + Math.sin(t * 2 + i) * 0.015;
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr * k, y + Math.sin(a) * rr * k * 0.82));
  }
  g.fillStyle(tint(DEV.gold), fade * 0.35);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 1.07, y + (p.y - y) * 1.07)), true);
  g.fillStyle(tint(DEV.waterDeep), fade * 0.55);
  g.fillPoints(pts, true);
  g.fillStyle(tint(DEV.water), fade * 0.5);
  g.fillEllipse(x - rr * 0.08, y - rr * 0.06, rr * 1.5, rr * 1.15);
  g.fillStyle(tint(DEV.waterLit), fade * 0.35);
  g.fillEllipse(x - rr * 0.22, y - rr * 0.2, rr * 0.8, rr * 0.45);
  // The cross of light on the surface.
  const shimmer = 0.25 + 0.15 * Math.sin(t * 3 + seed);
  cross(g, tint, x, y - rr * 0.05, rr * 0.42, 0, DEV.white, fade * shimmer, DEV.waterDeep);
  // Bubbles: each cycles well → swell → pop on its own clock.
  for (let i = 0; i < 9; i++) {
    const ph = (t * (0.8 + jitter(seed, i + 40) * 0.7) + jitter(seed, i + 20)) % 1;
    const a = jitter(seed, i + 60) * TAU;
    const d = Math.sqrt(jitter(seed, i + 80)) * rr * 0.78;
    const bx = x + Math.cos(a) * d;
    const by = y + Math.sin(a) * d * 0.8;
    if (ph < 0.85) {
      const br = 1.4 + ph * 3.6;
      g.lineStyle(1, tint(DEV.waterLit), fade * 0.8);
      g.strokeCircle(bx, by, br);
      g.fillStyle(tint(DEV.white), fade * 0.5);
      g.fillCircle(bx - br * 0.35, by - br * 0.35, br * 0.3);
    } else {
      const p = (ph - 0.85) / 0.15;
      g.lineStyle(1, tint(DEV.white), fade * (1 - p));
      g.strokeCircle(bx, by, 5 + p * 5);
    }
  }
  // Steam curling off the top.
  for (let i = 0; i < 4; i++) {
    const ph = (t * 0.45 + i * 0.25 + jitter(seed, i + 100)) % 1;
    const sx = x + (jitter(seed, i + 120) - 0.5) * rr * 1.2 + Math.sin(ph * 6 + i) * 5;
    const sy = y - ph * 34;
    g.fillStyle(tint(DEV.white), fade * (1 - ph) * 0.22);
    g.fillCircle(sx, sy, 5 + ph * 8);
  }
}

/** A holy-water vial: glass body, blue water, a cork and a gold cross label. */
export function vial(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, ang: number, alpha: number, size = 1,
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number): Phaser.Geom.Point =>
    new Phaser.Geom.Point(x + (ca * u - sa * v) * size, y + (sa * u + ca * v) * size);
  const body = [P(-6, -3), P(-4, -6), P(4, -6), P(6, -3), P(6, 6), P(4, 8), P(-4, 8), P(-6, 6)];
  g.fillStyle(tint(DEV.ink), alpha * 0.4);
  g.fillPoints(body.map((p) => new Phaser.Geom.Point(p.x + 1, p.y + 1)), true);
  g.fillStyle(tint(DEV.waterLit), alpha * 0.55);
  g.fillPoints(body, true);
  g.fillStyle(tint(DEV.water), alpha * 0.9);
  g.fillPoints([P(-6, 0), P(6, 0), P(6, 6), P(4, 8), P(-4, 8), P(-6, 6)], true);
  // Neck and cork.
  g.fillStyle(tint(DEV.waterLit), alpha * 0.7);
  g.fillPoints([P(-2.2, -6), P(2.2, -6), P(2.2, -9), P(-2.2, -9)], true);
  g.fillStyle(tint(DEV.wood), alpha);
  g.fillPoints([P(-2.6, -9), P(2.6, -9), P(2.2, -12), P(-2.2, -12)], true);
  const c = P(0, 2);
  cross(g, tint, c.x, c.y, 4, ang, DEV.gold, alpha, DEV.waterDeep);
  const glint = P(-3.6, -2);
  g.fillStyle(tint(DEV.white), alpha * 0.8);
  g.fillEllipse(glint.x, glint.y, 1.6 * size, 3.4 * size);
}

/**
 * The Holy Hand Grenade: a golden orb, a jewelled band around its middle, and a cross on top.
 * `fuse` 0→1 drives a pulsing glow that quickens toward the burst.
 */
export function handGrenade(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, spin: number, alpha: number, fuse: number, t: number,
): void {
  const pulse = 0.5 + 0.5 * Math.sin(t * (6 + fuse * 26));
  g.fillStyle(tint(DEV.holy), alpha * (0.15 + fuse * 0.35) * (0.6 + pulse * 0.4));
  g.fillCircle(x, y, 13 + fuse * 7 + pulse * 3);
  g.fillStyle(tint(DEV.umber), alpha);
  g.fillCircle(x + 0.8, y + 0.8, 7.6);
  g.fillStyle(tint(DEV.ochre), alpha);
  g.fillCircle(x, y, 7.2);
  g.fillStyle(tint(DEV.gold), alpha);
  g.fillCircle(x - 0.6, y - 0.6, 6.2);
  g.fillStyle(tint(DEV.pale), alpha * 0.85);
  g.fillCircle(x - 2.4, y - 2.6, 2.2);
  // The band, tilted with the spin so it reads as rolling.
  const bw = Math.cos(spin) * 7;
  g.lineStyle(1.6, tint(DEV.umber), alpha * 0.9);
  g.strokeEllipse(x, y, Math.max(1, Math.abs(bw) * 2), 14);
  g.fillStyle(tint(DEV.waterDeep), alpha);
  g.fillCircle(x + bw * 0.6, y, 1.4);
  // The cross on top.
  cross(g, tint, x, y - 10.5, 4.6, 0, DEV.gold, alpha, DEV.umber);
}

/** The crucifix itself, standing upright with its foot at (x, y). `rise` 0→1 lifts it in. */
export function crucifixPost(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, alpha: number, t: number, rise = 1, scale = 1,
): void {
  const s = scale * (0.4 + easeOut(rise) * 0.6);
  // Shadow on the floor.
  g.fillStyle(tint(DEV.ink), alpha * 0.35 * rise);
  g.fillEllipse(x + 4, y + 2, 26 * s, 8 * s);
  // Mound of earth it is planted in.
  g.fillStyle(tint(DEV.woodDeep), alpha);
  g.fillEllipse(x, y, 20 * s, 7 * s);
  const top = y - 58 * s;
  const armY = y - 44 * s;
  const w = 3.6 * s;
  const arm = 15 * s;
  // Post and crossbeam: dark side, lit side, grain.
  g.fillStyle(tint(DEV.woodDeep), alpha);
  g.fillRect(x - w, top, w * 2, y - top);
  g.fillRect(x - arm, armY - w, arm * 2, w * 2);
  g.fillStyle(tint(DEV.wood), alpha);
  g.fillRect(x - w, top, w * 1.2, y - top);
  g.fillRect(x - arm, armY - w, arm * 2, w * 1.1);
  g.fillStyle(tint(DEV.woodLit), alpha * 0.8);
  g.fillRect(x - w, top, w * 0.4, y - top);
  // A gold sunburst where the beams meet.
  const glow = 0.6 + 0.4 * Math.sin(t * 2.4);
  glory(g, tint, x, armY, 3 * s, 9 * s * (0.8 + glow * 0.3), 8, t * 0.4, alpha * 0.8 * rise, 1.4 * s);
  g.fillStyle(tint(DEV.white), alpha * glow);
  g.fillCircle(x, armY, 2.4 * s);
}

/** The aura around a crucifix: a ring of light on the floor with crosses turning slowly in it. */
export function crucifixAura(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, r: number, t: number, alpha: number, flare = 0,
): void {
  g.fillStyle(tint(DEV.holy), alpha * (0.07 + flare * 0.1));
  g.fillCircle(x, y, r);
  g.fillStyle(tint(DEV.pale), alpha * 0.06);
  g.fillCircle(x, y, r * 0.7);
  g.lineStyle(4, tint(DEV.gold), alpha * (0.22 + flare * 0.3));
  g.strokeCircle(x, y, r);
  g.lineStyle(1.6, tint(DEV.white), alpha * (0.6 + flare * 0.3));
  g.strokeCircle(x, y, r - 1);
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + t * 0.25;
    cross(g, tint, x + Math.cos(a) * (r - 9), y + Math.sin(a) * (r - 9), 5.4, a + Math.PI / 2,
      DEV.holy, alpha * 0.7, DEV.umber);
  }
  // Short rays standing out of the rim, pointing outward — "keep out", not "come in".
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU - t * 0.18;
    holyRay(g, tint, x + Math.cos(a) * r, y + Math.sin(a) * r, a, 9 + Math.sin(t * 3 + i) * 3,
      1.6, DEV.holy, alpha * 0.5);
  }
}

/**
 * Ascendance's telegraph: a band of light right across the arena, filling from the edges as the
 * wind-up runs out, with crosses marching along its centre line toward the chariot's exit.
 */
export function ascendBand(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  left: number, right: number, y: number, half: number, progress: number, dir: number,
  t: number, alpha = 1,
): void {
  const w = right - left;
  const beat = 0.5 + 0.5 * Math.sin(t * (6 + progress * 14));
  g.fillStyle(tint(DEV.holy), alpha * (0.08 + progress * 0.14 + beat * 0.05));
  g.fillRect(left, y - half, w, half * 2);
  // The fill sweeping across from the side the chariot comes in on.
  const fillW = w * progress;
  const fx = dir > 0 ? left : right - fillW;
  g.fillStyle(tint(DEV.fire), alpha * 0.14);
  g.fillRect(fx, y - half, fillW, half * 2);
  // Edges.
  g.lineStyle(2, tint(DEV.gold), alpha * (0.5 + beat * 0.4));
  g.lineBetween(left, y - half, right, y - half);
  g.lineBetween(left, y + half, right, y + half);
  g.lineStyle(1, tint(DEV.white), alpha * 0.6);
  g.lineBetween(left, y - half + 3, right, y - half + 3);
  g.lineBetween(left, y + half - 3, right, y + half - 3);
  // Marching crosses.
  const step = 64;
  const off = ((t * 90 * dir) % step + step) % step;
  for (let cx = left - step + off; cx < right + step; cx += step) {
    if (cx < left + 6 || cx > right - 6) continue;
    cross(g, tint, cx, y, 7, 0, DEV.holy, alpha * (0.35 + progress * 0.45), DEV.umber);
  }
  // Chevrons along both edges pointing the way it will run.
  for (let cx = left + 20; cx < right; cx += 46) {
    for (const ey of [y - half - 7, y + half + 7]) {
      g.lineStyle(2, tint(DEV.gold), alpha * 0.5 * beat);
      g.lineBetween(cx - 5 * dir, ey - 4, cx, ey);
      g.lineBetween(cx - 5 * dir, ey + 4, cx, ey);
    }
  }
}

/** One long wind-bent flame tongue, for the chariot and its horses. */
function flameLick(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, ang: number, len: number, w: number, alpha: number,
): void {
  holyRay(g, tint, x, y, ang, len * 1.1, w * 1.5, DEV.fireDeep, alpha * 0.55);
  holyRay(g, tint, x, y, ang, len, w, DEV.fire, alpha * 0.85);
  holyRay(g, tint, x, y, ang, len * 0.6, w * 0.45, DEV.fireHot, alpha * 0.95);
}

/**
 * The flaming chariot, running along `dir` (±1) with its front at (x, y). Two horses of fire pull
 * a gilded car on one great spoked wheel; everything streams flame backward. Optionally carries
 * the caster as a small bright figure riding the car.
 */
export function chariot(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, dir: number, t: number, alpha: number, rider = false,
): void {
  const back = dir > 0 ? Math.PI : 0;
  // Flame trail streaming back off everything.
  for (let i = 0; i < 9; i++) {
    const oy = (jitter(i, 3) - 0.5) * 50;
    const ox = -dir * (30 + jitter(i, 7) * 60);
    const len = 50 + jitter(i, 11) * 70 + Math.sin(t * 20 + i) * 12;
    flameLick(g, tint, x + ox, y + oy, back + (jitter(i, 5) - 0.5) * 0.3, len, 6, alpha * 0.85);
  }
  // Horses: two stacked, staggered, each a body of flame with a neck, head and galloping legs.
  for (let h = 0; h < 2; h++) {
    const hx = x - dir * (6 + h * 14);
    const hy = y - 12 + h * 18;
    const gallop = Math.sin(t * 26 + h * 1.8);
    // Mane and tail.
    flameLick(g, tint, hx - dir * 14, hy - 4, back - dir * 0.3, 22, 4, alpha);
    flameLick(g, tint, hx + dir * 10, hy - 14, back - dir * 0.9, 16, 3.4, alpha);
    // Body.
    g.fillStyle(tint(DEV.fireDeep), alpha);
    g.fillEllipse(hx, hy, 30, 13);
    g.fillStyle(tint(DEV.fire), alpha);
    g.fillEllipse(hx, hy - 1, 26, 9);
    // Neck and head.
    g.fillStyle(tint(DEV.fire), alpha);
    g.fillPoints([
      new Phaser.Geom.Point(hx + dir * 8, hy - 3),
      new Phaser.Geom.Point(hx + dir * 15, hy - 15),
      new Phaser.Geom.Point(hx + dir * 21, hy - 13),
      new Phaser.Geom.Point(hx + dir * 13, hy + 1),
    ], true);
    g.fillStyle(tint(DEV.fireHot), alpha);
    g.fillEllipse(hx + dir * 20, hy - 13, 9, 6);
    g.fillStyle(tint(DEV.white), alpha);
    g.fillCircle(hx + dir * 21, hy - 14, 1.2);
    // Legs.
    g.lineStyle(2.6, tint(DEV.fire), alpha);
    g.lineBetween(hx + dir * 8, hy + 4, hx + dir * (12 + gallop * 6), hy + 13);
    g.lineBetween(hx - dir * 8, hy + 4, hx - dir * (10 - gallop * 6), hy + 13);
  }
  // Traces back to the car.
  const cx = x - dir * 44;
  g.lineStyle(1.6, tint(DEV.gold), alpha * 0.9);
  g.lineBetween(x - dir * 14, y - 10, cx + dir * 10, y - 4);
  g.lineBetween(x - dir * 14, y + 8, cx + dir * 10, y + 2);
  // The car: a gilded tub.
  g.fillStyle(tint(DEV.umber), alpha);
  g.fillPoints([
    new Phaser.Geom.Point(cx + dir * 12, y - 12),
    new Phaser.Geom.Point(cx - dir * 14, y - 16),
    new Phaser.Geom.Point(cx - dir * 16, y + 6),
    new Phaser.Geom.Point(cx + dir * 10, y + 6),
  ], true);
  g.fillStyle(tint(DEV.gold), alpha);
  g.fillPoints([
    new Phaser.Geom.Point(cx + dir * 11, y - 10),
    new Phaser.Geom.Point(cx - dir * 13, y - 14),
    new Phaser.Geom.Point(cx - dir * 14, y + 3),
    new Phaser.Geom.Point(cx + dir * 9, y + 3),
  ], true);
  cross(g, tint, cx - dir * 2, y - 4, 6, 0, DEV.white, alpha, DEV.umber);
  if (rider) {
    // The priest, hauled aboard: a bright orb with a mitre peak showing over the rail.
    g.fillStyle(tint(DEV.holy), alpha);
    g.fillCircle(cx - dir * 2, y - 20, 8);
    g.fillStyle(tint(DEV.white), alpha);
    g.fillTriangle(cx - dir * 2 - 5, y - 26, cx - dir * 2 + 5, y - 26, cx - dir * 2, y - 36);
  }
  // The wheel: rim, spokes turning, hub.
  const wx = cx - dir * 2;
  const wy = y + 8;
  const spin = t * 22 * dir;
  g.lineStyle(3, tint(DEV.ochre), alpha);
  g.strokeCircle(wx, wy, 11);
  g.lineStyle(1.4, tint(DEV.gold), alpha);
  for (let i = 0; i < 6; i++) {
    const a = spin + (i / 6) * TAU;
    g.lineBetween(wx, wy, wx + Math.cos(a) * 10, wy + Math.sin(a) * 10);
  }
  g.fillStyle(tint(DEV.white), alpha);
  g.fillCircle(wx, wy, 2.4);
}

/** The ground mark where a crash is about to land: a shadow that tightens and a ring of crosses. */
export function crashMark(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, r: number, progress: number, t: number,
): void {
  const k = easeIn(progress);
  g.fillStyle(tint(DEV.ink), 0.12 + k * 0.25);
  g.fillEllipse(x, y, r * 2 * (1.2 - k * 0.5), r * 0.9 * (1.2 - k * 0.5));
  g.lineStyle(2, tint(DEV.fire), 0.3 + k * 0.5);
  g.strokeCircle(x, y, r);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + t * 1.4;
    cross(g, tint, x + Math.cos(a) * r, y + Math.sin(a) * r, 6, 0, DEV.fireHot, 0.4 + k * 0.5, DEV.fireDeep);
  }
}

// ── Fx ────────────────────────────────────────────────────────────────────

export class PassionFx extends FxBase {
  /** Rising star-glints. The element's default "something holy happened". */
  sparkle(x: number, y: number, count = 8, spread = 30, color = DEV.holy, ms = 720, depth = 9): void {
    const seeds = Array.from({ length: count }, () => ({
      a: -Math.PI / 2 + (Math.random() - 0.5) * 2.6,
      d: spread * (0.35 + Math.random() * 0.65),
      r: 2.6 + Math.random() * 3,
      s: Math.random() * 9,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        const px = x + Math.cos(p.a) * p.d * e;
        const py = y + Math.sin(p.a) * p.d * e - e * 22;
        const r = p.r * (1 - t * 0.5) * (0.7 + 0.3 * Math.sin(t * 20 + p.s));
        g.lineStyle(1.6, this.tint(color), (1 - t) * 0.95);
        g.lineBetween(px - r, py, px + r, py);
        g.lineBetween(px, py - r * 1.4, px, py + r);
        g.fillStyle(this.tint(DEV.white), (1 - t) * 0.9);
        g.fillCircle(px, py, r * 0.35);
      }
    });
  }

  /** An expanding ring of light with crosses riding its edge. */
  ring(x: number, y: number, r0: number, r1: number, color = DEV.holy, ms = 600, depth = 9): void {
    const n = Math.max(8, Math.round(r1 / 9));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      const r = r0 + (r1 - r0) * e;
      g.lineStyle(3, this.tint(color), (1 - t) * 0.55);
      g.strokeCircle(x, y, r);
      g.lineStyle(1, this.tint(DEV.white), (1 - t) * 0.7);
      g.strokeCircle(x, y, r - 2);
      for (let i = 0; i < n; i += 2) {
        const a = (i / n) * TAU + t * 0.5;
        cross(g, this.tint, x + Math.cos(a) * r, y + Math.sin(a) * r, 5 * (1 - t * 0.5), 0,
          color, (1 - t) * 0.8);
      }
    });
  }

  /** The sermon going out: a fan of light off the hand. */
  preach(x: number, y: number, ang: number, power: number): void {
    this.anim(10, 260 + power * 160, (g, t) => {
      const fade = 1 - t;
      const n = 5 + Math.round(power * 4);
      for (let i = 0; i < n; i++) {
        const a = ang + (i / (n - 1) - 0.5) * (0.7 + power * 0.5);
        holyRayLayered(g, this.tint, x, y, a, (18 + power * 22) * (0.5 + easeOut(t)), 2.2, fade * 0.8);
      }
      g.fillStyle(this.tint(DEV.white), fade * 0.8);
      g.fillCircle(x, y, 5 + power * 4);
    });
  }

  /** A letter striking home: a small glory and a cross popping off the body. */
  letterHit(x: number, y: number, ang: number): void {
    this.anim(11, 300, (g, t) => {
      const fade = 1 - t;
      glory(g, this.tint, x, y, 3, 10 + t * 12, 6, ang, fade * 0.8, 1.6);
      cross(g, this.tint, x + Math.cos(ang) * 6, y - 10 - t * 14, 5, 0, DEV.holy, fade);
    });
  }

  /** The vial bursting: glass shards, a splash crown, then steam rolling off the new puddle. */
  shatter(x: number, y: number, r: number): void {
    const shards = Array.from({ length: 10 }, (_, i) => ({
      a: (i / 10) * TAU + Math.random() * 0.4, d: 20 + Math.random() * 30, s: Math.random() * 6,
    }));
    this.flashIn(x, y, 14, DEV.white, DEV.water, 11);
    this.anim(10, 520, (g, t) => {
      const e = easeOut(t);
      const fade = 1 - t;
      // Splash crown.
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        const d = r * 0.3 + e * r * 0.75;
        const h = Math.sin(t * Math.PI) * 14;
        g.fillStyle(this.tint(i % 2 ? DEV.water : DEV.waterLit), fade * 0.85);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8 - h, 3.4 * fade + 1);
      }
      // Glass.
      for (const p of shards) {
        const px = x + Math.cos(p.a) * p.d * e;
        const py = y + Math.sin(p.a) * p.d * e - Math.sin(t * Math.PI) * 18;
        const ra = p.a + p.s * t;
        g.fillStyle(this.tint(DEV.waterLit), fade);
        g.fillTriangle(px, py, px + Math.cos(ra) * 5, py + Math.sin(ra) * 5,
          px + Math.cos(ra + 2) * 3, py + Math.sin(ra + 2) * 3);
      }
      g.lineStyle(2, this.tint(DEV.gold), fade * 0.6);
      g.strokeEllipse(x, y, r * 2 * e, r * 1.64 * e);
    });
  }

  /**
   * The Holy Hand Grenade going off. Flash → boiling golden lobes → a glory of rays → staggered
   * shockwaves → cross-shaped shrapnel → pale smoke → a scorched sigil left on the floor.
   */
  holyBurst(x: number, y: number, r: number, big = 1): void {
    this.flashIn(x, y, r * 0.45, DEV.white, DEV.holy, 13);
    const lobes = Array.from({ length: 8 + Math.round(big * 4) }, () => ({
      a: Math.random() * TAU, d: Math.random() * r * 0.4, s: 0.4 + Math.random() * 0.5,
    }));
    this.anim(12, 520, (g, t) => {
      const e = easeOut(t);
      const fade = 1 - easeIn(t);
      for (const l of lobes) {
        const lx = x + Math.cos(l.a) * l.d * (0.5 + e);
        const ly = y + Math.sin(l.a) * l.d * (0.5 + e);
        g.fillStyle(this.tint(DEV.gold), fade * 0.5);
        g.fillCircle(lx, ly, r * l.s * (0.4 + e * 0.6));
        g.fillStyle(this.tint(DEV.pale), fade * 0.6);
        g.fillCircle(lx, ly, r * l.s * (0.25 + e * 0.35));
      }
      g.fillStyle(this.tint(DEV.white), fade * 0.7);
      g.fillCircle(x, y, r * 0.3 * (1 - t * 0.6));
    });
    this.anim(13, 640, (g, t) => {
      glory(g, this.tint, x, y, r * 0.2 * easeOut(t), r * (0.5 + easeOut(t) * 0.8), 14, t * 0.4,
        (1 - t) * 0.9, 3.4 + big);
    });
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 90, () => this.ring(x, y, r * 0.3, r * (1 + i * 0.25), i ? DEV.gold : DEV.white, 520));
    }
    const shards = Array.from({ length: 12 + Math.round(big * 6) }, () => ({
      a: Math.random() * TAU, d: r * (0.7 + Math.random() * 0.8), spin: (Math.random() - 0.5) * 8,
    }));
    this.anim(12, 760, (g, t) => {
      const e = easeOut(t);
      for (const s of shards) {
        cross(g, this.tint, x + Math.cos(s.a) * s.d * e, y + Math.sin(s.a) * s.d * e + e * e * 16,
          4.4 * (1 - t * 0.5), s.spin * t, DEV.holy, (1 - t) * 0.95);
      }
    });
    this.anim(8, 1300, (g, t) => {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + 0.3;
        const d = r * 0.4 + t * r * 0.4;
        g.fillStyle(this.tint(DEV.pale), (1 - t) * 0.22);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d - t * 30, 14 + t * 22);
      }
    });
    this.anim(3, 2600, (g, t) => {
      const fade = 1 - easeIn(t);
      g.fillStyle(this.tint(DEV.ochre), fade * 0.18);
      g.fillCircle(x, y, r * 0.75);
      cross(g, this.tint, x, y, r * 0.35, 0, DEV.gold, fade * 0.35, DEV.umber);
    });
  }

  /** The crucifix being driven into the floor: a thud ring and dust kicked out sideways. */
  plant(x: number, y: number, auraR: number): void {
    this.ring(x, y, 10, auraR, DEV.gold, 640, 4);
    this.anim(9, 560, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 10; i++) {
        const side = i % 2 ? 1 : -1;
        const d = 8 + e * (24 + jitter(i, 5) * 26);
        g.fillStyle(this.tint(DEV.woodLit), (1 - t) * 0.5);
        g.fillCircle(x + side * d, y + 2 - Math.sin(t * Math.PI) * (6 + jitter(i, 9) * 8), 3 + t * 4);
      }
    });
    this.sparkle(x, y - 44, 8, 30, DEV.holy, 700);
  }

  /** A shot catching the crucifix's light: a little cross flares where it crossed the rim. */
  blessShot(x: number, y: number): void {
    this.anim(11, 380, (g, t) => {
      const fade = 1 - t;
      glory(g, this.tint, x, y, 2, 8 + t * 10, 4, t, fade * 0.8, 1.4);
      cross(g, this.tint, x, y - t * 12, 5, 0, DEV.white, fade);
    });
  }

  /** The chariot sweeping the caster up and away: a column of fire and a ring of sparks. */
  liftOff(x: number, y: number): void {
    this.flashIn(x, y, 20, DEV.white, DEV.fire, 12);
    this.anim(12, 700, (g, t) => {
      const fade = 1 - t;
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.12;
        holyRay(g, this.tint, x + (i - 3) * 4, y, a, 40 + easeOut(t) * 90, 4, i % 2 ? DEV.fire : DEV.fireHot, fade * 0.8);
      }
    });
    this.sparkle(x, y, 10, 36, DEV.fireHot, 700);
  }

  /**
   * The crash. A blazing comet drops out of the top of the screen, then everything at once: flash,
   * fire lobes, a glory, a ground ring, burning crosses flung outward, smoke, and a scorch.
   */
  crash(x: number, y: number, r: number): void {
    this.anim(13, 220, (g, t) => {
      const cy = y - (1 - easeIn(t)) * 300;
      flameLick(g, this.tint, x, cy, -Math.PI / 2, 70 + t * 40, 12, 1);
      g.fillStyle(this.tint(DEV.white), 1);
      g.fillCircle(x, cy, 10);
    });
    this.scene.time.delayedCall(200, () => {
      this.flashIn(x, y, r * 0.5, DEV.white, DEV.fireHot, 13);
      this.anim(12, 560, (g, t) => {
        const e = easeOut(t);
        const fade = 1 - easeIn(t);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU;
          flameLick(g, this.tint, x + Math.cos(a) * r * 0.2 * e, y + Math.sin(a) * r * 0.2 * e,
            a, r * (0.35 + e * 0.6), 7, fade);
        }
      });
      this.holyBurst(x, y, r, 1.4);
    });
  }

  /**
   * Conversion — the bar filled. A shaft of light drops on them from above, a cross rises out of
   * the body and the glory blooms behind it. Plays over a fighter that is already gone, so it is
   * the only explanation the player gets.
   */
  convert(x: number, y: number): void {
    this.anim(12, 1100, (g, t) => {
      const fade = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      const open = easeOut(Math.min(1, t * 3));
      const w = 26 * open;
      g.fillStyle(this.tint(DEV.holy), fade * 0.22);
      g.fillRect(x - w * 1.6, y - 400, w * 3.2, 420);
      g.fillStyle(this.tint(DEV.white), fade * 0.35);
      g.fillRect(x - w * 0.6, y - 400, w * 1.2, 420);
      glory(g, this.tint, x, y - 10 - t * 40, 14, 30 + t * 30, 12, t * 0.6, fade * 0.85, 3);
      cross(g, this.tint, x, y - 10 - t * 60, 16 + t * 6, 0, DEV.white, fade, DEV.gold);
    });
    this.sparkle(x, y, 16, 50, DEV.white, 1100);
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const PASSION_AVATAR: AvatarSpec = {
  hands: [
    { r: 10, color: DEV.holy, alpha: 0.22 },
    { r: 6.8, color: DEV.gold, alpha: 0.98 },
    { r: 3.6, color: DEV.holy, alpha: 0.95 },
    { r: 1.8, color: DEV.white, alpha: 0.95, ox: -1.8, oy: -1.8 },
  ],
  eyeWhite: DEV.white,
  eyePupil: DEV.ink,
  squash: { div: 14, x: 0.45, y: 0.26 },
};

/**
 * The priest: a plain light-gold orb (the baked `elem-passion`) wearing a **mitre** — the one
 * accessory. Nothing else is ever painted on the rig except the light it gives off.
 *
 * - **Preaching** (holding Click) draws the hands together in front in a prayer and lets a glory
 *   of rays build behind the head as the sermon charges.
 * - **Riding** (Ascendance) hides the rig entirely; the kit paints the priest on the chariot.
 *
 * Mastery enhances the hat rather than adding to it: a taller mitre with gilded trim, gold eyes,
 * wider coronas on the hands and a stronger under-glow.
 */
export class PassionAvatar extends BaseAvatar {
  /** 0–1 — how charged the current sermon is; 0 when not preaching. */
  private preach = 0;

  constructor(scene: Phaser.Scene, tint: PassionColorFn, depth = 6) {
    super(scene, tint, depth, PASSION_AVATAR);
  }

  setPreach(v: number): void { this.preach = Phaser.Math.Clamp(v, 0, 1); }

  /** Where letters and bottles leave from: just ahead of the casting hand along the aim. */
  handTip(): { x: number; y: number } {
    const i = 1;
    return {
      x: this.armX[i] + Math.cos(this.facing) * 8,
      y: this.armY[i] + Math.sin(this.facing) * 8,
    };
  }

  /** Prayer: both hands pressed together in front of the chest, along the aim. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    const a = this.facing + side * 0.32;
    return { ang: a, dist: 17 + Math.sin(this.t * 9) * 1.2 * this.preach, scale: idle.scale * (1 + this.preach * 0.25) };
  }

  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? DEV.holy : DEV.white);
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 13.5 : 10);
      glow.setFillStyle(this.tint(on ? DEV.pale : DEV.holy), on ? 0.34 : 0.22);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new PassionFx(this.scene, this.tint).sparkle(x, y, 1, 8, DEV.holy, 420, 4);
  }

  /** A soft gold under-glow; while preaching, a glory of rays builds behind the body. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const k = this.intensity * (this.mastered ? 1.15 : 1);
    g.fillStyle(this.tint(DEV.holy), a * (this.mastered ? 0.3 : 0.2) * k * (1 + this.preach * 0.6));
    g.fillCircle(x, y, 28 * k);
    if (this.preach > 0.02) {
      glory(g, this.tint, x, y - 4, 20, 10 + this.preach * 22, 12, this.t * 0.5, alpha * this.preach * 0.75, 2.2);
    }
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const tilt = Math.sin(this.t * 1.3) * 0.05 + Math.cos(this.facing) * 0.08;
    mitre(g, this.tint, x, y - 18, alpha, tilt, this.mastered ? 1.2 : 1, this.mastered ? DEV.gold : DEV.ochre);
  }
}
