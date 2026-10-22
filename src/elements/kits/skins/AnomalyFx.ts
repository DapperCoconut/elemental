import Phaser from 'phaser';
import { FxBase } from '../ElementVisuals';

/**
 * The Anomaly skin's world art: the Backrooms that replace every dream Delve opens, the
 * Smiler that replaces the walking nightmare, and the spores the hazmat captain sheds.
 *
 * Deliberately imports nothing from `DreamVisuals` — that file builds this view, and the
 * avatar extends its class, so a runtime import back would close a module cycle. Colours are
 * this skin's final palette, so nothing here routes through a mapper.
 */

const BR = {
  wallLit: 0xcdbb5e,
  wall: 0xc2ae52,
  wallShade: 0xb09c45,
  stripe: 0xa38f3e,
  baseboard: 0x8a7834,
  ceiling: 0xd9d0a0,
  tileLine: 0xbab07c,
  carpet: 0xa08c43,
  carpetSeam: 0x8b7838,
  stain: 0x6f5f28,
  doorway: 0x5e5222,
  doorDeep: 0x3a3214,
  panel: 0xfff9df,
  panelGlow: 0xfff1b0,
  dead: 0x8e8768,
  dark: 0x120f06,
  blood: 0x7a0c0c,
  red: 0xff2a1e,
  entity: 0x050505,
};

