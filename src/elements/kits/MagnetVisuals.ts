import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Magnet renders: the polarised avatar (one north hand, one
 * south, a horseshoe worn as a crown, eyes), the per-frame painters for coins, nails, spikes
 * and scrap, and the one-shot effects every
 * ability throws off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts and are shared with the other elements. What stays here is what makes magnet
 * magnet: the field line, the iron filing, and everything built out of the two.
 *
 * Every structural colour must come from the MAGNET palette below. Magnet has no skin yet,
 * but every call still routes through the owner's `magnetColor` mapper, so the day
 * one lands it is a table edit in SkinsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — SkinsKit.magnetColor bound to one owner. */
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
  /** Electromagnet perk — a rod left live by the compactor rather than flung. */
  live: 0x66ffff,
  spark: 0xccffff,
  // Mecha Massacre: blue-black scrap plate, cobalt trim and a cyan visor.
  gun: 0x161b26,
  gunMid: 0x232c3d,
  gunHi: 0x34425c,
  cobalt: 0x1f5fbf,
  neon: 0x4fb8ff,
  visor: 0x8fe8ff,
  oil: 0x07090e,
} as const;

export interface Pt { x: number; y: number }


// ── Path helpers ──────────────────────────────────────────────────────────

export function fillPts(g: Phaser.GameObjects.Graphics, pts: Pt[]): void {
  if (pts.length < 3) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
}

