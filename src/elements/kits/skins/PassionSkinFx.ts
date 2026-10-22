import Phaser from 'phaser';
import { ColorFn, TAU, easeOut } from '../ElementVisuals';
import { DEV, holyRay, holyRayLayered, jitter } from '../PassionVisuals';

/**
 * The Passion skin's bespoke Devotion art: the love meter, the heart-topped staff (Mount
 * Crucifix), its aura, the dove-drawn chariot (Ascendance) and the heart chest (the Ark).
 *
 * Every function here has the exact signature of the Devotion painter it stands in for, so the
 * kit swaps them with a one-line `love ? a : b` and nothing about footprint, timing or hit area
 * moves. Colours go through the owner's `tint` like the originals, keyed on `DEV` — the Passion
 * palette already turns those into pinks and wine reds, so the art is drawn once, in Devotion's
 * own vocabulary, and lands in the skin's colours.
 */

const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

/**
 * A heart: the classic parametric curve, `size` ≈ half its width, centred on (x, y), its point
 * aimed along `ang + π/2` (so 0 is point-down). Built point by point — a heart out of two circles
 * and a triangle reads as a cartoon spade at this size.
 */
export function heartPoints(x: number, y: number, size: number, ang = 0, steps = 22): Phaser.Geom.Point[] {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < steps; i++) {
    const th = (i / steps) * TAU;
    const s = Math.sin(th);
    const u = (16 * s * s * s) / 16 * size;
    const v = (-(13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th)) / 16 + 0.18) * size;
    pts.push(P(x + ca * u - sa * v, y + sa * u + ca * v));
  }
  return pts;
}

/** A filled heart with a drop shadow, a lit lobe and a glint — the skin's stand-in for `cross`. */
export function heart(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, size: number, ang: number, color: number, alpha: number,
  outline = DEV.ink,
): void {
  if (alpha <= 0.01 || size <= 0.2) return;
  g.fillStyle(tint(outline), alpha * 0.55);
  g.fillPoints(heartPoints(x + 1, y + 1, size, ang), true);
  g.fillStyle(tint(color), alpha);
  g.fillPoints(heartPoints(x, y, size, ang), true);
  if (size >= 3) {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const lx = -size * 0.42, ly = -size * 0.38;
    g.fillStyle(tint(DEV.white), alpha * 0.7);
    g.fillCircle(x + ca * lx - sa * ly, y + sa * lx + ca * ly, size * 0.2);
  }
}

/** A double-thump heartbeat, 0–1: two quick swells then a rest. */
export function heartbeat(t: number, rate = 1.2): number {
  const p = (t * rate) % 1;
  const a = Math.max(0, 1 - Math.abs(p - 0.08) / 0.08);
  const b = Math.max(0, 1 - Math.abs(p - 0.28) / 0.09) * 0.7;
  return Math.max(a, b);
}

// ── Love meter (the faith bar) ───────────────────────────────────────────

/** 3×5 block glyphs for the meter's label. */
const GLYPHS: Record<string, string[]> = {
  L: ['100', '100', '100', '100', '111'],
  O: ['111', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '010'],
  E: ['111', '100', '110', '100', '111'],
};

function blockText(g: Phaser.GameObjects.Graphics, text: string, x: number, y: number, px: number): void {
  let cx = x;
  for (const ch of text) {
    const rows = GLYPHS[ch];
    if (!rows) { cx += px * 4; continue; }
    rows.forEach((row, r) => {
      for (let c = 0; c < 3; c++) if (row[c] === '1') g.fillRect(cx + c * px, y + r * px, px, px);
    });
    cx += px * 4;
  }
}

/**
 * The love meter over a victim's head, in place of the stained-glass faith bar: a wine-dark pill
 * labelled LOVE, filling with rose from the left behind a string of heart beads that light one by
 * one, a little heart standing on each quarter threshold that blooms and beats once crossed, and a
 * big heart capping the end that fills from the bottom with the meter and throbs when it is full.
 */
