import Phaser from 'phaser';
import { ArmHold, ArmPose, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU } from '../ElementVisuals';
import { heartPoints, heartbeat } from './PassionSkinFx';

/**
 * The Passion skin's character: Devotion's priest replaced by the old Passion element brought
 * back — a living valentine.
 *
 * - **Unmastered — the Sweetheart.** The body is one big beating heart, shaded from wine at the
 *   shadow side to blush on the lit lobe, blushing cheeks under the eyes, a lace ruffle at the
 *   throat, and the old Passion's pink fedora with a heart pinned in its band.
 * - **Mastered — Cupid.** The fedora is gone for a ring of hearts turning over the crown, a pair
 *   of white feathered wings beats behind the heart (the silhouette roughly doubles in width),
 *   and a gold arrow runs clean through the body, fletching out one side, head out the other.
 *
 * Preaching (holding Click) presses the hands together, exactly as the priest does, and builds
 * a ring of small hearts behind the body in place of the glory of rays.
 *
 * Built with the identity mapper and its own palette, like every skin rig.
 */

const LOVE = {
  wine: 0x2a0812,
  deep: 0x6e1630,
  crimson: 0xb02a4e,
  rose: 0xe8456e,
  pink: 0xff86a8,
  blush: 0xffc4d6,
  lace: 0xfff0f5,
  gold: 0xffc65c,
  goldDeep: 0xb07a22,
  feather: 0xfff8fb,
  featherShade: 0xf2c8d8,
};

/** Rose beads held in a pink glow — concentric discs, outermost first, glint off-centre. */
const PASSION_SKIN_AVATAR: AvatarSpec = {
  hands: [
    { r: 10, color: LOVE.pink, alpha: 0.24 },
    { r: 6.6, color: LOVE.crimson, alpha: 1 },
    { r: 4.4, color: LOVE.rose, alpha: 1 },
    { r: 1.9, color: LOVE.lace, alpha: 0.95, ox: -1.7, oy: -1.8 },
  ],
  eyeWhite: LOVE.lace,
  eyePupil: LOVE.wine,
  squash: { div: 14, x: 0.45, y: 0.26 },
};

/** Heart torso size: lobes reach ~y-20, the point ~y+24 — over the 44px disc. */
const HEART_SIZE = 23;
const HEART_CY = -1;

const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

/** Small hearts lifting off the hands as they move. */
class HeartTrailFx extends FxBase {
  puff(x: number, y: number): void {
    const dx = (Math.random() - 0.5) * 8;
    const rot = (Math.random() - 0.5) * 0.6;
    this.anim(4, 620, (g, k) => {
      const a = (1 - k) * 0.85;
      const s = 2.4 + k * 1.2;
      g.fillStyle(LOVE.pink, a);
      g.fillPoints(heartPoints(x + dx * k, y - 14 * k, s, rot), true);
    });
  }
}

