import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt } from '../../../../IslesTypes';
import {
  BRASS, BRASS_DARK, BRASS_LIT, CLIFF, CLIFF_DEEP, CLIFF_SHADE, CREPE, ECTO, FLAME, FLAME_LIT, GLASS, GLASS_EDGE,
  GLASS_LIT, GOLD, GOLD_LIT, IRON, IRON_LIT, LAKE_DEEP, LIME, LIME_DARK, LIME_DEEP, LIME_LIT, PAPER, PAPER_DARK,
  PAPER_SHADE, SOUL, SOUL_DARK, SOUL_DEEP, SOUL_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT, WAX, WAX_DARK, WAX_LIT, WICK,
} from './palette';

/**
 * Lantern Court set pieces. The gorge is a town built for hanging things: everything has a hook,
 * a wire, a ring or a numbered plate, and everything that hangs holds a soul. The rule for every
 * painter here: white stone and paper in the glare, brass and black iron for the hardware, and the
 * pale soul-blue as the only cold colour — so the eye always finds the lanterns first.
 */

// ── Small shared shapes ──────────────────────────────────────────────

/**
 * A soul-lantern hanging from its hook at (x, y): an iron hook and ring, a brass cap with a
 * chimney, a six-sided glass body with leading, and inside it the caught soul — a small blue
 * flame with two dark eyes. `k` is how bright it burns (0 = guttered, dark glass and a curl of
 * smoke). `t` (seconds) makes the soul flicker.
 */
export function soulLantern(g: G, x: number, y: number, s = 1, k = 1, t = 0): void {
  const bodyTop = y + 8 * s, bodyH = 18 * s, bw = 11 * s;
  if (k > 0.05) glow(g, x, bodyTop + bodyH / 2, 26 * s, SOUL, 0.05 * k, 3);
  // Hook and ring.
  g.lineStyle(1.4 * s, IRON, 1); g.lineBetween(x, y, x, y + 4 * s);
  g.strokeCircle(x, y + 5 * s, 1.8 * s);
  // Cap: a little brass pagoda.
  g.fillStyle(BRASS_DARK, 1); g.fillTriangle(x - bw - 2 * s, bodyTop + 1, x + bw + 2 * s, bodyTop + 1, x, y + 3 * s);
  g.fillStyle(BRASS, 1); g.fillTriangle(x - bw, bodyTop, x + bw * 0.4, bodyTop, x, y + 4 * s);
  g.fillStyle(BRASS_LIT, 0.8); g.fillRect(x - bw - 1, bodyTop - 1, (bw + 1) * 2, 2 * s);
  // Glass body.
  const inner = k > 0.05 ? mixC(SOUL_DARK, SOUL, 0.35 + k * 0.5) : dim(GLASS_EDGE, 0.45);
  g.fillStyle(inner, 0.95);
  g.fillPoints([
    { x: x - bw * 0.8, y: bodyTop }, { x: x + bw * 0.8, y: bodyTop }, { x: x + bw, y: bodyTop + bodyH * 0.5 },
    { x: x + bw * 0.7, y: bodyTop + bodyH }, { x: x - bw * 0.7, y: bodyTop + bodyH }, { x: x - bw, y: bodyTop + bodyH * 0.5 },
  ], true);
  // The soul inside.
  if (k > 0.05) {
    const fl = Math.sin(t * 7 + x * 0.13) * 1.2 * s;
    const cy = bodyTop + bodyH * 0.58;
    g.fillStyle(SOUL_LIT, 0.55 + 0.4 * k);
    g.fillTriangle(x - 4 * s, cy + 2 * s, x + 4 * s, cy + 2 * s, x + fl, cy - 9 * s);
    g.fillCircle(x, cy + 1.5 * s, 4 * s);
    g.fillStyle(SOUL_DARK, 0.8); g.fillCircle(x - 1.5 * s, cy + 0.5 * s, 0.8 * s); g.fillCircle(x + 1.5 * s, cy + 0.5 * s, 0.8 * s);
  } else {
    g.fillStyle(0x9a9a9a, 0.35); g.fillCircle(x + Math.sin(t * 2) * 2, y - 4 * s, 3 * s); g.fillCircle(x + Math.sin(t * 2 + 1) * 3, y - 10 * s, 2.4 * s);
  }
  // Leading and a sharp noon glint on the glass.
  g.lineStyle(1, BRASS_DARK, 1);
  g.lineBetween(x, bodyTop, x, bodyTop + bodyH);
  g.lineBetween(x - bw, bodyTop + bodyH * 0.5, x + bw, bodyTop + bodyH * 0.5);
  g.fillStyle(GLASS_LIT, 0.7); g.fillRect(x - bw * 0.6, bodyTop + 2 * s, 1.5 * s, bodyH * 0.35);
  // Base plate and finial drop.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - bw * 0.75, bodyTop + bodyH, bw * 1.5, 2.5 * s);
  g.fillStyle(BRASS, 1); g.fillCircle(x, bodyTop + bodyH + 4 * s, 1.6 * s);
}

/**
 * A freed soul: a teardrop of pale blue fire with a hollow face and a tail that streams behind it.
 * `wail` opens the mouth into a long O and adds sound-rings — the guttered ones that hunt.
 * `heading` is the way it travels (the tail streams the other way).
 */
export function soulWisp(g: G, x: number, y: number, r: number, t: number, color = SOUL, a = 1, wail = false, heading = -Math.PI / 2): void {
  const tx = -Math.cos(heading), ty = -Math.sin(heading);
  glow(g, x, y, r * 2.2, color, 0.06 * a, 3);
  // The tail: three tapering puffs streaming away.
  for (let i = 3; i >= 1; i--) {
    const w = Math.sin(t * 9 + i * 1.7) * r * 0.25;
    g.fillStyle(i === 1 ? lit(color, 0.2) : color, a * (0.25 + (3 - i) * 0.15));
    g.fillCircle(x + tx * r * i * 0.85 - ty * w, y + ty * r * i * 0.85 + tx * w, r * (1 - i * 0.22));
  }
  g.fillStyle(color, 0.85 * a); g.fillCircle(x, y, r);
  g.fillStyle(lit(color, 0.6), 0.75 * a); g.fillCircle(x - r * 0.25, y - r * 0.3, r * 0.5);
  // Face.
  g.fillStyle(SOUL_DARK, 0.85 * a);
  g.fillEllipse(x - r * 0.33, y - r * 0.08, r * 0.24, r * (wail ? 0.42 : 0.32));
  g.fillEllipse(x + r * 0.33, y - r * 0.08, r * 0.24, r * (wail ? 0.42 : 0.32));
  if (wail) {
    g.fillEllipse(x, y + r * 0.42, r * 0.34, r * 0.5);
    const ph = (t * 1.6) % 1;
    g.lineStyle(1.5, lit(color, 0.4), a * (1 - ph) * 0.7); g.strokeCircle(x, y, r * (1.3 + ph * 1.4));
  } else {
    g.fillEllipse(x, y + r * 0.4, r * 0.22, r * 0.12);
  }
}