export function loveBar(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, w: number, h: number, ratio: number, t: number,
): void {
  const left = x - w / 2;
  const right = left + w;
  const top = y - 1;
  const bot = y + h + 1;
  const mid = (top + bot) / 2;
  const rad = (bot - top) / 2;
  const k = Phaser.Math.Clamp(ratio, 0, 1);
  const fill = w * k;
  const beat = heartbeat(t);

  // The LOVE plaque on the left.
  const px = 1.15;
  const labelW = px * 15;
  const lx = left - labelW - 5;
  g.fillStyle(tint(DEV.ink), 0.85);
  g.fillRoundedRect(lx - 2, mid - px * 2.5 - 1.6, labelW + 4, px * 5 + 3.2, 2);
  g.fillStyle(tint(k >= 1 ? DEV.white : DEV.pale), 1);
  blockText(g, 'LOVE', lx, mid - px * 2.5, px);

  // Pill frame with a drop shadow.
  g.fillStyle(tint(DEV.ink), 0.45);
  g.fillRoundedRect(left - 1, top + 0.5, w + 2, bot - top + 2, rad + 1);
  g.fillStyle(tint(DEV.ink), 0.92);
  g.fillRoundedRect(left - 1.5, top - 1.5, w + 3, bot - top + 3, rad + 1.5);
  g.fillStyle(tint(DEV.umber), 0.6);
  g.fillRoundedRect(left, top, w, bot - top, rad);
  // The rose fill: crimson body, a pink upper band, a blush shine.
  if (fill > 0.5) {
    g.fillStyle(tint(DEV.ochre), 1);
    g.fillRoundedRect(left, top, Math.max(fill, rad * 2), bot - top, rad);
    g.fillStyle(tint(DEV.gold), 1);
    g.fillRect(left + rad * 0.6, top + 0.6, Math.max(0, fill - rad * 1.2), (bot - top) * 0.55);
    g.fillStyle(tint(DEV.pale), 0.35 + 0.2 * beat);
    g.fillRect(left + rad * 0.6, top + 0.8, Math.max(0, fill - rad * 1.2), 1.1);
  }
  // Heart beads strung along it, lit up to the fill.
  const n = 7;
  for (let i = 0; i < n; i++) {
    const bx = left + (i + 0.5) * (w / n);
    const lit = bx <= left + fill;
    heart(g, tint, bx, mid, lit ? 2.6 + beat * 0.4 : 2.1, 0, lit ? DEV.pale : DEV.ochre, lit ? 1 : 0.5, DEV.ink);
  }
  // A small heart standing on each quarter threshold, bloomed once crossed.
  for (let i = 1; i < 4; i++) {
    const m = i / 4;
    const cx = left + w * m;
    const lit = k >= m;
    g.lineStyle(0.9, tint(DEV.ink), 0.9);
    g.lineBetween(cx, top - 1.5, cx, top - 3.5);
    if (lit) {
      g.fillStyle(tint(DEV.fire), 0.3);
      g.fillCircle(cx, top - 6.6, 4);
      heart(g, tint, cx, top - 6.4, 3.4 + beat * 0.6, Math.sin(t * 2 + i) * 0.12, DEV.fire, 1, DEV.ink);
    } else {
      heart(g, tint, cx, top - 6, 2.6, 0, DEV.umber, 0.8, DEV.ink);
    }
  }
  // The capping heart: fills from the bottom with the meter, throbs when full.
  const hx = right + 9;
  const hs = 6.2 * (k >= 1 ? 1 + beat * 0.18 : 1);
  if (k >= 1) {
    g.fillStyle(tint(DEV.holy), 0.25 + 0.2 * beat);
    g.fillCircle(hx, mid, 9.5);
  }
  g.fillStyle(tint(DEV.ink), 0.95);
  g.fillPoints(heartPoints(hx, mid, hs + 1.4), true);
  g.fillStyle(tint(DEV.umber), 1);
  g.fillPoints(heartPoints(hx, mid, hs), true);
  const pts = heartPoints(hx, mid, hs);
  const ys = pts.map((q) => q.y);
  const yTop = Math.min(...ys);
  const yBot = Math.max(...ys);
  const level = yBot - (yBot - yTop) * k;
  const clipped = pts.map((q) => P(q.x, Math.max(q.y, level)));
  g.fillStyle(tint(k >= 1 ? DEV.fire : DEV.gold), 1);
  g.fillPoints(clipped, true);
  g.fillStyle(tint(DEV.white), 0.75);
  g.fillCircle(hx - hs * 0.42, mid - hs * 0.3, hs * 0.18);
}

// ── Mount Crucifix → the heart staff ─────────────────────────────────────

