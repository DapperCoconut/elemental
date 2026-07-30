import Phaser from 'phaser';
import { ArmGesture, ArmHold, ArmPose, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Death draws.
 *
 * There are two objects underneath all of it, and they never stop being on screen: the
 * **katana** and the **clock**. The blade is the only thing in the kit with a hard edge — every
 * other shape here is soft, ragged and drifting, so a straight line of polished steel reads as
 * the one deliberate thing in a cloud of smoke. The clock is the passive made visible; the same
 * `clockFace` primitive draws the HUD dial in the corner and the little pendant hanging at the
 * character's chest, so the thing counting down and the thing wearing it are unmistakably the
 * same object.
 *
 * The palette is a ladder from `void_` to `bone` with exactly three accents allowed off it —
 * the gold of the clock, the yellow of a Disarm afterimage, and the green of the river. Nothing
 * else is coloured. A fight against Death should look like a fight in a dark room with four
 * lights in it, and every one of those lights should mean something.
 */

export type DeathColorFn = ColorFn;

export const DEA = {
  /** The bottom of the ladder — the inside of the shroud, and the lead under every edge. */
  void_: 0x07060d,
  shroud: 0x171227,
  ash: 0x342c4e,
  smoke: 0x4d456b,
  /** Bone and its shaded twin: the ribs, the hands, the clock's numerals. */
  bone: 0xe9e3d2,
  pale: 0xb0a992,
  /** The one hard-edged material in the element. */
  blade: 0xd6dde8,
  edge: 0xffffff,
  /** Accent 1 — the doomsday clock, and everything that moves it. */
  gold: 0xd9b23a,
  brass: 0x8a6a20,
  /** Accent 2 — the Disarm afterimage. Nothing else in the kit is this colour. */
  after: 0xf5e14a,
  /** Accent 3 — the river. Styx Shot and its brand. */
  styx: 0x54cbb2,
  deep: 0x1d5f56,
  /** Reserved for the two moments that are actually lethal: midnight, and a broken deal. */
  blood: 0xc42a3a,
  rope: 0xa8875a,
};

/** Deterministic 0–1 noise, so a tatter frays the same way every frame. */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 47.3 + i * 137.9) * 19477.331;
  return v - Math.floor(v);
}

/** Scale a colour's channels. Used to sink a fill further into the shroud, never to recolour it. */
export function shade(color: number, k: number): number {
  const r = Math.round(Math.min(255, ((color >> 16) & 0xff) * k));
  const g = Math.round(Math.min(255, ((color >> 8) & 0xff) * k));
  const b = Math.round(Math.min(255, (color & 0xff) * k));
  return (r << 16) | (g << 8) | b;
}

/** Local (along-axis, across-axis) → world, for a shape rotated to `ang` about (x, y). */
function pt(x: number, y: number, ca: number, sa: number, u: number, v: number): Phaser.Geom.Point {
  return new Phaser.Geom.Point(x + ca * u - sa * v, y + sa * u + ca * v);
}

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * The katana. `(x, y)` is the butt of the hilt — the hand — and the blade runs out along `ang`.
 *
 * Built the way the object actually is, because a katana drawn as a rectangle reads as a plank:
 * a wrapped tsuka with diamond bindings, an oval tsuba across the join, a brass habaki collar,
 * then the blade itself as a *curved* polygon (the sori) with a separate hardened edge line
 * down the cutting side and a faceted kissaki at the point. The curve is what sells it — the
 * spine bows one way and the edge follows it at a slightly tighter radius, so the blade tapers
 * on its own instead of needing a taper drawn onto it.
 */
