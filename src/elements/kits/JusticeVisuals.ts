import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Justice draws: the magistrate/valkyrie character rig, the persistent world
 * objects (the Coliseum ring, the flame pillar, the ripped-out wall, the seraph), and the
 * one-shot effects behind each ability.
 *
 * Justice is gold and marble on the ground and cold blue in the air — the palette below is
 * the whole vocabulary, and every draw call routes a colour through the owner's mapper so a
 * future skin only has to remap these keys.
 */

export type JusticeColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const JUS = {
  /** Deep shadow under gilt — the outline colour for anything metal. */
  umber: 0x2b2010,
  bronze: 0x7d5f22,
  gold: 0xc9a13a,
  bright: 0xf0d68a,
  pale: 0xfff3cf,
  white: 0xffffff,
  /** Coliseum stone. */
  marble: 0xe6e1d2,
  stone: 0x9c9382,
  stoneDark: 0x5d564a,
  /** Willpower blue — Sheer Will's eyes, aura and afterimage. */
  will: 0x2f7bff,
  willPale: 0xa8ccff,
  willDeep: 0x0b2a6b,
  /** Pillar of Flame. */
  flame: 0xff7a1f,
  flameCore: 0xffd24a,
  flameDeep: 0x8e2a05,
  /** The verdict itself. */
  damned: 0xff3344,
} as const;

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * A spear: tapered haft, a flared crossguard a third of the way up, and a leaf-shaped head.
 * Drawn nose-first from `(cx, cy)` along `angle`, so the caller positions the *butt* of it.
 * This is the shape behind the stab, the thrown spear and the one the rig holds.
 */
export function spearShape(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  cx: number, cy: number,
  angle: number, len: number,
  alpha = 1,
  scale = 1,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  const at = (d: number, off = 0) => ({ x: cx + cos * d + px * off, y: cy + sin * d + py * off });

  const haftW = 1.9 * scale;
  const headLen = Math.min(len * 0.3, 21 * scale);
  const shaftLen = len - headLen;

  // Haft — two tones so it reads as a round pole rather than a line.
  const a = at(0, -haftW), b = at(shaftLen, -haftW);
  const c = at(shaftLen, haftW), d = at(0, haftW);
  g.fillStyle(tint(JUS.bronze), alpha);
  g.fillPoints([a, b, c, d].map((p) => new Phaser.Geom.Point(p.x, p.y)), true);
  const hl0 = at(0, -haftW * 0.35), hl1 = at(shaftLen, -haftW * 0.35);
  g.lineStyle(haftW * 0.6, tint(JUS.bright), alpha * 0.6);
  g.lineBetween(hl0.x, hl0.y, hl1.x, hl1.y);

  // Crossguard — two swept wings at the base of the head.
  const gRoot = at(shaftLen - 2 * scale);
  const gL = at(shaftLen - 7 * scale, -6.5 * scale);
  const gR = at(shaftLen - 7 * scale, 6.5 * scale);
  g.fillStyle(tint(JUS.gold), alpha);
  g.fillTriangle(gRoot.x, gRoot.y, gL.x, gL.y, at(shaftLen + 1 * scale, -1.2 * scale).x, at(shaftLen + 1 * scale, -1.2 * scale).y);
  g.fillTriangle(gRoot.x, gRoot.y, gR.x, gR.y, at(shaftLen + 1 * scale, 1.2 * scale).x, at(shaftLen + 1 * scale, 1.2 * scale).y);

  // Leaf head — widest a third of the way along, pinched to the point.
  const base = at(shaftLen);
  const wide = at(shaftLen + headLen * 0.34, 0);
  const wl = at(shaftLen + headLen * 0.34, -4.2 * scale);
  const wr = at(shaftLen + headLen * 0.34, 4.2 * scale);
  const tip = at(len);
  g.fillStyle(tint(JUS.gold), alpha);
  g.fillPoints([
    new Phaser.Geom.Point(base.x, base.y),
    new Phaser.Geom.Point(wl.x, wl.y),
    new Phaser.Geom.Point(tip.x, tip.y),
    new Phaser.Geom.Point(wr.x, wr.y),
  ], true);
  // Fuller down the middle of the blade — the difference between a triangle and a spearhead.
  g.lineStyle(1.1 * scale, tint(JUS.pale), alpha * 0.85);
  g.lineBetween(base.x, base.y, tip.x, tip.y);
  g.fillStyle(tint(JUS.pale), alpha * 0.9);
  g.fillCircle(wide.x, wide.y, 1.1 * scale);
}

