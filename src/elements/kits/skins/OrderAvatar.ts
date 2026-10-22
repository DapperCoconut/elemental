import Phaser from 'phaser';
import { ArmGesture, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeOut } from '../ElementVisuals';

/**
 * The Order skin's character: Ruin's cracked, spiked wreck replaced by a pristine marble statue.
 *
 * **Unmastered** is a marble bust on its socle — a smooth domed head, broad draped shoulders with
 * a toga sash pinned by a gold fibula, a Greek-key hem, a gilt laurel wreath on the brow.
 * **Mastered** is the statue become architecture: a whole fluted Ionic column standing on a
 * three-step stylobate, volutes curling off its capital, a little temple pediment for a crown
 * and a ruled gold halo turning slowly behind it.
 *
 * Nothing on him is broken, pitted, mossy or cracked. The veins in the marble are smooth curves.
 * Like every skin rig it takes the identity mapper — the palette here is already final.
 */

const ORD = {
  white: 0xfcfaf4,
  marble: 0xeee9de,
  shade: 0xd4cfc4,
  deep: 0xaaa69f,
  vein: 0x8e9ab0,
  veinSoft: 0xb9c3d3,
  gold: 0xc9a043,
  goldLit: 0xf2dc8e,
  goldDim: 0x8a6a22,
  lapis: 0x4f75b8,
  sky: 0xa9d3f2,
  slate: 0x2e3648,
};

/** Polished marble spheres in a gold glow — concentric discs, outermost first. */
const ORDER_AVATAR: AvatarSpec = {
  hands: [
    { r: 10.5, color: ORD.gold, alpha: 0.2 },
    { r: 7.2, color: ORD.gold, alpha: 1 },
    { r: 6.0, color: ORD.marble, alpha: 1 },
    { r: 3.4, color: ORD.white, alpha: 1, ox: -1.3, oy: -1.5 },
    { r: 1.4, color: ORD.sky, alpha: 0.9, ox: -2.1, oy: -2.3 },
  ],
  eyeWhite: ORD.white,
  eyePupil: ORD.slate,
  squash: { div: 15, x: 0.4, y: 0.24 },
};

const P = (x: number, y: number) => new Phaser.Geom.Point(x, y);

/** A tapered leaf, point-by-point: widest a third of the way along, pointed at both ends. */
function leaf(g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, len: number, w: number): void {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const pts: Phaser.Geom.Point[] = [];
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const half = w * Math.sin(Math.PI * Math.pow(u, 0.8));
    pts.push(P(x + ca * len * u - sa * half, y + sa * len * u + ca * half));
  }
  for (let i = steps - 1; i > 0; i--) {
    const u = i / steps;
    const half = w * Math.sin(Math.PI * Math.pow(u, 0.8));
    pts.push(P(x + ca * len * u + sa * half, y + sa * len * u - ca * half));
  }
  g.fillPoints(pts, true);
}

