import Phaser from 'phaser';
import { FxBase, TAU, easeOut } from '../ElementVisuals';

/**
 * Everything the Rocket skin (Tempest) draws in place of the storm's wind.
 *
 * Tempest's whole visual kit is one material — moving air — so the skin swaps that one
 * material: every gust becomes a **flame jet** (a flickering tongue of fire, hot at the root,
 * a puff of smoke past its tip), the drifting currents become **launch pads** (a steel plate
 * ringed in hazard stripes, burners firing up out of the grate), fronts become hazard-striped
 * burner lanes, and Gale Burst flies as a little missile. Shapes and footprints match the wind
 * art they replace one for one, so nothing reads differently at gameplay zoom.
 *
 * Deliberately imports nothing from `TempestVisuals`: that file calls in here from its shared
 * primitives, and a module cycle with a palette read at load time would hit the TDZ. The
 * colours below are final — a skin's palette is already the one on screen.
 */

export const ROCKET = {
  /** The EVA suit. */
  suit: 0xeef1f4,
  suitShade: 0xb9c1cb,
  suitDeep: 0x7f8996,
  suitLine: 0x4f5763,
  /** Helmet visor — dark glass with a gold film. */
  visor: 0x15100c,
  visorGold: 0xc98a2a,
  visorGlint: 0xfff2c8,
  /** Jetpack, pad and nozzle metal. */
  steel: 0x8c96a3,
  steelDark: 0x3e454e,
  steelLit: 0xd5dbe2,
  /** Rocket hull red. */
  hull: 0xd8361c,
  hullShade: 0x8f1f10,
  hullLit: 0xff6a3d,
  /** Hazard stripes. */
  hazard: 0xffc21a,
  hazardDark: 0x1c1a18,
  /** Fire, darkest to white-hot. */
  flameDeep: 0xc2280e,
  flame: 0xff6a1a,
  flameMid: 0xffa23a,
  flameHot: 0xffe08a,
  flameCore: 0xfffbe6,
  /** Exhaust smoke. */
  smoke: 0x8a8580,
  smokeDark: 0x4f4a46,
  smokeLit: 0xc9c3bc,
  ember: 0xffcf5a,
  /** Status lights. */
  go: 0x48ff7a,
  stop: 0xff3a2a,
  scorch: 0x0a0605,
};

/** Deterministic 0–1 noise (same recipe as Tempest's `jitter`, kept local — see the file note). */
function noise(seed: number, i: number): number {
  const v = Math.sin(seed * 47.3 + i * 91.7) * 18733.517;
  return v - Math.floor(v);
}

function P(x: number, y: number): Phaser.Geom.Point { return new Phaser.Geom.Point(x, y); }

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * One tongue of fire from `(x, y)` along `ang`: a rounded root, the widest point just past it,
 * then a flickering taper to a point. Built point-by-point — stacked circles would read as a
 * string of beads, and fire has to read as one licking shape.
 */
export function flameTongue(
  g: Phaser.GameObjects.Graphics,
  color: number,
  x: number, y: number, ang: number, len: number, halfW: number, alpha: number,
  t: number, seed = 0,
): void {
  if (len < 1 || halfW < 0.3 || alpha <= 0.004) return;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const N = 12;
  const left: Phaser.Geom.Point[] = [];
  const right: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const w = halfW * (u < 0.22 ? 0.78 + (u / 0.22) * 0.22 : Math.pow(1 - (u - 0.22) / 0.78, 0.8));
    // The whole tongue licks side to side more toward its tip, and each edge flickers on its own.
    const v = Math.sin(u * 5.2 + t * 13 + seed) * halfW * 0.34 * u;
    const fl = Math.sin(u * 11 + t * 21 + seed * 1.7) * halfW * 0.2 * u;
    const fr = Math.sin(u * 9.5 - t * 19 + seed * 2.3) * halfW * 0.2 * u;
    const px = x + ca * u * len;
    const py = y + sa * u * len;
    left.push(P(px - sa * (v - w - fl), py + ca * (v - w - fl)));
    right.push(P(px - sa * (v + w + fr), py + ca * (v + w + fr)));
  }
  g.fillStyle(color, alpha);
  g.fillPoints(left.concat(right.reverse()), true);
  g.fillCircle(x, y, halfW * 0.78);
}

