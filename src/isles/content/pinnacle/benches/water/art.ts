import Phaser from 'phaser';
import { type G, dim, lit, mixC } from '../../../../art/IsleArt';
import { OBS, crackPath, seam, shard, slab } from '../../../../art/PinnacleArt';
import {
  BRASS, BRASS_DARK, BRASS_LIT, DROWNED, DROWNED_DARK, FOAM, KELP, KELP_LIT, SEA_HIGH, SEA_LOW, SEA_MID, STILL, STILL_SHEEN,
  TIDE, TIDE_DEEP, TIDE_LIT, TIDE_PALE, VERDIGRIS,
} from './palette';

/**
 * The Tide Bench's drawings — the room, its seats, the Tide-Clock and the sleepers — shared by the
 * area painter, the arena floor, the decrees and the intro cinematic. Everything is black glass
 * from `PinnacleArt`; the sea is only ever light through it, inlay in it, or something kept in it.
 */

const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

/** A vertical gradient in flat bands. */
function bands(g: G, x: number, y: number, w: number, h: number, top: number, bottom: number, n = 12): void {
  for (let i = 0; i < n; i++) {
    g.fillStyle(mixC(top, bottom, i / (n - 1)), 1);
    g.fillRect(x, y + (h * i) / n, w, h / n + 1);
  }
}

/**
 * One pane of the window-walls: the open sea pressing on the glass. Bands of blue down to black,
 * shafts of light from the surface far above, a far reef and kelp at the foot, motes hanging in the
 * water — then the obsidian frame round it with a pale edge and one violet crack where the sea
 * leans hardest. `x, y` top-left.
 */
export function seaPane(g: G, x: number, y: number, w: number, h: number, rng: () => number, depth = 0.5): void {
  const top = mixC(SEA_HIGH, SEA_MID, depth), bottom = mixC(SEA_MID, SEA_LOW, 0.4 + depth * 0.6);
  bands(g, x, y, w, h, top, bottom, 10);
  // Light shafts from the surface, leaning together.
  for (let i = 0; i < 3; i++) {
    const sx = x + w * (0.15 + rng() * 0.7), sw = 8 + rng() * 16, lean = (rng() - 0.5) * w * 0.5;
    g.fillStyle(TIDE_PALE, 0.05 + rng() * 0.05);
    g.fillPoints([P(sx - sw, y), P(sx + sw, y), P(sx + sw * 2.2 + lean, y + h), P(sx - sw * 0.4 + lean, y + h)], true);
  }
  // The far reef, a darker skyline along the foot.
  g.fillStyle(dim(SEA_LOW, 0.3), 0.85);
  let rx = x;
  while (rx < x + w) {
    const rw = 14 + rng() * 26, rh = h * (0.06 + rng() * 0.14);
    g.fillEllipse(rx + rw / 2, y + h - rh * 0.3, rw * 1.3, rh * 1.6);
    rx += rw;
  }
  // Kelp fronds swaying up from the foot.
  for (let i = 0; i < Math.max(2, Math.round(w / 40)); i++) {
    const kx = x + 8 + rng() * (w - 16), kh = h * (0.25 + rng() * 0.4);
    const c = rng() < 0.5 ? KELP : KELP_LIT;
    g.lineStyle(3 + rng() * 2, c, 0.9);
    g.beginPath(); g.moveTo(kx, y + h);
    for (let k = 1; k <= 6; k++) g.lineTo(kx + Math.sin(k * 1.3 + kx) * 6, y + h - (kh * k) / 6);
    g.strokePath();
    for (let k = 2; k <= 5; k++) { g.fillStyle(c, 0.9); g.fillEllipse(kx + Math.sin(k * 1.3 + kx) * 6 + 5, y + h - (kh * k) / 6, 9, 4); }
  }
  // Motes hanging in the water.
  for (let i = 0; i < (w * h) / 900; i++) { g.fillStyle(TIDE_LIT, 0.15 + rng() * 0.25); g.fillCircle(x + rng() * w, y + rng() * h, 0.6 + rng() * 0.9); }
  // The glass itself: a long diagonal sheen.
  g.fillStyle(0xffffff, 0.035);
  g.fillPoints([P(x, y + h * 0.1), P(x + w * 0.35, y), P(x + w * 0.55, y), P(x, y + h * 0.55)], true);
  // The obsidian frame.
  const f = 7;
  g.fillStyle(OBS.glass, 1);
  g.fillRect(x - f, y - f, w + f * 2, f); g.fillRect(x - f, y + h, w + f * 2, f);
  g.fillRect(x - f, y, f, h); g.fillRect(x + w, y, f, h);
  g.lineStyle(1.2, OBS.edge, 0.55); g.strokeRect(x, y, w, h);
  g.lineStyle(1, OBS.edge, 0.2); g.strokeRect(x - f, y - f, w + f * 2, h + f * 2);
  // Where the sea leans hardest the glass has started to give.
  if (rng() < 0.6) {
    const cx = x + (rng() < 0.5 ? 4 : w - 4), cy = y + h * (0.2 + rng() * 0.6);
    seam(g, crackPath({ x: cx, y: cy }, { x: cx + (cx < x + w / 2 ? 1 : -1) * w * (0.2 + rng() * 0.3), y: cy + (rng() - 0.5) * h * 0.3 }, rng, 5, 4), 0.9, 0.7);
  }
}

