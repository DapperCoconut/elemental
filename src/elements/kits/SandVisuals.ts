import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU } from './ElementVisuals';

/**
 * Everything Sand draws.
 *
 * Two rules run through the whole file.
 *
 * The first is **grain**. Nothing here is a smooth fill. Every sand surface is stippled with
 * short quads at deterministic offsets, so a dune, a beam and a bridge deck all read as the same
 * material seen at three sizes. Stone is the opposite — flat faces, hard chisel lines, no
 * stipple — which is what keeps a grey block and a sandstone pillar apart at a glance.
 *
 * The second is **the height rule**, and it is the whole reason the element works in a top-down
 * arena: *a shadow's distance below a thing is that thing's height*. A pillar's own footprint
 * shadow sits `z * LIFT` pixels below its top face; a jumping fighter's shadow slides the same
 * distance below their feet. There is no second visual language for altitude — no numbers on
 * screen, no side view. Learn the one rule and you can read the whole obby.
 *
 * A platform's (x, y) is therefore its **top face**, not its base: you stand where it is drawn.
 * The column body is extruded *downward* from there, toward the viewer, and the shadow lands
 * past the bottom of it.
 */

export type SandColorFn = ColorFn;

/** Screen pixels of downward shadow offset per unit of height. The height rule, as a number. */
export const LIFT = 0.62;

export const SND = {
  /** Loose sand — the element's base, and the colour of anything in flight. */
  sand: 0xe8c87a,
  deep: 0xc9a05a,
  dark: 0x8f6b38,
  shadow: 0x3a2a18,
  /** Sandstone that has been cut and stacked: warmer and more saturated than loose sand. */
  stoneWarm: 0xd9ab63,
  stoneWarmLit: 0xf0cd8e,
  /** The one grey block in every course — deliberately cold, so "you can start here" is obvious. */
  stoneGrey: 0x8d8b86,
  stoneGreyLit: 0xb6b3ad,
  gold: 0xffd54a,
  goldHot: 0xfff3bc,
  poison: 0x74c23a,
  poisonDeep: 0x2f5c18,
  /** Gun furniture: browned iron and oiled walnut. */
  iron: 0x554a44,
  ironLit: 0x8e8078,
  wood: 0x7a4a24,
  /** A timer about to run out — a bridge on its last second, a fall about to be charged for. */
  expire: 0xd9564a,
  maw: 0x6b2a2a,
  /** The Final Trail's lava, from the cool crust at its edge to the white at its heart. */
  lava: 0xd4441c,
  lavaHot: 0xffb03a,
  lavaCrust: 0x4a1e10,
  /**
   * Tempered Temptation. Sand that has been through the fire comes out the opposite of sand:
   * cold, sharp, see-through, and the same colour whichever way the light hits it. Nothing in
   * the glass palette is warm, which is the whole tell — a tempered course reads as *not desert*
   * at a glance, from the other side of the arena.
   */
  glass: 0x9fe4dc,
  glassLit: 0xe6fffb,
  glassDeep: 0x2f6f78,
  /** The flamethrowers that open up across a tempered course's gaps. */
  flame: 0xff8a2b,
  flameHot: 0xffe08a,
};

/** Deterministic 0–1 noise, so a block chips the same way every frame. */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 47.13 + i * 167.77) * 20233.517;
  return v - Math.floor(v);
}

/** Scale a colour's channels. Used for the shading on a column's dark face. */
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
 * The stipple every sand surface gets: `n` short grains scattered inside a radius, each one a
 * tiny quad rather than a dot so they catch the eye as *edges*. Deterministic in `seed`, so a
 * dune does not boil between frames.
 */
export function grains(
  g: Phaser.GameObjects.Graphics,
  tint: SandColorFn,
  x: number, y: number, r: number, n: number, alpha: number,
  { seed = 0, color = SND.deep, size = 1.6, drift = 0 } = {},
): void {
  g.fillStyle(tint(color), alpha);
  for (let i = 0; i < n; i++) {
    const a = jitter(seed, i * 3) * TAU;
    const d = Math.sqrt(jitter(seed, i * 3 + 1)) * r;
    const s = size * (0.6 + jitter(seed, i * 3 + 2) * 0.9);
    g.fillRect(x + Math.cos(a) * d + drift, y + Math.sin(a) * d, s, s * 1.4);
  }
}

/**
 * A chiselled block, seen from above with its body extruded toward the viewer.
 *
 * Three parts, in the order they have to be painted: the footprint shadow (down at
 * `z * LIFT`, which *is* the height read), the column body between the top face and the
 * shadow, and finally the top face itself — a hexagon rather than a circle, because a cut
 * block should have corners and the corners are what sell "I can land on this".
 *
 * `grey` swaps the palette to the cold stone reserved for the one starter block per course.
 *
 * `glass` is Tempered Temptation's repaint of the same block: the shaft goes translucent and
 * loses its masonry for vertical facets, and the top face gains a cut-gem rosette. `crumble`
 * (0–1) is how far a tempered slab is through the two and a half seconds it will hold under
 * your feet — it opens cracks across the face and shivers, so the warning is on the block
 * rather than in the HUD.
 */