export function strokePts(g: Phaser.GameObjects.Graphics, pts: Pt[], close = false): void {
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

  // The yoke: a bent bar, drawn as an arc band across the top — a dark outline under polished
  // iron, so it separates from both a dark floor and the crimson body.
  const arcSegs = 12;
  for (const [w, col] of [[legW + 2.4, MAGNET.shadow], [legW, MAGNET.iron]] as const) {
    g.lineStyle(w, tint(col), alpha);
    g.beginPath();
    for (let i = 0; i <= arcSegs; i++) {
      const a = Math.PI + (i / arcSegs) * Math.PI;
      // sin runs 0 → -1 → 0 across this half-turn, so the yoke arches *up* over the legs.
      const p = at(Math.cos(a) * (gap + legW * 0.5), Math.sin(a) * s * 0.62 - s * 0.1);
      if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
    }
    g.strokePath();
  }

  // Legs, coloured by pole.
  for (const [dir, col] of [[-1, MAGNET.red], [1, MAGNET.blue]] as const) {
    const lx = dir * (gap + legW * 0.5);
    g.fillStyle(tint(MAGNET.shadow), alpha);
    fillPts(g, [at(lx - legW / 2 - 1.2, -s * 0.1), at(lx + legW / 2 + 1.2, -s * 0.1), at(lx + legW / 2 + 1.2, s * 0.5 + 1.2), at(lx - legW / 2 - 1.2, s * 0.5 + 1.2)]);
    g.fillStyle(tint(MAGNET.iron), alpha);
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
   * Every pulse and shockwave in the element is one of these — a plain expanding
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

  /**
   * F+ Electromagnet: a jagged arc of lightning between two points. Re-rolls its kinks every
   * few frames so it crackles rather than sitting still, and leaves a spark burst where it lands.
   */
  zap(x1: number, y1: number, x2: number, y2: number, color: number = MAGNET.live, depth = 10): void {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const nx = -(y2 - y1) / (len || 1), ny = (x2 - x1) / (len || 1);
    const segs = Math.max(4, Math.round(len / 18));
    let kinks: number[] = [];
    let rolledAt = -1;
    this.anim(depth, 220, (g, t) => {
      const step = Math.floor(t * 6);
      if (step !== rolledAt) {
        rolledAt = step;
        kinks = Array.from({ length: segs + 1 }, (_, i) => (i === 0 || i === segs ? 0 : (Math.random() - 0.5) * Math.min(26, len * 0.22)));
      }
      const pts: Pt[] = kinks.map((k, i) => {
        const f = i / segs;
        return { x: x1 + (x2 - x1) * f + nx * k, y: y1 + (y2 - y1) * f + ny * k };
      });
      const fade = 1 - easeIn(t);
      g.lineStyle(6, this.tint(color), 0.25 * fade);
      strokePts(g, pts);
      g.lineStyle(2.4, this.tint(color), 0.95 * fade);
      strokePts(g, pts);
      g.lineStyle(1, this.tint(MAGNET.white), fade);
      strokePts(g, pts);
    });
    this.sparks(x2, y2, 4, Math.atan2(y2 - y1, x2 - x1) + Math.PI, depth + 1, MAGNET.spark);
  }


  // ── Revamp one-shots ────────────────────────────────────────────────────

  /**
   * Repulse: a fan of field lines thrown outward across a cone in front of the caster, with a
   * pressure front riding its far edge and filings blown off it. The cone is drawn at its real
   * size — what is inside the fan is what got pushed.
   */
  repulse(x: number, y: number, angle: number, radius: number, halfAngle: number, color: number, depth = 8): void {
    const lines = 9;
    const front = (g: Phaser.GameObjects.Graphics, r: number): void => {
      const steps = 18;
      g.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = angle - halfAngle + (i / steps) * halfAngle * 2;
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
    };
    this.anim(depth, 340, (g, t) => {
      const e = easeOut(t);
      const fade = 1 - easeIn(t);
      const r = radius * e;
      g.fillStyle(this.tint(color), 0.12 * fade);
      g.beginPath();
      g.moveTo(x, y);
      g.arc(x, y, r, angle - halfAngle, angle + halfAngle, false);
      g.closePath();
      g.fillPath();
      for (let i = 0; i < lines; i++) {
        const a = angle - halfAngle + (i / (lines - 1)) * halfAngle * 2;
        fieldArcLayered(g, this.tint,
          x + Math.cos(a) * 14, y + Math.sin(a) * 14, x + Math.cos(a) * r, y + Math.sin(a) * r,
          (i % 2 === 0 ? 1 : -1) * r * 0.08, 4.5 * (1 - t * 0.5), color, 0.8 * fade);
      }
      g.lineStyle(10 * (1 - t) + 2, this.tint(color), 0.35 * fade);
      front(g, r);
      g.lineStyle(4 * (1 - t) + 1, this.tint(MAGNET.white), 0.75 * fade);
      front(g, r);
      ironFilings(g, this.tint, x + Math.cos(angle) * r * 0.7, y + Math.sin(angle) * r * 0.7,
        r * 0.45, 10, x, y, MAGNET.steel, 0.7 * fade, t * 3);
    });
  }

  /** Steel Spike landing: a crater of radial cracks left on the floor under a blown-out ring. */
  slam(x: number, y: number, radius: number, color: number, depth = 7): void {
    const cracks = Array.from({ length: 9 }, (_, i) => ({
      a: (i / 9) * TAU + Math.random() * 0.4,
      l: radius * (0.55 + Math.random() * 0.45),
      k: (Math.random() - 0.5) * 0.5,
    }));
    this.anim(2, 1600, (g, t) => {
      const fade = t < 0.1 ? 1 : 1 - (t - 0.1) / 0.9;
      g.fillStyle(this.tint(MAGNET.shadow), 0.35 * fade);
      g.fillEllipse(x, y, radius * 0.9, radius * 0.5);
      g.lineStyle(2, this.tint(MAGNET.shadow), 0.8 * fade);
      for (const c of cracks) {
        strokePts(g, [
          { x, y },
          { x: x + Math.cos(c.a + c.k) * c.l * 0.5, y: y + Math.sin(c.a + c.k) * c.l * 0.3 },
          { x: x + Math.cos(c.a) * c.l, y: y + Math.sin(c.a) * c.l * 0.6 },
        ]);
      }
    });
    this.pulse(x, y, radius * 1.1, color, 420, depth, 12);
    this.flash(x, y, radius * 0.4, depth + 2, color);
    this.shrapnel(x, y, 8, { speed: radius * 2, size: 9, life: 520, depth: depth + 1, color: MAGNET.iron });
  }
}

// ── Per-frame painters ────────────────────────────────────────────────────
// Drawn into a Graphics the caller already owns, because they ride on live gameplay state: a
// coin's height, a spike's countdown, how fast a shard is still tumbling.

/**
 * A coin in the air. `z` is its height above the floor point `(x, y)`: the shadow stays on the
 * floor and shrinks as the coin climbs, which is the only thing that sells a top-down toss. A
 * held coin stops dead in a blue cradle of field lines.
 */
export function drawCoin(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  x: number, y: number, z: number, spin: number, hover: boolean, t: number, alpha = 1,
): void {
  const lift = Phaser.Math.Clamp(z / 130, 0, 1);
  g.fillStyle(tint(MAGNET.shadow), alpha * (0.45 - lift * 0.25));
  g.fillEllipse(x, y + 2, 14 - lift * 6, 5 - lift * 2);
  const cy = y - z;
  if (hover) {
    g.fillStyle(tint(MAGNET.blue), alpha * (0.2 + 0.08 * Math.sin(t * 6)));
    g.fillCircle(x, cy, 16);
    for (let i = 0; i < 3; i++) {
      const a = t * 1.6 + (i / 3) * TAU;
      g.fillStyle(tint(MAGNET.sky), alpha * 0.75);
      fieldArc(g, x + Math.cos(a) * 16, cy + Math.sin(a) * 16,
        x + Math.cos(a + 1.4) * 16, cy + Math.sin(a + 1.4) * 16, 5, 2.4, 10);
    }
    // A thin line down to the shadow, so a held coin still says where it is over the floor.
    g.lineStyle(1, tint(MAGNET.sky), alpha * 0.25);
    g.lineBetween(x, cy + 8, x, y);
  }
  const c = Math.cos(spin);
  const w = Math.max(1.6, 7 * Math.abs(c));
  g.fillStyle(tint(MAGNET.bronze), alpha);
  g.fillEllipse(x, cy, w * 2 + 2, 16);
  g.fillStyle(tint(c >= 0 ? MAGNET.gold : MAGNET.amber), alpha);
  g.fillEllipse(x, cy, w * 2, 14);
  if (w > 3) {
    g.lineStyle(1.2, tint(MAGNET.bronzeHi), alpha * 0.9);
    g.strokeEllipse(x, cy, w * 1.3, 9);
    g.fillStyle(tint(MAGNET.goldHi), alpha * 0.9);
    g.fillEllipse(x - w * 0.35, cy - 3, w * 0.5, 3.2);
  }
  // A glint runs over the rim as it turns edge-on.
  if (Math.abs(Math.sin(spin)) > 0.92) {
    g.fillStyle(tint(MAGNET.white), alpha * 0.9);
    g.fillCircle(x, cy - 6, 1.8);
  }
}

/** A coin that Repulse has fired: edge-on, with a gold streak and a field wake behind it. */
export function drawCoinShot(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  x: number, y: number, angle: number, t: number, alpha = 1,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  g.fillStyle(tint(MAGNET.gold), alpha * 0.28);
  fieldArc(g, x - cos * 34, y - sin * 34, x, y, 0, 7, 10);
  g.fillStyle(tint(MAGNET.sky), alpha * 0.4);
  fieldArc(g, x - cos * 24, y - sin * 24, x, y, 4, 3, 10);
  metalBar(g, tint, x, y, angle + Math.PI / 2, 12, 4, MAGNET.gold, alpha, false);
  g.fillStyle(tint(MAGNET.white), alpha * (0.6 + 0.4 * Math.sin(t * 40)));
  g.fillCircle(x, y, 1.6);
}

/**
 * A nail. In flight it is point-first; buried, it juts out of the victim with a faint field line
 * back to its owner (the tell that it can be pushed or ripped out); pulled out, it flies home
 * head-first in a blue halo — the colour that says "Repulse me now".
 */
export function drawNail(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  x: number, y: number, angle: number, state: 'fly' | 'stuck' | 'return',
  ownerX: number, ownerY: number, t: number, alpha = 1, golden = false,
): void {
  // R+ Nailstrom: golden nails — the metal itself is gold, the halos stay the same.
  const metal = golden ? MAGNET.gold : MAGNET.steel;
  if (state === 'stuck') {
    fieldArcLayered(g, tint, x, y, ownerX, ownerY, 22 * Math.sin(t * 2), 2.2, MAGNET.red, 0.28 * alpha);
    g.fillStyle(tint(MAGNET.rose), alpha * (0.22 + 0.14 * Math.sin(t * 7)));
    g.fillCircle(x, y, 9);
    ironNail(g, tint, x, y, angle, 16, metal, alpha);
    return;
  }
  if (state === 'return') {
    g.fillStyle(tint(MAGNET.blue), alpha * (0.2 + 0.1 * Math.sin(t * 12)));
    g.fillCircle(x, y, 14);
    g.fillStyle(tint(MAGNET.sky), alpha * 0.45);
    fieldArc(g, x - Math.cos(angle) * 28, y - Math.sin(angle) * 28, x, y, 4, 4, 10);
    ironNail(g, tint, x, y, angle + Math.PI, 18, golden ? MAGNET.goldHi : MAGNET.chrome, alpha);
    return;
  }
  g.fillStyle(tint(golden ? MAGNET.goldHi : MAGNET.steel), alpha * 0.25);
  fieldArc(g, x - Math.cos(angle) * 24, y - Math.sin(angle) * 24, x, y, 5, 4, 10);
  ironNail(g, tint, x, y, angle, 18, metal, alpha);
}

/**
 * The Steel Spike itself, standing upright: a tapered machined rod with a pommel cap and a blue
 * pole stud. `lift` is the height of its point above the floor point `(x, y)` — negative once
 * it has been driven in.
 */
export function drawSpike(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  x: number, y: number, lift: number, t: number, glow: number, alpha = 1,
): void {
  const len = 56, w = 6;
  const tipY = y - lift;
  const topY = tipY - len;
  if (glow > 0) {
    g.fillStyle(tint(MAGNET.sky), alpha * glow * (0.22 + 0.1 * Math.sin(t * 5)));
    g.fillCircle(x, topY + len * 0.3, 18);
  }
  g.fillStyle(tint(MAGNET.shadow), alpha);
  fillPts(g, [{ x: x - w - 1.5, y: topY - 1 }, { x: x + w + 1.5, y: topY - 1 }, { x: x + 1.5, y: tipY + 2 }, { x: x - 1.5, y: tipY + 2 }]);
  g.fillStyle(tint(MAGNET.iron), alpha);
  fillPts(g, [{ x: x - w, y: topY }, { x: x + w, y: topY }, { x, y: tipY }]);
  g.fillStyle(tint(MAGNET.chrome), alpha * 0.6);
  fillPts(g, [{ x: x - w, y: topY }, { x: x - w * 0.2, y: topY }, { x, y: tipY }]);
  g.lineStyle(1.2, tint(MAGNET.dark), alpha * 0.7);
  for (const k of [0.2, 0.38]) {
    const yy = topY + len * k;
    const hw = w * (1 - k);
    g.lineBetween(x - hw, yy, x + hw, yy);
  }
  g.fillStyle(tint(MAGNET.dark), alpha);
  g.fillRect(x - w - 3, topY - 6, (w + 3) * 2, 7);
  g.fillStyle(tint(MAGNET.plateHi), alpha);
  g.fillRect(x - w - 3, topY - 6, (w + 3) * 2, 2.5);
  g.fillStyle(tint(MAGNET.blue), alpha * (0.7 + 0.3 * Math.sin(t * 6)));
  g.fillCircle(x, topY - 3, 3);
}

/**
 * A spike hanging over its drop point. The shadow is the warning: a speck that swells to the
 * spike's full footprint over the two seconds, inside a dashed ring marking the shockwave.
 */
export function drawSpikeHover(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  x: number, y: number, p: number, radius: number, t: number, alpha = 1,
): void {
  const sw = 10 + p * 34;
  g.fillStyle(tint(MAGNET.shadow), alpha * (0.2 + 0.45 * p));
  g.fillEllipse(x, y, sw, sw * 0.42);
  const segs = 24;
  g.lineStyle(2, tint(MAGNET.sky), alpha * (0.15 + 0.5 * p));
  for (let i = 0; i < segs; i += 2) {
    const a0 = (i / segs) * TAU + t * 0.6;
    g.beginPath();
    g.arc(x, y, radius, a0, a0 + TAU / segs, false);
    g.strokePath();
  }
  const lift = 150 - 40 * p + Math.sin(t * 4) * 3;
  for (const s of [-1, 1]) {
    g.fillStyle(tint(MAGNET.sky), alpha * 0.3);
    fieldArc(g, x, y - lift - 50, x, y - 2, s * 14, 2.5, 14);
  }
  drawSpike(g, tint, x, y, lift, t, 0.6, alpha);
}

/** A spike driven into the floor. A pulsing ring while it can still be ridden (F again). */
export function drawSpikePlanted(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  x: number, y: number, t: number, zipReady: boolean, life: number, alpha = 1,
): void {
  const a = alpha * (life < 0.15 ? 0.5 + 0.5 * Math.abs(Math.sin(t * 10)) : 1);
  g.fillStyle(tint(MAGNET.shadow), a * 0.45);
  g.fillEllipse(x, y + 2, 34, 12);
  drawSpike(g, tint, x, y, -12, t, zipReady ? 1 : 0, a);
  g.fillStyle(tint(MAGNET.dark), a);
  g.fillEllipse(x, y, 20, 7);
  g.fillStyle(tint(MAGNET.plate), a * 0.8);
  for (const s of [-1, 1]) {
    fillPts(g, [{ x: x + s * 4, y: y - 1 }, { x: x + s * 13, y: y - 5 }, { x: x + s * 11, y: y + 3 }]);
  }
  if (zipReady) {
    const p = (t * 0.9) % 1;
    const r = 30 + p * 26;
    g.lineStyle(2, tint(MAGNET.sky), a * 0.6 * (1 - p));
    g.strokeEllipse(x, y, r, r * 0.4);
  }
}

/** A spike Repulse has launched: point-first along its heading, with a field wake behind it. */
export function drawSpikeFlying(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  x: number, y: number, angle: number, alpha = 1,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const at = (lx: number, ly: number): Pt => ({ x: x + lx * cos - ly * sin, y: y + lx * sin + ly * cos });
  g.fillStyle(tint(MAGNET.sky), alpha * 0.3);
  fieldArc(g, x - cos * 80, y - sin * 80, x, y, 0, 14, 12);
  g.fillStyle(tint(MAGNET.white), alpha * 0.35);
  fieldArc(g, x - cos * 50, y - sin * 50, x, y, 0, 5, 12);
  g.fillStyle(tint(MAGNET.shadow), alpha);
  fillPts(g, [at(-30, -7.5), at(30, 0), at(-30, 7.5)]);
  g.fillStyle(tint(MAGNET.iron), alpha);
  fillPts(g, [at(-29, -6), at(28, 0), at(-29, 6)]);
  g.fillStyle(tint(MAGNET.chrome), alpha * 0.6);
  fillPts(g, [at(-29, -6), at(28, 0), at(-29, -1)]);
  g.fillStyle(tint(MAGNET.dark), alpha);
  fillPts(g, [at(-35, -9), at(-29, -9), at(-29, 9), at(-35, 9)]);
  const c = at(-32, 0);
  g.fillStyle(tint(MAGNET.blue), alpha);
  g.fillCircle(c.x, c.y, 2.6);
}

/**
 * A shard of scrap: a torn five-cornered plate, jittered per `seed` so each one keeps its own
 * silhouette. On the floor it lies in its shadow and glints now and then; in orbit it sits in a
 * blue field and its torn edge lights up.
 */
export function drawScrap(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  x: number, y: number, angle: number, size: number, seed: number,
  mode: 'fly' | 'ground' | 'orbit', t: number, alpha = 1,
): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 5; i++) {
    const a = angle + (i / 5) * TAU;
    const r = size * (0.55 + (((seed + i) * 0.618) % 1) * 0.55);
    pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.85 });
  }
  if (mode === 'orbit') {
    g.fillStyle(tint(MAGNET.blue), alpha * (0.2 + 0.1 * Math.sin(t * 6 + seed)));
    g.fillCircle(x, y, size * 1.6);
  } else if (mode === 'ground') {
    g.fillStyle(tint(MAGNET.shadow), alpha * 0.35);
    g.fillEllipse(x, y + size * 0.6, size * 2, size * 0.7);
  }
  g.fillStyle(tint(MAGNET.oil), alpha);
  fillPts(g, pts.map((p) => ({ x: x + (p.x - x) * 1.2, y: y + (p.y - y) * 1.2 })));
  g.fillStyle(tint(seed % 3 === 0 ? MAGNET.gunMid : MAGNET.gunHi), alpha);
  fillPts(g, pts);
  g.lineStyle(1.3, tint(mode === 'orbit' ? MAGNET.neon : MAGNET.plateHi), alpha * 0.9);
  strokePts(g, [pts[0], pts[1], pts[2]]);
  g.fillStyle(tint(MAGNET.plate), alpha);
  g.fillCircle(x + Math.cos(angle) * size * 0.2, y + Math.sin(angle) * size * 0.2, Math.max(1, size * 0.16));
  if (mode === 'ground' && Math.sin(t * 2.4 + seed * 3) > 0.96) {
    g.fillStyle(tint(MAGNET.white), alpha);
    g.fillCircle(pts[1].x, pts[1].y, 1.5);
  }
}

