import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeOut } from '../ElementVisuals';
import { sakuraPetal } from './SakuraFx';

/**
 * The Sakura skin's character: air's wind dancer replaced by a cherry-blossom ninja.
 *
 * **Unmastered** is a compact shinobi — plum gi and flared hakama, a hood wrapped down over the
 * crown and a mask over the lower face that leaves only the eye slit bare, a pink hachimaki
 * whose tails stream off the side of the head, a pink obi knotted at the hip, and petals caught
 * all over the cloth. **Mastered** is a different shape entirely: a cloak of overlapping petals
 * flares off the shoulders to the ground, a long scarf streams far behind, a katana rides the
 * back with its hilt over the right shoulder, and a sprig of blossom is tucked into the hood.
 *
 * Built with the identity mapper and its own palette — a skin's colours are already final.
 */

const SK = {
  ink: 0x1c0d16,
  plum: 0x2e1626,
  garb: 0x45213a,
  garbLit: 0x5e2f4f,
  seam: 0x7a3d62,
  rose: 0xc0708f,
  pink: 0xe88aaf,
  petal: 0xf4a6c4,
  blush: 0xfbcfe0,
  pale: 0xffe4ee,
  white: 0xfff6f9,
  skin: 0xf2d3c4,
  skinShade: 0xc99a8c,
  gold: 0xffd45a,
  goldDark: 0xa8822c,
  steel: 0xd6d0dc,
};

/** Cloth-wrapped fists: a blush of petals round a plum glove, a rose wrap and one glint. */
const SAKURA_AVATAR: AvatarSpec = {
  hands: [
    { r: 9.5, color: SK.pink, alpha: 0.22 },
    { r: 6.6, color: SK.garb, alpha: 1 },
    { r: 4.2, color: SK.seam, alpha: 1 },
    { r: 1.8, color: SK.blush, alpha: 0.95, ox: -1.6, oy: -1.8 },
  ],
  eyeWhite: SK.pale,
  eyePupil: SK.ink,
  // Quick, clipped hands — a ninja's strikes smear less than a dancer's sweeps.
  squash: { div: 13, x: 0.5, y: 0.26 },
};

type Pt = Phaser.Geom.Point;
const P = (x: number, y: number): Pt => new Phaser.Geom.Point(x, y);

/** A tapered ribbon along a swaying path — a sash tail or a scarf. Fat at the root. */
function ribbon(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, angle: number, len: number, halfW: number, t: number, wave: number, phase = 0,
): { x: number; y: number } {
  const SEG = 12;
  const a: Pt[] = [];
  const b: Pt[] = [];
  let px = x, py = y, ang = angle;
  for (let i = 0; i <= SEG; i++) {
    const f = i / SEG;
    ang = angle + Math.sin(t * 6 + f * 4 + phase) * wave * f;
    const w = halfW * (1 - f * 0.75);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    a.push(P(px + nx * w, py + ny * w));
    b.push(P(px - nx * w, py - ny * w));
    if (i < SEG) { px += Math.cos(ang) * (len / SEG); py += Math.sin(ang) * (len / SEG); }
  }
  b.reverse();
  // A split, swallow-cut end — cloth tails are cut, not pointed.
  g.fillPoints([...a, P(px - Math.cos(ang) * 2.5, py - Math.sin(ang) * 2.5), ...b], true);
  return { x: px, y: py };
}

// ── Trail ─────────────────────────────────────────────────────────────────

/** A petal shaken off a moving hand, fluttering to the ground. */
class SakuraTrailFx extends FxBase {
  constructor(scene: Phaser.Scene) {
    super(scene, (c) => c);
  }

  petal(x: number, y: number): void {
    const drift = (Math.random() - 0.5) * 26;
    const spin = (Math.random() - 0.5) * 6;
    const ph = Math.random() * TAU;
    const len = 6 + Math.random() * 3;
    const col = Math.random() < 0.5 ? SK.petal : SK.blush;
    this.anim(5, 820, (g, t) => {
      const fade = 1 - t * t;
      const px = x + drift * easeOut(t) + Math.sin(t * 7 + ph) * 4;
      const py = y + 26 * t * t - 4 * Math.sin(t * Math.PI);
      g.fillStyle(col, 0.95 * fade);
      sakuraPetal(g, px, py, ph + spin * t, len, 0.3 + 0.7 * Math.abs(Math.cos(t * 8 + ph)));
    });
  }
}

