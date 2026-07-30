import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Echo renders: the bat-thing rig (membrane hands, tracking
 * eyes, folded wings over the crown), the lantern/bat/bloom auras, and every one-shot effect its
 * abilities throw off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts. What stays here is what makes echo echo: the scalloped chirp, the eye that
 * watches back, and the bat that carries both.
 *
 * Every structural colour must come from the ECHO palette below. Echo has no skin
 * yet, but every call still routes through the owner's `echoColor` mapper, so the day one lands it
 * is a table edit in SkinsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — SkinsKit.echoColor bound to one owner. */
export type EchoColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const ECHO = {
  /** The dark this element lives inside. */
  voidBlack: 0x0a0a16,
  umbra: 0x221133,
  dusk: 0x3b3566,
  /** The sound itself, from the far edge of a chirp to its leading crest. */
  slate: 0x5a63a0,
  mist: 0x8890d0,
  pale: 0xaab4ff,
  lilac: 0xccccff,
  ghost: 0xe8ecff,
  white: 0xffffff,
  /** Lantern light — the only warm thing Echo owns. */
  lamp: 0xffffaa,
  lampCore: 0xfff7cc,
  gold: 0xffdd44,
  amber: 0xffcc55,
  /** Terror blooms and everything that grows out of a living host. */
  terrorDeep: 0x551122,
  terror: 0xdd2c44,
  terrorHi: 0xff6677,
  /** Bioluminescence, left on you by a warp. */
  biolum: 0x66ffcc,
  biolumHi: 0x99ffdd,
  biolumPale: 0xccffee,
  /** The passive's read on a disturbance. */
  sonar: 0x99ffee,
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

/** Local-to-world for a shape drawn along `angle` at (cx, cy). */
function frame(cx: number, cy: number, angle: number): (lx: number, ly: number) => Pt {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return (lx, ly) => ({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos });
}

// ── The primitive ─────────────────────────────────────────────────────────

/**
 * Echo's primitive: a **chirp** — a crescent wavefront thrown from a focus, thick at the crest,
 * tapering to nothing at the horns, with its trailing edge scalloped into membrane lobes.
 *
 * It is deliberately one shape doing two jobs. Read outward it is a pulse of sound leaving a
 * mouth; read inward it is the webbing of a bat's wing. Every projectile, ring, blast, wingbeat
 * and detonation in this element is this shape at a different radius and spread, which is why an
 * echo effect reads as echo even before you notice what it is.
 *
 * @param radius distance from the focus to the crest
 * @param spread half-angle of the arc, radians
 * @param thick  radial depth at the crest, tapering to zero at the horns
 * @param lobes  scallops cut into the trailing edge
 */
export function echoChirp(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, angle: number,
  radius: number, spread: number, thick: number,
  lobes = 3, phase = 0,
): void {
  const segs = Phaser.Math.Clamp(Math.round(spread * radius * 0.4), 12, 64);
  const outer: Pt[] = [];
  const inner: Pt[] = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const a = angle + (u * 2 - 1) * spread;
    // Taper is a cosine bell across the arc: full depth at the crest, a point at each horn.
    const taper = Math.cos((u * 2 - 1) * (Math.PI / 2));
    const cos = Math.cos(a), sin = Math.sin(a);
    const ro = radius + thick * 0.34 * taper;
    // Scallops: the trailing edge pinches back to the crest at each cusp and bellies out
    // between them. That alternation is the whole silhouette — without it this is a banana.
    const bell = Math.abs(Math.sin(u * lobes * Math.PI + phase));
    const ri = radius - thick * taper * (0.26 + 0.74 * bell);
    outer.push({ x: cx + cos * ro, y: cy + sin * ro });
    inner.push({ x: cx + cos * ri, y: cy + sin * ri });
  }
  inner.reverse();
  fillPts(g, outer.concat(inner));
}

/**
 * The primitive in four passes: a dark backing behind the crest, the body, a bright leading lip,
 * and a bead at every scallop cusp and horn tip.
 *
 * The beads matter. A bare chirp ring reads as a jagged starburst; beading the cusps turns the
 * same path into something membranous that a creature could plausibly be made of.
 */
export function echoChirpLayered(
  g: Phaser.GameObjects.Graphics, tint: EchoColorFn,
  cx: number, cy: number, angle: number,
  radius: number, spread: number, thick: number,
  color: number, alpha: number, lobes = 3, phase = 0, beads = true,
): void {
  g.fillStyle(tint(ECHO.voidBlack), alpha * 0.45);
  echoChirp(g, cx, cy, angle, radius + 1.6, spread * 1.02, thick * 1.2, lobes, phase);

  g.fillStyle(tint(color), alpha);
  echoChirp(g, cx, cy, angle, radius, spread, thick, lobes, phase);

  // Leading lip — a thin bright crest riding the outside of the wave.
  g.fillStyle(tint(ECHO.ghost), alpha * 0.6);
  echoChirp(g, cx, cy, angle, radius + thick * 0.2, spread * 0.94, thick * 0.24, 1, 0);

  if (!beads) return;
  for (let i = 0; i <= lobes; i++) {
    const u = i / lobes;
    const a = angle + (u * 2 - 1) * spread;
    const taper = Math.cos((u * 2 - 1) * (Math.PI / 2));
    const r = radius - thick * taper * 0.26;
    g.fillStyle(tint(color), alpha * 0.9);
    g.fillCircle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.max(0.8, thick * 0.13 * (0.4 + taper)));
  }
}

/** A whole ring of chirps facing outward — the shape every echo blast opens with. */
export function chirpRing(
  g: Phaser.GameObjects.Graphics, tint: EchoColorFn,
  cx: number, cy: number, radius: number, thick: number,
  color: number, alpha: number, arcs = 6, spin = 0, lobes = 3,
): void {
  const spread = (Math.PI / arcs) * 0.92;
  for (let i = 0; i < arcs; i++) {
    const a = spin + (i / arcs) * TAU;
    echoChirpLayered(g, tint, cx, cy, a, radius, spread, thick, color, alpha, lobes, i * 0.7, false);
  }
}

// ── Element shapes ────────────────────────────────────────────────────────

/**
 * A bat: a stubby body, two ear points, and a pair of wings that are literally the primitive —
 * each wing is one chirp whose focus is the shoulder, so a wingbeat and a sound pulse are the same
 * drawing at different phases.
 *
 * @param flap -1 (wings up) → 1 (wings down)
 */
