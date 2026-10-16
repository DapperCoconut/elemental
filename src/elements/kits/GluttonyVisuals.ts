import Phaser from 'phaser';
import { ArmGesture, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Harvest draws. (The element id is still `gluttony`, so the file and the classes keep
 * that name; the character is a scarecrow.)
 *
 * Harvest is a dark scarecrow: a burlap sack for a head, tied off at the crown with straw coming
 * out of the knot, a stitched purple grin that will not stop drooling, and a scythe taller than
 * it is. The element has one material — **rot**, a deep bruised purple that is lit from inside
 * like something fermenting — and one shape, the **rot tendril**: a tapered, kinked, sagging
 * lick of purple that ends in a drip. The mold is built of them, the drool is built of them, the
 * veil on a corrupted body is built of them.
 *
 * Every colour goes through the `tint` mapper so a skin can remap the palette in one table.
 */

export type HarvestColorFn = ColorFn;

export const HAR = {
  /** The bottom of the ladder — the inside of the sack, a crow's back. */
  ink: 0x0c0610,
  /** Burlap, dark to light. The sack, the hands, the seed husks. */
  sackDark: 0x211a14,
  sack: 0x372b20,
  sackLit: 0x5a4a37,
  /** Straw poking out of the knot and the scythe's lashings. */
  straw: 0x8a7442,
  strawLit: 0xc2a660,
  /** Rot, dark to hot. Everything that is the element's own is one of these five. */
  rotDeep: 0x24092f,
  rot: 0x4a1766,
  purple: 0x7a2fb0,
  purpleLit: 0xb45cf0,
  glow: 0xe2b0ff,
  /** The insides of the mold's mouths, and a heart's meat. */
  flesh: 0x6e1f45,
  fleshLit: 0xb0386a,
  tooth: 0xe6dccb,
  /** Mold eyes: a sick yellow-white with a purple iris. */
  sclera: 0xe8e2b8,
  /** The scythe and the sickle. */
  steelDark: 0x33363d,
  steel: 0x7d828c,
  steelLit: 0xd9dde3,
  wood: 0x3a2a1c,
  woodLit: 0x63492f,
  /** Crows. */
  crow: 0x15111b,
  crowLit: 0x3d3349,
};

const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

/** Deterministic 0–1 noise, so a patch of mold keeps its shape every frame. */
export function hjit(seed: number, i: number): number {
  const v = Math.sin(seed * 61.7 + i * 91.3) * 24571.117;
  return v - Math.floor(v);
}

// ── The primitive: a rot tendril ─────────────────────────────────────────────

/**
 * A tapered, kinked, sagging lick of rot from (x, y) along `ang`, `len` long and `halfW` wide at
 * the root. `sway` bends it; `sag` pulls the far half downward like something wet. Appends one
 * closed path to `g` and fills it with whatever fill style is current.
 */
export function rotTendril(
  g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, len: number, halfW: number,
  sway = 0, sag = 0,
): void {
  const N = 7;
  const left: Phaser.Geom.Point[] = [];
  const right: Phaser.Geom.Point[] = [];
  let px = x;
  let py = y;
  let a = ang;
  const step = len / N;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const w = halfW * (1 - u * 0.85) * (1 + Math.sin(u * 9 + sway * 2) * 0.12);
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    left.push(P(px + nx * w, py + ny * w));
    right.push(P(px - nx * w, py - ny * w));
    a += sway * 0.22 * Math.sin(u * 5.1 + sway);
    px += Math.cos(a) * step;
    py += Math.sin(a) * step + sag * u * step * 0.5;
  }
  g.fillPoints([...left, ...right.reverse()], true);
  // The drip at the end, and the fat root — without them a fan of tendrils reads as spikes.
  g.fillCircle(px, py, Math.max(0.8, halfW * 0.32));
  g.fillCircle(x, y, halfW * 0.95);
}

/** Three-pass rot tendril: dark shell → body → lit core. */
export function rotTendrilLayered(
  g: Phaser.GameObjects.Graphics, tint: HarvestColorFn, x: number, y: number, ang: number, len: number,
  halfW: number, alpha: number, sway = 0, sag = 0,
): void {
  g.fillStyle(tint(HAR.rotDeep), alpha);
  rotTendril(g, x, y, ang, len * 1.05, halfW * 1.35, sway, sag);
  g.fillStyle(tint(HAR.purple), alpha * 0.95);
  rotTendril(g, x, y, ang, len, halfW, sway, sag);
  g.fillStyle(tint(HAR.purpleLit), alpha * 0.7);
  rotTendril(g, x, y, ang, len * 0.7, halfW * 0.4, sway, sag);
}

// ── Painters (shared by the kit, the avatar and the previews) ────────────────

/** The sickle in flight: a short wrapped grip and a crescent blade, spun by `spin`. */
export function sickleShape(
  g: Phaser.GameObjects.Graphics, tint: HarvestColorFn, x: number, y: number, spin: number, size: number, alpha: number,
): void {
  const c = Math.cos(spin);
  const s = Math.sin(spin);
  const W = (lx: number, ly: number): Phaser.Geom.Point => P(x + lx * c - ly * s, y + lx * s + ly * c);
  // Grip.
  g.lineStyle(size * 0.28, tint(HAR.wood), alpha);
  g.lineBetween(W(-size * 0.2, 0).x, W(-size * 0.2, 0).y, W(-size, 0).x, W(-size, 0).y);
  g.lineStyle(size * 0.12, tint(HAR.straw), alpha * 0.8);
  g.lineBetween(W(-size * 0.45, 0).x, W(-size * 0.45, 0).y, W(-size * 0.6, 0).x, W(-size * 0.6, 0).y);
  // Blade: the outer edge on a big arc, the inner edge on a smaller offset one.
  const outer: Phaser.Geom.Point[] = [];
  const inner: Phaser.Geom.Point[] = [];
  const R = size * 1.05;
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    const a = -Math.PI * 0.95 + u * Math.PI * 1.15;
    outer.push(W(-size * 0.15 + Math.cos(a) * R * 0.2 + u * size * 0.9, Math.sin(a) * R * 0.85 - size * 0.05));
    inner.push(W(-size * 0.15 + Math.cos(a) * R * 0.1 + u * size * 0.7, Math.sin(a) * R * 0.5 + size * 0.08));
  }
  g.fillStyle(tint(HAR.steelDark), alpha);
  g.fillPoints([...outer, ...inner.reverse()], true);
  // Lit edge, and a purple film of rot along the spine.
  g.lineStyle(Math.max(1, size * 0.12), tint(HAR.steelLit), alpha);
  g.beginPath();
  g.moveTo(outer[0].x, outer[0].y);
  for (const p of outer) g.lineTo(p.x, p.y);
  g.strokePath();
  g.fillStyle(tint(HAR.purple), alpha * 0.55);
  const mid = outer[5];
  g.fillCircle(mid.x, mid.y, size * 0.14);
}

