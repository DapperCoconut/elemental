import Phaser from 'phaser';
import { ArmHold, ArmPose, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Slime draws.
 *
 * One material and one rule. The material is **ooze**: nothing in this element has a straight
 * edge or a fixed radius, every outline wobbles on its own seed, and every shape is drawn as a
 * dark body, a lighter fill and one bright crescent of shine sitting slightly off-centre — which
 * is the whole trick to making a flat fill read as wet. The rule is that **ooze sags**. Arms droop
 * between their endpoints, blobs are wider at the bottom than the top, and anything that has been
 * still for a moment starts dripping. A slime that holds a crisp circle looks like a ball; a slime
 * that hangs looks alive.
 *
 * The palette is a green ladder for the body and a pink ladder for gum, kept strictly apart —
 * green is what you are, pink is what you do to other people. The one exception is `solid`, the
 * pale glassy jade of hardened slime, which is allowed in both because Solidify is the ability
 * that turns one into the other.
 */

export type GumColorFn = ColorFn;

export const GUM = {
  /** Under everything — the shadow inside a translucent body. */
  murk: 0x0f2410,
  /** Green: the slime itself, its arm, its slimeballs. */
  oozeDeep: 0x1f6b2a,
  ooze: 0x46b93f,
  oozeLit: 0x8ce65a,
  /** The wet crescent. Only ever a highlight, never a fill. */
  shine: 0xe2ffc8,
  /** Pink: gum, and nothing else. Bubbles, encasement, the wall it sticks you to. */
  gumDeep: 0xa8306f,
  gum: 0xff70bd,
  gumLit: 0xffc9e8,
  /** Hardened slime — pale glassy jade. The bridge between the two ladders. */
  solidDeep: 0x2b8b76,
  solid: 0x7fe3c6,
  solidLit: 0xd6fff2,
};

/** Deterministic 0–1 noise, so a blob keeps the same lumps between frames. */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 41.7 + i * 91.3) * 24571.443;
  return v - Math.floor(v);
}

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * The core shape of the whole element: a blob with a wobbling rim, a darker underside and one
 * off-centre crescent of shine. `squat` bulges the bottom and flattens the top, which is what
 * separates a slime sitting on the floor from a ball hanging in the air.
 */
export function oozeBlob(
  g: Phaser.GameObjects.Graphics,
  tint: GumColorFn,
  x: number, y: number, r: number, alpha: number, t: number,
  {
    seed = 3, squat = 0, wobble = 0.12, deep = GUM.oozeDeep, fill = GUM.ooze, lit = GUM.oozeLit,
    shine = GUM.shine, rim = true,
  } = {},
): void {
  const pts = 14;
  const ring = (k: number, extra: number): Phaser.Geom.Point[] => {
    const out: Phaser.Geom.Point[] = [];
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * TAU;
      // Two wobbles at different rates so the outline never repeats on a short loop.
      const w = 1 + Math.sin(t * 2.1 + i * 1.9 + seed) * wobble
        + Math.sin(t * 3.7 + i * 0.7 + seed * 2) * wobble * 0.5;
      const down = Math.max(0, Math.sin(a)) * squat;
      const rr = (r * k + extra) * w * (1 + down * 0.22);
      out.push(new Phaser.Geom.Point(
        x + Math.cos(a) * rr * (1 + squat * 0.18),
        y + Math.sin(a) * rr * (1 - squat * 0.14),
      ));
    }
    return out;
  };

  g.fillStyle(tint(deep), alpha);
  g.fillPoints(ring(1, 1.6), true);
  g.fillStyle(tint(fill), alpha);
  g.fillPoints(ring(0.88, 0), true);
  // Inner lit core, pulled up and left so the body has a light source rather than a gradient.
  g.fillStyle(tint(lit), alpha * 0.4);
  g.fillEllipse(x - r * 0.16, y - r * 0.2, r * 1.02, r * 0.86);

  if (!rim) return;
  // The wet crescent: a stroked arc, not a filled circle — a fill reads as a bubble instead.
  const sa = -2.5 + Math.sin(t * 1.3 + seed) * 0.12;
  g.lineStyle(Math.max(1.2, r * 0.15), tint(shine), alpha * 0.85);
  g.beginPath();
  g.arc(x - r * 0.12, y - r * 0.18, r * 0.6, sa, sa + 1.15, false);
  g.strokePath();
}

