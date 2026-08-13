import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeOut } from './ElementVisuals';

/**
 * Everything Dream draws: the sleepwalker character rig, the persistent world objects
 * (the trance pendulum, dreamcatchers, the oasis portal and the oasis itself), and the
 * one-shot effects behind each ability.
 *
 * Dream is cosmic — deep violet and starlight — with three deliberate intrusions of
 * something warmer: the cream wool of the sheep counting down a victim's sleepiness, the
 * red of a nightmare's heart trace, and the sun-bleached sand of the oasis. Every draw call
 * routes its colour through the owner's mapper, so a future skin only has to remap these keys.
 */

export type DreamColorFn = ColorFn;

export const DRM = {
  /** The deepest part of the night — outlines and the inside of a portal. */
  night: 0x0b0620,
  deep: 0x1b1145,
  violet: 0x5b3fd4,
  purple: 0x8b5cf6,
  blue: 0x4f7dff,
  /** The element colour. */
  sky: 0x9fb8ff,
  pale: 0xd8e2ff,
  white: 0xffffff,
  /** Warm starlight, for the pinpricks that have to survive on a bright background. */
  star: 0xfff4c2,
  /** Sheep. */
  wool: 0xf4f1e8,
  woolShade: 0xc9c3b4,
  hoof: 0x3a3350,
  fence: 0x8a6b4a,
  fenceDark: 0x54402c,
  /** Pillow Fight. */
  pillow: 0xbfd0ff,
  pillowDeep: 0x6d86d8,
  /** Dreamcatcher. */
  hoop: 0xa87b52,
  web: 0xe8ecff,
  /** Nightmare. */
  dread: 0xff3b6b,
  dreadDeep: 0x6b0f26,
  /** Oasis — a meadow under a waterfall. */
  /** The rose the sky goes at the horizon, so the place reads as dawn and not as night. */
  dusk: 0xe8a9c6,
  grass: 0x74d18c,
  grassDark: 0x2f8a58,
  grassDeep: 0x1a5b3c,
  /** Distant ridges, hazed toward the sky so they sit behind everything. */
  hillFar: 0x3a5590,
  bark: 0x8a6b4a,
  barkDark: 0x54402c,
  leaf: 0x5fbf7d,
  leafDark: 0x27714b,
  bloom: 0xffb3dd,
  bloomWarm: 0xffe08a,
  rock: 0x6f6a90,
  rockDark: 0x3b365e,
  water: 0x3fc7d6,
  waterDeep: 0x136a78,
  foam: 0xf2fbff,
  mist: 0xbfe8f5,
  sun: 0xffd98a,
  /** Dream Duel — the ectoplasm a spirit is made of, and the red the haunting comes in. */
  spirit: 0xe4f1ff,
  spiritDeep: 0x7f9fd8,
  haunt: 0xff2d4a,
  hauntDeep: 0x6b0512,
  /** Lifelong Dream — the counter over your head, and the gold it turns when it lands. */
  wish: 0xffd98a,
  wishDeep: 0x8a6a1f,
};

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * A four-pointed sparkle with a soft core. The single most reused shape in the element —
 * cursor, stardust, dreamcatcher beads and the oasis sky are all made of these.
 */
export function star(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, r: number,
  alpha = 1,
  color = DRM.star,
  spin = 0,
): void {
  const long = r;
  const short = r * 0.26;
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 8; i++) {
    const a = spin + (i / 8) * TAU;
    const d = i % 2 === 0 ? long : short;
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * d, y + Math.sin(a) * d));
  }
  g.fillStyle(tint(color), alpha);
  g.fillPoints(pts, true);
  g.fillStyle(tint(DRM.white), alpha * 0.85);
  g.fillCircle(x, y, r * 0.22);
}

/**
 * A cosmic smear: three offset discs from deep to bright, breathing on `t`. This is what
 * makes anything Dream owns read as a piece of sky rather than a coloured circle.
 */
export function nebula(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, r: number, t: number,
  alpha = 1,
): void {
  const pulse = 1 + Math.sin(t * 1.8) * 0.06;
  g.fillStyle(tint(DRM.deep), alpha * 0.55);
  g.fillCircle(x, y, r * pulse);
  g.fillStyle(tint(DRM.violet), alpha * 0.5);
  g.fillCircle(x - r * 0.22, y - r * 0.18, r * 0.72 * pulse);
  g.fillStyle(tint(DRM.purple), alpha * 0.45);
  g.fillCircle(x + r * 0.26, y + r * 0.2, r * 0.5 * pulse);
  g.fillStyle(tint(DRM.blue), alpha * 0.4);
  g.fillCircle(x + r * 0.05, y - r * 0.3, r * 0.36 * pulse);
}

/**
 * One sheep, side-on and facing left. The body is four overlapping wool puffs rather than
 * an ellipse — a sheep is legible from its lumpy outline before anything else, and at this
 * size (6–12px) the outline is nearly all there is.
 *
 * `trot` walks the legs; `alpha` fades the whole animal.
 */
export function sheep(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, s: number,
  alpha = 1,
  trot = 0,
  asleep = false,
): void {
  const puffs: [number, number, number][] = [
    [-0.42, 0.02, 0.46], [-0.05, -0.16, 0.54], [0.32, 0.0, 0.44], [0.06, 0.2, 0.42],
  ];

  // Legs first, so the wool overlaps their tops.
  g.lineStyle(1.5 * s * 0.14, tint(DRM.hoof), alpha);
  for (let i = 0; i < 4; i++) {
    const lx = x + (i < 2 ? -0.3 : 0.28) * s;
    const swing = Math.sin(trot + i * 1.6) * (asleep ? 0 : 0.16) * s;
    g.lineBetween(lx, y + 0.3 * s, lx + swing, y + 0.66 * s);
  }

  g.fillStyle(tint(DRM.woolShade), alpha);
  for (const [ox, oy, r] of puffs) g.fillCircle(x + ox * s + 0.06 * s, y + oy * s + 0.06 * s, r * s);
  g.fillStyle(tint(DRM.wool), alpha);
  for (const [ox, oy, r] of puffs) g.fillCircle(x + ox * s, y + oy * s, r * s);

  // Head — a dark muzzle stub poking out of the wool, with an ear and one eye.
  const hx = x - 0.62 * s;
  const hy = y - 0.06 * s;
  g.fillStyle(tint(DRM.hoof), alpha);
  g.fillEllipse(hx, hy, 0.42 * s, 0.36 * s);
  g.fillStyle(tint(DRM.wool), alpha);
  g.fillCircle(hx + 0.1 * s, hy - 0.18 * s, 0.16 * s);  // forelock
  g.fillStyle(tint(DRM.hoof), alpha * 0.9);
  g.fillEllipse(hx - 0.02 * s, hy - 0.2 * s, 0.2 * s, 0.1 * s); // ear
  if (asleep) {
    g.lineStyle(Math.max(0.6, 0.07 * s), tint(DRM.night), alpha);
    g.lineBetween(hx - 0.14 * s, hy - 0.02 * s, hx - 0.02 * s, hy - 0.02 * s);
  } else {
    g.fillStyle(tint(DRM.white), alpha);
    g.fillCircle(hx - 0.08 * s, hy - 0.04 * s, 0.09 * s);
  }
}

/** A short run of paddock fence: two rails on three posts, drawn from its left end. */
export function fenceRun(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, w: number, h: number,
  alpha = 1,
): void {
  g.fillStyle(tint(DRM.fenceDark), alpha);
  for (let i = 0; i < 3; i++) {
    const px = x + (i / 2) * (w - 2.2);
    g.fillRect(px, y - h, 2.2, h);
  }
  g.fillStyle(tint(DRM.fence), alpha);
  g.fillRect(x, y - h * 0.82, w, 1.7);
  g.fillRect(x, y - h * 0.42, w, 1.7);
  // Lit top edge on each post, so the fence has a light source instead of being a grid.
  g.fillStyle(tint(DRM.wool), alpha * 0.5);
  for (let i = 0; i < 3; i++) g.fillRect(x + (i / 2) * (w - 2.2), y - h, 2.2, 1);
}

/**
 * The sleepiness read-out that hangs over a drowsy fighter: a paddock with a fence, sheep
 * piling up behind it, and one sheep mid-jump whose arc is the fractional part of the meter.
 *
 * The backing plate doubles as a conventional progress bar — a pile of sheep alone is
 * charming but imprecise, and a player closing on a sleep threshold needs the number.
 */
export function sleepMeter(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  cx: number, cy: number,
  ratio: number,
  t: number,
  asleep: boolean,
  alpha = 1,
): void {
  const W = 66, H = 9;
  const x = cx - W / 2;
  const flock = 5;

  // Backing plate + fill.
  g.fillStyle(tint(DRM.night), alpha * 0.8);
  g.fillRoundedRect(x - 2, cy - 2, W + 4, H + 4, 3);
  g.lineStyle(1, tint(asleep ? DRM.purple : DRM.violet), alpha * 0.85);
  g.strokeRoundedRect(x - 2, cy - 2, W + 4, H + 4, 3);
  g.fillStyle(tint(DRM.deep), alpha * 0.9);
  g.fillRect(x, cy, W, H);
  g.fillStyle(tint(asleep ? DRM.purple : DRM.blue), alpha * 0.85);
  g.fillRect(x, cy, W * Phaser.Math.Clamp(ratio, 0, 1), H);
  g.fillStyle(tint(DRM.pale), alpha * 0.4);
  g.fillRect(x, cy, W * Phaser.Math.Clamp(ratio, 0, 1), H * 0.35);

  // The paddock sits on the plate: fence at the right-hand end, flock to its left.
  const groundY = cy + H - 1;
  fenceRun(g, tint, x + W - 20, groundY, 17, 8, alpha * 0.95);

  const landed = asleep ? flock : Math.floor(Phaser.Math.Clamp(ratio, 0, 1) * flock);
  for (let i = 0; i < landed; i++) {
    // Settled sheep bunch up against the fence, each a little behind the last.
    const sx = x + W - 26 - i * 8.5;
    const bob = asleep ? 0 : Math.sin(t * 2.2 + i * 1.1) * 0.5;
    sheep(g, tint, sx, groundY - 3.4 + bob, 6.4, alpha, t * 5 + i, asleep);
  }

  if (!asleep && landed < flock) {
    // The jumper: travels right-to-left over the fence, arcing on the fractional part.
    const p = (Phaser.Math.Clamp(ratio, 0, 1) * flock) % 1;
    const jx = x + W - 8 - p * 20;
    const jy = groundY - 3.4 - Math.sin(p * Math.PI) * 9;
    sheep(g, tint, jx, jy, 6.4, alpha, t * 9, false);
  }

  if (asleep) {
    zzz(g, tint, x + 5, cy - 5, 4.2, alpha, t);
  }
}

/** Three stacked Z glyphs drifting up and to the right — the universal "asleep". */
export function zzz(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, s: number,
  alpha = 1,
  t = 0,
): void {
  for (let i = 0; i < 3; i++) {
    const f = ((t * 0.5 + i / 3) % 1);
    const zs = s * (0.6 + i * 0.24);
    const zx = x + i * s * 0.8 + Math.sin(t * 2 + i) * 1.6;
    const zy = y - f * s * 2.2;
    const a = alpha * (1 - f) * 0.95;
    g.lineStyle(Math.max(0.8, zs * 0.22), tint(DRM.pale), a);
    g.beginPath();
    g.moveTo(zx - zs / 2, zy - zs / 2);
    g.lineTo(zx + zs / 2, zy - zs / 2);
    g.lineTo(zx - zs / 2, zy + zs / 2);
    g.lineTo(zx + zs / 2, zy + zs / 2);
    g.strokePath();
  }
}

