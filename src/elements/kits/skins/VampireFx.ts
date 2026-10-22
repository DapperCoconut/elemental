import Phaser from 'phaser';
import { FxBase, TAU, easeIn, easeOut } from '../ElementVisuals';

/**
 * The Vampire skin's ability art. Hunt's kit asks for these instead of its own painters when
 * the owner wears the skin — visual only, every hitbox and timer stays in HuntKit.
 *
 * - Crossbow bolts fly as sharpened ash stakes (Bomb Bolt: a garlic bulb lashed behind the point).
 * - Grenades are garlic bulbs with a lit fuse in the stem — same fuse, strobe and closing ring.
 * - Hunter's Trail leaves drops of blood instead of paw prints.
 * - The morphs burst into a cloud of bats; the way back is a puff of garlic.
 */

export const VAMP = {
  black: 0x0c060c,
  coat: 0x16101a,
  coatLit: 0x2e2234,
  crimsonDeep: 0x4a0816,
  crimson: 0x8c1028,
  crimsonLit: 0xc42840,
  blood: 0xa8001e,
  bloodLit: 0xe02040,
  silverDim: 0x6e7282,
  silver: 0xc4c8d6,
  silverLit: 0xf0f2fa,
  garlic: 0xf2ecd6,
  garlicShade: 0xcbbf9a,
  garlicDeep: 0x9c8f64,
  garlicPink: 0xd8b0b4,
  woodDark: 0x4a2e1a,
  wood: 0x8a5c36,
  woodLit: 0xc29a6a,
  ember: 0xff7a3a,
  white: 0xffffff,
} as const;

const P = (x: number, y: number) => new Phaser.Geom.Point(x, y);

/** A garlic bulb: fat at the bottom, drawn up to a papery neck. Built point by point. */
export function garlicBulb(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, alpha: number, rot = 0,
): void {
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const W = (lx: number, ly: number) => P(x + lx * cos - ly * sin, y + lx * sin + ly * cos);
  const outline = (scale: number): Phaser.Geom.Point[] => {
    const pts: Phaser.Geom.Point[] = [];
    const n = 16;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      // Wide, flattened base; the top pinches to a neck.
      const up = Math.sin(a) < 0 ? -Math.sin(a) : 0;
      const rr = r * scale * (1 - up * 0.42);
      pts.push(W(Math.cos(a) * rr * 1.08, Math.sin(a) * rr * (Math.sin(a) < 0 ? 1.15 : 0.82)));
    }
    return pts;
  };
  g.fillStyle(VAMP.garlicDeep, alpha);
  g.fillPoints(outline(1.08), true);
  g.fillStyle(VAMP.garlic, alpha);
  g.fillPoints(outline(1), true);
  // Clove seams.
  g.lineStyle(Math.max(0.8, r * 0.1), VAMP.garlicShade, alpha * 0.9);
  for (const k of [-0.5, 0, 0.5]) {
    const a = W(k * r * 1.1, r * 0.75);
    const b = W(k * r * 0.35, -r * 1.05);
    const c = W(k * r * 1.25, -r * 0.1);
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(c.x, c.y); g.lineTo(b.x, b.y); g.strokePath();
  }
  // A pink blush on the shadow side, a papery highlight on the lit one.
  g.fillStyle(VAMP.garlicPink, alpha * 0.4);
  const sh = W(r * 0.45, r * 0.25);
  g.fillEllipse(sh.x, sh.y, r * 0.8, r * 0.9);
  g.fillStyle(VAMP.white, alpha * 0.7);
  const hl = W(-r * 0.45, -r * 0.2);
  g.fillEllipse(hl.x, hl.y, r * 0.42, r * 0.7);
  // Root tuft.
  g.lineStyle(0.9, VAMP.garlicDeep, alpha * 0.8);
  for (const k of [-1, 0, 1]) {
    const a = W(k * r * 0.2, r * 0.82);
    const b = W(k * r * 0.45, r * 1.12);
    g.lineBetween(a.x, a.y, b.x, b.y);
  }
}

