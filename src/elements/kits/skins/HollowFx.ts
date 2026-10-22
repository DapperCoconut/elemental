import Phaser from 'phaser';
import { FxBase, TAU, easeIn, easeOut } from '../ElementVisuals';

/**
 * The Hollow skin's ability art (Cloth). Visual only — every function here is called from a
 * small branch in `ClothKit` in place of the cloth drawing it replaces, at the same position
 * and footprint, so the hitboxes the original art was honest about stay honest.
 *
 * - **Pin** (click) becomes a direct nail thrust: a straight white stab line out of the caster
 *   with a thin crescent where it ends, instead of a little star of steel.
 * - **Longpin** (E) becomes a thrown nail: a slim pale blade with a wrapped grip.
 * - **The scarf** (the hitbox trail) becomes the knight's cloak, dragged behind with a torn hem.
 * - **The tapestry** (Q) becomes the charm menu: a black panel with pale filigree, round charm
 *   notches for the loom cells and round charms for the sewn pieces.
 *
 * Colours are a local const rather than routed through Cloth's remap, since this art only ever
 * draws for the Hollow owner and is already in its final colours.
 */
export const HK = {
  void: 0x05060a,
  abyss: 0x0d0f17,
  panel: 0x101320,
  cloakDeep: 0x141824,
  cloak: 0x262c3d,
  cloakLit: 0x3d4660,
  filigreeDim: 0x5c6478,
  filigree: 0xa9b0c0,
  shellDeep: 0x8890a2,
  shellShade: 0xc4cad6,
  shell: 0xf1f3f7,
  white: 0xffffff,
  soulDim: 0x5f86b0,
  soul: 0xbfe3ff,
  nailDark: 0x6e7688,
  nail: 0xe9edf4,
  grip: 0x3a3226,
  gripLit: 0x6a5c44,
  ember: 0xe04848,
  emberLit: 0xff9a8a,
  emberDark: 0x7a1420,
};

const P = (x: number, y: number) => new Phaser.Geom.Point(x, y);

/** A cheap deterministic hash, for torn-hem wobble that does not crawl between frames. */
function hash(seed: number, n: number): number {
  const v = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

// ── The nail ────────────────────────────────────────────────────────────────

/**
 * The nail: a slim pale blade with a rounded point, a short crossguard and a wrapped grip.
 * `(x, y)` is the blade's middle; `ang` points from grip toward tip.
 */
export function nailBlade(
  g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, len: number, alpha: number,
  opts: { pure?: boolean; dark?: boolean } = {},
): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  const nx = -s, ny = c;
  const bladeLen = len * 0.72;
  const gripLen = len * 0.28;
  const baseX = x - c * len * 0.5 + c * gripLen;
  const baseY = y - s * len * 0.5 + s * gripLen;
  const w = Math.max(1.6, len * (opts.pure ? 0.085 : 0.075));
  const at = (u: number, side: number, half: number) =>
    P(baseX + c * bladeLen * u + nx * half * side, baseY + s * bladeLen * u + ny * half * side);

  // Blade: wide at the guard, a slow taper, then a round-ish point.
  const blade: Phaser.Geom.Point[] = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    blade.push(at(u, 1, w * (u < 0.82 ? 1 - u * 0.25 : (1 - u) / 0.18 * 0.8)));
  }
  for (let i = steps; i >= 0; i--) {
    const u = i / steps;
    blade.push(at(u, -1, w * (u < 0.82 ? 1 - u * 0.25 : (1 - u) / 0.18 * 0.8)));
  }
  g.fillStyle(opts.dark ? HK.void : HK.nailDark, alpha);
  g.fillPoints(blade.map((p) => P(p.x + nx * 0.8, p.y + ny * 0.8)), true);
  g.fillStyle(opts.dark ? HK.abyss : HK.nail, alpha);
  g.fillPoints(blade, true);
  // The lit edge — one bright line down the upper flat.
  g.lineStyle(Math.max(0.8, w * 0.45), opts.dark ? HK.cloakLit : HK.white, alpha * 0.9);
  g.lineBetween(
    baseX + nx * w * 0.35, baseY + ny * w * 0.35,
    baseX + c * bladeLen * 0.8 + nx * w * 0.25, baseY + s * bladeLen * 0.8 + ny * w * 0.25,
  );

  // Crossguard.
  g.lineStyle(w * 1.1, opts.dark ? HK.void : HK.nailDark, alpha);
  g.lineBetween(baseX + nx * w * 2.1, baseY + ny * w * 2.1, baseX - nx * w * 2.1, baseY - ny * w * 2.1);
  // Grip, wrapped.
  const gx0 = baseX, gy0 = baseY;
  const gx1 = baseX - c * gripLen, gy1 = baseY - s * gripLen;
  g.lineStyle(w * 1.3, opts.dark ? HK.void : HK.grip, alpha);
  g.lineBetween(gx0, gy0, gx1, gy1);
  g.lineStyle(0.9, opts.dark ? HK.cloak : HK.gripLit, alpha * 0.9);
  for (let i = 1; i < 4; i++) {
    const u = i / 4;
    const px = gx0 + (gx1 - gx0) * u, py = gy0 + (gy1 - gy0) * u;
    g.lineBetween(px + nx * w * 0.6 - c, py + ny * w * 0.6 - s, px - nx * w * 0.6 + c, py - ny * w * 0.6 + s);
  }
  g.fillStyle(opts.dark ? HK.void : HK.nailDark, alpha);
  g.fillCircle(gx1, gy1, w * 0.85);

  // The Pure Nail keeps a soft glint travelling its edge.
  if (opts.pure && !opts.dark) {
    g.fillStyle(HK.soul, alpha * 0.5);
    g.fillCircle(baseX + c * bladeLen * 0.9, baseY + s * bladeLen * 0.9, w * 1.4);
  }
}

