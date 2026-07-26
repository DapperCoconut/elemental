import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Sound renders: the performer avatar (amp-cone ball hands,
 * a hovering chord worn as a crown, eyes), the stance auras, and the one-shot effects every
 * ability fires off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts and are shared with the other elements. What stays here is what makes sound
 * sound: the wave ribbon, the ripple, the music note, and everything built from those three.
 *
 * Every structural colour must come from the SOUND palette below. Sound has no skin yet,
 * but every call still routes through the owner's `soundColor` mapper, so the day
 * one lands it is a table edit in SkinsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — SkinsKit.soundColor bound to one owner. */
export type SoundColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const SOUND = {
  /** The venue: everything sound does happens on a dark stage. */
  night: 0x1a0616,
  shade: 0x0d030b,
  /** The element's own magenta. */
  magenta: 0xff66cc,
  rose: 0xff99dd,
  blush: 0xffcdee,
  violet: 0x9955cc,
  plum: 0x66225c,
  /** Flow Mode, and the blue note that slows. */
  flow: 0x3388ff,
  /** The Bass note's water charges — the only wet colours in the kit. */
  aqua: 0x22bbdd,
  brine: 0x0a3d66,
  foam: 0xd8f6ff,
  flowPale: 0x9ecdff,
  /** Red notes, and a barrier screeching in Flow. */
  crimson: 0xff3333,
  /** Green hold notes and the sustain beam they open. */
  mint: 0x44ee88,
  mintPale: 0x9cffcc,
  /** Solo, stars, accidentals — anything that is going well. */
  gold: 0xffdd44,
  amber: 0xffaa22,
  /** The bugle, and the caravan's lantern. */
  brass: 0xd9a441,
  brassHi: 0xffe9a8,
  brassShade: 0x8c6420,
  /** Disco ball chrome and the mirror facets on it. */
  chrome: 0xccccff,
  steel: 0x8888aa,
  /** Caravan timber, canvas and the dust it throws. */
  wood: 0x6b4a2c,
  woodDark: 0x3d2916,
  canvas: 0xf2ead8,
  canvasShade: 0xbfae90,
  dust: 0xcfc4b0,
  ink: 0x2b2018,
  ivory: 0xfff4fb,
  white: 0xffffff,
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

/** A rotated ellipse as a polygon — Graphics.fillEllipse can't be turned, and noteheads lean. */
function fillOval(
  g: Phaser.GameObjects.Graphics, cx: number, cy: number, rx: number, ry: number, rot: number, segs = 16,
): void {
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const pts: Pt[] = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * TAU;
    const lx = Math.cos(a) * rx, ly = Math.sin(a) * ry;
    pts.push({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos });
  }
  fillPts(g, pts);
}

// ── The primitive ─────────────────────────────────────────────────────────

export interface RibbonOpts {
  /** Peak lateral swing of the wave. */
  amp?: number;
  /** Wavelengths packed into the run. */
  freq?: number;
  phase?: number;
  /** Peak thickness of the band. */
  width?: number;
  segments?: number;
  /** 0 = a flat-ended bar, 1 = tapers to a point at both ends. */
  taper?: number;
  /** >0 fattens the start, <0 fattens the end. A shot is heavy at the muzzle. */
  bias?: number;
}

/**
 * Sound's primitive: a ribbon of band that snakes along a sine between two points, swelling in
 * the middle and tapering to nothing at both ends.
 *
 * The envelope is the whole trick. A constant-width sine band reads as a drawn squiggle; one
 * whose amplitude *and* thickness die at the ends reads as a pressure wave passing through, which
 * is what every single thing this element does actually is. Everything below — the lance, the
 * ripple, the barrier wall, the crown, the caravan's wake — is this shape wrapped onto a
 * different path.
 */
export function waveRibbon(
  g: Phaser.GameObjects.Graphics,
  x1: number, y1: number, x2: number, y2: number,
  o: RibbonOpts = {},
): void {
  const amp = o.amp ?? 8;
  const freq = o.freq ?? 1.6;
  const phase = o.phase ?? 0;
  const width = o.width ?? 5;
  const segs = o.segments ?? 26;
  const taper = o.taper ?? 1;
  const bias = o.bias ?? 0;

  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;

  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    // Raised-sine envelope, flattened a little so the middle stays fat instead of peaking.
    const env = Math.pow(Math.sin(Math.PI * t), 0.6);
    const shape = 1 - taper * (1 - env);
    const skew = bias >= 0 ? 1 - bias * t * 0.72 : 1 + bias * (1 - t) * 0.72;
    const off = Math.sin(phase + t * freq * TAU) * amp * env;
    const hw = Math.max(0.15, width * 0.5 * shape * skew);
    const cx = x1 + dx * t + nx * off;
    const cy = y1 + dy * t + ny * off;
    top.push({ x: cx + nx * hw, y: cy + ny * hw });
    bot.push({ x: cx - nx * hw, y: cy - ny * hw });
  }
  bot.reverse();
  fillPts(g, top.concat(bot));
}

/**
 * The primitive in three passes: a wide soft haze, the body of the wave, and a thin bright core
 * riding down the middle. A single-pass ribbon looks like a sticker; the core is what makes it
 * look like it is carrying energy.
 */
export function waveRibbonLayered(
  g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
  x1: number, y1: number, x2: number, y2: number,
  color: number, alpha: number, o: RibbonOpts = {},
): void {
  const w = o.width ?? 5;
  g.fillStyle(tint(color), alpha * 0.2);
  waveRibbon(g, x1, y1, x2, y2, { ...o, width: w * 2.6, amp: (o.amp ?? 8) * 1.1 });
  g.fillStyle(tint(color), alpha * 0.82);
  waveRibbon(g, x1, y1, x2, y2, o);
  g.fillStyle(tint(SOUND.white), alpha * 0.95);
  waveRibbon(g, x1, y1, x2, y2, { ...o, width: w * 0.34 });
}

/**
 * A crescent of wavefront — the arc that comes off a bell, a cone, a struck note. Built as a
 * polygon band rather than a stroked arc so it can taper to points at both horns, which is what
 * separates "a wave leaving something" from "a circle segment".
 */
export function waveCrescent(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, angle: number, radius: number, spread: number, thick: number,
  wobble = 0, phase = 0,
): void {
  const segs = Math.max(10, Math.round(spread * 16));
  const outer: Pt[] = [];
  const inner: Pt[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const a = angle - spread + t * spread * 2;
    const env = Math.sin(Math.PI * t);
    const r = radius + Math.sin(phase + t * TAU * 2) * wobble;
    const hw = Math.max(0.1, thick * 0.5 * env);
    outer.push({ x: cx + Math.cos(a) * (r + hw), y: cy + Math.sin(a) * (r + hw) });
    inner.push({ x: cx + Math.cos(a) * (r - hw), y: cy + Math.sin(a) * (r - hw) });
  }
  inner.reverse();
  fillPts(g, outer.concat(inner));
}

/**
 * A closed standing wave: a full ring whose radius rings in and out around the circle. This is
 * the barrier wall, the resonance shell and every shockwave — a plain stroked circle is the one
 * shape this element must never use.
 */
