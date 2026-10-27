import Phaser from 'phaser';
import { brandSigil, dim, glow, lit, shadow, type G } from '../../../../art/IsleArt';
import type { Pt } from '../../../../IslesTypes';
import {
  ASH_DARK, BRAND, BRICK, BRICK_DARK, EMBER, EMBER_DARK, EMBER_LIT, GLOW, IRON, RENDER, SLATE, SMOKE, SOOT,
} from './palette';

/**
 * Hearth Court set pieces — the shapes only this town has. The shared IsleArt bricks give the
 * house and the road; these give the things that make it a *tithe* town: the chimney-crowded
 * narrow house, the corner brazier the tithe-men check, the sooted retaining walls of the
 * terraces, the sweep's ladder, the stove-pipe smoke.
 */

/**
 * A narrow terrace house with two or three chimney pots and a branded door. `x,y` is the
 * middle of its front wall's base. Taller and thinner than the shared `house` — the Hearth
 * Court builds up, because every family has to fit a Tithe Fire in.
 */
export function chimneyHouse(g: G, x: number, y: number, w: number, h: number, wall: number, rng: () => number, pots = 2): void {
  shadow(g, x, y + 4, w * 1.2, 20);
  g.fillStyle(dim(wall, 0.5), 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(wall, 1); g.fillRect(x - w / 2, y - h, w, h);
  // Brick coursing, soot-streaked from the top down.
  for (let row = 0; row < h / 9; row++) {
    const ry = y - h + row * 9 + 4;
    const off = (row % 2) * 9;
    for (let cx = x - w / 2 + off; cx < x + w / 2 - 4; cx += 18) {
      if (rng() < 0.45) continue;
      g.fillStyle(rng() < 0.5 ? dim(wall, 0.14) : lit(wall, 0.07), 0.55);
      g.fillRect(cx, ry, 15, 6);
    }
  }
  for (let i = 0; i < 4; i++) {
    const sx = x - w / 2 + 6 + rng() * (w - 12);
    g.fillStyle(SOOT, 0.25);
    g.fillRect(sx, y - h, 4 + rng() * 5, h * (0.3 + rng() * 0.45));
  }
  // Steep slate roof.
  const rh = h * 0.42;
  g.fillStyle(dim(SLATE, 0.45), 1);
  g.fillTriangle(x - w / 2 - 10, y - h + 2, x + w / 2 + 10, y - h + 2, x, y - h - rh - 4);
  g.fillStyle(SLATE, 1);
  g.fillTriangle(x - w / 2 - 6, y - h, x + w / 2 + 6, y - h, x, y - h - rh);
  g.lineStyle(1.5, lit(SLATE, 0.15), 0.8);
  for (let k = 1; k < 6; k++) {
    const t = k / 6;
    g.lineBetween(x - (w / 2 + 6) * (1 - t), y - h - rh * t, x + (w / 2 + 6) * (1 - t), y - h - rh * t);
  }
  // Chimney pots — the town's skyline.
  for (let i = 0; i < pots; i++) {
    const cx = x - w * 0.3 + (w * 0.6 * (i + 0.5)) / pots;
    const top = y - h - rh * (0.55 + rng() * 0.5) - 14;
    g.fillStyle(BRICK_DARK, 1); g.fillRect(cx - 7, top, 14, y - h - top + 4);
    g.fillStyle(BRICK, 1); g.fillRect(cx - 6, top + 1, 12, y - h - top + 2);
    g.fillStyle(IRON, 1); g.fillRect(cx - 9, top - 5, 18, 6);
    g.fillStyle(EMBER_DARK, 1); g.fillRect(cx - 5, top - 4, 10, 3);
  }
  // Two storeys of glowing windows — the Tithe Fire burns behind every pane.
  for (let fl = 0; fl < 2; fl++) {
    const wy = y - h * (fl === 0 ? 0.42 : 0.78);
    for (const side of [-1, 1]) {
      const wx = x + side * w * 0.26;
      if (fl === 0 && Math.abs(wx - x) < 16) continue;
      g.fillStyle(IRON, 1); g.fillRect(wx - 8, wy - 10, 16, 20);
      g.fillStyle(GLOW, 0.14); g.fillCircle(wx, wy, 18);
      g.fillStyle(GLOW, 0.92); g.fillRect(wx - 6, wy - 8, 12, 16);
      g.fillStyle(EMBER, 0.6); g.fillRect(wx - 6, wy + 2, 12, 6);
      g.fillStyle(IRON, 1); g.fillRect(wx - 1, wy - 8, 2, 16); g.fillRect(wx - 6, wy - 1, 12, 2);
    }
  }
  // The branded door.
  g.fillStyle(IRON, 1); g.fillRoundedRect(x - 11, y - 30, 22, 30, { tl: 9, tr: 9, bl: 0, br: 0 });
  g.fillStyle(0x3b2a20, 1); g.fillRoundedRect(x - 9, y - 28, 18, 28, { tl: 8, tr: 8, bl: 0, br: 0 });
  brandSigil(g, x, y - 17, 5.5, BRAND, 0.95);
  // Doorstep and the scuffed ash in front of it.
  g.fillStyle(ASH_DARK, 1); g.fillRect(x - 14, y - 2, 28, 4);
}

/**
 * A tithe brazier on a street corner — an iron bowl on three legs, banked coals, the King's
 * brand cast into the bowl. The tithe-men check these at dusk.
 */
export function titheBrazier(g: G, x: number, y: number, s = 1): void {
  shadow(g, x, y + 2, 34 * s, 10 * s);
  g.lineStyle(3 * s, IRON, 1);
  g.lineBetween(x - 12 * s, y, x - 7 * s, y - 22 * s);
  g.lineBetween(x + 12 * s, y, x + 7 * s, y - 22 * s);
  g.lineBetween(x, y + 2, x, y - 22 * s);
  g.fillStyle(dim(IRON, 0.3), 1); g.fillEllipse(x, y - 24 * s, 34 * s, 14 * s);
  g.fillStyle(IRON, 1); g.fillRect(x - 17 * s, y - 32 * s, 34 * s, 8 * s);
  g.fillStyle(EMBER_DARK, 1); g.fillEllipse(x, y - 32 * s, 30 * s, 9 * s);
  g.fillStyle(EMBER, 1); g.fillEllipse(x, y - 33 * s, 22 * s, 6 * s);
  brandSigil(g, x, y - 27 * s, 3.2 * s, BRAND, 0.8);
}

/** The live flame over a brazier or chimney — call from `animate`. */
export function flameLick(g: G, x: number, y: number, t: number, s = 1, seed = 0): void {
  glow(g, x, y - 4 * s, 26 * s, GLOW, 0.05, 3);
  for (let i = 0; i < 3; i++) {
    const ph = t * 5 + seed + i * 2.1;
    const h = (12 + Math.sin(ph) * 4) * s;
    const ox = (i - 1) * 5 * s + Math.sin(ph * 1.3) * 1.5;
    g.fillStyle(i === 1 ? EMBER_LIT : EMBER, 0.9);
    g.fillTriangle(x + ox - 4 * s, y, x + ox + 4 * s, y, x + ox, y - h);
  }
}

/** A rising, drifting smoke column from a chimney pot — call from `animateOver`. */
export function smokeColumn(g: G, x: number, y: number, t: number, seed: number, scale = 1): void {
  for (let i = 0; i < 6; i++) {
    const ph = ((t * 0.32 + seed * 0.137 + i / 6) % 1);
    const r = (5 + ph * 18) * scale;
    const sx = x + Math.sin(t * 0.8 + seed + ph * 4) * 6 + ph * 34 * scale;
    const sy = y - ph * 120 * scale;
    g.fillStyle(SMOKE, (1 - ph) * 0.32);
    g.fillCircle(sx, sy, r);
  }
}

/**
 * A terrace's retaining wall face, drawn flat into the ground: dressed ash blocks with a coping
 * stone and soot weeping down from the gutter. `y` is the foot of the wall; `h` its height.
 */
export function retainingWall(g: G, x0: number, x1: number, y: number, h: number, rng: () => number): void {
  g.fillStyle(SOOT, 0.45); g.fillRect(x0, y, x1 - x0, 12);
  g.fillStyle(dim(RENDER, 0.42), 1); g.fillRect(x0, y - h, x1 - x0, h);
  for (let row = 0; row < h / 13; row++) {
    const ry = y - h + row * 13 + 2;
    const off = (row % 2) * 17;
    for (let bx = x0 + off - 17; bx < x1; bx += 34) {
      const a = Math.max(x0, bx + 1), b = Math.min(x1, bx + 32);
      if (b <= a) continue;
      g.fillStyle(rng() < 0.5 ? dim(RENDER, 0.36) : dim(RENDER, 0.48), 1);
      g.fillRect(a, ry, b - a, 11);
    }
  }
  for (let i = 0; i < (x1 - x0) / 60; i++) {
    g.fillStyle(SOOT, 0.3);
    g.fillRect(x0 + rng() * (x1 - x0), y - h, 3 + rng() * 5, h * (0.4 + rng() * 0.6));
  }
  g.fillStyle(dim(RENDER, 0.18), 1); g.fillRect(x0, y - h - 6, x1 - x0, 8);
  g.fillStyle(lit(RENDER, 0.05), 0.6); g.fillRect(x0, y - h - 6, x1 - x0, 2);
}

/** Broad stone steps cutting through a retaining wall. */
export function stairs(g: G, cx: number, y: number, w: number, h: number): void {
  const steps = Math.max(3, Math.round(h / 9));
  for (let i = 0; i < steps; i++) {
    const sy = y - h + (h / steps) * i;
    g.fillStyle(i % 2 ? dim(RENDER, 0.3) : dim(RENDER, 0.22), 1);
    g.fillRect(cx - w / 2, sy, w, h / steps + 1);
    g.fillStyle(lit(RENDER, 0.08), 0.5); g.fillRect(cx - w / 2, sy, w, 2);
  }
  g.fillStyle(dim(RENDER, 0.5), 1);
  g.fillRect(cx - w / 2 - 10, y - h - 6, 10, h + 6);
  g.fillRect(cx + w / 2, y - h - 6, 10, h + 6);
}

/** A sweep's ladder leaned on a wall, with a brush hung from the top rung. */
export function sweepLadder(g: G, x: number, y: number, h: number): void {
  g.lineStyle(3, 0x5a4330, 1);
  g.lineBetween(x - 9, y, x - 2, y - h);
  g.lineBetween(x + 9, y, x + 16, y - h);
  for (let k = 1; k < h / 14; k++) {
    const t = k / (h / 14);
    g.lineStyle(2, 0x6d5238, 1);
    g.lineBetween(x - 9 + 7 * t, y - h * t, x + 9 + 7 * t, y - h * t);
  }
  g.fillStyle(SOOT, 1); g.fillCircle(x + 7, y - h + 12, 7);
  g.lineStyle(1, SOOT, 1);
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    g.lineBetween(x + 7, y - h + 12, x + 7 + Math.cos(a) * 10, y - h + 12 + Math.sin(a) * 10);
  }
}

