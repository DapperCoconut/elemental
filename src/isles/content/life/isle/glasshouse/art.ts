import { type G, dim, lit, mixC } from '../../../../art/IsleArt';

/**
 * Shared drawing for the Glasshouse — the Empress's sigil, her iron-and-glass architecture,
 * roses, clipped hedges, the giant shears, and the pruned: whole families grafted alive into
 * her topiary, still breathing. Used by the dungeon, the warden floor, the warden gimmicks and
 * the Empress herself, so the palace is painted in one hand.
 */

// ── Palette — wrought iron gone green, old glass, clipped yew, roses and the Empress's verdigris ──

export const IRON = 0x1e2a26;
export const IRON_LIT = 0x3e544a;
/** Copper and bronze weathered to green — her colour, and her name. */
export const VERDIGRIS = 0x4ab89a;
export const VERDIGRIS_DEEP = 0x1e6a5a;
export const GLASS = 0xbfeee0;
export const GLASS_DARK = 0x2a4a44;
export const YEW = 0x1e4a26;
export const YEW_LIT = 0x3a7a3a;
export const LEAF = 0x5aa83a;
export const ROSE = 0xd8344a;
export const ROSE_DEEP = 0x7a1426;
export const ROSE_PALE = 0xf0a8b8;
export const SOIL = 0x2e2016;
export const TERRACOTTA = 0xb8643a;
export const BRASS = 0xd8b45a;
export const SAP = 0xe8d870;
export const BARK = 0x4a3422;

/**
 * Empress Verdigra's sigil — a single rose held in the closed blades of a pair of shears. It is
 * stamped on every tithe-scale, every plant label in the Glasshouse and every pruned family's
 * tag, hung on a wire round the neck of what used to be them.
 */
export function verdigraSigil(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  // The closed blades, crossing at the pivot below the rose.
  g.lineStyle(Math.max(1.4, r * 0.15), color, a);
  g.lineBetween(x - r * 0.55, y + r * 0.85, x + r * 0.22, y - r * 0.55);
  g.lineBetween(x + r * 0.55, y + r * 0.85, x - r * 0.22, y - r * 0.55);
  // Handle loops.
  g.strokeCircle(x - r * 0.62, y + r * 0.95, r * 0.18);
  g.strokeCircle(x + r * 0.62, y + r * 0.95, r * 0.18);
  g.fillStyle(color, a); g.fillCircle(x, y + r * 0.25, r * 0.09);
  // The rose caught between the tips: three rings of petals.
  const ry = y - r * 0.45;
  for (let k = 0; k < 5; k++) {
    const ang = (k / 5) * Math.PI * 2 - Math.PI / 2;
    g.fillCircle(x + Math.cos(ang) * r * 0.2, ry + Math.sin(ang) * r * 0.18, r * 0.16);
  }
  g.lineStyle(Math.max(1, r * 0.08), dim(color, 0.5), a);
  g.beginPath(); g.arc(x, ry, r * 0.11, 0, Math.PI * 1.6, false); g.strokePath();
}

/** One rose: a cupped head of petals spiralling to a dark heart, two leaves under it. */
export function rose(g: G, x: number, y: number, r: number, color = ROSE, open = 1): void {
  g.fillStyle(YEW_LIT, 1);
  g.fillEllipse(x - r * 0.9, y + r * 0.5, r * 1.1, r * 0.5);
  g.fillEllipse(x + r * 0.9, y + r * 0.55, r * 1.1, r * 0.5);
  const petals = 6;
  g.fillStyle(dim(color, 0.35), 1);
  for (let k = 0; k < petals; k++) {
    const a = (k / petals) * Math.PI * 2;
    g.fillCircle(x + Math.cos(a) * r * 0.55 * open, y + Math.sin(a) * r * 0.45 * open, r * 0.55);
  }
  g.fillStyle(color, 1); g.fillCircle(x, y, r * (0.55 + open * 0.2));
  g.fillStyle(lit(color, 0.18), 1); g.fillCircle(x - r * 0.12, y - r * 0.12, r * 0.42);
  g.lineStyle(Math.max(1, r * 0.14), dim(color, 0.5), 1);
  g.beginPath(); g.arc(x, y, r * 0.3, 0.3, 0.3 + Math.PI * 1.5, false); g.strokePath();
  g.beginPath(); g.arc(x + r * 0.05, y + r * 0.02, r * 0.13, 2, 2 + Math.PI * 1.4, false); g.strokePath();
}

