import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Memory's look: a gentleman in a dark coat and a tall top hat with a red band, white gloves,
 * and a long black cane with a silver knob — and where the face should be, nothing but static.
 * Its shards are obsidian, glassy black with a violet sheen, and grow thin black legs when they
 * bite. Its beams are static; Rebirth is pure white; Repression is grey, Trauma is red.
 *
 * Every painter takes a `ColorFn` so a skin can recolour it, and the previews call the same ones.
 */

export const MEMORY = {
  ink: 0x0d0b12,
  coat: 0x1e1b26,
  coatLit: 0x3a3548,
  slate: 0x4a4458,
  band: 0x7a1f2b,
  bandLit: 0xb0324a,
  glove: 0xeceaf2,
  gloveShade: 0x9c98ab,
  silver: 0xc9c6d6,
  silverLit: 0xffffff,
  staticHi: 0xeeecf6,
  staticMid: 0x8d8a99,
  staticLo: 0x2a2833,
  obsidian: 0x15121c,
  obsidianEdge: 0x5d527a,
  obsidianSheen: 0xb9a8ff,
  beam: 0xf4f2ff,
  beamGlow: 0x9e98c2,
  white: 0xffffff,
  grey: 0x9a97a6,
  greyDark: 0x55525f,
  red: 0xd0213a,
  redHot: 0xff5a6e,
  redDark: 0x5a0d1a,
};

export type MemoryColorFn = ColorFn;

/** The three tones a block of static is made of. Plain static is grey; Salt in the Wound's is red. */
export interface StaticPalette { lo: number; mid: number; hi: number }
export const GREY_STATIC: StaticPalette = { lo: MEMORY.staticLo, mid: MEMORY.staticMid, hi: MEMORY.staticHi };
export const RED_STATIC: StaticPalette = { lo: MEMORY.redDark, mid: MEMORY.red, hi: MEMORY.redHot };

/** A cheap seeded random, so a static pattern holds still for one flicker and then changes. */
export function seeded(seed: number): () => number {
  let s = Math.floor(Math.abs(seed) * 9301 + 49297) % 233280;
  if (s <= 0) s += 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Static changes 24 times a second — slower than the frame rate, so it reads as a signal, not as noise. */
function flick(t: number, seed: number): number {
  return Math.floor(t * 24) * 7.31 + seed * 13.7;
}

/**
 * A block of television static: a dark ground, a snow of light and mid cells, and a rolling
 * bright bar. `cell` is the grain. Used over health bars, cooldown cards, bodies and the face.
 */
export function staticRect(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, w: number, h: number, t: number, alpha: number, cell = 4, seed = 0,
  pal: StaticPalette = GREY_STATIC,
): void {
  if (alpha <= 0.01 || w <= 0 || h <= 0) return;
  const rnd = seeded(flick(t, seed + x * 0.013 + y * 0.029));
  g.fillStyle(tint(pal.lo), alpha * 0.92);
  g.fillRect(x, y, w, h);
  const cols = Math.max(1, Math.ceil(w / cell));
  const rows = Math.max(1, Math.ceil(h / cell));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = rnd();
      if (v < 0.42) continue;
      const cw = Math.min(cell, w - c * cell);
      const ch = Math.min(cell, h - r * cell);
      g.fillStyle(tint(v > 0.8 ? pal.hi : pal.mid), alpha * (v > 0.8 ? 0.95 : 0.7));
      g.fillRect(x + c * cell, y + r * cell, cw, ch);
    }
  }
  // The rolling bar: a brighter band that climbs the block over and over.
  const barY = y + h - ((t * 0.9 + seed * 0.37) % 1) * (h + 6);
  const by0 = Math.max(y, barY);
  const by1 = Math.min(y + h, barY + Math.max(2, h * 0.18));
  if (by1 > by0) {
    g.fillStyle(tint(pal.hi), alpha * 0.35);
    g.fillRect(x, by0, w, by1 - by0);
  }
}

/** Static in a disc — a body lost in it. */
export function staticDisc(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, t: number, alpha: number, cell = 4, seed = 0,
  pal: StaticPalette = GREY_STATIC,
): void {
  if (alpha <= 0.01 || r <= 0) return;
  const rnd = seeded(flick(t, seed + 3.1));
  g.fillStyle(tint(pal.lo), alpha * 0.9);
  g.fillCircle(x, y, r);
  const n = Math.ceil((2 * r) / cell);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const cx = x - r + i * cell + cell / 2;
      const cy = y - r + j * cell + cell / 2;
      if ((cx - x) * (cx - x) + (cy - y) * (cy - y) > (r - cell * 0.4) * (r - cell * 0.4)) continue;
      const v = rnd();
      if (v < 0.45) continue;
      g.fillStyle(tint(v > 0.82 ? pal.hi : pal.mid), alpha * (v > 0.82 ? 0.9 : 0.65));
      g.fillRect(cx - cell / 2, cy - cell / 2, cell, cell);
    }
  }
  // Horizontal tear lines, the way a bad signal shears.
  for (let k = 0; k < 2; k++) {
    const ty = y - r + ((t * (0.7 + k * 0.45) + k * 0.5 + seed * 0.1) % 1) * 2 * r;
    const half = Math.sqrt(Math.max(0, r * r - (ty - y) * (ty - y)));
    g.fillStyle(tint(pal.hi), alpha * 0.4);
    g.fillRect(x - half, ty, half * 2, 1.6);
  }
}

/**
 * An obsidian shard: a long, glassy black blade — a needle tip forward, a broad blunt back edge —
 * with a violet sheen down one face. `ang` points the tip.
 */
