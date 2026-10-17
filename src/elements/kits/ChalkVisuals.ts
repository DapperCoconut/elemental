import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeOut } from './ElementVisuals';

/**
 * Everything Chalk draws.
 *
 * Chalk is the one element whose entire output is *lines the player drew themselves*, so the
 * single most important thing in this file is that a line has to look hand-made. A clean
 * `lineBetween` reads as a laser; a chalk stroke has to be off-centre, powdery at the edges
 * and shedding grit. `chalkLine` below is therefore three offset passes plus scattered grain,
 * all driven off a per-mark seed so a given stroke looks the same every frame instead of
 * boiling.
 *
 * Six chalk colours carry the whole element's language: white is the ward and the shield,
 * red is the fuse, blue is permanent, and the three Masterpiece chalks (green heal, orange
 * hurt, teal speed) are read purely by hue — so nothing else in the palette is allowed near
 * those three.
 */

export type ChalkColorFn = ColorFn;

export const CHK = {
  /** The dark line under a stroke — chalk on a dark floor still needs a shadow to sit on. */
  board: 0x14181b,
  slate: 0x2a3336,
  /** The element colour. */
  white: 0xf4f1e6,
  whiteDim: 0xcfc9b8,
  dust: 0xe8e2d0,
  /** Explosive Chalk. */
  red: 0xff5f4a,
  redDeep: 0x8d2216,
  /** Perma-Chalk. */
  blue: 0x5aa9ff,
  blueDeep: 0x1c4d8c,
  /** Masterpiece — heal. */
  green: 0x6fdc7c,
  greenDeep: 0x1d7a35,
  /** Masterpiece — harm. */
  orange: 0xffa63c,
  orangeDeep: 0x9a4d09,
  /** Masterpiece — haste. */
  teal: 0x3fd9d1,
  tealDeep: 0x11706b,
  /**
   * Masterpiece — power, and only ever with the Prodigy upgrade. Pushed well into pink so it
   * cannot be read as Explosive Chalk's orange-red at a glance; the two are never both on the
   * floor doing the same thing, and mistaking one for the other would be a death.
   */
  crimson: 0xff3b6b,
  crimsonDeep: 0x8c1030,
  spark: 0xfff6d8,
  /**
   * Chalk Mastery — the grey of a smear that was never meant to be there. Deliberately the one
   * colour in the palette with no hue at all: a smudge is read by its *legs*, not its colour,
   * because it inherits the colour of whatever chalk it crawled off and has to stay legible
   * against every one of the six.
   */
  smudge: 0x9aa0ab,
  smudgeDeep: 0x474d58,
};

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * Deterministic 0–1 noise. Every stroke carries a seed and asks this for its wobble, so a
 * mark that lives for thirty seconds is drawn identically on all 1800 frames.
 */
export function grain(seed: number, i: number): number {
  const v = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * One segment of a chalk stroke: a soft halo, three offset passes (the middle one is the
 * line, the outer two are the powder that missed), and grit shed along its length.
 */
export function chalkLine(
  g: Phaser.GameObjects.Graphics,
  tint: ChalkColorFn,
  x0: number, y0: number, x1: number, y1: number,
  width: number, color: number, alpha: number, seed: number,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  g.lineStyle(width * 2.2, tint(color), alpha * 0.14);
  g.lineBetween(x0, y0, x1, y1);
  for (let p = 0; p < 3; p++) {
    const o = p === 0 ? 0 : (grain(seed, p) - 0.5) * width * 1.5;
    g.lineStyle(width * (p === 0 ? 1 : 0.5), tint(p === 0 ? color : CHK.dust), alpha * (p === 0 ? 1 : 0.34));
    g.lineBetween(x0 + nx * o, y0 + ny * o, x1 + nx * o, y1 + ny * o);
  }

  const grains = Math.min(14, Math.max(2, Math.round(len / 4)));
  for (let i = 0; i < grains; i++) {
    const t = grain(seed, 10 + i);
    const o = (grain(seed, 40 + i) - 0.5) * width * 2.4;
    g.fillStyle(tint(grain(seed, 70 + i) > 0.55 ? CHK.dust : color), alpha * (0.22 + grain(seed, 90 + i) * 0.5));
    g.fillCircle(x0 + dx * t + nx * o, y0 + dy * t + ny * o, 0.5 + grain(seed, 110 + i) * 1);
  }
}

/** An isolated dab — the first mark of a stroke, before there is anything to join it to. */
export function chalkBlob(
  g: Phaser.GameObjects.Graphics,
  tint: ChalkColorFn,
  x: number, y: number, r: number, color: number, alpha: number, seed: number,
): void {
  g.fillStyle(tint(color), alpha * 0.16);
  g.fillCircle(x, y, r * 1.9);
  for (let i = 0; i < 4; i++) {
    const a = grain(seed, i) * TAU;
    const d = grain(seed, 20 + i) * r * 0.55;
    g.fillStyle(tint(i === 0 ? color : CHK.dust), alpha * (i === 0 ? 1 : 0.4));
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.6 + grain(seed, 30 + i) * 0.5));
  }
}

