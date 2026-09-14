import Phaser from 'phaser';
import {
  REALITY_BLUE, REALITY_GLOW, REALITY_WHITE,
  DUNGEON_STONE, DUNGEON_STONE_LIT, DUNGEON_LINE,
} from './RealityTypes';

/**
 * Bespoke Graphics art for the Reality feature. Everything is drawn — there are
 * no image assets anywhere in the game — and everything static is drawn once
 * into a Graphics the caller owns; per-frame effects take a time parameter and
 * expect a cleared fx layer.
 */

/** Deterministic per-seed randomness so a crack keeps its shape between frames and visits. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The crack in the world, anchored at (x, y) and growing up-and-right.
 * `size` is its reach in px (0 draws nothing); the title screen feeds it the
 * save's endgame progress. Branches thin as they split, and a faint glow of
 * `color` bleeds out of every segment — the world's light showing through.
 */
export function drawCrack(
  g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, color: number,
): void {
  if (size <= 0) return;
  const rand = seeded(77041);

  const drawBranch = (
    bx: number, by: number, angle: number, len: number, width: number, depth: number,
  ): void => {
    let px = bx;
    let py = by;
    let a = angle;
    const steps = Math.max(3, Math.round(len / 9));
    const step = len / steps;
    for (let i = 0; i < steps; i++) {
      a += (rand() - 0.5) * 0.9;
      const nx = px + Math.cos(a) * step;
      const ny = py + Math.sin(a) * step;
      const w = Math.max(0.6, width * (1 - i / steps));
      // Glow first, then the bright fissure line over it.
      g.lineStyle(w * 3.2, color, 0.10);
      g.lineBetween(px, py, nx, ny);
      g.lineStyle(w, Phaser.Display.Color.IntegerToColor(color).clone().brighten(30).color, 0.9);
      g.lineBetween(px, py, nx, ny);
      // Occasionally throw a thinner branch off the main run.
      if (depth > 0 && i > 0 && rand() < 0.3) {
        drawBranch(nx, ny, a + (rand() < 0.5 ? -1 : 1) * (0.5 + rand() * 0.6),
          len * 0.38, width * 0.55, depth - 1);
      }
      px = nx;
      py = ny;
    }
  };

  // Main fissure runs up-right out of the corner; a shorter one splits low.
  drawBranch(x, y, -Math.PI / 3.1, size, Math.min(3.4, 1 + size / 28), 2);
  drawBranch(x, y, -Math.PI / 8, size * 0.55, Math.min(2.4, 0.8 + size / 40), 1);
  // The hairline halo at the anchor — glass about to give.
  g.lineStyle(1, color, 0.35);
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (rand() - 0.5) * 2.4;
    g.lineBetween(x, y, x + Math.cos(a) * (6 + rand() * 8), y + Math.sin(a) * (6 + rand() * 8));
  }
}

// ── The dungeon rooms ────────────────────────────────────────────────

export interface RoomShellOpts {
  W: number;
  H: number;
  /** Distinguishes the stone coursing between rooms so travel reads as travel. */
  seed: number;
  /** Where the exit sits. The fountain room has none. */
  door: 'right' | 'none';
}

/**
 * One full-screen dungeon room: void border, flagstone floor, coursed stone
 * walls, and (usually) a sealed arch on the right that `drawDoor` lights when
 * the trial is cleared. Static — draw once per room into a depth ≤ 0 layer.
 */
export function drawRoomShell(g: Phaser.GameObjects.Graphics, opts: RoomShellOpts): void {
  const { W, H, seed } = opts;
  const rand = seeded(seed);
  const pad = 32;

  g.fillStyle(0x04050c, 1);
  g.fillRect(0, 0, W, H);

  // Floor: big flagstones, mortar lines slightly off-true, an occasional
  // paler slab so the field never reads as a grid texture.
  g.fillStyle(DUNGEON_STONE, 1);
  g.fillRect(pad, pad, W - pad * 2, H - pad * 2);
  const slab = 64;
  for (let y = pad; y < H - pad; y += slab) {
    const rowOff = (Math.floor((y - pad) / slab) % 2) * (slab / 2);
    for (let x = pad - rowOff; x < W - pad; x += slab) {
      const sx = Math.max(pad, x);
      const sw = Math.min(x + slab, W - pad) - sx;
      if (sw <= 0) continue;
      if (rand() < 0.16) {
        g.fillStyle(DUNGEON_STONE_LIT, 0.5 + rand() * 0.3);
        g.fillRect(sx + 2, y + 2, sw - 4, Math.min(slab, H - pad - y) - 4);
      }
      g.lineStyle(1, DUNGEON_LINE, 0.5);
      g.strokeRect(sx, y, sw, Math.min(slab, H - pad - y));
      // Hairline chips in a few slabs.
      if (rand() < 0.2) {
        g.lineStyle(1, 0x0a0d1c, 0.8);
        const cx0 = sx + 6 + rand() * (sw - 12);
        const cy0 = y + 6 + rand() * 30;
        g.lineBetween(cx0, cy0, cx0 + (rand() - 0.5) * 22, cy0 + rand() * 14);
      }
    }
  }

  // Walls: a coursed band all round, darker than the floor, struck with
  // per-course brick lines so it reads as masonry rather than a frame.
  g.fillStyle(0x0b0e1e, 1);
  g.fillRect(0, 0, W, pad);
  g.fillRect(0, H - pad, W, pad);
  g.fillRect(0, 0, pad, H);
  g.fillRect(W - pad, 0, pad, H);
  g.lineStyle(1, DUNGEON_LINE, 0.7);
  for (let x = 0; x < W; x += 40) {
    g.lineBetween(x, 0, x + 8, pad);
    g.lineBetween(x + 20, H - pad, x + 12, H);
  }
  for (let y = 0; y < H; y += 40) {
    g.lineBetween(0, y, pad, y + 8);
    g.lineBetween(W - pad, y + 20, W, y + 12);
  }
  g.lineStyle(2, DUNGEON_LINE, 1);
  g.strokeRect(pad, pad, W - pad * 2, H - pad * 2);
}