export function pillar(
  g: Phaser.GameObjects.Graphics,
  tint: SandColorFn,
  x: number, y: number, r: number, z: number, alpha: number,
  { seed = 0, grey = false, lit = 0, t = 0, glass = false, crumble = 0 } = {},
): void {
  const drop = z * LIFT;
  const face = glass ? SND.glass : grey ? SND.stoneGrey : SND.stoneWarm;
  const faceLit = glass ? SND.glassLit : grey ? SND.stoneGreyLit : SND.stoneWarmLit;
  // A slab about to go shivers on the spot. Half a pixel is plenty at this size.
  const sx = crumble > 0 ? x + Math.sin(t * 44 + seed) * crumble * 1.4 : x;

  // ── Footprint shadow ──
  // Glass barely casts one: the light goes through it. That difference alone tells you which
  // half of a tempered course is still sandstone.
  g.fillStyle(tint(SND.shadow), alpha * (glass ? 0.15 : 0.34));
  g.fillEllipse(sx, y + drop, r * 1.9, r * 0.78);

  // ── Column body ──
  // Two quads: the lit half toward the light (up-left) and the dark half away from it, split
  // down the middle so a tall pillar has a readable round-ness rather than being a flat slab.
  const hx = r * 0.94;
  const bodyA = alpha * (glass ? 0.6 : 1);
  for (const side of [-1, 1] as const) {
    g.fillStyle(shade(tint(face), side < 0 ? 0.72 : 0.48), bodyA);
    g.fillPoints([
      new Phaser.Geom.Point(sx + (side < 0 ? -hx : 0), y),
      new Phaser.Geom.Point(sx + (side < 0 ? 0 : hx), y),
      new Phaser.Geom.Point(sx + (side < 0 ? 0 : hx) * 0.86, y + drop),
      new Phaser.Geom.Point(sx + (side < 0 ? -hx : 0) * 0.86, y + drop),
    ], true);
  }
  if (glass) {
    // Facets rather than strata: long vertical highlights down the shaft, because a glass
    // column is read by what slides down it, not by what is stacked in it.
    for (let i = 0; i < 5; i++) {
      const u = (i / 4 - 0.5) * 1.7;
      const w = hx * (0.06 + jitter(seed, i + 3) * 0.09);
      g.fillStyle(tint(i % 2 ? SND.glassLit : SND.glassDeep), alpha * 0.32);
      g.fillPoints([
        new Phaser.Geom.Point(sx + hx * u - w, y),
        new Phaser.Geom.Point(sx + hx * u + w, y),
        new Phaser.Geom.Point(sx + hx * u * 0.86 + w * 0.7, y + drop),
        new Phaser.Geom.Point(sx + hx * u * 0.86 - w * 0.7, y + drop),
      ], true);
    }
  } else {
    // Strata: horizontal courses of masonry down the shaft. Spaced by height so a 190-tall
    // pillar genuinely looks taller than a 55 rather than just longer.
    const bands = Math.max(1, Math.round(drop / 13));
    g.fillStyle(shade(tint(face), 0.34), alpha * 0.7);
    for (let i = 1; i <= bands; i++) {
      const yy = y + (drop * i) / (bands + 1);
      const w = hx * (1 - (i / (bands + 2)) * 0.14);
      g.fillRect(sx - w, yy, w * 2, 1.6);
    }
  }

  // ── Top face ──
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.26;
    const rr = r * (0.9 + jitter(seed, i) * 0.18);
    pts.push(new Phaser.Geom.Point(sx + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.62));
  }
  g.fillStyle(tint(face), alpha * (glass ? 0.8 : 1));
  g.fillPoints(pts, true);
  // Inner inset, so the block has a lip you can see your feet land on.
  g.fillStyle(tint(faceLit), alpha * (0.5 + lit * 0.5));
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(sx + (p.x - sx) * 0.7, y + (p.y - y) * 0.7)), true);
  if (glass) {
    // Cut-gem rosette: every corner of the hexagon drawn back to the middle, so the face reads
    // as one faceted stone rather than as a recoloured slab.
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      g.fillStyle(tint(i % 2 ? SND.glassLit : SND.glassDeep), alpha * (0.16 + 0.12 * Math.sin(t * 2 + i + seed)));
      g.fillPoints([new Phaser.Geom.Point(sx, y), p, q], true);
    }
    g.lineStyle(1, tint(SND.glassLit), alpha * 0.55);
    g.strokePoints(pts, true, true);
  } else if (!grey) {
    grains(g, tint, sx, y, r * 0.6, 9, alpha * 0.5, { seed: seed + 7, color: SND.dark, size: 1.3 });
  }

  // ── About to shatter ──
  // Cracks walking out from the middle of the face, opening as the clock runs down.
  if (crumble > 0) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + jitter(seed, i + 11) * 0.7;
      const len = r * crumble * (0.7 + jitter(seed, i + 19) * 0.5);
      g.lineStyle(1.4 + crumble * 1.4, tint(SND.glassDeep), alpha * (0.35 + crumble * 0.5));
      g.lineBetween(sx, y, sx + Math.cos(a) * len, y + Math.sin(a) * len * 0.62);
    }
    g.lineStyle(2.6 * crumble, tint(SND.expire), alpha * crumble * (0.4 + 0.4 * Math.sin(t * 12)));
    g.strokePoints(pts, true, true);
  }

  // Occupied rim: a bright ring lit from the inside while somebody is standing here. This is
  // the second half of the height read — the shadow says how high, the rim says which one.
  if (lit > 0) {
    g.lineStyle(2.4, tint(glass ? SND.glassLit : SND.goldHot), alpha * lit * (0.65 + 0.25 * Math.sin(t * 7)));
    g.strokePoints(pts, true, true);
  }
}

/**
 * Where a tempered slab used to be, while it is away. Not decoration — the ring *is* the
 * promise that it is coming back, and the arc closing round it is when. Without this a
 * crumbled slab is indistinguishable from a slab that was never generated.
 */
export function glassGhost(
  g: Phaser.GameObjects.Graphics,
  tint: SandColorFn,
  x: number, y: number, r: number, z: number, k: number, t: number, alpha: number,
): void {
  const drop = z * LIFT;
  // The outline hangs where the top face was, so it is still readable as a height.
  g.lineStyle(1.4, tint(SND.glassDeep), alpha * 0.4);
  g.strokeEllipse(x, y, r * 1.8, r * 1.12);
  g.lineStyle(1, tint(SND.glassDeep), alpha * 0.16);
  g.lineBetween(x, y, x, y + drop);

  // The arc: an unclosed ring that sweeps shut as the four seconds run out.
  g.lineStyle(2.6, tint(SND.glassLit), alpha * (0.35 + 0.35 * Math.sin(t * 5)));
  g.beginPath();
  g.arc(x, y, r * 0.78, -Math.PI / 2, -Math.PI / 2 + TAU * Phaser.Math.Clamp(k, 0, 1), false);
  g.strokePath();
  // Shards still hanging in the air where it broke, drifting down.
  for (let i = 0; i < 5; i++) {
    const a = jitter(r, i) * TAU;
    const d = r * (0.3 + jitter(r, i + 9) * 0.7);
    g.fillStyle(tint(SND.glass), alpha * (1 - k) * 0.5);
    g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6 + (1 - k) * 10, 2.4, 2.4);
  }
}

/**
 * A flamethrower across the gap between two pillars of a tempered course.
 *
 * The nozzle is always drawn — you have to be able to see where the danger *will* be while it
 * is off, or timing the jump is guesswork rather than a read. `warm` (0–1) is the wind-up
 * before it lights, and it is the tell the whole obstacle is built on: the pilot light swells
 * and the nozzle glows before a single flame appears, which is your cue to go *now*.
 */
export function flameJet(
  g: Phaser.GameObjects.Graphics,
  tint: SandColorFn,
  x1: number, y1: number, x2: number, y2: number,
  halfW: number, on: number, warm: number, t: number, alpha: number,
  { seed = 0 } = {},
): void {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 1) return;
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x1, y1, ca, sa, u, v);

  // ── Nozzle ──
  // A stubby brass throat clamped to the lip of the pillar, aimed down the gap.
  g.fillStyle(tint(SND.iron), alpha);
  g.fillPoints([P(-9, -5), P(4, -6), P(4, 6), P(-9, 5)], true);
  g.fillStyle(tint(SND.ironLit), alpha * 0.85);
  g.fillPoints([P(-9, -5), P(4, -6), P(4, -3), P(-9, -2)], true);
  g.fillStyle(tint(SND.glassDeep), alpha * 0.8);
  g.fillCircle(P(-3, 0).x, P(-3, 0).y, 3.4);
  // Pilot light: small and steady while it is off, swelling through the wind-up.
  const pilot = P(5, 0);
  g.fillStyle(tint(SND.flameHot), alpha * (0.4 + warm * 0.6));
  g.fillCircle(pilot.x, pilot.y, 2 + warm * 3.4 + Math.sin(t * 20) * 0.6);

  if (on <= 0) {
    if (warm > 0.02) {
      // A lick of the coming jet, so the wind-up points where the flame will go.
      g.fillStyle(tint(SND.flame), alpha * warm * 0.28);
      g.fillPoints([P(4, -halfW * 0.3), P(4 + len * 0.25 * warm, 0), P(4, halfW * 0.3)], true);
    }
    return;
  }

  // ── The jet ──
  // Three nested tongues of flame: a wide soft envelope, the orange body, and a white core
  // that only reaches two thirds of the way — a flamethrower is hottest near the nozzle.
  const roar = 0.92 + 0.08 * Math.sin(t * 26 + seed);
  const bands: [number, number, number][] = [
    [halfW * 1.15 * roar, len * 1.02, 0.3],
    [halfW * 0.8 * roar, len * 0.94, 0.62],
    [halfW * 0.36 * roar, len * 0.66, 0.9],
  ];
  bands.forEach(([w, l, a], i) => {
    g.fillStyle(tint(i === 2 ? SND.flameHot : SND.flame), alpha * a * on);
    g.fillPoints([
      P(4, -w * 0.35), P(l * 0.35, -w), P(l, -w * 0.22), P(l, w * 0.22), P(l * 0.35, w), P(4, w * 0.35),
    ], true);
  });
  // Embers tumbling out of the far end of it.
  for (let i = 0; i < 10; i++) {
    const u = ((jitter(seed, i) + t * 1.6) % 1) * len;
    const v = (jitter(seed, i + 30) - 0.5) * halfW * 1.9;
    const p = P(u, v);
    g.fillStyle(tint(i % 3 === 0 ? SND.flameHot : SND.flame), alpha * on * (0.4 + 0.5 * jitter(seed, i + 60)));
    g.fillRect(p.x, p.y, 2.4, 2.4);
  }
}

