import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Silence renders: the watcher rig (claw hands, tracking eyes,
 * a crown of eye-stalks craning over the head), the stealth/terror/possession auras, and every
 * one-shot effect the horror throws off.
 *
 * The generic halves — the tween-backed animation runner and the ball-hands-and-eyes character —
 * live in ElementVisuals.ts. What stays here is what makes Silence *Silence*: the hand.
 *
 * Every other element in this game attacks you with a thing — a bolt, a blade, a wave. Silence
 * attacks you with a *reach*. The stab is a lunge, Watch is a thing that sees you, Ritual hauls a
 * grabber up out of the floor, Feast closes teeth around you and Run is an arm that comes out of
 * the dark and takes you somewhere else. So the primitive is a jointed, hooked finger, and the
 * shape it builds — the splayed grasping hand — is in the burst, the ring, the trail, the crown
 * and the fog itself. Whatever Silence is doing, something is reaching for you.
 */

/** `(base) => displayed` — SkinsKit.silenceColor bound to one owner. */
export type SilenceColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const SILENCE = {
  /** The dark it hides in. */
  void: 0x05000a,
  pitch: 0x0a0010,
  bruise: 0x1a0022,
  plum: 0x2a1038,
  /** The colour it bleeds when it is seen. */
  violet: 0x442255,
  amethyst: 0x6622aa,
  orchid: 0x8844cc,
  lilac: 0xcc99ff,
  pale: 0xeeddff,
  white: 0xffffff,
  /** Things with edges: teeth, nails, bone. */
  bone: 0xddddcc,
  sclera: 0xddddee,
  /** Blood, and the ritual that spills it. */
  blood: 0xcc1133,
  gore: 0xff2233,
  rust: 0x881122,
  meat: 0x661122,
  /** The effigy. */
  burlap: 0xb49a6a,
  twine: 0x7d6440,
  /** What the blob spits. */
  bile: 0x7a8a66,
  bileHi: 0x9aaa88,
} as const;

export interface Pt { x: number; y: number }

// ── Path helpers ──────────────────────────────────────────────────────────

function fillPts(g: Phaser.GameObjects.Graphics, pts: Pt[]): void {
  if (pts.length < 3) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
}

function strokePts(g: Phaser.GameObjects.Graphics, pts: Pt[], close = false): void {
  if (pts.length < 2) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  if (close) g.closePath();
  g.strokePath();
}

// ── The primitive ─────────────────────────────────────────────────────────

/**
 * Silence's primitive: a **grasping finger** — two straight bones meeting at a swollen knuckle,
 * bending by `curl` at the joint, tapering to a hooked nail.
 *
 * The joint is the whole point. A smooth taper is a tendril (Shadow already owns those); a shape
 * that visibly *bends in the middle* is a finger, and a ring of them is a hand closing. It is the
 * difference between something touching you and something taking hold.
 */
export function clawFinger(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, angle: number,
  len: number, halfW: number, curl = 0.55,
): void {
  const knuckleAt = 0.46;
  const kx = cx + Math.cos(angle) * len * knuckleAt;
  const ky = cy + Math.sin(angle) * len * knuckleAt;
  const a2 = angle + curl;
  const tx = kx + Math.cos(a2) * len * (1 - knuckleAt);
  const ty = ky + Math.sin(a2) * len * (1 - knuckleAt);

  const n1x = -Math.sin(angle), n1y = Math.cos(angle);
  const n2x = -Math.sin(a2), n2y = Math.cos(a2);
  // Knuckle swells past the width of either bone — that bulge is what reads as a joint.
  const kw = halfW * 1.24;
  const tw = halfW * 0.34;

  fillPts(g, [
    { x: cx + n1x * halfW, y: cy + n1y * halfW },
    { x: kx + n1x * kw, y: ky + n1y * kw },
    { x: tx + n2x * tw, y: ty + n2y * tw },
    { x: tx - n2x * tw, y: ty - n2y * tw },
    { x: kx - n2x * kw, y: ky - n2y * kw },
    { x: cx - n1x * halfW, y: cy - n1y * halfW },
  ]);
  // Rounded fills at the root and the joint. Without them a ring of fingers reads as a
  // starburst of spikes instead of as knuckles.
  g.fillCircle(cx, cy, halfW * 0.95);
  g.fillCircle(kx, ky, kw * 0.86);
}

/**
 * The finger in four passes: a dropped shadow, the body, a lit edge down the outside of both
 * bones, and a bone-white hooked nail past the tip.
 *
 * The nail is what makes the shape frightening at gameplay zoom — a black finger against a black
 * arena is a smudge until something on the end of it catches the light.
 */
export function clawFingerLayered(
  g: Phaser.GameObjects.Graphics, tint: SilenceColorFn,
  cx: number, cy: number, angle: number, len: number, halfW: number,
  body: number, rim: number, alpha: number, curl = 0.55, nail = true,
): void {
  g.fillStyle(tint(SILENCE.void), alpha * 0.55);
  clawFinger(g, cx + 1.2, cy + 2, angle, len * 1.04, halfW * 1.1, curl);

  g.fillStyle(tint(body), alpha);
  clawFinger(g, cx, cy, angle, len, halfW, curl);

  // Lit edge: one thin stroke down the outside of the two bones.
  const knuckleAt = 0.46;
  const kx = cx + Math.cos(angle) * len * knuckleAt;
  const ky = cy + Math.sin(angle) * len * knuckleAt;
  const a2 = angle + curl;
  const tx = kx + Math.cos(a2) * len * (1 - knuckleAt);
  const ty = ky + Math.sin(a2) * len * (1 - knuckleAt);
  const off = halfW * 0.72;
  g.lineStyle(Math.max(0.8, halfW * 0.24), tint(rim), alpha * 0.75);
  strokePts(g, [
    { x: cx - Math.sin(angle) * off, y: cy + Math.cos(angle) * off },
    { x: kx - Math.sin(angle) * off * 1.2, y: ky + Math.cos(angle) * off * 1.2 },
    { x: tx - Math.sin(a2) * off * 0.3, y: ty + Math.cos(a2) * off * 0.3 },
  ]);

  if (!nail) return;
  // The hook: a small curved talon carrying on past the fingertip.
  const a3 = a2 + curl * 0.8;
  const nx = tx + Math.cos(a3) * halfW * 2.1;
  const ny = ty + Math.sin(a3) * halfW * 2.1;
  g.fillStyle(tint(SILENCE.bone), alpha * 0.95);
  fillPts(g, [
    { x: tx - Math.sin(a2) * halfW * 0.36, y: ty + Math.cos(a2) * halfW * 0.36 },
    { x: nx, y: ny },
    { x: tx + Math.sin(a2) * halfW * 0.36, y: ty - Math.cos(a2) * halfW * 0.36 },
  ]);
}

// ── Element shapes ────────────────────────────────────────────────────────

/**
 * A whole grasping hand: four fingers and an opposed thumb off a palm, `spread` wide and curled
 * by `curl`. `curl` near 0 is an open hand reaching; near 1 it is a fist closing on something.
 *
 * This is the shape Silence says everything with — the grabber's arm ends in one, the Run arm is
 * one, the blob's rim bristles with them, and the character wears two.
 */
export function graspHand(
  g: Phaser.GameObjects.Graphics, tint: SilenceColorFn,
  cx: number, cy: number, angle: number, size: number,
  body: number, rim: number, alpha: number, spread = 0.42, curl = 0.5,
): void {
  // Palm first, so the finger roots disappear into it.
  g.fillStyle(tint(SILENCE.void), alpha * 0.5);
  g.fillEllipse(cx + 1, cy + 2, size * 1.25, size * 1.05);
  g.fillStyle(tint(body), alpha);
  g.fillEllipse(cx, cy, size * 1.15, size * 0.95);

  for (let i = 0; i < 4; i++) {
    const a = angle + (i - 1.5) * spread;
    // The middle fingers are longest — a hand with four equal fingers reads as a rake.
    const l = size * (1.5 + 0.42 * Math.sin((i + 0.5) / 4 * Math.PI));
    const rx = cx + Math.cos(a) * size * 0.5;
    const ry = cy + Math.sin(a) * size * 0.5;
    clawFingerLayered(g, tint, rx, ry, a, l, size * 0.2, body, rim, alpha, curl);
  }
  // Thumb: shorter, hung off the side, curling the other way.
  const ta = angle - spread * 2.4;
  clawFingerLayered(g, tint,
    cx + Math.cos(ta) * size * 0.55, cy + Math.sin(ta) * size * 0.55,
    ta, size * 1.05, size * 0.24, body, rim, alpha, -curl * 0.9);
}

/**
 * An eye: sclera, iris, pupil and a lid that closes as `open` falls to 0.
 *
 * Silence's second shape. Watchers, seekers, boggle eyes, the blob's hide and the crown of the
 * character are all this, and `open` is what carries the mood — the same eye narrowed reads as
 * suspicion and shut reads as a thing pretending not to be there.
 */
