import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeOut } from './ElementVisuals';

/**
 * Gas's look (id `pressure`): a riveted steel boiler-robot with amber lamp eyes, two smokestacks
 * on its crown, and one giant brass-and-steel gauntlet on its right hand with a pressure gauge on
 * the back of it. The robot is full of purple smog — it rolls behind the glass in its belly, leaks
 * out of every seam and pours off the stacks — and everything it vents is that same purple gas.
 * The charge still reads as heat: steel, then amber, then red.
 *
 * Every painter takes a `ColorFn` so a skin can recolour it, and the previews call the same ones.
 */

export const PRESSURE = {
  ink: 0x17191d,
  steelDark: 0x3f444c,
  steel: 0x7d848d,
  steelLit: 0xc4cad1,
  rivet: 0xa9b0b8,
  brass: 0xb9893a,
  brassLit: 0xf0cf72,
  amber: 0xffb347,
  amberLit: 0xfff1cf,
  red: 0xc7462e,
  hot: 0xff5a36,
  hotLit: 0xffc2a8,
  // What used to be steam is smog now: every puff, jet and bank line is purple.
  steam: 0xd9b8f5,
  steamShade: 0x8a55c4,
  gas: 0xa35be0,
  gasDark: 0x4a1f7a,
  gasLit: 0xe2c2ff,
  spark: 0xffe27a,
  sparkLit: 0xfffbe6,
  fire: 0xff8a3c,
  pain: 0xe0232f,
  painCore: 0xff9a9a,
  painDark: 0x5c0710,
  crack: 0x2b2420,
  dust: 0x9a8b78,
};

export type PressureColorFn = ColorFn;

/** Heat along the gauge: steel at 0, amber at 50, red at 100, white-hot past it. */
export function heatColor(tint: ColorFn, p: number): number {
  const lerp = (a: number, b: number, t: number): number => {
    const c1 = Phaser.Display.Color.IntegerToColor(a);
    const c2 = Phaser.Display.Color.IntegerToColor(b);
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(c1, c2, 100, Math.round(Phaser.Math.Clamp(t, 0, 1) * 100));
    return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
  };
  if (p <= 50) return tint(lerp(PRESSURE.steelLit, PRESSURE.amber, p / 50));
  if (p <= 100) return tint(lerp(PRESSURE.amber, PRESSURE.hot, (p - 50) / 50));
  return tint(lerp(PRESSURE.hot, PRESSURE.hotLit, (p - 100) / 25));
}

/**
 * The pressure bar under a fighter: the live charge, the 50 and 100 notches, the overcharge stub
 * past 100 when there is one, and Release's banked pressure as a thin steam line beneath.
 */
export function pressureBar(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number,
  charge: number, max: number, banked: number, alpha: number, t: number,
): void {
  const W = 50;
  const H = 6;
  const full = max > 100 ? W * (max / 100) : W;
  const left = x - W / 2;
  g.fillStyle(tint(PRESSURE.ink), 0.75 * alpha);
  g.fillRoundedRect(left - 2, y - 2, full + 4, H + 4, 3);
  if (charge > 0) {
    const w = W * (Math.min(charge, max) / 100);
    g.fillStyle(heatColor(tint, charge), alpha * (0.85 + 0.15 * Math.sin(t * 20)));
    g.fillRoundedRect(left, y, Math.max(2, w), H, 2);
    g.fillStyle(tint(PRESSURE.amberLit), alpha * 0.45);
    g.fillRect(left, y, Math.max(2, w), 1.5);
  }
  g.lineStyle(1, tint(PRESSURE.steelLit), alpha * 0.85);
  for (const n of [50, 100]) g.lineBetween(left + W * (n / 100), y - 1, left + W * (n / 100), y + H + 1);
  if (max > 100) {
    g.lineStyle(1, tint(PRESSURE.hot), alpha * 0.8);
    g.strokeRect(left + W, y, full - W, H);
  }
  if (banked > 0) {
    g.fillStyle(tint(PRESSURE.steam), alpha * 0.9);
    g.fillRect(left, y + H + 3, W * Math.min(1, banked / 100), 2);
    if (banked >= 100) {
      g.fillStyle(tint(PRESSURE.amberLit), alpha * (0.5 + 0.5 * Math.sin(t * 8)));
      g.fillCircle(left + W + 4, y + H + 4, 2);
    }
  }
}

/** A soft round puff of smog: a shaded body with a lit cap. */
export function steamPuff(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, alpha: number): void {
  g.fillStyle(tint(PRESSURE.steamShade), alpha * 0.55);
  g.fillCircle(x + r * 0.15, y + r * 0.2, r);
  g.fillStyle(tint(PRESSURE.steam), alpha * 0.8);
  g.fillCircle(x - r * 0.12, y - r * 0.1, r * 0.82);
  g.fillStyle(tint(PRESSURE.gasLit), alpha * 0.4);
  g.fillCircle(x - r * 0.35, y - r * 0.35, r * 0.35);
}

/**
 * A hanging cloud of gas, the part that lies on the floor under everyone: a dark heart and slow
 * rolling lobes. `primed` (0..1) is a lit fuse — the cloud's heart turns to fire before it blows.
 */
