import Phaser from 'phaser';
import { OBS, councilMask, seam, shard, slab, mixC, lit, dim } from '../../../../art/PinnacleArt';

/**
 * The Choir Bench's own drawings. The room is the Pinnacle's black glass like every bench; what
 * Choirholm brings to it is ONE family of colour — the rose-pink of a voice — and it only ever
 * appears as light: the voices trapped in jars, the stave inlaid up the aisle, the lip of every
 * glass organ pipe. White silk (the ribbon the muted wear) and old paper (jar labels, hymn sheets)
 * are the only other things that are not glass.
 */

type G = Phaser.GameObjects.Graphics;
interface P { x: number; y: number }

/** A voice, caught. */
export const VOICE = 0xff8ac8;
export const VOICE_LIT = 0xffd2ec;
export const VOICE_DEEP = 0x9a3270;
/** The white silk ribbon the muted wear at the throat. */
export const SILK = 0xf3eee6;
export const SILK_SHADE = 0xc4bcb0;
/** Labels, hymn sheets, the Score. */
export const PAPER = 0xe8dcc2;
export const PAPER_SHADE = 0xb8a888;
export const INK = 0x1c1424;

/** The three Parts of the choir (a decree's floor needs them told apart at a glance). */
export const PART_COLORS = [0xffa6d8, 0xa98bff, 0x6fd6ff] as const;
export const PART_NAMES = ['SOPRANO', 'ALTO', 'BASS'] as const;

const pt = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

/** Five stave lines from x0 to x1, the top line at `y`. */
export function stave(g: G, x0: number, x1: number, y: number, gap: number, color: number, alpha: number, w = 1): void {
  g.lineStyle(w, color, alpha);
  for (let i = 0; i < 5; i++) g.lineBetween(x0, y + i * gap, x1, y + i * gap);
}

/** A note: a tilted head, a stem and (for `eighth`) a flag. `x, y` is the head. */
export function note(g: G, x: number, y: number, s: number, color: number, alpha = 1, eighth = false): void {
  g.fillStyle(color, alpha);
  g.fillEllipse(x, y, s * 1.5, s * 1.05);
  g.fillStyle(lit(color, 0.6), alpha * 0.7);
  g.fillEllipse(x - s * 0.25, y - s * 0.2, s * 0.5, s * 0.3);
  g.lineStyle(Math.max(1, s * 0.22), color, alpha);
  g.lineBetween(x + s * 0.66, y, x + s * 0.66, y - s * 3.1);
  if (eighth) {
    g.beginPath();
    g.moveTo(x + s * 0.66, y - s * 3.1);
    g.lineTo(x + s * 1.5, y - s * 2.2);
    g.lineTo(x + s * 1.35, y - s * 1.5);
    g.strokePath();
  }
}

/** A repeat sign — thick bar, thin bar, two dots — the Echo decree's mark. */
export function repeatSign(g: G, x: number, y: number, s: number, color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillRect(x - s * 0.5, y - s, s * 0.32, s * 2);
  g.fillRect(x - s * 0.06, y - s, s * 0.1, s * 2);
  g.fillCircle(x + s * 0.36, y - s * 0.34, s * 0.16);
  g.fillCircle(x + s * 0.36, y + s * 0.34, s * 0.16);
}

/** The white silk ribbon of the muted: a bow and two tails. `s` ≈ half-width. */
export function ribbon(g: G, x: number, y: number, s: number, alpha = 1, lean = 0): void {
  g.fillStyle(SILK_SHADE, alpha);
  g.fillTriangle(x, y, x - s * 0.5 + lean, y + s * 1.4, x - s * 0.15 + lean, y + s * 1.5);
  g.fillTriangle(x, y, x + s * 0.55 + lean, y + s * 1.3, x + s * 0.2 + lean, y + s * 1.45);
  g.fillStyle(SILK, alpha);
  g.fillTriangle(x, y, x - s, y - s * 0.55, x - s * 0.95, y + s * 0.5);
  g.fillTriangle(x, y, x + s, y - s * 0.5, x + s * 0.92, y + s * 0.55);
  g.fillStyle(0xffffff, alpha * 0.8);
  g.fillTriangle(x, y, x - s * 0.8, y - s * 0.4, x - s * 0.5, y - s * 0.1);
  g.fillStyle(SILK_SHADE, alpha);
  g.fillCircle(x, y, s * 0.24);
}