/**
 * The heart staff, standing upright with its foot at (x, y), in place of the crucifix: a
 * cherrywood post wound in a pink ribbon, a bow at the throat, and a great beating heart on top
 * where the crossbeam was, its heart-shaped glow pulsing out. Same height and foot as the cross.
 */
export function heartStaff(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, alpha: number, t: number, rise = 1, scale = 1,
): void {
  const s = scale * (0.4 + easeOut(rise) * 0.6);
  const beat = heartbeat(t);
  // Shadow and the mound it is planted in.
  g.fillStyle(tint(DEV.ink), alpha * 0.35 * rise);
  g.fillEllipse(x + 4, y + 2, 26 * s, 8 * s);
  g.fillStyle(tint(DEV.woodDeep), alpha);
  g.fillEllipse(x, y, 20 * s, 7 * s);
  const hy = y - 48 * s;
  const neck = y - 38 * s;
  const w = 2.8 * s;
  // The post, tapering a little toward the heart.
  g.fillStyle(tint(DEV.woodDeep), alpha);
  g.fillPoints([P(x - w * 1.2, y), P(x - w * 0.8, neck), P(x + w * 0.8, neck), P(x + w * 1.2, y)], true);
  g.fillStyle(tint(DEV.wood), alpha);
  g.fillPoints([P(x - w * 1.2, y), P(x - w * 0.8, neck), P(x, neck), P(x, y)], true);
  // The ribbon winding up it.
  for (let i = 0; i < 5; i++) {
    const v0 = y - 4 * s - i * 7 * s;
    if (v0 - 5 * s < neck) break;
    g.fillStyle(tint(i % 2 ? DEV.gold : DEV.holy), alpha);
    g.fillPoints([P(x - w * 1.2, v0), P(x + w * 1.2, v0 - 3.6 * s), P(x + w * 1.2, v0 - 5.6 * s), P(x - w * 1.2, v0 - 2 * s)], true);
  }
  // Glow behind the heart.
  g.fillStyle(tint(DEV.holy), alpha * (0.14 + beat * 0.16) * rise);
  g.fillPoints(heartPoints(x, hy, (17 + beat * 4) * s), true);
  // A crown of short rays standing out round it.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + t * 0.4;
    holyRay(g, tint, x + Math.cos(a) * 12 * s, hy + Math.sin(a) * 12 * s, a, (5 + beat * 3) * s, 1.3 * s, DEV.pale, alpha * 0.6 * rise);
  }
  // The heart: wine rim, crimson body, rose face, blush lobe.
  const hs = 11 * s * (1 + beat * 0.08);
  g.fillStyle(tint(DEV.ink), alpha);
  g.fillPoints(heartPoints(x, hy, hs + 1.4 * s), true);
  g.fillStyle(tint(DEV.ochre), alpha);
  g.fillPoints(heartPoints(x, hy, hs), true);
  g.fillStyle(tint(DEV.gold), alpha);
  g.fillPoints(heartPoints(x - 1 * s, hy - 1 * s, hs * 0.8), true);
  g.fillStyle(tint(DEV.holy), alpha * 0.8);
  g.fillEllipse(x - hs * 0.42, hy - hs * 0.36, hs * 0.55, hs * 0.38);
  g.fillStyle(tint(DEV.white), alpha * (0.6 + beat * 0.4));
  g.fillCircle(x - hs * 0.5, hy - hs * 0.42, 1.6 * s);
  // The bow at its throat, tails swaying.
  const sway = Math.sin(t * 2.4) * 1.5 * s;
  const by = neck + 1 * s;
  g.fillStyle(tint(DEV.fire), alpha);
  g.fillTriangle(x, by, x - 7 * s, by - 3.5 * s, x - 6 * s, by + 3.5 * s);
  g.fillTriangle(x, by, x + 7 * s, by - 3.5 * s, x + 6 * s, by + 3.5 * s);
  g.fillPoints([P(x - 1 * s, by), P(x - 4 * s + sway, by + 10 * s), P(x - 2 * s + sway, by + 11 * s), P(x + 0.5 * s, by + 1 * s)], true);
  g.fillPoints([P(x + 1 * s, by), P(x + 5 * s + sway, by + 9 * s), P(x + 3 * s + sway, by + 10.5 * s), P(x - 0.5 * s, by + 1 * s)], true);
  g.fillStyle(tint(DEV.fireDeep), alpha);
  g.fillCircle(x, by, 1.8 * s);
}

