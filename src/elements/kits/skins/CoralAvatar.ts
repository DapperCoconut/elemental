import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from '../ElementVisuals';

/**
 * The Coral skin's character: water's fighter replaced by a living reef colony.
 *
 * Two forms, same as any element rig. **Unmastered** is a young head of brain coral — a squat
 * lumpy mass grooved all over, crusted onto a bleached skeleton foot, with three stubby
 * branches barely clear of the crown. **Mastered** is a grown colony: a taller head, an
 * encrusting collar, six staghorn antlers spreading up and out with side forks, open polyps on
 * every tip, and a gorgonian sea fan standing behind the whole thing.
 *
 * Unlike an element's own avatar this one takes no colour mapper — a skin's palette is already
 * the final one, and routing coral pink through water's remap (whose whole job is to turn
 * water's blues *into* this pink) would map it twice. `SkinAvatars.ts` builds every skin rig
 * with the identity mapper for exactly that reason.
 */

const CORAL = {
  crevice: 0x59102f,
  shade: 0x8e1c4c,
  body: 0xc93a72,
  lit: 0xf05f92,
  bloom: 0xff6b9d,
  tip: 0xff9dbd,
  pale: 0xffc3d8,
  pearl: 0xffe6ef,
  white: 0xfff2f7,
  /** Bleached skeleton — the dead calcium the living colony is built on. */
  bone: 0xefe2d2,
  boneShade: 0xb99e83,
  boneLit: 0xfdf6ec,
};

/** Polyp beads: a knob of coral flesh in a haze of feeding water. */
const CORAL_AVATAR: AvatarSpec = {
  hands: [
    { r: 9.5, color: CORAL.bloom, alpha: 0.24 },
    { r: 6.6, color: CORAL.body, alpha: 1 },
    { r: 4.2, color: CORAL.lit, alpha: 1 },
    { r: 1.9, color: CORAL.pearl, alpha: 0.95, ox: -1.6, oy: -1.8 },
  ],
  eyeWhite: CORAL.pearl,
  eyePupil: 0x3d0a2a,
  // Stone flexes less than water: a coral hand smears about half as far as the liquid one.
  squash: { div: 15, x: 0.4, y: 0.22 },
};

/** Bottom of the colony. Low enough that the crusted foot covers the sprite's lower edge. */
const BASE_Y = 24;
const TOP_Y_PLAIN = -19;
const TOP_Y_MASTERED = -25;

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * Half-width of the coral head at `u` (0 = crown, 1 = foot). Smoothstepped through control
 * points rather than lerped straight, so the barrel never shows a facet: a coral head bulges
 * below its middle and tucks back in where it meets the rock.
 */
const MASS_PROFILE = [17, 21.5, 23.8, 24, 22.5, 21];

function massHalf(u: number): number {
  const f = Phaser.Math.Clamp(u, 0, 1) * (MASS_PROFILE.length - 1);
  const i = Math.min(MASS_PROFILE.length - 2, Math.floor(f));
  const k = f - i;
  const s = k * k * (3 - 2 * k);
  return MASS_PROFILE[i] + (MASS_PROFILE[i + 1] - MASS_PROFILE[i]) * s;
}

/**
 * The coral head: a lumpy barrel drawn down one side and back up the other. Each side carries
 * its own noise phase — a mirrored lump reads as a turned vase, and nothing that grew ever
 * came out symmetrical.
 */
function coralMass(
  g: Phaser.GameObjects.Graphics,
  x: number, topY: number, botY: number, scale: number, seed: number,
): void {
  const steps = 16;
  const half = (u: number, side: number) =>
    (massHalf(u)
      + Math.sin(u * 8.4 + seed + side * 2.3) * 2.1
      + Math.sin(u * 19 + seed * 1.7 + side) * 0.9) * scale;

  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    pts.push(new Phaser.Geom.Point(x - half(u, -1), topY + (botY - topY) * u));
  }
  for (let i = steps; i >= 0; i--) {
    const u = i / steps;
    pts.push(new Phaser.Geom.Point(x + half(u, 1), topY + (botY - topY) * u));
  }
  g.fillPoints(pts, true);
  // Round the crown and the foot so the silhouette never ends in a corner.
  g.fillEllipse(x, topY, massHalf(0) * 2 * scale, 11 * scale);
  g.fillEllipse(x, botY, massHalf(1) * 2 * scale, 12 * scale);
}

