import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeOut } from './ElementVisuals';

/**
 * Math's drawing kit: a blackboard's worth of chalk.
 *
 * The primitive is the **chalk stroke** — a line laid twice, once soft and wide, once thin and
 * bright, with a dusty wobble — and everything is built from it: the seven-stroke digits on a
 * pillar, the graph and its axes, the hatching of Rate of Pain, the shrapnel of a blast.
 */

export type MathColorFn = ColorFn;
type G = Phaser.GameObjects.Graphics;

export const MATHC = {
  board: 0x10241d,
  boardLit: 0x1d3d31,
  slate: 0x2b4a40,
  slateLit: 0x4f7a6a,
  chalk: 0xf2f6ea,
  chalkDim: 0xa9c4b4,
  graph: 0x5ee6c8,
  graphHot: 0xc8fff2,
  pain: 0xff3b4e,
  painDeep: 0x7a0f1e,
  painHot: 0xffb0b8,
  gold: 0xffd866,
  goldDeep: 0xb8862b,
  ink: 0x07110d,
} as const;

/** Segments lit for each digit: top, upper-left, upper-right, middle, lower-left, lower-right, bottom. */
const SEGS: readonly number[][] = [
  [1, 1, 1, 0, 1, 1, 1], [0, 0, 1, 0, 0, 1, 0], [1, 0, 1, 1, 1, 0, 1], [1, 0, 1, 1, 0, 1, 1], [0, 1, 1, 1, 0, 1, 0],
  [1, 1, 0, 1, 0, 1, 1], [1, 1, 0, 1, 1, 1, 1], [1, 0, 1, 0, 0, 1, 0], [1, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 0, 1, 1],
];

/** A chalk stroke: a soft wide pass under a thin bright one. */
export function chalkLine(g: G, x1: number, y1: number, x2: number, y2: number, color: number, alpha: number, w = 2): void {
  g.lineStyle(w * 2.4, color, alpha * 0.22);
  g.lineBetween(x1, y1, x2, y2);
  g.lineStyle(w, color, alpha);
  g.lineBetween(x1, y1, x2, y2);
}

/** One digit in seven chalk strokes, centred on (cx, cy), `h` tall. */
export function chalkDigit(g: G, digit: number, cx: number, cy: number, h: number, color: number, alpha: number): void {
  const seg = SEGS[Math.abs(digit) % 10];
  const w = h * 0.5;
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const yT = cy - h / 2;
  const yB = cy + h / 2;
  const lw = Math.max(1, h * 0.13);
  g.lineStyle(lw, color, alpha);
  if (seg[0]) g.lineBetween(x0, yT, x1, yT);
  if (seg[1]) g.lineBetween(x0, yT, x0, cy);
  if (seg[2]) g.lineBetween(x1, yT, x1, cy);
  if (seg[3]) g.lineBetween(x0, cy, x1, cy);
  if (seg[4]) g.lineBetween(x0, cy, x0, yB);
  if (seg[5]) g.lineBetween(x1, cy, x1, yB);
  if (seg[6]) g.lineBetween(x0, yB, x1, yB);
}

/** A polyline as chalk, skipping the jump between points flagged as a break (off-board samples). */
export function chalkPath(g: G, pts: { x: number; y: number }[], color: number, alpha: number, w = 2): void {
  if (pts.length < 2) return;
  for (const [lw, a] of [[w * 3, alpha * 0.16], [w, alpha]] as const) {
    g.lineStyle(lw, color, a);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
  }
}

/**
 * A pillar of math: a slate column with a lit face, three digits chalked down it and a ring of
 * light at its foot. `ang` leans it along its flight once it is launched; `charge` 0..1 heats it.
 */
