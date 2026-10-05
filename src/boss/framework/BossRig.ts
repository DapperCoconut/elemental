import Phaser from 'phaser';
import { BossPalette } from './BossToolkit';

/**
 * The Sovereign character rig.
 *
 * Every world boss used to hand-draw its own silhouette — robes, trapezoids,
 * hooded triangles — and the result read as scenery rather than as a fighter
 * standing across from you. This is the player's own rig scaled up to boss
 * size: a round body, two (or four) ball hands that trail it on springs, eyes
 * that track you and narrow when it winds up. Everything that makes one
 * Sovereign distinct from another is data on a `BossLook` — crest, surface,
 * aura, hand shape — so a boss file no longer carries a hundred lines of
 * bespoke drawing it has to keep in sync with the fight.
 *
 * The rig paints in immediate mode into the kit's one body Graphics rather
 * than owning GameObjects like `BaseAvatar` does: the boss body is already a
 * per-frame repaint driven by the phase machine, and a rig that owned objects
 * would need tearing down and rebuilding at every phase change.
 */

// ── Look vocabulary ──────────────────────────────────────────────────

/** What sits above the head. The single strongest read on which Sovereign this is. */
export type BossCrest =
  | 'horns' | 'crown' | 'spires' | 'halo' | 'antennae' | 'plume'
  | 'mane' | 'blades' | 'orbs' | 'veil' | 'tendrils' | 'stack' | 'none';

/** The surface treatment on the round body. */
export type BossPattern =
  | 'cracks' | 'facets' | 'runes' | 'scales' | 'plates' | 'swirl'
  | 'rings' | 'static' | 'weave' | 'drip' | 'gears' | 'grid' | 'smooth';

/** What hangs in the air around the body. */
export type BossAura =
  | 'flame' | 'frost' | 'smoke' | 'sparks' | 'petals' | 'bubbles'
  | 'dust' | 'glitch' | 'chains' | 'coins' | 'leaves' | 'none';

/** The shape of each floating hand. */
export type BossHands = 'ball' | 'claw' | 'gauntlet' | 'wisp' | 'blade' | 'orb';

/** A mouth, or the absence of one. */
export type BossMouth = 'none' | 'grin' | 'grate' | 'maw' | 'line' | 'stitch';

export interface BossLook {
  crest: BossCrest;
  pattern: BossPattern;
  aura?: BossAura;
  hands?: BossHands;
  /** Body radius. Default 34 — a player is 22. */
  torsoR?: number;
  /** Two hands, or four for the Sovereigns that need to look wrong. */
  arms?: 2 | 4;
  eyes?: 1 | 2 | 3;
  /** Overrides the palette's lit colour for the eyes. */
  eyeColor?: number;
  mouth?: BossMouth;
}

// ── Poses ────────────────────────────────────────────────────────────

/** One-shot arm gestures, fired as a move is released. */
export type BossGesture = 'punch' | 'slam' | 'raise' | 'sweep' | 'clap' | 'flex' | 'point' | 'recoil';

/** Sustained poses, held for as long as something is being channelled. */
export type BossHold = 'spray' | 'charge' | 'draw' | 'brace' | 'reach' | 'conduct' | null;

const GESTURE_MS: Record<BossGesture, number> = {
  punch: 340, slam: 520, raise: 900, sweep: 520, clap: 420, flex: 560, point: 600, recoil: 360,
};

const HAND_STIFFNESS = 0.24;

const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);
const easeIn = (t: number): number => t * t;

interface Pose { ang: number; dist: number; scale: number }

/** Everything the rig needs to paint one frame. */
export interface BossRigFrame {
  x: number;
  y: number;
  t: number;
  facing: number;
  look: BossLook;
  palette: BossPalette;
  /** 0–1 within the phase pool. Drives how battered the surface reads. */
  hpRatio: number;
  enraged: boolean;
  hurt: boolean;
  /** 0–1, rising through a wind-up and falling as the move lands. */
  castGlow: number;
  /** Sovereigns that are down to their last phase stand taller. */
  phaseIdx: number;
}

// ── Colour helpers ───────────────────────────────────────────────────

export const mixColor = (a: number, b: number, t: number): number => {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (Math.round(ar + (br - ar) * t) << 16)
    | (Math.round(ag + (bg - ag) * t) << 8)
    | Math.round(ab + (bb - ab) * t);
};

/** Positive lightens toward white, negative darkens toward black. */
export const shade = (c: number, amt: number): number =>
  amt >= 0 ? mixColor(c, 0xffffff, amt) : mixColor(c, 0x000000, -amt);

// ── The rig ──────────────────────────────────────────────────────────

export class BossRig {
  private hx = [0, 0, 0, 0];
  private hy = [0, 0, 0, 0];
  private hs = [1, 1, 1, 1];
  private placed = false;

  private t = 0;
  private orbit = 0;

  private blinkIn = 1800;
  private blinkFor = 0;

  private gesture: BossGesture | null = null;
  private gestureT = 0;
  private gestureDur = 0;
  private gestureAngle = 0;
  private gestureSide = 1;
  private nextSide: 1 | -1 = 1;

  private hold: BossHold = null;
  private holdAngle = 0;

  /** Body velocity, for lean and hand drag. */
  private vx = 0;
  private vy = 0;

  private facing = 0;
  private armCount = 2;
  private idleDist = 52;

  /** Drop every transient pose — a phase change, or a fresh fight. */
  reset(x: number, y: number): void {
    this.placed = false;
    this.gesture = null;
    this.hold = null;
    this.vx = this.vy = 0;
    for (let i = 0; i < 4; i++) { this.hx[i] = x; this.hy[i] = y; this.hs[i] = 1; }
  }

  play(gesture: BossGesture, angle?: number, duration?: number): void {
    this.gesture = gesture;
    this.gestureT = 0;
    this.gestureAngle = angle ?? this.facing;
    this.gestureDur = duration ?? GESTURE_MS[gesture];
    if (gesture === 'punch' || gesture === 'point') {
      this.gestureSide = this.nextSide;
      this.nextSide = -this.nextSide as 1 | -1;
    }
  }