/**
 * The exit arch on the right wall, centred vertically. Sealed it is a black
 * void behind dim bars; open it glows Reality-blue and pulses in the kit's fx
 * pass. Returns the walk-through rect so the kit can test the player against it.
 */
export function drawDoor(
  g: Phaser.GameObjects.Graphics, W: number, H: number, open: boolean,
): Phaser.Geom.Rectangle {
  const doorH = 110;
  const doorW = 26;
  const x = W - 32 - 4;
  const y = H / 2;

  // The arch stones.
  g.fillStyle(0x0a0d1c, 1);
  g.fillRect(x - 6, y - doorH / 2 - 8, doorW + 12, doorH + 16);
  g.lineStyle(2, open ? REALITY_BLUE : DUNGEON_LINE, open ? 0.9 : 0.8);
  g.strokeRect(x - 6, y - doorH / 2 - 8, doorW + 12, doorH + 16);
  for (let i = 0; i < 4; i++) {
    const ky = y - doorH / 2 + 6 + i * (doorH / 4);
    g.lineStyle(1, open ? REALITY_BLUE : DUNGEON_LINE, 0.4);
    g.lineBetween(x - 6, ky, x + doorW + 6, ky);
  }

  if (open) {
    // The way through: layered blue light, brighter toward the centre line.
    for (let i = 4; i >= 0; i--) {
      g.fillStyle(i === 0 ? REALITY_WHITE : REALITY_BLUE, i === 0 ? 0.9 : 0.16);
      g.fillRect(x + doorW / 2 - (2 + i * 3), y - doorH / 2, (2 + i * 3) * 2, doorH);
    }
  } else {
    g.fillStyle(0x000000, 1);
    g.fillRect(x, y - doorH / 2, doorW, doorH);
    g.lineStyle(2, 0x232a4a, 1);
    for (let i = 0; i < 3; i++) {
      const bx = x + 5 + i * 8;
      g.lineBetween(bx, y - doorH / 2, bx, y + doorH / 2);
    }
  }
  return new Phaser.Geom.Rectangle(x - 2, y - doorH / 2, doorW + 6, doorH);
}

/** A wall sconce; static ironwork. The flame itself is per-frame — see `drawTorchFlame`. */
export function drawTorchBracket(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.lineStyle(2, 0x3a3450, 1);
  g.lineBetween(x - 5, y + 12, x, y + 2);
  g.lineBetween(x + 5, y + 12, x, y + 2);
  g.fillStyle(0x2a2540, 1);
  g.fillRect(x - 3, y - 2, 6, 6);
}

/** One torch flame frame — cold blue fire, because nothing down here is warm. */
export function drawTorchFlame(
  g: Phaser.GameObjects.Graphics, x: number, y: number, t: number,
): void {
  const flick = Math.sin(t * 9 + x * 0.7) * 1.6 + Math.sin(t * 23 + x) * 0.8;
  for (let i = 3; i >= 0; i--) {
    const r = 3 + i * 2.4;
    g.fillStyle(i === 0 ? REALITY_WHITE : REALITY_BLUE, i === 0 ? 0.95 : 0.16 + 0.05 * i);
    g.fillEllipse(x + flick * (i / 3), y - 4 - i * 2.2, r, r * 1.7);
  }
  g.fillStyle(REALITY_GLOW, 0.05);
  g.fillCircle(x, y, 34 + flick * 2);
}

// ── Chaos and Order ──────────────────────────────────────────────────

/**
 * Order, one frame: a white-and-gold geometry pretending to be an angel —
 * nested rotating frames around a still core, a halo of counted points.
 * Everything about it is exact.
 */
