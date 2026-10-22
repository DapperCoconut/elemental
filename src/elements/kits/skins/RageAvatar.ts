import Phaser from 'phaser';
import { ArmHold, ArmPose, AvatarSpec, BaseAvatar, ColorFn, FxBase } from '../ElementVisuals';
import { RAGE, drawAngerMark, rageMark, rageSteam } from './RageFx';

/**
 * The Rage skin's character: electricity's live wire replaced by a red-hot brute who is filled
 * with fury where the current used to be.
 *
 * **Unmastered** — a stocky, bald, crimson bruiser: heavy brow ground down over the eyes, teeth
 * gritted, veins standing out on his temples, steam puffing off his scalp, and red-hot fists.
 * **Mastered** — he swells: a hulking hunched frame with shoulder mounds that rise past his
 * ears, molten fissures splitting his chest, a crown of searing flame for hair and a vein mark
 * throbbing on each temple.
 *
 * He gets angrier when hurt. The kit feeds `setHealth` every frame; each drop in HP spikes his
 * fury (shaking, a vein mark popping, a blast of steam) and the HP he has lost keeps him
 * simmering hotter for the rest of the fight. Purely visual — nothing here touches gameplay.
 */

/** Red-hot fists — heat haze, the fist, its lit knuckles, a glint off-centre. */
const RAGE_AVATAR: AvatarSpec = {
  hands: [
    { r: 10.5, color: RAGE.red, alpha: 0.28 },
    { r: 6.9, color: RAGE.skin, alpha: 1 },
    { r: 4.4, color: RAGE.skinLit, alpha: 1 },
    { r: 1.9, color: RAGE.flare, alpha: 0.95, ox: -1.6, oy: -1.8 },
  ],
  eyeWhite: RAGE.white,
  eyePupil: RAGE.char,
  // Heavy fists — they swing hard but don't smear like plasma.
  squash: { div: 15, x: 0.4, y: 0.22 },
};

const BASE_Y = 23;

/** A tween-backed Fx with no colour mapping — the rig's palette is already final. */
class RageRigFx extends FxBase {
  constructor(scene: Phaser.Scene) {
    super(scene, (c) => c);
  }
}

function lerpColor(a: number, b: number, t: number): number {
  const k = Phaser.Math.Clamp(t, 0, 1);
  const r = ((a >> 16) & 0xff) + ((((b >> 16) & 0xff) - ((a >> 16) & 0xff)) * k);
  const g = ((a >> 8) & 0xff) + ((((b >> 8) & 0xff) - ((a >> 8) & 0xff)) * k);
  const bl = (a & 0xff) + (((b & 0xff) - (a & 0xff)) * k);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}

/**
 * The brute's silhouette, point by point: a domed crown, a brow ridge, cheeks swelling out to
 * heavy shoulders and a thick neck-less trunk narrowing to the base. `bulk` widens it (mastered).
 */
function bruteOutline(x: number, y: number, top: number, bulk: number): Phaser.Geom.Point[] {
  // Half-width at height fraction u (0 = crown, 1 = base).
  const half = (u: number): number => {
    if (u < 0.22) return (8 + 70 * u) * bulk;            // dome
    if (u < 0.55) return (23.4 + 6 * (u - 0.22)) * bulk;  // cheeks / jaw
    if (u < 0.75) return (25.4 + 2 * Math.sin((u - 0.55) * 15)) * bulk; // shoulders
    return (25.4 - (u - 0.75) * 30) * bulk;              // trunk tapering to the base
  };
  const steps = 14;
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    pts.push(new Phaser.Geom.Point(x - half(u), y + top + (BASE_Y - top) * u));
  }
  for (let i = steps; i >= 0; i--) {
    const u = i / steps;
    pts.push(new Phaser.Geom.Point(x + half(u), y + top + (BASE_Y - top) * u));
  }
  return pts;
}

