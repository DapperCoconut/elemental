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
 * A shuriken of the river.
 *
 * Four **hooked** blades rather than four spikes: each one has a short straight back and a long
 * concave sweep into the next tip, which is the shape that reads as a throwing star instead of a
 * plus sign. The metal is river-green and wet — there is a bored hole through the middle, a
 * bright edge running the whole silhouette, and a drop hanging off the trailing blade.
 */
export function shuriken(
  g: Phaser.GameObjects.Graphics,
  tint: DeathColorFn,
  x: number, y: number, ang: number, size: number, alpha: number,
  { dark = 1, seed = 0, color = DEA.styx, points = 4, t = 0 } = {},
): void {
  const SEG = 10;
  const face: Phaser.Geom.Point[] = [];
  for (let i = 0; i < points * SEG; i++) {
    const p = (i % SEG) / SEG;
    // Straight back for the first eighth, then a concave sweep all the way to the next tip.
    const k = p < 0.12 ? 1 - (p / 0.12) * 0.66 : 0.34 + 0.66 * Math.pow((p - 0.12) / 0.88, 2.2);
    const a = ang + (i / (points * SEG)) * TAU;
    face.push(new Phaser.Geom.Point(x + Math.cos(a) * size * k, y + Math.sin(a) * size * k));
  }

  // Lead under the whole silhouette, so a green star never sits directly on the arena.
  g.fillStyle(shade(tint(DEA.void_), dark), alpha * 0.85);
  g.fillPoints(face.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 1.18, y + (p.y - y) * 1.18)), true);
  g.fillStyle(shade(tint(color), dark), alpha * 0.92);
  g.fillPoints(face, true);
  g.lineStyle(1.1, shade(tint(DEA.edge), dark), alpha * 0.55);
  g.strokePoints(face, true, true);

  // The hub: a shaded collar with a hole bored clean through it.
  g.fillStyle(shade(tint(DEA.deep), dark), alpha * 0.95);
  g.fillCircle(x, y, size * 0.3);
  g.fillStyle(shade(tint(DEA.void_), dark), alpha * 0.9);
  g.fillCircle(x, y, size * 0.14);

  // A hard glint on each tip — four little lights turning as the star spins.
  for (let i = 0; i < points; i++) {
    const a = ang + (i / points) * TAU;
    g.fillStyle(shade(tint(DEA.edge), dark), alpha * (0.35 + 0.45 * jitter(seed, i)));
    g.fillCircle(x + Math.cos(a) * size * 0.86, y + Math.sin(a) * size * 0.86, size * 0.11);
  }

  // Two drops running off the trailing blades. The river does not dry.
  for (let i = 0; i < 2; i++) {
    const a = ang + Math.PI * (0.6 + i * 0.5);
    const fall = ((t * 40 + seed + i * 11) % 16);
    g.fillStyle(shade(tint(color), dark), alpha * Math.max(0, 0.5 - fall / 34));
    g.fillEllipse(x + Math.cos(a) * size * 0.7, y + Math.sin(a) * size * 0.7 + fall, 1.9, 3.2);
  }
}

/**
 * A limb that is no longer attached to anybody. Cloth sleeve, a wet bone stump at the cut end,
 * and the hand or the foot still on the other — because the thing that sells an amputation is
 * seeing which piece it was.
 */
