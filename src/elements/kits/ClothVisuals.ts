import Phaser from 'phaser';
import { ArmGesture, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Cloth draws.
 *
 * Two materials and one silhouette rule. The materials are **wool** — soft, banded, always in
 * motion, and always the warmest thing on screen — and **steel**, which is every pin, nail and
 * needle: hard, thin, and drawn with a single bright highlight down one edge so it reads as metal
 * at four pixels wide. Nothing in this file is a plain circle; the scarf is a ribbon with a
 * knitted edge, a pin is a shaft with a head and a point, and a web is a woven quad rather than a
 * blob.
 *
 * The silhouette rule is that **the scarf is the character**. The tailor is a round ball of wool
 * wearing clothes — the same big-and-round read every other element gets — and the scarf is the
 * thread that ball is wound from, paid out behind them. So the two never fight for attention:
 * the body is where the wool *is*, the tail is where the wool has *gone*. Everything the element
 * does to its own health shows up on both — the ball unwinds as the tail shortens.
 */

export type ClothColorFn = ColorFn;

export const CLT = {
  /** Under everything. */
  ink: 0x1a0d12,
  deep: 0x30161f,
  /** The wool. The element's whole identity. */
  cloth: 0xd1435c,
  clothLit: 0xf5788c,
  clothDeep: 0x8a2135,
  /** The orb body's outer rim and mid tier — the same rose hue, darker and between. */
  clothRim: 0x52101f,
  clothMid: 0xae2f48,
  clothPale: 0xf7c3cc,
  /** Steel. Every pin, nail, needle and anchor. */
  steel: 0xd8dfe8,
  steelLit: 0xffffff,
  steelDark: 0x6d7684,
  /** Brass: pin heads, the anchor plate, the loom frame. */
  brass: 0xe0a33c,
  brassLit: 0xffd98a,
  brassDark: 0x7a5312,
  /** Pinned HP — the bruised purple of wool full of needles. */
  pinned: 0x9b5de5,
  pinnedLit: 0xd0a8ff,
  pinnedDark: 0x4b2472,
  /** Thorns, and anything the pinned pool throws back. */
  thorn: 0xff7a4d,
  /** The safety line and its anchor. */
  line: 0x6fd6f0,
  lineLit: 0xc7f2ff,
  lineDark: 0x1f6b85,
  /** Cloth web — the E+ cage. Dirty undyed wool. */
  web: 0xe8ddc4,
  webDark: 0x9a8d6f,
  /** Burn It Down, and the scorched end of a scarf. */
  ember: 0xff9130,
  emberLit: 0xffd98a,
  emberDark: 0x8c3a06,
  /** The loom's own furniture. */
  loom: 0x3d2630,
  loomLit: 0x6b4453,
  /** The mastery outfits, in the order the wardrobe cycles. */
  suit: 0x2b2b33,
  coat: 0x6b4a2f,
  silk: 0xcfe4f5,
  hoodie: 0x4d7a5c,
};

/** A cheap deterministic hash — the same seed always gives the same wobble. */
export function jitter(seed: number, n: number): number {
  const v = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** The four mastery outfits, in wardrobe order. Black Suit is what you start in. */
export type Outfit = 'suit' | 'coat' | 'silk' | 'hoodie';
export const OUTFITS: Outfit[] = ['suit', 'coat', 'silk', 'hoodie'];
export const OUTFIT_COLOR: Record<Outfit, number> = {
  suit: CLT.suit, coat: CLT.coat, silk: CLT.silk, hoodie: CLT.hoodie,
};
export const OUTFIT_NAME: Record<Outfit, string> = {
  suit: 'Black Suit', coat: 'Heavy Coat', silk: 'Thin Silks', hoodie: 'Casual Hoodie',
};
export const OUTFIT_EMOJI: Record<Outfit, string> = {
  suit: '🤵', coat: '🧥', silk: '👘', hoodie: '🧢',
};

// ── Primitives ───────────────────────────────────────────────────────────────

/**
 * A pin: shaft, point, and a rounded head. `len` is the whole thing tip to head, `ang` points
 * from head toward tip, so a pin drawn at the caster's aim points the way it is travelling.
 */
export function pinGlyph(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, ang: number, len: number, alpha: number,
  opts: { head?: number; hot?: boolean } = {},
): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const tipX = x + c * len * 0.5;
  const tipY = y + s * len * 0.5;
  const headX = x - c * len * 0.5;
  const headY = y - s * len * 0.5;
  const w = Math.max(0.9, len * 0.055);

  // The shaft, doubled: a dark body with a bright edge offset perpendicular. That offset is the
  // only thing that makes a 3px line read as round metal rather than as a scratch.
  const px = -s * w * 0.45;
  const py = c * w * 0.45;
  g.lineStyle(w * 1.9, tint(CLT.steelDark), alpha * 0.9);
  g.lineBetween(headX, headY, tipX, tipY);
  g.lineStyle(w * 0.8, tint(opts.hot ? CLT.emberLit : CLT.steelLit), alpha);
  g.lineBetween(headX - px, headY - py, tipX - px, tipY - py);

  // The point: a little triangle so the tip is sharp rather than cut off square.
  g.fillStyle(tint(opts.hot ? CLT.ember : CLT.steelLit), alpha);
  g.fillPoints([
    new Phaser.Geom.Point(tipX + c * w * 2.2, tipY + s * w * 2.2),
    new Phaser.Geom.Point(tipX - s * w, tipY + c * w),
    new Phaser.Geom.Point(tipX + s * w, tipY - c * w),
  ], true);

  // The head.
  const hr = opts.head ?? Math.max(1.4, len * 0.11);
  g.fillStyle(tint(CLT.brassDark), alpha);
  g.fillCircle(headX, headY, hr);
  g.fillStyle(tint(CLT.brass), alpha);
  g.fillCircle(headX - c * hr * 0.2, headY - s * hr * 0.2, hr * 0.72);
  g.fillStyle(tint(CLT.brassLit), alpha * 0.9);
  g.fillCircle(headX - hr * 0.3, headY - hr * 0.35, hr * 0.3);
}

/** A nail: shorter, blunter, flat-headed. What Nail Storm throws by the dozen. */
export function nailGlyph(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, ang: number, len: number, alpha: number,
): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  g.lineStyle(2.4, tint(CLT.steelDark), alpha * 0.85);
  g.lineBetween(x - c * len * 0.5, y - s * len * 0.5, x + c * len * 0.5, y + s * len * 0.5);
  g.lineStyle(1, tint(CLT.steelLit), alpha);
  g.lineBetween(x - c * len * 0.4 + s, y - s * len * 0.4 - c, x + c * len * 0.45 + s, y + s * len * 0.45 - c);
  // Flat head, drawn across the shaft.
  g.lineStyle(2.6, tint(CLT.steel), alpha);
  g.lineBetween(
    x - c * len * 0.5 - s * 2.6, y - s * len * 0.5 + c * 2.6,
    x - c * len * 0.5 + s * 2.6, y - s * len * 0.5 - c * 2.6,
  );
}

