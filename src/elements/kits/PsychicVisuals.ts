import Phaser from 'phaser';
import { ArmGesture, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Psychic draws.
 *
 * One material and one silhouette rule. The material is **thought made visible** — nothing in
 * this kit is solid. Every shape is drawn as a bright thin line with a wide dim bloom behind it,
 * so it reads as something projected onto the arena rather than something sitting in it, and
 * every one of them is drawn from concentric or radial geometry because that is what a mandala
 * looks like. The rule is that the eye is always the focus: the third eye on the monk's
 * forehead, the almond eye at the end of the whip, the ring of lashes around a ghost, the
 * pupil at the middle of a sigil. If a shape in this file has a centre, there is an eye in it.
 *
 * The palette is the chessboard: a single ebony-to-ivory ladder with exactly two colours off it:
 * the gold of an opened eye, and the red of stress. Both of those are meant to be alarming against
 * the monochrome, which is why nothing else in the kit is allowed near them. (The keys keep their
 * old violet names so the painters below did not all need renaming — read `violet` as "silver".)
 */

export type PsychicColorFn = ColorFn;

export const PSY = {
  /** Under everything — the black squares. */
  ink: 0x0b0b0d,
  /** The ebony-to-ivory ladder — the whole element lives in these five. */
  robeDeep: 0x1c1c21,
  robe: 0x3c3c44,
  violet: 0xa9a9b3,
  violetLit: 0xd8d8de,
  aether: 0xf7f3e8,
  /** Skin: carved ivory. */
  skin: 0xe4dfd1,
  skinShade: 0x8e897d,
  /** The one warm colour: an eye that has been open a very long time. */
  gold: 0xffd166,
  goldDeep: 0xc98b1a,
  /** The other: stress, and nothing else is allowed to use it. */
  stress: 0xff3355,
  stressDeep: 0x8c1226,
};

/** Deterministic 0–1 noise, so a sigil keeps its shape between frames. */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 41.7 + i * 97.3) * 19427.531;
  return v - Math.floor(v);
}

/** Scale a colour's channels. Used to sink a fill into shadow, never to recolour it. */
export function shade(color: number, k: number): number {
  const r = Math.round(Math.min(255, ((color >> 16) & 0xff) * k));
  const g = Math.round(Math.min(255, ((color >> 8) & 0xff) * k));
  const b = Math.round(Math.min(255, (color & 0xff) * k));
  return (r << 16) | (g << 8) | b;
}

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * The eye. Two arcs meeting at points, an iris, a vertical slit and a ring of lashes that only
 * appear once it is more than half open. `open` is 0 (a closed seam) to 1 (staring), and drives
 * the height of the almond rather than an alpha — a fading eye reads as a bug, a closing one
 * reads as a blink.
 */
export function thirdEye(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  x: number, y: number, r: number, open: number, alpha: number,
  { iris = PSY.gold, lash = true, glow = 1 } = {},
): void {
  const o = Phaser.Math.Clamp(open, 0, 1);
  const h = r * (0.12 + o * 0.78);

  if (glow > 0 && o > 0.15) {
    g.fillStyle(tint(iris), alpha * 0.16 * glow * o);
    g.fillCircle(x, y, r * 2.1);
  }

  // The almond: two quadratic arcs sampled as a polygon so it comes to a point at both corners.
  const pts: Phaser.Geom.Point[] = [];
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const u = -1 + (i / N) * 2;
    pts.push(new Phaser.Geom.Point(x + u * r, y - (1 - u * u) * h));
  }
  for (let i = N; i >= 0; i--) {
    const u = -1 + (i / N) * 2;
    pts.push(new Phaser.Geom.Point(x + u * r, y + (1 - u * u) * h));
  }
  g.fillStyle(tint(PSY.aether), alpha * 0.92);
  g.fillPoints(pts, true);
  g.lineStyle(1.3, tint(PSY.ink), alpha * 0.8);
  g.strokePoints(pts, true);

  if (o > 0.2) {
    // Iris, slit pupil, and a glint up-left so it has a light source.
    const ir = Math.min(h * 0.95, r * 0.46);
    g.fillStyle(tint(iris), alpha);
    g.fillCircle(x, y, ir);
    g.fillStyle(tint(PSY.ink), alpha);
    g.fillEllipse(x, y, ir * 0.42, ir * 1.75);
    g.fillStyle(tint(PSY.aether), alpha * 0.85);
    g.fillCircle(x - ir * 0.4, y - ir * 0.45, ir * 0.24);
  }

  if (lash && o > 0.5) {
    const k = (o - 0.5) / 0.5;
    g.lineStyle(1.1, tint(iris), alpha * 0.7 * k);
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI + (i / 8) * Math.PI;
      const l = r * (0.28 + jitter(97, i) * 0.3);
      g.lineBetween(
        x + Math.cos(a) * r * 0.95, y + Math.sin(a) * h * 1.1,
        x + Math.cos(a) * (r * 0.95 + l), y + Math.sin(a) * (h * 1.1 + l * 1.4),
      );
    }
  }
}

/**
 * The whip. Not a line: a tapering cord with a travelling wave running down it, a bright core
 * inside a dim bloom, and an eye at the tip that opens as the lash extends — the tip is the part
 * of this ability the player is aiming with, so it has to be the part that is easiest to see.
 */
export function psiWhip(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  pts: { x: number; y: number }[], alpha: number,
  { tipHot = 0, thick = 7 } = {},
): void {
  if (pts.length < 2) return;

  // Bloom, body, core: three passes down the same cord at falling width and rising brightness.
  const passes: [number, number, number][] = [
    [2.4, 0.22, PSY.robeDeep],
    [1.0, 0.85, PSY.violet],
    [0.34, 1.0, PSY.aether],
  ];
  for (const [wk, ak, color] of passes) {
    for (let i = 1; i < pts.length; i++) {
      const u = i / (pts.length - 1);
      // Taper: fat at the grip, a thread at the tip.
      const w = Math.max(0.6, thick * wk * (1 - u * 0.82));
      g.lineStyle(w, tint(color), alpha * ak);
      g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
    }
  }

  const tip = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const ang = Math.atan2(tip.y - prev.y, tip.x - prev.x);
  if (tipHot > 0) {
    g.fillStyle(tint(PSY.stress), alpha * 0.3 * tipHot);
    g.fillCircle(tip.x, tip.y, 13 * tipHot);
  }
  // The eye on the end, rolled to face along the lash.
  const er = 5.5 + tipHot * 2.5;
  g.fillStyle(tint(PSY.aether), alpha * 0.9);
  g.fillEllipse(tip.x, tip.y, er * 2, er * (0.7 + tipHot * 0.6));
  g.fillStyle(tint(tipHot > 0 ? PSY.stress : PSY.gold), alpha);
  g.fillCircle(tip.x, tip.y, er * 0.5);
  g.fillStyle(tint(PSY.ink), alpha);
  g.fillEllipse(
    tip.x + Math.cos(ang) * er * 0.14, tip.y + Math.sin(ang) * er * 0.14,
    er * 0.22, er * 0.62,
  );
}

/**
 * The cord's shape at `t` through its crack, as the polyline `psiWhip` draws and the kit tests
 * against. Shared rather than duplicated because it is both the art *and* the hitbox: the two
 * drifting apart is the one bug this ability cannot survive.
 *
 * The amplitude of the travelling wave crosses zero at exactly `crackT` and goes negative after,
 * so the cord is dead straight on the frame the hit is resolved and coils the *other* way on the
 * follow-through. Anything else and the tip lands a fist's width off where it was aimed.
 */
export function lashPoints(
  x: number, y: number, ang: number, t: number,
  { len = 196, crackT = 0.55, n = 18 } = {},
): { x: number; y: number }[] {
  const reach = len * Math.min(1, 0.2 + t * 1.7);
  const step = reach / n;
  const pts: { x: number; y: number }[] = [{ x, y }];
  let px = x;
  let py = y;
  for (let i = 0; i < n; i++) {
    const u = (i + 1) / n;
    const wave = Math.sin(u * Math.PI * 1.4 - t * 7.2) * (0.62 - t * (0.62 / crackT)) * u;
    const a = ang + wave;
    px += Math.cos(a) * step;
    py += Math.sin(a) * step;
    pts.push({ x: px, y: py });
  }
  return pts;
}

/**
 * A sigil: a ring, a ring of spokes, and a pupil. Used wherever the element has to put a mark on
 * something without saying what the mark does — the seized ability, the migraine, the ward under
 * a comatose body. `phase` spins the spokes, `sides` changes how occult it looks.
 */
export function mindSigil(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  x: number, y: number, r: number, alpha: number,
  { phase = 0, sides = 7, color = PSY.violet, eye = true } = {},
): void {
  g.lineStyle(1.6, tint(color), alpha * 0.9);
  g.strokeCircle(x, y, r);
  g.lineStyle(0.9, tint(color), alpha * 0.55);
  g.strokeCircle(x, y, r * 0.72);

  // The star inside: every vertex joined to the one two along, which is what makes it read as a
  // seal rather than a wheel.
  const step = sides >= 7 ? 3 : 2;
  const vs: Phaser.Geom.Point[] = [];
  for (let i = 0; i < sides; i++) {
    const a = phase + (i / sides) * TAU - Math.PI / 2;
    vs.push(new Phaser.Geom.Point(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72));
  }
  g.lineStyle(1.1, tint(color), alpha * 0.8);
  for (let i = 0; i < sides; i++) {
    const b = vs[(i + step) % sides];
    g.lineBetween(vs[i].x, vs[i].y, b.x, b.y);
  }
  // Ticks outside the rim.
  g.lineStyle(1.4, tint(color), alpha * 0.7);
  for (let i = 0; i < sides * 2; i++) {
    const a = -phase * 0.6 + (i / (sides * 2)) * TAU;
    g.lineBetween(
      x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 1.05,
      x + Math.cos(a) * r * (i % 2 ? 1.14 : 1.26), y + Math.sin(a) * r * (i % 2 ? 1.14 : 1.26),
    );
  }
  if (eye) thirdEye(g, tint, x, y, r * 0.42, 1, alpha, { glow: 0, lash: false });
}

/**
 * Stress, drawn on the victim: jagged cracks radiating out of a point, growing in count and
 * length with the pool. Deliberately the only red thing on screen, and deliberately drawn as
 * fracture rather than fire — the pool is pressure, not heat.
 */
