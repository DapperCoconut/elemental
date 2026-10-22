import Phaser from 'phaser';
import { ArmGesture, AvatarSpec, BaseAvatar, ColorFn, FxBase, easeOut } from '../ElementVisuals';

/**
 * The Sniper skin's character: Radiation's hazmat operative replaced by a bushman marksman.
 *
 * **Unmastered** — the professional: a khaki work shirt under a brown vest, a brass-studded
 * bandolier across the chest, stubble, aviator frames round the eyes (the eyes *are* the
 * lenses), a slouch hat with a band of crocodile teeth, and a rifle longer than he is tall
 * carried along the aim, scope on top.
 *
 * **Mastered** — gone to ground: a ghillie suit. Hessian strips and leaves hang off the
 * shoulders and the hood in a shaggy, ragged outline twice the width of the plain body, the
 * hat is buried under a leafy hood, and the rifle grows a bipod, a long scope with a sunshade
 * and a scrim wrap down the barrel.
 *
 * `setDose` (the kit's lock heat) drives the laser sight; `ping` flashes the scope glint the
 * instant a shot confirms — the TF2 tell that somebody is about to have a very bad day.
 */

export const SN = {
  ink: 0x120c06,
  shirt: 0xc49c5e,
  shirtLit: 0xdcb878,
  shirtShade: 0x8a6a3e,
  vest: 0x5a3a1e,
  vestDark: 0x3a2412,
  vestLit: 0x7a5230,
  skin: 0xd9a37a,
  skinShade: 0xb07f58,
  stubble: 0x6b4a32,
  hat: 0x6b4a2a,
  hatDark: 0x3e2a16,
  hatLit: 0x8e6a40,
  band: 0x241608,
  tooth: 0xf2ead2,
  brass: 0xd99a3a,
  brassLit: 0xf6d27a,
  brassDim: 0x7a5418,
  wood: 0x7a4a22,
  woodLit: 0xa8703a,
  woodDark: 0x4a2a12,
  metal: 0x2a2a2e,
  metalLit: 0x5e5e68,
  lens: 0x7fd6ff,
  lensDeep: 0x1c4a66,
  frame: 0xc8a050,
  laser: 0xff2a1e,
  laserLit: 0xff9a88,
  glint: 0xffffff,
  leaf: 0x5a6a28,
  leafLit: 0x7f8f3c,
  leafDark: 0x2e3814,
  hessian: 0x8a7a4a,
  hessianDark: 0x5a4e2c,
  jar: 0xf2d924,
};

/** Fingerless leather gloves: leather cuff, glove, a tan knuckle, an off-centre glint. */
const SNIPER_AVATAR: AvatarSpec = {
  hands: [
    { r: 8, color: SN.vestDark, alpha: 1 },
    { r: 6.6, color: SN.vest, alpha: 1 },
    { r: 3.6, color: SN.skin, alpha: 1, ox: 0.6, oy: 0.4 },
    { r: 1.6, color: SN.shirtLit, alpha: 0.9, ox: -1.8, oy: -2 },
  ],
  // Amber-tinted aviator lenses, the pupil a dark reflection across them.
  eyeWhite: 0xe6c87a,
  eyePupil: 0x1a1208,
  squash: { div: 18, x: 0.36, y: 0.2 },
};

const P = (x: number, y: number) => new Phaser.Geom.Point(x, y);

/** A tapered strand hanging from (x, y): `len` long, `w` wide at the root, swaying by `sway`. */
function strand(
  g: Phaser.GameObjects.Graphics, x: number, y: number, len: number, w: number, ang: number, sway: number,
): void {
  const steps = 5;
  const left: Phaser.Geom.Point[] = [];
  const right: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const a = ang + sway * u * u;
    const cx = x + Math.cos(a) * len * u;
    const cy = y + Math.sin(a) * len * u;
    const hw = w * (1 - u * 0.85);
    const nx = -Math.sin(a), ny = Math.cos(a);
    left.push(P(cx + nx * hw, cy + ny * hw));
    right.push(P(cx - nx * hw, cy - ny * hw));
  }
  g.fillPoints([...left, ...right.reverse()], true);
}

/** A leaf: a pointed lozenge at (x, y) along `ang`. */
function leaf(g: Phaser.GameObjects.Graphics, x: number, y: number, len: number, w: number, ang: number): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  const nx = -s, ny = c;
  g.fillPoints([
    P(x - c * len * 0.5, y - s * len * 0.5),
    P(x + nx * w, y + ny * w),
    P(x + c * len * 0.5, y + s * len * 0.5),
    P(x - nx * w, y - ny * w),
  ], true);
}

