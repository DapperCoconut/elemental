import type Phaser from 'phaser';
import type { BossToolkit } from '../../../../boss/framework/BossToolkit';
import type { Husk } from '../../../../invasion/Husk';

/**
 * Act I of the Obsidian King — THE THRONE — shared state.
 *
 * The King never leaves his chair in this act. Everything that moves is the Host (warriors,
 * assassins, beasts) and everything he does from the chair is a signature; both read and write
 * one `Court` per fight so the Aegis, the waves and his gestures stay one story. The Court is
 * keyed by the fight's toolkit (every signature of one fight shares it) and the latest one is
 * also kept as `liveCourt()` for the draw hooks, which are handed no toolkit.
 */

export type Gfx = Phaser.GameObjects.Graphics;
export interface Pt { x: number; y: number }

/** The body's post — the King, seated. */
export const SEAT: Pt = { x: 480, y: 170 };
/** The foot of the throne on the dais (where `throne()` stands) and its scale. */
export const THRONE_FOOT: Pt = { x: 480, y: 214 };
export const THRONE_S = 0.8;
/** The Aegis: a hemisphere of black glass over the throne. Base ring centre, radii, height. */
export const AEGIS = { x: 480, y: 222, rx: 146, ry: 34, up: 150 };
/** Where the Host may stand: the hall below the back wall. */
export const HALL = { l: 72, r: 888, t: 208, b: 606 };
/** Top of the floor the King's edicts and cracks run over. */
export const DAIS_Y = 218;
export const PLAYER_R = 20;

export type Kind = 'warrior' | 'assassin' | 'beast';
export type SState =
  | 'march' | 'bash'
  | 'stalk' | 'vanish' | 'gone' | 'mark' | 'stab' | 'spent'
  | 'prowl' | 'aim' | 'charge' | 'skid';

/** One of the Host on the field: a real, hittable husk with a body we draw and a mind we run. */
export interface Soldier {
  id: number;
  kind: Kind;
  husk: Husk;
  /** Facing, radians — the warrior's shield, the beast's muzzle, the assassin's blade. */
  face: number;
  st: SState;
  stAt: number;
  stUntil: number;
  /** Formation slot (warriors) / orbit direction (assassins, ±1). */
  slot: number;
  /** Stride clock, advanced by distance walked. */
  walk: number;
  /** A locked point and angle: the assassin's reappearance, the beast's lane origin. */
  ax: number; ay: number; aa: number;
  /** Lane end / stab start. */
  tx: number; ty: number;
  hit: boolean;
  /** Ids of the Host a charging beast has already trampled this charge. */
  trampled: number[];
  nextAct: number;
  hurtAt: number;
  lastHp: number;
  /** Distance since the last shed shard (beasts). */
  shed: number;
  /** True while a skid ended in a wall. */
  walled: boolean;
  born: number;
}

/** Something that broke: drawn as a burst of glass for a moment. */
export interface Wreck { x: number; y: number; kind: Kind; at: number; face: number }
/** A door the Host steps out of. */
export interface Door { x: number; y: number; side: 'back' | 'left' | 'right' }
/** A soldier on their way out of a door. */
export interface Pending { door: Door; kind: Kind; from: number; at: number; slot: number }
/** Glass the beasts shed — caltrops on the floor. */
export interface GlassShard { x: number; y: number; at: number; a: number }

export type Stage = 'idle' | 'muster' | 'battle' | 'cracked' | 'mending';
export type GestureKind = 'point' | 'gavel' | 'raise' | 'sweep';

export interface Court {
  stage: Stage;
  stageAt: number;
  /** The wave on the field, counted from 0 (0–3 the first round, 4–7 the harder repeat, …). */
  wave: number;
  crackUntil: number;
  crackSeed: number;
  soldiers: Soldier[];
  pending: Pending[];
  wrecks: Wreck[];
  shards: GlassShard[];
  /** Blows turned by the Aegis — ripples on the dome (dome-space angle). */
  ripples: { a: number; at: number; gold: boolean }[];
  /** Shots turned by a warrior's shield. */
  sparks: { x: number; y: number; at: number }[];
  gesture: { kind: GestureKind; at: number; until: number; aim: number } | null;
  /** The Accusing Hand: the Host is set on the player until this time. */
  markUntil: number;
  /** The player's smoothed velocity (px/s) — "behind you" for the knives. */
  pvx: number; pvy: number; plx: number; ply: number;
  nextId: number;
  lastShardHitAt: number;
  lastBlockSfxAt: number;
  lastRippleAt: number;
  started: boolean;
}

