import Phaser from 'phaser';
import { mix } from './Theme';

/**
 * The Lab's glass. Every ingredient is a vial with its own silhouette — Fire's is a teardrop,
 * Water's a round bulb, Life's a tall tube, Air's a conical flask, Earth's a squat jar, and so
 * on — so a bench full of them reads as ten different bottles rather than ten tokens. The big
 * flask in the middle takes whatever is poured in as coloured layers.
 *
 * Vials are symmetric about their axis and described by a half-width profile `w(u)` for
 * `u` 0 (mouth) → 1 (foot), which is what lets the liquid be clipped to the glass without a
 * mask: the fill is the same profile sampled from the liquid line down.
 */

export type VialShape = 'drop' | 'round' | 'tube' | 'conical' | 'jar' | 'zigzag' | 'skull' | 'diamond' | 'bell' | 'star';

/** Which bottle each element comes in. */
export const VIAL_SHAPE_FOR: Record<string, VialShape> = {
  fire: 'drop', water: 'round', life: 'tube', air: 'conical', earth: 'jar',
  electricity: 'zigzag', slime: 'skull', fate: 'diamond', sound: 'bell', light: 'star',
};

const GLASS = 0xd6ecff;
const CORK = 0x8a6a44;
const CORK_DARK = 0x5a4228;
const INK = 0x10141c;

const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

/** Half-width (0–1 of the vial's half width) at `u` down the vial. */
function profile(shape: VialShape, u: number): number {
  const circle = (c: number, r: number): number => Math.sqrt(Math.max(0, r * r - (u - c) * (u - c))) / r;
  switch (shape) {
    case 'drop': return u < 0.28 ? 0.2 : Math.pow(Math.sin(((u - 0.28) / 0.72) * Math.PI), 0.55) * (u < 0.75 ? 1 : 1) * Math.min(1, (1 - u) * 8 + 0.15);
    case 'round': return u < 0.36 ? 0.18 : circle(0.68, 0.32);
    case 'tube': return u > 0.88 ? circle(0.88, 0.12) * 0.34 + (u > 0.88 ? 0 : 0) : 0.34;
    case 'conical': return u < 0.3 ? 0.22 : u > 0.96 ? 0.98 : 0.22 + ((u - 0.3) / 0.66) * 0.78;
    case 'jar': return u < 0.14 ? 0.6 : u > 0.94 ? 0.9 * circle(0.94, 0.06) * 0.3 + 0.62 : 0.92;
    case 'zigzag': return u < 0.42 ? 0.15 : u < 0.5 ? 0.15 + ((u - 0.42) / 0.08) * 0.6 : u > 0.94 ? 0.75 - ((u - 0.94) / 0.06) * 0.4 : 0.75;
    case 'skull': return u < 0.3 ? 0.2 : circle(0.66, 0.36) * (u > 0.85 ? 0.92 : 1);
    case 'diamond': return u < 0.24 ? 0.15 : u < 0.6 ? 0.15 + ((u - 0.24) / 0.36) * 0.85 : 1 - ((u - 0.6) / 0.4) * 0.7;
    case 'bell': return u < 0.2 ? 0.26 : 0.26 + Math.pow((u - 0.2) / 0.8, 2.2) * 0.74;
    case 'star': return u < 0.34 ? 0.16 : circle(0.68, 0.32);
  }
}

export interface VialOpts {
  /** 0–1 how full the liquid is. */
  fill?: number;
  /** Rotation about the foot, radians. The liquid rides with the glass. */
  tilt?: number;
  alpha?: number;
  /** 0–1 hover lift. */
  lit?: number;
  t?: number;
  /** Greyed, for an ingredient the bench will not take right now. */
  muted?: boolean;
}

/**
 * One vial, foot at `(cx, footY)`, `s` the half-width of the widest shape, `h` the full height.
 * Returns the local mouth point (for pouring from) in world space.
 */