export function severedLimb(
  g: Phaser.GameObjects.Graphics,
  tint: DeathColorFn,
  x: number, y: number, ang: number, size: number, alpha: number,
  { dark = 1, seed = 0, leg = false } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const w = size * (leg ? 0.3 : 0.22);

  // The sleeve, tapering from the stump toward the extremity.
  const sleeve = [
    P(-size * 0.5, -w), P(size * 0.34, -w * 0.78),
    P(size * 0.34, w * 0.78), P(-size * 0.5, w),
  ];
  g.fillStyle(shade(tint(DEA.void_), dark), alpha * 0.9);
  g.fillPoints(sleeve.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 1.15, y + (p.y - y) * 1.15)), true);
  g.fillStyle(shade(tint(DEA.shroud), dark), alpha * 0.9);
  g.fillPoints(sleeve, true);
  // Two creases down the cloth, so it is fabric rather than a stick.
  for (let i = 0; i < 2; i++) {
    const v = (i - 0.5) * w * 0.9;
    const a0 = P(-size * 0.4, v);
    const a1 = P(size * 0.28, v * 0.8);
    g.lineStyle(1, shade(tint(DEA.ash), dark), alpha * 0.5);
    g.lineBetween(a0.x, a0.y, a1.x, a1.y);
  }

  // The cut end: bone with two condyles, and the blood still on it.
  const b = P(-size * 0.5, 0);
  g.fillStyle(shade(tint(DEA.bone), dark), alpha * 0.95);
  g.fillCircle(b.x, b.y, w * 0.62);
  for (const s of [1, -1]) {
    const c = P(-size * 0.56, s * w * 0.44);
    g.fillStyle(shade(tint(DEA.pale), dark), alpha * 0.9);
    g.fillCircle(c.x, c.y, w * 0.34);
  }
  g.fillStyle(shade(tint(DEA.blood), dark), alpha * 0.75);
  g.fillCircle(b.x, b.y + w * 0.3, w * 0.36);

  // The extremity. A hand is a ball with three knuckles; a foot is a wedge.
  const e = P(size * 0.46, 0);
  if (leg) {
    g.fillStyle(shade(tint(DEA.void_), dark), alpha * 0.92);
    g.fillPoints([
      P(size * 0.3, -w * 0.8), P(size * 0.72, -w * 0.5),
      P(size * 0.66, w * 0.6), P(size * 0.3, w * 0.8),
    ], true);
  } else {
    g.fillStyle(shade(tint(DEA.ash), dark), alpha * 0.9);
    g.fillCircle(e.x, e.y, w * 0.95);
    for (let i = 0; i < 3; i++) {
      const k = P(size * 0.62, (i - 1) * w * 0.5);
      g.fillStyle(shade(tint(DEA.bone), dark), alpha * (0.7 - i * 0.1));
      g.fillCircle(k.x, k.y, w * 0.24 + jitter(seed, i) * 0.6);
    }
  }
}

/**
 * The permanent tell on an amputee: a bandaged nub where each missing limb used to be, wrapped
 * twice and still seeping. Arms sit at the shoulders, legs under the hips, filled left first —
 * so a glance at the body says how many of each are gone without reading the status tray.
 */