export function silenceEye(
  g: Phaser.GameObjects.Graphics, tint: SilenceColorFn,
  cx: number, cy: number, angle: number, r: number,
  look: number, open: number, iris: number, alpha: number,
): void {
  const k = Phaser.Math.Clamp(open, 0, 1);
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const to = (lx: number, ly: number): Pt => ({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos });

  // Socket — a dark ring, so the white does not float on a light background.
  g.fillStyle(tint(SILENCE.void), alpha * 0.75);
  const sock: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = (i / 16) * TAU;
    sock.push(to(Math.cos(t) * r * 1.28, Math.sin(t) * r * (0.72 * k + 0.16)));
  }
  fillPts(g, sock);

  if (k <= 0.04) {
    // Shut: a single crease where the eye was.
    g.lineStyle(Math.max(0.9, r * 0.16), tint(SILENCE.pitch), alpha);
    strokePts(g, [to(-r, 0), to(r, 0)]);
    return;
  }

  const white: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = (i / 16) * TAU;
    white.push(to(Math.cos(t) * r, Math.sin(t) * r * 0.66 * k));
  }
  g.fillStyle(tint(SILENCE.sclera), alpha);
  fillPts(g, white);

  // The iris slides toward whatever it is looking at.
  const px = to(look * r * 0.42, 0);
  g.fillStyle(tint(iris), alpha);
  g.fillCircle(px.x, px.y, r * 0.42 * (0.55 + 0.45 * k));
  g.fillStyle(tint(SILENCE.void), alpha);
  g.fillCircle(px.x, px.y, r * 0.2 * (0.55 + 0.45 * k));
  // Specular, off-centre — dead centre reads as a bead.
  g.fillStyle(tint(SILENCE.white), alpha * 0.8);
  const hl = to(look * r * 0.42 - r * 0.16, -r * 0.2 * k);
  g.fillCircle(hl.x, hl.y, r * 0.13);
}

/** A ring of inward-pointing teeth — the feast circle, the blob's maw, the maze's chewed walls. */
export function toothRing(
  g: Phaser.GameObjects.Graphics, tint: SilenceColorFn,
  cx: number, cy: number, radius: number, count: number,
  bite: number, alpha: number, gum: number = SILENCE.meat,
): void {
  g.lineStyle(Math.max(1.4, radius * 0.03), tint(gum), alpha * 0.85);
  g.strokeCircle(cx, cy, radius);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU;
    // Alternating long and short teeth, and the whole set slides inward as `bite` closes.
    const long = i % 2 === 0;
    const l = radius * (long ? 0.24 : 0.16) * (0.7 + bite * 0.7);
    const w = radius * (long ? 0.055 : 0.04);
    const bx = cx + Math.cos(a) * radius * (1 - bite * 0.16);
    const by = cy + Math.sin(a) * radius * (1 - bite * 0.16);
    const px = -Math.sin(a) * w, py = Math.cos(a) * w;
    g.fillStyle(tint(SILENCE.void), alpha * 0.5);
    fillPts(g, [
      { x: bx - px + 1, y: by - py + 1.6 }, { x: bx + px + 1, y: by + py + 1.6 },
      { x: bx - Math.cos(a) * l + 1, y: by - Math.sin(a) * l + 1.6 },
    ]);
    g.fillStyle(tint(SILENCE.bone), alpha * 0.95);
    fillPts(g, [
      { x: bx - px, y: by - py }, { x: bx + px, y: by + py },
      { x: bx - Math.cos(a) * l, y: by - Math.sin(a) * l },
    ]);
  }
}

/**
 * A bank of fog: overlapping soft lobes that boil on their own phases, with fingers of it
 * feeling forward along `angle`.
 *
 * The border fog is where Silence lives, so it cannot be a flat rectangle of black — it has to
 * look like it is coming for you slowly.
 */
export function fogBank(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, radius: number, seed: number, t: number,
  color: number, alpha: number, lobes = 6,
): void {
  g.fillStyle(color, alpha);
  for (let i = 0; i < lobes; i++) {
    const a = seed + (i / lobes) * TAU + t * 0.22;
    const d = radius * (0.28 + 0.34 * Math.abs(Math.sin(seed * 3 + i * 2.1)));
    const r = radius * (0.5 + 0.34 * Math.abs(Math.sin(seed + i * 1.7 + t * 0.8)));
    g.fillCircle(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, r);
  }
}

/** A splatter of blood: irregular blobs with a couple of drips hanging off the low side. */
export function bloodSplat(
  g: Phaser.GameObjects.Graphics, tint: SilenceColorFn,
  cx: number, cy: number, radius: number, seed: number, alpha: number,
): void {
  g.fillStyle(tint(SILENCE.rust), alpha * 0.8);
  for (let i = 0; i < 5; i++) {
    const a = seed + i * 2.399;
    const d = radius * 0.55 * Math.abs(Math.sin(seed + i * 1.3));
    g.fillCircle(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, radius * (0.3 + 0.4 * Math.abs(Math.cos(seed + i))));
  }
  g.fillStyle(tint(SILENCE.blood), alpha);
  g.fillCircle(cx, cy, radius * 0.62);
  for (let i = 0; i < 2; i++) {
    const a = seed * 2 + i * 2.7;
    const d = radius * (0.7 + 0.5 * Math.abs(Math.sin(seed + i)));
    g.fillCircle(cx + Math.cos(a) * d, cy + Math.sin(a) * d + radius * 0.3, radius * 0.22);
  }
}

// ── SilenceFx ─────────────────────────────────────────────────────────────

export interface SilenceRuptureOpts {
  /** Claws thrown clear. Defaults to radius/8. */
  claws?: number;
  /** Concentric grasp rings. Defaults to 2. */
  rings?: number;
  duration?: number;
  depth?: number;
  color?: number;
  /** Leave a blood mark on the floor. Default true. */
  mark?: boolean;
  /** Gore rather than shadow — the ritual, the grabber's catch, the blob's bite. */
  bloody?: boolean;
}

/**
 * One-shot Silence effects. Cheap to construct — build one per owner and hand it that owner's
 * colour mapper.
 */