/** A loose hymn sheet: a pale page with staves on it, lying at an angle. */
export function hymnSheet(g: G, x: number, y: number, s: number, a: number, alpha = 1): void {
  const c = Math.cos(a), sn = Math.sin(a);
  const q = (dx: number, dy: number) => pt(x + dx * c - dy * sn, y + dx * sn + dy * c);
  g.fillStyle(PAPER_SHADE, alpha);
  g.fillPoints([q(-s + 1, -s * 1.3 + 1.5), q(s + 1, -s * 1.3 + 1.5), q(s + 1, s * 1.3 + 1.5), q(-s + 1, s * 1.3 + 1.5)], true);
  g.fillStyle(PAPER, alpha);
  g.fillPoints([q(-s, -s * 1.3), q(s, -s * 1.3), q(s, s * 1.3), q(-s, s * 1.3)], true);
  g.lineStyle(0.8, INK, 0.45 * alpha);
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 3; i++) {
      const yy = -s * 0.9 + r * s * 0.75 + i * s * 0.12;
      const a0 = q(-s * 0.8, yy), a1 = q(s * 0.8, yy);
      g.lineBetween(a0.x, a0.y, a1.x, a1.y);
    }
  }
}

/**
 * A stoppered jar with a voice in it. `x, y` is the foot, `s` the height. The voice is a soft
 * rose wisp with the faint shape of a mouth; `glow` 0–1 is how loud it is humming. `open` takes
 * the stopper out (the voice has gone home).
 */
export function voiceJar(g: G, x: number, y: number, s: number, o: { glow?: number; label?: boolean; open?: boolean; tint?: number } = {}): void {
  const glow = o.glow ?? 0.6;
  const w = s * 0.62;
  const tint = o.tint ?? VOICE;
  const bodyY = y - s * 0.42;
  // Glow behind the glass.
  if (!o.open && glow > 0) {
    g.fillStyle(tint, 0.08 * glow); g.fillCircle(x, bodyY, s * 0.75);
  }
  // Body: a round-shouldered jar of smoked glass.
  g.fillStyle(OBS.glass, 0.9);
  g.fillRoundedRect(x - w / 2, y - s * 0.78, w, s * 0.78, Math.min(w * 0.3, 6));
  // The voice inside.
  if (!o.open) {
    g.fillStyle(tint, 0.35 + glow * 0.4); g.fillEllipse(x, bodyY + s * 0.05, w * 0.7, s * 0.48);
    g.fillStyle(lit(tint, 0.5), 0.3 + glow * 0.6); g.fillEllipse(x, bodyY, w * 0.4, s * 0.28);
    if (s > 14) {
      // A mouth, open on a note.
      g.fillStyle(dim(tint, 0.55), 0.55 * glow); g.fillEllipse(x, bodyY + s * 0.04, w * 0.14, s * 0.1);
    }
  }
  // Glass: sheen down one side, a pale rim line.
  g.fillStyle(0xffffff, 0.12); g.fillRect(x - w / 2 + w * 0.12, y - s * 0.7, Math.max(1, w * 0.12), s * 0.56);
  g.lineStyle(1, OBS.edge, 0.5); g.strokeRoundedRect(x - w / 2, y - s * 0.78, w, s * 0.78, Math.min(w * 0.3, 6));
  // Neck and stopper (black glass, a glint).
  g.fillStyle(OBS.facet, 1); g.fillRect(x - w * 0.26, y - s * 0.9, w * 0.52, s * 0.14);
  if (!o.open) {
    g.fillStyle(OBS.glass, 1); g.fillRoundedRect(x - w * 0.3, y - s * 1.02, w * 0.6, s * 0.14, 2);
    g.fillStyle(OBS.sheen, 1); g.fillRect(x - w * 0.3, y - s * 1.02, w * 0.6, Math.max(1, s * 0.04));
  }
  // The paper label, tied with string.
  if (o.label !== false && s > 10) {
    g.fillStyle(PAPER, 0.85); g.fillRect(x - w * 0.34, y - s * 0.36, w * 0.68, s * 0.18);
    g.lineStyle(0.6, INK, 0.5); g.lineBetween(x - w * 0.24, y - s * 0.27, x + w * 0.2, y - s * 0.27);
  }
}

