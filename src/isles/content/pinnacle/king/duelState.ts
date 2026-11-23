import type { BossToolkit } from '../../../../boss/framework/BossToolkit';

/**
 * Act II — THE CRACKED MASK: the state the whole duel shares.
 *
 * The King's body in this act is not the rig: `duel.ts` drives where he stands, which way his
 * shield faces and what his sword is doing, and `duelArt.ts` paints him from it. Signatures
 * (one instance each per fight) read and write this one record; the painter only reads it.
 * Everything here is dropped by `resetDuel()` whenever the act ends.
 */

export const PLAYER_R = 20;
/** Hitbox radius of the King this act (`phase.bodyR`). */
export const BODY_R = 40;
/** Where his feet may go: inside the hall, off the HUD strip, clear of the throne's steps' top. */
export const FIELD = { x0: 72, x1: 888, y0: 150, y1: 568 };
/** Half-width of the shield's arc (rad): blows from in here are turned, shots reflected. */
export const GUARD_HALF = 1.1;
/** Half-width of the open back (rad, round the direction opposite the guard). */
export const BACK_HALF = 0.95;
/** Ground radius of the drawn guard fan. */
export const GUARD_FAN_R = 132;

/** What the sword is doing — the painter reads it for the arm and the blade. */
export type SwordPose =
  /** Held low and out to his right, point forward. */
  | 'rest'
  /** Drawn back for a cut — the blade at `swordA`, ready. */
  | 'cocked'
  /** Overhead, two hands or one: a chop or a decree coming. */
  | 'raised'
  /** Out along `swordA` at full reach: a lunge or the end of a chop. */
  | 'thrust'
  /** Point-down in the glass at `stuck`, and him wrenching at it. */
  | 'buried'
  /** Reversed and driven into the floor at his own feet (Fault Lines). */
  | 'plunge'
  /** Held across the body, flat, as a bar — the parry. */
  | 'guard';

/** A cut being drawn through the air: the painter sweeps the blade and leaves a crescent. */
export interface Swing { from: number; to: number; at: number; ms: number; r: number; spin?: boolean }

/** One piece of the broken Aegis, standing in the floor. */
export interface AegisShard { x: number; y: number; a: number; fromX: number; fromY: number; at: number; size: number }

export interface Duel {
  /** Set on the first fighting frame of this act; cleared by `resetDuel`. */
  live: boolean;
  /** Scene ms the painter last drew this act — the phase check that survives a resumed fight. */
  seenAt: number;
  /** Within this act's pool, from the painter's body state. */
  hpRatio: number;
  x: number;
  y: number;
  /** A move owns the body this beat: the footwork stands down. */
  drive: boolean;
  /** Where the shield (or, after it breaks, the blade) faces. Turns slower than you can circle. */
  guardA: number;
  /** A committed move slows the turn (<1); the parry speeds it (>1). */
  turnMult: number;
  shield: 'arm' | 'thrown' | 'gone';
  shattered: boolean;
  shatterAt: number;
  /** Reeling after the shield breaks. */
  staggerUntil: number;
  /** The sword is in the glass: no guard, no turn, open from every side. */
  stuckUntil: number;
  stuckX: number;
  stuckY: number;
  swordA: number;
  pose: SwordPose;
  swing: Swing | null;
  /** 0–1: knees bent (a lunge gathering, a leap loading, the rise from the throne). */
  crouch: number;
  /** 0–1: height of a leap. */
  air: number;
  /** 0–1: the parry stance's glow. */
  braced: number;
  /** 0–1: the crown's flare as he commands KNEEL. */
  crownFlare: number;
  /** Walk cycle, px travelled. */
  walk: number;
  /** Last blow the shield turned (for the spark) and where. */
  blockAt: number;
  blockX: number;
  blockY: number;
  /** Last blow that went in through the open back. */
  backAt: number;
  /** The Aegis's pieces in the floor, once it breaks. */
  shards: AegisShard[];
  /** Sparse on-screen words, throttled. */
  saidTurnedAt: number;
  saidOpenAt: number;
}