export function drawPillar(g: G, tint: MathColorFn, x: number, y: number, seed: number, t: number, alpha: number, charge = 0, ang = -Math.PI / 2): void {
  const up = { x: Math.cos(ang), y: Math.sin(ang) };
  const side = { x: -up.y, y: up.x };
  const H = 46;
  const W = 24;
  const P = (f: number, s: number): Phaser.Math.Vector2 =>
    new Phaser.Math.Vector2(x + up.x * f + side.x * s, y + up.y * f + side.y * s);
  // The ring it stands on.
  g.fillStyle(tint(MATHC.graph), alpha * (0.14 + 0.2 * charge));
  g.fillEllipse(x, y + 2, W * 2.6, W * 0.95);
  g.lineStyle(1.4, tint(charge > 0.5 ? MATHC.graphHot : MATHC.graph), alpha * (0.5 + 0.4 * charge));
  g.strokeEllipse(x, y + 2, W * 2.2 + Math.sin(t * 5 + seed) * 2, W * 0.75);
  // Shadow shell, slate body, lit face.
  g.fillStyle(tint(MATHC.ink), alpha * 0.85);
  g.fillPoints([P(-2, -W / 2 - 1.5), P(H + 3, -W / 2 - 1.5), P(H + 3, W / 2 + 1.5), P(-2, W / 2 + 1.5)], true);
  g.fillStyle(tint(MATHC.slate), alpha);
  g.fillPoints([P(0, -W / 2), P(H, -W / 2), P(H, W / 2), P(0, W / 2)], true);
  g.fillStyle(tint(MATHC.slateLit), alpha * 0.8);
  g.fillPoints([P(0, -W / 2), P(H, -W / 2), P(H, -W / 2 + 3.5), P(0, -W / 2 + 3.5)], true);
  // Capital and base.
  g.fillStyle(tint(MATHC.chalkDim), alpha);
  g.fillPoints([P(H, -W / 2 - 2.5), P(H + 4, -W / 2 - 2.5), P(H + 4, W / 2 + 2.5), P(H, W / 2 + 2.5)], true);
  g.fillPoints([P(-3, -W / 2 - 2.5), P(1, -W / 2 - 2.5), P(1, W / 2 + 2.5), P(-3, W / 2 + 2.5)], true);
  // Three digits down the face, one of them flickering to the next number.
  const hot = tint(charge > 0.5 ? MATHC.graphHot : MATHC.chalk);
  for (let i = 0; i < 3; i++) {
    const c = P(H - 9 - i * 13, 0.5);
    const d = (seed * 7 + i * 3 + (i === 1 ? Math.floor(t * 3 + seed) : 0)) % 10;
    chalkDigit(g, d, c.x, c.y, 11.5, hot, alpha * (0.85 + 0.15 * Math.sin(t * 6 + i + seed)));
  }
  if (charge > 0.02) {
    g.fillStyle(tint(MATHC.graphHot), alpha * 0.3 * charge);
    g.fillPoints([P(-2, -W / 2 - 3), P(H + 4, -W / 2 - 3), P(H + 4, W / 2 + 3), P(-2, W / 2 + 3)], true);
  }
}

/** The axes of the board, with tick marks, through `(cx, cy)`. */
export function drawAxes(g: G, tint: MathColorFn, b: Phaser.Geom.Rectangle, cx: number, cy: number, alpha: number): void {
  const c = tint(MATHC.chalkDim);
  g.lineStyle(1, c, alpha * 0.5);
  g.lineBetween(b.left + 6, cy, b.right - 6, cy);
  g.lineBetween(cx, b.top + 6, cx, b.bottom - 6);
  g.lineStyle(1, c, alpha * 0.4);
  for (let x = cx % 60; x < b.right; x += 60) if (x > b.left + 6) g.lineBetween(x, cy - 3, x, cy + 3);
  for (let y = cy % 60; y < b.bottom; y += 60) if (y > b.top + 6) g.lineBetween(cx - 3, y, cx + 3, y);
  // Arrowheads.
  g.fillStyle(c, alpha * 0.55);
  g.fillTriangle(b.right - 4, cy, b.right - 12, cy - 4, b.right - 12, cy + 4);
  g.fillTriangle(cx, b.top + 4, cx - 4, b.top + 12, cx + 4, b.top + 12);
}

