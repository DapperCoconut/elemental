import type Phaser from 'phaser';
import { dim, lit } from '../../../../art/IsleArt';

/**
 * Shared bits for the Powder Court: its palette, a frame clock, and the two props that turn up
 * both in the world and in the fights (the powder keg and the lit fuse spark). Everything else is
 * drawn bespoke where it is used.
 */

type G = Phaser.GameObjects.Graphics;

/** The court's colours: blackpowder, brass, oak, saltpetre-white and the fuse's orange spark. */
export const P = {
  powder: 0x1d1a18,
  powderLit: 0x3a3430,
  brass: 0xc9a043,
  brassDark: 0x7a5a1c,
  oak: 0x7a5232,
  oakDark: 0x4a301c,
  hoop: 0x2e2a28,
  saltpetre: 0xece4d2,
  spark: 0xffb02e,
  sparkHot: 0xfff1b0,
  flame: 0xff5a1e,
  earth: 0x8a7350,
  earthDark: 0x5e4c34,
  turf: 0x5d6b3a,
  sand: 0xc2a874,
  sandbag: 0xb59c6a,
  iron: 0x3b3d42,
  ironLit: 0x6c707a,
  smoke: 0xb8b2a8,
  redcoat: 0xa3262a,
  flagBlue: 0x2f4f8f,
  water: 0x2f4a4a,
};

export const PCOL = {
  spark: '#ffb02e',
  hot: '#fff1b0',
  red: '#ff5a3a',
  brass: '#e6c063',
  smoke: '#d6d0c4',
  green: '#9ee07a',
  blue: '#8fb4ff',
};

/**
 * A frame clock driven by the scene time each `update` is handed. Gimmicks and item scripts
 * derive their own step from it instead of trusting the caller's `dt` unit, so they behave the
 * same whether the host passes milliseconds or seconds.
 */
export class Clock {
  private last = -1;
  /** Seconds since the previous tick, clamped so a hitch never teleports anything. */
  tick(time: number): number {
    const dt = this.last < 0 ? 0 : Math.min(0.05, Math.max(0, (time - this.last) / 1000));
    this.last = time;
    return dt;
  }
}

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);

/**
 * A powder keg lying on its side, seen three-quarters from above, rolling about its own axis.
 * `roll` is the axle angle in radians (the hoops slide round as it turns); `heading` is the
 * direction the keg's long axis points.
 */
export function drawKeg(g: G, x: number, y: number, s: number, heading: number, roll: number, alpha = 1): void {
  g.fillStyle(0x000000, 0.3 * alpha); g.fillEllipse(x + 2, y + s * 0.55, s * 2.1, s * 0.8);
  const c = Math.cos(heading), sn = Math.sin(heading);
  // Body as a fat capsule along the heading: outline then wood.
  const L = s * 0.95, R = s * 0.72;
  const ax = x - c * L, ay = y - sn * L, bx = x + c * L, by = y + sn * L;
  g.lineStyle(R * 2 + 3, P.oakDark, alpha); g.lineBetween(ax, ay, bx, by);
  g.fillStyle(P.oakDark, alpha); g.fillCircle(ax, ay, R + 1.5); g.fillCircle(bx, by, R + 1.5);
  g.lineStyle(R * 2, P.oak, alpha); g.lineBetween(ax, ay, bx, by);
  g.fillStyle(P.oak, alpha); g.fillCircle(ax, ay, R); g.fillCircle(bx, by, R);
  // Staves: thin dark lines that slide with the roll.
  for (let k = 0; k < 4; k++) {
    const off = Math.sin(roll + (k * Math.PI) / 2) * R * 0.85;
    if (Math.cos(roll + (k * Math.PI) / 2) < 0) continue;
    const ox = -sn * off, oy = c * off;
    g.lineStyle(1, dim(P.oak, 0.35), alpha * 0.8);
    g.lineBetween(ax + ox, ay + oy, bx + ox, by + oy);
  }
  // Iron hoops at the belly and the two chimes.
  for (const t of [-0.75, 0, 0.75]) {
    const hx = x + c * L * t, hy = y + sn * L * t;
    g.lineStyle(2.5, P.hoop, alpha);
    g.lineBetween(hx - sn * R, hy + c * R, hx + sn * R, hy - c * R);
  }
  // Top light and the bung (rides the roll, so you can see it turn).
  g.lineStyle(2, lit(P.oak, 0.3), alpha * 0.7);
  g.lineBetween(ax - sn * R * 0.6, ay + c * R * 0.6 - 2, bx - sn * R * 0.6, by + c * R * 0.6 - 2);
  const bung = Math.sin(roll) * R * 0.7;
  if (Math.cos(roll) > -0.2) {
    g.fillStyle(P.powder, alpha); g.fillCircle(x - sn * bung, y + c * bung, Math.max(1.5, s * 0.14));
  }
  // The court's stencil: a white "XXX" for blackpowder.
  g.fillStyle(P.saltpetre, alpha * 0.55);
  for (let i = -1; i <= 1; i++) g.fillRect(x + c * i * s * 0.3 - 1.5, y + sn * i * s * 0.3 - 1.5, 3, 3);
}

/** A sputtering fuse spark at a point: hot core, orange halo, and three flicked sparks. */
export function drawSpark(g: G, x: number, y: number, t: number, size = 1): void {
  const f = 0.8 + Math.sin(t / 37) * 0.2;
  g.fillStyle(P.flame, 0.25); g.fillCircle(x, y, 9 * size * f);
  g.fillStyle(P.spark, 0.9); g.fillCircle(x, y, 4 * size * f);
  g.fillStyle(P.sparkHot, 1); g.fillCircle(x, y, 2 * size);
  for (let i = 0; i < 3; i++) {
    const a = t / 90 + i * 2.1;
    const r = (6 + ((t / 11 + i * 17) % 9)) * size;
    g.fillStyle(P.sparkHot, 0.8); g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r - 2, 1.1 * size);
  }
}

/** A soft, many-lobed smoke puff — used by cannons, grenades and blasts alike. */
export function drawPuff(g: G, x: number, y: number, r: number, color: number, a: number, seed: number): void {
  for (let i = 0; i < 6; i++) {
    const ang = seed * 1.7 + i * 1.05;
    const rr = r * (0.45 + ((seed * 7 + i * 13) % 10) / 22);
    g.fillStyle(i % 2 ? color : lit(color, 0.12), a);
    g.fillCircle(x + Math.cos(ang) * r * 0.45, y + Math.sin(ang) * r * 0.35, rr);
  }
}