/** The streak a spinning sickle leaves: a fading arc of pale steel and rot along its path. */
export function sickleTrail(
  g: Phaser.GameObjects.Graphics, tint: HarvestColorFn, pts: { x: number; y: number }[], alpha: number,
): void {
  for (let i = 1; i < pts.length; i++) {
    const u = i / pts.length;
    g.lineStyle(1 + u * 5, tint(HAR.purple), alpha * u * 0.35);
    g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
    g.lineStyle(0.6 + u * 1.6, tint(HAR.steelLit), alpha * u * 0.45);
    g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
  }
}

/** A seed in flight or freshly planted: a split black husk with a purple sprout. */
export function seedShape(
  g: Phaser.GameObjects.Graphics, tint: HarvestColorFn, x: number, y: number, ang: number, r: number, alpha: number, sprout = 0,
): void {
  g.fillStyle(tint(HAR.ink), alpha);
  g.fillEllipse(x, y, r * 2.4, r * 1.6);
  g.fillStyle(tint(HAR.sack), alpha);
  g.fillEllipse(x - r * 0.2, y - r * 0.15, r * 1.7, r * 1.0);
  g.fillStyle(tint(HAR.purpleLit), alpha * (0.5 + sprout * 0.5));
  g.fillEllipse(x + Math.cos(ang) * r * 0.4, y + Math.sin(ang) * r * 0.2, r * 0.9, r * 0.5);
  if (sprout > 0.05) {
    g.fillStyle(tint(HAR.purple), alpha);
    rotTendril(g, x, y - r * 0.4, -Math.PI / 2 + Math.sin(ang * 3) * 0.4, r * 3 * sprout, r * 0.45, ang, 0);
  }
}

/** One cell of mold, as the kit hands it over: centre, growth 0–1, and a stable hash. */
export interface MoldCell { x: number; y: number; g: number; h: number }

/**
 * The mold. Three passes over every cell so neighbouring cells melt into one surface: a dark
 * lumpy underlay, the purple body with a slow pulse, then the features — veins on the mature
 * cells, and on a few of them an eye (that tracks `look`) or a mouth that chews. `size` is the
 * kit's cell size.
 */
export function moldLayer(
  g: Phaser.GameObjects.Graphics, tint: HarvestColorFn, cells: MoldCell[], size: number, t: number,
  alpha: number, look?: { x: number; y: number },
): void {
  if (!cells.length) return;
  const r = size * 0.78;
  g.fillStyle(tint(HAR.rotDeep), alpha * 0.9);
  for (const c of cells) {
    const k = Math.min(1, c.g);
    g.fillCircle(c.x + (c.h - 0.5) * 4, c.y + (hjit(c.h, 2) - 0.5) * 4, r * (0.35 + 0.8 * k));
  }
  g.fillStyle(tint(HAR.rot), alpha * 0.95);
  for (const c of cells) {
    if (c.g < 0.25) continue;
    const pulse = 1 + 0.07 * Math.sin(t * 2.2 + c.h * 20);
    g.fillCircle(c.x + (hjit(c.h, 3) - 0.5) * 3, c.y + (hjit(c.h, 4) - 0.5) * 3, r * 0.75 * Math.min(1, c.g) * pulse);
  }
  g.fillStyle(tint(HAR.purple), alpha * 0.75);
  for (const c of cells) {
    if (c.g < 0.7) continue;
    const pulse = 0.6 + 0.4 * Math.sin(t * 2.2 + c.h * 20);
    g.fillCircle(c.x + (hjit(c.h, 5) - 0.5) * 5, c.y + (hjit(c.h, 6) - 0.5) * 5, r * 0.32 * pulse);
  }
  // Veins and features, on mature cells only.
  for (const c of cells) {
    if (c.g < 1) continue;
    const h = c.h;
    if (h < 0.07) {
      // An eye, opening out of the mold, looking at whoever is nearest.
      const blink = Math.sin(t * 0.9 + h * 300) > 0.97 ? 0.15 : 1;
      const er = size * 0.42;
      g.fillStyle(tint(HAR.rotDeep), alpha);
      g.fillEllipse(c.x, c.y, er * 2.6, er * 2.0 * blink + 2);
      g.fillStyle(tint(HAR.sclera), alpha * 0.95);
      g.fillEllipse(c.x, c.y, er * 2.1, er * 1.5 * blink);
      if (blink > 0.5) {
        const la = look ? Math.atan2(look.y - c.y, look.x - c.x) : t + h * 40;
        const ix = c.x + Math.cos(la) * er * 0.38;
        const iy = c.y + Math.sin(la) * er * 0.22;
        g.fillStyle(tint(HAR.purple), alpha);
        g.fillCircle(ix, iy, er * 0.55);
        g.fillStyle(tint(HAR.ink), alpha);
        g.fillEllipse(ix, iy, er * 0.22, er * 0.75);
        g.fillStyle(tint(HAR.glow), alpha * 0.8);
        g.fillCircle(ix - er * 0.2, iy - er * 0.2, er * 0.14);
      }
    } else if (h < 0.12) {
      // A mouth: a lipped slash that slowly chews, with a row of teeth top and bottom.
      const open = 0.25 + 0.75 * Math.max(0, Math.sin(t * 2.6 + h * 200));
      const mw = size * 0.95;
      const mh = size * 0.32 * open;
      const tilt = (hjit(h, 7) - 0.5) * 0.8;
      g.fillStyle(tint(HAR.rotDeep), alpha);
      g.fillEllipse(c.x, c.y, mw * 2.3, mh * 2 + 5);
      g.fillStyle(tint(HAR.flesh), alpha);
      g.fillEllipse(c.x, c.y, mw * 1.9, mh * 2 + 1);
      g.fillStyle(tint(HAR.ink), alpha * 0.9);
      g.fillEllipse(c.x, c.y + 0.5, mw * 1.4, mh * 1.3);
      g.fillStyle(tint(HAR.tooth), alpha);
      for (let i = 0; i < 4; i++) {
        const tx = c.x - mw * 0.6 + (i + 0.5) * (mw * 1.2 / 4) + tilt;
        g.fillTriangle(tx - 1.6, c.y - mh - 0.5, tx + 1.6, c.y - mh - 0.5, tx, c.y - mh + 3.2);
        g.fillTriangle(tx - 1.4, c.y + mh + 0.5, tx + 1.4, c.y + mh + 0.5, tx + 0.3, c.y + mh - 2.8);
      }
    } else if (h < 0.3) {
      // A vein, a short lit tendril crawling out of the cell.
      g.fillStyle(tint(HAR.purpleLit), alpha * 0.55);
      rotTendril(g, c.x, c.y, h * 40, size * 0.9, 1.6, Math.sin(t + h * 9) * 0.6, 0);
    }
  }
}