/**
 * A run of interlocking chain links between two points. Alternating links are drawn
 * edge-on (a short bar) so the run reads as a twisted chain rather than a string of beads.
 */
export function chainRun(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  x1: number, y1: number, x2: number, y2: number,
  alpha = 1,
  linkLen = 11,
  thick = 2.2,
  sag = 0,
): void {
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return;
  const n = Math.max(1, Math.round(dist / linkLen));
  const ang = Math.atan2(dy, dx);
  const px = -Math.sin(ang), py = Math.cos(ang);

  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    // Catenary-ish droop, strongest at the middle of the run.
    const droop = sag * Math.sin(t * Math.PI);
    const cx = x1 + dx * t + px * droop;
    const cy = y1 + dy * t + py * droop;
    const flat = i % 2 === 0;
    g.lineStyle(thick, tint(JUS.umber), alpha);
    if (flat) g.strokeEllipse(cx, cy, linkLen * 0.95, thick * 2.6);
    else g.strokeEllipse(cx, cy, linkLen * 0.45, thick * 3.4);
    g.lineStyle(thick * 0.5, tint(JUS.gold), alpha);
    if (flat) g.strokeEllipse(cx, cy - thick * 0.4, linkLen * 0.9, thick * 2.2);
    else g.strokeEllipse(cx - thick * 0.3, cy, linkLen * 0.4, thick * 3);
  }
}

/**
 * A padlock — the tell that a chain is a *sentence* and not just a rope. Drawn upright
 * regardless of the chain's angle, because a lock hangs.
 */
export function padlock(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  x: number, y: number, r: number, alpha = 1,
): void {
  g.lineStyle(r * 0.34, tint(JUS.bronze), alpha);
  g.beginPath();
  g.arc(x, y - r * 0.55, r * 0.5, Math.PI, 0);
  g.strokePath();
  g.fillStyle(tint(JUS.gold), alpha);
  g.fillRoundedRect(x - r * 0.75, y - r * 0.35, r * 1.5, r * 1.35, r * 0.28);
  g.fillStyle(tint(JUS.umber), alpha);
  g.fillCircle(x, y + r * 0.25, r * 0.24);
}

/** One coliseum column: a fluted marble drum with a lit face and a capital. */
export function column(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  x: number, y: number, h: number, w: number, alpha = 1,
): void {
  const half = w / 2;
  g.fillStyle(tint(JUS.stoneDark), alpha);
  g.fillEllipse(x, y + 2, w * 1.25, w * 0.5);
  g.fillStyle(tint(JUS.stone), alpha);
  g.fillRect(x - half, y - h, w, h);
  g.fillStyle(tint(JUS.marble), alpha);
  g.fillRect(x - half, y - h, w * 0.45, h);
  // Flutes.
  g.lineStyle(1, tint(JUS.stoneDark), alpha * 0.55);
  g.lineBetween(x - half * 0.15, y - h + 3, x - half * 0.15, y - 3);
  g.lineBetween(x + half * 0.45, y - h + 3, x + half * 0.45, y - 3);
  // Capital + base.
  g.fillStyle(tint(JUS.marble), alpha);
  g.fillRect(x - half * 1.4, y - h - w * 0.42, w * 1.4, w * 0.42);
  g.fillRect(x - half * 1.3, y - w * 0.3, w * 1.3, w * 0.3);
  g.fillStyle(tint(JUS.gold), alpha * 0.5);
  g.fillRect(x - half * 1.4, y - h - w * 0.42, w * 1.4, w * 0.12);
}