export function batSilhouette(
  g: Phaser.GameObjects.Graphics, tint: EchoColorFn,
  cx: number, cy: number, angle: number, size: number, flap: number,
  color: number, alpha: number, fangs = false,
): void {
  const at = frame(cx, cy, angle);
  const beat = Phaser.Math.Clamp(flap, -1, 1);

  for (const side of [-1, 1]) {
    const sh = at(-size * 0.1, side * size * 0.32);
    // The wing sweeps back on the upbeat and reaches wide on the downbeat.
    const wingAng = angle + side * (Math.PI / 2 - beat * 0.55) - 0.18;
    echoChirpLayered(g, tint, sh.x, sh.y, wingAng,
      size * (1.15 + beat * 0.22), 0.92, size * (0.78 - beat * 0.14),
      color, alpha, 3, 0, false);
  }

  // Body: a fat teardrop pointing the way it flies.
  g.fillStyle(tint(ECHO.voidBlack), alpha * 0.55);
  fillPts(g, [at(size * 0.9, 0), at(-size * 0.1, -size * 0.42), at(-size * 0.8, 0), at(-size * 0.1, size * 0.42)]);
  g.fillStyle(tint(color), alpha);
  fillPts(g, [at(size * 0.78, 0), at(-size * 0.12, -size * 0.34), at(-size * 0.7, 0), at(-size * 0.12, size * 0.34)]);

  // Ears — two points off the shoulders, the read that says "bat" at eight pixels wide.
  for (const side of [-1, 1]) {
    g.fillStyle(tint(color), alpha);
    fillPts(g, [at(size * 0.2, side * size * 0.24), at(size * 0.7, side * size * 0.68), at(size * 0.46, side * size * 0.1)]);
  }

  g.fillStyle(tint(ECHO.ghost), alpha * 0.95);
  for (const side of [-1, 1]) {
    const e = at(size * 0.42, side * size * 0.16);
    g.fillCircle(e.x, e.y, size * 0.11);
  }
  if (fangs) {
    g.fillStyle(tint(ECHO.white), alpha);
    for (const side of [-1, 1]) {
      const f = at(size * 0.72, side * size * 0.1);
      fillPts(g, [{ x: f.x, y: f.y }, at(size * 0.5, side * size * 0.2), at(size * 0.56, side * size * 0.02)]);
    }
  }
}

/**
 * A watching eye: a pointed lens, an iris that looks where it is told, a pupil and a glint, with
 * a lid that can be closed down over it.
 *
 * Echo's whole fantasy is *seeing in the dark*, so an eye is the second half of its vocabulary.
 * Blooms, psychic eyes, revealed targets and the mastered rig's third eye all come through here.
 *
 * @param open 1 = wide, 0 = shut
 */
export function eyeGlyph(
  g: Phaser.GameObjects.Graphics, tint: EchoColorFn,
  cx: number, cy: number, tilt: number, look: number, size: number,
  iris: number, alpha: number, open = 1,
): void {
  const at = frame(cx, cy, tilt);
  const lid = Phaser.Math.Clamp(open, 0, 1);
  const h = size * 0.62 * lid;

  const lens: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    lens.push(at(-size + u * size * 2, -Math.sin(u * Math.PI) * h));
  }
  for (let i = 12; i >= 0; i--) {
    const u = i / 12;
    lens.push(at(-size + u * size * 2, Math.sin(u * Math.PI) * h));
  }

  g.fillStyle(tint(ECHO.voidBlack), alpha * 0.7);
  fillPts(g, lens.map((p) => ({ x: p.x, y: p.y + 1.2 })));
  g.fillStyle(tint(ECHO.ghost), alpha);
  fillPts(g, lens);

  if (lid > 0.15) {
    const ir = size * 0.42 * lid;
    const ix = cx + Math.cos(look) * size * 0.3;
    const iy = cy + Math.sin(look) * size * 0.22;
    g.fillStyle(tint(iris), alpha);
    g.fillCircle(ix, iy, ir);
    g.fillStyle(tint(ECHO.voidBlack), alpha);
    g.fillCircle(ix + Math.cos(look) * ir * 0.24, iy + Math.sin(look) * ir * 0.24, ir * 0.5);
    g.fillStyle(tint(ECHO.white), alpha * 0.9);
    g.fillCircle(ix - ir * 0.34, iy - ir * 0.4, ir * 0.24);
  }

  g.lineStyle(1.2, tint(ECHO.dusk), alpha * 0.9);
  strokePts(g, lens, true);
}

/** A hanging lantern: a warm bulb in a wire cage under a ring, swinging on its hook. */
export function lanternGlyph(
  g: Phaser.GameObjects.Graphics, tint: EchoColorFn,
  cx: number, cy: number, swing: number, size: number, alpha: number, lit = true,
): void {
  const at = frame(cx, cy, Math.PI / 2 + swing);
  const top = at(-size * 0.9, 0);
  const bot = at(size * 1.0, 0);

  if (lit) {
    g.fillStyle(tint(ECHO.lamp), alpha * 0.16);
    g.fillCircle(cx, cy, size * 3.2);
    g.fillStyle(tint(ECHO.lampCore), alpha * 0.22);
    g.fillCircle(cx, cy, size * 1.9);
  }
  // Hook and ring.
  g.lineStyle(1.6, tint(ECHO.slate), alpha);
  strokePts(g, [at(-size * 1.5, 0), top]);
  g.strokeCircle(top.x, top.y, size * 0.3);

  // Cage: a lozenge body with two vertical wires.
  const body: Pt[] = [
    at(-size * 0.7, 0), at(-size * 0.3, -size * 0.62), at(size * 0.6, -size * 0.5),
    at(size * 0.85, 0), at(size * 0.6, size * 0.5), at(-size * 0.3, size * 0.62),
  ];
  g.fillStyle(tint(ECHO.umbra), alpha * 0.85);
  fillPts(g, body);
  if (lit) {
    g.fillStyle(tint(ECHO.lamp), alpha * 0.95);
    g.fillCircle(cx, cy, size * 0.44);
    g.fillStyle(tint(ECHO.white), alpha * 0.8);
    g.fillCircle(cx - size * 0.12, cy - size * 0.14, size * 0.2);
  }
  g.lineStyle(1.4, tint(lit ? ECHO.gold : ECHO.slate), alpha);
  strokePts(g, body, true);
  strokePts(g, [at(-size * 0.5, -size * 0.3), at(size * 0.7, -size * 0.26)]);
  strokePts(g, [at(-size * 0.5, size * 0.3), at(size * 0.7, size * 0.26)]);
  g.fillStyle(tint(ECHO.slate), alpha);
  g.fillCircle(bot.x, bot.y, size * 0.16);
}