/** A great whale passing outside the glass, as a shape only: dim, huge, slow. `dir` ±1; `t` seconds. */
export function whale(g: G, x: number, y: number, s: number, dir: number, t: number, a = 0.6): void {
  const body = dim(SEA_LOW, 0.35);
  const sway = Math.sin(t * 0.9) * 0.18;
  const px = (dx: number, dy: number) => P(x + dx * s * dir, y + dy * s);
  g.fillStyle(body, a);
  g.fillPoints([px(-120, -6), px(-60, -30), px(40, -34), px(110, -18), px(130, 4), px(100, 24), px(10, 30), px(-80, 18)], true);
  // Flukes, swaying.
  const fy = Math.sin(t * 0.9) * 14;
  g.fillPoints([px(-118, -4), px(-170, -30 + fy), px(-150, 0 + fy * 0.4), px(-172, 26 + fy), px(-116, 6)], true);
  // Pectoral fin and the paler throat grooves.
  g.fillPoints([px(40, 18), px(10, 54 + sway * 40), px(-6, 46 + sway * 30), px(18, 20)], true);
  g.lineStyle(1.2 * s, mixC(body, SEA_MID, 0.6), a * 0.8);
  for (let i = 0; i < 5; i++) g.lineBetween(x + (30 + i * 14) * s * dir, y + 18 * s, x + (60 + i * 12) * s * dir, y + 24 * s);
  // An eye that catches the light from the bench.
  g.fillStyle(TIDE_LIT, a * 0.7); g.fillCircle(x + 92 * s * dir, y - 4 * s, 2.2 * s);
  // Barnacles.
  g.fillStyle(mixC(body, TIDE_LIT, 0.25), a * 0.7);
  for (let i = 0; i < 6; i++) g.fillCircle(x + (60 - i * 18) * s * dir, y - (26 - (i % 2) * 6) * s, 1.6 * s);
}

/** A long serpent of the deep threading past: a chain of bodies on a wave, a ridge of fins, one pale eye. */
export function serpent(g: G, x: number, y: number, s: number, t: number, a = 0.55, len = 22): void {
  const body = dim(SEA_LOW, 0.25);
  for (let i = len - 1; i >= 0; i--) {
    const bx = x + Math.sin(t * 1.1 - i * 0.45) * 26 * s, by = y + i * 15 * s;
    const r = (14 - i * 0.45) * s;
    if (r <= 1) continue;
    g.fillStyle(body, a); g.fillCircle(bx, by, r);
    if (i % 2 === 0) { g.fillStyle(body, a); g.fillTriangle(bx - r, by, bx - r - 9 * s, by + 6 * s, bx - r * 0.4, by + 7 * s); }
  }
  g.fillStyle(TIDE_LIT, a * 0.8); g.fillCircle(x + Math.sin(t * 1.1) * 26 * s + 5 * s, y - 4 * s, 2.4 * s);
}

/** Black still water: a dark sheet with a pale rim, a long reflected shine and the tide-light under it. */
export function stillPool(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  g.fillStyle(STILL, 1); g.fillRect(x, y, w, h);
  bands(g, x, y, w, h, mixC(STILL, TIDE_DEEP, 0.25), STILL, 8);
  // Something under it: a faint violet seam far down, and drowned tide-light.
  for (let i = 0; i < 3; i++) {
    const a = { x: x + rng() * w, y: y + h * (0.3 + rng() * 0.5) };
    seam(g, crackPath(a, { x: a.x + (rng() - 0.5) * w * 0.6, y: a.y + (rng() - 0.5) * h * 0.4 }, rng, 6, 5), 0.8, 0.22, 0, TIDE);
  }
  // The reflection of the window light, long and broken.
  for (let i = 0; i < 6; i++) {
    const ry = y + h * (0.15 + i * 0.13);
    g.fillStyle(STILL_SHEEN, 0.5 - i * 0.05);
    g.fillRect(x + w * (0.1 + rng() * 0.2), ry, w * (0.3 + rng() * 0.35), 2);
  }
  g.lineStyle(1.4, OBS.edge, 0.45); g.strokeRect(x, y, w, h);
}

