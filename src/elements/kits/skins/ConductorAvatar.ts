import Phaser from 'phaser';
import { AvatarSpec, ColorFn, TAU } from '../ElementVisuals';
import { DeathAvatar } from '../DeathVisuals';
import { CON, ConductorAnims, pocketWatch, umbrella } from './ConductorFx';

/**
 * The Conductor skin's character (death). It extends `DeathAvatar` rather than `BaseAvatar` so
 * DeathKit keeps driving it through the same setters — `setDoom`, `setGuard`, `setHold` — while
 * every draw hook is replaced.
 *
 * - **Unmastered** — the guard: a peaked navy cap with a brass badge, a walrus moustache, a
 *   navy tunic with two rows of brass buttons and a red tie, white gloves, a furled umbrella in
 *   the right hand and a pocket watch always open in the left.
 * - **Mastered** — the Stationmaster: a tall gold-banded cap with a lamp on its front, gold
 *   epaulettes that square his shoulders, a frock coat whose tails sweep out behind him, a
 *   signal lantern swinging at his hip, and a ring of steam rolling round his feet.
 *
 * The doom read stays where DeathAvatar put it — the eyes — and the watch in his hand runs the
 * same minute as the board in the corner.
 */

const CONDUCTOR_AVATAR: AvatarSpec = {
  hands: [
    { r: 9.5, color: CON.steam, alpha: 0.22 },
    { r: 6.6, color: 0xc8ccd4, alpha: 1 },
    { r: 5.2, color: CON.white, alpha: 1 },
    { r: 1.5, color: CON.white, alpha: 0.9, ox: -2, oy: -2.2 },
  ],
  eyeWhite: CON.cream,
  eyePupil: CON.ink,
  squash: { div: 15, x: 0.42, y: 0.26 },
};

const pts = (arr: number[][]) => arr.map(([px, py]) => new Phaser.Geom.Point(px, py));