/** A drifting mote of dust — what fast hands and glowing skin shed. */
function mote(
  g: Phaser.GameObjects.Graphics, tint: EchoColorFn,
  x: number, y: number, r: number, color: number, alpha: number,
): void {
  g.fillStyle(tint(color), alpha * 0.4);
  g.fillCircle(x, y, r * 2);
  g.fillStyle(tint(color), alpha);
  g.fillCircle(x, y, r);
}

// ── EchoFx ────────────────────────────────────────────────────────────────

export interface EchoBoomOpts {
  /** Chirps thrown clear. Defaults to radius/9. */
  arcs?: number;
  /** Motes sprayed with them. Defaults to arcs * 2. */
  motes?: number;
  duration?: number;
  depth?: number;
  color?: number;
  /** Leave a listening mark on the floor. Default true. */
  mark?: boolean;
}

/**
 * One-shot echo effects. Cheap to construct — build one per owner and hand it that owner's colour
 * mapper.
 */
export class EchoFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: EchoColorFn = (c) => c) {
    super(scene, tint);
  }

  // `color: number` is spelled out on every signature below: without it TypeScript infers the
  // literal type of the ECHO default and refuses every other palette entry at the call site.

  /** Blown-out core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 18, color: number = ECHO.lilac): void {
    this.flashIn(x, y, radius, ECHO.white, color, depth);
  }

  /**
   * A shockwave, built as a ring of outward chirps rather than as a circle. The arc count scales
   * with radius so a big pulse never degrades into a hexagon.
   */
  ring(
    x: number, y: number, from: number, to: number, color: number,
    duration = 380, depth = 17, thick = 9,
  ): void {
    const arcs = Phaser.Math.Clamp(Math.round(to / 13), 5, 20);
    const spin = Math.random() * TAU;
    this.anim(depth, duration, (g, t) => {
      const r = from + (to - from) * easeOut(t);
      const a = (1 - t) * 0.9;
      chirpRing(g, this.tint, x, y, r, thick * (1 - t * 0.5), color, a, arcs, spin + t * 0.3, 3);
    });
  }

  /**
   * A chirp leaving something: three nested wavefronts along the aim, each a beat behind the last.
   * This is the muzzle flare on every echo shot.
   */
  chirp(
    x: number, y: number, angle: number,
    o: { reach?: number; spread?: number; color?: number; duration?: number; depth?: number; waves?: number } = {},
  ): void {
    const reach = o.reach ?? 46;
    const spread = o.spread ?? 0.72;
    const color = o.color ?? ECHO.lilac;
    const dur = o.duration ?? 340;
    const depth = o.depth ?? 17;
    const waves = o.waves ?? 3;
    this.anim(depth, dur, (g, t) => {
      for (let i = 0; i < waves; i++) {
        const lt = t - i * 0.16;
        if (lt <= 0) continue;
        const p = Math.min(1, lt / (1 - i * 0.16));
        echoChirpLayered(g, this.tint, x, y, angle,
          6 + reach * easeOut(p), spread * (0.7 + p * 0.5), 9 * (1 - p * 0.55),
          i === 0 ? ECHO.white : color, (1 - p) * 0.9, 3, i * 0.8);
      }
    });
  }

  /** Concentric chirp rings washing outward — a full sonar sweep of a place. */
  sonar(
    x: number, y: number, radius: number,
    o: { pulses?: number; color?: number; duration?: number; depth?: number } = {},
  ): void {
    const pulses = o.pulses ?? 3;
    const color = o.color ?? ECHO.sonar;
    const dur = o.duration ?? 900;
    const depth = o.depth ?? 17;
    this.anim(depth, dur, (g, t) => {
      for (let i = 0; i < pulses; i++) {
        const lt = t - i * (0.8 / pulses);
        if (lt <= 0) continue;
        const p = Math.min(1, lt / (1 - i * (0.8 / pulses)));
        chirpRing(g, this.tint, x, y, 10 + radius * easeOut(p), 7 * (1 - p * 0.6),
          color, (1 - p) * 0.7, Phaser.Math.Clamp(Math.round(radius / 16), 5, 18), i * 0.5, 3);
      }
    });
  }

  /** Motes shaken loose — dust, spores, whatever the dark is made of here. */
  motes(
    x: number, y: number, count: number,
    o: { speed?: number; spread?: number; angle?: number; size?: number; life?: number; depth?: number; color?: number; drift?: number } = {},
  ): void {
    const speed = o.speed ?? 90;
    const spread = o.spread ?? Math.PI;
    const baseAngle = o.angle ?? 0;
    const size = o.size ?? 2.2;
    const life = o.life ?? 700;
    const depth = o.depth ?? 16;
    const color = o.color ?? ECHO.pale;
    const drift = o.drift ?? -18;

    const parts = Array.from({ length: count }, () => ({
      a: baseAngle + (Math.random() - 0.5) * spread * 2,
      v: speed * (0.3 + Math.random() * 1.1),
      s: size * (0.5 + Math.random()),
      wob: Math.random() * TAU,
      delay: Math.random() * 0.25,
    }));
    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        const px = x + Math.cos(p.a) * d + Math.sin(p.wob + lt * 6) * 4;
        const py = y + Math.sin(p.a) * d + drift * lt;
        mote(g, this.tint, px, py, p.s * (1 - lt * 0.5), color, 0.85 * (1 - lt * lt));
      }
    });
  }

  /** A little flock scattering out of an impact — the loudest thing in a cave. */
  bats(
    x: number, y: number, count: number,
    o: { speed?: number; spread?: number; angle?: number; size?: number; life?: number; depth?: number; color?: number } = {},
  ): void {
    const speed = o.speed ?? 260;
    const spread = o.spread ?? Math.PI;
    const baseAngle = o.angle ?? 0;
    const size = o.size ?? 9;
    const life = o.life ?? 680;
    const depth = o.depth ?? 18;
    const color = o.color ?? ECHO.umbra;

    const parts = Array.from({ length: count }, () => ({
      a: baseAngle + (Math.random() - 0.5) * spread * 2,
      v: speed * (0.5 + Math.random() * 0.8),
      s: size * (0.7 + Math.random() * 0.6),
      beat: Math.random() * TAU,
      wob: 0.5 + Math.random() * 0.9,
      delay: Math.random() * 0.2,
    }));
    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        // Bats do not fly straight — a sine across the heading is the whole read.
        const wobble = Math.sin(p.beat + lt * 9) * 16 * p.wob;
        const d = p.v * easeOut(lt) * (life / 1000);
        const px = x + Math.cos(p.a) * d - Math.sin(p.a) * wobble;
        const py = y + Math.sin(p.a) * d + Math.cos(p.a) * wobble;
        batSilhouette(g, this.tint, px, py, p.a, p.s, Math.sin(p.beat + lt * 22),
          color, 0.9 * (1 - lt * lt));
      }
    });
  }

  /** An eye snapping open on something, then narrowing shut. The tell for a revealed target. */
  eyeOpen(
    x: number, y: number, size: number,
    o: { color?: number; duration?: number; depth?: number; tilt?: number } = {},
  ): void {
    const color = o.color ?? ECHO.pale;
    const dur = o.duration ?? 620;
    const depth = o.depth ?? 19;
    const tilt = o.tilt ?? 0;
    this.anim(depth, dur, (g, t) => {
      const open = t < 0.25 ? easeOut(t / 0.25) : 1 - easeIn((t - 0.25) / 0.75);
      const fade = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      eyeGlyph(g, this.tint, x, y, tilt, tilt + Math.sin(t * 7) * 0.5, size * (0.8 + 0.2 * open),
        color, fade * 0.95, open);
      g.lineStyle(1.6, this.tint(color), fade * 0.4 * (1 - t));
      g.strokeCircle(x, y, size * (1.3 + t * 1.6));
    });
  }

  /** A tapered comet trail along a dash, plus a chirp kicked back off the launch point. */
  dashTrail(
    x1: number, y1: number, x2: number, y2: number,
    o: { color?: number; width?: number; duration?: number; depth?: number } = {},
  ): void {
    const color = o.color ?? ECHO.pale;
    const w = o.width ?? 15;
    const dur = o.duration ?? 380;
    const depth = o.depth ?? 16;
    const a = Math.atan2(y2 - y1, x2 - x1);
    this.chirp(x1, y1, a + Math.PI, { reach: 34, color, duration: 300, depth: depth - 1, waves: 2 });
    this.anim(depth, dur, (g, t) => {
      const fade = 1 - t;
      const at = frame(x1, y1, a);
      const len = Math.hypot(x2 - x1, y2 - y1);
      const top: Pt[] = [];
      const bot: Pt[] = [];
      for (let i = 0; i <= 10; i++) {
        const u = i / 10;
        const hw = w * (1 - u) * (1 - t * 0.6);
        top.push(at(u * len, -hw));
        bot.push(at(u * len, hw));
      }
      bot.reverse();
      g.fillStyle(this.tint(color), 0.3 * fade);
      fillPts(g, top.concat(bot));
      g.fillStyle(this.tint(ECHO.ghost), 0.45 * fade);
      for (let i = 0; i <= 5; i++) {
        const u = i / 5;
        const p = at(u * len, 0);
        g.fillCircle(p.x, p.y, w * 0.3 * (1 - u) * fade);
      }
    });
  }

  /**
   * A full detonation: white core, a chirp ring, a second ring a beat behind, a scatter of bats,
   * motes, and a listening mark left on the floor.
   */
  boom(x: number, y: number, radius: number, o: EchoBoomOpts = {}): void {
    const color = o.color ?? ECHO.lilac;
    const arcs = o.arcs ?? Math.max(4, Math.round(radius / 9));
    const dust = o.motes ?? arcs * 2;
    const dur = o.duration ?? Math.round(340 + radius * 1.2);
    const depth = o.depth ?? 18;

    if (o.mark !== false) this.mark(x, y, radius * 0.62, depth - 14, color);
    this.flash(x, y, radius * 0.4, depth + 2, color);
    this.ring(x, y, radius * 0.18, radius, color, Math.round(dur * 0.85), depth, 11);
    this.scene.time.delayedCall(90, () =>
      this.ring(x, y, radius * 0.4, radius * 1.28, ECHO.white, dur, depth, 4));
    this.bats(x, y, Math.max(3, Math.round(arcs * 0.6)), {
      speed: radius * 2.1, size: 8 + radius / 16, life: Math.round(dur * 1.3), depth: depth + 1, color: ECHO.umbra,
    });
    this.motes(x, y, dust, { speed: radius * 1.7, size: 2.4, life: Math.round(dur * 1.5), depth, color });
  }

  /** A listening mark: scallop cusps ringing the spot, fading like a memory of the sound. */
  mark(x: number, y: number, radius: number, depth = 3, color: number = ECHO.dusk): void {
    const seed = Math.random() * TAU;
    this.anim(depth, 1400, (g, t) => {
      const a = t < 0.08 ? t / 0.08 : 1 - (t - 0.08) / 0.92;
      g.fillStyle(this.tint(ECHO.voidBlack), 0.35 * a);
      g.fillEllipse(x, y, radius * 2.1, radius * 1.5);
      for (let i = 0; i < 10; i++) {
        const ang = seed + (i / 10) * TAU;
        echoChirpLayered(g, this.tint, x, y, ang, radius * 0.86, 0.3, radius * 0.24,
          color, 0.5 * a, 2, 0, false);
      }
    });
  }

  /**
   * A wind-up: chirps converging *inward* on a point with a containment ring closing behind them,
   * so the payoff reads as something that was gathered rather than something that appeared.
   */
  channelCharge(
    x: number, y: number, radius: number, duration: number,
    o: { color?: number; depth?: number; follow?: () => { x: number; y: number } } = {},
  ): void {
    const color = o.color ?? ECHO.pale;
    const depth = o.depth ?? 16;
    const follow = o.follow;
    this.anim(depth, duration, (g, t) => {
      const c = follow ? follow() : { x, y };
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + t * 3.4;
        const d = radius * (1.5 - easeIn(t) * 1.15) + Math.sin(t * 22 + i) * 3;
        echoChirpLayered(g, this.tint, c.x, c.y, a, d, 0.34, 8 * (0.4 + t * 0.9),
          color, 0.35 + 0.55 * t, 3, i * 0.6, false);
      }
      g.lineStyle(2 + t * 2, this.tint(t > 0.94 ? ECHO.white : color), 0.3 + 0.55 * t);
      g.strokeCircle(c.x, c.y, radius * (1.55 - easeIn(t) * 1.1));
      g.fillStyle(this.tint(ECHO.white), 0.2 + 0.6 * t * t);
      g.fillCircle(c.x, c.y, 3 + radius * 0.18 * t);
    });
  }

  /** A tether of sound between two points — the bat clamped on, the tracker locked on. */
  tether(x1: number, y1: number, x2: number, y2: number, color: number, depth = 16, alpha = 1): void {
    this.anim(depth, 260, (g, t) => {
      const fade = (1 - t) * alpha;
      const a = Math.atan2(y2 - y1, x2 - x1);
      const len = Math.hypot(x2 - x1, y2 - y1);
      const at = frame(x1, y1, a);
      for (let i = 1; i <= 5; i++) {
        const u = i / 6;
        const p = at(u * len, 0);
        echoChirpLayered(g, this.tint, p.x, p.y, a, 6 + u * 5, 0.9, 7,
          color, fade * 0.7, 3, i, false);
      }
      g.lineStyle(1.6, this.tint(ECHO.ghost), fade * 0.55);
      strokePts(g, [{ x: x1, y: y1 }, { x: x2, y: y2 }]);
    });
  }

  // ── Per-frame painters ──────────────────────────────────────────────────
  // Drawn into a Graphics the caller already owns, because these ride on live gameplay state: a
  // bolt's bounce count, a summon's health, how long a line has left before it goes off.

  /**
   * The Echolocation bolt: a stack of three chirps riding one focus point, wavefronts wider and
   * fainter the further back they are, plus a bright core the enemy actually has to dodge.
   * Bounces stack extra membrane lobes onto it, so a shot that has been round the room twice is
   * visibly a nastier thing than one just fired.
   */
  static drawBolt(
    g: Phaser.GameObjects.Graphics, tint: EchoColorFn,
    x: number, y: number, angle: number, bounces: number, t: number,
  ): void {
    const lobes = 3 + Math.min(3, bounces);
    for (let i = 3; i >= 1; i--) {
      const back = i * 9;
      echoChirpLayered(g, tint, x - Math.cos(angle) * back, y - Math.sin(angle) * back, angle,
        7 + i * 3, 0.62 + i * 0.12, 10 - i * 1.6,
        i === 1 ? ECHO.lilac : ECHO.mist, 0.5 - i * 0.1, lobes, i * 0.9, false);
    }
    echoChirpLayered(g, tint, x, y, angle, 11, 0.6, 12, ECHO.ghost, 0.95, lobes, 0);
    g.fillStyle(tint(ECHO.white), 0.6 + 0.3 * Math.sin(t * 16));
    g.fillCircle(x, y, 3.4);
    // Every bounce hangs another bead off the back of it.
    for (let i = 0; i < bounces; i++) {
      const a = angle + Math.PI + (i - bounces / 2) * 0.5;
      mote(g, tint, x + Math.cos(a) * 13, y + Math.sin(a) * 13, 1.6, ECHO.pale, 0.7);
    }
  }

  /**
   * Torch (divine perk): the burning brand the bearer carries in place of an echo-lamp. A bound
   * haft held out at `angle`, a rag head, and three tongues leaning off it — plus a pool of warm
   * light on the ground. `vigour` (0–1) is how much light is left in it: a guttering torch keeps
   * its haft but loses its flame, so the drop is legible before it is fatal.
   */
  static drawTorch(
    g: Phaser.GameObjects.Graphics, tint: EchoColorFn,
    x: number, y: number, angle: number, vigour: number, t: number,
  ): void {
    const flick = 0.78 + 0.22 * Math.sin(t * 13) + 0.08 * Math.sin(t * 29 + 1.7);
    const hx = x + Math.cos(angle) * 17;
    const hy = y + Math.sin(angle) * 17 - 5;

    // The glow it casts, largest and faintest first.
    g.fillStyle(tint(ECHO.amber), 0.1 * vigour);
    g.fillCircle(hx, hy, (26 + 6 * flick) * (0.5 + 0.5 * vigour));
    g.fillStyle(tint(ECHO.lamp), 0.16 * vigour);
    g.fillCircle(hx, hy, (14 + 4 * flick) * (0.5 + 0.5 * vigour));

    // Haft: a stub of wood, angled back into the fist.
    const bx = x + Math.cos(angle) * 7, by = y + Math.sin(angle) * 7 + 1;
    g.lineStyle(3.4, tint(ECHO.umbra), 0.95);
    g.beginPath(); g.moveTo(bx, by); g.lineTo(hx, hy); g.strokePath();
    // Binding at the head.
    g.lineStyle(2.2, tint(ECHO.dusk), 0.9);
    const px = -Math.sin(angle) * 3.4, py = Math.cos(angle) * 3.4;
    g.beginPath(); g.moveTo(hx - px, hy - py); g.lineTo(hx + px, hy + py); g.strokePath();

    // Flame: three leaning tongues plus a core, all scaled by what is left of it.
    const size = (3 + 7 * vigour) * flick;
    for (let i = 0; i < 3; i++) {
      const lean = -Math.PI / 2 + (i - 1) * 0.5 + Math.sin(t * 5 + i * 1.3) * 0.26;
      const len = size * (i === 1 ? 1.5 : 1);
      g.fillStyle(tint(i === 1 ? ECHO.lamp : ECHO.amber), 0.85);
      g.fillEllipse(hx + Math.cos(lean) * len * 0.5, hy + Math.sin(lean) * len * 0.5,
        size * 0.62, len * 1.4);
    }
    g.fillStyle(tint(ECHO.white), 0.85 * flick);
    g.fillCircle(hx, hy - size * 0.3, Math.max(1, size * 0.3));
    // An ember shaking loose, only while there is fire enough to shed one.
    if (vigour > 0.45) {
      const p = (t * 0.9) % 1;
      mote(g, tint, hx + Math.sin(t * 3) * 5, hy - 8 - p * 14, 1.5 * (1 - p), ECHO.gold, 0.7 * (1 - p));
    }
  }

  /**
   * An Echo summon: a hollow double of whoever it was torn out of — a body of pure wavefront with
   * an eye where a face would be, coming apart at the edges and knitting itself back together.
   */
  static drawSummon(
    g: Phaser.GameObjects.Graphics, tint: EchoColorFn,
    x: number, y: number, look: number, hpRatio: number, t: number,
  ): void {
    const solid = 0.35 + 0.5 * hpRatio;
    g.fillStyle(tint(ECHO.voidBlack), 0.3);
    g.fillEllipse(x, y + 13, 26, 9);

    // Body — concentric chirps facing outward, breathing.
    for (let i = 0; i < 5; i++) {
      const a = t * 0.7 + (i / 5) * TAU;
      echoChirpLayered(g, tint, x, y, a, 11 + Math.sin(t * 3 + i) * 1.6, 0.66, 7,
        ECHO.slate, solid * 0.8, 3, i, false);
    }
    g.fillStyle(tint(ECHO.umbra), solid * 0.75);
    g.fillCircle(x, y, 10);
    g.lineStyle(1.6, tint(ECHO.pale), solid);
    g.strokeCircle(x, y, 12.5);
    eyeGlyph(g, tint, x, y - 1, 0, look, 6.4, ECHO.pale, solid + 0.15, 1);
    // Motes shedding off a thing that is not quite holding together.
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.6 + i / 3) % 1;
      const a = i * 2.1 + t;
      mote(g, tint, x + Math.cos(a) * (13 + p * 10), y + Math.sin(a) * (13 + p * 10) - p * 6,
        1.4 * (1 - p), ECHO.pale, 0.6 * (1 - p));
    }
  }

  /**
   * An Eclipse line: a standing wave laid across the whole arena. Chirps march along it in both
   * directions, pinching tighter and burning brighter as detonation closes in.
   */
  static drawEclipseLine(
    g: Phaser.GameObjects.Graphics, tint: EchoColorFn,
    cx: number, cy: number, angle: number, len: number, urgency: number, t: number,
  ): void {
    const ax = cx - Math.cos(angle) * len / 2, ay = cy - Math.sin(angle) * len / 2;
    const hot = 0.35 + 0.55 * urgency;
    const width = 7 + 7 * urgency;

    // The band itself.
    const at = frame(ax, ay, angle);
    const top: Pt[] = [], bot: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      const w = width * (0.55 + 0.45 * Math.abs(Math.sin(u * 9 + t * 3)));
      top.push(at(u * len, -w));
      bot.push(at(u * len, w));
    }
    bot.reverse();
    g.fillStyle(tint(ECHO.umbra), hot * 0.55);
    fillPts(g, top.concat(bot));
    g.fillStyle(tint(urgency > 0.6 ? ECHO.white : ECHO.lilac), hot * 0.5);
    fillPts(g, top.concat(bot).map((p) => ({ x: p.x, y: p.y })));

    // Chirps sliding along it, opposed, so it reads as sound trapped between two walls.
    const step = 78;
    const march = (t * 90) % step;
    for (let d = -march; d < len; d += step) {
      if (d < 0) continue;
      const p = at(d, 0);
      echoChirpLayered(g, tint, p.x, p.y, angle, 9 + urgency * 6, 0.85, width * 1.3,
        ECHO.ghost, hot * 0.8, 3, 0, false);
      const q = at(len - d, 0);
      echoChirpLayered(g, tint, q.x, q.y, angle + Math.PI, 9 + urgency * 6, 0.85, width * 1.3,
        ECHO.pale, hot * 0.6, 3, 0, false);
    }
    g.lineStyle(1.6, tint(ECHO.white), hot);
    strokePts(g, [{ x: ax, y: ay }, at(len, 0)]);
  }

  /** A Psychic Eye orbiting its owner, blinking on its own clock and going red once armed. */
  static drawPsychicEye(
    g: Phaser.GameObjects.Graphics, tint: EchoColorFn,
    x: number, y: number, look: number, armed: boolean, seed: number, t: number,
  ): void {
    const blink = Math.sin(t * 1.7 + seed * 3);
    const open = blink > 0.93 ? Phaser.Math.Clamp((1 - blink) * 14, 0.05, 1) : 1;
    const iris = armed ? ECHO.terrorHi : ECHO.pale;
    g.fillStyle(tint(iris), 0.16 + (armed ? 0.14 : 0));
    g.fillCircle(x, y, 13);
    eyeGlyph(g, tint, x, y, Math.sin(t + seed) * 0.3, look, 7.5, iris, 0.95, open);
    if (armed) {
      // Armed: three barbs of intent, turning.
      for (let i = 0; i < 3; i++) {
        const a = t * 3 + (i / 3) * TAU;
        echoChirpLayered(g, tint, x, y, a, 11, 0.42, 5, ECHO.terror, 0.8, 2, 0, false);
      }
    }
  }

  /** The light-trail left behind a psychic dodge: a rope of overlapping chirps burning down. */
  static drawLightTrail(
    g: Phaser.GameObjects.Graphics, tint: EchoColorFn,
    pts: Pt[], alpha: number, t: number,
  ): void {
    if (pts.length < 2) return;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x);
      const pulse = 0.7 + 0.3 * Math.sin(t * 6 - i);
      echoChirpLayered(g, tint, pts[i].x, pts[i].y, a, 10, 1.0, 12 * pulse,
        ECHO.lamp, alpha * 0.8, 3, i * 0.5, false);
    }
    g.lineStyle(3, tint(ECHO.white), alpha * 0.7);
    strokePts(g, pts);
  }

  /** The Vibration Detection ring: one quadrant flare, drawn as an arc of chirps. */
  static drawVibeArc(
    g: Phaser.GameObjects.Graphics, tint: EchoColorFn,
    x: number, y: number, mid: number, half: number, radius: number,
    strong: boolean, fade: number,
  ): void {
    const color = strong ? ECHO.amber : ECHO.sonar;
    echoChirpLayered(g, tint, x, y, mid, radius, half, strong ? 11 : 7,
      color, fade * (strong ? 0.85 : 0.55), strong ? 4 : 3, 0, false);
    if (strong) {
      // A cast is a double pulse: a fainter echo of the same segment, tucked inside.
      echoChirpLayered(g, tint, x, y, mid, radius - 9, half * 0.7, 5,
        ECHO.gold, fade * 0.4, 3, 0.5, false);
    }
  }
}