/** The staff's aura: the crucifix ring, with hearts turning in it where the crosses were. */
export function heartAura(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, r: number, t: number, alpha: number, flare = 0,
): void {
  const beat = heartbeat(t);
  g.fillStyle(tint(DEV.holy), alpha * (0.07 + flare * 0.1 + beat * 0.03));
  g.fillCircle(x, y, r);
  g.fillStyle(tint(DEV.pale), alpha * 0.06);
  g.fillCircle(x, y, r * 0.7);
  g.lineStyle(4, tint(DEV.gold), alpha * (0.22 + flare * 0.3));
  g.strokeCircle(x, y, r);
  g.lineStyle(1.6, tint(DEV.white), alpha * (0.6 + flare * 0.3));
  g.strokeCircle(x, y, r - 1);
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + t * 0.25;
    heart(g, tint, x + Math.cos(a) * (r - 9), y + Math.sin(a) * (r - 9), 4.6 + beat * 0.6, a - Math.PI / 2,
      DEV.holy, alpha * 0.75, DEV.umber);
  }
  // Short rays standing out of the rim, pointing outward — "keep out", not "come in".
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU - t * 0.18;
    holyRay(g, tint, x + Math.cos(a) * r, y + Math.sin(a) * r, a, 9 + Math.sin(t * 3 + i) * 3,
      1.6, DEV.holy, alpha * 0.5);
  }
}

// ── Ascendance → the dove chariot ────────────────────────────────────────

/** One white dove in flight, facing `dir`, wings beating on `flap` (−1..1). */
function dove(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, dir: number, flap: number, alpha: number,
): void {
  // Far wing, behind.
  const wy = flap * 9;
  g.fillStyle(tint(DEV.pale), alpha * 0.85);
  g.fillPoints([P(x - dir * 2, y - 2), P(x - dir * 10, y - 4 - wy * 0.8), P(x - dir * 4, y - 6 - wy), P(x + dir * 3, y - 3)], true);
  // Tail fan.
  g.fillStyle(tint(DEV.pale), alpha);
  g.fillPoints([P(x - dir * 8, y), P(x - dir * 17, y - 4), P(x - dir * 18, y + 2), P(x - dir * 16, y + 5)], true);
  // Body: a plump teardrop.
  g.fillStyle(tint(DEV.white), alpha);
  g.fillEllipse(x, y, 20, 10);
  g.fillStyle(tint(DEV.pale), alpha * 0.7);
  g.fillEllipse(x - dir * 1, y + 2.4, 15, 4);
  // Head and beak.
  g.fillStyle(tint(DEV.white), alpha);
  g.fillCircle(x + dir * 9, y - 3, 4.2);
  g.fillStyle(tint(DEV.fire), alpha);
  g.fillTriangle(x + dir * 12.5, y - 4, x + dir * 12.5, y - 1.6, x + dir * 16, y - 2.6);
  g.fillStyle(tint(DEV.ink), alpha);
  g.fillCircle(x + dir * 10, y - 4, 0.9);
  // Near wing, over the body: a swept fan of three feathers.
  for (let f = 0; f < 3; f++) {
    const base = P(x - dir * 1, y - 2);
    const len = 15 - f * 3;
    const ang = -Math.PI / 2 - dir * (0.5 + f * 0.35) + flap * 0.7 * dir * -1;
    const tip = P(base.x + Math.cos(ang) * len * dir * dir, base.y + Math.sin(ang) * len);
    const nx = -Math.sin(ang) * 2.6, ny = Math.cos(ang) * 2.6;
    g.fillStyle(tint(f === 0 ? DEV.white : DEV.pale), alpha);
    g.fillPoints([P(base.x + nx, base.y + ny), tip, P(base.x - nx, base.y - ny)], true);
  }
}

/**
 * The chariot of love, running along `dir` (±1) with its front at (x, y), in place of the
 * flaming chariot: two white doves drawing a scallop-shell car on ribbon reins, the car's wheel
 * spoked with hearts, rose petals and little hearts streaming back off it where the fire was.
 * Same length and lane as the original, so the band it runs down still reads true.
 */