/** A coal bunker: a sloped iron hopper with lumps spilling at the foot. */
export function coalBunker(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 70, 14);
  g.fillStyle(IRON, 1);
  g.fillPoints([
    new Phaser.Geom.Point(x - 30, y), new Phaser.Geom.Point(x + 30, y),
    new Phaser.Geom.Point(x + 34, y - 36), new Phaser.Geom.Point(x - 34, y - 36),
  ], true);
  g.fillStyle(lit(IRON, 0.12), 1); g.fillRect(x - 34, y - 38, 68, 4);
  g.fillStyle(SOOT, 1); g.fillEllipse(x, y - 38, 60, 10);
  for (let i = 0; i < 9; i++) {
    g.fillStyle(i % 3 ? SOOT : 0x2f2a28, 1);
    g.fillCircle(x - 26 + rng() * 52, y - 40 - rng() * 6, 3 + rng() * 3);
  }
  for (let i = 0; i < 6; i++) {
    g.fillStyle(SOOT, 1);
    g.fillCircle(x - 30 + rng() * 60, y + 2 + rng() * 6, 2 + rng() * 2.5);
  }
  brandSigil(g, x, y - 18, 7, BRAND, 0.7);
}

/** A washing line strung between two posts, the sheets grey with soot. */
export function sootyLaundry(g: G, a: Pt, b: Pt, rng: () => number): void {
  for (const p of [a, b]) {
    shadow(g, p.x, p.y, 12, 4);
    g.fillStyle(0x4a3828, 1); g.fillRect(p.x - 2, p.y - 54, 4, 54);
  }
  g.lineStyle(1, 0x2a2420, 1);
  const sag = 10;
  const n = 5;
  for (let i = 0; i < n; i++) {
    const t0 = (i + 0.15) / n, t1 = (i + 0.8) / n;
    const x0 = a.x + (b.x - a.x) * t0, x1 = a.x + (b.x - a.x) * t1;
    const yy = (t: number) => a.y - 52 + (b.y - a.y) * t + Math.sin(t * Math.PI) * sag;
    const tone = [0xb8b2a8, 0x8f8a82, 0x9a8670, 0xa7a29a][Math.floor(rng() * 4)];
    const hgt = 18 + rng() * 12;
    g.fillStyle(tone, 1);
    g.fillRect(x0, yy(t0), x1 - x0, hgt);
    g.fillStyle(SOOT, 0.3); g.fillRect(x0, yy(t0) + hgt * 0.55, x1 - x0, hgt * 0.45);
  }
  g.lineBetween(a.x, a.y - 52, (a.x + b.x) / 2, (a.y + b.y) / 2 - 52 + sag);
  g.lineBetween((a.x + b.x) / 2, (a.y + b.y) / 2 - 52 + sag, b.x, b.y - 52);
}

