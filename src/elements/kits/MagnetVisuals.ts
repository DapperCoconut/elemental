import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Magnet renders: the polarised avatar (one north hand, one
 * south, a horseshoe worn as a crown, eyes), the field auras, and the one-shot effects every
 * ability throws off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts and are shared with the other elements. What stays here is what makes magnet
 * magnet: the field line, the iron filing, and everything built out of the two.
 *
 * Every structural colour must come from the MAGNET palette below. Magnet has no colour-slot
 * cosmetic yet, but every call still routes through the owner's `magnetColor` mapper, so the day
 * one lands it is a table edit in CosmeticsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — CosmeticsKit.magnetColor bound to one owner. */
export type MagnetColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const MAGNET = {
  /** The dark iron everything here is cast from. */
  shadow: 0x14161f,
  dark: 0x333a4a,
  iron: 0x99aacc,
  steel: 0xccddee,
  chrome: 0xeef4ff,
  /** North: the element's own crimson. */
  red: 0xcc2244,
  rose: 0xff4488,
  blush: 0xff88aa,
  /** South: the cold end of every field line. */
  blue: 0x3399ff,
  azure: 0x4488cc,
  sky: 0x88ccff,
  /** Nails, and anything gilded by an upgrade. */
  gold: 0xffd060,
  goldHi: 0xffee88,
  amber: 0xffaa33,
  /** Copper barrage. */
  copper: 0xcc7744,
  copperHi: 0xffaa66,
  /** Ancient rods, buried until a pulse finds them. */
  bronze: 0x8a5a2b,
  bronzeHi: 0xbb8844,
  /** A rod launched ballistically out of the compactor. */
  hot: 0xff4400,
  ember: 0xff9933,
  /** Mag-Lev. */
  violet: 0x6644aa,
  lilac: 0xaa66ff,
  /** Compactor plating. */
  plate: 0x777788,
  plateHi: 0xaabbcc,
  rust: 0x884433,
  white: 0xffffff,
} as const;

export interface Pt { x: number; y: number }

/** What a rod is made of. Drives its colour and how the metal is hatched. */
export type RodKind = 'steel' | 'copper' | 'ancient' | 'ancient-live';

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
 * Magnet's primitive: a field line — a band that bows out sideways as it runs from one point to
 * another, fat in the middle and pinched to nothing at both ends.
 *
 * A magnetic field is *drawn* this way in every textbook there is, and nothing else in this game
 * uses a bowed, pinched arc. Pulls, repulses, auras, the crown, the compactor's grip and the
 * hoverboard's cushion are all this shape at different bows and scales; get it right once and
 * the whole element reads as magnetism rather than as red circles.
 */
export function fieldArc(
  g: Phaser.GameObjects.Graphics,
  x1: number, y1: number, x2: number, y2: number,
  bow: number, width: number, segments = 20,
): void {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Quadratic bow, and a matching envelope so the band is a lens rather than a bar.
    const swell = 4 * t * (1 - t);
    const cx = x1 + dx * t + nx * bow * swell;
    const cy = y1 + dy * t + ny * bow * swell;
    // Tangent, so the band's thickness is measured across the curve rather than across the chord.
    const tanX = dx / len + nx * bow * (4 - 8 * t) / len;
    const tanY = dy / len + ny * bow * (4 - 8 * t) / len;
    const tl = Math.hypot(tanX, tanY) || 1;
    const px = -tanY / tl, py = tanX / tl;
    const hw = Math.max(0.15, width * 0.5 * Math.pow(swell, 0.4));
    top.push({ x: cx + px * hw, y: cy + py * hw });
    bot.push({ x: cx - px * hw, y: cy - py * hw });
  }
  bot.reverse();
  fillPts(g, top.concat(bot));
}

/** The primitive in three passes: a soft halo, the line body, and a bright filament down it. */
export function fieldArcLayered(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  x1: number, y1: number, x2: number, y2: number,
  bow: number, width: number, color: number, alpha: number,
): void {
  g.fillStyle(tint(color), alpha * 0.18);
  fieldArc(g, x1, y1, x2, y2, bow, width * 3);
  g.fillStyle(tint(color), alpha * 0.85);
  fieldArc(g, x1, y1, x2, y2, bow, width);
  g.fillStyle(tint(MAGNET.white), alpha * 0.9);
  fieldArc(g, x1, y1, x2, y2, bow, width * 0.32);
}

/**
 * Iron filings: short dashes scattered around a point, each one turned to lie along the field.
 * The second half of the element's vocabulary — filings are what make an invisible field visible,
 * and they are the cheapest possible read on "something here is magnetic".
 */
export function ironFilings(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  cx: number, cy: number, radius: number, count: number,
  /** Field origin the filings align toward. */
  towardX: number, towardY: number,
  color: number, alpha: number, seed = 0,
): void {
  for (let i = 0; i < count; i++) {
    // Deterministic scatter, so filings stay put frame to frame instead of boiling.
    const a = seed + i * 2.399;
    const d = radius * (0.35 + ((i * 0.618) % 1) * 0.65);
    const fx = cx + Math.cos(a) * d;
    const fy = cy + Math.sin(a) * d * 0.9;
    const align = Math.atan2(towardY - fy, towardX - fx);
    const l = 3 + ((i * 0.37) % 1) * 4;
    g.lineStyle(1.6, tint(color), alpha * (0.5 + ((i * 0.29) % 1) * 0.5));
    strokePts(g, [
      { x: fx - Math.cos(align) * l, y: fy - Math.sin(align) * l },
      { x: fx + Math.cos(align) * l, y: fy + Math.sin(align) * l },
    ]);
  }
}