  setHold(hold: BossHold, angle?: number): void {
    this.hold = hold;
    if (angle !== undefined) this.holdAngle = angle;
  }

  /** World position of one hand — for muzzle flashes and beam origins. */
  handAt(i: number): { x: number; y: number } {
    return { x: this.hx[i] ?? 0, y: this.hy[i] ?? 0 };
  }

  /** The hand that threw the last gesture. */
  castHand(): { x: number; y: number } {
    return this.handAt(this.gestureSide > 0 ? 1 : 0);
  }

  update(delta: number, x: number, y: number, facing: number, look: BossLook, vx: number, vy: number): void {
    const dt = delta / 1000;
    this.t += dt;
    this.facing = facing;
    this.vx = vx;
    this.vy = vy;
    this.armCount = look.arms ?? 2;
    this.idleDist = (look.torsoR ?? 34) * 1.55;

    if (this.gesture) {
      this.gestureT += delta;
      if (this.gestureT >= this.gestureDur) this.gesture = null;
    }
    this.orbit += dt * (this.hold === 'conduct' ? 1.9 : 0.32);

    this.blinkIn -= delta;
    if (this.blinkIn <= 0) { this.blinkFor = 120; this.blinkIn = 2400 + Math.random() * 3600; }
    if (this.blinkFor > 0) this.blinkFor -= delta;

    if (!this.placed) {
      this.placed = true;
      for (let i = 0; i < 4; i++) { this.hx[i] = x; this.hy[i] = y; }
    }

    const k = Math.min(1, HAND_STIFFNESS * (delta / 16.67));
    for (let i = 0; i < this.armCount; i++) {
      const pose = this.poseFor(i);
      const tx = x + Math.cos(pose.ang) * pose.dist;
      const ty = y + Math.sin(pose.ang) * pose.dist * 0.9;
      this.hx[i] += (tx - this.hx[i]) * k;
      this.hy[i] += (ty - this.hy[i]) * k;
      this.hs[i] += (pose.scale - this.hs[i]) * k;
    }
  }

  // ── Pose maths ─────────────────────────────────────────────────────

  /**
   * Hands are indexed left-then-right; a four-armed Sovereign gets a second
   * pair tucked in tighter and half a beat behind the first.
   */
  private poseFor(i: number): Pose {
    const pair = i >> 1;
    const side = i % 2 === 0 ? -1 : 1;
    const tuck = pair === 0 ? 1 : 0.66;
    const spread = pair === 0 ? 1.2 : 2.05;

    const idleAng = this.facing + this.orbit * (pair === 0 ? 1 : -1)
      + side * spread + Math.sin(this.t * 2.1 + i) * 0.08;
    const idle: Pose = {
      ang: idleAng,
      dist: (this.idleDist + Math.sin(this.t * 2.9 + i * 1.7) * 4) * tuck,
      scale: 1,
    };

    if (this.hold) {
      const held = this.holdPose(this.hold, side, i, idle, tuck);
      if (held) return held;
    }
    if (!this.gesture) return idle;

    const t = Math.min(1, this.gestureT / Math.max(1, this.gestureDur));
    const a = this.gestureAngle;
    let target = idle;
    let blend = 0;

    switch (this.gesture) {
      case 'punch': {
        const active = side === this.gestureSide && pair === 0;
        blend = t < 0.2 ? easeOut(t / 0.2) : 1 - easeIn((t - 0.2) / 0.8);
        target = active
          ? { ang: a, dist: this.idleDist * 1.9, scale: 1.25 }
          : { ang: a + side * 2.1, dist: this.idleDist * 0.6, scale: 0.9 };
        break;
      }
      case 'point': {
        const active = side === this.gestureSide && pair === 0;
        blend = t < 0.25 ? easeOut(t / 0.25) : t < 0.7 ? 1 : 1 - easeIn((t - 0.7) / 0.3);
        target = active
          ? { ang: a, dist: this.idleDist * 2.1, scale: 0.8 }
          : { ang: a - side * 1.9, dist: this.idleDist * 0.55, scale: 0.95 };
        break;
      }
      case 'slam': {
        // Overhead, then driven straight down at the aim.
        if (t < 0.42) {
          blend = easeOut(t / 0.42);
          target = { ang: -Math.PI / 2 + side * 0.42, dist: this.idleDist * 1.5, scale: 1.2 };
        } else {
          blend = 1 - easeIn((t - 0.42) / 0.58);
          target = { ang: a + side * 0.3, dist: this.idleDist * 1.7, scale: 1.35 };
        }
        break;
      }
      case 'raise': {
        blend = t < 0.2 ? easeOut(t / 0.2) : t < 0.78 ? 1 : 1 - easeIn((t - 0.78) / 0.22);
        target = {
          ang: -Math.PI / 2 + side * 0.5,
          dist: this.idleDist * (1.75 + Math.sin(this.t * 12) * 0.05),
          scale: 1.3,
        };
        break;
      }
      case 'sweep': {
        blend = t < 0.18 ? easeOut(t / 0.18) : 1 - easeIn((t - 0.18) / 0.82);
        const arc = (t - 0.5) * 2.6;
        target = { ang: a + arc * side * 0.5 + side * 0.9, dist: this.idleDist * 1.8, scale: 1.15 };
        break;
      }
      case 'clap': {
        blend = t < 0.45 ? easeOut(t / 0.45) : 1 - easeIn((t - 0.45) / 0.55);
        target = t < 0.45
          ? { ang: a + side * 1.5, dist: this.idleDist * 1.8, scale: 1.1 }
          : { ang: a + side * 0.12, dist: this.idleDist * 0.75, scale: 1.3 };
        break;
      }
      case 'flex': {
        blend = Math.sin(t * Math.PI);
        target = { ang: this.facing + side * (Math.PI / 2), dist: this.idleDist * 1.55, scale: 1.4 };
        break;
      }
      case 'recoil': {
        blend = t < 0.15 ? easeOut(t / 0.15) : 1 - easeIn((t - 0.15) / 0.85);
        target = { ang: a + Math.PI + side * 0.6, dist: this.idleDist * 1.35, scale: 0.85 };
        break;
      }
    }

    return {
      ang: Phaser.Math.Angle.RotateTo(idle.ang, target.ang, Math.abs(Phaser.Math.Angle.Wrap(target.ang - idle.ang)) * blend),
      dist: idle.dist + (target.dist - idle.dist) * blend,
      scale: idle.scale + (target.scale - idle.scale) * blend,
    };
  }

