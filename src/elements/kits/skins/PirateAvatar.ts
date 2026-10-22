import Phaser from 'phaser';
import { ArmHold, ArmPose, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from '../ElementVisuals';
import { RUBBER, rubberStrandLayered, strandWidthFor } from '../RubberVisuals';

/**
 * The Pirate skin's character: Rubber's gum creature replaced by a straw-hat rubber captain.
 *
 * **Unmastered** — the captain as he sets out: a straw hat with a red band riding on a mop of
 * black hair, an open red vest over a bare chest, blue rolled-cuff shorts and a yellow sash,
 * a stitched scar under the left eye and a grin. His arms are bare rubber, and they stretch.
 *
 * **Mastered** — the awakened, sun-god form: the hat comes off and hangs on his back, his hair
 * goes white and stands up in a plume of curling flame-like locks, his clothes bleach to cloud
 * white, and a ring of clouds wraps his shoulders and waist. A different silhouette entirely —
 * the crown is a rising plume instead of a flat brim.
 *
 * Takes no colour mapper (see `SkinAvatars.ts`): this palette is already the final one.
 */

export const PIRATE = {
  skinDeep: 0x8a5230,
  skinShade: 0xc98a5a,
  skin: 0xf2c08a,
  skinLit: 0xffdcb2,
  vestShade: 0x8e1c16,
  vest: 0xd8342a,
  vestLit: 0xf0564a,
  button: 0xf4d26a,
  shortsShade: 0x1c3a6e,
  shorts: 0x2f5fa8,
  shortsLit: 0x4f82c8,
  cuff: 0xf4efe2,
  sashShade: 0xb08a1c,
  sash: 0xf0c43a,
  strawDeep: 0x8a6028,
  strawShade: 0xc8944a,
  straw: 0xf0c27a,
  strawLit: 0xfbe2a6,
  bandShade: 0x7a1010,
  band: 0xc8201c,
  hair: 0x15110f,
  hairLit: 0x3a302a,
  scar: 0x8a3a2a,
  mouth: 0x4a140e,
  teeth: 0xfffaf0,
  haki: 0x121018,
  hakiSheen: 0x6a5a9a,
  ember: 0xff4f14,
  flame: 0xff8a36,
  gold: 0xffd47a,
  sea: 0x2f6fb0,
  /** The awakened form: everything bleached to cloud. */
  g5Deep: 0xa89cc8,
  g5Shade: 0xd6cfe8,
  g5: 0xfbf8ff,
  cloud: 0xffffff,
  white: 0xffffff,
};

/**
 * A colour mapper that lets Rubber's own strand/ball/fist primitives paint skin or haki: they
 * call `tint(RUBBER.gum)` for their backing, `cream` for gloss, `pink` for a fist's rim and
 * `white` for the specular — routed here onto the given shades; any other colour passes through.
 */
export function primTint(shadow: number, lit: number, rim: number, spec: number = PIRATE.white): ColorFn {
  return (c) => {
    if (c === RUBBER.gum) return shadow;
    if (c === RUBBER.cream) return lit;
    if (c === RUBBER.pink) return rim;
    if (c === RUBBER.white) return spec;
    return c;
  };
}
/** Bare rubber skin. */
export const SKIN_TINT = primTint(PIRATE.skinDeep, PIRATE.skinLit, PIRATE.skinShade);
/** Armament-black, for a cured (hot) fist. */
export const HAKI_TINT = primTint(0x000000, PIRATE.hakiSheen, 0x3a2e5a, 0xb8a8e8);

/** Bare fists: knuckles in tan skin, outermost first, with an off-centre glint. */
const PIRATE_AVATAR: AvatarSpec = {
  hands: [
    { r: 11, color: PIRATE.straw, alpha: 0.18 },
    { r: 8, color: PIRATE.skinShade, alpha: 1 },
    { r: 6, color: PIRATE.skin, alpha: 1 },
    { r: 2.2, color: PIRATE.skinLit, alpha: 1, ox: -2.2, oy: -2.4 },
  ],
  eyeWhite: PIRATE.teeth,
  eyePupil: PIRATE.hair,
  // Rubber arms: loose springs, long smear — same feel as the element's own rig.
  squash: { div: 9, x: 0.78, y: 0.42 },
};

type P = Phaser.Geom.Point;
const pt = (x: number, y: number): P => new Phaser.Geom.Point(x, y);

// ── Shared hat drawing (the rig, and the hat Rubber Banding plants) ───────

/**
 * The straw hat, seen from the front and a little above: a wide brim, a domed crown and the
 * red band round its base. `spin` (radians) turns the weave + band highlight, so a hat that is
 * rolling or flying visibly spins; `squash` < 1 flattens the brim toward edge-on.
 */
export function strawHat(
  g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number, tilt: number,
  alpha: number, spin = 0, squash = 1,
): void {
  const s = scale;
  const cos = Math.cos(tilt), sin = Math.sin(tilt);
  const at = (lx: number, ly: number): P => pt(x + lx * cos - ly * sin, y + lx * sin + ly * cos);
  const ellipse = (cx: number, cy: number, rx: number, ry: number, from = 0, to = TAU, n = 24): P[] => {
    const out: P[] = [];
    for (let i = 0; i <= n; i++) {
      const a = from + (to - from) * (i / n);
      out.push(at(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry));
    }
    return out;
  };
  const brimRx = 29 * s, brimRy = 6.5 * s * squash;

  // Drop shadow and the underside of the brim.
  g.fillStyle(PIRATE.strawDeep, alpha * 0.55);
  g.fillPoints(ellipse(1.2 * s, 2 * s, brimRx, brimRy), true);
  g.fillStyle(PIRATE.strawShade, alpha);
  g.fillPoints(ellipse(0, 0.8 * s, brimRx, brimRy), true);
  g.fillStyle(PIRATE.straw, alpha);
  g.fillPoints(ellipse(0, 0, brimRx * 0.98, brimRy * 0.86), true);

  // Crown: a dome, wider at the band than at the top, built as one outline.
  const crown: P[] = [];
  const cw = 14.5 * s, ch = 14 * s;
  for (let i = 0; i <= 14; i++) {
    const u = i / 14;
    const a = Math.PI + u * Math.PI;
    crown.push(at(Math.cos(a) * cw * (1 - 0.1 * Math.sin(u * Math.PI)), -2 * s + Math.sin(a) * ch));
  }
  crown.push(at(cw, -1 * s));
  crown.push(at(-cw, -1 * s));
  g.fillStyle(PIRATE.strawShade, alpha);
  g.fillPoints(crown.map((p) => pt(p.x + 1.4 * s, p.y + 0.6 * s)), true);
  g.fillStyle(PIRATE.straw, alpha);
  g.fillPoints(crown, true);
  // Lit dome, top-left.
  g.fillStyle(PIRATE.strawLit, alpha * 0.8);
  g.fillPoints(ellipse(-4.5 * s, -10 * s, 6 * s, 3.4 * s, 0, TAU, 14), true);

  // The red band round the base of the crown, curved to wrap it.
  const band: P[] = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    band.push(at(-cw + u * cw * 2, -6.2 * s + Math.sin(u * Math.PI) * 1.4 * s));
  }
  for (let i = 12; i >= 0; i--) {
    const u = i / 12;
    band.push(at(-cw + u * cw * 2, -1.6 * s + Math.sin(u * Math.PI) * 1.8 * s));
  }
  g.fillStyle(PIRATE.band, alpha);
  g.fillPoints(band, true);
  g.fillStyle(PIRATE.bandShade, alpha * 0.6);
  const bandLow = band.slice(13).map((p) => pt(p.x, p.y - 1.2 * s));
  g.fillPoints(band.slice(13).concat(bandLow.reverse()), true);
  // A sliding highlight on the band — it moves with the spin so a turning hat reads as turning.
  const hl = Math.sin(spin) * cw * 0.6;
  g.fillStyle(0xff7a6a, alpha * 0.7);
  g.fillPoints(ellipse(hl, -4.6 * s, 3.2 * s, 0.9 * s, 0, TAU, 10), true);

  // Weave: short strokes across the crown and radial ones round the brim.
  g.lineStyle(Math.max(0.8, 0.9 * s), PIRATE.strawDeep, alpha * 0.45);
  for (let r = 0; r < 2; r++) {
    const yy = -9 * s - r * 3.6 * s;
    const ww = cw * (0.8 - r * 0.22);
    g.beginPath();
    const a0 = at(-ww, yy), a1 = at(0, yy - 1.4 * s), a2 = at(ww, yy);
    g.moveTo(a0.x, a0.y); g.lineTo(a1.x, a1.y); g.lineTo(a2.x, a2.y);
    g.strokePath();
  }
  for (let i = 0; i < 9; i++) {
    const a = spin + (i / 9) * TAU;
    if (Math.sin(a) < -0.15) continue; // the back of the brim is hidden behind the crown
    const p0 = at(Math.cos(a) * brimRx * 0.6, Math.sin(a) * brimRy * 0.6);
    const p1 = at(Math.cos(a) * brimRx * 0.95, Math.sin(a) * brimRy * 0.95);
    g.lineBetween(p0.x, p0.y, p1.x, p1.y);
  }
  // Frayed straw ends poking off the brim edge.
  g.lineStyle(Math.max(0.8, s), PIRATE.strawShade, alpha * 0.85);
  for (let i = 0; i < 6; i++) {
    const a = 0.25 + i * 0.5 + spin * 0.2;
    const p0 = at(Math.cos(a) * brimRx, Math.sin(a) * brimRy);
    const p1 = at(Math.cos(a) * (brimRx + 2.6 * s), Math.sin(a) * (brimRy + 1.6 * s));
    g.lineBetween(p0.x, p0.y, p1.x, p1.y);
  }
}