export function katana(
  g: Phaser.GameObjects.Graphics,
  tint: DeathColorFn,
  x: number, y: number, ang: number,
  len: number, alpha: number,
  { dark = 1, glow = 0, bladeColor = DEA.blade, wrap = DEA.void_ } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);

  const hilt = len * 0.26;
  const reach = len - hilt;
  /** Radians of bow across the whole blade — small, or it stops being a sword. */
  const sori = 0.16;
  const w = Math.max(1.6, len * 0.036);

  // ── Blade ──
  // Spine and edge sampled along the same arc at two radii, so the taper comes out of the
  // geometry rather than being faked with a second polygon.
  const spine: Phaser.Geom.Point[] = [];
  const edge: Phaser.Geom.Point[] = [];
  const STEPS = 7;
  for (let i = 0; i <= STEPS; i++) {
    const k = i / STEPS;
    const u = hilt + reach * k;
    const bow = Math.sin(k * sori) * reach * 0.5;
    // Full width at the collar, pinched to nothing over the last eighth (the kissaki).
    const taper = k > 0.88 ? (1 - k) / 0.12 : 1;
    spine.push(P(u, -bow - w * taper));
    edge.push(P(u, -bow + w * taper));
  }
  const face = [...spine, ...edge.reverse()];

  if (glow > 0) {
    g.fillStyle(shade(tint(DEA.edge), dark), alpha * 0.16 * glow);
    g.fillPoints(face.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 1.22, y + (p.y - y) * 1.22)), true);
  }
  g.fillStyle(shade(tint(DEA.void_), dark), alpha * 0.9);
  g.fillPoints(face.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 1.09, y + (p.y - y) * 1.09)), true);
  g.fillStyle(shade(tint(bladeColor), dark), alpha * 0.95);
  g.fillPoints(face, true);

  // The hamon: the hardened edge, drawn as a bright line down the cutting side only. This is
  // the single stroke that makes the shape read as a blade rather than as a needle.
  g.lineStyle(Math.max(1, w * 0.5), shade(tint(DEA.edge), dark), alpha * 0.72);
  g.beginPath();
  g.moveTo(edge[edge.length - 1].x, edge[edge.length - 1].y);
  for (let i = edge.length - 2; i >= 0; i--) g.lineTo(edge[i].x, edge[i].y);
  g.strokePath();

  // ── Habaki collar and tsuba ──
  const collar = P(hilt + reach * 0.045, 0);
  g.fillStyle(shade(tint(DEA.brass), dark), alpha * 0.95);
  g.fillCircle(collar.x, collar.y, w * 1.25);

  const guard = P(hilt, 0);
  g.fillStyle(shade(tint(DEA.void_), dark), alpha * 0.95);
  g.fillEllipse(guard.x, guard.y, w * 1.9, w * 4.4);
  g.lineStyle(1, shade(tint(DEA.brass), dark), alpha * 0.8);
  g.strokeEllipse(guard.x, guard.y, w * 1.9, w * 4.4);

  // ── Tsuka ──
  const gripA = P(0, 0);
  const gripB = P(hilt - w, 0);
  g.lineStyle(w * 2.1, shade(tint(wrap), dark), alpha * 0.95);
  g.lineBetween(gripA.x, gripA.y, gripB.x, gripB.y);
  // Diamond bindings: four crossed pairs down the grip.
  g.lineStyle(Math.max(0.9, w * 0.4), shade(tint(DEA.pale), dark), alpha * 0.55);
  for (let i = 0; i < 4; i++) {
    const u = (hilt - w) * ((i + 0.6) / 4.4);
    const a = P(u, -w);
    const b = P(u + hilt * 0.14, w);
    const c = P(u + hilt * 0.14, -w);
    const d = P(u, w);
    g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineBetween(c.x, c.y, d.x, d.y);
  }
  // Kashira — the cap on the butt.
  g.fillStyle(shade(tint(DEA.brass), dark), alpha * 0.9);
  g.fillCircle(gripA.x, gripA.y, w * 1.15);
}

/**
 * A crescent afterimage — the shape a blade leaves behind, not the blade.
 *
 * Drawn as a ring segment between two radii that is *thickest in the middle and pinched to
 * nothing at both ends*, because a slash decelerates into and out of the arc. Three speed lines
 * are hung inside it at different radii, which is what gives the still image a direction.
 */
export function slashArc(
  g: Phaser.GameObjects.Graphics,
  tint: DeathColorFn,
  cx: number, cy: number, ang: number, half: number,
  rInner: number, rOuter: number, alpha: number,
  { color = DEA.after, dark = 1, lines = 3, seed = 0 } = {},
): void {
  const STEPS = 16;
  const outer: Phaser.Geom.Point[] = [];
  const inner: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const k = i / STEPS;
    const a = ang - half + half * 2 * k;
    // Pinch: full thickness at k = 0.5, zero at both ends.
    const fat = Math.sin(k * Math.PI);
    const ro = rInner + (rOuter - rInner) * (0.5 + 0.5 * fat);
    const ri = rInner + (rOuter - rInner) * (0.5 - 0.5 * fat);
    outer.push(new Phaser.Geom.Point(cx + Math.cos(a) * ro, cy + Math.sin(a) * ro));
    inner.push(new Phaser.Geom.Point(cx + Math.cos(a) * ri, cy + Math.sin(a) * ri));
  }
  g.fillStyle(shade(tint(color), dark), alpha * 0.32);
  g.fillPoints([...outer, ...inner.reverse()], true);
  g.lineStyle(1.6, shade(tint(DEA.edge), dark), alpha * 0.5);
  g.strokePoints(outer, false, false);

  for (let i = 0; i < lines; i++) {
    const k = 0.28 + 0.22 * i + jitter(seed, i) * 0.06;
    const r = rInner + (rOuter - rInner) * (0.35 + 0.3 * jitter(seed, 10 + i));
    const a0 = ang - half * (0.9 - k * 0.5);
    const a1 = ang + half * (0.9 - k * 0.5);
    g.lineStyle(1.1, shade(tint(color), dark), alpha * 0.42);
    g.beginPath();
    g.arc(cx, cy, r, a0, a1, false);
    g.strokePath();
  }
}

