import Phaser from 'phaser';
import type { Pt } from '../../../../IslesTypes';
import { mixC } from '../../../../art/IsleArt';

/**
 * The Caldera Court's colours and the few drawing bricks every part of the court shares —
 * the world painter, the arena floor, the five gimmicks and Prince Basalt all paint with
 * these, so the crater reads as one place from the map to the fight.
 *
 * The look: black glass underfoot, lava that is mostly *crusted* (dark plates over an orange
 * seam — the bright stuff is the exception, never the rule), grey-violet basalt in hexagons,
 * and sulphur yellow as the only cold-looking colour in the crater.
 */
export const CAL = {
  obsidian: 0x141118,
  obsidianMid: 0x1e1924,
  obsidianLit: 0x3a3247,
  glassGleam: 0xb9a9d8,
  basalt: 0x34323a,
  basaltMid: 0x45434d,
  basaltLit: 0x67646f,
  basaltDark: 0x1f1d24,
  crust: 0x351a10,
  crustMid: 0x4d2716,
  crustLit: 0x6e3a1e,
  seam: 0x8a2208,
  lava: 0xf0521a,
  lavaLit: 0xffa133,
  lavaHot: 0xffe27a,
  sulphur: 0xe4d94a,
  sulphurDark: 0x8a7d1e,
  ash: 0x7d746e,
  ashLight: 0xa79d94,
  steam: 0xdfe6ea,
  rain: 0x7fa6c9,
  rainDark: 0x2e4256,
  pumice: 0xcfc6b8,
  pumiceDark: 0x8d8478,
  iron: 0x2a2624,
  hide: 0x7a5a3e,
  wood: 0x5a3b26,
};

/** Seconds since the last call — gimmicks and scripts keep their own clock so dt units never matter. */
export function makeClock(): (time: number) => number {
  let last = -1;
  return (time: number): number => {
    if (last < 0) { last = time; return 0; }
    const dt = Math.min(0.05, Math.max(0, (time - last) / 1000));
    last = time;
    return dt;
  };
}

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

/** A flat hexagon (pointy-top when `rot` is 0, flat-top at π/6). */
export function hexPts(x: number, y: number, r: number, rot = 0, squash = 1): Phaser.Geom.Point[] {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 6; i++) {
    const a = rot + Math.PI / 6 + (i * Math.PI) / 3;
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * r, y + Math.sin(a) * r * squash));
  }
  return pts;
}

/**
 * A standing basalt column seen three-quarters on: a hex top cap `h` px above its foot, the
 * two visible side faces dropping to the ground. `glowSeam` lights the cracks between faces.
 */
export function basaltColumn(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, h: number, tone = 0, glowSeam = 0): void {
  const top = y - h;
  const base = mixC(CAL.basalt, CAL.basaltLit, tone);
  // Side faces: left darker, right mid.
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 2, r * 2.3, r * 0.7);
  g.fillStyle(mixC(base, 0x000000, 0.45), 1);
  g.fillRect(x - r * 0.87, top, r * 0.87, h);
  g.fillStyle(mixC(base, 0x000000, 0.25), 1);
  g.fillRect(x, top, r * 0.87, h);
  // Bottom edge of the faces follows the hex's lower half.
  g.fillTriangle(x - r * 0.87, y, x, y, x, y + r * 0.5 * 0.55);
  g.fillStyle(mixC(base, 0x000000, 0.45), 1);
  g.fillTriangle(x - r * 0.87, y, x, y + r * 0.5 * 0.55, x - r * 0.87, y - 1);
  // Horizontal joint lines — basalt columns break in drums.
  g.lineStyle(1, mixC(base, 0x000000, 0.6), 0.8);
  for (let k = 1; k * 26 < h; k++) {
    const jy = top + k * 26 + (k % 2) * 4;
    g.lineBetween(x - r * 0.87, jy, x, jy + 3);
    g.lineBetween(x, jy + 3, x + r * 0.87, jy);
  }
  if (glowSeam > 0) {
    g.lineStyle(1.5, CAL.lavaLit, glowSeam);
    g.lineBetween(x, top + r * 0.4, x, y);
  }
  // The cap.
  g.fillStyle(mixC(base, 0xffffff, 0.12), 1);
  g.fillPoints(hexPts(x, top, r, Math.PI / 6, 0.55), true, true);
  g.lineStyle(1.5, mixC(base, 0xffffff, 0.3), 0.9);
  g.strokePoints(hexPts(x, top, r, Math.PI / 6, 0.55), true, true);
}

/** Sample points along a polyline every `step` px (rivers → solids, flow streaks). */
export function samplePolyline(pts: Pt[], step: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.floor(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** A molten blob surface: a crusted pool with a bright seam and slow bubbles (animated). */
export function lavaBubbles(g: Phaser.GameObjects.Graphics, x: number, y: number, rx: number, ry: number, t: number, seed: number, n = 4): void {
  for (let i = 0; i < n; i++) {
    const s = seed * 31 + i * 97;
    const ph = ((t * 0.5 + (s % 100) / 100) % 1);
    const bx = x + Math.sin(s * 1.7) * rx * 0.7;
    const by = y + Math.cos(s * 2.3) * ry * 0.7;
    const r = 2 + ph * 5;
    g.lineStyle(1.5, CAL.lavaHot, (1 - ph) * 0.8);
    g.strokeCircle(bx, by, r);
    if (ph < 0.3) { g.fillStyle(CAL.lavaHot, 0.7 - ph * 2); g.fillCircle(bx, by, 2); }
  }
}