/** A single feathered wing, rooted at the shoulder and swept back along `angle`. */
export function wing(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  x: number, y: number,
  angle: number, span: number, side: number,
  alpha = 1,
  spread = 1,
): void {
  const feathers = 6;
  for (let i = 0; i < feathers; i++) {
    const f = i / (feathers - 1);
    const a = angle + side * (0.42 + f * 0.95 * spread);
    const len = span * (1 - f * 0.42) * (0.72 + spread * 0.34);
    const tipX = x + Math.cos(a) * len;
    const tipY = y + Math.sin(a) * len;
    const w = span * 0.13 * (1 - f * 0.35);
    const px = -Math.sin(a), py = Math.cos(a);
    g.fillStyle(tint(i % 2 === 0 ? JUS.pale : JUS.marble), alpha * (0.9 - f * 0.2));
    g.fillTriangle(
      x + px * w, y + py * w,
      x - px * w, y - py * w,
      tipX, tipY,
    );
    g.fillCircle(tipX, tipY, w * 0.5);
  }
  // Leading edge, so the wing has a shoulder instead of fanning from a point.
  g.lineStyle(2.4, tint(JUS.gold), alpha * 0.8);
  g.lineBetween(x, y, x + Math.cos(angle + side * 0.42) * span * 0.75, y + Math.sin(angle + side * 0.42) * span * 0.75);
}

/** A seraph eye — lidded almond, iris, and a hard pinprick pupil. */
export function seraphEye(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  x: number, y: number, r: number, look: number, alpha = 1, open = 1,
): void {
  g.fillStyle(tint(JUS.white), alpha * 0.96);
  g.fillEllipse(x, y, r * 2, r * 2 * open);
  g.fillStyle(tint(JUS.gold), alpha);
  g.fillCircle(x + Math.cos(look) * r * 0.32, y + Math.sin(look) * r * 0.32 * open, r * 0.55 * Math.max(open, 0.15));
  g.fillStyle(tint(JUS.umber), alpha);
  g.fillCircle(x + Math.cos(look) * r * 0.45, y + Math.sin(look) * r * 0.45 * open, r * 0.24 * Math.max(open, 0.15));
  g.lineStyle(r * 0.16, tint(JUS.bronze), alpha * 0.8);
  g.strokeEllipse(x, y, r * 2, r * 2 * open);
}

/** Rising tongue of flame for the pillar — narrow, licking, and always pointed up. */
export function flameLick(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, len: number, halfW: number, lean: number,
): void {
  g.beginPath();
  g.moveTo(cx - halfW, cy);
  g.lineTo(cx - halfW * 0.55 + lean * 0.4, cy - len * 0.55);
  g.lineTo(cx + lean, cy - len);
  g.lineTo(cx + halfW * 0.55 + lean * 0.4, cy - len * 0.55);
  g.lineTo(cx + halfW, cy);
  g.closePath();
  g.fillPath();
  g.fillCircle(cx, cy, halfW * 0.9);
}

// ── JusticeFx ─────────────────────────────────────────────────────────────