/**
 * The scarf itself: a tapered ribbon threaded through `pts`, with a knitted edge and a fringe on
 * the last segment. This is the single most important drawing in the element — it is the hitbox,
 * so it must be honest about where it actually is.
 */
export function scarfRibbon(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  pts: Array<{ x: number; y: number }>, width: number, alpha: number,
  opts: { t?: number; burn?: number; pinned?: number; ghost?: boolean } = {},
): void {
  if (pts.length < 2) return;
  const t = opts.t ?? 0;
  const burn = opts.burn ?? 0;
  const pinned = opts.pinned ?? 0;
  const n = pts.length;

  // Body: quads between consecutive points, tapering to nothing at the tail.
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const k0 = 1 - i / (n - 1);
    const k1 = 1 - (i + 1) / (n - 1);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    // A slow wave along the length, so a stationary scarf still breathes.
    const wob = Math.sin(t * 3 + i * 0.55) * (1 - k0) * 1.9;
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    const w0 = width * (0.35 + k0 * 0.65) * 0.5;
    const w1 = width * (0.35 + k1 * 0.65) * 0.5;

    // How burnt this segment is: the fire eats from the tail forward.
    const tailK = i / (n - 1);
    const scorch = burn > 0 && tailK > 1 - burn ? Math.min(1, (tailK - (1 - burn)) / Math.max(0.05, burn)) : 0;
    const body = scorch > 0.55 ? CLT.emberDark : scorch > 0 ? CLT.ember : pinned > 0.5 ? CLT.pinnedDark : CLT.clothDeep;
    const face = scorch > 0.55 ? CLT.ember : scorch > 0 ? CLT.emberLit : pinned > 0.5 ? CLT.pinned : CLT.cloth;

    const ax = a.x + nx * wob;
    const ay = a.y + ny * wob;
    const bx = b.x + nx * wob;
    const by = b.y + ny * wob;

    g.fillStyle(tint(body), alpha * (opts.ghost ? 0.35 : 0.95));
    g.fillPoints([
      new Phaser.Geom.Point(ax + nx * w0, ay + ny * w0),
      new Phaser.Geom.Point(bx + nx * w1, by + ny * w1),
      new Phaser.Geom.Point(bx - nx * w1, by - ny * w1),
      new Phaser.Geom.Point(ax - nx * w0, ay - ny * w0),
    ], true);

    // The lit face, offset up-left, is what makes the ribbon look like it has a top side.
    g.fillStyle(tint(face), alpha * (opts.ghost ? 0.28 : 0.9));
    g.fillPoints([
      new Phaser.Geom.Point(ax + nx * w0 * 0.55, ay + ny * w0 * 0.55),
      new Phaser.Geom.Point(bx + nx * w1 * 0.55, by + ny * w1 * 0.55),
      new Phaser.Geom.Point(bx - nx * w1 * 0.1, by - ny * w1 * 0.1),
      new Phaser.Geom.Point(ax - nx * w0 * 0.1, ay - ny * w0 * 0.1),
    ], true);

    // Knit: a rung across the ribbon every other segment. Cheap, and it is the whole reason the
    // scarf reads as wool instead of as a painted stripe.
    if (i % 2 === 0 && w0 > 1.2) {
      g.lineStyle(0.9, tint(scorch > 0 ? CLT.emberDark : CLT.clothPale), alpha * 0.4);
      g.lineBetween(ax + nx * w0 * 0.8, ay + ny * w0 * 0.8, ax - nx * w0 * 0.8, ay - ny * w0 * 0.8);
    }
  }

  // Fringe: three threads off the very end.
  const last = pts[n - 1];
  const prev = pts[Math.max(0, n - 2)];
  const ang = Math.atan2(last.y - prev.y, last.x - prev.x);
  const fw = width * 0.32;
  for (let f = -1; f <= 1; f++) {
    const fa = ang + f * 0.34 + Math.sin(t * 5 + f) * 0.12;
    g.lineStyle(1.1, tint(burn > 0.05 ? CLT.emberDark : CLT.clothDeep), alpha * 0.85);
    g.lineBetween(last.x, last.y, last.x + Math.cos(fa) * fw * 2.4, last.y + Math.sin(fa) * fw * 2.4);
  }

  // Embers riding the burning end.
  if (burn > 0.02) {
    for (let i = 0; i < 5; i++) {
      const k = (t * 1.3 + i / 5) % 1;
      const at = pts[Math.min(n - 1, Math.floor((1 - burn * k) * (n - 1)))];
      g.fillStyle(tint(i % 2 ? CLT.ember : CLT.emberLit), alpha * (1 - k) * 0.85);
      g.fillCircle(at.x + (jitter(i, 3) - 0.5) * 7, at.y - k * 12 + (jitter(i, 9) - 0.5) * 5, 1.4 + (1 - k) * 1.6);
    }
  }
}