/** The colour a rod shows, from what it is made of and what has been done to it. */
export function rodColor(kind: RodKind, bouncing: boolean, permBonus: number): number {
  if (kind === 'copper') return MAGNET.copper;
  if (kind === 'ancient') return MAGNET.bronze;
  if (kind === 'ancient-live') return MAGNET.amber;
  if (bouncing && permBonus > 0) return MAGNET.blue;
  if (bouncing) return MAGNET.hot;
  if (permBonus > 0) return MAGNET.ember;
  return MAGNET.iron;
}

/**
 * A bar of metal: a capsule with a lit top face, a hatched shadow along the bottom, and a
 * specular band across the middle. The two faces are what make it read as a solid cylinder
 * instead of a coloured pill.
 */
export function metalBar(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  cx: number, cy: number, angle: number, len: number, thick: number,
  color: number, alpha: number, hatch = true,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const at = (lx: number, ly: number): Pt => ({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos });
  const hl = len / 2, ht = thick / 2;

  g.fillStyle(tint(MAGNET.shadow), alpha * 0.4);
  g.fillEllipse(cx, cy + thick * 0.55, len * 0.95, thick * 0.6);

  // Body.
  g.fillStyle(tint(color), alpha);
  fillPts(g, [at(-hl, -ht), at(hl, -ht), at(hl, ht), at(-hl, ht)]);
  const c1 = at(-hl, 0), c2 = at(hl, 0);
  g.fillCircle(c1.x, c1.y, ht);
  g.fillCircle(c2.x, c2.y, ht);

  // Lit top face and shaded underside.
  g.fillStyle(tint(MAGNET.white), alpha * 0.35);
  fillPts(g, [at(-hl * 0.9, -ht), at(hl * 0.9, -ht), at(hl * 0.8, -ht * 0.35), at(-hl * 0.8, -ht * 0.35)]);
  g.fillStyle(tint(MAGNET.shadow), alpha * 0.3);
  fillPts(g, [at(-hl * 0.9, ht), at(hl * 0.9, ht), at(hl * 0.8, ht * 0.4), at(-hl * 0.8, ht * 0.4)]);

  if (hatch) {
    // Machined bands across the bar.
    g.lineStyle(1, tint(MAGNET.shadow), alpha * 0.5);
    for (let i = -1; i <= 1; i++) {
      strokePts(g, [at(i * len * 0.22, -ht * 0.9), at(i * len * 0.22, ht * 0.9)]);
    }
  }
  g.lineStyle(1.2, tint(MAGNET.chrome), alpha * 0.7);
  strokePts(g, [at(-hl, -ht), at(hl, -ht)]);
}

/**
 * A nail: a tapered shaft to a point, a flat head with a lit rim, and a shadow under it. Drawn
 * as an actual fastener because every nail in this element is meant to be *pulled on* later, and
 * a dot never sells that.
 */
export function ironNail(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  cx: number, cy: number, angle: number, len: number, color: number, alpha: number,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const at = (lx: number, ly: number): Pt => ({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos });
  const hl = len / 2, w = len * 0.16;

  g.fillStyle(tint(MAGNET.shadow), alpha * 0.35);
  fillPts(g, [at(-hl + 1, -w + 1.5), at(hl + 1, 1.5), at(-hl + 1, w + 1.5)]);
  // Shaft tapering to the point.
  g.fillStyle(tint(color), alpha);
  fillPts(g, [at(-hl, -w), at(hl, 0), at(-hl, w)]);
  // Head.
  g.fillStyle(tint(color), alpha);
  fillPts(g, [at(-hl - w * 0.6, -w * 1.8), at(-hl + w * 0.4, -w * 1.8), at(-hl + w * 0.4, w * 1.8), at(-hl - w * 0.6, w * 1.8)]);
  g.fillStyle(tint(MAGNET.white), alpha * 0.55);
  fillPts(g, [at(-hl - w * 0.6, -w * 1.8), at(-hl + w * 0.4, -w * 1.8), at(-hl + w * 0.4, -w), at(-hl - w * 0.6, -w)]);
  // Highlight down the shaft.
  g.lineStyle(1, tint(MAGNET.chrome), alpha * 0.75);
  strokePts(g, [at(-hl + w, -w * 0.35), at(hl - w, -w * 0.06)]);
}

/**
 * The horseshoe magnet: two legs off a bent yoke, north leg red, south leg blue, with the field
 * jumping the gap between them. This is the element's emblem — it wears it as a crown.
 */
