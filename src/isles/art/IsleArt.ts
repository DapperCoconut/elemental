import Phaser from 'phaser';
import type { Pt, Rect } from '../IslesTypes';

/**
 * Shared drawing primitives for the Ten Isles. Areas are still painted bespoke — these are the
 * bricks (a cobbled path, a roofed house, a rock, a lamp) so every court shares one hand while
 * looking nothing alike. Everything draws in world space into a Graphics you hand it.
 *
 * Style rules (match the game's rigs): soft dark outline under every solid shape, one light
 * edge on top, flat fills, no gradients except glow stacks.
 */

export type G = Phaser.GameObjects.Graphics;

export const mixC = (a: number, b: number, t: number): number => {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const k = Math.max(0, Math.min(1, t));
  return (Math.round(ar + (br - ar) * k) << 16) | (Math.round(ag + (bg - ag) * k) << 8) | Math.round(ab + (bb - ab) * k);
};
export const lit = (c: number, t: number): number => mixC(c, 0xffffff, t);
export const dim = (c: number, t: number): number => mixC(c, 0x000000, t);

export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// ── Ground ───────────────────────────────────────────────────────────

/** Fill a rect with a base colour and mottling — the canvas every area starts from. */
export function groundFill(g: G, r: Rect, base: number, alt: number, speck: number, rng: () => number, density = 1): void {
  g.fillStyle(base, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const area = (r.w * r.h) / 1e6;
  for (let i = 0; i < 40 * area * density; i++) {
    g.fillStyle(alt, 0.25 + rng() * 0.4);
    g.fillEllipse(r.x + rng() * r.w, r.y + rng() * r.h, 70 + rng() * 220, 34 + rng() * 100);
  }
  for (let i = 0; i < 18 * area * density; i++) {
    g.fillStyle(dim(base, 0.25), 0.2 + rng() * 0.25);
    g.fillEllipse(r.x + rng() * r.w, r.y + rng() * r.h, 60 + rng() * 150, 26 + rng() * 60);
  }
  for (let i = 0; i < 600 * area * density; i++) {
    g.fillStyle(speck, 0.08 + rng() * 0.22);
    g.fillRect(r.x + rng() * r.w, r.y + rng() * r.h, 1 + rng() * 2.5, 1 + rng() * 1.5);
  }
}

/** A soft-edged blob (puddle, patch of scorched earth, pond rim). */
export function blob(g: G, x: number, y: number, rx: number, ry: number, color: number, alpha: number, rng: () => number, lumps = 9): void {
  g.fillStyle(color, alpha);
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < lumps; i++) {
    const a = (i / lumps) * Math.PI * 2;
    const k = 0.78 + rng() * 0.35;
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k));
  }
  g.fillPoints(pts, true, true);
}

/** Thick polyline with rounded joints — roads, rivers, channels. */
export function stroke(g: G, pts: Pt[], w: number, color: number, alpha = 1): void {
  g.lineStyle(w, color, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();
  g.fillStyle(color, alpha);
  for (const p of pts) g.fillCircle(p.x, p.y, w / 2);
}

/** A road: dark kerb, fill, then cobbles scattered along it. */
export function road(g: G, pts: Pt[], w: number, fill: number, edge: number, stone: number, rng: () => number): void {
  stroke(g, pts, w + 12, edge);
  stroke(g, pts, w, fill);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.floor(len / 9);
    const ux = (b.x - a.x) / (len || 1), uy = (b.y - a.y) / (len || 1);
    for (let k = 0; k < n; k++) {
      const off = (rng() - 0.5) * w * 0.85;
      const x = a.x + ux * k * 9 - uy * off, y = a.y + uy * k * 9 + ux * off;
      g.fillStyle(rng() < 0.5 ? stone : lit(stone, 0.08), 0.55);
      g.fillRoundedRect(x - 4, y - 3, 7 + rng() * 3, 5 + rng() * 2, 2);
    }
  }
}