/** One tongue of the mastered flame-hair: a tapered teardrop built point by point. */
function flameTongue(
  g: Phaser.GameObjects.Graphics, x: number, y: number, h: number, w: number, lean: number,
): void {
  const steps = 10;
  const pts: Phaser.Geom.Point[] = [];
  const half = (u: number) => w * Math.pow(Math.sin(Math.PI * (0.25 + 0.75 * u)), 0.9);
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    pts.push(new Phaser.Geom.Point(x + lean * u * u - half(u), y - h * u));
  }
  for (let i = steps; i >= 0; i--) {
    const u = i / steps;
    pts.push(new Phaser.Geom.Point(x + lean * u * u + half(u), y - h * u));
  }
  g.fillPoints(pts, true);
}

export class RageAvatar extends BaseAvatar {
  private fx: RageRigFx;
  /** Spike of anger from a fresh hit, 0–1, decaying. */
  private fury = 0;
  /** Fraction of HP lost — the slow simmer. */
  private hurt = 0;
  private lastHp = -1;
  private lastX = 0;
  private lastY = 0;
  private provokedAt = -1;

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, RAGE_AVATAR);
    this.fx = new RageRigFx(scene);
  }

  /**
   * Feed the fighter's HP every frame. A drop provokes him; what he has lost keeps him hot.
   * Kits that never call this get a merely furious character, which is still correct.
   */
  setHealth(hp: number, maxHp: number): void {
    this.hurt = maxHp > 0 ? Phaser.Math.Clamp(1 - hp / maxHp, 0, 1) : 0;
    if (this.lastHp >= 0 && hp < this.lastHp - 0.5) this.provoke(this.lastHp - hp);
    this.lastHp = hp;
  }

  /** How dare you. */
  private provoke(dmg: number): void {
    this.fury = Math.min(1, this.fury + 0.2 + dmg / 25);
    if (this.t - this.provokedAt < 0.28) return;
    this.provokedAt = this.t;
    const top = this.topY;
    rageMark(this.fx, this.lastX + 16 + Math.random() * 6, this.lastY + top - 6, 5 + this.fury * 3, 9);
    rageSteam(this.fx, this.lastX, this.lastY + top, 3 + Math.round(this.fury * 4), {
      spread: 12, rise: 30, size: 4, life: 650, depth: 8,
    });
  }

  /** 0 calm-ish … ~1.5 incandescent. */
  private get anger(): number {
    return Phaser.Math.Clamp(0.15 + this.hurt * 0.55 + this.fury + (this.intensity - 1) * 0.6, 0, 1.6);
  }

  private get topY(): number { return this.mastered ? -27 : -22; }
  private get bulk(): number { return this.mastered ? 1.14 : 1; }

  /** Glowing eyes and bigger, hotter fists when mastered. */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? RAGE.flare : RAGE.white);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 14 : 10.5);
      halo.setFillStyle(on ? RAGE.searing : RAGE.red, on ? 0.32 : 0.28);
    });
    this.forEachHandLayer(1, (fist) => {
      fist.setRadius(on ? 8.2 : 6.9);
      if (on) fist.setStrokeStyle(1.6, RAGE.hot, 0.9);
      else fist.setStrokeStyle();
    });
  }

  /** Swinging fists shed steam. */
  protected emitTrail(x: number, y: number): void {
    rageSteam(this.fx, x, y, 1, { spread: 3, rise: 18, size: 2.4, life: 420, depth: 5 });
  }

  /** Pain Battery's brace: fists hauled in to the chest, shaking with the effort of holding it in. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    return {
      ang: this.facing + Math.PI + side * 0.5 + (Math.random() - 0.5) * 0.24,
      dist: 14 + Math.random() * 3,
      scale: idle.scale * 1.25,
    };
  }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.lastX = x;
    this.lastY = y;
    this.fury = Math.max(0, this.fury - (delta / 1000) * 0.4);
    super.update(delta, x, y, alpha);
  }

  /** Where the eyes are this frame — same formula BaseAvatar places them with. */
  private eyePos(x: number, y: number, side: number): { x: number; y: number } {
    const look = this.facing;
    const bob = Math.sin(this.t * 2.6) * 1.1;
    return { x: x + side * 7.2 + Math.cos(look) * 2.4, y: y - 4 + Math.sin(look) * 2.0 + bob };
  }

  /** Shudder, when he's this angry. */
  private jitter(): number {
    const k = Math.max(0, this.anger - 0.6);
    return k > 0 ? (Math.random() - 0.5) * k * 2.4 : 0;
  }

  // ── Layers ──────────────────────────────────────────────────────────────

  /** Heat pooling on the floor round him; mastered, a scorched ring and a shimmer. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const k = this.intensity * (0.85 + this.anger * 0.3);
    const beat = 0.92 + 0.08 * Math.sin(this.t * (5 + this.anger * 6));
    g.fillStyle(RAGE.crimson, a * 0.2 * k);
    g.fillEllipse(x, y + 10, 64 * k * beat, 28 * k * beat);
    g.fillStyle(RAGE.hot, a * 0.16 * k);
    g.fillEllipse(x, y + 10, 38 * k, 16 * k);
    if (this.mastered) {
      g.fillStyle(RAGE.char, a * 0.5);
      g.fillEllipse(x, y + BASE_Y + 3, 78, 22);
      g.lineStyle(2.4, RAGE.searing, a * 0.55 * beat);
      g.strokeEllipse(x, y + BASE_Y + 3, 80, 24);
      // Heat shimmer rising off him.
      for (let i = 0; i < 6; i++) {
        const p = (this.t * 0.8 + i / 6) % 1;
        const sx = x + Math.cos(i * 1.7) * 30;
        g.lineStyle(1.6, RAGE.flare, a * 0.3 * (1 - p));
        g.beginPath();
        g.arc(sx + Math.sin(this.t * 4 + i) * 3, y + 12 - p * 34, 4, Math.PI * 1.1, Math.PI * 1.9, false);
        g.strokePath();
      }
    }
  }

  /** The brute himself: trunk, shoulders, veins, chest fissures and the gritted teeth. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x0: number, y: number, _a: number, alpha: number): void {
    const x = x0 + this.jitter();
    const top = this.topY;
    const bulk = this.bulk;
    const heat = Phaser.Math.Clamp(this.anger / 1.4, 0, 1);
    const skin = lerpColor(RAGE.skin, RAGE.skinLit, heat * 0.6);
    const lit = lerpColor(RAGE.skinLit, RAGE.skinHi, heat);

    if (this.mastered) this.drawShoulders(g, x, y, alpha, skin, lit);

    // Shadow side, body, lit band down the front-left.
    g.fillStyle(RAGE.skinDeep, alpha);
    g.fillPoints(bruteOutline(x + 2.5, y + 1, top + 1, bulk), true);
    g.fillStyle(skin, alpha);
    g.fillPoints(bruteOutline(x, y, top, bulk), true);
    g.fillStyle(lit, alpha * 0.55);
    g.fillPoints(bruteOutline(x - 7, y - 1, top + 4, bulk * 0.45), true);
    // Feet planted in the heat.
    g.fillStyle(RAGE.skinDeep, alpha);
    g.fillEllipse(x, y + BASE_Y, 40 * bulk, 9);

    // Brow ridge shading — the forehead knots down over the eyes.
    g.fillStyle(RAGE.skinDeep, alpha * 0.55);
    g.fillEllipse(x, y - 11, 34 * bulk, 7);

    // Temple veins, throbbing with his pulse.
    const pulse = 0.55 + 0.45 * Math.max(0, Math.sin(this.t * (6 + this.anger * 8)));
    const vw = 1.3 + heat * 1.3 + pulse * 0.6;
    for (const side of [-1, 1]) {
      g.lineStyle(vw + 1.2, RAGE.skinDeep, alpha * 0.6);
      this.vein(g, x, y, side, top);
      g.lineStyle(vw, lerpColor(RAGE.crimson, RAGE.vein, pulse * (0.4 + heat * 0.6)), alpha);
      this.vein(g, x, y, side, top);
    }

    // Chest: a vein forking down from the collarbone; mastered, molten fissures.
    g.lineStyle(1.4 + heat, lerpColor(RAGE.crimson, RAGE.vein, heat), alpha * 0.85);
    g.beginPath();
    g.moveTo(x - 4, y + 13);
    g.lineTo(x - 8, y + 17);
    g.lineTo(x - 7, y + 21);
    g.moveTo(x - 8, y + 17);
    g.lineTo(x - 13, y + 19);
    g.strokePath();
    if (this.mastered) {
      const glow = 0.6 + 0.4 * Math.sin(this.t * 7);
      for (const [pts, w] of [
        [[[x + 4, y + 12], [x + 9, y + 16], [x + 7, y + 20], [x + 12, y + 23]], 2.6],
        [[[x + 9, y + 16], [x + 16, y + 15], [x + 21, y + 18]], 2],
        [[[x - 18, y + 9], [x - 14, y + 13], [x - 19, y + 18]], 2],
      ] as [number[][], number][]) {
        g.lineStyle(w + 2.2, RAGE.char, alpha * 0.7);
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
        g.strokePath();
        g.lineStyle(w, RAGE.searing, alpha * glow);
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
        g.strokePath();
        g.lineStyle(w * 0.4, RAGE.white, alpha * glow);
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
        g.strokePath();
      }
    }

    this.drawMouth(g, x, y, alpha, heat);
  }

  /** A forked vein climbing the temple, kept outside the eyes. */
  private vein(g: Phaser.GameObjects.Graphics, x: number, y: number, side: number, top: number): void {
    const bx = x + side * 15, by = y - 9;
    g.beginPath();
    g.moveTo(bx, by);
    g.lineTo(bx + side * 1.5, by - 4);
    g.lineTo(bx - side * 0.5, by - 8);
    g.lineTo(bx + side * 1, Math.max(y + top + 4, by - 12));
    g.moveTo(bx + side * 1.5, by - 4);
    g.lineTo(bx + side * 5, by - 6);
    g.strokePath();
  }

  /** Clenched teeth in a snarl: dark slot, a row of teeth, the corners dragged down. */
  private drawMouth(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number, heat: number): void {
    const my = y + 7;
    const w = 17 + heat * 3;
    const h = 6.4;
    g.fillStyle(RAGE.char, alpha);
    g.fillPoints([
      new Phaser.Geom.Point(x - w / 2 - 2, my + 2.6),
      new Phaser.Geom.Point(x - w / 2, my - h / 2),
      new Phaser.Geom.Point(x + w / 2, my - h / 2),
      new Phaser.Geom.Point(x + w / 2 + 2, my + 2.6),
      new Phaser.Geom.Point(x + w / 2, my + h / 2 + 0.6),
      new Phaser.Geom.Point(x - w / 2, my + h / 2 + 0.6),
    ], true);
    g.fillStyle(RAGE.tooth, alpha);
    g.fillRect(x - w / 2 + 1, my - h / 2 + 1, w - 2, h - 1.6);
    g.fillStyle(RAGE.toothShade, alpha);
    g.fillRect(x - w / 2 + 1, my + 0.2, w - 2, h / 2 - 1);
    // The bite line and the gaps between teeth.
    g.lineStyle(1, RAGE.char, alpha);
    g.lineBetween(x - w / 2 + 1, my + 0.2, x + w / 2 - 1, my + 0.2);
    for (let i = 1; i < 6; i++) {
      const tx = x - w / 2 + 1 + (w - 2) * (i / 6);
      g.lineBetween(tx, my - h / 2 + 1, tx, my + h / 2 - 0.6);
    }
    // Snarl lines pulling down from the corners.
    g.lineStyle(1.4, RAGE.skinDeep, alpha * 0.9);
    g.lineBetween(x - w / 2 - 2, my + 2.6, x - w / 2 - 4.5, my + 6);
    g.lineBetween(x + w / 2 + 2, my + 2.6, x + w / 2 + 4.5, my + 6);
  }

  /** Mastered: two massive shoulder mounds hunched up past his ears. */
  private drawShoulders(
    g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number, skin: number, lit: number,
  ): void {
    const heave = Math.sin(this.t * 3) * 1.2;
    for (const side of [-1, 1]) {
      const cx = x + side * 25, cy = y - 6 + heave;
      const pts: Phaser.Geom.Point[] = [];
      // A lumpy dome: wide at the base, peaking high and inboard.
      for (let i = 0; i <= 12; i++) {
        const u = i / 12;
        const a = Math.PI + u * Math.PI;
        const r = 15 + Math.sin(u * Math.PI) * 4;
        pts.push(new Phaser.Geom.Point(
          cx + Math.cos(a) * r * 0.95 - side * Math.sin(u * Math.PI) * 4,
          cy + Math.sin(a) * r * 1.3,
        ));
      }
      pts.push(new Phaser.Geom.Point(cx + 14, cy + 16), new Phaser.Geom.Point(cx - 14, cy + 16));
      g.fillStyle(RAGE.skinDeep, alpha);
      g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x + 2, p.y + 2)), true);
      g.fillStyle(skin, alpha);
      g.fillPoints(pts, true);
      g.fillStyle(lit, alpha * 0.6);
      g.fillEllipse(cx - side * 3 - 3, cy - 12, 12, 8);
      // A molten seam across each mound.
      g.lineStyle(1.8, RAGE.searing, alpha * (0.6 + 0.4 * Math.sin(this.t * 6 + side)));
      g.beginPath();
      g.moveTo(cx - 8, cy - 6);
      g.lineTo(cx - 2, cy - 10);
      g.lineTo(cx + 4, cy - 7);
      g.lineTo(cx + 9, cy - 11);
      g.strokePath();
    }
  }

  /**
   * Over everything: the brow (ground down over the eyes), knuckles, steam off the scalp, the
   * vein marks and — mastered — the crown of flame. Only the brow sits near the face, and it
   * stops at the top of the eyes.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x0: number, y: number, a: number, alpha: number): void {
    const x = x0;
    const top = this.topY;
    const heat = Phaser.Math.Clamp(this.anger / 1.4, 0, 1);

    // Brows: thick wedges slanting down to the nose, lower and steeper the angrier he gets.
    for (const side of [-1, 1]) {
      const e = this.eyePos(x, y, side);
      const drop = 1 + heat * 1.6;
      const outer = { x: e.x + side * 6, y: e.y - 6.8 - heat * 0.6 };
      const inner = { x: e.x - side * 4.8, y: e.y - 4.6 + drop * 0.4 };
      g.fillStyle(RAGE.char, alpha);
      g.fillPoints([
        new Phaser.Geom.Point(outer.x, outer.y - 2.4),
        new Phaser.Geom.Point(inner.x, inner.y - 3.2),
        new Phaser.Geom.Point(inner.x - side * 0.6, inner.y + 0.4),
        new Phaser.Geom.Point(outer.x, outer.y + 0.8),
      ], true);
      g.lineStyle(1, RAGE.crimson, alpha * 0.8);
      g.lineBetween(outer.x, outer.y - 2.4, inner.x, inner.y - 3.2);
    }
    // The furrow between them.
    g.lineStyle(1.3, RAGE.skinDeep, alpha);
    g.lineBetween(x - 1.4, y - 13, x - 0.6, y - 9.5);
    g.lineBetween(x + 1.4, y - 13, x + 0.6, y - 9.5);

    // Knuckles on each fist, facing the way he's punching.
    for (let i = 0; i < 2; i++) {
      const hx = this.armX[i], hy = this.armY[i];
      const f = this.facing;
      const r = this.mastered ? 8.2 : 6.9;
      for (let k = -1; k <= 1; k++) {
        const ka = f + k * 0.55;
        g.fillStyle(RAGE.skinHi, alpha * 0.9);
        g.fillCircle(hx + Math.cos(ka) * r * 0.62, hy + Math.sin(ka) * r * 0.62, 1.7);
      }
      g.lineStyle(1.1, RAGE.skinDeep, alpha * 0.9);
      g.beginPath();
      g.arc(hx, hy, r * 0.42, f - 1.1, f + 1.1, false);
      g.strokePath();
    }

    // Steam rising off the scalp, heavier the angrier he is.
    const puffs = 2 + Math.round(heat * 4);
    for (let i = 0; i < puffs; i++) {
      const p = (this.t * (0.7 + heat * 0.9) + i / puffs) % 1;
      const side = i % 2 === 0 ? -1 : 1;
      const sx = x + side * (5 + (i % 3) * 4) + Math.sin(this.t * 3 + i) * 3 * p;
      const sy = y + top - 2 - p * (22 + heat * 10);
      const r = (2.4 + p * 5) * (0.8 + heat * 0.4);
      g.fillStyle(RAGE.steamDim, alpha * 0.25 * (1 - p));
      g.fillCircle(sx + 1, sy + 1, r);
      g.fillStyle(RAGE.steam, alpha * 0.42 * (1 - p));
      g.fillCircle(sx, sy, r * 0.85);
    }

    if (this.mastered) this.drawFlameHair(g, x, y + top + 3, a, alpha, heat);

    // Vein marks throbbing on the temple (both, mastered). Rooted above the crown line.
    const beat = 1 + 0.18 * Math.max(0, Math.sin(this.t * (7 + heat * 8)));
    const markS = (3.6 + heat * 2.2) * beat;
    drawAngerMark(g, x + 17, y - 21 - (this.mastered ? 4 : 0), markS, RAGE.hot, alpha * (0.55 + heat * 0.45));
    if (this.mastered || heat > 0.7) {
      drawAngerMark(g, x - 18, y - 24 - (this.mastered ? 4 : 0), markS * 0.85, RAGE.searing, alpha * (0.5 + heat * 0.5));
    }
  }

  /** Mastered: a crown of searing flame erupting from his skull. */
  private drawFlameHair(
    g: Phaser.GameObjects.Graphics, x: number, rootY: number, a: number, alpha: number, heat: number,
  ): void {
    const lean = Phaser.Math.Clamp(((this.armX[0] + this.armX[1]) / 2 - x) * 0.4, -7, 7);
    g.fillStyle(RAGE.hot, a * 0.22);
    g.fillEllipse(x, rootY - 12, 46, 32);
    const tongues = [
      { ox: -11, h: 15, w: 4.6, ph: 0 },
      { ox: -5, h: 22, w: 5.6, ph: 1.3 },
      { ox: 1, h: 27, w: 6.4, ph: 2.6 },
      { ox: 7, h: 21, w: 5.4, ph: 3.9 },
      { ox: 12, h: 14, w: 4.4, ph: 5.1 },
    ];
    for (const tg of tongues) {
      const flick = 1 + Math.sin(this.t * 11 + tg.ph) * 0.12 + Math.sin(this.t * 17 + tg.ph * 2) * 0.06;
      const h = tg.h * flick * (1 + heat * 0.25) * this.intensity;
      const tx = x + tg.ox;
      const l = lean + Math.sin(this.t * 5 + tg.ph) * 2;
      g.fillStyle(RAGE.crimson, alpha * 0.85);
      flameTongue(g, tx, rootY, h * 1.08, tg.w * 1.2, l);
      g.fillStyle(RAGE.hot, alpha * 0.9);
      flameTongue(g, tx, rootY, h, tg.w, l);
      g.fillStyle(RAGE.flare, alpha * 0.9);
      flameTongue(g, tx, rootY - 1, h * 0.6, tg.w * 0.55, l * 0.7);
      g.fillStyle(RAGE.white, alpha * 0.8);
      flameTongue(g, tx, rootY - 1, h * 0.28, tg.w * 0.3, l * 0.4);
    }
    // Embers spitting off the top.
    for (let i = 0; i < 3; i++) {
      const p = (this.t * (1.2 + i * 0.3) + i * 0.33) % 1;
      const ex = x + Math.sin(this.t * 4 + i * 2.1) * 10 + lean * (1 + p);
      const ey = rootY - 26 - p * 18;
      g.fillStyle(RAGE.flare, alpha * 0.8 * (1 - p));
      g.fillCircle(ex, ey, 1.8 * (1 - p * 0.5));
    }
  }
}
