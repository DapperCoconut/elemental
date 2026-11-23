import type { Fighter } from '../../../../../entities/Fighter';
import type { G } from '../../../../art/IsleArt';

/**
 * Plumbing shared by the Arcane Court's gimmicks, prince and charms — mechanics plus the one
 * piece of drawing every file needs: the chalk letters for the ability keys, since a rune that
 * names a key has to *show* the key, and Graphics cannot write text.
 */

export type Slot = 'click' | 'e' | 'r' | 'f' | 'q';

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** A frame step clamped so a tab-switch hitch cannot carry a familiar half across the circle. */
export const stepDt = (dt: number): number => clamp(dt, 0, 0.1);

/** Wrap an angle into (-π, π]. */
export const wrapAngle = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** Distance from a point to a segment. */
export function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

/** Seconds since the last call, read off the scene clock a script is handed. */
export function clock(): (time: number) => number {
  let last = -1;
  return (time) => {
    const dt = last < 0 ? 0 : clamp((time - last) / 1000, 0, 0.1);
    last = time;
    return dt;
  };
}

/** The key slot an ability sits in, read off the fighter's element (its `displayKey`). */
export function slotOf(f: Fighter, abilityId: string): Slot | null {
  const k = f.element?.abilities?.find((a) => a.id === abilityId)?.displayKey;
  if (k === 'Click') return 'click';
  if (k === 'E') return 'e';
  if (k === 'R') return 'r';
  if (k === 'F') return 'f';
  if (k === 'Q') return 'q';
  return null;
}

/** A slot string from a cast hook, as a Slot. */
export function asSlot(s: string | null | undefined): Slot | null {
  return s === 'click' || s === 'e' || s === 'r' || s === 'f' || s === 'q' ? s : null;
}

/** The keyed slots (not the basic attack) a fighter actually has. */
export function keyedSlots(f: Fighter): Slot[] {
  const out: Slot[] = [];
  for (const a of f.element?.abilities ?? []) {
    const s = slotOf(f, a.id);
    if (s && s !== 'click' && !out.includes(s)) out.push(s);
  }
  return out.length ? out : ['e', 'r', 'f', 'q'];
}

/** Stroke tables for the chalk letters, on a 0..1 box (x right, y down). */
const LETTERS: Record<Slot, [number, number, number, number][]> = {
  e: [[0.15, 0, 0.15, 1], [0.15, 0, 0.85, 0], [0.15, 0.5, 0.7, 0.5], [0.15, 1, 0.85, 1]],
  r: [[0.15, 0, 0.15, 1], [0.15, 0, 0.7, 0], [0.7, 0, 0.85, 0.15], [0.85, 0.15, 0.85, 0.35], [0.85, 0.35, 0.7, 0.5], [0.7, 0.5, 0.15, 0.5], [0.45, 0.5, 0.85, 1]],
  f: [[0.15, 0, 0.15, 1], [0.15, 0, 0.85, 0], [0.15, 0.5, 0.7, 0.5]],
  q: [[0.3, 0, 0.7, 0], [0.7, 0, 0.88, 0.25], [0.88, 0.25, 0.88, 0.7], [0.88, 0.7, 0.65, 0.95], [0.65, 0.95, 0.3, 0.95], [0.3, 0.95, 0.12, 0.7], [0.12, 0.7, 0.12, 0.25], [0.12, 0.25, 0.3, 0], [0.55, 0.65, 0.95, 1.08]],
  click: [[0.5, 0, 0.5, 0.35], [0.2, 0.25, 0.2, 0.8], [0.8, 0.25, 0.8, 0.8], [0.2, 0.25, 0.8, 0.25], [0.2, 0.8, 0.5, 1], [0.5, 1, 0.8, 0.8]],
};

/** Draw a key letter (E/R/F/Q, or a mouse for the click) centred on x,y, `h` tall. */
export function keyGlyph(g: G, slot: Slot, x: number, y: number, h: number, color: number, a = 1, w = 2): void {
  const s = h, x0 = x - s * 0.42, y0 = y - s / 2;
  g.lineStyle(w, color, a);
  for (const [ax, ay, bx, by] of LETTERS[slot]) g.lineBetween(x0 + ax * s * 0.84, y0 + ay * s, x0 + bx * s * 0.84, y0 + by * s);
}

/** A regular polygon's corners (a pentagram's points, a sigil's triangle). */
export function polygon(cx: number, cy: number, r: number, n: number, rot = -Math.PI / 2): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) { const a = rot + (i / n) * Math.PI * 2; out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }); }
  return out;
}

/** True when p lies inside triangle abc. */
export function inTriangle(px: number, py: number, a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): boolean {
  const s = (p1x: number, p1y: number, p2: { x: number; y: number }, p3: { x: number; y: number }) => (p1x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1y - p3.y);
  const d1 = s(px, py, a, b), d2 = s(px, py, b, c), d3 = s(px, py, c, a);
  const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}