/**
 * Glass stairs going down into still black water: `n` steps from `(x, y)` (top-left of the top
 * step) running `dir` ('s' = down toward +y, 'e' = toward +x), each one sinking deeper, the last
 * ones only a pale edge-line under the water.
 */
export function glassSteps(g: G, x: number, y: number, w: number, stepD: number, n: number, dir: 's' | 'e' | 'w' | 'n'): void {
  for (let i = 0; i < n; i++) {
    const sunk = i / (n - 1 || 1);
    const face = mixC(OBS.facet, STILL, sunk * 0.85);
    let rx = x, ry = y, rw = w, rh = stepD;
    if (dir === 's') ry = y + i * stepD;
    else if (dir === 'n') ry = y - i * stepD;
    else { rw = stepD; rh = w; rx = dir === 'e' ? x + i * stepD : x - i * stepD; }
    g.fillStyle(face, 1); g.fillRect(rx, ry, rw, rh);
    g.fillStyle(mixC(OBS.sheen, STILL, sunk), 1);
    if (dir === 's' || dir === 'n') g.fillRect(rx, ry, rw, Math.max(2, stepD * 0.22)); else g.fillRect(rx, ry, Math.max(2, stepD * 0.22), rh);
    g.lineStyle(1, mixC(OBS.edge, TIDE, sunk), 0.7 * (1 - sunk * 0.6));
    if (dir === 's' || dir === 'n') g.lineBetween(rx, ry, rx + rw, ry); else g.lineBetween(rx, ry, rx, ry + rh);
    // The water line: from the third step down the water covers them.
    if (sunk > 0.3) { g.fillStyle(TIDE_DEEP, 0.25 * sunk); g.fillRect(rx, ry, rw, rh); }
  }
}

/** A tide-line run into the floor: a soft blue seam. */
export function tideInlay(g: G, pts: { x: number; y: number }[], a = 0.6, pulse = 0): void {
  seam(g, pts, 1.3, a, pulse, TIDE);
}

/** A flowing tide-line from a to b, a gentle S (for inlays). */
export function tideCurve(a: { x: number; y: number }, b: { x: number; y: number }, amp: number, steps = 14, phase = 0): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const nx = -(b.y - a.y), ny = b.x - a.x, len = Math.hypot(nx, ny) || 1;
  for (let i = 0; i <= steps; i++) {
    const f = i / steps, o = Math.sin(f * Math.PI * 2 + phase) * amp;
    pts.push({ x: a.x + (b.x - a.x) * f + (nx / len) * o, y: a.y + (b.y - a.y) * f + (ny / len) * o });
  }
  return pts;
}

/** A tithe-coin face in drowned brass: rim, a wave across it, a crown above the wave. */
export function titheCoin(g: G, x: number, y: number, r: number, a = 1): void {
  g.fillStyle(BRASS_DARK, a); g.fillCircle(x, y + r * 0.12, r);
  g.fillStyle(BRASS, a); g.fillCircle(x, y, r);
  g.lineStyle(Math.max(1, r * 0.1), BRASS_LIT, 0.8 * a); g.strokeCircle(x, y, r * 0.82);
  g.lineStyle(Math.max(1, r * 0.09), BRASS_DARK, a);
  g.beginPath();
  for (let i = 0; i <= 10; i++) { const fx = x - r * 0.6 + (r * 1.2 * i) / 10; const fy = y + r * 0.2 + Math.sin(i * 1.3) * r * 0.1; if (i === 0) g.moveTo(fx, fy); else g.lineTo(fx, fy); }
  g.strokePath();
  g.fillStyle(BRASS_DARK, a);
  g.fillPoints([P(x - r * 0.35, y - r * 0.05), P(x - r * 0.35, y - r * 0.4), P(x - r * 0.18, y - r * 0.22), P(x, y - r * 0.46), P(x + r * 0.18, y - r * 0.22), P(x + r * 0.35, y - r * 0.4), P(x + r * 0.35, y - r * 0.05)], true);
  g.fillStyle(VERDIGRIS, 0.5 * a); g.fillEllipse(x + r * 0.4, y + r * 0.45, r * 0.5, r * 0.25);
}