/**
 * A paper boat seen from above and a little in front: a folded hull with a crease down the middle
 * and the sail-fold standing up. `dir` 1 sails right, -1 left.
 */
export function paperBoat(g: G, x: number, y: number, s = 1, dir = 1, wet = 0): void {
  shadow(g, x, y + 3 * s, 46 * s, 9 * s, 0.22);
  const hull = mixC(PAPER, PAPER_SHADE, wet);
  g.fillStyle(PAPER_DARK, 1);
  g.fillPoints([{ x: x - 22 * s, y: y - 6 * s }, { x: x + 22 * s, y: y - 6 * s }, { x: x + 15 * s, y: y + 3 * s }, { x: x - 15 * s, y: y + 3 * s }], true);
  g.fillStyle(hull, 1);
  g.fillPoints([{ x: x - 22 * s, y: y - 7 * s }, { x: x + 22 * s, y: y - 7 * s }, { x: x + 15 * s, y: y + 1 * s }, { x: x - 15 * s, y: y + 1 * s }], true);
  // The standing fold.
  g.fillStyle(PAPER_SHADE, 1); g.fillTriangle(x - 12 * s, y - 7 * s, x + 12 * s, y - 7 * s, x + dir * 2 * s, y - 24 * s);
  g.fillStyle(lit(hull, 0.3), 1); g.fillTriangle(x - 12 * s, y - 7 * s, x + dir * 2 * s, y - 7 * s, x + dir * 2 * s, y - 24 * s);
  g.lineStyle(0.8, PAPER_DARK, 0.8); g.lineBetween(x + dir * 2 * s, y - 24 * s, x + dir * 2 * s, y - 7 * s);
  g.lineBetween(x - 22 * s, y - 7 * s, x - 15 * s, y + 1 * s); g.lineBetween(x + 22 * s, y - 7 * s, x + 15 * s, y + 1 * s);
}

/** A dipped candle standing at (x, y): `h` tall, wax runs down it, a flame if lit. */
export function candle(g: G, x: number, y: number, h: number, w: number, lit1: boolean, t = 0, wax = WAX): void {
  g.fillStyle(dim(wax, 0.25), 1); g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle(wax, 1); g.fillRect(x - w / 2, y - h, w * 0.7, h);
  g.fillStyle(lit(wax, 0.4), 0.8); g.fillRect(x - w / 2 + 1, y - h + 1, 1.2, h - 2);
  // Runs of wax.
  g.fillStyle(wax, 1); g.fillCircle(x + w * 0.3, y - h + 3, w * 0.22); g.fillRect(x + w * 0.22, y - h + 2, w * 0.18, h * 0.4);
  g.lineStyle(1, WICK, 1); g.lineBetween(x, y - h, x, y - h - 3);
  if (lit1) {
    const f = Math.sin(t * 11 + x) * 0.8;
    glow(g, x, y - h - 6, 12, FLAME, 0.05, 2);
    g.fillStyle(FLAME, 0.95); g.fillEllipse(x + f * 0.4, y - h - 6, w * 0.55 + 2, 9);
    g.fillStyle(FLAME_LIT, 1); g.fillEllipse(x + f * 0.2, y - h - 5, w * 0.25 + 1, 5);
  }
}

/** A heart in a stoppered glass jar — what the Psychopomp weighs. `fill` 0–1 is how heavy it looks. */
export function heartJar(g: G, x: number, y: number, s: number, color: number, fill: number): void {
  g.fillStyle(GLASS, 0.35); g.fillRoundedRect(x - 10 * s, y - 24 * s, 20 * s, 24 * s, 5 * s);
  g.lineStyle(1.2, GLASS_EDGE, 0.9); g.strokeRoundedRect(x - 10 * s, y - 24 * s, 20 * s, 24 * s, 5 * s);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 6 * s, y - 28 * s, 12 * s, 5 * s);
  const hs = (0.55 + fill * 0.45) * s;
  const hy = y - 11 * s;
  g.fillStyle(dim(color, 0.3), 1);
  g.fillCircle(x - 3.4 * hs, hy - 2 * hs, 4 * hs); g.fillCircle(x + 3.4 * hs, hy - 2 * hs, 4 * hs);
  g.fillTriangle(x - 7.3 * hs, hy - 0.6 * hs, x + 7.3 * hs, hy - 0.6 * hs, x, hy + 8 * hs);
  g.fillStyle(color, 1);
  g.fillCircle(x - 3.4 * hs, hy - 2.4 * hs, 3.5 * hs); g.fillCircle(x + 3.4 * hs, hy - 2.4 * hs, 3.5 * hs);
  g.fillTriangle(x - 6.6 * hs, hy - 1.2 * hs, x + 6.6 * hs, hy - 1.2 * hs, x, hy + 6.8 * hs);
  g.fillStyle(GLASS_LIT, 0.6); g.fillRect(x - 7 * s, y - 21 * s, 1.5 * s, 12 * s);
}

/** A long white feather: a quill shaft and two vanes, ruffled at the tip. */
export function feather(g: G, x: number, y: number, len: number, a: number, color = CREPE, alpha = 1): void {
  const c = Math.cos(a), s = Math.sin(a);
  const nx = -s, ny = c;
  const tipX = x + c * len, tipY = y + s * len;
  for (let i = 1; i < 9; i++) {
    const k = i / 9;
    const px = x + c * len * k, py = y + s * len * k;
    const w = len * 0.2 * Math.sin(k * Math.PI) * (i % 3 === 0 ? 0.85 : 1);
    g.lineStyle(2.2, i % 2 ? color : dim(color, 0.08), alpha);
    g.lineBetween(px, py, px + nx * w + c * len * 0.06, py + ny * w + s * len * 0.06);
    g.lineBetween(px, py, px - nx * w + c * len * 0.06, py - ny * w + s * len * 0.06);
  }
  g.lineStyle(1.4, dim(color, 0.3), alpha); g.lineBetween(x - c * len * 0.12, y - s * len * 0.12, tipX, tipY);
}

/**
 * One wire across the gorge, from (x, y0) on the north rim to (x, y1) on the south, sagging and
 * swaying, with its lanterns hung along it. Per frame, so it stays cheap: one polyline, and only
 * the lanterns inside [vy0, vy1].
 */
export function wireSpan(g: G, x: number, y0: number, y1: number, t: number, seed: number, vy0: number, vy1: number, every = 70): void {
  const sway = Math.sin(t * 0.6 + seed) * 10;
  const pts: Pt[] = [];
  const N = 16;
  for (let i = 0; i <= N; i++) {
    const k = i / N;
    pts.push({ x: x + Math.sin(k * Math.PI) * (26 + sway), y: y0 + (y1 - y0) * k });
  }
  g.lineStyle(1.2, IRON, 0.55);
  g.strokePoints(pts, false);
  const n = Math.floor((y1 - y0) / every);
  for (let i = 1; i < n; i++) {
    const k = i / n;
    const ly = y0 + (y1 - y0) * k;
    if (ly < vy0 - 40 || ly > vy1 + 40) continue;
    const lx = x + Math.sin(k * Math.PI) * (26 + sway);
    const dangle = 8 + ((i * 7 + seed * 13) % 9);
    const bob = Math.sin(t * 1.3 + i + seed) * 1.5;
    g.lineStyle(0.8, IRON, 0.6); g.lineBetween(lx, ly, lx + bob, ly + dangle);
    soulLantern(g, lx + bob, ly + dangle, 0.62, 0.85 + Math.sin(t * 3 + i * 1.3 + seed) * 0.15, t);
  }
}