/**
 * A mini idol: the shard a Cursed Pyramid leaves behind when it is claimed by somebody made of
 * glass. Drawn as the big idol's silhouette at a tenth the size, so the relationship is obvious,
 * with a charge ring that fills toward its next beam — a turret you cannot read is just noise.
 */
export function miniIdol(
  g: Phaser.GameObjects.Graphics,
  tint: SandColorFn,
  x: number, y: number, t: number, alpha: number,
  { size = 11, charge = 0 } = {},
): void {
  const h = size * 1.2;
  // Glow, so it stays findable against a busy floor.
  g.fillStyle(tint(SND.glass), alpha * 0.14);
  g.fillCircle(x, y - h * 0.4, size * (1.7 + Math.sin(t * 4) * 0.2));

  const apex = new Phaser.Geom.Point(x, y - h);
  g.fillStyle(shade(tint(SND.glass), 0.62), alpha * 0.92);
  g.fillPoints([apex, new Phaser.Geom.Point(x - size, y), new Phaser.Geom.Point(x, y + size * 0.3)], true);
  g.fillStyle(shade(tint(SND.glassLit), 0.98), alpha * 0.92);
  g.fillPoints([apex, new Phaser.Geom.Point(x + size, y), new Phaser.Geom.Point(x, y + size * 0.3)], true);
  g.lineStyle(1.1, tint(SND.glassLit), alpha * 0.8);
  g.lineBetween(x, y - h, x, y + size * 0.3);

  // The eye, and the ring that fills toward the next shot.
  g.fillStyle(tint(SND.glassDeep), alpha);
  g.fillEllipse(x, y - h * 0.45, size * 0.44, size * 0.28);
  g.fillStyle(tint(SND.glassLit), alpha * (0.6 + 0.4 * charge));
  g.fillCircle(x, y - h * 0.45, size * 0.12 + charge * size * 0.06);
  g.lineStyle(1.6, tint(SND.glassLit), alpha * 0.5);
  g.beginPath();
  g.arc(x, y - h * 0.35, size * 0.95, -Math.PI / 2, -Math.PI / 2 + TAU * Phaser.Math.Clamp(charge, 0, 1), false);
  g.strokePath();
}

/**
 * The shell on a tempered fighter: a faceted cage of glass planes turning around them.
 *
 * It is drawn as flat quads that catch the light one at a time rather than as a ring, because
 * the point being made is *brittle*, not *armoured* — this is the state where a fall kills you,
 * and it should never look like a shield.
 */
export function glassShell(
  g: Phaser.GameObjects.Graphics,
  tint: SandColorFn,
  x: number, y: number, k: number, t: number, alpha: number,
): void {
  const r = 27;
  for (let i = 0; i < 7; i++) {
    const a = t * 1.15 + (i / 7) * TAU;
    const w = 6 + 4 * Math.abs(Math.sin(a));
    const px = x + Math.cos(a) * r;
    const py = y + 2 + Math.sin(a) * r * 0.72;
    // Planes on the near side catch more light — that is what makes the cage read as turning.
    const face = 0.25 + 0.55 * Math.max(0, Math.sin(a));
    g.fillStyle(tint(i % 2 ? SND.glassLit : SND.glass), alpha * face * k);
    g.fillPoints([
      new Phaser.Geom.Point(px - w * 0.5, py - 13),
      new Phaser.Geom.Point(px + w * 0.5, py - 11),
      new Phaser.Geom.Point(px + w * 0.5, py + 11),
      new Phaser.Geom.Point(px - w * 0.5, py + 13),
    ], true);
  }
  g.lineStyle(1.4, tint(SND.glassLit), alpha * 0.45 * k);
  g.strokeEllipse(x, y + 2, r * 2, r * 1.5);
  // A hairline crack that wanders, so the shell always looks one knock from going.
  g.lineStyle(1, tint(SND.glassDeep), alpha * 0.55 * k);
  let px = x - r * 0.7;
  let py = y - 10;
  for (let i = 0; i < 4; i++) {
    const nx = px + r * 0.36;
    const ny = py + 6 + Math.sin(t * 3 + i * 2) * 4;
    g.lineBetween(px, py, nx, ny);
    px = nx;
    py = ny;
  }
}

/**
 * The golden orb at the end of the short course: a floating sphere with a hard specular dot,
 * a bobbing offset and a ring of orbiting motes. Roblox by way of the desert.
 */
export function goldOrb(
  g: Phaser.GameObjects.Graphics,
  tint: SandColorFn,
  x: number, y: number, t: number, alpha: number,
  { r = 11 } = {},
): void {
  const bob = Math.sin(t * 2.4) * 4;
  const cy = y - 20 + bob;
  // Halo.
  g.fillStyle(tint(SND.gold), alpha * 0.16);
  g.fillCircle(x, cy, r * 2.3 + Math.sin(t * 3.1) * 2);
  g.fillStyle(tint(SND.gold), alpha * 0.95);
  g.fillCircle(x, cy, r);
  g.fillStyle(tint(SND.goldHot), alpha);
  g.fillCircle(x - r * 0.3, cy - r * 0.34, r * 0.44);
  // Motes on a tilted orbit, so it reads as a thing suspended rather than a printed circle.
  g.fillStyle(tint(SND.goldHot), alpha * 0.8);
  for (let i = 0; i < 5; i++) {
    const a = t * 1.9 + (i / 5) * TAU;
    g.fillCircle(x + Math.cos(a) * (r * 1.9), cy + Math.sin(a) * (r * 0.7), 1.7);
  }
  // The tether down to the platform, so it never floats free of what holds it.
  g.lineStyle(1.2, tint(SND.gold), alpha * 0.3);
  g.lineBetween(x, cy + r, x, y - 2);
}

/**
 * The golden pyramid at the end of the long course. Drawn as two lit faces meeting on a hard
 * centre ridge — the one shape in the file with a genuine vanishing point, because it has to
 * out-rank every block around it. Awake, the capstone opens and throws a slow rotating fan.
 */
export function pyramidIdol(
  g: Phaser.GameObjects.Graphics,
  tint: SandColorFn,
  x: number, y: number, t: number, alpha: number,
  { size = 26, awake = 0 } = {},
): void {
  const h = size * 1.15;
  const apex = new Phaser.Geom.Point(x, y - h);
  const heat = 0.55 + awake * 0.45;

  if (awake > 0) {
    // Waking heat haze, and a slow fan of light sweeping the arena.
    g.fillStyle(tint(SND.gold), alpha * 0.12 * awake);
    g.fillCircle(x, y - h * 0.55, size * (2.2 + Math.sin(t * 2.7) * 0.25));
    for (let i = 0; i < 3; i++) {
      const a = t * 0.9 + (i / 3) * TAU;
      g.fillStyle(tint(SND.goldHot), alpha * 0.1 * awake);
      g.fillPoints([
        new Phaser.Geom.Point(x, y - h),
        new Phaser.Geom.Point(x + Math.cos(a - 0.13) * 300, y - h + Math.sin(a - 0.13) * 300),
        new Phaser.Geom.Point(x + Math.cos(a + 0.13) * 300, y - h + Math.sin(a + 0.13) * 300),
      ], true);
    }
  }

  // Ground shadow, then the two faces.
  g.fillStyle(tint(SND.shadow), alpha * 0.35);
  g.fillEllipse(x, y + 3, size * 2.1, size * 0.6);
  g.fillStyle(shade(tint(SND.gold), 0.62 + heat * 0.2), alpha);
  g.fillPoints([apex, new Phaser.Geom.Point(x - size, y), new Phaser.Geom.Point(x, y + size * 0.32)], true);
  g.fillStyle(shade(tint(SND.gold), 0.94 + heat * 0.06), alpha);
  g.fillPoints([apex, new Phaser.Geom.Point(x + size, y), new Phaser.Geom.Point(x, y + size * 0.32)], true);

  // Courses of masonry across both faces — a pyramid is stacked, not poured.
  g.lineStyle(1, tint(SND.dark), alpha * 0.4);
  for (let i = 1; i < 5; i++) {
    const k = i / 5;
    g.lineBetween(x - size * k, y - h * (1 - k), x + size * k, y - h * (1 - k));
  }
  // Centre ridge and capstone.
  g.lineStyle(1.6, tint(SND.goldHot), alpha * 0.85);
  g.lineBetween(x, y - h, x, y + size * 0.3);
  g.fillStyle(tint(SND.goldHot), alpha * (0.5 + heat * 0.5));
  g.fillCircle(x, y - h, 3.4 + awake * (1.6 + Math.sin(t * 9) * 0.8));
  if (awake > 0) {
    // The eye under the capstone, which is the tell that it is shooting at you.
    g.fillStyle(tint(SND.maw), alpha * awake);
    g.fillEllipse(x, y - h * 0.52, size * 0.5, size * 0.3);
    g.fillStyle(tint(SND.goldHot), alpha * awake);
    g.fillCircle(x + Math.sin(t * 1.4) * size * 0.1, y - h * 0.52, size * 0.11);
  }
}