/** A notice board nailed with tithe proclamations, each stamped with the brand. */
export function proclamationBoard(g: G, x: number, y: number): void {
  shadow(g, x, y, 60, 10);
  g.fillStyle(0x3c2c20, 1);
  g.fillRect(x - 26, y - 34, 4, 34); g.fillRect(x + 22, y - 34, 4, 34);
  g.fillStyle(0x5a4330, 1); g.fillRect(x - 32, y - 72, 64, 42);
  g.fillStyle(lit(0x5a4330, 0.1), 1); g.fillRect(x - 32, y - 72, 64, 3);
  const sheets: [number, number][] = [[-22, -66], [-2, -68], [14, -62], [-14, -50]];
  for (const [ox, oy] of sheets) {
    g.fillStyle(0xd8ccb0, 1); g.fillRect(x + ox, y + oy, 16, 18);
    g.fillStyle(0x3b2a20, 0.6);
    for (let k = 0; k < 3; k++) g.fillRect(x + ox + 2, y + oy + 3 + k * 4, 12, 1.4);
    brandSigil(g, x + ox + 8, y + oy + 15, 2.4, BRAND, 0.9);
  }
}

/** The Hearth Court's waystone: a squat hearthstone with a little fire kept in its crown. */
export function hearthWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 3, 54, 14);
  g.fillStyle(dim(ASH_DARK, 0.3), 1); g.fillRoundedRect(x - 20, y - 58, 40, 60, 8);
  g.fillStyle(ASH_DARK, 1); g.fillRoundedRect(x - 18, y - 56, 36, 56, 7);
  g.fillStyle(lit(ASH_DARK, 0.15), 1); g.fillRect(x - 16, y - 54, 32, 3);
  g.fillStyle(SOOT, 1); g.fillRoundedRect(x - 11, y - 46, 22, 16, { tl: 8, tr: 8, bl: 0, br: 0 });
  g.fillStyle(EMBER_DARK, 1); g.fillRect(x - 8, y - 36, 16, 5);
  g.lineStyle(1.5, EMBER_LIT, 0.7);
  g.strokeCircle(x, y - 18, 6);
  g.lineBetween(x, y - 24, x, y - 12);
  g.lineBetween(x - 6, y - 18, x + 6, y - 18);
}
