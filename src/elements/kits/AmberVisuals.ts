import Phaser from 'phaser';
import { ArmGesture, ArmHold, ArmPose, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Amber draws.
 *
 * One material and one silhouette rule. The material is **resin** — every friendly shape in the
 * kit is a lump of translucent amber with something suspended inside it, drawn as a dark core
 * inside a warm shell so it reads as "there is a thing in there" rather than "this is an orange
 * circle". The rule is that everything alive is drawn from the side, in profile, with a visible
 * spine: a mosquito is a body and a proboscis, a raptor is a crouch and a tail, a triceratops is
 * a frill and three horns, a tyrannosaur is a jaw and a counterweight. None of them are circles.
 *
 * The palette is deliberately narrow — resin, bone, hide and blood — with one exception, the
 * green of the raptors, which exists so the one attack made of *many* animals doesn't read as
 * more of the same orange.
 */

export type AmberColorFn = ColorFn;

export const AMB = {
  /** Under everything. */
  ink: 0x1a0f05,
  earth: 0x3d2712,
  /** The resin ladder — the element's whole identity lives in these four. */
  resinDeep: 0x8a4a08,
  resin: 0xd98b1f,
  resinLit: 0xf7c25a,
  resinGlow: 0xffe9a8,
  /** Hide: what every animal in the kit is made of. */
  hide: 0x6f4a2c,
  hideLit: 0x9c6d42,
  hideDark: 0x3f2917,
  /** Bone: horns, teeth, claws, the sling's stone cradle. */
  bone: 0xe4d9bb,
  boneShade: 0xa89b78,
  /** Blood. The mosquitoes fill up with it and the meat is made of it. */
  blood: 0x9e1f22,
  bloodLit: 0xd4413f,
  /** The one colour off the ladder: raptors, so a swarm doesn't read as more amber. */
  scale: 0x4e7a3a,
  scaleLit: 0x86b45c,
  /** Dust, for the stampede and every heavy footfall. */
  dust: 0xc4a678,
};

/** Deterministic 0–1 noise, so a lump of resin keeps its inclusions between frames. */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 53.1 + i * 113.7) * 21323.719;
  return v - Math.floor(v);
}

/** Scale a colour's channels. Used to sink a fill into shadow, never to recolour it. */
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
 * A lump of amber. Not a circle: an irregular polygon with a bevelled lit face, a darker rind,
 * and — the whole point of the material — inclusions suspended inside it. `alive` puts a curled
 * insect in the middle instead of grit.
 */
export function amberChunk(
  g: Phaser.GameObjects.Graphics,
  tint: AmberColorFn,
  x: number, y: number, r: number, alpha: number,
  { seed = 0, dark = 1, spin = 0, alive = false, hot = 0 } = {},
): void {
  const N = 7;
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < N; i++) {
    const a = spin + (i / N) * TAU;
    const rr = r * (0.74 + jitter(seed, i) * 0.42);
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }

  if (hot > 0) {
    g.fillStyle(shade(tint(AMB.resinGlow), dark), alpha * 0.22 * hot);
    g.fillCircle(x, y, r * 1.7);
  }
  // Rind, body, then a bevel highlight offset up-left so the lump has a light source.
  g.fillStyle(shade(tint(AMB.ink), dark), alpha * 0.75);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 1.16, y + (p.y - y) * 1.16)), true);
  g.fillStyle(shade(tint(AMB.resinDeep), dark), alpha);
  g.fillPoints(pts, true);
  g.fillStyle(shade(tint(AMB.resin), dark), alpha);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(
    x + (p.x - x) * 0.82 - r * 0.08, y + (p.y - y) * 0.82 - r * 0.08)), true);
  g.fillStyle(shade(tint(AMB.resinLit), dark), alpha * 0.85);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(
    x + (p.x - x) * 0.5 - r * 0.16, y + (p.y - y) * 0.5 - r * 0.18)), true);

  if (alive && r > 4) {
    // A curled insect: thorax, abdomen, and three legs that read at any size.
    const a0 = spin * 0.4;
    g.fillStyle(shade(tint(AMB.ink), dark), alpha * 0.85);
    g.fillEllipse(x, y, r * 0.4, r * 0.26);
    g.fillEllipse(x + Math.cos(a0) * r * 0.3, y + Math.sin(a0) * r * 0.3, r * 0.26, r * 0.2);
    g.lineStyle(Math.max(0.5, r * 0.07), shade(tint(AMB.ink), dark), alpha * 0.7);
    for (let i = 0; i < 3; i++) {
      const la = a0 + Math.PI * 0.5 + (i - 1) * 0.6;
      g.lineBetween(x, y, x + Math.cos(la) * r * 0.44, y + Math.sin(la) * r * 0.44);
    }
  } else if (r > 3) {
    // Grit and bubbles.
    for (let i = 0; i < 3; i++) {
      const a = jitter(seed, 10 + i) * TAU;
      const d = r * 0.5 * jitter(seed, 20 + i);
      g.fillStyle(shade(tint(i === 0 ? AMB.ink : AMB.resinGlow), dark), alpha * 0.55);
      g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, Math.max(0.5, r * 0.11));
    }
  }
}

/**
 * The sling: a leather cord doubled back through a bone cradle, with the stone sitting in it.
 * `(x, y)` is the hand; `(sx, sy)` is where the stone currently is. Both cords are drawn, and
 * they sag toward the midpoint, so a slow swing hangs and a fast one goes taut.
 */