/**
 * A pair of giant topiary shears: two long blades on a brass pivot with wooden handles. `a` is
 * the direction the blades point; `open` is the half-angle between them in radians.
 */
export function shears(g: G, px: number, py: number, a: number, open: number, len: number, alpha = 1): void {
  for (const side of [-1, 1]) {
    const ba = a + side * open;
    const ca = Math.cos(ba), sa = Math.sin(ba);
    const nx = -sa, ny = ca;
    const tipX = px + ca * len, tipY = py + sa * len;
    // The blade: a long tapering wedge, ground edge on the inside.
    const w = len * 0.07;
    g.fillStyle(0x6a7a80, alpha);
    g.fillTriangle(px + nx * w, py + ny * w, px - nx * w * 0.4, py - ny * w * 0.4, tipX, tipY);
    g.fillStyle(0xd8e4e8, alpha);
    const ex = -side * nx, ey = -side * ny;
    g.fillTriangle(px + ex * w * 0.5, py + ey * w * 0.5, px, py, tipX, tipY);
    g.lineStyle(1.5, 0x2a3236, alpha); g.lineBetween(px + nx * w, py + ny * w, tipX, tipY);
    // The handle, behind the pivot.
    const hx = px - Math.cos(a - side * open * 0.6) * len * 0.42, hy = py - Math.sin(a - side * open * 0.6) * len * 0.42;
    g.lineStyle(Math.max(4, len * 0.06), 0x3a2414, alpha); g.lineBetween(px, py, hx, hy);
    g.lineStyle(Math.max(2, len * 0.03), 0x7a5232, alpha); g.lineBetween(px, py, hx, hy);
    g.fillStyle(0x2a1a0e, alpha); g.fillCircle(hx, hy, Math.max(3, len * 0.04));
  }
  g.fillStyle(0x3a2a12, alpha); g.fillCircle(px, py, Math.max(4, len * 0.05));
  g.fillStyle(BRASS, alpha); g.fillCircle(px, py, Math.max(2.5, len * 0.032));
}

/**
 * One of the pruned: a person grafted into a clipped hedge, as the Empress keeps them. The hedge
 * is shaped to their outline; the face shows through the leaves, eyes shut, and the leaves rise
 * and fall with the breath. A tithe-tag on a wire hangs at the neck. `free` 0–1 — how far the
 * hedge has let go of them (the leaves fall away from the face and arms, eyes open).
 */
