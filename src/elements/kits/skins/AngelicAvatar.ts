import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from '../ElementVisuals';

/**
 * The Angelic skin's character: shadow's umbral thing replaced by something out of a hymn.
 *
 * Two forms, same as any element rig. **Unmastered** is the angel of a painting — a white robe
 * with a gilt girdle and collar, one pair of feathered wings folded at the sides, and a single
 * ring of light standing over the head. **Mastered** is the angel of the text it was painted
 * from: three pairs of wings (raised, spread, mantled), an ophan's wheel turning round the
 * waist with eyes open all the way round it, a second halo crossing the first, and a glory of
 * rays thrown onto the floor.
 *
 * Unlike an element's own avatar this one takes no colour mapper — a skin's palette is already
 * the final one, and routing gold through shadow's remap would turn it violet.
 */

const ANGEL = {
  bronze: 0x2a1a05,
  umber: 0x3d2708,
  deep: 0x55380c,
  brass: 0x744d10,
  ochre: 0x96661a,
  gold: 0xb98325,
  gilt: 0xd9a333,
  bright: 0xf0c14a,
  warm: 0xffd978,
  pale: 0xfff0c2,
  white: 0xffffff,
  /** The hottest note — the burning inside the halo and the pupils of the wheel. */
  flame: 0xffbb33,
};

/** Handfuls of light — concentric discs of one hand, outermost first. */
const ANGELIC_AVATAR: AvatarSpec = {
  hands: [
    { r: 13, color: ANGEL.warm, alpha: 0.22 },
    { r: 6.6, color: ANGEL.gilt, alpha: 0.98 },
    { r: 3.6, color: ANGEL.pale, alpha: 1 },
    { r: 1.5, color: ANGEL.white, alpha: 0.95, ox: -1.7, oy: -1.7 },
  ],
  eyeWhite: ANGEL.pale,
  eyePupil: ANGEL.brass,
  // Light has no mass: the hands drift rather than snap, and barely deform when they do.
  squash: { div: 16, x: 0.4, y: 0.2 },
};

const BASE_Y = 24;
const ROBE_TOP = -14;

// ── Primitives ────────────────────────────────────────────────────────────

type Pt = Phaser.Geom.Point;
const P = (x: number, y: number): Pt => new Phaser.Geom.Point(x, y);

/**
 * One flight feather: a quill root, a vane that swells past the middle and a drawn-out point,
 * bowed sideways by `curve`. Built point-by-point — the whole reason a wing reads as a wing
 * rather than as a fin is that each feather has its own taper and they overlap unevenly.
 */
function feather(cx: number, cy: number, angle: number, len: number, halfW: number, curve: number): Pt[] {
  const segs = 9;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    // Widest around 0.45 of the way out, pinched at the quill and pointed at the tip.
    const w = halfW * Math.sin(Math.PI * Math.pow(f, 0.68));
    const bend = curve * f * f;
    const px = cx + Math.cos(angle) * len * f - Math.sin(angle) * bend;
    const py = cy + Math.sin(angle) * len * f + Math.cos(angle) * bend;
    const nx = -Math.sin(angle), ny = Math.cos(angle);
    left.push(P(px + nx * w, py + ny * w));
    right.push(P(px - nx * w, py - ny * w));
  }
  right.reverse();
  return left.concat(right);
}

/**
 * A wing: a fan of feathers off a shoulder, longest at the outer edge and shortening toward
 * the body, drawn in three passes — a shadowed underlayer offset behind, the vane, and a lit
 * leading edge on the outermost quarter.
 *
 * `from`/`span` are always written for the right-hand wing; `dir = -1` mirrors the whole fan
 * about the vertical, which is `π - a` and *not* `-a` — negating alone flips it top-to-bottom
 * and leaves both wings pointing the same way.
 */
function wing(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, dir: number,
  from: number, span: number, len: number, count: number,
  alpha: number, phase: number, t: number,
): void {
  const beat = Math.sin(t * 1.5 + phase) * 0.07;
  for (let pass = 0; pass < 3; pass++) {
    const [col, aMul, ox, oy, lenMul, wMul] = pass === 0
      ? [ANGEL.ochre, 0.85, 2.2 * dir, 2.2, 1.04, 1.35]
      : pass === 1
        ? [ANGEL.pale, 0.96, 0, 0, 1, 1]
        : [ANGEL.white, 0.9, -1.2 * dir, -1.4, 0.62, 0.42];
    g.fillStyle(col, alpha * aMul);
    for (let i = 0; i < count; i++) {
      const f = i / (count - 1);
      if (pass === 2 && f < 0.55) continue;
      const raw = from + span * f + beat * (0.4 + f);
      const a = dir === 1 ? raw : Math.PI - raw;
      // Primaries at the outer edge are the long ones; coverts near the body are stubs.
      const l = len * (0.5 + 0.5 * Math.pow(f, 0.7)) * lenMul;
      g.fillPoints(feather(x + ox, y + oy, a, l, (3.2 - f * 0.9) * wMul, dir * l * 0.16), true);
    }
  }
  // The shoulder joint the whole fan hangs off.
  g.fillStyle(ANGEL.gilt, alpha);
  g.fillCircle(x, y, 4.2);
  g.fillStyle(ANGEL.pale, alpha * 0.8);
  g.fillCircle(x - dir * 1.2, y - 1.2, 2.2);
}