export function drawOrderFigure(
  g: Phaser.GameObjects.Graphics, x: number, y: number, t: number,
): void {
  for (let i = 3; i >= 1; i--) {
    g.fillStyle(0xfff2c8, 0.05);
    g.fillCircle(x, y, 26 + i * 10);
  }
  // Two square frames turning against each other.
  for (const [r, dir, w] of [[30, 1, 2.5], [21, -1, 1.5]] as Array<[number, number, number]>) {
    const a0 = t * 0.7 * dir;
    g.lineStyle(w, 0xf4e6b8, 0.9);
    g.beginPath();
    for (let i = 0; i <= 4; i++) {
      const a = a0 + (i / 4) * Math.PI * 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }
  // The core: a white diamond that never moves.
  g.fillStyle(0xffffff, 1);
  g.fillTriangle(x, y - 12, x - 9, y, x + 9, y);
  g.fillTriangle(x, y + 12, x - 9, y, x + 9, y);
  g.fillStyle(0xc9a13a, 1);
  g.fillCircle(x, y, 3.5);
  // Halo points, exactly eight, exactly spaced.
  for (let i = 0; i < 8; i++) {
    const a = t * 0.4 + (i / 8) * Math.PI * 2;
    g.fillStyle(0xffe9a8, 0.9);
    g.fillCircle(x + Math.cos(a) * 42, y + Math.sin(a) * 42, 2);
  }
}

/**
 * Chaos, one frame: a red-black roil that refuses a silhouette — lobes
 * breathing on different clocks, sparks thrown wherever, one wide eye.
 */
export function drawChaosFigure(
  g: Phaser.GameObjects.Graphics, x: number, y: number, t: number,
): void {
  for (let i = 3; i >= 1; i--) {
    g.fillStyle(0xff2233, 0.05);
    g.fillCircle(x, y, 26 + i * 10);
  }
  // Nine lobes, each on its own pulse.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + Math.sin(t * (1.1 + i * 0.13)) * 0.5;
    const r = 16 + Math.sin(t * (2.3 + i * 0.31)) * 8;
    const lr = 9 + Math.sin(t * (3.1 + i)) * 4;
    g.fillStyle(i % 2 === 0 ? 0x3a0a12 : 0x8c1020, 1);
    g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r, lr);
  }
  g.fillStyle(0x1a040a, 1);
  g.fillCircle(x, y, 14);
  // The eye wanders.
  const ex = x + Math.sin(t * 2.7) * 5;
  const ey = y + Math.cos(t * 1.9) * 4;
  g.fillStyle(0xffdddd, 1);
  g.fillCircle(ex, ey, 6);
  g.fillStyle(0xff2233, 1);
  g.fillCircle(ex + Math.sin(t * 5) * 2, ey, 3);
  // Sparks.
  for (let i = 0; i < 5; i++) {
    if (Math.sin(t * 13 + i * 5) > 0.4) {
      g.fillStyle(0xff5566, 0.8);
      g.fillRect(x + Math.sin(t * 6 + i * 7) * 36, y + Math.cos(t * 8 + i * 3) * 36, 3, 3);
    }
  }
}

/**
 * The survivor's titan form — a colossus in the Disgraced King's weight class:
 * a great faceted torso under a crown, wings, a working halo, and detached
 * fists the size of a player. `kind` picks the body language: Order is drafted
 * marble, gold rule lines and geometry that never misses a beat; Chaos is
 * cracked obsidian bleeding firelight, and nothing about it repeats.
 */
