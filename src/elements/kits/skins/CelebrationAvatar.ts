import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn } from '../ElementVisuals';
import { CELE, CelebrationFx, RAINBOW } from './CelebrationFx';

/**
 * The Celebration skin's character: Magma's pirate replaced by the life of the party.
 *
 * **Unmastered** — a party guest: a pear-shaped body in a rainbow-striped party sweater, a
 * big polka-dot bow tie, a streamer slung across it, and a tall striped cone hat with a
 * pom-pom on top. **Mastered** — the birthday cake itself: a three-tier cake (stepped
 * silhouette) dripping frosting and studded with sprinkles and cherries, three lit candles on
 * top in place of the hat, and a bundle of balloons tied on and floating over its shoulder.
 *
 * Mirrors MagmaAvatar's kit-facing hooks (`setVenting`, `setHelm`, `setPendant`) so MagmaKit
 * drives it the same way: venting puffs confetti off the hat / candles, and Molten Mutiny's
 * pendant — a gameplay tell — becomes a lollipop medallion on the chest that fills as it charges.
 */

/** Wrapped sweets for hands — halo, candy, lit candy, glint. */
const CELEBRATION_AVATAR: AvatarSpec = {
  hands: [
    { r: 11, color: CELE.bubblegum, alpha: 0.26 },
    { r: 6.8, color: CELE.pink, alpha: 1 },
    { r: 4.2, color: CELE.bubblegum, alpha: 1 },
    { r: 1.9, color: CELE.white, alpha: 0.95, ox: -1.6, oy: -1.6 },
  ],
  eyeWhite: CELE.white,
  eyePupil: CELE.ink,
  squash: { div: 15, x: 0.42, y: 0.22 },
};

const BASE_Y = 23;

function pt(x: number, y: number): Phaser.Geom.Point {
  return new Phaser.Geom.Point(x, y);
}

