import Phaser from 'phaser';
import type { Fighter } from '../../../../../entities/Fighter';
import type { Pt } from '../../../../IslesTypes';
import { mixC } from '../../../../art/IsleArt';

/**
 * The Starfall Court's colours and the drawing bricks every part of it shares — the world
 * painter, the arena floor, the five gimmicks, Prince Nova and the charms all paint with these,
 * so the summit reads as one place from the map to the fight.
 *
 * The look: the summit of Highspire stands above the cloud line, and above the cloud line it is
 * always night. The sky is ink-blue going violet at the zenith, so thick with stars it looks
 * spilled. The city is built of pale moonstone — blue-grey masonry that drinks the starlight and
 * gives it back — trimmed in brass gone green at the seams: telescopes, armillary rings, the
 * breath-meters on every chest. Where stars have fallen they have left craters of fused black
 * glass with violet veins still cooling in them. The floors are constellation mosaics: lapis
 * tiles set with gold-leaf stars and silver lines. And all round the edges, a long way down, the
 * cloud sea lies silver under the moon like a frozen ocean.
 */
export const SF = {
  /** The night. */
  night: 0x0b1030,
  nightDeep: 0x060818,
  nightMid: 0x141a44,
  zenith: 0x231a52,
  /** Astra's own violet, and its paler dust. */
  violet: 0x6a4cff,
  violetLit: 0x9d86ff,
  violetDeep: 0x3a2a8e,
  dust: 0xb9a6ff,
  /** Starlight. */
  star: 0xf4f0ff,
  starGold: 0xffe08a,
  starHot: 0xffffff,
  comet: 0x8fe3ff,
  cometDeep: 0x3f8fc4,
  nebula: 0xd77ad8,
  nebulaDeep: 0x7a3a8a,
  /** Dying-star reds (Betel's kiln, Nova's Red Giant). */
  giant: 0xff6a3a,
  giantLit: 0xffb070,
  giantDeep: 0x9a2a1a,
  /** Moonstone masonry. */
  stone: 0x8a90a8,
  stoneLit: 0xb8bdd2,
  stoneMid: 0x6c728c,
  stoneDark: 0x434862,
  stoneDeep: 0x2a2d40,
  /** Lapis mosaic and the gold leaf set into it. */
  lapis: 0x1f3a7a,
  lapisLit: 0x3a5cae,
  lapisDeep: 0x13234e,
  leaf: 0xe8c25a,
  silver: 0xd8deea,
  /** Brass — telescopes, armillaries, breath-meters. */
  brass: 0xc89a4a,
  brassLit: 0xf0c870,
  brassDark: 0x7a5a26,
  verdigris: 0x5aa898,
  /** Fallen-star glass. */
  glass: 0x1a1430,
  glassLit: 0x3a2c6a,
  vein: 0xa070ff,
  /** The cloud sea far below, under the moon. */
  cloud: 0x55608a,
  cloudLit: 0x9aa6cc,
  cloudDeep: 0x2c3358,
  /** The King's windmill-palace on the peak above. */
  palace: 0x3a3f58,
  palaceLit: 0x6a7090,
  sail: 0xcfc8b4,
  /** Ink for the Ledger of Stars. */
  ink: 0x10101c,
  parchment: 0xe8dcc0,
  /** The moon (Umbra's eclipse). */
  moon: 0xe6e2d0,
  moonShade: 0x9c9888,
  corona: 0xfff4d0,
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
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const alive = (f: Fighter): boolean => f.active && f.hp > 0;
export const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

/** Shortest signed difference between two angles. */
export function angDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Distance from a point to the segment a–b. */
export function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const L = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / L, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

/** Sample points along a polyline every `step` px. */
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

/**
 * A multiplier held for as long as you keep refreshing it. The fight kit stacks damage and
 * speed windows multiplicatively, so a script re-issues one only as the last expires.
 */
export function heldWindow(push: (mult: number, ms: number) => void, ms = 500): (time: number, mult: number) => void {
  let until = 0;
  return (time, mult) => {
    if (time < until || Math.abs(mult - 1) < 0.001) return;
    until = time + ms;
    push(mult, ms);
  };
}

// ── Bricks ───────────────────────────────────────────────────────────

/**
 * A star as the court draws them: a four-pointed sparkle (long vertical and horizontal rays,
 * short diagonals) over a soft round glow. `r` is the long ray's length.
 */
export function star(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number, alpha = 1): void {
  g.fillStyle(color, 0.16 * alpha); g.fillCircle(x, y, r * 0.75);
  g.fillStyle(color, alpha);
  const w = Math.max(0.8, r * 0.16);
  g.fillTriangle(x - w, y, x + w, y, x, y - r);
  g.fillTriangle(x - w, y, x + w, y, x, y + r);
  g.fillTriangle(x, y - w, x, y + w, x - r, y);
  g.fillTriangle(x, y - w, x, y + w, x + r, y);
  const d = r * 0.42, dw = w * 0.7;
  g.fillTriangle(x - dw, y + dw, x + dw, y - dw, x + d, y + d);
  g.fillTriangle(x - dw, y + dw, x + dw, y - dw, x - d, y - d);
  g.fillTriangle(x - dw, y - dw, x + dw, y + dw, x + d, y - d);
  g.fillTriangle(x - dw, y - dw, x + dw, y + dw, x - d, y + d);
  g.fillStyle(SF.starHot, alpha); g.fillCircle(x, y, Math.max(0.8, r * 0.18));
}

/** A five-pointed gold-leaf star, the kind inlaid in the mosaics and stamped on star-deeds. */
export function inlayStar(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number, alpha = 1, rot = -Math.PI / 2): void {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 10; i++) {
    const a = rot + (i / 10) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.42;
    pts.push(P(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  g.fillStyle(color, alpha); g.fillPoints(pts, true, true);
}

/**
 * A comet streaking: a white-hot head, a tapering cyan tail laid back along `a` (the direction it
 * came from), and a few loose sparks shed behind it.
 */
export function comet(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, len: number, r: number, t: number, alpha = 1, tint: number = SF.comet): void {
  const bx = -Math.cos(a), by = -Math.sin(a), nx = -by, ny = bx;
  for (let i = 5; i >= 0; i--) {
    const k = i / 5;
    const w = r * (1 - k * 0.85);
    g.fillStyle(mixC(SF.starHot, tint, k), alpha * (0.85 - k * 0.6));
    g.fillTriangle(x + nx * w, y + ny * w, x - nx * w, y - ny * w, x + bx * len * (0.35 + k * 0.65), y + by * len * (0.35 + k * 0.65));
  }
  for (let i = 0; i < 4; i++) {
    const k = ((t * 3 + i * 0.27) % 1);
    g.fillStyle(SF.starGold, alpha * (1 - k));
    g.fillCircle(x + bx * len * k + nx * Math.sin(i * 2.3 + t * 9) * r, y + by * len * k + ny * Math.sin(i * 2.3 + t * 9) * r, 1.4);
  }
  g.fillStyle(SF.starHot, alpha); g.fillCircle(x, y, r);
  g.fillStyle(tint, 0.35 * alpha); g.fillCircle(x, y, r * 1.8);
}

/**
 * A fallen-star crater seen from above: a raised rim of thrown moonstone, a bowl of fused black
 * glass, and violet veins still cooling in it. `heat` 0–1 brightens the veins and the core.
 */
export function crater(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, heat: number, rng: () => number): void {
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 4, y + 6, r * 2.3, r * 1.4);
  g.fillStyle(SF.stoneMid, 1); g.fillEllipse(x, y, r * 2.25, r * 1.35);
  g.fillStyle(SF.stoneLit, 0.7); g.fillEllipse(x - r * 0.1, y - r * 0.12, r * 2.0, r * 1.1);
  g.fillStyle(SF.glass, 1); g.fillEllipse(x, y + r * 0.05, r * 1.7, r * 1.0);
  g.fillStyle(SF.glassLit, 0.6); g.fillEllipse(x - r * 0.25, y - r * 0.12, r * 0.8, r * 0.35);
  // Thrown chips on the rim.
  for (let i = 0; i < 10; i++) {
    const a = rng() * Math.PI * 2;
    g.fillStyle(SF.stoneLit, 0.8); g.fillCircle(x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 0.74, 1.5 + rng() * 2.5);
  }
  // Veins: forked cracks from the core.
  g.lineStyle(1.5, SF.vein, 0.35 + heat * 0.6);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rng() * 0.6;
    const mx = x + Math.cos(a) * r * 0.45, my = y + Math.sin(a) * r * 0.27;
    g.lineBetween(x, y, mx, my);
    g.lineBetween(mx, my, mx + Math.cos(a + 0.5) * r * 0.3, my + Math.sin(a + 0.5) * r * 0.18);
  }
  if (heat > 0.05) {
    g.fillStyle(SF.violet, 0.25 * heat); g.fillEllipse(x, y, r * 1.2, r * 0.7);
    g.fillStyle(SF.dust, 0.6 * heat); g.fillCircle(x, y, r * 0.16);
  }
}

/**
 * A breath-meter: the King's brass gauge strapped over every heart on Highspire. A round dial
 * with a needle; `k` 0–1 is how far the needle has crept toward the red (debt).
 */
export function breathMeter(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, k: number): void {
  g.fillStyle(SF.brassDark, 1); g.fillCircle(x, y, r + 1.5);
  g.fillStyle(SF.brass, 1); g.fillCircle(x, y, r);
  g.fillStyle(SF.parchment, 1); g.fillCircle(x, y, r * 0.74);
  g.lineStyle(Math.max(1, r * 0.16), 0xc0392b, 1);
  g.beginPath(); g.arc(x, y, r * 0.58, -Math.PI * 0.25, 0); g.strokePath();
  const a = -Math.PI * 1.1 + k * Math.PI * 1.1;
  g.lineStyle(Math.max(1, r * 0.12), SF.ink, 1); g.lineBetween(x, y, x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62);
  g.fillStyle(SF.ink, 1); g.fillCircle(x, y, Math.max(0.8, r * 0.12));
}

/**
 * A brass telescope on a tripod, pointing at `a` (radians, 0 = east, raised toward -π/2 = up).
 * `s` is the barrel length. `y` is the feet line.
 */
export function telescope(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, a: number): void {
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 2, s * 0.9, s * 0.22);
  const hx = x, hy = y - s * 0.55;
  g.lineStyle(Math.max(1.5, s * 0.05), SF.brassDark, 1);
  g.lineBetween(hx, hy, x - s * 0.32, y); g.lineBetween(hx, hy, x + s * 0.32, y); g.lineBetween(hx, hy, x + s * 0.04, y + s * 0.06);
  const ux = Math.cos(a), uy = Math.sin(a);
  const bx0 = hx - ux * s * 0.35, by0 = hy - uy * s * 0.35, bx1 = hx + ux * s * 0.65, by1 = hy + uy * s * 0.65;
  g.lineStyle(s * 0.16, SF.brassDark, 1); g.lineBetween(bx0, by0, bx1, by1);
  g.lineStyle(s * 0.12, SF.brass, 1); g.lineBetween(bx0, by0, bx1, by1);
  g.lineStyle(s * 0.04, SF.brassLit, 1); g.lineBetween(bx0 - uy * s * 0.03, by0 + ux * s * 0.03 - s * 0.02, bx1, by1 - s * 0.02);
  // Draw-tube rings and the objective lens.
  for (const k of [0.1, 0.45]) {
    const rx = bx0 + (bx1 - bx0) * k, ry = by0 + (by1 - by0) * k;
    g.fillStyle(SF.brassDark, 1); g.fillCircle(rx, ry, s * 0.09);
  }
  g.fillStyle(SF.brassLit, 1); g.fillCircle(bx1, by1, s * 0.09);
  g.fillStyle(SF.comet, 0.8); g.fillCircle(bx1, by1, s * 0.055);
}

