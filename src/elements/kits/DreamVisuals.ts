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
  /** Oasis. */
  sand: 0xe8cf9a,
  sandDark: 0xbe9d63,
  water: 0x3fc7d6,
  waterDeep: 0x136a78,
  palm: 0x2e8b57,
  palmDark: 0x1a5535,
  sun: 0xffd98a,
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

/** A palm tree for the oasis: leaning trunk with ring scars and a fan of fronds. */
export function palmTree(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, h: number, lean: number, sway: number,
  alpha = 1,
): void {
  const topX = x + lean * h;
  const topY = y - h;

  g.lineStyle(h * 0.1, tint(DRM.palmDark), alpha);
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + lean * h * 0.35, y - h * 0.55);
  g.lineTo(topX, topY);
  g.strokePath();
  // Ring scars up the trunk.
  g.lineStyle(1.2, tint(DRM.sandDark), alpha * 0.7);
  for (let i = 1; i < 7; i++) {
    const f = i / 7;
    const tx = x + lean * h * f * (0.35 + f * 0.65);
    const ty = y - h * f;
    g.lineBetween(tx - h * 0.05, ty, tx + h * 0.05, ty);
  }

  // Fronds: each a tapered spine with barbs, drooping further the longer it is.
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI + (i / 6) * Math.PI + Math.sin(sway + i) * 0.06;
    const len = h * (0.42 + (i % 2) * 0.12);
    const droop = 0.5;
    let px = topX, py = topY;
    g.lineStyle(2.2, tint(i % 2 ? DRM.palm : DRM.palmDark), alpha);
    g.beginPath();
    g.moveTo(px, py);
    for (let s = 1; s <= 5; s++) {
      const f = s / 5;
      px = topX + Math.cos(a) * len * f;
      py = topY + Math.sin(a) * len * f + droop * len * f * f;
      g.lineTo(px, py);
    }
    g.strokePath();
    g.lineStyle(1.1, tint(DRM.palm), alpha * 0.8);
    for (let s = 1; s <= 4; s++) {
      const f = s / 5;
      const bx = topX + Math.cos(a) * len * f;
      const by = topY + Math.sin(a) * len * f + droop * len * f * f;
      const bl = len * 0.16 * (1 - f * 0.4);
      g.lineBetween(bx, by, bx - Math.sin(a) * bl, by + Math.cos(a) * bl);
      g.lineBetween(bx, by, bx + Math.sin(a) * bl, by - Math.cos(a) * bl);
    }
  }
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
 * The Q set piece: a full-screen oasis that replaces the arena for as long as the caster is
 * resting in it. Persistent because it runs for fifteen seconds and everything in it — the
 * water, the fronds, the sky — has to keep moving the whole time.
 *
 * It is drawn as a *place*, not a filter: horizon, dunes, pool, trees and a sleeping figure,
 * layered back to front. Anything less and it reads as a tint over the fight you left.
 */
export class OasisView {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private stars: { x: number; y: number; r: number; ph: number }[];
  private dunes: { x: number; y: number; w: number; h: number }[];