/**
 * A glass organ pipe, foot at `x, y`, `w` wide, `h` tall: a conical toe, a long glass body, the
 * mouth (a cut lip that glows rose — where the voice comes out) and a violet seam up its back.
 */
export function organPipe(g: G, x: number, y: number, w: number, h: number, hum = 0.5): void {
  const toe = Math.min(h * 0.18, w * 2.2);
  // Toe.
  g.fillStyle(OBS.glass, 1);
  g.fillTriangle(x - w / 2, y - toe, x + w / 2, y - toe, x, y);
  g.fillStyle(OBS.facet, 1);
  g.fillTriangle(x, y - toe, x + w / 2, y - toe, x, y);
  // Body: dark plane, lit plane, edge lines.
  g.fillStyle(OBS.glass, 1); g.fillRect(x - w / 2, y - h, w, h - toe);
  g.fillStyle(OBS.facet, 1); g.fillRect(x, y - h, w / 2, h - toe);
  g.fillStyle(OBS.sheen, 0.6); g.fillRect(x + w * 0.18, y - h, w * 0.12, h - toe);
  g.lineStyle(1, OBS.edge, 0.65); g.lineBetween(x + w / 2, y - h, x + w / 2, y - toe);
  g.lineStyle(1, OBS.edge, 0.25); g.lineBetween(x - w / 2, y - h, x - w / 2, y - toe);
  // Rim.
  g.fillStyle(OBS.sheen, 1); g.fillEllipse(x, y - h, w, w * 0.32);
  g.fillStyle(OBS.glass, 1); g.fillEllipse(x, y - h, w * 0.7, w * 0.2);
  // The mouth, glowing with its voice.
  const my = y - toe - w * 0.9;
  g.fillStyle(VOICE, 0.12 + hum * 0.18); g.fillEllipse(x, my, w * 1.8, w * 1.2);
  g.fillStyle(OBS.glass, 1);
  g.fillPoints([pt(x - w * 0.34, my + w * 0.3), pt(x + w * 0.34, my + w * 0.3), pt(x + w * 0.26, my - w * 0.36), pt(x - w * 0.26, my - w * 0.36)], true);
  g.fillStyle(VOICE, 0.5 + hum * 0.5); g.fillRect(x - w * 0.3, my - w * 0.06, w * 0.6, Math.max(1.2, w * 0.12));
  g.lineStyle(1, VOICE_LIT, 0.4 + hum * 0.4); g.lineBetween(x - w * 0.26, my - w * 0.36, x + w * 0.26, my - w * 0.36);
}

/**
 * One empty seat of the house, seen from the stage: a tall back of glass, a seat pan with a lit
 * front edge, an arm-post at each side. `x, y` is the front of the seat on the floor.
 */
export function houseSeat(g: G, x: number, y: number, s: number): void {
  const w = 22 * s;
  g.fillStyle(0x000000, 0.35); g.fillRect(x - w / 2, y - 2, w, 5);
  // Back.
  g.fillStyle(OBS.glass, 1); g.fillRoundedRect(x - w * 0.42, y - 34 * s, w * 0.84, 22 * s, 3);
  g.fillStyle(OBS.facet, 1); g.fillRect(x - w * 0.42, y - 34 * s, w * 0.84, 4 * s);
  g.lineStyle(1, OBS.edge, 0.35); g.strokeRoundedRect(x - w * 0.42, y - 34 * s, w * 0.84, 22 * s, 3);
  // Seat pan.
  g.fillStyle(OBS.facet, 1); g.fillRect(x - w * 0.44, y - 13 * s, w * 0.88, 8 * s);
  g.fillStyle(OBS.sheen, 1); g.fillRect(x - w * 0.44, y - 13 * s, w * 0.88, 2 * s);
  g.fillStyle(OBS.glass, 1); g.fillRect(x - w * 0.44, y - 5 * s, w * 0.88, 5 * s);
  // Arm posts.
  g.fillStyle(OBS.glass, 1); g.fillRect(x - w / 2, y - 18 * s, 2.5 * s, 18 * s); g.fillRect(x + w / 2 - 2.5 * s, y - 18 * s, 2.5 * s, 18 * s);
  g.fillStyle(OBS.edge, 0.6); g.fillRect(x - w / 2, y - 18 * s, 2.5 * s, 1.2); g.fillRect(x + w / 2 - 2.5 * s, y - 18 * s, 2.5 * s, 1.2);
}