/** Each seat's element, inlaid in tide-light on its back. */
export function elementGlyph(g: G, el: string, x: number, y: number, s: number, color: number = TIDE_LIT, a = 1): void {
  g.lineStyle(Math.max(1.2, 2.2 * s), color, a);
  switch (el) {
    case 'water':
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        for (let i = 0; i <= 12; i++) { const fx = x - 12 * s + (24 * s * i) / 12, fy = y - 8 * s + k * 8 * s + Math.sin(i * 0.9) * 2.6 * s; if (i === 0) g.moveTo(fx, fy); else g.lineTo(fx, fy); }
        g.strokePath();
      }
      break;
    case 'ice':
      for (let k = 0; k < 6; k++) {
        const an = (k / 6) * Math.PI * 2, ex = x + Math.cos(an) * 13 * s, ey = y + Math.sin(an) * 13 * s;
        g.lineBetween(x, y, ex, ey);
        const mx = x + Math.cos(an) * 8 * s, my = y + Math.sin(an) * 8 * s;
        g.lineBetween(mx, my, mx + Math.cos(an + 0.7) * 4 * s, my + Math.sin(an + 0.7) * 4 * s);
        g.lineBetween(mx, my, mx + Math.cos(an - 0.7) * 4 * s, my + Math.sin(an - 0.7) * 4 * s);
      }
      break;
    case 'depths':
      // An angler's lure: a stalk curling over to a bulb, a hook under it.
      g.beginPath(); g.arc(x - 2 * s, y + 2 * s, 10 * s, Math.PI * 0.95, Math.PI * 1.9, false); g.strokePath();
      g.fillStyle(color, a); g.fillCircle(x + 8 * s, y - 2 * s, 3.6 * s);
      g.beginPath(); g.arc(x - 4 * s, y + 10 * s, 5 * s, Math.PI * 1.9, Math.PI * 1.1, false); g.strokePath();
      break;
    case 'oil':
      g.beginPath(); g.moveTo(x, y - 12 * s); g.lineTo(x - 8 * s, y + 2 * s); g.arc(x, y + 4 * s, 8.2 * s, Math.PI * 0.95, Math.PI * 0.05, true); g.lineTo(x, y - 12 * s); g.strokePath();
      for (let k = 0; k < 8; k++) { const an = (k / 8) * Math.PI * 2; g.lineBetween(x + Math.cos(an) * 12 * s, y + 4 * s + Math.sin(an) * 12 * s, x + Math.cos(an) * 15 * s, y + 4 * s + Math.sin(an) * 15 * s); }
      break;
    case 'ink':
      // A quill's nib with its slit and breather hole.
      g.beginPath(); g.moveTo(x, y + 13 * s); g.lineTo(x - 8 * s, y - 2 * s); g.lineTo(x - 5 * s, y - 13 * s); g.lineTo(x + 5 * s, y - 13 * s); g.lineTo(x + 8 * s, y - 2 * s); g.lineTo(x, y + 13 * s); g.strokePath();
      g.lineBetween(x, y + 13 * s, x, y - 2 * s);
      g.strokeCircle(x, y - 4 * s, 2.2 * s);
      break;
    case 'cloth':
      // A sail-needle with a loop of thread through its eye.
      g.lineBetween(x - 12 * s, y + 12 * s, x + 10 * s, y - 10 * s);
      g.strokeEllipse(x + 11 * s, y - 11 * s, 4 * s, 6 * s);
      g.beginPath(); g.arc(x + 2 * s, y - 4 * s, 11 * s, -Math.PI * 0.2, Math.PI * 0.9, false); g.strokePath();
      break;
    default:
      g.strokeCircle(x, y, 10 * s);
  }
}

/**
 * A councilor's seat: a tall chair of black glass on a stepped plinth, the element's glyph inlaid in
 * tide-light up its back, a brass name-plate on the plinth and a slick of sea-light pooled under
 * it. `x` centre, `y` the plinth's front base. ~120 wide, ~230 tall at s = 1.
 */
export function seatChair(g: G, x: number, y: number, s: number, el: string, rng: () => number): void {
  g.fillStyle(0x000000, 0.45); g.fillEllipse(x, y + 4 * s, 150 * s, 30 * s);
  g.fillStyle(TIDE, 0.06); g.fillEllipse(x, y - 4 * s, 170 * s, 46 * s);
  // The plinth: two steps.
  slab(g, x, y, 128 * s, 22 * s, rng, 1);
  slab(g, x, y - 22 * s, 104 * s, 18 * s);
  // The back: three shards, the middle tallest.
  const by = y - 40 * s;
  shard(g, x - 30 * s, by, 40 * s, 150 * s, -8 * s, 0.15);
  shard(g, x + 30 * s, by, 40 * s, 156 * s, 8 * s, 0.15);
  shard(g, x, by, 54 * s, 200 * s, 0, 0.3);
  // The chair's own back panel and seat.
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 32 * s, by - 96 * s, 64 * s, 70 * s);
  g.fillStyle(OBS.facet, 0.8); g.fillTriangle(x - 32 * s, by - 96 * s, x + 6 * s, by - 96 * s, x - 32 * s, by - 40 * s);
  g.lineStyle(1.2, OBS.edge, 0.55); g.strokeRect(x - 32 * s, by - 96 * s, 64 * s, 70 * s);
  slab(g, x - 40 * s, by + 2 * s, 16 * s, 40 * s);
  slab(g, x + 40 * s, by + 2 * s, 16 * s, 40 * s);
  slab(g, x, by + 2 * s, 66 * s, 22 * s);
  // The glyph, with its glow.
  g.fillStyle(TIDE, 0.1); g.fillCircle(x, by - 62 * s, 24 * s);
  elementGlyph(g, el, x, by - 62 * s, s * 1.1, TIDE_LIT, 0.95);
  // A tide-line running from the glyph down the seat, into the plinth, out on the floor.
  seam(g, [{ x, y: by - 44 * s }, { x: x + 3 * s, y: by - 30 * s }, { x: x - 2 * s, y: by - 12 * s }, { x: x + 4 * s, y: y - 30 * s }, { x, y: y - 2 * s }], 1, 0.6, 0, TIDE);
  // A brass name-plate.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 20 * s, y - 15 * s, 40 * s, 9 * s);
  g.fillStyle(BRASS, 1); g.fillRect(x - 19 * s, y - 14.5 * s, 38 * s, 7 * s);
  g.lineStyle(1, BRASS_DARK, 0.9);
  for (let i = 0; i < 4; i++) g.lineBetween(x - 15 * s + i * 8 * s, y - 11 * s, x - 10 * s + i * 8 * s, y - 11 * s);
  // Drips down the plinth: the whole bench sweats sea.
  for (let i = 0; i < 4; i++) {
    const dx = x + (rng() - 0.5) * 110 * s;
    g.lineStyle(1, TIDE_LIT, 0.25); g.lineBetween(dx, y - 20 * s, dx, y - 20 * s + (6 + rng() * 10) * s);
  }
}