/**
 * A heart-rate trace in a little monitor panel. `phase` scrolls the sweep; the spike shape
 * is a real QRS complex (small dip, tall spike, undershoot, rounded T wave) rather than a
 * zigzag, because that silhouette is what makes it read as a heart monitor at 40px wide.
 */
export function ekgTrace(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  cx: number, cy: number, w: number, h: number,
  phase: number,
  alpha = 1,
): void {
  const x = cx - w / 2;
  g.fillStyle(tint(DRM.dreadDeep), alpha * 0.85);
  g.fillRoundedRect(x - 2, cy - h / 2 - 2, w + 4, h + 4, 3);
  g.lineStyle(1, tint(DRM.dread), alpha * 0.9);
  g.strokeRoundedRect(x - 2, cy - h / 2 - 2, w + 4, h + 4, 3);

  /** Trace height at position `u` (0–1 across the panel), in units of half-height. */
  const wave = (u: number): number => {
    // The complex occupies the middle fifth of each beat; the rest is flat baseline.
    const b = (u * 2) % 1;
    if (b < 0.34 || b > 0.62) return Math.sin(b * TAU * 2) * 0.05;
    const k = (b - 0.34) / 0.28;
    if (k < 0.18) return -0.22 * Math.sin((k / 0.18) * Math.PI);
    if (k < 0.4) return Math.sin(((k - 0.18) / 0.22) * Math.PI) * 1;
    if (k < 0.56) return -0.42 * Math.sin(((k - 0.4) / 0.16) * Math.PI);
    return 0.3 * Math.sin(((k - 0.56) / 0.44) * Math.PI);
  };

  const steps = 30;
  g.lineStyle(1.6, tint(DRM.dread), alpha);
  g.beginPath();
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const py = cy - wave(u + phase) * (h / 2) * 0.92;
    if (i === 0) g.moveTo(x + u * w, py);
    else g.lineTo(x + u * w, py);
  }
  g.strokePath();

  // The sweep head, so the trace reads as live rather than printed.
  const hu = (phase * 2) % 1;
  g.fillStyle(tint(DRM.white), alpha);
  g.fillCircle(x + hu * w, cy - wave(hu + phase) * (h / 2) * 0.92, 1.5);
}

/**
 * A pillow, drawn as a rounded slab along `angle` with a seam, two corner tufts and a
 * highlight. The tufts are what stop it reading as a brick.
 */
export function pillowShape(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  cx: number, cy: number,
  angle: number, len: number, thick: number,
  alpha = 1,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  const at = (d: number, o: number) => new Phaser.Geom.Point(cx + cos * d + px * o, cy + sin * d + py * o);

  // Body: a hexagon with bulged long sides, so it looks stuffed.
  const hl = len / 2, ht = thick / 2;
  const body = [
    at(-hl, -ht * 0.62), at(-hl * 0.5, -ht), at(hl * 0.5, -ht), at(hl, -ht * 0.62),
    at(hl, ht * 0.62), at(hl * 0.5, ht), at(-hl * 0.5, ht), at(-hl, ht * 0.62),
  ];
  g.fillStyle(tint(DRM.pillowDeep), alpha);
  g.fillPoints(body.map((p) => new Phaser.Geom.Point(p.x + 1.5, p.y + 1.5)), true);
  g.fillStyle(tint(DRM.pillow), alpha);
  g.fillPoints(body, true);

  // Seam down the long axis and a soft highlight above it.
  g.lineStyle(1.1, tint(DRM.pillowDeep), alpha * 0.8);
  const s0 = at(-hl * 0.8, 0), s1 = at(hl * 0.8, 0);
  g.lineBetween(s0.x, s0.y, s1.x, s1.y);
  g.fillStyle(tint(DRM.white), alpha * 0.4);
  const hi = at(-hl * 0.15, -ht * 0.5);
  g.fillEllipse(hi.x, hi.y, len * 0.4, thick * 0.24);

  // Corner tufts.
  g.fillStyle(tint(DRM.white), alpha * 0.9);
  for (const [d, o] of [[-hl, -ht * 0.62], [-hl, ht * 0.62], [hl, -ht * 0.62], [hl, ht * 0.62]]) {
    const p = at(d, o);
    g.fillCircle(p.x, p.y, thick * 0.11);
  }
}

/**
 * The Pillow Fort (E+). A ring of stacked pillows with a lit interior you can rest in, drawn
 * larger and with more courses of masonry as it is promoted. The level has to be readable at a
 * glance from across the arena, so it is told three ways at once: the footprint, the number of
 * pillow courses, and a row of pips over the parapet.
 */
export function pillowFort(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, r: number,
  level: number, hpRatio: number, t: number, alpha = 1,
): void {
  const breathe = 1 + Math.sin(t * 1.6) * 0.012;
  const rr = r * breathe;

  // The floor of the fort: somewhere soft, and lit, so "you can stand in this" is obvious.
  g.fillStyle(tint(DRM.deep), alpha * 0.55);
  g.fillEllipse(x, y, rr * 2, rr * 1.35);
  g.fillStyle(tint(DRM.violet), alpha * 0.16);
  g.fillEllipse(x, y, rr * 1.55, rr * 1.05);

  // The wall: pillows laid end-on around the rim, one course per two levels.
  const courses = 1 + Math.floor((level - 1) / 2);
  const n = 9 + level;
  for (let c = 0; c < courses; c++) {
    const lift = c * 5.5;
    for (let i = 0; i < n; i++) {
      // Offset every other course so the joints do not line up into a stripe.
      const a = ((i + (c % 2) * 0.5) / n) * Math.PI * 2 + t * 0.06;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr * 0.66 - lift;
      // Tangent, so each pillow lies along the wall rather than pointing at the middle.
      pillowShape(g, tint, px, py, a + Math.PI / 2, rr * 0.52, rr * 0.3, alpha * (0.75 + c * 0.12));
    }
  }

  // Damage: the wall darkens and the seams open as the HP falls.
  if (hpRatio < 0.999) {
    g.fillStyle(tint(DRM.night), alpha * (1 - hpRatio) * 0.42);
    g.fillEllipse(x, y - (courses - 1) * 2.5, rr * 2.1, rr * 1.5);
    g.lineStyle(1.4, tint(DRM.dread), alpha * (1 - hpRatio) * 0.7);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      g.lineBetween(x + Math.cos(a) * rr * 0.5, y + Math.sin(a) * rr * 0.33,
        x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.66);
    }
  }

  // Level pips over the parapet, and a star on the fifth for the cannon.
  const py0 = y - rr * 0.72 - courses * 5.5 - 8;
  for (let i = 0; i < 5; i++) {
    const px = x - 20 + i * 10;
    if (i < level) {
      g.fillStyle(tint(i === 4 ? DRM.star : DRM.pale), alpha * 0.95);
      g.fillCircle(px, py0, 3);
    } else {
      g.lineStyle(1, tint(DRM.deep), alpha * 0.8);
      g.strokeCircle(px, py0, 3);
    }
  }

  // A slow drift of feathers over the top, so a fort at rest still looks alive.
  for (let i = 0; i < 4; i++) {
    const ph = (t * 0.35 + i / 4) % 1;
    g.fillStyle(tint(DRM.white), alpha * (1 - ph) * 0.5);
    g.fillEllipse(x + Math.sin(ph * 5 + i * 2) * rr * 0.8, y - rr * 0.5 - ph * 26,
      3.4, 1.8);
  }

  // The healing aura, once the fort is worth resting in.
  if (level >= 2) {
    g.lineStyle(1.6, tint(DRM.water), alpha * (0.2 + 0.18 * Math.sin(t * 2.4)));
    g.strokeEllipse(x, y, rr * 1.9, rr * 1.25);
  }
}

/**
 * The cosmic cannon a level-5 fort carries: a short starry barrel on a pillow carriage, aimed
 * where the shot is going. `charge` is 0 while it is cooling and 1 once it is loaded.
 */
export function cosmicCannon(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, ang: number, charge: number, t: number, alpha = 1,
): void {
  const cos = Math.cos(ang), sin = Math.sin(ang);
  // Carriage.
  g.fillStyle(tint(DRM.pillowDeep), alpha);
  g.fillEllipse(x, y + 3, 20, 10);
  // Barrel: a tapered wedge with a piece of night sky inside it.
  const w0 = 7, w1 = 5;
  const bx = x + cos * 22, by = y + sin * 22;
  g.fillStyle(tint(DRM.deep), alpha);
  g.fillPoints([
    new Phaser.Geom.Point(x - sin * w0, y + cos * w0),
    new Phaser.Geom.Point(x + sin * w0, y - cos * w0),
    new Phaser.Geom.Point(bx + sin * w1, by - cos * w1),
    new Phaser.Geom.Point(bx - sin * w1, by + cos * w1),
  ], true);
  g.lineStyle(1.6, tint(DRM.violet), alpha * 0.9);
  g.strokePoints([
    new Phaser.Geom.Point(x - sin * w0, y + cos * w0),
    new Phaser.Geom.Point(x + sin * w0, y - cos * w0),
    new Phaser.Geom.Point(bx + sin * w1, by - cos * w1),
    new Phaser.Geom.Point(bx - sin * w1, by + cos * w1),
  ], true, true);
  // Starfield down the barrel.
  for (let i = 0; i < 5; i++) {
    const f = (i + 0.5) / 5;
    star(g, tint, x + cos * 22 * f, y + sin * 22 * f, 1.7, alpha * 0.8, DRM.star, t * 2 + i);
  }
  // The muzzle glow, only once it is loaded.
  if (charge > 0.02) {
    g.fillStyle(tint(DRM.purple), alpha * charge * 0.5);
    g.fillCircle(bx, by, 8 + Math.sin(t * 8) * 2);
    star(g, tint, bx, by, 7, alpha * charge, DRM.white, t * 3);
  }
}

/**
 * An angry ram out of the fort: `sheep` with its head down, horns on, and a plume of dust
 * behind it. Drawn at `ang` so the charge reads as a direction rather than a wobble.
 */
export function angryRam(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, s: number, ang: number, t: number, alpha = 1,
): void {
  // Dust behind it, laid down first so the ram sits on top of its own trail.
  for (let i = 0; i < 5; i++) {
    const d = 8 + i * 7;
    g.fillStyle(tint(DRM.woolShade), alpha * (0.35 - i * 0.06));
    g.fillCircle(x - Math.cos(ang) * d, y - Math.sin(ang) * d + 4, 5 - i * 0.7);
  }
  // `sheep` faces left, so the body is flipped by drawing it offset along the charge line.
  sheep(g, tint, x, y, s, alpha, t * 12, false);
  // Horns: two curls at the muzzle end, which is where the damage comes from.
  const hx = x - 0.62 * s;
  const hy = y - 0.1 * s;
  g.lineStyle(Math.max(1.2, 0.1 * s), tint(DRM.hoof), alpha);
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(hx + 0.06 * s, hy - 0.22 * s);
    g.arc(hx - 0.06 * s, hy - 0.1 * s + side * 0.06 * s, 0.22 * s, -1.2, 2.2, false);
    g.strokePath();
  }
  // Red eye, because it is not a paddock sheep any more.
  g.fillStyle(tint(DRM.dread), alpha);
  g.fillCircle(hx - 0.08 * s, hy - 0.02 * s, 0.1 * s);
}

/**
 * The mark over somebody held in a Night Terror. Three different pictures, because the three
 * nightmares have three different after-effects and the victim has to be able to tell which
 * one they are about to wake up into.
 */
