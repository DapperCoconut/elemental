import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import {
  BAIZE, BAIZE_DARK, BAIZE_LIT, BLUED, BLUED_DARK, BRASS, BRASS_DARK, BRASS_LIT, CARD_BLACK, CARD_RED, COPPER,
  COPPER_DARK, COPPER_LIT, CUCKOO_CREAM, CUCKOO_RED, ENAMEL, ENAMEL_SHADE, GILT, GLASS, GLASS_EDGE, GLASS_LIT, IRON,
  IRON_DARK, IRON_LIT, KERB, LAMP_GLOW, LAMP_GREEN, LEAF_CARVE, NUMERAL, OIL, OIL_DEEP, OIL_SHEEN_A, OIL_SHEEN_B,
  OIL_SHEEN_C, PAVE_BLACK, PAVE_BLACK_LIT, PAVE_RED, PAVE_RED_LIT, SAND, SAND_DARK, SAND_LIT, SLATE, SLATE_LIT, STONE,
  STONE_DARK, STONE_DEEP, STONE_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT, TOCK, TOCK_DARK, TOCK_LIT,
} from './palette';

/**
 * Clockwork set pieces — the shapes only a town of clockmakers has. Everything here is *cased*:
 * a gear is never just a disc, it has teeth, spokes, a hub and a polished rim; a dial has its
 * chapter ring, its minute track and its blued hands; even the cuckoo houses wear their clocks on
 * their gables like badges. Where time has been taken from somebody (a grey-faced queue, a stopped
 * clock in a window) it is drawn the pale paid-hour grey, the only colourless thing on the hill.
 */

const TAU = Math.PI * 2;

// ── Mechanisms (shared with the fights) ──────────────────────────────

/**
 * A toothed gear: a ring of square teeth, a rim, spoke cut-outs and a hub with an axle cap. `sq`
 * squashes it vertically (a gear lying in the floor seen at a slant); `a` is its turn.
 */
export function gear(g: G, x: number, y: number, r: number, teeth: number, a: number, fill = BRASS, sq = 1, spokes = 5): void {
  const tip = r, root = r - Math.max(5, r * 0.13);
  const pts: Pt[] = [];
  const step = TAU / teeth;
  for (let i = 0; i < teeth; i++) {
    const b = a + i * step;
    pts.push({ x: x + Math.cos(b) * root, y: y + Math.sin(b) * root * sq });
    pts.push({ x: x + Math.cos(b + step * 0.12) * tip, y: y + Math.sin(b + step * 0.12) * tip * sq });
    pts.push({ x: x + Math.cos(b + step * 0.48) * tip, y: y + Math.sin(b + step * 0.48) * tip * sq });
    pts.push({ x: x + Math.cos(b + step * 0.6) * root, y: y + Math.sin(b + step * 0.6) * root * sq });
  }
  g.fillStyle(dim(fill, 0.45), 1); g.fillPoints(pts.map((p) => ({ x: p.x, y: p.y + 3 * sq })), true);
  g.fillStyle(fill, 1); g.fillPoints(pts, true);
  // The rim, a bright bevel, and the web inside it.
  g.lineStyle(Math.max(1.5, r * 0.05), lit(fill, 0.35), 0.8);
  g.strokeEllipse(x, y, root * 1.84, root * 1.84 * sq);
  const web = root * 0.78;
  g.fillStyle(dim(fill, 0.18), 1); g.fillEllipse(x, y, web * 2, web * 2 * sq);
  // Spoke windows: dark lozenges between the spokes.
  if (r > 18) {
    for (let i = 0; i < spokes; i++) {
      const b = a + (i + 0.5) * (TAU / spokes);
      const cx = x + Math.cos(b) * web * 0.58, cy = y + Math.sin(b) * web * 0.58 * sq;
      g.fillStyle(dim(fill, 0.7), 0.85);
      g.fillEllipse(cx, cy, web * 0.62, web * 0.62 * sq);
      g.fillStyle(dim(fill, 0.4), 0.6);
      g.fillEllipse(cx - Math.cos(b) * 2, cy - Math.sin(b) * 2 * sq, web * 0.4, web * 0.4 * sq);
    }
  }
  // Hub, axle cap, a highlight.
  g.fillStyle(dim(fill, 0.3), 1); g.fillEllipse(x, y, r * 0.42, r * 0.42 * sq);
  g.fillStyle(lit(fill, 0.2), 1); g.fillEllipse(x, y, r * 0.3, r * 0.3 * sq);
  g.fillStyle(IRON_DARK, 1); g.fillEllipse(x, y, r * 0.12, r * 0.12 * sq);
  g.fillStyle(0xffffff, 0.35); g.fillEllipse(x - r * 0.3, y - r * 0.32 * sq, r * 0.32, r * 0.14 * sq);
}

/** A clock hand: blued steel with a spade tip and a counterweight tail. */
export function hand(g: G, x: number, y: number, a: number, len: number, w: number, color = BLUED): void {
  const cx = Math.cos(a), cy = Math.sin(a), nx = -cy, ny = cx;
  const tx = x + cx * len, ty = y + cy * len;
  g.lineStyle(w + 1.5, dim(color, 0.5), 1); g.lineBetween(x - cx * len * 0.22, y - cy * len * 0.22, tx - cx * w, ty - cy * w);
  g.lineStyle(w, color, 1); g.lineBetween(x - cx * len * 0.22, y - cy * len * 0.22, tx - cx * w, ty - cy * w);
  // Spade tip.
  g.fillStyle(color, 1);
  g.fillTriangle(tx + cx * w * 1.6, ty + cy * w * 1.6, tx - cx * w + nx * w * 1.4, ty - cy * w + ny * w * 1.4, tx - cx * w - nx * w * 1.4, ty - cy * w - ny * w * 1.4);
  g.fillCircle(x - cx * len * 0.22, y - cy * len * 0.22, w * 1.2);
  g.fillStyle(lit(color, 0.5), 0.6); g.lineStyle(1, lit(color, 0.5), 0.6);
  g.lineBetween(x + nx * 0.6, y + ny * 0.6, tx - cx * w * 2 + nx * 0.6, ty - cy * w * 2 + ny * 0.6);
}

/**
 * A clock dial: brass bezel, enamel face, a minute track, twelve hour batons (or Roman numerals
 * picked out as strokes), and the hands. `hourA`/`minA` are radians from 12 o'clock, clockwise.
 */
export function dial(g: G, x: number, y: number, r: number, hourA: number, minA: number, face = ENAMEL, bezel = BRASS): void {
  g.fillStyle(dim(bezel, 0.45), 1); g.fillCircle(x, y + 2, r + r * 0.12);
  g.fillStyle(bezel, 1); g.fillCircle(x, y, r + r * 0.1);
  g.lineStyle(Math.max(1, r * 0.03), lit(bezel, 0.4), 0.9); g.strokeCircle(x, y, r + r * 0.06);
  g.fillStyle(face, 1); g.fillCircle(x, y, r);
  g.fillStyle(dim(face, 0.08), 1); g.fillCircle(x + r * 0.08, y + r * 0.08, r * 0.86);
  g.fillStyle(face, 1); g.fillCircle(x, y, r * 0.84);
  // Minute track.
  if (r > 14) {
    for (let i = 0; i < 60; i++) {
      const b = (i / 60) * TAU;
      const r0 = i % 5 === 0 ? r * 0.76 : r * 0.86;
      g.lineStyle(i % 5 === 0 ? Math.max(1.5, r * 0.06) : 1, NUMERAL, i % 5 === 0 ? 1 : 0.6);
      g.lineBetween(x + Math.sin(b) * r0, y - Math.cos(b) * r0, x + Math.sin(b) * r * 0.94, y - Math.cos(b) * r * 0.94);
    }
  } else {
    for (let i = 0; i < 12; i++) { const b = (i / 12) * TAU; g.fillStyle(NUMERAL, 1); g.fillCircle(x + Math.sin(b) * r * 0.78, y - Math.cos(b) * r * 0.78, 0.9); }
  }
  // A card pip at twelve: the House's mark is on every clock on the isle.
  if (r > 22) { g.fillStyle(CARD_RED, 1); diamond(g, x, y - r * 0.56, r * 0.07); }
  hand(g, x, y, hourA - Math.PI / 2, r * 0.5, Math.max(1.5, r * 0.06));
  hand(g, x, y, minA - Math.PI / 2, r * 0.74, Math.max(1, r * 0.04));
  g.fillStyle(GILT, 1); g.fillCircle(x, y, Math.max(1.5, r * 0.07));
}

/** A little diamond (♦), the House's pip. */
export function diamond(g: G, x: number, y: number, s: number): void {
  g.fillTriangle(x, y - s * 1.3, x + s, y, x - s, y);
  g.fillTriangle(x, y + s * 1.3, x + s, y, x - s, y);
}

/**
 * An hourglass in a turned-wood frame: three posts, two caps, the glass between. `fill` is how
 * much sand is still in the top bulb (0–1); `flowing` draws the thread through the neck. `h` is
 * the full height; the base sits on `y`.
 */
