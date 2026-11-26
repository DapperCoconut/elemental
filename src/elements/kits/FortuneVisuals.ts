import Phaser from 'phaser';
import { ArmGesture, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Gold draws.
 *
 * Gold is an alchemist — goggles up on the brow, a golden cane in one hand and the other hand
 * permanently warm with transmuting magic. The element has one material and one verb. The
 * material is **gold**: brass in shadow, bright metal in the body, near-white where it catches
 * the light. The verb is **gilding**: almost everything here starts life as something else —
 * a blade of grass, a bag of powder, the floor, an enemy's bullet, an enemy — and is drawn in
 * the middle of turning into gold. A gilding shape is always painted the same way: its own
 * colour underneath, and a gold layer that creeps over it with a bright leading edge.
 *
 * Every colour goes through the `tint` mapper so a skin can remap the palette in one table.
 */

export type FortuneColorFn = ColorFn;

export const FOR = {
  /** The bottom of the ladder — shadows, a dark lens, the inside of a crack. */
  ink: 0x17110a,
  soot: 0x2e2416,
  /** Gold, dark to bright. Everything that is worth something is one of these four. */
  brass: 0xa8791e,
  gold: 0xf0c33c,
  goldLit: 0xfff0a8,
  hot: 0xfffbe6,
  /** Grass — what the click starts as, before the hand gets to it. */
  grassDark: 0x2f6b26,
  grass: 0x5aa83a,
  grassLit: 0xa8e070,
  /** The heart, when it is about to give out. */
  blood: 0xb3202e,
  bloodLit: 0xff5a5a,
  /** Goggle lenses. */
  glass: 0xffb43a,
  /** Goggle strap and the powder bag. */
  leather: 0x6b4423,
  leatherLit: 0x8f6234,
  /** The dust in the plume — a warm, pale haze between gold and canvas. */
  dust: 0xf6dc8a,
};

export type StatKind = 'might' | 'hide' | 'stride' | 'haste' | 'vigor' | 'greed' | 'sheaf' | 'mend';

const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

/** Deterministic 0–1 noise, so a patch keeps its shape every frame. */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 61.7 + i * 91.3) * 24571.117;
  return v - Math.floor(v);
}

/** Linear blend of two 0xRRGGBB colours. */
export function mix(a: number, b: number, t: number): number {
  const k = Phaser.Math.Clamp(t, 0, 1);
  const r = ((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * k);
  const gg = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * k);
  const bb = (a & 255) + (((b & 255) - (a & 255)) * k);
  return (Math.round(r) << 16) | (Math.round(gg) << 8) | Math.round(bb);
}

/** A four-point twinkle — the element's glint, used on every gold surface. */
function twinkle(g: Phaser.GameObjects.Graphics, color: number, x: number, y: number, r: number, alpha: number): void {
  if (alpha <= 0.01 || r <= 0.2) return;
  g.fillStyle(color, alpha);
  g.fillPoints([P(x, y - r), P(x + r * 0.22, y - r * 0.22), P(x + r, y), P(x + r * 0.22, y + r * 0.22),
    P(x, y + r), P(x - r * 0.22, y + r * 0.22), P(x - r, y), P(x - r * 0.22, y - r * 0.22)], true);
}

// ── Grass blade (Click) ───────────────────────────────────────────────────

/**
 * One blade of grass, from root `(x, y)` along `ang`, `len` long. A tapered, slightly curved
 * leaf with a midrib. `gild` 0 is plain green, 1 is solid gold; between, the gold creeps up from
 * the root with a bright leading edge, so the transmutation is visible blade by blade.
 */
export function grassBlade(
  g: Phaser.GameObjects.Graphics, tint: FortuneColorFn,
  x: number, y: number, ang: number, len: number, gild: number, alpha: number,
): void {
  if (alpha <= 0.01) return;
  const k = Phaser.Math.Clamp(gild, 0, 1);
  const cx = Math.cos(ang), cy = Math.sin(ang);
  const nx = -cy, ny = cx;
  const halfW = Math.max(1.4, len * 0.13);
  const bend = len * 0.12;
  const pt = (u: number, side: number): Phaser.Geom.Point => {
    // Width swells to a third of the way along, then tapers to a point.
    const w = halfW * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u * 0.35);
    const off = bend * u * u + side * w;
    return P(x + cx * len * u + nx * off, y + cy * len * u + ny * off);
  };
  const outline = (u0: number, u1: number): Phaser.Geom.Point[] => {
    const pts: Phaser.Geom.Point[] = [];
    const steps = 6;
    for (let i = 0; i <= steps; i++) pts.push(pt(u0 + (u1 - u0) * (i / steps), 1));
    for (let i = steps; i >= 0; i--) pts.push(pt(u0 + (u1 - u0) * (i / steps), -1));
    return pts;
  };
  // The green leaf.
  if (k < 1) {
    g.fillStyle(tint(FOR.grassDark), alpha);
    g.fillPoints(outline(0, 1), true);
    g.fillStyle(tint(FOR.grass), alpha * 0.95);
    const inner = outline(0.05, 0.95).map((p, i, arr) => {
      const mid = arr[Math.floor(arr.length / 2)];
      return P(p.x + (mid.x - p.x) * 0.25 * (i % 2), p.y + (mid.y - p.y) * 0.25 * (i % 2));
    });
    g.fillPoints(inner, true);
  }
  // The gold, up to where the gilding has reached.
  if (k > 0) {
    const reach = Math.max(0.05, k);
    g.fillStyle(tint(FOR.brass), alpha);
    g.fillPoints(outline(0, reach), true);
    g.fillStyle(tint(FOR.gold), alpha);
    g.fillPoints(outline(0.04, Math.max(0.05, reach - 0.04)), true);
    if (k < 1) {
      // The leading edge: a hot band where grass is becoming metal.
      const e = pt(reach, 0);
      g.fillStyle(tint(FOR.hot), alpha * 0.9);
      g.fillCircle(e.x, e.y, halfW * 1.2);
    }
  }
  // Midrib.
  const a = pt(0.04, 0), b = pt(0.55, 0), c = pt(0.9, 0);
  g.lineStyle(Math.max(0.7, halfW * 0.35), tint(k > 0.5 ? FOR.goldLit : FOR.grassLit), alpha * 0.85);
  g.beginPath();
  g.moveTo(a.x, a.y);
  g.lineTo(b.x, b.y);
  g.lineTo(c.x, c.y);
  g.strokePath();
  if (k >= 1) twinkle(g, tint(FOR.hot), pt(0.4, 0.3).x, pt(0.4, 0.3).y, halfW * 1.4, alpha * 0.7);
}

// ── Powder bag (R) ────────────────────────────────────────────────────────

// ── Gold plume (R, persistent) ────────────────────────────────────────────

// ── Golden heart (F) ──────────────────────────────────────────────────────

/**
 * The golden heart over a victim's head. A two-lobed heart with the stumps of its vessels, a
 * lit top, and a beat that quickens with stress. Past half it reddens from the inside and
 * cracks; under it a small arc gauge fills with the stress itself.
 */
export function goldenHeart(
  g: Phaser.GameObjects.Graphics, tint: FortuneColorFn,
  x: number, y: number, stress: number, t: number, alpha: number,
): void {
  if (alpha <= 0.01) return;
  const s = Phaser.Math.Clamp(stress, 0, 1);
  const rate = 1.4 + s * 4.5;
  const beatPhase = (t * rate) % 1;
  const beat = beatPhase < 0.18 ? Math.sin((beatPhase / 0.18) * Math.PI) : 0;
  const size = 8 * (1 + beat * (0.12 + s * 0.12));
  const shake = s > 0.75 ? (Math.sin(t * 61) * (s - 0.75) * 4) : 0;
  const hx = x + shake;
  const heartPts = (sz: number, ox = 0, oy = 0): Phaser.Geom.Point[] => {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU;
      // Classic parametric heart, scaled to ~2sz wide.
      const px = 16 * Math.pow(Math.sin(a), 3);
      const py = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
      pts.push(P(hx + ox + px * sz / 16, y + oy + py * sz / 16));
    }
    return pts;
  };
  // Halo, red-shifted by stress.
  g.fillStyle(tint(mix(FOR.gold, FOR.blood, s)), alpha * (0.18 + beat * 0.18));
  g.fillCircle(hx, y, size * 1.9);
  // Vessels: two short stumps out of the top.
  g.fillStyle(tint(FOR.brass), alpha);
  g.fillRect(hx - size * 0.45, y - size * 1.25, size * 0.28, size * 0.55);
  g.fillRect(hx + size * 0.1, y - size * 1.35, size * 0.3, size * 0.6);
  // Rim, body, inner glow.
  g.fillStyle(tint(FOR.brass), alpha);
  g.fillPoints(heartPts(size * 1.12), true);
  g.fillStyle(tint(mix(FOR.gold, FOR.blood, Math.max(0, s - 0.35) * 1.2)), alpha);
  g.fillPoints(heartPts(size), true);
  g.fillStyle(tint(mix(FOR.goldLit, FOR.bloodLit, Math.max(0, s - 0.5) * 2)), alpha * 0.85);
  g.fillPoints(heartPts(size * 0.55, -size * 0.22, -size * 0.18), true);
  twinkle(g, tint(FOR.hot), hx - size * 0.45, y - size * 0.45, size * 0.45, alpha * 0.9);
  // Cracks once the strain gets serious.
  if (s > 0.5) {
    const c = (s - 0.5) * 2;
    g.lineStyle(1.1, tint(FOR.ink), alpha * c);
    g.beginPath();
    g.moveTo(hx + size * 0.1, y - size * 0.6);
    g.lineTo(hx - size * 0.15, y - size * 0.1);
    g.lineTo(hx + size * 0.2, y + size * 0.25);
    g.lineTo(hx - size * 0.05, y + size * 0.7);
    g.strokePath();
    if (c > 0.5) {
      g.beginPath();
      g.moveTo(hx - size * 0.15, y - size * 0.1);
      g.lineTo(hx - size * 0.55, y + size * 0.05);
      g.strokePath();
    }
  }
  // Stress gauge: an arc under the heart, track then fill.
  const gr = size * 1.75;
  const a0 = Math.PI * 0.2, a1 = Math.PI * 0.8;
  g.lineStyle(3, tint(FOR.ink), alpha * 0.55);
  g.beginPath();
  g.arc(hx, y, gr, a0, a1, false);
  g.strokePath();
  if (s > 0.01) {
    g.lineStyle(2, tint(mix(FOR.gold, FOR.bloodLit, s)), alpha);
    g.beginPath();
    g.arc(hx, y, gr, a1, a1 - (a1 - a0) * s, true);
    g.strokePath();
  }
}