export function nightTerror(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, kind: 0 | 1 | 2, t: number, alpha = 1,
): void {
  // A bubble of somewhere else, sitting over the body.
  const r = 30;
  g.fillStyle(tint(DRM.night), alpha * 0.88);
  g.fillCircle(x, y - 46, r);
  g.lineStyle(2.4, tint(DRM.dread), alpha * (0.6 + 0.3 * Math.sin(t * 5)));
  g.strokeCircle(x, y - 46, r);
  const cy = y - 46;

  if (kind === 0) {
    // The corridor: receding door frames with two eyes at the far end of them.
    for (let i = 0; i < 4; i++) {
      const f = 1 - i / 4;
      g.lineStyle(1.4, tint(DRM.dreadDeep), alpha * (0.4 + f * 0.5));
      g.strokeRect(x - 15 * f, cy - 16 * f, 30 * f, 30 * f);
    }
    g.fillStyle(tint(DRM.dread), alpha * (0.6 + 0.4 * Math.sin(t * 9)));
    g.fillCircle(x - 4, cy - 2, 2.4);
    g.fillCircle(x + 4, cy - 2, 2.4);
  } else if (kind === 1) {
    // The pit: rings falling away, and a small figure dropping down them.
    for (let i = 0; i < 5; i++) {
      const f = ((t * 0.7 + i / 5) % 1);
      g.lineStyle(1.6, tint(DRM.violet), alpha * (1 - f) * 0.8);
      g.strokeEllipse(x, cy, (4 + f * 46), (2 + f * 22));
    }
    g.fillStyle(tint(DRM.pale), alpha * 0.9);
    g.fillCircle(x, cy - 10 + ((t * 40) % 26), 3);
  } else {
    // The horde: a scatter of little eye-pairs closing on the middle.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + t * 1.4;
      const d = 20 - ((t * 12 + i * 4) % 16);
      const ex = x + Math.cos(a) * d;
      const ey = cy + Math.sin(a) * d * 0.7;
      g.fillStyle(tint(DRM.dreadDeep), alpha * 0.85);
      g.fillEllipse(ex, ey, 9, 6);
      g.fillStyle(tint(DRM.dread), alpha);
      g.fillCircle(ex - 1.8, ey, 1.4);
      g.fillCircle(ex + 1.8, ey, 1.4);
    }
  }
}

/** A single drifting dream: a soft orb with a bright core and a wisp of tail. */
export function dreamOrb(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, r: number,
  alpha = 1,
  t = 0,
): void {
  g.fillStyle(tint(DRM.violet), alpha * 0.35);
  g.fillCircle(x, y, r * 1.9);
  g.fillStyle(tint(DRM.blue), alpha * 0.6);
  g.fillCircle(x, y, r * 1.15);
  g.fillStyle(tint(DRM.pale), alpha * 0.95);
  g.fillCircle(x, y, r * 0.6);
  star(g, tint, x, y, r * 1.5, alpha * 0.7, DRM.white, t);
}

/**
 * A drifting "z", for a fighter who has stopped moving. Built from three tapered bars
 * rather than a text glyph, so it takes the owner's palette like everything else and can
 * be faded letter by letter as it climbs.
 */
export function sleepyZ(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, s: number,
  alpha = 1,
  tilt = 0,
): void {
  const w = s, h = s * 1.1, th = Math.max(1.2, s * 0.26);
  const at = (dx: number, dy: number) => ({
    x: x + dx * Math.cos(tilt) - dy * Math.sin(tilt),
    y: y + dx * Math.sin(tilt) + dy * Math.cos(tilt),
  });
  const bar = (x0: number, y0: number, x1: number, y1: number, color: number, a: number) => {
    const p0 = at(x0, y0), p1 = at(x1, y1);
    g.lineStyle(th, tint(color), a);
    g.lineBetween(p0.x, p0.y, p1.x, p1.y);
  };
  // Offset shadow pass first, so the glyph survives a bright arena floor behind it.
  for (const [dx, dy, col, a] of [[1.4, 1.4, DRM.deep, alpha * 0.5], [0, 0, DRM.pale, alpha]] as const) {
    bar(-w / 2 + dx, -h / 2 + dy, w / 2 + dx, -h / 2 + dy, col, a);
    bar(w / 2 + dx, -h / 2 + dy, -w / 2 + dx, h / 2 + dy, col, a);
    bar(-w / 2 + dx, h / 2 + dy, w / 2 + dx, h / 2 + dy, col, a);
  }
  const tipx = at(w / 2, -h / 2);
  star(g, tint, tipx.x, tipx.y, s * 0.3, alpha * 0.7, DRM.star);
}

// ── Dream Duel ────────────────────────────────────────────────────────────

/**
 * A spirit, standing out of its own body: a hooded wisp with two lights for eyes and a
 * tattered hem that never quite reaches the floor.
 *
 * Drawn from the shoulders down as a tapering column of overlapping ellipses rather than a
 * silhouette, because a wisp has to look like it is *made of* something rather than cut out
 * of it — and the hem is sampled off a travelling sine so the bottom of it is always moving.
 * `hostile` swaps the palette to the haunting red, for the spirit that is being shot at.
 */
export function spiritForm(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, s: number, t: number,
  alpha = 1,
  hostile = false,
  facing = 0,
): void {
  const body = hostile ? DRM.haunt : DRM.spirit;
  const deep = hostile ? DRM.hauntDeep : DRM.spiritDeep;
  const bob = Math.sin(t * 2.1) * s * 0.08;
  const cy = y + bob;

  // The glow it sits inside.
  g.fillStyle(tint(deep), alpha * 0.22);
  g.fillCircle(x, cy, s * 1.25);
  g.fillStyle(tint(body), alpha * 0.12);
  g.fillCircle(x, cy, s * 0.95);

  // The column: five ellipses from the hood down, each a little wider and a little fainter,
  // and each swaying a little further than the one above it.
  for (let i = 0; i < 5; i++) {
    const f = i / 4;
    const sway = Math.sin(t * 2.6 - f * 2.2) * s * 0.16 * f;
    const w = s * (0.62 + f * 0.52);
    const h = s * 0.42;
    g.fillStyle(tint(i < 2 ? body : deep), alpha * (0.85 - f * 0.35));
    g.fillEllipse(x + sway, cy - s * 0.45 + f * s * 1.1, w, h);
  }

  // The hem — six tatters sampled off a travelling wave, so it frays rather than ends.
  const hemY = cy + s * 0.72;
  for (let i = 0; i < 7; i++) {
    const f = (i / 6) - 0.5;
    const px = x + f * s * 1.15 + Math.sin(t * 2.6 - 1.1) * s * 0.16;
    const drop = s * (0.18 + 0.22 * (0.5 + 0.5 * Math.sin(t * 3.4 + i * 1.7)));
    g.fillStyle(tint(deep), alpha * 0.55);
    g.fillTriangle(px - s * 0.1, hemY, px + s * 0.1, hemY, px, hemY + drop);
  }

  // The hood, and two lights in it.
  g.fillStyle(tint(body), alpha * 0.95);
  g.fillEllipse(x, cy - s * 0.62, s * 0.78, s * 0.72);
  g.fillStyle(tint(DRM.night), alpha * 0.8);
  g.fillEllipse(x, cy - s * 0.56, s * 0.56, s * 0.54);
  const ex = Math.cos(facing) * s * 0.1;
  const ey = Math.sin(facing) * s * 0.06;
  for (const sgn of [-1, 1]) {
    star(g, tint, x + sgn * s * 0.17 + ex, cy - s * 0.6 + ey, s * 0.16,
      alpha * 0.95, hostile ? DRM.haunt : DRM.white, t * 2 + sgn);
  }
}

/**
 * The thread back to the body: a slack cord with a bead of light travelling down it, drawn
 * with a sag proportional to how much slack there actually is. A spirit standing on top of
 * its own body has a thread that hangs; one at the edge of its leash has a taut, humming one.
 */
export function spiritThread(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  bx: number, by: number, sx: number, sy: number,
  leash: number, t: number,
  alpha = 1,
  hostile = false,
): void {
  const d = Math.hypot(sx - bx, sy - by);
  const slack = Math.max(0, 1 - d / Math.max(1, leash));
  const nx = -(sy - by), ny = sx - bx;
  const len = Math.hypot(nx, ny) || 1;
  const col = hostile ? DRM.haunt : DRM.spirit;
  // Taut threads hum: the wobble frequency climbs as the slack runs out.
  const hum = 1 + (1 - slack) * 4;

  g.lineStyle(1.6, tint(col), alpha * (0.35 + 0.4 * (1 - slack)));
  g.beginPath();
  g.moveTo(bx, by);
  const segs = 12;
  for (let i = 1; i <= segs; i++) {
    const f = i / segs;
    const sag = Math.sin(f * Math.PI) * (10 + slack * 26);
    const wob = Math.sin(t * 3 * hum + f * 7) * (2 + (1 - slack) * 3) * Math.sin(f * Math.PI);
    g.lineTo(
      bx + (sx - bx) * f + (nx / len) * wob,
      by + (sy - by) * f + (ny / len) * wob + sag,
    );
  }
  g.strokePath();

  const p = (t * 0.6) % 1;
  const sag = Math.sin(p * Math.PI) * (10 + slack * 26);
  dreamOrb(g, tint, bx + (sx - bx) * p, by + (sy - by) * p + sag, 2.2, alpha * 0.9, t);
}

/**
 * The leash: the circle a spirit may not leave. Painted as a dashed ring that tightens and
 * brightens as the spirit approaches it, so the wall is felt before it is hit.
 */
export function leashRing(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, r: number, t: number,
  press: number,
  alpha = 1,
  hostile = false,
): void {
  const col = hostile ? DRM.haunt : DRM.spirit;
  const dashes = 30;
  for (let i = 0; i < dashes; i++) {
    const a0 = (i / dashes) * TAU + t * 0.35;
    const a1 = a0 + (TAU / dashes) * 0.55;
    g.lineStyle(1.4 + press * 2.2, tint(col), alpha * (0.24 + press * 0.6));
    g.beginPath();
    g.moveTo(x + Math.cos(a0) * r, y + Math.sin(a0) * r * 0.72);
    g.lineTo(x + Math.cos(a1) * r, y + Math.sin(a1) * r * 0.72);
    g.strokePath();
  }
  g.fillStyle(tint(hostile ? DRM.hauntDeep : DRM.deep), alpha * 0.06);
  g.fillEllipse(x, y, r * 2, r * 1.44);
}

/**
 * A Haunt bolt: a red splinter with a smeared tail and a black core, so it reads as
 * something torn out of a person rather than a bullet.
 */
export function hauntBolt(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, angle: number, s: number, t: number,
  alpha = 1,
): void {
  const cx = Math.cos(angle), cy = Math.sin(angle);
  for (let i = 4; i >= 1; i--) {
    g.fillStyle(tint(DRM.hauntDeep), alpha * 0.32 * (1 - i / 5));
    g.fillCircle(x - cx * i * s * 0.62, y - cy * i * s * 0.62, s * (0.72 - i * 0.11));
  }
  g.fillStyle(tint(DRM.haunt), alpha * 0.4);
  g.fillCircle(x, y, s * 1.5);
  // The splinter itself: a long triangle down the line of travel with a notch behind it.
  g.fillStyle(tint(DRM.haunt), alpha);
  g.fillTriangle(
    x + cx * s * 1.6, y + cy * s * 1.6,
    x - cx * s * 0.9 - cy * s * 0.62, y - cy * s * 0.9 + cx * s * 0.62,
    x - cx * s * 0.9 + cy * s * 0.62, y - cy * s * 0.9 - cx * s * 0.62,
  );
  g.fillStyle(tint(DRM.night), alpha * 0.85);
  g.fillTriangle(
    x + cx * s * 0.7, y + cy * s * 0.7,
    x - cx * s * 0.4 - cy * s * 0.24, y - cy * s * 0.4 + cx * s * 0.24,
    x - cx * s * 0.4 + cy * s * 0.24, y - cy * s * 0.4 - cx * s * 0.24,
  );
  star(g, tint, x, y, s * 0.6, alpha * 0.8, DRM.white, t * 6);
}

