import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from '../ElementVisuals';

/**
 * The Wither skin's character: life's fighter replaced by the dead thing it grew into.
 *
 * Two forms, same as any element rig. **Unmastered** is a hollow stump — a squat trunk split
 * open down the front, bark peeling off it in plates, bracket fungus on the flank and three
 * bare twigs where the crown used to be. **Mastered** is a whole dead tree: a taller blackened
 * bole on buttressed roots, a broken fork of leafless branches over the head, rags of grey moss
 * hanging off them, ash lifting out of the hollow and one cold ember still alight down inside it.
 *
 * The eyes sit inside the hollow on purpose. `drawBody` paints under the face, so the void it
 * cuts down the trunk leaves the two pale discs burning in a socket rather than on a surface.
 *
 * Unlike an element's own avatar this one takes no colour mapper — a skin's palette is already
 * the final one, and routing dead wood through life's remap would turn it green.
 */

const WITHER = {
  grave: 0x0a0908,
  hollow: 0x121110,
  deep: 0x1c1a18,
  bark: 0x2e2622,
  stem: 0x33302c,
  rot: 0x3a3128,
  wood: 0x45403a,
  grey: 0x5e574e,
  dust: 0x8c8270,
  ash: 0x8f877a,
  pallor: 0xc9c0ad,
  bone: 0xe8e2d6,
  /** The one live thing left: a coal down in the hollow that never quite went out. */
  ember: 0x7e7350,
};

/** Knots of dead wood with a rotted-out core — concentric discs of one hand, outermost first. */
const WITHER_AVATAR: AvatarSpec = {
  hands: [
    { r: 9.5, color: WITHER.bark, alpha: 0.32 },
    { r: 6.6, color: WITHER.wood, alpha: 1 },
    { r: 3.8, color: WITHER.grave, alpha: 1 },
    { r: 1.5, color: WITHER.pallor, alpha: 0.9, ox: -1.6, oy: -1.6 },
  ],
  eyeWhite: WITHER.pallor,
  eyePupil: WITHER.grave,
  // Dead wood barely deforms — it lags heavily and holds its shape when it does.
  squash: { div: 18, x: 0.34, y: 0.18 },
};

const BASE_Y = 23;
const TOP_Y_PLAIN = -24;
const TOP_Y_MASTERED = -34;
const HALF_TOP = 22;
const HALF_BOT = 25;

// ── Primitives ────────────────────────────────────────────────────────────

/** Where the trunk bulges and pinches, sampled down its length. Fixed, so it never crawls. */
const KNOTS = [0.02, -0.06, 0.05, -0.03, 0.08, -0.05, 0.03, 0.06, -0.02, 0.04, 0];

/**
 * The bole: a column that is never quite the same width twice, because a trunk that has been
 * dying for years is all knots and hollows. The `KNOTS` ripple is applied to both flanks
 * independently by index parity, so the two sides never mirror each other — a mirrored trunk
 * reads as a vase.
 */
function deadTrunk(
  g: Phaser.GameObjects.Graphics,
  x: number, topY: number, botY: number, scale = 1,
): void {
  const steps = KNOTS.length - 1;
  const half = (u: number, i: number, side: number): number => {
    const base = (HALF_TOP + (HALF_BOT - HALF_TOP) * Math.pow(u, 1.6)) * scale;
    const k = KNOTS[side > 0 ? i : steps - i];
    return base * (1 + k);
  };
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    pts.push(new Phaser.Geom.Point(x - half(u, i, -1), topY + (botY - topY) * u));
  }
  for (let i = steps; i >= 0; i--) {
    const u = i / steps;
    pts.push(new Phaser.Geom.Point(x + half(u, i, 1), topY + (botY - topY) * u));
  }
  g.fillPoints(pts, true);
  // A snapped-off crown, not a rounded one: dead trees break, they don't taper politely.
  g.fillEllipse(x, topY + 1, HALF_TOP * 1.7 * scale, 7 * scale);
}

/**
 * The hollow down the front of the bole: a socket, widest at the eyeline and closing to a
 * point at both ends. Drawn point-by-point so the opening curves the way rot actually eats
 * through a trunk — an oval reads as a knothole, which is far too tidy.
 */