/**
 * The darkness he is clouded in: a soft core with ragged tatters streaming off it.
 *
 * Every tatter is a three-point spike that *sways on its own phase* and is longest at the
 * bottom, so the whole thing hangs and drifts like cloth rather than pulsing like an aura.
 * `agitate` (0–1) lengthens and speeds them — used when the clock is close to midnight.
 */
export function shroud(
  g: Phaser.GameObjects.Graphics,
  tint: DeathColorFn,
  x: number, y: number, r: number, t: number, alpha: number,
  { tatters = 11, seed = 0, dark = 1, agitate = 0, color = DEA.shroud } = {},
): void {
  g.fillStyle(shade(tint(DEA.void_), dark), alpha * 0.42);
  g.fillEllipse(x, y, r * 1.7, r * 1.5);
  g.fillStyle(shade(tint(color), dark), alpha * 0.5);
  g.fillEllipse(x, y, r * 1.3, r * 1.15);

  for (let i = 0; i < tatters; i++) {
    const base = (i / tatters) * TAU + jitter(seed, i) * 0.4;
    const sway = Math.sin(t * (1.1 + jitter(seed, 20 + i) * 1.4 + agitate * 2.2) + i) * (0.22 + agitate * 0.2);
    const a = base + sway;
    // Longest where it hangs — the lower half of the ring.
    const hang = 0.55 + 0.45 * Math.max(0, Math.sin(base));
    const len = r * (0.55 + jitter(seed, 40 + i) * 0.8) * hang * (1 + agitate * 0.5);
    const w = r * (0.16 + jitter(seed, 60 + i) * 0.12);
    const ax = x + Math.cos(a) * r * 0.55;
    const ay = y + Math.sin(a) * r * 0.5;
    const tipX = ax + Math.cos(a) * len;
    const tipY = ay + Math.sin(a) * len + len * 0.22;
    g.fillStyle(shade(tint(i % 3 === 0 ? DEA.ash : DEA.shroud), dark), alpha * (0.34 + jitter(seed, 80 + i) * 0.2));
    g.fillPoints([
      new Phaser.Geom.Point(ax + Math.cos(a + 1.57) * w, ay + Math.sin(a + 1.57) * w),
      new Phaser.Geom.Point(tipX, tipY),
      new Phaser.Geom.Point(ax - Math.cos(a + 1.57) * w, ay - Math.sin(a + 1.57) * w),
    ], true);
  }
}

/**
 * A noose hanging out of nothing above a victim.
 *
 * Rope, five coils of knot, and an open loop drawn as an ellipse *seen at an angle* rather than
 * a circle — the loop is what makes it a noose instead of a bell pull, and a flat circle reads
 * as a hoop. `sway` swings the whole thing off vertical; `drop` is how far above the victim the
 * rope disappears.
 */
export function noose(
  g: Phaser.GameObjects.Graphics,
  tint: DeathColorFn,
  x: number, y: number, drop: number, sway: number, alpha: number,
  { dark = 1, loopR = 12 } = {},
): void {
  const topX = x - sway * 0.55;
  const topY = y - drop;
  const knotY = y - loopR * 2.5;
  const knotX = x - sway * 0.15;

  // The rope, as two segments with a slight bend at the knot rather than a straight line.
  g.lineStyle(3.2, shade(tint(DEA.void_), dark), alpha * 0.7);
  g.lineBetween(topX, topY, knotX, knotY);
  g.lineStyle(2, shade(tint(DEA.rope), dark), alpha * 0.9);
  g.lineBetween(topX, topY, knotX, knotY);

  // Knot: five wraps, each a touch wider than the last.
  for (let i = 0; i < 5; i++) {
    const ky = knotY + i * 2.6;
    const kw = 5.2 + i * 0.5;
    g.lineStyle(2.2, shade(tint(i % 2 ? DEA.rope : DEA.pale), dark), alpha * 0.85);
    g.lineBetween(knotX - kw * 0.5, ky, knotX + kw * 0.5, ky);
  }

  // The loop, tilted so it reads as an opening rather than a ring.
  const ly = knotY + 15;
  g.lineStyle(3.4, shade(tint(DEA.void_), dark), alpha * 0.6);
  g.strokeEllipse(x, ly + loopR, loopR * 1.55, loopR * 1.05);
  g.lineStyle(2, shade(tint(DEA.rope), dark), alpha * 0.92);
  g.strokeEllipse(x, ly + loopR, loopR * 1.55, loopR * 1.05);
  // A short tail hanging off the knot, because a tied noose always has one.
  g.lineStyle(1.6, shade(tint(DEA.rope), dark), alpha * 0.6);
  g.lineBetween(knotX + 4, knotY + 11, knotX + 8 + sway * 0.2, knotY + 20);
}