/**
 * One brain-coral groove: a meander running across the head at height `u`. Real brain coral is
 * nothing but these — without them the mass is a pink boulder.
 */
function meander(
  g: Phaser.GameObjects.Graphics,
  x: number, topY: number, botY: number,
  u: number, amp: number, seed: number,
): void {
  const steps = 12;
  const w = massHalf(u) * 0.88;
  const y0 = topY + (botY - topY) * u;
  g.beginPath();
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    // Ends pinch toward the rim, so a groove dies into the edge instead of running off it.
    const pinch = Math.sin(Math.PI * f);
    const px = x - w + w * 2 * f;
    const py = y0 + Math.sin(f * 6.4 + seed) * amp * (0.35 + pinch * 0.65);
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
}

/** A branch of the colony: quadratic centreline, tapering from a fat root to a knobbed tip. */
interface Limb {
  rx: number; ry: number;
  cx: number; cy: number;
  tx: number; ty: number;
  w0: number; w1: number;
  /** Flicker/sway offset so no two branches move together. */
  phase: number;
}

function limbPoint(l: Limb, u: number): { x: number; y: number } {
  const inv = 1 - u;
  return {
    x: inv * inv * l.rx + 2 * inv * u * l.cx + u * u * l.tx,
    y: inv * inv * l.ry + 2 * inv * u * l.cy + u * u * l.ty,
  };
}

/** Unit normal to the centreline at `u` — the direction the branch has width in. */
function limbNormal(l: Limb, u: number): { x: number; y: number } {
  const inv = 1 - u;
  const tx = 2 * inv * (l.cx - l.rx) + 2 * u * (l.tx - l.cx);
  const ty = 2 * inv * (l.cy - l.ry) + 2 * u * (l.ty - l.cy);
  const len = Math.hypot(tx, ty) || 1;
  return { x: -ty / len, y: tx / len };
}

/**
 * A tapering branch, built point-by-point into one polygon. Deliberately not a chain of
 * circles: at this size stacked discs read as a caterpillar, and coral has to read as one
 * continuous limb narrowing to its growing tip.
 */
function coralLimbShape(
  g: Phaser.GameObjects.Graphics, l: Limb, wScale: number, dx = 0, dy = 0,
): void {
  const steps = 12;
  const left: Phaser.Geom.Point[] = [];
  const right: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const p = limbPoint(l, u);
    const n = limbNormal(l, u);
    const w = (l.w0 + (l.w1 - l.w0) * u) * wScale;
    left.push(new Phaser.Geom.Point(p.x + n.x * w + dx, p.y + n.y * w + dy));
    right.push(new Phaser.Geom.Point(p.x - n.x * w + dx, p.y - n.y * w + dy));
  }
  g.fillPoints(left.concat(right.reverse()), true);
  // Growing tips are blunt and swollen, never pointed.
  const tip = limbPoint(l, 1);
  g.fillCircle(tip.x + dx, tip.y + dy, l.w1 * wScale * 1.3);
  const root = limbPoint(l, 0);
  g.fillCircle(root.x + dx, root.y + dy, l.w0 * wScale * 0.9);
}

/** Layered branch: crevice shadow behind, coral body, a lit ridge up the near side, knobs. */
function coralLimbLayered(g: Phaser.GameObjects.Graphics, l: Limb, alpha: number): void {
  g.fillStyle(CORAL.crevice, alpha * 0.9);
  coralLimbShape(g, l, 1.06, 1.7, 1.7);
  g.fillStyle(CORAL.body, alpha);
  coralLimbShape(g, l, 1);
  g.fillStyle(CORAL.lit, alpha * 0.7);
  coralLimbShape(g, l, 0.4, -1.6, -1.6);

  // Knobs alternating down the limb — the nubs a colony buds off as it grows.
  for (let i = 0; i < 3; i++) {
    const u = 0.34 + i * 0.24;
    const p = limbPoint(l, u);
    const n = limbNormal(l, u);
    const side = i % 2 === 0 ? 1 : -1;
    const w = l.w0 + (l.w1 - l.w0) * u;
    const kx = p.x + n.x * w * side * 0.85;
    const ky = p.y + n.y * w * side * 0.85;
    g.fillStyle(CORAL.shade, alpha * 0.9);
    g.fillCircle(kx + 0.8, ky + 0.8, w * 0.62);
    g.fillStyle(CORAL.lit, alpha * 0.85);
    g.fillCircle(kx, ky, w * 0.45);
  }
}

