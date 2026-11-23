import type { BossToolkit } from '../../../../boss/framework/BossToolkit';

/**
 * Act IV — THE FALLEN KING: the state the whole act shares.
 *
 * He is not the rig. `fallen.ts`'s footwork decides where he stands and which way he looks,
 * the signatures take the body when they need it (a leap, a dash, a sundial he stands at the
 * heart of), and `fallenArt.ts` paints him from this one record. `cite` is which of the ten
 * laws he is reading from — the floor and his book both light in that isle's colours.
 * Everything here is dropped by `resetFallen()` when the act ends.
 */

export interface Pt { x: number; y: number }

export const PLAYER_R = 20;
/** His hitbox this act (`phase.bodyR`) — a man, the player's own size and a little more. */
export const BODY_R = 26;
/** Where his feet may go: the whole dream floor, clear of the HUD strip. */
export const FIELD = { x0: 64, x1: 896, y0: 136, y1: 584 };
/** The act's phase index (the hard extra phase, after the star's three). */
export const FALLEN_PHASE = 3;

/** What his hands are doing — the painter reads it. */
export type FallenPose =
  /** The book shut under one arm, the other hand loose. */
  | 'rest'
  /** The book open on one palm, the other hand raised to read the law out. */
  | 'cite'
  /** Both arms drawn in, chest swelled (the Breath-Tax). */
  | 'inhale'
  /** Gavel raised overhead, in the air. */
  | 'gavel'
  /** Bent over the gavel where it struck — open to blows. */
  | 'struck'
  /** Low and forward, robe streaming — a cross-examination dash. */
  | 'dash'
  /** Standing very straight with the book held up over his head: the gnomon of the Noon. */
  | 'gnomon';

export interface Fallen {
  /** Set on the first fighting frame of the act; cleared by `resetFallen`. */
  live: boolean;
  /** Scene ms the painter last drew this act. */
  seenAt: number;
  /** Within this act's pool, from the painter's body state. */
  hpRatio: number;
  x: number;
  y: number;
  /** Where he looks (rad). */
  face: number;
  /** A signature owns the body: the footwork stands down. */
  drive: boolean;
  pose: FallenPose;
  /** Law being cited (0–9, `LAWS` order), or -1. */
  cite: number;
  citeAt: number;
  /** 0–1 off the floor (leaps). */
  air: number;
  /** Distance walked, for the hem's sway. */
  walk: number;
  /** Strafe sense of the footwork (+1 / -1) and when it next turns. */
  strafe: number;
  strafeFlipAt: number;
  /** Last sidestep (he slips one shot in a while). */
  slipAt: number;
  /** Ash afterimages from dashes and slips: where and when. */
  trail: { x: number; y: number; at: number; face: number }[];
  /** Until when he is open (bent over the gavel, off-balance after a dash). */
  openUntil: number;
  /** Which hp marks he has already spoken at. */
  said: number;
}

const fresh = (): Fallen => ({
  live: false, seenAt: -1e9, hpRatio: 1, x: 480, y: 330, face: Math.PI / 2, drive: false, pose: 'rest',
  cite: -1, citeAt: -1e9, air: 0, walk: 0, strafe: 1, strafeFlipAt: 0, slipAt: -1e9, trail: [], openUntil: -1e9, said: 0,
});

/** The one live record. */
export const FS: Fallen = fresh();

/** Drop everything (the act ended, or a fight restarted). */
export function resetFallen(): void { Object.assign(FS, fresh()); }

// ── Maths ────────────────────────────────────────────────────────────

export const clampN = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
export const smooth = (v: number): number => { const k = clampN(v, 0, 1); return k * k * (3 - 2 * k); };
export const wrap = (a: number): number => { let v = a; while (v > Math.PI) v -= Math.PI * 2; while (v < -Math.PI) v += Math.PI * 2; return v; };
export const fieldX = (x: number): number => clampN(x, FIELD.x0, FIELD.x1);
export const fieldY = (y: number): number => clampN(y, FIELD.y0, FIELD.y1);

/** Distance from a point to the segment a–b. */
export function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const L = dx * dx + dy * dy;
  const k = L > 0 ? clampN(((px - ax) * dx + (py - ay) * dy) / L, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * k), py - (ay + dy * k));
}

/** Turn `a` toward `b` by at most `step`. */
export function turnToward(a: number, b: number, step: number): number {
  const d = wrap(b - a);
  return Math.abs(d) <= step ? b : a + Math.sign(d) * step;
}

/** Where a ray from `o` along `a` leaves the field (clamped to `most`). */
export function rayEnd(o: Pt, a: number, most = 1200): Pt {
  let L = most;
  const ca = Math.cos(a), sa = Math.sin(a);
  if (ca > 1e-6) L = Math.min(L, (FIELD.x1 + 40 - o.x) / ca);
  if (ca < -1e-6) L = Math.min(L, (FIELD.x0 - 40 - o.x) / ca);
  if (sa > 1e-6) L = Math.min(L, (FIELD.y1 + 40 - o.y) / sa);
  if (sa < -1e-6) L = Math.min(L, (FIELD.y0 - 40 - o.y) / sa);
  return { x: o.x + ca * Math.max(0, L), y: o.y + sa * Math.max(0, L) };
}

// ── Toolkit glue ─────────────────────────────────────────────────────

/** True while this act is being fought (resume-safe: the painter's stamp backs up `tk.phase`). */
export const live = (tk: BossToolkit): boolean => tk.fighting && (tk.phase === FALLEN_PHASE || tk.now - FS.seenAt < 300);

/** Where he stands now. */
export const at = (tk: BossToolkit): Pt => (FS.live ? { x: FS.x, y: FS.y } : { x: tk.bossX, y: tk.bossY });

/** Put the body somewhere — clamped to the floor. */
export function place(tk: BossToolkit, x: number, y: number): void {
  FS.x = fieldX(x);
  FS.y = fieldY(y);
  tk.host.setBossPos(FS.x, FS.y);
}

/** A word over something — his voice, sparingly. */
export const say = (tk: BossToolkit, x: number, y: number, text: string, color = '#ffd9a0'): void =>
  tk.host.showFloatingText(x, y, text, color);

/** Shake the dream. */
export const shake = (tk: BossToolkit, ms: number, amt: number): void => { tk.scene.cameras.main.shake(ms, amt); };

/** Open the book on a law: the floor and the page light in its isle's colours. */
export function cite(tk: BossToolkit, law: number): void {
  FS.cite = law; FS.citeAt = tk.now; FS.pose = 'cite';
}

/** A blow that lands on the player if they are still standing. */
export function strike(tk: BossToolkit, dmg: number): void {
  const p = tk.player;
  if (p.active) tk.hitPlayer(dmg, p.x, p.y);
}

/** End a move's hold on the body. */
export function release(): void { FS.drive = false; FS.pose = 'rest'; FS.air = 0; }
