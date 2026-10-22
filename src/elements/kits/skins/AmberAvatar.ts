import Phaser from 'phaser';
import {
  ArmHold, ArmPose, AvatarSpec, BaseAvatar, ColorFn, FxBase, easeIn, easeOut,
} from '../ElementVisuals';
import { AMBER } from './AmberFx';

/**
 * The Amber skin's character: oil's fighter replaced by a hatchling set in fossil resin.
 *
 * **Unmastered** — a faceted lump of amber with a mosquito trapped in its belly, wearing the
 * cracked top half of the egg it hatched from. **Mastered** — the Amber Rex: the eggshell is
 * gone for a fossil T-rex skull helm with its teeth hanging over the brow, a fan of stegosaur
 * plates rises behind the shoulders and a tail sweeps out behind it.
 *
 * Built with the identity colour mapper: the skin's palette is already the final one.
 */

/** Resin beads with a honey glint — concentric discs, outermost first. */
const AMBER_AVATAR: AvatarSpec = {
  hands: [
    { r: 9, color: AMBER.resinLit, alpha: 0.22 },
    { r: 6.6, color: AMBER.resinShade, alpha: 1 },
    { r: 5, color: AMBER.resin, alpha: 1 },
    { r: 1.9, color: AMBER.honeyPale, alpha: 0.92, ox: -1.7, oy: -1.7 },
  ],
  eyeWhite: AMBER.honeyPale,
  eyePupil: AMBER.pupil,
  squash: { div: 15, x: 0.5, y: 0.28 },
};

/** The gem's outline, clockwise from the crown — irregular, so it reads as a lump of resin. */
const GEM: [number, number][] = [
  [-10, -24], [9, -25], [20, -15], [24, 2], [19, 19], [6, 25],
  [-8, 25], [-20, 18], [-24, 2], [-21, -14],
];

function pts(x: number, y: number, list: [number, number][], k = 1, ox = 0, oy = 0): Phaser.Geom.Point[] {
  return list.map(([px, py]) => new Phaser.Geom.Point(x + ox + px * k, y + oy + py * k));
}

/** Honey motes shed off a moving resin hand. */
class AmberMotes extends FxBase {
  constructor(scene: Phaser.Scene) { super(scene, (c) => c); }

  mote(x: number, y: number): void {
    const drift = (Math.random() - 0.5) * 16;
    const r = 1.4 + Math.random() * 1.4;
    this.anim(5, 560, (g, t) => {
      const fade = 1 - t;
      const px = x + drift * easeOut(t);
      const py = y + 18 * easeIn(t);
      g.fillStyle(AMBER.resin, 0.5 * fade);
      g.fillCircle(px, py, r * 1.7);
      g.fillStyle(AMBER.honey, 0.9 * fade);
      g.fillCircle(px - r * 0.3, py - r * 0.3, r * 0.8);
    });
  }
}