// ── The ground ───────────────────────────────────────────────────────

/**
 * A cliff of the gorge seen from the top: a band of streaked limestone face from y0 down to y1,
 * with ledges, cracks and carved lantern-niches (each holding a tiny blue light), a rim of brighter
 * stone along the top and a strip of scree at the foot. `down` = the face looks south.
 */
export function cliffBand(g: G, x0: number, y0: number, w: number, h: number, rng: () => number): void {
  g.fillStyle(CLIFF_DEEP, 1); g.fillRect(x0, y0, w, h);
  g.fillStyle(CLIFF_SHADE, 1); g.fillRect(x0, y0, w, h * 0.82);
  g.fillStyle(CLIFF, 1); g.fillRect(x0, y0, w, h * 0.5);
  g.fillStyle(LIME_LIT, 1); g.fillRect(x0, y0, w, 6);
  // Strata and streaks.
  for (let i = 0; i < w / 22; i++) {
    const sx = x0 + rng() * w;
    g.lineStyle(1, CLIFF_DEEP, 0.35 + rng() * 0.3); g.lineBetween(sx, y0 + 8, sx + (rng() - 0.5) * 10, y0 + h * (0.4 + rng() * 0.5));
  }
  for (let k = 1; k < 4; k++) { g.lineStyle(1.5, CLIFF_SHADE, 0.6); g.lineBetween(x0, y0 + (h * k) / 4, x0 + w, y0 + (h * k) / 4 + (rng() - 0.5) * 6); }
  // Carved niches with a blue light in each.
  for (let nx = x0 + 30 + rng() * 40; nx < x0 + w - 20; nx += 70 + rng() * 60) {
    const ny = y0 + 14 + rng() * (h * 0.45);
    g.fillStyle(CLIFF_DEEP, 1); g.fillRoundedRect(nx - 6, ny, 12, 15, { tl: 6, tr: 6, bl: 0, br: 0 });
    g.fillStyle(SOUL, 0.85); g.fillCircle(nx, ny + 9, 2.8);
    g.fillStyle(SOUL_LIT, 0.4); g.fillCircle(nx, ny + 9, 5);
  }
  // Scree at the foot.
  for (let i = 0; i < w / 9; i++) {
    g.fillStyle(rng() < 0.5 ? LIME_DARK : LIME, 1);
    g.fillCircle(x0 + rng() * w, y0 + h + rng() * 14, 1.5 + rng() * 2.5);
  }
}

/** The vertical cliff on the west side, seen face-on from above as a strip. */
export function cliffStrip(g: G, x0: number, y0: number, w: number, h: number, rng: () => number, faceRight: boolean): void {
  g.fillStyle(CLIFF_DEEP, 1); g.fillRect(x0, y0, w, h);
  g.fillStyle(CLIFF_SHADE, 1); g.fillRect(faceRight ? x0 : x0 + w * 0.2, y0, w * 0.8, h);
  g.fillStyle(CLIFF, 1); g.fillRect(faceRight ? x0 : x0 + w * 0.5, y0, w * 0.5, h);
  g.fillStyle(LIME_LIT, 1); g.fillRect(faceRight ? x0 : x0 + w - 6, y0, 6, h);
  for (let i = 0; i < h / 30; i++) {
    const sy = y0 + rng() * h;
    g.lineStyle(1, CLIFF_DEEP, 0.4); g.lineBetween(x0 + 4, sy, x0 + w - 4, sy + (rng() - 0.5) * 8);
  }
  for (let i = 0; i < h / 10; i++) {
    g.fillStyle(rng() < 0.5 ? LIME_DARK : LIME, 1);
    g.fillCircle(faceRight ? x0 + w + rng() * 12 : x0 - rng() * 12, y0 + rng() * h, 1.5 + rng() * 2);
  }
}

/** A puddle of soul-light under a wire, and the tiny hard shadow of a lantern in the noon sun. */
export function lightPool(g: G, x: number, y: number, r: number): void {
  g.fillStyle(SOUL, 0.08); g.fillEllipse(x, y, r * 2.2, r * 0.9);
  g.fillStyle(SOUL_LIT, 0.08); g.fillEllipse(x, y, r * 1.1, r * 0.45);
  g.fillStyle(0x000000, 0.22); g.fillEllipse(x, y, 5, 2.4);
}

/** Wax drips on the flags under a lantern post — the chandlers' stains, never quite scraped off. */
export function waxDrips(g: G, x: number, y: number, rng: () => number, n = 7): void {
  for (let i = 0; i < n; i++) {
    const dx = (rng() - 0.5) * 28, dy = (rng() - 0.5) * 12;
    g.fillStyle(WAX_DARK, 0.5); g.fillEllipse(x + dx, y + dy + 0.6, 5 + rng() * 4, 2.5 + rng() * 1.5);
    g.fillStyle(WAX, 0.85); g.fillEllipse(x + dx, y + dy, 4 + rng() * 3, 2 + rng());
  }
}

// ── Set pieces (x, y = base/feet point) ──────────────────────────────

/**
 * The Columbarium of Lights — Prince Wisp's hall: a tall white façade cut into ranks of arched
 * niches, every one holding a lantern glowing blue, up to a pediment carrying the Despot's
 * sunburst in gold. Bronze doors, a flight of steps, and two great lanterns on iron brackets.
 */
