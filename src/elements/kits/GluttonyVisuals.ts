import Phaser from 'phaser';
import { ArmGesture, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Wood draws. (The element id is still `gluttony` — it has been the chef and then the
 * scarecrow before this — so the file and the classes keep that name; the character is a birch ent.)
 *
 * Wood is a birch: pale papery bark, the black horizontal marks birches carry, and the birch's
 * famous **eye scars** — the almond-shaped black knots a fallen branch leaves, with a chevron of
 * dark bark arched over them like a brow. That scar is the element's primitive (`eyeScar`): the
 * ent's own eyes are two of them, every tree around the arena watches out of them, and the
 * carverang has one carved into its elbow. The second material is **sap** — amber, lit from
 * inside — which is the element's resource: it glows in the ent's cracks, coats the boomerang,
 * and gums up whoever chews through it.
 *
 * Every colour goes through the `tint` mapper so a skin can remap the palette in one table.
 */

export type WoodColorFn = ColorFn;

export const WOOD = {
  /** The bottom of the ladder — inside a knot-hole, the pupil of an eye scar. */
  ink: 0x0e0b09,
  /** Birch bark, dark to light. The body, the hands, the trunks. */
  barkDark: 0x1d1a17,
  bark: 0x3b342c,
  birchShadow: 0xa9a291,
  birch: 0xd9d3c3,
  birchLit: 0xf4f0e4,
  /** Carved wood — the carverang, the scythe's snath, the cup's saucer rim. */
  woodDark: 0x4a301b,
  wood: 0x7a5230,
  woodLit: 0xa8743f,
  /** Sap / amber, dark to hot. */
  amberDeep: 0x8a4b07,
  amber: 0xd98a1c,
  amberLit: 0xf6b84a,
  sapGlow: 0xffe08a,
  /** Leaves. Autumn is the mastered crown. */
  leafDark: 0x2f5a22,
  leaf: 0x5f9a3a,
  leafLit: 0x9ccf5a,
  autumn: 0xe0a21e,
  autumnLit: 0xffd36a,
  /** The scythe blade. */
  steelDark: 0x3a3d43,
  steel: 0x8a8f96,
  steelLit: 0xe1e5ea,
  /** Oakbrew and its cup. */
  tea: 0x8a5a2b,
  teaLit: 0xc08a4a,
  porcelain: 0xf1efe8,
  porcelainShade: 0xbcc3cc,
  /** Friend of the Forest. */
  apple: 0xd2302c,
  appleLit: 0xff6b5a,
  /** Sprouts — the cutest thing in the game, until they are pruned. */
  sprout: 0x7ccc4a,
  sproutLit: 0xb8f07a,
  sproutDark: 0x3f8a2a,
  blush: 0xff8fa8,
  white: 0xffffff,
  /** A pruned sprout's corpse. */
  grayDark: 0x5d5d5d,
  gray: 0x8b8b8b,
  grayLit: 0xb9b9b9,
};

const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

/** Deterministic 0–1 noise, so a trunk keeps its bark marks every frame. */
export function wjit(seed: number, i: number): number {
  const v = Math.sin(seed * 61.7 + i * 91.3) * 24571.117;
  return v - Math.floor(v);
}

// ── The primitive: a birch eye scar ──────────────────────────────────────────

/**
 * A birch's eye: an almond knot of black bark `w` wide and `h` tall, with the chevron "brow" a
 * fallen branch leaves arched over it. `open` 0..1 narrows the almond (a blink); `lookX/lookY`
 * (-1..1) push the amber glint inside toward where it is looking; `glow` 0..1 lights that glint.
 */
export function eyeScar(
  g: Phaser.GameObjects.Graphics, tint: WoodColorFn, x: number, y: number, w: number, h: number,
  open: number, lookX: number, lookY: number, alpha: number, glow = 0,
): void {
  const hh = Math.max(0.5, h * open);
  // The brow: a shallow Λ of dark bark either side of the scar's top.
  g.lineStyle(Math.max(1, h * 0.35), tint(WOOD.barkDark), alpha * 0.9);
  g.beginPath();
  g.moveTo(x - w * 1.05, y - h * 0.1);
  g.lineTo(x, y - h * 1.25);
  g.lineTo(x + w * 1.05, y - h * 0.1);
  g.strokePath();
  // The almond.
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    const ax = x - w + u * w * 2;
    pts.push(P(ax, y - Math.sin(u * Math.PI) * hh));
  }
  for (let i = 12; i >= 0; i--) {
    const u = i / 12;
    const ax = x - w + u * w * 2;
    pts.push(P(ax, y + Math.sin(u * Math.PI) * hh * 0.8));
  }
  g.fillStyle(tint(WOOD.barkDark), alpha);
  g.fillPoints(pts, true);
  g.fillStyle(tint(WOOD.ink), alpha);
  g.fillEllipse(x, y, w * 1.3, hh * 1.2);
  if (open > 0.3) {
    const gx = x + lookX * w * 0.45;
    const gy = y + lookY * hh * 0.3;
    if (glow > 0) {
      g.fillStyle(tint(WOOD.amber), alpha * glow * 0.45);
      g.fillCircle(gx, gy, Math.max(1.2, h * 0.75));
    }
    g.fillStyle(tint(glow > 0 ? WOOD.amberLit : WOOD.bark), alpha * (0.55 + glow * 0.45));
    g.fillCircle(gx, gy, Math.max(0.7, h * 0.32));
  }
}

/** Black horizontal bark marks across a birch surface — the lenticels. Deterministic by `seed`. */
function barkMarks(
  g: Phaser.GameObjects.Graphics, tint: WoodColorFn, x: number, y0: number, y1: number, halfW: (y: number) => number,
  seed: number, alpha: number,
): void {
  const n = Math.max(2, Math.floor((y1 - y0) / 7));
  for (let i = 0; i < n; i++) {
    const y = y0 + ((i + 0.3 + wjit(seed, i) * 0.5) / n) * (y1 - y0);
    const hw = halfW(y);
    const len = hw * (0.35 + wjit(seed, i + 40) * 0.8);
    const off = (wjit(seed, i + 80) - 0.5) * hw * 0.9;
    g.lineStyle(1 + wjit(seed, i + 120) * 1.4, tint(WOOD.barkDark), alpha * 0.85);
    g.lineBetween(x + off - len * 0.5, y, x + off + len * 0.5, y + (wjit(seed, i + 160) - 0.5) * 0.8);
  }
}

// ── Haunting Hollows: the trees around the arena ─────────────────────────────

export interface TreeLook {
  /** Where its eyes are turned, world space; undefined = drift. */
  lookX?: number;
  lookY?: number;
}

/**
 * One birch of the ring: a pale trunk rising from (x, baseY) to `height`, black bark marks, one
 * or two eye scars that blink and turn toward `look`, a thin crown of twigs and leaves, and roots
 * flaring at the base. `apple` hangs a Friend of the Forest apple off its lowest branch.
 */
