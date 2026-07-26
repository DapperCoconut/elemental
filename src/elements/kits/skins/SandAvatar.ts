import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from '../ElementVisuals';

/**
 * The Sand skin's character: air's fighter replaced by a walking dune.
 *
 * Two forms, same as any element rig. **Unmastered** is a squat drift of packed sand — a
 * wind-scoured barrel with a steep windward face and a shallow slipface behind it, banded
 * with strata, crusted and cracked across the shoulders, with half-buried pebbles and a
 * thin trickle of grain running off one side. **Mastered** is a sandstorm given a body: the
 * legs are gone, the lower half spun out into a whirl of loose grit, a sandstone mantle
 * rides the shoulders, and a full dust devil turns over the crown.
 *
 * Unlike an element's own avatar this one takes no colour mapper — a skin's palette is
 * already the final one, and routing dune through air's remap would turn it grey-blue.
 * `SkinAvatars.ts` builds every skin rig with the identity mapper for exactly that reason.
 */

const SAND = {
  shade: 0x2a1d0e,
  deep: 0x4a3418,
  damp: 0x7a5a2a,
  dune: 0xa07c3e,
  sand: 0xc79a52,
  lit: 0xd9b370,
  grain: 0xe3c48a,
  pale: 0xead4a4,
  dust: 0xf5e7c4,
  white: 0xfff8e6,
  /** Quartz — the one bright spark in a handful of desert. */
  quartz: 0xffd24a,
};

/** Fistfuls of packed grit — concentric discs of one hand, outermost first. */
const SAND_AVATAR: AvatarSpec = {
  hands: [
    { r: 10, color: SAND.damp, alpha: 0.24 },
    { r: 6.8, color: SAND.sand, alpha: 1 },
    { r: 4.2, color: SAND.pale, alpha: 1 },
    { r: 1.9, color: SAND.white, alpha: 0.95, ox: -1.6, oy: -1.8 },
  ],
  eyeWhite: SAND.dust,
  eyePupil: SAND.shade,
  // Loose sand smears further than wind does but holds less of its height.
  squash: { div: 12, x: 0.62, y: 0.3 },
};

const BASE_Y = 24;
const TOP_Y_PLAIN = -24;
const TOP_Y_MASTERED = -32;
/** Half-widths at the crown and the foot — a dune is always wider where it settled. */
const HALF_TOP = 15;
const HALF_BOT = 25;
/** Where the mastered figure stops being a body and starts being a storm. */
const WHIRL_Y = 4;

// ── Primitives ────────────────────────────────────────────────────────────

/** Half-width of the drift at `u` (0 = crown, 1 = foot). */
function duneHalf(u: number): number {
  // Sand piles at its angle of repose, so the flank bows outward rather than running straight.
  return HALF_TOP + (HALF_BOT - HALF_TOP) * Math.pow(u, 0.72);
}

/**
 * The body of the drift, built point-by-point down one flank and back up the other. The two
 * sides are deliberately not mirrored: `windward` is the face the gale scours, drawn steeper
 * and pushed inward, while the far side falls away as a slipface. A symmetric pile reads as a
 * sack; the asymmetry is what says something has been blowing at this thing for a long time.
 */
function duneBody(
  g: Phaser.GameObjects.Graphics,
  x: number, topY: number, botY: number, windward: number, scale = 1,
): void {
  const steps = 10;
  const pts: Phaser.Geom.Point[] = [];
  const flank = (u: number, side: number): number => {
    const h = duneHalf(u) * scale;
    // The scoured side is pinched in near the crown and undercut at the base.
    return side === windward ? h * (0.78 + 0.22 * u) : h * (1 + 0.1 * Math.sin(u * Math.PI));
  };
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    pts.push(new Phaser.Geom.Point(x - flank(u, -1), topY + (botY - topY) * u));
  }
  for (let i = steps; i >= 0; i--) {
    const u = i / steps;
    pts.push(new Phaser.Geom.Point(x + flank(u, 1), topY + (botY - topY) * u));
  }
  g.fillPoints(pts, true);
  // Round the crest and bed the foot into the ground.
  g.fillEllipse(x + windward * 2, topY + 1, HALF_TOP * 1.9 * scale, 10 * scale);
  g.fillEllipse(x, botY, HALF_BOT * 2 * scale, 12 * scale);
}