export function columbarium(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 6, w * 1.05, 26);
  const x0 = x - w / 2;
  // Plinth and steps.
  for (let k = 0; k < 4; k++) {
    g.fillStyle(k % 2 ? LIME : LIME_LIT, 1); g.fillRect(x - 90 - k * 10, y - 8 - k * 0 + k * 3 - 12, 180 + k * 20, 6);
  }
  g.fillStyle(LIME_DARK, 1); g.fillRect(x0 - 10, y - 30, w + 20, 18);
  g.fillStyle(LIME, 1); g.fillRect(x0 - 8, y - 34, w + 16, 14);
  // The wall of niches.
  const top = y - 34 - h;
  g.fillStyle(LIME_DARK, 1); g.fillRect(x0, top, w, h);
  g.fillStyle(LIME, 1); g.fillRect(x0 + 4, top, w - 8, h);
  const cols = Math.floor(w / 34), rows = Math.floor((h - 30) / 34);
  const cw = (w - 20) / cols;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const nx = x0 + 10 + c * cw + cw / 2, ny = top + 16 + r * 34;
      if (Math.abs(nx - x) < 46 && r >= rows - 3) continue; // the door bay
      g.fillStyle(LIME_DEEP, 1); g.fillRoundedRect(nx - 10, ny, 20, 26, { tl: 10, tr: 10, bl: 0, br: 0 });
      g.fillStyle(dim(SOUL_DARK, 0.1), 1); g.fillRoundedRect(nx - 8, ny + 2, 16, 23, { tl: 8, tr: 8, bl: 0, br: 0 });
      const k = 0.55 + rng() * 0.45;
      g.fillStyle(SOUL, 0.18 * k); g.fillCircle(nx, ny + 14, 9);
      g.fillStyle(BRASS, 1); g.fillRect(nx - 3, ny + 5, 6, 2);
      g.fillStyle(mixC(SOUL_DEEP, SOUL_LIT, k * 0.7), 1); g.fillRoundedRect(nx - 3.5, ny + 7, 7, 10, 2);
      g.fillStyle(SOUL_LIT, 0.8 * k); g.fillCircle(nx, ny + 12, 1.6);
      g.fillStyle(LIME_LIT, 1); g.fillRect(nx - 11, ny + 26, 22, 2);
      // A brass name-plate under one niche in three.
      if ((r * 7 + c * 3) % 3 === 0) { g.fillStyle(BRASS_DARK, 1); g.fillRect(nx - 5, ny + 28, 10, 3); }
    }
  }
  // Pilasters.
  for (const px of [x0 + 2, x0 + w - 10, x - 60, x + 52]) {
    g.fillStyle(LIME_LIT, 1); g.fillRect(px, top, 8, h);
    g.fillStyle(LIME_DARK, 0.6); g.fillRect(px + 6, top, 2, h);
  }
  // Cornice and pediment with the sunburst.
  g.fillStyle(LIME_DARK, 1); g.fillRect(x0 - 12, top - 12, w + 24, 12);
  g.fillStyle(LIME_LIT, 1); g.fillRect(x0 - 12, top - 14, w + 24, 5);
  g.fillStyle(LIME_DARK, 1); g.fillTriangle(x0 + 30, top - 14, x0 + w - 30, top - 14, x, top - 80);
  g.fillStyle(LIME, 1); g.fillTriangle(x0 + 44, top - 16, x0 + w - 44, top - 16, x, top - 74);
  for (let i = 0; i < 16; i++) {
    const a = Math.PI + (i / 15) * Math.PI;
    g.lineStyle(2, GOLD, 0.95); g.lineBetween(x, top - 30, x + Math.cos(a) * 34, top - 30 + Math.sin(a) * 30);
  }
  g.fillStyle(GOLD, 1); g.fillCircle(x, top - 30, 10);
  g.fillStyle(GOLD_LIT, 1); g.fillCircle(x - 3, top - 33, 4);
  // Bronze doors, open a crack; blue light inside.
  const dh = 92;
  g.fillStyle(LIME_DEEP, 1); g.fillRoundedRect(x - 38, y - 34 - dh, 76, dh, { tl: 38, tr: 38, bl: 0, br: 0 });
  g.fillStyle(SOUL_DARK, 1); g.fillRoundedRect(x - 32, y - 34 - dh + 6, 64, dh - 6, { tl: 32, tr: 32, bl: 0, br: 0 });
  g.fillStyle(SOUL, 0.3); g.fillRect(x - 5, y - 34 - dh + 20, 10, dh - 20);
  g.fillStyle(0x8a6a34, 1); g.fillRect(x - 32, y - 34 - dh + 34, 26, dh - 34); g.fillRect(x + 6, y - 34 - dh + 34, 26, dh - 34);
  g.lineStyle(1, BRASS_LIT, 0.6);
  for (let k = 0; k < 3; k++) { g.strokeRect(x - 28, y - 34 - dh + 40 + k * 18, 18, 14); g.strokeRect(x + 10, y - 34 - dh + 40 + k * 18, 18, 14); }
  // The two great bracket lanterns.
  for (const k of [-1, 1]) {
    const bx = x + k * 74;
    g.lineStyle(3, IRON, 1); g.lineBetween(bx, y - 100, bx + k * 18, y - 100); g.lineBetween(bx + k * 18, y - 100, bx + k * 18, y - 94);
    soulLantern(g, bx + k * 18, y - 94, 1.6, 1, 0);
  }
}

/**
 * A lantern-maker's shop: a narrow white house with a glass front (Clarity — every shop is glass),
 * frames of unfinished lanterns racked in the window, paper shades drying on a line under the eaves,
 * a hanging sign-lantern, and a striped awning. `tint` colours the awning and the paper.
 */
export function lanternShop(g: G, x: number, y: number, w: number, h: number, tint: number, rng: () => number): void {
  shadow(g, x, y + 4, w * 1.05, 18);
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(LIME_DARK, 1); g.fillRect(x0, top, w, h);
  g.fillStyle(LIME_LIT, 1); g.fillRect(x0 + 3, top, w - 6, h);
  // Roof: a flat parapet with a little gilt dome on the corner (it is Solmara).
  g.fillStyle(LIME_DARK, 1); g.fillRect(x0 - 4, top - 8, w + 8, 8);
  g.fillStyle(LIME, 1); g.fillRect(x0 - 4, top - 10, w + 8, 4);
  g.fillStyle(GOLD, 1); g.fillEllipse(x0 + w - 16, top - 12, 18, 14);
  g.fillStyle(GOLD_LIT, 0.8); g.fillEllipse(x0 + w - 19, top - 15, 6, 4);
  // Upper window with drying shades on a line.
  g.lineStyle(1, IRON, 0.7); g.lineBetween(x0 + 6, top + 14, x0 + w - 6, top + 16);
  for (let sx = x0 + 14; sx < x0 + w - 10; sx += 18) {
    g.fillStyle(mixC(PAPER, tint, 0.25 + rng() * 0.25), 1); g.fillRoundedRect(sx - 5, top + 16, 10, 14, 4);
    g.lineStyle(0.6, PAPER_DARK, 0.7); g.lineBetween(sx - 5, top + 21, sx + 5, top + 21); g.lineBetween(sx - 5, top + 25, sx + 5, top + 25);
  }
  // Glass shopfront with racked frames inside.
  const gy = top + h * 0.42, gh = h * 0.58 - 4;
  g.fillStyle(dim(LIME, 0.35), 1); g.fillRect(x0 + 8, gy, w - 16, gh);
  for (let sx = x0 + 16; sx < x0 + w - 14; sx += 16) {
    g.lineStyle(1, BRASS_DARK, 0.9); g.strokeRect(sx - 4, gy + 8, 8, 12);
    g.lineBetween(sx, gy + 8, sx, gy + 20);
    if (rng() < 0.4) { g.fillStyle(SOUL, 0.5); g.fillRect(sx - 3, gy + 9, 6, 10); }
    g.lineStyle(1, BRASS_DARK, 0.9); g.strokeRect(sx - 4, gy + 26, 8, 10);
  }
  g.fillStyle(GLASS, 0.28); g.fillRect(x0 + 8, gy, w - 16, gh);
  g.lineStyle(2, BRASS, 1); g.strokeRect(x0 + 8, gy, w - 16, gh);
  g.lineBetween(x, gy, x, gy + gh);
  g.fillStyle(GLASS_LIT, 0.5); g.fillRect(x0 + 14, gy + 4, 3, gh - 10); g.fillRect(x + 6, gy + 4, 2, gh - 10);
  // Awning.
  const ay = gy - 4;
  for (let k = 0; k < 8; k++) {
    const sx = x0 + 2 + (k * (w - 4)) / 8;
    g.fillStyle(k % 2 ? CREPE : tint, 1);
    g.fillPoints([{ x: sx, y: ay - 10 }, { x: sx + (w - 4) / 8, y: ay - 10 }, { x: sx + (w - 4) / 8 + 2, y: ay + 6 }, { x: sx + 2, y: ay + 6 }], true);
  }
  for (let k = 0; k < 8; k++) { g.fillStyle(k % 2 ? CREPE : tint, 1); g.fillCircle(x0 + 6 + (k * (w - 4)) / 8 + (w - 4) / 16, ay + 6, (w - 4) / 16); }
  // The sign-lantern on its bracket.
  g.lineStyle(2, IRON, 1); g.lineBetween(x0 + w - 2, top + h * 0.3, x0 + w + 16, top + h * 0.3);
  soulLantern(g, x0 + w + 14, top + h * 0.3, 1.1, 1, 0);
  // Step.
  g.fillStyle(LIME, 1); g.fillRect(x - 16, y - 4, 32, 4);
}