export function birchTree(
  g: Phaser.GameObjects.Graphics, tint: WoodColorFn, x: number, baseY: number, height: number, seed: number,
  t: number, alpha: number, look: TreeLook, apple = false,
): void {
  const top = baseY - height;
  const sway = Math.sin(t * 0.8 + seed) * 2.2;
  const half = (y: number): number => 6.5 - 2.5 * ((baseY - y) / height);
  // Ground shadow and roots.
  g.fillStyle(tint(WOOD.ink), alpha * 0.28);
  g.fillEllipse(x + 4, baseY + 2, 30, 8);
  g.lineStyle(3, tint(WOOD.birchShadow), alpha);
  g.lineBetween(x - 4, baseY - 4, x - 11, baseY + 2);
  g.lineBetween(x + 4, baseY - 4, x + 12, baseY + 1);
  g.lineStyle(1.2, tint(WOOD.barkDark), alpha * 0.6);
  g.lineBetween(x - 6, baseY - 2, x - 10, baseY + 1.5);
  // Trunk: shadowed side, body, lit side — a bend toward the top from the sway.
  const trunk = (shrink: number, color: number, a: number, dx = 0): void => {
    const L: Phaser.Geom.Point[] = [];
    const R: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      const y = baseY - u * height;
      const bx = x + sway * u * u + dx;
      const w = half(y) - shrink;
      L.push(P(bx - w, y));
      R.push(P(bx + w, y));
    }
    g.fillStyle(tint(color), a);
    g.fillPoints([...L, ...R.reverse()], true);
  };
  trunk(-1.2, WOOD.barkDark, alpha * 0.9);
  trunk(0, WOOD.birchShadow, alpha);
  trunk(1.6, WOOD.birch, alpha, -0.8);
  trunk(4, WOOD.birchLit, alpha * 0.8, -2);
  barkMarks(g, tint, x + sway * 0.3, top + 8, baseY - 4, half, seed, alpha);
  // The eyes: a pair on most trees, set one above the other the way birch scars fall, one on the rest.
  const blink = (t * 0.7 + wjit(seed, 7) * 9) % 5.5 < 0.14 ? 0.1 : 1;
  const eyes = wjit(seed, 3) > 0.3 ? 2 : 1;
  for (let i = 0; i < eyes; i++) {
    const u = 0.4 + i * 0.24 + wjit(seed, 11 + i) * 0.06;
    const ey = baseY - u * height;
    const ex = x + sway * u * u + (eyes === 2 ? (i ? 1 : -1) : 0);
    let lx = Math.sin(t * 0.4 + seed + i) * 0.5;
    let ly = 0;
    if (look.lookX !== undefined && look.lookY !== undefined) {
      const a = Math.atan2(look.lookY - ey, look.lookX - ex);
      lx = Math.cos(a);
      ly = Math.sin(a);
    }
    eyeScar(g, tint, ex, ey, 5.6, 3, blink, lx, ly, alpha, 0.45);
  }
  // Crown: slender birch twigs arching out of the top and drooping, with small leaf sprays
  // hanging off the ends — weeping, not a lollipop.
  const tx = x + sway;
  for (let i = 0; i < 5; i++) {
    const side = i % 2 ? 1 : -1;
    const a = -Math.PI / 2 + side * (0.35 + (i >> 1) * 0.45) + Math.sin(t * 1.2 + seed + i) * 0.05;
    const len = 10 + wjit(seed, 20 + i) * 7;
    const mx = tx + Math.cos(a) * len;
    const my = top + 4 + Math.sin(a) * len;
    const ex = mx + side * 4;
    const ey = my + 5 + (i >> 1) * 2;
    g.lineStyle(1.6, tint(WOOD.bark), alpha);
    g.beginPath();
    g.moveTo(tx, top + 4);
    g.lineTo(mx, my);
    g.lineTo(ex, ey);
    g.strokePath();
    for (let k = 0; k < 3; k++) {
      const lx = mx + (ex - mx) * (k / 2) + side * 1.5;
      const ly = my + (ey - my) * (k / 2) + 2;
      g.fillStyle(tint(k === 1 ? WOOD.leafLit : WOOD.leaf), alpha * 0.95);
      g.fillEllipse(lx, ly, 4.4, 2.6);
    }
  }
  // A low side branch, the way birches keep one or two down the trunk.
  const by = baseY - height * (0.72 + wjit(seed, 30) * 0.1);
  const bs = wjit(seed, 31) > 0.5 ? 1 : -1;
  g.lineStyle(1.4, tint(WOOD.bark), alpha);
  g.lineBetween(x + sway * 0.5 + bs * 4, by, x + sway * 0.5 + bs * 13, by - 6);
  g.fillStyle(tint(WOOD.leaf), alpha);
  g.fillEllipse(x + sway * 0.5 + bs * 14, by - 4, 5, 3);
  if (apple) {
    const ax = x + sway * 0.5 + 9;
    const ay = baseY - height * 0.62 + Math.sin(t * 2 + seed) * 0.8;
    g.lineStyle(1.4, tint(WOOD.bark), alpha);
    g.lineBetween(x + sway * 0.4 + 4, ay - 7, ax, ay - 4);
    appleShape(g, tint, ax, ay, 4.4, alpha);
  }
}

/** Where a tree stood: a cut stump, and a sapling growing back as `regrow` runs 0..1. */
export function birchStump(
  g: Phaser.GameObjects.Graphics, tint: WoodColorFn, x: number, baseY: number, regrow: number, t: number, alpha: number,
): void {
  g.fillStyle(tint(WOOD.ink), alpha * 0.25);
  g.fillEllipse(x + 3, baseY + 2, 24, 7);
  g.fillStyle(tint(WOOD.birchShadow), alpha);
  g.fillRect(x - 6, baseY - 9, 12, 9);
  g.fillStyle(tint(WOOD.birch), alpha);
  g.fillRect(x - 4.5, baseY - 9, 7, 9);
  g.fillStyle(tint(WOOD.woodLit), alpha);
  g.fillEllipse(x, baseY - 9, 12, 4.5);
  g.lineStyle(0.8, tint(WOOD.wood), alpha);
  g.strokeEllipse(x, baseY - 9, 7, 2.6);
  g.strokeEllipse(x, baseY - 9, 3, 1.2);
  if (regrow > 0.05) {
    const h = 6 + regrow * 22;
    const s = Math.sin(t * 2) * 1.2;
    g.lineStyle(1.6, tint(WOOD.birch), alpha);
    g.lineBetween(x + 6, baseY - 4, x + 6 + s, baseY - 4 - h);
    leafPair(g, tint, x + 6 + s, baseY - 4 - h, 2 + regrow * 3, -Math.PI / 2, alpha);
  }
}

/** Two leaves off one stem tip, pointing roughly along `ang`. */
export function leafPair(
  g: Phaser.GameObjects.Graphics, tint: WoodColorFn, x: number, y: number, size: number, ang: number, alpha: number,
  gold = false,
): void {
  for (const side of [-1, 1]) {
    const a = ang + side * 0.7;
    const cx = x + Math.cos(a) * size * 0.9;
    const cy = y + Math.sin(a) * size * 0.9;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const pts = [
      P(x, y),
      P(cx - s * size * 0.55, cy + c * size * 0.55),
      P(x + c * size * 2, y + s * size * 2),
      P(cx + s * size * 0.55, cy - c * size * 0.55),
    ];
    g.fillStyle(tint(gold ? WOOD.autumn : WOOD.leaf), alpha);
    g.fillPoints(pts, true);
    g.lineStyle(0.8, tint(gold ? WOOD.autumnLit : WOOD.leafLit), alpha * 0.8);
    g.lineBetween(x, y, x + c * size * 1.7, y + s * size * 1.7);
  }
}

/** A red apple with a leaf and a shine. */
export function appleShape(g: Phaser.GameObjects.Graphics, tint: WoodColorFn, x: number, y: number, r: number, alpha: number): void {
  g.fillStyle(tint(WOOD.ink), alpha * 0.5);
  g.fillCircle(x + 0.6, y + 0.8, r + 0.8);
  g.fillStyle(tint(WOOD.apple), alpha);
  g.fillCircle(x - r * 0.35, y, r * 0.85);
  g.fillCircle(x + r * 0.35, y, r * 0.85);
  g.fillCircle(x, y + r * 0.2, r * 0.9);
  g.fillStyle(tint(WOOD.appleLit), alpha * 0.9);
  g.fillCircle(x - r * 0.4, y - r * 0.3, r * 0.32);
  g.lineStyle(1.2, tint(WOOD.bark), alpha);
  g.lineBetween(x, y - r * 0.7, x + 0.6, y - r * 1.3);
  g.fillStyle(tint(WOOD.leaf), alpha);
  g.fillEllipse(x + r * 0.55, y - r * 1.1, r * 0.9, r * 0.45);
}

// ── Click: the carverang ─────────────────────────────────────────────────────

/**
 * A big carved wooden boomerang spinning at `rot`: two broad arms meeting at an elbow with an eye
 * scar carved into it, grain lines down each arm. `amber` 0..1 (Click+ Amber Edge) runs golden
 * amber over the arms from the tips in, glowing as it thickens.
 */
