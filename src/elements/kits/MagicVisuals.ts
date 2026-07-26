import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Magic renders: the conjurer rig (rune-lit hands, tracking
 * eyes, a grimoire hovering over the crown), the meditation/darkness/anchor auras, and every
 * one-shot effect its twenty-odd wheel spells throw off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts. What stays here is what makes magic magic: the sigil.
 *
 * Magic is the borrower element: it casts fire, water, wind, stone and vine without being any of
 * them. So the palette below is unusually wide, and that is deliberate — but every borrowed shade
 * is still a MAGIC key, and every draw call routes through the owner's `magicColor` mapper, so the
 * day a colour cosmetic lands it is a table edit in CosmeticsKit rather than a sweep through this
 * file. What ties the borrowed spells together visually is that all of them arrive *inside a
 * sigil*: the conjuring is the element, not the thing conjured.
 */

/** `(base) => displayed` — CosmeticsKit.magicColor bound to one owner. */
export type MagicColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const MAGIC = {
  /** The arcane core of the element. */
  ink: 0x1a0a2e,
  violet: 0x552288,
  purple: 0x9944ff,
  orchid: 0xcc88ff,
  lilac: 0xcc99ff,
  blush: 0xff99ff,
  white: 0xffffff,
  /** The book itself. */
  leather: 0x3a1e50,
  parchment: 0xf0e2c8,
  gold: 0xffdd44,
  brass: 0xddaa00,
  /** Borrowed fire. */
  ember: 0xff7733,
  emberHi: 0xffaa44,
  flameRed: 0xcc2200,
  flameHi: 0xff4422,
  corrupt: 0xff4400,
  cursed: 0x882200,
  /** Borrowed water and storm. */
  storm: 0x3388ff,
  stormHi: 0x55aaff,
  deepSea: 0x112255,
  seaMid: 0x2266cc,
  acid: 0x44ff88,
  /** Borrowed growth. */
  vine: 0x33aa44,
  leaf: 0x44ff66,
  darkVine: 0x226633,
  /** Borrowed air. */
  wind: 0x888888,
  gust: 0xbbbbbb,
  ash: 0x444444,
  /** Borrowed stone. */
  stone: 0x885522,
  sand: 0xbb8833,
  rock: 0x777777,
  granite: 0x999999,
  /** Darkness — the price of the dark wheel. */
  voidInk: 0x220022,
  darkPlum: 0x550066,
  magenta: 0x880088,
  wildVoid: 0x440066,
  /** The Torture Trap's lifesteal thread. */
  blood: 0xff2222,
  /** Thunder perk. */
  thunder: 0xffee00,
  thunderHi: 0xffee99,
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
 * Magic's primitive: a **sigil** — a many-pointed star with alternating long and short arms,
 * every arm concave-sided so it tapers to a needle rather than sitting there as a triangle.
 *
 * It is the sparkle on the click, the rune on a magic circle, the heart of every conjured cloud
 * and the mote shed by a levitating caster. Making the sigil the primitive is what stops Magic
 * from looking like five other elements wearing purple: whatever it summons, the summoning
 * itself always has this shape somewhere in it.
 */
export function sigilStar(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, angle: number,
  outer: number, inner: number, points = 5,
): void {
  const pts: Pt[] = [];
  const n = points * 2;
  for (let i = 0; i < n * 2; i++) {
    const t = i / (n * 2);
    const a = angle + t * TAU;
    // Long arm, waist, short arm, waist — and the waists pull *inside* `inner` so the arms
    // read as needles rather than as a cog.
    const phase = i % 4;
    const r = phase === 0 ? outer : phase === 2 ? outer * 0.52 : inner;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  fillPts(g, pts);
}

/**
 * The primitive in four passes: a dark backing, a slowly counter-rotating ghost copy, the body,
 * and a bright core with a bead on each long arm.
 *
 * The counter-rotating ghost is the whole trick — two stars at slightly different angles read as
 * something turning in a way a single star never does, and it is what makes a static rune look
 * alive on the floor.
 */
export function sigilStarLayered(
  g: Phaser.GameObjects.Graphics, tint: MagicColorFn,
  cx: number, cy: number, angle: number, outer: number, inner: number,
  color: number, alpha: number, points = 5, core = true,
): void {
  g.fillStyle(tint(MAGIC.ink), alpha * 0.5);
  sigilStar(g, cx + 1, cy + 1.6, angle, outer * 1.08, inner * 1.08, points);

  g.fillStyle(tint(color), alpha * 0.4);
  sigilStar(g, cx, cy, -angle * 0.55, outer * 0.86, inner * 0.86, points);

  g.fillStyle(tint(color), alpha);
  sigilStar(g, cx, cy, angle, outer, inner, points);

  if (!core) return;
  g.fillStyle(tint(MAGIC.white), alpha * 0.85);
  g.fillCircle(cx, cy, inner * 0.55);
  for (let i = 0; i < points; i++) {
    const a = angle + (i / points) * TAU;
    g.fillStyle(tint(MAGIC.white), alpha * 0.6);
    g.fillCircle(cx + Math.cos(a) * outer * 0.7, cy + Math.sin(a) * outer * 0.7, inner * 0.22);
  }
}

// ── Element shapes ────────────────────────────────────────────────────────

/**
 * A summoning circle: a rune-inscribed ring with tick marks around its edge and small sigils at
 * its cardinal points, turning on its own.
 *
 * Every conjuration in this element opens inside one of these, which is the visual sentence
 * "something was *called* here" — the difference between Magic's fire and Fire's fire.
 */
export function arcaneRing(
  g: Phaser.GameObjects.Graphics, tint: MagicColorFn,
  cx: number, cy: number, radius: number, spin: number,
  color: number, alpha: number, width = 2, runes = 5, inner = true,
): void {
  g.lineStyle(width * 2.2, tint(MAGIC.ink), alpha * 0.4);
  g.strokeCircle(cx, cy + 1.4, radius);
  g.lineStyle(width, tint(color), alpha);
  g.strokeCircle(cx, cy, radius);
  if (inner) {
    g.lineStyle(width * 0.6, tint(color), alpha * 0.7);
    g.strokeCircle(cx, cy, radius * 0.78);
  }
  // Tick marks between the runes, so the band reads as inscribed rather than as a plain hoop.
  const ticks = runes * 4;
  for (let i = 0; i < ticks; i++) {
    const a = spin + (i / ticks) * TAU;
    const long = i % 4 === 0;
    g.lineStyle(width * (long ? 1 : 0.6), tint(color), alpha * (long ? 0.9 : 0.5));
    strokePts(g, [
      { x: cx + Math.cos(a) * radius * (long ? 0.86 : 0.92), y: cy + Math.sin(a) * radius * (long ? 0.86 : 0.92) },
      { x: cx + Math.cos(a) * radius * 1.05, y: cy + Math.sin(a) * radius * 1.05 },
    ]);
  }
  for (let i = 0; i < runes; i++) {
    const a = spin * 1.4 + (i / runes) * TAU;
    sigilStarLayered(g, tint, cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, spin * 2,
      radius * 0.14, radius * 0.05, color, alpha * 0.95, 4, false);
  }
}

/**
 * A conjured cloud: a boiling lobed body with a sigil burning at its heart. Fire clouds, storm
 * clouds and vacuum funnels are all this shape at different colours and lobe counts — what says
 * which is which is the accent, not a different silhouette.
 */
export function conjuredCloud(
  g: Phaser.GameObjects.Graphics, tint: MagicColorFn,
  cx: number, cy: number, radius: number, seed: number, t: number,
  body: number, rim: number, alpha: number, lobes = 7,
): void {
  const puff = (r: number, phase: number, a: number, col: number): void => {
    const pts: Pt[] = [];
    for (let i = 0; i < lobes * 3; i++) {
      const ang = (i / (lobes * 3)) * TAU;
      // Boiling: each lobe breathes on its own offset, so the outline never repeats.
      const wob = 0.76 + 0.3 * Math.abs(Math.sin(seed + ang * lobes + t * 2.2 + phase));
      pts.push({ x: cx + Math.cos(ang) * r * wob, y: cy + Math.sin(ang) * r * wob * 0.92 });
    }
    g.fillStyle(tint(col), a);
    fillPts(g, pts);
  };
  puff(radius * 1.08, 0.9, alpha * 0.4, MAGIC.ink);
  puff(radius, 0, alpha, body);
  puff(radius * 0.62, 1.7, alpha * 0.7, rim);
  // The sigil that called it, turning at its centre.
  sigilStarLayered(g, tint, cx, cy, t * 1.3, radius * 0.36, radius * 0.13, rim, alpha * 0.9, 5, true);
}

/** A conjured orb of stone: a chunky facetted rock wearing a rune band, cracked once it is spent. */
export function runeOrb(
  g: Phaser.GameObjects.Graphics, tint: MagicColorFn,
  cx: number, cy: number, radius: number, spin: number,
  body: number, rim: number, alpha: number, cracked: boolean,
): void {
  const at = frame(cx, cy, spin);
  const pts: Pt[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    const r = radius * (0.82 + 0.28 * Math.abs(Math.sin(i * 2.399 + cx * 0.01)));
    pts.push(at(Math.cos(a) * r, Math.sin(a) * r));
  }
  g.fillStyle(tint(MAGIC.ink), alpha * 0.5);
  fillPts(g, pts.map((p) => ({ x: p.x + 1, y: p.y + 1.8 })));
  g.fillStyle(tint(body), alpha);
  fillPts(g, pts);
  // Lit top face, so it reads as a solid with a direction of light on it.
  g.fillStyle(tint(rim), alpha * 0.5);
  fillPts(g, [pts[0], pts[1], pts[2], at(0, -radius * 0.2)]);
  g.lineStyle(1.6, tint(rim), alpha);
  strokePts(g, pts, true);
  // The rune band that holds it together.
  g.lineStyle(1.4, tint(MAGIC.orchid), alpha * 0.75);
  const band: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    band.push(at(-radius + u * radius * 2, Math.sin(u * Math.PI) * radius * 0.34));
  }
  strokePts(g, band);
  if (cracked) {
    g.lineStyle(1.8, tint(MAGIC.ink), alpha * 0.9);
    strokePts(g, [at(-radius * 0.7, -radius * 0.3), at(-radius * 0.1, radius * 0.15), at(radius * 0.5, -radius * 0.5)]);
    strokePts(g, [at(-radius * 0.1, radius * 0.15), at(radius * 0.2, radius * 0.7)]);
  }
}

/** A thorned vine: a whipping cord with paired leaves and barbs down its length. */
export function vineLash(
  g: Phaser.GameObjects.Graphics, tint: MagicColorFn,
  x1: number, y1: number, x2: number, y2: number,
  t: number, color: number, leafColor: number, alpha: number, thick = 4,
): void {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  const spine: Pt[] = [];
  const segs = 14;
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    // A vine never runs straight — a travelling sine along it is the whole read.
    const sway = Math.sin(u * 5 - t * 6) * 7 * Math.sin(u * Math.PI);
    spine.push({ x: x1 + dx * u + px * sway, y: y1 + dy * u + py * sway });
  }
  g.lineStyle(thick * 1.9, tint(MAGIC.ink), alpha * 0.45);
  strokePts(g, spine.map((p) => ({ x: p.x + 1, y: p.y + 1.8 })));
  g.lineStyle(thick, tint(color), alpha);
  strokePts(g, spine);
  // Barbs and leaves, alternating sides.
  for (let i = 2; i < segs; i += 2) {
    const p = spine[i];
    const side = i % 4 === 0 ? 1 : -1;
    const a = Math.atan2(spine[i + 1].y - p.y, spine[i + 1].x - p.x) + side * 1.1;
    g.fillStyle(tint(color), alpha);
    fillPts(g, [
      { x: p.x, y: p.y },
      { x: p.x + Math.cos(a) * thick * 2.4, y: p.y + Math.sin(a) * thick * 2.4 },
      { x: p.x + Math.cos(a + 0.7) * thick * 1.1, y: p.y + Math.sin(a + 0.7) * thick * 1.1 },
    ]);
    if (i % 4 === 0) {
      g.fillStyle(tint(leafColor), alpha * 0.9);
      const lx = p.x + Math.cos(a) * thick * 2.6, ly = p.y + Math.sin(a) * thick * 2.6;
      g.fillEllipse(lx, ly, thick * 2.6, thick * 1.3);
    }
  }
}

