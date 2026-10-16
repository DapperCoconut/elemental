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

/** A small leather pouch, drawstring-tied, gold dust leaking from its neck. ~10px. */
export function powderBag(
  g: Phaser.GameObjects.Graphics, tint: FortuneColorFn,
  x: number, y: number, spin: number, alpha: number,
): void {
  if (alpha <= 0.01) return;
  const c = Math.cos(spin), s = Math.sin(spin);
  const rot = (px: number, py: number): Phaser.Geom.Point => P(x + px * c - py * s, y + px * s + py * c);
  // Shadow body, then the bag itself: a round belly that pinches to a neck.
  const belly: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI * 0.18 + (i / 14) * Math.PI * 1.64;
    belly.push(rot(Math.cos(a + Math.PI / 2) * 9, Math.sin(a + Math.PI / 2) * 8.5 + 2));
  }
  g.fillStyle(tint(FOR.soot), alpha * 0.9);
  g.fillPoints(belly.map((p) => P(p.x + 1, p.y + 1.5)), true);
  g.fillStyle(tint(FOR.leather), alpha);
  g.fillPoints(belly, true);
  // Lit side.
  g.fillStyle(tint(FOR.leatherLit), alpha * 0.9);
  const lit = rot(-3, 2);
  g.fillEllipse(lit.x, lit.y, 7, 9);
  // Stitched seam.
  g.lineStyle(0.9, tint(FOR.ink), alpha * 0.6);
  const s0 = rot(0, -3), s1 = rot(0.6, 9);
  g.lineBetween(s0.x, s0.y, s1.x, s1.y);
  // Neck and the gold drawstring.
  const n0 = rot(-3.4, -6.5), n1 = rot(3.4, -6.5), n2 = rot(2, -9.5), n3 = rot(-2, -9.5);
  g.fillStyle(tint(FOR.leather), alpha);
  g.fillPoints([n0, n1, n2, n3], true);
  g.lineStyle(1.6, tint(FOR.gold), alpha);
  const k0 = rot(-4, -6.6), k1 = rot(4, -6.6);
  g.lineBetween(k0.x, k0.y, k1.x, k1.y);
  const tie = rot(4.5, -6.6);
  g.fillStyle(tint(FOR.goldLit), alpha);
  g.fillCircle(tie.x, tie.y, 1.5);
  // A wisp of dust out of the mouth.
  const m = rot(0, -11);
  g.fillStyle(tint(FOR.dust), alpha * 0.6);
  g.fillCircle(m.x, m.y, 2.2);
  twinkle(g, tint(FOR.hot), m.x + 2, m.y - 2, 2.2, alpha * 0.8);
}

// ── Gold plume (R, persistent) ────────────────────────────────────────────

/**
 * The cloud of fine golden dust. Soft overlapping puffs that drift on their own slow orbits,
 * a denser core, and specks that sparkle in and out. Drawn under the fighters.
 */
export function goldPlume(
  g: Phaser.GameObjects.Graphics, tint: FortuneColorFn,
  x: number, y: number, r: number, alpha: number, t: number, seed: number,
): void {
  if (alpha <= 0.01) return;
  // Ground haze.
  g.fillStyle(tint(FOR.brass), alpha * 0.12);
  g.fillCircle(x, y, r * 1.02);
  g.fillStyle(tint(FOR.dust), alpha * 0.1);
  g.fillCircle(x, y, r * 0.86);
  // Puffs.
  const puffs = 13;
  for (let i = 0; i < puffs; i++) {
    const j = jitter(seed, i);
    const a = (i / puffs) * TAU + t * (0.15 + j * 0.25) * (i % 2 ? 1 : -1);
    const d = r * (0.25 + 0.55 * jitter(seed, i + 40));
    const pr = r * (0.26 + 0.16 * jitter(seed, i + 80)) * (1 + 0.08 * Math.sin(t * 1.7 + i));
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d * 0.85;
    g.fillStyle(tint(i % 3 === 0 ? FOR.gold : FOR.dust), alpha * 0.16);
    g.fillCircle(px, py, pr);
    g.fillStyle(tint(FOR.goldLit), alpha * 0.08);
    g.fillCircle(px - pr * 0.25, py - pr * 0.25, pr * 0.55);
  }
  // Rim: a faint ragged edge so the boundary that hurts is readable.
  g.lineStyle(1.2, tint(FOR.gold), alpha * 0.35);
  g.beginPath();
  const seg = Math.max(24, Math.round(r / 3));
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * TAU;
    const rr = r * (0.94 + 0.06 * Math.sin(a * 5 + t * 1.3 + seed));
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
  // Sparkling specks.
  const specks = 22;
  for (let i = 0; i < specks; i++) {
    const a = jitter(seed, i + 120) * TAU + t * 0.4 * (jitter(seed, i + 7) - 0.5);
    const d = r * Math.sqrt(jitter(seed, i + 160)) * 0.95;
    const tw = 0.5 + 0.5 * Math.sin(t * (3 + jitter(seed, i) * 4) + i * 1.7);
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d - ((t * 9 + i * 5) % 14);
    g.fillStyle(tint(FOR.goldLit), alpha * 0.7 * tw);
    g.fillCircle(px, py, 1.1);
    if (tw > 0.85) twinkle(g, tint(FOR.hot), px, py, 2.8, alpha * (tw - 0.85) * 5);
  }
}

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