export function hourglass(g: G, x: number, y: number, h: number, fill: number, flowing: boolean, t = 0, frame = TIMBER): void {
  const w = h * 0.52, cap = h * 0.08;
  const top = y - h, mid = y - h / 2;
  shadow(g, x, y + 2, w * 1.3, w * 0.34);
  // Back post.
  g.fillStyle(dim(frame, 0.35), 1); g.fillRect(x - 2, top + cap, 4, h - cap * 2);
  // The glass: two bulbs.
  const bulb = (cy: number, up: boolean) => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 16; i++) {
      const k = i / 16;
      const yy = up ? top + cap + k * (h / 2 - cap) : mid + k * (h / 2 - cap);
      const across = up ? Math.sin((1 - k) * Math.PI * 0.5 + 0.2) * (1 - k * 0.92) : Math.sin(k * Math.PI * 0.5 + 0.2) * (0.08 + k * 0.92);
      pts.push({ x: x + across * w * 0.46, y: yy });
    }
    for (let i = 16; i >= 0; i--) pts.push({ x: 2 * x - pts[i].x, y: pts[i].y });
    void cy;
    return pts;
  };
  const upper = bulb(top, true), lower = bulb(mid, false);
  g.fillStyle(GLASS, 0.32); g.fillPoints(upper, true); g.fillPoints(lower, true);
  // Sand in the top bulb: a level that drops, cupped at the neck.
  const topLevel = mid - 4 - (h / 2 - cap - 6) * Math.max(0, fill) * 0.85;
  if (fill > 0.02) {
    const pts = upper.filter((p) => p.y >= topLevel);
    if (pts.length > 2) { g.fillStyle(SAND, 1); g.fillPoints([{ x: x - w * 0.4, y: topLevel }, ...pts.filter((p) => p.x > x), { x, y: mid }, ...pts.filter((p) => p.x <= x).reverse()], true); }
    g.fillStyle(SAND_DARK, 0.6); g.fillEllipse(x, topLevel + 2, w * 0.5 * Math.min(1, fill + 0.3), 4);
  }
  // Sand in the bottom bulb: a heap that grows.
  const heap = (1 - Math.max(0, fill)) * (h / 2 - cap) * 0.8 + 3;
  const bw = w * 0.42;
  g.fillStyle(SAND, 1); g.fillTriangle(x - bw, y - cap, x + bw, y - cap, x, y - cap - heap);
  g.fillRect(x - bw, y - cap - Math.min(heap, 6), bw * 2, Math.min(heap, 6));
  g.fillStyle(SAND_LIT, 0.6); g.fillTriangle(x - bw * 0.3, y - cap - heap * 0.6, x, y - cap - heap, x - bw * 0.1, y - cap - heap * 0.4);
  if (flowing && fill > 0.02) {
    g.lineStyle(1.6, SAND, 1); g.lineBetween(x, mid, x, y - cap - heap);
    for (let i = 0; i < 4; i++) { const ph = ((t * 3 + i / 4) % 1); g.fillStyle(SAND_LIT, 1); g.fillCircle(x, mid + ph * (y - cap - heap - mid), 1); }
  }
  // Glass highlights.
  g.lineStyle(1.5, GLASS_LIT, 0.55);
  g.lineBetween(x - w * 0.3, top + cap + h * 0.06, x - w * 0.18, mid - h * 0.12);
  g.lineBetween(x - w * 0.16, mid + h * 0.1, x - w * 0.32, y - cap - h * 0.06);
  g.lineStyle(1, GLASS_EDGE, 0.7); g.strokePoints(upper, true); g.strokePoints(lower, true);
  // Front posts, turned like bobbins.
  for (const k of [-1, 1]) {
    const px = x + k * w * 0.52;
    g.fillStyle(dim(frame, 0.25), 1); g.fillRect(px - 2.5, top + cap, 5, h - cap * 2);
    g.fillStyle(frame, 1); g.fillRect(px - 2, top + cap, 3, h - cap * 2);
    for (let i = 1; i < 4; i++) { g.fillStyle(lit(frame, 0.2), 1); g.fillEllipse(px, top + cap + (h - cap * 2) * (i / 4), 7, 3); }
  }
  // Caps.
  for (const cy of [top, y - cap]) {
    g.fillStyle(dim(frame, 0.3), 1); g.fillRect(x - w * 0.62, cy + 1, w * 1.24, cap);
    g.fillStyle(frame, 1); g.fillRect(x - w * 0.62, cy, w * 1.24, cap * 0.8);
    g.fillStyle(lit(frame, 0.25), 1); g.fillRect(x - w * 0.62, cy, w * 1.24, 1.5);
    g.fillStyle(BRASS, 1); g.fillCircle(x - w * 0.52, cy + cap * 0.4, 1.6); g.fillCircle(x + w * 0.52, cy + cap * 0.4, 1.6);
  }
}

/** A cuckoo bird: plump, barred breast, a cocked tail, beak open on the call. */
export function cuckooBird(g: G, x: number, y: number, s: number, a: number, flap: number, fat = 1): void {
  const cx = Math.cos(a), cy = Math.sin(a);
  const bx = 11 * s * fat, by = 7.5 * s * fat;
  g.fillStyle(0x000000, 0.18); g.fillEllipse(x, y + 12 * s, bx * 1.6, by * 0.6);
  // Tail.
  g.fillStyle(0x5a4a3e, 1);
  g.fillTriangle(x - cx * bx * 0.7, y - cy * by * 0.7, x - cx * bx * 1.7 - cy * 4 * s, y - cy * by * 1.7 + cx * 4 * s, x - cx * bx * 1.7 + cy * 4 * s, y - cy * by * 1.7 - cx * 4 * s);
  // Wings, beating.
  const wa = Math.sin(flap) * 0.9;
  for (const k of [-1, 1]) {
    const wx = -cy * k, wy = cx * k;
    g.fillStyle(0x6a5646, 1);
    g.fillTriangle(x, y, x + wx * 13 * s + cx * wa * 6 * s, y + wy * 13 * s * (0.6 + Math.abs(wa) * 0.4) + cy * wa * 6 * s, x - cx * 7 * s, y - cy * 7 * s);
  }
  // Body, barred breast.
  g.fillStyle(0x7a6656, 1); g.fillEllipse(x, y, bx * 2, by * 2);
  g.fillStyle(CUCKOO_CREAM, 1); g.fillEllipse(x + cx * 2 * s, y + 2.5 * s, bx * 1.3, by * 1.1);
  g.lineStyle(1, 0x5a4a3e, 0.8);
  for (let i = -2; i <= 2; i++) g.lineBetween(x + cx * 2 * s - 5 * s, y + 2.5 * s + i * 2 * s, x + cx * 2 * s + 5 * s, y + 2.5 * s + i * 2 * s);
  // Head, eye, beak.
  const hx = x + cx * bx * 0.9, hy = y + cy * by * 0.9 - 4 * s;
  g.fillStyle(0x7a6656, 1); g.fillCircle(hx, hy, 5.5 * s);
  g.fillStyle(0xffd040, 1); g.fillCircle(hx + cx * 1.5 * s, hy - 1.5 * s, 1.8 * s);
  g.fillStyle(0x000000, 1); g.fillCircle(hx + cx * 1.8 * s, hy - 1.5 * s, 0.9 * s);
  g.fillStyle(0xf0a020, 1);
  g.fillTriangle(hx + cx * 4 * s, hy - 1 * s, hx + cx * 4 * s, hy + 2 * s, hx + cx * 10 * s, hy - 0.5 * s + cy * 4 * s);
}

/**
 * A carved cuckoo clock: a chalet gable with oak leaves round it, a dial, a little door above it
 * that opens on the hour, pine-cone weights on chains below. `open` 0–1 swings the door.
 */
export function cuckooClock(g: G, x: number, y: number, s: number, hourA: number, minA: number, open: number, weights = true): void {
  const w = 70 * s, h = 64 * s;
  const top = y - h;
  // Leaves carved round the case.
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    const lx = x + Math.cos(a) * w * 0.62, ly = top + h * 0.5 + Math.sin(a) * h * 0.62;
    g.fillStyle(dim(LEAF_CARVE, 0.2), 1); g.fillEllipse(lx, ly + 1, 16 * s, 9 * s);
    g.fillStyle(LEAF_CARVE, 1); g.fillEllipse(lx, ly, 14 * s, 8 * s);
  }
  // The case.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2, top + h * 0.2, w, h * 0.8);
  g.fillStyle(TIMBER, 1); g.fillRect(x - w / 2 + 3 * s, top + h * 0.2 + 3 * s, w - 6 * s, h * 0.8 - 6 * s);
  // Gable roof with a carved bargeboard and a bird finial.
  g.fillStyle(dim(TIMBER_DARK, 0.2), 1); g.fillTriangle(x - w * 0.68, top + h * 0.26, x + w * 0.68, top + h * 0.26, x, top - h * 0.26);
  g.fillStyle(TIMBER_LIT, 1); g.fillTriangle(x - w * 0.6, top + h * 0.22, x + w * 0.6, top + h * 0.22, x, top - h * 0.18);
  g.lineStyle(2 * s, CUCKOO_CREAM, 0.9);
  for (let i = 0; i < 6; i++) {
    const k = i / 6;
    g.lineBetween(x - w * 0.6 * (1 - k), top + h * 0.22 - (h * 0.4) * k, x - w * 0.6 * (1 - k - 1 / 6), top + h * 0.22 - (h * 0.4) * (k + 1 / 6) + 3 * s);
    g.lineBetween(x + w * 0.6 * (1 - k), top + h * 0.22 - (h * 0.4) * k, x + w * 0.6 * (1 - k - 1 / 6), top + h * 0.22 - (h * 0.4) * (k + 1 / 6) + 3 * s);
  }
  // The little door, and what's behind it.
  const dx = x, dy = top + h * 0.1, dw = 14 * s, dh = 14 * s;
  g.fillStyle(0x140c08, 1); g.fillRect(dx - dw / 2, dy - dh / 2, dw, dh);
  if (open < 0.05) { g.fillStyle(CUCKOO_RED, 1); g.fillRect(dx - dw / 2, dy - dh / 2, dw, dh); g.fillStyle(GILT, 1); g.fillCircle(dx + dw * 0.3, dy, 1.2 * s); }
  else {
    for (const k of [-1, 1]) {
      const ow = (dw / 2) * (1 - open * 0.85);
      g.fillStyle(CUCKOO_RED, 1); g.fillRect(k < 0 ? dx - dw / 2 - (dw / 2 - ow) * 1.4 : dx + dw / 2 + (dw / 2 - ow) * 0.4, dy - dh / 2, ow, dh);
    }
  }
  // Dial.
  dial(g, x, top + h * 0.56, 17 * s, hourA, minA, CUCKOO_CREAM, GILT);
  // Pendulum and pine-cone weights hanging below.
  if (weights) {
    for (const k of [-1, 1]) {
      const wx = x + k * 14 * s, wy = y + 30 * s + k * 6 * s;
      g.lineStyle(1, BRASS_DARK, 1); g.lineBetween(wx, y, wx, wy - 9 * s);
      g.fillStyle(BRASS_DARK, 1); g.fillEllipse(wx, wy, 7 * s, 15 * s);
      g.fillStyle(BRASS, 1); for (let i = 0; i < 4; i++) g.fillEllipse(wx, wy - 5 * s + i * 3.5 * s, 6 * s, 2 * s);
    }
    g.lineStyle(1.5, BRASS_DARK, 1); g.lineBetween(x, y, x + Math.sin(minA * 3) * 3 * s, y + 22 * s);
    g.fillStyle(LEAF_CARVE, 1); g.fillEllipse(x + Math.sin(minA * 3) * 3 * s, y + 24 * s, 9 * s, 7 * s);
  }
}

/** A brass lenticular pendulum bob on its rod, seen from above as it swings. */
export function pendulumBob(g: G, x: number, y: number, r: number, motion: number): void {
  g.fillStyle(0x000000, 0.22); g.fillEllipse(x + 4, y + r * 0.7, r * 2.2, r * 0.8);
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y + 2, r);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y, r);
  g.fillStyle(lit(BRASS, 0.2), 1); g.fillCircle(x - r * 0.12, y - r * 0.12, r * 0.74);
  g.lineStyle(2, BRASS_LIT, 0.8); g.strokeCircle(x, y, r * 0.86);
  // An engraved sunburst.
  g.lineStyle(1, BRASS_DARK, 0.6);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.lineBetween(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2, x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6); }
  g.fillStyle(0xffffff, 0.5 + motion * 0.3); g.fillEllipse(x - r * 0.35, y - r * 0.4, r * 0.6, r * 0.3);
}

