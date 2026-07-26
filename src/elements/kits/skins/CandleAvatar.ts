import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, easeIn, easeOut } from '../ElementVisuals';

/**
 * The Candle skin's character: fire's fighter replaced by a living pillar candle.
 *
 * Two forms, same as any element rig. **Unmastered** is a stub of half-burnt wax — squat,
 * slumped, drips frozen down its sides, one small violet flame on a single wick.
 * **Mastered** is a candelabra: a taller column on a brass base, a gilt collar round its
 * waist, and two wax arms curving up off its shoulders so three flames burn at once.
 *
 * Unlike an element's own avatar this one takes no colour mapper — a skin's palette is
 * already the final one, and routing wax through fire's remap table would turn it violet.
 * `SkinAvatars.ts` builds every skin rig with the identity mapper for exactly that reason.
 */

const CANDLE = {
  waxLit: 0xfdf5e0,
  wax: 0xf1e0b6,
  waxShade: 0xd6bd8c,
  waxDeep: 0xa88d5f,
  waxPool: 0xe8d3a4,
  brass: 0xd9a441,
  brassLit: 0xf6de9c,
  brassDim: 0x7d5a1c,
  wick: 0x2b2118,
  wickHot: 0x6f1fc4,
  flameDeep: 0x420f6b,
  flameMid: 0x8228e0,
  flame: 0x9333ea,
  flameHi: 0xb972ff,
  flamePale: 0xd7a5ff,
  glow: 0xecd4ff,
  white: 0xfaf1ff,
};

/** Wax beads held in a violet flame — concentric discs of one hand, outermost first. */
const CANDLE_AVATAR: AvatarSpec = {
  hands: [
    { r: 9.5, color: CANDLE.flame, alpha: 0.26 },
    { r: 6.6, color: CANDLE.wax, alpha: 1 },
    { r: 4.2, color: CANDLE.waxLit, alpha: 1 },
    { r: 2.0, color: CANDLE.flameHi, alpha: 0.95, ox: -1, oy: -1.4 },
  ],
  eyeWhite: CANDLE.waxLit,
  eyePupil: 0x3a2a5c,
  squash: { div: 15, x: 0.42, y: 0.24 },
};

/** Bottom of the wax. Low enough that the melt pool covers the sprite's lower edge. */
const BASE_Y = 23;
const TOP_Y_PLAIN = -24;
const TOP_Y_MASTERED = -34;
/** Half-widths at the top and bottom of the column — a candle is wider where it hasn't burnt. */
const HALF_TOP = 18.5;
const HALF_BOT = 23.5;

// ── Primitives ────────────────────────────────────────────────────────────

/** Half-width of the column at `u` (0 = crown, 1 = base). */
function columnHalf(u: number): number {
  return HALF_TOP + (HALF_BOT - HALF_TOP) * u;
}

/**
 * The wax column: a barrel that widens toward the base, with the corners rounded off. Drawn
 * as a polygon down one side and back up the other rather than a rectangle — a hard-edged
 * box reads as a UI panel, and wax that has been burning never has a straight side.
 */
function waxColumn(
  g: Phaser.GameObjects.Graphics,
  x: number, topY: number, botY: number, scale: number,
): void {
  const steps = 8;
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    pts.push(new Phaser.Geom.Point(x - columnHalf(u) * scale, topY + (botY - topY) * u));
  }
  for (let i = steps; i >= 0; i--) {
    const u = i / steps;
    pts.push(new Phaser.Geom.Point(x + columnHalf(u) * scale, topY + (botY - topY) * u));
  }
  g.fillPoints(pts, true);
  // Round the crown and the foot so the silhouette never ends in a corner.
  g.fillEllipse(x, topY, HALF_TOP * 2 * scale, 9 * scale);
  g.fillEllipse(x, botY, HALF_BOT * 2 * scale, 11 * scale);
}

/**
 * A run of wax down the side of the column: a tapering chain of discs ending in a heavy
 * bulb, because a drip that has stopped moving always pools at its tip.
 */
function waxDrip(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, len: number, width: number,
): void {
  const beads = Math.max(3, Math.round(len / 3.5));
  for (let i = 0; i <= beads; i++) {
    const u = i / beads;
    g.fillCircle(x, y + len * u, width * (1 - u * 0.45));
  }
  g.fillCircle(x, y + len, width * 1.15);
}