/**
 * A run of house seats across one row block, from x0 to x1 with the seat fronts on `y`; the
 * riser (the step down to the row in front) is drawn under it. Now and then something has been
 * left on a seat: a jar with a voice in it, a white ribbon, a hymn sheet.
 */
export function seatRow(g: G, x0: number, x1: number, y: number, rng: () => number): void {
  // Riser: the dark vertical face of the tier, with a pale nosing along its top.
  g.fillStyle(OBS.glass, 1); g.fillRect(x0 - 6, y, x1 - x0 + 12, 14);
  g.fillStyle(OBS.sheen, 1); g.fillRect(x0 - 6, y, x1 - x0 + 12, 2);
  g.lineStyle(1, OBS.edge, 0.4); g.lineBetween(x0 - 6, y + 2, x1 + 6, y + 2);
  // A thin rose stripe of light along the riser: the house lights, left on for nobody.
  for (let x = x0 + 14; x < x1; x += 46) { g.fillStyle(VOICE, 0.35); g.fillCircle(x, y + 8, 1.4); }
  const n = Math.floor((x1 - x0) / 26);
  for (let i = 0; i < n; i++) {
    const x = x0 + 13 + i * ((x1 - x0) / n);
    houseSeat(g, x, y, 1);
    const r = rng();
    if (r < 0.07) voiceJar(g, x, y - 13, 12, { glow: 0.4 + rng() * 0.5, label: false });
    else if (r < 0.13) ribbon(g, x, y - 16, 5, 0.95, (rng() - 0.5) * 3);
    else if (r < 0.19) hymnSheet(g, x, y - 10, 5, (rng() - 0.5) * 0.8, 0.9);
  }
}

