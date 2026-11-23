import type Phaser from 'phaser';
import { type G, dim, lit, mixC, shadow } from '../../../../art/IsleArt';

/**
 * Shared painters for the Heliostat — the Despot's iron crown of mirrors — used by the area, the
 * warden floor, the wardens, Auriel and the treasures. Everything here is white-hot gold, polished
 * silver and blued iron: the inside of a machine built to hold the sun still.
 */

// ── Palette ──────────────────────────────────────────────────────────

export const MARBLE = 0xf2ece0;
export const MARBLE_SHADE = 0xd6cbb6;
export const MARBLE_VEIN = 0xb8a88c;
export const GOLD = 0xe8b83a;
export const GOLD_LIT = 0xffe27a;
export const GOLD_DARK = 0x8a6418;
export const BRASS = 0xc89a3a;
export const BRASS_DARK = 0x6a4a18;
export const IRON = 0x2a2a34;
export const IRON_LIT = 0x5a5c6c;
export const IRON_BLUE = 0x34405a;
export const RIVET = 0x8a8a98;
export const MIRROR = 0xcfe2ee;
export const MIRROR_LIT = 0xffffff;
export const MIRROR_DARK = 0x6a7e92;
export const GLARE = 0xfffbe8;
export const SUN = 0xfff2a0;
export const SUN_HOT = 0xffb030;
export const SUN_DEEP = 0xff7a18;
export const SCORCH = 0x2a160a;
export const SOUL = 0xa8d8ff;
export const SKY = 0xe8f2ff;
export const DUSK = 0xd8603a;
export const NIGHT = 0x0c0e24;
export const STAR = 0xf0f4ff;

export type Gfx = Phaser.GameObjects.Graphics;

const TAU = Math.PI * 2;

// ── The Despot's seal ────────────────────────────────────────────────

/**
 * The sunburst: a disc with twelve straight rays between twelve wavy ones — the seal stamped on
 * every mirror-frame, coin and ticket on Solmara. `a` is the alpha.
 */
export function sunburst(g: G, x: number, y: number, r: number, color: number, a = 1, spin = 0): void {
  for (let i = 0; i < 24; i++) {
    const ang = spin + (i / 24) * TAU;
    const long = i % 2 === 0;
    const len = long ? r : r * 0.72;
    const w = long ? 0.07 : 0.1;
    g.fillStyle(color, a * (long ? 1 : 0.75));
    if (long) {
      g.fillTriangle(
        x + Math.cos(ang - w) * r * 0.42, y + Math.sin(ang - w) * r * 0.42,
        x + Math.cos(ang + w) * r * 0.42, y + Math.sin(ang + w) * r * 0.42,
        x + Math.cos(ang) * len, y + Math.sin(ang) * len,
      );
    } else {
      // The wavy ray: three short kinked triangles.
      for (let k = 0; k < 3; k++) {
        const f0 = 0.42 + k * 0.1, f1 = f0 + 0.1;
        const off = (k % 2 ? 1 : -1) * 0.05;
        g.fillTriangle(
          x + Math.cos(ang - w + off) * r * f0, y + Math.sin(ang - w + off) * r * f0,
          x + Math.cos(ang + w + off) * r * f0, y + Math.sin(ang + w + off) * r * f0,
          x + Math.cos(ang - off) * r * Math.min(f1, len / r), y + Math.sin(ang - off) * r * Math.min(f1, len / r),
        );
      }
    }
  }
  g.fillStyle(dim(color, 0.25), a); g.fillCircle(x, y, r * 0.42);
  g.fillStyle(color, a); g.fillCircle(x, y, r * 0.36);
  g.fillStyle(lit(color, 0.6), a * 0.8); g.fillCircle(x - r * 0.1, y - r * 0.1, r * 0.16);
  // A stern little face in the disc: the Despot himself.
  g.lineStyle(Math.max(1, r * 0.04), dim(color, 0.5), a * 0.8);
  g.lineBetween(x - r * 0.16, y - r * 0.06, x - r * 0.05, y - r * 0.04);
  g.lineBetween(x + r * 0.05, y - r * 0.04, x + r * 0.16, y - r * 0.06);
  g.lineBetween(x - r * 0.1, y + r * 0.14, x + r * 0.1, y + r * 0.14);
}

// ── Light ────────────────────────────────────────────────────────────