/** A deterministic 0–1 hash. */
function h01(i: number): number {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

const P = (x: number, y: number) => new Phaser.Geom.Point(x, y);

/**
 * The Backrooms as a one-point-perspective picture: a fluorescent-lit corridor of mono-yellow
 * wallpaper and damp carpet, doorways opening off it into more of the same. Static scenery is
 * painted once; the lights, and a nightmare's slow takeover, every frame.
 *
 * **Ominous** ramps up the longer a nightmare holds (it does not snap): panels die one by one,
 * the rest flicker harder, the room browns and reddens, blackouts strobe, stains run down the
 * walls, and something stands in the far doorway. It eases back once the nightmare lets go.
 * Everything over the fighters (the frame) stays at the screen edges so the fight reads.
 */
export class BackroomsView {
  private t = 0;
  private omen = 0;
  private readonly vx: number;
  private readonly vy: number;
  private readonly S: number;

  constructor(
    _scene: Phaser.Scene,
    private W: number,
    private H: number,
    private A: number,
    private stat: Phaser.GameObjects.Graphics,
    private anim: Phaser.GameObjects.Graphics,
    private frame: Phaser.GameObjects.Graphics,
  ) {
    this.vx = W / 2;
    this.vy = H * 0.4;
    this.S = W * 0.55;
    this.paintStatic();
  }

  /** Screen point of a corridor coordinate: lateral X (±1 = walls), height Y (-0.6 ceiling, +1 floor), depth z. */
  private pt(X: number, Y: number, z: number): Phaser.Geom.Point {
    return P(this.vx + (X * this.S) / z, this.vy + (Y * this.S) / z);
  }

  private quad(g: Phaser.GameObjects.Graphics, color: number, alpha: number, pts: Phaser.Geom.Point[]): void {
    g.fillStyle(color, alpha);
    g.fillPoints(pts, true);
  }

  private paintStatic(): void {
    const g = this.stat;
    const { W, H, A } = this;
    const near = 0.7, far = 6;
    const C = -0.6, F = 1;
    g.fillStyle(BR.wall, A);
    g.fillRect(0, 0, W, H);
    // Side walls.
    this.quad(g, BR.wallLit, A, [this.pt(-1, C, near), this.pt(-1, C, far), this.pt(-1, F, far), this.pt(-1, F, near)]);
    this.quad(g, BR.wallShade, A, [this.pt(1, C, near), this.pt(1, C, far), this.pt(1, F, far), this.pt(1, F, near)]);
    // Wallpaper: thin vertical stripes receding, and a faint diamond motif between them.
    for (let z = near + 0.1; z < far; z += 0.22) {
      for (const X of [-1, 1]) {
        const a = this.pt(X, C, z), b = this.pt(X, F, z);
        g.lineStyle(Math.max(0.6, 3 / z), BR.stripe, A * 0.45);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
    }
    for (let z = near + 0.2; z < far; z += 0.44) {
      for (const X of [-1, 1]) {
        for (let k = 0; k < 4; k++) {
          const Y = C + 0.2 + k * 0.38;
          const c = this.pt(X, Y, z + 0.11);
          const s = 9 / z;
          g.fillStyle(BR.stripe, A * 0.22);
          g.fillPoints([P(c.x, c.y - s), P(c.x + s * 0.45, c.y), P(c.x, c.y + s), P(c.x - s * 0.45, c.y)], true);
        }
      }
    }
    // Doorways off the corridor — openings into more of the same.
    const door = (X: number, z0: number, z1: number): void => {
      const top = C + 0.25;
      this.quad(g, BR.doorway, A, [this.pt(X, top, z0), this.pt(X, top, z1), this.pt(X, F, z1), this.pt(X, F, z0)]);
      // A sliver of the lit room beyond.
      const zm = z0 + (z1 - z0) * 0.55;
      this.quad(g, BR.wallShade, A * 0.7, [this.pt(X, top + 0.05, zm), this.pt(X, top + 0.05, z1), this.pt(X, F, z1), this.pt(X, F, zm)]);
      const a = this.pt(X, top, z0), b = this.pt(X, F, z0);
      g.lineStyle(Math.max(1, 5 / z0), BR.baseboard, A * 0.8);
      g.lineBetween(a.x, a.y, b.x, b.y);
    };
    door(-1, 1.9, 2.6);
    door(1, 3.1, 3.8);
    door(-1, 4.4, 4.9);
    // Back wall, with an opening that keeps going.
    const bw = [this.pt(-1, C, far), this.pt(1, C, far), this.pt(1, F, far), this.pt(-1, F, far)];
    this.quad(g, BR.wall, A, bw);
    for (let X = -0.9; X < 1; X += 0.15) {
      const a = this.pt(X, C, far), b = this.pt(X, F, far);
      g.lineStyle(0.6, BR.stripe, A * 0.4);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    this.quad(g, BR.doorDeep, A, [this.pt(-0.3, C + 0.3, far), this.pt(0.15, C + 0.3, far), this.pt(0.15, F, far), this.pt(-0.3, F, far)]);
    this.quad(g, BR.doorway, A, [this.pt(-0.3, C + 0.3, far * 1.6), this.pt(0.15, C + 0.3, far * 1.6), this.pt(0.15, F, far * 1.6), this.pt(-0.3, F, far * 1.6)]);
    // Ceiling, its tile grid, then the floor.
    this.quad(g, BR.ceiling, A, [this.pt(-1, C, near), this.pt(1, C, near), this.pt(1, C, far), this.pt(-1, C, far)]);
    g.lineStyle(1, BR.tileLine, A * 0.7);
    for (let z = 1; z <= far; z += 0.5) {
      const a = this.pt(-1, C, z), b = this.pt(1, C, z);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    for (let X = -1; X <= 1.001; X += 0.25) {
      const a = this.pt(X, C, near), b = this.pt(X, C, far);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    this.quad(g, BR.carpet, A, [this.pt(-1, F, near), this.pt(1, F, near), this.pt(1, F, far), this.pt(-1, F, far)]);
    g.lineStyle(1, BR.carpetSeam, A * 0.35);
    for (let z = 1; z <= far; z += 0.7) {
      const a = this.pt(-1, F, z), b = this.pt(1, F, z);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    // Damp patches on the carpet.
    for (let i = 0; i < 14; i++) {
      const z = 0.9 + h01(i) * 4.8;
      const c = this.pt((h01(i + 30) - 0.5) * 1.8, F, z);
      g.fillStyle(BR.stain, A * (0.12 + h01(i + 60) * 0.14));
      g.fillEllipse(c.x, c.y, (90 + h01(i + 7) * 120) / z, (30 + h01(i + 9) * 40) / z);
    }
    // Baseboards where walls meet carpet.
    for (const X of [-1, 1]) {
      const a = this.pt(X, F, near), b = this.pt(X, F, far);
      g.lineStyle(4, BR.baseboard, A * 0.6);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  update(delta: number, k: number, ominous: boolean): void {
    this.t += delta / 1000;
    // Slow to come, quicker to go: the longer the nightmare holds, the worse the room gets.
    this.omen = Phaser.Math.Clamp(this.omen + (ominous ? delta / 7000 : -delta / 1600), 0, 1);
    this.stat.setAlpha(k);
    this.anim.setAlpha(k);
    this.paintLights();
    this.paintFrame(k);
  }

  private paintLights(): void {
    const g = this.anim;
    const { W, H, A, t } = this;
    const o = this.omen;
    g.clear();
    const C = -0.6, F = 1;
    const dead = Math.floor(o * 4.5);
    const zs = [1.3, 2.2, 3.1, 4.0, 4.9, 5.7];
    for (let i = 0; i < zs.length; i++) {
      const z = zs[i];
      // Which panels have died, nearest first, as the nightmare deepens.
      const isDead = i < dead;
      const tick = Math.floor(t * (9 + o * 20) + i * 13);
      const flick = h01(tick * 7 + i) < (i === 2 ? 0.06 : 0.015) + o * 0.25;
      const on = !isDead && !flick;
      const hum = 0.88 + 0.06 * Math.sin(t * 50 + i * 2);
      const pts = [this.pt(-0.22, C, z), this.pt(0.22, C, z), this.pt(0.22, C, z + 0.32), this.pt(-0.22, C, z + 0.32)];
      this.quad(g, on ? BR.panel : BR.dead, A * (on ? hum : 0.8), pts);
      if (on) {
        // Light pool on the carpet below and a bloom round the panel.
        const c = this.pt(0, F, z + 0.16);
        g.fillStyle(BR.panelGlow, A * 0.1 * hum);
        g.fillEllipse(c.x, c.y, 380 / z, 110 / z);
        const p = this.pt(0, C, z + 0.16);
        g.fillStyle(BR.panelGlow, A * 0.16 * hum);
        g.fillEllipse(p.x, p.y, 300 / z, 70 / z);
      }
    }
    if (o <= 0.01) return;
    // Stains running down the walls.
    for (let i = 0; i < 9; i++) {
      const X = i % 2 ? 1 : -1;
      const z = 1 + h01(i + 3) * 4.5;
      const top = this.pt(X, C, z);
      const run = Math.min(1, o * 1.6 - h01(i) * 0.5);
      if (run <= 0) continue;
      const bot = this.pt(X, C + 1.5 * run * (0.4 + h01(i + 5) * 0.6), z);
      g.lineStyle(Math.max(1, 10 / z), BR.stain, A * 0.55 * o);
      g.lineBetween(top.x, top.y, bot.x, bot.y);
      g.fillStyle(BR.blood, A * 0.5 * o);
      g.fillCircle(bot.x, bot.y, Math.max(1, 5 / z));
    }
    // The far doorway goes red, and something stands in it.
    const far = 6;
    const dTop = this.pt(-0.3, C + 0.3, far), dBot = this.pt(0.15, F, far);
    g.fillStyle(BR.red, A * 0.35 * o * (0.7 + 0.3 * Math.sin(t * 3)));
    g.fillRect(dTop.x, dTop.y, dBot.x - dTop.x, dBot.y - dTop.y);
    if (o > 0.4) {
      const s = Phaser.Math.Clamp((o - 0.4) / 0.6, 0, 1);
      const fx = (dTop.x + dBot.x) / 2 + (h01(Math.floor(t * 6)) - 0.5) * 3;
      const fy = dBot.y;
      const hgt = (dBot.y - dTop.y) * 0.92;
      g.fillStyle(BR.entity, A * s);
      g.fillPoints([P(fx - 3, fy), P(fx - 1.2, fy - hgt * 0.75), P(fx - 2.4, fy - hgt * 0.9), P(fx, fy - hgt), P(fx + 2.4, fy - hgt * 0.9), P(fx + 1.2, fy - hgt * 0.75), P(fx + 3, fy)], true);
      g.lineStyle(1, BR.entity, A * s);
      g.lineBetween(fx - 1, fy - hgt * 0.72, fx - 7, fy - hgt * 0.3);
      g.lineBetween(fx + 1, fy - hgt * 0.72, fx + 6, fy - hgt * 0.2);
    }
    // The room browns, then reddens; blackouts strobe once it is far gone.
    g.fillStyle(BR.dark, A * o * 0.42);
    g.fillRect(0, 0, W, H);
    g.fillStyle(BR.blood, A * o * 0.2);
    g.fillRect(0, 0, W, H);
    if (o > 0.35 && h01(Math.floor(t * 14) + 77) < (o - 0.35) * 0.18) {
      g.fillStyle(BR.dark, A * 0.4);
      g.fillRect(0, 0, W, H);
    }
  }

  /** Over the fighters: a thin buzzing frame at the screen edge only. */
  private paintFrame(k: number): void {
    const g = this.frame;
    const { W, H, t } = this;
    const o = this.omen;
    g.clear();
    if (k <= 0.01) return;
    for (let i = 0; i < 5; i++) {
      const w = 18;
      const col = o > 0.5 && i < 2 ? BR.blood : BR.dark;
      g.lineStyle(w, col, k * (0.22 - i * 0.04 + o * 0.12));
      g.strokeRect(i * 10 - 4, i * 10 - 4, W - i * 20 + 8, H - i * 20 + 8);
    }
    // The fluorescent hum: a faint flickering wash along the top edge.
    const hum = 0.5 + 0.5 * Math.sin(t * 60);
    g.fillStyle(BR.panelGlow, k * (0.08 + hum * 0.04) * (1 - o));
    g.fillRect(0, 0, W, 14);
  }

  destroy(): void {
    // stat/anim/frame belong to the DreamWorldView that made this; it destroys them.
  }
}

/**
 * The walking nightmare, Backrooms edition: a Smiler — a drifting knot of darkness with two
 * slit eyes and a grin far too wide, flickering in and out. Same footprint as the beast.
 */
export function smiler(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, facing: number, t: number,
  alpha = 1, step = 0,
): void {
  const jit = (Math.sin(t * 57) + Math.sin(t * 31)) * 1.1;
  const cx = x + jit, cy = y - 4 + Math.sin(step * Math.PI) * -3;
  const flick = h01(Math.floor(t * 18)) < 0.08 ? 0.35 : 1;
  g.fillStyle(BR.entity, alpha * 0.35);
  g.fillEllipse(x, y + 16, 40, 10);
  // A ragged cloud of black.
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + t * 0.8;
    const r = 10 + Math.sin(t * 7 + i * 2.3) * 3;
    g.fillStyle(BR.entity, alpha * (0.55 + (i % 3) * 0.15));
    g.fillCircle(cx + Math.cos(a) * r * 0.75, cy + Math.sin(a) * r * 0.6, r * 0.75);
  }
  // Wisps trailing off the back.
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.8 + i / 4) % 1;
    g.fillStyle(BR.entity, alpha * 0.4 * (1 - p));
    g.fillCircle(cx - Math.cos(facing) * (12 + p * 16), cy - Math.sin(facing) * (8 + p * 10) - p * 6, 5 + p * 5);
  }
  // Face, leaning toward where it is going.
  const fx = cx + Math.cos(facing) * 4, fy = cy + Math.sin(facing) * 2;
  const a = alpha * flick;
  g.fillStyle(BR.panel, a);
  g.fillEllipse(fx - 6, fy - 5, 6, 2.2);
  g.fillEllipse(fx + 6, fy - 5, 6, 2.2);
  // The grin: a crescent of teeth.
  const grin: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    grin.push(P(fx - 11 + u * 22, fy + 1 + Math.sin(u * Math.PI) * 7));
  }
  for (let i = 10; i >= 0; i--) {
    const u = i / 10;
    grin.push(P(fx - 11 + u * 22, fy + 1 + Math.sin(u * Math.PI) * 3));
  }
  g.fillStyle(BR.panel, a * 0.95);
  g.fillPoints(grin, true);
  g.lineStyle(0.8, BR.entity, a);
  for (let i = 1; i < 9; i++) {
    const u = i / 9;
    const tx = fx - 11 + u * 22;
    g.lineBetween(tx, fy + 1 + Math.sin(u * Math.PI) * 3, tx, fy + 1 + Math.sin(u * Math.PI) * 7);
  }
}

/** The hazmat captain's trail: a puff of yellow-green spores off a gloved hand. */
export class AnomalyFx extends FxBase {
  spores(x: number, y: number): void {
    const n = 3;
    const seeds = Array.from({ length: n }, (_, i) => ({ a: Math.random() * Math.PI * 2, d: 6 + Math.random() * 10, r: 1.4 + Math.random() * 1.6, i }));
    this.anim(5.8, 640, (g, t) => {
      for (const s of seeds) {
        const px = x + Math.cos(s.a) * s.d * t;
        const py = y + Math.sin(s.a) * s.d * t - t * 8;
        g.fillStyle(0xb8c94a, (1 - t) * 0.55);
        g.fillCircle(px, py, s.r * (1 + t));
        g.fillStyle(0xeef08a, (1 - t) * 0.6);
        g.fillCircle(px - 0.4, py - 0.4, s.r * 0.45);
      }
    });
  }

  /** A ripple of black when the captain becomes the thing inside the dream (or comes back). */
  shed(x: number, y: number): void {
    this.anim(7, 420, (g, t) => {
      g.lineStyle(3 * (1 - t) + 0.5, BR.entity, (1 - t) * 0.8);
      g.strokeCircle(x, y, 16 + t * 34);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.fillStyle(BR.entity, (1 - t) * 0.7);
        g.fillCircle(x + Math.cos(a) * (14 + t * 30), y + Math.sin(a) * (14 + t * 30), 3 * (1 - t) + 1);
      }
    });
  }
}