/** One-shot Justice effects. One per owner so a skin recolours the right side. */
export class JusticeFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: JusticeColorFn = (c) => c) {
    super(scene, tint);
  }

  flash(x: number, y: number, radius: number, depth = 7): void {
    this.flashIn(x, y, radius, JUS.white, JUS.pale, depth);
  }

  /** Expanding gilt ring — the punctuation on every Justice impact. */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration = 420, width = 4, depth = 6): void {
    const c = this.tint(color);
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      g.lineStyle(Math.max(0.5, width * (1 - t)), c, 0.9 * (1 - t * t));
      g.strokeCircle(x, y, r);
      g.lineStyle(Math.max(0.4, width * 0.4 * (1 - t)), this.tint(JUS.pale), 0.7 * (1 - t));
      g.strokeCircle(x, y, r * 0.86);
    });
  }

  /** Gold motes drifting up — the ambient tell that something was sanctified. */
  motes(x: number, y: number, count: number, spread = 26, life = 700, depth = 6): void {
    const seeds = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * spread,
      oy: (Math.random() - 0.5) * spread * 0.6,
      rise: 16 + Math.random() * 26,
      r: 1.3 + Math.random() * 2.2,
      ph: Math.random() * TAU,
    }));
    this.anim(depth, life, (g, t) => {
      for (const s of seeds) {
        const a = (1 - t) * 0.9;
        const px = x + s.ox + Math.sin(s.ph + t * 6) * 3;
        const py = y + s.oy - s.rise * easeOut(t);
        g.fillStyle(this.tint(JUS.bright), a);
        g.fillCircle(px, py, s.r * (1 - t * 0.5));
        g.fillStyle(this.tint(JUS.pale), a * 0.8);
        g.fillCircle(px, py, s.r * 0.4);
      }
    });
  }

  /** A spear driven in and pulled back out, drawn along the aim. */
  thrust(x: number, y: number, angle: number, reach: number, depth = 7): void {
    this.anim(depth, 260, (g, t) => {
      // Out fast, back slow — a stab, not a swing.
      const p = t < 0.35 ? easeOut(t / 0.35) : 1 - easeIn((t - 0.35) / 0.65);
      const back = 12;
      const bx = x + Math.cos(angle) * (back + reach * p * 0.25);
      const by = y + Math.sin(angle) * (back + reach * p * 0.25);
      spearShape(g, this.tint, bx, by, angle, reach * (0.55 + p * 0.45), 0.6 + p * 0.4);
      // Air torn along the line of the point.
      const tipD = back + reach * p;
      g.lineStyle(3 * (1 - t), this.tint(JUS.pale), 0.5 * (1 - t));
      g.lineBetween(
        x + Math.cos(angle) * (tipD - 22), y + Math.sin(angle) * (tipD - 22),
        x + Math.cos(angle) * tipD, y + Math.sin(angle) * tipD,
      );
    });
  }

  /** Gilt shards thrown out of an impact. */
  shards(x: number, y: number, count: number, speed = 150, life = 520, depth = 6): void {
    const seeds = Array.from({ length: count }, () => {
      const a = Math.random() * TAU;
      return { a, v: speed * (0.5 + Math.random()), len: 5 + Math.random() * 9, w: 1 + Math.random() * 1.6 };
    });
    this.anim(depth, life, (g, t) => {
      for (const s of seeds) {
        const d = s.v * (life / 1000) * easeOut(t);
        const px = x + Math.cos(s.a) * d;
        const py = y + Math.sin(s.a) * d;
        const ex = px + Math.cos(s.a) * s.len * (1 - t);
        const ey = py + Math.sin(s.a) * s.len * (1 - t);
        g.lineStyle(s.w * (1 - t * 0.6), this.tint(t < 0.4 ? JUS.pale : JUS.gold), 0.9 * (1 - t));
        g.lineBetween(px, py, ex, ey);
      }
    });
  }

  /** Chunks of masonry knocked loose — used when a wall is ripped out or lands. */
  rubble(x: number, y: number, count: number, spread: number, depth = 6): void {
    const seeds = Array.from({ length: count }, () => {
      const a = Math.random() * TAU;
      return {
        a, v: 60 + Math.random() * 190, r: 2.5 + Math.random() * 5.5,
        spin: (Math.random() - 0.5) * 9, ox: (Math.random() - 0.5) * spread,
      };
    });
    this.anim(depth, 760, (g, t) => {
      for (const s of seeds) {
        const d = s.v * 0.76 * easeOut(t);
        const px = x + s.ox + Math.cos(s.a) * d;
        const py = y + Math.sin(s.a) * d + t * t * 90;
        const r = s.r * (1 - t * 0.35);
        const rot = s.spin * t;
        g.fillStyle(this.tint(JUS.stoneDark), (1 - t) * 0.9);
        g.fillTriangle(
          px + Math.cos(rot) * r, py + Math.sin(rot) * r,
          px + Math.cos(rot + 2.2) * r, py + Math.sin(rot + 2.2) * r,
          px + Math.cos(rot + 4.3) * r * 0.8, py + Math.sin(rot + 4.3) * r * 0.8,
        );
        g.fillStyle(this.tint(JUS.stone), (1 - t) * 0.8);
        g.fillCircle(px, py, r * 0.45);
      }
    });
  }

  /** A shaft of light dropped straight down onto a point — the verdict landing. */
  verdictBeam(x: number, y: number, color: number, height: number, duration = 900, depth = 8): void {
    const c = this.tint(color);
    this.anim(depth, duration, (g, t) => {
      const a = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      const w = 26 + Math.sin(t * 22) * 3;
      g.fillStyle(c, a * 0.16);
      g.fillRect(x - w, y - height, w * 2, height);
      g.fillStyle(c, a * 0.3);
      g.fillRect(x - w * 0.5, y - height, w, height);
      g.fillStyle(this.tint(JUS.white), a * 0.55);
      g.fillRect(x - w * 0.16, y - height, w * 0.32, height);
      g.fillStyle(c, a * 0.35);
      g.fillEllipse(x, y, w * 3.2, w * 0.9);
    });
  }

  /** Chains bursting off a body when a bind expires or is broken. */
  chainBurst(x: number, y: number, depth = 7): void {
    const seeds = Array.from({ length: 7 }, () => {
      const a = Math.random() * TAU;
      return { a, v: 90 + Math.random() * 150, len: 14 + Math.random() * 16 };
    });
    this.anim(depth, 620, (g, t) => {
      for (const s of seeds) {
        const d = s.v * 0.62 * easeOut(t);
        const px = x + Math.cos(s.a) * d;
        const py = y + Math.sin(s.a) * d + t * t * 60;
        chainRun(
          g, this.tint, px, py,
          px + Math.cos(s.a) * s.len, py + Math.sin(s.a) * s.len,
          (1 - t) * 0.95, 7, 1.7,
        );
      }
    });
  }
}