/**
 * The doomsday clock. One primitive, two jobs: the HUD dial in the corner and the pendant on
 * the character's chest, so nobody has to be told they are the same object.
 *
 * `frac` is *remaining* time, 1 → 0. The elapsed wedge fills clockwise from twelve, the minute
 * hand rides its leading edge, and the hour hand crawls the last twelfth from eleven to twelve —
 * so the two hands close on each other, which is the whole reason a real doomsday clock is
 * analogue. Under a quarter left the rim reddens and cracks open across the face.
 */
export function clockFace(
  g: Phaser.GameObjects.Graphics,
  tint: DeathColorFn,
  cx: number, cy: number, r: number, frac: number, alpha: number,
  { dark = 1, hostile = false, seed = 3, numerals = true } = {},
): void {
  const k = Phaser.Math.Clamp(frac, 0, 1);
  const late = 1 - Math.min(1, k / 0.25);
  const rim = hostile ? DEA.blood : DEA.gold;
  const hand = hostile ? DEA.blood : DEA.bone;
  const TOP = -Math.PI / 2;

  // Case: a dark disc with a metal bezel, plus a lit inner ring so the face isn't a hole.
  g.fillStyle(shade(tint(DEA.void_), dark), alpha * 0.92);
  g.fillCircle(cx, cy, r);
  g.fillStyle(shade(tint(DEA.shroud), dark), alpha * 0.85);
  g.fillCircle(cx, cy, r * 0.93);

  // Elapsed wedge — how much of the minute is already spent.
  if (k < 1) {
    g.fillStyle(shade(tint(DEA.blood), dark), alpha * (0.12 + late * 0.22));
    g.slice(cx, cy, r * 0.9, TOP, TOP + (1 - k) * TAU, false);
    g.fillPath();
  }

  g.lineStyle(Math.max(1.6, r * 0.09), shade(tint(rim), dark), alpha * (0.55 + late * 0.4));
  g.strokeCircle(cx, cy, r);
  g.lineStyle(1, shade(tint(DEA.brass), dark), alpha * 0.5);
  g.strokeCircle(cx, cy, r * 0.82);

  if (numerals) {
    for (let i = 0; i < 12; i++) {
      const a = TOP + (i / 12) * TAU;
      const long = i % 3 === 0;
      const r0 = r * (long ? 0.62 : 0.72);
      const r1 = r * 0.82;
      g.lineStyle(long ? 2 : 1, shade(tint(long ? DEA.bone : DEA.pale), dark), alpha * (long ? 0.85 : 0.45));
      g.lineBetween(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    }
    // XII, marked with three bars so twelve is legible without a font.
    for (let i = -1; i <= 1; i++) {
      g.lineStyle(1.6, shade(tint(rim), dark), alpha * 0.8);
      g.lineBetween(cx + i * r * 0.09, cy - r * 0.72, cx + i * r * 0.09, cy - r * 0.55);
    }
  }

  // Hands. The hour hand is short, fat and lagging; the minute hand is the one that moves.
  const hourA = TOP - k * (TAU / 12);
  const minA = TOP + (1 - k) * TAU;
  g.lineStyle(Math.max(2.4, r * 0.11), shade(tint(DEA.void_), dark), alpha * 0.8);
  g.lineBetween(cx, cy, cx + Math.cos(hourA) * r * 0.48, cy + Math.sin(hourA) * r * 0.48);
  g.lineStyle(Math.max(1.6, r * 0.075), shade(tint(hand), dark), alpha * 0.95);
  g.lineBetween(cx, cy, cx + Math.cos(hourA) * r * 0.46, cy + Math.sin(hourA) * r * 0.46);

  g.lineStyle(Math.max(1.8, r * 0.075), shade(tint(DEA.void_), dark), alpha * 0.8);
  g.lineBetween(cx, cy, cx + Math.cos(minA) * r * 0.74, cy + Math.sin(minA) * r * 0.74);
  g.lineStyle(Math.max(1.1, r * 0.045), shade(tint(hand), dark), alpha);
  g.lineBetween(cx, cy, cx + Math.cos(minA) * r * 0.72, cy + Math.sin(minA) * r * 0.72);
  // A counterweight past the hub, which is what a real minute hand has.
  g.lineBetween(cx, cy, cx - Math.cos(minA) * r * 0.16, cy - Math.sin(minA) * r * 0.16);

  g.fillStyle(shade(tint(rim), dark), alpha * (0.8 + late * 0.2));
  g.fillCircle(cx, cy, Math.max(1.8, r * 0.08));

  // The glass gives out in the last quarter: straight radial breaks with one jog each.
  if (late <= 0) return;
  const runs = 3 + Math.round(late * 4);
  for (let i = 0; i < runs; i++) {
    const a = (i / runs) * TAU + jitter(seed, i) * 0.9;
    const reach = r * (0.4 + jitter(seed, 30 + i) * 0.6) * late;
    const mx = cx + Math.cos(a + 0.16) * reach * 0.55;
    const my = cy + Math.sin(a + 0.16) * reach * 0.55;
    g.lineStyle(1.2, shade(tint(DEA.edge), dark), alpha * 0.55 * late);
    g.lineBetween(cx, cy, mx, my);
    g.lineStyle(0.9, shade(tint(DEA.edge), dark), alpha * 0.35 * late);
    g.lineBetween(mx, my, cx + Math.cos(a) * reach, cy + Math.sin(a) * reach);
  }
}

/**
 * The brand Styx Shot leaves: a ring of river water that is visibly *running out* of the mark.
 * One arc per stack so the count is readable without reading a number, and every arc drips.
 */
export function styxBrand(
  g: Phaser.GameObjects.Graphics,
  tint: DeathColorFn,
  x: number, y: number, r: number, t: number, stacks: number, alpha: number,
  { dark = 1, seed = 0 } = {},
): void {
  for (let s = 0; s < stacks; s++) {
    const rr = r + s * 5;
    const spin = t * (0.7 + s * 0.25) + s * 1.9;
    for (let i = 0; i < 3; i++) {
      const a0 = spin + (i / 3) * TAU;
      g.lineStyle(2.4 - s * 0.4, shade(tint(DEA.styx), dark), alpha * (0.5 - s * 0.08));
      g.beginPath();
      g.arc(x, y, rr, a0, a0 + 1.25, false);
      g.strokePath();
      // A drop falling off the end of each arc — the water leaving them.
      const da = a0 + 1.25;
      const fall = ((t * 46 + s * 30 + i * 17) % 22);
      g.fillStyle(shade(tint(DEA.styx), dark), alpha * Math.max(0, 0.45 - fall / 50));
      g.fillEllipse(x + Math.cos(da) * rr, y + Math.sin(da) * rr + fall, 2.4, 3.8);
    }
  }
}

/**
 * Half a bullet, freshly cut. A stubby body with a rounded nose on one side and a **ragged flat
 * face** on the other — the cut is the whole point, so it gets the detail: three jagged steps
 * down the sheared side, and a bright scar along it that fades as the piece tumbles.
 */
export function slicedBullet(
  g: Phaser.GameObjects.Graphics,
  tint: DeathColorFn,
  x: number, y: number, ang: number, size: number, alpha: number,
  { dark = 1, seed = 0, side = 1, color = DEA.pale } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const w = size * 0.42;

  const face: Phaser.Geom.Point[] = [
    P(size * 0.55, 0),
    P(size * 0.2, side * w),
    P(-size * 0.5, side * w * 0.85),
  ];
  // The sheared face, stepped rather than straight.
  for (let i = 3; i >= 0; i--) {
    const u = -size * 0.5 + (size * 1.05) * (i / 3);
    face.push(P(u, side * (jitter(seed, i) * w * 0.3)));
  }

  g.fillStyle(shade(tint(DEA.void_), dark), alpha * 0.8);
  g.fillPoints(face.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 1.2, y + (p.y - y) * 1.2)), true);
  g.fillStyle(shade(tint(color), dark), alpha * 0.9);
  g.fillPoints(face, true);
  g.lineStyle(1.2, shade(tint(DEA.edge), dark), alpha * 0.7);
  const c0 = P(-size * 0.5, 0);
  const c1 = P(size * 0.55, 0);
  g.lineBetween(c0.x, c0.y, c1.x, c1.y);
}