export function carverangShape(
  g: Phaser.GameObjects.Graphics, tint: WoodColorFn, x: number, y: number, rot: number, size: number, alpha: number,
  amber = 0,
): void {
  const arm = (a: number, color: number, w: number, len: number, al: number): Phaser.Geom.Point[] => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    const pts = [
      P(x - s * w, y + c * w),
      P(x + c * len * 0.55 - s * w * 1.1, y + s * len * 0.55 + c * w * 1.1),
      P(x + c * len - s * w * 0.55, y + s * len + c * w * 0.55),
      P(x + c * len * 1.04, y + s * len * 1.04),
      P(x + c * len + s * w * 0.55, y + s * len - c * w * 0.55),
      P(x + c * len * 0.55 + s * w * 0.6, y + s * len * 0.55 - c * w * 0.6),
      P(x + s * w * 0.4, y - c * w * 0.4),
    ];
    g.fillStyle(tint(color), al);
    g.fillPoints(pts, true);
    return pts;
  };
  const a0 = rot;
  const a1 = rot + 1.95;
  // Shadow on the floor.
  g.fillStyle(tint(WOOD.ink), alpha * 0.22);
  g.fillEllipse(x + 4, y + 14, size * 2.2, size * 0.7);
  if (amber > 0.05) {
    g.fillStyle(tint(WOOD.amber), alpha * amber * 0.3);
    g.fillCircle(x, y, size * (1.2 + amber * 0.3));
  }
  for (const a of [a0, a1]) arm(a, WOOD.woodDark, size * 0.42, size * 1.08, alpha);
  for (const a of [a0, a1]) arm(a, WOOD.wood, size * 0.32, size, alpha);
  // Grain down each arm and a lit upper edge.
  for (const a of [a0, a1]) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    g.lineStyle(1, tint(WOOD.woodDark), alpha * 0.8);
    g.lineBetween(x + c * size * 0.2, y + s * size * 0.2, x + c * size * 0.85, y + s * size * 0.85);
    g.lineStyle(1, tint(WOOD.woodLit), alpha * 0.8);
    g.lineBetween(x + c * size * 0.15 + s * size * 0.18, y + s * size * 0.15 - c * size * 0.18,
      x + c * size * 0.9 + s * size * 0.08, y + s * size * 0.9 - c * size * 0.08);
    if (amber > 0.05) {
      // Amber runs from the tip toward the elbow.
      const from = 1 - amber * 0.85;
      g.lineStyle(size * 0.38, tint(WOOD.amber), alpha * 0.9);
      g.lineBetween(x + c * size * from, y + s * size * from, x + c * size * 0.98, y + s * size * 0.98);
      g.lineStyle(size * 0.14, tint(WOOD.sapGlow), alpha * (0.5 + amber * 0.5));
      g.lineBetween(x + c * size * (from + 0.05), y + s * size * (from + 0.05), x + c * size * 0.94, y + s * size * 0.94);
    }
  }
  eyeScar(g, tint, x, y, size * 0.26, size * 0.13, 1, Math.cos(rot), Math.sin(rot), alpha, amber);
}

/** The carverang's wake: chips of bark light falling off the path it has flown. */
export function carverangTrail(
  g: Phaser.GameObjects.Graphics, tint: WoodColorFn, pts: { x: number; y: number }[], alpha: number, amber = 0,
): void {
  for (let i = 1; i < pts.length; i++) {
    const u = i / pts.length;
    g.lineStyle(2 + u * 6, tint(amber > 0.2 ? WOOD.amber : WOOD.birchShadow), alpha * u * 0.35);
    g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
  }
}

// ── E: Oakbrew ───────────────────────────────────────────────────────────────

/**
 * A porcelain teacup of oakbrew on a little saucer, steaming. `cook` 0..1 (E+ Brewmaster, held)
 * darkens the tea toward amber and thickens the steam; `tilt` tips it toward the mouth.
 */
export function teacup(
  g: Phaser.GameObjects.Graphics, tint: WoodColorFn, x: number, y: number, size: number, tilt: number, t: number,
  alpha: number, cook = 0,
): void {
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  const W = (lx: number, ly: number): Phaser.Geom.Point => P(x + lx * c - ly * s, y + lx * s + ly * c);
  // Saucer.
  g.fillStyle(tint(WOOD.porcelainShade), alpha);
  g.fillEllipse(x, y + size * 0.55, size * 2.2, size * 0.55);
  // Cup body.
  g.fillStyle(tint(WOOD.porcelain), alpha);
  g.fillPoints([W(-size, -size * 0.45), W(size, -size * 0.45), W(size * 0.7, size * 0.45), W(-size * 0.7, size * 0.45)], true);
  // Handle.
  const h = W(size * 1.15, 0);
  g.lineStyle(size * 0.22, tint(WOOD.porcelain), alpha);
  g.strokeCircle(h.x, h.y, size * 0.32);
  // A little painted leaf band.
  g.lineStyle(size * 0.12, tint(WOOD.leaf), alpha * 0.8);
  const b0 = W(-size * 0.85, -size * 0.05);
  const b1 = W(size * 0.85, -size * 0.05);
  g.lineBetween(b0.x, b0.y, b1.x, b1.y);
  // The tea's surface.
  const top = W(0, -size * 0.45);
  g.fillStyle(tint(cook > 0.5 ? WOOD.amber : WOOD.tea), alpha);
  g.fillEllipse(top.x, top.y, size * 1.8, size * 0.42);
  g.fillStyle(tint(cook > 0 ? WOOD.sapGlow : WOOD.teaLit), alpha * (0.35 + cook * 0.5));
  g.fillEllipse(top.x - size * 0.3, top.y - size * 0.05, size * 0.6, size * 0.14);
  // Steam: two curls rising and fading.
  const wisps = 2 + Math.round(cook * 2);
  for (let i = 0; i < wisps; i++) {
    const u = (t * 0.8 + i / wisps) % 1;
    const sx = top.x + (i - (wisps - 1) / 2) * size * 0.45 + Math.sin(u * 6 + i) * size * 0.25;
    const sy = top.y - size * 0.3 - u * size * 2.2;
    g.fillStyle(tint(cook > 0.5 ? WOOD.sapGlow : WOOD.birchLit), alpha * (1 - u) * (0.35 + cook * 0.3));
    g.fillCircle(sx, sy, size * (0.18 + u * 0.22));
  }
}

// ── R+: sprouts ──────────────────────────────────────────────────────────────

/**
 * A sprout — round, bright, bouncing, with a two-leaf top, enormous shiny eyes, rosy cheeks and a
 * tiny smile. `scale` grows it with its health (sprouts have no maximum).
 */
export function sproutShape(
  g: Phaser.GameObjects.Graphics, tint: WoodColorFn, x: number, y: number, scale: number, t: number, alpha: number,
  hurt = 0,
): void {
  const bounce = Math.abs(Math.sin(t * 3.4)) * 2.2 * scale;
  const squish = 1 + Math.sin(t * 6.8) * 0.05;
  const r = 7 * scale;
  const by = y - r - bounce;
  g.fillStyle(tint(WOOD.ink), alpha * 0.25);
  g.fillEllipse(x, y + 1, r * 2.2 * (1 - bounce * 0.02), r * 0.6);
  // Stem and leaves.
  const sw = Math.sin(t * 2.5) * 0.18;
  g.lineStyle(1.6 * scale, tint(WOOD.sproutDark), alpha);
  g.lineBetween(x, by - r * 0.85, x + sw * r, by - r * 1.6);
  leafPair(g, tint, x + sw * r, by - r * 1.6, r * 0.55, -Math.PI / 2 + sw, alpha);
  // Body.
  g.fillStyle(tint(WOOD.sproutDark), alpha);
  g.fillEllipse(x, by, r * 2.15 * squish, r * 2.05 / squish);
  g.fillStyle(tint(hurt > 0 ? WOOD.appleLit : WOOD.sprout), alpha);
  g.fillEllipse(x, by, r * 1.95 * squish, r * 1.85 / squish);
  g.fillStyle(tint(WOOD.sproutLit), alpha * 0.85);
  g.fillEllipse(x - r * 0.35, by - r * 0.45, r * 0.8, r * 0.5);
  // Big shiny eyes.
  for (const side of [-1, 1]) {
    const ex = x + side * r * 0.38;
    const ey = by - r * 0.05;
    g.fillStyle(tint(WOOD.ink), alpha);
    g.fillEllipse(ex, ey, r * 0.5, r * 0.62);
    g.fillStyle(tint(WOOD.white), alpha);
    g.fillCircle(ex - r * 0.08, ey - r * 0.14, r * 0.14);
    g.fillCircle(ex + r * 0.1, ey + r * 0.1, r * 0.06);
  }
  // Cheeks and smile.
  g.fillStyle(tint(WOOD.blush), alpha * 0.7);
  g.fillEllipse(x - r * 0.68, by + r * 0.3, r * 0.4, r * 0.22);
  g.fillEllipse(x + r * 0.68, by + r * 0.3, r * 0.4, r * 0.22);
  g.lineStyle(Math.max(0.8, r * 0.12), tint(WOOD.ink), alpha);
  g.beginPath();
  g.arc(x, by + r * 0.28, r * 0.2, 0.2, Math.PI - 0.2, false);
  g.strokePath();
}

/**
 * Q+ Prune's aftermath: a sprout cut clean in half along `ang`, the halves fallen apart, gone grey,
 * eyes crossed out. It never leaves.
 */