export function drawTitanFigure(
  g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, kind: 'chaos' | 'order',
): void {
  const main = kind === 'order' ? 0xe8dcc0 : 0x241018;
  const trim = kind === 'order' ? 0xc9a13a : 0xff2233;
  const glow = kind === 'order' ? 0xfff2c8 : 0xff5566;

  // Grounding shadow, then the aura.
  g.fillStyle(0x000000, 0.4);
  g.fillEllipse(x, y + 98, 156, 26);
  for (let i = 4; i >= 1; i--) {
    g.fillStyle(trim, 0.045);
    g.fillCircle(x, y, 68 + i * 16);
  }

  // Wings, behind everything.
  if (kind === 'order') {
    // Fanned geometric planes, each exactly where it should be.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const a = -0.55 - i * 0.34 + Math.sin(t * 0.9) * 0.06;
        const len = 118 - i * 16;
        const wx = x + side * 44;
        const wy = y - 44;
        const tipX = wx + side * Math.cos(a) * len;
        const tipY = wy + Math.sin(a) * len;
        g.fillStyle(i % 2 === 0 ? 0xf4e6b8 : 0xc9a13a, 0.5 - i * 0.07);
        g.fillTriangle(wx, wy, tipX, tipY, wx + side * 12, wy + 30 - i * 4);
        g.lineStyle(1, trim, 0.7);
        g.lineBetween(wx, wy, tipX, tipY);
      }
    }
  } else {
    // Ragged flame lobes on unsteady clocks.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const a = -0.4 - i * 0.3 + Math.sin(t * (1.7 + i * 0.43) + side) * 0.22;
        const len = 104 - i * 12 + Math.sin(t * (2.4 + i)) * 12;
        const wx = x + side * 42;
        const wy = y - 40;
        g.fillStyle(i % 2 === 0 ? 0x8c1020 : 0x3a0a12, 0.75);
        g.fillTriangle(
          wx, wy,
          wx + side * Math.cos(a) * len, wy + Math.sin(a) * len,
          wx + side * 10, wy + 26,
        );
      }
    }
  }

  // Torso: shoulders up at y-58, hips at y+82 — the Disgraced King's bulk.
  g.fillStyle(main, 1);
  g.beginPath();
  g.moveTo(x - 66, y - 58);
  g.lineTo(x + 66, y - 58);
  g.lineTo(x + 42, y + 82);
  g.lineTo(x - 42, y + 82);
  g.closePath();
  g.fillPath();
  g.lineStyle(3, trim, 0.9);
  g.strokePath();

  if (kind === 'order') {
    // Rule lines: the body is drafted, not grown.
    g.lineStyle(1, trim, 0.5);
    for (let i = 1; i < 6; i++) {
      g.lineBetween(x - 66 + i * 4, y - 58 + i * 23, x + 66 - i * 4, y - 58 + i * 23);
    }
    g.lineBetween(x, y - 58, x, y + 82);
    g.lineBetween(x - 33, y - 58, x - 21, y + 82);
    g.lineBetween(x + 33, y - 58, x + 21, y + 82);
  } else {
    // Cracks bleeding light on unsteady clocks.
    for (let i = 0; i < 6; i++) {
      const a = 0.45 + Math.sin(t * (1.3 + i * 0.4)) * 0.2;
      g.lineStyle(2.5, glow, a);
      const cx0 = x - 42 + i * 17;
      g.beginPath();
      g.moveTo(cx0, y - 48);
      g.lineTo(cx0 + 9, y + Math.sin(i * 3) * 14);
      g.lineTo(cx0 - 4, y + 62);
      g.strokePath();
    }
  }

  // The molten core in the chest.
  if (kind === 'order') {
    const w = 11 + Math.sin(t * 2) * 2;
    g.fillStyle(0xffffff, 0.95);
    g.fillTriangle(x, y + 2 - w * 1.6, x - w, y + 2, x + w, y + 2);
    g.fillTriangle(x, y + 2 + w * 1.6, x - w, y + 2, x + w, y + 2);
    g.lineStyle(1.5, trim, 1);
    g.strokeCircle(x, y + 2, w + 7);
  } else {
    const r = 10 + Math.sin(t * 3.4) * 3;
    for (let i = 2; i >= 0; i--) {
      g.fillStyle(i === 0 ? 0xffdddd : 0xff2233, i === 0 ? 1 : 0.3);
      g.fillCircle(x, y + 2, r + i * 5);
    }
  }

  // The face, where a face goes: a plate high on the torso.
  g.fillStyle(kind === 'order' ? 0xfaf4e2 : 0x0c0408, 1);
  g.fillRect(x - 22, y - 52, 44, 28);
  g.lineStyle(2, trim, 1);
  g.strokeRect(x - 22, y - 52, 44, 28);
  if (kind === 'order') {
    // Two level slits. It has never blinked.
    g.fillStyle(0xc9a13a, 1);
    g.fillRect(x - 15, y - 42, 11, 3.5);
    g.fillRect(x + 4, y - 42, 11, 3.5);
  } else {
    // One wide eye and one crushed one.
    g.fillStyle(0xffdddd, 1);
    g.fillCircle(x - 8, y - 39, 6);
    g.fillStyle(0xff2233, 1);
    g.fillCircle(x - 8 + Math.sin(t * 4) * 2, y - 39, 3);
    g.lineStyle(3, 0xff2233, 0.9);
    g.lineBetween(x + 4, y - 44, x + 15, y - 34);
    g.lineBetween(x + 4, y - 34, x + 15, y - 44);
  }

  // The crown: exact points for Order; a snapped, tilted wreck for Chaos.
  if (kind === 'order') {
    g.fillStyle(0xc9a13a, 1);
    g.fillRect(x - 24, y - 68, 48, 8);
    for (let i = 0; i < 5; i++) {
      const px = x - 20 + i * 10;
      g.fillTriangle(px - 4, y - 68, px + 4, y - 68, px, y - 82);
    }
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(x, y - 64, 2.5);
  } else {
    g.fillStyle(0x8c1020, 1);
    g.fillRect(x - 24, y - 66, 48, 7);
    const spikes = [[-19, 12], [-8, 17], [3, 6], [15, 14]] as Array<[number, number]>;
    spikes.forEach(([sx, sh], i) => {
      const jag = Math.sin(t * 5 + i * 3) * 1.5;
      g.fillTriangle(x + sx - 4, y - 66, x + sx + 4, y - 66, x + sx + jag, y - 66 - sh);
    });
    // The snapped point, hanging by nothing.
    g.fillStyle(0x3a0a12, 1);
    g.fillTriangle(x + 26, y - 74, x + 33, y - 72, x + 29, y - 62);
  }

  // The halo, working overtime.
  if (kind === 'order') {
    for (const [r, dir] of [[96, 1], [78, -1]] as Array<[number, number]>) {
      const a0 = t * 0.5 * dir;
      g.lineStyle(2, 0xf4e6b8, 0.55);
      for (let i = 0; i < 6; i++) {
        const a = a0 + (i / 6) * Math.PI * 2;
        g.beginPath();
        g.arc(x, y, r, a, a + Math.PI / 5);
        g.strokePath();
      }
    }
    for (let i = 0; i < 12; i++) {
      const a = t * 0.4 + (i / 12) * Math.PI * 2;
      g.fillStyle(0xffe9a8, 0.9);
      g.fillCircle(x + Math.cos(a) * 104, y + Math.sin(a) * 104, 2.5);
    }
  } else {
    for (let i = 0; i < 8; i++) {
      const a = t * (0.7 + (i % 3) * 0.23) + (i / 8) * Math.PI * 2;
      const r = 92 + Math.sin(t * (1.9 + i * 0.31)) * 12;
      const ex = x + Math.cos(a) * r;
      const ey = y + Math.sin(a) * r;
      g.fillStyle(i % 2 === 0 ? 0xff2233 : 0x8c1020, 0.85);
      g.fillTriangle(ex, ey - 6, ex - 5, ey + 4, ex + 5, ey + 4);
      if (Math.sin(t * 13 + i * 5) > 0.5) {
        g.fillStyle(0xff5566, 0.8);
        g.fillRect(ex + Math.sin(t * 9 + i) * 10, ey + 6, 3, 3);
      }
    }
  }

  // The two great fists, detached, riding their own orbits.
  for (const side of [-1, 1]) {
    const hx = x + side * (96 + Math.sin(t * 1.6 + side) * 8);
    const hy = y + 8 + Math.cos(t * 1.9 + side * 2) * 13;
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(hx, hy + 30, 40, 9);
    g.fillStyle(main, 1);
    g.fillCircle(hx, hy, 22);
    g.lineStyle(2.5, trim, 0.9);
    g.strokeCircle(hx, hy, 22);
    if (kind === 'order') {
      g.lineStyle(1, trim, 0.6);
      g.strokeCircle(hx, hy, 14);
      g.strokeCircle(hx, hy, 7);
    } else {
      g.lineStyle(2, glow, 0.6 + Math.sin(t * 3 + side) * 0.2);
      g.lineBetween(hx - 12, hy, hx + 12, hy);
      g.lineBetween(hx - 3, hy - 12, hx + 5, hy + 12);
    }
  }
}