/**
 * A cloth web: a woven cage of crossing threads inside a ragged bag, drawn dimmer as it is
 * chewed through. `k` is the web's remaining health, 0–1.
 */
export function webGlyph(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, r: number, k: number, alpha: number, t: number,
): void {
  const a = alpha * (0.35 + k * 0.65);
  // The bag: a lumpy blob so it reads as fabric bunched rather than as a bubble.
  g.fillStyle(tint(CLT.webDark), a * 0.5);
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * TAU;
    const rr = r * (0.86 + jitter(i, 2) * 0.24 + Math.sin(t * 2 + i) * 0.04);
    pts.push(new Phaser.Geom.Point(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr * 0.92));
  }
  g.fillPoints(pts, true);

  // The weave: warp and weft, sagging where the web has been damaged.
  const sag = (1 - k) * r * 0.18;
  for (let i = -2; i <= 2; i++) {
    const off = (i / 2.4) * r;
    g.lineStyle(1.5, tint(CLT.web), a * 0.85);
    g.beginPath();
    g.moveTo(x + off, y - r * 0.9);
    g.lineTo(x + off * 0.6, y + sag);
    g.lineTo(x + off, y + r * 0.9);
    g.strokePath();
    g.beginPath();
    g.moveTo(x - r * 0.95, y + off * 0.9);
    g.lineTo(x, y + off * 0.9 + sag * 0.5);
    g.lineTo(x + r * 0.95, y + off * 0.9);
    g.strokePath();
  }

  // Knots at the intersections that survive.
  const knots = Math.max(0, Math.round(k * 6));
  for (let i = 0; i < knots; i++) {
    const ang = (i / 6) * TAU + t * 0.4;
    g.fillStyle(tint(CLT.web), a);
    g.fillCircle(x + Math.cos(ang) * r * 0.5, y + Math.sin(ang) * r * 0.44, 2.1);
  }

  // Torn threads flapping off a damaged web.
  if (k < 0.9) {
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * TAU + t;
      g.lineStyle(1, tint(CLT.webDark), a * (1 - k));
      g.lineBetween(
        x + Math.cos(ang) * r * 0.85, y + Math.sin(ang) * r * 0.8,
        x + Math.cos(ang + 0.4) * r * 1.25, y + Math.sin(ang + 0.4) * r * 1.15,
      );
    }
  }
}