// ── Coins ─────────────────────────────────────────────────────────────────

// ── Advance cards (E) ─────────────────────────────────────────────────────

/**
 * One stat card over the alchemist's head: a parchment-on-brass plate with a stamped gold
 * border, a glyph for the stat in its upper half, and room underneath for the kit's label.
 * `(x, y)` is the card's centre.
 */
export function advanceCard(
  g: Phaser.GameObjects.Graphics, tint: FortuneColorFn,
  x: number, y: number, w: number, h: number, kind: StatKind, hover: boolean, alpha: number, t = 0,
): void {
  if (alpha <= 0.01) return;
  const l = x - w / 2, tp = y - h / 2, r = l + w, b = tp + h;
  const c = 6;
  const plate = (inset: number): Phaser.Geom.Point[] => {
    const k = c - inset * 0.4;
    return [P(l + inset + k, tp + inset), P(r - inset - k, tp + inset), P(r - inset, tp + inset + k),
      P(r - inset, b - inset - k), P(r - inset - k, b - inset), P(l + inset + k, b - inset),
      P(l + inset, b - inset - k), P(l + inset, tp + inset + k)];
  };
  if (hover) {
    g.fillStyle(tint(FOR.gold), alpha * (0.22 + 0.1 * Math.sin(t * 6)));
    g.fillCircle(x, y, Math.max(w, h) * 0.62);
  }
  // Drop shadow, brass case, then the dark recipe well.
  g.fillStyle(tint(FOR.ink), alpha * 0.5);
  g.fillPoints(plate(0).map((q) => P(q.x + 2, q.y + 3)), true);
  g.fillStyle(tint(FOR.brass), alpha);
  g.fillPoints(plate(0), true);
  g.fillStyle(tint(FOR.gold), alpha * 0.55);
  g.fillPoints([P(l + c, tp), P(r - c, tp), P(r - 1.5, tp + c - 1.5), P(l + 1.5, tp + c - 1.5)], true);
  g.fillStyle(tint(FOR.soot), alpha * 0.96);
  g.fillPoints(plate(2.5), true);
  // Ingot header: a trapezoid bar of bright gold across the top, bevelled.
  const ih = h * 0.11;
  g.fillStyle(tint(FOR.brass), alpha);
  g.fillPoints([P(l + 7, tp + 4), P(r - 7, tp + 4), P(r - 10, tp + 4 + ih), P(l + 10, tp + 4 + ih)], true);
  g.fillStyle(tint(hover ? FOR.goldLit : FOR.gold), alpha);
  g.fillPoints([P(l + 9, tp + 4.6), P(r - 9, tp + 4.6), P(r - 11, tp + 3.4 + ih), P(l + 11, tp + 3.4 + ih)], true);
  g.lineStyle(0.8, tint(FOR.hot), alpha * 0.8);
  g.lineBetween(l + 10, tp + 5.4, r - 10, tp + 5.4);
  // Frame hairline.
  g.lineStyle(hover ? 1.8 : 1.1, tint(hover ? FOR.goldLit : FOR.gold), alpha);
  g.strokePoints(plate(2.5), true, true);
  // Corner rivets.
  g.fillStyle(tint(FOR.goldLit), alpha * 0.9);
  for (const [cx, cy] of [[l + 5, tp + 8], [r - 5, tp + 8], [l + 5, b - 5], [r - 5, b - 5]]) {
    g.fillCircle(cx, cy, 1.2);
  }
  // Glyph area: a turning transmutation circle — ring, inscribed triangle, inner ring.
  const gx = x, gy = tp + h * 0.38;
  const s = Math.min(w, h) * 0.22;
  const cr = s * 1.6;
  g.fillStyle(tint(FOR.gold), alpha * 0.12);
  g.fillCircle(gx, gy, cr);
  g.lineStyle(0.9, tint(FOR.gold), alpha * 0.55);
  g.strokeCircle(gx, gy, cr);
  g.strokeCircle(gx, gy, cr * 0.62);
  const spin = t * (hover ? 1.4 : 0.5);
  const tri = [0, 1, 2].map((i) => P(gx + Math.cos(spin + i * TAU / 3 - Math.PI / 2) * cr,
    gy + Math.sin(spin + i * TAU / 3 - Math.PI / 2) * cr));
  g.lineStyle(0.8, tint(FOR.brass), alpha * 0.8);
  g.strokePoints(tri, true, true);
  for (let i = 0; i < 6; i++) {
    const a = -spin + (i / 6) * TAU;
    g.fillStyle(tint(FOR.goldLit), alpha * 0.7);
    g.fillCircle(gx + Math.cos(a) * cr, gy + Math.sin(a) * cr, 0.9);
  }
  statGlyph(g, tint, kind, gx, gy, s, alpha);
  // The label well: a recessed strip the kit's two lines of text sit in.
  g.fillStyle(tint(FOR.ink), alpha * 0.55);
  g.fillRect(l + 5, y + 10, w - 10, 22);
  g.lineStyle(0.8, tint(FOR.brass), alpha * 0.7);
  g.lineBetween(l + 6, y + 10, r - 6, y + 10);
  // Hover: a shimmer runs across the plate.
  if (hover) {
    const u = (t * 0.9) % 1;
    const sx = l + u * (w + 20) - 10;
    g.fillStyle(tint(FOR.hot), alpha * 0.22 * Math.sin(u * Math.PI));
    g.fillPoints([P(sx, tp + 3), P(sx + 7, tp + 3), P(sx - 3, b - 3), P(sx - 10, b - 3)], true);
  }
}

/**
 * The offer's fuse: a molten-gold pour along a brass trough. `left` is the share of time left.
 */
export function goldFuse(
  g: Phaser.GameObjects.Graphics, tint: FortuneColorFn,
  x: number, y: number, w: number, left: number, alpha: number, t: number,
): void {
  if (alpha <= 0.01) return;
  const k = Phaser.Math.Clamp(left, 0, 1);
  g.fillStyle(tint(FOR.ink), alpha * 0.7);
  g.fillRoundedRect(x - 1, y - 1, w + 2, 6, 3);
  g.fillStyle(tint(FOR.brass), alpha);
  g.fillCircle(x, y + 2, 3.2);
  g.fillCircle(x + w, y + 2, 3.2);
  if (k > 0.005) {
    const fw = w * k;
    g.fillStyle(tint(mix(FOR.bloodLit, FOR.gold, Math.min(1, k * 3))), alpha);
    g.fillRoundedRect(x, y, fw, 4, 2);
    g.fillStyle(tint(FOR.goldLit), alpha * 0.8);
    g.fillRect(x + 1, y + 0.6, Math.max(0, fw - 2), 1.1);
    // Ripples riding along the pour.
    for (let i = 0; i < 4; i++) {
      const u = ((t * 0.6 + i / 4) % 1) * fw;
      g.fillStyle(tint(FOR.hot), alpha * 0.55);
      g.fillCircle(x + u, y + 2, 1);
    }
    twinkle(g, tint(FOR.hot), x + fw, y + 2, 3.4 + Math.sin(t * 14) * 1.2, alpha);
  }
}

