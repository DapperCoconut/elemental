import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, TAU } from '../ElementVisuals';
import { MON, drawCrossbow, drawDart } from './MonkeyFx';

/**
 * The Monkey skin's character (growth): a dart monkey whose look follows his upgrades. GrowthKit
 * hands him the tier reached on each path every frame (`setPaths`), and he wears it:
 *
 * - **Top path** (Sharp Shots → Ultra-Juggernaut) — a red headband, then a quiver of darts on
 *   his back, then a spiked ball in his off hand that grows from a fist-sized one to a
 *   red-hot boulder under a horned helmet and finally a great spiked steel one.
 * - **Middle path** (Quick Shots → Plasma Monkey Fan Club) — wristbands, a backwards cap,
 *   three darts fanned in his hand, then the fan club's red cape and cowl, turning plasma violet.
 * - **Bottom path** (Long Range Darts → Crossbow Master) — a feather, a monocle over one eye,
 *   a crossbow in place of his dart, a cowboy hat, and the Master's green hood and gold bow.
 *
 * Only one hat fits, so the furthest-upgraded path wears its hat; every other accessory stacks.
 * **Mastered** he is the Paragon: a gold halo ring turning behind him, gold pauldrons squaring
 * his shoulders, a gold breastplate and three plasma darts circling his head.
 */

const MONKEY_AVATAR: AvatarSpec = {
  hands: [
    { r: 9, color: MON.furDark, alpha: 0.25 },
    { r: 6.6, color: MON.furDark, alpha: 1 },
    { r: 5.2, color: MON.fur, alpha: 1 },
    { r: 2.6, color: MON.tan, alpha: 1, ox: -1.4, oy: -1.2 },
  ],
  eyeWhite: MON.white,
  eyePupil: MON.ink,
  squash: { div: 13, x: 0.5, y: 0.3 },
};

const pts = (arr: number[][]) => arr.map(([px, py]) => new Phaser.Geom.Point(px, py));

