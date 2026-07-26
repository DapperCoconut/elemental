import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Shadow renders: the umbral avatar (ball arms + eyes + a
 * crown of writhing tendrils), the shroud aura, and the one-shot effects every shadow ability
 * fires off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live
 * in ElementVisuals.ts and are shared with the other elements. What stays here is what makes
 * shadow shadow: the barbed tendril, the palette, and the effects built out of them.
 *
 * Colours must come from the SHADOW palette below. Shadow has no skin yet, but
 * every call still routes through the owner's `shadowColor` mapper, so the day one lands it is
 * a table edit in SkinsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — SkinsKit.shadowColor bound to one owner. */
export type ShadowColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const SHADOW = {
  abyss: 0x08000f,
  pitch: 0x120020,
  umbra: 0x1e0033,
  violet: 0x330055,
  plum: 0x4a1170,
  orchid: 0x6600aa,
  amethyst: 0x8800cc,
  lilac: 0xaa44ff,
  mauve: 0xcc88ff,
  pale: 0xe6ccff,
  white: 0xffffff,
  /** Watcher eyes and the tripwire barbs — the one warm note the element is allowed. */
  blood: 0xcc2244,
} as const;

// ── The primitive ─────────────────────────────────────────────────────────

/** Points along a tendril's centreline. More than this and the silhouette stops paying for itself. */
const TENDRIL_SEGS = 9;

/**
 * A barbed tentacle: thick at the root, tapering to a needle point, bent sideways by `curve`
 * and rippled along its length by `wave`. This is the primitive every shadow shape is built
 * from — the wall spikes, the drain bolt, blast shrapnel, the drag tether and the avatar's
 * crown all call it.
 *
 * The taper is `(1-f)^0.72` rather than linear, which keeps the shaft fat most of the way out
 * and then collapses hard at the tip. A linear taper reads as a triangle; this reads as a limb.
 */
export function shadowTendril(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  curve = 0, wave = 0, phase = 0,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  const at = (f: number) => {
    const lateral = curve * f * f + Math.sin(f * 3.4 + phase) * wave * f;
    return { x: cx + cos * len * f + px * lateral, y: cy + sin * len * f + py * lateral };
  };

  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i <= TENDRIL_SEGS; i++) {
    const f = i / TENDRIL_SEGS;
    const p = at(f);
    const w = halfW * Math.pow(1 - f, 0.72);
    left.push([p.x + px * w, p.y + py * w]);
    right.push([p.x - px * w, p.y - py * w]);
  }

  g.beginPath();
  g.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i++) g.lineTo(left[i][0], left[i][1]);
  for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
  g.closePath();
  g.fillPath();

  // Rounded root and two knuckles down the shaft. Without them a ring of tendrils reads as a
  // starburst of shards; with them it reads as something with joints that grew out of a body.
  g.fillCircle(cx, cy, halfW);
  const k1 = at(0.3), k2 = at(0.58);
  g.fillCircle(k1.x, k1.y, halfW * 0.74);
  g.fillCircle(k2.x, k2.y, halfW * 0.46);
}

/** Hooked barbs alternating down a tendril, each raked back toward the root. */
function shadowBarbs(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  curve: number, wave: number, phase: number,
  count: number,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  for (let i = 1; i <= count; i++) {
    const f = i / (count + 1);
    const lateral = curve * f * f + Math.sin(f * 3.4 + phase) * wave * f;
    const bx = cx + cos * len * f + px * lateral;
    const by = cy + sin * len * f + py * lateral;
    const side = i % 2 === 0 ? 1 : -1;
    const w = halfW * Math.pow(1 - f, 0.72);
    // Barbs point back down the shaft — a forward-raked hook reads as a fin.
    shadowTendril(
      g,
      bx + px * side * w * 0.6, by + py * side * w * 0.6,
      angle + side * 1.5 + Math.PI * 0.16,
      len * 0.2 * (1 - f * 0.5), w * 0.55,
      -side * len * 0.05,
    );
  }
}

export interface TendrilLayerOpts {
  /** Hooked barbs down the shaft. Defaults to 3; 0 for a smooth limb. */
  barbs?: number;
  /** Draw the bright rim highlight along the outer flank. Default true. */
  rim?: boolean;
}

/**
 * Layered tendril: an amethyst haze bleeding off the edges, a violet body, and a void spine
 * running up the middle.
 *
 * Note this is the inverse of a flame tongue's layering — fire brightens toward its core, a
 * shadow *darkens* toward it, because the thing is an absence of light with a lit rim where it
 * meets the world. Getting that backwards makes the element look like purple fire.
 */