/** Longpin, reskinned: a nail thrown point-first, with a faint soul wake behind it. */
export function thrownNail(
  g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, alpha: number, t: number,
  flying: boolean,
): void {
  if (flying) {
    const c = Math.cos(ang), s = Math.sin(ang);
    for (let i = 1; i <= 4; i++) {
      g.fillStyle(HK.soul, alpha * 0.16 * (1 - i / 5));
      g.fillCircle(x - c * (14 + i * 7), y - s * (14 + i * 7), 4.5 - i * 0.7);
    }
  }
  nailBlade(g, x, y, ang, 34, alpha);
  if (!flying) {
    // Planted: a slow pale pulse at the bite, the tell that it is still recallable.
    const k = (t * 0.9) % 1;
    g.lineStyle(1.4, HK.soul, alpha * (1 - k) * 0.7);
    g.strokeCircle(x + Math.cos(ang) * 12, y + Math.sin(ang) * 12, 3 + k * 9);
  }
}

// ── The cloak (the scarf trail) ─────────────────────────────────────────────

/**
 * The scarf, as a cloak: the same tapered quads the wool ribbon uses (the trail is the hitbox,
 * so its footprint must not move), but black-blue with a torn hem along both edges and a
 * ragged end instead of a fringe.
 */
export function hollowCape(
  g: Phaser.GameObjects.Graphics, pts: Array<{ x: number; y: number }>, width: number, alpha: number,
  opts: { t?: number; burn?: number; pinned?: number; ghost?: boolean; voidK?: number } = {},
): void {
  if (pts.length < 2) return;
  const t = opts.t ?? 0;
  const burn = opts.burn ?? 0;
  const pinned = opts.pinned ?? 0;
  const vk = opts.voidK ?? 0;
  const n = pts.length;
  const a0 = alpha * (opts.ghost ? 0.4 : 1);

  for (let i = 0; i < n - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const k0 = 1 - i / (n - 1);
    const k1 = 1 - (i + 1) / (n - 1);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const wob = Math.sin(t * 2.6 + i * 0.5) * (1 - k0) * 2.2;
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    const w0 = width * (0.4 + k0 * 0.6) * 0.5;
    const w1 = width * (0.4 + k1 * 0.6) * 0.5;
    const tailK = i / (n - 1);
    const scorch = burn > 0 && tailK > 1 - burn ? Math.min(1, (tailK - (1 - burn)) / Math.max(0.05, burn)) : 0;
    const body = scorch > 0.55 ? HK.emberDark : scorch > 0 ? HK.ember : vk > 0.5 ? HK.void : HK.cloakDeep;
    const face = scorch > 0.55 ? HK.ember : scorch > 0 ? HK.emberLit : pinned > 0.5 ? HK.soulDim : vk > 0.5 ? HK.abyss : HK.cloak;

    const ax = a.x + nx * wob, ay = a.y + ny * wob;
    const bx = b.x + nx * wob, by = b.y + ny * wob;

    g.fillStyle(body, a0 * 0.96);
    g.fillPoints([
      P(ax + nx * w0, ay + ny * w0), P(bx + nx * w1, by + ny * w1),
      P(bx - nx * w1, by - ny * w1), P(ax - nx * w0, ay - ny * w0),
    ], true);
    g.fillStyle(face, a0 * 0.9);
    g.fillPoints([
      P(ax + nx * w0 * 0.6, ay + ny * w0 * 0.6), P(bx + nx * w1 * 0.6, by + ny * w1 * 0.6),
      P(bx - nx * w1 * 0.05, by - ny * w1 * 0.05), P(ax - nx * w0 * 0.05, ay - ny * w0 * 0.05),
    ], true);

    // Torn hem: a little tooth hanging off each edge every other segment.
    if (i % 2 === 1 && w0 > 1.5) {
      for (const side of [-1, 1]) {
        const len = 2.5 + hash(i, side + 3) * 3.5;
        const mx = (ax + bx) / 2 + nx * w0 * side, my = (ay + by) / 2 + ny * w0 * side;
        g.fillStyle(body, a0 * 0.9);
        g.fillTriangle(
          mx - Math.cos(ang) * 2.4, my - Math.sin(ang) * 2.4,
          mx + Math.cos(ang) * 2.4, my + Math.sin(ang) * 2.4,
          mx + nx * len * side - Math.cos(ang) * 1.5, my + ny * len * side - Math.sin(ang) * 1.5,
        );
      }
    }
    // A faint fold line down the middle, so the cloak has weight instead of reading as a stripe.
    if (i % 3 === 0 && w0 > 2) {
      g.lineStyle(0.9, vk > 0.5 ? HK.cloakDeep : HK.cloakLit, a0 * 0.35);
      g.lineBetween(ax, ay, bx, by);
    }
  }

  // Ragged end: three uneven tatters instead of a fringe.
  const last = pts[n - 1];
  const prev = pts[Math.max(0, n - 2)];
  const ang = Math.atan2(last.y - prev.y, last.x - prev.x);
  for (let f = -1; f <= 1; f++) {
    const fa = ang + f * 0.45 + Math.sin(t * 4 + f) * 0.12;
    const len = width * (0.55 + hash(f + 2, 7) * 0.35);
    const bx = last.x + Math.cos(ang + Math.PI / 2) * f * width * 0.12;
    const by = last.y + Math.sin(ang + Math.PI / 2) * f * width * 0.12;
    g.fillStyle(burn > 0.05 ? HK.emberDark : HK.cloakDeep, a0 * 0.9);
    g.fillTriangle(
      bx - Math.sin(fa) * 2.2, by + Math.cos(fa) * 2.2,
      bx + Math.sin(fa) * 2.2, by - Math.cos(fa) * 2.2,
      bx + Math.cos(fa) * len, by + Math.sin(fa) * len,
    );
  }

  // Embers riding a burning cloak.
  if (burn > 0.02) {
    for (let i = 0; i < 5; i++) {
      const k = (t * 1.3 + i / 5) % 1;
      const at = pts[Math.min(n - 1, Math.floor((1 - burn * k) * (n - 1)))];
      g.fillStyle(i % 2 ? HK.ember : HK.emberLit, alpha * (1 - k) * 0.85);
      g.fillCircle(at.x + (hash(i, 3) - 0.5) * 7, at.y - k * 12 + (hash(i, 9) - 0.5) * 5, 1.4 + (1 - k) * 1.6);
    }
  }
  // Void form: wisps of shade lifting off the cloak.
  if (vk > 0.05) {
    for (let i = 0; i < 6; i++) {
      const k = (t * 0.9 + i / 6) % 1;
      const at = pts[Math.min(n - 1, Math.floor((i / 6) * (n - 1)))];
      g.fillStyle(HK.void, alpha * vk * (1 - k) * 0.7);
      g.fillCircle(at.x + Math.sin(t * 3 + i) * 4, at.y - k * 16, 3.2 * (1 - k * 0.5));
    }
  }
}