/** A corrupt heart: a lumpy, beating, veined thing of purple meat, sitting in the mold. */
export function corruptHeart(
  g: Phaser.GameObjects.Graphics, tint: HarvestColorFn, x: number, y: number, r: number, t: number, alpha: number,
): void {
  const beat = 1 + 0.12 * Math.max(0, Math.sin(t * 7)) + 0.06 * Math.max(0, Math.sin(t * 7 - 0.9));
  const R = r * beat;
  g.fillStyle(tint(HAR.purple), alpha * 0.22);
  g.fillCircle(x, y, R * 1.9);
  g.fillStyle(tint(HAR.rotDeep), alpha);
  g.fillCircle(x - R * 0.42, y - R * 0.2, R * 0.68);
  g.fillCircle(x + R * 0.42, y - R * 0.2, R * 0.68);
  g.fillTriangle(x - R * 1.05, y - R * 0.05, x + R * 1.05, y - R * 0.05, x, y + R * 1.1);
  g.fillStyle(tint(HAR.fleshLit), alpha);
  g.fillCircle(x - R * 0.4, y - R * 0.22, R * 0.55);
  g.fillCircle(x + R * 0.4, y - R * 0.22, R * 0.55);
  g.fillTriangle(x - R * 0.9, y - R * 0.1, x + R * 0.9, y - R * 0.1, x, y + R * 0.92);
  g.fillStyle(tint(HAR.purple), alpha * 0.85);
  g.fillCircle(x + R * 0.18, y + R * 0.15, R * 0.42);
  // Veins, and the stumps of vessels it was torn off.
  g.lineStyle(1.2, tint(HAR.glow), alpha * 0.75);
  g.beginPath();
  g.moveTo(x - R * 0.5, y - R * 0.4);
  g.lineTo(x - R * 0.1, y + R * 0.1);
  g.lineTo(x + R * 0.05, y + R * 0.6);
  g.strokePath();
  g.fillStyle(tint(HAR.rot), alpha);
  g.fillRect(x - R * 0.25, y - R * 1.0, R * 0.22, R * 0.4);
  g.fillRect(x + R * 0.12, y - R * 0.95, R * 0.2, R * 0.32);
  g.fillStyle(tint(HAR.glow), alpha * 0.6);
  g.fillCircle(x - R * 0.5, y - R * 0.45, R * 0.15);
}

/** A crow on the wing, facing `ang`. `flap` is its own phase. */
export function crowShape(
  g: Phaser.GameObjects.Graphics, tint: HarvestColorFn, x: number, y: number, ang: number, size: number, flap: number, alpha: number,
): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const W = (lx: number, ly: number): Phaser.Geom.Point => P(x + lx * c - ly * s, y + lx * s + ly * c);
  const wing = Math.sin(flap) * 0.9;
  g.fillStyle(tint(HAR.ink), alpha * 0.35);
  g.fillEllipse(x + 3, y + 8, size * 1.6, size * 0.6);
  // Wings: two ragged blades out of the shoulders, beating.
  g.fillStyle(tint(HAR.crow), alpha);
  for (const side of [-1, 1]) {
    const tip = W(-size * 0.5, side * size * (1.2 + wing * 0.4));
    const mid = W(-size * 0.15, side * size * (0.9 + wing * 0.3));
    g.fillPoints([W(size * 0.25, side * size * 0.15), mid, tip, W(-size * 0.75, side * size * (0.6 + wing * 0.2)), W(-size * 0.35, side * size * 0.1)], true);
  }
  g.fillStyle(tint(HAR.crowLit), alpha * 0.8);
  const f = W(-size * 0.3, size * (0.8 + wing * 0.3));
  g.fillCircle(f.x, f.y, size * 0.14);
  // Body, tail and head.
  g.fillStyle(tint(HAR.crow), alpha);
  g.fillPoints([W(-size * 0.55, 0), W(-size * 1.05, size * 0.28), W(-size * 1.05, -size * 0.28)], true);
  const b = W(-size * 0.1, 0);
  g.fillEllipse(b.x, b.y, size * 1.1, size * 1.1);
  const h = W(size * 0.45, 0);
  g.fillCircle(h.x, h.y, size * 0.34);
  g.fillStyle(tint(HAR.steel), alpha);
  g.fillTriangle(W(size * 0.68, -size * 0.1).x, W(size * 0.68, -size * 0.1).y, W(size * 0.68, size * 0.1).x,
    W(size * 0.68, size * 0.1).y, W(size * 1.0, 0).x, W(size * 1.0, 0).y);
  const e = W(size * 0.5, -size * 0.12);
  g.fillStyle(tint(HAR.purpleLit), alpha);
  g.fillCircle(e.x, e.y, size * 0.1);
}