export function heartChariot(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, dir: number, t: number, alpha: number, rider = false,
): void {
  const back = dir > 0 ? Math.PI : 0;
  // The wake: pink flame tongues low and soft, with petals and hearts tumbling through them.
  for (let i = 0; i < 9; i++) {
    const oy = (jitter(i, 3) - 0.5) * 50;
    const ox = -dir * (30 + jitter(i, 7) * 60);
    const len = 46 + jitter(i, 11) * 60 + Math.sin(t * 18 + i) * 10;
    holyRay(g, tint, x + ox, y + oy, back + (jitter(i, 5) - 0.5) * 0.3, len, 7, DEV.fireDeep, alpha * 0.35);
    holyRay(g, tint, x + ox, y + oy, back + (jitter(i, 5) - 0.5) * 0.3, len * 0.7, 4, DEV.fire, alpha * 0.55);
  }
  for (let i = 0; i < 12; i++) {
    const d = ((t * 140 + jitter(i, 13) * 160) % 160);
    const px = x - dir * (40 + d);
    const py = y + (jitter(i, 17) - 0.5) * 56 + Math.sin(t * 6 + i) * 4;
    const a = alpha * (1 - d / 160);
    if (i % 3 === 0) heart(g, tint, px, py, 3.4, Math.sin(t * 4 + i) * 0.5, DEV.holy, a, DEV.umber);
    else {
      g.fillStyle(tint(i % 2 ? DEV.fire : DEV.gold), a);
      g.fillEllipse(px, py, 6, 3);
    }
  }
  // The doves, stacked and staggered where the horses ran.
  for (let h = 0; h < 2; h++) {
    const hx = x - dir * (4 + h * 14);
    const hy = y - 14 + h * 18 + Math.sin(t * 9 + h * 2) * 2;
    dove(g, tint, hx, hy, dir, Math.sin(t * 22 + h * 1.6), alpha);
  }
  // Ribbon reins back to the car, sagging and fluttering.
  const cx = x - dir * 44;
  const flutter = Math.sin(t * 14) * 2;
  g.lineStyle(1.8, tint(DEV.fire), alpha * 0.95);
  for (const [sy, ey] of [[y - 14, y - 6], [y + 4, y + 1]]) {
    const mx = (x - dir * 10 + cx + dir * 10) / 2;
    g.beginPath();
    g.moveTo(x - dir * 10, sy);
    g.lineTo(mx, (sy + ey) / 2 + 4 + flutter);
    g.lineTo(cx + dir * 10, ey);
    g.strokePath();
  }
  // The car: a scallop shell, ribbed, lip rolled toward the front.
  const shell: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    const a = Math.PI + u * Math.PI;
    shell.push(P(cx + Math.cos(a) * 15 * -dir, y + 2 + Math.sin(a) * 18 * (0.85 + 0.15 * Math.abs(Math.sin(u * Math.PI * 5)))));
  }
  shell.push(P(cx - 15 * dir, y + 6), P(cx + 15 * dir, y + 6));
  g.fillStyle(tint(DEV.umber), alpha);
  g.fillPoints(shell.map((q) => P(q.x + 1, q.y + 1.5)), true);
  g.fillStyle(tint(DEV.gold), alpha);
  g.fillPoints(shell, true);
  g.lineStyle(1, tint(DEV.ochre), alpha * 0.9);
  for (let i = 1; i < 5; i++) {
    const a = Math.PI + (i / 5) * Math.PI;
    g.lineBetween(cx, y + 5, cx + Math.cos(a) * 13 * -dir, y + 2 + Math.sin(a) * 15);
  }
  g.fillStyle(tint(DEV.pale), alpha * 0.7);
  g.fillEllipse(cx + dir * 4, y - 8, 7, 4);
  heart(g, tint, cx - dir * 2, y - 3, 4.6, 0, DEV.white, alpha, DEV.umber);
  if (rider) {
    // The lover, hauled aboard: a pink orb with a heart bobbing over it.
    g.fillStyle(tint(DEV.holy), alpha);
    g.fillCircle(cx - dir * 2, y - 20, 8);
    heart(g, tint, cx - dir * 2, y - 33 + Math.sin(t * 6) * 1.5, 4.4, 0, DEV.fire, alpha, DEV.ink);
  }
  // The wheel: a rim with five heart spokes turning round a heart hub.
  const wx = cx - dir * 2;
  const wy = y + 8;
  const spin = t * 22 * dir;
  g.lineStyle(3, tint(DEV.ochre), alpha);
  g.strokeCircle(wx, wy, 11);
  g.lineStyle(1, tint(DEV.pale), alpha * 0.8);
  g.strokeCircle(wx, wy, 9.6);
  for (let i = 0; i < 5; i++) {
    const a = spin + (i / 5) * TAU;
    g.fillStyle(tint(DEV.fire), alpha);
    g.fillPoints(heartPoints(wx + Math.cos(a) * 5.6, wy + Math.sin(a) * 5.6, 3, a - Math.PI / 2, 14), true);
  }
  heart(g, tint, wx, wy, 2.6, spin, DEV.white, alpha, DEV.umber);
}