/** The shard Reality leaves behind: a slow-turning splinter of pure world. */
export function drawShard(
  g: Phaser.GameObjects.Graphics, x: number, y: number, t: number,
): void {
  for (let i = 4; i >= 1; i--) {
    g.fillStyle(REALITY_BLUE, 0.06);
    g.fillCircle(x, y, 14 + i * 9 + Math.sin(t * 2) * 3);
  }
  const w = 8 * Math.abs(Math.cos(t * 1.2)) + 2;
  g.fillStyle(REALITY_GLOW, 1);
  g.fillTriangle(x, y - 22, x - w, y, x + w, y);
  g.fillTriangle(x, y + 22, x - w, y, x + w, y);
  g.fillStyle(REALITY_WHITE, 0.95);
  g.fillTriangle(x, y - 14, x - w * 0.5, y, x + w * 0.5, y);
  g.fillTriangle(x, y + 14, x - w * 0.5, y, x + w * 0.5, y);
  // Motes falling up.
  for (let i = 0; i < 4; i++) {
    const ph = ((t * 0.6 + i / 4) % 1);
    g.fillStyle(REALITY_GLOW, 0.8 * (1 - ph));
    g.fillCircle(x + Math.sin(i * 7 + t) * 12, y - ph * 44, 1.8);
  }
}

// ── The fountain ─────────────────────────────────────────────────────

/**
 * The checkpoint fountain: an octagonal stone basin with a fluted column.
 * Unlit it is dry, dark stone; lit, the bowl holds Reality-blue water. The
 * per-frame shimmer is `drawFountainWater`.
 */
export function drawFountain(
  g: Phaser.GameObjects.Graphics, x: number, y: number, lit: boolean,
): void {
  // Basin: two stacked octagons with a wall between them.
  const oct = (r: number): Phaser.Geom.Point[] => {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      pts.push(new Phaser.Geom.Point(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.62));
    }
    return pts;
  };
  g.fillStyle(0x0b0e1e, 1);
  g.fillPoints(oct(58), true);
  g.lineStyle(2, DUNGEON_LINE, 1);
  g.strokePoints(oct(58), true, true);
  g.fillStyle(DUNGEON_STONE_LIT, 1);
  g.fillPoints(oct(46), true);
  g.lineStyle(1, DUNGEON_LINE, 0.8);
  g.strokePoints(oct(46), true, true);

  // The bowl.
  g.fillStyle(lit ? 0x123268 : 0x0a0c18, 1);
  g.fillPoints(oct(38), true);

  // Column and crown.
  g.fillStyle(0x1c2138, 1);
  g.fillRect(x - 7, y - 46, 14, 40);
  g.lineStyle(1, DUNGEON_LINE, 0.9);
  g.lineBetween(x - 3, y - 46, x - 3, y - 6);
  g.lineBetween(x + 3, y - 46, x + 3, y - 6);
  g.fillStyle(0x252b48, 1);
  g.fillRect(x - 12, y - 52, 24, 8);
  g.fillRect(x - 10, y - 4, 20, 5);
  if (lit) {
    for (let i = 3; i >= 0; i--) {
      g.fillStyle(i === 0 ? REALITY_WHITE : REALITY_GLOW, i === 0 ? 0.9 : 0.12);
      g.fillCircle(x, y - 56, 3 + i * 3);
    }
  }
}

// ── The chapel ───────────────────────────────────────────────────────

/**
 * Reality's chapel: a nave of cold stone under three arched stained-glass
 * windows, a carpet running to the piano. Static; the candle flames and the
 * figure itself are per-frame.
 */