export function sproutCorpse(
  g: Phaser.GameObjects.Graphics, tint: WoodColorFn, x: number, y: number, scale: number, ang: number, alpha: number,
): void {
  const r = 7 * scale;
  const n = ang + Math.PI / 2;
  const c = Math.cos(n);
  const s = Math.sin(n);
  g.fillStyle(tint(WOOD.ink), alpha * 0.2);
  g.fillEllipse(x, y + 1, r * 3.2, r * 0.7);
  for (const side of [-1, 1]) {
    const hx = x + c * side * r * 0.95;
    const hy = y - r * 0.6 + s * side * r * 0.45;
    const a0 = Math.atan2(s * side, c * side) - Math.PI / 2;
    g.fillStyle(tint(WOOD.grayDark), alpha);
    g.slice(hx, hy, r * 1.02, a0, a0 + Math.PI, false);
    g.fillPath();
    g.fillStyle(tint(WOOD.gray), alpha);
    g.slice(hx, hy, r * 0.9, a0, a0 + Math.PI, false);
    g.fillPath();
    // The cut face.
    g.lineStyle(1.2, tint(WOOD.grayLit), alpha);
    g.lineBetween(hx + Math.cos(a0) * r, hy + Math.sin(a0) * r, hx - Math.cos(a0) * r, hy - Math.sin(a0) * r);
    // One crossed-out eye per half.
    const ex = hx + c * side * r * 0.35;
    const ey = hy - r * 0.1;
    g.lineStyle(1, tint(WOOD.grayDark), alpha);
    g.lineBetween(ex - r * 0.16, ey - r * 0.16, ex + r * 0.16, ey + r * 0.16);
    g.lineBetween(ex - r * 0.16, ey + r * 0.16, ex + r * 0.16, ey - r * 0.16);
  }
  // The leaves, dropped and grey.
  g.fillStyle(tint(WOOD.grayLit), alpha * 0.8);
  g.fillEllipse(x + c * r * 1.6, y - 1 + s * r * 0.4, r * 0.8, r * 0.35);
  g.fillEllipse(x - c * r * 1.4, y + s * r * 0.3, r * 0.7, r * 0.3);
}

// ── F: Digest ────────────────────────────────────────────────────────────────

/**
 * The digest aura on the ground: a ring of roots turning slowly around the ent, leaves budding on
 * it, a soft green-amber light inside, and sap motes rising. `k` fades it in/out.
 */
export function digestAura(
  g: Phaser.GameObjects.Graphics, tint: WoodColorFn, x: number, y: number, r: number, t: number, k: number,
): void {
  if (k <= 0.01) return;
  g.fillStyle(tint(WOOD.leaf), k * 0.1);
  g.fillCircle(x, y, r);
  g.fillStyle(tint(WOOD.amber), k * 0.07);
  g.fillCircle(x, y, r * 0.65);
  // Root ring: two braided strands.
  for (let strand = 0; strand < 2; strand++) {
    g.lineStyle(3 - strand, tint(strand ? WOOD.woodLit : WOOD.wood), k * 0.85);
    g.beginPath();
    const seg = Math.max(28, Math.round(r / 3));
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * TAU + t * 0.25 * (strand ? -1 : 1);
      const rr = r + Math.sin(a * 7 + t + strand * Math.PI) * 3.2;
      if (i === 0) g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      else g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.strokePath();
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + t * 0.25;
    leafPair(g, tint, x + Math.cos(a) * r, y + Math.sin(a) * r, 3.2, a, k * 0.9);
  }
  for (let i = 0; i < 10; i++) {
    const u = (t * 0.45 + i / 10) % 1;
    const a = i * 2.4;
    const d = r * (0.2 + wjit(i, 5) * 0.7);
    g.fillStyle(tint(i % 2 ? WOOD.sapGlow : WOOD.leafLit), k * (1 - u) * 0.85);
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d - u * 34, 1.8 - u);
  }
}

// ── Debuffs on a victim ──────────────────────────────────────────────────────

/** Tainted (Final Harvest): amber cracks running over the body and a little birch-leaf brand. */
export function taintMark(
  g: Phaser.GameObjects.Graphics, tint: WoodColorFn, x: number, y: number, t: number, alpha: number,
): void {
  const pulse = 0.6 + 0.4 * Math.sin(t * 3);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26 + 0.4;
    const x0 = x + Math.cos(a) * 6;
    const y0 = y + Math.sin(a) * 6;
    const x1 = x + Math.cos(a + 0.25) * 15;
    const y1 = y + Math.sin(a + 0.25) * 15;
    const x2 = x + Math.cos(a - 0.1) * 21;
    const y2 = y + Math.sin(a - 0.1) * 21;
    g.lineStyle(2.2, tint(WOOD.amberDeep), alpha * 0.7);
    g.lineBetween(x0, y0, x1, y1);
    g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(1, tint(WOOD.amberLit), alpha * pulse);
    g.lineBetween(x0, y0, x1, y1);
    g.lineBetween(x1, y1, x2, y2);
  }
  leafPair(g, tint, x, y - 30, 3, -Math.PI / 2, alpha * 0.9, true);
}

/** Gummed up in sap (slowed by chewing through Sap HP): amber goo at the feet, drips and strands. */
export function sapGoo(g: Phaser.GameObjects.Graphics, tint: WoodColorFn, x: number, y: number, t: number, alpha: number): void {
  g.fillStyle(tint(WOOD.amberDeep), alpha * 0.55);
  g.fillEllipse(x, y + 17, 40, 12);
  g.fillStyle(tint(WOOD.amber), alpha * 0.7);
  g.fillEllipse(x - 2, y + 16, 30, 8);
  g.fillStyle(tint(WOOD.sapGlow), alpha * 0.6);
  g.fillEllipse(x - 7, y + 14.5, 8, 2.4);
  for (let i = 0; i < 3; i++) {
    const sx = x - 12 + i * 12;
    const u = (t * 0.9 + i * 0.33) % 1;
    g.lineStyle(1.6, tint(WOOD.amber), alpha * 0.8);
    g.lineBetween(sx, y + 4, sx, y + 4 + u * 10);
    g.fillStyle(tint(WOOD.amberLit), alpha * (1 - u));
    g.fillCircle(sx, y + 4 + u * 10, 1.6);
  }
}

// ── Q: the scythe ────────────────────────────────────────────────────────────

/**
 * The great scythe: a bowed birch snath with two grips, a steel collar lashed with a vine, and a
 * long curved blade. `curl` defaults to `side`; the rig passes the opposite so the blade can arc
 * down over the far shoulder while it is worn on the back.
 */