/** The live graph: a glowing chalk curve with motes running along it. */
export function drawGraph(g: G, tint: MathColorFn, pts: { x: number; y: number }[], t: number, alpha: number, hot = 0): void {
  chalkPath(g, pts, tint(hot > 0.5 ? MATHC.graphHot : MATHC.graph), alpha * (0.55 + 0.45 * hot), 2 + hot * 1.5);
  if (pts.length < 2) return;
  for (let i = 0; i < 5; i++) {
    const f = ((t * 0.12 + i / 5) % 1) * (pts.length - 1);
    const a = pts[Math.floor(f)];
    const b2 = pts[Math.min(pts.length - 1, Math.floor(f) + 1)];
    const k = f - Math.floor(f);
    g.fillStyle(tint(MATHC.graphHot), alpha * 0.8);
    g.fillCircle(a.x + (b2.x - a.x) * k, a.y + (b2.y - a.y) * k, 2);
  }
}

/**
 * Rate of Pain: everything between the curve and the floor, flooded red, hatched like a shaded
 * integral, with a bright edge on the curve and a pulse climbing the hatch. `fade` 0..1.
 */
export function drawPainRegion(g: G, tint: MathColorFn, pts: { x: number; y: number }[], bottom: number, t: number, fade: number): void {
  if (pts.length < 2 || fade <= 0.01) return;
  const pulse = 0.5 + 0.5 * Math.sin(t * 7);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (a.y >= bottom && b.y >= bottom) continue;
    g.fillStyle(tint(MATHC.painDeep), fade * 0.34);
    g.fillPoints([
      new Phaser.Math.Vector2(a.x, Math.min(a.y, bottom)), new Phaser.Math.Vector2(b.x, Math.min(b.y, bottom)),
      new Phaser.Math.Vector2(b.x, bottom), new Phaser.Math.Vector2(a.x, bottom),
    ], true);
  }
  // Riemann hatching: a bar under every few samples, breathing.
  g.lineStyle(1.5, tint(MATHC.pain), fade * (0.3 + 0.25 * pulse));
  for (let i = 0; i < pts.length; i += 2) {
    const p = pts[i];
    if (p.y < bottom) g.lineBetween(p.x, Math.min(p.y, bottom), p.x, bottom);
  }
  // A pulse of heat rising off the floor.
  const rise = (t * 0.9) % 1;
  g.lineStyle(2, tint(MATHC.painHot), fade * 0.35 * (1 - rise));
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const ya = bottom - (bottom - a.y) * rise;
    const yb = bottom - (bottom - b.y) * rise;
    if (a.y < bottom && b.y < bottom) g.lineBetween(a.x, ya, b.x, yb);
  }
  chalkPath(g, pts, tint(MATHC.pain), fade * (0.75 + 0.25 * pulse), 3);
}

/** A cluster bomb on its fuse: a chalk circle closing on a ticking core. `t` 0..1 through the fuse. */
export function drawFuse(g: G, tint: MathColorFn, x: number, y: number, r: number, t: number, clock: number): void {
  g.fillStyle(tint(MATHC.pain), 0.1 + 0.16 * t);
  g.fillCircle(x, y, r);
  g.lineStyle(1.5, tint(MATHC.pain), 0.55 + 0.4 * t);
  g.strokeCircle(x, y, r);
  g.lineStyle(2, tint(MATHC.painHot), 0.9);
  g.strokeCircle(x, y, r * (1 - t) + 3);
  // Cross-hairs chalked through it.
  g.lineStyle(1, tint(MATHC.chalk), 0.35 + 0.3 * t);
  g.lineBetween(x - r, y, x + r, y);
  g.lineBetween(x, y - r, x, y + r);
  g.fillStyle(tint(Math.sin(clock * 30) > 0 ? MATHC.painHot : MATHC.chalk), 0.95);
  g.fillCircle(x, y, 3.2 + 2 * t);
}

// ── MathFx ───────────────────────────────────────────────────────────────────