/**
 * A Spirit Tear: an enormous slow white lens with a rip of night down the middle of it, plus
 * the two smaller ones that go round it. The moons are drawn by the caller at their own
 * positions — this is just the head.
 */
export function spiritTearShape(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, r: number, t: number,
  alpha = 1,
): void {
  g.fillStyle(tint(DRM.spirit), alpha * 0.16);
  g.fillCircle(x, y, r * 1.7);
  g.fillStyle(tint(DRM.spiritDeep), alpha * 0.34);
  g.fillCircle(x, y, r * 1.15);
  g.fillStyle(tint(DRM.white), alpha * 0.85);
  g.fillCircle(x, y, r);
  // The rip: a tall lens of night, slowly rotating, which is what makes it a *tear*.
  const spin = t * 0.7;
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 14; i++) {
    const f = (i / 13) * Math.PI;
    const w = Math.sin(f) * r * 0.32;
    const h = -r * 0.8 + (i / 13) * r * 1.6;
    pts.push(new Phaser.Geom.Point(
      x + Math.cos(spin) * w - Math.sin(spin) * h,
      y + Math.sin(spin) * w + Math.cos(spin) * h,
    ));
  }
  for (let i = 13; i >= 0; i--) {
    const f = (i / 13) * Math.PI;
    const w = -Math.sin(f) * r * 0.32;
    const h = -r * 0.8 + (i / 13) * r * 1.6;
    pts.push(new Phaser.Geom.Point(
      x + Math.cos(spin) * w - Math.sin(spin) * h,
      y + Math.sin(spin) * w + Math.cos(spin) * h,
    ));
  }
  g.fillStyle(tint(DRM.night), alpha * 0.9);
  g.fillPoints(pts, true);
  star(g, tint, x, y, r * 0.5, alpha * 0.9, DRM.white, t * 1.6);
}

/** One of the two moons orbiting a Spirit Tear. Smaller, and the same shape in miniature. */
export function tearMoon(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, r: number, t: number,
  alpha = 1,
): void {
  g.fillStyle(tint(DRM.spiritDeep), alpha * 0.3);
  g.fillCircle(x, y, r * 1.6);
  g.fillStyle(tint(DRM.white), alpha * 0.9);
  g.fillCircle(x, y, r);
  g.fillStyle(tint(DRM.night), alpha * 0.75);
  g.fillEllipse(x, y, r * 0.5, r * 1.3);
  star(g, tint, x, y, r * 0.8, alpha * 0.6, DRM.star, t * 3);
}

// ── Lifelong Dream ────────────────────────────────────────────────────────

/**
 * The wish counter over the dreamer's head: a ring that empties as the seconds go, the
 * number in the middle of it, and the chosen element's emoji orbiting the whole thing.
 *
 * The ring is drawn *anticlockwise from the top* so it reads as a countdown rather than a
 * charge, and it flashes gold whenever the number goes back up — which is the one thing the
 * player has to be able to see happen.
 */
export function wishCounter(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, r: number,
  fraction: number, t: number,
  jolt: number,
  alpha = 1,
): void {
  const col = jolt > 0 ? DRM.dread : DRM.wish;
  g.fillStyle(tint(DRM.night), alpha * 0.8);
  g.fillCircle(x, y, r + 3);
  g.lineStyle(2, tint(DRM.wishDeep), alpha * 0.7);
  g.strokeCircle(x, y, r);

  const segs = 40;
  const lit = Math.max(0, Math.min(segs, Math.round(segs * fraction)));
  for (let i = 0; i < lit; i++) {
    const a0 = -Math.PI / 2 - (i / segs) * TAU;
    const a1 = a0 - (TAU / segs) * 0.7;
    g.lineStyle(3.2 + jolt * 2, tint(col), alpha * (0.85 + jolt * 0.15));
    g.beginPath();
    g.moveTo(x + Math.cos(a0) * r, y + Math.sin(a0) * r);
    g.lineTo(x + Math.cos(a1) * r, y + Math.sin(a1) * r);
    g.strokePath();
  }
  // Four stars turning round it, faster the closer it gets.
  for (let i = 0; i < 4; i++) {
    const a = t * (1.2 + (1 - fraction) * 2.6) + (i / 4) * TAU;
    star(g, tint, x + Math.cos(a) * (r + 7), y + Math.sin(a) * (r + 7),
      2 + (1 - fraction) * 1.6, alpha * 0.8, DRM.star, a * 2);
  }
  if (jolt > 0) {
    g.lineStyle(2, tint(DRM.dread), alpha * jolt);
    g.strokeCircle(x, y, r + 6 + jolt * 8);
  }
}

/**
 * The halo a dream that has come true leaves on the dreamer: a slow crown of stars, one per
 * boon, turning above the head for the rest of the match.
 */
export function dreamCrown(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, r: number, count: number, t: number,
  alpha = 1,
  color = DRM.wish,
): void {
  g.lineStyle(1.4, tint(color), alpha * (0.3 + 0.15 * Math.sin(t * 2)));
  g.strokeEllipse(x, y, r * 2, r * 0.7);
  for (let i = 0; i < count; i++) {
    const a = t * 0.8 + (i / Math.max(1, count)) * TAU;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r * 0.35;
    // Behind the head on the far half of the orbit, so the crown reads as 3D.
    const depth = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(a));
    star(g, tint, px, py, 3.2 * depth, alpha * depth, color, a * 2);
  }
}

/**
 * A dreamcatcher lying on the floor: a bound hoop, a radial web woven inward, three
 * feathers on cords, and whatever dreams it has caught turning inside the ring.
 */
export function dreamcatcherShape(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, r: number, t: number,
  dreams: number,
  alpha = 1,
): void {
  // Feathers first — they hang below and must sit under the hoop.
  for (let i = -1; i <= 1; i++) {
    const fx = x + i * r * 0.62;
    const fy = y + r * 0.9;
    const sway = Math.sin(t * 1.6 + i) * 0.18;
    const len = r * (0.85 - Math.abs(i) * 0.18);
    g.lineStyle(1, tint(DRM.hoop), alpha * 0.9);
    g.lineBetween(fx, y + r * 0.55, fx + sway * 6, fy);
    // Barbs down both sides of a quill.
    const ang = Math.PI / 2 + sway;
    const tipX = fx + Math.cos(ang) * len + sway * 8;
    const tipY = fy + Math.sin(ang) * len;
    g.lineStyle(1.4, tint(DRM.web), alpha * 0.85);
    g.lineBetween(fx, fy, tipX, tipY);
    for (let b = 1; b <= 5; b++) {
      const f = b / 6;
      const bx = fx + (tipX - fx) * f;
      const by = fy + (tipY - fy) * f;
      const bw = r * 0.24 * (1 - f * 0.55);
      g.lineStyle(1, tint(b % 2 ? DRM.pale : DRM.web), alpha * 0.7);
      g.lineBetween(bx, by, bx - bw, by - bw * 0.35);
      g.lineBetween(bx, by, bx + bw, by - bw * 0.35);
    }
  }

  // Web: an eight-spoke frame with three inward rings knotted onto it.
  const spokes = 8;
  g.lineStyle(1, tint(DRM.web), alpha * 0.55);
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * TAU + t * 0.12;
    g.lineBetween(x, y, x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92);
  }
  for (let ring = 1; ring <= 3; ring++) {
    const rr = r * (0.92 - ring * 0.24);
    g.lineStyle(0.9, tint(DRM.pale), alpha * (0.55 - ring * 0.1));
    g.strokeCircle(x, y, rr);
  }

  // Hoop: a bound willow ring, wrapped in sinew.
  g.lineStyle(3.4, tint(DRM.hoop), alpha);
  g.strokeCircle(x, y, r);
  g.lineStyle(1.1, tint(DRM.night), alpha * 0.5);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU;
    g.lineBetween(
      x + Math.cos(a) * (r - 2.4), y + Math.sin(a) * (r - 2.4),
      x + Math.cos(a + 0.22) * (r + 2.4), y + Math.sin(a + 0.22) * (r + 2.4),
    );
  }

  // Caught dreams, orbiting inside the web.
  for (let i = 0; i < dreams; i++) {
    const a = t * 1.2 + (i / Math.max(1, dreams)) * TAU;
    const d = r * 0.44;
    dreamOrb(g, tint, x + Math.cos(a) * d, y + Math.sin(a) * d, 2.6, alpha, t + i);
  }
}

/** The pendulum's bob: a faceted crescent gem on a haze, turning slowly on its own axis. */
export function pendulumBob(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, r: number, t: number, heat: number,
  alpha = 1,
): void {
  g.fillStyle(tint(DRM.violet), alpha * (0.2 + heat * 0.3));
  g.fillCircle(x, y, r * (2.2 + heat));
  nebula(g, tint, x, y, r * 1.15, t, alpha * 0.9);

  // Faceted gem: an eight-sided body with two lit facets.
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 8; i++) {
    const a = t * 0.9 + (i / 8) * TAU;
    const d = r * (i % 2 === 0 ? 1 : 0.78);
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * d, y + Math.sin(a) * d));
  }
  g.fillStyle(tint(DRM.deep), alpha);
  g.fillPoints(pts, true);
  g.fillStyle(tint(DRM.purple), alpha * 0.9);
  g.fillTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, x, y);
  g.fillStyle(tint(DRM.blue), alpha * 0.8);
  g.fillTriangle(pts[2].x, pts[2].y, pts[3].x, pts[3].y, x, y);
  g.lineStyle(1, tint(DRM.pale), alpha * 0.7);
  g.strokePoints(pts, true, true);

  // The crescent inside it — the thing that makes it a sleep charm and not a rock.
  g.fillStyle(tint(DRM.star), alpha * (0.7 + heat * 0.3));
  g.fillCircle(x, y, r * 0.46);
  g.fillStyle(tint(DRM.deep), alpha);
  g.fillCircle(x + r * 0.2, y - r * 0.08, r * 0.42);
  star(g, tint, x - r * 0.32, y + r * 0.3, r * 0.3, alpha * 0.9, DRM.white, t * 2);
}

/**
 * A meadow tree for the oasis: a leaning trunk with two boughs under a canopy of leaf
 * clusters. The canopy is built from overlapping blobs rather than one circle, because one
 * circle on a stick is a lollipop and a handful of blobs is a tree.
 */