const COURTS = new WeakMap<BossToolkit, Court>();
let live: Court | null = null;

/** The entry cinematic's progress, for the Aegis rising in `drawDecor` (1 once the fight is on). */
export const stagecraft = { entryP: 0 };

/** This fight's Court (made on first ask). */
export function courtOf(tk: BossToolkit): Court {
  let c = COURTS.get(tk);
  if (!c) {
    c = {
      stage: 'idle', stageAt: 0, wave: 0, crackUntil: 0, crackSeed: 1,
      soldiers: [], pending: [], wrecks: [], shards: [], ripples: [], sparks: [],
      gesture: null, markUntil: 0, pvx: 0, pvy: 0, plx: tk.player?.x ?? 480, ply: tk.player?.y ?? 480,
      nextId: 1, lastShardHitAt: 0, lastBlockSfxAt: 0, lastRippleAt: 0, started: false,
    };
    COURTS.set(tk, c);
  }
  live = c;
  return c;
}

/** The Court of the fight on screen, for draw hooks that get no toolkit. */
export function liveCourt(): Court | null { return live; }

/** True while the Aegis holds (everything but the cracked window). */
export const aegisHeld = (c: Court | null): boolean => !c || c.stage !== 'cracked';

/** Set what the King's right hand is doing (drawn by `drawKing`). */
export function gesture(tk: BossToolkit, kind: GestureKind, ms: number, aim = Math.PI / 2): void {
  const c = courtOf(tk);
  c.gesture = { kind, at: tk.now, until: tk.now + ms, aim };
}

// ── Small maths ──────────────────────────────────────────────────────

export const clampN = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
export const wrapA = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
export const ease = (v: number): number => { const k = clampN(v, 0, 1); return k * k * (3 - 2 * k); };
/** Turn `from` toward `to` by at most `step` radians. */
export const turnTo = (from: number, to: number, step: number): number => {
  const d = wrapA(to - from);
  return Math.abs(d) <= step ? to : from + Math.sign(d) * step;
};
/** Distance from p to the segment a–b. */
export const segDist = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : clampN(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
};
/** Where a ray from (x, y) along `a` leaves the rect, and how far that is. */
export const rayToEdge = (x: number, y: number, a: number, l: number, t: number, r: number, b: number): { x: number; y: number; d: number } => {
  const c = Math.cos(a), s = Math.sin(a);
  let d = 2000;
  if (c > 1e-4) d = Math.min(d, (r - x) / c);
  if (c < -1e-4) d = Math.min(d, (l - x) / c);
  if (s > 1e-4) d = Math.min(d, (b - y) / s);
  if (s < -1e-4) d = Math.min(d, (t - y) / s);
  d = Math.max(0, d);
  return { x: x + c * d, y: y + s * d, d };
};

/** A filled polygon through plain points. */
export function poly(g: Gfx, pts: Pt[], color: number, alpha: number): void {
  if (pts.length < 3) return;
  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
}

/** A stroked open / closed polyline. */
export function line(g: Gfx, pts: Pt[], w: number, color: number, alpha: number, close = false): void {
  if (pts.length < 2) return;
  g.lineStyle(w, color, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  if (close) g.closePath();
  g.strokePath();
}

/** Rotate a local offset (forward `f`, side `s`) about (x, y) facing `a`. */
export const at = (x: number, y: number, a: number, f: number, s: number): Pt =>
  ({ x: x + Math.cos(a) * f - Math.sin(a) * s, y: y + Math.sin(a) * f + Math.cos(a) * s });

/**
 * A wave's name across the hall — large, violet, under the boss bar's own banners — with an
 * optional line of instruction beneath it the first time that kind of wave is seen.
 */
export function hallBanner(tk: BossToolkit, title: string, sub: string | null, color = '#c9b0ff'): void {
  const s = tk.scene;
  const make = (y: number, text: string, size: number, col: string, hold: number) => {
    const t = s.add.text(tk.W / 2, y, text, {
      fontSize: `${size}px`, fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: col, stroke: '#07060d', strokeThickness: size > 20 ? 7 : 5, letterSpacing: size > 20 ? 6 : 1,
    }).setOrigin(0.5).setDepth(27).setAlpha(0);
    s.tweens.add({ targets: t, alpha: 1, duration: 260 });
    s.tweens.add({ targets: t, alpha: 0, scaleX: 1.12, scaleY: 1.12, delay: hold, duration: 650, onComplete: () => t.destroy() });
  };
  make(322, title, 34, color, 1700);
  if (sub) make(360, sub, 15, '#e6dcff', 2100);
}