/** A metronome: a pyramid case of walnut with its steel arm and sliding weight. */
export function metronome(g: G, x: number, y: number, h: number, armA: number): void {
  const w = h * 0.55;
  shadow(g, x, y + 2, w * 1.4, w * 0.36);
  g.fillStyle(TOCK_DARK, 1); g.fillTriangle(x - w / 2, y, x + w / 2, y, x, y - h);
  g.fillStyle(dim(TOCK_DARK, 0.3), 1); g.fillTriangle(x + w * 0.1, y, x + w / 2, y, x, y - h);
  g.fillStyle(ENAMEL, 1); g.fillTriangle(x - w * 0.22, y - h * 0.18, x + w * 0.22, y - h * 0.18, x, y - h * 0.82);
  for (let i = 1; i < 8; i++) { g.lineStyle(1, NUMERAL, 0.6); g.lineBetween(x - 3, y - h * 0.18 - i * h * 0.08, x + 3, y - h * 0.18 - i * h * 0.08); }
  const ax = x + Math.sin(armA) * h * 0.95, ay = y - h * 0.12 - Math.cos(armA) * h * 0.95;
  g.lineStyle(2.5, IRON_LIT, 1); g.lineBetween(x, y - h * 0.12, ax, ay);
  const wx = x + Math.sin(armA) * h * 0.62, wy = y - h * 0.12 - Math.cos(armA) * h * 0.62;
  g.fillStyle(GILT, 1); g.fillRect(wx - 5, wy - 4, 10, 8);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - w / 2 - 2, y - 4, w + 4, 5);
}

// ── Ground ───────────────────────────────────────────────────────────

/** A road of black and red squares, the Lotterhaven way: a kerb, a gilt edge-line, the squares. */
export function checkerRoad(g: G, r: Rect, sq = 32): void {
  g.fillStyle(KERB, 1); g.fillRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12);
  g.fillStyle(dim(KERB, 0.3), 1); g.fillRect(r.x - 6, r.y + r.h + 2, r.w + 12, 4);
  for (let y = r.y; y < r.y + r.h; y += sq) {
    for (let x = r.x; x < r.x + r.w; x += sq) {
      const k = (Math.floor(x / sq) + Math.floor(y / sq)) % 2;
      const w = Math.min(sq, r.x + r.w - x), h = Math.min(sq, r.y + r.h - y);
      g.fillStyle(k ? PAVE_RED : PAVE_BLACK, 1); g.fillRect(x, y, w, h);
      g.fillStyle(k ? PAVE_RED_LIT : PAVE_BLACK_LIT, 0.55); g.fillRect(x, y, w, 2);
    }
  }
  g.lineStyle(2, GILT, 0.6); g.strokeRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
}

/** A baize lawn: felt nap, a darker cloth edge and a gilt-painted table line round it. */
export function baizeLawn(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(BAIZE_DARK, 1); g.fillRect(r.x, r.y, r.w, r.h);
  g.fillStyle(BAIZE, 1); g.fillRect(r.x + 6, r.y + 6, r.w - 12, r.h - 12);
  for (let i = 0; i < (r.w * r.h) / 900; i++) {
    const x = r.x + 8 + rng() * (r.w - 16), y = r.y + 8 + rng() * (r.h - 16);
    g.fillStyle(rng() < 0.5 ? BAIZE_LIT : BAIZE_DARK, 0.35); g.fillRect(x, y, 3, 1);
  }
  g.lineStyle(1.5, GILT, 0.45); g.strokeRect(r.x + 14, r.y + 14, r.w - 28, r.h - 28);
}

/** A round paved square: rings of black and red setts, a bronze compass-rose of clock hours. */
export function hourSquare(g: G, x: number, y: number, r: number): void {
  g.fillStyle(KERB, 1); g.fillEllipse(x, y, r * 2 + 16, r * 1.6 + 14);
  const rings = Math.floor(r / 26);
  for (let i = rings; i > 0; i--) {
    const rr = (i / rings) * r;
    g.fillStyle(i % 2 ? PAVE_BLACK : PAVE_RED, 1); g.fillEllipse(x, y, rr * 2, rr * 1.6);
    // Setts: radial joints.
    const n = 12 + i * 6;
    g.lineStyle(1, i % 2 ? PAVE_BLACK_LIT : PAVE_RED_LIT, 0.5);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU;
      g.lineBetween(x + Math.cos(a) * rr * 0.86, y + Math.sin(a) * rr * 0.8 * 0.86, x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8);
    }
  }
  // Twelve bronze hour-studs and a meridian line.
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU - Math.PI / 2;
    const sx = x + Math.cos(a) * r * 0.9, sy = y + Math.sin(a) * r * 0.72;
    g.fillStyle(BRASS_DARK, 1); g.fillEllipse(sx, sy + 1, 18, 9);
    g.fillStyle(k === 0 ? GILT : BRASS, 1); g.fillEllipse(sx, sy, 16, 8);
    g.lineStyle(1.5, NUMERAL, 0.7);
    for (let s = 0; s <= Math.min(3, k % 4); s++) g.lineBetween(sx - 3 + s * 2, sy - 2, sx - 3 + s * 2, sy + 2);
  }
  g.lineStyle(3, BRASS, 0.7); g.lineBetween(x, y - r * 0.8, x, y + r * 0.8);
  g.lineStyle(1, BRASS_LIT, 0.6); g.lineBetween(x - 1, y - r * 0.8, x - 1, y + r * 0.8);
}

/** The Escapement Cut: a deep slot in the hill where the town's great wheels turn below. */
export function cutting(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(STONE_DEEP, 1); g.fillRect(r.x, r.y - 10, r.w, r.h + 20);
  g.fillStyle(0x0c0b0d, 1); g.fillRect(r.x, r.y, r.w, r.h);
  // Dressed-stone lips with a brass rail.
  g.fillStyle(STONE_DARK, 1); g.fillRect(r.x, r.y - 12, r.w, 12);
  g.fillStyle(STONE, 1); g.fillRect(r.x, r.y - 14, r.w, 6);
  g.fillStyle(dim(STONE_DEEP, 0.3), 1); g.fillRect(r.x, r.y + r.h, r.w, 10);
  for (let x = r.x + 10; x < r.x + r.w; x += 26) {
    g.fillStyle(BRASS_DARK, 1); g.fillRect(x, r.y - 22, 3, 10);
    g.fillStyle(STONE_LIT, 0.6); g.fillRect(x - 6 + rng() * 4, r.y - 14, 10, 1);
  }
  g.lineStyle(2, BRASS, 0.9); g.lineBetween(r.x, r.y - 22, r.x + r.w, r.y - 22);
  // Warm forge-light far down, through the dark.
  for (let i = 0; i < 6; i++) glow(g, r.x + (i + 0.5) * (r.w / 6) + (rng() - 0.5) * 40, r.y + r.h * 0.6, 40, 0xff9040, 0.05, 3);
}

/** The great wheels turning in the dark of the cut (animated, so `a` is their turn). */
export function cuttingWheels(g: G, r: Rect, a: number): void {
  const n = Math.max(2, Math.round(r.w / 150));
  for (let i = 0; i < n; i++) {
    const x = r.x + (i + 0.5) * (r.w / n), y = r.y + r.h * 0.62;
    const rr = r.h * (i % 2 ? 0.7 : 0.85);
    gear(g, x, y, rr, 18 + (i % 2) * 6, (i % 2 ? -a : a) * (i % 2 ? 1.25 : 1), dim(i % 2 ? COPPER : BRASS, 0.55), 0.5, 6);
  }
  g.fillStyle(0x0c0b0d, 0.35); g.fillRect(r.x, r.y, r.w, r.h * 0.3);
}

/** An iron footbridge over the cut, plank deck and lattice rails. Drawn into the ground. */
export function footbridge(g: G, x: number, y0: number, y1: number, w: number): void {
  g.fillStyle(0x000000, 0.35); g.fillRect(x - w / 2 + 6, y0, w, y1 - y0);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - w / 2 - 6, y0 - 4, w + 12, y1 - y0 + 8);
  g.fillStyle(TIMBER, 1); g.fillRect(x - w / 2, y0, w, y1 - y0);
  for (let y = y0; y < y1; y += 9) { g.fillStyle(y % 18 ? TIMBER_DARK : TIMBER_LIT, 0.55); g.fillRect(x - w / 2, y, w, 1.5); }
  for (const k of [-1, 1]) {
    const rx = x + k * (w / 2 + 3);
    g.fillStyle(IRON, 1); g.fillRect(rx - 3, y0 - 4, 6, y1 - y0 + 8);
    g.lineStyle(1, IRON_LIT, 0.8);
    for (let y = y0; y < y1; y += 14) { g.lineBetween(rx - 3, y, rx + 3, y + 14); g.lineBetween(rx + 3, y, rx - 3, y + 14); }
  }
}

/** The oil sump: a basin of black oil behind an iron coaming, pipes running in. */
export function oilSump(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(IRON_DARK, 1); g.fillRect(r.x - 18, r.y - 18, r.w + 36, r.h + 36);
  g.fillStyle(IRON, 1); g.fillRect(r.x - 14, r.y - 14, r.w + 28, r.h + 28);
  for (let x = r.x - 10; x < r.x + r.w + 10; x += 18) {
    g.fillStyle(IRON_LIT, 1); g.fillCircle(x, r.y - 9, 1.6); g.fillCircle(x, r.y + r.h + 9, 1.6);
  }
  for (let y = r.y - 10; y < r.y + r.h + 10; y += 18) { g.fillStyle(IRON_LIT, 1); g.fillCircle(r.x - 9, y, 1.6); g.fillCircle(r.x + r.w + 9, y, 1.6); }
  g.fillStyle(OIL_DEEP, 1); g.fillRect(r.x, r.y, r.w, r.h);
  g.fillStyle(OIL, 1); g.fillRect(r.x + 6, r.y + 6, r.w - 12, r.h - 12);
  // Old sheen stains in the oil and spills on the coaming.
  for (let i = 0; i < 9; i++) {
    const x = r.x + 30 + rng() * (r.w - 60), y = r.y + 20 + rng() * (r.h - 40);
    g.fillStyle([OIL_SHEEN_A, OIL_SHEEN_B, OIL_SHEEN_C][i % 3], 0.08); g.fillEllipse(x, y, 60 + rng() * 60, 18 + rng() * 14);
  }
  for (let i = 0; i < 6; i++) { g.fillStyle(OIL, 0.6); g.fillEllipse(r.x - 30 + rng() * (r.w + 60), r.y + r.h + 26 + rng() * 10, 30 + rng() * 30, 8); }
}

