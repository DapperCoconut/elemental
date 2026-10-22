import Phaser from 'phaser';
import { ArmHold, ArmPose, AvatarSpec, BaseAvatar, ColorFn } from '../ElementVisuals';
import { WITCH, WitchFx, flameTongue } from './WitchFx';

/**
 * The Witch skin's character (Creation): a green-skinned, hook-nosed witch under a crooked
 * pointed hat, in a ragged violet robe, cackling.
 *
 * **Unmastered** stands on her own feet: a short robe with a tattered hem, a squat crooked hat
 * with a buckled band, stringy hair hanging out from under the brim.
 * **Mastered** is airborne — side-saddle on a broomstick whose bristles trail behind her run,
 * a tall hat with a long drooping tip and stars on it, a cape flaring out behind, and a crow
 * familiar perched on her shoulder. A different outline, not a brighter one.
 *
 * Like every skin rig it takes the identity mapper and owns its palette (`WITCH`).
 */

const WITCH_AVATAR: AvatarSpec = {
  hands: [
    { r: 9.5, color: WITCH.hex, alpha: 0.24 },
    { r: 6.4, color: WITCH.skinShade, alpha: 1 },
    { r: 4.8, color: WITCH.skin, alpha: 1 },
    { r: 1.9, color: WITCH.skinLit, alpha: 0.95, ox: -1.3, oy: -1.5 },
  ],
  eyeWhite: 0xeaf7b4,
  eyePupil: 0x1a0a22,
  squash: { div: 13, x: 0.5, y: 0.28 },
};

const HEM_Y = 25;