export function slingCord(
  g: Phaser.GameObjects.Graphics,
  tint: AmberColorFn,
  x: number, y: number, sx: number, sy: number, alpha: number,
  { taut = 1, dark = 1, seed = 0 } = {},
): void {
  const mx = (x + sx) / 2;
  const my = (y + sy) / 2;
  const sag = (1 - Phaser.Math.Clamp(taut, 0, 1)) * 14;
  const nx = -(sy - y);
  const ny = sx - x;
  const nl = Math.hypot(nx, ny) || 1;

  for (const s of [-1, 1]) {
    const cx = mx + (nx / nl) * s * 3.4;
    const cy = my + (ny / nl) * s * 3.4 + sag;
    g.lineStyle(1.7, shade(tint(AMB.hideDark), dark), alpha * 0.9);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(cx, cy);
    g.lineTo(sx, sy);
    g.strokePath();
  }
  // Bone cradle at the stone end.
  g.lineStyle(2.4, shade(tint(AMB.boneShade), dark), alpha * 0.8);
  const ca = Math.atan2(sy - y, sx - x);
  g.lineBetween(
    sx + Math.cos(ca + 1.57) * 5, sy + Math.sin(ca + 1.57) * 5,
    sx + Math.cos(ca - 1.57) * 5, sy + Math.sin(ca - 1.57) * 5,
  );
  void seed;
}

/**
 * A mosquito, in profile: a hunched thorax, a long abdomen that swells and reddens as it fills,
 * two blurred wings drawn as ellipses whose height is the beat, six trailing legs, and the
 * proboscis — a needle out the front which is the only straight line on it.
 */