export function stressCracks(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  x: number, y: number, load: number, alpha: number, seed: number, throb: number,
): void {
  const n = Math.min(9, 2 + Math.floor(load * 8));
  const puls = 0.85 + 0.15 * Math.sin(throb);
  for (let i = 0; i < n; i++) {
    const a = jitter(seed, i) * TAU;
    const len = (11 + jitter(seed, 20 + i) * 16) * (0.45 + load * 0.7) * puls;
    let px = x + Math.cos(a) * 5;
    let py = y + Math.sin(a) * 5;
    g.lineStyle(2.4, tint(PSY.stressDeep), alpha * 0.55);
    g.lineBetween(px, py, px + Math.cos(a) * len, py + Math.sin(a) * len);
    // Kinked bright core: three segments that each veer, so it reads as a crack.
    g.lineStyle(1.2, tint(PSY.stress), alpha * 0.95);
    let ca = a;
    for (let k = 0; k < 3; k++) {
      ca += (jitter(seed, 40 + i * 3 + k) - 0.5) * 1.1;
      const nx = px + Math.cos(ca) * (len / 3);
      const ny = py + Math.sin(ca) * (len / 3);
      g.lineBetween(px, py, nx, ny);
      px = nx; py = ny;
    }
  }
  g.fillStyle(tint(PSY.stress), alpha * 0.3 * puls);
  g.fillCircle(x, y, 4 + load * 5);
}

/**
 * Opened Eyes, on the floor: the enemy's next two seconds as a thread of violet dashes that get
 * fainter the further into the future they are, with tick marks at each half second so the
 * player can read *when* as well as *where*.
 */
export function foresightPath(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  pts: { x: number; y: number }[], alpha: number, flow: number,
): void {
  if (pts.length < 2) return;
  for (let i = 1; i < pts.length; i++) {
    const u = i / (pts.length - 1);
    // Dashes chase along the thread, so it reads as a direction rather than a trail.
    const dash = 0.55 + 0.45 * Math.sin(u * 22 - flow * 5);
    const fade = (1 - u * 0.72) * dash;
    g.lineStyle(5.5, tint(PSY.robeDeep), alpha * 0.2 * fade);
    g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
    g.lineStyle(2, tint(PSY.violetLit), alpha * 0.85 * fade);
    g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
  }
  // Half-second markers: a short bar across the thread.
  for (let i = 1; i < pts.length - 1; i++) {
    if (i % 5) continue;
    const a = Math.atan2(pts[i + 1].y - pts[i - 1].y, pts[i + 1].x - pts[i - 1].x) + Math.PI / 2;
    const fade = 1 - (i / (pts.length - 1)) * 0.7;
    g.lineStyle(1.6, tint(PSY.aether), alpha * 0.7 * fade);
    g.lineBetween(
      pts[i].x - Math.cos(a) * 5, pts[i].y - Math.sin(a) * 5,
      pts[i].x + Math.cos(a) * 5, pts[i].y + Math.sin(a) * 5,
    );
  }
}

/**
 * Where they will be standing in two seconds: an outline of a body with an eye where its head
 * would be. Hollow on purpose — a filled shape at the end of the thread reads as a second
 * enemy, and the player has to be able to tell the future from the present at a glance.
 */
export function destinyGhost(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  x: number, y: number, alpha: number, t: number,
): void {
  const breathe = 1 + Math.sin(t * 3.4) * 0.05;
  g.lineStyle(1.8, tint(PSY.violetLit), alpha * 0.75);
  g.strokeEllipse(x, y + 4, 22 * breathe, 30 * breathe);
  g.lineStyle(1.2, tint(PSY.violet), alpha * 0.45);
  g.strokeEllipse(x, y + 4, 30 * breathe, 40 * breathe);
  g.fillStyle(tint(PSY.violet), alpha * 0.1);
  g.fillEllipse(x, y + 4, 22 * breathe, 30 * breathe);
  thirdEye(g, tint, x, y - 6, 6.5, 0.5 + 0.5 * Math.sin(t * 2.1), alpha * 0.9, { glow: 0.4 });
  // A pooled shadow, so it is standing on the floor rather than floating over it.
  g.fillStyle(tint(PSY.robeDeep), alpha * 0.3);
  g.fillEllipse(x, y + 20, 20, 6);
}

/**
 * One chip in the prediction bar: a notched plate with a key legend in it. Drawn here rather
 * than with Text objects because there is one of these per queued ability per enemy and they
 * appear and vanish constantly — rebuilding a Text canvas at that rate is the one thing that
 * would make this passive expensive. `heat` is how close the ability is to actually firing.
 */
export function keyChip(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  x: number, y: number, w: number, h: number, alpha: number, heat: number,
): void {
  const n = 3.5;
  const plate: Phaser.Geom.Point[] = [
    new Phaser.Geom.Point(x - w / 2 + n, y - h / 2),
    new Phaser.Geom.Point(x + w / 2 - n, y - h / 2),
    new Phaser.Geom.Point(x + w / 2, y - h / 2 + n),
    new Phaser.Geom.Point(x + w / 2, y + h / 2 - n),
    new Phaser.Geom.Point(x + w / 2 - n, y + h / 2),
    new Phaser.Geom.Point(x - w / 2 + n, y + h / 2),
    new Phaser.Geom.Point(x - w / 2, y + h / 2 - n),
    new Phaser.Geom.Point(x - w / 2, y - h / 2 + n),
  ];
  g.fillStyle(tint(PSY.ink), alpha * 0.82);
  g.fillPoints(plate, true);
  g.fillStyle(tint(PSY.robe), alpha * (0.2 + heat * 0.45));
  g.fillPoints(plate, true);
  g.lineStyle(1.3, tint(heat > 0.72 ? PSY.gold : PSY.violetLit), alpha * (0.6 + heat * 0.4));
  g.strokePoints(plate, true);
}

/**
 * A migraine charge sitting on the floor, waiting.
 *
 * Three readings in one mark, because the player on the other end of it has two and a half
 * seconds to get out and needs all three at a glance: the outer rim never moves and is exactly
 * where the blast stops, the hand sweeping that rim is how much fuse is left, and the ring
 * collapsing toward the sigil is the same number said again for anyone watching the middle. The
 * whole thing pulses harder over the last second and the sigil turns red as it does, so a charge
 * about to go off cannot be mistaken for one that was just planted.
 */
export function migraineMark(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  x: number, y: number, r: number, t: number, alpha = 1,
): void {
  const k = Phaser.Math.Clamp(t, 0, 1);
  // Calm for the first 60%, then a hard blink that speeds up into the detonation.
  const puls = k < 0.6 ? 0.72 : 0.5 + 0.5 * Math.abs(Math.sin(k * 34));

  g.fillStyle(tint(PSY.robeDeep), alpha * (0.14 + 0.22 * k));
  g.fillCircle(x, y, r);
  g.lineStyle(1.6 + 1.8 * k, tint(PSY.violet), alpha * (0.5 + 0.4 * k) * puls);
  g.strokeCircle(x, y, r);

  // The fuse: a hand sweeping the rim clockwise from noon.
  g.lineStyle(3.2, tint(PSY.stress), alpha * 0.85 * puls);
  g.beginPath();
  g.arc(x, y, r * 0.94, -Math.PI / 2, -Math.PI / 2 + k * TAU, false);
  g.strokePath();

  // The same countdown said inward, so the middle of the mark reads on its own.
  g.lineStyle(2, tint(PSY.violetLit), alpha * 0.8 * puls);
  g.strokeCircle(x, y, r * (1 - k * 0.74));

  // Spokes just inside the rim — a seal being drawn, not a targeting reticle.
  g.lineStyle(1.1, tint(PSY.violet), alpha * 0.45);
  for (let i = 0; i < 8; i++) {
    const a = k * 1.6 + (i / 8) * TAU;
    g.lineBetween(
      x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82,
      x + Math.cos(a) * r * 0.97, y + Math.sin(a) * r * 0.97,
    );
  }

  mindSigil(g, tint, x, y, r * 0.3, alpha * (0.55 + 0.45 * k), {
    phase: k * 7, sides: 7, color: k > 0.75 ? PSY.stress : PSY.violet,
  });
}

/**
 * Mind's Focus (F+), while the charge is still in his hand.
 *
 * The same three readings `migraineMark` gives, said in advance: the outer rim is the blast the
 * charge would have if it went down *now*, the arc filling clockwise is how much of the five
 * seconds has been wound in, and the sigil in the middle grows with it. Drawn hollow rather than
 * filled, because nothing is on the floor yet — this is where the charge would land, not a charge.
 */
export function focusMark(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  x: number, y: number, r: number, charge: number, t: number,
): void {
  const k = Phaser.Math.Clamp(charge, 0, 1);
  const breathe = 0.8 + 0.2 * Math.sin(t * 6 + k * 4);

  g.lineStyle(1.2, tint(PSY.violet), 0.3 + 0.25 * k);
  g.strokeCircle(x, y, r);
  // The wind-up, as an arc closing the rim from noon. Full circle = five seconds in.
  g.lineStyle(3.4, tint(k >= 1 ? PSY.gold : PSY.violetLit), (0.55 + 0.4 * k) * breathe);
  g.beginPath();
  g.arc(x, y, r * 0.92, -Math.PI / 2, -Math.PI / 2 + k * TAU, false);
  g.strokePath();

  // Thought being drawn inward: spokes marching toward the middle as it winds up.
  g.lineStyle(1, tint(PSY.violet), 0.35 + 0.3 * k);
  for (let i = 0; i < 10; i++) {
    const a = -t * 1.2 + (i / 10) * TAU;
    const inner = r * (0.55 - k * 0.2);
    const outer = r * (0.86 - k * 0.14);
    g.lineBetween(x + Math.cos(a) * inner, y + Math.sin(a) * inner,
      x + Math.cos(a) * outer, y + Math.sin(a) * outer);
  }
  mindSigil(g, tint, x, y, r * (0.16 + k * 0.2), 0.5 + 0.5 * k,
    { phase: t * 3 + k * 6, sides: 7, color: k >= 1 ? PSY.gold : PSY.violetLit });
}

/**
 * Whip Snap (Click+): the cord catching the end of somebody's route.
 *
 * A taut line from where they were to where they were always going to be, with the destination
 * ring closing on the spot. It has to read as a *pull* rather than a hit, which is why the line
 * is drawn with arrow chevrons walking along it toward the ring rather than as a plain lash.
 */
export function snapLine(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  fromX: number, fromY: number, toX: number, toY: number, alpha: number, t: number,
): void {
  const ang = Math.atan2(toY - fromY, toX - fromX);
  const d = Phaser.Math.Distance.Between(fromX, fromY, toX, toY);
  g.lineStyle(5, tint(PSY.robeDeep), alpha * 0.28);
  g.lineBetween(fromX, fromY, toX, toY);
  g.lineStyle(1.8, tint(PSY.gold), alpha * 0.9);
  g.lineBetween(fromX, fromY, toX, toY);
  // Chevrons chasing the destination, so the direction of the yank is never ambiguous.
  for (let i = 0; i < 5; i++) {
    const u = ((i / 5) + t) % 1;
    const px = fromX + Math.cos(ang) * d * u;
    const py = fromY + Math.sin(ang) * d * u;
    g.lineStyle(1.6, tint(PSY.aether), alpha * 0.75);
    for (const s of [-1, 1]) {
      const a = ang + Math.PI + s * 0.6;
      g.lineBetween(px, py, px + Math.cos(a) * 7, py + Math.sin(a) * 7);
    }
  }
  g.lineStyle(2.2, tint(PSY.gold), alpha * 0.85);
  g.strokeCircle(toX, toY, 10 + (1 - t) * 22);
}