/** The safety anchor: a brass plate with a spike through it and the line's eyelet on top. */
export function anchorGlyph(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, alpha: number, t: number, armed: number,
): void {
  // A pulsing ring on the floor, tighter the closer the line is to snapping.
  g.lineStyle(2, tint(CLT.line), alpha * (0.3 + armed * 0.5));
  g.strokeEllipse(x, y + 5, 30 - armed * 8 + Math.sin(t * 3) * 2, 12 - armed * 3);

  g.fillStyle(tint(CLT.brassDark), alpha);
  g.fillEllipse(x, y + 4, 17, 7);
  g.fillStyle(tint(CLT.brass), alpha);
  g.fillEllipse(x, y + 2.6, 13, 5);
  // Spike.
  g.lineStyle(3.2, tint(CLT.steelDark), alpha);
  g.lineBetween(x, y - 9, x, y + 4);
  g.lineStyle(1.4, tint(CLT.steelLit), alpha);
  g.lineBetween(x - 0.8, y - 8, x - 0.8, y + 2);
  // Eyelet with the line running through it.
  g.lineStyle(2, tint(CLT.lineLit), alpha);
  g.strokeCircle(x, y - 11, 3.4);
}

/** The long pin, stuck in whatever it found: shaft, quill fletch, and a bright head. */
export function longpinGlyph(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, ang: number, alpha: number, t: number,
): void {
  pinGlyph(g, tint, x, y, ang, 34, alpha, { head: 4.2 });
  // Two quills off the head, so a planted pin is legible from across the arena.
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const hx = x - c * 17;
  const hy = y - s * 17;
  for (const sd of [-1, 1]) {
    const fa = ang + Math.PI + sd * 0.5;
    g.fillStyle(tint(CLT.cloth), alpha * 0.9);
    g.fillPoints([
      new Phaser.Geom.Point(hx, hy),
      new Phaser.Geom.Point(hx + Math.cos(fa) * 11, hy + Math.sin(fa) * 11),
      new Phaser.Geom.Point(hx + Math.cos(fa + sd * 0.28) * 7, hy + Math.sin(fa + sd * 0.28) * 7),
    ], true);
  }
  // A slow glint travelling the shaft — the tell that it is still recallable.
  const k = (t * 0.9) % 1;
  g.fillStyle(tint(CLT.steelLit), alpha * (1 - k) * 0.8);
  g.fillCircle(x - c * 17 + c * 34 * k, y - s * 17 + s * 34 * k, 2.2);
}