export class SilenceFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: SilenceColorFn = (c) => c) {
    super(scene, tint);
  }

  // `color: number` is spelled out on every signature below: without it TypeScript infers the
  // literal type of the SILENCE default and refuses every other palette entry at the call site.

  /** Blown-out core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 9, color: number = SILENCE.orchid): void {
    this.flashIn(x, y, radius, SILENCE.pale, color, depth);
  }

  /**
   * A ring of fingers closing on a point — Silence's answer to the expanding circle.
   *
   * The finger count scales with the radius, because a big blast drawn with eight fingers reads
   * as an octagon rather than as a cage.
   */
  graspRing(
    x: number, y: number, from: number, to: number, color: number,
    duration = 460, depth = 8, closing = false,
  ): void {
    const n = Phaser.Math.Clamp(Math.round(to / 9), 7, 26);
    const spin = Math.random() * TAU;
    const jitter = Array.from({ length: n }, () => 0.7 + Math.random() * 0.6);
    this.anim(depth, duration, (g, t) => {
      const r = from + (to - from) * easeOut(t);
      const a = (1 - t) * 0.92;
      // Closing rings point inward and curl shut; opening rings point out and splay.
      const curl = closing ? 0.3 + t * 0.9 : 0.75 - t * 0.5;
      for (let i = 0; i < n; i++) {
        const ang = spin + (i / n) * TAU;
        const face = closing ? ang + Math.PI : ang;
        clawFingerLayered(g, this.tint,
          x + Math.cos(ang) * r, y + Math.sin(ang) * r, face,
          to * 0.3 * jitter[i] * (closing ? 1 : 1 - t * 0.35), Math.max(1.2, to * 0.055),
          color, SILENCE.orchid, a, curl * (i % 2 === 0 ? 1 : -1));
      }
    });
  }

  /** Fingers flung out of an impact, tumbling and fading. */
  claws(
    x: number, y: number, count: number,
    o: { speed?: number; spread?: number; angle?: number; size?: number; life?: number; depth?: number; color?: number } = {},
  ): void {
    const speed = o.speed ?? 220;
    const spread = o.spread ?? Math.PI;
    const baseAngle = o.angle ?? 0;
    const size = o.size ?? 16;
    const life = o.life ?? 620;
    const depth = o.depth ?? 9;
    const color = o.color ?? SILENCE.pitch;

    const parts = Array.from({ length: count }, () => ({
      a: baseAngle + (Math.random() - 0.5) * spread * 2,
      v: speed * (0.4 + Math.random()),
      s: size * (0.55 + Math.random() * 0.9),
      spin: (Math.random() - 0.5) * 9,
      curl: (Math.random() - 0.5) * 1.6,
      delay: Math.random() * 0.2,
    }));
    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        clawFingerLayered(g, this.tint,
          x + Math.cos(p.a) * d, y + Math.sin(p.a) * d,
          p.a + p.spin * lt, p.s * (1 - lt * 0.4), Math.max(1, p.s * 0.16),
          color, SILENCE.violet, 0.95 * (1 - lt * lt), p.curl);
      }
    });
  }

  /** Fine grave dust and fog lifting off something. */
  motes(
    x: number, y: number, count: number,
    o: { speed?: number; spread?: number; angle?: number; size?: number; life?: number; depth?: number; color?: number; drift?: number } = {},
  ): void {
    const speed = o.speed ?? 70;
    const spread = o.spread ?? Math.PI;
    const baseAngle = o.angle ?? 0;
    const size = o.size ?? 3;
    const life = o.life ?? 760;
    const depth = o.depth ?? 8;
    const color = o.color ?? SILENCE.plum;
    const drift = o.drift ?? -18;

    const parts = Array.from({ length: count }, () => ({
      a: baseAngle + (Math.random() - 0.5) * spread * 2,
      v: speed * (0.3 + Math.random()),
      s: size * (0.5 + Math.random()),
      seed: Math.random() * TAU,
      delay: Math.random() * 0.25,
    }));
    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        fogBank(g,
          x + Math.cos(p.a) * d + Math.sin(p.seed + lt * 4) * 5,
          y + Math.sin(p.a) * d + drift * lt,
          p.s * (1 + lt), p.seed, lt * 3, this.tint(color), 0.75 * (1 - lt * lt), 4);
      }
    });
  }

  /**
   * A full rupture: a blown core, grasp rings snapping shut, fingers thrown clear, fog, and a
   * stain left where it happened.
   */
  rupture(x: number, y: number, radius: number, o: SilenceRuptureOpts = {}): void {
    const bloody = o.bloody ?? false;
    const color = o.color ?? (bloody ? SILENCE.blood : SILENCE.plum);
    const bits = o.claws ?? Math.max(4, Math.round(radius / 8));
    const rings = o.rings ?? 2;
    const dur = o.duration ?? Math.round(360 + radius * 1.2);
    const depth = o.depth ?? 9;

    if (o.mark !== false) this.stain(x, y, radius * 0.55, depth - 6, bloody);
    this.flash(x, y, radius * 0.42, depth + 2, color);
    for (let i = 0; i < rings; i++) {
      this.scene.time.delayedCall(i * 85, () =>
        this.graspRing(x, y, radius * 0.22, radius * (1 + i * 0.28),
          i === 0 ? color : SILENCE.pale, Math.round(dur * (0.85 + i * 0.2)), depth, i === 0));
    }
    this.claws(x, y, bits, {
      speed: radius * 2.1, size: 12 + radius / 8, life: Math.round(dur * 1.3), depth: depth + 1,
      color: bloody ? SILENCE.rust : SILENCE.pitch,
    });
    this.motes(x, y, bits * 2, {
      speed: radius * 1.4, size: 3.4, life: Math.round(dur * 1.6), depth, color: bloody ? SILENCE.meat : SILENCE.bruise,
    });
  }

  /** What is left on the floor afterwards: a shadow that soaks in, or blood that does not. */
  stain(x: number, y: number, radius: number, depth = 3, bloody = false): void {
    const seed = Math.random() * TAU;
    this.anim(depth, bloody ? 2600 : 1500, (g, t) => {
      const a = (t < 0.06 ? t / 0.06 : 1 - (t - 0.06) / 0.94) * (bloody ? 0.8 : 0.5);
      if (bloody) {
        bloodSplat(g, this.tint, x, y, radius, seed, a);
        return;
      }
      fogBank(g, x, y, radius, seed, t * 2, this.tint(SILENCE.void), a * 0.7, 6);
      for (let i = 0; i < 5; i++) {
        const ang = seed + (i / 5) * TAU;
        clawFingerLayered(g, this.tint,
          x + Math.cos(ang) * radius * 0.4, y + Math.sin(ang) * radius * 0.4, ang,
          radius * 0.85, radius * 0.1, SILENCE.void, SILENCE.violet, a * 0.8, 0.5, false);
      }
    });
  }

  /**
   * A slash: a curved blade-swept arc through a fan, with parallel claw scores raked behind it.
   *
   * Three of these overlap on the stab and the striker's swipe, which is why the arc is bowed
   * rather than a straight bar — straight bars stack into a grid, curves stack into a rake.
   */
  slash(
    x: number, y: number, angle: number, range: number, halfArc: number,
    o: { color?: number; duration?: number; depth?: number; scores?: number; bloody?: boolean } = {},
  ): void {
    const color = o.color ?? SILENCE.pale;
    const dur = o.duration ?? 260;
    const depth = o.depth ?? 10;
    const scores = o.scores ?? 3;
    const bloody = o.bloody ?? false;
    this.anim(depth, dur, (g, t) => {
      const sweep = easeOut(t);
      const fade = 1 - easeIn(t);
      for (let s = 0; s < scores; s++) {
        const off = (s - (scores - 1) / 2) * (halfArc / Math.max(1, scores - 0.4));
        const arc: Pt[] = [];
        // The stroke is drawn as an arc that unzips along the swing rather than appearing whole.
        const from = angle - halfArc + off;
        const to = from + halfArc * 2 * sweep;
        for (let i = 0; i <= 10; i++) {
          const a = from + (to - from) * (i / 10);
          const rr = range * (0.55 + 0.45 * Math.sin((i / 10) * Math.PI));
          arc.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
        }
        g.lineStyle(5 - s * 0.8, this.tint(SILENCE.void), fade * 0.5);
        strokePts(g, arc.map((p) => ({ x: p.x + 1, y: p.y + 2 })));
        g.lineStyle(3.4 - s * 0.6, this.tint(bloody ? SILENCE.blood : color), fade * 0.95);
        strokePts(g, arc);
        // A bright inner filament, so the leading edge stays legible over a dark arena.
        g.lineStyle(1.2, this.tint(bloody ? SILENCE.gore : SILENCE.white), fade * 0.8);
        strokePts(g, arc);
      }
    });
  }

  /**
   * A dash: a comet of fog dragged along the lane with claw scores torn out of the floor beneath
   * it, and a burst of fingers left standing at the launch point.
   */
  lunge(
    x1: number, y1: number, x2: number, y2: number,
    o: { color?: number; duration?: number; depth?: number } = {},
  ): void {
    const color = o.color ?? SILENCE.plum;
    const dur = o.duration ?? 320;
    const depth = o.depth ?? 8;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const len = Math.hypot(x2 - x1, y2 - y1);
    const seeds = Array.from({ length: 7 }, () => Math.random());

    this.claws(x1, y1, 5, { angle: ang + Math.PI, spread: 0.9, speed: 130, size: 14, life: 380, depth, color: SILENCE.pitch });
    this.anim(depth, dur, (g, t) => {
      const fade = 1 - easeIn(t);
      // Tapered comet: fat at the tail, pinched at the head.
      for (let i = 0; i < 7; i++) {
        const u = (i + 0.5) / 7;
        const px = x1 + (x2 - x1) * u;
        const py = y1 + (y2 - y1) * u;
        fogBank(g, px, py, len * 0.09 * (1 - u * 0.55) * (1 + t), seeds[i] * TAU, t * 3,
          this.tint(color), fade * 0.55, 4);
      }
      // Scores raked down the lane behind the runner.
      for (let s = -1; s <= 1; s += 2) {
        const off = 9;
        const pts: Pt[] = [];
        for (let i = 0; i <= 6; i++) {
          const u = i / 6;
          pts.push({
            x: x1 + (x2 - x1) * u - Math.sin(ang) * off * s * (1 - u * 0.4),
            y: y1 + (y2 - y1) * u + Math.cos(ang) * off * s * (1 - u * 0.4),
          });
        }
        g.lineStyle(2.4, this.tint(SILENCE.violet), fade * 0.7);
        strokePts(g, pts);
      }
    });
  }

  /**
   * A wind-up: fog and fingers converging on a point with a tooth ring closing over it, so a
   * telegraphed strike reads as something being *cornered* rather than as a pause.
   */
  dread(
    x: number, y: number, radius: number, duration: number,
    o: { color?: number; depth?: number; follow?: () => { x: number; y: number } } = {},
  ): void {
    const color = o.color ?? SILENCE.blood;
    const depth = o.depth ?? 8;
    const follow = o.follow;
    this.anim(depth, duration, (g, t) => {
      const c = follow ? follow() : { x, y };
      const k = easeIn(t);
      toothRing(g, this.tint, c.x, c.y, radius * (1.5 - k * 0.5), 20, k, 0.35 + 0.55 * t, SILENCE.rust);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU - t * 2.4;
        const d = radius * (1.8 - k * 1.3);
        clawFingerLayered(g, this.tint,
          c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, a + Math.PI,
          radius * 0.4 * (0.5 + t), Math.max(1.2, radius * 0.055),
          SILENCE.pitch, color, 0.4 + 0.6 * t, 0.5);
      }
      g.fillStyle(this.tint(color), 0.1 + 0.5 * t * t);
      g.fillCircle(c.x, c.y, 3 + radius * 0.18 * t);
    });
  }

  /**
   * The ritual beam: a column dropping out of the ceiling onto a point, splitting into fingers on
   * the way down so what arrives is a hand rather than a spotlight.
   */
  beam(
    x: number, groundY: number, radius: number,
    o: { color?: number; depth?: number; duration?: number } = {},
  ): void {
    const color = o.color ?? SILENCE.blood;
    const depth = o.depth ?? 12;
    const dur = o.duration ?? 480;
    const offs = [-0.34, -0.11, 0.11, 0.34];
    this.anim(depth, dur, (g, t) => {
      const drop = Phaser.Math.Clamp(t / 0.35, 0, 1);
      const fade = t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
      const topY = groundY - 900;
      const headY = topY + (groundY - topY) * easeIn(drop);
      for (const o2 of offs) {
        const bx = x + o2 * radius * 1.4;
        g.fillStyle(this.tint(color), fade * 0.32);
        fillPts(g, [
          { x: bx - radius * 0.16, y: topY }, { x: bx + radius * 0.16, y: topY },
          { x: x + o2 * radius * 0.5 + radius * 0.06, y: headY },
          { x: x + o2 * radius * 0.5 - radius * 0.06, y: headY },
        ]);
      }
      g.fillStyle(this.tint(SILENCE.white), fade * 0.55);
      fillPts(g, [
        { x: x - radius * 0.09, y: topY }, { x: x + radius * 0.09, y: topY },
        { x: x + radius * 0.03, y: headY }, { x: x - radius * 0.03, y: headY },
      ]);
      // The splash where it lands.
      if (drop < 1) return;
      const s = (t - 0.35) / 0.65;
      g.fillStyle(this.tint(color), (1 - s) * 0.4);
      g.fillEllipse(x, groundY, radius * 2.2 * (0.4 + s), radius * 0.8 * (0.4 + s));
    });
  }

  /**
   * Something coming apart at the seams — the doll breaking, a watcher popping. Scraps tumble
   * out and a puff of whatever it was made of goes with them.
   */
  shred(
    x: number, y: number, count: number,
    o: { color?: number; life?: number; depth?: number; speed?: number; size?: number } = {},
  ): void {
    const color = o.color ?? SILENCE.burlap;
    const life = o.life ?? 520;
    const depth = o.depth ?? 10;
    const speed = o.speed ?? 150;
    const size = o.size ?? 5;
    const parts = Array.from({ length: count }, () => ({
      a: Math.random() * TAU,
      v: speed * (0.4 + Math.random()),
      s: size * (0.6 + Math.random() * 0.8),
      spin: (Math.random() - 0.5) * 12,
    }));
    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const d = p.v * easeOut(t) * (life / 1000);
        const px = x + Math.cos(p.a) * d;
        const py = y + Math.sin(p.a) * d + 30 * t * t;
        const r = p.spin * t;
        const cos = Math.cos(r), sin = Math.sin(r);
        const to = (lx: number, ly: number): Pt => ({ x: px + lx * cos - ly * sin, y: py + lx * sin + ly * cos });
        g.fillStyle(this.tint(color), 0.95 * (1 - t * t));
        // Torn, not rectangular — one corner pulled out of true.
        fillPts(g, [to(-p.s, -p.s * 0.7), to(p.s, -p.s), to(p.s * 0.8, p.s * 0.8), to(-p.s * 0.9, p.s * 0.6)]);
      }
    });
  }

  /** A burst of dead-channel static — hallucination, panic, and the moment the fog notices you. */
  staticBurst(x: number, y: number, radius: number, depth = 16, duration = 320): void {
    this.anim(depth, duration, (g, t) => {
      const fade = 1 - t;
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * TAU;
        const d = Math.random() * radius;
        g.fillStyle(this.tint(Math.random() > 0.5 ? SILENCE.white : SILENCE.void), fade * (0.2 + Math.random() * 0.6));
        g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 2 + Math.random() * 3, 2);
      }
    });
  }

  /** An eye opening somewhere it should not be, staring, then shutting again. */
  watchPulse(x: number, y: number, r: number, iris: number, depth = 10, duration = 900): void {
    const ang = Math.random() * 0.6 - 0.3;
    this.anim(depth, duration, (g, t) => {
      // Snaps open, holds the stare, then closes slowly. The hold is the unsettling part.
      const open = t < 0.15 ? t / 0.15 : t > 0.62 ? 1 - (t - 0.62) / 0.38 : 1;
      silenceEye(g, this.tint, x, y, ang, r, Math.sin(t * 9) * 0.8, open, iris, 0.95);
    });
  }

  // ── Per-frame painters ──────────────────────────────────────────────────
  // Drawn into a Graphics the caller already owns, because these ride on live gameplay state: a
  // watcher's maturity, how far a grabber's arm has reached, how close a wall is to being eaten.

  /** A watcher/seeker sitting in the fog, its eye reddening as it matures. */
  static drawWatcher(
    g: Phaser.GameObjects.Graphics, tint: SilenceColorFn,
    x: number, y: number, maturity: number, seeker: boolean, t: number, alpha: number, ownerSees: boolean,
  ): void {
    const r = 13;
    // Body: a knot of fog that never quite settles.
    fogBank(g, x, y, r * 1.2, x * 0.01, t, tint(SILENCE.void), alpha * 0.95, 5);
    g.fillStyle(tint(SILENCE.pitch), alpha);
    g.fillCircle(x, y, r * 0.85);

    if (seeker) {
      // Wings — two fans of clawed feathers that beat.
      const beat = Math.sin(t * 9) * 0.34;
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const a = side > 0 ? -0.2 + i * 0.34 + beat : Math.PI + 0.2 - i * 0.34 - beat;
          clawFingerLayered(g, tint, x + side * r * 0.5, y - 2, a,
            r * (1.5 - i * 0.22), r * 0.19, SILENCE.void, SILENCE.violet, alpha * 0.95, side * 0.5, false);
        }
      }
    }
    // The eye. Everyone sees a matured one glowing; only the owner sees a young one at all.
    const iris = maturity > 0.7 ? SILENCE.gore : maturity > 0.35 ? SILENCE.rust : SILENCE.amethyst;
    const open = ownerSees ? 1 : 0.3 + maturity * 0.7;
    silenceEye(g, tint, x, y - 1, 0, r * 0.62, Math.sin(t * 1.7) * 0.9, open, iris, alpha);
    if (maturity >= 1) {
      // Ripe: a halo of small fingers has grown out of it, ready to be ritualled.
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + t * 0.5;
        clawFingerLayered(g, tint, x + Math.cos(a) * r, y + Math.sin(a) * r, a,
          r * 0.7, r * 0.13, SILENCE.pitch, SILENCE.gore, alpha * 0.85, 0.7, false);
      }
    }
  }

  /** The grabber: a squatting mass of eyes with an arm it has not thrown yet. */
  static drawGrabber(
    g: Phaser.GameObjects.Graphics, tint: SilenceColorFn,
    x: number, y: number, seed: number, t: number, alpha: number, hunting: boolean,
  ): void {
    const r = 22;
    fogBank(g, x, y + 4, r * 1.35, seed, t, tint(SILENCE.void), alpha * 0.9, 7);
    g.fillStyle(tint(SILENCE.pitch), alpha);
    g.fillCircle(x, y, r * 0.86);
    // Eyes all over it, blinking out of phase — none of them agree on when to look at you.
    for (let i = 0; i < 6; i++) {
      const a = seed + (i / 6) * TAU + Math.sin(t * 0.4 + i) * 0.2;
      const d = r * (0.3 + 0.42 * Math.abs(Math.sin(seed * 2 + i * 1.9)));
      const open = hunting ? 1 : Phaser.Math.Clamp(Math.sin(t * 1.3 + i * 2.1) * 2, 0, 1);
      silenceEye(g, tint, x + Math.cos(a) * d, y + Math.sin(a) * d, a * 0.3,
        4 + (i % 3), Math.sin(t * 2 + i) * 0.9, open, hunting ? SILENCE.gore : SILENCE.rust, alpha);
    }
    // Folded fingers tucked under it, waiting.
    for (let i = 0; i < 4; i++) {
      const a = Math.PI * 0.25 + (i / 3) * Math.PI * 0.5;
      clawFingerLayered(g, tint, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.55, a,
        r * (hunting ? 0.9 : 0.55), r * 0.15, SILENCE.void, SILENCE.violet, alpha * 0.9,
        hunting ? 0.3 : 1.1);
    }
  }

  /**
   * A gangly arm running from a shoulder to a hand: a jointed limb that sags under its own
   * weight, with a grasping hand on the end of it.
   */
  static drawReachingArm(
    g: Phaser.GameObjects.Graphics, tint: SilenceColorFn,
    sx: number, sy: number, hx: number, hy: number, t: number, alpha: number, closed: number,
  ): void {
    const dx = hx - sx, dy = hy - sy;
    const len = Math.hypot(dx, dy) || 1;
    const ang = Math.atan2(dy, dx);
    // Elbow hangs below the straight line and wanders — a straight limb reads as a rope.
    const ex = sx + dx * 0.5 - Math.sin(ang) * (len * 0.16 + Math.sin(t * 3) * 8);
    const ey = sy + dy * 0.5 + Math.cos(ang) * (len * 0.16 + Math.sin(t * 3) * 8) + len * 0.06;

    const seg = (x1: number, y1: number, x2: number, y2: number, w1: number, w2: number): void => {
      const a = Math.atan2(y2 - y1, x2 - x1);
      const nx = -Math.sin(a), ny = Math.cos(a);
      fillPts(g, [
        { x: x1 + nx * w1, y: y1 + ny * w1 }, { x: x2 + nx * w2, y: y2 + ny * w2 },
        { x: x2 - nx * w2, y: y2 - ny * w2 }, { x: x1 - nx * w1, y: y1 - ny * w1 },
      ]);
    };
    // The limb tapers toward the hand, so the far end reads as reaching rather than as a pipe.
    g.fillStyle(tint(SILENCE.void), alpha * 0.5);
    seg(sx + 1, sy + 2, ex + 1, ey + 2, 6.5, 5.5);
    seg(ex + 1, ey + 2, hx + 1, hy + 2, 5.5, 4);
    g.fillStyle(tint(SILENCE.pitch), alpha);
    seg(sx, sy, ex, ey, 5.5, 4.6);
    seg(ex, ey, hx, hy, 4.6, 3.2);
    g.fillCircle(ex, ey, 5.2);
    g.lineStyle(1.2, tint(SILENCE.violet), alpha * 0.7);
    strokePts(g, [{ x: sx, y: sy }, { x: ex, y: ey }, { x: hx, y: hy }]);
    graspHand(g, tint, hx, hy, ang, 9, SILENCE.pitch, SILENCE.violet, alpha, 0.45, 0.2 + closed * 1.1);
  }

  /** The blob: the hallway horror, a wall of eyes and teeth with hands coming off its rim. */
  static drawBlob(
    g: Phaser.GameObjects.Graphics, tint: SilenceColorFn,
    x: number, y: number, radius: number, t: number, alpha: number,
  ): void {
    fogBank(g, x, y, radius * 1.25, 1.7, t, tint(SILENCE.void), alpha, 8);
    g.fillStyle(tint(SILENCE.void), alpha);
    g.fillCircle(x, y, radius * 0.9);
    // Hands pushing out of the leading edge.
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.42 + Math.sin(t * 2 + i) * 0.12;
      const reach = radius * (0.85 + 0.22 * Math.abs(Math.sin(t * 3 + i * 1.4)));
      graspHand(g, tint, x + Math.cos(a) * reach, y + Math.sin(a) * reach, a,
        radius * 0.15, SILENCE.pitch, SILENCE.violet, alpha, 0.4, 0.35);
    }
    // Mismatched eyes across the mass, all of them tracking forward.
    const eyes: Array<[number, number, number]> = [
      [-0.38, -0.34, 0.16], [0.3, -0.42, 0.13], [-0.05, -0.08, 0.21],
      [-0.5, 0.24, 0.13], [0.44, 0.16, 0.16], [0.1, 0.4, 0.11],
    ];
    for (const [ox, oy, er] of eyes) {
      silenceEye(g, tint, x + ox * radius, y + oy * radius, 0, er * radius,
        Math.sin(t * 1.2 + ox * 6) * 0.7, 1, SILENCE.gore, alpha);
    }
    // The maw across its underside, chewing.
    const chew = 0.5 + 0.5 * Math.sin(t * 5);
    g.fillStyle(tint(SILENCE.void), alpha);
    g.fillEllipse(x, y + radius * 0.6, radius * 0.95, radius * (0.22 + chew * 0.2));
    for (let i = 0; i < 8; i++) {
      const tx = x + (i / 7 - 0.5) * radius * 0.85;
      const h = radius * (0.1 + 0.06 * (i % 2)) * (0.6 + chew * 0.6);
      g.fillStyle(tint(SILENCE.bone), alpha);
      fillPts(g, [
        { x: tx - radius * 0.035, y: y + radius * 0.5 }, { x: tx + radius * 0.035, y: y + radius * 0.5 },
        { x: tx, y: y + radius * 0.5 + h },
      ]);
      fillPts(g, [
        { x: tx - radius * 0.035, y: y + radius * 0.72 }, { x: tx + radius * 0.035, y: y + radius * 0.72 },
        { x: tx, y: y + radius * 0.72 - h },
      ]);
    }
  }

  /** The effigy: a burlap sack body, stitched X eyes, and however many pins are still in it. */
  static drawDoll(
    g: Phaser.GameObjects.Graphics, tint: SilenceColorFn,
    x: number, y: number, health: number, t: number, alpha: number,
  ): void {
    const sway = Math.sin(t * 1.9) * 0.06;
    const cos = Math.cos(sway), sin = Math.sin(sway);
    const to = (lx: number, ly: number): Pt => ({ x: x + lx * cos - ly * sin, y: y + lx * sin + ly * cos });

    g.fillStyle(tint(SILENCE.void), alpha * 0.4);
    g.fillEllipse(x, y + 20, 26, 8);
    // Limbs: four stubby burlap tubes, stitched on.
    g.lineStyle(5, tint(SILENCE.burlap), alpha);
    strokePts(g, [to(-6, -2), to(-15, 6)]);
    strokePts(g, [to(6, -2), to(15, 6)]);
    strokePts(g, [to(-4, 12), to(-8, 20)]);
    strokePts(g, [to(4, 12), to(8, 20)]);
    // Body + head, sagging with the damage taken.
    const slump = (1 - health) * 3;
    g.fillStyle(tint(SILENCE.burlap), alpha);
    fillPts(g, [to(-8, -3 + slump), to(8, -3 + slump), to(7, 14), to(-7, 14)]);
    g.fillCircle(to(0, -10).x, to(0, -10).y, 8.5);
    // Seam down the middle and the twine round the neck.
    g.lineStyle(1, tint(SILENCE.twine), alpha * 0.9);
    strokePts(g, [to(0, -2), to(0, 13)]);
    for (let i = 0; i < 5; i++) strokePts(g, [to(-2, -1 + i * 3), to(2, 0.5 + i * 3)]);
    g.lineStyle(2, tint(SILENCE.twine), alpha);
    strokePts(g, [to(-7, -3), to(7, -3)]);
    // X eyes, sewn shut.
    g.lineStyle(1.6, tint(SILENCE.pitch), alpha);
    for (const ex of [-3.4, 3.4]) {
      strokePts(g, [to(ex - 2, -12), to(ex + 2, -8)]);
      strokePts(g, [to(ex + 2, -12), to(ex - 2, -8)]);
    }
    // Pins — the doll sheds them as it comes apart.
    const pins = Math.max(0, Math.round(health * 4));
    for (let i = 0; i < pins; i++) {
      const a = -1.2 + i * 0.7;
      const p1 = to(Math.cos(a) * 3, 2 + Math.sin(a) * 3);
      const p2 = to(Math.cos(a) * 13, 2 + Math.sin(a) * 13);
      g.lineStyle(1.4, tint(SILENCE.sclera), alpha);
      strokePts(g, [p1, p2]);
      g.fillStyle(tint(SILENCE.blood), alpha);
      g.fillCircle(p2.x, p2.y, 1.8);
    }
    if (health < 0.55) {
      // Split seams, leaking stuffing.
      g.lineStyle(1.4, tint(SILENCE.pitch), alpha * 0.9);
      strokePts(g, [to(-5, 3), to(-1, 7), to(-4, 11)]);
      g.fillStyle(tint(SILENCE.twine), alpha * 0.8);
      g.fillCircle(to(-6, 6).x, to(-6, 6).y, 2.2);
    }
  }

  /** The awakened host: something wearing a body, four limbs hauling it around. */
  static drawAwakened(
    g: Phaser.GameObjects.Graphics, tint: SilenceColorFn,
    x: number, y: number, facing: number, t: number, alpha: number,
  ): void {
    // Legs first, so they read as coming from behind the body.
    for (let i = 0; i < 4; i++) {
      const base = facing + Math.PI / 2 + (i - 1.5) * 0.9;
      const sway = Math.sin(t * 3.6 + i * 1.3) * 0.42;
      const a = base + sway;
      const kx = x + Math.cos(a) * 34;
      const ky = y + Math.sin(a) * 34 - 14;
      const tipA = a + Math.sin(t * 5 + i * 2) * 0.5 + 0.6;
      const tx = kx + Math.cos(tipA) * 40;
      const ty = ky + Math.sin(tipA) * 40 + 20;
      // Thigh, then a jointed shin ending in a claw planted on the floor.
      g.fillStyle(tint(SILENCE.void), alpha);
      const na = Math.atan2(ky - y, kx - x);
      const nx = -Math.sin(na) * 3.4, ny = Math.cos(na) * 3.4;
      fillPts(g, [{ x: x + nx, y: y + ny }, { x: kx + nx, y: ky + ny }, { x: kx - nx, y: ky - ny }, { x: x - nx, y: y - ny }]);
      g.fillCircle(kx, ky, 3.6);
      clawFingerLayered(g, tint, kx, ky, Math.atan2(ty - ky, tx - kx), 42, 3.2,
        SILENCE.void, SILENCE.amethyst, alpha, 0.28);
    }
    // The shell, cracked open down the middle with the dark showing through.
    g.fillStyle(tint(SILENCE.void), alpha * 0.5);
    g.fillCircle(x, y + 2, 22);
    const gap = 3 + Math.sin(t * 2.2) * 1.2;
    for (const side of [-1, 1]) {
      g.fillStyle(tint(SILENCE.bone), alpha * 0.85);
      const shell: Pt[] = [];
      for (let i = 0; i <= 10; i++) {
        const a = -Math.PI / 2 + side * (i / 10) * Math.PI;
        shell.push({ x: x + Math.cos(a) * 20 + side * gap, y: y + Math.sin(a) * 20 });
      }
      shell.push({ x: x + side * gap, y: y + 20 });
      fillPts(g, shell);
    }
    g.fillStyle(tint(SILENCE.void), alpha);
    g.fillEllipse(x, y, gap * 2.4, 38);
    // What is inside, looking out.
    silenceEye(g, tint, x, y - 3, 0, 6.5, Math.sin(t * 1.4) * 0.9, 1, SILENCE.lilac, alpha);
    for (let i = 0; i < 3; i++) {
      const ey = y + 6 + i * 5;
      silenceEye(g, tint, x + Math.sin(t * 2 + i) * 3, ey, 0, 2.6, 0, Phaser.Math.Clamp(Math.sin(t * 3 + i * 2) * 2, 0, 1), SILENCE.lilac, alpha * 0.9);
    }
  }

  /** One of the small things the awakened hauls up out of the floor. */
  static drawKin(
    g: Phaser.GameObjects.Graphics, tint: SilenceColorFn,
    x: number, y: number, facing: number, t: number, alpha: number, aimed: boolean,
  ): void {
    if (aimed) {
      g.fillStyle(tint(SILENCE.lilac), alpha * 0.28);
      g.fillCircle(x, y, 17);
    }
    // Spindly legs scuttling.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + Math.sin(t * 8 + i) * 0.3;
      clawFingerLayered(g, tint, x + Math.cos(a) * 4, y + Math.sin(a) * 4, a,
        11, 1.5, SILENCE.void, SILENCE.violet, alpha * 0.9, 0.9, false);
    }
    g.fillStyle(tint(SILENCE.void), alpha);
    g.fillCircle(x, y, 7.5);
    const look = Math.cos(facing) < 0 ? -0.8 : 0.8;
    silenceEye(g, tint, x - 2.6, y - 1, 0, 2.6, look, 1, SILENCE.sclera, alpha);
    silenceEye(g, tint, x + 2.6, y - 1, 0, 2.6, look, 1, SILENCE.sclera, alpha);
  }

  /** The corrupted clone: the enemy remade, faceless except for a grin. */
  static drawCorrupt(
    g: Phaser.GameObjects.Graphics, tint: SilenceColorFn,
    x: number, y: number, borrowed: number, t: number, alpha: number,
  ): void {
    g.fillStyle(tint(SILENCE.void), alpha * 0.45);
    g.fillEllipse(x, y + 20, 34, 10);
    // Silhouette of whoever it copied, but rendered in the dark and edged in their colour.
    g.fillStyle(tint(SILENCE.void), alpha);
    g.fillCircle(x, y, 20);
    g.lineStyle(2, borrowed, alpha * 0.8);
    g.strokeCircle(x, y, 20);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.5 + Math.sin(t * 2 + i) * 0.1;
      clawFingerLayered(g, tint, x + Math.cos(a) * 17, y + Math.sin(a) * 17, a,
        11, 2, SILENCE.void, SILENCE.violet, alpha * 0.85, 0.6, false);
    }
    // The grin: a crescent of teeth cut across the blank face.
    const w = 15;
    g.fillStyle(tint(SILENCE.bone), alpha);
    const grin: Pt[] = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      grin.push({ x: x - w + u * w * 2, y: y + 4 + Math.sin(u * Math.PI) * 6 });
    }
    for (let i = 8; i >= 0; i--) {
      const u = i / 8;
      grin.push({ x: x - w + u * w * 2, y: y + 4 + Math.sin(u * Math.PI) * 2.5 });
    }
    fillPts(g, grin);
    g.lineStyle(1, tint(SILENCE.void), alpha * 0.9);
    for (let i = 1; i < 6; i++) {
      const u = i / 6;
      strokePts(g, [
        { x: x - w + u * w * 2, y: y + 4 + Math.sin(u * Math.PI) * 2.5 },
        { x: x - w + u * w * 2, y: y + 4 + Math.sin(u * Math.PI) * 6 },
      ]);
    }
  }

  /** A boggle eye, out on its stalk, with the tether back to the body it came off. */
  static drawBoggleEye(
    g: Phaser.GameObjects.Graphics, tint: SilenceColorFn,
    hx: number, hy: number, ex: number, ey: number, t: number, alpha: number,
  ): void {
    // The tether is a nerve, not a rope: it sags and it twitches.
    const mx = (hx + ex) / 2 + Math.sin(t * 4) * 7;
    const my = (hy + ey) / 2 + Math.cos(t * 4.6) * 7;
    const pts: Pt[] = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
      pts.push({ x: a * hx + b * mx + c * ex, y: a * hy + b * my + c * ey });
    }
    g.lineStyle(4, tint(SILENCE.void), alpha * 0.6);
    strokePts(g, pts.map((p) => ({ x: p.x + 1, y: p.y + 1.6 })));
    g.lineStyle(2.6, tint(SILENCE.meat), alpha);
    strokePts(g, pts);
    silenceEye(g, tint, ex, ey, Math.atan2(ey - hy, ex - hx), 7.5,
      Math.sin(t * 3) * 0.9, 1, SILENCE.gore, alpha);
  }

  /** A glob of whatever the blob has in its throat, in flight. */
  static drawSpit(
    g: Phaser.GameObjects.Graphics, tint: SilenceColorFn,
    x: number, y: number, angle: number, t: number, alpha: number,
  ): void {
    // A trailing wake, so a slow glob still reads as travelling.
    for (let i = 3; i >= 1; i--) {
      g.fillStyle(tint(SILENCE.bile), alpha * 0.18 * (4 - i));
      g.fillCircle(x - Math.cos(angle) * i * 6, y - Math.sin(angle) * i * 6, 6 - i);
    }
    fogBank(g, x, y, 6.5, x * 0.02, t * 4, tint(SILENCE.bile), alpha, 5);
    g.fillStyle(tint(SILENCE.bileHi), alpha * 0.9);
    g.fillCircle(x - 1.6, y - 1.8, 2.2);
  }

  /** A pallid biter — one of the five that come for a hallucinating victim. */
  static drawMidget(
    g: Phaser.GameObjects.Graphics, tint: SilenceColorFn,
    x: number, y: number, angle: number, t: number, alpha: number,
  ): void {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const to = (lx: number, ly: number): Pt => ({ x: x + lx * cos - ly * sin, y: y + lx * sin + ly * cos });
    // Legs, out of phase so the pack does not march in step.
    for (let i = 0; i < 4; i++) {
      const a = angle + Math.PI / 2 + (i - 1.5) * 0.7 + Math.sin(t * 11 + i * 1.7) * 0.35;
      clawFingerLayered(g, tint, x, y, a, 11, 1.7, SILENCE.void, SILENCE.violet, alpha * 0.9, 0.7, false);
    }
    g.fillStyle(tint(SILENCE.void), alpha * 0.45);
    g.fillCircle(x + 1, y + 2, 9);
    g.fillStyle(tint(SILENCE.bone), alpha);
    g.fillCircle(x, y, 8.2);
    // All the teeth crammed onto the leading edge — it is basically a mouth with legs.
    const bite = 0.4 + 0.6 * Math.abs(Math.sin(t * 8));
    g.fillStyle(tint(SILENCE.void), alpha);
    fillPts(g, [to(2, -6), to(9, -3 * bite), to(9, 3 * bite), to(2, 6)]);
    g.fillStyle(tint(SILENCE.bone), alpha);
    for (let i = 0; i < 4; i++) {
      const ly = -5 + i * 3.3;
      fillPts(g, [to(3, ly), to(3, ly + 2), to(8.5, ly + 1 - 3 * bite)]);
      fillPts(g, [to(3, ly), to(3, ly + 2), to(8.5, ly + 1 + 3 * bite)]);
    }
    silenceEye(g, tint, to(-2, -3).x, to(-2, -3).y, angle, 2.4, 0.8, 1, SILENCE.gore, alpha);
    silenceEye(g, tint, to(-2, 3).x, to(-2, 3).y, angle, 2.4, 0.8, 1, SILENCE.gore, alpha);
  }

  /** The striker: what a Silence user becomes when the terror bar fills. */
  static drawStrikerAura(
    g: Phaser.GameObjects.Graphics, tint: SilenceColorFn,
    x: number, y: number, stored: number, t: number, alpha: number,
  ): void {
    // Deferred damage rides on the outside of the form as a swelling coat of gore.
    const k = Phaser.Math.Clamp(stored / 120, 0, 1);
    fogBank(g, x, y, 34 + k * 14, 0.9, t, tint(SILENCE.void), alpha * 0.5, 8);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + t * 0.7;
      const d = 26 + Math.sin(t * 4 + i) * 4;
      clawFingerLayered(g, tint, x + Math.cos(a) * d, y + Math.sin(a) * d, a,
        16 + k * 12, 2.6, SILENCE.void, k > 0.4 ? SILENCE.gore : SILENCE.amethyst,
        alpha * (0.55 + k * 0.4), 0.6);
    }
    if (k > 0.25) {
      // It is visibly holding blood in — and it is running out of room.
      for (let i = 0; i < 5; i++) {
        const a = t * 2 + (i / 5) * TAU;
        const d = 30 + Math.sin(t * 6 + i * 2) * 6;
        bloodSplat(g, tint, x + Math.cos(a) * d, y + Math.sin(a) * d, 3 + k * 4, i * 1.7, alpha * k);
      }
    }
  }
}