/**
 * The flintlock, drawn in the hand along `ang`.
 *
 * Read in silhouette: a long thin barrel, a fat lock plate behind it, and a stock that drops
 * away at an angle. `recoil` (0–1) walks the whole gun back along its own axis and kicks the
 * muzzle up, so a shot is legible even when the beam has already gone.
 */
export function flintlock(
  g: Phaser.GameObjects.Graphics,
  tint: SandColorFn,
  x: number, y: number, ang: number, alpha: number,
  { golden = 0, recoil = 0, t = 0 } = {},
): void {
  const kick = ang - recoil * 0.42;
  const ca = Math.cos(kick), sa = Math.sin(kick);
  const bx = x - Math.cos(ang) * recoil * 6;
  const by = y - Math.sin(ang) * recoil * 6;
  const P = (u: number, v: number) => pt(bx, by, ca, sa, u, v);

  const iron = golden > 0 ? SND.gold : SND.iron;
  const ironLit = golden > 0 ? SND.goldHot : SND.ironLit;

  // Stock: drops back and down from the grip.
  g.fillStyle(tint(SND.wood), alpha);
  g.fillPoints([P(-4, -2), P(-16, 5), P(-19, 1), P(-6, -5)], true);
  // Barrel.
  g.fillStyle(tint(iron), alpha);
  g.fillPoints([P(-2, -3.1), P(20, -2.2), P(20, 1.2), P(-2, 2.1)], true);
  g.fillStyle(tint(ironLit), alpha * 0.9);
  g.fillPoints([P(-2, -3.1), P(20, -2.2), P(20, -1.1), P(-2, -1.8)], true);
  // Lock plate and the flint hammer cocked over it.
  g.fillStyle(tint(iron), alpha);
  g.fillPoints([P(-5, -4), P(3, -4), P(3, 3), P(-5, 3)], true);
  g.fillStyle(tint(ironLit), alpha);
  g.fillPoints([P(-3, -4), P(-1, -9), P(2, -8), P(1, -4)], true);
  // Muzzle mouth, so the beam has somewhere honest to come from.
  const m = P(20, -0.5);
  g.fillStyle(tint(SND.shadow), alpha);
  g.fillCircle(m.x, m.y, 1.9);

  if (golden > 0) {
    // Golden sand shrouding the barrel: grains orbiting the axis, not a recolour.
    for (let i = 0; i < 9; i++) {
      const u = -4 + ((i * 2.7 + t * 26) % 26);
      const v = Math.sin(t * 5 + i) * 3.4;
      const p = P(u, v);
      g.fillStyle(tint(SND.goldHot), alpha * golden * (0.35 + 0.4 * jitter(i, 1)));
      g.fillRect(p.x, p.y, 1.7, 1.7);
    }
  }
}

/**
 * The Sand Striker beam: a tapered lance of packed grain with a white-hot core and a shell of
 * loose sand shaking off it. `k` runs 1→0 over the beam's short life.
 */
export function sandBeam(
  g: Phaser.GameObjects.Graphics,
  tint: SandColorFn,
  x1: number, y1: number, x2: number, y2: number, k: number, alpha: number,
  { golden = false, seed = 0 } = {},
): void {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const len = Math.hypot(x2 - x1, y2 - y1);
  const w = (golden ? 7 : 5.2) * k;
  const body = golden ? SND.gold : SND.sand;

  // Outer shell, tapering to nothing at the far end — a lance, not a laser.
  g.fillStyle(tint(body), alpha * 0.5 * k);
  g.fillPoints([
    pt(x1, y1, ca, sa, 0, -w), pt(x1, y1, ca, sa, len, -w * 0.28),
    pt(x1, y1, ca, sa, len, w * 0.28), pt(x1, y1, ca, sa, 0, w),
  ], true);
  g.fillStyle(tint(golden ? SND.goldHot : SND.stoneWarmLit), alpha * 0.95 * k);
  g.fillPoints([
    pt(x1, y1, ca, sa, 0, -w * 0.4), pt(x1, y1, ca, sa, len, -w * 0.12),
    pt(x1, y1, ca, sa, len, w * 0.12), pt(x1, y1, ca, sa, 0, w * 0.4),
  ], true);

  // Grain shaking loose along the length.
  g.fillStyle(tint(golden ? SND.goldHot : SND.deep), alpha * 0.8 * k);
  for (let i = 0; i < 22; i++) {
    const u = jitter(seed, i) * len;
    const v = (jitter(seed, i + 40) - 0.5) * w * 5 * (1 - k * 0.5);
    const p = pt(x1, y1, ca, sa, u, v);
    g.fillRect(p.x, p.y, 2, 2);
  }
}

/**
 * A Sandwalk bridge: a run of packed-sand planks laid between two points that may be at two
 * different heights.
 *
 * The height rule does all the work here too. The bridge's shadow is a second copy of the same
 * ribbon, dropped by `z * LIFT` *per end* — so a bridge climbing from the floor to a tall pillar
 * has a shadow that fans away from it as it rises, and you can read the slope without a side
 * view. On top of the deck run chevrons that march toward the far end, which is the only tell
 * that it is a conveyor rather than a plank.
 *
 * `k` is 0–1 remaining life; the deck reddens over the last second so nobody is dropped by
 * surprise.
 */
