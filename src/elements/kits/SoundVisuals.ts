import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Sound renders: the drum major (a maroon orb in white gloves
 * under a shako whose plume takes the colour of the soul song), the baton, the solo stage and
 * bugle, and the one-shot effects every ability fires off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts and are shared with the other elements. What stays here is what makes sound
 * sound: the wave ribbon, the ripple, the music note, and everything built from those three.
 *
 * Every structural colour comes from the SOUND palette below and is routed through the owner's
 * `soundColor` mapper, so a skin is a table edit in SkinsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — SkinsKit.soundColor bound to one owner. */
export type SoundColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const SOUND = {
  /** The venue: everything sound does happens under stadium lights on a dark field. */
  night: 0x16060b,
  shade: 0x0b0306,
  /** The uniform. Deep maroon is the element. */
  maroon: 0x6e1427,
  maroonDeep: 0x3a0812,
  maroonHi: 0xa82c48,
  maroonPale: 0xdc8a9a,
  /** The shared painters' names for the element's own warm tones, kept in maroon. */
  magenta: 0xb8324f,
  rose: 0xe47a8f,
  blush: 0xf6c9d1,
  violet: 0x7c2a44,
  plum: 0x4a0f1e,
  /** Braid, buttons, the band on the shako. */
  gold: 0xf0c04e,
  goldHi: 0xffe8a6,
  goldShade: 0x93681f,
  /** The bugle. */
  brass: 0xd9a441,
  brassHi: 0xffe9a8,
  brassShade: 0x8c6420,
  /** The baton: a chrome shaft and its ball. */
  chrome: 0xe4e8f2,
  steel: 0x8a90a6,
  steelDark: 0x4a4f62,
  /** White gloves. */
  ivory: 0xfff6ee,
  glove: 0xf4efe8,
  gloveShade: 0xc9c1b6,
  /** The shako's body — near-black so the maroon orb under it still reads as the colour. */
  shako: 0x1c0a10,
  shakoHi: 0x3a1622,
  /** The three soul songs. */
  staccato: 0xff3b4a,
  staccatoPale: 0xff9aa2,
  melody: 0x3f8cff,
  melodyPale: 0xa6c8ff,
  smooth: 0x3fd27a,
  smoothPale: 0xa8f0c4,
  /** Out of tune: a sour, nicotine yellow that clashes with everything else on screen. */
  sour: 0xc9c43a,
  sourDark: 0x6b6a14,
  crimson: 0xff3333,
  /** Water — the Bass perk's charges are the only wet colours in the kit. */
  aqua: 0x22bbdd,
  brine: 0x0a3d66,
  foam: 0xd8f6ff,
  /** Boards of the solo stage. */
  wood: 0x6b4a2c,
  woodDark: 0x3d2916,
  woodHi: 0x9a6c40,
  white: 0xffffff,
} as const;

