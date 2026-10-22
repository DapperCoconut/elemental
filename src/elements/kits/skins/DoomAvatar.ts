import Phaser from 'phaser';
import { AvatarSpec, ColorFn, FxBase, TAU } from '../ElementVisuals';
import { MythAvatar } from '../MythVisuals';
import { DOOM, crucible, heldDoomGun } from './DoomFx';

/**
 * Doom — Myth's skin as the demon-hunting marine.
 *
 * Extends `MythAvatar` (itself a `BaseAvatar`) so every hook MythKit drives — the blade drawn
 * for Truth Breaker, the gun in hand for Final Destiny, the parry ring, the flip over the beast
 * — keeps working; only the drawing is replaced.
 *
 * - *Unmastered* — the classic marine: rounded green helmet with an amber visor (the rig's
 *   tracking eyes sit in it as the visor's lit lenses), round green pauldrons, a grey chest plate
 *   over green armour, a belt of brass shells, and the Crucible's hilt slung across the back.
 * - *Mastered* — the Slayer's heavier plate: an angular helmet with a swept crest fin, huge
 *   ridged pauldrons, a shoulder-mounted rocket pod, red rune lines burning down the chest, and
 *   the Crucible's hilt never quite going dark.
 */

const SPEC: AvatarSpec = {
  hands: [
    { r: 12.5, color: DOOM.hell, alpha: 0.14 },
    { r: 9.2, color: DOOM.armourDeep, alpha: 1 },
    { r: 7.6, color: DOOM.armour, alpha: 1 },
    { r: 3.4, color: DOOM.armourDark, alpha: 1, ox: 2.2, oy: 2 },
    { r: 2.1, color: DOOM.armourLit, alpha: 0.95, ox: -2.4, oy: -2.4 },
  ],
  eyeWhite: DOOM.visor,
  eyePupil: DOOM.visorDeep,
  squash: { div: 16, x: 0.36, y: 0.2 },
};

const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

class DoomTrailFx extends FxBase {
  ember(x: number, y: number): void {
    const dx = (Math.random() - 0.5) * 8;
    this.anim(7, 260, (g, k) => {
      g.fillStyle(k < 0.4 ? DOOM.ember : DOOM.hellDeep, 1 - k);
      g.fillCircle(x + dx * k, y - 10 * k, 2.2 * (1 - k * 0.6));
    });
  }
}