  private holdPose(hold: BossHold, side: number, i: number, idle: Pose, tuck: number): Pose | null {
    const a = this.holdAngle;
    const jitter = Math.sin(this.t * 26 + i * 2.3) * 0.05;
    switch (hold) {
      case 'spray':
        return { ang: a + side * 0.2 + jitter, dist: this.idleDist * 1.7 * tuck, scale: 1.1 };
      case 'charge': {
        // Both hands orbit a point compressing in front of the chest.
        const squeeze = 0.55 + Math.sin(this.t * 4.5) * 0.08;
        return { ang: a + this.orbit * 2.4 + side * 1.1, dist: this.idleDist * squeeze * tuck, scale: 1.15 };
      }
      case 'draw':
        return { ang: a + side * 1.35, dist: this.idleDist * 1.9 * tuck, scale: 1.05 };
      case 'brace':
        return { ang: a + Math.PI * 0.9 * side + jitter * 2, dist: this.idleDist * 0.7 * tuck, scale: 1.25 };
      case 'reach':
        return side > 0
          ? { ang: a, dist: this.idleDist * 2.3 * tuck, scale: 0.95 }
          : { ang: a + Math.PI * 0.8, dist: this.idleDist * 0.55 * tuck, scale: 1.05 };
      case 'conduct':
        return {
          ang: a + side * 1.25 + Math.sin(this.t * 7 + side) * 0.55,
          dist: this.idleDist * (1.4 + Math.sin(this.t * 9 + i) * 0.22) * tuck,
          scale: 1.1,
        };
      default:
        return idle;
    }
  }

  // ── Painting ───────────────────────────────────────────────────────

  draw(g: Phaser.GameObjects.Graphics, f: BossRigFrame): void {
    const look = f.look;
    const R = look.torsoR ?? 34;
    const P = f.palette;
    const speed = Math.hypot(this.vx, this.vy);
    // Leaning into the run, and a little squash at speed — the same motion
    // smear the player's own rig has.
    const lean = Phaser.Math.Clamp(this.vx / 260, -1, 1) * 5;
    const bob = Math.sin(this.t * 3.1) * 2 + Math.sin(this.t * 1.3) * 1.4;
    const sq = Math.min(1, speed / 320);
    const bx = f.x + lean;
    const by = f.y + bob;

    this.drawShadow(g, f.x, f.y, R, speed);
    this.drawAura(g, bx, by, R, f);
    this.drawTorso(g, bx, by, R, sq, f);
    this.drawPattern(g, bx, by, R, f);
    this.drawCrest(g, bx, by - R, R, f);
    this.drawFace(g, bx, by, R, f);
    for (let i = 0; i < this.armCount; i++) this.drawHand(g, i, R, f);

    if (f.hurt) {
      g.fillStyle(0xffffff, 0.3);
      g.fillCircle(bx, by, R * 1.25);
    }
    if (f.castGlow > 0.02) {
      g.fillStyle(shade(P.lit, 0.3), f.castGlow * 0.2);
      g.fillCircle(bx, by, R * (1.3 + f.castGlow * 0.35));
    }
  }

  private drawShadow(g: Phaser.GameObjects.Graphics, x: number, y: number, R: number, speed: number): void {
    // Kept well inside the body's own width: a shadow wider than the fighter
    // reads as a halo behind it rather than as ground contact.
    const squish = 1 - Math.min(0.25, speed / 900);
    g.fillStyle(0x000000, 0.42);
    g.fillEllipse(x, y + R + 12, R * 1.5 * squish, R * 0.38);
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(x, y + R + 12, R * 1.95 * squish, R * 0.52);
  }

  // ── Aura ───────────────────────────────────────────────────────────