export function scytheShape(
  g: Phaser.GameObjects.Graphics, tint: WoodColorFn, gx: number, gy: number, shaftAng: number, len: number,
  bladeLen: number, side: number, alpha: number, edgeGlow = 0, curl = side,
): void {
  const c = Math.cos(shaftAng);
  const s = Math.sin(shaftAng);
  const N = 8;
  const shaft: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const bow = Math.sin(u * Math.PI) * len * 0.07 * side;
    shaft.push(P(gx + c * u * len - s * bow, gy + s * u * len + c * bow));
  }
  const stroke = (w: number, color: number, a: number, dx = 0, dy = 0): void => {
    g.lineStyle(w, color, a);
    g.beginPath();
    g.moveTo(shaft[0].x + dx, shaft[0].y + dy);
    for (let i = 1; i < shaft.length; i++) g.lineTo(shaft[i].x + dx, shaft[i].y + dy);
    g.strokePath();
  };
  stroke(5, tint(WOOD.barkDark), alpha);
  stroke(3.2, tint(WOOD.birch), alpha);
  stroke(1, tint(WOOD.birchLit), alpha * 0.75, -s * 0.9, c * 0.9);
  // Birch marks on the snath.
  for (let i = 1; i < N; i += 2) {
    const p = shaft[i];
    g.lineStyle(1.4, tint(WOOD.barkDark), alpha * 0.85);
    g.lineBetween(p.x - s * 1.6, p.y + c * 1.6, p.x + s * 1.6, p.y - c * 1.6);
  }
  for (const u of [0.36, 0.62]) {
    const p = shaft[Math.round(u * N)];
    const nx = s * side;
    const ny = -c * side;
    const nl = len * 0.13;
    g.lineStyle(3.4, tint(WOOD.barkDark), alpha);
    g.lineBetween(p.x, p.y, p.x + nx * nl, p.y + ny * nl);
    g.lineStyle(2, tint(WOOD.woodLit), alpha);
    g.lineBetween(p.x, p.y, p.x + nx * nl, p.y + ny * nl);
  }
  const E = shaft[N];
  g.fillStyle(tint(WOOD.steel), alpha);
  g.fillCircle(E.x, E.y, 3.8);
  g.fillStyle(tint(WOOD.steelDark), alpha);
  g.fillCircle(E.x, E.y, 2.2);
  // A vine lashed round the collar, one leaf on it.
  g.lineStyle(1.3, tint(WOOD.leafDark), alpha);
  g.lineBetween(E.x - c * 4 - s * 3.5, E.y - s * 4 + c * 3.5, E.x - c * 7 + s * 3.5, E.y - s * 7 - c * 3.5);
  g.lineBetween(E.x - c * 6 - s * 3.5, E.y - s * 6 + c * 3.5, E.x - c * 9 + s * 3.5, E.y - s * 9 - c * 3.5);
  leafPair(g, tint, E.x - c * 8, E.y - s * 8, 2.2, shaftAng + Math.PI * 0.6, alpha);
  const perp = shaftAng + side * Math.PI / 2;
  const M = 14;
  const spine: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= M; i++) {
    const u = i / M;
    const a = perp - curl * u * 0.95;
    spine.push(P(E.x + Math.cos(a) * bladeLen * u, E.y + Math.sin(a) * bladeLen * u));
  }
  const back: Phaser.Geom.Point[] = [];
  const edge: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= M; i++) {
    const u = i / M;
    const p0 = spine[Math.max(0, i - 1)];
    const p1 = spine[Math.min(M, i + 1)];
    const tl = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
    let nx = -(p1.y - p0.y) / tl;
    let ny = (p1.x - p0.x) / tl;
    if (nx * c + ny * s > 0) { nx = -nx; ny = -ny; }
    const heel = Math.min(1, u * 6);
    const thick = (bladeLen * 0.24 * (1 - u) * (1 + 0.35 * Math.sin(u * Math.PI)) + 0.8) * heel;
    const sp = spine[i];
    back.push(P(sp.x - nx * thick * 0.3, sp.y - ny * thick * 0.3));
    edge.push(P(sp.x + nx * thick, sp.y + ny * thick));
  }
  g.lineStyle(2.2, tint(WOOD.ink), alpha);
  g.strokePoints([...back, ...edge.slice().reverse()], true);
  g.fillStyle(tint(WOOD.steelDark), alpha);
  g.fillPoints([...back, ...edge.slice().reverse()], true);
  g.fillStyle(tint(WOOD.steel), alpha * 0.75);
  g.fillPoints([...back.slice(0, 11), ...edge.slice(0, 11).map((e, i) => P((e.x + back[i].x) / 2, (e.y + back[i].y) / 2)).reverse()], true);
  g.lineStyle(1.8, tint(WOOD.steelLit), alpha);
  g.beginPath();
  g.moveTo(edge[1].x, edge[1].y);
  for (let i = 2; i < edge.length; i++) g.lineTo(edge[i].x, edge[i].y);
  g.strokePath();
  if (edgeGlow > 0) {
    g.lineStyle(3 + edgeGlow * 3, tint(WOOD.amberLit), alpha * edgeGlow * 0.6);
    g.beginPath();
    g.moveTo(edge[1].x, edge[1].y);
    for (let i = 2; i < edge.length; i++) g.lineTo(edge[i].x, edge[i].y);
    g.strokePath();
  }
}

// ── WoodFx — one-shot effects ────────────────────────────────────────────────

