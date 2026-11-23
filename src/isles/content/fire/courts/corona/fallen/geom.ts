import type { Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';

/**
 * Small geometry shared by the Corona Court's Fallen Five — every one of their rules is a line,
 * a ring or a point on the glass, so they all need the same three questions answered: how far
 * is this fighter from that segment, which way round is this angle, and is this fighter in play.
 */

/** Distance from a point to the segment a→b (clamped to the ends). */
export function segDist(px: number, py: number, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2));
  return Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t));
}

/** An angle folded into (−π, π]. */
export function wrapPi(a: number): number {
  let r = a % (Math.PI * 2);
  if (r <= -Math.PI) r += Math.PI * 2;
  if (r > Math.PI) r -= Math.PI * 2;
  return r;
}

/** A fighter that can still be hurt, struck or steered this frame. */
export function inPlay(f: Fighter): boolean {
  return f.active && f.hp > 0;
}

/**
 * A step of `dist` px from `from` straight away from `threat`, sidestepping along the
 * perpendicular when the two sit on top of each other.
 */
export function awayFrom(from: Pt, threat: Pt, dist: number): Pt {
  let dx = from.x - threat.x, dy = from.y - threat.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) { dx = 1; dy = 0; } else { dx /= len; dy /= len; }
  return { x: from.x + dx * dist, y: from.y + dy * dist };
}