/** A sharpened stake along `angle`, `len` long, point first. */
export function stake(
  g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number, len: number, w: number, alpha: number,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  const L = (u: number, s: number) => P(x + cos * len * u + px * s, y + sin * len * u + py * s);
  // Body from the butt (-0.5) to the shoulder of the point (0.22), then whittled to a tip.
  const body = (k: number) => [
    L(-0.5, -w * k), L(0.22, -w * k), L(0.5, 0), L(0.22, w * k), L(-0.5, w * k),
  ];
  g.fillStyle(VAMP.woodDark, alpha);
  g.fillPoints(body(1.25), true);
  g.fillStyle(VAMP.wood, alpha);
  g.fillPoints(body(1), true);
  // Whittled facets on the point.
  g.fillStyle(VAMP.woodLit, alpha * 0.95);
  g.fillPoints([L(0.2, -w * 0.9), L(0.5, 0), L(0.2, 0)], true);
  // Grain.
  g.lineStyle(Math.max(0.6, w * 0.3), VAMP.woodLit, alpha * 0.55);
  g.lineBetween(L(-0.46, -w * 0.35).x, L(-0.46, -w * 0.35).y, L(0.16, -w * 0.35).x, L(0.16, -w * 0.35).y);
  // Silver band near the butt.
  g.fillStyle(VAMP.silver, alpha);
  g.fillPoints([L(-0.36, -w * 1.25), L(-0.26, -w * 1.25), L(-0.26, w * 1.25), L(-0.36, w * 1.25)], true);
  g.fillStyle(VAMP.silverLit, alpha * 0.8);
  g.fillPoints([L(-0.34, -w * 1.2), L(-0.3, -w * 1.2), L(-0.3, 0), L(-0.34, 0)], true);
}

export class VampireFx extends FxBase {
  constructor(scene: Phaser.Scene) {
    super(scene, (c) => c);
  }

  /** A flying (or buried) stake. Same footprint as hunt's 22px bolt. */
  static drawStake(
    g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number, scale = 1, bite = 0, bomb = false,
  ): void {
    const len = 24 * scale;
    // Motion streak behind a flying one.
    if (bite <= 0) {
      g.lineStyle(2 * scale, VAMP.crimson, 0.25);
      g.lineBetween(x - Math.cos(angle) * len * 0.5, y - Math.sin(angle) * len * 0.5,
        x - Math.cos(angle) * len * 1.1, y - Math.sin(angle) * len * 1.1);
    }
    stake(g, x, y, angle, len, 2.3 * scale, 1);
    if (bomb) {
      const bx = x + Math.cos(angle) * len * 0.02, by = y + Math.sin(angle) * len * 0.02;
      garlicBulb(g, bx, by, 4.6 * scale, 1, angle + Math.PI / 2);
      g.lineStyle(1.1, VAMP.garlicDeep, 0.9);
      g.strokeCircle(bx, by, 5.6 * scale);
    }
    if (bite > 0) {
      const tx = x + Math.cos(angle) * len * 0.4, ty = y + Math.sin(angle) * len * 0.4;
      g.fillStyle(VAMP.blood, 0.6 * bite);
      g.fillEllipse(tx, ty, 9 * scale, 7 * scale);
      g.fillStyle(VAMP.bloodLit, 0.75 * bite);
      g.fillCircle(tx, ty + 3 * scale, 1.8 * scale);
      g.fillCircle(tx + 1, ty + 6 * scale, 1.2 * scale);
    }
  }