/** A shaft of sunlight standing on the floor: a tall soft column with a hot oval where it lands. */
export function lightShaft(g: G, x: number, y: number, w: number, height: number, color: number, a: number): void {
  for (let i = 0; i < 4; i++) {
    const k = 1 - i * 0.22;
    g.fillStyle(color, a * 0.16);
    g.fillRect(x - (w * k) / 2, y - height, w * k, height);
  }
  g.fillStyle(0xffffff, a * 0.5); g.fillRect(x - w * 0.08, y - height, w * 0.16, height);
  g.fillStyle(color, a * 0.5); g.fillEllipse(x, y, w * 1.3, w * 0.5);
  g.fillStyle(0xffffff, a * 0.8); g.fillEllipse(x, y, w * 0.7, w * 0.26);
}

/** The sun itself: a white core, gold body, a corona of flickering rays. `t` in ms. */
export function sunDisc(g: G, x: number, y: number, r: number, t: number, a = 1, hot = SUN_HOT): void {
  for (let i = 0; i < 5; i++) { g.fillStyle(hot, a * 0.05); g.fillCircle(x, y, r * (2.4 - i * 0.25)); }
  for (let i = 0; i < 18; i++) {
    const ang = (i / 18) * TAU + t / 4000;
    const len = r * (1.35 + Math.sin(t / 180 + i * 2.3) * 0.18 + (i % 3 === 0 ? 0.25 : 0));
    g.fillStyle(i % 2 ? SUN : hot, a * 0.55);
    g.fillTriangle(
      x + Math.cos(ang - 0.09) * r * 0.9, y + Math.sin(ang - 0.09) * r * 0.9,
      x + Math.cos(ang + 0.09) * r * 0.9, y + Math.sin(ang + 0.09) * r * 0.9,
      x + Math.cos(ang) * len, y + Math.sin(ang) * len,
    );
  }
  g.fillStyle(hot, a); g.fillCircle(x, y, r);
  g.fillStyle(SUN, a); g.fillCircle(x, y, r * 0.86);
  g.fillStyle(0xffffff, a); g.fillCircle(x, y, r * 0.6);
  // Granulation: little bright cells on the face.
  for (let i = 0; i < 7; i++) {
    const ang = i * 2.1 + t / 1500;
    g.fillStyle(SUN, a * 0.6); g.fillCircle(x + Math.cos(ang) * r * 0.62, y + Math.sin(ang) * r * 0.62, r * 0.1);
  }
}

/**
 * Pool-bottom caustics: a net of wobbling bright lines. `t` in ms; the net drifts and breathes.
 * Used for light coming through lenses and off water-mirrors.
 */
export function caustics(g: G, x: number, y: number, r: number, t: number, color: number, a: number, seed = 0): void {
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a0 = seed + i * 2.399;
    const cx = x + Math.cos(a0) * r * 0.55, cy = y + Math.sin(a0) * r * 0.45;
    g.lineStyle(1.5, color, a * (0.5 + 0.5 * Math.sin(t / 400 + i)));
    g.beginPath();
    for (let k = 0; k <= 7; k++) {
      const ang = (k / 7) * TAU;
      const rr = r * 0.22 * (1 + 0.35 * Math.sin(t / 300 + k * 1.7 + i));
      const px = cx + Math.cos(ang) * rr, py = cy + Math.sin(ang) * rr * 0.7;
      if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }
}

/** A narrow sunbeam from a to b: soft halo, hot core, glints running along it. `t` in ms. */
export function beam(g: G, ax: number, ay: number, bx: number, by: number, w: number, t: number, a = 1, color = SUN): void {
  g.lineStyle(w * 2.4, color, a * 0.12); g.lineBetween(ax, ay, bx, by);
  g.lineStyle(w * 1.4, color, a * 0.35); g.lineBetween(ax, ay, bx, by);
  g.lineStyle(w * 0.6, 0xffffff, a * 0.9); g.lineBetween(ax, ay, bx, by);
  const len = Math.hypot(bx - ax, by - ay);
  if (len < 1) return;
  const ux = (bx - ax) / len, uy = (by - ay) / len;
  for (let d = (t * 0.6) % 46; d < len; d += 46) {
    g.fillStyle(0xffffff, a * 0.9); g.fillCircle(ax + ux * d, ay + uy * d, w * 0.45);
  }
}

// ── Machinery ────────────────────────────────────────────────────────

/**
 * A gear seen from above: rim, `teeth` square teeth, six spokes, a hub with a bright axle. `ang`
 * turns it. `hot` lights one tooth red-white — the one that bites.
 */