export class WoodFx extends FxBase {
  /** Jittered ring that scales its segment count with its radius. */
  ring(x: number, y: number, r0: number, r1: number, ms: number, color: number, width: number, depth: number): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      const r = r0 + (r1 - r0) * easeOut(t);
      const seg = Math.max(18, Math.round(r / 3));
      g.lineStyle(width * (1 - t * 0.6), this.tint(color), (1 - t) * 0.85);
      g.beginPath();
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * TAU;
        const rr = r * (1 + (wjit(seed, i % seg) - 0.5) * 0.08);
        if (i === 0) g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        else g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.strokePath();
    });
  }

  /** Bark chips and splinters flung out of a point (birch-white chips with dark undersides). */
  splinters(x: number, y: number, count: number, spread: number, ms = 480, depth = 9, dir?: number): void {
    const bits = Array.from({ length: count }, () => ({
      a: dir === undefined ? Math.random() * TAU : dir + (Math.random() - 0.5) * 1.6,
      d: spread * (0.5 + Math.random() * 0.7), r: 1.6 + Math.random() * 2.4, spin: Math.random() * 9,
      wood: Math.random() < 0.4,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const b of bits) {
        const bx = x + Math.cos(b.a) * b.d * e;
        const by = y + Math.sin(b.a) * b.d * e + t * t * 16;
        const ang = b.spin + t * 8;
        const c = Math.cos(ang) * b.r * 1.6;
        const s = Math.sin(ang) * b.r * 1.6;
        g.lineStyle(b.r, this.tint(b.wood ? WOOD.wood : WOOD.birch), 1 - t);
        g.lineBetween(bx - c, by - s, bx + c, by + s);
        g.lineStyle(b.r * 0.4, this.tint(WOOD.barkDark), (1 - t) * 0.8);
        g.lineBetween(bx - c * 0.4, by - s * 0.4, bx + c * 0.4, by + s * 0.4);
      }
    });
  }

  /** Leaves bursting out and drifting down. */
  leaves(x: number, y: number, count: number, spread: number, ms = 900, depth = 9, gold = false): void {
    const bits = Array.from({ length: count }, () => ({
      a: Math.random() * TAU, d: spread * (0.4 + Math.random() * 0.8), s: Math.random() * 9, size: 2.4 + Math.random() * 2,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const b of bits) {
        const bx = x + Math.cos(b.a) * b.d * e + Math.sin(t * 6 + b.s) * 4;
        const by = y + Math.sin(b.a) * b.d * e * 0.7 + t * 22;
        leafPair(g, this.tint, bx, by, b.size * (1 - t * 0.3), b.s + t * 4, 1 - t, gold);
      }
    });
  }

  /** Sap welling up: amber motes drawn in to a point, a counter of how much. */
  sapGain(x: number, y: number, amount: number): void {
    const n = Phaser.Math.Clamp(Math.round(amount / 6), 4, 16);
    const bits = Array.from({ length: n }, (_, i) => ({ a: (i / n) * TAU + Math.random() * 0.4, d: 26 + Math.random() * 20 }));
    this.anim(10, 520, (g, t) => {
      const e = easeIn(t);
      for (const b of bits) {
        const bx = x + Math.cos(b.a) * b.d * (1 - e);
        const by = y + Math.sin(b.a) * b.d * (1 - e);
        g.fillStyle(this.tint(WOOD.amber), (1 - t * 0.5) * 0.9);
        g.fillCircle(bx, by, 2.6 * (1 - t * 0.5));
        g.fillStyle(this.tint(WOOD.sapGlow), 1 - t * 0.5);
        g.fillCircle(bx - 0.6, by - 0.6, 1.1);
      }
    });
    this.ring(x, y, 22, 6, 420, WOOD.amberLit, 3, 10);
  }

  /** Sap torn off and stuck to an attacker's feet. */
  sapSplash(fromX: number, fromY: number, toX: number, toY: number): void {
    this.anim(9, 380, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 5; i++) {
        const u = Math.max(0, e - i * 0.06);
        const bx = fromX + (toX - fromX) * u + Math.sin(i * 2.1) * 6;
        const by = fromY + (toY - fromY) * u - Math.sin(u * Math.PI) * 18;
        g.fillStyle(this.tint(WOOD.amber), 1 - t * 0.6);
        g.fillCircle(bx, by, 2.8 - i * 0.3);
      }
    });
  }

  // ── Click ──

  carveThrow(x: number, y: number, ang: number): void {
    this.anim(9, 220, (g, t) => {
      g.lineStyle(3 * (1 - t) + 1, this.tint(WOOD.birchLit), (1 - t) * 0.8);
      g.beginPath();
      g.arc(x, y, 10 + t * 14, ang - 1.1, ang + 1.1, false);
      g.strokePath();
    });
    this.splinters(x, y, 3, 14, 280, 9, ang);
  }

  carveHit(x: number, y: number, ang: number, amber: number): void {
    this.flashIn(x, y, 12, amber > 0.3 ? WOOD.sapGlow : WOOD.birchLit, amber > 0.3 ? WOOD.amber : WOOD.woodLit, 11);
    this.splinters(x, y, 6 + Math.round(amber * 6), 26, 420, 11, ang);
    this.anim(11, 260, (g, t) => {
      const c = Math.cos(ang + Math.PI / 2);
      const s = Math.sin(ang + Math.PI / 2);
      const L = 14 + t * 5;
      g.lineStyle(4 * (1 - t) + 1, this.tint(amber > 0.3 ? WOOD.amberLit : WOOD.birchLit), 1 - t);
      g.lineBetween(x - c * L, y - s * L, x + c * L, y + s * L);
    });
  }

  carveCatch(x: number, y: number): void {
    this.anim(9, 200, (g, t) => {
      g.fillStyle(this.tint(WOOD.woodLit), (1 - t) * 0.5);
      g.fillCircle(x, y, 6 + t * 8);
    });
  }

  /** The re-carve: a returning carverang caught mid-air by the next throw and sent back out. */
  recarve(x: number, y: number, side: number): void {
    this.flashIn(x, y, 16, WOOD.sapGlow, WOOD.amber, 11);
    this.ring(x, y, 6, 46, 380, WOOD.amberLit, 4, 11);
    this.anim(10, 360, (g, t) => {
      g.lineStyle(4 * (1 - t) + 1, this.tint(WOOD.amberLit), (1 - t) * 0.9);
      g.beginPath();
      const a0 = t * TAU * side;
      g.arc(x, y, 22 + t * 8, a0, a0 + Math.PI * 1.4, side < 0);
      g.strokePath();
    });
    this.leaves(x, y, 5, 26, 600, 10);
  }

  arcSwap(x: number, y: number, side: number): void {
    this.anim(12, 420, (g, t) => {
      g.lineStyle(2.4, this.tint(WOOD.woodLit), (1 - t) * 0.9);
      g.beginPath();
      const a0 = -Math.PI / 2;
      g.arc(x, y, 9, a0, a0 + side * 4.4 * easeOut(t), side < 0);
      g.strokePath();
    });
  }

  // ── E ──

  /** The sip: steam blown off the cup, a ring of amber light settling into the bark. */
  brewSip(x: number, y: number, cook: number): void {
    this.ring(x, y, 12, 40 + cook * 20, 520, WOOD.amberLit, 3 + cook * 2, 10);
    this.anim(10, 700, (g, t) => {
      for (let i = 0; i < 6 + Math.round(cook * 6); i++) {
        const a = i * 1.1;
        const u = Math.min(1, t * 1.3);
        g.fillStyle(this.tint(i % 2 ? WOOD.birchLit : WOOD.sapGlow), (1 - t) * 0.6);
        g.fillCircle(x + Math.cos(a) * (8 + u * 18), y - 18 - u * 26 + Math.sin(a) * 4, 2.4 + u * 2);
      }
    });
    this.sapGain(x, y, 25 + cook * 35);
  }

  /** E+ Brewmaster lost: the cup knocked out of the hand and the tea splashed on the floor. */
  brewSpill(x: number, y: number): void {
    this.anim(9, 600, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(WOOD.tea), (1 - t) * 0.8);
      g.fillEllipse(x + 6, y + 16, 10 + e * 22, 4 + e * 6);
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.4;
        g.fillStyle(this.tint(WOOD.teaLit), 1 - t);
        g.fillCircle(x + Math.cos(a) * e * 24, y - 10 + Math.sin(a) * e * 16 + t * t * 30, 2);
      }
      teacup(g, this.tint, x + e * 18, y - 8 + t * t * 26, 5, t * 5, 0, 1 - t);
    });
  }

  /** A teammate's share of the brew (E+): a steaming swirl landing on them. */
  brewShare(fromX: number, fromY: number, toX: number, toY: number): void {
    this.anim(10, 460, (g, t) => {
      const e = easeOut(t);
      const bx = fromX + (toX - fromX) * e;
      const by = fromY + (toY - fromY) * e - Math.sin(e * Math.PI) * 24;
      g.fillStyle(this.tint(WOOD.amberLit), 1 - t * 0.4);
      g.fillCircle(bx, by, 4);
      g.fillStyle(this.tint(WOOD.birchLit), (1 - t) * 0.5);
      g.fillCircle(bx - 3, by - 5, 3);
    });
    this.scene.time.delayedCall(460, () => this.sapGain(toX, toY, 20));
  }

  // ── R ──

  /** Sinking into the ground: roots close over the spot where the ent stood. */
  rootSink(x: number, y: number): void {
    this.anim(9, 520, (g, t) => {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + 0.3;
        const r0 = 30 * (1 - easeOut(t));
        g.lineStyle(3.2 - t * 1.8, this.tint(i % 2 ? WOOD.wood : WOOD.birchShadow), 1 - t * 0.7);
        g.lineBetween(x + Math.cos(a) * 34, y + Math.sin(a) * 22 + 10, x + Math.cos(a + 0.5) * r0, y + Math.sin(a + 0.5) * r0 * 0.6 + 10);
      }
      g.fillStyle(this.tint(WOOD.ink), (1 - t) * 0.4);
      g.fillEllipse(x, y + 10, 40 * (1 - t * 0.5), 14 * (1 - t * 0.5));
    });
    this.leaves(x, y, 6, 30, 700, 9);
  }

  /** A tree splitting open from the inside and the ent stepping out of it. */
  treeBurst(x: number, baseY: number, height: number): void {
    this.anim(10, 560, (g, t) => {
      const e = easeOut(t);
      for (const side of [-1, 1]) {
        const lean = side * e * 0.9;
        const tx = x + Math.sin(lean) * height;
        const ty = baseY - Math.cos(lean) * height;
        g.lineStyle(10 * (1 - t * 0.4), this.tint(WOOD.birchShadow), 1 - t);
        g.lineBetween(x + side * 3, baseY, tx, ty + t * 30);
        g.lineStyle(6 * (1 - t * 0.4), this.tint(WOOD.birch), 1 - t);
        g.lineBetween(x + side * 3, baseY, tx, ty + t * 30);
      }
    });
    this.splinters(x, baseY - height * 0.4, 14, 50, 620, 10);
    this.leaves(x, baseY - height, 10, 40, 1000, 10);
    this.flashIn(x, baseY - 10, 22, WOOD.sapGlow, WOOD.leafLit, 10);
  }

  sproutPop(x: number, y: number): void {
    this.ring(x, y - 6, 4, 26, 380, WOOD.sproutLit, 3, 9);
    this.leaves(x, y - 8, 5, 18, 600, 9);
  }

  /** A sprout healed or fed sap: a little green heart floating up. */
  sproutFed(x: number, y: number): void {
    this.anim(10, 600, (g, t) => {
      const hy = y - 22 - t * 18;
      g.fillStyle(this.tint(WOOD.sproutLit), 1 - t);
      g.fillCircle(x - 2.2, hy, 2.6);
      g.fillCircle(x + 2.2, hy, 2.6);
      g.fillTriangle(x - 4.6, hy + 0.8, x + 4.6, hy + 0.8, x, hy + 6);
    });
  }

  // ── F ──

  /** Digest ignition: the root ring snapping out from the ent and a gulp of amber light. */
  digestCast(x: number, y: number, r: number): void {
    this.flashIn(x, y, 18, WOOD.sapGlow, WOOD.leafLit, 9);
    this.ring(x, y, 10, r, 460, WOOD.leafLit, 4, 3);
    this.ring(x, y, 6, r * 0.7, 380, WOOD.amberLit, 3, 3);
    this.leaves(x, y, 10, r * 0.6, 900, 9);
  }

  /** A heal tick on a body inside the aura: a green-and-amber mote rising off it. */
  healMote(x: number, y: number): void {
    this.anim(10, 520, (g, t) => {
      const a = Math.random() * TAU;
      g.fillStyle(this.tint(WOOD.leafLit), (1 - t) * 0.9);
      g.fillCircle(x + Math.cos(a) * 10, y - 6 - t * 24, 2.2);
      g.fillStyle(this.tint(WOOD.sapGlow), (1 - t) * 0.8);
      g.fillCircle(x - Math.cos(a) * 8, y - t * 20, 1.6);
    });
  }

  // ── F+ ──

  applePick(fromX: number, fromY: number, toX: number, toY: number): void {
    this.anim(11, 420, (g, t) => {
      const e = easeOut(t);
      appleShape(g, this.tint, fromX + (toX - fromX) * e, fromY + (toY - fromY) * e - Math.sin(e * Math.PI) * 30, 4.4, 1);
    });
    this.leaves(fromX, fromY, 4, 14, 600, 9);
  }

  appleEat(x: number, y: number): void {
    this.anim(11, 420, (g, t) => {
      g.fillStyle(this.tint(WOOD.apple), 1 - t);
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05;
        g.fillCircle(x + Math.cos(a) * t * 18, y - 16 + Math.sin(a) * t * 12 + t * t * 10, 1.8);
      }
    });
    this.ring(x, y, 8, 30, 380, WOOD.appleLit, 3, 10);
  }

  // ── Q ──

  reapWindup(x: number, y: number, ang: number, ms: number): void {
    this.anim(10, ms, (g, t) => {
      g.lineStyle(2 + t * 3, this.tint(WOOD.amberLit), t * 0.7);
      g.beginPath();
      g.arc(x, y, 40 + t * 20, ang - 1.4 * t, ang + 1.4 * t, false);
      g.strokePath();
      for (let i = 0; i < 6; i++) {
        const a = ang + (i - 2.5) * 0.4;
        const d = 90 * (1 - t);
        g.fillStyle(this.tint(WOOD.leafLit), t * 0.8);
        g.fillCircle(x + Math.cos(a) * (30 + d), y + Math.sin(a) * (30 + d), 2);
      }
    });
  }

  /** The great swing: the scythe raking the arc, a crescent of falling leaves, then the cut line. */
  reapSwing(x: number, y: number, ang: number, reach: number, half: number, side: number): void {
    const dur = 340;
    this.anim(11, dur, (g, t) => {
      const e = easeOut(t);
      const sweep = ang - side * half + side * 2 * half * e;
      for (let k = 0; k < 3; k++) {
        const r = reach * (0.55 + k * 0.2);
        g.lineStyle(10 - k * 3, this.tint(k === 2 ? WOOD.sapGlow : k === 1 ? WOOD.amberLit : WOOD.leaf), (0.75 - k * 0.15) * (1 - t * 0.4));
        g.beginPath();
        const a0 = ang - side * half;
        g.arc(x, y, r, Math.min(a0, sweep), Math.max(a0, sweep), false);
        g.strokePath();
      }
      scytheShape(g, this.tint, x + Math.cos(sweep) * 10, y + Math.sin(sweep) * 10, sweep, reach * 0.62, reach * 0.4, side, 1, 1 - t);
    });
    this.scene.time.delayedCall(dur, () => {
      this.anim(4, 900, (g, t) => {
        g.lineStyle(4 * (1 - t) + 1, this.tint(WOOD.amber), (1 - t) * 0.6);
        g.beginPath();
        g.arc(x, y, reach * 0.8, ang - half, ang + half, false);
        g.strokePath();
        for (let i = 0; i < 9; i++) {
          const a = ang - half + (i / 8) * half * 2;
          leafPair(g, this.tint, x + Math.cos(a) * reach * 0.8, y + Math.sin(a) * reach * 0.8 + t * 18 * (0.5 + wjit(i, 1)), 2.6, a + t * 3, 1 - t);
        }
      });
      this.scene.cameras.main.shake(140, 0.004);
    });
  }

  reapHit(x: number, y: number, ang: number): void {
    this.anim(11, 420, (g, t) => {
      const c = Math.cos(ang + Math.PI / 2);
      const s = Math.sin(ang + Math.PI / 2);
      const L = 26 + t * 6;
      g.lineStyle(5 * (1 - t) + 1, this.tint(WOOD.ink), 1 - t);
      g.lineBetween(x - c * L, y - s * L, x + c * L, y + s * L);
      g.lineStyle(2.5 * (1 - t) + 0.5, this.tint(WOOD.amberLit), 1 - t);
      g.lineBetween(x - c * L, y - s * L, x + c * L, y + s * L);
    });
    this.splinters(x, y, 8, 34, 520, 11, ang);
  }

  /** A body newly Tainted: amber cracks snap across it. */
  taint(x: number, y: number): void {
    this.anim(11, 520, (g, t) => taintMark(g, this.tint, x, y, t * 6, (1 - t) * 1.2));
    this.ring(x, y, 10, 42, 480, WOOD.amber, 3, 11);
  }

  /** Final Harvest kills: a clean cut, a gout of leaves and amber, a hard shake. */
  execute(x: number, y: number, ang: number): void {
    this.flashIn(x, y, 34, WOOD.sapGlow, WOOD.amber, 13);
    this.ring(x, y, 10, 90, 640, WOOD.amberLit, 6, 13);
    this.ring(x, y, 6, 60, 520, WOOD.leafLit, 3, 13);
    this.splinters(x, y, 16, 70, 760, 13);
    this.leaves(x, y, 18, 80, 1300, 13, true);
    this.anim(13, 700, (g, t) => {
      const c = Math.cos(ang + Math.PI / 2);
      const s = Math.sin(ang + Math.PI / 2);
      const L = 60;
      g.lineStyle(8 * (1 - t) + 1, this.tint(WOOD.sapGlow), 1 - t);
      g.lineBetween(x - c * L, y - s * L, x + c * L, y + s * L);
    });
    this.scene.cameras.main.shake(260, 0.009);
  }

  /** Q+ Prune: a sprout cut in two. No celebration — a grey puff and a few dropped leaves. */
  prune(x: number, y: number, ang: number): void {
    this.anim(11, 360, (g, t) => {
      const c = Math.cos(ang + Math.PI / 2);
      const s = Math.sin(ang + Math.PI / 2);
      g.lineStyle(3 * (1 - t) + 0.5, this.tint(WOOD.white), 1 - t);
      g.lineBetween(x - c * 16, y - 8 - s * 16, x + c * 16, y - 8 + s * 16);
    });
    this.anim(9, 900, (g, t) => {
      g.fillStyle(this.tint(WOOD.gray), (1 - t) * 0.4);
      g.fillCircle(x, y - 8 - t * 16, 6 + t * 10);
    });
  }
}