  /** A garlic bulb with the fuse lit in its stem. Keeps the grenade's fuse and warning ring. */
  static drawGarlicBomb(
    g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, fuseLeft: number,
    spin = 0, settled = false,
  ): void {
    const urgency = Phaser.Math.Clamp(1 - fuseLeft / 3000, 0, 1);
    const panic = Phaser.Math.Clamp(1 - fuseLeft / 900, 0, 1);
    const beat = panic > 0
      ? Math.max(0.55 + 0.45 * Math.sin(t * 10), Math.pow(Math.abs(Math.sin(t * 22)), 0.35))
      : 0.55 + 0.45 * Math.sin(t * (6 + urgency * 18));
    const rot = settled ? 0 : spin;

    g.fillStyle(VAMP.black, settled ? 0.45 : 0.28);
    g.fillEllipse(x, y + (settled ? 9 : 12), settled ? 20 : 26, settled ? 7 : 5);
    garlicBulb(g, x, y + 1, 9, 1, rot);

    // Stem and the fuse running out of it.
    const nx = x + Math.sin(rot) * 11, ny = y - Math.cos(rot) * 11;
    g.fillStyle(VAMP.garlicShade, 1);
    g.fillTriangle(nx - 2.4, ny + 3, nx + 2.4, ny + 3, nx, ny - 3);
    const cordLen = 12 * (1 - urgency * 0.72);
    g.lineStyle(1.6, VAMP.garlicDeep, 0.95);
    g.beginPath();
    g.moveTo(nx, ny - 2);
    g.lineTo(nx + Math.sin(t * 3) * 2.5, ny - 2 - cordLen * 0.55);
    g.lineTo(nx - Math.sin(t * 3.7) * 3, ny - 2 - cordLen);
    g.strokePath();
    const ex = nx - Math.sin(t * 3.7) * 3, ey = ny - 2 - cordLen;
    g.fillStyle(VAMP.ember, 0.85 + 0.15 * beat);
    g.fillCircle(ex, ey, 2.2 + urgency * 1.8 + beat * 1.2);
    g.fillStyle(VAMP.white, 0.85 * beat);
    g.fillCircle(ex, ey, 1 + beat);

    // A settled bulb reeks: pale garlic vapour curling off it.
    if (settled) {
      for (let i = 0; i < 3; i++) {
        const f = (t * 0.9 + i * 0.33) % 1;
        g.fillStyle(VAMP.garlicShade, 0.2 * (1 - f));
        g.fillCircle(x + Math.sin(t * 2 + i * 2) * 6, y - 4 - f * 18, 2.5 + f * 5);
      }
    }

    if (panic <= 0) {
      g.lineStyle(1.6, VAMP.crimsonLit, 0.22 + urgency * 0.35);
      g.beginPath();
      g.arc(x, y, 20 - urgency * 4, t * 3, t * 3 + 2.2, false);
      g.strokePath();
    } else {
      const tr = 26 - panic * 12 + beat * 2;
      g.lineStyle(2 + panic * 1.5, VAMP.bloodLit, 0.35 + 0.5 * beat);
      g.strokeCircle(x, y, tr);
      for (let i = 0; i < 4; i++) {
        const ta = (i / 4) * TAU + t * 2;
        g.lineStyle(2, VAMP.white, 0.5 * beat);
        g.lineBetween(x + Math.cos(ta) * (tr - 4), y + Math.sin(ta) * (tr - 4),
          x + Math.cos(ta) * (tr + 4), y + Math.sin(ta) * (tr + 4));
      }
    }
  }

  /** Hunter's Trail: drops of the quarry's blood, a smear and two drips, fading with age. */
  static drawBloodTrail(
    g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, angle: number, t: number, life: number,
  ): void {
    const a = Phaser.Math.Clamp(life, 0, 1);
    g.fillStyle(VAMP.crimsonDeep, 0.18 * a);
    g.fillCircle(x, y, radius);
    const cos = Math.cos(angle), sin = Math.sin(angle);
    // A smear along the heading.
    g.fillStyle(VAMP.blood, 0.55 * a);
    g.fillEllipse(x - cos * radius * 0.1, y - sin * radius * 0.1, radius * 0.7, radius * 0.4);
    for (const [u, s, r] of [[0.45, 0.25, 0.16], [-0.4, -0.3, 0.12], [0.1, -0.45, 0.09]] as const) {
      const dx = x + cos * radius * u - sin * radius * s;
      const dy = y + sin * radius * u + cos * radius * s;
      g.fillStyle(VAMP.blood, 0.7 * a);
      g.fillCircle(dx, dy, radius * r);
      g.fillStyle(VAMP.bloodLit, 0.6 * a);
      g.fillCircle(dx - radius * r * 0.3, dy - radius * r * 0.3, radius * r * 0.35);
    }
    g.fillStyle(VAMP.crimsonLit, 0.2 * a * (0.5 + 0.5 * Math.sin(t * 3)));
    g.fillCircle(x, y - radius * 0.3 - (t * 6) % 8, radius * 0.16);
  }