/** One square of the loom, with its thread pattern. Used by the HUD and by the draft cards. */
export function loomCell(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, size: number, color: number | null, alpha: number,
): void {
  if (color === null) {
    g.fillStyle(tint(CLT.loom), alpha * 0.55);
    g.fillRect(x, y, size, size);
    g.lineStyle(1, tint(CLT.loomLit), alpha * 0.5);
    g.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
    return;
  }
  g.fillStyle(tint(color), alpha * 0.92);
  g.fillRect(x, y, size, size);
  // Weave: two light warps and one dark weft, so a sewn square looks like fabric.
  g.lineStyle(1, tint(CLT.clothPale), alpha * 0.25);
  g.lineBetween(x + size * 0.3, y + 1, x + size * 0.3, y + size - 1);
  g.lineBetween(x + size * 0.68, y + 1, x + size * 0.68, y + size - 1);
  g.lineStyle(1, tint(CLT.ink), alpha * 0.3);
  g.lineBetween(x + 1, y + size * 0.55, x + size - 1, y + size * 0.55);
  g.lineStyle(1, tint(CLT.ink), alpha * 0.55);
  g.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
}

// ── Fx ───────────────────────────────────────────────────────────────────────

/** Every transient Cloth throws. Persistent art lives in the kit's own layers. */
export class ClothFx extends FxBase {
  /** A pin landing: a short steel star and a puff of lint. */
  stab(x: number, y: number, ang: number, scale = 1): void {
    this.anim(11, 180, (g, t) => {
      const k = easeOut(t);
      g.lineStyle(2.4 * (1 - t) * scale, this.tint(CLT.steelLit), 1 - t);
      for (let i = 0; i < 4; i++) {
        const a = ang + (i - 1.5) * 0.5;
        g.lineBetween(x, y, x + Math.cos(a) * (6 + k * 13) * scale, y + Math.sin(a) * (6 + k * 13) * scale);
      }
      g.fillStyle(this.tint(CLT.clothPale), (1 - t) * 0.6);
      for (let i = 0; i < 4; i++) {
        const a = ang + Math.PI + (jitter(i, 1) - 0.5) * 1.6;
        g.fillCircle(x + Math.cos(a) * k * 14, y + Math.sin(a) * k * 14, 1.6 * (1 - t) * scale);
      }
    });
  }

  /** The long pin biting home: a hard flash and a ring of driven-in fabric. */
  plant(x: number, y: number): void {
    this.flashIn(x, y, 16, CLT.steelLit, CLT.brass, 11);
    this.anim(11, 320, (g, t) => {
      const k = easeOut(t);
      g.lineStyle(3 * (1 - t), this.tint(CLT.brass), (1 - t) * 0.85);
      g.strokeCircle(x, y, 8 + k * 22);
    });
  }

  /** The thread hauling the caster in: a taut line that whips as it goes slack. */
  reel(x0: number, y0: number, x1: number, y1: number, color = CLT.cloth): void {
    this.anim(10, 260, (g, t) => {
      const k = easeIn(t);
      const mx = (x0 + x1) / 2;
      const my = (y0 + y1) / 2;
      const ang = Math.atan2(y1 - y0, x1 - x0);
      const sag = (1 - k) * 22;
      g.lineStyle(3 - t * 2, this.tint(color), 1 - t * 0.6);
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(mx - Math.sin(ang) * sag, my + Math.cos(ang) * sag);
      g.lineTo(x1, y1);
      g.strokePath();
      g.lineStyle(1.2, this.tint(CLT.clothPale), (1 - t) * 0.7);
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(mx - Math.sin(ang) * sag * 0.8, my + Math.cos(ang) * sag * 0.8);
      g.lineTo(x1, y1);
      g.strokePath();
    });
  }

  /** The safety line firing: a cyan snap along the whole run, plus a landing ring. */
  snap(x0: number, y0: number, x1: number, y1: number): void {
    this.reel(x0, y0, x1, y1, CLT.line);
    this.anim(11, 340, (g, t) => {
      const k = easeOut(t);
      g.lineStyle(3 * (1 - t), this.tint(CLT.lineLit), (1 - t) * 0.9);
      g.strokeCircle(x1, y1, 6 + k * 34);
      g.lineStyle(1.6 * (1 - t), this.tint(CLT.line), (1 - t) * 0.6);
      g.strokeCircle(x1, y1, 2 + k * 52);
    });
  }

  /** Pinned HP taking a hit: purple lint and a spray of needles back the way it came. */
  thorns(x: number, y: number, ang: number, n = 5): void {
    this.anim(11, 300, (g, t) => {
      const k = easeOut(t);
      for (let i = 0; i < n; i++) {
        const a = ang + (i / n - 0.5) * 1.3;
        const d = 8 + k * 30;
        pinGlyph(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d, a, 12 * (1 - t * 0.4), 1 - t);
      }
      g.fillStyle(this.tint(CLT.pinnedLit), (1 - t) * 0.5);
      g.fillCircle(x, y, 5 + k * 12);
    });
  }

