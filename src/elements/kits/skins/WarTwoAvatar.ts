import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn } from '../ElementVisuals';
import { WW, WarTwoFx, rifle } from './WarTwoFx';

/**
 * The WW2 skin's character: Conquest's crimson commander replaced by a soldier of 1944.
 *
 * **Unmastered — the rifleman.** An M1 helmet with netting and a sprig of foliage, a face under
 * the brim, an olive drab field jacket with webbing suspenders, a cartridge belt of pouches and a
 * canteen, khaki trousers and leather boots, and a bayoneted rifle held at the ready along the
 * aim. A shoulder patch carries the territory read the old standard used to: the town colour he
 * is standing in, or the Banner Bearer form he is carrying.
 *
 * **Mastered — the officer.** A different silhouette top and bottom: the dome becomes a wide,
 * flat-crowned peaked cap with a black visor and a brass eagle; the field jacket becomes a long
 * double-breasted greatcoat whose skirt flares past the sprite with a centre vent, brass shoulder
 * boards, a Sam Browne belt, a ribbon bar and binoculars. He carries no rifle — a holstered
 * sidearm — and his gloves go to black leather.
 *
 * Built with the identity colour mapper like every skin rig; the palette below is final.
 */

const SPEC: AvatarSpec = {
  hands: [
    { r: 9, color: WW.od, alpha: 0.18 },
    { r: 6.6, color: WW.leatherDark, alpha: 1 },
    { r: 4.6, color: WW.khakiShade, alpha: 1 },
    { r: 1.7, color: WW.khakiLit, alpha: 0.9, ox: -1.6, oy: -1.8 },
  ],
  eyeWhite: WW.white,
  eyePupil: 0x1d1a12,
  squash: { div: 15, x: 0.4, y: 0.22 },
};

type Pt = Phaser.Geom.Point;
const P = (x: number, y: number): Pt => new Phaser.Geom.Point(x, y);