export class PassionAvatar extends BaseAvatar {
  /** 0–1 — how charged the current sermon is; 0 when not preaching. */
  private preach = 0;
  private trailFx: HeartTrailFx;

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, PASSION_SKIN_AVATAR);
    this.trailFx = new HeartTrailFx(scene);
  }

  setPreach(v: number): void { this.preach = Phaser.Math.Clamp(v, 0, 1); }

  /** Where letters and bottles leave from: just ahead of the casting hand along the aim. */
  handTip(): { x: number; y: number } {
    return {
      x: this.armX[1] + Math.cos(this.facing) * 8,
      y: this.armY[1] + Math.sin(this.facing) * 8,
    };
  }

  /** Serenade: both hands pressed together in front of the heart, along the aim. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    const a = this.facing + side * 0.32;
    return { ang: a, dist: 17 + Math.sin(this.t * 9) * 1.2 * this.preach, scale: idle.scale * (1 + this.preach * 0.25) };
  }

  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? LOVE.blush : LOVE.lace);
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 14 : 10);
      glow.setFillStyle(on ? LOVE.blush : LOVE.pink, on ? 0.38 : 0.24);
    });
  }

  private get beat(): number { return heartbeat(this.t, 1.1 * this.intensity); }

  /**
   * The heart torso: wine shadow offset down-right, crimson body, rose face pulled up-left, a
   * blush lobe highlight. Mastered, a gold arrow passes through it below the eyes.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const m = this.mastered;
    const b = this.beat;
    const s = HEART_SIZE * (1 + b * 0.035);
    const cy = y + HEART_CY;
    const lean = Math.cos(this.facing) * 0.04;

    // Mastered: the arrow's shaft and fletching behind the heart.
    const ax0 = x - 28, ay0 = y + 20, ax1 = x + 28, ay1 = y - 1;
    if (m) {
      g.lineStyle(2.4, LOVE.goldDeep, alpha);
      g.lineBetween(ax0, ay0, ax1, ay1);
      for (const off of [0, 4, 8]) {
        const fx = ax0 + off * 0.94, fy = ay0 - off * 0.35;
        g.fillStyle(off === 4 ? LOVE.pink : LOVE.feather, alpha);
        g.fillPoints([P(fx, fy), P(fx - 3, fy - 6), P(fx + 2.5, fy - 1)], true);
        g.fillPoints([P(fx, fy), P(fx - 1, fy + 6), P(fx + 3, fy + 1)], true);
      }
    }

    g.fillStyle(LOVE.wine, alpha * 0.5);
    g.fillPoints(heartPoints(x + 1.5, cy + 2, s, lean), true);
    g.fillStyle(LOVE.deep, alpha);
    g.fillPoints(heartPoints(x, cy, s + 1.2, lean), true);
    g.fillStyle(LOVE.crimson, alpha);
    g.fillPoints(heartPoints(x, cy, s, lean), true);
    g.fillStyle(LOVE.rose, alpha);
    g.fillPoints(heartPoints(x - 2, cy - 1.6, s * 0.84, lean), true);
    g.fillStyle(LOVE.pink, alpha * 0.9);
    g.fillPoints(heartPoints(x - 4, cy - 3, s * 0.55, lean), true);
    // Lit lobe.
    g.fillStyle(LOVE.blush, alpha * 0.75);
    g.fillEllipse(x - 11, cy - 13, 9, 6);
    g.fillStyle(LOVE.lace, alpha * 0.85);
    g.fillCircle(x - 12.5, cy - 14, 1.8);
    // Blushing cheeks under the eyes.
    g.fillStyle(LOVE.pink, alpha * (0.55 + b * 0.3));
    g.fillEllipse(x - 11, y + 3.5, 6, 3.4);
    g.fillEllipse(x + 11, y + 3.5, 6, 3.4);

    if (!m) {
      // Lace ruffle at the throat and a little heart locket on a ribbon.
      for (let i = 0; i < 5; i++) {
        g.fillStyle(LOVE.lace, alpha * 0.9);
        g.fillCircle(x - 6 + i * 3, y + 9, 2.2);
      }
      g.fillStyle(LOVE.crimson, alpha);
      g.fillRect(x - 7, y + 9, 14, 1.4);
      g.fillStyle(LOVE.gold, alpha);
      g.fillPoints(heartPoints(x, y + 14, 3.6, Math.sin(this.t * 1.6) * 0.12), true);
      g.fillStyle(LOVE.lace, alpha * 0.8);
      g.fillCircle(x - 1.3, y + 13.2, 0.8);
    } else {
      // The arrow's head, out the far side, over the heart.
      g.lineStyle(2.4, LOVE.gold, alpha);
      g.lineBetween(x + 10, y + 5.5, ax1, ay1);
      const ang = Math.atan2(ay1 - ay0, ax1 - ax0);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const tipX = ax1 + ca * 8, tipY = ay1 + sa * 8;
      g.fillStyle(LOVE.gold, alpha);
      g.fillPoints([P(tipX, tipY), P(ax1 - sa * 4.4, ay1 + ca * 4.4), P(ax1 + sa * 4.4, ay1 - ca * 4.4)], true);
      g.fillStyle(LOVE.lace, alpha * 0.8);
      g.fillPoints([P(tipX, tipY), P(ax1 - sa * 2, ay1 + ca * 2), P(ax1 + ca * 2, ay1 + sa * 2)], true);
      // A gold locket heart on the chest.
      g.fillStyle(LOVE.goldDeep, alpha);
      g.fillPoints(heartPoints(x, y + 14, 4.8), true);
      g.fillStyle(LOVE.gold, alpha);
      g.fillPoints(heartPoints(x - 0.5, y + 13.5, 3.8), true);
    }
  }

  protected emitTrail(x: number, y: number): void {
    if (Math.random() < 0.5) this.trailFx.puff(x, y);
  }

  /**
   * A soft pink under-glow. Mastered: Cupid's wings behind the body. While preaching: a ring of
   * small hearts building behind it.
   */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const k = this.intensity * (this.mastered ? 1.15 : 1);
    g.fillStyle(LOVE.pink, a * (this.mastered ? 0.28 : 0.2) * k * (1 + this.preach * 0.6 + this.beat * 0.3));
    g.fillCircle(x, y, 28 * k);

    if (this.mastered) {
      const flap = Math.sin(this.t * 3.2) * 0.18 + (this.intensity - 1) * 0.3;
      for (const side of [-1, 1]) {
        const rootX = x + side * 10, rootY = y - 8;
        // Five feathers per wing, longest at the top, fanned and beating.
        for (let f = 4; f >= 0; f--) {
          const ang = -Math.PI / 2 + side * (0.75 + f * 0.32 - flap);
          const len = 38 - f * 4.5;
          const tip = P(rootX + Math.cos(ang) * len, rootY + Math.sin(ang) * len * 0.8);
          const nx = -Math.sin(ang) * 5.2, ny = Math.cos(ang) * 5.2;
          const midX = (rootX + tip.x) / 2, midY = (rootY + tip.y) / 2;
          const pts = [P(rootX, rootY), P(midX + nx, midY + ny), tip, P(midX - nx, midY - ny)];
          g.fillStyle(LOVE.featherShade, alpha);
          g.fillPoints(pts.map((q) => P(q.x + 1, q.y + 1.5)), true);
          g.fillStyle(f % 2 ? LOVE.featherShade : LOVE.feather, alpha);
          g.fillPoints(pts, true);
          g.lineStyle(0.8, LOVE.pink, alpha * 0.6);
          g.lineBetween(rootX, rootY, tip.x, tip.y);
        }
        // Covert feathers at the shoulder.
        g.fillStyle(LOVE.feather, alpha);
        g.fillEllipse(rootX + side * 7, rootY - 3, 16, 10);
        g.fillStyle(LOVE.blush, alpha * 0.6);
        g.fillEllipse(rootX + side * 8, rootY - 1, 10, 4);
      }
    }

    if (this.preach > 0.02) {
      const n = 10;
      const r = 22 + this.preach * 12;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * TAU + this.t * 0.6;
        g.fillStyle(i % 2 ? LOVE.rose : LOVE.pink, alpha * this.preach * 0.85);
        g.fillPoints(heartPoints(x + Math.cos(ang) * r, y - 4 + Math.sin(ang) * r, 3 + this.preach * 2, ang + Math.PI / 2, 14), true);
      }
    }
  }

  /** Unmastered: the pink fedora. Mastered: a ring of hearts turning above the crown. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const tilt = Math.sin(this.t * 1.3) * 0.05 + Math.cos(this.facing) * 0.1;
    if (!this.mastered) {
      const by = y - 20;
      const ca = Math.cos(tilt), sa = Math.sin(tilt);
      const R = (u: number, v: number): Phaser.Geom.Point => P(x + ca * u - sa * v, by + sa * u + ca * v);
      // Brim.
      g.fillStyle(LOVE.deep, alpha);
      g.fillEllipse(x + 0.8, by + 1.6, 34, 7);
      g.fillStyle(LOVE.rose, alpha);
      g.fillEllipse(x, by, 33, 6.4);
      g.fillStyle(LOVE.pink, alpha * 0.8);
      g.fillEllipse(x - 4, by - 1, 22, 2.6);
      // Crown with a pinched top.
      const crown = [R(-10, -1), R(-11, -9), R(-6, -13), R(0, -11), R(6, -13), R(11, -9), R(10, -1)];
      g.fillStyle(LOVE.rose, alpha);
      g.fillPoints(crown, true);
      g.fillStyle(LOVE.pink, alpha * 0.7);
      g.fillPoints([R(-9.5, -2), R(-10, -9), R(-6, -12), R(-3, -11), R(-4, -2)], true);
      // Band with a heart pinned in it.
      g.fillStyle(LOVE.wine, alpha);
      g.fillPoints([R(-10, -1.4), R(-10.3, -4.4), R(10.3, -4.4), R(10, -1.4)], true);
      const hp = R(5.5, -3);
      g.fillStyle(LOVE.lace, alpha);
      g.fillPoints(heartPoints(hp.x, hp.y, 3.2 * (1 + this.beat * 0.15), tilt), true);
      g.fillStyle(LOVE.rose, alpha);
      g.fillPoints(heartPoints(hp.x, hp.y, 2.2 * (1 + this.beat * 0.15), tilt), true);
    } else {
      // A gold ring seen slightly from above, with six hearts turning on it.
      const hy = y - 29;
      g.lineStyle(3, LOVE.goldDeep, alpha * 0.8);
      g.strokeEllipse(x, hy + 0.8, 28, 8);
      g.lineStyle(1.8, LOVE.gold, alpha);
      g.strokeEllipse(x, hy, 28, 8);
      const n = 6;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * TAU + this.t * 0.9;
        const hx = x + Math.cos(ang) * 14;
        const hyy = hy + Math.sin(ang) * 4;
        const front = Math.sin(ang) > 0;
        const s = (front ? 3.4 : 2.6) * (1 + this.beat * 0.12);
        g.fillStyle(front ? LOVE.rose : LOVE.crimson, alpha * (front ? 1 : 0.75));
        g.fillPoints(heartPoints(hx, hyy - 2, s, 0, 14), true);
      }
    }
  }
}