export function rippleBand(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, radius: number, thick: number,
  lobes: number, phase: number, wobble = 0,
): void {
  const segs = Phaser.Math.Clamp(Math.round(radius * 0.9), 26, 96);
  const outer: Pt[] = [];
  const inner: Pt[] = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * TAU;
    const r = radius + Math.sin(a * lobes + phase) * wobble;
    const hw = thick * 0.5 * (0.75 + 0.25 * Math.cos(a * lobes + phase));
    outer.push({ x: cx + Math.cos(a) * (r + hw), y: cy + Math.sin(a) * (r + hw) });
    inner.push({ x: cx + Math.cos(a) * (r - hw), y: cy + Math.sin(a) * (r - hw) });
  }
  inner.reverse();
  fillPts(g, outer.concat(inner));
}

export interface NoteOpts {
  /** 0 = a plain quarter note, 1 = one flag, 2 = a double flag. */
  flags?: number;
  /** Stem points up by default; a note high on the stave hangs its stem down. */
  stemDown?: boolean;
}

/**
 * A real music note: a leaning oval head, a stem off the correct side of it, and flags that curl
 * back toward the head. Sound's second primitive, because this element's whole vocabulary is
 * musical — every pickup, every rhythm hit and every crown card is one of these.
 */
export function musicNote(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, size: number, lean: number, o: NoteOpts = {},
): void {
  const flags = o.flags ?? 1;
  const dir = o.stemDown ? 1 : -1;
  const cos = Math.cos(lean), sin = Math.sin(lean);
  const at = (lx: number, ly: number): Pt => ({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos });

  // Head — an oval tipped off the horizontal, the way engraved notation draws it.
  fillOval(g, cx, cy, size * 0.62, size * 0.44, lean - 0.32);

  // Stem, off the right of an up-stem note and the left of a down-stem one.
  const sx = size * 0.55 * (o.stemDown ? -1 : 1);
  const sTop = dir * size * 2.5;
  fillPts(g, [
    at(sx - size * 0.12, 0), at(sx + size * 0.12, 0),
    at(sx + size * 0.12, sTop), at(sx - size * 0.12, sTop),
  ]);

  // Flags curling back down toward the head.
  for (let f = 0; f < flags; f++) {
    const base = sTop + dir * -f * size * 0.62;
    fillPts(g, [
      at(sx, base),
      at(sx + size * 0.95, base - dir * size * 0.35),
      at(sx + size * 0.8, base - dir * size * 1.15),
      at(sx + size * 0.15, base - dir * size * 0.5),
    ]);
  }
}

/** Layered note: a soft aura behind, the note itself, and a glint on the head. */
export function musicNoteLayered(
  g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
  cx: number, cy: number, size: number, lean: number, color: number, alpha: number, o: NoteOpts = {},
): void {
  g.fillStyle(tint(color), alpha * 0.22);
  musicNote(g, cx, cy, size * 1.5, lean, o);
  g.fillStyle(tint(color), alpha);
  musicNote(g, cx, cy, size, lean, o);
  g.fillStyle(tint(SOUND.white), alpha * 0.8);
  fillOval(g, cx - size * 0.2, cy - size * 0.17, size * 0.16, size * 0.1, lean - 0.32, 8);
}

// ── SoundFx ───────────────────────────────────────────────────────────────

export interface BoomOpts {
  /** Wave petals thrown off the blast. Defaults to radius/14. */
  petals?: number;
  /** Music notes shaken loose. Defaults to radius/22. */
  notes?: number;
  duration?: number;
  depth?: number;
  color?: number;
  /** Leave a ringing mark on the floor. Default true. */
  mark?: boolean;
}

/**
 * One-shot sound effects. Cheap to construct — build one per owner and hand it that owner's
 * colour mapper.
 */