/**
 * The Mourning House: a long, low white hall whose every shutter is nailed back flat against the
 * wall (Clarity: grief must be seen), so the rows of mourners sitting up inside in white crepe can
 * be watched from the lane. Iron nails, bent and hammered over, glint in every shutter.
 */
export function mourningHouse(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 4, w * 1.05, 20);
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(LIME_DARK, 1); g.fillRect(x0, top, w, h);
  g.fillStyle(LIME_LIT, 1); g.fillRect(x0 + 3, top + 2, w - 6, h - 2);
  // Low hipped roof of white tile.
  g.fillStyle(LIME_DEEP, 1); g.fillTriangle(x0 - 10, top + 2, x0 + w + 10, top + 2, x, top - 46);
  g.fillStyle(LIME, 1); g.fillTriangle(x0 - 4, top, x0 + w + 4, top, x, top - 42);
  for (let k = 1; k < 6; k++) { g.lineStyle(1, LIME_DARK, 0.6); g.lineBetween(x0 + (w * k) / 6 - 4, top, x, top - 42); }
  // A white crepe swag over the door.
  g.lineStyle(3, CREPE, 1);
  g.beginPath(); g.arc(x, top + 6, 26, 0.15, Math.PI - 0.15, false); g.strokePath();
  // Windows, each with its shutters nailed open.
  const n = 4;
  for (let i = 0; i < n; i++) {
    const wx = x0 + 30 + (i * (w - 60)) / (n - 1);
    if (Math.abs(wx - x) < 30) continue;
    const wy = top + h * 0.3;
    // The window: mourners seen inside, sitting up in white.
    g.fillStyle(dim(LIME, 0.55), 1); g.fillRect(wx - 13, wy, 26, 30);
    for (let m = 0; m < 2; m++) {
      const mx = wx - 6 + m * 12;
      g.fillStyle(CREPE, 1); g.fillEllipse(mx, wy + 24, 9, 14);
      g.fillStyle(0xe2c8ac, 1); g.fillCircle(mx, wy + 14, 3.2);
      g.fillStyle(CREPE, 1); g.fillTriangle(mx - 4, wy + 15, mx + 4, wy + 15, mx, wy + 7);
    }
    g.lineStyle(1.5, TIMBER_DARK, 1); g.strokeRect(wx - 13, wy, 26, 30); g.lineBetween(wx, wy, wx, wy + 30);
    // Shutters flat against the wall, slats and a nail hammered over at each corner.
    for (const k of [-1, 1]) {
      const sx = wx + k * 13 + (k < 0 ? -14 : 0);
      g.fillStyle(TIMBER, 1); g.fillRect(sx, wy - 1, 14, 32);
      for (let sl = 0; sl < 6; sl++) { g.lineStyle(1, TIMBER_DARK, 0.8); g.lineBetween(sx + 1, wy + 3 + sl * 5, sx + 13, wy + 3 + sl * 5); }
      for (const ny of [wy + 2, wy + 27]) {
        const nx = sx + (k < 0 ? 3 : 11);
        g.fillStyle(IRON_LIT, 1); g.fillCircle(nx, ny, 1.6);
        g.lineStyle(1.2, IRON, 1); g.lineBetween(nx, ny, nx + k * 3, ny + 2);
      }
    }
  }
  // Door: glass, of course, with a white wreath.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 16, y - 50, 32, 50);
  g.fillStyle(GLASS, 0.5); g.fillRect(x - 13, y - 47, 26, 44);
  g.lineStyle(3, CREPE, 1); g.strokeCircle(x, y - 34, 8);
  for (let i = 0; i < 6; i++) { const a = i * 1.05 + rng() * 0.2; g.fillStyle(0xf0f6ea, 1); g.fillCircle(x + Math.cos(a) * 8, y - 34 + Math.sin(a) * 8, 2); }
  // A bench of shoes outside — the mourners sit in the house unshod.
  g.fillStyle(TIMBER, 1); g.fillRect(x + 30, y - 10, 46, 5);
  for (let i = 0; i < 6; i++) { g.fillStyle(i % 2 ? 0x5a4430 : 0x8a7a66, 1); g.fillEllipse(x + 35 + i * 7, y - 12, 5, 3); }
}

/** A tall iron lamp-standard with a crossbar of hooks and a lantern on each — the wick-keepers' charge. */
export function lampStandard(g: G, x: number, y: number, h: number, t = 0): void {
  shadow(g, x, y + 2, 24, 7);
  g.fillStyle(IRON, 1); g.fillRect(x - 6, y - 8, 12, 8);
  g.fillStyle(IRON, 1); g.fillRect(x - 2.5, y - h, 5, h);
  g.fillStyle(IRON_LIT, 0.8); g.fillRect(x - 1.5, y - h, 1.2, h);
  g.lineStyle(3, IRON, 1); g.lineBetween(x - 34, y - h + 6, x + 34, y - h + 6);
  for (const k of [-1, 1]) { g.lineStyle(2, IRON, 1); g.lineBetween(x, y - h + 24, x + k * 26, y - h + 6); }
  g.fillStyle(BRASS, 1); g.fillCircle(x, y - h - 4, 4);
  for (const k of [-30, -10, 10, 30]) soulLantern(g, x + k, y - h + 7, 0.75, 1, t);
}

