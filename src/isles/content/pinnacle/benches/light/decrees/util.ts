import type { Fighter } from '../../../../../../entities/Fighter';
import type { GimmickCtx } from '../../../../../IslesTypes';
import { OBS } from '../../../../../art/PinnacleArt';
import { NOON } from '../art';

/** Small shared helpers for the Noon Bench's six decrees. */

export type Who = 'player' | 'npc';
export const WHO: Who[] = ['player', 'npc'];

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;
export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
/** A frame's dt in seconds, clamped so a hitch never teleports anything. */
export const stepDt = (dt: number): number => clamp(dt, 0, 0.05);
export const wrapAngle = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

export const fighterOf = (ctx: GimmickCtx, w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
export const otherOf = (w: Who): Who => (w === 'player' ? 'npc' : 'player');

/** Each side's colour in every decree: the challenger in gold light, the councilor in the King's violet. */
export const SIDE: Record<Who, number> = { player: NOON.gold, npc: OBS.seamLit };
export const SIDE_CSS: Record<Who, string> = { player: '#fff2b0', npc: '#c9b0ff' };

/**
 * A fighter's own motion, measured from where it actually went (never from a body's speed): a
 * smoothed velocity, refreshed every frame.
 */
export class Motion {
  vx = 0;
  vy = 0;
  private lx = NaN;
  private ly = NaN;

  sample(f: Fighter, dt: number): void {
    if (Number.isNaN(this.lx) || dt <= 0) { this.lx = f.x; this.ly = f.y; return; }
    const ix = (f.x - this.lx) / dt, iy = (f.y - this.ly) / dt;
    // A teleport is not a speed.
    const jump = Math.hypot(f.x - this.lx, f.y - this.ly) > 120;
    const k = jump ? 0 : Math.min(1, dt * 9);
    this.vx += (ix - this.vx) * k;
    this.vy += (iy - this.vy) * k;
    this.lx = f.x; this.ly = f.y;
  }

  get speed(): number { return Math.hypot(this.vx, this.vy); }
  get heading(): number { return Math.atan2(this.vy, this.vx); }
}

/** A point clamped onto the playfield (below the HUD strip). */
export const onFloor = (ctx: GimmickCtx, x: number, y: number, pad = 50): { x: number; y: number } =>
  ({ x: clamp(x, pad, ctx.W - pad), y: clamp(y, ctx.top + pad, ctx.H - pad) });