export function drawChapel(g: Phaser.GameObjects.Graphics, W: number, H: number): void {
  drawRoomShell(g, { W, H, seed: 40777, door: 'none' });

  // The carpet: a deep blue runner up the middle, gold-trimmed.
  const cw = 120;
  g.fillStyle(0x131c48, 1);
  g.fillRect(W / 2 - cw / 2, 32, cw, H - 64);
  g.lineStyle(2, 0x8a7a3a, 0.8);
  g.lineBetween(W / 2 - cw / 2 + 5, 32, W / 2 - cw / 2 + 5, H - 32);
  g.lineBetween(W / 2 + cw / 2 - 5, 32, W / 2 + cw / 2 - 5, H - 32);

  // Three arched windows along the top wall. The middle one is Reality's —
  // white; the flanks are the game's elements, leaded into little panes.
  const winY = 16;
  const winH = 26;
  const paneColors = [0x2b4fd8, 0x7a2bd8, 0x2bd8b0, 0xd8b02b, 0xd82b4f, 0x2b8fd8];
  [W * 0.3, W * 0.5, W * 0.7].forEach((wx, wi) => {
    const winW = 76;
    g.fillStyle(0x05060e, 1);
    g.fillRect(wx - winW / 2, winY - 4, winW, winH + 8);
    for (let i = 0; i < 6; i++) {
      const px = wx - winW / 2 + 4 + (i % 3) * ((winW - 8) / 3);
      const py = winY + Math.floor(i / 3) * (winH / 2);
      const color = wi === 1 ? REALITY_WHITE : paneColors[(i + wi * 2) % paneColors.length];
      g.fillStyle(color, wi === 1 ? 0.5 : 0.4);
      g.fillRect(px, py, (winW - 8) / 3 - 2, winH / 2 - 2);
    }
    g.lineStyle(2, 0x3a3450, 1);
    g.strokeRect(wx - winW / 2, winY - 4, winW, winH + 8);
    // Light falling from each window onto the floor.
    g.fillStyle(wi === 1 ? REALITY_WHITE : paneColors[wi * 2], 0.04);
    g.fillTriangle(wx - winW / 2, winY + winH, wx + winW / 2, winY + winH,
      wx, winY + winH + 190);
  });

  // Candle stands along the walls.
  for (const [cx2, cy2] of [[70, H * 0.3], [70, H * 0.7], [W - 70, H * 0.3], [W - 70, H * 0.7]]) {
    g.lineStyle(2, 0x3a3450, 1);
    g.lineBetween(cx2, cy2 + 16, cx2, cy2);
    g.lineBetween(cx2 - 8, cy2 + 16, cx2 + 8, cy2 + 16);
    g.fillStyle(0xd7dcf2, 1);
    g.fillRect(cx2 - 2, cy2 - 8, 4, 8);
  }
}

/**
 * The piano — a grand in side profile, lid up, bench before it. `glow` tints
 * the soundboard light: faint blue while he plays, dark red when the music
 * turns. Static per state; redraw on change.
 */
export function drawPiano(
  g: Phaser.GameObjects.Graphics, x: number, y: number, glow: number, glowAlpha: number,
): void {
  // Bench.
  g.fillStyle(0x11142a, 1);
  g.fillRect(x - 74, y + 18, 40, 10);
  g.lineStyle(1, 0x2c3560, 1);
  g.strokeRect(x - 74, y + 18, 40, 10);

  // Body and raised lid.
  g.fillStyle(0x0a0c1c, 1);
  g.fillRect(x - 30, y - 10, 96, 42);
  g.lineStyle(2, 0x2c3560, 1);
  g.strokeRect(x - 30, y - 10, 96, 42);
  g.fillStyle(0x0e1226, 1);
  g.fillTriangle(x - 30, y - 10, x + 66, y - 10, x + 46, y - 52);
  g.lineStyle(2, 0x2c3560, 1);
  g.strokeTriangle(x - 30, y - 10, x + 66, y - 10, x + 46, y - 52);

  // The light out of the soundboard.
  for (let i = 3; i >= 0; i--) {
    g.fillStyle(glow, glowAlpha * (i === 0 ? 0.5 : 0.12));
    g.fillTriangle(x - 24, y - 12, x + 60, y - 12, x + 42, y - 48 - i * 6);
  }

  // Keys.
  g.fillStyle(0xd7dcf2, 1);
  g.fillRect(x - 34, y - 2, 10, 30);
  g.lineStyle(1, 0x05060e, 1);
  for (let i = 0; i < 6; i++) g.lineBetween(x - 34, y + 2 + i * 5, x - 24, y + 2 + i * 5);
}

/** The gesture Reality's hands are acting out — one per cast. */
export type RealityPose =
  | 'idle' | 'raise' | 'sweep' | 'spin' | 'summon' | 'knife' | 'mirror'
  | 'rain' | 'tear' | 'pulse' | 'checker' | 'seek' | 'beam';

/**
 * Reality himself, one frame — drawn the way the elements are drawn: a round
 * body with two tracking eyes and two detached ball hands. The body is built
 * from horizontal slices that glitch out of register, one eye burns white and
 * leaks down the face, and the hands act out whatever he is casting. `look`
 * aims the eyes (the player, usually); `pose` + `poseK` (0..1 wind-up
 * progress) pick the cast gesture; `intensity` 0..1 scales how badly he is
 * breaking up — the final phases push it high.
 */
