import Phaser from 'phaser';
import { type G, dim, lit, mixC } from '../../../../art/IsleArt';

/**
 * Shared drawing for the Undertow — the Queen's sigil, the drowned asleep in their bubbles,
 * coral, kelp and pearl. Used by the dungeon, the warden floor, the warden gimmicks and the
 * Queen herself, so the whole palace is painted in one hand.
 */

// ── Palette — drowned stone, deep water, coral, pearl and the Queen's gold ──

export const ABYSS = 0x040c14;
export const DEEP = 0x0a2230;
export const SEA = 0x14485a;
export const TEAL = 0x2a8a8c;
export const FOAM = 0xc8f4ee;
export const PEARL = 0xeee4d4;
export const PEARL_SHEEN = 0xf8d8f0;
export const GOLD = 0xe8c46a;
export const CORAL = 0xe8765a;
export const CORAL_DEEP = 0x8a2e3a;
export const KELP = 0x2e5a2a;
export const STONE = 0x1e2a30;
export const STONE_LIT = 0x33454c;
export const BARNACLE = 0x8a8a7a;

/**
 * Queen Maresa's sigil — a whirlpool spiral beneath a three-pointed crown. It is pressed into
 * every sluice gate, every tithe-coin and every bubble the drowned sleep in.
 */
export function maresaSigil(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  g.lineStyle(Math.max(1.2, r * 0.16), color, a);
  g.beginPath();
  const turns = 2.2;
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const ang = k * Math.PI * 2 * turns;
    const rr = r * 0.78 * (1 - k * 0.92);
    const px = x + Math.cos(ang) * rr, py = y + 0.15 * r + Math.sin(ang) * rr * 0.8;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
  // The crown sitting on the whirl.
  g.fillStyle(color, a);
  const cy = y - r * 0.62;
  g.fillRect(x - r * 0.5, cy, r, r * 0.16);
  g.fillTriangle(x - r * 0.5, cy, x - r * 0.3, cy, x - r * 0.45, cy - r * 0.38);
  g.fillTriangle(x - r * 0.12, cy, x + r * 0.12, cy, x, cy - r * 0.5);
  g.fillTriangle(x + r * 0.3, cy, x + r * 0.5, cy, x + r * 0.45, cy - r * 0.38);
}

/** A branch of coral growing up from (x, y): forked, rounded tips. */
export function coralBranch(g: G, x: number, y: number, s: number, color: number, rng: () => number): void {
  const grow = (bx: number, by: number, ang: number, len: number, w: number, depth: number): void => {
    const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
    g.lineStyle(w + 2, dim(color, 0.45), 1); g.lineBetween(bx, by, ex, ey);
    g.lineStyle(w, color, 1); g.lineBetween(bx, by, ex, ey);
    if (depth <= 0 || len < 6) {
      g.fillStyle(lit(color, 0.25), 1); g.fillCircle(ex, ey, w * 0.7);
      return;
    }
    const spread = 0.35 + rng() * 0.35;
    grow(ex, ey, ang - spread, len * (0.62 + rng() * 0.15), w * 0.72, depth - 1);
    grow(ex, ey, ang + spread, len * (0.62 + rng() * 0.15), w * 0.72, depth - 1);
  };
  grow(x, y, -Math.PI / 2 + (rng() - 0.5) * 0.3, s, Math.max(2, s * 0.24), 3);
}

