import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeOut } from './ElementVisuals';

/**
 * Pressure's look: a riveted steel boiler-robot with amber lamp eyes, two exhaust stacks on its
 * crown, and one giant brass-and-steel gauntlet on its right hand with a pressure gauge on the
 * back of it. Pressure reads everywhere as heat — steel, then amber, then red — and as steam.
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
  steam: 0xeef1f3,
  steamShade: 0xaeb7bf,
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

/** A soft round puff of steam: a shaded body with a lit cap. */
export function steamPuff(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, alpha: number): void {
  g.fillStyle(tint(PRESSURE.steamShade), alpha * 0.55);
  g.fillCircle(x + r * 0.15, y + r * 0.2, r);
  g.fillStyle(tint(PRESSURE.steam), alpha * 0.8);
  g.fillCircle(x - r * 0.12, y - r * 0.1, r * 0.82);
  g.fillStyle(0xffffff, alpha * 0.35);
  g.fillCircle(x - r * 0.35, y - r * 0.35, r * 0.35);
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

/** The Release jet: a widening cone of steam along `ang`, puffs rolling down it. */
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

  /** Depressurize: a puff of steam off a hit target. */
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
 * The boiler-robot: the baked `elem-pressure` steel orb, a riveted seam round its middle and a
 * grille mouth; two exhaust stacks on the crown that puff steam (harder the more pressure it
 * holds); and the gauntlet — a huge armoured fist over the right hand with knuckle plates, a
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
    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 13 : 9);
      glow.setFillStyle(this.tint(on ? PRESSURE.brassLit : PRESSURE.amber), on ? 0.4 : 0.18);
    });
  }

  /** The seam and the grille, and the red-hot wash under Exceed. */
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
    // The grille mouth, nudged toward facing.
    const lx = Math.cos(this.facing) * 2;
    const ly = Math.sin(this.facing) * 1.5;
    g.fillStyle(this.tint(PRESSURE.ink), alpha * 0.9);
    g.fillRoundedRect(x - 6 + lx, y + 5 + ly, 12, 5, 1.5);
    g.lineStyle(1, this.tint(this.heat > 0.3 ? PRESSURE.hot : PRESSURE.steel), alpha);
    for (let i = 1; i < 4; i++) g.lineBetween(x - 6 + lx + i * 3, y + 5 + ly, x - 6 + lx + i * 3, y + 10 + ly);
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    g.fillStyle(this.tint(PRESSURE.ink), a * 0.4);
    g.fillEllipse(x, y + 18, 48, 14);
    const hot = Math.max(this.heat, Math.min(1, this.charge / 100) * 0.6);
    if (hot > 0.05) {
      g.fillStyle(this.tint(PRESSURE.hot), a * 0.35 * hot);
      g.fillCircle(x, y, 30 + 6 * hot);
    }
  }

  /** The exhaust stacks, then the gauntlet over the right hand. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const stacks = this.mastered ? [-9, 0, 9] : [-8, 8];
    for (const sx of stacks) {
      const h = sx === 0 ? 13 : 10;
      g.fillStyle(this.tint(PRESSURE.steelDark), alpha);
      g.fillRect(x + sx - 3, y - 17 - h, 6, h);
      g.fillStyle(this.tint(PRESSURE.steel), alpha);
      g.fillRect(x + sx - 4, y - 17 - h - 2, 8, 3);
      g.fillStyle(this.tint(this.heat > 0.3 ? PRESSURE.hot : PRESSURE.ink), alpha);
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