export function shardBody(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, ang: number, scale: number, alpha: number,
): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const P = (fx: number, fy: number) => ({ x: x + (c * fx - s * fy) * scale, y: y + (s * fx + c * fy) * scale });
  const tip = P(13, 0);
  const shoulderL = P(-2, -4.5);
  const backL = P(-8, -3.5);
  const backR = P(-8, 3.5);
  const shoulderR = P(-2, 4.5);
  g.fillStyle(tint(MEMORY.obsidianSheen), alpha * 0.18);
  g.fillCircle(x, y, 9 * scale);
  g.fillStyle(tint(MEMORY.obsidian), alpha);
  g.fillPoints([tip, shoulderL, backL, backR, shoulderR], true);
  // The lit face, a thin facet down the spine.
  g.fillStyle(tint(MEMORY.obsidianEdge), alpha * 0.95);
  g.fillPoints([tip, shoulderL, P(-6, -1), P(0, 0)], true);
  g.lineStyle(1, tint(MEMORY.obsidianSheen), alpha * 0.85);
  g.lineBetween(tip.x, tip.y, shoulderL.x, shoulderL.y);
  g.lineStyle(1.2, tint(MEMORY.ink), alpha);
  g.lineBetween(backL.x, backL.y, backR.x, backR.y);
}

/**
 * A shard latched into a body: the tip buried at the body's rim, and three pairs of thin jointed
 * legs out of the blunt end, bent down into the flesh. `ang` is the direction from the body's
 * centre out to the shard; `t` makes the legs flex.
 */
export function latchedShard(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, cx: number, cy: number, bodyR: number, ang: number, t: number, alpha: number,
): void {
  const ox = cx + Math.cos(ang) * (bodyR + 5);
  const oy = cy + Math.sin(ang) * (bodyR + 5);
  const inward = ang + Math.PI;
  // Legs first, so the shard sits over their roots.
  const back = { x: ox + Math.cos(ang) * 6, y: oy + Math.sin(ang) * 6 };
  for (let i = 0; i < 3; i++) {
    for (const side of [-1, 1]) {
      const spread = (0.55 + i * 0.42) * side;
      const flex = 0.12 * Math.sin(t * 9 + i * 1.7 + side);
      const kneeA = ang + spread + flex;
      const knee = { x: back.x + Math.cos(kneeA) * 7, y: back.y + Math.sin(kneeA) * 7 };
      const footA = inward + side * (0.5 + i * 0.25);
      const foot = { x: knee.x + Math.cos(footA) * (7 + i * 1.5), y: knee.y + Math.sin(footA) * (7 + i * 1.5) };
      g.lineStyle(1.3, tint(MEMORY.ink), alpha);
      g.lineBetween(back.x, back.y, knee.x, knee.y);
      g.lineBetween(knee.x, knee.y, foot.x, foot.y);
      g.fillStyle(tint(MEMORY.obsidianSheen), alpha * 0.7);
      g.fillCircle(knee.x, knee.y, 0.9);
    }
  }
  shardBody(g, tint, ox, oy, inward, 0.85, alpha);
}

/** A beam of static from (x0,y0) to (x1,y1): a grey-violet glow, a jagged crackling core, and snow along it. */
export function staticBeam(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x0: number, y0: number, x1: number, y1: number, width: number, t: number, alpha: number, seed = 0,
): void {
  if (alpha <= 0.01) return;
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 1) return;
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  const nx = -uy;
  const ny = ux;
  g.lineStyle(width * 1.6, tint(MEMORY.beamGlow), alpha * 0.22);
  g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(width, tint(MEMORY.staticLo), alpha * 0.55);
  g.lineBetween(x0, y0, x1, y1);
  const rnd = seeded(flick(t, seed));
  // The jagged core.
  const segs = Math.max(4, Math.floor(len / 18));
  g.lineStyle(Math.max(1.5, width * 0.22), tint(MEMORY.beam), alpha);
  g.beginPath();
  g.moveTo(x0, y0);
  for (let i = 1; i < segs; i++) {
    const k = i / segs;
    const j = (rnd() - 0.5) * width * 0.55;
    g.lineTo(x0 + ux * len * k + nx * j, y0 + uy * len * k + ny * j);
  }
  g.lineTo(x1, y1);
  g.strokePath();
  // Snow riding the beam.
  const flakes = Math.floor(len / 9);
  for (let i = 0; i < flakes; i++) {
    const k = rnd();
    const j = (rnd() - 0.5) * width;
    const v = rnd();
    g.fillStyle(tint(v > 0.6 ? MEMORY.staticHi : MEMORY.staticMid), alpha * 0.85);
    g.fillRect(x0 + ux * len * k + nx * j - 1.5, y0 + uy * len * k + ny * j - 1.5, 3, 3);
  }
}

/** A white beam: a soft halo, a bright body, a white-hot core. */
export function whiteBeam(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x0: number, y0: number, x1: number, y1: number, width: number, alpha: number,
): void {
  if (alpha <= 0.01) return;
  g.lineStyle(width * 1.9, tint(MEMORY.beamGlow), alpha * 0.2);
  g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(width, tint(MEMORY.beam), alpha * 0.8);
  g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(width * 0.4, tint(MEMORY.white), alpha);
  g.lineBetween(x0, y0, x1, y1);
}

/** Rebirth's aim: a thin white line wall to wall, its pivot ringed, faint motion ghosts trailing the sweep. */
export function rebirthLine(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  px: number, py: number, ends: { x0: number; y0: number; x1: number; y1: number },
  trail: { x0: number; y0: number; x1: number; y1: number }[], t: number, alpha: number,
): void {
  trail.forEach((e, i) => {
    g.lineStyle(1, tint(MEMORY.white), alpha * 0.12 * (i + 1) / (trail.length + 1));
    g.lineBetween(e.x0, e.y0, e.x1, e.y1);
  });
  g.lineStyle(4, tint(MEMORY.beamGlow), alpha * 0.25);
  g.lineBetween(ends.x0, ends.y0, ends.x1, ends.y1);
  g.lineStyle(1.6, tint(MEMORY.white), alpha * (0.85 + 0.15 * Math.sin(t * 20)));
  g.lineBetween(ends.x0, ends.y0, ends.x1, ends.y1);
  g.lineStyle(1.4, tint(MEMORY.white), alpha);
  g.strokeCircle(px, py, 6 + Math.sin(t * 8));
  g.fillStyle(tint(MEMORY.white), alpha);
  g.fillCircle(px, py, 1.8);
}