// ── Fx ────────────────────────────────────────────────────────────────────

export class DeathFx extends FxBase {
  /** A blade going through the air. The crescent sweeps out and thins as it goes. */
  sweep(x: number, y: number, ang: number, half: number, r: number,
    ms = 420, depth = 10, color = DEA.after, dark = 1): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      slashArc(g, this.tint, x, y, ang, half, r * (0.32 + e * 0.5), r * (0.6 + e * 0.55),
        (1 - t) * 0.95, { color, dark, seed });
    });
  }

  /** The bell. A gold hoop going out, doubled a beat behind itself so it rings rather than pops. */
  toll(x: number, y: number, r0: number, r1: number, ms = 620, depth = 10, color = DEA.gold, dark = 1): void {
    this.anim(depth, ms, (g, t) => {
      for (let i = 0; i < 2; i++) {
        const tt = Math.max(0, t - i * 0.18);
        const r = r0 + (r1 - r0) * easeOut(tt);
        g.lineStyle((3.4 - i) * (1 - tt) + 0.6, shade(this.tint(color), dark), (1 - tt) * (0.75 - i * 0.28));
        g.strokeCircle(x, y, r);
      }
    });
  }

  /** Soot and ash lifting off something. The generic Death particle. */
  soot(x: number, y: number, count = 8, spread = 24, ms = 620, depth = 9, dark = 1, color = DEA.smoke): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      a: Math.random() * TAU, d: spread * (0.3 + Math.random() * 0.9), s: 1.6 + Math.random() * 2.6, i,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        const px = x + Math.cos(p.a) * p.d * e;
        // Ash rises. Everything else in this file falls, so this is the tell that it is smoke.
        const py = y + Math.sin(p.a) * p.d * e - e * 18;
        g.fillStyle(shade(this.tint(p.i % 4 === 0 ? DEA.ash : color), dark), (1 - t) * 0.6);
        g.fillCircle(px, py, p.s * (1 - t * 0.4));
      }
    });
  }

  /** Steel on steel: a hard white star with four spurs, gone in a few frames. */
  spark(x: number, y: number, ang: number, ms = 240, depth = 11, dark = 1): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(shade(this.tint(DEA.edge), dark), (1 - t) * (1 - t) * 0.95);
      g.fillCircle(x, y, 6 * (1 - t) + 1);
      for (let i = 0; i < 5; i++) {
        const a = ang + Math.PI + (jitter(seed, i) - 0.5) * 2.4;
        const d = 10 + jitter(seed, 10 + i) * 26;
        g.lineStyle(1.6 * (1 - t) + 0.4, shade(this.tint(i % 2 ? DEA.after : DEA.edge), dark), (1 - t) * 0.85);
        g.lineBetween(x, y, x + Math.cos(a) * d * e, y + Math.sin(a) * d * e);
      }
    });
  }

  /**
   * A body coming apart into cloth, or putting itself back together. `inward` runs it backwards,
   * which is how both ends of a teleport are the same effect seen twice.
   */
  vanish(x: number, y: number, r: number, ms = 460, depth = 10, inward = false, dark = 1): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      const k = inward ? 1 - t : t;
      const e = easeOut(k);
      shroud(g, this.tint, x, y - e * 6, r * (0.5 + e * 1.4), t * 4, (1 - k) * 0.95,
        { tatters: 13, seed, dark, agitate: 1 });
      g.fillStyle(shade(this.tint(DEA.void_), dark), (1 - k) * 0.5);
      g.fillEllipse(x, y, r * (1 - e) * 1.4, r * (1 - e) * 1.7);
    });
  }

  /** The river landing on somebody: a green splash that runs downward. */
  brand(x: number, y: number, r = 22, depth = 10, dark = 1): void {
    this.flashIn(x, y, r * 0.45, DEA.styx, DEA.deep, depth);
    const seeds = Array.from({ length: 7 }, (_, i) => ({
      a: -Math.PI + Math.random() * Math.PI, d: r * (0.4 + Math.random()), i,
    }));
    this.anim(depth, 520, (g, t) => {
      const e = easeIn(t);
      for (const p of seeds) {
        g.fillStyle(shade(this.tint(DEA.styx), dark), (1 - t) * 0.7);
        g.fillEllipse(x + Math.cos(p.a) * p.d, y + Math.sin(p.a) * p.d * 0.5 + e * 26, 2.6, 4.6);
      }
    });
  }

  /** Midnight itself. A black bloom, a red hoop, and the sky falling on one spot. */
  reap(x: number, y: number, r: number, ms = 900, depth = 12, dark = 1): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(shade(this.tint(DEA.void_), dark), (1 - t) * 0.75);
      g.fillCircle(x, y, r * e);
      g.lineStyle(7 * (1 - t) + 1, shade(this.tint(DEA.blood), dark), (1 - t) * 0.8);
      g.strokeCircle(x, y, r * e * 1.15);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU + jitter(seed, i) * 0.4;
        const d = r * (0.7 + jitter(seed, 20 + i) * 0.9) * e;
        katana(g, this.tint, x + Math.cos(a) * d * 1.4, y + Math.sin(a) * d * 1.4,
          a + Math.PI, 34 * (1 - t * 0.4), (1 - t) * 0.85, { dark, glow: 1 });
      }
    });
    this.toll(x, y, r * 0.2, r * 1.9, ms, depth, DEA.blood, dark);
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const DEATH_AVATAR: AvatarSpec = {
  hands: [
    { r: 13, color: DEA.void_, alpha: 0.42 },
    { r: 7.4, color: DEA.ash, alpha: 0.8 },
    { r: 2.8, color: DEA.bone, alpha: 0.95, ox: -1.7, oy: -1.9 },
  ],
  eyeWhite: DEA.bone,
  eyePupil: DEA.void_,
  squash: { div: 15, x: 0.46, y: 0.3 },
};