  /** One bat, wings at `flap` (−1..1), facing `angle`. */
  static bat(
    g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, flap: number, alpha: number, angle = 0,
  ): void {
    const span = size * (0.75 + 0.25 * flap);
    const lift = size * 0.45 * flap;
    const c = Math.cos(angle) * 0.2;
    g.fillStyle(VAMP.black, alpha);
    for (const s of [-1, 1]) {
      g.fillPoints([
        P(x + s * size * 0.15, y - size * 0.1),
        P(x + s * span * 0.55, y - size * 0.25 - lift),
        P(x + s * span, y - size * 0.05 - lift * 1.2),
        P(x + s * span * 0.8, y + size * 0.22 - lift * 0.4),
        P(x + s * span * 0.55, y + size * 0.08 - lift * 0.3),
        P(x + s * span * 0.35, y + size * 0.28 - lift * 0.2),
        P(x + s * size * 0.15, y + size * 0.12),
      ], true);
    }
    g.fillStyle(VAMP.coatLit, alpha);
    g.fillEllipse(x + c, y, size * 0.36, size * 0.5);
    g.fillTriangle(x - size * 0.16, y - size * 0.18, x - size * 0.06, y - size * 0.18, x - size * 0.12, y - size * 0.38);
    g.fillTriangle(x + size * 0.16, y - size * 0.18, x + size * 0.06, y - size * 0.18, x + size * 0.12, y - size * 0.38);
    g.fillStyle(VAMP.bloodLit, alpha);
    g.fillCircle(x - size * 0.07, y - size * 0.06, Math.max(0.6, size * 0.05));
    g.fillCircle(x + size * 0.07, y - size * 0.06, Math.max(0.6, size * 0.05));
  }

  /** The morph: a crimson mist ring and a cloud of bats bursting outward. */
  batBurst(x: number, y: number, radius: number, count = 12, depth = 8): void {
    const bats = Array.from({ length: count }, (_, i) => ({
      a: (i / count) * TAU + Math.random() * 0.4,
      d: radius * (0.9 + Math.random() * 0.7),
      s: 6 + Math.random() * 4,
      ph: Math.random() * TAU,
      rise: 10 + Math.random() * 18,
    }));
    this.anim(depth, 760, (g, t) => {
      const e = easeOut(t);
      const fade = 1 - easeIn(t);
      g.fillStyle(VAMP.crimson, 0.32 * fade);
      g.fillCircle(x, y, radius * (0.4 + e * 0.8));
      g.lineStyle(3 * fade + 1, VAMP.bloodLit, 0.6 * fade);
      g.strokeCircle(x, y, radius * (0.3 + e * 0.9));
      for (const b of bats) {
        const bx = x + Math.cos(b.a) * b.d * e;
        const by = y + Math.sin(b.a) * b.d * e - b.rise * e;
        VampireFx.bat(g, bx, by, b.s, Math.sin(t * 34 + b.ph), fade, b.a);
      }
    });
  }

  /** Back to the hunter: bats wheel inward and a puff of garlic clears the air. */
  garlicPuff(x: number, y: number, radius: number, depth = 8): void {
    const flakes = Array.from({ length: 10 }, (_, i) => ({
      a: (i / 10) * TAU + Math.random() * 0.5,
      d: radius * (0.5 + Math.random() * 0.8),
      r: 1.4 + Math.random() * 1.6,
    }));
    this.anim(depth, 640, (g, t) => {
      const e = easeOut(t);
      const fade = 1 - t;
      g.fillStyle(VAMP.garlicShade, 0.3 * fade);
      g.fillCircle(x, y, radius * (0.5 + e * 0.7));
      g.fillStyle(VAMP.garlic, 0.25 * fade);
      g.fillCircle(x, y - 4, radius * (0.3 + e * 0.5));
      for (const f of flakes) {
        g.fillStyle(VAMP.garlic, 0.9 * fade);
        g.fillCircle(x + Math.cos(f.a) * f.d * e, y + Math.sin(f.a) * f.d * e - 8 * e, f.r);
      }
      // A few bats folding back into him.
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + t * 3;
        const d = radius * 1.4 * (1 - e);
        VampireFx.bat(g, x + Math.cos(a) * d, y + Math.sin(a) * d, 6, Math.sin(t * 30 + i), fade * 0.9);
      }
    });
  }

  /** A blood droplet flung off a vampire's hand. */
  droplet(x: number, y: number): void {
    const dx = (Math.random() - 0.5) * 14;
    this.anim(5, 480, (g, t) => {
      const fade = 1 - t;
      g.fillStyle(VAMP.blood, 0.85 * fade);
      g.fillCircle(x + dx * t, y + 22 * t * t, 1.8 * fade + 0.4);
    });
  }

  /** A fleck of garlic skin drifting off the hunter. */
  flake(x: number, y: number): void {
    const dx = (Math.random() - 0.5) * 18;
    this.anim(5, 560, (g, t) => {
      const fade = 1 - t;
      g.fillStyle(VAMP.garlic, 0.75 * fade);
      g.fillEllipse(x + dx * t, y - 10 * t + 16 * t * t, 2.6, 1.6);
    });
  }
}
