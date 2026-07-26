import Phaser from 'phaser';
import { DisgracedFx, KING, MechPose, MechArmPose, MECH_HEAD_CY, MECH_HEAD_RX, MECH_HEAD_RY, MECH_HEAD_HIT_R, mixC, JITTER } from './DisgracedKingVisuals';

/**
 * Art for hard mode — the Devourer of Kings.
 *
 * `DevouredFx` subclasses `DisgracedFx` and overrides every draw call the fight
 * makes, so the kit can swap the whole look of the encounter by swapping one
 * reference (`this.fx`). Nothing about the *choreography* changes: the same
 * telegraph, at the same radius, for the same duration — only what it is made
 * of. A hard-mode attack has to remain the attack you learned on the way here.
 *
 * The direction is ghostly and biological. The war-mech is not a machine here,
 * it is a machine something has grown through: bone struts, membrane between the
 * plates, ghostlight where the furnace was. The King's violet becomes viscera.
 * The crown's gold becomes old bone. Every telegraph that used to be forged is
 * now grown — sphincters, egg sacs, veins, peristalsis, teeth.
 *
 * Subclassing rather than parameterising is deliberate: the normal fight's art
 * is finished and must not be touched by hard-mode work, and any draw call this
 * file forgets falls through to the original rather than to nothing.
 */

/**
 * The hard-mode palette. Same key set as `KING` so the kit can hold one of the
 * two and index it identically — see `DisgracedKingKit.pal`.
 */
export const DEVOUR: typeof KING = {
  /** Wet black — the inside of something. */
  voidBlack: 0x060309,
  iron:      0x241419,
  ironLit:   0x38222a,
  /** Muscle, in two tones. */
  plate:     0x4d2c37,
  plateLit:  0x6b3d4c,
  /** Cartilage and gristle. */
  rivet:     0x9c6b78,
  /** Ghost white — the light the eaten give off. */
  bone:      0xe9f4ec,
  /** Ghostlight, where the mech used to burn. */
  ember:     0x5fe3c0,
  emberLit:  0xbdfff0,
  /** Viscera, where the King used to work in violet. */
  violet:    0xa32b52,
  violetLit: 0xf0688f,
  /** Bruise. */
  gloom:     0x2c0c1c,
  /** Old bone, where the crown used to be gold. */
  gold:      0xd9c79c,
  goldLit:   0xf7f1dc,
  /** Arterial. */
  warn:      0xff2f52,
  warnLit:   0xffa0b2,
};

/** How the Devourer is standing when it is drawn. */
export interface DevourerPose {
  /** 0→1 as it hauls itself out of the wraith. */
  rise?: number;
  casting?: boolean;
  /** Below half health: more mouths, brighter ghostlight. */
  enraged?: boolean;
  /** Mid-Feast — the hearts are out and it is holding itself open. */
  feasting?: boolean;
  /** 0→1 as it collapses at the end. At 1 it is sat on the floor, spent. */
  broken?: number;
}

/**
 * A closed blob built from a radial function, so organic shapes stay stable
 * frame to frame (the wobble comes from `time`, never from `Math.random`).
 */
function blob(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, rx: number, ry: number,
  lobes: number, wobble: number, phase: number,
): Phaser.Geom.Point[] {
  const pts: Phaser.Geom.Point[] = [];
  const steps = 26;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const k = 1 + Math.sin(a * lobes + phase) * wobble + (JITTER[i % JITTER.length] - 1) * 0.6;
    pts.push(new Phaser.Geom.Point(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k));
  }
  void g;
  return pts;
}

/** A run of teeth along a line — used by every mouth in the fight. */
function teeth(
  g: Phaser.GameObjects.Graphics,
  x1: number, y1: number, x2: number, y2: number,
  count: number, len: number, color: number, alpha: number, flip: 1 | -1,
): void {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const nx = Math.cos(a + Math.PI / 2) * flip;
  const ny = Math.sin(a + Math.PI / 2) * flip;
  g.fillStyle(color, alpha);
  for (let i = 0; i < count; i++) {
    const t0 = i / count;
    const t1 = (i + 0.72) / count;
    const j = JITTER[i % JITTER.length];
    const ax = Phaser.Math.Linear(x1, x2, t0);
    const ay = Phaser.Math.Linear(y1, y2, t0);
    const bx = Phaser.Math.Linear(x1, x2, t1);
    const by = Phaser.Math.Linear(y1, y2, t1);
    g.fillTriangle(ax, ay, bx, by, (ax + bx) / 2 + nx * len * j, (ay + by) / 2 + ny * len * j);
  }
}

/** A single vein: a tapering, forking line that crawls with `time`. */
function vein(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, angle: number, len: number,
  width: number, color: number, alpha: number, time: number, seed: number,
): void {
  let px = x;
  let py = y;
  let a = angle;
  const segs = 5;
  for (let i = 0; i < segs; i++) {
    const j = JITTER[(seed + i) % JITTER.length];
    a += Math.sin(time / 900 + seed + i) * 0.14 + (j - 1) * 0.9;
    const nx = px + Math.cos(a) * (len / segs);
    const ny = py + Math.sin(a) * (len / segs);
    g.lineStyle(width * (1 - i / (segs + 1)), color, alpha);
    g.lineBetween(px, py, nx, ny);
    // One fork off the middle of the run, so the network reads as branching.
    if (i === 2) {
      const fa = a + (seed % 2 === 0 ? 0.8 : -0.8);
      g.lineStyle(width * 0.4, color, alpha * 0.7);
      g.lineBetween(nx, ny, nx + Math.cos(fa) * len * 0.24, ny + Math.sin(fa) * len * 0.24);
    }
    px = nx;
    py = ny;
  }
}

export class DevouredFx extends DisgracedFx {
  // ── The hall ────────────────────────────────────────────────────────

  /**
   * The same throne room, after. The flagstones are still there under a floor
   * that has gone soft; the columns have been grown over; the carpet is a slick.
   */
  static override drawHall(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      g.fillStyle(mixC(0x08040a, DEVOUR.gloom, 0.08 + t * 0.16), 1);
      g.fillRect(0, (h / steps) * i, w, h / steps + 1);
    }

    // The flagstone grid survives, but only as scarring under the membrane.
    const backY = h * 0.34;
    const ROWS = 11;
    g.lineStyle(1, mixC(DEVOUR.iron, DEVOUR.violet, 0.35), 0.24);
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

    // Membrane stretched across the floor in sheets, pooling toward the middle.
    for (let i = 0; i < 9; i++) {
      const j = JITTER[i % JITTER.length];
      const mx = (i * 173) % w;
      const my = backY + ((i * 97) % (h - backY));
      g.fillStyle(mixC(DEVOUR.gloom, DEVOUR.plate, 0.25), 0.20);
      g.fillPoints(blob(g, mx, my, 90 * j, 34 * j, 3, 0.22, i), true, true);
    }

    // The carpet is still the only warm thing, and it is no longer cloth.
    g.fillStyle(mixC(0x3a0a18, DEVOUR.violet, 0.35), 0.42);
    g.fillPoints([
      new Phaser.Geom.Point(w / 2 - 44, h * 0.34),
      new Phaser.Geom.Point(w / 2 + 44, h * 0.34),
      new Phaser.Geom.Point(w / 2 + 132, h),
      new Phaser.Geom.Point(w / 2 - 132, h),
    ], true, true);
    // Wet highlight down one edge of the slick.
    g.lineStyle(3, DEVOUR.violetLit, 0.18);
    g.beginPath();
    g.moveTo(w / 2 - 40, h * 0.34); g.lineTo(w / 2 - 122, h);
    g.strokePath();

    // Columns, grown over: bone shaft, sinew wrap, a bloom of growth at the top.
    const columns: Array<[number, number]> = [
      [70, 210], [w - 70, 240], [172, 150], [w - 172, 170],
    ];
    columns.forEach(([colX, colH], ci) => {
      const base = h * 0.62;
      g.fillStyle(DEVOUR.iron, 1);
      g.fillRect(colX - 20, base - colH, 40, colH);
      g.fillStyle(mixC(DEVOUR.gold, 0x000000, 0.42), 1);
      g.fillRect(colX - 20, base - colH, 13, colH);
      // Sinew wound round the shaft.
      g.lineStyle(3, DEVOUR.plate, 0.7);
      for (let k = 0; k < 6; k++) {
        const y = base - colH + 18 + k * (colH / 7);
        g.beginPath();
        g.moveTo(colX - 22, y);
        g.lineTo(colX + 22, y + 9);
        g.strokePath();
      }
      // The snapped top has closed over.
      g.fillStyle(DEVOUR.plate, 0.9);
      g.fillPoints(blob(g, colX, base - colH + 4, 26, 15, 3, 0.3, ci), true, true);
      g.lineStyle(2, DEVOUR.violetLit, 0.35);
      g.strokePoints(blob(g, colX, base - colH + 4, 26, 15, 3, 0.3, ci), true, true);
      // Plinth.
      g.fillStyle(DEVOUR.ironLit, 1);
      g.fillRect(colX - 30, base - 12, 60, 14);
      g.fillStyle(DEVOUR.iron, 0.85);
      g.fillCircle(colX - 34, base + 6, 9);
      g.fillCircle(colX + 30, base + 10, 7);
    });