/**
 * The stretchy arm. A tapered tube from the body to the hand that sags in the middle under its
 * own weight, drawn as one polygon down each side so the taper is continuous rather than a stack
 * of circles. `stretch` (0–1, how close to full reach) thins it and pulls the sag out, which is
 * the only readout the player gets for "you are nearly out of arm".
 */
export function gummyArm(
  g: Phaser.GameObjects.Graphics,
  tint: GumColorFn,
  x0: number, y0: number, x1: number, y1: number,
  w0: number, w1: number, alpha: number, t: number,
  { stretch = 0, seed = 5, deep = GUM.oozeDeep, fill = GUM.ooze, shine = GUM.shine } = {},
): void {
  const segs = 14;
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  // Sag is heaviest at half reach: a fully stretched arm is a taut line, a slack one droops.
  const sag = (1 - stretch) * Math.min(46, len * 0.16);

  const left: Phaser.Geom.Point[] = [];
  const right: Phaser.Geom.Point[] = [];
  const mid: { x: number; y: number; w: number }[] = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const cx = x0 + (x1 - x0) * u;
    const cy = y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * sag;
    // A slow travelling ripple, so a still arm still looks like liquid.
    const ripple = Math.sin(t * 4.2 - u * 7 + seed) * (1.4 + stretch * 1.6) * Math.sin(u * Math.PI);
    const w = (w0 + (w1 - w0) * u) * (1 - stretch * 0.34) + ripple * 0.25;
    mid.push({ x: cx + nx * ripple, y: cy + ny * ripple, w });
  }
  for (const m of mid) {
    left.push(new Phaser.Geom.Point(m.x + nx * m.w, m.y + ny * m.w));
    right.push(new Phaser.Geom.Point(m.x - nx * m.w, m.y - ny * m.w));
  }

  const shell = [...left, ...right.reverse()];
  g.fillStyle(tint(deep), alpha);
  g.fillPoints(shell.map((p) => new Phaser.Geom.Point(p.x, p.y + 1.4)), true);
  g.fillStyle(tint(fill), alpha);
  g.fillPoints(shell, true);

  // One continuous shine running the length of the arm, offset to the same side as the body's.
  g.lineStyle(Math.max(1, w0 * 0.28), tint(shine), alpha * 0.55);
  g.beginPath();
  for (let i = 0; i < mid.length; i++) {
    const m = mid[i];
    const px = m.x + nx * m.w * 0.42;
    const py = m.y + ny * m.w * 0.42 - m.w * 0.3;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
}

/** Drips hanging off the underside of something. They grow, neck, and let go. */
export function drips(
  g: Phaser.GameObjects.Graphics,
  tint: GumColorFn,
  x: number, y: number, spread: number, count: number, alpha: number, t: number,
  { seed = 9, color = GUM.ooze } = {},
): void {
  for (let i = 0; i < count; i++) {
    const j = jitter(seed, i);
    const px = x + (j - 0.5) * spread;
    // Each drip runs its own 0–1 cycle at its own rate, so they never fall in step.
    const cyc = (t * (0.5 + j * 0.5) + j) % 1;
    const len = 3 + cyc * (5 + j * 7);
    const r = (1.6 + j * 1.4) * (1 - cyc * 0.45);
    g.fillStyle(tint(color), alpha * (1 - cyc * 0.55));
    g.fillEllipse(px, y + len * 0.5, r * 1.5, len);
    g.fillCircle(px, y + len, r);
  }
}

/**
 * A gum bubble. Deliberately the one shape in the element that is nearly a clean circle — gum
 * holds its own shape and slime does not, and that difference is how the player tells at a glance
 * which of the two things on screen is theirs.
 */