export function shadowTendrilLayered(
  g: Phaser.GameObjects.Graphics,
  tint: ShadowColorFn,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  curve: number, alpha: number,
  wave = 0, phase = 0,
  opts: TendrilLayerOpts = {},
): void {
  const barbs = opts.barbs ?? 3;

  g.fillStyle(tint(SHADOW.amethyst), alpha * 0.2);
  shadowTendril(g, cx, cy, angle, len * 1.02, halfW * 1.55, curve, wave, phase);
  g.fillStyle(tint(SHADOW.violet), alpha * 0.95);
  shadowTendril(g, cx, cy, angle, len, halfW, curve, wave, phase);
  g.fillStyle(tint(SHADOW.abyss), alpha * 0.9);
  shadowTendril(g, cx, cy, angle, len * 0.88, halfW * 0.52, curve * 0.9, wave * 0.9, phase);

  if (barbs > 0) {
    g.fillStyle(tint(SHADOW.plum), alpha * 0.9);
    shadowBarbs(g, cx, cy, angle, len, halfW, curve, wave, phase, barbs);
  }

  if (opts.rim !== false) {
    // Lit edge along one flank only. A symmetric outline turns the limb into a decal.
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const px = -sin, py = cos;
    g.lineStyle(1.4, tint(SHADOW.lilac), alpha * 0.55);
    g.beginPath();
    for (let i = 0; i <= TENDRIL_SEGS; i++) {
      const f = i / TENDRIL_SEGS;
      const lateral = curve * f * f + Math.sin(f * 3.4 + phase) * wave * f;
      const w = halfW * Math.pow(1 - f, 0.72);
      const X = cx + cos * len * f + px * (lateral + w);
      const Y = cy + sin * len * f + py * (lateral + w);
      if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y);
    }
    g.strokePath();
  }
}

export interface ImplosionOpts {
  /** Tendrils flung out of the collapse. Defaults to radius/7. */
  tendrils?: number;
  /** Rising gloom puffs. Defaults to radius/26. */
  gloom?: number;
  /** Leave a creeping stain on the ground. Default true. */
  stain?: boolean;
  /** Render depth of the void body. Default 6. */
  depth?: number;
  /** Total life of the void body in ms. Defaults to scale with radius. */
  duration?: number;
}

export interface WispOpts {
  speed?: number;
  spread?: number;
  angle?: number;
  size?: number;
  life?: number;
  depth?: number;
  /** Pixels the motes climb over their life. Negative to make them sink. */
  rise?: number;
}

// ── ShadowFx ──────────────────────────────────────────────────────────────

/**
 * One-shot shadow effects. Cheap to construct — build one per owner (or per cast, as the
 * ability files do) and hand it the owner's colour mapper.
 */
