import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Illusion draws.
 *
 * The element's whole claim is that what you see is not where the danger is, so nothing here
 * is allowed to sit still and be trusted. Every primitive is built out of *two* passes that
 * disagree with each other by a few pixels — a bright one and a lagging ghost — because a
 * clean, single-pass shape reads as solid, and solid is exactly what Illusion never is.
 *
 * The three shapes at the bottom (square, star, rhombus) are the one exception: when a
 * Tesseract folds somebody into one of them, that shape has to be instantly, flatly legible
 * from across the arena, because it is telling the player their hitbox just grew.
 */

export type IllusionColorFn = ColorFn;

export const ILL = {
  /** The dark behind a fold — the colour of the space that isn't there. */
  voidDark: 0x160b26,
  voidDeep: 0x2a1147,
  /** The element colour. */
  violet: 0xb45cff,
  violetDim: 0x7a3bb5,
  magenta: 0xff4dd2,
  /** Crack Shot. The one genuinely solid thing the element throws. */
  crimson: 0xff3b4a,
  crimsonDeep: 0x8e1420,
  /** Tesseract — the fourth-dimensional read. */
  cyan: 0x4de8ff,
  cyanDeep: 0x156d84,
  /** Illusion Veil. */
  warp: 0x8a6cff,
  spark: 0xfff0ff,
  ghost: 0xd9c2ff,
};

/** The three things a Tesseract can fold somebody into. */
export type ShapeKind = 'square' | 'star' | 'rhombus';

export const SHAPE_LABEL: Record<ShapeKind, string> = {
  square: 'SQUARE', star: 'STAR', rhombus: 'RHOMBUS',
};

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * Deterministic 0–1 noise. Anything that has to wobble the same way on every frame of its
 * life (a crack in the wall, a pane of warped space) carries a seed and asks this.
 */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 91.3 + i * 271.9) * 39187.7351;
  return v - Math.floor(v);
}

/**
 * A fracture: the line a bullet leaves when it splits against something. Subdivided and
 * kicked sideways at each joint, then drawn twice — once hot and thin, once wide and dim —
 * so it reads as a split in the world rather than a drawn stroke.
 */
export function fracture(
  g: Phaser.GameObjects.Graphics,
  tint: IllusionColorFn,
  x0: number, y0: number, x1: number, y1: number,
  width: number, color: number, alpha: number, seed: number, chaos = 1,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const steps = Math.max(3, Math.min(11, Math.round(len / 26)));

  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Ends are pinned: a crack that doesn't start at the muzzle and finish at the target
    // stops being a line between two things and becomes decoration.
    const kick = i === 0 || i === steps ? 0 : (jitter(seed, i) - 0.5) * len * 0.09 * chaos;
    pts.push({ x: x0 + dx * t + nx * kick, y: y0 + dy * t + ny * kick });
  }

  g.lineStyle(width * 3, tint(color), alpha * 0.16);
  for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
  g.lineStyle(width, tint(color), alpha * 0.9);
  for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
  g.lineStyle(Math.max(1, width * 0.4), tint(ILL.spark), alpha);
  for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);

  // Splinters shed off the joints — the part that sells "this broke" over "this was drawn".
  for (let i = 1; i < pts.length - 1; i++) {
    if (jitter(seed, 40 + i) > 0.55) continue;
    const spur = 5 + jitter(seed, 60 + i) * 11;
    const side = jitter(seed, 80 + i) > 0.5 ? 1 : -1;
    g.lineStyle(Math.max(1, width * 0.5), tint(color), alpha * 0.6);
    g.lineBetween(pts[i].x, pts[i].y, pts[i].x + nx * spur * side, pts[i].y + ny * spur * side);
  }
}

/**
 * The Illusion Veil: a slab of space that has come loose. Drawn as a stack of scanlines each
 * slid a different distance along the pane — the classic "the picture behind this is sheared"
 * read — inside a bright rim with corner ticks so its edges are unambiguous, because a player
 * needs to know exactly where their own shot will start bending.
 */