/**
 * Predictor's Snare (mastery passive): a closed eye burnt into the floor.
 *
 * It has to read as *shut* from across the arena, so it is drawn as a seam rather than as a dim
 * version of `thirdEye` — one heavy lash-line with a lid folded over it, the lashes hanging down
 * instead of standing out, and the whole thing laid into an ellipse so it sits on the floor
 * rather than facing the camera. The ring around it breathes very slowly: a trap that pulsed at
 * the rate of everything else in the kit would read as an ability going off.
 *
 * `arm` is 0 while it is still settling and 1 once it can catch somebody, and it is the rim that
 * carries it — an unarmed rune is drawn open-ended, and the ring closes as it becomes live.
 */
export function snareRune(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  x: number, y: number, r: number, alpha: number, t: number, arm: number,
): void {
  const breathe = 0.86 + 0.14 * Math.sin(t * 1.4);
  const k = Phaser.Math.Clamp(arm, 0, 1);

  // The scorch it is sitting in.
  g.fillStyle(tint(PSY.ink), alpha * 0.42);
  g.fillEllipse(x, y, r * 2.1, r * 1.35);
  g.fillStyle(tint(PSY.robeDeep), alpha * 0.34 * breathe);
  g.fillEllipse(x, y, r * 1.7, r * 1.05);

  // The rim, drawn as an arc so an unarmed rune is visibly still closing.
  g.lineStyle(1.5, tint(PSY.violet), alpha * 0.55);
  g.beginPath();
  g.arc(x, y, r * 1.15, -Math.PI / 2, -Math.PI / 2 + k * TAU, false);
  g.strokePath();

  // The lid: a shallow arc sampled as a polyline, with a heavier seam under it.
  const lid: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= 12; i++) {
    const u = -1 + (i / 12) * 2;
    lid.push(new Phaser.Geom.Point(x + u * r, y - (1 - u * u) * r * 0.36));
  }
  g.lineStyle(2.4, tint(PSY.violetLit), alpha * 0.85);
  g.strokePoints(lid, false);
  g.lineStyle(3.2, tint(PSY.gold), alpha * (0.55 + 0.35 * breathe));
  g.lineBetween(x - r * 0.92, y, x + r * 0.92, y);
  g.lineStyle(1.2, tint(PSY.aether), alpha * 0.7);
  g.lineBetween(x - r * 0.6, y - 0.6, x + r * 0.6, y - 0.6);

  // Lashes hanging off the seam — the tell that this is an eye and not a rune circle.
  g.lineStyle(1.3, tint(PSY.gold), alpha * 0.6);
  for (let i = 0; i < 7; i++) {
    const u = -0.86 + (i / 6) * 1.72;
    const px = x + u * r;
    const drop = r * (0.3 + 0.22 * (1 - Math.abs(u))) * breathe;
    g.lineBetween(px, y + 1, px + u * 2.6, y + 1 + drop);
  }

  // Two tick marks at the corners, so the seam has ends rather than fading out.
  g.lineStyle(1.6, tint(PSY.violetLit), alpha * 0.75);
  for (const s of [-1, 1]) {
    g.lineBetween(x + s * r * 0.96, y - 2.6, x + s * r * 1.16, y);
    g.lineBetween(x + s * r * 0.96, y + 2.6, x + s * r * 1.16, y);
  }
}

/**
 * Utter Focus (mastery ability), on the floor under a psychic with his eyes shut.
 *
 * Three rings of a mandala turning at different rates, a rim arc that empties as the window runs
 * out, and a ring of small closed eyes facing inward — the same seam `snareRune` draws, repeated,
 * because the ability is the passive turned all the way up rather than a different idea. Drawn
 * wide (well past the body) so it is unmistakable at a glance which of the two psychics on screen
 * is the one currently five seconds ahead.
 */
export function focusMandala(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  x: number, y: number, r: number, left: number, t: number, alpha = 1,
): void {
  const k = Phaser.Math.Clamp(left, 0, 1);
  const breathe = 0.9 + 0.1 * Math.sin(t * 2.4);

  g.fillStyle(tint(PSY.robeDeep), alpha * 0.22);
  g.fillEllipse(x, y + 14, r * 2, r * 0.82);
  for (let ring = 0; ring < 3; ring++) {
    g.lineStyle(1.6 - ring * 0.4, tint(ring === 0 ? PSY.gold : PSY.violet), alpha * (0.6 - ring * 0.15) * breathe);
    g.strokeEllipse(x, y + 14, r * (2 - ring * 0.46), r * (0.82 - ring * 0.19));
  }

  // The window, as an arc emptying anticlockwise from noon.
  g.lineStyle(3.4, tint(PSY.gold), alpha * 0.9);
  g.beginPath();
  g.arc(x, y + 14, r * 0.96, -Math.PI / 2, -Math.PI / 2 - k * TAU, true);
  g.strokePath();

  // Closed eyes around the rim, turning slowly the other way to the rings.
  for (let i = 0; i < 6; i++) {
    const a = -t * 0.5 + (i / 6) * TAU;
    snareRune(g, tint, x + Math.cos(a) * r * 0.82, y + 14 + Math.sin(a) * r * 0.34,
      5.4, alpha * 0.75, t + i, 1);
  }

  // Spokes marching inward: thought being pulled in rather than sent out.
  g.lineStyle(1, tint(PSY.violetLit), alpha * 0.45);
  for (let i = 0; i < 12; i++) {
    const a = t * 0.9 + (i / 12) * TAU;
    const inner = r * (0.3 + 0.12 * Math.sin(t * 3 + i));
    g.lineBetween(x + Math.cos(a) * inner, y + 14 + Math.sin(a) * inner * 0.4,
      x + Math.cos(a) * r * 0.66, y + 14 + Math.sin(a) * r * 0.27);
  }
}

/**
 * A coma: a slow spiral collapsing into the body, with the three rings of a mandala around it.
 * Drawn under the victim so it never covers the health bar the player is watching drain.
 */