/** The sump's surface: drifting rainbow sheen and slow bubbles. Animated. */
export function oilSheen(g: G, r: Rect, t: number): void {
  for (let i = 0; i < 5; i++) {
    const ph = t * 0.05 + i * 0.37;
    const x = r.x + r.w * (0.15 + ((i * 0.23 + Math.sin(ph) * 0.12 + 1) % 0.7));
    const y = r.y + r.h * (0.2 + ((i * 0.31 + Math.cos(ph * 1.3) * 0.08 + 1) % 0.6));
    for (let k = 0; k < 3; k++) {
      g.lineStyle(2, [OIL_SHEEN_A, OIL_SHEEN_B, OIL_SHEEN_C][(i + k) % 3], 0.22);
      g.strokeEllipse(x, y, 50 + k * 10 + Math.sin(t + i) * 6, 14 + k * 4);
    }
  }
  for (let i = 0; i < 4; i++) {
    const ph = (t * 0.4 + i * 0.27) % 1;
    const x = r.x + 40 + ((i * 131) % (r.w - 80)), y = r.y + 30 + ((i * 71) % (r.h - 60));
    g.lineStyle(1, 0x8a8070, 0.5 * (1 - ph)); g.strokeEllipse(x, y, 4 + ph * 22, 2 + ph * 8);
  }
}

/** A copper pipe run on the ground with flanges every so often. */
export function pipeRun(g: G, pts: Pt[], w = 10): void {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    g.lineStyle(w + 3, COPPER_DARK, 1); g.lineBetween(a.x, a.y + 2, b.x, b.y + 2);
    g.lineStyle(w, COPPER, 1); g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(2, COPPER_LIT, 0.8); g.lineBetween(a.x, a.y - w * 0.25, b.x, b.y - w * 0.25);
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = 40; d < len; d += 80) {
      const fx = a.x + ((b.x - a.x) * d) / len, fy = a.y + ((b.y - a.y) * d) / len;
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(fx, fy, w * 0.75);
      g.fillStyle(BRASS, 1); g.fillCircle(fx, fy - 1, w * 0.6);
    }
  }
  for (const p of pts) { g.fillStyle(COPPER_DARK, 1); g.fillCircle(p.x, p.y + 1, w * 0.7); g.fillStyle(COPPER, 1); g.fillCircle(p.x, p.y, w * 0.55); }
}

// ── Set pieces (drawn up from their base line) ───────────────────────

/** A green-shaded lamp on a brass post, the kind that hangs over every card table on the isle. */
export function greenLamp(g: G, x: number, y: number): void {
  shadow(g, x, y, 22, 7);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 2, y - 66, 4, 66);
  g.fillStyle(BRASS, 1); g.fillRect(x - 1, y - 66, 2, 66);
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, y - 1, 14, 5);
  g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(x, y - 66, x + 14, y - 72);
  // The shade.
  g.fillStyle(dim(LAMP_GREEN, 0.35), 1); g.fillTriangle(x + 4, y - 60, x + 24, y - 60, x + 14, y - 74);
  g.fillStyle(LAMP_GREEN, 1); g.fillTriangle(x + 5, y - 61, x + 23, y - 61, x + 14, y - 73);
  g.fillStyle(LAMP_GLOW, 0.95); g.fillEllipse(x + 14, y - 60, 16, 4);
  glow(g, x + 14, y - 54, 26, LAMP_GLOW, 0.05, 3);
}

/** Brass stanchions and a red rope, for queues. */
export function queueRail(g: G, x0: number, x1: number, y: number): void {
  const n = Math.max(2, Math.round((x1 - x0) / 60));
  const posts: Pt[] = [];
  for (let i = 0; i <= n; i++) posts.push({ x: x0 + ((x1 - x0) * i) / n, y });
  for (let i = 1; i < posts.length; i++) {
    const a = posts[i - 1], b = posts[i];
    g.lineStyle(3, dim(CARD_RED, 0.3), 1);
    g.beginPath(); g.moveTo(a.x, a.y - 26);
    for (let k = 1; k <= 8; k++) { const t = k / 8; g.lineTo(a.x + (b.x - a.x) * t, a.y - 26 + Math.sin(t * Math.PI) * 9); }
    g.strokePath();
    g.lineStyle(2, CARD_RED, 1);
    g.beginPath(); g.moveTo(a.x, a.y - 27);
    for (let k = 1; k <= 8; k++) { const t = k / 8; g.lineTo(a.x + (b.x - a.x) * t, a.y - 27 + Math.sin(t * Math.PI) * 9); }
    g.strokePath();
  }
  for (const p of posts) {
    g.fillStyle(BRASS_DARK, 1); g.fillEllipse(p.x, p.y, 14, 5);
    g.fillStyle(BRASS, 1); g.fillRect(p.x - 1.5, p.y - 30, 3, 30);
    g.fillStyle(BRASS_LIT, 1); g.fillCircle(p.x, p.y - 31, 3);
  }
}

/** A notice board of numbers: this week's drawn Lots, and the hours each owes. */
export function hoursBoard(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y, 90, 14);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 40, y - 22, 5, 22); g.fillRect(x + 35, y - 22, 5, 22);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 46, y - 98, 92, 78);
  g.fillStyle(0x1a1a1a, 1); g.fillRect(x - 42, y - 94, 84, 70);
  g.fillStyle(GILT, 1); g.fillRect(x - 46, y - 104, 92, 8);
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 2; c++) {
      const tx = x - 36 + c * 42, ty = y - 86 + r * 11;
      g.fillStyle(ENAMEL, 0.9); g.fillRect(tx, ty, 18, 8);
      g.fillStyle(NUMERAL, 1); for (let d = 0; d < 3; d++) g.fillRect(tx + 2 + d * 5.5, ty + 2, 3, 4);
      g.fillStyle(rng() < 0.3 ? CARD_RED : PAID_GREY_SAFE, 1); g.fillRect(tx + 21, ty + 1, 14, 6);
    }
  }
}
const PAID_GREY_SAFE = 0x8a8a84;

/** A watch-shop front: bay window full of hanging watches, and a giant pocket watch for a sign. */
export function watchShop(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 4, w * 1.1, 24);
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 4, top - 4, w + 8, h + 4);
  g.fillStyle(STONE, 1); g.fillRect(x0, top, w, h);
  for (let yy = top + 12; yy < y; yy += 14) { g.lineStyle(1, STONE_DARK, 0.4); g.lineBetween(x0, yy, x0 + w, yy); }
  // Mansard roof in slate with a dormer.
  g.fillStyle(SLATE, 1); g.fillRect(x0 - 10, top - 46, w + 20, 46);
  g.fillStyle(SLATE_LIT, 1); for (let xx = x0 - 8; xx < x0 + w + 10; xx += 10) g.fillRect(xx, top - 44, 1, 42);
  g.fillStyle(BRASS, 1); g.fillRect(x0 - 12, top - 4, w + 24, 5);
  g.fillStyle(STONE, 1); g.fillRect(x - 18, top - 70, 36, 30);
  g.fillStyle(SLATE, 1); g.fillTriangle(x - 24, top - 68, x + 24, top - 68, x, top - 86);
  dial(g, x, top - 56, 10, 1.3, 4.6);
  // The bay window.
  const bw = w * 0.56, bx = x - w * 0.12 - bw / 2, by = top + h * 0.22, bh = h * 0.56;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(bx - 5, by - 5, bw + 10, bh + 10);
  g.fillStyle(0x2a2418, 1); g.fillRect(bx, by, bw, bh);
  glow(g, bx + bw / 2, by + bh / 2, bw * 0.5, LAMP_GLOW, 0.05, 3);
  for (let i = 0; i < 9; i++) {
    const wx = bx + 10 + (i % 5) * (bw - 20) / 4, wy = by + 14 + Math.floor(i / 5) * 30 + (i % 2) * 6;
    g.lineStyle(1, GILT, 0.8); g.lineBetween(wx, by, wx, wy - 6);
    dial(g, wx, wy, 5 + rng() * 2, rng() * TAU, rng() * TAU, ENAMEL, i % 3 ? GILT : 0xd8d8d8);
  }
  g.fillStyle(GLASS, 0.18); g.fillRect(bx, by, bw, bh);
  g.lineStyle(2, TIMBER, 1); g.lineBetween(bx + bw / 3, by, bx + bw / 3, by + bh); g.lineBetween(bx + (bw * 2) / 3, by, bx + (bw * 2) / 3, by + bh);
  g.lineStyle(1.5, GLASS_LIT, 0.4); g.lineBetween(bx + 6, by + 6, bx + 20, by + bh - 10);
  // The door.
  const dx = x + w * 0.32;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(dx - 15, y - h * 0.62, 30, h * 0.62);
  g.fillStyle(0x3c2a5a, 1); g.fillRect(dx - 12, y - h * 0.6, 24, h * 0.6);
  g.fillStyle(GLASS, 0.3); g.fillRect(dx - 9, y - h * 0.56, 18, h * 0.22);
  g.fillStyle(GILT, 1); g.fillCircle(dx + 8, y - h * 0.3, 2);
  // The sign: a huge pocket watch on a bracket, its chain looping back to the wall.
  const sx = x0 + w + 4, sy = top + 16;
  g.lineStyle(3, IRON_DARK, 1); g.lineBetween(x0 + w - 6, sy - 18, sx + 22, sy - 18);
  g.lineStyle(2, GILT, 1);
  for (let k = 0; k < 7; k++) g.strokeEllipse(x0 + w - 4 + k * 4, sy - 12 + Math.sin(k * 0.8) * 4, 5, 3);
  g.fillStyle(GILT, 1); g.fillCircle(sx + 22, sy - 12, 4);
  dial(g, sx + 22, sy + 12, 18, 2.4, 0.6);
}

/**
 * The Hour Office: a columned civic front where the drawn hand in their hours. A pediment with a
 * winged hourglass, a row of numbered ticket windows with green lamps over them, a clock at the
 * top that runs *fast*, and a brass tube on the roof down which the paid hours go to the Prince.
 */