/** A smooth marble vein: a quadratic curve, never a zig-zag. */
function vein(
  g: Phaser.GameObjects.Graphics, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number,
): void {
  g.beginPath();
  for (let i = 0; i <= 10; i++) {
    const u = i / 10, iu = 1 - u;
    const px = iu * iu * x0 + 2 * iu * u * cx + u * u * x1;
    const py = iu * iu * y0 + 2 * iu * u * cy + u * u * y1;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
}

// ── OrderDust ─────────────────────────────────────────────────────────────

/** What a moving hand sheds: a fleck of polished marble dust that rises and fades, still square. */
class OrderDust extends FxBase {
  constructor(scene: Phaser.Scene) {
    super(scene, (c) => c);
  }

  mote(x: number, y: number): void {
    const drift = (Math.random() - 0.5) * 16;
    const s = 1.4 + Math.random() * 1.4;
    const gold = Math.random() < 0.35;
    this.anim(5, 560, (g, t) => {
      const px = x + drift * easeOut(t);
      const py = y - 18 * easeOut(t);
      g.fillStyle(gold ? ORD.goldLit : ORD.white, 0.85 * (1 - t));
      g.fillRect(px - s / 2, py - s / 2, s, s);
    });
  }
}

// ── OrderAvatar ───────────────────────────────────────────────────────────

export class OrderAvatar extends BaseAvatar {
  private dust: OrderDust;
  /** Ability tell: a gold gleam over the laurel / halo for a moment after a cast. */
  private flare = 0;

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, ORDER_AVATAR);
    this.dust = new OrderDust(scene);
  }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.flare = Math.max(0, this.flare - delta / 450);
    super.update(delta, x, y, alpha);
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.flare = 1;
    super.play(gesture, angle, duration);
  }

  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? ORD.white : ORD.marble);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 14 : 10.5);
      halo.setFillStyle(on ? ORD.sky : ORD.gold, on ? 0.28 : 0.2);
    });
    this.forEachHandLayer(4, (glint) => glint.setFillStyle(on ? ORD.lapis : ORD.sky, 0.9));
  }

  protected emitTrail(x: number, y: number): void {
    this.dust.mote(x, y);
  }

  // ── Glow ────────────────────────────────────────────────────────────────

  /** A clean pool of daylight on the floor; mastered, the ruled gold halo turning behind him. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const k = this.intensity;
    g.fillStyle(ORD.goldLit, a * 0.12 * k);
    g.fillEllipse(x, y + 24, 84, 26);
    g.fillStyle(ORD.white, a * 0.1 * k);
    g.fillCircle(x, y - 2, 30);

    if (!this.mastered) return;
    const cy = y - 8;
    const rot = this.t * 0.25;
    const gleam = 0.55 + this.flare * 0.45;
    g.fillStyle(ORD.sky, a * 0.12 * k);
    g.fillCircle(x, cy, 40);
    g.lineStyle(2.2, ORD.gold, alpha * 0.8 * gleam);
    g.strokeCircle(x, cy, 37);
    g.lineStyle(1, ORD.goldLit, alpha * 0.7 * gleam);
    g.strokeCircle(x, cy, 33.5);
    // Rays, ruled and evenly spaced, with a diamond on every other one.
    for (let i = 0; i < 16; i++) {
      const ang = rot + (i / 16) * TAU;
      const c = Math.cos(ang), s = Math.sin(ang);
      const r1 = i % 2 === 0 ? 47 : 42;
      g.lineStyle(i % 2 === 0 ? 1.8 : 1, ORD.gold, alpha * 0.65 * gleam);
      g.lineBetween(x + c * 38, cy + s * 38, x + c * r1, cy + s * r1);
      if (i % 2 === 0) {
        const dx = x + c * (r1 + 2.5), dy = cy + s * (r1 + 2.5);
        g.fillStyle(ORD.goldLit, alpha * 0.8 * gleam);
        g.fillPoints([P(dx, dy - 2.4), P(dx + 1.8, dy), P(dx, dy + 2.4), P(dx - 1.8, dy)], true);
      }
    }
  }

  // ── Body ────────────────────────────────────────────────────────────────

  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    if (this.mastered) this.drawColumn(g, x, y, alpha);
    else this.drawBust(g, x, y, alpha);
  }

  /** The unmastered bust: socle, draped shoulders, domed head, sash and fibula. */
  private drawBust(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    // Ground shadow.
    g.fillStyle(ORD.slate, alpha * 0.18);
    g.fillEllipse(x + 2, y + 28, 50, 9);

    // Socle: a foot slab, a tapered neck, and a gold ring where it meets the bust.
    g.fillStyle(ORD.deep, alpha);
    g.fillRect(x - 18, y + 23, 36, 5);
    g.fillStyle(ORD.shade, alpha);
    g.fillRect(x - 18, y + 22, 36, 3.5);
    g.fillStyle(ORD.white, alpha * 0.8);
    g.fillRect(x - 18, y + 22, 36, 1.2);
    const socle = [P(x - 9.5, y + 14), P(x + 9.5, y + 14), P(x + 13, y + 22), P(x - 13, y + 22)];
    g.fillStyle(ORD.marble, alpha);
    g.fillPoints(socle, true);
    g.fillStyle(ORD.shade, alpha);
    g.fillPoints([P(x + 3, y + 14), P(x + 9.5, y + 14), P(x + 13, y + 22), P(x + 4, y + 22)], true);
    g.fillStyle(ORD.gold, alpha);
    g.fillRect(x - 11, y + 13.5, 22, 2.4);
    g.fillStyle(ORD.goldLit, alpha * 0.9);
    g.fillRect(x - 11, y + 13.5, 22, 0.9);

    // Shoulders: a broad curve from the neck down to a gently curved cut at the base.
    const shoulders: Phaser.Geom.Point[] = [];
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps; // 0 = neck, 1 = shoulder tip
      shoulders.push(P(x - 10 - 14 * Math.sin(u * Math.PI / 2), y - 6 + 14 * (1 - Math.cos(u * Math.PI / 2)) * 0.8));
    }
    for (let i = 0; i <= steps; i++) {
      const u = i / steps; // bottom edge, left → right
      shoulders.push(P(x - 24 + 48 * u, y + 15.5 + Math.sin(u * Math.PI) * 1.8));
    }
    for (let i = steps; i >= 0; i--) {
      const u = i / steps;
      shoulders.push(P(x + 10 + 14 * Math.sin(u * Math.PI / 2), y - 6 + 14 * (1 - Math.cos(u * Math.PI / 2)) * 0.8));
    }
    g.fillStyle(ORD.deep, alpha * 0.9);
    g.fillPoints(shoulders.map((p) => P(p.x + 1.8, p.y + 1.2)), true);
    g.fillStyle(ORD.marble, alpha);
    g.fillPoints(shoulders, true);
    // Shadow side of the drapery.
    g.fillStyle(ORD.shade, alpha * 0.9);
    g.fillPoints([P(x + 8, y + 2), P(x + 23, y + 6), P(x + 24, y + 15), P(x + 6, y + 16)], true);

    // Head: a smooth dome, lit upper left, shaded crescent on the right.
    g.fillStyle(ORD.shade, alpha);
    g.fillEllipse(x + 1.2, y - 6, 37, 35);
    g.fillStyle(ORD.marble, alpha);
    g.fillEllipse(x - 0.6, y - 6.6, 35, 33.5);
    g.fillStyle(ORD.white, alpha * 0.75);
    g.fillEllipse(x - 6, y - 13, 15, 10);
    // Chin and jaw line, a soft shadow so the head sits on the shoulders.
    g.fillStyle(ORD.shade, alpha * 0.6);
    g.fillEllipse(x + 1, y + 9.5, 22, 4.5);

    // The toga sash: a band from the left shoulder down across to the right hip, gold-edged.
    const sash = [P(x - 23, y + 6), P(x - 14, y + 2), P(x + 24, y + 13), P(x + 20, y + 15.5)];
    g.fillStyle(ORD.white, alpha);
    g.fillPoints(sash, true);
    g.lineStyle(1.2, ORD.gold, alpha * 0.95);
    g.lineBetween(sash[0].x, sash[0].y, sash[3].x, sash[3].y);
    g.lineBetween(sash[1].x, sash[1].y, sash[2].x, sash[2].y);
    // Folds in the sash.
    g.lineStyle(0.9, ORD.veinSoft, alpha * 0.7);
    for (const f of [0.3, 0.55, 0.78]) {
      const ax = sash[0].x + (sash[3].x - sash[0].x) * f, ay = sash[0].y + (sash[3].y - sash[0].y) * f;
      const bx = sash[1].x + (sash[2].x - sash[1].x) * f, by = sash[1].y + (sash[2].y - sash[1].y) * f;
      g.lineBetween(ax, ay, bx * 0.5 + ax * 0.5, by * 0.5 + ay * 0.5);
    }

    // Greek-key hem along the base of the bust.
    g.fillStyle(ORD.gold, alpha);
    g.fillRect(x - 22, y + 12.6, 44, 2.6);
    g.lineStyle(0.8, ORD.goldDim, alpha * 0.9);
    for (let i = 0; i < 7; i++) {
      const kx = x - 20 + i * 6.2;
      g.lineBetween(kx, y + 15.2, kx, y + 13.4);
      g.lineBetween(kx, y + 13.4, kx + 3, y + 13.4);
      g.lineBetween(kx + 3, y + 13.4, kx + 3, y + 14.4);
    }

    // Fibula: the gold brooch pinning the sash at the shoulder.
    g.fillStyle(ORD.goldDim, alpha);
    g.fillCircle(x - 17.5, y + 4.6, 3.4);
    g.fillStyle(ORD.gold, alpha);
    g.fillCircle(x - 17.8, y + 4.2, 3);
    g.fillStyle(ORD.lapis, alpha);
    g.fillCircle(x - 17.8, y + 4.2, 1.5);
    g.fillStyle(ORD.goldLit, alpha);
    g.fillCircle(x - 18.6, y + 3.4, 0.8);

    // Veins: smooth, sparse, faint.
    g.lineStyle(0.8, ORD.veinSoft, alpha * 0.55);
    vein(g, x - 15, y - 16, x - 4, y - 18, x + 4, y - 21);
    vein(g, x + 9, y + 3, x + 15, y + 8, x + 13, y + 14);
    g.lineStyle(0.6, ORD.vein, alpha * 0.3);
    vein(g, x - 22, y + 10, x - 18, y + 9, x - 12, y + 12);
  }

  /** Mastered: a whole fluted Ionic column on a stepped base. */
  private drawColumn(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    // Ground shadow and the three-step stylobate.
    g.fillStyle(ORD.slate, alpha * 0.2);
    g.fillEllipse(x + 2, y + 31, 64, 10);
    const steps = [
      { w: 58, y0: 25, h: 5 },
      { w: 51, y0: 21, h: 4.5 },
      { w: 45, y0: 17, h: 4.5 },
    ];
    for (const s of steps) {
      g.fillStyle(ORD.deep, alpha);
      g.fillRect(x - s.w / 2, y + s.y0, s.w, s.h);
      g.fillStyle(ORD.marble, alpha);
      g.fillRect(x - s.w / 2, y + s.y0, s.w, s.h - 1.4);
      g.fillStyle(ORD.white, alpha * 0.85);
      g.fillRect(x - s.w / 2, y + s.y0, s.w, 1);
    }
    // Torus at the foot of the shaft.
    g.fillStyle(ORD.shade, alpha);
    g.fillEllipse(x, y + 16.5, 46, 5);
    g.fillStyle(ORD.white, alpha * 0.8);
    g.fillEllipse(x - 2, y + 15.8, 40, 2.6);

    // The shaft with a touch of entasis, built point-by-point.
    const top = -15, bot = 16;
    const half = (u: number) => 20.4 + Math.sin(u * Math.PI) * 1.0 + u * 1.2;
    const shaft: Phaser.Geom.Point[] = [];
    const n = 10;
    for (let i = 0; i <= n; i++) { const u = i / n; shaft.push(P(x - half(u), y + top + (bot - top) * u)); }
    for (let i = n; i >= 0; i--) { const u = i / n; shaft.push(P(x + half(u), y + top + (bot - top) * u)); }
    g.fillStyle(ORD.marble, alpha);
    g.fillPoints(shaft, true);
    // Shading: right third in shade, a lit strip down the left.
    g.fillStyle(ORD.shade, alpha * 0.95);
    g.fillPoints([P(x + 8, y + top), P(x + half(0), y + top), P(x + half(1), y + bot), P(x + 8.6, y + bot)], true);
    g.fillStyle(ORD.deep, alpha * 0.5);
    g.fillPoints([P(x + 15, y + top), P(x + half(0), y + top), P(x + half(1), y + bot), P(x + 16, y + bot)], true);
    g.fillStyle(ORD.white, alpha * 0.85);
    g.fillPoints([P(x - 15, y + top), P(x - 9, y + top), P(x - 9.5, y + bot), P(x - 16, y + bot)], true);
    // Flutes: paired channel + lit fillet. The middle ones pass under the eyes, so keep them thin.
    for (const fx of [-13, -6.5, 0, 6.5, 13]) {
      g.lineStyle(1.3, fx > 6 ? ORD.deep : ORD.vein, alpha * 0.42);
      g.lineBetween(x + fx, y + top + 1, x + fx * 1.05, y + bot - 1);
      g.lineStyle(0.7, ORD.white, alpha * 0.5);
      g.lineBetween(x + fx - 1.4, y + top + 1, x + (fx - 1.4) * 1.05, y + bot - 1);
    }
    g.lineStyle(0.7, ORD.veinSoft, alpha * 0.5);
    vein(g, x - 17, y + 6, x - 12, y + 10, x - 13, y + 15);

    // Astragal ring.
    g.fillStyle(ORD.goldDim, alpha);
    g.fillRect(x - 21.5, y - 16.5, 43, 3.4);
    g.fillStyle(ORD.gold, alpha);
    g.fillRect(x - 21.5, y - 16.5, 43, 2.4);
    g.fillStyle(ORD.goldLit, alpha * 0.9);
    g.fillRect(x - 21.5, y - 16.5, 43, 0.8);

    // Echinus, with egg-and-dart.
    g.fillStyle(ORD.marble, alpha);
    g.fillRect(x - 23, y - 21.5, 46, 5.2);
    g.fillStyle(ORD.shade, alpha * 0.85);
    for (let i = 0; i < 6; i++) g.fillEllipse(x - 17.5 + i * 7, y - 18.8, 4.2, 3.6);
    g.fillStyle(ORD.white, alpha * 0.7);
    for (let i = 0; i < 6; i++) g.fillEllipse(x - 18 + i * 7, y - 19.4, 2.2, 1.8);

    // Volutes: a spiral off each end of the capital.
    for (const side of [-1, 1]) {
      const cx = x + side * 23.5, cy = y - 18.4;
      g.fillStyle(ORD.marble, alpha);
      g.fillCircle(cx, cy, 5.6);
      g.fillStyle(ORD.shade, alpha * 0.6);
      g.fillCircle(cx + 0.8, cy + 0.8, 4.2);
      g.lineStyle(1.2, ORD.gold, alpha * 0.95);
      g.beginPath();
      for (let i = 0; i <= 22; i++) {
        const u = i / 22;
        const ang = side * (u * TAU * 1.6) - Math.PI / 2;
        const r = 5 * (1 - u * 0.82);
        const px = cx + Math.cos(ang) * r, py = cy + Math.sin(ang) * r;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
      g.fillStyle(ORD.goldLit, alpha);
      g.fillCircle(cx, cy, 1.1);
    }

    // Abacus: the flat slab on top, gold-lined.
    g.fillStyle(ORD.deep, alpha);
    g.fillRect(x - 26, y - 25, 52, 4.2);
    g.fillStyle(ORD.white, alpha);
    g.fillRect(x - 26, y - 25.6, 52, 3.4);
    g.lineStyle(1, ORD.gold, alpha);
    g.lineBetween(x - 26, y - 25.6, x + 26, y - 25.6);
  }

  // ── Extras ──────────────────────────────────────────────────────────────

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    if (this.mastered) this.drawPediment(g, x, y, alpha);
    else this.drawLaurel(g, x, y, alpha);
  }

  /** A gilt laurel wreath around the crown of the bust, tied at the back with a ribbon tip. */
  private drawLaurel(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const gleam = this.flare;
    const sway = Math.sin(this.t * 1.6) * 0.05;
    for (const side of [-1, 1]) {
      // A branch following the dome from the temple up toward the brow's centre.
      for (let i = 0; i < 6; i++) {
        const phi = 0.45 + (i / 5) * 0.95;
        const hx = x - 0.6 + side * Math.cos(phi) * 17;
        const hy = y - 6.6 - Math.sin(phi) * 16.2;
        // Tangent along the dome toward the top, so each leaf points up the branch.
        const tang = Math.atan2(-Math.cos(phi) * 16.2, -side * Math.sin(phi) * 17) + sway * side;
        g.fillStyle(ORD.goldDim, alpha);
        leaf(g, hx + 0.6, hy + 0.8, tang, 7.2, 2.1);
        g.fillStyle(i % 2 === 0 ? ORD.gold : ORD.goldLit, alpha);
        leaf(g, hx, hy, tang, 7, 1.9);
        // Outer leaf of each pair, angled away from the head.
        g.fillStyle(ORD.gold, alpha * 0.95);
        leaf(g, hx, hy, tang + side * 0.8, 5.6, 1.6);
      }
      // Ribbon ends trailing at the temple.
      g.fillStyle(ORD.lapis, alpha * 0.9);
      g.fillPoints([P(x + side * 16, y - 15), P(x + side * 19.5, y - 9.5), P(x + side * 17.6, y - 9)], true);
    }
    // Centre clasp.
    g.fillStyle(ORD.gold, alpha);
    g.fillCircle(x, y - 23.4, 2);
    g.fillStyle(ORD.goldLit, alpha);
    g.fillCircle(x - 0.5, y - 23.9, 0.9);
    if (gleam > 0) {
      g.fillStyle(ORD.white, alpha * 0.6 * gleam);
      g.fillCircle(x - 9, y - 21, 2.4 * gleam);
      g.fillCircle(x + 9, y - 21, 2.4 * gleam);
    }
  }

  /** Mastered crown: a small temple pediment on the abacus, a lapis disc in its tympanum. */
  private drawPediment(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const gleam = this.flare;
    // Frieze: a narrow band with triglyphs.
    g.fillStyle(ORD.marble, alpha);
    g.fillRect(x - 24, y - 28.6, 48, 3.2);
    g.fillStyle(ORD.vein, alpha * 0.45);
    for (let i = 0; i < 6; i++) g.fillRect(x - 21 + i * 8.2, y - 28.4, 1.4, 2.8);
    // Pediment triangle, cornice lined in gold.
    const ped = [P(x - 26, y - 28.6), P(x, y - 36), P(x + 26, y - 28.6)];
    g.fillStyle(ORD.shade, alpha);
    g.fillPoints(ped.map((p) => P(p.x + 1, p.y + 0.8)), true);
    g.fillStyle(ORD.white, alpha);
    g.fillPoints(ped, true);
    g.lineStyle(1.4, ORD.gold, alpha);
    g.lineBetween(ped[0].x, ped[0].y, ped[1].x, ped[1].y);
    g.lineBetween(ped[1].x, ped[1].y, ped[2].x, ped[2].y);
    g.lineStyle(1, ORD.goldDim, alpha * 0.8);
    g.lineBetween(ped[0].x, ped[0].y, ped[2].x, ped[2].y);
    // Tympanum seal.
    g.fillStyle(ORD.lapis, alpha);
    g.fillCircle(x, y - 31.2, 2.4);
    g.fillStyle(ORD.sky, alpha * (0.6 + gleam * 0.4));
    g.fillCircle(x - 0.6, y - 31.8, 1);
    // Acroteria: gold finials at the apex and corners.
    g.fillStyle(ORD.goldLit, alpha);
    for (const [ax, ay, s] of [[x, y - 36.5, 2.4], [x - 26, y - 29, 1.8], [x + 26, y - 29, 1.8]] as const) {
      g.fillPoints([P(ax, ay - s * 1.3), P(ax + s * 0.8, ay), P(ax, ay + s * 0.6), P(ax - s * 0.8, ay)], true);
    }
    if (gleam > 0) {
      g.fillStyle(ORD.white, alpha * 0.7 * gleam);
      g.fillCircle(x, y - 36.5, 4 * gleam);
    }
  }
}