export function comaSwirl(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  x: number, y: number, r: number, alpha: number, t: number,
): void {
  g.fillStyle(tint(PSY.robeDeep), alpha * 0.3);
  g.fillEllipse(x, y + 14, r * 2.1, r * 0.8);
  for (let ring = 0; ring < 3; ring++) {
    g.lineStyle(1.4 - ring * 0.3, tint(PSY.violet), alpha * (0.7 - ring * 0.18));
    g.strokeEllipse(x, y + 14, r * (1.9 - ring * 0.5), r * (0.72 - ring * 0.19));
  }
  // The spiral: 2.5 turns falling inward, rotating slowly.
  g.lineStyle(1.6, tint(PSY.violetLit), alpha * 0.8);
  g.beginPath();
  for (let i = 0; i <= 60; i++) {
    const u = i / 60;
    const a = t * 0.9 + u * TAU * 2.5;
    const rr = r * (1 - u) * 0.95;
    const px = x + Math.cos(a) * rr;
    const py = y + 14 + Math.sin(a) * rr * 0.38;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
}

// ── Chess ─────────────────────────────────────────────────────────────────

/** The five pieces the kit can put on the board. The queen is only ever the psychic himself. */
export type ChessKind = 'pawn' | 'bishop' | 'knight' | 'rook' | 'queen';

/**
 * The board's two colours, which here are the two *owners* rather than two players' sets: the
 * local side's pieces are carved out of light (aether bodies, violet rims) and the other side's
 * out of ink (deep bodies, lit rims). In a mirror match that is the only way to tell whose bishop
 * is whose at a glance, and it is the oldest convention in the game being borrowed for it.
 */
export type ChessSide = 'white' | 'black';

function pieceColors(tint: PsychicColorFn, side: ChessSide): { body: number; shade: number; rim: number } {
  return side === 'white'
    ? { body: tint(PSY.aether), shade: tint(PSY.violetLit), rim: tint(PSY.robe) }
    : { body: tint(PSY.robeDeep), shade: tint(PSY.ink), rim: tint(PSY.violetLit) };
}

function poly(pts: [number, number][], x: number, y: number, s: number, flip = 1): Phaser.Geom.Point[] {
  return pts.map(([px, py]) => new Phaser.Geom.Point(x + px * s * flip, y + py * s));
}

/**
 * A chess piece standing on the arena, drawn as a carved Staunton silhouette with a lit rim and
 * a soft shadow. `x, y` is where it touches the floor's centre of mass (its hitbox), and the
 * piece rises out of that point. `s` is a scale (1 ≈ a 40px tall piece), `face` flips the
 * knight's head to look the way it will move, and `lift` raises the whole thing off its shadow
 * for a knight in mid-leap.
 */
export function chessPiece(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  kind: ChessKind, side: ChessSide,
  x: number, y: number, s: number, alpha: number,
  { face = 1, lift = 0, glow = 0.5 } = {},
): void {
  const c = pieceColors(tint, side);
  // The shadow stays on the floor while the piece leaves it.
  const sh = Math.max(0.35, 1 - lift / 90);
  g.fillStyle(tint(PSY.ink), alpha * 0.45 * sh);
  g.fillEllipse(x, y + 14 * s, 30 * s * sh, 9 * s * sh);
  const by = y - lift;
  if (glow > 0) {
    g.fillStyle(tint(side === 'white' ? PSY.violetLit : PSY.violet), alpha * 0.16 * glow);
    g.fillCircle(x, by - 2 * s, 24 * s);
  }

  const fillOutline = (pts: Phaser.Geom.Point[], body = c.body): void => {
    g.fillStyle(body, alpha);
    g.fillPoints(pts, true);
    g.lineStyle(1.4, c.rim, alpha * 0.95);
    g.strokePoints(pts, true);
  };
  const ellipse = (ex: number, ey: number, w: number, h: number, body = c.body): void => {
    g.fillStyle(body, alpha);
    g.fillEllipse(x + ex * s, by + ey * s, w * s, h * s);
    g.lineStyle(1.3, c.rim, alpha * 0.95);
    g.strokeEllipse(x + ex * s, by + ey * s, w * s, h * s);
  };

  // Every piece stands on the same turned foot: a wide disc and a plinth over it.
  ellipse(0, 12, 28, 8, c.shade);
  fillOutline(poly([[-12, 12], [12, 12], [10, 7], [-10, 7]], x, by, s), c.shade);
  ellipse(0, 7, 22, 5);

  switch (kind) {
    case 'pawn': {
      fillOutline(poly([[-8, 7], [8, 7], [4, -3], [-4, -3]], x, by, s));
      ellipse(0, -4, 14, 4.5, c.shade);
      ellipse(0, -11, 13, 13);
      // The highlight that makes a ball read as a ball.
      g.fillStyle(tint(PSY.aether), alpha * (side === 'white' ? 0.8 : 0.35));
      g.fillCircle(x - 2.4 * s, by - 13.5 * s, 2 * s);
      break;
    }
    case 'bishop': {
      fillOutline(poly([[-8, 7], [8, 7], [4, -5], [-4, -5]], x, by, s));
      ellipse(0, -6, 16, 4.5, c.shade);
      // The mitre: a teardrop with the diagonal cut through it.
      const mitre = poly([
        [0, -27], [4, -24], [7, -19], [7.5, -14], [6, -9.5], [0, -7.5], [-6, -9.5], [-7.5, -14], [-7, -19], [-4, -24],
      ], x, by, s);
      fillOutline(mitre);
      g.lineStyle(1.8 * s, c.rim, alpha);
      g.lineBetween(x - 1 * s, by - 13 * s, x + 6 * s, by - 21 * s);
      g.fillStyle(c.body, alpha);
      g.fillCircle(x, by - 29 * s, 2.6 * s);
      g.lineStyle(1.1, c.rim, alpha);
      g.strokeCircle(x, by - 29 * s, 2.6 * s);
      break;
    }
    case 'knight': {
      fillOutline(poly([[-10, 7], [10, 7], [9, 1], [-9, 1]], x, by, s), c.shade);
      // The horse's head and neck in profile, looking the way `face` says.
      const head = poly([
        [-9, 2], [9, 2], [8, -6], [5, -11], [8, -14], [12, -17], [11, -22], [5, -25], [0, -29], [-3, -26],
        [-7, -24], [-10, -17], [-10, -8],
      ], x, by, s, face);
      fillOutline(head);
      // Mane: a row of short strokes down the back of the neck.
      g.lineStyle(1.2, c.rim, alpha * 0.85);
      for (let i = 0; i < 4; i++) {
        const my = by + (-24 + i * 5) * s;
        const mx = x + (-6 - (i % 2)) * s * face;
        g.lineBetween(mx, my, mx - 3 * s * face, my + 2 * s);
      }
      // Eye and nostril.
      g.fillStyle(side === 'white' ? tint(PSY.ink) : tint(PSY.gold), alpha);
      g.fillCircle(x + 3 * s * face, by - 21 * s, 1.5 * s);
      g.fillCircle(x + 10 * s * face, by - 18 * s, 0.9 * s);
      break;
    }
    case 'rook': {
      fillOutline(poly([[-8, 7], [8, 7], [7, -13], [-7, -13]], x, by, s));
      // Courses of stone.
      g.lineStyle(1, c.rim, alpha * 0.45);
      for (let i = 0; i < 3; i++) g.lineBetween(x - 7 * s, by + (2 - i * 5) * s, x + 7 * s, by + (2 - i * 5) * s);
      // The battlement, three merlons wide.
      fillOutline(poly([
        [-10, -13], [10, -13], [10, -23], [6, -23], [6, -19], [2, -19], [2, -23], [-2, -23], [-2, -19],
        [-6, -19], [-6, -23], [-10, -23],
      ], x, by, s), c.shade);
      break;
    }
    case 'queen': {
      fillOutline(poly([[-9, 7], [9, 7], [4, -8], [-4, -8]], x, by, s));
      ellipse(0, -9, 17, 5, c.shade);
      // The coronet: five points with a pearl on each and one over the centre.
      const crown = poly([
        [-8, -10], [8, -10], [10, -22], [5, -16], [2.5, -25], [0, -17], [-2.5, -25], [-5, -16], [-10, -22],
      ], x, by, s);
      fillOutline(crown);
      g.fillStyle(tint(PSY.gold), alpha);
      for (const [px, py] of [[10, -23], [2.5, -26], [-2.5, -26], [-10, -23]] as [number, number][]) {
        g.fillCircle(x + px * s, by + py * s, 1.8 * s);
      }
      g.fillCircle(x, by - 29 * s, 2.6 * s);
      break;
    }
  }
}

/**
 * The bishop's aura: heavenly light. A pool of warm white on the floor with a soft golden rim,
 * and shafts of light falling into it from above, so that standing in it reads as standing in
 * a cathedral window rather than in a circle. Motes drift *down* through the shafts — light
 * being given, where every other aura in the kit rises.
 */
export function heavenlyAura(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  x: number, y: number, r: number, alpha: number, t: number, seed: number,
): void {
  const breathe = 1 + Math.sin(t * 1.6 + seed) * 0.03;
  for (let i = 4; i >= 1; i--) {
    g.fillStyle(tint(i > 2 ? PSY.gold : 0xfff6dd), alpha * 0.05 * i);
    g.fillEllipse(x, y, r * 2 * breathe * (i / 4), r * 1.3 * breathe * (i / 4));
  }
  g.lineStyle(1.6, tint(PSY.gold), alpha * 0.55);
  g.strokeEllipse(x, y, r * 2 * breathe, r * 1.3 * breathe);
  // Shafts falling from above into the pool.
  for (let i = 0; i < 5; i++) {
    const k = jitter(seed, i);
    const sx = x + (k - 0.5) * r * 1.4;
    const w = 8 + jitter(seed, i + 9) * 10;
    const a = alpha * (0.09 + 0.06 * Math.sin(t * 1.3 + i * 1.7 + seed));
    g.fillStyle(tint(0xfff3cc), a);
    g.fillPoints([
      new Phaser.Geom.Point(sx - w * 0.3 - 6, y - r * 1.15),
      new Phaser.Geom.Point(sx + w * 0.3 - 6, y - r * 1.15),
      new Phaser.Geom.Point(sx + w, y + r * 0.35),
      new Phaser.Geom.Point(sx - w, y + r * 0.35),
    ], true);
  }
  for (let i = 0; i < 8; i++) {
    const ph = (t * 0.35 + jitter(seed, 20 + i)) % 1;
    const mx = x + (jitter(seed, 30 + i) - 0.5) * r * 1.5;
    const my = y - r * 0.9 + ph * r * 1.2;
    g.fillStyle(tint(0xfff6dd), alpha * 0.7 * Math.sin(ph * Math.PI));
    g.fillCircle(mx, my, 1.6);
  }
}

/**
 * The knight's aura: a galloping wind. Three crescent strokes chase each other around the rim at
 * a canter's rhythm, with speed lines trailing off them — it is the only aura in the kit that
 * moves *around* the circle rather than in or out of it, because it is the only one about moving.
 */
export function strideAura(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  x: number, y: number, r: number, alpha: number, t: number,
): void {
  g.fillStyle(tint(PSY.violet), alpha * 0.08);
  g.fillEllipse(x, y, r * 2, r * 1.3);
  g.lineStyle(1.2, tint(PSY.violetLit), alpha * 0.4);
  g.strokeEllipse(x, y, r * 2, r * 1.3);
  const spin = t * 2.6;
  for (let i = 0; i < 3; i++) {
    const a0 = spin + (i / 3) * TAU;
    const pts: Phaser.Geom.Point[] = [];
    for (let k = 0; k <= 10; k++) {
      const a = a0 + k * 0.09;
      const rr = r * (0.82 + 0.1 * (k / 10));
      pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.65));
    }
    g.lineStyle(2.6, tint(PSY.violetLit), alpha * 0.75);
    g.strokePoints(pts, false);
    // Speed lines peeling off the tail.
    g.lineStyle(1, tint(PSY.aether), alpha * 0.45);
    for (let k = 0; k < 3; k++) {
      const a = a0 - 0.12 - k * 0.1;
      const rr = r * (0.7 + k * 0.08);
      g.lineBetween(
        x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.65,
        x + Math.cos(a - 0.22) * rr, y + Math.sin(a - 0.22) * rr * 0.65,
      );
    }
  }
}

/**
 * The rook's aura: a war-banner red ring with a battlement cut into it, the merlons pulsing in
 * turn like a drumbeat. Red was the stress colour; with stress gone it is the kit's one warm
 * alarm, and it now means exactly one thing — more damage.
 */
export function mightAura(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  x: number, y: number, r: number, alpha: number, t: number,
): void {
  g.fillStyle(tint(PSY.stress), alpha * 0.07);
  g.fillEllipse(x, y, r * 2, r * 1.3);
  g.lineStyle(1.8, tint(PSY.stress), alpha * 0.6);
  g.strokeEllipse(x, y, r * 2, r * 1.3);
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const beat = 0.5 + 0.5 * Math.sin(t * 5 - i * 0.9);
    const cx = x + Math.cos(a) * r;
    const cy = y + Math.sin(a) * r * 0.65;
    g.fillStyle(tint(i % 2 ? PSY.stressDeep : PSY.stress), alpha * (0.45 + 0.45 * beat));
    g.fillRect(cx - 3.5, cy - 3.5, 7, 7);
  }
  // Chevrons pointing in at the piece: the damage is coming *from* the tower.
  g.lineStyle(1.4, tint(PSY.stress), alpha * 0.4);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const k = ((t * 0.8 + i * 0.25) % 1);
    const d = r * (0.85 - k * 0.45);
    const cx = x + Math.cos(a) * d;
    const cy = y + Math.sin(a) * d * 0.65;
    const back = a + Math.PI;
    g.lineBetween(cx, cy, cx + Math.cos(back + 0.5) * 7, cy + Math.sin(back + 0.5) * 7 * 0.65);
    g.lineBetween(cx, cy, cx + Math.cos(back - 0.5) * 7, cy + Math.sin(back - 0.5) * 7 * 0.65);
  }
}

/**
 * Where a selected piece will go if you click now: a dotted lane along the move and a ring
 * where it will stop. Gold when the move would pass through (or land on) an enemy, so the
 * player can see the hit before committing to it.
 */
export function moveGuide(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  fx: number, fy: number, tx: number, ty: number,
  leap: boolean, hot: boolean, alpha: number, t: number, blastR = 0,
): void {
  const col = tint(hot ? PSY.gold : PSY.violetLit);
  const d = Phaser.Math.Distance.Between(fx, fy, tx, ty);
  if (d > 4) {
    const a = Math.atan2(ty - fy, tx - fx);
    if (leap) {
      // A knight does not travel the lane — it jumps it, so the guide is an arc.
      const pts: Phaser.Geom.Point[] = [];
      for (let i = 0; i <= 16; i++) {
        const k = i / 16;
        pts.push(new Phaser.Geom.Point(fx + (tx - fx) * k, fy + (ty - fy) * k - Math.sin(k * Math.PI) * d * 0.3));
      }
      g.lineStyle(1.6, col, alpha * 0.7);
      for (let i = 0; i < pts.length - 1; i += 2) g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    } else {
      const off = (t * 40) % 14;
      g.lineStyle(2, col, alpha * 0.75);
      for (let s = off; s < d - 4; s += 14) {
        const e = Math.min(d, s + 7);
        g.lineBetween(fx + Math.cos(a) * s, fy + Math.sin(a) * s, fx + Math.cos(a) * e, fy + Math.sin(a) * e);
      }
    }
  }
  g.lineStyle(2, col, alpha * 0.9);
  g.strokeCircle(tx, ty, 13 + Math.sin(t * 6) * 1.5);
  if (blastR > 0) {
    g.lineStyle(1.2, col, alpha * 0.4);
    g.strokeCircle(tx, ty, blastR);
  }
}

