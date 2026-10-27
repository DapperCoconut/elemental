import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Astra's look: a shell of deep space — midnight violet, freckled with far stars — cracked open
 * in places, and a white-gold dwarf star burning inside it, its light spilling out through the
 * cracks. Its own attacks are solar gold; its smite is purple ethereal lightning; its warp is a
 * violet-and-cyan wormhole. Star mode turns the cracks into blazing seams and wraps the body in
 * a corona.
 *
 * Every painter takes a `ColorFn` so a skin can recolour it, and the previews call the same ones.
 */

export const ASTRA = {
  void: 0x07061a,
  shellDark: 0x14123a,
  shell: 0x221f5a,
  shellLit: 0x3d3890,
  nebula: 0x6a4cff,
  violet: 0x9b6bff,
  violetLit: 0xd4b8ff,
  farStar: 0xcfd6ff,
  star: 0xfff6d0,
  starHot: 0xffe27a,
  solar: 0xffb52e,
  corona: 0xff7a1a,
  smite: 0xb05cff,
  smiteCore: 0xf2e2ff,
  smiteDark: 0x3c0f6e,
  worm: 0x52d8ff,
  wormDeep: 0x1a2a7a,
  excite: 0xc04dff,
  exciteLit: 0xf4c8ff,
  stability: 0x7ce8ff,
  stabilityLow: 0xff4d6a,
  white: 0xffffff,
};

export type AstraColorFn = ColorFn;