/**
 * The Rocket's stand-in for Tempest's `gustLayered`: a flame jet in four shells — deep red,
 * orange, amber, a white-hot core at the root — with a smoke puff and an ember past the tip.
 * Same arguments, same footprint, so every gust in the kit can be swapped in place.
 */
export function rocketFlame(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, ang: number, len: number, halfW: number, alpha: number,
  { phase = 0, seed = 0, hot = 0 }: { phase?: number; seed?: number; curl?: number; hot?: number } = {},
): void {
  const t = phase * 0.12;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  // Smoke first, so the fire burns in front of it.
  const sk = 1.02 + noise(seed, 3) * 0.12;
  g.fillStyle(ROCKET.smokeDark, alpha * 0.18);
  g.fillCircle(x + ca * len * sk, y + sa * len * sk, halfW * 1.25);
  g.fillStyle(ROCKET.smoke, alpha * 0.16);
  g.fillCircle(x + ca * len * sk - sa * halfW * 0.6, y + sa * len * sk + ca * halfW * 0.6, halfW * 0.85);

  flameTongue(g, ROCKET.flameDeep, x, y, ang, len, halfW * 1.45, alpha * 0.34, t, seed);
  flameTongue(g, ROCKET.flame, x, y, ang, len * 0.92, halfW * 0.98, alpha * 0.82, t, seed + 1.3);
  flameTongue(g, ROCKET.flameMid, x, y, ang, len * 0.68, halfW * 0.64, alpha * 0.9, t, seed + 2.6);
  flameTongue(g, hot > 0 ? ROCKET.flameCore : ROCKET.flameHot, x, y, ang, len * 0.42, halfW * 0.34, alpha * 0.95, t, seed + 3.9);

  // A spark thrown off the tip.
  const k = (t * 3 + noise(seed, 5)) % 1;
  const ex = x + ca * len * (0.7 + k * 0.5) - sa * (noise(seed, 6) - 0.5) * halfW * 3;
  const ey = y + sa * len * (0.7 + k * 0.5) + ca * (noise(seed, 6) - 0.5) * halfW * 3;
  g.fillStyle(ROCKET.ember, alpha * (1 - k) * 0.9);
  g.fillCircle(ex, ey, 1.1 + halfW * 0.12);
}

/** A billow of exhaust smoke: a lit cap over a dark base, so it reads as a lump, not a disc. */
export function smokePuff(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, alpha: number): void {
  if (alpha <= 0.004 || r < 0.5) return;
  g.fillStyle(ROCKET.smokeDark, alpha * 0.7);
  g.fillCircle(x + r * 0.15, y + r * 0.2, r);
  g.fillStyle(ROCKET.smoke, alpha * 0.85);
  g.fillCircle(x, y, r * 0.88);
  g.fillStyle(ROCKET.smokeLit, alpha * 0.55);
  g.fillCircle(x - r * 0.3, y - r * 0.32, r * 0.48);
}

/** Alternating yellow/black blocks round an elliptical band — the hazard ring of a pad. */
function hazardRing(
  g: Phaser.GameObjects.Graphics, x: number, y: number, rx: number, ry: number, r0: number, r1: number,
  n: number, alpha: number, spin = 0,
): void {
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU + spin;
    const a1 = ((i + 1) / n) * TAU + spin;
    const skew = 0.18;
    g.fillStyle(i % 2 === 0 ? ROCKET.hazard : ROCKET.hazardDark, alpha);
    g.fillPoints([
      P(x + Math.cos(a0) * rx * r0, y + Math.sin(a0) * ry * r0),
      P(x + Math.cos(a0 + skew) * rx * r1, y + Math.sin(a0 + skew) * ry * r1),
      P(x + Math.cos(a1 + skew) * rx * r1, y + Math.sin(a1 + skew) * ry * r1),
      P(x + Math.cos(a1) * rx * r0, y + Math.sin(a1) * ry * r0),
    ], true);
  }
}

/**
 * A launch pad, standing in for Tempest's drifting current at the same footprint
 * (`r * 2.2 × r * 1.3`): a scorched octagonal steel plate, a hazard-striped ring, a grate deck,
 * three burners firing up out of it on a pulse, smoke and embers lifting off, and four rim
 * lights blinking go/stop. Riding it (F) is the lift-off.
 */