export function meadowTree(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, h: number, lean: number, sway: number,
  alpha = 1,
): void {
  const topX = x + lean * h;
  const topY = y - h * 0.72;
  const drift = Math.sin(sway) * h * 0.022;

  // Trunk: wide at the root, tapering into the canopy.
  g.fillStyle(tint(DRM.barkDark), alpha);
  g.fillPoints([
    new Phaser.Geom.Point(x - h * 0.075, y),
    new Phaser.Geom.Point(x + lean * h * 0.36 - h * 0.035, y - h * 0.42),
    new Phaser.Geom.Point(topX - h * 0.028, topY),
    new Phaser.Geom.Point(topX + h * 0.028, topY),
    new Phaser.Geom.Point(x + lean * h * 0.36 + h * 0.04, y - h * 0.42),
    new Phaser.Geom.Point(x + h * 0.075, y),
  ], true);
  // A lit strip down one side, so the trunk is round and not a plank.
  g.fillStyle(tint(DRM.bark), alpha * 0.85);
  g.fillPoints([
    new Phaser.Geom.Point(x + h * 0.018, y),
    new Phaser.Geom.Point(topX + h * 0.008, topY),
    new Phaser.Geom.Point(topX + h * 0.026, topY),
    new Phaser.Geom.Point(x + h * 0.072, y),
  ], true);

  // Two boughs reaching into the canopy.
  g.lineStyle(h * 0.035, tint(DRM.barkDark), alpha);
  for (const side of [-1, 1]) {
    const bx = x + lean * h * 0.52, by = y - h * 0.5;
    g.lineBetween(bx, by, bx + side * h * 0.2, by - h * 0.16);
  }

  // Canopy. Dark mass first, then a sunlit crown up and to the left of each blob.
  const blobs: [number, number, number][] = [
    [0, -0.30, 0.30], [-0.30, -0.12, 0.25], [0.30, -0.14, 0.25],
    [-0.16, -0.02, 0.23], [0.18, 0.00, 0.22], [0, -0.16, 0.28],
  ];
  for (const [ox, oy, r] of blobs) {
    g.fillStyle(tint(DRM.leafDark), alpha);
    g.fillCircle(topX + ox * h + drift * (1 - oy), topY + oy * h, r * h);
  }
  for (const [ox, oy, r] of blobs) {
    g.fillStyle(tint(DRM.leaf), alpha * 0.9);
    g.fillCircle(topX + ox * h - r * h * 0.2 + drift * (1 - oy), topY + oy * h - r * h * 0.24, r * h * 0.66);
  }
}

/** A tuft of grass: three curved blades off one root, leaning together in the breeze. */
export function grassTuft(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, h: number, sway: number, color: number,
  alpha = 1,
): void {
  g.fillStyle(tint(color), alpha);
  for (let i = -1; i <= 1; i++) {
    const lean = i * 0.34 + sway;
    const bh = h * (1 - Math.abs(i) * 0.2);
    const w = Math.max(1, h * 0.075);
    g.fillPoints([
      new Phaser.Geom.Point(x - w, y),
      new Phaser.Geom.Point(x + lean * bh * 0.45 - w * 0.5, y - bh * 0.6),
      new Phaser.Geom.Point(x + lean * bh, y - bh),
      new Phaser.Geom.Point(x + lean * bh * 0.45 + w * 0.6, y - bh * 0.55),
      new Phaser.Geom.Point(x + w, y),
    ], true);
  }
}

/** A wildflower: a nodding stem with a five-petal head and a bright eye. */
export function wildflower(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, r: number, color: number, sway: number,
  alpha = 1,
): void {
  const hx = x + Math.sin(sway) * r * 1.1;
  const hy = y - r * 3.4;
  g.lineStyle(Math.max(1, r * 0.3), tint(DRM.leafDark), alpha * 0.9);
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + Math.sin(sway) * r * 0.4, y - r * 1.8);
  g.lineTo(hx, hy);
  g.strokePath();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + sway * 0.4;
    g.fillStyle(tint(color), alpha);
    g.fillCircle(hx + Math.cos(a) * r * 0.85, hy + Math.sin(a) * r * 0.85, r * 0.6);
  }
  g.fillStyle(tint(DRM.star), alpha);
  g.fillCircle(hx, hy, r * 0.48);
}

// ── DreamFx ───────────────────────────────────────────────────────────────

/** One-shot Dream effects. One per owner so a skin recolours the right side. */
export class DreamFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: DreamColorFn = (c) => c) {
    super(scene, tint);
  }

  flash(x: number, y: number, radius: number, depth = 7): void {
    this.flashIn(x, y, radius, DRM.white, DRM.sky, depth);
  }

  /** Expanding ring of night — the punctuation on every Dream impact. */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration = 420, width = 4, depth = 6): void {
    const c = this.tint(color);
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      g.lineStyle(Math.max(0.5, width * (1 - t)), c, 0.9 * (1 - t * t));
      g.strokeCircle(x, y, r);
      g.lineStyle(Math.max(0.4, width * 0.4 * (1 - t)), this.tint(DRM.pale), 0.7 * (1 - t));
      g.strokeCircle(x, y, r * 0.84);
    });
  }

  /** Stardust drifting off something dreamlike. The element's ambient tell. */
  stardust(x: number, y: number, count: number, spread = 26, life = 800, depth = 6): void {
    const seeds = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * spread,
      oy: (Math.random() - 0.5) * spread * 0.7,
      rise: 12 + Math.random() * 30,
      drift: (Math.random() - 0.5) * 22,
      r: 1.4 + Math.random() * 2.4,
      ph: Math.random() * TAU,
    }));
    this.anim(depth, life, (g, t) => {
      for (const s of seeds) {
        const a = (1 - t) * 0.92;
        const px = x + s.ox + s.drift * t + Math.sin(s.ph + t * 5) * 3;
        const py = y + s.oy - s.rise * easeOut(t);
        star(g, this.tint, px, py, s.r * (1 - t * 0.45), a, t < 0.5 ? DRM.white : DRM.star, s.ph + t * 4);
      }
    });
  }

  /** A burst of Zs off something that just fell asleep. */
  zzzPuff(x: number, y: number, depth = 15): void {
    this.anim(depth, 1100, (g, t) => {
      zzz(g, this.tint, x - 6, y - 10 - t * 22, 7, (1 - t) * 0.95, t * 3);
    });
  }

  /** Feathers knocked out of a pillow. They flutter rather than fly. */
  feathers(x: number, y: number, count: number, angle: number, depth = 7): void {
    const seeds = Array.from({ length: count }, () => ({
      a: angle + (Math.random() - 0.5) * 1.9,
      v: 70 + Math.random() * 190,
      len: 5 + Math.random() * 7,
      spin: (Math.random() - 0.5) * 7,
      flut: Math.random() * TAU,
    }));
    this.anim(depth, 780, (g, t) => {
      for (const s of seeds) {
        const d = s.v * 0.7 * easeOut(t);
        // Sideways flutter as it slows: a feather never travels in a straight line.
        const wob = Math.sin(s.flut + t * 11) * 7 * t;
        const px = x + Math.cos(s.a) * d - Math.sin(s.a) * wob;
        const py = y + Math.sin(s.a) * d + Math.cos(s.a) * wob + t * t * 40;
        const rot = s.a + s.spin * t;
        const a = (1 - t) * 0.95;
        g.fillStyle(this.tint(DRM.white), a);
        g.fillEllipse(px, py, s.len * (1 - t * 0.3), s.len * 0.42);
        g.lineStyle(0.8, this.tint(DRM.pillowDeep), a * 0.8);
        g.lineBetween(
          px - Math.cos(rot) * s.len * 0.5, py - Math.sin(rot) * s.len * 0.5,
          px + Math.cos(rot) * s.len * 0.5, py + Math.sin(rot) * s.len * 0.5,
        );
      }
    });
  }

  /** A swung arc of pillow across the aim — the E gesture's trail. */
  pillowSwing(x: number, y: number, angle: number, reach: number, depth = 7): void {
    this.anim(depth, 300, (g, t) => {
      // Wound back, then driven through: the arc sweeps ~130° across the aim.
      const a = angle - 1.15 + easeOut(t) * 2.3;
      const d = reach * (0.45 + easeOut(t) * 0.55);
      const px = x + Math.cos(a) * d;
      const py = y + Math.sin(a) * d;
      const fade = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      // Smear behind the head so the swing has weight.
      for (let i = 0; i < 5; i++) {
        const ta = a - i * 0.16;
        g.fillStyle(this.tint(DRM.pillow), fade * 0.16 * (1 - i / 5));
        g.fillCircle(x + Math.cos(ta) * d, y + Math.sin(ta) * d, 13 - i);
      }
      pillowShape(g, this.tint, px, py, a + Math.PI / 2, 34, 20, fade);
    });
  }

  /** Ripped-open night — the tear a portal opens in, and the one it closes through. */
  tear(x: number, y: number, rx: number, ry: number, reverse: boolean, depth = 6): void {
    this.anim(depth, 520, (g, t) => {
      const k = reverse ? 1 - t : t;
      const a = reverse ? t : 1 - t;
      g.fillStyle(this.tint(DRM.night), 0.85 * (1 - Math.abs(k - 0.5) * 1.2));
      g.fillEllipse(x, y, rx * 2 * k, ry * 2 * k);
      g.lineStyle(3 * a + 1, this.tint(DRM.purple), a);
      g.strokeEllipse(x, y, rx * 2 * k, ry * 2 * k);
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * TAU + k * 3;
        star(g, this.tint, x + Math.cos(ang) * rx * k * 1.2, y + Math.sin(ang) * ry * k * 1.2,
          3 * a, a, DRM.star, ang);
      }
    });
  }
}

// ── TrancePendulum ────────────────────────────────────────────────────────

/**
 * The Click pendulum: a cord from the caster's hand to a swinging bob, plus the drowsy
 * field it drags through the air. Persistent because it hangs for as long as it is up and
 * has to keep its own motion trail.
 */
export class TrancePendulum {
  /** The drowsy field, under the fighters — it is painted on the floor, not in the air. */
  private floor: Phaser.GameObjects.Graphics;
  /** Cord, smear and bob, over the fighters, because the bob swings across them. */
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  /** Recent bob positions, for the swing smear. */
  private trail: { x: number; y: number }[] = [];
  private accum = 0;

  constructor(scene: Phaser.Scene, private tint: DreamColorFn, depth = 7) {
    this.floor = scene.add.graphics().setDepth(3);
    this.g = scene.add.graphics().setDepth(depth);
  }

  /**
   * `heat` is the normalised swing speed (0–1) — it widens the field, brightens the bob and
   * lengthens the smear, so how hard you are swinging is legible without reading a number.
   */
  update(
    delta: number,
    ax: number, ay: number, bx: number, by: number,
    radius: number, heat: number, alpha: number,
  ): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    this.accum += delta;
    if (this.accum >= 24) {
      this.accum = 0;
      this.trail.unshift({ x: bx, y: by });
      if (this.trail.length > 9) this.trail.pop();
    }

    const g = this.g;
    const fl = this.floor;
    g.clear();
    fl.clear();
    if (alpha <= 0.02) return;

    // The drowsy field on the floor: two counter-turning rings of stars.
    fl.fillStyle(this.tint(DRM.deep), alpha * (0.07 + heat * 0.1));
    fl.fillCircle(ax, ay, radius);
    fl.lineStyle(2, this.tint(DRM.violet), alpha * (0.25 + heat * 0.45));
    fl.strokeCircle(ax, ay, radius);
    fl.lineStyle(1, this.tint(DRM.purple), alpha * (0.15 + heat * 0.3));
    fl.strokeCircle(ax, ay, radius * 0.72);
    const motes = 10;
    for (let i = 0; i < motes; i++) {
      const a = this.t * (0.5 + heat * 1.4) + (i / motes) * TAU;
      const d = radius * (0.82 + Math.sin(this.t * 1.7 + i) * 0.1);
      star(fl, this.tint, ax + Math.cos(a) * d, ay + Math.sin(a) * d,
        1.8 + heat * 1.6, alpha * (0.4 + heat * 0.5), DRM.star, a * 2);
    }

    // Swing smear.
    for (let i = this.trail.length - 1; i >= 1; i--) {
      const p = this.trail[i];
      const f = 1 - i / this.trail.length;
      g.fillStyle(this.tint(DRM.violet), alpha * heat * f * 0.32);
      g.fillCircle(p.x, p.y, 9 * f + 2);
    }