/** The drawn emblem for each stat. All gold, all straight from the alchemist's notebook. */
function statGlyph(
  g: Phaser.GameObjects.Graphics, tint: FortuneColorFn,
  kind: StatKind, x: number, y: number, s: number, alpha: number,
): void {
  const gold = tint(FOR.gold), lit = tint(FOR.goldLit), dark = tint(FOR.brass);
  switch (kind) {
    case 'might': {
      // A gilded fist: knuckles over a wrist.
      g.fillStyle(dark, alpha);
      g.fillRoundedRect(x - s * 0.8, y - s * 0.55, s * 1.6, s * 1.0, s * 0.3);
      g.fillStyle(gold, alpha);
      for (let i = 0; i < 4; i++) g.fillCircle(x - s * 0.6 + i * s * 0.4, y - s * 0.5, s * 0.24);
      g.fillRect(x - s * 0.4, y + s * 0.4, s * 0.8, s * 0.6);
      g.fillStyle(lit, alpha);
      g.fillRect(x - s * 0.7, y - s * 0.2, s * 1.0, s * 0.14);
      break;
    }
    case 'hide': {
      // A shield with a bullion bar across it.
      g.fillStyle(dark, alpha);
      g.fillPoints([P(x - s, y - s), P(x + s, y - s), P(x + s * 0.85, y + s * 0.2), P(x, y + s * 1.1), P(x - s * 0.85, y + s * 0.2)], true);
      g.fillStyle(gold, alpha);
      g.fillPoints([P(x - s * 0.75, y - s * 0.78), P(x + s * 0.75, y - s * 0.78), P(x + s * 0.62, y + s * 0.1), P(x, y + s * 0.82), P(x - s * 0.62, y + s * 0.1)], true);
      g.fillStyle(dark, alpha);
      g.fillPoints([P(x - s * 0.5, y + s * 0.05), P(x + s * 0.5, y + s * 0.05), P(x + s * 0.35, y - s * 0.3), P(x - s * 0.35, y - s * 0.3)], true);
      g.fillStyle(lit, alpha);
      g.fillRect(x - s * 0.3, y - s * 0.28, s * 0.6, s * 0.1);
      break;
    }
    case 'stride': {
      // A winged boot.
      g.fillStyle(gold, alpha);
      g.fillPoints([P(x - s * 0.5, y - s), P(x, y - s), P(x, y + s * 0.3), P(x + s * 0.9, y + s * 0.45), P(x + s * 0.9, y + s * 0.85), P(x - s * 0.5, y + s * 0.85)], true);
      g.fillStyle(dark, alpha);
      g.fillRect(x - s * 0.5, y + s * 0.7, s * 1.4, s * 0.15);
      g.fillStyle(lit, alpha);
      for (let i = 0; i < 3; i++) {
        g.fillPoints([P(x - s * 0.5, y - s * 0.7 + i * s * 0.3), P(x - s * 1.25, y - s * 0.95 + i * s * 0.3), P(x - s * 1.1, y - s * 0.55 + i * s * 0.3)], true);
      }
      break;
    }
    case 'haste': {
      // An hourglass running gold.
      g.fillStyle(dark, alpha);
      g.fillRect(x - s * 0.8, y - s * 1.05, s * 1.6, s * 0.2);
      g.fillRect(x - s * 0.8, y + s * 0.85, s * 1.6, s * 0.2);
      g.fillStyle(tint(FOR.glass), alpha * 0.35);
      g.fillPoints([P(x - s * 0.6, y - s * 0.85), P(x + s * 0.6, y - s * 0.85), P(x, y), P(x + s * 0.6, y + s * 0.85), P(x - s * 0.6, y + s * 0.85), P(x, y)], true);
      g.fillStyle(gold, alpha);
      g.fillPoints([P(x - s * 0.3, y - s * 0.4), P(x + s * 0.3, y - s * 0.4), P(x, y)], true);
      g.fillPoints([P(x, y + s * 0.3), P(x + s * 0.55, y + s * 0.85), P(x - s * 0.55, y + s * 0.85)], true);
      g.lineStyle(1, lit, alpha);
      g.lineBetween(x, y, x, y + s * 0.5);
      break;
    }
    case 'vigor': {
      // A flask of red elixir with a gold stopper.
      g.fillStyle(dark, alpha);
      g.fillCircle(x, y + s * 0.25, s * 0.8);
      g.fillRect(x - s * 0.25, y - s * 0.95, s * 0.5, s * 0.7);
      g.fillStyle(tint(FOR.blood), alpha);
      g.fillCircle(x, y + s * 0.3, s * 0.62);
      g.fillStyle(tint(FOR.bloodLit), alpha * 0.9);
      g.fillCircle(x - s * 0.2, y + s * 0.15, s * 0.22);
      g.fillStyle(gold, alpha);
      g.fillRect(x - s * 0.32, y - s * 1.1, s * 0.64, s * 0.26);
      // A plus.
      g.fillStyle(lit, alpha);
      g.fillRect(x - s * 0.06, y + s * 0.05, s * 0.12, s * 0.5);
      g.fillRect(x - s * 0.25, y + s * 0.24, s * 0.5, s * 0.12);
      break;
    }
    case 'greed': {
      // A stack of three coins with a sparkle.
      for (let i = 2; i >= 0; i--) {
        const cy = y + s * 0.6 - i * s * 0.42;
        g.fillStyle(dark, alpha);
        g.fillEllipse(x, cy + s * 0.12, s * 1.6, s * 0.6);
        g.fillStyle(gold, alpha);
        g.fillEllipse(x, cy, s * 1.6, s * 0.55);
      }
      g.fillStyle(lit, alpha);
      g.fillEllipse(x - s * 0.25, y - s * 0.3, s * 0.6, s * 0.2);
      twinkle(g, tint(FOR.hot), x + s * 0.75, y - s * 0.75, s * 0.4, alpha);
      break;
    }
    case 'sheaf': {
      // A sheaf of gilded grass, bound at the waist.
      for (let i = -2; i <= 2; i++) {
        grassBlade(g, tint, x, y + s * 0.9, -Math.PI / 2 + i * 0.22, s * 1.9, 1, alpha);
      }
      g.fillStyle(tint(FOR.leather), alpha);
      g.fillRect(x - s * 0.35, y + s * 0.2, s * 0.7, s * 0.2);
      break;
    }
    case 'mend': {
      // A heart with a stitched seam.
      g.fillStyle(dark, alpha);
      g.fillCircle(x - s * 0.42, y - s * 0.2, s * 0.55);
      g.fillCircle(x + s * 0.42, y - s * 0.2, s * 0.55);
      g.fillPoints([P(x - s * 0.95, y - s * 0.05), P(x + s * 0.95, y - s * 0.05), P(x, y + s * 0.95)], true);
      g.fillStyle(gold, alpha);
      g.fillCircle(x - s * 0.42, y - s * 0.22, s * 0.4);
      g.fillCircle(x + s * 0.42, y - s * 0.22, s * 0.4);
      g.fillPoints([P(x - s * 0.78, y - s * 0.08), P(x + s * 0.78, y - s * 0.08), P(x, y + s * 0.72)], true);
      g.lineStyle(1, tint(FOR.ink), alpha * 0.8);
      g.lineBetween(x, y - s * 0.45, x, y + s * 0.55);
      for (let i = 0; i < 3; i++) {
        const sy = y - s * 0.3 + i * s * 0.3;
        g.lineBetween(x - s * 0.18, sy, x + s * 0.18, sy + s * 0.08);
      }
      break;
    }
  }
}

// ── The cane (F, and the rig's secondary) ─────────────────────────────────

/** A dropped coin lying on the floor: milled rim, a face with a stamped mark, a glint. */
export function goldCoin(
  g: Phaser.GameObjects.Graphics, tint: FortuneColorFn,
  x: number, y: number, r: number, spin: number, alpha: number,
): void {
  if (alpha <= 0.01) return;
  // Spinning about the vertical axis: the width breathes, never quite to nothing.
  const w = Math.max(0.18, Math.abs(Math.cos(spin)));
  g.fillStyle(tint(FOR.ink), alpha * 0.35);
  g.fillEllipse(x + 1, y + r * 0.8, r * 2 * Math.max(0.6, w), r * 0.6);
  // Edge (visible when edge-on).
  g.fillStyle(tint(FOR.brass), alpha);
  g.fillEllipse(x, y, r * 2 * w + 2, r * 2);
  // Milled teeth.
  const teeth = 14;
  g.fillStyle(tint(FOR.brass), alpha);
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * TAU;
    g.fillCircle(x + Math.cos(a) * r * w, y + Math.sin(a) * r, Math.max(0.6, r * 0.16));
  }
  g.fillStyle(tint(FOR.gold), alpha);
  g.fillEllipse(x, y, r * 1.7 * w, r * 1.7);
  // The stamp: a little alembic-flask mark.
  if (w > 0.45) {
    g.fillStyle(tint(FOR.brass), alpha * 0.9);
    g.fillEllipse(x, y + r * 0.2, r * 0.8 * w, r * 0.7);
    g.fillRect(x - r * 0.12 * w, y - r * 0.5, r * 0.24 * w, r * 0.5);
  }
  g.fillStyle(tint(FOR.goldLit), alpha * 0.8);
  g.fillEllipse(x - r * 0.3 * w, y - r * 0.35, r * 0.5 * w, r * 0.4);
  twinkle(g, tint(FOR.hot), x - r * 0.35 * w, y - r * 0.45, r * 0.55, alpha * (0.4 + 0.6 * w));
}

/**
 * A golden walking cane held at `(x, y)` (the grip) and extending along `ang` for `len`: a
 * crook handle behind the hand, a ringed collar, a tapering shaft and a bright ferrule tip.
 */
export function caneShape(
  g: Phaser.GameObjects.Graphics, tint: FortuneColorFn,
  x: number, y: number, ang: number, len: number, alpha: number,
): void {
  if (alpha <= 0.01) return;
  const cx = Math.cos(ang), cy = Math.sin(ang);
  const nx = -cy, ny = cx;
  // Shaft: a tapering quad, dark edge then lit core.
  const tipX = x + cx * len, tipY = y + cy * len;
  g.fillStyle(tint(FOR.brass), alpha);
  g.fillPoints([P(x + nx * 2.2, y + ny * 2.2), P(tipX + nx * 1.3, tipY + ny * 1.3),
    P(tipX - nx * 1.3, tipY - ny * 1.3), P(x - nx * 2.2, y - ny * 2.2)], true);
  g.fillStyle(tint(FOR.gold), alpha);
  g.fillPoints([P(x + nx * 1.2, y + ny * 1.2), P(tipX + nx * 0.6, tipY + ny * 0.6),
    P(tipX - nx * 0.3, tipY - ny * 0.3), P(x - nx * 0.4, y - ny * 0.4)], true);
  g.lineStyle(0.8, tint(FOR.goldLit), alpha * 0.9);
  g.lineBetween(x + nx * 0.9, y + ny * 0.9, tipX + nx * 0.4, tipY + ny * 0.4);
  // Ferrule.
  g.fillStyle(tint(FOR.goldLit), alpha);
  g.fillCircle(tipX, tipY, 2);
  twinkle(g, tint(FOR.hot), tipX, tipY, 3.4, alpha * 0.8);
  // Collar rings just ahead of the hand.
  for (let i = 0; i < 2; i++) {
    const rx = x + cx * (6 + i * 3), ry = y + cy * (6 + i * 3);
    g.lineStyle(1.4, tint(i ? FOR.goldLit : FOR.brass), alpha);
    g.lineBetween(rx + nx * 2.6, ry + ny * 2.6, rx - nx * 2.6, ry - ny * 2.6);
  }
  // The crook handle, curling back over the hand.
  const hx = x - cx * 5, hy = y - cy * 5;
  g.lineStyle(3.2, tint(FOR.brass), alpha);
  g.beginPath();
  g.arc(hx + nx * 4, hy + ny * 4, 4.2, ang + Math.PI / 2, ang + Math.PI / 2 + Math.PI * 1.2, true);
  g.strokePath();
  g.lineStyle(1.4, tint(FOR.goldLit), alpha * 0.9);
  g.beginPath();
  g.arc(hx + nx * 4, hy + ny * 4, 4.2, ang + Math.PI * 0.8, ang + Math.PI * 1.4, false);
  g.strokePath();
}

