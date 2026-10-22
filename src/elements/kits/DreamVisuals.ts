import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeOut } from './ElementVisuals';
import { BackroomsView } from './skins/AnomalyFx';

/**
 * Everything Dream draws: the sleepwalker rig and its two little Sandmen guns, the overhead
 * sleep meter, the one-shot effects behind each ability, the nightmare that walks, the
 * darkness a nightmare drops over its victim, and the five dream worlds Delve opens.
 *
 * Dream is cosmic — deep violet and starlight — with three deliberate intrusions of
 * something warmer: the cream wool of the sheep counting a victim's drowsiness, the gold of
 * the Sandmen's sand, and the red of anything that belongs to a nightmare. Every draw call
 * routes its colour through the owner's mapper, so a skin only has to remap these keys.
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
  /** The gold a mastered dreamer wears. */
  wish: 0xffd98a,
  wishDeep: 0x8a6a1f,
  /** Sandmen — the sand the little guns fire, and the brass they are made of. */
  sand: 0xf0d48a,
  sandDeep: 0xa8833f,
  brass: 0xd7b25a,
  gunMetal: 0x2c2547,
  gunEdge: 0x7d6fd0,
  /** The dream pistols: the same guns, dreamt bigger. */
  pistol: 0x7b4dff,
  pistolDeep: 0x2d1673,
  /** Sleep Tight's dagger. */
  blade: 0xe6eeff,
  bladeDeep: 0x8090c8,
  /** The claw and the leech — both of them things from under the bed. */
  claw: 0xff3d7a,
  clawDeep: 0x7a0f3a,
  leech: 0x43204f,
  leechBelly: 0xb04a86,
  leechTooth: 0xfff0f6,
  /** The purple mist that frames every dream. */
  dreamMist: 0xb48cff,
  dreamMistDeep: 0x4a2a9a,
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
  // Pinprick stars in the unfilled night, and a pale inner hairline.
  for (let i = 0; i < 4; i++) {
    const sx = x + 6 + i * 15;
    if (sx < x + W * ratio) continue;
    g.fillStyle(tint(DRM.star), alpha * (0.35 + 0.3 * Math.sin(t * 3 + i * 2)));
    g.fillCircle(sx, cy + 2 + (i % 2) * 4, 0.7);
  }
  g.lineStyle(1, tint(DRM.pale), alpha * 0.25);
  g.strokeRoundedRect(x - 0.5, cy - 0.5, W + 1, H + 1, 2);
  // The moon at the left end waxes as the sleepiness fills.
  g.fillStyle(tint(DRM.night), alpha * 0.85);
  g.fillCircle(x - 8, cy + H / 2, 7.5);
  g.lineStyle(1, tint(asleep ? DRM.purple : DRM.violet), alpha * 0.85);
  g.strokeCircle(x - 8, cy + H / 2, 7.5);
  crescentMoon(g, tint, x - 8, cy + H / 2, 5, asleep ? 1 : ratio, asleep ? DRM.star : DRM.sky, alpha);

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

/**
 * A crescent moon whose lit sliver waxes with `fill` (0–1): an unlit disc, the lit disc, and
 * a night-coloured bite that slides off it as it fills. At 1 it is a full, glowing moon.
 */
export function crescentMoon(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  cx: number, cy: number, r: number,
  fill: number,
  color = DRM.star,
  alpha = 1,
  bite = DRM.night,
): void {
  const f = Phaser.Math.Clamp(fill, 0, 1);
  g.fillStyle(tint(color), alpha * (0.12 + f * 0.25));
  g.fillCircle(cx, cy, r * 1.55);
  g.fillStyle(tint(DRM.deep), alpha);
  g.fillCircle(cx, cy, r);
  g.fillStyle(tint(color), alpha);
  g.fillCircle(cx, cy, r);
  // The shadow bite: starts covering most of the disc, slides away as the moon fills.
  if (f < 0.999) {
    const off = r * (0.35 + f * 1.55);
    g.fillStyle(tint(bite), alpha);
    g.fillCircle(cx + off, cy - off * 0.25, r * 0.92);
  }
  // Two craters on the lit side.
  g.fillStyle(tint(DRM.wishDeep), alpha * 0.25);
  g.fillCircle(cx - r * 0.38, cy + r * 0.2, r * 0.2);
  g.fillCircle(cx - r * 0.1, cy - r * 0.45, r * 0.13);
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

// ── Weapons ───────────────────────────────────────────────────────────────

/**
 * One of the Sandmen: a stubby brass-and-night pocket revolver with an hourglass for a
 * cylinder. `kick` (0–1) throws the muzzle up and the grip back, so a barrage visibly bucks.
 * Drawn from the grip, pointing along `angle`.
 */
export function sandmenGun(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, angle: number,
  alpha = 1, kick = 0, flip = 1,
): void {
  const a = angle - kick * 0.55 * flip;
  const back = kick * 5;
  const cx = x - Math.cos(a) * back, cy = y - Math.sin(a) * back;
  const ca = Math.cos(a), sa = Math.sin(a);
  const px = -sa, py = ca;
  const at = (f: number, s: number): [number, number] => [cx + ca * f + px * s, cy + sa * f + py * s];
  // Grip, hanging below the barrel line.
  const [g1x, g1y] = at(-2, 2 * flip);
  const [g2x, g2y] = at(-6, 9 * flip);
  g.lineStyle(5, tint(DRM.gunMetal), alpha);
  g.lineBetween(g1x, g1y, g2x, g2y);
  g.lineStyle(2, tint(DRM.brass), alpha * 0.8);
  g.lineBetween(g1x, g1y, g2x, g2y);
  // Barrel.
  const [b0x, b0y] = at(0, 0);
  const [b1x, b1y] = at(15, 0);
  g.lineStyle(5, tint(DRM.gunMetal), alpha);
  g.lineBetween(b0x, b0y, b1x, b1y);
  g.lineStyle(1.4, tint(DRM.gunEdge), alpha);
  g.lineBetween(b0x, b0y - 1, b1x, b1y - 1);
  // Muzzle ring.
  g.fillStyle(tint(DRM.brass), alpha);
  g.fillCircle(b1x, b1y, 2.6);
  g.fillStyle(tint(DRM.night), alpha);
  g.fillCircle(b1x, b1y, 1.2);
  // Hourglass cylinder: two brass triangles with a trickle of sand between them.
  const [hx, hy] = at(4, 0);
  g.fillStyle(tint(DRM.brass), alpha);
  g.fillTriangle(hx - 3.5, hy - 4.5, hx + 3.5, hy - 4.5, hx, hy);
  g.fillTriangle(hx - 3.5, hy + 4.5, hx + 3.5, hy + 4.5, hx, hy);
  g.fillStyle(tint(DRM.sand), alpha);
  g.fillTriangle(hx - 2, hy + 3.6, hx + 2, hy + 3.6, hx, hy + 1);
}

/**
 * A dream pistol: the same idea dreamt twice the size — a long violet barrel chased with
 * stars, a crescent-moon hammer, and a glowing chamber. Same `kick` convention.
 */
export function dreamPistol(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, angle: number,
  alpha = 1, kick = 0, flip = 1, t = 0,
): void {
  const a = angle - kick * 1.05 * flip;
  const back = kick * 9;
  const cx = x - Math.cos(a) * back, cy = y - Math.sin(a) * back;
  const ca = Math.cos(a), sa = Math.sin(a);
  const px = -sa, py = ca;
  const at = (f: number, s: number): [number, number] => [cx + ca * f + px * s, cy + sa * f + py * s];
  const [g1x, g1y] = at(-3, 3 * flip);
  const [g2x, g2y] = at(-9, 13 * flip);
  g.lineStyle(7, tint(DRM.pistolDeep), alpha);
  g.lineBetween(g1x, g1y, g2x, g2y);
  g.lineStyle(2.5, tint(DRM.pistol), alpha);
  g.lineBetween(g1x, g1y, g2x, g2y);
  // Barrel, long and heavy.
  const [b0x, b0y] = at(-2, 0);
  const [b1x, b1y] = at(26, 0);
  g.lineStyle(8, tint(DRM.pistolDeep), alpha);
  g.lineBetween(b0x, b0y, b1x, b1y);
  g.lineStyle(4, tint(DRM.pistol), alpha);
  g.lineBetween(b0x, b0y, b1x, b1y);
  g.lineStyle(1.2, tint(DRM.pale), alpha * 0.7);
  g.lineBetween(b0x, b0y - 2, b1x, b1y - 2);
  for (let i = 0; i < 3; i++) {
    const [sx, sy] = at(6 + i * 7, 0);
    star(g, tint, sx, sy, 2.2, alpha * (0.6 + 0.4 * Math.sin(t * 5 + i)), DRM.star, t + i);
  }
  // Flared muzzle.
  g.fillStyle(tint(DRM.pistolDeep), alpha);
  g.fillCircle(b1x, b1y, 5);
  g.fillStyle(tint(DRM.star), alpha * 0.9);
  g.fillCircle(b1x, b1y, 2.4);
  // Crescent hammer.
  const [hx, hy] = at(-3, -6 * flip);
  g.fillStyle(tint(DRM.star), alpha);
  g.fillCircle(hx, hy, 4);
  g.fillStyle(tint(DRM.pistolDeep), alpha);
  g.fillCircle(hx + 1.6, hy - 1.2 * flip, 3.4);
  // The chamber glows.
  const [cx2, cy2] = at(3, 0);
  g.fillStyle(tint(DRM.purple), alpha * 0.4);
  g.fillCircle(cx2, cy2, 7);
  g.fillStyle(tint(DRM.pale), alpha);
  g.fillCircle(cx2, cy2, 2.6);
}

/** Sleep Tight: a slim silver dagger with a crescent guard, pointing along `angle`. */
export function sleepDagger(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, angle: number,
  alpha = 1, len = 22,
): void {
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const px = -sa, py = ca;
  const tipX = x + ca * len * 0.6, tipY = y + sa * len * 0.6;
  const baseX = x - ca * len * 0.1, baseY = y - sa * len * 0.1;
  g.fillStyle(tint(DRM.blade), alpha);
  g.fillTriangle(baseX + px * 3, baseY + py * 3, baseX - px * 3, baseY - py * 3, tipX, tipY);
  g.lineStyle(1, tint(DRM.bladeDeep), alpha);
  g.lineBetween(baseX, baseY, tipX, tipY);
  // Crescent guard.
  g.lineStyle(2.4, tint(DRM.star), alpha);
  g.beginPath();
  g.arc(baseX, baseY, 5, angle + Math.PI / 2 - 1.2, angle + Math.PI / 2 + 1.2 + Math.PI, false);
  g.strokePath();
  // Grip and pommel.
  const gx = x - ca * len * 0.4, gy = y - sa * len * 0.4;
  g.lineStyle(3, tint(DRM.deep), alpha);
  g.lineBetween(baseX, baseY, gx, gy);
  g.fillStyle(tint(DRM.purple), alpha);
  g.fillCircle(gx, gy, 2.4);
}

/**
 * The living leech: a fat segmented slug with a ring of teeth at its front. `t` drives the
 * peristaltic wriggle; `stuck` burrows the head and swells the body, so a leech that is
 * feeding looks fed.
 */
export function dreamLeech(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, angle: number, t: number,
  alpha = 1, stuck = false, fat = 0,
): void {
  const segs = 6;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const px = -sa, py = ca;
  const swell = 1 + fat * 0.5;
  for (let i = segs - 1; i >= 0; i--) {
    const f = i / (segs - 1);
    const back = f * 22;
    const wig = Math.sin(t * (stuck ? 7 : 14) - f * 4) * (stuck ? 2 : 3.6) * f;
    const sx = x - ca * back + px * wig;
    const sy = y - sa * back + py * wig;
    const r = (4.6 + Math.sin(f * Math.PI) * 2.6) * swell * (1 + 0.08 * Math.sin(t * 9 - i));
    g.fillStyle(tint(DRM.leech), alpha);
    g.fillCircle(sx, sy, r);
    g.fillStyle(tint(DRM.leechBelly), alpha * 0.75);
    g.fillCircle(sx + px * r * 0.25, sy + py * r * 0.25, r * 0.55);
    g.lineStyle(0.8, tint(DRM.night), alpha * 0.6);
    g.strokeCircle(sx, sy, r);
  }
  // Mouth: a red ring of teeth at the head end.
  const hx = x + ca * 4, hy = y + sa * 4;
  g.fillStyle(tint(DRM.clawDeep), alpha);
  g.fillCircle(hx, hy, stuck ? 3 : 4.2);
  g.fillStyle(tint(DRM.leechTooth), alpha);
  for (let i = 0; i < 6; i++) {
    const ta = (i / 6) * TAU + t * 2;
    g.fillCircle(hx + Math.cos(ta) * 3.6, hy + Math.sin(ta) * 3.6, 0.9);
  }
  // One baleful eye.
  g.fillStyle(tint(DRM.claw), alpha);
  g.fillCircle(x - ca * 6 + px * 3, y - sa * 6 + py * 3, 1.5);
}

/**
 * The nightmare that walks: a hunched knot of shadow on spidery legs, all mouth and red
 * eyes, with smoke curling off its back. `step` (0–1) is how far through its current lurch
 * it is — the legs are only ever planted or snatching, never walking smoothly.
 */
export function nightmareBeast(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, facing: number, t: number,
  alpha = 1, step = 0,
): void {
  const jit = (Math.sin(t * 61) + Math.sin(t * 37)) * 0.9;
  const cx = x + jit, cy = y + Math.abs(Math.sin(step * Math.PI)) * -5;
  // Ground shadow.
  g.fillStyle(tint(DRM.night), alpha * 0.4);
  g.fillEllipse(x, y + 16, 40, 10);
  // Legs: six, jointed, snatching on the step.
  g.lineStyle(2.2, tint(DRM.night), alpha);
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1;
    const k = (i % 3) - 1;
    const base = facing + side * (Math.PI / 2) + k * 0.5;
    const reach = 18 + Math.sin(step * Math.PI + i) * 5;
    const kx = cx + Math.cos(base) * 10, ky = cy + Math.sin(base) * 6 - 8;
    const fx = cx + Math.cos(base) * reach, fy = cy + Math.sin(base) * reach * 0.6 + 12;
    g.lineBetween(cx, cy, kx, ky);
    g.lineBetween(kx, ky, fx, fy);
  }
  // Body: layered darkness with a ragged edge.
  g.fillStyle(tint(DRM.dreadDeep), alpha * 0.85);
  g.fillCircle(cx, cy, 15);
  g.fillStyle(tint(DRM.night), alpha);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + t * 1.3;
    const r = 11 + Math.sin(t * 9 + i * 2.1) * 2.5;
    g.fillCircle(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.5, r * 0.62);
  }
  // Smoke off the back.
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.9 + i / 4) % 1;
    g.fillStyle(tint(DRM.deep), alpha * 0.45 * (1 - p));
    g.fillCircle(cx - Math.cos(facing) * 8 + Math.sin(i * 3.1) * 6, cy - 10 - p * 22, 5 + p * 6);
  }
  // Eyes: a cluster of red pinpricks, looking where it is going.
  const ex = cx + Math.cos(facing) * 6, ey = cy + Math.sin(facing) * 3 - 3;
  g.fillStyle(tint(DRM.dread), alpha);
  const eyes: [number, number, number][] = [[-4, -1, 2.2], [3, -2, 2.6], [0, 2, 1.6], [6, 1.5, 1.4], [-6, 2.5, 1.2]];
  for (const [ox, oy, r] of eyes) g.fillCircle(ex + ox, ey + oy, r);
  g.fillStyle(tint(DRM.white), alpha * 0.9);
  g.fillCircle(ex + 3.5, ey - 2.5, 0.8);
  // A grin of teeth.
  g.lineStyle(1.2, tint(DRM.leechTooth), alpha * 0.9);
  for (let i = 0; i < 5; i++) {
    const tx = ex - 5 + i * 2.5;
    g.lineBetween(tx, ey + 5, tx + 1.2, ey + 7.5);
  }
}

