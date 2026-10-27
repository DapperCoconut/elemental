import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * String's look: a big velvet-black spider — eight jointed legs that step as it walks, a swollen
 * abdomen behind it with a cream hourglass, a cluster of red eyes and a pair of fangs. Its strings
 * are heavy cream silk with a brass fish-hook on the end, drawn taut; the Hexing Strand is thick purple cord threaded
 * with glowing beads; its spiders are big, black and velvet, with a cream hourglass on the back;
 * the Linen Tomb is a silk cocoon on four guy-lines.
 *
 * Every painter takes a `ColorFn` so a skin can recolour it, and the previews call the same ones.
 */

export const STRING = {
  ink: 0x1a1410,
  silk: 0xf2ece0,
  silkShade: 0xbdb19c,
  silkDeep: 0x8c7f6a,
  silkGlow: 0xffffff,
  wood: 0xd9b98a,
  woodLit: 0xf0d6ac,
  woodDark: 0x9a7448,
  woodGrain: 0x7a5634,
  cheek: 0xe07a6e,
  brass: 0xd9a441,
  brassLit: 0xffe08a,
  hex: 0x9b3dff,
  hexDeep: 0x4e1590,
  hexGlow: 0xd4a6ff,
  spider: 0x1f1822,
  spiderLit: 0x463a4e,
  spiderMark: 0xeadfc8,
  spiderEye: 0xff3348,
  spiderHair: 0x6a5874,
  snap: 0xfff4c8,
  strain: 0xff6a4a,
  blood: 0xc8243a,
};

export type StringColorFn = ColorFn;

export interface Pt { x: number; y: number }

/** A rope drawn through its nodes: a dark underside, the twine, a twist of highlight. */
export function ropeLine(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, pts: Pt[], width: number, alpha: number, strain = 0,
): void {
  if (pts.length < 2) return;
  const body = strain > 0.05 ? lerpColor(STRING.silk, STRING.strain, Math.min(1, strain) * 0.7) : STRING.silk;
  g.lineStyle(width + 2, tint(STRING.ink), alpha * 0.55);
  g.strokePoints(pts, false);
  g.lineStyle(width, tint(body), alpha);
  g.strokePoints(pts, false);
  // The twist: short dark ticks laid diagonally along the twine.
  g.lineStyle(1, tint(STRING.silkDeep), alpha * 0.7);
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.01) continue;
    const ux = dx / len;
    const uy = dy / len;
    for (let d = carry; d < len; d += 9) {
      const px = a.x + ux * d;
      const py = a.y + uy * d;
      const h = width * 0.5;
      g.lineBetween(px - uy * h - ux * 1.5, py + ux * h - uy * 1.5, px + uy * h + ux * 1.5, py - ux * h + uy * 1.5);
    }
    carry = ((carry - len) % 9 + 9) % 9;
  }
}

/** The Hexing Strand: thick purple cord, a glow round it and beads of light running its length. */
export function hexRope(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, pts: Pt[], t: number, alpha: number, cracked: number,
): void {
  if (pts.length < 2) return;
  g.lineStyle(16, tint(STRING.hex), alpha * (0.14 + 0.06 * Math.sin(t * 5)));
  g.strokePoints(pts, false);
  g.lineStyle(9, tint(STRING.hexDeep), alpha);
  g.strokePoints(pts, false);
  g.lineStyle(5, tint(STRING.hex), alpha);
  g.strokePoints(pts, false);
  g.lineStyle(1.5, tint(STRING.hexGlow), alpha * 0.85);
  g.strokePoints(pts, false);
  // Beads that crawl down the cord toward whatever it is tied to.
  const total = polyLength(pts);
  for (let i = 0; i < 6; i++) {
    const at = ((t * 70 + i * (total / 6)) % total + total) % total;
    const p = pointAlong(pts, at);
    g.fillStyle(tint(STRING.hexGlow), alpha * 0.9);
    g.fillCircle(p.x, p.y, 2.6);
    g.fillStyle(tint(STRING.silkGlow), alpha);
    g.fillCircle(p.x - 0.6, p.y - 0.6, 1);
  }
  // Each shot it has eaten frays it: a tuft of torn fibre at a fixed spot.
  for (let i = 0; i < cracked; i++) {
    const p = pointAlong(pts, total * (0.3 + i * 0.22));
    g.lineStyle(1.4, tint(STRING.hexGlow), alpha);
    for (let k = 0; k < 4; k++) {
      const a = k * 1.6 + i;
      g.lineBetween(p.x, p.y, p.x + Math.cos(a) * 7, p.y + Math.sin(a) * 7);
    }
  }
}