/** A coral-crusted pillar: a drowned stone column with coral and barnacles grown over it. */
export function coralPillar(g: G, x: number, y: number, r: number, h: number, rng: () => number): void {
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y + 4, r * 2.6, r * 0.9);
  g.fillStyle(dim(STONE_LIT, 0.4), 1); g.fillRect(x - r - 2, y - h, r * 2 + 4, h);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x - r, y - h, r * 2, h);
  g.fillStyle(lit(STONE_LIT, 0.12), 1); g.fillRect(x - r, y - h, r * 0.5, h);
  // Fluting.
  g.lineStyle(1.5, dim(STONE_LIT, 0.35), 1);
  for (let k = -1; k <= 1; k++) g.lineBetween(x + k * r * 0.5, y - h + 8, x + k * r * 0.5, y - 6);
  // Capital and base.
  g.fillStyle(dim(STONE_LIT, 0.2), 1); g.fillRect(x - r - 6, y - h - 8, r * 2 + 12, 10); g.fillRect(x - r - 5, y - 10, r * 2 + 10, 10);
  // Tide lines — every flood leaves a ring.
  for (let k = 0; k < 4; k++) {
    g.lineStyle(1, 0x6a8a7a, 0.4);
    g.lineBetween(x - r, y - 18 - k * (h / 5), x + r, y - 18 - k * (h / 5) - 2);
  }
  // Coral climbing it.
  for (let i = 0; i < 3; i++) {
    const cy = y - 14 - rng() * (h - 30);
    const side = rng() < 0.5 ? -1 : 1;
    coralBranch(g, x + side * r * 0.8, cy, 8 + rng() * 10, rng() < 0.5 ? CORAL : 0xd8608a, rng);
  }
  for (let i = 0; i < 9; i++) {
    g.fillStyle(BARNACLE, 0.9); g.fillCircle(x - r + rng() * r * 2, y - 6 - rng() * h * 0.5, 1.5 + rng() * 2);
    g.fillStyle(0x2a2a24, 1); g.fillCircle(x - r + rng() * r * 2, y - 6 - rng() * h * 0.5, 0.8);
  }
}

/** A frond of kelp, swaying with `t`. */
export function kelp(g: G, x: number, y: number, len: number, t: number, color = KELP): void {
  let px = x, py = y;
  const segs = Math.max(3, Math.floor(len / 12));
  for (let i = 1; i <= segs; i++) {
    const k = i / segs;
    const nx = x + Math.sin(t * 1.3 + x * 0.05 + k * 2.2) * 10 * k;
    const ny = y - len * k;
    g.lineStyle(4 - k * 2.4, i % 2 ? color : lit(color, 0.12), 0.9);
    g.lineBetween(px, py, nx, ny);
    if (i % 2 === 0) { g.fillStyle(lit(color, 0.2), 0.8); g.fillEllipse(nx + 4, ny, 8, 3); }
    px = nx; py = ny;
  }
}

/**
 * One of the drowned asleep in a ballast bubble: a curled figure, hands folded, hair floating,
 * inside a sphere of held water. `stir` 0–1 — how near waking (eyes, hands). `woke`: the bubble
 * is gone and they stand on their own.
 */
export function sleeperInBubble(g: G, x: number, y: number, r: number, t: number, skin: number, cloth: number, stir = 0): void {
  const bob = Math.sin(t * 0.9 + x * 0.01) * 3;
  const cy = y - r + bob;
  // The body, curled — a bowed head over drawn-up knees.
  g.fillStyle(dim(cloth, 0.3), 0.9); g.fillEllipse(x, cy + r * 0.28, r * 0.9, r * 0.75);
  g.fillStyle(cloth, 0.85); g.fillEllipse(x - 1, cy + r * 0.24, r * 0.82, r * 0.66);
  g.fillStyle(skin, 0.9); g.fillCircle(x + r * 0.08, cy - r * 0.18, r * 0.3);
  // Hair drifting upward.
  for (let i = 0; i < 4; i++) {
    const hx = x + r * 0.08 + (i - 1.5) * r * 0.12;
    g.lineStyle(1.5, dim(skin, 0.55), 0.8);
    g.lineBetween(hx, cy - r * 0.4, hx + Math.sin(t * 1.4 + i) * 4, cy - r * 0.68);
  }
  // Eyes: closed lines, or opening as they stir.
  if (stir > 0.5) {
    g.fillStyle(0xe8fff8, 0.9); g.fillCircle(x + r * 0.0, cy - r * 0.2, 1.6); g.fillCircle(x + r * 0.18, cy - r * 0.2, 1.6);
  } else {
    g.lineStyle(1, dim(skin, 0.6), 1);
    g.lineBetween(x - r * 0.06, cy - r * 0.18, x + r * 0.05, cy - r * 0.18);
    g.lineBetween(x + r * 0.12, cy - r * 0.18, x + r * 0.23, cy - r * 0.18);
  }
  // Folded hands.
  g.fillStyle(dim(skin, 0.1), 0.9); g.fillCircle(x + r * 0.22, cy + r * 0.12, r * 0.12);
  // The bubble.
  g.fillStyle(0x9ae8f0, 0.1); g.fillCircle(x, cy, r);
  g.lineStyle(2, 0xc8f8ff, 0.45 + Math.sin(t * 2 + x) * 0.1); g.strokeCircle(x, cy, r);
  g.lineStyle(1, 0xffffff, 0.35);
  g.beginPath(); g.arc(x, cy, r * 0.82, Math.PI * 1.1, Math.PI * 1.45, false); g.strokePath();
  g.fillStyle(0xffffff, 0.55); g.fillEllipse(x - r * 0.45, cy - r * 0.5, r * 0.22, r * 0.12);
  // A thread of held breath rising off the top.
  for (let i = 0; i < 2; i++) {
    const ph = (t * 0.5 + i * 0.5 + x * 0.001) % 1;
    g.fillStyle(0xc8f8ff, (1 - ph) * 0.5); g.fillCircle(x + Math.sin(t * 2 + i) * 3, cy - r - ph * 40, 2 + ph * 2);
  }
}