// ── Fx ────────────────────────────────────────────────────────────────────

class SniperDustFx extends FxBase {
  constructor(scene: Phaser.Scene) { super(scene, (c) => c); }

  /** Outback dust kicked off a moving hand. */
  mote(x: number, y: number, ghillie: boolean): void {
    const drift = (Math.random() - 0.5) * 16;
    const spin = Math.random() * Math.PI;
    this.anim(4, 520, (g, t) => {
      const e = easeOut(t);
      if (ghillie) {
        g.fillStyle(SN.leaf, (1 - t) * 0.8);
        leaf(g, x + drift * e, y + 14 * t * t, 6, 2, spin + t * 4);
      } else {
        g.fillStyle(SN.shirtShade, (1 - t) * 0.45);
        g.fillCircle(x + drift * e, y - 8 * e, 2.6 + e * 3);
      }
    });
  }
}

// ── SniperAvatar ──────────────────────────────────────────────────────────

export class SniperAvatar extends BaseAvatar {
  private fx: SniperDustFx;
  /** Lock heat from the kit, 0–1 — how hard the laser sight burns. */
  private dose = 0.5;
  private doseTarget = 0.5;
  /** Scope glint, raised on a confirm. */
  private glint = 0;
  /** Rifle recoil, 1 → 0 after a shot. */
  private recoil = 0;
  /** Where the scope's objective sat this frame — set by drawRifle, read for the glint. */
  private scopeTip = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, SNIPER_AVATAR);
    this.fx = new SniperDustFx(scene);
  }

  setDose(v: number): void { this.doseTarget = Phaser.Math.Clamp(v, 0, 1); }

  ping(): void { this.glint = 1; this.recoil = 1; }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.dose += (this.doseTarget - this.dose) * Math.min(1, delta / 420);
    this.glint *= Math.max(0, 1 - delta / 380);
    this.recoil *= Math.max(0, 1 - delta / 160);
    super.update(delta, x, y, alpha);
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    if (gesture === 'punch') this.recoil = Math.max(this.recoil, 0.6);
    super.play(gesture, angle, duration);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (cuff) => cuff.setFillStyle(on ? SN.leafDark : SN.vestDark, 1));
    this.forEachHandLayer(1, (glove) => glove.setFillStyle(on ? SN.hessianDark : SN.vest, 1));
  }

  protected emitTrail(x: number, y: number): void {
    this.fx.mote(x, y, this.mastered);
  }

  // ── Geometry ────────────────────────────────────────────────────────────

  /** Where each eye sits this frame — mirrors BaseAvatar's eye placement. */
  private eyeAt(x: number, y: number, side: number): { x: number; y: number } {
    const bob = Math.sin(this.t * 2.6) * 1.1;
    return {
      x: x + side * 7.2 + Math.cos(this.facing) * 2.4,
      y: y - 4 + Math.sin(this.facing) * 2.0 + bob,
    };
  }

  /** The rifle line: stock behind the shoulder, muzzle well out past the front hand. */
  private rifle(x: number, y: number): { sx: number; sy: number; mx: number; my: number; c: number; s: number } {
    const c = Math.cos(this.facing), s = Math.sin(this.facing);
    // Carried low and to the right shoulder so it rarely crosses the eyes.
    const px = x - s * 9 + 0, py = y + c * 9 + 6;
    const kick = this.recoil * 6;
    const back = 18 + kick, front = (this.mastered ? 66 : 60) - kick;
    return { sx: px - c * back, sy: py - s * back, mx: px + c * front, my: py + s * front, c, s };
  }

  // ── Layers ──────────────────────────────────────────────────────────────

  /** A ground shadow and the laser sight. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    g.fillStyle(SN.ink, a * 0.35);
    g.fillEllipse(x, y + 24, this.mastered ? 70 : 54, 14);
  }

  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    if (this.mastered) this.drawGhillieBack(g, x, y, alpha);

    // ── Torso: shoulders wide, tapering into the belt ──
    const torso = (dx: number, k: number) => [
      P(x + dx - 18 * k, y - 22), P(x + dx - 24 * k, y - 12), P(x + dx - 23 * k, y + 4),
      P(x + dx - 19 * k, y + 23), P(x + dx + 19 * k, y + 23), P(x + dx + 23 * k, y + 4),
      P(x + dx + 24 * k, y - 12), P(x + dx + 18 * k, y - 22),
    ];
    g.fillStyle(SN.ink, alpha);
    g.fillPoints(torso(0, 1.06), true);
    g.fillStyle(SN.shirtShade, alpha);
    g.fillPoints(torso(1.5, 1), true);
    g.fillStyle(SN.shirt, alpha);
    g.fillPoints(torso(-0.5, 0.94), true);
    g.fillStyle(SN.shirtLit, alpha * 0.5);
    g.fillPoints(torso(-9, 0.32), true);

    if (!this.mastered) {
      // Vest panels down both sides, open at the front.
      for (const side of [-1, 1]) {
        g.fillStyle(SN.vestDark, alpha);
        g.fillPoints([
          P(x + side * 23.5, y - 11), P(x + side * 11, y - 4), P(x + side * 8, y + 23),
          P(x + side * 19.5, y + 23), P(x + side * 23.5, y + 4),
        ], true);
        g.fillStyle(SN.vest, alpha);
        g.fillPoints([
          P(x + side * 22, y - 9), P(x + side * 12, y - 3), P(x + side * 9.5, y + 21.5),
          P(x + side * 18.5, y + 21.5), P(x + side * 22, y + 4),
        ], true);
        // Pocket flap and button.
        g.fillStyle(SN.vestLit, alpha * 0.8);
        g.fillRect(x + side * 16 - 4, y + 10, 8, 3);
        g.fillStyle(SN.brass, alpha);
        g.fillCircle(x + side * 16, y + 14, 1.2);
      }
      // Bandolier: left shoulder to right hip, a row of brass rounds.
      g.lineStyle(6, SN.vestDark, alpha);
      g.lineBetween(x - 20, y - 14, x + 17, y + 22);
      g.lineStyle(4, SN.woodDark, alpha);
      g.lineBetween(x - 20, y - 14, x + 17, y + 22);
      for (let i = 0; i < 5; i++) {
        const u = 0.2 + i * 0.17;
        const bx = x - 20 + 37 * u, by = y - 14 + 36 * u;
        if (by < y + 3) continue; // keep the face clear
        g.fillStyle(SN.brassDim, alpha);
        g.fillRoundedRect(bx - 1.6, by - 4, 3.2, 7, 1.2);
        g.fillStyle(SN.brassLit, alpha);
        g.fillRect(bx - 1, by - 3.5, 1, 4.5);
      }
      // Belt and buckle.
      g.fillStyle(SN.woodDark, alpha);
      g.fillRect(x - 19, y + 18, 38, 4);
      g.fillStyle(SN.brass, alpha);
      g.fillRect(x - 3, y + 17.5, 6, 5);
    }

    // ── Face: tanned, stubbled jaw, aviator frames ──
    g.fillStyle(SN.skinShade, alpha);
    g.fillEllipse(x + 1, y - 2, 31, 28);
    g.fillStyle(SN.skin, alpha);
    g.fillEllipse(x, y - 3, 29, 26);
    // Stubble across the jaw (below the eyes), a darker moustache line.
    g.fillStyle(SN.stubble, alpha * 0.55);
    g.fillEllipse(x, y + 6.5, 22, 9);
    g.fillStyle(SN.skin, alpha * 0.6);
    g.fillEllipse(x, y + 5.5, 9, 3);
    g.fillStyle(SN.stubble, alpha * 0.9);
    g.fillEllipse(x, y + 4.4, 10, 2.2);
    // Aviator frames ringing each eye, joined by a double bridge.
    const L = this.eyeAt(x, y, -1), R = this.eyeAt(x, y, 1);
    for (const e of [L, R]) {
      g.fillStyle(SN.ink, alpha * 0.9);
      g.fillEllipse(e.x, e.y + 0.4, 13.4, 12.2);
      g.fillStyle(SN.frame, alpha);
      g.fillEllipse(e.x, e.y + 0.3, 12, 11);
      g.fillStyle(SN.lensDeep, alpha);
      g.fillEllipse(e.x, e.y + 0.3, 10, 9.2);
    }
    g.lineStyle(1.3, SN.frame, alpha);
    g.lineBetween(L.x + 5, L.y - 2.5, R.x - 5, R.y - 2.5);
    // Arms of the shades running back to the ears.
    g.lineBetween(L.x - 5.5, L.y - 1.5, x - 15, y - 5);
    g.lineBetween(R.x + 5.5, R.y - 1.5, x + 15, y - 5);

    // Collar under the chin.
    g.fillStyle(SN.shirtShade, alpha);
    g.fillTriangle(x - 10, y + 10, x - 2, y + 10, x - 7, y + 16);
    g.fillTriangle(x + 10, y + 10, x + 2, y + 10, x + 7, y + 16);

    if (this.mastered) this.drawGhillieFront(g, x, y, alpha);

    this.drawRifle(g, x, y, alpha);
  }

  /** The shaggy ghillie outline behind the torso: strips hanging off a wide cape. */
  private drawGhillieBack(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const sway = Math.sin(this.t * 2.1) * 0.12;
    for (let i = 0; i < 18; i++) {
      const u = i / 17;
      const rx = x - 30 + u * 60;
      const ry = y - 16 + Math.abs(u - 0.5) * 10;
      const len = 26 + ((i * 37) % 11);
      const ang = Math.PI / 2 + (u - 0.5) * 1.1;
      g.fillStyle(i % 3 === 0 ? SN.hessianDark : i % 3 === 1 ? SN.leafDark : SN.leaf, alpha);
      strand(g, rx, ry, len, 3.6, ang, sway * (i % 2 ? 1 : -1));
    }
  }

  /** Ghillie front: a scrim cowl over the shoulders, strips and leaves, face left open. */
  private drawGhillieFront(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const sway = Math.sin(this.t * 2.4 + 1) * 0.15;
    // Shoulder strips draping forward either side of the face.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const rx = x + side * (14 + i * 2.4);
        const ry = y - 14 + i * 1.5;
        g.fillStyle(i % 2 ? SN.hessian : SN.leaf, alpha);
        strand(g, rx, ry, 30 - i * 2, 3.2, Math.PI / 2 + side * 0.18, sway * side);
      }
    }
    // Chest scrim and a scatter of leaves (below the eyes only).
    g.fillStyle(SN.leafDark, alpha * 0.9);
    g.fillEllipse(x, y + 18, 34, 12);
    const leaves: [number, number, number][] = [
      [-11, 14, 0.4], [-4, 19, -0.6], [5, 16, 1.1], [12, 20, -0.2], [0, 22, 0.9], [-16, 21, 1.4], [16, 13, -1.0],
    ];
    for (const [lx, ly, la] of leaves) {
      g.fillStyle(SN.leafLit, alpha);
      leaf(g, x + lx, y + ly, 8, 2.6, la + sway);
      g.fillStyle(SN.leafDark, alpha * 0.6);
      g.lineStyle(0.7, SN.leafDark, alpha * 0.7);
      g.lineBetween(x + lx - Math.cos(la) * 3, y + ly - Math.sin(la) * 3, x + lx + Math.cos(la) * 3, y + ly + Math.sin(la) * 3);
    }
  }

  /** The rifle along the aim: walnut stock, blued barrel, scope, bolt. */
  private drawRifle(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const { sx, sy, mx, my, c, s } = this.rifle(x, y);
    const nx = -s, ny = c;
    const at = (u: number, off = 0) => ({
      x: sx + (mx - sx) * u + nx * off,
      y: sy + (my - sy) * u + ny * off,
    });

    if (this.mastered) {
      // Bipod folded forward under the barrel.
      const b = at(0.72, 2);
      g.lineStyle(1.6, SN.metal, alpha);
      g.lineBetween(b.x, b.y, b.x + c * 12 + nx * 6, b.y + s * 12 + ny * 6);
      g.lineBetween(b.x, b.y, b.x + c * 12 - nx * 1, b.y + s * 12 - ny * 1);
    }

    // Stock: a tapered walnut wedge, butt plate wide.
    const s0 = at(0, 0), s1 = at(0.36, 0);
    g.fillStyle(SN.ink, alpha);
    g.fillPoints([
      P(s0.x + nx * 6, s0.y + ny * 6), P(s1.x + nx * 3.4, s1.y + ny * 3.4),
      P(s1.x - nx * 3.4, s1.y - ny * 3.4), P(s0.x - nx * 4, s0.y - ny * 4),
    ], true);
    g.fillStyle(SN.wood, alpha);
    g.fillPoints([
      P(s0.x + nx * 5, s0.y + ny * 5), P(s1.x + nx * 2.6, s1.y + ny * 2.6),
      P(s1.x - nx * 2.6, s1.y - ny * 2.6), P(s0.x - nx * 3, s0.y - ny * 3),
    ], true);
    g.lineStyle(1, SN.woodLit, alpha * 0.8);
    g.lineBetween(s0.x - nx * 2, s0.y - ny * 2, s1.x - nx * 1.6, s1.y - ny * 1.6);

    // Forestock and barrel.
    const f0 = at(0.36), f1 = at(0.66), b1 = at(1);
    g.lineStyle(5.2, SN.ink, alpha);
    g.lineBetween(f0.x, f0.y, f1.x, f1.y);
    g.lineStyle(4, SN.wood, alpha);
    g.lineBetween(f0.x, f0.y, f1.x, f1.y);
    g.lineStyle(3.2, SN.ink, alpha);
    g.lineBetween(f1.x, f1.y, b1.x, b1.y);
    g.lineStyle(2, SN.metal, alpha);
    g.lineBetween(f0.x, f0.y, b1.x, b1.y);
    g.lineStyle(0.8, SN.metalLit, alpha * 0.9);
    g.lineBetween(f0.x - nx * 0.6, f0.y - ny * 0.6, b1.x - nx * 0.6, b1.y - ny * 0.6);
    // Muzzle brake.
    g.fillStyle(SN.metal, alpha);
    g.fillCircle(b1.x, b1.y, 2.2);

    if (this.mastered) {
      // Scrim wrap down the barrel.
      for (let i = 0; i < 4; i++) {
        const w = at(0.7 + i * 0.07);
        g.fillStyle(i % 2 ? SN.hessian : SN.leaf, alpha);
        g.fillCircle(w.x, w.y, 2.4);
      }
    }

    // Scope riding the top of the action (the side away from the body).
    const scopeLen = this.mastered ? 0.34 : 0.24;
    const q0 = at(0.38, -4.2), q1 = at(0.38 + scopeLen, -4.2);
    g.lineStyle(4.6, SN.ink, alpha);
    g.lineBetween(q0.x, q0.y, q1.x, q1.y);
    g.lineStyle(3.4, SN.metal, alpha);
    g.lineBetween(q0.x, q0.y, q1.x, q1.y);
    g.lineStyle(1, SN.metalLit, alpha);
    g.lineBetween(q0.x - nx * 0.8, q0.y - ny * 0.8, q1.x - nx * 0.8, q1.y - ny * 0.8);
    // Scope rings.
    for (const u of [0.42, 0.34 + scopeLen]) {
      const r0 = at(u, -1.2), r1 = at(u, -5.6);
      g.lineStyle(1.4, SN.metalLit, alpha);
      g.lineBetween(r0.x, r0.y, r1.x, r1.y);
    }
    this.scopeTip = q1;
    // Objective lens, and the glint.
    g.fillStyle(SN.metal, alpha);
    g.fillCircle(q1.x, q1.y, this.mastered ? 3.4 : 2.8);
    g.fillStyle(SN.lens, alpha * (0.7 + this.dose * 0.3));
    g.fillCircle(q1.x + c * 0.6, q1.y + s * 0.6, this.mastered ? 2.2 : 1.8);
    // Bolt handle.
    const bo = at(0.36, 3);
    g.lineStyle(1.4, SN.metal, alpha);
    g.lineBetween(bo.x, bo.y, bo.x + nx * 4, bo.y + ny * 4);
    g.fillStyle(SN.metalLit, alpha);
    g.fillCircle(bo.x + nx * 4, bo.y + ny * 4, 1.4);
  }

  /** Hat (or ghillie hood) above the crown, the laser sight, and the scope glint. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const { mx, my, c, s } = this.rifle(x, y);
    if (this.mastered) this.drawHood(g, x, y, alpha);
    else this.drawSlouchHat(g, x, y, alpha);

    // Laser sight: a hairline red line out of the muzzle, burning harder as a lock closes.
    const k = Phaser.Math.Clamp((this.dose - 0.5) * 2, 0, 1);
    const reach = 70 + k * 140;
    g.lineStyle(3, SN.laser, alpha * (0.08 + k * 0.18));
    g.lineBetween(mx, my, mx + c * reach, my + s * reach);
    g.lineStyle(1, SN.laser, alpha * (0.35 + k * 0.5));
    g.lineBetween(mx, my, mx + c * reach, my + s * reach);
    g.fillStyle(SN.laserLit, alpha * (0.4 + k * 0.5));
    g.fillCircle(mx + c * reach, my + s * reach, 1.6 + k * 1.4);

    // Scope glint on a confirm: a four-point star.
    if (this.glint > 0.05) {
      const q = this.scopeTip;
      const r = 4 + this.glint * 12;
      g.fillStyle(SN.glint, alpha * this.glint);
      g.fillTriangle(q.x - r, q.y, q.x + r, q.y, q.x, q.y - 1.6);
      g.fillTriangle(q.x - r, q.y, q.x + r, q.y, q.x, q.y + 1.6);
      g.fillTriangle(q.x, q.y - r, q.x, q.y + r, q.x - 1.6, q.y);
      g.fillTriangle(q.x, q.y - r, q.x, q.y + r, q.x + 1.6, q.y);
      g.fillStyle(SN.lens, alpha * this.glint * 0.4);
      g.fillCircle(q.x, q.y, r * 0.5);
    }
  }

  /** Slouch hat: wide felt brim, dented crown, band of crocodile teeth. */
  private drawSlouchHat(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const by = y - 22;
    // Brim: wide, drooping at the front-left.
    g.fillStyle(SN.ink, alpha);
    g.fillEllipse(x, by + 1.5, 62, 13);
    g.fillStyle(SN.hatDark, alpha);
    g.fillEllipse(x, by, 60, 11);
    g.fillStyle(SN.hat, alpha);
    g.fillEllipse(x - 1, by - 1, 56, 8.6);
    // Crown: a dented dome built point-by-point.
    const crown: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      const a = Math.PI + u * Math.PI;
      const dent = Math.abs(u - 0.5) < 0.12 ? 3 : 0;
      crown.push(P(x + Math.cos(a) * 17, by - 1 + Math.sin(a) * (15 - dent)));
    }
    g.fillStyle(SN.hatDark, alpha);
    g.fillPoints(crown.map((p) => P(p.x + 1.4, p.y + 0.6)), true);
    g.fillStyle(SN.hat, alpha);
    g.fillPoints(crown, true);
    g.fillStyle(SN.hatLit, alpha * 0.6);
    g.fillEllipse(x - 7, by - 9, 8, 9);
    // Band and its teeth.
    g.fillStyle(SN.band, alpha);
    g.fillRect(x - 17, by - 6, 34, 4.4);
    for (let i = 0; i < 6; i++) {
      const tx = x - 13 + i * 5.2;
      g.fillStyle(SN.tooth, alpha);
      g.fillTriangle(tx - 1.4, by - 1.8, tx + 1.4, by - 1.8, tx, by + 2.2);
    }
  }

  /** Ghillie hood: a ragged leafy mound burying the head, strips trailing off. */
  private drawHood(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const by = y - 19;
    const sway = Math.sin(this.t * 2.2) * 0.2;
    // Strips falling off either side of the hood (kept outside the face).
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        g.fillStyle(i % 2 ? SN.hessian : SN.leafDark, alpha);
        strand(g, x + side * (19 + i * 3), by - 2, 18 + i * 3, 3, Math.PI / 2 + side * 0.4, sway * side);
      }
    }
    // The mound.
    const mound: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      const a = Math.PI + u * Math.PI;
      const rag = 1 + ((i * 7) % 5) * 0.06;
      mound.push(P(x + Math.cos(a) * 23 * rag, by + Math.sin(a) * 19 * rag));
    }
    g.fillStyle(SN.leafDark, alpha);
    g.fillPoints(mound, true);
    g.fillStyle(SN.leaf, alpha);
    g.fillPoints(mound.map((p) => P(x + (p.x - x) * 0.86, by + (p.y - by) * 0.86 - 1)), true);
    // Leaves stuck all over it.
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + 0.25 + (i / 8) * (Math.PI - 0.5);
      const d = 9 + (i % 3) * 4;
      g.fillStyle(i % 2 ? SN.leafLit : SN.hessian, alpha);
      leaf(g, x + Math.cos(a) * d, by + Math.sin(a) * d * 0.9, 9, 2.8, a + 1.2 + sway);
    }
    // A ragged lower fringe over the brow (still above the eyes).
    for (let i = 0; i < 8; i++) {
      const fx = x - 18 + i * 5.1;
      g.fillStyle(i % 2 ? SN.leafDark : SN.hessianDark, alpha);
      strand(g, fx, by - 1, 4 + (i % 3), 2.2, Math.PI / 2, sway);
    }
  }
}