/**
 * One layer of bedding running across the drift: a shallow arc, thickest in the middle and
 * feathered at both ends, because a stratum exposed on a curved face is never a straight line.
 */
function strataBand(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, halfW: number, thickness: number, sag: number,
): void {
  const steps = 9;
  const top: Phaser.Geom.Point[] = [];
  const bot: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const px = x - halfW + halfW * 2 * f;
    const dip = Math.sin(Math.PI * f) * sag;
    const w = thickness * Math.sin(Math.PI * Math.pow(f, 0.85));
    top.push(new Phaser.Geom.Point(px, y + dip - w));
    bot.push(new Phaser.Geom.Point(px, y + dip + w));
  }
  bot.reverse();
  g.fillPoints(top.concat(bot), true);
}

/**
 * A tapered ribbon following an arc of an ellipse — the band a whirl of sand makes as it
 * comes round the front and thins out going away. Built point-by-point so the taper is
 * continuous; a chain of circles at this width reads as a string of beads.
 */
function whirlBand(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, rx: number, ry: number,
  from: number, span: number, halfW: number,
): void {
  const steps = 12;
  const inner: Phaser.Geom.Point[] = [];
  const outer: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const a = from + span * f;
    // Fat where the band is nearest the viewer, pinched to nothing at both ends.
    const w = halfW * Math.sin(Math.PI * Math.pow(f, 0.8));
    const ox = Math.cos(a), oy = Math.sin(a);
    inner.push(new Phaser.Geom.Point(cx + ox * (rx - w), cy + oy * (ry - w * 0.45)));
    outer.push(new Phaser.Geom.Point(cx + ox * (rx + w), cy + oy * (ry + w * 0.45)));
  }
  outer.reverse();
  g.fillPoints(inner.concat(outer), true);
}

/** A whirl in three passes: a dusty envelope, the band itself, and a lit leading edge. */
function whirlLayered(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, rx: number, ry: number,
  from: number, span: number, halfW: number, alpha: number,
): void {
  g.fillStyle(SAND.damp, alpha * 0.32);
  whirlBand(g, cx, cy, rx, ry, from, span, halfW * 1.7);
  g.fillStyle(SAND.sand, alpha * 0.8);
  whirlBand(g, cx, cy, rx, ry, from, span, halfW);
  g.fillStyle(SAND.pale, alpha * 0.85);
  whirlBand(g, cx + 0.6, cy - 0.8, rx, ry, from + span * 0.2, span * 0.55, halfW * 0.42);
}

// ── SandFx ────────────────────────────────────────────────────────────────

/** The one-shot bits the rig itself throws off: loose grain. */
class SandFx extends FxBase {
  constructor(scene: Phaser.Scene) {
    super(scene, (c) => c);
  }

  /**
   * A grain kicked off a moving hand. Unlike a spark it is heavier than the air it is in —
   * it rises for a moment, then falls the rest of the way, so the arc is what sells it as
   * sand rather than as an ember.
   */
  mote(x: number, y: number): void {
    const drift = (Math.random() - 0.5) * 30;
    const lift = 8 + Math.random() * 9;
    const r = 1.3 + Math.random() * 1.5;
    this.anim(5, 560, (g, t) => {
      const fade = 1 - t * t;
      const px = x + drift * easeOut(t);
      // Up on the first third, down (and accelerating) for the rest.
      const py = y - lift * Math.sin(Math.min(1, t * 1.4) * Math.PI * 0.5) + 34 * easeIn(t);
      g.fillStyle(SAND.damp, 0.4 * fade);
      g.fillCircle(px, py, r * 1.8);
      g.fillStyle(SAND.pale, 0.95 * fade);
      g.fillCircle(px, py, r);
    });
  }
}