    // Veins running out of the centre of the floor instead of cracks.
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.4;
      vein(g, w / 2, h * 0.78, a, 190, 3, mixC(DEVOUR.violet, DEVOUR.gloom, 0.4), 0.45, 0, i);
    }
  }

  // ── The mech, grown through ─────────────────────────────────────────

  static override drawMechBody(g: Phaser.GameObjects.Graphics, p: MechPose): void {
    g.clear();
    const { cx } = p;
    const breathe = p.dead ? 0 : Math.sin(p.time / 700) * 6;
    const heat = p.dead ? 0 : (p.enraged ? 0.9 : 0.45) * (0.7 + 0.3 * Math.sin(p.time / (p.enraged ? 140 : 300)));
    const TORSO_TOP = 158;
    const TORSO_BOT = 342;
    const HW_TOP = 196;
    const HW_BOT = 150;

    // Legs — bone struts with muscle slung between them.
    for (const side of [-1, 1] as const) {
      const hipX = cx + side * 96;
      const hipY = TORSO_BOT - 10 + breathe;
      DevouredFx.limb(g, hipX, hipY, hipX + side * 150, hipY + 210, 54, 40, p.dead);
      g.fillStyle(p.dead ? DEVOUR.iron : DEVOUR.plate, 1);
      g.fillPoints(blob(g, hipX + side * 150, hipY + 210, 42, 40, 4, 0.12, side), true, true);
      g.lineStyle(4, DEVOUR.voidBlack, 1);
      g.strokePoints(blob(g, hipX + side * 150, hipY + 210, 42, 40, 4, 0.12, side), true, true);
      // Knee socket, exposed.
      g.fillStyle(DEVOUR.gold, 0.85);
      g.fillCircle(hipX + side * 150 - side * 10, hipY + 196, 15);
      g.fillStyle(DEVOUR.voidBlack, 0.6);
      g.fillCircle(hipX + side * 150 - side * 10, hipY + 196, 7);
    }

    // Torso — the same slab, with the plates prised apart and meat between them.
    const torsoTop = TORSO_TOP + breathe;
    const torsoBot = TORSO_BOT + breathe;
    const body = [
      new Phaser.Geom.Point(cx - HW_TOP, torsoTop),
      new Phaser.Geom.Point(cx + HW_TOP, torsoTop),
      new Phaser.Geom.Point(cx + HW_BOT, torsoBot),
      new Phaser.Geom.Point(cx - HW_BOT, torsoBot),
    ];
    g.fillStyle(p.dead ? DEVOUR.iron : DEVOUR.plate, 1);
    g.fillPoints(body, true, true);
    g.lineStyle(6, DEVOUR.voidBlack, 1);
    g.strokePoints(body, true, true);
    g.fillStyle(p.dead ? DEVOUR.ironLit : DEVOUR.plateLit, 1);
    g.fillPoints([
      new Phaser.Geom.Point(cx - HW_TOP, torsoTop),
      new Phaser.Geom.Point(cx - HW_TOP + 62, torsoTop),
      new Phaser.Geom.Point(cx - HW_BOT + 48, torsoBot),
      new Phaser.Geom.Point(cx - HW_BOT, torsoBot),
    ], true, true);

    // Ribs instead of armour bands — bone arcs breaking out through the plate.
    for (let i = 0; i < 5; i++) {
      const by = torsoTop + 26 + i * 40;
      const hw = Phaser.Math.Linear(HW_TOP, HW_BOT, (by - torsoTop) / (torsoBot - torsoTop)) - 6;
      for (const side of [-1, 1] as const) {
        g.lineStyle(9, DEVOUR.voidBlack, 0.7);
        g.beginPath();
        g.moveTo(cx, by + 8);
        g.lineTo(cx + side * hw * 0.6, by - 4);
        g.lineTo(cx + side * hw, by + 12);
        g.strokePath();
        g.lineStyle(5, mixC(DEVOUR.gold, DEVOUR.plate, 0.25), 0.9);
        g.beginPath();
        g.moveTo(cx, by + 8);
        g.lineTo(cx + side * hw * 0.6, by - 4);
        g.lineTo(cx + side * hw, by + 12);
        g.strokePath();
      }
    }

    // The reactor is a stomach: a translucent sac with something turning in it.
    const coreY = torsoTop + 96;
    if (!p.dead) {
      const bleed = 1 - p.hpRatio;
      for (let k = 6; k >= 1; k--) {
        g.fillStyle(DEVOUR.ember, 0.045 * heat * (1 + bleed));
        g.fillCircle(cx, coreY, 26 + k * 10);
      }
      g.fillStyle(mixC(DEVOUR.gloom, DEVOUR.violet, 0.5), 0.95);
      g.fillPoints(blob(g, cx, coreY, 34, 32, 4, 0.10, p.time / 900), true, true);
      g.fillStyle(mixC(DEVOUR.ember, DEVOUR.emberLit, heat), 0.55);
      g.fillCircle(cx, coreY, 20);
      // Something half-dissolved, turning over inside it.
      const t = p.time / 1400;
      g.fillStyle(DEVOUR.gold, 0.75);
      g.fillEllipse(cx + Math.cos(t) * 9, coreY + Math.sin(t) * 6, 15, 9);
      g.fillStyle(DEVOUR.voidBlack, 0.6);
      g.fillCircle(cx + Math.cos(t) * 9 - 3, coreY + Math.sin(t) * 6, 2.5);
      g.fillCircle(cx + Math.cos(t) * 9 + 3, coreY + Math.sin(t) * 6, 2.5);
    } else {
      g.fillStyle(DEVOUR.voidBlack, 1);
      g.fillCircle(cx, coreY, 28);
    }
    // Cartilage cage over the sac.
    g.lineStyle(4, DEVOUR.rivet, 0.8);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI + Math.PI / 10;
      g.lineBetween(cx - Math.cos(a) * 34, coreY - Math.sin(a) * 34, cx + Math.cos(a) * 34, coreY + Math.sin(a) * 34);
    }

    // Battle damage: the seams are wounds, and they weep ghostlight.
    const seams = Math.round((1 - p.hpRatio) * 5);
    for (let i = 0; i < seams; i++) {
      const sy = torsoTop + 40 + i * 52;
      const dir = i % 2 === 0 ? -1 : 1;
      g.lineStyle(9, DEVOUR.voidBlack, 0.85);
      g.beginPath();
      g.moveTo(cx + dir * 30, sy);
      g.lineTo(cx + dir * 84, sy + 20);
      g.lineTo(cx + dir * 58, sy + 44);
      g.lineTo(cx + dir * 122, sy + 60);
      g.strokePath();
      if (p.dead) continue;
      g.lineStyle(3, mixC(DEVOUR.ember, DEVOUR.emberLit, heat), 0.55 + 0.35 * heat);
      g.beginPath();
      g.moveTo(cx + dir * 30, sy);
      g.lineTo(cx + dir * 84, sy + 20);
      g.lineTo(cx + dir * 58, sy + 44);
      g.lineTo(cx + dir * 122, sy + 60);
      g.strokePath();
      teeth(g, cx + dir * 30, sy, cx + dir * 84, sy + 20, 5, 7, DEVOUR.bone, 0.5, dir === -1 ? 1 : -1);
    }

    // Shoulders — sacs, not pauldrons, with a spur of bone through each.
    for (const side of [-1, 1] as const) {
      const sx = cx + side * 258;
      const sy = 178 + breathe;
      const pts = blob(g, sx, sy, 82, 66, 5, 0.10, side * 2 + p.time / 1600);
      g.fillStyle(p.dead ? DEVOUR.iron : DEVOUR.plate, 1);
      g.fillPoints(pts, true, true);
      g.lineStyle(6, DEVOUR.voidBlack, 1);
      g.strokePoints(pts, true, true);
      g.lineStyle(2, DEVOUR.violetLit, 0.35);
      for (let i = -1; i <= 1; i++) {
        vein(g, sx + i * 22, sy - 40, Math.PI / 2 + i * 0.2, 80, 3, DEVOUR.violetLit, 0.30, p.time, i + side + 4);
      }
      g.fillStyle(mixC(DEVOUR.gold, 0x000000, 0.15), 1);
      g.fillTriangle(sx + side * 58, sy - 30, sx + side * 58, sy + 18, sx + side * 124, sy - 12);
      g.lineStyle(3, DEVOUR.voidBlack, 1);
      g.strokeTriangle(sx + side * 58, sy - 30, sx + side * 58, sy + 18, sx + side * 124, sy - 12);
    }
  }

  /**
   * The head. Same target bracket, same hitbox, same visor slit — but the helm
   * has split and there is a face growing out of it looking back at you.
   */
  static override drawMechHead(g: Phaser.GameObjects.Graphics, p: MechPose, hurtFlash: number): void {
    g.clear();
    const cx = p.cx + (p.dead ? 0 : Math.sin(p.time / 1100) * 5);
    const cy = MECH_HEAD_CY + (p.dead ? 26 : Math.sin(p.time / 800) * 3);
    const pulse = p.dead ? 0 : 0.7 + 0.3 * Math.sin(p.time / (p.enraged ? 130 : 240));

    // Throat, disappearing behind the torso.
    g.fillStyle(DEVOUR.iron, 1);
    g.fillRect(cx - 40, cy + 40, 80, 70);
    g.lineStyle(3, DEVOUR.rivet, 0.5);
    for (let i = 0; i < 4; i++) g.lineBetween(cx - 40, cy + 50 + i * 16, cx + 40, cy + 54 + i * 16);
    g.lineStyle(4, DEVOUR.voidBlack, 1);
    g.strokeRect(cx - 40, cy + 40, 80, 70);

    // Helm — still an octagon, but the plates have been pushed apart.
    const helm: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const swell = 1 + Math.sin(p.time / 620 + i) * 0.035;
      helm.push(new Phaser.Geom.Point(cx + Math.cos(a) * MECH_HEAD_RX * swell, cy + Math.sin(a) * MECH_HEAD_RY * swell));
    }
    g.fillStyle(p.dead ? DEVOUR.iron : DEVOUR.plate, 1);
    g.fillPoints(helm, true, true);
    g.lineStyle(6, DEVOUR.voidBlack, 1);
    g.strokePoints(helm, true, true);

    // Bone crown of the helm, cracked down the middle.
    g.fillStyle(p.dead ? DEVOUR.ironLit : mixC(DEVOUR.gold, DEVOUR.plate, 0.35), 1);
    g.fillPoints([
      new Phaser.Geom.Point(cx - MECH_HEAD_RX * 0.82, cy - MECH_HEAD_RY * 0.36),
      new Phaser.Geom.Point(cx - MECH_HEAD_RX * 0.32, cy - MECH_HEAD_RY * 0.94),
      new Phaser.Geom.Point(cx + MECH_HEAD_RX * 0.32, cy - MECH_HEAD_RY * 0.94),
      new Phaser.Geom.Point(cx + MECH_HEAD_RX * 0.82, cy - MECH_HEAD_RY * 0.36),
      new Phaser.Geom.Point(cx, cy - MECH_HEAD_RY * 0.30),
    ], true, true);
    g.lineStyle(3, DEVOUR.voidBlack, 0.85);
    g.lineBetween(cx, cy - MECH_HEAD_RY * 0.92, cx, cy - MECH_HEAD_RY * 0.30);

    // The visor is a mouth now: a slit of ghostlight behind a rank of teeth.
    const visorY = cy + 8;
    g.fillStyle(DEVOUR.voidBlack, 1);
    g.fillRect(cx - 70, visorY - 15, 140, 30);
    if (!p.dead) {
      for (let k = 4; k >= 1; k--) {
        g.fillStyle(DEVOUR.ember, 0.055 * pulse);
        g.fillRect(cx - 70 - k * 5, visorY - 15 - k * 3, 140 + k * 10, 30 + k * 6);
      }
      g.fillStyle(mixC(DEVOUR.ember, DEVOUR.emberLit, pulse), 0.9);
      g.fillRect(cx - 64, visorY - 8, 128, 16);
      teeth(g, cx - 64, visorY - 8, cx + 64, visorY - 8, 9, 9, DEVOUR.bone, 0.95, 1);
      teeth(g, cx - 64, visorY + 8, cx + 64, visorY + 8, 9, 9, DEVOUR.bone, 0.85, -1);
    } else {
      g.lineStyle(2, DEVOUR.iron, 0.9);
      g.lineBetween(cx - 60, visorY - 12, cx - 20, visorY + 12);
      g.lineBetween(cx - 20, visorY + 12, cx + 24, visorY - 10);
    }
    g.lineStyle(4, DEVOUR.iron, 1);
    g.strokeRect(cx - 70, visorY - 15, 140, 30);

    // A second, smaller face pushing out of the jaw grille — the passenger.
    if (!p.dead) {
      g.fillStyle(DEVOUR.plateLit, 1);
      g.fillPoints(blob(g, cx, cy + 44, 44, 15, 4, 0.14, p.time / 800), true, true);
      g.fillStyle(DEVOUR.voidBlack, 0.9);
      g.fillEllipse(cx - 15, cy + 42, 7, 5);
      g.fillEllipse(cx + 15, cy + 42, 7, 5);
      g.fillStyle(DEVOUR.emberLit, 0.75 * pulse);
      g.fillCircle(cx - 15, cy + 42, 2);
      g.fillCircle(cx + 15, cy + 42, 2);
    } else {
      g.fillStyle(DEVOUR.iron, 1);
      g.fillRect(cx - 48, cy + 34, 96, 22);
    }

    // Horns rather than antler vents.
    for (const side of [-1, 1] as const) {
      g.lineStyle(9, DEVOUR.voidBlack, 1);
      g.beginPath();
      g.moveTo(cx + side * 74, cy - 42);
      g.lineTo(cx + side * 126, cy - 74);
      g.lineTo(cx + side * 152, cy - 30);
      g.strokePath();
      g.lineStyle(5, mixC(DEVOUR.gold, DEVOUR.plate, 0.2), 1);
      g.beginPath();
      g.moveTo(cx + side * 74, cy - 42);
      g.lineTo(cx + side * 126, cy - 74);
      g.lineTo(cx + side * 152, cy - 30);
      g.strokePath();
    }

    if (p.dead) return;

    // The bracket is unchanged in every dimension that matters — it is still
    // drawn on the hitbox radius, because that is the whole point of it.
    const bracket = mixC(DEVOUR.warn, DEVOUR.warnLit, 0.4 + 0.4 * Math.sin(p.time / 400));
    g.lineStyle(1, bracket, 0.22);
    g.strokeCircle(cx, cy, MECH_HEAD_HIT_R);
    g.lineStyle(2, bracket, 0.55);
    const bw = MECH_HEAD_HIT_R + 14;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      g.beginPath();
      g.moveTo(cx + sx * bw, cy + sy * bw - sy * 22);
      g.lineTo(cx + sx * bw, cy + sy * bw);
      g.lineTo(cx + sx * bw - sx * 22, cy + sy * bw);
      g.strokePath();
    }

    if (hurtFlash > 0) {
      g.fillStyle(DEVOUR.warnLit, 0.55 * hurtFlash);
      g.fillPoints(helm, true, true);
    }
  }

  static override drawMechArms(g: Phaser.GameObjects.Graphics, p: MechPose, arms: MechArmPose[]): void {
    g.clear();
    if (p.dead) return;

    for (const a of arms) {
      const shX = p.cx + a.side * 258;
      const shY = 178;
      const ex = (shX + a.fistX) / 2 + a.side * 58;
      const ey = (shY + a.fistY) / 2;

      DevouredFx.limb(g, shX, shY, ex, ey, 46, 38, false);
      DevouredFx.limb(g, ex, ey, a.fistX, a.fistY, 38, 32, false);

      // Elbow — a joint that has swollen.
      g.fillStyle(DEVOUR.plate, 1);
      g.fillPoints(blob(g, ex, ey, 42, 40, 4, 0.09, a.side), true, true);
      g.lineStyle(5, DEVOUR.voidBlack, 1);
      g.strokePoints(blob(g, ex, ey, 42, 40, 4, 0.09, a.side), true, true);
      g.fillStyle(DEVOUR.plateLit, 1);
      g.fillCircle(ex - a.side * 10, ey - 12, 15);

      // The fist is a fused hand — knuckles are claws.
      const r = 46;
      const fist = blob(g, a.fistX, a.fistY, r, r, 5, 0.10, a.side * 3 + p.time / 1200);
      g.fillStyle(DEVOUR.plate, 1);
      g.fillPoints(fist, true, true);
      g.lineStyle(5, DEVOUR.voidBlack, 1);
      g.strokePoints(fist, true, true);
      for (let k = 0; k < 4; k++) {
        const kx = a.fistX - 27 + k * 18;
        const ky = a.fistY - 22;
        g.fillStyle(mixC(DEVOUR.gold, 0x000000, 0.12), 1);
        g.fillTriangle(kx - 6, ky + 8, kx + 6, ky + 8, kx + (k - 1.5) * 3, ky - 16);
        g.lineStyle(1.5, DEVOUR.voidBlack, 0.8);
        g.strokeTriangle(kx - 6, ky + 8, kx + 6, ky + 8, kx + (k - 1.5) * 3, ky - 16);
      }

      if (a.hot) {
        for (let k = 4; k >= 1; k--) {
          g.lineStyle(3, DEVOUR.ember, 0.10 * (5 - k) * (0.6 + 0.4 * Math.sin(p.time / 90)));
          g.strokeCircle(a.fistX, a.fistY, r + k * 7);
        }
      }
    }
  }

  /** A limb segment: muscle sleeve with a bone strut running through it. */
  private static limb(
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
    g.fillStyle(dead ? DEVOUR.iron : DEVOUR.plate, 1);
    g.fillPoints(quad, true, true);
    g.lineStyle(5, DEVOUR.voidBlack, 1);
    g.strokePoints(quad, true, true);
    // The strut.
    g.lineStyle(Math.max(6, (w1 + w2) * 0.22), mixC(DEVOUR.gold, DEVOUR.plate, 0.4), 0.55);
    g.lineBetween(x1, y1, x2, y2);
    // Fibres pulled across it.
    g.lineStyle(2, DEVOUR.rivet, 0.55);
    for (let i = 1; i <= 4; i++) {
      const t = i / 5;
      const px = Phaser.Math.Linear(x1, x2, t);
      const py = Phaser.Math.Linear(y1, y2, t);
      const pw = Phaser.Math.Linear(w1, w2, t) * 0.85;
      g.lineBetween(px + nx * pw, py + ny * pw - 4, px - nx * pw, py - ny * pw + 4);
    }
  }

  // ── Telegraphs ──────────────────────────────────────────────────────

  /** The lance column becomes a throat opening straight down the arena. */
  static override drawLaserColumn(
    g: Phaser.GameObjects.Graphics,
    x: number, top: number, bottom: number, halfWidth: number,
    charge: number, fire: number, time: number,
  ): void {
    g.clear();
    const h = bottom - top;

    if (charge > 0) {
      const beat = Math.abs(Math.sin(charge * Math.PI * 3));
      g.fillStyle(DEVOUR.gloom, 0.14 + 0.24 * beat * charge);
      g.fillRect(x - halfWidth, top, halfWidth * 2, h);
      g.lineStyle(2, mixC(DEVOUR.warn, DEVOUR.warnLit, beat), 0.5 + 0.45 * charge);
      g.strokeRect(x - halfWidth, top, halfWidth * 2, h);
      // Teeth closing in from both walls instead of hazard chevrons.
      teeth(g, x - halfWidth, top, x - halfWidth, bottom, 16, 12 * charge, DEVOUR.bone, 0.35 + 0.4 * beat, -1);
      teeth(g, x + halfWidth, top, x + halfWidth, bottom, 16, 12 * charge, DEVOUR.bone, 0.35 + 0.4 * beat, 1);
      return;
    }

    if (fire <= 0) return;
    const k = 1 - fire;
    for (let i = 5; i >= 1; i--) {
      g.fillStyle(DEVOUR.ember, 0.09 * i * k);
      g.fillRect(x - halfWidth * (1 + i * 0.14), top, halfWidth * 2 * (1 + i * 0.14), h);
    }
    g.fillStyle(DEVOUR.emberLit, 0.85 * k);
    g.fillRect(x - halfWidth * 0.7, top, halfWidth * 1.4, h);
    g.fillStyle(DEVOUR.bone, k);
    g.fillRect(x - halfWidth * 0.3, top, halfWidth * 0.6, h);
    // Faces streaming down the column — this is what the light is made of.
    g.fillStyle(DEVOUR.gloom, 0.55 * k);
    for (let i = 0; i < 9; i++) {
      const t = ((time / 400 + i * 0.11) % 1);
      const fy = top + t * h;
      g.fillEllipse(x + Math.sin(i * 2.1 + time / 300) * halfWidth * 0.5, fy, 16, 20);
    }
    g.fillStyle(DEVOUR.emberLit, 0.45 * k);
    g.fillEllipse(x, bottom, halfWidth * 5, 40);
  }

  /** Bile glob reticle — a stain spreading on the floor. */
  static override drawRocketMarker(
    g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, t: number,
  ): void {
    g.fillStyle(DEVOUR.violet, 0.10 + 0.22 * t);
    g.fillPoints(blob(g, x, y, radius, radius * 0.62, 4, 0.14, x), true, true);
    g.lineStyle(2, mixC(DEVOUR.warn, DEVOUR.warnLit, t), 0.85);
    g.strokePoints(blob(g, x, y, radius * (1.7 - 0.7 * t), radius * (1.7 - 0.7 * t) * 0.62, 4, 0.14, x), true, true);
    g.lineStyle(2, DEVOUR.violetLit, 0.5);
    g.strokePoints(blob(g, x, y, radius, radius * 0.62, 4, 0.14, x), true, true);
    // Rising bubbles as the ground gets ready to be hit.
    g.fillStyle(DEVOUR.emberLit, 0.35 + 0.4 * t);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + t * 2;
      g.fillCircle(x + Math.cos(a) * radius * 0.6, y + Math.sin(a) * radius * 0.38, 2 + t * 2);
    }
  }

  /** A thrown glob of something, trailing strings. */
  static override drawRocket(
    g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number, time: number,
  ): void {
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const px = -ny;
    const py = nx;
    // Trailing strings of it, whipping.
    for (let i = 1; i <= 3; i++) {
      const s = Math.sin(time / 70 + i) * 6;
      g.lineStyle(4 - i, DEVOUR.violet, 0.5 - i * 0.12);
      g.lineBetween(x - nx * i * 8, y - ny * i * 8, x - nx * (i + 1) * 8 + px * s, y - ny * (i + 1) * 8 + py * s);
    }
    g.fillStyle(DEVOUR.gloom, 1);
    g.fillPoints(blob(g, x, y, 13, 11, 4, 0.18, time / 200), true, true);
    g.fillStyle(DEVOUR.violet, 0.9);
    g.fillPoints(blob(g, x, y, 9, 8, 4, 0.18, time / 200), true, true);
    g.fillStyle(DEVOUR.emberLit, 0.85);
    g.fillCircle(x - nx * 2, y - ny * 2, 3.4);
    g.fillStyle(DEVOUR.bone, 0.7);
    g.fillCircle(x + nx * 4 - px * 2, y + ny * 4 - py * 2, 1.8);
  }

  /** The suppressing stream fires teeth. */
  static override drawBullet(g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number): void {
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const px = -ny;
    const py = nx;
    g.fillStyle(DEVOUR.ember, 0.28);
    g.fillEllipse(x - nx * 8, y - ny * 8, 20, 6);
    g.fillStyle(DEVOUR.bone, 0.95);
    g.fillTriangle(
      x + nx * 7, y + ny * 7,
      x - nx * 4 + px * 3.2, y - ny * 4 + py * 3.2,
      x - nx * 4 - px * 3.2, y - ny * 4 - py * 3.2,
    );
    g.fillStyle(DEVOUR.violet, 0.8);
    g.fillCircle(x - nx * 3, y - ny * 3, 1.8);
  }

  /** The slam mark is an iris in the floor, closing. */
  static override drawSlamMarker(
    g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, t: number, time: number,
  ): void {
    g.fillStyle(DEVOUR.gloom, 0.10 + 0.24 * t);
    g.fillPoints(blob(g, x, y, radius, radius * 0.72, 5, 0.08, x), true, true);
    g.lineStyle(3, mixC(DEVOUR.warn, DEVOUR.warnLit, t), 0.9);
    g.strokePoints(blob(g, x, y, radius, radius * 0.72, 5, 0.08, x), true, true);
    // The iris: teeth on a ring that closes with the fist.
    const inner = radius * (1 - t * 0.86) + 6;
    g.lineStyle(4, DEVOUR.violetLit, 0.85);
    g.strokeCircle(x, y, inner);
    const spin = time / 500;
    g.fillStyle(DEVOUR.bone, 0.6 + 0.35 * t);
    for (let i = 0; i < 12; i++) {
      const a = spin + (i / 12) * Math.PI * 2;
      const j = JITTER[i % JITTER.length];
      g.fillTriangle(
        x + Math.cos(a - 0.1) * radius * 0.92, y + Math.sin(a - 0.1) * radius * 0.66,
        x + Math.cos(a + 0.1) * radius * 0.92, y + Math.sin(a + 0.1) * radius * 0.66,
        x + Math.cos(a) * inner * j, y + Math.sin(a) * inner * 0.72 * j,
      );
    }
  }

  /** The Judgement Arc's wedge, as a tongue about to be put through the room. */
  static override drawSweepFan(
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
    g.fillStyle(DEVOUR.violet, 0.06 + 0.12 * charge);
    g.fillPoints(pts, true, true);
    g.lineStyle(2, mixC(DEVOUR.warn, DEVOUR.warnLit, beat), 0.35 + 0.45 * charge);
    g.strokePoints(pts, true, true);

    // The leading edge, and a run of teeth along it — the side it comes from.
    g.lineStyle(4, DEVOUR.warnLit, 0.55 + 0.4 * beat);
    g.lineBetween(ox, oy, ox + Math.cos(a0) * len, oy + Math.sin(a0) * len);
    teeth(g, ox, oy, ox + Math.cos(a0) * len, oy + Math.sin(a0) * len, 14, 9,
      DEVOUR.bone, 0.30 + 0.4 * beat, Math.sign(a1 - a0) >= 0 ? 1 : -1);

    // Sweep arrows kept exactly where they were — the direction cue must survive.
    const dir = Math.sign(a1 - a0) || 1;
    g.lineStyle(2, DEVOUR.warnLit, 0.30 + 0.35 * beat);
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

  /** The arc itself: a tongue, wet and ribbed, with ghostlight running down it. */
  static override drawSweepBeam(
    g: Phaser.GameObjects.Graphics,
    ox: number, oy: number, angle: number, len: number, halfW: number, time: number,
  ): void {
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const px = -ny;
    const py = nx;
    const bar = (w: number, tipMult: number) => [
      new Phaser.Geom.Point(ox + px * w * 0.35, oy + py * w * 0.35),
      new Phaser.Geom.Point(ox + nx * len + px * w * tipMult, oy + ny * len + py * w * tipMult),
      new Phaser.Geom.Point(ox + nx * len - px * w * tipMult, oy + ny * len - py * w * tipMult),
      new Phaser.Geom.Point(ox - px * w * 0.35, oy - py * w * 0.35),
    ];
    for (let i = 4; i >= 1; i--) {
      g.fillStyle(DEVOUR.ember, 0.08 * i);
      g.fillPoints(bar(halfW * (1 + i * 0.35), 1.5), true, true);
    }
    g.fillStyle(DEVOUR.violet, 0.9);
    g.fillPoints(bar(halfW, 1.25), true, true);
    g.fillStyle(DEVOUR.emberLit, 0.9);
    g.fillPoints(bar(halfW * 0.42, 1.1), true, true);
    // Papillae ribbing across the tongue.
    g.lineStyle(2, DEVOUR.violetLit, 0.5);
    for (let i = 1; i < 14; i++) {
      const r = (len / 14) * i;
      const w = halfW * (1 + i * 0.05);
      g.lineBetween(ox + nx * r + px * w, oy + ny * r + py * w, ox + nx * r - px * w, oy + ny * r - py * w);
    }
    // Motes running the length of it.
    g.fillStyle(DEVOUR.bone, 0.75);
    for (let i = 0; i < 8; i++) {
      const t = ((time / 120 + i * 0.31) % 1);
      const r = len * t;
      const off = Math.sin(time / 60 + i * 2.1) * halfW * 1.7;
      g.fillCircle(ox + nx * r + px * off, oy + ny * r + py * off, 2.6);
    }
    g.fillStyle(DEVOUR.emberLit, 0.5);
    g.fillCircle(ox, oy, halfW * 1.8);
  }

  /** A scatter charge becomes an egg sac. Same trigger ring, same arming tell. */
  static override drawMine(
    g: Phaser.GameObjects.Graphics, x: number, y: number, arm: number, triggerR: number, time: number,
  ): void {
    const live = arm >= 1;
    const blink = live ? 0.5 + 0.5 * Math.sin(time / 90) : 0.25 * arm;

    // Trigger footprint — the ground it has rooted into.
    const segs = 18;
    g.lineStyle(2, live ? mixC(DEVOUR.warn, DEVOUR.warnLit, blink) : DEVOUR.iron, live ? 0.55 : 0.30);
    for (let i = 0; i < segs; i++) {
      if (!live && i % 2 === 1) continue;
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2 / segs) * 0.68;
      g.beginPath();
      g.arc(x, y, triggerR * (live ? 1 + 0.02 * Math.sin(time / 220) : arm), a0, a1);
      g.strokePath();
    }
    if (live) {
      g.fillStyle(DEVOUR.violet, 0.05 + 0.05 * blink);
      g.fillCircle(x, y, triggerR);
    }

    // Roots into the flagstones.
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      vein(g, x, y, a, 22, 3, DEVOUR.violet, 0.6, time, i);
    }
    // The sac: translucent, with something curled up in it.
    g.fillStyle(DEVOUR.voidBlack, 0.4);
    g.fillEllipse(x, y + 7, 26, 9);
    g.fillStyle(mixC(DEVOUR.gloom, DEVOUR.violet, 0.4), 0.95);
    g.fillPoints(blob(g, x, y - 2, 17, 16, 4, 0.12, x + time / 700), true, true);
    g.lineStyle(2, DEVOUR.rivet, 0.8);
    g.strokePoints(blob(g, x, y - 2, 17, 16, 4, 0.12, x + time / 700), true, true);
    // The occupant, coiled — brighter and moving once it is live.
    g.fillStyle(live ? mixC(DEVOUR.warn, DEVOUR.warnLit, blink) : DEVOUR.iron, live ? 0.9 : 0.5);
    const coil = live ? time / 160 : 0;
    g.beginPath();
    for (let i = 0; i <= 10; i++) {
      const a = coil + (i / 10) * Math.PI * 2.4;
      const r = 3 + i * 0.7;
      const cxp = x + Math.cos(a) * r;
      const cyp = y - 2 + Math.sin(a) * r * 0.8;
      if (i === 0) g.moveTo(cxp, cyp); else g.lineTo(cxp, cyp);
    }
    g.lineStyle(2.5, live ? mixC(DEVOUR.warn, DEVOUR.warnLit, blink) : DEVOUR.iron, live ? 0.95 : 0.45);
    g.strokePath();
    if (live) {
      for (let k = 3; k >= 1; k--) {
        g.fillStyle(DEVOUR.warn, 0.09 * blink);
        g.fillCircle(x, y - 2, 8 + k * 5);
      }
    }
    // Wet highlight on the membrane.
    g.fillStyle(DEVOUR.bone, 0.35);
    g.fillEllipse(x - 5, y - 8, 6, 4);
  }

  /** The stamp's shockwave, as peristalsis: a ridge of floor rolling outward. */
  static override drawShockRing(
    g: Phaser.GameObjects.Graphics,
    cx: number, cy: number, radius: number,
    gapCentre: number, gapHalf: number, time: number,
  ): void {
    if (radius <= 4) return;
    const from = gapCentre + gapHalf;
    const to = gapCentre + Math.PI * 2 - gapHalf;

    for (let k = 3; k >= 1; k--) {
      g.lineStyle(6 + k * 8, DEVOUR.violet, 0.05);
      g.beginPath(); g.arc(cx, cy, radius, from, to); g.strokePath();
    }
    g.lineStyle(11, mixC(DEVOUR.violet, DEVOUR.violetLit, 0.4 + 0.4 * Math.sin(time / 110)), 0.85);
    g.beginPath(); g.arc(cx, cy, radius, from, to); g.strokePath();
    g.lineStyle(3, DEVOUR.bone, 0.6);
    g.beginPath(); g.arc(cx, cy, radius - 4, from, to); g.strokePath();

    // Blisters riding the crest instead of kicked-up slabs.
    const count = Math.max(8, Math.round(radius / 26));
    for (let i = 0; i < count; i++) {
      const a = from + ((to - from) * i) / count;
      const j = JITTER[i % JITTER.length];
      g.fillStyle(mixC(DEVOUR.plate, DEVOUR.violet, 0.5), 0.8);
      g.fillCircle(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, 6 * j);
      g.fillStyle(DEVOUR.bone, 0.4);
      g.fillCircle(cx + Math.cos(a) * radius - 2, cy + Math.sin(a) * radius - 2, 2 * j);
    }

    // The safe wedge stays marked in exactly the same green — it is a rule of
    // the fight, not a decoration, and hard mode does not get to hide it.
    g.lineStyle(2, 0x67e8a0, 0.55);
    for (const edge of [gapCentre - gapHalf, gapCentre + gapHalf]) {
      g.lineBetween(
        cx + Math.cos(edge) * (radius - 26), cy + Math.sin(edge) * (radius - 26),
        cx + Math.cos(edge) * (radius + 26), cy + Math.sin(edge) * (radius + 26),
      );
    }
  }

  /** Where a fist landed, the floor does not crack — it opens. */
  static override drawCrater(g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number): void {
    g.fillStyle(DEVOUR.voidBlack, 0.55);
    g.fillPoints(blob(g, x, y, radius, radius * 0.55, 5, 0.14, x), true, true);
    g.lineStyle(3, mixC(DEVOUR.plate, DEVOUR.violet, 0.5), 0.8);
    g.strokePoints(blob(g, x, y, radius, radius * 0.55, 5, 0.14, x), true, true);
    teeth(g, x - radius, y, x + radius, y, 9, 8, DEVOUR.bone, 0.35, -1);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.3;
      vein(g, x + Math.cos(a) * radius * 0.8, y + Math.sin(a) * radius * 0.44, a, radius * 0.7, 2.5,
        DEVOUR.violet, 0.4, 0, i);
    }
  }

  // ── The King, gaunter ───────────────────────────────────────────────

  static override drawKing(
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

    // Aura — a wound-red bloom rather than a bruise of violet.
    const auraStr = opts.casting ? 0.11 : 0.06;
    for (let k = 7; k >= 1; k--) {
      g.fillStyle(DEVOUR.violet, auraStr * (0.35 + 0.65 * rise) * (0.75 + 0.25 * Math.sin(time / 480)));
      g.fillCircle(cx, cy, R + k * 6);
    }

    g.fillStyle(DEVOUR.voidBlack, 0.5 * rise);
    g.fillEllipse(x, y + R + 8, R * 2.3, R * 0.6);

    // The cloak has gone to gauze: thinner lobes, and you can see through them.
    const hemY = cy + R + 12 * rise;
    const lobe = (ox: number, w: number, phase: number, len: number, alpha: number) => {
      const t = Math.sin(time / (520 + phase * 130) + phase) * 9;
      g.fillStyle(DEVOUR.gloom, alpha);
      g.fillTriangle(cx + ox - w, cy + 2, cx + ox + w, cy + 2, cx + ox + t, hemY + len * rise);
    };
    lobe(-18, 16, 0, 32, 0.85);
    lobe(18, 16, 2, 30, 0.85);
    lobe(0, 20, 1, 44, 0.95);
    g.fillStyle(mixC(DEVOUR.gloom, DEVOUR.violet, 0.30), 1);
    lobe(-9, 12, 3, 26, 0.8);

    // Ribs showing through the shroud.
    g.fillStyle(DEVOUR.gloom, 1);
    g.fillEllipse(cx, cy + 6, R * 2.0, R * 1.6);
    g.lineStyle(3, DEVOUR.voidBlack, 1);
    g.strokeEllipse(cx, cy + 6, R * 2.0, R * 1.6);
    g.lineStyle(1.5, DEVOUR.gold, 0.45);
    for (let i = -1; i <= 2; i++) {
      g.beginPath();
      g.arc(cx, cy + 2 + i * 6, R * 0.85, 0.25, Math.PI - 0.25);
      g.strokePath();
    }

    // Hood.
    g.fillStyle(mixC(DEVOUR.gloom, 0x000000, 0.4), 1);
    g.fillTriangle(cx - 17, cy - 2, cx + 17, cy - 2, cx, cy - R - 8);
    g.fillEllipse(cx, cy - 7, 30, 26);
    g.fillStyle(DEVOUR.voidBlack, 1);
    g.fillEllipse(cx, cy - 5, 22, 19);

    // Too many eyes, and they do not blink together.
    for (let i = 0; i < 3; i++) {
      const glow = 0.55 + 0.45 * Math.sin(time / (280 + i * 90) + i);
      g.fillStyle(mixC(DEVOUR.bone, DEVOUR.emberLit, 0.5), glow * rise);
      g.fillEllipse(cx - 6 + i * 6, cy - 8 + (i % 2) * 5, 4, 6);
    }

    if (!opts.enthroned) DevouredFx.drawBrokenCrown(g, cx, cy - R - 6, 17, 1);

    // Hands — hooked, and dripping while he casts.
    const handY = opts.casting ? cy - 6 : cy + 8;
    for (const side of [-1, 1] as const) {
      const hx = cx + side * (opts.casting ? 24 : 20);
      g.fillStyle(DEVOUR.gloom, 1);
      g.fillCircle(hx, handY, 6);
      g.lineStyle(2, DEVOUR.bone, 0.7);
      for (let i = -1; i <= 1; i++) {
        g.lineBetween(hx, handY, hx + side * 7 + i * 2, handY + 8 + Math.abs(i) * 2);
      }
      if (opts.casting) {
        for (let k = 3; k >= 1; k--) {
          g.fillStyle(DEVOUR.violetLit, 0.10 * (4 - k));
          g.fillCircle(hx, handY, 5 + k * 4);
        }
      }
    }
  }

  /** The crown, in bone rather than gold, with the break gone septic. */
  static override drawBrokenCrown(
    g: Phaser.GameObjects.Graphics, x: number, y: number, halfWidth: number, alpha: number,
  ): void {
    const w = halfWidth;
    const pts = [
      new Phaser.Geom.Point(x - w, y + 6),
      new Phaser.Geom.Point(x - w, y - 3),
      new Phaser.Geom.Point(x - w * 0.5, y + 3),
      new Phaser.Geom.Point(x, y - 8),
      new Phaser.Geom.Point(x + w * 0.5, y + 3),
      new Phaser.Geom.Point(x + w * 0.82, y - 1),
      new Phaser.Geom.Point(x + w * 0.82, y + 6),
    ];
    g.fillStyle(mixC(DEVOUR.gold, 0x000000, 0.42), alpha);
    g.fillPoints(pts, true, true);
    g.lineStyle(2, DEVOUR.goldLit, alpha * 0.9);
    g.strokePoints(pts, true, false);
    // The break, and what has got into it.
    g.lineStyle(2, DEVOUR.violetLit, alpha * 0.8);
    g.lineBetween(x + w * 0.82, y + 6, x + w * 1.18, y + 12);
    g.fillStyle(DEVOUR.violet, alpha * 0.7);
    g.fillCircle(x + w * 0.9, y + 3, 2.6);
  }

  // ── The King's attacks ──────────────────────────────────────────────

  /** The homing orb is an eye, and it is looking where it is going. */
  static override drawDarkOrb(
    g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number, time: number,
  ): void {
    for (let k = 5; k >= 1; k--) {
      g.fillStyle(DEVOUR.violet, 0.055);
      g.fillCircle(x, y, 9 + k * 4);
    }
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    // Optic nerve trailing behind it.
    for (let i = 1; i <= 4; i++) {
      g.lineStyle(5 - i, DEVOUR.violet, 0.28 - i * 0.055);
      g.lineBetween(x - nx * (i - 1) * 8, y - ny * (i - 1) * 8, x - nx * i * 8, y - ny * i * 8);
    }
    g.fillStyle(DEVOUR.bone, 1);
    g.fillCircle(x, y, 10);
    g.fillStyle(DEVOUR.violet, 0.35);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + time / 700;
      g.lineStyle(1.4, DEVOUR.violet, 0.55);
      g.lineBetween(x, y, x + Math.cos(a) * 9, y + Math.sin(a) * 9);
    }
    // The iris tracks its heading.
    g.fillStyle(DEVOUR.gloom, 1);
    g.fillCircle(x + nx * 3, y + ny * 3, 5.5);
    g.fillStyle(DEVOUR.violetLit, 0.95);
    g.fillCircle(x + nx * 3, y + ny * 3, 3.2);
    g.fillStyle(DEVOUR.voidBlack, 1);
    g.fillCircle(x + nx * 4, y + ny * 4, 1.9);
    g.fillStyle(DEVOUR.bone, 0.9);
    g.fillCircle(x + nx * 3 - 2, y + ny * 3 - 2.5, 1.4);
  }

  /** A Purge lane, as a vein in the floor swelling and then splitting open. */
  static override drawPurgeLane(
    g: Phaser.GameObjects.Graphics,
    horizontal: boolean, centre: number, halfSpan: number,
    from: number, to: number, charge: number, fire: number, time: number,
  ): void {
    const band = (thickness: number) => {
      if (horizontal) g.fillRect(from, centre - thickness, to - from, thickness * 2);
      else g.fillRect(centre - thickness, from, thickness * 2, to - from);
    };
    const rail = (off: number, width: number, color: number, alpha: number) => {
      g.lineStyle(width, color, alpha);
      if (horizontal) g.lineBetween(from, centre + off, to, centre + off);
      else g.lineBetween(centre + off, from, centre + off, to);
    };

    if (charge > 0) {
      const beat = Math.abs(Math.sin(charge * Math.PI * 3));
      g.fillStyle(DEVOUR.gloom, 0.18 + 0.28 * charge);
      band(halfSpan);
      rail(-halfSpan, 2, mixC(DEVOUR.violet, DEVOUR.violetLit, beat), 0.5 + 0.4 * charge);
      rail(halfSpan, 2, mixC(DEVOUR.violet, DEVOUR.violetLit, beat), 0.5 + 0.4 * charge);
      // The vessel itself, filling along the spine.
      rail(0, 4 + 10 * charge, DEVOUR.violet, 0.35 + 0.35 * beat);
      g.fillStyle(DEVOUR.violetLit, 0.30 + 0.4 * beat);
      for (let d = from + 24; d < to; d += 46) {
        const off = Math.sin(time / 220 + d * 0.02) * 6;
        const r = 3 + 3 * charge;
        if (horizontal) g.fillCircle(d, centre + off, r);
        else g.fillCircle(centre + off, d, r);
      }
      return;
    }

    if (fire <= 0) return;
    const k = 1 - fire;
    for (let i = 4; i >= 1; i--) {
      g.fillStyle(DEVOUR.violet, 0.10 * i * k);
      band(halfSpan * (1 + i * 0.10));
    }
    g.fillStyle(DEVOUR.gloom, 0.95 * k);
    band(halfSpan);
    g.fillStyle(DEVOUR.violetLit, 0.75 * k);
    band(halfSpan * 0.36);
    // It has split: teeth on both lips of the wound.
    if (horizontal) {
      teeth(g, from, centre - halfSpan, to, centre - halfSpan, 22, halfSpan * 0.55, DEVOUR.bone, 0.55 * k, 1);
      teeth(g, from, centre + halfSpan, to, centre + halfSpan, 22, halfSpan * 0.55, DEVOUR.bone, 0.55 * k, -1);
    } else {
      teeth(g, centre - halfSpan, from, centre - halfSpan, to, 22, halfSpan * 0.55, DEVOUR.bone, 0.55 * k, -1);
      teeth(g, centre + halfSpan, from, centre + halfSpan, to, 22, halfSpan * 0.55, DEVOUR.bone, 0.55 * k, 1);
    }
    g.fillStyle(DEVOUR.emberLit, 0.4 * k);
    for (let d = from; d < to; d += 34) {
      const s = 3 + Math.abs(Math.sin(d + time / 90)) * 5;
      if (horizontal) g.fillCircle(d, centre, s);
      else g.fillCircle(centre, d, s);
    }
  }

  /** A Dark Shield round, as a spore with a hooked shell. */
  static override drawShieldBullet(g: Phaser.GameObjects.Graphics, x: number, y: number, time: number): void {
    g.fillStyle(DEVOUR.violet, 0.20);
    g.fillCircle(x, y, 11);
    const spin = time / 400;
    g.lineStyle(1.6, DEVOUR.bone, 0.7);
    for (let i = 0; i < 6; i++) {
      const a = spin + (i / 6) * Math.PI * 2;
      g.lineBetween(x + Math.cos(a) * 4, y + Math.sin(a) * 4, x + Math.cos(a) * 9.5, y + Math.sin(a) * 9.5);
    }
    g.fillStyle(DEVOUR.gloom, 1);
    g.fillCircle(x, y, 6.5);
    g.fillStyle(mixC(DEVOUR.violet, DEVOUR.violetLit, 0.5 + 0.5 * Math.sin(time / 200)), 1);
    g.fillCircle(x, y, 4);
    g.fillStyle(DEVOUR.bone, 0.9);
    g.fillCircle(x - 1.2, y - 1.2, 1.6);
  }

  /** A Wheel of the Crown bolt, as a shed fang still turning. */
  static override drawSpiralBolt(g: Phaser.GameObjects.Graphics, x: number, y: number, time: number): void {
    const spin = time / 110;
    g.fillStyle(DEVOUR.gold, 0.16);
    g.fillCircle(x, y, 12);
    g.fillStyle(DEVOUR.gloom, 1);
    g.fillCircle(x, y, 5.5);
    for (let i = 0; i < 3; i++) {
      const a = spin + (i / 3) * Math.PI * 2;
      g.fillStyle(mixC(DEVOUR.gold, DEVOUR.goldLit, 0.5 + 0.5 * Math.sin(spin + i)), 1);
      g.fillTriangle(
        x + Math.cos(a) * 12, y + Math.sin(a) * 12,
        x + Math.cos(a + 1.1) * 4.2, y + Math.sin(a + 1.1) * 4.2,
        x + Math.cos(a - 1.1) * 4.2, y + Math.sin(a - 1.1) * 4.2,
      );
      g.lineStyle(1, DEVOUR.violet, 0.6);
      g.lineBetween(x, y, x + Math.cos(a) * 10, y + Math.sin(a) * 10);
    }
    g.fillStyle(DEVOUR.bone, 0.9);
    g.fillCircle(x, y, 2.2);
  }

  /** A herald's throw, as a splinter of somebody's rib. */
  static override drawHeraldBolt(
    g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number,
  ): void {
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const px = -ny;
    const py = nx;
    g.fillStyle(DEVOUR.violet, 0.28);
    g.fillEllipse(x - nx * 9, y - ny * 9, 22, 8);
    g.fillStyle(mixC(DEVOUR.gold, DEVOUR.bone, 0.4), 1);
    g.fillPoints([
      new Phaser.Geom.Point(x + nx * 12, y + ny * 12),
      new Phaser.Geom.Point(x + px * 3.6, y + py * 3.6),
      new Phaser.Geom.Point(x - nx * 9 + px * 2.2, y - ny * 9 + py * 2.2),
      new Phaser.Geom.Point(x - nx * 9 - px * 2.2, y - ny * 9 - py * 2.2),
      new Phaser.Geom.Point(x - px * 3.6, y - py * 3.6),
    ], true, true);
    g.lineStyle(1.5, DEVOUR.voidBlack, 0.8);
    g.lineBetween(x + nx * 12, y + ny * 12, x - nx * 9, y - ny * 9);
    g.fillStyle(DEVOUR.violetLit, 0.9);
    g.fillCircle(x - nx * 7, y - ny * 7, 2.4);
  }

  /** The court's hand, now the hand of something that was eaten with it. */
  static override drawGraspHand(
    g: Phaser.GameObjects.Graphics, x: number, y: number, warn: number, erupt: number, time: number,
  ): void {
    if (erupt <= 0) {
      const beat = Math.abs(Math.sin(warn * Math.PI * 3));
      g.fillStyle(DEVOUR.gloom, 0.20 + 0.34 * warn);
      g.fillPoints(blob(g, x, y, 37 * warn, 17 * warn, 4, 0.16, x), true, true);
      g.lineStyle(2, mixC(DEVOUR.warn, DEVOUR.warnLit, beat), 0.5 + 0.4 * warn);
      g.strokePoints(blob(g, x, y, 37, 17, 4, 0.16, x), true, true);
      // The floor tearing where the fingers are coming through.
      g.lineStyle(2.5, DEVOUR.violetLit, 0.35 + 0.45 * beat);
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI * 0.9 + (i / 4) * Math.PI * 0.8;
        vein(g, x + Math.cos(a) * 10, y + Math.sin(a) * 5, a, 26 * warn, 3, DEVOUR.violetLit, 0.5, time, i);
      }
      return;
    }

    const rise = Phaser.Math.Easing.Back.Out(Math.min(1, erupt)) * 46;
    const fade = erupt > 0.75 ? 1 - (erupt - 0.75) / 0.25 : 1;
    const cy = y - rise;
    g.fillStyle(DEVOUR.voidBlack, 0.45 * fade);
    g.fillEllipse(x, y + 4, 70, 24);
    // Forearm — flayed, with the strut showing.
    g.fillStyle(DEVOUR.plate, fade);
    g.fillPoints([
      new Phaser.Geom.Point(x - 15, y + 8),
      new Phaser.Geom.Point(x - 11, cy),
      new Phaser.Geom.Point(x + 11, cy),
      new Phaser.Geom.Point(x + 15, y + 8),
    ], true, true);
    g.lineStyle(5, mixC(DEVOUR.gold, DEVOUR.plate, 0.35), 0.7 * fade);
    g.lineBetween(x, y + 8, x, cy);
    // Palm — with a mouth in it.
    g.fillStyle(mixC(DEVOUR.plate, DEVOUR.violet, 0.3), fade);
    g.fillPoints(blob(g, x, cy - 4, 17, 14, 4, 0.10, x), true, true);
    g.lineStyle(2, DEVOUR.voidBlack, 0.8 * fade);
    g.strokePoints(blob(g, x, cy - 4, 17, 14, 4, 0.10, x), true, true);
    g.fillStyle(DEVOUR.voidBlack, 0.85 * fade);
    g.fillEllipse(x, cy - 4, 13, 8);
    teeth(g, x - 6, cy - 6, x + 6, cy - 6, 4, 4, DEVOUR.bone, 0.9 * fade, 1);
    teeth(g, x - 6, cy - 2, x + 6, cy - 2, 4, 4, DEVOUR.bone, 0.8 * fade, -1);

    // Fingers, too long, tipped in bone.
    const curl = Math.min(1, erupt * 1.4);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.92 + (i / 4) * Math.PI * 0.84 + Math.sin(time / 240 + i) * 0.05;
      const len = (i === 0 || i === 4 ? 22 : 32) * (1 - 0.25 * curl);
      const bx = x + Math.cos(a) * 13;
      const by = cy - 8 + Math.sin(a) * 9;
      const mx = bx + Math.cos(a + 0.2) * len * 0.55;
      const my = by + Math.sin(a + 0.2) * len * 0.55;
      const tx = mx + Math.cos(a - 0.25) * len * 0.5;
      const ty = my + Math.sin(a - 0.25) * len * 0.5;
      g.lineStyle(7, DEVOUR.plate, fade);
      g.lineBetween(bx, by, mx, my);
      g.lineStyle(5.5, DEVOUR.plate, fade);
      g.lineBetween(mx, my, tx, ty);
      g.fillStyle(DEVOUR.bone, 0.9 * fade);
      g.fillTriangle(
        tx + Math.cos(a - 0.25) * 11, ty + Math.sin(a - 0.25) * 11,
        tx + Math.cos(a + 1.35) * 3.2, ty + Math.sin(a + 1.35) * 3.2,
        tx + Math.cos(a - 1.85) * 3.2, ty + Math.sin(a - 1.85) * 3.2,
      );
    }
  }

  /** A floor sigil, grown rather than inscribed — a ring of meat closing. */
  static override drawRune(
    g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, t: number, time: number,
  ): void {
    const beat = 0.5 + 0.5 * Math.sin(time / 130);
    g.fillStyle(DEVOUR.gloom, 0.14 + 0.28 * t);
    g.fillPoints(blob(g, x, y, radius, radius, 6, 0.07, x), true, true);
    g.lineStyle(2, DEVOUR.violet, 0.5);
    g.strokePoints(blob(g, x, y, radius, radius, 6, 0.07, x), true, true);
    // The sphincter drawing itself shut as the timer runs out.
    g.lineStyle(5, mixC(DEVOUR.violet, DEVOUR.violetLit, beat), 0.9);
    g.beginPath();
    g.arc(x, y, radius - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t);
    g.strokePath();
    const inner = radius * (0.62 - 0.4 * t) + 5;
    g.fillStyle(DEVOUR.voidBlack, 0.5 + 0.4 * t);
    g.fillCircle(x, y, inner);
    g.fillStyle(DEVOUR.bone, 0.4 + 0.5 * t);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + time / 1400;
      g.fillTriangle(
        x + Math.cos(a - 0.12) * (inner + 10), y + Math.sin(a - 0.12) * (inner + 10),
        x + Math.cos(a + 0.12) * (inner + 10), y + Math.sin(a + 0.12) * (inner + 10),
        x + Math.cos(a) * inner * 0.4, y + Math.sin(a) * inner * 0.4,
      );
    }
    g.fillStyle(DEVOUR.warnLit, 0.35 + 0.5 * t);
    g.fillCircle(x, y, 3 + 3 * t);
  }

  /** The rift he steps through is a wound in the room, held open. */
  static override drawBlinkRift(
    g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, time: number,
  ): void {
    const h = 74 * Math.min(1, t * 1.4);
    const w = 26 * Math.sin(Math.min(1, t) * Math.PI * 0.85);
    for (let k = 4; k >= 1; k--) {
      g.fillStyle(DEVOUR.violet, 0.06);
      g.fillEllipse(x, y, w * 2 + k * 12, h + k * 10);
    }
    g.fillStyle(DEVOUR.voidBlack, 0.94);
    g.fillEllipse(x, y, w * 2, h);
    g.lineStyle(4, mixC(DEVOUR.violet, DEVOUR.violetLit, 0.5 + 0.5 * Math.sin(time / 90)), 0.95);
    g.strokeEllipse(x, y, w * 2, h);
    // Sutures pulled apart down both lips.
    g.lineStyle(2, DEVOUR.bone, 0.6);
    for (let i = -3; i <= 3; i++) {
      const yy = y + (i / 3) * h * 0.42;
      const ww = w * Math.sqrt(Math.max(0, 1 - (i / 3.4) ** 2));
      g.lineBetween(x - ww - 7, yy, x - ww + 2, yy - 3);
      g.lineBetween(x + ww + 7, yy, x + ww - 2, yy - 3);
    }
    g.fillStyle(DEVOUR.violetLit, 0.55);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + time / 400;
      g.fillCircle(x + Math.cos(a) * w * 0.5, y + Math.sin(a) * h * 0.3, 2.4);
    }
  }

  /** The cleave, as a bite: two arcs of teeth closing on the same wedge. */
  static override drawCleave(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, angle: number, halfAngle: number, radius: number, t: number,
  ): void {
    const a0 = angle - halfAngle;
    const a1 = angle - halfAngle + halfAngle * 2 * Math.min(1, t * 1.25);
    const fade = 1 - Math.max(0, (t - 0.6) / 0.4);
    const steps = 20;
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
    g.fillStyle(DEVOUR.violet, 0.16 * fade);
    g.fillPoints(band(radius * 0.18, radius), true, true);
    g.fillStyle(DEVOUR.gloom, 0.75 * fade);
    g.fillPoints(band(radius * 0.60, radius * 0.94), true, true);
    // Two ranks of teeth on the crescent, meeting.
    for (const [r, flip] of [[0.72, 1], [0.98, -1]] as const) {
      g.fillStyle(DEVOUR.bone, 0.85 * fade);
      for (let i = 0; i < 11; i++) {
        const aa = Phaser.Math.Linear(a0, a1, i / 11);
        const ab = Phaser.Math.Linear(a0, a1, (i + 0.7) / 11);
        const rr = radius * r;
        g.fillTriangle(
          x + Math.cos(aa) * rr, y + Math.sin(aa) * rr,
          x + Math.cos(ab) * rr, y + Math.sin(ab) * rr,
          x + Math.cos((aa + ab) / 2) * (rr + flip * 16), y + Math.sin((aa + ab) / 2) * (rr + flip * 16),
        );
      }
    }
    g.lineStyle(3, DEVOUR.warnLit, 0.9 * fade);
    g.lineBetween(x + Math.cos(a1) * radius * 0.2, y + Math.sin(a1) * radius * 0.2,
      x + Math.cos(a1) * radius, y + Math.sin(a1) * radius);
  }

  /** The Decree, with the condemned ground gone to rot. */
  static override drawDecree(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, radius: number, charge: number, time: number,
  ): void {
    const beat = Math.abs(Math.sin(charge * Math.PI * 4));
    DevouredFx.fillOutsideCircle(g, x, y, radius, DEVOUR.warn, 0.09 + 0.22 * charge);
    DevouredFx.fillOutsideCircle(g, x, y, radius, DEVOUR.gloom, 0.20 + 0.22 * charge);

    // The pardoned ground: clean bone, the only unspoiled thing on the floor.
    g.fillStyle(DEVOUR.goldLit, 0.05 + 0.07 * beat);
    g.fillCircle(x, y, radius);
    for (let k = 3; k >= 1; k--) {
      g.lineStyle(3 + k * 4, DEVOUR.gold, 0.06);
      g.strokeCircle(x, y, radius);
    }
    g.lineStyle(5, mixC(DEVOUR.gold, DEVOUR.goldLit, beat), 0.95);
    g.strokeCircle(x, y, radius);
    g.lineStyle(2, DEVOUR.bone, 0.75);
    g.strokeCircle(x, y, radius - 5);
    // The rim is a ring of teeth pointing in — same chevron read, new mouth.
    g.fillStyle(DEVOUR.bone, 0.55 + 0.35 * beat);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + time / 1400;
      g.fillTriangle(
        x + Math.cos(a - 0.07) * (radius + 3), y + Math.sin(a - 0.07) * (radius + 3),
        x + Math.cos(a + 0.07) * (radius + 3), y + Math.sin(a + 0.07) * (radius + 3),
        x + Math.cos(a) * (radius - 16), y + Math.sin(a) * (radius - 16),
      );
    }
  }

  // ── The Last Coronation ─────────────────────────────────────────────

  /** The throne, grown out of the floor in bone and gristle. */
  static override drawThrone(
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
    const backTop = baseY - h;

    g.fillStyle(DEVOUR.gloom, 0.6 * a);
    g.fillPoints([
      new Phaser.Geom.Point(cx - 74, seatY),
      new Phaser.Geom.Point(cx - 60, backTop),
      new Phaser.Geom.Point(cx + 60, backTop),
      new Phaser.Geom.Point(cx + 74, seatY),
    ], true, true);
    // Spine up the middle, ribs off it.
    g.lineStyle(9, mixC(DEVOUR.gold, DEVOUR.plate, 0.3), 0.7 * a);
    g.lineBetween(cx, seatY, cx, backTop + 6);
    g.lineStyle(4, DEVOUR.gold, 0.55 * a);
    for (let i = 0; i < 7; i++) {
      const y = backTop + 20 + i * ((seatY - backTop) / 7);
      const off = (i - 3) * burst * 0.4;
      for (const side of [-1, 1] as const) {
        g.beginPath();
        g.moveTo(cx + off, y);
        g.lineTo(cx + side * 34 + off, y - 8);
        g.lineTo(cx + side * 58 + off, y + 12);
        g.strokePath();
      }
    }
    // Crown of horns along the top.
    g.fillStyle(mixC(DEVOUR.gold, 0x000000, 0.2), 0.8 * a * pulse);
    for (let i = 0; i <= 5; i++) {
      const px = cx - 60 + (120 / 5) * i;
      g.fillTriangle(px - 8, backTop + 4, px + 8, backTop + 4, px, backTop - 24 - (i % 2) * 10);
    }
    // Arms and seat.
    for (const side of [-1, 1] as const) {
      g.fillStyle(DEVOUR.plate, 0.65 * a);
      g.fillRect(cx + side * 74 - 12 + side * burst, seatY, 24, 54);
      g.lineStyle(2, DEVOUR.violetLit, 0.5 * a);
      g.strokeRect(cx + side * 74 - 12 + side * burst, seatY, 24, 54);
    }
    g.fillStyle(DEVOUR.plate, 0.75 * a);
    g.fillRect(cx - 74, seatY, 148, 18);
    g.lineStyle(2, DEVOUR.gold, 0.55 * a * pulse);
    g.strokeRect(cx - 74, seatY, 148, 18);
  }

  /** A courtier: not a ghost of a person, a ghost of a meal. */
  static override drawCourtier(
    g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number, time: number,
  ): void {
    if (alpha <= 0) return;
    const bob = Math.sin(time / 600 + x) * 3;
    const cy = y + bob;
    for (let k = 3; k >= 1; k--) {
      g.fillStyle(DEVOUR.ember, 0.05 * alpha);
      g.fillCircle(x, cy, 18 + k * 8);
    }
    // Shroud, trailing off into nothing at the hem.
    g.fillStyle(mixC(DEVOUR.gloom, DEVOUR.ember, 0.18), 0.55 * alpha);
    g.fillTriangle(x - 17, cy + 36, x + 17, cy + 36, x, cy - 8);
    g.fillEllipse(x, cy - 10, 28, 30);
    g.fillStyle(DEVOUR.ember, 0.18 * alpha);
    for (let i = 0; i < 4; i++) {
      const t = ((time / 800 + i * 0.25) % 1);
      g.fillCircle(x + Math.sin(time / 400 + i * 2) * 12, cy + 20 + t * 26, 2.4 * (1 - t));
    }
    // A face that has been opened.
    g.fillStyle(DEVOUR.voidBlack, 0.85 * alpha);
    g.fillEllipse(x, cy - 10, 19, 22);
    g.fillStyle(DEVOUR.emberLit, 0.85 * alpha);
    g.fillCircle(x - 5, cy - 14, 2.4);
    g.fillCircle(x + 5, cy - 14, 2.4);
    g.fillStyle(DEVOUR.voidBlack, 0.9 * alpha);
    g.fillEllipse(x, cy - 2, 9, 8);
    teeth(g, x - 4.5, cy - 4, x + 4.5, cy - 4, 4, 3, DEVOUR.bone, 0.75 * alpha, 1);
  }

  /** A crown shard, as a rib splinter turning end over end. */
  static override drawCrownShard(
    g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number, time: number,
  ): void {
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const px = -ny;
    const py = nx;
    g.fillStyle(DEVOUR.violet, 0.16);
    g.fillEllipse(x - nx * 12, y - ny * 12, 34, 12);
    const spin = time / 90;
    const sx = Math.cos(spin);
    const sy = Math.sin(spin);
    g.fillStyle(mixC(DEVOUR.gold, DEVOUR.goldLit, 0.5 + 0.5 * sy), 1);
    g.fillTriangle(
      x + sx * 16, y + sy * 16,
      x + px * 7 - sx * 6, y + py * 7 - sy * 6,
      x - px * 7 - sx * 6, y - py * 7 - sy * 6,
    );
    g.lineStyle(1.5, DEVOUR.voidBlack, 0.85);
    g.strokeTriangle(
      x + sx * 16, y + sy * 16,
      x + px * 7 - sx * 6, y + py * 7 - sy * 6,
      x - px * 7 - sx * 6, y - py * 7 - sy * 6,
    );
    // Still wet at the broken end.
    g.fillStyle(DEVOUR.violetLit, 0.8);
    g.fillCircle(x - sx * 6, y - sy * 6, 2.6);
  }

  /** The coronation ring, as a ring of muscle closing on the throne. */
  static override drawCoronationRing(
    g: Phaser.GameObjects.Graphics, cx: number, cy: number, radius: number, time: number,
  ): void {
    for (let k = 4; k >= 1; k--) {
      g.lineStyle(6 + k * 5, DEVOUR.violet, 0.06);
      g.strokeCircle(cx, cy, radius);
    }
    g.lineStyle(9, mixC(DEVOUR.violet, DEVOUR.violetLit, 0.5 + 0.5 * Math.sin(time / 180)), 0.9);
    g.strokeCircle(cx, cy, radius);
    g.lineStyle(2, DEVOUR.bone, 0.75);
    g.strokeCircle(cx, cy, radius - 5);
    const spin = time / 900;
    g.fillStyle(DEVOUR.bone, 0.7);
    for (let i = 0; i < 28; i++) {
      const a = spin + (i / 28) * Math.PI * 2;
      g.fillTriangle(
        cx + Math.cos(a - 0.05) * (radius + 6), cy + Math.sin(a - 0.05) * (radius + 6),
        cx + Math.cos(a + 0.05) * (radius + 6), cy + Math.sin(a + 0.05) * (radius + 6),
        cx + Math.cos(a) * (radius - 16), cy + Math.sin(a) * (radius - 16),
      );
    }
  }

  /** The thrown crown, coming down with a skull still in it. */
  static override drawCrownFall(
    g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, t: number, time: number,
  ): void {
    g.fillStyle(DEVOUR.violet, 0.08 + 0.20 * t);
    g.fillPoints(blob(g, x, y, radius, radius * 0.72, 5, 0.08, x), true, true);
    g.lineStyle(4, mixC(DEVOUR.warn, DEVOUR.warnLit, t), 0.95);
    g.strokeCircle(x, y, radius * (1 - t * 0.8) + 8);
    g.lineStyle(2, DEVOUR.goldLit, 0.7);
    g.strokeCircle(x, y, radius);
    g.fillStyle(DEVOUR.bone, 0.55);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + time / 700;
      g.fillTriangle(
        x + Math.cos(a - 0.06) * radius * 1.24, y + Math.sin(a - 0.06) * radius * 1.24,
        x + Math.cos(a + 0.06) * radius * 1.24, y + Math.sin(a + 0.06) * radius * 1.24,
        x + Math.cos(a) * radius * 0.88, y + Math.sin(a) * radius * 0.88,
      );
    }

    const cy = y - (1 - t) * 420;
    const scale = 1 + (1 - t) * 1.4;
    for (let k = 4; k >= 1; k--) {
      g.fillStyle(DEVOUR.gold, 0.05);
      g.fillCircle(x, cy, 26 * scale + k * 8);
    }
    // The skull inside the falling crown.
    g.fillStyle(mixC(DEVOUR.gold, DEVOUR.bone, 0.5), 0.95);
    g.fillEllipse(x, cy + 14 * scale, 30 * scale, 34 * scale);
    g.fillStyle(DEVOUR.voidBlack, 0.9);
    g.fillEllipse(x - 9 * scale, cy + 10 * scale, 8 * scale, 10 * scale);
    g.fillEllipse(x + 9 * scale, cy + 10 * scale, 8 * scale, 10 * scale);
    teeth(g, x - 11 * scale, cy + 26 * scale, x + 11 * scale, cy + 26 * scale, 5, 5 * scale, DEVOUR.bone, 0.9, 1);
    DevouredFx.drawBrokenCrown(g, x, cy, 30 * scale, 1);
  }

  // ── The Crowned Wraith ──────────────────────────────────────────────

  static override drawWraith(
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
    const accent = hot ? DEVOUR.emberLit : DEVOUR.violetLit;

    const auraStr = opts.casting ? 0.13 : 0.07;
    for (let k = 8; k >= 1; k--) {
      g.fillStyle(hot ? DEVOUR.ember : DEVOUR.violet,
        auraStr * rise * (0.7 + 0.3 * Math.sin(time / 380)) * (k <= 4 ? 1 : 0.6));
      g.fillCircle(cx, cy, R + k * 7);
    }
    g.fillStyle(DEVOUR.voidBlack, 0.28 * rise);
    g.fillEllipse(cx, y + 44, R * 2.6, R * 0.5);

    // The shroud is a gut now: streamers with something moving inside them.
    const tail = (ox: number, w: number, phase: number, len: number) => {
      const s = Math.sin(time / (380 + phase * 90) + phase) * 12;
      g.fillTriangle(cx + ox - w, cy + 4, cx + ox + w, cy + 4, cx + ox + s, cy + len * rise);
      return { tipX: cx + ox + s, tipY: cy + len * rise };
    };
    g.fillStyle(mixC(DEVOUR.gloom, 0x000000, 0.25), 0.9);
    tail(-16, 15, 0, 66);
    tail(16, 15, 2, 60);
    g.fillStyle(DEVOUR.gloom, 0.95);
    const mid = tail(0, 21, 1, 82);
    g.fillStyle(mixC(DEVOUR.gloom, hot ? DEVOUR.ember : DEVOUR.violet, 0.3), 0.85);
    tail(-7, 11, 3, 54);
    tail(9, 10, 4, 48);
    // A swallowed shape working its way down the longest streamer.
    const gulpT = (time / 1600) % 1;
    g.fillStyle(mixC(DEVOUR.gold, DEVOUR.bone, 0.4), 0.55 * rise);
    g.fillCircle(
      Phaser.Math.Linear(cx, mid.tipX, gulpT),
      Phaser.Math.Linear(cy + 10, mid.tipY, gulpT),
      7 * (1 - gulpT * 0.5),
    );
    g.fillStyle(accent, 0.28);
    for (let i = 0; i < 7; i++) {
      const t = ((time / 900 + i * 0.14) % 1);
      g.fillCircle(cx + Math.sin(time / 300 + i * 2.2) * 22, cy + 40 + t * 46, 3 * (1 - t));
    }

    // Shoulders, hunched, with vertebrae showing.
    g.fillStyle(DEVOUR.gloom, 1);
    g.fillEllipse(cx, cy + 4, R * 1.85, R * 1.45);
    g.lineStyle(3, DEVOUR.voidBlack, 1);
    g.strokeEllipse(cx, cy + 4, R * 1.85, R * 1.45);
    g.fillStyle(DEVOUR.gold, 0.5);
    for (let i = 0; i < 3; i++) g.fillCircle(cx, cy - 2 + i * 7, 3.2 - i * 0.4);

    // Hood — empty, and larger than the head that should be in it.
    g.fillStyle(mixC(DEVOUR.gloom, 0x000000, 0.45), 1);
    g.fillTriangle(cx - 16, cy - 3, cx + 16, cy - 3, cx, cy - R - 16);
    g.fillEllipse(cx, cy - 9, 28, 28);
    g.fillStyle(DEVOUR.voidBlack, 1);
    g.fillEllipse(cx, cy - 8, 21, 22);

    const glow = 0.7 + 0.3 * Math.sin(time / 190);
    for (let i = 0; i < 4; i++) {
      const ex = cx - 7 + (i % 2) * 14;
      const ey = cy - 13 + Math.floor(i / 2) * 8;
      g.fillStyle(mixC(accent, DEVOUR.bone, 0.35), glow * rise * (i < 2 ? 1 : 0.6));
      g.fillEllipse(ex, ey, 4.5, 6.5);
      for (let k = 3; k >= 1; k--) {
        g.fillStyle(accent, 0.08 * glow);
        g.fillCircle(ex, ey, 3 + k * 3);
      }
    }
    // A mouth in the hood, and it is not where a mouth should be.
    g.fillStyle(DEVOUR.voidBlack, 0.95);
    g.fillEllipse(cx, cy + 1, 13, 6);
    teeth(g, cx - 6, cy - 1, cx + 6, cy - 1, 5, 3.5, DEVOUR.bone, 0.85 * glow, 1);

    const lift = 14 + Math.sin(time / 430) * 4;
    for (let k = 4; k >= 1; k--) {
      g.fillStyle(DEVOUR.gold, 0.055);
      g.fillCircle(cx, cy - R - 12 - lift, 12 + k * 6);
    }
    DevouredFx.drawWholeCrown(g, cx, cy - R - 12 - lift, 19, time);

    const handY = opts.casting ? cy - 12 : cy + 6;
    for (const side of [-1, 1] as const) {
      const hx = cx + side * (opts.casting ? 28 : 22);
      g.fillStyle(DEVOUR.voidBlack, 0.9);
      g.fillCircle(hx, handY, 6);
      g.lineStyle(2, DEVOUR.bone, 0.6);
      for (let i = -1; i <= 1; i++) g.lineBetween(hx, handY, hx + side * 8, handY + i * 6 + 5);
      for (let k = 3; k >= 1; k--) {
        g.fillStyle(accent, (opts.casting ? 0.13 : 0.06) * (4 - k));
        g.fillCircle(hx, handY, 4 + k * 4);
      }
    }
  }

  /** The whole crown, in bone, with the stones replaced by eyes. */
  static override drawWholeCrown(
    g: Phaser.GameObjects.Graphics, x: number, y: number, halfWidth: number, time: number,
  ): void {
    const w = halfWidth;
    const pts: Phaser.Geom.Point[] = [new Phaser.Geom.Point(x - w, y + 7)];
    for (let i = 0; i <= 4; i++) {
      const px = x - w + (w * 2 * i) / 4;
      pts.push(new Phaser.Geom.Point(px - w * 0.12, y + 2));
      pts.push(new Phaser.Geom.Point(px, y - 10 - (i === 2 ? 5 : 0)));
      pts.push(new Phaser.Geom.Point(px + w * 0.12, y + 2));
    }
    pts.push(new Phaser.Geom.Point(x + w, y + 7));
    g.fillStyle(mixC(DEVOUR.gold, 0x000000, 0.3), 1);
    g.fillPoints(pts, true, true);
    g.lineStyle(2, mixC(DEVOUR.gold, DEVOUR.goldLit, 0.5 + 0.5 * Math.sin(time / 260)), 0.95);
    g.strokePoints(pts, true, false);
    g.fillStyle(DEVOUR.goldLit, 0.9);
    g.fillRect(x - w, y + 3, w * 2, 3);
    // Three set eyes, blinking out of phase.
    for (let i = -1; i <= 1; i++) {
      const open = 0.4 + 0.6 * Math.abs(Math.sin(time / (520 + i * 130) + i));
      g.fillStyle(DEVOUR.bone, 0.9);
      g.fillEllipse(x + i * w * 0.5, y + 4.5, 5, 4.4 * open);
      g.fillStyle(DEVOUR.violet, 0.95);
      g.fillCircle(x + i * w * 0.5, y + 4.5, 1.7 * open);
    }
  }

  /** The wail, as a wave of faces that have all been swallowed by the same thing. */
  static override drawWailRing(
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
    for (let k = 4; k >= 1; k--) wave(4 + k * 6, DEVOUR.ember, 0.045, radius);
    wave(7, mixC(DEVOUR.emberLit, DEVOUR.bone, 0.5 + 0.5 * Math.sin(time / 100)), 0.85, radius);
    wave(2, DEVOUR.bone, 0.8, radius - 4);

    g.lineStyle(2, 0x67e8a0, 0.55);
    for (const edge of [gapCentre - gapHalf, gapCentre + gapHalf]) {
      g.lineBetween(
        cx + Math.cos(edge) * (radius - 26), cy + Math.sin(edge) * (radius - 26),
        cx + Math.cos(edge) * (radius + 26), cy + Math.sin(edge) * (radius + 26),
      );
    }

    // Faces, screaming, and each one is being pulled backwards into the wave.
    const count = Math.max(6, Math.round(radius / 42));
    for (let i = 0; i < count; i++) {
      const a = from + ((to - from) * i) / count + radius / 220;
      const fx = cx + Math.cos(a) * radius;
      const fy = cy + Math.sin(a) * radius;
      const j = JITTER[i % JITTER.length];
      g.fillStyle(DEVOUR.gloom, 0.6);
      g.fillEllipse(fx, fy, 16 * j, 21 * j);
      g.fillStyle(DEVOUR.voidBlack, 0.9);
      g.fillEllipse(fx, fy + 4, 8 * j, 12 * j);
      teeth(g, fx - 4 * j, fy, fx + 4 * j, fy, 3, 3, DEVOUR.bone, 0.7, 1);
      g.fillStyle(DEVOUR.emberLit, 0.75);
      g.fillCircle(fx - 3.4, fy - 5, 1.8);
      g.fillCircle(fx + 3.4, fy - 5, 1.8);
      // Streaks off the back, in the direction it came from.
      g.lineStyle(1.5, DEVOUR.bone, 0.28);
      g.lineBetween(fx, fy, cx + Math.cos(a) * (radius - 22), cy + Math.sin(a) * (radius - 22));
    }
  }

  /** The pall, as a membrane drawn over the hall. */
  static override drawWraithVeil(
    g: Phaser.GameObjects.Graphics, w: number, h: number, t: number, time: number,
  ): void {
    if (t <= 0) return;
    g.fillStyle(0x08030a, 0.50 * t);
    g.fillRect(0, 0, w, h);
    g.fillStyle(DEVOUR.gloom, 0.20 * t);
    g.fillRect(0, 0, w, h);
    for (let k = 1; k <= 5; k++) {
      g.lineStyle(26, 0x08030a, 0.06 * t);
      g.strokeRect(-k * 12, -k * 12, w + k * 24, h + k * 24);
    }
    // Capillaries creeping in from the corners.
    for (let i = 0; i < 8; i++) {
      const cornerX = i % 2 === 0 ? 0 : w;
      const cornerY = i < 4 ? 0 : h;
      const a = Math.atan2(h / 2 - cornerY, w / 2 - cornerX) + (i % 4 - 1.5) * 0.35;
      vein(g, cornerX, cornerY, a, 220 * t, 5, DEVOUR.violet, 0.24 * t, time, i);
    }
    for (let i = 0; i < 26; i++) {
      const j = JITTER[i % JITTER.length];
      const mx = ((i * 137) % Math.round(w)) + Math.sin(time / 900 + i) * 14;
      const my = h - (((time / 26) * j + i * 97) % (h + 60));
      g.fillStyle(i % 4 === 0 ? DEVOUR.emberLit : DEVOUR.violetLit, 0.20 * t);
      g.fillCircle(mx, my, 1.6 + (j - 0.92) * 6);
    }
    g.lineStyle(4, DEVOUR.violet, 0.30 * t);
    g.strokeRect(6, 6, w - 12, h - 12);
  }

  // ══ Phase four: The Devourer of Kings ═══════════════════════════════

  /**
   * The transition. The crown splits down the middle and something comes out of
   * it that was never wearing it — it was inside it. `t` runs 0→1 across the
   * whole beat; drawn full-screen over everything else.
   */
  static drawConsume(
    g: Phaser.GameObjects.Graphics, w: number, h: number,
    cx: number, cy: number, t: number, time: number,
  ): void {
    g.clear();
    if (t <= 0) return;
    const k = Phaser.Math.Clamp(t, 0, 1);

    // The room goes out from the edges in.
    g.fillStyle(0x040106, Math.min(0.88, k * 1.4));
    g.fillRect(0, 0, w, h);

    // The crown, split, hanging over where he was.
    const split = Phaser.Math.Easing.Cubic.Out(Math.min(1, k * 1.7)) * 90;
    for (const side of [-1, 1] as const) {
      g.fillStyle(mixC(DEVOUR.gold, 0x000000, 0.25), 1);
      g.fillTriangle(
        cx + side * split, cy - 130,
        cx + side * (split + 34), cy - 96,
        cx + side * (split + 6), cy - 84,
      );
      g.lineStyle(2, DEVOUR.goldLit, 0.9);
      g.strokeTriangle(
        cx + side * split, cy - 130,
        cx + side * (split + 34), cy - 96,
        cx + side * (split + 6), cy - 84,
      );
    }

    // The column of what comes out — widening, made of light and faces.
    const colW = 20 + k * 130;
    for (let i = 5; i >= 1; i--) {
      g.fillStyle(DEVOUR.ember, 0.05 * i * k);
      g.fillRect(cx - colW * (1 + i * 0.2), 0, colW * 2 * (1 + i * 0.2), h);
    }
    g.fillStyle(DEVOUR.emberLit, 0.35 * k);
    g.fillRect(cx - colW * 0.5, 0, colW, h);

    // Every king it has ever been, streaming up the column.
    for (let i = 0; i < 16; i++) {
      const ft = ((time / 900 + i * 0.0625) % 1);
      const fy = h - ft * (h + 120);
      const fx = cx + Math.sin(time / 500 + i * 2.4) * colW * 0.55;
      const a = k * (0.15 + 0.5 * (1 - ft));
      g.fillStyle(DEVOUR.gloom, a);
      g.fillEllipse(fx, fy, 22, 28);
      g.fillStyle(DEVOUR.voidBlack, a);
      g.fillEllipse(fx, fy + 5, 11, 15);
      g.fillStyle(DEVOUR.emberLit, a);
      g.fillCircle(fx - 4.5, fy - 6, 2.2);
      g.fillCircle(fx + 4.5, fy - 6, 2.2);
      DevouredFx.drawBrokenCrown(g, fx, fy - 16, 11, a);
    }

    // A ring of teeth closing on the middle of the screen at the very end.
    if (k > 0.55) {
      const bite = (k - 0.55) / 0.45;
      const r = Math.max(w, h) * (0.75 - 0.55 * bite);
      g.fillStyle(DEVOUR.bone, 0.75 * bite);
      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * Math.PI * 2 + time / 2000;
        g.fillTriangle(
          cx + Math.cos(a - 0.05) * (r + 400), cy + Math.sin(a - 0.05) * (r + 400),
          cx + Math.cos(a + 0.05) * (r + 400), cy + Math.sin(a + 0.05) * (r + 400),
          cx + Math.cos(a) * r, cy + Math.sin(a) * r,
        );
      }
    }
  }

  /**
   * The hall for the last phase: the arena is inside it now. Ribs down the
   * flanks, a floor that flexes, and a slow tide of ghostlight across the back.
   */
  static drawGullet(
    g: Phaser.GameObjects.Graphics, w: number, h: number, t: number, time: number,
  ): void {
    g.clear();
    if (t <= 0) return;
    const breathe = 1 + Math.sin(time / 1300) * 0.02;

    g.fillStyle(0x120409, 0.95 * t);
    g.fillRect(0, 0, w, h);
    // Wet wash, brightest low and in the middle.
    for (let i = 0; i < 14; i++) {
      const k = i / 13;
      g.fillStyle(mixC(0x120409, DEVOUR.gloom, 0.2 + k * 0.5), 0.5 * t);
      g.fillEllipse(w / 2, h * (0.35 + k * 0.6), w * (0.5 + k * 0.9), h * 0.24);
    }

    // Ribs down both flanks, arching over the playfield.
    for (const side of [-1, 1] as const) {
      for (let i = 0; i < 7; i++) {
        const y = h * 0.10 + i * (h * 0.13);
        const reach = (w * 0.30) * (0.55 + Math.sin(i * 0.9) * 0.25) * breathe;
        const x0 = side < 0 ? -20 : w + 20;
        g.lineStyle(26, DEVOUR.gloom, 0.55 * t);
        g.beginPath();
        g.moveTo(x0, y);
        g.lineTo(x0 + side * -reach * 0.7, y + 34);
        g.lineTo(x0 + side * -reach, y + 96);
        g.strokePath();
        g.lineStyle(13, mixC(DEVOUR.gold, DEVOUR.plate, 0.45), 0.75 * t);
        g.beginPath();
        g.moveTo(x0, y);
        g.lineTo(x0 + side * -reach * 0.7, y + 34);
        g.lineTo(x0 + side * -reach, y + 96);
        g.strokePath();
        g.lineStyle(4, DEVOUR.bone, 0.30 * t);
        g.beginPath();
        g.moveTo(x0, y - 6);
        g.lineTo(x0 + side * -reach * 0.7, y + 28);
        g.strokePath();
      }
    }

    // Vein network across the floor, crawling.
    for (let i = 0; i < 14; i++) {
      const j = JITTER[i % JITTER.length];
      vein(g, (i * 211) % w, h * 0.42 + ((i * 137) % (h * 0.55)),
        (i % 2 === 0 ? 0.4 : 2.7) + j, 150, 4, DEVOUR.violet, 0.22 * t, time, i);
    }

    // Sphincters in the back wall, opening and closing on their own clocks.
    for (let i = 0; i < 4; i++) {
      const sx = w * (0.16 + i * 0.23);
      const sy = h * 0.30;
      const open = 0.35 + 0.65 * Math.abs(Math.sin(time / (1700 + i * 400) + i));
      g.fillStyle(DEVOUR.voidBlack, 0.7 * t);
      g.fillEllipse(sx, sy, 66 * open, 30 * open);
      g.lineStyle(5, mixC(DEVOUR.plate, DEVOUR.violet, 0.5), 0.6 * t);
      g.strokeEllipse(sx, sy, 70, 34);
      g.fillStyle(DEVOUR.emberLit, 0.16 * t * open);
      g.fillEllipse(sx, sy, 40 * open, 18 * open);
    }

    g.lineStyle(6, DEVOUR.violet, 0.35 * t);
    g.strokeRect(4, 4, w - 8, h - 8);
  }

  /**
   * The Devourer itself. A mass held together by the kings inside it: a ribbed
   * bell of a body, a crown of horns, a ring of eyes, and one enormous vertical
   * mouth that opens when it casts.
   */
  static drawDevourer(
    g: Phaser.GameObjects.Graphics, x: number, y: number, time: number, opts: DevourerPose = {},
  ): void {
    const rise = opts.rise ?? 1;
    const broken = opts.broken ?? 0;
    const hot = opts.enraged ?? false;
    const casting = opts.casting ?? false;
    const accent = hot ? DEVOUR.emberLit : DEVOUR.violetLit;
    // Broken: it sags, spreads, and stops floating.
    const drift = Math.sin(time / 620) * 6 * (1 - broken);
    const cx = x;
    const cy = y - 6 + drift + broken * 26;
    const R = 40 * (1 - broken * 0.30);
    const squashY = 1 - broken * 0.42;
    const breath = 1 + Math.sin(time / (broken > 0 ? 620 : 900)) * (broken > 0 ? 0.05 : 0.03);

    // The halo of what it is holding.
    const auraStr = casting ? 0.11 : 0.06;
    for (let k = 9; k >= 1; k--) {
      g.fillStyle(hot ? DEVOUR.ember : DEVOUR.violet,
        auraStr * rise * (1 - broken * 0.7) * (0.7 + 0.3 * Math.sin(time / 380)) * (k <= 4 ? 1 : 0.55));
      g.fillCircle(cx, cy, R + k * 9);
    }

    // What it is standing in.
    g.fillStyle(DEVOUR.voidBlack, (0.35 + 0.25 * broken) * rise);
    g.fillEllipse(cx, y + R * 1.3, R * 3.2, R * 0.7);

    // Trailing mass — long gut-streamers, limp once it is broken.
    const tail = (ox: number, w2: number, phase: number, len: number, alpha: number) => {
      const s = Math.sin(time / (420 + phase * 110) + phase) * (16 * (1 - broken));
      g.fillStyle(mixC(DEVOUR.gloom, hot ? DEVOUR.ember : DEVOUR.violet, 0.18), alpha);
      g.fillTriangle(cx + ox - w2, cy + 10, cx + ox + w2, cy + 10, cx + ox + s, cy + len * rise * squashY);
    };
    tail(-34, 20, 0, 120, 0.85);
    tail(34, 20, 2, 112, 0.85);
    tail(-13, 15, 3, 96, 0.75);
    tail(15, 14, 4, 92, 0.75);
    tail(0, 27, 1, 150, 0.95);

    // Body — a ribbed bell.
    const bodyPts = blob(g, cx, cy, R * 1.45 * breath, R * 1.25 * breath * squashY, 6, 0.07, time / 1500);
    g.fillStyle(DEVOUR.gloom, 1);
    g.fillPoints(bodyPts, true, true);
    g.lineStyle(5, DEVOUR.voidBlack, 1);
    g.strokePoints(bodyPts, true, true);
    // Ribs across the bell, brighter as it takes damage.
    g.lineStyle(4, mixC(DEVOUR.gold, DEVOUR.plate, 0.35), 0.65);
    for (let i = -2; i <= 3; i++) {
      const yy = cy - R * 0.7 + i * R * 0.34;
      const hw = R * 1.35 * Math.sqrt(Math.max(0.05, 1 - ((yy - cy) / (R * 1.35)) ** 2));
      g.beginPath();
      g.moveTo(cx - hw, yy);
      g.lineTo(cx, yy + 7);
      g.lineTo(cx + hw, yy);
      g.strokePath();
    }

    // The mouth: a vertical seam that opens when it casts, teeth on both lips.
    // During the Feast it is held wide the whole time — that is what "open" is.
    const feasting = opts.feasting ?? false;
    const open = (feasting ? 1.35 : casting ? 1 : 0.16) * (1 - broken * 0.75);
    const mh = R * 1.05;
    const mw = R * (0.10 + 0.42 * open);
    g.fillStyle(DEVOUR.voidBlack, 1);
    g.fillEllipse(cx, cy + 4, mw * 2, mh * squashY);
    if (open > 0.3) {
      for (let k = 3; k >= 1; k--) {
        g.fillStyle(DEVOUR.ember, 0.09 * open);
        g.fillEllipse(cx, cy + 4, mw * 2 + k * 8, mh * squashY + k * 6);
      }
      g.fillStyle(mixC(DEVOUR.violet, DEVOUR.ember, 0.35), 0.45 * open);
      g.fillEllipse(cx, cy + 4, mw * 1.2, mh * 0.75 * squashY);
    }
    teeth(g, cx - mw, cy + 4 - mh * 0.5 * squashY, cx - mw, cy + 4 + mh * 0.5 * squashY, 7, 9, DEVOUR.bone, 0.95, -1);
    teeth(g, cx + mw, cy + 4 - mh * 0.5 * squashY, cx + mw, cy + 4 + mh * 0.5 * squashY, 7, 9, DEVOUR.bone, 0.95, 1);

    // A ring of eyes around the mouth. Broken, most of them have gone out.
    const eyeCount = hot ? 9 : 7;
    for (let i = 0; i < eyeCount; i++) {
      const a = (i / eyeCount) * Math.PI * 2 + time / 3000;
      const ex = cx + Math.cos(a) * R * 1.05;
      const ey = cy + Math.sin(a) * R * 0.92 * squashY;
      const alive = broken > 0 ? (i % 3 === 0 ? 1 - broken * 0.5 : (1 - broken)) : 1;
      if (alive <= 0.05) continue;
      const blink = 0.35 + 0.65 * Math.abs(Math.sin(time / (400 + i * 120) + i));
      g.fillStyle(DEVOUR.bone, 0.92 * alive);
      g.fillEllipse(ex, ey, 11, 9 * blink);
      g.fillStyle(hot ? DEVOUR.ember : DEVOUR.violet, 0.95 * alive);
      g.fillCircle(ex, ey, 4 * blink);
      g.fillStyle(DEVOUR.voidBlack, alive);
      g.fillCircle(ex, ey, 2.1 * blink);
      for (let k = 2; k >= 1; k--) {
        g.fillStyle(accent, 0.07 * blink * alive);
        g.fillCircle(ex, ey, 5 + k * 4);
      }
    }

    // Crown of horns — the kings it wore, kept.
    const horns = 5;
    for (let i = 0; i < horns; i++) {
      const a = -Math.PI * 0.86 + (i / (horns - 1)) * Math.PI * 0.72;
      const bx = cx + Math.cos(a) * R * 1.15;
      const by = cy + Math.sin(a) * R * 1.05 * squashY;
      const len = (26 + (i === 2 ? 14 : 0)) * (1 - broken * 0.4);
      g.fillStyle(mixC(DEVOUR.gold, 0x000000, 0.2), 1);
      g.fillTriangle(
        bx - 7, by + 5, bx + 7, by + 5,
        bx + Math.cos(a) * len, by + Math.sin(a) * len - 6,
      );
      g.lineStyle(1.5, DEVOUR.goldLit, 0.8);
      g.strokeTriangle(
        bx - 7, by + 5, bx + 7, by + 5,
        bx + Math.cos(a) * len, by + Math.sin(a) * len - 6,
      );
    }

    // Faces of the eaten, surfacing through the hide and sinking again.
    const faces = broken > 0 ? 2 : 4;
    for (let i = 0; i < faces; i++) {
      const ft = ((time / 2600 + i * 0.25) % 1);
      const surface = Math.sin(ft * Math.PI);
      if (surface < 0.12) continue;
      const a = i * 1.9 + time / 4000;
      const fx = cx + Math.cos(a) * R * 0.65;
      const fy = cy + Math.sin(a) * R * 0.55 * squashY;
      g.fillStyle(mixC(DEVOUR.plate, DEVOUR.bone, 0.3), 0.55 * surface);
      g.fillEllipse(fx, fy, 20 * surface, 25 * surface);
      g.fillStyle(DEVOUR.voidBlack, 0.7 * surface);
      g.fillEllipse(fx - 4.5, fy - 3, 4, 5 * surface);
      g.fillEllipse(fx + 4.5, fy - 3, 4, 5 * surface);
      g.fillEllipse(fx, fy + 7, 5, 7 * surface);
    }

    // Broken: it has split open along the seam and the light is going out of it.
    if (broken > 0) {
      g.lineStyle(6, DEVOUR.voidBlack, 0.8 * broken);
      g.beginPath();
      g.moveTo(cx - R * 1.2, cy + R * 0.3);
      g.lineTo(cx - R * 0.3, cy + R * 0.55);
      g.lineTo(cx + R * 0.6, cy + R * 0.25);
      g.strokePath();
      g.fillStyle(DEVOUR.emberLit, 0.20 * broken * (0.5 + 0.5 * Math.sin(time / 340)));
      g.fillEllipse(cx, cy + R * 0.4, R * 1.4, R * 0.28);
      // Its breath, going out of it in slow motes.
      g.fillStyle(DEVOUR.bone, 0.35 * broken);
      for (let i = 0; i < 6; i++) {
        const t = ((time / 2200 + i * 0.166) % 1);
        g.fillCircle(cx + Math.sin(time / 700 + i * 2.3) * R, cy - t * 120, 3 * (1 - t));
      }
    }
  }

  /** The maw's wind-up: the wedge the bite will leave open, marked before it lands. */
  static drawMawWarn(
    g: Phaser.GameObjects.Graphics,
    cx: number, cy: number, radius: number, gapCentre: number, gapHalf: number,
    t: number, time: number,
  ): void {
    const beat = Math.abs(Math.sin(t * Math.PI * 3));
    const from = gapCentre + gapHalf;
    const to = gapCentre + Math.PI * 2 - gapHalf;
    // Everything the bite will cover.
    const pts: Phaser.Geom.Point[] = [new Phaser.Geom.Point(cx, cy)];
    for (let i = 0; i <= 40; i++) {
      const a = Phaser.Math.Linear(from, to, i / 40);
      pts.push(new Phaser.Geom.Point(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius));
    }
    g.fillStyle(DEVOUR.warn, 0.05 + 0.11 * t);
    g.fillPoints(pts, true, true);
    g.lineStyle(2, mixC(DEVOUR.warn, DEVOUR.warnLit, beat), 0.35 + 0.45 * t);
    g.strokePoints(pts, true, true);
    // The quiet wedge, in the same green every safe lane in this fight uses.
    g.fillStyle(0x67e8a0, 0.05 + 0.05 * beat);
    const safe: Phaser.Geom.Point[] = [new Phaser.Geom.Point(cx, cy)];
    for (let i = 0; i <= 12; i++) {
      const a = gapCentre - gapHalf + (gapHalf * 2 * i) / 12;
      safe.push(new Phaser.Geom.Point(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius));
    }
    g.fillPoints(safe, true, true);
    g.lineStyle(3, 0x67e8a0, 0.65);
    for (const edge of [gapCentre - gapHalf, gapCentre + gapHalf]) {
      g.lineBetween(cx, cy, cx + Math.cos(edge) * radius, cy + Math.sin(edge) * radius);
    }
    // The inhale: arrows dragging inward.
    g.lineStyle(2, DEVOUR.warnLit, 0.3 + 0.4 * beat);
    for (let i = 0; i < 14; i++) {
      const a = from + ((to - from) * i) / 14;
      const r = radius * (0.45 + 0.45 * ((time / 700 + i * 0.11) % 1));
      g.lineBetween(cx + Math.cos(a) * r, cy + Math.sin(a) * r,
        cx + Math.cos(a) * (r - 26), cy + Math.sin(a) * (r - 26));
    }
  }

  /** The bite itself: a ring of teeth racing outward, with the quiet lane cut out. */
  static drawGulletRing(
    g: Phaser.GameObjects.Graphics,
    cx: number, cy: number, radius: number, gapCentre: number, gapHalf: number, time: number,
  ): void {
    if (radius <= 4) return;
    const from = gapCentre + gapHalf;
    const to = gapCentre + Math.PI * 2 - gapHalf;
    for (let k = 3; k >= 1; k--) {
      g.lineStyle(8 + k * 9, DEVOUR.ember, 0.05);
      g.beginPath(); g.arc(cx, cy, radius, from, to); g.strokePath();
    }
    g.lineStyle(12, mixC(DEVOUR.violet, DEVOUR.gloom, 0.4), 0.9);
    g.beginPath(); g.arc(cx, cy, radius, from, to); g.strokePath();
    g.lineStyle(3, DEVOUR.emberLit, 0.75);
    g.beginPath(); g.arc(cx, cy, radius - 6, from, to); g.strokePath();
    // Teeth on the leading edge, pointing out.
    const count = Math.max(10, Math.round(radius / 20));
    g.fillStyle(DEVOUR.bone, 0.9);
    for (let i = 0; i < count; i++) {
      const a = from + ((to - from) * i) / count;
      const j = JITTER[i % JITTER.length];
      g.fillTriangle(
        cx + Math.cos(a - 0.035) * radius, cy + Math.sin(a - 0.035) * radius,
        cx + Math.cos(a + 0.035) * radius, cy + Math.sin(a + 0.035) * radius,
        cx + Math.cos(a) * (radius + 18 * j), cy + Math.sin(a) * (radius + 18 * j),
      );
    }
    g.lineStyle(2, 0x67e8a0, 0.6);
    for (const edge of [gapCentre - gapHalf, gapCentre + gapHalf]) {
      g.lineBetween(
        cx + Math.cos(edge) * (radius - 30), cy + Math.sin(edge) * (radius - 30),
        cx + Math.cos(edge) * (radius + 30), cy + Math.sin(edge) * (radius + 30),
      );
    }
    void time;
  }

  /** A pool of what it spat. `t` 0→1 over its life; it dries from the edge in. */
  static drawBilePool(
    g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, t: number, time: number,
  ): void {
    const r = radius * (1 - t * 0.22);
    const a = 1 - t * 0.55;
    g.fillStyle(DEVOUR.gloom, 0.45 * a);
    g.fillPoints(blob(g, x, y, r, r * 0.6, 5, 0.13, x), true, true);
    g.fillStyle(DEVOUR.violet, 0.35 * a);
    g.fillPoints(blob(g, x, y, r * 0.8, r * 0.48, 4, 0.16, x + 2), true, true);
    g.lineStyle(2, DEVOUR.emberLit, 0.5 * a);
    g.strokePoints(blob(g, x, y, r, r * 0.6, 5, 0.13, x), true, true);
    // Bubbles working up through it.
    for (let i = 0; i < 6; i++) {
      const bt = ((time / 900 + i * 0.166 + x * 0.01) % 1);
      const br = 1.5 + bt * 4;
      g.fillStyle(DEVOUR.emberLit, 0.45 * a * (1 - bt));
      g.fillCircle(
        x + Math.cos(i * 2.1) * r * 0.6,
        y + Math.sin(i * 2.1) * r * 0.34 - bt * 6,
        br,
      );
    }
  }

  /** One of the Devourer's hearts: a destructible core with its own pulse. */
  static drawHeart(
    g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, time: number, hurt: number,
  ): void {
    // Two-stage beat, so it reads as a heartbeat rather than a sine.
    const beat = (time / 760) % 1;
    const p = beat < 0.14 ? beat / 0.14 : beat < 0.30 ? 1 - (beat - 0.14) / 0.16 * 0.65 : 0.35 * (1 - (beat - 0.30) / 0.70);
    const r = radius * (1 + p * 0.16);
    for (let k = 5; k >= 1; k--) {
      g.fillStyle(DEVOUR.warn, 0.05 + 0.05 * p);
      g.fillCircle(x, y, r + k * 6);
    }
    // Vessels tethering it to whatever it is feeding.
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + time / 2400;
      vein(g, x + Math.cos(a) * r, y + Math.sin(a) * r, a, 34 + p * 8, 5, DEVOUR.violet, 0.55, time, i);
    }
    g.fillStyle(mixC(DEVOUR.violet, DEVOUR.warn, 0.35), 1);
    g.fillPoints(blob(g, x, y, r, r * 1.08, 4, 0.12, time / 900), true, true);
    g.lineStyle(3, DEVOUR.voidBlack, 0.9);
    g.strokePoints(blob(g, x, y, r, r * 1.08, 4, 0.12, time / 900), true, true);
    // Chambers.
    g.lineStyle(2.5, DEVOUR.gloom, 0.8);
    g.lineBetween(x - r * 0.7, y - r * 0.2, x + r * 0.7, y + r * 0.1);
    g.lineBetween(x, y - r * 0.9, x - r * 0.1, y + r * 0.9);
    g.fillStyle(DEVOUR.warnLit, 0.35 + 0.45 * p);
    g.fillCircle(x - r * 0.25, y - r * 0.25, r * 0.32);
    g.fillStyle(DEVOUR.bone, 0.5);
    g.fillEllipse(x - r * 0.4, y - r * 0.45, r * 0.3, r * 0.18);
    if (hurt > 0) {
      g.fillStyle(DEVOUR.bone, 0.55 * hurt);
      g.fillCircle(x, y, r);
    }
  }

  /**
   * A king of the chorus: one of the ones it ate, propped up on the rim and made
   * to take a shot. `t` 0→1 is the wind-up; `fired` swaps to the discharge.
   */
  static drawChorusKing(
    g: Phaser.GameObjects.Graphics, x: number, y: number, aim: number, t: number, fired: boolean, time: number,
  ): void {
    const bob = Math.sin(time / 520 + x) * 3;
    const cy = y + bob;
    const glow = fired ? 1 : 0.3 + 0.7 * t;
    for (let k = 4; k >= 1; k--) {
      g.fillStyle(DEVOUR.ember, 0.05 * glow);
      g.fillCircle(x, cy, 20 + k * 7);
    }
    // Hung rather than standing — feet off the floor, threads going up.
    g.lineStyle(1.5, DEVOUR.bone, 0.28);
    for (let i = -1; i <= 1; i++) g.lineBetween(x + i * 8, cy - 28, x + i * 12, cy - 90);
    // Robe.
    g.fillStyle(mixC(DEVOUR.gloom, DEVOUR.ember, 0.14), 0.85);
    g.fillTriangle(x - 18, cy + 38, x + 18, cy + 38, x, cy - 10);
    g.fillEllipse(x, cy - 8, 30, 32);
    // Head, hollow, with the aim in its eyes.
    g.fillStyle(DEVOUR.voidBlack, 0.9);
    g.fillEllipse(x, cy - 12, 20, 24);
    g.fillStyle(mixC(DEVOUR.emberLit, DEVOUR.bone, 0.3), glow);
    g.fillCircle(x - 5 + Math.cos(aim) * 2, cy - 15 + Math.sin(aim) * 2, 2.6);
    g.fillCircle(x + 5 + Math.cos(aim) * 2, cy - 15 + Math.sin(aim) * 2, 2.6);
    DevouredFx.drawBrokenCrown(g, x, cy - 27, 13, 0.9);
    // Hands out along the line of fire, gathering.
    const hx = x + Math.cos(aim) * 22;
    const hy = cy + Math.sin(aim) * 22;
    g.fillStyle(DEVOUR.emberLit, 0.25 + 0.6 * glow);
    g.fillCircle(hx, hy, 4 + 5 * (fired ? 1 : t));
  }

  /** The chorus's shot: a lane of ghostlight from a king to the far wall. */
  static drawChorusBeam(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, aim: number, len: number, halfW: number, warn: number, fire: number, time: number,
  ): void {
    const nx = Math.cos(aim);
    const ny = Math.sin(aim);
    const px = -ny;
    const py = nx;
    const bar = (w: number) => [
      new Phaser.Geom.Point(x + px * w, y + py * w),
      new Phaser.Geom.Point(x + nx * len + px * w, y + ny * len + py * w),
      new Phaser.Geom.Point(x + nx * len - px * w, y + ny * len - py * w),
      new Phaser.Geom.Point(x - px * w, y - py * w),
    ];

    if (fire <= 0) {
      const beat = Math.abs(Math.sin(warn * Math.PI * 3));
      g.fillStyle(DEVOUR.warn, 0.05 + 0.12 * warn);
      g.fillPoints(bar(halfW), true, true);
      g.lineStyle(2, mixC(DEVOUR.warn, DEVOUR.warnLit, beat), 0.4 + 0.5 * warn);
      g.strokePoints(bar(halfW), true, true);
      // Motes falling into the lane as it charges.
      g.fillStyle(DEVOUR.emberLit, 0.35 + 0.4 * beat);
      for (let i = 0; i < 10; i++) {
        const t = ((time / 500 + i * 0.1) % 1);
        g.fillCircle(x + nx * len * t, y + ny * len * t, 1.6 + 2 * warn);
      }
      return;
    }
    const k = 1 - fire;
    for (let i = 4; i >= 1; i--) {
      g.fillStyle(DEVOUR.ember, 0.09 * i * k);
      g.fillPoints(bar(halfW * (1 + i * 0.28)), true, true);
    }
    g.fillStyle(DEVOUR.emberLit, 0.85 * k);
    g.fillPoints(bar(halfW * 0.72), true, true);
    g.fillStyle(DEVOUR.bone, 0.9 * k);
    g.fillPoints(bar(halfW * 0.26), true, true);
    // The face of whoever is being spent to fire it, riding down the lane.
    const ft = ((time / 260) % 1);
    g.fillStyle(DEVOUR.gloom, 0.6 * k);
    g.fillEllipse(x + nx * len * ft, y + ny * len * ft, 18, 22);
  }

  /**
   * The last phase's wash. Dark, red at the edges, with a slow pulse timed to
   * the Devourer's heartbeat and a bloom of white when the hearts are out.
   */
  static drawDevourerVeil(
    g: Phaser.GameObjects.Graphics, w: number, h: number, t: number, feast: number, time: number,
  ): void {
    if (t <= 0) return;
    const beat = (time / 760) % 1;
    const p = beat < 0.14 ? beat / 0.14 : beat < 0.30 ? 1 - (beat - 0.14) / 0.16 : 0;

    g.fillStyle(0x0a0106, 0.42 * t);
    g.fillRect(0, 0, w, h);
    // The pulse, from the edges in.
    for (let k = 1; k <= 6; k++) {
      g.lineStyle(30, DEVOUR.violet, (0.030 + 0.030 * p) * t);
      g.strokeRect(-k * 14, -k * 14, w + k * 28, h + k * 28);
    }
    if (feast > 0) {
      for (let k = 1; k <= 4; k++) {
        g.lineStyle(22, DEVOUR.warn, 0.05 * feast * (0.6 + 0.4 * p));
        g.strokeRect(-k * 10, -k * 10, w + k * 20, h + k * 20);
      }
      g.fillStyle(DEVOUR.warn, 0.05 * feast);
      g.fillRect(0, 0, w, h);
    }
    // Motes going the wrong way — down, and toward the middle.
    for (let i = 0; i < 30; i++) {
      const j = JITTER[i % JITTER.length];
      const mx = ((i * 149) % Math.round(w)) + Math.sin(time / 800 + i) * 18;
      const my = (((time / 30) * j + i * 83) % (h + 60)) - 30;
      const pull = (w / 2 - mx) * 0.12;
      g.fillStyle(i % 5 === 0 ? DEVOUR.bone : DEVOUR.emberLit, 0.18 * t);
      g.fillCircle(mx + pull, my, 1.5 + (j - 0.92) * 5);
    }
    g.lineStyle(5, mixC(DEVOUR.violet, DEVOUR.warn, p * 0.6), 0.34 * t);
    g.strokeRect(6, 6, w - 12, h - 12);
  }

  /**
   * The last frame of the fight: what is left of it, sat on the floor, with the
   * hall coming back up around it. `t` 0→1 as the room returns.
   */
  static drawAftermath(
    g: Phaser.GameObjects.Graphics, w: number, h: number, t: number, time: number,
  ): void {
    g.clear();
    if (t <= 0) return;
    // The pall lifting: the wash fades and a single shaft comes down the middle.
    g.fillStyle(0x0a0106, 0.42 * (1 - t));
    g.fillRect(0, 0, w, h);
    const beam = 120 + 90 * t;
    for (let i = 4; i >= 1; i--) {
      g.fillStyle(DEVOUR.goldLit, 0.020 * i * t);
      g.fillPoints([
        new Phaser.Geom.Point(w / 2 - beam * 0.25 * i * 0.4, 0),
        new Phaser.Geom.Point(w / 2 + beam * 0.25 * i * 0.4, 0),
        new Phaser.Geom.Point(w / 2 + beam * 0.5 * i * 0.4, h),
        new Phaser.Geom.Point(w / 2 - beam * 0.5 * i * 0.4, h),
      ], true, true);
    }
    // Dust in the shaft, settling rather than rising.
    g.fillStyle(DEVOUR.goldLit, 0.22 * t);
    for (let i = 0; i < 22; i++) {
      const j = JITTER[i % JITTER.length];
      const mx = w / 2 + Math.sin(time / 1400 + i * 1.7) * beam * 0.6;
      const my = ((time / 60) * j + i * 71) % (h + 40);
      g.fillCircle(mx, my, 1.2 + (j - 0.92) * 4);
    }
  }
}