export class ConductorAvatar extends DeathAvatar {
  private anims: ConductorAnims;

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, CONDUCTOR_AVATAR);
    this.anims = new ConductorAnims(scene);
  }

  protected applyMastery(on: boolean): void {
    // Mastered gloves pick up a gold cuff glow.
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 12.5 : 9.5);
      glow.setFillStyle(on ? CON.brassLit : CON.steam, on ? 0.3 : 0.22);
    });
    this.forEachHandLayer(1, (cuff) => cuff.setFillStyle(on ? CON.brass : 0xc8ccd4, 1));
  }

  protected emitTrail(x: number, y: number): void {
    this.anims.steam(x, y, 2, 7, 460, 4);
  }

  /** Lamp light on the platform under him; mastered, coat tails and a rolling ring of steam. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const k = this.intensity * (1 + this.doom * 0.1);
    g.fillStyle(CON.lamp, a * 0.12 * k);
    g.fillEllipse(x, y + 16, 64 * k, 22 * k);
    if (this.doom > 0.01) {
      g.fillStyle(CON.red, a * 0.14 * this.doom);
      g.fillEllipse(x, y + 16, 60 * k, 20 * k);
    }
    if (!this.mastered) return;
    // Frock-coat tails, swept back away from the aim and swaying.
    const back = this.facing + Math.PI;
    const lean = Math.cos(back) * 8;
    for (const side of [-1, 1]) {
      const sway = Math.sin(this.t * 2.4 + side) * 2.5;
      const rx = x + side * 7;
      g.fillStyle(CON.navyDeep, alpha);
      g.fillPoints(pts([
        [rx - 9, y + 12], [rx + 9, y + 12],
        [rx + side * 5 + lean + sway + 4, y + 36], [rx + side * 5 + lean + sway - 6, y + 39],
      ]), true);
      g.fillStyle(CON.navy, alpha);
      g.fillPoints(pts([
        [rx - 5, y + 13], [rx + 4, y + 13], [rx + side * 4 + lean + sway - 2, y + 35],
      ]), true);
    }
    // Ring of steam rolling round his boots.
    for (let i = 0; i < 9; i++) {
      const ang = this.t * 0.9 + (i / 9) * TAU;
      const r = 3.5 + 1.5 * Math.sin(this.t * 2 + i);
      g.fillStyle(i % 2 ? CON.steam : CON.steamDark, a * 0.45);
      g.fillCircle(x + Math.cos(ang) * 30, y + 20 + Math.sin(ang) * 8, r);
    }
  }

  /**
   * Face and tunic over the sprite disc: a skin-toned face across the top, a big walrus
   * moustache under the eyes, white collar, red tie, navy tunic with lapels and two rows of
   * brass buttons. Mastered: gold epaulettes at the shoulders and a watch chain of gold.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    // Tunic — the whole disc first, so nothing of the sprite shows round the edge.
    g.fillStyle(CON.navyDeep, alpha);
    g.fillCircle(x, y, 22.5);
    g.fillStyle(CON.navy, alpha);
    g.fillCircle(x - 2, y + 1, 20);
    // Face: the upper part of the orb, lit from the upper left.
    g.fillStyle(CON.skinShade, alpha);
    g.fillEllipse(x, y - 5, 34, 26);
    g.fillStyle(CON.skin, alpha);
    g.fillEllipse(x - 1.5, y - 6, 30, 23);
    // Ears.
    g.fillStyle(CON.skinShade, alpha);
    g.fillEllipse(x - 17, y - 4, 5, 8);
    g.fillEllipse(x + 17, y - 4, 5, 8);
    // Collar and tie.
    g.fillStyle(CON.white, alpha);
    g.fillTriangle(x - 8, y + 6, x, y + 9, x - 3, y + 13);
    g.fillTriangle(x + 8, y + 6, x, y + 9, x + 3, y + 13);
    g.fillStyle(CON.red, alpha);
    g.fillPoints(pts([[x - 2, y + 9], [x + 2, y + 9], [x + 3, y + 19], [x, y + 22], [x - 3, y + 19]]), true);
    g.fillStyle(CON.redDark, alpha);
    g.fillTriangle(x, y + 9, x + 2, y + 9, x + 3, y + 19);
    // Lapels.
    g.fillStyle(CON.navyLit, alpha);
    g.fillPoints(pts([[x - 8, y + 6], [x - 3, y + 13], [x - 6, y + 21], [x - 15, y + 12]]), true);
    g.fillPoints(pts([[x + 8, y + 6], [x + 3, y + 13], [x + 6, y + 21], [x + 15, y + 12]]), true);
    // Two rows of brass buttons.
    for (const bx of [-9, 9]) {
      for (const by of [14, 19]) {
        g.fillStyle(CON.brassDark, alpha);
        g.fillCircle(x + bx, y + by, 1.7);
        g.fillStyle(CON.brassLit, alpha);
        g.fillCircle(x + bx - 0.5, y + by - 0.5, 0.8);
      }
    }
    // Walrus moustache: two tapered sweeps meeting under the nose, ends drooping, a little
    // flick of breath to it. Built point by point so it tapers to the tips.
    const twitch = Math.sin(this.t * 3.1) * 0.6;
    for (const side of [-1, 1]) {
      const top: Phaser.Geom.Point[] = [];
      const bot: Phaser.Geom.Point[] = [];
      for (let i = 0; i <= 8; i++) {
        const k = i / 8;
        const px = x + side * (1 + k * 12);
        const py = y + 3 + k * k * 4 + (i === 8 ? twitch : 0);
        const w = 2.6 * (1 - k * 0.8);
        top.push(new Phaser.Geom.Point(px, py - w));
        bot.unshift(new Phaser.Geom.Point(px, py + w * 0.8));
      }
      g.fillStyle(0x6a6a6a, alpha);
      g.fillPoints([...top, ...bot], true);
      g.fillStyle(0xb8b8b8, alpha * 0.8);
      g.fillPoints([...top, ...top.slice().reverse().map((p) => new Phaser.Geom.Point(p.x, p.y + 1.2))], true);
    }
    // Nose over the moustache.
    g.fillStyle(CON.skinShade, alpha);
    g.fillEllipse(x + Math.cos(this.facing) * 1.5, y + 1.5, 6, 5);
    g.fillStyle(CON.skin, alpha);
    g.fillEllipse(x + Math.cos(this.facing) * 1.5 - 0.8, y + 1, 4, 3.2);

    if (this.mastered) {
      // Epaulettes: gold boards with a fringe, squaring the shoulders well past the disc.
      for (const side of [-1, 1]) {
        const ex = x + side * 19;
        const ey = y + 7;
        g.fillStyle(CON.brassDark, alpha);
        g.fillEllipse(ex, ey, 13, 6);
        g.fillStyle(CON.brass, alpha);
        g.fillEllipse(ex, ey - 0.6, 11, 4.4);
        for (let f = 0; f < 5; f++) {
          const fx = ex - 5 + f * 2.5;
          g.lineStyle(1, CON.brassLit, alpha * 0.9);
          g.lineBetween(fx, ey + 2, fx + Math.sin(this.t * 3 + f) * 0.6, ey + 6.5);
        }
      }
    }
  }

  /**
   * Over the crown: the cap. The umbrella and the watch ride the hands, so they are drawn here
   * too, over everything, and nothing else sits below the crown.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const m = this.mastered;
    const crown = y - 17;
    const lean = Math.cos(this.facing) * 1.6;
    // ── Cap ──
    const h = m ? 17 : 9;
    const wTop = m ? 30 : 34;
    // Crown of the cap, flaring at the top.
    g.fillStyle(CON.navyDeep, alpha);
    g.fillPoints(pts([
      [x - 15, crown], [x + 15, crown],
      [x + wTop / 2 + lean, crown - h], [x - wTop / 2 + lean, crown - h],
    ]), true);
    g.fillStyle(CON.navy, alpha);
    g.fillPoints(pts([
      [x - 13, crown - 1], [x + 3, crown - 1],
      [x + 3 + lean, crown - h + 1.5], [x - wTop / 2 + 2 + lean, crown - h + 1.5],
    ]), true);
    // Top of the cap as a flattened disc.
    g.fillStyle(CON.navyLit, alpha);
    g.fillEllipse(x + lean, crown - h, wTop, 5);
    // Band.
    g.fillStyle(m ? CON.brass : CON.night, alpha);
    g.fillRect(x - 15, crown - 4, 30, 3.6);
    if (m) {
      g.fillStyle(CON.brassLit, alpha * 0.8);
      g.fillRect(x - 15, crown - 4, 30, 1);
      g.fillRect(x - 15 + lean * 0.5, crown - 10, 30, 1.6);
    }
    // Visor, a black crescent jutting forward over the brow.
    g.fillStyle(CON.night, alpha);
    g.fillEllipse(x + Math.cos(this.facing) * 3, crown + 0.5, 30, 5);
    g.fillStyle(CON.steelDark, alpha * 0.5);
    g.fillEllipse(x + Math.cos(this.facing) * 3, crown, 22, 1.6);
    // Badge — a winged wheel — or the Stationmaster's lamp.
    const bx = x + lean * 0.6, by = crown - (m ? 10 : 6);
    if (m) {
      g.fillStyle(CON.lamp, alpha * (0.25 + 0.15 * Math.sin(this.t * 5)));
      g.fillCircle(bx, by, 7);
      g.fillStyle(CON.brassDark, alpha);
      g.fillCircle(bx, by, 3.8);
      g.fillStyle(CON.lampHot, alpha);
      g.fillCircle(bx, by, 2.5);
    } else {
      g.fillStyle(CON.brass, alpha);
      g.fillCircle(bx, by, 2.4);
      g.fillTriangle(bx - 2, by, bx - 7, by - 2, bx - 6, by + 1);
      g.fillTriangle(bx + 2, by, bx + 7, by - 2, bx + 6, by + 1);
      g.fillStyle(CON.night, alpha);
      g.fillCircle(bx, by, 0.9);
    }

    // ── Pocket watch, left hand ──
    const lx = this.armX[0], ly = this.armY[0];
    if (Number.isFinite(lx)) {
      pocketWatch(g, lx, ly - 7, m ? 6 : 5, 1 - this.doom, alpha, {
        chainX: x - 9, chainY: y + 15, hot: this.doom > 0.75, t: this.t,
      });
    }

    // ── Umbrella, right hand ──
    // Furled and upright like a walking stick; tucked away while the stop sign is up.
    const hx = this.armX[1], hy = this.armY[1];
    if (Number.isFinite(hx) && this.guard < 0.4) {
      const rest = -Math.PI / 2 + 0.24 + Math.sin(this.t * 1.4) * 0.04;
      umbrella(g, hx, hy, rest, m ? 40 : 34, alpha * (1 - this.guard * 2), {
        glow: this.flare * 0.6 + (m ? 0.4 : 0),
      });
    }

    if (m) {
      // Signal lantern swinging at his hip, opposite the watch.
      const sw = Math.sin(this.t * 2.6) * 0.35;
      const px = x + 17, py = y + 14;
      const lx2 = px + Math.sin(sw) * 9, ly2 = py + Math.cos(sw) * 9;
      g.lineStyle(1, CON.steelDark, alpha);
      g.lineBetween(px, py, lx2, ly2 - 3);
      g.fillStyle(CON.lamp, alpha * 0.25);
      g.fillCircle(lx2, ly2 + 2, 7);
      g.fillStyle(CON.night, alpha);
      g.fillRect(lx2 - 3.5, ly2 - 3, 7, 9);
      g.fillStyle(this.doom > 0.75 ? CON.red : CON.green, alpha);
      g.fillRect(lx2 - 2.4, ly2 - 1.5, 4.8, 5.5);
      g.fillStyle(CON.white, alpha * 0.6);
      g.fillRect(lx2 - 1.8, ly2 - 1, 1, 2.5);
    }
  }
}