// ── SandAvatar ────────────────────────────────────────────────────────────

interface Pebble {
  /** Where down the drift it sits, 0 = crown. */
  u: number;
  ox: number;
  r: number;
}

interface Crack {
  u: number;
  ox: number;
  len: number;
  angle: number;
}

export class SandAvatar extends BaseAvatar {
  private fx: SandFx;
  /** Which flank the wind is scouring. Seeded once so the body doesn't flip about. */
  private readonly windward: number = Math.random() < 0.5 ? -1 : 1;
  /** Half-buried stones, seeded once so they stay put between frames. */
  private pebbles: Pebble[];
  /** Crust fractures across the shoulders and flank. */
  private cracks: Crack[];

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, SAND_AVATAR);
    this.fx = new SandFx(scene);
    this.pebbles = [
      { u: 0.30, ox: -13, r: 3.0 },
      { u: 0.55, ox: 9, r: 3.8 },
      { u: 0.74, ox: -6, r: 2.4 },
      { u: 0.88, ox: 17, r: 4.4 },
      { u: 0.62, ox: 19, r: 2.2 },
    ];
    this.cracks = [
      { u: 0.12, ox: -7, len: 11, angle: 1.9 },
      { u: 0.18, ox: 6, len: 8, angle: 1.2 },
      { u: 0.44, ox: -15, len: 9, angle: 1.7 },
      { u: 0.50, ox: 13, len: 12, angle: 1.4 },
    ];
  }

  /**
   * Mastery tell — the drift becomes a storm. The silhouette change is handled in the drawing
   * hooks off `this.mastered`; what belongs here is state that lives on GameObjects: sun-white
   * eyes, a wider dust corona, and a rim of grain frozen round each fist.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? SAND.white : SAND.dust);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 13.5 : 10);
      halo.setFillStyle(on ? SAND.lit : SAND.damp, on ? 0.3 : 0.24);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.6, SAND.pale, 0.9);
      else shell.setStrokeStyle();
    });
  }

  protected emitTrail(x: number, y: number): void {
    this.fx.mote(x, y);
  }

  // ── Geometry shared by the hooks ────────────────────────────────────────

  private get topY(): number {
    return this.mastered ? TOP_Y_MASTERED : TOP_Y_PLAIN;
  }

  /**
   * Which way the blown sand is streaming. The rig's hands lag the body on springs, so their
   * drift away from centre is a free read on which way the character is running — and grit
   * lifted off a drift always trails behind whatever is moving it.
   */
  private leanFrom(x: number): number {
    const mean = (this.armX[0] + this.armX[1]) / 2;
    return Phaser.Math.Clamp((mean - x) * 0.55, -11, 11);
  }

  // ── Layers ──────────────────────────────────────────────────────────────

  /** The apron of loose sand it is standing in, plus the haze it keeps kicking up. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const spread = (this.mastered ? 1.4 : 1) * this.intensity;

    g.fillStyle(SAND.damp, a * 0.28 * this.intensity);
    g.fillEllipse(x, y + BASE_Y + 3, 96 * spread, 30 * spread);
    g.fillStyle(SAND.dune, a * 0.2 * this.intensity);
    g.fillEllipse(x, y + BASE_Y + 5, 66 * spread, 19 * spread);

    // Ripples in the apron, crawling outward — the wind never stops working it.
    for (let i = 0; i < 3; i++) {
      const p = (this.t * 0.5 + i / 3) % 1;
      g.lineStyle(1.4, SAND.pale, a * 0.26 * (1 - p));
      g.strokeEllipse(x, y + BASE_Y + 4, (44 + p * 62) * spread, (13 + p * 18) * spread);
    }

    // A low haze of suspended grit hanging around the middle of the body.
    g.fillStyle(SAND.grain, a * 0.1 * this.intensity);
    g.fillEllipse(x + this.leanFrom(x) * 0.6, y + 6, 78 * spread, 34 * spread);
  }

  /**
   * The drift itself, painted over the fighter sprite and under the face. Everything above the
   * crown — the scour crown and the dust devil — belongs to `drawExtras`, so the eyes stay clear.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const topY = y + this.topY;
    const botY = y + (this.mastered ? WHIRL_Y : BASE_Y);

    // Shadow side first, then the body, then a scoured lit face down the windward flank.
    g.fillStyle(SAND.deep, alpha);
    duneBody(g, x - this.windward * 2.5, topY + 1.5, botY, this.windward);
    g.fillStyle(SAND.dune, alpha);
    duneBody(g, x, topY, botY, this.windward);
    g.fillStyle(SAND.sand, alpha * 0.85);
    duneBody(g, x + this.windward * 5, topY + 4, botY - 3, this.windward, 0.58);

    // Bedding planes. They sag toward the slipface, which is the direction the sand fell.
    for (let i = 0; i < 5; i++) {
      const u = 0.18 + i * 0.16;
      const by = topY + (botY - topY) * u;
      const hw = duneHalf(u) * 0.82;
      g.fillStyle(i % 2 === 0 ? SAND.damp : SAND.lit, alpha * (i % 2 === 0 ? 0.5 : 0.4));
      strataBand(g, x, by, hw, 1.5 + i * 0.25, -this.windward * 2.2);
    }

    // Crust fractures — thin dark splits with a pale lip along the upper edge.
    for (const c of this.cracks) {
      const cy = topY + (botY - topY) * c.u;
      const cx = x + c.ox;
      const dx = Math.cos(c.angle) * c.len, dy = Math.sin(c.angle) * c.len;
      g.lineStyle(1.8, SAND.shade, alpha * 0.7);
      g.lineBetween(cx, cy, cx + dx, cy + dy);
      g.lineStyle(1, SAND.pale, alpha * 0.5);
      g.lineBetween(cx - 1, cy - 1, cx + dx - 1, cy + dy - 1);
    }

    // Half-buried stones: a dark bed, the stone, and a sunlit cap.
    for (const p of this.pebbles) {
      const py = topY + (botY - topY) * p.u;
      const px = x + p.ox;
      g.fillStyle(SAND.shade, alpha * 0.55);
      g.fillEllipse(px, py + p.r * 0.7, p.r * 2.3, p.r * 0.9);
      g.fillStyle(SAND.damp, alpha);
      g.fillCircle(px, py, p.r);
      g.fillStyle(SAND.grain, alpha * 0.75);
      g.fillCircle(px - p.r * 0.3, py - p.r * 0.35, p.r * 0.5);
    }

    if (this.mastered) {
      this.drawWhirlSkirt(g, x, y, alpha);
      this.drawMantle(g, x, y, alpha);
    }
  }

  /** Mastered: below the waist the body gives up and becomes moving sand. */
  private drawWhirlSkirt(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const rings = 4;
    for (let i = 0; i < rings; i++) {
      const f = i / (rings - 1);
      const cy = y + WHIRL_Y + f * (BASE_Y - WHIRL_Y + 6);
      // Wider and slower the lower it goes — the funnel opens out where it meets the ground.
      const rx = 15 + f * 26;
      const spin = this.t * (3.4 - f * 1.6) + i * 1.9;
      whirlLayered(g, x, cy, rx, rx * 0.34, spin, TAU * 0.62, 4.4 - f * 1.1, alpha * (0.95 - f * 0.25));
      whirlLayered(g, x, cy, rx * 0.72, rx * 0.24, spin + Math.PI, TAU * 0.5, 3 - f * 0.7, alpha * (0.7 - f * 0.2));
    }
    // Grains flung clear of the funnel and falling back into it.
    for (let i = 0; i < 7; i++) {
      const p = (this.t * 0.9 + i / 7) % 1;
      const a = this.t * 2.2 + i * 2.4;
      const rad = 18 + p * 30;
      const gx = x + Math.cos(a) * rad;
      const gy = y + WHIRL_Y + p * 24 + Math.sin(a) * rad * 0.3;
      g.fillStyle(SAND.pale, alpha * 0.8 * (1 - p));
      g.fillCircle(gx, gy, 2 - p);
    }
  }

  /** Mastered: a slab of cemented sandstone riding the shoulders, low enough to clear the eyes. */
  private drawMantle(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const my = y + 9;
    g.fillStyle(SAND.shade, alpha * 0.9);
    g.fillEllipse(x, my + 3, 62, 19);
    g.fillStyle(SAND.damp, alpha);
    g.fillEllipse(x, my, 58, 17);
    g.fillStyle(SAND.dune, alpha);
    g.fillEllipse(x, my - 2, 52, 13);
    g.fillStyle(SAND.pale, alpha * 0.7);
    g.fillEllipse(x - 4, my - 4, 34, 7);
    // Weathered lip: a run of scallops bitten out of the front edge.
    for (let i = -2; i <= 2; i++) {
      g.fillStyle(SAND.shade, alpha * 0.5);
      g.fillCircle(x + i * 12, my + 7, 4 - Math.abs(i) * 0.5);
    }
  }

  /**
   * Everything from the crown up: the sand being scoured off the top of the head and blown
   * downwind, and — once mastered — a dust devil turning above it. All rooted above the eyes.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const topY = y + this.topY;
    const lean = this.leanFrom(x);

    // The crest itself: a lit ridge of loose sand sitting on the crown, always slightly
    // displaced downwind of the body under it.
    g.fillStyle(SAND.pale, alpha * 0.95);
    strataBand(g, x + lean * 0.2, topY - 2, HALF_TOP * 1.15, 3.2, 2.4);
    g.fillStyle(SAND.dust, alpha * 0.8);
    strataBand(g, x + lean * 0.3, topY - 4, HALF_TOP * 0.8, 2, 1.6);

    // Streams of grain peeling off the crest and running out downwind.
    const streams = this.mastered ? 4 : 3;
    for (let i = 0; i < streams; i++) {
      const ph = this.t * 2.1 + i * 1.6;
      const sx = x + (i - (streams - 1) / 2) * 7;
      const reach = (16 + Math.sin(ph) * 5) * this.intensity;
      const ang = Math.atan2(-8, lean || 0.001) + Math.sin(ph * 0.8) * 0.22;
      const beads = 7;
      for (let b = 0; b <= beads; b++) {
        const f = b / beads;
        const px = sx + Math.cos(ang) * reach * f * 1.4 + Math.sin(ph + f * 4) * 2.4;
        const py = topY - 3 - Math.sin(ang) * reach * f - f * f * 5;
        g.fillStyle(SAND.grain, a * 0.75 * (1 - f * 0.7));
        g.fillCircle(px, py, (2.6 - f * 1.8) * this.intensity);
      }
    }

    if (this.mastered) {
      // A dust devil standing on the crown: two tiers of whirl, tighter and faster upward.
      for (let tier = 0; tier < 2; tier++) {
        const cy = topY - 12 - tier * 13;
        const rx = 17 - tier * 6;
        const spin = -this.t * (3 + tier * 1.4);
        whirlLayered(g, x + lean * (0.3 + tier * 0.3), cy, rx, rx * 0.36, spin, TAU * 0.66, 3.6 - tier, alpha * 0.9);
        whirlLayered(g, x + lean * (0.3 + tier * 0.3), cy, rx * 0.6, rx * 0.22, spin + 2.4, TAU * 0.5, 2.4 - tier * 0.6, alpha * 0.65);
      }
      // Pebbles caught in the funnel, circling the head on a flat orbit.
      for (let i = 0; i < 5; i++) {
        const p = this.t * 2 + (i / 5) * TAU;
        const px = x + Math.cos(p) * 25 + lean * 0.4;
        const py = topY - 22 + Math.sin(p) * 7;
        g.fillStyle(SAND.damp, alpha * 0.9);
        g.fillCircle(px, py, 2.6);
        g.fillStyle(SAND.quartz, alpha * 0.85);
        g.fillCircle(px - 0.8, py - 0.9, 1.1);
      }
    }
  }
}