/**
 * A circle drawn by hand: broken into arcs with the radius wobbling and a deliberate gap,
 * so it never closes as neatly as a `strokeCircle` would.
 */
export function chalkCircle(
  g: Phaser.GameObjects.Graphics,
  tint: ChalkColorFn,
  x: number, y: number, r: number,
  width: number, color: number, alpha: number, seed: number,
  spin = 0,
): void {
  const steps = 40;
  let px = 0;
  let py = 0;
  for (let i = 0; i <= steps; i++) {
    const a = spin + (i / steps) * TAU;
    const rr = r * (1 + (grain(seed, i) - 0.5) * 0.06);
    const cx = x + Math.cos(a) * rr;
    const cy = y + Math.sin(a) * rr;
    // Two gaps around the ring — a hand lifts off.
    const skip = i > 0 && (grain(seed, 200 + i) > 0.88);
    if (i > 0 && !skip) chalkLine(g, tint, px, py, cx, cy, width, color, alpha, seed + i);
    px = cx;
    py = cy;
  }
}

/**
 * The explosion, drawn the way a child draws one: a ragged ring of scribble with spokes
 * shooting out of it. `t` runs 0→1 over the life of the blast.
 */
export function chalkBurst(
  g: Phaser.GameObjects.Graphics,
  tint: ChalkColorFn,
  x: number, y: number, radius: number, color: number, t: number, seed: number,
): void {
  const e = easeOut(t);
  const a = 1 - t;
  const r = radius * (0.25 + e * 0.95);

  g.fillStyle(tint(CHK.spark), a * 0.5);
  g.fillCircle(x, y, r * 0.4);
  chalkCircle(g, tint, x, y, r, 2.4, color, a * 0.9, seed, t * 1.4);

  const spokes = 9;
  for (let i = 0; i < spokes; i++) {
    const ang = (i / spokes) * TAU + grain(seed, i) * 0.5;
    const inner = r * 0.55;
    const outer = r * (1.1 + grain(seed, 50 + i) * 0.5);
    chalkLine(g, tint,
      x + Math.cos(ang) * inner, y + Math.sin(ang) * inner,
      x + Math.cos(ang) * outer, y + Math.sin(ang) * outer,
      2, color, a * 0.85, seed + i * 7);
  }
}

/** A stick of chalk, drawn nose-first along `ang`. Used on the hands and in the HUD. */
export function chalkStick(
  g: Phaser.GameObjects.Graphics,
  tint: ChalkColorFn,
  x: number, y: number, ang: number, len: number, color: number, alpha: number,
): void {
  const cx = Math.cos(ang);
  const cy = Math.sin(ang);
  const nx = -cy;
  const ny = cx;
  const w = len * 0.3;
  const tipX = x + cx * len * 0.5;
  const tipY = y + cy * len * 0.5;
  const backX = x - cx * len * 0.5;
  const backY = y - cy * len * 0.5;

  g.fillStyle(tint(CHK.board), alpha * 0.5);
  g.fillPoints([
    new Phaser.Geom.Point(backX + nx * w + cx, backY + ny * w + cy),
    new Phaser.Geom.Point(tipX + nx * w * 0.7 + cx, tipY + ny * w * 0.7 + cy),
    new Phaser.Geom.Point(tipX - nx * w * 0.7 + cx, tipY - ny * w * 0.7 + cy),
    new Phaser.Geom.Point(backX - nx * w + cx, backY - ny * w + cy),
  ], true);
  g.fillStyle(tint(color), alpha);
  g.fillPoints([
    new Phaser.Geom.Point(backX + nx * w, backY + ny * w),
    new Phaser.Geom.Point(tipX + nx * w * 0.7, tipY + ny * w * 0.7),
    new Phaser.Geom.Point(tipX - nx * w * 0.7, tipY - ny * w * 0.7),
    new Phaser.Geom.Point(backX - nx * w, backY - ny * w),
  ], true);
  // Worn, brighter tip.
  g.fillStyle(tint(CHK.dust), alpha * 0.9);
  g.fillCircle(tipX, tipY, w * 0.62);
  // Highlight down the spine.
  g.lineStyle(1, tint(0xffffff), alpha * 0.35);
  g.lineBetween(backX + nx * w * 0.4, backY + ny * w * 0.4, tipX + nx * w * 0.3, tipY + ny * w * 0.3);
}