export function warpPane(
  g: Phaser.GameObjects.Graphics,
  tint: IllusionColorFn,
  cx: number, cy: number, ang: number,
  halfLen: number, halfThick: number,
  t: number, alpha: number, seed: number,
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  // Along the pane's length, and across its thickness.
  const lx = ca; const ly = sa;
  const tx = -sa; const ty = ca;

  const corner = (u: number, v: number) =>
    new Phaser.Geom.Point(cx + lx * u + tx * v, cy + ly * u + ty * v);

  // The body: dim, so what shows through it still reads.
  g.fillStyle(tint(ILL.voidDeep), alpha * 0.3);
  g.fillPoints([
    corner(-halfLen, -halfThick), corner(halfLen, -halfThick),
    corner(halfLen, halfThick), corner(-halfLen, halfThick),
  ], true);

  // Sheared scanlines. Each slides on its own phase, so the whole pane crawls.
  const lines = 11;
  for (let i = 0; i < lines; i++) {
    const v = -halfThick + (halfThick * 2) * ((i + 0.5) / lines);
    const phase = t * (1.4 + jitter(seed, i) * 2.2) + jitter(seed, 30 + i) * TAU;
    const slide = Math.sin(phase) * halfLen * 0.24;
    const w = halfLen * (0.36 + jitter(seed, 60 + i) * 0.5);
    const a0 = Phaser.Math.Clamp(slide - w, -halfLen, halfLen);
    const a1 = Phaser.Math.Clamp(slide + w, -halfLen, halfLen);
    if (a1 - a0 < 2) continue;
    g.lineStyle(Math.max(1.4, (halfThick * 2) / lines - 0.6), tint(i % 3 === 0 ? ILL.magenta : ILL.warp),
      alpha * (0.24 + 0.3 * Math.abs(Math.sin(phase))));
    const p0 = corner(a0, v);
    const p1 = corner(a1, v);
    g.lineBetween(p0.x, p0.y, p1.x, p1.y);
  }

  // Rim + corner ticks.
  g.lineStyle(2, tint(ILL.warp), alpha * 0.85);
  const c0 = corner(-halfLen, -halfThick);
  const c1 = corner(halfLen, -halfThick);
  const c2 = corner(halfLen, halfThick);
  const c3 = corner(-halfLen, halfThick);
  g.lineBetween(c0.x, c0.y, c1.x, c1.y);
  g.lineBetween(c2.x, c2.y, c3.x, c3.y);
  g.lineStyle(2.4, tint(ILL.spark), alpha * 0.9);
  const tick = Math.min(14, halfLen * 0.24);
  for (const [c, dir] of [[c0, 1], [c1, -1], [c2, -1], [c3, 1]] as [Phaser.Geom.Point, number][]) {
    g.lineBetween(c.x, c.y, c.x + lx * tick * dir, c.y + ly * tick * dir);
  }
}

/**
 * A tesseract — a 4-cube, drawn the only way a 2D screen can honestly draw one: an outer
 * square, an inner square turning the other way, and struts joining their corners. The two
 * squares counter-rotate, which is what makes the strut cage appear to turn inside out.
 */