// ── SakuraAvatar ──────────────────────────────────────────────────────────

/** Petals caught on the cloth — offsets from centre, angle, length. */
const CLINGING: { ox: number; oy: number; a: number; len: number }[] = [
  { ox: -16, oy: -5, a: 2.4, len: 6 },
  { ox: 15, oy: 4, a: 0.6, len: 5.5 },
  { ox: -9, oy: 18, a: 1.9, len: 6.5 },
  { ox: 12, oy: 20, a: -0.4, len: 5 },
  { ox: -18, oy: 12, a: 3.6, len: 5 },
];

/** Fallen petals lying round the feet. */
const FALLEN: { ox: number; oy: number; a: number }[] = [
  { ox: -30, oy: 26, a: 0.4 }, { ox: -18, oy: 30, a: 2.1 }, { ox: -4, oy: 31, a: 4.4 },
  { ox: 12, oy: 30, a: 1.2 }, { ox: 26, oy: 27, a: 5.3 }, { ox: 34, oy: 24, a: 2.8 },
  { ox: -38, oy: 23, a: 3.7 }, { ox: 20, oy: 33, a: 0.9 },
];

export class SakuraAvatar extends BaseAvatar {
  private fx: SakuraTrailFx;

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, SAKURA_AVATAR);
    this.fx = new SakuraTrailFx(scene);
  }

  /** Eye whites go full petal-white, the fists wear a wider petal halo and a pink rim. */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? SK.white : SK.pale);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 13 : 9.5);
      halo.setFillStyle(on ? SK.petal : SK.pink, on ? 0.3 : 0.22);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.4, SK.pink, 0.95);
      else shell.setStrokeStyle();
    });
  }

  protected emitTrail(x: number, y: number): void {
    this.fx.petal(x, y);
  }

  /**
   * Which way the cloth streams: the hands lag the body on springs, so their drift off centre
   * reads which way she is running — and a sash always trails the runner.
   */
  private leanFrom(x: number): number {
    const mean = (this.armX[0] + this.armX[1]) / 2;
    return Phaser.Math.Clamp((mean - x) * 0.55, -11, 11);
  }

  /** Streaming direction for tails, with a resting fall to one side when standing still. */
  private trailAngle(x: number): number {
    const lean = this.leanFrom(x);
    const side = lean >= 0 ? 1 : -1;
    const k = Math.min(1, Math.abs(lean) / 8);
    // Standing still the tails hang down and out; running they lift to stream level.
    return side > 0 ? 1.15 - k * 0.85 : Math.PI - 1.15 + k * 0.85;
  }

  // ── Layers ──────────────────────────────────────────────────────────────

  /** Fallen petals round the feet, petals drifting past — and, mastered, scarf and scabbard. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const spread = (this.mastered ? 1.3 : 1) * this.intensity;
    g.fillStyle(SK.pink, a * 0.16 * this.intensity);
    g.fillEllipse(x, y + 26, 84 * spread, 24 * spread);
    g.fillStyle(SK.seam, a * 0.14);
    g.fillEllipse(x, y + 25, 50 * spread, 13 * spread);
    for (let i = 0; i < FALLEN.length; i++) {
      const f = FALLEN[i];
      g.fillStyle(i % 2 ? SK.petal : SK.blush, a * 0.7);
      sakuraPetal(g, x + f.ox * spread, y + f.oy, f.a + Math.sin(this.t * 0.8 + i) * 0.15, 6, 0.7);
    }

    if (this.mastered) {
      this.drawScarf(g, x, y, alpha);
      this.drawScabbard(g, x, y, alpha);
    }

    // Petals drifting down past her, always a few in the air.
    const drifting = this.mastered ? 7 : 4;
    for (let i = 0; i < drifting; i++) {
      const p = (this.t * 0.32 + i / drifting) % 1;
      const fade = Math.sin(p * Math.PI);
      const px = x + (i % 2 ? 1 : -1) * (20 + (i * 7) % 18) + Math.sin(this.t * 1.6 + i * 2) * 8;
      const py = y - 36 + p * 62;
      g.fillStyle(i % 3 ? SK.petal : SK.pale, alpha * 0.85 * fade);
      sakuraPetal(g, px, py, this.t * 2 + i, 7, 0.3 + 0.7 * Math.abs(Math.cos(this.t * 3 + i)));
    }
  }

  /** Mastered: the long scarf, wound at the throat, streaming far out behind her. */
  private drawScarf(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const ang = this.trailAngle(x);
    const side = Math.cos(ang) >= 0 ? 1 : -1;
    for (let k = 0; k < 2; k++) {
      const base = ang + (k ? -0.22 : 0.12) * side;
      g.fillStyle(k ? SK.rose : SK.pink, alpha);
      const end = ribbon(g, x + side * 8, y + 4, base, 40 - k * 8, 4.6 - k * 0.6, this.t, 0.55, k * 1.7);
      // The ends are shedding.
      for (let i = 0; i < 3; i++) {
        const p = (this.t * 0.9 + i / 3 + k * 0.17) % 1;
        g.fillStyle(i % 2 ? SK.blush : SK.petal, alpha * (1 - p));
        sakuraPetal(g, end.x + side * p * 16 + Math.sin(this.t * 4 + i) * 3, end.y + p * 14, this.t * 3 + i * 2, 6,
          0.3 + 0.7 * Math.abs(Math.cos(this.t * 5 + i)));
      }
    }
  }

  /** Mastered: the saya, diagonal across the back — drawn under the body so only its ends show. */
  private drawScabbard(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const x1 = x - 24, y1 = y + 20, x2 = x + 17, y2 = y - 17;
    g.lineStyle(6.5, SK.ink, alpha);
    g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(4.2, SK.plum, alpha);
    g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(1.2, SK.seam, alpha * 0.9);
    g.lineBetween(x1 + 1, y1 - 1.5, x2 + 1, y2 - 1.5);
    // Kojiri — the gold end cap of the scabbard.
    g.fillStyle(SK.goldDark, alpha);
    g.fillCircle(x1, y1, 3.6);
    g.fillStyle(SK.gold, alpha);
    g.fillCircle(x1 - 0.6, y1 - 0.8, 2.2);
  }

  /**
   * The ninja over the fighter sprite, under the face. The eye slit is bare skin from y-10 to
   * y+2 so the eyes always sit in a clear band; everything opaque above it is hood.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const lean = this.leanFrom(x);
    const stride = Math.sin(this.t * 3.2) * 1.4;

    if (this.mastered) this.drawPetalCloak(g, x, y, alpha, lean);

    // ── Hakama: flared trousers, split down the middle.
    g.fillStyle(SK.plum, alpha);
    g.fillPoints([
      P(x - 15, y + 8), P(x + 15, y + 8),
      P(x + 21 + stride, y + 24), P(x + 3, y + 25), P(x, y + 20), P(x - 3, y + 25), P(x - 21 + stride, y + 24),
    ], true);
    g.fillStyle(SK.garb, alpha);
    g.fillPoints([P(x + 2, y + 9), P(x + 13, y + 9), P(x + 18 + stride, y + 23), P(x + 4, y + 24)], true);
    // Pleats.
    g.lineStyle(1, SK.ink, alpha * 0.7);
    g.lineBetween(x - 8, y + 11, x - 12 + stride * 0.5, y + 24);
    g.lineBetween(x + 8, y + 11, x + 11 + stride * 0.5, y + 23);

    // ── Torso: broad shoulders tapering to the waist.
    g.fillStyle(SK.plum, alpha);
    g.fillPoints([
      P(x - 21, y - 6), P(x - 18, y - 12), P(x - 10, y - 15), P(x + 10, y - 15), P(x + 18, y - 12),
      P(x + 21, y - 6), P(x + 17, y + 4), P(x + 15, y + 10), P(x - 15, y + 10), P(x - 17, y + 4),
    ], true);
    g.fillStyle(SK.garb, alpha);
    g.fillPoints([
      P(x - 4, y - 14), P(x + 10, y - 14), P(x + 17, y - 11), P(x + 19, y - 5), P(x + 15, y + 4),
      P(x + 13, y + 9), P(x - 2, y + 9),
    ], true);

    // ── Hood: wraps the whole head, peaked at the crown and swept back with the wind.
    g.fillStyle(SK.plum, alpha);
    g.fillPoints([
      P(x - 18, y + 2), P(x - 20, y - 8), P(x - 17, y - 18), P(x - 9, y - 24),
      P(x + lean * 0.25, y - 27), P(x + 9, y - 24), P(x + 17, y - 18), P(x + 20, y - 8), P(x + 18, y + 2),
      P(x + 10, y + 7), P(x - 10, y + 7),
    ], true);
    g.fillStyle(SK.garb, alpha);
    g.fillPoints([
      P(x + 1, y - 25), P(x + 9, y - 23), P(x + 16, y - 17), P(x + 18.5, y - 8), P(x + 16, y + 1),
      P(x + 9, y + 5), P(x + 4, y - 12),
    ], true);
    g.lineStyle(1, SK.garbLit, alpha * 0.8);
    g.beginPath();
    g.arc(x, y - 6, 17, -2.4, -0.5, false);
    g.strokePath();

    // ── Eye slit: the one patch of bare skin, with the hood's shadow along its top.
    g.fillStyle(SK.skin, alpha);
    g.fillRoundedRect(x - 16, y - 10.5, 32, 12.5, 5);
    g.fillStyle(SK.skinShade, alpha * 0.7);
    g.fillRoundedRect(x - 16, y - 10.5, 32, 3, { tl: 5, tr: 5, bl: 0, br: 0 });

    // ── Mask: the wrap over the lower face, with its folds.
    if (!this.mastered) {
      g.lineStyle(1, SK.seam, alpha * 0.8);
      g.beginPath(); g.arc(x, y - 2, 11, 0.55, Math.PI - 0.55, false); g.strokePath();
      g.beginPath(); g.arc(x, y - 4, 15, 0.7, Math.PI - 0.7, false); g.strokePath();
    }

    // ── Collar: crossed lapels opening onto a pink under-kimono.
    g.fillStyle(SK.pink, alpha);
    g.fillPoints([P(x - 7, y + 6), P(x + 7, y + 6), P(x, y + 10)], true);
    g.lineStyle(2, SK.seam, alpha);
    g.lineBetween(x - 9, y + 5, x + 1, y + 10);
    g.lineBetween(x + 9, y + 5, x - 1, y + 10);

    // ── Obi: the pink sash, knotted at the hip, its tails trailing.
    g.fillStyle(SK.pink, alpha);
    g.fillRect(x - 15.5, y + 8, 31, 5);
    g.fillStyle(SK.blush, alpha * 0.9);
    g.fillRect(x - 15.5, y + 8.6, 31, 1.4);
    g.fillStyle(SK.rose, alpha);
    g.fillRect(x - 15.5, y + 12, 31, 1);
    const knotX = x - 11;
    const trailA = this.trailAngle(x) + (this.mastered ? 0.4 : 0.6) * (Math.cos(this.trailAngle(x)) >= 0 ? 1 : -1);
    g.fillStyle(SK.rose, alpha);
    ribbon(g, knotX, y + 11, trailA, 13, 2.6, this.t, 0.5, 0.4);
    g.fillStyle(SK.pink, alpha);
    ribbon(g, knotX, y + 11, trailA + 0.35, 10, 2.2, this.t, 0.5, 2.1);
    g.fillStyle(SK.petal, alpha);
    g.fillEllipse(knotX, y + 10.5, 7, 6);

    // ── Hachimaki: the headband across the brow, a blossom crest at the centre.
    g.fillStyle(SK.pink, alpha);
    g.fillPoints([P(x - 19, y - 12.5), P(x - 12, y - 16), P(x + 12, y - 16), P(x + 19, y - 12.5), P(x + 19, y - 10.8), P(x - 19, y - 10.8)], true);
    g.fillStyle(SK.blush, alpha * 0.85);
    g.fillRect(x - 12, y - 15.2, 24, 1.1);
    for (let k = 0; k < 5; k++) {
      const pa = -Math.PI / 2 + (k / 5) * TAU;
      g.fillStyle(SK.white, alpha);
      sakuraPetal(g, x, y - 16, pa, 3.8, 1.1);
    }
    g.fillStyle(SK.gold, alpha);
    g.fillCircle(x, y - 16, 0.9);

    // Headband tails, knotted at the side of the head and streaming off it.
    const hbA = this.trailAngle(x);
    const hbSide = Math.cos(hbA) >= 0 ? 1 : -1;
    g.fillStyle(SK.rose, alpha);
    ribbon(g, x + hbSide * 18, y - 13, hbA - hbSide * 0.15, 15, 2.4, this.t, 0.6, 1.1);
    g.fillStyle(SK.pink, alpha);
    ribbon(g, x + hbSide * 18, y - 13, hbA - hbSide * 0.5, 18, 2.6, this.t, 0.6, 0.2);
    g.fillStyle(SK.petal, alpha);
    g.fillCircle(x + hbSide * 18, y - 13, 2.6);

    // ── Petals caught on the cloth.
    for (let i = 0; i < CLINGING.length; i++) {
      const c = CLINGING[i];
      g.fillStyle(i % 2 ? SK.blush : SK.petal, alpha * 0.95);
      sakuraPetal(g, x + c.ox, y + c.oy, c.a + Math.sin(this.t * 2 + i) * 0.08, c.len, 0.85);
    }

    if (this.mastered) this.drawThroatWrap(g, x, y, alpha);
  }

  /**
   * Mastered: a cloak of overlapping petals off the shoulders, flaring wide to the ground and
   * open down the front. Rows of petals like scales, the hem scalloped by the lowest row.
   */
  private drawPetalCloak(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number, lean: number): void {
    const sway = Math.sin(this.t * 2.4) * 1.6;
    const drag = lean * 0.35;
    const half = (v: number) => 20 + v * 13;
    for (const side of [-1, 1]) {
      const pts: Pt[] = [P(x + side * 6, y - 12)];
      for (let i = 0; i <= 8; i++) {
        const v = i / 8;
        pts.push(P(x + side * half(v) - drag * v + sway * v, y - 12 + v * 39));
      }
      pts.push(P(x + side * 9 - drag, y + 27));
      g.fillStyle(SK.seam, alpha);
      g.fillPoints(pts, true);
    }
    // The scales: petals pointing down the cloak, rows offset like shingles.
    for (let row = 0; row < 4; row++) {
      const v = 0.12 + row * 0.27;
      const cy = y - 12 + v * 39;
      const n = 3 + row;
      for (const side of [-1, 1]) {
        for (let k = 0; k < n; k++) {
          const f = (k + (row % 2 ? 0.5 : 0.25)) / n;
          const cx = x + side * (8 + (half(v) - 8) * f) - drag * v + sway * v;
          const col = (row + k) % 3 === 0 ? SK.pink : (row + k) % 3 === 1 ? SK.petal : SK.rose;
          g.fillStyle(col, alpha);
          sakuraPetal(g, cx, cy - 4, Math.PI / 2 + side * 0.25 + Math.sin(this.t * 3 + k + row) * 0.06, 11 + row, 0.95);
        }
      }
    }
  }

  /** Mastered: the scarf wound round the throat in place of the mask. */
  private drawThroatWrap(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    g.fillStyle(SK.rose, alpha);
    g.fillRoundedRect(x - 17, y + 1.5, 34, 6.5, 3);
    g.fillStyle(SK.pink, alpha);
    g.fillRoundedRect(x - 16, y + 1.5, 32, 4.2, 2.5);
    g.lineStyle(1, SK.seam, alpha * 0.8);
    for (let i = -2; i <= 2; i++) g.lineBetween(x + i * 6 - 2, y + 2, x + i * 6 + 2, y + 7.5);
  }

  /**
   * Everything that rises clear of the face: a petal or two lifting off the hood peak, and —
   * mastered — the katana hilt over the right shoulder and the blossom sprig in the hood.
   * All of it either sits above y-18 or out past the eye slit.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const lean = this.leanFrom(x);

    // Petals lifting off the crown and blowing away downwind.
    const lifts = this.mastered ? 3 : 2;
    for (let i = 0; i < lifts; i++) {
      const p = (this.t * 0.6 + i / lifts) % 1;
      const px = x + lean * 0.3 + (lean >= 0 ? 1 : -1) * p * 22 + Math.sin(this.t * 3 + i) * 3;
      const py = y - 27 - p * 14;
      g.fillStyle(i % 2 ? SK.pale : SK.petal, a * (1 - p));
      sakuraPetal(g, px, py, this.t * 3 + i * 2, 6, 0.3 + 0.7 * Math.abs(Math.cos(this.t * 4 + i)));
    }

    if (!this.mastered) return;

    // Katana hilt: tsuba at the shoulder, the wrapped tsuka rising past the head, gold kashira.
    const hx1 = x + 18, hy1 = y - 18, hx2 = x + 29, hy2 = y - 33;
    g.fillStyle(SK.goldDark, alpha);
    g.fillEllipse(hx1, hy1, 9, 6);
    g.fillStyle(SK.gold, alpha);
    g.fillEllipse(hx1 - 0.4, hy1 - 0.6, 7, 4);
    g.lineStyle(5, SK.ink, alpha);
    g.lineBetween(hx1 + 1.2, hy1 - 1.6, hx2, hy2);
    // Ito: the diamond wrap down the grip.
    g.lineStyle(1.3, SK.pink, alpha);
    for (let i = 1; i <= 4; i++) {
      const f = i / 5;
      const cx = hx1 + 1.2 + (hx2 - hx1 - 1.2) * f, cy = hy1 - 1.6 + (hy2 - hy1 + 1.6) * f;
      g.lineBetween(cx - 2.2, cy - 1, cx + 2.2, cy + 1.4);
      g.lineBetween(cx - 2, cy + 1.6, cx + 1.8, cy - 1.6);
    }
    g.fillStyle(SK.gold, alpha);
    g.fillCircle(hx2, hy2, 2.6);
    g.fillStyle(SK.white, alpha * 0.8);
    g.fillCircle(hx2 - 0.8, hy2 - 0.8, 0.9);
    // Sageo: the cord off the hilt, a petal knotted at its end.
    g.lineStyle(1.2, SK.rose, alpha);
    const cordX = hx1 + 6 + Math.sin(this.t * 3) * 2, cordY = hy1 + 5;
    g.lineBetween(hx1 + 2, hy1 - 2, cordX, cordY);
    g.fillStyle(SK.petal, alpha);
    sakuraPetal(g, cordX, cordY, Math.PI / 2 + Math.sin(this.t * 3) * 0.3, 6, 0.9);
    // A glint running up the steel collar.
    g.fillStyle(SK.steel, alpha * 0.9);
    g.fillCircle(hx1 + 2, hy1 - 2.6, 1.2);

    // Blossom sprig tucked into the hood, left of the peak.
    g.lineStyle(1.6, SK.ink, alpha);
    g.lineBetween(x - 6, y - 23, x - 16, y - 31);
    g.lineBetween(x - 11, y - 27, x - 8, y - 33);
    const sprig: [number, number, number][] = [[-16, -31, 4.6], [-8, -33, 4], [-19, -24, 3.6]];
    sprig.forEach(([ox, oy, r], i) => {
      const bx = x + ox, by = y + oy;
      const rot = this.t * 0.4 + i;
      for (let k = 0; k < 5; k++) {
        const pa = rot + (k / 5) * TAU;
        g.fillStyle(SK.blush, alpha);
        sakuraPetal(g, bx, by, pa, r, 1.1);
      }
      g.fillStyle(SK.pink, alpha);
      g.fillCircle(bx, by, r * 0.3);
      g.fillStyle(SK.gold, alpha);
      g.fillCircle(bx, by, r * 0.14);
    });
  }
}
