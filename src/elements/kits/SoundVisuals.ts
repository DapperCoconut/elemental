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
  /** The Calm disc, and the cool half of the NPC's palette. */
  flow: 0x3388ff,
  /** Water — the Bass perk's charges are the only wet colours in the kit. */
  aqua: 0x22bbdd,
  brine: 0x0a3d66,
  foam: 0xd8f6ff,
  flowPale: 0x9ecdff,
  /** The Bass disc, and anything that went wrong. */
  crimson: 0xff3333,
  /** The Accelerando disc. */
  mint: 0x44ee88,
  mintPale: 0x9cffcc,
  /** Soli, golden violins, the beat itself — anything that is going well. */
  gold: 0xffdd44,
  amber: 0xffaa22,
  /** The bugle. */
  brass: 0xd9a441,
  brassHi: 0xffe9a8,
  brassShade: 0x8c6420,
  /** Chrome for strings, tuners and the metronome's rod. */
  chrome: 0xccccff,
  steel: 0x8888aa,
  /** Timber: the metronome case, and the violin's varnish over it. */
  wood: 0x6b4a2c,
  woodDark: 0x3d2916,
  varnish: 0xa4501f,
  varnishHi: 0xd98a44,
  varnishDark: 0x5a2a10,
  /** The bow: pale hair over a dark stick. */
  hair: 0xf4ead4,
  canvas: 0xf2ead8,
  canvasShade: 0xbfae90,
  ink: 0x2b2018,
  /** Ebony — fingerboard, tailpiece, and the vinyl of a record. */
  ebony: 0x14101a,
  vinyl: 0x1a1620,
  /** The concert dress: midnight jacket, dress shirt, and the tie that reads at a glance. */
  suit: 0x1e1b33,
  suitHi: 0x3a3560,
  shirt: 0xf7f2ff,
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

/**
 * The violin's silhouette in one instrument-local profile, sampled tail (-24) to neck join
 * (+13) as half-widths. Kept as data rather than as arcs because the waist pinching between
 * the two bouts is what makes the shape read, and it has to survive being scaled from a
 * 0.6× phantom up to the full-size instrument in the performer's hands.
 */
const VIOLIN_PROFILE: Array<[number, number]> = [
  [-24, 4.6], [-22, 9.4], [-19, 12.5], [-15, 13.6], [-11, 12.9], [-7.5, 10.2],
  [-5, 8.1], [-3, 7.3], [-1, 7.5], [1.5, 9.1], [5, 11.3], [8, 11.7],
  [10.5, 10.4], [12, 7.8], [13, 4.6],
];