    // Cord: a slightly slack line with beads threaded on it.
    const midX = (ax + bx) / 2 + Math.sin(this.t * 4) * 2 * (1 - heat);
    const midY = (ay + by) / 2 + 3;
    g.lineStyle(1.8, this.tint(DRM.pale), alpha * 0.85);
    g.beginPath();
    g.moveTo(ax, ay);
    for (let i = 1; i <= 8; i++) {
      const f = i / 8;
      const q = (1 - f) * (1 - f);
      const px = q * ax + 2 * (1 - f) * f * midX + f * f * bx;
      const py = q * ay + 2 * (1 - f) * f * midY + f * f * by;
      g.lineTo(px, py);
    }
    g.strokePath();
    for (let i = 1; i <= 3; i++) {
      const f = i / 4;
      g.fillStyle(this.tint(DRM.blue), alpha * 0.9);
      g.fillCircle(ax + (bx - ax) * f, ay + (by - ay) * f + 3 * Math.sin(f * Math.PI), 1.6);
    }

    pendulumBob(g, this.tint, bx, by, 9.5, this.t, heat, alpha);
  }

  destroy(): void { this.g.destroy(); this.floor.destroy(); }
}

// ── OasisView ─────────────────────────────────────────────────────────────

/**
 * The Q set piece: a full-screen meadow that replaces the arena for as long as the caster is
 * resting in it. Persistent because it runs for fifteen seconds and everything in it — the
 * falls, the grass, the fireflies — has to keep moving the whole time.
 *
 * It is drawn as a *place*, not a filter: sky, ridges, a cliff with a waterfall coming off it,
 * the pool it lands in, the stream it feeds, and a sleeping figure in the grass, layered back
 * to front. Anything less and it reads as a tint over the fight you left.
 *
 * Nothing in here is sharp or fast. The falls are the only thing moving at speed, and they are
 * moving in one direction — the whole point of the place is that it is calm.
 */
export class OasisView {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private stars: { x: number; y: number; r: number; ph: number }[];
  private clouds: { x: number; y: number; w: number; sp: number }[];
  /** Three ridge lines, each a row of humps. Index 0 is furthest away. */
  private ridges: { x: number; w: number; h: number }[][];
  /** Falling water: each strand runs the drop on its own phase and its own speed. */
  private strands: { off: number; sp: number; ph: number; len: number; w: number }[];
  /** Spray at the foot of the falls, rising and fading on a loop. */
  private spray: { ox: number; sp: number; ph: number; r: number }[];
  private tufts: { x: number; y: number; h: number; ph: number }[];
  private flowers: { x: number; y: number; r: number; c: number; ph: number }[];
  private flies: { x: number; y: number; r: number; ph: number; sp: number }[];

  /** Where the sky stops. */
  private readonly horizon: number;
  /** Where the meadow starts — below the horizon, so the ridges sit between the two. */
  private readonly meadowTop: number;
  private readonly cliffX: number;
  private readonly lipY: number;
  private readonly poolY: number;
  private readonly sheetW: number;