// ── SilenceAura ───────────────────────────────────────────────────────────

export type SilenceAuraStyle =
  | 'stealth'    // sinking into the fog — the stealth meter, made visible
  | 'terror'     // the terror bar, seen on the body rather than only in the HUD
  | 'grabbed'    // an arm has hold of you
  | 'silenced'   // your mouth has been taken
  | 'halluc'     // the static in your own eyes
  | 'allure'     // being pulled toward the claws against your will
  | 'possessed'; // something else is steering

/**
 * A persistent Silence effect riding on a fighter. One Graphics, driven by whoever owns it.
 *
 * The styles differ in *shape*, because several are up at once and a Silence match is already
 * dark: stealth dissolves you downward, terror climbs, a grab wraps, a silence clamps over the
 * face, hallucination scrambles, allure streams toward the source and possession splits open.
 */
export class SilenceAura {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private intensity = 1;
  private angle = 0;

  constructor(
    scene: Phaser.Scene,
    private tint: SilenceColorFn,
    private style: SilenceAuraStyle,
    private radius: number,
    depth = 4,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  /** Usually how far along the effect is — a meter fraction, or a remaining fraction. */
  setIntensity(v: number): void { this.intensity = v; }
  /** Facing, for the styles that have a direction. */
  setAngle(a: number): void { this.angle = a; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;
    const k = Phaser.Math.Clamp(this.intensity, 0, 1);
    const r = this.radius;
    const t = this.t;

    switch (this.style) {
      case 'stealth': {
        // Fog pooling round the feet and climbing — at full stealth the body is inside it.
        if (k <= 0.02) break;
        fogBank(g, x, y + r * (0.5 - k * 0.5), r * (1 + k * 0.5), 0.4, t,
          this.tint(SILENCE.void), alpha * 0.5 * k, 7);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + t * 0.4;
          const climb = r * (0.3 + k * 0.9) * (0.6 + 0.4 * Math.sin(t * 2 + i));
          clawFingerLayered(g, this.tint,
            x + Math.cos(a) * r * 0.85, y + r * 0.5, -Math.PI / 2 + Math.cos(a) * 0.5,
            climb, r * 0.09, SILENCE.void, SILENCE.violet, alpha * 0.7 * k, 0.35, false);
        }
        break;
      }
      case 'terror': {
        // Eyes opening around you as the bar fills — and at full they all look at you.
        const n = 1 + Math.floor(k * 5);
        for (let i = 0; i < n; i++) {
          const a = (i / 5) * TAU + t * 0.5;
          const d = r * (1.1 + 0.12 * Math.sin(t * 2 + i));
          const open = Phaser.Math.Clamp((k * 5 - i) * 1.5, 0, 1);
          silenceEye(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d, a + Math.PI / 2,
            4 + k * 3, Math.sin(t * 1.5 + i) * 0.9, open, k >= 1 ? SILENCE.gore : SILENCE.rust, alpha * 0.9);
        }
        if (k >= 1) {
          g.lineStyle(2, this.tint(SILENCE.gore), alpha * (0.4 + 0.3 * Math.sin(t * 8)));
          g.strokeCircle(x, y, r * 1.2);
        }
        break;
      }
      case 'grabbed': {
        // Fingers wrapped round the ribs, cinching — the shape of being held.
        for (let i = 0; i < 5; i++) {
          const a = this.angle + Math.PI + (i - 2) * 0.5;
          clawFingerLayered(g, this.tint,
            x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95, a + Math.PI,
            r * (0.9 + 0.12 * Math.sin(t * 9 + i)), r * 0.14,
            SILENCE.pitch, SILENCE.gore, alpha, 0.5 + 0.3 * Math.sin(t * 6));
        }
        break;
      }
      case 'silenced': {
        // A hand clamped over the mouth, its fingers twitching.
        const a = this.angle;
        graspHand(g, this.tint, x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, a + Math.PI,
          r * 0.42, SILENCE.pitch, SILENCE.violet, alpha * 0.95, 0.5,
          0.9 + 0.15 * Math.sin(t * 7));
        break;
      }
      case 'halluc': {
        // Torn static bands across the body, plus eyes that are not really there.
        for (let i = 0; i < 5; i++) {
          const by = y - r + ((t * 40 + i * 22) % (r * 2));
          g.fillStyle(this.tint(Math.random() > 0.5 ? SILENCE.pale : SILENCE.void), alpha * 0.28);
          g.fillRect(x - r, by, r * 2 * Math.random(), 2 + Math.random() * 3);
        }
        for (let i = 0; i < 3; i++) {
          const a = t * 1.1 + (i / 3) * TAU;
          silenceEye(g, this.tint, x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3, 0,
            4, Math.sin(t * 2 + i) * 0.9, Phaser.Math.Clamp(Math.sin(t * 1.7 + i * 2) * 2, 0, 1),
            SILENCE.lilac, alpha * 0.7);
        }
        break;
      }
      case 'allure': {
        // Streamers pulled off you toward whatever is calling — the direction is the tell.
        for (let i = 0; i < 6; i++) {
          const p = (t * 2.2 + i / 6) % 1;
          const a = this.angle + (i - 2.5) * 0.28;
          const d = r * (1.6 - p * 1.4);
          clawFingerLayered(g, this.tint,
            x + Math.cos(a) * d, y + Math.sin(a) * d, a,
            r * 0.7 * p, r * 0.1, SILENCE.pitch, SILENCE.gore, alpha * 0.9 * p, 0.4, false);
        }
        break;
      }
      case 'possessed': {
        // Split down the middle with something looking out, and hands on your shoulders.
        const gap = 2.5 + Math.sin(t * 3) * 1.4;
        g.fillStyle(this.tint(SILENCE.void), alpha * 0.9);
        g.fillEllipse(x, y, gap * 2.6, r * 1.7);
        silenceEye(g, this.tint, x, y - 2, 0, 5, Math.sin(t * 2) * 0.9, 1, SILENCE.lilac, alpha);
        for (const side of [-1, 1]) {
          graspHand(g, this.tint, x + side * r * 0.8, y - r * 0.4, side > 0 ? 0.5 : Math.PI - 0.5,
            r * 0.3, SILENCE.pitch, SILENCE.amethyst, alpha * 0.9, 0.4, 0.85);
        }
        break;
      }
    }
  }