// ── Mastery: No Pain, No Gain ─────────────────────────────────────────────

/** The golden dagger: a leaf blade with a fuller, a crossguard, a wrapped grip and a ruby pommel. */
export function goldenDagger(g: Phaser.GameObjects.Graphics, tint: FortuneColorFn, x: number, y: number, ang: number, len: number, alpha: number): void {
  if (alpha <= 0.01) return;
  const cx = Math.cos(ang);
  const cy = Math.sin(ang);
  const nx = -cy;
  const ny = cx;
  const at = (f: number, l: number): Phaser.Geom.Point => P(x + cx * f + nx * l, y + cy * f + ny * l);
  const blade = len * 0.62;
  g.fillStyle(tint(FOR.brass), alpha);
  g.fillPoints([at(0, 3), at(blade * 0.55, 3.4), at(blade, 0), at(blade * 0.55, -3.4), at(0, -3)], true);
  g.fillStyle(tint(FOR.goldLit), alpha);
  g.fillPoints([at(0, 2), at(blade * 0.55, 2.3), at(blade - 2, 0), at(0, 0)], true);
  g.lineStyle(0.8, tint(FOR.brass), alpha);
  g.lineBetween(at(1, 0).x, at(1, 0).y, at(blade * 0.8, 0).x, at(blade * 0.8, 0).y);
  // Guard.
  g.fillStyle(tint(FOR.gold), alpha);
  g.fillPoints([at(-1.6, 6.5), at(1.2, 6.5), at(1.2, -6.5), at(-1.6, -6.5)], true);
  // Grip and pommel.
  g.fillStyle(tint(FOR.leather), alpha);
  g.fillPoints([at(-1.6, 1.8), at(-len * 0.3, 1.6), at(-len * 0.3, -1.6), at(-1.6, -1.8)], true);
  g.lineStyle(0.8, tint(FOR.leatherLit), alpha);
  for (let i = 1; i <= 3; i++) {
    const f = -1.6 - (len * 0.3 - 1.6) * (i / 4);
    g.lineBetween(at(f, 1.7).x, at(f, 1.7).y, at(f - 1.2, -1.7).x, at(f - 1.2, -1.7).y);
  }
  g.fillStyle(tint(FOR.blood), alpha);
  g.fillCircle(at(-len * 0.34, 0).x, at(-len * 0.34, 0).y, 2.3);
  g.fillStyle(tint(FOR.bloodLit), alpha);
  g.fillCircle(at(-len * 0.34, 0).x - 0.6, at(-len * 0.34, 0).y - 0.6, 0.9);
  twinkle(g, tint(FOR.hot), at(blade * 0.7, 1).x, at(blade * 0.7, 1).y, 2.6, alpha * 0.9);
}

// ── Upgrades ──────────────────────────────────────────────────────────────

/** E+ Artisan: the five stones a jeweled Advance card can carry. */
export type Jewel = 'pearl' | 'diamond' | 'ruby' | 'sapphire' | 'jade';

/** Each stone's three tones: shadow, body, highlight. Run through `tint` like everything else. */
const JEWEL_TONES: Record<Jewel, [number, number, number]> = {
  pearl: [0xb9a9b4, 0xf4ece6, 0xffffff],
  diamond: [0x7fb6d6, 0xd9f4ff, 0xffffff],
  ruby: [0x6a0d1c, 0xd0263e, 0xff9aa6],
  sapphire: [0x13256e, 0x2f5fd6, 0x9cc4ff],
  jade: [0x1d5b3a, 0x3fae6e, 0xbff0cf],
};

/**
 * A stone set in a little gold claw mount, as sits on top of a jeweled Advance card. `(x, y)` is
 * the stone's centre and `r` its radius. Each stone is cut the way it would be: the pearl is a
 * lustrous sphere, the diamond a brilliant seen from above, the ruby a cushion, the sapphire an
 * oval step cut, the jade a milky cabochon.
 */
export function jewelGem(
  g: Phaser.GameObjects.Graphics, tint: FortuneColorFn,
  x: number, y: number, r: number, jewel: Jewel, alpha: number, t: number,
): void {
  if (alpha <= 0.01) return;
  const [dark, body, lit] = JEWEL_TONES[jewel].map((c) => tint(c));
  // The mount: a gold bezel and four claws.
  g.fillStyle(tint(FOR.ink), alpha * 0.5);
  g.fillCircle(x + 1, y + 1.5, r * 1.3);
  g.fillStyle(tint(FOR.brass), alpha);
  g.fillCircle(x, y, r * 1.28);
  g.fillStyle(tint(FOR.gold), alpha);
  g.fillCircle(x, y - r * 0.08, r * 1.14);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    g.fillStyle(tint(FOR.goldLit), alpha);
    g.fillCircle(x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 1.05, r * 0.26);
  }
  switch (jewel) {
    case 'pearl': {
      g.fillStyle(dark, alpha);
      g.fillCircle(x, y, r);
      g.fillStyle(body, alpha);
      g.fillCircle(x - r * 0.12, y - r * 0.12, r * 0.86);
      // Orient: a soft rainbow sheen that slides round the sphere.
      const a = t * 1.3;
      g.fillStyle(tint(0xffd6ef), alpha * 0.45);
      g.fillEllipse(x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.25, r * 0.9, r * 0.5);
      g.fillStyle(lit, alpha);
      g.fillCircle(x - r * 0.35, y - r * 0.38, r * 0.26);
      break;
    }
    case 'diamond': {
      // A brilliant from above: an octagon table, star facets, and fire that turns.
      const oct = (rr: number, rot: number): Phaser.Geom.Point[] =>
        Array.from({ length: 8 }, (_, i) => P(x + Math.cos(rot + (i * TAU) / 8) * rr, y + Math.sin(rot + (i * TAU) / 8) * rr));
      g.fillStyle(dark, alpha);
      g.fillPoints(oct(r, Math.PI / 8), true);
      g.fillStyle(body, alpha);
      g.fillPoints(oct(r * 0.82, Math.PI / 8), true);
      g.fillStyle(lit, alpha * 0.85);
      g.fillPoints(oct(r * 0.45, 0), true);
      g.lineStyle(0.6, dark, alpha * 0.8);
      for (let i = 0; i < 8; i++) {
        const a = Math.PI / 8 + (i * TAU) / 8;
        g.lineBetween(x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82, x + Math.cos(a + Math.PI / 8) * r * 0.45, y + Math.sin(a + Math.PI / 8) * r * 0.45);
      }
      const fire = 0.5 + 0.5 * Math.sin(t * 5);
      twinkle(g, tint(FOR.hot), x + r * 0.3, y - r * 0.3, r * (0.5 + fire * 0.5), alpha);
      break;
    }
    case 'ruby': {
      // A cushion: a rounded square with a darker pavilion showing through the table.
      g.fillStyle(dark, alpha);
      g.fillRoundedRect(x - r, y - r, r * 2, r * 2, r * 0.5);
      g.fillStyle(body, alpha);
      g.fillRoundedRect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6, r * 0.38);
      g.fillStyle(dark, alpha * 0.7);
      g.fillPoints([P(x, y - r * 0.4), P(x + r * 0.4, y), P(x, y + r * 0.4), P(x - r * 0.4, y)], true);
      g.fillStyle(lit, alpha * 0.9);
      g.fillPoints([P(x - r * 0.62, y - r * 0.62), P(x - r * 0.1, y - r * 0.62), P(x - r * 0.62, y - r * 0.1)], true);
      // A slow red pulse — this one is bad news for the other side.
      g.fillStyle(tint(FOR.bloodLit), alpha * (0.15 + 0.15 * Math.sin(t * 3)));
      g.fillCircle(x, y, r * 1.5);
      break;
    }
    case 'sapphire': {
      // An oval step cut: concentric oval steps, deepening to the middle.
      g.fillStyle(dark, alpha);
      g.fillEllipse(x, y, r * 1.7, r * 2.1);
      g.fillStyle(body, alpha);
      g.fillEllipse(x, y, r * 1.35, r * 1.7);
      g.fillStyle(dark, alpha * 0.45);
      g.fillEllipse(x, y + r * 0.1, r * 0.8, r * 1.0);
      g.fillStyle(lit, alpha * 0.85);
      g.fillEllipse(x - r * 0.28, y - r * 0.45, r * 0.4, r * 0.6);
      // A ring that climbs while it sits there: the stone that grows.
      const u = (t * 0.5) % 1;
      g.lineStyle(0.8, lit, alpha * (1 - u) * 0.8);
      g.strokeEllipse(x, y, r * (1.7 + u * 1.2), r * (2.1 + u * 1.2));
      break;
    }
    case 'jade': {
      // A cabochon: smooth dome, milky cloud inside, one soft highlight.
      g.fillStyle(dark, alpha);
      g.fillCircle(x, y, r);
      g.fillStyle(body, alpha);
      g.fillCircle(x - r * 0.08, y - r * 0.1, r * 0.84);
      g.fillStyle(lit, alpha * 0.35);
      g.fillEllipse(x + r * 0.15, y + r * 0.2, r * 0.9, r * 0.55);
      g.fillStyle(tint(0xffffff), alpha * 0.8);
      g.fillEllipse(x - r * 0.32, y - r * 0.4, r * 0.5, r * 0.26);
      break;
    }
  }
}

