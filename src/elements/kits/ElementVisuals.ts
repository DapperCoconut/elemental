import Phaser from 'phaser';

/**
 * Shared drawing engine behind every element's visual kit.
 *
 * Fire and Water each grew their own copy of the same three things — a tween-backed
 * animation runner, the blown-out impact flash, and the whole ball-hands-and-eyes character
 * rig. Life is the third element to need them, so the generic halves live here and each
 * element's file keeps only what is genuinely its own: its primitive shape, its palette and
 * its effects.
 *
 * Nothing in this file picks a colour. Every drawing call takes one from the caller, so an
 * element's palette (and its colour cosmetic) stays the element's business.
 */

/** `(base) => displayed` — an owner's colour cosmetic mapper, or the identity. */
export type ColorFn = (base: number) => number;

export const TAU = Math.PI * 2;

export const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);
export const easeIn = (t: number): number => t * t;

// ── FxBase ────────────────────────────────────────────────────────────────

/**
 * The bit of every element's `Fx` class that has nothing to do with that element: the
 * animation runner and the impact flash.
 */
export abstract class FxBase {
  constructor(protected scene: Phaser.Scene, protected tint: ColorFn = (c) => c) {}

  /**
   * Runs `draw(g, t)` every frame for `duration` ms with `t` sweeping 0→1, then cleans up.
   * Built on a tween so a scene restart kills it along with everything else — hand-rolling
   * this on scene 'update' leaks a Graphics across every match restart.
   */
  anim(depth: number, duration: number, draw: (g: Phaser.GameObjects.Graphics, t: number) => void): void {
    const g = this.scene.add.graphics().setDepth(depth);
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration,
      onUpdate: (tw) => {
        if (!g.active) return;
        g.clear();
        draw(g, Number(tw.getValue()));
      },
      onComplete: () => g.destroy(),
    });
  }

  /** Blown-out core — the first two frames of any real impact. */
  protected flashIn(x: number, y: number, radius: number, hot: number, halo: number, depth: number): void {
    this.anim(depth, 150, (g, t) => {
      g.fillStyle(this.tint(hot), (1 - t) * 0.92);
      g.fillCircle(x, y, radius * (0.5 + t * 0.9));
      g.fillStyle(this.tint(halo), (1 - t) * 0.58);
      g.fillCircle(x, y, radius * (0.8 + t * 1.5));
    });
  }
}

// ── BaseAvatar ────────────────────────────────────────────────────────────

/** One-shot arm gestures. Sustained poses go through `setHold` instead. */
export type ArmGesture =
  | 'punch'    // throw something — one arm jabs along the aim
  | 'dash'     // wind both arms back, then fling them forward
  | 'slam'     // raise overhead, then drive down at the target
  | 'raise'    // both arms thrust skyward and hold (ultimates)
  | 'sweep'    // wide horizontal arc across the aim
  | 'clap'     // arms smack together in front, then bounce apart
  | 'flex';    // both arms pump out to the sides (toggles, buffs)

/** Sustained poses held for as long as an ability is being channelled. */
export type ArmHold =
  | 'spray'    // both hands forward along the aim, jittering (streams, downpours)
  | 'charge'   // hands orbit a compressing point in front of the chest
  | 'draw'     // hands held wide open along the aim, hauling something back
  | 'sow'      // hands low and cupped, working the ground
  | 'brace'    // hands hauled in tight behind a guard, shaking (charged blocks, shield bashes)
  | 'ride'     // arms thrown out wide for balance while something carries you
  | null;

export interface ArmPose { ang: number; dist: number; scale: number }

/** One concentric disc of a ball hand, from outermost glow to innermost glint. */
export interface HandLayer {
  r: number;
  color: number;
  alpha: number;
  /** Offset from the hand centre — a glint dead centre reads as a bulb, not a highlight. */
  ox?: number;
  oy?: number;
}