export function tesseract(
  g: Phaser.GameObjects.Graphics,
  tint: IllusionColorFn,
  x: number, y: number, size: number, spin: number, alpha: number,
  color = ILL.cyan,
): void {
  const outer: Phaser.Geom.Point[] = [];
  const inner: Phaser.Geom.Point[] = [];
  // The inner cube breathes, so the projection never settles into a static logo.
  const innerScale = 0.44 + 0.1 * Math.sin(spin * 2.3);
  for (let i = 0; i < 4; i++) {
    const ao = spin + (i / 4) * TAU + Math.PI / 4;
    const ai = -spin * 1.7 + (i / 4) * TAU + Math.PI / 4;
    outer.push(new Phaser.Geom.Point(x + Math.cos(ao) * size, y + Math.sin(ao) * size));
    inner.push(new Phaser.Geom.Point(x + Math.cos(ai) * size * innerScale, y + Math.sin(ai) * size * innerScale));
  }

  // The hollow behind it: without this the cage floats on the arena floor instead of in it.
  g.fillStyle(tint(ILL.voidDark), alpha * 0.55);
  g.fillPoints(outer, true);

  g.lineStyle(1.4, tint(color), alpha * 0.5);
  for (let i = 0; i < 4; i++) g.lineBetween(outer[i].x, outer[i].y, inner[i].x, inner[i].y);
  g.lineStyle(2.2, tint(color), alpha * 0.95);
  for (let i = 0; i < 4; i++) {
    const n = (i + 1) % 4;
    g.lineBetween(outer[i].x, outer[i].y, outer[n].x, outer[n].y);
  }
  g.lineStyle(2, tint(ILL.spark), alpha * 0.9);
  for (let i = 0; i < 4; i++) {
    const n = (i + 1) % 4;
    g.lineBetween(inner[i].x, inner[i].y, inner[n].x, inner[n].y);
  }
  for (const p of outer) { g.fillStyle(tint(color), alpha); g.fillCircle(p.x, p.y, 2); }
  g.fillStyle(tint(ILL.spark), alpha * 0.8);
  g.fillCircle(x, y, size * 0.13);
}

/** The corner set for one of the three fold-shapes, at radius `r` about (x, y). */
export function shapePoints(kind: ShapeKind, x: number, y: number, r: number, spin = 0): Phaser.Geom.Point[] {
  const pts: Phaser.Geom.Point[] = [];
  if (kind === 'square') {
    for (let i = 0; i < 4; i++) {
      const a = spin + Math.PI / 4 + (i / 4) * TAU;
      pts.push(new Phaser.Geom.Point(x + Math.cos(a) * r, y + Math.sin(a) * r));
    }
  } else if (kind === 'rhombus') {
    for (let i = 0; i < 4; i++) {
      const a = spin + (i / 4) * TAU;
      // Tall and narrow — a rhombus that isn't obviously *not* a square from a distance.
      pts.push(new Phaser.Geom.Point(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 1.12));
    }
  } else {
    for (let i = 0; i < 10; i++) {
      const a = spin - Math.PI / 2 + (i / 10) * TAU;
      const rr = i % 2 === 0 ? r : r * 0.44;
      pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
    }
  }
  return pts;
}

/** A fold-shape drawn as a body: filled dark, rimmed bright, with a second ghost behind it. */
export function shapeBody(
  g: Phaser.GameObjects.Graphics,
  tint: IllusionColorFn,
  kind: ShapeKind,
  x: number, y: number, r: number, spin: number, alpha: number, color = ILL.violet,
): void {
  const ghost = shapePoints(kind, x + Math.cos(spin * 2) * 3, y + Math.sin(spin * 2) * 3, r * 1.1, spin * 0.6);
  g.fillStyle(tint(ILL.magenta), alpha * 0.16);
  g.fillPoints(ghost, true);

  const pts = shapePoints(kind, x, y, r, spin);
  g.fillStyle(tint(ILL.voidDeep), alpha * 0.92);
  g.fillPoints(pts, true);
  g.lineStyle(2.6, tint(color), alpha);
  g.strokePoints(pts, true, true);
  g.lineStyle(1.2, tint(ILL.spark), alpha * 0.75);
  g.strokePoints(shapePoints(kind, x, y, r * 0.74, spin), true, true);
}

/** The theatre mask over the artist's face — and the thing an afterimage is a copy of. */
export function harlequinMask(
  g: Phaser.GameObjects.Graphics,
  tint: IllusionColorFn,
  x: number, y: number, s: number, alpha: number, color = ILL.violet,
): void {
  const brow = y - s * 0.1;
  const face = [
    new Phaser.Geom.Point(x, y - s),
    new Phaser.Geom.Point(x + s * 0.78, brow),
    new Phaser.Geom.Point(x, y + s),
    new Phaser.Geom.Point(x - s * 0.78, brow),
  ];
  g.fillStyle(tint(ILL.voidDark), alpha * 0.9);
  g.fillPoints(face, true);
  g.lineStyle(1.6, tint(color), alpha);
  g.strokePoints(face, true, true);
  // Two slits where eyes would be, and a split down the middle: half lit, half not.
  g.fillStyle(tint(ILL.spark), alpha * 0.9);
  g.fillEllipse(x - s * 0.3, y - s * 0.16, s * 0.34, s * 0.18);
  g.fillEllipse(x + s * 0.3, y - s * 0.16, s * 0.34, s * 0.18);
  g.fillStyle(tint(ILL.magenta), alpha * 0.28);
  g.fillPoints([face[0], face[1], face[2]], true);
}