/**
 * A candle flame: a teardrop that is widest a third of the way up and drawn out to a point,
 * leaning by `lean` at the tip. Built point-by-point rather than from circles so the taper
 * is continuous — stacked circles read as a caterpillar at this size.
 */
function flameTeardrop(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, height: number, width: number, lean: number,
): void {
  const steps = 13;
  const half = (u: number) => width * Math.pow(Math.sin(Math.PI * (0.30 + 0.70 * u)), 0.85);
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    pts.push(new Phaser.Geom.Point(x + lean * u * u - half(u), y - height * u));
  }
  for (let i = steps; i >= 0; i--) {
    const u = i / steps;
    pts.push(new Phaser.Geom.Point(x + lean * u * u + half(u), y - height * u));
  }
  g.fillPoints(pts, true);
  // Close the base off roundly — the polygon alone leaves a flat lip above the wick.
  g.fillEllipse(x, y, width * 1.6, width * 0.95);
}

/** Layered flame: deep violet shell, body, bright core, white heart at the wick. */
function flameLayered(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, height: number, width: number, lean: number, alpha: number,
): void {
  g.fillStyle(CANDLE.flameDeep, alpha * 0.5);
  flameTeardrop(g, x, y + 1, height * 1.08, width * 1.2, lean);
  g.fillStyle(CANDLE.flameMid, alpha * 0.82);
  flameTeardrop(g, x, y, height, width, lean);
  g.fillStyle(CANDLE.flameHi, alpha * 0.9);
  flameTeardrop(g, x, y - 1, height * 0.66, width * 0.62, lean * 0.7);
  g.fillStyle(CANDLE.flamePale, alpha * 0.95);
  flameTeardrop(g, x, y - 1.5, height * 0.34, width * 0.36, lean * 0.4);
  // The hottest part of a candle flame is the collar right above the wick, not the tip.
  g.fillStyle(CANDLE.white, alpha * 0.8);
  g.fillEllipse(x, y - height * 0.1, width * 0.5, width * 0.75);
}

// ── CandleFx ──────────────────────────────────────────────────────────────

/** The one-shot bits the rig itself throws off: wax motes and soot. */
class CandleFx extends FxBase {
  constructor(scene: Phaser.Scene) {
    super(scene, (c) => c);
  }

  /** A mote of lit wax lifting off a moving hand, cooling as it rises. */
  mote(x: number, y: number): void {
    const drift = (Math.random() - 0.5) * 22;
    const r = 1.6 + Math.random() * 1.6;
    this.anim(5, 620, (g, t) => {
      const fade = 1 - t;
      const px = x + drift * easeOut(t);
      const py = y - 30 * easeIn(t) - 6 * t;
      g.fillStyle(CANDLE.flame, 0.45 * fade);
      g.fillCircle(px, py, r * 1.9 * fade);
      g.fillStyle(CANDLE.flamePale, 0.9 * fade);
      g.fillCircle(px, py, r * fade);
    });
  }
}

// ── CandleAvatar ──────────────────────────────────────────────────────────

interface Drip {
  /** Where down the column the run starts, 0 = crown. */
  u: number;
  /** -1 left edge, 1 right edge, 0 = straight down the face. */
  side: -1 | 0 | 1;
  /** Horizontal offset for face drips. */
  ox: number;
  len: number;
  width: number;
}

