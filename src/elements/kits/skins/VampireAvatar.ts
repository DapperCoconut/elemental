import Phaser from 'phaser';
import { AvatarSpec, ColorFn } from '../ElementVisuals';
import {
  BEAST_TONES, HUNTER_TONES, HuntAvatar, SILVER_TONES, drawClaws, drawCrossbow, drawShotgun,
} from '../HuntVisuals';
import { skinColor } from '../../../data/Skins';
import { VAMPIRE_SKIN } from '../../../data/skins/vampire';
import { VAMP, VampireFx, garlicBulb, stake } from './VampireFx';

/**
 * The Vampire skin's character (hunt). It extends `HuntAvatar` rather than `BaseAvatar`
 * directly so HuntKit can keep driving it through the same setters — `setForm`, `setWeapon`,
 * `setLoad`, `kick`, `rack`, `snap` — while every draw hook here is replaced.
 *
 * - **human** — the vampire hunter: wide-brim hat, long black coat over a crimson waistcoat,
 *   a string of garlic round his neck and a bandolier of ash stakes. Mastered he is the
 *   Inquisitor: a tall capotain hat, a shoulder cape that widens the silhouette, a silver
 *   crucifix and a quiver of stakes rising behind his shoulder.
 * - **beast** — the bloodsucker: deathly pale, slicked widow's peak, glowing red eyes, fangs
 *   with blood running off them, a bat-wing collar and a cape with a scalloped hem. Mastered
 *   the cape opens into real bat wings and blood beads orbit him.
 * - **hybrid** — half turned: the hunter's coat and hat still on, but one side of his face is
 *   pale with a fang, a bat collar rising on that side and half a cape hanging off it.
 */

const SPEC_HANDS: AvatarSpec['hands'] = [
  { r: 10, color: VAMP.crimsonDeep, alpha: 0.3 },
  { r: 6.8, color: 0x2a1a14, alpha: 1 },
  { r: 4, color: 0x4a3024, alpha: 1 },
  { r: 1.5, color: VAMP.silverLit, alpha: 1, ox: -2.2, oy: -2.2 },
];

const VAMPIRE_AVATAR: AvatarSpec = {
  hands: SPEC_HANDS,
  eyeWhite: VAMP.garlic,
  eyePupil: VAMP.black,
  squash: { div: 12, x: 0.58, y: 0.2 },
};

const SKIN = {
  hunter: 0xd6ae8e,
  hunterShade: 0xa47a5c,
  pale: 0xe8e0e4,
  paleShade: 0xb4a4b4,
  hair: 0x0a060c,
  hairLit: 0x2e2638,
  leather: 0x2a1a14,
  leatherLit: 0x4a3024,
  eyeRed: 0xff5064,
} as const;

const vampTint: ColorFn = (c) => skinColor(VAMPIRE_SKIN, c);
const pts = (arr: number[][]) => arr.map(([px, py]) => new Phaser.Geom.Point(px, py));