export function stumps(
  g: Phaser.GameObjects.Graphics,
  tint: DeathColorFn,
  x: number, y: number, r: number, arms: number, legs: number, t: number, alpha: number,
  { dark = 1, seed = 0 } = {},
): void {
  const nub = (nx: number, ny: number, size: number, i: number) => {
    const pulse = 0.6 + 0.4 * Math.sin(t * 3.2 + i * 1.7);
    g.fillStyle(shade(tint(DEA.void_), dark), alpha * 0.8);
    g.fillCircle(nx, ny, size * 1.25);
    g.fillStyle(shade(tint(DEA.pale), dark), alpha * 0.9);
    g.fillCircle(nx, ny, size);
    // Two wraps of bandage across it.
    for (let k = 0; k < 2; k++) {
      g.lineStyle(1.4, shade(tint(DEA.bone), dark), alpha * 0.85);
      g.lineBetween(nx - size, ny - size * 0.4 + k * size * 0.75,
        nx + size, ny - size * 0.1 + k * size * 0.75);
    }
    // The seep, and a drop leaving it.
    g.fillStyle(shade(tint(DEA.blood), dark), alpha * (0.5 + pulse * 0.4));
    g.fillCircle(nx, ny + size * 0.3, size * 0.42);
    const fall = ((t * 26 + seed + i * 9) % 14);
    g.fillStyle(shade(tint(DEA.blood), dark), alpha * Math.max(0, 0.55 - fall / 26));
    g.fillEllipse(nx, ny + size * 0.5 + fall, 1.6, 2.8);
  };

  for (let i = 0; i < Math.min(2, arms); i++) {
    nub(x + (i === 0 ? -1 : 1) * r * 0.92, y - r * 0.22, r * 0.24, i);
  }
  for (let i = 0; i < Math.min(2, legs); i++) {
    nub(x + (i === 0 ? -1 : 1) * r * 0.44, y + r * 0.78, r * 0.28, 2 + i);
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

// ── Upgrade primitives ────────────────────────────────────────────────────

/**
 * The sheath. Drawn hanging at the reaper's hip while the katana is put away and the next
 * strike is charging: a lacquered saya with a brass throat and a single bright line running its
 * length, which fills from the throat downward as the three seconds pass. Full and it hums.
 *
 * Deliberately the one shape in the kit built out of *straight* lines other than the blade —
 * being sheathed is the state where the steel is the only thing that matters.
 */
export function sheath(
  g: Phaser.GameObjects.Graphics,
  tint: DeathColorFn,
  x: number, y: number, ang: number, len: number, charge: number, alpha: number,
  { dark = 1, t = 0 } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const w = len * 0.075;

  const shell = [P(0, -w), P(len, -w * 0.62), P(len + w * 0.7, 0), P(len, w * 0.62), P(0, w)];
  g.fillStyle(shade(tint(DEA.void_), dark), alpha * 0.95);
  g.fillPoints(shell, true);
  g.fillStyle(shade(tint(DEA.shroud), dark), alpha * 0.9);
  g.fillPoints(shell.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 0.9, y + (p.y - y) * 0.9)), true);

  // The brass throat, where the blade goes in.
  const k0 = P(0, -w * 1.25);
  const k1 = P(0, w * 1.25);
  g.lineStyle(3, shade(tint(DEA.brass), dark), alpha * 0.9);
  g.lineBetween(k0.x, k0.y, k1.x, k1.y);

  // The charge line: a hairline of edge-white filling from the throat out.
  const hum = charge >= 1 ? 0.55 + 0.45 * Math.sin(t * 9) : 0.55;
  const c0 = P(len * 0.06, 0);
  const c1 = P(len * 0.06 + (len * 0.88) * Phaser.Math.Clamp(charge, 0, 1), 0);
  g.lineStyle(1.6, shade(tint(charge >= 1 ? DEA.edge : DEA.after), dark), alpha * hum);
  g.lineBetween(c0.x, c0.y, c1.x, c1.y);
  if (charge >= 1) {
    g.lineStyle(4.5, shade(tint(DEA.after), dark), alpha * 0.22 * hum);
    g.lineBetween(c0.x, c0.y, c1.x, c1.y);
  }
}

/**
 * Somebody's weapon, knocked out of their hands and lying on the floor.
 *
 * Nobody in this game is actually holding anything, so what comes off them is the thing they
 * were really fighting with: a faceted core of their own element, cracked across the middle and
 * leaking the colour it is made of. `color` is that element's colour and is used **raw** — it is
 * the one thing on screen that is deliberately not in Death's palette, because the whole point
 * is that it belongs to somebody else and they have to come and get it.
 */