export class CelebrationAvatar extends BaseAvatar {
  private fx: CelebrationFx;
  private vent = 0;
  private ventTarget = 0;
  private helm = 0;
  private atHelm = false;
  private pendant = -1;
  private candlePhase = [0, 2.1, 4.3];

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, CELEBRATION_AVATAR);
    this.fx = new CelebrationFx(scene);
  }

  setVenting(on: boolean): void { this.ventTarget = on ? 1 : 0; }
  setHelm(on: boolean): void { this.atHelm = on; }
  setPendant(power: number): void { this.pendant = power; }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.vent += (this.ventTarget - this.vent) * Math.min(1, delta / 150);
    this.helm += ((this.atHelm ? 1 : 0) - this.helm) * Math.min(1, delta / 220);
    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? CELE.cream : CELE.white);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 14 : 11);
      halo.setFillStyle(on ? CELE.lemon : CELE.bubblegum, on ? 0.34 : 0.26);
    });
    this.forEachHandLayer(1, (core) => {
      if (on) core.setStrokeStyle(1.6, CELE.lemon, 0.95);
      else core.setStrokeStyle();
    });
  }

  protected emitTrail(x: number, y: number): void {
    this.fx.confettiBurst(x, y, 10, 3, 600, 5);
  }

  /** How far the hat / candle flames lean — the hands trail the body, so they say which way it runs. */
  private leanFrom(x: number): number {
    const mean = (this.armX[0] + this.armX[1]) / 2;
    return Phaser.Math.Clamp((mean - x) * 0.4, -7, 7);
  }

  // ── Glow ────────────────────────────────────────────────────────────────

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const ground = 1 - this.helm * 0.7;
    // A soft disco-pink pool of light underfoot.
    g.fillStyle(CELE.pink, a * (0.12 + this.vent * 0.16) * ground);
    g.fillEllipse(x, y + BASE_Y, 64 + this.vent * 12, 18 + this.vent * 4);
    if (this.mastered) {
      // Candlelight over the top of the cake, and a ring of fallen confetti round its foot.
      const flick = 0.9 + Math.sin(this.t * 9.4) * 0.08;
      g.fillStyle(CELE.lemon, a * 0.16 * flick);
      g.fillCircle(x, y - 34, 30 * flick);
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2 + 0.3;
        g.fillStyle(RAINBOW[i % 6], alpha * 0.8 * ground);
        g.fillRect(x + Math.cos(ang) * 32 - 1.5, y + BASE_Y + 2 + Math.sin(ang) * 8 - 1, 3, 2);
      }
    }
  }

  // ── Body ────────────────────────────────────────────────────────────────

  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    if (this.mastered) this.drawCake(g, x, y, alpha);
    else this.drawGuest(g, x, y, alpha);
    if (this.pendant >= 0) this.drawLollipop(g, x, y, alpha);
  }

  /** Half-width of the guest's pear body at height `yy` (relative to centre). */
  private guestHalf(yy: number): number {
    const u = Phaser.Math.Clamp((yy + 23) / 46, 0, 1);
    return 15 + 9.5 * Math.sin(u * Math.PI * 0.62);
  }

  private drawGuest(g: Phaser.GameObjects.Graphics, x: number, y: number, A: number): void {
    const top = -23, bot = BASE_Y;
    const outline = (inset: number, dx: number): Phaser.Geom.Point[] => {
      const steps = 10;
      const left: Phaser.Geom.Point[] = [];
      const right: Phaser.Geom.Point[] = [];
      for (let i = 0; i <= steps; i++) {
        const yy = top + (bot - top) * (i / steps);
        const hw = this.guestHalf(yy) - inset;
        left.push(pt(x + dx - hw, y + yy));
        right.unshift(pt(x + dx + hw, y + yy));
      }
      return left.concat(right);
    };
    // Shadow side, then the body.
    g.fillStyle(CELE.plum, A);
    g.fillPoints(outline(-1, 2), true);
    g.fillEllipse(x + 2, y + bot, 50, 9);
    g.fillStyle(CELE.pink, A);
    g.fillPoints(outline(0, 0), true);
    g.fillEllipse(x, y + top, 30, 9);
    g.fillEllipse(x, y + bot, 48, 9);

    // Sweater stripes across the lower half — each band follows the body's width.
    for (let b = 0; b < 4; b++) {
      const y0 = 6 + b * 4.2;
      const steps = 3;
      const left: Phaser.Geom.Point[] = [];
      const right: Phaser.Geom.Point[] = [];
      for (let i = 0; i <= steps; i++) {
        const yy = y0 + 2.2 * (i / steps);
        const hw = this.guestHalf(yy) - 0.5;
        left.push(pt(x - hw, y + yy));
        right.unshift(pt(x + hw, y + yy));
      }
      g.fillStyle(RAINBOW[(b * 2 + 1) % 6], A * 0.95);
      g.fillPoints(left.concat(right), true);
    }
    // Lit panel down the front left.
    g.fillStyle(CELE.bubblegum, A * 0.5);
    g.fillPoints([pt(x - 13, y - 18), pt(x - 7, y - 20), pt(x - 5, y + 18), pt(x - 15, y + 16)], true);

    // Confetti dots over the shoulders, clear of the eyes.
    const dots: [number, number, number][] = [[-15, -12, 0], [14, -14, 2], [-18, -2, 4], [17, -4, 1], [10, 2, 3], [-9, 3, 5]];
    for (const [dx, dy, c] of dots) {
      g.fillStyle(RAINBOW[c], A);
      g.fillCircle(x + dx, y + dy, 1.6);
    }

    // A streamer slung across the body, waving at the loose end.
    const sw = Math.sin(this.t * 3.1) * 1.6;
    const band: Phaser.Geom.Point[] = [];
    const back: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      const cx = x - 21 + u * 42;
      const cy = y + 2 + u * 15 + Math.sin(u * 9 + this.t * 2) * 1.4;
      const w = 1.4 + Math.abs(Math.cos(u * 6 + this.t)) * 1.2;
      band.push(pt(cx, cy - w));
      back.unshift(pt(cx, cy + w));
    }
    g.fillStyle(CELE.lemon, A);
    g.fillPoints(band.concat(back), true);
    g.fillTriangle(x + 19, y + 16, x + 22, y + 17, x + 24 + sw, y + 25);

    // Bow tie, under the eyes.
    const by = y + 6;
    g.fillStyle(CELE.sky, A);
    g.fillTriangle(x, by, x - 9, by - 4.5, x - 9, by + 4.5);
    g.fillTriangle(x, by, x + 9, by - 4.5, x + 9, by + 4.5);
    g.fillStyle(CELE.white, A * 0.9);
    for (const [dx, dy] of [[-6, -1.4], [-6.5, 2], [6, -1.4], [6.5, 2]]) g.fillCircle(x + dx, by + dy, 0.9);
    g.fillStyle(CELE.mint, A);
    g.fillCircle(x, by, 2.4);
  }

  /** The three-tier cake. Tiers step in toward the top; the face sits on the middle tier. */
  private drawCake(g: Phaser.GameObjects.Graphics, x: number, y: number, A: number): void {
    const tiers: Array<{ top: number; bot: number; hw: number; col: number; shade: number }> = [
      { top: 5, bot: BASE_Y, hw: 26, col: CELE.pink, shade: CELE.plum },
      { top: -10, bot: 5, hw: 21, col: CELE.blush, shade: CELE.grape },
      { top: -24, bot: -10, hw: 15.5, col: CELE.cream, shade: CELE.lilac },
    ];

    // Cake board under the whole thing.
    g.fillStyle(CELE.lemon, A);
    g.fillEllipse(x, y + BASE_Y + 2, 64, 13);
    g.fillStyle(CELE.cream, A * 0.7);
    g.fillEllipse(x, y + BASE_Y + 1, 54, 8);

    for (let k = 0; k < tiers.length; k++) {
      const tr = tiers[k];
      // Shadow side.
      g.fillStyle(tr.shade, A);
      g.fillRoundedRect(x - tr.hw + 2, y + tr.top, tr.hw * 2, tr.bot - tr.top, 3);
      g.fillStyle(tr.col, A);
      g.fillRoundedRect(x - tr.hw, y + tr.top, tr.hw * 2 - 2, tr.bot - tr.top, 3);
      // Lit stripe down the front left of each tier.
      g.fillStyle(CELE.white, A * 0.3);
      g.fillRect(x - tr.hw + 4, y + tr.top + 3, 4, tr.bot - tr.top - 5);
      // Frosting drips off the top edge — tapered, built point by point.
      const frost = k === 0 ? CELE.cream : k === 1 ? CELE.pink : CELE.bubblegum;
      g.fillStyle(frost, A);
      g.fillRoundedRect(x - tr.hw - 1, y + tr.top - 1.5, tr.hw * 2 + 1, 4, 2);
      const drips = Math.round(tr.hw / 4.5);
      for (let i = 0; i < drips; i++) {
        const dx = x - tr.hw + 2 + (i + 0.5) * ((tr.hw * 2 - 4) / drips);
        const len = 3 + ((i * 7 + k * 3) % 5) * 1.3;
        const top = y + tr.top + 2;
        g.fillPoints([
          pt(dx - 2.2, top), pt(dx - 1.6, top + len * 0.6), pt(dx - 0.6, top + len),
          pt(dx + 0.6, top + len), pt(dx + 1.6, top + len * 0.6), pt(dx + 2.2, top),
        ], true);
        g.fillCircle(dx, top + len, 1.5);
      }
      // Piped beads along the bottom seam.
      if (k > 0) {
        for (let i = 0; i < Math.round(tr.hw / 3); i++) {
          g.fillStyle(CELE.white, A * 0.9);
          g.fillCircle(x - tr.hw + 2 + i * 6, y + tr.bot - 0.5, 1.4);
        }
      }
    }

    // Sprinkles on the bottom tier and cherries round its rim.
    for (let i = 0; i < 12; i++) {
      const sx = x - 22 + ((i * 37) % 44);
      const sy = y + 11 + ((i * 13) % 10);
      const ang = i * 1.3;
      g.lineStyle(1.6, RAINBOW[i % 6], A);
      g.lineBetween(sx - Math.cos(ang) * 1.8, sy - Math.sin(ang) * 1.8, sx + Math.cos(ang) * 1.8, sy + Math.sin(ang) * 1.8);
    }
    for (const cx of [-21, 21]) {
      g.fillStyle(CELE.cherry, A);
      g.fillCircle(x + cx, y + 4, 3);
      g.fillStyle(CELE.white, A * 0.7);
      g.fillCircle(x + cx - 1, y + 3, 1);
    }
  }

  /** Molten Mutiny's pendant as a lollipop medallion — the swirl brightens and spins as it charges. */
  private drawLollipop(g: Phaser.GameObjects.Graphics, x: number, y: number, A: number): void {
    const p = this.pendant;
    const lean = Math.cos(this.facing) * 1.5;
    const gx = x + lean * 0.5, gy = y + 14;
    // Ribbon round the neck.
    g.lineStyle(1.3, CELE.lemon, A * 0.9);
    g.beginPath();
    g.arc(gx, y - 4, 12, Math.PI * 0.14, Math.PI * 0.86, false);
    g.strokePath();
    g.lineStyle(1.6, CELE.cream, A);
    g.lineBetween(gx, y + 7, gx, gy - 4);
    g.fillStyle(CELE.cherry, A * (0.2 + p * 0.5));
    g.fillCircle(gx, gy, 6 + p * 5);
    g.fillStyle(CELE.white, A);
    g.fillCircle(gx, gy, 5);
    // The swirl: alternating rainbow wedges, turning faster the fuller it is.
    const spin = this.t * (1 + p * 6);
    for (let i = 0; i < 6; i++) {
      const a0 = spin + (i / 6) * Math.PI * 2;
      g.fillStyle(RAINBOW[i], A * (0.55 + p * 0.45));
      g.slice(gx, gy, 4.4, a0, a0 + Math.PI / 6, false);
      g.fillPath();
    }
    g.fillStyle(CELE.white, A * (0.3 + p * 0.6));
    g.fillCircle(gx - 1.4, gy - 1.6, 1 + p * 0.8);
  }

  // ── Extras (above the crown) ────────────────────────────────────────────

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const A = alpha;
    const lean = this.leanFrom(x);
    if (this.mastered) {
      this.drawBalloons(g, x, y, A);
      this.drawCandles(g, x, y, a, A, lean);
    } else {
      this.drawHat(g, x, y, A, lean);
    }
    this.drawWrappers(g, A);

    // Confetti puffing up off the top while venting.
    if (this.vent > 0.08) {
      for (let i = 0; i < 6; i++) {
        const ph = (this.t * 2 + i / 6) % 1;
        const px = x + lean + Math.sin(ph * 6 + i * 1.7) * (6 + i * 2);
        const py = y - (this.mastered ? 42 : 46) - ph * 22;
        g.fillStyle(RAINBOW[i], A * this.vent * (1 - ph));
        g.fillRect(px - 1.5, py - 1, 3, 2);
      }
    }
  }

  /** The cone party hat, rooted on the crown with a stripe pattern and a pom-pom. */
  private drawHat(g: Phaser.GameObjects.Graphics, x: number, y: number, A: number, lean: number): void {
    const by = y - 19;
    const tipX = x + 4 + lean, tipY = y - 46;
    const bl = x - 10, br = x + 10;
    // Shadow side, then the cone.
    g.fillStyle(CELE.grape, A);
    g.fillTriangle(bl + 1.5, by + 1, br + 1.5, by + 1, tipX + 1, tipY);
    g.fillStyle(CELE.sky, A);
    g.fillTriangle(bl, by, br, by, tipX, tipY);
    // Diagonal stripes as bands across the cone.
    for (let i = 0; i < 3; i++) {
      const f0 = 0.15 + i * 0.27, f1 = f0 + 0.12;
      const lx0 = bl + (tipX - bl) * f0, ly0 = by + (tipY - by) * f0;
      const lx1 = bl + (tipX - bl) * f1, ly1 = by + (tipY - by) * f1;
      const rx0 = br + (tipX - br) * (f0 + 0.08), ry0 = by + (tipY - by) * (f0 + 0.08);
      const rx1 = br + (tipX - br) * (f1 + 0.08), ry1 = by + (tipY - by) * (f1 + 0.08);
      g.fillStyle(i % 2 ? CELE.lemon : CELE.pink, A);
      g.fillPoints([pt(lx0, ly0), pt(rx0, ry0), pt(rx1, ry1), pt(lx1, ly1)], true);
    }
    // Rim and elastic.
    g.fillStyle(CELE.cream, A);
    g.fillEllipse(x, by, 22, 4);
    // Pom-pom: a burst of short tufts.
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + this.t * 0.5;
      g.fillStyle(RAINBOW[i % 6], A);
      g.fillCircle(tipX + Math.cos(ang) * 2.8, tipY + Math.sin(ang) * 2.8, 2.2);
    }
    g.fillStyle(CELE.white, A);
    g.fillCircle(tipX, tipY, 2);
  }

  /** Three candles on the top tier, flames leaning with the run. */
  private drawCandles(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, A: number, lean: number): void {
    const cols = [CELE.sky, CELE.mint, CELE.lemon];
    for (let i = 0; i < 3; i++) {
      const cx = x - 9 + i * 9;
      const top = y - 24 - 11 - (i === 1 ? 3 : 0);
      const bot = y - 24;
      g.fillStyle(cols[i], A);
      g.fillRect(cx - 2, top, 4, bot - top);
      g.fillStyle(CELE.white, A * 0.8);
      for (let k = 0; k < 3; k++) g.fillRect(cx - 2, top + 2 + k * 3.5, 4, 1.2);
      g.lineStyle(1.2, CELE.ink, A);
      g.lineBetween(cx, top, cx + lean * 0.12, top - 2.6);
      const ph = this.candlePhase[i];
      const fl = 1 + Math.sin(this.t * 11 + ph) * 0.12;
      const fy = top - 3;
      const h = 9 * fl * this.intensity, w = 3 * fl;
      g.fillStyle(CELE.tangerine, a * 0.3);
      g.fillCircle(cx + lean * 0.3, fy - h * 0.4, 7);
      // Teardrop flame built point by point.
      const pts: Phaser.Geom.Point[] = [];
      const back: Phaser.Geom.Point[] = [];
      for (let k = 0; k <= 8; k++) {
        const u = k / 8;
        const half = w * Math.pow(Math.sin(Math.PI * (0.3 + 0.7 * u)), 0.85);
        const fx = cx + lean * u * u * 0.5;
        pts.push(pt(fx - half, fy - h * u));
        back.unshift(pt(fx + half, fy - h * u));
      }
      g.fillStyle(CELE.tangerine, A * 0.95);
      g.fillPoints(pts.concat(back), true);
      g.fillStyle(CELE.lemon, A);
      g.fillEllipse(cx + lean * 0.1, fy - h * 0.25, w * 1.1, h * 0.5);
    }
  }

  /** Balloons tied off the back of the cake, floating up over the right shoulder. */
  private drawBalloons(g: Phaser.GameObjects.Graphics, x: number, y: number, A: number): void {
    const tieX = x + 17, tieY = y - 20;
    const balloons: Array<[number, number, number]> = [[8, -40, 0], [22, -46, 2], [34, -36, 4], [18, -30, 1], [30, -24, 5]];
    for (let i = 0; i < balloons.length; i++) {
      const [dx, dy, c] = balloons[i];
      const bob = Math.sin(this.t * 1.7 + i * 1.3) * 2;
      const bx = x + dx + Math.sin(this.t * 1.1 + i) * 1.5, by = y + dy + bob;
      g.lineStyle(0.9, CELE.cream, A * 0.85);
      g.lineBetween(tieX, tieY, bx, by + 7);
      g.fillStyle(RAINBOW[c], A);
      g.fillEllipse(bx, by, 12, 14);
      g.fillTriangle(bx - 1.6, by + 7.2, bx + 1.6, by + 7.2, bx, by + 5);
      g.fillStyle(CELE.white, A * 0.5);
      g.fillEllipse(bx - 2.4, by - 3, 3, 4.4);
    }
    g.fillStyle(CELE.lemon, A);
    g.fillCircle(tieX, tieY, 1.8);
  }

  /** Cellophane twists either side of each candy hand. */
  private drawWrappers(g: Phaser.GameObjects.Graphics, A: number): void {
    for (let i = 0; i < 2; i++) {
      const hx = this.armX[i], hy = this.armY[i];
      const tw = Math.sin(this.t * 4 + i) * 0.8;
      g.fillStyle(this.mastered ? CELE.lemon : CELE.blush, A * 0.85);
      g.fillTriangle(hx - 5.5, hy, hx - 11, hy - 4 + tw, hx - 11, hy + 4 - tw);
      g.fillTriangle(hx + 5.5, hy, hx + 11, hy - 4 - tw, hx + 11, hy + 4 + tw);
      g.lineStyle(1, CELE.white, A * 0.6);
      g.lineBetween(hx - 2, hy + 4.6, hx + 2, hy - 4.6);
    }
  }
}
