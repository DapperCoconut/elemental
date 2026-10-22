import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn } from '../ElementVisuals';
import { CY, CyborgFx } from './CyborgFx';

/**
 * The Cyborg skin's character: crystal's gem replaced by a blood-fuelled combat machine — a
 * steel-blue war frame with a domed helmet, a black visor carrying two yellow optics, a gold
 * core lamp in the chest and old blood down its plating. One hand carries a revolver.
 *
 * **Unmastered** is the bare frame: helmet, chest plate, pauldrons, two short armoured legs.
 * **Mastered** grows wings — four long steel blades fanning out of its back, two a side, each
 * lit along its length with a yellow strip — plus a crest fin on the helmet and a core that burns
 * blood red. The wings more than double its width, so the form reads at a glance.
 *
 * Built with the identity colour mapper: the palette below is already final.
 */

/** Steel gauntlets: a faint blood haze, the armoured fist, a lit knuckle plate, a gold glint. */
const CYBORG_AVATAR: AvatarSpec = {
  hands: [
    { r: 9.5, color: CY.blood, alpha: 0.18 },
    { r: 6.8, color: CY.steelDark, alpha: 1 },
    { r: 5.0, color: CY.steelMid, alpha: 1 },
    { r: 2.6, color: CY.steelPale, alpha: 1, ox: -1.2, oy: -1.2 },
    { r: 1.1, color: CY.optic, alpha: 1, ox: 2, oy: 1.6 },
  ],
  eyeWhite: CY.optic,
  eyePupil: CY.gunmetal,
  // Machined hands: barely any smear.
  squash: { div: 18, x: 0.25, y: 0.12 },
};

const pt = (x: number, y: number) => new Phaser.Geom.Point(x, y);

/** Polygon from a list of [dx, dy] offsets around (x, y), mirrored by `flip` (-1 / 1). */
function plate(
  g: Phaser.GameObjects.Graphics, x: number, y: number, pts: readonly (readonly [number, number])[], flip = 1,
): void {
  g.fillPoints(pts.map(([dx, dy]) => pt(x + dx * flip, y + dy)), true);
}

/**
 * One wing blade: a long tapered plate swept out from the root, wide near the back and drawn
 * out to a point, with a lit strip running down its leading edge.
 */
function wingBlade(
  g: Phaser.GameObjects.Graphics, rx: number, ry: number, ang: number, len: number, w: number,
  alpha: number, glow: number,
): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  const px = -s, py = c;
  const steps = 8;
  const shape = (scale: number, offset: number): Phaser.Geom.Point[] => {
    const out: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const hw = w * scale * Math.pow(1 - u, 0.8) * (0.7 + 0.3 * Math.sin(Math.PI * (0.2 + u * 0.8)));
      out.push(pt(rx + c * len * u + px * (hw + offset), ry + s * len * u + py * (hw + offset)));
    }
    for (let i = steps; i >= 0; i--) {
      const u = i / steps;
      const hw = w * scale * Math.pow(1 - u, 0.8) * 0.45;
      out.push(pt(rx + c * len * u - px * (hw - offset), ry + s * len * u - py * (hw - offset)));
    }
    return out;
  };
  g.fillStyle(CY.steelDeep, alpha);
  g.fillPoints(shape(1.15, 0), true);
  g.fillStyle(CY.steel, alpha);
  g.fillPoints(shape(0.95, 0), true);
  g.fillStyle(CY.steelLit, alpha * 0.8);
  g.fillPoints(shape(0.4, w * 0.35), true);
  // The light strip: a thin glowing line down the blade, brightest at the root.
  g.lineStyle(4, CY.optic, alpha * 0.25 * glow);
  g.lineBetween(rx + px * w * 0.2, ry + py * w * 0.2, rx + c * len * 0.85, ry + s * len * 0.85);
  g.lineStyle(1.6, CY.opticHot, alpha * 0.9 * glow);
  g.lineBetween(rx + px * w * 0.2, ry + py * w * 0.2, rx + c * len * 0.85, ry + s * len * 0.85);
}