export function launchPad(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, r: number, alpha: number,
  { t = 0, seed = 0, life = 1 } = {},
): void {
  if (r < 1) return;
  const rx = r * 1.1;
  const ry = r * 0.65;
  // Scorch and heat on the floor around it.
  g.fillStyle(ROCKET.scorch, alpha * 0.32);
  g.fillEllipse(x, y + 2, rx * 2.35, ry * 2.35);
  g.fillStyle(ROCKET.flame, alpha * 0.1 * (0.7 + 0.3 * Math.sin(t * 5 + seed)));
  g.fillEllipse(x, y, rx * 2.6, ry * 2.6);

  // The plate: an octagon in perspective, dark rim with a lit near edge.
  const oct = (k: number, dy = 0) => Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * TAU + TAU / 16;
    return P(x + Math.cos(a) * rx * k, y + dy + Math.sin(a) * ry * k);
  });
  g.fillStyle(ROCKET.steelDark, alpha);
  g.fillPoints(oct(1.02, 3), true);
  g.fillStyle(ROCKET.steel, alpha);
  g.fillPoints(oct(1), true);
  g.lineStyle(1.4, ROCKET.steelLit, alpha * 0.7);
  g.strokePoints(oct(1), true);

  hazardRing(g, x, y, rx, ry, 0.7, 0.92, 16, alpha);

  // Grate deck.
  g.fillStyle(ROCKET.steelDark, alpha);
  g.fillEllipse(x, y, rx * 1.36, ry * 1.36);
  g.lineStyle(1, ROCKET.scorch, alpha * 0.7);
  for (let i = -3; i <= 3; i++) {
    const fx = i / 3.6;
    const half = Math.sqrt(Math.max(0, 1 - fx * fx)) * ry * 0.64;
    g.lineBetween(x + fx * rx * 0.66, y - half, x + fx * rx * 0.66, y + half);
  }
  g.lineStyle(1, ROCKET.steel, alpha * 0.4);
  g.strokeEllipse(x, y, rx * 1.36, ry * 1.36);
  // Glow welling up through the grate.
  g.fillStyle(ROCKET.flame, alpha * 0.28 * (0.6 + 0.4 * Math.sin(t * 7 + seed)));
  g.fillEllipse(x, y, rx * 0.9, ry * 0.9);

  // Burners: three nozzles, each firing up on its own pulse.
  for (let i = 0; i < 3; i++) {
    const nx = x + (i - 1) * rx * 0.36;
    const ny = y + (i === 1 ? -ry * 0.12 : ry * 0.08);
    g.fillStyle(ROCKET.scorch, alpha);
    g.fillEllipse(nx, ny, 9, 4.5);
    g.lineStyle(1, ROCKET.steelLit, alpha * 0.6);
    g.strokeEllipse(nx, ny, 9, 4.5);
    const pulse = 0.5 + 0.5 * Math.sin(t * 6.5 + i * 2.1 + seed);
    const len = (14 + pulse * 22) * (0.55 + life * 0.45);
    flameTongue(g, ROCKET.flame, nx, ny, -Math.PI / 2, len, 4.4, alpha * 0.75, t, seed + i);
    flameTongue(g, ROCKET.flameMid, nx, ny, -Math.PI / 2, len * 0.66, 2.9, alpha * 0.85, t, seed + i + 1.1);
    flameTongue(g, ROCKET.flameCore, nx, ny, -Math.PI / 2, len * 0.32, 1.5, alpha * 0.95, t, seed + i + 2.2);
  }

  // Rim lights, alternating go/stop.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + TAU / 8;
    const lx = x + Math.cos(a) * rx * 0.98;
    const ly = y + Math.sin(a) * ry * 0.98;
    const on = Math.floor(t * 2.4 + i) % 2 === 0;
    const c = i % 2 === 0 ? ROCKET.go : ROCKET.stop;
    if (on) {
      g.fillStyle(c, alpha * 0.3);
      g.fillCircle(lx, ly, 5);
    }
    g.fillStyle(on ? c : ROCKET.steelDark, alpha);
    g.fillCircle(lx, ly, 2.2);
  }

  // Smoke and embers lifting off (where the current's chevrons climbed).
  for (let i = 0; i < 4; i++) {
    const k = (t * 0.6 + i / 4 + noise(seed, i) * 0.2) % 1;
    const cx = x + (noise(seed, i + 4) - 0.5) * r * 0.9 + Math.sin(t * 2 + i) * 4;
    smokePuff(g, cx, y - 14 - k * 50, 4 + k * 7, alpha * (1 - k) * 0.55 * life);
    g.fillStyle(ROCKET.ember, alpha * (1 - k) * life);
    g.fillCircle(cx + (noise(seed, i + 9) - 0.5) * 14, y - 8 - k * 62, 1.4);
  }
}

