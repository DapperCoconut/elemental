import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn } from '../ElementVisuals';
import { HK, HollowFx, nailBlade } from './HollowFx';

/**
 * The Hollow skin's character (Cloth): a small horned knight in a dark cloak.
 *
 * - **Unmastered** — the Knight: a big white shell mask with two short horns, the rig's eyes
 *   sitting in it as the mask's black eye-holes, a short bell of a cloak with a torn hem, two
 *   little feet peeking out under it, a cape flap dragged behind on a lag, and a plain nail.
 * - **Mastered** — a vessel come into its own: tall swept-back horns, a cloak that reaches the
 *   floor with a pale-trimmed mantle over the shoulders, a longer cape flap, and the Pure Nail.
 * - **Void form** (`setVoid`, driven by the kit while Bleed Stop holds) — the shell goes black,
 *   the body becomes shifting shade with tendrils writhing off it, and the eyes burn white.
 *
 * The cloth scarf trail itself is the rest of the cape: the kit paints it as world geometry
 * (`hollowCape`), and it leaves from under this body.
 *
 * Built with the identity mapper and its own palette, like every skin rig.
 */

const HOLLOW_AVATAR: AvatarSpec = {
  hands: [
    { r: 9, color: HK.cloakDeep, alpha: 0.35 },
    { r: 5.6, color: HK.void, alpha: 1 },
    { r: 3.8, color: HK.cloak, alpha: 1 },
    { r: 1.5, color: HK.cloakLit, alpha: 0.9, ox: -1.1, oy: -1.3 },
  ],
  // The eyes are the mask's eye-holes: black, with a pupil only barely lighter.
  eyeWhite: HK.void,
  eyePupil: HK.cloakDeep,
  squash: { div: 14, x: 0.45, y: 0.28 },
};

const P = (x: number, y: number) => new Phaser.Geom.Point(x, y);