export function horseshoe(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  cx: number, cy: number, angle: number, size: number, alpha: number, t = 0,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const at = (lx: number, ly: number): Pt => ({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos });
  const s = size;
  const legW = s * 0.34;
  const gap = s * 0.36;

  // The yoke: a bent bar, drawn as an arc band across the top.
  g.lineStyle(legW, tint(MAGNET.dark), alpha);
  g.beginPath();
  const arcSegs = 12;
  for (let i = 0; i <= arcSegs; i++) {
    const a = Math.PI + (i / arcSegs) * Math.PI;
    // sin runs 0 → -1 → 0 across this half-turn, so the yoke arches *up* over the legs.
    const p = at(Math.cos(a) * (gap + legW * 0.5), Math.sin(a) * s * 0.62 - s * 0.1);
    if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
  }
  g.strokePath();

  // Legs, coloured by pole.
  for (const [dir, col] of [[-1, MAGNET.red], [1, MAGNET.blue]] as const) {
    const lx = dir * (gap + legW * 0.5);
    g.fillStyle(tint(MAGNET.dark), alpha);
    fillPts(g, [at(lx - legW / 2, -s * 0.1), at(lx + legW / 2, -s * 0.1), at(lx + legW / 2, s * 0.5), at(lx - legW / 2, s * 0.5)]);
    g.fillStyle(tint(col), alpha);
    fillPts(g, [at(lx - legW / 2, s * 0.16), at(lx + legW / 2, s * 0.16), at(lx + legW / 2, s * 0.5), at(lx - legW / 2, s * 0.5)]);
    g.fillStyle(tint(MAGNET.white), alpha * 0.35);
    fillPts(g, [at(lx - legW / 2, -s * 0.1), at(lx - legW / 6, -s * 0.1), at(lx - legW / 6, s * 0.5), at(lx - legW / 2, s * 0.5)]);
  }

  // The field jumping the gap — three arcs, each on its own beat.
  for (let i = 0; i < 3; i++) {
    const p = (t * 1.1 + i / 3) % 1;
    const a = at(-(gap + legW * 0.5), s * 0.48);
    const b = at(gap + legW * 0.5, s * 0.48);
    g.fillStyle(tint(i % 2 === 0 ? MAGNET.rose : MAGNET.sky), alpha * 0.85 * (1 - Math.abs(p - 0.5) * 1.2));
    fieldArc(g, a.x, a.y, b.x, b.y, (0.3 + p * 0.9) * s * 0.7, s * 0.1, 14);
  }
}

// ── MagnetFx ──────────────────────────────────────────────────────────────

export interface MagnetBoomOpts {
  /** Bits of shrapnel thrown clear. Defaults to radius/9. */
  shrapnel?: number;
  duration?: number;
  depth?: number;
  color?: number;
  /** Leave filings scattered on the floor. Default true. */
  mark?: boolean;
}

/**
 * One-shot magnet effects. Cheap to construct — build one per owner and hand it that owner's
 * colour mapper.
 */