/** Repression's grey aura: slow grey rings breathing out, flecks of static drifting in. */
export function greyAura(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, t: number, alpha: number): void {
  g.fillStyle(tint(MEMORY.greyDark), alpha * 0.18);
  g.fillCircle(x, y, r);
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.45 + i / 3) % 1;
    g.lineStyle(2, tint(MEMORY.grey), alpha * (1 - k) * 0.55);
    g.strokeCircle(x, y, r * (0.4 + 0.6 * k));
  }
  const rnd = seeded(flick(t, 5));
  for (let i = 0; i < 10; i++) {
    const a = rnd() * TAU;
    const d = r * (0.3 + rnd() * 0.7);
    g.fillStyle(tint(rnd() > 0.5 ? MEMORY.staticHi : MEMORY.grey), alpha * 0.6);
    g.fillRect(x + Math.cos(a) * d - 1.5, y + Math.sin(a) * d - 1.5, 3, 3);
  }
}

/** Trauma's red aura: a hard red pulse with a dark heart, beating faster as the window closes. */
export function redAura(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, t: number, k: number, alpha: number): void {
  const beat = Math.pow(Math.abs(Math.sin(t * (4 + 6 * k))), 6);
  g.fillStyle(tint(MEMORY.redDark), alpha * 0.25);
  g.fillCircle(x, y, r);
  g.fillStyle(tint(MEMORY.red), alpha * (0.12 + 0.2 * beat));
  g.fillCircle(x, y, r * (0.75 + 0.15 * beat));
  g.lineStyle(2.5, tint(MEMORY.redHot), alpha * (0.4 + 0.5 * beat));
  g.strokeCircle(x, y, r * (0.9 + 0.1 * beat));
}

/** The wound Trauma leaves: a red crack glyph over the victim's head that throbs once a second. */
export function woundMark(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, t: number, alpha: number): void {
  const beat = Math.pow(1 - (t % 1), 3);
  g.lineStyle(2 + beat * 1.5, tint(MEMORY.red), alpha * (0.55 + 0.45 * beat));
  g.beginPath();
  g.moveTo(x - 7, y - 5);
  g.lineTo(x - 2, y);
  g.lineTo(x - 4, y + 3);
  g.lineTo(x + 3, y + 7);
  g.strokePath();
  g.lineStyle(1, tint(MEMORY.redHot), alpha * beat);
  g.strokeCircle(x, y + 1, 9 + beat * 4);
}

/**
 * Repression's echo: a static copy of a fighter. A disc of static in the copied element's colour,
 * a ring of their colour, and two hollow white eyes looking where it aims.
 */
export function staticEcho(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, color: number, aim: number, t: number, alpha: number,
): void {
  g.fillStyle(color, alpha * 0.28);
  g.fillCircle(x, y, r + 6);
  staticDisc(g, tint, x, y, r, t, alpha * 0.85, 4, 11);
  g.fillStyle(color, alpha * 0.35);
  g.fillCircle(x, y, r);
  g.lineStyle(2, color, alpha * 0.9);
  g.strokeCircle(x, y, r);
  // Horizontal jitter: every so often the whole copy slips sideways a few pixels.
  const slip = Math.sin(t * 37) > 0.93 ? 4 : 0;
  for (const side of [-1, 1]) {
    const ex = x + slip + side * 7 + Math.cos(aim) * 2.5;
    const ey = y - 4 + Math.sin(aim) * 2;
    g.fillStyle(tint(MEMORY.white), alpha * 0.9);
    g.fillEllipse(ex, ey, 6, 3.4);
  }
}

// ── Salt in the Wound (Q+) ───────────────────────────────────────────────────

/** The arena's edge buried in red static: four bands along the walls, ragged on their inner side. */
export function saltBorder(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  left: number, top: number, w: number, h: number, band: number, t: number, alpha: number,
): void {
  if (alpha <= 0.01) return;
  const cell = 8;
  staticRect(g, tint, left, top, w, band, t, alpha, cell, 61, RED_STATIC);
  staticRect(g, tint, left, top + h - band, w, band, t, alpha, cell, 62, RED_STATIC);
  staticRect(g, tint, left, top + band, band, h - band * 2, t, alpha, cell, 63, RED_STATIC);
  staticRect(g, tint, left + w - band, top + band, band, h - band * 2, t, alpha, cell, 64, RED_STATIC);
  // The inner edge frays: torn red blocks reaching a little way into the floor.
  const rnd = seeded(flick(t, 71));
  const tear = (x: number, y: number, tw: number, th: number): void => {
    g.fillStyle(tint(rnd() > 0.5 ? MEMORY.red : MEMORY.redDark), alpha * 0.6);
    g.fillRect(x, y, tw, th);
  };
  for (let x = left + band; x < left + w - band; x += cell * 2) {
    if (rnd() > 0.55) tear(x, top + band, cell, cell * (1 + Math.floor(rnd() * 2)));
    if (rnd() > 0.55) { const d = cell * (1 + Math.floor(rnd() * 2)); tear(x, top + h - band - d, cell, d); }
  }
  for (let y = top + band; y < top + h - band; y += cell * 2) {
    if (rnd() > 0.55) tear(left + band, y, cell * (1 + Math.floor(rnd() * 2)), cell);
    if (rnd() > 0.55) { const d = cell * (1 + Math.floor(rnd() * 2)); tear(left + w - band - d, y, d, cell); }
  }
  g.lineStyle(2, tint(MEMORY.redHot), alpha * 0.5);
  g.strokeRect(left + band, top + band, w - band * 2, h - band * 2);
}

