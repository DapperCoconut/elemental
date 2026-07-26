import Phaser from 'phaser';

/**
 * Art for the Disgraced King fight.
 *
 * Follows the same convention as the element visual kits (EarthVisuals,
 * CreationVisuals, …): a frozen palette plus static per-frame draw helpers that
 * take a Graphics and paint into it. Nothing here owns state, holds a texture,
 * or reads the arena — DisgracedKingKit decides where everything is and calls
 * in for the rendering.
 *
 * The two halves of the fight share one palette on purpose. The mech is the
 * King's armour writ enormous, so the same iron, the same violet and the same
 * broken-crown gold run through both phases.
 */

/**
 * Deliberately not `as const`: literal types leak into every default parameter
 * that takes one of these (`color = KING.violet` would then only accept that
 * exact number). Same reasoning as the UI theme's `C`.
 */
export const KING: Record<
  | 'voidBlack' | 'iron' | 'ironLit' | 'plate' | 'plateLit' | 'rivet' | 'bone'
  | 'ember' | 'emberLit' | 'violet' | 'violetLit' | 'gloom' | 'gold' | 'goldLit'
  | 'warn' | 'warnLit',
  number
> = {
  /** The black inside a seam. */
  voidBlack: 0x07050c,
  iron:      0x1b1622,
  ironLit:   0x2b2437,
  plate:     0x3a3049,
  plateLit:  0x4e4166,
  rivet:     0x6b5b88,
  /** Pale highlight — bone, eye-light, cloak edge. */
  bone:      0xcfc4e8,
  /** Molten seams in the mech's plating. */
  ember:     0xff4d2a,
  emberLit:  0xff9a4d,
  /** The King's own colour. */
  violet:    0x7b3fd4,
  violetLit: 0xb98cff,
  gloom:     0x2a1240,
  /** The broken crown. */
  gold:      0xffc44d,
  goldLit:   0xffe9a8,
  /** Telegraphs. */
  warn:      0xff2244,
  warnLit:   0xff8899,
};

// ── Mech metrics ──────────────────────────────────────────────────────
// The machine is built around the top of the screen so it looms over the
// playfield without standing in it. Only the head is ever a hitbox.

/** Head centre, measured from the top of the arena. */
export const MECH_HEAD_CY = 104;
export const MECH_HEAD_RX = 92;
export const MECH_HEAD_RY = 80;
/**
 * Radius of the head's physics body — the only part of the machine that can be
 * hurt. Sits just inside the drawn helm so the hitbox never extends past the
 * art, and the target bracket below is drawn around *this*, not around the
 * helm, so the "hit here" cue is literally the hitbox.
 */
export const MECH_HEAD_HIT_R = 80;

const TORSO_TOP = 158;
const TORSO_BOT = 342;
const TORSO_HW_TOP = 196;
const TORSO_HW_BOT = 150;
const SHOULDER_Y = 178;
const SHOULDER_DX = 258;

/** Where a fist hangs when the arm is doing nothing. */
export const MECH_FIST_REST_DX = 344;
export const MECH_FIST_REST_Y = 404;

/** Stable per-vertex jitter, so the mech's silhouette never crawls between frames. */
export const JITTER = [1.03, 0.95, 1.06, 0.92, 1.04, 0.97, 1.08, 0.94, 1.02, 0.96, 1.05, 0.93];

export function mixC(a: number, b: number, t: number): number {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  const k = Phaser.Math.Clamp(t, 0, 1);
  return ((Math.round(ca.red + (cb.red - ca.red) * k) << 16)
    | (Math.round(ca.green + (cb.green - ca.green) * k) << 8)
    | Math.round(ca.blue + (cb.blue - ca.blue) * k));
}

export interface MechPose {
  /** Arena centre x — the machine is always centred on it. */
  cx: number;
  /** 0–1. Drives how much molten damage shows through the plating. */
  hpRatio: number;
  /** Rising anger below half health: brighter seams, faster pulse. */
  enraged: boolean;
  /** Set once the mech is dead — everything goes cold and slumps. */
  dead: boolean;
  /** Seconds-ish clock for idle motion. */
  time: number;
}

export interface MechArmPose {
  side: -1 | 1;
  fistX: number;
  fistY: number;
  /** Raised or striking arms glow at the knuckles. */
  hot: boolean;
}

export class DisgracedFx {
  // ── The hall ────────────────────────────────────────────────────────

  /**
   * The floor of the throne room the fight happens in: a cracked flagstone
   * field running back to a dais, with two rows of broken columns. Painted once
   * at match start and left alone.
   */
  static drawHall(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
    // Ground wash, darkest at the back so the mech reads against it.
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      g.fillStyle(mixC(0x0a0810, KING.gloom, 0.10 + t * 0.10), 1);
      g.fillRect(0, (h / steps) * i, w, h / steps + 1);
    }

    // Flagstones in perspective — horizontals bunch toward the back wall.
    // Fixed row count with a squared falloff: a shrinking-gap `while` loop reads
    // naturally here but never terminates, since a geometric gap converges long
    // before it has covered the floor.
    const backY = h * 0.34;
    const ROWS = 11;
    g.lineStyle(1, mixC(KING.iron, KING.violet, 0.25), 0.32);
    for (let i = 1; i <= ROWS; i++) {
      const t = i / ROWS;
      const y = backY + (h - backY) * t * t;
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.strokePath();
    }
    for (let i = -8; i <= 8; i++) {
      const bx = w / 2 + i * 96;
      g.beginPath();
      g.moveTo(w / 2 + (bx - w / 2) * 0.30, h * 0.34);
      g.lineTo(bx, h);
      g.strokePath();
    }

    // Long carpet up the middle to the dais — the only warm thing in the room.
    g.fillStyle(mixC(0x2a0a18, KING.gloom, 0.3), 0.4);
    g.fillPoints([
      new Phaser.Geom.Point(w / 2 - 44, h * 0.34),
      new Phaser.Geom.Point(w / 2 + 44, h * 0.34),
      new Phaser.Geom.Point(w / 2 + 132, h),
      new Phaser.Geom.Point(w / 2 - 132, h),
    ], true, true);
    g.lineStyle(1, KING.gold, 0.12);
    g.beginPath();
    g.moveTo(w / 2 - 40, h * 0.34); g.lineTo(w / 2 - 122, h);
    g.moveTo(w / 2 + 40, h * 0.34); g.lineTo(w / 2 + 122, h);
    g.strokePath();

    // Broken columns down both flanks, snapped at different heights.
    const columns: Array<[number, number]> = [
      [70, 210], [w - 70, 240], [172, 150], [w - 172, 170],
    ];
    for (const [colX, colH] of columns) {
      const base = h * 0.62;
      g.fillStyle(KING.iron, 1);
      g.fillRect(colX - 20, base - colH, 40, colH);
      g.fillStyle(KING.ironLit, 1);
      g.fillRect(colX - 20, base - colH, 13, colH);
      // Snapped top — a jagged bite out of the shaft.
      g.fillStyle(mixC(0x0a0810, KING.gloom, 0.15), 1);
      g.fillTriangle(colX - 20, base - colH, colX + 20, base - colH, colX - 4, base - colH + 22);
      // Plinth.
      g.fillStyle(KING.plate, 1);
      g.fillRect(colX - 30, base - 12, 60, 14);
      g.lineStyle(1, KING.rivet, 0.4);
      g.strokeRect(colX - 30, base - 12, 60, 14);
      // Rubble where the rest of it landed.
      g.fillStyle(KING.iron, 0.85);
      g.fillCircle(colX - 34, base + 6, 9);
      g.fillCircle(colX + 30, base + 10, 7);
      g.fillCircle(colX + 8, base + 14, 5);
    }