// ── The birch-ent rig ────────────────────────────────────────────────────────

const WOOD_AVATAR: AvatarSpec = {
  hands: [
    { r: 9.5, color: WOOD.amber, alpha: 0.2 },
    { r: 6.8, color: WOOD.birchShadow, alpha: 0.98 },
    { r: 4.6, color: WOOD.birch, alpha: 0.96 },
    { r: 1.6, color: WOOD.birchLit, alpha: 0.9, ox: -1.8, oy: -1.8 },
  ],
  // The eyes are eye scars: black almonds with an amber light deep inside.
  eyeWhite: WOOD.barkDark,
  eyePupil: WOOD.amberLit,
  squash: { div: 14, x: 0.4, y: 0.26 },
};

/**
 * The birch ent: a plain pale birch orb (the baked `elem-gluttony`) with the bark marks birches
 * carry, and two eye scars for eyes — the base rig's eyes, black with an amber glint, each with a
 * dark chevron brow over it. The one accessory is the crown: a spray of birch twigs off the top
 * with leaves on them. The secondary touch is the scythe, worn on the back on a strap; it only
 * comes off the back for Final Harvest (no strap — a strap across the orb ran through an eye).
 * A small knot-hole mouth opens to drink.
 *
 * Sap shows as amber light seeping out of the bark marks, brighter the more Sap HP is on it.
 *
 * Mastered (no mastery exists yet, the tell is ready): the crown turns to gold autumn leaves and
 * grows taller, leaves orbit the crown, an amber ring of roots turns under the feet, the hand
 * coronas widen, and the scythe's edge burns amber on the back.
 */
export class GluttonyAvatar extends BaseAvatar {
  /** 0..1 while the scythe is being swung (Final Harvest). */
  private swing = 0;
  private swingAngle = 0;
  private swingSide = 1;
  /** 0..1 how much Sap HP is on it. */
  private sap = 0;
  private sapTarget = 0;
  /** Thrown carverangs out: the hand is empty while one is. */
  private carveOut = false;
  /** The teacup: held while cooking (E+), raised to the mouth while drinking. */
  private cup = 0;
  private cupCook = 0;
  private cupHeld = false;
  /** Knot-hole mouth, 0..1 open. */
  private gape = 0;

  constructor(scene: Phaser.Scene, tint: WoodColorFn, depth = 6) {
    super(scene, tint, depth, WOOD_AVATAR);
  }

  /** 0–1: Sap HP as a share of max health. */
  setSap(v: number): void { this.sapTarget = Phaser.Math.Clamp(v, 0, 1); }

  setCarveOut(on: boolean): void { this.carveOut = on; }

  /** E+: holding a cup on the boil, `cook` 0..1. Null to put it down. */
  setCooking(cook: number | null): void {
    this.cupHeld = cook !== null;
    this.cupCook = cook ?? 0;
  }

  /** E: drink. The cup comes up to the mouth and goes away. */
  drink(): void {
    this.cup = 1;
    this.gape = 1;
  }

