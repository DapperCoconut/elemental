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

/**
 * One winding of thread over the ball body: a rotated ellipse stroked as a polyline, so the band
 * curves *across* the ball the way wound wool does instead of ringing it like a hoop. Kept inside
 * the body radius, which is what stops a winding spilling off the silhouette.
 */
export function yarnBand(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, rx: number, ry: number, rot: number,
  color: number, alpha: number, width = 1.5,
): void {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  g.lineStyle(width, tint(color), alpha);
  g.beginPath();
  for (let i = 0; i <= 22; i++) {
    const a = (i / 22) * TAU;
    const ex = Math.cos(a) * rx;
    const ey = Math.sin(a) * ry;
    const px = x + ex * c - ey * s;
    const py = y + ex * s + ey * c;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
}

/**
 * A garment wrapped round the ball body. The hem follows the body's own rim — that is what keeps
 * the character round when it is dressed — and the top edge is a neckline that rides high on the
 * flanks and sags in the middle, so the face stays bare wool.
 *
 * `shoulder` is how far up the flanks the cloth reaches (0 = the equator, 1 = the crown) and
 * `neck` is how many pixels the neckline sags below that at the centre.
 */
export function outfitWrap(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, rx: number, ry: number,
  shoulder: number, neck: number, color: number, alpha: number,
): void {
  const a0 = -Math.asin(Phaser.Math.Clamp(shoulder, 0, 0.95));
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= 20; i++) {
    const ang = a0 + (i / 20) * (Math.PI - 2 * a0);
    pts.push(new Phaser.Geom.Point(x + Math.cos(ang) * rx, y + Math.sin(ang) * ry));
  }
  const topY = y + Math.sin(a0) * ry;
  const halfW = Math.cos(a0) * rx;
  for (let i = 1; i < 12; i++) {
    const k = i / 12;
    pts.push(new Phaser.Geom.Point(x - halfW + k * halfW * 2, topY + Math.sin(k * Math.PI) * neck));
  }
  g.fillStyle(tint(color), alpha);
  g.fillPoints(pts, true);
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

  /** Clothstorm / Wretched Scarf: a wide ring of fabric thrown outward. */
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
 * A big round ball of wool that got dressed, with a very large scarf trailing off it.
 *
 * The body is the ball the scarf is wound from: a wide, soft sphere criss-crossed with thread,
 * and the winding *is* the scarf bar — a tailor who has paid out most of their wool is visibly
 * down to a few loose strands over a dark core. The needle driven through it is the element's
 * read at icon size. What the avatar owns on top of that is the wardrobe: the garment wrapped
 * round the ball is the mastery's whole tell, and it changes colour and cut with every press of
 * Space.
 */
export class ClothAvatar extends BaseAvatar {
  /** 0–1 of the scarf bar. Drives how much thread is still wound on the bobbin. */
  private wound = 1;
  private woundTarget = 1;
  /** 0–1 of max scarf that is currently Pinned. Pins push out through the body. */
  private pinned = 0;
  private pinnedTarget = 0;
  /** Which outfit is on, and how far through the change we are. */
  private outfit: Outfit = 'suit';
  private swap = 0;
  private flare = 0;
  private seed = Math.random() * 999;

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

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 15 : 12);
      glow.setAlpha(on ? 0.55 : 0.3);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new ClothFx(this.scene, this.tint).lint(x, y, 2, 7, 300, CLT.clothDeep);
  }

  /** A soft wool shadow, wider the fuller the ball of wool still is. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    g.fillStyle(this.tint(CLT.clothDeep), a * 0.4);
    g.fillEllipse(x, y + 19, 40 + this.wound * 14, 14);
    if (this.pinned > 0.02) {
      g.fillStyle(this.tint(CLT.pinnedDark), a * this.pinned * 0.5);
      g.fillEllipse(x, y + 19, 26 + this.pinned * 18, 9);
    }
  }

  /**
   * The ball of wool, dressed. The windings across it are the scarf bar told a second time —
   * they unwind as the scarf is cut down, so a hurt tailor is visibly running out of material
   * and the dark core underneath starts to show through.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const breathe = Math.sin(this.t * 2.6) * 0.7;
    const coat = OUTFIT_COLOR[this.outfit];
    // Round, and as big as anybody else's. Breathing squashes it rather than resizing it, so the
    // hitbox read never moves.
    const rx = 18 + breathe * 0.35;
    const ry = 17 - breathe * 0.35;

    // ── The ball ──
    g.fillStyle(this.tint(CLT.ink), alpha * 0.9);
    g.fillEllipse(x, y + 1.5, rx * 2 + 3, ry * 2 + 3);
    g.fillStyle(this.tint(CLT.clothDeep), alpha);
    g.fillEllipse(x, y, rx * 2, ry * 2);
    // The wool itself, inset so the dark rim reads as the shadowed underside of the sphere.
    g.fillStyle(this.tint(CLT.cloth), alpha * (0.45 + this.wound * 0.55));
    g.fillEllipse(x - 1, y - 1, rx * 1.74, ry * 1.74);
    g.fillStyle(this.tint(CLT.clothLit), alpha * 0.4);
    g.fillEllipse(x - 5.5, y - 6.5, rx * 0.8, ry * 0.62);

    // ── The winding ──
    // Bands crossing the ball at a spread of angles. The count is the scarf bar.
    const bands = 3 + Math.round(this.wound * 5);
    for (let i = 0; i < bands; i++) {
      const f = bands > 1 ? i / (bands - 1) : 0.5;
      const rot = -0.95 + f * 1.9 + Math.sin(this.t * 0.6 + i * 1.3) * 0.06;
      yarnBand(
        g, this.tint, x, y - 1,
        rx * (0.9 - f * 0.08), ry * (0.24 + Math.abs(f - 0.5) * 0.34), rot,
        i % 2 ? CLT.clothDeep : CLT.clothPale, alpha * 0.55, 1.4,
      );
    }
    // A loose end lifting off the crown — the thread this ball is paying out.
    const curl = Math.sin(this.t * 2.1) * 3;
    g.lineStyle(2, this.tint(CLT.cloth), alpha * 0.9);
    g.beginPath();
    g.moveTo(x + 11, y - 11);
    g.lineTo(x + 16 + curl * 0.4, y - 16);
    g.lineTo(x + 14 + curl, y - 21);
    g.strokePath();

    // ── The outfit ──
    // Wrapped round the ball, hem following its rim, neckline sagging clear of the face.
    switch (this.outfit) {
      case 'coat':
        // Heavy: rides high on the flanks, hangs a little wide of the body, storm flap across.
        outfitWrap(g, this.tint, x, y + 1, rx * 1.06, ry * 1.04, 0.74, 11, CLT.ink, alpha * 0.9);
        outfitWrap(g, this.tint, x, y, rx * 1.04, ry * 1.02, 0.72, 11, coat, alpha * 0.97);
        g.fillStyle(this.tint(CLT.ink), alpha * 0.35);
        g.fillEllipse(x, y + 4, rx * 1.7, 5);
        // Collar wings standing off the shoulders.
        for (const sd of [-1, 1]) {
          g.fillStyle(this.tint(coat), alpha);
          g.fillPoints([
            new Phaser.Geom.Point(x + sd * 5, y - 6),
            new Phaser.Geom.Point(x + sd * 17, y - 12),
            new Phaser.Geom.Point(x + sd * 13, y + 1),
          ], true);
        }
        break;
      case 'silk':
        // Thin: a low wrap crossing over itself, with most of the wool still showing.
        outfitWrap(g, this.tint, x, y, rx, ry, 0.42, 7, CLT.silk, alpha * 0.9);
        g.lineStyle(2, this.tint(CLT.clothPale), alpha * 0.75);
        g.lineBetween(x - 12, y - 3, x + 9, y + 9);
        g.lineStyle(1.4, this.tint(CLT.ink), alpha * 0.3);
        g.lineBetween(x + 11, y - 2, x - 8, y + 10);
        // A sash end trailing off the hip.
        g.fillStyle(this.tint(CLT.silk), alpha * 0.85);
        g.fillPoints([
          new Phaser.Geom.Point(x - 11, y + 4),
          new Phaser.Geom.Point(x - 17 + curl * 0.5, y + 13),
          new Phaser.Geom.Point(x - 8, y + 11),
        ], true);
        break;
      case 'hoodie':
        // Casual: a bunched hood behind the crown and a kangaroo pocket across the belly.
        g.fillStyle(this.tint(CLT.ink), alpha * 0.5);
        g.fillEllipse(x, y - 13, rx * 1.5, 12);
        g.fillStyle(this.tint(coat), alpha * 0.95);
        g.fillEllipse(x, y - 14, rx * 1.35, 10);
        outfitWrap(g, this.tint, x, y, rx * 1.02, ry, 0.66, 10, coat, alpha * 0.95);
        g.lineStyle(1.6, this.tint(CLT.ink), alpha * 0.45);
        g.beginPath();
        g.arc(x, y + 3, 11, 0.25, Math.PI - 0.25);
        g.strokePath();
        // Drawstrings.
        for (const sd of [-1, 1]) {
          g.lineStyle(1.4, this.tint(CLT.clothPale), alpha * 0.8);
          g.lineBetween(x + sd * 4, y - 5, x + sd * 3, y + 2);
        }
        break;
      default:
        // Black Suit: lapels off a pale shirt, with a knot of tie at the neckline.
        outfitWrap(g, this.tint, x, y, rx, ry, 0.6, 10, CLT.ink, alpha * 0.9);
        outfitWrap(g, this.tint, x, y - 0.6, rx * 0.99, ry * 0.99, 0.58, 10, coat, alpha * 0.97);
        g.fillStyle(this.tint(CLT.clothPale), alpha * 0.92);
        g.fillPoints([
          new Phaser.Geom.Point(x - 5, y - 3), new Phaser.Geom.Point(x + 5, y - 3),
          new Phaser.Geom.Point(x, y + 9),
        ], true);
        for (const sd of [-1, 1]) {
          g.fillStyle(this.tint(coat), alpha);
          g.fillPoints([
            new Phaser.Geom.Point(x + sd * 4, y - 4),
            new Phaser.Geom.Point(x + sd * 14, y - 8),
            new Phaser.Geom.Point(x + sd * 6, y + 6),
          ], true);
        }
        g.fillStyle(this.tint(CLT.clothDeep), alpha);
        g.fillTriangle(x - 2.4, y - 2, x + 2.4, y - 2, x, y + 6);
        break;
    }

    // ── Pins driven through ──
    // Pin Cushion, made visible on the body: one needle per fifth of the pinned pool, stuck
    // through the ball the way spare pins live in a cushion.
    const pins = Math.round(this.pinned * 5);
    for (let i = 0; i < pins; i++) {
      const ang = -1.9 + i * 0.78 + Math.sin(this.t * 1.6 + i) * 0.05;
      pinGlyph(
        g, this.tint,
        x + Math.cos(ang) * 8, y - 2 + Math.sin(ang) * 7,
        ang, 22, alpha * 0.95, { head: 2.2 },
      );
    }

    // ── The tailor's needle ──
    // Always there, driven diagonally through the ball. It is the element's read at 12px.
    pinGlyph(g, this.tint, x + 2, y - 2, -0.72, 40, alpha, { head: 3.4 });

    // The swap flash, riding over everything.
    if (this.swap > 0.01) {
      g.fillStyle(this.tint(CLT.clothPale), alpha * this.swap * 0.5);
      g.fillEllipse(x, y, rx * 2.2, ry * 2.2);
    }
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const crown = y - 15;

    // ── Collar ──
    // The scarf's near end, wrapped twice round the top of the ball. The rest of it is world
    // geometry the kit draws, so this is the join between the two.
    for (let i = 0; i < 2; i++) {
      const cy = crown + 1 + i * 4;
      g.fillStyle(this.tint(i ? CLT.clothDeep : CLT.cloth), alpha * 0.95);
      g.fillEllipse(x, cy, 27 - i * 3.6, 8.4 - i * 1.4);
      g.fillStyle(this.tint(CLT.clothPale), alpha * 0.28);
      g.fillEllipse(x - 3, cy - 1.6, 14 - i * 2.6, 2.8);
    }

    // ── Pincushion hat ──
    // A little wool dome over the crown with spare pins parked in it. The pins fan wider the
    // more the character is casting, which is the only idle tell the rig has.
    g.fillStyle(this.tint(CLT.clothDeep), alpha);
    g.fillEllipse(x, crown - 5, 18, 10);
    g.fillStyle(this.tint(CLT.cloth), alpha);
    g.fillEllipse(x - 1, crown - 6.6, 14.5, 7.4);
    for (let i = 0; i < 4; i++) {
      const ang = -Math.PI / 2 + (i - 1.5) * (0.42 + this.flare * 0.16);
      pinGlyph(g, this.tint, x + Math.cos(ang) * 7, crown - 6 + Math.sin(ang) * 4.5, ang, 16, alpha * 0.95, { head: 2 });
    }

    // ── Loose threads ──
    // A few strands lifting off the shoulders. Cheap motion that keeps a still character alive.
    for (let i = 0; i < 3; i++) {
      const ph = (this.t * 0.6 + i / 3) % 1;
      const sx = x + (jitter(this.seed, 40 + i) - 0.5) * 32;
      const sy = y - 4 - ph * 16;
      g.lineStyle(1, this.tint(CLT.clothDeep), alpha * (1 - ph) * 0.5);
      g.lineBetween(sx, sy, sx + Math.sin(this.t * 3 + i) * 4, sy - 6);
    }

    // Mastered: a golden thimble crowns them, and the spare pins turn brass.
    if (this.mastered) {
      const my = crown - 15;
      g.fillStyle(this.tint(CLT.brassDark), alpha * 0.9);
      g.fillEllipse(x, my + 3, 12, 5);
      g.fillStyle(this.tint(CLT.brass), alpha);
      g.fillRoundedRect(x - 5, my - 5, 10, 9, 3);
      g.fillStyle(this.tint(CLT.brassLit), alpha);
      g.fillEllipse(x, my - 5, 10, 4);
      // Dimples.
      for (let i = 0; i < 3; i++) {
        g.fillStyle(this.tint(CLT.brassDark), alpha * 0.7);
        g.fillCircle(x - 3 + i * 3, my - 1 + (i % 2) * 2.4, 0.9);
      }
    }
  }
}