  destroy(): void { this.g.destroy(); }
}

// ── SilenceAvatar ─────────────────────────────────────────────────────────

/** Concentric discs of one claw-fist, outermost first. The fingers are painted in drawExtras. */
const SILENCE_AVATAR: AvatarSpec = {
  hands: [
    { r: 11.5, color: SILENCE.void, alpha: 0.3 },
    { r: 7.2, color: SILENCE.pitch, alpha: 1 },
    { r: 4.4, color: SILENCE.plum, alpha: 1 },
    { r: 1.8, color: SILENCE.violet, alpha: 1, ox: -2, oy: -2.2 },
  ],
  eyeWhite: SILENCE.sclera,
  eyePupil: SILENCE.void,
  // Heavy, deliberate hands — they lag hard and smear a lot, like something dragging its arms.
  squash: { div: 12, x: 0.6, y: 0.34 },
};

/**
 * The Silence character rig: two clawed hands, a pair of tracking eyes, and a crown of eye-stalks
 * craning up off the head, each one blinking and looking on its own schedule.
 *
 * The crown is the idea. Silence's whole kit is about who can see whom — you are invisible in the
 * fog, you plant watchers, you backstab things that are facing the wrong way, and the mastery
 * pays you for being unobserved. So the character has to be visibly *more eyes than body*: a
 * thing that is looking at you from several places at once, before it has cast anything.
 */