/** A grid of flagstones over a rect (plazas, halls). */
export function flagstones(g: G, r: Rect, size: number, fill: number, grout: number, rng: () => number): void {
  g.fillStyle(grout, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let y = r.y; y < r.y + r.h; y += size) {
    const shift = (Math.floor((y - r.y) / size) % 2) * size * 0.5;
    for (let x = r.x - shift; x < r.x + r.w; x += size) {
      const x0 = Math.max(r.x, x + 2), x1 = Math.min(r.x + r.w, x + size - 2);
      if (x1 <= x0) continue;
      g.fillStyle(mixC(fill, rng() < 0.5 ? 0x000000 : 0xffffff, rng() * 0.08), 1);
      g.fillRect(x0, y + 2, x1 - x0, Math.min(size - 4, r.y + r.h - y - 2));
    }
  }
}

/** Water / lava body with a lit rim. Animate the surface separately. */
export function pool(g: G, r: Rect, deep: number, shallow: number, rim: number, rng: () => number): void {
  g.fillStyle(rim, 1); g.fillRoundedRect(r.x - 8, r.y - 8, r.w + 16, r.h + 16, 26);
  g.fillStyle(shallow, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 22);
  g.fillStyle(deep, 1); g.fillRoundedRect(r.x + 14, r.y + 14, r.w - 28, r.h - 28, 18);
  for (let i = 0; i < (r.w * r.h) / 4000; i++) {
    g.fillStyle(lit(deep, 0.12), 0.3);
    g.fillEllipse(r.x + 20 + rng() * (r.w - 40), r.y + 20 + rng() * (r.h - 40), 20 + rng() * 40, 4 + rng() * 6);
  }
}

// ── Set pieces (draw at the piece's own y for sorting) ───────────────

/** Contact shadow under anything standing on the ground. */
export function shadow(g: G, x: number, y: number, w: number, h = w * 0.3, a = 0.32): void {
  g.fillStyle(0x000000, a); g.fillEllipse(x, y, w, h);
}

export interface HouseOpts {
  wall: number;
  roof: number;
  trim?: number;
  /** Window glow; 0 for dark windows. */
  glow?: number;
  roofStyle?: 'gable' | 'flat' | 'dome' | 'spire' | 'slant';
  chimney?: boolean;
  door?: number;
  /** Paint a branded sigil on the door (Brandmark). */
  brand?: boolean;
}

/**
 * A house seen three-quarters from the front: `x,y` is the middle of its front wall's base.
 * Returns the door point (where an NPC could stand).
 */