// ── ColiseumRing ──────────────────────────────────────────────────────────

/** The persistent ring of columns raised by E. Driven per-frame by JusticeKit. */
export class ColiseumRing {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private cols: { a: number; h: number; phase: number }[];

  constructor(
    scene: Phaser.Scene,
    private tint: JusticeColorFn,
    private radius: number,
    count = 18,
    depth = 2,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
    this.cols = Array.from({ length: count }, (_, i) => ({
      a: (i / count) * TAU,
      h: 30 + Math.random() * 8,
      phase: Math.random() * TAU,
    }));
  }

  /** `rise` 0→1 while the ring is coming out of the floor, `fade` 0→1 while it sinks. */
  update(delta: number, cx: number, cy: number, rise: number, fade: number): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    const alpha = Math.min(rise, 1 - fade);
    if (alpha <= 0.02) return;

    // Sand floor inside the ring, so the arena reads as an arena.
    g.fillStyle(this.tint(JUS.bronze), alpha * 0.12);
    g.fillCircle(cx, cy, this.radius);
    g.lineStyle(3, this.tint(JUS.gold), alpha * 0.55);
    g.strokeCircle(cx, cy, this.radius);
    // Barrier shimmer — the ring is a wall, and it has to look like one.
    g.lineStyle(9, this.tint(JUS.bright), alpha * (0.1 + 0.06 * Math.sin(this.t * 4)));
    g.strokeCircle(cx, cy, this.radius);

    // Columns, sorted so the far side draws first and the near side overlaps it.
    const sorted = [...this.cols].sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
    for (const c of sorted) {
      const x = cx + Math.cos(c.a) * this.radius;
      const y = cy + Math.sin(c.a) * this.radius * 0.94;
      const h = c.h * rise * (1 - fade) * (1 + Math.sin(this.t * 2 + c.phase) * 0.02);
      column(this.g, this.tint, x, y, h, 9, alpha);
    }
  }

  destroy(): void { this.g.destroy(); }
}

// ── FlamePillar ───────────────────────────────────────────────────────────

/** The vertical wall of fire from the flight R. */
export class FlamePillar {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private licks: { y: number; ox: number; speed: number; scale: number; phase: number }[];