export class VampireAvatar extends HuntAvatar {
  private vfx: VampireFx;

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, HUNTER_TONES, depth, VAMPIRE_AVATAR);
    this.vfx = new VampireFx(scene);
  }

  // ── Hands and eyes per form ─────────────────────────────────────────────

  protected repaintHands(): void {
    if (!this.vfx) return; // super's constructor path
    const m = this.mastered;
    const form = this.form;
    const halo = form === 'beast' ? VAMP.crimson : VAMP.crimsonDeep;
    const shell = form === 'beast' ? SKIN.paleShade : SKIN.leather;
    const core = form === 'human' ? SKIN.leatherLit : SKIN.pale;
    this.forEachHandLayer(0, (a) => { a.setRadius(m ? 13 : 10); a.setFillStyle(m ? VAMP.crimsonLit : halo, m ? 0.34 : 0.3); });
    this.forEachHandLayer(1, (a) => a.setFillStyle(shell, 1));
    this.forEachHandLayer(2, (a) => a.setFillStyle(core, 1));
    this.forEachHandLayer(3, (a) => a.setFillStyle(form === 'beast' ? VAMP.bloodLit : VAMP.silverLit, 1));
    this.setEyeWhite(form === 'beast' ? SKIN.eyeRed : form === 'hybrid' ? 0xf4b0b8 : VAMP.garlic);
  }

  protected applyMastery(_on: boolean): void {
    this.repaintHands();
  }

  protected emitTrail(x: number, y: number): void {
    if (this.form === 'human') { if (Math.random() < 0.35) this.vfx.flake(x, y); }
    else this.vfx.droplet(x, y);
  }

  // ── Layers ──────────────────────────────────────────────────────────────

  /** Under the sprite: the shadow, and everything that flares out behind him. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const k = this.intensity;
    g.fillStyle(VAMP.black, a * 0.35);
    g.fillEllipse(x, y + 24, 54 * k, 14 * k);
    g.fillStyle(this.form === 'human' ? VAMP.crimsonDeep : VAMP.crimson, a * (this.mastered ? 0.28 : 0.18) * k);
    g.fillCircle(x, y, 30 * k);

    if (this.form === 'beast') {
      if (this.mastered) this.drawBatWings(g, x, y, alpha);
      else this.drawCape(g, x, y, alpha, -1, 1);
    } else if (this.form === 'hybrid') {
      this.drawCape(g, x, y, alpha, 0, 1);
    } else if (this.mastered) {
      this.drawQuiver(g, x, y, alpha);
      this.drawPelerine(g, x, y, alpha);
    }
  }

  /** A cape hung off the shoulders, scalloped at the hem like a bat's trailing edge. */
  private drawCape(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number, from: number, to: number): void {
    const lean = Phaser.Math.Clamp(((this.armX[0] + this.armX[1]) / 2 - x) * 0.4, -6, 6);
    const sway = Math.sin(this.t * 2.2) * 1.5;
    for (const side of [-1, 1]) {
      if (side < from || side > to || side === 0) continue;
      const outer = [
        [x + side * 12, y - 16],
        [x + side * 26, y - 6],
        [x + side * 32 - lean * 0.4, y + 14 + sway],
        [x + side * 30 - lean, y + 30],
        [x + side * 22 - lean, y + 26],
        [x + side * 16 - lean, y + 32],
        [x + side * 8 - lean, y + 27],
        [x - lean * 0.5, y + 31],
        [x, y - 6],
      ];
      g.fillStyle(VAMP.black, alpha);
      g.fillPoints(pts(outer), true);
      // Crimson lining showing at the inside edge.
      g.fillStyle(VAMP.crimson, alpha * 0.9);
      g.fillPoints(pts([
        [x + side * 14, y - 13], [x + side * 24, y - 4], [x + side * 29 - lean * 0.4, y + 14 + sway],
        [x + side * 27 - lean, y + 26], [x + side * 24, y + 10],
      ]), true);
      g.fillStyle(VAMP.coatLit, alpha * 0.8);
      g.fillPoints(pts([[x + side * 26, y - 6], [x + side * 31, y + 12], [x + side * 28, y + 12]]), true);
    }
  }

  /** Mastered vampire: the cape is gone and real wings have taken its place. */
  private drawBatWings(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const flap = Math.sin(this.t * 3.2) * 0.5 + 0.5;
    for (const side of [-1, 1]) {
      const sx = x + side * 12, sy = y - 10;
      const lift = flap * 8;
      // Wrist, then three fingers fanning out and down.
      const wrist = [sx + side * 22, sy - 14 - lift];
      const fingers = [
        [sx + side * 44, sy - 22 - lift * 1.4],
        [sx + side * 46, sy + 2 - lift * 0.8],
        [sx + side * 34, sy + 22 - lift * 0.3],
      ];
      const memb = [
        [sx, sy], wrist, fingers[0],
        [sx + side * 40, sy - 6 - lift], fingers[1],
        [sx + side * 34, sy + 10 - lift * 0.5], fingers[2],
        [sx + side * 20, sy + 18], [sx + side * 4, sy + 26],
      ];
      g.fillStyle(VAMP.black, alpha);
      g.fillPoints(pts(memb), true);
      g.fillStyle(VAMP.crimsonDeep, alpha * 0.85);
      g.fillPoints(pts([[sx + side * 4, sy + 2], wrist, fingers[1], [sx + side * 20, sy + 14]]), true);
      g.lineStyle(2, VAMP.coatLit, alpha);
      g.lineBetween(sx, sy, wrist[0], wrist[1]);
      g.lineStyle(1.3, VAMP.coatLit, alpha);
      for (const f of fingers) g.lineBetween(wrist[0], wrist[1], f[0], f[1]);
      // The thumb claw at the wrist.
      g.fillStyle(SKIN.pale, alpha);
      g.fillTriangle(wrist[0] - 1.5, wrist[1], wrist[0] + 1.5, wrist[1], wrist[0] + side * 2, wrist[1] - 5);
    }
  }

  /** Mastered hunter: a short shoulder cape that sticks out past the coat. */
  private drawPelerine(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const sway = Math.sin(this.t * 2) * 1;
    g.fillStyle(VAMP.black, alpha);
    g.fillPoints(pts([
      [x - 14, y - 14], [x - 30, y - 2], [x - 33, y + 10 + sway], [x - 22, y + 8],
      [x, y + 10], [x + 22, y + 8], [x + 33, y + 10 - sway], [x + 30, y - 2], [x + 14, y - 14],
    ]), true);
    g.fillStyle(VAMP.coatLit, alpha * 0.9);
    g.fillPoints(pts([[x - 15, y - 12], [x - 28, y - 1], [x - 30, y + 7], [x - 20, y + 4]]), true);
    g.lineStyle(1.4, VAMP.silver, alpha * 0.8);
    g.lineBetween(x - 33, y + 10 + sway, x - 22, y + 8);
    g.lineBetween(x + 33, y + 10 - sway, x + 22, y + 8);
  }

  /** Mastered hunter: a quiver of stakes on his back, the points rising past his shoulder. */
  private drawQuiver(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const qx = x + 14, qy = y - 12;
    for (let i = 0; i < 4; i++) {
      stake(g, qx - 4 + i * 4, qy - 14 - (i % 2) * 3, -Math.PI / 2 + 0.35, 20, 1.8, alpha);
    }
    g.fillStyle(SKIN.leather, alpha);
    g.fillPoints(pts([[qx - 9, qy - 6], [qx + 9, qy - 10], [qx + 14, qy + 8], [qx - 2, qy + 12]]), true);
    g.lineStyle(1.2, VAMP.silver, alpha * 0.9);
    g.lineBetween(qx - 9, qy - 6, qx + 9, qy - 10);
  }

  /** Over the sprite, under the eyes: torso, face, collars, garlic and stakes. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const form = this.form;
    const m = this.mastered;
    const hem = form === 'human' && m ? 28 : 24;

    // ── Coat / tailcoat ── tapered from the shoulders to a split hem.
    const coat = (dx: number, k: number) => pts([
      [x + dx - 19 * k, y - 15], [x + dx - 22 * k, y + 2], [x + dx - hem * k, y + 22],
      [x + dx - hem * 0.75 * k, y + 26], [x + dx - 3, y + 24], [x + dx, y + 19],
      [x + dx + 3, y + 24], [x + dx + hem * 0.75 * k, y + 26], [x + dx + hem * k, y + 22],
      [x + dx + 22 * k, y + 2], [x + dx + 19 * k, y - 15],
    ]);
    g.fillStyle(VAMP.black, alpha);
    g.fillPoints(coat(2, 1.04), true);
    g.fillStyle(VAMP.coat, alpha);
    g.fillPoints(coat(0, 1), true);
    g.fillStyle(VAMP.coatLit, alpha * 0.7);
    g.fillPoints(pts([[x - 17, y - 12], [x - 20, y + 2], [x - hem + 3, y + 21], [x - 13, y + 20], [x - 11, y]]), true);

    // ── Waistcoat / shirt front ──
    g.fillStyle(VAMP.crimson, alpha);
    g.fillPoints(pts([[x - 9, y + 4], [x + 9, y + 4], [x + 4, y + 20], [x, y + 22], [x - 4, y + 20]]), true);
    g.fillStyle(VAMP.crimsonLit, alpha * 0.6);
    g.fillPoints(pts([[x - 8, y + 5], [x - 2, y + 5], [x - 2, y + 19], [x - 4, y + 19]]), true);
    g.fillStyle(VAMP.silver, alpha);
    for (const by of [11, 15, 19]) g.fillCircle(x, y + by, 1);

    // ── Face ── the eyes sit on it.
    const vamp = form === 'beast';
    g.fillStyle(vamp ? SKIN.paleShade : SKIN.hunterShade, alpha);
    g.fillEllipse(x + 1, y - 2, 32, 26);
    g.fillStyle(vamp ? SKIN.pale : SKIN.hunter, alpha);
    g.fillEllipse(x, y - 3, 30, 24);
    if (form === 'hybrid') {
      // His right side has turned: pale skin, a hairline crack down the middle of the face.
      const half: number[][] = [];
      for (let i = 0; i <= 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI;
        half.push([x + Math.cos(a) * 15, y - 3 + Math.sin(a) * 12]);
      }
      half.push([x + 1, y + 6], [x - 1, y + 1], [x + 1, y - 6]);
      g.fillStyle(SKIN.pale, alpha);
      g.fillPoints(pts(half), true);
      g.lineStyle(0.9, VAMP.crimson, alpha * 0.8);
      g.beginPath(); g.moveTo(x + 1, y - 15); g.lineTo(x + 1, y - 6); g.lineTo(x - 1, y + 1); g.lineTo(x + 1, y + 6); g.lineTo(x, y + 9); g.strokePath();
    }
    // Cheek shadow on the shadow side.
    g.fillStyle(vamp ? SKIN.paleShade : SKIN.hunterShade, alpha * 0.5);
    g.fillEllipse(x + 10, y + 3, 7, 5);

    // Mouth.
    if (form === 'human') {
      g.lineStyle(1.3, 0x5a2a20, alpha);
      g.lineBetween(x - 4, y + 6.5, x + 4, y + 6);
      // Stubble.
      g.fillStyle(SKIN.hunterShade, alpha * 0.45);
      g.fillEllipse(x, y + 6.5, 16, 5);
    } else {
      const fangs = form === 'beast' ? [-1, 1] : [1];
      g.fillStyle(0x2a0410, alpha);
      g.fillEllipse(x + (form === 'hybrid' ? 2 : 0), y + 6, form === 'hybrid' ? 9 : 12, 3.4);
      for (const s of fangs) {
        const fx = x + s * 3;
        g.fillStyle(VAMP.white, alpha);
        g.fillTriangle(fx - 1.4, y + 6, fx + 1.4, y + 6, fx, y + 10.5);
      }
      // Blood running off the fang.
      const drip = (this.t * 0.6) % 1;
      g.fillStyle(VAMP.blood, alpha);
      g.fillRect(x + 2.6, y + 9, 1, 2 + drip * 4);
      g.fillCircle(x + 3.1, y + 11 + drip * 4, 1.1);
    }

    // ── Collars ──
    if (form !== 'human') this.drawBatCollar(g, x, y, alpha, form === 'beast' ? [-1, 1] : [1]);
    if (form !== 'beast') {
      for (const s of form === 'hybrid' ? [-1] : [-1, 1]) {
        g.fillStyle(VAMP.coat, alpha);
        g.fillPoints(pts([[x + s * 9, y + 8], [x + s * 18, y - 6], [x + s * 22, y + 4], [x + s * 15, y + 14]]), true);
        g.fillStyle(VAMP.crimsonDeep, alpha);
        g.fillPoints(pts([[x + s * 10, y + 8], [x + s * 17, y - 3], [x + s * 18, y + 4]]), true);
      }
    }

    if (form === 'beast') {
      // Jabot of white lace at the throat and a ruby brooch on it.
      g.fillStyle(VAMP.garlic, alpha);
      g.fillPoints(pts([[x - 5, y + 9], [x + 5, y + 9], [x + 6, y + 13], [x + 3, y + 17], [x, y + 15], [x - 3, y + 17], [x - 6, y + 13]]), true);
      g.lineStyle(0.8, VAMP.garlicShade, alpha);
      g.lineBetween(x - 4, y + 13, x + 4, y + 13);
      g.fillStyle(VAMP.blood, alpha);
      g.fillCircle(x, y + 10.5, 2.3);
      g.fillStyle(VAMP.bloodLit, alpha);
      g.fillCircle(x - 0.6, y + 10, 1);
      if (m) {
        // A silver chain across the chest.
        g.lineStyle(1, VAMP.silver, alpha * 0.9);
        g.beginPath(); g.arc(x, y + 6, 14, Math.PI * 0.2, Math.PI * 0.8); g.strokePath();
      }
      return;
    }

    // ── Hunter's kit ──
    this.drawBandolier(g, x, y, alpha);
    // Belt with a silver buckle.
    g.fillStyle(SKIN.leather, alpha);
    g.fillRect(x - 21, y + 15, 42, 4);
    g.fillStyle(VAMP.silver, alpha);
    g.fillRect(x - 3, y + 14.5, 6, 5);
    g.fillStyle(SKIN.leather, alpha);
    g.fillRect(x - 1.5, y + 16, 3, 2);

    this.drawGarlicString(g, x, y, alpha, form === 'hybrid');

    if (form === 'human' && m) {
      // Silver crucifix hung below the garlic.
      g.fillStyle(VAMP.silverDim, alpha);
      g.fillRect(x - 1.4 + 0.6, y + 13, 2.8, 10);
      g.fillStyle(VAMP.silverLit, alpha);
      g.fillRect(x - 1.4, y + 12.5, 2.8, 10);
      g.fillRect(x - 4, y + 15, 8, 2.6);
    }
  }

  /** A diagonal strap across the coat, stakes slotted in it, points up. */
  private drawBandolier(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const ax = x - 20, ay = y + 2, bx = x + 18, by = y + 22;
    for (let i = 0; i < 4; i++) {
      const u = 0.18 + i * 0.2;
      const sx = ax + (bx - ax) * u, sy = ay + (by - ay) * u;
      stake(g, sx + 2, sy - 4, -Math.PI / 2 - 0.5, 13, 1.5, alpha);
    }
    g.lineStyle(4.4, VAMP.black, alpha);
    g.lineBetween(ax, ay, bx, by);
    g.lineStyle(3, SKIN.leather, alpha);
    g.lineBetween(ax, ay, bx, by);
    g.lineStyle(0.9, SKIN.leatherLit, alpha);
    g.lineBetween(ax, ay - 1, bx, by - 1);
  }

  /** The string of garlic round his neck. Half-turned, the string has snapped. */
  private drawGarlicString(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number, broken: boolean): void {
    const sway = Math.sin(this.t * 2.4) * 0.8;
    g.lineStyle(1.1, VAMP.garlicShade, alpha);
    g.beginPath();
    if (broken) {
      g.arc(x, y + 1, 14, Math.PI * 0.62, Math.PI * 0.9);
      g.strokePath();
      g.lineBetween(x - 6.5, y + 13.5, x - 7 + sway, y + 17);
      garlicBulb(g, x - 7 + sway, y + 20, 3.3, alpha);
      return;
    }
    g.arc(x, y + 1, 14, Math.PI * 0.15, Math.PI * 0.85);
    g.strokePath();
    for (const [u, r] of [[0.3, 2.9], [0.5, 3.4], [0.7, 2.9]] as const) {
      const a = Math.PI * u;
      garlicBulb(g, x + Math.cos(a) * 14 + sway, y + 1 + Math.sin(a) * 14 + 2.5, r, alpha);
    }
  }

  /** The vampire's high collar: three scalloped points per side, crimson inside. */
  private drawBatCollar(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number, sides: number[]): void {
    for (const s of sides) {
      const outer = pts([
        [x + s * 10, y + 9], [x + s * 15, y - 2], [x + s * 22, y - 22], [x + s * 22, y - 12],
        [x + s * 27, y - 17], [x + s * 25, y - 6], [x + s * 30, y - 8], [x + s * 23, y + 8],
      ]);
      g.fillStyle(VAMP.black, alpha);
      g.fillPoints(outer, true);
      g.fillStyle(VAMP.crimson, alpha);
      g.fillPoints(pts([[x + s * 13, y + 6], [x + s * 17, y - 3], [x + s * 21, y - 16], [x + s * 21, y - 5], [x + s * 20, y + 6]]), true);
    }
  }

  /** Over everything: hat or hair, the weapon, and the claws. All rooted at or above the crown. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const want = this.form === 'human' ? 0 : this.form === 'hybrid' ? 0.55 : 1;
    this.beastness += (want - this.beastness) * 0.12;
    const m = this.mastered;
    const lean = Math.cos(this.facing) * 2;

    if (this.form === 'beast') this.drawHair(g, x + lean * 0.5, y, alpha);
    else this.drawHat(g, x + lean, y, alpha, this.form === 'human' && m, this.form === 'hybrid');

    // ── The weapon in his fists ──
    const held = this.heldWeapon();
    if (held && this.form !== 'beast') {
      const w = this.weaponAnchor(x, y);
      const ws = (m ? 1.12 : 1) * this.intensity;
      if (held === 'crossbow') {
        drawCrossbow(g, vampTint, HUNTER_TONES, w.x, w.y, this.facing, 0.9 * ws, this.load, this.recoil, alpha);
      } else {
        drawShotgun(g, vampTint, SILVER_TONES, w.x, w.y, this.facing, 0.82 * ws, this.pump, this.recoil, this.shells, alpha);
      }
      g.lineStyle(3.4 * ws, SKIN.leather, 0.6 * alpha);
      for (let i = 0; i < 2; i++) g.lineBetween(this.armX[i], this.armY[i], w.x, w.y);
    }

    // ── Claws ── long pale nails once he has turned.
    if (this.form !== 'human') {
      const reach = this.form === 'beast' ? 1 : 0.55;
      for (let i = 0; i < 2; i++) {
        if (this.form === 'hybrid' && i === 0) continue;
        const out = Math.atan2(this.armY[i] - y, this.armX[i] - x);
        drawClaws(g, vampTint, BEAST_TONES, this.armX[i], this.armY[i], out, reach * (m ? 1.1 : 1) * this.intensity, alpha);
      }
    }

    // Mastered vampire: beads of blood orbiting above him.
    if (this.form === 'beast' && m) {
      for (let i = 0; i < 4; i++) {
        const a = this.t * 1.6 + (i / 4) * Math.PI * 2;
        const bx = x + Math.cos(a) * 30, by = y - 26 + Math.sin(a) * 8;
        g.fillStyle(VAMP.crimson, alpha * 0.35);
        g.fillCircle(bx, by, 4.2);
        g.fillStyle(VAMP.blood, alpha);
        g.fillCircle(bx, by, 2.4);
        g.fillStyle(VAMP.bloodLit, alpha);
        g.fillCircle(bx - 0.8, by - 0.8, 0.9);
      }
    }
  }

  /** Hunter's hat: wide flat brim. Mastered, a tall capotain. Half-turned, bitten and askew. */
  private drawHat(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number, tall: boolean, torn: boolean): void {
    const brimY = y - 18.5;
    const tilt = torn ? 2.5 : 0;
    const crownTop = tall ? brimY - 24 : brimY - 13;
    const crownHalfTop = tall ? 8.5 : 11;
    const brimW = tall ? 50 : 56;
    // Brim (shadow, body, lit rim). Kept above y-14 so it never covers the eyes.
    g.fillStyle(VAMP.black, alpha);
    g.fillEllipse(x, brimY + 1, brimW + 2, 9.5);
    g.fillStyle(VAMP.coat, alpha);
    g.fillEllipse(x, brimY, brimW, 8);
    g.fillStyle(VAMP.coatLit, alpha * 0.9);
    g.fillEllipse(x - 3, brimY - 1.4, brimW * 0.8, 3.4);
    // Crown: tapered, slightly rounded top.
    const crown = pts([
      [x - 13 + tilt, brimY - 1], [x - crownHalfTop + tilt * 2, crownTop + 2], [x - crownHalfTop + 2 + tilt * 2, crownTop],
      [x + crownHalfTop - 2 + tilt * 2, crownTop], [x + crownHalfTop + tilt * 2, crownTop + 2], [x + 13 + tilt, brimY - 1],
    ]);
    g.fillStyle(VAMP.coat, alpha);
    g.fillPoints(crown, true);
    g.fillStyle(VAMP.coatLit, alpha * 0.7);
    g.fillPoints(pts([[x - 12 + tilt, brimY - 1], [x - crownHalfTop + 1 + tilt * 2, crownTop + 2], [x - crownHalfTop + 5 + tilt * 2, crownTop + 1], [x - 7 + tilt, brimY - 1]]), true);
    // Crimson band with a silver buckle.
    g.fillStyle(VAMP.crimson, alpha);
    g.fillPoints(pts([[x - 13 + tilt, brimY - 1], [x - 12.4 + tilt * 1.2, brimY - 5], [x + 12.4 + tilt * 1.2, brimY - 5], [x + 13 + tilt, brimY - 1]]), true);
    g.lineStyle(1.3, VAMP.silver, alpha);
    g.strokeRect(x - 3 + tilt, brimY - 5, 6, 4);
    if (tall) {
      // A sprig of garlic flowers tucked in the band.
      g.lineStyle(1, VAMP.garlicDeep, alpha);
      g.lineBetween(x + 10, brimY - 3, x + 15, brimY - 14);
      garlicBulb(g, x + 15.5, brimY - 15, 2.6, alpha, 0.4);
    }
  }

  /** The vampire's slicked hair with its widow's peak, kept above the eyes. */
  private drawHair(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const top = y - 22;
    const hair = pts([
      [x - 16, y - 13.5], [x - 17, y - 18], [x - 12, top - 2], [x - 4, top - 4], [x + 4, top - 4],
      [x + 12, top - 2], [x + 17, y - 18], [x + 16, y - 13.5], [x + 9, y - 15], [x + 3, y - 14],
      [x, y - 11.5], [x - 3, y - 14], [x - 9, y - 15],
    ]);
    g.fillStyle(SKIN.hair, alpha);
    g.fillPoints(hair, true);
    g.lineStyle(1.2, SKIN.hairLit, alpha);
    g.beginPath(); g.arc(x - 2, y - 12, 10, Math.PI * 1.15, Math.PI * 1.55); g.strokePath();
    g.beginPath(); g.arc(x + 3, y - 12, 9, Math.PI * 1.5, Math.PI * 1.8); g.strokePath();
    if (this.mastered) {
      // A thin silver circlet with a blood-ruby.
      g.lineStyle(1.4, VAMP.silver, alpha);
      g.beginPath(); g.arc(x, y - 6, 15, Math.PI * 1.25, Math.PI * 1.75); g.strokePath();
      g.fillStyle(VAMP.blood, alpha);
      g.fillCircle(x, y - 21.5, 2);
      g.fillStyle(VAMP.bloodLit, alpha);
      g.fillCircle(x - 0.5, y - 22, 0.8);
    }
  }
}