  constructor(
    scene: Phaser.Scene,
    private tint: DreamColorFn,
    private w: number,
    private h: number,
    depth = 14,
  ) {
    this.g = scene.add.graphics().setDepth(depth).setScrollFactor(0);
    this.stars = Array.from({ length: 60 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h * 0.55,
      r: 0.7 + Math.random() * 1.8,
      ph: Math.random() * TAU,
    }));
    this.dunes = Array.from({ length: 5 }, (_, i) => ({
      x: (i / 4) * w + (Math.random() - 0.5) * 80,
      y: h * 0.56 + Math.random() * 14,
      w: 150 + Math.random() * 190,
      h: 40 + Math.random() * 46,
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

    const { w, h } = this;
    const horizon = h * 0.58;

    // ── Sky: banded gradient from deep night down to a warm dawn at the horizon ──
    const bands = 14;
    for (let i = 0; i < bands; i++) {
      const f = i / (bands - 1);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(DRM.night),
        Phaser.Display.Color.ValueToColor(DRM.violet),
        100, f * 100,
      );
      g.fillStyle(this.tint(Phaser.Display.Color.GetColor(c.r, c.g, c.b)), a);
      g.fillRect(0, (i / bands) * horizon, w, horizon / bands + 1);
    }

    for (const s of this.stars) {
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(this.t * 1.4 + s.ph));
      star(g, this.tint, s.x, s.y, s.r * (0.8 + tw * 0.5), a * tw * 0.95, DRM.star, s.ph + this.t * 0.3);
    }

    // Moon low over the horizon, with a haze around it.
    const mx = w * 0.76, my = horizon - h * 0.3;
    g.fillStyle(this.tint(DRM.sun), a * 0.12);
    g.fillCircle(mx, my, 92);
    g.fillStyle(this.tint(DRM.sun), a * 0.22);
    g.fillCircle(mx, my, 58);
    g.fillStyle(this.tint(DRM.star), a);
    g.fillCircle(mx, my, 34);
    g.fillStyle(this.tint(DRM.pale), a * 0.55);
    g.fillCircle(mx - 9, my - 7, 8);
    g.fillCircle(mx + 11, my + 5, 5.5);

    // ── Dunes behind the pool ──
    for (const d of this.dunes) {
      g.fillStyle(this.tint(DRM.sandDark), a * 0.9);
      g.fillEllipse(d.x, d.y, d.w, d.h * 2);
    }

    // ── Sand floor ──
    g.fillStyle(this.tint(DRM.sand), a);
    g.fillRect(0, horizon, w, h - horizon);
    g.fillStyle(this.tint(DRM.sandDark), a * 0.5);
    for (let i = 0; i < 9; i++) {
      // Wind ripples, spaced wider toward the viewer.
      const f = i / 9;
      const y = horizon + (h - horizon) * f * f;
      g.fillEllipse(w * (0.15 + 0.7 * ((i * 0.37) % 1)), y, 130 + f * 190, 5 + f * 5);
    }

    // ── Pool ──
    const px = w * 0.5, py = horizon + (h - horizon) * 0.52;
    const prx = w * 0.3, pry = (h - horizon) * 0.34;
    g.fillStyle(this.tint(DRM.waterDeep), a);
    g.fillEllipse(px, py + 4, prx * 2, pry * 2);
    g.fillStyle(this.tint(DRM.water), a * 0.92);
    g.fillEllipse(px, py, prx * 2 * 0.94, pry * 2 * 0.9);
    // Ripple rings — one every couple of seconds, expanding and fading.
    for (let i = 0; i < 3; i++) {
      const f = ((this.t * 0.35 + i / 3) % 1);
      g.lineStyle(1.6, this.tint(DRM.pale), a * (1 - f) * 0.5);
      g.strokeEllipse(px, py, prx * 2 * f * 0.9, pry * 2 * f * 0.9);
    }
    // Moon reflection, broken into slats by the surface.
    for (let i = 0; i < 6; i++) {
      const ry = py - pry * 0.55 + i * (pry * 0.24);
      const wob = Math.sin(this.t * 2.2 + i) * 7;
      g.fillStyle(this.tint(DRM.star), a * 0.3 * (1 - i / 8));
      g.fillEllipse(mx * 0.5 + w * 0.25 + wob, ry, 44 - i * 4, 3);
    }

    // ── Palms, framing the pool ──
    palmTree(g, this.tint, w * 0.2, horizon + 26, 150, 0.12, this.t * 1.1, a);
    palmTree(g, this.tint, w * 0.83, horizon + 34, 122, -0.16, this.t * 1.3 + 2, a);
    palmTree(g, this.tint, w * 0.68, horizon + 10, 92, 0.08, this.t * 0.9 + 4, a * 0.9);

    // ── The dreamer, asleep against the near palm ──
    this.drawSleeper(g, restX, restY, a, healPulse);

    // Vignette, so the edges of the arena the oasis is covering never peek through.
    g.fillStyle(this.tint(DRM.night), a * 0.34);
    g.fillRect(0, 0, w, 16);
    g.fillRect(0, h - 16, w, 16);
    g.fillRect(0, 0, 16, h);
    g.fillRect(w - 16, 0, 16, h);
  }

  /** The caster, curled up and healing. Drawn from the same parts as the avatar rig. */
  private drawSleeper(
    g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, healPulse: number,
  ): void {
    const breathe = Math.sin(this.t * 1.6) * 1.6;

    g.fillStyle(this.tint(DRM.night), a * 0.32);
    g.fillEllipse(x, y + 20, 62, 14);

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

    // Nightcap, flopped to one side with its pompom resting on the sand.
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