/**
 * A phantom: a corrupted element standing in the static. A red-static body with a ring of the
 * element it used to be, broken into arcs that slip out of place; hollow white eyes on its
 * target; one glove pulled back to throw (`throwK` 0→1 over the throw).
 */
export function saltPhantom(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, color: number, aim: number, t: number, alpha: number, throwK: number, seed: number,
): void {
  if (alpha <= 0.01) return;
  const r = 17;
  // The body wavers: every so often the whole phantom tears sideways.
  const slip = Math.sin(t * 29 + seed * 3) > 0.9 ? (Math.sin(seed * 7) > 0 ? 5 : -5) : 0;
  const bx = x + slip;
  g.fillStyle(tint(MEMORY.redDark), alpha * 0.35);
  g.fillCircle(bx, y, r + 7);
  staticDisc(g, tint, bx, y, r, t, alpha * 0.95, 4, 40 + seed, RED_STATIC);
  // What is left of its element: arcs of its colour, each a little out of place.
  const rnd = seeded(flick(t, 80 + seed));
  for (let i = 0; i < 4; i++) {
    const a0 = (i / 4) * TAU + t * 1.3 + seed;
    const off = (rnd() - 0.5) * 6;
    g.lineStyle(3, color, alpha * (0.55 + rnd() * 0.4));
    g.beginPath();
    g.arc(bx + off, y + (rnd() - 0.5) * 3, r + 2, a0, a0 + 1.0, false);
    g.strokePath();
  }
  // Hollow eyes.
  for (const side of [-1, 1]) {
    const ex = bx + side * 6 + Math.cos(aim) * 2.5;
    const ey = y - 4 + Math.sin(aim) * 2;
    g.fillStyle(tint(MEMORY.white), alpha * 0.92);
    g.fillEllipse(ex, ey, 6, 3.6);
    g.fillStyle(tint(MEMORY.redDark), alpha);
    g.fillCircle(ex + Math.cos(aim), ey, 1.1);
  }
  // The throwing glove: back over the shoulder, then whipped forward.
  const k = Phaser.Math.Clamp(throwK, 0, 1);
  const reach = k < 0.4 ? -10 * (k / 0.4) : -10 + 34 * easeOut((k - 0.4) / 0.6);
  const hx = bx + Math.cos(aim + 0.6) * 12 + Math.cos(aim) * (k > 0 ? reach : 4);
  const hy = y + Math.sin(aim + 0.6) * 12 + Math.sin(aim) * (k > 0 ? reach : 4);
  g.fillStyle(tint(MEMORY.redDark), alpha);
  g.fillCircle(hx, hy, 6);
  g.fillStyle(tint(MEMORY.red), alpha);
  g.fillCircle(hx, hy, 4.6);
  if (k > 0 && k < 0.45) {
    // The ball, forming in the glove.
    staticDisc(g, tint, hx, hy, 5 + k * 6, t, alpha, 2, 90 + seed, RED_STATIC);
  }
}

/** A speech bubble with nothing to say: a white outline, a tail, and red static where the words go. */
export function staticBubble(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, w: number, h: number, tailX: number, tailY: number, t: number, alpha: number, seed: number,
): void {
  if (alpha <= 0.01) return;
  g.fillStyle(tint(MEMORY.ink), alpha * 0.9);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
  // The tail, pointing back at whoever is speaking.
  const bx = Phaser.Math.Clamp(tailX, x - w / 2 + 8, x + w / 2 - 8);
  const by = tailY > y ? y + h / 2 : y - h / 2;
  g.fillTriangle(bx - 6, by, bx + 6, by, tailX, tailY);
  staticRect(g, tint, x - w / 2 + 4, y - h / 2 + 4, w - 8, h - 8, t, alpha, 3, seed, RED_STATIC);
  g.lineStyle(2, tint(MEMORY.white), alpha * 0.95);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
  g.lineBetween(bx - 6, by, tailX, tailY);
  g.lineBetween(bx + 6, by, tailX, tailY);
}

/** A ball of red static, thrown hard: a hot core and a string of afterimages fading behind it. */
export function saltBall(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, trail: ReadonlyArray<{ x: number; y: number }>, r: number, t: number,
): void {
  for (let i = 0; i < trail.length; i++) {
    const k = (i + 1) / (trail.length + 1);
    const p = trail[i];
    g.fillStyle(tint(MEMORY.red), 0.12 + k * 0.22);
    g.fillCircle(p.x, p.y, r * (0.5 + k * 0.5) + 2);
    staticDisc(g, tint, p.x, p.y, r * (0.45 + k * 0.45), t, 0.2 + k * 0.45, 2, 100 + i, RED_STATIC);
  }
  g.fillStyle(tint(MEMORY.red), 0.4);
  g.fillCircle(x, y, r + 5);
  staticDisc(g, tint, x, y, r, t, 1, 2, 120, RED_STATIC);
  g.fillStyle(tint(MEMORY.white), 0.9);
  g.fillCircle(x, y, r * 0.35);
}

// ── Fx ───────────────────────────────────────────────────────────────────────