export class SoundFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: SoundColorFn = (c) => c) {
    super(scene, tint);
  }

  // `color: number` is spelled out on every signature below: without it TypeScript infers the
  // literal type of the SOUND default and refuses every other palette entry at the call site.

  /** Blown-out core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 8, color: number = SOUND.magenta): void {
    this.flashIn(x, y, radius, SOUND.white, color, depth);
  }

  /**
   * An expanding front, drawn as a standing wave that rings as it grows. The lobe count falls as
   * the ring widens, so a big blast slows down into a long swell instead of staying corrugated.
   */
  ripple(
    x: number, y: number, fromR: number, toR: number, color: number,
    duration = 420, width = 5, depth = 6, lobes = 7,
  ): void {
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      const fade = 1 - t * t;
      g.fillStyle(this.tint(color), 0.24 * fade);
      rippleBand(g, x, y, r, width * 2.6, lobes, t * 9, r * 0.06);
      g.fillStyle(this.tint(color), 0.85 * fade);
      rippleBand(g, x, y, r, width * (1 - t * 0.4), lobes, t * 9, r * 0.05);
      g.fillStyle(this.tint(SOUND.white), 0.7 * fade);
      rippleBand(g, x, y, r, width * 0.3, lobes, t * 9, r * 0.05);
    });
  }

  /** A fan of wavefronts leaving a point along an aim — the muzzle of anything sound fires. */
  waveBurst(
    x: number, y: number, angle: number, scale = 1, depth = 9,
    color: number = SOUND.magenta, spread = 0.8,
  ): void {
    this.anim(depth, 260, (g, t) => {
      const fade = 1 - t;
      for (let i = 0; i < 3; i++) {
        const lt = Phaser.Math.Clamp(t * 1.7 - i * 0.16, 0, 1);
        if (lt <= 0) continue;
        const r = (8 + lt * 34) * scale;
        g.fillStyle(this.tint(color), 0.75 * fade * (1 - lt * 0.5));
        waveCrescent(g, x, y, angle, r, spread, 6 * scale * (1 - lt * 0.5), 2, t * 12);
      }
      g.fillStyle(this.tint(SOUND.white), 0.85 * fade);
      g.fillCircle(x, y, 5 * scale * (1 - t * 0.5));
    });
  }

  /**
   * The hitscan: a wave ribbon flung down the line with a bright pulse racing along it, plus the
   * fan of wavefronts left behind at the muzzle. Sound's shots are *heard* arriving, so the pulse
   * travelling is more important than the line itself.
   */
  waveLance(
    x1: number, y1: number, x2: number, y2: number, color: number,
    width = 6, depth = 9,
  ): void {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2) || 1;
    this.anim(depth, 300, (g, t) => {
      const fade = 1 - easeIn(t);
      waveRibbonLayered(g, this.tint, x1, y1, x2, y2, color, 0.9 * fade, {
        amp: 7 + t * 9, freq: Math.max(2, dist / 90), phase: t * 14,
        width, taper: 0.85, bias: 0.35, segments: 40,
      });
      // The wavefront itself, running down the beam ahead of the ribbon's fade.
      const f = Phaser.Math.Clamp(t * 1.5, 0, 1);
      const px = x1 + (x2 - x1) * f, py = y1 + (y2 - y1) * f;
      g.fillStyle(this.tint(SOUND.white), 0.9 * fade);
      waveCrescent(g, px, py, ang, 10, 1.1, width * 1.5, 2, t * 20);
    });
    this.waveBurst(x1, y1, ang, width / 6, depth, color);
  }

  /**
   * A full detonation: white core, a boiling body of wave petals, three staggered ripples out of
   * step with each other, notes shaken loose, and a ringing mark left on the floor.
   */
  boom(x: number, y: number, radius: number, o: BoomOpts = {}): void {
    const color = o.color ?? SOUND.magenta;
    const petals = o.petals ?? Math.max(5, Math.round(radius / 14));
    const noteCount = o.notes ?? Math.max(2, Math.round(radius / 22));
    const dur = o.duration ?? Math.round(340 + radius * 1.1);
    const depth = o.depth ?? 7;

    const leaves = Array.from({ length: petals }, (_, i) => ({
      ang: (i / petals) * TAU + Math.random() * 0.3,
      len: 0.6 + Math.random() * 0.5,
      delay: Math.random() * 0.18,
      spread: 0.4 + Math.random() * 0.35,
    }));

    if (o.mark !== false) this.ringMark(x, y, radius * 0.75, depth - 5);
    this.flash(x, y, radius * 0.36, depth + 2, color);

    this.anim(depth, dur, (g, t) => {
      const fade = t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
      for (const l of leaves) {
        const lt = Phaser.Math.Clamp((t - l.delay) / (1 - l.delay), 0, 1);
        if (lt <= 0) continue;
        const r = radius * l.len * easeOut(lt);
        g.fillStyle(this.tint(color), 0.2 * fade);
        waveCrescent(g, x, y, l.ang, r, l.spread, radius * 0.3 * (1 - lt * 0.4), 3, t * 10);
        g.fillStyle(this.tint(SOUND.white), 0.55 * fade * (1 - lt * 0.5));
        waveCrescent(g, x, y, l.ang, r, l.spread * 0.7, radius * 0.09 * (1 - lt * 0.4), 2, t * 14);
      }
    });

    this.ripple(x, y, radius * 0.2, radius * 1.05, color, Math.round(dur * 0.75), 5.5, depth, 8);
    this.scene.time.delayedCall(90, () =>
      this.ripple(x, y, radius * 0.15, radius * 1.35, SOUND.white, dur, 3, depth, 5));
    this.scene.time.delayedCall(190, () =>
      this.ripple(x, y, radius * 0.1, radius * 0.8, color, Math.round(dur * 0.8), 2.4, depth, 11));
    this.notes(x, y, noteCount, { speed: radius * 1.9, size: 5 + radius / 26, depth: depth + 1, color });
  }

  /** Music notes shaken loose by something, drifting up and away as they fade. */
  notes(
    x: number, y: number, count: number,
    o: { speed?: number; spread?: number; angle?: number; size?: number; life?: number; depth?: number; color?: number; rise?: number } = {},
  ): void {
    const speed = o.speed ?? 120;
    const spread = o.spread ?? Math.PI;
    const baseAngle = o.angle ?? 0;
    const size = o.size ?? 6;
    const life = o.life ?? 760;
    const depth = o.depth ?? 8;
    const color = o.color ?? SOUND.rose;
    const rise = o.rise ?? 34;

    const parts = Array.from({ length: count }, (_, i) => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        cos: Math.cos(a), sin: Math.sin(a),
        v: speed * (0.45 + Math.random() * 0.85),
        s: size * (0.75 + Math.random() * 0.6),
        sway: (Math.random() - 0.5) * 22,
        flags: i % 3 === 0 ? 2 : 1,
        down: i % 4 === 0,
        delay: Math.random() * 0.2,
      };
    });

    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        const cx = x + p.cos * d + Math.sin(lt * 6) * p.sway * lt;
        const cy = y + p.sin * d - rise * lt;
        musicNoteLayered(g, this.tint, cx, cy, p.s, Math.sin(lt * 3) * 0.28, color, 0.95 * (1 - lt * lt),
          { flags: p.flags, stemDown: p.down });
      }
    });
  }

  /** A ringing mark left on the floor where something went off, fading as the room settles. */
  ringMark(x: number, y: number, radius: number, depth = 2, color: number = SOUND.violet): void {
    this.anim(depth, 1800, (g, t) => {
      const a = t < 0.08 ? t / 0.08 : 1 - (t - 0.08) / 0.92;
      g.fillStyle(this.tint(SOUND.shade), 0.3 * a);
      g.fillEllipse(x, y, radius * 2, radius * 1.05);
      for (let i = 0; i < 3; i++) {
        g.fillStyle(this.tint(color), 0.34 * a * (1 - i * 0.24));
        const r = radius * (0.42 + i * 0.28);
        rippleBand(g, x, y, r, 3 - i * 0.5, 6, t * 2 + i, r * 0.07);
      }
    });
  }

  /** A tapered wake behind something that moved fast — grapples, dashes, a bounced solo. */
  dashTrail(
    x1: number, y1: number, x2: number, y2: number,
    color: number = SOUND.magenta, width = 12, depth = 4,
  ): void {
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2) || 1;
    this.anim(depth, 340, (g, t) => {
      const fade = 1 - easeIn(t);
      waveRibbonLayered(g, this.tint, x1, y1, x2, y2, color, 0.7 * fade, {
        amp: 6 + t * 12, freq: Math.max(1.5, dist / 110), phase: -t * 10,
        width: width * (1 - t * 0.5), taper: 1, bias: -0.5, segments: 34,
      });
    });
    this.waveBurst(x1, y1, Math.atan2(y1 - y2, x1 - x2), 0.9, depth + 1, color, 1.1);
  }

  /** The clash of a missed beat: two wavefronts arriving out of phase and cancelling badly. */
  discord(x: number, y: number, depth = 9): void {
    this.anim(depth, 420, (g, t) => {
      const fade = 1 - t;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + t * 1.4;
        const r = 12 + t * 40;
        g.fillStyle(this.tint(SOUND.crimson), 0.8 * fade);
        // Deliberately mismatched wobble on each arm — the shape itself is out of tune.
        waveCrescent(g, x, y, a, r, 0.34, 7 * (1 - t * 0.6), 5, t * 40 + i * 2);
      }
      g.fillStyle(this.tint(SOUND.crimson), 0.5 * fade);
      g.fillCircle(x, y, 6 * (1 + t));
    });
  }

  /** Sparks of gold thrown off anything that just went right — hits, stars, grace notes. */
  sparkle(x: number, y: number, count: number, radius: number, depth = 10, color: number = SOUND.gold): void {
    const motes = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * radius * 1.7,
      oy: (Math.random() - 0.5) * radius * 1.3,
      drift: (Math.random() - 0.5) * 26,
      r: 1.6 + Math.random() * 2.2,
      phase: Math.random() * TAU,
      delay: Math.random() * 0.28,
    }));
    this.anim(depth, 780, (g, t) => {
      for (const m of motes) {
        const lt = (t - m.delay) / (1 - m.delay);
        if (lt <= 0) continue;
        const cx = x + m.ox + m.drift * lt;
        const cy = y + m.oy - 24 * lt;
        const tw = Math.max(0, Math.sin(t * 12 + m.phase));
        if (tw <= 0.02) continue;
        g.fillStyle(this.tint(color), 0.9 * (1 - lt) * tw);
        // Four-point star: two crossed slivers, which is what a highlight actually looks like.
        fillPts(g, [
          { x: cx - m.r * 5 * tw, y: cy }, { x: cx, y: cy - m.r * 0.8 },
          { x: cx + m.r * 5 * tw, y: cy }, { x: cx, y: cy + m.r * 0.8 },
        ]);
        fillPts(g, [
          { x: cx, y: cy - m.r * 5 * tw }, { x: cx + m.r * 0.8, y: cy },
          { x: cx, y: cy + m.r * 5 * tw }, { x: cx - m.r * 0.8, y: cy },
        ]);
      }
    });
  }

  /**
   * The barrier shattering: plates of standing wave breaking off the shell and spinning away.
   * Arcs rather than shards, because what broke was a ring, and the pieces should look like it.
   */
  shatter(x: number, y: number, radius = 30, count = 9, depth = 9, color: number = SOUND.white): void {
    const bits = Array.from({ length: count }, (_, i) => ({
      ang: (i / count) * TAU + 0.2,
      spin: (Math.random() - 0.5) * 8,
      v: 60 + Math.random() * 90,
    }));
    this.anim(depth, 520, (g, t) => {
      const fade = 1 - t * t;
      for (const b of bits) {
        const d = radius + b.v * easeOut(t);
        const cx = x + Math.cos(b.ang) * d;
        const cy = y + Math.sin(b.ang) * d + 40 * t * t;
        g.fillStyle(this.tint(color), 0.9 * fade);
        waveCrescent(g, cx, cy, b.ang + b.spin * t, 9, 0.9, 4.5 * fade, 1, t * 12);
      }
    });
  }

  /**
   * Inward-gathering charge: ripples closing on a point while wavefronts spiral in. `follow`
   * lets it track a caster who can still move.
   */
  gather(
    x: number, y: number, radius: number, duration: number,
    follow?: () => { x: number; y: number } | null,
    depth = 6, color: number = SOUND.magenta,
  ): void {
    const feeds = Array.from({ length: 8 }, (_, i) => ({
      ang: (i / 8) * TAU,
      spin: 0.6 + (i % 3) * 0.3,
      phase: i / 8,
    }));
    this.anim(depth, duration, (g, t) => {
      const pos = follow?.() ?? null;
      const cx = pos ? pos.x : x;
      const cy = pos ? pos.y : y;
      for (const f of feeds) {
        const lt = (t * (1 + f.phase) + f.phase) % 1;
        const r = radius * (1 - easeIn(lt));
        const a = f.ang + t * f.spin * TAU;
        g.fillStyle(this.tint(color), 0.8 * (1 - lt * 0.55));
        waveCrescent(g, cx, cy, a, r, 0.5, 6 * (1 - lt * 0.4), 2, t * 16);
      }
      // The containment ring closing around whatever is being wound up.
      g.fillStyle(this.tint(SOUND.white), 0.35 + 0.4 * easeIn(t));
      rippleBand(g, cx, cy, radius * (1 - easeIn(t) * 0.55), 2.6, 9, t * 8, 3);
    });
  }

  // ── Per-frame painters ──────────────────────────────────────────────────
  // Drawn into a Graphics the caller already owns and positions, because these ride on live
  // gameplay state (a barrier's remaining life, a beam's endpoints, a wagon's wheel phase).

  /**
   * A sustained beam between two points: three ribbons out of phase with each other, so the beam
   * visibly *carries* a note rather than just connecting two dots.
   */
  static drawSustainBeam(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    x1: number, y1: number, x2: number, y2: number, t: number, color: number, alpha = 1,
  ): void {
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2) || 1;
    const freq = Math.max(2, dist / 70);
    for (let i = 0; i < 3; i++) {
      waveRibbonLayered(g, tint, x1, y1, x2, y2, color, alpha * (i === 0 ? 0.9 : 0.42), {
        amp: 5 + i * 5, freq, phase: t * (9 + i * 3) + i * 2, width: 6 - i * 1.6,
        taper: 0.7, segments: 44,
      });
    }
    const ang = Math.atan2(y2 - y1, x2 - x1);
    g.fillStyle(tint(SOUND.white), alpha * 0.9);
    waveCrescent(g, x2, y2, ang + Math.PI, 12, 1.2, 6, 2, t * 18);
  }

  /**
   * The Screech Barrier: a standing wave held in a circle, ringing in place. Drawn hollow — the
   * wall is what bites and the quiet middle is safe, so the art says exactly what the damage does.
   */
  static drawBarrier(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    x: number, y: number, radius: number, band: number, t: number,
    color: number, alpha = 1, star = false,
  ): void {
    const pulse = 0.72 + 0.28 * Math.sin(t * 5.5);

    // The quiet middle, marked just enough to read as a place you can stand.
    g.fillStyle(tint(SOUND.shade), alpha * 0.16);
    g.fillCircle(x, y, radius - band);

    if (star) {
      // Starsong: five arms of wave instead of a closed ring, sweeping as the star tracks.
      for (let i = 0; i < 5; i++) {
        const a = t * 0.9 + (i / 5) * TAU - Math.PI / 2;
        for (const [rr, w, al] of [[radius * 0.98, band * 0.9, 0.85], [radius * 0.7, band * 0.5, 0.5]] as const) {
          g.fillStyle(tint(i % 2 === 0 ? SOUND.gold : color), alpha * al * pulse);
          waveCrescent(g, x, y, a, rr, 0.42, w, 3, t * 8);
        }
      }
      g.fillStyle(tint(SOUND.gold), alpha * 0.7 * pulse);
      rippleBand(g, x, y, radius * 0.36, 3, 5, t * 3, 4);
      return;
    }

    // The wall: a thick standing wave, a thinner counter-wave running the other way inside it.
    g.fillStyle(tint(color), alpha * 0.26 * pulse);
    rippleBand(g, x, y, radius - band * 0.5, band * 1.5, 12, t * 2.4, band * 0.22);
    g.fillStyle(tint(color), alpha * 0.8 * pulse);
    rippleBand(g, x, y, radius - band * 0.5, band * 0.72, 12, t * 2.4, band * 0.2);
    g.fillStyle(tint(SOUND.white), alpha * 0.55 * pulse);
    rippleBand(g, x, y, radius - band * 0.5, band * 0.2, 12, -t * 3.6, band * 0.16);

    // Emitter posts around the wall, so the ring reads as something that was *placed*.
    for (let i = 0; i < 6; i++) {
      const a = -t * 0.6 + (i / 6) * TAU;
      const px = x + Math.cos(a) * (radius - band * 0.5);
      const py = y + Math.sin(a) * (radius - band * 0.5);
      g.fillStyle(tint(SOUND.white), alpha * 0.9);
      g.fillCircle(px, py, 2.4 + Math.sin(t * 7 + i) * 0.7);
    }
  }

  /**
   * A rhythm note as it sits on the track: the note glyph, a ringing tail behind it that says
   * which way it is travelling, and a hold note drawn as a long tied bar instead.
   */
  static drawTrackNote(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    width: number, color: number, hold: boolean, t: number,
  ): void {
    g.clear();
    if (hold) {
      const w = width / 2;
      // A tied bar: the sustained line, a wave running along it, and a head at the near end.
      g.fillStyle(tint(color), 0.28);
      g.fillRoundedRect(-w, -11, width, 22, 8);
      g.fillStyle(tint(color), 0.75);
      g.fillRoundedRect(-w, -7, width, 14, 6);
      g.fillStyle(tint(SOUND.white), 0.85);
      waveRibbon(g, -w + 4, 0, w - 4, 0, { amp: 4, freq: 3.2, phase: t * 7, width: 3, taper: 0.6, segments: 30 });
      g.fillStyle(tint(color), 1);
      musicNote(g, -w + 9, 2, 6, 0, { flags: 0 });
      return;
    }
    // Ringing tail, trailing the note back up the track.
    for (let i = 0; i < 2; i++) {
      g.fillStyle(tint(color), 0.24 - i * 0.08);
      waveCrescent(g, width * 0.1, 0, 0, width * (0.5 + i * 0.32), 0.9, 5 - i * 1.4, 1.5, t * 9);
    }
    g.fillStyle(tint(color), 0.3);
    g.fillCircle(0, 0, width * 0.52);
    musicNoteLayered(g, tint, -1, 3, width * 0.34, 0, color, 1, { flags: 1 });
  }

  /**
   * A brass bugle at the caster's lips: mouthpiece, a tube that runs out, loops back under itself
   * and comes forward again, then flares into the bell. The polish along the top of the tube is
   * what makes it read as brass rather than as a bent pipe.
   */
  static drawBugle(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    x: number, y: number, dir: 1 | -1, t = 0,
  ): void {
    const s = dir;
    const bx = x + s * 6;
    const by = y - 6;
    g.clear();

    // Mouthpiece.
    g.fillStyle(tint(SOUND.brassShade), 1);
    g.fillCircle(bx, by, 3.5);

    // Tube: out, back under, out again.
    g.lineStyle(5, tint(SOUND.brass), 1);
    strokePts(g, [
      { x: bx, y: by }, { x: bx + s * 18, y: by - 2 }, { x: bx + s * 25, y: by + 8 },
      { x: bx + s * 9, y: by + 11 }, { x: bx + s * 16, y: by + 2 }, { x: bx + s * 34, y: by - 1 },
    ]);

    // Bell.
    g.fillStyle(tint(SOUND.brass), 1);
    fillPts(g, [
      { x: bx + s * 32, y: by - 5 }, { x: bx + s * 50, y: by - 15 },
      { x: bx + s * 50, y: by + 13 }, { x: bx + s * 32, y: by + 4 },
    ]);
    g.lineStyle(2.5, tint(SOUND.brassHi), 0.95);
    strokePts(g, [{ x: bx + s * 50, y: by - 15 }, { x: bx + s * 50, y: by + 13 }]);

    // Polish along the top of the tube.
    g.lineStyle(1.5, tint(SOUND.brassHi), 0.8);
    strokePts(g, [{ x: bx + s * 3, y: by - 3 }, { x: bx + s * 18, y: by - 5 }]);

    // The call itself leaving the bell.
    for (let i = 0; i < 3; i++) {
      const lt = (t * 1.6 + i / 3) % 1;
      g.fillStyle(tint(SOUND.brassHi), 0.8 * (1 - lt));
      waveCrescent(g, bx + s * 50, by - 1, s > 0 ? 0 : Math.PI, 8 + lt * 34, 0.75, 7 * (1 - lt * 0.6), 2, t * 14);
    }
  }

  /**
   * The caravan: a covered wagon under a ribbed canvas arch, on two spoked wheels that turn with
   * the distance travelled, throwing dust off the back and still trailing the horn call that
   * summoned it — it is a wagon called up by a note, not a wagon that drove here.
   */
  static drawCaravan(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    x: number, y: number, dir: 1 | -1, bodyW: number, wheelPhase: number, t: number,
  ): void {
    const s = dir;
    const halfW = bodyW / 2;
    const bedTop = y - 2;
    const bedH = 26;
    const archTop = y - 48;

    g.clear();

    // Dust boiling off the back.
    g.fillStyle(tint(SOUND.dust), 0.26);
    for (let i = 0; i < 5; i++) {
      g.fillCircle(x - s * (halfW + 6 + i * 20), y + 26 - i * 3, 10 + i * 5);
    }

    // The horn call still ringing out behind the wagon.
    const back = s > 0 ? Math.PI : 0;
    for (let i = 0; i < 3; i++) {
      const lt = (t * 0.9 + i / 3) % 1;
      g.fillStyle(tint(SOUND.brassHi), 0.34 * (1 - lt));
      waveCrescent(g, x - s * (halfW + 4), y - 6, back, 22 + lt * 52, 0.7, 8 * (1 - lt * 0.5), 3, t * 10);
    }

    // Wheels sit behind the bed, so they are drawn first.
    const wheelR = 21;
    for (const wx of [-halfW + 30, halfW - 30]) {
      const cx = x + wx;
      const cy = y + 20;
      g.fillStyle(tint(SOUND.ink), 1);
      g.fillCircle(cx, cy, wheelR);
      g.fillStyle(tint(SOUND.wood), 1);
      g.fillCircle(cx, cy, wheelR - 4);
      g.lineStyle(2.5, tint(SOUND.canvasShade), 0.9);
      for (let i = 0; i < 8; i++) {
        const a = wheelPhase + (i / 8) * TAU;
        strokePts(g, [{ x: cx, y: cy }, { x: cx + Math.cos(a) * (wheelR - 5), y: cy + Math.sin(a) * (wheelR - 5) }]);
      }
      g.lineStyle(3, tint(SOUND.canvas), 1);
      g.strokeCircle(cx, cy, wheelR);
      g.fillStyle(tint(SOUND.canvas), 1);
      g.fillCircle(cx, cy, 4);
    }

    // Plank bed.
    g.fillStyle(tint(SOUND.wood), 1);
    g.fillRect(x - halfW, bedTop, bodyW, bedH);
    g.lineStyle(1.5, tint(SOUND.woodDark), 0.75);
    for (let i = 1; i < 6; i++) {
      const px = x - halfW + (bodyW / 6) * i;
      strokePts(g, [{ x: px, y: bedTop }, { x: px, y: bedTop + bedH }]);
    }
    g.lineStyle(3, tint(SOUND.woodDark), 1);
    g.strokeRect(x - halfW, bedTop, bodyW, bedH);

    // Canvas arch over the bed.
    const archPoint = (f: number): Pt => ({
      x: x - halfW + 4 + f * (bodyW - 8),
      y: bedTop - Math.sin(f * Math.PI) * (bedTop - archTop),
    });
    const arch: Pt[] = [{ x: x - halfW + 4, y: bedTop }];
    for (let i = 0; i <= 24; i++) arch.push(archPoint(i / 24));
    arch.push({ x: x + halfW - 4, y: bedTop });
    g.fillStyle(tint(SOUND.canvas), 0.97);
    fillPts(g, arch);
    g.lineStyle(2, tint(SOUND.canvasShade), 1);
    strokePts(g, arch, true);

    // Ribs under the canvas.
    g.lineStyle(2, tint(SOUND.canvasShade), 0.85);
    for (let i = 1; i < 5; i++) {
      const p = archPoint(i / 5);
      strokePts(g, [{ x: p.x, y: bedTop }, p]);
    }

    // The open mouth of the canopy at the leading edge.
    g.fillStyle(tint(SOUND.ink), 0.5);
    g.fillEllipse(x + s * (halfW - 8), y - 20, 12, 36);

    // Lantern swinging off the front post.
    const lx = x + s * (halfW + 6);
    const ly = bedTop - 6;
    g.lineStyle(2, tint(SOUND.woodDark), 1);
    strokePts(g, [{ x: x + s * (halfW - 2), y: bedTop - 14 }, { x: lx, y: ly - 6 }]);
    g.fillStyle(tint(SOUND.amber), 0.35);
    g.fillCircle(lx, ly, 11);
    g.fillStyle(tint(SOUND.brassHi), 1);
    g.fillCircle(lx, ly, 5);
    g.lineStyle(1.5, tint(SOUND.wood), 1);
    g.strokeCircle(lx, ly, 5.5);
  }

  /**
   * A disco ball: a chrome sphere cut into mirror facets that catch the light in bands, with
   * beams of colour sweeping out of it across the stage.
   */
  static drawDiscoBall(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    x: number, y: number, r: number, t: number, beamLen: number, alpha = 1,
  ): void {
    // Beams sweeping the room, drawn first so the ball sits on top of its own light.
    for (let i = 0; i < 8; i++) {
      const a = t * 0.9 + (i / 8) * TAU;
      const col = i % 3 === 0 ? SOUND.magenta : i % 3 === 1 ? SOUND.flow : SOUND.gold;
      g.fillStyle(tint(col), alpha * 0.1);
      fillPts(g, [
        { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r },
        { x: x + Math.cos(a - 0.09) * beamLen, y: y + Math.sin(a - 0.09) * beamLen },
        { x: x + Math.cos(a + 0.09) * beamLen, y: y + Math.sin(a + 0.09) * beamLen },
      ]);
    }

    // Cord.
    g.lineStyle(2, tint(SOUND.steel), alpha * 0.9);
    strokePts(g, [{ x, y: y - r - 44 }, { x, y: y - r }]);

    g.fillStyle(tint(SOUND.steel), alpha);
    g.fillCircle(x, y, r);
    g.fillStyle(tint(SOUND.chrome), alpha);
    g.fillCircle(x - r * 0.1, y - r * 0.12, r * 0.9);

    // Facets: latitude bands cut into tiles, each catching the light on its own phase.
    for (let row = -2; row <= 2; row++) {
      const ry = y + row * r * 0.36;
      const halfChord = Math.sqrt(Math.max(0, r * r - (ry - y) * (ry - y)));
      const tiles = 7;
      for (let c = 0; c < tiles; c++) {
        const f = (c + 0.5) / tiles;
        const px = x - halfChord + f * halfChord * 2;
        const lit = 0.25 + 0.6 * Math.max(0, Math.sin(t * 4 + c * 1.3 + row));
        g.fillStyle(tint(lit > 0.6 ? SOUND.white : SOUND.chrome), alpha * lit);
        g.fillRect(px - halfChord / tiles * 0.8, ry - r * 0.15, (halfChord / tiles) * 1.6, r * 0.3);
      }
    }
    g.lineStyle(1.4, tint(SOUND.steel), alpha * 0.7);
    g.strokeCircle(x, y, r);
    g.fillStyle(tint(SOUND.white), alpha * 0.9);
    g.fillCircle(x - r * 0.35, y - r * 0.4, r * 0.16);
  }

  /**
   * The stage: a lit riser with a checker front, footlights along the lip and a haze of light
   * standing over the boards.
   */
  static drawStage(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    x: number, y: number, w: number, t: number, alpha = 1,
  ): void {
    const halfW = w / 2;
    g.fillStyle(tint(SOUND.shade), alpha * 0.45);
    g.fillEllipse(x, y + 16, w * 1.25, 22);

    // Riser body + deck.
    g.fillStyle(tint(SOUND.night), alpha);
    g.fillRect(x - halfW, y - 8, w, 24);
    g.fillStyle(tint(SOUND.plum), alpha);
    g.fillRect(x - halfW, y - 13, w, 8);
    g.lineStyle(2, tint(SOUND.magenta), alpha * 0.9);
    g.strokeRect(x - halfW, y - 13, w, 29);

    // Checker front skirt.
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) continue;
      g.fillStyle(tint(SOUND.violet), alpha * 0.6);
      g.fillRect(x - halfW + i * (w / 10), y - 5, w / 10, 21);
    }

    // Footlights along the lip, each on its own beat.
    for (let i = 0; i < 7; i++) {
      const lx = x - halfW + (i + 0.5) * (w / 7);
      const lit = 0.4 + 0.6 * Math.max(0, Math.sin(t * 6 + i));
      g.fillStyle(tint(SOUND.gold), alpha * lit * 0.4);
      g.fillCircle(lx, y - 13, 9);
      g.fillStyle(tint(SOUND.brassHi), alpha * lit);
      g.fillCircle(lx, y - 13, 3);
    }
  }

  /**
   * An electric guitar held across the performer: body with a cutaway horn, pickups, a fretted
   * neck, six strings and a headstock. `strum` drives the pick hand and rings the strings.
   */
  static drawGuitar(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    x: number, y: number, lean: number, scale: number, strum: number, alpha = 1,
  ): void {
    const cos = Math.cos(lean), sin = Math.sin(lean);
    const at = (lx: number, ly: number): Pt => ({
      x: x + lx * scale * cos - ly * scale * sin,
      y: y + lx * scale * sin + ly * scale * cos,
    });

    // Neck, running up to the right.
    g.fillStyle(tint(SOUND.woodDark), alpha);
    fillPts(g, [at(4, -3.4), at(40, -2.6), at(40, 2.6), at(4, 3.4)]);
    // Frets.
    g.lineStyle(1, tint(SOUND.chrome), alpha * 0.8);
    for (let i = 1; i < 9; i++) {
      const f = 4 + i * 4;
      strokePts(g, [at(f, -3), at(f, 3)]);
    }
    // Headstock.
    g.fillStyle(tint(SOUND.ink), alpha);
    fillPts(g, [at(40, -4), at(50, -5.5), at(50, 4.5), at(40, 4)]);

    // Body: a rounded slab with a cutaway horn on the neck side.
    g.fillStyle(tint(SOUND.crimson), alpha);
    fillPts(g, [
      at(-16, -9), at(-6, -12), at(4, -9), at(9, -4),
      at(6, 3), at(9, 9), at(0, 13), at(-11, 12), at(-17, 5), at(-18, -3),
    ]);
    g.fillStyle(tint(SOUND.ink), alpha * 0.85);
    // Pickups + bridge.
    fillPts(g, [at(-6, -5), at(1, -5), at(1, 5), at(-6, 5)]);
    g.fillStyle(tint(SOUND.chrome), alpha);
    fillPts(g, [at(-13, -4), at(-10, -4), at(-10, 5), at(-13, 5)]);

    // Strings, ringing right after a strum.
    const ring = Math.max(0, 1 - strum);
    for (let i = 0; i < 6; i++) {
      const off = -2.6 + i * 1.05;
      const wob = Math.sin(strum * 26 + i * 1.7) * ring * 1.1;
      g.lineStyle(0.8, tint(SOUND.chrome), alpha * (0.55 + ring * 0.45));
      strokePts(g, [at(-12, off), at(48, off + wob * 0.3)]);
    }

    // Pick hand blur over the bridge while strumming.
    if (ring > 0.05) {
      g.fillStyle(tint(SOUND.white), alpha * ring * 0.5);
      fillOval(g, at(-11, 0).x, at(-11, 0).y, 6 * scale, 2.4 * scale, lean);
    }
  }

  /**
   * The Harmony grenade: a sealed brass resonator with a wave rattling around inside it and a
   * fuse ring that closes as it comes due.
   */
  static drawGrenade(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    x: number, y: number, t: number, fuse: number, alpha = 1,
  ): void {
    g.fillStyle(tint(SOUND.shade), alpha * 0.35);
    g.fillEllipse(x, y + 11, 16, 6);

    g.fillStyle(tint(SOUND.magenta), alpha * 0.2);
    g.fillCircle(x, y, 15 + Math.sin(t * 9) * 2);
    g.fillStyle(tint(SOUND.brass), alpha);
    g.fillCircle(x, y, 9);
    g.fillStyle(tint(SOUND.plum), alpha);
    g.fillCircle(x, y, 6.4);

    // The wave trapped inside, faster the closer the fuse is to running out.
    g.fillStyle(tint(SOUND.rose), alpha * 0.95);
    waveRibbon(g, x - 6, y, x + 6, y, { amp: 3, freq: 1.6, phase: t * (10 + fuse * 26), width: 3, taper: 1 });

    // Rim, ribs and the fuse ring closing in.
    g.lineStyle(1.6, tint(SOUND.brassHi), alpha * 0.9);
    g.strokeCircle(x, y, 9);
    g.fillStyle(tint(SOUND.brassHi), alpha);
    g.fillRect(x - 2, y - 13, 4, 5);
    g.lineStyle(2.4, tint(SOUND.white), alpha * (0.4 + fuse * 0.6));
    g.beginPath();
    g.arc(x, y, 14, -Math.PI / 2, -Math.PI / 2 + TAU * Phaser.Math.Clamp(fuse, 0, 1), false);
    g.strokePath();
  }

  /**
   * A Bass charge waiting to go off: a bulging drop of water held together by the note
   * ringing inside it, with a fuse ring closing around it.
   *
   * `fuse` runs 1 → 0. The drop swells and the ring tightens as it comes due, so a row of
   * seven of them reads as a countdown running down the line rather than seven identical blobs.
   */
  static drawBassCharge(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    x: number, y: number, t: number, fuse: number, alpha = 1,
  ): void {
    const swell = 1 + (1 - fuse) * 0.45;
    const r = 11 * swell;

    g.fillStyle(tint(SOUND.shade), alpha * 0.35);
    g.fillEllipse(x, y + 12, 18 * swell, 6);

    // The body of water: a heavy base with a lighter crown, wobbling on its own beat.
    const wob = Math.sin(t * 7 + x * 0.05) * 1.4;
    g.fillStyle(tint(SOUND.aqua), alpha * 0.22);
    g.fillCircle(x, y, r * 1.5);
    g.fillStyle(tint(SOUND.brine), alpha * 0.95);
    g.fillEllipse(x, y + 1, r * 2 + wob, r * 1.9 - wob);
    g.fillStyle(tint(SOUND.aqua), alpha * 0.9);
    g.fillEllipse(x, y - 1, r * 1.4, r * 1.3);
    // Highlight — a drop is only readable as water once something glints off it.
    g.fillStyle(tint(SOUND.foam), alpha * 0.85);
    g.fillEllipse(x - r * 0.35, y - r * 0.4, r * 0.42, r * 0.3);

    // The note trapped inside, ringing harder the closer it gets.
    g.fillStyle(tint(SOUND.foam), alpha * 0.9);
    musicNote(g, x, y + 1, 4.6, Math.sin(t * 3) * 0.15, { flags: 0 });
    g.fillStyle(tint(SOUND.foam), alpha * 0.3);
    rippleBand(g, x, y, r * 1.6, 2, 7, t * (4 + (1 - fuse) * 12), 1.4);

    // Fuse ring closing in.
    g.lineStyle(2.2, tint(SOUND.foam), alpha * (0.35 + (1 - fuse) * 0.6));
    g.beginPath();
    g.arc(x, y, r * 1.8, -Math.PI / 2, -Math.PI / 2 + TAU * Phaser.Math.Clamp(fuse, 0, 1), false);
    g.strokePath();
  }

  /** A music-note pickup lying on the ground, bobbing and ringing to be collected. */
  static drawNotePickup(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    x: number, y: number, t: number, phase: number, alpha = 1,
  ): void {
    const bob = Math.sin(t * 3 + phase) * 3;
    g.fillStyle(tint(SOUND.shade), alpha * 0.3);
    g.fillEllipse(x, y + 10, 13, 5);
    g.fillStyle(tint(SOUND.gold), alpha * 0.22);
    rippleBand(g, x, y + bob, 12 + Math.sin(t * 4 + phase) * 2, 2.4, 6, t * 3, 1.6);
    musicNoteLayered(g, tint, x, y + bob, 6, Math.sin(t * 2 + phase) * 0.2, SOUND.gold, alpha, { flags: 1 });
  }
}