export function gumBubble(
  g: Phaser.GameObjects.Graphics,
  tint: GumColorFn,
  x: number, y: number, r: number, alpha: number, t: number,
  { seed = 2, hard = false } = {},
): void {
  const breathe = 1 + Math.sin(t * 3.4 + seed) * 0.05;
  g.fillStyle(tint(hard ? GUM.solidDeep : GUM.gumDeep), alpha * 0.85);
  g.fillCircle(x, y, r * breathe + 1.4);
  g.fillStyle(tint(hard ? GUM.solid : GUM.gum), alpha * 0.62);
  g.fillCircle(x, y, r * breathe);
  g.lineStyle(1.6, tint(hard ? GUM.solidLit : GUM.gumLit), alpha * 0.9);
  g.strokeCircle(x, y, r * breathe);
  // Two shines at different sizes — one bubble with one dot reads as an eye.
  const sa = -2.3 + Math.sin(t * 1.1 + seed) * 0.2;
  g.lineStyle(Math.max(1.1, r * 0.13), tint(hard ? GUM.solidLit : GUM.gumLit), alpha * 0.95);
  g.beginPath();
  g.arc(x, y, r * 0.66, sa, sa + 0.9, false);
  g.strokePath();
  g.fillStyle(tint(GUM.shine), alpha * 0.8);
  g.fillCircle(x + r * 0.36, y + r * 0.34, r * 0.1);
}

/**
 * One shard of hardened slime: a long thin wedge with a facet down one side. Never symmetrical —
 * a symmetrical shard reads as an arrow, and these are supposed to look broken.
 */
export function slimeShard(
  g: Phaser.GameObjects.Graphics,
  tint: GumColorFn,
  x: number, y: number, ang: number, len: number, alpha: number,
  { seed = 1 } = {},
): void {
  const w = len * (0.24 + jitter(seed, 0) * 0.12);
  const skew = (jitter(seed, 1) - 0.5) * 0.5;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const P = (fx: number, fy: number) => new Phaser.Geom.Point(x + c * fx - s * fy, y + s * fx + c * fy);
  const body = [P(len * 0.55, 0), P(-len * 0.3, w), P(-len * 0.45, w * skew), P(-len * 0.28, -w * 0.8)];
  g.fillStyle(tint(GUM.solidDeep), alpha);
  g.fillPoints(body, true);
  g.fillStyle(tint(GUM.solid), alpha);
  g.fillPoints([P(len * 0.45, 0), P(-len * 0.24, w * 0.7), P(-len * 0.3, -w * 0.5)], true);
  // The facet: one bright edge along the long side, which is all a shard needs to look glassy.
  g.lineStyle(1.3, tint(GUM.solidLit), alpha * 0.95);
  const a = P(len * 0.5, 0);
  const b = P(-len * 0.26, -w * 0.6);
  g.lineBetween(a.x, a.y, b.x, b.y);
}

/**
 * The splat where the hand has gripped the floor — a flattened star of ooze with strands running
 * back out of it. `pull` (0–1) drags the strands toward the body, which is the tell for a grip
 * that is currently taking weight.
 */
export function gripSplat(
  g: Phaser.GameObjects.Graphics,
  tint: GumColorFn,
  x: number, y: number, r: number, alpha: number, t: number,
  { pull = 0, toward = 0, wall = false } = {},
): void {
  const color = wall ? GUM.gum : GUM.ooze;
  const deep = wall ? GUM.gumDeep : GUM.oozeDeep;
  g.fillStyle(tint(deep), alpha * 0.9);
  g.fillEllipse(x, y + 1.5, r * 2.3, r * 1.25);
  g.fillStyle(tint(color), alpha * 0.95);
  g.fillEllipse(x, y, r * 2, r * 1.05);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + Math.sin(t * 1.6 + i) * 0.15;
    const reach = r * (0.9 + jitter(41, i) * 1.1) * (1 + pull * 0.4 * Math.cos(a - toward));
    g.fillStyle(tint(color), alpha * 0.75);
    g.fillEllipse(x + Math.cos(a) * reach * 0.7, y + Math.sin(a) * reach * 0.38,
      r * 0.7, r * 0.34);
  }
  g.lineStyle(1.4, tint(GUM.shine), alpha * (0.4 + pull * 0.4));
  g.strokeEllipse(x, y - r * 0.2, r * 1.4, r * 0.6);
}