  constructor(
    scene: Phaser.Scene,
    private tint: JusticeColorFn,
    private halfWidth: number,
    private top: number,
    private bottom: number,
    depth = 4,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
    const rows = Math.max(8, Math.round((bottom - top) / 22));
    this.licks = Array.from({ length: rows * 3 }, (_, i) => ({
      y: top + ((i % rows) / rows) * (bottom - top) + Math.random() * 14,
      ox: (Math.random() - 0.5) * halfWidth * 1.5,
      speed: 2.5 + Math.random() * 3.5,
      scale: 0.55 + Math.random() * 0.8,
      phase: Math.random() * TAU,
    }));
  }

  update(delta: number, x: number, alpha: number): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;

    const h = this.bottom - this.top;
    // Body of the wall: a hot column with a cooler haze either side of it.
    g.fillStyle(this.tint(JUS.flameDeep), alpha * 0.3);
    g.fillRect(x - this.halfWidth * 1.5, this.top, this.halfWidth * 3, h);
    g.fillStyle(this.tint(JUS.flame), alpha * 0.4);
    g.fillRect(x - this.halfWidth, this.top, this.halfWidth * 2, h);
    g.fillStyle(this.tint(JUS.flameCore), alpha * 0.35);
    g.fillRect(x - this.halfWidth * 0.35, this.top, this.halfWidth * 0.7, h);

    for (const l of this.licks) {
      const wob = Math.sin(this.t * l.speed + l.phase);
      const len = (26 + wob * 12) * l.scale;
      const cx = x + l.ox * (0.7 + wob * 0.3);
      // Licks climb the pillar and wrap, so the wall is always moving upward.
      const cy = this.bottom - (((this.t * 70 * l.speed * 0.2 + (this.bottom - l.y)) % h));
      g.fillStyle(this.tint(JUS.flameDeep), alpha * 0.5);
      flameLick(g, cx, cy, len, 5.5 * l.scale, wob * 5);
      g.fillStyle(this.tint(JUS.flame), alpha * 0.75);
      flameLick(g, cx, cy, len * 0.72, 3.6 * l.scale, wob * 4);
      g.fillStyle(this.tint(JUS.flameCore), alpha * 0.9);
      flameLick(g, cx, cy, len * 0.4, 1.8 * l.scale, wob * 2);
    }

    // Scorched edges, so the pillar has a footprint rather than floating.
    g.fillStyle(this.tint(JUS.flameDeep), alpha * 0.4);
    g.fillEllipse(x, this.bottom, this.halfWidth * 4, 12);
    g.fillEllipse(x, this.top, this.halfWidth * 3.4, 10);
  }

  destroy(): void { this.g.destroy(); }
}

// ── JusticeAvatar ─────────────────────────────────────────────────────────

const JUSTICE_AVATAR: AvatarSpec = {
  hands: [
    { r: 9.5, color: JUS.gold, alpha: 0.24 },
    { r: 6.6, color: JUS.bright, alpha: 0.92 },
    { r: 3.6, color: JUS.pale, alpha: 1 },
    { r: 1.5, color: JUS.white, alpha: 0.95, ox: -1, oy: -1 },
  ],
  eyeWhite: JUS.pale,
  eyePupil: 0x241a08,
  squash: { div: 15, x: 0.44, y: 0.24 },
};

/**
 * The Justice character: a laurel-crowned magistrate on the ground, a winged valkyrie in
 * the air, and blue-eyed with a hard afterimage while Sheer Will is burning.
 *
 * The three tells are deliberately different *kinds* of change — silhouette (wings),
 * colour (blue eyes and aura) and motion (the afterimage) — so any two can be read at once.
 */
export class JusticeAvatar extends BaseAvatar {
  private flying = 0;
  private flyTarget = 0;
  private will = 0;
  private willTarget = 0;
  /** Recent body positions, for the Sheer Will afterimage. */
  private trail: { x: number; y: number }[] = [];
  private trailAccumMs = 0;

  constructor(scene: Phaser.Scene, tint: JusticeColorFn, depth = 6) {
    super(scene, tint, depth, JUSTICE_AVATAR);
  }

