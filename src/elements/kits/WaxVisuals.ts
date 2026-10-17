import Phaser from 'phaser';
import { ArmHold, ArmPose, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeOut } from './ElementVisuals';

/**
 * Everything Wax draws.
 *
 * The element's read is *warm wax and the things that live in it*: every object the kit puts
 * on the floor is pale beeswax that drips, sags and catches the light, and everything that
 * flies is a bee. The one primitive that carries all of it is the drip — a sagging rounded
 * tongue of wax with a bulb at its end — and the one pattern is the comb: six-sided cells,
 * never circles, wherever the kit stores something (a hive's cells, a bomb's shell, a poison
 * mark, the halo on a mastered character).
 *
 * The palette runs cream → beeswax → honey → soot, with one orange for flame and one acid
 * green for poison. Nothing else is allowed in, so a candle, a hive and a bomb all read as
 * one element at arena zoom.
 */

export type WaxColorFn = ColorFn;

export const WAX = {
  soot: 0x2b2115,
  umber: 0x5a3f16,
  deep: 0x8d641c,
  honey: 0xd99518,
  honeyLit: 0xffbf3c,
  /** The element colour. */
  wax: 0xf2c85b,
  pale: 0xffefad,
  cream: 0xfff8dc,
  flame: 0xff8b24,
  flameCore: 0xfff1a6,
  ember: 0xff5a2a,
  bee: 0xe6b422,
  wing: 0xf7f3df,
  elite: 0xe83f36,
  eliteDark: 0x66110d,
  poison: 0x83cf42,
  poisonDeep: 0x3c7a1e,
  rope: 0x1a1410,
  /** A mastered apiarist's flame burns blue — the only cool colour in the element. */
  royal: 0x5fb6ff,
  /** The white-hot heart of the royal flame. */
  royalLit: 0xd4efff,
  /** Gilt for the mastered apiarist's crown. */
  gilt: 0xffd23a,
  giltDeep: 0xa8740e,
} as const;

/** Deterministic 0–1 noise so a candle's drips or a hive's bands never boil between frames. */
export function wnoise(seed: number, i: number): number {
  const v = Math.sin(seed * 57.3 + i * 191.7) * 33791.521;
  return v - Math.floor(v);
}

// ── Primitives ────────────────────────────────────────────────────────────