export class MathFx extends FxBase {
  /** A problem solved: the answer rings out and a pillar rises where it will stand. */
  solved(x: number, y: number): void {
    this.anim(8.6, 360, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(2.5 * (1 - t), this.tint(MATHC.graphHot), 1 - t);
      g.strokeCircle(x, y, 8 + e * 30);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.4;
        chalkLine(g, x + Math.cos(a) * (10 + e * 16), y + Math.sin(a) * (10 + e * 16),
          x + Math.cos(a) * (16 + e * 30), y + Math.sin(a) * (16 + e * 30), this.tint(MATHC.chalk), 1 - t, 1.5);
      }
      g.fillStyle(this.tint(MATHC.graphHot), (1 - t) * 0.5);
      g.fillEllipse(x, y + 4, 40 * (1 - e * 0.4), 12);
    });
  }

  /** A wrong answer: the slate is struck through. */
  wrong(x: number, y: number): void {
    this.anim(30, 300, (g, t) => {
      const s = 12 + 4 * easeOut(t);
      chalkLine(g, x - s, y - s * 0.6, x + s, y + s * 0.6, this.tint(MATHC.pain), 1 - t, 2.5);
      chalkLine(g, x - s, y + s * 0.6, x + s, y - s * 0.6, this.tint(MATHC.pain), 1 - t, 2.5);
    });
  }

  /** A pillar leaves: a dust ring where it stood and a streak down its line. */
  launch(x: number, y: number, ang: number): void {
    this.anim(4, 300, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(2 * (1 - t), this.tint(MATHC.chalkDim), 0.8 * (1 - t));
      g.strokeEllipse(x, y + 2, 26 + e * 34, 9 + e * 10);
      chalkLine(g, x, y, x + Math.cos(ang) * 70 * e, y + Math.sin(ang) * 70 * e, this.tint(MATHC.graphHot), (1 - t) * 0.8, 3);
    });
  }

  /** A pillar lands on someone: slabs of slate, loose digits, a hard white crack. */
  pillarHit(x: number, y: number, ang: number): void {
    this.flashIn(x, y, 16, MATHC.chalk, MATHC.graph, 9);
    const bits = Array.from({ length: 9 }, (_, i) => ({
      a: ang + (Math.random() - 0.5) * 2.2, v: 50 + Math.random() * 90, d: (i * 3 + 1) % 10, s: 5 + Math.random() * 4,
    }));
    this.anim(9, 460, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(3 * (1 - t), this.tint(MATHC.graphHot), 1 - t);
      g.strokeCircle(x, y, 10 + e * 46);
      for (const b of bits) {
        const px = x + Math.cos(b.a) * b.v * e;
        const py = y + Math.sin(b.a) * b.v * e + 30 * t * t;
        if (b.d % 2) chalkDigit(g, b.d, px, py, b.s * 1.6, this.tint(MATHC.chalk), 1 - t);
        else {
          g.fillStyle(this.tint(MATHC.slateLit), 1 - t);
          g.fillRect(px - b.s / 2, py - b.s / 2, b.s, b.s * 0.7);
        }
      }
    });
  }

  /** The end of a pillar's flight against a wall. */
  pillarCrumble(x: number, y: number): void {
    this.anim(8, 320, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.3;
        g.fillStyle(this.tint(i % 2 ? MATHC.slate : MATHC.chalkDim), 1 - t);
        g.fillRect(x + Math.cos(a) * 26 * e - 3, y + Math.sin(a) * 26 * e - 2 + 20 * t * t, 6, 4);
      }
    });
  }

  /** Integrate / Derivitize: a bar of light sweeps the board as the curve is rewritten. */
  rewrite(b: Phaser.Geom.Rectangle, up: boolean): void {
    this.anim(3.4, 420, (g, t) => {
      const x = up ? b.left + b.width * t : b.right - b.width * t;
      g.fillStyle(this.tint(up ? MATHC.graphHot : MATHC.gold), 0.22 * (1 - t));
      g.fillRect(x - 26, b.top, 52, b.height);
      g.lineStyle(2, this.tint(MATHC.chalk), 0.7 * (1 - t));
      g.lineBetween(x, b.top, x, b.bottom);
    });
  }

  /** The old curve shattering, a breath before its bombs go off. */
  curveShatter(pts: { x: number; y: number }[]): void {
    const shards = pts.filter((_, i) => i % 2 === 0).map((p) => ({ ...p, a: Math.random() * TAU, v: 18 + Math.random() * 36 }));
    this.anim(3.5, 520, (g, t) => {
      const e = easeOut(t);
      for (const s of shards) {
        const x = s.x + Math.cos(s.a) * s.v * e;
        const y = s.y + Math.sin(s.a) * s.v * e;
        chalkLine(g, x - Math.cos(s.a + 1) * 7, y - Math.sin(s.a + 1) * 7, x + Math.cos(s.a + 1) * 7, y + Math.sin(s.a + 1) * 7,
          this.tint(MATHC.gold), 1 - t, 2);
      }
    });
  }

  /** A cluster bomb going off: flash, lobes, shockwaves, digit shrapnel, chalk dust, a scorch. */
  blast(x: number, y: number, r: number, big: boolean): void {
    this.flashIn(x, y, r * 0.55, MATHC.chalk, MATHC.pain, 9.2);
    const lobes = Array.from({ length: big ? 7 : 4 }, (_, i) => ({ a: (i / (big ? 7 : 4)) * TAU + Math.random(), d: r * (0.3 + Math.random() * 0.3), s: r * (0.3 + Math.random() * 0.2) }));
    const bits = Array.from({ length: big ? 10 : 5 }, () => ({ a: Math.random() * TAU, v: r * (0.8 + Math.random() * 0.9), d: Math.floor(Math.random() * 10) }));
    // The scorch: a chalk-smudged ring that lingers.
    this.anim(3.2, big ? 1400 : 800, (g, t) => {
      g.fillStyle(this.tint(MATHC.ink), 0.3 * (1 - t));
      g.fillCircle(x, y, r * 0.8);
      g.lineStyle(1.2, this.tint(MATHC.chalkDim), 0.3 * (1 - t));
      g.strokeCircle(x, y, r * 0.8);
    });
    this.anim(9, big ? 520 : 380, (g, t) => {
      const e = easeOut(t);
      for (const l of lobes) {
        g.fillStyle(this.tint(t < 0.35 ? MATHC.painHot : MATHC.pain), (1 - t) * 0.75);
        g.fillCircle(x + Math.cos(l.a) * l.d * e, y + Math.sin(l.a) * l.d * e, l.s * (0.6 + e * 0.7));
      }
      g.lineStyle(3.5 * (1 - t), this.tint(MATHC.chalk), 1 - t);
      g.strokeCircle(x, y, r * (0.3 + e * 0.75));
      if (big) {
        g.lineStyle(2 * (1 - t), this.tint(MATHC.gold), (1 - t) * 0.8);
        g.strokeCircle(x, y, r * (0.1 + e * 1.05));
      }
      for (const b of bits) {
        chalkDigit(g, b.d, x + Math.cos(b.a) * b.v * e, y + Math.sin(b.a) * b.v * e + 24 * t * t, big ? 11 : 8, this.tint(MATHC.chalk), 1 - t);
      }
      // Chalk dust hanging.
      g.fillStyle(this.tint(MATHC.chalkDim), 0.2 * (1 - t));
      g.fillCircle(x, y - 10 * t, r * (0.5 + 0.4 * e));
    });
  }

  /** Rate of Pain ticking on someone under the curve. */
  painTick(x: number, y: number): void {
    this.anim(8.8, 240, (g, t) => {
      chalkLine(g, x - 10, y + 14 - 26 * t, x + 10, y + 14 - 26 * t, this.tint(MATHC.pain), (1 - t) * 0.9, 2);
      g.fillStyle(this.tint(MATHC.painHot), (1 - t) * 0.35);
      g.fillCircle(x, y, 16 + 6 * t);
    });
  }

  /** A failed problem lands on its victim: a red mark struck down through them. */
  failStrike(x: number, y: number, weight: number): void {
    this.flashIn(x, y, 20 + weight * 5, MATHC.painHot, MATHC.pain, 9.4);
    this.anim(9.4, 520, (g, t) => {
      const e = easeOut(t);
      const s = 22 + weight * 5;
      chalkLine(g, x - s, y - s, x + s, y + s, this.tint(MATHC.pain), 1 - t, 4);
      chalkLine(g, x - s, y + s, x + s, y - s, this.tint(MATHC.pain), 1 - t, 4);
      g.lineStyle(3 * (1 - t), this.tint(MATHC.painHot), 1 - t);
      g.strokeCircle(x, y, s * (0.6 + e * 1.3));
      for (let i = 0; i <= weight; i++) {
        g.lineStyle(1.5, this.tint(MATHC.pain), (1 - t) * 0.6);
        g.strokeCircle(x, y, s * (1 + e * 1.6) + i * 9);
      }
    });
  }

  /** A problem answered right: a tick, in chalk. */
  passTick(x: number, y: number): void {
    this.anim(9.4, 420, (g, t) => {
      const a = 1 - t;
      const lift = 10 * easeOut(t);
      chalkLine(g, x - 10, y - lift, x - 3, y + 8 - lift, this.tint(MATHC.graph), a, 3);
      chalkLine(g, x - 3, y + 8 - lift, x + 12, y - 12 - lift, this.tint(MATHC.graph), a, 3);
    });
  }
}