export function sandBridge(
  g: Phaser.GameObjects.Graphics,
  tint: SandColorFn,
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
  halfW: number, k: number, t: number, alpha: number,
  { seed = 0 } = {},
): void {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 1) return;
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const d1 = z1 * LIFT;
  const d2 = z2 * LIFT;
  // Expiring: sand → red over the last second, the same warning the whole element uses.
  const fade = Math.max(0, Math.min(1, k * 6));
  const mix = (a: number, b: number, m: number) => {
    const r = Math.round(((a >> 16) & 0xff) * (1 - m) + ((b >> 16) & 0xff) * m);
    const gg = Math.round(((a >> 8) & 0xff) * (1 - m) + ((b >> 8) & 0xff) * m);
    const bb = Math.round((a & 0xff) * (1 - m) + (b & 0xff) * m);
    return (r << 16) | (gg << 8) | bb;
  };
  const deck = mix(SND.expire, SND.stoneWarm, fade);
  const deckLit = mix(SND.expire, SND.stoneWarmLit, fade);

  /** A quad spanning the ribbon, offset down by `o1`/`o2` at its two ends. */
  const ribbon = (o1: number, o2: number, w: number) => [
    new Phaser.Geom.Point(x1 - sa * w, y1 + ca * w + o1),
    new Phaser.Geom.Point(x2 - sa * w, y2 + ca * w + o2),
    new Phaser.Geom.Point(x2 + sa * w, y2 - ca * w + o2),
    new Phaser.Geom.Point(x1 + sa * w, y1 - ca * w + o1),
  ];

  // ── Shadow, dropped by each end's own height ──
  g.fillStyle(tint(SND.shadow), alpha * 0.3);
  g.fillPoints(ribbon(d1, d2, halfW * 0.9), true);

  // ── Deck ──
  g.fillStyle(shade(tint(deck), 0.7), alpha * 0.95);
  g.fillPoints(ribbon(0, 0, halfW), true);
  g.fillStyle(tint(deck), alpha);
  g.fillPoints(ribbon(0, 0, halfW * 0.82), true);

  // Planks across the run, each one lifted to its own point on the slope so the deck genuinely
  // climbs rather than sitting flat with a slanted shadow under it.
  const planks = Math.max(2, Math.round(len / 15));
  for (let i = 0; i <= planks; i++) {
    const u = i / planks;
    const px = x1 + (x2 - x1) * u;
    const py = y1 + (y2 - y1) * u;
    const w = halfW * (0.86 + jitter(seed, i) * 0.12);
    g.lineStyle(1.3, shade(tint(deck), 0.44), alpha * 0.6);
    g.lineBetween(px - sa * w, py + ca * w, px + sa * w, py - ca * w);
  }

  // ── Conveyor chevrons, marching toward the far end ──
  const flow = (t * 0.55) % 1;
  for (let i = 0; i < planks; i++) {
    const u = ((i / planks) + flow) % 1;
    const px = x1 + (x2 - x1) * u;
    const py = y1 + (y2 - y1) * u;
    const w = halfW * 0.5;
    const tip = 7;
    g.fillStyle(tint(deckLit), alpha * 0.55 * (0.4 + 0.6 * Math.sin(u * Math.PI)));
    g.fillPoints([
      new Phaser.Geom.Point(px - sa * w - ca * tip * 0.4, py + ca * w - sa * tip * 0.4),
      new Phaser.Geom.Point(px + ca * tip, py + sa * tip),
      new Phaser.Geom.Point(px + sa * w - ca * tip * 0.4, py - ca * w - sa * tip * 0.4),
      new Phaser.Geom.Point(px + ca * tip * 0.35, py + sa * tip * 0.35),
    ], true);
  }

  // Loose grain skating along the deck, because the whole thing is moving.
  g.fillStyle(tint(SND.stoneWarmLit), alpha * 0.5);
  for (let i = 0; i < 14; i++) {
    const u = (jitter(seed, i + 60) + t * 0.9) % 1;
    const v = (jitter(seed, i + 90) - 0.5) * halfW * 1.5;
    g.fillRect(x1 + (x2 - x1) * u - sa * v, y1 + (y2 - y1) * u + ca * v, 2, 2);
  }
}

/**
 * The Final Trail's lava, seen from above as a plane rising toward the camera.
 *
 * `z` is the lava's height in the kit's own units, and it is drawn exactly the way every other
 * altitude in this file is: the crust sits at the arena floor and the molten surface is lifted
 * *up* the screen by `z * LIFT`, so the gap between the two is how far above the lava you still
 * are. When that gap closes on your shadow, it has you.
 */
export function lavaTide(
  g: Phaser.GameObjects.Graphics,
  tint: SandColorFn,
  x: number, y: number, w: number, h: number, z: number, t: number, alpha: number,
): void {
  const surface = y - z * LIFT;
  const top = Math.max(y - h, surface);

  // Body: the molten plane, brightest at the leading edge nearest the camera.
  g.fillStyle(tint(SND.lavaCrust), alpha * 0.9);
  g.fillRect(x, top, w, y + h - top);
  g.fillStyle(tint(SND.lava), alpha * 0.72);
  g.fillRect(x, top, w, y + h - top);

  // Convection cells drifting across the surface.
  for (let i = 0; i < 26; i++) {
    const cx = x + ((jitter(i, 1) * w + t * (12 + jitter(i, 5) * 30)) % w);
    const cy = top + jitter(i, 2) * Math.max(8, y + h - top);
    const r = 6 + jitter(i, 3) * 16;
    g.fillStyle(tint(SND.lavaHot), alpha * 0.18 * (0.4 + 0.6 * Math.sin(t * 1.7 + i)));
    g.fillEllipse(cx, cy, r * 2.4, r);
  }

  // The leading edge: a hard bright crust line, because the edge is the part you have to read.
  g.fillStyle(tint(SND.lavaHot), alpha * 0.85);
  g.fillRect(x, top - 2, w, 3.5);
  for (let i = 0; i < 30; i++) {
    const cx = x + (i / 30) * w + Math.sin(t * 2.2 + i * 0.7) * 4;
    const bob = Math.sin(t * 3.4 + i * 1.3) * 3;
    g.fillStyle(tint(SND.lavaHot), alpha * (0.35 + 0.4 * jitter(i, 7)));
    g.fillRect(cx, top - 4 + bob, 3, 3);
  }
  // Heat haze licking above the surface.
  g.fillStyle(tint(SND.lava), alpha * 0.14);
  g.fillRect(x, top - 14, w, 14);
}

/**
 * The golden crown on the last slab of a Final Trail lane. Five points on a banded circlet,
 * bobbing on the spot until somebody takes it — `taken` drops it flat and kills the shine.
 */
export function crown(
  g: Phaser.GameObjects.Graphics,
  tint: SandColorFn,
  x: number, y: number, t: number, alpha: number,
  { taken = false, size = 15 } = {},
): void {
  const bob = taken ? 0 : Math.sin(t * 2.6) * 4;
  const cy = y - 26 + bob;
  const gold = taken ? shade(SND.gold, 0.55) : SND.gold;

  if (!taken) {
    // A beacon, so the goal is findable from the bottom of the course.
    g.fillStyle(tint(SND.gold), alpha * 0.1);
    g.fillCircle(x, cy, size * (2.6 + Math.sin(t * 3.3) * 0.3));
    g.fillStyle(tint(SND.goldHot), alpha * 0.07);
    g.fillRect(x - size * 0.5, cy - 260, size, 260);
  }

  // Circlet.
  g.fillStyle(tint(shade(gold, 0.7)), alpha);
  g.fillEllipse(x, cy + size * 0.42, size * 2, size * 0.62);
  g.fillStyle(tint(gold), alpha);
  g.fillRect(x - size, cy - size * 0.1, size * 2, size * 0.55);

  // Five points, the middle one tallest.
  for (let i = 0; i < 5; i++) {
    const u = (i / 4 - 0.5) * 2;
    const px = x + u * size * 0.88;
    const hh = size * (i === 2 ? 1.15 : i === 1 || i === 3 ? 0.86 : 0.68);
    g.fillStyle(tint(gold), alpha);
    g.fillPoints([
      new Phaser.Geom.Point(px - size * 0.24, cy),
      new Phaser.Geom.Point(px, cy - hh),
      new Phaser.Geom.Point(px + size * 0.24, cy),
    ], true);
    g.fillStyle(tint(taken ? gold : SND.goldHot), alpha);
    g.fillCircle(px, cy - hh, taken ? 1.4 : 2.2 + Math.sin(t * 5 + i) * 0.5);
  }

  // Specular band across the circlet, and the shadow that says how high the slab is.
  g.fillStyle(tint(taken ? gold : SND.goldHot), alpha * 0.8);
  g.fillRect(x - size * 0.8, cy + size * 0.02, size * 1.6, 2);
  g.fillStyle(tint(SND.shadow), alpha * 0.3);
  g.fillEllipse(x, y - 2, size * 1.6, size * 0.4);
}