// ── Mastery: the Ark → the heart chest ───────────────────────────────────

/**
 * The Ark's stand-in: the same chest on its carrying poles, but rose-lacquered with a heart
 * inlay, scalloped lace round the lid, and two kneeling cupids on the mercy seat holding a great
 * beating heart up between their wingtips, light pouring out of it. Same footprint, rise and
 * `stare` response as `arkOfCovenant`.
 */
export function loveArk(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, rise: number, t: number, stare: number, alpha = 1, scale = 1,
): void {
  const e = easeOut(Phaser.Math.Clamp(rise, 0, 1));
  if (e <= 0.01 || alpha <= 0.01) return;
  const s = scale;
  const by = y - (1 - e) * 60;
  const a = alpha * Math.min(1, e * 1.5);
  const W = 26 * s;
  const H = 16 * s;
  const D = 8 * s;
  const top = by - H;
  const beat = heartbeat(t, 1.1 + stare * 0.6);

  g.fillStyle(tint(DEV.ink), a * 0.35 * e);
  g.fillEllipse(x + 3, y + 3, W * 2.6, 10 * s);

  const pole = (py: number, lit: number): void => {
    g.fillStyle(tint(DEV.woodDeep), a);
    g.fillRect(x - W * 1.45, py - 1.8 * s, W * 2.9, 3.6 * s);
    g.fillStyle(tint(DEV.wood), a * lit);
    g.fillRect(x - W * 1.45, py - 1.8 * s, W * 2.9, 1.5 * s);
    heart(g, tint, x - W * 1.45, py, 2.6 * s, -Math.PI / 2, DEV.gold, a, DEV.ink);
    heart(g, tint, x + W * 1.45, py, 2.6 * s, Math.PI / 2, DEV.gold, a, DEV.ink);
  };
  pole(by - H * 0.55 - D * 0.6, 0.6);

  // Body and front face.
  g.fillStyle(tint(DEV.ochre), a);
  g.fillRect(x - W, top, W * 2, H);
  g.fillStyle(tint(DEV.gold), a);
  g.fillRect(x - W + 1.5 * s, top + 1.5 * s, W * 2 - 3 * s, H - 3 * s);
  g.fillStyle(tint(DEV.pale), a * 0.55);
  g.fillRect(x - W + 1.5 * s, top + 1.5 * s, 2.6 * s, H - 3 * s);
  // Little hearts studding the corners, a big heart inlay in the middle.
  for (const sx of [-1, 1]) {
    heart(g, tint, x + sx * W * 0.72, top + H * 0.32, 2.2 * s, 0, DEV.pale, a, DEV.umber);
    heart(g, tint, x + sx * W * 0.72, top + H * 0.72, 2.2 * s, 0, DEV.pale, a, DEV.umber);
  }
  g.fillStyle(tint(DEV.umber), a * 0.8);
  g.fillPoints(heartPoints(x, top + H * 0.5, 6.4 * s), true);
  heart(g, tint, x, top + H * 0.5, 5.4 * s, 0, DEV.fire, a, DEV.ink);
  // Feet.
  g.fillStyle(tint(DEV.ochre), a);
  g.fillRect(x - W, by, 5 * s, 3 * s);
  g.fillRect(x + W - 5 * s, by, 5 * s, 3 * s);
  // Lid, with a scalloped lace edge along its front.
  g.fillStyle(tint(DEV.holy), a);
  g.fillPoints([P(x - W, top), P(x + W, top), P(x + W - D * 0.4, top - D), P(x - W + D * 0.4, top - D)], true);
  g.fillStyle(tint(DEV.white), a * 0.9);
  for (let i = 0; i < 9; i++) g.fillCircle(x - W + (i + 0.5) * (W * 2 / 9), top + 0.6 * s, 2.1 * s);
  g.lineStyle(1, tint(DEV.umber), a * 0.6);
  g.strokeRect(x - W, top, W * 2, H);

  pole(by - H * 0.45, 1);

  // The heart the cupids hold up, light pouring out of it.
  const seatY = top - D * 0.5;
  const hy = seatY - 14 * s;
  for (let i = 0; i < 5; i++) {
    const ang = -Math.PI / 2 + (i - 2) * 0.2;
    holyRayLayered(g, tint, x + (i - 2) * 2 * s, hy - 4 * s, ang,
      (22 + stare * 26 + beat * 6) * s * (i === 2 ? 1.25 : 1), 3 * s, a * (0.4 + stare * 0.4));
  }
  for (const side of [-1, 1]) {
    const cx = x + side * W * 0.62;
    // Cupid: a small kneeling figure, a round head, arms reaching in to the heart.
    g.fillStyle(tint(DEV.gold), a);
    g.fillEllipse(cx, seatY - 3 * s, 7 * s, 9 * s);
    g.fillStyle(tint(DEV.holy), a);
    g.fillCircle(cx, seatY - 9 * s, 3 * s);
    g.fillStyle(tint(DEV.white), a * 0.8);
    g.fillCircle(cx - side * 1 * s, seatY - 9.6 * s, 1.2 * s);
    g.lineStyle(1.6 * s, tint(DEV.holy), a);
    g.lineBetween(cx - side * 2 * s, seatY - 5 * s, x - side * 6 * s, hy + 3 * s);
    // Wing: a small fan swept back and up, away from the heart.
    for (let f = 0; f < 3; f++) {
      const len = (12 - f * 2.5) * s;
      const ang = -Math.PI / 2 + side * (0.35 + f * 0.35);
      const base = P(cx + side * 1.5 * s, seatY - 6 * s);
      const tip = P(base.x + Math.cos(ang) * len, base.y + Math.sin(ang) * len);
      const nx = -Math.sin(ang) * 2.6 * s, ny = Math.cos(ang) * 2.6 * s;
      g.fillStyle(tint(f === 0 ? DEV.white : DEV.pale), a);
      g.fillPoints([P(base.x + nx, base.y + ny), tip, P(base.x - nx, base.y - ny)], true);
    }
  }
  const hs = (7 + beat * 1.2 + stare * 1.5) * s;
  g.fillStyle(tint(DEV.white), a * (0.25 + 0.25 * beat + stare * 0.25));
  g.fillPoints(heartPoints(x, hy, hs * 1.6), true);
  heart(g, tint, x, hy, hs, 0, DEV.fire, a, DEV.ink);
  g.fillStyle(tint(DEV.pale), a * 0.85);
  g.fillEllipse(x - hs * 0.4, hy - hs * 0.35, hs * 0.5, hs * 0.34);
}