export function mosquito(
  g: Phaser.GameObjects.Graphics,
  tint: AmberColorFn,
  x: number, y: number, ang: number, alpha: number,
  { fill = 0, beat = 0, dark = 1, size = 1, hurt = 0 } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const s = size;

  // Wings first: they are behind the body and they blur.
  const wing = Math.abs(Math.cos(beat)) * 0.8 + 0.2;
  for (const sd of [-1, 1]) {
    const w0 = P(-1 * s, sd * 5 * s);
    g.fillStyle(shade(tint(AMB.resinGlow), dark), alpha * 0.3);
    g.fillEllipse(w0.x, w0.y, 11 * s, 9 * s * wing);
  }

  // Legs: three a side, trailing back and down.
  g.lineStyle(Math.max(0.5, 0.9 * s), shade(tint(AMB.ink), dark), alpha * 0.75);
  for (let i = 0; i < 3; i++) {
    for (const sd of [-1, 1]) {
      const a = P(-1 * s + i * 1.6 * s, sd * 1.6 * s);
      const b = P(-7 * s - i * 2.2 * s, sd * (5 + i * 1.8) * s);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  // Abdomen — swells and reddens with the load. This is the whole read on a full mosquito.
  const bloat = 1 + fill * 0.9;
  const ab = P(-6.5 * s, 0);
  g.fillStyle(shade(tint(AMB.ink), dark), alpha * 0.7);
  g.fillEllipse(ab.x, ab.y, 12 * s * bloat, 6.4 * s * bloat);
  g.fillStyle(shade(tint(fill > 0.05 ? AMB.blood : AMB.hideDark), dark), alpha);
  g.fillEllipse(ab.x, ab.y, 10.4 * s * bloat, 5.2 * s * bloat);
  if (fill > 0.05) {
    g.fillStyle(shade(tint(AMB.bloodLit), dark), alpha * 0.8);
    g.fillEllipse(ab.x - s, ab.y - s, 6 * s * bloat * fill, 3 * s * bloat * fill);
  }

  // Thorax, hunched.
  const th = P(0.5 * s, -0.6 * s);
  g.fillStyle(shade(tint(AMB.hide), dark), alpha);
  g.fillEllipse(th.x, th.y, 7 * s, 6 * s);
  g.fillStyle(shade(tint(AMB.hideLit), dark), alpha * 0.75);
  g.fillEllipse(th.x - 0.6 * s, th.y - 1 * s, 4 * s, 3 * s);

  // Head and the needle.
  const hd = P(4.6 * s, 0.2 * s);
  g.fillStyle(shade(tint(AMB.hideDark), dark), alpha);
  g.fillCircle(hd.x, hd.y, 2.5 * s);
  g.fillStyle(shade(tint(AMB.resinLit), dark), alpha * 0.9);
  g.fillCircle(hd.x + ca * 0.6, hd.y + sa * 0.6 - 0.8 * s, 1.1 * s);
  const n0 = P(6 * s, 0.4 * s);
  const n1 = P(15 * s, 0.4 * s);
  g.lineStyle(Math.max(0.7, 1.2 * s), shade(tint(AMB.bone), dark), alpha * 0.95);
  g.lineBetween(n0.x, n0.y, n1.x, n1.y);

  if (hurt > 0) {
    g.fillStyle(shade(tint(AMB.bloodLit), dark), alpha * hurt * 0.6);
    g.fillCircle(x, y, 12 * s);
  }
}

/**
 * A velociraptor, in profile and mid-lunge. Crouched hips, a horizontal spine with the tail out
 * behind as a counterweight, a narrow snout with a visible jaw line, and the one killing claw
 * held up off the ground — which is the only detail that makes it a raptor and not a lizard.
 */
export function raptor(
  g: Phaser.GameObjects.Graphics,
  tint: AmberColorFn,
  x: number, y: number, face: number, alpha: number,
  { t = 0, dark = 1, size = 1, seed = 0 } = {},
): void {
  const s = size;
  const d = face >= 0 ? 1 : -1;
  const bob = Math.sin(t * 9 + seed) * 1.6 * s;
  const stride = Math.sin(t * 9 + seed);

  // Tail: three tapering segments, whipping opposite the stride.
  let tx = x - d * 6 * s;
  let ty = y + bob;
  for (let i = 0; i < 3; i++) {
    const a = Math.PI - (d > 0 ? 0 : Math.PI) + d * (-0.18 + stride * 0.16 * (i + 1));
    const len = (9 - i * 2) * s;
    const nx = tx + Math.cos(a) * len * d;
    const ny = ty + Math.sin(a) * len;
    g.lineStyle((5 - i * 1.4) * s, shade(tint(AMB.scale), dark), alpha);
    g.lineBetween(tx, ty, nx, ny);
    tx = nx; ty = ny;
  }

  // Back legs: a bent drumstick with a shin, striding.
  for (const sd of [-1, 1]) {
    const ph = stride * sd;
    const hipX = x - d * 3 * s;
    const hipY = y + 2 * s + bob;
    const kneeX = hipX - d * 4 * s;
    const kneeY = hipY + 6 * s;
    const footX = kneeX + d * (3 + ph * 5) * s;
    const footY = hipY + 12 * s;
    g.lineStyle(3.4 * s, shade(tint(sd > 0 ? AMB.scale : AMB.scaleLit), dark * (sd > 0 ? 0.8 : 1)), alpha);
    g.lineBetween(hipX, hipY, kneeX, kneeY);
    g.lineStyle(2.4 * s, shade(tint(sd > 0 ? AMB.scale : AMB.scaleLit), dark * (sd > 0 ? 0.8 : 1)), alpha);
    g.lineBetween(kneeX, kneeY, footX, footY);
    // The sickle claw, held up.
    g.lineStyle(1.6 * s, shade(tint(AMB.bone), dark), alpha * 0.95);
    g.lineBetween(footX, footY, footX + d * 3.4 * s, footY - 3 * s);
  }

  // Body: a horizontal wedge.
  g.fillStyle(shade(tint(AMB.scale), dark), alpha);
  g.fillEllipse(x, y + bob, 17 * s, 10 * s);
  g.fillStyle(shade(tint(AMB.scaleLit), dark), alpha * 0.8);
  g.fillEllipse(x - d * 1.5 * s, y - 1.5 * s + bob, 12 * s, 5 * s);

  // Neck and head, thrust forward.
  const nx0 = x + d * 7 * s;
  const ny0 = y - 2 * s + bob;
  const hx = nx0 + d * 7 * s;
  const hy = ny0 - 2 * s;
  g.lineStyle(4.4 * s, shade(tint(AMB.scale), dark), alpha);
  g.lineBetween(nx0, ny0, hx, hy);
  g.fillStyle(shade(tint(AMB.scale), dark), alpha);
  g.fillPoints([
    new Phaser.Geom.Point(hx - d * 3 * s, hy - 3 * s),
    new Phaser.Geom.Point(hx + d * 9 * s, hy + 0.5 * s),
    new Phaser.Geom.Point(hx - d * 2 * s, hy + 3 * s),
  ], true);
  // Jaw line and teeth.
  g.lineStyle(0.9 * s, shade(tint(AMB.ink), dark), alpha * 0.8);
  g.lineBetween(hx - d * 2 * s, hy + 1 * s, hx + d * 8 * s, hy + 0.8 * s);
  g.fillStyle(shade(tint(AMB.bone), dark), alpha * 0.9);
  for (let i = 0; i < 3; i++) {
    g.fillCircle(hx + d * (2 + i * 2.4) * s, hy + 1.6 * s, 0.7 * s);
  }
  // Eye.
  g.fillStyle(shade(tint(AMB.resinLit), dark), alpha);
  g.fillCircle(hx + d * 1.5 * s, hy - 1.2 * s, 1.3 * s);
  g.fillStyle(shade(tint(AMB.ink), dark), alpha);
  g.fillCircle(hx + d * 1.8 * s, hy - 1.2 * s, 0.6 * s);
}

/**
 * A triceratops seen from the side, running. A barrel body over four column legs, a huge scalloped
 * frill behind the skull, the beak, and three horns — two long over the eyes, one short on the
 * nose. It is drawn big and dark so it reads as a wall of animal rather than a projectile.
 */
export function triceratops(
  g: Phaser.GameObjects.Graphics,
  tint: AmberColorFn,
  x: number, y: number, face: number, scale: number, alpha: number,
  { t = 0, dark = 1 } = {},
): void {
  const s = scale;
  const d = face >= 0 ? 1 : -1;
  const bob = Math.sin(t * 11) * 2.4 * s;
  const stride = Math.sin(t * 11);

  // Legs first, behind the body.
  for (let i = 0; i < 4; i++) {
    const back = i < 2;
    const ph = Math.sin(t * 11 + i * 1.7);
    const lx = x + d * (back ? -14 : 12) * s + d * (i % 2 ? 3 : -3) * s;
    const ly = y + 6 * s;
    g.lineStyle((back ? 8 : 7) * s, shade(tint(i % 2 ? AMB.hideDark : AMB.hide), dark * (i % 2 ? 0.75 : 1)), alpha);
    g.lineBetween(lx, ly, lx + d * ph * 5 * s, ly + 17 * s);
    g.fillStyle(shade(tint(AMB.hideDark), dark), alpha);
    g.fillEllipse(lx + d * ph * 5 * s, ly + 18 * s, 9 * s, 4 * s);
  }

  // Tail.
  g.lineStyle(7 * s, shade(tint(AMB.hide), dark), alpha);
  g.lineBetween(x - d * 20 * s, y + bob, x - d * 34 * s, y + 4 * s + bob + stride * 3 * s);

  // Barrel body with a lit back and a shaded belly.
  g.fillStyle(shade(tint(AMB.hide), dark), alpha);
  g.fillEllipse(x, y + bob, 52 * s, 30 * s);
  g.fillStyle(shade(tint(AMB.hideLit), dark), alpha * 0.85);
  g.fillEllipse(x - d * 2 * s, y - 6 * s + bob, 42 * s, 14 * s);
  g.fillStyle(shade(tint(AMB.hideDark), dark), alpha * 0.7);
  g.fillEllipse(x, y + 9 * s + bob, 40 * s, 10 * s);

  // Frill: a scalloped fan behind the skull, with the skull sitting in front of it.
  const hx = x + d * 24 * s;
  const hy = y - 4 * s + bob;
  const frill: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= 8; i++) {
    const a = -1.5 + (i / 8) * 3.0;
    const rr = (17 + Math.sin(i * 2.1) * 2.4) * s;
    frill.push(new Phaser.Geom.Point(hx + Math.cos(a) * rr * d * 0.55, hy + Math.sin(a) * rr));
  }
  frill.push(new Phaser.Geom.Point(hx + d * 6 * s, hy + 12 * s));
  frill.push(new Phaser.Geom.Point(hx + d * 6 * s, hy - 12 * s));
  g.fillStyle(shade(tint(AMB.hideDark), dark), alpha);
  g.fillPoints(frill, true);
  g.fillStyle(shade(tint(AMB.hide), dark), alpha * 0.9);
  g.fillPoints(frill.map((p) => new Phaser.Geom.Point(hx + (p.x - hx) * 0.82, hy + (p.y - hy) * 0.82)), true);
  // Scallop bumps around the frill edge.
  for (let i = 0; i <= 8; i += 2) {
    const p = frill[i];
    g.fillStyle(shade(tint(AMB.boneShade), dark), alpha * 0.8);
    g.fillCircle(p.x, p.y, 2.4 * s);
  }

  // Skull and beak.
  g.fillStyle(shade(tint(AMB.hideLit), dark), alpha);
  g.fillPoints([
    new Phaser.Geom.Point(hx + d * 2 * s, hy - 10 * s),
    new Phaser.Geom.Point(hx + d * 20 * s, hy + 1 * s),
    new Phaser.Geom.Point(hx + d * 2 * s, hy + 10 * s),
  ], true);
  g.fillStyle(shade(tint(AMB.bone), dark), alpha);
  g.fillPoints([
    new Phaser.Geom.Point(hx + d * 15 * s, hy - 2 * s),
    new Phaser.Geom.Point(hx + d * 24 * s, hy + 2 * s),
    new Phaser.Geom.Point(hx + d * 15 * s, hy + 4 * s),
  ], true);

  // Three horns.
  g.fillStyle(shade(tint(AMB.bone), dark), alpha);
  for (const [ox, oy, len, up] of [[6, -7, 22, -0.9], [4, -4, 20, -0.6]] as const) {
    g.fillPoints([
      new Phaser.Geom.Point(hx + d * ox * s, hy + oy * s - 2 * s),
      new Phaser.Geom.Point(hx + d * (ox + Math.cos(up) * len) * s, hy + (oy + Math.sin(up) * len) * s),
      new Phaser.Geom.Point(hx + d * ox * s, hy + oy * s + 2.4 * s),
    ], true);
  }
  g.fillPoints([
    new Phaser.Geom.Point(hx + d * 15 * s, hy - 1 * s),
    new Phaser.Geom.Point(hx + d * 21 * s, hy - 9 * s),
    new Phaser.Geom.Point(hx + d * 17 * s, hy + 1 * s),
  ], true);

  // Eye.
  g.fillStyle(shade(tint(AMB.ink), dark), alpha);
  g.fillCircle(hx + d * 8 * s, hy - 1 * s, 1.6 * s);
}

/**
 * A tyrannosaur in profile. Everything about the shape is the balance point: the spine is
 * horizontal, the head hangs off one end and the tail off the other, and the two legs come
 * straight down from the hips in the middle. `bite` opens the jaw, `carry` is what is currently
 * in it.
 */
export function tyrannosaur(
  g: Phaser.GameObjects.Graphics,
  tint: AmberColorFn,
  x: number, y: number, face: number, scale: number, alpha: number,
  { t = 0, dark = 1, bite = 0, rear = 0 } = {},
): void {
  const s = scale;
  const d = face >= 0 ? 1 : -1;
  const bob = Math.sin(t * 6) * 2.6 * s;
  const stride = Math.sin(t * 6);
  const lift = rear * 10 * s;

  // Tail: four segments out behind, sweeping.
  let tx = x - d * 18 * s;
  let ty = y - 2 * s + bob;
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * (d > 0 ? 1 : 0) + d * (-0.1 + Math.sin(t * 4 + i) * 0.12 * (i + 1));
    const len = (14 - i * 2.6) * s;
    const nx = tx + Math.cos(a) * len * d * (d > 0 ? 1 : -1);
    const ny = ty + Math.sin(a) * len;
    g.lineStyle((11 - i * 2.3) * s, shade(tint(AMB.hide), dark * (1 - i * 0.06)), alpha);
    g.lineBetween(tx, ty, nx, ny);
    tx = nx; ty = ny;
  }

  // Legs.
  for (const sd of [-1, 1]) {
    const ph = stride * sd;
    const hipX = x - d * 2 * s;
    const hipY = y + 6 * s + bob - lift;
    const kneeX = hipX - d * 8 * s;
    const kneeY = hipY + 14 * s;
    const ankX = kneeX + d * (6 + ph * 7) * s;
    const ankY = hipY + 26 * s;
    const col = sd > 0 ? AMB.hide : AMB.hideDark;
    g.lineStyle(11 * s, shade(tint(col), dark * (sd > 0 ? 1 : 0.75)), alpha);
    g.lineBetween(hipX, hipY, kneeX, kneeY);
    g.lineStyle(6.4 * s, shade(tint(col), dark * (sd > 0 ? 1 : 0.75)), alpha);
    g.lineBetween(kneeX, kneeY, ankX, ankY);
    // Three toes with claws.
    g.lineStyle(4 * s, shade(tint(col), dark * (sd > 0 ? 1 : 0.75)), alpha);
    g.lineBetween(ankX, ankY, ankX + d * 9 * s, ankY + 3 * s);
    g.lineStyle(1.8 * s, shade(tint(AMB.bone), dark), alpha);
    g.lineBetween(ankX + d * 9 * s, ankY + 3 * s, ankX + d * 13 * s, ankY + 5 * s);
  }

  // Body.
  g.fillStyle(shade(tint(AMB.hide), dark), alpha);
  g.fillEllipse(x, y + bob - lift * 0.6, 62 * s, 34 * s);
  g.fillStyle(shade(tint(AMB.hideLit), dark), alpha * 0.8);
  g.fillEllipse(x - d * 3 * s, y - 9 * s + bob - lift * 0.6, 48 * s, 13 * s);
  g.fillStyle(shade(tint(AMB.hideDark), dark), alpha * 0.6);
  g.fillEllipse(x + d * 2 * s, y + 11 * s + bob - lift * 0.6, 44 * s, 11 * s);

  // Vestigial arms — small, held tight, and absolutely mandatory.
  const arX = x + d * 16 * s;
  const arY = y + 2 * s + bob - lift * 0.6;
  g.lineStyle(3.4 * s, shade(tint(AMB.hideDark), dark), alpha);
  g.lineBetween(arX, arY, arX + d * 7 * s, arY + 5 * s);
  g.lineStyle(1.6 * s, shade(tint(AMB.bone), dark), alpha * 0.9);
  g.lineBetween(arX + d * 7 * s, arY + 5 * s, arX + d * 11 * s, arY + 6 * s);

  // Neck, thick and S-curved up to the skull.
  const hx = x + d * 34 * s;
  const hy = y - 20 * s + bob - lift;
  g.lineStyle(15 * s, shade(tint(AMB.hide), dark), alpha);
  g.lineBetween(x + d * 20 * s, y - 6 * s + bob - lift * 0.6, hx - d * 4 * s, hy + 4 * s);

  // Skull: a deep box with a hinged lower jaw. `bite` is the hinge angle.
  const jaw = bite * 0.6;
  g.fillStyle(shade(tint(AMB.hideLit), dark), alpha);
  g.fillPoints([
    new Phaser.Geom.Point(hx - d * 8 * s, hy - 8 * s),
    new Phaser.Geom.Point(hx + d * 22 * s, hy - 4 * s),
    new Phaser.Geom.Point(hx + d * 23 * s, hy + 2 * s),
    new Phaser.Geom.Point(hx - d * 8 * s, hy + 3 * s),
  ], true);
  // Upper teeth.
  g.fillStyle(shade(tint(AMB.bone), dark), alpha);
  for (let i = 0; i < 6; i++) {
    const px = hx + d * (2 + i * 3.4) * s;
    g.fillPoints([
      new Phaser.Geom.Point(px, hy + 2 * s),
      new Phaser.Geom.Point(px + d * 1.4 * s, hy + 2 * s),
      new Phaser.Geom.Point(px + d * 0.7 * s, hy + 6 * s),
    ], true);
  }
  // Lower jaw, rotated about the hinge.
  const jc = Math.cos(jaw);
  const js = Math.sin(jaw);
  const J = (u: number, v: number): Phaser.Geom.Point => pt(hx - d * 6 * s, hy + 3 * s, jc, js * d, u * d, v);
  g.fillStyle(shade(tint(AMB.hide), dark), alpha);
  g.fillPoints([J(0, -1 * s), J(26 * s, 1 * s), J(26 * s, 5 * s), J(0, 6 * s)], true);
  g.fillStyle(shade(tint(AMB.bone), dark), alpha);
  for (let i = 0; i < 6; i++) {
    const p0 = J((3 + i * 3.6) * s, 0);
    const p1 = J((4.4 + i * 3.6) * s, 0);
    const p2 = J((3.7 + i * 3.6) * s, -4 * s);
    g.fillPoints([p0, p1, p2], true);
  }
  // Eye, brow ridge, and nostril.
  g.fillStyle(shade(tint(AMB.resinLit), dark), alpha);
  g.fillCircle(hx + d * 6 * s, hy - 3 * s, 2.4 * s);
  g.fillStyle(shade(tint(AMB.ink), dark), alpha);
  g.fillEllipse(hx + d * 6.6 * s, hy - 3 * s, 1.4 * s, 2.6 * s);
  g.lineStyle(2 * s, shade(tint(AMB.hideDark), dark), alpha * 0.9);
  g.lineBetween(hx + d * 2 * s, hy - 7 * s, hx + d * 11 * s, hy - 6 * s);
  g.fillStyle(shade(tint(AMB.ink), dark), alpha * 0.8);
  g.fillCircle(hx + d * 19 * s, hy - 2 * s, 1.3 * s);
}