/**
 * The tell on a corrupted body: rot creeping up from the feet as dripping tendrils, thicker and
 * higher with `k` (corruption 0–1), and a purple fog at full.
 */
export function corruptionVeil(
  g: Phaser.GameObjects.Graphics, tint: HarvestColorFn, x: number, y: number, k: number, t: number, alpha: number,
): void {
  if (k <= 0.01) return;
  const n = 3 + Math.round(k * 5);
  g.fillStyle(tint(HAR.purple), alpha * 0.12 * k);
  g.fillCircle(x, y, 26 + k * 6);
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 0.5 + ((i / (n - 1 || 1)) - 0.5) * 2.4 + Math.sin(t * 1.3 + i) * 0.1;
    const rx = x + Math.cos(a) * 19;
    const ry = y + Math.sin(a) * 19;
    rotTendrilLayered(g, tint, rx, ry, a + Math.PI + (i % 2 ? 0.25 : -0.25), 8 + k * 18, 1.6 + k * 1.6,
      alpha * (0.45 + k * 0.45), Math.sin(t * 2 + i) * 0.5, -0.4);
  }
  // A drip falling off the bottom.
  const dt = (t * 0.8 + x * 0.01) % 1;
  g.fillStyle(tint(HAR.purpleLit), alpha * k * (1 - dt));
  g.fillCircle(x + Math.sin(x) * 6, y + 20 + dt * 14, 1.6 + k);
}

/** The great scythe: a long shaft and a huge hooked blade. Used by the rig and by Reaping Hour. */
export function scytheShape(
  g: Phaser.GameObjects.Graphics, tint: HarvestColorFn, gx: number, gy: number, shaftAng: number, len: number,
  bladeLen: number, side: number, alpha: number, edgeGlow = 0,
): void {
  const ex = gx + Math.cos(shaftAng) * len;
  const ey = gy + Math.sin(shaftAng) * len;
  const bx = gx - Math.cos(shaftAng) * len * 0.25;
  const by = gy - Math.sin(shaftAng) * len * 0.25;
  g.lineStyle(4.4, tint(HAR.ink), alpha);
  g.lineBetween(bx, by, ex, ey);
  g.lineStyle(3, tint(HAR.wood), alpha);
  g.lineBetween(bx, by, ex, ey);
  g.lineStyle(1, tint(HAR.woodLit), alpha * 0.8);
  g.lineBetween(bx, by - 0.8, ex, ey - 0.8);
  // Straw lashing where the blade is bound on.
  g.fillStyle(tint(HAR.straw), alpha);
  g.fillCircle(ex, ey, 3.2);
  // The blade sweeps back from the top of the shaft, perpendicular, curving toward the grip.
  const perp = shaftAng + side * Math.PI / 2;
  const outer: Phaser.Geom.Point[] = [];
  const inner: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    const a = perp - side * u * 0.95;
    const w = bladeLen * u;
    const thick = (1 - u) * bladeLen * 0.16 + 1;
    const cx = ex + Math.cos(a) * w * 1.0;
    const cy = ey + Math.sin(a) * w * 1.0;
    outer.push(P(cx + Math.cos(shaftAng) * thick * 0.4, cy + Math.sin(shaftAng) * thick * 0.4));
    inner.push(P(cx - Math.cos(shaftAng) * thick, cy - Math.sin(shaftAng) * thick));
  }
  g.fillStyle(tint(HAR.steelDark), alpha);
  g.fillPoints([...outer, ...inner.slice().reverse()], true);
  g.lineStyle(1.6, tint(HAR.steelLit), alpha);
  g.beginPath();
  g.moveTo(inner[0].x, inner[0].y);
  for (const p of inner) g.lineTo(p.x, p.y);
  g.strokePath();
  if (edgeGlow > 0) {
    g.lineStyle(3 + edgeGlow * 3, tint(HAR.purpleLit), alpha * edgeGlow * 0.6);
    g.beginPath();
    g.moveTo(inner[0].x, inner[0].y);
    for (const p of inner) g.lineTo(p.x, p.y);
    g.strokePath();
  }
}

/** A torn-off chunk of corrupt flesh: the Consume trophy. */
export function fleshChunk(
  g: Phaser.GameObjects.Graphics, tint: HarvestColorFn, x: number, y: number, r: number, t: number, alpha: number,
): void {
  g.fillStyle(tint(HAR.rotDeep), alpha);
  g.fillCircle(x, y, r * 1.1);
  g.fillStyle(tint(HAR.flesh), alpha);
  g.fillCircle(x - r * 0.2, y - r * 0.1, r * 0.85);
  g.fillCircle(x + r * 0.35, y + r * 0.2, r * 0.6);
  g.fillStyle(tint(HAR.fleshLit), alpha * (0.7 + 0.3 * Math.sin(t * 6)));
  g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.35);
  g.fillStyle(tint(HAR.purpleLit), alpha * 0.8);
  g.fillCircle(x + r * 0.3, y - r * 0.25, r * 0.18);
}

// ── HarvestFx — one-shots ────────────────────────────────────────────────────