/** A cheap seeded random, so a crack pattern or a bolt's shape is the same every frame it is asked for. */
export function seeded(seed: number): () => number {
  let s = Math.floor(seed * 9301 + 49297) % 233280;
  if (s <= 0) s += 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * A solar beam from (x0,y0) to (x1,y1): a wide gold glow, an orange edge and a white-hot core,
 * with a shimmer travelling down it. `alpha` fades the whole thing.
 */
export function solarBeam(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x0: number, y0: number, x1: number, y1: number, width: number, alpha: number, t: number,
): void {
  if (alpha <= 0.01) return;
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const len = Math.hypot(x1 - x0, y1 - y0);
  const px = -Math.sin(ang);
  const py = Math.cos(ang);
  const band = (w: number, color: number, a: number): void => {
    g.fillStyle(tint(color), a * alpha);
    g.beginPath();
    g.moveTo(x0 + px * w * 0.35, y0 + py * w * 0.35);
    g.lineTo(x1 + px * w * 0.5, y1 + py * w * 0.5);
    g.lineTo(x1 - px * w * 0.5, y1 - py * w * 0.5);
    g.lineTo(x0 - px * w * 0.35, y0 - py * w * 0.35);
    g.closePath();
    g.fillPath();
  };
  band(width * 1.9, ASTRA.corona, 0.18);
  band(width, ASTRA.solar, 0.55);
  band(width * 0.55, ASTRA.starHot, 0.85);
  band(width * 0.22, ASTRA.white, 1);
  // A shimmer of bright knots running down the beam.
  g.fillStyle(tint(ASTRA.white), alpha * 0.9);
  const step = 46;
  const off = (t * 900) % step;
  for (let d = off; d < len; d += step) {
    const k = 0.5 + 0.5 * Math.sin(d * 0.07 + t * 20);
    g.fillCircle(x0 + Math.cos(ang) * d, y0 + Math.sin(ang) * d, width * (0.12 + 0.1 * k));
  }
}

/**
 * The stability bar the Star Trial hangs under the health bar: a cyan fill that turns red as it
 * runs low, a timer strip beneath it that empties toward the end of the trial, and a star pip on
 * the right that brightens as the trial nears its end.
 */
export function stabilityBar(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number,
  stab01: number, timeLeft01: number, alpha: number, t: number,
): void {
  const W = 52;
  const H = 5;
  const left = x - W / 2;
  g.fillStyle(tint(ASTRA.void), 0.85 * alpha);
  g.fillRect(left - 1, y - 1, W + 2, H + 2);
  const low = stab01 < 0.3;
  const color = low ? ASTRA.stabilityLow : ASTRA.stability;
  const pulse = low ? 0.65 + 0.35 * Math.sin(t * 18) : 1;
  g.fillStyle(tint(color), alpha * pulse);
  g.fillRect(left, y, W * Phaser.Math.Clamp(stab01, 0, 1), H);
  g.fillStyle(tint(ASTRA.white), alpha * 0.45);
  g.fillRect(left, y, W * Phaser.Math.Clamp(stab01, 0, 1), 1.2);
  // The timer strip.
  g.fillStyle(tint(ASTRA.void), 0.85 * alpha);
  g.fillRect(left - 1, y + H + 1, W + 2, 3);
  g.fillStyle(tint(ASTRA.starHot), alpha);
  g.fillRect(left, y + H + 1.5, W * Phaser.Math.Clamp(timeLeft01, 0, 1), 2);
  // The star at the end of it, lit as the trial nears its end.
  const lit = 1 - Phaser.Math.Clamp(timeLeft01, 0, 1);
  drawStar(g, tint, left + W + 7, y + 3, 4.2, ASTRA.starHot, alpha * (0.35 + 0.65 * lit), t * 0.6);
}

/** A five-pointed star. */
export function drawStar(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, color: number, alpha: number, rot = 0,
): void {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + rot + (i / 10) * TAU;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  g.fillStyle(tint(color), alpha);
  g.fillPoints(pts, true);
}

/** The Q+ hold's stars over the head — one for each level of difficulty taken on. */
export function trialStars(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, n: number, t: number, alpha: number,
): void {
  if (n <= 0) return;
  const gap = 13;
  const x0 = x - ((n - 1) * gap) / 2;
  for (let i = 0; i < n; i++) {
    const bob = Math.sin(t * 4 + i * 0.9) * 2;
    const sx = x0 + i * gap;
    const sy = y + bob - (n >= 5 ? 2 : 0);
    g.fillStyle(tint(ASTRA.solar), alpha * 0.25);
    g.fillCircle(sx, sy, 9);
    drawStar(g, tint, sx, sy, 6, n >= 5 ? ASTRA.white : ASTRA.starHot, alpha, Math.sin(t * 2 + i) * 0.25);
  }
}

/**
 * An excited section of arena wall (Click+): a violet blister on the wall that crackles harder as
 * its two seconds run down. `normal` points into the arena.
 */
export function wallExcite(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, normal: number, charge01: number, t: number, seed: number,
): void {
  const along = normal + Math.PI / 2;
  const ax = Math.cos(along);
  const ay = Math.sin(along);
  const nx = Math.cos(normal);
  const ny = Math.sin(normal);
  const half = 16 + 6 * charge01;
  const swell = 4 + 8 * charge01 + Math.sin(t * 24) * 1.5 * charge01;
  g.fillStyle(tint(ASTRA.excite), 0.25 + 0.3 * charge01);
  g.fillEllipse(x + nx * swell * 0.6, y + ny * swell * 0.6, Math.abs(ax) * half * 2.4 + Math.abs(nx) * swell * 3 + 6, Math.abs(ay) * half * 2.4 + Math.abs(ny) * swell * 3 + 6);
  g.fillStyle(tint(ASTRA.excite), 0.8);
  g.beginPath();
  g.moveTo(x - ax * half, y - ay * half);
  g.lineTo(x + nx * swell, y + ny * swell);
  g.lineTo(x + ax * half, y + ay * half);
  g.closePath();
  g.fillPath();
  g.fillStyle(tint(ASTRA.exciteLit), 0.7 + 0.3 * charge01);
  g.fillCircle(x + nx * swell * 0.4, y + ny * swell * 0.4, 3 + 3 * charge01);
  // Crackling arcs along the wall.
  const rnd = seeded(seed + Math.floor(t * 18));
  g.lineStyle(1.4, tint(ASTRA.exciteLit), 0.5 + 0.5 * charge01);
  for (let i = 0; i < 3; i++) {
    const s0 = (rnd() - 0.5) * half * 2;
    let px = x + ax * s0;
    let py = y + ay * s0;
    g.beginPath();
    g.moveTo(px, py);
    for (let k = 0; k < 3; k++) {
      px += nx * (3 + rnd() * 6 * (0.5 + charge01)) + ax * (rnd() - 0.5) * 8;
      py += ny * (3 + rnd() * 6 * (0.5 + charge01)) + ay * (rnd() - 0.5) * 8;
      g.lineTo(px, py);
    }
    g.strokePath();
  }
}

/** The Worm Warp in flight: a spiralling hole of violet and cyan with a pinprick of white at its eye. */
export function wormOrb(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, t: number, alpha: number): void {
  g.fillStyle(tint(ASTRA.worm), alpha * 0.18);
  g.fillCircle(x, y, r * 1.9);
  g.fillStyle(tint(ASTRA.wormDeep), alpha * 0.95);
  g.fillCircle(x, y, r);
  for (let arm = 0; arm < 3; arm++) {
    const base = t * 7 + (arm / 3) * TAU;
    g.lineStyle(2, tint(arm % 2 ? ASTRA.violetLit : ASTRA.worm), alpha * 0.9);
    g.beginPath();
    for (let i = 0; i <= 10; i++) {
      const k = i / 10;
      const a = base + k * 3.2;
      const rr = r * (1.05 - k * 0.9);
      if (i === 0) g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      else g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.strokePath();
  }
  g.fillStyle(tint(ASTRA.white), alpha);
  g.fillCircle(x, y, r * 0.22);
}

/** A wormhole mouth on the floor, opening (`open` 0→1) and spinning. */
export function wormMouth(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, open: number, t: number, alpha: number): void {
  const rx = 30 * open;
  const ry = 13 * open;
  if (rx < 1) return;
  g.fillStyle(tint(ASTRA.worm), alpha * 0.25);
  g.fillEllipse(x, y + 14, rx * 2.6, ry * 2.6);
  g.fillStyle(tint(ASTRA.wormDeep), alpha);
  g.fillEllipse(x, y + 14, rx * 2, ry * 2);
  g.lineStyle(2, tint(ASTRA.worm), alpha);
  g.strokeEllipse(x, y + 14, rx * 2, ry * 2);
  for (let i = 0; i < 6; i++) {
    const a = t * 5 + (i / 6) * TAU;
    g.fillStyle(tint(i % 2 ? ASTRA.violetLit : ASTRA.white), alpha * 0.9);
    g.fillCircle(x + Math.cos(a) * rx * 0.7, y + 14 + Math.sin(a) * ry * 0.7, 1.6);
  }
}

/**
 * Star mode's corona: a ring of flame tongues licking out round the body, rotating, over a soft
 * gold disc that marks the aura's reach.
 */
export function starAura(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, t: number, alpha: number): void {
  g.fillStyle(tint(ASTRA.solar), alpha * 0.08);
  g.fillCircle(x, y, r);
  g.lineStyle(1.5, tint(ASTRA.starHot), alpha * 0.35);
  g.strokeCircle(x, y, r);
  const tongues = 14;
  for (let i = 0; i < tongues; i++) {
    const a = t * 0.9 + (i / tongues) * TAU;
    const lick = 0.55 + 0.45 * Math.sin(t * 7 + i * 1.7);
    const r0 = 24;
    const r1 = r0 + (r - r0) * 0.55 * lick;
    const w = 0.16;
    g.fillStyle(tint(i % 2 ? ASTRA.corona : ASTRA.solar), alpha * (0.35 + 0.3 * lick));
    g.beginPath();
    g.moveTo(x + Math.cos(a - w) * r0, y + Math.sin(a - w) * r0);
    g.lineTo(x + Math.cos(a + Math.sin(t * 3 + i) * 0.12) * r1, y + Math.sin(a + Math.sin(t * 3 + i) * 0.12) * r1);
    g.lineTo(x + Math.cos(a + w) * r0, y + Math.sin(a + w) * r0);
    g.closePath();
    g.fillPath();
  }
  g.fillStyle(tint(ASTRA.starHot), alpha * 0.18);
  g.fillCircle(x, y, 30);
}

/** A jagged bolt from (x0,y0) to (x1,y1), seeded so a frame can redraw the same bolt or a fresh one. */
export function lightning(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x0: number, y0: number, x1: number, y1: number,
  seed: number, width: number, alpha: number,
): void {
  const rnd = seeded(seed);
  const segs = 14;
  const pts: { x: number; y: number }[] = [];
  const len = Math.hypot(x1 - x0, y1 - y0);
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const px = -Math.sin(ang);
  const py = Math.cos(ang);
  for (let i = 0; i <= segs; i++) {
    const k = i / segs;
    const jit = i === 0 || i === segs ? 0 : (rnd() - 0.5) * Math.min(60, len * 0.12);
    pts.push({ x: x0 + (x1 - x0) * k + px * jit, y: y0 + (y1 - y0) * k + py * jit });
  }
  const stroke = (w: number, color: number, a: number): void => {
    g.lineStyle(w, tint(color), a * alpha);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) g.lineTo(p.x, p.y);
    g.strokePath();
  };
  stroke(width * 3.2, ASTRA.smite, 0.22);
  stroke(width * 1.7, ASTRA.smite, 0.75);
  stroke(width * 0.6, ASTRA.smiteCore, 1);
  // Branches off the main channel.
  g.lineStyle(width * 0.5, tint(ASTRA.violetLit), alpha * 0.8);
  for (let b = 0; b < 4; b++) {
    const i = 2 + Math.floor(rnd() * (segs - 4));
    const p = pts[i];
    const side = rnd() < 0.5 ? -1 : 1;
    let bx = p.x;
    let by = p.y;
    g.beginPath();
    g.moveTo(bx, by);
    for (let k = 0; k < 3; k++) {
      bx += Math.cos(ang) * 14 + px * side * (8 + rnd() * 12);
      by += Math.sin(ang) * 14 + py * side * (8 + rnd() * 12);
      g.lineTo(bx, by);
    }
    g.strokePath();
  }
}

/** The ethereal sigil that marks the smite's target for the instant before the bolt. */
export function smiteSigil(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, k: number, t: number): void {
  const r = 34 - 10 * k;
  g.lineStyle(2, tint(ASTRA.smite), 0.5 + 0.5 * k);
  g.strokeCircle(x, y, r);
  g.lineStyle(1.2, tint(ASTRA.violetLit), 0.6 + 0.4 * k);
  g.strokeCircle(x, y, r * 0.66);
  for (let i = 0; i < 6; i++) {
    const a = t * 2.5 + (i / 6) * TAU;
    drawStar(g, tint, x + Math.cos(a) * r, y + Math.sin(a) * r, 3.2, ASTRA.smiteCore, 0.6 + 0.4 * k, a);
  }
}

/** A precomputed crack: a short jagged polyline from the body's middle out to its rim. */
interface Crack { pts: { x: number; y: number }[]; w: number }

function makeCracks(seed: number, n: number, r: number): Crack[] {
  const rnd = seeded(seed);
  const out: Crack[] = [];
  for (let c = 0; c < n; c++) {
    const a0 = (c / n) * TAU + rnd() * 0.6;
    const pts: { x: number; y: number }[] = [];
    let a = a0;
    for (let i = 0; i <= 4; i++) {
      const d = r * (0.22 + (i / 4) * 0.8);
      a += (rnd() - 0.5) * 0.5;
      pts.push({ x: Math.cos(a) * d, y: Math.sin(a) * d });
    }
    out.push({ pts, w: 1 + rnd() * 1.2 });
  }
  return out;
}

/**
 * Starlight through the cracks of a shell of radius `r` at (x,y): a dark gash, a gold glow along
 * it and a white-hot line down its middle. `bright` (0..1+) is how hard the star is burning.
 */
export function crackLight(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, cracks: Crack[], bright: number, alpha: number, scale = 1,
): void {
  for (const c of cracks) {
    const path = (w: number, color: number, a: number): void => {
      g.lineStyle(w, tint(color), a * alpha);
      g.beginPath();
      g.moveTo(x + c.pts[0].x * scale, y + c.pts[0].y * scale);
      for (const p of c.pts) g.lineTo(x + p.x * scale, y + p.y * scale);
      g.strokePath();
    };
    path((c.w + 2.2 + bright * 3) * scale, ASTRA.solar, 0.25 + 0.3 * bright);
    path((c.w + 0.6) * scale, ASTRA.void, 0.9);
    path(c.w * 0.7 * scale + bright * scale, ASTRA.starHot, 0.75 + 0.25 * Math.min(1, bright));
    if (bright > 0.4) path(c.w * 0.35 * scale, ASTRA.white, Math.min(1, bright));
  }
  void r;
}

// ── Effects ─────────────────────────────────────────────────────────────

export class AstraFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: ColorFn) { super(scene, tint); }

  /** One solar shot: the beam flashes along its line and fades, a flare at the muzzle, sparks where it ends. */
  shot(x0: number, y0: number, x1: number, y1: number, width = 10): void {
    this.anim(8.5, 170, (g, t) => {
      solarBeam(g, this.tint, x0, y0, x1, y1, width * (1 - t * 0.5), 1 - easeIn(t), t);
    });
    this.flashIn(x0, y0, 10, ASTRA.white, ASTRA.solar, 9);
    const ang = Math.atan2(y1 - y0, x1 - x0);
    this.anim(8.5, 260, (g, t) => {
      for (let i = 0; i < 5; i++) {
        const a = ang + Math.PI + (i - 2) * 0.45;
        const d = 4 + easeOut(t) * 18;
        g.fillStyle(this.tint(i % 2 ? ASTRA.solar : ASTRA.starHot), 1 - t);
        g.fillCircle(x1 + Math.cos(a) * d, y1 + Math.sin(a) * d, 2.2 * (1 - t) + 0.5);
      }
    });
  }

  /** A shot connecting with a body: a hot starburst. */
  shotHit(x: number, y: number): void {
    this.anim(9, 220, (g, t) => {
      drawStar(g, this.tint, x, y, 6 + easeOut(t) * 10, ASTRA.starHot, (1 - t) * 0.9, t * 2);
      g.fillStyle(this.tint(ASTRA.white), 1 - t);
      g.fillCircle(x, y, 4 * (1 - t));
    });
  }

  /**
   * One Solar Flare: a beat of light gathering at the centre, then every arm of the shape blasts
   * out at once to `len` — the width tapering from the core — and burns away.
   */
  flare(x: number, y: number, angles: number[], len: number, width: number, cross: boolean): void {
    this.anim(8, 110, (g, t) => {
      g.fillStyle(this.tint(ASTRA.starHot), 0.4 + 0.6 * t);
      g.fillCircle(x, y, 6 + 14 * t);
      g.lineStyle(1.5, this.tint(ASTRA.solar), 0.8);
      for (const a of angles) g.lineBetween(x, y, x + Math.cos(a) * len * t * 0.25, y + Math.sin(a) * len * t * 0.25);
    });
    this.scene.time.delayedCall(90, () => {
      this.flashIn(x, y, 26, ASTRA.white, ASTRA.solar, 9);
      this.scene.cameras.main.shake(110, 0.0035);
      this.anim(8, 420, (g, t) => {
        const a = 1 - easeIn(t);
        const reach = len * Math.min(1, easeOut(t * 2.2));
        for (const ang of angles) {
          solarBeam(g, this.tint, x, y, x + Math.cos(ang) * reach, y + Math.sin(ang) * reach, width * (1 - t * 0.4), a, t + ang);
        }
        // The core: a starburst in the shape of the flare.
        const r = 18 + 10 * Math.sin(t * Math.PI);
        drawStar(g, this.tint, x, y, r, cross ? ASTRA.starHot : ASTRA.white, a, cross ? Math.PI / 4 : 0);
      });
    });
  }

  /**
   * E+ Cosmic Combo: the third flare, a ring of fire at `r`. Devastating when the first two hit —
   * then it burns white-hot and throws a second shock ring.
   */
  ringFlare(x: number, y: number, r: number, width: number, devastating: boolean): void {
    this.anim(8, 140, (g, t) => {
      g.lineStyle(2, this.tint(ASTRA.solar), 0.8 * t);
      g.strokeCircle(x, y, r * (0.4 + 0.6 * t));
    });
    this.scene.time.delayedCall(120, () => {
      if (devastating) {
        this.scene.cameras.main.shake(220, 0.008);
        this.scene.cameras.main.flash(90, 255, 230, 160);
      }
      this.anim(8, 520, (g, t) => {
        const a = 1 - easeIn(t);
        g.lineStyle(width * 1.9, this.tint(ASTRA.corona), 0.2 * a);
        g.strokeCircle(x, y, r);
        g.lineStyle(width, this.tint(ASTRA.solar), 0.6 * a);
        g.strokeCircle(x, y, r);
        g.lineStyle(width * 0.45, this.tint(devastating ? ASTRA.white : ASTRA.starHot), a);
        g.strokeCircle(x, y, r);
        // Flame tongues standing up off the ring.
        for (let i = 0; i < 24; i++) {
          const ang = (i / 24) * TAU + t;
          const lick = (devastating ? 22 : 12) * (0.5 + 0.5 * Math.sin(t * 20 + i * 2.1)) * a;
          g.lineStyle(3, this.tint(i % 2 ? ASTRA.corona : ASTRA.starHot), a);
          g.lineBetween(x + Math.cos(ang) * (r - lick * 0.4), y + Math.sin(ang) * (r - lick * 0.4), x + Math.cos(ang) * (r + lick), y + Math.sin(ang) * (r + lick));
        }
        if (devastating) {
          g.lineStyle(3 * a, this.tint(ASTRA.white), a);
          g.strokeCircle(x, y, r + easeOut(t) * 60);
        }
      });
    });
  }

  /** The smite's sigil on its target, drawn for `ms`. `at` is read each frame so the sigil rides the body. */
  smiteMark(at: () => { x: number; y: number }, ms: number): void {
    this.anim(9, ms, (g, t) => {
      const p = at();
      smiteSigil(g, this.tint, p.x, p.y, t, t * 3);
    });
  }

  /** The bolt itself: from above the arena's top straight down onto (x,y), flickering, then the strike. */
  smiteBolt(x: number, y: number, topY: number): void {
    const seed = Math.random() * 1000;
    this.scene.cameras.main.flash(70, 200, 150, 255);
    this.scene.cameras.main.shake(160, 0.006);
    this.anim(9.5, 360, (g, t) => {
      const flick = Math.floor(t * 10);
      const a = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      lightning(g, this.tint, x + (seeded(seed + flick)() - 0.5) * 30, topY, x, y, seed + flick, 5, a);
    });
    this.anim(4, 700, (g, t) => {
      g.fillStyle(this.tint(ASTRA.smiteDark), (1 - t) * 0.5);
      g.fillEllipse(x, y + 14, 70 * (0.6 + 0.4 * easeOut(t)), 26 * (0.6 + 0.4 * easeOut(t)));
      g.lineStyle(3 * (1 - t), this.tint(ASTRA.smite), 1 - t);
      g.strokeEllipse(x, y + 14, 40 + easeOut(t) * 90, 16 + easeOut(t) * 34);
    });
    this.anim(9.6, 420, (g, t) => {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU + 0.3;
        const d = easeOut(t) * (30 + (i % 3) * 12);
        drawStar(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, 3.5 * (1 - t), ASTRA.smiteCore, 1 - t, a);
      }
    });
    this.flashIn(x, y, 24, ASTRA.smiteCore, ASTRA.smite, 9.7);
  }

  /** Worm Warp fired: a little ripple at the muzzle. */
  warpLaunch(x: number, y: number): void {
    this.anim(8, 260, (g, t) => {
      g.lineStyle(2 * (1 - t), this.tint(ASTRA.worm), 1 - t);
      g.strokeCircle(x, y, 6 + easeOut(t) * 20);
    });
  }

  /** The swap: a wormhole mouth opens under each body, they spin, and close. */
  warpSwap(x1: number, y1: number, x2: number, y2: number): void {
    this.anim(4.5, 620, (g, t) => {
      const open = t < 0.3 ? easeOut(t / 0.3) : 1 - easeIn((t - 0.3) / 0.7);
      wormMouth(g, this.tint, x1, y1, open, t * 3, 1);
      wormMouth(g, this.tint, x2, y2, open, t * 3 + 1, 1);
    });
    this.anim(8.5, 380, (g, t) => {
      // A thread of the tunnel between the two mouths.
      g.lineStyle(3 * (1 - t), this.tint(ASTRA.worm), (1 - t) * 0.7);
      g.lineBetween(x1, y1, x2, y2);
      g.lineStyle(1.2, this.tint(ASTRA.white), (1 - t));
      g.lineBetween(x1, y1, x2, y2);
    });
  }

  /** A wormhole that hit nothing collapses on itself. */
  warpFizzle(x: number, y: number): void {
    this.anim(8, 240, (g, t) => wormOrb(g, this.tint, x, y, 10 * (1 - easeIn(t)), t * 4, 1 - t));
  }

  /** Stolen charge streaming from the victim into Astra: a line of motes. */
  steal(fx: number, fy: number, tx: () => { x: number; y: number }, color: number): void {
    for (let i = 0; i < 8; i++) {
      const delay = i * 40;
      this.scene.time.delayedCall(delay, () => {
        this.anim(9, 480, (g, t) => {
          const to = tx();
          const k = easeIn(t);
          const wob = Math.sin(t * Math.PI) * 26 * (i % 2 ? 1 : -1);
          const ang = Math.atan2(to.y - fy, to.x - fx) + Math.PI / 2;
          const x = fx + (to.x - fx) * k + Math.cos(ang) * wob;
          const y = fy + (to.y - fy) * k + Math.sin(ang) * wob;
          drawStar(g, this.tint, x, y, 3.5, color, 1 - t * 0.4, t * 6);
        });
      });
    }
  }

  /** The trial begins: the star inside flares, rays burst out of every crack. */
  trialBegin(x: number, y: number): void {
    this.flashIn(x, y, 30, ASTRA.white, ASTRA.starHot, 9);
    this.anim(9, 700, (g, t) => {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + t * 0.6;
        const r0 = 16;
        const r1 = 16 + easeOut(t) * 70;
        g.lineStyle(3 * (1 - t), this.tint(i % 2 ? ASTRA.starHot : ASTRA.white), 1 - t);
        g.lineBetween(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      }
    });
  }

  /** The trial is passed: a supernova ring and the screen flares gold. */
  starModeOn(x: number, y: number): void {
    this.scene.cameras.main.flash(160, 255, 236, 170);
    this.scene.cameras.main.shake(260, 0.008);
    this.anim(9, 900, (g, t) => {
      g.lineStyle(10 * (1 - t), this.tint(ASTRA.starHot), 1 - t);
      g.strokeCircle(x, y, 20 + easeOut(t) * 220);
      g.lineStyle(4 * (1 - t), this.tint(ASTRA.white), 1 - t);
      g.strokeCircle(x, y, 10 + easeOut(t) * 160);
      drawStar(g, this.tint, x, y, 30 + 40 * easeOut(t), ASTRA.white, (1 - t) * 0.8, t);
    });
  }

  /** The trial is failed: the star gutters, the cracks go dark, shards fall. */
  trialFail(x: number, y: number): void {
    this.anim(9, 900, (g, t) => {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU + 0.4;
        const d = 14 + easeOut(t) * 26;
        const fall = easeIn(t) * 30;
        g.fillStyle(this.tint(i % 2 ? ASTRA.shellLit : ASTRA.shellDark), 1 - t);
        g.fillTriangle(
          x + Math.cos(a) * d, y + Math.sin(a) * d + fall,
          x + Math.cos(a + 0.25) * (d + 6), y + Math.sin(a + 0.25) * (d + 6) + fall,
          x + Math.cos(a - 0.2) * (d + 8), y + Math.sin(a - 0.2) * (d + 8) + fall,
        );
      }
      g.fillStyle(this.tint(ASTRA.void), (1 - t) * 0.6);
      g.fillCircle(x, y, 26 * (1 - t));
    });
  }

  /** A shot burned up by the corona: a little gold puff. */
  burn(x: number, y: number): void {
    this.anim(9, 260, (g, t) => {
      g.fillStyle(this.tint(ASTRA.corona), (1 - t) * 0.8);
      g.fillCircle(x, y, 4 + easeOut(t) * 10);
      g.fillStyle(this.tint(ASTRA.starHot), 1 - t);
      g.fillCircle(x, y, 3 * (1 - t));
    });
  }

  /** The aura scorching a body it touches. */
  scorch(x: number, y: number): void {
    this.anim(9, 300, (g, t) => {
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + (i - 1.5) * 0.5;
        const d = 8 + easeOut(t) * 18;
        g.fillStyle(this.tint(i % 2 ? ASTRA.corona : ASTRA.solar), 1 - t);
        g.fillCircle(x + Math.cos(a) * d, y - 6 + Math.sin(a) * d, 2.6 * (1 - t));
      }
    });
  }

  /** The excited wall lets go: a flash at the wall before the beam. */
  wallRelease(x: number, y: number): void {
    this.flashIn(x, y, 16, ASTRA.exciteLit, ASTRA.excite, 9);
  }

  /** A wall beam: Click's beam in Click+'s violet-gold. */
  wallBeam(x0: number, y0: number, x1: number, y1: number): void {
    this.anim(8.5, 220, (g, t) => {
      const a = 1 - easeIn(t);
      g.fillStyle(this.tint(ASTRA.excite), 0.35 * a);
      const ang = Math.atan2(y1 - y0, x1 - x0);
      const px = -Math.sin(ang) * 9;
      const py = Math.cos(ang) * 9;
      g.fillTriangle(x0 + px, y0 + py, x1 + px, y1 + py, x1 - px, y1 - py);
      g.fillTriangle(x0 + px, y0 + py, x0 - px, y0 - py, x1 - px, y1 - py);
      solarBeam(g, this.tint, x0, y0, x1, y1, 8 * (1 - t * 0.5), a, t);
    });
  }

  /**
   * Impact frames for the slap: two frames of a stark negative — black, the bodies and a radial
   * burst in white; then white with them in black — over the whole view, before the world returns.
   */
  impactFrames(x: number, y: number, ang: number, bodies: { x: number; y: number }[]): void {
    const cam = this.scene.cameras.main;
    const v = cam.worldView;
    const pad = 200;
    const L = v.x - pad;
    const T = v.y - pad;
    const W = v.width + pad * 2;
    const H = v.height + pad * 2;
    const frame = (g: Phaser.GameObjects.Graphics, bg: number, fg: number): void => {
      g.fillStyle(bg, 1);
      g.fillRect(L, T, W, H);
      g.fillStyle(fg, 1);
      // Speed lines converging on the impact.
      const rnd = seeded(x + y);
      for (let i = 0; i < 46; i++) {
        const a = (i / 46) * TAU + rnd() * 0.08;
        const r0 = 60 + rnd() * 80;
        const r1 = 900;
        const w = 0.012 + rnd() * 0.02;
        g.fillTriangle(
          x + Math.cos(a) * r0, y + Math.sin(a) * r0,
          x + Math.cos(a - w) * r1, y + Math.sin(a - w) * r1,
          x + Math.cos(a + w) * r1, y + Math.sin(a + w) * r1,
        );
      }
      // A hard starburst at the impact, flung along the slap.
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 16; i++) {
        const a = ang + (i / 16) * TAU;
        const r = i % 2 ? 22 : 58 + (Math.abs(Math.cos(a - ang)) * 40);
        pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * r, y + Math.sin(a) * r));
      }
      g.fillPoints(pts, true);
      for (const b of bodies) g.fillCircle(b.x, b.y, 22);
      g.fillStyle(bg, 1);
      g.fillCircle(x, y, 12);
    };
    const g = this.gfx(60);
    frame(g, 0x000000, 0xffffff);
    this.scene.time.delayedCall(70, () => { if (!g.active) return; g.clear(); frame(g, 0xffffff, 0x000000); });
    this.scene.time.delayedCall(140, () => { if (g.active) g.destroy(); });
  }

  /** The slap landing: a giant palm-print of light, a shockwave and a cone of debris along the hit. */
  slap(x: number, y: number, ang: number): void {
    this.scene.cameras.main.shake(380, 0.022);
    this.anim(9.5, 520, (g, t) => {
      const a = 1 - easeIn(t);
      // The palm: a big disc and four finger lobes, swung through the hit.
      const swing = ang - 0.9 + easeOut(Math.min(1, t * 3)) * 0.9;
      const hx = x - Math.cos(ang) * 30;
      const hy = y - Math.sin(ang) * 30;
      g.fillStyle(this.tint(ASTRA.starHot), a * 0.7);
      g.fillCircle(hx, hy, 26);
      for (let i = 0; i < 4; i++) {
        const fa = swing + (i - 1.5) * 0.32;
        g.fillCircle(hx + Math.cos(fa) * 30, hy + Math.sin(fa) * 30, 9);
      }
      g.fillStyle(this.tint(ASTRA.white), a);
      g.fillCircle(hx, hy, 14);
      // Shockwave.
      g.lineStyle(10 * a, this.tint(ASTRA.white), a);
      g.strokeCircle(x, y, 20 + easeOut(t) * 140);
      g.lineStyle(4 * a, this.tint(ASTRA.solar), a);
      g.strokeCircle(x, y, 10 + easeOut(t) * 90);
    });
    for (let i = 0; i < 14; i++) {
      const a = ang + (Math.random() - 0.5) * 1.1;
      const d = 80 + Math.random() * 120;
      this.anim(9, 500, (g, t) => {
        const k = easeOut(t);
        g.fillStyle(this.tint(i % 2 ? ASTRA.starHot : ASTRA.white), 1 - t);
        g.fillCircle(x + Math.cos(a) * d * k, y + Math.sin(a) * d * k, 3 * (1 - t) + 1);
      });
    }
  }

  /** A body slammed into the arena wall: a starburst crater in the wall and a ring of rubble. */
  wallCrash(x: number, y: number, normal: number): void {
    this.scene.cameras.main.shake(260, 0.016);
    this.flashIn(x, y, 30, ASTRA.white, ASTRA.solar, 9);
    this.anim(3.6, 2600, (g, t) => {
      const a = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2;
      g.fillStyle(this.tint(ASTRA.void), 0.6 * a);
      g.fillCircle(x, y, 30);
      g.lineStyle(2.5, this.tint(ASTRA.solar), 0.8 * a);
      for (let i = 0; i < 9; i++) {
        const ca = normal + (i / 9 - 0.5) * Math.PI * 1.6;
        const len = 30 + (i * 13) % 24;
        g.lineBetween(x, y, x + Math.cos(ca) * len, y + Math.sin(ca) * len);
      }
    });
    for (let i = 0; i < 10; i++) {
      const a = normal + (Math.random() - 0.5) * 2;
      const d = 30 + Math.random() * 60;
      this.anim(9, 600, (g, t) => {
        const k = easeOut(t);
        g.fillStyle(this.tint(ASTRA.shellLit), 1 - t);
        g.fillRect(x + Math.cos(a) * d * k - 3, y + Math.sin(a) * d * k - 3 + easeIn(t) * 20, 6, 5);
      });
    }
  }
}

