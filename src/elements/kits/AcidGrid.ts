/**
 * Venom's floor: a coarse grid of acid cells, one per owner.
 *
 * Pure data — no Phaser — so the kit, the codex previews and anything else that wants to know
 * "how much of the arena is acid" read the same numbers. A cell is empty, **cool** (spent acid,
 * the standing floor) or **hot** (freshly laid; it bites the first body that walks over it and
 * then cools). Coverage is simply acid cells over all cells, so overlapping sprays never count
 * twice — the reason the pools were replaced by a grid in the first place. A fourth state, **red**,
 * is acid a Melting bomb boiled: it burns the first body to touch it far harder, then cools.
 */

export const ACID_CELL = 16;

export const CellState = { Empty: 0, Cool: 1, Hot: 2, Red: 3 } as const;
export type CellState = 0 | 1 | 2 | 3;

export class AcidGrid {
  readonly cols: number;
  readonly rows: number;
  readonly cells: Uint8Array;
  private acidCount = 0;
  /** Bumped on every change, so a renderer only repaints when the floor actually moved. */
  version = 0;

  constructor(readonly x0: number, readonly y0: number, width: number, height: number) {
    this.cols = Math.max(1, Math.ceil(width / ACID_CELL));
    this.rows = Math.max(1, Math.ceil(height / ACID_CELL));
    this.cells = new Uint8Array(this.cols * this.rows);
  }

  get total(): number { return this.cells.length; }
  get count(): number { return this.acidCount; }
  /** 0–1: the share of the floor that is acid. */
  get coverage(): number { return this.acidCount / this.cells.length; }

  index(x: number, y: number): number {
    const c = Math.floor((x - this.x0) / ACID_CELL);
    const r = Math.floor((y - this.y0) / ACID_CELL);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return -1;
    return r * this.cols + c;
  }

  centerX(i: number): number { return this.x0 + (i % this.cols) * ACID_CELL + ACID_CELL / 2; }
  centerY(i: number): number { return this.y0 + Math.floor(i / this.cols) * ACID_CELL + ACID_CELL / 2; }

  at(x: number, y: number): CellState {
    const i = this.index(x, y);
    return i < 0 ? CellState.Empty : this.cells[i] as CellState;
  }

  isAcid(x: number, y: number): boolean { return this.at(x, y) !== CellState.Empty; }

  set(i: number, state: CellState): void {
    const was = this.cells[i];
    if (was === state) return;
    if (was === CellState.Empty) this.acidCount++;
    else if (state === CellState.Empty) this.acidCount--;
    this.cells[i] = state;
    this.version++;
  }