// ── SoundAura ─────────────────────────────────────────────────────────────

export type SoundAuraStyle =
  | 'flow'        // Flow Mode: cold standing waves running up the body
  | 'solo'        // On stage: a gold spotlight pool and rising sparks
  | 'resonance'   // Mastery passive: the shield shell, ringing at its own pitch
  | 'harmony'     // Harmony perk: stars orbiting on a shallow ellipse
  | 'vibration';  // Run down by the caravan: the victim shaking itself apart

/**
 * A persistent field riding on a fighter. One Graphics, driven by whoever owns it.
 *
 * The styles differ in *shape*, not tint: flow climbs, solo pools, resonance encloses, harmony
 * orbits, vibration blurs. Several can be up at once and must stay separable.
 */
export class SoundAura {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private intensity = 1;

  constructor(
    scene: Phaser.Scene,
    private tint: SoundColorFn,
    private style: SoundAuraStyle,
    private radius: number,
    depth = 3,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  /** For resonance this is the shield's size relative to its announce step; elsewhere a buff scale. */
  setIntensity(v: number): void { this.intensity = v; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;
    const k = this.intensity;
    const r = this.radius;

    switch (this.style) {
      case 'flow': {
        // Cold wavefronts climbing the body — Flow is the track running away from you.
        g.fillStyle(this.tint(SOUND.flow), 0.1 * alpha);
        g.fillCircle(x, y, r * 1.05);
        for (let i = 0; i < 4; i++) {
          const p = (this.t * 1.5 + i / 4) % 1;
          const lift = (0.5 - p) * r * 2.4;
          const fade = 1 - Math.abs(p - 0.5) * 1.7;
          g.fillStyle(this.tint(i % 2 === 0 ? SOUND.flow : SOUND.flowPale), 0.75 * alpha * Math.max(0, fade));
          waveRibbon(g, x - r * 0.95, y + lift, x + r * 0.95, y + lift,
            { amp: 4, freq: 1.8, phase: this.t * 8 + i, width: 3.4, taper: 1, segments: 22 });
        }
        break;
      }
      case 'solo': {
        // The spotlight pool the performer stands in, with sparks rising out of it.
        g.fillStyle(this.tint(SOUND.gold), 0.12 * alpha);
        g.fillEllipse(x, y + 12, r * 2.6 * k, r * 1.1 * k);
        g.fillStyle(this.tint(SOUND.brassHi), 0.16 * alpha);
        g.fillEllipse(x, y + 12, r * 1.6 * k, r * 0.7 * k);
        for (let i = 0; i < 5; i++) {
          const p = (this.t * 0.9 + i / 5) % 1;
          const sx = x + Math.sin(i * 2.1 + this.t) * r * 0.8;
          g.fillStyle(this.tint(SOUND.gold), 0.85 * (1 - p) * alpha);
          g.fillCircle(sx, y + 12 - p * r * 2.2, 2.2 * (1 - p * 0.5));
        }
        break;
      }
      case 'resonance': {
        // The barrier itself: a shell of standing wave, thicker the more shield is banked.
        const shell = r * (0.95 + Math.min(0.6, k * 0.25));
        g.fillStyle(this.tint(SOUND.white), 0.09 * alpha);
        g.fillCircle(x, y, shell);
        for (let i = 0; i < 2; i++) {
          g.fillStyle(this.tint(i === 0 ? SOUND.white : SOUND.blush), (0.55 - i * 0.22) * alpha);
          rippleBand(g, x, y, shell - i * 5, 2.6 - i * 0.8, 10 + i * 4,
            (i === 0 ? 1 : -1) * this.t * 2.4, 2.4);
        }
        break;
      }
      case 'harmony': {
        // Stars on a shallow orbit — the stacking buff you can count at a glance.
        for (let i = 0; i < 5; i++) {
          const a = this.t * 1.7 + (i / 5) * TAU;
          const sx = x + Math.cos(a) * r;
          const sy = y + Math.sin(a) * r * 0.5;
          const tw = 0.6 + 0.4 * Math.sin(this.t * 7 + i);
          g.fillStyle(this.tint(SOUND.gold), 0.9 * alpha * tw);
          for (let s = 0; s < 4; s++) {
            const sa = (s / 4) * TAU + a;
            fillPts(g, [
              { x: sx, y: sy },
              { x: sx + Math.cos(sa - 0.35) * 3, y: sy + Math.sin(sa - 0.35) * 3 },
              { x: sx + Math.cos(sa) * 8 * tw, y: sy + Math.sin(sa) * 8 * tw },
              { x: sx + Math.cos(sa + 0.35) * 3, y: sy + Math.sin(sa + 0.35) * 3 },
            ]);
          }
          g.fillStyle(this.tint(SOUND.white), alpha);
          g.fillCircle(sx, sy, 1.8);
        }
        break;
      }
      case 'vibration': {
        // Ghost outlines shaken off the victim, so a vibrating fighter reads between ticks.
        for (let i = 0; i < 3; i++) {
          const ox = Math.sin(this.t * 41 + i * 2.2) * (3 + i * 1.6);
          const oy = Math.cos(this.t * 37 + i * 1.7) * (2 + i);
          g.lineStyle(1.6, this.tint(SOUND.blush), (0.5 - i * 0.14) * alpha);
          g.strokeCircle(x + ox, y + oy, r * 0.85);
        }
        for (let i = 0; i < 2; i++) {
          const p = (this.t * 1.8 + i / 2) % 1;
          g.fillStyle(this.tint(SOUND.white), 0.5 * (1 - p) * alpha);
          rippleBand(g, x, y, r * (0.7 + p * 0.9), 2, 9, this.t * 6, 2.4);
        }
        break;
      }
    }
  }

  destroy(): void { this.g.destroy(); }
}

// ── SoundAvatar ───────────────────────────────────────────────────────────

/** Concentric discs of one amp-cone ball hand, outermost first. */
const SOUND_AVATAR: AvatarSpec = {
  hands: [
    { r: 11, color: SOUND.magenta, alpha: 0.24 },
    { r: 7, color: SOUND.violet, alpha: 0.92 },
    { r: 4.2, color: SOUND.magenta, alpha: 1 },
    { r: 1.6, color: SOUND.blush, alpha: 1, ox: -2, oy: -2 },
  ],
  eyeWhite: SOUND.ivory,
  eyePupil: SOUND.night,
  // A drummer's hands: they snap, and they smear hard on the way through a beat.
  squash: { div: 12, x: 0.55, y: 0.3 },
};

/**
 * The sound character rig: two speaker-cone ball hands, a pair of eyes, and a chord of music
 * notes hovering over the crown, each bobbing on its own beat. Hands, eyes and gestures come from
 * BaseAvatar; what sound adds is the wave pooling underfoot and the notes held overhead.
 */
export class SoundAvatar extends BaseAvatar {
  private fx: SoundFx;
  /** Warm palette for the player, cool for the NPC, so two sound fighters never blur together. */
  private accent: number;