// ── The giant (Q+ at five stars) ────────────────────────────────────────

const GIANT_CRACKS = makeCracks(7.3, 9, 1);

/**
 * The giant star form looming behind the arena: a vast cracked shell of night with the star
 * blazing through it, a corona round its rim, and two great eyes that look at `look`.
 * `R` is its radius, `rise` 0..1 how far it has risen, `bright` how hard it burns.
 */
export function drawGiant(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, R: number,
  t: number, alpha: number, look: { x: number; y: number },
): void {
  // Corona.
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU + t * 0.25;
    const lick = 0.55 + 0.45 * Math.sin(t * 3 + i * 1.3);
    g.fillStyle(tint(i % 2 ? ASTRA.corona : ASTRA.solar), alpha * 0.35);
    g.fillTriangle(
      x + Math.cos(a - 0.08) * R * 0.96, y + Math.sin(a - 0.08) * R * 0.96,
      x + Math.cos(a) * R * (1.12 + 0.18 * lick), y + Math.sin(a) * R * (1.12 + 0.18 * lick),
      x + Math.cos(a + 0.08) * R * 0.96, y + Math.sin(a + 0.08) * R * 0.96,
    );
  }
  g.fillStyle(tint(ASTRA.solar), alpha * 0.12);
  g.fillCircle(x, y, R * 1.25);
  // The shell, shaded to a lit cap.
  g.fillStyle(tint(ASTRA.void), alpha);
  g.fillCircle(x, y, R);
  g.fillStyle(tint(ASTRA.shellDark), alpha);
  g.fillCircle(x - R * 0.05, y - R * 0.06, R * 0.92);
  g.fillStyle(tint(ASTRA.shell), alpha);
  g.fillCircle(x - R * 0.12, y - R * 0.14, R * 0.72);
  g.fillStyle(tint(ASTRA.shellLit), alpha * 0.5);
  g.fillCircle(x - R * 0.28, y - R * 0.32, R * 0.32);
  // Far stars freckling it.
  const rnd = seeded(3.1);
  for (let i = 0; i < 40; i++) {
    const a = rnd() * TAU;
    const d = Math.sqrt(rnd()) * R * 0.9;
    g.fillStyle(tint(ASTRA.farStar), alpha * (0.4 + 0.5 * Math.abs(Math.sin(t * 2 + i))));
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 1 + rnd() * 2);
  }
  // The star through the cracks.
  crackLight(g, tint, x, y, R, GIANT_CRACKS, 1.4 + 0.3 * Math.sin(t * 6), alpha, R);
  g.fillStyle(tint(ASTRA.starHot), alpha * 0.85);
  g.fillCircle(x + R * 0.18, y + R * 0.22, R * 0.12);
  g.fillStyle(tint(ASTRA.white), alpha);
  g.fillCircle(x + R * 0.18, y + R * 0.22, R * 0.07);
  // Eyes.
  const la = Math.atan2(look.y - y, look.x - x);
  for (const side of [-1, 1]) {
    const ex = x + side * R * 0.3;
    const ey = y - R * 0.12;
    g.fillStyle(tint(ASTRA.starHot), alpha * 0.3);
    g.fillEllipse(ex, ey, R * 0.32, R * 0.26);
    g.fillStyle(tint(ASTRA.star), alpha);
    g.fillEllipse(ex, ey, R * 0.24, R * 0.19);
    g.fillStyle(tint(ASTRA.nebula), alpha);
    g.fillCircle(ex + Math.cos(la) * R * 0.05, ey + Math.sin(la) * R * 0.04, R * 0.065);
    g.fillStyle(tint(ASTRA.white), alpha);
    g.fillCircle(ex + Math.cos(la) * R * 0.05 - R * 0.02, ey + Math.sin(la) * R * 0.04 - R * 0.02, R * 0.02);
  }
}