  constructor(
    scene: Phaser.Scene,
    private tint: DreamColorFn,
    private w: number,
    private h: number,
    depth = 14,
  ) {
    this.g = scene.add.graphics().setDepth(depth).setScrollFactor(0);

    this.horizon = h * 0.44;
    this.meadowTop = h * 0.49;
    this.cliffX = w * 0.63;
    this.lipY = h * 0.27;
    this.poolY = h * 0.66;
    this.sheetW = w * 0.115;

    this.stars = Array.from({ length: 44 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h * 0.4,
      r: 0.7 + Math.random() * 1.6,
      ph: Math.random() * TAU,
    }));
    this.clouds = Array.from({ length: 4 }, (_, i) => ({
      x: Math.random() * w,
      y: h * (0.07 + i * 0.075),
      w: 140 + Math.random() * 190,
      sp: 3 + Math.random() * 5,
    }));
    this.ridges = [0, 1, 2].map((layer) => Array.from({ length: 6 }, (_, i) => ({
      x: (i / 5) * w + (Math.random() - 0.5) * 100,
      w: 200 + Math.random() * 190,
      h: 40 + Math.random() * 30 + layer * 12,
    })));
    this.strands = Array.from({ length: 22 }, () => ({
      off: Math.random() * 2 - 1,
      sp: 0.72 + Math.random() * 0.6,
      ph: Math.random(),
      len: Math.random(),
      w: 2 + Math.random() * 4,
    }));
    this.spray = Array.from({ length: 14 }, () => ({
      ox: (Math.random() - 0.5) * this.sheetW * 2.4,
      sp: 0.24 + Math.random() * 0.3,
      ph: Math.random(),
      r: 10 + Math.random() * 20,
    }));
    this.tufts = Array.from({ length: 30 }, () => {
      const f = Math.random();
      return { x: Math.random() * w, y: h * (0.78 + f * 0.26), h: 15 + f * 32, ph: Math.random() * TAU };
    });
    this.flowers = Array.from({ length: 14 }, () => {
      const f = Math.random();
      return {
        x: Math.random() * w, y: h * (0.72 + f * 0.28), r: 2.6 + f * 3.2,
        c: Math.random() < 0.5 ? DRM.bloom : DRM.bloomWarm, ph: Math.random() * TAU,
      };
    });
    this.flies = Array.from({ length: 16 }, () => ({
      x: Math.random() * w,
      y: h * (0.5 + Math.random() * 0.44),
      r: 1.4 + Math.random() * 1.6,
      ph: Math.random() * TAU,
      sp: 0.3 + Math.random() * 0.5,
    }));
  }

  /** `grow` 0→1 opens the scene and 1→0 collapses it. `restX/restY` is where the dreamer lies. */
  update(delta: number, grow: number, restX: number, restY: number, healPulse: number): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    const a = Phaser.Math.Clamp(grow, 0, 1);
    if (a <= 0.02) return;

    this.drawSky(a);
    this.drawRidges(a);
    this.drawMeadow(a);
    this.drawCliff(a);
    this.drawPool(a);
    this.drawFalls(a);
    this.drawStream(a);
    this.drawTrees(a);
    this.drawSpray(a);
    this.drawGround(a);
    this.drawFlies(a);
    this.drawSleeper(g, restX, restY, a, healPulse);

    // Vignette, so the edges of the arena the meadow is covering never peek through.
    const { w, h } = this;
    g.fillStyle(this.tint(DRM.night), a * 0.3);
    g.fillRect(0, 0, w, 16);
    g.fillRect(0, h - 16, w, 16);
    g.fillRect(0, 0, 16, h);
    g.fillRect(w - 16, 0, 16, h);
  }

  /** Night above, dawn at the horizon: stars, a low moon and a few slow clouds. */
  private drawSky(a: number): void {
    const g = this.g;
    const { w, horizon } = this;

    // Two-stage gradient — night into violet for most of it, violet into rose at the bottom.
    const bands = 16;
    for (let i = 0; i < bands; i++) {
      const f = i / (bands - 1);
      const near = f > 0.62;
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(near ? DRM.violet : DRM.night),
        Phaser.Display.Color.ValueToColor(near ? DRM.dusk : DRM.violet),
        100, (near ? (f - 0.62) / 0.38 : f / 0.62) * 100,
      );
      g.fillStyle(this.tint(Phaser.Display.Color.GetColor(c.r, c.g, c.b)), a);
      g.fillRect(0, (i / bands) * horizon, w, horizon / bands + 1);
    }

    // Stars fade out as the sky warms toward the horizon.
    for (const s of this.stars) {
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(this.t * 1.4 + s.ph));
      const high = 1 - Phaser.Math.Clamp(s.y / (horizon * 0.9), 0, 1);
      star(g, this.tint, s.x, s.y, s.r * (0.8 + tw * 0.5), a * tw * high * 0.9, DRM.star, s.ph + this.t * 0.3);
    }

    // The moon, opposite the falls so the two set pieces do not fight.
    const mx = this.w * 0.2, my = horizon - this.h * 0.28;
    g.fillStyle(this.tint(DRM.sun), a * 0.1);
    g.fillCircle(mx, my, 88);
    g.fillStyle(this.tint(DRM.sun), a * 0.2);
    g.fillCircle(mx, my, 54);
    g.fillStyle(this.tint(DRM.star), a);
    g.fillCircle(mx, my, 31);
    g.fillStyle(this.tint(DRM.pale), a * 0.5);
    g.fillCircle(mx - 8, my - 7, 7);
    g.fillCircle(mx + 10, my + 5, 5);

    // Clouds: flat, slow, and low-contrast. They pass, they do not billow.
    for (const c of this.clouds) {
      const cx = ((c.x + this.t * c.sp) % (w + c.w)) - c.w * 0.5;
      for (let i = 0; i < 4; i++) {
        const f = i / 3;
        g.fillStyle(this.tint(i < 2 ? DRM.pale : DRM.dusk), a * 0.11);
        g.fillEllipse(cx + (f - 0.5) * c.w * 0.7, c.y + Math.sin(f * 3) * 4, c.w * (0.5 - f * 0.1), 16 - i * 2);
      }
    }
  }

  /** Rolling ridges between the sky and the meadow, hazing out with distance. */
  private drawRidges(a: number): void {
    const g = this.g;
    const colors = [DRM.hillFar, DRM.grassDeep, DRM.grassDark];
    for (let layer = 0; layer < 3; layer++) {
      const base = this.horizon + layer * this.h * 0.022;
      g.fillStyle(this.tint(colors[layer]), a * (0.8 + layer * 0.1));
      for (const hump of this.ridges[layer]) {
        g.fillEllipse(hump.x, base, hump.w, hump.h * 2);
      }
      g.fillRect(0, base, this.w, this.h * 0.05);
    }
  }

  /** The grass field, receding: broad light bands, wider and softer toward the viewer. */
  private drawMeadow(a: number): void {
    const g = this.g;
    const { w, h, meadowTop: top } = this;
    g.fillStyle(this.tint(DRM.grassDark), a);
    g.fillRect(0, top, w, h - top);
    // A lit rim where the field meets the ridges — the far grass catches the dawn.
    g.fillStyle(this.tint(DRM.grass), a * 0.45);
    g.fillRect(0, top - 2, w, 5);
    for (let i = 0; i < 7; i++) {
      const f = i / 7;
      g.fillStyle(this.tint(f > 0.55 ? DRM.grassDeep : DRM.grass), a * 0.16);
      g.fillEllipse(w * (0.12 + 0.76 * ((i * 0.41) % 1)), top + (h - top) * f * f * 1.05, 250 + f * 380, 18 + f * 34);
    }
  }

  /** The rock shelf the water comes off, running away to the right-hand edge. */
  private drawCliff(a: number): void {
    const g = this.g;
    const { w, cliffX, lipY, poolY } = this;
    const x0 = cliffX - w * 0.2;
    const capH = this.h * 0.03;

    // Face. Slanted on the left, straight off the screen on the right.
    g.fillStyle(this.tint(DRM.rockDark), a);
    g.fillPoints([
      new Phaser.Geom.Point(x0 + 22, lipY),
      new Phaser.Geom.Point(w, lipY - this.h * 0.04),
      new Phaser.Geom.Point(w, poolY + 10),
      new Phaser.Geom.Point(x0 - 10, poolY + 6),
    ], true);
    // Facets, so the wall has planes instead of being a slab.
    g.fillStyle(this.tint(DRM.rock), a * 0.5);
    g.fillPoints([
      new Phaser.Geom.Point(x0 + 30, lipY + 6),
      new Phaser.Geom.Point(x0 + 96, lipY + 2),
      new Phaser.Geom.Point(x0 + 70, poolY),
      new Phaser.Geom.Point(x0 + 6, poolY - 4),
    ], true);
    g.fillStyle(this.tint(DRM.rock), a * 0.32);
    g.fillPoints([
      new Phaser.Geom.Point(w - 150, lipY - this.h * 0.02),
      new Phaser.Geom.Point(w - 30, lipY - this.h * 0.035),
      new Phaser.Geom.Point(w - 44, poolY + 4),
      new Phaser.Geom.Point(w - 168, poolY),
    ], true);
    // Damp streaks under the lip, either side of where the water actually falls.
    g.lineStyle(2, this.tint(DRM.waterDeep), a * 0.35);
    for (const dx of [-0.13, -0.09, 0.11, 0.16, 0.21]) {
      const sx = cliffX + w * dx;
      g.lineBetween(sx, lipY + 6, sx + 4, poolY - 8);
    }

    // The grass cap on top of the shelf, with tufts hanging over the edge.
    g.fillStyle(this.tint(DRM.grassDark), a);
    g.fillPoints([
      new Phaser.Geom.Point(x0 + 16, lipY + 2),
      new Phaser.Geom.Point(w, lipY - this.h * 0.04),
      new Phaser.Geom.Point(w, lipY - this.h * 0.04 - capH),
      new Phaser.Geom.Point(x0 + 26, lipY - capH),
    ], true);
    g.fillStyle(this.tint(DRM.grass), a * 0.6);
    g.fillPoints([
      new Phaser.Geom.Point(x0 + 26, lipY - capH),
      new Phaser.Geom.Point(w, lipY - this.h * 0.04 - capH),
      new Phaser.Geom.Point(w, lipY - this.h * 0.04 - capH - 5),
      new Phaser.Geom.Point(x0 + 30, lipY - capH - 5),
    ], true);
    for (let i = 0; i < 7; i++) {
      const f = i / 6;
      const tx = x0 + 34 + (w - x0 - 44) * f;
      // Skip the notch the water comes through.
      if (Math.abs(tx - cliffX) < this.sheetW * 0.7) continue;
      const ty = lipY - capH + (lipY - this.h * 0.04 - lipY) * f;
      grassTuft(g, this.tint, tx, ty + 3, 13, Math.sin(this.t * 1.2 + i) * 0.2, DRM.grassDeep, a * 0.9);
    }
  }

  /** The plunge pool: dark under the falls, lit toward the near bank. */
  private drawPool(a: number): void {
    const g = this.g;
    const { w, h, cliffX: px, poolY: py } = this;
    const prx = w * 0.2, pry = h * 0.055;

    // Damp, dark grass around the rim.
    g.fillStyle(this.tint(DRM.grassDeep), a);
    g.fillEllipse(px, py + 5, prx * 2.2, pry * 2.5);
    g.fillStyle(this.tint(DRM.waterDeep), a);
    g.fillEllipse(px, py, prx * 2, pry * 2);
    g.fillStyle(this.tint(DRM.water), a * 0.8);
    g.fillEllipse(px, py + 3, prx * 1.78, pry * 1.55);

    // Rings pushed out by the falls, over and over.
    for (let i = 0; i < 4; i++) {
      const f = (this.t * 0.3 + i / 4) % 1;
      g.lineStyle(1.5, this.tint(DRM.foam), a * (1 - f) * 0.4);
      g.strokeEllipse(px, py + 4, prx * 2 * f * 0.95, pry * 2 * f * 0.95);
    }
    // Broken glimmer on the surface.
    for (let i = 0; i < 5; i++) {
      const wob = Math.sin(this.t * 1.8 + i) * 8;
      g.fillStyle(this.tint(DRM.star), a * 0.22 * (1 - i / 7));
      g.fillEllipse(px - prx * 0.45 + wob, py + pry * 0.1 + i * pry * 0.24, 50 - i * 6, 3);
    }
  }

  /**
   * The waterfall. A spreading sheet, shimmer bands scrolling down it, individual strands
   * that accelerate as they fall, a bulging crest at the lip, and churn at the foot.
   */
  private drawFalls(a: number): void {
    const g = this.g;
    const { cliffX: cx, lipY, poolY, sheetW } = this;
    const fallH = poolY - lipY;
    const topH = sheetW * 0.5, botH = sheetW * 0.66;

    const sheet = (k: number, color: number, alpha: number) => {
      g.fillStyle(this.tint(color), alpha);
      g.fillPoints([
        new Phaser.Geom.Point(cx - topH * k, lipY),
        new Phaser.Geom.Point(cx + topH * k, lipY),
        new Phaser.Geom.Point(cx + botH * k, poolY),
        new Phaser.Geom.Point(cx - botH * k, poolY),
      ], true);
    };
    sheet(1, DRM.waterDeep, a * 0.92);
    sheet(0.72, DRM.water, a * 0.7);

    // Shimmer bands: the whole sheet is moving, not just the strands on it.
    for (let i = 0; i < 6; i++) {
      const p = (this.t * 0.45 + i / 6) % 1;
      const half = topH + (botH - topH) * p;
      g.fillStyle(this.tint(DRM.pale), a * 0.12 * (1 - p * 0.4));
      g.fillEllipse(cx, lipY + fallH * p, half * 1.9, 6);
    }

    // Strands. `p` is eased so each one speeds up on the way down, the way water does.
    for (const s of this.strands) {
      const p = (this.t * s.sp + s.ph) % 1;
      const drop2 = p * 0.55 + p * p * 0.45;
      const y = lipY + fallH * drop2;
      const half = topH + (botH - topH) * drop2;
      const x = cx + s.off * half * 0.86;
      const len = fallH * (0.1 + s.len * 0.16) * (0.6 + drop2 * 0.6);
      const fade = Math.min(1, (1 - p) * 3) * Math.min(1, p * 8);
      g.fillStyle(this.tint(DRM.pale), a * 0.32 * fade);
      g.fillEllipse(x, y, s.w * 1.8, len);
      g.fillStyle(this.tint(DRM.foam), a * 0.5 * fade);
      g.fillEllipse(x, y, s.w * 0.7, len * 0.66);
    }

    // The crest: water bulges over the edge before it lets go.
    g.fillStyle(this.tint(DRM.water), a);
    g.fillEllipse(cx, lipY, sheetW * 1.14, 15);
    g.fillStyle(this.tint(DRM.foam), a * 0.85);
    g.fillEllipse(cx, lipY - 3, sheetW * 0.98, 8);
    g.lineStyle(2, this.tint(DRM.foam), a * 0.7);
    g.lineBetween(cx - sheetW * 0.56, lipY + 2, cx + sheetW * 0.56, lipY + 2);

    // The foot: churn stacked into a low mound, breathing with the impact.
    const churn = 0.5 + 0.5 * Math.sin(this.t * 3.1);
    for (let i = 0; i < 4; i++) {
      const f = i / 4;
      g.fillStyle(this.tint(DRM.foam), a * (0.48 - f * 0.1) * (0.72 + churn * 0.28));
      g.fillEllipse(
        cx + Math.sin(this.t * 2 + i) * 6, poolY - 6 + i * 3,
        sheetW * (1.1 + f * 0.95), 20 - i * 3,
      );
    }
  }

  /** The outflow, running toward the viewer and widening as it comes. */
  private drawStream(a: number): void {
    const g = this.g;
    const sx = this.cliffX, sy = this.poolY + this.h * 0.03;
    const ex = this.w * 0.8, ey = this.h + 24;
    const N = 9;
    const left: Phaser.Geom.Point[] = [];
    const right: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= N; i++) {
      const f = i / N;
      const cx = sx + (ex - sx) * f * f + Math.sin(f * 3 + this.t * 0.4) * 6;
      const cy = sy + (ey - sy) * f;
      const half = 12 + f * 54;
      left.push(new Phaser.Geom.Point(cx - half, cy));
      right.push(new Phaser.Geom.Point(cx + half, cy));
    }
    const band = (pad: number, color: number, alpha: number) => {
      const pts = [
        ...left.map((p) => new Phaser.Geom.Point(p.x - pad, p.y)),
        ...right.slice().reverse().map((p) => new Phaser.Geom.Point(p.x + pad, p.y)),
      ];
      g.fillStyle(this.tint(color), alpha);
      g.fillPoints(pts, true);
    };
    band(8, DRM.grassDeep, a);
    band(0, DRM.waterDeep, a);
    band(-6, DRM.water, a * 0.75);

    // Current lines travelling downstream — the only thing that says which way it flows.
    for (let i = 0; i < 4; i++) {
      const p = (this.t * 0.32 + i / 4) % 1;
      const idx = Math.min(N - 0.001, p * N);
      const j = Math.floor(idx);
      const fr = idx - j;
      const lx = left[j].x + (left[j + 1].x - left[j].x) * fr;
      const rx = right[j].x + (right[j + 1].x - right[j].x) * fr;
      const y = left[j].y + (left[j + 1].y - left[j].y) * fr;
      g.lineStyle(1.6, this.tint(DRM.foam), a * (1 - p) * 0.45);
      g.lineBetween(lx + (rx - lx) * 0.28, y, lx + (rx - lx) * 0.72, y);
    }
  }

  /** Two trees back in the field and one big one framing the near edge. */
  private drawTrees(a: number): void {
    const { w, h, meadowTop: top } = this;
    meadowTree(this.g, this.tint, w * 0.13, top + h * 0.1, h * 0.3, 0.05, this.t, a * 0.95);
    meadowTree(this.g, this.tint, w * 0.3, top + h * 0.04, h * 0.19, -0.06, this.t * 1.2 + 2, a * 0.85);
    meadowTree(this.g, this.tint, w * 0.95, h * 0.96, h * 0.6, -0.08, this.t * 0.85 + 4, a);
  }

  /** Mist off the plunge pool, drifting up and thinning out. */
  private drawSpray(a: number): void {
    const g = this.g;
    g.fillStyle(this.tint(DRM.pale), a * 0.05);
    g.fillCircle(this.cliffX, this.poolY - 26, this.sheetW * 1.7);
    for (const s of this.spray) {
      const p = (this.t * s.sp + s.ph) % 1;
      const y = this.poolY - p * 86;
      g.fillStyle(this.tint(DRM.mist), a * 0.28 * Math.sin(p * Math.PI));
      g.fillEllipse(
        this.cliffX + s.ox + Math.sin(this.t * 0.8 + s.ph * 9) * 11, y,
        s.r * (1 + p * 1.7), s.r * (0.7 + p),
      );
    }
  }

  /** Foreground grass and wildflowers, darkening as they come toward the viewer. */
  private drawGround(a: number): void {
    for (const tf of this.tufts) {
      const near = Phaser.Math.Clamp((tf.y / this.h - 0.78) / 0.26, 0, 1);
      const color = near > 0.62 ? DRM.grassDeep : near > 0.3 ? DRM.grassDark : DRM.grass;
      grassTuft(this.g, this.tint, tf.x, tf.y, tf.h, Math.sin(this.t * 1.1 + tf.ph) * 0.16, color, a * (0.85 + near * 0.15));
    }
    for (const fl of this.flowers) {
      wildflower(this.g, this.tint, fl.x, fl.y, fl.r, fl.c, Math.sin(this.t * 0.9 + fl.ph) * 0.5, a * 0.95);
    }
  }

  /** Fireflies over the field. Dream's stars, brought down to grass height. */
  private drawFlies(a: number): void {
    for (const f of this.flies) {
      const x = f.x + Math.sin(this.t * f.sp + f.ph) * 28;
      const y = f.y + Math.cos(this.t * f.sp * 0.8 + f.ph * 1.7) * 16;
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(this.t * 1.8 + f.ph));
      star(this.g, this.tint, x, y, f.r * (0.8 + tw * 0.6), a * tw * 0.9, DRM.bloomWarm, f.ph + this.t);
    }
  }

  /** The caster, curled up and healing. Drawn from the same parts as the avatar rig. */
  private drawSleeper(
    g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, healPulse: number,
  ): void {
    const breathe = Math.sin(this.t * 1.6) * 1.6;

    // Flattened grass under the sleeper, rather than a shadow on sand.
    g.fillStyle(this.tint(DRM.grassDeep), a * 0.6);
    g.fillEllipse(x, y + 20, 74, 18);

    // Green healing bloom, beating once a second with the heal tick.
    g.fillStyle(this.tint(DRM.water), a * (0.1 + healPulse * 0.22));
    g.fillCircle(x, y, 46 + healPulse * 16);

    // Body.
    g.fillStyle(this.tint(DRM.deep), a);
    g.fillEllipse(x, y + breathe, 44, 40);
    g.fillStyle(this.tint(DRM.violet), a * 0.75);
    g.fillEllipse(x - 5, y - 5 + breathe, 28, 22);

    // Closed eyes — two downward arcs. A sleeping face is arcs, not lines.
    g.lineStyle(2, this.tint(DRM.pale), a);
    for (const side of [-1, 1]) {
      g.beginPath();
      g.arc(x + side * 8, y - 2 + breathe, 4.5, Math.PI * 0.15, Math.PI * 0.85);
      g.strokePath();
    }

    // Nightcap, flopped to one side with its pompom resting in the grass.
    const capA = -2.2 + Math.sin(this.t * 0.9) * 0.06;
    g.fillStyle(this.tint(DRM.purple), a);
    g.fillTriangle(
      x - 22, y - 14 + breathe,
      x + 22, y - 14 + breathe,
      x + Math.cos(capA) * 46, y - 14 + Math.sin(capA) * 30 + breathe,
    );
    g.fillStyle(this.tint(DRM.pale), a);
    g.fillRect(x - 23, y - 18 + breathe, 46, 7);
    g.fillStyle(this.tint(DRM.star), a);
    g.fillCircle(x + Math.cos(capA) * 46, y - 14 + Math.sin(capA) * 30 + breathe, 6);

    zzz(g, this.tint, x + 26, y - 30, 10, a * 0.95, this.t);

    // A few blades standing in front of the body, so they are lying *in* the grass.
    for (let i = -3; i <= 3; i++) {
      grassTuft(
        g, this.tint, x + i * 13 + Math.sin(i * 2.3) * 4, y + 20 + Math.abs(i) * 1.5,
        13 + Math.abs(i) * 3, Math.sin(this.t * 1.2 + i) * 0.2, DRM.grassDeep, a * 0.95,
      );
    }
  }

  destroy(): void { this.g.destroy(); }
}