/** A six-sided cell, flat-topped. Uses whatever fill is set. */
export function combCell(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, rot = 0): void {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 6; i++) {
    const a = rot + Math.PI / 6 + (i / 6) * TAU;
    pts.push(new Phaser.Geom.Point(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  g.fillPoints(pts, true);
}

/** The outline of a cell. Uses whatever line style is set. */
export function strokeComb(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, rot = 0): void {
  g.beginPath();
  for (let i = 0; i <= 6; i++) {
    const a = rot + Math.PI / 6 + (i / 6) * TAU;
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
}

/**
 * The primitive: a drip of wax hanging from (x, y) — a rounded tongue that narrows on the way
 * down and swells into a bulb at the tip. `sag` 0→1 is how far it has run.
 */
export function waxDrip(
  g: Phaser.GameObjects.Graphics, tint: WaxColorFn,
  x: number, y: number, len: number, halfW: number, color: number, alpha: number, sag = 1,
): void {
  const l = len * sag;
  g.fillStyle(tint(color), alpha);
  g.fillPoints([
    new Phaser.Geom.Point(x - halfW, y),
    new Phaser.Geom.Point(x + halfW, y),
    new Phaser.Geom.Point(x + halfW * 0.55, y + l * 0.6),
    new Phaser.Geom.Point(x + halfW * 0.7, y + l),
    new Phaser.Geom.Point(x - halfW * 0.7, y + l),
    new Phaser.Geom.Point(x - halfW * 0.55, y + l * 0.6),
  ], true);
  g.fillCircle(x, y + l, halfW * 0.95);
  // One glint on the bulb so it reads as wet.
  g.fillStyle(tint(WAX.cream), alpha * 0.7);
  g.fillCircle(x - halfW * 0.3, y + l - halfW * 0.3, halfW * 0.28);
}

/** A bee in flight, nose along `heading`. Wings beat off `t`; `elite` is the red one. */
export function drawBee(
  g: Phaser.GameObjects.Graphics, tint: WaxColorFn,
  x: number, y: number, heading: number, t: number, seed: number, elite = false, alpha = 1, scale = 1,
): void {
  g.save();
  g.translateCanvas(x, y);
  g.rotateCanvas(heading);
  g.scaleCanvas(scale, scale);
  // Wings: two ovals angled back, beating fast and a little out of phase.
  const beat = Math.sin(t * 46 + seed * 7);
  g.fillStyle(tint(WAX.wing), alpha * 0.62);
  g.fillEllipse(-2, -5 - beat * 1.6, 9, 4.6);
  g.fillEllipse(-2, 5 + beat * 1.6, 9, 4.6);
  g.lineStyle(0.8, tint(WAX.soot), alpha * 0.35);
  g.strokeEllipse(-2, -5 - beat * 1.6, 9, 4.6);
  g.strokeEllipse(-2, 5 + beat * 1.6, 9, 4.6);
  // Body: a fat striped oval with a darker tail.
  g.fillStyle(tint(elite ? WAX.elite : WAX.bee), alpha);
  g.fillEllipse(0, 0, 13, 8);
  g.fillStyle(tint(elite ? WAX.eliteDark : WAX.soot), alpha);
  g.fillRect(-1.5, -3.6, 2.2, 7.2);
  g.fillRect(2.5, -3.2, 2, 6.4);
  g.fillEllipse(-5.5, 0, 3.4, 5.2);
  // Head, eye, antennae, stinger.
  g.fillStyle(tint(WAX.soot), alpha);
  g.fillCircle(6.4, 0, 2.8);
  g.fillStyle(tint(WAX.cream), alpha * 0.9);
  g.fillCircle(7, -1, 0.9);
  g.lineStyle(0.9, tint(WAX.soot), alpha);
  g.lineBetween(7.5, -1.5, 10, -3.6);
  g.lineBetween(7.5, 1.5, 10, 3.6);
  g.fillStyle(tint(WAX.soot), alpha);
  g.fillTriangle(-6.5, -1.2, -6.5, 1.2, -9.5, 0);
  g.restore();
}

/**
 * A planted candle. `life` 1→0 melts it down: the column shortens, the puddle widens, and
 * the drips lengthen. `lit` false paints a snuffed stub (the aura has gone).
 */
export function drawCandle(
  g: Phaser.GameObjects.Graphics, tint: WaxColorFn,
  x: number, y: number, life: number, t: number, seed: number, lit: boolean, alpha = 1,
): void {
  const h = 12 + 40 * life;
  const w = 11;
  const flick = 0.82 + Math.sin(t * 13 + seed) * 0.12 + Math.sin(t * 29 + seed * 3) * 0.06;
  // Ground: shadow, then the puddle of run wax that grows as the candle burns down.
  g.fillStyle(tint(WAX.soot), alpha * 0.35);
  g.fillEllipse(x + 3, y + 6, 34 + (1 - life) * 14, 12 + (1 - life) * 4);
  const pr = 13 + (1 - life) * 12;
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU;
    const rr = pr * (0.8 + wnoise(seed, i) * 0.4);
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + 3 + Math.sin(a) * rr * 0.45));
  }
  g.fillStyle(tint(WAX.pale), alpha * 0.95);
  g.fillPoints(pts, true);
  g.fillStyle(tint(WAX.cream), alpha * 0.5);
  g.fillEllipse(x - pr * 0.25, y + 2, pr * 0.7, pr * 0.22);
  // Column with a rounded, half-melted top.
  g.fillStyle(tint(WAX.deep), alpha * 0.9);
  g.fillRoundedRect(x - w / 2 - 1.5, y - h + 1, w + 3, h + 1, 3);
  g.fillStyle(tint(WAX.wax), alpha);
  g.fillRoundedRect(x - w / 2, y - h, w, h, 3);
  g.fillStyle(tint(WAX.pale), alpha * 0.9);
  g.fillRect(x - w / 2 + 2, y - h + 3, 2.6, h - 6);
  g.fillEllipse(x, y - h, w + 3, 6);
  // Drips down both sides, longer the more has burned.
  for (let i = 0; i < 3; i++) {
    const side = i % 2 ? 1 : -1;
    const top = y - h + 2 + wnoise(seed, 20 + i) * h * 0.35;
    waxDrip(g, tint, x + side * (w / 2 - 0.5), top, 6 + (1 - life) * 16 + wnoise(seed, 40 + i) * 6, 2.1, WAX.pale, alpha);
  }
  // Wick and flame.
  g.lineStyle(2, tint(WAX.soot), alpha);
  g.lineBetween(x, y - h, x, y - h - 6);
  if (!lit) return;
  const fy = y - h - 9;
  g.fillStyle(tint(WAX.flame), alpha * 0.22);
  g.fillCircle(x, fy - 2, 16 * flick);
  g.fillStyle(tint(WAX.flame), alpha * 0.95);
  g.fillPoints([
    new Phaser.Geom.Point(x - 4.5 * flick, fy + 3),
    new Phaser.Geom.Point(x + 4.5 * flick, fy + 3),
    new Phaser.Geom.Point(x + 1.2, fy - 6 * flick),
    new Phaser.Geom.Point(x + Math.sin(t * 17 + seed) * 1.5, fy - 13 * flick),
    new Phaser.Geom.Point(x - 1.2, fy - 6 * flick),
  ], true);
  g.fillStyle(tint(WAX.flameCore), alpha);
  g.fillEllipse(x, fy - 1, 4.2, 8 * flick);
  g.fillStyle(tint(WAX.cream), alpha * 0.9);
  g.fillEllipse(x, fy, 2, 3.4);
}

/** The candle's light on the floor: a warm pool with a slowly turning ring of comb cells. */
export function drawCandleAura(
  g: Phaser.GameObjects.Graphics, tint: WaxColorFn, x: number, y: number, r: number, t: number, alpha: number,
): void {
  const breathe = 1 + Math.sin(t * 2.3) * 0.02;
  g.fillStyle(tint(WAX.flame), alpha * 0.05);
  g.fillCircle(x, y, r * breathe);
  g.fillStyle(tint(WAX.wax), alpha * 0.06);
  g.fillCircle(x, y, r * 0.7 * breathe);
  g.lineStyle(1.6, tint(WAX.wax), alpha * 0.35);
  g.strokeCircle(x, y, r * breathe);
  const cells = 18;
  for (let i = 0; i < cells; i++) {
    const a = (i / cells) * TAU + t * 0.25;
    g.fillStyle(tint(WAX.pale), alpha * (0.25 + 0.25 * Math.sin(t * 3 + i)));
    combCell(g, x + Math.cos(a) * r * breathe, y + Math.sin(a) * r * breathe, 4, a);
  }
}

/**
 * A hive: a skep of stacked straw-coloured bands on a comb plate, five cells along the front
 * filling with honey as bees are stored. `honey` is 0–1 of the Honey Making bar, or null.
 */