/** The tomb's guy-lines: plain silk, thinner, no hook. */
export function silkLine(g: Phaser.GameObjects.Graphics, tint: ColorFn, pts: Pt[], alpha: number): void {
  if (pts.length < 2) return;
  g.lineStyle(4, tint(STRING.silkGlow), alpha * 0.18);
  g.strokePoints(pts, false);
  g.lineStyle(2, tint(STRING.silk), alpha * 0.9);
  g.strokePoints(pts, false);
}

/** The brass fish-hook on a string's tip, pointing the way it flies. */
export function hookTip(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, ang: number, alpha: number, purple = false): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const P = (px: number, py: number): Pt => ({ x: x + px * c - py * s, y: y + px * s + py * c });
  const metal = purple ? STRING.hexGlow : STRING.brass;
  g.lineStyle(2.6, tint(STRING.ink), alpha * 0.8);
  g.strokePoints([P(-6, 0), P(5, 0), P(8, 3), P(6, 6), P(3, 5)], false);
  g.lineStyle(1.6, tint(metal), alpha);
  g.strokePoints([P(-6, 0), P(5, 0), P(8, 3), P(6, 6), P(3, 5)], false);
  g.fillStyle(tint(STRING.brassLit), alpha);
  g.fillCircle(P(-6, 0).x, P(-6, 0).y, 1.6);
}

/** Where a string bites a wall: a brass tack with the twine wound round it. */
export function wallTack(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, alpha: number, purple = false): void {
  g.fillStyle(tint(STRING.ink), alpha * 0.5);
  g.fillCircle(x + 1, y + 1.5, 5);
  g.fillStyle(tint(purple ? STRING.hexDeep : STRING.brass), alpha);
  g.fillCircle(x, y, 4.2);
  g.fillStyle(tint(purple ? STRING.hexGlow : STRING.brassLit), alpha);
  g.fillCircle(x - 1.2, y - 1.2, 1.5);
  g.lineStyle(1.4, tint(purple ? STRING.hex : STRING.silk), alpha);
  g.strokeCircle(x, y, 6);
}

/**
 * Where a hook has bitten a body: a wad of silk stuck to the skin at the exact spot, with the
 * hook's barb showing and a few strands splayed back along the line.
 */
export function hitKnot(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, toward: number, alpha: number, purple = false): void {
  const col = purple ? STRING.hex : STRING.silk;
  g.lineStyle(1, tint(purple ? STRING.hexGlow : STRING.silkShade), alpha * 0.9);
  for (const o of [-0.5, 0, 0.5]) {
    g.lineBetween(x, y, x + Math.cos(toward + o) * 7, y + Math.sin(toward + o) * 7);
  }
  g.fillStyle(tint(STRING.ink), alpha * 0.5);
  g.fillCircle(x + 0.8, y + 1, 4.2);
  g.fillStyle(tint(col), alpha);
  g.fillCircle(x, y, 3.6);
  g.fillStyle(tint(purple ? STRING.hexGlow : STRING.brass), alpha);
  g.fillCircle(x - Math.cos(toward) * 1.6, y - Math.sin(toward) * 1.6, 1.4);
}

/** The loop a string is knotted round a body with. */
export function bodyKnot(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, toward: number, alpha: number, purple = false): void {
  const col = purple ? STRING.hex : STRING.silk;
  g.lineStyle(2.2, tint(STRING.ink), alpha * 0.4);
  g.strokeEllipse(x, y + 3, r * 2 + 6, r * 1.1 + 5);
  g.lineStyle(1.8, tint(col), alpha);
  g.strokeEllipse(x, y + 2, r * 2 + 4, r * 1.1 + 3);
  const kx = x + Math.cos(toward) * (r + 2);
  const ky = y + 2 + Math.sin(toward) * (r * 0.55 + 1.5);
  g.fillStyle(tint(col), alpha);
  g.fillCircle(kx, ky, 3.2);
  g.fillStyle(tint(purple ? STRING.hexDeep : STRING.silkDeep), alpha);
  g.fillCircle(kx + 0.8, ky + 0.8, 1.3);
}

/**
 * One of the big spiders. `phase` drives the walk: the legs step in two alternating sets of four.
 * `frenzy` (a spider whose string has gone) bristles the legs and reddens the eyes.
 */