// ── DreamPortal ───────────────────────────────────────────────────────────

/**
 * The doorway the oasis is behind: a standing oval of turning night with a bright lip.
 * Persistent, because it stands waiting for as long as it takes the caster to walk into it.
 */
export class DreamPortal {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private motes: { a: number; d: number; sp: number; r: number }[];

  constructor(scene: Phaser.Scene, private tint: DreamColorFn, depth = 4) {
    this.g = scene.add.graphics().setDepth(depth);
    this.motes = Array.from({ length: 16 }, () => ({
      a: Math.random() * TAU,
      d: 0.4 + Math.random() * 0.9,
      sp: 0.5 + Math.random() * 1.3,
      r: 1 + Math.random() * 2.2,
    }));
  }

  /** `open` 0→1 as it irises in; `pull` brightens the lip while someone is standing in it. */
  update(delta: number, x: number, y: number, rx: number, ry: number, open: number, pull: number): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    const a = Phaser.Math.Clamp(open, 0, 1);
    if (a <= 0.02) return;
    const RX = rx * a, RY = ry * a;

    // The hole itself.
    g.fillStyle(this.tint(DRM.night), a * 0.95);
    g.fillEllipse(x, y, RX * 2, RY * 2);
    // Turning nebula inside, drawn as three counter-rotating arcs of colour.
    for (let i = 0; i < 3; i++) {
      const spin = this.t * (0.6 + i * 0.35) * (i % 2 ? -1 : 1);
      const f = 1 - i * 0.26;
      g.fillStyle(this.tint([DRM.violet, DRM.purple, DRM.blue][i]), a * 0.4);
      g.slice(x, y, RX * f, spin, spin + 2.1, false);
      g.fillPath();
    }
    g.fillStyle(this.tint(DRM.deep), a * 0.85);
    g.fillEllipse(x, y, RX * 0.9, RY * 0.9);

    // Motes spiralling inward — the tell that this thing pulls.
    for (const m of this.motes) {
      const phase = (this.t * m.sp) % 1;
      const d = m.d * (1 - phase);
      const ang = m.a + this.t * m.sp * 3;
      star(g, this.tint, x + Math.cos(ang) * RX * d, y + Math.sin(ang) * RY * d,
        m.r * (0.4 + phase * 0.9), a * (1 - phase * 0.4), DRM.white, ang);
    }

    // Lip: a bright rim with a second, wider glow behind it.
    g.lineStyle(6 + pull * 4, this.tint(DRM.violet), a * (0.3 + pull * 0.35));
    g.strokeEllipse(x, y, RX * 2 + 8, RY * 2 + 8);
    g.lineStyle(2.6, this.tint(DRM.pale), a * (0.75 + pull * 0.25));
    g.strokeEllipse(x, y, RX * 2, RY * 2);
    for (let i = 0; i < 5; i++) {
      const ang = this.t * 1.4 + (i / 5) * TAU;
      star(g, this.tint, x + Math.cos(ang) * RX, y + Math.sin(ang) * RY, 3 + pull * 2, a, DRM.star, ang);
    }
  }

  destroy(): void { this.g.destroy(); }
}

// ── DreamAvatar ───────────────────────────────────────────────────────────

const DREAM_AVATAR: AvatarSpec = {
  hands: [
    { r: 10, color: DRM.violet, alpha: 0.26 },
    { r: 6.8, color: DRM.blue, alpha: 0.9 },
    { r: 3.6, color: DRM.pale, alpha: 1 },
    { r: 1.5, color: DRM.white, alpha: 0.95, ox: -1, oy: -1 },
  ],
  eyeWhite: DRM.pale,
  eyePupil: 0x1b1145,
  squash: { div: 16, x: 0.42, y: 0.22 },
};

/**
 * The Dream character: a sleepwalker in a nightcap, trailing stardust, with a piece of night
 * sky where its body should be.
 *
 * The two states it has to show are "swinging the pendulum" and "asleep on its feet" — one
 * is motion (the cap and cap-star lag harder the faster you swing) and one is colour and
 * silhouette (the whole rig dims and the cap droops), so the two never look alike.
 */
export class DreamAvatar extends BaseAvatar {
  private drowsy = 0;
  private drowsyTarget = 0;
  private swing = 0;
  private swingTarget = 0;
  /** The nightcap's tip lags the body on its own spring, so walking makes it flop. */
  private capAng = -Math.PI / 2;
  private capVel = 0;

  constructor(scene: Phaser.Scene, tint: DreamColorFn, depth = 6) {
    super(scene, tint, depth, DREAM_AVATAR);
  }

  /** 0–1 — how close this character is to falling asleep itself. */
  setDrowsy(v: number): void { this.drowsyTarget = Phaser.Math.Clamp(v, 0, 1); }
  /** 0–1 normalised pendulum swing speed. */
  setSwing(v: number): void { this.swingTarget = Phaser.Math.Clamp(v, 0, 1); }

  update(delta: number, x: number, y: number, alpha: number): void {
    const k = Math.min(1, delta / 170);
    this.drowsy += (this.drowsyTarget - this.drowsy) * k;
    this.swing += (this.swingTarget - this.swing) * k;

    // Cap spring: pulled toward straight-up, kicked sideways by the swing.
    const rest = -Math.PI / 2 + Math.sin(this.t * 2.2) * 0.12 + this.swing * Math.sin(this.t * 7) * 0.5;
    this.capVel += (rest - this.capAng) * 0.24 - this.capVel * 0.16;
    this.capAng += this.capVel * Math.min(2, delta / 16.67);

    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 13.5 : 10);
      glow.setFillStyle(this.tint(on ? DRM.purple : DRM.violet), on ? 0.36 : 0.26);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new DreamFx(this.scene, this.tint).stardust(x, y, 1, 5, 620, 5);
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    // A patch of sky underfoot, wider and deeper the drowsier the character.
    g.fillStyle(this.tint(DRM.deep), a * (0.24 + this.drowsy * 0.2));
    g.fillCircle(x, y, 28 + this.drowsy * 8);
    g.fillStyle(this.tint(DRM.violet), a * (0.16 + this.swing * 0.2));
    g.fillCircle(x, y, 20 + this.swing * 12);
    // Stars turning in the glow — the ambient cosmic tell.
    for (let i = 0; i < 5; i++) {
      const ang = this.t * (0.5 + this.swing) + (i / 5) * TAU;
      const d = 22 + Math.sin(this.t * 1.6 + i) * 4;
      star(g, this.tint, x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.6,
        1.6, alpha * 0.55, DRM.star, ang * 2);
    }
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const bob = Math.sin(this.t * 2.4) * 1.2;
    const droop = this.drowsy * 0.5;
    const crownY = y - 18 + bob;

    // ── Nightcap ──
    // Brim first, then the cone swept along the spring angle, then the pompom.
    const capA = this.capAng + droop;
    const tipX = x + Math.cos(capA) * 30;
    const tipY = crownY + Math.sin(capA) * 26;
    g.fillStyle(this.tint(DRM.deep), alpha * 0.95);
    g.fillTriangle(x - 12, crownY, x + 12, crownY, tipX, tipY);
    g.fillStyle(this.tint(DRM.purple), alpha * 0.9);
    g.fillTriangle(x - 8, crownY - 1, x + 6, crownY - 1, tipX, tipY);
    // Stars sewn into the cap.
    for (let i = 1; i <= 2; i++) {
      const f = i / 3;
      star(g, this.tint, x + (tipX - x) * f, crownY + (tipY - crownY) * f, 2.2, alpha * 0.9, DRM.star, this.t + i);
    }
    g.fillStyle(this.tint(DRM.pale), alpha);
    g.fillRoundedRect(x - 13, crownY - 4, 26, 6, 3);
    g.fillStyle(this.tint(DRM.woolShade), alpha * 0.6);
    g.fillRect(x - 13, crownY, 26, 2);
    g.fillStyle(this.tint(DRM.star), alpha);
    g.fillCircle(tipX, tipY, 4);
    g.fillStyle(this.tint(DRM.white), alpha * 0.7);
    g.fillCircle(tipX - 1.2, tipY - 1.2, 1.6);

    // ── Drowsy tell ──
    // Heavy lids drawn straight over the eyes, plus Zs once the character is far gone.
    if (this.drowsy > 0.15) {
      g.fillStyle(this.tint(DRM.deep), alpha * this.drowsy * 0.85);
      for (const side of [-1, 1]) {
        g.fillEllipse(x + side * 7.2, y - 5.6 + bob * 0.4, 10, 5 * this.drowsy);
      }
    }
    if (this.drowsy > 0.55) {
      zzz(g, this.tint, x + 14, y - 26, 5.5, alpha * (this.drowsy - 0.55) * 2.2, this.t);
    }

    // ── Mastery: a ring of moons turning overhead ──
    if (this.mastered) {
      for (let i = 0; i < 4; i++) {
        const p = this.t * 0.9 + (i / 4) * TAU;
        const cx = x + Math.cos(p) * 22;
        const cy = y - 32 + Math.sin(p) * 6;
        g.fillStyle(this.tint(DRM.star), alpha * 0.85);
        g.fillCircle(cx, cy, 3.4);
        g.fillStyle(this.tint(DRM.night), alpha * 0.85);
        g.fillCircle(cx + 1.5, cy - 0.5, 2.9);
      }
    }
  }
}