export function hourOffice(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 6, w * 1.08, 30);
  const x0 = x - w / 2, top = y - h;
  // Steps.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? STONE : STONE_LIT, 1); g.fillRect(x0 - 10 - k * 6, y - 14 + k * 5, w + 20 + k * 12, 6); }
  // Body and rustication.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0, top, w, h - 14);
  g.fillStyle(STONE, 1); g.fillRect(x0 + 4, top + 4, w - 8, h - 22);
  for (let yy = top + 18; yy < y - 18; yy += 16) { g.lineStyle(1, STONE_DARK, 0.45); g.lineBetween(x0 + 4, yy, x0 + w - 4, yy); }
  // Ticket windows, each numbered, a green lamp over each, a grey face in some.
  const n = 5, ww = (w - 60) / n;
  for (let i = 0; i < n; i++) {
    const wx = x0 + 30 + i * ww + ww / 2, wy = y - 70;
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(wx - 22, wy - 36, 44, 50);
    g.fillStyle(0x221c14, 1); g.fillRect(wx - 18, wy - 32, 36, 36);
    glow(g, wx, wy - 14, 22, LAMP_GLOW, 0.05, 2);
    if (i !== 2) {
      // A clerk behind the grille.
      g.fillStyle(0xd8c0a0, 1); g.fillCircle(wx, wy - 14, 7);
      g.fillStyle(LAMP_GREEN, 1); g.fillRect(wx - 9, wy - 22, 18, 4);
      g.fillStyle(0x3a3a40, 1); g.fillRect(wx - 9, wy - 7, 18, 10);
    }
    g.lineStyle(1, BRASS, 0.9); for (let k = -16; k <= 16; k += 5) g.lineBetween(wx + k, wy - 32, wx + k, wy + 4);
    g.fillStyle(STONE_LIT, 1); g.fillRect(wx - 24, wy + 4, 48, 6);
    g.fillStyle(ENAMEL, 1); g.fillCircle(wx, wy - 44, 6);
    g.fillStyle(NUMERAL, 1); for (let s = 0; s <= i; s++) g.fillRect(wx - 3 + s * 1.6 - i * 0.8, wy - 47, 1, 6);
    g.lineStyle(1.5, BRASS_DARK, 1); g.lineBetween(wx, wy - 50, wx, wy - 56);
  }
  // Columns between.
  for (let i = 0; i <= n; i++) {
    const cx = x0 + 30 + i * ww;
    g.fillStyle(STONE_DARK, 1); g.fillRect(cx - 7, top + 30, 14, h - 46);
    g.fillStyle(STONE_LIT, 1); g.fillRect(cx - 5, top + 30, 5, h - 46);
    g.fillStyle(STONE_LIT, 1); g.fillRect(cx - 9, top + 26, 18, 6); g.fillRect(cx - 9, y - 20, 18, 6);
  }
  // Entablature, pediment, the winged hourglass.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 10, top - 4, w + 20, 32);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x0 - 10, top - 4, w + 20, 6);
  g.fillStyle(BRASS, 1); g.fillRect(x0 + 20, top + 8, w - 40, 12);
  g.fillStyle(NUMERAL, 1); for (let k = 0; k < 18; k++) g.fillRect(x0 + 34 + k * ((w - 68) / 18), top + 11, 4, 6);
  g.fillStyle(STONE, 1); g.fillTriangle(x0 - 14, top - 4, x0 + w + 14, top - 4, x, top - 70);
  g.fillStyle(STONE_DARK, 0.5); g.fillTriangle(x0 + 8, top - 8, x0 + w - 8, top - 8, x, top - 60);
  for (const k of [-1, 1]) {
    for (let f = 0; f < 5; f++) {
      g.fillStyle(f % 2 ? GILT : BRASS, 1);
      g.fillEllipse(x + k * (16 + f * 9), top - 30 - f * 3 + f * f * 0.6, 14, 6);
    }
  }
  hourglass(g, x, top - 14, 34, 0.25, false, 0, BRASS_DARK);
  // The fast clock on a little tower.
  g.fillStyle(STONE, 1); g.fillRect(x - 26, top - 120, 52, 52);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 26, top - 70, 52, 4);
  g.fillStyle(SLATE, 1); g.fillTriangle(x - 32, top - 118, x + 32, top - 118, x, top - 150);
  g.fillStyle(GILT, 1); g.fillCircle(x, top - 152, 3);
  // The hour tube: a brass pipe from the roof away up the hill toward the Regulator.
  g.lineStyle(9, BRASS_DARK, 1); g.lineBetween(x0 + w - 30, top - 4, x0 + w - 30, top - 80);
  g.lineStyle(6, BRASS, 1); g.lineBetween(x0 + w - 30, top - 4, x0 + w - 30, top - 80);
  g.lineStyle(9, BRASS_DARK, 1); g.lineBetween(x0 + w - 30, top - 80, x0 + w - 140, top - 130);
  g.lineStyle(6, BRASS, 1); g.lineBetween(x0 + w - 30, top - 80, x0 + w - 140, top - 130);
  for (let k = 0; k < 4; k++) { g.fillStyle(BRASS_LIT, 1); g.fillCircle(x0 + w - 30, top - 14 - k * 20, 2); }
  void rng;
}

/** Where the Hour Office's fast clock sits, so `animateOver` can run its hands. */
export const hourOfficeClock = (x: number, y: number, h: number): Pt => ({ x, y: y - h - 94 });

/**
 * The great astronomical clock: a square limestone tower over the square, its face a nest of
 * rings — the hours in black and gold, a zodiac band, the moon's ball, the sun's gilt pointer —
 * with an arcade of little figures above (the King's lucky children) who come round on the hour,
 * and a gilt roulette wheel on the cupola. Hands and rings turn in `astroHands`.
 */
export function astroTower(g: G, x: number, y: number, rng: () => number): void {
  const w = 132, h = 330;
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 6, w * 1.6, 34);
  // Plinth and buttresses.
  g.fillStyle(STONE_DEEP, 1); g.fillRect(x0 - 18, y - 30, w + 36, 30);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 14, y - 34, w + 28, 8);
  for (const k of [-1, 1]) {
    const bx = x + k * (w / 2 + 4);
    g.fillStyle(STONE_DARK, 1); g.fillTriangle(bx - 10, y - 30, bx + 10, y - 30, bx, top + 90);
  }
  // The shaft, coursed.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0, top, w, h - 30);
  g.fillStyle(STONE, 1); g.fillRect(x0 + 5, top, w - 10, h - 30);
  for (let yy = top + 10; yy < y - 30; yy += 18) {
    g.lineStyle(1, STONE_DARK, 0.5); g.lineBetween(x0 + 5, yy, x0 + w - 5, yy);
    const off = ((yy - top) / 18) % 2 ? 0 : 20;
    for (let xx = x0 + 15 + off; xx < x0 + w - 5; xx += 40) g.lineBetween(xx, yy, xx, yy + 18);
  }
  g.fillStyle(STONE_LIT, 0.5); g.fillRect(x0 + 5, top, 8, h - 30);
  // A tall doorway at the foot, a bell-rope hanging.
  g.fillStyle(STONE_DEEP, 1); g.fillRect(x - 20, y - 92, 40, 62);
  g.fillStyle(STONE_DEEP, 1); g.fillCircle(x, y - 92, 20);
  g.fillStyle(0x100c0a, 1); g.fillRect(x - 15, y - 88, 30, 58); g.fillCircle(x, y - 88, 15);
  g.lineStyle(2, CARD_RED, 1); g.lineBetween(x + 6, y - 100, x + 6, y - 40);
  // The great face: a square brass frame, the rings inside.
  const fy = top + 140, R = 56;
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - R - 10, fy - R - 10, R * 2 + 20, R * 2 + 20);
  g.fillStyle(0x1a2048, 1); g.fillRect(x - R - 6, fy - R - 6, R * 2 + 12, R * 2 + 12);
  for (const [cx, cy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]) {
    g.fillStyle(GILT, 0.9); g.fillCircle(x + cx * (R + 1), fy + cy * (R + 1), 4);
  }
  // Day/night band: blue sky above, black below.
  g.fillStyle(0x3a5aa8, 1); g.fillCircle(x, fy, R);
  g.fillStyle(0x0e0e18, 1); g.beginPath(); g.arc(x, fy, R, 0, Math.PI, false); g.closePath(); g.fillPath();
  g.fillStyle(0x8a4a2a, 1); g.beginPath(); g.arc(x, fy, R, Math.PI * 0.92, Math.PI * 1.08, false); g.lineTo(x, fy); g.closePath(); g.fillPath();
  g.fillStyle(0x8a4a2a, 1); g.beginPath(); g.arc(x, fy, R, -Math.PI * 0.08, Math.PI * 0.08, false); g.lineTo(x, fy); g.closePath(); g.fillPath();
  for (let i = 0; i < 26; i++) { const a = rng() * Math.PI, d = rng() * R * 0.85; g.fillStyle(0xfff0c0, 0.7); g.fillCircle(x + Math.cos(a) * d, fy + Math.sin(a) * d, 0.8); }
  // Chapter ring: 24 hours, black ring, gold numerals as strokes.
  g.lineStyle(10, NUMERAL, 1); g.strokeCircle(x, fy, R - 4);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    g.lineStyle(2, GILT, 1); g.lineBetween(x + Math.cos(a) * (R - 8), fy + Math.sin(a) * (R - 8), x + Math.cos(a) * (R - 1), fy + Math.sin(a) * (R - 1));
  }
  g.lineStyle(1.5, GILT, 1); g.strokeCircle(x, fy, R); g.strokeCircle(x, fy, R - 9);
  // Figures' arcade over the face: six little arches, each a lucky child carved in gilt.
  const ay = fy - R - 26;
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 + 8, ay - 22, w - 16, 30);
  for (let i = 0; i < 6; i++) {
    const ax = x0 + 18 + i * ((w - 36) / 5);
    g.fillStyle(0x141018, 1); g.fillRect(ax - 7, ay - 14, 14, 20); g.fillCircle(ax, ay - 14, 7);
    g.fillStyle(GILT, 1); g.fillCircle(ax, ay - 8, 3); g.fillRect(ax - 2.5, ay - 5, 5, 9);
  }
  g.fillStyle(STONE_LIT, 1); g.fillRect(x0 + 4, ay + 8, w - 8, 4);
  // Lower: a calendar dial with the Draw days marked in red.
  const cy = fy + R + 56;
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, cy, 36);
  g.fillStyle(ENAMEL, 1); g.fillCircle(x, cy, 32);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU;
    g.fillStyle(i % 7 === 0 ? CARD_RED : NUMERAL, 1);
    g.fillCircle(x + Math.cos(a) * 26, cy + Math.sin(a) * 26, i % 7 === 0 ? 2.6 : 1.1);
  }
  g.fillStyle(BRASS, 1); g.fillCircle(x, cy, 12);
  g.lineStyle(1, BRASS_DARK, 1); for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.lineBetween(x, cy, x + Math.cos(a) * 12, cy + Math.sin(a) * 12); }
  // The belfry, open arches, a bell.
  const by = top + 10;
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 6, by - 6, w + 12, 10);
  g.fillStyle(STONE, 1); g.fillRect(x0 + 4, top - 54, w - 8, 50);
  for (const k of [-1, 1]) { g.fillStyle(0x100c0a, 1); g.fillRect(x + k * 30 - 14, top - 46, 28, 38); g.fillCircle(x + k * 30, top - 46, 14); }
  g.fillStyle(BRASS_DARK, 1); g.fillTriangle(x - 12, top - 12, x + 12, top - 12, x, top - 38);
  g.fillStyle(BRASS, 1); g.fillEllipse(x, top - 12, 26, 6);
  // The cupola and its wheel.
  g.fillStyle(SLATE, 1); g.fillTriangle(x0 - 8, top - 52, x0 + w + 8, top - 52, x, top - 120);
  g.fillStyle(SLATE_LIT, 0.6); g.fillTriangle(x0 - 8, top - 52, x, top - 52, x, top - 120);
  g.fillStyle(GILT, 1); g.fillRect(x - 2, top - 150, 4, 34);
}