/**
 * The legs a smudge grows. Three pairs, each a two-bone limb with a knee that lifts on the
 * off-beat of its neighbour — the whole reason a smear of chalk reads as *alive* rather than as
 * a stain is that the legs are jointed and out of phase with each other.
 *
 * `gait` is a free-running phase in radians; `span` is how far the body is from the ground the
 * legs plant on, so a long bar-shaped smudge gets legs spaced along its length and a round one
 * gets them clustered.
 */
export function chalkLegs(
  g: Phaser.GameObjects.Graphics,
  tint: ChalkColorFn,
  x: number, y: number, ang: number, span: number, reach: number,
  gait: number, color: number, alpha: number, seed: number,
): void {
  const cx = Math.cos(ang);
  const cy = Math.sin(ang);
  const nx = -cy;
  const ny = cx;
  for (let i = 0; i < 6; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const along = (Math.floor(i / 2) - 1) * span;
    const hipX = x + cx * along + nx * side * 2;
    const hipY = y + cy * along + ny * side * 2;
    // Out of phase across the body and across the pair, which is what makes it scuttle
    // rather than paddle.
    const ph = gait + i * 1.05 + grain(seed, i) * 0.7;
    const lift = Math.sin(ph);
    const swing = Math.cos(ph) * 0.42;
    const kneeA = ang + side * (1.15 + swing);
    const footA = ang + side * (1.5 + swing * 1.6);
    const kneeX = hipX + Math.cos(kneeA) * reach * 0.62;
    const kneeY = hipY + Math.sin(kneeA) * reach * 0.62 - Math.abs(lift) * 3.5;
    const footX = hipX + Math.cos(footA) * reach;
    const footY = hipY + Math.sin(footA) * reach + (lift > 0 ? -lift * 4 : 0);
    chalkLine(g, tint, hipX, hipY, kneeX, kneeY, 1.7, color, alpha * 0.9, seed + i * 3);
    chalkLine(g, tint, kneeX, kneeY, footX, footY, 1.4, color, alpha * 0.75, seed + i * 5);
    // The foot leaves a scuff where it plants.
    if (lift < -0.6) {
      g.fillStyle(tint(CHK.dust), alpha * 0.25);
      g.fillCircle(footX, footY, 1.6);
    }
  }
}

/** Two beady chalk eyes on the leading edge, looking wherever the thing is walking. */
export function chalkEyes(
  g: Phaser.GameObjects.Graphics,
  tint: ChalkColorFn,
  x: number, y: number, ang: number, spread: number, r: number, alpha: number,
): void {
  const cx = Math.cos(ang);
  const cy = Math.sin(ang);
  const nx = -cy;
  const ny = cx;
  for (const side of [1, -1]) {
    const ex = x + cx * spread * 0.9 + nx * side * spread * 0.5;
    const ey = y + cy * spread * 0.9 + ny * side * spread * 0.5;
    g.fillStyle(tint(CHK.white), alpha * 0.95);
    g.fillCircle(ex, ey, r);
    g.fillStyle(tint(CHK.board), alpha);
    g.fillCircle(ex + cx * r * 0.42, ey + cy * r * 0.42, r * 0.5);
  }
}

// ── Fx ────────────────────────────────────────────────────────────────────