export function gasCloud(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number,
  seed: number, t: number, alpha: number, primed = 0,
): void {
  g.fillStyle(tint(PRESSURE.gasDark), alpha * 0.2);
  g.fillCircle(x, y + r * 0.08, r * 0.92);
  for (let i = 0; i < 5; i++) {
    const a = seed + (i / 5) * TAU + t * 0.22;
    const d = r * (0.42 + 0.08 * Math.sin(t * 0.9 + i * 1.7 + seed));
    const lr = r * (0.5 + 0.07 * Math.sin(t * 1.3 + i * 2.1));
    g.fillStyle(tint(PRESSURE.gas), alpha * 0.13);
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85, lr);
  }
  if (primed > 0) {
    g.fillStyle(tint(PRESSURE.fire), alpha * 0.55 * primed);
    g.fillCircle(x, y, r * (0.35 + 0.5 * primed));
    g.fillStyle(tint(PRESSURE.sparkLit), alpha * 0.8 * primed);
    g.fillCircle(x, y, r * 0.22 * primed);
  }
}

/** The same cloud's top: thin lit wisps that drift over whoever stands in it. */
export function gasWisps(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number,
  seed: number, t: number, alpha: number,
): void {
  for (let i = 0; i < 3; i++) {
    const a = seed * 1.7 + (i / 3) * TAU - t * 0.35;
    const d = r * (0.3 + 0.12 * Math.sin(t * 0.8 + i * 2.6));
    g.fillStyle(tint(PRESSURE.gasLit), alpha * 0.09);
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8 - r * 0.12, r * 0.34);
  }
  g.lineStyle(1.2, tint(PRESSURE.gasLit), alpha * 0.2);
  for (let i = 0; i < 2; i++) {
    const a0 = seed + i * Math.PI + t * 0.5;
    g.beginPath();
    g.arc(x, y - r * 0.05, r * (0.55 + i * 0.22), a0, a0 + 1.1);
    g.strokePath();
  }
}

/**
 * A gas puddle (F+): heavy gas settled on the floor for good. Nearly see-through — a faint film,
 * a rim you can read, and slow bubbles turning in it.
 */
export function gasPuddle(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number,
  seed: number, t: number, alpha: number,
): void {
  g.fillStyle(tint(PRESSURE.gas), alpha * 0.09);
  g.fillEllipse(x, y, r * 2, r * 1.84);
  g.fillStyle(tint(PRESSURE.gasLit), alpha * 0.05);
  g.fillEllipse(x - r * 0.15, y - r * 0.12, r * 1.3, r * 1.1);
  g.lineStyle(1.4, tint(PRESSURE.gasLit), alpha * (0.26 + 0.06 * Math.sin(t * 1.6 + seed)));
  g.strokeEllipse(x, y, r * 2, r * 1.84);
  for (let i = 0; i < 4; i++) {
    const a = seed + i * 1.9 + t * 0.3;
    const d = r * (0.25 + 0.45 * ((i * 0.37 + seed * 0.21) % 1));
    const pulse = (t * 0.5 + i * 0.27 + seed) % 1;
    g.lineStyle(1, tint(PRESSURE.gasLit), alpha * 0.35 * (1 - pulse));
    g.strokeCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.9, 2 + pulse * 5);
  }
}

/**
 * A gas vent (E+): the floor split where the gauntlet came down — a dark fissure with cracks
 * running off it, an iron lip, and a purple glow that swells each time it breathes out.
 */
export function gasFissure(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number,
  seed: number, t: number, alpha: number, breath: number,
): void {
  g.lineStyle(2, tint(PRESSURE.crack), alpha * 0.9);
  for (let i = 0; i < 6; i++) {
    const a = seed + (i / 6) * TAU;
    const len = 26 + ((i * 41 + seed * 17) % 16);
    g.beginPath();
    g.moveTo(x + Math.cos(a) * 12, y + Math.sin(a) * 6);
    g.lineTo(x + Math.cos(a + 0.2) * len * 0.6, y + Math.sin(a + 0.2) * len * 0.32);
    g.lineTo(x + Math.cos(a - 0.12) * len, y + Math.sin(a - 0.12) * len * 0.5);
    g.strokePath();
  }
  g.fillStyle(tint(PRESSURE.gas), alpha * (0.18 + 0.22 * breath));
  g.fillEllipse(x, y, 58 + 14 * breath, 30 + 8 * breath);
  g.fillStyle(tint(PRESSURE.steelDark), alpha);
  g.fillEllipse(x, y, 36, 17);
  g.fillStyle(tint(PRESSURE.ink), alpha);
  g.fillEllipse(x, y, 29, 12);
  g.fillStyle(tint(PRESSURE.gas), alpha * (0.55 + 0.4 * breath));
  g.fillEllipse(x, y + 1, 21, 7);
  g.fillStyle(tint(PRESSURE.gasLit), alpha * (0.3 + 0.5 * breath));
  g.fillEllipse(x - 2, y, 9, 3);
  g.lineStyle(1.2, tint(PRESSURE.steelLit), alpha * 0.7);
  g.strokeEllipse(x, y, 36, 17);
}