/**
 * Nightmare's darkness: everything outside `radius` around the victim goes black, with a
 * soft rim so the edge of the light breathes. Drawn as fat strokes rather than a masked
 * rectangle — a ring wide enough to cover the screen is the cheapest hole there is.
 */
export function nightmareDarkness(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  cx: number, cy: number, radius: number,
  span: number, t: number, alpha = 1,
): void {
  const wobble = Math.sin(t * 5.3) * 4 + Math.sin(t * 13) * 1.5;
  const r = radius + wobble;
  const W = span * 2.4;
  g.lineStyle(W, tint(DRM.night), alpha * 0.94);
  g.strokeCircle(cx, cy, r + W / 2);
  for (let i = 0; i < 4; i++) {
    const w = 12;
    g.lineStyle(w, tint(DRM.night), alpha * (0.16 + i * 0.17));
    g.strokeCircle(cx, cy, r - (3 - i) * w + w / 2);
  }
  // Red veins creeping in from the dark.
  g.lineStyle(1.4, tint(DRM.dread), alpha * 0.45);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + t * 0.4;
    const r0 = r + 30, r1 = r + 6 + Math.sin(t * 3 + i) * 6;
    g.lineBetween(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0,
      cx + Math.cos(a + 0.08) * r1, cy + Math.sin(a + 0.08) * r1);
  }
}

// ── Shop upgrades and mastery ─────────────────────────────────────────────

/**
 * Amnesia (Click+): one of the Sandmen's magazines thrown end over end — a brass hourglass
 * cartridge with a window of gold sand that shows how much was left in it. `dream` paints the
 * dream pistols' violet cylinder instead.
 */
export function ammoClip(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, angle: number,
  fill: number, alpha = 1, dream = false,
): void {
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const px = -sa, py = ca;
  const L = dream ? 9 : 8, W = dream ? 6 : 4.5;
  const pt = (u: number, v: number) => ({ x: x + ca * u + px * v, y: y + sa * u + py * v });
  const quad = (u0: number, u1: number, w0: number, w1: number) => [pt(u0, -w0), pt(u1, -w1), pt(u1, w1), pt(u0, w0)];
  g.fillStyle(tint(DRM.night), alpha * 0.5);
  g.fillPoints(quad(-L - 1.5, L + 1.5, W + 1.5, W + 1.5) as Phaser.Types.Math.Vector2Like[], true);
  g.fillStyle(tint(dream ? DRM.pistolDeep : DRM.gunMetal), alpha);
  g.fillPoints(quad(-L, L, W, W) as Phaser.Types.Math.Vector2Like[], true);
  // The hourglass window, filled from the base to however full the clip was.
  const k = Phaser.Math.Clamp(fill, 0, 1);
  g.fillStyle(tint(DRM.night), alpha);
  g.fillPoints(quad(-L + 2, L - 2, W - 1.5, W - 1.5) as Phaser.Types.Math.Vector2Like[], true);
  g.fillStyle(tint(dream ? DRM.purple : DRM.sand), alpha);
  const u1 = -L + 2 + (2 * L - 4) * k;
  g.fillPoints(quad(-L + 2, u1, W - 1.5, W - 1.5) as Phaser.Types.Math.Vector2Like[], true);
  // Brass caps.
  g.fillStyle(tint(dream ? DRM.pale : DRM.brass), alpha);
  g.fillPoints(quad(L - 1, L + 2.5, W + 1, W + 1) as Phaser.Types.Math.Vector2Like[], true);
  g.fillPoints(quad(-L - 2.5, -L + 1, W + 1, W + 1) as Phaser.Types.Math.Vector2Like[], true);
  if (dream) star(g, tint, x, y, 3.4, alpha, DRM.star, angle);
}

/** A pillow feather stuck in somebody (R+): a quill driven in at `angle`, the vane fluttering. */
export function stuckFeather(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, angle: number, t: number, alpha = 1,
): void {
  const flut = Math.sin(t * 7 + angle * 3) * 0.18;
  const a = angle + flut;
  const ca = Math.cos(a), sa = Math.sin(a);
  const px = -sa, py = ca;
  const tipX = x + ca * 13, tipY = y + sa * 13;
  // The vane: two soft lobes either side of the quill.
  for (const side of [-1, 1]) {
    g.fillStyle(tint(DRM.white), alpha * 0.92);
    g.fillTriangle(x + ca * 3, y + sa * 3, tipX, tipY, x + ca * 7 + px * side * 4.4, y + sa * 7 + py * side * 4.4);
  }
  g.lineStyle(1, tint(DRM.pillowDeep), alpha);
  g.lineBetween(x - ca * 2, y - sa * 2, tipX, tipY);
  g.fillStyle(tint(DRM.pillow), alpha * 0.8);
  g.fillCircle(tipX, tipY, 1.4);
}

/** Claw scratches left on a dreamer's victim (R+, in a dream): raw red rakes that keep glowing. */
export function scratchMarks(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, count: number, t: number, alpha = 1,
): void {
  for (let i = 0; i < count; i++) {
    const a = -0.7 + i * 0.95 + Math.sin(i * 2.3) * 0.2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const cx = x + Math.cos(i * 2.1) * 6, cy = y + Math.sin(i * 2.1) * 5;
    const glow = 0.55 + 0.45 * Math.sin(t * 6 + i * 1.7);
    for (let k = -1; k <= 1; k++) {
      const ox = -sa * k * 3.4, oy = ca * k * 3.4;
      g.lineStyle(3, tint(DRM.clawDeep), alpha * 0.7);
      g.lineBetween(cx + ox - ca * 9, cy + oy - sa * 9, cx + ox + ca * 9, cy + oy + sa * 9);
      g.lineStyle(1.3, tint(DRM.claw), alpha * glow);
      g.lineBetween(cx + ox - ca * 8, cy + oy - sa * 8, cx + ox + ca * 8, cy + oy + sa * 8);
    }
  }
}

/**
 * Lucid Dream's spikes (E+): a cluster of night-glass thorns breaking out of the dream's floor.
 * `up` 0–1 is how far out of the ground they are; the ring on the floor warns before they rise.
 */
export function dreamSpikes(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, r: number, up: number, t: number, alpha = 1,
): void {
  // The crack they come out of.
  g.fillStyle(tint(DRM.night), alpha * 0.55);
  g.fillEllipse(x, y + 4, r * 2.1, r * 0.9);
  g.lineStyle(1.5, tint(DRM.claw), alpha * (0.3 + 0.4 * (1 - up)) * (0.7 + 0.3 * Math.sin(t * 9)));
  g.strokeEllipse(x, y + 4, r * 2.1, r * 0.9);
  if (up <= 0.02) return;
  const n = 7;
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * 2 - 1;
    const bx = x + u * r * 0.82;
    const by = y + 4 + Math.abs(u) * -2 + Math.sin(i * 3.7) * 3;
    const h = (14 + (1 - Math.abs(u)) * 18 + Math.sin(i * 5.1) * 4) * up;
    const lean = u * 0.35;
    const tx = bx + lean * h, ty = by - h;
    g.fillStyle(tint(DRM.deep), alpha);
    g.fillTriangle(bx - 4, by, bx + 4, by, tx, ty);
    g.fillStyle(tint(DRM.violet), alpha * 0.85);
    g.fillTriangle(bx - 1.5, by, bx + 3, by, tx, ty);
    g.fillStyle(tint(DRM.pale), alpha * 0.9);
    g.fillCircle(tx, ty, 1.1);
  }
}

/** Lucid Dream's red mist (E+): a bank of blood-coloured fog rolling along the inside of `box`. */
export function redMistBand(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  bx: number, by: number, bw: number, bh: number, band: number, t: number, alpha = 1,
): void {
  for (let i = 0; i < 4; i++) {
    const w = band / 4;
    g.lineStyle(w, tint(i < 2 ? DRM.dreadDeep : DRM.dread), alpha * (0.34 - i * 0.06));
    g.strokeRect(bx + w * (i + 0.5), by + w * (i + 0.5), bw - w * (2 * i + 1), bh - w * (2 * i + 1));
  }
  const per = 12;
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < per; i++) {
      const u = ((i / per) + t * 0.05 * (side % 2 ? 1 : -1) + 10) % 1;
      const r = band * (0.32 + 0.12 * Math.sin(t * 1.7 + i * 2.1 + side));
      const inset = band * (0.35 + 0.15 * Math.sin(t * 1.1 + i + side));
      const px = side === 0 ? bx + u * bw : side === 1 ? bx + bw - inset : side === 2 ? bx + (1 - u) * bw : bx + inset;
      const py = side === 0 ? by + inset : side === 1 ? by + u * bh : side === 2 ? by + bh - inset : by + (1 - u) * bh;
      g.fillStyle(tint(DRM.dread), alpha * 0.16);
      g.fillCircle(px, py, r);
    }
  }
}