export function cog(g: G, x: number, y: number, r: number, teeth: number, ang: number, metal = IRON_LIT, hot = -1): void {
  g.fillStyle(0x000000, 0.25); g.fillCircle(x + 4, y + 6, r + 6);
  for (let i = 0; i < teeth; i++) {
    const a = ang + (i / teeth) * TAU;
    const w = (Math.PI / teeth) * 0.55;
    const c = i === hot ? 0xffe0b0 : metal;
    g.fillStyle(i === hot ? SUN_DEEP : dim(metal, 0.3), 1);
    g.fillPoints([
      { x: x + Math.cos(a - w) * (r - 2), y: y + Math.sin(a - w) * (r - 2) },
      { x: x + Math.cos(a - w * 0.75) * (r + 11), y: y + Math.sin(a - w * 0.75) * (r + 11) },
      { x: x + Math.cos(a + w * 0.75) * (r + 11), y: y + Math.sin(a + w * 0.75) * (r + 11) },
      { x: x + Math.cos(a + w) * (r - 2), y: y + Math.sin(a + w) * (r - 2) },
    ] as Phaser.Types.Math.Vector2Like[], true, true);
    g.fillStyle(c, 1);
    g.fillPoints([
      { x: x + Math.cos(a - w * 0.8) * (r - 1), y: y + Math.sin(a - w * 0.8) * (r - 1) },
      { x: x + Math.cos(a - w * 0.6) * (r + 9), y: y + Math.sin(a - w * 0.6) * (r + 9) },
      { x: x + Math.cos(a + w * 0.6) * (r + 9), y: y + Math.sin(a + w * 0.6) * (r + 9) },
      { x: x + Math.cos(a + w * 0.8) * (r - 1), y: y + Math.sin(a + w * 0.8) * (r - 1) },
    ] as Phaser.Types.Math.Vector2Like[], true, true);
  }
  g.fillStyle(dim(metal, 0.35), 1); g.fillCircle(x, y, r);
  g.fillStyle(metal, 1); g.fillCircle(x, y, r - 3);
  g.fillStyle(dim(metal, 0.55), 1); g.fillCircle(x, y, r * 0.72);
  // Spokes, with the gaps between them showing the dark below.
  for (let i = 0; i < 6; i++) {
    const a = ang + (i / 6) * TAU;
    g.lineStyle(r * 0.16, metal, 1);
    g.lineBetween(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2, x + Math.cos(a) * r * 0.74, y + Math.sin(a) * r * 0.74);
    g.lineStyle(1.5, lit(metal, 0.3), 0.7);
    g.lineBetween(x + Math.cos(a) * r * 0.24 - 2, y + Math.sin(a) * r * 0.24 - 2, x + Math.cos(a) * r * 0.7 - 2, y + Math.sin(a) * r * 0.7 - 2);
  }
  g.lineStyle(2, lit(metal, 0.35), 0.8); g.strokeCircle(x, y, r - 5);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y, r * 0.24);
  g.fillStyle(GOLD_LIT, 1); g.fillCircle(x - r * 0.05, y - r * 0.05, r * 0.1);
  for (let i = 0; i < 6; i++) {
    const a = ang + (i / 6) * TAU + Math.PI / 6;
    g.fillStyle(RIVET, 1); g.fillCircle(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86, 2);
  }
}

/** One link of the Sun Chain, seen from above: an iron oval with a lit edge. */
export function chainLink(g: G, x: number, y: number, ang: number, s: number, metal = IRON_LIT): void {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const pts: Phaser.Types.Math.Vector2Like[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const lx = Math.cos(a) * s, ly = Math.sin(a) * s * 0.48;
    pts.push({ x: x + lx * ca - ly * sa, y: y + lx * sa + ly * ca });
  }
  g.lineStyle(s * 0.32, dim(metal, 0.45), 1); g.strokePoints(pts, true, true);
  g.lineStyle(s * 0.2, metal, 1); g.strokePoints(pts, true, true);
  g.lineStyle(s * 0.06, lit(metal, 0.45), 0.9);
  g.lineBetween(x - ca * s * 0.6 - sa * s * 0.38, y - sa * s * 0.6 + ca * s * 0.38 - 1, x + ca * s * 0.6 - sa * s * 0.38, y + sa * s * 0.6 + ca * s * 0.38 - 1);
}

/**
 * A great lens in a brass ring, seen from below as it hangs: the glass a pale disc with a hot
 * bright eye where the sun comes through, two crescent highlights, a ring with bolts.
 */