/** The gum casing around a fighter — a pink shell with the victim visible as a dark mass inside. */
export function gumShell(
  g: Phaser.GameObjects.Graphics,
  tint: GumColorFn,
  x: number, y: number, r: number, alpha: number, t: number,
  { hard = false, seed = 6 } = {},
): void {
  gumBubble(g, tint, x, y, r, alpha, t, { seed, hard });
  // Strands of gum webbing across the shell, so it reads as wrapped rather than bottled.
  const strands = hard ? 3 : 5;
  for (let i = 0; i < strands; i++) {
    const a = (i / strands) * Math.PI + t * (hard ? 0 : 0.35);
    g.lineStyle(2 + jitter(seed, i) * 1.6, tint(hard ? GUM.solidLit : GUM.gumLit), alpha * 0.55);
    g.beginPath();
    g.arc(x, y, r * (0.75 + jitter(seed, 10 + i) * 0.22), a, a + 1.5 + jitter(seed, 20 + i), false);
    g.strokePath();
  }
}

// ── Fx ────────────────────────────────────────────────────────────────────

export class GumFx extends FxBase {
  /** Something wet hitting something solid. */
  splat(x: number, y: number, r = 26, depth = 6, pink = false): void {
    const blobs = Array.from({ length: 8 }, (_, i) => ({
      a: (i / 8) * TAU + Math.random() * 0.5,
      d: 0.5 + Math.random() * 0.8,
      s: 0.35 + Math.random() * 0.5,
    }));
    this.anim(depth, 420, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(pink ? GUM.gumDeep : GUM.oozeDeep), (1 - t) * 0.7);
      g.fillEllipse(x, y, r * (1 + e * 1.5), r * (0.6 + e * 0.8));
      for (const b of blobs) {
        g.fillStyle(this.tint(pink ? GUM.gum : GUM.ooze), (1 - t) * 0.9);
        g.fillCircle(x + Math.cos(b.a) * r * b.d * e * 1.6, y + Math.sin(b.a) * r * b.d * e * 1.1,
          r * b.s * (1 - t * 0.7));
      }
      g.fillStyle(this.tint(GUM.shine), (1 - t) * 0.5);
      g.fillEllipse(x - r * 0.2, y - r * 0.25, r * (0.5 + e), r * (0.3 + e * 0.5));
    });
  }

  /** A bubble bursting — the pink half of the element's vocabulary. */
  pop(x: number, y: number, r = 22, depth = 7): void {
    const bits = Array.from({ length: 9 }, (_, i) => ({ a: (i / 9) * TAU, w: 0.6 + Math.random() * 0.9 }));
    this.anim(depth, 340, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(3 * (1 - t) + 0.6, this.tint(GUM.gumLit), (1 - t) * 0.9);
      g.strokeCircle(x, y, r * (0.4 + e * 1.3));
      for (const b of bits) {
        g.fillStyle(this.tint(GUM.gum), (1 - t) * 0.85);
        g.fillCircle(x + Math.cos(b.a) * r * e * 1.5 * b.w, y + Math.sin(b.a) * r * e * 1.5 * b.w,
          2.6 * (1 - t) + 0.8);
      }
    });
  }

  /** Slime going glassy — a jade ring snapping shut. */
  harden(x: number, y: number, r = 30, depth = 8): void {
    this.anim(depth, 460, (g, t) => {
      const e = easeIn(t);
      g.lineStyle(4 * (1 - t) + 1, this.tint(GUM.solidLit), (1 - t) * 0.95);
      g.strokeCircle(x, y, r * (1.9 - e * 1.1));
      g.fillStyle(this.tint(GUM.solid), (1 - t) * 0.35);
      g.fillCircle(x, y, r * (1.6 - e * 0.9));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + t * 1.5;
        slimeShard(g, this.tint, x + Math.cos(a) * r * (1.5 - e), y + Math.sin(a) * r * (1.5 - e),
          a, 12 * (1 - t * 0.4), (1 - t) * 0.9, { seed: i });
      }
    });
  }

  /** A burst of hardened shards flying out of a point. */
  shardBurst(x: number, y: number, count = 10, depth = 8): void {
    const bits = Array.from({ length: count }, (_, i) => ({
      a: (i / count) * TAU + Math.random() * 0.4,
      sp: 90 + Math.random() * 120,
      len: 10 + Math.random() * 8,
    }));
    this.anim(depth, 520, (g, t) => {
      const e = easeOut(t);
      for (const b of bits) {
        slimeShard(g, this.tint, x + Math.cos(b.a) * b.sp * e, y + Math.sin(b.a) * b.sp * e,
          b.a + t * 3, b.len, (1 - t) * 0.95, { seed: b.sp });
      }
    });
  }

  /** A projectile disappearing into the body. */
  swallow(x: number, y: number, depth = 7): void {
    this.anim(depth, 400, (g, t) => {
      const e = easeIn(t);
      g.lineStyle(3 * (1 - t) + 1, this.tint(GUM.oozeLit), (1 - t) * 0.9);
      g.strokeCircle(x, y, 34 * (1 - e * 0.85));
      g.fillStyle(this.tint(GUM.ooze), (1 - t) * 0.45);
      g.fillCircle(x, y, 26 * (1 - e * 0.8));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + t * 2.5;
        g.fillStyle(this.tint(GUM.shine), (1 - t) * 0.7);
        g.fillCircle(x + Math.cos(a) * 30 * (1 - e), y + Math.sin(a) * 30 * (1 - e), 2.4 * (1 - t) + 0.6);
      }
    });
  }

  /** The digest: what went in comes back out as health. */
  digest(x: number, y: number, depth = 7): void {
    this.anim(depth, 620, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + Math.sin(t * 4 + i) * 0.3;
        const d = 8 + e * 30;
        g.fillStyle(this.tint(i % 2 ? GUM.oozeLit : GUM.shine), (1 - t) * 0.85);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d - e * 22, 3.2 * (1 - t) + 1);
      }
    });
  }

  /** The shed particle behind a moving hand. */
  mote(x: number, y: number, depth = 4): void {
    const a = Math.random() * TAU;
    this.anim(depth, 520, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(t < 0.5 ? GUM.oozeLit : GUM.oozeDeep), (1 - t) * 0.7);
      g.fillCircle(x + Math.cos(a) * 8 * e, y + Math.sin(a) * 8 * e + t * 9, 2.6 * (1 - t) + 0.6);
    });
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const GUM_AVATAR: AvatarSpec = {
  hands: [
    { r: 12, color: GUM.oozeDeep, alpha: 0.4 },
    { r: 8.5, color: GUM.ooze, alpha: 0.95 },
    { r: 3, color: GUM.shine, alpha: 0.85, ox: -2.2, oy: -2.4 },
  ],
  eyeWhite: GUM.shine,
  eyePupil: GUM.murk,
  // Heavy, liquid smear: a slime hand thrown across the floor should stretch a long way.
  squash: { div: 11, x: 0.7, y: 0.34 },
};