/** The ring orbiting scrap rides on, marked so it reads even between shards. */
export function drawOrbitRing(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  x: number, y: number, r: number, t: number, alpha = 1,
): void {
  g.lineStyle(1.2, tint(MAGNET.sky), 0.3 * alpha);
  g.strokeCircle(x, y, r);
  for (let i = 0; i < 4; i++) {
    const a = -t * 1.2 + (i / 4) * TAU;
    g.fillStyle(tint(MAGNET.azure), 0.4 * alpha);
    fieldArc(g, x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a + 0.8) * r, y + Math.sin(a + 0.8) * r, r * 0.14, 2.6, 10);
  }
}

/** Mecha Massacre's wind-up: a pile of scrap building up round the caster, and a closing ring. */
export function drawGatherPile(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  x: number, y: number, p: number, t: number, alpha = 1,
): void {
  g.fillStyle(tint(MAGNET.blue), alpha * (0.12 + 0.18 * p));
  g.fillCircle(x, y, 30 + p * 16);
  const n = Math.floor(3 + p * 15);
  for (let i = 0; i < n; i++) {
    const a = i * 2.399 + t * (0.6 + (i % 3) * 0.2);
    const r = 18 + ((i * 0.37) % 1) * (10 + p * 18);
    drawScrap(g, tint, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, a * 1.7, 4 + (i % 4), i, 'orbit', t, alpha * 0.95);
  }
  g.lineStyle(3, tint(MAGNET.neon), alpha * 0.85);
  g.beginPath();
  g.arc(x, y, 48, -Math.PI / 2, -Math.PI / 2 + p * TAU, false);
  g.strokePath();
}