export class SilenceAvatar extends BaseAvatar {
  private fx: SilenceFx;
  /** Violet for the player, gore for the NPC, so two Silence fighters never blur together. */
  private accent: number;
  /** Stealth meter, 0–1 — the rig dissolves into fog as it fills. */
  private stealth = 0;
  /** Terror meter, 0–1 — feeds the crown, which grows an extra eye per fifth. */
  private terror = 0;
  /** Per-stalk blink clocks, so the crown never blinks in unison. */
  private stalkPhase = [0.2, 1.7, 3.1, 4.4, 5.9];

  constructor(scene: Phaser.Scene, tint: SilenceColorFn, owner: 'player' | 'npc' = 'player', depth = 6) {
    super(scene, tint, depth, SILENCE_AVATAR);
    this.fx = new SilenceFx(scene, tint);
    this.accent = owner === 'player' ? SILENCE.amethyst : SILENCE.gore;
  }

  /** Stealth meter, 0–1. Sinks the rig into the fog as it climbs. */
  setStealth(v: number): void { this.stealth = Phaser.Math.Clamp(v, 0, 1); }
  /** Terror meter, 0–1. Opens another eye on the crown for every fifth of it. */
  setTerror(v: number): void { this.terror = Phaser.Math.Clamp(v, 0, 1); }

