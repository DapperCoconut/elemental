import type { Fighter } from '../../../../../../entities/Fighter';
import type { GimmickCtx, Pt } from '../../../../../IslesTypes';
import { clamp } from '../util';

/**
 * Plumbing shared by the Forge Court's Fallen Five. Mechanics only — each gimmick paints its own
 * art. Every one of their rules can catch *either* fighter, so damage goes through `hurt`, which
 * scales the foe's share the same way the toolkit scales the player's.
 */

/** Toolkit-scaled damage to either fighter: the player through `tk.hitPlayer`, the foe through `ctx.hit`. */
export function hurt(ctx: GimmickCtx, f: Fighter, n: number, x = f.x, y = f.y): void {
  if (f === ctx.player) ctx.tk.hitPlayer(n, x, y);
  else ctx.hit(f, Math.max(1, Math.round(n * ctx.tk.damageScale)), x, y);
}

/** The other fighter. */
export const otherOf = (ctx: GimmickCtx, f: Fighter): Fighter => (f === ctx.player ? ctx.npc : ctx.player);

/** A point clamped onto the walkable floor of the fight. */
export function onFloor(ctx: GimmickCtx, x: number, y: number, pad = 50): Pt {
  return { x: clamp(x, pad, ctx.W - pad), y: clamp(y, ctx.top + pad, ctx.H - pad) };
}

/** Is angle `a` inside the arc swept from `a0` by `span` (signed, radians)? */
export function inArc(a: number, a0: number, span: number): boolean {
  const d = Math.atan2(Math.sin(a - a0), Math.cos(a - a0));
  return span >= 0 ? d >= -0.02 && d <= span + 0.02 : d <= 0.02 && d >= span - 0.02;
}