/**
 * One card in the vertical queue over the psychic's head: a notched plate, a key badge on the
 * left and a fuse along the bottom that empties as the ability gets closer to happening. `next`
 * is the bottom card — the one that goes off first — and is drawn bigger, brighter and gold.
 * The legends are pooled Text objects laid over this by the kit.
 */
export function queueCard(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  x: number, y: number, w: number, h: number, alpha: number, left: number, next: boolean, big: boolean,
): void {
  // A carved tile off the board: drop shadow, ebony notched plate, a faint checker carved into
  // the face, an ivory inlay line, and gold corner pins on the card that goes off next.
  g.fillStyle(0x000000, alpha * 0.35);
  g.fillRect(x - w / 2 + 2, y - h / 2 + 2, w, h);
  keyChip(g, tint, x, y, w, h, alpha, next ? 0.85 : 0.25);
  const sq = h / 4;
  g.fillStyle(tint(PSY.robe), alpha * 0.22);
  for (let cx = 0; cx * sq < w - h - 6; cx++) {
    for (let cy = 0; cy < 4; cy++) {
      if ((cx + cy) % 2 === 0) continue;
      g.fillRect(x - w / 2 + h + cx * sq, y - h / 2 + cy * sq, sq, sq);
    }
  }
  g.lineStyle(0.8, tint(next ? PSY.gold : PSY.aether), alpha * (next ? 0.55 : 0.25));
  g.strokeRect(x - w / 2 + 2.5, y - h / 2 + 2.5, w - 5, h - 5);

  // The key badge: a little ivory (or gold) square carved with a bevel.
  const bw = h - 4;
  const bx = x - w / 2 + 3, by = y - h / 2 + 2;
  g.fillStyle(tint(big ? PSY.goldDeep : next ? PSY.skinShade : PSY.robeDeep), alpha * (next ? 0.95 : 0.7));
  g.fillRect(bx, by, bw, h - 4);
  g.fillStyle(tint(big ? PSY.gold : next ? PSY.violet : PSY.robe), alpha * (next ? 0.95 : 0.7));
  g.fillRect(bx, by, bw - 1.5, h - 5.5);
  g.fillStyle(tint(PSY.aether), alpha * (next ? 0.4 : 0.15));
  g.fillRect(bx, by, bw - 1.5, 1.2);

  // The fuse: a gold thread burning down, with a spark at its head.
  const fw = (w - bw - 10) * Phaser.Math.Clamp(left, 0, 1);
  const fx = bx + bw + 3, fy = y + h / 2 - 3;
  g.fillStyle(tint(PSY.ink), alpha * 0.8);
  g.fillRect(fx, fy, w - bw - 10, 2);
  g.fillStyle(tint(next ? PSY.gold : PSY.violetLit), alpha * 0.95);
  g.fillRect(fx, fy, fw, 2);
  if (next && fw > 1) {
    g.fillStyle(tint(PSY.gold), alpha * 0.35);
    g.fillCircle(fx + fw, fy + 1, 3.4);
    g.fillStyle(tint(0xfff6dd), alpha);
    g.fillCircle(fx + fw, fy + 1, 1.3);
  }
  if (next) {
    g.fillStyle(tint(PSY.gold), alpha);
    for (const [cx, cy] of [[x - w / 2 + 1.5, y - h / 2 + 1.5], [x + w / 2 - 1.5, y - h / 2 + 1.5],
      [x - w / 2 + 1.5, y + h / 2 - 1.5], [x + w / 2 - 1.5, y + h / 2 - 1.5]] as [number, number][]) {
      g.fillCircle(cx, cy, 1.4);
    }
  }
}

/** The crown that hangs over a psychic who has become the queen. */
export function queenCrown(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  x: number, y: number, s: number, alpha: number, t: number,
): void {
  const bob = Math.sin(t * 2.4) * 1.5;
  const cy = y + bob;
  g.fillStyle(tint(PSY.gold), alpha * 0.18);
  g.fillCircle(x, cy - 4 * s, 16 * s);
  const pts = poly([
    [-11, 3], [11, 3], [13, -9], [6, -3], [3, -12], [0, -4], [-3, -12], [-6, -3], [-13, -9],
  ], x, cy, s);
  g.fillStyle(tint(PSY.gold), alpha);
  g.fillPoints(pts, true);
  g.lineStyle(1.3, tint(PSY.goldDeep), alpha);
  g.strokePoints(pts, true);
  g.fillStyle(tint(0xfff6dd), alpha);
  for (const [px, py] of [[13, -10], [3, -13], [-3, -13], [-13, -10]] as [number, number][]) {
    g.fillCircle(x + px * s, cy + py * s, 1.8 * s);
  }
  g.fillStyle(tint(PSY.stress), alpha);
  g.fillCircle(x, cy - 1 * s, 2 * s);
}

/**
 * Sight Lines (E upgrade): one square of the diagonal a bishop has just travelled, lit. It is a
 * real board square — axis-aligned, so a line of them corner-to-corner *is* a chess diagonal —
 * filled with the bishop's warm light, a gold rim, a bevel of ivory on the top-left and ink on
 * the bottom-right so it reads as set into the floor, and the bishop's mitre-cross cut into the
 * middle. `alpha` carries both the fade-in and the fade-out.
 */
export function sightSquare(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  x: number, y: number, size: number, alpha: number, t: number, seed: number,
): void {
  const h = size / 2;
  const pulse = 0.75 + 0.25 * Math.sin(t * 3.2 + seed);
  // Bloom: the light spills a little past the square's edge.
  g.fillStyle(tint(PSY.gold), alpha * 0.12 * pulse);
  g.fillRect(x - h - 5, y - h - 5, size + 10, size + 10);
  g.fillStyle(tint(0xfff3cc), alpha * 0.26 * pulse);
  g.fillRect(x - h, y - h, size, size);
  // Inner square: the lit core of the tile.
  g.fillStyle(tint(0xfff6dd), alpha * 0.22);
  g.fillRect(x - h + 5, y - h + 5, size - 10, size - 10);
  // Bevel — ivory catches the light on two sides, ink on the other two.
  g.lineStyle(1.4, tint(PSY.aether), alpha * 0.7);
  g.lineBetween(x - h, y + h, x - h, y - h);
  g.lineBetween(x - h, y - h, x + h, y - h);
  g.lineStyle(1.4, tint(PSY.goldDeep), alpha * 0.75);
  g.lineBetween(x + h, y - h, x + h, y + h);
  g.lineBetween(x + h, y + h, x - h, y + h);
  g.lineStyle(1, tint(PSY.gold), alpha * 0.85 * pulse);
  g.strokeRect(x - h + 2.5, y - h + 2.5, size - 5, size - 5);
  // The mitre cross.
  g.lineStyle(2, tint(PSY.gold), alpha * 0.9);
  g.lineBetween(x, y - h * 0.45, x, y + h * 0.45);
  g.lineBetween(x - h * 0.3, y - h * 0.12, x + h * 0.3, y - h * 0.12);
  // A mote of light drifting down through the square, like the aura's.
  const ph = (t * 0.6 + jitter(seed, 3)) % 1;
  g.fillStyle(tint(0xfff6dd), alpha * 0.8 * Math.sin(ph * Math.PI));
  g.fillCircle(x + (jitter(seed, 4) - 0.5) * size * 0.6, y - h + ph * size, 1.5);
}

/**
 * Mount Protect (R upgrade): the psychic in the saddle. A gold ward round the rider — a lit
 * shell with a horseshoe of studs turning on it — so the invulnerable leap reads at a glance.
 */
export function rideWard(
  g: Phaser.GameObjects.Graphics,
  tint: PsychicColorFn,
  x: number, y: number, alpha: number, t: number,
): void {
  const r = 28 + Math.sin(t * 9) * 1.5;
  g.fillStyle(tint(PSY.gold), alpha * 0.14);
  g.fillCircle(x, y, r + 6);
  g.fillStyle(tint(0xfff3cc), alpha * 0.12);
  g.fillCircle(x, y, r);
  g.lineStyle(2.2, tint(PSY.gold), alpha * 0.9);
  g.strokeCircle(x, y, r);
  g.lineStyle(1, tint(PSY.aether), alpha * 0.6);
  g.strokeCircle(x, y, r - 4);
  // The horseshoe: an open arc of studs, spinning.
  const spin = t * 4;
  for (let i = 0; i < 7; i++) {
    const a = spin + (i / 9) * TAU;
    g.fillStyle(tint(i % 2 ? PSY.aether : PSY.gold), alpha);
    g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r, 2.2);
  }
}

// ── Fx ────────────────────────────────────────────────────────────────────