// ── Shop upgrade art ────────────────────────────────────────────────────

/**
 * E+ Magnetize, on a body: the field has taken hold of them. A red arc and a blue arc chase each
 * other round the body in opposite directions, iron filings ride the field, and a little N/S
 * stud pair hangs over the head. `life` (1 → 0) thins it out as it wears off.
 */
export function drawMagnetized(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  x: number, y: number, r: number, t: number, life: number, alpha = 1,
): void {
  const a = alpha * (life < 0.2 ? 0.45 + 0.55 * Math.abs(Math.sin(t * 9)) : 1);
  const R = r + 9;
  g.fillStyle(tint(MAGNET.blue), a * 0.1);
  g.fillCircle(x, y, R + 4);
  for (const [col, dir, off] of [[MAGNET.red, 1, 0], [MAGNET.blue, -1, Math.PI]] as Array<[number, number, number]>) {
    const s0 = t * 2.6 * dir + off;
    g.lineStyle(2.6, tint(col), a * 0.85);
    g.beginPath();
    g.arc(x, y, R, s0, s0 + 1.9, false);
    g.strokePath();
    g.lineStyle(6, tint(col), a * 0.18);
    g.beginPath();
    g.arc(x, y, R, s0, s0 + 1.9, false);
    g.strokePath();
  }
  // Filings strung along the field, standing on end.
  for (let i = 0; i < 10; i++) {
    const ang = i * 0.628 - t * 1.1;
    const rr = R + 3 + Math.sin(t * 3 + i) * 3;
    const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr;
    g.lineStyle(1.4, tint(MAGNET.iron), a * 0.85);
    g.lineBetween(px - Math.cos(ang) * 2.5, py - Math.sin(ang) * 2.5, px + Math.cos(ang) * 2.5, py + Math.sin(ang) * 2.5);
  }
  const hy = y - r - 16 + Math.sin(t * 4) * 1.5;
  g.fillStyle(tint(MAGNET.red), a);
  g.fillRect(x - 7, hy - 3, 7, 6);
  g.fillStyle(tint(MAGNET.blue), a);
  g.fillRect(x, hy - 3, 7, 6);
  g.lineStyle(1, tint(MAGNET.chrome), a * 0.8);
  g.strokeRect(x - 7, hy - 3, 14, 6);
}