export class HarvestFx extends FxBase {
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
        const rr = r * (1 + (hjit(seed, i % seg) - 0.5) * 0.08);
        if (i === 0) g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        else g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.strokePath();
    });
  }

  /** Rot spatter: a burst of tendrils and drops flung out of a point. */
  splatter(x: number, y: number, count: number, spread: number, ms = 480, depth = 9, dir?: number): void {
    const bits = Array.from({ length: count }, () => ({
      a: dir === undefined ? Math.random() * TAU : dir + (Math.random() - 0.5) * 1.6,
      d: spread * (0.5 + Math.random() * 0.7), r: 1.5 + Math.random() * 2.5, s: Math.random() * 9,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const b of bits) {
        const bx = x + Math.cos(b.a) * b.d * e;
        const by = y + Math.sin(b.a) * b.d * e + t * t * 14;
        g.fillStyle(this.tint(HAR.purple), (1 - t) * 0.9);
        rotTendril(g, bx, by, b.a + Math.PI, b.d * 0.25 * (1 - t) + 2, b.r * (1 - t * 0.5), b.s, 0.5);
        g.fillStyle(this.tint(HAR.purpleLit), (1 - t));
        g.fillCircle(bx, by, b.r * 0.6);
      }
    });
  }

  /** The sickle leaving the hand: a pale flare and a scrap of straw. */
  sickleThrow(x: number, y: number, ang: number): void {
    this.anim(9, 200, (g, t) => {
      g.fillStyle(this.tint(HAR.steelLit), (1 - t) * 0.7);
      g.fillCircle(x + Math.cos(ang) * t * 10, y + Math.sin(ang) * t * 10, 8 * (1 - t) + 2);
      g.lineStyle(2, this.tint(HAR.straw), 1 - t);
      g.lineBetween(x, y, x - Math.cos(ang + 0.6) * (6 + t * 10), y - Math.sin(ang + 0.6) * (6 + t * 10) + t * 8);
    });
  }

  /** A sickle cut on a body: a crescent slash and a spray of rot. */
  sickleHit(x: number, y: number, ang: number): void {
    this.anim(10, 260, (g, t) => {
      const r = 14 + t * 8;
      g.lineStyle(3 * (1 - t) + 1, this.tint(HAR.steelLit), 1 - t);
      g.beginPath();
      g.arc(x, y, r, ang - 1.0, ang + 1.0, false);
      g.strokePath();
      g.lineStyle(2 * (1 - t) + 0.5, this.tint(HAR.purpleLit), (1 - t) * 0.8);
      g.beginPath();
      g.arc(x, y, r * 0.75, ang - 0.8, ang + 0.8, false);
      g.strokePath();
    });
    this.splatter(x, y, 5, 22, 380, 10, ang);
  }

  /** The sickle coming home to the hand. */
  sickleCatch(x: number, y: number): void {
    this.anim(9, 180, (g, t) => {
      g.lineStyle(2, this.tint(HAR.steelLit), (1 - t) * 0.8);
      g.strokeCircle(x, y, 6 + t * 10);
    });
  }

  /** Swapping which way the loop curls: a small curved arrow over the head. */
  arcSwap(x: number, y: number, side: number): void {
    this.anim(16, 520, (g, t) => {
      const a = (1 - t) * 0.9;
      g.lineStyle(2.2, this.tint(HAR.purpleLit), a);
      g.beginPath();
      const s = side > 0 ? 0 : Math.PI;
      g.arc(x, y, 10, s - 1.2, s + 1.2, side < 0);
      g.strokePath();
      const ea = s + (side > 0 ? 1.2 : -1.2);
      const hx = x + Math.cos(ea) * 10;
      const hy = y + Math.sin(ea) * 10;
      g.fillStyle(this.tint(HAR.purpleLit), a);
      g.fillTriangle(hx - 3.5, hy - 2, hx + 3.5, hy - 2, hx, hy + 4 * (side > 0 ? 1 : -1));
    });
  }

  /** A seed arcing from the hand to where it lands, then a little puff of rot when it hits. */
  seedFlight(fx: number, fy: number, tx: number, ty: number, ms: number): void {
    const spin = Math.random() * TAU;
    this.anim(9, ms, (g, t) => {
      const x = fx + (tx - fx) * t;
      const y = fy + (ty - fy) * t - Math.sin(t * Math.PI) * 34;
      seedShape(g, this.tint, x, y, spin + t * 8, 3.4, 1);
    });
    this.scene.time.delayedCall(ms, () => this.seedLand(tx, ty));
  }

  private seedLand(x: number, y: number): void {
    this.anim(3, 420, (g, t) => {
      g.fillStyle(this.tint(HAR.purple), (1 - t) * 0.45);
      g.fillCircle(x, y, 6 + t * 14);
    });
    this.splatter(x, y, 3, 12, 300, 4);
  }

  /** E: the scarecrow flings the seeds out of both hands — a dark puff around it. */
  sowCast(x: number, y: number): void {
    this.ring(x, y, 12, 70, 520, HAR.purple, 4, 4);
    this.anim(4, 600, (g, t) => {
      g.fillStyle(this.tint(HAR.rotDeep), (1 - t) * 0.35);
      g.fillCircle(x, y + 8, 20 + t * 40);
    });
  }

  /** A corrupt heart bursting under the sickle: meat, rot and a rising ring. */
  heartBurst(x: number, y: number): void {
    this.flashIn(x, y, 22, HAR.glow, HAR.purple, 11);
    this.ring(x, y, 8, 64, 560, HAR.purpleLit, 5, 11);
    this.splatter(x, y, 12, 44, 620, 11);
    this.anim(11, 700, (g, t) => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + t;
        fleshChunk(g, this.tint, x + Math.cos(a) * 30 * easeOut(t), y + Math.sin(a) * 30 * easeOut(t) + t * t * 20, 3 * (1 - t) + 1, t * 5, 1 - t);
      }
    });
  }

  /** Corrupt HP arriving on the scarecrow: rot pulled in from all sides. */
  corruptGain(x: number, y: number, amount: number): void {
    const n = Math.min(12, 4 + Math.round(amount / 10));
    const bits = Array.from({ length: n }, () => ({ a: Math.random() * TAU, d: 40 + Math.random() * 30 }));
    this.anim(11, 480, (g, t) => {
      const e = easeIn(t);
      for (const b of bits) {
        const bx = x + Math.cos(b.a) * b.d * (1 - e);
        const by = y + Math.sin(b.a) * b.d * (1 - e);
        g.fillStyle(this.tint(HAR.purpleLit), 0.9 * (1 - t * 0.5));
        rotTendril(g, bx, by, b.a, 10 * (1 - t) + 2, 2, b.a, 0);
      }
      g.fillStyle(this.tint(HAR.purple), t * 0.35);
      g.fillCircle(x, y, 26 * (0.6 + t * 0.4));
    });
  }

  /** R: crows bursting out of the sack in a black flutter. */
  crowRelease(x: number, y: number): void {
    const bits = Array.from({ length: 10 }, () => ({ a: Math.random() * TAU, d: 20 + Math.random() * 30, r: 2 + Math.random() * 2 }));
    this.anim(10, 520, (g, t) => {
      for (const b of bits) {
        g.fillStyle(this.tint(HAR.crow), 1 - t);
        const fx = x + Math.cos(b.a) * b.d * easeOut(t);
        const fy = y + Math.sin(b.a) * b.d * easeOut(t) - t * 10;
        g.fillEllipse(fx, fy, b.r * 2.4, b.r);
      }
    });
    this.ring(x, y, 10, 46, 380, HAR.crowLit, 3, 9);
  }

  /** A crow's peck landing. */
  peck(x: number, y: number, ang: number, heavy: boolean): void {
    this.anim(10, 200, (g, t) => {
      g.lineStyle(2, this.tint(heavy ? HAR.purpleLit : HAR.steelLit), 1 - t);
      for (const d of [-0.4, 0, 0.4]) {
        g.lineBetween(x, y, x + Math.cos(ang + d) * (6 + t * 10), y + Math.sin(ang + d) * (6 + t * 10));
      }
    });
    if (heavy) this.splatter(x, y, 3, 14, 300, 10, ang);
  }

  /**
   * F: the sack splits open along the grin and a jaw of teeth snaps shut along `ang` — upper and
   * lower rows driving together at `reach`.
   */
  bite(x: number, y: number, ang: number, reach: number, heavy: boolean): void {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const W = (lx: number, ly: number): Phaser.Geom.Point => P(x + lx * c - ly * s, y + lx * s + ly * c);
    this.anim(10, 360, (g, t) => {
      const close = t < 0.45 ? easeIn(t / 0.45) : 1;
      const fade = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      const open = 26 * (1 - close) + 2;
      const fwd = reach * (0.55 + 0.45 * easeOut(Math.min(1, t * 2)));
      // The maw: a dark gullet behind the teeth.
      g.fillStyle(this.tint(HAR.ink), fade * 0.8);
      const a = W(14, 0);
      const b = W(fwd, 0);
      g.fillEllipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.hypot(b.x - a.x, b.y - a.y) + 10, open * 1.6 + 6);
      for (const side of [-1, 1]) {
        const jaw: Phaser.Geom.Point[] = [];
        for (let i = 0; i <= 8; i++) {
          const u = i / 8;
          jaw.push(W(14 + u * (fwd - 14), side * (open * Math.sin(u * Math.PI * 0.9 + 0.3) + 2)));
        }
        g.lineStyle(4, this.tint(heavy ? HAR.purple : HAR.flesh), fade);
        g.beginPath();
        g.moveTo(jaw[0].x, jaw[0].y);
        for (const p of jaw) g.lineTo(p.x, p.y);
        g.strokePath();
        g.fillStyle(this.tint(HAR.tooth), fade);
        for (let i = 1; i < 8; i++) {
          const p = jaw[i];
          const tip = W(14 + (i / 8) * (fwd - 14), side * (open * Math.sin((i / 8) * Math.PI * 0.9 + 0.3) + 2) - side * 7);
          g.fillTriangle(p.x - c * 2.2, p.y - s * 2.2, p.x + c * 2.2, p.y + s * 2.2, tip.x, tip.y);
        }
      }
      if (close >= 1 && t < 0.6) {
        g.fillStyle(this.tint(heavy ? HAR.purpleLit : HAR.fleshLit), (0.6 - t) * 1.5);
        g.fillCircle(b.x, b.y, 10);
      }
    });
    this.scene.time.delayedCall(160, () => {
      const tip = W(reach, 0);
      this.splatter(tip.x, tip.y, heavy ? 12 : 6, heavy ? 36 : 22, 420, 10, ang);
      if (heavy) this.ring(tip.x, tip.y, 6, 48, 420, HAR.purpleLit, 4, 10);
    });
  }

  /** A body that has just been stripped: its buffs fly off it into the thief. */
  steal(fromX: number, fromY: number, toX: number, toY: number): void {
    this.anim(11, 520, (g, t) => {
      const e = easeIn(t);
      for (let i = 0; i < 5; i++) {
        const off = (i - 2) * 9 * (1 - e);
        const x = fromX + (toX - fromX) * e + off;
        const y = fromY + (toY - fromY) * e - Math.sin(e * Math.PI) * 20 + off * 0.3;
        g.fillStyle(this.tint(i % 2 ? HAR.glow : HAR.purpleLit), 1 - t * 0.5);
        g.fillCircle(x, y, 3 - e * 1.4);
      }
    });
  }

  /** A piece of Corrupt Flesh going into the grin, and the rot that comes out of it. */
  eatFlesh(x: number, y: number): void {
    this.anim(12, 420, (g, t) => {
      const e = easeIn(t);
      fleshChunk(g, this.tint, x + 26 * (1 - e), y - 20 * (1 - e) + 6, 5 * (1 - e * 0.6), t * 6, 1 - t * 0.3);
    });
    this.scene.time.delayedCall(380, () => {
      this.flashIn(x, y + 6, 16, HAR.glow, HAR.purple, 12);
      this.corruptGain(x, y, 75);
      this.splatter(x, y + 6, 6, 20, 360, 12);
    });
  }

  /** Q wind-up: the scythe raised, rot gathering on the edge. */
  reapWindup(x: number, y: number, ang: number, ms: number): void {
    this.anim(9, ms, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(2, this.tint(HAR.purple), 0.5 * e);
      g.beginPath();
      g.arc(x, y, 60 + 40 * e, ang - 1.4, ang + 1.4, false);
      g.strokePath();
      for (let i = 0; i < 6; i++) {
        const a = ang - 1.4 + (i / 5) * 2.8;
        const d = 120 - e * 60;
        g.fillStyle(this.tint(HAR.purpleLit), e * 0.8);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 2 + e * 1.5);
      }
    });
  }

  /**
   * Q: the great swing. The scythe itself rakes across the arc from one side to the other, a
   * wide crescent of rot follows the blade, then the cut line lingers and drips.
   */
  reapSwing(x: number, y: number, ang: number, reach: number, half: number, side: number): void {
    const dur = 340;
    this.anim(11, dur, (g, t) => {
      const e = easeOut(t);
      const sweep = ang - side * half + side * 2 * half * e;
      // Crescent wake behind the blade.
      for (let k = 0; k < 3; k++) {
        const r = reach * (0.55 + k * 0.2);
        g.lineStyle(10 - k * 3, this.tint(k === 2 ? HAR.glow : k === 1 ? HAR.purpleLit : HAR.purple), (0.75 - k * 0.15) * (1 - t * 0.4));
        g.beginPath();
        const a0 = ang - side * half;
        g.arc(x, y, r, Math.min(a0, sweep), Math.max(a0, sweep), false);
        g.strokePath();
      }
      scytheShape(g, this.tint, x + Math.cos(sweep) * 10, y + Math.sin(sweep) * 10, sweep, reach * 0.62, reach * 0.4, side, 1, 1 - t);
    });
    this.scene.time.delayedCall(dur, () => {
      this.anim(4, 900, (g, t) => {
        g.lineStyle(4 * (1 - t) + 1, this.tint(HAR.purple), (1 - t) * 0.6);
        g.beginPath();
        g.arc(x, y, reach * 0.8, ang - half, ang + half, false);
        g.strokePath();
        for (let i = 0; i < 9; i++) {
          const a = ang - half + (i / 8) * half * 2;
          const dx = x + Math.cos(a) * reach * 0.8;
          const dy = y + Math.sin(a) * reach * 0.8;
          g.fillStyle(this.tint(HAR.purpleLit), 1 - t);
          g.fillCircle(dx, dy + t * 14 * (0.5 + hjit(i, 1)), 1.6);
        }
      });
      this.scene.cameras.main.shake(140, 0.004);
    });
  }

  /** A body cut by the scythe: a deep slash and a purple brand of the vulnerability. */
  reapHit(x: number, y: number, ang: number): void {
    this.anim(11, 420, (g, t) => {
      const c = Math.cos(ang + Math.PI / 2);
      const s = Math.sin(ang + Math.PI / 2);
      const L = 26 + t * 6;
      g.lineStyle(5 * (1 - t) + 1, this.tint(HAR.ink), 1 - t);
      g.lineBetween(x - c * L, y - s * L, x + c * L, y + s * L);
      g.lineStyle(2.5 * (1 - t) + 0.5, this.tint(HAR.purpleLit), 1 - t);
      g.lineBetween(x - c * L, y - s * L, x + c * L, y + s * L);
    });
    this.splatter(x, y, 9, 34, 520, 11, ang);
  }

  /** An execute: the body is cut clean through and comes apart in rot. */
  execute(x: number, y: number, ang: number): void {
    this.flashIn(x, y, 34, HAR.glow, HAR.purple, 13);
    this.ring(x, y, 10, 90, 640, HAR.purpleLit, 6, 13);
    this.ring(x, y, 6, 60, 520, HAR.glow, 3, 13);
    this.splatter(x, y, 18, 70, 760, 13);
    this.anim(13, 700, (g, t) => {
      const c = Math.cos(ang + Math.PI / 2);
      const s = Math.sin(ang + Math.PI / 2);
      const L = 60;
      g.lineStyle(8 * (1 - t) + 1, this.tint(HAR.glow), 1 - t);
      g.lineBetween(x - c * L, y - s * L, x + c * L, y + s * L);
    });
    this.scene.cameras.main.shake(260, 0.009);
  }
}