/** The shank of meat: a bone with a slab of muscle still on it, and it drips. */
export function meatShank(
  g: Phaser.GameObjects.Graphics,
  tint: AmberColorFn,
  x: number, y: number, ang: number, alpha: number,
  { dark = 1, seed = 0, t = 0, scale = 1 } = {},
): void {
  const s = scale;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);

  // Bone through the middle, with knuckles at both ends.
  g.lineStyle(4.4 * s, shade(tint(AMB.bone), dark), alpha);
  const b0 = P(-15 * s, 0);
  const b1 = P(15 * s, 0);
  g.lineBetween(b0.x, b0.y, b1.x, b1.y);
  g.fillStyle(shade(tint(AMB.bone), dark), alpha);
  for (const u of [-15, 15]) {
    const k = P(u * s, 0);
    g.fillCircle(k.x + (u < 0 ? -1 : 1) * 1.4 * s, k.y - 2 * s, 3.2 * s);
    g.fillCircle(k.x + (u < 0 ? -1 : 1) * 1.4 * s, k.y + 2 * s, 3.2 * s);
  }

  // Muscle: an irregular slab wrapped around the shaft.
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= 10; i++) {
    const u = (-11 + (i / 10) * 22) * s;
    const v = (7 + jitter(seed, i) * 3.4) * s * (i % 2 ? 1 : -1);
    pts.push(P(u, i <= 5 ? -Math.abs(v) : Math.abs(v)));
  }
  g.fillStyle(shade(tint(AMB.blood), dark), alpha);
  g.fillEllipse(x, y, 26 * s, 15 * s);
  g.fillStyle(shade(tint(AMB.bloodLit), dark), alpha * 0.75);
  g.fillEllipse(x - ca * 2 * s, y - sa * 2 * s - 2 * s, 18 * s, 8 * s);
  g.lineStyle(1 * s, shade(tint(AMB.ink), dark), alpha * 0.5);
  for (let i = 0; i < 3; i++) {
    const m0 = P((-7 + i * 7) * s, -6 * s);
    const m1 = P((-6 + i * 7) * s, 6 * s);
    g.lineBetween(m0.x, m0.y, m1.x, m1.y);
  }

  // Drips.
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.8 + i / 3) % 1;
    g.fillStyle(shade(tint(AMB.blood), dark), alpha * (1 - k) * 0.8);
    g.fillEllipse(x + (jitter(seed, 30 + i) - 0.5) * 20 * s, y + 8 * s + k * 12 * s, 2 * s, 3.4 * s);
  }
}