export function drawHive(
  g: Phaser.GameObjects.Graphics, tint: WaxColorFn,
  x: number, y: number, cells: number, maxCells: number, honey: number | null, t: number, seed: number, alpha = 1,
): void {
  g.fillStyle(tint(WAX.soot), alpha * 0.35);
  g.fillEllipse(x + 3, y + 26, 62, 16);
  // Comb plate under the skep.
  g.fillStyle(tint(WAX.deep), alpha);
  g.fillEllipse(x, y + 22, 60, 18);
  g.fillStyle(tint(WAX.wax), alpha * 0.9);
  for (let i = -2; i <= 2; i++) combCell(g, x + i * 10, y + 22, 4.6);
  // The skep: bands narrowing upward, each with a darker underside line.
  const bands = 5;
  for (let i = 0; i < bands; i++) {
    const f = i / (bands - 1);
    const bw = 52 - f * 26;
    const by = y + 16 - i * 9;
    g.fillStyle(tint(WAX.umber), alpha * 0.85);
    g.fillEllipse(x, by + 2, bw + 3, 12);
    g.fillStyle(tint(i % 2 ? WAX.wax : WAX.honey), alpha);
    g.fillEllipse(x, by, bw, 11);
    g.fillStyle(tint(WAX.pale), alpha * 0.55);
    g.fillEllipse(x - bw * 0.18, by - 2, bw * 0.4, 3);
  }
  g.fillStyle(tint(WAX.honey), alpha);
  g.fillCircle(x, y - 24, 7);
  // Entrance arch.
  g.fillStyle(tint(WAX.soot), alpha * 0.95);
  g.fillEllipse(x, y + 12, 13, 10);
  g.fillStyle(tint(WAX.deep), alpha);
  g.fillRect(x - 6.5, y + 12, 13, 6);
  // The five cells, filled left to right; the full set pulses.
  const full = cells >= maxCells;
  for (let i = 0; i < maxCells; i++) {
    const cx = x - (maxCells - 1) * 6.5 + i * 13;
    const cy = y - 36;
    g.fillStyle(tint(WAX.soot), alpha * 0.8);
    combCell(g, cx, cy, 6.4);
    const filled = i < cells;
    const glow = full ? 0.8 + Math.sin(t * 6 + i) * 0.2 : 1;
    g.fillStyle(tint(filled ? WAX.honeyLit : WAX.umber), alpha * (filled ? glow : 0.9));
    combCell(g, cx, cy, 5);
    if (filled) {
      g.fillStyle(tint(WAX.cream), alpha * 0.6);
      g.fillCircle(cx - 1.5, cy - 1.5, 1.3);
    }
  }
  if (honey !== null) {
    // Honey trough: a framed wooden gauge with comb end-caps, the honey sloshing in it.
    const hw = 62, hx = x - hw / 2, hy = y - 27;
    const fill = Phaser.Math.Clamp(honey, 0, 1);
    g.fillStyle(tint(WAX.soot), alpha * 0.9);
    g.fillRoundedRect(hx - 3, hy - 1.5, hw + 6, 9, 4);
    g.fillStyle(tint(WAX.umber), alpha);
    g.fillRoundedRect(hx - 2, hy - 0.5, hw + 4, 7, 3);
    g.fillStyle(tint(WAX.soot), alpha * 0.85);
    g.fillRect(hx, hy + 0.8, hw, 4.4);
    if (fill > 0) {
      const fw = hw * fill;
      g.fillStyle(tint(WAX.honey), alpha);
      g.fillRect(hx, hy + 0.8, fw, 4.4);
      // A wavy lit surface along the top of the honey.
      g.fillStyle(tint(WAX.honeyLit), alpha);
      for (let sx = 0; sx < fw; sx += 4) {
        const wy = Math.sin(t * 4 + sx * 0.4) * 0.5;
        g.fillRect(hx + sx, hy + 0.8 + wy, Math.min(4, fw - sx), 1.6);
      }
      g.fillStyle(tint(WAX.cream), alpha * 0.55);
      g.fillRect(hx + 1, hy + 1.2, Math.max(0, fw - 2), 0.8);
      // A slow drip off the leading edge of the honey.
      const dp = (t * 0.6 + seed) % 1;
      if (fill < 1) waxDrip(g, tint, hx + fw - 1.5, hy + 5, 2 + dp * 5, 1.1, WAX.honey, alpha * (1 - dp * 0.6));
    }
    for (const ex of [hx - 3, hx + hw + 3]) {
      g.fillStyle(tint(WAX.soot), alpha);
      combCell(g, ex, hy + 3, 4.6);
      g.fillStyle(tint(fill >= 1 ? WAX.honeyLit : WAX.wax), alpha);
      combCell(g, ex, hy + 3, 3.3);
    }
  }
  // A few bees working the top.
  for (let i = 0; i < 3; i++) {
    const a = t * (1.8 + i * 0.3) + i * 2.1 + seed;
    drawBee(g, tint, x + Math.cos(a) * 24, y - 30 + Math.sin(a) * 8, a + Math.PI / 2, t, seed + i, false, alpha * 0.9, 0.55);
  }
}

/**
 * The Rule Beetanica strap gauge: a ring of comb cells round the fighter that fill with honey
 * one by one as Q is held, a fuse spark running the ring's lit edge, and the whole ring
 * flaring cream once the bombs are strapped and ready.
 */
export function drawStrapGauge(
  g: Phaser.GameObjects.Graphics, tint: WaxColorFn, x: number, y: number, ratio: number, t: number, alpha = 1,
): void {
  const n = 12, r = 38;
  const ready = ratio >= 1;
  const start = -Math.PI / 2;
  // A dark fuse cord the cells sit on.
  g.lineStyle(3.4, tint(WAX.soot), alpha * 0.55);
  g.strokeCircle(x, y, r);
  g.lineStyle(1.4, tint(WAX.umber), alpha * 0.8);
  g.strokeCircle(x, y, r);
  for (let i = 0; i < n; i++) {
    const a = start + (i / n) * TAU;
    const cx = x + Math.cos(a) * r, cy = y + Math.sin(a) * r;
    const cellFill = Phaser.Math.Clamp(ratio * n - i, 0, 1);
    g.fillStyle(tint(WAX.soot), alpha * 0.85);
    combCell(g, cx, cy, 5.2, a);
    g.fillStyle(tint(WAX.umber), alpha * 0.9);
    combCell(g, cx, cy, 4.1, a);
    if (cellFill > 0) {
      const pulse = ready ? 0.8 + 0.2 * Math.sin(t * 10 + i) : 1;
      g.fillStyle(tint(ready ? WAX.cream : WAX.honeyLit), alpha * pulse);
      combCell(g, cx, cy, 4.1 * cellFill, a);
      g.fillStyle(tint(WAX.cream), alpha * 0.6 * cellFill);
      g.fillCircle(cx - 1.2, cy - 1.2, 1);
    }
  }
  // The spark riding the lit edge.
  const sa = start + ratio * TAU;
  const sx = x + Math.cos(sa) * r, sy = y + Math.sin(sa) * r;
  const fl = 0.8 + Math.sin(t * 31) * 0.2;
  g.fillStyle(tint(WAX.flame), alpha * 0.35);
  g.fillCircle(sx, sy, 7 * fl);
  g.fillStyle(tint(ready ? WAX.cream : WAX.flameCore), alpha);
  g.fillCircle(sx, sy, 2.6 * fl);
  if (ready) {
    g.lineStyle(2, tint(WAX.cream), alpha * (0.4 + 0.3 * Math.sin(t * 8)));
    g.strokeCircle(x, y, r + 7 + Math.sin(t * 8) * 1.5);
  }
}