export function drawVial(
  g: Phaser.GameObjects.Graphics, shape: VialShape, cx: number, footY: number, s: number, h: number,
  color: number, opts: VialOpts = {},
): { mouthX: number; mouthY: number } {
  const a = opts.alpha ?? 1;
  const lit = opts.lit ?? 0;
  const t = opts.t ?? 0;
  const tilt = opts.tilt ?? 0;
  const fill = Phaser.Math.Clamp(opts.fill ?? 0.72, 0, 1);
  const c = Math.cos(tilt);
  const sn = Math.sin(tilt);
  const W = (lx: number, ly: number): Phaser.Geom.Point => P(cx + lx * c - ly * sn, footY + lx * sn + ly * c);
  const liquid = opts.muted ? mix(color, 0x50505a, 0.7) : mix(color, 0xffffff, lit * 0.15);
  const liquidLit = mix(liquid, 0xffffff, 0.45);
  const liquidDeep = mix(liquid, 0x000000, 0.35);
  const glass = opts.muted ? mix(GLASS, 0x50505a, 0.6) : GLASS;

  const N = 26;
  const left: Phaser.Geom.Point[] = [];
  const right: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const w = profile(shape, u) * s;
    const ly = -h + u * h;
    left.push(W(-w, ly));
    right.push(W(w, ly));
  }
  const outline = [...left, ...right.slice().reverse()];

  // Shadow at the foot (upright only — a tilted vial is in the air).
  if (Math.abs(tilt) < 0.05) {
    g.fillStyle(0x000000, a * 0.35);
    g.fillEllipse(cx, footY + 2, s * 2.2, s * 0.5);
  }
  // Glass: dark edge, pale body.
  g.lineStyle(2.2, INK, a);
  g.strokePoints(outline, true);
  g.fillStyle(glass, a * 0.42);
  g.fillPoints(outline, true, true);

  // Liquid: the same profile from the liquid line down. Row-sampled so the surface is flat in
  // the glass's own frame.
  if (fill > 0.02) {
    const uTop = 1 - fill * 0.78;
    const lq: Phaser.Geom.Point[] = [];
    const rq: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= N; i++) {
      const u = uTop + (1 - uTop) * (i / N);
      const w = Math.max(0, profile(shape, u) * s - 1.6);
      const ly = -h + u * h;
      lq.push(W(-w, ly));
      rq.push(W(w, ly));
    }
    g.fillStyle(liquidDeep, a * 0.95);
    g.fillPoints([...lq, ...rq.slice().reverse()], true, true);
    // Body colour inset, lit meniscus, a bubble or two.
    const inset: Phaser.Geom.Point[] = [];
    const insetR: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= N; i++) {
      const u = uTop + (1 - uTop) * (i / N);
      const w = Math.max(0, profile(shape, u) * s - 3.5);
      const ly = -h + u * h + 2;
      inset.push(W(-w * 0.8 - w * 0.2 * (1 - i / N), ly));
      insetR.push(W(w * 0.55, ly));
    }
    g.fillStyle(liquid, a * 0.9);
    g.fillPoints([...inset, ...insetR.slice().reverse()], true, true);
    const sw = Math.max(0, profile(shape, uTop) * s - 1.6);
    const m0 = W(-sw, -h + uTop * h);
    const m1 = W(sw, -h + uTop * h);
    g.lineStyle(2, liquidLit, a * 0.9);
    g.lineBetween(m0.x, m0.y, m1.x, m1.y);
    for (let i = 0; i < 2; i++) {
      const ph = (t * 0.4 + i * 0.5 + cx * 0.01) % 1;
      const bu = 1 - 0.05 - ph * (1 - uTop - 0.1);
      const bw = profile(shape, bu) * s * 0.5 * (i ? -1 : 1);
      const b = W(bw, -h + bu * h);
      g.lineStyle(1, liquidLit, a * (1 - ph) * 0.8);
      g.strokeCircle(b.x, b.y, 1.2 + i * 0.6);
    }
  }

  // Shape-specific marks.
  switch (shape) {
    case 'skull': {
      // Two eye sockets and a nose notch cut into the glass, so it is a skull bottle.
      for (const sx of [-0.28, 0.28]) {
        const e = W(sx * s, -h * 0.4);
        g.fillStyle(INK, a * 0.85); g.fillEllipse(e.x, e.y, s * 0.3, s * 0.36);
        g.fillStyle(liquidLit, a * 0.6); g.fillCircle(e.x + s * 0.04, e.y + s * 0.04, s * 0.06);
      }
      const n = W(0, -h * 0.24);
      g.fillStyle(INK, a * 0.85); g.fillTriangle(n.x - s * 0.08, n.y + s * 0.1, n.x + s * 0.08, n.y + s * 0.1, n.x, n.y - s * 0.08);
      break;
    }
    case 'zigzag': {
      // A bolt etched down the body.
      const pts = [[0.1, -0.5], [-0.15, -0.3], [0.12, -0.3], [-0.12, -0.08]].map(([x, y]) => W(x * s, y * h));
      g.lineStyle(2, mix(color, 0xffffff, 0.6), a * 0.9);
      g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
      break;
    }
    case 'star': {
      // A star-cut stopper.
      const top = W(0, -h - s * 0.3);
      const star: Phaser.Geom.Point[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? s * 0.18 : s * 0.4;
        const ang = -Math.PI / 2 + (i / 10) * Math.PI * 2 + tilt;
        star.push(P(top.x + Math.cos(ang) * r, top.y + Math.sin(ang) * r));
      }
      g.lineStyle(1.5, INK, a); g.strokePoints(star, true);
      g.fillStyle(mix(color, 0xffffff, 0.5), a); g.fillPoints(star, true, true);
      break;
    }
    case 'bell': {
      // A clapper-like bead hanging in the neck, and a rim band.
      const rim0 = W(-s, -s * 0.0);
      const rim1 = W(s, -s * 0.0);
      g.lineStyle(2.5, mix(0xc89a3c, 0xffffff, 0.2), a); g.lineBetween(rim0.x, rim0.y, rim1.x, rim1.y);
      break;
    }
    case 'jar': {
      // A paper label with a scrawl.
      const l0 = W(-s * 0.55, -h * 0.62);
      g.fillStyle(0xe6d7b0, a * 0.95); g.fillRect(l0.x, l0.y, s * 1.1, h * 0.26);
      g.lineStyle(1, 0x4a3a2a, a * 0.6);
      g.lineBetween(l0.x + 3, l0.y + 5, l0.x + s * 0.8, l0.y + 5);
      g.lineBetween(l0.x + 3, l0.y + 10, l0.x + s * 0.6, l0.y + 10);
      break;
    }
    case 'tube': {
      // Graduation marks.
      g.lineStyle(1, 0xffffff, a * 0.5);
      for (let i = 1; i <= 4; i++) {
        const m0 = W(-s * 0.34 + 1, -h + (i / 6) * h);
        const m1 = W(-s * 0.34 + (i % 2 ? 6 : 9), -h + (i / 6) * h);
        g.lineBetween(m0.x, m0.y, m1.x, m1.y);
      }
      break;
    }
    default: break;
  }

  // Highlight down the left of the glass, and the cork (unless it is a star stopper).
  g.lineStyle(1.5, 0xffffff, a * 0.45);
  const h0 = W(-profile(shape, 0.45) * s + 3, -h * 0.55);
  const h1 = W(-profile(shape, 0.8) * s + 3, -h * 0.2);
  g.lineBetween(h0.x, h0.y, h1.x, h1.y);
  const mouthW = profile(shape, 0) * s;
  if (shape !== 'star' && shape !== 'bell') {
    const k0 = W(-mouthW - 1.5, -h - s * 0.28);
    const corkPts = [k0, W(mouthW + 1.5, -h - s * 0.28), W(mouthW - 0.5, -h + s * 0.1), W(-mouthW + 0.5, -h + s * 0.1)];
    g.fillStyle(INK, a); g.fillPoints(corkPts.map((p) => P(p.x, p.y + 1)), true, true);
    g.fillStyle(CORK, a); g.fillPoints(corkPts, true, true);
    const c0 = W(-mouthW, -h - s * 0.2);
    const c1 = W(mouthW, -h - s * 0.2);
    g.lineStyle(1, CORK_DARK, a); g.lineBetween(c0.x, c0.y, c1.x, c1.y);
  }
  // Mouth rim.
  const r0 = W(-mouthW - 2, -h);
  const r1 = W(mouthW + 2, -h);
  g.lineStyle(2, mix(glass, 0xffffff, 0.3), a * 0.8); g.lineBetween(r0.x, r0.y, r1.x, r1.y);

  const mouth = W(0, -h);
  return { mouthX: mouth.x, mouthY: mouth.y };
}