// ── EchoAura ──────────────────────────────────────────────────────────────

export type EchoAuraStyle =
  | 'bat'      // Bat Form: a blur of wingbeats and a shrunken silhouette
  | 'lantern'  // Lantern: a warm pool of light, and the lamp itself
  | 'biolum'   // post-warp bioluminescence
  | 'drain'    // Bat attach: something latched on and pulling
  | 'view';    // the eye is open somewhere else; this body is a shell holding a shield

/**
 * A persistent echo effect riding on a fighter. One Graphics, driven by whoever owns it.
 *
 * The styles differ in *shape*: bat flutters, lantern pools, biolum drifts, drain pulls inward and
 * view stands empty. Several can be up at once, so they must stay separable at a glance.
 */
export class EchoAura {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private intensity = 1;
  private angle = 0;

  constructor(
    scene: Phaser.Scene,
    private tint: EchoColorFn,
    private style: EchoAuraStyle,
    private radius: number,
    depth = 4,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  /** Usually how far along the effect is — a remaining fraction, or a drain ratio. */
  setIntensity(v: number): void { this.intensity = v; }
  /** Facing, for the styles that have a front. */
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
      case 'bat': {
        // Wingbeats blurred around a body that is barely there — four ghosts of the same beat.
        for (let i = 0; i < 4; i++) {
          const lag = i * 0.09;
          batSilhouette(g, this.tint, x, y, this.angle, r * 0.62,
            Math.sin((t - lag) * 17), ECHO.umbra, alpha * (0.5 - i * 0.1), true);
        }
        g.fillStyle(this.tint(ECHO.dusk), alpha * 0.12);
        g.fillCircle(x, y, r * 1.3);
        // Squeaks going out ahead of it.
        for (let i = 0; i < 2; i++) {
          const p = (t * 1.8 + i / 2) % 1;
          echoChirpLayered(g, this.tint, x, y, this.angle, r * (0.7 + p * 1.5), 0.5,
            7 * (1 - p), ECHO.mist, alpha * 0.5 * (1 - p), 3, 0, false);
        }
        break;
      }
      case 'lantern': {
        // A warm pool that actually pools — brighter under the lamp, thinning outward.
        for (let i = 3; i >= 1; i--) {
          g.fillStyle(this.tint(i === 1 ? ECHO.lampCore : ECHO.lamp), alpha * 0.07 * i);
          g.fillCircle(x, y, r * (0.6 + i * 0.5) * (1 + 0.03 * Math.sin(t * 3)));
        }
        lanternGlyph(g, this.tint, x, y - r * 1.05, Math.sin(t * 1.9) * 0.22, 8, alpha, true);
        // Moths — nothing sells a lamp in the dark like something circling it.
        for (let i = 0; i < 3; i++) {
          const a = t * (1.4 + i * 0.5) + i * 2.1;
          const d = r * (0.5 + 0.28 * Math.sin(t * 2.3 + i * 1.7));
          mote(g, this.tint, x + Math.cos(a) * d, y - r * 1.05 + Math.sin(a) * d * 0.5,
            1.5, ECHO.gold, alpha * 0.8);
        }
        break;
      }
      case 'biolum': {
        // Skin still glowing from where it was: a soft shell and motes lifting off it.
        const pulse = 0.75 + 0.25 * Math.sin(t * 5.5);
        g.fillStyle(this.tint(ECHO.biolum), alpha * 0.1 * k * pulse);
        g.fillCircle(x, y, r * 1.25 * pulse);
        g.fillStyle(this.tint(ECHO.biolumHi), alpha * 0.2 * k);
        g.fillCircle(x, y, r * 0.72);
        for (let i = 0; i < 7; i++) {
          const p = (t * 0.55 + i / 7) % 1;
          const a = (i / 7) * TAU + Math.sin(t + i) * 0.4;
          mote(g, this.tint, x + Math.cos(a) * r * (0.5 + p * 0.7), y + Math.sin(a) * r * 0.5 - p * 26,
            1.9 * (1 - p * 0.5), ECHO.biolumPale, alpha * 0.7 * k * (1 - p));
        }
        break;
      }
      case 'drain': {
        // Something clamped on: chirps running *inward*, and a bat riding the shoulder.
        for (let i = 0; i < 6; i++) {
          const p = (t * 1.7 + i / 6) % 1;
          const a = (i / 6) * TAU + t * 0.5;
          echoChirpLayered(g, this.tint, x, y, a + Math.PI, r * (1.6 - p * 1.1), 0.4,
            8 * p, ECHO.terror, alpha * 0.6 * p, 3, i, false);
        }
        batSilhouette(g, this.tint, x + Math.cos(this.angle) * r * 0.5, y + Math.sin(this.angle) * r * 0.5,
          this.angle + Math.PI, r * 0.45, Math.sin(t * 20), ECHO.umbra, alpha * 0.95, true);
        g.lineStyle(2, this.tint(ECHO.terrorHi), alpha * (0.35 + 0.3 * Math.sin(t * 9)));
        g.strokeCircle(x, y, r);
        break;
      }
      case 'view': {
        // Nobody is home: a hollow shell with the shield ringing it, and one closed eye.
        g.fillStyle(this.tint(ECHO.dusk), alpha * 0.14);
        g.fillCircle(x, y, r * 1.1);
        g.lineStyle(2.4, this.tint(ECHO.biolumHi), alpha * (0.35 + 0.35 * k));
        g.strokeCircle(x, y, r * (1.05 + 0.04 * Math.sin(t * 6)));
        for (let i = 0; i < 5; i++) {
          const a = t * 0.9 + (i / 5) * TAU;
          echoChirpLayered(g, this.tint, x, y, a, r * 1.05, 0.28, 6,
            ECHO.biolum, alpha * 0.5 * (0.3 + 0.7 * k), 2, 0, false);
        }
        eyeGlyph(g, this.tint, x, y - r * 0.2, 0, 0, 7, ECHO.slate, alpha * 0.8, 0.08);
        break;
      }
    }
  }

  destroy(): void { this.g.destroy(); }
}