export class MagnetFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: MagnetColorFn = (c) => c) {
    super(scene, tint);
  }

  // `color: number` is spelled out on every signature below: without it TypeScript infers the
  // literal type of the MAGNET default and refuses every other palette entry at the call site.

  /** Blown-out core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 8, color: number = MAGNET.rose): void {
    this.flashIn(x, y, radius, MAGNET.white, color, depth);
  }

  /**
   * A pulse: field lines springing outward in a rosette, with filings kicked up along them.
   * Every mag-pulse, repulse and shockwave in the element is one of these — a plain expanding
   * circle is the shape this element must never use.
   */
  pulse(
    x: number, y: number, radius: number, color: number,
    duration = 420, depth = 7, lines = 10, inward = false,
  ): void {
    const spokes = Array.from({ length: lines }, (_, i) => ({
      a: (i / lines) * TAU + Math.random() * 0.2,
      bow: (i % 2 === 0 ? 1 : -1) * (0.18 + Math.random() * 0.2),
      delay: Math.random() * 0.15,
    }));
    this.anim(depth, duration, (g, t) => {
      const p = inward ? 1 - t : t;
      const fade = inward ? t * t : 1 - t * t;
      for (const s of spokes) {
        const lt = Phaser.Math.Clamp((t - s.delay) / (1 - s.delay), 0, 1);
        if (lt <= 0) continue;
        const r = radius * (inward ? p : easeOut(lt));
        const x2 = x + Math.cos(s.a) * r, y2 = y + Math.sin(s.a) * r;
        fieldArcLayered(g, this.tint, x, y, x2, y2, r * s.bow, 5 * (1 - lt * 0.5), color, 0.85 * fade);
      }
      const r = radius * (inward ? p : easeOut(t));
      ironFilings(g, this.tint, x, y, r * 0.9, 10, x, y, MAGNET.steel, 0.7 * fade, t * 2);
    });
  }

  /**
   * A grab: field lines reaching from a point out to a victim and hauling in. Used wherever
   * something is being *pulled*, so a drag reads as force rather than as teleportation.
   */
  grasp(
    x: number, y: number, tx: number, ty: number, color: number,
    duration = 360, depth = 7,
  ): void {
    this.anim(depth, duration, (g, t) => {
      const fade = 1 - easeIn(t);
      for (let i = -1; i <= 1; i++) {
        // Three lines closing on the victim as the pull lands.
        const ex = tx + (x - tx) * t * 0.35;
        const ey = ty + (y - ty) * t * 0.35;
        fieldArcLayered(g, this.tint, x, y, ex, ey, i * 26 * (1 - t * 0.5), 5, color, 0.8 * fade);
      }
      ironFilings(g, this.tint, tx, ty, 24, 8, x, y, MAGNET.steel, 0.85 * fade, t);
    });
  }

  /** Shrapnel and filings thrown clear of an impact. */
  shrapnel(
    x: number, y: number, count: number,
    o: { speed?: number; spread?: number; angle?: number; size?: number; life?: number; depth?: number; color?: number; fall?: number } = {},
  ): void {
    const speed = o.speed ?? 200;
    const spread = o.spread ?? Math.PI;
    const baseAngle = o.angle ?? 0;
    const size = o.size ?? 11;
    const life = o.life ?? 480;
    const depth = o.depth ?? 9;
    const color = o.color ?? MAGNET.iron;
    const fall = o.fall ?? 60;

    const parts = Array.from({ length: count }, () => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        cos: Math.cos(a), sin: Math.sin(a), a,
        v: speed * (0.45 + Math.random() * 0.9),
        s: size * (0.55 + Math.random() * 0.8),
        spin: (Math.random() - 0.5) * 14,
        delay: Math.random() * 0.16,
      };
    });
    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        const cx = x + p.cos * d;
        const cy = y + p.sin * d + fall * lt * lt;
        const fade = 1 - lt * lt;
        metalBar(g, this.tint, cx, cy, p.a + p.spin * lt, p.s, p.s * 0.3, color, 0.9 * fade, false);
      }
    });
  }

  /**
   * A full detonation: white core, field lines blown outward, staggered pulses, shrapnel and
   * filings left scattered on the floor.
   */
  boom(x: number, y: number, radius: number, o: MagnetBoomOpts = {}): void {
    const color = o.color ?? MAGNET.rose;
    const bits = o.shrapnel ?? Math.max(5, Math.round(radius / 9));
    const dur = o.duration ?? Math.round(320 + radius * 1.1);
    const depth = o.depth ?? 8;

    if (o.mark !== false) this.filingsMark(x, y, radius * 0.75, depth - 6);
    this.flash(x, y, radius * 0.38, depth + 2, color);
    this.pulse(x, y, radius, color, Math.round(dur * 0.8), depth, 12);
    this.scene.time.delayedCall(90, () => this.pulse(x, y, radius * 1.25, MAGNET.white, dur, depth, 8));
    this.shrapnel(x, y, bits, {
      speed: radius * 2.1, size: 9 + radius / 10, life: Math.round(dur * 1.2), depth: depth + 1, color: MAGNET.iron,
    });
  }

  /** Filings settling on the floor where a field just collapsed. */
  filingsMark(x: number, y: number, radius: number, depth = 2, color: number = MAGNET.dark): void {
    this.anim(depth, 1700, (g, t) => {
      const a = t < 0.08 ? t / 0.08 : 1 - (t - 0.08) / 0.92;
      g.fillStyle(this.tint(MAGNET.shadow), 0.3 * a);
      g.fillEllipse(x, y, radius * 2, radius * 1.05);
      ironFilings(g, this.tint, x, y, radius, 16, x, y - radius, color, 0.8 * a, 1.7);
    });
  }

  /** Sparks off metal striking metal. */
  sparks(x: number, y: number, count: number, angle: number, depth = 10, color: number = MAGNET.goldHi): void {
    const parts = Array.from({ length: count }, () => ({
      a: angle + (Math.random() - 0.5) * 2.2,
      v: 90 + Math.random() * 200,
      w: 1 + Math.random() * 1.4,
      delay: Math.random() * 0.2,
    }));
    this.anim(depth, 320, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const prev = Math.max(0, lt - 0.2);
        const at = (f: number): Pt => ({
          x: x + Math.cos(p.a) * p.v * easeOut(f) * 0.32,
          y: y + Math.sin(p.a) * p.v * easeOut(f) * 0.32 + 50 * f * f,
        });
        const e = at(lt), b = at(prev);
        g.lineStyle(p.w * (1 - lt), this.tint(color), 0.95 * (1 - lt));
        strokePts(g, [b, e]);
      }
    });
  }

  /** A hitscan laser between two points, with a field-line halo around the beam. */
  laser(x1: number, y1: number, x2: number, y2: number, color: number, depth = 9, width = 3): void {
    this.anim(depth, 240, (g, t) => {
      const fade = 1 - easeIn(t);
      fieldArcLayered(g, this.tint, x1, y1, x2, y2, 8 * Math.sin(t * 6), width, color, 0.9 * fade);
      g.lineStyle(width * 0.7, this.tint(MAGNET.white), fade);
      strokePts(g, [{ x: x1, y: y1 }, { x: x2, y: y2 }]);
    });
    this.sparks(x2, y2, 5, Math.atan2(y2 - y1, x2 - x1) + Math.PI, depth + 1, color);
  }

  // ── Per-frame painters ──────────────────────────────────────────────────
  // Drawn into a Graphics the caller already owns, because these ride on live gameplay state:
  // a rod's velocity, an orb's remaining HP, how far a compactor plate has travelled.

  /**
   * A rod in the world: a machined bar of metal turned along its heading, with motion smear
   * behind it once it is really moving and a field halo while it is being flung.
   */
  static drawRod(
    g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
    x: number, y: number, vx: number, vy: number,
    kind: RodKind, bouncing: boolean, permBonus: number, isSword: boolean, t: number,
  ): void {
    const speed = Math.hypot(vx, vy);
    const angle = speed > 8 ? Math.atan2(vy, vx) : 0;
    const color = rodColor(kind, bouncing, permBonus);
    const len = isSword ? 30 : 22;
    const thick = isSword ? 6 : 11;

    // Smear: ghosts of the bar strung out behind it, longer the faster it travels.
    if (speed > 60) {
      const smear = Math.min(1, speed / 900);
      for (let i = 3; i >= 1; i--) {
        const back = i * 9 * smear;
        metalBar(g, tint, x - Math.cos(angle) * back, y - Math.sin(angle) * back, angle,
          len, thick * 0.8, color, 0.16 * smear * (1 - i * 0.2), false);
      }
    }

    if (isSword) {
      // Blade perk: a tapered blade with a lit edge and a crossguard instead of a bar.
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const at = (lx: number, ly: number): Pt => ({ x: x + lx * cos - ly * sin, y: y + lx * sin + ly * cos });
      g.fillStyle(tint(MAGNET.shadow), 0.4);
      g.fillEllipse(x, y + 5, len, 6);
      g.fillStyle(tint(color), 1);
      fillPts(g, [at(-len * 0.5, -3), at(len * 0.36, -3), at(len * 0.5, 0), at(len * 0.36, 3), at(-len * 0.5, 3)]);
      g.fillStyle(tint(MAGNET.chrome), 0.8);
      fillPts(g, [at(-len * 0.44, -2.4), at(len * 0.34, -1.6), at(len * 0.34, -0.4), at(-len * 0.44, -0.6)]);
      g.fillStyle(tint(MAGNET.dark), 1);
      fillPts(g, [at(-len * 0.5, -6), at(-len * 0.42, -6), at(-len * 0.42, 6), at(-len * 0.5, 6)]);
    } else {
      metalBar(g, tint, x, y, angle, len, thick, color, 1);
    }

    // A rod under power wears its field.
    if (bouncing || kind === 'ancient-live') {
      for (let i = 0; i < 2; i++) {
        const p = (t * 1.6 + i / 2) % 1;
        const r = 12 + p * 16;
        g.fillStyle(tint(kind === 'ancient-live' ? MAGNET.amber : color), 0.6 * (1 - p));
        fieldArc(g, x - r, y, x + r, y, r * 0.8, 3, 14);
        fieldArc(g, x - r, y, x + r, y, -r * 0.8, 3, 14);
      }
    }
  }

  /** A nail in flight or buried in someone, with the pull line back to whoever owns it. */
  static drawNail(
    g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
    x: number, y: number, angle: number, color: number, implanted: boolean,
    ownerX: number, ownerY: number, t: number,
  ): void {
    if (implanted) {
      // Buried: the shaft sunk in, plus the tether hauling the victim toward its owner.
      fieldArcLayered(g, tint, x, y, ownerX, ownerY, 22 * Math.sin(t * 2), 2.6, color, 0.4);
      ironNail(g, tint, x, y, Math.atan2(ownerY - y, ownerX - x) + Math.PI, 16, color, 1);
      g.fillStyle(tint(color), 0.25 + 0.15 * Math.sin(t * 7));
      g.fillCircle(x, y, 11);
      return;
    }
    ironNail(g, tint, x, y, angle, 18, color, 1);
    // Air behind it, so a thrown nail reads as travelling rather than drifting.
    g.fillStyle(tint(color), 0.25);
    fieldArc(g, x - Math.cos(angle) * 22, y - Math.sin(angle) * 22, x, y, 5, 4, 10);
  }

  /** One orbiting ball bearing, dented and dimmed as it soaks damage. */
  static drawShieldOrb(
    g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
    x: number, y: number, hpRatio: number, t: number, alpha = 1,
  ): void {
    const r = 5 + hpRatio * 3;
    g.fillStyle(tint(MAGNET.azure), alpha * 0.25);
    g.fillCircle(x, y, r * 2);
    g.fillStyle(tint(MAGNET.dark), alpha);
    g.fillCircle(x, y, r);
    g.fillStyle(tint(MAGNET.azure), alpha);
    g.fillCircle(x, y, r * 0.85);
    // Specular highlight — a ball bearing is the shiniest thing in this element.
    g.fillStyle(tint(MAGNET.sky), alpha * 0.9);
    g.fillCircle(x - r * 0.32, y - r * 0.36, r * 0.34);
    g.fillStyle(tint(MAGNET.white), alpha);
    g.fillCircle(x - r * 0.38, y - r * 0.42, r * 0.16);
    // A damaged orb crackles.
    if (hpRatio < 0.6) {
      g.lineStyle(1, tint(MAGNET.white), alpha * (0.4 + 0.4 * Math.sin(t * 14)));
      g.strokeCircle(x, y, r + 2);
    }
  }

  /** The compactor core: a plated drum with a warning light and the field it is winding up. */
  static drawCompactor(
    g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
    x: number, y: number, charge: number, t: number, alpha = 1,
  ): void {
    // The suction field dragging everything in, tighter the closer it is to firing.
    for (let i = 0; i < 6; i++) {
      const a = t * 0.8 + (i / 6) * TAU;
      const p = 1 - ((t * 0.9 + i / 6) % 1);
      const r = 40 + p * 130;
      g.fillStyle(tint(MAGNET.rose), alpha * 0.5 * (1 - p) * (0.4 + charge * 0.6));
      fieldArc(g, x + Math.cos(a) * r, y + Math.sin(a) * r, x, y, r * 0.3, 5, 14);
    }

    g.fillStyle(tint(MAGNET.shadow), alpha * 0.5);
    g.fillEllipse(x, y + 18, 52, 14);
    g.fillStyle(tint(MAGNET.dark), alpha);
    g.fillCircle(x, y, 22);
    g.fillStyle(tint(MAGNET.plate), alpha);
    g.fillCircle(x, y, 18);
    // Hazard wedges around the drum.
    for (let i = 0; i < 6; i++) {
      const a0 = t * 0.5 + (i / 6) * TAU;
      g.fillStyle(tint(i % 2 === 0 ? MAGNET.amber : MAGNET.dark), alpha * 0.9);
      g.beginPath();
      g.moveTo(x, y);
      g.arc(x, y, 18, a0, a0 + TAU / 12, false);
      g.closePath();
      g.fillPath();
    }
    g.fillStyle(tint(MAGNET.plateHi), alpha);
    g.fillCircle(x, y, 10);
    // Warning light, faster the closer it is to slamming.
    g.fillStyle(tint(MAGNET.red), alpha * (0.4 + 0.6 * Math.abs(Math.sin(t * (4 + charge * 16)))));
    g.fillCircle(x, y, 6);
    g.lineStyle(2.5, tint(MAGNET.plateHi), alpha);
    g.strokeCircle(x, y, 22);
  }

  /** One compactor plate: a hazard-striped ram face on a hydraulic arm. */
  static drawCompactorWall(
    g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
    x: number, y: number, halfH: number, facing: 1 | -1, alpha = 1,
  ): void {
    const w = 20;
    // Arm running back off screen.
    g.fillStyle(tint(MAGNET.dark), alpha);
    g.fillRect(x - facing * 90 - w * 0.2, y - 7, 90, 14);
    g.fillStyle(tint(MAGNET.plate), alpha * 0.9);
    g.fillRect(x - facing * 90 - w * 0.2, y - 4, 90, 5);

    // Ram face.
    g.fillStyle(tint(MAGNET.dark), alpha);
    g.fillRect(x - w / 2 - 2, y - halfH - 2, w + 4, halfH * 2 + 4);
    g.fillStyle(tint(MAGNET.plate), alpha);
    g.fillRect(x - w / 2, y - halfH, w, halfH * 2);
    // Hazard stripes.
    for (let i = 0; i < 8; i++) {
      const sy = y - halfH + (i / 8) * halfH * 2;
      g.fillStyle(tint(i % 2 === 0 ? MAGNET.amber : MAGNET.dark), alpha * 0.8);
      g.fillRect(x - w / 2, sy, w, halfH * 0.13);
    }
    // Lit leading edge.
    g.fillStyle(tint(MAGNET.plateHi), alpha);
    g.fillRect(x + facing * (w / 2 - 3), y - halfH, 3, halfH * 2);
    g.lineStyle(2, tint(MAGNET.plateHi), alpha * 0.9);
    g.strokeRect(x - w / 2, y - halfH, w, halfH * 2);
  }

  /**
   * The Mag-Lev board: a deck riding on a cushion of field lines, tilting with the rider's
   * heading. The cushion is the whole point — a board without a visible gap is just a plank.
   */
  static drawMagLevBoard(
    gg: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
    x: number, y: number, lean: number, t: number, alpha = 1,
  ): void {
    const cos = Math.cos(lean), sin = Math.sin(lean);
    const at = (lx: number, ly: number): Pt => ({ x: x + lx * cos - ly * sin, y: y + lx * sin + ly * cos });

    // The cushion: field lines arcing between the deck and the floor.
    for (let i = 0; i < 4; i++) {
      const p = (t * 1.8 + i / 4) % 1;
      const ox = -18 + i * 12;
      gg.fillStyle(tint(MAGNET.lilac), alpha * 0.75 * (1 - p));
      fieldArc(gg, x + ox - 6, y + 6, x + ox + 6, y + 6 + 10 * p, 7, 3, 10);
    }
    gg.fillStyle(tint(MAGNET.violet), alpha * 0.25);
    gg.fillEllipse(x, y + 12, 52, 12);

    // Deck: a rounded plank with a lit rail and two field emitters underneath.
    gg.fillStyle(tint(MAGNET.violet), alpha);
    fillPts(gg, [at(-22, -4), at(22, -4), at(24, 2), at(-24, 2)]);
    gg.fillStyle(tint(MAGNET.lilac), alpha);
    fillPts(gg, [at(-22, -4), at(22, -4), at(22, -1.6), at(-22, -1.6)]);
    for (const ox of [-13, 13]) {
      const p = at(ox, 3);
      gg.fillStyle(tint(MAGNET.sky), alpha * (0.6 + 0.4 * Math.sin(t * 9 + ox)));
      gg.fillCircle(p.x, p.y, 3);
    }
  }

  /** A buried ancient rod, showing only as a faint disturbance until a pulse finds it. */
  static drawBuriedRod(
    g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
    x: number, y: number, t: number,
  ): void {
    const pulse = 0.16 + 0.1 * Math.sin(t * 2);
    g.fillStyle(tint(MAGNET.bronze), pulse * 0.5);
    g.fillEllipse(x, y, 26, 14);
    ironFilings(g, tint, x, y, 15, 7, x, y, MAGNET.bronzeHi, pulse, 0.9);
  }
}