export class ShadowFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: ShadowColorFn = (c) => c) {
    super(scene, tint);
  }

  /**
   * Expanding shock front. Unlike a water ripple this one is genuinely ragged — the rim is
   * re-jittered per vertex and rakes inward, so it reads as darkness tearing rather than as a
   * clean wave. Segment count tracks radius or big blasts visibly turn into polygons.
   */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration: number, width = 4, depth = 6): void {
    const c = this.tint(color);
    const segs = Phaser.Math.Clamp(Math.round(toR / 3), 36, 120);
    const jitter = Array.from({ length: segs }, () => 0.86 + Math.random() * 0.28);
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      const rough = 1 - t * 0.6;
      g.lineStyle(Math.max(0.5, width * (1 - t * 0.7)), c, 0.8 * (1 - t * t));
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const idx = i % segs;
        const a = (idx / segs) * TAU;
        const rr = r * (1 + (jitter[idx] - 1) * rough);
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.strokePath();
    });
  }

  /**
   * The first two frames of a shadow impact: a pale corona thrown outward around a hole that
   * is *darker* than the arena floor. Light-coloured impact flashes belong to fire; shadow
   * announces itself by removing the picture underneath it.
   */
  flash(x: number, y: number, radius: number, depth = 7): void {
    this.anim(depth, 170, (g, t) => {
      g.fillStyle(this.tint(SHADOW.mauve), (1 - t) * 0.55);
      g.fillCircle(x, y, radius * (0.9 + t * 1.7));
      g.fillStyle(this.tint(SHADOW.amethyst), (1 - t) * 0.7);
      g.fillCircle(x, y, radius * (0.7 + t * 1.1));
      g.fillStyle(this.tint(SHADOW.abyss), (1 - t * 0.5) * 0.95);
      g.fillCircle(x, y, radius * (0.55 + t * 0.7));
    });
  }

  /**
   * A stain that creeps outward from the impact point and then evaporates from the edges in.
   * Deliberately blotchy and short of a full disc — a solid circle reads as placeholder art,
   * while a ragged blot with a few crawling filaments reads as something that was spilled.
   */
  stain(x: number, y: number, radius: number, depth = 1): void {
    const blots = Array.from({ length: 8 }, () => {
      const a = Math.random() * TAU;
      const d = Math.random() * radius * 0.55;
      return {
        x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.72,
        r: radius * (0.28 + Math.random() * 0.46),
      };
    });
    const creepers = Array.from({ length: 6 }, () => ({
      ang: Math.random() * TAU,
      len: radius * (0.5 + Math.random() * 0.6),
      w: 2 + Math.random() * 2.4,
      curve: (Math.random() - 0.5) * radius * 0.5,
    }));
    this.anim(depth, 2400, (g, t) => {
      const a = t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88;
      const grow = easeOut(Math.min(1, t * 3));
      for (const b of blots) {
        g.fillStyle(this.tint(SHADOW.abyss), 0.4 * a);
        g.fillEllipse(b.x, b.y, b.r * 2 * grow, b.r * 1.55 * grow);
        g.fillStyle(this.tint(SHADOW.violet), 0.16 * a);
        g.fillEllipse(b.x, b.y, b.r * 1.2 * grow, b.r * 0.9 * grow);
      }
      // Filaments crawling out of the blot, retracting before the body fades.
      const crawl = Math.max(0, 1 - t * 1.6);
      for (const c of creepers) {
        g.fillStyle(this.tint(SHADOW.pitch), 0.42 * a);
        shadowTendril(g, x, y, c.ang, c.len * grow * crawl, c.w * crawl, c.curve * grow);
      }
    });
  }

  /**
   * Motes of darkness shed off a moving thing. Each one is a short tendril drawn from where
   * it was to where it is, so a fast burst reads as streaks and a dying one settles into
   * specks. The shadow answer to fire's embers.
   */
  wisps(x: number, y: number, count: number, opts: WispOpts = {}): void {
    const speed = opts.speed ?? 90;
    const spread = opts.spread ?? Math.PI;
    const baseAngle = opts.angle ?? 0;
    const size = opts.size ?? 3;
    const life = opts.life ?? 480;
    const rise = opts.rise ?? 14;
    const depth = opts.depth ?? 6;

    const parts = Array.from({ length: count }, () => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        cos: Math.cos(a), sin: Math.sin(a),
        v: speed * (0.4 + Math.random() * 0.95),
        r: size * (0.5 + Math.random() * 0.9),
        bright: Math.random() < 0.35,
        curl: (Math.random() - 0.5) * 1.6,
        delay: Math.random() * 0.2,
      };
    });

    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const prev = Math.max(0, lt - 0.12);
        const secs = life / 1000;
        const cur = p.v * easeOut(lt) * secs;
        const old = p.v * easeOut(prev) * secs;
        const ex = x + p.cos * cur, ey = y + p.sin * cur - rise * lt;
        const bx = x + p.cos * old, by = y + p.sin * old - rise * prev;
        const stretch = Math.hypot(ex - bx, ey - by);
        const fade = 1 - lt * lt;
        const ang = stretch > 0.4 ? Math.atan2(ey - by, ex - bx) : Math.atan2(p.sin, p.cos);
        g.fillStyle(this.tint(p.bright ? SHADOW.lilac : SHADOW.violet), 0.85 * fade);
        shadowTendril(g, bx, by, ang, stretch + p.r * 2, p.r * fade, p.curl * stretch * 0.4);
        g.fillStyle(this.tint(SHADOW.abyss), 0.7 * fade);
        g.fillCircle(bx, by, p.r * fade * 0.5);
      }
    });
  }

  /** Heavy dark puffs rolling up out of an impact — the tail end of anything big. */
  gloom(x: number, y: number, count: number, radius: number, depth = 4): void {
    const puffs = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * radius * 1.3,
      oy: (Math.random() - 0.5) * radius * 0.8,
      r: radius * (0.26 + Math.random() * 0.34),
      drift: (Math.random() - 0.5) * 30,
      delay: Math.random() * 0.32,
    }));
    this.anim(depth, 1300, (g, t) => {
      for (const p of puffs) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const cx = x + p.ox + p.drift * lt;
        const cy = y + p.oy - 34 * lt;
        g.fillStyle(this.tint(SHADOW.pitch), 0.34 * (1 - lt));
        g.fillCircle(cx, cy, p.r * (0.6 + lt * 1.35));
        g.fillStyle(this.tint(SHADOW.orchid), 0.1 * (1 - lt));
        g.fillCircle(cx, cy, p.r * (0.4 + lt * 0.9));
      }
    });
  }

  /**
   * The heaving void at the centre of an implosion: overlapping lobes that swell, roll and
   * collapse inward, ringed by a bright event edge. Reads as volume being eaten rather than as
   * a flat disc being scaled.
   */
  voidCore(x: number, y: number, radius: number, duration: number, depth = 6): void {
    const lobes = Array.from({ length: 9 }, (_, i) => ({
      ang: (i / 9) * TAU + Math.random() * 0.6,
      off: 0.24 + Math.random() * 0.42,
      r: 0.38 + Math.random() * 0.3,
      phase: Math.random() * TAU,
    }));
    this.anim(depth, duration, (g, t) => {
      const grow = 0.35 + easeOut(Math.min(1, t * 1.5)) * 0.85;
      const fade = t < 0.3 ? 1 : 1 - (t - 0.3) / 0.7;
      const wob = t * 9;

      // Corona first, so the dark body punches a hole through the middle of it.
      const shell = [
        { c: SHADOW.orchid, s: 1.1, a: 0.34 },
        { c: SHADOW.plum, s: 0.9, a: 0.6 },
        { c: SHADOW.umbra, s: 0.68, a: 0.9 },
        { c: SHADOW.abyss, s: 0.42, a: 0.95 },
      ];
      for (const layer of shell) {
        g.fillStyle(this.tint(layer.c), layer.a * fade);
        g.fillCircle(x, y, radius * grow * layer.s);
        for (const l of lobes) {
          const lr = radius * grow * layer.s * l.r * (0.85 + Math.sin(wob + l.phase) * 0.18);
          const ld = radius * grow * layer.s * l.off;
          g.fillCircle(x + Math.cos(l.ang) * ld, y + Math.sin(l.ang) * ld, lr);
        }
      }
      // Event edge, thinning as the collapse settles.
      g.lineStyle(2.5, this.tint(SHADOW.mauve), 0.5 * fade);
      g.strokeCircle(x, y, radius * grow * 0.98);
    });
  }

  /**
   * Ring of tendrils lashing outward and then whipping back in. Used wherever shadow erupts:
   * it is the shape that separates a shadow blast from an explosion of anything else, because
   * the limbs *return* instead of dispersing.
   */
  tendrilBurst(x: number, y: number, radius: number, count = 10, depth = 4): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      // Uneven lengths, staggered roots and per-limb delays: limbs fired from one point at one
      // length read as a starburst, so every one of these is deliberately out of step.
      ang: (i / count) * TAU + (Math.random() - 0.5) * 0.85,
      root: radius * (0.1 + Math.random() * 0.28),
      len: radius * (0.45 + Math.random() * 0.75),
      w: radius * (0.1 + Math.random() * 0.1),
      curve: (Math.random() - 0.5) * radius * 0.6,
      wave: (Math.random() - 0.5) * radius * 0.2,
      phase: Math.random() * TAU,
      delay: Math.random() * 0.28,
    }));
    this.anim(depth, 520, (g, t) => {
      for (const s of seeds) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        // Out fast, back in slowly — the retraction is the whole point.
        const reach = lt < 0.35 ? easeOut(lt / 0.35) : 1 - easeIn((lt - 0.35) / 0.65) * 0.75;
        const fade = 1 - easeIn(lt);
        const rx = x + Math.cos(s.ang) * s.root * reach;
        const ry = y + Math.sin(s.ang) * s.root * reach;
        shadowTendrilLayered(
          g, this.tint, rx, ry, s.ang,
          s.len * reach, s.w * (1 - lt * 0.35), s.curve * lt, 0.85 * fade,
          s.wave, s.phase, { barbs: 2 },
        );
      }
    });
  }

  /** Corona + heaving void + stacked shock fronts + lashing limbs + motes + gloom + stain. */
  implosion(x: number, y: number, radius: number, opts: ImplosionOpts = {}): void {
    const limbs = opts.tendrils ?? Math.max(7, Math.round(radius / 7));
    const gloomCount = opts.gloom ?? Math.round(radius / 26);
    const dur = opts.duration ?? Math.round(340 + radius * 1.5);
    const depth = opts.depth ?? 6;

    if (opts.stain !== false) this.stain(x, y, radius * 0.6);
    this.voidCore(x, y, radius * 0.7, dur, depth);
    this.flash(x, y, radius * 0.34, depth + 1);
    this.tendrilBurst(x, y, radius * 0.95, limbs, depth);
    this.ring(x, y, radius * 0.2, radius * 1.1, SHADOW.mauve, Math.round(dur * 0.75), 5, depth);
    this.scene.time.delayedCall(90, () => this.ring(x, y, radius * 0.15, radius * 1.35, SHADOW.lilac, dur, 4, depth));
    this.scene.time.delayedCall(190, () => this.ring(x, y, radius * 0.1, radius * 1.5, SHADOW.orchid, dur, 3, depth));
    this.wisps(x, y, Math.round(radius / 8), {
      speed: radius * 2, size: 2.6 + radius / 55,
      life: Math.round(dur * 1.4), rise: radius * 0.3, depth,
    });
    if (gloomCount > 0) this.gloom(x, y, gloomCount, radius * 0.85, depth - 2);
  }

  /**
   * A whipping lash of darkness: nested tendrils of unequal length that re-roll every tick, so
   * a held reach churns instead of strobing one fixed shape. Motes shear off the tip.
   */
  lash(x: number, y: number, angle: number, length: number, depth = 4): void {
    const limbs = Array.from({ length: 4 }, (_, i) => ({
      off: (i - 1.5) * 0.1,
      len: length * (0.68 + Math.random() * 0.4),
      w: 8 + Math.random() * 6,
      curve: (Math.random() - 0.5) * 26,
      wave: (Math.random() - 0.5) * 18,
      phase: Math.random() * TAU,
    }));
    this.anim(depth, 200, (g, t) => {
      const grow = 0.6 + easeOut(t) * 0.5;
      const fade = 1 - easeIn(t);
      for (const l of limbs) {
        shadowTendrilLayered(
          g, this.tint,
          x + Math.cos(angle + l.off) * 14, y + Math.sin(angle + l.off) * 14,
          angle + l.off, l.len * grow, l.w, l.curve * t, 0.75 * fade,
          l.wave, l.phase, { barbs: 3 },
        );
      }
      // Umbral bloom where the lash leaves the caster.
      g.fillStyle(this.tint(SHADOW.abyss), 0.55 * fade);
      g.fillCircle(x + Math.cos(angle) * 16, y + Math.sin(angle) * 16, 11 * grow);
    });
    if (Math.random() < 0.5) {
      this.wisps(x + Math.cos(angle) * length * 0.75, y + Math.sin(angle) * length * 0.75, 2,
        { angle, spread: 0.6, speed: 70, size: 2.4, life: 400, rise: 8, depth });
    }
  }

  /** Recoil umbra at the throwing hand — sells that a shot actually left a body. */
  muzzleUmbra(x: number, y: number, angle: number, scale = 1, depth = 6): void {
    this.anim(depth, 150, (g, t) => {
      const fade = 1 - t;
      g.fillStyle(this.tint(SHADOW.violet), 0.75 * fade);
      shadowTendril(g, x, y, angle, 26 * scale * (0.6 + t * 0.9), 7 * scale * fade);
      g.fillStyle(this.tint(SHADOW.abyss), 0.85 * fade);
      g.fillCircle(x, y, 5.5 * scale * (1 - t * 0.35));
      g.fillStyle(this.tint(SHADOW.mauve), 0.45 * fade * fade);
      g.strokeCircle(x, y, 7 * scale * (1 + t));
      // Back-wash: the dark shoved sideways as the shot leaves.
      g.fillStyle(this.tint(SHADOW.plum), 0.4 * fade);
      shadowTendril(g, x, y, angle + Math.PI * 0.74, 13 * scale * fade, 3.4 * scale * fade);
      shadowTendril(g, x, y, angle - Math.PI * 0.74, 13 * scale * fade, 3.4 * scale * fade);
    });
    this.wisps(x, y, 3, { angle, spread: 0.75, speed: 90, size: 2.2, life: 320, rise: 6, depth });
  }

  /**
   * The smear left behind a dash: a tapered corridor of darkness with tendrils peeling off both
   * flanks, plus motes kicked backward out of the launch point.
   */
  smear(x1: number, y1: number, x2: number, y2: number, depth = 4): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const steps = Math.max(3, Math.round(dist / 24));
    this.anim(depth, 420, (g, t) => {
      const fade = 1 - t;
      for (let i = 0; i < steps; i++) {
        const f = i / (steps - 1 || 1);
        const px = x1 + (x2 - x1) * f;
        const py = y1 + (y2 - y1) * f;
        // Fattest at the launch point and draining from the back forward.
        const local = Math.max(0, fade - f * 0.35);
        const r = (5 + (1 - f) * 11) * local;
        if (r <= 0) continue;
        g.fillStyle(this.tint(SHADOW.abyss), 0.55 * local);
        g.fillCircle(px, py, r * 1.25);
        g.fillStyle(this.tint(SHADOW.violet), 0.42 * local);
        g.fillCircle(px, py, r);
        for (const s of [1, -1]) {
          g.fillStyle(this.tint(SHADOW.plum), 0.5 * local);
          shadowTendril(g, px, py, angle + s * (Math.PI / 2), (6 + f * 20) * local, 2.6 * local, s * 6 * f);
        }
      }
    });
    this.wisps(x1, y1, 9, { angle: angle + Math.PI, spread: 0.95, speed: 130, size: 2.8, life: 460, rise: 10, depth });
    this.ring(x1, y1, 6, 44, SHADOW.lilac, 380, 3, depth);
  }

  /** Ignition burst for a toggle or a stance: limbs thrown out of the body all at once. */
  bloom(x: number, y: number, radius: number, count = 10, depth = 5): void {
    this.tendrilBurst(x, y, radius, count, depth);
    this.ring(x, y, 8, radius * 1.2, SHADOW.pale, 380, 4, depth);
    this.wisps(x, y, Math.round(count * 0.8), { speed: radius * 1.4, size: 2.8, life: 520, rise: 18, depth });
  }

  /**
   * Inward-spiralling gather: darkness dragged from the rim into a compressing core while a
   * containment ring squeezes shut, so a wind-up visibly earns its payoff. `follow` lets it
   * track a moving caster through the channel.
   */
  channelGather(
    x: number, y: number, radius: number, duration: number,
    follow?: () => { x: number; y: number } | null,
    depth = 6,
  ): void {
    const streams = Array.from({ length: 14 }, (_, i) => ({
      ang: (i / 14) * TAU,
      spin: 1.4 + Math.random() * 1.5,
      phase: Math.random(),
      len: 0.3 + Math.random() * 0.32,
    }));
    this.anim(depth, duration, (g, t) => {
      const pos = follow?.() ?? null;
      const cx = pos ? pos.x : x;
      const cy = pos ? pos.y : y;
      const pulse = 0.85 + Math.sin(t * 30) * 0.15;

      for (const s of streams) {
        const lt = (t * (1 + s.phase) + s.phase) % 1;
        const r = radius * (1 - easeIn(lt));
        const a = s.ang + t * s.spin * TAU;
        g.fillStyle(this.tint(SHADOW.violet), 0.75 * (1 - lt * 0.55));
        shadowTendril(
          g,
          cx + Math.cos(a) * r, cy + Math.sin(a) * r,
          a + Math.PI * 0.74, r * s.len, 2.8 * (1 - lt), r * 0.22,
        );
      }

      // Compressing core: bright rim outside, absolute dark inside.
      const cr = radius * (0.08 + easeIn(t) * 0.34) * pulse;
      g.fillStyle(this.tint(SHADOW.orchid), 0.45);
      g.fillCircle(cx, cy, cr * 1.55);
      g.fillStyle(this.tint(SHADOW.umbra), 0.85);
      g.fillCircle(cx, cy, cr);
      g.fillStyle(this.tint(SHADOW.abyss), 0.95);
      g.fillCircle(cx, cy, cr * 0.6);
      g.fillStyle(this.tint(SHADOW.pale), 0.5 * easeIn(t));
      g.fillCircle(cx, cy, cr * 0.16);

      g.lineStyle(3, this.tint(SHADOW.mauve), 0.4 + 0.45 * easeIn(t));
      g.strokeCircle(cx, cy, radius * (1 - easeIn(t) * 0.55) * pulse);
    });
  }

  /**
   * A column of darkness punching upward and fraying at its top. Kept to a few broad limbs:
   * thin ones read as scratches over whatever body is underneath.
   */
  voidPillar(x: number, y: number, radius: number, height: number, depth = 7): void {
    const shafts = Array.from({ length: 4 }, (_, i) => ({
      ox: (i - 1.5) * radius * 0.44,
      h: height * (0.7 + Math.random() * 0.42),
      w: radius * (0.36 + Math.random() * 0.24),
      sway: (Math.random() - 0.5) * radius * 0.5,
      phase: Math.random() * TAU,
      delay: i * 0.05,
    }));
    this.anim(depth, 780, (g, t) => {
      const fade = t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
      // Boiling throat at the base so the column looks anchored in something.
      g.fillStyle(this.tint(SHADOW.abyss), 0.6 * fade);
      g.fillEllipse(x, y, radius * 1.6, radius * 0.72);
      for (const s of shafts) {
        const rise = easeOut(Math.max(0, (t - s.delay) / (1 - s.delay)));
        shadowTendrilLayered(
          g, this.tint, x + s.ox, y + radius * 0.2,
          -Math.PI / 2, s.h * rise, s.w * (1 - t * 0.3),
          s.sway * rise, 0.9 * fade, 9, s.phase, { barbs: 3 },
        );
      }
      // Crown of spray blown off the top once the column tops out.
      if (t > 0.3) {
        const cap = (t - 0.3) / 0.7;
        g.fillStyle(this.tint(SHADOW.plum), 0.4 * fade);
        g.fillEllipse(x, y - height * 0.9, radius * (1.4 + cap * 2.4), radius * (0.5 + cap * 0.9));
      }
    });
    this.wisps(x, y - height * 0.5, 9, {
      speed: radius * 1.1, spread: 0.9, angle: -Math.PI / 2,
      size: 3.4, life: 820, rise: height * 0.6, depth,
    });
  }

  /**
   * A living pool of shadow: a rim that crawls, filaments reaching out of it, and a couple of
   * eyes surfacing and sinking. Painted into a caller-owned Graphics so the kit can repaint
   * every pool it owns in one pass.
   */
  static drawPool(
    g: Phaser.GameObjects.Graphics, tint: ShadowColorFn,
    x: number, y: number, radius: number, t: number, alpha: number, seed: number,
  ): void {
    const segs = Phaser.Math.Clamp(Math.round(radius / 2.2), 24, 64);
    const rim = (rr: number, wob: number) => {
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const a = (i % segs) / segs * TAU;
        const r = rr * (1 + Math.sin(a * 3 + t * 1.2 + seed) * wob + Math.sin(a * 5 - t * 0.8 + seed) * wob * 0.7);
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
    };

    // Filaments reaching out of the pool. Drawn first so the body covers their roots.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + seed + Math.sin(t * 0.7 + i) * 0.3;
      const reach = radius * (0.25 + 0.22 * (0.5 + 0.5 * Math.sin(t * 1.6 + i * 2.1)));
      g.fillStyle(tint(SHADOW.pitch), 0.55 * alpha);
      shadowTendril(g, x, y, a, radius * 0.7 + reach, radius * 0.11, Math.sin(t + i) * radius * 0.2);
    }

    g.fillStyle(tint(SHADOW.abyss), 0.62 * alpha);
    rim(radius, 0.05); g.fillPath();
    g.fillStyle(tint(SHADOW.umbra), 0.55 * alpha);
    rim(radius * 0.84, 0.055); g.fillPath();
    g.fillStyle(tint(SHADOW.violet), 0.3 * alpha);
    rim(radius * 0.55, 0.075); g.fillPath();

    g.lineStyle(2, tint(SHADOW.lilac), 0.45 * alpha);
    rim(radius * 0.98, 0.05); g.strokePath();

    // Two eyes surfacing on their own beat. This is what makes the pool read as inhabited
    // rather than as a decal, and it costs four circles.
    for (let i = 0; i < 2; i++) {
      const blink = Math.sin(t * 1.1 + seed + i * 2.4);
      if (blink < 0.25) continue;
      const a = t * 0.35 + seed + i * 2.6;
      const d = radius * 0.34;
      const ex = x + Math.cos(a) * d, ey = y + Math.sin(a) * d * 0.7;
      g.fillStyle(tint(SHADOW.mauve), 0.85 * alpha * blink);
      g.fillEllipse(ex, ey, radius * 0.2, radius * 0.11 * blink);
      g.fillStyle(tint(SHADOW.abyss), 0.95 * alpha * blink);
      g.fillCircle(ex, ey, radius * 0.045);
    }
  }

  /**
   * The singularity: an accretion disc of infalling tendrils around an event horizon with a
   * lensed rim. Painted into a caller-owned Graphics because the kit already redraws it every
   * frame at a moving position.
   */
  static drawSingularity(
    g: Phaser.GameObjects.Graphics, tint: ShadowColorFn,
    x: number, y: number, radius: number, t: number, alpha: number,
  ): void {
    // Infalling matter, drawn outside-in so nearer arms overlap farther ones.
    for (let i = 0; i < 12; i++) {
      const lt = ((t * 0.55 + i / 12) % 1);
      const r = radius * (0.6 + (1 - easeIn(lt)) * 2.2);
      const a = (i / 12) * TAU + t * 2.6 + lt * 3.4;
      g.fillStyle(tint(i % 3 === 0 ? SHADOW.lilac : SHADOW.orchid), (0.25 + 0.5 * lt) * alpha);
      shadowTendril(g, x + Math.cos(a) * r, y + Math.sin(a) * r, a + Math.PI * 0.72,
        r * 0.55, radius * 0.13 * (1 - lt * 0.5), r * 0.28, 0, i);
    }

    // Accretion disc: a squashed pair of arcs so it reads as edge-on rather than flat.
    for (let i = 0; i < 3; i++) {
      g.lineStyle(3 - i, tint([SHADOW.mauve, SHADOW.lilac, SHADOW.amethyst][i]), (0.7 - i * 0.16) * alpha);
      g.strokeEllipse(x, y, radius * (2.6 + i * 0.5), radius * (0.9 + i * 0.28));
    }

    // Event horizon: a hole with a lensed rim, no fill lighter than the floor.
    g.fillStyle(tint(SHADOW.orchid), 0.35 * alpha);
    g.fillCircle(x, y, radius * 1.25);
    g.fillStyle(tint(SHADOW.abyss), 0.98 * alpha);
    g.fillCircle(x, y, radius);
    g.lineStyle(2.5, tint(SHADOW.pale), (0.55 + 0.25 * Math.sin(t * 6)) * alpha);
    g.strokeCircle(x, y, radius * 1.04);
  }

  /**
   * The drag tether: one thick tentacle running caster → victim, coiling twice around the
   * victim end so the grip is visible, with barbs snagged down its length. Drawn into a
   * caller-owned Graphics because the kit repaints it every frame as both ends move.
   */
  static drawTether(
    g: Phaser.GameObjects.Graphics, tint: ShadowColorFn,
    x1: number, y1: number, x2: number, y2: number,
    t: number, alpha: number, gripped: boolean,
  ): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const span = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    // A slack tether whips; a gripped one is hauled taut and barely moves.
    const wave = gripped ? span * 0.03 : span * 0.1;

    shadowTendrilLayered(
      g, tint, x1, y1, angle, span, gripped ? 9 : 6.5,
      0, alpha, wave, t * 5, { barbs: Math.max(2, Math.round(span / 55)) },
    );

    if (!gripped) return;
    // Coils biting into whatever is on the far end.
    for (let i = 0; i < 2; i++) {
      const r = 15 - i * 4;
      const squeeze = 1 + Math.sin(t * 7 + i) * 0.09;
      g.lineStyle(4 - i * 1.2, tint(SHADOW.violet), 0.85 * alpha);
      g.strokeEllipse(x2, y2, r * 2 * squeeze, r * 1.3);
      g.lineStyle(1.2, tint(SHADOW.lilac), 0.5 * alpha);
      g.strokeEllipse(x2, y2, r * 2 * squeeze - 3, r * 1.3 - 2);
    }
    g.fillStyle(tint(SHADOW.abyss), 0.6 * alpha);
    g.fillCircle(x2, y2, 7);
  }
}