/** Ring points on an ellipse (the orrery's orbits are seen at an angle). */
const orbit = (cx: number, cy: number, rx: number, ry: number, a: number): { x: number; y: number } => ({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });

/**
 * The Tide-Clock's still parts: the floor dial (two brass rings with the twelve tide-hours and a
 * glyph at each), a stepped obsidian plinth, and a glass column full of trapped sea climbing to the
 * orrery's collar, with a clock-face on its front. `x` centre, `y` the plinth's front base; the
 * orrery head is at `y − 300·s`.
 */
export function tideClockBase(g: G, x: number, y: number, s: number, rng: () => number): void {
  tideClockDial(g, x, y, s, rng);
  tideClockBody(g, x, y, s, rng);
}

/** The Tide-Clock's floor dial alone (flat — the area bakes it into the ground). */
export function tideClockDial(g: G, x: number, y: number, s: number, rng: () => number): void {
  const dy = y - 30 * s;
  // The dial, inlaid round the foot.
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x, dy, 360 * s, 120 * s);
  g.lineStyle(5 * s, BRASS_DARK, 1); g.strokeEllipse(x, dy, 340 * s, 110 * s);
  g.lineStyle(2.4 * s, BRASS, 1); g.strokeEllipse(x, dy - 1, 340 * s, 110 * s);
  g.lineStyle(1.6 * s, BRASS, 0.8); g.strokeEllipse(x, dy, 280 * s, 88 * s);
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2;
    const p0 = orbit(x, dy, 140 * s, 44 * s, a), p1 = orbit(x, dy, 170 * s, 55 * s, a);
    g.lineStyle(h % 3 === 0 ? 3 * s : 1.5 * s, BRASS_LIT, 0.9); g.lineBetween(p0.x, p0.y, p1.x, p1.y);
    // A wave-mark for high water, a flat bar for low.
    const pm = orbit(x, dy, 156 * s, 50 * s, a + 0.26);
    g.lineStyle(1.2 * s, TIDE_LIT, 0.55);
    if (h % 2 === 0) { g.beginPath(); g.arc(pm.x - 3 * s, pm.y, 3 * s, Math.PI, 0, false); g.arc(pm.x + 3 * s, pm.y, 3 * s, Math.PI, 0, true); g.strokePath(); }
    else g.lineBetween(pm.x - 4 * s, pm.y, pm.x + 4 * s, pm.y);
  }
  // Verdigris weeping from the rings.
  for (let i = 0; i < 9; i++) { const p = orbit(x, dy, 170 * s, 55 * s, rng() * Math.PI * 2); g.fillStyle(VERDIGRIS, 0.35); g.fillEllipse(p.x, p.y + 3 * s, 10 * s, 4 * s); }
}