/**
 * An armillary sphere on a plinth — nested brass rings round a little gold star, the court's
 * commonest ornament. `t` (seconds) spins the rings when called per frame; 0 when baked.
 */
export function armillary(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, t: number): void {
  g.fillStyle(SF.stoneDark, 1); g.fillRect(x - s * 0.35, y - s * 0.5, s * 0.7, s * 0.5);
  g.fillStyle(SF.stoneLit, 1); g.fillRect(x - s * 0.42, y - s * 0.56, s * 0.84, s * 0.1);
  const cx = x, cy = y - s * 1.15;
  g.lineStyle(Math.max(1, s * 0.06), SF.brassDark, 1); g.lineBetween(cx, y - s * 0.56, cx, cy + s * 0.55);
  g.lineStyle(Math.max(1, s * 0.05), SF.brass, 1);
  g.strokeCircle(cx, cy, s * 0.55);
  g.strokeEllipse(cx, cy, s * 1.1 * Math.abs(Math.cos(t * 0.6)) + 2, s * 1.1);
  g.strokeEllipse(cx, cy, s * 1.1, s * 0.4);
  g.lineStyle(Math.max(1, s * 0.04), SF.brassLit, 1);
  g.lineBetween(cx - s * 0.65, cy + s * 0.3, cx + s * 0.65, cy - s * 0.3);
  inlayStar(g, cx, cy, s * 0.16, SF.starGold, 1, t);
}

/** A cork-stoppered breath bottle: green glass, a fog of breath inside, a wax-sealed cork. */
export function breathBottle(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, fill = 0.7): void {
  g.fillStyle(0x1f3a32, 1); g.fillRoundedRect(x - s * 0.5, y - s * 1.2, s, s * 1.2, s * 0.3);
  g.fillRect(x - s * 0.2, y - s * 1.55, s * 0.4, s * 0.4);
  g.fillStyle(0x9ad6c6, 0.35 + fill * 0.35); g.fillRoundedRect(x - s * 0.4, y - s * 1.1 * fill, s * 0.8, s * 1.0 * fill, s * 0.25);
  g.fillStyle(0xffffff, 0.35); g.fillRect(x - s * 0.36, y - s * 1.05, s * 0.12, s * 0.7);
  g.fillStyle(0x8a6040, 1); g.fillRect(x - s * 0.22, y - s * 1.75, s * 0.44, s * 0.24);
  g.fillStyle(0xa8302a, 1); g.fillCircle(x, y - s * 1.6, s * 0.17);
}