// ── MagnetAura ────────────────────────────────────────────────────────────

export type MagnetAuraStyle =
  | 'magnetized'  // Magnetize: the victim wrapped in a field everything metal falls into
  | 'protect'     // Protect: the orbit ring the bearings ride
  | 'maglev'      // Mag-Lev: the violet hover field around the rider
  | 'reflect';    // R+ Reflect Burst: a hard shell that throws shots back

/**
 * A persistent field riding on a fighter. One Graphics, driven by whoever owns it.
 *
 * The styles differ in *shape*: magnetized converges, protect orbits, maglev lifts, reflect
 * encloses. Several can be up at once, so they must stay separable.
 */
export class MagnetAura {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private intensity = 1;

  constructor(
    scene: Phaser.Scene,
    private tint: MagnetColorFn,
    private style: MagnetAuraStyle,
    private radius: number,
    depth = 3,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  /** Usually the remaining fraction of the effect, so a field visibly runs down. */
  setIntensity(v: number): void { this.intensity = v; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;
    const k = Phaser.Math.Clamp(this.intensity, 0, 1);
    const r = this.radius;

    switch (this.style) {
      case 'magnetized': {
        // Field lines closing on the victim, with filings dragged in along them.
        for (let i = 0; i < 8; i++) {
          const a = this.t * 0.6 + (i / 8) * TAU;
          const p = (this.t * 0.7 + i / 8) % 1;
          const d = r * (1 - p * 0.55);
          g.fillStyle(this.tint(i % 2 === 0 ? MAGNET.rose : MAGNET.red), 0.7 * alpha * k * (1 - p * 0.6));
          fieldArc(g, x + Math.cos(a) * d, y + Math.sin(a) * d, x, y, d * 0.28, 4.5, 14);
        }
        ironFilings(g, this.tint, x, y, r * 0.75, 14, x, y, MAGNET.steel, 0.6 * alpha * k, this.t * 0.4);
        g.lineStyle(2, this.tint(MAGNET.rose), (0.35 + 0.25 * Math.sin(this.t * 5)) * alpha * k);
        g.strokeCircle(x, y, r);
        break;
      }
      case 'protect': {
        // The orbit the bearings ride, marked so the ring reads even between the orbs.
        g.fillStyle(this.tint(MAGNET.azure), 0.08 * alpha);
        g.fillCircle(x, y, r);
        g.lineStyle(1.4, this.tint(MAGNET.sky), 0.4 * alpha);
        g.strokeCircle(x, y, r);
        for (let i = 0; i < 6; i++) {
          const a = -this.t * 0.9 + (i / 6) * TAU;
          g.fillStyle(this.tint(MAGNET.azure), 0.5 * alpha);
          fieldArc(g, x + Math.cos(a) * r, y + Math.sin(a) * r,
            x + Math.cos(a + 0.9) * r, y + Math.sin(a + 0.9) * r, r * 0.16, 3, 12);
        }
        break;
      }
      case 'maglev': {
        // Lift: the rider held off the floor by a cushion that pushes back.
        g.fillStyle(this.tint(MAGNET.violet), 0.16 * alpha);
        g.fillEllipse(x, y + 22, r * 2.2, r * 0.7);
        for (let i = 0; i < 3; i++) {
          const p = (this.t * 2 + i / 3) % 1;
          g.fillStyle(this.tint(MAGNET.lilac), 0.7 * alpha * (1 - p));
          fieldArc(g, x - r * 0.8, y + 16 + p * 8, x + r * 0.8, y + 16 + p * 8, 9, 3.4, 12);
        }
        break;
      }
      case 'reflect': {
        // A hard shell: overlapping arcs forming a dome that shots bounce off.
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU + this.t * 0.5;
          const b = a + TAU / 8;
          g.fillStyle(this.tint(i % 2 === 0 ? MAGNET.sky : MAGNET.azure), 0.55 * alpha * k);
          fieldArc(g, x + Math.cos(a) * r, y + Math.sin(a) * r,
            x + Math.cos(b) * r, y + Math.sin(b) * r, r * 0.13, 6, 12);
        }
        g.fillStyle(this.tint(MAGNET.azure), 0.1 * alpha * k);
        g.fillCircle(x, y, r);
        break;
      }
    }
  }