/** Mother-of-pearl: iridescent scale tiles over a rect. */
export function nacre(g: G, x0: number, y0: number, w: number, h: number, size: number, rng: () => number): void {
  g.fillStyle(0x2a3038, 1); g.fillRect(x0, y0, w, h);
  for (let y = y0; y < y0 + h + size; y += size * 0.55) {
    const row = Math.round((y - y0) / (size * 0.55));
    for (let x = x0 - (row % 2) * size * 0.5; x < x0 + w + size; x += size) {
      const hue = rng();
      const c = hue < 0.33 ? mixC(PEARL, 0x9ad8e8, rng() * 0.4) : hue < 0.66 ? mixC(PEARL, PEARL_SHEEN, rng() * 0.5) : mixC(PEARL, 0xc8e8c8, rng() * 0.35);
      const cx = Phaser.Math.Clamp(x, x0 + size * 0.5, x0 + w - size * 0.5);
      const cy = Phaser.Math.Clamp(y, y0 + size * 0.3, y0 + h - size * 0.3);
      g.fillStyle(dim(c, 0.55), 1); g.fillEllipse(cx, cy, size, size * 0.7);
      g.fillStyle(dim(c, 0.3), 1); g.fillEllipse(cx, cy - 1, size * 0.86, size * 0.56);
      g.fillStyle(lit(c, 0.1), 0.35); g.fillEllipse(cx - size * 0.12, cy - size * 0.12, size * 0.3, size * 0.14);
    }
  }
}

/** Rippled sand — current-swept sea floor. */
export function rippledSand(g: G, x0: number, y0: number, w: number, h: number, rng: () => number): void {
  g.fillStyle(0x3a4a42, 1); g.fillRect(x0, y0, w, h);
  for (let i = 0; i < (w * h) / 6000; i++) {
    g.fillStyle(rng() < 0.5 ? 0x46564a : 0x2e3c36, 0.5); g.fillEllipse(x0 + rng() * w, y0 + rng() * h, 40 + rng() * 90, 12 + rng() * 20);
  }
  for (let y = y0 + 10; y < y0 + h; y += 16) {
    g.lineStyle(2, 0x556a5a, 0.45);
    g.beginPath();
    for (let x = x0; x <= x0 + w; x += 20) {
      const yy = y + Math.sin(x * 0.03 + y * 0.2) * 4;
      if (x === x0) g.moveTo(x, yy); else g.lineTo(x, yy);
    }
    g.strokePath();
  }
  for (let i = 0; i < (w * h) / 9000; i++) {
    g.fillStyle(PEARL, 0.25 + rng() * 0.3); g.fillCircle(x0 + rng() * w, y0 + rng() * h, 1 + rng() * 1.5);
  }
}

/** Caustics: wavering light from the surface, far above. Cheap enough for `animate`. */
export function caustics(g: G, x0: number, y0: number, w: number, h: number, t: number, n: number, alpha = 0.05): void {
  for (let i = 0; i < n; i++) {
    const fx = ((i * 0.618034) % 1), fy = ((i * 0.381966 * 3.7) % 1);
    const x = x0 + ((fx * w + Math.sin(t * 0.4 + i) * 40) % w + w) % w;
    const y = y0 + ((fy * h + Math.cos(t * 0.3 + i * 1.7) * 30) % h + h) % h;
    const s = 26 + Math.sin(t * 1.1 + i * 2.3) * 10;
    g.fillStyle(0xbff8ff, alpha * (0.6 + Math.sin(t * 1.7 + i) * 0.4));
    g.fillEllipse(x, y, s * 1.8, s * 0.7);
  }
}