export function spiderBody(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, ang: number, phase: number, scale: number,
  alpha: number, frenzy = false,
): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const k = scale;
  const P = (px: number, py: number): Pt => ({ x: x + (px * c - py * s) * k, y: y + (px * s + py * c) * k });
  // Shadow.
  g.fillStyle(tint(STRING.ink), alpha * 0.35);
  g.fillEllipse(x + 2, y + 4, 26 * k, 16 * k);
  // Legs: four a side, two segments each, the knee raised outward.
  const legBase = [-3.5, -1, 1.5, 4];
  const legSpread = [-0.95, -0.35, 0.3, 0.9];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const set = (i + (side > 0 ? 1 : 0)) % 2;
      const step = Math.sin(phase * 2 + set * Math.PI) * (frenzy ? 0.42 : 0.28);
      const a = side * (Math.PI / 2) + legSpread[i] * side * -1 + step * side;
      const hip = P(legBase[i] - 1, side * 3.5);
      const kneeR = frenzy ? 12 : 10.5;
      const knee = P(legBase[i] - 1 + Math.cos(a) * kneeR * 0.75, side * 3.5 + Math.sin(a) * kneeR * 0.75 + side * 2);
      // The shin bends back down from the knee, toward the way the spider walks.
      const dir = Math.atan2(knee.y - hip.y, knee.x - hip.x);
      const foot = { x: knee.x + Math.cos(dir + side * 0.75) * 9 * k, y: knee.y + Math.sin(dir + side * 0.75) * 9 * k };
      g.lineStyle(2.4 * k, tint(STRING.spider), alpha);
      g.lineBetween(hip.x, hip.y, knee.x, knee.y);
      g.lineStyle(1.6 * k, tint(STRING.spider), alpha);
      g.lineBetween(knee.x, knee.y, foot.x, foot.y);
      g.fillStyle(tint(STRING.spiderLit), alpha);
      g.fillCircle(knee.x, knee.y, 1.2 * k);
    }
  }
  // Abdomen, behind, with the hourglass.
  const ab = P(-8, 0);
  g.fillStyle(tint(STRING.spider), alpha);
  g.fillEllipse(ab.x, ab.y, 17 * k, 17 * k);
  g.fillStyle(tint(STRING.spiderLit), alpha * 0.9);
  g.fillEllipse(P(-9.5, -2.5).x, P(-9.5, -2.5).y, 7 * k, 5 * k);
  const h0 = P(-11.5, 0);
  const h1 = P(-4.5, 0);
  g.fillStyle(tint(frenzy ? STRING.blood : STRING.spiderMark), alpha);
  g.fillTriangle(h0.x, h0.y, P(-8, -2.6).x, P(-8, -2.6).y, P(-8, 2.6).x, P(-8, 2.6).y);
  g.fillTriangle(h1.x, h1.y, P(-8, -2.6).x, P(-8, -2.6).y, P(-8, 2.6).x, P(-8, 2.6).y);
  // Head and fangs.
  const hd = P(2.5, 0);
  g.fillStyle(tint(STRING.spider), alpha);
  g.fillCircle(hd.x, hd.y, 6 * k);
  const f0 = P(8, -2);
  const f1 = P(8, 2);
  g.lineStyle(1.6 * k, tint(STRING.spiderMark), alpha);
  g.lineBetween(P(6.5, -1.5).x, P(6.5, -1.5).y, f0.x, f0.y);
  g.lineBetween(P(6.5, 1.5).x, P(6.5, 1.5).y, f1.x, f1.y);
  // Eight eyes in two rows.
  g.fillStyle(tint(STRING.spiderEye), alpha);
  for (const [ex, ey, r] of [[5, -1.8, 1.3], [5, 1.8, 1.3], [5.8, -0.6, 1], [5.8, 0.6, 1], [3.6, -3, 0.8], [3.6, 3, 0.8], [4.2, -2.3, 0.7], [4.2, 2.3, 0.7]]) {
    const e = P(ex, ey);
    g.fillCircle(e.x, e.y, r * k * (frenzy ? 1.25 : 1));
  }
}

/** Marionette's control bar: a wooden cross with a peg at each tip. */
export function controlBar(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, ang: number, scale: number, alpha: number): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const P = (px: number, py: number): Pt => ({ x: x + (px * c - py * s) * scale, y: y + (px * s + py * c) * scale });
  const bar = (x0: number, y0: number, x1: number, y1: number, w: number): void => {
    const a = P(x0, y0);
    const b = P(x1, y1);
    g.lineStyle(w + 2, tint(STRING.woodGrain), alpha);
    g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(w, tint(STRING.wood), alpha);
    g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(1, tint(STRING.woodLit), alpha * 0.9);
    g.lineBetween(a.x, a.y - 0.8, b.x, b.y - 0.8);
  };
  bar(-14, 0, 14, 0, 4 * scale);
  bar(0, -9, 0, 9, 3.4 * scale);
  for (const [px, py] of [[-14, 0], [14, 0], [0, -9], [0, 9]]) {
    const p = P(px, py);
    g.fillStyle(tint(STRING.woodDark), alpha);
    g.fillCircle(p.x, p.y, 2.4 * scale);
    g.fillStyle(tint(STRING.brassLit), alpha);
    g.fillCircle(p.x, p.y, 1 * scale);
  }
}