  /** Wool coming apart — the generic Cloth hurt puff. */
  lint(x: number, y: number, n = 6, spread = 16, ms = 420, color = CLT.cloth): void {
    const seed = Math.random() * 999;
    this.anim(10, ms, (g, t) => {
      for (let i = 0; i < n; i++) {
        const a = jitter(seed, i) * TAU;
        const d = easeOut(t) * spread * (0.4 + jitter(seed, i + 40) * 0.9);
        g.fillStyle(this.tint(i % 3 === 0 ? CLT.clothPale : color), (1 - t) * 0.8);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d - t * 6, 2.4 * (1 - t * 0.6));
      }
    });
  }

  /** The web closing over somebody. */
  wrap(x: number, y: number, r: number): void {
    this.anim(11, 380, (g, t) => {
      const k = easeOut(t);
      webGlyph(g, this.tint, x, y, r * (0.3 + k * 0.7), 1, 1 - t * 0.3, t * 3);
    });
  }

  /** Clothstorm / Bleed Stop: a wide ring of fabric thrown outward. */
  burst(x: number, y: number, r: number, color = CLT.cloth): void {
    this.flashIn(x, y, r * 0.35, CLT.clothPale, color, 11);
    this.anim(11, 420, (g, t) => {
      const k = easeOut(t);
      g.lineStyle(9 * (1 - t), this.tint(color), (1 - t) * 0.5);
      g.strokeCircle(x, y, r * k);
      g.lineStyle(2.4 * (1 - t), this.tint(CLT.clothPale), (1 - t) * 0.8);
      g.strokeCircle(x, y, r * k * 0.86);
      // Torn banners riding the front of the wave.
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + t * 0.7;
        const d = r * k;
        g.fillStyle(this.tint(color), (1 - t) * 0.7);
        g.fillPoints([
          new Phaser.Geom.Point(x + Math.cos(a) * d, y + Math.sin(a) * d),
          new Phaser.Geom.Point(x + Math.cos(a + 0.16) * (d - 13), y + Math.sin(a + 0.16) * (d - 13)),
          new Phaser.Geom.Point(x + Math.cos(a - 0.16) * (d - 13), y + Math.sin(a - 0.16) * (d - 13)),
        ], true);
      }
    });
  }

  /** An artwork being sewn onto the loom. */
  sew(x: number, y: number, color: number): void {
    this.anim(12, 520, (g, t) => {
      const k = easeOut(t);
      g.lineStyle(2 * (1 - t), this.tint(color), 1 - t);
      // A running stitch spiralling outward.
      let px = x;
      let py = y;
      for (let i = 0; i < 14; i++) {
        const a = i * 0.9 + t * 2;
        const d = k * (4 + i * 2.6);
        const nx = x + Math.cos(a) * d;
        const ny = y + Math.sin(a) * d * 0.7;
        if (i % 2 === 0) g.lineBetween(px, py, nx, ny);
        px = nx; py = ny;
      }
      g.fillStyle(this.tint(color), (1 - t) * 0.8);
      g.fillCircle(x, y - k * 18, 3 * (1 - t));
    });
  }

  /** The wardrobe change: the old outfit sloughing off in panels. */
  shed(x: number, y: number, from: number, to: number): void {
    this.anim(11, 460, (g, t) => {
      const k = easeOut(t);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + 0.3;
        const d = k * 40;
        g.fillStyle(this.tint(from), (1 - t) * 0.85);
        g.fillPoints([
          new Phaser.Geom.Point(x + Math.cos(a) * d, y + Math.sin(a) * d),
          new Phaser.Geom.Point(x + Math.cos(a + 0.3) * (d + 9), y + Math.sin(a + 0.3) * (d + 9)),
          new Phaser.Geom.Point(x + Math.cos(a + 0.1) * (d + 3), y + Math.sin(a + 0.1) * (d + 3) + 8),
        ], true);
      }
      g.fillStyle(this.tint(to), (1 - t) * 0.5);
      g.fillCircle(x, y, 20 * (1 - t) + 6);
    });
  }
}

// ── The tailor ───────────────────────────────────────────────────────────────