/** Positions on the astronomical clock that turn, for `astroHands`. */
export const astroFace = (x: number, y: number): { face: Pt; cal: Pt; wheel: Pt } => ({
  face: { x, y: y - 330 + 140 }, cal: { x, y: y - 330 + 140 + 56 + 56 }, wheel: { x, y: y - 330 - 150 },
});

/** The astronomical clock's moving parts: hands, zodiac ring, moon ball, calendar, the gilt wheel. */
export function astroHands(g: G, x: number, y: number, t: number): void {
  const { face, cal, wheel } = astroFace(x, y);
  const R = 56;
  // Zodiac ring: an off-centre gilt ring, turning slowly.
  const zx = face.x, zy = face.y - 12, zr = 34;
  g.lineStyle(5, BRASS, 0.95); g.strokeCircle(zx, zy, zr);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + t * 0.05;
    g.fillStyle(i % 2 ? CARD_RED : NUMERAL, 1); g.fillCircle(zx + Math.cos(a) * zr, zy + Math.sin(a) * zr, 1.8);
  }
  // Moon ball on its own hand.
  const ma = t * 0.11 - Math.PI / 2;
  g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(face.x, face.y, face.x + Math.cos(ma) * (R - 16), face.y + Math.sin(ma) * (R - 16));
  g.fillStyle(0x222222, 1); g.fillCircle(face.x + Math.cos(ma) * (R - 16), face.y + Math.sin(ma) * (R - 16), 6);
  g.fillStyle(0xf0f0e0, 1); g.fillCircle(face.x + Math.cos(ma) * (R - 16) - 1.5, face.y + Math.sin(ma) * (R - 16), 5.5);
  // The sun hand — the hour — and the minute hand, blued, and a red "Draw" hand that only moves weekly.
  hand(g, face.x, face.y, t * 0.18 - Math.PI / 2, R * 0.62, 3, GILT);
  g.fillStyle(GILT, 1); g.fillCircle(face.x + Math.cos(t * 0.18 - Math.PI / 2) * R * 0.5, face.y + Math.sin(t * 0.18 - Math.PI / 2) * R * 0.5, 5);
  hand(g, face.x, face.y, t * 1.1 - Math.PI / 2, R * 0.82, 2, BLUED);
  hand(g, face.x, face.y, 0.4, R * 0.7, 1.5, CARD_RED);
  g.fillStyle(GILT, 1); g.fillCircle(face.x, face.y, 4);
  // Calendar disc's pointer.
  hand(g, cal.x, cal.y, t * 0.02, 28, 2, BLUED_DARK);
  // The gilt wheel on the cupola, spinning like the House's.
  const wa = t * 1.4;
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(wheel.x, wheel.y, 15);
  for (let i = 0; i < 12; i++) {
    const a = wa + (i / 12) * TAU;
    g.fillStyle(i % 2 ? CARD_RED : CARD_BLACK, 1);
    g.beginPath(); g.moveTo(wheel.x, wheel.y); g.arc(wheel.x, wheel.y, 13, a, a + TAU / 12, false); g.closePath(); g.fillPath();
  }
  g.fillStyle(GILT, 1); g.fillCircle(wheel.x, wheel.y, 4);
  g.lineStyle(1.5, GILT, 1); g.strokeCircle(wheel.x, wheel.y, 14);
  glow(g, wheel.x, wheel.y, 22, GILT, 0.03 + Math.sin(t * 2) * 0.015, 2);
}

/**
 * The Regulator — Prince Tock's hall. A long gilt-roofed hall of dark walnut and glass, and in the
 * middle a tall glazed case like a longcase clock the size of a church, in which a pendulum the
 * height of three men swings. Over the door the Prince's device: a key in a crowned dial.
 */
export function regulator(g: G, x: number, y: number, w: number, rng: () => number): void {
  const x0 = x - w / 2;
  const hallH = 150, top = y - hallH;
  shadow(g, x, y + 6, w * 1.06, 34);
  // Hall wings.
  for (const k of [-1, 1]) {
    const wx0 = k < 0 ? x0 : x + 90, ww = w / 2 - 90;
    g.fillStyle(TOCK_DARK, 1); g.fillRect(wx0, top, ww, hallH);
    g.fillStyle(dim(TOCK_DARK, 0.2), 1); g.fillRect(wx0, y - 20, ww, 20);
    const bays = Math.round(ww / 56);
    for (let i = 0; i < bays; i++) {
      const bx = wx0 + (i + 0.5) * (ww / bays);
      g.fillStyle(BRASS_DARK, 1); g.fillRect(bx - 17, top + 30, 34, 90);
      g.fillStyle(0x1a1810, 1); g.fillRect(bx - 14, top + 33, 28, 84);
      glow(g, bx, top + 75, 18, LAMP_GLOW, 0.04, 2);
      // Through each window: a clock on the wall inside, every one at the same second.
      dial(g, bx, top + 58, 8, 0.2, 5.9);
      g.fillStyle(GLASS, 0.15); g.fillRect(bx - 14, top + 33, 28, 84);
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(bx, top + 30, 17);
      g.fillStyle(0x1a1810, 1); g.fillCircle(bx, top + 32, 14);
    }
    // Gilt roof with a cresting of tiny gears.
    g.fillStyle(BRASS_DARK, 1); g.fillRect(wx0 - 6, top - 14, ww + 12, 16);
    g.fillStyle(GILT, 1); g.fillRect(wx0 - 6, top - 16, ww + 12, 5);
    for (let gx = wx0 + 10; gx < wx0 + ww; gx += 26) gear(g, gx, top - 22, 7, 8, gx * 0.1, BRASS, 1, 3);
  }
  // The case: a tall longcase tower of glass and walnut.
  const cw = 170, ch = 380, ctop = y - ch;
  g.fillStyle(dim(TOCK_DARK, 0.3), 1); g.fillRect(x - cw / 2 - 8, ctop, cw + 16, ch);
  g.fillStyle(TOCK_DARK, 1); g.fillRect(x - cw / 2, ctop, cw, ch);
  // Hood: a broken pediment, gilt finials, the Prince's dial.
  g.fillStyle(TOCK_DARK, 1); g.fillTriangle(x - cw / 2 - 18, ctop + 6, x - 14, ctop + 6, x - 14, ctop - 44);
  g.fillTriangle(x + cw / 2 + 18, ctop + 6, x + 14, ctop + 6, x + 14, ctop - 44);
  for (const fx of [x - cw / 2 - 10, x, x + cw / 2 + 10]) { g.fillStyle(GILT, 1); g.fillCircle(fx, ctop - 52 + (fx === x ? -14 : 0), 6); g.fillRect(fx - 2, ctop - 48 + (fx === x ? -14 : 0), 4, 16); }
  g.fillStyle(GILT, 1); g.fillRect(x - cw / 2 - 12, ctop + 4, cw + 24, 6);
  const dy = ctop + 66;
  g.fillStyle(GILT, 1); g.fillRect(x - 56, dy - 56, 112, 112);
  dial(g, x, dy, 48, 0, 0, ENAMEL, GILT);
  // Spandrels: little crowns in the corners.
  for (const [cx, cy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]) {
    const sx = x + cx * 47, sy = dy + cy * 47;
    g.fillStyle(BRASS_DARK, 1); g.fillTriangle(sx - 5, sy + 3, sx + 5, sy + 3, sx, sy - 5);
  }
  // The trunk: a long glass door — the pendulum swings behind it (drawn in `regulatorPendulum`).
  const ty0 = dy + 66, ty1 = y - 52;
  g.fillStyle(0x0e0c0a, 1); g.fillRect(x - 56, ty0, 112, ty1 - ty0);
  g.lineStyle(4, GILT, 1); g.strokeRect(x - 56, ty0, 112, ty1 - ty0);
  g.fillStyle(BRASS, 0.18); for (let i = 0; i < 6; i++) g.fillRect(x - 50, ty0 + 8 + i * ((ty1 - ty0 - 16) / 6), 100, 1);
  // The plinth and doors.
  g.fillStyle(dim(TOCK_DARK, 0.2), 1); g.fillRect(x - cw / 2 - 12, y - 50, cw + 24, 50);
  g.fillStyle(GILT, 1); g.fillRect(x - cw / 2 - 12, y - 52, cw + 24, 4);
  g.fillStyle(0x1a120a, 1); g.fillRect(x - 28, y - 46, 56, 46);
  g.lineStyle(1.5, GILT, 0.9); g.strokeRect(x - 28, y - 46, 28, 46); g.strokeRect(x, y - 46, 28, 46);
  // The device over the door: a winding key through a crowned dial.
  g.fillStyle(GILT, 1); g.fillCircle(x, y - 64, 9);
  g.fillStyle(TOCK_DARK, 1); g.fillCircle(x, y - 64, 5);
  g.lineStyle(3, GILT, 1); g.lineBetween(x - 18, y - 64, x + 18, y - 64);
  g.fillStyle(GILT, 1); g.fillRect(x + 14, y - 70, 6, 12);
  // Steps.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? PAVE_RED : PAVE_BLACK, 1); g.fillRect(x - 60 - k * 8, y - 6 + k * 4, 120 + k * 16, 5); }
  void rng;
}