/** The Tide-Clock's standing body: plinth, the column of trapped sea, and its tide-face. */
export function tideClockBody(g: G, x: number, y: number, s: number, rng: () => number): void {
  // The plinth: three steps of black glass.
  slab(g, x, y, 190 * s, 26 * s, rng, 2);
  slab(g, x, y - 26 * s, 150 * s, 24 * s, rng, 1);
  slab(g, x, y - 50 * s, 104 * s, 22 * s);
  // The column: glass full of sea, brass-collared.
  const c0 = y - 72 * s, c1 = y - 280 * s, cw = 34 * s;
  g.fillStyle(OBS.glass, 1); g.fillRect(x - cw / 2 - 4 * s, c1, cw + 8 * s, c0 - c1);
  bands(g, x - cw / 2, c1, cw, c0 - c1, SEA_HIGH, TIDE_DEEP, 8);
  g.fillStyle(TIDE_LIT, 0.25); g.fillRect(x - cw / 2 + 4 * s, c1, 4 * s, c0 - c1);
  for (let i = 0; i < 10; i++) { g.fillStyle(TIDE_PALE, 0.5); g.fillCircle(x - cw / 3 + rng() * cw * 0.66, c1 + rng() * (c0 - c1), 1 + rng() * 1.6); }
  g.lineStyle(1.2, OBS.edge, 0.6); g.strokeRect(x - cw / 2 - 4 * s, c1, cw + 8 * s, c0 - c1);
  for (const cy of [c0, c0 - 70 * s, c1 + 40 * s, c1]) {
    g.fillStyle(BRASS_DARK, 1); g.fillRect(x - cw / 2 - 8 * s, cy - 5 * s, cw + 16 * s, 10 * s);
    g.fillStyle(BRASS, 1); g.fillRect(x - cw / 2 - 8 * s, cy - 5 * s, cw + 16 * s, 4 * s);
    for (let k = 0; k < 4; k++) { g.fillStyle(BRASS_LIT, 1); g.fillCircle(x - cw / 2 - 3 * s + k * (cw + 6 * s) / 3, cy + 1 * s, 1.4 * s); }
  }
  // The tide-face on the column: twelve hours of water, its numerals as wave-marks.
  const fy = y - 150 * s, fr = 40 * s;
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, fy + 2 * s, fr + 6 * s);
  g.fillStyle(BRASS, 1); g.fillCircle(x, fy, fr + 5 * s);
  g.fillStyle(OBS.glass, 1); g.fillCircle(x, fy, fr);
  g.fillStyle(TIDE_DEEP, 0.9); g.fillCircle(x, fy, fr * 0.92);
  g.fillStyle(TIDE, 0.25); g.fillRect(x - fr * 0.9, fy + fr * 0.1, fr * 1.8, fr * 0.6);
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
    g.lineStyle(h % 3 === 0 ? 2.4 * s : 1.2 * s, BRASS_LIT, 0.9);
    g.lineBetween(x + Math.cos(a) * fr * 0.72, fy + Math.sin(a) * fr * 0.72, x + Math.cos(a) * fr * 0.9, fy + Math.sin(a) * fr * 0.9);
  }
}

/** The water-moons of the orrery and the sea-globe they turn round. */
const MOONS = [
  { rx: 150, ry: 42, r: 20, speed: 0.22, phase: 0 },
  { rx: 118, ry: 34, r: 15, speed: -0.31, phase: 2.1 },
  { rx: 186, ry: 52, r: 24, speed: 0.15, phase: 4 },
  { rx: 92, ry: 26, r: 12, speed: 0.44, phase: 1.2 },
];

/** A glass sphere of sea, its water tilted toward `towardA` (the globe pulling its tide). */
export function waterMoon(g: G, x: number, y: number, r: number, towardA: number, t: number): void {
  g.fillStyle(0x000000, 0.3); g.fillCircle(x + r * 0.15, y + r * 0.2, r);
  g.fillStyle(OBS.glass, 0.85); g.fillCircle(x, y, r);
  // The water: a chord across the sphere, its surface square to the pull.
  const nx = Math.cos(towardA), ny = Math.sin(towardA);
  const fill = 0.15 + 0.08 * Math.sin(t * 1.4 + x * 0.01);
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = towardA - Math.PI / 2 - 0.25 + (i / 16) * (Math.PI + 0.5);
    pts.push(P(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9));
  }
  pts.push(P(x - ny * r * 0.9 - nx * r * fill, y + nx * r * 0.9 - ny * r * fill));
  g.fillStyle(TIDE, 0.85); g.fillPoints(pts, true);
  g.fillStyle(TIDE_LIT, 0.6); g.fillCircle(x + nx * r * 0.45, y + ny * r * 0.45, r * 0.22);
  g.lineStyle(1.4, OBS.edge, 0.7); g.strokeCircle(x, y, r);
  g.fillStyle(0xffffff, 0.75); g.fillEllipse(x - r * 0.38, y - r * 0.42, r * 0.4, r * 0.24);
}

/**
 * The Tide-Clock's turning works: the orrery head over the column — two tilted brass orbits, four
 * glass moons of sea going round a sea-globe (each moon's water leaning toward the globe), the
 * escapement ticking, and the tide-hand going round the face. `t` seconds; `halt` 0–1 slows it all
 * to a stop (the cinematic stops the clock).
 */