/** A drifting mote of arcane dust. */
function mote(
  g: Phaser.GameObjects.Graphics, tint: MagicColorFn,
  x: number, y: number, r: number, spin: number, color: number, alpha: number,
): void {
  g.fillStyle(tint(color), alpha * 0.35);
  g.fillCircle(x, y, r * 2.2);
  sigilStarLayered(g, tint, x, y, spin, r * 1.6, r * 0.5, color, alpha, 4, false);
}

// ── MagicFx ───────────────────────────────────────────────────────────────

export interface MagicBoomOpts {
  /** Sigils thrown clear. Defaults to radius/9. */
  sigils?: number;
  /** Concentric arcane rings. Defaults to 2. */
  rings?: number;
  duration?: number;
  depth?: number;
  color?: number;
  /** Leave a scorched sigil on the floor. Default true. */
  mark?: boolean;
}

/**
 * One-shot magic effects. Cheap to construct — build one per owner and hand it that owner's
 * colour mapper.
 */
export class MagicFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: MagicColorFn = (c) => c) {
    super(scene, tint);
  }

  // `color: number` is spelled out on every signature below: without it TypeScript infers the
  // literal type of the MAGIC default and refuses every other palette entry at the call site.

  /** Blown-out core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 9, color: number = MAGIC.orchid): void {
    this.flashIn(x, y, radius, MAGIC.white, color, depth);
  }

  /** A summoning circle snapping open — the shape every conjuration announces itself with. */
  ring(
    x: number, y: number, from: number, to: number, color: number,
    duration = 420, depth = 8, width = 3,
  ): void {
    const spin = Math.random() * TAU;
    this.anim(depth, duration, (g, t) => {
      const r = from + (to - from) * easeOut(t);
      arcaneRing(g, this.tint, x, y, r, spin + t * 2.2, color, (1 - t) * 0.9,
        width * (1 - t * 0.4), Phaser.Math.Clamp(Math.round(to / 22), 4, 9));
    });
  }

  /** Sigils flung out of an impact, spinning and fading. */
  sigils(
    x: number, y: number, count: number,
    o: { speed?: number; spread?: number; angle?: number; size?: number; life?: number; depth?: number; color?: number; points?: number } = {},
  ): void {
    const speed = o.speed ?? 210;
    const spread = o.spread ?? Math.PI;
    const baseAngle = o.angle ?? 0;
    const size = o.size ?? 9;
    const life = o.life ?? 620;
    const depth = o.depth ?? 9;
    const color = o.color ?? MAGIC.orchid;
    const points = o.points ?? 5;

    const parts = Array.from({ length: count }, () => ({
      a: baseAngle + (Math.random() - 0.5) * spread * 2,
      v: speed * (0.4 + Math.random()),
      s: size * (0.5 + Math.random() * 0.9),
      spin: (Math.random() - 0.5) * 12,
      delay: Math.random() * 0.2,
    }));
    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        sigilStarLayered(g, this.tint, x + Math.cos(p.a) * d, y + Math.sin(p.a) * d,
          p.a + p.spin * lt, p.s * (1 - lt * 0.5), p.s * 0.35 * (1 - lt * 0.5),
          color, 0.95 * (1 - lt * lt), points, false);
      }
    });
  }

  /** Fine arcane dust lifting off something enchanted. */
  motes(
    x: number, y: number, count: number,
    o: { speed?: number; spread?: number; angle?: number; size?: number; life?: number; depth?: number; color?: number; drift?: number } = {},
  ): void {
    const speed = o.speed ?? 80;
    const spread = o.spread ?? Math.PI;
    const baseAngle = o.angle ?? 0;
    const size = o.size ?? 2;
    const life = o.life ?? 720;
    const depth = o.depth ?? 8;
    const color = o.color ?? MAGIC.lilac;
    const drift = o.drift ?? -26;

    const parts = Array.from({ length: count }, () => ({
      a: baseAngle + (Math.random() - 0.5) * spread * 2,
      v: speed * (0.3 + Math.random()),
      s: size * (0.5 + Math.random()),
      wob: Math.random() * TAU,
      delay: Math.random() * 0.25,
    }));
    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        mote(g, this.tint,
          x + Math.cos(p.a) * d + Math.sin(p.wob + lt * 5) * 5,
          y + Math.sin(p.a) * d + drift * lt,
          p.s * (1 - lt * 0.5), p.wob + lt * 8, color, 0.9 * (1 - lt * lt));
      }
    });
  }

  /**
   * A full detonation: white core, a summoning ring that snaps open, a second behind it, sigils
   * thrown clear, dust, and a scorched rune left on the floor.
   */
  boom(x: number, y: number, radius: number, o: MagicBoomOpts = {}): void {
    const color = o.color ?? MAGIC.orchid;
    const bits = o.sigils ?? Math.max(4, Math.round(radius / 9));
    const rings = o.rings ?? 2;
    const dur = o.duration ?? Math.round(360 + radius * 1.2);
    const depth = o.depth ?? 9;

    if (o.mark !== false) this.mark(x, y, radius * 0.6, depth - 6, color);
    this.flash(x, y, radius * 0.42, depth + 2, color);
    for (let i = 0; i < rings; i++) {
      this.scene.time.delayedCall(i * 85, () =>
        this.ring(x, y, radius * 0.2, radius * (1 + i * 0.26),
          i === 0 ? color : MAGIC.white, Math.round(dur * (0.85 + i * 0.2)), depth, 3 - i * 0.8));
    }
    this.sigils(x, y, bits, {
      speed: radius * 2.2, size: 8 + radius / 12, life: Math.round(dur * 1.3), depth: depth + 1, color,
    });
    this.motes(x, y, bits * 2, { speed: radius * 1.6, size: 2.2, life: Math.round(dur * 1.5), depth, color: MAGIC.lilac });
  }

  /** A rune scorched into the floor where a spell landed, fading as it cools. */
  mark(x: number, y: number, radius: number, depth = 3, color: number = MAGIC.violet): void {
    const spin = Math.random() * TAU;
    this.anim(depth, 1600, (g, t) => {
      const a = (t < 0.08 ? t / 0.08 : 1 - (t - 0.08) / 0.92) * 0.55;
      g.fillStyle(this.tint(MAGIC.ink), a * 0.6);
      g.fillEllipse(x, y, radius * 2.1, radius * 1.5);
      arcaneRing(g, this.tint, x, y, radius, spin + t * 0.8, color, a, 2, 5);
      sigilStarLayered(g, this.tint, x, y, spin - t * 1.2, radius * 0.55, radius * 0.2, color, a, 6, false);
    });
  }

  /**
   * A wind-up: a summoning circle drawing itself inward with runes converging on the caster, so
   * the wheel's two-second aim delay reads as a spell being *assembled* rather than as a pause.
   */
  conjure(
    x: number, y: number, radius: number, duration: number,
    o: { color?: number; depth?: number; follow?: () => { x: number; y: number } } = {},
  ): void {
    const color = o.color ?? MAGIC.orchid;
    const depth = o.depth ?? 8;
    const follow = o.follow;
    this.anim(depth, duration, (g, t) => {
      const c = follow ? follow() : { x, y };
      const k = easeIn(t);
      // Two counter-turning circles closing on the caster.
      arcaneRing(g, this.tint, c.x, c.y, radius * (1.6 - k * 1.1), t * 3.2, color, 0.35 + 0.5 * t, 2.4, 6);
      arcaneRing(g, this.tint, c.x, c.y, radius * (1.15 - k * 0.75), -t * 2.4, MAGIC.lilac, 0.25 + 0.4 * t, 1.6, 4, false);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU - t * 4;
        const d = radius * (1.7 - k * 1.35);
        sigilStarLayered(g, this.tint, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, t * 7 + i,
          6 + t * 5, 2.4, color, 0.4 + 0.6 * t, 5, false);
      }
      g.fillStyle(this.tint(MAGIC.white), 0.15 + 0.65 * t * t);
      g.fillCircle(c.x, c.y, 3 + radius * 0.2 * t);
    });
  }

  /** A gale: streamers of moving air sweeping through a cone. */
  gust(
    x: number, y: number, angle: number, radius: number, half: number,
    o: { color?: number; duration?: number; depth?: number; inward?: boolean } = {},
  ): void {
    const color = o.color ?? MAGIC.gust;
    const dur = o.duration ?? 700;
    const depth = o.depth ?? 9;
    const inward = o.inward ?? false;
    const lanes = Array.from({ length: 10 }, (_, i) => ({
      off: (i / 9 - 0.5) * 2 * half,
      phase: Math.random(),
      curl: (Math.random() - 0.5) * 0.5,
    }));
    this.anim(depth, dur, (g, t) => {
      const fade = 1 - t;
      g.fillStyle(this.tint(color), 0.14 * fade);
      g.beginPath();
      g.moveTo(x, y);
      g.arc(x, y, radius, angle - half, angle + half, false);
      g.closePath();
      g.fillPath();
      for (const l of lanes) {
        // Streamers run outward on a blast and inward on a vacuum — the direction *is* the tell.
        const p = ((t * 1.6 + l.phase) % 1);
        const u = inward ? 1 - p : p;
        const a = angle + l.off + l.curl * u;
        const r0 = radius * Math.max(0, u - 0.22);
        const r1 = radius * u;
        g.lineStyle(3 * (1 - Math.abs(l.off / half)) * fade, this.tint(color), 0.8 * fade);
        const seg: Pt[] = [];
        for (let i = 0; i <= 5; i++) {
          const rr = r0 + (r1 - r0) * (i / 5);
          const aa = a + Math.sin(i * 0.8 + t * 8) * 0.05;
          seg.push({ x: x + Math.cos(aa) * rr, y: y + Math.sin(aa) * rr });
        }
        strokePts(g, seg);
      }
    });
  }

  /** A forked bolt down onto a point — the Thunder perk's call. */
  bolt(x: number, y: number, height: number, depth = 12, color: number = MAGIC.thunder): void {
    const legs = Array.from({ length: 3 }, () => ({
      wob: Array.from({ length: 6 }, () => (Math.random() - 0.5) * 16),
      lag: Math.random() * 0.2,
    }));
    this.anim(depth, 420, (g, t) => {
      const fade = 1 - easeIn(t);
      for (const leg of legs) {
        const lt = Phaser.Math.Clamp((t - leg.lag) / 0.4, 0, 1);
        if (lt <= 0) continue;
        const pts: Pt[] = [];
        for (let i = 0; i <= 5; i++) {
          const u = i / 5;
          if (u > lt) break;
          pts.push({ x: x + leg.wob[i] * (1 - u), y: y - height + height * u });
        }
        g.lineStyle(4, this.tint(MAGIC.ink), fade * 0.4);
        strokePts(g, pts.map((p) => ({ x: p.x + 1, y: p.y + 1 })));
        g.lineStyle(2.6, this.tint(color), fade);
        strokePts(g, pts);
        g.lineStyle(1, this.tint(MAGIC.white), fade * 0.9);
        strokePts(g, pts);
      }
      g.fillStyle(this.tint(color), fade * 0.4);
      g.fillEllipse(x, y, 44 * (1 + t), 16 * (1 + t));
    });
  }

  /** Pages torn out of a book and whirling away — the wheel opening and closing. */
  pages(x: number, y: number, count: number, depth = 10): void {
    const parts = Array.from({ length: count }, () => ({
      a: Math.random() * TAU,
      v: 60 + Math.random() * 150,
      spin: (Math.random() - 0.5) * 14,
      s: 5 + Math.random() * 4,
      delay: Math.random() * 0.2,
    }));
    this.anim(depth, 620, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * 0.62;
        const at = frame(x + Math.cos(p.a) * d, y + Math.sin(p.a) * d - 20 * lt, p.a + p.spin * lt);
        // A page flips edge-on as it turns, so its width breathes to nothing and back.
        const w = p.s * Math.abs(Math.cos(p.spin * lt * 2));
        g.fillStyle(this.tint(MAGIC.parchment), 0.9 * (1 - lt * lt));
        fillPts(g, [at(-w, -p.s), at(w, -p.s), at(w, p.s), at(-w, p.s)]);
        g.lineStyle(0.8, this.tint(MAGIC.brass), 0.7 * (1 - lt));
        strokePts(g, [at(-w, -p.s), at(w, -p.s), at(w, p.s), at(-w, p.s)], true);
      }
    });
  }

  // ── Per-frame painters ──────────────────────────────────────────────────
  // Drawn into a Graphics the caller already owns, because these ride on live gameplay state: a
  // cloud's remaining life, an orb's crack, how close a prison's chains are to snapping.

  /** A conjured fire cloud, ordinary or cursed. */
  static drawFlameCloud(
    g: Phaser.GameObjects.Graphics, tint: MagicColorFn,
    x: number, y: number, radius: number, cursed: boolean, seed: number, t: number, alpha: number,
  ): void {
    conjuredCloud(g, tint, x, y, radius, seed, t,
      cursed ? MAGIC.cursed : MAGIC.flameRed,
      cursed ? MAGIC.corrupt : MAGIC.ember, alpha, 7);
    // Licks climbing off the top of it.
    for (let i = 0; i < 4; i++) {
      const p = (t * 1.4 + i / 4) % 1;
      const ox = Math.sin(seed + i * 2.1 + t * 3) * radius * 0.6;
      sigilStarLayered(g, tint, x + ox, y - radius * 0.3 - p * radius * 1.1,
        t * 5 + i, radius * 0.22 * (1 - p), radius * 0.07 * (1 - p),
        cursed ? MAGIC.corrupt : MAGIC.emberHi, alpha * 0.9 * (1 - p), 4, false);
    }
  }

  /** A conjured storm cloud, with rain (or acid) falling out of its underside. */
  static drawStormCloud(
    g: Phaser.GameObjects.Graphics, tint: MagicColorFn,
    x: number, y: number, radius: number, acid: boolean, charge: number, seed: number, t: number, alpha: number,
  ): void {
    conjuredCloud(g, tint, x, y, radius, seed, t,
      MAGIC.deepSea, acid ? MAGIC.acid : MAGIC.stormHi, alpha, 6);
    // Rain, falling faster the closer the next pulse is.
    for (let i = 0; i < 7; i++) {
      const p = ((t * (1.6 + charge * 2) + i / 7) % 1);
      const ox = Math.sin(seed * 2 + i * 1.7) * radius * 0.85;
      const dy = radius * 0.4 + p * radius * 1.2;
      g.lineStyle(1.8, tint(acid ? MAGIC.acid : MAGIC.storm), alpha * 0.8 * (1 - p));
      strokePts(g, [{ x: x + ox, y: y + dy }, { x: x + ox - 1.5, y: y + dy + 8 }]);
    }
    // A charged cloud pulls light into its heart before it lets go.
    if (charge > 0.7) {
      g.fillStyle(tint(MAGIC.white), alpha * (charge - 0.7) * 2);
      g.fillCircle(x, y, radius * 0.28 * (charge - 0.7) * 3);
    }
  }

  /** A conjured funnel: a stack of turning ellipses narrowing to a point, with debris orbiting. */
  static drawTornado(
    g: Phaser.GameObjects.Graphics, tint: MagicColorFn,
    x: number, y: number, radius: number, dark: boolean, seed: number, t: number, alpha: number,
  ): void {
    const body = dark ? MAGIC.ash : MAGIC.wind;
    const rim = dark ? MAGIC.wind : MAGIC.gust;
    const H = radius * 2.2;
    for (let i = 8; i >= 0; i--) {
      const u = i / 8;
      // Wider at the top, pinched at the foot, and the whole column leans as it turns.
      const rw = radius * (0.22 + u * 0.95);
      const lean = Math.sin(t * 3 + seed + u * 2) * radius * 0.24 * u;
      const cy = y + H * 0.4 - H * u;
      g.fillStyle(tint(i % 2 === 0 ? body : rim), alpha * (0.32 + 0.3 * u));
      g.fillEllipse(x + lean, cy, rw * 2, rw * 0.72);
    }
    g.lineStyle(2, tint(rim), alpha * 0.8);
    const spiral: Pt[] = [];
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      const a = t * 6 + u * 16;
      const rw = radius * (0.22 + u * 0.95);
      spiral.push({
        x: x + Math.cos(a) * rw + Math.sin(t * 3 + seed + u * 2) * radius * 0.24 * u,
        y: y + H * 0.4 - H * u + Math.sin(a) * rw * 0.34,
      });
    }
    strokePts(g, spiral);
    // Debris caught in it.
    for (let i = 0; i < 4; i++) {
      const u = ((t * 0.8 + i / 4) % 1);
      const a = t * 7 + i * 1.9;
      const rw = radius * (0.22 + u * 0.95);
      sigilStarLayered(g, tint, x + Math.cos(a) * rw, y + H * 0.4 - H * u + Math.sin(a) * rw * 0.34,
        a, 4, 1.6, rim, alpha * 0.9, 4, false);
    }
  }

  /** The temple/monument that a fixed-anchor orbit hangs off. */
  static drawTemple(
    g: Phaser.GameObjects.Graphics, tint: MagicColorFn,
    x: number, y: number, size: number, monument: boolean, t: number,
  ): void {
    const body = monument ? MAGIC.rock : MAGIC.granite;
    const rim = monument ? MAGIC.granite : MAGIC.gust;
    g.fillStyle(tint(MAGIC.ink), 0.45);
    g.fillEllipse(x, y + size * 0.75, size * 2.2, size * 0.8);
    arcaneRing(g, tint, x, y, size * 1.7, t * 0.6, MAGIC.stone, 0.5, 1.6, 6, false);
    // Stepped base.
    for (let i = 2; i >= 0; i--) {
      const w = size * (1.1 - i * 0.22);
      g.fillStyle(tint(i === 0 ? rim : body), 0.95);
      fillPts(g, [
        { x: x - w, y: y + size * 0.5 - i * size * 0.34 },
        { x: x + w, y: y + size * 0.5 - i * size * 0.34 },
        { x: x + w * 0.86, y: y + size * 0.2 - i * size * 0.34 },
        { x: x - w * 0.86, y: y + size * 0.2 - i * size * 0.34 },
      ]);
    }
    // Two pillars and a lintel.
    for (const side of [-1, 1]) {
      g.fillStyle(tint(body), 1);
      fillPts(g, [
        { x: x + side * size * 0.62, y: y - size * 0.5 },
        { x: x + side * size * 0.34, y: y - size * 0.5 },
        { x: x + side * size * 0.34, y: y - size * 0.05 },
        { x: x + side * size * 0.62, y: y - size * 0.05 },
      ]);
    }
    g.fillStyle(tint(rim), 1);
    fillPts(g, [
      { x: x - size * 0.8, y: y - size * 0.5 },
      { x: x + size * 0.8, y: y - size * 0.5 },
      { x: x + size * 0.55, y: y - size * 0.85 },
      { x: x - size * 0.55, y: y - size * 0.85 },
    ]);
    sigilStarLayered(g, tint, x, y - size * 0.28, t * 1.5, size * 0.3, size * 0.11,
      monument ? MAGIC.ember : MAGIC.orchid, 0.9, 5, false);
  }

  /** A Sparkle Shot sitting armed, or in flight. */
  static drawSparkle(
    g: Phaser.GameObjects.Graphics, tint: MagicColorFn,
    x: number, y: number, armed: number, t: number, trailing: boolean,
  ): void {
    const size = trailing ? 7 : 10;
    // Armed sparkles wind tighter and brighter over their one stationary second.
    const glow = trailing ? 0.5 : 0.7 + armed * 0.3;
    g.fillStyle(tint(MAGIC.blush), 0.22 * glow);
    g.fillCircle(x, y, size * (2 + armed * 1.4));
    if (armed > 0) {
      arcaneRing(g, tint, x, y, size * (2.2 - armed * 0.9), t * 5, MAGIC.blush, 0.5 + armed * 0.4, 1.6, 4, false);
    }
    sigilStarLayered(g, tint, x, y, t * 3, size * (1 + armed * 0.35), size * 0.34, MAGIC.blush, glow + 0.25, 5, true);
  }

  /** A Meditate heal orb drifting in off the arena edge. */
  static drawHealOrb(
    g: Phaser.GameObjects.Graphics, tint: MagicColorFn,
    x: number, y: number, angle: number, t: number,
  ): void {
    for (let i = 3; i >= 1; i--) {
      g.fillStyle(tint(MAGIC.lilac), 0.1 * (4 - i));
      g.fillCircle(x - Math.cos(angle) * i * 7, y - Math.sin(angle) * i * 7, 5 - i);
    }
    g.fillStyle(tint(MAGIC.purple), 0.25);
    g.fillCircle(x, y, 15);
    sigilStarLayered(g, tint, x, y, t * 2.4, 9, 3.4, MAGIC.lilac, 0.95, 6, true);
  }

  /** The Magic Anchor marker, waiting to be recalled to. */
  static drawAnchor(
    g: Phaser.GameObjects.Graphics, tint: MagicColorFn,
    x: number, y: number, t: number,
  ): void {
    const pulse = 0.6 + 0.4 * Math.sin(t * 2.4);
    g.fillStyle(tint(MAGIC.purple), 0.14 * pulse);
    g.fillCircle(x, y, 26);
    arcaneRing(g, tint, x, y, 17, t * 0.9, MAGIC.orchid, 0.45 + 0.3 * pulse, 2, 5);
    sigilStarLayered(g, tint, x, y, -t * 1.4, 8, 3, MAGIC.orchid, 0.55 + 0.3 * pulse, 6, false);
  }

  /** The Transmogrify bolt: a feathered mote of raw transformation. */
  static drawChickenBolt(
    g: Phaser.GameObjects.Graphics, tint: MagicColorFn,
    x: number, y: number, angle: number, t: number,
  ): void {
    for (let i = 3; i >= 1; i--) {
      sigilStarLayered(g, tint, x - Math.cos(angle) * i * 8, y - Math.sin(angle) * i * 8,
        t * 4 - i, 7 - i, 2.4, MAGIC.gold, 0.18 * (4 - i), 5, false);
    }
    g.fillStyle(tint(MAGIC.white), 0.3);
    g.fillCircle(x, y, 15);
    sigilStarLayered(g, tint, x, y, t * 6, 11, 3.6, MAGIC.white, 0.98, 5, true);
    g.fillStyle(tint(MAGIC.gold), 0.9);
    g.fillCircle(x, y, 3);
  }

  /** One Thorn Prison chain: a vine running from a corner to whoever is pinned. */
  static drawPrisonChain(
    g: Phaser.GameObjects.Graphics, tint: MagicColorFn,
    cx: number, cy: number, ex: number, ey: number, health: number, t: number,
  ): void {
    // Fraying: a chain about to snap is thin, pale and whipping hard.
    vineLash(g, tint, cx, cy, ex, ey, t * (1 + (1 - health) * 1.6),
      health > 0.4 ? MAGIC.darkVine : MAGIC.vine, MAGIC.leaf,
      Math.max(0.25, health), 2 + health * 3);
  }

  /** The Torture Trap thread: blood being pulled back down a vine into the caster. */
  static drawLifeLink(
    g: Phaser.GameObjects.Graphics, tint: MagicColorFn,
    sx: number, sy: number, tx: number, ty: number, t: number,
  ): void {
    vineLash(g, tint, sx, sy, tx, ty, t, MAGIC.darkVine, MAGIC.blood, 0.9, 3);
    // Beads running back along it toward the caster, so which way it steals is obvious.
    for (let i = 0; i < 4; i++) {
      const p = 1 - ((t * 0.9 + i / 4) % 1);
      g.fillStyle(tint(MAGIC.blood), 0.9 * (1 - Math.abs(p - 0.5) * 1.2));
      g.fillCircle(sx + (tx - sx) * p, sy + (ty - sy) * p, 3.4);
    }
  }
}

