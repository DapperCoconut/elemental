import type Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { Pt } from '../../../../../IslesTypes';

/**
 * Small shared helpers for the Hearth Court's five gimmicks. Only mechanics plumbing lives here
 * (time steps, distances, the darkness grid) — every gimmick paints its own art.
 */

/**
 * A frame clock: hands back seconds since the last call, clamped so a tab-switch hitch can't
 * push a fuse or a cloud halfway across the room in one frame. Works off the scene time the
 * gimmick is handed, so it does not care what unit the host's own `dt` is in.
 */
export function frameClock(): (time: number) => number {
  let last = -1;
  return (time: number) => {
    const dt = last < 0 ? 0 : Math.max(0, Math.min(0.1, (time - last) / 1000));
    last = time;
    return dt;
  };
}

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** Shortest signed angle difference. */
export const angDiff = (a: number, b: number): number => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

export interface Light { x: number; y: number; r: number }

/**
 * A darkness overlay painted as a coarse grid, each cell's alpha falling off near the nearest
 * light. Graphics can't cut holes, so this is how the Curfew and Soot fights black out the room
 * while leaving pools of sight. ~600 rects a frame at the default cell size.
 */
export function darknessGrid(
  g: Phaser.GameObjects.Graphics, W: number, H: number, top: number,
  lights: Light[], alpha: number, color = 0x050302, cell = 30,
): void {
  if (alpha <= 0.01) return;
  for (let y = top; y < H; y += cell) {
    for (let x = 0; x < W; x += cell) {
      const cx = x + cell / 2, cy = y + cell / 2;
      let k = 1;
      for (const l of lights) {
        const d = Math.hypot(cx - l.x, cy - l.y) / l.r;
        const lit = clamp((d - 0.55) / 0.45, 0, 1);
        if (lit < k) k = lit;
        if (k <= 0) break;
      }
      if (k <= 0) continue;
      g.fillStyle(color, alpha * k);
      g.fillRect(x, y, cell, cell);
    }
  }
}

/** A point nudged into the playfield. */
export function inField(p: Pt, W: number, H: number, top: number, pad = 50): Pt {
  return { x: clamp(p.x, pad, W - pad), y: clamp(p.y, top + pad, H - pad) };
}