// ── Midas floor, coins, statues (Q) ───────────────────────────────────────

/** One patch of floor turned to gold: an irregular plate with a bevel, seams and a glint. */
export function goldFloor(
  g: Phaser.GameObjects.Graphics, tint: FortuneColorFn,
  x: number, y: number, r: number, alpha: number, seed: number, t: number,
): void {
  if (alpha <= 0.01) return;
  const n = 11;
  const pts: Phaser.Geom.Point[] = [];
  const inner: Phaser.Geom.Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + jitter(seed, i) * 0.3;
    const rr = r * (0.78 + 0.22 * jitter(seed, i + 20));
    pts.push(P(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.92));
    inner.push(P(x + Math.cos(a) * rr * 0.8 - 1, y + Math.sin(a) * rr * 0.74 - 1.5));
  }
  g.fillStyle(tint(FOR.brass), alpha * 0.85);
  g.fillPoints(pts, true);
  g.fillStyle(tint(FOR.gold), alpha * 0.75);
  g.fillPoints(inner, true);
  // Seams, as if the floorboards themselves set into metal.
  g.lineStyle(1, tint(FOR.brass), alpha * 0.7);
  for (let i = 0; i < 2; i++) {
    const a = jitter(seed, i + 50) * Math.PI;
    const l = r * 0.6;
    g.lineBetween(x - Math.cos(a) * l, y - Math.sin(a) * l * 0.9, x + Math.cos(a) * l, y + Math.sin(a) * l * 0.9);
  }
  // Lit crescent and a slow glint that wanders across the plate.
  g.fillStyle(tint(FOR.goldLit), alpha * 0.4);
  g.fillEllipse(x - r * 0.2, y - r * 0.25, r * 0.7, r * 0.3);
  const gl = (Math.sin(t * 0.9 + seed * 3) * 0.5 + 0.5);
  if (gl > 0.8) twinkle(g, tint(FOR.hot), x + r * 0.3 * Math.cos(seed), y - r * 0.2, 4, alpha * (gl - 0.8) * 5);
}

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
 * A summon that tried to happen near a Midas-cursed body: a solid lump of gold in roughly the
 * shape of a figure on a plinth, faceted so it reads as metal rather than paint.
 */