/**
 * The giant's hand: a vast ball hand of night with four finger lobes and a thumb that curl closed
 * (`close` 0..1) round whatever is at its centre, the star bleeding through its knuckles.
 */
export function drawGiantHand(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, close: number, t: number, alpha: number,
): void {
  const spread = 1 - close;
  g.fillStyle(tint(ASTRA.solar), alpha * 0.2);
  g.fillCircle(x, y, r * 1.6);
  // Fingers above, thumb below: they meet over the centre as the hand closes.
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (i - 1.5) * (0.42 + 0.3 * spread);
    const d = r * (0.95 + 0.5 * spread);
    const fx = x + Math.cos(a) * d * (0.55 + 0.45 * spread);
    const fy = y + Math.sin(a) * d * (0.55 + 0.45 * spread) + close * r * 0.35;
    g.fillStyle(tint(ASTRA.shellDark), alpha);
    g.fillCircle(fx, fy, r * 0.36);
    g.fillStyle(tint(ASTRA.shell), alpha);
    g.fillCircle(fx - r * 0.06, fy - r * 0.06, r * 0.26);
    g.fillStyle(tint(ASTRA.starHot), alpha * (0.6 + 0.4 * Math.sin(t * 8 + i)));
    g.fillCircle(fx, fy + r * 0.2, r * 0.06);
  }
  const ta = Math.PI / 2 + 0.5 * spread;
  const tx = x + Math.cos(ta) * r * (1.1 * spread + 0.45);
  const ty = y + Math.sin(ta) * r * (1.1 * spread + 0.45) - close * r * 0.2;
  g.fillStyle(tint(ASTRA.shellDark), alpha);
  g.fillCircle(tx, ty, r * 0.4);
  g.fillStyle(tint(ASTRA.shell), alpha);
  g.fillCircle(tx - r * 0.06, ty - r * 0.06, r * 0.28);
  if (close < 0.6) {
    // The open palm, star-lit, behind the target.
    g.fillStyle(tint(ASTRA.shellDark), alpha * spread);
    g.fillCircle(x, y - r * 0.2, r * 0.7);
    g.fillStyle(tint(ASTRA.starHot), alpha * spread * 0.6);
    g.fillCircle(x, y - r * 0.2, r * 0.18);
  }
}