/**
 * A homing lock: the faint field line from a magnetised shot to the magnetised body it has
 * locked onto. Only drawn for perfect locks, so the player can see the "two magnets" rule work.
 */
export function drawLockLine(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  x1: number, y1: number, x2: number, y2: number, t: number, alpha = 1,
): void {
  const d = Math.hypot(x2 - x1, y2 - y1);
  if (d < 4) return;
  const n = Math.max(2, Math.floor(d / 16));
  const crawl = (t * 3) % 1;
  for (let i = 0; i < n; i++) {
    const f0 = (i + crawl) / n, f1 = Math.min(1, f0 + 0.45 / n);
    g.lineStyle(1.4, tint(i % 2 === 0 ? MAGNET.sky : MAGNET.rose), alpha * 0.5 * (1 - f0 * 0.6));
    g.lineBetween(x1 + (x2 - x1) * f0, y1 + (y2 - y1) * f0, x1 + (x2 - x1) * f1, y1 + (y2 - y1) * f1);
  }
}

/** A magnetised projectile's halo: a thin pole ring round it, so a homing shot reads as one. */
export function drawMagnetHalo(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  x: number, y: number, r: number, t: number, alpha = 1,
): void {
  const s0 = t * 9;
  g.lineStyle(1.6, tint(MAGNET.red), alpha * 0.75);
  g.beginPath(); g.arc(x, y, r, s0, s0 + 1.4, false); g.strokePath();
  g.lineStyle(1.6, tint(MAGNET.blue), alpha * 0.75);
  g.beginPath(); g.arc(x, y, r, s0 + Math.PI, s0 + Math.PI + 1.4, false); g.strokePath();
}

/**
 * Click+ Shatter Shot: one fragment of a coin that burst on the wall — a jagged gold wedge,
 * point-first, with a short gold streak behind it.
 */