// ── The charm menu (the tapestry) ───────────────────────────────────────────

/**
 * One loom cell, as a charm notch. Empty: a dark round socket with a pale rim. Filled: a round
 * charm in the artwork's colour — dark bezel, coloured face, a lit lower crescent and a glint.
 */
export function charmCell(
  g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, color: number | null,
  alpha: number, t = 0,
): void {
  const cx = x + size / 2, cy = y + size / 2;
  const r = size * 0.44;
  if (color === null) {
    g.fillStyle(HK.void, alpha * 0.85);
    g.fillCircle(cx, cy, r);
    g.lineStyle(Math.max(0.8, size * 0.05), HK.filigreeDim, alpha * 0.8);
    g.strokeCircle(cx, cy, r);
    g.fillStyle(HK.filigreeDim, alpha * 0.35);
    g.fillCircle(cx, cy, Math.max(0.8, r * 0.18));
    return;
  }
  g.fillStyle(HK.void, alpha);
  g.fillCircle(cx, cy, r + Math.max(0.8, size * 0.04));
  g.fillStyle(HK.filigree, alpha);
  g.fillCircle(cx, cy, r);
  g.fillStyle(color, alpha);
  g.fillCircle(cx, cy, r * 0.84);
  // A darker cut across the top so the charm has a face and a shadow.
  g.fillStyle(HK.void, alpha * 0.3);
  g.fillEllipse(cx, cy - r * 0.3, r * 1.4, r * 0.7);
  // An emblem: a small pale diamond, every charm carries one.
  if (size >= 9) {
    const d = r * 0.36;
    g.fillStyle(HK.shell, alpha * 0.85);
    g.fillPoints([P(cx, cy - d), P(cx + d * 0.7, cy), P(cx, cy + d), P(cx - d * 0.7, cy)], true);
  }
  g.fillStyle(HK.white, alpha * (0.55 + 0.25 * Math.sin(t * 3 + x * 0.1)));
  g.fillCircle(cx - r * 0.4, cy - r * 0.42, Math.max(0.7, r * 0.18));
}

