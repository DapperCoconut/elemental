/**
 * The maze under Fear's ultimate.
 *
 * Pure logic — no Phaser, no Math.random, no clocks. Everything is derived from the seed with
 * integer arithmetic, so the two machines of an online match build the same maze tile for tile.
 *
 * Layout: `cells × cells` rooms carved by a recursive backtracker onto a `(2·cells+1)²` tile grid
 * (rooms on odd tiles, walls between them), then braided — most dead ends are opened and a few
 * extra walls knocked out — so there are loops to juke a slow hunter around. Pillars (even,even)
 * never open, so every corridor stays exactly one tile wide.
 */

const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class FearMaze {
  /** Tiles per side (odd). Tile (tx,ty) covers [tx,tx+1)×[ty,ty+1) in maze units; 1 unit = one tile. */
  readonly size: number;
  /** Tile centres, far apart (path distance roughly 14–20 tiles). */
  readonly victimSpawn: { x: number; y: number };
  readonly hunterSpawn: { x: number; y: number };

  /** 1 = wall, 0 = open; row-major. */
  private grid: Uint8Array;
  /** Indices of every open tile, in row-major order (stable for `randomOpen`). */
  private open: number[] = [];
  /** The last BFS field, keyed by its source tile — the hunter asks every frame for the same target. */
  private fieldKey = -1;
  private field: Int32Array;
  private queue: Int32Array;

  constructor(seed: number, cells = 22) {
    const n = Math.max(4, Math.floor(cells));
    const size = n * 2 + 1;
    this.size = size;
    const grid = new Uint8Array(size * size).fill(1);
    this.grid = grid;
    this.field = new Int32Array(size * size);
    this.queue = new Int32Array(size * size);
    const rand = mulberry32(Math.floor(seed) | 0);
    const pick = (k: number): number => Math.min(k - 1, Math.floor(rand() * k));

    // ── Recursive backtracker (iterative) ──
    const seen = new Uint8Array(n * n);
    const stack: number[] = [];
    const start = pick(n) + pick(n) * n;
    seen[start] = 1;
    grid[((start / n) | 0) * 2 * size + size + (start % n) * 2 + 1] = 0;
    stack.push(start);
    const dirs = [0, 0, 0, 0];
    while (stack.length) {
      const cur = stack[stack.length - 1];
      const cx = cur % n;
      const cy = (cur / n) | 0;
      let cnt = 0;
      for (let d = 0; d < 4; d++) {
        const nx = cx + DX[d];
        const ny = cy + DY[d];
        if (nx < 0 || ny < 0 || nx >= n || ny >= n || seen[nx + ny * n]) continue;
        dirs[cnt++] = d;
      }
      if (!cnt) { stack.pop(); continue; }
      const d = dirs[pick(cnt)];
      const nx = cx + DX[d];
      const ny = cy + DY[d];
      seen[nx + ny * n] = 1;
      grid[(cy * 2 + 1 + DY[d]) * size + cx * 2 + 1 + DX[d]] = 0;
      grid[(ny * 2 + 1) * size + nx * 2 + 1] = 0;
      stack.push(nx + ny * n);
    }

    // ── Braid: open most dead ends, then a few extra walls ──
    for (let cy = 0; cy < n; cy++) {
      for (let cx = 0; cx < n; cx++) {
        const tx = cx * 2 + 1;
        const ty = cy * 2 + 1;
        let openCount = 0;
        let cnt = 0;
        for (let d = 0; d < 4; d++) {
          if (!grid[(ty + DY[d]) * size + tx + DX[d]]) { openCount++; continue; }
          const nx = cx + DX[d];
          const ny = cy + DY[d];
          if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
          dirs[cnt++] = d;
        }
        if (openCount !== 1 || !cnt) continue;
        if (rand() >= 0.85) continue;
        const d = dirs[pick(cnt)];
        grid[(ty + DY[d]) * size + tx + DX[d]] = 0;
      }
    }
    const extra = Math.round(n * n * 0.03);
    for (let i = 0, tries = 0; i < extra && tries < extra * 20; tries++) {
      const cx = pick(n);
      const cy = pick(n);
      const d = pick(2); // east or south
      if (cx + DX[d] >= n || cy + DY[d] >= n) continue;
      const idx = (cy * 2 + 1 + DY[d]) * size + cx * 2 + 1 + DX[d];
      if (!grid[idx]) continue;
      grid[idx] = 0;
      i++;
    }

    for (let i = 0; i < grid.length; i++) if (!grid[i]) this.open.push(i);

    // ── Spawns: the victim somewhere in the middle half, the hunter 14–20 tiles of path away ──
    const q = Math.floor(n / 4);
    const vcx = q + pick(Math.max(1, n - q * 2));
    const vcy = q + pick(Math.max(1, n - q * 2));
    const vIdx = (vcy * 2 + 1) * size + vcx * 2 + 1;
    const f = this.bfs(vIdx);
    const near: number[] = [];
    let best = -1;
    let bestErr = 1e9;
    for (let cy = 0; cy < n; cy++) {
      for (let cx = 0; cx < n; cx++) {
        const idx = (cy * 2 + 1) * size + cx * 2 + 1;
        const dist = f[idx];
        if (dist < 0 || idx === vIdx) continue;
        if (dist >= 14 && dist <= 20) near.push(idx);
        const err = Math.abs(dist - 17);
        if (err < bestErr) { bestErr = err; best = idx; }
      }
    }
    const hIdx = near.length ? near[pick(near.length)] : (best >= 0 ? best : vIdx);
    this.victimSpawn = { x: (vIdx % size) + 0.5, y: ((vIdx / size) | 0) + 0.5 };
    this.hunterSpawn = { x: (hIdx % size) + 0.5, y: ((hIdx / size) | 0) + 0.5 };
  }

  /** Out of range = wall. */
  isWall(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= this.size || ty >= this.size) return true;
    return this.grid[ty * this.size + tx] === 1;
  }

  private hits(x: number, y: number, r: number): boolean {
    const x0 = Math.floor(x - r);
    const x1 = Math.floor(x + r);
    const y0 = Math.floor(y - r);
    const y1 = Math.floor(y + r);
    const r2 = r * r;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!this.isWall(tx, ty)) continue;
        const nx = x < tx ? tx : x > tx + 1 ? tx + 1 : x;
        const ny = y < ty ? ty : y > ty + 1 ? ty + 1 : y;
        const ddx = x - nx;
        const ddy = y - ny;
        if (ddx * ddx + ddy * ddy < r2) return true;
      }
    }
    return false;
  }

  /** Move a circle of `radius` (maze units) by (dx,dy), sliding along walls. */
  move(x: number, y: number, dx: number, dy: number, radius: number): { x: number; y: number } {
    const r = Math.min(0.49, Math.max(0.01, radius));
    const reach = Math.max(Math.abs(dx), Math.abs(dy));
    if (!(reach > 0)) return { x, y };
    const steps = Math.min(64, Math.max(1, Math.ceil(reach / Math.max(0.04, r * 0.5))));
    const sx = dx / steps;
    const sy = dy / steps;
    for (let i = 0; i < steps; i++) {
      if (sx !== 0 && !this.hits(x + sx, y, r)) x += sx;
      if (sy !== 0 && !this.hits(x, y + sy, r)) y += sy;
    }
    return { x, y };
  }

  /** Clear line of sight between two points (DDA over tiles). */
  los(ax: number, ay: number, bx: number, by: number): boolean {
    let tx = Math.floor(ax);
    let ty = Math.floor(ay);
    const ex = Math.floor(bx);
    const ey = Math.floor(by);
    if (this.isWall(tx, ty) || this.isWall(ex, ey)) return false;
    const dx = bx - ax;
    const dy = by - ay;
    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;
    const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
    const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    let tMaxX = dx > 0 ? (tx + 1 - ax) / dx : dx < 0 ? (tx - ax) / dx : Infinity;
    let tMaxY = dy > 0 ? (ty + 1 - ay) / dy : dy < 0 ? (ty - ay) / dy : Infinity;
    for (let guard = this.size * 4; guard > 0 && (tx !== ex || ty !== ey); guard--) {
      if (Math.min(tMaxX, tMaxY) > 1) break;
      if (tMaxX < tMaxY) { tx += stepX; tMaxX += tDeltaX; } else { ty += stepY; tMaxY += tDeltaY; }
      if (this.isWall(tx, ty)) return false;
    }
    return true;
  }

  /** Tile-step distances from one tile to every other (−1 = unreachable). Cached per source. */
  private bfs(src: number): Int32Array {
    if (this.fieldKey === src) return this.field;
    const { size, grid, field, queue } = this;
    field.fill(-1);
    this.fieldKey = src;
    if (grid[src]) return field;
    let head = 0;
    let tail = 0;
    field[src] = 0;
    queue[tail++] = src;
    while (head < tail) {
      const cur = queue[head++];
      const cx = cur % size;
      const cy = (cur / size) | 0;
      for (let d = 0; d < 4; d++) {
        const nx = cx + DX[d];
        const ny = cy + DY[d];
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        const ni = ny * size + nx;
        if (grid[ni] || field[ni] >= 0) continue;
        field[ni] = field[cur] + 1;
        queue[tail++] = ni;
      }
    }
    return field;
  }

  private tileIndex(x: number, y: number): number {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= this.size || ty >= this.size) return -1;
    return ty * this.size + tx;
  }

  /** Centre of the next tile on the shortest path from a to b (BFS), or null if same tile/unreachable. */
  nextStep(ax: number, ay: number, bx: number, by: number): { x: number; y: number } | null {
    const a = this.tileIndex(ax, ay);
    const b = this.tileIndex(bx, by);
    if (a < 0 || b < 0 || a === b) return null;
    const f = this.bfs(b);
    const here = f[a];
    if (here <= 0) return null;
    const size = this.size;
    const cx = a % size;
    const cy = (a / size) | 0;
    for (let d = 0; d < 4; d++) {
      const nx = cx + DX[d];
      const ny = cy + DY[d];
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      if (f[ny * size + nx] === here - 1) return { x: nx + 0.5, y: ny + 0.5 };
    }
    return null;
  }

  /** Tiles of walking between two points (shortest path), or −1 if unreachable. Handy for `dread`. */
  pathDistance(ax: number, ay: number, bx: number, by: number): number {
    const a = this.tileIndex(ax, ay);
    const b = this.tileIndex(bx, by);
    if (a < 0 || b < 0) return -1;
    return this.bfs(b)[a];
  }

  /** A random open tile centre, using the caller's rng (0..1). */
  randomOpen(rand: () => number): { x: number; y: number } {
    const i = Math.min(this.open.length - 1, Math.max(0, Math.floor(rand() * this.open.length)));
    const idx = this.open[i];
    return { x: (idx % this.size) + 0.5, y: ((idx / this.size) | 0) + 0.5 };
  }

  /** Open neighbour tile centres of the tile containing (x,y). */
  exits(x: number, y: number): { x: number; y: number }[] {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    const out: { x: number; y: number }[] = [];
    for (let d = 0; d < 4; d++) {
      if (!this.isWall(tx + DX[d], ty + DY[d])) out.push({ x: tx + DX[d] + 0.5, y: ty + DY[d] + 0.5 });
    }
    return out;
  }
}