export function weaponCore(
  g: Phaser.GameObjects.Graphics,
  tint: DeathColorFn,
  x: number, y: number, ang: number, size: number, alpha: number,
  { color = DEA.styx, seed = 0, t = 0, dark = 1 } = {},
): void {
  const pulse = 0.55 + 0.45 * Math.sin(t * 3.6 + seed);
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);

  // The halo it sits in, so a dropped core is findable on a dark floor.
  g.fillStyle(color, alpha * 0.1 * (0.6 + pulse * 0.6));
  g.fillCircle(x, y, size * (2.4 + pulse * 0.5));

  // Eight facets: a hard gem, not a ball of light.
  const hull: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const r = size * (0.78 + jitter(seed, i) * 0.34);
    hull.push(P(Math.cos(a) * r, Math.sin(a) * r * 0.92));
  }
  g.fillStyle(shade(tint(DEA.void_), dark), alpha * 0.9);
  g.fillPoints(hull.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 1.22, y + (p.y - y) * 1.22)), true);
  g.fillStyle(shade(color, 0.45), alpha * 0.95);
  g.fillPoints(hull, true);
  // Two lit faces off the top-left, so the gem has a light source.
  g.fillStyle(color, alpha * (0.65 + pulse * 0.3));
  g.fillPoints([hull[5], hull[6], hull[7], P(0, 0)], true);
  g.lineStyle(1.2, shade(color, 1.5), alpha * 0.8);
  g.strokePoints(hull, true);

  // The crack: the reason it is on the floor and not in their hand.
  const q0 = P(-size * 0.9, size * 0.15);
  const q1 = P(size * 0.2, -size * 0.35);
  const q2 = P(size * 0.95, size * 0.1);
  g.lineStyle(1.6, shade(tint(DEA.void_), dark), alpha * 0.85);
  g.lineBetween(q0.x, q0.y, q1.x, q1.y);
  g.lineBetween(q1.x, q1.y, q2.x, q2.y);

  // Three glints orbiting it, so it reads as loose rather than placed.
  for (let i = 0; i < 3; i++) {
    const a = t * 1.9 + seed + i * (TAU / 3);
    const d = size * (1.7 + 0.35 * Math.sin(t * 2.6 + i));
    g.fillStyle(color, alpha * (0.35 + pulse * 0.4));
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, 1.9);
  }
}

/**
 * The line between somebody and the weapon they are not holding. Yellow, because it is the
 * Disarm colour and this is what Disarm did — drawn as a run of dashes crawling *toward* the
 * core, so the picture says "go there" rather than "these two things are related".
 */
export function leash(
  g: Phaser.GameObjects.Graphics,
  tint: DeathColorFn,
  x0: number, y0: number, x1: number, y1: number, t: number, alpha: number,
  { dark = 1 } = {},
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const step = 15;
  const crawl = (t * 46) % step;
  g.lineStyle(3.4, shade(tint(DEA.void_), dark), alpha * 0.25);
  g.lineBetween(x0, y0, x1, y1);
  for (let d = crawl; d < len - 6; d += step) {
    const k = 1 - d / len;
    g.lineStyle(1.7, shade(tint(DEA.after), dark), alpha * (0.35 + k * 0.5));
    g.lineBetween(x0 + ux * d, y0 + uy * d, x0 + ux * (d + 7), y0 + uy * (d + 7));
  }
}

/**
 * One cut of the thousand: a lens-shaped gash left on the floor behind a running blade, with a
 * white edge along the inside of it and two hairline strays crossing at a slight angle. Fades
 * from the edge inward, so an old cut is a smudge and a fresh one is a wound.
 */
export function cutMark(
  g: Phaser.GameObjects.Graphics,
  tint: DeathColorFn,
  x: number, y: number, ang: number, len: number, alpha: number,
  { dark = 1, seed = 0 } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const w = len * 0.16;

  const lens: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= 6; i++) {
    const u = -len / 2 + (len * i) / 6;
    lens.push(P(u, -w * Math.cos((i / 6 - 0.5) * Math.PI) * (0.6 + jitter(seed, i) * 0.7)));
  }
  for (let i = 6; i >= 0; i--) {
    const u = -len / 2 + (len * i) / 6;
    lens.push(P(u, w * Math.cos((i / 6 - 0.5) * Math.PI) * (0.6 + jitter(seed, 10 + i) * 0.7)));
  }
  g.fillStyle(shade(tint(DEA.void_), dark), alpha * 0.7);
  g.fillPoints(lens, true);

  const e0 = P(-len / 2, 0);
  const e1 = P(len / 2, 0);
  g.lineStyle(1.3, shade(tint(DEA.edge), dark), alpha * 0.7);
  g.lineBetween(e0.x, e0.y, e1.x, e1.y);
  for (let i = 0; i < 2; i++) {
    const off = (jitter(seed, 20 + i) - 0.5) * len * 0.5;
    const skew = (jitter(seed, 30 + i) - 0.5) * 0.5;
    const s0 = P(off - len * 0.22, -w * 1.6);
    const s1 = P(off + len * 0.22 + skew * 10, w * 1.6);
    g.lineStyle(0.9, shade(tint(DEA.pale), dark), alpha * 0.35);
    g.lineBetween(s0.x, s0.y, s1.x, s1.y);
  }
}