export class MemoryFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: ColorFn) { super(scene, tint); }

  /** A shard leaves the glove: a dark crack of air and a few glass flecks. */
  shardLaunch(x: number, y: number, ang: number): void {
    this.anim(8.5, 200, (g, t) => {
      for (let i = 0; i < 4; i++) {
        const a = ang + Math.PI + (i - 1.5) * 0.5;
        const d = 4 + easeOut(t) * 14;
        g.fillStyle(this.tint(i % 2 ? MEMORY.obsidianSheen : MEMORY.obsidian), 1 - t);
        g.fillRect(x + Math.cos(a) * d - 1.2, y + Math.sin(a) * d - 1.2, 2.4, 2.4);
      }
      g.lineStyle(2, this.tint(MEMORY.obsidianEdge), (1 - t) * 0.8);
      g.strokeCircle(x, y, 4 + t * 10);
    });
  }

  /** A shard bites: a burst of static and the legs snapping out. */
  shardHit(x: number, y: number): void {
    this.anim(9, 260, (g, t) => {
      staticDisc(g, this.tint, x, y, 6 + easeOut(t) * 10, t * 2, (1 - t) * 0.9, 3, 2);
      g.lineStyle(1.5, this.tint(MEMORY.obsidianSheen), 1 - t);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.3;
        const d0 = 4 + t * 6;
        const d1 = 9 + easeOut(t) * 10;
        g.lineBetween(x + Math.cos(a) * d0, y + Math.sin(a) * d0, x + Math.cos(a) * d1, y + Math.sin(a) * d1);
      }
    });
  }

  /** A latch lets go — the shard crumbles to black glass. */
  shardBreak(x: number, y: number): void {
    this.anim(8.5, 380, (g, t) => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.6;
        const d = easeOut(t) * 14;
        g.fillStyle(this.tint(i % 2 ? MEMORY.obsidianEdge : MEMORY.obsidian), 1 - t);
        g.fillTriangle(
          x + Math.cos(a) * d, y + Math.sin(a) * d + t * 10,
          x + Math.cos(a) * d + 2.5, y + Math.sin(a) * d + 1.5 + t * 10,
          x + Math.cos(a) * d - 1, y + Math.sin(a) * d + 3 + t * 10,
        );
      }
    });
  }

  /** Memory Snatch's main line: the static beam flashes out to the cursor and fades. */
  snatchBeam(x0: number, y0: number, x1: number, y1: number, width: number): void {
    this.anim(8.6, 340, (g, t) => {
      staticBeam(g, this.tint, x0, y0, x1, y1, width * (1 - 0.4 * t), t * 1.5, 1 - easeIn(t), 1);
    });
    this.flashIn(x0, y0, 12, MEMORY.white, MEMORY.beamGlow, 9);
  }

  /** One slice: from the end of the main line, a static blade swinging out from `a0` to `a1`, leaving a fading fan. */
  snatchSlice(ox: number, oy: number, a0: number, a1: number, len: number, sweepMs: number, width: number): void {
    const total = sweepMs + 260;
    this.anim(8.6, total, (g, t) => {
      const ms = t * total;
      const k = Math.min(1, ms / sweepMs);
      const fade = ms <= sweepMs ? 1 : 1 - (ms - sweepMs) / 260;
      const a = a0 + (a1 - a0) * easeOut(k);
      // The swept fan behind the blade.
      g.fillStyle(this.tint(MEMORY.beamGlow), 0.14 * fade);
      g.slice(ox, oy, len, Math.min(a0, a), Math.max(a0, a), false);
      g.fillPath();
      staticBeam(g, this.tint, ox, oy, ox + Math.cos(a) * len, oy + Math.sin(a) * len, width, ms / 600, fade, 3);
    });
  }

  /** Someone caught in the beam: their outline shot through with static. */
  snatchHit(x: number, y: number, main: boolean): void {
    this.anim(9, main ? 420 : 300, (g, t) => {
      staticDisc(g, this.tint, x, y, (main ? 26 : 20) * (1 - 0.3 * t), t * 3, (1 - t) * 0.75, 4, 7);
    });
  }

  /**
   * Stolen time: pale motes, one per second taken, lifted off the victim and drawn into the
   * caster's hat. `to` is read every frame so the motes find a moving caster.
   */
  timeSteal(fx: number, fy: number, to: () => { x: number; y: number }, seconds: number): void {
    const n = Phaser.Math.Clamp(Math.round(seconds), 1, 12);
    this.anim(9.2, 700, (g, t) => {
      const d = to();
      for (let i = 0; i < n; i++) {
        const k = Phaser.Math.Clamp(t * 1.3 - i * 0.04, 0, 1);
        if (k <= 0 || k >= 1) continue;
        const e = easeIn(k);
        const wob = Math.sin(k * Math.PI) * (14 + (i % 3) * 6) * (i % 2 ? 1 : -1);
        const ang = Math.atan2(d.y - fy, d.x - fx) + Math.PI / 2;
        const x = fx + (d.x - fx) * e + Math.cos(ang) * wob;
        const y = fy + (d.y - 30 - fy) * e + Math.sin(ang) * wob;
        g.fillStyle(this.tint(MEMORY.staticHi), 1 - k * 0.5);
        g.fillRect(x - 2, y - 2, 4, 4);
        g.fillStyle(this.tint(MEMORY.beamGlow), 0.4 * (1 - k));
        g.fillCircle(x, y, 5);
      }
    });
  }

  /** Rebirth fires: the thick white beam slams down along the line, wall to wall, and burns out. */
  rebirthBeam(x0: number, y0: number, x1: number, y1: number, width: number): void {
    this.anim(8.7, 520, (g, t) => {
      const w = t < 0.12 ? width * (0.3 + 0.7 * (t / 0.12)) : width * (1 - 0.6 * easeIn((t - 0.12) / 0.88));
      whiteBeam(g, this.tint, x0, y0, x1, y1, w, 1 - easeIn(t));
    });
  }

  /** Rebirth strikes a body: a white flash with a ring that wipes out — something forgotten. */
  rebirthHit(x: number, y: number): void {
    this.anim(9.1, 520, (g, t) => {
      g.fillStyle(this.tint(MEMORY.white), (1 - t) * 0.8);
      g.fillCircle(x, y, 10 + easeOut(t) * 16);
      g.lineStyle(3 * (1 - t) + 0.5, this.tint(MEMORY.white), 1 - t);
      g.strokeCircle(x, y, 18 + easeOut(t) * 34);
    });
  }

  /** Repression's recording begins (or the copy steps out): a grey ring folding in. */
  repressMark(x: number, y: number, inward: boolean): void {
    this.anim(8.4, 480, (g, t) => {
      const k = inward ? 1 - easeOut(t) : easeOut(t);
      g.lineStyle(3, this.tint(MEMORY.grey), 1 - t);
      g.strokeCircle(x, y, 14 + k * 60);
      staticDisc(g, this.tint, x, y, 10 + k * 14, t * 2, (1 - t) * 0.6, 4, 9);
    });
  }

  /** An echoed bolt: a static streak in the copied element's colour. */
  echoBolt(x: number, y: number, ang: number, color: number): void {
    this.anim(8.8, 140, (g, t) => {
      g.fillStyle(color, (1 - t) * 0.5);
      g.fillCircle(x, y, 8 + t * 6);
      g.lineStyle(2, this.tint(MEMORY.staticHi), 1 - t);
      g.lineBetween(x, y, x - Math.cos(ang) * 16, y - Math.sin(ang) * 16);
    });
  }

  /** An echoed blast: a static shockwave in the copied element's colour. */
  echoBurst(x: number, y: number, r: number, color: number): void {
    this.anim(8.8, 420, (g, t) => {
      g.fillStyle(color, (1 - t) * 0.35);
      g.fillCircle(x, y, r * easeOut(t));
      staticDisc(g, this.tint, x, y, Math.max(1, r * 0.55 * easeOut(t)), t * 2, (1 - t) * 0.6, 5, 4);
      g.lineStyle(3, color, 1 - t);
      g.strokeCircle(x, y, r * easeOut(t));
    });
  }

  /** An echoed beam or line: static along the line, edged in the copied element's colour. */
  echoLine(x0: number, y0: number, x1: number, y1: number, width: number, color: number): void {
    this.anim(8.7, 300, (g, t) => {
      g.lineStyle(width * 1.4, color, (1 - t) * 0.4);
      g.lineBetween(x0, y0, x1, y1);
      staticBeam(g, this.tint, x0, y0, x1, y1, width * 0.8, t, (1 - t) * 0.9, 6);
    });
  }

  /** The copy dissolving at the end of its replay. */
  echoFade(x: number, y: number, color: number): void {
    this.anim(8.4, 500, (g, t) => {
      for (let i = 0; i < 8; i++) {
        const yy = y - 22 + i * 6;
        const shift = (i % 2 ? 1 : -1) * easeOut(t) * (10 + i * 3);
        g.fillStyle(i % 3 === 0 ? color : this.tint(MEMORY.staticMid), (1 - t) * 0.8);
        g.fillRect(x - 18 + shift, yy, 36 * (1 - t), 4);
      }
    });
  }

  /** Trauma's window opens: a hard red shock off the body. */
  traumaPulse(x: number, y: number): void {
    this.anim(8.3, 520, (g, t) => {
      g.lineStyle(5 * (1 - t) + 1, this.tint(MEMORY.red), 1 - t);
      g.strokeCircle(x, y, 20 + easeOut(t) * 70);
      g.fillStyle(this.tint(MEMORY.redHot), (1 - t) * 0.35);
      g.fillCircle(x, y, 18 + easeOut(t) * 26);
    });
  }

  /** The window closes on a wound: red cracks drawn into the victim. */
  traumaSeal(x: number, y: number): void {
    this.anim(9, 600, (g, t) => {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + 0.4;
        const d = 6 + easeOut(t) * 18;
        g.lineStyle(2.2 * (1 - t) + 0.4, this.tint(i % 2 ? MEMORY.red : MEMORY.redHot), 1 - t);
        g.lineBetween(x, y, x + Math.cos(a) * d, y + Math.sin(a) * d);
      }
    });
  }

  /** One second of the wound reopening. */
  traumaTick(x: number, y: number): void {
    this.anim(9, 260, (g, t) => {
      g.fillStyle(this.tint(MEMORY.red), (1 - t) * 0.5);
      g.fillCircle(x, y, 8 + t * 10);
      g.lineStyle(1.5, this.tint(MEMORY.redHot), 1 - t);
      g.strokeCircle(x, y, 14 + t * 10);
    });
  }

  /**
   * Shutdown: stolen ultimate charge — red-gold sparks, one per ten points, torn off the victim
   * and pulled into the caster. `to` is read every frame.
   */
  ultSteal(fx: number, fy: number, to: () => { x: number; y: number }, points: number): void {
    const n = Phaser.Math.Clamp(Math.round(points / 10), 2, 14);
    this.anim(9.2, 800, (g, t) => {
      const d = to();
      const perp = Math.atan2(d.y - fy, d.x - fx) + Math.PI / 2;
      for (let i = 0; i < n; i++) {
        const k = Phaser.Math.Clamp(t * 1.35 - i * 0.025, 0, 1);
        if (k <= 0 || k >= 1) continue;
        const e = easeIn(k);
        const wob = Math.sin(k * Math.PI) * (18 + (i % 4) * 7) * (i % 2 ? 1 : -1);
        const x = fx + (d.x - fx) * e + Math.cos(perp) * wob;
        const y = fy + (d.y - 10 - fy) * e + Math.sin(perp) * wob;
        g.fillStyle(this.tint(MEMORY.redHot), 0.35 * (1 - k));
        g.fillCircle(x, y, 7);
        g.fillStyle(this.tint(i % 3 ? MEMORY.bandLit : 0xffd36a), 1 - k * 0.4);
        g.fillTriangle(x, y - 4, x + 3, y, x, y + 4);
        g.fillTriangle(x, y - 4, x - 3, y, x, y + 4);
      }
      // The tear in the victim, where it came out of.
      if (t < 0.5) {
        g.lineStyle(2, this.tint(MEMORY.redHot), 1 - t * 2);
        g.strokeCircle(fx, fy, 16 + t * 30);
      }
    });
  }

  /**
   * Brain Drain: what Rebirth takes is pulled out of the victim in a stream of static — snow and
   * torn white cells dragged across the gap into the caster's hat. `to` is read every frame.
   */
  brainDrain(fx: number, fy: number, to: () => { x: number; y: number }): void {
    this.anim(9.3, 1000, (g, t) => {
      const d = to();
      const tx = d.x;
      const ty = d.y - 30;
      // The tether: a faint static beam that thins as the last of it goes across.
      if (t < 0.85) staticBeam(g, this.tint, fx, fy - 6, tx, ty, 10 * (1 - t), t * 3, 0.7 * (1 - t), 7);
      const perp = Math.atan2(ty - fy, tx - fx) + Math.PI / 2;
      for (let i = 0; i < 16; i++) {
        const k = Phaser.Math.Clamp(t * 1.5 - i * 0.03, 0, 1);
        if (k <= 0 || k >= 1) continue;
        const e = easeIn(k);
        const wob = Math.sin(k * Math.PI * 2 + i) * (8 + (i % 3) * 6);
        const x = fx + (tx - fx) * e + Math.cos(perp) * wob;
        const y = fy - 6 + (ty - fy + 6) * e + Math.sin(perp) * wob;
        const s = 5 - k * 2;
        g.fillStyle(this.tint(i % 2 ? MEMORY.staticHi : MEMORY.white), 1 - k * 0.5);
        g.fillRect(x - s / 2, y - s / 2, s, s);
      }
      // The victim's head is emptied: a white crown of static lifting off it.
      staticDisc(g, this.tint, fx, fy - 8, 14 * (1 - t) + 2, t * 4, (1 - t) * 0.8, 3, 17);
    });
  }

  /** A phantom rises out of the red static. */
  phantomRise(x: number, y: number): void {
    this.anim(9, 420, (g, t) => {
      staticDisc(g, this.tint, x, y, 6 + easeOut(t) * 20, t * 3, 1 - t, 4, 51, RED_STATIC);
      g.lineStyle(2, this.tint(MEMORY.redHot), 1 - t);
      g.strokeCircle(x, y, 10 + easeOut(t) * 30);
    });
  }

  /** A phantom sinks back into the static: torn red rows sliding apart. */
  phantomFade(x: number, y: number, color: number): void {
    this.anim(9, 500, (g, t) => {
      for (let i = 0; i < 7; i++) {
        const yy = y - 18 + i * 6;
        const shift = (i % 2 ? 1 : -1) * easeOut(t) * (8 + i * 3);
        g.fillStyle(i % 3 === 0 ? color : this.tint(MEMORY.red), (1 - t) * 0.8);
        g.fillRect(x - 16 + shift, yy, 32 * (1 - t), 4);
      }
    });
  }

  /** A static ball strikes: a red burst of static. */
  saltBurst(x: number, y: number): void {
    this.anim(9.1, 360, (g, t) => {
      g.fillStyle(this.tint(MEMORY.redHot), (1 - t) * 0.5);
      g.fillCircle(x, y, 8 + easeOut(t) * 18);
      staticDisc(g, this.tint, x, y, 6 + easeOut(t) * 14, t * 2, 1 - t, 3, 57, RED_STATIC);
      g.lineStyle(3 * (1 - t) + 0.5, this.tint(MEMORY.red), 1 - t);
      g.strokeCircle(x, y, 12 + easeOut(t) * 26);
    });
  }
}