/** The pain orb: a dark-red shell, a throbbing core, and nerve-thread veins round it. */
export function painOrb(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, t: number, alpha: number): void {
  const throb = 1 + 0.08 * Math.sin(t * 9);
  g.fillStyle(tint(PRESSURE.pain), alpha * 0.18);
  g.fillCircle(x, y, r * 1.9 * throb);
  g.fillStyle(tint(PRESSURE.painDark), alpha * 0.95);
  g.fillCircle(x, y, r * throb);
  g.fillStyle(tint(PRESSURE.pain), alpha);
  g.fillCircle(x, y, r * 0.78 * throb);
  g.fillStyle(tint(PRESSURE.painCore), alpha * 0.9);
  g.fillCircle(x - r * 0.15, y - r * 0.15, r * 0.4);
  g.lineStyle(1.2, tint(PRESSURE.painCore), alpha * 0.7);
  for (let i = 0; i < 5; i++) {
    const a = t * 1.3 + (i / 5) * TAU;
    const r1 = r * 0.95;
    const r2 = r * (1.35 + 0.15 * Math.sin(t * 7 + i));
    const bend = a + 0.35 * Math.sin(t * 5 + i * 2);
    g.beginPath();
    g.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    g.lineTo(x + Math.cos(bend) * (r1 + r2) / 2, y + Math.sin(bend) * (r1 + r2) / 2);
    g.lineTo(x + Math.cos(a + 0.2) * r2, y + Math.sin(a + 0.2) * r2);
    g.strokePath();
  }
}

/** PainLock on a body: a red nerve ring that tightens round it, with a pulse travelling it. */
export function painLockMark(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, t: number, alpha: number): void {
  const r = 24 + 1.5 * Math.sin(t * 6);
  g.lineStyle(1.6, tint(PRESSURE.pain), alpha * 0.65);
  g.strokeCircle(x, y, r);
  const a = t * 4;
  g.fillStyle(tint(PRESSURE.painCore), alpha * 0.9);
  g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r, 2.4);
  g.fillCircle(x + Math.cos(a + Math.PI) * r, y + Math.sin(a + Math.PI) * r, 1.6);
}

/** Driven into the floor: a crater of cracked slabs round the feet and grit on the rim. */
export function groundedCrater(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, seed: number, alpha: number): void {
  g.fillStyle(tint(PRESSURE.crack), alpha * 0.55);
  g.fillEllipse(x, y + 12, 58, 22);
  g.lineStyle(2, tint(PRESSURE.crack), alpha * 0.9);
  for (let i = 0; i < 7; i++) {
    const a = seed + (i / 7) * TAU;
    const len = 24 + ((i * 37 + seed * 13) % 14);
    g.beginPath();
    g.moveTo(x + Math.cos(a) * 12, y + 12 + Math.sin(a) * 5);
    g.lineTo(x + Math.cos(a + 0.15) * len * 0.6, y + 12 + Math.sin(a + 0.15) * len * 0.25);
    g.lineTo(x + Math.cos(a - 0.1) * len, y + 12 + Math.sin(a - 0.1) * len * 0.38);
    g.strokePath();
  }
  g.fillStyle(tint(PRESSURE.dust), alpha * 0.8);
  for (let i = 0; i < 6; i++) {
    const a = seed * 2 + i * 1.1;
    g.fillRect(x + Math.cos(a) * 30 - 2, y + 12 + Math.sin(a) * 10 - 1.5, 4, 3);
  }
}

/** The Release jet: a widening cone of gas along `ang`, puffs rolling down it. */
export function ventJet(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, ang: number,
  len: number, width: number, t: number, alpha: number, hot: boolean,
): void {
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  const px = -sin;
  const py = cos;
  // The cone itself, faint, so the hit area reads.
  g.fillStyle(tint(hot ? PRESSURE.hotLit : PRESSURE.steamShade), alpha * 0.16);
  g.beginPath();
  g.moveTo(x + px * 8, y + py * 8);
  g.lineTo(x + cos * len + px * width / 2, y + sin * len + py * width / 2);
  g.lineTo(x + cos * len - px * width / 2, y + sin * len - py * width / 2);
  g.lineTo(x - px * 8, y - py * 8);
  g.closePath();
  g.fillPath();
  // Puffs, rolling outward and growing with distance.
  const n = 11;
  for (let i = 0; i < n; i++) {
    const u = ((i / n) + t * 1.9) % 1;
    const wob = Math.sin(t * 7 + i * 2.3) * width * 0.22 * u;
    const cx = x + cos * len * u + px * wob;
    const cy = y + sin * len * u + py * wob;
    steamPuff(g, tint, cx, cy, 6 + u * width * 0.42, alpha * (1 - u * 0.55));
  }
  // The hot core at the nozzle.
  g.fillStyle(tint(PRESSURE.amberLit), alpha * 0.7);
  g.fillCircle(x + cos * 6, y + sin * 6, 6);
}