// ── ShadowShroud ──────────────────────────────────────────────────────────

/**
 * Persistent cloak of writhing tendrils around a fighter (Consume, the mastery passive).
 * Driven by whoever owns it — call `update` every frame with the fighter's position.
 */
export class ShadowShroud {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private wispAccum = 0;
  private limbs: { ang: number; len: number; w: number; speed: number; phase: number }[];

  constructor(
    private scene: Phaser.Scene,
    private tint: ShadowColorFn,
    private radius: number,
    private intensity: number,
    depth = 3,
    count = 9,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
    this.limbs = Array.from({ length: count }, (_, i) => ({
      ang: (i / count) * TAU,
      len: 0.65 + Math.random() * 0.6,
      w: 0.12 + Math.random() * 0.08,
      speed: 2.4 + Math.random() * 3.4,
      phase: Math.random() * TAU,
    }));
  }

  setIntensity(v: number): void { this.intensity = v; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;

    const spin = this.t * -0.85;
    g.fillStyle(this.tint(SHADOW.abyss), 0.26 * this.intensity * alpha);
    g.fillCircle(x, y, this.radius * (0.9 + Math.sin(this.t * 3.4) * 0.05));

    for (const l of this.limbs) {
      const wob = Math.sin(this.t * l.speed + l.phase);
      const len = this.radius * l.len * (0.78 + wob * 0.3) * this.intensity;
      const ang = l.ang + spin + wob * 0.12;
      shadowTendrilLayered(
        g, this.tint,
        x + Math.cos(ang) * this.radius * 0.42, y + Math.sin(ang) * this.radius * 0.42,
        ang, len, this.radius * l.w, wob * this.radius * 0.3,
        0.62 * alpha, wob * this.radius * 0.16, l.phase, { barbs: 2 },
      );
    }

    this.wispAccum += delta;
    const interval = 280 / Math.max(0.4, this.intensity);
    if (this.wispAccum >= interval) {
      this.wispAccum = 0;
      new ShadowFx(this.scene, this.tint).wisps(
        x + (Math.random() - 0.5) * this.radius * 1.3,
        y + (Math.random() - 0.5) * this.radius * 0.8,
        1, { speed: 22, size: 2.6, life: 720, rise: 26, depth: 4 },
      );
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}

// ── ShadowAvatar ──────────────────────────────────────────────────────────

/**
 * Concentric discs of one umbral ball hand, outermost first. Note the *core* is the darkest
 * layer — a shadow hand is a hole with a glow around it, not a glowing orb.
 */
const SHADOW_AVATAR: AvatarSpec = {
  hands: [
    { r: 10, color: SHADOW.amethyst, alpha: 0.26 },
    { r: 6.6, color: SHADOW.violet, alpha: 0.96 },
    { r: 3.6, color: SHADOW.abyss, alpha: 1 },
    // The pip sits up-and-left of centre: the one bit of the hand that catches any light.
    { r: 1.5, color: SHADOW.lilac, alpha: 0.9, ox: -1.7, oy: -1.7 },
  ],
  eyeWhite: SHADOW.lilac,
  eyePupil: SHADOW.abyss,
  // A shadow hand smears more than it stretches — long and thin, but it holds its width.
  squash: { div: 15, x: 0.55, y: 0.22 },
};

/**
 * The shadow character rig: two umbral ball hands, a pair of eyes, and a crown of tendrils
 * writhing off the top of the head. The hands, eyes and gestures come from BaseAvatar; what
 * shadow adds is the pool of dark it stands in and the limbs it wears.
 */
export class ShadowAvatar extends BaseAvatar {
  private fx: ShadowFx;

  constructor(scene: Phaser.Scene, tint: ShadowColorFn, depth = 6) {
    super(scene, tint, depth, SHADOW_AVATAR);
    this.fx = new ShadowFx(scene, tint);
  }

  /**
   * Mastery tell — a permanent, readable upgrade to the character itself, so a mastered shadow
   * user is identifiable at a glance before they cast anything: eyes that burn pale, a wider
   * corona and a lit rim on each hand, a taller and denser crown, and three voids orbiting the
   * head. Shape changes, not just brighter tints — a tint alone vanishes at gameplay zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? SHADOW.pale : SHADOW.lilac);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 13.5 : 10);
      halo.setFillStyle(this.tint(on ? SHADOW.lilac : SHADOW.amethyst), on ? 0.32 : 0.26);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.6, this.tint(SHADOW.mauve), 0.9);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands shed motes of dark. */
  protected emitTrail(x: number, y: number): void {
    this.fx.wisps(x, y, 1, { speed: 16, size: 2.4, life: 520, rise: 20, depth: 5 });
  }

  /** The pool of darkness the character stands in, deeper the harder it is working. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    g.fillStyle(this.tint(SHADOW.abyss), a * 0.4 * this.intensity);
    g.fillEllipse(x, y + 6, 58 * this.intensity, 30 * this.intensity);
    g.fillStyle(this.tint(SHADOW.orchid), a * 0.16 * this.intensity);
    g.fillEllipse(x, y + 4, 40 * this.intensity, 22 * this.intensity);
    // A few filaments reaching out of the pool along the ground.
    for (let i = 0; i < 4; i++) {
      const ang = this.t * 0.5 + (i / 4) * TAU;
      const reach = 16 + Math.sin(this.t * 2.4 + i * 1.7) * 7;
      g.fillStyle(this.tint(SHADOW.pitch), a * 0.45);
      shadowTendril(g, x, y + 6, ang, reach * this.intensity, 3.2, Math.sin(this.t + i) * 6);
    }
  }

  /**
   * The crown: tendrils rooted at the top of the head that sway, curl and grope. Rooted at
   * y - 18 so they never cover the face, and drawn over the sprite so their lit rims show
   * rather than only the dark tips clearing the body.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const rootY = y - 18;
    const count = this.mastered ? 5 : 3;
    const scale = this.mastered ? 1.35 : 1;

    for (let i = 0; i < count; i++) {
      const side = (i - (count - 1) / 2) / Math.max(1, (count - 1) / 2);
      const p = this.t * 2.2 + i * 1.7;
      const lift = (21 + Math.sin(p) * 6) * this.intensity * scale;
      const lean = side * (0.42 + Math.sin(p * 0.7) * 0.14);
      shadowTendrilLayered(
        g, this.tint,
        x + side * 6, rootY,
        -Math.PI / 2 + lean, lift, 5.2 * scale,
        Math.sin(p * 0.9) * 9, a * 0.95,
        7, p, { barbs: 2 },
      );
    }

    // Mastery voids: three holes circling the head on a shallow ellipse, each with a lit rim
    // so they read as objects rather than as gaps in the crown.
    if (this.mastered) {
      for (let i = 0; i < 3; i++) {
        const p = this.t * 1.5 + (i / 3) * TAU;
        const cx = x + Math.cos(p) * 24;
        const cy = y - 30 + Math.sin(p) * 7;
        g.fillStyle(this.tint(SHADOW.orchid), alpha * 0.4);
        g.fillCircle(cx, cy, 5.2);
        g.fillStyle(this.tint(SHADOW.abyss), alpha * 0.95);
        g.fillCircle(cx, cy, 3.4);
        g.lineStyle(1.2, this.tint(SHADOW.mauve), alpha * 0.8);
        g.strokeCircle(cx, cy, 4);
      }
    }
  }
}