/** A sticky bomb: a comb-shelled nugget of soft wax with a short wick throwing sparks. */
export function drawStickyBomb(
  g: Phaser.GameObjects.Graphics, tint: WaxColorFn, x: number, y: number, t: number, seed: number, armed: boolean, alpha = 1,
): void {
  const pulse = armed ? 1 + Math.sin(t * 9 + seed) * 0.1 : 1;
  g.fillStyle(tint(WAX.soot), alpha * 0.4);
  g.fillEllipse(x + 1, y + 7, 14, 5);
  g.fillStyle(tint(WAX.deep), alpha);
  combCell(g, x, y, 9 * pulse, seed);
  g.fillStyle(tint(WAX.honey), alpha);
  combCell(g, x, y, 6.8 * pulse, seed);
  g.fillStyle(tint(WAX.pale), alpha * 0.95);
  g.fillCircle(x - 2, y - 2, 2.6 * pulse);
  // Wick and spark.
  g.lineStyle(1.8, tint(WAX.soot), alpha);
  g.lineBetween(x + 4, y - 6, x + 8, y - 11);
  const sp = 0.5 + 0.5 * Math.sin(t * 22 + seed);
  g.fillStyle(tint(WAX.flame), alpha * (0.6 + sp * 0.4));
  g.fillCircle(x + 8, y - 11, 1.8 + sp * 1.4);
  g.fillStyle(tint(WAX.flameCore), alpha);
  g.fillCircle(x + 8, y - 11, 0.9);
}

/** A stinger dart in flight: a wax shaft with a black barb. */
export function drawDart(g: Phaser.GameObjects.Graphics, tint: WaxColorFn, x: number, y: number, angle: number, alpha = 1): void {
  g.save();
  g.translateCanvas(x, y);
  g.rotateCanvas(angle);
  g.fillStyle(tint(WAX.wax), alpha);
  g.fillRect(-12, -1.6, 20, 3.2);
  g.fillStyle(tint(WAX.pale), alpha);
  g.fillRect(-11, -1.4, 10, 1.2);
  g.fillStyle(tint(WAX.soot), alpha);
  g.fillTriangle(8, -2.6, 8, 2.6, 15, 0);
  g.fillStyle(tint(WAX.honey), alpha);
  g.fillTriangle(-12, -3, -12, 3, -16, 0);
  g.restore();
}

/** The grapple: a black rope back to the caster and a barbed head. */
export function drawGrapple(
  g: Phaser.GameObjects.Graphics, tint: WaxColorFn, fromX: number, fromY: number, x: number, y: number, angle: number, t: number, alpha = 1,
): void {
  // The rope sags a touch and shivers along its length.
  const segs = 12;
  g.lineStyle(2.4, tint(WAX.rope), alpha * 0.95);
  g.beginPath();
  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    const px = Phaser.Math.Linear(fromX, x, f);
    const py = Phaser.Math.Linear(fromY, y, f) + Math.sin(f * Math.PI) * 6 + Math.sin(t * 30 + i) * 1.2;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
  g.save();
  g.translateCanvas(x, y);
  g.rotateCanvas(angle);
  g.fillStyle(tint(WAX.rope), alpha);
  g.fillTriangle(-6, -5, -6, 5, 12, 0);
  g.fillTriangle(-2, -8, 4, -2, -8, -2);
  g.fillTriangle(-2, 8, 4, 2, -8, 2);
  g.fillStyle(tint(WAX.honey), alpha);
  g.fillCircle(-5, 0, 2.2);
  g.restore();
}

/** The foil: a thin wax blade with a comb guard, drawn from the hand along `angle`. */
export function drawFoil(
  g: Phaser.GameObjects.Graphics, tint: WaxColorFn, x: number, y: number, angle: number, len: number, alpha = 1,
): void {
  g.save();
  g.translateCanvas(x, y);
  g.rotateCanvas(angle);
  g.fillStyle(tint(WAX.soot), alpha * 0.5);
  g.fillRect(-6, 1.4, len + 6, 1.6);
  g.fillStyle(tint(WAX.pale), alpha);
  g.fillPoints([
    new Phaser.Geom.Point(4, -1.8), new Phaser.Geom.Point(len, -0.4),
    new Phaser.Geom.Point(len + 5, 0), new Phaser.Geom.Point(len, 0.4), new Phaser.Geom.Point(4, 1.8),
  ], true);
  g.fillStyle(tint(WAX.cream), alpha * 0.8);
  g.fillRect(6, -1.2, len * 0.6, 0.9);
  g.fillStyle(tint(WAX.honey), alpha);
  combCell(g, 2, 0, 5.2);
  g.fillStyle(tint(WAX.deep), alpha);
  g.fillRect(-9, -1.6, 10, 3.2);
  g.fillCircle(-10, 0, 2.4);
  g.restore();
}