export function tideClockWorks(g: G, x: number, y: number, s: number, t: number, halt = 0): void {
  const run = t * (1 - halt * 0.999);
  const hy = y - 300 * s;
  // The hand on the face.
  const fy = y - 150 * s, fr = 40 * s;
  const ha = run * 0.35 - Math.PI / 2;
  g.lineStyle(3 * s, BRASS_DARK, 1); g.lineBetween(x, fy, x + Math.cos(ha) * fr * 0.8, fy + Math.sin(ha) * fr * 0.8);
  g.lineStyle(1.6 * s, BRASS_LIT, 1); g.lineBetween(x, fy, x + Math.cos(ha) * fr * 0.8, fy + Math.sin(ha) * fr * 0.8);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, fy, 3.4 * s);
  // Orbit rings, back halves first.
  const ring = (rx: number, ry: number, front: boolean) => {
    const a0 = front ? 0 : Math.PI, a1 = front ? Math.PI : Math.PI * 2;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= 24; i++) pts.push(orbit(x, hy, rx * s, ry * s, a0 + ((a1 - a0) * i) / 24));
    g.lineStyle(4 * s, BRASS_DARK, 1); g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
    g.lineStyle(1.8 * s, BRASS, 1); g.beginPath(); g.moveTo(pts[0].x, pts[0].y - 1); for (const p of pts) g.lineTo(p.x, p.y - 1); g.strokePath();
  };
  const moons = MOONS.map((m) => {
    const a = m.phase + run * m.speed;
    return { m, a, p: orbit(x, hy, m.rx * s, m.ry * s, a) };
  });
  ring(150, 42, false); ring(186, 52, false);
  const drawMoon = (o: typeof moons[number]) => {
    g.lineStyle(2 * s, BRASS_DARK, 1); g.lineBetween(x, hy, o.p.x, o.p.y);
    g.lineStyle(1 * s, BRASS_LIT, 0.7); g.lineBetween(x, hy - 1, o.p.x, o.p.y - 1);
    waterMoon(g, o.p.x, o.p.y, o.m.r * s, Math.atan2(hy - o.p.y, x - o.p.x), t);
  };
  for (const o of moons) if (Math.sin(o.a) < 0) drawMoon(o);
  // The sea-globe: the biggest glass of all, a whole sea in it with a tiny drowned roof.
  const gr = 36 * s;
  g.fillStyle(TIDE, 0.08); g.fillCircle(x, hy, gr * 1.8);
  g.fillStyle(OBS.glass, 0.9); g.fillCircle(x, hy, gr);
  const lvl = Math.sin(run * 0.5) * gr * 0.15;
  g.fillStyle(TIDE_DEEP, 1); g.fillCircle(x, hy, gr * 0.92);
  g.fillStyle(OBS.glass, 0.9); g.fillRect(x - gr, hy - gr, gr * 2, gr * 0.85 - lvl);
  g.fillStyle(TIDE, 0.7); g.fillEllipse(x, hy - gr * 0.15 + -lvl, gr * 1.7, gr * 0.24);
  g.fillStyle(OBS.facet, 1); g.fillTriangle(x - 8 * s, hy + gr * 0.4, x + 8 * s, hy + gr * 0.4, x, hy + gr * 0.12);
  g.fillStyle(OBS.facet, 1); g.fillRect(x - 6 * s, hy + gr * 0.4, 12 * s, 9 * s);
  g.lineStyle(1.6, OBS.edge, 0.8); g.strokeCircle(x, hy, gr);
  g.fillStyle(0xffffff, 0.7); g.fillEllipse(x - gr * 0.4, hy - gr * 0.45, gr * 0.5, gr * 0.26);
  // The brass armature over the globe: a crown of four arcs.
  g.lineStyle(2.4 * s, BRASS, 1);
  g.beginPath(); g.arc(x, hy, gr + 5 * s, Math.PI * 1.05, Math.PI * 1.95, false); g.strokePath();
  g.lineBetween(x, hy - gr - 5 * s, x, hy - gr - 26 * s);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, hy - gr - 28 * s, 4 * s);
  // Escapement ticking at the collar.
  const tick = Math.floor(run * 2) % 2 === 0 ? 1 : -1;
  g.lineStyle(2 * s, BRASS_LIT, 1); g.lineBetween(x, hy + gr + 4 * s, x + tick * 10 * s, hy + gr + 16 * s);
  for (const o of moons) if (Math.sin(o.a) >= 0) drawMoon(o);
  ring(150, 42, true); ring(186, 52, true);
  // Drips falling off the moons.
  for (let i = 0; i < 4; i++) {
    const o = moons[i];
    const k = (t * 0.8 + i * 0.27) % 1;
    g.fillStyle(TIDE_LIT, 0.7 * (1 - k)); g.fillCircle(o.p.x, o.p.y + o.m.r * s + k * 60 * s, 1.6 * s);
  }
}