// ── The scarecrow rig ────────────────────────────────────────────────────────

const HARVEST_AVATAR: AvatarSpec = {
  hands: [
    { r: 9.5, color: HAR.rot, alpha: 0.28 },
    { r: 6.8, color: HAR.sackDark, alpha: 0.98 },
    { r: 4.4, color: HAR.sack, alpha: 0.95 },
    { r: 1.6, color: HAR.sackLit, alpha: 0.85, ox: -1.8, oy: -1.8 },
  ],
  // Holes cut in the sack: black, with a purple light far back in each.
  eyeWhite: HAR.ink,
  eyePupil: HAR.purpleLit,
  squash: { div: 14, x: 0.45, y: 0.3 },
};

/**
 * The scarecrow: a plain dark burlap orb (the baked `elem-gluttony`) that *is* the sack — the one
 * accessory is the knot at the crown, the sack's gathered top tied off with a cord and straw
 * spilling out of it. The face is the secondary touch: two cut eye-holes (the base rig's eyes,
 * black with a purple pupil) over a wide, stitched, purple grin that drools. The scythe is held,
 * not worn — a long shaft resting against the right hand with the blade hanging over the head.
 *
 * Mastered (no mastery exists yet, but the tell is ready): the grin splits wider, the drool runs
 * heavier, the knot's straw stands up taller and the eye-holes burn brighter.
 */