/** Psychic's one-shot effects. Everything sustained is painted per-frame by the kit instead. */
export class PsychicFx extends FxBase {
  /** The whip landing: a burst of thin violet spokes and a shock ring at the contact point. */
  crack(x: number, y: number, ang: number, tip: boolean, depth = 11): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, tip ? 20 : 13, PSY.aether, tip ? PSY.stress : PSY.violet, depth);
    this.anim(depth, tip ? 380 : 260, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(2.6 * (1 - t) + 0.5, this.tint(tip ? PSY.stress : PSY.violetLit), (1 - t) * 0.9);
      for (let i = 0; i < (tip ? 9 : 6); i++) {
        const a = ang + Math.PI + (jitter(seed, i) - 0.5) * 2.4;
        const l = (16 + jitter(seed, 10 + i) * 22) * e;
        g.lineBetween(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
      }
      g.lineStyle(2 * (1 - t), this.tint(PSY.aether), (1 - t) * 0.7);
      g.strokeCircle(x, y, 8 + e * (tip ? 30 : 18));
    });
  }

  /** Mind Control: a sigil clamps shut over the victim and drags a thread back to the caster. */
  seize(x: number, y: number, fromX: number, fromY: number, depth = 16): void {
    this.anim(depth, 520, (g, t) => {
      const e = easeOut(t);
      mindSigil(g, this.tint, x, y - 36, 22 * (0.5 + e * 0.7), (1 - t) * 0.95,
        { phase: t * 5, sides: 7, color: PSY.gold });
      // The stolen thing being reeled in.
      const px = x + (fromX - x) * e;
      const py = (y - 36) + (fromY - (y - 36)) * e;
      g.lineStyle(1.6, this.tint(PSY.gold), (1 - t) * 0.7);
      g.lineBetween(x, y - 36, px, py);
      g.fillStyle(this.tint(PSY.gold), (1 - t) * 0.9);
      g.fillCircle(px, py, 4 * (1 - t) + 1.5);
    });
  }

  /** Dodge Destiny: a shell of concentric eyes closing around the caster. */
  veil(x: number, y: number, ms: number, depth = 16): void {
    this.anim(depth, ms, (g, t) => {
      const puls = 0.7 + 0.3 * Math.sin(t * 26);
      g.lineStyle(2.2, this.tint(PSY.gold), (1 - easeIn(t)) * 0.85 * puls);
      g.strokeCircle(x, y, 34);
      g.lineStyle(1.2, this.tint(PSY.violetLit), (1 - easeIn(t)) * 0.6);
      g.strokeCircle(x, y, 44 - t * 8);
      for (let i = 0; i < 6; i++) {
        const a = t * 2.4 + (i / 6) * TAU;
        thirdEye(g, this.tint, x + Math.cos(a) * 34, y + Math.sin(a) * 34, 5,
          1 - t * 0.5, (1 - easeIn(t)) * 0.9, { glow: 0.5, lash: false });
      }
    });
  }

  /** A migraine charge going down: a sigil stamped onto the floor, settling as it lands. */
  plant(x: number, y: number, r: number, depth = 4): void {
    this.anim(depth, 360, (g, t) => {
      const e = easeOut(t);
      mindSigil(g, this.tint, x, y, r * (1.5 - e * 0.6), (1 - t) * 0.9,
        { phase: t * 4, sides: 7, color: PSY.violetLit, eye: false });
    });
  }

  /**
   * A charge going off: the blast edge thrown out as a ring of eyes opening on the way and
   * shutting as they reach the rim, so the reach of the thing is legible for exactly as long
   * as it matters and then gone.
   */
  detonation(x: number, y: number, r: number, depth = 5): void {
    this.flashIn(x, y, r * 0.5, PSY.aether, PSY.stress, depth);
    this.anim(depth, 480, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(4 * (1 - t) + 1, this.tint(PSY.stress), (1 - t) * 0.9);
      g.strokeCircle(x, y, r * e);
      g.lineStyle(1.6, this.tint(PSY.violetLit), (1 - t) * 0.55);
      g.strokeCircle(x, y, r * e * 1.16);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.2;
        const d = r * e;
        thirdEye(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d,
          6 * (1 - t) + 2.5, 1 - t, (1 - t) * 0.85,
          { iris: PSY.stress, lash: false, glow: 0.4 });
      }
    });
  }

  /** Migraine landing: the victim's head splitting, as expanding off-axis rings. */
  throb(x: number, y: number, depth = 16): void {
    this.anim(depth, 620, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 3; i++) {
        const k = Phaser.Math.Clamp(t * 3 - i * 0.5, 0, 1);
        if (k <= 0) continue;
        g.lineStyle(3 * (1 - k) + 0.6, this.tint(PSY.stress), (1 - k) * 0.7);
        g.strokeEllipse(x, y - 10, (18 + i * 10) * (0.4 + k), (26 + i * 12) * (0.4 + k));
      }
      g.lineStyle(1.4, this.tint(PSY.violetLit), (1 - t) * 0.8);
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.42;
        g.lineBetween(x, y - 16, x + Math.cos(a) * 30 * e, y - 16 + Math.sin(a) * 30 * e);
      }
    });
  }

  /** Stress going off: a red implosion followed by the shell blowing out through it. */
  burst(x: number, y: number, load: number, depth = 16): void {
    const seed = Math.random() * 999;
    const r = 26 + load * 40;
    this.flashIn(x, y, r * 0.6, PSY.aether, PSY.stress, depth);
    this.anim(depth, 560, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(5 * (1 - t) + 1, this.tint(PSY.stress), (1 - t) * 0.85);
      g.strokeCircle(x, y, r * e);
      g.lineStyle(2 * (1 - t) + 0.5, this.tint(PSY.stressDeep), (1 - t) * 0.6);
      g.strokeCircle(x, y, r * e * 1.35);
      for (let i = 0; i < 12; i++) {
        const a = jitter(seed, i) * TAU;
        const d = r * e * (0.6 + jitter(seed, 20 + i) * 0.7);
        g.lineStyle(2.2 * (1 - t), this.tint(PSY.stress), (1 - t) * 0.9);
        g.lineBetween(
          x + Math.cos(a) * d * 0.5, y + Math.sin(a) * d * 0.5,
          x + Math.cos(a) * d, y + Math.sin(a) * d,
        );
      }
    });
  }

  /** Falling into a coma: the eye on the victim closing, and the world folding in on it. */
  sleep(x: number, y: number, depth = 16): void {
    this.anim(depth, 800, (g, t) => {
      thirdEye(g, this.tint, x, y - 30, 16 * (1 + t * 0.4), 1 - easeIn(t), (1 - t * 0.5) * 0.95,
        { iris: PSY.violetLit, glow: 1.4 });
      const e = easeOut(t);
      g.lineStyle(2.4 * (1 - t), this.tint(PSY.violet), (1 - t) * 0.7);
      g.strokeCircle(x, y, 70 * (1 - e * 0.8) + 12);
    });
  }

  /**
   * Whip Snap (Click+): the cord closes on the ghost at the end of the route and the body it was
   * predicting arrives to fill it. The ghost is drawn shutting rather than fading, because the
   * point of the upgrade is that the prediction stopped being a prediction.
   */
  snap(fromX: number, fromY: number, toX: number, toY: number, depth = 16): void {
    this.flashIn(toX, toY, 22, PSY.aether, PSY.gold, depth);
    this.anim(depth, 460, (g, t) => {
      snapLine(g, this.tint, fromX, fromY, toX, toY, 1 - easeIn(t), (t * 2.2) % 1);
      const e = easeOut(t);
      // The ghost's eye, shutting as the real body lands in it.
      thirdEye(g, this.tint, toX, toY - 6, 8 + e * 4, 1 - t, (1 - t) * 0.95,
        { iris: PSY.gold, lash: false, glow: 0.7 });
      g.lineStyle(2 * (1 - t), this.tint(PSY.violetLit), (1 - t) * 0.7);
      g.strokeEllipse(toX, toY + 4, 22 + e * 10, 30 + e * 12);
    });
  }

  /**
   * Cycle of Abuse (Q+): a point of stress coming out of a comatose body sideways.
   *
   * Exactly the crack figure the pool is drawn with, thrown out to `r` and left as a rim — the
   * shockwave has to be recognisable as *the stress*, since the whole upgrade is stress leaving
   * one body and landing on everything around it.
   */
  bleedBurst(x: number, y: number, r: number, depth = 15): void {
    const seed = Math.random() * 999;
    this.anim(depth, 520, (g, t) => {
      const e = easeOut(t);
      // The cracks, at ten times the size they are drawn on a body.
      for (let i = 0; i < 10; i++) {
        const a = jitter(seed, i) * TAU;
        let px = x + Math.cos(a) * 8;
        let py = y + Math.sin(a) * 8;
        let ca = a;
        g.lineStyle(4.5 * (1 - t) + 0.8, this.tint(PSY.stressDeep), (1 - t) * 0.5);
        g.lineBetween(px, py, x + Math.cos(a) * r * e, y + Math.sin(a) * r * e);
        g.lineStyle(2.2 * (1 - t) + 0.5, this.tint(PSY.stress), (1 - t) * 0.9);
        for (let k = 0; k < 3; k++) {
          ca += (jitter(seed, 40 + i * 3 + k) - 0.5) * 0.8;
          const nx = px + Math.cos(ca) * (r * e / 3);
          const ny = py + Math.sin(ca) * (r * e / 3);
          g.lineBetween(px, py, nx, ny);
          px = nx; py = ny;
        }
      }
      g.lineStyle(3 * (1 - t) + 0.6, this.tint(PSY.stress), (1 - t) * 0.8);
      g.strokeCircle(x, y, r * e);
    });
  }

  /**
   * Predictor's Snare (mastery passive): arriving on the marker.
   *
   * The ghost that was standing there is *replaced* rather than dispersed, so the figure shuts
   * as the body lands in it and the rune is stamped underneath in the same beat — the whole point
   * of the passive is that the prediction and the arrival are the same event.
   */
  snare(fromX: number, fromY: number, toX: number, toY: number, depth = 16): void {
    this.flashIn(toX, toY, 20, PSY.aether, PSY.violetLit, depth);
    this.anim(depth, 440, (g, t) => {
      const e = easeOut(t);
      // The thread the body travelled, drawn once and left behind.
      g.lineStyle(4 * (1 - t) + 0.6, this.tint(PSY.robeDeep), (1 - t) * 0.4);
      g.lineBetween(fromX, fromY, toX, toY);
      g.lineStyle(1.4, this.tint(PSY.violetLit), (1 - t) * 0.75);
      g.lineBetween(fromX, fromY, toX, toY);
      // The ghost's own eye shutting as he takes its place.
      thirdEye(g, this.tint, toX, toY - 6, 9 + e * 5, 1 - t, (1 - t) * 0.9,
        { iris: PSY.gold, lash: false, glow: 0.6 });
      g.lineStyle(2.2 * (1 - t), this.tint(PSY.gold), (1 - t) * 0.7);
      g.strokeEllipse(toX, toY + 8, (26 + e * 22), (10 + e * 9));
    });
  }

  /** The rune catching somebody: the seam snapping open, once, straight into their feet. */
  snareTrip(x: number, y: number, depth = 15): void {
    this.flashIn(x, y, 16, PSY.aether, PSY.stress, depth);
    this.anim(depth, 480, (g, t) => {
      const e = easeOut(t);
      // Open on the way out, shut on the way back: a blink rather than a fade.
      const open = t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65;
      thirdEye(g, this.tint, x, y, 13 + e * 6, open, 0.95, { iris: PSY.stress, glow: 1.1 });
      g.lineStyle(2.6 * (1 - t) + 0.5, this.tint(PSY.stress), (1 - t) * 0.8);
      g.strokeEllipse(x, y, (22 + e * 40), (9 + e * 16));
    });
  }

  /**
   * Utter Focus (mastery ability) opening: everything on screen pulled *into* him.
   *
   * The rings travel inward rather than out, which is the whole tell — every other burst in this
   * kit is something leaving the caster, and this one is the man closing his eyes and taking the
   * next five seconds in.
   */
  focus(x: number, y: number, depth = 16): void {
    this.anim(depth, 780, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 3; i++) {
        const k = Phaser.Math.Clamp(t * 2 - i * 0.28, 0, 1);
        if (k <= 0) continue;
        g.lineStyle(3 * (1 - k) + 0.8, this.tint(i === 0 ? PSY.gold : PSY.violetLit), (1 - k) * 0.8);
        g.strokeCircle(x, y, 130 * (1 - k) + 22);
      }
      // Six eyes closing as they arrive at him.
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU - t * 1.1;
        const d = 96 * (1 - e) + 30;
        thirdEye(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d,
          7, 1 - easeIn(t), (1 - t) * 0.9, { iris: PSY.gold, lash: false, glow: 0.5 });
      }
      mindSigil(g, this.tint, x, y - 30, 14 + e * 8, (1 - t) * 0.85,
        { phase: t * 5, sides: 7, color: PSY.gold, eye: false });
    });
  }

  // ── Chess ──

  /** A piece arriving: a light-column dropped onto the square, and a ring stamped round it. */
  summonPiece(x: number, y: number, holy = false, depth = 15): void {
    this.flashIn(x, y - 8, 16, PSY.aether, holy ? PSY.gold : PSY.violet, depth);
    this.anim(depth, 420, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(holy ? 0xfff3cc : PSY.violetLit), (1 - t) * 0.35);
      g.fillRect(x - 10 * (1 - t), y - 90, 20 * (1 - t), 90);
      g.lineStyle(2.4 * (1 - t) + 0.6, this.tint(holy ? PSY.gold : PSY.violetLit), (1 - t) * 0.9);
      g.strokeEllipse(x, y + 10, 20 + e * 40, (20 + e * 40) * 0.5);
    });
  }

  /** A piece's slide: the lane it just cut, left as a fading streak of after-images. */
  slide(fx: number, fy: number, tx: number, ty: number, depth = 4): void {
    this.anim(depth, 360, (g, t) => {
      g.lineStyle(10 * (1 - t) + 1, this.tint(PSY.violet), (1 - t) * 0.35);
      g.lineBetween(fx, fy, tx, ty);
      g.lineStyle(2.2 * (1 - t) + 0.4, this.tint(PSY.aether), (1 - t) * 0.8);
      g.lineBetween(fx, fy, tx, ty);
    });
  }

  /** A piece passing through a body: the hit, as a gold cross-cut. */
  pieceHit(x: number, y: number, ang: number, depth = 16): void {
    this.flashIn(x, y, 14, PSY.aether, PSY.gold, depth);
    this.anim(depth, 300, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(3 * (1 - t) + 0.5, this.tint(PSY.gold), (1 - t) * 0.9);
      const l = 10 + e * 22;
      g.lineBetween(x - Math.cos(ang) * l, y - Math.sin(ang) * l, x + Math.cos(ang) * l, y + Math.sin(ang) * l);
      const p = ang + Math.PI / 2;
      g.lineBetween(x - Math.cos(p) * l * 0.5, y - Math.sin(p) * l * 0.5, x + Math.cos(p) * l * 0.5, y + Math.sin(p) * l * 0.5);
    });
  }

  /** A knight (or the queen) coming down: a checkerboard shock thrown out across the blast. */
  landing(x: number, y: number, r: number, depth = 5): void {
    this.flashIn(x, y, r * 0.45, PSY.aether, PSY.violet, depth);
    const seed = Math.random() * 999;
    this.anim(depth, 520, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(4 * (1 - t) + 1, this.tint(PSY.violetLit), (1 - t) * 0.9);
      g.strokeEllipse(x, y, r * 2 * e, r * 1.3 * e);
      // Board squares flung outward, alternating light and ink.
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + jitter(seed, i) * 0.3;
        const d = r * e * (0.55 + jitter(seed, i + 20) * 0.45);
        const sz = 7 * (1 - t) + 2;
        g.fillStyle(this.tint(i % 2 ? PSY.aether : PSY.ink), (1 - t) * 0.85);
        g.fillRect(x + Math.cos(a) * d - sz / 2, y + Math.sin(a) * d * 0.65 - sz / 2, sz, sz);
      }
    });
  }

  /** A rook taking a piece: the captured one shatters into squares that the tower drinks in. */
  capture(x: number, y: number, depth = 16): void {
    this.flashIn(x, y - 8, 18, PSY.aether, PSY.stress, depth);
    const seed = Math.random() * 999;
    this.anim(depth, 560, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + jitter(seed, i);
        const d = 34 * e * (0.5 + jitter(seed, i + 5) * 0.5);
        g.fillStyle(this.tint(i % 3 ? PSY.violetLit : PSY.stress), (1 - t) * 0.9);
        g.fillRect(x + Math.cos(a) * d - 2.5, y - 8 + Math.sin(a) * d - t * 14 - 2.5, 5, 5);
      }
      g.lineStyle(2 * (1 - t) + 0.4, this.tint(PSY.stress), (1 - t) * 0.8);
      g.strokeCircle(x, y - 8, 10 + e * 26);
    });
  }

  /** A pawn's capture: two short diagonal thrusts, forward-left and forward-right. */
  pawnStrike(x: number, y: number, ang: number, reach: number, depth = 15): void {
    this.anim(depth, 260, (g, t) => {
      const e = easeOut(t);
      for (const side of [-1, 1]) {
        const a = ang + side * Math.PI / 4;
        const ex = x + Math.cos(a) * reach * e;
        const ey = y + Math.sin(a) * reach * e;
        g.lineStyle(3 * (1 - t) + 0.6, this.tint(PSY.aether), (1 - t) * 0.95);
        g.lineBetween(x, y, ex, ey);
        g.fillStyle(this.tint(PSY.gold), (1 - t) * 0.8);
        g.fillCircle(ex, ey, 5 * (1 - t) + 1.5);
      }
    });
  }

  /** A piece's time running out: it goes back to being a thought. */
  vanish(x: number, y: number, depth = 15): void {
    this.anim(depth, 360, (g, t) => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        g.fillStyle(this.tint(PSY.violetLit), (1 - t) * 0.6);
        g.fillCircle(x + Math.cos(a) * 10 * t, y - 8 - t * 20 + Math.sin(a) * 6, 2.4 * (1 - t) + 0.4);
      }
    });
  }

  /** Becoming the queen: a crown of eight light-shafts closing round him. */
  coronation(x: number, y: number, depth = 16): void {
    this.flashIn(x, y, 26, PSY.aether, PSY.gold, depth);
    this.anim(depth, 700, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + t;
        const d = 70 * (1 - e) + 18;
        g.fillStyle(this.tint(i % 2 ? PSY.gold : 0xfff3cc), (1 - t) * 0.55);
        g.fillRect(x + Math.cos(a) * d - 3, y + Math.sin(a) * d * 0.6 - 60, 6, 60);
      }
      g.lineStyle(3 * (1 - t) + 0.6, this.tint(PSY.gold), (1 - t) * 0.9);
      g.strokeCircle(x, y, 20 + e * 50);
    });
  }

  /** Insight Move (Click upgrade): the pawn sees the empty diagonals and takes another step. */
  insight(x: number, y: number, ang: number, depth = 15): void {
    this.anim(depth, 380, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 2; i++) {
        const d = 10 + e * 26 + i * 9;
        const cx = x + Math.cos(ang) * d;
        const cy = y + Math.sin(ang) * d;
        const back = ang + Math.PI;
        g.lineStyle(2.4 * (1 - t) + 0.5, this.tint(i ? PSY.aether : PSY.gold), (1 - t) * 0.9);
        g.lineBetween(cx, cy, cx + Math.cos(back + 0.6) * 8, cy + Math.sin(back + 0.6) * 8);
        g.lineBetween(cx, cy, cx + Math.cos(back - 0.6) * 8, cy + Math.sin(back - 0.6) * 8);
      }
      // A blink of the eye over the pawn.
      g.lineStyle(1.4, this.tint(PSY.gold), (1 - t) * 0.8);
      g.strokeEllipse(x, y - 22, 12, 6 * (1 - e) + 1);
    });
  }

  /**
   * Castle (F upgrade): king and rook trading squares. Two streaks crossing in opposite
   * directions, a battlement stamped where the rook comes down, and the slam's ring.
   */
  castle(kx: number, ky: number, rx: number, ry: number, r: number, depth = 15): void {
    this.flashIn(rx, ry, r * 0.5, PSY.aether, PSY.stress, depth);
    this.flashIn(kx, ky, 18, PSY.aether, PSY.gold, depth);
    this.anim(depth, 560, (g, t) => {
      const e = easeOut(t);
      const nx = -(ry - ky);
      const ny = rx - kx;
      const len = Math.hypot(nx, ny) || 1;
      const ox = (nx / len) * 7;
      const oy = (ny / len) * 7;
      g.lineStyle(3 * (1 - t) + 0.5, this.tint(PSY.gold), (1 - t) * 0.85);
      g.lineBetween(rx + ox, ry + oy, kx + ox, ky + oy);
      g.lineStyle(3 * (1 - t) + 0.5, this.tint(PSY.stress), (1 - t) * 0.85);
      g.lineBetween(kx - ox, ky - oy, rx - ox, ry - oy);
      g.lineStyle(4 * (1 - t) + 1, this.tint(PSY.stress), (1 - t) * 0.9);
      g.strokeEllipse(rx, ry, r * 2 * e, r * 1.3 * e);
      // Merlons thrown up round the rim.
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        const sz = 7 * (1 - t) + 2;
        g.fillStyle(this.tint(i % 2 ? PSY.stressDeep : PSY.stress), (1 - t) * 0.9);
        g.fillRect(rx + Math.cos(a) * r * e - sz / 2, ry + Math.sin(a) * r * e * 0.65 - sz / 2 - t * 10, sz, sz);
      }
    });
  }

  /** Checkmate (Q upgrade): the king topples — a gold crown cracks in two over the body. */
  checkmate(x: number, y: number, depth = 17): void {
    this.flashIn(x, y, 30, PSY.aether, PSY.gold, depth);
    this.anim(depth, 1100, (g, t) => {
      const e = easeOut(t);
      const fall = easeIn(Math.min(1, t * 1.4));
      const cy = y - 46 - e * 8;
      // The crown's two halves, falling apart.
      for (const side of [-1, 1]) {
        const ox = side * (2 + fall * 14);
        const rot = side * fall * 0.7;
        const pts = [[-11, 3], [0, 3], [0, -4], [-3, -12], [-6, -3], [-13, -9]].map(([px, py]) => {
          // The points are the crown's left half; the right half is its mirror.
          const qx = side < 0 ? px : -px;
          const c = Math.cos(rot);
          const s = Math.sin(rot);
          return new Phaser.Geom.Point(x + ox + (qx * c - py * s) * 1.3, cy + fall * 12 + (qx * s + py * c) * 1.3);
        });
        g.fillStyle(this.tint(PSY.gold), (1 - t) * 0.95);
        g.fillPoints(pts, true);
        g.lineStyle(1.2, this.tint(PSY.goldDeep), (1 - t));
        g.strokePoints(pts, true);
      }
      // The crack between them.
      g.lineStyle(2, this.tint(PSY.stress), (1 - t) * 0.9);
      g.lineBetween(x, cy - 16, x - 3, cy - 6);
      g.lineBetween(x - 3, cy - 6, x + 2, cy + 2);
      g.lineStyle(3 * (1 - t) + 0.6, this.tint(PSY.gold), (1 - t) * 0.8);
      g.strokeCircle(x, y, 18 + e * 46);
    });
  }

  /** A thought coming apart: the shed particle behind a moving hand. */
  mote(x: number, y: number, depth = 4): void {
    const a = Math.random() * TAU;
    this.anim(depth, 420, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(PSY.violetLit), (1 - t) * 0.6);
      g.fillCircle(x + Math.cos(a) * 9 * e, y + Math.sin(a) * 9 * e - t * 8, 2.4 * (1 - t) + 0.5);
    });
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const PSYCHIC_AVATAR: AvatarSpec = {
  // Ivory hands on an ebony body: the two colours of the board, one on each half of the rig.
  hands: [
    { r: 12, color: PSY.violet, alpha: 0.26 },
    { r: 7.2, color: PSY.aether, alpha: 0.98 },
    { r: 7.2, color: PSY.robe, alpha: 0 },
    { r: 2.4, color: 0xffffff, alpha: 0.95, ox: -1.9, oy: -2.1 },
  ],
  eyeWhite: PSY.aether,
  eyePupil: PSY.ink,
  // Lighter than most: a grandmaster does not hurry, and should not smear when he moves.
  squash: { div: 18, x: 0.34, y: 0.2 },
};