/** An element's sigil, inlaid in voice-light on a seat's back (each Choir councilor has one). */
export function sigil(g: G, el: string, x: number, y: number, s: number, color = VOICE, alpha = 1): void {
  g.lineStyle(Math.max(1.2, s * 0.14), color, alpha);
  g.fillStyle(color, alpha);
  switch (el) {
    case 'sound': {
      // A drum major's baton crossed over a beamed pair of notes.
      g.fillEllipse(x - s * 0.45, y + s * 0.5, s * 0.5, s * 0.36);
      g.fillEllipse(x + s * 0.35, y + s * 0.38, s * 0.5, s * 0.36);
      g.lineBetween(x - s * 0.22, y + s * 0.5, x - s * 0.22, y - s * 0.5);
      g.lineBetween(x + s * 0.58, y + s * 0.38, x + s * 0.58, y - s * 0.62);
      g.lineBetween(x - s * 0.22, y - s * 0.5, x + s * 0.58, y - s * 0.62);
      g.lineBetween(x - s * 0.9, y - s * 0.9, x + s * 0.9, y + s * 0.9);
      g.fillCircle(x - s * 0.9, y - s * 0.9, s * 0.16);
      break;
    }
    case 'echo': {
      // Three arcs going out, and three coming back smaller.
      for (let i = 1; i <= 3; i++) { g.beginPath(); g.arc(x - s * 0.4, y, s * 0.32 * i, -0.8, 0.8, false); g.strokePath(); }
      for (let i = 1; i <= 2; i++) { g.beginPath(); g.arc(x + s * 0.9, y, s * 0.22 * i, Math.PI - 0.8, Math.PI + 0.8, false); g.strokePath(); }
      g.fillCircle(x - s * 0.4, y, s * 0.14);
      break;
    }
    case 'silence': {
      // A mouth stitched shut.
      g.beginPath(); g.arc(x, y - s * 0.3, s * 0.8, 0.35, Math.PI - 0.35, false); g.strokePath();
      for (let i = -2; i <= 2; i++) g.lineBetween(x + i * s * 0.28, y + s * 0.12, x + i * s * 0.28 + s * 0.08, y + s * 0.62);
      break;
    }
    case 'illusion': {
      // A domino mask with one eye open, one closed.
      g.fillPoints([pt(x - s, y - s * 0.2), pt(x, y - s * 0.4), pt(x + s, y - s * 0.2), pt(x + s * 0.8, y + s * 0.4), pt(x, y + s * 0.15), pt(x - s * 0.8, y + s * 0.4)], true);
      g.fillStyle(OBS.glass, 1); g.fillEllipse(x - s * 0.45, y, s * 0.4, s * 0.24);
      g.lineStyle(Math.max(1, s * 0.1), OBS.glass, 1); g.lineBetween(x + s * 0.25, y, x + s * 0.65, y);
      break;
    }
    case 'passion': {
      // A mitre with a flame for a jewel.
      g.strokePoints([pt(x - s * 0.6, y + s * 0.8), pt(x - s * 0.6, y - s * 0.2), pt(x, y - s), pt(x + s * 0.6, y - s * 0.2), pt(x + s * 0.6, y + s * 0.8)], false);
      g.lineBetween(x - s * 0.6, y + s * 0.8, x + s * 0.6, y + s * 0.8);
      g.fillTriangle(x - s * 0.18, y + s * 0.3, x + s * 0.18, y + s * 0.3, x, y - s * 0.35);
      break;
    }
    case 'paper': {
      // A folded page with a quill across it.
      g.strokePoints([pt(x - s * 0.7, y - s * 0.8), pt(x + s * 0.4, y - s * 0.8), pt(x + s * 0.7, y - s * 0.5), pt(x + s * 0.7, y + s * 0.8), pt(x - s * 0.7, y + s * 0.8)], true);
      g.lineBetween(x + s * 0.4, y - s * 0.8, x + s * 0.4, y - s * 0.5);
      g.lineBetween(x + s * 0.4, y - s * 0.5, x + s * 0.7, y - s * 0.5);
      g.lineBetween(x - s * 0.9, y + s * 1.0, x + s * 0.9, y - s * 1.1);
      g.fillTriangle(x + s * 0.9, y - s * 1.1, x + s * 0.3, y - s * 0.3, x + s * 0.6, y - s * 0.2);
      break;
    }
    default: g.strokeCircle(x, y, s * 0.7);
  }
}

/**
 * A councilor's seat: a tall obsidian chair on a stepped plinth, its back three shards high, its
 * element's sigil inlaid in voice-light, an empty mask-niche at the top (the mask is on the
 * councilor) and a single jar on the arm — the voice they kept for themselves. `x, y` is the foot
 * of the plinth.
 */
export function councilSeat(g: G, x: number, y: number, el: string, rng: () => number): void {
  g.fillStyle(0x000000, 0.45); g.fillEllipse(x, y + 4, 118, 26);
  // Plinth: two steps.
  slab(g, x, y, 104, 18, rng, 1);
  slab(g, x, y - 18, 84, 16, rng, 0);
  const sy = y - 34;
  // The back: three shards, the middle one tallest.
  shard(g, x - 26, sy - 30, 28, 96, -6, 0.15);
  shard(g, x + 26, sy - 30, 28, 102, 6, 0.15);
  shard(g, x, sy - 30, 40, 150, 0, 0.32);
  // The back panel behind the seat, with the sigil.
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 24, sy - 92, 48, 64);
  g.fillStyle(OBS.facet, 0.8); g.fillTriangle(x - 24, sy - 92, x + 6, sy - 92, x - 24, sy - 50);
  g.lineStyle(1.1, OBS.edge, 0.5); g.strokeRect(x - 24, sy - 92, 48, 64);
  g.fillStyle(VOICE, 0.08); g.fillCircle(x, sy - 60, 22);
  sigil(g, el, x, sy - 60, 11, VOICE, 0.95);
  // The niche at the head, where the mask hangs when the councilor sleeps.
  g.fillStyle(0x05040a, 1); g.fillEllipse(x, sy - 128, 18, 26);
  g.lineStyle(1, OBS.seam, 0.6); g.strokeEllipse(x, sy - 128, 18, 26);
  // Arms and seat.
  slab(g, x - 30, sy, 14, 34);
  slab(g, x + 30, sy, 14, 34);
  slab(g, x, sy, 48, 18);
  // A kept voice on the right arm.
  voiceJar(g, x + 30, sy - 34, 15, { glow: 0.9, label: true });
  // A seam up the tall shard.
  seam(g, [{ x: x - 1, y: sy - 96 }, { x: x + 4, y: sy - 120 }, { x: x - 3, y: sy - 150 }, { x: x + 1, y: sy - 178 }], 1.2, 0.7, 0.2);
}