export function lens(g: G, x: number, y: number, r: number, t: number, heat = 0.5, a = 1): void {
  g.fillStyle(BRASS_DARK, a); g.fillCircle(x, y, r + 6);
  g.fillStyle(BRASS, a); g.fillCircle(x, y, r + 4);
  g.fillStyle(GOLD_LIT, a * 0.7); g.beginPath(); g.arc(x, y, r + 4, Math.PI * 1.05, Math.PI * 1.6, false); g.lineTo(x, y); g.closePath(); g.fillPath();
  g.fillStyle(BRASS, a); g.fillCircle(x, y, r + 1);
  g.fillStyle(mixC(SKY, SUN, heat), a * 0.85); g.fillCircle(x, y, r);
  g.fillStyle(0xffffff, a * (0.4 + heat * 0.5)); g.fillCircle(x, y, r * (0.25 + heat * 0.2));
  g.lineStyle(2, 0xffffff, a * 0.8);
  g.beginPath(); g.arc(x, y, r * 0.78, Math.PI * 1.1, Math.PI * 1.5, false); g.strokePath();
  g.lineStyle(1.2, 0xffffff, a * 0.5);
  g.beginPath(); g.arc(x, y, r * 0.6, Math.PI * 0.1, Math.PI * 0.35, false); g.strokePath();
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * TAU + t / 9000;
    g.fillStyle(BRASS_DARK, a); g.fillCircle(x + Math.cos(ang) * (r + 3), y + Math.sin(ang) * (r + 3), 1.6);
  }
}

/**
 * A tall standing mirror in a gilt frame on a pivot yoke, seen from the front. `tilt` (−1..1)
 * turns the face: the glass narrows and its reflection slides. `x, y` is the foot of the stand.
 */
export function standingMirror(g: G, x: number, y: number, w: number, h: number, tilt: number, flash = 0, rng?: () => number): void {
  shadow(g, x, y + 2, w * 1.2, 12, 0.22);
  // Yoke and feet.
  g.fillStyle(IRON, 1); g.fillRect(x - w * 0.62, y - 6, w * 1.24, 6);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - w * 0.62, y - 6, w * 1.24, 2);
  g.fillStyle(IRON, 1); g.fillRect(x - w * 0.58, y - h * 0.62, 5, h * 0.62); g.fillRect(x + w * 0.58 - 5, y - h * 0.62, 5, h * 0.62);
  g.fillStyle(BRASS, 1); g.fillCircle(x - w * 0.58 + 2.5, y - h * 0.6, 4); g.fillCircle(x + w * 0.58 - 2.5, y - h * 0.6, 4);
  const fw = w * (0.55 + 0.45 * Math.cos(tilt * 1.1));
  const top = y - h - 8, mid = y - h * 0.6;
  // Gilt frame.
  g.fillStyle(GOLD_DARK, 1); g.fillRoundedRect(x - fw / 2 - 5, top, fw + 10, h, 6);
  g.fillStyle(GOLD, 1); g.fillRoundedRect(x - fw / 2 - 4, top + 1, fw + 8, h - 2, 6);
  g.fillStyle(GOLD_LIT, 0.7); g.fillRect(x - fw / 2 - 3, top + 2, fw + 6, 2);
  // Glass: the sky, a streak of reflection that slides with the tilt.
  g.fillStyle(MIRROR_DARK, 1); g.fillRect(x - fw / 2, top + 5, fw, h - 10);
  g.fillStyle(MIRROR, 1); g.fillRect(x - fw / 2 + 1, top + 6, fw - 2, h - 12);
  g.fillStyle(SKY, 0.8); g.fillRect(x - fw / 2 + 1, top + 6, fw - 2, (h - 12) * 0.4);
  const sx = x + tilt * fw * 0.3;
  g.fillStyle(0xffffff, 0.75);
  g.fillPoints([
    { x: sx - fw * 0.18, y: top + 6 }, { x: sx - fw * 0.02, y: top + 6 },
    { x: sx + fw * 0.12, y: top + h - 6 }, { x: sx - fw * 0.04, y: top + h - 6 },
  ] as Phaser.Types.Math.Vector2Like[], true, true);
  if (rng) {
    for (let i = 0; i < 3; i++) { g.fillStyle(0xffffff, 0.35); g.fillRect(x - fw / 2 + 3 + rng() * (fw - 8), top + 10 + rng() * (h - 24), 2, 6 + rng() * 10); }
  }
  // Crest: a small sunburst on the frame top.
  sunburst(g, x, top - 2, 9, GOLD, 1);
  if (flash > 0) {
    g.fillStyle(0xffffff, flash * 0.7); g.fillRect(x - fw / 2, top + 5, fw, h - 10);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      g.lineStyle(2, 0xffffff, flash * 0.8);
      g.lineBetween(x + Math.cos(a) * 8, mid + Math.sin(a) * 8, x + Math.cos(a) * (20 + flash * 26), mid + Math.sin(a) * (20 + flash * 26));
    }
  }
}