// ── MathAvatar ───────────────────────────────────────────────────────────────

const MATH_AVATAR: AvatarSpec = {
  hands: [
    { r: 9.5, color: MATHC.graph, alpha: 0.16 },
    { r: 6.6, color: MATHC.slate, alpha: 1 },
    { r: 5, color: MATHC.slateLit, alpha: 1 },
    { r: 1.7, color: MATHC.chalk, alpha: 0.9, ox: -1.6, oy: -1.8 },
  ],
  eyeWhite: MATHC.chalk,
  eyePupil: MATHC.ink,
};

/**
 * The scholar: a slate-green orb in a mortarboard, a stick of chalk in its right hand and a
 * faint equals sign chalked on its cheek. Solved pillars light the tassel.
 */
export class MathAvatar extends BaseAvatar {
  /** 0..1 — how full the pillar ring is; warms the glow and swings the tassel. */
  private stock = 0;
  /** 0..1 flash on a solve. */
  private spark = 0;

  constructor(scene: Phaser.Scene, tint: ColorFn, depth = 6) {
    super(scene, tint, depth, MATH_AVATAR);
  }

  setStock(v: number): void { this.stock = Phaser.Math.Clamp(v, 0, 1); }
  solve(): void { this.spark = 1; }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.spark = Math.max(0, this.spark - delta / 420);
    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 13 : 9.5);
      glow.setFillStyle(this.tint(on ? MATHC.gold : MATHC.graph), on ? 0.36 : 0.16);
    });
    this.setEyeWhite(on ? MATHC.gold : MATHC.chalk);
  }

  protected drawGlow(g: G, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    g.fillStyle(this.tint(MATHC.ink), a * 0.4);
    g.fillEllipse(x, y + 18, 46, 13);
    g.fillStyle(this.tint(MATHC.graph), a * (0.1 + 0.16 * this.stock + 0.3 * this.spark));
    g.fillCircle(x, y, 29 + 5 * this.stock);
    if (this.mastered) {
      g.lineStyle(1.5, this.tint(MATHC.gold), a * 0.6);
      g.strokeEllipse(x, y + 18, 58 + Math.sin(this.t * 2) * 3, 17);
    }
  }

  /** A faint equals sign on the cheek, away from the eyes. */
  protected drawBody(g: G, x: number, y: number, a: number, alpha: number): void {
    void a;
    const c = this.tint(MATHC.chalkDim);
    g.lineStyle(1.3, c, alpha * 0.55);
    g.lineBetween(x - 4, y + 10, x + 4, y + 10);
    g.lineBetween(x - 4, y + 13, x + 4, y + 13);
  }

  /** The mortarboard with its tassel, and the chalk in the right hand. */
  protected drawExtras(g: G, x: number, y: number, a: number, alpha: number): void {
    void a;
    const top = y - 21;
    const trim = this.tint(this.mastered ? MATHC.gold : MATHC.chalkDim);
    // Skull cap.
    g.fillStyle(this.tint(MATHC.ink), alpha);
    g.fillRoundedRect(x - 11, top - 1, 22, 8, 3);
    g.lineStyle(1, trim, alpha * 0.8);
    g.lineBetween(x - 10, top + 6, x + 10, top + 6);
    // The board: a flat diamond seen from just above.
    const bw = this.mastered ? 21 : 19;
    g.fillStyle(this.tint(MATHC.board), alpha);
    g.fillPoints([
      new Phaser.Math.Vector2(x - bw, top - 3), new Phaser.Math.Vector2(x, top - 10),
      new Phaser.Math.Vector2(x + bw, top - 3), new Phaser.Math.Vector2(x, top + 3),
    ], true);
    g.lineStyle(1.3, this.tint(MATHC.slateLit), alpha);
    g.lineBetween(x - bw, top - 3, x, top - 10);
    g.lineBetween(x, top - 10, x + bw, top - 3);
    g.lineStyle(1, trim, alpha * 0.9);
    g.lineBetween(x - bw, top - 3, x, top + 3);
    g.lineBetween(x, top + 3, x + bw, top - 3);
    // Button and tassel — the tassel swings with the walk and brightens as pillars stack.
    const swing = Math.sin(this.t * 3.2) * (2 + 3 * this.stock);
    const tassel = this.tint(this.stock > 0.99 || this.mastered ? MATHC.gold : this.stock > 0 ? MATHC.graph : MATHC.chalkDim);
    g.fillStyle(tassel, alpha);
    g.fillCircle(x, top - 4, 2);
    g.lineStyle(1.4, tassel, alpha);
    g.lineBetween(x, top - 4, x + bw - 5, top - 2);
    g.lineBetween(x + bw - 5, top - 2, x + bw - 4 + swing, top + 9);
    g.fillTriangle(x + bw - 7 + swing, top + 14, x + bw - 1 + swing, top + 14, x + bw - 4 + swing, top + 8);
    if (this.mastered) {
      // A gilt laurel on the board.
      g.lineStyle(1.2, this.tint(MATHC.gold), alpha);
      g.strokeEllipse(x, top - 4, 16, 5);
    }
    // The chalk, held along the aim.
    const hx = this.armX[1];
    const hy = this.armY[1];
    const ang = this.hold ? this.holdAngle : this.facing;
    const cx = Math.cos(ang);
    const cy = Math.sin(ang);
    g.lineStyle(4.4, this.tint(MATHC.ink), alpha * 0.7);
    g.lineBetween(hx - cx * 3, hy - cy * 3, hx + cx * 12, hy + cy * 12);
    g.lineStyle(3, this.tint(MATHC.chalk), alpha);
    g.lineBetween(hx - cx * 2, hy - cy * 2, hx + cx * 11, hy + cy * 11);
    if (this.spark > 0.02) {
      g.fillStyle(this.tint(MATHC.graphHot), alpha * this.spark);
      g.fillCircle(hx + cx * 12, hy + cy * 12, 3 + 5 * this.spark);
    }
  }
}