// ── The rig ─────────────────────────────────────────────────────────────

const ASTRA_AVATAR: AvatarSpec = {
  hands: [
    { r: 9.5, color: ASTRA.solar, alpha: 0.16 },
    { r: 6.6, color: ASTRA.shellDark, alpha: 0.98 },
    { r: 4.7, color: ASTRA.shell, alpha: 0.96 },
    { r: 1.8, color: ASTRA.starHot, alpha: 0.95, ox: -1.4, oy: -1.4 },
  ],
  // Starlight eyes: pale gold with a violet pupil.
  eyeWhite: ASTRA.star,
  eyePupil: ASTRA.nebula,
  squash: { div: 15, x: 0.4, y: 0.24 },
};

/**
 * The chunk of shell broken clean off Astra's lower right: the jagged edge of the break as
 * (angle, radius) pairs on a radius-22 body, running rim to rim. Inside it is the star.
 */
const SHELL_BREAK: ReadonlyArray<readonly [number, number]> = [
  [-0.6, 23], [-0.45, 16], [-0.25, 12.5], [0, 9], [0.25, 10.5], [0.5, 5.5], [0.8, 7.5],
  [1.1, 4.5], [1.4, 7], [1.7, 5.5], [1.95, 9.5], [2.2, 12], [2.4, 16], [2.55, 23],
];
const BREAK_FROM = SHELL_BREAK[0][0];
const BREAK_TO = SHELL_BREAK[SHELL_BREAK.length - 1][0];