/**
 * The arena wall, once Dishonor is watching it. A slab of dark stone standing inside the arena
 * edge with bone ribs set into it at intervals and a lit seam along the inner face — so a shot
 * flying past a wall reads as flying past *something*, and a shot that ends on one has a place
 * to leave its mark.
 *
 * `(ax, ay) → (bx, by)` is the inner face; `inAng` points into the arena, and the slab is drawn
 * away from it.
 */
export function wallFace(
  g: Phaser.GameObjects.Graphics,
  tint: DeathColorFn,
  ax: number, ay: number, bx: number, by: number,
  inAng: number, thick: number, t: number, alpha: number,
  { dark = 1, seed = 0 } = {},
): void {
  const ox = -Math.cos(inAng) * thick;
  const oy = -Math.sin(inAng) * thick;
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;

  g.fillStyle(shade(tint(DEA.void_), dark), alpha * 0.85);
  g.fillPoints([
    new Phaser.Geom.Point(ax, ay), new Phaser.Geom.Point(bx, by),
    new Phaser.Geom.Point(bx + ox, by + oy), new Phaser.Geom.Point(ax + ox, ay + oy),
  ], true);
  g.fillStyle(shade(tint(DEA.shroud), dark), alpha * 0.7);
  g.fillPoints([
    new Phaser.Geom.Point(ax + ox * 0.35, ay + oy * 0.35), new Phaser.Geom.Point(bx + ox * 0.35, by + oy * 0.35),
    new Phaser.Geom.Point(bx + ox, by + oy), new Phaser.Geom.Point(ax + ox, ay + oy),
  ], true);

  // Ribs set into the stone every 46px — bone, half-buried, alternating depth.
  const ribs = Math.max(1, Math.floor(len / 46));
  for (let i = 0; i <= ribs; i++) {
    const d = (len * i) / ribs;
    const px = ax + ux * d;
    const py = ay + uy * d;
    const deep = thick * (0.45 + jitter(seed, i) * 0.4);
    g.lineStyle(2.6, shade(tint(DEA.pale), dark), alpha * (0.2 + jitter(seed, 40 + i) * 0.16));
    g.lineBetween(px, py, px - Math.cos(inAng) * deep, py - Math.sin(inAng) * deep);
  }

  // The inner seam: one lit line, breathing, so the wall is alive rather than painted on.
  g.lineStyle(1.4, shade(tint(DEA.ash), dark), alpha * (0.4 + 0.18 * Math.sin(t * 1.6 + seed)));
  g.lineBetween(ax, ay, bx, by);
}

/**
 * Where a shot ended its life against the stone. A blown crater with cracks running out of it
 * and a bright rim that cools from white to blood over the twenty seconds the stack lasts —
 * the wall keeps the receipt for exactly as long as the shooter keeps the penalty.
 */
