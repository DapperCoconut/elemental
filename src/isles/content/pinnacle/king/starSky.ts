import type { BossToolkit } from '../../../../boss/framework/BossToolkit';

/**
 * Act III's sky — the state every one of the Star's signatures shares: where the star sits, the
 * ring bands that are the floor of the fight, the two worlds that orbit him (and the shadows they
 * cast, which are the only shelter from the SUPERNOVA), the black hole's drag on the ring, and the
 * corona that burns anyone who stands against him.
 *
 * One `StarSky` per fight (keyed by toolkit), ticked by whichever signature updates first each
 * frame. It only moves while `tk.fighting && tk.phase === 2`; `reset()` drops every live thing
 * when the phase ends but keeps the worlds where they are, so his fall is painted over a sky that
 * does not jump.
 */

/** The star's seat: the centre of the arena (and of every orbit). */
export const CX = 480;
export const CY = 356;
/** The photosphere's radius — the body's hitbox (`look.torsoR`). */
export const STAR_R = 78;
/** The player is held out at this distance from the centre (the solid body + the player's radius). */
export const SOLID_R = 98;
/** Within this the corona burns. */
export const CORONA_R = 120;
/** The ring bands, inner → outer, as [inner, outer] radii. The last runs off every edge of the arena. */
export const BANDS: [number, number][] = [[120, 168], [168, 214], [214, 262], [262, 322], [322, 404], [404, 720]];
const PLAYER_R = 20;

/** One of the worlds that ride round him. */
export interface Planet {
  kind: 'ash' | 'crown';
  name: string;
  /** Orbit radius from the star's centre. */
  orbit: number;
  /** The world's own radius. */
  r: number;
  /** Idle angular speed, rad/s (the sign is its direction round the star). */
  omega: number;
  angle: number;
  /** Radians left of a racing lap (the Orrery); 0 when idle. */
  race: number;
  /** An alignment glide (the Supernova lines the worlds up where their shadows can be reached). */
  glide: { from: number; to: number; at: number; ms: number } | null;
  lastHit: number;
}

/** Where the two worlds start, and where they are drawn before the fight has ever ticked. */
export const DEFAULT_PLANETS: readonly Planet[] = [
  { kind: 'ash', name: 'Ashfall', orbit: 166, r: 19, omega: 0.21, angle: 0.7, race: 0, glide: null, lastHit: -1e9 },
  { kind: 'crown', name: 'the Crownworld', orbit: 252, r: 31, omega: -0.12, angle: 3.7, race: 0, glide: null, lastHit: -1e9 },
];

/** Racing-lap angular speed: one lap in 1.7 s. */
export const RACE_W = (Math.PI * 2) / 1.7;

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** A world's position now. */
export function planetPos(p: Planet): { x: number; y: number } {
  return { x: CX + Math.cos(p.angle) * p.orbit, y: CY + Math.sin(p.angle) * p.orbit };
}

/** Half-angle of the cone of shadow a world throws away from the star. */
export function shadowHalf(p: Planet, slack = 0): number {
  return Math.asin(Math.min(0.95, (p.r + slack) / p.orbit));
}

/** Is (x, y) in the shadow of world `p` (behind it, as seen from the star)? */
export function inShadowOf(p: Planet, x: number, y: number): boolean {
  const d = Math.hypot(x - CX, y - CY);
  if (d < p.orbit - p.r * 0.3) return false;
  return Math.abs(wrap(Math.atan2(y - CY, x - CX) - p.angle)) < shadowHalf(p, 4);
}

/**
 * The star's light reaches at most this far along `angle` before a world stops it
 * (`max` if nothing is in the way) — flares are cut off by planets, and so is the Supernova.
 */
export function lightReach(planets: readonly Planet[], angle: number, max: number): number {
  let reach = max;
  for (const p of planets) {
    if (Math.abs(wrap(angle - p.angle)) < shadowHalf(p) && p.orbit - p.r < reach) reach = p.orbit - p.r * 0.6;
  }
  return reach;
}

/** The shared state of the sky. See the file comment. */
export class StarSky {
  planets: Planet[] = DEFAULT_PLANETS.map((p) => ({ ...p }));
  /** The black hole's hold on the ring, for the backdrop: null, or where and how hard (0–1). */
  hole: { x: number; y: number; k: number } | null = null;
  /** 0–1 while the Supernova charges. */
  nova = 0;
  /** The star is spent (dim, open to harm) until this scene time. */
  spentUntil = 0;
  /** How many shell fragments have left his orbit (the Last of the Shell) — the decor hides them. */
  shardsOut = 0;
  /** Worlds hold still (the Supernova). */
  halt = false;
  private lastTick = -1;
  private burnAt = 0;