export interface AvatarSpec {
  /** Concentric discs making up each ball hand, outermost first. */
  hands: HandLayer[];
  eyeWhite: number;
  eyePupil: number;
  /** Motion smear: `div` is the speed that saturates the squash, x/y the stretch amounts. */
  squash?: { div: number; x: number; y: number };
}

const IDLE_DIST = 24;
const ARM_STIFFNESS = 0.32;

const GESTURE_MS: Record<ArmGesture, number> = {
  punch: 320, dash: 420, slam: 460, raise: 900, sweep: 460, clap: 380, flex: 520,
};

/**
 * The character rig every element shares: two ball hands that trail the body on springs, a
 * pair of eyes that track the aim and blink, and two spare Graphics layers — one under the
 * sprite for a soft glow, one over it for the silhouette extra (a plume, a fountain, a
 * sprouting crown).
 *
 * Subclasses supply the look (`AvatarSpec` through `super`), paint the two Graphics layers
 * (`drawGlow` / `drawExtras`), and decide what a mastered character looks like
 * (`applyMastery`). Everything else — poses, gestures, holds, blinking, squash — is here.
 */
export abstract class BaseAvatar {
  private armObjs: Phaser.GameObjects.Container[] = [];
  private eyeObjs: { white: Phaser.GameObjects.Arc; pupil: Phaser.GameObjects.Arc }[] = [];
  /** Soft under-glow. Separate Graphics from `extras` because one Graphics has one depth. */
  private glow: Phaser.GameObjects.Graphics;
  /** The silhouette extra, drawn *over* the sprite — under it only the dark tips would clear the body. */
  private extras: Phaser.GameObjects.Graphics;

  /** Live hand positions in world space — lerped toward the pose target each frame. */
  protected armX = [0, 0];
  protected armY = [0, 0];
  private armScale = [1, 1];

  protected facing = 0;
  protected t = 0;
  protected intensity = 1;
  protected orbit = 0;
  protected mastered = false;

  private gesture: ArmGesture | null = null;
  private gestureT = 0;
  private gestureDur = 0;
  private gestureSide = 1;
  private gestureAngle = 0;
  private nextPunchSide = 1;

  protected hold: ArmHold = null;
  protected holdAngle = 0;

  private blinkAt = 0;
  private blinkUntil = 0;
  private trailAccum = 0;

  private squash: { div: number; x: number; y: number };

  constructor(
    protected scene: Phaser.Scene,
    protected tint: ColorFn,
    depth: number,
    spec: AvatarSpec,
  ) {
    this.glow = scene.add.graphics().setDepth(depth - 3);
    this.extras = scene.add.graphics().setDepth(depth + 2);
    this.squash = spec.squash ?? { div: 14, x: 0.5, y: 0.28 };

    for (let i = 0; i < 2; i++) {
      const layers = spec.hands.map((l) =>
        scene.add.circle(l.ox ?? 0, l.oy ?? 0, l.r, tint(l.color), l.alpha));
      this.armObjs.push(scene.add.container(0, 0, layers).setDepth(depth));

      const white = scene.add.circle(0, 0, 4.4, tint(spec.eyeWhite), 0.95).setDepth(depth);
      const pupil = scene.add.circle(0, 0, 2.2, tint(spec.eyePupil), 1).setDepth(depth + 1);
      this.eyeObjs.push({ white, pupil });
    }
    this.blinkAt = 1500 + Math.random() * 3000;
  }

  /** Aim direction in radians — hands and eyes orient off this. */
  setFacing(angle: number): void { this.facing = angle; }

  /** 1 = normal, higher while a stance buff is up (bigger, faster, wider). */
  setIntensity(v: number): void { this.intensity = v; }

  /**
   * Mastery tell. The setter early-outs when unchanged, so kits can call this every frame
   * with their `masteryActive` flag.
   */
  setMastered(on: boolean): void {
    if (on === this.mastered) return;
    this.mastered = on;
    this.applyMastery(on);
  }