/** The poison tell on a victim: a turning comb ring in acid green, with drips off its low edge. */
export function drawPoisonTell(g: Phaser.GameObjects.Graphics, tint: WaxColorFn, x: number, y: number, t: number, stacks: number, alpha = 1): void {
  const r = 27 + Math.sin(t * 4) * 2;
  g.lineStyle(2, tint(WAX.poison), alpha * 0.55);
  strokeComb(g, x, y, r, t * 0.6);
  for (let i = 0; i < 6; i++) {
    const a = t * 0.6 + Math.PI / 6 + (i / 6) * TAU;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    g.fillStyle(tint(i < stacks ? WAX.poison : WAX.poisonDeep), alpha * 0.85);
    combCell(g, px, py, 3.2, a);
  }
  for (let i = 0; i < 2; i++) {
    const sag = (t * 0.5 + i * 0.5) % 1;
    waxDrip(g, tint, x - 8 + i * 16, y + 14, 10, 1.8, WAX.poison, alpha * (1 - sag) * 0.9, sag);
  }
}

/** A floor puddle: hot wax (orange-rimmed, bubbling) or honey (amber, glossy). */
export function drawPuddle(
  g: Phaser.GameObjects.Graphics, tint: WaxColorFn, x: number, y: number, r: number, kind: 'hot' | 'honey', t: number, life: number, seed: number,
): void {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const rr = r * (0.82 + wnoise(seed, i) * 0.3 + Math.sin(t * 1.4 + i * 1.7 + seed) * 0.04);
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.68));
  }
  const body = kind === 'hot' ? WAX.pale : WAX.honey;
  const rim = kind === 'hot' ? WAX.flame : WAX.deep;
  g.fillStyle(tint(rim), life * 0.55);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x + (p.x - x) * 0.08, p.y + (p.y - y) * 0.08 + 1)), true);
  g.fillStyle(tint(body), life * 0.85);
  g.fillPoints(pts, true);
  g.fillStyle(tint(WAX.cream), life * 0.45);
  g.fillEllipse(x - r * 0.28, y - r * 0.12, r * 0.6, r * 0.18);
  if (kind === 'hot') {
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.9 + wnoise(seed, 30 + i)) % 1;
      const bx = x + (wnoise(seed, 40 + i) - 0.5) * r * 1.2;
      const by = y + (wnoise(seed, 50 + i) - 0.5) * r * 0.7;
      g.lineStyle(1.2, tint(WAX.flame), life * (1 - ph));
      g.strokeCircle(bx, by, 1.5 + ph * 4);
    }
  } else {
    g.lineStyle(1.4, tint(WAX.honeyLit), life * 0.5);
    g.strokeEllipse(x, y, r * 1.5, r);
  }
}

// ── Fx ─────────────────────────────────────────────────────────────────────