function violinOutline(at: (lx: number, ly: number) => Pt, s: number): Pt[] {
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (const [lx, hw] of VIOLIN_PROFILE) {
    top.push(at(lx * s, -hw * s));
    bot.push(at(lx * s, hw * s));
  }
  bot.reverse();
  return top.concat(bot);
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

  /**
   * Disc Dice: the record itself flung out around the caster, spinning as it goes, with the cut
   * it leaves opening behind it. Drawn as the actual disc rather than as a ring, because the
   * ability is a thrown object and the player has to see what left their hand.
   */
  discSlice(x: number, y: number, radius: number, color: number, depth = 8): void {
    const start = Math.random() * TAU;
    this.anim(depth, 460, (g, t) => {
      const fade = 1 - t * t;
      const r = radius * easeOut(t);
      // The cut: a ring opening outward at the disc's own edge.
      g.fillStyle(this.tint(color), 0.28 * fade);
      rippleBand(g, x, y, r, 9 * (1 - t * 0.5), 8, t * 10, r * 0.05);
      g.fillStyle(this.tint(SOUND.white), 0.6 * fade);
      rippleBand(g, x, y, r, 2.4, 8, -t * 12, r * 0.04);
      // Three copies of the disc riding the cut, so it reads as one record whipping round.
      for (let i = 0; i < 3; i++) {
        const a = start + t * 9 + (i / 3) * TAU;
        SoundFx.drawRecord(g, this.tint, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9,
          13 * (1 - t * 0.25), a * 3, color, fade * 0.95);
      }
    });
  }

  /**
   * A Soli note landing: a wall of music sweeping the whole room. Two fronts leaving the stage
   * in opposite directions plus a full ring, so it reads as the performance filling the venue
   * rather than as one more blast.
   */
  musicWall(x: number, y: number, reach: number, color: number, depth = 9): void {
    this.anim(depth, 640, (g, t) => {
      const fade = 1 - t * t;
      const r = reach * easeOut(t);
      for (const side of [0, Math.PI]) {
        g.fillStyle(this.tint(color), 0.3 * fade);
        waveCrescent(g, x, y, side, r, 1.15, 34 * (1 - t * 0.4), 8, t * 14);
        g.fillStyle(this.tint(SOUND.white), 0.45 * fade);
        waveCrescent(g, x, y, side, r, 1.05, 9 * (1 - t * 0.4), 5, t * 20);
      }
      g.fillStyle(this.tint(color), 0.22 * fade);
      rippleBand(g, x, y, r * 0.8, 12, 9, t * 8, r * 0.05);
    });
    this.notes(x, y, 6, { speed: reach * 1.1, size: 9, life: 700, depth: depth + 1, color, rise: 40 });
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
   * A shockwave in flight: a crescent of wavefront travelling away from where it was struck,
   * widening as it goes. Three passes out of step with each other, so the wall reads as air
   * being pushed rather than as an arc sliding across the floor.
   */
  static drawShockwave(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    x: number, y: number, angle: number, radius: number, spread: number, thick: number,
    t: number, color: number, alpha = 1,
  ): void {
    for (let i = 0; i < 3; i++) {
      const r = radius - i * thick * 0.85;
      if (r <= 2) continue;
      g.fillStyle(tint(color), alpha * (0.26 - i * 0.06));
      waveCrescent(g, x, y, angle, r, spread, thick * 2.4, 4, t * 12 + i);
      g.fillStyle(tint(color), alpha * (0.85 - i * 0.26));
      waveCrescent(g, x, y, angle, r, spread * (1 - i * 0.1), thick * (1 - i * 0.22), 3, t * 12 + i);
    }
    g.fillStyle(tint(SOUND.white), alpha * 0.8);
    waveCrescent(g, x, y, angle, radius, spread * 0.82, thick * 0.28, 2, t * 18);
  }

  /**
   * The violin, held across the body: two bouts either side of a waist, f-holes, a bridge, an
   * ebony fingerboard running out to a pegbox and a scrolled head. `angle` points down the neck.
   *
   * The outline is a sampled half-width profile rather than two circles and a rectangle — the
   * waist pinching between the bouts is the entire reason a violin reads as a violin.
   */
  static drawViolin(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    x: number, y: number, angle: number, scale: number, alpha = 1,
    o: { body?: number; edge?: number; board?: number; phantom?: boolean } = {},
  ): void {
    const body = o.body ?? SOUND.varnish;
    const edge = o.edge ?? SOUND.varnishDark;
    const board = o.board ?? SOUND.ebony;
    const s = scale;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const at = (lx: number, ly: number): Pt => ({
      x: x + lx * cos - ly * sin, y: y + lx * sin + ly * cos,
    });

    const shell = violinOutline(at, s);

    // Neck + fingerboard, drawn under the body so the join disappears behind the upper bout.
    g.fillStyle(tint(board), alpha);
    fillPts(g, [at(8 * s, -4 * s), at(30 * s, -3 * s), at(30 * s, 3 * s), at(8 * s, 4 * s)]);
    g.fillStyle(tint(edge), alpha);
    fillPts(g, [at(29 * s, -4.5 * s), at(38 * s, -5.5 * s), at(38 * s, 4.5 * s), at(29 * s, 3.5 * s)]);

    // Pegs, two a side off the pegbox.
    g.fillStyle(tint(o.phantom ? body : SOUND.ink), alpha);
    for (let i = 0; i < 2; i++) {
      const px = (31 + i * 4) * s;
      g.fillCircle(at(px, -7 * s).x, at(px, -7 * s).y, 1.9 * s);
      g.fillCircle(at(px, 7 * s).x, at(px, 7 * s).y, 1.9 * s);
    }

    // The scroll: three tightening turns, which is the one detail that names the instrument.
    g.lineStyle(1.7 * s, tint(edge), alpha);
    const spiral: Pt[] = [];
    for (let i = 0; i <= 22; i++) {
      const a = (i / 22) * TAU * 1.6;
      const rr = (4.4 - i * 0.16) * s;
      spiral.push(at(41 * s + Math.cos(a) * rr, -2 * s + Math.sin(a) * rr));
    }
    strokePts(g, spiral);

    // Body: soft halo, the varnished plate, then the purfling line just inside the edge.
    g.fillStyle(tint(body), alpha * (o.phantom ? 0.2 : 0.14));
    fillPts(g, violinOutline(at, s * 1.18));
    g.fillStyle(tint(body), alpha * (o.phantom ? 0.5 : 1));
    fillPts(g, shell);
    g.lineStyle(1.6 * s, tint(edge), alpha * 0.95);
    strokePts(g, shell, true);
    g.lineStyle(0.9 * s, tint(o.phantom ? SOUND.white : SOUND.varnishHi), alpha * 0.6);
    strokePts(g, violinOutline(at, s * 0.86), true);

    // f-holes, one either side of the waist: an upper eye, a slot, a lower eye.
    for (const side of [-1, 1]) {
      const fy = side * 6.4 * s;
      g.fillStyle(tint(o.phantom ? SOUND.white : SOUND.ink), alpha * (o.phantom ? 0.75 : 0.9));
      g.fillCircle(at(1.5 * s, fy - side * 1.2 * s).x, at(1.5 * s, fy - side * 1.2 * s).y, 1.5 * s);
      g.fillCircle(at(-6 * s, fy + side * 1.2 * s).x, at(-6 * s, fy + side * 1.2 * s).y, 1.5 * s);
      fillPts(g, [
        at(1.5 * s, fy - side * 2.1 * s), at(-6 * s, fy + side * 0.3 * s),
        at(-6 * s, fy + side * 2.1 * s), at(1.5 * s, fy - side * 0.3 * s),
      ]);
    }

    // Tailpiece, bridge and the four strings running over both.
    g.fillStyle(tint(board), alpha);
    fillPts(g, [at(-21 * s, -3 * s), at(-11 * s, -4 * s), at(-11 * s, 4 * s), at(-21 * s, 3 * s)]);
    g.fillStyle(tint(o.phantom ? body : SOUND.varnishHi), alpha);
    fillPts(g, [at(-4 * s, -5.4 * s), at(-2 * s, -5.4 * s), at(-2 * s, 5.4 * s), at(-4 * s, 5.4 * s)]);
    g.lineStyle(0.7 * s, tint(o.phantom ? SOUND.white : SOUND.chrome), alpha * 0.9);
    for (let i = 0; i < 4; i++) {
      const off = (-2.4 + i * 1.6) * s;
      strokePts(g, [at(-18 * s, off * 0.7), at(34 * s, off)]);
    }

    // Chinrest, tucked under the tail end on the near side.
    g.fillStyle(tint(board), alpha * 0.95);
    fillOval(g, at(-17 * s, 9 * s).x, at(-17 * s, 9 * s).y, 6 * s, 3.4 * s, angle);
  }

  /**
   * The bow, drawn across an aim: a dark stick with pale hair strung under it, a frog at the
   * hand end and the tip curving away at the other. `draw` slides it along its own length so a
   * stroke reads as the bow being *pulled*, not as the bow jumping.
   */
  static drawBow(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    x: number, y: number, angle: number, scale: number, draw: number, alpha = 1,
    color: number = SOUND.woodDark,
  ): void {
    const s = scale;
    const slide = (draw - 0.5) * 14 * s;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const at = (lx: number, ly: number): Pt => ({
      x: x + (lx + slide) * cos - ly * sin, y: y + (lx + slide) * sin + ly * cos,
    });

    // Hair — a shallow ribbon, because a dead straight line reads as a stick, not as horsehair.
    g.fillStyle(tint(SOUND.hair), alpha * 0.95);
    waveRibbon(g, at(-26 * s, 2.2 * s).x, at(-26 * s, 2.2 * s).y, at(26 * s, 2.2 * s).x, at(26 * s, 2.2 * s).y,
      { amp: 0.6 * s, freq: 0.5, phase: draw * 6, width: 1.9 * s, taper: 0.35, segments: 16 });
    // Stick.
    g.lineStyle(1.9 * s, tint(color), alpha);
    strokePts(g, [at(-26 * s, 0), at(0, -0.8 * s), at(24 * s, 0.4 * s), at(27 * s, 2.4 * s)]);
    // Frog + winding at the hand end.
    g.fillStyle(tint(SOUND.ink), alpha);
    fillPts(g, [at(-27 * s, -1.6 * s), at(-21 * s, -1.6 * s), at(-21 * s, 3.4 * s), at(-27 * s, 3.4 * s)]);
    g.fillStyle(tint(SOUND.brassHi), alpha * 0.9);
    fillPts(g, [at(-20.5 * s, -1.4 * s), at(-18.5 * s, -1.4 * s), at(-18.5 * s, 3.2 * s), at(-20.5 * s, 3.2 * s)]);
  }

  /**
   * A conducted phantom violin: the instrument itself made of standing wave, hanging in the air
   * over its own shadow with a ghost bow sawing across it and rings dropping off the sound post.
   * Golden ones are the harmonized placements, and read as gold from across the arena.
   */
  static drawPhantomViolin(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    x: number, y: number, t: number, golden: boolean, alpha = 1, charge = 0,
  ): void {
    const col = golden ? SOUND.gold : SOUND.magenta;
    const bob = Math.sin(t * 2.2) * 3;
    const cy = y + bob;

    // What it hangs over.
    g.fillStyle(tint(SOUND.shade), alpha * 0.3);
    g.fillEllipse(x, y + 22, 34, 10);

    // Rings dropping off it, faster while a stroke is charging up.
    for (let i = 0; i < 2; i++) {
      const p = (t * (0.9 + charge) + i / 2) % 1;
      g.fillStyle(tint(col), alpha * 0.34 * (1 - p));
      rippleBand(g, x, cy, 16 + p * 26, 2.4, 8, t * 4, 2);
    }

    SoundFx.drawViolin(g, tint, x, cy, -0.55 + Math.sin(t * 1.3) * 0.06, 0.62, alpha * 0.9, {
      body: col, edge: golden ? SOUND.brassHi : SOUND.rose, board: golden ? SOUND.amber : SOUND.violet,
      phantom: true,
    });
    SoundFx.drawBow(g, tint, x + 2, cy + 3, 1.05, 0.6, (Math.sin(t * 2.6) + 1) / 2,
      alpha * 0.85, golden ? SOUND.brassHi : SOUND.blush);

    // A note sitting on the scroll, so the thing reads as playing rather than as furniture.
    musicNoteLayered(g, tint, x + 16, cy - 16 + Math.sin(t * 3.1) * 2, 5, Math.sin(t * 2) * 0.2,
      golden ? SOUND.brassHi : SOUND.blush, alpha * 0.9, { flags: 1 });
  }

  /**
   * A record: black vinyl with the grooves cut into it, a coloured label at the centre and a
   * sheen sweeping round as it turns. The label colour is the whole read on which disc is
   * loaded, so it is drawn big enough to see at HUD size.
   */
  static drawRecord(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    x: number, y: number, r: number, spin: number, color: number, alpha = 1,
  ): void {
    g.fillStyle(tint(color), alpha * 0.2);
    g.fillCircle(x, y, r * 1.28);
    g.fillStyle(tint(SOUND.vinyl), alpha);
    g.fillCircle(x, y, r);
    // Grooves.
    g.lineStyle(Math.max(0.5, r * 0.045), tint(SOUND.steel), alpha * 0.3);
    for (let i = 0; i < 5; i++) g.strokeCircle(x, y, r * (0.94 - i * 0.11));
    // The sheen: a wedge of reflected light that goes round with the disc.
    g.fillStyle(tint(SOUND.white), alpha * 0.16);
    fillPts(g, [
      { x, y },
      { x: x + Math.cos(spin - 0.28) * r, y: y + Math.sin(spin - 0.28) * r },
      { x: x + Math.cos(spin) * r * 1.02, y: y + Math.sin(spin) * r * 1.02 },
      { x: x + Math.cos(spin + 0.28) * r, y: y + Math.sin(spin + 0.28) * r },
    ]);
    // Label + spindle.
    g.fillStyle(tint(color), alpha);
    g.fillCircle(x, y, r * 0.38);
    g.lineStyle(Math.max(0.6, r * 0.05), tint(SOUND.white), alpha * 0.55);
    g.strokeCircle(x, y, r * 0.38);
    g.fillStyle(tint(SOUND.shade), alpha);
    g.fillCircle(x, y, r * 0.09);
  }

  /**
   * The metronome: a tapered wooden case on a plinth, a chromed rod pivoting out of the top and
   * the sliding weight riding it. `swing` runs -1 → 1 across one beat, so the rod is at the far
   * right exactly when the beat lands and `beat` flares the weight gold.
   */
  static drawMetronome(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    x: number, y: number, s: number, swing: number, beat: number, alpha = 1,
  ): void {
    const halfBase = 9 * s;
    const halfTop = 3.6 * s;
    const h = 20 * s;
    const baseY = y + h * 0.5;
    const topY = y - h * 0.5;

    // The rod, pinned at the top of the case and swinging over it.
    const a = -Math.PI / 2 + swing * 0.62;
    const rodLen = 17 * s;
    const tipX = x + Math.cos(a) * rodLen;
    const tipY = topY + Math.sin(a) * rodLen;
    g.lineStyle(1.6 * s, tint(SOUND.chrome), alpha * 0.95);
    strokePts(g, [{ x, y: topY }, { x: tipX, y: tipY }]);
    // The weight, two thirds up the rod.
    const wx = x + Math.cos(a) * rodLen * 0.66;
    const wy = topY + Math.sin(a) * rodLen * 0.66;
    if (beat > 0.01) {
      g.fillStyle(tint(SOUND.gold), alpha * 0.4 * beat);
      g.fillCircle(tipX, tipY, 7 * s * (0.6 + beat));
    }
    g.fillStyle(tint(beat > 0.01 ? SOUND.gold : SOUND.brass), alpha);
    fillPts(g, [
      { x: wx - 3.4 * s, y: wy - 2.2 * s }, { x: wx + 3.4 * s, y: wy - 2.2 * s },
      { x: wx + 3.4 * s, y: wy + 2.2 * s }, { x: wx - 3.4 * s, y: wy + 2.2 * s },
    ]);
    g.fillStyle(tint(SOUND.white), alpha * 0.85);
    g.fillCircle(tipX, tipY, 1.7 * s);

    // Case: a tapered pyramid with a lighter front panel and a plinth under it.
    g.fillStyle(tint(SOUND.woodDark), alpha);
    fillPts(g, [
      { x: x - halfBase, y: baseY }, { x: x - halfTop, y: topY },
      { x: x + halfTop, y: topY }, { x: x + halfBase, y: baseY },
    ]);
    g.fillStyle(tint(SOUND.wood), alpha);
    fillPts(g, [
      { x: x - halfBase * 0.68, y: baseY - 1.5 * s }, { x: x - halfTop * 0.6, y: topY + 2 * s },
      { x: x + halfTop * 0.6, y: topY + 2 * s }, { x: x + halfBase * 0.68, y: baseY - 1.5 * s },
    ]);
    // The graduated scale down the open front.
    g.lineStyle(0.8 * s, tint(SOUND.brassHi), alpha * 0.55);
    for (let i = 1; i < 5; i++) {
      const ly = topY + (h - 2 * s) * (i / 5);
      const hw = halfTop * 0.5 + (halfBase * 0.55 - halfTop * 0.5) * (i / 5);
      strokePts(g, [{ x: x - hw, y: ly }, { x: x + hw, y: ly }]);
    }
    g.fillStyle(tint(SOUND.ink), alpha);
    g.fillRect(x - halfBase - 1.2 * s, baseY, halfBase * 2 + 2.4 * s, 2.6 * s);
  }
  /**
   * A Soli note as it sits on the bar: the note glyph over a soft disc, with a ringing tail
   * trailing it back up the track so the direction of travel reads even when the bar is still.
   * `accent` marks the double-value gold notes with a ring and a second flag.
   */
  static drawTrackNote(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    width: number, color: number, accent: boolean, t: number,
  ): void {
    g.clear();
    // Ringing tail, trailing the note back up the track.
    for (let i = 0; i < 2; i++) {
      g.fillStyle(tint(color), 0.24 - i * 0.08);
      waveCrescent(g, width * 0.1, 0, 0, width * (0.5 + i * 0.32), 0.9, 5 - i * 1.4, 1.5, t * 9);
    }
    g.fillStyle(tint(color), 0.3);
    g.fillCircle(0, 0, width * 0.52);
    if (accent) {
      g.fillStyle(tint(SOUND.gold), 0.75);
      rippleBand(g, 0, 0, width * 0.6, 2.2, 7, t * 5, 1.8);
    }
    musicNoteLayered(g, tint, -1, 3, width * 0.34, 0, color, 1, { flags: accent ? 2 : 1 });
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
   * The Soli stage: a lit riser with a checker front, footlights along the lip and a haze of
   * light standing over the boards.
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

}

// ── SoundAura ─────────────────────────────────────────────────────────────

export type SoundAuraStyle =
  | 'disc'       // The record on the deck: a turning platter of standing wave underfoot
  | 'solo'       // On stage: a gold spotlight pool and rising sparks
  | 'bugle'      // Riding the brass buff: chevrons of brass climbing the body
  | 'harmony';   // Harmony perk: stars orbiting on a shallow ellipse

/**
 * A persistent field riding on a fighter. One Graphics, driven by whoever owns it.
 *
 * The styles differ in *shape*, not tint: the disc turns, solo pools, bugle climbs, harmony
 * orbits. Several can be up at once and must stay separable — which is why `disc` is the only
 * one that takes a colour, since the loaded record is the one thing read by hue.
 */
export class SoundAura {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private intensity = 1;
  // Spelled `: number` because the SOUND palette is `as const` — without it TypeScript
  // narrows this to the literal mint and refuses every other record colour.
  private color: number = SOUND.mint;

  constructor(
    scene: Phaser.Scene,
    private tint: SoundColorFn,
    private style: SoundAuraStyle,
    private radius: number,
    depth = 3,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  /** A buff scale — how hard this field is being driven. */
  setIntensity(v: number): void { this.intensity = v; }

  /** `disc` only: the label colour of whichever record is loaded. */
  setColor(c: number): void { this.color = c; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;
    const k = this.intensity;
    const r = this.radius;

    switch (this.style) {
      case 'disc': {
        // The deck: a platter turning under the performer with the record's colour on it.
        g.fillStyle(this.tint(this.color), 0.12 * alpha);
        g.fillEllipse(x, y + 14, r * 2.5, r * 0.95);
        for (let i = 0; i < 3; i++) {
          const p = (this.t * 0.7 + i / 3) % 1;
          g.fillStyle(this.tint(this.color), 0.5 * alpha * (1 - p));
          rippleBand(g, x, y + 14, r * (0.5 + p * 1.1), 2.4, 8, this.t * 4, 2);
        }
        // Two notes riding the platter round, so the disc reads as spinning rather than glowing.
        for (let i = 0; i < 2; i++) {
          const a = this.t * 2.2 + i * Math.PI;
          musicNoteLayered(g, this.tint, x + Math.cos(a) * r * 1.05, y + 14 + Math.sin(a) * r * 0.42,
            4.4, 0, this.color, 0.85 * alpha, { flags: 1, stemDown: Math.sin(a) > 0 });
        }
        break;
      }
      case 'bugle': {
        // Brass chevrons climbing the body — the buff is a tempo, so it moves upward.
        for (let i = 0; i < 3; i++) {
          const p = (this.t * (1.1 + k) + i / 3) % 1;
          const lift = (0.5 - p) * r * 2.3;
          g.fillStyle(this.tint(i % 2 === 0 ? SOUND.brass : SOUND.brassHi),
            0.7 * alpha * Math.max(0, 1 - Math.abs(p - 0.5) * 1.8) * Math.min(1, 0.4 + k));
          waveCrescent(g, x, y + lift, -Math.PI / 2, r * 0.8, 0.9, 3.2, 2, this.t * 9 + i);
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
    }
  }

  destroy(): void { this.g.destroy(); }
}

// ── SoundAvatar ───────────────────────────────────────────────────────────

/**
 * One hand of the soloist, outermost disc first: a ring of sound around a dark jacket cuff,
 * a white shirt cuff inside that, and the hand itself. Read at gameplay zoom it is a formally
 * dressed arm rather than a glowing ball, which is the whole point of the character.
 */
const SOUND_AVATAR: AvatarSpec = {
  hands: [
    { r: 10.5, color: SOUND.magenta, alpha: 0.22 },
    { r: 7.2, color: SOUND.suit, alpha: 1 },
    { r: 5.4, color: SOUND.shirt, alpha: 1 },
    { r: 3.8, color: SOUND.blush, alpha: 1 },
    { r: 1.4, color: SOUND.white, alpha: 0.9, ox: -1.4, oy: -1.6 },
  ],
  eyeWhite: SOUND.ivory,
  eyePupil: SOUND.night,
  // A player's hands: they snap onto the strings and smear on the way through a stroke.
  squash: { div: 12, x: 0.55, y: 0.3 },
};

/** Whatever the soloist currently has in their hands. */
export type SoundInstrument = 'violin' | 'bugle' | 'record' | 'none';

/**
 * The soloist: a concert musician in a dinner jacket and tie, an instrument in their hands and
 * a ring of music notes orbiting them. Hands, eyes, gestures and holds come from BaseAvatar;
 * what Sound adds is the suit painted over the sprite (`drawBody`), the instrument held across
 * it, and the notes circling the whole figure.
 *
 * The instrument is the character's read on what it is doing right now, so it is a setter the
 * kit drives rather than anything this class works out for itself.
 */
export class SoundAvatar extends BaseAvatar {
  private fx: SoundFx;
  /** Warm palette for the player, cool for the NPC, so two sound fighters never blur together. */
  private accent: number;
  private tieColor: number;
  private instrument: SoundInstrument = 'violin';
  /** 0 → 1 across one bow stroke; drives the bow sliding along its own length. */
  private bowDraw = 0.5;
  /** Label colour of whichever record is loaded — the disc in hand and the notes pick it up. */
  private discColor: number = SOUND.mint;

  constructor(scene: Phaser.Scene, tint: SoundColorFn, owner: 'player' | 'npc' = 'player', depth = 6) {
    super(scene, tint, depth, SOUND_AVATAR);
    this.fx = new SoundFx(scene, tint);
    this.accent = owner === 'player' ? SOUND.magenta : SOUND.flow;
    this.tieColor = owner === 'player' ? SOUND.magenta : SOUND.flow;
    if (owner === 'npc') {
      this.forEachHandLayer(0, (halo) => halo.setFillStyle(this.tint(SOUND.flow), 0.22));
    }
  }

  /** What is in the soloist's hands this frame. */
  setInstrument(i: SoundInstrument): void { this.instrument = i; }
  /** Where the bow is through its stroke, 0 → 1. */
  setBowDraw(v: number): void { this.bowDraw = Phaser.Math.Clamp(v, 0, 1); }
  /** The loaded record's colour, worn on the pocket square and the orbiting notes. */
  setDiscColor(c: number): void { this.discColor = c; }

  /**
   * Mastery tell — a permanent, silhouette-level upgrade, so a mastered soloist is identifiable
   * before they play a note: a top hat with a brass band (drawn in `drawExtras`), brass eyes and
   * a brass rim around each cuff. Shape changes, not brighter tints.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? SOUND.brassHi : SOUND.ivory);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 13.5 : 10.5);
      halo.setFillStyle(this.tint(on ? SOUND.brass : this.accent), on ? 0.28 : 0.22);
    });
    this.forEachHandLayer(1, (cuff) => {
      if (on) cuff.setStrokeStyle(1.8, this.tint(SOUND.brassHi), 0.95);
      else cuff.setStrokeStyle();
    });
  }

  /** Fast-moving hands shed notes. */
  protected emitTrail(x: number, y: number): void {
    this.fx.notes(x, y, 1, { speed: 18, size: 5, life: 620, depth: 5, color: this.accent, rise: 20 });
  }

  /** Working an instrument: hands held close and low, fingering rather than pushing. */
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
   * The dinner jacket. Painted opaque and wide enough to cover the 44px element sprite entirely,
   * because the character *is* the suit — anything of the old magenta ball showing past the
   * shoulders reads as a costume draped over a blob.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const breathe = 1 + Math.sin(this.t * 2.6) * 0.015;
    const w = 23 * breathe;
    const h = 23.5 * breathe;

    // Shoulders and torso as one rounded slab — the jacket.
    g.fillStyle(this.tint(SOUND.suit), alpha);
    g.fillEllipse(x, y + 1, w * 2, h * 2);
    // Sheen down the left of the jacket, so it reads as cloth and not as a hole.
    g.fillStyle(this.tint(SOUND.suitHi), alpha * 0.55);
    fillPts(g, [
      { x: x - w * 0.82, y: y - h * 0.3 }, { x: x - w * 0.3, y: y - h * 0.72 },
      { x: x - w * 0.18, y: y + h * 0.62 }, { x: x - w * 0.7, y: y + h * 0.5 },
    ]);

    // Dress shirt: a V of white between the lapels, with the collar points at the top.
    g.fillStyle(this.tint(SOUND.shirt), alpha);
    fillPts(g, [
      { x: x - w * 0.34, y: y - h * 0.66 }, { x: x + w * 0.34, y: y - h * 0.66 },
      { x: x + w * 0.2, y: y + h * 0.5 }, { x: x - w * 0.2, y: y + h * 0.5 },
    ]);
    // Lapels, laid back over the shirt on both sides.
    g.fillStyle(this.tint(SOUND.suit), alpha);
    fillPts(g, [
      { x: x - w * 0.62, y: y - h * 0.72 }, { x: x - w * 0.16, y: y - h * 0.62 },
      { x: x - w * 0.05, y: y + h * 0.5 }, { x: x - w * 0.5, y: y + h * 0.34 },
    ]);
    fillPts(g, [
      { x: x + w * 0.62, y: y - h * 0.72 }, { x: x + w * 0.16, y: y - h * 0.62 },
      { x: x + w * 0.05, y: y + h * 0.5 }, { x: x + w * 0.5, y: y + h * 0.34 },
    ]);
    g.lineStyle(1, this.tint(SOUND.suitHi), alpha * 0.8);
    strokePts(g, [
      { x: x - w * 0.62, y: y - h * 0.72 }, { x: x - w * 0.16, y: y - h * 0.62 },
      { x: x - w * 0.05, y: y + h * 0.5 },
    ]);
    strokePts(g, [
      { x: x + w * 0.62, y: y - h * 0.72 }, { x: x + w * 0.16, y: y - h * 0.62 },
      { x: x + w * 0.05, y: y + h * 0.5 },
    ]);

    // The tie: a knot at the collar and a blade hanging down the shirt.
    const tie = this.mastered ? SOUND.gold : this.tieColor;
    g.fillStyle(this.tint(tie), alpha);
    fillPts(g, [
      { x: x - w * 0.13, y: y - h * 0.62 }, { x: x + w * 0.13, y: y - h * 0.62 },
      { x: x + w * 0.1, y: y - h * 0.4 }, { x: x - w * 0.1, y: y - h * 0.4 },
    ]);
    fillPts(g, [
      { x: x - w * 0.1, y: y - h * 0.4 }, { x: x + w * 0.1, y: y - h * 0.4 },
      { x: x + w * 0.14, y: y + h * 0.34 }, { x: x, y: y + h * 0.52 }, { x: x - w * 0.14, y: y + h * 0.34 },
    ]);
    g.fillStyle(this.tint(SOUND.white), alpha * 0.4);
    fillPts(g, [
      { x: x - w * 0.1, y: y - h * 0.38 }, { x: x - w * 0.03, y: y - h * 0.38 },
      { x: x - w * 0.01, y: y + h * 0.28 }, { x: x - w * 0.09, y: y + h * 0.2 },
    ]);

    // Pocket square, in whichever record is loaded — the cheapest read on the disc at a glance.
    g.fillStyle(this.tint(this.discColor), alpha);
    fillPts(g, [
      { x: x + w * 0.5, y: y - h * 0.06 }, { x: x + w * 0.78, y: y - h * 0.02 },
      { x: x + w * 0.74, y: y + h * 0.12 }, { x: x + w * 0.48, y: y + h * 0.08 },
    ]);
  }

  /**
   * Everything worn or carried: the instrument in the soloist's hands, the notes orbiting them,
   * and — once mastered — the top hat. Rooted so nothing sits over the eyes.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const crown = y - 20;
    const dir = Math.cos(this.facing) >= 0 ? 1 : -1;

    // ── The orbiting chord ──
    // Notes circling the whole figure on a shallow ellipse, half of them behind at any moment
    // (drawn dimmer as they pass) so the ring reads as going round rather than as a flat halo.
    const count = this.mastered ? 5 : 3;
    const spin = this.t * (0.8 + (this.intensity - 1) * 1.2);
    for (let i = 0; i < count; i++) {
      const ang = spin + (i / count) * TAU;
      const behind = Math.sin(ang) < 0;
      const nx = x + Math.cos(ang) * 30;
      const ny = crown + 4 + Math.sin(ang) * 11 - Math.sin(this.t * 3 + i) * 2.5;
      musicNoteLayered(
        g, this.tint, nx, ny, behind ? 4.4 : 5.8, Math.sin(this.t * 2 + i) * 0.18,
        i % 3 === 0 ? this.discColor : i % 3 === 1 ? this.accent : SOUND.blush,
        a * (behind ? 0.45 : 0.95), { flags: i % 2 === 0 ? 1 : 2, stemDown: behind },
      );
    }

    // ── The instrument ──
    switch (this.instrument) {
      case 'violin': {
        // Tucked under the chin on the far side, bow drawn across the bridge.
        const vAng = dir > 0 ? -0.42 : Math.PI + 0.42;
        SoundFx.drawViolin(g, this.tint, x + dir * 3, y + 3, vAng, 0.6, alpha);
        SoundFx.drawBow(g, this.tint, x + dir * 6, y + 5, vAng + dir * 1.35, 0.52, this.bowDraw, alpha);
        break;
      }
      case 'bugle':
        SoundFx.drawBugle(g, this.tint, x, y + 2, dir > 0 ? 1 : -1, this.t);
        break;
      case 'record': {
        // Held out at arm's length, spinning on a fingertip.
        SoundFx.drawRecord(g, this.tint, x + dir * 20, y - 2, 12, this.t * 7, this.discColor, alpha);
        break;
      }
      case 'none':
        break;
    }

    // ── Mastery: the top hat ──
    if (this.mastered) {
      const lean = Math.cos(this.facing) * 2.2;
      g.fillStyle(this.tint(SOUND.shade), alpha * 0.35);
      g.fillEllipse(x + lean, crown + 1, 40, 9);
      g.fillStyle(this.tint(SOUND.suit), alpha);
      g.fillEllipse(x + lean, crown - 1, 38, 8.5);
      fillPts(g, [
        { x: x + lean - 12, y: crown - 1 }, { x: x + lean - 13, y: crown - 17 },
        { x: x + lean + 13, y: crown - 17 }, { x: x + lean + 12, y: crown - 1 },
      ]);
      g.fillStyle(this.tint(SOUND.suitHi), alpha);
      g.fillEllipse(x + lean, crown - 17, 26, 6);
      // Brass hatband.
      g.fillStyle(this.tint(SOUND.brass), alpha);
      fillPts(g, [
        { x: x + lean - 12.6, y: crown - 4 }, { x: x + lean + 12.6, y: crown - 4 },
        { x: x + lean + 12.2, y: crown - 8 }, { x: x + lean - 12.2, y: crown - 8 },
      ]);
      g.fillStyle(this.tint(SOUND.brassHi), alpha * 0.9);
      g.fillCircle(x + lean + 8, crown - 6, 2.2);
    }
  }
}