// ── 42's cutscene ────────────────────────────────────────────────────────────

/** The blackboard that drops over the arena: ruled grid, a vortex of chalk rings, the caster's halo. */
export function drawCineBoard(g: G, tint: MathColorFn, v: Phaser.Geom.Rectangle, x: number, y: number, dark: number, t: number, surge: number): void {
  g.fillStyle(tint(MATHC.board), 0.9 * dark);
  g.fillRect(v.x - 80, v.y - 80, v.width + 160, v.height + 160);
  g.lineStyle(1, tint(MATHC.boardLit), 0.5 * dark);
  for (let gx = v.x + ((t * 20) % 48); gx < v.right; gx += 48) g.lineBetween(gx, v.y, gx, v.bottom);
  for (let gy = v.y + ((t * 14) % 48); gy < v.bottom; gy += 48) g.lineBetween(v.x, gy, v.right, gy);
  // Rings closing on the caster.
  for (let i = 0; i < 5; i++) {
    const f = 1 - ((t * 0.55 + i / 5) % 1);
    g.lineStyle(2, tint(i % 2 ? MATHC.graph : MATHC.chalk), dark * (1 - f) * 0.7);
    g.strokeCircle(x, y, 30 + f * 300);
  }
  // Spokes of chalk light.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + t * 0.5;
    chalkLine(g, x + Math.cos(a) * 44, y + Math.sin(a) * 44, x + Math.cos(a) * (120 + 160 * surge), y + Math.sin(a) * (120 + 160 * surge),
      tint(MATHC.graphHot), dark * (0.15 + 0.45 * surge), 2);
  }
  g.fillStyle(tint(MATHC.graphHot), dark * (0.12 + 0.5 * surge));
  g.fillCircle(x, y, 40 + 30 * surge);
}