/**
 * The hole as a closed polygon round (cx, cy), every point pulled in to at most `maxR` — i.e.
 * a disc of radius `maxR` seen through the break. A large `maxR` gives the whole cut-out, which
 * BootScene erases from the baked `elem-astra` orb.
 */
export function shellBreakPoly(cx: number, cy: number, maxR: number, scale = 1): { x: number; y: number }[] {
  const ring: { x: number; y: number }[] = SHELL_BREAK.map(([a, r]) => ({ x: Math.cos(a) * r, y: Math.sin(a) * r }));
  for (let i = 1; i < 8; i++) {
    const a = BREAK_TO + (BREAK_FROM - BREAK_TO) * (i / 8);
    ring.push({ x: Math.cos(a) * 32, y: Math.sin(a) * 32 });
  }
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % ring.length];
    for (let k = 0; k < 6; k++) {
      const x = p.x + (q.x - p.x) * (k / 6);
      const y = p.y + (q.y - p.y) * (k / 6);
      const d = Math.hypot(x, y);
      const f = d > maxR ? maxR / d : 1;
      out.push({ x: cx + x * f * scale, y: cy + y * f * scale });
    }
  }
  return out;
}

/** The body's cracks, minus any that would run across the open break. */
const BODY_CRACKS = makeCracks(2.17, 7, 19).filter((c) => {
  const end = c.pts[c.pts.length - 1];
  const a = Math.atan2(end.y, end.x);
  return a < BREAK_FROM - 0.15 || a > BREAK_TO + 0.15;
});