/** A councilor's mask turned `turn` (−1 profile left … 0 face-on … 1 profile right) — squashed, not rotated. */
export function turningMask(g: G, x: number, y: number, s: number, turn: number, o: { slit?: number; glow?: number } = {}): void {
  const k = Math.max(0.12, Math.cos(turn * Math.PI / 2));
  // Draw face-on then let the caller see it squashed: Graphics has no scale, so fake the turn by
  // drawing a narrower mask (the kite is ~1.25·s wide) and sliding it toward the side it faces.
  const dx = turn * s * 0.35;
  if (k > 0.85) { councilMask(g, x + dx, y, s, { slit: o.slit, glow: o.glow }); return; }
  const w = s * 0.62 * k;
  const pts = [
    pt(x + dx - w * 0.55, y - s), pt(x + dx, y - s * 1.06), pt(x + dx + w * 0.55, y - s),
    pt(x + dx + w, y - s * 0.28), pt(x + dx + w * 0.62, y + s * 0.5), pt(x + dx, y + s),
    pt(x + dx - w * 0.62, y + s * 0.5), pt(x + dx - w, y - s * 0.28),
  ];
  g.fillStyle(OBS.glass, 1); g.fillPoints(pts, true);
  g.fillStyle(OBS.facet, 1); g.fillPoints([pts[1], pts[2], pts[3], pts[4], pts[5]], true);
  g.lineStyle(Math.max(1, s * 0.05), OBS.edge, 0.7); g.strokePoints(pts, true);
  // The slit seen edge-on: a short bright dash on the side it faces.
  const sy = y - s * 0.18;
  g.fillStyle(o.slit ?? OBS.seam, 0.9);
  g.fillRect(x + dx - w * 0.6, sy - s * 0.04, w * 1.2, s * 0.08);
}

/**
 * The magician's cabinet: a tall box of black glass on a dais, a painted mask on each door.
 * `open` 0 shut … 1 flung wide; `rattle` shakes it (px). `x, y` the foot of the dais.
 */
