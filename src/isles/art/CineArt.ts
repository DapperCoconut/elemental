import Phaser from 'phaser';
import { lit, dim, mixC } from './IsleArt';

/**
 * Drawing helpers for cinematics (`CutsceneShot.draw`). Everything is screen space, 960×640, and
 * immediate — a shot repaints its whole frame every tick.
 */

type G = Phaser.GameObjects.Graphics;

/** Smoothstep 0–1 of `v` between `a` and `b` — the workhorse for timing things inside a shot. */
export function ease(v: number, a = 0, b = 1): number {
  const t = Phaser.Math.Clamp((v - a) / (b - a || 1), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Linear blend. */
export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/** A vertical gradient in `bands` flat strips (Graphics has no gradients worth trusting). */
export function sky(g: G, x: number, y: number, w: number, h: number, top: number, bottom: number, bands = 24): void {
  for (let i = 0; i < bands; i++) {
    g.fillStyle(mixC(top, bottom, i / (bands - 1)), 1);
    g.fillRect(x, y + (h * i) / bands, w, h / bands + 1);
  }
}

/** A sea from `y0` to the bottom: flat body, rows of moving crest lines that thicken toward the viewer. `t` seconds. */
export function sea(g: G, W: number, y0: number, y1: number, t: number, deep: number, crest: number, calm = 0): void {
  sky(g, 0, y0, W, y1 - y0, lit(deep, 0.08), dim(deep, 0.35), 10);
  const rows = 11;
  for (let r = 0; r < rows; r++) {
    const f = (r + 1) / rows;
    const y = y0 + (y1 - y0) * f * f;
    const amp = (2 + f * 7) * (1 - calm * 0.8);
    const step = 26 + f * 60;
    g.lineStyle(1 + f * 1.6, crest, 0.1 + f * 0.22);
    for (let x = -step + ((t * (12 + f * 40) + r * 37) % step); x < W + step; x += step) {
      const yy = y + Math.sin(x * 0.02 + t * 1.3 + r) * amp;
      g.lineBetween(x, yy, x + step * 0.45, yy + Math.sin(x * 0.03 + t) * 1.5);
    }
  }
}

/** Darken the corners. */
export function vignette(g: G, W: number, H: number, a = 0.5): void {
  for (let i = 0; i < 6; i++) {
    g.fillStyle(0x000000, (a / 6) * (i + 1) * 0.5);
    const m = (5 - i) * 26;
    g.fillRect(0, 0, W, m * 0.6); g.fillRect(0, H - m * 0.6, W, m * 0.6);
    g.fillRect(0, 0, m, H); g.fillRect(W - m, 0, m, H);
  }
}

/** A full-frame wash — fades, white-outs, a colour grade. */
export function wash(g: G, W: number, H: number, color: number, a: number): void {
  if (a <= 0) return;
  g.fillStyle(color, Math.min(1, a));
  g.fillRect(0, 0, W, H);
}

/**
 * The player as the game draws every fighter: a round body in the element's colour with two
 * floating ball hands and two eyes. `r` body radius; `face` -1 looks left, 1 right; `t` seconds
 * bobs it; `walk` 0–1 swings the hands.
 */
export function cineHero(g: G, x: number, y: number, r: number, color: number, o: { face?: number; t?: number; walk?: number; alpha?: number; back?: boolean } = {}): void {
  const a = o.alpha ?? 1;
  const face = o.face ?? 1;
  const t = o.t ?? 0;
  const bob = Math.sin(t * 3) * r * 0.06;
  const sw = Math.sin(t * 9) * r * 0.35 * (o.walk ?? 0);
  g.fillStyle(0x000000, 0.3 * a);
  g.fillEllipse(x, y + r * 1.05, r * 1.9, r * 0.5);
  const hand = (hx: number, hy: number) => {
    g.fillStyle(dim(color, 0.25), a); g.fillCircle(hx, hy, r * 0.36);
    g.fillStyle(lit(color, 0.2), a); g.fillCircle(hx - r * 0.08, hy - r * 0.08, r * 0.22);
  };
  hand(x - r * 1.15 * face - sw * face, y + r * 0.35 + bob);
  g.fillStyle(dim(color, 0.3), a); g.fillCircle(x, y + bob, r);
  g.fillStyle(color, a); g.fillCircle(x - r * 0.06, y - r * 0.06 + bob, r * 0.9);
  g.fillStyle(lit(color, 0.4), 0.7 * a); g.fillCircle(x - r * 0.3, y - r * 0.34 + bob, r * 0.38);
  if (!o.back) {
    for (const s of [-1, 1]) {
      const ex = x + face * r * 0.3 + s * r * 0.28, ey = y - r * 0.1 + bob;
      g.fillStyle(0xffffff, a); g.fillEllipse(ex, ey, r * 0.34, r * 0.44);
      g.fillStyle(0x14101c, a); g.fillCircle(ex + face * r * 0.06, ey, r * 0.12);
    }
  }
  hand(x + r * 1.15 * face + sw * face, y + r * 0.4 + bob);
}

/** A crowd of small figures (townsfolk, a fleet's crews) in a row — bodies only, cheap. */
export function crowd(g: G, x0: number, x1: number, y: number, n: number, r: number, colors: number[], t: number, cheer = 0): void {
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / n + Math.sin(i * 12.9) * r * 0.6;
    const c = colors[i % colors.length];
    const hop = cheer > 0 ? Math.abs(Math.sin(t * 5 + i * 1.7)) * r * 0.9 * cheer : Math.sin(t * 2 + i) * r * 0.05;
    const yy = y + Math.cos(i * 7.3) * r * 0.5 - hop;
    g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + r, r * 1.6, r * 0.4);
    g.fillStyle(dim(c, 0.3), 1); g.fillCircle(x, yy, r);
    g.fillStyle(c, 1); g.fillCircle(x - r * 0.08, yy - r * 0.08, r * 0.86);
    if (cheer > 0.3) { g.fillStyle(c, 1); g.fillCircle(x - r * 1.05, yy - r * 0.9, r * 0.32); g.fillCircle(x + r * 1.05, yy - r * 0.9, r * 0.32); }
  }
}

