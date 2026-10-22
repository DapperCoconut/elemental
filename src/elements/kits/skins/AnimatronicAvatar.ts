import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn } from '../ElementVisuals';
import { GOLDEN, plushBlob, topHat } from './AnimatronicFx';

/**
 * The Animatronic skin's character: Clay's shaper replaced by the crying child.
 *
 * A small grey kid — a big round head of sad grey skin, a mop of dark hair, brows tipped up in
 * the middle, a frown, and two darker grey tear streaks running from under the eyes with a
 * drop forever sliding down each. He wears a faded navy-and-white striped shirt.
 *
 * **Unmastered** is just the boy, a cowlick sticking up off his crown.
 * **Mastered** he has his birthday: a striped party hat on his head and a little golden
 * Fredbear plush (purple hat and bow) hugged against his chest — taller silhouette, extra
 * shape at the chest, and a warm gold glow where there was only grey.
 *
 * Fused with the golem (Clay's Fuse), the boy is wearing the bear: gold ears and the black top
 * hat over his head, with the remaining layers shown as gold buttons on a board above.
 */

const KID = {
  skin: 0x9a9aa2,
  skinShade: 0x74747d,
  skinDeep: 0x56565e,
  skinLit: 0xc0c0c7,
  tear: 0x3d3d45,
  tearLit: 0x5d5d68,
  hair: 0x34302f,
  hairLit: 0x55504c,
  shirtLight: 0xd3d6dc,
  shirtDark: 0x4a5a73,
  shirtShade: 0x2c3444,
  mouth: 0x26262b,
  eye: 0xe2e2e8,
  pupil: 0x17171b,
  hatA: 0x6d5a90,
  hatB: 0xd9b84c,
  pom: 0xf3ead2,
};

/** Small grey hands. */
const KID_AVATAR: AvatarSpec = {
  hands: [
    { r: 9, color: 0x2a2a30, alpha: 0.25 },
    { r: 6.6, color: KID.skinShade, alpha: 1 },
    { r: 5, color: KID.skin, alpha: 1, ox: -0.6, oy: -0.6 },
    { r: 1.8, color: KID.skinLit, alpha: 0.85, ox: -2, oy: -2.2 },
  ],
  eyeWhite: KID.eye,
  eyePupil: KID.pupil,
  squash: { div: 12, x: 0.45, y: 0.26 },
};

const HEAD_Y = -6;
const HEAD_R = 19;
const SHIRT_TOP = 4;
const SHIRT_BOT = 24;

function shirtHalf(yRel: number): number {
  const u = Phaser.Math.Clamp((yRel - SHIRT_TOP) / (SHIRT_BOT - SHIRT_TOP), 0, 1);
  return 18 + 4 * u;
}

/** A quad of the shirt between two heights, following its flare. */
function shirtBand(g: Phaser.GameObjects.Graphics, x: number, y: number, y0: number, y1: number, inset = 0): void {
  const h0 = shirtHalf(y0) - inset, h1 = shirtHalf(y1) - inset;
  g.fillPoints([
    new Phaser.Geom.Point(x - h0, y + y0), new Phaser.Geom.Point(x + h0, y + y0),
    new Phaser.Geom.Point(x + h1, y + y1), new Phaser.Geom.Point(x - h1, y + y1),
  ], true);
}

/** A tapered tear streak, wider at the bottom where it pools. */
function tearStreak(g: Phaser.GameObjects.Graphics, x: number, y0: number, len: number, w: number, wobble: number): void {
  const steps = 8;
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    pts.push(new Phaser.Geom.Point(x - w * (0.35 + 0.65 * u) + Math.sin(u * 3 + wobble) * 0.6, y0 + len * u));
  }
  for (let i = steps; i >= 0; i--) {
    const u = i / steps;
    pts.push(new Phaser.Geom.Point(x + w * (0.35 + 0.65 * u) + Math.sin(u * 3 + wobble) * 0.6, y0 + len * u));
  }
  g.fillPoints(pts, true);
}