export class WitchAvatar extends BaseAvatar {
  private fx: WitchFx;

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, WITCH_AVATAR);
    this.fx = new WitchFx(scene);
  }

  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? 0xb6ff7a : 0xeaf7b4);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 13 : 9.5);
      halo.setFillStyle(on ? WITCH.hexLit : WITCH.hex, on ? 0.34 : 0.24);
    });
  }

  /** In the mech (spell construct), both hands drop to channel in front of the chest. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'ride') return null;
    const judder = Math.sin(this.t * 11 + side) * 0.05;
    return {
      ang: Math.PI / 2 - side * 0.62 + judder,
      dist: 19 + Math.sin(this.t * 9 + side * 2) * 1.4,
      scale: idle.scale * 0.95,
    };
  }

  protected emitTrail(x: number, y: number): void {
    this.fx.mote(x, y);
  }

  /** Hands drift behind a run — a free read on which way she is moving. */
  private lean(x: number): number {
    const mean = (this.armX[0] + this.armX[1]) / 2;
    return Phaser.Math.Clamp((mean - x) * 0.5, -9, 9);
  }

  /** Mastered she rides a few pixels off the floor, bobbing. */
  private get hover(): number {
    return this.mastered ? -3 + Math.sin(this.t * 2.4) * 2 : 0;
  }

  // ── Layers ──────────────────────────────────────────────────────────────

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const k = this.intensity;
    // A brew-green pool of light on the floor (a ground shadow when airborne).
    g.fillStyle(WITCH.hex, a * 0.14 * k);
    g.fillEllipse(x, y + HEM_Y + 3, 78 * k, 24 * k);
    if (this.mastered) {
      g.fillStyle(WITCH.void, a * 0.35);
      g.fillEllipse(x, y + HEM_Y + 8, 46, 11);
      this.drawCape(g, x, y + this.hover, a);
    }
  }

  /** The mastered cape: two ragged wings of cloth flaring out behind, rippling, opposite the run. */
  private drawCape(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number): void {
    const lean = this.lean(x);
    for (const sd of [-1, 1]) {
      const pts: Phaser.Geom.Point[] = [];
      pts.push(new Phaser.Geom.Point(x + sd * 8, y - 12));
      const tips = 5;
      for (let i = 0; i <= tips; i++) {
        const u = i / tips;
        const ripple = Math.sin(this.t * 5 + i * 1.3 + sd) * 2.5;
        const px = x + sd * (24 + u * 8) + lean * 0.8 * u;
        const py = y - 6 + u * 34 + ripple;
        pts.push(new Phaser.Geom.Point(px + sd * (i % 2 ? -4 : 2), py));
      }
      pts.push(new Phaser.Geom.Point(x + sd * 6, y + 26));
      g.fillStyle(WITCH.void, 1);
      g.fillPoints(pts, true);
      // Lining.
      g.fillStyle(WITCH.violet, 0.75);
      g.fillPoints(pts.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 0.82, y + (p.y - y) * 0.9 + 1)), true);
    }
  }

  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y0: number, _a: number, alpha: number): void {
    const y = y0 + this.hover;
    const m = this.mastered;

    if (m) this.drawBroom(g, x, y, alpha, false);

    // Hair: stringy black-violet locks hanging from under the brim down past the cheeks.
    for (const sd of [-1, 1]) {
      const sway = Math.sin(this.t * 2 + sd) * 1.5;
      g.fillStyle(WITCH.ink, alpha);
      g.fillPoints([
        new Phaser.Geom.Point(x + sd * 10, y - 18),
        new Phaser.Geom.Point(x + sd * 22, y - 15),
        new Phaser.Geom.Point(x + sd * 24 + sway, y + 2),
        new Phaser.Geom.Point(x + sd * 21 + sway, y + 12),
        new Phaser.Geom.Point(x + sd * 18 + sway, y + 6),
        new Phaser.Geom.Point(x + sd * 16, y + 10),
        new Phaser.Geom.Point(x + sd * 14, y - 6),
      ], true);
      g.lineStyle(1, WITCH.robeLit, alpha * 0.8);
      g.lineBetween(x + sd * 17, y - 14, x + sd * 21 + sway, y + 6);
    }

    // Face: green skin, a shadowed jaw, a lit cheek.
    g.fillStyle(WITCH.skinShade, alpha);
    g.fillEllipse(x + 1, y - 1, 32, 30);
    g.fillStyle(WITCH.skin, alpha);
    g.fillEllipse(x, y - 2.5, 30, 27);
    g.fillStyle(WITCH.skinLit, alpha * 0.55);
    g.fillEllipse(x - 7, y - 7, 10, 7);

    // Robe: a tapered gown, narrow at the throat, flaring to a ragged hem.
    const neckY = y + 11;
    const hemY = y + (m ? HEM_Y - 4 : HEM_Y);
    const robe = (col: number, inset: number, a: number) => {
      const pts: Phaser.Geom.Point[] = [];
      const steps = 6;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        pts.push(new Phaser.Geom.Point(x - (11 + u * u * 15) + inset, neckY + (hemY - neckY) * u));
      }
      // Tattered hem: zig-zag points along the bottom.
      const teeth = 7;
      for (let i = 0; i <= teeth; i++) {
        const u = i / teeth;
        const hx = x - 26 + inset + u * (52 - inset * 2);
        const flutter = Math.sin(this.t * 4 + i * 1.7) * 1.2;
        pts.push(new Phaser.Geom.Point(hx, hemY + (i % 2 ? 5 : -1) + flutter));
      }
      for (let i = steps; i >= 0; i--) {
        const u = i / steps;
        pts.push(new Phaser.Geom.Point(x + (11 + u * u * 15) - inset, neckY + (hemY - neckY) * u));
      }
      g.fillStyle(col, a);
      g.fillPoints(pts, true);
    };
    robe(WITCH.void, -1.5, alpha);
    robe(WITCH.robe, 0, alpha);
    robe(WITCH.robeLit, 9, alpha * 0.45);
    // Shawl collar and a brooch: a green stone in a pewter clasp.
    g.fillStyle(WITCH.ink, alpha);
    g.fillEllipse(x, neckY + 1.5, 30, 8);
    g.fillStyle(WITCH.plum, alpha);
    g.fillEllipse(x, neckY + 0.5, 26, 6);
    g.fillStyle(WITCH.ironHi, alpha);
    g.fillCircle(x, neckY + 3, 3.2);
    g.fillStyle(m ? WITCH.hexLit : WITCH.hex, alpha);
    g.fillCircle(x, neckY + 3, 2.1);
    g.fillStyle(WITCH.white, alpha * 0.8);
    g.fillCircle(x - 0.7, neckY + 2.3, 0.7);
    // A rope belt with a little vial hanging off it.
    g.lineStyle(1.8, WITCH.ink, alpha);
    g.lineBetween(x - 16, y + 16, x + 16, y + 16);
    g.fillStyle(WITCH.lilac, alpha * 0.7);
    g.fillRoundedRect(x + 8, y + 16, 4.4, 6, 1.4);
    g.fillStyle(WITCH.hexLit, alpha * 0.95);
    g.fillRoundedRect(x + 8.6, y + 18.6, 3.2, 3, 1);

    // Hooked nose with a wart — between and below the eyes, never over them.
    const nx = x + Math.cos(this.facing) * 1.6;
    g.fillStyle(WITCH.skinShade, alpha);
    g.fillPoints([
      new Phaser.Geom.Point(nx - 2.2, y - 3),
      new Phaser.Geom.Point(nx + 2.2, y - 3),
      new Phaser.Geom.Point(nx + 3.4, y + 2),
      new Phaser.Geom.Point(nx + 1, y + 4.4),
      new Phaser.Geom.Point(nx - 1.6, y + 3.4),
    ], true);
    g.fillStyle(WITCH.skinLit, alpha * 0.7);
    g.fillEllipse(nx - 0.6, y - 0.4, 1.6, 4);
    g.fillStyle(WITCH.skinShade, alpha);
    g.fillCircle(nx + 3.2, y + 0.4, 1.2);

    // Cackling grin: opens and shuts in bursts — a laugh, not a talk.
    const burst = Math.max(0, Math.sin(this.t * 0.9));
    const open = (burst > 0.7 ? 0.5 + 0.5 * Math.abs(Math.sin(this.t * 22)) : 0.15) * (0.8 + this.intensity * 0.2);
    const my = y + 6.4;
    g.fillStyle(WITCH.void, alpha);
    g.fillPoints([
      new Phaser.Geom.Point(x - 7, my - 0.6),
      new Phaser.Geom.Point(x + 7, my - 0.6),
      new Phaser.Geom.Point(x + 4, my + 1.4 + open * 3),
      new Phaser.Geom.Point(x - 4, my + 1.4 + open * 3),
    ], true);
    // One snaggletooth.
    g.fillStyle(WITCH.bone, alpha);
    g.fillRect(x - 3.2, my - 0.6, 1.8, 1.8 + open * 0.8);

    if (m) this.drawBroom(g, x, y, alpha, true);
  }

  /**
   * The mastered broomstick, slung across her lap. Drawn in two passes: the bristle end behind
   * the robe, then the handle tip in front, so she sits *on* it rather than under it.
   */
  private drawBroom(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number, front: boolean): void {
    // Bristles trail away from the run.
    const lean = this.lean(x);
    const dir = lean >= 0 ? 1 : -1; // side the bristles sit on
    const by = y + 19;
    const tilt = 0.12 * dir;
    const hx = x - dir * 36, hy = by - tilt * 36 * dir;
    const tx = x + dir * 24, ty = by + tilt * 24 * dir;
    if (!front) {
      // Bristle bundle: a fan of tapered straws.
      const bx = tx, bby = ty;
      for (let i = -3; i <= 3; i++) {
        const spread = i * 2.4;
        const len = 18 + Math.abs(Math.sin(i * 1.7)) * 4 + Math.sin(this.t * 6 + i) * 1.2;
        g.fillStyle(i % 2 ? WITCH.straw : WITCH.strawLit, alpha);
        g.fillPoints([
          new Phaser.Geom.Point(bx, bby - 2 + i * 0.6),
          new Phaser.Geom.Point(bx + dir * len, bby + spread - 1),
          new Phaser.Geom.Point(bx + dir * len, bby + spread + 1.2),
          new Phaser.Geom.Point(bx, bby + 2 + i * 0.6),
        ], true);
      }
      g.fillStyle(WITCH.hex, alpha * 0.3);
      g.fillEllipse(tx + dir * 14, ty, 26, 14);
      // Binding round the bundle.
      g.fillStyle(WITCH.violet, alpha);
      g.fillRoundedRect(tx - 2.5, ty - 4.5, 5, 9, 2);
    } else {
      // Handle: knotted dark wood, the near end poking out in front of the robe.
      g.lineStyle(4.2, WITCH.log, alpha);
      g.lineBetween(hx, hy, x - dir * 14, by - tilt * 14 * dir);
      g.lineStyle(1.4, WITCH.logLit, alpha);
      g.lineBetween(hx, hy - 1.2, x - dir * 14, by - tilt * 14 * dir - 1.2);
      g.fillStyle(WITCH.log, alpha);
      g.fillCircle(hx, hy, 3);
      g.fillCircle(x - dir * 26, by - tilt * 26 * dir, 2.6);
    }
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y0: number, a: number, alpha: number): void {
    const y = y0 + this.hover;
    const m = this.mastered;
    const lean = this.lean(x);

    // ── Hat ──
    const brimY = y - 16.5;
    // Brim: a wide flat ellipse, rippled at the edge.
    g.fillStyle(WITCH.void, alpha);
    g.fillEllipse(x, brimY + 1.2, m ? 66 : 58, 13);
    g.fillStyle(WITCH.ink, alpha);
    g.fillEllipse(x, brimY, m ? 62 : 54, 10.5);
    g.fillStyle(WITCH.robe, alpha * 0.6);
    g.fillEllipse(x - 6, brimY - 1.6, m ? 40 : 34, 4);

    // Cone: crooked, tapering, its tip bending back off the run.
    const height = m ? 44 : 31;
    const baseHalf = m ? 15 : 14;
    const bendX = -lean * 0.9 + (m ? -10 : 4) + Math.sin(this.t * 1.7) * 1.2;
    const coneAt = (u: number, sd: number) => {
      // A kink partway up so it reads as a soft hat, not a traffic cone.
      const kink = m ? Math.max(0, u - 0.55) * Math.max(0, u - 0.55) * 4 : u * u;
      const half = baseHalf * Math.pow(1 - u, 0.9);
      return new Phaser.Geom.Point(x + sd * half + bendX * kink, brimY - 2 - height * u + (m ? Math.max(0, u - 0.7) * 22 : 0));
    };
    const cone = (shrink: number, col: number, al: number, dx: number) => {
      const pts: Phaser.Geom.Point[] = [];
      const steps = 12;
      for (let i = 0; i <= steps; i++) {
        const p = coneAt(i / steps, -1);
        pts.push(new Phaser.Geom.Point(x + (p.x - x) * shrink + dx, p.y));
      }
      for (let i = steps; i >= 0; i--) {
        const p = coneAt(i / steps, 1);
        pts.push(new Phaser.Geom.Point(x + (p.x - x) * shrink + dx, p.y));
      }
      g.fillStyle(col, al);
      g.fillPoints(pts, true);
    };
    cone(1.08, WITCH.void, alpha, 0);
    cone(1, WITCH.ink, alpha, 0);
    cone(0.45, WITCH.robe, alpha * 0.55, -4);

    // Band and buckle.
    g.fillStyle(m ? WITCH.violet : WITCH.plum, alpha);
    g.fillRect(x - baseHalf + 0.5, brimY - 7, baseHalf * 2 - 1, 5);
    g.fillStyle(m ? WITCH.violetLit : WITCH.robeLit, alpha * 0.8);
    g.fillRect(x - baseHalf + 0.5, brimY - 7, baseHalf * 2 - 1, 1.4);
    g.lineStyle(1.6, WITCH.hexLit, alpha);
    g.strokeRect(x - 3.4, brimY - 7.6, 6.8, 6.2);
    g.fillStyle(WITCH.hexPale, alpha * 0.9);
    g.fillRect(x - 0.6, brimY - 6.6, 1.2, 4.2);

    if (!m) {
      // A stitched patch on the cone.
      g.fillStyle(WITCH.robeLit, alpha * 0.9);
      g.fillRect(x + 3, brimY - 18, 6, 6);
      g.lineStyle(0.8, WITCH.lilac, alpha * 0.8);
      g.lineBetween(x + 3, brimY - 18, x + 9, brimY - 12);
      g.lineBetween(x + 9, brimY - 18, x + 3, brimY - 12);
    } else {
      // Stars and a crescent moon on the tall hat, twinkling.
      const stars = [[0.32, -4], [0.5, 4], [0.66, -1]];
      for (let i = 0; i < stars.length; i++) {
        const p = coneAt(stars[i][0], 0);
        const sx = p.x + stars[i][1] * (1 - stars[i][0]), sy = p.y;
        const tw = 0.6 + 0.4 * Math.sin(this.t * 4 + i * 2);
        const r = 2.4 * tw + 0.8;
        g.fillStyle(WITCH.hexPale, alpha * (0.6 + 0.4 * tw));
        g.fillPoints([
          new Phaser.Geom.Point(sx, sy - r), new Phaser.Geom.Point(sx + r * 0.3, sy - r * 0.3),
          new Phaser.Geom.Point(sx + r, sy), new Phaser.Geom.Point(sx + r * 0.3, sy + r * 0.3),
          new Phaser.Geom.Point(sx, sy + r), new Phaser.Geom.Point(sx - r * 0.3, sy + r * 0.3),
          new Phaser.Geom.Point(sx - r, sy), new Phaser.Geom.Point(sx - r * 0.3, sy - r * 0.3),
        ], true);
      }
      const mp = coneAt(0.16, 0);
      g.fillStyle(WITCH.lilac, alpha);
      g.fillCircle(mp.x - 6, mp.y, 3.4);
      g.fillStyle(WITCH.ink, alpha);
      g.fillCircle(mp.x - 4.8, mp.y - 0.8, 3);
      // A green witch-fire wisp dancing off the drooping tip.
      const tip = coneAt(1, 0);
      g.fillStyle(WITCH.hex, a * 0.25);
      g.fillCircle(tip.x, tip.y - 2, 7);
      g.fillStyle(WITCH.hexLit, alpha * 0.9);
      flameTongue(g, tip.x, tip.y, 9 + Math.sin(this.t * 9) * 1.5, 2.6, lean * 0.4);
      this.drawCrowFamiliar(g, x, y, alpha);
    }
  }

  /** The mastered familiar: a crow perched on her shoulder, head-bobbing, an eye on the target. */
  private drawCrowFamiliar(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    // Perch on the shoulder away from where she is looking, so it never sits over the face.
    const sd = Math.cos(this.facing) >= 0 ? -1 : 1;
    const px = x + sd * 22, py = y - 6;
    const bob = Math.max(0, Math.sin(this.t * 3.1)) * 1.6;
    const look = -sd; // faces inward/ahead
    // Talons on the shoulder.
    g.lineStyle(1.2, WITCH.beak, alpha);
    g.lineBetween(px - 2, py + 5, px - 2, py + 8);
    g.lineBetween(px + 2, py + 5, px + 2, py + 8);
    // Tail.
    g.fillStyle(WITCH.crow, alpha);
    g.fillPoints([
      new Phaser.Geom.Point(px - look * 3, py + 2),
      new Phaser.Geom.Point(px - look * 11, py + 9),
      new Phaser.Geom.Point(px - look * 9, py + 11),
      new Phaser.Geom.Point(px - look * 1, py + 5),
    ], true);
    // Body and folded wing.
    g.fillEllipse(px, py + 1, 12, 11);
    g.fillStyle(WITCH.crowLit, alpha * 0.85);
    g.fillEllipse(px - look * 1.5, py + 1.5, 8, 6);
    // Head.
    g.fillStyle(WITCH.crow, alpha);
    g.fillCircle(px + look * 3, py - 5 - bob, 4.2);
    g.fillStyle(WITCH.beak, alpha);
    g.fillPoints([
      new Phaser.Geom.Point(px + look * 6.4, py - 6.6 - bob),
      new Phaser.Geom.Point(px + look * 11, py - 4.6 - bob),
      new Phaser.Geom.Point(px + look * 6.4, py - 3.6 - bob),
    ], true);
    g.fillStyle(WITCH.hexLit, alpha);
    g.fillCircle(px + look * 4.2, py - 6 - bob, 1.2);
    // Glow mote of the familiar bond.
    const orbit = this.t * 2.4;
    g.fillStyle(WITCH.hexPale, alpha * 0.6);
    g.fillCircle(px + Math.cos(orbit) * 9, py - 2 + Math.sin(orbit) * 4, 1.1);
  }
}