/** A small boat seen side-on: hull, mast, one sail. `x, y` the waterline amidships; `s` scale; `face` ±1. */
export function boat(g: G, x: number, y: number, s: number, hull: number, sail: number, t: number, face = 1): void {
  const rock = Math.sin(t * 1.6 + x * 0.01) * 0.05;
  const px = (dx: number, dy: number) => new Phaser.Geom.Point(x + (dx * Math.cos(rock) - dy * Math.sin(rock)) * s * face, y + (dx * Math.sin(rock) + dy * Math.cos(rock)) * s);
  g.fillStyle(dim(hull, 0.35), 1);
  g.fillPoints([px(-30, -6), px(34, -6), px(24, 6), px(-24, 6)], true);
  g.fillStyle(hull, 1);
  g.fillPoints([px(-30, -6), px(34, -6), px(31, -2), px(-28, -2)], true);
  g.lineStyle(Math.max(1, 2 * s), dim(hull, 0.5), 1);
  const m0 = px(-2, -6), m1 = px(-2, -46);
  g.lineBetween(m0.x, m0.y, m1.x, m1.y);
  g.fillStyle(sail, 1);
  g.fillPoints([px(0, -44), px(24 + Math.sin(t * 2) * 2, -24), px(0, -10)], true);
  g.fillStyle(lit(sail, 0.3), 0.6);
  g.fillPoints([px(0, -44), px(10, -34), px(0, -24)], true);
  g.fillStyle(0xffffff, 0.35);
  g.fillEllipse(x, y + 7 * s, 70 * s, 4 * s);
}

export { lit, dim, mixC };