/** Filigree corner flourish: a curl and a spike, pointing out of the panel's corner. */
function flourish(g: Phaser.GameObjects.Graphics, x: number, y: number, sx: number, sy: number, alpha: number): void {
  g.lineStyle(1.2, HK.filigree, alpha);
  g.beginPath();
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    const a = u * Math.PI * 1.3;
    const r = 7 * (1 - u * 0.6);
    const px = x + sx * (9 - Math.cos(a) * r);
    const py = y + sy * (9 - Math.sin(a) * r);
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
  g.fillStyle(HK.shell, alpha);
  g.fillPoints([P(x, y), P(x + sx * 7, y + sy * 2.2), P(x + sx * 2.2, y + sy * 7)], true);
}

/**
 * The charm-menu panel: near-black, a hairline pale border inset from the edge, and a filigree
 * curl in each corner. Stands in for Cloth's fabric swatch everywhere it is drawn.
 */
export function charmPanel(
  g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number,
  accent: number, t: number, alpha = 0.92,
): void {
  g.fillStyle(0x000000, alpha * 0.45);
  g.fillRoundedRect(x + 2, y + 3, w, h, 4);
  g.fillStyle(HK.void, alpha);
  g.fillRoundedRect(x, y, w, h, 4);
  g.fillStyle(HK.panel, alpha * 0.9);
  g.fillRoundedRect(x + 2, y + 2, w - 4, h - 4, 3);
  // Faint vertical sheen, like the menu's lacquered backing.
  g.fillStyle(HK.cloakLit, alpha * 0.08);
  g.fillRect(x + 3, y + 3, w - 6, Math.min(8, h * 0.25));
  g.lineStyle(1, HK.filigreeDim, alpha * 0.9);
  g.strokeRoundedRect(x + 4.5, y + 4.5, w - 9, h - 9, 2);
  g.lineStyle(1, accent, alpha * (0.55 + 0.15 * Math.sin(t * 2)));
  g.lineBetween(x + 14, y + 4.5, x + w - 14, y + 4.5);
  g.lineBetween(x + 14, y + h - 4.5, x + w - 14, y + h - 4.5);
  if (w >= 40 && h >= 30) {
    flourish(g, x + 2, y + 2, 1, 1, alpha * 0.85);
    flourish(g, x + w - 2, y + 2, -1, 1, alpha * 0.85);
    flourish(g, x + 2, y + h - 2, 1, -1, alpha * 0.85);
    flourish(g, x + w - 2, y + h - 2, -1, -1, alpha * 0.85);
  }
}