/**
 * Phantom (R+): the understudy left standing where the illusionist was. Deliberately the one
 * thing this element draws that *is* a figure — a recognisable body, in a colour nothing else
 * here uses, so the moment it appears there is no question about what it is a copy of. It
 * winds tighter as its fuse burns: the ring closes, the seams pull inward, the mask brightens.
 */
export function phantomFigure(
  g: Phaser.GameObjects.Graphics,
  tint: IllusionColorFn,
  x: number, y: number, t: number, charge: number, alpha: number, seed: number,
): void {
  // Charge runs 0 → 1 over the fuse. Everything below reads off it.
  const wind = easeIn(charge);
  const r = 21 * (1 - wind * 0.14);

  g.fillStyle(tint(ILL.crimsonDeep), alpha * (0.36 + wind * 0.3));
  g.fillCircle(x, y, r + 3 + Math.sin(t * 5) * 1.2);
  g.lineStyle(2, tint(ILL.crimson), alpha * (0.6 + wind * 0.4));
  g.strokeCircle(x, y, r);

  // Seams running in from outside the body: the space around it being pulled in.
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + seed * 0.01 + t * 0.6;
    const outer = 46 * (1 - wind * 0.72);
    fracture(g, tint, x + Math.cos(a) * outer, y + Math.sin(a) * outer,
      x + Math.cos(a) * r, y + Math.sin(a) * r, 1.5, ILL.crimson, alpha * (0.3 + wind * 0.5),
      seed + i, 1.5);
  }

  harlequinMask(g, tint, x, y - 2, 8.5, alpha * (0.7 + wind * 0.3), ILL.crimson);

  // The fuse itself: a ring closing onto the body.
  const fuse = 52 - wind * 30;
  g.lineStyle(2.4, tint(ILL.spark), alpha * (0.35 + wind * 0.55));
  const steps = 22;
  let px = 0;
  let py = 0;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * TAU;
    const rr = fuse * (1 + (jitter(seed, i) - 0.5) * 0.1);
    const cx = x + Math.cos(a) * rr;
    const cy = y + Math.sin(a) * rr;
    if (i > 0 && jitter(seed, 50 + i) > 0.22) g.lineBetween(px, py, cx, cy);
    px = cx;
    py = cy;
  }
}

/**
 * Mind-Boggle (F+): the wedge of exposed geometry hanging off a folded body. Drawn as a
 * hatched cone with a bright bead at the apex, because the player has to be able to read
 * *which side* of a spinning shape they are supposed to be standing on, at a glance, while
 * the shape is turning and both of them are moving.
 */
export function weakCone(
  g: Phaser.GameObjects.Graphics,
  tint: IllusionColorFn,
  x: number, y: number, ang: number, half: number, reach: number, alpha: number, t: number,
): void {
  const pulse = 0.75 + 0.25 * Math.sin(t * 6);
  const rim: Phaser.Geom.Point[] = [new Phaser.Geom.Point(x, y)];
  const arcSteps = 7;
  for (let i = 0; i <= arcSteps; i++) {
    const a = ang - half + (half * 2) * (i / arcSteps);
    rim.push(new Phaser.Geom.Point(x + Math.cos(a) * reach, y + Math.sin(a) * reach));
  }
  g.fillStyle(tint(ILL.crimson), alpha * 0.2 * pulse);
  g.fillPoints(rim, true);

  // Hatching across the wedge — the tell that this patch of them is unfinished.
  for (let i = 1; i < 5; i++) {
    const d = reach * (i / 5);
    const a0 = ang - half;
    const a1 = ang + half;
    g.lineStyle(1.2, tint(ILL.crimson), alpha * 0.5 * pulse);
    g.lineBetween(x + Math.cos(a0) * d, y + Math.sin(a0) * d,
      x + Math.cos(a1) * d, y + Math.sin(a1) * d);
  }

  g.lineStyle(1.8, tint(ILL.crimson), alpha * 0.9);
  g.lineBetween(x, y, x + Math.cos(ang - half) * reach, y + Math.sin(ang - half) * reach);
  g.lineBetween(x, y, x + Math.cos(ang + half) * reach, y + Math.sin(ang + half) * reach);
  g.lineStyle(2.2, tint(ILL.spark), alpha * pulse);
  g.lineBetween(x + Math.cos(ang) * reach * 0.55, y + Math.sin(ang) * reach * 0.55,
    x + Math.cos(ang) * reach, y + Math.sin(ang) * reach);
  g.fillStyle(tint(ILL.spark), alpha * pulse);
  g.fillCircle(x + Math.cos(ang) * reach, y + Math.sin(ang) * reach, 2.6);
}

