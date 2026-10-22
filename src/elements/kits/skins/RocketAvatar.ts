import Phaser from 'phaser';
import { ArmGesture, ArmHold, ArmPose, AvatarSpec, BaseAvatar, ColorFn, TAU, easeOut } from '../ElementVisuals';
import { ROCKET, RocketFx, flameTongue, smokePuff } from './RocketFx';

/**
 * The Rocket skin's character: Tempest's storm orb replaced by an astronaut who flies on fire.
 *
 * **Unmastered** — an astronaut in a white EVA suit: a round helmet whose gold-filmed visor is
 * the face (the rig's eyes look out through it), side lamps, a whip antenna with a blinking tip,
 * a chest control panel and mission patch, boots, and a twin-tank jetpack on the back. On the
 * floor its nozzles burn a pilot flame; airborne they roar, and sputter when the fall takes
 * over.
 *
 * **Mastered** — the astronaut *is* the rocket: a tapered red-and-white fuselage with a riveted
 * porthole for a face, a nose cone standing off the crown with a strobe on its tip, swept fins
 * either side, and a three-bell booster cluster under it that burns three times as wide.
 *
 * Tempest is bodyless, so this rig is the whole character — the kit draws it lifted off the
 * floor while the physics body stays put. It honours the three tells `TempestAvatar` takes
 * (`setAir`, `setFall`, `setEye`); the Eye of the Storm becomes a sun-hot eye with flames
 * licking off its rim.
 */

const ROCKET_AVATAR: AvatarSpec = {
  hands: [
    { r: 11, color: ROCKET.flame, alpha: 0.28 },
    { r: 7.6, color: ROCKET.suitDeep, alpha: 1 },
    { r: 6.3, color: ROCKET.suit, alpha: 1, ox: -0.5, oy: -0.5 },
    { r: 2.0, color: 0xffffff, alpha: 0.9, ox: -2.2, oy: -2.2 },
  ],
  eyeWhite: 0xf6f8fa,
  eyePupil: 0x0b0d12,
  squash: { div: 12, x: 0.5, y: 0.28 },
};

function P(x: number, y: number): Phaser.Geom.Point { return new Phaser.Geom.Point(x, y); }

/** Half-width of the mastered fuselage at `u` (0 = top of the hull, 1 = the booster skirt). */
const HULL = [17, 21.5, 23.5, 23, 21, 19];
function hullHalf(u: number): number {
  const f = Phaser.Math.Clamp(u, 0, 1) * (HULL.length - 1);
  const i = Math.min(HULL.length - 2, Math.floor(f));
  const k = f - i;
  const s = k * k * (3 - 2 * k);
  return HULL[i] + (HULL[i + 1] - HULL[i]) * s;
}

const HULL_TOP = -22;
const HULL_BOT = 22;