// ── EchoAvatar ────────────────────────────────────────────────────────────

/** Concentric discs of one membrane hand, outermost first. */
const ECHO_AVATAR: AvatarSpec = {
  hands: [
    { r: 12, color: ECHO.pale, alpha: 0.18 },
    { r: 7.4, color: ECHO.umbra, alpha: 1 },
    { r: 4.6, color: ECHO.slate, alpha: 1 },
    { r: 1.8, color: ECHO.ghost, alpha: 1, ox: -2, oy: -2.2 },
  ],
  eyeWhite: ECHO.ghost,
  eyePupil: ECHO.umbra,
  // Light, membranous hands: they whip around and smear a long way.
  squash: { div: 11, x: 0.62, y: 0.34 },
};

/**
 * The echo character rig: two membrane-clawed hands, a pair of eyes that track the aim, and a set
 * of bat wings folded over the crown that beat when the fighter moves.
 *
 * The wings are the idea. This element's whole vocabulary is *the shape sound makes*, and its
 * wings are literally that primitive — so the character is visibly built out of the same stuff its
 * abilities are.
 */
export class EchoAvatar extends BaseAvatar {
  private fx: EchoFx;
  /** Cool for the player, warm for the NPC, so two echo fighters never blur together. */
  private accent: number;
  /** Rolls over on its own so a resting character still pings the room every few seconds. */
  private pingPhase = Math.random();