export function cabinet(g: G, x: number, y: number, open: number, rattle: number, eyes: number, t: number): void {
  const jx = rattle ? Math.sin(t * 0.09) * rattle : 0;
  const w = 66, h = 112;
  g.fillStyle(0x000000, 0.4); g.fillEllipse(x, y + 4, w * 1.6, 22);
  // Dais.
  g.fillStyle(OBS.glass, 1); g.fillEllipse(x, y, w * 1.4, 22);
  g.fillStyle(OBS.facet, 1); g.fillEllipse(x, y - 3, w * 1.3, 16);
  g.lineStyle(1, OBS.edge, 0.5); g.strokeEllipse(x, y - 3, w * 1.3, 16);
  const x0 = x - w / 2 + jx, top = y - h - 6;
  // Body and the dark inside.
  g.fillStyle(OBS.glass, 1); g.fillRect(x0 - 4, top - 10, w + 8, h + 10);
  g.fillStyle(0x040309, 1); g.fillRect(x0 + 4, top, w - 8, h - 4);
  // Crest: a pediment with a little star cut out of it.
  g.fillStyle(OBS.facet, 1); g.fillTriangle(x0 - 8, top - 10, x0 + w + 8, top - 10, x0 + w / 2, top - 34);
  g.lineStyle(1.2, OBS.edge, 0.6); g.strokeTriangle(x0 - 8, top - 10, x0 + w + 8, top - 10, x0 + w / 2, top - 34);
  g.fillStyle(VOICE, 0.8); g.fillCircle(x0 + w / 2, top - 20, 3);
  // Doors: each swings out (drawn narrower as it opens), a half-mask painted on it.
  const dw = (w - 8) / 2;
  const swing = 1 - open * 0.82;
  for (const side of [-1, 1]) {
    const hingeX = side < 0 ? x0 + 4 : x0 + w - 4;
    const dx = hingeX - side * dw * swing;
    const lx = Math.min(hingeX, dx), rx = Math.max(hingeX, dx);
    g.fillStyle(OBS.facet, 1); g.fillRect(lx, top, Math.max(2, rx - lx), h - 4);
    g.fillStyle(OBS.sheen, 0.5); g.fillRect(lx, top, Math.max(1, (rx - lx) * 0.3), h - 4);
    g.lineStyle(1, OBS.edge, 0.55); g.strokeRect(lx, top, Math.max(2, rx - lx), h - 4);
    if (swing > 0.35) {
      // The painted mask: Comedy on the left door, Tragedy on the right — rose eyes.
      const mx = (lx + rx) / 2, my = top + h * 0.34;
      const mw = (rx - lx) * 0.7;
      g.fillStyle(SILK, 0.85); g.fillEllipse(mx, my, mw, 30);
      g.fillStyle(INK, 1); g.fillEllipse(mx - mw * 0.2, my - 3, mw * 0.18, 6); g.fillEllipse(mx + mw * 0.2, my - 3, mw * 0.18, 6);
      g.lineStyle(1.4, INK, 1);
      g.beginPath();
      if (side < 0) g.arc(mx, my + 2, mw * 0.22, 0.3, Math.PI - 0.3, false);
      else g.arc(mx, my + 14, mw * 0.22, Math.PI + 0.3, -0.3, false);
      g.strokePath();
      if (eyes > 0) {
        g.fillStyle(VOICE, eyes); g.fillEllipse(mx - mw * 0.2, my - 3, mw * 0.14, 4); g.fillEllipse(mx + mw * 0.2, my - 3, mw * 0.14, 4);
      }
    }
    // Brass-less, glass knob.
    g.fillStyle(OBS.edge, 0.9); g.fillCircle(side < 0 ? rx - 4 : lx + 4, top + h * 0.6, 2);
  }
  // Stars painted down the frame.
  for (let i = 0; i < 4; i++) { g.fillStyle(OBS.seamLit, 0.5); g.fillCircle(x0 - 1, top + 12 + i * 26, 1.3); g.fillCircle(x0 + w + 1, top + 12 + i * 26, 1.3); }
}

/**
 * The Great Censer seen from above: a pierced black-glass thurible on its chains, the holes
 * glowing with burning voice-incense. `heat` 0–1 how hard it is swinging.
 */
export function censer(g: G, x: number, y: number, r: number, t: number, heat: number): void {
  g.fillStyle(VOICE, 0.06 + heat * 0.08); g.fillCircle(x, y, r * 2.2);
  g.fillStyle(VOICE, 0.1 + heat * 0.1); g.fillCircle(x, y, r * 1.45);
  // The bowl.
  g.fillStyle(OBS.glass, 1); g.fillCircle(x, y, r);
  g.fillStyle(OBS.facet, 1); g.fillCircle(x - r * 0.12, y - r * 0.12, r * 0.82);
  g.lineStyle(1.6, OBS.edge, 0.75); g.strokeCircle(x, y, r);
  // Pierced work: two rings of holes, every one an ember.
  for (let ring = 0; ring < 2; ring++) {
    const rr = r * (0.42 + ring * 0.3);
    const n = 6 + ring * 4;
    for (let i = 0; i < n; i++) {
      const a = t * (ring ? 0.8 : -1.2) + (i / n) * Math.PI * 2;
      const flick = 0.6 + 0.4 * Math.sin(t * 9 + i * 2.1 + ring);
      g.fillStyle(VOICE, 0.7 * flick); g.fillCircle(x + Math.cos(a) * rr, y + Math.sin(a) * rr, r * 0.09);
      g.fillStyle(VOICE_LIT, 0.9 * flick); g.fillCircle(x + Math.cos(a) * rr, y + Math.sin(a) * rr, r * 0.04);
    }
  }
  // The lid's crown and the three chain-eyes.
  g.fillStyle(OBS.sheen, 1); g.fillCircle(x, y, r * 0.2);
  g.fillStyle(VOICE_LIT, 0.9); g.fillCircle(x, y, r * 0.08);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    g.fillStyle(OBS.edge, 1); g.fillCircle(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92, r * 0.08);
  }
}

