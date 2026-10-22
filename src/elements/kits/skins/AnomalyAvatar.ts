import Phaser from 'phaser';
import { AvatarSpec, ColorFn } from '../ElementVisuals';
import { DreamAvatar } from '../DreamVisuals';
import { AnomalyFx } from './AnomalyFx';

/**
 * The Anomaly skin's character: Dream's sleepwalker replaced by a hazmat captain — Captain
 * Clark — in a yellow containment suit with a smoked visor (his eyes behind it), a respirator,
 * and a black tricorn on top of the hood.
 *
 * - **Unmastered**: the suit, the respirator, the tricorn.
 * - **Mastered**: a captain's coat over the suit (epaulettes, gold buttons, flaring tails), twin
 *   oxygen tanks on his back with a hose into the respirator, and a plume in the hat.
 * - **In his own dream** (`setDreaming`): he is the thing in the Backrooms — a tall, thin,
 *   black, twitching "bacteria" with spindly limbs and pinprick eyes.
 *
 * Extends `DreamAvatar` rather than `BaseAvatar` directly so the kit still drives the guns,
 * recoil, drowsiness and music box; only the drawing changes.
 */

const AN = {
  suitLit: 0xf2d64a,
  suit: 0xe2bd24,
  suitShade: 0xb08d12,
  suitDeep: 0x7a600a,
  tape: 0x9a9a92,
  rubber: 0x23251f,
  rubberLit: 0x3a3d33,
  glint: 0x8a8f7a,
  visor: 0x1b2b2a,
  visorRim: 0x15150f,
  glare: 0xe8fff6,
  filter: 0x3c3f36,
  hazard: 0xe0561c,
  hat: 0x1b1612,
  hatLit: 0x342a20,
  trim: 0xd4a838,
  bone: 0xf1ead2,
  coat: 0x5a1616,
  coatLit: 0x7e2420,
  coatDeep: 0x360b0b,
  gold: 0xe2b443,
  tank: 0x8f9796,
  tankLit: 0xc7cfcd,
  tankDeep: 0x575e5d,
  plume: 0xeee4c6,
  entity: 0x050505,
  entityLit: 0x1c1c1c,
  eyeWhite: 0xf2f0e0,
  pupil: 0x141410,
};

/** Black rubber gloves with a little yellow from the suit cuff around them. */
const ANOMALY_AVATAR: AvatarSpec = {
  hands: [
    { r: 9.5, color: AN.suit, alpha: 0.22 },
    { r: 6.8, color: AN.rubber, alpha: 1 },
    { r: 4.2, color: AN.rubberLit, alpha: 1 },
    { r: 1.5, color: AN.glint, alpha: 0.9, ox: -1.6, oy: -1.6 },
  ],
  eyeWhite: AN.eyeWhite,
  eyePupil: AN.pupil,
  squash: { div: 16, x: 0.42, y: 0.22 },
};

const P = (x: number, y: number) => new Phaser.Geom.Point(x, y);

