import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, TAU } from './ElementVisuals';
import { QC } from './QuantumCoreVisuals';

/**
 * Quantum's character — the one body a Quantum wears all fight.
 *
 * A loadout re-keys the fighter onto a different element on almost every press, and each of
 * those kits would otherwise stand its own rig (and its own body texture) up on the player.
 * Instead every carried rig is vetoed at the fighter's position (`BaseAvatar.rigFilter`) and
 * this one draws in their place, so the character never changes whatever is live.
 *
 * The look: a deep-teal orb (`quantum-body`) inside electron shells tilted across it — the
 * back half of each shell drawn under the sprite, the front half over it, so the orb sits
 * *inside* the atom — with electrons for hands and a faint violet ghost of the body
 * shivering beside it, the places it might also be. **Mastered** adds a third, upright shell
 * and a crown of three electrons circling over the head.
 */

const QUANTUM_AVATAR: AvatarSpec = {
  hands: [
    { r: 9, color: QC.ghost, alpha: 0.22, ox: 1.5, oy: 1 },
    { r: 7.5, color: QC.core, alpha: 0.35 },
    { r: 5, color: QC.core, alpha: 1 },
    { r: 2.6, color: QC.hot, alpha: 1, ox: -1, oy: -1.2 },
  ],
  eyeWhite: QC.hot,
  eyePupil: QC.dark,
  squash: { div: 13, x: 0.5, y: 0.3 },
};

/** The shells' centre sits a little below the fighter's, so their front arcs pass under the eyes. */
const SHELL_DY = 4;
const SHELL_RX = 33;
const SHELL_RY = 9;

export class QuantumAvatar extends BaseAvatar {
  constructor(scene: Phaser.Scene, _tint?: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, QUANTUM_AVATAR);
  }

  /** Point `u` (radians) round a shell tilted by `rot`, centred on `(x, y)`. */
  private shellPoint(x: number, y: number, rot: number, rx: number, ry: number, u: number): [number, number] {
    const ex = Math.cos(u) * rx, ey = Math.sin(u) * ry;
    return [x + ex * Math.cos(rot) - ey * Math.sin(rot), y + ex * Math.sin(rot) + ey * Math.cos(rot)];
  }

  /**
   * Half a shell — `front` is the half nearer the viewer (sin u > 0). Two passes, wide and dim
   * under narrow and bright, so it reads as glowing wire rather than a flat stroke.
   */
  private halfShell(
    g: Phaser.GameObjects.Graphics, x: number, y: number,
    rot: number, rx: number, ry: number, front: boolean, alpha: number, color: number,
  ): void {
    const steps = 20;
    const u0 = front ? 0 : Math.PI;
    for (const [w, k] of [[3.4, 0.25], [1.4, 0.9]] as Array<[number, number]>) {
      g.lineStyle(w, color, alpha * k);
      g.beginPath();
      for (let i = 0; i <= steps; i++) {
        const [px, py] = this.shellPoint(x, y, rot, rx, ry, u0 + (i / steps) * Math.PI);
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
    }
  }

  /** The shells this rig wears: tilt, radii and electron speed. Mastery adds the upright one. */
  private shells(): Array<{ rot: number; rx: number; ry: number; speed: number; color: number }> {
    const list: Array<{ rot: number; rx: number; ry: number; speed: number; color: number }> = [
      { rot: 0.32, rx: SHELL_RX, ry: SHELL_RY, speed: 1.9, color: QC.core },
      { rot: -0.32, rx: SHELL_RX, ry: SHELL_RY, speed: -1.5, color: QC.core },
    ];
    if (this.mastered) list.push({ rot: Math.PI / 2, rx: 30, ry: 8, speed: 2.4, color: QC.ghost });
    return list;
  }

  /** Each shell's electron, on whichever half it is currently riding. */
  private electrons(g: Phaser.GameObjects.Graphics, x: number, y: number, front: boolean, alpha: number): void {
    for (const s of this.shells()) {
      const u = ((this.t * s.speed) % TAU + TAU) % TAU;
      if ((Math.sin(u) > 0) !== front) continue;
      const [px, py] = this.shellPoint(x, y + SHELL_DY, s.rot, s.rx, s.ry, u);
      g.fillStyle(s.color, alpha * 0.4);
      g.fillCircle(px, py, 4.2);
      g.fillStyle(QC.hot, alpha);
      g.fillCircle(px, py, 2.2);
    }
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    // Halo, then the ghost: a second, fainter body a few pixels off, jittering on a slow beat
    // — the superposition read, and the one thing on this rig that never holds still.
    g.fillStyle(QC.core, a * 0.16 * this.intensity);
    g.fillCircle(x, y, 36);
    const jx = Math.sin(this.t * 7.3) * 3.5 + Math.sin(this.t * 2.1) * 2;
    const jy = Math.cos(this.t * 5.9) * 2.5;
    g.fillStyle(QC.ghost, alpha * 0.28);
    g.fillCircle(x + 5 + jx, y + 1 + jy, 22);
    g.fillStyle(QC.core, alpha * 0.14);
    g.fillCircle(x - 5 - jx, y - jy, 22);
    // The far halves of the shells and any electron behind the orb.
    for (const s of this.shells()) this.halfShell(g, x, y + SHELL_DY, s.rot, s.rx, s.ry, false, alpha * 0.55, s.color);
    this.electrons(g, x, y, false, alpha * 0.6);
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    for (const s of this.shells()) {
      // The upright mastery shell's near half would run straight down the face, so only its
      // far half (under the sprite) is drawn.
      if (s.rot === Math.PI / 2) continue;
      this.halfShell(g, x, y + SHELL_DY, s.rot, s.rx, s.ry, true, alpha, s.color);
    }
    this.electrons(g, x, y, true, alpha);

    if (this.mastered) {
      // Crown: three electrons circling a dashed ring over the head.
      const cy = y - 31;
      g.lineStyle(1.2, QC.ghost, alpha * 0.6);
      g.strokeEllipse(x, cy, 30, 8);
      for (let i = 0; i < 3; i++) {
        const u = this.t * 2.2 + (i * TAU) / 3;
        const px = x + Math.cos(u) * 15, py = cy + Math.sin(u) * 4;
        g.fillStyle(QC.ghost, alpha * 0.45);
        g.fillCircle(px, py, 4);
        g.fillStyle(QC.hot, alpha);
        g.fillCircle(px, py, 2);
      }
    }
  }

  protected applyMastery(on: boolean): void {
    // The hands' ghost halo turns from a hint into a second, violet electron shell.
    this.forEachHandLayer(0, (arc) => arc.setRadius(on ? 11 : 9).setFillStyle(QC.ghost, on ? 0.38 : 0.22));
  }

  protected emitTrail(x: number, y: number): void {
    const mote = this.scene.add.circle(x, y, 3, QC.ghost, 0.55).setDepth(5);
    this.scene.tweens.add({
      targets: mote, alpha: 0, scale: 0.3, duration: 320,
      x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 10,
      onComplete: () => mote.destroy(),
    });
  }
}