/** The robe: a column that flares to a hem, drawn point-by-point so the fall isn't a box. */
function robe(g: Phaser.GameObjects.Graphics, x: number, topY: number, botY: number, halfTop: number, halfBot: number): void {
  const steps = 9;
  const pts: Pt[] = [];
  const half = (u: number): number => halfTop + (halfBot - halfTop) * Math.pow(u, 1.7);
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    pts.push(P(x - half(u), topY + (botY - topY) * u));
  }
  for (let i = steps; i >= 0; i--) {
    const u = i / steps;
    pts.push(P(x + half(u), topY + (botY - topY) * u));
  }
  g.fillPoints(pts, true);
  g.fillEllipse(x, topY, halfTop * 2, 8);
  g.fillEllipse(x, botY, halfBot * 2, 10);
}

/** An open eye set into the wheel: an almond of white with a gold iris and a burning pupil. */
function wheelEye(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, alpha: number): void {
  g.fillStyle(ANGEL.pale, alpha);
  g.fillEllipse(x, y, r * 2.4, r * 1.5);
  g.fillStyle(ANGEL.gilt, alpha);
  g.fillCircle(x, y, r * 0.68);
  g.fillStyle(ANGEL.flame, alpha);
  g.fillCircle(x, y, r * 0.34);
  g.fillStyle(ANGEL.white, alpha * 0.9);
  g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.2);
}

// ── AngelicFx ─────────────────────────────────────────────────────────────

/** The one-shot bits the rig itself throws off: motes of light. */
class AngelicFx extends FxBase {
  constructor(scene: Phaser.Scene) {
    super(scene, (c) => c);
  }

  /** A mote lifting off a moving hand and burning out — light rises, and it never falls back. */
  mote(x: number, y: number): void {
    const drift = (Math.random() - 0.5) * 16;
    const r = 1.5 + Math.random() * 1.6;
    this.anim(5, 700, (g, t) => {
      const fade = 1 - easeIn(t);
      const px = x + drift * easeOut(t);
      const py = y - 34 * easeOut(t);
      g.fillStyle(ANGEL.warm, 0.4 * fade);
      g.fillCircle(px, py, r * 2.1 * fade);
      g.fillStyle(ANGEL.pale, 0.95 * fade);
      g.fillCircle(px, py, r * fade);
      g.fillStyle(ANGEL.white, 0.8 * fade);
      g.fillCircle(px, py, r * 0.45 * fade);
    });
  }
}

// ── AngelicAvatar ─────────────────────────────────────────────────────────