// ── Rig Fx ────────────────────────────────────────────────────────────────

class PirateRigFx extends FxBase {
  constructor(scene: Phaser.Scene) { super(scene, (c) => c); }

  /** A wisp of straw dust off a fast fist. */
  strawMote(x: number, y: number): void {
    const dx = (Math.random() - 0.5) * 20, dy = (Math.random() - 0.5) * 12;
    const rot = Math.random() * TAU;
    this.anim(5, 420, (g, t) => {
      const f = 1 - t;
      const px = x + dx * easeOut(t), py = y + dy * easeOut(t) + 6 * t;
      g.lineStyle(1.4, PIRATE.straw, 0.85 * f);
      g.lineBetween(px - Math.cos(rot + t * 3) * 3, py - Math.sin(rot + t * 3) * 3,
        px + Math.cos(rot + t * 3) * 3, py + Math.sin(rot + t * 3) * 3);
    });
  }

  /** A little cloud puff peeling off an awakened fist. */
  cloudPuff(x: number, y: number): void {
    const dx = (Math.random() - 0.5) * 18;
    const r = 2.6 + Math.random() * 2;
    this.anim(5, 560, (g, t) => {
      const f = 1 - t;
      const px = x + dx * easeOut(t), py = y - 18 * easeIn(t);
      const rr = r * (1 + t * 0.8);
      g.fillStyle(PIRATE.g5Shade, 0.6 * f);
      g.fillCircle(px + 0.8, py + 0.8, rr);
      g.fillStyle(PIRATE.cloud, 0.85 * f);
      g.fillCircle(px, py, rr);
      g.fillCircle(px - rr * 0.8, py + rr * 0.3, rr * 0.7);
      g.fillCircle(px + rr * 0.8, py + rr * 0.3, rr * 0.7);
    });
  }
}