/**
 * The cracked star: the baked `elem-astra` night-sky orb, cracks of starlight across it with the
 * dwarf star itself showing through the widest one, and one small accessory — a solar
 * prominence arcing off the crown.
 *
 * The star burns brighter as `brightness` rises (the trial), and in star mode the cracks blaze,
 * the prominence becomes a full crown of flame and the hands are wrapped in corona. Mastered (no
 * mastery yet, the tell is ready): a gilded ring of orbiting moons.
 */
export class AstraAvatar extends BaseAvatar {
  /** 0..1 how hard the star is burning: the trial ramps it, star mode pins it. */
  private bright = 0;
  private brightTarget = 0;
  private star = false;
  /** Q+ stars taken on, drawn over the head while holding. */
  private stars = 0;
  private holding = false;

  constructor(scene: Phaser.Scene, tint: ColorFn, depth = 6) {
    super(scene, tint, depth, ASTRA_AVATAR);
  }

  setBrightness(b: number): void { this.brightTarget = Phaser.Math.Clamp(b, 0, 1); }
  setStarMode(on: boolean): void { this.star = on; }
  setTrialStars(n: number, holding: boolean): void { this.stars = n; this.holding = holding; }

  update(delta: number, x: number, y: number, alpha: number): void {
    const target = this.star ? 1 : this.brightTarget;
    this.bright += (target - this.bright) * Math.min(1, delta / 260);
    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 13 : 9.5);
      glow.setFillStyle(this.tint(on ? ASTRA.starHot : ASTRA.solar), on ? 0.38 : 0.16);
    });
  }

  /** Cracks of starlight, and the star through the widest of them. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const b = this.bright;
    const flick = 0.85 + 0.15 * Math.sin(this.t * 11);
    crackLight(g, this.tint, x, y, 19, BODY_CRACKS, (0.25 + 0.95 * b) * flick, alpha);
    // The star inside, seen through the broken-away chunk: the sprite is cut there, so each
    // layer is the hole clipped to a smaller disc — corona out to the shell's inner wall, then
    // ever hotter towards the heart.
    const pulse = 0.6 * Math.sin(this.t * 6);
    const layers: [number, number, number][] = [
      [18, ASTRA.corona, 0.9],
      [15.5 + pulse, ASTRA.solar, 1],
      [11.5 + pulse + 2 * b, ASTRA.starHot, 1],
      [7 + 2.5 * b, ASTRA.star, 0.9 + 0.1 * flick],
    ];
    for (const [r, color, a] of layers) {
      g.fillStyle(this.tint(color), alpha * a);
      g.fillPoints(shellBreakPoly(x, y, r), true);
    }
    // Granulation churning on the star's face.
    for (let i = 0; i < 6; i++) {
      const ang = BREAK_FROM + 0.35 + ((i * 0.37 + this.t * 0.05) % 1) * (BREAK_TO - BREAK_FROM - 0.7);
      const d = 11 + 4 * Math.sin(this.t * 1.7 + i * 2.1);
      g.fillStyle(this.tint(i % 2 ? ASTRA.white : ASTRA.corona), alpha * 0.45);
      g.fillCircle(x + Math.cos(ang) * d, y + Math.sin(ang) * d, 1.1 + 0.5 * Math.sin(this.t * 3 + i));
    }
    // The broken edge of the shell: starlight spilling over it, then its dark lip and the lit
    // cross-section of the shell's thickness just past it, on the hole side.
    const edge = SHELL_BREAK.map(([ang, r]) => ({ x: x + Math.cos(ang) * Math.min(r, 21.5), y: y + Math.sin(ang) * Math.min(r, 21.5) }));
    g.lineStyle(4 + 3 * b, this.tint(ASTRA.solar), alpha * (0.25 + 0.3 * b) * flick);
    g.strokePoints(edge, false);
    g.lineStyle(1.6, this.tint(ASTRA.void), alpha);
    g.strokePoints(edge, false);
    g.lineStyle(1, this.tint(ASTRA.shellLit), alpha * 0.9);
    g.strokePoints(SHELL_BREAK.map(([ang, r]) => {
      const rr = Math.min(r + 1.5, 21.5);
      return { x: x + Math.cos(ang) * rr, y: y + Math.sin(ang) * rr };
    }), false);
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    g.fillStyle(this.tint(ASTRA.void), a * 0.45);
    g.fillEllipse(x, y + 18, 48, 14);
    const b = this.bright;
    g.fillStyle(this.tint(ASTRA.nebula), a * 0.22);
    g.fillCircle(x, y, 28);
    if (b > 0.05) {
      g.fillStyle(this.tint(ASTRA.solar), a * 0.35 * b);
      g.fillCircle(x, y, 30 + 10 * b);
    }
  }

  /** The prominence on the crown (a crown of flame in star mode), Q+'s stars, the mastered moons. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const t = this.t;
    const b = this.bright;
    if (this.star) {
      // A crown of flame tongues licking up off the head.
      for (let i = 0; i < 7; i++) {
        const ang = -Math.PI / 2 + (i - 3) * 0.32;
        const lick = 0.6 + 0.4 * Math.sin(t * 9 + i * 1.6);
        const r0 = 16;
        const r1 = 16 + (10 + (i === 3 ? 8 : 0)) * lick;
        g.fillStyle(this.tint(i % 2 ? ASTRA.corona : ASTRA.starHot), alpha * 0.9);
        g.fillTriangle(
          x + Math.cos(ang - 0.14) * r0, y + Math.sin(ang - 0.14) * r0,
          x + Math.cos(ang) * r1, y + Math.sin(ang) * r1,
          x + Math.cos(ang + 0.14) * r0, y + Math.sin(ang + 0.14) * r0,
        );
      }
      // Corona round each hand.
      for (let i = 0; i < 2; i++) {
        g.lineStyle(1.6, this.tint(ASTRA.starHot), alpha * (0.6 + 0.4 * Math.sin(t * 10 + i)));
        g.strokeCircle(this.armX[i], this.armY[i], 8.5 + Math.sin(t * 12 + i) * 1.2);
      }
    } else {
      // A solar prominence: a looping arc of flame off one side of the crown.
      const ox = x - 7;
      const oy = y - 16;
      g.lineStyle(3 + 2 * b, this.tint(ASTRA.solar), alpha * (0.55 + 0.35 * b));
      g.beginPath();
      for (let i = 0; i <= 12; i++) {
        const k = i / 12;
        const ang = Math.PI + k * Math.PI;
        const r = 7 + 1.5 * Math.sin(t * 4 + k * 6);
        const px = ox + 7 + Math.cos(ang) * r * 1.1;
        const py = oy + Math.sin(ang) * r * (1 + 0.15 * Math.sin(t * 3));
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
      g.lineStyle(1.2, this.tint(ASTRA.starHot), alpha);
      g.beginPath();
      for (let i = 0; i <= 12; i++) {
        const k = i / 12;
        const ang = Math.PI + k * Math.PI;
        const r = 7 + 1.5 * Math.sin(t * 4 + k * 6);
        const px = ox + 7 + Math.cos(ang) * r * 1.1;
        const py = oy + Math.sin(ang) * r * (1 + 0.15 * Math.sin(t * 3));
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
    }
    // The Q+ hold: energy pouring in, and the stars it has taken on.
    if (this.holding) {
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * TAU + t * 1.3;
        const k = (t * 1.6 + i * 0.37) % 1;
        const d = 60 * (1 - k) + 12;
        drawStar(g, this.tint, x + Math.cos(ang) * d, y + Math.sin(ang) * d, 2.4 + 1.6 * k, ASTRA.starHot, alpha * k, ang);
      }
    }
    if (this.stars > 0) trialStars(g, this.tint, x, y - 46, this.stars, t, alpha);
    if (this.mastered) {
      for (let i = 0; i < 3; i++) {
        const ang = t * 1.4 + (i / 3) * TAU;
        const mx = x + Math.cos(ang) * 30;
        const my = y - 4 + Math.sin(ang) * 10;
        g.fillStyle(this.tint(ASTRA.starHot), alpha);
        g.fillCircle(mx, my, 2.6);
        g.fillStyle(this.tint(ASTRA.white), alpha);
        g.fillCircle(mx - 0.7, my - 0.7, 1);
      }
    }
  }
}