/**
 * Death himself.
 *
 * The silhouette is three ideas stacked: a hood that comes to a point well above the eyes, a
 * mantle that tapers *outward* toward the floor so he reads as standing in a pile of cloth
 * rather than wearing a robe, and the katana held straight up over the crown — which is the one
 * detail the character is described by, so it is drawn at full length and never hidden.
 *
 * Two states change him. `setGuard` drops the blade out of the overhead hold and levels it
 * along the aim (Riposte). `setDoom` is the clock: at zero the shroud is thrashing, the bone
 * has gone red, and the pendant on his chest has cracked — so a player never has to look at the
 * corner of the screen to know how much of the minute is left.
 */
export class DeathAvatar extends BaseAvatar {
  /** 0 = the minute has just started, 1 = midnight. Lerped so the change creeps in. */
  private doom = 0;
  private doomTarget = 0;
  /** 0 = katana overhead, 1 = levelled along the aim. */
  private guard = 0;
  private guardTarget = 0;
  /** Ability tell: brightens the edge for a beat after every cast. */
  private flare = 0;
  private seed = Math.random() * 999;
  /** Last colour pushed to the eyes, so the doom tell doesn't rebuild two arcs every frame. */
  private eyeColor = DEA.bone;

  constructor(scene: Phaser.Scene, tint: DeathColorFn, depth = 6) {
    super(scene, tint, depth, DEATH_AVATAR);
  }