  /** Q: swing the scythe through `angle` from one side to the other. */
  reap(angle: number, side: number): void {
    this.swing = 1;
    this.swingAngle = angle;
    this.swingSide = side;
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    if (gesture === 'flex') this.gape = Math.max(this.gape, 0.6);
    super.play(gesture, angle, duration);
  }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.swing = Math.max(0, this.swing - delta / 460);
    this.cup = Math.max(0, this.cup - delta / 700);
    this.gape = Math.max(0, this.gape - delta / 600);
    this.sap += (this.sapTarget - this.sap) * Math.min(1, delta / 400);
    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 14 : 9.5);
      glow.setFillStyle(this.tint(on ? WOOD.autumnLit : WOOD.amber), on ? 0.42 : 0.2);
    });
  }

  /** Birch bark on the orb: the black marks, chevron brows over the eyes, amber in the cracks. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const R = 19;
    const rows = [-15, -11.5, 4.5, 9, 13.5];
    for (let i = 0; i < rows.length; i++) {
      const dy = rows[i];
      const half = Math.sqrt(Math.max(0, R * R - dy * dy)) - 2;
      if (half <= 2) continue;
      for (let k = 0; k < 2; k++) {
        const len = half * (0.35 + wjit(i, k) * 0.4);
        const cx = x + (k ? 1 : -1) * half * (0.25 + wjit(i, k + 5) * 0.4);
        g.lineStyle(1.3 + wjit(i, k + 9) * 1.2, this.tint(WOOD.barkDark), alpha * 0.8);
        g.lineBetween(cx - len * 0.5, y + dy, cx + len * 0.5, y + dy + 0.4);
        if (this.sap > 0.03) {
          g.lineStyle(0.9, this.tint(WOOD.amberLit), alpha * Math.min(1, this.sap * 1.4) * (0.7 + 0.3 * Math.sin(this.t * 3 + i)));
          g.lineBetween(cx - len * 0.35, y + dy - 0.2, cx + len * 0.35, y + dy + 0.2);
        }
      }
    }
    // Chevron brows over the eye scars (the rig's eyes sit at ±7.2, -4, shifted toward facing).
    const lx = Math.cos(this.facing) * 2.4;
    const ly = Math.sin(this.facing) * 2.0;
    for (const side of [-1, 1]) {
      const ex = x + side * 7.2 + lx;
      const ey = y - 4 + ly;
      g.lineStyle(2, this.tint(WOOD.barkDark), alpha * 0.9);
      g.beginPath();
      g.moveTo(ex - 6, ey - 3);
      g.lineTo(ex, ey - 8);
      g.lineTo(ex + 6, ey - 3);
      g.strokePath();
    }
    // The knot-hole mouth.
    const mx = x + lx * 0.8;
    const my = y + 7 + ly * 0.5;
    g.fillStyle(this.tint(WOOD.barkDark), alpha);
    g.fillEllipse(mx, my, 6 + this.gape * 2, 2.6 + this.gape * 4);
    g.fillStyle(this.tint(WOOD.ink), alpha);
    g.fillEllipse(mx, my + 0.4, 3.6 + this.gape * 1.6, 1.4 + this.gape * 3);
  }

  protected emitTrail(x: number, y: number): void {
    const fx = new WoodFx(this.scene, this.tint);
    const s = Math.random() * 9;
    fx.anim(4, 420, (g, t) => leafPair(g, this.tint, x + Math.cos(s) * 4, y + t * 10, 2, s + t * 3, (1 - t) * 0.9, this.mastered));
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const k = this.intensity * (this.mastered ? 1.15 : 1);
    g.fillStyle(this.tint(WOOD.ink), a * 0.35 * k);
    g.fillEllipse(x, y + 18, 46 * k, 14 * k);
    // ── The scythe, slung across the back ──
    if (this.swing <= 0) {
      const m = this.mastered;
      const face = Math.cos(this.facing) >= 0 ? 1 : -1;
      const bob = Math.sin(this.t * 1.6) * 0.02;
      const ang = Math.atan2(-72, face * 26) + bob;
      scytheShape(g, this.tint, x - face * 20, y + 30, ang, 80, m ? 40 : 34, -face, alpha,
        (m ? 0.6 + 0.2 * Math.sin(this.t * 4) : 0.08) + this.sap * 0.35, face * 0.55);
    }
    if (this.sap > 0.02) {
      g.fillStyle(this.tint(WOOD.amber), a * (0.1 + this.sap * 0.22));
      g.fillCircle(x, y, 26 + this.sap * 8);
    }
    if (this.mastered) {
      // An amber ring of roots turning under the feet, buds of gold on it.
      g.lineStyle(2.2, this.tint(WOOD.amber), alpha * 0.6);
      g.strokeEllipse(x, y + 16, 64, 20);
      for (let i = 0; i < 8; i++) {
        const ang = this.t * 0.5 + (i / 8) * TAU;
        leafPair(g, this.tint, x + Math.cos(ang) * 32, y + 16 + Math.sin(ang) * 10, 2, ang, alpha * 0.8, true);
      }
    }
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const m = this.mastered;
    const lean = Math.cos(this.facing) * 1.6;
    const crown = y - 18;

    // ── Final Harvest: the scythe off the back and through the swing ──
    const hx = this.armX[1];
    const hy = this.armY[1];
    if (Number.isFinite(hx) && this.swing > 0) {
      const u = 1 - this.swing;
      const draw = Math.min(1, u * 4);
      const sweep = this.swingAngle - this.swingSide * 1.3 + this.swingSide * 2.6 * easeOut(Math.min(1, u * 1.6));
      scytheShape(g, this.tint, hx - Math.cos(sweep) * 10, hy - Math.sin(sweep) * 10, sweep, 48 + draw * 12,
        (m ? 38 : 32) * (0.4 + 0.6 * draw), this.swingSide, alpha, Math.max(this.swing, m ? 0.6 : 0.3), -this.swingSide);
    }

    // ── The carverang in the left hand, until it is thrown ──
    const sx = this.armX[0];
    const sy = this.armY[0];
    if (Number.isFinite(sx) && !this.carveOut && !this.cupHeld && this.cup <= 0) {
      carverangShape(g, this.tint, sx, sy + 3, -Math.PI * 0.75 + Math.sin(this.t * 1.4) * 0.1, 8, alpha, this.sap);
    }

    // ── The teacup: on the boil in the left hand (E+), or up at the mouth (drinking) ──
    if (Number.isFinite(sx) && (this.cupHeld || this.cup > 0)) {
      const lift = this.cupHeld ? 0 : Math.sin(Math.min(1, (1 - this.cup) * 1.6) * Math.PI);
      const cx = sx + (x + lean - sx) * lift * 0.8;
      const cy = sy + (y + 8 - sy) * lift * 0.8 - 2;
      teacup(g, this.tint, cx, cy, 5, lift * 0.7, this.t, alpha, this.cupCook);
    }

    // ── The crown: birch twigs off the top with leaves on them (gold when mastered) ──
    const twigs = m ? 6 : 4;
    for (let i = 0; i < twigs; i++) {
      const u = i / (twigs - 1) - 0.5;
      const ang = -Math.PI / 2 + u * 1.9 + Math.sin(this.t * 1.5 + i) * 0.07;
      const len = (m ? 15 : 11) + wjit(i, 3) * 5;
      const ex = x + lean + Math.cos(ang) * len;
      const ey = crown + Math.sin(ang) * len;
      g.lineStyle(2.4, this.tint(WOOD.barkDark), alpha);
      g.lineBetween(x + lean, crown + 2, ex, ey);
      g.lineStyle(1.3, this.tint(WOOD.birch), alpha);
      g.lineBetween(x + lean, crown + 2, ex, ey);
      // A side twig halfway, for a branching silhouette.
      const mx = x + lean + Math.cos(ang) * len * 0.55;
      const my = crown + Math.sin(ang) * len * 0.55;
      const sa = ang + (i % 2 ? 0.6 : -0.6);
      g.lineStyle(1, this.tint(WOOD.birch), alpha * 0.9);
      g.lineBetween(mx, my, mx + Math.cos(sa) * 5, my + Math.sin(sa) * 5);
      leafPair(g, this.tint, ex, ey, m ? 3.2 : 2.6, ang, alpha, m);
      leafPair(g, this.tint, mx + Math.cos(sa) * 5, my + Math.sin(sa) * 5, 1.8, sa, alpha * 0.9, m);
    }
    if (m) {
      // Gold leaves orbiting the crown.
      for (let i = 0; i < 4; i++) {
        const ang = this.t * 1.1 + (i / 4) * TAU;
        leafPair(g, this.tint, x + Math.cos(ang) * 22, crown - 6 + Math.sin(ang) * 6, 2.4, ang * 2, alpha * 0.9, true);
      }
    }
  }
}