// ── MagicAura ─────────────────────────────────────────────────────────────

export type MagicAuraStyle =
  | 'meditate'  // channelling F: orbs converging, the caster still
  | 'darkness'  // how far down the dark wheel you have gone
  | 'boost'     // R+ Wild Anchor speed window
  | 'bound'     // held by a Virulent Thorns vine
  | 'chicken';  // Transmogrify, seen on the victim

/**
 * A persistent magic effect riding on a fighter. One Graphics, driven by whoever owns it.
 *
 * The styles differ in *shape*: a channel converges, darkness creeps up from the feet, a boost
 * streams behind you, a bind wraps you and a transmogrification flutters. Several can be up at
 * once, so they must stay separable at a glance.
 */
export class MagicAura {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private intensity = 1;
  private angle = 0;

  constructor(
    scene: Phaser.Scene,
    private tint: MagicColorFn,
    private style: MagicAuraStyle,
    private radius: number,
    depth = 4,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  /** Usually how far along the effect is — the darkness fraction, or a remaining fraction. */
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
      case 'meditate': {
        // Two circles turning against each other, with sigils settling into the caster.
        arcaneRing(g, this.tint, x, y, r * 1.25, t * 0.9, MAGIC.orchid, alpha * 0.55, 2, 6);
        arcaneRing(g, this.tint, x, y, r * 0.8, -t * 1.4, MAGIC.lilac, alpha * 0.4, 1.4, 4, false);
        for (let i = 0; i < 5; i++) {
          const p = (t * 0.7 + i / 5) % 1;
          const a = (i / 5) * TAU + t;
          const d = r * (1.5 - p * 1.2);
          sigilStarLayered(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d, t * 4 + i,
            5 * (0.4 + p), 1.8, MAGIC.lilac, alpha * 0.85 * p, 5, false);
        }
        break;
      }
      case 'darkness': {
        // Corruption climbing the body — the higher the meter, the further up it reaches.
        g.fillStyle(this.tint(MAGIC.voidInk), alpha * 0.18 * k);
        g.fillEllipse(x, y + r * 0.4, r * 2.2, r * (0.6 + k * 1.4));
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          const climb = r * (0.5 + k * 0.9) * (0.6 + 0.4 * Math.sin(t * 2.2 + i));
          g.fillStyle(this.tint(k > 0.75 ? MAGIC.magenta : MAGIC.darkPlum), alpha * (0.4 + 0.4 * k));
          fillPts(g, [
            { x: x + Math.cos(a) * r * 0.9, y: y + r * 0.45 },
            { x: x + Math.cos(a) * r * 0.6, y: y + r * 0.45 - climb },
            { x: x + Math.cos(a) * r * 1.15, y: y + r * 0.45 - climb * 0.55 },
          ]);
        }
        if (k > 0.75) {
          // Past three-quarters it is actively trying to finish you, and it looks like it.
          arcaneRing(g, this.tint, x, y, r * (1.1 + 0.06 * Math.sin(t * 9)), -t * 2.6,
            MAGIC.magenta, alpha * (k - 0.75) * 3, 2.4, 7);
        }
        break;
      }
      case 'boost': {
        // Streamers pulled off behind you, plus a rune wake on the floor.
        const wild = k > 0.5;
        g.fillStyle(this.tint(wild ? MAGIC.wildVoid : MAGIC.blush), alpha * 0.14);
        g.fillCircle(x, y, r * 1.1);
        for (let i = 0; i < 5; i++) {
          const p = (t * 2.4 + i / 5) % 1;
          const a = this.angle + Math.PI + (i - 2) * 0.24;
          sigilStarLayered(g, this.tint,
            x + Math.cos(a) * r * (0.6 + p * 1.5), y + Math.sin(a) * r * (0.6 + p * 1.5),
            t * 6 + i, 7 * (1 - p), 2.4, wild ? MAGIC.magenta : MAGIC.blush,
            alpha * 0.9 * (1 - p), 5, false);
        }
        break;
      }
      case 'bound': {
        // A live vine wrapped round the body, cinching tighter as its two seconds run down.
        for (let i = 0; i < 3; i++) {
          const a = t * 1.4 + (i / 3) * TAU;
          const rr = r * (0.9 - i * 0.12);
          const p1 = { x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr * 0.6 - i * 6 };
          const p2 = { x: x + Math.cos(a + Math.PI) * rr, y: y + Math.sin(a + Math.PI) * rr * 0.6 - i * 6 };
          vineLash(g, this.tint, p1.x, p1.y, p2.x, p2.y, t, MAGIC.darkVine, MAGIC.leaf, alpha * 0.9, 3);
        }
        break;
      }
      case 'chicken': {
        // Feathers, and the sigil that did this to them still hanging over their head.
        for (let i = 0; i < 5; i++) {
          const p = (t * 0.9 + i / 5) % 1;
          const a = (i / 5) * TAU + Math.sin(t + i);
          g.fillStyle(this.tint(MAGIC.white), alpha * 0.85 * (1 - p));
          g.fillEllipse(x + Math.cos(a) * r * (0.5 + p), y + Math.sin(a) * r * 0.5 + p * 20,
            5 * (1 - p * 0.5), 2.4 * (1 - p * 0.5));
        }
        sigilStarLayered(g, this.tint, x, y - r * 1.2, t * 3, 8, 3, MAGIC.gold, alpha * 0.9, 5, false);
        break;
      }
    }
  }

  destroy(): void { this.g.destroy(); }
}