/**
 * The slime.
 *
 * The character is built around one asymmetry: it has **no legs and one enormous arm**. The body
 * is a squat blob that sits on the floor in a puddle of itself and never takes a step; everything
 * it does, including moving, it does by throwing that arm somewhere and hauling. So the rig is
 * used lopsidedly on purpose — hand 1 is the giant hand and lives out at whatever reach the kit
 * gives it, hand 0 is a vestigial nub tucked against the body that never does anything.
 *
 * `setGrip` swells and flattens the hand when it has hold of the floor, `setCarry` closes it
 * around whatever it is holding, and `setHandless` deletes the arm entirely for the three seconds
 * after Solidify — leaving a dripping stump, which is the only time this character is genuinely
 * helpless and needs to look it.
 *
 * Mastered thickens the arm and adds a permanent inner core of hardened jade, so a mastered slime
 * is visibly part solid before it ever casts anything.
 */
export class GumAvatar extends BaseAvatar {
  /** Body→hand distance the kit wants, in px. */
  private reachDist = 26;
  private reachAng = 0;
  /** 0–1: the hand is anchored and taking weight. */
  private grip = 0;
  private gripTarget = 0;
  /** 0–1: the hand is closed around something. */
  private carry = 0;
  private carryTarget = 0;
  /** 0–1: no arm at all (Solidify). */
  private stump = 0;
  private stumpTarget = 0;
  /** 0–1: how much of full reach is used — thins the arm as it runs out. */
  private stretch = 0;