/**
 * The grandmaster: a plain ebony orb (the baked `elem-psychic`) with ivory hands and one
 * accessory — a carved ivory **king's crown**, the cross-topped coronet of the chess king. Set in
 * its band as the jewel is the **third eye**, and its `open` is the element's only state tell:
 * half-lidded at rest, wide the instant he is reading something, and shut while he is focused.
 * `setFocus` drives the aperture and how hard the eye and the under-glow burn.
 *
 * The crown tops out at y-30 — the health bar covers y-38..-30 and would cut the cross off.
 *
 * Mastery gilds the crown (gold trim, a gold cross, the jewel-eye burning), stands a rayed gold
 * halo behind it, turns a ring of the board under his feet, and gives him gold eyes, wider hand
 * coronas and a gilt rim on the chest medallion.
 */
export class PsychicAvatar extends BaseAvatar {
  /** 0 = at rest, 1 = reading the future as hard as he can. Lerped. */
  private focus = 0;
  private focusTarget = 0;
  /** Third-eye aperture, driven off focus but forced shut during a dodge. */
  private lid = 0;
  private lidTarget = 0.55;

  constructor(scene: Phaser.Scene, tint: PsychicColorFn, depth = 6) {
    super(scene, tint, depth, PSYCHIC_AVATAR);
  }