export function house(g: G, x: number, y: number, w: number, h: number, o: HouseOpts, rng: () => number): Pt {
  const trim = o.trim ?? dim(o.wall, 0.4);
  shadow(g, x, y + 4, w * 1.15, 22);
  // Wall
  g.fillStyle(dim(o.wall, 0.45), 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(o.wall, 1); g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle(lit(o.wall, 0.12), 1); g.fillRect(x - w / 2, y - h, w, 4);
  // Brick / plank texture
  for (let i = 0; i < (w * h) / 220; i++) {
    g.fillStyle(rng() < 0.5 ? dim(o.wall, 0.12) : lit(o.wall, 0.06), 0.5);
    g.fillRect(x - w / 2 + rng() * (w - 10), y - h + 6 + rng() * (h - 10), 8 + rng() * 6, 3);
  }
  // Roof
  const rs = o.roofStyle ?? 'gable';
  const rh = rs === 'flat' ? 10 : h * 0.55;
  g.fillStyle(dim(o.roof, 0.45), 1);
  if (rs === 'gable') {
    g.fillTriangle(x - w / 2 - 12, y - h + 2, x + w / 2 + 12, y - h + 2, x, y - h - rh - 4);
    g.fillStyle(o.roof, 1);
    g.fillTriangle(x - w / 2 - 8, y - h, x + w / 2 + 8, y - h, x, y - h - rh);
    g.lineStyle(2, lit(o.roof, 0.18), 1);
    for (let k = 1; k < 5; k++) {
      const t = k / 5;
      g.lineBetween(x - (w / 2 + 8) * (1 - t), y - h - rh * t, x + (w / 2 + 8) * (1 - t), y - h - rh * t);
    }
  } else if (rs === 'slant') {
    g.fillTriangle(x - w / 2 - 10, y - h + 2, x + w / 2 + 10, y - h + 2, x + w / 2 + 10, y - h - rh);
    g.fillStyle(o.roof, 1);
    g.fillTriangle(x - w / 2 - 6, y - h, x + w / 2 + 6, y - h, x + w / 2 + 6, y - h - rh + 4);
  } else if (rs === 'dome') {
    g.fillEllipse(x, y - h, w + 16, rh * 1.7);
    g.fillStyle(o.roof, 1); g.fillEllipse(x, y - h, w + 8, rh * 1.6);
    g.fillStyle(lit(o.roof, 0.2), 0.6); g.fillEllipse(x - w * 0.15, y - h - rh * 0.4, w * 0.35, rh * 0.4);
  } else if (rs === 'spire') {
    g.fillTriangle(x - w / 2 - 6, y - h + 2, x + w / 2 + 6, y - h + 2, x, y - h - rh * 2);
    g.fillStyle(o.roof, 1);
    g.fillTriangle(x - w / 2 - 2, y - h, x + w / 2 + 2, y - h, x, y - h - rh * 2 + 4);
  } else {
    g.fillRect(x - w / 2 - 6, y - h - 10, w + 12, 12);
    g.fillStyle(o.roof, 1); g.fillRect(x - w / 2 - 4, y - h - 10, w + 8, 9);
  }
  if (o.chimney) {
    const cx = x + w * 0.25;
    g.fillStyle(dim(o.wall, 0.5), 1); g.fillRect(cx - 7, y - h - rh * 0.9, 14, rh * 0.7);
    g.fillStyle(dim(o.wall, 0.2), 1); g.fillRect(cx - 9, y - h - rh * 0.95, 18, 6);
  }
  // Windows
  const glow = o.glow ?? 0;
  const wins = Math.max(1, Math.floor(w / 46));
  for (let i = 0; i < wins; i++) {
    const wx = x - w / 2 + (w / (wins + 1)) * (i + 1) + (i >= wins / 2 ? 12 : -12);
    const wy = y - h * 0.62;
    g.fillStyle(trim, 1); g.fillRect(wx - 9, wy - 9, 18, 18);
    if (glow) {
      g.fillStyle(glow, 0.12); g.fillCircle(wx, wy, 20);
      g.fillStyle(glow, 0.95); g.fillRect(wx - 7, wy - 7, 14, 14);
    } else {
      g.fillStyle(dim(o.wall, 0.7), 1); g.fillRect(wx - 7, wy - 7, 14, 14);
    }
    g.fillStyle(trim, 1); g.fillRect(wx - 1, wy - 7, 2, 14); g.fillRect(wx - 7, wy - 1, 14, 2);
  }
  // Door
  const door = o.door ?? dim(o.wall, 0.55);
  g.fillStyle(trim, 1); g.fillRoundedRect(x - 12, y - 32, 24, 32, { tl: 10, tr: 10, bl: 0, br: 0 });
  g.fillStyle(door, 1); g.fillRoundedRect(x - 10, y - 30, 20, 30, { tl: 9, tr: 9, bl: 0, br: 0 });
  g.fillStyle(lit(door, 0.4), 1); g.fillCircle(x + 5, y - 14, 1.6);
  if (o.brand) brandSigil(g, x, y - 18, 6, 0xff7a2f, 0.9);
  return { x, y: y + 16 };
}

/** King Ashgrave's sigil — a flame inside a broken ring. Brandmark paints it on everything. */
export function brandSigil(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  g.lineStyle(Math.max(1.5, r * 0.22), color, a);
  g.beginPath(); g.arc(x, y, r, -Math.PI * 0.35, Math.PI * 1.35, false); g.strokePath();
  g.fillStyle(color, a);
  g.fillTriangle(x - r * 0.45, y + r * 0.45, x + r * 0.45, y + r * 0.45, x, y - r * 0.75);
  g.fillCircle(x, y + r * 0.3, r * 0.42);
}

export function rock(g: G, x: number, y: number, s: number, color: number, rng: () => number): void {
  shadow(g, x, y + 2, s * 2.2, s * 0.7);
  const pts: Phaser.Geom.Point[] = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (i / (n - 1)) * Math.PI;
    const k = 0.75 + rng() * 0.3;
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * s * k, y + Math.sin(a) * s * 0.9 * k));
  }
  g.fillStyle(dim(color, 0.4), 1); g.fillPoints(pts, true, true);
  g.fillStyle(color, 1);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 0.9, y + (p.y - y) * 0.9 - 1)), true, true);
  g.fillStyle(lit(color, 0.2), 0.8); g.fillEllipse(x - s * 0.2, y - s * 0.55, s * 0.6, s * 0.25);
}