function hollowSocket(
  g: Phaser.GameObjects.Graphics,
  x: number, topY: number, botY: number, maxHalf: number, ragged: number,
): void {
  const steps = 14;
  const left: Phaser.Geom.Point[] = [];
  const right: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const w = maxHalf * Math.sin(Math.PI * Math.pow(f, 0.62));
    // Alternating bite marks down each lip so the edge is chewed rather than cut.
    const bite = (i % 2 === 0 ? ragged : -ragged) * (1 - Math.abs(f - 0.5) * 1.2);
    const py = topY + (botY - topY) * f;
    left.push(new Phaser.Geom.Point(x - w - bite, py));
    right.push(new Phaser.Geom.Point(x + w + bite, py));
  }
  right.reverse();
  g.fillPoints(left.concat(right), true);
}

/**
 * A plate of bark lifting off the trunk: a rough quadrilateral with one edge pulled away from
 * the wood, plus the dark gap it leaves behind it.
 */
function barkPlate(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number, lift: number, dark: number, light: number, alpha: number,
): void {
  g.fillStyle(dark, alpha * 0.85);
  g.fillPoints([
    new Phaser.Geom.Point(x, y),
    new Phaser.Geom.Point(x + w, y - h * 0.18),
    new Phaser.Geom.Point(x + w + lift * 0.6, y + h),
    new Phaser.Geom.Point(x + lift, y + h * 0.86),
  ], true);
  g.fillStyle(light, alpha * 0.7);
  g.fillPoints([
    new Phaser.Geom.Point(x + 1.4, y + 1.6),
    new Phaser.Geom.Point(x + w - 1.6, y + 0.4),
    new Phaser.Geom.Point(x + w * 0.6, y + h * 0.5),
  ], true);
}

/**
 * A leafless limb: tapered, curling harder the further out it runs, and recursively forked.
 * The fork is what makes it read as a branch — a single tapered spike is a thorn, two of them
 * splitting off a shared shaft is a tree.
 */
function deadBranch(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, angle: number, len: number, halfW: number,
  curl: number, depth: number,
): void {
  const segs = 8;
  const step = len / segs;
  const left: Phaser.Geom.Point[] = [];
  const right: Phaser.Geom.Point[] = [];
  let px = x, py = y, a = angle;
  let forkX = x, forkY = y, forkA = angle;

  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    const w = halfW * Math.pow(1 - f, 0.62);
    const nx = -Math.sin(a), ny = Math.cos(a);
    left.push(new Phaser.Geom.Point(px + nx * w, py + ny * w));
    right.push(new Phaser.Geom.Point(px - nx * w, py - ny * w));
    if (i === Math.round(segs * 0.55)) { forkX = px; forkY = py; forkA = a; }
    a += (curl * (0.4 + f * 1.6)) / segs;
    px += Math.cos(a) * step;
    py += Math.sin(a) * step;
  }
  right.reverse();
  g.fillPoints(left.concat(right), true);
  g.fillCircle(x, y, halfW);

  if (depth > 0) {
    const side = curl >= 0 ? -1 : 1;
    deadBranch(g, forkX, forkY, forkA + side * 0.62, len * 0.52, halfW * 0.56, -curl * 0.8, depth - 1);
    deadBranch(g, forkX, forkY, forkA + side * -0.28, len * 0.36, halfW * 0.42, curl * 1.2, depth - 1);
  }
}

/** A rag of dead moss hanging off a branch — a ragged strand that widens then frays out. */
function mossHang(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, len: number, sway: number,
): void {
  const steps = 7;
  const left: Phaser.Geom.Point[] = [];
  const right: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    // Wisps drift further the lower they hang, and the strand thins as it frays.
    const w = 2.6 * Math.sin(Math.PI * Math.pow(f, 0.45)) * (1 - f * 0.4);
    const px = x + sway * f * f + Math.sin(f * 5) * 1.4;
    const py = y + len * f;
    left.push(new Phaser.Geom.Point(px - w, py));
    right.push(new Phaser.Geom.Point(px + w, py));
  }
  right.reverse();
  g.fillPoints(left.concat(right), true);
}

// ── WitherFx ──────────────────────────────────────────────────────────────