/**
 * Lucid Dream's split (E+): a seam of light down the middle of the dream. The foe's side of it
 * is a wall — drawn as a sheet of violet glass — and the dreamer's is only a line on the floor.
 */
export function dreamSplit(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y0: number, y1: number, wallSide: number, t: number, alpha = 1,
): void {
  g.fillStyle(tint(DRM.violet), alpha * 0.16);
  g.fillRect(wallSide < 0 ? x - 18 : x, y0, 18, y1 - y0);
  g.lineStyle(6, tint(DRM.purple), alpha * 0.35);
  g.lineBetween(x, y0, x, y1);
  g.lineStyle(2, tint(DRM.pale), alpha * (0.7 + 0.3 * Math.sin(t * 4)));
  g.lineBetween(x, y0, x, y1);
  for (let i = 0; i < 9; i++) {
    const p = (t * 0.18 + i / 9) % 1;
    star(g, tint, x + Math.sin(t * 2 + i) * 3, y0 + (y1 - y0) * p, 2.6, alpha * 0.85, DRM.star, t + i);
  }
}

/** Lucid Dream's shrink (E+): the dark that has eaten the edges of the dream, and its rim. */
export function dreamShrink(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  ox: number, oy: number, ow: number, oh: number,
  ix: number, iy: number, iw: number, ih: number, t: number, alpha = 1,
): void {
  g.fillStyle(tint(DRM.night), alpha * 0.9);
  g.fillRect(ox, oy, ow, iy - oy);
  g.fillRect(ox, iy + ih, ow, oy + oh - (iy + ih));
  g.fillRect(ox, iy, ix - ox, ih);
  g.fillRect(ix + iw, iy, ox + ow - (ix + iw), ih);
  g.lineStyle(8, tint(DRM.violet), alpha * 0.25);
  g.strokeRect(ix, iy, iw, ih);
  g.lineStyle(2, tint(DRM.purple), alpha * (0.75 + 0.25 * Math.sin(t * 3)));
  g.strokeRect(ix, iy, iw, ih);
  for (let i = 0; i < 16; i++) {
    const u = (i / 16 + t * 0.04) % 1;
    const per = 2 * (iw + ih);
    let d = u * per;
    let px: number, py: number;
    if (d < iw) { px = ix + d; py = iy; } else if ((d -= iw) < ih) { px = ix + iw; py = iy + d; } else if ((d -= ih) < iw) { px = ix + iw - d; py = iy + ih; } else { d -= iw; px = ix; py = iy + ih - d; }
    star(g, tint, px, py, 2.2, alpha * 0.8, DRM.pale, t + i);
  }
}

/**
 * The music box (mastery): a little lacquered box with its lid propped open, a brass crank on
 * the side and a star turning on a pin inside. `open` 0–1 lifts the lid, `crank` turns the key.
 */
export function musicBox(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, t: number, open: number, crank: number, alpha = 1, s = 1,
): void {
  const w = 22 * s, h = 13 * s;
  g.fillStyle(tint(DRM.night), alpha * 0.4);
  g.fillEllipse(x, y + h * 0.7, w * 1.3, h * 0.55);
  // The lid, hinged at the back and propped open.
  const lidH = h * (0.25 + open * 0.75);
  g.fillStyle(tint(DRM.violet), alpha);
  g.fillRoundedRect(x - w / 2, y - h / 2 - lidH, w, lidH, 2 * s);
  g.fillStyle(tint(DRM.pale), alpha * 0.25 * open);
  g.fillRect(x - w / 2 + 2 * s, y - h / 2 - lidH + 2 * s, w - 4 * s, Math.max(0, lidH - 4 * s));
  // The box.
  g.fillStyle(tint(DRM.deep), alpha);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 2.5 * s);
  g.lineStyle(1.4 * s, tint(DRM.brass), alpha);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 2.5 * s);
  g.lineBetween(x - w / 2, y - h / 2 + 3 * s, x + w / 2, y - h / 2 + 3 * s);
  // A crescent inlaid on the front.
  g.fillStyle(tint(DRM.star), alpha);
  g.fillCircle(x, y + 1.5 * s, 3.2 * s);
  g.fillStyle(tint(DRM.deep), alpha);
  g.fillCircle(x + 1.3 * s, y + 0.8 * s, 2.7 * s);
  // The crank.
  const kx = x + w / 2 + 1.5 * s, ky = y;
  g.lineStyle(1.6 * s, tint(DRM.brass), alpha);
  g.lineBetween(kx, ky, kx + Math.cos(crank) * 6 * s, ky + Math.sin(crank) * 6 * s);
  g.fillStyle(tint(DRM.sand), alpha);
  g.fillCircle(kx + Math.cos(crank) * 6 * s, ky + Math.sin(crank) * 6 * s, 1.8 * s);
  g.fillCircle(kx, ky, 1.4 * s);
  // The dancer: a star on a pin, turning while the lid is up.
  if (open > 0.3) {
    const sy = y - h / 2 - 4 * s - open * 5 * s;
    g.lineStyle(1, tint(DRM.pale), alpha * open);
    g.lineBetween(x, y - h / 2, x, sy);
    star(g, tint, x, sy, 4.4 * s, alpha * open, DRM.star, t * 3);
  }
}

/** A drifting eighth note — the lullaby the music box plays. */
export function musicNote(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, r: number, alpha: number, color = DRM.pale,
): void {
  g.fillStyle(tint(color), alpha);
  g.fillEllipse(x, y, r * 1.5, r * 1.1);
  g.lineStyle(Math.max(0.8, r * 0.35), tint(color), alpha);
  g.lineBetween(x + r * 0.7, y, x + r * 0.7, y - r * 3);
  g.lineBetween(x + r * 0.7, y - r * 3, x + r * 1.8, y - r * 2.2);
}

/**
 * The lullaby's reach on the floor around a music box: a slow soft ring, sheep-wool scallops
 * and notes drifting outward. `life` 0–1 thins it as the box winds down.
 */
export function lullabyZone(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, r: number, t: number, life: number, alpha = 1,
): void {
  const a = alpha * (0.35 + 0.65 * life);
  g.fillStyle(tint(DRM.violet), a * 0.1);
  g.fillCircle(x, y, r);
  g.lineStyle(2, tint(DRM.purple), a * 0.5);
  g.strokeCircle(x, y, r);
  // Scallops round the rim, turning slowly, like a cot's mobile seen from above.
  for (let i = 0; i < 18; i++) {
    const ang = (i / 18) * TAU + t * 0.25;
    g.fillStyle(tint(DRM.wool), a * 0.2);
    g.fillCircle(x + Math.cos(ang) * r, y + Math.sin(ang) * r, 6);
  }
  for (let i = 0; i < 7; i++) {
    const p = (t * 0.32 + i / 7) % 1;
    const ang = i * 2.4 + t * 0.15;
    const d = 16 + p * (r - 22);
    musicNote(g, tint, x + Math.cos(ang) * d, y + Math.sin(ang) * d - p * 10, 3.2, a * (1 - p) * 0.9,
      i % 3 === 0 ? DRM.star : DRM.pale);
  }
}

/** A dream drawn out of a sleeper (mastery): green for a good dream, red for a nightmare. */
export const DREAM_ORB = { good: 0x5cf29a, goodDeep: 0x1d8a52, bad: 0xff3b55, badDeep: 0x7a0a1e };

export function dreamOrb(
  g: Phaser.GameObjects.Graphics,
  tint: DreamColorFn,
  x: number, y: number, bad: boolean, t: number, alpha = 1, r = 6,
): void {
  const c = bad ? DREAM_ORB.bad : DREAM_ORB.good;
  const d = bad ? DREAM_ORB.badDeep : DREAM_ORB.goodDeep;
  g.fillStyle(tint(c), alpha * 0.22);
  g.fillCircle(x, y, r * 1.9);
  g.fillStyle(tint(d), alpha);
  g.fillCircle(x, y, r);
  g.fillStyle(tint(c), alpha);
  g.fillCircle(x - r * 0.15, y - r * 0.15, r * 0.72);
  g.fillStyle(tint(DRM.white), alpha * 0.85);
  g.fillCircle(x - r * 0.35, y - r * 0.38, r * 0.25);
  // A wisp of dream trailing off it.
  g.lineStyle(1.2, tint(c), alpha * 0.5);
  g.beginPath();
  g.arc(x, y, r * 1.35, t * 4, t * 4 + 1.6, false);
  g.strokePath();
}

/** One button of the Lucid Dream panel. */
export interface LucidButton { key: string; emoji: string; name: string }

/**
 * Lucid Dream's panel (E+): five switches across the top of the screen. Screen space. It only
 * draws and hit-tests; the kit owns which switches are on.
 */
export class LucidPanel {
  private gfx: Phaser.GameObjects.Graphics;
  private texts: Phaser.GameObjects.Text[] = [];
  private title: Phaser.GameObjects.Text;
  static readonly BW = 128;
  static readonly BH = 30;
  static readonly GAP = 8;
  static readonly Y = 62;