  /**
   * Mastery tell — Weep, made visible: the hands grow a wider shroud, the eyes go blood-red, and
   * (in drawExtras) the crown gains two more stalks, every eye on the rig runs a dark tear track,
   * and the claws grow a second joint so the reach is visibly longer. Shape changes, not brighter
   * tints — a tint alone vanishes at gameplay zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? SILENCE.gore : SILENCE.sclera);
    this.forEachHandLayer(0, (glow) => glow.setRadius(on ? 16 : 11.5));
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(2, this.tint(SILENCE.gore), 0.9);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands shed fog. */
  protected emitTrail(x: number, y: number): void {
    this.fx.motes(x, y, 1, { speed: 18, size: 3, life: 520, depth: 5, color: SILENCE.bruise, drift: -8 });
  }

  /** Hands drawn in against the chest, wrists crossed — the hunting crouch. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    const creep = 0.5 + 0.5 * Math.sin(this.t * 3.4);
    return {
      ang: this.facing + side * 1.9,
      dist: 17 + creep * 3,
      scale: idle.scale * (0.95 + creep * 0.1),
    };
  }

  /**
   * The fog it stands in, thickening as the stealth meter fills until the body is a shape inside
   * a cloud rather than a fighter on a floor.
   */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const k = this.intensity;
    const s = this.stealth;
    g.fillStyle(this.tint(SILENCE.void), a * (0.3 + s * 0.4));
    g.fillEllipse(x, y + 10, 52 * k * (1 + s * 0.5), 19 * k);
    fogBank(g, x, y + 6, (24 + s * 20) * k, 0.7, this.t, this.tint(SILENCE.void), a * (0.22 + s * 0.5), 7);
    if (this.mastered) {
      // Weep: the fog it leaves behind pools wider and creeps outward on its own.
      fogBank(g, x, y + 10, 40 * k, 2.3, this.t * 0.6, this.tint(SILENCE.bruise), a * 0.28, 6);
    }
    g.fillStyle(this.tint(this.accent), a * 0.1 * k);
    g.fillCircle(x, y, 24 * k);
  }

  /**
   * The claws on the ends of the hands, and the crown: a fan of eye-stalks craning off the top of
   * the head, each blinking on its own clock, plus a pair of long fingers curling over from behind.
   *
   * Rooted above the head so it never covers the face, and drawn over the sprite so the eyes read
   * instead of only their dark stalks clearing the body.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const tint = this.tint;
    const hidden = this.stealth;
    const vis = alpha * (1 - hidden * 0.45);

    // ── Claws on the hands ──
    for (let i = 0; i < 2; i++) {
      const hx = this.armX[i], hy = this.armY[i];
      if (hx === 0 && hy === 0) continue;
      const out = Math.atan2(hy - y, hx - x);
      const digits = this.mastered ? 4 : 3;
      for (let d = 0; d < digits; d++) {
        const ang = out + (d - (digits - 1) / 2) * 0.5;
        clawFingerLayered(g, tint, hx, hy, ang,
          (this.mastered ? 17 : 12) * this.intensity, 2.4,
          SILENCE.pitch, this.mastered ? SILENCE.gore : this.accent, vis * 0.95,
          0.55 + Math.sin(this.t * 3 + d) * 0.12);
      }
    }

    // ── The crown of eye-stalks ──
    const bob = Math.sin(this.t * 1.8) * 2.2;
    const rootY = y - 17 + bob;
    // Base three, plus one per fifth of the terror bar, plus two more once mastered.
    const stalks = 3 + Math.round(this.terror * 2) + (this.mastered ? 2 : 0);
    for (let i = 0; i < stalks; i++) {
      const spread = (i - (stalks - 1) / 2) / Math.max(1, stalks - 1);
      const lean = spread * 1.05 + Math.sin(this.t * 1.4 + i * 1.9) * 0.16;
      const len = (13 + (i % 2) * 5) * (this.mastered ? 1.3 : 1) * this.intensity;
      const ang = -Math.PI / 2 + lean;
      const ex = x + Math.cos(ang) * len;
      const ey = rootY + Math.sin(ang) * len;
      // Stalk: a tapering neck, dark, so the eye on the end of it floats.
      g.lineStyle(3.4, tint(SILENCE.void), vis * 0.9);
      strokePts(g, [{ x, y: rootY + 2 }, { x: x + Math.cos(ang) * len * 0.5 + Math.sin(this.t * 2 + i) * 2, y: rootY + Math.sin(ang) * len * 0.5 }, { x: ex, y: ey }]);
      // Each one blinks on its own clock — a crown that blinks together reads as a machine.
      const ph = this.stalkPhase[i % this.stalkPhase.length];
      const blink = Math.sin(this.t * (1.1 + (i % 3) * 0.24) + ph);
      const open = blink > 0.86 ? 1 - (blink - 0.86) / 0.14 : 1;
      silenceEye(g, tint, ex, ey, ang + Math.PI / 2, 4.2 + (i % 2) * 1.1,
        Math.cos(this.facing - ang) * 0.9, open,
        this.mastered ? SILENCE.gore : this.terror > 0.6 ? SILENCE.rust : this.accent, vis);

      if (this.mastered) {
        // Weep: every eye on the rig runs a tear track. This, more than the colour, is the tell.
        g.lineStyle(1.4, tint(SILENCE.plum), vis * (0.5 + 0.4 * Math.sin(this.t * 2 + i)));
        strokePts(g, [{ x: ex, y: ey + 3 }, { x: ex - 1, y: ey + 9 + Math.sin(this.t * 3 + i) * 2 }]);
        if (Math.sin(this.t * 1.7 + i * 2.3) > 0.95) {
          g.fillStyle(tint(SILENCE.lilac), vis * 0.8);
          g.fillCircle(ex - 1, ey + 12, 1.5);
        }
      }
    }

    // ── Two long fingers curling over from behind the head ──
    for (const side of [-1, 1]) {
      const ang = -Math.PI / 2 + side * 1.15 + Math.sin(this.t * 1.1 + side) * 0.1;
      clawFingerLayered(g, tint, x + side * 12, rootY + 4, ang,
        (this.mastered ? 26 : 20) * this.intensity, 3,
        SILENCE.void, this.accent, vis * 0.85, -side * 0.75);
    }
    void a;
  }
}