  constructor(private readonly tk: BossToolkit) {}

  /** True while Act III is being fought. */
  get live(): boolean { return this.tk.fighting && this.tk.phase === 2; }

  /** Advance the worlds and burn / bump the player. Safe to call from every signature each frame. */
  tick(time: number, dt: number): void {
    if (time === this.lastTick) return;
    this.lastTick = time;
    if (!this.live) return;
    RING_IN.k = 1;
    for (const p of this.planets) {
      if (p.glide) {
        const k = clamp((time - p.glide.at) / p.glide.ms, 0, 1);
        const e = k * k * (3 - 2 * k);
        p.angle = p.glide.from + (p.glide.to - p.glide.from) * e;
        if (k >= 1) p.glide = null;
      } else if (p.race > 0) {
        const step = Math.min(p.race, RACE_W * dt);
        p.race -= step;
        p.angle += Math.sign(p.omega) * step;
      } else if (!this.halt) {
        p.angle += p.omega * dt;
      }
      p.angle = wrap(p.angle);
    }
    const pl = this.tk.player;
    if (!pl.active || pl.hp <= 0) return;
    // A world in the way: shoved aside, and it hurts (more when it is racing).
    for (const p of this.planets) {
      const pp = planetPos(p);
      const d = Math.hypot(pl.x - pp.x, pl.y - pp.y);
      if (d < p.r + PLAYER_R) {
        const a = d > 0.01 ? Math.atan2(pl.y - pp.y, pl.x - pp.x) : p.angle;
        pl.x = clamp(pp.x + Math.cos(a) * (p.r + PLAYER_R + 4), 40, this.tk.W - 40);
        pl.y = clamp(pp.y + Math.sin(a) * (p.r + PLAYER_R + 4), 116, this.tk.H - 40);
        if (!this.halt && time > p.lastHit + 900) {
          p.lastHit = time;
          this.tk.hitPlayer(p.race > 0 ? 14 : 7, pl.x, pl.y);
          this.tk.sfx(p.race > 0 ? 'stone-slam' : 'rock-throw');
        }
      }
    }
    // The corona: the band just outside his surface burns.
    if (Math.hypot(pl.x - CX, pl.y - CY) < CORONA_R && time > this.burnAt) {
      this.burnAt = time + 700;
      this.tk.hitPlayer(3, pl.x, pl.y);
      this.tk.sfx('sizzle');
    }
  }

  /** Is (x, y) sheltered by any world? */
  inShadow(x: number, y: number): boolean { return this.planets.some((p) => inShadowOf(p, x, y)); }

  /** Send a world round one fast lap (the Orrery). */
  race(p: Planet): void { p.race = Math.PI * 2; }

  /**
   * Line the worlds up where their shadows fall on open ring: the larger to the side of `sideX`
   * (−1 west, +1 east), the smaller opposite, each a little off the horizontal.
   */
  align(time: number, ms: number, sideX: number): void {
    for (const p of this.planets) {
      const east = (p.kind === 'crown') === sideX > 0;
      const target = (east ? 0 : Math.PI) + (Math.random() - 0.5) * 0.6;
      p.race = 0;
      p.glide = { from: p.angle, to: p.angle + wrap(target - p.angle), at: time, ms };
    }
  }

  /** The phase is over: drop everything live, keep the worlds where they are. */
  reset(): void {
    for (const p of this.planets) { p.race = 0; p.glide = null; }
    this.hole = null;
    this.nova = 0;
    this.spentUntil = 0;
    this.shardsOut = 0;
    this.halt = false;
  }
}

const SKIES = new WeakMap<BossToolkit, StarSky>();
let ACTIVE: StarSky | null = null;

/** The sky of this fight (made on first ask). Making one also makes it the sky the backdrop draws. */
export function skyOf(tk: BossToolkit): StarSky {
  let s = SKIES.get(tk);
  if (!s) {
    s = new StarSky(tk);
    SKIES.set(tk, s);
    OUTRO.k = 0;
    RING_IN.k = 1;
  }
  ACTIVE = s;
  return s;
}

/** The sky the backdrop and decor read (null before any Act III fight has been set up). */
export function activeSky(): StarSky | null { return ACTIVE; }

/** How far the star has gone out (0–1) — the fall cinematic writes it, the rings dim by it. */
export const OUTRO = { k: 0 };
/** How far the rings have formed (0–1) — the entry cinematic writes it as space is revealed. */
export const RING_IN = { k: 1 };