export class WaxFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: WaxColorFn = (c) => c) {
    super(scene, tint);
  }

  /** A foil thrust: a pale streak racing out along the line, then fading from the root. */
  thrust(x1: number, y1: number, x2: number, y2: number, strong = false, depth = 15): void {
    const w = strong ? 7 : 3.5;
    this.anim(depth, strong ? 260 : 150, (g, t) => {
      const head = Math.min(1, t * 2.6);
      const tail = Math.max(0, (t - 0.35) / 0.65);
      const hx = Phaser.Math.Linear(x1, x2, head), hy = Phaser.Math.Linear(y1, y2, head);
      const tx = Phaser.Math.Linear(x1, x2, tail), ty = Phaser.Math.Linear(y1, y2, tail);
      g.lineStyle(w * (1 - t * 0.5), this.tint(WAX.pale), 0.9 * (1 - t * t));
      g.lineBetween(tx, ty, hx, hy);
      g.lineStyle(w * 0.4, this.tint(WAX.cream), 0.95 * (1 - t));
      g.lineBetween(tx, ty, hx, hy);
      g.fillStyle(this.tint(WAX.cream), (1 - t) * 0.9);
      g.fillCircle(hx, hy, 2 + (strong ? 3 : 1.5) * (1 - t));
    });
  }

  /** The stinger landing: a burst of pale spikes and a ring. */
  sting(x: number, y: number, angle: number, depth = 15): void {
    const spikes = Array.from({ length: 7 }, (_, i) => ({ a: angle + (i - 3) * 0.42 + (Math.random() - 0.5) * 0.2, l: 14 + Math.random() * 14 }));
    this.anim(depth, 320, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(2.4 * (1 - t), this.tint(WAX.pale), 0.9 * (1 - t));
      for (const s of spikes) g.lineBetween(x, y, x + Math.cos(s.a) * s.l * e, y + Math.sin(s.a) * s.l * e);
      g.lineStyle(3 * (1 - t), this.tint(WAX.honeyLit), 0.8 * (1 - t));
      g.strokeCircle(x, y, 6 + 26 * e);
    });
  }

  /** A ring of comb cells opening out — the element's shockwave. */
  combRing(x: number, y: number, toR: number, color: number, duration = 500, depth = 14): void {
    const cells = Phaser.Math.Clamp(Math.round(toR / 9), 10, 30);
    this.anim(depth, duration, (g, t) => {
      const e = easeOut(t);
      const r = 6 + (toR - 6) * e;
      g.lineStyle(2 * (1 - t) + 0.5, this.tint(color), 0.7 * (1 - t));
      g.strokeCircle(x, y, r);
      for (let i = 0; i < cells; i++) {
        const a = (i / cells) * TAU + t * 0.8;
        g.fillStyle(this.tint(color), 0.85 * (1 - t));
        combCell(g, x + Math.cos(a) * r, y + Math.sin(a) * r, 3 + 2 * (1 - t), a);
      }
    });
  }

  /** Wax droplets arcing out and falling — the shrapnel of anything made of wax breaking. */
  droplets(x: number, y: number, count: number, speed = 160, color: number = WAX.pale, life = 520, depth = 14): void {
    const drops = Array.from({ length: count }, () => ({
      a: Math.random() * TAU, v: speed * (0.5 + Math.random() * 0.7), r: 1.8 + Math.random() * 2.4,
      fall: 40 + Math.random() * 60,
    }));
    this.anim(depth, life, (g, t) => {
      const e = easeOut(t);
      for (const d of drops) {
        const px = x + Math.cos(d.a) * d.v * e * (life / 1000);
        const py = y + Math.sin(d.a) * d.v * e * (life / 1000) * 0.7 + d.fall * t * t;
        g.fillStyle(this.tint(color), (1 - t) * 0.95);
        g.fillCircle(px, py, d.r * (1 - t * 0.4));
        g.fillStyle(this.tint(WAX.cream), (1 - t) * 0.7);
        g.fillCircle(px - d.r * 0.3, py - d.r * 0.3, d.r * 0.3);
      }
    });
  }

  /** A candle being planted or lit: warm flash, a ring of light, a halo settling. */
  candleBurst(x: number, y: number, r: number, depth = 14): void {
    this.flashIn(x, y - 20, 18, WAX.flameCore, WAX.flame, depth + 1);
    this.combRing(x, y, r, WAX.wax, 560, depth);
    this.droplets(x, y, 8, 110, WAX.pale, 460, depth);
  }

  /** Honey released: a thick amber ring and fat drops. */
  honeyBurst(x: number, y: number, r: number, depth = 14): void {
    this.flashIn(x, y, r * 0.4, WAX.cream, WAX.honeyLit, depth + 1);
    this.combRing(x, y, r, WAX.honey, 620, depth);
    this.droplets(x, y, 12, 150, WAX.honey, 600, depth);
  }

  /**
   * A sticky-bomb detonation. Six layers, scaled by how many bombs went up: blown-out core,
   * a boiling honey body, the comb shockwave, wax shrapnel, soot puffs, and a ground scorch.
   */
  bombBlast(x: number, y: number, r: number, stacks: number, depth = 15): void {
    const s = Math.min(2.2, 1 + stacks * 0.15);
    this.flashIn(x, y, r * 0.5 * s, WAX.cream, WAX.honeyLit, depth + 1);
    const lobes = Array.from({ length: 5 + Math.round(stacks) }, (_, i) => ({
      a: (i / (5 + stacks)) * TAU + Math.random() * 0.4, d: 0.25 + Math.random() * 0.4, r: 0.35 + Math.random() * 0.3,
    }));
    this.anim(depth, 380 + stacks * 40, (g, t) => {
      const e = easeOut(t);
      for (const l of lobes) {
        const px = x + Math.cos(l.a) * r * l.d * e * s, py = y + Math.sin(l.a) * r * l.d * e * s * 0.8;
        g.fillStyle(this.tint(WAX.honey), (1 - t) * 0.85);
        g.fillCircle(px, py, r * l.r * (0.6 + e * 0.6) * (1 - t * 0.5));
        g.fillStyle(this.tint(WAX.flame), (1 - t) * 0.6);
        g.fillCircle(px, py, r * l.r * 0.5 * (1 - t));
      }
    });
    this.combRing(x, y, r * s, WAX.honeyLit, 420 + stacks * 30, depth);
    this.scene.time.delayedCall(70, () => this.combRing(x, y, r * 1.3 * s, WAX.wax, 520, depth));
    this.droplets(x, y, 10 + Math.round(stacks * 2), 220 * s, WAX.pale, 620, depth);
    const puffs = Array.from({ length: 4 + Math.round(stacks / 2) }, () => ({ a: Math.random() * TAU, d: Math.random() * 0.6 }));
    this.anim(depth - 1, 700, (g, t) => {
      for (const p of puffs) {
        g.fillStyle(this.tint(WAX.soot), (1 - t) * 0.35);
        g.fillCircle(x + Math.cos(p.a) * r * p.d * s, y + Math.sin(p.a) * r * p.d * s - t * 30, r * 0.3 * (0.5 + t));
      }
    });
    this.anim(1, 2400, (g, t) => {
      g.fillStyle(this.tint(WAX.umber), (1 - t) * 0.4);
      g.fillEllipse(x, y + 4, r * 1.2 * s, r * 0.6 * s);
    });
  }

  /** A bee landing — a little puff of wing-dust. */
  beeLand(x: number, y: number, elite = false, depth = 15): void {
    this.anim(depth, 220, (g, t) => {
      g.lineStyle(1.6 * (1 - t), this.tint(elite ? WAX.elite : WAX.honeyLit), 0.9 * (1 - t));
      g.strokeCircle(x, y, 4 + 12 * easeOut(t));
    });
  }

  /** A hive paying out: cells fly off the comb plate as the stored bees pour out. */
  hiveRelease(x: number, y: number, violent: boolean, depth = 14): void {
    this.honeyBurst(x, y, violent ? 120 : 76, depth);
    const cells = Array.from({ length: violent ? 12 : 7 }, () => ({ a: Math.random() * TAU, v: 90 + Math.random() * 120, spin: Math.random() * 6 }));
    this.anim(depth + 1, 620, (g, t) => {
      const e = easeOut(t);
      for (const c of cells) {
        g.fillStyle(this.tint(WAX.wax), (1 - t) * 0.9);
        combCell(g, x + Math.cos(c.a) * c.v * e * 0.6, y + Math.sin(c.a) * c.v * e * 0.5 + 50 * t * t, 4.5 * (1 - t * 0.5), c.spin + t * 4);
      }
    });
  }

  /** Melting Point: wax spat off a hit. */
  spatter(x: number, y: number, depth = 14): void {
    this.droplets(x, y, 6, 130, WAX.pale, 400, depth);
    this.anim(depth, 260, (g, t) => {
      g.lineStyle(2 * (1 - t), this.tint(WAX.flame), 0.8 * (1 - t));
      g.strokeCircle(x, y, 6 + 18 * easeOut(t));
    });
  }
}

// ── The character ─────────────────────────────────────────────────────────

const WAX_AVATAR: AvatarSpec = {
  hands: [
    { r: 10, color: WAX.honey, alpha: 0.28 },
    { r: 7.4, color: WAX.wax, alpha: 1 },
    { r: 4.6, color: WAX.pale, alpha: 0.95 },
    { r: 1.9, color: WAX.cream, alpha: 0.9, ox: -2, oy: -2 },
  ],
  eyeWhite: WAX.cream,
  eyePupil: WAX.soot,
  squash: { div: 12, x: 0.42, y: 0.24 },
};