/**
 * The frame round the charm grid (the draft's big loom, or the HUD thumbnail): a panel, a
 * hairline divider over the top with the knight's mask emblem on it, and a notch counter —
 * one small pale notch per loom cell, lit for every cell already used.
 */
export function charmFrame(
  g: Phaser.GameObjects.Graphics, lx: number, ly: number, lw: number, used: number, total: number,
  t: number, big: boolean,
): void {
  const pad = big ? 16 : 6;
  const top = big ? 26 : 6;
  const bot = big ? 26 : 12;
  charmPanel(g, lx - pad, ly - top, lw + pad * 2, lw + top + bot, HK.filigree, t, 0.95);
  if (big) {
    // Divider with a little mask emblem riding it.
    const cx = lx + lw / 2, dy = ly - 12;
    g.lineStyle(1, HK.filigree, 0.8);
    g.lineBetween(lx, dy, cx - 12, dy);
    g.lineBetween(cx + 12, dy, lx + lw, dy);
    g.fillStyle(HK.shell, 0.95);
    g.fillEllipse(cx, dy + 1, 13, 11);
    g.fillPoints([P(cx - 5, dy - 3), P(cx - 7.5, dy - 11), P(cx - 2.5, dy - 4)], true);
    g.fillPoints([P(cx + 5, dy - 3), P(cx + 7.5, dy - 11), P(cx + 2.5, dy - 4)], true);
    g.fillStyle(HK.void, 1);
    g.fillEllipse(cx - 2.6, dy + 1.5, 3, 4);
    g.fillEllipse(cx + 2.6, dy + 1.5, 3, 4);
  }
  // Notches along the bottom.
  const nr = big ? 3.4 : 1.4;
  const gap = (lw - nr * 2) / Math.max(1, total - 1);
  const ny = ly + lw + (big ? 13 : 6);
  for (let i = 0; i < total; i++) {
    const nx = lx + nr + i * gap;
    const lit = i < used;
    g.fillStyle(lit ? HK.shell : HK.void, lit ? 0.95 : 0.8);
    g.fillCircle(nx, ny, nr);
    if (!lit) {
      g.lineStyle(0.8, HK.filigreeDim, 0.8);
      g.strokeCircle(nx, ny, nr);
    }
  }
}

// ── Transients ──────────────────────────────────────────────────────────────

export class HollowFx extends FxBase {
  constructor(scene: Phaser.Scene) {
    super(scene, (c) => c);
  }