export class RocketAvatar extends BaseAvatar {
  private fx: RocketFx;
  private air = 0;
  private airTarget = 0;
  private fall = 0;
  private fallTarget = 0;
  private eye = 0;
  private eyeTarget = 0;
  private flare = 0;

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, ROCKET_AVATAR);
    this.fx = new RocketFx(scene);
  }

  /** 1 while airborne, 0 on the floor. Lerped. */
  setAir(on: boolean): void { this.airTarget = on ? 1 : 0; }

  /** Fall speed as a 0–1 fraction of terminal. */
  setFall(v: number): void { this.fallTarget = Phaser.Math.Clamp(v, 0, 1); }

  /** The Eye of the Storm — for the Rocket, a sun-hot eye over the whole body. */
  setEye(on: boolean): void { this.eyeTarget = on ? 1 : 0; }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.flare = Math.max(0, this.flare - delta / 360);
    this.air += (this.airTarget - this.air) * Math.min(1, delta / 220);
    this.fall += (this.fallTarget - this.fall) * Math.min(1, delta / 160);
    this.eye += (this.eyeTarget - this.eye) * Math.min(1, delta / (this.eyeTarget > this.eye ? 180 : 320));
    super.update(delta, x, y, alpha);
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.flare = 1;
    super.play(gesture, angle, duration);
  }

  /** Mastery: the gloves go rocket-red in a wider burn, and the eyes take the cockpit's amber glow. */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? ROCKET.flameCore : 0xf6f8fa);
    this.forEachHandLayer(0, (corona) => {
      corona.setRadius(on ? 14.5 : 11);
      corona.setFillStyle(on ? ROCKET.flameMid : ROCKET.flame, on ? 0.38 : 0.28);
    });
    this.forEachHandLayer(2, (glove) => glove.setFillStyle(on ? ROCKET.hull : ROCKET.suit, 1));
    this.forEachHandLayer(1, (rim) => rim.setFillStyle(on ? ROCKET.hullShade : ROCKET.suitDeep, 1));
  }

  /** A fast glove sheds a lick of flame and a puff of smoke. */
  protected emitTrail(x: number, y: number): void {
    const ang = this.facing + Math.PI + (Math.random() - 0.5) * 0.8;
    const seed = Math.random() * 99;
    this.fx.anim(5, 380, (g, t) => {
      const k = easeOut(t);
      smokePuff(g, x + Math.cos(ang) * 14 * k, y + Math.sin(ang) * 14 * k - k * 10, 2.5 + k * 4, (1 - t) * 0.45);
      flameTongue(g, ROCKET.flame, x, y, ang, 14 * (1 - t), 3.4 * (1 - t * 0.6), (1 - t) * 0.85, t * 3, seed);
      flameTongue(g, ROCKET.flameHot, x, y, ang, 7 * (1 - t), 1.6, (1 - t) * 0.9, t * 3, seed + 1);
    });
  }

  /** Arms out wide for balance in the air, or one hand thrown out to hold a grappled body. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold === 'ride') {
      const flap = Math.sin(this.t * 7 + side) * 0.14;
      return { ang: this.facing + side * (Math.PI / 2 - 0.2) + flap, dist: 38 + Math.sin(this.t * 7) * 2, scale: idle.scale * 1.1 };
    }
    if (hold === 'reach') {
      return side > 0
        ? { ang: this.holdAngle, dist: 44, scale: idle.scale * 1.25 }
        : { ang: this.holdAngle + Math.PI * 0.85, dist: 18, scale: idle.scale * 0.9 };
    }
    return null;
  }

  // ── Shared geometry ─────────────────────────────────────────────────────

  /** How hard the engines are burning: pilot on the floor, full in the air, sputtering in a fall. */
  private get thrust(): number {
    const sputter = this.fall > 0.2 ? 0.75 + 0.25 * Math.sin(this.t * 31) : 1;
    return (0.22 + this.air * 0.78 * (1 - this.fall * 0.55) * sputter) * (1 + this.flare * 0.35) * this.intensity;
  }

  /**
   * Straight down, leaned off the springy hands: they lag the body, so their drift is a free
   * read on which way the character is moving, and the exhaust trails behind it.
   */
  private exhaustAngle(x: number): number {
    const mean = (this.armX[0] + this.armX[1]) / 2;
    return Math.PI / 2 + Phaser.Math.Clamp((x - mean) * 0.012, -0.35, 0.35);
  }

  /** One engine plume: four shells and smoke trailing off the tip. */
  private plume(g: Phaser.GameObjects.Graphics, nx: number, ny: number, ang: number, len: number, w: number, a: number, seed: number): void {
    const t = this.t;
    flameTongue(g, ROCKET.flameDeep, nx, ny, ang, len * 1.05, w * 1.55, a * 0.32, t, seed);
    flameTongue(g, ROCKET.flame, nx, ny, ang, len, w, a * 0.85, t, seed + 1);
    flameTongue(g, ROCKET.flameMid, nx, ny, ang, len * 0.7, w * 0.66, a * 0.9, t, seed + 2);
    flameTongue(g, ROCKET.flameCore, nx, ny, ang, len * 0.38, w * 0.36, a, t, seed + 3);
    // Shock diamonds in a hard burn.
    if (this.air > 0.5 && len > 30) {
      for (let i = 1; i <= 2; i++) {
        const d = len * (0.28 + i * 0.2);
        g.fillStyle(ROCKET.flameCore, a * 0.5 * (1 - i * 0.3));
        g.fillEllipse(nx + Math.cos(ang) * d, ny + Math.sin(ang) * d, w * 0.7, w * 1.1);
      }
    }
  }

  // ── Layers ──────────────────────────────────────────────────────────────

  /**
   * Under the body: heat on the floor, the jetpack (or the booster fins) the suit stands in
   * front of, the exhaust pouring out of it, and smoke left hanging below a flier.
   */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const m = this.mastered;
    const th = this.thrust;
    g.fillStyle(ROCKET.flame, a * (0.2 + th * 0.12));
    g.fillCircle(x, y + 8, 28 + th * 8);

    const ang = this.exhaustAngle(x);
    if (!m) {
      // Jetpack: two tanks behind the shoulders.
      for (const s of [-1, 1]) {
        const tx = x + s * 17;
        g.fillStyle(ROCKET.steelDark, alpha);
        g.fillRoundedRect(tx - 6.5, y - 16, 13, 33, 6);
        g.fillStyle(ROCKET.steel, alpha);
        g.fillRoundedRect(tx - 5.5, y - 15, 10, 31, 5);
        g.fillStyle(ROCKET.steelLit, alpha * 0.8);
        g.fillRect(tx - 3.6 * s - 1, y - 12, 2, 24);
        g.fillStyle(ROCKET.hull, alpha);
        g.fillRect(tx - 5.5, y - 6, 10, 3.5);
        // Nozzle bell.
        g.fillStyle(ROCKET.steelDark, alpha);
        g.fillPoints([P(tx - 3, y + 15), P(tx + 3, y + 15), P(tx + 5, y + 22), P(tx - 5, y + 22)], true);
        g.fillStyle(ROCKET.flame, alpha * 0.9);
        g.fillEllipse(tx, y + 22, 9, 3);
        this.plume(g, tx, y + 22, ang, 9 + th * 34, 4.6 + th * 1.6, alpha * Math.min(1, 0.6 + th), s * 3);
      }
    } else {
      // Swept fins either side of the hull.
      for (const s of [-1, 1]) {
        const fin = [P(x + s * 17, y - 2), P(x + s * 31, y + 16), P(x + s * 33, y + 30), P(x + s * 19, y + 22)];
        g.fillStyle(ROCKET.hullShade, alpha);
        g.fillPoints(fin.map((p) => P(p.x + s * 1.2, p.y + 1.5)), true);
        g.fillStyle(ROCKET.hull, alpha);
        g.fillPoints(fin, true);
        g.lineStyle(1.4, ROCKET.hullLit, alpha * 0.8);
        g.lineBetween(x + s * 17, y - 2, x + s * 31, y + 16);
      }
      // Booster cluster: three bells under the skirt.
      for (let i = -1; i <= 1; i++) {
        const nx = x + i * 11;
        const ny = y + 26 + (i === 0 ? 2 : 0);
        g.fillStyle(ROCKET.steelDark, alpha);
        g.fillPoints([P(nx - 3.5, ny - 6), P(nx + 3.5, ny - 6), P(nx + 6, ny), P(nx - 6, ny)], true);
        g.fillStyle(ROCKET.steel, alpha * 0.8);
        g.fillRect(nx - 3.5, ny - 6, 2, 5);
        g.fillStyle(ROCKET.flameMid, alpha);
        g.fillEllipse(nx, ny, 11, 3.4);
        this.plume(g, nx, ny, ang, 12 + th * 44, 5.6 + th * 2, alpha * Math.min(1, 0.65 + th), i * 5 + 11);
      }
    }

    // A flier leaves smoke hanging under it.
    if (this.air > 0.05) {
      for (let i = 0; i < 5; i++) {
        const k = (this.t * 1.4 + i / 5) % 1;
        const ox = Math.sin(i * 2.7 + this.t * 0.8) * 12;
        smokePuff(g, x + ox, y + 34 + k * 40, 4 + k * 8, this.air * (1 - k) * 0.4);
      }
    }
  }

  /** The suit (or the hull), painted over the sprite and under the eyes. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    if (this.mastered) this.drawHull(g, x, y, alpha);
    else this.drawSuit(g, x, y, alpha);
  }

  private drawSuit(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    // Boots.
    for (const s of [-1, 1]) {
      g.fillStyle(ROCKET.suitDeep, alpha);
      g.fillEllipse(x + s * 9, y + 23, 15, 8);
      g.fillStyle(ROCKET.suitShade, alpha);
      g.fillEllipse(x + s * 9 - 0.6, y + 22, 13, 6);
      g.fillStyle(ROCKET.steelDark, alpha);
      g.fillRect(x + s * 9 - 6, y + 24, 12, 1.6);
    }
    // Torso: a tapered block under the helmet.
    const torso = [
      P(x - 19, y + 4), P(x + 19, y + 4), P(x + 21, y + 13), P(x + 18, y + 22),
      P(x - 18, y + 22), P(x - 21, y + 13),
    ];
    g.fillStyle(ROCKET.suitDeep, alpha);
    g.fillPoints(torso.map((p) => P(p.x + 1.5, p.y + 1.5)), true);
    g.fillStyle(ROCKET.suit, alpha);
    g.fillPoints(torso, true);
    g.fillStyle(ROCKET.suitShade, alpha * 0.8);
    g.fillPoints([P(x + 8, y + 4), P(x + 19, y + 4), P(x + 21, y + 13), P(x + 18, y + 22), P(x + 10, y + 22)], true);
    // Belt and seams.
    g.fillStyle(ROCKET.steelDark, alpha);
    g.fillRect(x - 18.5, y + 19.5, 37, 2.4);
    g.fillStyle(ROCKET.steelLit, alpha);
    g.fillRect(x - 2.5, y + 19, 5, 3.4);
    g.lineStyle(1, ROCKET.suitDeep, alpha * 0.6);
    g.lineBetween(x - 15, y + 10, x - 16, y + 19);
    g.lineBetween(x + 15, y + 10, x + 16, y + 19);
    // A hose looping from the hip up into the helmet ring.
    g.lineStyle(2.2, ROCKET.suitDeep, alpha);
    g.beginPath();
    g.arc(x + 15, y + 11, 6, Math.PI * 0.6, Math.PI * 1.5);
    g.strokePath();

    // Helmet.
    const hy = y - 7;
    g.fillStyle(ROCKET.suitLine, alpha);
    g.fillCircle(x + 1, hy + 1, 19);
    g.fillStyle(ROCKET.suit, alpha);
    g.fillCircle(x, hy, 18);
    g.fillStyle(ROCKET.suitShade, alpha * 0.7);
    g.beginPath();
    g.arc(x, hy, 18, -Math.PI * 0.35, Math.PI * 0.55);
    g.lineTo(x + 6, hy + 4);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xffffff, alpha * 0.85);
    g.fillEllipse(x - 8, hy - 13, 7, 3.2);
    // Neck ring.
    g.fillStyle(ROCKET.steel, alpha);
    g.fillRoundedRect(x - 14, y + 9, 28, 3.4, 1.7);
    g.fillStyle(ROCKET.steelLit, alpha * 0.8);
    g.fillRect(x - 12, y + 9.4, 10, 1);

    // Chest control panel with blinking buttons.
    g.fillStyle(ROCKET.steelDark, alpha);
    g.fillRoundedRect(x - 3, y + 13, 14, 5.6, 1.5);
    const lights = [ROCKET.stop, ROCKET.go, ROCKET.hazard];
    for (let i = 0; i < 3; i++) {
      const on = Math.floor(this.t * 3 + i * 1.3) % 3 !== 0;
      g.fillStyle(on ? lights[i] : ROCKET.suitDeep, alpha);
      g.fillCircle(x + 0.8 + i * 3.6, y + 15.8, 1.25);
    }
    // Mission patch: a flame in a ring, over the heart.
    g.fillStyle(ROCKET.hullShade, alpha);
    g.fillCircle(x - 11, y + 15.5, 4.2);
    g.fillStyle(ROCKET.visor, alpha);
    g.fillCircle(x - 11, y + 15.5, 3.3);
    flameTongue(g, ROCKET.flame, x - 11, y + 17.5, -Math.PI / 2, 5.2, 1.8, alpha, this.t * 0.3, 2);
    flameTongue(g, ROCKET.flameHot, x - 11, y + 17.5, -Math.PI / 2, 2.8, 0.9, alpha, this.t * 0.3, 4);

    // Side lamps on the helmet.
    for (const s of [-1, 1]) {
      g.fillStyle(ROCKET.steelDark, alpha);
      g.fillRoundedRect(x + s * 18 - 3, hy - 3, 6, 9, 2);
      g.fillStyle(ROCKET.flameHot, alpha * (0.75 + 0.25 * Math.sin(this.t * 4 + s)));
      g.fillCircle(x + s * 18, hy - 0.5, 1.7);
    }
    // Visor — dark glass with a gold film; the rig's eyes look out through it.
    g.fillStyle(ROCKET.visorGold, alpha);
    g.fillEllipse(x, y - 4, 33, 21);
    g.fillStyle(ROCKET.visor, alpha);
    g.fillEllipse(x, y - 4, 29.5, 17.5);
    g.fillStyle(ROCKET.flame, alpha * 0.18);
    g.fillEllipse(x, y + 1, 24, 7);
    g.lineStyle(1.3, ROCKET.visorGlint, alpha * 0.7);
    g.beginPath();
    g.arc(x, y - 4, 13, Math.PI * 1.08, Math.PI * 1.36);
    g.strokePath();
  }

  private drawHull(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const top = y + HULL_TOP;
    const bot = y + HULL_BOT;
    const steps = 14;
    const side = (dir: number, scale = 1, dx = 0): Phaser.Geom.Point[] => {
      const pts: Phaser.Geom.Point[] = [];
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        pts.push(P(x + dx + dir * hullHalf(u) * scale, top + (bot - top) * u));
      }
      return pts;
    };
    const hull = (scale: number, dx = 0) => side(-1, scale, dx).concat(side(1, scale, dx).reverse());

    g.fillStyle(ROCKET.suitLine, alpha);
    g.fillPoints(hull(1.04, 1.5), true);
    g.fillStyle(ROCKET.suit, alpha);
    g.fillPoints(hull(1), true);
    // Shadow side.
    const shade: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      shade.push(P(x + hullHalf(u) * 0.42, top + (bot - top) * u));
    }
    g.fillStyle(ROCKET.suitShade, alpha * 0.85);
    g.fillPoints(shade.concat(side(1).reverse()), true);
    // Lit strip down the near side.
    g.fillStyle(0xffffff, alpha * 0.55);
    g.fillRoundedRect(x - 16, top + 6, 3, 30, 1.5);

    // Red bands: the collar under the nose cone and a skirt above the boosters.
    const band = (u0: number, u1: number, col: number) => {
      const y0 = top + (bot - top) * u0;
      const y1 = top + (bot - top) * u1;
      g.fillStyle(col, alpha);
      g.fillPoints([
        P(x - hullHalf(u0), y0), P(x + hullHalf(u0), y0), P(x + hullHalf(u1), y1), P(x - hullHalf(u1), y1),
      ], true);
    };
    band(0, 0.08, ROCKET.hull);
    band(0.78, 1, ROCKET.hull);
    band(0.92, 1, ROCKET.hullShade);
    // Checker blocks on the skirt, like a test vehicle.
    for (let i = -2; i <= 2; i++) {
      if ((i + 2) % 2) continue;
      g.fillStyle(ROCKET.suit, alpha * 0.9);
      g.fillRect(x + i * 7 - 3.5, top + (bot - top) * 0.8, 7, 4);
    }
    // Panel seams.
    g.lineStyle(1, ROCKET.suitDeep, alpha * 0.55);
    g.lineBetween(x - 20, y + 9, x + 20, y + 9);
    g.lineBetween(x - 12, y + 9, x - 12, y + 16);
    g.lineBetween(x + 12, y + 9, x + 12, y + 16);

    // Porthole: a riveted steel ring with the rig's eyes behind the glass.
    const py = y - 4;
    g.fillStyle(ROCKET.steelDark, alpha);
    g.fillCircle(x + 0.8, py + 0.8, 17.5);
    g.fillStyle(ROCKET.steel, alpha);
    g.fillCircle(x, py, 17);
    g.fillStyle(ROCKET.steelLit, alpha * 0.8);
    g.beginPath();
    g.arc(x, py, 17, Math.PI * 1.05, Math.PI * 1.6);
    g.arc(x, py, 15, Math.PI * 1.6, Math.PI * 1.05, true);
    g.closePath();
    g.fillPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + 0.3;
      g.fillStyle(ROCKET.steelDark, alpha);
      g.fillCircle(x + Math.cos(a) * 16, py + Math.sin(a) * 16, 0.9);
    }
    g.fillStyle(ROCKET.visor, alpha);
    g.fillCircle(x, py, 14.6);
    // Cockpit glow behind the eyes.
    g.fillStyle(ROCKET.flame, alpha * (0.22 + 0.06 * Math.sin(this.t * 5)));
    g.fillCircle(x, py + 4, 11);
    g.lineStyle(1.3, ROCKET.visorGlint, alpha * 0.65);
    g.beginPath();
    g.arc(x, py, 12.5, Math.PI * 1.1, Math.PI * 1.4);
    g.strokePath();

    // Centre fin in front of the boosters.
    g.fillStyle(ROCKET.hullShade, alpha);
    g.fillPoints([P(x - 2.5, bot - 6), P(x + 2.5, bot - 6), P(x + 3.5, bot + 6), P(x - 3.5, bot + 6)], true);
    g.fillStyle(ROCKET.hull, alpha);
    g.fillPoints([P(x - 1.6, bot - 6), P(x + 1.2, bot - 6), P(x + 2, bot + 5), P(x - 2.4, bot + 5)], true);
  }

  /**
   * Above the crown: the helmet antenna (or the nose cone), little burners on the gloves, and
   * the Eye when it is open.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const m = this.mastered;
    if (!m) {
      // Whip antenna off the helmet, blinking.
      const sway = Math.sin(this.t * 3) * 1.5 + this.air * 2;
      g.lineStyle(1.4, ROCKET.steelDark, alpha);
      g.lineBetween(x + 9, y - 22, x + 11 + sway, y - 36);
      g.fillStyle(ROCKET.steel, alpha);
      g.fillRect(x + 7, y - 24, 4, 3);
      const on = Math.floor(this.t * 2.2) % 2 === 0;
      if (on) {
        g.fillStyle(ROCKET.stop, alpha * 0.35);
        g.fillCircle(x + 11 + sway, y - 37, 4.5);
      }
      g.fillStyle(on ? ROCKET.stop : ROCKET.hullShade, alpha);
      g.fillCircle(x + 11 + sway, y - 37, 1.9);
    } else {
      this.drawNoseCone(g, x, y, alpha);
    }

    // Wrist burners: a lick of fire off the back of each glove.
    const back = this.facing + Math.PI;
    for (let h = 0; h < 2; h++) {
      const hx = this.armX[h], hy = this.armY[h];
      const len = (m ? 13 : 9) * (0.8 + this.air * 0.4 + this.flare * 0.5);
      const ang = back + (h ? 0.35 : -0.35);
      const ox = hx + Math.cos(ang) * 6;
      const oy = hy + Math.sin(ang) * 6;
      flameTongue(g, ROCKET.flame, ox, oy, ang, len, m ? 3.6 : 2.8, alpha * 0.75, this.t, h * 7);
      flameTongue(g, ROCKET.flameHot, ox, oy, ang, len * 0.55, m ? 1.8 : 1.3, alpha * 0.9, this.t, h * 7 + 2);
    }

    if (this.eye > 0.02) this.drawEye(g, x, y, alpha);
  }

  /** Mastered: the nose cone standing off the top of the hull, a white band and a strobe on the tip. */
  private drawNoseCone(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const base = y + HULL_TOP + 1;
    const tip = base - 28 - this.air * 2;
    const half = hullHalf(0);
    const cone = (s: number, dx = 0): Phaser.Geom.Point[] => {
      const pts: Phaser.Geom.Point[] = [];
      for (let i = 0; i <= 10; i++) {
        const u = i / 10;
        // Ogive: full width low, curving in to the point.
        const w = half * s * Math.sqrt(1 - u) * (1 - u * 0.15);
        pts.push(P(x + dx - w, base - (base - tip) * u));
      }
      for (let i = 10; i >= 0; i--) {
        const u = i / 10;
        const w = half * s * Math.sqrt(1 - u) * (1 - u * 0.15);
        pts.push(P(x + dx + w, base - (base - tip) * u));
      }
      return pts;
    };
    g.fillStyle(ROCKET.hullShade, alpha);
    g.fillPoints(cone(1.04, 1.2), true);
    g.fillStyle(ROCKET.hull, alpha);
    g.fillPoints(cone(1), true);
    g.fillStyle(ROCKET.hullLit, alpha * 0.7);
    g.fillPoints(cone(0.45, -5), true);
    // White band across the cone.
    const by = base - (base - tip) * 0.32;
    const bw = half * Math.sqrt(1 - 0.32) * (1 - 0.32 * 0.15);
    g.fillStyle(ROCKET.suit, alpha);
    g.fillRect(x - bw, by - 1.5, bw * 2, 3);
    // Strobe.
    const on = Math.floor(this.t * 2.6) % 2 === 0;
    if (on) {
      g.fillStyle(ROCKET.stop, alpha * 0.35);
      g.fillCircle(x, tip - 1, 6);
    }
    g.fillStyle(on ? ROCKET.stop : ROCKET.hullShade, alpha);
    g.fillCircle(x, tip - 0.5, 2.2);
  }

  /** The Eye, Rocket-style: a white-hot sun of an eye, iris on the aim, fire licking off its rim. */
  private drawEye(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const k = easeOut(this.eye);
    const R = 21 * k;
    const look = this.facing;
    // Flames off the rim first, so the eye sits in a corona.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + this.t * 0.8;
      const len = (10 + Math.sin(this.t * 7 + i * 1.9) * 4) * k;
      flameTongue(g, ROCKET.flame, x + Math.cos(a) * R * 0.9, y + Math.sin(a) * R * 0.8, a, len, 4 * k, alpha * k * 0.8, this.t, i);
      flameTongue(g, ROCKET.flameHot, x + Math.cos(a) * R * 0.9, y + Math.sin(a) * R * 0.8, a, len * 0.5, 2 * k, alpha * k * 0.9, this.t, i + 3);
    }
    g.fillStyle(ROCKET.scorch, alpha * 0.9 * k);
    g.fillCircle(x, y, R + 2);
    g.fillStyle(ROCKET.flameCore, alpha * k);
    g.fillEllipse(x, y, R * 2, R * 1.7);
    const ix = x + Math.cos(look) * 4.5 * k;
    const iy = y + Math.sin(look) * 3.5 * k;
    g.fillStyle(ROCKET.flameDeep, alpha * k);
    g.fillCircle(ix, iy, 11.5 * k);
    g.fillStyle(ROCKET.flame, alpha * k);
    g.fillCircle(ix, iy, 9.5 * k);
    g.lineStyle(1.2, ROCKET.flameHot, alpha * k * 0.7);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + this.t * 2.2;
      g.lineBetween(ix + Math.cos(a) * 4 * k, iy + Math.sin(a) * 4 * k, ix + Math.cos(a) * 9 * k, iy + Math.sin(a) * 9 * k);
    }
    g.fillStyle(ROCKET.scorch, alpha * k);
    g.fillCircle(ix + Math.cos(look) * 1.5, iy + Math.sin(look) * 1.2, 4.6 * k);
    g.fillStyle(0xffffff, alpha * k * 0.9);
    g.fillCircle(ix - 3.5 * k, iy - 3.5 * k, 1.8 * k);
  }
}