  /** Wings out / wings in. Eased so the transform reads as a movement, not a swap. */
  setFlying(on: boolean): void { this.flyTarget = on ? 1 : 0; }
  /** Sheer Will's blue. */
  setWilling(on: boolean): void {
    this.willTarget = on ? 1 : 0;
    this.setEyeWhite(on ? JUS.willPale : JUS.pale);
  }

  update(delta: number, x: number, y: number, alpha: number): void {
    const k = Math.min(1, delta / 160);
    this.flying += (this.flyTarget - this.flying) * k;
    this.will += (this.willTarget - this.will) * k;

    // Afterimage samples — kept even when Sheer Will is off so switching it on has history.
    this.trailAccumMs += delta;
    if (this.trailAccumMs >= 40) {
      this.trailAccumMs = 0;
      this.trail.unshift({ x, y });
      if (this.trail.length > 6) this.trail.pop();
    }

    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 13 : 9.5);
      glow.setFillStyle(this.tint(on ? JUS.bright : JUS.gold), on ? 0.34 : 0.24);
    });
  }

  protected emitTrail(x: number, y: number): void {
    // Hands shed gold dust; blue while the will is burning.
    new JusticeFx(this.scene, this.tint).motes(x, y, 1, 6, this.will > 0.5 ? 520 : 420, 5);
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    // Sheer Will's afterimage sits under the body so the live sprite always reads first.
    if (this.will > 0.05) {
      for (let i = this.trail.length - 1; i >= 1; i--) {
        const p = this.trail[i];
        const f = 1 - i / this.trail.length;
        g.fillStyle(this.tint(JUS.will), alpha * this.will * f * 0.3);
        g.fillCircle(p.x, p.y, 21 - i);
      }
    }
    // Ground halo — gold, tinted toward blue with the will.
    g.fillStyle(this.tint(this.will > 0.5 ? JUS.will : JUS.gold), a * (0.22 + this.will * 0.16));
    g.fillCircle(x, y, 27 + this.will * 5);
    // Airborne: the shadow drops away and a lift-glow builds underneath.
    if (this.flying > 0.05) {
      g.fillStyle(this.tint(JUS.willPale), a * 0.2 * this.flying);
      g.fillEllipse(x, y + 20 + this.flying * 10, 46 * this.flying, 12 * this.flying);
    }
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const bob = Math.sin(this.t * 3.2) * (1 + this.flying * 2.5);

    // Wings — the flight silhouette, beating faster the higher the intensity.
    if (this.flying > 0.02) {
      const beat = Math.sin(this.t * 7.5) * 0.28;
      const span = 34 * this.flying;
      wing(g, this.tint, x - 7, y - 6 + bob, Math.PI, span, -1, alpha * this.flying, 1 + beat);
      wing(g, this.tint, x + 7, y - 6 + bob, 0, span, 1, alpha * this.flying, 1 + beat);
    }

    // Laurel crown — six leaves swept back off the brow. The ground-stance tell.
    const crownY = y - 19 + bob * 0.4;
    const laurel = 1 - this.flying * 0.45;
    for (let s = -1; s <= 1; s += 2) {
      for (let i = 0; i < 3; i++) {
        const ang = s * (0.55 + i * 0.42) - Math.PI / 2;
        const len = (9 - i * 1.6) * laurel;
        const lx = x + Math.cos(ang) * 11 * laurel;
        const ly = crownY + Math.sin(ang) * 6 * laurel;
        g.fillStyle(this.tint(JUS.gold), alpha * 0.9);
        g.fillEllipse(lx, ly, len, len * 0.5);
        g.fillStyle(this.tint(JUS.bright), alpha * 0.7);
        g.fillEllipse(lx, ly - 0.6, len * 0.6, len * 0.3);
      }
    }
    g.fillStyle(this.tint(this.will > 0.5 ? JUS.willPale : JUS.pale), alpha * 0.95);
    g.fillCircle(x, crownY - 2, 2.2 + this.will * 0.8);

    // The spear, carried across the back in the off-hand — Justice is never unarmed.
    const carry = this.facing + Math.PI * 0.62;
    spearShape(
      g, this.tint,
      x + Math.cos(carry) * 20, y + Math.sin(carry) * 20 + bob,
      carry + Math.PI, 44, alpha * 0.9, 0.85,
    );

    // Mastery: a second, higher laurel ring turning slowly overhead.
    if (this.mastered) {
      for (let i = 0; i < 5; i++) {
        const p = this.t * 1.1 + (i / 5) * TAU;
        const cx = x + Math.cos(p) * 20;
        const cy = y - 30 + Math.sin(p) * 6;
        g.fillStyle(this.tint(JUS.gold), alpha * 0.55);
        g.fillEllipse(cx, cy, 7, 3.2);
        g.fillStyle(this.tint(JUS.pale), alpha * 0.9);
        g.fillCircle(cx, cy, 1.3);
      }
    }
  }
}