export class PressureFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: ColorFn) { super(scene, tint); }

  /** The punch landing: a white-hot knuckle flash, a shock ring and sparks along the swing. */
  punchHit(x: number, y: number, ang: number, p: number): void {
    const big = Phaser.Math.Clamp(p / 100, 0.2, 1.25);
    this.flashIn(x, y, 14 + 10 * big, PRESSURE.amberLit, heatColorRaw(p), 8);
    this.anim(8, 320, (g, t) => {
      g.lineStyle(3 * (1 - t) + 1, this.tint(PRESSURE.steelLit), (1 - t) * 0.9);
      g.strokeCircle(x, y, 10 + easeOut(t) * (30 + 26 * big));
      for (let i = 0; i < 7; i++) {
        const a = ang + (i - 3) * 0.28;
        const r0 = 8 + easeOut(t) * 30 * big;
        const r1 = r0 + 14 * (1 - t);
        g.lineStyle(2, this.tint(PRESSURE.amber), (1 - t));
        g.lineBetween(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      }
    });
  }

  /** A whiffed punch: the fist's arc and a puff off the knuckles. */
  punchWhiff(x: number, y: number, ang: number, reach: number): void {
    this.anim(7, 220, (g, t) => {
      g.lineStyle(4 * (1 - t), this.tint(PRESSURE.steelLit), (1 - t) * 0.7);
      g.beginPath();
      g.arc(x, y, reach, ang - 0.5, ang + 0.5);
      g.strokePath();
      steamPuff(g, this.tint, x + Math.cos(ang) * reach, y + Math.sin(ang) * reach, 6 + t * 10, (1 - t) * 0.8);
    });
  }

  /** The pre-punch lunge: steam blown out of the back of the gauntlet. */
  lungeBurst(x: number, y: number, ang: number): void {
    for (let i = 0; i < 4; i++) {
      const a = ang + Math.PI + (Math.random() - 0.5) * 0.9;
      const d = 20 + Math.random() * 30;
      this.anim(5, 420, (g, t) => steamPuff(g, this.tint, x + Math.cos(a) * d * easeOut(t), y + Math.sin(a) * d * easeOut(t), 5 + t * 9, (1 - t) * 0.8));
    }
  }

  /** Seismic Slam: the fist hits the floor; a shock ring runs out to `radius`, slabs jump. */
  slam(x: number, y: number, radius: number, p: number): void {
    const hot = heatColorRaw(p);
    this.flashIn(x, y, 22, PRESSURE.amberLit, hot, 4);
    this.scene.cameras.main.shake(140 + p, 0.002 + p * 0.00004);
    this.anim(3.3, 520, (g, t) => {
      const r = 16 + easeOut(t) * radius;
      g.fillStyle(this.tint(PRESSURE.dust), (1 - t) * 0.25);
      g.fillCircle(x, y, r);
      g.lineStyle(6 * (1 - t) + 1, this.tint(hot), (1 - t) * 0.9);
      g.strokeCircle(x, y, r);
      g.lineStyle(2, this.tint(PRESSURE.steelLit), (1 - t) * 0.6);
      g.strokeCircle(x, y, r * 0.7);
    });
    const slabs = 10;
    for (let i = 0; i < slabs; i++) {
      const a = (i / slabs) * TAU + Math.random() * 0.3;
      const d = radius * (0.45 + Math.random() * 0.5);
      this.anim(3.4, 600, (g, t) => {
        const hop = Math.sin(Math.min(1, t * 1.6) * Math.PI) * 12;
        const sx = x + Math.cos(a) * d;
        const sy = y + Math.sin(a) * d * 0.9 - hop;
        g.fillStyle(this.tint(PRESSURE.crack), (1 - t) * 0.9);
        g.fillRect(sx - 6, sy - 3, 12, 6);
        g.fillStyle(this.tint(PRESSURE.dust), (1 - t) * 0.9);
        g.fillRect(sx - 6, sy - 3, 12, 2);
      });
    }
  }

  /** Someone is driven into the floor: grit thrown up and the body jolted down. */
  groundImpact(x: number, y: number): void {
    this.anim(5.5, 420, (g, t) => {
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + (i - 3.5) * 0.32;
        const d = easeOut(t) * 34;
        g.fillStyle(this.tint(PRESSURE.dust), (1 - t));
        g.fillRect(x + Math.cos(a) * d - 2, y + 10 + Math.sin(a) * d - 2, 4, 4);
      }
    });
  }

  /** Knocked loose: the crater breaks up. */
  groundBreak(x: number, y: number): void {
    this.anim(3.4, 360, (g, t) => {
      g.lineStyle(3 * (1 - t), this.tint(PRESSURE.dust), 1 - t);
      g.strokeEllipse(x, y + 12, 50 + t * 30, 18 + t * 10);
    });
  }

  /** The orb leaving the gauntlet: a red pulse ring. */
  orbLaunch(x: number, y: number): void {
    this.anim(7, 300, (g, t) => {
      g.lineStyle(3 * (1 - t), this.tint(PRESSURE.pain), 1 - t);
      g.strokeCircle(x, y, 8 + t * 26);
    });
  }

  /** The orb finding someone: nerves snap tight round them. */
  orbHit(x: number, y: number): void {
    this.flashIn(x, y, 16, PRESSURE.painCore, PRESSURE.pain, 8);
    this.anim(8, 460, (g, t) => {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + t;
        const r = 34 * (1 - easeOut(t)) + 18;
        g.lineStyle(1.5, this.tint(PRESSURE.pain), (1 - t));
        g.lineBetween(x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a + 0.4) * (r - 8), y + Math.sin(a + 0.4) * (r - 8));
      }
    });
  }

  /** PainLock biting on a cast: a red jolt through the body. */
  painJolt(x: number, y: number): void {
    this.anim(8, 300, (g, t) => {
      g.lineStyle(2.4, this.tint(PRESSURE.pain), 1 - t);
      let px = x - 20;
      let py = y - 30;
      g.beginPath();
      g.moveTo(px, py);
      for (let i = 0; i < 5; i++) {
        px += 8 + Math.random() * 3;
        py += (i % 2 ? -1 : 1) * (8 + Math.random() * 6) + 3;
        g.lineTo(px, py);
      }
      g.strokePath();
      g.fillStyle(this.tint(PRESSURE.pain), (1 - t) * 0.25);
      g.fillCircle(x, y, 22 + t * 10);
    });
  }

  /** Release's final blast at the end of the jet. */
  ventBlast(x: number, y: number, ang: number, len: number, width: number): void {
    this.scene.cameras.main.shake(180, 0.004);
    const ex = x + Math.cos(ang) * len * 0.55;
    const ey = y + Math.sin(ang) * len * 0.55;
    this.flashIn(ex, ey, 30, PRESSURE.amberLit, PRESSURE.hot, 8);
    for (let i = 0; i < 12; i++) {
      const u = Math.random();
      const sx = x + Math.cos(ang) * len * u + (Math.random() - 0.5) * width * u;
      const sy = y + Math.sin(ang) * len * u + (Math.random() - 0.5) * width * u;
      const a = Math.random() * TAU;
      this.anim(7.5, 700, (g, t) => steamPuff(g, this.tint, sx + Math.cos(a) * 30 * easeOut(t), sy + Math.sin(a) * 30 * easeOut(t), 10 + t * 22, (1 - t) * 0.9));
    }
  }

  /** Sparks off the back of the robot at full charge: bright streaks thrown along `ang`. */
  sparks(x: number, y: number, ang: number, range: number): void {
    const n = 7;
    const streaks: { a: number; d: number; w: number }[] = [];
    for (let i = 0; i < n; i++) streaks.push({ a: ang + (Math.random() - 0.5) * 1.3, d: range * (0.45 + Math.random() * 0.55), w: Math.random() });
    this.anim(8.2, 260, (g, t) => {
      for (const s of streaks) {
        const r1 = 6 + easeOut(t) * s.d;
        const r0 = Math.max(4, r1 - 12 * (1 - t) - 3);
        // Sparks fall a little as they fly.
        const drop = t * t * 10 * s.w;
        g.lineStyle(2, this.tint(PRESSURE.spark), 1 - t);
        g.lineBetween(x + Math.cos(s.a) * r0, y + Math.sin(s.a) * r0 + drop, x + Math.cos(s.a) * r1, y + Math.sin(s.a) * r1 + drop);
        g.fillStyle(this.tint(PRESSURE.sparkLit), 1 - t);
        g.fillCircle(x + Math.cos(s.a) * r1, y + Math.sin(s.a) * r1 + drop, 1.6);
      }
      g.fillStyle(this.tint(PRESSURE.spark), (1 - t) * 0.5);
      g.fillCircle(x, y, 7 * (1 - t) + 2);
    });
  }

  /** A gas cloud going up: a white-hot heart, a fireball that eats the purple, a shock ring, soot. */
  gasExplosion(x: number, y: number, r: number): void {
    this.scene.cameras.main.shake(110, 0.0035);
    this.flashIn(x, y, r * 0.5, PRESSURE.sparkLit, PRESSURE.fire, 8);
    const tongues: { a: number; d: number; s: number }[] = [];
    for (let i = 0; i < 9; i++) tongues.push({ a: (i / 9) * TAU + Math.random() * 0.5, d: r * (0.45 + Math.random() * 0.5), s: 0.5 + Math.random() * 0.5 });
    this.anim(7.6, 520, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(PRESSURE.gas), (1 - t) * 0.4);
      g.fillCircle(x, y, r * (0.35 + 0.65 * e));
      g.fillStyle(this.tint(PRESSURE.fire), (1 - t) * 0.75);
      g.fillCircle(x, y, r * (0.25 + 0.5 * e));
      g.fillStyle(this.tint(PRESSURE.spark), (1 - t) * (1 - t) * 0.9);
      g.fillCircle(x, y, r * (0.15 + 0.3 * e));
      for (const k of tongues) {
        const d = k.d * e;
        g.fillStyle(this.tint(t < 0.45 ? PRESSURE.fire : PRESSURE.gasDark), (1 - t) * 0.8);
        g.fillCircle(x + Math.cos(k.a) * d, y + Math.sin(k.a) * d, r * 0.2 * k.s * (1 - t * 0.5));
      }
      g.lineStyle(4 * (1 - t) + 1, this.tint(PRESSURE.gasLit), (1 - t) * 0.9);
      g.strokeCircle(x, y, r * (0.3 + 0.75 * e));
    });
  }

  /** A fissure opening under the slam: the floor splits and the first breath of gas comes up. */
  fissureOpen(x: number, y: number): void {
    this.anim(3.4, 460, (g, t) => {
      g.lineStyle(4 * (1 - t) + 1, this.tint(PRESSURE.gas), (1 - t) * 0.9);
      g.strokeEllipse(x, y, 30 + easeOut(t) * 70, 14 + easeOut(t) * 32);
    });
    this.steamBurst(x, y, 34);
  }

  /** Gas settling into a puddle (F+): a ring that sinks to the floor. */
  puddleDrop(x: number, y: number, r: number): void {
    this.anim(3.4, 420, (g, t) => {
      g.lineStyle(2.5 * (1 - t) + 0.5, this.tint(PRESSURE.gasLit), (1 - t) * 0.8);
      g.strokeEllipse(x, y, r * 2 * (1.5 - 0.5 * easeOut(t)), r * 1.84 * (1.5 - 0.5 * easeOut(t)));
    });
  }

  /** A wisp of smog leaking out of a seam: small, slow, drifting off sideways and up. */
  leakPuff(x: number, y: number): void {
    const dx = (Math.random() - 0.5) * 22;
    const dy = -6 - Math.random() * 12;
    this.anim(5.2, 800, (g, t) => steamPuff(g, this.tint, x + dx * t, y + dy * t, 2.2 + t * 5.5, (1 - t) * 0.55));
  }

  /** Someone has breathed too much gas: a purple cough and a ring of dizzy marks. */
  panicStart(x: number, y: number): void {
    this.anim(8, 420, (g, t) => {
      g.lineStyle(2.4 * (1 - t), this.tint(PRESSURE.gasLit), 1 - t);
      g.strokeCircle(x, y, 16 + easeOut(t) * 22);
    });
    this.steamBurst(x, y - 8, 22);
  }

  /** A puff of gas off a body or out of the works. */
  steamBurst(x: number, y: number, r: number): void {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + Math.random() * 0.5;
      this.anim(7, 520, (g, t) => steamPuff(g, this.tint, x + Math.cos(a) * r * easeOut(t), y + Math.sin(a) * r * easeOut(t), 6 + t * 10, (1 - t) * 0.85));
    }
  }

  /** A puff off an exhaust stack, drifting up. */
  stackPuff(x: number, y: number, hot: boolean): void {
    const drift = (Math.random() - 0.5) * 14;
    this.anim(7.2, 900, (g, t) => {
      if (hot) {
        g.fillStyle(this.tint(PRESSURE.hot), (1 - t) * 0.25);
        g.fillCircle(x + drift * t, y - t * 34, 5 + t * 8);
      }
      steamPuff(g, this.tint, x + drift * t, y - t * 34, 3 + t * 9, (1 - t) * 0.75);
    });
  }

  /** Exceed going on: the boiler roars. */
  exceedOn(x: number, y: number): void {
    this.flashIn(x, y, 30, PRESSURE.hotLit, PRESSURE.hot, 7);
    this.anim(7, 700, (g, t) => {
      g.lineStyle(5 * (1 - t), this.tint(PRESSURE.hot), 1 - t);
      g.strokeCircle(x, y, 20 + easeOut(t) * 70);
    });
    this.steamBurst(x, y, 50);
  }

  /** Exceed running out: the boiler seizes and vents everything at once. */
  exceedCrash(x: number, y: number): void {
    this.steamBurst(x, y, 40);
    this.anim(7, 900, (g, t) => {
      g.lineStyle(2, this.tint(PRESSURE.steelLit), (1 - t) * 0.8);
      for (let i = 0; i < 3; i++) g.strokeCircle(x, y, 26 + i * 8 + Math.sin(t * 40 + i) * 2);
    });
  }

  /** R+ Compression Charge: the orb sinks into its own maker. */
  compress(x: number, y: number): void {
    this.anim(8, 520, (g, t) => {
      g.lineStyle(3 * (1 - t), this.tint(PRESSURE.pain), 1 - t);
      g.strokeCircle(x, y, 44 * (1 - easeOut(t)) + 18);
      g.lineStyle(2, this.tint(PRESSURE.amber), (1 - t));
      g.strokeCircle(x, y, 30 * (1 - easeOut(t)) + 14);
    });
  }
}