// ── FortuneFx ─────────────────────────────────────────────────────────────

export class FortuneFx extends FxBase {
  // ── Billiards (R) ──

  /** The cane going out along the shot: a hard gold streak the length of the thrust. */
  cueThrust(x: number, y: number, ang: number, reach: number): void {
    const cx = Math.cos(ang), cy = Math.sin(ang);
    const nx = -cy, ny = cx;
    this.anim(8, 180, (g, t) => {
      const head = reach * easeOut(Math.min(1, t * 2.2));
      const tail = reach * easeOut(t) * 0.7;
      const a = 1 - t;
      g.fillStyle(this.tint(FOR.brass), a * 0.5);
      g.fillPoints([P(x + cx * tail + nx * 1, y + cy * tail + ny * 1), P(x + cx * head + nx * 3.4, y + cy * head + ny * 3.4),
        P(x + cx * head - nx * 3.4, y + cy * head - ny * 3.4), P(x + cx * tail - nx * 1, y + cy * tail - ny * 1)], true);
      g.fillStyle(this.tint(FOR.hot), a * 0.9);
      g.fillPoints([P(x + cx * tail, y + cy * tail), P(x + cx * head + nx * 1.2, y + cy * head + ny * 1.2),
        P(x + cx * head - nx * 1.2, y + cy * head - ny * 1.2)], true);
    });
  }