const CLOTH_AVATAR: AvatarSpec = {
  hands: [
    { r: 12, color: CLT.clothDeep, alpha: 0.3 },
    { r: 7, color: CLT.cloth, alpha: 0.92 },
    { r: 2.6, color: CLT.clothPale, alpha: 0.95, ox: -1.6, oy: -1.9 },
  ],
  eyeWhite: CLT.clothPale,
  eyePupil: CLT.ink,
  squash: { div: 14, x: 0.5, y: 0.32 },
};

/**
 * A plain round ball of red wool with a very large scarf trailing off it.
 *
 * Cloth has no sprite underneath (`elem-bodyless`), so `drawBody` paints the torso: the same
 * one-hue orb every early element is — dark wine rim, rose core, one rim light, one glint — and
 * nothing printed on it. The tailor lives in the accessories instead. The **scarf** is the one
 * that matters: its near end is wound twice round the crown here, and the rest of it is world
 * geometry the kit draws (and that the game hits), so the collar is the join between the two.
 * The one secondary touch is the **needle** held point-out in the right hand.
 *
 * Mastery enhances those two rather than adding to them: the collar gains a brass-stitched hem
 * and a band in the current outfit's colour (so a wardrobe change still shows on the rig), the
 * needle grows longer with a brass glint at its point, the hands get a wider corona and the eyes turn brass.
 */
export class ClothAvatar extends BaseAvatar {
  /** 0–1 of the scarf bar. The under-shadow narrows as the ball unwinds. */
  private wound = 1;
  private woundTarget = 1;
  /** 0–1 of max scarf that is currently Pinned. Shows as a bruised pool in the under-glow. */
  private pinned = 0;
  private pinnedTarget = 0;
  /** Which outfit is on, and how far through the change we are. */
  private outfit: Outfit = 'suit';
  private swap = 0;
  private flare = 0;

  constructor(scene: Phaser.Scene, tint: ClothColorFn, depth = 6) {
    super(scene, tint, depth, CLOTH_AVATAR);
  }

  setWound(v: number): void { this.woundTarget = Phaser.Math.Clamp(v, 0, 1); }
  setPinned(v: number): void { this.pinnedTarget = Phaser.Math.Clamp(v, 0, 1); }

  setOutfit(o: Outfit): void {
    if (o === this.outfit) return;
    this.outfit = o;
    this.swap = 1;
  }