/** A puppet: the control bar hovering over the victim and four lines down to it. */
export function puppetRig(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, t: number, steering: boolean, alpha: number,
): void {
  const bx = x + Math.sin(t * 2.1) * 3;
  const by = y - r - 34 + Math.sin(t * 3.3) * 2;
  const tilt = Math.sin(t * 1.7) * 0.18;
  const tips = [[-14, 0], [14, 0], [0, -9], [0, 9]].map(([px, py]) => ({
    x: bx + px * Math.cos(tilt) - py * Math.sin(tilt),
    y: by + px * Math.sin(tilt) + py * Math.cos(tilt),
  }));
  const limbs = [
    { x: x - r * 0.95, y: y + 1 }, { x: x + r * 0.95, y: y + 1 },
    { x: x, y: y - r * 0.85 }, { x: x, y: y + r * 0.8 },
  ];
  for (let i = 0; i < 4; i++) {
    g.lineStyle(1.2, tint(steering ? STRING.brassLit : STRING.silk), alpha * (steering ? 1 : 0.8));
    g.lineBetween(tips[i].x, tips[i].y, limbs[i].x, limbs[i].y);
    g.fillStyle(tint(STRING.silk), alpha);
    g.fillCircle(limbs[i].x, limbs[i].y, 1.6);
  }
  controlBar(g, tint, bx, by, tilt, 1, alpha);
}

/**
 * The Linen Tomb: a cocoon of wound silk round the victim. `torn` 0..1 is how much of its HP is
 * gone — the wraps split and the dark inside shows through as it climbs.
 */
export function cocoon(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, torn: number, t: number, alpha: number,
): void {
  const w = r * 2.3;
  const h = r * 2.7;
  g.fillStyle(tint(STRING.ink), alpha * 0.35);
  g.fillEllipse(x + 3, y + h * 0.42, w * 1.05, h * 0.3);
  g.fillStyle(tint(STRING.silkShade), alpha);
  g.fillEllipse(x, y, w, h);
  g.fillStyle(tint(STRING.silk), alpha);
  g.fillEllipse(x - 2, y - 2, w * 0.86, h * 0.88);
  g.fillStyle(tint(STRING.silkGlow), alpha * 0.6);
  g.fillEllipse(x - w * 0.16, y - h * 0.18, w * 0.3, h * 0.36);
  // The windings: diagonal bands across the cocoon, each kept inside the oval.
  g.lineStyle(1.3, tint(STRING.silkDeep), alpha * 0.75);
  for (let i = -5; i <= 5; i++) {
    const yy = y + i * (h / 12) + Math.sin(t * 0.8 + i) * 0.6;
    const half = (w / 2) * Math.sqrt(Math.max(0, 1 - ((yy - y) / (h / 2)) ** 2));
    if (half < 2) continue;
    g.lineBetween(x - half * 0.95, yy + half * 0.18, x + half * 0.95, yy - half * 0.18);
  }
  // Tears: dark slits that open as the tomb loses HP.
  const slits = Math.round(torn * 6);
  for (let i = 0; i < slits; i++) {
    const a = i * 2.3 + 0.7;
    const sx = x + Math.cos(a) * w * 0.26;
    const sy = y + Math.sin(a) * h * 0.28;
    const len = 6 + torn * 8;
    g.fillStyle(tint(STRING.ink), alpha * 0.9);
    g.fillEllipse(sx, sy, 3 + torn * 3, len);
    g.lineStyle(1, tint(STRING.silkGlow), alpha);
    g.lineBetween(sx - 3, sy - len / 2, sx - 6, sy - len / 2 - 3);
    g.lineBetween(sx + 3, sy + len / 2, sx + 6, sy + len / 2 + 3);
  }
}

/** The tomb's health, a strip of silk that unravels. */
export function tombBar(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, k: number, alpha: number): void {
  const w = 62;
  g.fillStyle(tint(STRING.ink), alpha * 0.85);
  g.fillRoundedRect(x - w / 2 - 2, y - 4, w + 4, 8, 3);
  g.fillStyle(tint(STRING.silk), alpha);
  g.fillRoundedRect(x - w / 2, y - 2.5, Math.max(0.5, w * k), 5, 2);
  g.lineStyle(1, tint(STRING.silkDeep), alpha);
  for (let i = 1; i < 5; i++) g.lineBetween(x - w / 2 + (w / 5) * i, y - 2.5, x - w / 2 + (w / 5) * i, y + 2.5);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function lerpColor(a: number, b: number, k: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * k);
  const gg = Math.round(ag + (bg - ag) * k);
  const bl = Math.round(ab + (bb - ab) * k);
  return (r << 16) | (gg << 8) | bl;
}