/** One poured layer in the flask. */
export interface FlaskLayer { color: number; emoji: string }

export interface FlaskOpts {
  /** How many layers the flask holds when full. */
  capacity: number;
  /** 0–1 extra fill on the newest layer, for the pour animation. */
  pourT?: number;
  /** 0–1 boiling: bubbles, a shimmer, the burner flame. */
  heat?: number;
  /** 0–1 the success glow. */
  glow?: number;
  /** The King's flask: a crack across the bulb, a chip out of the rim, a greener glass. */
  cracked?: boolean;
  t?: number;
  alpha?: number;
}

const FLASK_R = 62;
const NECK_W = 22;
const NECK_H = 46;

/** Where the flask's mouth is, given its bulb centre. */
export function flaskMouth(cx: number, cy: number): { x: number; y: number } {
  return { x: cx, y: cy - FLASK_R - NECK_H + 8 };
}

/**
 * The big round-bottom flask on its tripod over a burner, bulb centred on `(cx, cy)`.
 * Layers stack from the bottom; each takes `1 / capacity` of the bulb's height.
 */
export function drawFlask(
  g: Phaser.GameObjects.Graphics, cx: number, cy: number, layers: FlaskLayer[], opts: FlaskOpts,
): void {
  const a = opts.alpha ?? 1;
  const t = opts.t ?? 0;
  const heat = opts.heat ?? 0;
  const glow = opts.glow ?? 0;
  const R = FLASK_R;
  const footY = cy + R + 28;

  // ── Tripod and burner ──
  g.lineStyle(3, 0x3b3a44, a);
  for (const dx of [-1, 1]) g.lineBetween(cx + dx * 26, cy + R - 6, cx + dx * 54, footY);
  g.lineBetween(cx, cy + R - 4, cx + 6, footY);
  g.lineStyle(4, 0x3b3a44, a); g.strokeEllipse(cx, cy + R - 6, 64, 16);
  g.lineStyle(1.5, 0x7a7a8c, a * 0.8); g.strokeEllipse(cx, cy + R - 7, 62, 14);
  // Burner: a brass base, a stem, a blue flame when hot.
  g.fillStyle(0x15121a, a); g.fillEllipse(cx, footY, 36, 10);
  g.fillStyle(0x8a6a2a, a); g.fillRoundedRect(cx - 14, footY - 10, 28, 8, 2);
  g.fillStyle(0xc89a3c, a); g.fillRect(cx - 4, footY - 30, 8, 22);
  g.fillStyle(0x5a4a1a, a); g.fillRect(cx - 5, footY - 30, 10, 3);
  if (heat > 0.02) {
    const fh = 20 + heat * 16 + Math.sin(t * 18) * 2;
    g.fillStyle(0x4fa8ff, a * 0.85 * heat); g.fillTriangle(cx - 8, footY - 30, cx + 8, footY - 30, cx, footY - 30 - fh);
    g.fillStyle(0xbfe6ff, a * heat); g.fillTriangle(cx - 3.5, footY - 30, cx + 3.5, footY - 30, cx, footY - 30 - fh * 0.55);
    for (let k = 3; k >= 1; k--) { g.fillStyle(0x4fa8ff, a * 0.06 * heat); g.fillCircle(cx, cy + R, 14 + k * 10); }
  }

  // ── Glass ──
  if (glow > 0) {
    for (let k = 6; k >= 1; k--) { g.fillStyle(0xffffff, a * 0.05 * glow); g.fillCircle(cx, cy, R + k * 9); }
  }
  g.fillStyle(0x000000, a * 0.3); g.fillEllipse(cx + 4, cy + 6, R * 2, R * 2);
  g.lineStyle(2.5, INK, a);
  g.strokeCircle(cx, cy, R);
  g.fillStyle(GLASS, a * 0.4); g.fillCircle(cx, cy, R);
  // Neck: a flared tube out of the top of the bulb, open.
  const nt = cy - R - NECK_H;
  g.fillStyle(INK, a);
  g.fillPoints([P(cx - NECK_W - 2, nt - 2), P(cx + NECK_W + 2, nt - 2), P(cx + NECK_W * 0.75 + 2, cy - R + 14), P(cx - NECK_W * 0.75 - 2, cy - R + 14)], true, true);
  g.fillStyle(GLASS, a * 0.5);
  g.fillPoints([P(cx - NECK_W, nt), P(cx + NECK_W, nt), P(cx + NECK_W * 0.75, cy - R + 14), P(cx - NECK_W * 0.75, cy - R + 14)], true, true);
  g.fillStyle(GLASS, a * 0.45); g.fillCircle(cx, cy, R - 2);
  g.lineStyle(2, mix(GLASS, 0xffffff, 0.4), a * 0.9); g.lineBetween(cx - NECK_W - 4, nt, cx + NECK_W + 4, nt);

  // ── Liquid layers, bottom up, clipped to the bulb ──
  const n = Math.max(1, opts.capacity);
  const bottom = cy + R - 3;
  const top = cy - R * 0.72;
  const layerH = (bottom - top) / n;
  layers.forEach((layer, i) => {
    const isNew = i === layers.length - 1 && opts.pourT !== undefined && opts.pourT < 1;
    const frac = isNew ? opts.pourT! : 1;
    const y1 = bottom - i * layerH;
    const y0 = y1 - layerH * frac;
    const deep = mix(layer.color, 0x000000, 0.3);
    const lit = mix(layer.color, 0xffffff, 0.45);
    for (let yy = Math.ceil(y0); yy <= y1; yy++) {
      const dy = yy - cy;
      const half = Math.sqrt(Math.max(0, (R - 3) * (R - 3) - dy * dy));
      if (half <= 0) continue;
      const wob = heat > 0 ? Math.sin(t * 14 + yy * 0.3) * heat * 1.2 : 0;
      g.fillStyle(yy - y0 < 2.5 ? lit : deep, a * 0.95);
      g.fillRect(cx - half + 1, yy + wob, half * 2 - 2, 1.1);
      if (yy - y0 > 2.5 && (yy - y0) < layerH * 0.45) {
        g.fillStyle(layer.color, a * 0.6);
        g.fillRect(cx - half * 0.9 + 1, yy + wob, half * 1.1, 1.1);
      }
    }
  });
  // Surface shimmer and bubbles while heating.
  if (layers.length > 0) {
    const surface = bottom - layers.length * layerH + (opts.pourT !== undefined && opts.pourT < 1 ? layerH * (1 - opts.pourT) : 0);
    const dy = surface - cy;
    const half = Math.sqrt(Math.max(0, (R - 4) * (R - 4) - dy * dy));
    const topColor = layers[layers.length - 1].color;
    g.fillStyle(mix(topColor, 0xffffff, 0.5), a * 0.8);
    g.fillEllipse(cx, surface, half * 2, 4 + heat * 3);
    if (heat > 0.02) {
      const count = Math.round(4 + heat * 10);
      for (let i = 0; i < count; i++) {
        const ph = (t * (0.9 + (i % 3) * 0.3) + i * 0.37) % 1;
        const bx = cx + Math.sin(i * 2.3) * half * 0.8;
        const by = bottom - 6 - ph * (bottom - surface - 4);
        g.lineStyle(1, mix(topColor, 0xffffff, 0.6), a * heat * (1 - ph * 0.5));
        g.strokeCircle(bx, by, 1.5 + ph * 2.5 + heat);
      }
      // Steam off the mouth.
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.5 + i * 0.33) % 1;
        g.fillStyle(0xffffff, a * heat * 0.25 * (1 - ph));
        g.fillCircle(cx + Math.sin(t * 2 + i * 2) * 8, nt - 6 - ph * 40, 5 + ph * 10);
      }
    }
  }
  // Glass highlights over the liquid.
  g.fillStyle(0xffffff, a * 0.35); g.fillEllipse(cx - R * 0.5, cy - R * 0.35, R * 0.26, R * 0.7);
  g.fillStyle(0xffffff, a * 0.18); g.fillEllipse(cx + R * 0.55, cy + R * 0.3, R * 0.12, R * 0.3);
  g.lineStyle(1.5, 0xffffff, a * 0.4); g.lineBetween(cx - NECK_W + 5, nt + 6, cx - NECK_W * 0.75 + 5, cy - R + 8);
  if (opts.cracked) {
    // A crack wandering across the bulb, a chip out of the rim, and a green film on the glass.
    g.fillStyle(0x7cc93d, a * 0.08); g.fillCircle(cx, cy, R - 2);
    g.lineStyle(1.3, 0xffffff, a * 0.7);
    g.beginPath();
    g.moveTo(cx + R * 0.2, cy - R * 0.9);
    g.lineTo(cx + R * 0.05, cy - R * 0.5); g.lineTo(cx + R * 0.3, cy - R * 0.2); g.lineTo(cx + R * 0.1, cy + R * 0.15); g.lineTo(cx + R * 0.35, cy + R * 0.5);
    g.strokePath();
    g.lineStyle(1, 0xffffff, a * 0.5);
    g.beginPath(); g.moveTo(cx + R * 0.05, cy - R * 0.5); g.lineTo(cx - R * 0.25, cy - R * 0.35); g.strokePath();
    g.fillStyle(0x0d0a16, a); g.fillTriangle(cx + NECK_W - 4, nt - 2, cx + NECK_W + 5, nt - 2, cx + NECK_W + 1, nt + 7);
  }
}