/**
 * The divider between the Final Trail's two lanes: a wall of grain standing on end, so neither
 * runner can mistake the other's course for a route out of their own.
 */
export function laneDivider(
  g: Phaser.GameObjects.Graphics,
  tint: SandColorFn,
  x: number, y0: number, y1: number, t: number, alpha: number,
): void {
  g.fillStyle(tint(SND.dark), alpha * 0.5);
  g.fillRect(x - 2.5, y0, 5, y1 - y0);
  g.fillStyle(tint(SND.stoneWarmLit), alpha * 0.35);
  g.fillRect(x - 1, y0, 2, y1 - y0);
  for (let i = 0; i < 30; i++) {
    const yy = y0 + (((i / 30) * (y1 - y0)) + t * 40) % (y1 - y0);
    g.fillStyle(tint(SND.sand), alpha * (0.2 + 0.4 * jitter(i, 3)));
    g.fillRect(x - 4 + jitter(i, 9) * 8, yy, 2, 2.6);
  }
}

/** A patch of sunk poison on the floor of the long course: dark, wet, and slowly blistering. */
export function poisonPatch(
  g: Phaser.GameObjects.Graphics,
  tint: SandColorFn,
  x: number, y: number, r: number, t: number, alpha: number,
  { seed = 0 } = {},
): void {
  g.fillStyle(tint(SND.poisonDeep), alpha * 0.72);
  g.fillEllipse(x, y, r * 2, r * 1.35);
  g.fillStyle(tint(SND.poison), alpha * 0.34);
  g.fillEllipse(x, y, r * 1.5, r * 1);
  // Blisters rising and popping on their own clocks.
  for (let i = 0; i < 6; i++) {
    const ph = (t * 0.8 + jitter(seed, i)) % 1;
    const a = jitter(seed, i + 20) * TAU;
    const d = jitter(seed, i + 40) * r * 0.75;
    g.fillStyle(tint(SND.poison), alpha * (1 - ph) * 0.85);
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, 1.5 + ph * 3.5);
  }
  g.lineStyle(1.5, tint(SND.poison), alpha * 0.5);
  g.strokeEllipse(x, y, r * 2, r * 1.35);
}

/**
 * Dune Slicer's fracture: a star of splits driven into the arena floor where a flintlock ball
 * landed. Dormant it is a dark scar; armed, light comes up out of the cracks — and the two have
 * to be told apart at a glance, because one of them is about to take fifteen off whoever is
 * standing on it.
 */
export function fracture(
  g: Phaser.GameObjects.Graphics,
  tint: SandColorFn,
  x: number, y: number, r: number, armed: number, t: number, alpha: number,
  { seed = 0 } = {},
): void {
  // The bruise the ball left, under the cracks.
  g.fillStyle(tint(SND.shadow), alpha * 0.34);
  g.fillEllipse(x, y, r * 2, r * 1.3);

  const glow = armed * (0.55 + 0.45 * Math.sin(t * 4 + seed));
  const spokes = 6;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * TAU + jitter(seed, i) * 0.9;
    // Each split walks outward in three kinked segments, so it reads as broken stone rather
    // than as a drawn asterisk.
    let px = x;
    let py = y;
    for (let k = 1; k <= 3; k++) {
      const len = (r / 3) * (0.7 + jitter(seed, i * 4 + k) * 0.7);
      const kink = a + (jitter(seed, i * 7 + k) - 0.5) * 0.8;
      const nx = px + Math.cos(kink) * len;
      const ny = py + Math.sin(kink) * len * 0.72;
      g.lineStyle(3.4 - k * 0.7, tint(SND.shadow), alpha * 0.8);
      g.lineBetween(px, py, nx, ny);
      if (glow > 0.02) {
        g.lineStyle(1.6 - k * 0.3, tint(SND.lavaHot), alpha * glow * (1 - k * 0.22));
        g.lineBetween(px, py, nx, ny);
      }
      px = nx;
      py = ny;
    }
  }

  // The mouth of it. Dormant this is just crushed sand; armed it is lit from below.
  g.fillStyle(tint(armed > 0.02 ? SND.lava : SND.dark), alpha * (0.4 + glow * 0.5));
  g.fillEllipse(x, y, r * 0.5, r * 0.34);
  if (glow > 0.02) {
    g.fillStyle(tint(SND.goldHot), alpha * glow * 0.7);
    g.fillEllipse(x, y, r * 0.24, r * 0.16);
    // Grit shivering out of an armed crack.
    for (let i = 0; i < 4; i++) {
      const ph = (t * 1.4 + jitter(seed, i + 30)) % 1;
      const a = jitter(seed, i + 50) * TAU;
      g.fillStyle(tint(SND.sand), alpha * glow * (1 - ph) * 0.8);
      g.fillRect(x + Math.cos(a) * r * 0.5 - 1, y + Math.sin(a) * r * 0.35 - ph * 9, 2, 2);
    }
  }
}

/**
 * The Dust Devil at the end of a floor Sandwalk: a funnel of grain standing on the deck, drawn
 * bottom-heavy so it reads as something you can put a foot on rather than as a hazard.
 */
export function dustDevil(
  g: Phaser.GameObjects.Graphics,
  tint: SandColorFn,
  x: number, y: number, r: number, t: number, alpha: number,
  { seed = 0 } = {},
): void {
  // The pad: a scoured ring in the floor with the funnel's foot planted in it.
  g.fillStyle(tint(SND.dark), alpha * 0.35);
  g.fillEllipse(x, y, r * 2.1, r * 1.15);
  g.lineStyle(2, tint(SND.stoneWarmLit), alpha * (0.45 + 0.25 * Math.sin(t * 3)));
  g.strokeEllipse(x, y, r * 2.1, r * 1.15);

  // Six rings of grain climbing and widening, each turning a little faster than the one below.
  for (let i = 0; i < 7; i++) {
    const f = i / 6;
    const ry = y - f * r * 2.3;
    const rx = r * (0.42 + f * 0.9);
    const spin = t * (2.4 + f * 2.6) + seed;
    g.lineStyle(1.6, tint(f > 0.6 ? SND.sand : SND.deep), alpha * (0.5 - f * 0.28));
    g.strokeEllipse(x + Math.cos(spin) * 3 * f, ry, rx * 2, rx * 0.62);
    for (let k = 0; k < 5; k++) {
      const a = spin + (k / 5) * TAU;
      g.fillStyle(tint(SND.stoneWarmLit), alpha * (0.7 - f * 0.4));
      g.fillRect(x + Math.cos(a) * rx - 1.2, ry + Math.sin(a) * rx * 0.31 - 1.2, 2.4, 2.4);
    }
  }
  // A bright core so the middle of the pad — the bit you have to stand on — is unmistakable.
  g.fillStyle(tint(SND.goldHot), alpha * (0.3 + 0.2 * Math.sin(t * 5 + seed)));
  g.fillEllipse(x, y - 2, r * 0.6, r * 0.34);
}

/**
 * Sand Barrier: grains whipping around the fighter in a shell. `k` is how hard the veil is
 * running — 0.33 for a plain course, 0.5 once the golden sand is on the barrel.
 */
export function sandVeil(
  g: Phaser.GameObjects.Graphics,
  tint: SandColorFn,
  x: number, y: number, k: number, t: number, alpha: number,
): void {
  const gold = k > 0.4;
  const r = 26 + k * 12;
  g.lineStyle(2, tint(gold ? SND.gold : SND.stoneWarmLit), alpha * (0.22 + k * 0.4));
  g.strokeEllipse(x, y + 2, r * 2, r * 2.2);
  // Two counter-rotating bands of grit, so the shell looks spun rather than drawn.
  for (let band = 0; band < 2; band++) {
    const dir = band === 0 ? 1 : -1;
    for (let i = 0; i < 12; i++) {
      const a = dir * t * (2.2 + band * 1.1) + (i / 12) * TAU + band;
      const rr = r * (0.72 + 0.28 * Math.sin(t * 3 + i));
      g.fillStyle(tint(gold && i % 3 === 0 ? SND.goldHot : SND.sand), alpha * (0.35 + k * 0.6));
      g.fillRect(x + Math.cos(a) * rr - 1.3, y + 2 + Math.sin(a) * rr * 1.1 - 1.3, 2.6, 2.6);
    }
  }
}