/** The one-shot bits the rig itself throws off: ash and flakes of dead bark. */
class WitherFx extends FxBase {
  constructor(scene: Phaser.Scene) {
    super(scene, (c) => c);
  }

  /**
   * A flake of ash shaken loose by a moving hand. It flutters — a sideways oscillation that
   * widens as it falls — because ash is light enough that it never drops straight, and a
   * straight fall would read as a spark instead.
   */
  mote(x: number, y: number): void {
    const drift = (Math.random() - 0.5) * 18;
    const flutter = 3 + Math.random() * 4;
    const phase = Math.random() * TAU;
    const r = 1.4 + Math.random() * 1.6;
    this.anim(5, 780, (g, t) => {
      const fade = 1 - t * t;
      const px = x + drift * easeOut(t) + Math.sin(phase + t * 9) * flutter * t;
      const py = y - 8 * easeOut(t) + 30 * easeIn(t);
      g.fillStyle(WITHER.deep, 0.45 * fade);
      g.fillCircle(px, py, r * 1.7);
      g.fillStyle(WITHER.ash, 0.85 * fade);
      g.fillCircle(px, py, r);
    });
  }
}

// ── WitherAvatar ──────────────────────────────────────────────────────────

interface Plate {
  /** Where down the trunk it sits, 0 = crown. */
  u: number;
  ox: number;
  w: number;
  h: number;
  lift: number;
}

interface Bracket {
  u: number;
  side: -1 | 1;
  r: number;
}