/**
 * One Blade Dance dagger. A stage prop and a real knife at the same time: a solid violet
 * blade with its own lagging copy behind it, which is the element's whole visual grammar
 * applied to the one thing in the kit that is a straightforward stab.
 */
export function illusionDagger(
  g: Phaser.GameObjects.Graphics,
  tint: IllusionColorFn,
  x: number, y: number, ang: number, size: number, alpha: number,
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const blade = (bx: number, by: number, s: number, a: number, color: number) => {
    const pts = [
      new Phaser.Geom.Point(bx + ca * s, by + sa * s),
      new Phaser.Geom.Point(bx - sa * s * 0.26, by + ca * s * 0.26),
      new Phaser.Geom.Point(bx - ca * s * 0.55, by - sa * s * 0.55),
      new Phaser.Geom.Point(bx + sa * s * 0.26, by - ca * s * 0.26),
    ];
    g.fillStyle(tint(color), a);
    g.fillPoints(pts, true);
    g.lineStyle(1.2, tint(ILL.spark), a * 0.8);
    g.strokePoints(pts, true, true);
  };

  // The ghost first, trailing behind the point of travel.
  blade(x - ca * size * 0.5, y - sa * size * 0.5, size * 0.9, alpha * 0.3, ILL.magenta);
  blade(x, y, size, alpha * 0.95, ILL.violet);

  // Crossguard and grip, so it reads as a thrown weapon rather than a shard.
  g.lineStyle(2.4, tint(ILL.crimson), alpha * 0.9);
  g.lineBetween(x - ca * size * 0.5 - sa * size * 0.34, y - sa * size * 0.5 + ca * size * 0.34,
    x - ca * size * 0.5 + sa * size * 0.34, y - sa * size * 0.5 - ca * size * 0.34);
  g.lineStyle(2, tint(ILL.voidDark), alpha * 0.9);
  g.lineBetween(x - ca * size * 0.5, y - sa * size * 0.5, x - ca * size * 0.95, y - sa * size * 0.95);
}

// ── Fx ────────────────────────────────────────────────────────────────────