  destroy(): void { this.g.destroy(); }
}

// ── MagnetAvatar ──────────────────────────────────────────────────────────

/** Concentric discs of one pole ball hand, outermost first. Recoloured per hand below. */
const MAGNET_AVATAR: AvatarSpec = {
  hands: [
    { r: 11, color: MAGNET.red, alpha: 0.24 },
    { r: 7, color: MAGNET.dark, alpha: 0.95 },
    { r: 4.2, color: MAGNET.red, alpha: 1 },
    { r: 1.6, color: MAGNET.white, alpha: 1, ox: -2, oy: -2 },
  ],
  eyeWhite: MAGNET.steel,
  eyePupil: MAGNET.shadow,
  // Heavy hands: they lag, and they smear like something with mass behind it.
  squash: { div: 16, x: 0.45, y: 0.26 },
};

/**
 * The magnet character rig: one north hand and one south hand, a pair of eyes, and a horseshoe
 * magnet turning over the crown with the field jumping its gap. Hands, eyes and gestures come
 * from BaseAvatar; what magnet adds is the polarity, the filings underfoot and the horseshoe.
 *
 * The two-tone hands are the whole idea. Every other element's rig has a matched pair; this one
 * is *polarised*, and that asymmetry is readable at a glance even before it casts anything.
 */