export function lamp(g: G, x: number, y: number, glow: number, metal = 0x2a2420): void {
  shadow(g, x, y, 18, 6);
  g.fillStyle(metal, 1); g.fillRect(x - 2, y - 46, 4, 46);
  g.fillRect(x - 6, y - 3, 12, 3);
  g.fillStyle(dim(metal, 0.3), 1); g.fillRect(x - 7, y - 58, 14, 13);
  g.fillStyle(glow, 0.9); g.fillRect(x - 5, y - 56, 10, 9);
  g.fillStyle(glow, 0.12); g.fillCircle(x, y - 52, 22);
}

/** Glow stack — use in `animate` for flicker, or once in a piece. */
export function glow(g: G, x: number, y: number, r: number, color: number, a = 0.06, layers = 4): void {
  for (let k = layers; k >= 1; k--) { g.fillStyle(color, a); g.fillCircle(x, y, r * (k / layers)); }
}

export function barrel(g: G, x: number, y: number, s: number, wood: number, band = 0x3a3a3a): void {
  shadow(g, x, y, s * 1.6, s * 0.5);
  g.fillStyle(dim(wood, 0.45), 1); g.fillRoundedRect(x - s * 0.7, y - s * 1.9, s * 1.4, s * 1.9, s * 0.3);
  g.fillStyle(wood, 1); g.fillRoundedRect(x - s * 0.62, y - s * 1.85, s * 1.24, s * 1.8, s * 0.28);
  g.fillStyle(band, 1); g.fillRect(x - s * 0.66, y - s * 1.55, s * 1.32, 3); g.fillRect(x - s * 0.66, y - s * 0.5, s * 1.32, 3);
  g.fillStyle(lit(wood, 0.25), 1); g.fillEllipse(x, y - s * 1.85, s * 1.2, s * 0.35);
}

export function crate(g: G, x: number, y: number, s: number, wood: number): void {
  shadow(g, x, y, s * 2.2, s * 0.6);
  g.fillStyle(dim(wood, 0.45), 1); g.fillRect(x - s - 1, y - s * 2 - 1, s * 2 + 2, s * 2 + 2);
  g.fillStyle(wood, 1); g.fillRect(x - s, y - s * 2, s * 2, s * 2);
  g.lineStyle(2, dim(wood, 0.3), 1);
  g.strokeRect(x - s + 3, y - s * 2 + 3, s * 2 - 6, s * 2 - 6);
  g.lineBetween(x - s + 3, y - s * 2 + 3, x + s - 3, y - 3);
}

export function fence(g: G, a: Pt, b: Pt, color: number): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(2, Math.floor(len / 22));
  g.lineStyle(3, dim(color, 0.3), 1);
  g.lineBetween(a.x, a.y - 12, b.x, b.y - 12);
  g.lineBetween(a.x, a.y - 22, b.x, b.y - 22);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    g.fillStyle(color, 1); g.fillRect(x - 2, y - 28, 4, 28);
  }
}