  constructor(private scene: Phaser.Scene, private tint: DreamColorFn, private W: number, private buttons: LucidButton[]) {
    this.gfx = scene.add.graphics().setDepth(22).setScrollFactor(0);
    for (const b of buttons) {
      this.texts.push(scene.add.text(0, 0, `${b.emoji} ${b.name}`, {
        fontSize: '10px', fontFamily: 'Arial Black', color: '#e9ddff', stroke: '#0b0620', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(22.1).setScrollFactor(0));
    }
    this.title = scene.add.text(W / 2, LucidPanel.Y - 9, '', {
      fontSize: '9px', fontFamily: 'Arial Black', color: '#c9b8ff', stroke: '#0b0620', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(22.1).setScrollFactor(0);
  }

  private rect(i: number): { x: number; y: number } {
    const n = this.buttons.length;
    const total = n * LucidPanel.BW + (n - 1) * LucidPanel.GAP;
    return { x: this.W / 2 - total / 2 + i * (LucidPanel.BW + LucidPanel.GAP), y: LucidPanel.Y };
  }

  /** Which button a screen point is over, or -1. */
  hit(sx: number, sy: number): number {
    for (let i = 0; i < this.buttons.length; i++) {
      const r = this.rect(i);
      if (sx >= r.x && sx <= r.x + LucidPanel.BW && sy >= r.y && sy <= r.y + LucidPanel.BH) return i;
    }
    return -1;
  }

  /** Whether a screen point is anywhere on the panel's strip — clicks there never fire a gun. */
  covers(sx: number, sy: number): boolean {
    return sy >= LucidPanel.Y - 4 && sy <= LucidPanel.Y + LucidPanel.BH + 4 && this.hit(sx, sy) >= 0;
  }

  paint(mask: number, hover: number, wakeMult: number, t: number): void {
    const g = this.gfx;
    g.clear();
    const c = (k: number) => this.tint(k);
    for (let i = 0; i < this.buttons.length; i++) {
      const r = this.rect(i);
      const on = (mask & (1 << i)) !== 0;
      g.fillStyle(c(DRM.night), 0.82);
      g.fillRoundedRect(r.x, r.y, LucidPanel.BW, LucidPanel.BH, 7);
      if (on) {
        g.fillStyle(c(DRM.violet), 0.55 + 0.1 * Math.sin(t * 4 + i));
        g.fillRoundedRect(r.x + 2, r.y + 2, LucidPanel.BW - 4, LucidPanel.BH - 4, 6);
      }
      g.lineStyle(hover === i ? 2.4 : 1.4, c(on ? DRM.star : DRM.purple), hover === i ? 1 : 0.8);
      g.strokeRoundedRect(r.x, r.y, LucidPanel.BW, LucidPanel.BH, 7);
      // A lamp in the corner: lit when the switch is on.
      g.fillStyle(c(on ? DRM.star : DRM.deep), 1);
      g.fillCircle(r.x + LucidPanel.BW - 8, r.y + 8, 3);
      this.texts[i].setPosition(r.x + LucidPanel.BW / 2, r.y + LucidPanel.BH / 2).setColor(on ? '#fff4c2' : '#a99bd6');
    }
    this.title.setText(wakeMult > 1.001 ? `LUCID DREAM — THEY WAKE ${wakeMult.toFixed(2)}× FASTER` : 'LUCID DREAM — CLICK TO RESHAPE THEIR DREAM');
    this.title.setColor(wakeMult > 1.001 ? '#ff9cc8' : '#c9b8ff');
  }

  setVisible(v: boolean): void {
    this.gfx.setVisible(v);
    this.title.setVisible(v);
    for (const t of this.texts) t.setVisible(v);
  }

  destroy(): void {
    this.gfx.destroy();
    this.title.destroy();
    for (const t of this.texts) t.destroy();
  }
}

// ── The dream worlds ──────────────────────────────────────────────────────

/** The five places a sleeper can be dreaming of, in the order Delve deals them out. */
export const DREAM_WORLDS = [
  { name: 'Candyfloss Sky', color: '#ffb3dd' },
  { name: 'The Melting Hours', color: '#ffb36b' },
  { name: 'The Upside-Down Sea', color: '#6fe3e0' },
  { name: 'The Endless Bedroom', color: '#c9b8ff' },
  { name: 'The Moonlit Carnival', color: '#ffd98a' },
] as const;

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

function bands(g: Phaser.GameObjects.Graphics, W: number, H: number, top: number, bottom: number, alpha: number): void {
  const n = 24;
  for (let i = 0; i < n; i++) {
    g.fillStyle(lerpColor(top, bottom, i / (n - 1)), alpha);
    g.fillRect(0, (H * i) / n, W, H / n + 1);
  }
}

/** A deterministic 0–1 hash, so a world's scenery is the same every time it is dreamt. */
function h01(i: number): number {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

function cloud(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, color: number, alpha: number): void {
  g.fillStyle(color, alpha);
  g.fillCircle(x, y, 18 * s);
  g.fillCircle(x - 20 * s, y + 6 * s, 13 * s);
  g.fillCircle(x + 21 * s, y + 5 * s, 14 * s);
  g.fillCircle(x + 8 * s, y - 9 * s, 13 * s);
  g.fillRect(x - 30 * s, y + 4 * s, 62 * s, 12 * s);
}

/**
 * A full-screen dream, owned by whichever fighter on this screen is in it. The scenery is
 * drawn once into a static layer, the moving parts each frame into a second, and the purple
 * mist that frames every dream into a third that sits over the fighters.
 *
 * In `veil` mode (Invasion, where the map's walls still matter) the scenery is laid over the
 * real floor at a fraction of its strength instead of replacing it.
 */
export class DreamWorldView {
  private stat: Phaser.GameObjects.Graphics;
  private anim: Phaser.GameObjects.Graphics;
  private mist: Phaser.GameObjects.Graphics;
  private t = 0;
  private grow = 0;
  private closing = false;
  private readonly sceneryAlpha: number;
  /** Sleep Paralysis (Q+): the same place as a nightmare. Painted the first time it is needed. */
  private evil: Phaser.GameObjects.Graphics | null = null;
  private dread = 0;
  private dreadOn = false;
  /** Anomaly skin: every dream is the Backrooms, painted by the skin instead of `world`. */
  private backrooms: BackroomsView | null = null;
  private omenOn = false;

  constructor(
    private scene: Phaser.Scene,
    private tint: DreamColorFn,
    readonly world: number,
    private W: number,
    private H: number,
    veil: boolean,
    backrooms = false,
  ) {
    this.sceneryAlpha = veil ? 0.32 : 1;
    this.stat = scene.add.graphics().setDepth(0.5).setScrollFactor(0);
    this.anim = scene.add.graphics().setDepth(0.6).setScrollFactor(0);
    this.mist = scene.add.graphics().setDepth(13).setScrollFactor(0);
    if (backrooms) this.backrooms = new BackroomsView(scene, W, H, this.sceneryAlpha, this.stat, this.anim, this.mist);
    else this.paintStatic();
  }

  /** A nightmare is loose in this dream (only the Backrooms answer to it — it darkens as it holds). */
  setOminous(on: boolean): void { this.omenOn = on; }

  /** Start fading out; `update` returns false once it is gone. */
  close(): void { this.closing = true; }

  /** Turn the dream into its nightmare (Sleep Paralysis), or let it go back. Crossfades. */
  setNightmare(on: boolean): void {
    this.dreadOn = on;
    if (on && !this.evil) {
      this.evil = this.scene.add.graphics().setDepth(0.55).setScrollFactor(0).setAlpha(0);
      this.paintEvilStatic(this.evil);
    }
  }

  update(delta: number): boolean {
    this.t += delta / 1000;
    this.grow = Phaser.Math.Clamp(this.grow + (this.closing ? -1 : 1) * delta / 420, 0, 1);
    this.dread = Phaser.Math.Clamp(this.dread + (this.dreadOn ? 1 : -1) * delta / 650, 0, 1);
    const k = easeOut(this.grow);
    if (this.backrooms) {
      this.backrooms.update(delta, k, this.dreadOn || this.omenOn);
      return !(this.closing && this.grow <= 0);
    }
    const n = this.dread;
    this.stat.setAlpha(k * (1 - n));
    this.evil?.setAlpha(k * n);
    this.anim.clear();
    this.anim.setAlpha(k);
    if (n < 0.99) this.paintAnim(this.anim, this.t, 1 - n);
    if (n > 0.01) this.paintEvilAnim(this.anim, this.t, n);
    this.paintMist(k);
    return !(this.closing && this.grow <= 0);
  }

  destroy(): void {
    this.stat.destroy();
    this.anim.destroy();
    this.mist.destroy();
    this.evil?.destroy();
    this.backrooms?.destroy();
  }

  private c(color: number): number { return this.tint(color); }

  private paintStatic(): void {
    const g = this.stat;
    const { W, H } = this;
    const A = this.sceneryAlpha;
    switch (this.world) {
      case 0: { // Candyfloss Sky
        bands(g, W, H, 0xffc7e6, 0xb79cff, A);
        for (let i = 0; i < 9; i++) cloud(g, h01(i) * W, H * (0.15 + h01(i + 20) * 0.75), 0.8 + h01(i + 40) * 0.9, 0xfff3fb, A * 0.55);
        // Lollipop trees along the floor.
        for (let i = 0; i < 7; i++) {
          const x = 60 + i * (W - 120) / 6 + (h01(i + 9) - 0.5) * 40;
          const y = H * (0.72 + h01(i + 3) * 0.2);
          g.lineStyle(4, 0xffffff, A * 0.8);
          g.lineBetween(x, y, x, y - 46);
          const cols = [0xff6fae, 0x7fd6ff, 0xffd36f, 0xa98bff];
          g.fillStyle(cols[i % 4], A * 0.85);
          g.fillCircle(x, y - 58, 16);
          g.lineStyle(3, 0xffffff, A * 0.7);
          g.beginPath(); g.arc(x, y - 58, 9, 0, 4.5); g.strokePath();
        }
        // Gumdrops scattered on the candy floor.
        for (let i = 0; i < 16; i++) {
          const cols = [0xff4f8b, 0x5fe0a0, 0xffb84f, 0x8f7bff];
          g.fillStyle(cols[i % 4], A * 0.6);
          const x = h01(i + 70) * W, y = H * (0.5 + h01(i + 90) * 0.48);
          g.fillEllipse(x, y, 12, 9);
        }
        break;
      }
      case 1: { // The Melting Hours
        bands(g, W, H, 0x3b1d4f, 0xff9a52, A);
        // A pocket-watch sun.
        g.fillStyle(0xffe1a0, A * 0.85); g.fillCircle(W * 0.72, H * 0.28, 70);
        g.lineStyle(5, 0xc98a3a, A); g.strokeCircle(W * 0.72, H * 0.28, 70);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU;
          g.fillStyle(0x6b3a1a, A); g.fillCircle(W * 0.72 + Math.cos(a) * 58, H * 0.28 + Math.sin(a) * 58, 3);
        }
        // Dunes.
        for (let i = 0; i < 4; i++) {
          g.fillStyle(lerpColor(0xe0a35a, 0x9a5a2a, i / 3), A * 0.9);
          g.fillEllipse(W * (0.15 + i * 0.25), H * (0.92 - i * 0.02), W * 0.55, H * (0.26 + i * 0.04));
        }
        // Melting clocks draped over dead branches.
        for (let i = 0; i < 3; i++) {
          const x = W * (0.18 + i * 0.32), y = H * (0.55 + h01(i + 5) * 0.12);
          g.lineStyle(5, 0x4a2a18, A); g.lineBetween(x, y + 70, x, y); g.lineBetween(x, y, x + 34, y - 10);
          g.fillStyle(0xf5e6c4, A); g.fillEllipse(x + 30, y - 2, 46, 30);
          g.fillTriangle(x + 18, y + 8, x + 42, y + 8, x + 34, y + 38);
          g.lineStyle(2, 0x6b3a1a, A); g.strokeEllipse(x + 30, y - 2, 46, 30);
        }
        break;
      }
      case 2: { // The Upside-Down Sea
        bands(g, W, H, 0x0c3b5a, 0x29a7a8, A);
        // Kelp hangs from the sky instead of growing up.
        for (let i = 0; i < 14; i++) {
          const x = (i + 0.5) * W / 14 + (h01(i) - 0.5) * 30;
          const len = 80 + h01(i + 11) * 120;
          g.lineStyle(6, 0x1f7a52, A * 0.75);
          g.beginPath(); g.moveTo(x, 0);
          for (let s = 1; s <= 8; s++) g.lineTo(x + Math.sin(s * 0.9 + i) * 10, (len * s) / 8);
          g.strokePath();
        }
        // A seabed... on the ceiling of the floor: sand ripples and shells.
        for (let i = 0; i < 18; i++) {
          g.fillStyle(0xf2d9a8, A * 0.35);
          g.fillEllipse(h01(i + 30) * W, H * (0.6 + h01(i + 50) * 0.38), 22, 6);
        }
        break;
      }
      case 3: { // The Endless Bedroom
        bands(g, W, H, 0x2a1f5c, 0x5a3f9a, A);
        // A checkerboard floor in perspective.
        const horizon = H * 0.34;
        for (let row = 0; row < 9; row++) {
          const y0 = horizon + (H - horizon) * ((row / 9) ** 1.6);
          const y1 = horizon + (H - horizon) * (((row + 1) / 9) ** 1.6);
          for (let col = -6; col < 6; col++) {
            if ((row + col) % 2 === 0) continue;
            const x0a = W / 2 + col * 40 * (1 + row * 0.7), x1a = W / 2 + (col + 1) * 40 * (1 + row * 0.7);
            const x0b = W / 2 + col * 40 * (1 + (row + 1) * 0.7), x1b = W / 2 + (col + 1) * 40 * (1 + (row + 1) * 0.7);
            g.fillStyle(0xe8e0ff, A * 0.22);
            g.fillPoints([{ x: x0a, y: y0 }, { x: x1a, y: y0 }, { x: x1b, y: y1 }, { x: x0b, y: y1 }] as Phaser.Types.Math.Vector2Like[], true);
          }
        }
        // Giant furniture on the horizon: a bedpost, a lamp, a door standing on its own.
        g.fillStyle(0x1a1238, A * 0.9);
        g.fillRect(W * 0.08, horizon - 150, 26, 160); g.fillCircle(W * 0.08 + 13, horizon - 156, 18);
        g.fillRect(W * 0.86, horizon - 120, 10, 130);
        g.fillTriangle(W * 0.86 - 40, horizon - 120, W * 0.86 + 50, horizon - 120, W * 0.86 + 5, horizon - 180);
        g.fillStyle(0xffe59a, A * 0.5); g.fillCircle(W * 0.86 + 5, horizon - 112, 16);
        g.fillStyle(0x8a5a3a, A * 0.9); g.fillRect(W * 0.5 - 22, horizon - 90, 44, 90);
        g.fillStyle(0xffd98a, A); g.fillCircle(W * 0.5 + 12, horizon - 44, 3);
        break;
      }
      default: { // The Moonlit Carnival
        bands(g, W, H, 0x120a32, 0x4b2a7a, A);
        for (let i = 0; i < 60; i++) {
          g.fillStyle(0xffffff, A * (0.3 + h01(i) * 0.6));
          g.fillCircle(h01(i + 100) * W, h01(i + 200) * H * 0.6, 0.8 + h01(i + 300) * 1.4);
        }
        // A moon with a sleeping face.
        g.fillStyle(0xfff4c2, A); g.fillCircle(W * 0.2, H * 0.24, 56);
        g.lineStyle(3, 0xc9b27a, A);
        g.beginPath(); g.arc(W * 0.2 - 18, H * 0.24 - 4, 8, 0.2, Math.PI - 0.2); g.strokePath();
        g.beginPath(); g.arc(W * 0.2 + 18, H * 0.24 - 4, 8, 0.2, Math.PI - 0.2); g.strokePath();
        g.beginPath(); g.arc(W * 0.2, H * 0.24 + 20, 10, 0.3, Math.PI - 0.3); g.strokePath();
        // A carousel silhouette.
        const cx = W * 0.78, cy = H * 0.5;
        g.fillStyle(0x1b1145, A * 0.95);
        g.fillTriangle(cx - 90, cy - 40, cx + 90, cy - 40, cx, cy - 110);
        g.fillRect(cx - 80, cy - 40, 160, 10);
        for (let i = 0; i < 5; i++) g.fillRect(cx - 70 + i * 35, cy - 30, 4, 70);
        g.fillRect(cx - 86, cy + 40, 172, 12);
        for (let i = 0; i < 8; i++) {
          g.fillStyle(i % 2 ? 0xffd98a : 0xff6fae, A * 0.8);
          g.fillCircle(cx - 84 + i * 24, cy - 40, 3);
        }
        // A staircase climbing to nowhere.
        g.fillStyle(0x6a4fb0, A * 0.6);
        for (let i = 0; i < 8; i++) g.fillRect(W * 0.38 + i * 18, H * 0.72 - i * 16, 22, 8);
        break;
      }
    }
  }

  private paintAnim(g: Phaser.GameObjects.Graphics, t: number, mul = 1): void {
    const { W, H } = this;
    const A = this.sceneryAlpha * mul;
    switch (this.world) {
      case 0: {
        for (let i = 0; i < 4; i++) {
          const x = ((h01(i + 500) * W + t * (14 + i * 6)) % (W + 160)) - 80;
          cloud(g, x, H * (0.1 + i * 0.22), 0.6 + i * 0.2, 0xffffff, A * 0.35);
        }
        for (let i = 0; i < 18; i++) {
          const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
          star(g, this.tint, h01(i + 600) * W, h01(i + 700) * H, 2.4, A * tw, 0xfff4fb, t + i);
        }
        break;
      }
      case 1: {
        // The sun's hands run backwards; drops fall off the clocks.
        const sx = W * 0.72, sy = H * 0.28;
        g.lineStyle(4, 0x6b3a1a, A);
        g.lineBetween(sx, sy, sx + Math.cos(-t * 1.6) * 44, sy + Math.sin(-t * 1.6) * 44);
        g.lineStyle(3, 0x6b3a1a, A);
        g.lineBetween(sx, sy, sx + Math.cos(-t * 0.2) * 30, sy + Math.sin(-t * 0.2) * 30);
        for (let i = 0; i < 3; i++) {
          const p = (t * 0.6 + i * 0.37) % 1;
          const x = W * (0.18 + i * 0.32) + 34, y = H * (0.55 + h01(i + 5) * 0.12) + 38 + p * 60;
          g.fillStyle(0xf5e6c4, A * (1 - p));
          g.fillEllipse(x, y, 5, 8);
        }
        for (let i = 0; i < 10; i++) {
          const x = ((h01(i + 800) * W + t * 40) % W);
          g.fillStyle(0xffd59a, A * 0.25);
          g.fillCircle(x, H * (0.62 + h01(i + 820) * 0.3), 2);
        }
        break;
      }
      case 2: {
        // Fish swim through the air; bubbles fall instead of rising.
        for (let i = 0; i < 7; i++) {
          const dir = i % 2 ? 1 : -1;
          const x = ((h01(i + 900) * W + dir * t * (40 + i * 9)) % (W + 80) + W + 80) % (W + 80) - 40;
          const y = H * (0.2 + h01(i + 920) * 0.6) + Math.sin(t * 2 + i) * 8;
          const cols = [0xffa94f, 0xff6f8f, 0xfff06f, 0x8fe0ff];
          g.fillStyle(cols[i % 4], A * 0.8);
          g.fillEllipse(x, y, 22, 11);
          g.fillTriangle(x - dir * 10, y, x - dir * 20, y - 7, x - dir * 20, y + 7);
          g.fillStyle(0x0b0620, A); g.fillCircle(x + dir * 6, y - 1, 1.6);
        }
        for (let i = 0; i < 14; i++) {
          const p = (t * 0.25 + h01(i + 950)) % 1;
          g.lineStyle(1.2, 0xdff8ff, A * 0.6 * (1 - p));
          g.strokeCircle(h01(i + 970) * W + Math.sin(t + i) * 6, p * H, 3 + h01(i) * 4);
        }
        // A jellyfish pulsing near the middle.
        const jx = W * 0.5 + Math.sin(t * 0.5) * 120, jy = H * 0.3 + Math.sin(t * 0.9) * 20;
        const pulse = 1 + Math.sin(t * 3) * 0.12;
        g.fillStyle(0xe6a8ff, A * 0.55);
        g.fillEllipse(jx, jy, 46 * pulse, 30 / pulse);
        g.lineStyle(1.5, 0xe6a8ff, A * 0.5);
        for (let i = 0; i < 5; i++) {
          g.beginPath(); g.moveTo(jx - 16 + i * 8, jy + 8);
          for (let s = 1; s <= 5; s++) g.lineTo(jx - 16 + i * 8 + Math.sin(t * 4 + s + i) * 4, jy + 8 + s * 9);
          g.strokePath();
        }
        break;
      }
      case 3: {
        // Doors hanging in the air, swinging; a slow herd of sheep crosses overhead.
        for (let i = 0; i < 3; i++) {
          const x = W * (0.25 + i * 0.25), y = H * 0.16 + Math.sin(t + i * 2) * 10;
          const open = 0.5 + 0.5 * Math.sin(t * 0.8 + i * 1.9);
          g.fillStyle(0x0b0620, A * 0.8); g.fillRect(x - 14, y - 24, 28, 48);
          g.fillStyle(0xffe59a, A * 0.45 * open); g.fillRect(x - 12, y - 22, 24, 44);
          g.fillStyle(0x8a5a3a, A); g.fillRect(x - 14, y - 24, 28 * (1 - open * 0.8), 48);
        }
        for (let i = 0; i < 5; i++) {
          const x = ((t * 26 + i * 70) % (W + 120)) - 60;
          sheep(g, this.tint, x, H * 0.27 + Math.sin(t * 3 + i) * 3, 0.9, A * 0.8, t * 6 + i);
        }
        break;
      }
      default: {
        // Teacups turning on their saucers, and the odd shooting star.
        for (let i = 0; i < 4; i++) {
          const x = W * (0.18 + i * 0.2), y = H * 0.82 + Math.sin(t * 1.4 + i) * 6;
          const spin = Math.sin(t * 2 + i);
          g.fillStyle([0xff8fc8, 0x8fd0ff, 0xffd98a, 0xb48cff][i], A * 0.75);
          g.fillEllipse(x, y + 10, 54, 12);
          g.fillRect(x - 18, y - 12, 36, 22);
          g.fillEllipse(x, y - 12, 36, 10);
          g.lineStyle(3, 0xffffff, A * 0.6);
          g.strokeCircle(x + 20 * spin, y - 2, 6);
        }
        const p = (t * 0.35) % 1;
        if (p < 0.4) {
          const k = p / 0.4;
          const sx = W * (0.1 + k * 0.6), sy = H * (0.05 + k * 0.25);
          g.lineStyle(2, 0xffffff, A * (1 - k));
          g.lineBetween(sx, sy, sx - 60, sy - 24);
          star(g, this.tint, sx, sy, 4, A * (1 - k), 0xffffff, t);
        }
        break;
      }
    }
  }

  /**
   * The five worlds as nightmares — the same places, gone wrong. Every landmark survives so the
   * dream is recognisably the one it was: the candy has rotted, the hours have stopped, the sea
   * has drowned, the bedroom has something under the bed, the carnival has closed for good.
   */
  private paintEvilStatic(g: Phaser.GameObjects.Graphics): void {
    const { W, H } = this;
    const A = this.sceneryAlpha;
    switch (this.world) {
      case 0: { // Rotten Candyfloss
        bands(g, W, H, 0x1a0410, 0x4a0f2a, A);
        // The clouds have gone to smog.
        for (let i = 0; i < 9; i++) cloud(g, h01(i) * W, H * (0.15 + h01(i + 20) * 0.75), 0.8 + h01(i + 40) * 0.9, 0x2e1f2e, A * 0.7);
        // Lollipop trees, dead: bent black sticks, the sweets rotted to dripping red.
        for (let i = 0; i < 7; i++) {
          const x = 60 + i * (W - 120) / 6 + (h01(i + 9) - 0.5) * 40;
          const y = H * (0.72 + h01(i + 3) * 0.2);
          const lean = (h01(i + 14) - 0.5) * 22;
          g.lineStyle(4, 0x120408, A);
          g.lineBetween(x, y, x + lean * 0.5, y - 24); g.lineBetween(x + lean * 0.5, y - 24, x + lean, y - 46);
          g.fillStyle(0x5a0a1e, A * 0.95);
          g.fillCircle(x + lean, y - 58, 16);
          g.lineStyle(3, 0x1a0008, A * 0.9);
          g.beginPath(); g.arc(x + lean, y - 58, 9, 0, 4.5); g.strokePath();
          // Drips running off it.
          g.fillStyle(0x8a1430, A * 0.9);
          for (let d = 0; d < 3; d++) {
            const dx = x + lean - 9 + d * 9;
            const len = 8 + h01(i * 3 + d) * 14;
            g.fillTriangle(dx - 2.5, y - 46, dx + 2.5, y - 46, dx, y - 46 + len);
          }
        }
        // The gumdrops have opened their eyes.
        for (let i = 0; i < 16; i++) {
          const x = h01(i + 70) * W, y = H * (0.5 + h01(i + 90) * 0.48);
          g.fillStyle(0xe8dccf, A * 0.75); g.fillEllipse(x, y, 12, 9);
          g.fillStyle(0xb0102e, A); g.fillCircle(x + (h01(i) - 0.5) * 3, y, 2.6);
          g.fillStyle(0x0b0206, A); g.fillCircle(x + (h01(i) - 0.5) * 3, y, 1.2);
        }
        break;
      }
      case 1: { // The Last Hour
        bands(g, W, H, 0x060203, 0x5a0d06, A);
        // The pocket-watch sun has gone out: black glass, a cracked face, red numerals.
        const sx = W * 0.72, sy = H * 0.28;
        g.fillStyle(0x140608, A * 0.95); g.fillCircle(sx, sy, 70);
        g.lineStyle(5, 0x8a1a10, A); g.strokeCircle(sx, sy, 70);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU;
          g.fillStyle(0xff3b2a, A); g.fillCircle(sx + Math.cos(a) * 58, sy + Math.sin(a) * 58, 3);
        }
        g.lineStyle(2, 0xff5a3a, A * 0.8);
        g.lineBetween(sx - 40, sy - 30, sx - 6, sy + 4); g.lineBetween(sx - 6, sy + 4, sx + 18, sy - 8); g.lineBetween(sx - 6, sy + 4, sx + 4, sy + 50);
        // Dunes of ash.
        for (let i = 0; i < 4; i++) {
          g.fillStyle(lerpColor(0x3a2424, 0x1a0e0e, i / 3), A * 0.95);
          g.fillEllipse(W * (0.15 + i * 0.25), H * (0.92 - i * 0.02), W * 0.55, H * (0.26 + i * 0.04));
        }
        // The clocks over the branches have melted into something that bleeds.
        for (let i = 0; i < 3; i++) {
          const x = W * (0.18 + i * 0.32), y = H * (0.55 + h01(i + 5) * 0.12);
          g.lineStyle(5, 0x0a0404, A); g.lineBetween(x, y + 70, x, y); g.lineBetween(x, y, x + 34, y - 10);
          g.lineBetween(x, y + 20, x - 18, y + 4);
          g.fillStyle(0x7a1420, A); g.fillEllipse(x + 30, y - 2, 46, 30);
          g.fillTriangle(x + 18, y + 8, x + 42, y + 8, x + 34, y + 44);
          g.lineStyle(2, 0x2a0408, A); g.strokeEllipse(x + 30, y - 2, 46, 30);
          g.fillStyle(0xffd0c0, A * 0.8); g.fillCircle(x + 30, y - 2, 2);
        }
        break;
      }
      case 2: { // The Drowning Deep
        bands(g, W, H, 0x010506, 0x0a221c, A);
        // The kelp is chains now, ending in hooks.
        for (let i = 0; i < 14; i++) {
          const x = (i + 0.5) * W / 14 + (h01(i) - 0.5) * 30;
          const len = 80 + h01(i + 11) * 120;
          g.lineStyle(3, 0x2a3a34, A * 0.9);
          for (let s2 = 0; s2 < 9; s2++) {
            const y0 = (len * s2) / 9;
            g.strokeEllipse(x + Math.sin(s2 * 0.9 + i) * 4, y0 + 6, s2 % 2 ? 5 : 8, 10);
          }
          g.lineStyle(3, 0x6a7a74, A * 0.9);
          g.beginPath(); g.arc(x + 4, len + 10, 7, Math.PI * 0.1, Math.PI * 1.15, false); g.strokePath();
        }
        // The shells on the seabed are bones.
        for (let i = 0; i < 18; i++) {
          const x = h01(i + 30) * W, y = H * (0.6 + h01(i + 50) * 0.38);
          const a = h01(i + 7) * Math.PI;
          g.lineStyle(3, 0xcfc6b0, A * 0.45);
          g.lineBetween(x - Math.cos(a) * 9, y - Math.sin(a) * 4, x + Math.cos(a) * 9, y + Math.sin(a) * 4);
          g.fillStyle(0xcfc6b0, A * 0.45);
          g.fillCircle(x - Math.cos(a) * 9, y - Math.sin(a) * 4, 2.6); g.fillCircle(x + Math.cos(a) * 9, y + Math.sin(a) * 4, 2.6);
        }
        break;
      }
      case 3: { // Under the Bed
        bands(g, W, H, 0x07020c, 0x2a0816, A);
        const horizon = H * 0.34;
        for (let row = 0; row < 9; row++) {
          const y0 = horizon + (H - horizon) * ((row / 9) ** 1.6);
          const y1 = horizon + (H - horizon) * (((row + 1) / 9) ** 1.6);
          for (let col = -6; col < 6; col++) {
            if ((row + col) % 2 === 0) continue;
            const x0a = W / 2 + col * 40 * (1 + row * 0.7), x1a = W / 2 + (col + 1) * 40 * (1 + row * 0.7);
            const x0b = W / 2 + col * 40 * (1 + (row + 1) * 0.7), x1b = W / 2 + (col + 1) * 40 * (1 + (row + 1) * 0.7);
            g.fillStyle(0x6b0f26, A * 0.3);
            g.fillPoints([{ x: x0a, y: y0 }, { x: x1a, y: y0 }, { x: x1b, y: y1 }, { x: x0b, y: y1 }] as Phaser.Types.Math.Vector2Like[], true);
          }
        }
        // Cracks across the floor.
        g.lineStyle(2, 0x0a0206, A * 0.9);
        for (let i = 0; i < 5; i++) {
          let x = W * (0.1 + h01(i + 3) * 0.8), y = horizon + 20 + h01(i + 8) * (H - horizon - 40);
          g.beginPath(); g.moveTo(x, y);
          for (let s2 = 0; s2 < 5; s2++) { x += (h01(i * 7 + s2) - 0.5) * 60; y += 10 + h01(i * 5 + s2) * 18; g.lineTo(x, y); }
          g.strokePath();
        }
        // The furniture: a snapped bedpost, a lamp with a torn shade, the door wide open.
        g.fillStyle(0x0b0410, A * 0.95);
        g.fillRect(W * 0.08, horizon - 90, 26, 100);
        g.fillTriangle(W * 0.08, horizon - 90, W * 0.08 + 26, horizon - 90, W * 0.08 + 6, horizon - 128);
        g.fillRect(W * 0.86, horizon - 120, 10, 130);
        g.fillTriangle(W * 0.86 - 40, horizon - 120, W * 0.86 + 50, horizon - 120, W * 0.86 + 5, horizon - 180);
        g.fillStyle(0x2a0816, A); g.fillTriangle(W * 0.86 - 10, horizon - 120, W * 0.86 + 22, horizon - 120, W * 0.86 + 8, horizon - 150);
        g.fillStyle(0x3a0610, A * 0.95); g.fillRect(W * 0.5 - 22, horizon - 90, 44, 90);
        g.fillStyle(0xff2a40, A * 0.35); g.fillRect(W * 0.5 - 18, horizon - 86, 36, 86);
        // Long fingers reaching up from under the bottom of the screen.
        g.fillStyle(0x05010a, A);
        for (let i = 0; i < 6; i++) {
          const x = W * (0.12 + i * 0.15) + (h01(i + 40) - 0.5) * 30;
          const h = 40 + h01(i + 41) * 50;
          const lean = (h01(i + 42) - 0.5) * 30;
          g.fillTriangle(x - 6, H, x + 6, H, x + lean, H - h);
          g.fillCircle(x + lean, H - h, 2.4);
        }
        break;
      }
      default: { // The Carnival After Dark
        bands(g, W, H, 0x040106, 0x2a0614, A);
        for (let i = 0; i < 30; i++) {
          g.fillStyle(0xff4a5a, A * (0.2 + h01(i) * 0.4));
          g.fillCircle(h01(i + 100) * W, h01(i + 200) * H * 0.6, 0.6 + h01(i + 300) * 1.1);
        }
        // The moon is awake, and red, and grinning.
        const mx = W * 0.2, my = H * 0.24;
        g.fillStyle(0xb0182a, A); g.fillCircle(mx, my, 56);
        g.fillStyle(0x6b0a16, A * 0.6); g.fillCircle(mx - 16, my + 14, 9); g.fillCircle(mx + 20, my - 18, 6);
        g.fillStyle(0x0b0206, A);
        g.fillTriangle(mx - 30, my - 14, mx - 8, my - 6, mx - 26, my - 2);
        g.fillTriangle(mx + 30, my - 14, mx + 8, my - 6, mx + 26, my - 2);
        g.fillStyle(0xffe6c8, A);
        g.fillTriangle(mx - 24, my - 9, mx - 16, my - 7, mx - 22, my - 5);
        g.fillTriangle(mx + 24, my - 9, mx + 16, my - 7, mx + 22, my - 5);
        g.fillStyle(0x0b0206, A);
        g.beginPath(); g.arc(mx, my + 8, 28, 0.25, Math.PI - 0.25, false); g.closePath(); g.fillPath();
        g.fillStyle(0xffe6c8, A);
        for (let i = 0; i < 8; i++) {
          const a = 0.35 + (i / 7) * (Math.PI - 0.7);
          const tx = mx + Math.cos(a) * 26, ty = my + 8 + Math.sin(a) * 26;
          g.fillTriangle(tx - 3, ty - 8 * Math.sin(a), tx + 3, ty - 8 * Math.sin(a), tx, ty);
        }
        // The carousel has come off its pole and tipped over.
        const cx = W * 0.78, cy = H * 0.5;
        g.fillStyle(0x12040c, A * 0.95);
        g.fillTriangle(cx - 80, cy - 20, cx + 96, cy - 54, cx + 4, cy - 116);
        g.fillRect(cx - 86, cy + 40, 172, 12);
        g.lineStyle(4, 0x12040c, A);
        for (let i = 0; i < 5; i++) g.lineBetween(cx - 70 + i * 35, cy + 40, cx - 62 + i * 35 + (i % 2 ? 14 : -10), cy - 26 + i * 4);
        for (let i = 0; i < 8; i++) {
          g.fillStyle(i % 3 === 0 ? 0xff3b55 : 0x2a0a12, A * 0.9);
          g.fillCircle(cx - 74 + i * 22, cy - 24 - i * 4, 3);
        }
        // The staircase to nowhere has lost its middle.
        g.fillStyle(0x3a1430, A * 0.7);
        for (let i = 0; i < 8; i++) { if (i === 3 || i === 4) continue; g.fillRect(W * 0.38 + i * 18, H * 0.72 - i * 16, 22, 8); }
        break;
      }
    }
  }

  private paintEvilAnim(g: Phaser.GameObjects.Graphics, t: number, mul: number): void {
    const { W, H } = this;
    const A = this.sceneryAlpha * mul;
    switch (this.world) {
      case 0: {
        // Smog banks drift over with eyes in them, blinking out of time with each other.
        for (let i = 0; i < 4; i++) {
          const x = ((h01(i + 500) * W + t * (10 + i * 5)) % (W + 160)) - 80;
          const y = H * (0.1 + i * 0.22);
          cloud(g, x, y, 0.6 + i * 0.2, 0x1a0e1a, A * 0.6);
          const blink = Math.sin(t * 1.3 + i * 2.1) > -0.85 ? 1 : 0.1;
          g.fillStyle(0xff2a44, A * blink);
          g.fillEllipse(x - 7, y, 5, 3 * blink); g.fillEllipse(x + 7, y, 5, 3 * blink);
        }
        for (let i = 0; i < 12; i++) {
          const p = (t * 0.4 + h01(i + 600)) % 1;
          g.fillStyle(0x8a1430, A * (1 - p) * 0.7);
          g.fillEllipse(h01(i + 700) * W, p * H, 3, 6);
        }
        break;
      }
      case 1: {
        // The hands race forward now, and the clocks bleed.
        const sx = W * 0.72, sy = H * 0.28;
        g.lineStyle(4, 0xff3b2a, A);
        g.lineBetween(sx, sy, sx + Math.cos(t * 5) * 44, sy + Math.sin(t * 5) * 44);
        g.lineStyle(3, 0xff3b2a, A);
        g.lineBetween(sx, sy, sx + Math.cos(t * 0.9) * 30, sy + Math.sin(t * 0.9) * 30);
        for (let i = 0; i < 3; i++) {
          const p = (t * 0.8 + i * 0.37) % 1;
          const x = W * (0.18 + i * 0.32) + 34, y = H * (0.55 + h01(i + 5) * 0.12) + 44 + p * 70;
          g.fillStyle(0xb0102e, A * (1 - p));
          g.fillEllipse(x, y, 5, 9);
        }
        // Embers off the ash.
        for (let i = 0; i < 14; i++) {
          const p = (t * 0.22 + h01(i + 820)) % 1;
          g.fillStyle(0xff6a3a, A * (1 - p) * 0.6);
          g.fillCircle(h01(i + 800) * W + Math.sin(t * 2 + i) * 8, H * (0.95 - p * 0.6), 1.6);
        }
        break;
      }
      case 2: {
        // Bones swim where the fish did, and the jellyfish is an eye.
        for (let i = 0; i < 6; i++) {
          const dir = i % 2 ? 1 : -1;
          const x = ((h01(i + 900) * W + dir * t * (30 + i * 7)) % (W + 80) + W + 80) % (W + 80) - 40;
          const y = H * (0.2 + h01(i + 920) * 0.6) + Math.sin(t * 2 + i) * 8;
          g.lineStyle(1.6, 0xd8d0bc, A * 0.75);
          g.lineBetween(x - dir * 12, y, x + dir * 8, y);
          for (let r = 0; r < 4; r++) {
            const rx = x - dir * (8 - r * 4);
            g.lineBetween(rx, y - 4, rx, y + 4);
          }
          g.strokeCircle(x + dir * 10, y, 3.4);
          g.fillStyle(0x40ffb0, A * 0.8); g.fillCircle(x + dir * 10, y, 1);
        }
        // An angler's lure, bobbing in the dark.
        const lx = W * 0.3 + Math.sin(t * 0.4) * 80, ly = H * 0.62 + Math.sin(t * 1.3) * 12;
        g.fillStyle(0xbfffe0, A * (0.5 + 0.4 * Math.sin(t * 5)));
        g.fillCircle(lx, ly, 4);
        g.fillStyle(0xbfffe0, A * 0.12); g.fillCircle(lx, ly, 16);
        const jx = W * 0.5 + Math.sin(t * 0.5) * 120, jy = H * 0.3 + Math.sin(t * 0.9) * 20;
        const pulse = 1 + Math.sin(t * 3) * 0.1;
        g.fillStyle(0xe8e0d0, A * 0.85); g.fillEllipse(jx, jy, 46 * pulse, 30 / pulse);
        g.fillStyle(0x9a0a24, A); g.fillCircle(jx + Math.sin(t) * 6, jy, 9);
        g.fillStyle(0x050102, A); g.fillEllipse(jx + Math.sin(t) * 6, jy, 3, 10);
        g.lineStyle(1.5, 0x5a1a2a, A * 0.7);
        for (let i = 0; i < 6; i++) {
          g.beginPath(); g.moveTo(jx - 18 + i * 7, jy + 10);
          for (let s2 = 1; s2 <= 6; s2++) g.lineTo(jx - 18 + i * 7 + Math.sin(t * 5 + s2 + i) * 5, jy + 10 + s2 * 10);
          g.strokePath();
        }
        break;
      }
      case 3: {
        // The doors bang open on something red-eyed; shadow sheep walk the wrong way.
        for (let i = 0; i < 3; i++) {
          const x = W * (0.25 + i * 0.25), y = H * 0.16 + Math.sin(t * 2 + i * 2) * 4;
          const open = Math.max(0, Math.sin(t * 2.6 + i * 1.9));
          g.fillStyle(0x020004, A * 0.9); g.fillRect(x - 14, y - 24, 28, 48);
          g.fillStyle(0xff2a44, A * open);
          g.fillCircle(x - 4, y - 6, 2); g.fillCircle(x + 4, y - 6, 2);
          g.fillStyle(0x3a0610, A); g.fillRect(x - 14, y - 24, 28 * (1 - open * 0.85), 48);
        }
        for (let i = 0; i < 5; i++) {
          const x = W + 60 - ((t * 22 + i * 70) % (W + 120));
          const y = H * 0.27 + Math.sin(t * 3 + i) * 3;
          g.fillStyle(0x0b0410, A * 0.9);
          g.fillCircle(x, y, 8); g.fillCircle(x - 6, y + 1, 6); g.fillCircle(x + 6, y + 1, 6);
          g.fillStyle(0x0b0410, A); g.fillCircle(x - 10, y - 2, 4);
          g.fillStyle(0xff2a44, A); g.fillCircle(x - 11.5, y - 3, 1.1);
          g.lineStyle(1.4, 0x0b0410, A);
          g.lineBetween(x - 4, y + 6, x - 4, y + 11); g.lineBetween(x + 4, y + 6, x + 4, y + 11);
        }
        // The lamp is failing.
        const horizon = H * 0.34;
        const on = Math.sin(t * 23) + Math.sin(t * 7.3) > 0.4;
        if (on) { g.fillStyle(0xff7a5a, A * 0.4); g.fillCircle(W * 0.86 + 5, horizon - 112, 16); }
        break;
      }
      default: {
        // The teacups spin far too fast and rattle on cracked saucers; red balloons drift up.
        for (let i = 0; i < 4; i++) {
          const x = W * (0.18 + i * 0.2) + Math.sin(t * 31 + i) * 1.5, y = H * 0.82 + Math.sin(t * 1.4 + i) * 6;
          const spin = Math.sin(t * 9 + i);
          g.fillStyle([0x5a0a24, 0x2a0a3a, 0x4a1a0a, 0x3a0a2a][i], A * 0.85);
          g.fillEllipse(x, y + 10, 54, 12);
          g.fillRect(x - 18, y - 12, 36, 22);
          g.fillEllipse(x, y - 12, 36, 10);
          g.lineStyle(2, 0x0b0206, A);
          g.lineBetween(x - 8, y - 12, x - 2, y + 8); g.lineBetween(x - 2, y + 8, x + 6, y - 2);
          g.lineStyle(3, 0xff3b55, A * 0.5);
          g.strokeCircle(x + 20 * spin, y - 2, 6);
        }
        for (let i = 0; i < 5; i++) {
          const p = (t * 0.07 + h01(i + 1200)) % 1;
          const x = h01(i + 1210) * W + Math.sin(t + i) * 12, y = H * (1.05 - p * 1.2);
          g.lineStyle(1, 0x5a1a2a, A * 0.7); g.lineBetween(x, y + 12, x + Math.sin(t * 2 + i) * 4, y + 34);
          g.fillStyle(0xd0102e, A * 0.85); g.fillEllipse(x, y, 16, 20);
          g.fillStyle(0xffffff, A * 0.4); g.fillCircle(x - 4, y - 5, 2.4);
        }
        break;
      }
    }
  }

  /** The frame every dream shares: purple mist banked up around the edges, always moving. */
  private paintMist(k: number): void {
    const g = this.mist;
    const { W, H } = this;
    const t = this.t;
    g.clear();
    if (k <= 0.01) return;
    // A nightmare's frame is the same mist gone the colour of a wound.
    const n = this.dread;
    const mistDeep = lerpColor(this.c(DRM.dreamMistDeep), this.c(DRM.dreadDeep), n);
    const mistTop = lerpColor(this.c(DRM.dreamMist), this.c(DRM.dread), n);
    for (let i = 0; i < 7; i++) {
      const w = 26;
      g.lineStyle(w, i < 3 ? mistDeep : mistTop, k * (0.32 - i * 0.04 + n * 0.06));
      g.strokeRect(i * 12 - 6, i * 12 - 6, W - i * 24 + 12, H - i * 24 + 12);
    }
    // Puffs rolling along all four edges.
    const per = 14;
    for (let side = 0; side < 4; side++) {
      for (let i = 0; i < per; i++) {
        const u = ((i / per) + t * 0.03 * (side % 2 ? 1 : -1) + 10) % 1;
        const r = 22 + 10 * Math.sin(t * 1.3 + i * 2.3 + side);
        const inset = 10 + 8 * Math.sin(t * 0.9 + i + side * 2);
        const x = side === 0 ? u * W : side === 1 ? W - inset : side === 2 ? (1 - u) * W : inset;
        const y = side === 0 ? inset : side === 1 ? u * H : side === 2 ? H - inset : (1 - u) * H;
        g.fillStyle(mistTop, k * 0.18);
        g.fillCircle(x, y, r);
      }
    }
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + t * 0.2;
      const x = W / 2 + Math.cos(a) * W * 0.46, y = H / 2 + Math.sin(a) * H * 0.44;
      star(this.mist, this.tint, x, y, 2.4, k * (0.5 + 0.5 * Math.sin(t * 3 + i)), DRM.pale, t + i);
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

  /**
   * One Sandmen round: a streak of gold sand from the muzzle to wherever it stopped, a pop of
   * grains at the end, and a muzzle spark. Hitscan, so the streak is the whole bullet.
   */
  sandShot(x1: number, y1: number, x2: number, y2: number, hit: boolean, depth = 8): void {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const grains = Array.from({ length: hit ? 7 : 4 }, () => ({
      a: ang + Math.PI + (Math.random() - 0.5) * 2.2, v: 20 + Math.random() * 46, r: 0.9 + Math.random() * 1.3,
    }));
    this.anim(depth, 200, (g, t) => {
      const a = 1 - t;
      // The streak races out and its tail catches up with it.
      const head = Math.min(1, t * 4), tail = Math.max(0, t * 4 - 0.6);
      const hx = x1 + (x2 - x1) * head, hy = y1 + (y2 - y1) * head;
      const tx = x1 + (x2 - x1) * Math.min(1, tail), ty = y1 + (y2 - y1) * Math.min(1, tail);
      g.lineStyle(3, this.tint(DRM.sandDeep), a * 0.55);
      g.lineBetween(tx, ty, hx, hy);
      g.lineStyle(1.4, this.tint(DRM.sand), a);
      g.lineBetween(tx, ty, hx, hy);
      if (t < 0.3) {
        g.fillStyle(this.tint(DRM.star), (0.3 - t) * 3);
        g.fillCircle(x1, y1, 4 * (1 - t));
      }
      if (head >= 1) {
        for (const s of grains) {
          const d = s.v * easeOut(t);
          g.fillStyle(this.tint(DRM.sand), a);
          g.fillCircle(x2 + Math.cos(s.a) * d, y2 + Math.sin(s.a) * d + t * t * 12, s.r);
        }
      }
    });
  }

  /** A dream pistol's round: a thick violet beam that hangs for a breath before it fades. */
  pistolShot(x1: number, y1: number, x2: number, y2: number, depth = 8): void {
    this.anim(depth, 260, (g, t) => {
      const a = 1 - t;
      g.lineStyle(9 * a + 1, this.tint(DRM.pistol), a * 0.45);
      g.lineBetween(x1, y1, x2, y2);
      g.lineStyle(3.5 * a + 0.5, this.tint(DRM.pale), a);
      g.lineBetween(x1, y1, x2, y2);
      g.fillStyle(this.tint(DRM.star), a);
      g.fillCircle(x1, y1, 9 * a);
    });
  }

  /** The dream pistols' explosive round going off: a violet starburst with a white heart. */
  starBurst(x: number, y: number, radius: number, depth = 9): void {
    const rays = Array.from({ length: 10 }, (_, i) => (i / 10) * TAU + Math.random() * 0.3);
    this.anim(depth, 420, (g, t) => {
      const k = easeOut(t), a = 1 - t;
      g.fillStyle(this.tint(DRM.pistol), a * 0.35);
      g.fillCircle(x, y, radius * k);
      g.fillStyle(this.tint(DRM.pale), a * 0.8);
      g.fillCircle(x, y, radius * 0.35 * (1 - t * 0.6));
      g.lineStyle(3 * a + 0.5, this.tint(DRM.purple), a);
      g.strokeCircle(x, y, radius * k);
      for (const r of rays) {
        star(g, this.tint, x + Math.cos(r) * radius * k * 0.85, y + Math.sin(r) * radius * k * 0.85,
          4 * a + 1, a, DRM.star, r + t * 3);
      }
    });
  }

  /** Three curved slashes torn through the air, the way something with claws swipes. */
  clawSwipe(x: number, y: number, angle: number, reach: number, depth = 8): void {
    this.anim(depth, 320, (g, t) => {
      const a = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
      const sweep = easeOut(Math.min(1, t * 1.6));
      for (let i = -1; i <= 1; i++) {
        const r = reach * (0.62 + i * 0.12);
        const a0 = angle - 0.95, a1 = a0 + 1.9 * sweep;
        g.lineStyle(7 - Math.abs(i) * 2, this.tint(DRM.clawDeep), a * 0.6);
        g.beginPath(); g.arc(x, y, r, a0, a1, false); g.strokePath();
        g.lineStyle(2.6 - Math.abs(i) * 0.6, this.tint(DRM.claw), a);
        g.beginPath(); g.arc(x, y, r, a0, a1, false); g.strokePath();
        g.fillStyle(this.tint(DRM.leechTooth), a);
        g.fillCircle(x + Math.cos(a1) * r, y + Math.sin(a1) * r, 2);
      }
    });
  }

  /**
   * Delve: the world folding in around the sleeper — a spiral of night wound tight onto a
   * point, then the flash of arriving somewhere else.
   */
  delveSwirl(x: number, y: number, reverse: boolean, depth = 12): void {
    this.anim(depth, 560, (g, t) => {
      const k = reverse ? 1 - t : t;
      const a = 1 - Math.abs(t - 0.5) * 1.6;
      for (let arm = 0; arm < 3; arm++) {
        g.lineStyle(3, this.tint(arm === 1 ? DRM.purple : DRM.violet), a);
        g.beginPath();
        for (let s = 0; s <= 24; s++) {
          const u = s / 24;
          const r = (1 - u) * 140 * (1 - k * 0.85) + 6;
          const ang = arm * (TAU / 3) + u * 5 + k * 6;
          const px = x + Math.cos(ang) * r, py = y + Math.sin(ang) * r * 0.8;
          if (s === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
      }
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * TAU + k * 4;
        const r = 120 * (1 - k) + 10;
        star(g, this.tint, x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.8, 3, a, DRM.star, ang);
      }
      if (t > 0.7) {
        g.fillStyle(this.tint(DRM.white), (t - 0.7) * 2);
        g.fillCircle(x, y, 30 * (t - 0.7) * 4);
      }
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
 * It carries the Sandmen — two little hourglass revolvers, one per hand — and in somebody
 * else's dream it carries the dream pistols instead. `setGuns` picks which, `kick` bucks one
 * of them, and the guns are painted on the extras layer so they sit over the ball hands that
 * hold them. "Asleep on its feet" is colour and silhouette (the rig dims, the cap droops).
 */
export class DreamAvatar extends BaseAvatar {
  protected guns: 'sandmen' | 'pistols' | null = 'sandmen';
  protected gunKick = [0, 0];
  protected drowsy = 0;
  private drowsyTarget = 0;
  protected swing = 0;
  private swingTarget = 0;
  /** The nightcap's tip lags the body on its own spring, so walking makes it flop. */
  private capAng = -Math.PI / 2;
  private capVel = 0;
  /** Mastery: the dreams caught in the dreamcatcher on its back, each 0–1 through digestion. */
  protected beads: { bad: boolean; k: number }[] = [];
  /** Mastery: 0–1 how far the music box is wound, or -1 when there is none in hand. */
  protected winding = -1;

  /** Skins (which must extend this class so the kit can still drive the guns) pass their own spec. */
  constructor(scene: Phaser.Scene, tint: DreamColorFn, depth = 6, spec: AvatarSpec = DREAM_AVATAR) {
    super(scene, tint, depth, spec);
  }

  /** The owner is inside their own dream. Only a skin that transforms there listens. */
  setDreaming(_on: boolean): void {}

  /** 0–1 — how close this character is to falling asleep itself. */
  setDrowsy(v: number): void { this.drowsyTarget = Phaser.Math.Clamp(v, 0, 1); }
  /** 0–1 how worked-up the dreamer is — the glow and the cap swell with it. */
  setSwing(v: number): void { this.swingTarget = Phaser.Math.Clamp(v, 0, 1); }

  /** Mastery: the dreams sitting in the dreamcatcher, and how far through digesting each is. */
  setCatcher(beads: { bad: boolean; k: number }[]): void { this.beads = beads; }
  /** Mastery: the music box being wound in the right hand (0–1), or -1 for none. */
  setWinding(k: number): void { this.winding = k; }

  /** Which pair of guns is in the hands. */
  setGuns(mode: 'sandmen' | 'pistols' | null): void { this.guns = mode; }

  /** Buck one gun (0 = left hand, 1 = right). Decays on its own. */
  kick(side: 0 | 1, amount = 1): void { this.gunKick[side] = Math.min(1.4, this.gunKick[side] + amount); }

  /** World position of a gun's muzzle — where a shot has to start from. */
  muzzle(side: 0 | 1): { x: number; y: number } {
    const len = this.guns === 'pistols' ? 26 : 15;
    return { x: this.armX[side] + Math.cos(this.facing) * len, y: this.armY[side] + Math.sin(this.facing) * len };
  }

  update(delta: number, x: number, y: number, alpha: number): void {
    const k = Math.min(1, delta / 170);
    this.drowsy += (this.drowsyTarget - this.drowsy) * k;
    this.swing += (this.swingTarget - this.swing) * k;

    // Cap spring: pulled toward straight-up, kicked sideways by the swing.
    const rest = -Math.PI / 2 + Math.sin(this.t * 2.2) * 0.12 + this.swing * Math.sin(this.t * 7) * 0.5;
    this.capVel += (rest - this.capAng) * 0.24 - this.capVel * 0.16;
    this.capAng += this.capVel * Math.min(2, delta / 16.67);
    const decay = Math.min(1, delta / 120);
    this.gunKick[0] -= this.gunKick[0] * decay;
    this.gunKick[1] -= this.gunKick[1] * decay;

    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 14.5 : 10);
      glow.setFillStyle(this.tint(on ? DRM.wish : DRM.violet), on ? 0.32 : 0.26);
    });
    this.forEachHandLayer(1, (core) => core.setFillStyle(this.tint(on ? DRM.purple : DRM.blue), 0.9));
    // Starlit eyes on a mastered dreamer.
    this.setEyeWhite(on ? DRM.star : DRM.pale);
  }

  /**
   * A constellation stitched across the lower body — the body is a piece of night sky, so it
   * carries stars. Mastered, the lines between them light up gold and the stars swell.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const m = this.mastered;
    const dim = 1 - this.drowsy * 0.4;
    const pts: [number, number][] = [[-11, 5], [-5, 10], [2, 7], [8, 12], [12, 4]];
    g.lineStyle(m ? 1.2 : 0.8, this.tint(m ? DRM.wish : DRM.sky), alpha * (m ? 0.8 : 0.45) * dim);
    g.beginPath();
    g.moveTo(x + pts[0][0], y + pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(x + pts[i][0], y + pts[i][1]);
    g.strokePath();
    for (let i = 0; i < pts.length; i++) {
      const tw = 0.6 + 0.4 * Math.sin(this.t * 2.6 + i * 1.9);
      star(g, this.tint, x + pts[i][0], y + pts[i][1], (m ? 3.2 : 2.2) * (i === 2 ? 1.3 : 1),
        alpha * tw * dim, m ? DRM.star : DRM.pale, this.t * 0.5 + i);
    }
    // A sliver of moon tucked on the shoulder.
    g.fillStyle(this.tint(DRM.star), alpha * 0.75 * dim);
    g.fillCircle(x + 12, y - 11, 3.2);
    g.fillStyle(this.tint(DRM.deep), alpha * 0.9);
    g.fillCircle(x + 13.4, y - 11.8, 2.8);
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
    // Mastery: a big dreamcatcher slung on its back, under the body — whatever it has caught
    // sits in the web until it is digested.
    if (this.mastered) this.drawCatcher(g, x, y, alpha);
    // Stars turning in the glow — the ambient cosmic tell.
    for (let i = 0; i < 5; i++) {
      const ang = this.t * (0.5 + this.swing) + (i / 5) * TAU;
      const d = 22 + Math.sin(this.t * 1.6 + i) * 4;
      star(g, this.tint, x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.6,
        1.6, alpha * 0.55, DRM.star, ang * 2);
    }
  }

  /**
   * The Dreamcatcher: a willow hoop wound in gold, a web of eight spokes and three rings with a
   * moonstone at its heart, and feathers on beaded strings that swing as it walks. Slung behind,
   * so it sits on the side away from the aim.
   */
  private drawCatcher(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const back = this.facing + Math.PI;
    const cx = x + Math.cos(back) * 15;
    const cy = y - 8 + Math.sin(back) * 9 + Math.sin(this.t * 2.4) * 1.2;
    const R = 19;
    const c = (k: number) => this.tint(k);
    g.fillStyle(c(DRM.wish), alpha * 0.14);
    g.fillCircle(cx, cy, R + 7);
    g.fillStyle(c(DRM.night), alpha * 0.55);
    g.fillCircle(cx, cy, R);
    // Feathers first, hanging below the hoop, swinging on their strings.
    for (let i = -1; i <= 1; i++) {
      const sw = Math.sin(this.t * 2.6 + i * 1.3) * 0.25 + this.swing * Math.sin(this.t * 7 + i) * 0.3;
      const sx = cx + i * 10, sy = cy + R - 2;
      const len = 13 - Math.abs(i) * 3;
      const ex = sx + Math.sin(sw) * len, ey = sy + Math.cos(sw) * len;
      g.lineStyle(0.8, c(DRM.web), alpha * 0.8);
      g.lineBetween(sx, sy, ex, ey);
      g.fillStyle(c(DRM.wish), alpha);
      g.fillCircle(sx + (ex - sx) * 0.45, sy + (ey - sy) * 0.45, 1.5);
      const fa = Math.PI / 2 + sw * -1;
      const fx = ex + Math.cos(fa) * 6, fy = ey + Math.sin(fa) * 6;
      g.fillStyle(c(DRM.wool), alpha * 0.95);
      g.fillEllipse(fx, fy, 5, 11);
      g.lineStyle(0.8, c(DRM.woolShade), alpha);
      g.lineBetween(ex, ey, fx + Math.cos(fa) * 5, fy + Math.sin(fa) * 5);
    }
    // The web.
    g.lineStyle(0.9, c(DRM.web), alpha * 0.75);
    const spokes = 8;
    for (let i = 0; i < spokes; i++) {
      const ang = (i / spokes) * TAU + 0.2;
      g.lineBetween(cx, cy, cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
    }
    for (const rr of [0.35, 0.6, 0.85]) {
      g.beginPath();
      for (let i = 0; i <= spokes; i++) {
        const ang = (i / spokes) * TAU + 0.2 + rr * 0.6;
        const px = cx + Math.cos(ang) * R * rr, py = cy + Math.sin(ang) * R * rr;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
    }
    // The hoop, wound in gold thread.
    g.lineStyle(3.4, c(DRM.hoop), alpha);
    g.strokeCircle(cx, cy, R);
    g.lineStyle(1, c(DRM.wish), alpha * 0.9);
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * TAU;
      g.lineBetween(cx + Math.cos(ang) * (R - 1.6), cy + Math.sin(ang) * (R - 1.6),
        cx + Math.cos(ang + 0.18) * (R + 1.6), cy + Math.sin(ang + 0.18) * (R + 1.6));
    }
    star(g, this.tint, cx, cy, 3, alpha, DRM.star, this.t);
    // Caught dreams, sitting in the web and swelling as they digest.
    const slots = this.beads.length;
    for (let i = 0; i < slots; i++) {
      const b = this.beads[i];
      const ang = (i / Math.max(1, slots)) * TAU + this.t * 0.6;
      const d = slots === 1 ? 0 : R * 0.52;
      const pulse = 1 + 0.25 * Math.sin(this.t * (6 + b.k * 10) + i);
      dreamOrb(g, this.tint, cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, b.bad, this.t, alpha, (2.4 + b.k * 2) * pulse);
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
    const m = this.mastered;
    g.fillStyle(this.tint(DRM.deep), alpha * 0.95);
    g.fillTriangle(x - 12, crownY, x + 12, crownY, tipX, tipY);
    g.fillStyle(this.tint(m ? DRM.violet : DRM.purple), alpha * 0.9);
    g.fillTriangle(x - 8, crownY - 1, x + 6, crownY - 1, tipX, tipY);
    // A stitched seam up the cone.
    g.lineStyle(1, this.tint(m ? DRM.wish : DRM.pale), alpha * (m ? 0.85 : 0.35));
    g.lineBetween(x - 1, crownY - 1, tipX, tipY);
    // Stars sewn into the cap.
    for (let i = 1; i <= 2; i++) {
      const f = i / 3;
      star(g, this.tint, x + (tipX - x) * f, crownY + (tipY - crownY) * f, 2.2, alpha * 0.9, DRM.star, this.t + i);
    }
    g.fillStyle(this.tint(m ? DRM.wish : DRM.pale), alpha);
    g.fillRoundedRect(x - 13, crownY - 4, 26, 6, 3);
    g.fillStyle(this.tint(m ? DRM.wishDeep : DRM.woolShade), alpha * 0.6);
    g.fillRect(x - 13, crownY, 26, 2);
    // Little wool tufts along the brim.
    for (let i = 0; i < 5; i++) {
      g.fillStyle(this.tint(m ? DRM.star : DRM.wool), alpha * 0.9);
      g.fillCircle(x - 10 + i * 5, crownY - 3.5, 1.6);
    }
    if (m) {
      // Mastered: the pompom is a blazing star rather than a ball of wool.
      star(g, this.tint, tipX, tipY, 9 + Math.sin(this.t * 4) * 1.2, alpha, DRM.wish, this.t * 1.5);
      g.fillStyle(this.tint(DRM.white), alpha);
      g.fillCircle(tipX, tipY, 2.4);
    } else {
      g.fillStyle(this.tint(DRM.star), alpha);
      g.fillCircle(tipX, tipY, 4);
      g.fillStyle(this.tint(DRM.white), alpha * 0.7);
      g.fillCircle(tipX - 1.2, tipY - 1.2, 1.6);
    }

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

    this.drawHeld(g, alpha);

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

  /** What is in the hands: the guns, and the mastery music box. Shared with skins. */
  protected drawHeld(g: Phaser.GameObjects.Graphics, alpha: number): void {
    // ── The guns, one in each ball hand, pointing where the eyes look ──
    if (this.guns) {
      for (const side of [0, 1] as const) {
        const flip = side === 0 ? -1 : 1;
        if (this.guns === 'pistols') {
          dreamPistol(g, this.tint, this.armX[side], this.armY[side], this.facing, alpha, this.gunKick[side], flip, this.t);
        } else {
          sandmenGun(g, this.tint, this.armX[side], this.armY[side], this.facing, alpha, this.gunKick[side], flip);
        }
      }
    }

    // ── Mastery: the music box, wound in the right hand ──
    if (this.winding >= 0) {
      const hx = this.armX[1], hy = this.armY[1] - 10;
      musicBox(g, this.tint, hx, hy, this.t, 0.15, this.t * (8 + this.winding * 14), alpha, 0.8);
      g.lineStyle(2.4, this.tint(DRM.night), alpha * 0.7);
      g.strokeCircle(hx, hy, 16);
      g.lineStyle(2, this.tint(this.winding >= 1 ? DRM.star : DRM.purple), alpha);
      g.beginPath();
      g.arc(hx, hy, 16, -Math.PI / 2, -Math.PI / 2 + this.winding * TAU, false);
      g.strokePath();
    }
  }
}