/** A pool of blood a mosquito dropped. Reads as a heal because of the rim highlight. */
export function bloodPuddle(
  g: Phaser.GameObjects.Graphics,
  tint: AmberColorFn,
  x: number, y: number, r: number, alpha: number,
  { t = 0, seed = 0, dark = 1 } = {},
): void {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU;
    const rr = r * (0.8 + jitter(seed, i) * 0.4) * (1 + Math.sin(t * 2 + i) * 0.03);
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.5));
  }
  g.fillStyle(shade(tint(AMB.ink), dark), alpha * 0.5);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 1.12, y + (p.y - y) * 1.12)), true);
  g.fillStyle(shade(tint(AMB.blood), dark), alpha);
  g.fillPoints(pts, true);
  g.fillStyle(shade(tint(AMB.bloodLit), dark), alpha * (0.4 + 0.3 * Math.sin(t * 3)));
  g.fillEllipse(x - r * 0.2, y - r * 0.12, r * 0.7, r * 0.3);
}

// ── Fx ────────────────────────────────────────────────────────────────────

export class AmberFx extends FxBase {
  /** Dust off a heavy footfall or a body hitting the floor. Rises, spreads and settles. */
  dust(x: number, y: number, count = 8, spread = 34, ms = 700, depth = 4, dark = 1): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      a: Math.random() * TAU, d: spread * (0.3 + Math.random()), s: 3 + Math.random() * 5, i,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        g.fillStyle(shade(this.tint(p.i % 3 === 0 ? AMB.earth : AMB.dust), dark), (1 - t) * 0.5);
        g.fillEllipse(x + Math.cos(p.a) * p.d * e, y + Math.sin(p.a) * p.d * e * 0.4 - e * 6,
          p.s * (1 + e * 1.6), p.s * (0.6 + e));
      }
    });
  }

  /** Amber shattering: shards out on a ring plus a warm bloom. */
  shatter(x: number, y: number, r = 26, ms = 520, depth = 10, dark = 1): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, r * 0.4, AMB.resinGlow, AMB.resin, depth);
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + jitter(seed, i) * 0.6;
        const d = r * (0.5 + jitter(seed, 20 + i) * 0.9) * e;
        amberChunk(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d, 4.5 * (1 - t) + 1,
          (1 - t) * 0.9, { seed: seed + i, dark, spin: a + t * 4 });
      }
    });
  }

  /** A bite or a claw: three parallel gashes raked across at an angle. */
  rake(x: number, y: number, ang: number, len = 34, ms = 300, depth = 11, dark = 1, color = AMB.bone): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 3; i++) {
        const off = (i - 1) * 8;
        const nx = Math.cos(ang + Math.PI / 2) * off;
        const ny = Math.sin(ang + Math.PI / 2) * off;
        const l = len * (0.7 + jitter(seed, i) * 0.5);
        g.lineStyle(3.2 * (1 - t) + 0.6, shade(this.tint(color), dark), (1 - t) * 0.9);
        g.lineBetween(
          x + nx - Math.cos(ang) * l * 0.5 * e, y + ny - Math.sin(ang) * l * 0.5 * e,
          x + nx + Math.cos(ang) * l * 0.5 * e, y + ny + Math.sin(ang) * l * 0.5 * e,
        );
      }
    });
  }

  /** Blood: heavy droplets that arc and fall. */
  spatter(x: number, y: number, count = 7, spread = 26, ms = 520, depth = 6, dark = 1): void {
    const seeds = Array.from({ length: count }, () => ({
      a: -Math.PI * 0.9 + Math.random() * Math.PI * 0.8,
      d: spread * (0.4 + Math.random()),
      s: 1.8 + Math.random() * 2.4,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        g.fillStyle(shade(this.tint(AMB.blood), dark), (1 - t) * 0.85);
        g.fillEllipse(x + Math.cos(p.a) * p.d * e, y + Math.sin(p.a) * p.d * e + easeIn(t) * 26,
          p.s, p.s * 1.7);
      }
    });
  }

  /** The ground shaking before something enormous arrives: expanding rings of grit. */
  rumble(x: number, y: number, w: number, ms = 900, depth = 4, dark = 1): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      for (let i = 0; i < 14; i++) {
        const px = x + (jitter(seed, i) - 0.5) * w;
        const py = y + (jitter(seed, 30 + i) - 0.5) * 60;
        const hop = Math.abs(Math.sin(t * 18 + i)) * 7;
        g.fillStyle(shade(this.tint(AMB.earth), dark), (1 - t) * 0.75);
        g.fillCircle(px, py - hop, 2.4 + jitter(seed, 60 + i) * 2);
      }
    });
  }

  /** Something enormous landing: a shockwave hoop and a wall of dust. */
  stomp(x: number, y: number, r = 60, ms = 560, depth = 5, dark = 1): void {
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(6 * (1 - t) + 1, shade(this.tint(AMB.dust), dark), (1 - t) * 0.7);
      g.strokeEllipse(x, y, r * e * 2, r * e * 0.9);
    });
    this.dust(x, y, 12, r, ms + 200, depth, dark);
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const AMBER_AVATAR: AvatarSpec = {
  hands: [
    { r: 13, color: AMB.resinDeep, alpha: 0.36 },
    { r: 7.6, color: AMB.resin, alpha: 0.9 },
    { r: 2.8, color: AMB.resinGlow, alpha: 0.95, ox: -1.8, oy: -2 },
  ],
  eyeWhite: AMB.bone,
  eyePupil: AMB.ink,
  squash: { div: 13, x: 0.52, y: 0.32 },
};

