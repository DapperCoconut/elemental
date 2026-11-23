import type { Fighter } from '../../../../../entities/Fighter';

/**
 * Plumbing shared by the Mind Court's gimmicks, prince and charms. Mechanics only — the art
 * (the stroke lettering, cards, pieces) lives in `art.ts`.
 */

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** A frame step clamped so a tab-switch hitch cannot fling a chair across the parlour. */
export const stepDt = (dt: number): number => clamp(dt, 0, 0.1);

/** Distance from a point to a segment. */
export function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

/** Wrap an angle into (-π, π]. */
export const wrapAngle = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** Ease in-out on 0..1. */
export const ease = (k: number): number => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

/** Seconds since the last call, read off the scene clock a script is handed. */
export function clock(): (time: number) => number {
  let last = -1;
  return (time) => {
    const dt = last < 0 ? 0 : clamp((time - last) / 1000, 0, 0.1);
    last = time;
    return dt;
  };
}

/**
 * A fighter's walking velocity, smoothed — what the Mind Court's readers read. Feed it a
 * position every frame; `vx`/`vy` are px/s.
 */
export interface Motion { x: number; y: number; vx: number; vy: number; seen: boolean }

export function newMotion(): Motion { return { x: 0, y: 0, vx: 0, vy: 0, seen: false }; }

export function track(m: Motion, x: number, y: number, dt: number): void {
  if (!m.seen || dt <= 0) { m.x = x; m.y = y; m.seen = true; return; }
  const k = clamp(dt * 6, 0, 1);
  m.vx += ((x - m.x) / dt - m.vx) * k;
  m.vy += ((y - m.y) / dt - m.vy) * k;
  m.x = x; m.y = y;
}

/** The ability a fighter has bound to a key ('E', 'R', 'F'), or undefined. */
export function abilityOn(f: Fighter, key: string): { id: string; cooldown: number } | undefined {
  const list = f.element?.abilities ?? [];
  return list.find((a) => a.displayKey === key);
}

/** 0..1 readiness of the ability on a key (1 = ready); 1 when the key is empty. */
export function readiness(f: Fighter, key: string): number {
  const a = abilityOn(f, key);
  if (!a || typeof f.getCooldownRatio !== 'function') return 1;
  return clamp(f.getCooldownRatio(a.id), 0, 1);
}

/**
 * Set the ability on a key to a readiness (1 = ready now, 0 = just spent). Charged ultimates are
 * left alone — their price is points, not time.
 */
export function setReadiness(f: Fighter, key: string, r: number): void {
  const a = abilityOn(f, key);
  if (!a || typeof f.resetCooldown !== 'function' || f.isChargedUltimateId(a.id)) return;
  if (r >= 0.999) { f.resetCooldown(a.id); return; }
  f.restampCooldown(a.id);
  if (r > 0) f.reduceCooldown(a.id, a.cooldown * r);
}
