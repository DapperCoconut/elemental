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
 * The palette is a single violet ladder with exactly two colours off it: the gold of an opened
 * eye, and the red of stress. Both of those are meant to be alarming against the violet, which
 * is why nothing else in the kit is allowed near them.
 */

export type PsychicColorFn = ColorFn;

export const PSY = {
  /** Under everything. */
  ink: 0x140b26,
  /** The violet ladder — the whole element lives in these five. */
  robeDeep: 0x3d1b6b,
  robe: 0x6b2fb8,
  violet: 0x9b4dff,
  violetLit: 0xc496ff,
  aether: 0xead6ff,
  /** Skin: the monk himself, drained of everything but the violet. */
  skin: 0x8f6bb5,
  skinShade: 0x5c4177,
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
  hands: [
    { r: 14, color: PSY.robeDeep, alpha: 0.34 },
    { r: 7.4, color: PSY.violet, alpha: 0.88 },
    { r: 2.6, color: PSY.aether, alpha: 0.95, ox: -1.7, oy: -2 },
  ],
  eyeWhite: PSY.aether,
  eyePupil: PSY.ink,
  // Lighter than most: a monk who barely touches the floor should not smear when he moves.
  squash: { div: 18, x: 0.34, y: 0.2 },
};

/**
 * The monk.
 *
 * Three ideas, in order of how much they matter. First, the **third eye**: it sits on the
 * forehead above the rig's own two, and its `open` is the element's only real state tell —
 * half-lidded at rest, wide the instant he is reading something, and shut while he is in a
 * dodge. Second, the **robe**: a heavy hooded thing painted as the body layer, with a hem that
 * never quite settles because he is not standing on the ground. Third, the **beads**: a ring of
 * prayer beads orbiting him at a rate that rises with focus, which is the cheapest way to show
 * a character concentrating without animating a pose.
 *
 * `setFocus` drives all three at once and is the only thing the kit has to feed it.
 */
export class PsychicAvatar extends BaseAvatar {
  /** 0 = at rest, 1 = reading the future as hard as he can. Lerped. */
  private focus = 0;
  private focusTarget = 0;
  /** Third-eye aperture, driven off focus but forced shut during a dodge. */
  private lid = 0;
  private lidTarget = 0.55;
  private seed = Math.random() * 999;
  private beadPhase = 0;

  constructor(scene: Phaser.Scene, tint: PsychicColorFn, depth = 6) {
    super(scene, tint, depth, PSYCHIC_AVATAR);
  }