export function drawCoinFragment(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  x: number, y: number, angle: number, seed: number, alpha = 1,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const at = (lx: number, ly: number): Pt => ({ x: x + lx * cos - ly * sin, y: y + lx * sin + ly * cos });
  g.fillStyle(tint(MAGNET.goldHi), alpha * 0.3);
  fieldArc(g, x - cos * 18, y - sin * 18, x, y, 0, 3, 8);
  const k = 0.75 + (seed % 5) * 0.08;
  g.fillStyle(tint(MAGNET.bronze), alpha);
  fillPts(g, [at(-5 * k, -4.5 * k), at(6 * k, 0), at(-5 * k, 4.5 * k), at(-2.5 * k, 0)]);
  g.fillStyle(tint(seed % 2 === 0 ? MAGNET.gold : MAGNET.amber), alpha);
  fillPts(g, [at(-4 * k, -3.4 * k), at(5 * k, 0), at(-4 * k, 3.4 * k), at(-1.8 * k, 0)]);
  g.fillStyle(tint(MAGNET.white), alpha * 0.8);
  g.fillCircle(at(2 * k, -0.6).x, at(2 * k, -0.6).y, 1);
}

/**
 * F+ Electromagnet: live current crawling over a spike or shard. A few short kinked arcs that
 * re-roll every frame around the point, inside a cyan glow. `size` is the radius it plays over.
 */
export function drawCrackle(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  x: number, y: number, size: number, t: number, alpha = 1, arcs = 3,
): void {
  g.fillStyle(tint(MAGNET.live), alpha * (0.12 + 0.08 * Math.sin(t * 17)));
  g.fillCircle(x, y, size * 1.1);
  for (let i = 0; i < arcs; i++) {
    if (Math.random() < 0.35) continue;
    const a0 = Math.random() * TAU;
    const pts: Pt[] = [];
    for (let k = 0; k < 4; k++) {
      const a = a0 + k * 0.45;
      const r = size * (0.45 + Math.random() * 0.6);
      pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
    }
    g.lineStyle(1.6, tint(MAGNET.live), alpha * 0.9);
    strokePts(g, pts);
    g.lineStyle(0.8, tint(MAGNET.white), alpha);
    strokePts(g, pts);
  }
}

/**
 * F+ Electromagnet: riding a live spike leaves you charged — a ring of current round your body
 * with bolts jumping off it, and a speed shimmer at your feet.
 */
export function drawChargedAura(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  x: number, y: number, r: number, t: number, life: number, alpha = 1,
): void {
  const a = alpha * (life < 0.2 ? 0.4 + 0.6 * Math.abs(Math.sin(t * 10)) : 1);
  g.fillStyle(tint(MAGNET.live), a * (0.08 + 0.05 * Math.sin(t * 8)));
  g.fillCircle(x, y, r);
  g.lineStyle(1.4, tint(MAGNET.live), a * 0.45);
  g.strokeCircle(x, y, r);
  const segs = 28;
  const pts: Pt[] = [];
  for (let i = 0; i <= segs; i++) {
    const ang = (i / segs) * TAU;
    const rr = r * 0.42 + (Math.random() - 0.5) * 6;
    pts.push({ x: x + Math.cos(ang) * rr, y: y + Math.sin(ang) * rr });
  }
  g.lineStyle(2, tint(MAGNET.live), a * 0.8);
  strokePts(g, pts);
  g.lineStyle(0.8, tint(MAGNET.white), a * 0.9);
  strokePts(g, pts);
  drawCrackle(g, tint, x, y, r * 0.6, t, a * 0.8, 2);
  // Streaks behind the feet.
  g.lineStyle(1.2, tint(MAGNET.spark), a * 0.5);
  for (let i = 0; i < 3; i++) {
    const ox = (i - 1) * 9;
    const p = (t * 4 + i * 0.33) % 1;
    g.lineBetween(x + ox, y + 18 + p * 10, x + ox, y + 26 + p * 10);
  }
}

/**
 * Mastery — Magnetic Field: the faint blue field the mastered magnet carries. Barely there on
 * purpose — a wash, a thin rim, and two slow pole arcs going round it — so it reads as a
 * property of the body rather than another effect on the floor.
 */
export function drawMagneticField(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  x: number, y: number, r: number, t: number, alpha = 1,
): void {
  g.fillStyle(tint(MAGNET.blue), alpha * (0.045 + 0.015 * Math.sin(t * 2.2)));
  g.fillCircle(x, y, r);
  g.lineStyle(1, tint(MAGNET.sky), alpha * 0.14);
  g.strokeCircle(x, y, r);
  const s0 = t * 0.9;
  g.lineStyle(1.6, tint(MAGNET.sky), alpha * 0.22);
  g.beginPath(); g.arc(x, y, r - 3, s0, s0 + 0.9, false); g.strokePath();
  g.beginPath(); g.arc(x, y, r - 3, s0 + Math.PI, s0 + Math.PI + 0.9, false); g.strokePath();
}

/** The field turning one shot aside: a short blue flick along the shot's new line. */
export function drawFieldFlick(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  x: number, y: number, angle: number, k: number,
): void {
  const len = 16 * (1 - k);
  g.lineStyle(2, tint(MAGNET.sky), 0.7 * (1 - k));
  g.lineBetween(x - Math.cos(angle) * len, y - Math.sin(angle) * len, x + Math.cos(angle) * len * 0.4, y + Math.sin(angle) * len * 0.4);
  g.lineStyle(1, tint(MAGNET.chrome), 0.8 * (1 - k));
  g.strokeCircle(x, y, 3 + 6 * k);
}

/**
 * Mastery — Mag-Lev: a run of magnetised floor, painted as a maglev track. A dull red bed under
 * every patch, two crimson rails laid along the run with dark cross-ties, a bright pulse riding
 * the rails, and red current crackling over the top. `life` (1 → 0) per point flickers a stretch
 * in its last fifth, so the player can see the ground about to go dead.
 */