// ── SeraphForm ────────────────────────────────────────────────────────────

/**
 * The Q set piece: white ribbons wound around a core packed with eyes. Persistent because
 * it holds for three seconds and has to keep moving the whole time.
 */
export class SeraphForm {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private ribbons: { phase: number; len: number; w: number; speed: number; lean: number }[];
  private eyes: { a: number; d: number; r: number; blink: number }[];

  constructor(scene: Phaser.Scene, private tint: JusticeColorFn, depth = 12) {
    this.g = scene.add.graphics().setDepth(depth);
    this.ribbons = Array.from({ length: 11 }, (_, i) => ({
      phase: (i / 11) * TAU,
      len: 70 + Math.random() * 55,
      w: 5 + Math.random() * 5,
      speed: 0.7 + Math.random() * 0.9,
      lean: (Math.random() - 0.5) * 1.4,
    }));
    this.eyes = Array.from({ length: 13 }, () => {
      const a = Math.random() * TAU;
      return { a, d: Math.random() * 26, r: 3.4 + Math.random() * 4.4, blink: Math.random() * TAU };
    });
  }

  update(delta: number, x: number, y: number, grow: number, look: number): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (grow <= 0.02) return;

    const s = easeOut(Math.min(1, grow));

    // Halo behind everything.
    g.fillStyle(this.tint(JUS.pale), 0.18 * s);
    g.fillCircle(x, y, 92 * s);
    g.lineStyle(3, this.tint(JUS.gold), 0.55 * s);
    g.strokeCircle(x, y, 74 * s);

    // Ribbons — long tapered bands turning around the core. Drawn as a chain of
    // narrowing segments so each one keeps its width along a curve.
    for (const r of this.ribbons) {
      const base = r.phase + this.t * r.speed;
      const segs = 9;
      let px = x + Math.cos(base) * 20 * s;
      let py = y + Math.sin(base) * 20 * s;
      for (let i = 1; i <= segs; i++) {
        const f = i / segs;
        const a = base + r.lean * f + Math.sin(this.t * 2.4 + r.phase + f * 3) * 0.35;
        const step = (r.len * s) / segs;
        const nx = px + Math.cos(a) * step;
        const ny = py + Math.sin(a) * step;
        g.lineStyle(r.w * s * (1 - f * 0.8), this.tint(i % 2 === 0 ? JUS.white : JUS.marble), (0.85 - f * 0.5) * s);
        g.lineBetween(px, py, nx, ny);
        px = nx; py = ny;
      }
    }

    // Core — a dark mass, so the eyes have something to sit in.
    g.fillStyle(this.tint(JUS.umber), 0.9 * s);
    g.fillCircle(x, y, 34 * s);
    g.fillStyle(this.tint(JUS.bronze), 0.55 * s);
    g.fillCircle(x - 6 * s, y - 8 * s, 20 * s);

    for (const e of this.eyes) {
      const ex = x + Math.cos(e.a + this.t * 0.3) * e.d * s;
      const ey = y + Math.sin(e.a + this.t * 0.3) * e.d * s;
      // Every eye blinks on its own clock — a synchronised mass reads as a pattern.
      const open = 0.25 + 0.75 * Math.abs(Math.sin(this.t * 1.7 + e.blink));
      seraphEye(g, this.tint, ex, ey, e.r * s, look, s, open);
    }
  }

  destroy(): void { this.g.destroy(); }
}