  currentOutfit(): Outfit { return this.outfit; }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.flare = Math.max(0, this.flare - delta / 340);
    this.swap = Math.max(0, this.swap - delta / 420);
    this.wound += (this.woundTarget - this.wound) * Math.min(1, delta / 280);
    this.pinned += (this.pinnedTarget - this.pinned) * Math.min(1, delta / 300);
    super.update(delta, x, y, alpha);
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.flare = 1;
    super.play(gesture, angle, duration);
  }

  /** Brass eyes and a wider, brighter wool corona round each hand; the accessories gild in `drawExtras`. */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? CLT.brassLit : CLT.clothPale);
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 15 : 12);
      glow.setFillStyle(this.tint(on ? CLT.brass : CLT.clothDeep), on ? 0.4 : 0.3);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new ClothFx(this.scene, this.tint).lint(x, y, 2, 7, 300, CLT.clothDeep);
  }

  /** A soft wool shadow, wider the fuller the ball of wool still is. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    g.fillStyle(this.tint(this.mastered ? CLT.brass : CLT.clothDeep), a * (this.mastered ? 0.3 : 0.4));
    g.fillEllipse(x, y + 19, 40 + this.wound * 14, 14);
    if (this.pinned > 0.02) {
      g.fillStyle(this.tint(CLT.pinnedDark), a * this.pinned * 0.5);
      g.fillEllipse(x, y + 19, 26 + this.pinned * 18, 9);
    }
  }

  /**
   * The body: a plain one-hue orb, the same tiers `bakeOrb` gives every baked element (radius 22,
   * dark rim → lit core, one rim light, one glint), painted live because Cloth has no sprite.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    g.fillStyle(this.tint(CLT.clothRim), alpha);
    g.fillCircle(x, y, 22);
    g.fillStyle(this.tint(CLT.clothDeep), alpha);
    g.fillCircle(x, y, 19.5);
    g.fillStyle(this.tint(CLT.clothMid), alpha);
    g.fillCircle(x, y + 1, 16);
    g.fillStyle(this.tint(CLT.cloth), alpha);
    g.fillCircle(x, y + 2.5, 12);
    g.fillStyle(this.tint(CLT.clothLit), alpha * 0.85);
    g.fillEllipse(x, y + 7, 16, 8);
    g.lineStyle(2.5, this.tint(CLT.clothLit), alpha * 0.9);
    g.strokeCircle(x, y, 21);
    g.lineStyle(2, this.tint(CLT.clothLit), alpha * 0.55);
    g.beginPath();
    g.arc(x, y, 18.5, Math.PI * 1.15, Math.PI * 1.85);
    g.strokePath();
    g.fillStyle(this.tint(CLT.clothPale), alpha * 0.85);
    g.fillEllipse(x - 6.5, y - 8, 8, 5);

    // The wardrobe change: a brief flash over the orb, so Space still reads on the body.
    if (this.swap > 0.01) {
      g.fillStyle(this.tint(CLT.clothPale), alpha * this.swap * 0.5);
      g.fillCircle(x, y, 23);
    }
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const m = this.mastered;
    const crown = y - 16;
    const lean = Math.cos(this.facing) * 1.5;

    // ── The scarf collar ──
    // Wound twice round the crown, stopping above the eyes. The free end the kit paints as world
    // geometry leaves from here.
    for (let i = 0; i < 2; i++) {
      const cy = crown + i * 4;
      g.fillStyle(this.tint(CLT.ink), alpha * 0.5);
      g.fillEllipse(x + lean, cy + 1.2, 28 - i * 3.6, 9 - i * 1.4);
      g.fillStyle(this.tint(i ? CLT.clothDeep : CLT.cloth), alpha);
      g.fillEllipse(x + lean, cy, 27 - i * 3.6, 8.4 - i * 1.4);
      g.fillStyle(this.tint(CLT.clothPale), alpha * 0.3);
      g.fillEllipse(x + lean - 3, cy - 1.6, 14 - i * 2.6, 2.6);
    }
    // A loose knot-end lifting off one side.
    const flutter = Math.sin(this.t * 2.4) * 2;
    g.fillStyle(this.tint(CLT.cloth), alpha);
    g.fillPoints([
      new Phaser.Geom.Point(x + lean + 9, crown - 2),
      new Phaser.Geom.Point(x + lean + 17 + flutter * 0.4, crown - 8 + flutter),
      new Phaser.Geom.Point(x + lean + 18 + flutter * 0.5, crown - 3 + flutter),
      new Phaser.Geom.Point(x + lean + 11, crown + 2),
    ], true);

    // Mastered: the collar is hemmed in the current outfit's colour, stitched in brass.
    if (m) {
      const hemY = crown + 0.5;
      g.fillStyle(this.tint(OUTFIT_COLOR[this.outfit]), alpha);
      g.fillEllipse(x + lean, hemY, 25, 3.6);
      g.lineStyle(1.2, this.tint(CLT.brassLit), alpha * 0.95);
      for (let i = -3; i <= 3; i++) {
        const sx = x + lean + i * 3;
        g.lineBetween(sx - 0.9, hemY - 1, sx + 0.9, hemY + 1);
      }
      g.fillStyle(this.tint(CLT.brassLit), alpha * (0.25 + 0.15 * Math.sin(this.t * 3)));
      g.fillEllipse(x + lean, crown - 2, 30, 6);
    }

    // ── The needle, in the right hand ──
    // Held point-out along the aim; it flicks wider while casting.
    const hx = this.armX[1], hy = this.armY[1];
    const ang = this.facing - 0.35 + this.flare * 0.3;
    const len = m ? 26 : 20;
    pinGlyph(
      g, this.tint,
      hx + Math.cos(ang) * len * 0.3, hy + Math.sin(ang) * len * 0.3,
      ang, len, alpha, { head: m ? 2.8 : 2.2, hot: false },
    );
    if (m) {
      const tx = hx + Math.cos(ang) * len * 0.8, ty = hy + Math.sin(ang) * len * 0.8;
      g.fillStyle(this.tint(CLT.brassLit), alpha * (0.35 + 0.2 * Math.sin(this.t * 5)));
      g.fillCircle(tx, ty, 3);
    }
  }
}