export function drawMagTrack(
  g: Phaser.GameObjects.Graphics, tint: MagnetColorFn,
  pts: ReadonlyArray<{ x: number; y: number; life: number; seed: number }>, r: number, t: number, alpha = 1,
): void {
  if (pts.length === 0) return;
  const fade = (p: { life: number; seed: number }): number =>
    alpha * Math.min(1, p.life * 8) * (p.life < 0.2 ? 0.4 + 0.6 * Math.abs(Math.sin(t * 11 + p.seed)) : 1);
  // The bed: a red glow with a scorched core.
  for (const p of pts) {
    const a = fade(p);
    g.fillStyle(tint(MAGNET.red), a * (0.15 + 0.04 * Math.sin(t * 5 + p.seed)));
    g.fillCircle(p.x, p.y, r);
    g.fillStyle(tint(MAGNET.shadow), a * 0.22);
    g.fillCircle(p.x, p.y, r * 0.68);
  }
  // Rails and ties along the run.
  const rail = r * 0.42;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const a = Math.min(fade(p0), fade(p1));
    const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const nx = -Math.sin(ang) * rail, ny = Math.cos(ang) * rail;
    const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
    g.lineStyle(2.4, tint(MAGNET.dark), a * 0.8);
    g.lineBetween(mx - nx * 1.3, my - ny * 1.3, mx + nx * 1.3, my + ny * 1.3);
    for (const k of [-1, 1]) {
      g.lineStyle(3.2, tint(MAGNET.red), a * 0.9);
      g.lineBetween(p0.x + nx * k, p0.y + ny * k, p1.x + nx * k, p1.y + ny * k);
      g.lineStyle(1, tint(MAGNET.blush), a * 0.75);
      g.lineBetween(p0.x + nx * k, p0.y + ny * k, p1.x + nx * k, p1.y + ny * k);
    }
    // The pulse: a hot bead running the rails from the near end to the far.
    const u = (t * 2.4 - i * 0.18) % 1;
    const ux = Phaser.Math.Linear(p0.x, p1.x, u < 0 ? u + 1 : u), uy = Phaser.Math.Linear(p0.y, p1.y, u < 0 ? u + 1 : u);
    g.fillStyle(tint(MAGNET.blush), a * 0.85);
    g.fillCircle(ux + nx, uy + ny, 1.8);
    g.fillCircle(ux - nx, uy - ny, 1.8);
  }
  if (pts.length === 1) {
    const p = pts[0];
    g.lineStyle(2.4, tint(MAGNET.red), fade(p) * 0.8);
    g.strokeCircle(p.x, p.y, rail);
  }
  // Current crackling over the top, re-rolled every frame.
  for (const p of pts) {
    const a = fade(p);
    if (Math.random() < 0.45) continue;
    const a0 = Math.random() * TAU;
    const line: Pt[] = [];
    for (let k = 0; k < 4; k++) {
      const ang = a0 + k * 0.5;
      const rr = r * (0.3 + Math.random() * 0.6);
      line.push({ x: p.x + Math.cos(ang) * rr, y: p.y + Math.sin(ang) * rr });
    }
    g.lineStyle(1.8, tint(MAGNET.rose), a * 0.85);
    strokePts(g, line);
    g.lineStyle(0.8, tint(MAGNET.white), a * 0.9);
    strokePts(g, line);
  }
}

/**
 * Q+ Mega Mechancements: the mech's palette turned from cobalt to crimson. Everything the mech
 * paints in its blues (plate, trim, visor, the current in its rail) is swapped for a matching red
 * before the owner's skin is applied; the rest of the palette passes through.
 */
const MEGA_RED: Record<number, number> = {
  [MAGNET.gun]: 0x22131a,
  [MAGNET.gunMid]: 0x3a1c24,
  [MAGNET.gunHi]: 0x5c2a33,
  [MAGNET.cobalt]: 0xc41c34,
  [MAGNET.neon]: 0xff4f5e,
  [MAGNET.visor]: 0xffa08f,
  [MAGNET.blue]: 0xff3344,
  [MAGNET.azure]: 0xcc4455,
  [MAGNET.sky]: 0xff9a88,
  [MAGNET.live]: 0xff7766,
  [MAGNET.spark]: 0xffd8c8,
  [MAGNET.plateHi]: 0xd8a0a0,
};