/** A wick-keeper's ladder leaned against something: two rails, rungs, and a tin of trimmings hung on top. */
export function ladder(g: G, x: number, y: number, h: number, lean: number): void {
  const tx = x + lean;
  for (const k of [-1, 1]) {
    g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x + k * 9, y, tx + k * 6, y - h);
    g.lineStyle(1.5, TIMBER_LIT, 1); g.lineBetween(x + k * 9 - 1, y, tx + k * 6 - 1, y - h);
  }
  for (let r = 1; r < h / 14; r++) {
    const k = (r * 14) / h;
    const cx = x + (tx - x) * k, cy = y - h * k, hw = 9 - 3 * k;
    g.lineStyle(2, TIMBER, 1); g.lineBetween(cx - hw, cy, cx + hw, cy);
  }
  g.fillStyle(IRON_LIT, 1); g.fillRect(tx + 6, y - h + 10, 8, 9);
  g.lineStyle(1, IRON, 1); g.lineBetween(tx + 6, y - h + 10, tx + 3, y - h + 4);
  g.fillStyle(WICK, 1); for (let i = 0; i < 4; i++) g.fillRect(tx + 7 + i * 2, y - h + 8, 1, 3);
}

/**
 * The Feather Scale: a great bronze balance on the ledge over the gorge. One pan holds a single
 * white feather the length of an arm; the other a heart in a glass jar. Lanterns hang from the
 * beam's ends, and a brass plate on the pillar is worn smooth by people touching it on the way past.
 */
export function featherScale(g: G, x: number, y: number, s = 1, tilt = 0.08): void {
  shadow(g, x, y + 4, 140 * s, 22 * s);
  // Stepped base.
  g.fillStyle(LIME_DARK, 1); g.fillRect(x - 60 * s, y - 14 * s, 120 * s, 14 * s);
  g.fillStyle(LIME_LIT, 1); g.fillRect(x - 52 * s, y - 24 * s, 104 * s, 12 * s);
  // Pillar.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 9 * s, y - 170 * s, 18 * s, 148 * s);
  g.fillStyle(BRASS, 1); g.fillRect(x - 7 * s, y - 170 * s, 10 * s, 148 * s);
  g.fillStyle(BRASS_LIT, 0.8); g.fillRect(x - 5 * s, y - 168 * s, 2 * s, 140 * s);
  g.fillStyle(BRASS_LIT, 1); g.fillRect(x - 12 * s, y - 80 * s, 24 * s, 12 * s);
  // Beam.
  const by = y - 172 * s, L = 92 * s;
  const ex = Math.cos(tilt) * L, ey = Math.sin(tilt) * L;
  g.lineStyle(7 * s, BRASS_DARK, 1); g.lineBetween(x - ex, by - ey, x + ex, by + ey);
  g.lineStyle(4 * s, BRASS, 1); g.lineBetween(x - ex, by - ey - 1, x + ex, by + ey - 1);
  g.fillStyle(GOLD, 1); g.fillCircle(x, by, 8 * s);
  g.fillStyle(GOLD_LIT, 1); g.fillCircle(x - 2 * s, by - 2 * s, 3 * s);
  // Finial: a sun.
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.lineStyle(2, GOLD, 1); g.lineBetween(x, by - 22 * s, x + Math.cos(a) * 10 * s, by - 22 * s + Math.sin(a) * 10 * s); }
  g.fillStyle(GOLD_LIT, 1); g.fillCircle(x, by - 22 * s, 5 * s);
  // Pans on chains.
  for (const k of [-1, 1]) {
    const px = x + k * ex, py = by + k * ey;
    const panY = py + 64 * s;
    g.lineStyle(1.2, IRON, 1); g.lineBetween(px, py, px - 18 * s, panY); g.lineBetween(px, py, px + 18 * s, panY); g.lineBetween(px, py, px, panY);
    g.fillStyle(BRASS_DARK, 1); g.fillEllipse(px, panY + 2 * s, 46 * s, 12 * s);
    g.fillStyle(BRASS, 1); g.fillEllipse(px, panY, 44 * s, 10 * s);
    if (k < 0) feather(g, px - 20 * s, panY - 4 * s, 40 * s, -0.18, CREPE);
    else heartJar(g, px, panY - 1 * s, 1.1 * s, 0xd8505e, 0.6);
    soulLantern(g, px + k * 6 * s, py + 2 * s, 0.8 * s, 1, 0);
  }
}

/**
 * The wire capstan of the Thread-walk: a great timber drum on an iron frame with spokes for the
 * binders to push, coils of lantern-wire wound round it, and the new wires running off it up to
 * the north rim, taut.
 */
export function capstan(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 110, 26);
  g.fillStyle(IRON, 1); g.fillRect(x - 50, y - 12, 100, 12);
  g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(x, y - 14, 92, 30);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 40, y - 64, 80, 50);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 38, y - 64, 60, 50);
  // Wound wire, many turns.
  for (let k = 0; k < 11; k++) { g.lineStyle(1.5, k % 2 ? IRON_LIT : IRON, 1); g.lineBetween(x - 40, y - 60 + k * 4.4, x + 40, y - 58 + k * 4.4); }
  g.fillStyle(TIMBER_LIT, 1); g.fillEllipse(x, y - 64, 84, 24);
  g.fillStyle(TIMBER, 1); g.fillEllipse(x, y - 64, 64, 16);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y - 64, 6);
  // Push-spokes.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(x + Math.cos(a) * 26, y - 64 + Math.sin(a) * 8, x + Math.cos(a) * 66, y - 64 + Math.sin(a) * 21);
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(x + Math.cos(a) * 66, y - 64 + Math.sin(a) * 21, 3);
  }
  // Wires paying off up the gorge.
  for (let k = -2; k <= 2; k++) { g.lineStyle(1, IRON, 0.7); g.lineBetween(x + k * 8, y - 70, x + k * 30, y - 300); }
  // Spare coils on the ground.
  for (const [cx, cy] of [[x - 64, y - 4], [x + 62, y - 2]] as [number, number][]) {
    for (let r = 4; r < 14; r += 2.5) { g.lineStyle(1.3, IRON, 0.9); g.strokeEllipse(cx, cy - 4, r * 2, r); }
  }
}

/**
 * Medium Séance's parlour: a little round pavilion walled in glass (no curtains — Clarity), so the
 * séance table, its ring of candles, the planchette and the spirit cabinet with its doors taken off
 * are all on show to the lane. A violet glass dome on top.
 */