  /** Fire a one-shot gesture. `angle` defaults to the current facing. */
  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.gesture = gesture;
    this.gestureT = 0;
    this.gestureAngle = angle ?? this.facing;
    this.gestureDur = duration ?? GESTURE_MS[gesture];
    if (gesture === 'punch') {
      // Alternate hands, so spamming a click ability doesn't look mechanical.
      this.gestureSide = this.nextPunchSide;
      this.nextPunchSide = -this.nextPunchSide as 1 | -1;
    }
  }

  /** Enter/leave a sustained pose. Overrides any running gesture while set. */
  setHold(hold: ArmHold, angle?: number): void {
    this.hold = hold;
    if (angle !== undefined) this.holdAngle = angle;
  }

  /** World position of the hand that just threw something — good for muzzle effects. */
  castHand(): { x: number; y: number } {
    const i = this.gestureSide > 0 ? 1 : 0;
    return { x: this.armX[i], y: this.armY[i] };
  }

  update(delta: number, x: number, y: number, alpha: number): void {
    const dt = delta / 1000;
    this.t += dt;
    if (this.gesture) {
      this.gestureT += delta;
      if (this.gestureT >= this.gestureDur) this.gesture = null;
    }
    this.orbit += dt * (this.intensity > 1 ? 2.4 : 0.35);

    const visible = alpha > 0.02;
    for (const c of this.armObjs) c.setVisible(visible);
    for (const e of this.eyeObjs) { e.white.setVisible(visible); e.pupil.setVisible(visible); }

    // ── Hands ───────────────────────────────────────────────────────────
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const pose = this.poseFor(side);
      const tx = x + Math.cos(pose.ang) * pose.dist;
      const ty = y + Math.sin(pose.ang) * pose.dist;

      // Spring follow: the hands lag the body, so running drags them behind you.
      const k = Math.min(1, ARM_STIFFNESS * (delta / 16.67));
      const prevX = this.armX[i], prevY = this.armY[i];
      this.armX[i] += (tx - this.armX[i]) * k;
      this.armY[i] += (ty - this.armY[i]) * k;
      this.armScale[i] += (pose.scale - this.armScale[i]) * k;

      const c = this.armObjs[i];
      c.setPosition(this.armX[i], this.armY[i]);
      // Squash along the direction of travel for a bit of motion smear.
      const vx = this.armX[i] - prevX, vy = this.armY[i] - prevY;
      const sp = Math.min(1, Math.hypot(vx, vy) / this.squash.div);
      c.setRotation(sp > 0.05 ? Math.atan2(vy, vx) : 0);
      c.setScale(this.armScale[i] * (1 + sp * this.squash.x), this.armScale[i] * (1 - sp * this.squash.y));
      c.setAlpha(alpha);
    }

    // Fast-moving hands shed something.
    this.trailAccum += delta;
    if (this.trailAccum >= 90 && visible) {
      this.trailAccum = 0;
      const moved = Math.hypot(this.armX[0] - x, this.armY[0] - y);
      if (moved > IDLE_DIST * 1.35 || this.intensity > 1) {
        const i = Math.random() < 0.5 ? 0 : 1;
        this.emitTrail(this.armX[i], this.armY[i]);
      }
    }

    // ── Eyes ────────────────────────────────────────────────────────────
    this.blinkAt -= delta;
    if (this.blinkAt <= 0) { this.blinkUntil = 110; this.blinkAt = 2200 + Math.random() * 3400; }
    if (this.blinkUntil > 0) this.blinkUntil -= delta;
    // Narrowed while casting: the cheapest read on "this character is doing something".
    const open = this.blinkUntil > 0 ? 0.12 : (this.gesture || this.hold ? 0.72 : 1);

    const look = this.facing;
    const bob = Math.sin(this.t * 2.6) * 1.1;
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const e = this.eyeObjs[i];
      const ex = x + side * 7.2 + Math.cos(look) * 2.4;
      const ey = y - 4 + Math.sin(look) * 2.0 + bob;
      e.white.setPosition(ex, ey);
      e.white.setScale(1, open);
      e.white.setAlpha(alpha);
      e.pupil.setPosition(ex + Math.cos(look) * 1.8, ey + Math.sin(look) * 1.6);
      e.pupil.setScale(1, open);
      e.pupil.setAlpha(alpha);
    }

    // ── Element-owned layers ────────────────────────────────────────────
    this.glow.clear();
    this.extras.clear();
    if (visible) {
      // Slow breathing pulse shared by both layers, so glow and silhouette move together.
      const a = alpha * (0.66 + 0.12 * Math.sin(this.t * 5.5));
      this.drawGlow(this.glow, x, y, a, alpha);
      this.drawExtras(this.extras, x, y, a, alpha);
    }
  }

  destroy(): void {
    for (const c of this.armObjs) c.destroy();
    for (const e of this.eyeObjs) { e.white.destroy(); e.pupil.destroy(); }
    this.glow.destroy();
    this.extras.destroy();
    this.armObjs = [];
    this.eyeObjs = [];
  }

  // ── Subclass hooks ──────────────────────────────────────────────────────

  /** Soft under-glow, drawn beneath the fighter sprite. */
  protected abstract drawGlow(
    g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number,
  ): void;

  /**
   * The silhouette extra, drawn over the sprite. Root it at the crown (`y - 18`) so it never
   * covers the face.
   */
  protected abstract drawExtras(
    g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number,
  ): void;

  /** Permanent, silhouette-level upgrade for a mastered fighter. A tint alone is invisible in play. */
  protected abstract applyMastery(on: boolean): void;

  /** Shed a particle off a fast-moving hand. */
  protected emitTrail(_x: number, _y: number): void {}

  /** Extra sustained poses beyond the built-in four. Return null to fall through. */
  protected extraHoldPose(_hold: ArmHold, _side: number, _idle: ArmPose): ArmPose | null { return null; }

  /** Nth concentric disc of one hand — for `applyMastery` to resize or recolour. */
  protected handLayer(i: number, layer: number): Phaser.GameObjects.Arc {
    return this.armObjs[i].list[layer] as Phaser.GameObjects.Arc;
  }

  protected forEachHandLayer(layer: number, fn: (arc: Phaser.GameObjects.Arc) => void): void {
    for (const c of this.armObjs) fn(c.list[layer] as Phaser.GameObjects.Arc);
  }

  protected setEyeWhite(color: number): void {
    for (const e of this.eyeObjs) e.white.setFillStyle(this.tint(color), 0.95);
  }

  // ── Poses ───────────────────────────────────────────────────────────────

  /** Target polar offset for one hand, blending the idle sway with any active gesture/hold. */
  private poseFor(side: number): ArmPose {
    const idleAng = this.facing + this.orbit + side * 1.28 + Math.sin(this.t * 2.2 + side) * 0.09;
    const idle: ArmPose = {
      ang: idleAng,
      dist: (IDLE_DIST + Math.sin(this.t * 3.1 + side * 1.7) * 2.6) * (this.intensity > 1 ? 1.2 : 1),
      scale: this.intensity > 1 ? 1.3 : 1,
    };

    if (this.hold) {
      const held = this.holdPose(this.hold, side, idle);
      if (held) return held;
    }
    if (!this.gesture) return idle;

    const t = Math.min(1, this.gestureT / this.gestureDur);
    const a = this.gestureAngle;
    let target: ArmPose = idle;
    let blend = 0;

    switch (this.gesture) {
      case 'punch': {
        const active = side === this.gestureSide;
        blend = t < 0.22 ? easeOut(t / 0.22) : 1 - easeIn((t - 0.22) / 0.78);
        target = active
          ? { ang: a, dist: 46, scale: idle.scale * 1.2 }
          : { ang: a + side * 2.0, dist: 15, scale: idle.scale * 0.85 };
        break;
      }
      case 'dash': {
        // Wind up behind, then fling forward.
        if (t < 0.3) {
          blend = easeOut(t / 0.3);
          target = { ang: a + Math.PI + side * 0.4, dist: 38, scale: idle.scale };
        } else {
          blend = 1 - easeIn((t - 0.3) / 0.7);
          target = { ang: a + side * 0.22, dist: 42, scale: idle.scale * 1.15 };
        }
        break;
      }
      case 'slam': {
        if (t < 0.4) {
          blend = easeOut(t / 0.4);
          target = { ang: -Math.PI / 2 + side * 0.5, dist: 40, scale: idle.scale * 1.15 };
        } else {
          blend = 1 - easeIn((t - 0.4) / 0.6);
          target = { ang: a + side * 0.16, dist: 46, scale: idle.scale * 1.25 };
        }
        break;
      }
      case 'raise': {
        blend = t < 0.15 ? easeOut(t / 0.15) : t > 0.8 ? 1 - easeIn((t - 0.8) / 0.2) : 1;
        target = {
          ang: -Math.PI / 2 + side * 0.55,
          dist: 46 + Math.sin(this.t * 12) * 2,
          scale: idle.scale * 1.35,
        };
        break;
      }
      case 'sweep': {
        blend = t < 0.12 ? t / 0.12 : t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1;
        target = { ang: a - 1.35 + t * 2.7 + side * 0.18, dist: 42, scale: idle.scale * 1.15 };
        break;
      }
      case 'clap': {
        blend = t < 0.35 ? easeOut(t / 0.35) : 1 - easeIn((t - 0.35) / 0.65);
        target = t < 0.35
          ? { ang: a + side * 0.9, dist: 40, scale: idle.scale }
          : { ang: a + side * 0.06, dist: 26, scale: idle.scale * 1.3 };
        break;
      }
      case 'flex': {
        blend = t < 0.2 ? easeOut(t / 0.2) : 1 - easeIn((t - 0.2) / 0.8);
        target = { ang: this.facing + side * (Math.PI / 2), dist: 40, scale: idle.scale * 1.35 };
        break;
      }
    }

    return {
      // RotateTo takes the short way round, so a hand never unwinds through a full turn.
      ang: Phaser.Math.Angle.RotateTo(idle.ang, target.ang, Math.abs(Phaser.Math.Angle.Wrap(target.ang - idle.ang)) * blend),
      dist: idle.dist + (target.dist - idle.dist) * blend,
      scale: idle.scale + (target.scale - idle.scale) * blend,
    };
  }

  private holdPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    switch (hold) {
      case 'spray': {
        const jitter = (Math.random() - 0.5) * 0.12;
        return { ang: this.holdAngle + side * 0.28 + jitter, dist: 32 + Math.random() * 3, scale: idle.scale * 1.15 };
      }
      case 'charge':
        return {
          ang: this.facing + this.t * 7 + side * Math.PI,
          dist: 15 + Math.random() * 2.5,
          scale: idle.scale * 0.9,
        };
      case 'draw': {
        // Hands held wide open along the aim, pulsing back toward the body as they haul
        // something out of whatever is in front — an outward push would read as a beam.
        const pull = 0.5 + 0.5 * Math.sin(this.t * 6);
        return {
          ang: this.holdAngle + side * 0.62,
          dist: 26 + pull * 12,
          scale: idle.scale * (1.05 + pull * 0.25),
        };
      }
      case 'sow': {
        // Low and cupped, working close to the ground rather than out at arm's length.
        const knead = Math.sin(this.t * 5 + side * 1.4);
        return {
          ang: this.holdAngle + side * 0.75 + knead * 0.1,
          dist: 20 + knead * 3,
          scale: idle.scale * 1.1,
        };
      }
      default:
        return this.extraHoldPose(hold, side, idle);
    }
  }
}