// ── PirateAvatar ──────────────────────────────────────────────────────────

export class PirateAvatar extends BaseAvatar {
  private fx: PirateRigFx;
  private trailFlip = false;

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, PIRATE_AVATAR);
    this.fx = new PirateRigFx(scene);
  }

  /** Awakened: brighter eyes, and a wide cloud-white corona round each fist. */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? PIRATE.white : PIRATE.teeth);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 15 : 11);
      halo.setFillStyle(on ? PIRATE.cloud : PIRATE.straw, on ? 0.34 : 0.18);
    });
  }

  protected emitTrail(x: number, y: number): void {
    this.trailFlip = !this.trailFlip;
    if (this.mastered) this.fx.cloudPuff(x, y);
    else if (this.trailFlip) this.fx.strawMote(x, y);
  }

  /** Both fists hauled back behind the shoulders, shaking — the wind-up for every gum-gum shot. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    const strain = 0.5 + 0.5 * Math.sin(this.t * 9);
    return {
      ang: this.facing + Math.PI + side * (0.5 + strain * 0.2),
      dist: 30 + strain * 8,
      scale: idle.scale * (1.15 + strain * 0.2),
    };
  }

  /** Lean off the lagging hands — a hat at a run tips back against the wind. */
  private lean(x: number): number {
    const mean = (this.armX[0] + this.armX[1]) / 2;
    return Phaser.Math.Clamp((mean - x) * 0.012, -0.22, 0.22);
  }

  // ── Layers ──────────────────────────────────────────────────────────────

  /** Shadow, the stretchy bare arms (under the sprite so they never cross the face), and — once
   *  awakened — a sun-white halo and the straw hat hanging down his back. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const k = this.intensity;
    g.fillStyle(PIRATE.skinDeep, a * 0.3 * k);
    g.fillEllipse(x, y + 22, 50 * k, 13 * k);

    if (this.mastered) {
      const pulse = 0.85 + 0.15 * Math.sin(this.t * 2.4);
      g.fillStyle(PIRATE.cloud, a * 0.14 * pulse * k);
      g.fillCircle(x, y - 6, 46 * k);
      g.fillStyle(PIRATE.g5Shade, a * 0.12 * pulse * k);
      g.fillCircle(x, y - 6, 32 * k);
      // The hat, slung on its cord down his back: peeking out past one shoulder.
      const sway = Math.sin(this.t * 1.7) * 0.08;
      g.lineStyle(1.2, PIRATE.strawDeep, alpha * 0.8);
      g.lineBetween(x - 10, y + 4, x + 12, y + 14);
      strawHat(g, x + 15, y + 15, 0.78, 0.55 + sway, alpha);
    }

    // Bare rubber arms from the shoulders out to the fists, thinning as they reach.
    for (let i = 0; i < 2; i++) {
      const hx = this.armX[i], hy = this.armY[i];
      if (hx === 0 && hy === 0) continue;
      const rootX = x + (i === 0 ? -13 : 13), rootY = y + 6;
      const reach = Math.hypot(hx - rootX, hy - rootY);
      const w = strandWidthFor(4.8 * k, Math.max(0, reach / 26 - 1));
      const bow = Phaser.Math.Clamp((reach - 22) * 0.35, -12, 12) * (i === 0 ? 1 : -1);
      rubberStrandLayered(g, SKIN_TINT, rootX, rootY, hx, hy, w * 1.35, w,
        bow + Math.sin(this.t * 5 + i * 2) * 2.4, PIRATE.skin, alpha * 0.97);
    }
  }

  /** Head, chest, vest, sash and shorts — under the eyes, so the face stays clear. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const m = this.mastered;
    const shortsC = m ? PIRATE.g5Shade : PIRATE.shorts;
    const shortsS = m ? PIRATE.g5Deep : PIRATE.shortsShade;
    const shortsL = m ? PIRATE.g5 : PIRATE.shortsLit;

    // ── Shorts: a flared trapezoid with a leg split, rolled white cuffs ──
    const legs: P[] = [
      pt(x - 19, y + 13), pt(x + 19, y + 13),
      pt(x + 24, y + 25), pt(x + 3, y + 26), pt(x, y + 21.5), pt(x - 3, y + 26), pt(x - 24, y + 25),
    ];
    g.fillStyle(shortsS, alpha);
    g.fillPoints(legs.map((p) => pt(p.x + 1.5, p.y + 1)), true);
    g.fillStyle(shortsC, alpha);
    g.fillPoints(legs, true);
    g.fillStyle(shortsL, alpha * 0.55);
    g.fillPoints([pt(x - 16, y + 14), pt(x - 9, y + 14), pt(x - 12, y + 24), pt(x - 20, y + 24)], true);
    // Fluffy cuffs — fur reads as beads, not as a band.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const cx = x + side * (5.5 + i * 5.6);
        g.fillStyle(m ? PIRATE.g5Deep : 0xc8c2b0, alpha);
        g.fillCircle(cx + 0.6, y + 26.2, 3.1);
        g.fillStyle(m ? PIRATE.cloud : PIRATE.cuff, alpha);
        g.fillCircle(cx, y + 25.6, 2.9);
      }
    }

    // ── Head + chest: one rounded tan mass, shadow side first ──
    const torso = (ox: number, oy: number, sc: number): P[] => {
      const out: P[] = [];
      for (let i = 0; i < 28; i++) {
        const t = (i / 28) * TAU;
        const c = Math.cos(t), s = Math.sin(t);
        // Squarer lower half (shoulders), round upper half (head).
        const e = s > 0 ? 0.62 : 0.9;
        const rx = 21.5 * sc, ry = (s > 0 ? 17 : 22) * sc;
        out.push(pt(x + ox + Math.sign(c) * Math.pow(Math.abs(c), e) * rx,
          y - 1 + oy + Math.sign(s) * Math.pow(Math.abs(s), e) * ry));
      }
      return out;
    };
    g.fillStyle(PIRATE.skinShade, alpha);
    g.fillPoints(torso(1.8, 1, 1), true);
    g.fillStyle(PIRATE.skin, alpha);
    g.fillPoints(torso(0, 0, 1), true);
    g.fillStyle(PIRATE.skinLit, alpha * 0.45);
    g.fillEllipse(x - 8, y - 14, 13, 7);

    // ── Open vest: two panels hanging off the shoulders, a bare V down the middle ──
    const vestC = m ? PIRATE.g5 : PIRATE.vest;
    const vestS = m ? PIRATE.g5Deep : PIRATE.vestShade;
    const vestL = m ? PIRATE.cloud : PIRATE.vestLit;
    for (const side of [-1, 1]) {
      const panel: P[] = [
        pt(x + side * 22.5, y + 5), pt(x + side * 15, y + 6), pt(x + side * 10.5, y + 7.5),
        pt(x + side * 6, y + 12), pt(x + side * 4.5, y + 16.5), pt(x + side * 21.5, y + 16.5),
        pt(x + side * 23, y + 11),
      ];
      g.fillStyle(vestS, alpha);
      g.fillPoints(panel.map((p) => pt(p.x + 1, p.y + 1)), true);
      g.fillStyle(vestC, alpha);
      g.fillPoints(panel, true);
      g.fillStyle(vestL, alpha * 0.55);
      g.fillPoints([pt(x + side * 21, y + 6), pt(x + side * 15.5, y + 7), pt(x + side * 17, y + 15), pt(x + side * 21.5, y + 15)], true);
    }
    if (!m) {
      // Brass-yellow buttons down the open edge.
      for (const [bx, by] of [[-9.6, 9.4], [-7.4, 13.2]] as const) {
        g.fillStyle(PIRATE.sashShade, alpha);
        g.fillCircle(x + bx + 0.4, y + by + 0.4, 1.5);
        g.fillStyle(PIRATE.button, alpha);
        g.fillCircle(x + bx, y + by, 1.3);
      }
      // The X scar on the chest, in the open V.
      g.lineStyle(1.3, PIRATE.scar, alpha * 0.85);
      g.lineBetween(x - 2.6, y + 9.6, x + 2.6, y + 14.2);
      g.lineBetween(x + 2.6, y + 9.6, x - 2.6, y + 14.2);
    }

    // ── Sash / cloud belt ──
    if (m) {
      this.cloudRing(g, x, y + 15, 26, 5, alpha, 0);
      this.cloudRing(g, x, y + 4, 25, 4.6, alpha, 1.3);
    } else {
      g.fillStyle(PIRATE.sashShade, alpha);
      g.fillRoundedRect(x - 21, y + 14.5, 42, 5, 2);
      g.fillStyle(PIRATE.sash, alpha);
      g.fillRoundedRect(x - 21, y + 13.8, 42, 4.2, 2);
      // Knot and tail on his right hip.
      g.fillStyle(PIRATE.sash, alpha);
      g.fillPoints([pt(x + 13, y + 15), pt(x + 18, y + 17), pt(x + 16, y + 24), pt(x + 13.5, y + 23.5)], true);
      g.fillStyle(PIRATE.sashShade, alpha);
      g.fillCircle(x + 14, y + 16, 2.2);
    }

    // ── Face: the scar under his left eye, and the grin ──
    g.lineStyle(1.2, PIRATE.scar, alpha * 0.9);
    g.beginPath();
    g.moveTo(x - 11.5, y + 1.2);
    g.lineTo(x - 8, y + 2.6);
    g.lineTo(x - 4.8, y + 1.8);
    g.strokePath();
    g.lineBetween(x - 9.6, y + 0.8, x - 9.0, y + 3.4);
    g.lineBetween(x - 6.6, y + 1.0, x - 6.2, y + 3.4);

    const gw = m ? 9.5 : 7.5;
    const grin: P[] = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      grin.push(pt(x - gw + u * gw * 2, y + 4.2 - Math.sin(u * Math.PI) * 0.6 - (u < 0.1 || u > 0.9 ? 0.8 : 0)));
    }
    for (let i = 10; i >= 0; i--) {
      const u = i / 10;
      grin.push(pt(x - gw + u * gw * 2, y + 4.2 + Math.sin(u * Math.PI) * (m ? 6.5 : 5)));
    }
    g.fillStyle(PIRATE.mouth, alpha);
    g.fillPoints(grin, true);
    g.fillStyle(PIRATE.teeth, alpha);
    g.fillPoints(grin.slice(0, 11).concat(grin.slice(0, 11).reverse().map((p) => pt(p.x, p.y + 1.8))), true);
    // Cheek dimples at the corners.
    g.lineStyle(1, PIRATE.skinShade, alpha * 0.8);
    g.lineBetween(x - gw - 1, y + 2.6, x - gw - 0.2, y + 4.6);
    g.lineBetween(x + gw + 1, y + 2.6, x + gw + 0.2, y + 4.6);

    // ── Hair round the temples, under the hat (unmastered: black; awakened: white) ──
    const hairC = m ? PIRATE.g5 : PIRATE.hair;
    const hairL = m ? PIRATE.cloud : PIRATE.hairLit;
    for (const side of [-1, 1]) {
      const tuft: P[] = [
        pt(x + side * 10, y - 20), pt(x + side * 21, y - 17), pt(x + side * 23.5, y - 9),
        pt(x + side * 20.5, y - 11.5), pt(x + side * 21.5, y - 4), pt(x + side * 18, y - 9.5),
        pt(x + side * 16.5, y - 13),
      ];
      g.fillStyle(hairC, alpha);
      g.fillPoints(tuft, true);
      g.fillStyle(hairL, alpha * 0.6);
      g.fillPoints([pt(x + side * 13, y - 19), pt(x + side * 20, y - 16.5), pt(x + side * 17, y - 15)], true);
    }
    // Fringe: spikes hanging between the brim and the eyebrows — they end above the eyes.
    const fringe: P[] = [pt(x - 15, y - 19)];
    for (let i = 0; i < 5; i++) {
      const fx = x - 12 + i * 6;
      fringe.push(pt(fx, y - (i % 2 === 0 ? 10.4 : 12.2)));
      fringe.push(pt(fx + 3, y - 16));
    }
    fringe.push(pt(x + 15, y - 19));
    g.fillStyle(hairC, alpha);
    g.fillPoints(fringe, true);
  }

  /** A belt of cloud puffs round the body, drifting slowly. */
  private cloudRing(g: Phaser.GameObjects.Graphics, x: number, y: number, half: number, r: number, alpha: number, phase: number): void {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const px = x - half + u * half * 2 + Math.sin(this.t * 1.3 + i + phase) * 1.2;
      const py = y + Math.sin(u * Math.PI) * 2.4 + Math.cos(this.t * 1.7 + i * 1.9 + phase) * 0.8;
      const rr = r * (0.85 + 0.25 * Math.sin(i * 2.3 + phase));
      g.fillStyle(PIRATE.g5Deep, alpha * 0.7);
      g.fillCircle(px + 0.8, py + 1.2, rr);
      g.fillStyle(PIRATE.cloud, alpha);
      g.fillCircle(px, py, rr);
    }
  }

  /**
   * One curling lock of awakened hair: a tapering tongue rising from `(x, y)` and bending over
   * at the tip like a flame, built point-by-point so the taper is continuous.
   */
  private lock(g: Phaser.GameObjects.Graphics, x: number, y: number, h: number, w: number, curl: number): void {
    const steps = 12;
    const left: P[] = [], right: P[] = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const half = w * Math.pow(1 - u, 0.8) * (0.6 + 0.4 * Math.sin(Math.PI * (0.25 + 0.75 * u)));
      const cx = x + curl * u * u * h * 0.55;
      const cy = y - h * u + Math.abs(curl) * u * u * u * h * 0.18;
      left.push(pt(cx - half, cy));
      right.push(pt(cx + half, cy));
    }
    g.fillPoints(left.concat(right.reverse()), true);
  }

  /** Over everything: the straw hat — or, awakened, the white plume of hair rising from the crown. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    if (this.mastered) {
      // A plume of white locks rooted along the crown (y-17 and up), swaying out of phase.
      const k = this.intensity;
      const locks = [
        { ox: -14, h: 15, w: 5, c: -0.9, ph: 0 },
        { ox: -8, h: 23, w: 6.2, c: -0.55, ph: 1.1 },
        { ox: -1, h: 29, w: 7, c: 0.2, ph: 2.3 },
        { ox: 6, h: 24, w: 6.2, c: 0.6, ph: 3.4 },
        { ox: 13, h: 16, w: 5, c: 0.95, ph: 4.6 },
      ];
      for (let pass = 0; pass < 2; pass++) {
        g.fillStyle(pass === 0 ? PIRATE.g5Deep : PIRATE.g5, alpha * (pass === 0 ? 0.75 : 1));
        for (const l of locks) {
          const sway = Math.sin(this.t * 3.1 + l.ph) * 0.18;
          this.lock(g, x + l.ox + (pass === 0 ? 1.2 : 0), y - 16 + (pass === 0 ? 1 : 0),
            l.h * k * (1 + 0.06 * Math.sin(this.t * 4 + l.ph)), l.w, l.c + sway);
        }
      }
      // Lit cores, so the plume has a bright face and doesn't read as a flat cut-out.
      g.fillStyle(PIRATE.cloud, alpha * 0.9);
      for (const l of locks.slice(1, 4)) {
        const sway = Math.sin(this.t * 3.1 + l.ph) * 0.18;
        this.lock(g, x + l.ox - 1, y - 18, l.h * k * 0.6, l.w * 0.4, (l.c + sway) * 0.7);
      }
      // A cloud puff caught in the hair.
      this.cloudRing(g, x, y - 18, 12, 3.4, alpha, 2.1);
    } else {
      // The hat: brim bottom stops at y-12, clear of the eyes; it tips back against a run.
      const bob = Math.sin(this.t * 3.2) * 0.6;
      strawHat(g, x, y - 18 + bob, 1, this.lean(x), alpha, this.t * 0.4);
    }

    // Knuckle creases on each fist, turned toward the aim.
    for (let i = 0; i < 2; i++) {
      const hx = this.armX[i], hy = this.armY[i];
      if (hx === 0 && hy === 0) continue;
      const ang = Math.atan2(hy - y, hx - x);
      const c = Math.cos(ang), s = Math.sin(ang);
      g.lineStyle(1.2, PIRATE.skinDeep, alpha * 0.75);
      for (const ly of [-2.4, 0, 2.4]) {
        const ax = hx + c * 2.6 - s * ly, ay = hy + s * 2.6 + c * ly;
        const bx = hx + c * 4.8 - s * ly, by = hy + s * 4.8 + c * ly;
        g.lineBetween(ax, ay, bx, by);
      }
    }
  }
}