/** `heatColor` without a skin — FxBase routes everything through its own tint already. */
function heatColorRaw(p: number): number { return heatColor((c) => c, p); }

const PRESSURE_AVATAR: AvatarSpec = {
  hands: [
    { r: 9, color: PRESSURE.amber, alpha: 0.18 },
    { r: 6.8, color: PRESSURE.steelDark, alpha: 0.98 },
    { r: 4.8, color: PRESSURE.steel, alpha: 0.96 },
    { r: 1.7, color: PRESSURE.steelLit, alpha: 0.9, ox: -1.8, oy: -1.8 },
  ],
  // Lamp eyes: amber glass with a white-hot filament.
  eyeWhite: PRESSURE.amber,
  eyePupil: PRESSURE.amberLit,
  squash: { div: 16, x: 0.3, y: 0.2 },
};

/**
 * The gas-robot: the baked `elem-pressure` steel orb, a riveted seam round its middle that weeps
 * purple smog, and a barred glass belly-port with the smog rolling behind it; two smokestacks on
 * the crown that pour smog (harder the more pressure it holds); and the gauntlet — a huge armoured fist over the right hand with knuckle plates, a
 * piston down the wrist and a brass gauge on the back whose needle shows the live charge.
 *
 * Exceed paints the whole shell red-hot. Mastered (no mastery yet, the tell is ready): the
 * gauntlet is brass-plated and a third stack grows.
 */