export function seanceParlour(g: G, x: number, y: number, w: number, h: number, t = 0): void {
  shadow(g, x, y + 4, w * 1.05, 22);
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(LIME_DARK, 1); g.fillRect(x0 - 4, y - 12, w + 8, 12);
  // Inside: floor, table, cabinet.
  g.fillStyle(0x4a3f5e, 1); g.fillRect(x0, top, w, h - 12);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 + 12, top + 10, 34, h - 34);
  g.fillStyle(0x2a2238, 1); g.fillRect(x0 + 16, top + 14, 26, h - 40);
  g.lineStyle(1, BRASS, 0.7); g.strokeRect(x0 + 16, top + 14, 26, h - 40);
  g.fillStyle(TIMBER, 1); g.fillEllipse(x + 12, y - 30, 70, 20);
  g.fillStyle(TIMBER_LIT, 1); g.fillEllipse(x + 12, y - 32, 66, 16);
  // Ouija letters and the planchette.
  for (let i = 0; i < 9; i++) { g.fillStyle(PAPER_DARK, 1); g.fillRect(x - 14 + i * 6, y - 35, 2, 2); }
  g.fillStyle(PAPER, 1); g.fillTriangle(x + 6, y - 28, x + 20, y - 28, x + 13, y - 38);
  g.fillStyle(GLASS, 0.8); g.fillCircle(x + 13, y - 31, 2);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; candle(g, x + 12 + Math.cos(a) * 30, y - 30 + Math.sin(a) * 8, 7, 3, true, t); }
  // Glass walls and leading.
  g.fillStyle(GLASS, 0.22); g.fillRect(x0, top, w, h - 12);
  g.lineStyle(2, BRASS_DARK, 1); g.strokeRect(x0, top, w, h - 12);
  for (let k = 1; k < 5; k++) g.lineBetween(x0 + (w * k) / 5, top, x0 + (w * k) / 5, y - 12);
  g.fillStyle(GLASS_LIT, 0.45); g.fillRect(x0 + 6, top + 6, 3, h - 30); g.fillRect(x0 + w * 0.6, top + 6, 2, h - 30);
  // The violet dome.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x0 - 6, top - 6, w + 12, 8);
  g.fillStyle(0x8a70c8, 0.85); g.fillEllipse(x, top - 6, w * 0.9, w * 0.6);
  g.fillStyle(ECTO, 0.6); g.fillEllipse(x - w * 0.15, top - 20, w * 0.25, w * 0.18);
  g.lineStyle(1.5, BRASS, 1);
  g.beginPath(); g.arc(x, top - 6, w * 0.45, Math.PI, 0, false); g.strokePath();
  for (let k = 1; k < 4; k++) { const a = Math.PI + (k / 4) * Math.PI; g.lineBetween(x + Math.cos(a) * w * 0.45, top - 6 + Math.sin(a) * w * 0.3, x, top - 6 - w * 0.3); }
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, top - 6 - w * 0.3 - 4, 4);
}

/**
 * The Wick Yard: Chandler Snuff's chandlery — two steaming wax vats on bricked fires, a dipping
 * frame hung with rows of half-dipped candles on their wicks, a stack of wick-reels, and the
 * chandlery's glass counter-house behind with its ledger of who is behind on their wax.
 */
export function wickYard(g: G, x: number, y: number, w: number, rng: () => number): void {
  shadow(g, x, y + 4, w * 1.1, 24);
  const x0 = x - w / 2;
  // The counter-house behind.
  g.fillStyle(LIME_DARK, 1); g.fillRect(x0 + 20, y - 120, w - 40, 96);
  g.fillStyle(LIME_LIT, 1); g.fillRect(x0 + 23, y - 120, w - 46, 96);
  g.fillStyle(WAX_DARK, 1); g.fillRect(x0 + 14, y - 130, w - 28, 12);
  g.fillStyle(GLASS, 0.45); g.fillRect(x0 + 34, y - 100, w - 68, 50);
  g.lineStyle(1.5, BRASS_DARK, 1); g.strokeRect(x0 + 34, y - 100, w - 68, 50);
  // Shelves of candles seen through the glass.
  for (let r = 0; r < 3; r++) for (let c = 0; c < (w - 80) / 7; c++) { g.fillStyle(r % 2 ? WAX : WAX_LIT, 1); g.fillRect(x0 + 40 + c * 7, y - 96 + r * 16, 3, 11); }
  // The ledger on the counter, open.
  g.fillStyle(PAPER, 1); g.fillRect(x - 14, y - 48, 28, 8);
  g.lineStyle(1, PAPER_DARK, 1); g.lineBetween(x, y - 48, x, y - 40);
  // The vats.
  for (const vx of [x0 + 24, x0 + w - 24]) {
    g.fillStyle(0x8a4a32, 1); g.fillRect(vx - 22, y - 18, 44, 18);
    for (let b = 0; b < 4; b++) { g.lineStyle(1, 0x5a2a1a, 1); g.lineBetween(vx - 22, y - 18 + b * 5, vx + 22, y - 18 + b * 5); }
    g.fillStyle(FLAME, 0.9); g.fillTriangle(vx - 8, y - 2, vx + 8, y - 2, vx, y - 12);
    g.fillStyle(IRON, 1); g.fillEllipse(vx, y - 26, 48, 20);
    g.fillStyle(IRON_LIT, 1); g.fillRect(vx - 24, y - 26, 48, 9);
    g.fillStyle(WAX_LIT, 1); g.fillEllipse(vx, y - 30, 40, 13);
    g.fillStyle(WAX, 1); g.fillEllipse(vx + 4, y - 29, 22, 6);
  }
  // The dipping frame: a timber gallows hung with candles.
  g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(x - 46, y - 2, x - 46, y - 66); g.lineBetween(x + 46, y - 2, x + 46, y - 66);
  g.lineStyle(5, TIMBER, 1); g.lineBetween(x - 52, y - 66, x + 52, y - 66);
  for (let i = 0; i < 9; i++) {
    const cx = x - 38 + i * 9.5;
    const len = 14 + ((i * 5) % 4) * 4 + rng() * 3;
    g.lineStyle(1, WICK, 1); g.lineBetween(cx, y - 66, cx, y - 58);
    g.fillStyle(WAX, 1); g.fillRect(cx - 2, y - 58, 4, len);
    g.fillStyle(WAX_LIT, 1); g.fillRect(cx - 2, y - 58, 1.2, len);
    g.fillStyle(WAX, 1); g.fillCircle(cx, y - 58 + len, 2);
  }
  // Wick reels.
  for (let i = 0; i < 3; i++) {
    const rx = x - 24 + i * 22;
    g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(rx, y - 6, 16, 6);
    g.fillStyle(WICK, 1); g.fillRect(rx - 6, y - 16, 12, 10);
    g.fillStyle(TIMBER, 1); g.fillEllipse(rx, y - 16, 16, 6);
  }
}

/** The paper-boat landing on the lake shore: a folding table, a stack of folded boats, a basket of lanterns. */
export function boatLanding(g: G, x: number, y: number): void {
  shadow(g, x, y + 3, 90, 16);
  // Boards of the landing stage.
  for (let k = 0; k < 6; k++) { g.fillStyle(k % 2 ? TIMBER : TIMBER_LIT, 1); g.fillRect(x - 46, y - 4 - k * 0, 92, 4); }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 30, y - 30, 4, 26); g.fillRect(x + 26, y - 30, 4, 26);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 36, y - 34, 72, 6);
  for (let i = 0; i < 4; i++) paperBoat(g, x - 14 + i * 2, y - 36 - i * 4, 0.45, 1);
  // The basket of unlit lanterns waiting to go across.
  g.fillStyle(0xb08a50, 1); g.fillEllipse(x + 40, y - 6, 26, 12);
  g.fillStyle(0x8a6a38, 1); g.fillRect(x + 27, y - 16, 26, 10);
  for (let i = 0; i < 3; i++) soulLantern(g, x + 33 + i * 7, y - 30, 0.45, 0.6, 0);
}