  private drawAura(g: Phaser.GameObjects.Graphics, x: number, y: number, R: number, f: BossRigFrame): void {
    const kind = f.look.aura ?? 'none';
    if (kind === 'none') return;
    const P = f.palette;
    const t = f.t;
    const heat = (f.enraged ? 1.35 : 1) * (0.8 + f.castGlow * 0.6);

    switch (kind) {
      case 'flame': {
        for (let i = 0; i < 12; i++) {
          const a = (Math.PI * 2 * i) / 12 + Math.sin(t / 900 + i) * 0.14;
          const len = (12 + ((i * 7) % 11) + Math.sin(t / 110 + i * 1.7) * 6) * heat;
          const bxx = x + Math.cos(a) * (R - 2);
          const byy = y + Math.sin(a) * (R - 2);
          g.fillStyle(i % 2 === 0 ? P.main : P.accent, 0.7);
          g.fillTriangle(
            bxx - Math.sin(a) * 6, byy + Math.cos(a) * 6,
            bxx + Math.sin(a) * 6, byy - Math.cos(a) * 6,
            bxx + Math.cos(a) * len, byy + Math.sin(a) * len,
          );
        }
        break;
      }
      case 'frost': {
        for (let i = 0; i < 9; i++) {
          const a = (Math.PI * 2 * i) / 9 + t / 2600;
          const len = (14 + ((i * 5) % 9)) * heat;
          const sx = x + Math.cos(a) * (R + 3);
          const sy = y + Math.sin(a) * (R + 3);
          g.fillStyle(P.lit, 0.55);
          g.fillTriangle(
            sx - Math.sin(a) * 4, sy + Math.cos(a) * 4,
            sx + Math.sin(a) * 4, sy - Math.cos(a) * 4,
            sx + Math.cos(a) * len, sy + Math.sin(a) * len,
          );
        }
        break;
      }
      case 'smoke': {
        for (let i = 0; i < 8; i++) {
          const seed = i * 811;
          const ph = ((t + seed) % 2200) / 2200;
          const a = (Math.PI * 2 * i) / 8 + ph * 1.1;
          const r = R + 6 + ph * 22;
          g.fillStyle(P.dark, (1 - ph) * 0.4 * heat);
          g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, 7 + ph * 10);
        }
        break;
      }
      case 'sparks': {
        for (let i = 0; i < 10; i++) {
          const a = (Math.PI * 2 * i) / 10 + t / 380;
          const r = R + 9 + Math.sin(t / 130 + i * 2.2) * 7;
          const sx = x + Math.cos(a) * r;
          const sy = y + Math.sin(a) * r;
          g.lineStyle(2, P.accent, 0.55 + Math.sin(t / 90 + i) * 0.35);
          g.lineBetween(sx, sy, sx + Math.cos(a + 1.2) * 8, sy + Math.sin(a + 1.2) * 8);
        }
        break;
      }
      case 'petals': {
        for (let i = 0; i < 7; i++) {
          const a = (Math.PI * 2 * i) / 7 + t / 1400;
          const r = R + 13 + Math.sin(t / 700 + i) * 6;
          g.fillStyle(i % 2 === 0 ? P.lit : P.accent, 0.65);
          g.fillEllipse(x + Math.cos(a) * r, y + Math.sin(a) * r, 11, 6);
        }
        break;
      }
      case 'bubbles': {
        for (let i = 0; i < 9; i++) {
          const seed = i * 523;
          const ph = ((t * 0.9 + seed) % 1800) / 1800;
          const bxx = x + Math.sin(seed + t / 600) * (R + 10);
          const byy = y + R - ph * (R * 2.4);
          g.lineStyle(1.5, P.lit, (1 - ph) * 0.6);
          g.strokeCircle(bxx, byy, 3 + ((i * 3) % 5));
        }
        break;
      }
      case 'dust': {
        for (let i = 0; i < 14; i++) {
          const a = (Math.PI * 2 * i) / 14 + t / 900 * (i % 2 === 0 ? 1 : -1);
          const r = R + 8 + ((i * 11) % 17);
          g.fillStyle(P.main, 0.4);
          g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.85, 1.8);
        }
        break;
      }
      case 'glitch': {
        for (let i = 0; i < 6; i++) {
          if ((Math.floor(t / 90) + i) % 3 !== 0) continue;
          const off = ((i * 37) % 60) - 30;
          g.fillStyle(i % 2 === 0 ? P.accent : P.lit, 0.42);
          g.fillRect(x - R - 8, y + off * 0.8, R * 2 + 16, 3.5);
        }
        break;
      }
      case 'chains': {
        for (let i = 0; i < 10; i++) {
          const a = (Math.PI * 2 * i) / 10 + t / 1900;
          const r = R + 15;
          g.lineStyle(2.4, P.dark, 0.8);
          g.strokeCircle(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.86, 4.4);
          g.lineStyle(1, P.lit, 0.45);
          g.strokeCircle(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.86, 4.4);
        }
        break;
      }
      case 'coins': {
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI * 2 * i) / 6 + t / 1100;
          const r = R + 16;
          const w = Math.abs(Math.cos(a + t / 400)) * 7 + 2;
          g.fillStyle(P.accent, 0.85);
          g.fillEllipse(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, w, 8);
        }
        break;
      }
      case 'leaves': {
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI * 2 * i) / 8 - t / 1600;
          const r = R + 12 + Math.sin(t / 500 + i * 1.4) * 7;
          const lx = x + Math.cos(a) * r;
          const ly = y + Math.sin(a) * r * 0.9;
          g.fillStyle(i % 3 === 0 ? P.accent : P.main, 0.7);
          g.fillTriangle(lx - 6, ly, lx + 2, ly - 5, lx + 7, ly + 3);
        }
        break;
      }
    }
  }

  // ── Body ───────────────────────────────────────────────────────────

  private drawTorso(
    g: Phaser.GameObjects.Graphics, x: number, y: number, R: number,
    sq: number, f: BossRigFrame,
  ): void {
    const P = f.palette;
    const rx = R * (1 + sq * 0.1);
    const ry = R * (1 - sq * 0.08);

    // Outer shell, then the lit body, then a floor-side shade: three discs is
    // what reads as round rather than as a flat coin.
    g.fillStyle(shade(P.dark, -0.35), 1);
    g.fillEllipse(x, y, rx * 2 + 7, ry * 2 + 7);
    g.fillStyle(P.dark, 1);
    g.fillEllipse(x, y, rx * 2 + 2, ry * 2 + 2);
    g.fillStyle(mixColor(P.main, P.dark, 1 - f.hpRatio * 0.55), 1);
    g.fillEllipse(x, y, rx * 2 - 5, ry * 2 - 5);

    // Rim light along the top-left, shadow along the bottom-right.
    g.lineStyle(3.5, shade(P.lit, 0.15), 0.55);
    g.beginPath();
    g.arc(x, y, R - 4, Math.PI * 1.05, Math.PI * 1.85, false);
    g.strokePath();
    g.fillStyle(0x000000, 0.22);
    g.beginPath();
    g.arc(x, y, R - 3, Math.PI * 0.08, Math.PI * 0.82, false);
    g.arc(x, y, R * 0.55, Math.PI * 0.82, Math.PI * 0.08, true);
    g.closePath();
    g.fillPath();

    // A hard outline so the body never dissolves into a busy floor.
    g.lineStyle(2, shade(P.dark, -0.45), 0.9);
    g.strokeEllipse(x, y, rx * 2 + 6, ry * 2 + 6);
  }

  private drawPattern(g: Phaser.GameObjects.Graphics, x: number, y: number, R: number, f: BossRigFrame): void {
    const P = f.palette;
    const t = f.t;
    const glow = 0.35 + f.castGlow * 0.5 + (f.enraged ? 0.2 : 0);

    switch (f.look.pattern) {
      case 'cracks': {
        for (let i = 0; i < 5; i++) {
          const a = (Math.PI * 2 * i) / 5 + 0.4;
          g.lineStyle(2.4, P.lit, glow + Math.sin(t / 240 + i) * 0.22);
          let px = x + Math.cos(a) * 4;
          let py = y + Math.sin(a) * 4;
          let ca = a;
          for (let s = 0; s < 3; s++) {
            const nx = px + Math.cos(ca) * (R * 0.3);
            const ny = py + Math.sin(ca) * (R * 0.3);
            g.lineBetween(px, py, nx, ny);
            px = nx; py = ny;
            ca += ((i * 7 + s * 13) % 10 - 5) * 0.09;
          }
        }
        break;
      }
      case 'facets': {
        for (let i = 0; i < 6; i++) {
          const a0 = (Math.PI * 2 * i) / 6;
          const a1 = a0 + Math.PI / 3;
          g.fillStyle(i % 2 === 0 ? shade(P.main, 0.18) : shade(P.dark, 0.1), 0.6);
          g.fillTriangle(
            x, y,
            x + Math.cos(a0) * (R - 5), y + Math.sin(a0) * (R - 5),
            x + Math.cos(a1) * (R - 5), y + Math.sin(a1) * (R - 5),
          );
          g.lineStyle(1, P.lit, 0.3);
          g.lineBetween(x, y, x + Math.cos(a0) * (R - 5), y + Math.sin(a0) * (R - 5));
        }
        break;
      }
      case 'runes': {
        for (let i = 0; i < 7; i++) {
          const a = (Math.PI * 2 * i) / 7 + t / 3400;
          const rx = x + Math.cos(a) * (R * 0.62);
          const ry = y + Math.sin(a) * (R * 0.62);
          const lit = glow + Math.sin(t / 300 + i * 1.9) * 0.3;
          g.lineStyle(2, P.lit, lit);
          g.lineBetween(rx - 3, ry - 4, rx + 3, ry - 4);
          g.lineBetween(rx, ry - 4, rx, ry + 4);
          if (i % 2 === 0) g.lineBetween(rx - 3, ry + 4, rx + 3, ry + 4);
        }
        break;
      }
      case 'scales': {
        for (let row = 0; row < 3; row++) {
          const ry = y - R * 0.4 + row * (R * 0.4);
          const span = Math.sqrt(Math.max(0, (R - 6) * (R - 6) - (ry - y) * (ry - y)));
          const n = Math.max(2, Math.floor(span / 8));
          for (let i = -n; i <= n; i++) {
            g.lineStyle(1.6, shade(P.lit, 0.05), 0.4);
            g.beginPath();
            g.arc(x + (i * span) / (n + 0.5), ry, 6, Math.PI, 0, true);
            g.strokePath();
          }
        }
        break;
      }
      case 'plates': {
        for (let i = -1; i <= 1; i++) {
          const py = y + i * (R * 0.5);
          const span = Math.sqrt(Math.max(0, (R - 6) * (R - 6) - (py - y) * (py - y)));
          g.lineStyle(2.5, shade(P.dark, 0.22), 0.85);
          g.lineBetween(x - span, py, x + span, py);
          g.fillStyle(P.accent, 0.65);
          g.fillCircle(x - span * 0.6, py, 2);
          g.fillCircle(x + span * 0.6, py, 2);
        }
        break;
      }
      case 'swirl': {
        g.lineStyle(3, P.lit, glow);
        g.beginPath();
        for (let s = 0; s <= 26; s++) {
          const a = t / 620 + (s / 26) * Math.PI * 2.4;
          const r = (s / 26) * (R - 7);
          const px = x + Math.cos(a) * r;
          const py = y + Math.sin(a) * r;
          if (s === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
        break;
      }
      case 'rings': {
        for (let i = 1; i <= 3; i++) {
          g.lineStyle(2, i % 2 === 0 ? P.lit : P.accent, 0.28 + glow * 0.3);
          g.strokeCircle(x, y, (R - 6) * (i / 3.4) + Math.sin(t / 400 + i) * 1.5);
        }
        break;
      }
      case 'static': {
        for (let i = 0; i < 10; i++) {
          const seed = (Math.floor(t / 70) * 31 + i * 17) % 97;
          const a = (seed / 97) * Math.PI * 2;
          const r = ((seed * 7) % 100) / 100 * (R - 8);
          const px = x + Math.cos(a) * r;
          const py = y + Math.sin(a) * r;
          g.fillStyle(seed % 3 === 0 ? P.accent : P.lit, 0.7);
          g.fillRect(px, py, 5, 1.6);
        }
        break;
      }
      case 'weave': {
        for (let i = -2; i <= 2; i++) {
          const o = i * (R * 0.33);
          const span = Math.sqrt(Math.max(0, (R - 6) * (R - 6) - o * o));
          g.lineStyle(1.6, shade(P.lit, 0), 0.32);
          g.lineBetween(x + o, y - span, x + o, y + span);
          g.lineBetween(x - span, y + o, x + span, y + o);
        }
        break;
      }
      case 'drip': {
        for (let i = 0; i < 5; i++) {
          const px = x - R * 0.6 + i * (R * 0.3);
          const ph = ((t + i * 430) % 1500) / 1500;
          const span = Math.sqrt(Math.max(0, (R - 4) * (R - 4) - (px - x) * (px - x)));
          const top = y + span - 4;
          g.fillStyle(P.lit, 0.7);
          g.fillCircle(px, top + ph * 16, 3 + (1 - ph) * 2);
          g.lineStyle(3, P.lit, 0.45);
          g.lineBetween(px, top - 4, px, top + ph * 10);
        }
        break;
      }
      case 'gears': {
        const teeth = 9;
        g.lineStyle(2.2, P.accent, 0.6);
        g.strokeCircle(x, y, R * 0.5);
        for (let i = 0; i < teeth; i++) {
          const a = (Math.PI * 2 * i) / teeth + t / 1500;
          g.lineBetween(
            x + Math.cos(a) * (R * 0.5), y + Math.sin(a) * (R * 0.5),
            x + Math.cos(a) * (R * 0.72), y + Math.sin(a) * (R * 0.72),
          );
        }
        g.lineStyle(1.5, P.lit, 0.45);
        g.strokeCircle(x, y, R * 0.24);
        break;
      }
      case 'grid': {
        g.lineStyle(1.4, P.lit, 0.3);
        for (let i = -2; i <= 2; i++) {
          const o = i * (R * 0.36);
          const span = Math.sqrt(Math.max(0, (R - 6) * (R - 6) - o * o));
          g.lineBetween(x - span, y + o, x + span, y + o);
        }
        const scan = ((t / 14) % (R * 2)) - R;
        g.lineStyle(2.5, P.accent, 0.5);
        const s = Math.sqrt(Math.max(0, (R - 6) * (R - 6) - scan * scan));
        g.lineBetween(x - s, y + scan, x + s, y + scan);
        break;
      }
      case 'smooth': {
        g.fillStyle(0xffffff, 0.14);
        g.fillEllipse(x - R * 0.3, y - R * 0.36, R * 0.75, R * 0.45);
        break;
      }
    }
  }

  // ── Crest ──────────────────────────────────────────────────────────

  private drawCrest(g: Phaser.GameObjects.Graphics, x: number, top: number, R: number, f: BossRigFrame): void {
    const P = f.palette;
    const t = f.t;
    // Later phases wear it bigger — a silhouette that grows as the fight does.
    const grow = 1 + f.phaseIdx * 0.16 + (f.enraged ? 0.12 : 0);

    switch (f.look.crest) {
      case 'horns': {
        for (const side of [-1, 1]) {
          g.lineStyle(7 * grow, shade(P.dark, -0.15), 1);
          g.beginPath();
          g.arc(x + side * R * 0.6, top + 8, R * 0.62 * grow,
            side > 0 ? Math.PI * 1.1 : Math.PI * 1.5,
            side > 0 ? Math.PI * 1.9 : Math.PI * 0.3 + Math.PI * 2, false);
          g.strokePath();
          g.fillStyle(P.accent, 0.9);
          g.fillCircle(x + side * R * 1.02 * grow, top - R * 0.4 * grow, 3);
        }
        break;
      }
      case 'crown': {
        const n = 5;
        for (let i = 0; i < n; i++) {
          const px = x + (i - (n - 1) / 2) * (R * 0.33);
          const h = (R * (i === 2 ? 0.66 : 0.42 + (i % 2) * 0.12)) * grow;
          g.fillStyle(P.accent, 1);
          g.fillTriangle(px - 4.5, top + 4, px + 4.5, top + 4, px, top + 4 - h);
          g.fillStyle(shade(P.lit, 0.4), 0.9);
          g.fillCircle(px, top + 4 - h + 4, 1.8);
        }
        g.fillStyle(shade(P.accent, -0.25), 1);
        g.fillRect(x - R * 0.72, top + 2, R * 1.44, 5);
        break;
      }
      case 'spires': {
        for (let i = 0; i < 4; i++) {
          const px = x + (i - 1.5) * (R * 0.4);
          const h = (R * (0.5 + Math.abs(1.5 - i) * -0.1 + 0.25)) * grow;
          g.fillStyle(P.lit, 0.92);
          g.fillTriangle(px - 3.5, top + 6, px + 3.5, top + 6, px + (i - 1.5) * 2, top + 6 - h);
          g.fillStyle(0xffffff, 0.5);
          g.fillCircle(px, top + 6 - h * 0.8, 1.2);
        }
        break;
      }
      case 'halo': {
        const tilt = Math.sin(t / 1500) * 0.12;
        const ry = R * 0.26 * grow;
        for (let i = 0; i < 3; i++) {
          g.lineStyle(3 - i, P.accent, 0.75 - i * 0.2);
          g.strokeEllipse(x, top - R * 0.5 + tilt * 10, R * (1.5 + i * 0.14) * grow, ry * (1 + i * 0.2));
        }
        break;
      }
      case 'antennae': {
        for (const side of [-1, 1]) {
          const sway = Math.sin(t / 380 + side) * 0.25;
          const ex = x + side * R * 0.75 * grow + sway * 10;
          const ey = top - R * 0.85 * grow;
          g.lineStyle(2.6, shade(P.dark, 0.2), 1);
          g.beginPath();
          g.moveTo(x + side * R * 0.3, top + 4);
          g.lineTo(ex, ey);
          g.strokePath();
          g.fillStyle(P.lit, 1);
          g.fillCircle(ex, ey, 4.5);
          g.fillStyle(0xffffff, 0.6);
          g.fillCircle(ex - 1.2, ey - 1.2, 1.6);
        }
        break;
      }
      case 'plume': {
        for (let i = 0; i < 7; i++) {
          const a = -Math.PI / 2 + (i - 3) * 0.3;
          const len = R * (0.9 - Math.abs(i - 3) * 0.1) * grow;
          const wob = Math.sin(t / 300 + i) * 4;
          g.lineStyle(5, i % 2 === 0 ? P.main : P.accent, 0.85);
          g.lineBetween(x, top + 4, x + Math.cos(a) * len + wob, top + 4 + Math.sin(a) * len);
        }
        break;
      }
      case 'mane': {
        for (let i = 0; i < 13; i++) {
          const a = Math.PI * (1.06 + (0.88 * i) / 12);
          const len = (R * 0.45 + ((i * 5) % 9)) * grow;
          const sx = x + Math.cos(a) * (R - 2);
          const sy = top + R + Math.sin(a) * (R - 2);
          const wob = Math.sin(t / 200 + i * 1.3) * 0.12;
          g.fillStyle(i % 2 === 0 ? shade(P.dark, 0.18) : P.main, 0.95);
          g.fillTriangle(
            sx - Math.sin(a) * 5, sy + Math.cos(a) * 5,
            sx + Math.sin(a) * 5, sy - Math.cos(a) * 5,
            sx + Math.cos(a + wob) * len, sy + Math.sin(a + wob) * len,
          );
        }
        break;
      }
      case 'blades': {
        for (let i = 0; i < 3; i++) {
          const a = -Math.PI / 2 + (i - 1) * 0.46;
          const len = R * (1.05 - Math.abs(i - 1) * 0.22) * grow;
          const tipX = x + Math.cos(a) * len;
          const tipY = top + 4 + Math.sin(a) * len;
          g.fillStyle(shade(P.lit, 0.1), 0.95);
          g.fillTriangle(x - Math.sin(a) * 5, top + 6 + Math.cos(a) * 5,
            x + Math.sin(a) * 5, top + 6 - Math.cos(a) * 5, tipX, tipY);
          g.lineStyle(1.4, shade(P.dark, -0.2), 0.8);
          g.lineBetween(x, top + 6, tipX, tipY);
        }
        break;
      }
      case 'orbs': {
        for (let i = 0; i < 3; i++) {
          const a = t / 700 + (Math.PI * 2 * i) / 3;
          const ox = x + Math.cos(a) * R * 0.85 * grow;
          const oy = top - R * 0.35 + Math.sin(a) * R * 0.2;
          const near = Math.sin(a) > 0 ? 1 : 0.7;
          g.fillStyle(P.dark, 0.9);
          g.fillCircle(ox, oy, 6.5 * near);
          g.fillStyle(P.lit, 0.95);
          g.fillCircle(ox, oy, 4.4 * near);
          g.fillStyle(0xffffff, 0.7);
          g.fillCircle(ox - 1.3, oy - 1.3, 1.4 * near);
        }
        break;
      }
      case 'veil': {
        g.fillStyle(shade(P.dark, 0.05), 0.92);
        g.beginPath();
        g.moveTo(x - R * 1.02, top + R * 0.5);
        g.lineTo(x - R * 0.78, top - R * 0.35 * grow);
        g.lineTo(x, top - R * 0.6 * grow);
        g.lineTo(x + R * 0.78, top - R * 0.35 * grow);
        g.lineTo(x + R * 1.02, top + R * 0.5);
        g.closePath();
        g.fillPath();
        for (let i = 0; i < 5; i++) {
          const px = x - R * 0.8 + i * (R * 0.4);
          const sway = Math.sin(t / 420 + i) * 3;
          g.lineStyle(1.5, P.lit, 0.3);
          g.lineBetween(px, top - R * 0.25, px + sway, top + R * 0.55);
        }
        break;
      }
      case 'tendrils': {
        for (let i = 0; i < 5; i++) {
          const base = -Math.PI / 2 + (i - 2) * 0.42;
          g.lineStyle(3.2, mixColor(P.main, P.dark, 0.3), 0.9);
          let px = x + Math.cos(base) * (R * 0.4);
          let py = top + 4 + Math.sin(base) * (R * 0.4);
          let a = base;
          for (let s = 0; s < 4; s++) {
            a += Math.sin(t / 260 + i * 1.4 + s) * 0.32;
            const nx = px + Math.cos(a) * (R * 0.24) * grow;
            const ny = py + Math.sin(a) * (R * 0.24) * grow;
            g.lineBetween(px, py, nx, ny);
            px = nx; py = ny;
          }
          g.fillStyle(P.accent, 0.85);
          g.fillCircle(px, py, 2.6);
        }
        break;
      }
      case 'stack': {
        // A tottering pile — ledgers, plates, crates, whatever the Sovereign hoards.
        for (let i = 0; i < 4; i++) {
          const w = R * (1.1 - i * 0.16);
          const py = top - 2 - i * 8;
          const skew = Math.sin(t / 900 + i) * 3;
          g.fillStyle(i % 2 === 0 ? shade(P.dark, 0.16) : P.main, 0.95);
          g.fillRect(x - w / 2 + skew, py - 7, w, 7);
          g.lineStyle(1.2, shade(P.lit, 0.1), 0.5);
          g.strokeRect(x - w / 2 + skew, py - 7, w, 7);
        }
        break;
      }
      case 'none':
        break;
    }
  }

  // ── Face ───────────────────────────────────────────────────────────

  private drawFace(g: Phaser.GameObjects.Graphics, x: number, y: number, R: number, f: BossRigFrame): void {
    const P = f.palette;
    const eyes = f.look.eyes ?? 2;
    const blinking = this.blinkFor > 0;
    // Narrowed while winding up — the cheapest read on "something is coming".
    const open = blinking ? 0.1 : 1 - f.castGlow * 0.45;
    const col = f.hurt ? 0xffffff
      : f.enraged ? P.accent
        : f.look.eyeColor ?? shade(P.lit, 0.25);
    const look = f.facing;
    const lx = Math.cos(look) * (R * 0.13);
    const ly = Math.sin(look) * (R * 0.1);
    const eyeR = R * 0.17;

    const slots: number[] = eyes === 1 ? [0] : eyes === 2 ? [-1, 1] : [-1.35, 0, 1.35];
    for (const s of slots) {
      const ex = x + s * (R * 0.32) + lx;
      const ey = y - R * 0.12 + ly + (eyes === 3 && s === 0 ? -R * 0.28 : 0);
      const r = eyes === 3 && s === 0 ? eyeR * 0.8 : eyeR;
      g.fillStyle(0x100c18, 0.85);
      g.fillEllipse(ex, ey, r * 2.5, r * 2.5 * open + 0.5);
      g.fillStyle(col, 1);
      g.fillEllipse(ex, ey, r * 2, r * 2 * open + 0.4);
      if (!blinking) {
        g.fillStyle(0x120a18, 0.92);
        g.fillEllipse(ex + Math.cos(look) * r * 0.5, ey + Math.sin(look) * r * 0.45,
          r * 0.9, r * 0.9 * Math.max(0.25, open));
        g.fillStyle(0xffffff, 0.7);
        g.fillCircle(ex - r * 0.4, ey - r * 0.45, r * 0.28);
      }
    }

    const mouth = f.look.mouth ?? 'none';
    if (mouth === 'none') return;
    const my = y + R * 0.42;
    switch (mouth) {
      case 'grin': {
        g.lineStyle(2.6, shade(P.dark, -0.3), 0.95);
        g.beginPath();
        g.arc(x, my - R * 0.18, R * 0.36, 0.35, Math.PI - 0.35, false);
        g.strokePath();
        for (let i = 0; i < 4; i++) {
          const px = x - R * 0.22 + i * (R * 0.15);
          g.fillStyle(0xf4f0ff, 0.85);
          g.fillTriangle(px - 2.4, my + R * 0.02, px + 2.4, my + R * 0.02, px, my + R * 0.16);
        }
        break;
      }
      case 'grate': {
        g.fillStyle(shade(P.lit, 0.1), 0.8 + f.castGlow * 0.2);
        g.fillRect(x - R * 0.3, my - 2, R * 0.6, 5);
        g.fillStyle(shade(P.dark, -0.3), 1);
        for (let i = 0; i < 4; i++) g.fillRect(x - R * 0.24 + i * (R * 0.16), my - 2, 2, 5);
        break;
      }
      case 'maw': {
        g.fillStyle(0x0a0610, 0.95);
        g.fillEllipse(x, my, R * 0.72, R * (0.3 + f.castGlow * 0.25));
        g.lineStyle(2, shade(P.lit, 0.1), 0.5);
        g.strokeEllipse(x, my, R * 0.72, R * (0.3 + f.castGlow * 0.25));
        for (let i = 0; i < 5; i++) {
          const px = x - R * 0.28 + i * (R * 0.14);
          g.fillStyle(0xe8e2f2, 0.9);
          g.fillTriangle(px - 2.2, my - R * 0.14, px + 2.2, my - R * 0.14, px, my - R * 0.02);
        }
        break;
      }
      case 'line': {
        g.lineStyle(2.4, shade(P.dark, -0.3), 0.9);
        g.lineBetween(x - R * 0.26, my, x + R * 0.26, my);
        break;
      }
      case 'stitch': {
        g.lineStyle(2, shade(P.dark, -0.25), 0.9);
        g.lineBetween(x - R * 0.32, my, x + R * 0.32, my);
        for (let i = 0; i < 5; i++) {
          const px = x - R * 0.26 + i * (R * 0.13);
          g.lineStyle(1.6, shade(P.lit, 0.1), 0.8);
          g.lineBetween(px, my - 4, px, my + 4);
        }
        break;
      }
    }
  }

  // ── Hands ──────────────────────────────────────────────────────────

  private drawHand(g: Phaser.GameObjects.Graphics, i: number, R: number, f: BossRigFrame): void {
    const P = f.palette;
    const x = this.hx[i];
    const y = this.hy[i];
    const scale = this.hs[i] * (i >= 2 ? 0.78 : 1);
    const r = R * 0.34 * scale;
    const aim = Math.atan2(y - f.y, x - f.x);
    const hot = f.castGlow;

    switch (f.look.hands ?? 'ball') {
      case 'ball': {
        g.fillStyle(shade(P.dark, -0.3), 1);
        g.fillCircle(x, y, r + 2.4);
        g.fillStyle(mixColor(P.main, 0xffffff, hot * 0.55), 1);
        g.fillCircle(x, y, r);
        g.fillStyle(shade(P.lit, 0.3), 0.85);
        g.fillCircle(x - r * 0.32, y - r * 0.34, r * 0.42);
        break;
      }
      case 'claw': {
        g.fillStyle(shade(P.dark, -0.25), 1);
        g.fillCircle(x, y, r * 0.8);
        for (let c = -1; c <= 1; c++) {
          const a = aim + c * 0.52;
          g.fillStyle(mixColor(P.lit, 0xffffff, hot * 0.5), 0.95);
          g.fillTriangle(
            x - Math.sin(a) * r * 0.45, y + Math.cos(a) * r * 0.45,
            x + Math.sin(a) * r * 0.45, y - Math.cos(a) * r * 0.45,
            x + Math.cos(a) * r * 1.9, y + Math.sin(a) * r * 1.9,
          );
        }
        break;
      }
      case 'gauntlet': {
        const n = 6;
        g.fillStyle(shade(P.dark, -0.2), 1);
        g.beginPath();
        for (let k = 0; k < n; k++) {
          const a = aim + (Math.PI * 2 * k) / n;
          const px = x + Math.cos(a) * (r + 3);
          const py = y + Math.sin(a) * (r + 3);
          if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.closePath();
        g.fillPath();
        g.fillStyle(mixColor(P.main, 0xffffff, hot * 0.5), 1);
        g.fillCircle(x, y, r * 0.72);
        for (let k = 0; k < 3; k++) {
          const a = aim + (k - 1) * 0.6;
          g.fillStyle(P.accent, 0.9);
          g.fillCircle(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, 2.1);
        }
        break;
      }
      case 'wisp': {
        for (let k = 3; k >= 1; k--) {
          g.fillStyle(P.main, 0.16 * k);
          g.fillCircle(x - Math.cos(aim) * k * 3, y - Math.sin(aim) * k * 3, r * (0.6 + k * 0.28));
        }
        g.fillStyle(mixColor(P.lit, 0xffffff, 0.3 + hot * 0.5), 0.95);
        g.fillCircle(x, y, r * 0.66);
        break;
      }
      case 'blade': {
        g.fillStyle(shade(P.dark, -0.25), 1);
        g.fillCircle(x, y, r * 0.62);
        g.fillStyle(mixColor(shade(P.lit, 0.2), 0xffffff, hot * 0.5), 0.95);
        g.fillTriangle(
          x - Math.sin(aim) * r * 0.6, y + Math.cos(aim) * r * 0.6,
          x + Math.sin(aim) * r * 0.6, y - Math.cos(aim) * r * 0.6,
          x + Math.cos(aim) * r * 2.6, y + Math.sin(aim) * r * 2.6,
        );
        g.lineStyle(1.2, shade(P.dark, -0.35), 0.7);
        g.lineBetween(x, y, x + Math.cos(aim) * r * 2.5, y + Math.sin(aim) * r * 2.5);
        break;
      }
      case 'orb': {
        g.lineStyle(2.6, P.accent, 0.85);
        g.strokeCircle(x, y, r + 3);
        g.lineStyle(1.4, P.lit, 0.5);
        g.strokeCircle(x, y, r + 7);
        g.fillStyle(mixColor(P.lit, 0xffffff, hot * 0.6), 0.9);
        g.fillCircle(x, y, r * 0.6);
        break;
      }
    }

    if (hot > 0.35) {
      g.fillStyle(0xffffff, (hot - 0.35) * 0.75);
      g.fillCircle(x, y, r * 0.45);
    }
  }
}