export class HollowAvatar extends BaseAvatar {
  private fx: HollowFx;
  /** 0–1: how far into the void form. Eased toward `voidTarget` so the change reads. */
  private voidK = 0;
  private voidTarget = 0;
  /** Smoothed body velocity (px/frame-ish), for the lagging cape flap. */
  private velX = 0;
  private velY = 0;
  private lastX: number | null = null;
  private lastY = 0;

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, HOLLOW_AVATAR);
    this.fx = new HollowFx(scene);
  }

  /** Bleed Stop's void form. The kit calls this every frame; it eases in and out on its own. */
  setVoid(on: boolean): void {
    const v = on ? 1 : 0;
    if (v === this.voidTarget) return;
    this.voidTarget = v;
  }

  update(delta: number, x: number, y: number, alpha: number): void {
    const was = this.voidK;
    this.voidK += (this.voidTarget - this.voidK) * Math.min(1, delta / 180);
    if (this.lastX !== null && delta > 0) {
      const k = Math.min(1, delta / 140);
      const scale = 16.67 / delta;
      this.velX += ((x - this.lastX) * scale - this.velX) * k;
      this.velY += ((y - this.lastY) * scale - this.velY) * k;
    }
    this.lastX = x;
    this.lastY = y;
    super.update(delta, x, y, alpha);
    // Shade spilling off as the void takes or releases the shell.
    if (alpha > 0.02 && Math.abs(this.voidK - was) > 0.02 && Math.random() < 0.5) {
      this.fx.shade(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 20, 3, 14, 380);
    }
  }

  /** A soul-lit corona round each hand; the silhouette change lives in the draw hooks. */
  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 11.5 : 9);
      halo.setFillStyle(on ? HK.soulDim : HK.cloakDeep, on ? 0.4 : 0.35);
    });
  }

  protected emitTrail(x: number, y: number): void {
    this.fx.shade(x, y);
  }

  // ── Shared geometry ─────────────────────────────────────────────────────

  private get bob(): number { return Math.sin(this.t * 2.6) * 1.1; }

  /** Where the base rig puts each eye this frame — the sockets and void eyes sit exactly there. */
  private eyeAt(x: number, y: number, side: number): { x: number; y: number } {
    return {
      x: x + side * 7.2 + Math.cos(this.facing) * 2.4,
      y: y - 4 + Math.sin(this.facing) * 2.0 + this.bob,
    };
  }

  /** Lagging tail offset for the cape flap: behind the run, hanging down when still. */
  private capeTail(): { x: number; y: number } {
    const sway = Math.sin(this.t * 1.9) * 2.2;
    const tx = Phaser.Math.Clamp(-this.velX * 3.2, -22, 22) + sway;
    const ty = Phaser.Math.Clamp(-this.velY * 3.2, -16, 14);
    return { x: tx, y: ty };
  }

  // ── Layers ──────────────────────────────────────────────────────────────

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const vk = this.voidK;
    g.fillStyle(HK.void, a * 0.45 * (1 - vk) + alpha * 0.55 * vk);
    g.fillEllipse(x, y + 22, 46 + vk * 26, 14 + vk * 8);
    if (this.mastered) {
      g.fillStyle(HK.soul, a * 0.12 * (1 - vk));
      g.fillCircle(x, y - 10, 36);
    }
    if (vk > 0.02) {
      // The void pooling on the floor, its edge breathing.
      const pts: Phaser.Geom.Point[] = [];
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2;
        const rr = 1 + Math.sin(this.t * 3 + i * 1.7) * 0.12;
        pts.push(P(x + Math.cos(ang) * 38 * rr, y + 22 + Math.sin(ang) * 12 * rr));
      }
      g.fillStyle(HK.void, alpha * 0.5 * vk);
      g.fillPoints(pts, true);
    }
  }

  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const vk = this.voidK;
    const na = alpha * (1 - vk);
    if (na > 0.01) this.drawKnight(g, x, y, na);
    if (vk > 0.01) this.drawVoidBody(g, x, y, alpha * vk);
  }

  private drawKnight(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const m = this.mastered;
    const tail = this.capeTail();
    const hemY = y + (m ? 29 : 22);
    const hemHalf = m ? 25 : 21;

    // ── Cape flap, dragged behind on a lag ──
    {
      const len = m ? 1.35 : 1;
      const tx = x + tail.x * len;
      const ty = hemY + 4 + tail.y * len + (m ? 6 : 2);
      const pts: Phaser.Geom.Point[] = [P(x - 13, y - 3), P(x + 13, y - 3)];
      // Right edge sweeping down to the tail.
      pts.push(P((x + 13) * 0.5 + (tx + 15) * 0.5, (y - 3) * 0.5 + ty * 0.5));
      // Torn hem across the tail: five teeth.
      for (let i = 0; i <= 8; i++) {
        const u = i / 8;
        const hx = tx + 16 - u * 32;
        const tooth = i % 2 === 0 ? 4 + Math.sin(this.t * 3 + i) * 1.2 : 0;
        pts.push(P(hx, ty + tooth));
      }
      pts.push(P((x - 13) * 0.5 + (tx - 15) * 0.5, (y - 3) * 0.5 + ty * 0.5));
      g.fillStyle(HK.cloakDeep, alpha);
      g.fillPoints(pts, true);
      g.fillStyle(HK.cloak, alpha * 0.55);
      g.fillPoints([P(x - 6, y - 2), P(x + 6, y - 2), P(tx + 5, ty - 2), P(tx - 5, ty - 2)], true);
    }

    // ── Feet, under a short cloak ──
    if (!m) {
      const step = Math.sin(this.t * 9) * Math.min(1, Math.hypot(this.velX, this.velY) / 3) * 2;
      g.fillStyle(HK.void, alpha);
      g.fillEllipse(x - 7, y + 24 + step, 7, 5);
      g.fillEllipse(x + 7, y + 24 - step, 7, 5);
    }

    // ── The cloak: a bell with a torn hem ──
    const bell: Phaser.Geom.Point[] = [];
    const steps = 7;
    const topY = y - 7;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      bell.push(P(x - (12 + (hemHalf - 12) * Math.pow(u, 0.8)), topY + (hemY - topY) * u));
    }
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      const tooth = i % 2 === 1 ? 3.6 + Math.sin(this.t * 2.4 + i * 1.3) * 0.8 : 0;
      bell.push(P(x - hemHalf + u * hemHalf * 2, hemY + tooth));
    }
    for (let i = steps; i >= 0; i--) {
      const u = i / steps;
      bell.push(P(x + (12 + (hemHalf - 12) * Math.pow(u, 0.8)), topY + (hemY - topY) * u));
    }
    g.fillStyle(HK.cloakDeep, alpha);
    g.fillPoints(bell.map((p) => P(p.x + 2, p.y + 1)), true);
    g.fillStyle(HK.cloak, alpha);
    g.fillPoints(bell, true);
    // Folds: two darker gores down the cloak, and a lit edge down the left.
    g.lineStyle(1.6, HK.cloakDeep, alpha * 0.8);
    g.lineBetween(x - 5, y + 6, x - 9, hemY);
    g.lineBetween(x + 6, y + 6, x + 10, hemY);
    g.lineStyle(1.4, HK.cloakLit, alpha * 0.7);
    g.lineBetween(x - 12, topY + 3, x - hemHalf + 2, hemY - 1);

    if (m) {
      // Mantle: a shorter shoulder cape over the cloak, pale-trimmed.
      const mant: Phaser.Geom.Point[] = [P(x - 16, y - 4), P(x + 16, y - 4)];
      for (let i = 0; i <= 6; i++) {
        const u = i / 6;
        mant.push(P(x + 23 - u * 46, y + 11 + (i % 2 ? 3 : 0)));
      }
      g.fillStyle(HK.cloakDeep, alpha);
      g.fillPoints(mant, true);
      g.lineStyle(1.3, HK.shellShade, alpha * 0.85);
      g.beginPath();
      for (let i = 0; i <= 6; i++) {
        const u = i / 6;
        const px = x + 23 - u * 46, py = y + 11 + (i % 2 ? 3 : 0);
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
      // A clasp of pale shell at the throat.
      g.fillStyle(HK.shell, alpha);
      g.fillCircle(x, y + 8, 2.4);
    }

    // ── The mask ──
    this.drawMask(g, x, y, alpha, HK.shellShade, HK.shell, HK.white);
    // Eye sockets: tall dark ovals behind the rig's round eyes, so the holes read as the
    // knight's tall eyes rather than as two dots.
    for (const side of [-1, 1]) {
      const e = this.eyeAt(x, y, side);
      g.fillStyle(HK.void, alpha);
      g.fillEllipse(e.x, e.y + 0.8, 9.6, 13);
    }
  }

  /** The shell mask: an egg, wide and round on top and narrowing to a soft chin. */
  private drawMask(
    g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number,
    shade: number, face: number, lit: number,
  ): void {
    const lean = Math.cos(this.facing) * 1.4;
    const cx = x + lean;
    const cy = y - 8 + this.bob;
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 24; i++) {
      const th = (i / 24) * Math.PI * 2;
      const down = Math.max(0, Math.sin(th));
      const hx = Math.cos(th) * 16.5 * (1 - down * 0.22);
      const hy = Math.sin(th) * (Math.sin(th) > 0 ? 15 : 16.5);
      pts.push(P(cx + hx, cy + hy));
    }
    g.fillStyle(shade, alpha);
    g.fillPoints(pts.map((p) => P(p.x + 1.4, p.y + 1.2)), true);
    g.fillStyle(face, alpha);
    g.fillPoints(pts, true);
    g.fillStyle(lit, alpha * 0.75);
    g.fillEllipse(cx - 5.5, cy - 8.5, 10, 6);
    // Shadow under the brow line, on the far side from the light.
    g.fillStyle(shade, alpha * 0.55);
    g.fillEllipse(cx + 7, cy + 7, 12, 7);
  }

  private drawVoidBody(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const t = this.t;
    // Tendrils writhing off the body — tapered, built point-by-point.
    for (let i = 0; i < 9; i++) {
      const base = Math.PI * (0.05 + (i / 8) * 0.9) + (i % 2 ? 0.08 : -0.08);
      const len = 18 + ((i * 37) % 9) + Math.sin(t * 2.3 + i * 1.9) * 4;
      const pts: Phaser.Geom.Point[] = [];
      const steps = 7;
      const curve = (u: number) => base + Math.sin(t * 3.1 + i * 2.2 + u * 3) * 0.45 * u;
      const ox = x + Math.cos(base) * 16, oy = y + 4 + Math.sin(base) * 14;
      for (let j = 0; j <= steps; j++) {
        const u = j / steps;
        const a = curve(u);
        const hw = 4.6 * (1 - u);
        pts.push(P(ox + Math.cos(a) * len * u - Math.sin(a) * hw, oy + Math.sin(a) * len * u + Math.cos(a) * hw));
      }
      for (let j = steps; j >= 0; j--) {
        const u = j / steps;
        const a = curve(u);
        const hw = 4.6 * (1 - u);
        pts.push(P(ox + Math.cos(a) * len * u + Math.sin(a) * hw, oy + Math.sin(a) * len * u - Math.cos(a) * hw));
      }
      g.fillStyle(HK.void, alpha);
      g.fillPoints(pts, true);
    }
    // The shifting body of shade: a lumpy disc whose edge never sits still.
    const body: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 20; i++) {
      const ang = (i / 20) * Math.PI * 2;
      const rr = 23 + Math.sin(t * 4 + i * 1.3) * 1.8 + Math.sin(t * 6.7 + i * 2.9) * 1.1;
      body.push(P(x + Math.cos(ang) * rr, y + 3 + Math.sin(ang) * rr * 0.95));
    }
    g.fillStyle(HK.void, alpha);
    g.fillPoints(body, true);
    g.fillStyle(HK.abyss, alpha * 0.9);
    g.fillCircle(x - 3, y + 6, 14);
    // Faint inner rim so the black still has a shape.
    g.lineStyle(1.2, HK.cloakLit, alpha * 0.45);
    g.beginPath();
    g.arc(x, y + 3, 21, Math.PI * 0.15, Math.PI * 0.85);
    g.strokePath();
    // The mask, gone to shade.
    this.drawMask(g, x, y, alpha, HK.void, HK.abyss, HK.cloakLit);
  }

  /** Horns from the crown up, the nail in hand, and — in the void — burning white eyes. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const vk = this.voidK;
    const m = this.mastered;
    const lean = Math.cos(this.facing) * 1.4;
    const crownY = y - 21 + this.bob;

    // ── Horns ──
    const drawHorns = (al: number, shade: number, face: number, lit: number, grow: number) => {
      for (const side of [-1, 1]) {
        const rx = x + lean + side * (m ? 8.5 : 7.5);
        const h = (m ? 25 : 14) * grow;
        const out = (m ? 10 : 3.5) * grow;
        const w = m ? 4.6 : 3.8;
        const pts: Phaser.Geom.Point[] = [];
        const steps = 8;
        const at = (u: number) => ({
          x: rx + side * out * u * u + side * (m ? -2 : 0) * u,
          y: crownY - h * u + (m ? 3 * u * u : 0),
        });
        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          const p = at(u);
          pts.push(P(p.x - w * (1 - u) * 0.95, p.y));
        }
        for (let i = steps; i >= 0; i--) {
          const u = i / steps;
          const p = at(u);
          pts.push(P(p.x + w * (1 - u) * 0.95, p.y));
        }
        g.fillStyle(shade, al);
        g.fillPoints(pts.map((p) => P(p.x + 1.1, p.y + 0.8)), true);
        g.fillStyle(face, al);
        g.fillPoints(pts, true);
        const mid = at(0.35);
        g.fillStyle(lit, al * 0.6);
        g.fillEllipse(mid.x - side * 1, mid.y, 1.8, h * 0.35);
      }
    };
    if (vk < 0.99) drawHorns(alpha * (1 - vk), HK.shellShade, HK.shell, HK.white, 1);
    if (vk > 0.01) drawHorns(alpha * vk, HK.void, HK.abyss, HK.cloakLit, 1.25);

    // ── The nail, held point-out in the right hand ──
    const hx = this.armX[1], hy = this.armY[1];
    const ang = this.facing - 0.3;
    const len = m ? 30 : 24;
    nailBlade(
      g, hx + Math.cos(ang) * len * 0.36, hy + Math.sin(ang) * len * 0.36, ang, len, alpha,
      { pure: m, dark: vk > 0.5 },
    );

    // ── Void eyes: two burning white ovals over the rig's black ones ──
    if (vk > 0.01) {
      const flick = 0.85 + Math.sin(this.t * 11) * 0.08;
      for (const side of [-1, 1]) {
        const e = this.eyeAt(x, y, side);
        g.fillStyle(HK.soul, alpha * vk * 0.25 * flick);
        g.fillEllipse(e.x, e.y + 0.6, 16, 19);
        g.fillStyle(HK.white, alpha * vk);
        g.fillEllipse(e.x, e.y + 0.6, 9.8, 13.2);
      }
    }
  }
}