export function megaMechTint(tint: MagnetColorFn): MagnetColorFn {
  return (base) => tint(MEGA_RED[base] ?? base);
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
 * The magnet character rig: a plain crimson orb (the baked `elem-magnet` texture), one north
 * hand and one south hand, a pair of eyes, and one accessory — the element's emblem, a
 * **horseshoe magnet** crowning the head with the field jumping its gap.
 *
 * The two-tone hands are the whole idea. Every other element's rig has a matched pair; this one
 * is *polarised*, and that asymmetry is readable at a glance even before it casts anything.
 *
 * Mastery (Metal Detector) enhances what is there: a bigger horseshoe with an amber charge
 * glowing behind it, amber eyes, and a wider corona with an amber rim on each hand.
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
   * Mastery tell — Metal Detector: amber eyes, a wider corona and an amber rim on each hand,
   * and (in `drawExtras`) a bigger, charged horseshoe. Shape changes, not just tints — a tint
   * alone vanishes at gameplay zoom.
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

  /** A soft under-glow in the owner's accent, amber once mastered. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const k = this.intensity * (this.mastered ? 1.15 : 1);
    g.fillStyle(this.tint(this.mastered ? MAGNET.amber : this.accent), a * (this.mastered ? 0.2 : 0.14) * k);
    g.fillCircle(x, y, 28 * k);
  }

  /**
   * Scrap-built body detail: a riveted iron belt round the lower half of the orb, a bolted-on
   * patch plate to one side, and faint iron-filing field lines curving pole to pole between
   * the hands' sides. Mastered, the belt is gilded and a gold N/S pole stud sits at each end.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const A = alpha;
    const m = this.mastered;
    // Iron filings: short dashes laid along two arcs below the eyes.
    g.lineStyle(1, this.tint(MAGNET.shadow), A * 0.45);
    for (let r = 0; r < 2; r++) {
      const ry = 4 + r * 4;
      for (let i = 0; i < 7; i++) {
        const u = (i + 0.5) / 7;
        const ang = Math.PI * (0.15 + u * 0.7);
        const px = x - Math.cos(ang) * (14 - r * 3), py = y + ry + Math.sin(ang) * 3 - 3;
        const tang = ang + Math.PI / 2;
        g.lineBetween(px - Math.cos(tang) * 1.4, py - Math.sin(tang) * 1.1, px + Math.cos(tang) * 1.4, py + Math.sin(tang) * 1.1);
      }
    }
    // The belt: a curved band across the lower body.
    const by = y + 12;
    g.lineStyle(4.4, this.tint(m ? MAGNET.bronze : MAGNET.dark), A);
    g.beginPath(); g.arc(x, by - 22, 26, Math.PI * 0.28, Math.PI * 0.72, false); g.strokePath();
    g.lineStyle(1.4, this.tint(m ? MAGNET.goldHi : MAGNET.iron), A * 0.9);
    g.beginPath(); g.arc(x, by - 23.4, 26, Math.PI * 0.3, Math.PI * 0.7, false); g.strokePath();
    g.fillStyle(this.tint(m ? MAGNET.gold : MAGNET.steel), A);
    for (let i = 0; i < 5; i++) {
      const ang = Math.PI * (0.32 + i * 0.09);
      g.fillCircle(x + Math.cos(ang) * 26, by - 22 + Math.sin(ang) * 26, 1.1);
    }
    // The patch plate, bolted on at a slant.
    const px = x + 10, py = y + 3;
    g.fillStyle(this.tint(MAGNET.plate), A * 0.95);
    fillPts(g, [{ x: px - 3, y: py - 3 }, { x: px + 4, y: py - 2 }, { x: px + 3.4, y: py + 4 }, { x: px - 3.6, y: py + 3 }]);
    g.fillStyle(this.tint(MAGNET.plateHi), A);
    g.fillCircle(px - 2, py - 1.8, 0.8);
    g.fillCircle(px + 2.6, py + 2.6, 0.8);
    if (m) {
      // Pole studs: crimson N on the left, cobalt S on the right, both gold-set.
      for (const [sx, c] of [[-1, MAGNET.red], [1, MAGNET.blue]] as const) {
        const ang = Math.PI * (sx < 0 ? 0.74 : 0.26);
        const hx = x + Math.cos(ang) * 26, hy = by - 22 + Math.sin(ang) * 26;
        g.fillStyle(this.tint(MAGNET.gold), A); g.fillCircle(hx, hy, 3.2);
        g.fillStyle(this.tint(c), A); g.fillCircle(hx, hy, 2);
      }
    }
  }

  /**
   * The crown: a horseshoe magnet sat over the head, rocking gently, with the field jumping its
   * poles. Rooted low enough that the yoke clears the health bar and the legs stop above the eyes.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const m = this.mastered;
    const size = (m ? 18 : 15) * this.intensity;
    // Legs end just above the eyes whatever the size, so a bigger magnet grows upward.
    const rootY = y - 13 - size * 0.5;
    const rock = Math.sin(this.t * 1.8) * 0.16;
    if (m) {
      // Charged: an amber glow behind the horseshoe, pulsing with the detector's ping.
      g.fillStyle(this.tint(MAGNET.amber), alpha * (0.22 + 0.1 * Math.sin(this.t * 5)));
      g.fillCircle(x, rootY - size * 0.08, size * 0.75);
    }
    void a;
    // Mastered: five gold coins held in orbit round the head on a tilted field ring, the back
    // half dimmed so the ring reads as going round behind the magnet.
    const ring = (front: boolean) => {
      if (!m) return;
      for (let i = 0; i < 5; i++) {
        const oa = this.t * 1.5 + (i / 5) * TAU;
        const isFront = Math.sin(oa) > 0;
        if (isFront !== front) continue;
        const ox = x + Math.cos(oa) * 24, oy = rootY + 2 + Math.sin(oa) * 7;
        const al = alpha * (front ? 1 : 0.55);
        const w = Math.max(1, 4.2 * Math.abs(Math.cos(this.t * 3 + i * 1.3)));
        g.fillStyle(this.tint(MAGNET.bronze), al);
        g.fillEllipse(ox, oy, w * 2 + 1.4, 9.4);
        g.fillStyle(this.tint(MAGNET.gold), al);
        g.fillEllipse(ox, oy, w * 2, 8.2);
        g.fillStyle(this.tint(MAGNET.goldHi), al * 0.9);
        g.fillEllipse(ox - w * 0.3, oy - 1.6, w * 0.6, 2);
      }
    };
    if (m) {
      g.lineStyle(1.2, this.tint(MAGNET.gold), alpha * 0.4);
      g.strokeEllipse(x, rootY + 2, 48, 14);
    }
    ring(false);
    horseshoe(g, this.tint, x, rootY, rock, size, alpha, this.t);
    ring(true);
  }
}