// ── MagicAvatar ───────────────────────────────────────────────────────────

/** Concentric discs of one rune-lit hand, outermost first. */
const MAGIC_AVATAR: AvatarSpec = {
  hands: [
    { r: 12.5, color: MAGIC.purple, alpha: 0.22 },
    { r: 7.8, color: MAGIC.violet, alpha: 1 },
    { r: 4.8, color: MAGIC.orchid, alpha: 1 },
    { r: 2, color: MAGIC.white, alpha: 1, ox: -2.2, oy: -2.4 },
  ],
  eyeWhite: MAGIC.lilac,
  eyePupil: MAGIC.ink,
  // Weightless hands — they float rather than swing, so they lag long and smear little.
  squash: { div: 15, x: 0.4, y: 0.22 },
};

/**
 * The magic character rig: two rune-lit hands, a pair of tracking eyes, and an open grimoire
 * hovering over the crown with its pages turning and runes rising out of it.
 *
 * The book is the idea. Magic has no medium of its own — it borrows fire, water, stone and wind —
 * so what must read as *magic* is the act of reading a spell out of something, and a fighter that
 * visibly carries an open book is that, before it has cast anything.
 */
export class MagicAvatar extends BaseAvatar {
  private fx: MagicFx;
  /** Violet for the player, gold for the NPC, so two magic fighters never blur together. */
  private accent: number;
  /** How dark the caster has gone, 0–1 — bleeds into the book and the floor circle. */
  private corruption = 0;