/**
 * The tiny stroke alphabet the Fair Copy decree prints in (Graphics has no text). Each letter is
 * polylines in a unit box, y down.
 */
const FONT: Record<string, number[][][]> = {
  A: [[[0, 1], [0.5, 0], [1, 1]], [[0.22, 0.6], [0.78, 0.6]]],
  K: [[[0, 0], [0, 1]], [[1, 0], [0, 0.56]], [[0.3, 0.38], [1, 1]]],
  N: [[[0, 1], [0, 0], [1, 1], [1, 0]]],
  E: [[[1, 0], [0, 0], [0, 1], [1, 1]], [[0, 0.5], [0.75, 0.5]]],
  L: [[[0, 0], [0, 1], [1, 1]]],
  H: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]],
  U: [[[0, 0], [0, 0.75], [0.15, 0.95], [0.5, 1], [0.85, 0.95], [1, 0.75], [1, 0]]],
  S: [[[1, 0.12], [0.8, 0], [0.2, 0], [0, 0.15], [0, 0.35], [0.2, 0.5], [0.8, 0.5], [1, 0.65], [1, 0.85], [0.8, 1], [0.2, 1], [0, 0.88]]],
  F: [[[1, 0], [0, 0], [0, 1]], [[0, 0.5], [0.7, 0.5]]],
  I: [[[0.5, 0], [0.5, 1]], [[0.2, 0], [0.8, 0]], [[0.2, 1], [0.8, 1]]],
  O: [[[0.5, 0], [0.85, 0.12], [1, 0.5], [0.85, 0.88], [0.5, 1], [0.15, 0.88], [0, 0.5], [0.15, 0.12], [0.5, 0]]],
  B: [[[0, 0], [0, 1], [0.75, 1], [1, 0.85], [1, 0.65], [0.75, 0.5], [0, 0.5]], [[0, 0], [0.7, 0], [0.9, 0.12], [0.9, 0.38], [0.7, 0.5]]],
  Y: [[[0, 0], [0.5, 0.5], [1, 0]], [[0.5, 0.5], [0.5, 1]]],
  G: [[[1, 0.15], [0.8, 0], [0.2, 0], [0, 0.2], [0, 0.8], [0.2, 1], [0.8, 1], [1, 0.8], [1, 0.55], [0.55, 0.55]]],
};

/** Print one capital centred on `x, y`, `h` tall. Unknown letters print as a blot. */
export function letter(g: G, ch: string, x: number, y: number, h: number, lw: number, color: number, alpha = 1): void {
  const strokes = FONT[ch];
  const w = h * 0.68;
  if (!strokes) { g.fillStyle(color, alpha); g.fillCircle(x, y, h * 0.3); return; }
  g.lineStyle(lw, color, alpha);
  for (const s of strokes) {
    g.beginPath();
    g.moveTo(x - w / 2 + s[0][0] * w, y - h / 2 + s[0][1] * h);
    for (let i = 1; i < s.length; i++) g.lineTo(x - w / 2 + s[i][0] * w, y - h / 2 + s[i][1] * h);
    g.strokePath();
  }
}

/** A word in the stroke alphabet, centred. */
export function word(g: G, text: string, x: number, y: number, h: number, lw: number, color: number, alpha = 1, colorOf?: (i: number) => number): void {
  const step = h * 0.95;
  const x0 = x - ((text.length - 1) * step) / 2;
  for (let i = 0; i < text.length; i++) letter(g, text[i], x0 + i * step, y, h, lw, colorOf ? colorOf(i) : color, alpha);
}

export { OBS, councilMask, seam, shard, slab, mixC, lit, dim };
export type { P };