// ── Voice lines ──────────────────────────────────────────────────────────

/** Devotion's floating text → the Passion skin's. Anything unlisted is printed as-is. */
export const LOVE_LINES: Record<string, string> = {
  '🕯️ KINDLED': '💗 SMITTEN',
  '🙏 FAITHFUL': '💞 BESOTTED',
  '✨ DEVOUT': '💘 LOVESTRUCK',
  '✝️ CONVERTED': '💘 HEARTSTOLEN',
  '📖 GREAT SERMON': '💌 GRAND SERENADE',
  '💣 HALLELUJAH': '💣 BE MINE',
  '✝️ CRUCIFIX': '💗 HEART STAFF',
  '✝️ IN HAND': '💗 IN HAND',
  '✝️ SET DOWN': '💗 SET DOWN',
  '✝️ BEHOLD': '💗 ADORE ME',
  '🔥 ASCENDANCE': '🕊️ CHARIOT OF LOVE',
  '🙌 TAKEN UP': '🕊️ SWEPT AWAY',
  '🙌 TAKEN UP · 🔥×3': '🕊️ SWEPT AWAY · 💗×3',
  '☄️ DESCENT': '💘 FALLING IN LOVE',
  '✨ ARK OF THE COVENANT': '💝 CHEST OF HEARTS',
};