  constructor(scene: Phaser.Scene, tint: GumColorFn, depth = 6) {
    super(scene, tint, depth, GUM_AVATAR);
    this.setHold('reach');
  }

  /** Where the kit wants the giant hand, as a polar offset from the body. */
  setReach(dist: number, ang: number, stretch: number): void {
    this.reachDist = dist;
    this.reachAng = ang;
    this.stretch = Phaser.Math.Clamp(stretch, 0, 1);
    this.setHold('reach', ang);
  }

  setGrip(on: boolean): void { this.gripTarget = on ? 1 : 0; }
  setCarry(on: boolean): void { this.carryTarget = on ? 1 : 0; }
  setHandless(on: boolean): void { this.stumpTarget = on ? 1 : 0; }

  /** Where the hand actually ended up. The kit treats this as the hitbox, so it can never lie. */
  handPos(): { x: number; y: number } {
    return { x: this.armX[1], y: this.armY[1] };
  }

  update(delta: number, x: number, y: number, alpha: number): void {
    const k = Math.min(1, delta / 140);
    this.grip += (this.gripTarget - this.grip) * k;
    this.carry += (this.carryTarget - this.carry) * k;
    this.stump += (this.stumpTarget - this.stump) * Math.min(1, delta / 200);
    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (halo) => { halo.setRadius(on ? 14.5 : 12); });
    this.forEachHandLayer(2, (glint) => {
      glint.setFillStyle(this.tint(on ? GUM.solidLit : GUM.shine), on ? 0.95 : 0.85);
      glint.setRadius(on ? 4 : 3);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new GumFx(this.scene, this.tint).mote(x, y);
  }

  /**
   * The reach pose. Hand 1 goes wherever the kit says, however far that is; hand 0 is pulled in
   * tight and shrunk to a nub, because this character only really has one hand.
   */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'reach') return null;
    if (side < 0) {
      // The nub: it bobs against the body and stays out of the way.
      return { ang: this.reachAng + Math.PI * 0.78, dist: 13 + Math.sin(this.t * 2.4) * 1.4, scale: 0.5 };
    }
    if (this.stump > 0.5) {
      return { ang: this.reachAng, dist: 10, scale: 0.001 };
    }
    // Gripping flattens and swells the hand; carrying closes it into a tighter ball.
    const scale = idle.scale * (1 + this.grip * 0.5 - this.carry * 0.18)
      * (1 - Math.min(0.3, this.stretch * 0.3));
    return { ang: this.reachAng, dist: this.reachDist, scale };
  }

  /** The puddle it is sitting in, which is also its shadow. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    g.fillStyle(this.tint(GUM.murk), a * 0.55);
    g.fillEllipse(x, y + 17, 50, 16);
    // The puddle wobbles on its own clock — a slime is never quite still even when it is.
    const w = 1 + Math.sin(this.t * 1.9) * 0.06;
    g.fillStyle(this.tint(GUM.oozeDeep), a * 0.5);
    g.fillEllipse(x, y + 16, 42 * w, 12 * w);
    g.fillStyle(this.tint(GUM.ooze), a * 0.32);
    g.fillEllipse(x - 2, y + 15, 28 * w, 8 * w);
  }

  /**
   * The body: a squat, bottom-heavy blob with a couple of bubbles suspended in it and a flat
   * base where it meets the floor. Legless on purpose — the silhouette has to say "this thing
   * cannot walk" before the player has read a word of the passive.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    oozeBlob(g, this.tint, x, y + 2, 19, alpha, this.t, { seed: 12, squat: 0.42, wobble: 0.1 });
    // Suspended bubbles — the only thing that reads through a translucent body.
    for (let i = 0; i < 3; i++) {
      const j = jitter(21, i);
      const bx = x + (j - 0.5) * 18;
      const by = y + 10 - ((this.t * (0.25 + j * 0.3) + j) % 1) * 22;
      g.fillStyle(this.tint(GUM.oozeLit), alpha * 0.4);
      g.fillCircle(bx, by, 1.6 + j * 1.8);
      g.fillStyle(this.tint(GUM.shine), alpha * 0.5);
      g.fillCircle(bx - 0.6, by - 0.7, 0.7 + j * 0.5);
    }
    // The mastered core: a lump of hardened jade already sitting inside it.
    if (this.mastered) {
      g.fillStyle(this.tint(GUM.solidDeep), alpha * 0.7);
      g.fillCircle(x + 1, y + 5, 7.4);
      g.fillStyle(this.tint(GUM.solid), alpha * 0.85);
      g.fillCircle(x, y + 4, 5.6);
      for (let i = 0; i < 3; i++) {
        slimeShard(g, this.tint, x, y + 4, this.t * 0.8 + (i / 3) * TAU, 9, alpha * 0.9, { seed: i + 3 });
      }
    }
  }

  /** The arm, running from the shoulder to wherever the giant hand ended up. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const hx = this.armX[1];
    const hy = this.armY[1];

    if (this.stump > 0.5) {
      // Solidify: no arm. A torn socket with the last of it running out.
      const sx = x + Math.cos(this.reachAng) * 12;
      const sy = y + Math.sin(this.reachAng) * 12 + 2;
      g.fillStyle(this.tint(GUM.oozeDeep), alpha * 0.9);
      g.fillCircle(sx, sy, 7.5);
      g.fillStyle(this.tint(GUM.murk), alpha * 0.75);
      g.fillCircle(sx, sy, 4.6);
      drips(g, this.tint, sx, sy + 3, 11, 4, alpha, this.t, { seed: 33 });
      return;
    }

    const w0 = (this.mastered ? 9.5 : 8) * (1 + this.grip * 0.2);
    const w1 = (this.mastered ? 7.5 : 6.2) * (1 + this.grip * 0.35 + this.carry * 0.15);
    gummyArm(g, this.tint, x + Math.cos(this.reachAng) * 6, y + Math.sin(this.reachAng) * 6 + 2,
      hx, hy, w0, w1, alpha * (1 - this.stump), this.t, { stretch: this.stretch, seed: 5 });

    // A mastered arm carries a thread of jade down its length.
    if (this.mastered) {
      g.lineStyle(2, this.tint(GUM.solid), alpha * 0.5);
      g.lineBetween(x, y + 2, hx, hy);
    }

    // Drips off the arm's lowest point, and off the hand while it hangs still.
    const midX = (x + hx) / 2;
    const midY = Math.max(y, (y + hy) / 2) + (1 - this.stretch) * 8;
    drips(g, this.tint, midX, midY + 4, 16, 3, alpha * 0.8 * (1 - this.stretch * 0.6), this.t, { seed: 17 });

    // Gripping: a ring of ooze squeezing out from under the hand.
    if (this.grip > 0.05) {
      g.lineStyle(2.4, this.tint(GUM.oozeLit), alpha * this.grip * 0.8);
      g.strokeEllipse(hx, hy + 4, 26 + Math.sin(this.t * 6) * 2, 11);
    }
    // Carrying: the hand closes into a fist with knuckles of shine.
    if (this.carry > 0.05) {
      for (let i = 0; i < 4; i++) {
        const ang = this.reachAng + (i - 1.5) * 0.5;
        g.fillStyle(this.tint(GUM.oozeLit), alpha * this.carry * 0.85);
        g.fillCircle(hx + Math.cos(ang) * 7, hy + Math.sin(ang) * 7, 2.8);
      }
    }
  }
}