/**
 * The caveman.
 *
 * The whole character is one idea: he is *growing* amber. Shards push out of his back and
 * shoulders at angles that have nothing to do with his posture, each one with something dead
 * suspended in it, and they get longer and brighter the more of the kit he has out at once. Over
 * the top of that he is dressed in exactly two things — a hide wrap and a bone-and-tusk necklace —
 * and his hair is a mess, because nothing about him is deliberate except the sling.
 *
 * `setPack` is the tell that matters: it rises with every animal currently on the field, and at
 * full it puts a crown of shards up over the crown of his head. A player fighting Amber should be
 * able to tell how much is out there without counting.
 */
export class AmberAvatar extends BaseAvatar {
  /** 0 = nothing summoned, 1 = the whole menagerie. Lerped. */
  private pack = 0;
  private packTarget = 0;
  /** Sling charge 0–1, and where the stone currently is in world space. */
  private charge = 0;
  private stone: { x: number; y: number } | null = null;
  private flare = 0;
  private seed = Math.random() * 999;

  constructor(scene: Phaser.Scene, tint: AmberColorFn, depth = 6) {
    super(scene, tint, depth, AMBER_AVATAR);
  }

  /** How much of the kit is currently alive on the field, 0–1. */
  setPack(v: number): void { this.packTarget = Phaser.Math.Clamp(v, 0, 1); }