export class MagnetAvatar extends BaseAvatar {
  private fx: MagnetFx;
  /** Warm for the player, cold for the NPC, so two magnet fighters never blur together. */
  private accent: number;

  constructor(scene: Phaser.Scene, tint: MagnetColorFn, owner: 'player' | 'npc' = 'player', depth = 6) {
    super(scene, tint, depth, MAGNET_AVATAR);
    this.fx = new MagnetFx(scene, tint);
    this.accent = owner === 'player' ? MAGNET.rose : MAGNET.sky;
    // Hand 0 is the north pole, hand 1 the south — opposite ends of the same magnet.
    this.handLayer(1, 0).setFillStyle(this.tint(MAGNET.blue), 0.24);
    this.handLayer(1, 2).setFillStyle(this.tint(MAGNET.blue), 1);
  }

  /**
   * Mastery tell — Metal Detector, made visible: amber eyes, a wider corona and a gold rim on
   * each hand, a bigger horseshoe, and a detector coil sweeping its ping ring around the body.
   * Shape changes, not brighter tints — a tint alone vanishes at gameplay zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? MAGNET.amber : MAGNET.steel);
    this.handLayer(0, 0).setRadius(on ? 14.5 : 11);
    this.handLayer(1, 0).setRadius(on ? 14.5 : 11);
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.8, this.tint(MAGNET.amber), 0.95);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands shed filings. */
  protected emitTrail(x: number, y: number): void {
    this.fx.shrapnel(x, y, 1, { speed: 30, size: 7, life: 380, depth: 5, color: MAGNET.iron, fall: 30 });
  }