  constructor(scene: Phaser.Scene, tint: SoundColorFn, owner: 'player' | 'npc' = 'player', depth = 6) {
    super(scene, tint, depth, SOUND_AVATAR);
    this.fx = new SoundFx(scene, tint);
    this.accent = owner === 'player' ? SOUND.magenta : SOUND.flow;
    if (owner === 'npc') {
      this.forEachHandLayer(0, (halo) => halo.setFillStyle(this.tint(SOUND.flow), 0.24));
      this.forEachHandLayer(2, (core) => core.setFillStyle(this.tint(SOUND.flowPale), 1));
    }
  }

  /**
   * Mastery tell — a permanent, readable upgrade to the character, so a mastered sound user is
   * identifiable before they play a note: brass eyes, a brass rim and wider cone on each hand, a
   * four-note chord over the crown instead of two, and the resonance shell ringing around the
   * body. Shape changes, not brighter tints — a tint alone vanishes at gameplay zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? SOUND.brassHi : SOUND.ivory);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 14.5 : 11);
      halo.setFillStyle(this.tint(on ? SOUND.brass : this.accent), on ? 0.3 : 0.24);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.8, this.tint(SOUND.brassHi), 0.95);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands shed notes. */
  protected emitTrail(x: number, y: number): void {
    this.fx.notes(x, y, 1, { speed: 18, size: 5, life: 620, depth: 5, color: this.accent, rise: 20 });
  }