export function graftedSubject(g: G, x: number, y: number, s: number, t: number, skin: number, free = 0): void {
  const breathe = 1 + Math.sin(t * 1.3 + x * 0.013) * 0.025;
  const H = 70 * s, W = 30 * s * breathe;
  // The clipped hedge-body: a rounded column with a ball of a head.
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y, W * 1.8, 12 * s);
  g.fillStyle(dim(YEW, 0.3), 1); g.fillRoundedRect(x - W * 0.6, y - H * 0.7, W * 1.2, H * 0.7, 10 * s);
  g.fillStyle(YEW, 1); g.fillRoundedRect(x - W * 0.55, y - H * 0.68, W * 1.1, H * 0.66, 9 * s);
  // Clipped-leaf texture.
  for (let i = 0; i < 10; i++) {
    const lx = x - W * 0.45 + ((i * 37) % 10) / 10 * W * 0.9;
    const ly = y - H * 0.62 + ((i * 53) % 10) / 10 * H * 0.56;
    g.fillStyle(i % 2 ? YEW_LIT : lit(YEW, 0.08), 0.9); g.fillEllipse(lx, ly, 6 * s, 4 * s);
  }
  // Arms, held in the hedge — or coming out of it.
  for (const side of [-1, 1]) {
    const ax = x + side * W * (0.55 + free * 0.15), ay = y - H * 0.5;
    g.fillStyle(free > 0.4 ? skin : YEW, 1); g.fillEllipse(ax, ay + 4 * s, 9 * s, 22 * s);
    if (free > 0.4) { g.fillStyle(YEW_LIT, 0.8); g.fillEllipse(ax, ay - 4 * s, 9 * s, 7 * s); }
  }
  // The head: a clipped ball of yew with the face showing through.
  const hy = y - H * 0.82;
  g.fillStyle(dim(YEW, 0.3), 1); g.fillCircle(x, hy, 15 * s * breathe);
  g.fillStyle(YEW, 1); g.fillCircle(x, hy - 1, 14 * s * breathe);
  const fr = (7 + free * 4) * s;
  g.fillStyle(skin, 1); g.fillEllipse(x, hy + 1 * s, fr * 1.4, fr * 1.6);
  g.fillStyle(YEW_LIT, 0.9);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    g.fillEllipse(x + Math.cos(a) * fr * 0.8, hy + Math.sin(a) * fr * 0.9, 5 * s, 3.5 * s);
  }
  if (free > 0.5) {
    g.fillStyle(0xf0f8e8, 1); g.fillCircle(x - 2.6 * s, hy, 1.6 * s); g.fillCircle(x + 2.6 * s, hy, 1.6 * s);
    g.fillStyle(0x1a2a1a, 1); g.fillCircle(x - 2.6 * s, hy, 0.8 * s); g.fillCircle(x + 2.6 * s, hy, 0.8 * s);
  } else {
    g.lineStyle(1, dim(skin, 0.5), 1);
    g.lineBetween(x - 4 * s, hy, x - 1.4 * s, hy); g.lineBetween(x + 1.4 * s, hy, x + 4 * s, hy);
  }
  // The graft-scar: a bound union at the neck, raffia round it.
  g.lineStyle(2.5 * s, 0xc8a868, 1); g.lineBetween(x - 7 * s, hy + 13 * s, x + 7 * s, hy + 13 * s);
  // The tithe-tag on its wire.
  g.lineStyle(1, 0x8a8a7a, 0.9); g.lineBetween(x, hy + 13 * s, x + 4 * s, hy + 22 * s);
  g.fillStyle(0xe8e0c8, 1); g.fillRect(x + 1 * s, hy + 22 * s, 8 * s, 5 * s);
  g.fillStyle(ROSE_DEEP, 1); g.fillRect(x + 2 * s, hy + 23.5 * s, 3 * s, 2 * s);
  // The breath: a faint puff of pollen on the out-breath.
  const ph = (t * 0.4 + x * 0.002) % 1;
  if (free < 0.5 && ph < 0.4) { g.fillStyle(SAP, (0.4 - ph) * 0.8); g.fillCircle(x + 2 * s, hy - 4 * s - ph * 30 * s, 2 * s); }
  // Fallen leaves at the feet once they are coming free.
  if (free > 0) {
    for (let i = 0; i < 6; i++) { g.fillStyle(YEW_LIT, 0.7 * free); g.fillEllipse(x - 18 * s + i * 7 * s, y - 2, 5 * s, 2.5 * s); }
  }
}

/** A wrought-iron glasshouse rib: a riveted girder with a scroll at the foot. */
export function ironRib(g: G, x1: number, y1: number, x2: number, y2: number, w = 8): void {
  g.lineStyle(w + 3, dim(IRON, 0.4), 1); g.lineBetween(x1, y1, x2, y2);
  g.lineStyle(w, IRON, 1); g.lineBetween(x1, y1, x2, y2);
  g.lineStyle(Math.max(1, w * 0.25), VERDIGRIS_DEEP, 0.9); g.lineBetween(x1, y1, x2, y2);
  const len = Math.hypot(x2 - x1, y2 - y1);
  const n = Math.max(1, Math.floor(len / 26));
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    g.fillStyle(IRON_LIT, 1); g.fillCircle(x1 + (x2 - x1) * k, y1 + (y2 - y1) * k, Math.max(1.2, w * 0.18));
  }
}

/** A pane of old glass, faintly green, a highlight streak across it. `crack` draws it broken. */
export function glassPane(g: G, x: number, y: number, w: number, h: number, a = 1, crack = false): void {
  g.fillStyle(GLASS_DARK, 0.55 * a); g.fillRect(x, y, w, h);
  g.fillStyle(GLASS, 0.1 * a); g.fillRect(x + 2, y + 2, w - 4, h - 4);
  g.lineStyle(1, GLASS, 0.3 * a);
  g.lineBetween(x + w * 0.15, y + h * 0.85, x + w * 0.55, y + h * 0.1);
  g.lineBetween(x + w * 0.3, y + h * 0.9, x + w * 0.62, y + h * 0.35);
  g.lineStyle(2, IRON, a); g.strokeRect(x, y, w, h);
  if (crack) {
    g.lineStyle(1, 0xffffff, 0.5 * a);
    const cx = x + w * 0.4, cy = y + h * 0.45;
    for (let k = 0; k < 5; k++) {
      const ang = k * 1.3 + 0.4;
      g.lineBetween(cx, cy, cx + Math.cos(ang) * w * 0.5, cy + Math.sin(ang) * h * 0.5);
    }
  }
}