export function polyLength(pts: Pt[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return Math.max(1e-6, L);
}

/** The point `d` px along a polyline (clamped to its ends). */
export function pointAlong(pts: Pt[], d: number): Pt & { ang: number } {
  let left = Math.max(0, d);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= seg || i === pts.length - 1) {
      const k = seg > 0 ? Math.min(1, left / seg) : 0;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, ang: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    left -= seg;
  }
  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y, ang: 0 };
}

/** A hanging rope between two points, for previews and for a string's first frame. */
export function sagPoints(x0: number, y0: number, x1: number, y1: number, sag: number, n = 12): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    out.push({ x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * sag });
  }
  return out;
}

// ── Fx ───────────────────────────────────────────────────────────────────────

export class StringFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: ColorFn) { super(scene, tint); }

  /** A string leaves the hand: a crack of the wrist and a few loose fibres. */
  throwString(x: number, y: number, ang: number, purple = false): void {
    this.anim(8.5, 220, (g, t) => {
      g.lineStyle(2, this.tint(purple ? STRING.hexGlow : STRING.silk), (1 - t) * 0.9);
      for (let i = 0; i < 5; i++) {
        const a = ang + Math.PI + (i - 2) * 0.45;
        const d0 = 3 + t * 5;
        const d1 = 6 + easeOut(t) * 14;
        g.lineBetween(x + Math.cos(a) * d0, y + Math.sin(a) * d0, x + Math.cos(a) * d1, y + Math.sin(a) * d1);
      }
      g.lineStyle(1.5, this.tint(purple ? STRING.hex : STRING.silkShade), (1 - t) * 0.7);
      g.strokeCircle(x, y, 4 + t * 9);
    });
  }

  /** The hook bites: into a wall, a puff of grit; into a body, a tight ring. */
  bite(x: number, y: number, wall: boolean, purple = false): void {
    this.anim(9, 300, (g, t) => {
      const col = purple ? STRING.hexGlow : wall ? STRING.silkShade : STRING.silk;
      g.lineStyle(2, this.tint(col), (1 - t));
      g.strokeCircle(x, y, 5 + easeOut(t) * (wall ? 10 : 16));
      if (wall) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + 0.4;
          const d = easeOut(t) * 13;
          g.fillStyle(this.tint(STRING.woodDark), 1 - t);
          g.fillRect(x + Math.cos(a) * d - 1, y + Math.sin(a) * d - 1, 2, 2);
        }
      }
    });
  }

  /**
   * A snap: the two halves whip back toward their ends and a hot flash at the break. `bx,by` is
   * where it went.
   */
  snap(x0: number, y0: number, x1: number, y1: number, bx: number, by: number, purple = false): void {
    this.flashIn(bx, by, 10, STRING.snap, purple ? STRING.hex : STRING.silk, 10);
    this.anim(9.5, 360, (g, t) => {
      const k = easeOut(t);
      const col = purple ? STRING.hex : STRING.silk;
      for (const [ex, ey, side] of [[x0, y0, 1], [x1, y1, -1]] as const) {
        // Each half retracts toward its end, kinking as it goes.
        const sx = bx + (ex - bx) * k;
        const sy = by + (ey - by) * k;
        const mx = (sx + ex) / 2 + Math.sin(t * 22) * 9 * side * (1 - t);
        const my = (sy + ey) / 2 + Math.cos(t * 19) * 9 * side * (1 - t);
        g.lineStyle(purple ? 5 : 2.6, this.tint(col), 1 - t * 0.6);
        g.strokePoints([{ x: sx, y: sy }, { x: mx, y: my }, { x: ex, y: ey }], false);
      }
      g.lineStyle(2, this.tint(STRING.snap), (1 - t));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.2;
        const d0 = 4 + k * 8;
        const d1 = 9 + k * 22;
        g.lineBetween(bx + Math.cos(a) * d0, by + Math.sin(a) * d0, bx + Math.cos(a) * d1, by + Math.sin(a) * d1);
      }
    });
  }

  /** The lash reaching whoever broke it. */
  lash(x: number, y: number): void {
    this.anim(10, 260, (g, t) => {
      g.lineStyle(3, this.tint(STRING.snap), 1 - t);
      g.beginPath();
      g.arc(x, y, 12 + t * 10, -0.6 + t, 1.4 + t);
      g.strokePath();
      g.lineStyle(2, this.tint(STRING.strain), (1 - t) * 0.8);
      g.beginPath();
      g.arc(x, y, 16 + t * 12, 2.6 - t, 4.4 - t);
      g.strokePath();
    });
  }

  /** A spider drops onto its string out of nowhere. */
  spiderDrop(x: number, y: number): void {
    this.anim(9, 380, (g, t) => {
      g.lineStyle(1.6, this.tint(STRING.silk), (1 - t) * 0.8);
      g.lineBetween(x, y - 120 * (1 - easeOut(t)), x, y);
      g.lineStyle(2, this.tint(STRING.spiderLit), 1 - t);
      g.strokeCircle(x, y, 18 + t * 30);
    });
  }

  spiderBite(x: number, y: number): void {
    this.anim(10, 240, (g, t) => {
      g.lineStyle(2, this.tint(STRING.spiderMark), 1 - t);
      g.lineBetween(x - 5 - t * 4, y - 6, x - 2, y + 2);
      g.lineBetween(x + 5 + t * 4, y - 6, x + 2, y + 2);
      g.fillStyle(this.tint(STRING.blood), (1 - t) * 0.85);
      g.fillCircle(x, y + 3 + t * 3, 2.4);
    });
  }

  /** The hex strand snapped by its owner: a purple shock along its whole length. */
  hexSnap(pts: Pt[], band: number): void {
    const copy = pts.map((p) => ({ x: p.x, y: p.y }));
    this.anim(10, 520, (g, t) => {
      const k = easeOut(t);
      g.lineStyle(band * 2 * (1 - t * 0.5), this.tint(STRING.hex), (1 - t) * 0.35);
      g.strokePoints(copy, false);
      g.lineStyle(6 * (1 - t), this.tint(STRING.hexGlow), 1 - t);
      g.strokePoints(copy, false);
      for (let i = 0; i < copy.length; i += 2) {
        const p = copy[i];
        g.fillStyle(this.tint(STRING.hexGlow), (1 - t) * 0.9);
        g.fillCircle(p.x + Math.sin(i * 7.1) * k * 10, p.y + Math.cos(i * 5.3) * k * 10, 2.6 * (1 - t) + 0.5);
      }
    });
  }

  /** A snared victim: purple bands tightening round them. */
  snared(x: number, y: number, r: number): void {
    this.anim(10, 460, (g, t) => {
      g.lineStyle(3, this.tint(STRING.hex), 1 - t);
      g.strokeEllipse(x, y, (r * 2 + 30) * (1 - easeOut(t) * 0.5), (r + 22) * (1 - easeOut(t) * 0.5));
      g.lineStyle(1.5, this.tint(STRING.hexGlow), 1 - t);
      g.strokeEllipse(x, y - 6, (r * 2 + 18) * (1 - easeOut(t) * 0.45), (r + 14) * (1 - easeOut(t) * 0.45));
    });
  }

  /** The control bar lands: a clack of wood and its four strings lashing down. */
  barHit(x: number, y: number, r: number): void {
    this.anim(10, 420, (g, t) => {
      const by = y - r - 34 * easeOut(Math.min(1, t * 2));
      g.lineStyle(1.4, this.tint(STRING.silk), 1 - t);
      for (const ox of [-14, -5, 5, 14]) g.lineBetween(x + ox, by, x + ox * 0.6, y);
      g.lineStyle(2, this.tint(STRING.woodLit), 1 - t);
      g.strokeCircle(x, y, r + 4 + t * 14);
    });
  }

  /** Silk winding round a body as the tomb closes. */
  tombWrap(x: number, y: number, r: number): void {
    this.anim(10, 600, (g, t) => {
      const k = easeIn(t);
      g.lineStyle(2, this.tint(STRING.silk), 1 - t * 0.4);
      for (let i = 0; i < 7; i++) {
        const rr = (r * 3.2) * (1 - k) + r * 1.2;
        const a0 = i * 0.9 + t * 9;
        g.beginPath();
        g.arc(x, y + (i - 3) * 4, rr, a0, a0 + 1.6);
        g.strokePath();
      }
    });
  }

  /** The tomb bursts: shreds of silk thrown outward. */
  tombBreak(x: number, y: number): void {
    this.flashIn(x, y, 24, STRING.silkGlow, STRING.silk, 10);
    this.anim(10, 640, (g, t) => {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU + 0.3;
        const d = 10 + easeOut(t) * 70;
        const px = x + Math.cos(a) * d;
        const py = y + Math.sin(a) * d + t * t * 20;
        g.fillStyle(this.tint(i % 3 ? STRING.silk : STRING.silkShade), 1 - t);
        g.fillTriangle(px, py, px + Math.cos(a + 1.2) * 7, py + Math.sin(a + 1.2) * 7, px + Math.cos(a - 0.7) * 5, py + Math.sin(a - 0.7) * 5);
      }
    });
  }

  /** A tear: the victim strained against the silk and paid for it. */
  tear(x: number, y: number): void {
    this.anim(10, 280, (g, t) => {
      g.lineStyle(1.6, this.tint(STRING.blood), 1 - t);
      for (let i = 0; i < 4; i++) {
        const a = i * 1.7 + 0.4;
        g.lineBetween(x + Math.cos(a) * 6, y + Math.sin(a) * 6, x + Math.cos(a) * (10 + t * 10), y + Math.sin(a) * (10 + t * 10));
      }
    });
  }

  /** A hit on the tomb: silk fibres puffing off it. */
  tombHit(x: number, y: number): void {
    this.anim(10, 300, (g, t) => {
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05 + 0.2;
        const d = 6 + easeOut(t) * 18;
        g.fillStyle(this.tint(STRING.silk), 1 - t);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.8);
      }
    });
  }
}