  /** Fraction of the doomsday clock already spent, 0–1. */
  setDoom(v: number): void { this.doomTarget = Phaser.Math.Clamp(v, 0, 1); }

  /** Riposte: the blade comes down off the shoulder and points at the cursor. */
  setGuard(on: boolean): void { this.guardTarget = on ? 1 : 0; }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.flare = Math.max(0, this.flare - delta / 400);
    this.doom += (this.doomTarget - this.doom) * Math.min(1, delta / 400);
    this.guard += (this.guardTarget - this.guard) * Math.min(1, delta / 110);
    // The eyes are the cheapest doom meter there is, and they are already on the rig.
    const eye = this.doom > 0.75 ? DEA.blood : this.doom > 0.4 ? DEA.gold : DEA.bone;
    if (eye !== this.eyeColor) { this.eyeColor = eye; this.setEyeWhite(eye); }
    super.update(delta, x, y, alpha);
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.flare = 1;
    super.play(gesture, angle, duration);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 16 : 13);
      glow.setAlpha(on ? 0.6 : 0.42);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new DeathFx(this.scene, this.tint).soot(x, y, 2, 7, 380, 4);
  }

  /** What he leaves on the floor: a hole rather than a shadow, with the shroud creeping out of it. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    g.fillStyle(this.tint(DEA.void_), a * 0.55);
    g.fillEllipse(x, y + 16, 52 + this.doom * 10, 18);
    shroud(g, this.tint, x, y + 12, 22 + this.doom * 5, this.t, a * 0.75,
      { tatters: 9, seed: this.seed, agitate: this.doom });
  }

  /** The mantle: dark cloth that widens toward the floor, with a bone sternum showing through. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const hem = 1 + this.doom * 0.12;
    const sway = Math.sin(this.t * 1.7) * 1.6;

    // Ragged hem: sampled points rather than a rectangle, so the bottom edge is torn.
    const pts: Phaser.Geom.Point[] = [
      new Phaser.Geom.Point(x - 11, y - 15),
      new Phaser.Geom.Point(x + 11, y - 15),
    ];
    for (let i = 0; i <= 8; i++) {
      const u = 1 - (i / 8) * 2;
      const w = (16 + Math.abs(u) * -2) * hem;
      pts.push(new Phaser.Geom.Point(
        x + u * w + sway * (i / 8),
        y + 16 + jitter(this.seed, i) * 5,
      ));
    }
    g.fillStyle(this.tint(DEA.void_), alpha * 0.92);
    g.fillPoints(pts, true);
    g.fillStyle(this.tint(DEA.shroud), alpha * 0.85);
    g.fillPoints(pts.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 0.82, y + (p.y - y) * 0.9)), true);

    // Sternum and four ribs, fading down — bone showing through an open mantle.
    g.lineStyle(2, this.tint(DEA.pale), alpha * (0.5 + this.flare * 0.35));
    g.lineBetween(x, y - 10, x, y + 8);
    for (let i = 0; i < 4; i++) {
      const ry = y - 7 + i * 4.6;
      const rw = 7 - i * 0.9;
      g.lineStyle(1.5, this.tint(DEA.pale), alpha * (0.42 - i * 0.07));
      g.beginPath();
      g.arc(x, ry, rw, 0.25, Math.PI - 0.25, false);
      g.strokePath();
    }
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const crown = y - 18;
    const lean = Math.cos(this.facing) * 2.2;
    const heat = 0.5 + this.flare * 0.5;

    // ── Hood ──
    // A peak well clear of the eyes, with the cowl falling away behind it on both sides.
    const peak = crown - (this.mastered ? 20 : 15);
    g.fillStyle(this.tint(DEA.void_), alpha * 0.95);
    g.fillPoints([
      new Phaser.Geom.Point(x - 13, crown + 6),
      new Phaser.Geom.Point(x + lean * 1.6, peak),
      new Phaser.Geom.Point(x + 13, crown + 6),
      new Phaser.Geom.Point(x + 9, crown + 1),
      new Phaser.Geom.Point(x - 9, crown + 1),
    ], true);
    g.lineStyle(1.4, this.tint(DEA.ash), alpha * 0.7);
    g.lineBetween(x + lean * 1.6, peak, x - 2, crown + 3);
    // A thread of doom running up the hood — the only lit line on him when nothing is happening.
    g.lineStyle(1.2, this.tint(this.doom > 0.7 ? DEA.blood : DEA.gold), alpha * (0.25 + this.doom * 0.55));
    g.lineBetween(x + lean * 1.6, peak, x + lean, crown + 5);

    // ── Clock pendant ──
    // The same primitive as the HUD dial, small, hanging at the chest on a short chain.
    const px = x + 0.5;
    const py = y + 5;
    g.lineStyle(1, this.tint(DEA.brass), alpha * 0.55);
    g.lineBetween(x - 4, y - 9, px, py - 5);
    g.lineBetween(x + 4, y - 9, px, py - 5);
    clockFace(g, this.tint, px, py, this.mastered ? 7.2 : 6, 1 - this.doom, alpha * 0.95,
      { hostile: this.doom > 0.8, seed: this.seed, numerals: false });

    // ── The katana ──
    // Held high over the crown by default, because that is what he is; levelled along the aim
    // while Riposte is up. Interpolated between the two, so the drop reads as a movement.
    const overhead = -Math.PI / 2 - 0.24 + Math.sin(this.t * 1.4) * 0.05;
    const level = this.facing;
    const bladeAng = Phaser.Math.Angle.RotateTo(overhead, level,
      Math.abs(Phaser.Math.Angle.Wrap(level - overhead)) * this.guard);
    const gripDist = 12 + this.guard * 16;
    const gx = x + Math.cos(bladeAng) * gripDist * (this.guard > 0.5 ? 1 : 0.15);
    const gy = (this.guard > 0.5 ? y - 2 : crown - 2) + Math.sin(bladeAng) * gripDist * 0.35;
    const len = (this.mastered ? 62 : 54) * (1 + this.guard * 0.1);

    // Mastered: a second blade rides half a radian behind the first, like an afterimage that
    // never faded. Drawn under the real one so the real one still reads as solid.
    if (this.mastered) {
      katana(g, this.tint, gx, gy, bladeAng - 0.22, len * 0.94, alpha * 0.3,
        { glow: 1, bladeColor: DEA.smoke, wrap: DEA.shroud });
    }
    katana(g, this.tint, gx, gy, bladeAng, len, alpha,
      { glow: heat * (0.4 + this.guard * 0.8) + this.doom * 0.5 });
  }

  /**
   * Riposte's pose. `brace` is the closest built-in and it shakes, which is wrong for a man
   * standing perfectly still waiting to be shot at — so the hold is a bespoke two-handed grip
   * out along the aim, the left hand a little behind the right, neither of them moving.
   */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    return {
      ang: this.holdAngle + side * 0.16,
      dist: side > 0 ? 34 : 22,
      scale: idle.scale * 1.1,
    };
  }
}