class TearFx extends FxBase {
  /** A tear shaken loose by a fast hand, falling and splashing. */
  drop(x: number, y: number): void {
    const dx = (Math.random() - 0.5) * 10;
    this.anim(5, 420, (g, t) => {
      const e = easeIn(t);
      const px = x + dx * t, py = y + e * 22;
      g.fillStyle(KID.tear, 0.8 * (1 - t * 0.5));
      g.fillCircle(px, py, 2.2);
      g.fillTriangle(px - 2, py - 0.6, px + 2, py - 0.6, px, py - 5);
      g.fillStyle(KID.tearLit, 0.7 * (1 - t));
      g.fillCircle(px - 0.6, py - 0.6, 0.8);
    });
  }
}

export class AnimatronicAvatar extends BaseAvatar {
  private fx: TearFx;
  private fusedOn = false;
  private layers = 8;
  private maxLayers = 8;

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, KID_AVATAR);
    this.fx = new TearFx(scene, (c) => c);
  }

  /** Clay's Fuse readout — the kit calls this on whichever rig is standing up. */
  setFused(on: boolean, layers = 8, max = 8): void {
    this.fusedOn = on;
    this.layers = layers;
    this.maxLayers = max;
  }

  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? 0xf2efe2 : KID.eye);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 11 : 9);
      halo.setFillStyle(on ? GOLDEN.lit : 0x2a2a30, on ? 0.22 : 0.25);
    });
  }

  protected emitTrail(x: number, y: number): void {
    this.fx.drop(x, y);
  }

  /** A grey floor shadow; mastered, a little warm gold light from the plush. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    g.fillStyle(0x1c1c22, a * 0.4);
    g.fillEllipse(x + 2, y + 25, 50, 14);
    g.fillStyle(0x8c96aa, a * 0.1 * this.intensity);
    g.fillCircle(x, y, 28);
    if (this.mastered || this.fusedOn) {
      const p = 0.5 + 0.5 * Math.sin(this.t * 2.2);
      g.fillStyle(GOLDEN.lit, a * (0.12 + p * 0.06));
      g.fillCircle(x - 10, y + 12, 24);
    }
  }

  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    // ── Shirt: navy and white stripes, shadow down the right side ──
    g.fillStyle(KID.shirtShade, alpha);
    shirtBand(g, x + 1.5, y + 1.5, SHIRT_TOP, SHIRT_BOT);
    g.fillStyle(KID.shirtLight, alpha);
    shirtBand(g, x, y, SHIRT_TOP, SHIRT_BOT);
    g.fillEllipse(x - 15, y + SHIRT_TOP + 3, 12, 9);
    g.fillEllipse(x + 15, y + SHIRT_TOP + 3, 12, 9);
    g.fillStyle(KID.shirtDark, alpha);
    for (let sy = SHIRT_TOP + 2; sy < SHIRT_BOT - 1; sy += 6) shirtBand(g, x, y, sy, Math.min(SHIRT_BOT, sy + 3));
    g.fillStyle(KID.shirtShade, alpha * 0.35);
    g.fillPoints([
      new Phaser.Geom.Point(x + 8, y + SHIRT_TOP), new Phaser.Geom.Point(x + shirtHalf(SHIRT_TOP), y + SHIRT_TOP),
      new Phaser.Geom.Point(x + shirtHalf(SHIRT_BOT), y + SHIRT_BOT), new Phaser.Geom.Point(x + 10, y + SHIRT_BOT),
    ], true);
    g.fillStyle(KID.shirtShade, alpha * 0.6);
    g.fillEllipse(x, y + SHIRT_BOT, shirtHalf(SHIRT_BOT) * 2, 4);

    // ── Head ──
    const hy = y + HEAD_Y;
    for (const side of [-1, 1]) {
      g.fillStyle(KID.skinShade, alpha);
      g.fillCircle(x + side * 18.5, hy + 2, 4.4);
      g.fillStyle(KID.skinDeep, alpha * 0.7);
      g.fillCircle(x + side * 18.8, hy + 2, 2);
    }
    g.fillStyle(KID.skinDeep, alpha);
    g.fillCircle(x + 1.5, hy + 1.5, HEAD_R);
    g.fillStyle(KID.skin, alpha);
    g.fillCircle(x, hy, HEAD_R);
    g.fillStyle(KID.skinShade, alpha * 0.45);
    g.fillEllipse(x + 8, hy + 8, 18, 14);
    g.fillStyle(KID.skinLit, alpha * 0.4);
    g.fillEllipse(x - 7, hy - 8, 16, 9);

    // Puffy, darkened under-eyes.
    for (const side of [-1, 1]) {
      g.lineStyle(1.4, KID.skinDeep, alpha * 0.7);
      g.beginPath();
      g.arc(x + side * 7.2, y - 3.5, 5.4, Math.PI * 0.2, Math.PI * 0.8, false);
      g.strokePath();
    }

    // Tear streaks, each with a drop sliding down it.
    for (const side of [-1, 1]) {
      const tx = x + side * 7.6;
      g.fillStyle(KID.tear, alpha * 0.85);
      tearStreak(g, tx, y - 0.5, 12, 1.6, side);
      const ph = (this.t * 0.55 + (side > 0 ? 0.5 : 0)) % 1;
      const dy = y + 1 + ph * 13;
      g.fillStyle(KID.tear, alpha * (1 - ph * 0.4));
      g.fillCircle(tx + Math.sin(ph * 3 + side) * 0.6, dy, 1.9);
      g.fillStyle(KID.tearLit, alpha * 0.8 * (1 - ph));
      g.fillCircle(tx - 0.5, dy - 0.6, 0.7);
    }

    // The frown, trembling a little.
    const quiver = Math.sin(this.t * 13) * 0.35;
    g.lineStyle(1.6, KID.mouth, alpha);
    g.beginPath();
    g.arc(x, y + 11.5 + quiver, 5, Math.PI * 1.18, Math.PI * 1.82, false);
    g.strokePath();

    // Sad brows, tipped up toward the middle.
    g.lineStyle(1.6, KID.hair, alpha * 0.9);
    g.lineBetween(x - 12, y - 10, x - 4, y - 12.5);
    g.lineBetween(x + 12, y - 10, x + 4, y - 12.5);

    // ── Hair: a dark mop with a ragged fringe that stops above the brows ──
    const hairPts: Phaser.Geom.Point[] = [];
    const top = hy - HEAD_R - 1.5;
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI + (i / 12) * Math.PI;
      hairPts.push(new Phaser.Geom.Point(x + Math.cos(a) * (HEAD_R + 1.2), hy + Math.sin(a) * (HEAD_R + 1.5) + (i === 0 || i === 12 ? 3 : 0)));
    }
    // Fringe back along the bottom edge, right to left, in jagged points.
    const fringe = [17, 13, 9, 5, 1, -3, -7, -11, -15, -18];
    for (let i = 0; i < fringe.length; i++) {
      const fx = x + fringe[i];
      const fy = i % 2 ? y - 14.5 : y - 18;
      hairPts.push(new Phaser.Geom.Point(fx, fy));
    }
    g.fillStyle(KID.hair, alpha);
    g.fillPoints(hairPts, true);
    g.fillStyle(KID.hairLit, alpha * 0.55);
    g.fillEllipse(x - 6, top + 5, 14, 4);
    void top;

    if (this.mastered && !this.fusedOn) this.drawPlush(g, x - 11, y + 14, alpha);
    if (this.fusedOn) {
      // Wearing the bear: gold fur patches over the shirt.
      g.fillStyle(GOLDEN.body, alpha * 0.9);
      plushBlob(g, x, y + 16, 15, 8);
      g.fillStyle(GOLDEN.belly, alpha * 0.85);
      plushBlob(g, x, y + 17, 9, 5);
      g.fillStyle(GOLDEN.black, alpha);
      g.fillTriangle(x, y + 7, x - 6, y + 4.5, x - 6, y + 9.5);
      g.fillTriangle(x, y + 7, x + 6, y + 4.5, x + 6, y + 9.5);
    }
  }

  /** The little Fredbear plush hugged to the chest: gold bear, purple hat and bow. */
  private drawPlush(g: Phaser.GameObjects.Graphics, px: number, py: number, alpha: number): void {
    const sway = Math.sin(this.t * 1.8) * 0.6;
    // Body.
    g.fillStyle(GOLDEN.deep, alpha);
    plushBlob(g, px + 1, py + 4, 7, 6.5);
    g.fillStyle(GOLDEN.body, alpha);
    plushBlob(g, px, py + 3.5, 6.5, 6);
    g.fillStyle(GOLDEN.belly, alpha);
    g.fillEllipse(px, py + 5, 7, 6);
    // Head.
    const hx = px + sway, hy = py - 5;
    g.fillStyle(GOLDEN.deep, alpha);
    g.fillCircle(hx - 5, hy - 4.5, 2.6);
    g.fillCircle(hx + 5, hy - 4.5, 2.6);
    g.fillStyle(GOLDEN.body, alpha);
    g.fillCircle(hx, hy, 6.2);
    g.fillStyle(GOLDEN.lit, alpha * 0.6);
    g.fillEllipse(hx - 2, hy - 2.5, 5, 2.4);
    g.fillStyle(GOLDEN.belly, alpha);
    g.fillEllipse(hx, hy + 2.4, 6, 3.6);
    g.fillStyle(GOLDEN.black, alpha);
    g.fillCircle(hx - 2.3, hy - 1, 0.9);
    g.fillCircle(hx + 2.3, hy - 1, 0.9);
    g.fillEllipse(hx, hy + 1.6, 2.4, 1.4);
    // Purple top hat and bow.
    topHat(g, hx + 0.6, hy - 5.2, 0.4, alpha, GOLDEN.plum, GOLDEN.plumLit);
    g.fillStyle(GOLDEN.plum, alpha);
    g.fillTriangle(hx, hy + 5.6, hx - 3.4, hy + 4, hx - 3.4, hy + 7.2);
    g.fillTriangle(hx, hy + 5.6, hx + 3.4, hy + 4, hx + 3.4, hy + 7.2);
    // A stitched seam, and the boy's thumb over its arm.
    g.lineStyle(0.7, GOLDEN.deep, alpha * 0.8);
    g.lineBetween(px, py + 1, px, py + 8);
    g.fillStyle(KID.skin, alpha);
    g.fillCircle(px + 6, py + 4, 2.6);
    g.fillStyle(KID.skinLit, alpha * 0.6);
    g.fillCircle(px + 5.4, py + 3.4, 1);
  }

  /** Above the crown (`y - 18` and up): cowlick, party hat, or — fused — the bear's ears and hat. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const crown = y + HEAD_Y - HEAD_R;
    const lean = Math.cos(this.facing) * 1.2;
    if (this.fusedOn) {
      for (const side of [-1, 1]) {
        const ex = x + side * 13, ey = crown + 4;
        g.fillStyle(GOLDEN.deep, alpha);
        g.fillCircle(ex, ey, 6);
        g.fillStyle(GOLDEN.body, alpha);
        g.fillCircle(ex - 0.4, ey - 0.4, 5.4);
        g.fillStyle(GOLDEN.dark, alpha * 0.85);
        g.fillCircle(ex, ey + 0.4, 2.8);
      }
      topHat(g, x + 2 + lean, crown + 1, 0.85, alpha);
    } else if (this.mastered) {
      // Party hat: a striped cone cocked on the crown, a pom-pom on top.
      const bx = x + 3 + lean, by = crown + 3;
      const tipX = bx + 4, tipY = by - 22;
      const half = 8;
      g.fillStyle(KID.hatA, alpha);
      g.fillTriangle(bx - half, by, bx + half, by, tipX, tipY);
      g.fillStyle(KID.hatB, alpha);
      for (let k = 0; k < 3; k++) {
        const u0 = 0.15 + k * 0.28, u1 = u0 + 0.12;
        const l0x = Phaser.Math.Linear(bx - half, tipX, u0), l0y = Phaser.Math.Linear(by, tipY, u0);
        const r0x = Phaser.Math.Linear(bx + half, tipX, u0);
        const l1x = Phaser.Math.Linear(bx - half, tipX, u1), l1y = Phaser.Math.Linear(by, tipY, u1);
        const r1x = Phaser.Math.Linear(bx + half, tipX, u1);
        g.fillPoints([
          new Phaser.Geom.Point(l0x, l0y), new Phaser.Geom.Point(r0x, l0y),
          new Phaser.Geom.Point(r1x, l1y), new Phaser.Geom.Point(l1x, l1y),
        ], true);
      }
      g.fillStyle(0x000000, alpha * 0.18);
      g.fillTriangle(bx + 1, by, bx + half, by, tipX, tipY);
      const bounce = Math.sin(this.t * 4) * 0.8;
      g.fillStyle(KID.pom, alpha);
      g.fillCircle(tipX, tipY - 1.5 + bounce, 3.4);
      g.fillStyle(0xffffff, alpha * 0.7);
      g.fillCircle(tipX - 1, tipY - 2.5 + bounce, 1.1);
    } else {
      // A cowlick sticking up off the crown.
      const sway = Math.sin(this.t * 2.3) * 1.2;
      const pts: Phaser.Geom.Point[] = [];
      const bx = x + 2 + lean, by = crown + 2;
      for (let i = 0; i <= 6; i++) {
        const u = i / 6;
        pts.push(new Phaser.Geom.Point(bx - 2.2 * (1 - u) + sway * u * u + Math.sin(u * TAU * 0.5) * 3, by - 9 * u));
      }
      for (let i = 6; i >= 0; i--) {
        const u = i / 6;
        pts.push(new Phaser.Geom.Point(bx + 2.2 * (1 - u) + sway * u * u + Math.sin(u * TAU * 0.5) * 3, by - 9 * u));
      }
      g.fillStyle(KID.hair, alpha);
      g.fillPoints(pts, true);
    }

    // Fused: the remaining layers, as gold buttons on a grey board over the head.
    if (this.fusedOn) {
      const py = crown - 22;
      const w = this.maxLayers * 9 + 6;
      g.fillStyle(0x1d1c1b, alpha * 0.85);
      g.fillRoundedRect(x - w / 2, py + 3, w, 4, 2);
      g.fillStyle(0x4b4741, alpha);
      g.fillRoundedRect(x - w / 2, py + 2.5, w, 2.5, 1.5);
      for (let i = 0; i < this.maxLayers; i++) {
        const px = x - (this.maxLayers - 1) * 4.5 + i * 9;
        if (i < this.layers) {
          g.fillStyle(GOLDEN.deep, alpha);
          g.fillCircle(px, py - 1.5, 3.8);
          g.fillStyle(GOLDEN.lit, alpha);
          g.fillCircle(px - 0.3, py - 1.8, 3.2);
          g.fillStyle(GOLDEN.hi, alpha * 0.8);
          g.fillCircle(px - 1.2, py - 2.8, 1);
        } else {
          g.fillStyle(0x232327, alpha * 0.6);
          g.fillEllipse(px, py + 1, 6, 3);
        }
      }
    }
  }
}