  /** Cue tip on ball: a chalk puff thrown back toward the striker and a star on the contact. */
  cueHit(x: number, y: number, ang: number, power: number): void {
    this.flashIn(x, y, 7 + power * 8, FOR.hot, FOR.gold, 12);
    this.anim(12, 260, (g, t) => {
      for (let i = 0; i < 5; i++) {
        const a = ang + Math.PI + (i - 2) * 0.32;
        const d = 4 + (14 + power * 16) * easeOut(t);
        g.fillStyle(this.tint(FOR.dust), (1 - t) * 0.5);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 2.4 + t * 3);
      }
      twinkle(g, this.tint(FOR.hot), x, y, (6 + power * 6) * (1 - t * 0.5), 1 - t);
    });
  }

  /** Ball on ball, or ball on wall: a quick pair of opposed sparks, sized by how hard. */
  ballClack(x: number, y: number, k: number): void {
    const rot = Math.random() * TAU;
    this.anim(8, 160, (g, t) => {
      const r = (4 + k * 10) * easeOut(t);
      g.lineStyle(1.4 * (1 - t), this.tint(FOR.hot), 1 - t);
      for (let i = 0; i < 4; i++) {
        const a = rot + (i / 4) * TAU;
        g.lineBetween(x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4, x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
    });
  }

  /** A ball finding a body: a gold ring off the contact and a spray of flecks. */
  ballHit(x: number, y: number, k: number): void {
    this.flashIn(x, y, 8 + k * 10, FOR.hot, FOR.gold, 12);
    this.ring(x, y, 5, 20 + k * 22, 300, FOR.goldLit, 2.5, 12);
    this.sparkle(x, y, 4 + Math.round(k * 5), 18 + k * 16, 340, 12);
  }

  /** R+ Billiard Blitz: the cane is back. A ring closes on the hand and a cue-shaped glint snaps across it. */
  blitz(x: number, y: number): void {
    this.anim(13, 320, (g, t) => {
      const r = 34 * (1 - easeOut(t)) + 10;
      g.lineStyle(2.4, this.tint(FOR.hot), 1 - t);
      g.strokeCircle(x, y, r);
      g.lineStyle(1.2, this.tint(FOR.gold), (1 - t) * 0.8);
      g.strokeCircle(x, y, r + 5);
    });
    this.sparkle(x, y - 6, 6, 26, 380, 13);
  }

  // ── Rebirth (Q) ──

  /**
   * Rebirth: he whites out — a column of light, rays wheeling round it — and the light then
   * shatters outward as shards of ore, leaving him standing in what is left.
   */
  rebirth(x: number, y: number, level: number): void {
    const k = 1 + level * 0.12;
    const rays = Array.from({ length: 12 }, (_, i) => ({ a: (i / 12) * TAU, w: 0.08 + jitter(level * 3 + 1, i) * 0.1, l: 60 + jitter(level, i) * 50 }));
    this.anim(14, 900, (g, t) => {
      const rise = easeOut(Math.min(1, t * 2.5));
      const fall = Math.max(0, (t - 0.55) / 0.45);
      const a = (1 - fall) * rise;
      // The column.
      g.fillStyle(this.tint(FOR.gold), a * 0.35);
      g.fillRect(x - 26 * k, y - 220, 52 * k, 250);
      g.fillStyle(this.tint(FOR.hot), a * 0.55);
      g.fillRect(x - 12 * k, y - 220, 24 * k, 250);
      // Rays, turning.
      for (const r of rays) {
        const ang = r.a + t * 1.6;
        const len = r.l * k * rise;
        g.fillStyle(this.tint(FOR.goldLit), a * 0.5);
        g.fillPoints([P(x, y), P(x + Math.cos(ang - r.w) * len, y + Math.sin(ang - r.w) * len),
          P(x + Math.cos(ang + r.w) * len, y + Math.sin(ang + r.w) * len)], true);
      }
      // The whiteout over the body itself.
      g.fillStyle(this.tint(FOR.hot), a);
      g.fillCircle(x, y, 26 * k * (0.7 + 0.3 * rise));
    });
    this.scene.time.delayedCall(480, () => {
      this.ring(x, y, 14, 120 * k, 620, FOR.hot, 5, 13);
      this.ring(x, y, 10, 86 * k, 520, FOR.gold, 3, 13);
      const chips = Array.from({ length: 14 }, (_, i) => ({
        a: (i / 14) * TAU + Math.random() * 0.3, d: 40 + Math.random() * 60, r: 2.5 + Math.random() * 3, s: Math.random() * 99,
      }));
      this.anim(13, 620, (g, t) => {
        for (const c of chips) {
          const d = c.d * k * easeOut(t);
          const px = x + Math.cos(c.a) * d;
          const py = y + Math.sin(c.a) * d + t * t * 26;
          const rot = c.s + t * 9;
          g.fillStyle(this.tint(FOR.brass), 1 - t);
          g.fillPoints([P(px + Math.cos(rot) * c.r, py + Math.sin(rot) * c.r), P(px + Math.cos(rot + 2.1) * c.r, py + Math.sin(rot + 2.1) * c.r),
            P(px + Math.cos(rot + 4.2) * c.r, py + Math.sin(rot + 4.2) * c.r)], true);
          g.fillStyle(this.tint(FOR.goldLit), (1 - t) * 0.9);
          g.fillCircle(px, py, c.r * 0.45);
        }
      });
      this.sparkle(x, y, 12, 60 * k, 700, 15);
    });
  }

  // ── No Pain, No Gain (mastery) ──

  /**
   * The dagger goes in on the cursor's side: it swings in from `ang`, sinks to the guard, and a
   * jet of blood leaves by the other side of the body.
   */
  painStab(x: number, y: number, ang: number): void {
    const cx = Math.cos(ang), cy = Math.sin(ang);
    this.anim(13, 420, (g, t) => {
      // In fast, held, then drawn.
      const inT = easeOut(Math.min(1, t / 0.25));
      const out = Math.max(0, (t - 0.7) / 0.3);
      const d = 44 - 30 * inT + 16 * out;
      goldenDagger(g, this.tint, x + cx * d, y + cy * d, ang + Math.PI, 26, 1 - out * 0.8);
    });
    this.scene.time.delayedCall(90, () => {
      this.flashIn(x - cx * 8, y - cy * 8, 12, FOR.bloodLit, FOR.blood, 12);
      const drops = Array.from({ length: 12 }, (_, i) => ({
        a: ang + Math.PI + (jitter(i + 5, 3) - 0.5) * 0.9, d: 30 + Math.random() * 90, r: 1.6 + Math.random() * 2.6,
      }));
      this.anim(12, 420, (g, t) => {
        for (const p of drops) {
          const d = 10 + p.d * easeOut(t);
          g.fillStyle(this.tint(t < 0.5 ? FOR.bloodLit : FOR.blood), 1 - t * 0.8);
          g.fillCircle(x + Math.cos(p.a) * d, y + Math.sin(p.a) * d - Math.sin(t * Math.PI) * 10, p.r * (1 - t * 0.4));
        }
      });
    });
  }

  /** A gold radial burst of four-point twinkles — the shared signature of "it became gold". */
  private sparkle(x: number, y: number, count: number, spread: number, ms: number, depth: number): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      a: Math.random() * TAU, d: spread * (0.4 + Math.random() * 0.8), r: 2 + Math.random() * 3, i,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        twinkle(g, this.tint(p.i % 2 ? FOR.goldLit : FOR.hot),
          x + Math.cos(p.a) * p.d * e, y + Math.sin(p.a) * p.d * e - t * 6, p.r * (1 - t * 0.6), 1 - t);
      }
    });
  }

  /** Jittered ring that scales its segment count with its radius. */
  private ring(x: number, y: number, r0: number, r1: number, ms: number, color: number, width: number, depth: number): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      const r = r0 + (r1 - r0) * easeOut(t);
      const seg = Math.max(18, Math.round(r / 3));
      g.lineStyle(width * (1 - t * 0.6), this.tint(color), (1 - t) * 0.85);
      g.beginPath();
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * TAU;
        const rr = r * (1 + (jitter(seed, i % seg) - 0.5) * 0.06);
        if (i === 0) g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        else g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.strokePath();
    });
  }

  /** The left hand flaring as the blades gild: a swirl of alchemical sigil arcs and a hot core. */
  transmute(x: number, y: number): void {
    const rot = Math.random() * TAU;
    this.anim(12, 260, (g, t) => {
      const a = 1 - t;
      g.fillStyle(this.tint(FOR.gold), a * 0.35);
      g.fillCircle(x, y, 10 + t * 10);
      g.fillStyle(this.tint(FOR.hot), a * 0.85);
      g.fillCircle(x, y, 5 * (1 - t * 0.5));
      // A turning circle of three arcs with dots — a sigil, not a ring.
      g.lineStyle(1.4, this.tint(FOR.goldLit), a);
      for (let i = 0; i < 3; i++) {
        const s = rot + t * 4 + (i * TAU) / 3;
        g.beginPath();
        g.arc(x, y, 9 + t * 6, s, s + 1.4, false);
        g.strokePath();
        g.fillStyle(this.tint(FOR.hot), a);
        g.fillCircle(x + Math.cos(s + 1.4) * (9 + t * 6), y + Math.sin(s + 1.4) * (9 + t * 6), 1.3);
      }
    });
    this.sparkle(x, y, 4, 16, 300, 12);
  }

  /** A blade striking a body — it shatters into gold flakes along its line of travel. */
  bladeHit(x: number, y: number, ang: number): void {
    const flakes = Array.from({ length: 6 }, () => ({
      a: ang + Math.PI + (Math.random() - 0.5) * 1.8, d: 8 + Math.random() * 14, s: Math.random() * TAU,
    }));
    this.anim(12, 280, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(FOR.hot), (1 - t) * 0.8);
      g.fillCircle(x, y, 4 * (1 - t));
      for (const f of flakes) {
        const px = x + Math.cos(f.a) * f.d * e, py = y + Math.sin(f.a) * f.d * e + easeIn(t) * 6;
        g.fillStyle(this.tint(FOR.gold), 1 - t);
        g.fillPoints([P(px, py - 1.6), P(px + Math.cos(f.s + t * 9) * 2.2, py), P(px, py + 1.6)], true);
      }
    });
  }

  /** The cane lunge: a tapered gold comet from start to end, a launch puff, a hot tip. */
  caneLunge(fx: number, fy: number, tx: number, ty: number): void {
    const ang = Math.atan2(ty - fy, tx - fx);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    this.anim(4, 340, (g, t) => {
      const a = 1 - t;
      const tail = easeOut(Math.min(1, t * 1.6));
      const sx = fx + (tx - fx) * tail, sy = fy + (ty - fy) * tail;
      g.fillStyle(this.tint(FOR.brass), a * 0.45);
      g.fillPoints([P(sx + nx * 1, sy + ny * 1), P(tx + nx * 11, ty + ny * 11), P(tx - nx * 11, ty - ny * 11), P(sx - nx * 1, sy - ny * 1)], true);
      g.fillStyle(this.tint(FOR.gold), a * 0.7);
      g.fillPoints([P(sx, sy), P(tx + nx * 6, ty + ny * 6), P(tx - nx * 6, ty - ny * 6)], true);
      g.fillStyle(this.tint(FOR.hot), a * 0.8);
      g.fillPoints([P(sx, sy), P(tx + nx * 2.4, ty + ny * 2.4), P(tx - nx * 2.4, ty - ny * 2.4)], true);
    });
    // Launch puff behind.
    this.anim(4, 380, (g, t) => {
      for (let i = 0; i < 4; i++) {
        const a = ang + Math.PI + (i - 1.5) * 0.45;
        const d = 6 + 18 * easeOut(t);
        g.fillStyle(this.tint(FOR.dust), (1 - t) * 0.4);
        g.fillCircle(fx + Math.cos(a) * d, fy + Math.sin(a) * d, 5 + t * 6);
      }
    });
    this.sparkle(tx + Math.cos(ang) * 22, ty + Math.sin(ang) * 22, 4, 14, 300, 12);
  }

  /** The heart being installed: a gold ribbon wraps in and snaps shut, with a flash of the heart. */
  heartApply(x: number, y: number): void {
    this.anim(13, 420, (g, t) => {
      const r = 34 * (1 - easeOut(t)) + 10;
      g.lineStyle(2.2, this.tint(FOR.gold), 1 - t * 0.7);
      g.beginPath();
      g.arc(x, y, r, t * 6, t * 6 + Math.PI * 1.4, false);
      g.strokePath();
      g.lineStyle(1.2, this.tint(FOR.goldLit), 1 - t);
      g.beginPath();
      g.arc(x, y, r * 0.75, -t * 7, -t * 7 + Math.PI, false);
      g.strokePath();
      if (t > 0.6) goldenHeart(g, this.tint, x, y, 0, t, (t - 0.6) * 2.5 * (1 - t) * 4);
    });
    this.sparkle(x, y, 6, 20, 420, 13);
  }

  /** The heart attack: the heart convulses, cracks and bursts — red under gold, a shockwave, flakes. */
  heartAttack(x: number, y: number): void {
    this.anim(14, 260, (g, t) => {
      goldenHeart(g, this.tint, x + Math.sin(t * 90) * 3, y, 1, t * 3, 1 - t * 0.3);
      g.fillStyle(this.tint(FOR.bloodLit), t * 0.5);
      g.fillCircle(x, y, 12 * t);
    });
    this.scene.time.delayedCall(240, () => {
      this.flashIn(x, y, 20, FOR.hot, FOR.blood, 14);
      this.ring(x, y, 10, 70, 460, FOR.blood, 4, 13);
      this.ring(x, y, 6, 50, 380, FOR.gold, 2.5, 13);
      const shards = Array.from({ length: 12 }, () => ({
        a: Math.random() * TAU, d: 18 + Math.random() * 30, r: Math.random() * TAU, red: Math.random() < 0.4,
      }));
      this.anim(14, 620, (g, t) => {
        const e = easeOut(t);
        for (const s of shards) {
          const px = x + Math.cos(s.a) * s.d * e, py = y + Math.sin(s.a) * s.d * e + easeIn(t) * 16;
          g.fillStyle(this.tint(s.red ? FOR.blood : FOR.gold), 1 - t);
          const sa = s.r + t * 10;
          g.fillPoints([P(px + Math.cos(sa) * 3.5, py + Math.sin(sa) * 3.5), P(px + Math.cos(sa + 2.2) * 2.4, py + Math.sin(sa + 2.2) * 2.4),
            P(px + Math.cos(sa + 4) * 2.8, py + Math.sin(sa + 4) * 2.8)], true);
        }
      });
    });
  }

  /** A small rising sparkle with a coin glyph — gold just came in. */
  goldGain(x: number, y: number, amount: number): void {
    const n = Math.min(4, Math.max(1, Math.round(amount)));
    for (let i = 0; i < n; i++) {
      const ox = (i - (n - 1) / 2) * 7;
      this.anim(15, 620, (g, t) => {
        const e = easeOut(t);
        goldCoin(g, this.tint, x + ox, y - e * 22 - i * 2, 3.6, t * 10 + i, (1 - t * t));
      });
    }
    this.sparkle(x, y - 6, 3, 12, 400, 15);
  }

  /** Mastery — Gilded Augment kicking in: a ring of gold closing on the body. */
  augmentStart(x: number, y: number): void {
    this.ring(x, y, 48, 18, 380, FOR.goldLit, 3, 13);
    this.sparkle(x, y, 6, 26, 420, 15);
  }

  /** Gilded Augment at work: a coin melting into a rising glint over the body. */
  augmentMote(x: number, y: number): void {
    const ox = (Math.random() - 0.5) * 30;
    const oy = (Math.random() - 0.5) * 16;
    this.anim(14, 520, (g, t) => {
      const e = easeOut(t);
      goldCoin(g, this.tint, x + ox, y + oy + 10 - e * 26, 3.2 * (1 - t * 0.6), t * 12, 1 - t);
      twinkle(g, this.tint(FOR.hot), x + ox, y + oy - e * 30, 2.4 * (1 - t), 1 - t);
    });
  }

  /** Ten gold spent: coins spiral up out of the purse into a bright point over the head. */
  advanceOpen(x: number, y: number): void {
    const topY = y - 58;
    for (let i = 0; i < 6; i++) {
      const a0 = (i / 6) * TAU;
      this.anim(15, 480, (g, t) => {
        const e = easeOut(t);
        const r = 20 * (1 - e);
        const a = a0 + t * 6;
        goldCoin(g, this.tint, x + Math.cos(a) * r, y + (topY - y) * e + Math.sin(a) * r * 0.4, 3.4, t * 12 + i, 1 - t * 0.5);
      });
    }
    this.scene.time.delayedCall(420, () => {
      this.flashIn(x, topY, 12, FOR.hot, FOR.gold, 15);
      this.sparkle(x, topY, 8, 34, 500, 15);
    });
  }

  /** A card chosen: a column of gold pours down into the alchemist, ringing as it lands. */
  advancePick(x: number, y: number): void {
    this.anim(14, 420, (g, t) => {
      const a = 1 - t;
      const top = y - 64 + easeIn(t) * 50;
      g.fillStyle(this.tint(FOR.gold), a * 0.55);
      g.fillRect(x - 8, top, 16, y - top);
      g.fillStyle(this.tint(FOR.hot), a * 0.8);
      g.fillRect(x - 2.5, top, 5, y - top);
    });
    this.scene.time.delayedCall(260, () => {
      this.ring(x, y, 10, 44, 420, FOR.gold, 3, 12);
      this.sparkle(x, y, 10, 30, 500, 13);
    });
  }

}