    // Cracks radiating from the centre of the floor.
    g.lineStyle(1.5, KING.voidBlack, 0.55);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.4;
      let px = w / 2;
      let py = h * 0.78;
      g.beginPath(); g.moveTo(px, py);
      for (let k = 0; k < 5; k++) {
        px += Math.cos(a) * 42 + JITTER[(i + k) % JITTER.length] * 14 - 14;
        py += Math.sin(a) * 26 + JITTER[(i + k * 2) % JITTER.length] * 10 - 10;
        g.lineTo(px, py);
      }
      g.strokePath();
    }
  }

  // ── The mech ────────────────────────────────────────────────────────

  /**
   * Chassis, legs and shoulders. Drawn behind the fighters so the machine reads
   * as standing at the back of the hall rather than in the middle of the fight.
   */
  static drawMechBody(g: Phaser.GameObjects.Graphics, p: MechPose): void {
    g.clear();
    const { cx } = p;
    const breathe = p.dead ? 0 : Math.sin(p.time / 900) * 4;
    const heat = p.dead ? 0 : (p.enraged ? 0.85 : 0.4) * (0.7 + 0.3 * Math.sin(p.time / (p.enraged ? 150 : 320)));

    // ── Legs — splayed columns disappearing off the bottom of the arena.
    for (const side of [-1, 1] as const) {
      const hipX = cx + side * 96;
      const hipY = TORSO_BOT - 10 + breathe;
      DisgracedFx.plate(g, hipX, hipY, hipX + side * 150, hipY + 210, 54, 40, p.dead);
      // Knee housing.
      g.fillStyle(p.dead ? KING.iron : KING.plate, 1);
      g.fillCircle(hipX + side * 150, hipY + 210, 40);
      g.lineStyle(4, KING.voidBlack, 1);
      g.strokeCircle(hipX + side * 150, hipY + 210, 40);
      g.fillStyle(KING.ironLit, 1);
      g.fillCircle(hipX + side * 150 - side * 10, hipY + 196, 16);
    }

    // ── Torso — a tapering slab of riveted plate.
    const torsoTop = TORSO_TOP + breathe;
    const torsoBot = TORSO_BOT + breathe;
    const body = [
      new Phaser.Geom.Point(cx - TORSO_HW_TOP, torsoTop),
      new Phaser.Geom.Point(cx + TORSO_HW_TOP, torsoTop),
      new Phaser.Geom.Point(cx + TORSO_HW_BOT, torsoBot),
      new Phaser.Geom.Point(cx - TORSO_HW_BOT, torsoBot),
    ];
    g.fillStyle(p.dead ? KING.iron : KING.plate, 1);
    g.fillPoints(body, true, true);
    g.lineStyle(6, KING.voidBlack, 1);
    g.strokePoints(body, true, true);

    // Lit left flank, so the slab has a light source.
    g.fillStyle(p.dead ? KING.ironLit : KING.plateLit, 1);
    g.fillPoints([
      new Phaser.Geom.Point(cx - TORSO_HW_TOP, torsoTop),
      new Phaser.Geom.Point(cx - TORSO_HW_TOP + 62, torsoTop),
      new Phaser.Geom.Point(cx - TORSO_HW_BOT + 48, torsoBot),
      new Phaser.Geom.Point(cx - TORSO_HW_BOT, torsoBot),
    ], true, true);

    // Horizontal armour bands with rivets — the mech's ribs.
    for (let i = 0; i < 4; i++) {
      const by = torsoTop + 30 + i * 42;
      const hw = Phaser.Math.Linear(TORSO_HW_TOP, TORSO_HW_BOT, (by - torsoTop) / (torsoBot - torsoTop)) - 8;
      g.lineStyle(3, KING.voidBlack, 0.85);
      g.lineBetween(cx - hw, by, cx + hw, by);
      g.fillStyle(KING.rivet, 0.9);
      for (let k = -2; k <= 2; k++) g.fillCircle(cx + k * (hw / 2.6), by - 7, 3.5);
    }

    // The reactor: a caged furnace in the chest that brightens as the mech dies.
    const coreY = torsoTop + 96;
    if (!p.dead) {
      const bleed = 1 - p.hpRatio;
      for (let k = 6; k >= 1; k--) {
        g.fillStyle(KING.ember, 0.05 * heat * (1 + bleed));
        g.fillCircle(cx, coreY, 26 + k * 9);
      }
      g.fillStyle(mixC(KING.ember, KING.emberLit, heat), 0.85);
      g.fillCircle(cx, coreY, 26);
      g.fillStyle(KING.goldLit, 0.6 * heat);
      g.fillCircle(cx, coreY, 13);
    } else {
      g.fillStyle(KING.voidBlack, 1);
      g.fillCircle(cx, coreY, 26);
    }
    g.lineStyle(5, KING.iron, 1);
    g.strokeCircle(cx, coreY, 32);
    g.lineStyle(4, KING.voidBlack, 1);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI + Math.PI / 8;
      g.lineBetween(cx - Math.cos(a) * 32, coreY - Math.sin(a) * 32, cx + Math.cos(a) * 32, coreY + Math.sin(a) * 32);
    }

    // Battle damage: seams split open across the plating as HP drops.
    const seams = Math.round((1 - p.hpRatio) * 5);
    g.lineStyle(3, p.dead ? KING.voidBlack : mixC(KING.ember, KING.emberLit, heat), p.dead ? 1 : 0.5 + 0.35 * heat);
    for (let i = 0; i < seams; i++) {
      const sy = torsoTop + 40 + i * 52;
      const dir = i % 2 === 0 ? -1 : 1;
      g.beginPath();
      g.moveTo(cx + dir * 30, sy);
      g.lineTo(cx + dir * 84, sy + 20);
      g.lineTo(cx + dir * 58, sy + 44);
      g.lineTo(cx + dir * 122, sy + 60);
      g.strokePath();
    }

    // ── Shoulders — hulking pauldrons the arms hang off.
    for (const side of [-1, 1] as const) {
      const sx = cx + side * SHOULDER_DX;
      const sy = SHOULDER_Y + breathe;
      const pts: Phaser.Geom.Point[] = [];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        pts.push(new Phaser.Geom.Point(
          sx + Math.cos(a) * 82 * JITTER[i % JITTER.length],
          sy + Math.sin(a) * 66 * JITTER[(i + 4) % JITTER.length],
        ));
      }
      g.fillStyle(p.dead ? KING.iron : KING.plate, 1);
      g.fillPoints(pts, true, true);
      g.lineStyle(6, KING.voidBlack, 1);
      g.strokePoints(pts, true, true);
      // Fluting across the pauldron.
      g.lineStyle(3, KING.ironLit, 0.7);
      for (let i = -1; i <= 1; i++) {
        g.lineBetween(sx + i * 26 - side * 14, sy - 50, sx + i * 26 + side * 14, sy + 50);
      }
      // Spike on the outer edge.
      g.fillStyle(KING.ironLit, 1);
      g.fillTriangle(sx + side * 60, sy - 30, sx + side * 60, sy + 20, sx + side * 118, sy - 10);
      g.lineStyle(4, KING.voidBlack, 1);
      g.strokeTriangle(sx + side * 60, sy - 30, sx + side * 60, sy + 20, sx + side * 118, sy - 10);
    }
  }

  /**
   * The head — the only part of the machine that can be hurt, so it is the most
   * legible thing on screen: a lit cockpit visor in a heavy helm, with a target
   * bracket around it while the mech lives.
   */
  static drawMechHead(g: Phaser.GameObjects.Graphics, p: MechPose, hurtFlash: number): void {
    g.clear();
    const cx = p.cx + (p.dead ? 0 : Math.sin(p.time / 1100) * 5);
    const cy = MECH_HEAD_CY + (p.dead ? 26 : Math.sin(p.time / 800) * 3);
    const pulse = p.dead ? 0 : 0.7 + 0.3 * Math.sin(p.time / (p.enraged ? 130 : 240));

    // Neck stack, disappearing behind the torso.
    g.fillStyle(KING.iron, 1);
    g.fillRect(cx - 40, cy + 40, 80, 70);
    g.lineStyle(4, KING.voidBlack, 1);
    g.strokeRect(cx - 40, cy + 40, 80, 70);

    // Helm — an octagonal casque rather than a circle, so it reads as machined.
    const helm: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      helm.push(new Phaser.Geom.Point(cx + Math.cos(a) * MECH_HEAD_RX, cy + Math.sin(a) * MECH_HEAD_RY));
    }
    g.fillStyle(p.dead ? KING.iron : KING.plate, 1);
    g.fillPoints(helm, true, true);
    g.lineStyle(6, KING.voidBlack, 1);
    g.strokePoints(helm, true, true);

    // Lit crown of the helm.
    g.fillStyle(p.dead ? KING.ironLit : KING.plateLit, 1);
    g.fillPoints([
      new Phaser.Geom.Point(cx - MECH_HEAD_RX * 0.82, cy - MECH_HEAD_RY * 0.36),
      new Phaser.Geom.Point(cx - MECH_HEAD_RX * 0.32, cy - MECH_HEAD_RY * 0.94),
      new Phaser.Geom.Point(cx + MECH_HEAD_RX * 0.32, cy - MECH_HEAD_RY * 0.94),
      new Phaser.Geom.Point(cx + MECH_HEAD_RX * 0.82, cy - MECH_HEAD_RY * 0.36),
      new Phaser.Geom.Point(cx, cy - MECH_HEAD_RY * 0.30),
    ], true, true);

    // Visor — one wide slit, banked with lamps.
    const visorY = cy + 8;
    g.fillStyle(KING.voidBlack, 1);
    g.fillRect(cx - 70, visorY - 15, 140, 30);
    if (!p.dead) {
      for (let k = 4; k >= 1; k--) {
        g.fillStyle(KING.ember, 0.06 * pulse);
        g.fillRect(cx - 70 - k * 5, visorY - 15 - k * 3, 140 + k * 10, 30 + k * 6);
      }
      g.fillStyle(mixC(KING.ember, KING.emberLit, pulse), 0.95);
      g.fillRect(cx - 64, visorY - 8, 128, 16);
      g.fillStyle(KING.goldLit, pulse);
      for (let i = 0; i < 5; i++) g.fillRect(cx - 56 + i * 26, visorY - 4, 12, 8);
    } else {
      // Dead: the visor is dark and cracked.
      g.lineStyle(2, KING.iron, 0.9);
      g.lineBetween(cx - 60, visorY - 12, cx - 20, visorY + 12);
      g.lineBetween(cx - 20, visorY + 12, cx + 24, visorY - 10);
    }
    g.lineStyle(4, KING.iron, 1);
    g.strokeRect(cx - 70, visorY - 15, 140, 30);

    // Jaw grille.
    g.fillStyle(KING.iron, 1);
    g.fillRect(cx - 48, cy + 34, 96, 22);
    g.lineStyle(2, KING.voidBlack, 1);
    for (let i = 0; i < 6; i++) g.lineBetween(cx - 44 + i * 17, cy + 34, cx - 44 + i * 17, cy + 56);

    // Antler vents flaring off the helm.
    for (const side of [-1, 1] as const) {
      g.lineStyle(6, KING.iron, 1);
      g.beginPath();
      g.moveTo(cx + side * 74, cy - 42);
      g.lineTo(cx + side * 124, cy - 70);
      g.lineTo(cx + side * 148, cy - 40);
      g.strokePath();
    }

    if (p.dead) return;

    // Target bracket — the one unmissable "hit here" cue in phase one. Sized to
    // the physics body, so what it frames is exactly what can be hit.
    const bracket = mixC(KING.warn, KING.warnLit, 0.4 + 0.4 * Math.sin(p.time / 400));
    g.lineStyle(2, bracket, 0.55);
    const bw = MECH_HEAD_HIT_R + 14;
    const bh = MECH_HEAD_HIT_R + 14;
    // A faint ring on the hit radius itself — the outline of what you're shooting.
    g.lineStyle(1, bracket, 0.22);
    g.strokeCircle(cx, cy, MECH_HEAD_HIT_R);
    g.lineStyle(2, bracket, 0.55);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      g.beginPath();
      g.moveTo(cx + sx * bw, cy + sy * bh - sy * 22);
      g.lineTo(cx + sx * bw, cy + sy * bh);
      g.lineTo(cx + sx * bw - sx * 22, cy + sy * bh);
      g.strokePath();
    }

    // Hit flash — a white wash over the helm on a landed shot.
    if (hurtFlash > 0) {
      g.fillStyle(0xffffff, 0.5 * hurtFlash);
      g.fillPoints(helm, true, true);
    }
  }

  /** Both arms: shoulder → elbow → fist, with a lit knuckle when raised. */
  static drawMechArms(g: Phaser.GameObjects.Graphics, p: MechPose, arms: MechArmPose[]): void {
    g.clear();
    if (p.dead) return;

    for (const a of arms) {
      const shX = p.cx + a.side * SHOULDER_DX;
      const shY = SHOULDER_Y;
      // Elbow bows outward from the shoulder–fist line so the limb bends.
      const ex = (shX + a.fistX) / 2 + a.side * 58;
      const ey = (shY + a.fistY) / 2;

      DisgracedFx.plate(g, shX, shY, ex, ey, 46, 38, false);
      DisgracedFx.plate(g, ex, ey, a.fistX, a.fistY, 38, 32, false);

      // Elbow joint.
      g.fillStyle(KING.plate, 1);
      g.fillCircle(ex, ey, 40);
      g.lineStyle(5, KING.voidBlack, 1);
      g.strokeCircle(ex, ey, 40);
      g.fillStyle(KING.plateLit, 1);
      g.fillCircle(ex - a.side * 10, ey - 12, 15);

      // Fist — a knuckled block, not a ball.
      const r = 46;
      const fist: Phaser.Geom.Point[] = [];
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2;
        fist.push(new Phaser.Geom.Point(
          a.fistX + Math.cos(ang) * r * JITTER[i % JITTER.length],
          a.fistY + Math.sin(ang) * r * JITTER[(i + 5) % JITTER.length],
        ));
      }
      g.fillStyle(KING.plate, 1);
      g.fillPoints(fist, true, true);
      g.lineStyle(5, KING.voidBlack, 1);
      g.strokePoints(fist, true, true);
      g.fillStyle(KING.ironLit, 1);
      for (let k = 0; k < 4; k++) g.fillCircle(a.fistX - 27 + k * 18, a.fistY - 18, 10);

      if (a.hot) {
        for (let k = 4; k >= 1; k--) {
          g.lineStyle(3, KING.ember, 0.10 * (5 - k) * (0.6 + 0.4 * Math.sin(p.time / 90)));
          g.strokeCircle(a.fistX, a.fistY, r + k * 7);
        }
      }
    }
  }

  /**
   * A tapering armour segment between two joints, with plate seams across it.
   *
   * `protected` rather than private so `DevouredFx` — which subclasses this
   * whole kit to repaint the fight for hard mode — can build limbs the same way.
   */
  protected static plate(
    g: Phaser.GameObjects.Graphics,
    x1: number, y1: number, x2: number, y2: number,
    w1: number, w2: number, dead: boolean,
  ): void {
    const a = Math.atan2(y2 - y1, x2 - x1);
    const nx = Math.cos(a + Math.PI / 2);
    const ny = Math.sin(a + Math.PI / 2);
    const quad = [
      new Phaser.Geom.Point(x1 + nx * w1, y1 + ny * w1),
      new Phaser.Geom.Point(x2 + nx * w2, y2 + ny * w2),
      new Phaser.Geom.Point(x2 - nx * w2, y2 - ny * w2),
      new Phaser.Geom.Point(x1 - nx * w1, y1 - ny * w1),
    ];
    g.fillStyle(dead ? KING.iron : KING.plate, 1);
    g.fillPoints(quad, true, true);
    g.lineStyle(5, KING.voidBlack, 1);
    g.strokePoints(quad, true, true);
    g.lineStyle(2.5, KING.ironLit, 0.8);
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      const px = Phaser.Math.Linear(x1, x2, t);
      const py = Phaser.Math.Linear(y1, y2, t);
      const pw = Phaser.Math.Linear(w1, w2, t) * 0.9;
      g.lineBetween(px + nx * pw, py + ny * pw, px - nx * pw, py - ny * pw);
    }
  }

  // ── Telegraphs ──────────────────────────────────────────────────────

  /**
   * Laser column warning, then the beam. `charge` runs 0→1 through the warning
   * and `fire` 0→1 through the beam itself; only one is ever non-zero.
   */
  static drawLaserColumn(
    g: Phaser.GameObjects.Graphics,
    x: number, top: number, bottom: number, halfWidth: number,
    charge: number, fire: number, time: number,
  ): void {
    g.clear();
    const h = bottom - top;

    if (charge > 0) {
      // Three hard pulses rather than a smooth ramp — a flash you can count.
      const beat = Math.abs(Math.sin(charge * Math.PI * 3));
      g.fillStyle(KING.warn, 0.10 + 0.20 * beat * charge);
      g.fillRect(x - halfWidth, top, halfWidth * 2, h);
      g.lineStyle(2, mixC(KING.warn, KING.warnLit, beat), 0.5 + 0.45 * charge);
      g.strokeRect(x - halfWidth, top, halfWidth * 2, h);
      // Hazard chevrons down both edges.
      g.lineStyle(2, KING.warnLit, 0.25 + 0.4 * beat);
      for (let y = top + 14; y < bottom; y += 34) {
        g.beginPath();
        g.moveTo(x - halfWidth, y); g.lineTo(x - halfWidth + 11, y + 11); g.lineTo(x - halfWidth, y + 22);
        g.moveTo(x + halfWidth, y); g.lineTo(x + halfWidth - 11, y + 11); g.lineTo(x + halfWidth, y + 22);
        g.strokePath();
      }
      return;
    }

    if (fire <= 0) return;
    // Beam: a white core inside a fat ember sheath, collapsing as it ends.
    const k = 1 - fire;
    for (let i = 5; i >= 1; i--) {
      g.fillStyle(KING.ember, 0.10 * i * k);
      g.fillRect(x - halfWidth * (1 + i * 0.14), top, halfWidth * 2 * (1 + i * 0.14), h);
    }
    g.fillStyle(KING.emberLit, 0.9 * k);
    g.fillRect(x - halfWidth * 0.7, top, halfWidth * 1.4, h);
    g.fillStyle(0xffffff, k);
    g.fillRect(x - halfWidth * 0.3, top, halfWidth * 0.6, h);
    // Impact bloom where the beam meets the floor.
    g.fillStyle(KING.emberLit, 0.5 * k);
    g.fillEllipse(x, bottom, halfWidth * 5, 40);
    void time;
  }

  /** Ground reticle for an incoming rocket. `t` runs 0→1 as it falls. */
  static drawRocketMarker(
    g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, t: number,
  ): void {
    const shrink = radius * (1.9 - 0.9 * t);
    g.lineStyle(2, KING.warn, 0.35 + 0.5 * t);
    g.strokeCircle(x, y, radius);
    g.lineStyle(2, mixC(KING.warn, KING.warnLit, t), 0.85);
    g.strokeCircle(x, y, shrink);
    g.fillStyle(KING.warn, 0.10 + 0.22 * t);
    g.fillCircle(x, y, radius);
    // Crosshair ticks.
    g.lineStyle(2, KING.warnLit, 0.6);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      g.lineBetween(x + dx * radius * 0.55, y + dy * radius * 0.55, x + dx * radius, y + dy * radius);
    }
  }

  /** A rocket in flight: a stubby shell with a flame tail. */
  static drawRocket(
    g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number, time: number,
  ): void {
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const px = -ny;
    const py = nx;
    // Exhaust, flickering behind it.
    const flame = 18 + Math.abs(Math.sin(time / 45)) * 14;
    g.fillStyle(KING.ember, 0.75);
    g.fillTriangle(x - nx * 10 + px * 7, y - ny * 10 + py * 7, x - nx * 10 - px * 7, y - ny * 10 - py * 7,
      x - nx * flame, y - ny * flame);
    g.fillStyle(KING.goldLit, 0.8);
    g.fillTriangle(x - nx * 10 + px * 3.5, y - ny * 10 + py * 3.5, x - nx * 10 - px * 3.5, y - ny * 10 - py * 3.5,
      x - nx * flame * 0.55, y - ny * flame * 0.55);
    // Body + nose.
    g.fillStyle(KING.plate, 1);
    g.fillPoints([
      new Phaser.Geom.Point(x + nx * 16, y + ny * 16),
      new Phaser.Geom.Point(x + px * 7, y + py * 7),
      new Phaser.Geom.Point(x - nx * 11 + px * 7, y - ny * 11 + py * 7),
      new Phaser.Geom.Point(x - nx * 11 - px * 7, y - ny * 11 - py * 7),
      new Phaser.Geom.Point(x - px * 7, y - py * 7),
    ], true, true);
    g.lineStyle(2, KING.voidBlack, 1);
    g.strokePoints([
      new Phaser.Geom.Point(x + nx * 16, y + ny * 16),
      new Phaser.Geom.Point(x + px * 7, y + py * 7),
      new Phaser.Geom.Point(x - nx * 11 + px * 7, y - ny * 11 + py * 7),
      new Phaser.Geom.Point(x - nx * 11 - px * 7, y - ny * 11 - py * 7),
      new Phaser.Geom.Point(x - px * 7, y - py * 7),
    ], true, true);
    // Fins.
    g.fillStyle(KING.ironLit, 1);
    g.fillTriangle(x - nx * 9 + px * 7, y - ny * 9 + py * 7, x - nx * 9 + px * 14, y - ny * 9 + py * 14,
      x - nx * 1 + px * 7, y - ny * 1 + py * 7);
    g.fillTriangle(x - nx * 9 - px * 7, y - ny * 9 - py * 7, x - nx * 9 - px * 14, y - ny * 9 - py * 14,
      x - nx * 1 - px * 7, y - ny * 1 - py * 7);
  }

  /** Machine-gun round — a hot tracer, drawn along its own heading. */
  static drawBullet(g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number): void {
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    g.fillStyle(KING.ember, 0.35);
    g.fillEllipse(x - nx * 8, y - ny * 8, 20, 6);
    g.fillStyle(KING.emberLit, 0.95);
    g.fillCircle(x, y, 3.6);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(x + nx * 1.2, y + ny * 1.2, 1.8);
  }

  /** Slam warning: a growing circle with a rotating ring of teeth. */
  static drawSlamMarker(
    g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, t: number, time: number,
  ): void {
    g.fillStyle(KING.warn, 0.08 + 0.20 * t);
    g.fillCircle(x, y, radius);
    g.lineStyle(3, mixC(KING.warn, KING.warnLit, t), 0.9);
    g.strokeCircle(x, y, radius);
    // Inner ring closes as the fist falls — the actual countdown.
    g.lineStyle(4, KING.warnLit, 0.85);
    g.strokeCircle(x, y, radius * (1 - t * 0.86) + 6);
    const spin = time / 400;
    g.lineStyle(3, KING.warn, 0.5 + 0.4 * t);
    for (let i = 0; i < 10; i++) {
      const a = spin + (i / 10) * Math.PI * 2;
      g.lineBetween(
        x + Math.cos(a) * radius * 0.86, y + Math.sin(a) * radius * 0.86,
        x + Math.cos(a) * radius, y + Math.sin(a) * radius,
      );
    }
  }

  // ── Mech: the extended arsenal ──────────────────────────────────────

  /**
   * Judgement Arc, warning half: the wedge the lance is about to scythe through,
   * with the leading edge drawn hard so the direction of travel is obvious.
   */
  static drawSweepFan(
    g: Phaser.GameObjects.Graphics,
    ox: number, oy: number, a0: number, a1: number, len: number,
    charge: number, time: number,
  ): void {
    const beat = Math.abs(Math.sin(charge * Math.PI * 3));
    const steps = 26;
    const pts: Phaser.Geom.Point[] = [new Phaser.Geom.Point(ox, oy)];
    for (let i = 0; i <= steps; i++) {
      const a = Phaser.Math.Linear(a0, a1, i / steps);
      pts.push(new Phaser.Geom.Point(ox + Math.cos(a) * len, oy + Math.sin(a) * len));
    }
    g.fillStyle(KING.warn, 0.07 + 0.13 * charge);
    g.fillPoints(pts, true, true);
    g.lineStyle(2, mixC(KING.warn, KING.warnLit, beat), 0.35 + 0.45 * charge);
    g.strokePoints(pts, true, true);

    // Leading edge — the side the beam starts from, drawn as a solid rail.
    g.lineStyle(4, KING.warnLit, 0.55 + 0.4 * beat);
    g.lineBetween(ox, oy, ox + Math.cos(a0) * len, oy + Math.sin(a0) * len);
    // Sweep arrows along the arc, pointing the way it travels.
    const dir = Math.sign(a1 - a0) || 1;
    g.lineStyle(2, KING.warnLit, 0.30 + 0.35 * beat);
    for (let i = 1; i < 6; i++) {
      const a = Phaser.Math.Linear(a0, a1, i / 6);
      const r = len * (0.32 + i * 0.10);
      const tipX = ox + Math.cos(a) * r;
      const tipY = oy + Math.sin(a) * r;
      const back = a - dir * 0.14;
      g.lineBetween(tipX, tipY, ox + Math.cos(back) * (r - 14), oy + Math.sin(back) * (r - 14));
      g.lineBetween(tipX, tipY, ox + Math.cos(back) * (r + 14), oy + Math.sin(back) * (r + 14));
    }
    void time;
  }

  /** Judgement Arc, the beam itself — a lance of white in an ember sheath. */
  static drawSweepBeam(
    g: Phaser.GameObjects.Graphics,
    ox: number, oy: number, angle: number, len: number, halfW: number, time: number,
  ): void {
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const px = -ny;
    const py = nx;
    /** The beam as a quad that fans out slightly with distance. */
    const bar = (w: number, tipMult: number) => [
      new Phaser.Geom.Point(ox + px * w * 0.35, oy + py * w * 0.35),
      new Phaser.Geom.Point(ox + nx * len + px * w * tipMult, oy + ny * len + py * w * tipMult),
      new Phaser.Geom.Point(ox + nx * len - px * w * tipMult, oy + ny * len - py * w * tipMult),
      new Phaser.Geom.Point(ox - px * w * 0.35, oy - py * w * 0.35),
    ];
    for (let i = 4; i >= 1; i--) {
      g.fillStyle(KING.ember, 0.09 * i);
      g.fillPoints(bar(halfW * (1 + i * 0.35), 1.5), true, true);
    }
    g.fillStyle(KING.emberLit, 0.92);
    g.fillPoints(bar(halfW, 1.25), true, true);
    g.fillStyle(0xffffff, 0.95);
    g.fillPoints(bar(halfW * 0.42, 1.1), true, true);
    // Muzzle bloom at the head, and sparks shed off the beam's length.
    g.fillStyle(KING.goldLit, 0.5);
    g.fillCircle(ox, oy, halfW * 1.8);
    g.fillStyle(KING.goldLit, 0.7);
    for (let i = 0; i < 8; i++) {
      const t = ((time / 120 + i * 0.31) % 1);
      const r = len * t;
      const off = Math.sin(time / 60 + i * 2.1) * halfW * 1.7;
      g.fillCircle(ox + nx * r + px * off, oy + ny * r + py * off, 2.4);
    }
  }

  /**
   * A scatter charge on the floor. `arm` runs 0→1 while it is inert; at 1 the
   * trigger ring is live and the lamp strobes.
   */
  static drawMine(
    g: Phaser.GameObjects.Graphics, x: number, y: number, arm: number, triggerR: number, time: number,
  ): void {
    const live = arm >= 1;
    const blink = live ? 0.5 + 0.5 * Math.sin(time / 90) : 0.25 * arm;

    // Trigger footprint — dashed while arming, solid and breathing once live.
    const segs = 18;
    g.lineStyle(2, live ? mixC(KING.warn, KING.warnLit, blink) : KING.iron, live ? 0.55 : 0.30);
    for (let i = 0; i < segs; i++) {
      if (!live && i % 2 === 1) continue;
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2 / segs) * 0.68;
      g.beginPath();
      g.arc(x, y, triggerR * (live ? 1 + 0.02 * Math.sin(time / 220) : arm), a0, a1);
      g.strokePath();
    }
    if (live) {
      g.fillStyle(KING.warn, 0.05 + 0.05 * blink);
      g.fillCircle(x, y, triggerR);
    }

    // Three splayed legs pinning it to the flagstones.
    g.lineStyle(3, KING.iron, 1);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      g.lineBetween(x, y, x + Math.cos(a) * 15, y + Math.sin(a) * 9);
    }
    // Drum body, lit from the upper left.
    g.fillStyle(KING.voidBlack, 0.45);
    g.fillEllipse(x, y + 6, 26, 9);
    g.fillStyle(KING.ironLit, 1);
    g.fillEllipse(x, y, 22, 15);
    g.fillStyle(KING.plate, 1);
    g.fillEllipse(x - 2, y - 2, 17, 11);
    g.lineStyle(2, KING.voidBlack, 1);
    g.strokeEllipse(x, y, 22, 15);
    // Hazard band around the drum.
    g.lineStyle(2, mixC(KING.iron, KING.ember, 0.5), 0.8);
    g.lineBetween(x - 9, y + 3, x + 9, y + 3);
    // Lamp on top, plus its own glow when armed.
    if (live) {
      for (let k = 3; k >= 1; k--) {
        g.fillStyle(KING.warn, 0.10 * blink);
        g.fillCircle(x, y - 7, 4 + k * 4);
      }
    }
    g.fillStyle(live ? mixC(KING.warn, KING.warnLit, blink) : KING.iron, 1);
    g.fillCircle(x, y - 7, 4.5);
    g.fillStyle(KING.goldLit, live ? blink : 0.15);
    g.fillCircle(x - 1.2, y - 8.4, 1.8);
    // Prongs.
    g.lineStyle(2, KING.rivet, 0.9);
    g.lineBetween(x - 7, y - 6, x - 11, y - 13);
    g.lineBetween(x + 7, y - 6, x + 11, y - 13);
  }

  /**
   * One quake ring: a band of shattered floor racing outward, broken by the safe
   * wedge the mech's stance leaves open.
   */
  static drawShockRing(
    g: Phaser.GameObjects.Graphics,
    cx: number, cy: number, radius: number,
    gapCentre: number, gapHalf: number, time: number,
  ): void {
    if (radius <= 4) return;
    const from = gapCentre + gapHalf;
    const to = gapCentre + Math.PI * 2 - gapHalf;

    // Body of the wave — three stacked arcs, thickest at the front.
    for (let k = 3; k >= 1; k--) {
      g.lineStyle(6 + k * 7, KING.ember, 0.06);
      g.beginPath(); g.arc(cx, cy, radius, from, to); g.strokePath();
    }
    g.lineStyle(9, mixC(KING.ember, KING.emberLit, 0.4 + 0.4 * Math.sin(time / 110)), 0.85);
    g.beginPath(); g.arc(cx, cy, radius, from, to); g.strokePath();
    g.lineStyle(3, KING.goldLit, 0.9);
    g.beginPath(); g.arc(cx, cy, radius, from, to); g.strokePath();

    // Slabs of flagstone kicked up along the crest.
    const count = Math.max(8, Math.round(radius / 26));
    for (let i = 0; i < count; i++) {
      const a = from + ((to - from) * i) / count;
      const j = JITTER[i % JITTER.length];
      const r0 = radius - 10 * j;
      const r1 = radius + 14 * j;
      g.fillStyle(KING.iron, 0.75);
      g.fillTriangle(
        cx + Math.cos(a) * r0, cy + Math.sin(a) * r0,
        cx + Math.cos(a + 0.05) * r1, cy + Math.sin(a + 0.05) * r1,
        cx + Math.cos(a - 0.05) * r1, cy + Math.sin(a - 0.05) * r1,
      );
    }

    // The safe wedge, marked so it can be read at a glance.
    g.lineStyle(2, 0x67e8a0, 0.55);
    for (const edge of [gapCentre - gapHalf, gapCentre + gapHalf]) {
      g.lineBetween(
        cx + Math.cos(edge) * (radius - 26), cy + Math.sin(edge) * (radius - 26),
        cx + Math.cos(edge) * (radius + 26), cy + Math.sin(edge) * (radius + 26),
      );
    }
  }

  /** Crater left where a fist landed. Static — drawn once and left on the floor. */
  static drawCrater(g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number): void {
    g.fillStyle(KING.voidBlack, 0.5);
    g.fillEllipse(x, y, radius * 2, radius * 1.1);
    g.lineStyle(2, KING.iron, 0.7);
    g.strokeEllipse(x, y, radius * 2, radius * 1.1);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3;
      g.lineStyle(2, KING.voidBlack, 0.55);
      g.lineBetween(
        x + Math.cos(a) * radius * 0.8, y + Math.sin(a) * radius * 0.44,
        x + Math.cos(a) * radius * (1.3 + JITTER[i % JITTER.length] * 0.4),
        y + Math.sin(a) * radius * (0.7 + JITTER[i % JITTER.length] * 0.2),
      );
    }
  }

  // ── Healing orbs ────────────────────────────────────────────────────

  /** A dropped repair cell: a green core in a slowly-turning cage. */
  static drawHealOrb(g: Phaser.GameObjects.Graphics, x: number, y: number, time: number): void {
    const bob = Math.sin(time / 500) * 4;
    const oy = y + bob;
    for (let k = 5; k >= 1; k--) {
      g.fillStyle(0x4ade80, 0.05);
      g.fillCircle(x, oy, 10 + k * 5);
    }
    g.fillStyle(0x0e2a1a, 1);
    g.fillCircle(x, oy, 13);
    g.fillStyle(0x4ade80, 0.9);
    g.fillCircle(x, oy, 9);
    g.fillStyle(0xd8ffe8, 1);
    g.fillCircle(x - 3, oy - 3, 3.5);
    // Cage — two counter-rotating arcs.
    const spin = time / 700;
    g.lineStyle(2, 0x67e8a0, 0.8);
    for (let i = 0; i < 3; i++) {
      const a = spin + (i / 3) * Math.PI * 2;
      g.beginPath();
      g.arc(x, oy, 17, a, a + 1.1);
      g.strokePath();
    }
    // A cross, so it reads as a health pickup at a glance.
    g.fillStyle(0xd8ffe8, 0.95);
    g.fillRect(x - 5, oy - 1.5, 10, 3);
    g.fillRect(x - 1.5, oy - 5, 3, 10);
  }

  // ── The King ────────────────────────────────────────────────────────

  /**
   * The man himself: player-sized, in a heavy cloak whose hem never stops
   * moving. Everything about him is the mech's palette drained of its fire.
   *
   * `rise` runs 0→1 while he emerges from the wreck; below 1 he is drawn
   * partially sunk into the floor.
   */
  static drawKing(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, time: number,
    opts: { rise?: number; casting?: boolean; enthroned?: boolean; staggered?: boolean } = {},
  ): void {
    const rise = opts.rise ?? 1;
    const sway = Math.sin(time / 700) * 3;
    const stagger = opts.staggered ? Math.sin(time / 55) * 3 : 0;
    const cx = x + sway + stagger;
    const cy = y - (1 - rise) * 8;
    const R = 22;

    // Aura — a slow bruise of violet that thickens while he casts.
    const auraStr = opts.casting ? 0.10 : 0.055;
    for (let k = 7; k >= 1; k--) {
      g.fillStyle(KING.violet, auraStr * (0.35 + 0.65 * rise) * (0.75 + 0.25 * Math.sin(time / 480)));
      g.fillCircle(cx, cy, R + k * 6);
    }

    // Ground shadow, always at the true position so he stays planted.
    g.fillStyle(KING.voidBlack, 0.5 * rise);
    g.fillEllipse(x, y + R + 8, R * 2.3, R * 0.6);

    // Cloak: a bell with three tattered lobes, each on its own phase.
    const hemY = cy + R + 12 * rise;
    const lobe = (ox: number, w: number, phase: number, len: number) => {
      const t = Math.sin(time / (520 + phase * 130) + phase) * 7;
      g.fillTriangle(
        cx + ox - w, cy + 2,
        cx + ox + w, cy + 2,
        cx + ox + t, hemY + len * rise,
      );
    };
    g.fillStyle(KING.gloom, 1);
    lobe(-18, 16, 0, 30);
    lobe(0, 20, 1, 40);
    lobe(18, 16, 2, 28);
    g.fillStyle(mixC(KING.gloom, KING.violet, 0.22), 1);
    lobe(-9, 12, 3, 26);

    // Shoulders and body.
    g.fillStyle(KING.gloom, 1);
    g.fillEllipse(cx, cy + 6, R * 2.1, R * 1.7);
    g.lineStyle(3, KING.voidBlack, 1);
    g.strokeEllipse(cx, cy + 6, R * 2.1, R * 1.7);
    // Cloak edge catching the light down one side.
    g.lineStyle(2, KING.violetLit, 0.4);
    g.beginPath();
    g.moveTo(cx - R * 0.95, cy + 2);
    g.lineTo(cx - R * 0.5, cy - R * 0.7);
    g.strokePath();

    // Hood — a peak with deep shadow under it.
    g.fillStyle(mixC(KING.gloom, 0x000000, 0.35), 1);
    g.fillTriangle(cx - 17, cy - 2, cx + 17, cy - 2, cx, cy - R - 8);
    g.fillEllipse(cx, cy - 7, 30, 26);
    g.fillStyle(KING.voidBlack, 1);
    g.fillEllipse(cx, cy - 5, 22, 19);

    // Two pale eyes in the dark of the hood.
    const eyeGlow = 0.65 + 0.35 * Math.sin(time / 300);
    g.fillStyle(mixC(KING.bone, KING.violetLit, 0.4), eyeGlow * rise);
    g.fillEllipse(cx - 6, cy - 6, 5, 7);
    g.fillEllipse(cx + 6, cy - 6, 5, 7);
    g.fillStyle(0xffffff, 0.8 * eyeGlow * rise);
    g.fillEllipse(cx - 6, cy - 7, 2, 3);
    g.fillEllipse(cx + 6, cy - 7, 2, 3);

    // The broken crown, unless it has been thrown.
    if (!opts.enthroned) DisgracedFx.drawBrokenCrown(g, cx, cy - R - 6, 17, 1);

    // Hands: two motes of gathered dark, lifted while casting.
    const handY = opts.casting ? cy - 6 : cy + 8;
    for (const side of [-1, 1] as const) {
      const hx = cx + side * (opts.casting ? 24 : 20);
      g.fillStyle(KING.gloom, 1);
      g.fillCircle(hx, handY, 6);
      if (opts.casting) {
        for (let k = 3; k >= 1; k--) {
          g.fillStyle(KING.violetLit, 0.10 * (4 - k));
          g.fillCircle(hx, handY, 5 + k * 4);
        }
      }
    }
  }

  /** The crown itself — five peaks with the right-hand arm snapped off. */
  static drawBrokenCrown(
    g: Phaser.GameObjects.Graphics, x: number, y: number, halfWidth: number, alpha: number,
  ): void {
    const w = halfWidth;
    const pts = [
      new Phaser.Geom.Point(x - w, y + 6),
      new Phaser.Geom.Point(x - w, y - 3),
      new Phaser.Geom.Point(x - w * 0.5, y + 3),
      new Phaser.Geom.Point(x, y - 7),
      new Phaser.Geom.Point(x + w * 0.5, y + 3),
      new Phaser.Geom.Point(x + w * 0.82, y - 1),
      new Phaser.Geom.Point(x + w * 0.82, y + 6),
    ];
    g.fillStyle(mixC(KING.gold, 0x000000, 0.35), alpha);
    g.fillPoints(pts, true, true);
    g.lineStyle(2, KING.goldLit, alpha * 0.9);
    g.strokePoints(pts, true, false);
    // The snapped-off arm, hanging.
    g.lineStyle(2, mixC(KING.gold, 0x000000, 0.2), alpha * 0.7);
    g.lineBetween(x + w * 0.82, y + 6, x + w * 1.15, y + 11);
  }

  // ── The King's attacks ──────────────────────────────────────────────

  /** A homing dark-magic orb — a knot of violet with a trailing wake. */
  static drawDarkOrb(g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number, time: number): void {
    for (let k = 5; k >= 1; k--) {
      g.fillStyle(KING.violet, 0.06);
      g.fillCircle(x, y, 9 + k * 4);
    }
    // Wake, so its heading is readable before it commits to a turn.
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    for (let i = 1; i <= 4; i++) {
      g.fillStyle(KING.violet, 0.22 - i * 0.045);
      g.fillCircle(x - nx * i * 8, y - ny * i * 8, 8 - i * 1.3);
    }
    g.fillStyle(KING.gloom, 1);
    g.fillCircle(x, y, 10);
    g.fillStyle(KING.violet, 0.95);
    g.fillCircle(x, y, 7);
    g.fillStyle(KING.violetLit, 0.9);
    g.fillCircle(x, y, 3.5);
    // Two orbiting flecks, so a destructible orb looks fragile.
    const spin = time / 180;
    for (let i = 0; i < 2; i++) {
      const a = spin + i * Math.PI;
      g.fillStyle(KING.bone, 0.75);
      g.fillCircle(x + Math.cos(a) * 12, y + Math.sin(a) * 12, 2);
    }
  }

  /**
   * One Purge lane. `charge` 0→1 is the warning band; `fire` 0→1 is the
   * eruption. Vertical lanes are drawn by swapping the axis at the call site.
   */
  static drawPurgeLane(
    g: Phaser.GameObjects.Graphics,
    horizontal: boolean, centre: number, halfSpan: number,
    from: number, to: number, charge: number, fire: number, time: number,
  ): void {
    /** Fills the band `thickness` either side of the lane's spine. */
    const band = (thickness: number) => {
      if (horizontal) g.fillRect(from, centre - thickness, to - from, thickness * 2);
      else g.fillRect(centre - thickness, from, thickness * 2, to - from);
    };

    if (charge > 0) {
      const beat = Math.abs(Math.sin(charge * Math.PI * 3));
      g.fillStyle(KING.gloom, 0.20 + 0.28 * charge);
      band(halfSpan);
      g.lineStyle(2, mixC(KING.violet, KING.violetLit, beat), 0.5 + 0.4 * charge);
      if (horizontal) {
        g.lineBetween(from, centre - halfSpan, to, centre - halfSpan);
        g.lineBetween(from, centre + halfSpan, to, centre + halfSpan);
      } else {
        g.lineBetween(centre - halfSpan, from, centre - halfSpan, to);
        g.lineBetween(centre + halfSpan, from, centre + halfSpan, to);
      }
      // Runes crawling down the band while it charges.
      g.fillStyle(KING.violetLit, 0.25 + 0.4 * beat);
      for (let d = from + 24; d < to; d += 56) {
        const off = Math.sin(time / 300 + d) * 6;
        if (horizontal) g.fillCircle(d, centre + off, 3);
        else g.fillCircle(centre + off, d, 3);
      }
      return;
    }

    if (fire <= 0) return;
    // Eruption: black fire boiling out of the band, brightest at the spine.
    const k = 1 - fire;
    for (let i = 4; i >= 1; i--) {
      g.fillStyle(KING.violet, 0.10 * i * k);
      band(halfSpan * (1 + i * 0.10));
    }
    g.fillStyle(KING.gloom, 0.95 * k);
    band(halfSpan);
    g.fillStyle(KING.violetLit, 0.75 * k);
    band(halfSpan * 0.36);
    // Ragged tongues along the spine.
    g.fillStyle(KING.bone, 0.5 * k);
    for (let d = from; d < to; d += 30) {
      const flick = 8 + Math.abs(Math.sin(d + time / 60)) * halfSpan * 0.8;
      if (horizontal) g.fillTriangle(d, centre - flick, d + 14, centre, d, centre + flick);
      else g.fillTriangle(centre - flick, d, centre, d + 14, centre + flick, d);
    }
  }

  /** One of the fifty Dark Shield bullets. */
  static drawShieldBullet(g: Phaser.GameObjects.Graphics, x: number, y: number, time: number): void {
    g.fillStyle(KING.violet, 0.22);
    g.fillCircle(x, y, 11);
    g.fillStyle(KING.gloom, 1);
    g.fillCircle(x, y, 6.5);
    g.fillStyle(mixC(KING.violet, KING.violetLit, 0.5 + 0.5 * Math.sin(time / 200)), 1);
    g.fillCircle(x, y, 4);
    g.fillStyle(KING.bone, 0.85);
    g.fillCircle(x - 1.2, y - 1.2, 1.6);
  }

  /** A Wheel of the Crown bolt — the same shot, struck in gold rather than gloom. */
  static drawSpiralBolt(g: Phaser.GameObjects.Graphics, x: number, y: number, time: number): void {
    const spin = time / 110;
    g.fillStyle(KING.gold, 0.18);
    g.fillCircle(x, y, 12);
    g.fillStyle(KING.gloom, 1);
    g.fillCircle(x, y, 6);
    g.fillStyle(mixC(KING.gold, KING.goldLit, 0.5 + 0.5 * Math.sin(spin)), 1);
    // A four-pointed star, so a spiral arm reads as a chain of sparks.
    for (let i = 0; i < 4; i++) {
      const a = spin + (i / 4) * Math.PI * 2;
      g.fillTriangle(
        x + Math.cos(a) * 10, y + Math.sin(a) * 10,
        x + Math.cos(a + 1.2) * 3.6, y + Math.sin(a + 1.2) * 3.6,
        x + Math.cos(a - 1.2) * 3.6, y + Math.sin(a - 1.2) * 3.6,
      );
    }
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(x, y, 2.2);
  }

  /** A herald's bolt: a thrown sliver of cold light with a violet wake. */
  static drawHeraldBolt(g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number): void {
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const px = -ny;
    const py = nx;
    g.fillStyle(KING.violet, 0.30);
    g.fillEllipse(x - nx * 9, y - ny * 9, 22, 8);
    g.fillStyle(KING.gloom, 1);
    g.fillPoints([
      new Phaser.Geom.Point(x + nx * 11, y + ny * 11),
      new Phaser.Geom.Point(x + px * 4.5, y + py * 4.5),
      new Phaser.Geom.Point(x - nx * 8, y - ny * 8),
      new Phaser.Geom.Point(x - px * 4.5, y - py * 4.5),
    ], true, true);
    g.fillStyle(KING.violetLit, 0.95);
    g.fillCircle(x + nx * 2, y + ny * 2, 2.6);
  }

  /**
   * A hand of the court coming up through the flagstones. `warn` 0→1 is the
   * shadow spreading on the floor; `erupt` 0→1 is the arm itself.
   */
  static drawGraspHand(
    g: Phaser.GameObjects.Graphics, x: number, y: number, warn: number, erupt: number, time: number,
  ): void {
    if (erupt <= 0) {
      const beat = Math.abs(Math.sin(warn * Math.PI * 3));
      g.fillStyle(KING.gloom, 0.22 + 0.34 * warn);
      g.fillEllipse(x, y, 74 * warn, 34 * warn);
      g.lineStyle(2, mixC(KING.violet, KING.violetLit, beat), 0.5 + 0.4 * warn);
      g.strokeEllipse(x, y, 74, 34);
      // Five scratch lines where the fingers will break through.
      g.lineStyle(2, KING.violetLit, 0.35 + 0.45 * beat);
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI * 0.9 + (i / 4) * Math.PI * 0.8;
        g.lineBetween(x + Math.cos(a) * 10, y + Math.sin(a) * 5,
          x + Math.cos(a) * 32 * warn, y + Math.sin(a) * 16 * warn);
      }
      return;
    }

    // The arm: a wrist out of the floor, palm forward, five clawed fingers.
    const rise = Phaser.Math.Easing.Back.Out(Math.min(1, erupt)) * 46;
    const fade = erupt > 0.75 ? 1 - (erupt - 0.75) / 0.25 : 1;
    const cy = y - rise;
    g.fillStyle(KING.voidBlack, 0.45 * fade);
    g.fillEllipse(x, y + 4, 70, 24);
    // Forearm.
    g.fillStyle(KING.gloom, fade);
    g.fillPoints([
      new Phaser.Geom.Point(x - 15, y + 8),
      new Phaser.Geom.Point(x - 11, cy),
      new Phaser.Geom.Point(x + 11, cy),
      new Phaser.Geom.Point(x + 15, y + 8),
    ], true, true);
    // Palm.
    g.fillStyle(mixC(KING.gloom, KING.violet, 0.25), fade);
    g.fillEllipse(x, cy - 4, 32, 26);
    g.lineStyle(2, KING.voidBlack, 0.8 * fade);
    g.strokeEllipse(x, cy - 4, 32, 26);
    // Fingers, splayed and tipped with claws, curling in as they fade.
    const curl = Math.min(1, erupt * 1.4);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.92 + (i / 4) * Math.PI * 0.84 + Math.sin(time / 240 + i) * 0.05;
      const len = (i === 0 || i === 4 ? 20 : 28) * (1 - 0.25 * curl);
      const bx = x + Math.cos(a) * 13;
      const by = cy - 8 + Math.sin(a) * 9;
      const tx = bx + Math.cos(a) * len;
      const ty = by + Math.sin(a) * len;
      g.lineStyle(7, KING.gloom, fade);
      g.lineBetween(bx, by, tx, ty);
      g.fillStyle(KING.bone, 0.85 * fade);
      g.fillTriangle(
        tx + Math.cos(a) * 9, ty + Math.sin(a) * 9,
        tx + Math.cos(a + 1.6) * 3.5, ty + Math.sin(a + 1.6) * 3.5,
        tx + Math.cos(a - 1.6) * 3.5, ty + Math.sin(a - 1.6) * 3.5,
      );
    }
    // Sockets of light in the palm.
    g.fillStyle(KING.violetLit, 0.7 * fade);
    g.fillCircle(x, cy - 4, 5);
  }

  /**
   * A floor sigil that detonates when it finishes drawing itself. `t` 0→1.
   */
  static drawRune(
    g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, t: number, time: number,
  ): void {
    const beat = 0.5 + 0.5 * Math.sin(time / 130);
    g.fillStyle(KING.gloom, 0.14 + 0.26 * t);
    g.fillCircle(x, y, radius);
    g.lineStyle(2, KING.violet, 0.5);
    g.strokeCircle(x, y, radius);
    // The sigil draws itself round the circle as the timer runs out.
    g.lineStyle(4, mixC(KING.violet, KING.violetLit, beat), 0.9);
    g.beginPath();
    g.arc(x, y, radius - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t);
    g.strokePath();
    // Inner star, brightening with the fill.
    const spin = time / 900;
    g.lineStyle(2, KING.violetLit, 0.35 + 0.55 * t);
    g.beginPath();
    for (let i = 0; i <= 5; i++) {
      const a = spin + ((i * 2) % 5) * (Math.PI * 2 / 5) - Math.PI / 2;
      const px = x + Math.cos(a) * radius * 0.62;
      const py = y + Math.sin(a) * radius * 0.62;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
    // Glyph ticks around the rim.
    g.fillStyle(KING.bone, 0.3 + 0.5 * t);
    for (let i = 0; i < 12; i++) {
      const a = spin * -0.6 + (i / 12) * Math.PI * 2;
      g.fillCircle(x + Math.cos(a) * radius * 0.86, y + Math.sin(a) * radius * 0.86, 2);
    }
  }

  /** The rift the King steps out of. `t` 0→1 as it opens. */
  static drawBlinkRift(
    g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, time: number,
  ): void {
    const h = 74 * Math.min(1, t * 1.4);
    const w = 26 * Math.sin(Math.min(1, t) * Math.PI * 0.85);
    for (let k = 4; k >= 1; k--) {
      g.fillStyle(KING.violet, 0.07);
      g.fillEllipse(x, y, w * 2 + k * 12, h + k * 10);
    }
    g.fillStyle(KING.voidBlack, 0.92);
    g.fillEllipse(x, y, w * 2, h);
    g.lineStyle(3, mixC(KING.violet, KING.violetLit, 0.5 + 0.5 * Math.sin(time / 90)), 0.95);
    g.strokeEllipse(x, y, w * 2, h);
    // Torn edges — short filaments flicking off the seam.
    g.lineStyle(2, KING.violetLit, 0.6);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + time / 400;
      const ex = x + Math.cos(a) * w;
      const ey = y + Math.sin(a) * h * 0.5;
      g.lineBetween(ex, ey, ex + Math.cos(a) * (8 + JITTER[i % JITTER.length] * 9),
        ey + Math.sin(a) * (6 + JITTER[i % JITTER.length] * 7));
    }
  }

  /** The King's cleave: a crescent swept out of the dark. `t` 0→1 as it opens out. */
  static drawCleave(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, angle: number, halfAngle: number, radius: number, t: number,
  ): void {
    const a0 = angle - halfAngle;
    const a1 = angle - halfAngle + halfAngle * 2 * Math.min(1, t * 1.25);
    const fade = 1 - Math.max(0, (t - 0.6) / 0.4);
    const steps = 20;
    /** The crescent as a ring segment between two radii. */
    const band = (r0: number, r1: number) => {
      const pts: Phaser.Geom.Point[] = [];
      for (let i = 0; i <= steps; i++) {
        const a = Phaser.Math.Linear(a0, a1, i / steps);
        pts.push(new Phaser.Geom.Point(x + Math.cos(a) * r1, y + Math.sin(a) * r1));
      }
      for (let i = steps; i >= 0; i--) {
        const a = Phaser.Math.Linear(a0, a1, i / steps);
        pts.push(new Phaser.Geom.Point(x + Math.cos(a) * r0, y + Math.sin(a) * r0));
      }
      return pts;
    };
    g.fillStyle(KING.violet, 0.18 * fade);
    g.fillPoints(band(radius * 0.18, radius), true, true);
    g.fillStyle(KING.gloom, 0.75 * fade);
    g.fillPoints(band(radius * 0.62, radius * 0.94), true, true);
    g.fillStyle(KING.bone, 0.85 * fade);
    g.fillPoints(band(radius * 0.86, radius * 0.99), true, true);
    // A hard leading edge on the far side of the swing.
    g.lineStyle(3, KING.violetLit, 0.9 * fade);
    g.lineBetween(x + Math.cos(a1) * radius * 0.2, y + Math.sin(a1) * radius * 0.2,
      x + Math.cos(a1) * radius, y + Math.sin(a1) * radius);
  }

  /**
   * Fills everything *outside* a circle. Phaser's Graphics has no even-odd
   * fill, so the outside is built as an annulus of quads running well past the
   * arena edge — the overdraw is clipped by the camera and costs nothing.
   */
  protected static fillOutsideCircle(
    g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number, alpha: number,
  ): void {
    const OUT = 3000;
    const steps = 48;
    g.fillStyle(color, alpha);
    for (let i = 0; i < steps; i++) {
      const a0 = (i / steps) * Math.PI * 2;
      const a1 = ((i + 1) / steps) * Math.PI * 2;
      g.fillPoints([
        new Phaser.Geom.Point(x + Math.cos(a0) * r, y + Math.sin(a0) * r),
        new Phaser.Geom.Point(x + Math.cos(a1) * r, y + Math.sin(a1) * r),
        new Phaser.Geom.Point(x + Math.cos(a1) * OUT, y + Math.sin(a1) * OUT),
        new Phaser.Geom.Point(x + Math.cos(a0) * OUT, y + Math.sin(a0) * OUT),
      ], true, true);
    }
  }

  /**
   * The King's Decree: one circle of ground he permits you to stand on, with
   * the rest of the hall condemned. `charge` 0→1 runs to the verdict.
   */
  static drawDecree(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, radius: number, charge: number, time: number,
  ): void {
    const beat = Math.abs(Math.sin(charge * Math.PI * 4));
    DisgracedFx.fillOutsideCircle(g, x, y, radius, KING.warn, 0.10 + 0.22 * charge);
    DisgracedFx.fillOutsideCircle(g, x, y, radius, KING.gloom, 0.18 + 0.20 * charge);

    // The pardoned ground, lit gold and shrinking as the decree closes.
    g.fillStyle(KING.gold, 0.05 + 0.06 * beat);
    g.fillCircle(x, y, radius);
    for (let k = 3; k >= 1; k--) {
      g.lineStyle(3 + k * 4, KING.gold, 0.06);
      g.strokeCircle(x, y, radius);
    }
    g.lineStyle(5, mixC(KING.gold, KING.goldLit, beat), 0.95);
    g.strokeCircle(x, y, radius);
    g.lineStyle(2, 0xffffff, 0.7);
    g.strokeCircle(x, y, radius - 5);
    // Inward chevrons on the rim, herding you in.
    g.lineStyle(3, KING.goldLit, 0.5 + 0.4 * beat);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + time / 1400;
      const ox = x + Math.cos(a) * radius;
      const oy = y + Math.sin(a) * radius;
      g.lineBetween(ox, oy, ox - Math.cos(a - 0.16) * 16, oy - Math.sin(a - 0.16) * 16);
      g.lineBetween(ox, oy, ox - Math.cos(a + 0.16) * 16, oy - Math.sin(a + 0.16) * 16);
    }
  }

  // ── The Last Coronation ─────────────────────────────────────────────

  /**
   * The spectral throne. `grow` 0→1 unfolds it out of the wreck; `shatter` 0→1
   * breaks it apart again at the end of the ultimate.
   */
  static drawThrone(
    g: Phaser.GameObjects.Graphics,
    cx: number, baseY: number, grow: number, shatter: number, time: number,
  ): void {
    g.clear();
    if (grow <= 0) return;
    const a = (1 - shatter) * Math.min(1, grow);
    if (a <= 0) return;

    const h = 300 * Math.min(1, grow);
    const seatY = baseY - 54;
    const burst = shatter * 46;
    const pulse = 0.7 + 0.3 * Math.sin(time / 420);

    // Back — a tall slab that runs off the top of the arena, spined with peaks.
    const backTop = baseY - h;
    g.fillStyle(KING.gloom, 0.55 * a);
    g.fillPoints([
      new Phaser.Geom.Point(cx - 74, seatY),
      new Phaser.Geom.Point(cx - 60, backTop),
      new Phaser.Geom.Point(cx + 60, backTop),
      new Phaser.Geom.Point(cx + 74, seatY),
    ], true, true);
    g.lineStyle(3, KING.violetLit, 0.7 * a * pulse);
    g.strokePoints([
      new Phaser.Geom.Point(cx - 74, seatY),
      new Phaser.Geom.Point(cx - 60, backTop),
      new Phaser.Geom.Point(cx + 60, backTop),
      new Phaser.Geom.Point(cx + 74, seatY),
    ], true, false);

    // Crown of peaks along the top of the back.
    g.lineStyle(3, KING.gold, 0.75 * a * pulse);
    g.beginPath();
    for (let i = 0; i <= 6; i++) {
      const px = cx - 60 + (120 / 6) * i;
      const py = backTop + (i % 2 === 0 ? 0 : -22);
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();

    // Ribs up the back, spreading as it shatters.
    g.lineStyle(2, KING.violet, 0.4 * a);
    for (let i = -2; i <= 2; i++) {
      const off = i * burst * 0.6;
      g.lineBetween(cx + i * 22 + off, seatY, cx + i * 18 + off, backTop + 8);
    }

    // Arm rests and seat.
    for (const side of [-1, 1] as const) {
      g.fillStyle(KING.gloom, 0.6 * a);
      g.fillRect(cx + side * 74 - 12 + side * burst, seatY, 24, 54);
      g.lineStyle(2, KING.violetLit, 0.5 * a);
      g.strokeRect(cx + side * 74 - 12 + side * burst, seatY, 24, 54);
    }
    g.fillStyle(KING.gloom, 0.7 * a);
    g.fillRect(cx - 74, seatY, 148, 18);
    g.lineStyle(2, KING.gold, 0.5 * a * pulse);
    g.strokeRect(cx - 74, seatY, 148, 18);
  }

  /** A spectral courtier: a hollow attendant that fades in to take its shot. */
  static drawCourtier(
    g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number, time: number,
  ): void {
    if (alpha <= 0) return;
    const bob = Math.sin(time / 600 + x) * 3;
    const cy = y + bob;
    g.fillStyle(KING.bone, 0.10 * alpha);
    g.fillCircle(x, cy, 30);
    // Robe.
    g.fillStyle(mixC(KING.gloom, KING.bone, 0.25), 0.55 * alpha);
    g.fillTriangle(x - 17, cy + 34, x + 17, cy + 34, x, cy - 8);
    g.fillEllipse(x, cy - 10, 28, 30);
    // Hollow face.
    g.fillStyle(KING.voidBlack, 0.8 * alpha);
    g.fillEllipse(x, cy - 10, 19, 22);
    g.fillStyle(KING.violetLit, 0.85 * alpha);
    g.fillCircle(x - 5, cy - 12, 2.4);
    g.fillCircle(x + 5, cy - 12, 2.4);
  }

  /** A crown shard sweeping the floor — a gold sliver with a motion streak. */
  static drawCrownShard(
    g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number, time: number,
  ): void {
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const px = -ny;
    const py = nx;
    g.fillStyle(KING.gold, 0.18);
    g.fillEllipse(x - nx * 12, y - ny * 12, 34, 12);
    const spin = time / 90;
    const sx = Math.cos(spin);
    const sy = Math.sin(spin);
    g.fillStyle(mixC(KING.gold, KING.goldLit, 0.5 + 0.5 * sy), 1);
    g.fillTriangle(
      x + sx * 15, y + sy * 15,
      x + px * 8 - sx * 6, y + py * 8 - sy * 6,
      x - px * 8 - sx * 6, y - py * 8 - sy * 6,
    );
    g.lineStyle(1.5, KING.goldLit, 0.9);
    g.strokeTriangle(
      x + sx * 15, y + sy * 15,
      x + px * 8 - sx * 6, y + py * 8 - sy * 6,
      x - px * 8 - sx * 6, y - py * 8 - sy * 6,
    );
  }

  /** The closing coronation ring — a wall of light contracting on the throne. */
  static drawCoronationRing(
    g: Phaser.GameObjects.Graphics, cx: number, cy: number, radius: number, time: number,
  ): void {
    for (let k = 4; k >= 1; k--) {
      g.lineStyle(6 + k * 5, KING.goldLit, 0.07);
      g.strokeCircle(cx, cy, radius);
    }
    g.lineStyle(7, mixC(KING.gold, KING.goldLit, 0.5 + 0.5 * Math.sin(time / 180)), 0.95);
    g.strokeCircle(cx, cy, radius);
    g.lineStyle(2, 0xffffff, 0.8);
    g.strokeCircle(cx, cy, radius);
    // Tick marks around the wall, turning as it closes.
    const spin = time / 900;
    g.lineStyle(3, KING.goldLit, 0.7);
    for (let i = 0; i < 24; i++) {
      const a = spin + (i / 24) * Math.PI * 2;
      g.lineBetween(
        cx + Math.cos(a) * (radius - 12), cy + Math.sin(a) * (radius - 12),
        cx + Math.cos(a) * (radius + 12), cy + Math.sin(a) * (radius + 12),
      );
    }
  }

  /** The thrown crown, falling — a golden reticle then the crown itself. */
  static drawCrownFall(
    g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, t: number, time: number,
  ): void {
    // Reticle on the ground.
    g.fillStyle(KING.gold, 0.08 + 0.20 * t);
    g.fillCircle(x, y, radius);
    g.lineStyle(4, mixC(KING.gold, KING.goldLit, t), 0.95);
    g.strokeCircle(x, y, radius * (1 - t * 0.8) + 8);
    g.lineStyle(2, KING.goldLit, 0.7);
    g.strokeCircle(x, y, radius);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + time / 700;
      g.lineBetween(
        x + Math.cos(a) * radius * 0.9, y + Math.sin(a) * radius * 0.9,
        x + Math.cos(a) * radius * 1.25, y + Math.sin(a) * radius * 1.25,
      );
    }
    // The crown descending out of the dark above.
    const cy = y - (1 - t) * 420;
    const scale = 1 + (1 - t) * 1.4;
    for (let k = 4; k >= 1; k--) {
      g.fillStyle(KING.gold, 0.05);
      g.fillCircle(x, cy, 26 * scale + k * 8);
    }
    DisgracedFx.drawBrokenCrown(g, x, cy, 30 * scale, 1);
  }

  // ── The Crowned Wraith ──────────────────────────────────────────────

  /**
   * What is left when the crown refuses to let him die: no legs, a shroud that
   * frays into smoke, and the crown riding above a hood with nothing in it. The
   * silhouette is deliberately taller and thinner than the King's so the third
   * phase reads as a different thing at a glance.
   */
  static drawWraith(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, time: number,
    opts: { rise?: number; casting?: boolean; enraged?: boolean } = {},
  ): void {
    const rise = opts.rise ?? 1;
    const drift = Math.sin(time / 520) * 5;
    const cx = x;
    const cy = y - 6 + drift;
    const R = 22;
    const hot = opts.enraged ?? false;
    const accent = hot ? KING.gold : KING.violetLit;

    // Halo of gathered dark, tighter and brighter while casting.
    const auraStr = opts.casting ? 0.13 : 0.07;
    for (let k = 8; k >= 1; k--) {
      g.fillStyle(hot ? KING.gold : KING.violet,
        auraStr * rise * (0.7 + 0.3 * Math.sin(time / 380)) * (k <= 4 ? 1 : 0.6));
      g.fillCircle(cx, cy, R + k * 7);
    }

    // No shadow on the floor — he is not standing on it. A smear of dark instead.
    g.fillStyle(KING.voidBlack, 0.28 * rise);
    g.fillEllipse(cx, y + 44, R * 2.6, R * 0.5);

    // Shroud: a long tapering bell that frays into three streamers.
    const tail = (ox: number, w: number, phase: number, len: number) => {
      const s = Math.sin(time / (380 + phase * 90) + phase) * 12;
      g.fillTriangle(
        cx + ox - w, cy + 4,
        cx + ox + w, cy + 4,
        cx + ox + s, cy + len * rise,
      );
    };
    g.fillStyle(mixC(KING.gloom, 0x000000, 0.25), 0.9);
    tail(-16, 15, 0, 66);
    tail(16, 15, 2, 60);
    g.fillStyle(KING.gloom, 0.95);
    tail(0, 21, 1, 82);
    g.fillStyle(mixC(KING.gloom, hot ? KING.gold : KING.violet, 0.22), 0.8);
    tail(-7, 11, 3, 54);
    tail(9, 10, 4, 48);
    // Rag ends — the shroud coming apart into motes.
    g.fillStyle(accent, 0.30);
    for (let i = 0; i < 7; i++) {
      const t = ((time / 900 + i * 0.14) % 1);
      g.fillCircle(cx + Math.sin(time / 300 + i * 2.2) * 22, cy + 40 + t * 46, 3 * (1 - t));
    }

    // Shoulders — narrow, hunched, edged in light.
    g.fillStyle(KING.gloom, 1);
    g.fillEllipse(cx, cy + 4, R * 1.85, R * 1.45);
    g.lineStyle(3, KING.voidBlack, 1);
    g.strokeEllipse(cx, cy + 4, R * 1.85, R * 1.45);
    g.lineStyle(2, accent, 0.45);
    g.beginPath();
    g.moveTo(cx - R * 0.9, cy + 2);
    g.lineTo(cx - R * 0.45, cy - R * 0.8);
    g.moveTo(cx + R * 0.9, cy + 2);
    g.lineTo(cx + R * 0.45, cy - R * 0.8);
    g.strokePath();

    // Hood — taller peak than the King's, and completely empty.
    g.fillStyle(mixC(KING.gloom, 0x000000, 0.45), 1);
    g.fillTriangle(cx - 16, cy - 3, cx + 16, cy - 3, cx, cy - R - 16);
    g.fillEllipse(cx, cy - 9, 28, 28);
    g.fillStyle(KING.voidBlack, 1);
    g.fillEllipse(cx, cy - 8, 21, 22);

    // Two burning eyes, and a thin line of light where a mouth would be.
    const glow = 0.7 + 0.3 * Math.sin(time / 190);
    g.fillStyle(mixC(accent, 0xffffff, 0.3), glow * rise);
    g.fillEllipse(cx - 6, cy - 10, 5, 8);
    g.fillEllipse(cx + 6, cy - 10, 5, 8);
    for (let k = 3; k >= 1; k--) {
      g.fillStyle(accent, 0.10 * glow);
      g.fillCircle(cx - 6, cy - 10, 3 + k * 3);
      g.fillCircle(cx + 6, cy - 10, 3 + k * 3);
    }
    g.fillStyle(accent, 0.5 * glow);
    g.fillRect(cx - 5, cy - 1, 10, 1.6);

    // The crown, whole again, floating a hand's width clear of the hood.
    const lift = 14 + Math.sin(time / 430) * 4;
    for (let k = 4; k >= 1; k--) {
      g.fillStyle(KING.gold, 0.06);
      g.fillCircle(cx, cy - R - 12 - lift, 12 + k * 6);
    }
    DisgracedFx.drawWholeCrown(g, cx, cy - R - 12 - lift, 19, time);

    // Hands — two motes held out at either side, drawn up while casting.
    const handY = opts.casting ? cy - 12 : cy + 6;
    for (const side of [-1, 1] as const) {
      const hx = cx + side * (opts.casting ? 28 : 22);
      g.fillStyle(KING.voidBlack, 0.9);
      g.fillCircle(hx, handY, 6);
      for (let k = 3; k >= 1; k--) {
        g.fillStyle(accent, (opts.casting ? 0.13 : 0.06) * (4 - k));
        g.fillCircle(hx, handY, 4 + k * 4);
      }
    }
  }

  /**
   * The crown as it was before it broke — five even peaks, lit from within.
   * Only the wraith ever wears this one.
   */
  static drawWholeCrown(
    g: Phaser.GameObjects.Graphics, x: number, y: number, halfWidth: number, time: number,
  ): void {
    const w = halfWidth;
    const pts: Phaser.Geom.Point[] = [new Phaser.Geom.Point(x - w, y + 7)];
    for (let i = 0; i <= 4; i++) {
      const px = x - w + (w * 2 * i) / 4;
      pts.push(new Phaser.Geom.Point(px - w * 0.12, y + 2));
      pts.push(new Phaser.Geom.Point(px, y - 9 - (i === 2 ? 4 : 0)));
      pts.push(new Phaser.Geom.Point(px + w * 0.12, y + 2));
    }
    pts.push(new Phaser.Geom.Point(x + w, y + 7));
    g.fillStyle(mixC(KING.gold, 0x000000, 0.25), 1);
    g.fillPoints(pts, true, true);
    g.lineStyle(2, mixC(KING.gold, KING.goldLit, 0.5 + 0.5 * Math.sin(time / 260)), 0.95);
    g.strokePoints(pts, true, false);
    // Band and its set stones.
    g.fillStyle(KING.goldLit, 0.9);
    g.fillRect(x - w, y + 3, w * 2, 3);
    for (let i = -1; i <= 1; i++) {
      g.fillStyle(KING.violetLit, 0.85);
      g.fillCircle(x + i * w * 0.5, y + 4.5, 2.4);
    }
  }

  /**
   * A wail ring — a bone-white shockwave of sound rolling off the wraith, with
   * the one quiet lane cut out of it and marked at both edges.
   */
  static drawWailRing(
    g: Phaser.GameObjects.Graphics,
    cx: number, cy: number, radius: number,
    gapCentre: number, gapHalf: number, time: number,
  ): void {
    if (radius <= 4) return;
    const from = gapCentre + gapHalf;
    const to = gapCentre + Math.PI * 2 - gapHalf;
    const wave = (width: number, color: number, alpha: number, r: number) => {
      g.lineStyle(width, color, alpha);
      g.beginPath(); g.arc(cx, cy, r, from, to); g.strokePath();
    };
    for (let k = 4; k >= 1; k--) wave(4 + k * 6, KING.bone, 0.05, radius);
    wave(6, mixC(KING.violetLit, KING.bone, 0.5 + 0.5 * Math.sin(time / 100)), 0.85, radius);
    wave(2, 0xffffff, 0.75, radius - 4);

    // The quiet lane, called out the same way the quake's is.
    g.lineStyle(2, 0x67e8a0, 0.55);
    for (const edge of [gapCentre - gapHalf, gapCentre + gapHalf]) {
      g.lineBetween(
        cx + Math.cos(edge) * (radius - 26), cy + Math.sin(edge) * (radius - 26),
        cx + Math.cos(edge) * (radius + 26), cy + Math.sin(edge) * (radius + 26),
      );
    }

    // Faces in the wave — a ring of open, silent mouths.
    const count = Math.max(6, Math.round(radius / 44));
    for (let i = 0; i < count; i++) {
      const a = from + ((to - from) * i) / count + radius / 220;
      const fx = cx + Math.cos(a) * radius;
      const fy = cy + Math.sin(a) * radius;
      const j = JITTER[i % JITTER.length];
      g.fillStyle(KING.gloom, 0.55);
      g.fillEllipse(fx, fy, 15 * j, 19 * j);
      g.fillStyle(KING.voidBlack, 0.85);
      g.fillEllipse(fx, fy + 3, 7 * j, 10 * j);
      g.fillStyle(KING.bone, 0.6);
      g.fillCircle(fx - 3, fy - 4, 1.6);
      g.fillCircle(fx + 3, fy - 4, 1.6);
    }
  }

  /**
   * The pall that falls over the hall for the last phase: the room drains, and
   * motes of the court drift up through it.
   */
  static drawWraithVeil(
    g: Phaser.GameObjects.Graphics, w: number, h: number, t: number, time: number,
  ): void {
    if (t <= 0) return;
    g.fillStyle(0x05030a, 0.52 * t);
    g.fillRect(0, 0, w, h);
    g.fillStyle(KING.gloom, 0.16 * t);
    g.fillRect(0, 0, w, h);
    // Vignette — four bands pulled in from the edges.
    for (let k = 1; k <= 5; k++) {
      g.lineStyle(26, 0x05030a, 0.06 * t);
      g.strokeRect(-k * 12, -k * 12, w + k * 24, h + k * 24);
    }
    // Rising motes, on a fixed lattice so they never crawl.
    for (let i = 0; i < 26; i++) {
      const j = JITTER[i % JITTER.length];
      const mx = ((i * 137) % Math.round(w)) + Math.sin(time / 900 + i) * 14;
      const my = h - (((time / 26) * j + i * 97) % (h + 60));
      g.fillStyle(i % 4 === 0 ? KING.gold : KING.violetLit, 0.20 * t);
      g.fillCircle(mx, my, 1.6 + (j - 0.92) * 6);
    }
    g.lineStyle(4, KING.gold, 0.30 * t);
    g.strokeRect(6, 6, w - 12, h - 12);
  }
}