  /**
   * Pin, as a nail thrust: a straight white stab line driven out from the caster to the pin's
   * reach, a thin crescent where the point ends, and a couple of shell flecks. Same reach and
   * direction as the pin it replaces.
   */
  thrust(x: number, y: number, ang: number, reach: number, scale = 1): void {
    const c = Math.cos(ang), s = Math.sin(ang);
    const nx = -s, ny = c;
    this.anim(11, 170, (g, t) => {
      const k = easeOut(Math.min(1, t * 1.6));
      const fade = 1 - easeIn(t);
      const x0 = x + c * 12, y0 = y + s * 12;
      const tipD = 12 + (reach - 12) * k;
      const x1 = x + c * tipD, y1 = y + s * tipD;
      const w = 5.2 * scale * fade;
      // The stab wedge: wide at the hilt end, needle-thin at the point.
      g.fillStyle(HK.nailDark, 0.5 * fade);
      g.fillPoints([P(x0 + nx * w * 1.3, y0 + ny * w * 1.3), P(x1 + c * 4, y1 + s * 4), P(x0 - nx * w * 1.3, y0 - ny * w * 1.3)], true);
      g.fillStyle(HK.white, 0.95 * fade);
      g.fillPoints([P(x0 + nx * w * 0.6, y0 + ny * w * 0.6), P(x1 + c * 3, y1 + s * 3), P(x0 - nx * w * 0.6, y0 - ny * w * 0.6)], true);
      // Speed lines either side of the thrust.
      g.lineStyle(1.1 * scale, HK.shellShade, 0.6 * fade);
      for (const sd of [-1, 1]) {
        const o = 7 * scale * sd;
        g.lineBetween(x0 + nx * o + c * 6, y0 + ny * o + s * 6, x0 + nx * o + c * tipD * 0.6, y0 + ny * o + s * tipD * 0.6);
      }
      // Crescent where the point stops.
      g.lineStyle(2.2 * scale * fade, HK.white, 0.9 * fade);
      g.beginPath();
      g.arc(x1 - c * 3, y1 - s * 3, 7 * scale * (0.7 + k * 0.5), ang - 1.05, ang + 1.05);
      g.strokePath();
    });
    // Flecks of shell kicked off the point.
    const seed = Math.random() * 999;
    const tipX = x + c * reach, tipY = y + s * reach;
    this.anim(10, 240, (g, t) => {
      for (let i = 0; i < 3; i++) {
        const a = ang + (hash(seed, i) - 0.5) * 1.5;
        const d = easeOut(t) * 13 * (0.5 + hash(seed, i + 9));
        g.fillStyle(i ? HK.shell : HK.soul, (1 - t) * 0.8);
        g.fillCircle(tipX + Math.cos(a) * d, tipY + Math.sin(a) * d, 1.5 * (1 - t * 0.5) * scale);
      }
    });
  }

  /** Bleed Stop, reskinned: void bursting out of the shell — a black ring and grasping tendrils. */
  voidBurst(x: number, y: number, r: number): void {
    this.anim(11, 460, (g, t) => {
      const k = easeOut(t);
      g.fillStyle(HK.void, (1 - t) * 0.55);
      g.fillCircle(x, y, r * 0.5 * (1 - t * 0.4));
      g.lineStyle(8 * (1 - t), HK.void, (1 - t) * 0.75);
      g.strokeCircle(x, y, r * k);
      g.lineStyle(1.6 * (1 - t), HK.shell, (1 - t) * 0.7);
      g.strokeCircle(x, y, r * k * 0.88);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.2;
        const len = r * k * (0.8 + hash(i, 5) * 0.4);
        const bend = Math.sin(t * 9 + i) * 0.35;
        const pts: Phaser.Geom.Point[] = [];
        const steps = 6;
        for (let j = 0; j <= steps; j++) {
          const u = j / steps;
          const aa = a + bend * u;
          const hw = 4.2 * (1 - u) * (1 - t * 0.6);
          pts.push(P(x + Math.cos(aa) * len * u - Math.sin(aa) * hw, y + Math.sin(aa) * len * u + Math.cos(aa) * hw));
        }
        for (let j = steps; j >= 0; j--) {
          const u = j / steps;
          const aa = a + bend * u;
          const hw = 4.2 * (1 - u) * (1 - t * 0.6);
          pts.push(P(x + Math.cos(aa) * len * u + Math.sin(aa) * hw, y + Math.sin(aa) * len * u - Math.cos(aa) * hw));
        }
        g.fillStyle(HK.void, (1 - t) * 0.85);
        g.fillPoints(pts, true);
      }
    });
  }

  /** A puff of shade, for the hands moving fast and for the void form fading out. */
  shade(x: number, y: number, n = 2, spread = 8, ms = 320): void {
    const seed = Math.random() * 999;
    this.anim(10, ms, (g, t) => {
      for (let i = 0; i < n; i++) {
        const a = hash(seed, i) * TAU;
        const d = easeOut(t) * spread * (0.4 + hash(seed, i + 40));
        g.fillStyle(i % 3 === 0 ? HK.cloakLit : HK.void, (1 - t) * 0.6);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d - t * 7, 2.6 * (1 - t * 0.5));
      }
    });
  }
}