export function goldStatue(
  g: Phaser.GameObjects.Graphics, tint: FortuneColorFn,
  x: number, y: number, r: number, alpha: number, seed: number, t: number,
): void {
  if (alpha <= 0.01) return;
  g.fillStyle(tint(FOR.ink), alpha * 0.35);
  g.fillEllipse(x, y + r * 0.95, r * 2.1, r * 0.55);
  // Plinth.
  g.fillStyle(tint(FOR.brass), alpha);
  g.fillRect(x - r * 0.9, y + r * 0.45, r * 1.8, r * 0.45);
  g.fillStyle(tint(FOR.gold), alpha);
  g.fillRect(x - r * 0.9, y + r * 0.45, r * 1.8, r * 0.14);
  // The figure: a frozen lump — torso, head, one raised limb, all faceted.
  const lean = (jitter(seed, 1) - 0.5) * 0.5;
  const torso = [
    P(x - r * 0.55, y + r * 0.45), P(x + r * 0.55, y + r * 0.45),
    P(x + r * 0.45 + lean * r, y - r * 0.25), P(x - r * 0.4 + lean * r, y - r * 0.3),
  ];
  g.fillStyle(tint(FOR.brass), alpha);
  g.fillPoints(torso, true);
  g.fillStyle(tint(FOR.gold), alpha);
  g.fillPoints([torso[0], P(x + r * 0.05, y + r * 0.45), P(x + lean * r, y - r * 0.28), torso[3]], true);
  const hx = x + lean * r * 1.2, hy = y - r * 0.58;
  g.fillStyle(tint(FOR.brass), alpha);
  g.fillCircle(hx, hy, r * 0.34);
  g.fillStyle(tint(FOR.gold), alpha);
  g.fillCircle(hx - r * 0.07, hy - r * 0.06, r * 0.26);
  // A raised limb, whatever it was.
  const side = jitter(seed, 2) < 0.5 ? -1 : 1;
  g.lineStyle(r * 0.22, tint(FOR.brass), alpha);
  g.lineBetween(x + side * r * 0.4, y - r * 0.1, x + side * r * 0.85, y - r * 0.7);
  g.fillStyle(tint(FOR.gold), alpha);
  g.fillCircle(x + side * r * 0.85, y - r * 0.7, r * 0.15);
  // Glints that drift up the metal.
  g.fillStyle(tint(FOR.goldLit), alpha * 0.7);
  g.fillEllipse(x - r * 0.25, y, r * 0.18, r * 0.5);
  const tw = 0.5 + 0.5 * Math.sin(t * 2.3 + seed);
  twinkle(g, tint(FOR.hot), hx - r * 0.15, hy - r * 0.15, r * 0.35, alpha * tw);
  // Ground sparkle: it is worth picking up.
  twinkle(g, tint(FOR.goldLit), x + r * 0.9, y + r * 0.3, r * 0.28, alpha * (1 - tw) * 0.8);
}

/**
 * The curse, drawn on its victim. Gold rises from the feet of a 22px body toward the crown as
 * `progress` goes 0→1, with a molten, wavering leading edge and flecks lifting off it. At full
 * progress the whole body is a gold shell with a single crack of light.
 */
export function midasGilt(
  g: Phaser.GameObjects.Graphics, tint: FortuneColorFn,
  x: number, y: number, progress: number, t: number, alpha: number,
): void {
  if (alpha <= 0.01) return;
  const p = Phaser.Math.Clamp(progress, 0, 1);
  const R = 22;
  // The fill line in body coordinates, bottom (+R) to top (-R).
  const lineY = y + R - p * R * 2;
  const pts: Phaser.Geom.Point[] = [];
  const steps = 18;
  // Lower arc of the body circle below the line, plus a wavy top edge.
  const top = (px: number): number =>
    lineY + Math.sin(px * 0.35 + t * 4) * 1.6 + Math.sin(px * 0.9 - t * 6) * 0.8;
  for (let i = 0; i <= steps; i++) {
    const px = x - R + (i / steps) * R * 2;
    const dy = Math.sqrt(Math.max(0, R * R - (px - x) * (px - x)));
    const ty = Math.max(top(px), y - dy);
    pts.push(P(px, Math.min(ty, y + dy)));
  }
  for (let i = steps; i >= 0; i--) {
    const px = x - R + (i / steps) * R * 2;
    const dy = Math.sqrt(Math.max(0, R * R - (px - x) * (px - x)));
    pts.push(P(px, y + dy));
  }
  g.fillStyle(tint(FOR.brass), alpha * 0.85);
  g.fillPoints(pts, true);
  g.fillStyle(tint(FOR.gold), alpha * 0.6);
  g.fillPoints(pts.map((pt) => P(x + (pt.x - x) * 0.82 - 1.5, pt.y + (pt.y > y ? -2 : 0.5))), true);
  // The molten edge.
  if (p < 0.98) {
    g.lineStyle(1.6, tint(FOR.goldLit), alpha * 0.95);
    g.beginPath();
    let started = false;
    for (let i = 0; i <= steps; i++) {
      const px = x - R + (i / steps) * R * 2;
      const dy = Math.sqrt(Math.max(0, R * R - (px - x) * (px - x)));
      const ty = top(px);
      if (ty < y - dy || ty > y + dy) { started = false; continue; }
      if (!started) { g.moveTo(px, ty); started = true; } else g.lineTo(px, ty);
    }
    g.strokePath();
    // Flecks lifting off it.
    for (let i = 0; i < 4; i++) {
      const ph = (t * 0.9 + i * 0.25) % 1;
      const fx = x + Math.sin(i * 2.4 + t) * R * 0.6;
      g.fillStyle(tint(FOR.goldLit), alpha * (1 - ph) * 0.8);
      g.fillCircle(fx, lineY - ph * 10, 1.2);
    }
  } else {
    // Fully gilded: one crack of light down the shell.
    g.lineStyle(1.2, tint(FOR.hot), alpha * (0.5 + 0.5 * Math.sin(t * 5)));
    g.lineBetween(x - 3, y - 14, x + 2, y - 2);
    g.lineBetween(x + 2, y - 2, x - 1, y + 10);
  }
  twinkle(g, tint(FOR.hot), x - 8, Math.max(lineY + 4, y - 12), 3 + p * 2, alpha * p * 0.9);
}