export class CandleAvatar extends BaseAvatar {
  private fx: CandleFx;
  /** Frozen wax — seeded once so the drips don't crawl about between frames. */
  private drips: Drip[];
  /** Phase offsets so the three mastered flames never flicker in lockstep. */
  private flamePhase = [0, 2.1, 4.3];

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, CANDLE_AVATAR);
    this.fx = new CandleFx(scene);
    this.drips = [
      { u: 0.04, side: -1, ox: 0, len: 15, width: 3.2 },
      { u: 0.02, side: 1, ox: 0, len: 9, width: 2.6 },
      { u: 0.30, side: 1, ox: 0, len: 12, width: 3.0 },
      { u: 0.05, side: 0, ox: -8, len: 20, width: 2.8 },
      { u: 0.03, side: 0, ox: 6.5, len: 12, width: 2.3 },
      { u: 0.08, side: 0, ox: 13, len: 7, width: 2.0 },
    ];
  }

  /**
   * Mastery tell — the stub becomes a candelabra. Handled almost entirely in the drawing
   * hooks off `this.mastered`; what belongs here is the state that lives on GameObjects:
   * brighter eyes and a wider corona on each wax hand.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? CANDLE.white : CANDLE.waxLit);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 13 : 9.5);
      halo.setFillStyle(on ? CANDLE.flameHi : CANDLE.flame, on ? 0.32 : 0.26);
    });
  }

  protected emitTrail(x: number, y: number): void {
    this.fx.mote(x, y);
  }

  // ── Geometry shared by the three hooks ──────────────────────────────────

  private get topY(): number {
    return this.mastered ? TOP_Y_MASTERED : TOP_Y_PLAIN;
  }

  /**
   * How far the flames lean. The rig's hands lag the body on springs, so their drift away
   * from centre is a free read on which way the character is running — and a candle carried
   * at a run always trails its flame.
   */
  private leanFrom(x: number): number {
    const mean = (this.armX[0] + this.armX[1]) / 2;
    return Phaser.Math.Clamp((mean - x) * 0.5, -9, 9);
  }

  /** Tips of the mastered candelabra arms, in world space. */
  private armTips(x: number, y: number): { x: number; y: number }[] {
    const sway = Math.sin(this.t * 1.8) * 1.4;
    return [
      { x: x - 27, y: y - 30 + sway },
      { x: x + 27, y: y - 30 - sway },
    ];
  }

  // ── Layers ──────────────────────────────────────────────────────────────

  /** Candlelight: a pool of it on the floor and a soft violet bloom around the wick. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const flicker = 0.9 + Math.sin(this.t * 9.4) * 0.06 + Math.sin(this.t * 15.1) * 0.04;
    const reach = (this.mastered ? 1.35 : 1) * this.intensity * flicker;

    g.fillStyle(CANDLE.flame, a * 0.16 * this.intensity);
    g.fillEllipse(x, y + BASE_Y + 4, 96 * reach, 34 * reach);
    g.fillStyle(CANDLE.flamePale, a * 0.1 * this.intensity);
    g.fillEllipse(x, y + BASE_Y + 4, 60 * reach, 21 * reach);

    // Bloom around the burning end, wide enough to wash over the shoulders.
    g.fillStyle(CANDLE.flame, a * 0.22 * this.intensity);
    g.fillCircle(x, y + this.topY - 14, 38 * reach);
    g.fillStyle(CANDLE.glow, a * 0.12 * this.intensity);
    g.fillCircle(x, y + this.topY - 14, 22 * reach);
  }

  /**
   * The wax itself, painted over the fighter sprite and under the face. Everything above the
   * crown — crater, wick, flame — belongs to `drawExtras`, so the eyes stay clear.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const topY = y + this.topY;
    const botY = y + BASE_Y;

    // Melted wax spreading at the foot, drawn first so the column stands in it.
    g.fillStyle(CANDLE.waxPool, alpha * 0.9);
    g.fillEllipse(x, botY + 3, 62, 15);
    g.fillStyle(CANDLE.waxShade, alpha * 0.55);
    g.fillEllipse(x, botY + 5, 48, 10);

    // Column: shadow side first, then the body, then a narrow lit band down the front left.
    // The band is a third column rather than a straight rectangle so it follows the taper —
    // a straight highlight on a barrel immediately reads as flat.
    g.fillStyle(CANDLE.waxDeep, alpha);
    waxColumn(g, x + 2.5, topY + 1, botY, 1);
    g.fillStyle(CANDLE.wax, alpha);
    waxColumn(g, x, topY, botY, 1);
    g.fillStyle(CANDLE.waxLit, alpha * 0.6);
    waxColumn(g, x - 7.5, topY + 3, botY - 4, 0.42);

    // Frozen runs of wax down the sides and face.
    g.fillStyle(CANDLE.waxLit, alpha * 0.95);
    for (const d of this.drips) {
      const dy = topY + (botY - topY) * d.u;
      const dx = d.side === 0
        ? x + d.ox
        : x + d.side * (columnHalf(d.u) - d.width * 0.7);
      waxDrip(g, dx, dy, d.len, d.width);
    }
    // A cool shadow under each run so they sit on the wax instead of in it.
    g.fillStyle(CANDLE.waxShade, alpha * 0.4);
    for (const d of this.drips) {
      const dy = topY + (botY - topY) * d.u;
      const dx = (d.side === 0 ? x + d.ox : x + d.side * (columnHalf(d.u) - d.width * 0.7)) + 1.6;
      waxDrip(g, dx, dy + 1.5, d.len, d.width * 0.55);
    }

    if (this.mastered) {
      this.drawBrass(g, x, y, alpha);
      this.drawCandelabraArms(g, x, y, alpha);
    }
  }

  /** Gilt collar round the waist and a brass foot — the mastered candle is a kept one. */
  private drawBrass(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const botY = y + BASE_Y;

    // Foot: a stepped brass dish the wax pool sits inside.
    g.fillStyle(CANDLE.brassDim, alpha);
    g.fillEllipse(x, botY + 9, 74, 20);
    g.fillStyle(CANDLE.brass, alpha);
    g.fillEllipse(x, botY + 7, 70, 17);
    g.fillStyle(CANDLE.brassLit, alpha * 0.75);
    g.fillEllipse(x, botY + 5, 56, 11);
    g.fillStyle(CANDLE.brassDim, alpha * 0.6);
    g.fillEllipse(x, botY + 5, 40, 7);
    // The dish is drawn over the melt pool, so put the wax that gathered in it back on top.
    g.fillStyle(CANDLE.waxPool, alpha * 0.95);
    g.fillEllipse(x, botY + 4, 44, 9);
    g.fillStyle(CANDLE.waxLit, alpha * 0.7);
    g.fillEllipse(x, botY + 3, 30, 5.5);

    // Collar: a band clamped round the column, low enough to clear the eyeline.
    const cy = y + 11;
    g.fillStyle(CANDLE.brassDim, alpha);
    g.fillRoundedRect(x - 25, cy - 7, 50, 16, 4);
    g.fillStyle(CANDLE.brass, alpha);
    g.fillRoundedRect(x - 24, cy - 6.5, 48, 13, 3.5);
    g.fillStyle(CANDLE.brassLit, alpha * 0.9);
    g.fillRoundedRect(x - 23, cy - 6, 46, 4, 2);
    for (const rx of [-15, 0, 15]) {
      g.fillStyle(CANDLE.brassDim, alpha * 0.8);
      g.fillCircle(x + rx, cy + 2.5, 2.2);
      g.fillStyle(CANDLE.brassLit, alpha * 0.9);
      g.fillCircle(x + rx - 0.5, cy + 2, 1.1);
    }
  }

  /** Two wax arms curving up off the shoulders, each ending in a stub of candle. */
  private drawCandelabraArms(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const tips = this.armTips(x, y);
    for (let s = 0; s < 2; s++) {
      const dir = s === 0 ? -1 : 1;
      const tip = tips[s];
      // Rooted above the eyeline: the wax layer sits under the face, so an arm branching
      // any lower would pass behind the eyes and read as growing out of them.
      const rootX = x + dir * 13;
      const rootY = y - 16;
      // Tapered tube of wax, swept out and up through a control point below the tip.
      const beads = 12;
      for (let i = 0; i <= beads; i++) {
        const u = i / beads;
        const inv = 1 - u;
        const cx = inv * inv * rootX + 2 * inv * u * (x + dir * 30) + u * u * tip.x;
        const cy = inv * inv * rootY + 2 * inv * u * (y - 17) + u * u * (tip.y + 6);
        const r = 6.2 - u * 2.2;
        g.fillStyle(CANDLE.waxDeep, alpha * 0.85);
        g.fillCircle(cx + 1.4, cy + 1.4, r);
        g.fillStyle(CANDLE.wax, alpha);
        g.fillCircle(cx, cy, r);
        g.fillStyle(CANDLE.waxLit, alpha * 0.6);
        g.fillCircle(cx - 1.4, cy - 1.4, r * 0.55);
      }
      // The stub of candle standing on the tip.
      g.fillStyle(CANDLE.waxDeep, alpha);
      g.fillRoundedRect(tip.x - 6.5 + 1.2, tip.y - 8, 13, 15, 3);
      g.fillStyle(CANDLE.wax, alpha);
      g.fillRoundedRect(tip.x - 6.5, tip.y - 9, 13, 15, 3);
      g.fillStyle(CANDLE.waxLit, alpha * 0.8);
      g.fillRoundedRect(tip.x - 5.5, tip.y - 8, 4.5, 12, 2);
    }
  }

  /**
   * Everything from the crown up: the burnt-out crater, the wick, and the flame — plus the
   * two side flames once the candelabra is out. All of it rooted above the eyes.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const topY = y + this.topY;
    const lean = this.leanFrom(x);

    // Crater: the rim the wax has burnt down into, with a molten pool sitting in it.
    g.fillStyle(CANDLE.waxShade, alpha);
    g.fillEllipse(x, topY, HALF_TOP * 2, 10);
    g.fillStyle(CANDLE.waxLit, alpha);
    g.fillEllipse(x, topY - 1.4, HALF_TOP * 1.9, 8.4);
    g.fillStyle(CANDLE.waxDeep, alpha * 0.85);
    g.fillEllipse(x, topY - 0.6, HALF_TOP * 1.2, 5);
    // Molten pool, lit from the flame above it.
    const shimmer = 0.72 + Math.sin(this.t * 6.3) * 0.1;
    g.fillStyle(CANDLE.flamePale, alpha * 0.5 * shimmer);
    g.fillEllipse(x, topY - 1, HALF_TOP * 0.95, 4);
    g.fillStyle(CANDLE.glow, alpha * 0.4 * shimmer);
    g.fillEllipse(x, topY - 1.4, HALF_TOP * 0.55, 2.4);

    this.drawWickedFlame(g, x, topY - 2, 1, lean, 0, a, alpha);

    if (this.mastered) {
      const tips = this.armTips(x, y);
      for (let s = 0; s < 2; s++) {
        const tip = tips[s];
        // Melted lip on each stub so the side candles read as lit, not as pegs.
        g.fillStyle(CANDLE.waxLit, alpha);
        g.fillEllipse(tip.x, tip.y - 9, 13, 5);
        g.fillStyle(CANDLE.flamePale, alpha * 0.45 * shimmer);
        g.fillEllipse(tip.x, tip.y - 9.5, 7, 2.6);
        this.drawWickedFlame(g, tip.x, tip.y - 10, 0.72, lean * 0.8, s + 1, a, alpha);
      }
      // Soot lifting off the middle flame, the only thing above the whole silhouette.
      for (let i = 0; i < 3; i++) {
        const p = (this.t * 0.55 + i / 3) % 1;
        const sx = x + Math.sin(this.t * 2.2 + i * 2.4) * 7 + lean * 1.4;
        const sy = topY - 34 - p * 26;
        g.fillStyle(CANDLE.flameDeep, alpha * 0.3 * (1 - p));
        g.fillCircle(sx, sy, 3.2 * (1 - p * 0.5));
      }
    }
  }

  /** One wick and the flame standing on it. `slot` picks the flicker phase. */
  private drawWickedFlame(
    g: Phaser.GameObjects.Graphics,
    x: number, baseY: number, scale: number, lean: number, slot: number,
    a: number, alpha: number,
  ): void {
    const ph = this.flamePhase[slot];
    const flicker = 1 + Math.sin(this.t * 10.7 + ph) * 0.09 + Math.sin(this.t * 17.3 + ph * 1.7) * 0.05;
    const wickLen = 7 * scale;

    // Wick: charred at the tip, glowing where the flame sits on it, and slightly bent.
    g.lineStyle(2.4 * scale, CANDLE.wick, alpha);
    g.beginPath();
    g.moveTo(x, baseY);
    g.lineTo(x + lean * 0.16, baseY - wickLen * 0.6);
    g.lineTo(x + lean * 0.3 + 1.2 * scale, baseY - wickLen);
    g.strokePath();
    g.fillStyle(CANDLE.wickHot, alpha * 0.9);
    g.fillCircle(x, baseY - 1, 1.8 * scale);

    const height = (20 * scale) * flicker * this.intensity * (this.mastered ? 1.15 : 1);
    const width = (6.4 * scale) * (0.94 + (flicker - 1) * 0.6) * this.intensity;
    const fy = baseY - wickLen * 0.55;

    // Halo first, so the flame body burns through the middle of it.
    g.fillStyle(CANDLE.flame, a * 0.28);
    g.fillEllipse(x + lean * 0.3, fy - height * 0.45, width * 5.2, height * 1.5);
    flameLayered(g, x, fy, height, width, lean, alpha);

    // Sparks pulling off the tip.
    for (let i = 0; i < 2; i++) {
      const p = (this.t * (1.1 + i * 0.4) + slot * 0.3 + i * 0.5) % 1;
      const sx = x + lean * (0.9 + p * 0.4) + Math.sin(this.t * 5 + i * 3 + slot) * 3.4;
      const sy = fy - height * (1 + p * 0.7);
      g.fillStyle(CANDLE.flamePale, alpha * 0.7 * (1 - p));
      g.fillCircle(sx, sy, 1.7 * scale * (1 - p * 0.6));
    }
  }
}