export class GluttonyAvatar extends BaseAvatar {
  /** 0..1 while the scythe is being swung (Reaping Hour). */
  private swing = 0;
  private swingAngle = 0;
  private swingSide = 1;
  /** 0..1 while the grin is split open (Consume). */
  private gape = 0;
  /** 0..1 how much Corrupt HP is riding on it — a purple light through the sack. */
  private rot = 0;
  private rotTarget = 0;
  /** Thrown sickles out: the free hand is empty while one is out. */
  private sickleOut = false;

  constructor(scene: Phaser.Scene, tint: HarvestColorFn, depth = 6) {
    super(scene, tint, depth, HARVEST_AVATAR);
  }

  /** 0–1: Corrupt HP as a share of max health. */
  setRot(v: number): void { this.rotTarget = Phaser.Math.Clamp(v, 0, 1); }

  setSickleOut(on: boolean): void { this.sickleOut = on; }

  /** Q: swing the scythe through `angle` from one side to the other. */
  reap(angle: number, side: number): void {
    this.swing = 1;
    this.swingAngle = angle;
    this.swingSide = side;
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    if (gesture === 'clap') this.gape = 1;
    super.play(gesture, angle, duration);
  }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.swing = Math.max(0, this.swing - delta / 460);
    this.gape = Math.max(0, this.gape - delta / 520);
    this.rot += (this.rotTarget - this.rot) * Math.min(1, delta / 400);
    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 13 : 9.5);
      glow.setFillStyle(this.tint(on ? HAR.purple : HAR.rot), on ? 0.36 : 0.28);
    });
  }

  protected emitTrail(x: number, y: number): void {
    const fx = new HarvestFx(this.scene, this.tint);
    const s = Math.random() * 9;
    fx.anim(4, 380, (g, t) => {
      g.fillStyle(this.tint(HAR.straw), 1 - t);
      g.lineStyle(1.2, this.tint(HAR.straw), 1 - t);
      g.lineBetween(x, y + t * 8, x + Math.cos(s) * 5, y + Math.sin(s) * 5 + t * 10);
    });
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    const k = this.intensity * (this.mastered ? 1.15 : 1);
    g.fillStyle(this.tint(HAR.rotDeep), a * 0.5 * k);
    g.fillEllipse(x, y + 18, 46 * k, 14 * k);
    if (this.rot > 0.02) {
      g.fillStyle(this.tint(HAR.purple), a * (0.12 + this.rot * 0.25));
      g.fillCircle(x, y, 26 + this.rot * 8);
    }
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const m = this.mastered;
    const lean = Math.cos(this.facing) * 1.6;
    const crown = y - 18;

    // ── The scythe, carried in the right hand: shaft down and back, blade looming overhead ──
    const hx = this.armX[1];
    const hy = this.armY[1];
    if (Number.isFinite(hx)) {
      const face = Math.cos(this.facing) >= 0 ? 1 : -1;
      if (this.swing > 0) {
        const u = 1 - this.swing;
        const sweep = this.swingAngle - this.swingSide * 1.3 + this.swingSide * 2.6 * easeOut(Math.min(1, u * 1.6));
        scytheShape(g, this.tint, hx, hy, sweep, 50, 34, this.swingSide, alpha, this.swing);
      } else {
        const shaft = -Math.PI / 2 - face * 0.32 + Math.sin(this.t * 1.6) * 0.03;
        scytheShape(g, this.tint, hx + face * 2, hy + 14, shaft, 52, m ? 34 : 28, -face, alpha * 0.98, 0.15 + this.rot * 0.4);
      }
    }

    // ── The sickle in the left hand, hanging blade-down — gone while it is in the air ──
    const sx = this.armX[0];
    const sy = this.armY[0];
    if (Number.isFinite(sx) && !this.sickleOut) {
      const face = Math.cos(this.facing) >= 0 ? 1 : -1;
      sickleShape(g, this.tint, sx + face * 2, sy + 6, Math.PI / 2 + face * 0.5, 7, alpha);
    }

    // ── The knot at the crown: the sack gathered, tied with cord, straw spilling out ──
    g.fillStyle(this.tint(HAR.sackDark), alpha);
    g.fillTriangle(x - 8 + lean, crown + 4, x + 8 + lean, crown + 4, x + lean, crown - 4);
    g.fillStyle(this.tint(HAR.sack), alpha);
    g.fillEllipse(x + lean, crown - 5, 11, 7);
    const strawN = m ? 9 : 7;
    for (let i = 0; i < strawN; i++) {
      const u = i / (strawN - 1) - 0.5;
      const ang = -Math.PI / 2 + u * 2.2 + Math.sin(this.t * 1.8 + i) * 0.06;
      const len = (m ? 13 : 9) + hjit(i, 3) * 5;
      g.lineStyle(1.5, this.tint(i % 2 ? HAR.strawLit : HAR.straw), alpha);
      g.lineBetween(x + lean, crown - 6, x + lean + Math.cos(ang) * len, crown - 6 + Math.sin(ang) * len);
    }
    g.lineStyle(2.4, this.tint(HAR.ink), alpha);
    g.lineBetween(x - 6 + lean, crown + 1, x + 6 + lean, crown + 1);
    g.lineStyle(1, this.tint(HAR.straw), alpha * 0.8);
    g.lineBetween(x - 5 + lean, crown + 0.5, x + 5 + lean, crown + 0.5);

    // ── The grin: a wide stitched crescent, glowing purple, drooling ──
    const look = Math.cos(this.facing) * 2.2;
    const mx = x + look;
    const my = y + 6 + Math.sin(this.facing) * 1.2;
    const w = (m ? 12 : 10.5) + this.gape * 2;
    const open = 2.2 + this.gape * 6 + (m ? 0.8 : 0);
    const top: Phaser.Geom.Point[] = [];
    const bot: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      const px = mx - w + u * w * 2;
      const curve = Math.sin(u * Math.PI);
      top.push(P(px, my - 1.6 - (1 - curve) * 3.4 + curve * 0.8));
      bot.push(P(px, my - 1.6 - (1 - curve) * 3.4 + curve * (open + 1.4)));
    }
    g.fillStyle(this.tint(HAR.rotDeep), alpha);
    g.fillPoints([...top, ...bot.slice().reverse()], true);
    g.fillStyle(this.tint(HAR.purple), alpha * (0.8 + 0.2 * Math.sin(this.t * 3)));
    g.fillPoints([...top.slice(1, 10), ...bot.slice(1, 10).reverse()], true);
    g.fillStyle(this.tint(HAR.glow), alpha * 0.55);
    g.fillEllipse(mx, my + open * 0.4, w * 0.9, Math.max(1, open * 0.5));
    // Stitches across the lips.
    g.lineStyle(1, this.tint(HAR.ink), alpha * 0.9);
    for (let i = 1; i < 10; i += 2) {
      g.lineBetween(top[i].x, top[i].y - 1.6, bot[i].x, bot[i].y + 1.6);
    }
    // Drool: two runs off the low corners of the grin, and a drop that lets go.
    const runs = m ? 3 : 2;
    for (let i = 0; i < runs; i++) {
      const at = bot[3 + i * 2];
      const len = 4 + ((this.t * (0.7 + i * 0.2) + i * 0.37) % 1) * (m ? 10 : 7);
      g.fillStyle(this.tint(HAR.purpleLit), alpha * 0.9);
      rotTendril(g, at.x, at.y, Math.PI / 2 + Math.sin(this.t * 1.5 + i) * 0.15, len, 1.5, 0.2, 0.1);
      const dropT = (this.t * 0.9 + i * 0.5) % 1;
      g.fillStyle(this.tint(HAR.purpleLit), alpha * (1 - dropT));
      g.fillCircle(at.x + 0.5, at.y + len + dropT * 12, 1.3);
    }
  }

}