  /** Working an instrument: hands held close and low, picking rather than pushing. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    const pick = Math.sin(this.t * 18 + side * 1.6);
    return {
      ang: this.facing + side * (side > 0 ? 0.55 : 1.5),
      dist: 20 + pick * 4,
      scale: idle.scale * (1.05 + Math.abs(pick) * 0.15),
    };
  }

  /** The wave pooling underfoot — the room ringing around whoever is standing in it. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const k = this.intensity;
    g.fillStyle(this.tint(SOUND.plum), a * 0.3 * k);
    g.fillEllipse(x, y + 7, 54 * k, 24 * k);
    for (let i = 0; i < 2; i++) {
      const p = (this.t * 0.8 + i / 2) % 1;
      g.fillStyle(this.tint(this.accent), a * 0.4 * (1 - p) * k);
      rippleBand(g, x, y + 7, 14 + p * 26 * k, 2.6, 7, this.t * 3, 2);
    }
  }

  /**
   * The crown: a chord of music notes hovering over the head, each on its own beat, with the
   * wavefront they are riding drawn under them. Rooted at y - 18 so nothing covers the face, and
   * drawn over the sprite so the noteheads read instead of only their stems clearing the body.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const rootY = y - 22;
    const count = this.mastered ? 4 : 2;
    const scale = (this.mastered ? 1.25 : 1) * this.intensity;

    // The stave the chord is riding: one wavefront across the crown.
    g.fillStyle(this.tint(this.accent), a * 0.5);
    waveRibbon(g, x - 17 * scale, rootY + 3, x + 17 * scale, rootY + 3,
      { amp: 3, freq: 1.6, phase: this.t * 5, width: 2.6, taper: 1, segments: 20 });

    for (let i = 0; i < count; i++) {
      const side = (i - (count - 1) / 2) / Math.max(0.5, (count - 1) / 2);
      const cx = x + side * 13 * scale;
      const cy = rootY - 6 * scale - Math.sin(this.t * 3.4 + i * 1.3) * 3.5 * scale;
      musicNoteLayered(
        g, this.tint, cx, cy, 5.4 * scale, Math.sin(this.t * 2 + i) * 0.16,
        i % 2 === 0 ? this.accent : SOUND.blush, a * 0.95,
        { flags: i % 2 === 0 ? 1 : 2, stemDown: side > 0.2 },
      );
    }

    // Mastery: the resonance shell ringing around the body, and a brass wavefront off the crown.
    if (this.mastered) {
      g.fillStyle(this.tint(SOUND.brassHi), alpha * 0.55);
      rippleBand(g, x, y, 26, 2, 10, this.t * 2.2, 2.2);
      for (let i = 0; i < 2; i++) {
        const p = (this.t * 1.1 + i / 2) % 1;
        g.fillStyle(this.tint(SOUND.brass), alpha * 0.6 * (1 - p));
        waveCrescent(g, x, rootY, -Math.PI / 2, 14 + p * 20, 0.85, 5 * (1 - p * 0.5), 2, this.t * 9);
      }
    }
  }
}