// ── Advance cards (E) ─────────────────────────────────────────────────────

/**
 * One stat card over the alchemist's head: a parchment-on-brass plate with a stamped gold
 * border, a glyph for the stat in its upper half, and room underneath for the kit's label.
 * `(x, y)` is the card's centre.
 */
export function advanceCard(
  g: Phaser.GameObjects.Graphics, tint: FortuneColorFn,
  x: number, y: number, w: number, h: number, kind: StatKind, hover: boolean, alpha: number,
): void {
  if (alpha <= 0.01) return;
  const l = x - w / 2, tp = y - h / 2;
  if (hover) {
    g.fillStyle(tint(FOR.gold), alpha * 0.3);
    g.fillRoundedRect(l - 4, tp - 4, w + 8, h + 8, 7);
  }
  g.fillStyle(tint(FOR.ink), alpha * 0.5);
  g.fillRoundedRect(l + 2, tp + 3, w, h, 5);
  g.fillStyle(tint(FOR.brass), alpha);
  g.fillRoundedRect(l, tp, w, h, 5);
  g.fillStyle(tint(FOR.soot), alpha * 0.95);
  g.fillRoundedRect(l + 2.5, tp + 2.5, w - 5, h - 5, 4);
  g.lineStyle(hover ? 1.8 : 1.1, tint(hover ? FOR.goldLit : FOR.gold), alpha);
  g.strokeRoundedRect(l + 2.5, tp + 2.5, w - 5, h - 5, 4);
  // Corner rivets.
  g.fillStyle(tint(FOR.goldLit), alpha * 0.9);
  for (const [cx, cy] of [[l + 5, tp + 5], [l + w - 5, tp + 5], [l + 5, tp + h - 5], [l + w - 5, tp + h - 5]]) {
    g.fillCircle(cx, cy, 1.2);
  }
  // Glyph area.
  const gx = x, gy = tp + h * 0.36;
  const s = Math.min(w, h) * 0.22;
  g.fillStyle(tint(FOR.gold), alpha * 0.14);
  g.fillCircle(gx, gy, s * 1.5);
  statGlyph(g, tint, kind, gx, gy, s, alpha);
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

// ── FortuneFx ─────────────────────────────────────────────────────────────

export class FortuneFx extends FxBase {
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

  /** A fallen blade lying where it dropped, glinting once and fading into the floor. */
  bladeLand(x: number, y: number, ang: number): void {
    this.anim(3, 700, (g, t) => {
      const a = (1 - t) * 0.9;
      grassBlade(g, this.tint, x - Math.cos(ang) * 5, y - Math.sin(ang) * 5, ang, 10, 1, a);
      if (t < 0.4) twinkle(g, this.tint(FOR.hot), x, y, 3 * (1 - t * 2.5), (0.4 - t) * 2.5);
    });
  }

  /** The bag bursting open: a hot pop, scraps of leather, a boiling puff of dust spreading to `r`. */
  bagBurst(x: number, y: number, r: number): void {
    this.flashIn(x, y, 14, FOR.hot, FOR.gold, 12);
    const puffs = Array.from({ length: 10 }, (_, i) => ({
      a: (i / 10) * TAU + Math.random() * 0.5, d: r * (0.5 + Math.random() * 0.5), s: 0.5 + Math.random() * 0.4,
    }));
    this.anim(11, 520, (g, t) => {
      const e = easeOut(t);
      for (const p of puffs) {
        const px = x + Math.cos(p.a) * p.d * e, py = y + Math.sin(p.a) * p.d * e;
        g.fillStyle(this.tint(FOR.dust), (1 - t) * 0.45);
        g.fillCircle(px, py, r * 0.3 * p.s * (0.5 + e));
        g.fillStyle(this.tint(FOR.goldLit), (1 - t) * 0.35);
        g.fillCircle(px - 3, py - 3, r * 0.14 * p.s * (0.5 + e));
      }
    });
    const scraps = Array.from({ length: 5 }, () => ({ a: Math.random() * TAU, d: 20 + Math.random() * 26, s: Math.random() * TAU }));
    this.anim(12, 460, (g, t) => {
      for (const s of scraps) {
        const px = x + Math.cos(s.a) * s.d * easeOut(t), py = y + Math.sin(s.a) * s.d * easeOut(t) + easeIn(t) * 10;
        g.fillStyle(this.tint(FOR.leather), 1 - t);
        g.fillPoints([P(px - 2.5, py), P(px, py - 2 + Math.sin(s.s + t * 8)), P(px + 2.5, py + 1)], true);
      }
    });
    this.ring(x, y, 8, r, 420, FOR.gold, 3, 11);
    this.sparkle(x, y, 10, r * 0.8, 600, 12);
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

  /** A projectile turning into a coin: a flash where it was, then the coin hops down to the floor. */
  coinDrop(fromX: number, fromY: number, toX: number, toY: number): void {
    this.flashIn(fromX, fromY, 8, FOR.hot, FOR.gold, 12);
    this.anim(12, 420, (g, t) => {
      const px = fromX + (toX - fromX) * t;
      // A small upward hop, then down onto the floor.
      const hop = Math.sin(t * Math.PI) * 14;
      const py = fromY + (toY - fromY) * easeIn(t) - hop;
      goldCoin(g, this.tint, px, py, 5, t * 14, 1);
    });
    this.scene.time.delayedCall(400, () => this.sparkle(toX, toY, 3, 8, 260, 12));
  }

  /** A coin or statue collected: it streaks up into the collector as a column of glints. */
  pickup(x: number, y: number): void {
    this.anim(14, 360, (g, t) => {
      const a = 1 - t;
      g.fillStyle(this.tint(FOR.gold), a * 0.5);
      g.fillRect(x - 2, y - 30 * t, 4, 30 * t + 2);
      twinkle(g, this.tint(FOR.hot), x, y - 30 * easeOut(t), 5 * a, a);
    });
    this.ring(x, y, 4, 20, 300, FOR.goldLit, 2, 12);
    this.sparkle(x, y, 5, 14, 380, 13);
  }

  /** The ultimate going off from the caster: a gold shockwave rolling out, with a sigil circle. */
  midasCast(x: number, y: number): void {
    this.flashIn(x, y, 24, FOR.hot, FOR.gold, 13);
    this.ring(x, y, 14, 160, 700, FOR.gold, 5, 12);
    this.ring(x, y, 10, 110, 560, FOR.goldLit, 2.4, 12);
    const rot = Math.random() * TAU;
    this.anim(3, 900, (g, t) => {
      const a = t < 0.2 ? t * 5 : 1 - (t - 0.2) / 0.8;
      const r = 46;
      g.lineStyle(2, this.tint(FOR.gold), a * 0.8);
      g.strokeCircle(x, y, r);
      g.strokeCircle(x, y, r * 0.72);
      // A triangle and its inverse — the alchemist's sign.
      for (const off of [0, Math.PI]) {
        const pts = [0, 1, 2].map((i) => {
          const aa = rot + off + t * 1.4 + (i * TAU) / 3;
          return P(x + Math.cos(aa) * r * 0.72, y + Math.sin(aa) * r * 0.72);
        });
        g.lineStyle(1.4, this.tint(FOR.goldLit), a * 0.7);
        g.strokePoints(pts, true);
      }
    });
    this.sparkle(x, y, 16, 90, 800, 13);
    this.scene.cameras.main.shake(180, 0.004);
  }

  /** The curse arriving on its target: a gold column slams down and a band of gilt flashes over it. */
  midasStrike(x: number, y: number): void {
    this.anim(13, 520, (g, t) => {
      const a = 1 - t;
      const h = 120 * (1 - easeOut(Math.min(1, t * 2)));
      g.fillStyle(this.tint(FOR.gold), a * 0.5);
      g.fillRect(x - 10, y - h - 20, 20, h + 20);
      g.fillStyle(this.tint(FOR.hot), a * 0.8);
      g.fillRect(x - 3.5, y - h - 20, 7, h + 20);
      midasGilt(g, this.tint, x, y, Math.min(1, t * 2), t * 4, a);
    });
    this.ring(x, y, 10, 60, 480, FOR.gold, 3.5, 12);
    this.sparkle(x, y, 10, 34, 600, 13);
  }

  /** A summon becoming a statue: a gold flash from below, sheets of gilt, a ring. */
  transmuteSummon(x: number, y: number, r: number): void {
    this.flashIn(x, y, r * 0.9, FOR.hot, FOR.gold, 12);
    this.anim(12, 420, (g, t) => {
      const a = 1 - t;
      for (let i = 0; i < 6; i++) {
        const aa = (i / 6) * TAU + t * 2;
        const d = r * (0.4 + easeOut(t) * 0.9);
        g.fillStyle(this.tint(FOR.goldLit), a * 0.8);
        g.fillPoints([P(x + Math.cos(aa) * d, y + Math.sin(aa) * d),
          P(x + Math.cos(aa + 0.2) * d * 0.6, y + Math.sin(aa + 0.2) * d * 0.6),
          P(x + Math.cos(aa - 0.2) * d * 0.6, y + Math.sin(aa - 0.2) * d * 0.6)], true);
      }
    });
    this.ring(x, y, r * 0.5, r * 1.8, 460, FOR.gold, 3, 12);
    this.sparkle(x, y, 8, r * 1.2, 520, 13);
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
 * Mastery enhances what is there: gilded lens rims and lit lenses, gold eyes, wider coronas on
 * both hands and a richer glow — no new objects.
 */
export class FortuneAvatar extends BaseAvatar {
  private glowHand = 0;
  private glowTarget = 0;
  private wealth = 0;
  private wealthTarget = 0;
  /** 0..1 while the cane is being thrust (dash gesture). */
  private thrust = 0;
  private thrustAngle = 0;

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

  protected emitTrail(x: number, y: number): void {
    const fx = new FortuneFx(this.scene, this.tint);
    fx.anim(4, 420, (g, t) => twinkle(g, this.tint(FOR.goldLit), x, y + t * 6, 2.6 * (1 - t), 1 - t));
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    const k = this.intensity * (this.mastered ? 1.15 : 1) * (1 + this.wealth * 0.2);
    g.fillStyle(this.tint(FOR.gold), a * ((this.mastered ? 0.24 : 0.18) + this.wealth * 0.12) * k);
    g.fillCircle(x, y, 28 * k);
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
    if (this.thrust > 0) {
      // Thrust out along the lunge: the cane leads, extended past the hand.
      const e = Math.sin(this.thrust * Math.PI * 0.5);
      caneShape(g, this.tint, hx, hy, this.thrustAngle, 26 + e * 14, alpha);
    } else {
      // Carried: angled down and forward, like a gentleman's walking stick.
      const face = Math.cos(this.facing) >= 0 ? 1 : -1;
      const ang = Math.PI / 2 - face * 0.55;
      caneShape(g, this.tint, hx, hy, ang, 24, alpha);
    }
  }
}