/**
 * The bed of a front for the Rocket: a heat-shimmering steel lane with hazard stripes down both
 * long edges and a row of burner nozzles along the near edge. Tempest's marching gusts (already
 * flames for this skin) and arrowheads are drawn over it by `frontLane`.
 */
export function rocketLaneBed(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, ang: number, len: number, halfW: number, alpha: number, t = 0,
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const at = (u: number, v: number) => P(x + ca * u - sa * v, y + sa * u + ca * v);
  g.fillStyle(ROCKET.steelDark, alpha * 0.32);
  g.fillPoints([at(0, -halfW), at(len, -halfW), at(len, halfW), at(0, halfW)], true);
  g.fillStyle(ROCKET.flame, alpha * (0.1 + 0.04 * Math.sin(t * 6)));
  g.fillPoints([at(0, -halfW * 0.7), at(len, -halfW * 0.7), at(len, halfW * 0.7), at(0, halfW * 0.7)], true);

  // Hazard stripes down both long edges, crawling with the lane so it reads as moving.
  const band = 8;
  const pitch = 14;
  const crawl = (t * 40) % pitch;
  for (const side of [-1, 1]) {
    const e0 = side * halfW;
    const e1 = side * (halfW - band);
    g.fillStyle(ROCKET.hazardDark, alpha * 0.85);
    g.fillPoints([at(0, e0), at(len, e0), at(len, e1), at(0, e1)], true);
    g.fillStyle(ROCKET.hazard, alpha * 0.85);
    for (let u = -pitch + crawl; u < len; u += pitch) {
      const a0 = Phaser.Math.Clamp(u, 0, len);
      const a1 = Phaser.Math.Clamp(u + pitch * 0.5, 0, len);
      const b0 = Phaser.Math.Clamp(u + 5, 0, len);
      const b1 = Phaser.Math.Clamp(u + pitch * 0.5 + 5, 0, len);
      if (a1 - a0 < 0.5 && b1 - b0 < 0.5) continue;
      g.fillPoints([at(a0, e0), at(a1, e0), at(b1, e1), at(b0, e1)], true);
    }
  }
  // Burner nozzles across the near edge, each with a pilot flame.
  for (let i = 0; i < 5; i++) {
    const v = (i / 4 - 0.5) * (halfW - band) * 1.6;
    const p = at(6, v);
    g.fillStyle(ROCKET.scorch, alpha);
    g.fillCircle(p.x, p.y, 3.2);
    flameTongue(g, ROCKET.flame, p.x, p.y, ang, 12 + Math.sin(t * 9 + i) * 3, 2.6, alpha * 0.85, t, i);
    flameTongue(g, ROCKET.flameHot, p.x, p.y, ang, 6, 1.3, alpha * 0.9, t, i + 3);
  }
}

/** Gale Burst for the Rocket: a little missile — white body, red nose and fins, a flame out of the tail. */
export function rocketShot(g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, t: number, seed = 0): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const at = (u: number, v: number) => P(x + ca * u - sa * v, y + sa * u + ca * v);
  g.fillStyle(ROCKET.flame, 0.3);
  g.fillCircle(x, y, 11);
  rocketFlame(g, x - ca * 8, y - sa * 8, ang + Math.PI, 34, 5.5, 0.95, { phase: t * 10, seed, hot: 1 });
  // Fins.
  g.fillStyle(ROCKET.hullShade, 1);
  g.fillPoints([at(-3, -3), at(-9, -8), at(-9, -3)], true);
  g.fillPoints([at(-3, 3), at(-9, 8), at(-9, 3)], true);
  // Body.
  g.fillStyle(ROCKET.suitDeep, 1);
  g.fillPoints([at(-9, -3.8), at(5, -3.8), at(5, 3.8), at(-9, 3.8)], true);
  g.fillStyle(ROCKET.suit, 1);
  g.fillPoints([at(-9, -3), at(5, -3), at(5, 1.6), at(-9, 1.6)], true);
  g.fillStyle(ROCKET.hull, 1);
  g.fillPoints([at(-4, -3.8), at(-2, -3.8), at(-2, 3.8), at(-4, 3.8)], true);
  // Nose cone.
  g.fillStyle(ROCKET.hull, 1);
  g.fillPoints([at(5, -3.8), at(13, 0), at(5, 3.8)], true);
  g.fillStyle(ROCKET.hullLit, 0.9);
  g.fillPoints([at(5, -3.2), at(11, -0.6), at(5, -0.4)], true);
}