// ── Avatar ────────────────────────────────────────────────────────────────

const FORTUNE_AVATAR: AvatarSpec = {
  hands: [
    { r: 10, color: FOR.brass, alpha: 0.3 },
    { r: 6.8, color: FOR.brass, alpha: 0.98 },
    { r: 3.6, color: FOR.gold, alpha: 0.95 },
    { r: 1.8, color: FOR.hot, alpha: 0.9, ox: -1.8, oy: -1.8 },
  ],
  eyeWhite: FOR.goldLit,
  eyePupil: FOR.ink,
  squash: { div: 14, x: 0.48, y: 0.3 },
};

/**
 * The alchemist: a plain gold orb (the baked `elem-fortune`) wearing **brass goggles pushed up
 * on the brow** — the one accessory, two round amber lenses on a leather strap that sit above
 * the eyes, never over them. The one secondary is a **golden cane** in the right hand, which is
 * what Heart of Gold stabs with; on the dash gesture it is thrust out along the aim. The left
 * hand is the transmuting one, and `setGlowHand` lights it with a turning sigil of golden magic.
 *
 * `setGold` swells the under-glow and brightens the lens glint as the purse fills.
 *
 * Body detail: a reeded coin edge, an etched sol, and a watch-chain swag with a vial of gold.
 *
 * Mastered (Philosopher): a ring of six minted coins orbits him, flipping and glinting; a red
 * Philosopher's Stone is set on the goggle bridge; the vial turns blood-red; gilded lens rims and
 * lit lenses, gold eyes, wider coronas and a richer glow.
 */
/**
 * Rebirth plates, in the order they turn to gold: [dx, dy, radius, rotation]. The lower body goes
 * first; the face band (eyes sit about y-4) is left clear so the rig still reads.
 */
const GILD_PLATES: [number, number, number, number][] = [
  [8, 10, 5.5, 0.3], [-9, 4, 5, 1.1], [0, 15, 4.6, 0.7], [15, 3, 3.8, 0.2],
  [-14, -5, 4, 0.9], [-3, 7, 4.4, 1.6], [15, -8, 3.4, 0.5], [-11, 13, 3.8, 1.3],
];

export class FortuneAvatar extends BaseAvatar {
  private glowHand = 0;
  private glowTarget = 0;
  private wealth = 0;
  private wealthTarget = 0;
  /** 0..1 while the cane is being thrust (dash gesture). */
  private thrust = 0;
  private thrustAngle = 0;
  /** Rebirths, as plates of raw gold set into the body. */
  private gilding = 0;
  /** R: the cane held as a cue along this angle, or null when it is the walking stick again. */
  private cueAng: number | null = null;
  private cuePull = 0;
  /** 1→0 over the cue's thrust. */
  private jabT = 0;
  private jabAngle = 0;
  /** 1→0: the whiteout a rebirth leaves fading on the body. */
  private rebirthFlash = 0;

  constructor(scene: Phaser.Scene, tint: FortuneColorFn, depth = 6) {
    super(scene, tint, depth, FORTUNE_AVATAR);
  }

  /** 0–1: golden magic in the left hand. Decays on its own if not refreshed. */
  setGlowHand(v: number): void {
    const k = Phaser.Math.Clamp(v, 0, 1);
    this.glowTarget = k;
    if (k > this.glowHand) this.glowHand = k;
  }

  /** 0–1: purse fullness. Drives the under-glow and the goggle-lens glint. */
  setGold(v: number): void { this.wealthTarget = Phaser.Math.Clamp(v, 0, 1); }

  /** Rebirth: how many plates of the body have turned to raw gold. */
  setGilding(level: number): void { this.gilding = Math.max(0, Math.floor(level)); }

  /** R: hold the cane as a cue along `ang`, drawn back by `pull` (0–1). Null puts it away. */
  setCue(ang: number | null, pull: number): void {
    this.cueAng = ang;
    this.cuePull = Phaser.Math.Clamp(pull, 0, 1);
    this.setHold(ang === null ? null : 'reach', ang ?? undefined);
  }

  /** R: the shot — the cane snaps forward along `ang`. */
  jab(ang: number): void {
    this.jabT = 1;
    this.jabAngle = ang;
  }