/** The three soul songs, in the order Hum cycles them. Staccato is the one a match starts on. */
export type SoulSong = 'staccato' | 'melody' | 'smooth';
export const SONG_ORDER: SoulSong[] = ['staccato', 'melody', 'smooth'];
export const SONG_COLORS: Record<SoulSong, number> = {
  staccato: SOUND.staccato,
  melody: SOUND.melody,
  smooth: SOUND.smooth,
};
export const SONG_PALE: Record<SoulSong, number> = {
  staccato: SOUND.staccatoPale,
  melody: SOUND.melodyPale,
  smooth: SOUND.smoothPale,
};
export const SONG_NAMES: Record<SoulSong, string> = {
  staccato: 'STACCATO',
  melody: 'MELODY',
  smooth: 'SMOOTH',
};

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

  // ── The drum major's own effects ────────────────────────────────────────

  /** A beat struck clean: a gold twirl ring snapping off the baton and a pinch of sparkle. */
  batonFlourish(x: number, y: number, color: number = SOUND.gold, depth = 10): void {
    this.anim(depth, 300, (g, t) => {
      const fade = 1 - t;
      const r = 10 + 26 * easeOut(t);
      for (let i = 0; i < 3; i++) {
        g.fillStyle(this.tint(color), 0.8 * fade);
        waveCrescent(g, x, y, t * 9 + (i / 3) * TAU, r, 0.6, 5 * fade, 1, t * 12);
      }
    });
    this.sparkle(x, y, 4, 16, depth, color);
  }

  /** A beat dropped: the twirl comes apart in a sour little clash. */
  batonFumble(x: number, y: number, depth = 10): void {
    this.anim(depth, 280, (g, t) => {
      const fade = 1 - t;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + 0.4;
        g.fillStyle(this.tint(SOUND.sour), 0.7 * fade);
        waveCrescent(g, x, y, a, 8 + t * 18, 0.4, 4 * fade, 4, t * 40 + i * 3);
      }
    });
  }

  /**
   * Crescendo's release: a full ring of sound leaving the dancer — three staggered ripple fronts,
   * eight fans of wavefront, a stave of three rings opening behind them, and a burst of notes.
   */
  musicWave(x: number, y: number, radius: number, color: number, depth = 8): void {
    this.flash(x, y, radius * 0.28, depth + 2, color);
    this.anim(depth, 620, (g, t) => {
      const fade = 1 - t * t;
      const r = radius * easeOut(t);
      // The stave: three thin rings, the lines of the music the wave is carrying.
      for (let i = -1; i <= 1; i++) {
        g.fillStyle(this.tint(SOUND.white), 0.4 * fade);
        rippleBand(g, x, y, Math.max(4, r * 0.78 + i * 6), 1.4, 10, t * 6 + i, 1.5);
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + t * 0.8;
        g.fillStyle(this.tint(color), 0.55 * fade);
        waveCrescent(g, x, y, a, r, 0.42, 18 * (1 - t * 0.5), 4, t * 16 + i);
      }
      // Notes riding the front, sitting on the stave lines as it opens.
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU - t * 0.6;
        const rr = r * 0.78 + ((i % 3) - 1) * 6;
        musicNoteLayered(g, this.tint, x + Math.cos(a) * rr, y + Math.sin(a) * rr, 5.5, Math.sin(t * 4 + i) * 0.3,
          i % 2 ? color : SOUND.gold, 0.9 * fade, { flags: i % 3 });
      }
    });
    this.ripple(x, y, radius * 0.2, radius, color, 520, 6, depth, 9);
    this.scene.time.delayedCall(110, () => this.ripple(x, y, radius * 0.15, radius * 1.12, SOUND.white, 560, 3, depth, 6));
    this.notes(x, y, 8, { speed: radius * 1.6, size: 7, life: 760, depth: depth + 1, color, rise: 30 });
  }

  /**
   * Fermata's slam: the baton driven into the floor. A blown-out impact, cracks running out
   * along the aim, a fan of wavefront down the line it was slammed along, and the fermata
   * itself — the arc over a dot that means *hold this* — standing over the impact.
   */
  slam(x: number, y: number, ang: number, length: number, width: number, color: number, depth = 8): void {
    this.flash(x, y, 26, depth + 2, color);
    const cracks = Array.from({ length: 5 }, (_, i) => ({
      a: ang + (i - 2) * 0.22 + (Math.random() - 0.5) * 0.1,
      len: length * (0.55 + Math.random() * 0.45),
      kinks: [0.3 + Math.random() * 0.15, 0.6 + Math.random() * 0.15].map((k) => ({ k, off: (Math.random() - 0.5) * 12 })),
    }));
    this.anim(depth - 4, 900, (g, t) => {
      const fade = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      const grow = easeOut(Math.min(1, t * 4));
      for (const c of cracks) {
        const cos = Math.cos(c.a), sin = Math.sin(c.a);
        const nx = -sin, ny = cos;
        const pts: Pt[] = [{ x, y }];
        for (const kk of c.kinks) {
          const d = c.len * kk.k * grow;
          pts.push({ x: x + cos * d + nx * kk.off, y: y + sin * d + ny * kk.off });
        }
        pts.push({ x: x + cos * c.len * grow, y: y + sin * c.len * grow });
        g.lineStyle(3, this.tint(SOUND.shade), 0.8 * fade);
        strokePts(g, pts);
        g.lineStyle(1.2, this.tint(color), 0.9 * fade);
        strokePts(g, pts);
      }
    });
    this.anim(depth, 420, (g, t) => {
      const fade = 1 - t;
      for (let i = 0; i < 3; i++) {
        const lt = Phaser.Math.Clamp(t * 1.4 - i * 0.14, 0, 1);
        if (lt <= 0) continue;
        g.fillStyle(this.tint(i === 1 ? SOUND.white : color), 0.7 * fade);
        waveCrescent(g, x, y, ang, 14 + lt * length, Math.atan2(width, length) * 1.6, 10 * (1 - lt * 0.6), 3, t * 14);
      }
    });
    // The fermata over the impact, rising and fading.
    this.anim(depth + 3, 900, (g, t) => {
      const a = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      const fy = y - 30 - t * 18;
      SoundFx.drawFermata(g, this.tint, x, fy, 11 + t * 3, color, a);
    });
    this.notes(x, y, 4, { speed: 120, size: 6, life: 620, depth: depth + 1, color, angle: ang, spread: 0.6 });
  }

  /**
   * Out of Tune detonating: notes sprout out of the victim on stems — five curved stalks shoot
   * up out of the body, a notehead blooms at the tip of each, and then they come loose and fly.
   */
  sprout(x: number, y: number, color: number, depth = 11): void {
    const stalks = Array.from({ length: 5 }, (_, i) => ({
      a: -Math.PI / 2 + (i - 2) * 0.42 + (Math.random() - 0.5) * 0.15,
      len: 30 + Math.random() * 16,
      bend: (Math.random() - 0.5) * 0.9,
      delay: i * 0.05,
    }));
    this.flash(x, y, 18, depth, color);
    this.anim(depth, 700, (g, t) => {
      for (const s of stalks) {
        const lt = Phaser.Math.Clamp((t - s.delay) / 0.55, 0, 1);
        if (lt <= 0) continue;
        const loose = Phaser.Math.Clamp((t - 0.6) / 0.4, 0, 1);
        const len = s.len * easeOut(lt);
        // The stalk is a quadratic curve bending to one side as it grows.
        const pts: Pt[] = [];
        for (let k = 0; k <= 8; k++) {
          const u = k / 8;
          const aa = s.a + s.bend * u * u;
          pts.push({ x: x + Math.cos(aa) * len * u, y: y + Math.sin(aa) * len * u });
        }
        const tip = pts[pts.length - 1];
        if (loose < 1) {
          g.lineStyle(2.2 * (1 - loose), this.tint(SOUND.smooth), 0.85 * (1 - loose));
          strokePts(g, pts);
        }
        const fly = loose * 40;
        musicNoteLayered(g, this.tint, tip.x + Math.cos(s.a) * fly, tip.y + Math.sin(s.a) * fly - loose * 20,
          4 + 3.5 * easeOut(lt), s.bend * 0.6, color, 1 - loose * loose, { flags: 1 });
      }
    });
    this.sparkle(x, y - 10, 6, 26, depth, SOUND.gold);
  }

  /** A misfire on an Out of Tune fighter: a cracked note dropping out of them, and the clash. */
  misfire(x: number, y: number, depth = 11): void {
    this.discord(x, y - 6, depth);
    this.anim(depth, 620, (g, t) => {
      const fade = 1 - t;
      const ny = y - 26 + 34 * easeIn(t);
      g.fillStyle(this.tint(SOUND.sour), 0.95 * fade);
      musicNote(g, x + 6, ny, 6, 0.6 + t * 1.4, { flags: 1 });
      // The crack through it.
      g.lineStyle(1.4, this.tint(SOUND.shade), fade);
      strokePts(g, [{ x: x + 2, y: ny - 4 }, { x: x + 6, y: ny }, { x: x + 4, y: ny + 2 }, { x: x + 9, y: ny + 5 }]);
    });
  }

  /**
   * One note of the solo, flown from the bell to whoever it was played at along a lazy arc.
   * Visual only — the kit lands the damage on the beat it was played.
   */
  noteShot(x1: number, y1: number, x2: number, y2: number, color: number, big = false, depth = 12): void {
    const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - 60 - Math.random() * 50;
    const lean = Math.random() - 0.5;
    this.anim(depth, 300, (g, t) => {
      const u = easeIn(t);
      const px = (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx + u * u * x2;
      const py = (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * my + u * u * y2;
      g.fillStyle(this.tint(color), 0.25);
      g.fillCircle(px, py, big ? 13 : 9);
      musicNoteLayered(g, this.tint, px, py, big ? 8 : 6, lean + t * 2, color, 1, { flags: big ? 2 : 1 });
    });
    this.scene.time.delayedCall(300, () => {
      this.boom(x2, y2, big ? 34 : 24, { color, mark: false, notes: big ? 3 : 2, duration: 300, depth: depth - 2 });
    });
  }

  /** Taking the stage: spotlights slam on from above and a fanfare of notes goes up. */
  fanfare(x: number, y: number, depth = 10): void {
    this.anim(depth, 700, (g, t) => {
      const fade = 1 - t;
      for (const side of [-1, 1]) {
        g.fillStyle(this.tint(SOUND.goldHi), 0.18 * fade);
        fillPts(g, [
          { x: x + side * 120, y: y - 220 }, { x: x + side * 100, y: y - 220 },
          { x: x - 40 * side, y: y + 18 }, { x: x + 40 * side * 0.2, y: y + 18 },
        ]);
      }
    });
    this.notes(x, y - 16, 9, { speed: 150, size: 8, life: 900, depth: depth + 1, color: SOUND.gold, rise: 60, angle: -Math.PI / 2, spread: 1.1 });
    this.sparkle(x, y - 20, 10, 40, depth + 1, SOUND.goldHi);
  }

  // ── Per-frame painters ──────────────────────────────────────────────────
  // Drawn into a Graphics the caller already owns, because these ride on live gameplay state.

  /** The fermata: an arc over a dot — "hold this note". Gold, with a soft halo behind it. */
  static drawFermata(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    x: number, y: number, size: number, color: number, alpha = 1,
  ): void {
    if (alpha <= 0.01) return;
    g.fillStyle(tint(color), alpha * 0.22);
    g.fillCircle(x, y - size * 0.3, size * 1.3);
    // The arc, as a crescent band so it thickens in the middle like engraved notation.
    g.fillStyle(tint(SOUND.goldHi), alpha);
    waveCrescent(g, x, y + size * 0.15, -Math.PI / 2, size, Math.PI / 2, size * 0.32, 0, 0);
    g.fillCircle(x, y - size * 0.05, size * 0.2);
  }

  /**
   * The drum major's baton: a chrome shaft wrapped in a maroon-and-gold spiral, a heavy ball at
   * one end and a ferrule at the other, spun about its centre.
   *
   * `spin` (0 → 1) is how fast it is going and drives everything that says so: ghost copies
   * trailing the rotation, a blur disc the size of the shaft, and gold sparks thrown off the
   * ball's path. A shadow underneath keeps it on the field rather than floating over it.
   */
  static drawBaton(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    x: number, y: number, rot: number, spin: number, t: number, alpha = 1, song: number = SOUND.gold,
  ): void {
    if (alpha <= 0.01) return;
    const half = 17;
    const lift = 10 + Math.sin(t * 3) * 1.5;
    const cy = y - lift;

    // Ground shadow, flattening and widening as the spin opens up.
    g.fillStyle(tint(SOUND.shade), alpha * 0.32);
    g.fillEllipse(x, y + 4, 22 + spin * 16, 7);

    // The blur disc a fast-spinning baton draws in the air.
    if (spin > 0.15) {
      g.fillStyle(tint(song), alpha * 0.1 * spin);
      g.fillCircle(x, cy, half + 6);
      g.lineStyle(1.5, tint(SOUND.chrome), alpha * 0.35 * spin);
      g.strokeCircle(x, cy, half + 1);
    }

    const shaft = (a: number, al: number): void => {
      const cos = Math.cos(a), sin = Math.sin(a);
      const ax = x - cos * half, ay = cy - sin * half;
      const bx = x + cos * half, by = cy + sin * half;
      g.lineStyle(4, tint(SOUND.steelDark), al);
      g.lineBetween(ax, ay, bx, by);
      g.lineStyle(2.4, tint(SOUND.chrome), al);
      g.lineBetween(ax, ay, bx, by);
      // The spiral wrap: short maroon and gold bands up the shaft.
      for (let i = 1; i < 6; i++) {
        const u = -0.7 + i * 0.23;
        const px = x + cos * half * u, py = cy + sin * half * u;
        g.fillStyle(tint(i % 2 ? SOUND.maroonHi : SOUND.gold), al);
        g.fillCircle(px, py, 1.9);
      }
      // Ferrule at the tip, the ball at the head.
      g.fillStyle(tint(SOUND.chrome), al);
      g.fillCircle(ax, ay, 2.6);
      g.fillStyle(tint(SOUND.steel), al);
      g.fillCircle(bx, by, 5.6);
      g.fillStyle(tint(SOUND.chrome), al);
      g.fillCircle(bx - 0.8, by - 0.8, 4.4);
      g.fillStyle(tint(SOUND.white), al * 0.95);
      g.fillCircle(bx - 1.8, by - 1.9, 1.5);
    };

    // Ghosts trailing the rotation — more, and further back, the faster it spins.
    const ghosts = spin > 0.12 ? Math.round(1 + spin * 3) : 0;
    for (let i = ghosts; i >= 1; i--) {
      shaft(rot - i * (0.16 + spin * 0.22), alpha * 0.22 * (1 - i / (ghosts + 1)));
    }
    shaft(rot, alpha);

    // Sparks flung off the ball's path at speed.
    if (spin > 0.45) {
      const n = Math.round(spin * 4);
      for (let i = 0; i < n; i++) {
        const a = rot - i * 0.5 - 0.3;
        const r = half + 3 + i * 2;
        g.fillStyle(tint(i % 2 ? SOUND.goldHi : song), alpha * (0.8 - i * 0.15));
        g.fillCircle(x + Math.cos(a) * r, cy + Math.sin(a) * r, 1.6);
      }
    }
  }

  /**
   * The solo stage: a short wooden riser draped in maroon bunting with gold fringe, footlights
   * along the lip, and two spotlight cones crossing on the soloist from above.
   */
  static drawStage(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    x: number, y: number, t: number, alpha = 1,
  ): void {
    if (alpha <= 0.01) return;
    const w = 128, halfW = w / 2;
    // Spotlights, under everything so the riser sits in them.
    for (const side of [-1, 1]) {
      const sway = Math.sin(t * 0.9 + side) * 10;
      g.fillStyle(tint(SOUND.goldHi), alpha * 0.08);
      fillPts(g, [
        { x: x + side * 150 + sway, y: y - 240 }, { x: x + side * 130 + sway, y: y - 240 },
        { x: x - side * 26, y: y + 6 }, { x: x + side * 34, y: y + 6 },
      ]);
    }
    g.fillStyle(tint(SOUND.goldHi), alpha * 0.12);
    g.fillEllipse(x, y + 2, 92, 26);

    g.fillStyle(tint(SOUND.shade), alpha * 0.45);
    g.fillEllipse(x, y + 22, w * 1.2, 20);

    // Riser body and deck boards.
    g.fillStyle(tint(SOUND.woodDark), alpha);
    g.fillRect(x - halfW, y + 2, w, 18);
    g.fillStyle(tint(SOUND.wood), alpha);
    g.fillRect(x - halfW, y - 8, w, 11);
    g.lineStyle(1, tint(SOUND.woodHi), alpha * 0.7);
    for (let i = 1; i < 6; i++) g.lineBetween(x - halfW + i * (w / 6), y - 8, x - halfW + i * (w / 6), y + 3);
    g.lineStyle(1.5, tint(SOUND.woodHi), alpha);
    g.lineBetween(x - halfW, y - 8, x + halfW, y - 8);

    // Bunting: four maroon swags hanging off the lip, each with gold fringe and a rosette.
    for (let i = 0; i < 4; i++) {
      const sx = x - halfW + i * (w / 4);
      const ex = sx + w / 4;
      const pts: Pt[] = [];
      for (let k = 0; k <= 10; k++) {
        const u = k / 10;
        pts.push({ x: sx + (ex - sx) * u, y: y + 2 + Math.sin(Math.PI * u) * 12 });
      }
      g.fillStyle(tint(SOUND.maroon), alpha);
      fillPts(g, [{ x: sx, y: y + 2 }, ...pts, { x: ex, y: y + 2 }]);
      g.fillStyle(tint(SOUND.maroonHi), alpha * 0.8);
      fillPts(g, [{ x: sx, y: y + 2 }, ...pts.map((p) => ({ x: p.x, y: y + 2 + (p.y - y - 2) * 0.45 })), { x: ex, y: y + 2 }]);
      g.lineStyle(1.6, tint(SOUND.gold), alpha);
      strokePts(g, pts);
      g.fillStyle(tint(SOUND.gold), alpha);
      g.fillCircle(sx, y + 3, 3);
    }
    g.fillStyle(tint(SOUND.gold), alpha);
    g.fillCircle(x + halfW, y + 3, 3);

    // Footlights, each on its own beat.
    for (let i = 0; i < 6; i++) {
      const lx = x - halfW + (i + 0.5) * (w / 6);
      const lit = 0.4 + 0.6 * Math.max(0, Math.sin(t * 6 + i));
      g.fillStyle(tint(SOUND.gold), alpha * lit * 0.35);
      g.fillCircle(lx, y - 8, 7);
      g.fillStyle(tint(SOUND.goldHi), alpha * lit);
      g.fillCircle(lx, y - 8, 2.2);
    }
  }

  /**
   * The bugle, held at the lips and pointed `dir`: a mouthpiece, one wrap of tubing and a flared
   * bell with a polished rim, with the call itself leaving the bell as rings of wavefront.
   */
  static drawBugle(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    x: number, y: number, dir: 1 | -1, t = 0, alpha = 1, blowing = 1,
  ): void {
    const s = dir;
    const bx = x + s * 6;
    const by = y - 4;
    g.fillStyle(tint(SOUND.brassShade), alpha);
    g.fillCircle(bx, by, 3.2);
    g.lineStyle(4.4, tint(SOUND.brassShade), alpha);
    strokePts(g, [
      { x: bx, y: by }, { x: bx + s * 17, y: by - 2 }, { x: bx + s * 24, y: by + 7 },
      { x: bx + s * 9, y: by + 10 }, { x: bx + s * 15, y: by + 2 }, { x: bx + s * 32, y: by - 1 },
    ]);
    g.lineStyle(2.6, tint(SOUND.brass), alpha);
    strokePts(g, [
      { x: bx, y: by }, { x: bx + s * 17, y: by - 2 }, { x: bx + s * 24, y: by + 7 },
      { x: bx + s * 9, y: by + 10 }, { x: bx + s * 15, y: by + 2 }, { x: bx + s * 32, y: by - 1 },
    ]);
    // A maroon pennant hanging under the tube — the band's colours.
    g.fillStyle(tint(SOUND.maroon), alpha);
    fillPts(g, [
      { x: bx + s * 14, y: by + 1 }, { x: bx + s * 28, y: by },
      { x: bx + s * 25, y: by + 12 + Math.sin(t * 5) * 1.5 }, { x: bx + s * 19, y: by + 9 },
    ]);
    g.fillStyle(tint(SOUND.gold), alpha);
    g.fillCircle(bx + s * 23, by + 5, 1.6);
    // Bell.
    g.fillStyle(tint(SOUND.brass), alpha);
    fillPts(g, [
      { x: bx + s * 30, y: by - 4 }, { x: bx + s * 46, y: by - 13 },
      { x: bx + s * 46, y: by + 11 }, { x: bx + s * 30, y: by + 3 },
    ]);
    g.fillStyle(tint(SOUND.brassShade), alpha * 0.7);
    fillPts(g, [
      { x: bx + s * 34, y: by + 1 }, { x: bx + s * 46, y: by + 4 },
      { x: bx + s * 46, y: by + 11 }, { x: bx + s * 30, y: by + 3 },
    ]);
    g.lineStyle(2.4, tint(SOUND.brassHi), alpha);
    g.lineBetween(bx + s * 46, by - 13, bx + s * 46, by + 11);
    g.lineStyle(1.3, tint(SOUND.brassHi), alpha * 0.8);
    g.lineBetween(bx + s * 3, by - 2.5, bx + s * 17, by - 4.5);
    if (blowing > 0) {
      for (let i = 0; i < 3; i++) {
        const lt = (t * 1.8 + i / 3) % 1;
        g.fillStyle(tint(SOUND.brassHi), alpha * 0.75 * (1 - lt) * blowing);
        waveCrescent(g, bx + s * 46, by - 1, s > 0 ? 0 : Math.PI, 8 + lt * 30, 0.75, 6 * (1 - lt * 0.6), 2, t * 14);
      }
    }
  }

  /**
   * Out of Tune, worn by the victim: a discordant line struck straight through the body — a
   * jagged, vibrating zigzag in sour yellow over a crimson shadow — with a sharp-and-flat pair
   * clashing over the head. The jitter is re-rolled from `t` so it never settles into a pattern.
   */
  static drawOutOfTune(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    x: number, y: number, t: number, alpha = 1,
  ): void {
    if (alpha <= 0.01) return;
    const seg = 9;
    const pts: Pt[] = [];
    const phase = Math.floor(t * 14);
    for (let i = 0; i <= seg; i++) {
      const u = i / seg;
      const jit = Math.sin(phase * 7.1 + i * 12.9) * 4.5 + (i % 2 ? 3 : -3);
      pts.push({ x: x - 26 + u * 52, y: y - 4 + jit + Math.sin(u * 7 + t * 9) * 2 });
    }
    g.lineStyle(4, tint(SOUND.crimson), alpha * 0.4);
    strokePts(g, pts);
    g.lineStyle(1.8, tint(SOUND.sour), alpha * 0.95);
    strokePts(g, pts);
    // Second, thinner line out of phase with the first — the two notes beating against each other.
    const pts2 = pts.map((p, i) => ({ x: p.x, y: p.y + 5 + Math.sin(t * 23 + i) * 2.5 }));
    g.lineStyle(1.1, tint(SOUND.sour), alpha * 0.55);
    strokePts(g, pts2);

    // A flat sign over the head, wobbling against a struck-through note.
    const hx = x + 2, hy = y - 40 + Math.sin(t * 5) * 1.5;
    g.lineStyle(1.6, tint(SOUND.sour), alpha);
    g.lineBetween(hx - 7, hy - 9, hx - 7, hy + 3);
    g.beginPath();
    g.arc(hx - 4.5, hy, 3, -Math.PI * 0.7, Math.PI * 0.6, false);
    g.strokePath();
    g.fillStyle(tint(SOUND.sour), alpha);
    musicNote(g, hx + 6, hy + 1, 4.4, 0.3 + Math.sin(t * 7) * 0.25, { flags: 1 });
    g.lineStyle(1.4, tint(SOUND.crimson), alpha);
    g.lineBetween(hx + 1, hy - 6, hx + 12, hy + 5);
  }

  /**
   * Crescendo's trail: a three-line stave laid along the path the dancer took, notes sitting on
   * it, fading by age. `pts` carry their own birth time; `life` is how long a point lasts.
   */
  static drawMusicTrail(
    g: Phaser.GameObjects.Graphics, tint: SoundColorFn,
    pts: { x: number; y: number; at: number }[], now: number, life: number, color: number,
  ): void {
    if (pts.length < 2) return;
    for (let line = -1; line <= 1; line++) {
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const age = Phaser.Math.Clamp(1 - (now - b.at) / life, 0, 1);
        if (age <= 0) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len * 5 * line, ny = dx / len * 5 * line;
        g.lineStyle(line === 0 ? 1.8 : 1.2, tint(line === 0 ? color : SOUND.goldHi), age * 0.75);
        g.lineBetween(a.x + nx, a.y + ny, b.x + nx, b.y + ny);
      }
    }
    for (let i = 2; i < pts.length; i += 3) {
      const p = pts[i];
      const age = Phaser.Math.Clamp(1 - (now - p.at) / life, 0, 1);
      if (age <= 0) continue;
      const q = pts[i - 1];
      const ang = Math.atan2(p.y - q.y, p.x - q.x);
      const step = ((i * 7) % 3) - 1;
      const ox = -Math.sin(ang) * 5 * step, oy = Math.cos(ang) * 5 * step;
      musicNoteLayered(g, tint, p.x + ox, p.y + oy, 4.6, 0, i % 2 ? color : SOUND.gold, age, { flags: i % 3 });
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

// ── SoundAvatar ───────────────────────────────────────────────────────────

/**
 * One white-gloved hand of the drum major, outermost disc first: a soft corona that takes the
 * soul song's colour, the glove's shaded rim, the glove, and a glint.
 */
const SOUND_AVATAR: AvatarSpec = {
  hands: [
    { r: 10, color: SOUND.gold, alpha: 0.18 },
    { r: 6.8, color: SOUND.gloveShade, alpha: 1 },
    { r: 5.3, color: SOUND.glove, alpha: 1 },
    { r: 2.4, color: SOUND.white, alpha: 0.95, ox: -1.2, oy: -1.4 },
  ],
  eyeWhite: SOUND.ivory,
  eyePupil: SOUND.night,
  squash: { div: 12, x: 0.5, y: 0.28 },
};

/** What the drum major is holding: nothing (the baton is out on the field), or the bugle. */
export type SoundInstrument = 'none' | 'bugle';

/**
 * The drum major: a maroon orb (the baked `elem-sound` texture) in white gloves, wearing one
 * accessory — a **shako**, the tall band hat, with a gold band, a sunburst plate and a plume.
 * The plume is the one thing that changes: it takes the colour of the soul song being hummed,
 * so the read on what the character is doing is right on top of them.
 *
 * The baton is not part of the rig: it is always out on the field chasing the cursor, drawn by
 * the kit. The bugle is — it sits at the lips for the length of the solo.
 *
 * Mastery enhances what is already there: a taller, gilded plume, a wider gold band, gold eyes
 * and a wider corona round each glove.
 */
export class SoundAvatar extends BaseAvatar {
  private fx: SoundFx;
  private instrument: SoundInstrument = 'none';
  private song: number = SOUND.staccato;
  private songPale: number = SOUND.staccatoPale;
  /** 0 → 1 while the Crescendo dance is on: the hat bobs harder and the plume whips round. */
  private dance = 0;

  constructor(scene: Phaser.Scene, tint: SoundColorFn, owner: 'player' | 'npc' = 'player', depth = 6) {
    super(scene, tint, depth, SOUND_AVATAR);
    this.fx = new SoundFx(scene, tint);
    void owner;
  }

  setInstrument(i: SoundInstrument): void { this.instrument = i; }
  /** The soul song's colours — the plume and the glove coronas pick them up. */
  setSong(color: number, pale: number): void {
    if (color === this.song) return;
    this.song = color;
    this.songPale = pale;
    this.forEachHandLayer(0, (halo) => halo.setFillStyle(this.tint(color), this.mastered ? 0.3 : 0.2));
  }
  setDance(v: number): void { this.dance = Phaser.Math.Clamp(v, 0, 1); }

  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? SOUND.goldHi : SOUND.ivory);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 13 : 10);
      halo.setFillStyle(this.tint(this.song), on ? 0.3 : 0.2);
    });
  }

  /** Fast-moving gloves shed notes in the song's colour. */
  protected emitTrail(x: number, y: number): void {
    this.fx.notes(x, y, 1, { speed: 16, size: 4.6, life: 600, depth: 5, color: this.song, rise: 18 });
  }

  /** At the bugle: both gloves up at the face, fingering the valves that aren't there. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    const pick = Math.sin(this.t * 14 + side * 1.6);
    return {
      ang: this.facing + side * (side > 0 ? 0.35 : 1.25),
      dist: 16 + pick * 2.5,
      scale: idle.scale * (1 + Math.abs(pick) * 0.1),
    };
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const k = this.intensity * (this.mastered ? 1.15 : 1);
    g.fillStyle(this.tint(SOUND.maroonHi), a * (this.mastered ? 0.3 : 0.22) * k);
    g.fillCircle(x, y, 27 * k);
    if (this.dance > 0) {
      g.fillStyle(this.tint(this.song), a * 0.2 * this.dance);
      g.fillCircle(x, y, 32);
    }
  }

  /**
   * The shako, rooted at the crown so it never covers the face, and the bugle at the lips while
   * the solo is on.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const bob = Math.sin(this.t * (2.6 + this.dance * 9)) * (1.1 + this.dance * 2);
    const tilt = Math.sin(this.t * 7) * 0.12 * this.dance + Math.cos(this.facing) * 0.06;
    const cos = Math.cos(tilt), sin = Math.sin(tilt);
    // Hat-local → world, pivoting about the crown.
    const hx0 = x, hy0 = y - 15 + bob;
    const at = (lx: number, ly: number): Pt => ({ x: hx0 + lx * cos - ly * sin, y: hy0 + lx * sin + ly * cos });

    // Plume first, behind the hat: a teardrop feather rising out of the top, whipping in the dance.
    const plumeH = this.mastered ? 19 : 15;
    const whip = Math.sin(this.t * (3 + this.dance * 10)) * (2 + this.dance * 5);
    const base = at(0, -21);
    const tipPt = at(whip, -21 - plumeH);
    const midL = at(-5 + whip * 0.5, -21 - plumeH * 0.45);
    const midR = at(5 + whip * 0.5, -21 - plumeH * 0.45);
    g.fillStyle(this.tint(this.song), alpha);
    fillPts(g, [base, midR, tipPt, midL]);
    g.fillStyle(this.tint(this.songPale), alpha * 0.9);
    fillPts(g, [at(0, -22), at(2 + whip * 0.5, -21 - plumeH * 0.5), tipPt, at(-1.5 + whip * 0.5, -21 - plumeH * 0.5)]);
    if (this.mastered) {
      g.lineStyle(1.2, this.tint(SOUND.goldHi), alpha);
      strokePts(g, [base, midR, tipPt, midL], true);
    }

    // The hat body: a trapezoid, a touch narrower at the crown, near-black so the orb stays the colour.
    g.fillStyle(this.tint(SOUND.shako), alpha);
    fillPts(g, [at(-10.5, -1), at(10.5, -1), at(9, -21), at(-9, -21)]);
    g.fillStyle(this.tint(SOUND.shakoHi), alpha);
    fillPts(g, [at(-9, -21), at(-3, -21), at(-4.5, -1), at(-10.5, -1)]);
    // Gold top rim and band.
    const band = this.mastered ? 4.6 : 3.2;
    g.fillStyle(this.tint(SOUND.gold), alpha);
    fillPts(g, [at(-9.3, -22.2), at(9.3, -22.2), at(9, -20), at(-9, -20)]);
    fillPts(g, [at(-10.6, -1 - band), at(10.6, -1 - band), at(10.7, -1), at(-10.7, -1)]);
    // Sunburst plate on the front.
    const plate = at(0, -11);
    g.fillStyle(this.tint(SOUND.goldShade), alpha);
    g.fillCircle(plate.x, plate.y, 4.6);
    g.fillStyle(this.tint(SOUND.gold), alpha);
    for (let i = 0; i < 8; i++) {
      const ra = (i / 8) * TAU + tilt;
      fillPts(g, [
        { x: plate.x + Math.cos(ra - 0.22) * 2.6, y: plate.y + Math.sin(ra - 0.22) * 2.6 },
        { x: plate.x + Math.cos(ra) * 6.4, y: plate.y + Math.sin(ra) * 6.4 },
        { x: plate.x + Math.cos(ra + 0.22) * 2.6, y: plate.y + Math.sin(ra + 0.22) * 2.6 },
      ]);
    }
    g.fillStyle(this.tint(SOUND.goldHi), alpha);
    g.fillCircle(plate.x, plate.y, 2.4);
    g.fillStyle(this.tint(SOUND.maroonHi), alpha);
    g.fillCircle(plate.x, plate.y, 1.2);
    // The visor, a dark lip just over the brow.
    g.fillStyle(this.tint(SOUND.shade), alpha);
    fillPts(g, [at(-11, -1), at(11, -1), at(8, 2.4), at(-8, 2.4)]);

    if (this.instrument === 'bugle') {
      const dir = Math.cos(this.facing) >= 0 ? 1 : -1;
      SoundFx.drawBugle(g, this.tint, x, y + 4, dir, this.t, alpha);
    }
  }
}