// ── Herald of Doom copy ──────────────────────────────────────────────────

/** The text the Herald's broadcast prints, for a skin that re-dubs it. */
export interface HeraldCopy {
  channel: string;
  headline: string;
  days: string[];
  verdict: string;
  ticker: string;
}

export const ROCKET_HERALD: HeraldCopy = {
  channel: '🚀 MISSION CONTROL  LIVE FEED',
  headline: 'LAUNCH COUNTDOWN',
  days: ['T-5', 'T-4', 'T-3', 'T-2', 'T-1'],
  verdict: 'BURN',
  ticker:
    '⚠ BREAKING: LAUNCH WINDOW OPEN  •  ALL SYSTEMS GO  •  CLEAR THE PAD  •  THERE IS NO CLEARING THE PAD  •  '
    + 'MAIN ENGINE IGNITION  •  RE-ENTRY IMMINENT  •  CHANCE OF SCORCHING: 100%  •  ',
};

// ── RocketFx — one-shot effects ──────────────────────────────────────────

export class RocketFx extends FxBase {
  constructor(scene: Phaser.Scene) {
    super(scene, (c) => c);
  }

  /** Exhaust smoke rolling out across the floor and lifting — the Rocket's dust. */
  smoke(x: number, y: number, count: number, spread: number, ms: number, depth = 4): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      a: (i / count) * TAU + Math.random() * 0.6,
      d: spread * (0.45 + Math.random() * 0.6),
      r: 3.5 + Math.random() * 4.5,
      ember: Math.random() < 0.4,
    }));
    this.anim(depth, ms, (g, t) => {
      const k = easeOut(t);
      for (const s of seeds) {
        const px = x + Math.cos(s.a) * s.d * k;
        const py = y + Math.sin(s.a) * s.d * k * 0.5 - k * 10;
        smokePuff(g, px, py, s.r * (1 + k * 1.2), (1 - t) * 0.5);
        if (s.ember) {
          g.fillStyle(ROCKET.ember, (1 - t) * 0.9);
          g.fillCircle(px + Math.cos(s.a) * 4, py - 6 - k * 10, 1.3);
        }
      }
    });
  }

  /**
   * Lift-off from a pad: a white flash, a column of fire left standing where the body went up,
   * a shock ring flat on the pad, and smoke billowing out sideways along the floor.
   */
  launch(x: number, y: number): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, 24, ROCKET.flameCore, ROCKET.flame, 9);
    this.anim(9, 700, (g, t) => {
      const e = easeOut(t);
      const fade = 1 - t;
      // The column: fire pouring down from where the body is now, onto the pad.
      const top = y - e * 150;
      for (let i = 0; i < 3; i++) {
        const w = 13 - i * 3.5;
        const col = [ROCKET.flameDeep, ROCKET.flame, ROCKET.flameHot][i];
        flameTongue(g, col, x, top, Math.PI / 2, (y - top) + 18, w * (1 - t * 0.4), fade * (0.55 + i * 0.15), t * 3, seed + i);
      }
      g.lineStyle(3 * fade, ROCKET.flameMid, fade * 0.85);
      g.strokeEllipse(x, y + 4, 40 + e * 70, 14 + e * 22);
      for (let i = 0; i < 6; i++) {
        const k = (e * 1.4 + i / 6) % 1;
        g.fillStyle(ROCKET.ember, fade * (1 - k));
        g.fillCircle(x + (noise(seed, i) - 0.5) * 36, y - 12 - k * 150, 1.6);
      }
    });
    // Smoke rolling out both ways along the floor.
    const puffs = Array.from({ length: 10 }, (_, i) => ({ side: i % 2 ? 1 : -1, d: 30 + Math.random() * 60, r: 6 + Math.random() * 6 }));
    this.anim(4, 1000, (g, t) => {
      const e = easeOut(t);
      for (const p of puffs) {
        smokePuff(g, x + p.side * p.d * e, y + 6 - e * 10 - p.r * 0.3, p.r * (0.7 + e * 0.9), (1 - t) * 0.6);
      }
    });
  }
}