  /** Wind-up state of the sling, and where the stone is. Pass null to put it away. */
  setSling(charge: number, stone: { x: number; y: number } | null): void {
    this.charge = Phaser.Math.Clamp(charge, 0, 1);
    this.stone = stone;
  }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.flare = Math.max(0, this.flare - delta / 380);
    this.pack += (this.packTarget - this.pack) * Math.min(1, delta / 420);
    super.update(delta, x, y, alpha);
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.flare = 1;
    super.play(gesture, angle, duration);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 16 : 13);
      glow.setAlpha(on ? 0.6 : 0.36);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new AmberFx(this.scene, this.tint).dust(x, y, 2, 8, 380, 4);
  }

  /** Warm resin light pooling on the floor, brighter with the pack. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    g.fillStyle(this.tint(AMB.resinDeep), a * 0.45);
    g.fillEllipse(x, y + 16, 46 + this.pack * 22, 15);
    g.fillStyle(this.tint(AMB.resin), a * (0.18 + this.pack * 0.3));
    g.fillEllipse(x, y + 16, 26 + this.pack * 18, 9);
  }

  /** Hide wrap over one shoulder, a rope belt, and the bone necklace. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const sway = Math.sin(this.t * 2.1) * 1.4;

    // Hide, worn diagonally: a ragged trapezoid with a torn hem.
    const hem: Phaser.Geom.Point[] = [
      new Phaser.Geom.Point(x - 10, y - 10),
      new Phaser.Geom.Point(x + 7, y - 14),
    ];
    for (let i = 0; i <= 6; i++) {
      const u = 1 - (i / 6) * 2;
      hem.push(new Phaser.Geom.Point(x + u * 11 + sway * 0.4, y + 12 + jitter(this.seed, i) * 5));
    }
    g.fillStyle(this.tint(AMB.hideDark), alpha * 0.95);
    g.fillPoints(hem, true);
    g.fillStyle(this.tint(AMB.hide), alpha * 0.9);
    g.fillPoints(hem.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 0.84, y + (p.y - y) * 0.9)), true);
    // Stitching down the seam.
    g.lineStyle(1, this.tint(AMB.boneShade), alpha * 0.6);
    for (let i = 0; i < 4; i++) g.lineBetween(x - 6 + i * 0.6, y - 6 + i * 4, x - 3 + i * 0.6, y - 5 + i * 4);

    // Rope belt with a knot.
    g.lineStyle(2.4, this.tint(AMB.earth), alpha);
    g.lineBetween(x - 10, y - 1, x + 10, y - 1);
    g.fillStyle(this.tint(AMB.earth), alpha);
    g.fillCircle(x + 2, y - 1, 2.4);

    // Necklace: five teeth on a cord, hanging with a slight swing.
    const swing = Math.sin(this.t * 1.6) * 1.2;
    g.lineStyle(1, this.tint(AMB.hideDark), alpha * 0.8);
    g.beginPath();
    g.arc(x, y - 13, 8, 0.2, Math.PI - 0.2, false);
    g.strokePath();
    for (let i = 0; i < 5; i++) {
      const u = -1 + (i / 4) * 2;
      const px = x + u * 7 + swing * 0.3;
      const py = y - 13 + 8 * Math.sqrt(Math.max(0, 1 - u * u)) * 0.9;
      g.fillStyle(this.tint(AMB.bone), alpha);
      g.fillPoints([
        new Phaser.Geom.Point(px - 1.4, py),
        new Phaser.Geom.Point(px + 1.4, py),
        new Phaser.Geom.Point(px, py + 5 - Math.abs(u) * 1.6),
      ], true);
    }
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const crown = y - 18;

    // ── Hair ──
    // A shock of matted hair in wedges, so the head is not a bald circle under the shards.
    for (let i = 0; i < 7; i++) {
      const ang = -Math.PI + (i / 6) * Math.PI;
      const len = 9 + jitter(this.seed, i) * 6;
      g.fillStyle(this.tint(AMB.hideDark), alpha * 0.95);
      g.fillPoints([
        new Phaser.Geom.Point(x + Math.cos(ang) * 8, crown + 6 + Math.sin(ang) * 3),
        new Phaser.Geom.Point(x + Math.cos(ang - 0.2) * (8 + len), crown + 4 + Math.sin(ang - 0.2) * len),
        new Phaser.Geom.Point(x + Math.cos(ang + 0.25) * 9, crown + 7 + Math.sin(ang + 0.25) * 3),
      ], true);
    }

    // ── Amber shards ──
    // Growing out of him at angles that ignore his posture. Length and count both ride `pack`,
    // and the biggest ones carry something dead inside.
    const count = 5 + Math.round(this.pack * 4);
    for (let i = 0; i < count; i++) {
      const ang = -2.6 + (i / Math.max(1, count - 1)) * 2.1 + jitter(this.seed, 40 + i) * 0.5;
      const root = 11 + jitter(this.seed, 50 + i) * 3;
      const len = (7 + jitter(this.seed, 60 + i) * 8) * (0.7 + this.pack * 0.7);
      const bx = x + Math.cos(ang) * root;
      const by = y - 4 + Math.sin(ang) * root * 0.8;
      const tx = bx + Math.cos(ang) * len;
      const ty = by + Math.sin(ang) * len;
      const w = 2.4 + jitter(this.seed, 70 + i) * 2;

      g.fillStyle(this.tint(AMB.resinDeep), alpha * 0.95);
      g.fillPoints([
        new Phaser.Geom.Point(bx + Math.cos(ang + 1.57) * w, by + Math.sin(ang + 1.57) * w),
        new Phaser.Geom.Point(tx, ty),
        new Phaser.Geom.Point(bx + Math.cos(ang - 1.57) * w, by + Math.sin(ang - 1.57) * w),
      ], true);
      g.fillStyle(this.tint(AMB.resin), alpha * (0.7 + this.flare * 0.3));
      g.fillPoints([
        new Phaser.Geom.Point(bx + Math.cos(ang + 1.57) * w * 0.55, by + Math.sin(ang + 1.57) * w * 0.55),
        new Phaser.Geom.Point(bx + (tx - bx) * 0.82, by + (ty - by) * 0.82),
        new Phaser.Geom.Point(bx + Math.cos(ang - 1.57) * w * 0.55, by + Math.sin(ang - 1.57) * w * 0.55),
      ], true);
      if (i % 3 === 0 && len > 9) {
        g.fillStyle(this.tint(AMB.ink), alpha * 0.7);
        g.fillEllipse(bx + (tx - bx) * 0.45, by + (ty - by) * 0.45, w * 0.7, w * 0.5);
      }
    }

    // Full pack: a crown of shards over the head.
    if (this.pack > 0.55) {
      const k = (this.pack - 0.55) / 0.45;
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI * 0.85 + (i / 4) * Math.PI * 0.7;
        const len = 8 + Math.sin(this.t * 2 + i) * 1.6;
        g.fillStyle(this.tint(AMB.resinLit), alpha * k * 0.9);
        g.fillPoints([
          new Phaser.Geom.Point(x + Math.cos(ang) * 9 - 2, crown + 2 + Math.sin(ang) * 5),
          new Phaser.Geom.Point(x + Math.cos(ang) * (9 + len), crown + 2 + Math.sin(ang) * (5 + len)),
          new Phaser.Geom.Point(x + Math.cos(ang) * 9 + 2, crown + 4 + Math.sin(ang) * 5),
        ], true);
      }
    }

    // ── The sling ──
    // Cords from the right hand out to wherever the stone is, and the stone drawn at a size and
    // heat that both ride the charge — the only wind-up meter the ability has.
    if (this.stone) {
      const hx = this.armX[1];
      const hy = this.armY[1];
      slingCord(g, this.tint, hx, hy, this.stone.x, this.stone.y, alpha,
        { taut: 0.35 + this.charge * 0.65, seed: this.seed });
      amberChunk(g, this.tint, this.stone.x, this.stone.y, 6 + this.charge * 6, alpha,
        { seed: this.seed, spin: this.t * (2 + this.charge * 10), alive: this.charge > 0.7, hot: this.charge });
    }

    // Mastered: a slab of amber across the shoulders with a whole insect in it.
    if (this.mastered) {
      amberChunk(g, this.tint, x - 12, y - 14, 8, alpha * 0.95,
        { seed: this.seed + 4, spin: this.t * 0.4, alive: true, hot: 0.4 });
    }
  }

  /**
   * The sling's hold. `draw` is close but it pulses in and out, which is wrong for an arm that is
   * describing a circle — so the firing hand is pinned out along the swing at a fixed radius and
   * the off hand is tucked in tight against the chest for balance.
   */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'draw') return null;
    if (side > 0) {
      return { ang: this.holdAngle, dist: 28, scale: idle.scale * (1.05 + this.charge * 0.3) };
    }
    return { ang: this.holdAngle + Math.PI * 0.8, dist: 15, scale: idle.scale * 0.9 };
  }
}