  /** How hard he is concentrating, 0–1 — beads, glow and aperture all ride this. */
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
    this.beadPhase += (delta / 1000) * (0.5 + this.focus * 2.6);
    super.update(delta, x, y, alpha);
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.focusTarget = Math.max(this.focusTarget, 0.75);
    super.play(gesture, angle, duration);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 17 : 14);
      glow.setAlpha(on ? 0.55 : 0.34);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new PsychicFx(this.scene, this.tint).mote(x, y);
  }

  /** A pool of violet light he is sitting in rather than standing on. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    g.fillStyle(this.tint(PSY.robeDeep), a * 0.5);
    g.fillEllipse(x, y + 16, 44 + this.focus * 20, 14);
    g.fillStyle(this.tint(PSY.violet), a * (0.16 + this.focus * 0.3));
    g.fillEllipse(x, y + 16, 26 + this.focus * 20, 9);
  }

  /**
   * The robe. A hooded silhouette drawn as one polygon — narrow at the crown, wide at the hem —
   * with a sash, a lit edge down the side the glow comes from, and a hem that ripples. The hood
   * opening is left dark so the rig's own two eyes read as being inside it.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const sway = Math.sin(this.t * 1.7) * 1.6;
    const lift = Math.sin(this.t * 2.2) * 1.2 * (0.4 + this.focus);

    // Robe body: crown → shoulders → flared hem, with the hem sampled so it can ripple.
    const robe: Phaser.Geom.Point[] = [
      new Phaser.Geom.Point(x - 5, y - 20 + lift),
      new Phaser.Geom.Point(x + 5, y - 20 + lift),
      new Phaser.Geom.Point(x + 12, y - 8),
      new Phaser.Geom.Point(x + 14, y + 4),
    ];
    for (let i = 0; i <= 6; i++) {
      const u = 1 - (i / 6) * 2;
      robe.push(new Phaser.Geom.Point(
        x + u * 15 + sway * 0.5,
        y + 14 + Math.sin(this.t * 3.1 + i * 1.2) * 1.8 + (1 - Math.abs(u)) * 2,
      ));
    }
    robe.push(new Phaser.Geom.Point(x - 14, y + 4));
    robe.push(new Phaser.Geom.Point(x - 12, y - 8));

    g.fillStyle(this.tint(PSY.ink), alpha * 0.95);
    g.fillPoints(robe.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 1.1, y + (p.y - y) * 1.06)), true);
    g.fillStyle(this.tint(PSY.robeDeep), alpha);
    g.fillPoints(robe, true);
    // Lit edge down the left, matching the under-glow.
    g.fillStyle(this.tint(PSY.robe), alpha * 0.9);
    g.fillPoints(robe.map((p) => new Phaser.Geom.Point(
      x + (p.x - x) * 0.78 - 2.4, y + (p.y - y) * 0.94)), true);

    // The hood opening: a dark almond the rig's eyes sit inside.
    g.fillStyle(this.tint(PSY.ink), alpha * 0.9);
    g.fillEllipse(x, y - 5 + lift * 0.6, 15, 13);
    g.fillStyle(this.tint(PSY.skinShade), alpha * 0.75);
    g.fillEllipse(x, y - 4 + lift * 0.6, 12, 10);

    // Sash across the waist, knotted off-centre.
    g.fillStyle(this.tint(PSY.gold), alpha * 0.85);
    g.fillRect(x - 13, y + 1, 26, 3.2);
    g.fillStyle(this.tint(PSY.goldDeep), alpha * 0.9);
    g.fillCircle(x + 5, y + 2.6, 3);
    g.lineStyle(1.6, this.tint(PSY.goldDeep), alpha * 0.8);
    g.lineBetween(x + 5, y + 4, x + 3 + sway, y + 12);

    // Folds: three arcs down the front so the robe has weight.
    g.lineStyle(1, this.tint(PSY.ink), alpha * 0.4);
    for (let i = 0; i < 3; i++) {
      const ox = (i - 1) * 6;
      g.lineBetween(x + ox, y + 5, x + ox * 1.5 + sway * 0.4, y + 14);
    }
  }

  /**
   * The third eye, the beads, and — at full focus — the halo of glyphs he is reading the future
   * out of. All of it rooted at the crown so none of it ever covers the face.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const crown = y - 18;
    const lift = Math.sin(this.t * 2.2) * 1.2 * (0.4 + this.focus);

    // ── Prayer beads ──
    // An orbit tilted to an ellipse, with the beads behind the body drawn dimmer so the ring
    // passes around him rather than in front of him.
    const beads = 11;
    for (let i = 0; i < beads; i++) {
      const ang = this.beadPhase + (i / beads) * TAU;
      const bx = x + Math.cos(ang) * (26 + this.focus * 6);
      const by = y - 2 + Math.sin(ang) * (9 + this.focus * 3);
      const behind = Math.sin(ang) < 0;
      g.fillStyle(this.tint(behind ? PSY.robeDeep : PSY.violetLit), alpha * (behind ? 0.4 : 0.9));
      g.fillCircle(bx, by, behind ? 1.7 : 2.4);
    }

    // ── The third eye ──
    // Above the rig's own two, on the brow of the hood. This is the element's entire tell.
    thirdEye(g, this.tint, x, crown + 3 + lift * 0.6, 8.5, this.lid, alpha, {
      glow: 0.8 + this.focus * 1.2,
    });

    // ── Reading glyphs ──
    // Only once he is actually concentrating: a short arc of sigils over the crown, each one
    // fading in behind the last, so the halo builds rather than appearing all at once.
    if (this.focus > 0.25) {
      const k = (this.focus - 0.25) / 0.75;
      for (let i = 0; i < 3; i++) {
        const ang = -Math.PI / 2 + (i - 1) * 0.62;
        const d = 24 + Math.sin(this.t * 2.6 + i) * 2;
        mindSigil(g, this.tint,
          x + Math.cos(ang) * d, crown + 2 + Math.sin(ang) * d * 0.75,
          4.6, alpha * k * (0.5 + 0.4 * Math.sin(this.t * 3 + i * 2)),
          { phase: this.t * (1.2 + i * 0.4), sides: 5, eye: false });
      }
    }

    // Mastered: the eye never closes and it grows a permanent gold ring.
    if (this.mastered) {
      g.lineStyle(1.4, this.tint(PSY.gold), alpha * (0.4 + 0.2 * Math.sin(this.t * 2)));
      g.strokeCircle(x, crown + 3 + lift * 0.6, 13);
    }
  }
}