  /** Both hands hauled in tight, gripping a field between them. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    const grip = 0.5 + 0.5 * Math.sin(this.t * 5);
    return {
      ang: this.facing + side * (0.5 + grip * 0.2),
      dist: 22 + grip * 5,
      scale: idle.scale * (1.1 + grip * 0.15),
    };
  }

  /** Filings gathered underfoot, all pointing at whoever is standing on them. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const k = this.intensity;
    g.fillStyle(this.tint(this.accent), a * 0.14 * k);
    g.fillEllipse(x, y + 7, 54 * k, 24 * k);
    ironFilings(g, this.tint, x, y + 7, 26 * k, 12, x, y, MAGNET.iron, a * 0.75, 0.4);
  }

  /**
   * The crown: a horseshoe magnet hovering over the head, rocking gently, with the field jumping
   * its poles. Rooted at y - 22 so it never covers the face, and drawn over the sprite so the
   * red and blue legs read instead of only the dark yoke clearing the body.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const rootY = y - 26;
    const size = (this.mastered ? 26 : 20) * this.intensity;
    const rock = Math.sin(this.t * 1.8) * 0.16;
    horseshoe(g, this.tint, x, rootY, rock, size, a * 0.95, this.t);

    // Mastery: the detector coil — a ring under the horseshoe with a ping sweeping round it.
    if (this.mastered) {
      g.lineStyle(2, this.tint(MAGNET.amber), alpha * 0.55);
      g.strokeCircle(x, y, 30);
      const ping = (this.t * 0.9) % 1;
      const pa = -Math.PI / 2 + ping * TAU;
      g.fillStyle(this.tint(MAGNET.goldHi), alpha * 0.95);
      fieldArc(g, x + Math.cos(pa) * 30, y + Math.sin(pa) * 30,
        x + Math.cos(pa + 0.7) * 30, y + Math.sin(pa + 0.7) * 30, 5, 5, 12);
      for (let i = 0; i < 2; i++) {
        const p = (this.t * 1.2 + i / 2) % 1;
        g.lineStyle(1.6, this.tint(MAGNET.amber), alpha * 0.6 * (1 - p));
        g.strokeCircle(x, y, 30 + p * 22);
      }
    }
  }
}