/** The Regulator's great pendulum swinging in its glass trunk. Animated (animateOver). */
export function regulatorPendulum(g: G, x: number, y: number, t: number): void {
  const pivotY = y - 380 + 66 + 66 + 4;
  const len = 380 - 66 - 66 - 52 - 30;
  const a = Math.sin(t * 2.4) * 0.16;
  const bx = x + Math.sin(a) * len, by = pivotY + Math.cos(a) * len;
  g.lineStyle(4, GILT, 1); g.lineBetween(x, pivotY, bx, by);
  g.lineStyle(1.5, BRASS_LIT, 0.8); g.lineBetween(x - 1, pivotY, bx - 1, by);
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(bx, by + 1, 22);
  g.fillStyle(GILT, 1); g.fillCircle(bx, by, 21);
  g.fillStyle(TOCK_LIT, 0.7); g.fillEllipse(bx - 6, by - 7, 14, 7);
  glow(g, bx, by, 30, GILT, 0.03, 2);
  // The beat glass reflecting.
  g.lineStyle(1.5, GLASS_LIT, 0.12 + Math.abs(Math.sin(t * 2.4)) * 0.08);
  g.lineBetween(x - 44, pivotY + 20, x - 30, pivotY + len);
}

/**
 * A gear-tower: an iron lattice tower with a stack of exposed wheels up its face, a little clock
 * cabin at the top and a weathervane shaped like a minute hand. The wheels turn in `gearTowerSpin`.
 */
export function gearTower(g: G, x: number, y: number, h: number, rng: () => number): void {
  const w = 74;
  shadow(g, x, y + 4, w * 1.6, 22);
  // Four legs splaying out, cross-braced.
  const top = y - h;
  for (const k of [-1, 1]) {
    g.lineStyle(6, IRON_DARK, 1); g.lineBetween(x + k * w * 0.62, y, x + k * w * 0.32, top + 40);
    g.lineStyle(3, IRON_LIT, 0.6); g.lineBetween(x + k * w * 0.62 - 1, y, x + k * w * 0.32 - 1, top + 40);
  }
  for (let i = 0; i < 6; i++) {
    const k0 = i / 6, k1 = (i + 1) / 6;
    const wy0 = y - (h - 40) * k0, wy1 = y - (h - 40) * k1;
    const hw0 = w * (0.62 - 0.3 * k0), hw1 = w * (0.62 - 0.3 * k1);
    g.lineStyle(2, IRON, 1); g.lineBetween(x - hw0, wy0, x + hw1, wy1); g.lineBetween(x + hw0, wy0, x - hw1, wy1);
    g.lineStyle(2.5, IRON_DARK, 1); g.lineBetween(x - hw1, wy1, x + hw1, wy1);
  }
  // Iron-sheet back plate behind the wheels.
  g.fillStyle(dim(IRON, 0.25), 0.9); g.fillRect(x - 18, top + 44, 36, h - 70);
  for (let yy = top + 50; yy < y - 30; yy += 20) { g.fillStyle(IRON_LIT, 0.7); g.fillCircle(x - 14, yy, 1.4); g.fillCircle(x + 14, yy, 1.4); }
  // The clock cabin.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 30, top - 12, 60, 56);
  g.fillStyle(COPPER, 1); g.fillRect(x - 27, top - 9, 54, 50);
  for (let xx = x - 24; xx < x + 26; xx += 8) { g.fillStyle(COPPER_DARK, 0.6); g.fillRect(xx, top - 9, 1.5, 50); }
  g.fillStyle(dim(COPPER, 0.3), 1); g.fillTriangle(x - 38, top - 10, x + 38, top - 10, x, top - 46);
  g.fillStyle(COPPER_LIT, 0.6); g.fillTriangle(x - 38, top - 10, x, top - 10, x, top - 46);
  g.lineStyle(2, IRON_DARK, 1); g.lineBetween(x, top - 46, x, top - 70);
  void rng;
}

/** The gear-tower's turning parts: a stack of meshed wheels, a dial on the cabin, the vane. */
export function gearTowerSpin(g: G, x: number, y: number, h: number, t: number, seed: number): void {
  const top = y - h;
  const wheels = [
    { dy: 70, r: 26, n: 14 }, { dy: 118, r: 20, n: 11 }, { dy: 160, r: 24, n: 13 }, { dy: 206, r: 18, n: 10 },
  ].filter((wh) => wh.dy < h - 40);
  let dir = 1;
  wheels.forEach((wh, i) => {
    const wx = x + (i % 2 ? 10 : -10);
    gear(g, wx, top + wh.dy, wh.r, wh.n, dir * t * (40 / wh.r) * 0.6 + seed, i % 2 ? COPPER : BRASS, 1, 4);
    dir = -dir;
  });
  dial(g, x, top + 16, 15, t * 0.3 + seed, t * 3.6 + seed);
  // The vane: a gilt minute hand pointing downwind.
  const va = Math.sin(t * 0.3 + seed) * 0.6;
  hand(g, x, top - 70, va, 18, 2, GILT);
}

/**
 * A pendulum gantry: two iron A-frames and a beam high over a footbridge, from which a great bob
 * hangs and swings across the deck. The frame is the piece; `gantryBob` swings in `animateOver`.
 */
export function pendulumGantry(g: G, x: number, y: number, span: number): void {
  const h = 230;
  for (const k of [-1, 1]) {
    const fx = x + k * span / 2;
    shadow(g, fx, y + 2, 50, 12);
    g.lineStyle(7, IRON_DARK, 1); g.lineBetween(fx - 22, y, fx, y - h); g.lineBetween(fx + 22, y, fx, y - h);
    g.lineStyle(3, IRON_LIT, 0.5); g.lineBetween(fx - 22, y, fx - 1, y - h);
    for (let i = 1; i < 5; i++) { const yy = y - (h * i) / 5, hw = 22 * (1 - i / 5); g.lineStyle(2, IRON, 1); g.lineBetween(fx - hw, yy, fx + hw, yy); }
    g.fillStyle(BRASS_DARK, 1); g.fillRect(fx - 26, y - 6, 52, 6);
  }
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - span / 2 - 12, y - h - 10, span + 24, 14);
  g.fillStyle(IRON_LIT, 0.6); g.fillRect(x - span / 2 - 12, y - h - 10, span + 24, 3);
  for (let xx = x - span / 2; xx < x + span / 2; xx += 18) { g.fillStyle(IRON_LIT, 1); g.fillCircle(xx, y - h - 3, 1.5); }
  gear(g, x, y - h - 4, 14, 10, 0, BRASS, 1, 4);
}

/** The gantry's bob: rod from the beam, a great brass disc sweeping across the bridge. */
export function gantryBob(g: G, x: number, y: number, t: number, period: number, phase: number): Pt {
  const h = 230;
  const a = Math.sin((t / period) * TAU + phase) * 0.62;
  const len = h - 40;
  const bx = x + Math.sin(a) * len, by = y - h - 4 + Math.cos(a) * len;
  g.lineStyle(4, IRON_DARK, 1); g.lineBetween(x, y - h - 4, bx, by);
  g.lineStyle(1.5, IRON_LIT, 0.7); g.lineBetween(x - 1, y - h - 4, bx - 1, by);
  pendulumBob(g, bx, by, 22, Math.abs(Math.cos((t / period) * TAU + phase)));
  // Its shadow on the deck.
  g.fillStyle(0x000000, 0.18); g.fillEllipse(bx, y - 4, 34, 9);
  return { x: bx, y: by };
}

/**
 * An hourglass well: a stone well-ring sunk into the paving with a giant hourglass standing in it,
 * its lower bulb half buried — the hours pour down out of sight. A brass winch for turning it.
 */
export function hourglassWell(g: G, x: number, y: number, s: number): void {
  const R = 46 * s;
  shadow(g, x, y + 4, R * 2.6, R * 0.6);
  // The ring.
  g.fillStyle(STONE_DEEP, 1); g.fillEllipse(x, y - 6, R * 2.4, R * 0.9);
  g.fillStyle(STONE_DARK, 1); g.fillEllipse(x, y - 10, R * 2.3, R * 0.82);
  g.fillStyle(0x0c0a08, 1); g.fillEllipse(x, y - 12, R * 1.9, R * 0.62);
  // The glass rising out of the well.
  const gh = 160 * s;
  const neckY = y - 18;
  const pts: Pt[] = [];
  for (let i = 0; i <= 14; i++) {
    const k = i / 14;
    pts.push({ x: x + Math.sin((1 - k) * Math.PI * 0.5 + 0.15) * (1 - k * 0.9) * R * 0.78, y: neckY - gh + k * gh });
  }
  for (let i = 14; i >= 0; i--) pts.push({ x: 2 * x - pts[i].x, y: pts[i].y });
  g.fillStyle(GLASS, 0.3); g.fillPoints(pts, true);
  // Sand high in the bulb, cupping down to the neck, its thread vanishing into the well.
  const lvl = neckY - gh * 0.48;
  const sandPts = pts.filter((p) => p.y >= lvl);
  if (sandPts.length > 2) { g.fillStyle(SAND, 1); g.fillPoints(sandPts, true); }
  g.fillStyle(SAND_DARK, 0.6); g.fillEllipse(x, lvl + 2, R * 0.9, 6 * s);
  g.lineStyle(1.5, GLASS_EDGE, 0.8); g.strokePoints(pts, true);
  g.lineStyle(2, GLASS_LIT, 0.5); g.lineBetween(x - R * 0.5, neckY - gh * 0.86, x - R * 0.26, neckY - gh * 0.2);
  // The well's lip in front, and the brass frame.
  g.fillStyle(STONE, 1); g.beginPath(); g.arc(x, y - 10, R * 1.15, 0, Math.PI, false); g.closePath(); g.fillPath();
  g.fillStyle(STONE_LIT, 1); g.fillEllipse(x, y - 10, R * 2.3, 6);
  for (const k of [-1, 1]) {
    g.fillStyle(BRASS_DARK, 1); g.fillRect(x + k * R * 0.95 - 3, neckY - gh - 6, 6, gh + 4);
    g.fillStyle(BRASS, 1); g.fillRect(x + k * R * 0.95 - 2, neckY - gh - 6, 3, gh + 4);
  }
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - R - 6, neckY - gh - 12, R * 2 + 12, 9);
  g.fillStyle(GILT, 1); g.fillRect(x - R - 6, neckY - gh - 13, R * 2 + 12, 3);
  // The winch.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x + R * 1.1, y - 40, 6, 32);
  gear(g, x + R * 1.1 + 3, y - 44, 10, 9, 0.3, BRASS, 1, 3);
}

/** The hourglass well's falling thread, glinting into the dark. Animated. */
export function wellSand(g: G, x: number, y: number, s: number, t: number): void {
  const neckY = y - 18;
  g.lineStyle(2 * s, SAND, 0.95); g.lineBetween(x, neckY - 4, x, y - 12);
  for (let i = 0; i < 5; i++) {
    const ph = (t * 1.6 + i / 5) % 1;
    g.fillStyle(SAND_LIT, 1 - ph * 0.5); g.fillCircle(x + Math.sin(i * 3 + t) * 1.5, neckY - 4 + ph * 14, 1.2);
  }
  g.fillStyle(SAND_LIT, 0.25 + Math.sin(t * 3) * 0.1); g.fillEllipse(x, y - 13, 10 * s, 3);
}