export class AngelicAvatar extends BaseAvatar {
  private fx: AngelicFx;
  /** Phase offsets so the three wing pairs never beat in lockstep. */
  private wingPhase = [0, 2.3, 4.4];

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, ANGELIC_AVATAR);
    this.fx = new AngelicFx(scene);
  }

  /**
   * Mastery tell — the painting becomes the text. The extra wings, the wheel and the second
   * ring live in the drawing hooks off `this.mastered`; what belongs here is the state carried
   * on GameObjects: white-hot eyes and a wider corona with a gilt rim on each hand.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? ANGEL.white : ANGEL.pale);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 17 : 13);
      halo.setFillStyle(on ? ANGEL.bright : ANGEL.warm, on ? 0.3 : 0.22);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.6, ANGEL.white, 0.9);
      else shell.setStrokeStyle();
    });
  }

  protected emitTrail(x: number, y: number): void {
    this.fx.mote(x, y);
  }

  // ── Layers ──────────────────────────────────────────────────────────────

  /** The light it stands in: a pool on the floor and, once mastered, a glory of rays. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const reach = (this.mastered ? 1.4 : 1) * this.intensity;
    const breath = 0.9 + Math.sin(this.t * 2.2) * 0.08;

    g.fillStyle(ANGEL.gold, a * 0.22 * this.intensity);
    g.fillEllipse(x, y + BASE_Y + 3, 104 * reach * breath, 34 * reach * breath);
    g.fillStyle(ANGEL.warm, a * 0.14 * this.intensity);
    g.fillEllipse(x, y + BASE_Y + 3, 64 * reach * breath, 20 * reach * breath);
    g.fillStyle(ANGEL.pale, a * 0.1 * this.intensity);
    g.fillEllipse(x, y + BASE_Y + 2, 34 * reach, 11 * reach);

    // A soft bloom around the body itself, so the robe is lit rather than pasted on.
    g.fillStyle(ANGEL.warm, a * 0.16 * this.intensity);
    g.fillCircle(x, y + 2, 44 * reach);

    if (this.mastered) {
      // Rays of glory: a slow wheel of tapering wedges thrown out across the ground.
      for (let i = 0; i < 12; i++) {
        const ang = this.t * 0.28 + (i / 12) * TAU;
        const len = 78 + Math.sin(this.t * 1.6 + i) * 12;
        const w = 0.045;
        g.fillStyle(i % 2 === 0 ? ANGEL.bright : ANGEL.gold, a * 0.16);
        g.fillPoints([
          P(x, y + 12),
          P(x + Math.cos(ang - w) * len, y + 12 + Math.sin(ang - w) * len * 0.36),
          P(x + Math.cos(ang + w) * len, y + 12 + Math.sin(ang + w) * len * 0.36),
        ], true);
      }
    }
  }

  /**
   * Robe, wings and — once mastered — the wheel. All of it over the fighter sprite and under
   * the face, so the eyes sit clear on the front of the hood.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const topY = y + ROBE_TOP;
    const botY = y + BASE_Y;

    // Wings first: they belong behind the body, and drawing them after would bury the robe.
    this.drawWings(g, x, y, alpha);

    // Robe: shadow side, body, then a lit fold down the left that follows the flare.
    g.fillStyle(ANGEL.ochre, alpha);
    robe(g, x + 2.5, topY + 1.5, botY, 17, 25);
    g.fillStyle(ANGEL.pale, alpha);
    robe(g, x, topY, botY, 16, 24);
    g.fillStyle(ANGEL.white, alpha * 0.7);
    robe(g, x - 7, topY + 3, botY - 3, 6, 8);

    // Folds in the cloth — three lines that spread as they fall.
    for (const off of [-9, 0, 9]) {
      g.lineStyle(1.2, ANGEL.gold, alpha * 0.45);
      g.beginPath();
      g.moveTo(x + off * 0.55, topY + 6);
      g.lineTo(x + off * 1.3, botY - 2);
      g.strokePath();
    }

    // Girdle and hem: the gilt that makes the white read as a vestment, not a sheet.
    g.fillStyle(ANGEL.gilt, alpha);
    g.fillRoundedRect(x - 19, y + 5, 38, 8, 3);
    g.fillStyle(ANGEL.bright, alpha * 0.85);
    g.fillRoundedRect(x - 18, y + 6, 36, 3, 1.5);
    g.fillStyle(ANGEL.gold, alpha * 0.9);
    g.fillEllipse(x, botY + 1, 48, 7);

    // Collar, low enough to clear the eyeline.
    g.fillStyle(ANGEL.gilt, alpha);
    g.fillEllipse(x, y + 2, 34, 11);
    g.fillStyle(ANGEL.bright, alpha * 0.8);
    g.fillEllipse(x, y + 1, 26, 7);
    g.fillStyle(ANGEL.pale, alpha * 0.85);
    g.fillEllipse(x, y, 16, 4);

    if (this.mastered) this.drawWheel(g, x, y, a, alpha);
  }

  /** One pair of wings unmastered; three once the seraph turns up. */
  private drawWings(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const scale = this.intensity;
    const pairs: Array<{ oy: number; from: number; span: number; len: number; n: number }> = this.mastered
      ? [
        { oy: -14, from: -2.05, span: 0.72, len: 46 * scale, n: 7 },   // raised
        { oy: -2, from: -0.72, span: 0.78, len: 52 * scale, n: 8 },    // spread
        { oy: 10, from: 0.42, span: 0.72, len: 40 * scale, n: 6 },     // mantled
      ]
      : [{ oy: -4, from: -0.95, span: 0.95, len: 42 * scale, n: 7 }];

    for (let p = 0; p < pairs.length; p++) {
      const w = pairs[p];
      for (const dir of [-1, 1] as const) {
        // Angles are written for the right-hand side; `wing` mirrors them for the left.
        // The half-beat offset keeps the two sides from flapping in lockstep.
        wing(g, x + dir * 14, y + w.oy, dir,
          w.from, w.span, w.len, w.n, alpha,
          this.wingPhase[p] + (dir > 0 ? 0 : 0.6), this.t);
      }
    }
  }

  /**
   * Mastered: the ophan's wheel — a gilt ring turning round the waist with eyes set all the
   * way along it, the far half dimmed so it reads as a hoop standing in space rather than a
   * flat circle painted on the robe.
   */
  private drawWheel(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const cy = y + 6;
    const rx = 38, ry = 14;

    g.lineStyle(4.5, ANGEL.deep, alpha * 0.8);
    g.strokeEllipse(x, cy, rx * 2, ry * 2);
    g.lineStyle(3, ANGEL.gilt, alpha);
    g.strokeEllipse(x, cy, rx * 2, ry * 2);
    g.lineStyle(1.2, ANGEL.pale, alpha * 0.7);
    g.strokeEllipse(x, cy - 1, rx * 2 - 4, ry * 2 - 4);

    // A second, tilted hoop crossing the first — a wheel within a wheel.
    g.lineStyle(2.4, ANGEL.gold, a * 0.75);
    g.strokeEllipse(x, cy, ry * 2.4, rx * 1.1);

    const eyes = 8;
    for (let i = 0; i < eyes; i++) {
      const p = this.t * 0.9 + (i / eyes) * TAU;
      const ex = x + Math.cos(p) * rx;
      const ey = cy + Math.sin(p) * ry;
      // Nearer the front = bigger and brighter; the back half is nearly a hint.
      const near = 0.5 + 0.5 * Math.sin(p);
      wheelEye(g, ex, ey, 2.6 + near * 1.8, alpha * (0.35 + near * 0.6));
    }
  }

  /**
   * The halo, rooted well above the crown so it never touches the face — plus, once mastered,
   * a second ring crossing it and a rain of light falling through both.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const hy = y - 32 + Math.sin(this.t * 1.8) * 1.6;
    const pulse = 0.88 + Math.sin(this.t * 3.1) * 0.12;
    const r = (this.mastered ? 20 : 16) * pulse * this.intensity;

    // The bloom the ring sits in, then the ring itself in three weights.
    g.fillStyle(ANGEL.warm, a * 0.24);
    g.fillEllipse(x, hy, r * 3.4, r * 1.5);
    g.lineStyle(5, ANGEL.gold, alpha * 0.55);
    g.strokeEllipse(x, hy, r * 2.2, r * 0.85);
    g.lineStyle(3, ANGEL.bright, alpha * 0.95);
    g.strokeEllipse(x, hy, r * 2, r * 0.75);
    g.lineStyle(1.2, ANGEL.white, alpha * 0.9);
    g.strokeEllipse(x, hy - 0.8, r * 1.8, r * 0.6);

    if (this.mastered) {
      // Second ring, stood on edge and turning through the first.
      const spin = this.t * 1.1;
      g.lineStyle(2.6, ANGEL.gilt, alpha * 0.85);
      g.strokeEllipse(x, hy, r * 2 * Math.abs(Math.cos(spin)) + 4, r * 1.9);
      g.lineStyle(1, ANGEL.white, alpha * 0.7);
      g.strokeEllipse(x, hy, r * 2 * Math.abs(Math.cos(spin)) + 1, r * 1.7);

      // A crown of small flames standing on the ring.
      for (let i = 0; i < 6; i++) {
        const p = this.t * 0.8 + (i / 6) * TAU;
        const fx2 = x + Math.cos(p) * r;
        const fy = hy + Math.sin(p) * r * 0.38;
        const h = 7 + Math.sin(this.t * 8 + i * 2) * 2;
        g.fillStyle(ANGEL.flame, alpha * 0.75);
        g.fillPoints([P(fx2 - 2.4, fy), P(fx2 + 2.4, fy), P(fx2, fy - h)], true);
        g.fillStyle(ANGEL.pale, alpha * 0.9);
        g.fillPoints([P(fx2 - 1.1, fy), P(fx2 + 1.1, fy), P(fx2, fy - h * 0.55)], true);
      }

      // Light falling out of the halo and down past the shoulders.
      for (let i = 0; i < 4; i++) {
        const p = (this.t * 0.55 + i / 4) % 1;
        const sx = x + Math.sin(this.t * 1.3 + i * 2.6) * 22;
        const sy = hy + 6 + p * 30;
        g.fillStyle(ANGEL.pale, a * 0.55 * (1 - p));
        g.fillCircle(sx, sy, 2.4 * (1 - p * 0.5));
      }
    }
  }
}