  constructor(scene: Phaser.Scene, tint: MagicColorFn, owner: 'player' | 'npc' = 'player', depth = 6) {
    super(scene, tint, depth, MAGIC_AVATAR);
    this.fx = new MagicFx(scene, tint);
    this.accent = owner === 'player' ? MAGIC.orchid : MAGIC.gold;
  }

  /** Darkness meter, 0–1. Stains the book, the runes and the floor circle as it climbs. */
  setCorruption(v: number): void { this.corruption = Phaser.Math.Clamp(v, 0, 1); }

  /**
   * Mastery tell — Levitate, made visible: the hands gain a wide corona, the eyes go gold, and
   * (in drawExtras) a second tome joins the first, the book's rune halo doubles, and the shadow
   * underfoot shrinks because the caster is no longer standing on it. Shape changes, not brighter
   * tints — a tint alone vanishes at gameplay zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? MAGIC.gold : MAGIC.lilac);
    this.forEachHandLayer(0, (glow) => glow.setRadius(on ? 17 : 12.5));
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(2, this.tint(MAGIC.gold), 0.95);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands shed sigils. */
  protected emitTrail(x: number, y: number): void {
    this.fx.motes(x, y, 1, { speed: 24, size: 2, life: 520, depth: 5, color: this.accent, drift: -14 });
  }

