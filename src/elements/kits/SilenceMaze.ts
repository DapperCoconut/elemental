import Phaser from 'phaser';
import { SILENCE, SilenceColorFn, fogBank, silenceEye } from './SilenceVisuals';

/**
 * Q+ The Labyrinth — the pocket-dimension maze, as plain data.
 *
 * Everything the chase needs from the maze lives here: a seeded grid, wall rectangles for
 * collision, breadth-first routes for bots, and the painting. SilenceKit only decides who
 * is where and when the hunt ends.
 *
 * Online, positions travel mirrored on x, so the sim that receives the seed builds the same
 * grid with `mirrorX` set — every coordinate this class hands out (and every one it is
 * given) is flipped at the boundary, while the grid logic itself never knows.
 */

export interface MazeRect { x: number; y: number; w: number; h: number }
export interface MazeCell { c: number; r: number }

export const MAZE_COLS = 11;
export const MAZE_ROWS = 7;
const WALL_T = 14;
/** Chance a dead end gets knocked through into a loop — loops are what make it huntable. */
const BRAID_CHANCE = 0.55;

/** Deterministic PRNG — the same seed builds the same maze on both sims. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface WallEye { x: number; y: number; phase: number; size: number }
interface Candle { x: number; y: number; phase: number }
interface Stone { x: number; y: number; w: number; h: number; shade: number }
interface Scratch { x: number; y: number; a: number; len: number }

export class SilenceMaze {
  readonly cols = MAZE_COLS;
  readonly rows = MAZE_ROWS;
  readonly left: number;
  readonly top: number;
  readonly cw: number;
  readonly ch: number;
  /** vWall[c][r]: wall on the left edge of cell (c, r); c === cols is the right border. */
  private readonly vWall: boolean[][];
  /** hWall[c][r]: wall on the top edge of cell (c, r); r === rows is the bottom border. */
  private readonly hWall: boolean[][];
  /** Solid rectangles in *local* (unmirrored) space. */
  private readonly rects: MazeRect[] = [];
  readonly victimStart: MazeCell;
  readonly blobStart: MazeCell;
  readonly exitCell: MazeCell;
  /** Which border the exit door is cut through. */
  private readonly exitSide: 'top' | 'bottom' | 'left' | 'right';
  private readonly eyes: WallEye[] = [];
  private readonly candles: Candle[] = [];
  private readonly stones: Stone[] = [];
  private readonly scratches: Scratch[] = [];

  constructor(seed: number, private readonly W: number, H: number, private readonly mirrorX: boolean) {
    const rand = mulberry32(seed);
    this.left = 24;
    this.top = 40;
    this.cw = (W - 48) / this.cols;
    this.ch = (H - 64) / this.rows;
    const cols = this.cols;
    const rows = this.rows;

    this.vWall = Array.from({ length: cols + 1 }, () => Array<boolean>(rows).fill(true));
    this.hWall = Array.from({ length: cols }, () => Array<boolean>(rows + 1).fill(true));

    // Recursive backtracker: one long winding tree.
    const visited = Array.from({ length: cols }, () => Array<boolean>(rows).fill(false));
    const sc = Math.floor(rand() * cols);
    const sr = Math.floor(rand() * rows);
    const stack: Array<[number, number]> = [[sc, sr]];
    visited[sc][sr] = true;
    while (stack.length > 0) {
      const [x, y] = stack[stack.length - 1];
      const opts = this.neighbours(x, y).filter(([nx, ny]) => !visited[nx][ny]);
      if (opts.length === 0) { stack.pop(); continue; }
      const [nx, ny] = opts[Math.floor(rand() * opts.length)];
      this.setOpen(x, y, nx, ny);
      visited[nx][ny] = true;
      stack.push([nx, ny]);
    }

    // Braid: a pure tree has exactly one route between any two points, so whoever is behind
    // can never cut anyone off. Knocking through dead ends gives the hunt loops to play on.
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (this.openNeighbours(c, r).length !== 1 || rand() > BRAID_CHANCE) continue;
        const closed = this.neighbours(c, r).filter(([nx, ny]) => !this.isOpen(c, r, nx, ny));
        if (closed.length === 0) continue;
        const [nx, ny] = closed[Math.floor(rand() * closed.length)];
        this.setOpen(c, r, nx, ny);
      }
    }

    // Placement. The victim starts somewhere central; the blob a handful of turns away,
    // never adjacent; the exit on the border, a real walk from the victim and preferably
    // on the far side of them from the blob.
    this.victimStart = {
      c: Math.floor(cols / 2) + Math.floor(rand() * 3) - 1,
      r: Math.floor(rows / 2) + Math.floor(rand() * 3) - 1,
    };
    const fromVictim = this.distances(this.victimStart);
    const blobPool: MazeCell[] = [];
    const exitPool: MazeCell[] = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const d = fromVictim[c][r];
        if (d >= 5 && d <= 8) blobPool.push({ c, r });
      }
    }
    this.blobStart = blobPool.length > 0
      ? blobPool[Math.floor(rand() * blobPool.length)]
      : { c: 0, r: rows - 1 };
    const fromBlob = this.distances(this.blobStart);
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const border = c === 0 || r === 0 || c === cols - 1 || r === rows - 1;
        if (!border) continue;
        const d = fromVictim[c][r];
        if (d >= 6 && d <= 11 && fromBlob[c][r] > d) exitPool.push({ c, r });
      }
    }
    if (exitPool.length === 0) {
      // Degenerate layout: fall back to the border cell the blob has furthest to go for.
      let best: MazeCell = { c: 0, r: 0 };
      for (let c = 0; c < cols; c++) {
        for (const r of [0, rows - 1]) if (fromBlob[c][r] - fromVictim[c][r] > fromBlob[best.c][best.r] - fromVictim[best.c][best.r]) best = { c, r };
      }
      exitPool.push(best);
    }
    this.exitCell = exitPool[Math.floor(rand() * exitPool.length)];
    const ec = this.exitCell;
    this.exitSide = ec.r === 0 ? 'top' : ec.r === rows - 1 ? 'bottom' : ec.c === 0 ? 'left' : 'right';
    if (this.exitSide === 'top') this.hWall[ec.c][0] = false;
    else if (this.exitSide === 'bottom') this.hWall[ec.c][rows] = false;
    else if (this.exitSide === 'left') this.vWall[0][ec.r] = false;
    else this.vWall[cols][ec.r] = false;

    this.buildRects();
    this.dress(rand);
  }

  // ── Grid ────────────────────────────────────────────────────────────

  private neighbours(c: number, r: number): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    if (c > 0) out.push([c - 1, r]);
    if (c < this.cols - 1) out.push([c + 1, r]);
    if (r > 0) out.push([c, r - 1]);
    if (r < this.rows - 1) out.push([c, r + 1]);
    return out;
  }

  private isOpen(c: number, r: number, nc: number, nr: number): boolean {
    if (nc !== c) return !this.vWall[Math.max(c, nc)][r];
    return !this.hWall[c][Math.max(r, nr)];
  }

  private setOpen(c: number, r: number, nc: number, nr: number): void {
    if (nc !== c) this.vWall[Math.max(c, nc)][r] = false;
    else this.hWall[c][Math.max(r, nr)] = false;
  }

  private openNeighbours(c: number, r: number): Array<[number, number]> {
    return this.neighbours(c, r).filter(([nc, nr]) => this.isOpen(c, r, nc, nr));
  }

  /** BFS step counts from `from` to every cell. */
  private distances(from: MazeCell): number[][] {
    const d = Array.from({ length: this.cols }, () => Array<number>(this.rows).fill(Infinity));
    d[from.c][from.r] = 0;
    const q: MazeCell[] = [from];
    for (let i = 0; i < q.length; i++) {
      const { c, r } = q[i];
      for (const [nc, nr] of this.openNeighbours(c, r)) {
        if (d[nc][nr] !== Infinity) continue;
        d[nc][nr] = d[c][r] + 1;
        q.push({ c: nc, r: nr });
      }
    }
    return d;
  }

  // ── Coordinates (all public ones are in world space, mirrored when needed) ──

  private fx(x: number): number { return this.mirrorX ? this.W - x : x; }

  cellOf(x: number, y: number): MazeCell {
    const lx = this.fx(x);
    return {
      c: Phaser.Math.Clamp(Math.floor((lx - this.left) / this.cw), 0, this.cols - 1),
      r: Phaser.Math.Clamp(Math.floor((y - this.top) / this.ch), 0, this.rows - 1),
    };
  }

  center(cell: MazeCell): { x: number; y: number } {
    return { x: this.fx(this.left + (cell.c + 0.5) * this.cw), y: this.top + (cell.r + 0.5) * this.ch };
  }

  /** Midpoint of the doorway, on the border line itself. */
  exitPoint(): { x: number; y: number } {
    const c = this.center(this.exitCell);
    switch (this.exitSide) {
      case 'top': return { x: c.x, y: this.top };
      case 'bottom': return { x: c.x, y: this.top + this.rows * this.ch };
      case 'left': return { x: this.fx(this.left), y: c.y };
      default: return { x: this.fx(this.left + this.cols * this.cw), y: c.y };
    }
  }

  /** Outward normal of the exit door (world space). */
  private exitNormal(): number {
    switch (this.exitSide) {
      case 'top': return -Math.PI / 2;
      case 'bottom': return Math.PI / 2;
      case 'left': return this.mirrorX ? 0 : Math.PI;
      default: return this.mirrorX ? Math.PI : 0;
    }
  }

  /**
   * The next waypoint on the shortest route from (x, y) to `goal`. Returns the goal's own
   * centre once you are in its cell.
   */
  nextStep(x: number, y: number, goal: MazeCell): { x: number; y: number } {
    const here = this.cellOf(x, y);
    if (here.c === goal.c && here.r === goal.r) return this.center(goal);
    const d = this.distances(goal);
    let best: MazeCell | null = null;
    for (const [nc, nr] of this.openNeighbours(here.c, here.r)) {
      if (!best || d[nc][nr] < d[best.c][best.r]) best = { c: nc, r: nr };
    }
    if (!best) return this.center(goal);
    // Hug the centre of the corridor until we are lined up with the turn — cutting the corner
    // straight off the current position drags a body along the wall's end cap.
    const hc = this.center(here);
    const bc = this.center(best);
    const sameRow = best.r === here.r;
    const offAxis = sameRow ? Math.abs(y - hc.y) : Math.abs(x - hc.x);
    if (offAxis > 8) return sameRow ? { x, y: hc.y } : { x: hc.x, y };
    return bc;
  }

  /** Grid step count between two world points. */
  stepsBetween(ax: number, ay: number, bx: number, by: number): number {
    const b = this.cellOf(bx, by);
    const a = this.cellOf(ax, ay);
    return this.distances(a)[b.c][b.r];
  }

  // ── Collision ───────────────────────────────────────────────────────

  private buildRects(): void {
    const t = WALL_T;
    const { left, top, cw, ch } = this;
    for (let c = 0; c <= this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        if (this.vWall[c][r]) this.rects.push({ x: left + c * cw - t / 2, y: top + r * ch - t / 2, w: t, h: ch + t });
      }
    }
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r <= this.rows; r++) {
        if (this.hWall[c][r]) this.rects.push({ x: left + c * cw - t / 2, y: top + r * ch - t / 2, w: cw + t, h: t });
      }
    }
  }

  /** Push a circle of radius `rad` out of every wall. Returns the corrected world position. */
  resolve(x: number, y: number, rad: number): { x: number; y: number } {
    let lx = this.fx(x);
    let ly = y;
    for (let pass = 0; pass < 2; pass++) {
      for (const w of this.rects) {
        const nx = Phaser.Math.Clamp(lx, w.x, w.x + w.w);
        const ny = Phaser.Math.Clamp(ly, w.y, w.y + w.h);
        const dx = lx - nx;
        const dy = ly - ny;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rad * rad) continue;
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          lx = nx + (dx / d) * rad;
          ly = ny + (dy / d) * rad;
        } else {
          // Centre inside the wall: leave by the nearest face.
          const outs = [lx - w.x, w.x + w.w - lx, ly - w.y, w.y + w.h - ly];
          const m = Math.min(...outs);
          if (m === outs[0]) lx = w.x - rad;
          else if (m === outs[1]) lx = w.x + w.w + rad;
          else if (m === outs[2]) ly = w.y - rad;
          else ly = w.y + w.h + rad;
        }
      }
    }
    return { x: this.fx(lx), y: ly };
  }

  isSolid(x: number, y: number): boolean {
    const lx = this.fx(x);
    return this.rects.some((w) => lx >= w.x && lx <= w.x + w.w && y >= w.y && y <= w.y + w.h);
  }

  /** Points that should cut a hole in the dark for everyone: the exit and the candles. */
  lights(t: number): Array<{ x: number; y: number; r: number }> {
    const e = this.exitPoint();
    const out = [{ x: e.x, y: e.y, r: 54 + 6 * Math.sin(t * 2.2) }];
    for (const c of this.candles) out.push({ x: this.fx(c.x), y: c.y, r: 30 + 3 * Math.sin(t * 9 + c.phase) });
    return out;
  }

  // ── Dressing ────────────────────────────────────────────────────────

  private dress(rand: () => number): void {
    // Flagstones: two-by-two per cell, each its own shade so the floor never tiles.
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        for (let i = 0; i < 4; i++) {
          const sx = this.left + c * this.cw + (i % 2) * this.cw / 2;
          const sy = this.top + r * this.ch + Math.floor(i / 2) * this.ch / 2;
          this.stones.push({ x: sx + 2, y: sy + 2, w: this.cw / 2 - 4, h: this.ch / 2 - 4, shade: rand() });
        }
        if (rand() < 0.3) {
          this.scratches.push({
            x: this.left + (c + 0.2 + rand() * 0.6) * this.cw,
            y: this.top + (r + 0.2 + rand() * 0.6) * this.ch,
            a: rand() * Math.PI, len: 14 + rand() * 16,
          });
        }
      }
    }
    // Candles burn in the dead ends — small mercies, and also somewhere to get cornered.
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        if (this.openNeighbours(c, r).length !== 1 || rand() > 0.6) continue;
        const ctr = { x: this.left + (c + 0.5) * this.cw, y: this.top + (r + 0.5) * this.ch };
        this.candles.push({ x: ctr.x, y: ctr.y, phase: rand() * 10 });
      }
    }
    // Eyes set into the walls. They are the maze's, not the blob's — but they watch the same thing.
    for (const w of this.rects) {
      if (rand() > 0.12) continue;
      this.eyes.push({ x: w.x + w.w / 2, y: w.y + w.h / 2, phase: rand() * 20, size: 3.6 + rand() * 1.8 });
    }
  }

  /** Floor + walls. Static: painted once into its own Graphics when the chase starts. */
  paintStatic(floor: Phaser.GameObjects.Graphics, walls: Phaser.GameObjects.Graphics, tint: SilenceColorFn): void {
    const L = (x: number): number => this.fx(x);
    const rectAt = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void => {
      g.fillRect(this.mirrorX ? this.W - x - w : x, y, w, h);
    };

    // Floor: near-black slab with flagstones lifting out of it.
    floor.fillStyle(0x07030b, 1);
    floor.fillRect(0, 0, this.W, this.top + this.rows * this.ch + 40);
    for (const s of this.stones) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(tint(SILENCE.pitch)),
        Phaser.Display.Color.ValueToColor(tint(SILENCE.plum)),
        100, Math.floor(s.shade * 55),
      );
      floor.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      rectAt(floor, s.x, s.y, s.w, s.h);
      // A lit top edge so each stone reads as raised.
      floor.fillStyle(tint(SILENCE.violet), 0.18 + s.shade * 0.12);
      rectAt(floor, s.x, s.y, s.w, 1.5);
    }
    for (const sc of this.scratches) {
      floor.lineStyle(1.3, tint(SILENCE.bone), 0.16);
      for (let i = -1; i <= 1; i++) {
        const ox = Math.cos(sc.a + Math.PI / 2) * i * 4;
        const oy = Math.sin(sc.a + Math.PI / 2) * i * 4;
        floor.lineBetween(
          L(sc.x + ox - Math.cos(sc.a) * sc.len / 2), sc.y + oy - Math.sin(sc.a) * sc.len / 2,
          L(sc.x + ox + Math.cos(sc.a) * sc.len / 2), sc.y + oy + Math.sin(sc.a) * sc.len / 2,
        );
      }
    }

    // Walls: drop shadow, front face, lit top, then a cap on every joint so corners are clean.
    walls.fillStyle(0x000000, 0.55);
    for (const w of this.rects) rectAt(walls, w.x + 2, w.y + 5, w.w, w.h);
    walls.fillStyle(tint(SILENCE.bruise), 1);
    for (const w of this.rects) rectAt(walls, w.x, w.y + 3, w.w, w.h);
    walls.fillStyle(tint(SILENCE.plum), 1);
    for (const w of this.rects) rectAt(walls, w.x, w.y, w.w, w.h - 1);
    walls.fillStyle(tint(SILENCE.violet), 0.7);
    for (const w of this.rects) rectAt(walls, w.x, w.y, w.w, 2);
    const t = WALL_T;
    for (let c = 0; c <= this.cols; c++) {
      for (let r = 0; r <= this.rows; r++) {
        const touches = (c > 0 && this.hWall[c - 1][r]) || (c < this.cols && this.hWall[c][r])
          || (r > 0 && this.vWall[c][r - 1]) || (r < this.rows && this.vWall[c][r]);
        if (!touches) continue;
        const px = this.left + c * this.cw - t / 2 - 1;
        const py = this.top + r * this.ch - t / 2 - 1;
        walls.fillStyle(tint(SILENCE.violet), 1);
        rectAt(walls, px, py, t + 2, t + 2);
        walls.fillStyle(tint(SILENCE.amethyst), 0.55);
        rectAt(walls, px, py, t + 2, 2.5);
      }
    }
  }

  /** The parts that move: the exit's cold light, the candles and the eyes in the walls. */
  paintLive(g: Phaser.GameObjects.Graphics, tint: SilenceColorFn, t: number, lookAt: { x: number; y: number } | null): void {
    // Exit: a doorway of cold light spilling into the maze.
    const e = this.exitPoint();
    const n = this.exitNormal();
    const inX = e.x - Math.cos(n) * 26;
    const inY = e.y - Math.sin(n) * 26;
    const pulse = 0.75 + 0.25 * Math.sin(t * 2.2);
    fogBank(g, inX, inY, 46, 3.1, t, 0x2a5a88, 0.28 * pulse, 6);
    g.fillStyle(0x77ccff, 0.35 * pulse);
    g.fillCircle(e.x, e.y, 22);
    const along = n + Math.PI / 2;
    const half = (this.exitSide === 'top' || this.exitSide === 'bottom' ? this.cw : this.ch) / 2 - 8;
    g.lineStyle(5, 0xbbeeff, 0.9 * pulse);
    g.lineBetween(e.x + Math.cos(along) * half, e.y + Math.sin(along) * half,
      e.x - Math.cos(along) * half, e.y - Math.sin(along) * half);
    // Motes drifting out through it.
    for (let i = 0; i < 5; i++) {
      const k = (t * 0.6 + i / 5) % 1;
      const s = Math.sin(i * 2.7) * half * 0.8;
      g.fillStyle(0xddf6ff, 0.6 * (1 - k));
      g.fillCircle(inX + Math.cos(along) * s + Math.cos(n) * k * 40, inY + Math.sin(along) * s + Math.sin(n) * k * 40, 1.6);
    }

    // Candles: a stub, a guttering flame and a small pool of warm light.
    for (const c of this.candles) {
      const x = this.fx(c.x);
      const fl = 0.8 + 0.2 * Math.sin(t * 13 + c.phase) + 0.1 * Math.sin(t * 29 + c.phase);
      g.fillStyle(0xffaa55, 0.08 * fl);
      g.fillCircle(x, c.y, 26);
      g.fillStyle(tint(SILENCE.bone), 0.95);
      g.fillRect(x - 2.5, c.y - 4, 5, 9);
      g.fillStyle(0xffcc66, 0.9 * fl);
      g.fillEllipse(x, c.y - 7, 4 * fl, 7 * fl);
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(x, c.y - 6, 1.1);
    }

    // Wall eyes: each opens on its own clock and tracks whatever it was told to watch.
    for (const eye of this.eyes) {
      const cycle = (t * 0.35 + eye.phase) % 6;
      const open = cycle < 3.6 ? Phaser.Math.Clamp(Math.min(cycle, 3.6 - cycle) * 2.5, 0, 1) : 0;
      if (open <= 0.02) continue;
      const x = this.fx(eye.x);
      const look = lookAt ? Math.atan2(lookAt.y - eye.y, lookAt.x - x) : 0;
      silenceEye(g, tint, x, eye.y, look, eye.size, 0.8, open, SILENCE.gore, 0.9);
    }
  }
}
