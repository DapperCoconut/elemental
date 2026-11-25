import Phaser from 'phaser';
import { TAU } from '../ElementVisuals';
import type { ColorFn } from '../ElementVisuals';

/**
 * What the Jason skin's painter (`JasonFx`) still needs from the old Silence drawing kit, which
 * was deleted when Fear replaced Silence: its palette (the keys of `JASON_SKIN.palette`), the eye
 * and the fog bank. Nothing else should import this.
 */
export type SilenceColorFn = ColorFn;

export const SILENCE = {
  /** The dark it hides in. */
  void: 0x05000a,
  pitch: 0x0a0010,
  bruise: 0x1a0022,
  plum: 0x2a1038,
  /** The colour it bleeds when it is seen. */
  violet: 0x442255,
  amethyst: 0x6622aa,
  orchid: 0x8844cc,
  lilac: 0xcc99ff,
  pale: 0xeeddff,
  white: 0xffffff,
  /** Things with edges: teeth, nails, bone. */
  bone: 0xddddcc,
  sclera: 0xddddee,
  /** Blood, and the ritual that spills it. */
  blood: 0xcc1133,
  gore: 0xff2233,
  rust: 0x881122,
  meat: 0x661122,
  /** The effigy. */
  burlap: 0xb49a6a,
  twine: 0x7d6440,
  /** What the blob spits. */
  bile: 0x7a8a66,
  bileHi: 0x9aaa88,
} as const;

export interface Pt { x: number; y: number }

// ── Path helpers ──────────────────────────────────────────────────────────

function fillPts(g: Phaser.GameObjects.Graphics, pts: Pt[]): void {
  if (pts.length < 3) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
}

function strokePts(g: Phaser.GameObjects.Graphics, pts: Pt[], close = false): void {
  if (pts.length < 2) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  if (close) g.closePath();
  g.strokePath();
}

export function silenceEye(
  g: Phaser.GameObjects.Graphics, tint: SilenceColorFn,
  cx: number, cy: number, angle: number, r: number,
  look: number, open: number, iris: number, alpha: number,
): void {
  const k = Phaser.Math.Clamp(open, 0, 1);
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const to = (lx: number, ly: number): Pt => ({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos });

  // Socket — a dark ring, so the white does not float on a light background.
  g.fillStyle(tint(SILENCE.void), alpha * 0.75);
  const sock: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = (i / 16) * TAU;
    sock.push(to(Math.cos(t) * r * 1.28, Math.sin(t) * r * (0.72 * k + 0.16)));
  }
  fillPts(g, sock);

  if (k <= 0.04) {
    // Shut: a single crease where the eye was.
    g.lineStyle(Math.max(0.9, r * 0.16), tint(SILENCE.pitch), alpha);
    strokePts(g, [to(-r, 0), to(r, 0)]);
    return;
  }

  const white: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = (i / 16) * TAU;
    white.push(to(Math.cos(t) * r, Math.sin(t) * r * 0.66 * k));
  }
  g.fillStyle(tint(SILENCE.sclera), alpha);
  fillPts(g, white);

  // The iris slides toward whatever it is looking at.
  const px = to(look * r * 0.42, 0);
  g.fillStyle(tint(iris), alpha);
  g.fillCircle(px.x, px.y, r * 0.42 * (0.55 + 0.45 * k));
  g.fillStyle(tint(SILENCE.void), alpha);
  g.fillCircle(px.x, px.y, r * 0.2 * (0.55 + 0.45 * k));
  // Specular, off-centre — dead centre reads as a bead.
  g.fillStyle(tint(SILENCE.white), alpha * 0.8);
  const hl = to(look * r * 0.42 - r * 0.16, -r * 0.2 * k);
  g.fillCircle(hl.x, hl.y, r * 0.13);
}

/** A ring of inward-pointing teeth — the blob's maw and the possessed body's bite. */
export function toothRing(
  g: Phaser.GameObjects.Graphics, tint: SilenceColorFn,
  cx: number, cy: number, radius: number, count: number,
  bite: number, alpha: number, gum: number = SILENCE.meat,
): void {
  g.lineStyle(Math.max(1.4, radius * 0.03), tint(gum), alpha * 0.85);
  g.strokeCircle(cx, cy, radius);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU;
    // Alternating long and short teeth, and the whole set slides inward as `bite` closes.
    const long = i % 2 === 0;
    const l = radius * (long ? 0.24 : 0.16) * (0.7 + bite * 0.7);
    const w = radius * (long ? 0.055 : 0.04);
    const bx = cx + Math.cos(a) * radius * (1 - bite * 0.16);
    const by = cy + Math.sin(a) * radius * (1 - bite * 0.16);
    const px = -Math.sin(a) * w, py = Math.cos(a) * w;
    g.fillStyle(tint(SILENCE.void), alpha * 0.5);
    fillPts(g, [
      { x: bx - px + 1, y: by - py + 1.6 }, { x: bx + px + 1, y: by + py + 1.6 },
      { x: bx - Math.cos(a) * l + 1, y: by - Math.sin(a) * l + 1.6 },
    ]);
    g.fillStyle(tint(SILENCE.bone), alpha * 0.95);
    fillPts(g, [
      { x: bx - px, y: by - py }, { x: bx + px, y: by + py },
      { x: bx - Math.cos(a) * l, y: by - Math.sin(a) * l },
    ]);
  }
}

/**
 * A bank of fog: overlapping soft lobes that boil on their own phases, with fingers of it
 * feeling forward along `angle`.
 *
 * The border fog is where Silence lives, so it cannot be a flat rectangle of black — it has to
 * look like it is coming for you slowly.
 */
export function fogBank(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, radius: number, seed: number, t: number,
  color: number, alpha: number, lobes = 6,
): void {
  g.fillStyle(color, alpha);
  for (let i = 0; i < lobes; i++) {
    const a = seed + (i / lobes) * TAU + t * 0.22;
    const d = radius * (0.28 + 0.34 * Math.abs(Math.sin(seed * 3 + i * 2.1)));
    const r = radius * (0.5 + 0.34 * Math.abs(Math.sin(seed + i * 1.7 + t * 0.8)));
    g.fillCircle(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, r);
  }
}

/** A splatter of blood: irregular blobs with a couple of drips hanging off the low side. */