export class ChalkFx extends FxBase {
  /** Powder thrown off a stroke, a snapped stick or a scuffed foot. */
  dust(x: number, y: number, count: number, spread: number, ms = 520, color = CHK.dust, depth = 8): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      a: Math.random() * TAU,
      d: spread * (0.35 + Math.random() * 0.65),
      r: 1 + Math.random() * 2.2,
      s: i * 13.7 + Math.random() * 50,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        const px = x + Math.cos(p.a) * p.d * e;
        const py = y + Math.sin(p.a) * p.d * e - e * 6;
        g.fillStyle(this.tint(color), (1 - t) * 0.75);
        g.fillCircle(px, py, p.r * (1 - t * 0.5));
      }
    });
  }

  /** A mark going off. */
  boom(x: number, y: number, radius: number, color: number, ms = 420, depth = 9): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, radius * 0.5, CHK.spark, color, depth);
    this.anim(depth, ms, (g, t) => chalkBurst(g, this.tint, x, y, radius, color, t, seed));
    this.dust(x, y, 8, radius * 0.9, ms + 180, color, depth);
  }

  /** A shield node taking a hit and crumbling. */
  snap(x: number, y: number, color: number, depth = 9): void {
    const shards = Array.from({ length: 5 }, () => ({
      a: Math.random() * TAU, d: 14 + Math.random() * 16, r: 1.4 + Math.random() * 2, s: Math.random() * 999,
    }));
    this.anim(depth, 340, (g, t) => {
      for (const s of shards) {
        const px = x + Math.cos(s.a) * s.d * easeOut(t);
        const py = y + Math.sin(s.a) * s.d * easeOut(t) + t * t * 12;
        chalkBlob(g, this.tint, px, py, s.r, color, 1 - t, s.s);
      }
    });
  }

  /** The bright over-stroke that flashes along a segment the instant it is laid down. */
  lay(x0: number, y0: number, x1: number, y1: number, color: number, depth = 9): void {
    const seed = Math.random() * 999;
    this.anim(depth, 180, (g, t) => {
      chalkLine(g, this.tint, x0, y0, x1, y1, 4 * (1 - t) + 1, color, (1 - t) * 0.8, seed);
    });
  }

  /** An expanding hand-drawn ring — casts, pickups, the shield going up. */
  ring(x: number, y: number, r0: number, r1: number, color: number, ms = 420, depth = 9): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      chalkCircle(g, this.tint, x, y, r0 + (r1 - r0) * easeOut(t), 2.2, color, 1 - t, seed, t);
    });
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const CHALK_AVATAR: AvatarSpec = {
  hands: [
    { r: 11, color: CHK.dust, alpha: 0.22 },
    { r: 7, color: CHK.white, alpha: 0.95 },
    { r: 2.6, color: 0xffffff, alpha: 0.9, ox: -1.6, oy: -1.6 },
  ],
  eyeWhite: CHK.white,
  eyePupil: CHK.board,
  squash: { div: 13, x: 0.45, y: 0.24 },
};

/**
 * The artist: a plain slate orb (the baked `elem-chalk`) with two dusty white hands, one of
 * them gripping a single stick of chalk. That stick is the whole costume, and it is also the
 * live chalk readout — its colour is the chalk in hand, which is the only thing the player
 * needs to know during Masterpiece, and it sits on the character where their eyes already are.
 *
 * A slate beret, a felt eraser in the off hand and chalk doodles on the body add the detail.
 * Mastered: a hand-drawn rainbow halo turns over the beret, chalk motes of every Masterpiece
 * colour orbit the body, the doodles turn colour, the beret stalk goes gold, the stick grows
 * a halo of its own colour, and the hands and eyes pick up a sparkle-white rim.
 */
export class ChalkAvatar extends BaseAvatar {
  private chalkColor = CHK.white;
  /** 0–1 — how hard the character is currently pressing, i.e. is a stroke being laid. */
  private draw = 0;
  private drawTarget = 0;

  constructor(scene: Phaser.Scene, tint: ChalkColorFn, depth = 6) {
    super(scene, tint, depth, CHALK_AVATAR);
  }

  /** Which chalk is in hand right now. */
  setChalk(color: number): void {
    if (color === this.chalkColor) return;
    this.chalkColor = color;
    this.forEachHandLayer(0, (glow) => glow.setFillStyle(this.tint(color), this.mastered ? 0.4 : 0.22));
  }