  /** Both hands cupped low over an unseen page — the meditation channel. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    const breathe = 0.5 + 0.5 * Math.sin(this.t * 2.4);
    return {
      ang: Math.PI / 2 + side * 0.72,
      dist: 22 + breathe * 4,
      scale: idle.scale * (1.05 + breathe * 0.12),
    };
  }

  /**
   * A summoning circle on the floor, turning slowly under the caster — and shrinking to a small
   * hovering shadow once Levitate lifts them off it.
   */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const k = this.intensity;
    const lift = this.mastered ? 0.55 : 1;
    g.fillStyle(this.tint(MAGIC.ink), a * 0.26 * lift);
    g.fillEllipse(x, y + (this.mastered ? 16 : 9), 50 * k * lift, 18 * k * lift);
    const col = this.corruption > 0.4 ? MAGIC.magenta : this.accent;
    g.fillStyle(this.tint(col), a * 0.12 * k);
    g.fillCircle(x, y, 26 * k);
    arcaneRing(g, this.tint, x, y + 6, 30 * k, this.t * 0.5, col, a * 0.5, 1.8, 6);
    if (this.mastered) {
      // Levitating: a second, wider circle the caster is riding on.
      arcaneRing(g, this.tint, x, y + 10, 42 * k, -this.t * 0.35, MAGIC.gold, a * 0.4, 1.4, 8, false);
    }
  }

  /**
   * Runes cupped in each hand, and the crown: an open grimoire floating above the head, its pages
   * turning, with sigils lifting off the spread and orbiting.
   *
   * Rooted above the head so it never covers the face, and drawn over the sprite so the book reads
   * instead of only its dark spine clearing the body.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const tint = this.tint;
    const corrupt = this.corruption > 0.4;
    const pageCol = corrupt ? MAGIC.voidInk : MAGIC.parchment;
    const inkCol = corrupt ? MAGIC.magenta : MAGIC.violet;

    // ── Runes cupped over each hand ──
    for (let i = 0; i < 2; i++) {
      const hx = this.armX[i], hy = this.armY[i];
      if (hx === 0 && hy === 0) continue;
      sigilStarLayered(g, tint, hx, hy - 2, this.t * (i === 0 ? 2.2 : -2.2),
        9 * this.intensity, 3.2, this.mastered ? MAGIC.gold : this.accent, alpha * 0.9, 5, false);
    }

    // ── The grimoire ──
    const bob = Math.sin(this.t * 1.9) * 2.4;
    const rootY = y - 20 + bob;
    const tilt = Math.sin(this.t * 1.3) * 0.12;
    this.drawBook(g, x, rootY, 15 * this.intensity, tilt, pageCol, inkCol, alpha);

    // Sigils lifting off the open spread.
    const halo = this.mastered ? 6 : 3;
    for (let i = 0; i < halo; i++) {
      const p = (this.t * 0.7 + i / halo) % 1;
      const ox = ((i % 3) - 1) * 9;
      sigilStarLayered(g, tint, x + ox + Math.sin(this.t * 2 + i) * 4, rootY - 6 - p * 20,
        this.t * 4 + i, 5 * (1 - p * 0.5), 1.8,
        this.mastered ? MAGIC.gold : this.accent, alpha * 0.9 * (1 - p), 5, false);
    }

    // ── Mastery: a second tome, and a rune halo turning round the head ──
    if (this.mastered) {
      this.drawBook(g, x - 20, rootY + 8, 9, -tilt * 1.6, pageCol, MAGIC.brass, alpha * 0.9);
      for (let i = 0; i < 5; i++) {
        const ang = this.t * 1.2 + (i / 5) * TAU;
        sigilStarLayered(g, tint, x + Math.cos(ang) * 27, rootY - 4 + Math.sin(ang) * 9,
          ang * 2, 6, 2.2, MAGIC.gold, alpha * 0.9, 6, false);
      }
    }
    void a;
  }

  /** One open book: two page spreads meeting at a spine, with a cover behind them. */
  private drawBook(
    g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, tilt: number,
    pageCol: number, inkCol: number, alpha: number,
  ): void {
    const at = frame(x, y, tilt);
    // Cover, behind and slightly larger than the pages.
    g.fillStyle(this.tint(MAGIC.leather), alpha);
    fillPts(g, [at(-size * 1.15, -size * 0.1), at(0, size * 0.28), at(size * 1.15, -size * 0.1), at(0, size * 0.62)]);
    // The two page spreads, each curving up off the spine.
    for (const side of [-1, 1]) {
      const spread: Pt[] = [];
      for (let i = 0; i <= 8; i++) {
        const u = i / 8;
        spread.push(at(side * u * size, -Math.sin(u * Math.PI * 0.8) * size * 0.36));
      }
      for (let i = 8; i >= 0; i--) {
        const u = i / 8;
        spread.push(at(side * u * size, size * 0.34 - Math.sin(u * Math.PI * 0.8) * size * 0.16));
      }
      g.fillStyle(this.tint(pageCol), alpha * 0.95);
      fillPts(g, spread);
      g.lineStyle(1, this.tint(MAGIC.brass), alpha * 0.7);
      strokePts(g, spread, true);
      // Lines of text, shortening toward the outer edge.
      for (let l = 0; l < 3; l++) {
        const ly = -size * 0.12 + l * size * 0.14;
        g.lineStyle(1, this.tint(inkCol), alpha * 0.55);
        strokePts(g, [at(side * size * 0.18, ly), at(side * size * (0.82 - l * 0.12), ly - size * 0.06)]);
      }
    }
    // Spine and its clasp.
    g.lineStyle(2, this.tint(MAGIC.brass), alpha);
    strokePts(g, [at(0, -size * 0.06), at(0, size * 0.36)]);
    g.fillStyle(this.tint(MAGIC.gold), alpha);
    const clasp = at(0, size * 0.44);
    g.fillCircle(clasp.x, clasp.y, size * 0.11);
  }
}