export class PressureAvatar extends BaseAvatar {
  /** Live charge, 0–125: drives the gauge needle and the gauntlet's glow. */
  private charge = 0;
  /** 0..1 Exceed heat, eased. */
  private heat = 0;
  private heatTarget = 0;
  /** 0..1 a punch's knuckle flash. */
  private knuckle = 0;
  /** Mirrors BaseAvatar's private punch-hand alternation, so the gauntlet is always the hand that punches. */
  private punchSide = 1;
  private puffAt = 0;
  private leakAt = 0;
  private readonly fx: PressureFx;

  constructor(scene: Phaser.Scene, tint: ColorFn, depth = 6) {
    super(scene, tint, depth, PRESSURE_AVATAR);
    this.fx = new PressureFx(scene, tint);
  }

  setCharge(p: number): void { this.charge = Math.max(0, p); }
  setExceed(on: boolean): void { this.heatTarget = on ? 1 : 0; }

  /** A gauntlet punch along `angle`. Always thrown with the gauntlet hand. */
  punch(angle: number): void {
    if (this.punchSide !== 1) { this.play('punch', angle); this.punchSide = -this.punchSide; }
    this.play('punch', angle);
    this.punchSide = -this.punchSide;
    this.knuckle = 1;
  }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.heat += (this.heatTarget - this.heat) * Math.min(1, delta / 300);
    this.knuckle = Math.max(0, this.knuckle - delta / 380);
    this.puffAt -= delta;
    if (this.puffAt <= 0 && alpha > 0.05) {
      const busy = Math.max(this.charge / 100, this.heat);
      this.puffAt = 700 - busy * 520 + Math.random() * 200;
      const side = Math.random() < 0.5 ? -1 : 1;
      this.fx.stackPuff(x + side * 8, y - 30, this.heat > 0.3);
    }
    // Smog leaks out everywhere: off the seam, round the belly-port, out of the gauntlet's cuff.
    this.leakAt -= delta;
    if (this.leakAt <= 0 && alpha > 0.05) {
      this.leakAt = 150 + Math.random() * 170 - Math.max(this.charge / 100, this.heat) * 70;
      const a = Math.random() * TAU;
      if (Math.random() < 0.3) this.fx.leakPuff(this.armX[1], this.armY[1]);
      else this.fx.leakPuff(x + Math.cos(a) * 17, y + 2 + Math.sin(a) * 15);
    }
    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 13 : 9);
      glow.setFillStyle(this.tint(on ? PRESSURE.brassLit : PRESSURE.amber), on ? 0.4 : 0.18);
    });
  }

  /** The weeping seam and the smog-filled belly-port, and the red-hot wash under Exceed. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    if (this.heat > 0.02) {
      g.fillStyle(this.tint(PRESSURE.hot), alpha * 0.45 * this.heat * (0.85 + 0.15 * Math.sin(this.t * 9)));
      g.fillCircle(x, y, 19);
    }
    // The seam round the middle, with rivets on it.
    g.lineStyle(1.6, this.tint(PRESSURE.steelDark), alpha * 0.9);
    g.beginPath();
    g.arc(x, y + 2, 19, 0.15, Math.PI - 0.15);
    g.strokePath();
    g.fillStyle(this.tint(PRESSURE.rivet), alpha);
    for (let i = 0; i < 5; i++) {
      const ang = 0.35 + i * ((Math.PI - 0.7) / 4);
      g.fillCircle(x + Math.cos(ang) * 17.5, y + 2 + Math.sin(ang) * 17.5 - 4, 1.3);
    }
    // Smog weeping out along the seam, between the rivets.
    for (let i = 0; i < 4; i++) {
      const ang = 0.55 + i * ((Math.PI - 1.1) / 3);
      const breathe = 0.5 + 0.5 * Math.sin(this.t * 2.6 + i * 1.9);
      g.fillStyle(this.tint(PRESSURE.gas), alpha * (0.25 + 0.3 * breathe));
      g.fillCircle(x + Math.cos(ang) * 18.5, y + 2 + Math.sin(ang) * 18.5 - 3, 2 + 1.6 * breathe);
    }
    // The belly-port, nudged toward facing: barred glass with the smog rolling behind it.
    const lx = Math.cos(this.facing) * 2;
    const ly = Math.sin(this.facing) * 1.5;
    const wx = x - 8 + lx;
    const wy = y + 4 + ly;
    g.fillStyle(this.tint(PRESSURE.ink), alpha * 0.95);
    g.fillRoundedRect(wx - 1, wy - 1, 18, 9, 2.5);
    g.fillStyle(this.tint(PRESSURE.gasDark), alpha);
    g.fillRoundedRect(wx, wy, 16, 7, 2);
    for (let i = 0; i < 3; i++) {
      const u = (this.t * 0.45 + i / 3) % 1;
      const bob = Math.sin(this.t * 3 + i * 2.2) * 1.2;
      g.fillStyle(this.tint(i === 1 ? PRESSURE.gasLit : PRESSURE.gas), alpha * (i === 1 ? 0.55 : 0.85) * Math.sin(u * Math.PI));
      g.fillCircle(wx + 2.5 + u * 11, wy + 3.5 + bob, 2.4);
    }
    g.lineStyle(1, this.tint(this.heat > 0.3 ? PRESSURE.hot : PRESSURE.steel), alpha);
    for (let i = 1; i < 4; i++) g.lineBetween(wx + i * 4, wy, wx + i * 4, wy + 7);
    g.lineStyle(1, this.tint(PRESSURE.steelLit), alpha * 0.7);
    g.strokeRoundedRect(wx, wy, 16, 7, 2);
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    g.fillStyle(this.tint(PRESSURE.ink), a * 0.4);
    g.fillEllipse(x, y + 18, 48, 14);
    // The haze the robot stands in.
    g.fillStyle(this.tint(PRESSURE.gas), a * (0.1 + 0.03 * Math.sin(this.t * 1.7)));
    g.fillCircle(x, y + 2, 31);
    const hot = Math.max(this.heat, Math.min(1, this.charge / 100) * 0.6);
    if (hot > 0.05) {
      g.fillStyle(this.tint(PRESSURE.hot), a * 0.35 * hot);
      g.fillCircle(x, y, 30 + 6 * hot);
    }
  }

  /** The smokestacks, then the gauntlet over the right hand. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const stacks = this.mastered ? [-9, 0, 9] : [-8, 8];
    for (const sx of stacks) {
      const h = sx === 0 ? 13 : 10;
      g.fillStyle(this.tint(PRESSURE.steelDark), alpha);
      g.fillRect(x + sx - 3, y - 17 - h, 6, h);
      g.fillStyle(this.tint(PRESSURE.steel), alpha);
      g.fillRect(x + sx - 4, y - 17 - h - 2, 8, 3);
      // A soot band, and the smog sitting in the mouth of the stack.
      g.fillStyle(this.tint(PRESSURE.ink), alpha * 0.8);
      g.fillRect(x + sx - 3, y - 17 - h + 3, 6, 1.5);
      g.fillStyle(this.tint(this.heat > 0.3 ? PRESSURE.hot : PRESSURE.gas), alpha);
      g.fillRect(x + sx - 2, y - 17 - h - 2, 4, 1.5);
    }
    this.drawGauntlet(g, alpha);
  }

  private drawGauntlet(g: Phaser.GameObjects.Graphics, alpha: number): void {
    const hx = this.armX[1];
    const hy = this.armY[1];
    const ang = this.hold ? this.holdAngle : this.facing;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const px = -sin;
    const py = cos;
    const brass = this.mastered;
    const plate = brass ? PRESSURE.brass : PRESSURE.steel;
    const plateLit = brass ? PRESSURE.brassLit : PRESSURE.steelLit;
    const charge01 = Math.min(1.25, this.charge / 100);
    // Pt: hand-local (forward, side) → world.
    const P = (f: number, s: number): Phaser.Math.Vector2 => new Phaser.Math.Vector2(hx + cos * f + px * s, hy + sin * f + py * s);
    const quad = (pts: Phaser.Math.Vector2[], color: number, al: number): void => {
      g.fillStyle(this.tint(color), al);
      g.fillPoints(pts, true);
    };
    // Heat glow round the fist while charging.
    if (charge01 > 0.02) {
      g.fillStyle(heatColor(this.tint, this.charge), alpha * 0.28 * charge01);
      g.fillCircle(hx + cos * 4, hy + sin * 4, 18 + 6 * charge01);
    }
    // Cuff and piston down the wrist.
    quad([P(-16, -9), P(-4, -10), P(-4, 10), P(-16, 9)], PRESSURE.steelDark, alpha);
    const stroke = 3 + 3 * Math.sin(this.t * (6 + 10 * charge01));
    g.lineStyle(2.2, this.tint(PRESSURE.steelLit), alpha);
    const p0 = P(-15, 0);
    const p1 = P(-6 + stroke * 0.3, 0);
    g.lineBetween(p0.x, p0.y, p1.x, p1.y);
    // The fist: a big rounded block.
    quad([P(-6, -12), P(9, -13), P(15, -9), P(16, 9), P(9, 13), P(-6, 12)], PRESSURE.ink, alpha * 0.9);
    quad([P(-5, -11), P(8, -12), P(13.5, -8), P(14.5, 8), P(8, 11.5), P(-5, 11)], plate, alpha);
    // Knuckle plates.
    for (let i = 0; i < 4; i++) {
      const s = -9 + i * 6;
      const glow = this.knuckle > 0 ? this.knuckle : 0;
      quad([P(10, s - 2.4), P(15.5, s - 2), P(15.5, s + 2), P(10, s + 2.4)], glow > 0.1 ? PRESSURE.amberLit : plateLit, alpha * (0.85 + 0.15 * glow));
    }
    // The brass gauge on the back of the hand, its needle on the live charge.
    const gc = P(1, 0);
    g.fillStyle(this.tint(PRESSURE.brass), alpha);
    g.fillCircle(gc.x, gc.y, 5.6);
    g.fillStyle(this.tint(PRESSURE.amberLit), alpha);
    g.fillCircle(gc.x, gc.y, 4.2);
    const na = -Math.PI * 0.8 + Math.PI * 1.6 * Math.min(1.25, charge01) / 1.25;
    g.lineStyle(1.3, this.tint(charge01 >= 1 ? PRESSURE.hot : PRESSURE.ink), alpha);
    g.lineBetween(gc.x, gc.y, gc.x + Math.cos(na + ang) * 3.6, gc.y + Math.sin(na + ang) * 3.6);
    // Outline.
    g.lineStyle(1.2, this.tint(PRESSURE.ink), alpha * 0.8);
    g.strokePoints([P(-5, -11), P(8, -12), P(13.5, -8), P(14.5, 8), P(8, 11.5), P(-5, 11)], true);
  }
}