export class WitherAvatar extends BaseAvatar {
  private fx: WitherFx;
  /** Peeling bark, seeded once so the plates don't crawl about between frames. */
  private plates: Plate[];
  /** Shelf fungus growing out of the flanks. */
  private brackets: Bracket[];
  /** Phase offsets so the crown branches never sway in lockstep. */
  private branchPhase = [0, 1.9, 3.7, 5.2, 2.6];

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, WITHER_AVATAR);
    this.fx = new WitherFx(scene);
    this.plates = [
      { u: 0.16, ox: -20, w: 11, h: 13, lift: -3.2 },
      { u: 0.40, ox: 13, w: 12, h: 15, lift: 3.6 },
      { u: 0.58, ox: -18, w: 9, h: 11, lift: -2.4 },
      { u: 0.74, ox: 16, w: 10, h: 12, lift: 2.8 },
      { u: 0.30, ox: -8, w: 7, h: 9, lift: -1.6 },
    ];
    this.brackets = [
      { u: 0.34, side: -1, r: 8 },
      { u: 0.52, side: 1, r: 6.5 },
      { u: 0.80, side: -1, r: 5 },
    ];
  }

  /**
   * Mastery tell — the stump becomes a whole dead tree. Almost all of it happens in the
   * drawing hooks off `this.mastered`; what belongs here is the state that lives on
   * GameObjects: eyes burning bone-white in the hollow, and an ash rim round each knot.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? WITHER.bone : WITHER.pallor);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 13 : 9.5);
      halo.setFillStyle(on ? WITHER.grey : WITHER.bark, on ? 0.36 : 0.32);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.6, WITHER.ash, 0.85);
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
   * How far the crown is leaning. The rig's hands lag the body on springs, so their drift is a
   * free read on which way the character is running — and a dead crown with nothing left to
   * catch the air still swings on its own weight.
   */
  private leanFrom(x: number): number {
    const mean = (this.armX[0] + this.armX[1]) / 2;
    return Phaser.Math.Clamp((mean - x) * 0.4, -8, 8);
  }

  // ── Layers ──────────────────────────────────────────────────────────────

  /** Not a glow so much as an absence: dead ground, spent leaf litter, and a cold shadow. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const spread = (this.mastered ? 1.3 : 1) * this.intensity;

    g.fillStyle(WITHER.grave, a * 0.5 * this.intensity);
    g.fillEllipse(x, y + BASE_Y + 3, 88 * spread, 28 * spread);
    g.fillStyle(WITHER.rot, a * 0.3 * this.intensity);
    g.fillEllipse(x, y + BASE_Y + 5, 58 * spread, 17 * spread);

    // A ring of curled dead leaves that never blew away, lifting slightly and settling back.
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * TAU + this.t * 0.16;
      const rad = 30 + Math.sin(this.t * 1.1 + i * 2.2) * 6;
      const lx = x + Math.cos(ang) * rad * spread;
      const ly = y + BASE_Y + 4 + Math.sin(ang) * rad * 0.3 * spread;
      g.fillStyle(WITHER.rot, a * 0.7);
      g.fillEllipse(lx, ly, 8, 3.4);
      g.fillStyle(WITHER.grey, a * 0.4);
      g.fillEllipse(lx - 1, ly - 0.8, 4.5, 1.8);
    }
  }

  /**
   * The bole itself, painted over the fighter sprite and under the face. Everything above the
   * crown — the broken branches and the moss — belongs to `drawExtras`; the hollow is here so
   * the eyes render inside it.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const topY = y + this.topY;
    const botY = y + BASE_Y;

    if (this.mastered) this.drawRootFlare(g, x, botY, alpha);

    // Shadow side, body, then a narrow dry-lit band down the left flank that follows the taper.
    g.fillStyle(WITHER.grave, alpha);
    deadTrunk(g, x + 3, topY + 1.5, botY);
    g.fillStyle(WITHER.bark, alpha);
    deadTrunk(g, x, topY, botY);
    g.fillStyle(WITHER.wood, alpha * 0.75);
    deadTrunk(g, x - 8.5, topY + 3, botY - 5, 0.4);

    // Grain running the length of the trunk — thin, broken, never straight for long.
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      g.lineStyle(1.1, i % 2 === 0 ? WITHER.grave : WITHER.stem, alpha * 0.55);
      g.beginPath();
      for (let s = 0; s <= 6; s++) {
        const f = s / 6;
        const gx = x + i * 6 + Math.sin(f * 4 + i) * 1.8;
        const gy = topY + (botY - topY) * f;
        if (s === 0) g.moveTo(gx, gy); else g.lineTo(gx, gy);
      }
      g.strokePath();
    }

    // Peeling plates of bark.
    for (const p of this.plates) {
      const py = topY + (botY - topY) * p.u;
      barkPlate(g, x + p.ox, py, p.w, p.h, p.lift, WITHER.grave, WITHER.grey, alpha);
    }

    // Bracket fungus: a dark underside, a pale shelf, and growth rings across it.
    for (const b of this.brackets) {
      const by = topY + (botY - topY) * b.u;
      const bx = x + b.side * (HALF_TOP - 3);
      g.fillStyle(WITHER.grave, alpha * 0.9);
      g.fillEllipse(bx + b.side * b.r * 0.5, by + 2, b.r * 2.1, b.r * 0.9);
      g.fillStyle(WITHER.grey, alpha);
      g.fillEllipse(bx + b.side * b.r * 0.5, by, b.r * 2.2, b.r * 1.05);
      g.fillStyle(WITHER.ash, alpha * 0.8);
      g.fillEllipse(bx + b.side * b.r * 0.45, by - 1.2, b.r * 1.5, b.r * 0.6);
      g.lineStyle(0.9, WITHER.rot, alpha * 0.7);
      g.strokeEllipse(bx + b.side * b.r * 0.5, by - 0.4, b.r * 1.2, b.r * 0.5);
    }

    // The hollow. Cut last so it sits over the bark, and left dark so the eyes burn in it.
    const hollowTop = y - (this.mastered ? 24 : 20);
    const hollowBot = y + 12;
    g.fillStyle(WITHER.stem, alpha);
    hollowSocket(g, x, hollowTop - 1.5, hollowBot + 1.5, 15, 1.6);
    g.fillStyle(WITHER.grave, alpha);
    hollowSocket(g, x, hollowTop, hollowBot, 13, 1.2);

    if (this.mastered) {
      // The coal down at the bottom of the socket, breathing.
      const pulse = 0.55 + 0.45 * Math.sin(this.t * 2.2);
      g.fillStyle(WITHER.rot, alpha * 0.55 * pulse);
      g.fillEllipse(x, hollowBot - 5, 15, 9);
      g.fillStyle(WITHER.ember, alpha * 0.7 * pulse);
      g.fillEllipse(x, hollowBot - 5, 8, 4.6);
      g.fillStyle(WITHER.pallor, alpha * 0.5 * pulse);
      g.fillEllipse(x, hollowBot - 5.5, 3.6, 2);
    }
  }

  /**
   * Mastered: buttress roots that have shouldered their way out of the ground. Angles are
   * written for the right-hand side and mirrored as `π - a`; the curl flips sign with them, so
   * both sides sweep *downward* into the soil rather than one of them curling back up.
   */
  private drawRootFlare(g: Phaser.GameObjects.Graphics, x: number, botY: number, alpha: number): void {
    for (const side of [-1, 1] as const) {
      for (let i = 0; i < 3; i++) {
        const out = 0.22 + i * 0.3;
        const ang = side > 0 ? out : Math.PI - out;
        const len = 26 + i * 5;
        const w = 5.4 - i;
        g.fillStyle(WITHER.grave, alpha * 0.9);
        deadBranch(g, x + side * 4 + 1.4, botY - 11, ang, len, w, side * 0.45, 0);
        g.fillStyle(WITHER.bark, alpha * 0.85);
        deadBranch(g, x + side * 4, botY - 12.5, ang, len, w * 0.85, side * 0.45, 0);
      }
    }
  }

  /**
   * Everything from the crown up: the snapped-off branches and what is hanging from them.
   * All of it rooted above the eyeline so the face stays clear.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const rootY = y + this.topY + 2;
    const lean = this.leanFrom(x);
    const count = this.mastered ? 5 : 3;
    const scale = this.mastered ? 1.5 : 1;

    for (let i = 0; i < count; i++) {
      const side = (i - (count - 1) / 2) / Math.max(1, (count - 1) / 2);
      const ph = this.t * 1.3 + this.branchPhase[i];
      // Dead wood barely moves — this is a creak, not a sway.
      const sway = Math.sin(ph) * 0.06;
      const ang = -Math.PI / 2 + side * 0.66 + sway + lean * 0.012;
      const len = (24 + Math.abs(side) * -4 + 6) * scale * this.intensity;
      const bx = x + side * 8;

      g.fillStyle(WITHER.grave, alpha * 0.9);
      deadBranch(g, bx + 1.4, rootY + 1.4, ang, len, 3.6 * scale, side * 0.55, this.mastered ? 2 : 1);
      g.fillStyle(WITHER.bark, alpha);
      deadBranch(g, bx, rootY, ang, len, 3.2 * scale, side * 0.55, this.mastered ? 2 : 1);
      // A dry lit edge along the top of each limb so the fork doesn't flatten out.
      g.fillStyle(WITHER.grey, alpha * 0.5);
      deadBranch(g, bx - 1, rootY - 1, ang, len * 0.8, 1.4 * scale, side * 0.55, 0);

      if (this.mastered) {
        // Moss hanging off the limb, drifting behind the character as it moves.
        const tipX = bx + Math.cos(ang + side * 0.5) * len * 0.85;
        const tipY = rootY + Math.sin(ang + side * 0.5) * len * 0.85;
        g.fillStyle(WITHER.grey, alpha * 0.7);
        mossHang(g, tipX, tipY, 13 + Math.sin(ph * 0.8) * 2, -lean * 0.4 + Math.sin(ph) * 2);
        g.fillStyle(WITHER.ash, alpha * 0.45);
        mossHang(g, tipX - 1, tipY, 9, -lean * 0.3 + Math.sin(ph) * 1.6);
      }
    }

    if (this.mastered) {
      // Ash lifting out of the hollow and off the crown — the only thing above the silhouette.
      for (let i = 0; i < 5; i++) {
        const p = (this.t * 0.42 + i / 5) % 1;
        const ax = x + Math.sin(this.t * 1.7 + i * 2.5) * 9 + lean * 1.2;
        const ay = rootY - 12 - p * 34;
        g.fillStyle(WITHER.grey, a * 0.42 * (1 - p));
        g.fillCircle(ax, ay, 3.4 * (1 - p * 0.6));
        g.fillStyle(WITHER.ash, a * 0.3 * (1 - p));
        g.fillCircle(ax - 0.8, ay - 0.8, 1.6 * (1 - p * 0.6));
      }
    }
  }
}