export class CyborgAvatar extends BaseAvatar {
  private fx: CyborgFx;

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, CYBORG_AVATAR);
    this.fx = new CyborgFx(scene);
  }

  /** Mastered: hotter optics and a gold-lit corona on each fist. The wings live in the hooks. */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? CY.opticHot : CY.optic);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 12.5 : 9.5);
      halo.setFillStyle(on ? CY.optic : CY.blood, on ? 0.26 : 0.18);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.4, CY.gold, 0.9);
      else shell.setStrokeStyle();
    });
  }

  /** Fast hands kick out spent brass. */
  protected emitTrail(x: number, y: number): void {
    this.fx.casing(x, y, this.facing);
  }

  /** The hands lag on springs, so their drift is a read on which way the frame is moving. */
  private drift(x: number): number {
    const mean = (this.armX[0] + this.armX[1]) / 2;
    return Phaser.Math.Clamp((mean - x) * 0.3, -5, 5);
  }

  /**
   * Under the sprite: a cold floor light and, mastered, the wings — drawn here so the body
   * occludes their roots and they read as coming out of its back.
   */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const k = this.intensity;
    g.fillStyle(CY.steel, a * 0.2 * k);
    g.fillEllipse(x, y + 22, 64 * k, 20 * k);
    g.fillStyle(this.mastered ? CY.blood : CY.optic, a * 0.12 * k);
    g.fillEllipse(x, y + 22, 40 * k, 12 * k);

    if (!this.mastered) return;
    const flap = Math.sin(this.t * 2.4) * 0.07;
    const lean = this.drift(x) * 0.02;
    const glow = 0.75 + 0.25 * Math.sin(this.t * 4.2);
    // Soft yellow wash behind the whole span.
    g.fillStyle(CY.optic, a * 0.1 * k);
    g.fillEllipse(x, y - 10, 120, 50);
    for (const side of [-1, 1]) {
      const rx = x + side * 9, ry = y - 8;
      // Upper blade sweeps up and out, lower blade out and slightly down.
      const up = side < 0 ? Math.PI + 0.55 : -0.55;
      const low = side < 0 ? Math.PI - 0.12 : 0.12;
      wingBlade(g, rx, ry - 2, up - side * flap + lean, 46, 7.5, alpha, glow);
      wingBlade(g, rx, ry + 4, low + side * flap * 0.7 + lean, 40, 6.5, alpha, glow);
    }
  }

  /** The frame itself, over the sprite and under the optics. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const step = Math.sin(this.t * 6) * 0.8;

    // Legs: two armoured shins with a forward-bent knee, standing under the chest plate.
    for (const side of [-1, 1]) {
      const lift = side < 0 ? step : -step;
      g.fillStyle(CY.steelDeep, alpha);
      plate(g, x, y + lift, [[5, 12], [13, 13], [14, 22], [17, 25], [5, 25], [6, 20]], side);
      g.fillStyle(CY.steelMid, alpha);
      plate(g, x, y + lift, [[7, 13], [12, 14], [12.5, 21], [8, 21]], side);
      g.fillStyle(CY.gunmetal, alpha);
      g.fillRect(x + side * 11 - 6, y + 23.5 + lift, 12, 2.5);
    }

    // Chest plate: broad at the shoulders, tapering to a waist, its front face lit left.
    g.fillStyle(CY.steelDeep, alpha);
    plate(g, x, y, [[-19, -9], [19, -9], [21, 2], [13, 16], [-13, 16], [-21, 2]]);
    g.fillStyle(CY.steel, alpha);
    plate(g, x, y, [[-17, -8], [17, -8], [18.5, 2], [11.5, 14.5], [-11.5, 14.5], [-18.5, 2]]);
    g.fillStyle(CY.steelLit, alpha * 0.55);
    plate(g, x, y, [[-15, -7], [-3, -7], [-4, 12], [-10, 13], [-16, 2]]);
    // Plate seams.
    g.lineStyle(1, CY.steelDeep, alpha * 0.9);
    g.lineBetween(x, y + 2, x, y + 15);
    g.lineBetween(x - 15, y + 4, x - 6, y + 4);
    g.lineBetween(x + 6, y + 4, x + 15, y + 4);
    // Waist: a dark mechanical joint.
    g.fillStyle(CY.gunmetal, alpha);
    g.fillRoundedRect(x - 10, y + 14, 20, 5, 2);
    g.fillStyle(CY.steelMid, alpha);
    for (const rx of [-6, 0, 6]) g.fillRect(x + rx - 1.5, y + 15, 3, 3);

    // Core lamp, centred in the chest below the eye band.
    const pulse = 0.65 + 0.35 * Math.sin(this.t * 5);
    const core = this.mastered ? CY.blood : CY.optic;
    const coreHot = this.mastered ? CY.bloodHot : CY.opticHot;
    g.fillStyle(core, alpha * 0.3 * pulse);
    g.fillCircle(x, y + 8, 7.5);
    g.fillStyle(CY.gunmetal, alpha);
    g.fillCircle(x, y + 8, 4.6);
    g.fillStyle(core, alpha);
    g.fillCircle(x, y + 8, 3.4);
    g.fillStyle(coreHot, alpha * pulse);
    g.fillCircle(x - 0.8, y + 7.2, 1.5);

    // Pauldrons: rounded caps over each shoulder, a highlight on the upper face.
    for (const side of [-1, 1]) {
      g.fillStyle(CY.steelDeep, alpha);
      g.fillEllipse(x + side * 20, y - 4, 13, 16);
      g.fillStyle(CY.steelMid, alpha);
      g.fillEllipse(x + side * 20, y - 5, 10.5, 13);
      g.fillStyle(CY.steelPale, alpha * 0.6);
      g.fillEllipse(x + side * 19, y - 8, 5, 4);
      g.fillStyle(CY.optic, alpha * 0.85);
      g.fillRect(x + side * 20 - 1, y + 0.5, 2, 3);
    }

    // Helmet: a dome over the brow, a crest ridge down the middle.
    g.fillStyle(CY.steelDeep, alpha);
    g.fillEllipse(x, y - 9, 34, 30);
    g.fillStyle(CY.steel, alpha);
    g.fillEllipse(x, y - 10, 31, 27);
    g.fillStyle(CY.steelLit, alpha * 0.6);
    g.fillEllipse(x - 5, y - 16, 13, 8);
    g.fillStyle(CY.steelMid, alpha);
    g.fillRect(x - 1.5, y - 23, 3, 9);
    // Visor: the black band the two optics sit in.
    g.fillStyle(CY.gunmetal, alpha);
    plate(g, x, y, [[-15, -9], [15, -9], [14, 0], [8, 2], [-8, 2], [-14, 0]]);
    g.fillStyle(CY.optic, alpha * 0.16);
    g.fillRect(x - 13, y - 7, 26, 6);
    // Jaw vents under the visor.
    g.lineStyle(1, CY.steelLit, alpha * 0.7);
    for (const vx of [-4, 0, 4]) g.lineBetween(x + vx, y + 2.5, x + vx, y + 5);

    // Old blood: a splash across the right of the chest and a run down from it.
    g.fillStyle(CY.bloodDried, alpha * 0.85);
    g.fillCircle(x + 9, y - 3, 2.6);
    g.fillCircle(x + 12, y - 1, 1.6);
    g.fillCircle(x + 6, y - 5, 1.3);
    plate(g, x, y, [[8, -2], [10.2, -2], [9.8, 6], [9.1, 9], [8.4, 6]]);
    g.fillCircle(x + 9.1, y + 9, 1.3);
    g.fillStyle(CY.blood, alpha * 0.6);
    g.fillCircle(x + 8.6, y - 3.6, 1.2);
    g.fillCircle(x - 14, y + 8, 1.4);
  }

  /**
   * The revolver in the leading hand, and — mastered — a crest fin over the helmet. Both sit
   * clear of the eye band.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    // Revolver: grip in the right hand, barrel along the aim.
    const hx = this.armX[1], hy = this.armY[1];
    if (Math.hypot(hx - x, hy - (y - 4)) > 14) {
      const ang = this.facing;
      const c = Math.cos(ang), s = Math.sin(ang);
      const px = -s, py = c;
      const at = (f: number, k: number) => pt(hx + c * f + px * k, hy + s * f + py * k);
      g.fillStyle(CY.gunmetal, alpha);
      g.fillPoints([at(-3, 1), at(16, 1), at(16, -2.4), at(-3, -2.6)], true);  // barrel
      g.fillStyle(CY.steelMid, alpha);
      g.fillPoints([at(-1, 0.6), at(15, 0.6), at(15, -1.2), at(-1, -1.4)], true);
      g.fillStyle(CY.steelDark, alpha);
      g.fillCircle(hx + c * 2, hy + s * 2, 4.2);                             // cylinder
      g.fillStyle(CY.optic, alpha * 0.9);
      g.fillCircle(hx + c * 2 + px * -0.8, hy + s * 2 + py * -0.8, 1.4);
      g.fillStyle(CY.gold, alpha);
      g.fillPoints([at(14, -2.4), at(16, -2.4), at(16, -3.6), at(14.5, -3.6)], true); // sight
    }

    if (!this.mastered) return;
    // Crest: a swept blade standing off the top of the helmet.
    const top = y - 22;
    g.fillStyle(CY.steelDeep, alpha);
    plate(g, x, top, [[-2.5, 1], [2.5, 1], [1.5, -10], [-3, -14]]);
    g.fillStyle(CY.steelLit, alpha);
    plate(g, x, top, [[-1.2, 0], [1.2, 0], [0.6, -9], [-2.2, -12]]);
    g.lineStyle(1.2, CY.opticHot, alpha * (0.7 + 0.3 * Math.sin(this.t * 4.2)));
    g.lineBetween(x - 0.4, top - 1, x - 2, top - 11);
  }
}