export class AnomalyAvatar extends DreamAvatar {
  /** 0 = hazmat captain, 1 = the entity. Eased, so the change is a crossfade. */
  private ent = 0;
  private entTarget = 0;
  private fxs: AnomalyFx;

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, ANOMALY_AVATAR);
    this.fxs = new AnomalyFx(scene);
  }

  setDreaming(on: boolean): void {
    const tgt = on ? 1 : 0;
    if (tgt === this.entTarget) return;
    this.entTarget = tgt;
    this.shedAt = true;
  }
  private shedAt = false;

  update(delta: number, x: number, y: number, alpha: number): void {
    this.ent += (this.entTarget - this.ent) * Math.min(1, delta / 140);
    if (this.shedAt) {
      this.shedAt = false;
      if (alpha > 0.02) this.fxs.shed(x, y);
    }
    const e = this.ent > 0.5;
    this.forEachHandLayer(0, (a) => a.setFillStyle(e ? AN.entity : (this.mastered ? AN.gold : AN.suit), e ? 0.35 : 0.22));
    this.forEachHandLayer(1, (a) => a.setFillStyle(e ? AN.entity : AN.rubber, 1));
    this.forEachHandLayer(2, (a) => a.setFillStyle(e ? AN.entityLit : AN.rubberLit, 1));
    this.setEyeWhite(e ? AN.entity : AN.eyeWhite);
    super.update(delta, x, y, alpha);
  }

  protected applyMastery(_on: boolean): void {
    // Hand glow colour is set per frame in `update` (it also depends on the entity form).
  }

  protected emitTrail(x: number, y: number): void {
    if (this.ent < 0.5) this.fxs.spores(x, y);
  }

  /** Lean from the spring-lagged hands, so the hat and coat tails trail a run. */
  private lean(x: number): number {
    return Phaser.Math.Clamp(((this.armX[0] + this.armX[1]) / 2 - x) * 0.25, -5, 5);
  }

  /** Twitch for the entity: steady jitter plus the occasional hard snap. */
  private twitch(seed: number): number {
    const tick = Math.floor(this.t * 7 + seed);
    const v = Math.sin(tick * 91.7 + seed * 13) * 43758.5;
    const snap = (v - Math.floor(v)) > 0.82 ? (Math.sin(tick * 3.3) > 0 ? 3 : -3) : 0;
    return (Math.sin(this.t * 53 + seed) + Math.sin(this.t * 29 + seed * 2)) * 0.7 + snap;
  }

  // ── Glow: under the sprite ───────────────────────────────────────────────

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const k = this.ent;
    if (k < 0.98) {
      const s = alpha * (1 - k);
      g.fillStyle(AN.suitDeep, a * 0.25 * (1 - k));
      g.fillEllipse(x, y + 22, 50, 14);
      if (this.mastered) this.drawTanks(g, x, y, s);
    }
    if (k > 0.02) {
      const s = alpha * k;
      // Long spindly legs bent outward, under everything.
      g.fillStyle(AN.entity, s * 0.4);
      g.fillEllipse(x, y + 26, 54, 12);
      g.lineStyle(2, AN.entity, s);
      for (const side of [-1, 1]) {
        const j = this.twitch(side * 5);
        const kx = x + side * (18 + j), ky = y + 10;
        g.lineBetween(x + side * 6, y + 14, kx, ky);
        g.lineBetween(kx, ky, x + side * (14 + j * 0.5), y + 30);
      }
    }
  }

  /** Twin oxygen tanks on the back, on the side away from the aim, with a hose round to the mask. */
  private drawTanks(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const back = this.facing + Math.PI;
    const bx = x + Math.cos(back) * 12, by = y - 2 + Math.sin(back) * 6;
    for (const off of [-7, 7]) {
      const tx = bx + off, ty = by;
      g.fillStyle(AN.tankDeep, alpha);
      g.fillRoundedRect(tx - 6, ty - 22, 12, 40, 6);
      g.fillStyle(AN.tank, alpha);
      g.fillRoundedRect(tx - 5, ty - 21, 9, 38, 5);
      g.fillStyle(AN.tankLit, alpha * 0.8);
      g.fillRect(tx - 3.5, ty - 18, 2, 32);
      g.fillStyle(AN.hazard, alpha);
      g.fillRect(tx - 5, ty - 2, 10, 3);
      // Valve.
      g.fillStyle(AN.rubber, alpha);
      g.fillRect(tx - 2, ty - 27, 4, 6);
      g.fillCircle(tx, ty - 28, 2.6);
    }
    // Hose from the valves round to the respirator.
    g.lineStyle(2.4, AN.rubber, alpha);
    g.beginPath();
    g.moveTo(bx, by - 26);
    g.lineTo(bx + (x - bx) * 0.5, by - 30);
    g.lineTo(x + Math.cos(this.facing) * 4, y + 7);
    g.strokePath();
  }

  // ── Body: over the sprite, under the eyes ───────────────────────────────

  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const k = this.ent;
    if (k < 0.98) this.drawSuit(g, x, y, alpha * (1 - k));
    if (k > 0.02) this.drawEntityBody(g, x, y, alpha * k);
  }

  private drawSuit(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const m = this.mastered;
    const lean = this.lean(x);
    const bob = Math.sin(this.t * 2.4) * 0.8;
    // Bulky suit, tapered point by point: hood, shoulders, baggy waist, boots.
    const suit = [
      P(x - 13, y - 22 + bob), P(x - 6, y - 26 + bob), P(x + 6, y - 26 + bob), P(x + 13, y - 22 + bob),
      P(x + 18, y - 14), P(x + 22, y - 8), P(x + 21, y + 4), P(x + 19, y + 14), P(x + 21, y + 21),
      P(x + 12, y + 24), P(x + 2, y + 21), P(x - 2, y + 21), P(x - 12, y + 24), P(x - 21, y + 21),
      P(x - 19, y + 14), P(x - 21, y + 4), P(x - 22, y - 8), P(x - 18, y - 14),
    ];
    g.fillStyle(AN.suitShade, alpha);
    g.fillPoints(suit, true);
    // Lit side (toward the aim), so the suit reads as round rubber.
    const lit = Math.cos(this.facing) >= 0 ? 1 : -1;
    g.fillStyle(AN.suit, alpha);
    g.fillPoints(suit.map((p) => P(x + (p.x - x) * 0.9 + lit * 1.2, y + (p.y - y) * 0.94)), true);
    g.fillStyle(AN.suitLit, alpha * 0.7);
    g.fillEllipse(x + lit * 9, y - 14 + bob, 10, 8);
    // Creases.
    g.lineStyle(1, AN.suitDeep, alpha * 0.55);
    g.lineBetween(x - 15, y + 2, x - 10, y + 8);
    g.lineBetween(x + 15, y + 3, x + 10, y + 9);
    g.lineBetween(x - 2, y + 21, x - 1, y + 14);
    // Duct-taped waist.
    g.fillStyle(AN.tape, alpha * 0.95);
    g.fillRect(x - 20, y + 9, 40, 4);
    g.lineStyle(0.6, AN.suitDeep, alpha * 0.5);
    g.lineBetween(x - 6, y + 9, x - 5, y + 13);
    g.lineBetween(x + 8, y + 9, x + 9, y + 13);
    // Boots.
    g.fillStyle(AN.rubber, alpha);
    g.fillEllipse(x - 11, y + 22, 14, 6);
    g.fillEllipse(x + 11, y + 22, 14, 6);

    if (m) this.drawCoat(g, x, y, alpha, lean);

    // Visor: smoked glass round the eyes, rim, and a glare streak.
    g.fillStyle(AN.visorRim, alpha);
    g.fillRoundedRect(x - 16, y - 13 + bob, 32, 18, 7);
    g.fillStyle(AN.visor, alpha * 0.92);
    g.fillRoundedRect(x - 14, y - 11.5 + bob, 28, 15, 6);
    g.lineStyle(1.6, AN.glare, alpha * 0.35);
    g.lineBetween(x - 11, y - 4 + bob, x - 5, y - 10 + bob);
    g.lineStyle(1, AN.glare, alpha * 0.25);
    g.lineBetween(x - 8, y - 1 + bob, x - 1, y - 9 + bob);
    // Respirator: a snout with two filter cans.
    g.fillStyle(AN.rubber, alpha);
    g.fillRoundedRect(x - 5, y + 3 + bob, 10, 7, 3);
    for (const s of [-1, 1]) {
      g.fillStyle(AN.filter, alpha);
      g.fillCircle(x + s * 8, y + 7 + bob, 3.6);
      g.fillStyle(AN.rubber, alpha);
      g.fillCircle(x + s * 8, y + 7 + bob, 1.6);
    }
    // A biohazard sticker on the chest (unmastered — the coat covers it).
    if (!m) this.trefoil(g, x - 11, y + 16, 3.2, alpha);
  }

  private trefoil(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, alpha: number): void {
    g.fillStyle(AN.hazard, alpha);
    g.fillCircle(cx, cy, r + 1.4);
    g.fillStyle(AN.rubber, alpha);
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i / 3) * Math.PI * 2;
      g.fillCircle(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, r * 0.45);
    }
    g.fillStyle(AN.hazard, alpha);
    g.fillCircle(cx, cy, r * 0.28);
  }

  /** Mastered: the captain's coat, with epaulettes past the shoulders and tails that trail a run. */
  private drawCoat(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number, lean: number): void {
    const sway = Math.sin(this.t * 3) * 1.5;
    for (const s of [-1, 1]) {
      const coat = [
        P(x + s * 6, y - 13), P(x + s * 19, y - 13), P(x + s * 23, y - 6), P(x + s * 22, y + 8),
        P(x + s * 24 - lean + sway, y + 27), P(x + s * 12 - lean, y + 25), P(x + s * 7, y + 12),
      ];
      g.fillStyle(AN.coatDeep, alpha);
      g.fillPoints(coat, true);
      g.fillStyle(AN.coat, alpha);
      g.fillPoints(coat.map((p) => P(x + (p.x - x) * 0.92, y + 1 + (p.y - y) * 0.92)), true);
      g.fillStyle(AN.coatLit, alpha * 0.6);
      g.fillRect(x + s * 8 - (s < 0 ? 2 : 0), y - 10, 2, 20);
      // Gold lapel edge and buttons.
      g.lineStyle(1.2, AN.gold, alpha);
      g.lineBetween(x + s * 6, y - 13, x + s * 7, y + 12);
      for (let i = 0; i < 3; i++) {
        g.fillStyle(AN.gold, alpha);
        g.fillCircle(x + s * 9.5, y - 4 + i * 6, 1.3);
      }
      // Epaulette with fringe.
      g.fillStyle(AN.gold, alpha);
      g.fillEllipse(x + s * 20, y - 14, 12, 5);
      g.lineStyle(1, AN.gold, alpha * 0.9);
      for (let i = 0; i < 5; i++) {
        const fx = x + s * (15 + i * 2.4);
        g.lineBetween(fx, y - 12, fx + s * 0.6, y - 8 + Math.sin(this.t * 5 + i) * 0.6);
      }
    }
    // A sash belt over the tape.
    g.fillStyle(AN.coatDeep, alpha);
    g.fillRect(x - 20, y + 9, 40, 4);
    g.fillStyle(AN.gold, alpha);
    g.fillRect(x - 3, y + 8.5, 6, 5);
    g.fillStyle(AN.coatDeep, alpha);
    g.fillRect(x - 1.5, y + 10, 3, 2);
  }

  private drawEntityBody(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    // A black knot of sinew covering the whole disc, its edge crawling.
    const pts: Phaser.Geom.Point[] = [];
    const n = 22;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 24 + Math.sin(this.t * 11 + i * 2.7) * 1.8 + (i % 2 ? 2.4 : -1) + this.twitch(i) * 0.4;
      pts.push(P(x + Math.cos(a) * r, y + 1 + Math.sin(a) * r));
    }
    g.fillStyle(AN.entity, alpha);
    g.fillPoints(pts, true);
    // Ribs and sinew, barely there.
    g.lineStyle(1, AN.entityLit, alpha * 0.9);
    for (let i = 0; i < 4; i++) {
      const yy = y + 4 + i * 4.5;
      g.beginPath();
      g.arc(x, yy - 12, 14 - i, Math.PI * 0.2, Math.PI * 0.8, false);
      g.strokePath();
    }
    g.lineBetween(x, y - 6, x, y + 20);
  }

  // ── Extras: above the crown ─────────────────────────────────────────────

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const k = this.ent;
    if (k < 0.98) this.drawHat(g, x, y, alpha * (1 - k));
    if (k > 0.02) this.drawEntityTop(g, x, y, alpha * k);
    this.drawHeld(g, alpha);
  }

  /** The tricorn: three cocked points, gold trim, a skull and bones on the front. */
  private drawHat(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const lean = this.lean(x);
    const bob = Math.sin(this.t * 2.4) * 0.8;
    const by = y - 21 + bob;
    const hx = x + lean * 0.6;
    if (this.mastered) {
      // Plume curling back off the hat, trailing the run.
      const pl: Phaser.Geom.Point[] = [];
      for (let i = 0; i <= 8; i++) {
        const u = i / 8;
        pl.push(P(hx + 6 + u * 16 - lean * u * 1.5, by - 10 - Math.sin(u * Math.PI) * 14 + u * 4 + Math.sin(this.t * 4 + u * 3) * u * 2));
      }
      for (let i = 8; i >= 0; i--) {
        const u = i / 8;
        pl.push(P(hx + 6 + u * 16 - lean * u * 1.5, by - 6 - Math.sin(u * Math.PI) * 8 + u * 5));
      }
      g.fillStyle(AN.plume, alpha);
      g.fillPoints(pl, true);
    }
    const hat = [
      P(hx - 24, by - 6), P(hx - 14, by - 4), P(hx - 10, by - 14), P(hx - 4, by - 19),
      P(hx + 4, by - 19), P(hx + 10, by - 14), P(hx + 14, by - 4), P(hx + 24, by - 6),
      P(hx + 16, by + 1), P(hx, by + 3), P(hx - 16, by + 1),
    ];
    g.fillStyle(AN.hat, alpha);
    g.fillPoints(hat, true);
    g.fillStyle(AN.hatLit, alpha);
    g.fillPoints([P(hx - 8, by - 13), P(hx - 3, by - 17), P(hx + 3, by - 17), P(hx + 8, by - 13), P(hx, by - 6)], true);
    // Gold trim along the cocked brim.
    g.lineStyle(1.4, AN.trim, alpha);
    g.beginPath();
    g.moveTo(hx - 24, by - 6);
    g.lineTo(hx - 16, by + 1);
    g.lineTo(hx, by + 3);
    g.lineTo(hx + 16, by + 1);
    g.lineTo(hx + 24, by - 6);
    g.strokePath();
    // Skull and bones.
    const sx = hx, sy = by - 6;
    g.lineStyle(1.2, AN.bone, alpha);
    g.lineBetween(sx - 5, sy - 1, sx + 5, sy + 4);
    g.lineBetween(sx + 5, sy - 1, sx - 5, sy + 4);
    g.fillStyle(AN.bone, alpha);
    g.fillCircle(sx, sy - 1, 3);
    g.fillRect(sx - 1.6, sy + 1, 3.2, 2);
    g.fillStyle(AN.hat, alpha);
    g.fillCircle(sx - 1.1, sy - 1.3, 0.8);
    g.fillCircle(sx + 1.1, sy - 1.3, 0.8);
    if (this.mastered) {
      g.fillStyle(AN.gold, alpha);
      g.fillCircle(hx - 8, by - 2, 1.6);
    }
  }

  /** The entity above the crown: a long thin neck, an elongated twitching head, and claws. */
  private drawEntityTop(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const jx = this.twitch(1), jy = this.twitch(2) * 0.5;
    const tilt = this.twitch(3) * 0.06;
    const hx = x + jx + Math.cos(this.facing) * 3, hy = y - 52 + jy;
    // Neck, tapered.
    g.fillStyle(AN.entity, alpha);
    g.fillPoints([P(x - 5, y - 18), P(hx - 2, hy + 10), P(hx + 2, hy + 10), P(x + 5, y - 18)], true);
    // Head: a long skull, tilted by the twitch.
    const head: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const px = Math.cos(a) * 7, py = Math.sin(a) * 14 * (a > Math.PI ? 1.1 : 0.9);
      head.push(P(hx + px * Math.cos(tilt) - py * Math.sin(tilt), hy + px * Math.sin(tilt) + py * Math.cos(tilt)));
    }
    g.fillPoints(head, true);
    // Pinprick eyes up on the head, and on the "face" where the rig's eyes sit.
    g.fillStyle(AN.eyeWhite, alpha * 0.9);
    g.fillCircle(hx - 2.6 + Math.cos(this.facing) * 1.5, hy - 2, 0.9);
    g.fillCircle(hx + 2.6 + Math.cos(this.facing) * 1.5, hy - 2, 0.9);
    for (const s of [-1, 1]) {
      g.fillCircle(x + s * 7.2 + Math.cos(this.facing) * 3.5, y - 4 + Math.sin(this.facing) * 2.5, 0.8);
    }
    // Spindly arms from the shoulders to the hands, jointed, and claws past them.
    g.lineStyle(1.8, AN.entity, alpha);
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? -1 : 1;
      const sx = x + s * 14, sy = y - 14;
      const ax = this.armX[i], ay = this.armY[i];
      const ex = (sx + ax) / 2 + s * 8 + this.twitch(10 + i), ey = (sy + ay) / 2 - 10;
      g.lineBetween(sx, sy, ex, ey);
      g.lineBetween(ex, ey, ax, ay);
      for (let f = -1; f <= 1; f++) {
        const ang = this.facing + f * 0.35;
        g.lineBetween(ax, ay, ax + Math.cos(ang) * 11, ay + Math.sin(ang) * 11);
      }
    }
  }
}