export class MonkeyAvatar extends BaseAvatar {
  /** Tier reached on each path, 0–5: top (offense), middle (efficiency), bottom (defense). */
  private top = 0;
  private mid = 0;
  private bot = 0;

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, MONKEY_AVATAR);
  }

  /** The tier reached on each path. Called every frame; cheap. */
  setPaths(top: number, mid: number, bot: number): void {
    this.top = top;
    this.mid = mid;
    this.bot = bot;
  }

  /** Which path's hat he wears: the furthest one, top before middle before bottom on a tie. */
  private hatPath(): 'top' | 'mid' | 'bot' | null {
    const best = Math.max(this.top, this.mid, this.bot);
    if (best === 0) return null;
    return this.top === best ? 'top' : this.mid === best ? 'mid' : 'bot';
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 12 : 9);
      glow.setFillStyle(on ? MON.gold : MON.furDark, on ? 0.32 : 0.25);
    });
    this.forEachHandLayer(1, (cuff) => cuff.setFillStyle(on ? MON.goldDark : MON.furDark, 1));
  }

  // ── Under the sprite ─────────────────────────────────────────────────────

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const back = this.facing + Math.PI;
    g.fillStyle(MON.ink, a * 0.25);
    g.fillEllipse(x, y + 20, 46, 12);

    if (this.mastered) {
      // Paragon halo: a gold ring of darts turning behind him.
      const R = 33;
      g.fillStyle(MON.plasma, a * 0.12);
      g.fillCircle(x, y, R + 8);
      g.lineStyle(3, MON.goldDark, alpha * 0.9);
      g.strokeCircle(x, y, R);
      g.lineStyle(1.4, MON.gold, alpha);
      g.strokeCircle(x, y, R + 2.5);
      for (let i = 0; i < 8; i++) {
        const ang = this.t * 0.4 + (i / 8) * TAU;
        drawDart(g, x + Math.cos(ang) * R, y + Math.sin(ang) * R, ang + Math.PI / 2, 0.6, alpha);
      }
    }

    // Capes: the fan club's (middle 4–5) or the Crossbow Master's hood cloak (bottom 5).
    const cape = this.mid >= 4 ? (this.mid >= 5 ? MON.plasma : MON.cape)
      : this.bot >= 5 ? MON.hood : null;
    if (cape !== null) {
      const dark = cape === MON.hood ? MON.hoodDark : cape === MON.plasma ? 0x5a2a9a : MON.flightDark;
      const lx = Math.cos(back) * 12, ly = Math.sin(back) * 6;
      const flap = Math.sin(this.t * 4) * 3;
      g.fillStyle(dark, alpha);
      g.fillPoints(pts([
        [x - 15, y - 8], [x + 15, y - 8],
        [x + 22 + lx + flap, y + 30 + ly], [x + lx, y + 34 + ly], [x - 22 + lx - flap, y + 30 + ly],
      ]), true);
      g.fillStyle(cape, alpha);
      g.fillPoints(pts([
        [x - 12, y - 7], [x + 12, y - 7],
        [x + 17 + lx + flap, y + 27 + ly], [x + lx, y + 30 + ly], [x - 17 + lx - flap, y + 27 + ly],
      ]), true);
      if (cape === MON.plasma) {
        for (let i = 0; i < 4; i++) {
          const p = (this.t * 0.8 + i / 4) % 1;
          g.fillStyle(MON.plasmaHot, a * (1 - p) * 0.8);
          g.fillCircle(x + lx * p + (i - 1.5) * 8, y + 10 + p * 24, 1.6);
        }
      }
    }

    // Quiver of darts on his back (top 2+), slung behind the off shoulder.
    if (this.top >= 2) {
      const qx = x - 13, qy = y - 4;
      g.fillStyle(MON.woodDark, alpha);
      g.fillPoints(pts([[qx - 4, qy - 12], [qx + 4, qy - 12], [qx + 6, qy + 10], [qx - 2, qy + 12]]), true);
      for (let i = 0; i < 3; i++) drawDart(g, qx - 2 + i * 2.5, qy - 14, -Math.PI / 2 - 0.15 + i * 0.12, 0.6, alpha);
    }

    // Tail: a long curl out of the back, the tip lifting in a hook.
    const tb = Math.sin(this.t * 2) * 4;
    const sx = x + Math.cos(back) * 14, sy = y + 12;
    const side = Math.cos(back) >= 0 ? 1 : -1;
    const tail: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= 12; i++) {
      const k = i / 12;
      tail.push(new Phaser.Geom.Point(
        sx + side * (k * 22 + Math.sin(k * 4) * 3),
        sy + 6 - k * 26 + Math.sin(k * Math.PI) * 10 + tb * k,
      ));
    }
    g.lineStyle(4.2, MON.furDark, alpha);
    g.strokePoints(tail, false);
    g.lineStyle(2.4, MON.fur, alpha);
    g.strokePoints(tail, false);
    const tip = tail[tail.length - 1];
    g.fillStyle(MON.fur, alpha);
    g.fillCircle(tip.x, tip.y, 2.4);
  }

  // ── Over the sprite, under the eyes ──────────────────────────────────────

  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const lookX = Math.cos(this.facing) * 2.4;
    const lookY = Math.sin(this.facing) * 2;
    // Fur over the whole disc.
    g.fillStyle(MON.furDark, alpha);
    g.fillCircle(x, y, 22.8);
    g.fillStyle(MON.fur, alpha);
    g.fillCircle(x - 1.5, y - 1, 21);
    g.fillStyle(MON.furLit, alpha * 0.6);
    g.fillEllipse(x - 7, y - 11, 16, 9);
    // Ears.
    for (const s of [-1, 1]) {
      g.fillStyle(MON.furDark, alpha);
      g.fillCircle(x + s * 21, y - 5, 7);
      g.fillStyle(MON.tanShade, alpha);
      g.fillCircle(x + s * 21, y - 5, 4.2);
    }
    // Belly patch.
    g.fillStyle(MON.tan, alpha * 0.9);
    g.fillEllipse(x, y + 15, 20, 11);
    // Face mask: the heart of tan round the eyes and the muzzle below.
    g.fillStyle(MON.tanShade, alpha);
    g.fillEllipse(x - 7 + lookX, y - 4 + lookY, 15, 17);
    g.fillEllipse(x + 7 + lookX, y - 4 + lookY, 15, 17);
    g.fillEllipse(x + lookX, y + 6 + lookY, 22, 13);
    g.fillStyle(MON.tan, alpha);
    g.fillEllipse(x - 7 + lookX - 0.5, y - 4.5 + lookY, 13, 15);
    g.fillEllipse(x + 7 + lookX - 0.5, y - 4.5 + lookY, 13, 15);
    g.fillEllipse(x + lookX - 0.5, y + 5.5 + lookY, 20, 11);
    // Nostrils and a grin.
    g.fillStyle(MON.ink, alpha);
    g.fillCircle(x + lookX - 2, y + 3.5 + lookY, 0.9);
    g.fillCircle(x + lookX + 2, y + 3.5 + lookY, 0.9);
    g.lineStyle(1.3, MON.ink, alpha);
    g.beginPath();
    g.arc(x + lookX, y + 6 + lookY, 4.4, 0.35, Math.PI - 0.35);
    g.strokePath();

    // Enhanced Eyesight: a brass monocle round the right eye (a ring — the eye shows through).
    if (this.bot >= 2) {
      const ex = x + 7.2 + lookX, ey = y - 4 + lookY;
      g.lineStyle(1.8, MON.gold, alpha);
      g.strokeCircle(ex, ey, 6.4);
      g.lineStyle(0.8, MON.goldDark, alpha);
      g.lineBetween(ex + 5, ey + 4, x + 16, y + 12);
    }

    if (this.mastered) {
      // Gold breastplate over the belly and pauldrons past the shoulders.
      g.fillStyle(MON.goldDark, alpha);
      g.fillPoints(pts([[x - 12, y + 10], [x + 12, y + 10], [x + 9, y + 22], [x - 9, y + 22]]), true);
      g.fillStyle(MON.gold, alpha);
      g.fillPoints(pts([[x - 10, y + 11], [x + 10, y + 11], [x + 7, y + 20], [x - 7, y + 20]]), true);
      g.fillStyle(MON.plasma, alpha);
      g.fillCircle(x, y + 15, 2.4);
      for (const s of [-1, 1]) {
        g.fillStyle(MON.goldDark, alpha);
        g.fillEllipse(x + s * 19, y + 8, 14, 9);
        g.fillStyle(MON.gold, alpha);
        g.fillEllipse(x + s * 19, y + 7, 11, 6);
        g.fillStyle(MON.white, alpha * 0.5);
        g.fillEllipse(x + s * 18, y + 5.5, 5, 2);
      }
    }
  }

  // ── Over everything: hats above the crown, and what the hands carry ─────

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const crown = y - 17;
    const lean = Math.cos(this.facing) * 1.5;
    const hat = this.hatPath();
    const tier = hat === 'top' ? this.top : hat === 'mid' ? this.mid : hat === 'bot' ? this.bot : 0;

    if (hat === null) {
      // A tuft of fur on top.
      g.fillStyle(MON.furDark, alpha);
      g.fillTriangle(x - 4, crown + 2, x + 1 + lean, crown - 6, x + 3, crown + 2);
      g.fillTriangle(x, crown + 2, x + 5 + lean, crown - 4, x + 6, crown + 2);
    } else if (hat === 'top') {
      if (tier <= 3) this.headband(g, x, crown, MON.flight, MON.flightDark, alpha);
      else this.helmet(g, x, crown, lean, tier >= 5, alpha);
    } else if (hat === 'mid') {
      if (tier <= 1) this.headband(g, x, crown, MON.white, MON.flight, alpha);
      else if (tier <= 3) this.cap(g, x, crown, alpha);
      else this.cowl(g, x, crown, tier >= 5, alpha);
    } else {
      if (tier <= 2) this.feather(g, x, crown, lean, alpha);
      else if (tier <= 4) this.cowboyHat(g, x, crown, lean, alpha);
      else this.hood(g, x, crown, lean, alpha);
    }

    // Wristbands on both hands (middle 1+).
    for (let i = 0; i < 2; i++) {
      const hx = this.armX[i], hy = this.armY[i];
      if (!Number.isFinite(hx) || this.mid < 1) continue;
      g.lineStyle(2.4, this.mid >= 5 ? MON.plasma : MON.flight, alpha);
      g.strokeCircle(hx, hy, 6.4);
      g.lineStyle(1, MON.white, alpha * 0.8);
      g.strokeCircle(hx, hy, 7.6);
    }

    // Off hand: the spiked ball (top 3+).
    const lx = this.armX[0], ly = this.armY[0];
    if (Number.isFinite(lx) && this.top >= 3) {
      const R = this.top === 3 ? 5 : this.top === 4 ? 7.5 : 10;
      const bx = lx - 2, by = ly - R - 2;
      for (let i = 0; i < 9; i++) {
        const ang = (i / 9) * TAU + this.t * (this.top >= 5 ? 2 : 0.3);
        const c = Math.cos(ang), s = Math.sin(ang);
        g.fillStyle(MON.steelDark, alpha);
        g.fillTriangle(bx - s * 1.8, by + c * 1.8, bx + c * R * 1.55, by + s * R * 1.55, bx + s * 1.8, by - c * 1.8);
      }
      g.fillStyle(this.top >= 5 ? MON.flightDark : MON.steelDark, alpha);
      g.fillCircle(bx, by, R);
      if (this.top >= 5) {
        g.fillStyle(MON.flight, alpha * (0.4 + 0.3 * Math.sin(this.t * 6)));
        g.fillCircle(bx, by, R * 0.7);
      }
      g.fillStyle(MON.white, alpha * 0.45);
      g.fillCircle(bx - R * 0.35, by - R * 0.35, R * 0.25);
    }

    // Throwing hand: a crossbow (bottom 3+), a fan of three darts (middle 3+), or one dart.
    const hx = this.armX[1], hy = this.armY[1];
    if (Number.isFinite(hx)) {
      if (this.bot >= 3) {
        drawCrossbow(g, hx, hy, this.facing, this.bot >= 5 ? 1.15 : 0.95, alpha, this.bot >= 5);
      } else if (this.mid >= 3) {
        for (let i = -1; i <= 1; i++) drawDart(g, hx + Math.cos(this.facing) * 4, hy + Math.sin(this.facing) * 4, this.facing + i * 0.32, 0.75, alpha);
      } else {
        drawDart(g, hx + Math.cos(this.facing) * 4, hy + Math.sin(this.facing) * 4, this.facing, 0.8, alpha);
      }
    }

    if (this.mastered) {
      // Three plasma darts circling the head, well clear of the face.
      for (let i = 0; i < 3; i++) {
        const ang = this.t * 1.6 + (i / 3) * TAU;
        const px = x + Math.cos(ang) * 30;
        const py = y - 26 + Math.sin(ang) * 7;
        g.fillStyle(MON.plasma, alpha * 0.35);
        g.fillCircle(px, py, 5);
        drawDart(g, px, py, ang + Math.PI / 2, 0.55, alpha);
        g.fillStyle(MON.plasmaHot, alpha);
        g.fillCircle(px, py, 1.6);
      }
    }
  }

  private headband(g: Phaser.GameObjects.Graphics, x: number, crown: number, color: number, stripe: number, alpha: number): void {
    g.fillStyle(color, alpha);
    g.fillRoundedRect(x - 16, crown - 1, 32, 5, 2);
    g.fillStyle(stripe, alpha);
    g.fillRect(x - 16, crown + 1, 32, 1.2);
    // Two tails fluttering out behind the knot.
    const back = Math.cos(this.facing) >= 0 ? -1 : 1;
    const flap = Math.sin(this.t * 7) * 2;
    g.fillStyle(color, alpha);
    g.fillTriangle(x + back * 15, crown, x + back * 25, crown - 4 + flap, x + back * 23, crown + 1 + flap);
    g.fillTriangle(x + back * 15, crown + 3, x + back * 24, crown + 6 - flap, x + back * 21, crown + 8 - flap);
  }

  private helmet(g: Phaser.GameObjects.Graphics, x: number, crown: number, lean: number, ultra: boolean, alpha: number): void {
    const h = ultra ? 14 : 11;
    g.fillStyle(MON.steelDark, alpha);
    g.fillPoints(pts([[x - 17, crown + 3], [x + 17, crown + 3], [x + 13 + lean, crown - h], [x - 13 + lean, crown - h]]), true);
    g.fillStyle(MON.steel, alpha);
    g.fillPoints(pts([[x - 15, crown + 1], [x + 2, crown + 1], [x + 2 + lean, crown - h + 2], [x - 12 + lean, crown - h + 2]]), true);
    g.fillStyle(MON.steelLit, alpha);
    g.fillEllipse(x + lean, crown - h, 26, 5);
    g.fillStyle(MON.steelDark, alpha);
    g.fillRect(x - 17, crown + 1, 34, 3);
    if (ultra) {
      // Ultra-Juggernaut: spikes all over the dome.
      for (let i = 0; i < 5; i++) {
        const sx = x - 12 + i * 6 + lean;
        g.fillStyle(MON.steelLit, alpha);
        g.fillTriangle(sx - 2.2, crown - h + 1, sx, crown - h - 8 - (i === 2 ? 4 : 0), sx + 2.2, crown - h + 1);
      }
    } else {
      // Juggernaut: two curled horns.
      for (const s of [-1, 1]) {
        g.fillStyle(MON.tan, alpha);
        g.fillPoints(pts([[x + s * 13, crown - 4], [x + s * 16, crown - 1], [x + s * 24, crown - 14], [x + s * 21, crown - 15]]), true);
      }
    }
  }

  private cap(g: Phaser.GameObjects.Graphics, x: number, crown: number, alpha: number): void {
    // A backwards cap: the bill points away from the aim.
    const back = Math.cos(this.facing) >= 0 ? -1 : 1;
    g.fillStyle(MON.flightDark, alpha);
    g.fillEllipse(x, crown - 2, 32, 14);
    g.fillStyle(MON.flight, alpha);
    g.fillEllipse(x - 1, crown - 3.5, 28, 11);
    g.fillStyle(MON.flightDark, alpha);
    g.fillEllipse(x + back * 18, crown + 1, 14, 4.5);
    g.fillStyle(MON.white, alpha);
    g.fillCircle(x, crown - 8, 1.6);
  }

  private cowl(g: Phaser.GameObjects.Graphics, x: number, crown: number, plasma: boolean, alpha: number): void {
    // The fan club's cowl: a close cap with two pointed ears and a club emblem.
    const c = plasma ? MON.plasma : MON.capeBlue;
    g.fillStyle(plasma ? 0x5a2a9a : 0x1a3a8a, alpha);
    g.fillEllipse(x, crown - 1, 34, 13);
    g.fillStyle(c, alpha);
    g.fillEllipse(x - 1, crown - 2.5, 30, 10);
    for (const s of [-1, 1]) {
      g.fillStyle(c, alpha);
      g.fillTriangle(x + s * 8, crown - 5, x + s * 14, crown - 15, x + s * 15, crown - 3);
    }
    g.fillStyle(plasma ? MON.plasmaHot : MON.bloonYellow, alpha);
    g.fillCircle(x, crown - 3, 3.4);
    g.fillStyle(plasma ? MON.plasma : MON.cape, alpha);
    g.fillCircle(x, crown - 3, 1.6);
  }

  private feather(g: Phaser.GameObjects.Graphics, x: number, crown: number, lean: number, alpha: number): void {
    this.headband(g, x, crown, MON.hood, MON.hoodDark, alpha);
    const sway = Math.sin(this.t * 2) * 1.5;
    const f: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= 8; i++) {
      const k = i / 8;
      f.push(new Phaser.Geom.Point(x + 9 + lean + k * 5 + sway * k, crown - k * 16));
    }
    g.lineStyle(3.2, MON.flight, alpha);
    g.strokePoints(f, false);
    g.lineStyle(0.8, MON.white, alpha);
    g.strokePoints(f, false);
  }

  private cowboyHat(g: Phaser.GameObjects.Graphics, x: number, crown: number, lean: number, alpha: number): void {
    // Wide brim first, then the creased crown.
    g.fillStyle(MON.hatDark, alpha);
    g.fillEllipse(x + lean * 0.5, crown + 1, 46, 8);
    g.fillStyle(MON.hat, alpha);
    g.fillEllipse(x + lean * 0.5, crown, 42, 6);
    g.fillStyle(MON.hatDark, alpha);
    g.fillPoints(pts([[x - 11, crown], [x + 11, crown], [x + 9 + lean, crown - 11], [x + lean, crown - 8], [x - 9 + lean, crown - 11]]), true);
    g.fillStyle(MON.hat, alpha);
    g.fillPoints(pts([[x - 9, crown - 1], [x + 1, crown - 1], [x + lean, crown - 7.5], [x - 8 + lean, crown - 10]]), true);
    g.fillStyle(MON.flight, alpha);
    g.fillRect(x - 11, crown - 3, 22, 2);
  }

  private hood(g: Phaser.GameObjects.Graphics, x: number, crown: number, lean: number, alpha: number): void {
    // The Crossbow Master's peaked hood with a feather tucked in it.
    g.fillStyle(MON.hoodDark, alpha);
    g.fillPoints(pts([[x - 19, crown + 8], [x - 15, crown - 3], [x + 6 + lean * 2, crown - 18], [x + 15, crown - 3], [x + 19, crown + 8], [x + 12, crown + 2], [x - 12, crown + 2]]), true);
    g.fillStyle(MON.hood, alpha);
    g.fillPoints(pts([[x - 14, crown], [x + 5 + lean * 2, crown - 15], [x + 2, crown + 1]]), true);
    const f: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= 8; i++) {
      const k = i / 8;
      f.push(new Phaser.Geom.Point(x + 12 + k * 9, crown - 2 - k * 12 + Math.sin(this.t * 2) * k));
    }
    g.lineStyle(3, MON.flight, alpha);
    g.strokePoints(f, false);
  }
}