const fresh = (): Duel => ({
  live: false, seenAt: -1e9, hpRatio: 1, x: 480, y: 320, drive: false, guardA: Math.PI / 2, turnMult: 1,
  shield: 'arm', shattered: false, shatterAt: 0, staggerUntil: 0, stuckUntil: 0, stuckX: 0, stuckY: 0,
  swordA: Math.PI / 2 + 0.6, pose: 'rest', swing: null, crouch: 0, air: 0, braced: 0, crownFlare: 0, walk: 0,
  blockAt: -1e9, blockX: 0, blockY: 0, backAt: -1e9, shards: [], saidTurnedAt: -1e9, saidOpenAt: -1e9,
});

/** The one live record. */
export const DS: Duel = fresh();

/** Drop everything — the act is over (or has not begun). */
export function resetDuel(): void { Object.assign(DS, fresh()); }

// ── Geometry ─────────────────────────────────────────────────────────

export interface Pt { x: number; y: number }

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
export const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
export const clampN = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
export const easeOut = (v: number): number => 1 - (1 - clampN(v, 0, 1)) ** 3;
export const smooth = (v: number): number => { const k = clampN(v, 0, 1); return k * k * (3 - 2 * k); };
export const segDist = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : clampN(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
};
/** Turn `a` toward `b` by at most `step` rad. */
export const turnToward = (a: number, b: number, step: number): number => {
  const d = wrap(b - a);
  return Math.abs(d) <= step ? b : a + Math.sign(d) * step;
};
/** A point in the wedge (origin, facing `a`, half-angle `half`, reach `r`), padded by the player's radius. */
export const inWedge = (px: number, py: number, ox: number, oy: number, a: number, half: number, r: number, pad = PLAYER_R): boolean => {
  const d = dist(px, py, ox, oy);
  if (d > r + pad) return false;
  if (d < pad + 8) return true;
  return Math.abs(wrap(Math.atan2(py - oy, px - ox) - a)) <= half + Math.atan2(pad, d);
};

/** Keep a point on the floor he can stand on. */
export const fieldX = (x: number): number => clampN(x, FIELD.x0, FIELD.x1);
export const fieldY = (y: number): number => clampN(y, FIELD.y0, FIELD.y1);

// ── Toolkit glue ─────────────────────────────────────────────────────

/** True while this act is being fought (resume-safe: the painter's stamp backs up `tk.phase`). */
export const live = (tk: BossToolkit): boolean => tk.fighting && (tk.phase === 1 || tk.now - DS.seenAt < 300);

/** Where he stands now. */
export const at = (tk: BossToolkit): Pt => (DS.live ? { x: DS.x, y: DS.y } : { x: tk.bossX, y: tk.bossY });

/** Put the body somewhere (the footwork, a lunge, a landing) — clamped to the hall. */
export const place = (tk: BossToolkit, x: number, y: number): void => {
  DS.x = fieldX(x);
  DS.y = fieldY(y);
  tk.host.setBossPos(DS.x, DS.y);
};

/** A word over something, sparingly. */
export const float = (tk: BossToolkit, x: number, y: number, text: string, color: string): void =>
  tk.host.showFloatingText(x, y, text, color);

/** Start a cut through the air — the painter sweeps the blade from `from` to `to`. */
export const swing = (tk: BossToolkit, from: number, to: number, ms: number, r: number, spin = false): void => {
  DS.swing = { from, to, at: tk.now, ms, r, spin };
  DS.swordA = to;
};

/** Shake the hall. */
export const shake = (tk: BossToolkit, ms: number, amt: number): void => { tk.scene.cameras.main.shake(ms, amt); };

/** The point `d` along a polyline (and the index of the segment it is on). */
export function along(pts: Pt[], cum: number[], d: number): Pt {
  if (d <= 0) return pts[0];
  for (let i = 1; i < pts.length; i++) {
    if (cum[i] >= d) {
      const k = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k };
    }
  }
  return pts[pts.length - 1];
}

/** Running lengths of a polyline (cum[0] = 0). */
export function lengths(pts: Pt[]): number[] {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i].x, pts[i].y, pts[i - 1].x, pts[i - 1].y));
  return cum;
}
