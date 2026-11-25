import type { Fighter } from '../../../../../../entities/Fighter';
import type { G } from '../../../../../art/IsleArt';
import { lit } from '../../../../../art/IsleArt';
import { GILT, GILT_DARK, GILT_LIT, SNOW, SNOW_LIT, SNOW_SHADE } from '../palette';
import { clamp } from '../util';

/**
 * Small shared parts for the Cathedral Court's Fallen Five: the ember-gold eye every Fallen wears,
 * the two sides' colours, a per-fighter motion tracker, and the HUD's "vellum slip" — a strip of
 * gilt-edged parchment with snow on its top edge, so the five counters read as leaves of the same
 * snowbound cathedral's books.
 */

/** Every Fallen's ember-gold eye. */
export const EYE = 0xffa040;
/** Your side's colour on floors and meters: cold window-blue. */
export const MINE = 0x7fb4ff;
/** The Fallen's side: ember-gold, like his eyes. */
export const FOE = 0xffa040;

/** What a motion tracker knows about one fighter this frame. */
export interface Motion {
  /** Smoothed velocity, px/s. */
  vx: number; vy: number;
  /** Smoothed speed, px/s. */
  speed: number;
  /** Smoothed heading (radians) and how fast it is turning (rad/s). */
  heading: number; turn: number;
  /** Seconds the fighter has stayed within a pixel or two of the same place. */
  still: number;
}

/**
 * Tracks every fighter's motion from its positions, frame to frame: a smoothed velocity, the
 * heading and its turn rate, and how long it has stood still. `step` once per frame per fighter
 * (before reading), `get` after. Smoothing is short (≈0.15 s), so a turn shows within a few frames.
 */
export function motionTracker(): { step(f: Fighter, dt: number): Motion; get(f: Fighter): Motion } {
  const last = new Map<Fighter, { x: number; y: number; m: Motion }>();
  const blank = (): Motion => ({ vx: 0, vy: 0, speed: 0, heading: 0, turn: 0, still: 0 });
  return {
    step(f, dt) {
      const s = last.get(f) ?? { x: f.x, y: f.y, m: blank() };
      if (dt > 0) {
        const k = clamp(dt / 0.15, 0, 1);
        const ivx = (f.x - s.x) / dt, ivy = (f.y - s.y) / dt;
        s.m.vx += (ivx - s.m.vx) * k;
        s.m.vy += (ivy - s.m.vy) * k;
        s.m.speed = Math.hypot(s.m.vx, s.m.vy);
        if (s.m.speed > 40) {
          const h = Math.atan2(s.m.vy, s.m.vx);
          const dh = Math.atan2(Math.sin(h - s.m.heading), Math.cos(h - s.m.heading));
          s.m.turn += (dh / dt - s.m.turn) * clamp(dt / 0.3, 0, 1);
          s.m.heading = h;
        } else {
          s.m.turn *= 1 - clamp(dt * 4, 0, 1);
        }
        const moved = Math.hypot(f.x - s.x, f.y - s.y);
        s.m.still = moved < 1.6 ? s.m.still + dt : 0;
      }
      s.x = f.x; s.y = f.y;
      last.set(f, s);
      return s.m;
    },
    get(f) { return last.get(f)?.m ?? blank(); },
  };
}

/**
 * The HUD plate: a vellum slip `w`×`h` centred on `x`, its top at `y` — gilt rule round the edge,
 * two gilt pins, and a lip of snow lying along the top as it does on every ledge of the summit.
 */
export function vellum(g: G, x: number, y: number, w: number, h: number): void {
  const x0 = x - w / 2;
  g.fillStyle(0x000000, 0.35); g.fillRect(x0 + 3, y + 3, w, h);
  g.fillStyle(0xe9dfc6, 0.96); g.fillRect(x0, y, w, h);
  g.fillStyle(0xf6eedb, 0.9); g.fillRect(x0 + 3, y + 3, w - 6, h - 6);
  g.lineStyle(1.6, GILT_DARK, 0.9); g.strokeRect(x0 + 1, y + 1, w - 2, h - 2);
  g.lineStyle(1, GILT, 0.8); g.strokeRect(x0 + 3.5, y + 3.5, w - 7, h - 7);
  for (const px of [x0 + 7, x0 + w - 7]) {
    g.fillStyle(GILT_DARK, 1); g.fillCircle(px, y + h / 2, 2.6);
    g.fillStyle(GILT_LIT, 1); g.fillCircle(px - 0.7, y + h / 2 - 0.7, 1.1);
  }
  // Snow on the top edge, lumpy, with a bright crest.
  g.fillStyle(SNOW_SHADE, 1);
  for (let k = 0; k <= w; k += 9) g.fillEllipse(x0 + k, y + 0.5, 12, 5 + ((k * 7) % 3));
  g.fillStyle(SNOW, 1);
  for (let k = 4; k <= w; k += 9) g.fillEllipse(x0 + k, y - 0.5, 10, 4);
  g.fillStyle(SNOW_LIT, 0.9); g.fillRect(x0 + 2, y - 2, w - 4, 1);
}

/** A small round side-badge for a meter row: a gilt ring holding the side's colour. */
export function sideBadge(g: G, x: number, y: number, col: number): void {
  g.fillStyle(GILT_DARK, 1); g.fillCircle(x, y, 5.5);
  g.fillStyle(col, 1); g.fillCircle(x, y, 4);
  g.fillStyle(lit(col, 0.5), 0.9); g.fillCircle(x - 1.3, y - 1.3, 1.4);
}