  /** Q: 0–1 whiteout over the body, fading after a rebirth. */
  setRebirthFlash(v: number): void { this.rebirthFlash = Phaser.Math.Clamp(v, 0, 1); }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    if (gesture === 'dash') {
      this.thrust = 1;
      this.thrustAngle = angle ?? this.facing;
    }
    if (gesture === 'punch') this.setGlowHand(1);
    super.play(gesture, angle, duration);
  }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.glowHand = Math.max(this.glowTarget, this.glowHand - delta / 420);
    this.glowTarget = Math.max(0, this.glowTarget - delta / 900);
    this.thrust = Math.max(0, this.thrust - delta / 360);
    this.jabT = Math.max(0, this.jabT - delta / 200);
    this.wealth += (this.wealthTarget - this.wealth) * Math.min(1, delta / 500);
    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? FOR.gold : FOR.goldLit);
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 13.5 : 10);
      glow.setFillStyle(this.tint(on ? FOR.gold : FOR.brass), on ? 0.38 : 0.3);
    });
  }

  /**
   * Minted detail on the orb: a reeded coin edge, an etched sol (☉) — the alchemist's sign for
   * gold — and a watch-chain swag across the belly with a vial of liquid gold hanging off it.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    // Reeded edge.
    g.lineStyle(1, this.tint(FOR.brass), alpha * 0.55);
    for (let i = 0; i < 36; i++) {
      const ang = (i / 36) * TAU;
      g.lineBetween(x + Math.cos(ang) * 17.5, y + Math.sin(ang) * 17.5, x + Math.cos(ang) * 20, y + Math.sin(ang) * 20);
    }
    g.lineStyle(0.9, this.tint(FOR.goldLit), alpha * 0.35);
    g.strokeCircle(x, y, 17);
    // Etched sol on the lower left.
    const sx = x - 10, sy = y + 9;
    g.lineStyle(1.1, this.tint(FOR.brass), alpha * 0.8);
    g.strokeCircle(sx, sy, 3.4);
    g.fillStyle(this.tint(FOR.brass), alpha * 0.9);
    g.fillCircle(sx, sy, 1);
    // Watch chain: a sagging swag of links across the belly.
    const x0 = x - 13, x1 = x + 12, cy = y + 11;
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      const lx = x0 + (x1 - x0) * u;
      const ly = cy + Math.sin(u * Math.PI) * 4;
      g.fillStyle(this.tint(i % 2 ? FOR.goldLit : FOR.brass), alpha * 0.95);
      g.fillEllipse(lx, ly, 3, 2);
    }
    // The vial hanging from the chain's low point.
    const vx = x + 3 + Math.sin(this.t * 2.2) * 0.8, vy = cy + 7;
    g.fillStyle(this.tint(FOR.ink), alpha * 0.7);
    g.fillRoundedRect(vx - 2.6, vy - 1, 5.2, 8, 2);
    g.fillStyle(this.tint(FOR.glass), alpha * 0.55);
    g.fillRoundedRect(vx - 2, vy - 0.4, 4, 7, 1.6);
    g.fillStyle(this.tint(this.mastered ? FOR.bloodLit : FOR.gold), alpha * 0.95);
    g.fillRoundedRect(vx - 2, vy + 2.6 + Math.sin(this.t * 3) * 0.4, 4, 3.6, 1.4);
    g.fillStyle(this.tint(FOR.leather), alpha);
    g.fillRect(vx - 1.6, vy - 2.4, 3.2, 1.8);
    g.fillStyle(this.tint(FOR.hot), alpha * 0.8);
    g.fillRect(vx - 1.2, vy, 0.9, 3);

    if (this.gilding > 0) this.drawGilding(g, x, y, alpha);
  }

  /**
   * Rebirth: the soft orb turning to raw gold, a plate at a time. Each plate sets one
   * more polished ingot-plate into the body — hard brass seam, mirror-bright face, a specular
   * streak that sweeps across it — filling the lower body first and climbing toward the goggles.
   * Past the eighth plate the seams fuse and the whole body takes a slow running sheen.
   */
  private drawGilding(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const n = Math.min(GILD_PLATES.length, this.gilding);
    for (let i = 0; i < n; i++) {
      const [px, py, r, rot] = GILD_PLATES[i];
      const cx = x + px, cy = y + py;
      const pts: Phaser.Geom.Point[] = [];
      for (let k = 0; k < 6; k++) {
        const a = rot + (k / 6) * TAU;
        const rr = r * (0.85 + jitter(i * 7 + 3, k) * 0.3);
        pts.push(P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr));
      }
      g.fillStyle(this.tint(FOR.brass), alpha);
      g.fillPoints(pts.map((p) => P(cx + (p.x - cx) * 1.18, cy + (p.y - cy) * 1.18)), true);
      g.fillStyle(this.tint(FOR.goldLit), alpha);
      g.fillPoints(pts, true);
      // The polish: a hot streak that sweeps across each plate in turn.
      const sweep = ((this.t * 0.6 + i * 0.17) % 1.6) - 0.3;
      if (sweep > 0 && sweep < 1) {
        const sx = cx - r + sweep * r * 2;
        g.lineStyle(1.6, this.tint(FOR.hot), alpha * 0.9 * Math.sin(sweep * Math.PI));
        g.lineBetween(sx - r * 0.3, cy + r * 0.55, sx + r * 0.3, cy - r * 0.55);
      }
      g.fillStyle(this.tint(FOR.hot), alpha * 0.8);
      g.fillCircle(cx - r * 0.35, cy - r * 0.35, Math.max(0.8, r * 0.18));
    }
    if (this.gilding > GILD_PLATES.length) {
      // Fully minted: one slow band of light rolls down the whole orb.
      const u = (this.t * 0.35) % 1;
      const yy = y - 20 + u * 40;
      const w = Math.sqrt(Math.max(0, 20 * 20 - (yy - y) * (yy - y))) * 2;
      g.fillStyle(this.tint(FOR.hot), alpha * 0.45);
      g.fillRect(x - w / 2, yy - 1.5, w, 3);
    }
  }

  /** Mastered: a ring of minted coins circling the alchemist, flipping as they go. */
  private coinRing(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number, front: boolean): void {
    const n = 6;
    for (let i = 0; i < n; i++) {
      const ang = this.t * 1.1 + (i / n) * TAU;
      const z = Math.sin(ang);
      if ((z >= 0) !== front) continue;
      const cx = x + Math.cos(ang) * 30;
      const cy = y + 6 + z * 10;
      const flip = Math.abs(Math.cos(this.t * 4 + i * 1.3));
      const r = 3.4 + z * 0.6;
      const k = front ? 1 : 0.55;
      g.fillStyle(this.tint(FOR.brass), alpha * k);
      g.fillEllipse(cx, cy, r * 2 * Math.max(0.2, flip) + 1, r * 2 + 1);
      g.fillStyle(this.tint(FOR.gold), alpha * k);
      g.fillEllipse(cx, cy, r * 2 * Math.max(0.15, flip), r * 2);
      if (front && flip > 0.5) twinkle(g, this.tint(FOR.hot), cx - r * 0.3, cy - r * 0.3, 1.8, alpha * flip);
    }
  }

  protected emitTrail(x: number, y: number): void {
    const fx = new FortuneFx(this.scene, this.tint);
    fx.anim(4, 420, (g, t) => twinkle(g, this.tint(FOR.goldLit), x, y + t * 6, 2.6 * (1 - t), 1 - t));
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    const k = this.intensity * (this.mastered ? 1.15 : 1) * (1 + this.wealth * 0.2);
    g.fillStyle(this.tint(FOR.gold), a * ((this.mastered ? 0.24 : 0.18) + this.wealth * 0.12) * k);
    g.fillCircle(x, y, 28 * k);
    if (this.mastered) {
      // The orbit the coins ride, and the half of the ring that passes behind him.
      g.lineStyle(1, this.tint(FOR.goldLit), alpha * 0.35);
      g.strokeEllipse(x, y + 6, 60, 20);
      this.coinRing(g, x, y, alpha, false);
    }
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const m = this.mastered;
    const crown = y - 18;
    const lean = Math.cos(this.facing) * 2;

    // ── Goggles, pushed up on the brow ──
    // Strap first, wrapping the crown; then two round brass-rimmed lenses side by side.
    g.fillStyle(this.tint(FOR.leather), alpha);
    g.fillRect(x - 17 + lean * 0.5, crown - 1.2, 34, 4);
    g.fillStyle(this.tint(FOR.leatherLit), alpha * 0.8);
    g.fillRect(x - 17 + lean * 0.5, crown - 1.2, 34, 1.2);
    const lensR = m ? 5.6 : 5;
    for (const side of [-1, 1]) {
      const lx = x + side * 6.6 + lean, ly = crown;
      g.fillStyle(this.tint(FOR.ink), alpha * 0.5);
      g.fillCircle(lx + 0.8, ly + 1.2, lensR + 1.4);
      g.fillStyle(this.tint(m ? FOR.gold : FOR.brass), alpha);
      g.fillCircle(lx, ly, lensR + 1.4);
      g.fillStyle(this.tint(FOR.glass), alpha * (m ? 0.95 : 0.85));
      g.fillCircle(lx, ly, lensR);
      g.fillStyle(this.tint(FOR.soot), alpha * 0.35);
      g.fillCircle(lx + 1.2, ly + 1.2, lensR * 0.6);
      // Glint, brighter as the purse fills (and lit from inside once mastered).
      g.fillStyle(this.tint(FOR.hot), alpha * (0.55 + this.wealth * 0.4));
      g.fillCircle(lx - lensR * 0.38, ly - lensR * 0.38, lensR * 0.3);
      if (m) {
        g.fillStyle(this.tint(FOR.goldLit), alpha * (0.25 + 0.12 * Math.sin(this.t * 4 + side)));
        g.fillCircle(lx, ly, lensR * 0.75);
      }
      // Rim rivets.
      g.fillStyle(this.tint(FOR.goldLit), alpha * 0.9);
      g.fillCircle(lx + side * (lensR + 0.6), ly, 0.9);
    }
    // Bridge between the lenses.
    g.fillStyle(this.tint(m ? FOR.goldLit : FOR.gold), alpha);
    g.fillRect(x - 2 + lean, crown - 1, 4, 2.2);
    // A brass buckle on the strap's side.
    g.lineStyle(1, this.tint(FOR.gold), alpha * 0.9);
    g.strokeRect(x - 16 + lean * 0.5, crown - 1.6, 3.2, 4.8);
    if (m) {
      // Mastered: the Philosopher's Stone set on the bridge — a faceted red gem, pulsing.
      const gx = x + lean, gy = crown - 3.4;
      const pulse = 0.75 + 0.25 * Math.sin(this.t * 3.4);
      g.fillStyle(this.tint(FOR.bloodLit), alpha * 0.3 * pulse);
      g.fillCircle(gx, gy, 6);
      g.fillStyle(this.tint(FOR.gold), alpha);
      g.fillPoints([P(gx, gy - 4.6), P(gx + 3.8, gy - 0.6), P(gx, gy + 3.4), P(gx - 3.8, gy - 0.6)], true);
      g.fillStyle(this.tint(FOR.blood), alpha);
      g.fillPoints([P(gx, gy - 3.6), P(gx + 2.8, gy - 0.6), P(gx, gy + 2.4), P(gx - 2.8, gy - 0.6)], true);
      g.fillStyle(this.tint(FOR.bloodLit), alpha * pulse);
      g.fillPoints([P(gx, gy - 3.6), P(gx + 2.8, gy - 0.6), P(gx, gy - 0.2)], true);
      twinkle(g, this.tint(FOR.hot), gx - 1, gy - 2, 2.2, alpha * pulse);
    }

    // ── The transmuting left hand ──
    const lx = this.armX[0], ly = this.armY[0];
    if (Number.isFinite(lx) && this.glowHand > 0.02) {
      const k = this.glowHand;
      g.fillStyle(this.tint(FOR.gold), alpha * 0.3 * k);
      g.fillCircle(lx, ly, 13 + k * 4);
      g.lineStyle(1.3, this.tint(FOR.goldLit), alpha * k);
      for (let i = 0; i < 3; i++) {
        const s = this.t * 5 + (i * TAU) / 3;
        g.beginPath();
        g.arc(lx, ly, 10 + k * 2, s, s + 1.2, false);
        g.strokePath();
      }
      twinkle(g, this.tint(FOR.hot), lx, ly, 4 + k * 3, alpha * k);
    }

    // ── The cane, in the right hand ──
    const hx = this.armX[1], hy = this.armY[1];
    if (!Number.isFinite(hx)) return;
    if (this.jabT > 0 || this.cueAng !== null) {
      // A cue: the cane lies along the shot through the bridge hand, butt behind the body. Drawn
      // back it slides away from the ball; on the shot it snaps out past where it started.
      const ang = this.jabT > 0 ? this.jabAngle : this.cueAng ?? 0;
      // At rest the tip is 30px in front of him and the butt well behind; drawn back, the tip comes
      // in to the body; on the shot it runs out to the full 112px reach.
      const slide = this.jabT > 0 ? Math.sin(this.jabT * Math.PI) * 82 : -this.cuePull * 30;
      const bx = x + Math.cos(ang) * (slide - 66) - Math.sin(ang) * 5;
      const by = y + Math.sin(ang) * (slide - 66) + Math.cos(ang) * 5;
      caneShape(g, this.tint, bx, by, ang, 96, alpha);
    } else if (this.thrust > 0) {
      // Thrust out along the lunge: the cane leads, extended past the hand.
      const e = Math.sin(this.thrust * Math.PI * 0.5);
      caneShape(g, this.tint, hx, hy, this.thrustAngle, 26 + e * 14, alpha);
    } else {
      // Carried: angled down and forward, like a gentleman's walking stick.
      const face = Math.cos(this.facing) >= 0 ? 1 : -1;
      const ang = Math.PI / 2 - face * 0.55;
      caneShape(g, this.tint, hx, hy, ang, 24, alpha);
    }

    if (m) this.coinRing(g, x, y, alpha, true);

    if (this.rebirthFlash > 0) {
      g.fillStyle(this.tint(FOR.hot), alpha * this.rebirthFlash * 0.9);
      g.fillCircle(x, y, 21);
      g.fillStyle(this.tint(FOR.goldLit), alpha * this.rebirthFlash * 0.35);
      g.fillCircle(x, y, 30);
    }
  }
}