export class AmberAvatar extends BaseAvatar {
  private fx: AmberMotes;

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, AMBER_AVATAR);
    this.fx = new AmberMotes(scene);
  }

  /** The Rex's eyes go to lit honey and the bead hands get a wider, hotter corona. */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? AMBER.honey : AMBER.honeyPale);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 12.5 : 9);
      halo.setFillStyle(on ? AMBER.laser : AMBER.resinLit, on ? 0.26 : 0.22);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.6, AMBER.bone, 0.95);
      else shell.setStrokeStyle();
    });
  }

  protected emitTrail(x: number, y: number): void {
    this.fx.mote(x, y);
  }

  /** -1 when facing left, 1 when facing right — the skull's snout and the tail key off it. */
  private get dir(): number {
    return Math.cos(this.facing) >= 0 ? 1 : -1;
  }

  // ── Glow: light through resin, and (mastered) the plates and tail behind the body ──────

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const k = this.intensity * (this.mastered ? 1.15 : 1);
    // Sunlight through amber throws a warm pool on the floor.
    g.fillStyle(AMBER.resinLit, a * 0.2 * k);
    g.fillEllipse(x, y + 20, 70 * k, 22 * k);
    g.fillStyle(AMBER.resin, a * 0.2 * k);
    g.fillCircle(x, y, 30 * k);

    if (!this.mastered) return;
    const d = this.dir;

    // Tail: sweeps out behind, low, opposite the way it faces, swishing.
    const swish = Math.sin(this.t * 3.2) * 5;
    const tail: Phaser.Geom.Point[] = [];
    const steps = 9;
    const tx = (u: number) => x - d * (14 + u * 34);
    const ty = (u: number) => y + 14 + u * 4 - u * u * 10 + swish * u * u;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      tail.push(new Phaser.Geom.Point(tx(u), ty(u) - 9 * (1 - u) - 0.8));
    }
    for (let i = steps; i >= 0; i--) {
      const u = i / steps;
      tail.push(new Phaser.Geom.Point(tx(u), ty(u) + 9 * (1 - u) + 0.8));
    }
    g.fillStyle(AMBER.resinDeep, a);
    g.fillPoints(tail, true);
    g.fillStyle(AMBER.resinShade, a);
    g.fillPoints(tail.map((p) => new Phaser.Geom.Point(p.x + d * 0.8, p.y + (p.y - ty(0.5)) * -0.18)), true);
    // Bone spines down the tail's ridge.
    g.fillStyle(AMBER.bone, a);
    for (let i = 1; i < 6; i++) {
      const u = i / 7;
      const bx = tx(u), by = ty(u) - 9 * (1 - u);
      g.fillTriangle(bx - 2.4, by + 1, bx + 2.4, by + 1, bx - d * 1.5, by - 4.5 * (1 - u * 0.5));
    }

    // Stegosaur plates fanned up behind the shoulders, rocking slightly.
    const rock = Math.sin(this.t * 2.1) * 0.05;
    const plates = 7;
    for (let i = 0; i < plates; i++) {
      const u = i / (plates - 1);
      const ang = -Math.PI * (0.88 - 0.76 * u) + rock;
      const h = 15 + Math.sin(u * Math.PI) * 11;
      const r0 = 18;
      const bx = x + Math.cos(ang) * r0, by = y - 6 + Math.sin(ang) * r0;
      const tipx = x + Math.cos(ang) * (r0 + h), tipy = y - 6 + Math.sin(ang) * (r0 + h);
      const px = -Math.sin(ang), py = Math.cos(ang);
      const w = 5.5 + Math.sin(u * Math.PI) * 2;
      const mid = 0.45;
      const plate = [
        new Phaser.Geom.Point(bx + px * w * 0.6, by + py * w * 0.6),
        new Phaser.Geom.Point(bx + (tipx - bx) * mid + px * w, by + (tipy - by) * mid + py * w),
        new Phaser.Geom.Point(tipx, tipy),
        new Phaser.Geom.Point(bx + (tipx - bx) * mid - px * w, by + (tipy - by) * mid - py * w),
        new Phaser.Geom.Point(bx - px * w * 0.6, by - py * w * 0.6),
      ];
      g.fillStyle(AMBER.resinDeep, a);
      g.fillPoints(plate, true);
      g.fillStyle(AMBER.plate, a);
      g.fillPoints(plate.map((p) => new Phaser.Geom.Point(bx + (p.x - bx) * 0.82, by + (p.y - by) * 0.82)), true);
      g.fillStyle(AMBER.resinLit, a * 0.7);
      g.fillPoints(plate.map((p) => new Phaser.Geom.Point(bx + (p.x - bx) * 0.5, by + (p.y - by) * 0.5 + 0)), true);
    }
  }

  // ── Body: the amber gem with its fossil ─────────────────────────────────

  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const m = this.mastered;
    const k = m ? 1.04 : 1;

    // Shadow side, then the resin itself.
    g.fillStyle(AMBER.resinDeep, alpha);
    g.fillPoints(pts(x, y, GEM, k, 2, 1.5), true);
    g.fillStyle(AMBER.resinShade, alpha);
    g.fillPoints(pts(x, y, GEM, k), true);
    // Inner body, a little smaller, where light passes through.
    g.fillStyle(AMBER.resin, alpha);
    g.fillPoints(pts(x, y, GEM, k * 0.84, -1.2, -1), true);
    // Facets: a lit plane top-left and a dim plane bottom-right.
    g.fillStyle(AMBER.resinLit, alpha * 0.75);
    g.fillPoints(pts(x, y, [[-9, -22], [6, -23], [-3, -10], [-18, -6], [-19, -13]], k), true);
    g.fillStyle(AMBER.resinShade, alpha * 0.7);
    g.fillPoints(pts(x, y, [[22, 3], [17, 18], [6, 23], [9, 10]], k), true);
    // Specular streak.
    g.fillStyle(AMBER.honeyPale, alpha * 0.7);
    g.fillPoints(pts(x, y, [[-15, -12], [-8, -19], [-6, -17.5], [-13.5, -10]], k), true);

    // The inclusion: a mosquito trapped below the face, legs splayed.
    const mx = x - 1, my = y + 13;
    g.lineStyle(0.9, AMBER.resinDeep, alpha * 0.7);
    for (const s of [-1, 1]) {
      for (const [ox, oy] of [[0, -1.6], [0.6, 0.4], [0.4, 2.2]]) {
        g.beginPath();
        g.moveTo(mx + s * ox, my + oy);
        g.lineTo(mx + s * (ox + 5), my + oy - 1.6);
        g.lineTo(mx + s * (ox + 7.5), my + oy + 1.8);
        g.strokePath();
      }
    }
    g.fillStyle(AMBER.honeyPale, alpha * 0.32);
    g.fillEllipse(mx - 4, my - 3.4, 7, 3);
    g.fillEllipse(mx + 4, my - 3.4, 7, 3);
    g.fillStyle(AMBER.resinDeep, alpha * 0.8);
    g.fillEllipse(mx, my + 1.6, 2.6, 7.5);
    g.fillCircle(mx, my - 2.8, 1.5);
    g.lineStyle(0.7, AMBER.resinDeep, alpha * 0.7);
    g.lineBetween(mx, my - 3.5, mx + 0.8, my - 7.5);

    // Trapped air bubbles drifting very slowly.
    for (let i = 0; i < 3; i++) {
      const bx = x + [-13, 12, 8][i];
      const by = y + [10, -2, 17][i] + Math.sin(this.t * 0.7 + i * 2) * 0.8;
      g.fillStyle(AMBER.honeyPale, alpha * 0.35);
      g.fillCircle(bx, by, [1.8, 1.3, 1.1][i]);
      g.fillStyle(AMBER.white, alpha * 0.6);
      g.fillCircle(bx - 0.4, by - 0.4, 0.5);
    }

    if (m) {
      // Mastered: hot honey veins run through the resin, pulsing.
      const pulse = 0.55 + 0.35 * Math.sin(this.t * 2.6);
      g.lineStyle(1.4, AMBER.honey, alpha * pulse);
      g.beginPath();
      g.moveTo(x - 20, y + 4); g.lineTo(x - 14, y + 7); g.lineTo(x - 11, y + 16); g.lineTo(x - 5, y + 21);
      g.strokePath();
      g.beginPath();
      g.moveTo(x + 21, y - 6); g.lineTo(x + 15, y + 2); g.lineTo(x + 16, y + 11);
      g.strokePath();
      // Claw tips poking out at the foot.
      g.fillStyle(AMBER.bone, alpha);
      for (const fx of [-12, -7, 7, 12]) {
        g.fillTriangle(x + fx - 2, y + 22, x + fx + 2, y + 22, x + fx, y + 28);
      }
    } else {
      // Unmastered: a hairline crack down the side, where it broke off the tree.
      g.lineStyle(0.9, AMBER.resinDeep, alpha * 0.6);
      g.beginPath();
      g.moveTo(x + 17, y - 14); g.lineTo(x + 13, y - 8); g.lineTo(x + 15, y - 2);
      g.strokePath();
    }
  }

  // ── Extras: the crown — eggshell, or the fossil skull ──────────────────

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    if (this.mastered) this.drawSkull(g, x, y, alpha);
    else this.drawEggshell(g, x, y, alpha);
  }

  /** The cracked top of the egg it hatched from, worn as a cap. Jagged rim stops above the eyes. */
  private drawEggshell(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const tilt = Math.cos(this.facing) * 1.5;
    const top = y - 37;
    const shell: Phaser.Geom.Point[] = [];
    // Dome over the top.
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + (i / 10) * Math.PI;
      shell.push(new Phaser.Geom.Point(x + tilt + Math.cos(a) * 15, y - 19 + Math.sin(a) * 18));
    }
    // Zigzag break along the bottom, right to left.
    const zig = [[15, -19], [11, -14], [7, -18], [3, -13.5], [-1, -18.5], [-5, -14], [-9, -18], [-13, -14.5], [-15, -19]];
    for (const [zx, zy] of zig) shell.push(new Phaser.Geom.Point(x + tilt + zx, y + zy));
    g.fillStyle(AMBER.boneShade, alpha);
    g.fillPoints(shell.map((p) => new Phaser.Geom.Point(p.x + 1.4, p.y + 1)), true);
    g.fillStyle(AMBER.bone, alpha);
    g.fillPoints(shell, true);
    g.fillStyle(AMBER.white, alpha * 0.6);
    g.fillEllipse(x + tilt - 5, top + 7, 7, 4);
    // Speckles.
    g.fillStyle(AMBER.boneDark, alpha * 0.7);
    for (const [sx, sy, r] of [[4, -30, 1.4], [-7, -26, 1.1], [9, -24, 0.9], [-2, -33, 0.8], [-10, -21, 0.8]]) {
      g.fillCircle(x + tilt + sx, y + sy, r);
    }
    // A crack running up from the rim.
    g.lineStyle(0.9, AMBER.boneDark, alpha * 0.8);
    g.beginPath();
    g.moveTo(x + tilt + 3, y - 14); g.lineTo(x + tilt + 5, y - 22); g.lineTo(x + tilt + 2, y - 27);
    g.strokePath();
  }

  /**
   * The Rex's fossil skull helm: a bone dome over the crown with the snout reaching forward
   * past the face toward the aim, dark sockets, and the upper teeth hanging just above the
   * eyes. The lowest tooth tip stays at y-9 so the eyes (top at y-8.4) stay clear.
   */
  private drawSkull(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const d = this.dir;
    const S = (px: number, py: number) => new Phaser.Geom.Point(x + d * px, y + py);
    const outline = [
      S(-16, -13), S(-17, -22), S(-11, -33), S(0, -37), S(11, -33), S(20, -25), S(27, -19), S(30, -14), S(29, -11.5), S(-15, -11.5),
    ];
    g.fillStyle(AMBER.boneDark, alpha);
    g.fillPoints(outline.map((p) => new Phaser.Geom.Point(p.x + 1.2, p.y + 1.2)), true);
    g.fillStyle(AMBER.bone, alpha);
    g.fillPoints(outline, true);
    g.fillStyle(AMBER.boneShade, alpha * 0.7);
    g.fillPoints([S(-15, -12), S(-16, -18), S(28, -15), S(29, -12)], true);
    g.fillStyle(AMBER.white, alpha * 0.55);
    g.fillEllipse(x + d * -3, y - 31, 12, 4);

    // Sockets: the big eye socket, the fenestra behind it, the nostril at the snout.
    g.fillStyle(AMBER.shadow, alpha * 0.92);
    g.fillEllipse(x + d * 6, y - 24, 9, 7);
    g.fillEllipse(x + d * -7, y - 24, 6, 8);
    g.fillEllipse(x + d * 24, y - 17, 4, 2.4);
    // A glint of laser red deep in the eye socket.
    const glint = 0.6 + 0.4 * Math.sin(this.t * 4);
    g.fillStyle(AMBER.laser, alpha * glint);
    g.fillCircle(x + d * 6.5, y - 23.5, 1.6);

    // Upper teeth hanging from the jaw line.
    g.fillStyle(AMBER.honeyPale, alpha);
    for (let i = 0; i < 8; i++) {
      const tx = -12 + i * 5.3;
      const len = i > 4 ? 2.5 : 2;
      g.fillTriangle(x + d * (tx - 1.5), y - 11.6, x + d * (tx + 1.5), y - 11.6, x + d * tx, y - 11.6 + len);
    }
    // Fossil cracks and a suture line across the dome.
    g.lineStyle(0.9, AMBER.boneDark, alpha * 0.75);
    g.beginPath();
    g.moveTo(x + d * -2, y - 36); g.lineTo(x + d * 0, y - 30); g.lineTo(x + d * -3, y - 25);
    g.strokePath();
    g.beginPath();
    g.moveTo(x + d * 13, y - 31); g.lineTo(x + d * 16, y - 26); g.lineTo(x + d * 20, y - 24);
    g.strokePath();
    // Amber nub set in the brow — the resin growing into the bone.
    g.fillStyle(AMBER.resinShade, alpha);
    g.fillCircle(x + d * -5, y - 30, 2.6);
    g.fillStyle(AMBER.resinLit, alpha);
    g.fillCircle(x + d * -5.6, y - 30.6, 1.5);
  }

  /** Oil's own holds, kept so barrel riding and turret bracing still pose the arms. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold === 'ride') {
      const bob = Math.sin(this.t * 7 + side * 1.4);
      return {
        ang: this.facing + side * (Math.PI / 2) + bob * 0.14,
        dist: 40 + bob * 4,
        scale: idle.scale * 1.15,
      };
    }
    if (hold === 'brace') {
      const shake = (Math.random() - 0.5) * 0.1;
      return {
        ang: this.holdAngle + side * 0.42 + shake,
        dist: 20 + Math.random() * 2,
        scale: idle.scale * 1.2,
      };
    }
    return null;
  }
}