// ── Avatar ───────────────────────────────────────────────────────────────────

const STRING_AVATAR: AvatarSpec = {
  // The pedipalps: two small velvet feelers in front of the fangs.
  hands: [
    { r: 8, color: STRING.ink, alpha: 0.3 },
    { r: 6, color: STRING.spider, alpha: 1 },
    { r: 4.8, color: STRING.spiderLit, alpha: 1 },
    { r: 1.6, color: STRING.spiderHair, alpha: 0.9, ox: -1.4, oy: -1.4 },
  ],
  eyeWhite: STRING.spiderEye,
  eyePupil: STRING.ink,
  squash: { div: 18, x: 0.25, y: 0.16 },
};

/** Where each leg leaves the body, measured back from the facing (radians), front pair first. */
const LEG_ROOTS = [0.62, 1.12, 1.78, 2.4];
const LEG_REACH = [1.12, 1, 0.98, 1.08];

/**
 * The String rig: a big spider. The fighter sprite is its velvet head-and-thorax; under it, eight
 * jointed legs splay out and step in two alternating sets while it moves, and a swollen abdomen
 * trails behind it opposite the aim, marked with a cream hourglass and trailing a thread of silk.
 * Over it sit six more small eyes round the main pair and two fangs that flare on every throw.
 */