/** The court's waystone: a white stele carrying a brass lantern in a niche, a gilt sunburst on top. */
export function lanternWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 3, 44, 12);
  g.fillStyle(LIME_DARK, 1); g.fillRect(x - 16, y - 6, 32, 6);
  g.fillStyle(LIME_DARK, 1); g.fillRect(x - 12, y - 62, 24, 58);
  g.fillStyle(LIME_LIT, 1); g.fillRect(x - 10, y - 62, 16, 58);
  g.fillStyle(SOUL_DARK, 1); g.fillRoundedRect(x - 7, y - 50, 14, 20, { tl: 7, tr: 7, bl: 0, br: 0 });
  soulLantern(g, x, y - 50, 0.7, 1, 0);
  for (let i = 0; i < 8; i++) { const a = Math.PI + (i / 7) * Math.PI; g.lineStyle(1.5, GOLD, 1); g.lineBetween(x, y - 64, x + Math.cos(a) * 12, y - 64 + Math.sin(a) * 10); }
  g.fillStyle(GOLD_LIT, 1); g.fillCircle(x, y - 64, 4);
}

/**
 * The lantern-tree in Wick Square: an iron trunk branching into a dozen arms, a lantern on every
 * one, and round its foot a ring of brass rails where families tie white ribbons for the newly hung.
 */
export function lanternTree(g: G, x: number, y: number, t = 0): void {
  shadow(g, x, y + 4, 70, 18);
  g.lineStyle(2, BRASS, 1); g.strokeEllipse(x, y - 4, 76, 22);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const rx = x + Math.cos(a) * 38, ry = y - 4 + Math.sin(a) * 11;
    g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(rx, ry, rx, ry - 10);
    g.fillStyle(CREPE, 1); g.fillTriangle(rx, ry - 9, rx + 3, ry - 2, rx - 2, ry - 3);
  }
  g.fillStyle(IRON, 1); g.fillRect(x - 5, y - 150, 10, 146);
  g.fillStyle(IRON_LIT, 0.6); g.fillRect(x - 3, y - 150, 2, 146);
  const arms: [number, number][] = [[-56, -130], [56, -130], [-40, -150], [40, -150], [-66, -104], [66, -104], [-24, -168], [24, -168], [0, -176]];
  for (const [ax, ay] of arms) {
    g.lineStyle(2.5, IRON, 1);
    g.beginPath(); g.moveTo(x, y + ay + 26); g.lineTo(x + ax * 0.5, y + ay + 4); g.lineTo(x + ax, y + ay); g.strokePath();
    soulLantern(g, x + ax, y + ay, 0.8, 1, t);
  }
}

/** A wire's south anchor: a short brass-capped post on the cliff lip with its number in notches. */
export function wirePost(g: G, x: number, y: number, n: number): void {
  shadow(g, x, y + 2, 18, 5);
  g.fillStyle(IRON, 1); g.fillRect(x - 3.5, y - 26, 7, 26);
  g.fillStyle(BRASS, 1); g.fillRect(x - 6, y - 30, 12, 5);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 7, y - 20, 14, 9);
  g.fillStyle(BRASS_LIT, 1);
  const fives = Math.floor(n / 5), ones = n % 5;
  let px = x - 5;
  for (let i = 0; i < fives; i++) { g.fillRect(px, y - 19, 3, 7); px += 4; }
  for (let i = 0; i < ones; i++) { g.fillRect(px, y - 18, 1, 5); px += 2; }
  g.lineStyle(1, IRON, 0.8); g.lineBetween(x, y - 28, x, y - 60);
}

/** A stack of unfinished lantern frames by a shop door, and a crate of glass panes in straw. */
export function frameStack(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 40, 10);
  for (let i = 0; i < 4; i++) {
    const fx = x - 10 + (i % 2) * 14, fy = y - i * 10;
    g.lineStyle(1.4, BRASS_DARK, 1); g.strokeRect(fx - 6, fy - 12, 12, 12); g.lineBetween(fx - 6, fy - 12, fx + 6, fy);
  }
  g.fillStyle(TIMBER, 1); g.fillRect(x + 12, y - 12, 18, 12);
  g.fillStyle(0xe8d08a, 1); g.fillRect(x + 12, y - 14, 18, 3);
  for (let i = 0; i < 4; i++) { g.fillStyle(GLASS, 0.8); g.fillRect(x + 14 + i * 4, y - 20 + rng() * 2, 2, 8); }
}

/** A drying rack of paper lantern shades on the lane, a few blown sideways. */
export function shadeRack(g: G, x: number, y: number, tint: number): void {
  shadow(g, x, y + 2, 60, 10);
  g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(x - 28, y, x - 28, y - 40); g.lineBetween(x + 28, y, x + 28, y - 40);
  g.lineStyle(1, IRON, 1); g.lineBetween(x - 30, y - 38, x + 30, y - 38);
  for (let i = 0; i < 5; i++) {
    const sx = x - 22 + i * 11;
    g.lineStyle(0.8, IRON, 1); g.lineBetween(sx, y - 38, sx, y - 34);
    g.fillStyle(mixC(PAPER, tint, (i % 3) * 0.15), 1); g.fillRoundedRect(sx - 4.5, y - 34, 9, 13, 4);
    g.lineStyle(0.6, PAPER_DARK, 0.7); g.lineBetween(sx - 4.5, y - 29, sx + 4.5, y - 29);
  }
}

/** The lake's dark water, its pale stone kerb, and the drowned glimmer of fallen lanterns on the bottom. */
export function lakeBed(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  g.fillStyle(LIME_DARK, 1); g.fillRoundedRect(x - 14, y - 14, w + 28, h + 28, 40);
  g.fillStyle(LIME_LIT, 1); g.fillRoundedRect(x - 8, y - 8, w + 16, h + 16, 36);
  g.fillStyle(LAKE_DEEP, 1); g.fillRoundedRect(x, y, w, h, 30);
  g.fillStyle(0x3d5a6c, 1); g.fillRoundedRect(x + 18, y + 14, w - 36, h - 28, 26);
  for (let i = 0; i < 18; i++) {
    const lx = x + 40 + rng() * (w - 80), ly = y + 30 + rng() * (h - 60);
    g.fillStyle(SOUL, 0.12); g.fillCircle(lx, ly, 6 + rng() * 6);
    g.fillStyle(SOUL_LIT, 0.25); g.fillCircle(lx, ly, 1.5);
  }
  // Sheen of the glare on the still water.
  g.fillStyle(LIME_LIT, 0.08); g.fillEllipse(x + w * 0.45, y + h * 0.4, w * 0.6, h * 0.25);
  g.lineStyle(1, LAKE_DEEP, 0.5); g.strokeRoundedRect(x, y, w, h, 30);
}