/**
 * A slab under the Curse of the Challenger. Painted over the platform's top face: the stone
 * goes violet, and an eye opens in the middle of it and watches whoever is standing there.
 */
export function cursedSlab(
  g: Phaser.GameObjects.Graphics,
  tint: SandColorFn,
  x: number, y: number, r: number, t: number, alpha: number,
): void {
  const pulse = 0.5 + 0.5 * Math.sin(t * 6);
  g.fillStyle(0x5b1f8c, alpha * (0.5 + pulse * 0.2));
  g.fillEllipse(x, y, r * 2, r * 1.32);
  g.lineStyle(2.5, 0x9b4dff, alpha * (0.55 + pulse * 0.35));
  g.strokeEllipse(x, y, r * 2, r * 1.32);
  // Veins of the curse crawling out to the rim.
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + t * 0.4;
    g.lineStyle(1.4, 0xc48bff, alpha * 0.4);
    g.lineBetween(x, y, x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.6);
  }
  // The eye. Sclera, a yellow iris that widens with the pulse, and a slit pupil.
  const ex = x;
  const ey = y - r * 0.06;
  const ew = r * 0.78;
  const eh = r * 0.4;
  g.fillStyle(0x1a0a26, alpha * 0.9);
  g.fillEllipse(ex, ey, ew * 2, eh * 2);
  g.fillStyle(SND.gold, alpha * (0.85 + pulse * 0.15));
  g.fillEllipse(ex, ey, ew * 1.15, eh * 1.5);
  g.fillStyle(0x1a0a26, alpha);
  g.fillEllipse(ex, ey, ew * 0.3, eh * (1.2 - pulse * 0.3));
  g.fillStyle(SND.goldHot, alpha * 0.8);
  g.fillCircle(ex - ew * 0.28, ey - eh * 0.35, 1.6);
  // Lids, so it reads as an eye rather than as a marble.
  g.lineStyle(2, 0x3b1257, alpha * 0.9);
  g.strokeEllipse(ex, ey, ew * 2, eh * 2);
  void tint;
}

// ── Fx ────────────────────────────────────────────────────────────────────

/** One-shot sand effects. Everything transient the kit throws goes through here. */
export class SandFx extends FxBase {
  /** A puff of grain — landings, footfalls, anything scuffing the floor. */
  puff(x: number, y: number, n: number, spread: number, ms: number, color = SND.deep): void {
    const seed = Math.random() * 999;
    this.anim(7, ms, (g, t) => {
      const r = spread * (0.3 + t * 1.5);
      grains(g, this.tint, x, y + t * 4, r, n, (1 - t) * 0.9, { seed, color, size: 2.2 });
    });
  }

  /** A hit landing: a hard grain-burst with a rim. */
  ping(x: number, y: number, r: number, color = SND.sand): void {
    this.anim(9, 260, (g, t) => {
      g.lineStyle(3 * (1 - t), this.tint(color), (1 - t) * 0.9);
      g.strokeCircle(x, y, r * (0.4 + t * 1.3));
      grains(g, this.tint, x, y, r * (0.5 + t), 8, (1 - t) * 0.85, { seed: r, color: SND.deep });
    });
  }

  /** A platform coming down: the block folds over and bursts into what it was made of. */
  collapse(x: number, y: number, z: number, r: number, grey: boolean): void {
    const seed = Math.random() * 999;
    this.anim(8, 620, (g, t) => {
      const fall = t * z * LIFT;
      const a = 1 - t;
      g.fillStyle(this.tint(grey ? SND.stoneGrey : SND.stoneWarm), a * 0.85);
      g.fillEllipse(x, y + fall, r * 2 * (1 + t * 0.5), r * 1.2 * (1 - t * 0.5));
      grains(g, this.tint, x, y + fall, r * (1 + t * 2.6), 26, a * 0.9,
        { seed, color: grey ? SND.stoneGreyLit : SND.deep, size: 2.6 });
    });
  }

  /** The AOE a falling platform leaves behind. */
  blast(x: number, y: number, radius: number, color = SND.deep): void {
    this.flashIn(x, y, radius * 0.45, SND.stoneWarmLit, color, 9);
    const seed = Math.random() * 999;
    this.anim(9, 520, (g, t) => {
      g.lineStyle(6 * (1 - t), this.tint(color), (1 - t) * 0.75);
      g.strokeCircle(x, y, radius * (0.25 + t * 0.85));
      grains(g, this.tint, x, y, radius * (0.4 + t), 30, (1 - t) * 0.8, { seed, color: SND.sand, size: 3 });
    });
  }