export class StringAvatar extends BaseAvatar {
  /** 0..1 — a throw: the fangs flare and the front legs reach along `lungeAng`. */
  private lunge = 0;
  private lungeAng = 0;
  /** 0..1 — Linen Tomb: silk spun in a ring round it. */
  private weave = 0;
  private lastX = Number.NaN;
  private lastY = Number.NaN;
  private stride = 0;
  private moving = 0;

  constructor(scene: Phaser.Scene, tint: ColorFn, depth = 6) {
    super(scene, tint, depth, STRING_AVATAR);
  }

  /** A throw along `ang`: fangs out, front legs forward. */
  jerk(ang: number): void {
    this.lunge = 1;
    this.lungeAng = ang;
  }

  setWeave(k: number): void { this.weave = Phaser.Math.Clamp(k, 0, 1); }

  update(delta: number, x: number, y: number, alpha: number): void {
    if (!Number.isNaN(this.lastX)) {
      const d = Math.hypot(x - this.lastX, y - this.lastY);
      this.stride += d * 0.11;
      this.moving += ((d > 0.3 ? 1 : 0) - this.moving) * Math.min(1, delta / 120);
    }
    this.lastX = x;
    this.lastY = y;
    this.lunge = Math.max(0, this.lunge - delta / 260);
    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    // No mastery yet. The tell is ready: the feelers go brass.
    this.forEachHandLayer(2, (arc) => arc.setFillStyle(this.tint(on ? STRING.brass : STRING.spiderLit), 1));
  }