export class IllusionFx extends FxBase {
  /** Splinters of a broken image, thrown outward and fading. */
  shards(x: number, y: number, count: number, spread: number, color = ILL.violet, ms = 460, depth = 9): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      a: Math.random() * TAU,
      d: spread * (0.4 + Math.random() * 0.6),
      len: 5 + Math.random() * 9,
      s: i * 17.3 + Math.random() * 90,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        const px = x + Math.cos(p.a) * p.d * e;
        const py = y + Math.sin(p.a) * p.d * e;
        g.lineStyle(1.8 * (1 - t) + 0.4, this.tint(color), (1 - t) * 0.85);
        g.lineBetween(px, py, px + Math.cos(p.a) * p.len, py + Math.sin(p.a) * p.len);
      }
    });
  }

  /** Somebody left this spot. The silhouette collapses inward into the point they went from. */
  blinkOut(x: number, y: number, color = ILL.violet, depth = 6): void {
    const seed = Math.random() * 999;
    this.anim(depth, 280, (g, t) => {
      const e = easeIn(t);
      const r = 26 * (1 - e);
      g.lineStyle(2.4, this.tint(color), (1 - t) * 0.9);
      g.strokeCircle(x, y, r + 6);
      g.fillStyle(this.tint(ILL.voidDeep), (1 - t) * 0.5);
      g.fillCircle(x, y, r);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + jitter(seed, i) * 0.8;
        fracture(g, this.tint, x + Math.cos(a) * 44 * (1 - e), y + Math.sin(a) * 44 * (1 - e),
          x, y, 1.6, color, (1 - t) * 0.8, seed + i, 1.4);
      }
    });
    this.shards(x, y, 7, 34, color, 380, depth + 2);
  }

  /** …and arrived here. The same figure, unfolding out of nothing. */
  blinkIn(x: number, y: number, color = ILL.magenta, depth = 6): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, 18, ILL.spark, color, depth + 3);
    this.anim(depth + 2, 340, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(3 * (1 - t) + 0.6, this.tint(color), (1 - t) * 0.95);
      g.strokeCircle(x, y, 8 + e * 40);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + seed * 0.01;
        const d = 10 + e * 36;
        g.lineStyle(2, this.tint(ILL.spark), (1 - t) * 0.7);
        g.lineBetween(x + Math.cos(a) * d * 0.4, y + Math.sin(a) * d * 0.4,
          x + Math.cos(a) * d, y + Math.sin(a) * d);
      }
    });
  }

  /** The hitscan a cracked bullet sends at whoever it missed. */
  crackBeam(x0: number, y0: number, x1: number, y1: number, color = ILL.crimson, depth = 9): void {
    const seed = Math.random() * 999;
    this.anim(depth, 260, (g, t) => {
      fracture(g, this.tint, x0, y0, x1, y1, 3 * (1 - t) + 1, color, 1 - t, seed, 0.7);
    });
    this.flashIn(x1, y1, 12, ILL.spark, color, depth);
  }

  /** A bullet meeting the wall: the impact star plus the crack that runs away from it. */
  wallCrack(x: number, y: number, inwardAng: number, color = ILL.crimson, depth = 8): void {
    const seed = Math.random() * 999;
    this.anim(depth, 520, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 5; i++) {
        const a = inwardAng + Math.PI + (jitter(seed, i) - 0.5) * 2.4;
        const len = (16 + jitter(seed, 20 + i) * 26) * e;
        fracture(g, this.tint, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len,
          2, color, (1 - t) * 0.9, seed + i * 3, 1.6);
      }
    });
    this.shards(x, y, 6, 26, color, 420, depth);
  }

  /** A Tesseract landing: the cage collapses onto the target and folds them. */
  fold(x: number, y: number, color = ILL.cyan, depth = 10): void {
    this.flashIn(x, y, 22, ILL.spark, color, depth);
    this.anim(depth, 480, (g, t) => {
      const e = easeOut(t);
      tesseract(g, this.tint, x, y, 40 * (1 - e * 0.75), t * 9, 1 - t, color);
      g.lineStyle(2, this.tint(ILL.magenta), (1 - t) * 0.6);
      g.strokeCircle(x, y, 14 + e * 46);
    });
    this.shards(x, y, 9, 40, color, 520, depth);
  }

  /** Immersion Breaker: a bullet coming out the far side of somebody. */
  pierceSpray(x: number, y: number, through: number, color = ILL.crimson, depth = 9): void {
    const seed = Math.random() * 999;
    this.anim(depth, 300, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 5; i++) {
        const a = through + (jitter(seed, i) - 0.5) * 1.1;
        const d = (10 + jitter(seed, 20 + i) * 30) * e;
        g.lineStyle(2 * (1 - t) + 0.5, this.tint(color), (1 - t) * 0.9);
        g.lineBetween(x, y, x + Math.cos(a) * d, y + Math.sin(a) * d);
      }
    });
    this.flashIn(x, y, 13, ILL.spark, color, depth);
  }

  /** A Crack Shot splitting in two across a pane. */
  split(x: number, y: number, ang: number, spread: number, color = ILL.warp, depth = 9): void {
    this.anim(depth, 320, (g, t) => {
      const e = easeOut(t);
      for (const side of [-1, 1]) {
        const a = ang + spread * side;
        g.lineStyle(2.4 * (1 - t) + 0.6, this.tint(color), (1 - t) * 0.9);
        g.lineBetween(x, y, x + Math.cos(a) * 34 * e, y + Math.sin(a) * 34 * e);
      }
      g.fillStyle(this.tint(ILL.spark), (1 - t) * 0.8);
      g.fillCircle(x, y, 4 * (1 - t) + 1);
    });
    this.shards(x, y, 4, 20, color, 320, depth);
  }

  /** The Phantom going off: the understudy tears itself apart and the tear spreads. */
  phantomBurst(x: number, y: number, radius: number, depth = 10): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, 26, ILL.spark, ILL.crimson, depth);
    this.anim(depth, 620, (g, t) => {
      const e = easeOut(t);
      const a = 1 - t;
      g.fillStyle(this.tint(ILL.crimsonDeep), a * 0.28);
      g.fillCircle(x, y, radius * (0.25 + e * 0.85));
      g.lineStyle(3 * a + 1, this.tint(ILL.crimson), a * 0.85);
      g.strokeCircle(x, y, radius * (0.2 + e));
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * TAU + jitter(seed, i) * 0.7;
        const d = radius * (0.3 + e * 0.95);
        fracture(g, this.tint, x, y, x + Math.cos(ang) * d, y + Math.sin(ang) * d,
          2, ILL.crimson, a * 0.8, seed + i * 5, 1.5);
      }
      // The figure itself, breaking up as it goes.
      harlequinMask(g, this.tint, x, y - 2, 8.5 * (1 + e * 0.5), a * 0.7, ILL.crimson);
    });
    this.shards(x, y, 11, radius * 0.8, ILL.crimson, 620, depth);
  }

  /** A dagger arriving. Short, hard, and pointed the way it was travelling. */
  stab(x: number, y: number, ang: number, depth = 10): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, 16, ILL.spark, ILL.violet, depth);
    this.anim(depth, 340, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 4; i++) {
        const a = ang + Math.PI + (jitter(seed, i) - 0.5) * 1.6;
        fracture(g, this.tint, x, y, x + Math.cos(a) * 26 * e, y + Math.sin(a) * 26 * e,
          1.8, ILL.magenta, (1 - t) * 0.85, seed + i, 1.3);
      }
    });
  }

  /** A warped ring — casts and expiries. Never quite a circle, because nothing here is. */
  ring(x: number, y: number, r0: number, r1: number, color = ILL.violet, ms = 420, depth = 9): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      const r = r0 + (r1 - r0) * easeOut(t);
      const steps = 26;
      let px = 0;
      let py = 0;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * TAU;
        const rr = r * (1 + (jitter(seed, i) - 0.5) * 0.13);
        const cx = x + Math.cos(a) * rr;
        const cy = y + Math.sin(a) * rr;
        if (i > 0 && jitter(seed, 90 + i) > 0.16) {
          g.lineStyle(2.2, this.tint(color), (1 - t) * 0.85);
          g.lineBetween(px, py, cx, cy);
        }
        px = cx;
        py = cy;
      }
    });
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const ILLUSION_AVATAR: AvatarSpec = {
  hands: [
    { r: 12, color: ILL.violet, alpha: 0.2 },
    { r: 7, color: ILL.magenta, alpha: 0.9 },
    { r: 2.6, color: ILL.spark, alpha: 0.95, ox: -1.6, oy: -1.6 },
  ],
  eyeWhite: ILL.spark,
  eyePupil: ILL.voidDark,
  squash: { div: 12, x: 0.55, y: 0.3 },
};