export function wallScar(
  g: Phaser.GameObjects.Graphics,
  tint: DeathColorFn,
  x: number, y: number, inAng: number, heat: number, alpha: number,
  { dark = 1, seed = 0 } = {},
): void {
  const r = 5 + heat * 4;
  g.fillStyle(shade(tint(DEA.void_), dark), alpha * 0.9);
  g.fillCircle(x, y, r * 1.5);
  g.fillStyle(shade(tint(heat > 0.6 ? DEA.edge : DEA.blood), dark), alpha * (0.35 + heat * 0.55));
  g.fillCircle(x, y, r * 0.55);
  for (let i = 0; i < 6; i++) {
    const a = inAng + (jitter(seed, i) - 0.5) * 2.6;
    const d = r * (1.4 + jitter(seed, 10 + i) * 2.4);
    g.lineStyle(1.1, shade(tint(DEA.ash), dark), alpha * (0.25 + heat * 0.4));
    g.lineBetween(x, y, x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  g.lineStyle(1.2, shade(tint(DEA.blood), dark), alpha * (0.2 + heat * 0.5));
  g.strokeCircle(x, y, r);
}

/**
 * One of the things that come out of him during a Deal. A tapering ink-black arm built from a
 * wavy centreline — three sampled ribs to a side rather than a stroked line, so it has volume
 * and the tip can curl. Suckers down the inner edge, and a wet highlight down the outer one.
 */
export function tentacle(
  g: Phaser.GameObjects.Graphics,
  tint: DeathColorFn,
  x: number, y: number, ang: number, len: number, alpha: number,
  { dark = 1, seed = 0, t = 0, curl = 1, thick = 7 } = {},
): void {
  const steps = 9;
  const spine: { x: number; y: number; w: number }[] = [];
  let px = x;
  let py = y;
  let a = ang;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    spine.push({ x: px, y: py, w: thick * (1 - k * 0.88) });
    a += Math.sin(t * 3.1 + seed + k * 5.5) * 0.19 * curl + k * 0.055 * curl;
    px += Math.cos(a) * (len / steps);
    py += Math.sin(a) * (len / steps);
  }

  const left: Phaser.Geom.Point[] = [];
  const right: Phaser.Geom.Point[] = [];
  for (let i = 0; i < spine.length; i++) {
    const s = spine[i];
    const n = i < spine.length - 1
      ? Math.atan2(spine[i + 1].y - s.y, spine[i + 1].x - s.x) + Math.PI / 2
      : Math.atan2(s.y - spine[i - 1].y, s.x - spine[i - 1].x) + Math.PI / 2;
    left.push(new Phaser.Geom.Point(s.x + Math.cos(n) * s.w, s.y + Math.sin(n) * s.w));
    right.unshift(new Phaser.Geom.Point(s.x - Math.cos(n) * s.w, s.y - Math.sin(n) * s.w));
  }
  g.fillStyle(shade(tint(DEA.void_), dark), alpha * 0.95);
  g.fillPoints([...left, ...right], true);
  g.fillStyle(shade(tint(DEA.shroud), dark), alpha * 0.55);
  g.fillPoints([...left.map((p, i) => new Phaser.Geom.Point(
    p.x + (spine[i].x - p.x) * 0.45, p.y + (spine[i].y - p.y) * 0.45,
  )), ...right], true);

  // Suckers: pale rings down the inner side, smaller toward the tip.
  for (let i = 1; i < spine.length - 1; i += 2) {
    const p = left[i];
    g.fillStyle(shade(tint(DEA.pale), dark), alpha * 0.4);
    g.fillCircle(p.x, p.y, spine[i].w * 0.34);
  }
  // ...and the wet line down the outer one.
  g.lineStyle(1, shade(tint(DEA.smoke), dark), alpha * 0.5);
  g.strokePoints(right, false);
}

/**
 * The mask. A bone oval a size too small for the face behind it, with two hollow slits and a
 * stitched grin — and it cracks as it is spent: one fracture across it per hit taken, so the
 * three charges are readable on the object rather than only in the tray.
 */
export function deathMask(
  g: Phaser.GameObjects.Graphics,
  tint: DeathColorFn,
  x: number, y: number, r: number, cracks: number, alpha: number,
  { dark = 1, seed = 0, t = 0 } = {},
): void {
  const sway = Math.sin(t * 2.2 + seed) * 0.7;
  g.fillStyle(shade(tint(DEA.void_), dark), alpha * 0.8);
  g.fillEllipse(x + sway, y + 1.5, r * 2.1, r * 2.6);
  g.fillStyle(shade(tint(DEA.bone), dark), alpha * 0.97);
  g.fillEllipse(x + sway, y, r * 2, r * 2.5);
  g.lineStyle(1.2, shade(tint(DEA.pale), dark), alpha * 0.8);
  g.strokeEllipse(x + sway, y, r * 2, r * 2.5);

  // Two hollow slits, angled inward. Nothing behind them.
  for (const side of [-1, 1]) {
    g.fillStyle(shade(tint(DEA.void_), dark), alpha * 0.95);
    g.fillPoints([
      new Phaser.Geom.Point(x + sway + side * r * 0.22, y - r * 0.42),
      new Phaser.Geom.Point(x + sway + side * r * 0.78, y - r * 0.58),
      new Phaser.Geom.Point(x + sway + side * r * 0.74, y - r * 0.18),
      new Phaser.Geom.Point(x + sway + side * r * 0.26, y - r * 0.12),
    ], true);
  }
  // The grin: a straight mouth with five stitches over it.
  const my = y + r * 0.72;
  g.lineStyle(1.6, shade(tint(DEA.void_), dark), alpha * 0.9);
  g.lineBetween(x + sway - r * 0.62, my, x + sway + r * 0.62, my);
  for (let i = 0; i < 5; i++) {
    const sx = x + sway - r * 0.55 + (r * 1.1 * i) / 4;
    g.lineStyle(1, shade(tint(DEA.pale), dark), alpha * 0.85);
    g.lineBetween(sx, my - r * 0.22, sx + r * 0.1, my + r * 0.22);
  }
  // One fracture per charge already spent, thrown from a different corner each time.
  for (let i = 0; i < cracks; i++) {
    const a = TAU * jitter(seed, 50 + i);
    g.lineStyle(1.5, shade(tint(DEA.smoke), dark), alpha * 0.9);
    g.lineBetween(x + sway + Math.cos(a) * r * 1.8, y + Math.sin(a) * r * 2.2,
      x + sway + Math.cos(a + 2.2) * r * 0.5, y + Math.sin(a + 2.2) * r * 0.6);
  }
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

  /**
   * A limb coming off. One hard white line where the blade went through, an arterial fan behind
   * it, and the piece itself tumbling away — the only red in the kit outside midnight, because
   * this is the only other thing he does that a body never gets back.
   */
  amputate(x: number, y: number, ang: number, leg: boolean, ms = 900, depth = 12, dark = 1): void {
    const seed = Math.random() * 999;
    const away = ang + (jitter(seed, 0) - 0.5) * 1.4;
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      // The cut: a bright line across the wound, snapping wide then gone.
      if (t < 0.35) {
        const k = 1 - t / 0.35;
        const len = 34 * (0.4 + easeOut(t / 0.35));
        g.lineStyle(2.6 * k + 0.6, shade(this.tint(DEA.edge), dark), k * 0.95);
        g.lineBetween(x - Math.cos(ang + Math.PI / 2) * len, y - Math.sin(ang + Math.PI / 2) * len,
          x + Math.cos(ang + Math.PI / 2) * len, y + Math.sin(ang + Math.PI / 2) * len);
      }
      // The arterial fan, thrown along the cut and falling as it goes.
      for (let i = 0; i < 11; i++) {
        const a = away + (jitter(seed, i) - 0.5) * 1.5;
        const d = (16 + jitter(seed, 20 + i) * 62) * e;
        g.fillStyle(shade(this.tint(DEA.blood), dark), (1 - t) * 0.8);
        g.fillEllipse(x + Math.cos(a) * d, y + Math.sin(a) * d + e * e * 30,
          2.4 + jitter(seed, 40 + i) * 2, 3.6 + jitter(seed, 50 + i) * 2.4);
      }
      // ...and the limb, tumbling out of the picture.
      severedLimb(g, this.tint, x + Math.cos(away) * 74 * e, y + Math.sin(away) * 74 * e + e * e * 34,
        away + t * 7, 26, (1 - t) * 0.95, { dark, seed, leg });
    });
  }

  /**
   * The wave a sheathed Riposte lets go of when the guard drops. A low ring that drags rather
   * than blasts: a wide grinding band on the floor with a serrated leading edge, and a comb of
   * short blades sticking out of it — everything it passes is slowed, not hurt.
   */
  shockwave(x: number, y: number, r0: number, r1: number, ms = 720, depth = 4, dark = 1): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      const r = r0 + (r1 - r0) * e;
      g.lineStyle(16 * (1 - t) + 3, shade(this.tint(DEA.shroud), dark), (1 - t) * 0.35);
      g.strokeCircle(x, y, r);
      // The serrated edge: sampled points rather than a circle, so the front is a saw.
      const pts: Phaser.Geom.Point[] = [];
      for (let i = 0; i <= 30; i++) {
        const a = (i / 30) * TAU;
        const rr = r * (1 + (jitter(seed, i) - 0.5) * 0.06);
        pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
      }
      g.lineStyle(2.2 * (1 - t) + 0.6, shade(this.tint(DEA.blade), dark), (1 - t) * 0.9);
      g.strokePoints(pts, true);
      // A comb of short blades standing up out of the wave.
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU + seed * 0.01;
        const h = 13 * (1 - t);
        g.lineStyle(1.4, shade(this.tint(DEA.edge), dark), (1 - t) * 0.55);
        g.lineBetween(x + Math.cos(a) * r, y + Math.sin(a) * r,
          x + Math.cos(a) * (r + h), y + Math.sin(a) * (r + h) - h * 0.4);
      }
    });
  }

  /**
   * A tentacle closing on a bullet. The arm whips out along `ang`, the shot goes dark, and what
   * comes back is ink — the only thing in the kit that eats a projectile instead of cutting it.
   */
  grab(x: number, y: number, ang: number, ms = 340, depth = 11, dark = 1): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(Math.min(1, t * 2));
      const back = t > 0.5 ? (t - 0.5) * 2 : 0;
      tentacle(g, this.tint, x - Math.cos(ang) * 70, y - Math.sin(ang) * 70, ang,
        70 * e * (1 - back * 0.85), (1 - t * 0.5) * 0.95,
        { dark, seed, t: t * 4, curl: 1.6, thick: 6 });
      g.fillStyle(shade(this.tint(DEA.void_), dark), (1 - t) * 0.85);
      g.fillCircle(x, y, 11 * (1 - t) + 3);
      for (let i = 0; i < 7; i++) {
        const a = TAU * jitter(seed, i);
        const d = (6 + jitter(seed, 10 + i) * 26) * easeOut(t);
        g.fillStyle(shade(this.tint(DEA.shroud), dark), (1 - t) * 0.7);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 2.6 * (1 - t) + 0.8);
      }
    });
  }

  /** The mask coming apart: bone shards thrown flat, and a last white flare where the face was. */
  maskBreak(x: number, y: number, ms = 640, depth = 12, dark = 1): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, 16, DEA.bone, DEA.pale, depth);
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 9; i++) {
        const a = TAU * jitter(seed, i);
        const d = (10 + jitter(seed, 20 + i) * 58) * e;
        const sz = 2.4 + jitter(seed, 40 + i) * 3.4;
        const px = x + Math.cos(a) * d;
        const py = y + Math.sin(a) * d + e * e * 26;
        g.fillStyle(shade(this.tint(DEA.bone), dark), (1 - t) * 0.9);
        g.fillPoints([
          new Phaser.Geom.Point(px, py - sz),
          new Phaser.Geom.Point(px + sz, py + sz * 0.6),
          new Phaser.Geom.Point(px - sz * 0.7, py + sz),
        ], true);
      }
    });
  }

  /** Exsanguination: a body quietly running out from underneath itself. */
  bleed(x: number, y: number, ms = 760, depth = 9, dark = 1): void {
    const seeds = Array.from({ length: 9 }, (_, i) => ({
      ox: (Math.random() - 0.5) * 26, delay: Math.random() * 0.4, i,
    }));
    this.anim(depth, ms, (g, t) => {
      for (const p of seeds) {
        const k = Phaser.Math.Clamp((t - p.delay) / (1 - p.delay), 0, 1);
        if (k <= 0) continue;
        g.fillStyle(shade(this.tint(DEA.blood), dark), (1 - k) * 0.75);
        g.fillEllipse(x + p.ox, y - 6 + easeIn(k) * 40, 2.2, 4.4);
      }
      g.fillStyle(shade(this.tint(DEA.blood), dark), (1 - t) * 0.4);
      g.fillEllipse(x, y + 20, 20 * easeOut(t), 5 * easeOut(t));
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