/** A broken flask: the base left standing, jagged. Drawn where the flask stood. */
export function drawBrokenFlask(g: Phaser.GameObjects.Graphics, cx: number, cy: number, alpha = 1): void {
  const R = FLASK_R;
  const footY = cy + R + 28;
  g.lineStyle(3, 0x3b3a44, alpha);
  for (const dx of [-1, 1]) g.lineBetween(cx + dx * 26, cy + R - 6, cx + dx * 54, footY);
  g.lineStyle(4, 0x3b3a44, alpha); g.strokeEllipse(cx, cy + R - 6, 64, 16);
  g.fillStyle(0x15121a, alpha); g.fillEllipse(cx, footY, 36, 10);
  g.fillStyle(0x8a6a2a, alpha); g.fillRoundedRect(cx - 14, footY - 10, 28, 8, 2);
  g.fillStyle(0xc89a3c, alpha); g.fillRect(cx - 4, footY - 30, 8, 22);
  // The bottom third of the bulb, sheared off in a jag.
  const pts: Phaser.Geom.Point[] = [];
  const N = 16;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const ang = Math.PI * 0.15 + u * Math.PI * 0.7;
    pts.push(P(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R));
  }
  for (let i = N; i >= 0; i--) {
    const u = i / N;
    const jag = (i % 2 ? 10 : -4) + Math.sin(i * 3.1) * 6;
    const ang = Math.PI * 0.15 + u * Math.PI * 0.7;
    pts.push(P(cx + Math.cos(ang) * (R - 2), cy + Math.sin(ang) * (R - 2) - 22 - jag));
  }
  g.lineStyle(2.5, INK, alpha); g.strokePoints(pts, true);
  g.fillStyle(GLASS, alpha * 0.4); g.fillPoints(pts, true, true);
}