/**
 * A feeding polyp: a ring of tentacles fanning out of a fleshy cup with a dark mouth. Flattened
 * on the vertical so it reads as facing the camera rather than lying flat on the branch.
 */
function polyp(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, r: number, open: number, t: number, phase: number, alpha: number,
): void {
  const arms = 7;
  g.lineStyle(1.3, CORAL.pale, alpha * 0.85);
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * TAU + phase * 0.4;
    const len = r * (1.7 + Math.sin(t * 3.4 + phase + i * 0.9) * 0.35) * open;
    g.beginPath();
    g.moveTo(x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.32);
    g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len * 0.8);
    g.strokePath();
  }
  g.fillStyle(CORAL.bloom, alpha);
  g.fillCircle(x, y, r);
  g.fillStyle(CORAL.crevice, alpha * 0.55);
  g.fillEllipse(x, y, r * 0.55, r * 0.38);
  g.fillStyle(CORAL.pearl, alpha * 0.9);
  g.fillCircle(x - r * 0.3, y - r * 0.32, r * 0.4);
}

// ── CoralFx ───────────────────────────────────────────────────────────────

/** The one-shot bits the rig itself throws off: spawn motes and bubbles. */
class CoralFx extends FxBase {
  constructor(scene: Phaser.Scene) {
    super(scene, (c) => c);
  }

  /** A cloud of spawn shed off a moving hand, drifting up on the current. */
  spawn(x: number, y: number): void {
    const drift = (Math.random() - 0.5) * 24;
    const r = 1.5 + Math.random() * 1.7;
    const bubble = Math.random() < 0.4;
    this.anim(5, 700, (g, t) => {
      const fade = 1 - t;
      const px = x + drift * easeOut(t);
      const py = y - 26 * easeIn(t) - 8 * t;
      if (bubble) {
        g.lineStyle(1.2, CORAL.pearl, 0.7 * fade);
        g.strokeCircle(px, py, r * 1.2);
        g.fillStyle(CORAL.white, 0.4 * fade);
        g.fillCircle(px - r * 0.35, py - r * 0.4, r * 0.45);
      } else {
        g.fillStyle(CORAL.bloom, 0.4 * fade);
        g.fillCircle(px, py, r * 1.9 * fade);
        g.fillStyle(CORAL.pale, 0.9 * fade);
        g.fillCircle(px, py, r * fade);
      }
    });
  }
}

// ── CoralAvatar ───────────────────────────────────────────────────────────

/** A closed polyp sitting on the head — seeded once so the texture doesn't crawl. */
interface Speckle {
  u: number;
  side: number;
  r: number;
  phase: number;
}