/** A run of clipped hedge — a block of yew with a flat top, lit along its crown. */
export function hedge(g: G, x: number, y: number, w: number, h: number, depth: number, rng: () => number): void {
  g.fillStyle(0x000000, 0.35); g.fillRect(x + 4, y + h - 2, w, 8);
  g.fillStyle(dim(YEW, 0.35), 1); g.fillRect(x, y - depth, w, h + depth);
  g.fillStyle(YEW, 1); g.fillRect(x, y - depth, w, depth + 4);
  g.fillStyle(YEW_LIT, 1); g.fillRect(x, y - depth, w, 3);
  for (let i = 0; i < (w * (h + depth)) / 90; i++) {
    g.fillStyle(rng() < 0.5 ? YEW_LIT : dim(YEW, 0.15), 0.6);
    g.fillEllipse(x + rng() * w, y - depth + rng() * (h + depth), 5, 3);
  }
}

/** A coil of bramble along a line, hooked thorns standing off it. */
export function bramble(g: G, x1: number, y1: number, x2: number, y2: number, t: number, color = 0x4a6a2a, alpha = 1): void {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / (len || 1), uy = (y2 - y1) / (len || 1);
  const nx = -uy, ny = ux;
  const n = Math.max(3, Math.floor(len / 10));
  let px = x1, py = y1;
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    const wob = Math.sin(k * 9 + t * 2) * 5;
    const x = x1 + ux * len * k + nx * wob, y = y1 + uy * len * k + ny * wob;
    g.lineStyle(3, color, alpha); g.lineBetween(px, py, x, y);
    if (i % 2 === 0) {
      const s = i % 4 === 0 ? 1 : -1;
      g.fillStyle(0xe8d8b0, alpha);
      g.fillTriangle(x, y, x + nx * s * 7 + ux * 3, y + ny * s * 7 + uy * 3, x + ux * 4, y + uy * 4);
    }
    px = x; py = y;
  }
}

/** A brass growing-lamp hanging on its chain, a green-gold cone of light under it when `on`. */
export function growLamp(g: G, x: number, y: number, on: boolean, t: number, reach = 90): void {
  g.lineStyle(1.5, 0x5a5040, 1); g.lineBetween(x, y - 60, x, y - 22);
  if (on) {
    g.fillStyle(SAP, 0.06 + Math.sin(t * 3 + x) * 0.015);
    g.fillTriangle(x - 12, y - 14, x + 12, y - 14, x + reach * 0.6, y + reach);
    g.fillTriangle(x - 12, y - 14, x - reach * 0.6, y + reach, x + reach * 0.6, y + reach);
  }
  g.fillStyle(0x3a2e12, 1); g.fillTriangle(x - 14, y - 12, x + 14, y - 12, x, y - 28);
  g.fillStyle(BRASS, 1); g.fillTriangle(x - 12, y - 13, x + 12, y - 13, x, y - 26);
  g.fillStyle(on ? 0xfff4b0 : 0x4a4a3a, 1); g.fillEllipse(x, y - 12, 16, 6);
}

/** A potted seedling in a terracotta pot (stock of the Nursery). */
export function seedlingPot(g: G, x: number, y: number, s: number, leaf = LEAF): void {
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 1, 20 * s, 6 * s);
  g.fillStyle(dim(TERRACOTTA, 0.3), 1); g.fillRect(x - 8 * s, y - 13 * s, 16 * s, 3 * s);
  g.fillStyle(TERRACOTTA, 1);
  g.fillTriangle(x - 7 * s, y - 10 * s, x + 7 * s, y - 10 * s, x + 5 * s, y);
  g.fillTriangle(x - 7 * s, y - 10 * s, x + 5 * s, y, x - 5 * s, y);
  g.lineStyle(1.5 * s, mixC(leaf, 0x000000, 0.3), 1); g.lineBetween(x, y - 12 * s, x, y - 22 * s);
  g.fillStyle(leaf, 1); g.fillEllipse(x - 4 * s, y - 22 * s, 8 * s, 4 * s); g.fillEllipse(x + 4 * s, y - 24 * s, 8 * s, 4 * s);
}