/** A mirror pane lying flat in a floor or wall, seen from above, catching a slant of sky. */
export function mirrorPane(g: G, x: number, y: number, w: number, h: number, frame = GOLD, a = 1): void {
  g.fillStyle(dim(frame, 0.4), a); g.fillRect(x - 2, y - 2, w + 4, h + 4);
  g.fillStyle(frame, a); g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle(MIRROR_DARK, a); g.fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle(MIRROR, a); g.fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle(SKY, a * 0.7); g.fillTriangle(x + 2, y + 2, x + w * 0.6, y + 2, x + 2, y + h * 0.7);
  g.fillStyle(0xffffff, a * 0.6); g.fillRect(x + w * 0.2, y + 3, 2, h - 6);
}

/** An iron girder seen from above: a dark channel, lit flanges and a rivet line. */
export function girder(g: G, x: number, y: number, w: number, h: number): void {
  g.fillStyle(0x14141a, 1); g.fillRect(x, y, w, h);
  const horiz = w >= h;
  g.fillStyle(IRON, 1);
  if (horiz) { g.fillRect(x, y + 2, w, h - 4); } else { g.fillRect(x + 2, y, w - 4, h); }
  g.fillStyle(IRON_LIT, 1);
  if (horiz) { g.fillRect(x, y + 2, w, 3); g.fillRect(x, y + h - 6, w, 2); } else { g.fillRect(x + 2, y, 3, h); g.fillRect(x + w - 6, y, 2, h); }
  g.fillStyle(IRON_BLUE, 0.6);
  if (horiz) g.fillRect(x, y + h / 2 - 2, w, 4); else g.fillRect(x + w / 2 - 2, y, 4, h);
  g.fillStyle(RIVET, 1);
  if (horiz) { for (let k = x + 10; k < x + w - 4; k += 18) { g.fillCircle(k, y + 7, 1.6); g.fillCircle(k, y + h - 8, 1.6); } } else {
    for (let k = y + 10; k < y + h - 4; k += 18) { g.fillCircle(x + 7, k, 1.6); g.fillCircle(x + w - 8, k, 1.6); }
  }
}

/** A Clear — someone bleached in the Burning Glass: drawn as a faint outline you can see through. */
export function clearFigure(g: G, x: number, y: number, s: number, t: number, a = 0.45): void {
  const bob = Math.sin(t / 700) * 1.5;
  g.lineStyle(1.5, 0xffffff, a); g.fillStyle(SKY, a * 0.25);
  g.fillEllipse(x, y - 14 * s + bob, 18 * s, 24 * s); g.strokeEllipse(x, y - 14 * s + bob, 18 * s, 24 * s);
  g.fillCircle(x, y - 32 * s + bob, 7 * s); g.strokeCircle(x, y - 32 * s + bob, 7 * s);
  g.fillStyle(0xffffff, a * 0.8); g.fillCircle(x - 2.5 * s, y - 33 * s + bob, 1.2 * s); g.fillCircle(x + 2.5 * s, y - 33 * s + bob, 1.2 * s);
}

/** A burn scar on stone: a dark ring with a glassy, fused centre. */
export function scorch(g: G, x: number, y: number, r: number, rng: () => number, a = 1): void {
  g.fillStyle(SCORCH, a * 0.35); g.fillEllipse(x, y, r * 2.2, r * 1.5);
  g.fillStyle(SCORCH, a * 0.5); g.fillEllipse(x, y, r * 1.5, r * 1.0);
  g.fillStyle(0x6a4a2a, a * 0.6); g.fillEllipse(x, y, r * 0.9, r * 0.6);
  g.fillStyle(0xd8c8a0, a * 0.5); g.fillEllipse(x - r * 0.15, y - r * 0.1, r * 0.4, r * 0.22);
  for (let i = 0; i < 6; i++) {
    const ang = rng() * TAU;
    g.lineStyle(1, SCORCH, a * 0.6);
    g.lineBetween(x + Math.cos(ang) * r * 0.5, y + Math.sin(ang) * r * 0.35, x + Math.cos(ang) * r * (1 + rng() * 0.5), y + Math.sin(ang) * r * (0.7 + rng() * 0.3));
  }
}