  /** The fangs, under the eyes and over the head. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const flare = this.lunge;
    for (const side of [-1, 1]) {
      const bx = x + side * 4;
      const by = y + 7;
      const tipX = bx + side * (2 + flare * 4);
      const tipY = by + 9 + flare * 2;
      g.fillStyle(this.tint(STRING.spider), alpha);
      g.fillEllipse(bx, by + 1, 6, 7);
      g.lineStyle(2.2, this.tint(STRING.spiderMark), alpha);
      g.beginPath();
      g.moveTo(bx, by + 3);
      g.lineTo((bx + tipX) / 2 + side * 1.5, (by + tipY) / 2 + 1);
      g.lineTo(tipX - side * 1.5, tipY);
      g.strokePath();
    }
    // A sheen of fine hair across the head.
    g.lineStyle(1, this.tint(STRING.spiderHair), alpha * 0.55);
    for (let i = -2; i <= 2; i++) g.lineBetween(x + i * 4, y - 15, x + i * 4.6, y - 19);
  }

  /** The legs and the abdomen, under the sprite. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const face = this.facing;
    const back = face + Math.PI;
    g.fillStyle(this.tint(STRING.ink), a * 0.45);
    g.fillEllipse(x - Math.cos(face) * 8, y + 18, 70, 18);
    if (this.weave > 0) {
      g.lineStyle(2, this.tint(STRING.silk), a * this.weave);
      g.strokeCircle(x, y, 44 + Math.sin(this.t * 6) * 3);
      g.lineStyle(1, this.tint(STRING.silkShade), a * this.weave * 0.8);
      g.strokeCircle(x, y, 50 + Math.cos(this.t * 5) * 3);
    }
    // Abdomen: trails behind the aim, a little low so it reads as hanging off the back.
    const ax = x + Math.cos(back) * 22;
    const ay = y + Math.sin(back) * 16 + 4;
    const c = Math.cos(back);
    const sn = Math.sin(back);
    const P = (px: number, py: number): Pt => ({ x: ax + px * c - py * sn, y: ay + px * sn + py * c });
    // The silk thread it pays out behind it.
    const tail = P(15, 0);
    g.lineStyle(1, this.tint(STRING.silk), alpha * 0.55);
    g.lineBetween(tail.x, tail.y, tail.x + Math.cos(back) * 16, tail.y + Math.sin(back) * 16 + 6);
    g.fillStyle(this.tint(STRING.spider), alpha);
    g.fillEllipse(ax, ay, 34, 30);
    g.fillStyle(this.tint(STRING.spiderLit), alpha * 0.85);
    g.fillEllipse(ax - 5, ay - 6, 13, 9);
    g.fillStyle(this.tint(STRING.spiderMark), alpha);
    const h0 = P(-7, 0), h1 = P(7, 0), hm0 = P(0, -4.5), hm1 = P(0, 4.5);
    g.fillTriangle(h0.x, h0.y, hm0.x, hm0.y, hm1.x, hm1.y);
    g.fillTriangle(h1.x, h1.y, hm0.x, hm0.y, hm1.x, hm1.y);
    // The legs: four a side, a raised knee and a shin down to the floor.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const set = (i + (side > 0 ? 1 : 0)) % 2;
        const step = Math.sin(this.stride + set * Math.PI) * 0.2 * this.moving
          + Math.sin(this.t * 2.3 + i * 1.3 + side) * 0.035;
        let ang = face + side * (LEG_ROOTS[i] + step);
        if (i === 0 && this.lunge > 0) ang += (this.lungeAng + side * 0.35 - ang) * this.lunge * 0.6;
        const reach = 44 * LEG_REACH[i] * (i === 0 ? 1 + this.lunge * 0.2 : 1);
        const hip = { x: x + Math.cos(ang) * 13, y: y + Math.sin(ang) * 11 + 2 };
        const knee = { x: x + Math.cos(ang) * reach * 0.6, y: y + Math.sin(ang) * reach * 0.48 - 9 };
        const lift = set === 0 ? Math.max(0, Math.sin(this.stride)) : Math.max(0, -Math.sin(this.stride));
        const foot = {
          x: x + Math.cos(ang + side * 0.12) * reach,
          y: y + Math.sin(ang + side * 0.12) * reach * 0.78 + 6 - lift * 4 * this.moving,
        };
        g.lineStyle(4.4, this.tint(STRING.ink), alpha * 0.5);
        g.lineBetween(hip.x, hip.y + 1, knee.x, knee.y + 1);
        g.lineStyle(3.6, this.tint(STRING.spider), alpha);
        g.lineBetween(hip.x, hip.y, knee.x, knee.y);
        g.lineStyle(2.4, this.tint(STRING.spider), alpha);
        g.lineBetween(knee.x, knee.y, foot.x, foot.y);
        g.lineStyle(1, this.tint(STRING.spiderHair), alpha * 0.7);
        g.lineBetween(hip.x, hip.y - 1.2, knee.x, knee.y - 1.2);
        g.fillStyle(this.tint(STRING.spiderLit), alpha);
        g.fillCircle(knee.x, knee.y, 2.2);
        g.fillStyle(this.tint(STRING.spiderMark), alpha * 0.8);
        g.fillCircle(foot.x, foot.y, 1.1);
      }
    }
  }

  /** Six small eyes round the main pair. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const look = this.facing;
    const lx = Math.cos(look) * 2.2;
    const ly = Math.sin(look) * 1.8;
    const eyes: [number, number, number][] = [[-3.4, -11, 2.1], [3.4, -11, 2.1], [-12.5, -8, 1.6], [12.5, -8, 1.6], [-13, -1.5, 1.4], [13, -1.5, 1.4]];
    for (const [ex, ey, r] of eyes) {
      const px = x + ex + lx;
      const py = y + ey + ly;
      g.fillStyle(this.tint(STRING.ink), alpha);
      g.fillCircle(px, py, r + 0.8);
      g.fillStyle(this.tint(STRING.spiderEye), alpha);
      g.fillCircle(px, py, r);
      g.fillStyle(this.tint(STRING.silkGlow), alpha * 0.85);
      g.fillCircle(px - r * 0.35, py - r * 0.35, r * 0.35);
    }
    if (this.mastered) {
      g.lineStyle(1.2, this.tint(STRING.brass), alpha * 0.8);
      g.strokeCircle(x, y - 6, 22);
    }
  }
}