/**
 * The apiarist: a figure of beeswax with a wick burning at its crown, drip ribbons running off
 * both shoulders, and a foil that appears in the lead hand whenever it fences. The flame is
 * the mastery tell — it burns blue and the crown grows a ring of comb cells.
 */
export class WaxAvatar extends BaseAvatar {
  private fx: WaxFx;
  /** 1 while fencing — the foil is drawn and the lead hand carries it. Eases back to 0. */
  private fencing = 0;
  private fenceTarget = 0;

  constructor(scene: Phaser.Scene, tint: WaxColorFn, depth = 6) {
    super(scene, tint, depth, WAX_AVATAR);
    this.fx = new WaxFx(scene, tint);
  }

  /** Raise or lower the foil. The kit raises it for a barrage and lowers it when the last thrust lands. */
  fence(on: boolean): void { this.fenceTarget = on ? 1 : 0; }

  /** Drop the lunge pose if it is the one being held — a barrage ending must not strand it. */
  releaseLunge(): void { if (this.hold === 'reach') this.setHold(null); }

  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? WAX.royalLit : WAX.cream);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 14 : 10);
      halo.setFillStyle(this.tint(on ? WAX.royal : WAX.honey), on ? 0.34 : 0.28);
    });
    this.forEachHandLayer(1, (shell) => shell.setFillStyle(this.tint(on ? WAX.gilt : WAX.wax), 1));
  }

  /** `reach` — the lunge: lead hand far out along the aim with the foil, the rear hand tucked. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'reach') return null;
    const lead = side > 0;
    return lead
      ? { ang: this.holdAngle, dist: 40 + Math.sin(this.t * 18) * 2, scale: idle.scale * 1.1 }
      : { ang: this.holdAngle + Math.PI - 0.5, dist: 20, scale: idle.scale * 0.9 };
  }

  protected emitTrail(x: number, y: number): void {
    this.fx.droplets(x, y, 1, 40, WAX.pale, 380, 5);
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    // Candlelight on the floor, and a few motes of wax dust floating up through it.
    const flick = 0.9 + Math.sin(this.t * 11) * 0.06;
    g.fillStyle(this.tint(WAX.flame), a * 0.08 * flick * this.intensity);
    g.fillEllipse(x, y + 8, 70 * this.intensity * flick, 34 * this.intensity * flick);
    g.fillStyle(this.tint(WAX.wax), a * 0.12 * this.intensity);
    g.fillEllipse(x, y + 9, 42 * this.intensity, 18 * this.intensity);
    for (let i = 0; i < 4; i++) {
      const ph = (this.t * 0.35 + i * 0.25) % 1;
      const mx = x + Math.sin(this.t * 1.3 + i * 2) * 14 * (1 - ph) + (i - 1.5) * 8;
      g.fillStyle(this.tint(this.mastered ? WAX.royal : WAX.pale), a * 0.5 * (1 - ph));
      g.fillCircle(mx, y + 4 - ph * 34, this.mastered ? 1.8 : 1.4);
    }
    if (this.mastered) {
      // A royal comb ring turning on the floor, and a cool pool inside the warm one.
      g.fillStyle(this.tint(WAX.royal), a * 0.1);
      g.fillEllipse(x, y + 9, 56, 24);
      g.lineStyle(1.6, this.tint(WAX.royal), a * 0.55);
      for (let i = 0; i < 10; i++) {
        const ang = this.t * 0.6 + (i / 10) * TAU;
        const cx = x + Math.cos(ang) * 34, cy = y + 9 + Math.sin(ang) * 15;
        strokeComb(g, cx, cy, 3.6, ang);
      }
    }
  }

  /**
   * The wax body's surface: a melted pool at the crown with drips running from its lip, a
   * soft sheen down one side and a little patch of comb on the opposite cheek. All kept clear
   * of the eye band (y-10..y+2) except the drips that run past it on the outer edge.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const m = this.mastered;
    // Melt pool at the crown.
    g.fillStyle(this.tint(WAX.deep), alpha * 0.35);
    g.fillEllipse(x, y - 13, 24, 8);
    g.fillStyle(this.tint(m ? WAX.cream : WAX.pale), alpha * 0.85);
    g.fillEllipse(x, y - 14, 20, 6);
    g.fillStyle(this.tint(WAX.cream), alpha * 0.7);
    g.fillEllipse(x - 4, y - 15, 7, 2);
    // Drips running off the pool's lip down the outer edges of the body.
    const drips: [number, number, number][] = [[-13, 12, 0], [-8, 7, 1], [9, 9, 2], [14, 14, 3]];
    for (const [dx, len, k] of drips) {
      const sag = 0.7 + 0.3 * Math.sin(this.t * 0.8 + k * 1.7);
      waxDrip(g, this.tint, x + dx, y - 13 + Math.abs(dx) * 0.15, len, 1.6, WAX.pale, alpha * 0.85, sag);
    }
    // Sheen down the left flank.
    g.fillStyle(this.tint(WAX.cream), alpha * 0.28);
    g.fillEllipse(x - 12, y + 4, 4, 14);
    // Comb patch low on the right cheek — the beekeeper's mark.
    for (const [cx, cy] of [[9, 9], [13.5, 11.6], [9, 14.2]] as [number, number][]) {
      g.fillStyle(this.tint(WAX.deep), alpha * 0.6);
      combCell(g, x + cx, y + cy, 2.6);
      g.fillStyle(this.tint(m ? WAX.gilt : WAX.honey), alpha * 0.9);
      combCell(g, x + cx, y + cy, 1.9);
    }
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    this.fencing += (this.fenceTarget - this.fencing) * 0.25;
    const rootY = y - 18;
    const flick = 0.85 + Math.sin(this.t * 13) * 0.1 + Math.sin(this.t * 31) * 0.05;
    const m = this.mastered;

    // Drip ribbons off both shoulders, creeping and re-forming.
    for (const side of [-1, 1]) {
      const sag = 0.55 + 0.45 * ((this.t * 0.12 + (side + 1) * 0.3) % 1);
      waxDrip(g, this.tint, x + side * 12, y - 9, 13, 2.6, WAX.pale, alpha * 0.95, sag);
    }
    // Comb plates over the hands, so a ball hand reads as a wax mitt rather than a pearl.
    for (let i = 0; i < 2; i++) {
      g.fillStyle(this.tint(WAX.deep), alpha * 0.5);
      combCell(g, this.armX[i] + 2, this.armY[i] + 2, 4.2, this.t * 0.5);
      g.fillStyle(this.tint(WAX.honey), alpha * 0.85);
      combCell(g, this.armX[i], this.armY[i], 3.6, this.t * 0.5);
    }
    // A wax-coloured comb collar under the crown, so the wick sits in something.
    if (!m) {
      g.fillStyle(this.tint(WAX.deep), alpha * 0.85);
      g.fillEllipse(x, rootY + 3, 12, 4);
      g.fillStyle(this.tint(WAX.honey), alpha);
      g.fillEllipse(x, rootY + 2.4, 9, 2.6);
    }
    // A worker bee doing slow laps of the head — the apiarist's companion.
    {
      const ang = this.t * 1.6;
      const bx = x + Math.cos(ang) * 22, by = rootY + 2 + Math.sin(ang) * 7;
      drawBee(g, this.tint, bx, by, ang + Math.PI / 2, this.t, 3, false, alpha * 0.95, 0.5);
    }
    // The mastered regalia: a gilt comb crown with a blue gem, and a queen bee in attendance.
    if (m) {
      const cy = rootY + 1;
      g.fillStyle(this.tint(WAX.giltDeep), alpha);
      g.fillRoundedRect(x - 15, cy - 1, 30, 6, 2);
      for (let i = -2; i <= 2; i++) {
        const px = x + i * 6.4, py = cy - 3 - (2 - Math.abs(i)) * 2.4;
        g.fillStyle(this.tint(WAX.giltDeep), alpha);
        combCell(g, px, py, 4.4);
        g.fillStyle(this.tint(WAX.gilt), alpha);
        combCell(g, px, py, 3.4);
        g.fillStyle(this.tint(WAX.cream), alpha * 0.7);
        g.fillCircle(px - 1, py - 1, 0.9);
      }
      g.fillStyle(this.tint(WAX.gilt), alpha);
      g.fillRect(x - 14, cy, 28, 2.6);
      // Gem pulsing blue in the centre cell.
      const gp = 0.75 + 0.25 * Math.sin(this.t * 5);
      g.fillStyle(this.tint(WAX.royal), alpha * 0.35 * gp);
      g.fillCircle(x, cy - 7.8, 6);
      g.fillStyle(this.tint(WAX.royal), alpha);
      combCell(g, x, cy - 7.8, 2.4);
      g.fillStyle(this.tint(WAX.royalLit), alpha * gp);
      g.fillCircle(x - 0.6, cy - 8.4, 0.9);
      // The queen: a larger bee opposite the worker, trailing blue sparks.
      const qa = this.t * 1.6 + Math.PI;
      const qx = x + Math.cos(qa) * 24, qy = rootY + 2 + Math.sin(qa) * 8;
      g.fillStyle(this.tint(WAX.royal), alpha * 0.25);
      g.fillCircle(qx, qy, 7);
      drawBee(g, this.tint, qx, qy, qa + Math.PI / 2, this.t, 9, false, alpha, 0.72);
      // Royal flame-licks on each hand.
      for (let i = 0; i < 2; i++) {
        const hx = this.armX[i], hy = this.armY[i] - 6;
        const hf = 0.8 + Math.sin(this.t * 15 + i * 2) * 0.2;
        g.fillStyle(this.tint(WAX.royal), alpha * 0.9);
        g.fillTriangle(hx - 2.6, hy + 2, hx + 2.6, hy + 2, hx + Math.sin(this.t * 11 + i) * 1.2, hy - 7 * hf);
        g.fillStyle(this.tint(WAX.royalLit), alpha);
        g.fillCircle(hx, hy + 1, 1.3);
      }
    }
    // Wick and flame at the crown.
    g.lineStyle(2, this.tint(WAX.soot), alpha);
    g.lineBetween(x, rootY + 2, x, rootY - 4);
    const fy = rootY - 7;
    const fh = (m ? 18 : 13) * flick * (this.intensity > 1 ? 1.25 : 1);
    const fc = m ? WAX.royal : WAX.flame;
    g.fillStyle(this.tint(fc), alpha * 0.2);
    g.fillCircle(x, fy - 3, fh * 1.1);
    g.fillStyle(this.tint(fc), alpha * 0.95);
    g.fillPoints([
      new Phaser.Geom.Point(x - 4.6 * flick, fy + 3),
      new Phaser.Geom.Point(x + 4.6 * flick, fy + 3),
      new Phaser.Geom.Point(x + 1.4, fy - fh * 0.5),
      new Phaser.Geom.Point(x + Math.sin(this.t * 17) * 1.6, fy - fh),
      new Phaser.Geom.Point(x - 1.4, fy - fh * 0.5),
    ], true);
    g.fillStyle(this.tint(m ? WAX.royalLit : WAX.flameCore), alpha);
    g.fillEllipse(x, fy - 1, 4.2, fh * 0.6);
    g.fillStyle(this.tint(WAX.cream), alpha * 0.9);
    g.fillEllipse(x, fy, 2, 3.4);

    // The foil, in the lead hand, when fencing.
    if (this.fencing > 0.05) {
      const i = 1;
      drawFoil(g, this.tint, this.armX[i], this.armY[i], this.facing, 26 + 30 * this.fencing, alpha * Math.min(1, this.fencing * 1.5));
    }
  }
}