export class DoomAvatar extends MythAvatar {
  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, SPEC);
  }

  protected applyMastery(on: boolean): void {
    this.eyeTarget = on ? 1 : this.eyeTarget;
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 15 : 12.5);
      glow.setFillStyle(DOOM.hell, on ? 0.3 : 0.14);
    });
    this.forEachHandLayer(1, (rim) => {
      if (on) rim.setStrokeStyle(1.6, DOOM.hell, 0.9);
      else rim.setStrokeStyle();
    });
    this.setEyeWhite(on ? DOOM.hell : DOOM.visor);
  }

  protected emitTrail(x: number, y: number): void {
    new DoomTrailFx(this.scene, (c) => c).ember(x, y);
  }

  // ── Body ──────────────────────────────────────────────────────────────────

  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const m = this.mastered;
    const lean = Phaser.Math.Clamp(((this.armX[0] + this.armX[1]) / 2 - x) * 0.12, -2, 2);
    // Legs / boots peeking under the torso.
    g.fillStyle(DOOM.armourDeep, alpha);
    g.fillPoints([P(x - 14, y + 14), P(x - 3, y + 14), P(x - 4, y + 24), P(x - 15, y + 24)], true);
    g.fillPoints([P(x + 3, y + 14), P(x + 14, y + 14), P(x + 15, y + 24), P(x + 4, y + 24)], true);
    g.fillStyle(DOOM.plateDark, alpha);
    g.fillRect(x - 16, y + 21, 13, 3.5);
    g.fillRect(x + 3, y + 21, 13, 3.5);
    // Torso: tapered armour, broad at the shoulders, narrow at the belt.
    const torso = [
      P(x - 21, y - 9), P(x + 21, y - 9), P(x + 18, y + 6), P(x + 14, y + 17), P(x - 14, y + 17), P(x - 18, y + 6),
    ];
    g.fillStyle(DOOM.armourDark, alpha);
    g.fillPoints(torso, true);
    // Lit side of the armour (light from the upper left).
    g.fillStyle(DOOM.armour, alpha);
    g.fillPoints([P(x - 20, y - 8), P(x + 6, y - 8), P(x + 2, y + 16), P(x - 13, y + 16), P(x - 17, y + 6)], true);
    // Chest plate.
    const chest = [P(x - 12, y + 1), P(x + 12, y + 1), P(x + 10, y + 11), P(x, y + 14), P(x - 10, y + 11)];
    g.fillStyle(m ? DOOM.plateDark : DOOM.plate, alpha);
    g.fillPoints(chest, true);
    g.lineStyle(1, DOOM.plateLit, alpha * 0.8);
    g.strokePoints(chest, true, true);
    if (m) {
      // Rune lines burning down the Praetor plate.
      const pulse = 0.6 + 0.4 * Math.sin(this.sparkle * 4);
      g.lineStyle(1.4, DOOM.hell, alpha * pulse);
      g.lineBetween(x, y + 2, x, y + 13);
      g.lineBetween(x - 8, y + 4, x - 2, y + 9);
      g.lineBetween(x + 8, y + 4, x + 2, y + 9);
      g.fillStyle(DOOM.ember, alpha * pulse);
      g.fillCircle(x, y + 6, 1.8);
    } else {
      g.lineStyle(1, DOOM.plateDark, alpha * 0.7);
      g.lineBetween(x - 9, y + 6, x + 9, y + 6);
    }
    // Belt with brass shells.
    g.fillStyle(DOOM.leather, alpha);
    g.fillRect(x - 15, y + 14, 30, 4);
    for (let i = 0; i < 6; i++) {
      g.fillStyle(DOOM.brass, alpha);
      g.fillRect(x - 12 + i * 4.4, y + 14.4, 2.2, 3.2);
    }
    g.fillStyle(DOOM.plateLit, alpha);
    g.fillRect(x - 2, y + 14, 4, 4);
    // Pauldrons.
    this.pauldron(g, x - 18, y - 6, -1, alpha);
    this.pauldron(g, x + 18, y - 6, 1, alpha);
    // Helmet: a dome over the crown, cheek guards down past the eyes, the visor behind them.
    this.helmet(g, x + lean, y, alpha);
  }

  private pauldron(g: Phaser.GameObjects.Graphics, px: number, py: number, side: number, alpha: number): void {
    if (this.mastered) {
      // Angular Slayer plate: a big swept wedge with ridges.
      const pts = [P(px - side * 6, py - 7), P(px + side * 9, py - 9), P(px + side * 12, py + 1), P(px + side * 8, py + 9), P(px - side * 5, py + 7)];
      g.fillStyle(DOOM.armourDark, alpha);
      g.fillPoints(pts, true);
      g.fillStyle(DOOM.armour, alpha);
      g.fillPoints([P(px - side * 5, py - 6), P(px + side * 8, py - 8), P(px + side * 10, py - 1), P(px - side * 3, py + 1)], true);
      g.lineStyle(1.2, DOOM.plateLit, alpha * 0.8);
      g.strokePoints(pts, true, true);
      g.lineStyle(1, DOOM.armourDeep, alpha);
      g.lineBetween(px, py - 7, px + side * 4, py + 7);
      g.lineBetween(px + side * 5, py - 8, px + side * 8, py + 6);
    } else {
      g.fillStyle(DOOM.armourDark, alpha);
      g.fillEllipse(px + side * 1, py + 1, 17, 14);
      g.fillStyle(DOOM.armour, alpha);
      g.fillEllipse(px - side * 0.5, py - 1, 14, 10);
      g.fillStyle(DOOM.armourLit, alpha * 0.8);
      g.fillEllipse(px - side * 2, py - 3, 6, 3);
    }
  }

  private helmet(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const m = this.mastered;
    // The dome, from the crown down to the jaw, built point-by-point.
    const dome: Phaser.Geom.Point[] = [];
    const top = m ? 26 : 24;
    for (let i = 0; i <= 14; i++) {
      const u = Math.PI + (i / 14) * Math.PI;
      dome.push(P(x + Math.cos(u) * 15.5, y - 9 + Math.sin(u) * (top - 9)));
    }
    // Cheek guards down to the jaw.
    dome.push(P(x + 15.5, y + 1), P(x + 11, y + 6), P(x + 4, y + 8), P(x - 4, y + 8), P(x - 11, y + 6), P(x - 15.5, y + 1));
    g.fillStyle(m ? DOOM.armourDark : DOOM.armour, alpha);
    g.fillPoints(dome, true);
    g.lineStyle(1.2, DOOM.armourDeep, alpha);
    g.strokePoints(dome, true, true);
    // Shine on the dome.
    g.fillStyle(DOOM.armourLit, alpha * 0.7);
    g.fillEllipse(x - 6, y - 18, 9, 4);
    if (m) {
      // Angular brow ridge over the visor.
      g.fillStyle(DOOM.armour, alpha);
      g.fillPoints([P(x - 15, y - 11), P(x, y - 15), P(x + 15, y - 11), P(x + 13, y - 9), P(x - 13, y - 9)], true);
    } else {
      // Ear studs.
      g.fillStyle(DOOM.plate, alpha);
      g.fillCircle(x - 15, y - 4, 2.4);
      g.fillCircle(x + 15, y - 4, 2.4);
    }
    // The visor: a dark amber band the eyes glow through.
    const visor = [P(x - 13, y - 9), P(x + 13, y - 9), P(x + 12, y + 0.5), P(x + 6, y + 2), P(x - 6, y + 2), P(x - 12, y + 0.5)];
    g.fillStyle(DOOM.visorDeep, alpha);
    g.fillPoints(visor, true);
    g.fillStyle(m ? DOOM.hell : DOOM.visor, alpha * 0.28);
    g.fillPoints([P(x - 12, y - 8), P(x + 2, y - 8), P(x - 4, y + 1), P(x - 11, y)], true);
    g.lineStyle(1, DOOM.plateDark, alpha);
    g.strokePoints(visor, true, true);
    // Jaw vent.
    g.fillStyle(DOOM.plateDark, alpha);
    g.fillRect(x - 4, y + 3.5, 8, 3.5);
    g.lineStyle(0.8, DOOM.plate, alpha);
    for (let i = 0; i < 3; i++) g.lineBetween(x - 2.5 + i * 2.5, y + 3.8, x - 2.5 + i * 2.5, y + 6.6);
  }

  // ── Under the sprite ──────────────────────────────────────────────────────

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    // A hellfire scorch under the boots.
    g.fillStyle(DOOM.hellDeep, a * (this.mastered ? 0.3 : 0.18));
    g.fillEllipse(x, y + 20, 48, 14);
    if (this.mastered) {
      g.fillStyle(DOOM.hell, a * 0.1);
      g.fillCircle(x, y + 2, 34);
    }
    // Parry: a ring of red argent runes turning round the body.
    if (this.determined > 0.02) {
      const d = this.determined;
      g.lineStyle(2, DOOM.hell, a * d * 0.6);
      g.strokeEllipse(x, y + 8, 64, 26);
      for (let i = 0; i < 6; i++) {
        const ang = this.sparkle * 3 + (i / 6) * TAU;
        const px = x + Math.cos(ang) * 32;
        const py = y + 8 + Math.sin(ang) * 13;
        g.fillStyle(DOOM.ember, a * d);
        g.fillPoints([P(px, py - 4), P(px + 2.5, py), P(px, py + 4), P(px - 2.5, py)], true);
      }
    }
    // The Crucible's hilt slung across the back, its core showing past the shoulder.
    const back = 1 - this.bladeOut;
    if (back > 0.02) {
      const ba = -Math.PI * 0.62 + Math.cos(this.facing) * 0.18;
      crucible(g, x + 12, y + 8, ba, 0, alpha * back, 0, this.sparkle);
      const tip = { x: x + 12 + Math.cos(ba) * 30, y: y + 8 + Math.sin(ba) * 30 };
      // A short ember of the blade still burning: brighter once mastered.
      g.fillStyle(DOOM.hell, alpha * back * (this.mastered ? 0.5 : 0.2) * (0.7 + 0.3 * Math.sin(this.sparkle * 6)));
      g.fillCircle(tip.x, tip.y, 4);
    }
  }

  // ── Over everything ──────────────────────────────────────────────────────

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    if (this.mastered) {
      // Crest fin swept back off the crown.
      const lean = Math.cos(this.facing) * 2;
      const fin = [P(x - 2 + lean, y - 25), P(x + 2 + lean, y - 25), P(x + 1 - lean, y - 36), P(x - 4 - lean * 2, y - 31)];
      g.fillStyle(DOOM.armourDark, alpha);
      g.fillPoints(fin, true);
      g.lineStyle(1, DOOM.plateLit, alpha * 0.8);
      g.strokePoints(fin, true, true);
      // Shoulder rocket pod over the left pauldron, beside the head (never over the face).
      const sx = x - 25;
      const sy = y - 16;
      g.fillStyle(DOOM.plateDark, alpha);
      g.fillRect(sx - 5, sy - 4, 12, 8);
      g.lineStyle(1, DOOM.plateLit, alpha * 0.9);
      g.strokeRect(sx - 5, sy - 4, 12, 8);
      g.fillStyle(DOOM.plate, alpha);
      g.fillRect(sx - 3, sy - 7, 8, 3);
      for (let i = 0; i < 2; i++) {
        g.fillStyle(0x000000, alpha);
        g.fillCircle(sx + 7, sy - 1.8 + i * 3.6, 1.4);
      }
      g.fillStyle(DOOM.hell, alpha * (0.6 + 0.4 * Math.sin(this.sparkle * 5)));
      g.fillCircle(sx - 2, sy, 1.3);
    }
    if (this.bladeOut > 0.02) {
      const hx = x + Math.cos(this.facing) * 16;
      const hy = y + Math.sin(this.facing) * 16;
      crucible(g, hx, hy, this.facing, 50 * this.bladeOut, alpha * Math.max(0.4, this.bladeOut), this.bladeOut, this.sparkle);
    }
    if (this.gunKind) {
      const m = heldDoomGun(g, this.gunKind, x, y, this.facing, this.gunRecoil, alpha, this.sparkle);
      if (this.gunRecoil > 0.05) {
        const k = 1 - this.gunRecoil;
        const c = this.gunKind === 'rocket' ? DOOM.bfg : this.gunKind === 'rifle' ? DOOM.plasma : DOOM.ember;
        g.fillStyle(c, alpha * (1 - k) * 0.5);
        g.fillCircle(m.x, m.y, 9);
        g.fillStyle(DOOM.heat, alpha * (1 - k));
        g.fillCircle(m.x, m.y, 4);
      }
    }
  }
}