  /**
   * A tempered slab breaking, or a tempered fighter hitting the floor. Shards thrown outward on
   * straight lines with a hard white flash under them — the opposite of `collapse`, which folds
   * and billows. Glass does not billow.
   */
  shatter(x: number, y: number, r: number, big = false): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, r * (big ? 1.1 : 0.6), SND.glassLit, SND.glass, big ? 11 : 9);
    this.anim(big ? 11 : 9, big ? 620 : 460, (g, t) => {
      const a = 1 - t;
      g.lineStyle(3 * a, this.tint(SND.glassLit), a * 0.8);
      g.strokeCircle(x, y, r * (0.3 + t * (big ? 2.2 : 1.4)));
      const n = big ? 26 : 16;
      for (let i = 0; i < n; i++) {
        const ang = jitter(seed, i) * TAU;
        const d = r * (0.3 + t * (big ? 3 : 2)) * (0.5 + jitter(seed, i + 40) * 0.9);
        const s = (big ? 4.5 : 3) * a;
        g.fillStyle(this.tint(i % 3 === 0 ? SND.glassLit : SND.glass), a * 0.95);
        g.fillRect(x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.68 + t * t * 26, s, s * 1.6);
      }
    });
  }

  /** A block punching up out of the floor when a course is built. */
  rise(x: number, y: number, r: number, z: number, grey: boolean): void {
    const seed = Math.random() * 999;
    this.anim(4, 420, (g, t) => {
      const a = 1 - t;
      g.fillStyle(this.tint(grey ? SND.stoneGreyLit : SND.stoneWarmLit), a * 0.55);
      g.strokeCircle(x, y + z * LIFT * (1 - t), r * (1 + t));
      grains(g, this.tint, x, y + z * LIFT * (1 - t) * 0.5, r * (1 + t * 1.8), 18, a * 0.8,
        { seed, color: SND.deep, size: 2.4 });
    });
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const SAND_AVATAR: AvatarSpec = {
  hands: [
    { r: 12, color: SND.sand, alpha: 0.2 },
    { r: 8, color: SND.deep, alpha: 0.95 },
    { r: 4.4, color: SND.stoneWarmLit, alpha: 1, ox: -1.4, oy: -1.6 },
  ],
  eyeWhite: SND.stoneWarmLit,
  eyePupil: SND.shadow,
  squash: { div: 13, x: 0.55, y: 0.3 },
};

/**
 * Sand himself: a body of packed dune with the wind still working on it, wearing a wide desert
 * hood and carrying the flintlock in whichever hand last fired.
 *
 * The rig owns exactly one piece of state the rest of the game cares about — `elevation`. Every
 * altitude read in the element funnels through it: the body swells as he rises (near-field
 * perspective, which is the only "scale up" a top-down camera can honestly offer), the drop
 * shadow slides down by `z * LIFT`, and a run of chevrons between the two counts the gap. Held
 * together they make height legible without a single number on screen.
 */
export class SandAvatar extends BaseAvatar {
  /** Height above the floor, in the same units the kit's sim uses. */
  private elevation = 0;
  /** 0–1, non-zero while the golden orb's buff is up — drives the shroud on the barrel. */
  private golden = 0;
  /** Kicks to 1 on a shot and decays; walks the gun back along its axis. */
  private recoil = 0;
  /** 0–1, eased toward Tempered Temptation's glass body so the change of state is a transition. */
  private tempered = 0;
  private temperedWant = 0;
  private seed = Math.random() * 999;

  constructor(scene: Phaser.Scene, tint: SandColorFn, depth = 6) {
    super(scene, tint, depth, SAND_AVATAR);
  }

  setElevation(z: number): void { this.elevation = z; }
  setGolden(on: boolean): void { this.golden = on ? 1 : 0; }
  setTempered(on: boolean): void { this.temperedWant = on ? 1 : 0; }
  fireRecoil(): void { this.recoil = 1; }

  /**
   * Which hand the flintlock is in. Read by both the drawing and the shot, so the beam can
   * never leave the empty hand — the base rig's `castHand` alternates per punch and is wrong
   * for a character that carries one weapon.
   */
  private gunHand(): number { return Math.cos(this.facing) >= 0 ? 1 : 0; }

  /**
   * World position of the barrel's mouth. The hands lag the body on springs, so this is the
   * only honest origin for a shot: anything else fires from a point the player cannot see.
   */
  muzzle(): { x: number; y: number } {
    const i = this.gunHand();
    return {
      x: this.armX[i] + Math.cos(this.facing) * 20,
      y: this.armY[i] + Math.sin(this.facing) * 20,
    };
  }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.recoil = Math.max(0, this.recoil - delta / 220);
    // Half a second either way: long enough to watch the sand vitrify, short enough that you
    // are never unsure which state you are in when a fall would kill you.
    const step = delta / 500;
    this.tempered = this.temperedWant > this.tempered
      ? Math.min(1, this.tempered + step) : Math.max(0, this.tempered - step);
    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 15 : 12);
      glow.setAlpha(on ? 0.34 : 0.2);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new SandFx(this.scene, this.tint).puff(x, y, 3, 5, 300);
  }

  /**
   * The height read, in one place: the shadow slides down by `elevation * LIFT` and shrinks and
   * fades as it goes, and a ladder of chevrons fills the gap so the eye can count the distance
   * rather than having to judge it.
   */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const drop = this.elevation * LIFT;
    const k = Math.min(1, this.elevation / 190);

    g.fillStyle(this.tint(SND.shadow), alpha * (0.4 - k * 0.2));
    g.fillEllipse(x, y + 15 + drop, 40 - k * 16, 14 - k * 6);

    if (drop > 8) {
      g.fillStyle(this.tint(SND.deep), alpha * 0.4);
      const rungs = Math.max(1, Math.floor(drop / 12));
      for (let i = 1; i <= rungs; i++) {
        const yy = y + 15 + (drop * i) / (rungs + 1);
        const w = 5 - (i / (rungs + 1)) * 2.5;
        g.fillPoints([
          new Phaser.Geom.Point(x - w, yy + 2),
          new Phaser.Geom.Point(x, yy - 1),
          new Phaser.Geom.Point(x + w, yy + 2),
          new Phaser.Geom.Point(x, yy + 0.6),
        ], true);
      }
    }
  }

  /** Packed dune for a torso, swelling as he climbs — or fused to glass while tempered. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    // Near-field swell: the top-down camera's only honest way to say "closer to it".
    const s = 1 + Math.min(0.3, this.elevation / 620);
    const r = 18 * s;
    const k = this.tempered;

    g.fillStyle(this.tint(k > 0.5 ? SND.glassDeep : SND.dark), alpha);
    g.fillCircle(x, y + 1, r);
    g.fillStyle(this.tint(k > 0.5 ? SND.glass : SND.deep), alpha * (k > 0.5 ? 0.8 : 1));
    g.fillCircle(x - r * 0.12, y - r * 0.1, r * 0.86);
    g.fillStyle(this.tint(k > 0.5 ? SND.glassLit : SND.sand), alpha * 0.95);
    g.fillCircle(x - r * 0.22, y - r * 0.24, r * 0.58);
    // The wind is still working on him: grain lifting off the windward shoulder. Tempered, the
    // loose grain is gone — that is the whole difference between sand and what sand becomes.
    grains(g, this.tint, x, y, r * 0.9, 12, alpha * 0.55 * (1 - k),
      { seed: this.seed, color: SND.stoneWarmLit, size: 1.5, drift: Math.sin(this.t * 2.3) * 2 });
    if (k > 0.02) {
      // Facets across the torso, catching the light as he turns.
      for (let i = 0; i < 5; i++) {
        const ang = this.facing + (i / 5 - 0.5) * 2.6;
        g.fillStyle(this.tint(i % 2 ? SND.glassLit : SND.glassDeep), alpha * k * 0.3);
        g.fillPoints([
          new Phaser.Geom.Point(x, y),
          new Phaser.Geom.Point(x + Math.cos(ang - 0.28) * r, y + Math.sin(ang - 0.28) * r),
          new Phaser.Geom.Point(x + Math.cos(ang + 0.28) * r, y + Math.sin(ang + 0.28) * r),
        ], true);
      }
    }
    // Slip face: the sharp crest a real dune carries on its lee side.
    g.lineStyle(1.8, this.tint(k > 0.5 ? SND.glassLit : SND.stoneWarmLit), alpha * (0.5 + k * 0.4));
    g.beginPath();
    g.arc(x, y + 1, r * 0.72, this.facing - 1.1, this.facing + 1.1, false);
    g.strokePath();
  }

  /** The hood, and the flintlock in the working hand. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const crown = y - 18;
    const lean = Math.cos(this.facing) * 2.6;
    const s = this.mastered ? 1.18 : 1;

    // ── Desert hood ──
    // A wide brim tipped along the aim, with the cloth falling behind it. Rooted at the crown
    // so it never covers the eyes.
    g.fillStyle(this.tint(SND.dark), alpha * 0.9);
    g.fillEllipse(x + lean, crown - 1, 34 * s, 12 * s);
    g.fillStyle(this.tint(SND.deep), alpha);
    g.fillEllipse(x + lean, crown - 3, 26 * s, 9 * s);
    g.fillStyle(this.tint(SND.stoneWarmLit), alpha * 0.9);
    g.fillEllipse(x + lean, crown - 5.5 * s, 15 * s, 7 * s);
    // Cloth tail streaming off the lee side.
    const back = this.facing + Math.PI;
    g.fillStyle(this.tint(SND.deep), alpha * 0.75);
    g.fillPoints([
      new Phaser.Geom.Point(x + lean - 9, crown),
      new Phaser.Geom.Point(x + lean + 9, crown),
      new Phaser.Geom.Point(x + Math.cos(back) * 22 + Math.sin(this.t * 3) * 4,
        crown + 12 + Math.sin(back) * 10),
    ], true);
    if (this.mastered) {
      // Mastery tell: a gold circlet round the brim, visible in silhouette.
      g.lineStyle(2.2, this.tint(SND.gold), alpha * 0.9);
      g.strokeEllipse(x + lean, crown - 2, 29, 11);
    }

    // ── The flintlock ──
    // Held in the lead hand so it travels with the rig's own spring rather than being pinned
    // to the body — the gun lags the turn, which is most of why the character reads as heavy.
    const i = this.gunHand();
    flintlock(g, this.tint, this.armX[i], this.armY[i], this.facing, alpha,
      { golden: this.golden, recoil: this.recoil, t: this.t });
  }
}