  /** How hard he is concentrating, 0–1 — glow and aperture both ride this. */
  setFocus(v: number): void {
    this.focusTarget = Phaser.Math.Clamp(v, 0, 1);
    if (this.lidTarget >= 0) this.lidTarget = 0.5 + this.focusTarget * 0.5;
  }

  /** Force the third eye shut (Dodge Destiny) or let it go back to following focus. */
  setBlind(on: boolean): void {
    this.lidTarget = on ? 0 : 0.5 + this.focusTarget * 0.5;
  }

  update(delta: number, x: number, y: number, alpha: number): void {
    const k = Math.min(1, delta / 260);
    this.focus += (this.focusTarget - this.focus) * k;
    this.lid += (this.lidTarget - this.lid) * Math.min(1, delta / 110);
    super.update(delta, x, y, alpha);
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.focusTarget = Math.max(this.focusTarget, 0.75);
    super.play(gesture, angle, duration);
  }

  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? PSY.gold : PSY.aether);
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 15.5 : 12);
      glow.setFillStyle(this.tint(on ? PSY.gold : PSY.violet), on ? 0.3 : 0.26);
    });
    // A gold ring set into each ivory hand, like the collar on a turned piece.
    this.forEachHandLayer(2, (ring) => {
      ring.setFillStyle(0, 0);
      ring.setStrokeStyle(1.6, this.tint(PSY.gold), on ? 0.95 : 0);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new PsychicFx(this.scene, this.tint).mote(x, y);
  }

  /** A soft silver aura that brightens with focus — warmer and wider once mastered. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const k = this.mastered ? 1.2 : 1;
    g.fillStyle(this.tint(this.mastered ? PSY.gold : PSY.violetLit), a * (0.1 + this.focus * 0.12) * k);
    g.fillCircle(x, y, (26 + this.focus * 4) * k);

    if (!this.mastered) return;
    // Mastery, part one: a ring of the board turning under his feet — sixteen alternating
    // ivory and ebony squares on a gold-rimmed ellipse.
    const cx = x, cy = y + 16, rx = 34, ry = 11;
    const segs = 16;
    const spin = this.t * 0.35;
    for (let i = 0; i < segs; i++) {
      const a0 = spin + (i / segs) * TAU, a1 = spin + ((i + 1) / segs) * TAU;
      const pts = [
        new Phaser.Geom.Point(cx + Math.cos(a0) * rx, cy + Math.sin(a0) * ry),
        new Phaser.Geom.Point(cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry),
        new Phaser.Geom.Point(cx + Math.cos(a1) * rx * 0.72, cy + Math.sin(a1) * ry * 0.72),
        new Phaser.Geom.Point(cx + Math.cos(a0) * rx * 0.72, cy + Math.sin(a0) * ry * 0.72),
      ];
      g.fillStyle(this.tint(i % 2 === 0 ? PSY.aether : PSY.ink), alpha * 0.7);
      g.fillPoints(pts, true);
    }
    g.lineStyle(1.5, this.tint(PSY.gold), alpha * 0.9);
    g.strokeEllipse(cx, cy, rx * 2, ry * 2);
    g.lineStyle(1, this.tint(PSY.goldDeep), alpha * 0.8);
    g.strokeEllipse(cx, cy, rx * 1.44, ry * 1.44);

    // Part two: a gilded halo standing behind the crown, with rays at the eight compass points.
    const hx = x, hy = y - 20 + Math.sin(this.t * 2.2) * 0.6;
    g.fillStyle(this.tint(PSY.gold), alpha * 0.16);
    g.fillCircle(hx, hy, 22);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * TAU + this.t * 0.2;
      const len = i % 2 === 0 ? 30 : 25;
      g.fillStyle(this.tint(PSY.gold), alpha * 0.5);
      g.fillTriangle(
        hx + Math.cos(ang - 0.09) * 19, hy + Math.sin(ang - 0.09) * 19,
        hx + Math.cos(ang + 0.09) * 19, hy + Math.sin(ang + 0.09) * 19,
        hx + Math.cos(ang) * len, hy + Math.sin(ang) * len,
      );
    }
    g.lineStyle(2, this.tint(PSY.gold), alpha * 0.85);
    g.strokeCircle(hx, hy, 19);
  }

  /**
   * Carved detail on the ebony orb: a polished sheen across the upper-left, and a small
   * checkered medallion inlaid on the chest — a diamond of the board, ivory and ebony, in a
   * thin rim that is silver at rest and gold once mastered.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const m = this.mastered;
    g.lineStyle(2, this.tint(PSY.violetLit), alpha * 0.22);
    g.beginPath();
    g.arc(x, y, 16, Math.PI * 1.08, Math.PI * 1.42, false);
    g.strokePath();
    const mx = x, my = y + 11, r = 3.6;
    const D = (dx: number, dy: number) => new Phaser.Geom.Point(mx + dx - dy, my + (dx + dy) * 0.9);
    g.fillStyle(this.tint(m ? PSY.goldDeep : PSY.robe), alpha);
    g.fillPoints([D(-r - 1, -r - 1), D(r + 1, -r - 1), D(r + 1, r + 1), D(-r - 1, r + 1)], true);
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const x0 = -r + i * r, y0 = -r + j * r;
        g.fillStyle(this.tint((i + j) % 2 === 0 ? PSY.aether : PSY.ink), alpha * 0.95);
        g.fillPoints([D(x0, y0), D(x0 + r, y0), D(x0 + r, y0 + r), D(x0, y0 + r)], true);
      }
    }
    g.lineStyle(1, this.tint(m ? PSY.gold : PSY.violetLit), alpha * 0.9);
    g.strokePoints([D(-r, -r), D(r, -r), D(r, r), D(-r, r)], true);
  }

  /** The king's crown, with the third eye as the jewel in its band. The element's entire tell. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const m = this.mastered;
    const bob = Math.sin(this.t * 2.2) * 0.6;
    const cy = y + bob;
    const w = m ? 1.18 : 1;
    const ivory = this.tint(PSY.aether);
    const shadeC = this.tint(PSY.violetLit);
    const rim = this.tint(m ? PSY.goldDeep : PSY.ink);
    const P = (pts: [number, number][]): Phaser.Geom.Point[] =>
      pts.map(([px, py]) => new Phaser.Geom.Point(x + px * w, cy + py));

    // The arches: two lobes swelling out of the band and dipping to meet under the cross.
    const arches = P([
      [-13, -16], [-15.5, -20], [-13, -23.5], [-6.5, -25], [-2, -22], [0, -23],
      [2, -22], [6.5, -25], [13, -23.5], [15.5, -20], [13, -16],
    ]);
    g.fillStyle(ivory, alpha);
    g.fillPoints(arches, true);
    g.lineStyle(1.6, rim, alpha);
    g.strokePoints(arches, true);
    // Carved fluting down each arch, in the shade of the ivory.
    g.lineStyle(1.4, m ? this.tint(PSY.gold) : shadeC, alpha);
    for (const fx of [-9, -4.5, 4.5, 9]) g.lineBetween(x + fx * w, cy - 17.5, x + fx * 1.15 * w, cy - 22.5);

    // The cross finial — the one thing that says *king* rather than queen.
    const cross = this.tint(m ? PSY.gold : PSY.aether);
    g.fillStyle(rim, alpha);
    g.fillRect(x - 2.2, cy - 30, 4.4, 8.5);
    g.fillRect(x - 5, cy - 28, 10, 4.2);
    g.fillStyle(cross, alpha);
    g.fillRect(x - 1.2, cy - 29, 2.4, 6.8);
    g.fillRect(x - 4, cy - 27, 8, 2.2);

    // The band, worn low on the brow of the orb.
    const band = P([[-15, -10], [15, -10], [13.5, -16.5], [-13.5, -16.5]]);
    g.fillStyle(ivory, alpha);
    g.fillPoints(band, true);
    g.lineStyle(1.6, rim, alpha);
    g.strokePoints(band, true);
    g.lineStyle(1.3, m ? this.tint(PSY.gold) : shadeC, alpha);
    g.lineBetween(x - 13.6 * w, cy - 15, x + 13.6 * w, cy - 15);
    g.lineBetween(x - 14.6 * w, cy - 11.5, x + 14.6 * w, cy - 11.5);
    // Ebony checks either side of the jewel — the board, small enough to stay trim.
    g.fillStyle(this.tint(PSY.ink), alpha);
    for (const sx of [-1, 1]) {
      g.fillRect(x + sx * 10.5 * w - 1.7, cy - 14.9, 3.4, 3.4);
    }

    thirdEye(g, this.tint, x, cy - 13.3, m ? 6.4 : 5.6, this.lid, alpha, {
      lash: false,
      glow: (m ? 1.6 : 0.8) + this.focus * 1.2,
    });
  }
}