// ── The rig ──────────────────────────────────────────────────────────────────

const MEMORY_AVATAR: AvatarSpec = {
  // White gloves with a grey crease.
  hands: [
    { r: 9, color: MEMORY.slate, alpha: 0.18 },
    { r: 6.4, color: MEMORY.gloveShade, alpha: 0.98 },
    { r: 5.2, color: MEMORY.glove, alpha: 1 },
    { r: 1.6, color: MEMORY.white, alpha: 0.9, ox: -1.4, oy: -1.6 },
  ],
  // The eyes are painted over with static (the extras layer sits above them); these only have
  // to vanish into it.
  eyeWhite: MEMORY.staticLo,
  eyePupil: MEMORY.staticLo,
  squash: { div: 16, x: 0.32, y: 0.2 },
};

/**
 * The Memory rig: white gloves on a dark coat with a red cravat, a tall top hat with a red band
 * tipped to one side, a long black cane with a silver knob in the right hand, and a face that is
 * a block of rolling static. The cane spins in the hand through Memory Snatch's wind-up.
 * Repression wraps the body in grey, Trauma in red.
 */
export class MemoryAvatar extends BaseAvatar {
  private spinning = false;
  private spinAng = 0;
  private aura: 'grey' | 'red' | null = null;
  private auraK = 0;