/**
 * A sleeper: one of the drowned the Undertow kept as ballast, curled in a bubble. `eyes` 0 shut – 1
 * wide open; `t` seconds drifts the hair; `tint` colours the bubble's light (a witness glows).
 */
export function sleeper(g: G, x: number, y: number, r: number, t: number, o: { eyes?: number; alpha?: number; tint?: number } = {}): void {
  const a = o.alpha ?? 1;
  const tint = o.tint ?? TIDE;
  const eyes = o.eyes ?? 0;
  g.fillStyle(tint, 0.08 * a); g.fillCircle(x, y, r * 1.35);
  g.fillStyle(mixC(TIDE_DEEP, STILL, 0.3), 0.55 * a); g.fillCircle(x, y, r);
  // Hair drifting up and over.
  g.lineStyle(Math.max(1, r * 0.05), DROWNED_DARK, 0.9 * a);
  for (let i = 0; i < 6; i++) {
    const hx = x - r * 0.12 + i * r * 0.06;
    g.beginPath(); g.moveTo(hx, y - r * 0.38);
    for (let k = 1; k <= 4; k++) g.lineTo(hx + Math.sin(t * 1.3 + i + k) * r * 0.1 + k * r * 0.05, y - r * 0.38 - k * r * 0.11);
    g.strokePath();
  }
  // Curled body: knees drawn up, arms round them.
  g.fillStyle(DROWNED_DARK, a); g.fillEllipse(x + r * 0.08, y + r * 0.22, r * 0.9, r * 0.66);
  g.fillStyle(DROWNED, a); g.fillEllipse(x + r * 0.04, y + r * 0.18, r * 0.82, r * 0.58);
  g.fillStyle(DROWNED, a); g.fillEllipse(x + r * 0.3, y + r * 0.12, r * 0.38, r * 0.5);
  g.lineStyle(Math.max(1, r * 0.06), DROWNED_DARK, 0.8 * a);
  g.beginPath(); g.arc(x + r * 0.1, y + r * 0.2, r * 0.32, -0.4, 1.9, false); g.strokePath();
  // Head bowed.
  g.fillStyle(DROWNED_DARK, a); g.fillCircle(x - r * 0.12, y - r * 0.2, r * 0.3);
  g.fillStyle(DROWNED, a); g.fillCircle(x - r * 0.14, y - r * 0.22, r * 0.27);
  if (eyes <= 0.05) {
    g.lineStyle(Math.max(1, r * 0.04), DROWNED_DARK, a);
    g.lineBetween(x - r * 0.26, y - r * 0.2, x - r * 0.18, y - r * 0.19);
    g.lineBetween(x - r * 0.1, y - r * 0.19, x - r * 0.02, y - r * 0.2);
  } else {
    for (const ex of [x - r * 0.22, x - r * 0.06]) {
      g.fillStyle(0xffffff, a); g.fillEllipse(ex, y - r * 0.2, r * 0.12, r * 0.12 * eyes);
      g.fillStyle(tint, a); g.fillCircle(ex, y - r * 0.2, r * 0.04 * eyes);
    }
  }
  // The bubble's skin: a bright rim, a window highlight, a lower rim of light.
  g.lineStyle(Math.max(1, r * 0.06), lit(tint, 0.4), 0.7 * a); g.strokeCircle(x, y, r);
  g.fillStyle(0xffffff, 0.6 * a); g.fillEllipse(x - r * 0.42, y - r * 0.5, r * 0.42, r * 0.22);
  g.lineStyle(Math.max(1, r * 0.04), FOAM, 0.35 * a);
  g.beginPath(); g.arc(x, y, r * 0.86, 0.4, 1.6, false); g.strokePath();
  // Small bubbles leaving it.
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.5 + i / 3) % 1;
    g.lineStyle(1, FOAM, 0.6 * (1 - k) * a); g.strokeCircle(x + r * 0.5 + Math.sin(t + i) * 3, y - r * 0.8 - k * r * 1.4, 1.4 + i);
  }
}

/** Water-drops and a ripple ring at (x, y), `k` 0–1 through the splash. */
export function splashRing(g: G, x: number, y: number, k: number, r = 26, color: number = TIDE_LIT): void {
  g.lineStyle(2 * (1 - k), color, 0.8 * (1 - k)); g.strokeEllipse(x, y, r * 2 * (0.3 + k), r * 0.8 * (0.3 + k));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.fillStyle(color, 0.8 * (1 - k));
    g.fillCircle(x + Math.cos(a) * r * k, y + Math.sin(a) * r * 0.4 * k - Math.sin(k * Math.PI) * 14, 1.8);
  }
}

export { BRASS, BRASS_DARK, BRASS_LIT, FOAM, TIDE, TIDE_DEEP, TIDE_LIT, TIDE_PALE };