  constructor(scene: Phaser.Scene, tint: EchoColorFn, owner: 'player' | 'npc' = 'player', depth = 6) {
    super(scene, tint, depth, ECHO_AVATAR);
    this.fx = new EchoFx(scene, tint);
    this.accent = owner === 'player' ? ECHO.pale : ECHO.amber;
  }

  /**
   * Mastery tell — Vibration Detection, made visible: a third eye opens over the crown, the wings
   * grow a fourth membrane finger, the hands gain a wide sonar corona and the eyes go white. Shape
   * changes, not brighter tints — a tint alone vanishes at gameplay zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? ECHO.white : ECHO.ghost);
    this.forEachHandLayer(0, (glow) => glow.setRadius(on ? 16 : 12));
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(2, this.tint(ECHO.sonar), 0.9);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands shed dust out of the dark. */
  protected emitTrail(x: number, y: number): void {
    this.fx.motes(x, y, 1, { speed: 26, size: 1.8, life: 520, depth: 5, color: this.accent, drift: -10 });
  }

  /** Both hands cupped behind the ears — the pose for listening through something else's eye. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    const strain = 0.5 + 0.5 * Math.sin(this.t * 7);
    return {
      ang: this.facing + side * (2.2 + strain * 0.14),
      dist: 21 + strain * 4,
      scale: idle.scale * (1.05 + strain * 0.12),
    };
  }

  /** A pool of dark underfoot, with the last sonar ping still washing out of it. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const k = this.intensity;
    g.fillStyle(this.tint(ECHO.voidBlack), a * 0.26 * k);
    g.fillEllipse(x, y + 9, 54 * k, 20 * k);
    g.fillStyle(this.tint(this.accent), a * 0.12 * k);
    g.fillCircle(x, y, 26 * k);

    // A ping leaves once per cycle, whether or not anything was cast.
    const ping = (this.t * (this.mastered ? 0.55 : 0.32) + this.pingPhase) % 1;
    if (ping < 0.6) {
      const p = ping / 0.6;
      chirpRing(g, this.tint, x, y, 18 + p * 40, 6 * (1 - p),
        this.mastered ? ECHO.sonar : this.accent, a * 0.4 * (1 - p), 6, this.t * 0.4, 3);
    }
  }

  /**
   * Claws on each hand, wings folded over the crown, and — once mastered — a third eye and the
   * four quadrant ticks of Vibration Detection turning around the head.
   *
   * Rooted above the head so it never covers the face, and drawn over the sprite so the membrane
   * reads instead of only its dark tips clearing the body.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    // ── Claws ──
    for (let i = 0; i < 2; i++) {
      const hx = this.armX[i], hy = this.armY[i];
      if (hx === 0 && hy === 0) continue;
      const out = Math.atan2(hy - y, hx - x);
      echoChirpLayered(g, this.tint, hx, hy, out, 10 * this.intensity, 0.72, 8,
        this.mastered ? ECHO.sonar : ECHO.mist, alpha * 0.9, 3, 0, false);
    }

    // ── The crown wings ──
    const rootY = y - 18;
    // They beat harder when the fighter is buffed, and idle to a slow breath otherwise.
    const beat = Math.sin(this.t * (this.intensity > 1 ? 12 : 3.4));
    const span = 15 * this.intensity;
    const fingers = this.mastered ? 4 : 3;
    for (const side of [-1, 1]) {
      const sx = x + side * 5;
      const wingAng = -Math.PI / 2 + side * (0.95 - beat * 0.3);
      echoChirpLayered(g, this.tint, sx, rootY, wingAng,
        span * (1.25 + beat * 0.16), 0.86, span * (0.82 - beat * 0.12),
        ECHO.umbra, alpha * 0.95, fingers, 0, false);
      // A lit leading bone down the front edge of each wing.
      const tipA = wingAng + 0.86;
      g.lineStyle(1.6, this.tint(this.mastered ? ECHO.sonar : ECHO.slate), alpha * 0.85);
      strokePts(g, [
        { x: sx, y: rootY },
        { x: sx + Math.cos(tipA) * span * 1.35, y: rootY + Math.sin(tipA) * span * 1.35 },
      ]);
    }
    // Ear points between the wings, so the crown still reads as a head.
    for (const side of [-1, 1]) {
      g.fillStyle(this.tint(ECHO.umbra), alpha * 0.95);
      fillPts(g, [
        { x: x + side * 4, y: rootY + 5 },
        { x: x + side * 10, y: rootY - 9 },
        { x: x + side * 11, y: rootY + 2 },
      ]);
    }

    // ── Mastery: the third eye, and the quadrant ticks it reads the room with ──
    if (this.mastered) {
      eyeGlyph(g, this.tint, x, rootY - 6, 0, this.facing, 6.6, ECHO.sonar, alpha * 0.95,
        0.55 + 0.45 * Math.abs(Math.sin(this.t * 0.9)));
      for (let i = 0; i < 4; i++) {
        const ang = this.t * 0.8 + (i / 4) * TAU;
        echoChirpLayered(g, this.tint, x, y, ang, 30, 0.3, 6,
          ECHO.sonar, alpha * 0.55, 2, 0, false);
      }
    }
    void a;
  }
}