export class WarTwoAvatar extends BaseAvatar {
  /** Territory colour underfoot (0 = neutral) and Banner Bearer's form — both shown on the patch. */
  private standing = 0;
  private bannerColor = 0;
  private towns = 1;

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, SPEC);
  }

  /** Same readouts ConquestAvatar takes, so the kit can drive either rig. */
  setStanding(color: number): void { this.standing = color; }
  setTowns(n: number): void { this.towns = n; }
  setBanner(color: number): void { this.bannerColor = color; }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(1, (a) => a.setFillStyle(on ? WW.black : WW.leatherDark, 1));
    this.forEachHandLayer(2, (a) => a.setFillStyle(on ? 0x2a2620 : WW.khakiShade, 1));
    this.forEachHandLayer(3, (a) => a.setFillStyle(on ? 0x8a8478 : WW.khakiLit, 0.9));
  }

  protected emitTrail(x: number, y: number): void {
    new WarTwoFx(this.scene).dust(x, y + 6, 4);
  }

  /** The rifle at the ready, butt by the hip, along the aim and offset to the right shoulder. */
  private drawRifle(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const ca = Math.cos(this.facing), sa = Math.sin(this.facing);
    const side = ca >= 0 ? 1 : -1;
    const px = -sa * side, py = ca * side;
    const bx = x - ca * 12 + px * 9, by = Math.max(y + 4, y + 7 - sa * 6 + py * 9);
    rifle(g, bx, by, this.facing, 32, 11, alpha, 1.05);
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    g.fillStyle(0x000000, alpha * 0.22);
    g.fillEllipse(x, y + 24, this.mastered ? 50 : 42, 10);
    // Held ground: a faint ring in the colour of the territory underfoot, as Conquest's rig does.
    if (this.standing !== 0) {
      g.lineStyle(1.4, this.standing, a * 0.35);
      g.strokeEllipse(x, y + 14, 54 + Math.sin(this.t * 2.4) * 3, 18);
    }
    // Aiming up the screen: the rifle goes behind him so the body occludes it.
    if (!this.mastered && Math.sin(this.facing) < -0.3) this.drawRifle(g, x, y, alpha);
  }

  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    if (this.mastered) this.drawOfficer(g, x, y, alpha);
    else this.drawRifleman(g, x, y, alpha);
    if (!this.mastered && Math.sin(this.facing) >= -0.3) this.drawRifle(g, x, y, alpha);
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    if (this.mastered) return;
    // A sprig of foliage tucked in the helmet net, above the crown.
    const lean = Phaser.Math.Clamp((this.armX[0] + this.armX[1]) / 2 - x, -10, 10) * -0.12;
    const bx = x + 7, by = y - 24;
    for (let i = 0; i < 3; i++) {
      const ang = -Math.PI / 2 + (i - 1) * 0.55 + lean * 0.1 + Math.sin(this.t * 2 + i) * 0.06;
      const len = 7 - Math.abs(i - 1) * 1.5;
      const tx = bx + Math.cos(ang) * len, ty = by + Math.sin(ang) * len;
      const nx = -Math.sin(ang) * 1.6, ny = Math.cos(ang) * 1.6;
      g.fillStyle(i === 1 ? WW.odLit : WW.od, alpha);
      g.fillPoints([P(bx, by), P((bx + tx) / 2 + nx, (by + ty) / 2 + ny), P(tx, ty), P((bx + tx) / 2 - nx, (by + ty) / 2 - ny)], true);
    }
  }

  // ── The face, shared ────────────────────────────────────────────────────

  /** A face under the brim — the eyes sit on it at y-4. */
  private face(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number, moustache: boolean): void {
    g.fillStyle(WW.fleshShade, alpha);
    g.fillEllipse(x, y - 3.5, 28, 21);
    g.fillStyle(WW.flesh, alpha);
    g.fillEllipse(x - 0.6, y - 4.2, 25.5, 18.5);
    // Shadow of the brim across the brow.
    g.fillStyle(0x000000, alpha * 0.16);
    g.fillEllipse(x, y - 11.5, 25, 5);
    // Nose and mouth.
    const lx = Math.cos(this.facing) * 1.4;
    g.fillStyle(WW.fleshShade, alpha);
    g.fillEllipse(x + lx, y + 1.2, 3.2, 2.4);
    if (moustache) {
      g.fillStyle(WW.leatherDark, alpha);
      g.fillPoints([P(x + lx - 4.6, y + 3.6), P(x + lx, y + 2.6), P(x + lx + 4.6, y + 3.6), P(x + lx, y + 4.2)], true);
    } else {
      g.lineStyle(1, WW.leatherDark, alpha * 0.8);
      g.lineBetween(x + lx - 2.6, y + 4.4, x + lx + 2.6, y + 4.2);
    }
  }

  /** The territory patch on a sleeve: Banner Bearer's form, else the ground underfoot. */
  private patch(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const c = this.bannerColor || this.standing;
    if (!c) return;
    g.fillStyle(0x000000, alpha * 0.4);
    g.fillRoundedRect(x - 3.4, y - 3, 6.8, 6.4, 1.6);
    g.fillStyle(c, alpha);
    g.fillRoundedRect(x - 2.8, y - 2.5, 5.6, 5.4, 1.3);
    if (this.towns > 1) {
      g.lineStyle(1, WW.brass, alpha);
      g.lineBetween(x - 2.4, y + 0.2, x + 2.4, y + 0.2);
    }
  }

  // ── Rifleman ────────────────────────────────────────────────────────────

  private drawRifleman(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const step = Math.sin(this.t * 6);
    // Trousers and boots under the jacket hem.
    for (const side of [-1, 1]) {
      const lx = x + side * 7.5;
      g.fillStyle(WW.khakiShade, alpha);
      g.fillRect(lx - 5, y + 14, 10, 7);
      g.fillStyle(WW.leatherDark, alpha);
      g.fillEllipse(lx + side * 0.8, y + 22.5 + (side > 0 ? step : -step) * 0.6, 12.5, 6.5);
      g.fillStyle(WW.leather, alpha);
      g.fillEllipse(lx + side * 0.4, y + 21.8 + (side > 0 ? step : -step) * 0.6, 10, 4.2);
      // Canvas leggings laced over the boot tops.
      g.fillStyle(WW.khaki, alpha);
      g.fillRect(lx - 4.6, y + 16.5, 9.2, 3.4);
      g.lineStyle(0.6, WW.khakiShade, alpha);
      g.lineBetween(lx - 1, y + 16.6, lx - 1, y + 19.8);
    }

    // Field jacket: broad shoulders, tapering to the hips.
    const jacket = [
      P(x - 12, y - 13), P(x - 21, y - 9), P(x - 23.5, y - 1), P(x - 21.5, y + 9), P(x - 18, y + 18),
      P(x + 18, y + 18), P(x + 21.5, y + 9), P(x + 23.5, y - 1), P(x + 21, y - 9), P(x + 12, y - 13),
    ];
    g.fillStyle(WW.odDeep, alpha);
    g.fillPoints(jacket.map((q) => P(q.x + (q.x < x ? -1 : 1), q.y + (q.y > y ? 1 : -1))), true);
    g.fillStyle(WW.od, alpha);
    g.fillPoints(jacket, true);
    // Lit left front, shaded right side.
    g.fillStyle(WW.odLit, alpha * 0.85);
    g.fillPoints([P(x - 21, y - 9), P(x - 12, y - 13), P(x - 8, y + 18), P(x - 18, y + 18), P(x - 21.5, y + 9), P(x - 23.5, y - 1)], true);
    g.fillStyle(WW.odShade, alpha * 0.8);
    g.fillPoints([P(x + 23.5, y - 1), P(x + 21, y - 9), P(x + 17, y - 10), P(x + 15, y + 18), P(x + 18, y + 18), P(x + 21.5, y + 9)], true);
    // Placket and buttons.
    g.lineStyle(0.9, WW.odDeep, alpha * 0.9);
    g.lineBetween(x + 1.5, y + 5, x + 1.5, y + 17);
    for (let i = 0; i < 2; i++) {
      g.fillStyle(WW.odDeep, alpha);
      g.fillCircle(x + 3.4, y + 7.5 + i * 4.5, 0.9);
    }
    // Chest pockets with flaps.
    for (const side of [-1, 1]) {
      const cx = x + side * 9.5;
      g.fillStyle(WW.odShade, alpha);
      g.fillRect(cx - 3.6, y + 5.5, 7.2, 5.4);
      g.fillStyle(WW.odLit, alpha);
      g.fillRect(cx - 3.8, y + 5, 7.6, 1.8);
    }

    this.face(g, x, y, alpha, false);
    // Collar points either side of the chin.
    for (const side of [-1, 1]) {
      g.fillStyle(WW.odLit, alpha);
      g.fillTriangle(x + side * 3, y + 5.2, x + side * 11, y + 3.4, x + side * 6.6, y + 9.4);
      g.lineStyle(0.6, WW.odDeep, alpha * 0.8);
      g.lineBetween(x + side * 3, y + 5.2, x + side * 6.6, y + 9.4);
    }

    // Webbing suspenders down to the cartridge belt.
    for (const side of [-1, 1]) {
      g.lineStyle(3, WW.khakiShade, alpha);
      g.lineBetween(x + side * 17, y - 5, x + side * 8, y + 13);
      g.lineStyle(1.6, WW.khaki, alpha);
      g.lineBetween(x + side * 17, y - 5, x + side * 8, y + 13);
      g.fillStyle(WW.brass, alpha);
      g.fillCircle(x + side * 12.6, y + 4, 0.9);
    }
    // Cartridge belt with pouches and a brass buckle.
    g.fillStyle(WW.khakiShade, alpha);
    g.fillRect(x - 20, y + 11.5, 40, 5);
    g.fillStyle(WW.khaki, alpha);
    g.fillRect(x - 20, y + 12, 40, 3.6);
    for (const px of [-15.5, -9.5, 9.5, 15.5]) {
      g.fillStyle(WW.khakiShade, alpha);
      g.fillRoundedRect(x + px - 2.8, y + 11, 5.6, 6.4, 1);
      g.fillStyle(WW.khakiLit, alpha);
      g.fillRect(x + px - 2.8, y + 11, 5.6, 1.6);
      g.fillStyle(WW.brass, alpha);
      g.fillCircle(x + px, y + 13.4, 0.6);
    }
    g.fillStyle(WW.brassDeep, alpha);
    g.fillRect(x - 2.6, y + 11.6, 5.2, 4.6);
    g.fillStyle(WW.brass, alpha);
    g.fillRect(x - 2, y + 12.1, 4, 3.6);
    // Canteen on the hip.
    const cs = Math.cos(this.facing) >= 0 ? -1 : 1;
    g.fillStyle(WW.odDeep, alpha);
    g.fillEllipse(x + cs * 20.5, y + 17, 8, 9.5);
    g.fillStyle(WW.odShade, alpha);
    g.fillEllipse(x + cs * 20.5, y + 16.6, 6.6, 8);
    g.fillStyle(WW.gun, alpha);
    g.fillRect(x + cs * 20.5 - 1.2, y + 11.4, 2.4, 1.8);

    this.patch(g, x - 20.5, y - 4, alpha);
    this.helmet(g, x, y, alpha);
  }

  /** The M1: a netted olive dome, a flared brim above the eyes, chinstraps to the jaw. */
  private helmet(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const hx = x + Math.cos(this.facing) * 1;
    const brimY = y - 13;
    // Chinstraps, under the helmet, down the cheeks to the jaw.
    g.lineStyle(1.2, WW.khakiShade, alpha);
    g.lineBetween(hx - 15.5, brimY + 1, x - 11, y + 4);
    g.lineBetween(hx + 15.5, brimY + 1, x + 11, y + 4);
    // Brim.
    g.fillStyle(WW.odDeep, alpha);
    g.fillEllipse(hx, brimY, 46, 7.6);
    g.fillStyle(WW.odShade, alpha);
    g.fillEllipse(hx, brimY - 0.4, 43.5, 5.6);
    // Dome.
    const dome = (r: number, h: number, dy: number): Pt[] => {
      const pts: Pt[] = [];
      for (let i = 0; i <= 18; i++) {
        const a = Math.PI + (i / 18) * Math.PI;
        pts.push(P(hx + Math.cos(a) * r, brimY + dy + Math.sin(a) * h));
      }
      return pts;
    };
    g.fillStyle(WW.odDeep, alpha);
    g.fillPoints(dome(19.6, 15.6, 0.4), true);
    g.fillStyle(WW.od, alpha);
    g.fillPoints(dome(18.4, 14.4, 0), true);
    g.fillStyle(WW.odLit, alpha);
    g.fillPoints([...dome(13, 11, -1).slice(2, 10), P(hx - 3, brimY - 2)], true);
    // Netting: a diamond lattice clipped inside the dome.
    g.lineStyle(0.6, WW.odDeep, alpha * 0.55);
    for (let i = -3; i <= 3; i++) {
      const x0 = hx + i * 6;
      const top0 = brimY - Math.sqrt(Math.max(0, 1 - ((x0 - hx) / 18.4) ** 2)) * 14.4 + 1;
      const x1 = x0 + 5;
      const top1 = brimY - Math.sqrt(Math.max(0, 1 - ((x1 - hx) / 18.4) ** 2)) * 14.4 + 1;
      if (Math.abs(x0 - hx) < 17 && Math.abs(x1 - hx) < 17) {
        g.lineBetween(x0, top0, x1, brimY - 1.5);
        g.lineBetween(x1, top1, x0, brimY - 1.5);
      }
    }
    // Glint.
    g.fillStyle(0xffffff, alpha * 0.4);
    g.fillEllipse(hx - 7, brimY - 9.5, 5, 2.4);
    // Rim band where the brim meets the dome.
    g.lineStyle(1, WW.odDeep, alpha * 0.8);
    g.beginPath();
    g.arc(hx, brimY + 12, 23.4, Math.PI * 1.27, Math.PI * 1.73, false);
    g.strokePath();
  }

  // ── Officer ─────────────────────────────────────────────────────────────

  private drawOfficer(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const sway = Math.sin(this.t * 1.8) * 1.2 - Math.cos(this.facing) * 1.4;
    const coat = 0x5d5a36, coatShade = 0x3b3921, coatLit = 0x7b7848, coatDeep = 0x24230f;

    // Boots under the hem.
    for (const side of [-1, 1]) {
      g.fillStyle(WW.black, alpha);
      g.fillEllipse(x + side * 7 + sway * 0.3, y + 27, 11, 5.5);
      g.fillStyle(0x3a352c, alpha);
      g.fillEllipse(x + side * 7 + sway * 0.3, y + 26.2, 8, 2.6);
    }

    // The greatcoat: wide at the shoulders, belted, its skirt flaring out past the sprite.
    const greatcoat = [
      P(x - 12, y - 13), P(x - 23, y - 10), P(x - 25.5, y - 1), P(x - 22, y + 11),
      P(x - 27 + sway, y + 26), P(x - 2 + sway, y + 27), P(x + 0 + sway, y + 21), P(x + 2 + sway, y + 27),
      P(x + 27 + sway, y + 26), P(x + 22, y + 11), P(x + 25.5, y - 1), P(x + 23, y - 10), P(x + 12, y - 13),
    ];
    g.fillStyle(coatDeep, alpha);
    g.fillPoints(greatcoat.map((q) => P(q.x + (q.x < x ? -1 : 1), q.y + (q.y > y ? 1 : -1))), true);
    g.fillStyle(coat, alpha);
    g.fillPoints(greatcoat, true);
    g.fillStyle(coatLit, alpha * 0.8);
    g.fillPoints([P(x - 23, y - 10), P(x - 12, y - 13), P(x - 7, y + 12), P(x - 10 + sway, y + 26.5), P(x - 27 + sway, y + 26), P(x - 22, y + 11), P(x - 25.5, y - 1)], true);
    g.fillStyle(coatShade, alpha * 0.85);
    g.fillPoints([P(x + 25.5, y - 1), P(x + 23, y - 10), P(x + 18, y - 11), P(x + 15 + sway, y + 26.5), P(x + 27 + sway, y + 26), P(x + 22, y + 11)], true);
    // Skirt folds.
    g.lineStyle(0.9, coatDeep, alpha * 0.7);
    for (const fx of [-15, -7, 8, 16]) g.lineBetween(x + fx * 0.85, y + 15, x + fx + sway, y + 25.5);

    this.face(g, x, y, alpha, true);

    // Wide lapels opening down to the belt, with the shirt and tie showing between them.
    g.fillStyle(0xb8a77a, alpha);
    g.fillTriangle(x - 5, y + 4.5, x + 5, y + 4.5, x, y + 12);
    g.fillStyle(0x4a3a24, alpha);
    g.fillTriangle(x - 1.2, y + 5, x + 1.2, y + 5, x, y + 11.5);
    for (const side of [-1, 1]) {
      g.fillStyle(coatLit, alpha);
      g.fillPoints([P(x + side * 4.5, y + 4), P(x + side * 13, y + 2.5), P(x + side * 11, y + 7), P(x + side * 7.5, y + 6.8), P(x + side * 1, y + 13)], true);
      g.lineStyle(0.7, coatDeep, alpha * 0.9);
      g.strokePoints([P(x + side * 4.5, y + 4), P(x + side * 13, y + 2.5), P(x + side * 11, y + 7), P(x + side * 7.5, y + 6.8), P(x + side * 1, y + 13)], false);
    }
    // Double row of brass buttons.
    for (let i = 0; i < 3; i++) {
      for (const side of [-1, 1]) {
        const bx = x + side * 6.5, by = y + 15 + i * 4;
        g.fillStyle(WW.brassDeep, alpha);
        g.fillCircle(bx, by, 1.4);
        g.fillStyle(WW.brassLit, alpha);
        g.fillCircle(bx - 0.4, by - 0.4, 0.6);
      }
    }
    // Ribbon bar on the left breast.
    const ribbons = [0xb8322a, 0x3a6ad8, 0xe8c23a, 0x2a7a3a];
    for (let i = 0; i < ribbons.length; i++) {
      g.fillStyle(ribbons[i], alpha);
      g.fillRect(x - 17 + i * 2.6, y + 6, 2.6, 2.4);
    }
    g.lineStyle(0.5, WW.black, alpha * 0.6);
    g.strokeRect(x - 17, y + 6, ribbons.length * 2.6, 2.4);

    // Sam Browne: the cross strap and the belt with its buckle.
    g.lineStyle(3, WW.leatherDark, alpha);
    g.lineBetween(x + 17, y - 8, x - 12, y + 14);
    g.lineStyle(1.6, WW.leather, alpha);
    g.lineBetween(x + 17, y - 8, x - 12, y + 14);
    g.fillStyle(WW.leatherDark, alpha);
    g.fillRect(x - 22, y + 12.5, 44, 4.6);
    g.fillStyle(WW.leather, alpha);
    g.fillRect(x - 22, y + 13, 44, 3.2);
    g.fillStyle(WW.leatherLit, alpha * 0.7);
    g.fillRect(x - 22, y + 13, 44, 0.9);
    g.lineStyle(1.2, WW.brass, alpha);
    g.strokeRect(x - 3, y + 12.4, 6, 4.8);
    // Holster on the hip.
    const hs = Math.cos(this.facing) >= 0 ? 1 : -1;
    g.fillStyle(WW.leatherDark, alpha);
    g.fillRoundedRect(x + hs * 18 - 3.6, y + 14.5, 7.2, 9.5, 2);
    g.fillStyle(WW.leather, alpha);
    g.fillRoundedRect(x + hs * 18 - 2.8, y + 14.8, 5.6, 4, 1.4);
    g.fillStyle(WW.brass, alpha);
    g.fillCircle(x + hs * 18, y + 17.6, 0.7);
    // Binoculars on their strap, hanging opposite the holster.
    const bx = x - hs * 11, by = y + 20;
    g.lineStyle(0.8, WW.leatherDark, alpha);
    g.lineBetween(bx - 2.4, by - 2, x - hs * 4, y + 9);
    for (const o of [-1.8, 1.8]) {
      g.fillStyle(WW.black, alpha);
      g.fillRoundedRect(bx + o - 1.7, by - 2.8, 3.4, 6, 1.2);
      g.fillStyle(0x4a4a44, alpha);
      g.fillRect(bx + o - 1.1, by - 2.4, 1, 4.6);
    }

    // Shoulder boards: brass-edged, with two pips.
    for (const side of [-1, 1]) {
      const ex = x + side * 18.5, ey = y - 10.5;
      g.fillStyle(coatDeep, alpha);
      g.fillPoints([P(ex - side * 6, ey - 1.6), P(ex + side * 4.6, ey - 1), P(ex + side * 5.4, ey + 2.4), P(ex - side * 6, ey + 2.6)], true);
      g.fillStyle(coatLit, alpha);
      g.fillPoints([P(ex - side * 5.4, ey - 1), P(ex + side * 4, ey - 0.5), P(ex + side * 4.6, ey + 1.8), P(ex - side * 5.4, ey + 2)], true);
      g.fillStyle(WW.brassLit, alpha);
      g.fillCircle(ex - side * 2.6, ey + 0.5, 0.9);
      g.fillCircle(ex + side * 0.6, ey + 0.5, 0.9);
    }

    this.patch(g, x - 22.5, y - 3, alpha);
    this.peakedCap(g, x, y, alpha);
  }

  /**
   * The peaked cap: the silhouette change at the crown. A wide, flat, slightly saddled top over a
   * dark band with a brass chin cord, a black visor jutting over the eyes, and a brass eagle.
   */
  private peakedCap(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const hx = x + Math.cos(this.facing) * 1.2;
    const capCol = 0x535432, capLit = 0x6f7044, capDeep = 0x262614;
    // Body of the cap: a trapezoid flaring up from the band to the crown.
    const body = [P(hx - 16, y - 13), P(hx - 21, y - 21), P(hx + 21, y - 21), P(hx + 16, y - 13)];
    g.fillStyle(capDeep, alpha);
    g.fillPoints(body.map((q) => P(q.x + (q.x < hx ? -1 : 1), q.y)), true);
    g.fillStyle(capCol, alpha);
    g.fillPoints(body, true);
    // The crown top: a wide ellipse, saddled up at the front.
    g.fillStyle(capDeep, alpha);
    g.fillEllipse(hx, y - 21.5, 46, 11);
    g.fillStyle(capLit, alpha);
    g.fillEllipse(hx, y - 22, 43.5, 9);
    g.fillStyle(light(capLit, 0.15), alpha);
    g.fillEllipse(hx - 6, y - 23, 22, 4.4);
    g.fillStyle(capCol, alpha);
    g.fillPoints([P(hx - 12, y - 19.5), P(hx, y - 24.5), P(hx + 12, y - 19.5)], true);
    // Band and chin cord.
    g.fillStyle(0x2c2418, alpha);
    g.fillRect(hx - 16.6, y - 17, 33.2, 4.4);
    g.lineStyle(1, WW.brass, alpha);
    g.lineBetween(hx - 15, y - 13.8, hx + 15, y - 13.8);
    g.fillStyle(WW.brassLit, alpha);
    g.fillCircle(hx - 15, y - 13.8, 1);
    g.fillCircle(hx + 15, y - 13.8, 1);
    // Visor.
    g.fillStyle(WW.black, alpha);
    g.fillPoints([P(hx - 15, y - 13.4), P(hx + 15, y - 13.4), P(hx + 11, y - 10.6), P(hx, y - 9.8), P(hx - 11, y - 10.6)], true);
    g.fillStyle(0x4a4a44, alpha * 0.8);
    g.fillPoints([P(hx - 12, y - 13), P(hx + 4, y - 13), P(hx, y - 11.6), P(hx - 9, y - 12)], true);
    // Brass eagle: spread wings and a body, with a glint running across it.
    const ex = hx, ey = y - 19.5;
    g.fillStyle(WW.brassDeep, alpha);
    g.fillEllipse(ex, ey + 0.4, 12, 4);
    g.fillStyle(WW.brass, alpha);
    for (const side of [-1, 1]) {
      g.fillPoints([P(ex, ey - 0.6), P(ex + side * 6, ey - 2.6), P(ex + side * 5, ey + 0.4), P(ex + side * 2, ey + 1.4)], true);
    }
    g.fillCircle(ex, ey, 1.5);
    g.fillStyle(WW.brassLit, alpha);
    g.fillCircle(ex - 0.3, ey - 0.6, 0.7);
    const u = (this.t * 0.5) % 1;
    g.fillStyle(0xffffff, alpha * Math.sin(u * Math.PI) * 0.7);
    g.fillCircle(ex - 5 + u * 10, ey - 1, 0.9);
  }
}

function light(c: number, k: number): number {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  return (Math.round(r + (255 - r) * k) << 16) | (Math.round(g + (255 - g) * k) << 8) | Math.round(b + (255 - b) * k);
}