  /** True while a drawing session is live — the hands press down and shed powder. */
  setDrawing(on: boolean): void { this.drawTarget = on ? 1 : 0; }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.draw += (this.drawTarget - this.draw) * Math.min(1, delta / 140);
    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 15 : 11);
      glow.setAlpha(on ? 0.4 : 0.22);
    });
    this.forEachHandLayer(1, (core) => {
      if (on) core.setStrokeStyle(1.5, this.tint(CHK.spark), 0.9);
      else core.setStrokeStyle();
    });
    this.setEyeWhite(on ? CHK.spark : CHK.white);
  }

  /**
   * Painted on the slate under the face: a few doodles in chalk — a star, a squiggle, a little
   * tally — and a smear where a thumb rubbed one out. Mastered, the doodles are drawn in the
   * Masterpiece colours instead of plain white.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const m = this.mastered;
    const A = alpha;
    const lean = Math.cos(this.facing) * 1.2;
    // Thumb smear.
    g.fillStyle(this.tint(CHK.dust), A * 0.1);
    g.fillEllipse(x + 3 + lean, y + 11, 22, 7);
    // A five-point star on the left flank.
    const sx = x - 11 + lean, sy = y + 9;
    const star: [number, number][] = [];
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI * 2) / 5;
      star.push([sx + Math.cos(ang) * 4.2, sy + Math.sin(ang) * 4.2]);
    }
    for (let i = 0; i < 5; i++) {
      const [x0, y0] = star[i];
      const [x1, y1] = star[(i + 1) % 5];
      chalkLine(g, this.tint, x0, y0, x1, y1, 0.9, m ? CHK.orange : CHK.white, A * 0.75, 3 + i);
    }
    // A squiggle across the belly.
    let px = x - 3 + lean, py = y + 14;
    for (let i = 1; i <= 5; i++) {
      const nx = x - 3 + lean + i * 3, ny = y + 14 + (i % 2 ? -2 : 1.5);
      chalkLine(g, this.tint, px, py, nx, ny, 0.9, m ? CHK.teal : CHK.whiteDim, A * 0.7, 20 + i);
      px = nx; py = ny;
    }
    // Three tally strokes on the right flank.
    for (let i = 0; i < 3; i++) {
      const tx = x + 11 + lean + i * 2.4;
      chalkLine(g, this.tint, tx, y + 4, tx + 0.6, y + 10, 0.8, m ? CHK.green : CHK.white, A * 0.7, 40 + i);
    }
  }

  /** A felt board eraser held in the off hand, its face caked with dust. */
  private eraser(g: Phaser.GameObjects.Graphics, alpha: number): void {
    const hx = this.armX[0], hy = this.armY[0];
    const ang = Math.atan2(hy - this.armY[1], hx - this.armX[1]) * 0.15 + 0.2;
    const c = Math.cos(ang), sn = Math.sin(ang);
    const box = (w: number, h: number, ox: number, oy: number) => {
      const pts = [[-w, -h], [w, -h], [w, h], [-w, h]].map(([u, v]) =>
        new Phaser.Geom.Point(hx + ox + u * c - v * sn, hy + oy + u * sn + v * c));
      return pts;
    };
    g.fillStyle(this.tint(0x8a5a32), alpha);
    g.fillPoints(box(6, 2.4, 0, -2.6), true);
    g.fillStyle(this.tint(0xb07a48), alpha * 0.9);
    g.fillPoints(box(6, 0.8, 0, -4), true);
    g.fillStyle(this.tint(CHK.dust), alpha * 0.9);
    g.fillPoints(box(6, 1.3, 0, 0.6), true);
    g.fillStyle(this.tint(this.chalkColor), alpha * 0.35);
    g.fillPoints(box(4, 0.7, 1, 0.8), true);
  }

  protected emitTrail(x: number, y: number): void {
    new ChalkFx(this.scene, this.tint).dust(x, y, 1, 6, 480, this.chalkColor);
  }

  /** A soft pool of ground-in powder, brighter while drawing — the slate needs it to lift off a dark floor. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    const k = this.intensity * (this.mastered ? 1.15 : 1);
    g.fillStyle(this.tint(CHK.dust), a * (this.mastered ? 0.26 : 0.14) * k);
    g.fillCircle(x, y, 27 * k);
    g.fillStyle(this.tint(this.chalkColor), a * this.draw * 0.12);
    g.fillEllipse(x, y + 10, 40, 14);
  }

  /** The one stick of chalk, gripped in the casting hand and angled along its reach. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const m = this.mastered;
    const lean = Math.cos(this.facing) * 2;

    // ── The beret: slate felt, slouched to one side, a chalk-stitched band ──
    const bx = x + lean, by = y - 17;
    if (m) {
      // Mastered only: a hand-drawn halo of the Masterpiece colours, redrawn as it turns.
      const cols = [CHK.green, CHK.orange, CHK.teal, CHK.crimson, CHK.blue, CHK.white];
      const hr = 14, hy = by - 9;
      for (let i = 0; i < 12; i++) {
        const a0 = this.t * 0.9 + (i / 12) * Math.PI * 2;
        const a1 = a0 + (Math.PI * 2) / 12 * 0.7;
        chalkLine(g, this.tint,
          bx + Math.cos(a0) * hr, hy + Math.sin(a0) * hr * 0.32,
          bx + Math.cos(a1) * hr, hy + Math.sin(a1) * hr * 0.32,
          1.6, cols[i % cols.length], alpha * 0.95, 60 + i);
      }
      // Sparkles twinkling on the halo.
      for (let i = 0; i < 3; i++) {
        const ph = (this.t * 0.6 + i / 3) % 1;
        const ang = this.t * 0.9 + i * 2.1;
        const sx = bx + Math.cos(ang) * hr, sy = hy + Math.sin(ang) * hr * 0.32;
        const k = Math.sin(ph * Math.PI);
        g.lineStyle(1, this.tint(CHK.spark), alpha * k);
        g.lineBetween(sx - 3 * k, sy, sx + 3 * k, sy);
        g.lineBetween(sx, sy - 3 * k, sx, sy + 3 * k);
      }
    }
    g.fillStyle(this.tint(CHK.board), alpha);
    g.fillEllipse(bx - 3, by - 1, 26, 10);
    g.fillStyle(this.tint(CHK.slate), alpha);
    g.fillEllipse(bx - 3.5, by - 2.2, 23, 7.5);
    g.fillStyle(this.tint(CHK.whiteDim), alpha * 0.25);
    g.fillEllipse(bx - 7, by - 3.6, 10, 2.6);
    // Stalk on top — gold once mastered.
    g.fillStyle(this.tint(m ? 0xffc44d : CHK.board), alpha);
    g.fillRect(bx - 1, by - 7.5, 2, 3.5);
    g.fillCircle(bx, by - 7.8, m ? 1.8 : 1.3);
    // Chalk stitching round the band.
    for (let i = 0; i < 6; i++) {
      const u = -0.8 + i * 0.32;
      g.lineStyle(1, this.tint(m ? CHK.spark : CHK.dust), alpha * 0.7);
      g.lineBetween(bx - 3 + u * 11, by + 2.6 + Math.abs(u) * -1.2, bx - 3 + u * 11 + 2, by + 2.6 + Math.abs(u) * -1.2);
    }

    // Mastered only: chalk motes of every colour drifting round the body.
    if (m) {
      const cols = [CHK.green, CHK.orange, CHK.teal, CHK.crimson];
      for (let i = 0; i < 4; i++) {
        const ang = -this.t * 1.3 + (i / 4) * Math.PI * 2;
        const ox = x + Math.cos(ang) * 25, oy = y + 4 + Math.sin(ang) * 9;
        g.fillStyle(this.tint(cols[i]), alpha * 0.25);
        g.fillCircle(ox, oy, 4.5);
        chalkBlob(g, this.tint, ox, oy, 1.8, cols[i], alpha * 0.9, 80 + i);
      }
    }

    this.eraser(g, alpha);

    const hx = this.armX[1];
    const hy = this.armY[1];
    const ang = Math.atan2(hy - y, hx - x);
    const len = (m ? 17 : 13) + this.draw * 3;
    const sx = hx + Math.cos(ang) * 5;
    const sy = hy + Math.sin(ang) * 5;
    if (m) {
      g.fillStyle(this.tint(this.chalkColor), alpha * (0.3 + 0.1 * Math.sin(this.t * 3)));
      g.fillCircle(sx, sy, len * 0.62);
    }
    chalkStick(g, this.tint, sx, sy, ang, len, this.chalkColor, alpha);
    if (this.draw > 0.3) {
      const tip = len * 0.5 + 5;
      g.fillStyle(this.tint(CHK.dust), alpha * this.draw * 0.5 * (0.5 + 0.5 * Math.sin(this.t * 14)));
      g.fillCircle(hx + Math.cos(ang) * tip, hy + Math.sin(ang) * tip, 2.4);
    }
  }
}