export class CoralAvatar extends BaseAvatar {
  private fx: CoralFx;
  /** Static texture on the coral head — seeded once, never re-rolled. */
  private speckles: Speckle[] = [];
  /** Groove seeds, so the meanders across the head stay put between frames. */
  private grooveSeeds = [0.7, 2.4, 4.1, 5.8, 1.3];

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, CORAL_AVATAR);
    this.fx = new CoralFx(scene);

    // Polyps scattered over the head, skipping the box the eyes sit in — the body layer is
    // under the face, so a polyp there would sit behind an eye and read as a smudge.
    for (let i = 0; i < 22 && this.speckles.length < 16; i++) {
      const u = 0.08 + Math.random() * 0.84;
      const side = (Math.random() - 0.5) * 1.55;
      const px = massHalf(u) * side;
      const py = TOP_Y_PLAIN + (BASE_Y - TOP_Y_PLAIN) * u;
      // The box is cut generously: the grown head sits ~6px higher, so a polyp seeded just
      // clear of the face on the young one would ride up into an eye once mastered.
      if (Math.abs(px) < 14 && py > -16 && py < 8) continue;
      this.speckles.push({ u, side, r: 1.5 + Math.random() * 1.5, phase: Math.random() * TAU });
    }
  }

  /**
   * Mastery tell — the young head becomes a grown colony. Almost all of it happens in the
   * drawing hooks off `this.mastered`; what belongs here is the state living on GameObjects:
   * brighter eyes, a wider feeding haze, and a pale polyp rim round each hand.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? CORAL.white : CORAL.pearl);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 13 : 9.5);
      halo.setFillStyle(on ? CORAL.tip : CORAL.bloom, on ? 0.3 : 0.24);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.6, CORAL.pale, 0.9);
      else shell.setStrokeStyle();
    });
  }

  protected emitTrail(x: number, y: number): void {
    this.fx.spawn(x, y);
  }

  // ── Geometry shared by the three hooks ──────────────────────────────────

  private get topY(): number {
    return this.mastered ? TOP_Y_MASTERED : TOP_Y_PLAIN;
  }

  /**
   * How far the colony bends. The rig's hands lag the body on springs, so their drift away
   * from centre is a free read on which way the character is running — and anything growing
   * out of the seabed lies over when the water moves past it.
   */
  private leanFrom(x: number): number {
    const mean = (this.armX[0] + this.armX[1]) / 2;
    return Phaser.Math.Clamp((mean - x) * 0.42, -8, 8);
  }

  /**
   * The branches, rebuilt each frame so they sway. Roots sit at or above `y - 14`: the body
   * layer is under the face, so a branch rooted any lower would pass behind the eyes.
   */
  private limbs(x: number, y: number): Limb[] {
    const lean = this.leanFrom(x);
    const sway = (phase: number, amp: number) => Math.sin(this.t * 1.5 + phase) * amp;
    const mk = (
      rx: number, ry: number, cx: number, cy: number, tx: number, ty: number,
      w0: number, w1: number, phase: number,
    ): Limb => ({
      rx: x + rx, ry: y + ry,
      cx: x + cx + lean * 0.4, cy: y + cy,
      tx: x + tx + lean + sway(phase, 2.4), ty: y + ty + sway(phase * 1.7, 1.3),
      w0, w1, phase,
    });

    if (!this.mastered) {
      return [
        mk(-10, -14, -19, -23, -22, -32, 5.2, 2.6, 0),
        mk(1, -17, 3, -28, 4, -39, 5.8, 2.8, 1.7),
        mk(11, -14, 20, -22, 23, -29, 4.8, 2.4, 3.1),
      ];
    }

    const main = [
      mk(-14, -14, -32, -27, -37, -43, 6.0, 2.6, 0),
      mk(-9, -18, -21, -39, -22, -57, 6.4, 2.8, 1.1),
      mk(-3, -21, -6, -44, -4, -64, 6.8, 3.0, 2.3),
      mk(4, -21, 10, -42, 13, -60, 6.4, 2.8, 3.4),
      mk(11, -17, 26, -33, 30, -49, 6.0, 2.6, 4.5),
      mk(15, -14, 34, -23, 40, -35, 5.4, 2.4, 5.6),
    ];
    // Every grown branch throws one fork off its outer flank part-way up — a single trunk per
    // root reads as a set of horns, and a staghorn colony forks or it isn't staghorn.
    const forks: Limb[] = main.map((l, i) => {
      const p = limbPoint(l, 0.55);
      const dir = l.tx >= x ? 1 : -1;
      return {
        rx: p.x, ry: p.y,
        cx: p.x + dir * 9, cy: p.y - 8,
        tx: p.x + dir * 13 + Math.sin(this.t * 1.8 + i) * 1.6, ty: p.y - 17,
        w0: 3.4, w1: 1.7, phase: i * 0.9,
      };
    });
    return main.concat(forks);
  }

  // ── Layers ──────────────────────────────────────────────────────────────

  /**
   * Light coming down through water: a caustic pool on the seabed, a soft feeding haze around
   * the colony — and, once grown, the sea fan standing behind everything.
   */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    if (this.mastered) this.drawSeaFan(g, x, y, a);

    const drift = 0.94 + Math.sin(this.t * 1.7) * 0.05 + Math.sin(this.t * 2.9) * 0.03;
    const reach = (this.mastered ? 1.3 : 1) * this.intensity * drift;

    g.fillStyle(CORAL.bloom, a * 0.15 * this.intensity);
    g.fillEllipse(x, y + BASE_Y + 4, 94 * reach, 32 * reach);
    g.fillStyle(CORAL.pale, a * 0.1 * this.intensity);
    g.fillEllipse(x, y + BASE_Y + 4, 58 * reach, 20 * reach);

    // Feeding haze — plankton-thick water hanging over the crown.
    g.fillStyle(CORAL.bloom, a * 0.18 * this.intensity);
    g.fillCircle(x, y + this.topY - 10, 36 * reach);
    g.fillStyle(CORAL.pearl, a * 0.09 * this.intensity);
    g.fillCircle(x, y + this.topY - 10, 21 * reach);
  }

  /**
   * A gorgonian fan rooted behind the colony: curved ribs spreading into a shallow bowl, cross
   * links between them, all of it leaning with the current. It lives on the glow layer, so the
   * body occludes its middle and only the spread reads — which is exactly how a fan sits
   * behind whatever is growing in front of it.
   */
  private drawSeaFan(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const rootY = y + 14;
    const current = Math.sin(this.t * 1.05) * 0.1;
    const ribs = 9;

    const ribPoint = (f: number, u: number) => {
      // Ribs splay from a common root and bow outward as they climb.
      const ang = -Math.PI / 2 + f * 1.95 + current * (1 + Math.abs(f) * 1.5);
      const len = 56 * (1 - Math.abs(f) * 0.4);
      const bow = f * 16 * u * u;
      return {
        x: x + Math.cos(ang) * len * u + bow,
        y: rootY + Math.sin(ang) * len * u,
      };
    };

    for (let pass = 0; pass < 2; pass++) {
      const col = pass === 0 ? CORAL.shade : CORAL.tip;
      const width = pass === 0 ? 3.2 : 1.5;
      const alpha = a * (pass === 0 ? 0.5 : 0.42);
      g.lineStyle(width, col, alpha);
      for (let i = 0; i < ribs; i++) {
        const f = i / (ribs - 1) - 0.5;
        g.beginPath();
        for (let s = 0; s <= 8; s++) {
          const p = ribPoint(f, s / 8);
          if (s === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
        }
        g.strokePath();
      }
    }

    // Cross links, so the fan reads as a mesh rather than as a handful of loose whips.
    g.lineStyle(1.1, CORAL.shade, a * 0.34);
    for (let s = 3; s <= 8; s++) {
      const u = s / 8;
      g.beginPath();
      for (let i = 0; i < ribs; i++) {
        const p = ribPoint(i / (ribs - 1) - 0.5, u);
        if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
      }
      g.strokePath();
    }
  }

  /**
   * The colony itself, painted over the fighter sprite and under the face: crusted foot, coral
   * head, grooves, closed polyps, and the branches climbing off the crown.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const topY = y + this.topY;
    const botY = y + BASE_Y;

    // Bleached skeleton crusted over the seabed, drawn first so the colony stands on it.
    g.fillStyle(CORAL.boneShade, alpha * 0.9);
    g.fillEllipse(x, botY + 6, 66, 17);
    g.fillStyle(CORAL.bone, alpha);
    g.fillEllipse(x, botY + 4, 58, 13);
    g.fillStyle(CORAL.boneLit, alpha * 0.7);
    g.fillEllipse(x, botY + 2.5, 42, 8);
    // A few broken nubs of old skeleton round the rim.
    for (const ox of [-24, -13, 12, 22]) {
      g.fillStyle(CORAL.boneShade, alpha * 0.8);
      g.fillCircle(x + ox + 0.8, botY + 2.4, 4.2);
      g.fillStyle(CORAL.bone, alpha * 0.95);
      g.fillCircle(x + ox, botY + 1.6, 3.6);
    }

    // Head: shadow side first, then the mass, then a lit flank down the near left. The
    // highlight is a third mass rather than a straight band so it follows the bulge — a flat
    // stripe on a barrel reads as a decal.
    g.fillStyle(CORAL.crevice, alpha);
    coralMass(g, x + 2.6, topY + 1, botY, 1, 1.4);
    g.fillStyle(CORAL.body, alpha);
    coralMass(g, x, topY, botY, 1, 1.4);
    g.fillStyle(CORAL.lit, alpha * 0.55);
    coralMass(g, x - 8, topY + 4, botY - 5, 0.42, 3.9);

    // Brain-coral grooves, each cut dark with a pale lip above it.
    for (let i = 0; i < this.grooveSeeds.length; i++) {
      const u = 0.16 + i * 0.16;
      g.lineStyle(2.6, CORAL.crevice, alpha * 0.75);
      meander(g, x, topY, botY, u, 3.4, this.grooveSeeds[i]);
      g.lineStyle(1.2, CORAL.tip, alpha * 0.45);
      meander(g, x, topY - 2.2, botY - 2.2, u, 3.4, this.grooveSeeds[i]);
    }

    // Closed polyps pitting the head. They breathe very slowly — a colony at rest still moves.
    for (const s of this.speckles) {
      const sx = x + massHalf(s.u) * s.side;
      const sy = topY + (botY - topY) * s.u;
      const r = s.r * (0.9 + Math.sin(this.t * 1.6 + s.phase) * 0.12);
      g.fillStyle(CORAL.crevice, alpha * 0.55);
      g.fillCircle(sx, sy, r * 1.5);
      g.fillStyle(CORAL.tip, alpha * 0.8);
      g.fillCircle(sx, sy, r);
    }

    if (this.mastered) this.drawCrust(g, x, y, alpha);

    for (const l of this.limbs(x, y)) coralLimbLayered(g, l, alpha);
  }

  /** Encrusting collar round the waist — the growth ring of a colony that has been at it a while. */
  private drawCrust(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const cy = y + 12;
    g.fillStyle(CORAL.crevice, alpha);
    g.fillEllipse(x, cy + 1.5, 54, 20);
    g.fillStyle(CORAL.shade, alpha);
    g.fillEllipse(x, cy, 52, 18);
    g.fillStyle(CORAL.body, alpha * 0.95);
    g.fillEllipse(x, cy - 1.5, 48, 14);
    // Lobes budding off the rim, so the collar reads as grown rather than fitted.
    for (let i = 0; i < 7; i++) {
      const f = i / 6 - 0.5;
      const lx = x + f * 50;
      const ly = cy + Math.cos(f * Math.PI) * 3.5;
      g.fillStyle(CORAL.shade, alpha * 0.95);
      g.fillCircle(lx + 0.8, ly + 1, 5.6);
      g.fillStyle(CORAL.lit, alpha * 0.85);
      g.fillCircle(lx, ly, 4.2);
      g.fillStyle(CORAL.pearl, alpha * 0.6);
      g.fillCircle(lx - 1.2, ly - 1.4, 1.7);
    }
  }

  /**
   * Everything above the crown: an open polyp on every branch tip, and bubbles lifting off the
   * colony. All of it rooted well clear of the eyes.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const open = Phaser.Math.Clamp(this.intensity, 1, 1.6) * (this.mastered ? 1.15 : 1);
    const limbs = this.limbs(x, y);

    for (const l of limbs) {
      const tip = limbPoint(l, 1);
      // Pale growing cap under the polyp — the newest, softest coral on the branch.
      g.fillStyle(CORAL.pale, alpha * 0.75);
      g.fillCircle(tip.x, tip.y, l.w1 * 1.15);
      polyp(g, tip.x, tip.y - 1, l.w1 * 0.85, open, this.t, l.phase, alpha * 0.95);
    }

    this.drawBubbles(g, x, y, alpha);
  }

  /** Bubbles breaking off the colony and wobbling up out of frame. */
  private drawBubbles(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const n = this.mastered ? 5 : 3;
    const top = y + this.topY;
    for (let i = 0; i < n; i++) {
      const p = (this.t * 0.4 + i / n) % 1;
      const bx = x + (i - (n - 1) / 2) * 8 + Math.sin(this.t * 1.5 + i * 2.1) * 7;
      const by = top - 16 - p * (this.mastered ? 62 : 40);
      const r = (1.4 + (i % 3) * 0.75) * (1 - p * 0.2);
      const fade = alpha * (1 - p) * 0.8;
      g.lineStyle(1.2, CORAL.pearl, fade * 0.7);
      g.strokeCircle(bx, by, r);
      g.fillStyle(CORAL.white, fade * 0.4);
      g.fillCircle(bx - r * 0.3, by - r * 0.35, r * 0.42);
    }
  }
}