/**
 * The illusionist: a masked figure that is never entirely in one place. Two afterimages of
 * the body drift out to either side and lag behind the real one, and while an ability is
 * running they drift further — so the character visibly becomes harder to locate at exactly
 * the moments it is hardest to hit. The mask floats at the crown so it never covers the eyes.
 */
export class IllusionAvatar extends BaseAvatar {
  /** 0–1: how far the afterimages have separated from the body. */
  private split = 0;
  private splitTarget = 0;
  /** Extra copies granted while Illusion Dance is running. */
  private echoes = 2;
  private seed = Math.random() * 999;

  constructor(scene: Phaser.Scene, tint: IllusionColorFn, depth = 6) {
    super(scene, tint, depth, ILLUSION_AVATAR);
  }

  /** True while the character is untouchable or mid-ability — the copies spread out. */
  setScattered(on: boolean): void { this.splitTarget = on ? 1 : 0; }

  /** How many afterimages trail the body. Dance pushes this up. */
  setEchoes(n: number): void { this.echoes = n; }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.split += (this.splitTarget - this.split) * Math.min(1, delta / 200);
    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 15 : 12);
      glow.setAlpha(on ? 0.32 : 0.2);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new IllusionFx(this.scene, this.tint).shards(x, y, 1, 7, ILL.violet, 320, 4);
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    // The floor under an illusionist doesn't lie flat — it ripples in rings that don't close.
    g.fillStyle(this.tint(ILL.violet), a * (0.08 + this.split * 0.1));
    g.fillEllipse(x, y + 13, 48 + this.split * 16, 18);
    for (let i = 0; i < 3; i++) {
      const r = 15 + i * 9 + Math.sin(this.t * 2.2 + i) * 3;
      g.lineStyle(1.4, this.tint(i === 1 ? ILL.magenta : ILL.warp), a * (0.22 - i * 0.05));
      const steps = 16;
      let px = 0;
      let py = 0;
      for (let s = 0; s <= steps; s++) {
        const ang = (s / steps) * TAU;
        const cx = x + Math.cos(ang) * r;
        const cy = y + 13 + Math.sin(ang) * r * 0.38;
        if (s > 0 && jitter(this.seed + i, s) > 0.24) g.lineBetween(px, py, cx, cy);
        px = cx;
        py = cy;
      }
    }
  }

  /**
   * The afterimages. Drawn on the body layer — under the eyes, over the sprite — so the real
   * face always stays readable on top of its own copies.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const n = this.echoes;
    for (let i = 0; i < n; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const rank = Math.floor(i / 2) + 1;
      const lag = this.t * 2.4 + i * 1.7;
      const off = (7 + rank * 7) * (0.35 + this.split * 0.85) * side;
      const gx = x + off + Math.sin(lag) * 2.4;
      const gy = y + Math.cos(lag * 0.8) * 3;
      const fade = alpha * (0.3 - rank * 0.06) * (0.4 + this.split * 0.6);
      if (fade <= 0.01) continue;
      g.fillStyle(this.tint(ILL.violet), fade);
      g.fillCircle(gx, gy, 21);
      g.lineStyle(1.4, this.tint(ILL.magenta), fade * 1.5);
      g.strokeCircle(gx, gy, 21);
      harlequinMask(g, this.tint, gx, gy - 3, 8, fade * 1.4);
    }
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    // The mask itself, hovering at the crown and tilting with the aim.
    const bob = Math.sin(this.t * 2.4) * 2;
    harlequinMask(g, this.tint, x, y - 26 + bob, 9.5 + (this.mastered ? 2 : 0), alpha);

    // A prism shard held in each hand, turning independently — the tell that the hands are
    // doing the refracting rather than throwing anything.
    for (let i = 0; i < 2; i++) {
      const hx = this.armX[i];
      const hy = this.armY[i];
      const spin = this.t * (2.2 + i * 0.7);
      const pts: Phaser.Geom.Point[] = [];
      for (let k = 0; k < 3; k++) {
        const ang = spin + (k / 3) * TAU;
        pts.push(new Phaser.Geom.Point(hx + Math.cos(ang) * 6.5, hy + Math.sin(ang) * 6.5));
      }
      g.fillStyle(this.tint(ILL.cyan), alpha * 0.55);
      g.fillPoints(pts, true);
      g.lineStyle(1.2, this.tint(ILL.spark), alpha * 0.8);
      g.strokePoints(pts, true, true);
    }
  }
}