  /**
   * Lay acid over every cell whose centre is inside the circle. Fresh acid is hot, and acid laid
   * over spent acid re-lights it. Returns how many cells were *new* acid, which is what coverage
   * stats want.
   */
  paintCircle(x: number, y: number, radius: number, state: CellState = CellState.Hot): number {
    let added = 0;
    const c0 = Math.max(0, Math.floor((x - radius - this.x0) / ACID_CELL));
    const c1 = Math.min(this.cols - 1, Math.floor((x + radius - this.x0) / ACID_CELL));
    const r0 = Math.max(0, Math.floor((y - radius - this.y0) / ACID_CELL));
    const r1 = Math.min(this.rows - 1, Math.floor((y + radius - this.y0) / ACID_CELL));
    const rr = radius * radius;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const cx = this.x0 + c * ACID_CELL + ACID_CELL / 2;
        const cy = this.y0 + r * ACID_CELL + ACID_CELL / 2;
        const dx = cx - x, dy = cy - y;
        if (dx * dx + dy * dy > rr) continue;
        const i = r * this.cols + c;
        if (this.cells[i] === CellState.Empty) added++;
        // Red acid stays red until somebody steps in it.
        if (this.cells[i] === CellState.Red) continue;
        if (state === CellState.Hot || this.cells[i] === CellState.Empty) this.set(i, state);
      }
    }
    // A circle smaller than a cell still marks the cell it is in.
    if (added === 0 && radius < ACID_CELL) {
      const i = this.index(x, y);
      if (i >= 0 && this.cells[i] === CellState.Empty) { this.set(i, state); added = 1; }
    }
    return added;
  }

  /** Every acid cell whose centre is inside the circle turns red. Returns how many did. */
  reddenCircle(x: number, y: number, radius: number): number {
    let n = 0;
    const c0 = Math.max(0, Math.floor((x - radius - this.x0) / ACID_CELL));
    const c1 = Math.min(this.cols - 1, Math.floor((x + radius - this.x0) / ACID_CELL));
    const r0 = Math.max(0, Math.floor((y - radius - this.y0) / ACID_CELL));
    const r1 = Math.min(this.rows - 1, Math.floor((y + radius - this.y0) / ACID_CELL));
    const rr = radius * radius;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const i = r * this.cols + c;
        if (this.cells[i] === CellState.Empty || this.cells[i] === CellState.Red) continue;
        const dx = this.x0 + c * ACID_CELL + ACID_CELL / 2 - x, dy = this.y0 + r * ACID_CELL + ACID_CELL / 2 - y;
        if (dx * dx + dy * dy > rr) continue;
        this.set(i, CellState.Red);
        n++;
      }
    }
    return n;
  }

  /** Every hot (or, with `state`, red) cell under a body of radius `r` cools. Returns how many did. */
  coolUnder(x: number, y: number, r: number, state: CellState = CellState.Hot): number {
    let n = 0;
    const c0 = Math.max(0, Math.floor((x - r - this.x0) / ACID_CELL));
    const c1 = Math.min(this.cols - 1, Math.floor((x + r - this.x0) / ACID_CELL));
    const r0 = Math.max(0, Math.floor((y - r - this.y0) / ACID_CELL));
    const r1 = Math.min(this.rows - 1, Math.floor((y + r - this.y0) / ACID_CELL));
    for (let row = r0; row <= r1; row++) {
      for (let c = c0; c <= c1; c++) {
        const i = row * this.cols + c;
        if (this.cells[i] !== state) continue;
        this.set(i, CellState.Cool);
        n++;
      }
    }
    return n;
  }

  /** True when the cell borders an empty cell (or the edge) — the rim the renderer rounds off. */
  isEdge(i: number): boolean {
    const c = i % this.cols;
    const r = (i - c) / this.cols;
    const e = CellState.Empty;
    return c === 0 || r === 0 || c === this.cols - 1 || r === this.rows - 1
      || this.cells[i - 1] === e || this.cells[i + 1] === e
      || this.cells[i - this.cols] === e || this.cells[i + this.cols] === e;
  }

  /**
   * Acid Flood: every empty cell touching acid has `chance` to fill (cool — creeping acid, not a
   * fresh spray). Decided against a snapshot so a single tick only grows one ring.
   */
  creep(chance: number): number {
    const grow: number[] = [];
    const { cols, rows, cells } = this;
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] !== CellState.Empty) continue;
      const c = i % cols;
      const r = (i - c) / cols;
      const touching = (c > 0 && cells[i - 1] !== 0) || (c < cols - 1 && cells[i + 1] !== 0)
        || (r > 0 && cells[i - cols] !== 0) || (r < rows - 1 && cells[i + cols] !== 0);
      if (touching && Math.random() < chance) grow.push(i);
    }
    for (const i of grow) this.set(i, CellState.Cool);
    return grow.length;
  }

  /** The acid cell nearest a point within `maxDist`, as a world position, or null. */
  nearestAcid(x: number, y: number, maxDist: number): { x: number; y: number } | null {
    if (this.acidCount === 0) return null;
    const reach = Math.ceil(maxDist / ACID_CELL);
    const c0 = Math.floor((x - this.x0) / ACID_CELL);
    const r0 = Math.floor((y - this.y0) / ACID_CELL);
    let best: { x: number; y: number } | null = null;
    let bestD = maxDist * maxDist;
    for (let dr = -reach; dr <= reach; dr++) {
      const r = r0 + dr;
      if (r < 0 || r >= this.rows) continue;
      for (let dc = -reach; dc <= reach; dc++) {
        const c = c0 + dc;
        if (c < 0 || c >= this.cols) continue;
        const i = r * this.cols + c;
        if (this.cells[i] === CellState.Empty) continue;
        const cx = this.centerX(i), cy = this.centerY(i);
        const d = (cx - x) * (cx - x) + (cy - y) * (cy - y);
        if (d < bestD) { bestD = d; best = { x: cx, y: cy }; }
      }
    }
    return best;
  }

  /** A random acid cell's centre, or null on a clean floor. */
  randomAcid(): { x: number; y: number } | null {
    if (this.acidCount === 0) return null;
    for (let tries = 0; tries < 40; tries++) {
      const i = Math.floor(Math.random() * this.cells.length);
      if (this.cells[i] !== CellState.Empty) return { x: this.centerX(i), y: this.centerY(i) };
    }
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i] !== CellState.Empty) return { x: this.centerX(i), y: this.centerY(i) };
    }
    return null;
  }

  clear(): void {
    this.cells.fill(0);
    this.acidCount = 0;
    this.version++;
  }
}