/**
 * A cuckoo house: a carved timber chalet on a stone sill, deep eaves, window boxes, and on its
 * gable a cuckoo clock as big as a door. The family is fined hours if it ever runs slow.
 */
export function cuckooHouse(g: G, x: number, y: number, w: number, h: number, paint: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 4, w * 1.15, 22);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 4, y - 22, w + 8, 22);
  g.fillStyle(STONE, 1); g.fillRect(x0 - 2, y - 24, w + 4, 6);
  // Walls: planked timber in the house's paint.
  g.fillStyle(dim(paint, 0.3), 1); g.fillRect(x0, top, w, h - 22);
  g.fillStyle(paint, 1); g.fillRect(x0 + 3, top + 2, w - 6, h - 26);
  for (let xx = x0 + 10; xx < x0 + w - 4; xx += 10) { g.lineStyle(1, dim(paint, 0.25), 0.5); g.lineBetween(xx, top + 2, xx, y - 24); }
  // Windows with shutters and boxes of red geraniums.
  for (const k of [-1, 1]) {
    const wx = x + k * w * 0.28, wy = top + h * 0.48;
    g.fillStyle(CUCKOO_CREAM, 1); g.fillRect(wx - 13, wy - 15, 26, 28);
    g.fillStyle(0x2a2418, 1); g.fillRect(wx - 10, wy - 12, 20, 22);
    glow(g, wx, wy, 12, LAMP_GLOW, 0.04, 2);
    g.lineStyle(1.5, CUCKOO_CREAM, 1); g.lineBetween(wx, wy - 12, wx, wy + 10); g.lineBetween(wx - 10, wy - 1, wx + 10, wy - 1);
    for (const s of [-1, 1]) {
      g.fillStyle(LEAF_CARVE, 1); g.fillRect(wx + s * 19 - 5, wy - 15, 10, 28);
      g.fillStyle(dim(LEAF_CARVE, 0.3), 1); for (let i = 0; i < 4; i++) g.fillRect(wx + s * 19 - 4, wy - 12 + i * 7, 8, 1.5);
    }
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(wx - 15, wy + 13, 30, 7);
    for (let i = 0; i < 5; i++) { g.fillStyle(CUCKOO_RED, 1); g.fillCircle(wx - 12 + i * 6, wy + 12 - rng() * 2, 2.6); }
  }
  // Door.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 12, y - 58, 24, 36);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 9, y - 55, 18, 33);
  g.fillStyle(BRASS, 1); g.fillCircle(x + 5, y - 38, 1.6);
  // Deep-eaved gable with carved bargeboards.
  g.fillStyle(TIMBER_DARK, 1); g.fillTriangle(x0 - 22, top + 8, x0 + w + 22, top + 8, x, top - h * 0.62);
  g.fillStyle(TIMBER, 1); g.fillTriangle(x0 - 10, top + 4, x0 + w + 10, top + 4, x, top - h * 0.54);
  g.lineStyle(3, CUCKOO_CREAM, 1); g.lineBetween(x0 - 22, top + 8, x, top - h * 0.62); g.lineBetween(x0 + w + 22, top + 8, x, top - h * 0.62);
  for (let i = 1; i < 6; i++) {
    const k = i / 6;
    for (const s of [-1, 1]) {
      const bx = x + s * (w / 2 + 22) * (1 - k), by = top + 8 - (h * 0.62 + 8) * k;
      g.fillStyle(CUCKOO_CREAM, 1); g.fillTriangle(bx, by, bx - s * 6, by + 4, bx - s * 1, by + 9);
    }
  }
  // The gable clock (static part — its door and bird come out in `animateOver`).
  cuckooClock(g, x, top - h * 0.06, w / 150, 2.2, 0.0, 0, false);
}

/** Where a cuckoo house's gable-clock door sits (and the clock's scale), so `animateOver` can open it. */
export const cuckooHouseDoor = (x: number, y: number, w: number, h: number): { x: number; y: number; s: number } => {
  const s = w / 150;
  return { x, y: y - h - h * 0.06 - 64 * s + 6.4 * s, s };
};

/** A waystone for the works: a stone pillar with a little brass dial set into it, ticking. */
export function clockWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 40, 12);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 15, y - 12, 30, 12);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 11, y - 66, 22, 56);
  g.fillStyle(STONE, 1); g.fillRect(x - 9, y - 66, 18, 56);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x - 9, y - 66, 4, 56);
  g.fillStyle(STONE, 1); g.fillTriangle(x - 13, y - 66, x + 13, y - 66, x, y - 82);
  dial(g, x, y - 46, 8, 1, 4);
  g.fillStyle(GILT, 0.9); g.fillRect(x - 6, y - 26, 12, 3);
}

/** A bench of slatted brass-bound oak, for those queueing their hours. */
export function bench(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 64, 10);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 28, y - 14, 4, 14); g.fillRect(x + 24, y - 14, 4, 14);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 30, y - 16, 60, 5);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 30, y - 28, 60, 4); g.fillRect(x - 30, y - 22, 60, 3);
  g.fillStyle(BRASS, 1); g.fillCircle(x - 26, y - 26, 1.4); g.fillCircle(x + 26, y - 26, 1.4);
}

/** A sump pump-house: a squat brick shed with a walking-beam engine nodding on its roof. */
export function pumpHouse(g: G, x: number, y: number): void {
  const w = 120, h = 80, x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 4, w * 1.2, 20);
  g.fillStyle(dim(COPPER_DARK, 0.2), 1); g.fillRect(x0, top, w, h);
  for (let yy = top + 6; yy < y; yy += 8) for (let xx = x0 + ((yy / 8) % 2 ? 0 : 8); xx < x0 + w; xx += 16) { g.fillStyle(COPPER_DARK, 1); g.fillRect(xx, yy, 14, 6); }
  g.fillStyle(0x1a1410, 1); g.fillRect(x - 16, y - 46, 32, 46);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x0 - 6, top - 8, w + 12, 10);
  // Chimney with a brass band.
  g.fillStyle(COPPER_DARK, 1); g.fillRect(x0 + 12, top - 60, 16, 52);
  g.fillStyle(BRASS, 1); g.fillRect(x0 + 10, top - 62, 20, 5);
  // The A-frame for the beam.
  g.lineStyle(5, IRON_DARK, 1); g.lineBetween(x + 10, top - 8, x + 30, top - 56); g.lineBetween(x + 50, top - 8, x + 30, top - 56);
}

/** The pump-house's nodding beam and its smoke. Animated (animateOver). */
export function pumpBeam(g: G, x: number, y: number, t: number): void {
  const top = y - 80;
  const a = Math.sin(t * 1.6) * 0.22;
  const px = x + 30, py = top - 56;
  const ex = Math.cos(a) * 52, ey = Math.sin(a) * 52;
  g.lineStyle(6, IRON, 1); g.lineBetween(px - ex, py - ey, px + ex, py + ey);
  g.lineStyle(2, IRON_LIT, 0.7); g.lineBetween(px - ex, py - ey - 2, px + ex, py + ey - 2);
  g.lineStyle(2, IRON_DARK, 1); g.lineBetween(px + ex, py + ey, px + ex, top - 4);
  g.fillStyle(BRASS, 1); g.fillCircle(px, py, 4);
  for (let i = 0; i < 4; i++) {
    const ph = (t * 0.35 + i / 4) % 1;
    g.fillStyle(0x8a8478, 0.32 * (1 - ph)); g.fillCircle(x - 40 + Math.sin(t + i) * 6 + ph * 20, top - 64 - ph * 60, 6 + ph * 12);
  }
}

/** A tall stack of crated clock-parts outside a workshop. */
export function partsCrates(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 70, 14);
  for (let i = 0; i < 3; i++) {
    const cx = x - 20 + i * 20 + (rng() - 0.5) * 4, cy = y - 18 - (i === 1 ? 26 : 0);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(cx - 14, cy - 14, 28, 28);
    g.fillStyle(TIMBER, 1); g.fillRect(cx - 12, cy - 12, 24, 24);
    g.lineStyle(1.5, TIMBER_DARK, 1); g.lineBetween(cx - 12, cy - 12, cx + 12, cy + 12);
    gear(g, cx + 4, cy - 2, 6, 8, rng() * 3, BRASS, 1, 3);
  }
}

/** A cart of paid hours: little stoppered vials of grey sand on a brass-railed barrow. */
export function hourCart(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 90, 14);
  for (const k of [-1, 1]) {
    g.fillStyle(IRON_DARK, 1); g.fillCircle(x + k * 30, y - 10, 11);
    g.fillStyle(IRON, 1); g.fillCircle(x + k * 30, y - 10, 8);
    g.fillStyle(BRASS, 1); g.fillCircle(x + k * 30, y - 10, 2.5);
  }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 44, y - 34, 88, 18);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 42, y - 32, 84, 14);
  for (let i = 0; i < 10; i++) {
    const vx = x - 36 + i * 8, vy = y - 40;
    g.fillStyle(GLASS, 0.5); g.fillRect(vx - 2.5, vy - 10, 5, 12);
    g.fillStyle(0xa8a8a0, 1); g.fillRect(vx - 2, vy - 4, 4, 6);
    g.fillStyle(COPPER_DARK, 1); g.fillRect(vx - 2.5, vy - 12, 5, 3);
  }
  g.lineStyle(1.5, BRASS, 1); g.lineBetween(x - 44, y - 48, x + 44, y - 48);
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x + 44, y - 26, x + 64, y - 40);
}

/** A row of grey-faced townsfolk on a wall mural, waiting — painted on the Hour Office's side. */
export function paidMural(g: G, x: number, y: number, w: number): void {
  g.fillStyle(STONE_LIT, 1); g.fillRect(x - w / 2, y - 60, w, 50);
  for (let i = 0; i < Math.floor(w / 22); i++) {
    const fx = x - w / 2 + 12 + i * 22;
    g.fillStyle(0xa8a8a0, 1); g.fillCircle(fx, y - 44, 5); g.fillRect(fx - 5, y - 39, 10, 22);
  }
  g.lineStyle(1, STONE_DARK, 1); g.strokeRect(x - w / 2, y - 60, w, 50);
}

/** A colour helper for hour-grey: something mixed toward the paid-hour tint. */
export const greyed = (c: number, k: number): number => mixC(c, 0xa8a8a0, k);