  constructor(scene: Phaser.Scene, tint: ColorFn, depth = 6) {
    super(scene, tint, depth, MEMORY_AVATAR);
  }

  setSpin(on: boolean): void { this.spinning = on; }
  /** `k` 0..1 is how far through the window the aura is. */
  setAura(kind: 'grey' | 'red' | null, k = 0): void { this.aura = kind; this.auraK = k; }

  update(delta: number, x: number, y: number, alpha: number): void {
    if (this.spinning) this.spinAng += (delta / 1000) * 16;
    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    // No mastery yet. The tell is ready: the gloves go silver.
    this.forEachHandLayer(2, (arc) => arc.setFillStyle(this.tint(on ? MEMORY.silver : MEMORY.glove), 1));
  }

  /** Lapels and a red cravat over the dark body. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    g.fillStyle(this.tint(MEMORY.coatLit), alpha * 0.95);
    g.fillTriangle(x - 13, y + 4, x - 2, y + 7, x - 6, y + 20);
    g.fillTriangle(x + 13, y + 4, x + 2, y + 7, x + 6, y + 20);
    g.fillStyle(this.tint(MEMORY.band), alpha);
    g.fillTriangle(x - 4, y + 6, x + 4, y + 6, x, y + 11);
    g.fillStyle(this.tint(MEMORY.bandLit), alpha);
    g.fillTriangle(x, y + 9, x - 2.5, y + 16, x + 2.5, y + 16);
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    g.fillStyle(this.tint(MEMORY.ink), a * 0.5);
    g.fillEllipse(x, y + 18, 48, 14);
    if (this.aura === 'grey') greyAura(g, this.tint, x, y, 46, this.t, a * 1.2);
    else if (this.aura === 'red') redAura(g, this.tint, x, y, 46, this.t, this.auraK, a * 1.3);
  }

  /** The static face, the top hat and the cane. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const t = this.t;
    const look = this.facing;
    // The face: a rounded block of static where the eyes would be, slipping with the gaze.
    const fx = x + Math.cos(look) * 1.6;
    const fy = y - 5 + Math.sin(look) * 1.2;
    g.fillStyle(this.tint(MEMORY.ink), alpha);
    g.fillRoundedRect(fx - 13, fy - 7.5, 26, 15, 4);
    staticRect(g, this.tint, fx - 12, fy - 6.5, 24, 13, t, alpha, 2, 1);
    // The top hat, tipped a touch to the side it is looking.
    const tilt = Math.cos(look) * 0.12;
    const hx = x + Math.sin(tilt) * 4;
    const hy = y - 17;
    const c = Math.cos(tilt);
    const s = Math.sin(tilt);
    const P = (px: number, py: number) => ({ x: hx + px * c - py * s, y: hy + px * s + py * c });
    g.fillStyle(this.tint(MEMORY.ink), alpha);
    g.fillEllipse(hx, hy, 38, 8);
    g.fillStyle(this.tint(MEMORY.coat), alpha);
    g.fillPoints([P(-11, 0), P(-12, -22), P(12, -22), P(11, 0)], true);
    g.fillStyle(this.tint(MEMORY.coatLit), alpha * 0.8);
    g.fillPoints([P(-11, 0), P(-12, -22), P(-7, -22), P(-6.5, 0)], true);
    g.fillStyle(this.tint(MEMORY.band), alpha);
    g.fillPoints([P(-11, -1), P(-11.3, -6), P(11.3, -6), P(11, -1)], true);
    g.fillStyle(this.tint(MEMORY.bandLit), alpha * 0.7);
    g.fillPoints([P(-11.3, -5), P(-11.3, -6), P(11.3, -6), P(11.3, -5)], true);
    g.fillStyle(this.tint(MEMORY.coatLit), alpha);
    g.fillEllipse(P(0, -22).x, P(0, -22).y, 24, 4);
    // The cane, in the right hand: planted down and out while idle, spun on its middle in the wind-up.
    const hxr = this.armX[1];
    const hyr = this.armY[1];
    const len = 44;
    if (this.spinning) {
      const ang = this.spinAng;
      // Motion blur: faint copies trailing the turn.
      for (let i = 3; i >= 1; i--) {
        const ga = ang - i * 0.28;
        g.lineStyle(3, this.tint(MEMORY.beamGlow), alpha * 0.12 * (4 - i));
        g.lineBetween(hxr - Math.cos(ga) * len / 2, hyr - Math.sin(ga) * len / 2, hxr + Math.cos(ga) * len / 2, hyr + Math.sin(ga) * len / 2);
      }
      const x0 = hxr - Math.cos(ang) * len / 2;
      const y0 = hyr - Math.sin(ang) * len / 2;
      const x1 = hxr + Math.cos(ang) * len / 2;
      const y1 = hyr + Math.sin(ang) * len / 2;
      g.lineStyle(3.2, this.tint(MEMORY.ink), alpha);
      g.lineBetween(x0, y0, x1, y1);
      g.fillStyle(this.tint(MEMORY.silver), alpha);
      g.fillCircle(x1, y1, 3.6);
      // Static crackling off the knob as it builds.
      staticDisc(g, this.tint, x1, y1, 5, t, alpha * 0.6, 2, 5);
    } else {
      const ang = Math.PI / 2 + Math.cos(look) * 0.35;
      const x0 = hxr - Math.cos(ang) * 6;
      const y0 = hyr - Math.sin(ang) * 6;
      const x1 = hxr + Math.cos(ang) * (len - 6);
      const y1 = hyr + Math.sin(ang) * (len - 6);
      g.lineStyle(3.2, this.tint(MEMORY.ink), alpha);
      g.lineBetween(x0, y0, x1, y1);
      g.lineStyle(1, this.tint(MEMORY.coatLit), alpha * 0.9);
      g.lineBetween(x0 + 1, y0, x1 + 1, y1);
      g.fillStyle(this.tint(MEMORY.silver), alpha);
      g.fillCircle(x0, y0, 3.6);
      g.fillStyle(this.tint(MEMORY.silverLit), alpha);
      g.fillCircle(x0 - 1, y0 - 1, 1.2);
      g.fillStyle(this.tint(MEMORY.silver), alpha);
      g.fillRect(x1 - 1.6, y1 - 1, 3.2, 3);
    }
    if (this.mastered) {
      g.lineStyle(1.4, this.tint(MEMORY.silver), alpha * 0.8);
      g.strokeEllipse(hx, hy, 42, 10);
    }
  }
}