export function drawRealityFigure(
  g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, intensity: number,
  look?: { x: number; y: number }, pose: RealityPose = 'idle', poseK = 0,
): void {
  const glitch = (seed: number): number =>
    Math.sin(t * 31 + seed * 3) > 0.92 - intensity * 0.5
      ? Math.sin(t * 53 + seed) * (3 + intensity * 9) : 0;
  const lerp = (a: number, b: number, f: number): number => a + (b - a) * f;
  const k = poseK >= 1 ? 1 : poseK * poseK * (3 - 2 * poseK);
  const la = look ? Math.atan2(look.y - y, look.x - x) : 0;
  const R = 27;

  // Aura.
  for (let i = 3; i >= 1; i--) {
    g.fillStyle(REALITY_BLUE, 0.05);
    g.fillCircle(x, y, R + 5 + i * 9);
  }

  // The body: a sphere cut into bands that slip out of register.
  const sliceH = 6;
  for (let i = 0; i < Math.ceil((R * 2) / sliceH); i++) {
    const sy = -R + i * sliceH;
    const mid = sy + sliceH / 2;
    const hw = Math.sqrt(Math.max(9, R * R - mid * mid));
    const ox = glitch(i);
    g.fillStyle(i % 2 === 0 ? 0x18246e : 0x101c4a, 1);
    g.fillRect(x - hw + ox, y + sy, hw * 2, sliceH - 0.5);
  }
  g.lineStyle(2, REALITY_BLUE, 0.5);
  g.strokeCircle(x, y, R + 1);

  // The eyes track whoever he is looking at. One is dark and small; the
  // other burns white and leaks down the face.
  const lx = look ? Math.cos(la) * 3 : 0;
  const ly = look ? Math.sin(la) * 2 : 0;
  const hox = glitch(11) * 0.5;
  g.fillStyle(0x05060e, 1);
  g.fillCircle(x - 9 + hox, y - 6, 6);
  g.fillCircle(x + 9 + hox, y - 6, 6);
  g.fillStyle(0x1a2350, 1);
  g.fillCircle(x - 9 + hox + lx, y - 6 + ly, 2.6);
  for (let i = 2; i >= 0; i--) {
    g.fillStyle(REALITY_WHITE, i === 0 ? 1 : 0.2);
    g.fillCircle(x + 9 + hox + lx, y - 6 + ly, 2.6 + i * 2);
  }
  const leak = 12 + Math.sin(t * 2) * 2 + intensity * 9;
  g.fillStyle(REALITY_WHITE, 0.85);
  g.fillRect(x + 8 + hox + lx, y - 6 + ly, 2, leak);
  g.fillStyle(REALITY_GLOW, 0.4);
  g.fillRect(x + 7.2 + hox + lx, y - 6 + ly, 3.6, leak * 0.7);

  // Hands: idle conducting drift, bent toward the cast's gesture by `k`.
  const hands: Array<{ x: number; y: number }> = [
    { x: x - (36 + Math.sin(t * 1.7) * 4), y: y + 8 + Math.cos(t * 1.3) * 5 },
    { x: x + (36 + Math.sin(t * 1.7 + 2) * 4), y: y + 8 + Math.cos(t * 1.3 + 2) * 5 },
  ];
  const aim = (hx2: number, hy2: number, i: number): void => {
    hands[i].x = lerp(hands[i].x, hx2, k);
    hands[i].y = lerp(hands[i].y, hy2, k);
  };
  switch (pose) {
    case 'raise':   // both hands high overhead, quivering with the charge
      aim(x - 18, y - R - 20 + Math.sin(t * 24) * 2, 0);
      aim(x + 18, y - R - 20 + Math.cos(t * 24) * 2, 1);
      break;
    case 'sweep': { // a conductor's downward slash, one hand trailing
      const sa = -2.1 + k * 2.7;
      hands[0] = { x: x + Math.cos(sa + 0.35) * 42, y: y + Math.sin(sa + 0.35) * 38 };
      hands[1] = { x: x + Math.cos(sa) * 46, y: y + Math.sin(sa) * 42 };
      break;
    }
    case 'spin': {  // hands orbiting the body like the beams they drive
      const a = t * 5.2;
      hands[0] = { x: x + Math.cos(a) * 42, y: y + Math.sin(a) * 42 };
      hands[1] = { x: x + Math.cos(a + Math.PI) * 42, y: y + Math.sin(a + Math.PI) * 42 };
      break;
    }
    case 'summon':  // hands low, trembling, pulling something out of the floor
      aim(x - 24, y + R + 12 + Math.sin(t * 21) * 2, 0);
      aim(x + 24, y + R + 12 + Math.cos(t * 21) * 2, 1);
      break;
    case 'knife':   // one hand tucked, the other raised with the drawn blade
      aim(x - 30, y + 12, 0);
      aim(x + 12, y - R - 14, 1);
      break;
    case 'mirror':  // hands cupped in front, holding the borrowed power
      aim(x + Math.cos(la) * 34 - Math.sin(la) * 11, y + Math.sin(la) * 34 + Math.cos(la) * 11, 0);
      aim(x + Math.cos(la) * 34 + Math.sin(la) * 11, y + Math.sin(la) * 34 - Math.cos(la) * 11, 1);
      break;
    case 'rain':    // arms spread wide overhead, opening the sky
      aim(x - 36, y - R - 14, 0);
      aim(x + 36, y - R - 14, 1);
      break;
    case 'tear':    // hands together, then ripping a vertical seam apart
      aim(x + 30, y - 6 - 34 * k, 0);
      aim(x + 30, y - 6 + 34 * k, 1);
      break;
    case 'pulse':   // both palms shoved outward with each ripple
      aim(x - 56, y + Math.sin(t * 9) * 3, 0);
      aim(x + 56, y + Math.sin(t * 9 + 1) * 3, 1);
      break;
    case 'checker': { // hands see-sawing — one half of the floor, then the other
      const s = Math.sin(t * 7) * 22;
      aim(x - 26, y - s, 0);
      aim(x + 26, y + s, 1);
      break;
    }
    case 'seek': {  // small stirring circles, winding the seekers up
      const a = t * 4.6;
      aim(x - 34 + Math.cos(a) * 9, y - 4 + Math.sin(a) * 9, 0);
      aim(x + 34 + Math.cos(a + 2) * 9, y - 4 + Math.sin(a + 2) * 9, 1);
      break;
    }
    case 'beam':    // both hands converged in front, feeding the charge
      aim(x + Math.cos(la) * 30 - Math.sin(la) * 9, y + Math.sin(la) * 30 + Math.cos(la) * 9, 0);
      aim(x + Math.cos(la) * 30 + Math.sin(la) * 9, y + Math.sin(la) * 30 - Math.cos(la) * 9, 1);
      break;
    default: break;
  }
  for (const h of hands) {
    g.fillStyle(REALITY_GLOW, 0.22);
    g.fillCircle(h.x, h.y, 10);
    g.fillStyle(0x18246e, 1);
    g.fillCircle(h.x, h.y, 6.5);
    g.lineStyle(1.5, REALITY_GLOW, 0.95);
    g.strokeCircle(h.x, h.y, 6.5);
  }

  // Gesture props.
  if (pose === 'knife' && k > 0.4) {
    const h = hands[1];
    g.fillStyle(REALITY_WHITE, 0.95);
    g.fillTriangle(
      h.x + Math.cos(la) * 20, h.y + Math.sin(la) * 20,
      h.x + Math.cos(la + 2.5) * 5, h.y + Math.sin(la + 2.5) * 5,
      h.x + Math.cos(la - 2.5) * 5, h.y + Math.sin(la - 2.5) * 5,
    );
  }
  if (pose === 'mirror' && k > 0.5) {
    g.lineStyle(2, REALITY_GLOW, 0.5 + Math.sin(t * 8) * 0.3);
    g.strokeCircle(x + Math.cos(la) * 34, y + Math.sin(la) * 34, 13);
  }
  if (pose === 'beam') {
    const mx = x + Math.cos(la) * 34;
    const my = y + Math.sin(la) * 34;
    for (let i = 2; i >= 0; i--) {
      g.fillStyle(i === 0 ? REALITY_WHITE : REALITY_GLOW, i === 0 ? 0.9 : 0.25);
      g.fillCircle(mx, my, 3 + k * 9 + i * 4);
    }
  }
  if (pose === 'tear' && k > 0.3) {
    g.lineStyle(2.5, REALITY_WHITE, 0.9);
    g.beginPath();
    g.moveTo(x + 30 + Math.sin(t * 30) * 1.5, hands[0].y + 8);
    for (let sy = hands[0].y + 8; sy < hands[1].y - 8; sy += 9) {
      g.lineTo(x + 30 + Math.sin(sy * 0.8 + t * 11) * 3, sy);
    }
    g.strokePath();
  }

  // Stray glitch slivers thrown clear of the silhouette.
  const shards = 2 + Math.floor(intensity * 5);
  for (let i = 0; i < shards; i++) {
    if (Math.sin(t * 19 + i * 7) > 0.6) {
      const sx = x + Math.sin(t * 7 + i * 13) * (30 + intensity * 26);
      const sy = y - 20 + Math.cos(t * 9 + i * 5) * 34;
      g.fillStyle(i % 2 === 0 ? REALITY_WHITE : REALITY_BLUE, 0.7);
      g.fillRect(sx, sy, 6 + (i % 3) * 4, 2);
    }
  }
}

/** The lit fountain's moving water: rim shimmer and two falling threads. */
export function drawFountainWater(
  g: Phaser.GameObjects.Graphics, x: number, y: number, t: number,
): void {
  for (let i = 0; i < 7; i++) {
    const a = t * 0.8 + (i / 7) * Math.PI * 2;
    g.fillStyle(REALITY_GLOW, 0.5 + Math.sin(t * 3 + i) * 0.2);
    g.fillCircle(x + Math.cos(a) * 30, y + Math.sin(a) * 18, 1.6);
  }
  for (const side of [-1, 1]) {
    const sway = Math.sin(t * 5 + side) * 1.5;
    g.lineStyle(1.5, REALITY_GLOW, 0.7);
    g.beginPath();
    g.moveTo(x + side * 4, y - 50);
    g.lineTo(x + side * (10 + sway), y - 20);
    g.lineTo(x + side * (14 + sway), y - 2);
    g.strokePath();
  }
}