/** A tree. `kind` covers the isle's moods: a burnt snag, a pine, a round leafy crown. */
export function tree(g: G, x: number, y: number, s: number, kind: 'snag' | 'pine' | 'round' | 'palm', leaf: number, bark: number, rng: () => number): void {
  shadow(g, x, y + 2, s * 1.8, s * 0.5);
  if (kind === 'snag') {
    g.lineStyle(s * 0.28, bark, 1);
    g.lineBetween(x, y, x, y - s * 2.1);
    g.lineStyle(s * 0.14, bark, 1);
    for (let i = 0; i < 4; i++) {
      const hy = y - s * (0.9 + i * 0.3);
      const dir = i % 2 ? 1 : -1;
      g.lineBetween(x, hy, x + dir * s * (0.5 + rng() * 0.4), hy - s * (0.3 + rng() * 0.3));
    }
    g.fillStyle(0xff6a1a, 0.6); g.fillCircle(x + 1, y - s * 2.1, 2);
    return;
  }
  g.fillStyle(dim(bark, 0.2), 1); g.fillRect(x - s * 0.12, y - s * 1.1, s * 0.24, s * 1.1);
  if (kind === 'pine') {
    for (let k = 0; k < 3; k++) {
      const ty = y - s * (0.7 + k * 0.55);
      const tw = s * (1.1 - k * 0.28);
      g.fillStyle(dim(leaf, 0.35), 1); g.fillTriangle(x - tw - 2, ty + 2, x + tw + 2, ty + 2, x, ty - s * 0.9);
      g.fillStyle(leaf, 1); g.fillTriangle(x - tw, ty, x + tw, ty, x, ty - s * 0.85);
    }
  } else if (kind === 'palm') {
    g.lineStyle(s * 0.18, bark, 1);
    g.lineBetween(x, y, x + s * 0.3, y - s * 2);
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.55;
      g.lineStyle(s * 0.16, leaf, 1);
      g.lineBetween(x + s * 0.3, y - s * 2, x + s * 0.3 + Math.cos(a) * s * 1.1, y - s * 2 + Math.sin(a) * s * 0.7 + s * 0.4);
    }
  } else {
    g.fillStyle(dim(leaf, 0.35), 1); g.fillCircle(x, y - s * 1.55, s * 0.95);
    g.fillStyle(leaf, 1); g.fillCircle(x - s * 0.1, y - s * 1.6, s * 0.85);
    g.fillStyle(lit(leaf, 0.15), 1); g.fillCircle(x - s * 0.3, y - s * 1.85, s * 0.4);
  }
}

/** A banner on a pole, cloth colour + an emblem drawer. */
export function banner(g: G, x: number, y: number, cloth: number, pole = 0x3a2e24, emblem?: (g: G, cx: number, cy: number) => void): void {
  shadow(g, x, y, 14, 5);
  g.fillStyle(pole, 1); g.fillRect(x - 2, y - 80, 4, 80);
  g.fillStyle(lit(pole, 0.3), 1); g.fillCircle(x, y - 82, 4);
  g.fillStyle(dim(cloth, 0.35), 1);
  g.fillTriangle(x + 2, y - 76, x + 30, y - 76, x + 16, y - 30);
  g.fillRect(x + 2, y - 76, 28, 30);
  g.fillStyle(cloth, 1); g.fillRect(x + 3, y - 75, 25, 32);
  g.fillTriangle(x + 3, y - 44, x + 28, y - 44, x + 15, y - 34);
  emblem?.(g, x + 15, y - 58);
}

/** An arched gate in a wall — for court boundaries and the prince's manor. */
export function archway(g: G, x: number, y: number, w: number, h: number, stone: number): void {
  shadow(g, x, y + 3, w * 1.4, 18);
  g.fillStyle(dim(stone, 0.4), 1);
  g.fillRect(x - w / 2 - 16, y - h - 18, 18, h + 18);
  g.fillRect(x + w / 2 - 2, y - h - 18, 18, h + 18);
  g.fillStyle(stone, 1);
  g.fillRect(x - w / 2 - 14, y - h - 16, 14, h + 16);
  g.fillRect(x + w / 2, y - h - 16, 14, h + 16);
  g.lineStyle(14, stone, 1);
  g.beginPath(); g.arc(x, y - h, w / 2 + 7, Math.PI, 0, false); g.strokePath();
  g.lineStyle(2, lit(stone, 0.2), 1);
  g.beginPath(); g.arc(x, y - h, w / 2 + 13, Math.PI, 0, false); g.strokePath();
}

/** Ash, embers, sparks — tiny falling motes inside a view rect. Use from `animateOver`. */
export function motes(g: G, view: Rect, t: number, n: number, color: number, fall: number, sway: number, size: number, seed = 0): void {
  for (let i = 0; i < n; i++) {
    const s = (i * 9301 + seed * 49297) % 233280;
    const fx = (s / 233280);
    const fy = ((s * 7) % 1000) / 1000;
    const x = view.x + ((fx * view.w + Math.sin(t * 0.7 + i) * sway) % view.w + view.w) % view.w;
    const y = view.y + ((fy * view.h + t * fall) % view.h + view.h) % view.h;
    g.fillStyle(color, 0.35 + ((i * 13) % 10) / 20);
    g.fillCircle(x, y, size * (0.6 + ((i * 7) % 5) / 6));
  }
}
