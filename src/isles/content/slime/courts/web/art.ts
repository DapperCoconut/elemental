import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import {
  BARK, BARK_DARK, BARK_LIT, BONE, BRUISE, BRUISE_DARK, BRUISE_LIT, DEW, DROP, DROP_GLINT, DROP_WATER, GAS, GOLD_THREAD,
  HOURGLASS, LAMP, LAMP_HOT, LEAF, LEAF_DARK, LEAF_LIT, MOSS, PLANK, PLANK_DARK, PLANK_LIT, ROPE, ROPE_DARK, SILK,
  SILK_DARK, SILK_LIT, SILK_OLD, SILK_SHADE, SPIDER, SPIDER_GOLD, SPIDER_LIT, VENOM, VENOM_DARK, WEFT, WEFT_DARK,
  WEFT_LIT,
} from './palette';

/**
 * Web Court set pieces — the shapes only a town built in the canopy has. Nothing stands on the
 * ground here, because there is no ground: every house is slung on a trunk, every street is a
 * bridge, every floor is woven. Things are *hung* — sheets on racks, lanterns on lines, cocoons
 * of tithe-silk on hooks, spiders on their own threads — and everything has a strand running from
 * it to something else. Draw the strands; the town is the strands.
 */

// ── Strands and webs ────────────────────────────────────────────────

/** A slack strand between two points, sagging by `sag` px, with dew beads now and then. */
export function strand(g: G, a: Pt, b: Pt, sag: number, color: number, alpha = 0.7, w = 1, dew = 0): void {
  const n = 10;
  let px = a.x, py = a.y;
  g.lineStyle(w, color, alpha);
  g.beginPath(); g.moveTo(px, py);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * sag;
    g.lineTo(x, y);
    px = x; py = y;
  }
  g.strokePath();
  if (dew > 0) {
    for (let i = 1; i < dew + 1; i++) {
      const t = i / (dew + 1);
      const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * sag;
      g.fillStyle(DEW, alpha * 0.9); g.fillCircle(x, y + 1, 1.4);
    }
  }
  void px; void py;
}

/**
 * An orb web: spokes from a hub and a spiral of capture thread, squashed vertically by `sq` so it
 * can lie on the floor (sq < 1) or hang in a frame (sq = 1). `torn` (0–1) leaves gaps in the spiral.
 */
export function orbWeb(g: G, x: number, y: number, r: number, color: number, alpha = 0.6, spokes = 12, sq = 1, torn = 0, rot = 0): void {
  g.lineStyle(1, color, alpha);
  for (let i = 0; i < spokes; i++) {
    const a = rot + (i / spokes) * Math.PI * 2;
    g.lineBetween(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r * sq);
  }
  // The capture spiral: straight chords spoke to spoke, so it reads as hand-spun.
  const turns = Math.max(3, Math.round(r / 9));
  for (let k = 1; k <= turns; k++) {
    const rr = (k / turns) * r * 0.95;
    for (let i = 0; i < spokes; i++) {
      if (torn > 0 && ((i * 7 + k * 3) % 10) / 10 < torn) continue;
      const a0 = rot + (i / spokes) * Math.PI * 2, a1 = rot + ((i + 1) / spokes) * Math.PI * 2;
      const r0 = rr + (i / spokes) * (r / turns) * 0.9, r1 = rr + ((i + 1) / spokes) * (r / turns) * 0.9;
      g.lineBetween(x + Math.cos(a0) * r0, y + Math.sin(a0) * r0 * sq, x + Math.cos(a1) * r1, y + Math.sin(a1) * r1 * sq);
    }
  }
  g.fillStyle(lit(color, 0.3), alpha); g.fillCircle(x, y, 2);
}

// ── Ground ───────────────────────────────────────────────────────────

/**
 * The Sheet: woven silk the whole width of the town. Laid in panels the spiders spun at different
 * times — each panel its own shade and its own weave direction, seamed with a darker cord.
 */
export function sheet(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(SILK_SHADE, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const P = 200;
  for (let y = r.y; y < r.y + r.h; y += P) {
    for (let x = r.x; x < r.x + r.w; x += P) {
      const shade = rng();
      const c = shade < 0.25 ? SILK_OLD : shade < 0.7 ? SILK : mixC(SILK, SILK_LIT, 0.4);
      const w = Math.min(P, r.x + r.w - x), h = Math.min(P, r.y + r.h - y);
      g.fillStyle(c, 0.92); g.fillRect(x + 2, y + 2, w - 4, h - 4);
      // The weave: a fine crosshatch, its angle set by the panel.
      const a = rng() < 0.5 ? 1 : -1;
      g.lineStyle(1, dim(c, 0.12), 0.35);
      for (let k = -h; k < w; k += 9) {
        const x0 = x + Math.max(0, k), y0 = y + Math.max(0, -k);
        const len = Math.min(w - Math.max(0, k), h - Math.max(0, -k));
        if (len <= 0) continue;
        if (a > 0) g.lineBetween(x0, y0, x0 + len, y0 + len);
        else g.lineBetween(x + w - (x0 - x), y0, x + w - (x0 - x) - len, y0 + len);
      }
      g.lineStyle(1, lit(c, 0.35), 0.25);
      for (let k = 4; k < h; k += 14) g.lineBetween(x + 3, y + k, x + w - 3, y + k + (rng() - 0.5) * 3);
      // Soft sag: a darker hollow somewhere in the panel.
      g.fillStyle(SILK_DARK, 0.07); g.fillEllipse(x + w * (0.3 + rng() * 0.4), y + h * (0.3 + rng() * 0.4), w * 0.7, h * 0.5);
      // Seams.
      g.lineStyle(2, SILK_DARK, 0.28); g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      for (let k = 0; k < 4; k++) { g.fillStyle(SILK_DARK, 0.35); g.fillCircle(x + 1 + (w * k) / 4, y + 1, 1.6); }
    }
  }
  // Moulted husks and dropped threads lying on it.
  for (let i = 0; i < (r.w * r.h) / 9000; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    const k = rng();
    if (k < 0.4) { g.lineStyle(1, SILK_LIT, 0.5); g.lineBetween(x, y, x + (rng() - 0.5) * 40, y + (rng() - 0.5) * 20); }
    else if (k < 0.55) { g.fillStyle(BONE, 0.35); g.fillEllipse(x, y, 6, 4); g.lineStyle(1, BONE, 0.3); for (let l = 0; l < 4; l++) g.lineBetween(x, y, x + (l - 1.5) * 4, y + 5); }
    else { g.fillStyle(DEW, 0.4); g.fillCircle(x, y, 1); }
  }
}

/**
 * A tear in the Sheet: torn silk curling back from a hole, and through it the long drop to black
 * water, faint and far below, with gas pale on it. Draw at ground level; make it solid.
 */
export function tear(g: G, x: number, y: number, r: number, rng: () => number): void {
  // The hole and what is under it.
  g.fillStyle(SILK_DARK, 0.6); g.fillEllipse(x, y + 3, r * 2.25, r * 1.6);
  g.fillStyle(DROP, 1); g.fillEllipse(x, y, r * 2, r * 1.4);
  // Far below: a lighter circle of water, offset (we look down at an angle), a glint and gas.
  g.fillStyle(DROP_WATER, 1); g.fillEllipse(x + r * 0.12, y + r * 0.18, r * 1.1, r * 0.66);
  g.lineStyle(1, DROP_GLINT, 0.5); g.strokeEllipse(x + r * 0.12, y + r * 0.18, r * 0.8, r * 0.44);
  g.fillStyle(DROP_GLINT, 0.6); g.fillEllipse(x + r * 0.3, y + r * 0.1, r * 0.2, r * 0.05);
  // A mangrove root far down, and the drop's rim of hanging silk.
  g.lineStyle(3, dim(BARK, 0.5), 0.8); g.lineBetween(x - r * 0.7, y - r * 0.2, x - r * 0.1, y + r * 0.35);
  g.fillStyle(GAS, 0.08); g.fillEllipse(x, y + r * 0.15, r * 1.3, r * 0.6);
  // Torn edge: flaps of silk curling over the lip, threads hanging into the hole.
  const n = Math.max(10, Math.round(r / 4));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.2;
    const ex = x + Math.cos(a) * r, ey = y + Math.sin(a) * r * 0.7;
    const len = 6 + rng() * 10;
    g.fillStyle(i % 3 ? SILK : SILK_LIT, 0.95);
    g.fillTriangle(ex + Math.cos(a + 1.6) * 6, ey + Math.sin(a + 1.6) * 4, ex + Math.cos(a - 1.6) * 6, ey + Math.sin(a - 1.6) * 4, ex - Math.cos(a) * len, ey - Math.sin(a) * len * 0.7);
    if (rng() < 0.45) { g.lineStyle(1, SILK_LIT, 0.55); g.lineBetween(ex - Math.cos(a) * len, ey - Math.sin(a) * len * 0.7, ex - Math.cos(a) * (len + 14), ey - Math.sin(a) * len * 0.7 + 12); }
  }
  // Threads still spanning the hole: the Sheet's last hold on itself.
  for (let i = 0; i < 3; i++) {
    const a = rng() * Math.PI;
    strand(g, { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.7 }, { x: x - Math.cos(a) * r, y: y - Math.sin(a) * r * 0.7 }, 8, SILK_LIT, 0.45, 1, 2);
  }
}

/**
 * A plank bridge laid along the Sheet: rope-lashed planks crossways, a rope rail each side on
 * little posts. The town's streets.
 */
export function plankWalk(g: G, pts: Pt[], w: number, rng: () => number): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    const nx = -uy, ny = ux;
    // A shadow on the silk under the bridge.
    g.lineStyle(w + 10, SILK_DARK, 0.25); g.lineBetween(a.x, a.y + 4, b.x, b.y + 4);
    // Planks.
    for (let d = 0; d < len; d += 13) {
      const cx = a.x + ux * d, cy = a.y + uy * d;
      const jag = (rng() - 0.5) * 6;
      const c = rng() < 0.2 ? PLANK_DARK : rng() < 0.5 ? PLANK : PLANK_LIT;
      g.lineStyle(11, dim(c, 0.25), 1);
      g.lineBetween(cx + nx * (w / 2 + jag), cy + ny * (w / 2 + jag) + 1, cx - nx * (w / 2 - jag), cy - ny * (w / 2 - jag) + 1);
      g.lineStyle(10, c, 1);
      g.lineBetween(cx + nx * (w / 2 + jag), cy + ny * (w / 2 + jag), cx - nx * (w / 2 - jag), cy - ny * (w / 2 - jag));
      if (rng() < 0.3) { g.fillStyle(PLANK_DARK, 0.8); g.fillCircle(cx + nx * (w / 2 - 5), cy + ny * (w / 2 - 5), 1.2); }
    }
    // Rope rails and their posts.
    for (const s of [-1, 1]) {
      const ox = nx * s * (w / 2 + 3), oy = ny * s * (w / 2 + 3);
      g.lineStyle(2, ROPE_DARK, 0.9); g.lineBetween(a.x + ox, a.y + oy + 1, b.x + ox, b.y + oy + 1);
      g.lineStyle(1.4, ROPE, 1); g.lineBetween(a.x + ox, a.y + oy, b.x + ox, b.y + oy);
      for (let d = 30; d < len; d += 90) {
        const px = a.x + ux * d + ox, py = a.y + uy * d + oy;
        g.fillStyle(PLANK_DARK, 1); g.fillCircle(px, py, 3);
        g.fillStyle(PLANK_LIT, 1); g.fillCircle(px - 0.6, py - 0.6, 1.6);
      }
    }
  }
}

/** A round deck of planks built about a trunk's foot (drawn on the ground; the trunk is a piece). */
export function deck(g: G, x: number, y: number, r: number, rng: () => number): void {
  g.fillStyle(SILK_DARK, 0.3); g.fillEllipse(x, y + 6, r * 2.1, r * 1.35);
  g.fillStyle(PLANK_DARK, 1); g.fillEllipse(x, y, r * 2, r * 1.3);
  // Planks laid radially, like a cartwheel.
  const n = Math.round(r / 5);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const c = rng() < 0.3 ? PLANK_LIT : PLANK;
    g.fillStyle(c, 1);
    const a1 = a + (Math.PI * 2) / n - 0.03;
    g.fillTriangle(x, y, x + Math.cos(a) * r * 0.98, y + Math.sin(a) * r * 0.64, x + Math.cos(a1) * r * 0.98, y + Math.sin(a1) * r * 0.64);
  }
  g.lineStyle(3, ROPE_DARK, 1); g.strokeEllipse(x, y, r * 2, r * 1.3);
  g.lineStyle(1.5, ROPE, 1); g.strokeEllipse(x, y - 1, r * 2 - 2, r * 1.3 - 2);
  g.lineStyle(1, PLANK_DARK, 0.6); g.strokeEllipse(x, y, r * 1.2, r * 0.78);
}

// ── Trunks and houses ────────────────────────────────────────────────

/**
 * A mangrove trunk as wide as a house, rising out of the Sheet past the top of the view: grey bark
 * in long ridges, moss in the cracks, stilt-roots arching out at its foot and plunging through the
 * silk, sheets of old web stretched between the roots, and a rope ladder hanging down its face.
 */
export function trunk(g: G, x: number, y: number, r: number, h: number, rng: () => number, ladder = true): void {
  shadow(g, x, y + 4, r * 3.2, r * 0.9, 0.3);
  // Stilt-roots: arches from the bole down through the Sheet.
  const roots = 5;
  for (let i = 0; i < roots; i++) {
    const side = i % 2 ? 1 : -1;
    const k = (i + 1) / (roots + 1);
    const sx = x + side * r * (0.4 + k * 0.4), sy = y - r * (0.6 + k * 0.8);
    const ex = x + side * r * (1.1 + k * 1.1), ey = y + 4 - k * 6;
    const mx = x + side * r * (1.2 + k * 0.9), my = sy - 6;
    for (const [c, w, o] of [[BARK_DARK, 8, 1], [BARK, 6, 0]] as [number, number, number][]) {
      g.lineStyle(w, c, 1); g.beginPath(); g.moveTo(sx, sy + o);
      for (let t = 0.1; t <= 1.001; t += 0.1) {
        const qx = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * ex;
        const qy = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * my + t * t * ey;
        g.lineTo(qx, qy + o);
      }
      g.strokePath();
    }
    // Where a root goes through the Sheet: a pucker of silk.
    g.fillStyle(SILK_DARK, 0.5); g.fillEllipse(ex, ey + 2, 14, 5);
    g.lineStyle(1, SILK_LIT, 0.6); g.strokeEllipse(ex, ey + 1, 18, 6);
  }
  // Web hung between the roots.
  strand(g, { x: x - r * 1.6, y: y - 2 }, { x: x - r * 0.5, y: y - r * 1.2 }, 6, SILK_LIT, 0.35, 1, 2);
  strand(g, { x: x + r * 1.7, y: y - 2 }, { x: x + r * 0.5, y: y - r * 1.1 }, 6, SILK_LIT, 0.35, 1, 2);
  // The bole.
  const top = y - h;
  g.fillStyle(BARK_DARK, 1); g.fillRect(x - r - 2, top, r * 2 + 4, h - r * 0.3);
  g.fillStyle(BARK, 1); g.fillRect(x - r, top, r * 2, h - r * 0.3);
  g.fillStyle(BARK, 1); g.fillEllipse(x, y - r * 0.3, r * 2.3, r * 0.9);
  // Ridges of bark, light on the left face.
  for (let i = 0; i < r / 5; i++) {
    const bx = x - r + 3 + rng() * (r * 2 - 6);
    const len = h * (0.3 + rng() * 0.6);
    const by = top + rng() * (h - len);
    g.lineStyle(2, rng() < 0.5 ? BARK_DARK : BARK_LIT, 0.8);
    g.lineBetween(bx, by, bx + (rng() - 0.5) * 6, by + len);
  }
  g.fillStyle(BARK_LIT, 0.4); g.fillRect(x - r, top, r * 0.35, h - r * 0.3);
  g.fillStyle(BARK_DARK, 0.4); g.fillRect(x + r * 0.6, top, r * 0.4, h - r * 0.3);
  // Moss and lichen in the cracks.
  for (let i = 0; i < r / 3; i++) {
    g.fillStyle(rng() < 0.6 ? MOSS : lit(MOSS, 0.2), 0.8);
    g.fillEllipse(x - r + rng() * r * 2, top + rng() * h * 0.9, 4 + rng() * 6, 2 + rng() * 3);
  }
  // The trunk goes up into dark: fade the top.
  for (let k = 0; k < 6; k++) { g.fillStyle(LEAF_DARK, 0.18); g.fillRect(x - r - 2, top, r * 2 + 4, 10 + k * 8); }
  // A collar of old web round the bole, and a rope ladder.
  g.lineStyle(1, SILK_LIT, 0.4);
  for (let k = 0; k < 5; k++) { const yy = top + h * 0.3 + k * 6; g.lineBetween(x - r, yy, x + r, yy + 4); }
  if (ladder) ropeLadder(g, x + r * 0.25, top + h * 0.15, y - r * 0.5);
}

/** A rope ladder hanging straight, rungs of split cane. */
export function ropeLadder(g: G, x: number, y0: number, y1: number): void {
  g.lineStyle(1.6, ROPE_DARK, 1); g.lineBetween(x - 6, y0, x - 6, y1); g.lineBetween(x + 6, y0, x + 6, y1);
  for (let y = y0 + 6; y < y1; y += 10) { g.lineStyle(2, ROPE, 1); g.lineBetween(x - 7, y, x + 7, y + 1); }
}

export interface PodOpts {
  /** Wall weave colour. */
  wall?: number;
  /** Lamplight in the windows (0 = dark — a passed-over house). */
  glow?: number;
  /** A dyed silk sheet over the roof. */
  roof?: number;
  /** Draw the bridge hanging off its side, cut (the household cut off). */
  cut?: boolean;
}

/**
 * A pod-house: a round wicker house slung under a branch like a cocoon, its roof of silk sheets
 * lapped like scales, round lamplit windows, a rope bridge to its door and the branch it hangs from
 * running off into the canopy. The x,y point is the base of the deck it sits on.
 */
export function podHouse(g: G, x: number, y: number, w: number, h: number, o: PodOpts, rng: () => number): Pt {
  const wall = o.wall ?? 0x8a7656;
  const roof = o.roof ?? SILK;
  shadow(g, x, y + 4, w * 1.1, 18, 0.3);
  // The deck: planks on two stilt-roots.
  for (const k of [-0.35, 0.35]) {
    g.lineStyle(6, BARK_DARK, 1); g.lineBetween(x + k * w, y - 14, x + k * w * 1.3, y + 2);
    g.lineStyle(4, BARK, 1); g.lineBetween(x + k * w, y - 14, x + k * w * 1.3, y + 1);
  }
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - w * 0.6, y - 18, w * 1.2, 8);
  g.fillStyle(PLANK, 1); g.fillRect(x - w * 0.6, y - 20, w * 1.2, 6);
  for (let px = x - w * 0.6; px < x + w * 0.6; px += 9) { g.lineStyle(1, PLANK_DARK, 0.6); g.lineBetween(px, y - 20, px, y - 14); }
  // The hanging branch above, and the three cables down to the roof.
  const top = y - 20 - h;
  g.lineStyle(9, BARK_DARK, 1); g.lineBetween(x - w * 0.9, top - 34, x + w * 0.9, top - 24);
  g.lineStyle(6, BARK, 1); g.lineBetween(x - w * 0.9, top - 35, x + w * 0.9, top - 25);
  for (let i = 0; i < 3; i++) { g.fillStyle(LEAF, 0.9); g.fillEllipse(x - w * 0.8 + i * w * 0.8, top - 38, 26, 10); }
  for (const k of [-0.3, 0, 0.3]) { g.lineStyle(1.5, ROPE_DARK, 1); g.lineBetween(x + k * w, top - 29 + k * 6, x + k * w * 0.4, top + 4); }
  // The pod: a wicker barrel, bulged.
  g.fillStyle(dim(wall, 0.35), 1); g.fillEllipse(x, y - 20 - h * 0.45, w + 4, h * 1.02);
  g.fillStyle(wall, 1); g.fillEllipse(x - 1, y - 21 - h * 0.45, w, h * 0.98);
  // Wicker: curving bands.
  for (let k = 1; k < 7; k++) {
    const yy = y - 20 - h * 0.92 + (k / 7) * h * 0.92;
    const half = Math.sqrt(Math.max(0, 1 - Math.pow((yy - (y - 20 - h * 0.45)) / (h * 0.49), 2))) * w * 0.5;
    g.lineStyle(1.5, dim(wall, 0.3), 0.8); g.lineBetween(x - half, yy, x + half, yy + 1);
  }
  for (let k = -3; k <= 3; k++) {
    g.lineStyle(1, lit(wall, 0.2), 0.5);
    g.beginPath(); g.arc(x + k * w * 0.06, y - 20 - h * 0.45, h * 0.46, -Math.PI / 2 - 0.9 + k * 0.05, Math.PI / 2 + 0.9, false); g.strokePath();
  }
  // Roof of lapped silk: scales of sheet from the crown down.
  for (let row = 0; row < 3; row++) {
    const ry = top + 4 + row * 9;
    const rw = w * (0.35 + row * 0.25);
    for (let i = 0; i < 4 + row * 2; i++) {
      const sx = x - rw / 2 + (i + 0.5) * (rw / (4 + row * 2));
      g.fillStyle(dim(roof, 0.25), 1); g.fillEllipse(sx, ry + 5, rw / (3 + row * 2), 12);
      g.fillStyle(row % 2 ? roof : lit(roof, 0.15), 1); g.fillEllipse(sx, ry + 4, rw / (3.4 + row * 2), 10);
    }
  }
  // Round windows, lit or dark.
  const lights = o.glow ?? LAMP;
  for (const [dx, dy] of [[-0.24, 0.42], [0.24, 0.42]] as [number, number][]) {
    const wx = x + dx * w, wy = y - 20 - h * dy;
    g.fillStyle(PLANK_DARK, 1); g.fillCircle(wx, wy, 8);
    g.fillStyle(lights ? lights : 0x141814, 1); g.fillCircle(wx, wy, 6);
    if (lights) { glow(g, wx, wy, 14, lights, 0.06, 3); g.lineStyle(1, PLANK_DARK, 1); g.lineBetween(wx - 6, wy, wx + 6, wy); g.lineBetween(wx, wy - 6, wx, wy + 6); }
  }
  // The door: an oval hatch in the weave, a silk curtain across it.
  g.fillStyle(PLANK_DARK, 1); g.fillEllipse(x, y - 34, 24, 30);
  g.fillStyle(lights ? mixC(BRUISE, lights, 0.15) : dim(BRUISE, 0.4), 1); g.fillEllipse(x, y - 33, 19, 25);
  g.lineStyle(1, lit(BRUISE, 0.3), 0.6); for (let k = -6; k <= 6; k += 3) g.lineBetween(x + k, y - 44, x + k * 0.8, y - 22);
  // Cocooned tithe bundles hung by the door.
  for (const s of [-1, 1]) {
    const bx = x + s * w * 0.48, by = y - 20 - h * 0.62;
    g.lineStyle(1, SILK_LIT, 0.8); g.lineBetween(bx, by - 14, bx, by - 6);
    g.fillStyle(SILK, 1); g.fillEllipse(bx, by, 9, 14);
    g.lineStyle(1, SILK_SHADE, 0.8); for (let k = -4; k <= 4; k += 3) g.lineBetween(bx - 4, by + k, bx + 4, by + k + 2);
  }
  // A cut bridge: the end of a plank bridge hanging straight down from the deck, frayed.
  if (o.cut) {
    const bx = x + w * 0.62;
    g.lineStyle(1.5, ROPE_DARK, 1); g.lineBetween(bx, y - 18, bx + 6, y + 30); g.lineBetween(bx + 10, y - 18, bx + 16, y + 30);
    for (let k = 0; k < 4; k++) { g.fillStyle(PLANK, 1); g.fillRect(bx + 1 + k * 1.5, y - 12 + k * 11, 12, 5); }
    g.lineStyle(1, ROPE, 0.8); g.lineBetween(bx + 6, y + 30, bx + 2, y + 38); g.lineBetween(bx + 16, y + 30, bx + 20, y + 37);
  }
  void rng;
  return { x, y: y + 14 };
}

/** A hanging lantern: a silk cocoon lit from inside, on a cord from somewhere above. */
export function lantern(g: G, x: number, y: number, s: number, on: boolean, cord = 30): void {
  g.lineStyle(1, ROPE_DARK, 1); g.lineBetween(x, y - 9 * s - cord, x, y - 9 * s);
  if (on) glow(g, x, y, 20 * s, LAMP, 0.07, 4);
  g.fillStyle(on ? LAMP : SILK_SHADE, 1); g.fillEllipse(x, y, 10 * s, 16 * s);
  g.fillStyle(on ? LAMP_HOT : SILK, 1); g.fillEllipse(x - 1.5 * s, y - 1, 5 * s, 10 * s);
  g.lineStyle(1, on ? dim(LAMP, 0.35) : SILK_DARK, 0.8);
  for (let k = -1; k <= 1; k++) g.lineBetween(x - 5 * s, y + k * 4 * s, x + 5 * s, y + k * 4 * s + 1);
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - 2 * s, y - 9 * s, 4 * s, 2 * s); g.fillRect(x - 2 * s, y + 7 * s, 4 * s, 2 * s);
}

// ── Silk-working ─────────────────────────────────────────────────────

/** A spool of silk on its spindle, side on. */
export function spool(g: G, x: number, y: number, s: number, color: number): void {
  g.fillStyle(PLANK_DARK, 1); g.fillEllipse(x, y, 16 * s, 6 * s); g.fillEllipse(x, y - 18 * s, 16 * s, 6 * s);
  g.fillStyle(dim(color, 0.2), 1); g.fillRect(x - 6 * s, y - 17 * s, 12 * s, 16 * s);
  g.fillStyle(color, 1); g.fillRect(x - 6 * s, y - 17 * s, 8 * s, 16 * s);
  g.lineStyle(1, lit(color, 0.35), 0.8); for (let k = 0; k < 5; k++) g.lineBetween(x - 6 * s, y - 15 * s + k * 3 * s, x + 6 * s, y - 14 * s + k * 3 * s);
  g.fillStyle(PLANK, 1); g.fillEllipse(x, y - 18 * s, 14 * s, 4.5 * s);
  g.fillStyle(PLANK_DARK, 1); g.fillCircle(x, y - 18 * s, 1.5 * s);
}

/**
 * A spinning mill: an open-sided shed of poles under a silk-sheet roof; a great treadwheel at one
 * end (a farmed spider walks it, fixed by a leash), a row of spinning frames with their bobbins
 * full, and a skein-winder. The wheel's spokes and the spider are animated separately.
 */
export function mill(g: G, x: number, y: number, w: number, rng: () => number): void {
  const x0 = x - w / 2;
  shadow(g, x, y + 4, w * 1.05, 26, 0.3);
  // Plank floor.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x0, y - 16, w, 18);
  g.fillStyle(PLANK, 1); g.fillRect(x0, y - 18, w, 14);
  for (let px = x0; px < x0 + w; px += 11) { g.lineStyle(1, PLANK_DARK, 0.5); g.lineBetween(px, y - 18, px + 2, y - 4); }
  // Poles.
  const H = 120;
  for (let px = x0 + 6; px <= x0 + w - 6; px += w / 5) {
    g.fillStyle(BARK_DARK, 1); g.fillRect(px - 4, y - 18 - H, 8, H);
    g.fillStyle(BARK_LIT, 0.5); g.fillRect(px - 4, y - 18 - H, 2, H);
    g.lineStyle(2, ROPE, 1); g.lineBetween(px - 5, y - 18 - H + 10, px + 5, y - 18 - H + 14); g.lineBetween(px - 5, y - 18 - H + 16, px + 5, y - 18 - H + 20);
  }
  // Spinning frames: a long rail with twelve bobbins, threads rising to a guide bar.
  for (let i = 0; i < 2; i++) {
    const fy = y - 30 - i * 30;
    const fx0 = x0 + 150 - i * 8, fx1 = x0 + w - 30 + i * 8;
    g.fillStyle(PLANK_DARK, 1); g.fillRect(fx0, fy, fx1 - fx0, 6);
    g.fillStyle(PLANK_LIT, 1); g.fillRect(fx0, fy, fx1 - fx0, 2);
    for (let bx = fx0 + 10; bx < fx1 - 6; bx += 18) {
      spool(g, bx, fy, 0.6, i ? SILK_LIT : mixC(SILK, BRUISE_LIT, 0.25));
      g.lineStyle(1, SILK_LIT, 0.7); g.lineBetween(bx, fy - 11, bx + 3, fy - 52 + i * 6);
    }
    g.fillStyle(BARK, 1); g.fillRect(fx0, fy - 54 + i * 6, fx1 - fx0, 3);
  }
  // The treadwheel (rim and hub; spokes turn in `animate`).
  const wx = x0 + 70, wy = y - 78;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(wx, y - 6, 120, 14);
  g.lineStyle(8, PLANK_DARK, 1); g.strokeCircle(wx, wy, 58);
  g.lineStyle(5, PLANK, 1); g.strokeCircle(wx, wy, 58);
  g.lineStyle(1.5, PLANK_LIT, 0.8); g.strokeCircle(wx, wy, 54);
  for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; g.fillStyle(PLANK_DARK, 1); g.fillCircle(wx + Math.cos(a) * 58, wy + Math.sin(a) * 58, 1.5); }
  g.fillStyle(BARK_DARK, 1); g.fillRect(wx - 4, wy, 8, y - 18 - wy);
  g.fillStyle(BARK, 1); g.fillCircle(wx, wy, 8);
  // The drive belt from the wheel to the frames.
  g.lineStyle(2, ROPE_DARK, 1); g.lineBetween(wx + 8, wy - 6, x0 + 150, y - 54); g.lineBetween(wx + 8, wy + 6, x0 + 150, y - 30);
  // Roof: two great silk sheets stretched over ridge poles, sagging, stained.
  const ry = y - 18 - H;
  g.fillStyle(SILK_DARK, 1);
  g.fillTriangle(x0 - 16, ry + 18, x0 + w + 16, ry + 18, x, ry - 40);
  g.fillStyle(SILK, 1); g.fillTriangle(x0 - 12, ry + 14, x + 2, ry - 38, x, ry + 14);
  g.fillStyle(SILK_SHADE, 1); g.fillTriangle(x, ry + 14, x + 2, ry - 38, x0 + w + 12, ry + 14);
  for (let k = 1; k < 8; k++) { g.lineStyle(1, SILK_DARK, 0.4); g.lineBetween(x0 - 12 + (k * w) / 8, ry + 14, x, ry - 38); }
  // Scalloped hem, stained venom-green where it drips.
  for (let px = x0 - 12; px < x0 + w + 12; px += 16) { g.fillStyle(SILK, 1); g.fillEllipse(px + 8, ry + 15, 16, 8); }
  for (let i = 0; i < 4; i++) { g.fillStyle(VENOM_DARK, 0.25); g.fillEllipse(x0 + rng() * w, ry + 8, 14, 18); }
  // Skeins hung to dry along the eave.
  for (let px = x0 + 20; px < x0 + w - 10; px += 34) {
    g.lineStyle(1, ROPE_DARK, 1); g.lineBetween(px, ry + 18, px, ry + 26);
    g.fillStyle(rng() < 0.3 ? BRUISE_LIT : SILK_LIT, 1); g.fillEllipse(px, ry + 36, 8, 22);
    g.lineStyle(1, SILK_SHADE, 0.7); g.lineBetween(px - 2, ry + 28, px - 2, ry + 46); g.lineBetween(px + 2, ry + 28, px + 2, ry + 46);
  }
}

/** The treadwheel's spokes and the spider walking inside it (animate). */
export function millWheel(g: G, x: number, y: number, t: number): void {
  const wx = x, wy = y;
  for (let k = 0; k < 8; k++) {
    const a = t * 0.8 + (k / 8) * Math.PI * 2;
    g.lineStyle(3, PLANK, 1); g.lineBetween(wx, wy, wx + Math.cos(a) * 54, wy + Math.sin(a) * 54);
  }
  g.fillStyle(BARK, 1); g.fillCircle(wx, wy, 7);
  giantSpider(g, wx, wy + 44, 0.42, t * 6, -Math.PI / 2, false);
}

/**
 * A drying rack: two forked poles and a long beam, ropes strung between. The hanging sheets
 * themselves move, so `rackSheets` draws them in `animate`.
 */
export function dryingRack(g: G, x: number, y: number, w: number): void {
  shadow(g, x, y + 3, w * 1.05, 14, 0.25);
  for (const s of [-1, 1]) {
    const px = x + (s * w) / 2;
    g.fillStyle(BARK_DARK, 1); g.fillRect(px - 3, y - 96, 6, 96);
    g.lineStyle(3, BARK_DARK, 1); g.lineBetween(px, y - 92, px - 8, y - 104); g.lineBetween(px, y - 92, px + 8, y - 104);
    g.lineStyle(2, ROPE_DARK, 1); g.lineBetween(px, y - 30, px + s * 22, y);
  }
  g.fillStyle(BARK, 1); g.fillRect(x - w / 2 - 10, y - 100, w + 20, 5);
  g.fillStyle(BARK_LIT, 0.6); g.fillRect(x - w / 2 - 10, y - 100, w + 20, 1.5);
}

/** The sheets on a drying rack, swaying (animate). */
export function rackSheets(g: G, x: number, y: number, w: number, t: number, seed: number): void {
  const n = Math.max(2, Math.round(w / 34));
  for (let i = 0; i < n; i++) {
    const sx = x - w / 2 + 6 + (i * (w - 12)) / n;
    const sw = (w - 12) / n - 3;
    const sway = Math.sin(t * 1.3 + i * 0.9 + seed) * 5;
    const c = (i + Math.floor(seed)) % 4 === 1 ? mixC(SILK, BRUISE_LIT, 0.4) : (i + Math.floor(seed)) % 5 === 3 ? mixC(SILK, VENOM, 0.18) : SILK_LIT;
    const top = y - 96, bot = y - 30 + Math.sin(i + seed) * 4;
    g.fillStyle(dim(c, 0.2), 0.85);
    g.fillTriangle(sx, top, sx + sw, top, sx + sw + sway, bot);
    g.fillTriangle(sx, top, sx + sw + sway, bot, sx + sway, bot);
    g.fillStyle(c, 0.9);
    g.fillTriangle(sx + 1, top, sx + sw - 1, top, sx + sw * 0.7 + sway, bot - 2);
    g.lineStyle(1, lit(c, 0.4), 0.6); g.lineBetween(sx + sw * 0.3, top + 4, sx + sw * 0.3 + sway * 0.8, bot - 3);
    // Pegs.
    g.fillStyle(PLANK_DARK, 1); g.fillRect(sx + 1, top - 3, 3, 5); g.fillRect(sx + sw - 4, top - 3, 3, 5);
  }
}

// ── Spiders ──────────────────────────────────────────────────────────

/**
 * One of the farmed silk spiders, seen from above at an angle: a fat banded abdomen with the red
 * hourglass, a smaller head with a cluster of eyes, eight jointed legs ringed in gold at the knee.
 * `step` animates the legs (a walking gait), `a` is the heading. `silk` trails a thread behind.
 */
export function giantSpider(g: G, x: number, y: number, s: number, step: number, a: number, silk = true): void {
  const ca = Math.cos(a), sa = Math.sin(a);
  const R = (lx: number, ly: number): Pt => ({ x: x + lx * ca - ly * sa, y: y + (lx * sa + ly * ca) * 0.8 });
  shadow(g, x, y + 6 * s, 70 * s, 22 * s, 0.25);
  if (silk) { const tail = R(-60 * s, 0); g.lineStyle(1, SILK_LIT, 0.6); g.lineBetween(tail.x, tail.y, R(-110 * s, 6 * s).x, R(-110 * s, 6 * s).y); }
  // Legs: four a side, each hip → knee → foot, gait alternating.
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1]) {
      const ph = Math.sin(step + i * 1.4 + (side > 0 ? Math.PI : 0));
      const hip = R(10 * s - i * 7 * s, side * 8 * s);
      const reach = (34 + (i === 0 || i === 3 ? 8 : 0)) * s;
      const ang = (i - 1.5) * 0.42 + ph * 0.18;
      const knee = R(10 * s - i * 7 * s + Math.cos(ang) * reach * 0.55 * (i < 2 ? 1 : -0.4) + 6 * s, side * (reach * 0.7));
      const foot = R(10 * s - i * 9 * s + (i < 2 ? 26 : -26) * s + ph * 6 * s, side * (reach * 1.05));
      g.lineStyle(3.2 * s + 0.6, SPIDER, 1); g.lineBetween(hip.x, hip.y, knee.x, knee.y - 6 * s);
      g.lineStyle(2.4 * s + 0.5, SPIDER, 1); g.lineBetween(knee.x, knee.y - 6 * s, foot.x, foot.y);
      g.fillStyle(SPIDER_GOLD, 1); g.fillCircle(knee.x, knee.y - 6 * s, 2.2 * s + 0.4);
    }
  }
  // Abdomen: banded, glossy, the hourglass.
  const ab = R(-24 * s, 0);
  g.fillStyle(SPIDER, 1); g.fillEllipse(ab.x, ab.y, 46 * s, 36 * s);
  g.fillStyle(SPIDER_LIT, 1); g.fillEllipse(ab.x - 6 * s, ab.y - 6 * s, 20 * s, 12 * s);
  g.lineStyle(2 * s, SPIDER_GOLD, 0.55); g.strokeEllipse(ab.x, ab.y, 30 * s, 24 * s);
  g.fillStyle(HOURGLASS, 1);
  g.fillTriangle(ab.x - 5 * s, ab.y - 6 * s, ab.x + 5 * s, ab.y - 6 * s, ab.x, ab.y);
  g.fillTriangle(ab.x - 5 * s, ab.y + 6 * s, ab.x + 5 * s, ab.y + 6 * s, ab.x, ab.y);
  // Head and eyes.
  const hd = R(8 * s, 0);
  g.fillStyle(SPIDER, 1); g.fillEllipse(hd.x, hd.y, 24 * s, 20 * s);
  const ey = R(16 * s, 0);
  for (let k = 0; k < 4; k++) { g.fillStyle(k < 2 ? HOURGLASS : 0xf0e0c0, 1); g.fillCircle(ey.x + (k % 2 ? 3 : -3) * s, ey.y - (k < 2 ? 2 : -2) * s, (k < 2 ? 2.4 : 1.4) * s + 0.3); }
  // Fangs.
  const f1 = R(20 * s, -3 * s), f2 = R(20 * s, 3 * s);
  g.fillStyle(BONE, 1); g.fillCircle(f1.x, f1.y, 1.6 * s + 0.4); g.fillCircle(f2.x, f2.y, 1.6 * s + 0.4);
}

/** A spiderling: the size of a hand, all legs, scuttling (gimmicks, charms). */
export function spiderling(g: G, x: number, y: number, a: number, t: number, tint = SPIDER): void {
  const ca = Math.cos(a), sa = Math.sin(a);
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1]) {
      const ph = Math.sin(t * 22 + i * 1.7 + (side > 0 ? 3 : 0)) * 0.35;
      const la = a + side * (0.7 + i * 0.45) + ph;
      const kx = x + Math.cos(la) * 6, ky = y + Math.sin(la) * 6;
      const fx = x + Math.cos(la + side * 0.4) * 11, fy = y + Math.sin(la + side * 0.4) * 11;
      g.lineStyle(1.5, tint, 1); g.lineBetween(x, y, kx, ky - 2); g.lineBetween(kx, ky - 2, fx, fy);
    }
  }
  g.fillStyle(tint, 1); g.fillEllipse(x - ca * 3, y - sa * 3, 9, 8);
  g.fillStyle(lit(tint, 0.25), 1); g.fillCircle(x + ca * 3, y + sa * 3, 3);
  g.fillStyle(HOURGLASS, 1); g.fillCircle(x - ca * 3, y - sa * 3, 1.5);
}

/**
 * An egg sac: a teardrop of dense white silk hung on a strand, veined, with shadows of the young
 * moving inside it. `swell` (0–1) is how near it is to hatching: it grows, yellows, and twitches.
 */
export function eggSac(g: G, x: number, y: number, r: number, swell: number, t: number, cord = 26): void {
  const tw = swell > 0.7 ? Math.sin(t * (10 + swell * 20)) * (swell - 0.7) * 6 : 0;
  const rr = r * (0.8 + swell * 0.35);
  g.lineStyle(1, SILK_LIT, 0.8); g.lineBetween(x, y - rr - cord, x + tw * 0.3, y - rr + 2);
  g.fillStyle(0x000000, 0.18); g.fillEllipse(x, y + rr + 10, rr * 1.6, rr * 0.45);
  const base = mixC(BONE, 0xe8d890, swell * 0.6);
  g.fillStyle(dim(base, 0.25), 1); g.fillEllipse(x + tw, y + 1, rr * 2, rr * 2.3);
  g.fillStyle(base, 1); g.fillEllipse(x + tw - 1, y, rr * 1.9, rr * 2.2);
  g.fillStyle(lit(base, 0.4), 0.8); g.fillEllipse(x + tw - rr * 0.35, y - rr * 0.4, rr * 0.6, rr * 0.9);
  // Veins of silk.
  g.lineStyle(1, dim(base, 0.18), 0.7);
  for (let k = -2; k <= 2; k++) {
    g.beginPath(); g.arc(x + tw + k * rr * 0.25, y, rr * 1.05, -Math.PI / 2 - 0.6, Math.PI / 2 + 0.6, k < 0); g.strokePath();
  }
  // The brood moving inside, darker as they grow.
  for (let i = 0; i < 4; i++) {
    const a = t * (0.8 + i * 0.3) + i * 1.7;
    g.fillStyle(SPIDER, 0.12 + swell * 0.3);
    g.fillCircle(x + tw + Math.cos(a) * rr * 0.4, y + Math.sin(a) * rr * 0.55, rr * 0.22);
  }
  g.fillStyle(SILK_LIT, 1); g.fillCircle(x + tw, y - rr * 1.05, 2.4);
}

// ── Landmarks ────────────────────────────────────────────────────────

/**
 * The Spymaster's Web: a frame of two carved posts and a lintel, and strung inside it a great web
 * that is a map of the isle — Stilthaven's harbour as a fan of strands at the bottom, the six courts
 * as knots, the Slough a dark coil in the middle — with a tag of paper knotted on a strand for
 * every spy, each tag written with a name. Dew-beads tremble on it (`webMapPulse`).
 */
export function webMap(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 4, w * 1.1, 20, 0.35);
  const x0 = x - w / 2, x1 = x + w / 2, top = y - h;
  // Posts: carved with coiled serpents, capped with spider finials.
  for (const px of [x0, x1]) {
    g.fillStyle(BARK_DARK, 1); g.fillRect(px - 10, top - 10, 20, h + 10);
    g.fillStyle(BARK, 1); g.fillRect(px - 8, top - 10, 15, h + 10);
    for (let yy = top; yy < y - 10; yy += 18) {
      g.lineStyle(3, VENOM_DARK, 0.9);
      g.beginPath(); g.arc(px, yy + 9, 8, -Math.PI * 0.8, Math.PI * 0.2, false); g.strokePath();
    }
    giantSpider(g, px, top - 18, 0.28, 0, -Math.PI / 2, false);
  }
  // Lintel with the Matriarch's twin-fang mark.
  g.fillStyle(BARK_DARK, 1); g.fillRect(x0 - 18, top - 16, w + 36, 16);
  g.fillStyle(BARK_LIT, 1); g.fillRect(x0 - 18, top - 16, w + 36, 3);
  fangMark(g, x, top - 8, 6, VENOM);
  // The web: guy-lines to the frame, a hub off-centre where the Slough is.
  const hub: Pt = { x: x + w * 0.05, y: top + h * 0.45 };
  g.fillStyle(DROP, 0.55); g.fillRect(x0 + 8, top, w - 16, h - 8);
  const anchors: Pt[] = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    let ax = hub.x + Math.cos(a) * w, ay = hub.y + Math.sin(a) * h;
    ax = Math.max(x0 + 10, Math.min(x1 - 10, ax)); ay = Math.max(top + 2, Math.min(y - 10, ay));
    anchors.push({ x: ax, y: ay });
    g.lineStyle(1, SILK_LIT, 0.75); g.lineBetween(hub.x, hub.y, ax, ay);
  }
  for (let k = 1; k < 9; k++) {
    g.lineStyle(1, SILK, 0.55);
    g.beginPath();
    for (let i = 0; i <= 18; i++) {
      const p = anchors[i % 18];
      const f = k / 9;
      const px = hub.x + (p.x - hub.x) * f, py = hub.y + (p.y - hub.y) * f;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }
  // The isle knotted in: courts as gold knots, their roads as gold thread, the Slough a dark coil.
  const courts: Pt[] = [
    { x: hub.x, y: hub.y - h * 0.32 }, { x: hub.x - w * 0.28, y: hub.y - h * 0.08 }, { x: hub.x + w * 0.28, y: hub.y - h * 0.08 },
    { x: hub.x - w * 0.26, y: hub.y + h * 0.2 }, { x: hub.x + w * 0.27, y: hub.y + h * 0.2 }, { x: hub.x, y: hub.y + h * 0.3 },
  ];
  g.lineStyle(1.5, GOLD_THREAD, 0.85);
  g.lineBetween(courts[0].x, courts[0].y, hub.x, hub.y);
  g.lineBetween(courts[1].x, courts[1].y, courts[2].x, courts[2].y);
  g.lineBetween(courts[1].x, courts[1].y, courts[3].x, courts[3].y);
  g.lineBetween(courts[2].x, courts[2].y, courts[4].x, courts[4].y);
  g.lineBetween(courts[3].x, courts[3].y, courts[5].x, courts[5].y); g.lineBetween(courts[4].x, courts[4].y, courts[5].x, courts[5].y);
  for (const c of courts) { g.fillStyle(GOLD_THREAD, 1); g.fillCircle(c.x, c.y, 4); g.fillStyle(lit(GOLD_THREAD, 0.4), 1); g.fillCircle(c.x - 1, c.y - 1, 1.6); }
  g.lineStyle(3, BRUISE_DARK, 1);
  g.beginPath(); for (let i = 0; i < 30; i++) { const a = i * 0.45, r = 3 + i * 0.5; const px = hub.x + Math.cos(a) * r, py = hub.y + Math.sin(a) * r * 0.8; if (i === 0) g.moveTo(px, py); else g.lineTo(px, py); } g.strokePath();
  // The harbour fan at the bottom.
  for (let i = 0; i < 7; i++) { g.lineStyle(1, GOLD_THREAD, 0.5); g.lineBetween(courts[5].x, courts[5].y, courts[5].x - 50 + i * 16, y - 12); }
  // Spy tags: little paper slips on strands, each with a scribble of name.
  for (let i = 0; i < 26; i++) {
    const p = anchors[Math.floor(rng() * 18)];
    const f = 0.25 + rng() * 0.65;
    const tx = hub.x + (p.x - hub.x) * f, ty = hub.y + (p.y - hub.y) * f;
    g.lineStyle(1, SILK_LIT, 0.8); g.lineBetween(tx, ty, tx + 1, ty + 5);
    g.fillStyle(0xe8dcbc, 1); g.fillRect(tx - 3, ty + 5, 7, 9);
    g.lineStyle(1, BRUISE_DARK, 0.7); g.lineBetween(tx - 2, ty + 8, tx + 3, ty + 8); g.lineBetween(tx - 2, ty + 11, tx + 2, ty + 11);
    if (rng() < 0.15) { g.fillStyle(HOURGLASS, 0.9); g.fillCircle(tx + 3, ty + 6, 1.4); }
  }
  // Rail in front so nobody touches it.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x0 - 20, y - 22, w + 40, 5);
  for (let px = x0 - 16; px <= x1 + 16; px += 30) { g.fillStyle(PLANK, 1); g.fillRect(px - 2, y - 22, 4, 22); }
}

/** Dew trembling down the Spymaster's Web: a bead of light runs out along a random strand (animate). */
export function webMapPulse(g: G, x: number, y: number, w: number, h: number, t: number): void {
  const top = y - h;
  const hub = { x: x + w * 0.05, y: top + h * 0.45 };
  for (let i = 0; i < 3; i++) {
    const k = Math.floor(t * 0.7 + i * 0.37);
    const ph = (t * 0.7 + i * 0.37) % 1;
    const a = ((k * 7 + i * 5) % 18) / 18 * Math.PI * 2;
    let ax = hub.x + Math.cos(a) * w, ay = hub.y + Math.sin(a) * h;
    ax = Math.max(x - w / 2 + 10, Math.min(x + w / 2 - 10, ax)); ay = Math.max(top + 2, Math.min(y - 10, ay));
    const px = hub.x + (ax - hub.x) * ph, py = hub.y + (ay - hub.y) * ph;
    glow(g, px, py, 8, DEW, 0.12 * Math.sin(ph * Math.PI), 2);
    g.fillStyle(DEW, 0.9 * Math.sin(ph * Math.PI)); g.fillCircle(px, py, 1.8);
  }
}

/** The Matriarch's mark: two fang-punctures over a coil. Painted on every notice. */
export function fangMark(g: G, x: number, y: number, r: number, color: number): void {
  g.lineStyle(Math.max(1, r * 0.3), color, 0.9);
  g.beginPath(); g.arc(x, y + r * 0.2, r, Math.PI * 0.15, Math.PI * 1.85, false); g.strokePath();
  g.fillStyle(color, 1); g.fillCircle(x - r * 0.35, y - r * 0.1, r * 0.22); g.fillCircle(x + r * 0.35, y - r * 0.1, r * 0.22);
}

/**
 * Prince Weft's Loft: the hall at the heart of the court, built in the crown of the greatest trunk.
 * A funnel web the size of a church: a sweeping silk mouth narrowing to a dark tunnel door, its
 * walls layered sheet on sheet, held open by guy-lines to the trunks either side; bruise-purple
 * hangings, lantern lines along the guys, and above it all the roofed gallery where the Spymaster
 * sits listening to his threads.
 */
export function loft(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 8, w * 1.05, 40, 0.4);
  const x0 = x - w / 2, x1 = x + w / 2;
  // The great trunk behind, going up and out of sight.
  g.fillStyle(BARK_DARK, 1); g.fillRect(x - 70, y - h - 140, 140, h + 120);
  g.fillStyle(BARK, 1); g.fillRect(x - 66, y - h - 140, 128, h + 120);
  for (let i = 0; i < 18; i++) { g.lineStyle(2, rng() < 0.5 ? BARK_DARK : BARK_LIT, 0.7); const bx = x - 60 + rng() * 120; g.lineBetween(bx, y - h - 140, bx + (rng() - 0.5) * 8, y - h - 20); }
  for (let k = 0; k < 6; k++) { g.fillStyle(LEAF_DARK, 0.2); g.fillRect(x - 70, y - h - 140, 140, 12 + k * 10); }
  // The gallery up in the crown: a long room of wicker with a row of lit slits.
  const gy = y - h - 40;
  g.fillStyle(dim(0x8a7656, 0.35), 1); g.fillRoundedRect(x - 150, gy - 46, 300, 52, 20);
  g.fillStyle(0x8a7656, 1); g.fillRoundedRect(x - 146, gy - 48, 292, 48, 18);
  for (let k = -5; k <= 5; k++) { g.fillStyle(LAMP, 0.9); g.fillRect(x + k * 24 - 2, gy - 34, 4, 14); }
  g.fillStyle(SILK, 1); g.fillEllipse(x, gy - 50, 320, 26);
  g.fillStyle(SILK_LIT, 1); g.fillEllipse(x - 20, gy - 54, 220, 12);
  // Ear-threads from the gallery out to the canopy: the Spymaster listens along them.
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    strand(g, { x: x + Math.cos(a) * 140, y: gy - 40 }, { x: x + Math.cos(a) * (w * 0.9), y: gy - 40 + Math.sin(a) * 120 }, 10, GOLD_THREAD, 0.4, 1);
  }
  // The funnel: concentric sheets narrowing to the door.
  const fy = y - 20;
  for (let k = 0; k < 7; k++) {
    const f = k / 7;
    const ww = w * (1 - f * 0.78), hh = h * (1 - f * 0.55);
    const c = mixC(SILK_SHADE, DROP, f * 0.75);
    g.fillStyle(dim(c, 0.15), 1); g.fillEllipse(x, fy - hh * 0.45 + 3, ww, hh);
    g.fillStyle(c, 1); g.fillEllipse(x, fy - hh * 0.45, ww - 4, hh - 4);
    // Radial threads in each layer.
    g.lineStyle(1, lit(c, 0.25), 0.4);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      g.lineBetween(x + Math.cos(a) * ww * 0.3, fy - hh * 0.45 + Math.sin(a) * hh * 0.3, x + Math.cos(a) * ww * 0.48, fy - hh * 0.45 + Math.sin(a) * hh * 0.48);
    }
  }
  // The tunnel door: dark, two red eye-glints deep inside.
  g.fillStyle(0x07090a, 1); g.fillEllipse(x, fy - h * 0.2, w * 0.16, h * 0.34);
  g.fillStyle(HOURGLASS, 0.85); g.fillCircle(x - 5, fy - h * 0.24, 1.8); g.fillCircle(x + 5, fy - h * 0.24, 1.8);
  // The lower lip of the funnel lies over the deck: flaps of silk.
  for (let i = 0; i < 16; i++) {
    const px = x0 + 20 + (i / 15) * (w - 40);
    g.fillStyle(i % 2 ? SILK : SILK_LIT, 1); g.fillEllipse(px, fy + 6 - Math.sin((i / 15) * Math.PI) * 10, 40, 14);
  }
  // Guy-lines to the trunks, strung with lanterns.
  for (const s of [-1, 1]) {
    const gx = s < 0 ? x0 - 40 : x1 + 40;
    strand(g, { x: x + s * w * 0.32, y: fy - h * 0.8 }, { x: gx, y: fy - h * 1.1 }, 18, SILK_LIT, 0.8, 1.5);
    strand(g, { x: x + s * w * 0.46, y: fy - h * 0.4 }, { x: gx, y: fy - 20 }, 12, SILK_LIT, 0.8, 1.5);
    for (let k = 1; k < 4; k++) lantern(g, x + s * (w * 0.32 + (k / 4) * (Math.abs(gx - x) - w * 0.32)), fy - h * 0.8 - (k / 4) * h * 0.3 + Math.sin((k / 4) * Math.PI) * 18 + 14, 0.7, true, 6);
  }
  // Livery hangings: bruise-purple banners with the gold spider.
  for (const s of [-1, 1]) {
    const bx = x + s * w * 0.3, by = fy - h * 0.62;
    g.fillStyle(BARK_DARK, 1); g.fillRect(bx - 16, by - 4, 32, 4);
    g.fillStyle(BRUISE, 1); g.fillRect(bx - 13, by, 26, 60);
    g.fillTriangle(bx - 13, by + 60, bx + 13, by + 60, bx, by + 72);
    g.fillStyle(BRUISE_LIT, 0.6); g.fillRect(bx - 13, by, 4, 60);
    giantSpider(g, bx, by + 30, 0.22, 0, -Math.PI / 2, false);
    g.lineStyle(1.5, GOLD_THREAD, 0.9); g.strokeRect(bx - 11, by + 2, 22, 56);
  }
  // The deck before the door.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - 90, fy + 2, 180, 14);
  g.fillStyle(PLANK, 1); g.fillRect(x - 88, fy, 176, 10);
}

/**
 * The Tithe Reel: the court's Moult-Tithe beam. A great windlass reel on a frame, a steelyard arm
 * with a hook for each household's skein, a weight in the Matriarch's green, and the ration slate.
 */
export function titheReel(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 150, 24, 0.3);
  // Frame.
  for (const s of [-1, 1]) {
    g.lineStyle(7, BARK_DARK, 1); g.lineBetween(x + s * 50, y, x + s * 24, y - 110);
    g.lineStyle(5, BARK, 1); g.lineBetween(x + s * 50, y - 1, x + s * 24, y - 111);
  }
  g.fillStyle(BARK_DARK, 1); g.fillRect(x - 34, y - 118, 68, 10);
  // The reel, wound fat with silk.
  g.fillStyle(PLANK_DARK, 1); g.fillCircle(x - 36, y - 70, 16); g.fillCircle(x + 36, y - 70, 16);
  g.fillStyle(SILK, 1); g.fillRect(x - 34, y - 84, 68, 28);
  g.lineStyle(1, SILK_SHADE, 0.9); for (let k = 0; k < 9; k++) g.lineBetween(x - 34, y - 82 + k * 3, x + 34, y - 81 + k * 3);
  g.fillStyle(SILK_LIT, 0.8); g.fillRect(x - 34, y - 84, 68, 5);
  g.lineStyle(3, PLANK, 1); g.lineBetween(x + 36, y - 70, x + 52, y - 54); g.fillStyle(PLANK_LIT, 1); g.fillCircle(x + 52, y - 54, 4);
  // The steelyard arm hanging from the frame.
  g.lineStyle(3, 0x4a4a42, 1); g.lineBetween(x - 70, y - 104, x + 60, y - 112);
  g.lineStyle(1.5, ROPE_DARK, 1); g.lineBetween(x - 66, y - 104, x - 66, y - 60); g.lineBetween(x + 54, y - 111, x + 54, y - 94);
  g.fillStyle(SILK_LIT, 1); g.fillEllipse(x - 66, y - 48, 16, 26);
  g.fillStyle(VENOM_DARK, 1); g.fillRect(x + 47, y - 94, 14, 16);
  fangMark(g, x + 54, y - 86, 4, VENOM);
  // The ration slate.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x + 54, y - 46, 50, 44);
  g.fillStyle(0x1f2622, 1); g.fillRect(x + 57, y - 43, 44, 36);
  for (let k = 0; k < 5; k++) { g.lineStyle(1, 0xd8dccc, 0.7); g.lineBetween(x + 60, y - 38 + k * 7, x + 60 + 10 + ((k * 17) % 26), y - 38 + k * 7); }
  g.lineStyle(1.5, HOURGLASS, 0.8); g.lineBetween(x + 60, y - 17, x + 96, y - 17);
}

/** The court waystone: a white fang of rock bound in silk, its rune glowing through the wrapping. */
export function webWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 3, 54, 14, 0.35);
  g.fillStyle(dim(BONE, 0.3), 1);
  g.fillTriangle(x - 18, y, x + 16, y, x + 2, y - 74);
  g.fillStyle(BONE, 1);
  g.fillTriangle(x - 15, y - 2, x + 10, y - 2, x + 1, y - 72);
  g.fillStyle(lit(BONE, 0.5), 0.7); g.fillTriangle(x - 13, y - 4, x - 6, y - 4, x, y - 64);
  // Silk binding, wound round and round.
  for (let k = 0; k < 7; k++) {
    const yy = y - 10 - k * 8;
    const half = 15 * (1 - (k * 8) / 74);
    g.lineStyle(2, k % 2 ? SILK_LIT : SILK_SHADE, 0.9); g.lineBetween(x - half - 1, yy + 2, x + half, yy - 2);
  }
  glow(g, x, y - 40, 22, WEFT_LIT, 0.08, 3);
  g.lineStyle(2, WEFT_LIT, 0.95); g.strokeCircle(x, y - 40, 6);
  g.lineBetween(x - 6, y - 40, x + 6, y - 40); g.lineBetween(x, y - 46, x, y - 34);
}

/** A notice board for the Draught: venom-green, the twin fangs, a column of names, some struck. */
export function noticeBoard(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 70, 12, 0.3);
  g.fillStyle(BARK_DARK, 1); g.fillRect(x - 30, y - 70, 4, 70); g.fillRect(x + 26, y - 70, 4, 70);
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - 34, y - 96, 68, 54);
  g.fillStyle(0xe2d8b4, 1); g.fillRect(x - 31, y - 93, 62, 48);
  g.fillStyle(VENOM_DARK, 1); g.fillRect(x - 31, y - 93, 62, 9);
  fangMark(g, x, y - 88, 3, VENOM);
  for (let k = 0; k < 6; k++) {
    g.lineStyle(1, 0x3a3428, 0.8); g.lineBetween(x - 26, y - 78 + k * 5, x - 26 + 18 + ((k * 13) % 30), y - 78 + k * 5);
    if (k === 2 || k === 4) { g.lineStyle(1.4, HOURGLASS, 0.9); g.lineBetween(x - 28, y - 78 + k * 5, x + 20, y - 78 + k * 5); }
  }
  g.fillStyle(0x6a5a3a, 1); g.fillTriangle(x - 38, y - 96, x + 38, y - 96, x, y - 108);
}

/**
 * Gepp's puppet theatre: a tall booth of painted boards, a striped silk awning, the proscenium with
 * a little drawn curtain, and above it the bridge where the puppeteer stands, his crossbars hanging
 * ready with their strings. The puppets on stage dance in `animate`.
 */
export function puppetBooth(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 140, 22, 0.32);
  g.fillStyle(dim(BRUISE, 0.3), 1); g.fillRect(x - 62, y - 140, 124, 140);
  g.fillStyle(BRUISE, 1); g.fillRect(x - 58, y - 138, 116, 136);
  // Painted stars and coils on the boards.
  for (let k = 0; k < 6; k++) { g.lineStyle(1.5, GOLD_THREAD, 0.6); g.beginPath(); g.arc(x - 40 + (k % 3) * 40, y - 30 - Math.floor(k / 3) * 22, 6, 0, Math.PI * 1.5, false); g.strokePath(); }
  // Proscenium.
  g.fillStyle(0x16100e, 1); g.fillRect(x - 44, y - 124, 88, 58);
  g.fillStyle(lit(LAMP, 0.1), 0.25); g.fillRect(x - 44, y - 124, 88, 58);
  g.lineStyle(4, GOLD_THREAD, 1); g.strokeRect(x - 46, y - 126, 92, 62);
  // Curtains.
  for (const s of [-1, 1]) {
    g.fillStyle(HOURGLASS, 1); g.fillTriangle(x + s * 44, y - 124, x + s * 22, y - 124, x + s * 44, y - 70);
    g.fillStyle(dim(HOURGLASS, 0.3), 1); g.fillTriangle(x + s * 44, y - 124, x + s * 36, y - 124, x + s * 44, y - 80);
  }
  // Awning in stripes.
  for (let k = 0; k < 9; k++) {
    g.fillStyle(k % 2 ? SILK_LIT : BRUISE_LIT, 1);
    g.fillTriangle(x - 72 + k * 16, y - 140, x - 56 + k * 16, y - 140, x - 64 + k * 16, y - 128);
  }
  g.fillStyle(SILK_LIT, 1); g.fillRect(x - 72, y - 150, 144, 10);
  // The bridge above and two crossbars hanging, strings down to nothing.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - 50, y - 178, 100, 6);
  for (const s of [-1, 1]) {
    const cx = x + s * 28;
    g.lineStyle(3, PLANK_LIT, 1); g.lineBetween(cx - 12, y - 166, cx + 12, y - 166); g.lineBetween(cx, y - 172, cx, y - 160);
    g.lineStyle(1, ROPE_DARK, 1); g.lineBetween(cx, y - 172, cx, y - 178);
    g.lineStyle(1, SILK_LIT, 0.7); g.lineBetween(cx - 12, y - 166, cx - 10, y - 152); g.lineBetween(cx + 12, y - 166, cx + 10, y - 152);
  }
  // A lamp at the foot.
  for (const s of [-1, 1]) { g.fillStyle(LAMP, 1); g.fillCircle(x + s * 54, y - 10, 4); glow(g, x + s * 54, y - 12, 18, LAMP, 0.06, 3); }
}

/** Two little puppets dancing on Gepp's stage, strings up into the dark (animate). */
export function puppetsDance(g: G, x: number, y: number, t: number): void {
  for (const s of [-1, 1]) {
    const px = x + s * 18 + Math.sin(t * 2 + s) * 8;
    const bob = Math.abs(Math.sin(t * 4 + s)) * 6;
    const py = y - 78 - bob;
    g.lineStyle(1, SILK_LIT, 0.6); g.lineBetween(px - 6, py - 14, px - 6, y - 124); g.lineBetween(px + 6, py - 14, px + 6, y - 124);
    g.fillStyle(s < 0 ? BONE : WEFT, 1); g.fillEllipse(px, py, 10, 14);
    g.fillStyle(0xf0d8b8, 1); g.fillCircle(px, py - 11, 4);
    g.lineStyle(1.5, s < 0 ? BONE : WEFT, 1);
    g.lineBetween(px - 4, py - 4, px - 9, py - 12 + Math.sin(t * 6) * 4); g.lineBetween(px + 4, py - 4, px + 9, py - 12 - Math.sin(t * 6) * 4);
    g.lineBetween(px - 2, py + 6, px - 4, py + 12 + bob * 0.3); g.lineBetween(px + 2, py + 6, px + 4, py + 12 - bob * 0.3);
  }
}

/**
 * A spider pen: a ring of lashed poles with a gate, an orb web strung inside between two posts and
 * the farm's spider sitting in it (the spider is drawn in `animate` so it can shift). A trough of
 * fish-heads at the gate, a milking-reel for the dragline.
 */
export function spiderPen(g: G, x: number, y: number, w: number, rng: () => number): void {
  shadow(g, x, y + 4, w * 1.05, 22, 0.3);
  // Back fence.
  for (let i = 0; i <= 8; i++) {
    const px = x - w / 2 + (i / 8) * w;
    const py = y - 34 - Math.sin((i / 8) * Math.PI) * 20;
    g.fillStyle(BARK_DARK, 1); g.fillRect(px - 2.5, py - 40, 5, 44);
    g.fillStyle(BARK_LIT, 0.4); g.fillRect(px - 2.5, py - 40, 1.5, 44);
  }
  g.lineStyle(2, ROPE, 1);
  for (let k = 0; k < 2; k++) {
    g.beginPath();
    for (let i = 0; i <= 8; i++) {
      const px = x - w / 2 + (i / 8) * w, py = y - 34 - Math.sin((i / 8) * Math.PI) * 20 - 30 + k * 18;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }
  // The pen's web between two tall posts.
  const wy = y - 80;
  for (const s of [-1, 1]) { g.fillStyle(BARK_DARK, 1); g.fillRect(x + s * w * 0.32 - 3, wy - 70, 6, 110); }
  orbWeb(g, x, wy - 10, Math.min(70, w * 0.3), SILK_LIT, 0.55, 14, 0.85, 0.08);
  for (const s of [-1, 1]) strand(g, { x: x + s * w * 0.32, y: wy - 64 }, { x: x + s * w * 0.18, y: wy - 40 }, 3, SILK_LIT, 0.6);
  // Front fence, low, so the spider shows.
  for (let i = 0; i <= 8; i++) {
    const px = x - w / 2 + (i / 8) * w;
    if (i === 4) continue;
    g.fillStyle(BARK_DARK, 1); g.fillRect(px - 2.5, y - 30, 5, 30);
  }
  g.lineStyle(2, ROPE_DARK, 1); g.lineBetween(x - w / 2, y - 22, x - 14, y - 22); g.lineBetween(x + 14, y - 22, x + w / 2, y - 22);
  // The gate: a wicker hurdle, tied shut.
  g.fillStyle(0x8a7656, 1); g.fillRect(x - 14, y - 28, 28, 26);
  g.lineStyle(1, dim(0x8a7656, 0.35), 1); for (let k = 0; k < 5; k++) g.lineBetween(x - 14, y - 24 + k * 5, x + 14, y - 24 + k * 5);
  g.lineStyle(2, ROPE, 1); g.lineBetween(x + 14, y - 18, x + 18, y - 14);
  // The trough and the milking reel.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - w / 2 + 6, y - 12, 40, 10);
  for (let k = 0; k < 4; k++) { g.fillStyle(0x9aa8a0, 1); g.fillEllipse(x - w / 2 + 14 + k * 9, y - 13, 7, 4); }
  spool(g, x + w / 2 - 22, y - 4, 0.9, SILK_LIT);
  g.lineStyle(1, SILK_LIT, 0.6); g.lineBetween(x + w / 2 - 22, y - 20, x, wy - 10);
  void rng;
}

/** Old cocoons of tithe-silk hanging in a cluster from a branch end (decor). */
export function cocoonCluster(g: G, x: number, y: number, n: number, rng: () => number): void {
  for (let i = 0; i < n; i++) {
    const cx = x + (i - (n - 1) / 2) * 14 + (rng() - 0.5) * 6;
    const len = 18 + rng() * 26;
    g.lineStyle(1, SILK_LIT, 0.7); g.lineBetween(cx, y, cx, y + len);
    g.fillStyle(SILK_SHADE, 1); g.fillEllipse(cx + 1, y + len + 11, 12, 22);
    g.fillStyle(rng() < 0.2 ? mixC(SILK, BRUISE_LIT, 0.3) : SILK, 1); g.fillEllipse(cx, y + len + 10, 11, 21);
    g.lineStyle(1, SILK_SHADE, 0.7); for (let k = -6; k <= 6; k += 4) g.lineBetween(cx - 5, y + len + 10 + k, cx + 5, y + len + 12 + k);
  }
}

/**
 * The canopy itself: a bank of leaves overhead, drawn in front of everything along the top of the
 * area, with lianas and old webs hanging out of it. `x0..x1` along the base line `y`.
 */
export function canopyBank(g: G, x0: number, x1: number, y: number, depth: number, rng: () => number): void {
  g.fillStyle(LEAF_DARK, 1); g.fillRect(x0, y - depth, x1 - x0, depth);
  for (let x = x0; x < x1; x += 22) {
    const r = 18 + rng() * 22;
    g.fillStyle(rng() < 0.5 ? LEAF : dim(LEAF, 0.2), 1); g.fillCircle(x + rng() * 10, y - 6 - rng() * 14, r);
    if (rng() < 0.4) { g.fillStyle(LEAF_LIT, 0.8); g.fillCircle(x + rng() * 10 - 4, y - 14 - rng() * 14, r * 0.45); }
  }
  // Lianas and hanging silk.
  for (let x = x0 + 30; x < x1; x += 60 + rng() * 60) {
    const len = 20 + rng() * 50;
    if (rng() < 0.5) { g.lineStyle(2, dim(MOSS, 0.2), 1); g.lineBetween(x, y - 4, x + (rng() - 0.5) * 10, y + len); g.fillStyle(LEAF_LIT, 1); g.fillEllipse(x, y + len, 6, 4); }
    else { g.lineStyle(1, SILK_LIT, 0.45); g.lineBetween(x, y - 4, x, y + len); g.lineBetween(x + 6, y - 4, x + 2, y + len * 0.8); }
  }
}

/** Weft's sigil, as on his livery: a gold spider in a ring of thread. */
export function weftSigil(g: G, x: number, y: number, r: number): void {
  g.lineStyle(1.5, GOLD_THREAD, 0.9); g.strokeCircle(x, y, r);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.lineBetween(x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4, x + Math.cos(a) * r, y + Math.sin(a) * r); }
  g.fillStyle(WEFT_DARK, 1); g.fillCircle(x, y, r * 0.38);
  g.fillStyle(GOLD_THREAD, 1); g.fillCircle(x, y - r * 0.12, r * 0.14);
  g.fillStyle(WEFT, 1); g.fillCircle(x, y + r * 0.12, r * 0.2);
  g.fillStyle(WEFT_LIT, 0.6); g.fillCircle(x - 1, y + r * 0.05, r * 0.08);
}


/**
 * A great floor loom, side on: two A-frames, the warp running from the back beam to the cloth
 * beam in a hundred pale threads, a half-woven panel of bruise-and-silver cloth, the heddles up,
 * the beater bar, and the shuttle resting in the shed.
 */
export function greatLoom(g: G, x: number, y: number, w: number): void {
  shadow(g, x, y + 4, w * 1.1, 22, 0.32);
  const x0 = x - w / 2, x1 = x + w / 2;
  for (const px of [x0, x1]) {
    g.lineStyle(7, BARK_DARK, 1); g.lineBetween(px - 14, y, px, y - 120); g.lineBetween(px + 14, y, px, y - 120);
    g.lineStyle(4, BARK, 1); g.lineBetween(px - 13, y - 1, px, y - 119); g.lineBetween(px + 13, y - 1, px, y - 119);
  }
  // Beams: the warp beam up top, the cloth beam low.
  g.fillStyle(BARK_DARK, 1); g.fillRect(x0 - 6, y - 124, w + 12, 10); g.fillRect(x0 - 6, y - 40, w + 12, 12);
  g.fillStyle(BARK_LIT, 0.6); g.fillRect(x0 - 6, y - 124, w + 12, 2);
  // Warp threads.
  for (let px = x0 + 8; px < x1 - 6; px += 4) { g.lineStyle(1, SILK_LIT, 0.55); g.lineBetween(px, y - 114, px, y - 40); }
  // The woven panel: bands of weft rising from the cloth beam.
  for (let k = 0; k < 9; k++) {
    const by = y - 42 - k * 5;
    g.fillStyle(k % 3 === 1 ? BRUISE : k % 3 === 2 ? SILK_SHADE : SILK, 0.95); g.fillRect(x0 + 8, by - 5, w - 16, 5);
    g.lineStyle(1, dim(BRUISE, 0.2), 0.4); for (let px = x0 + 10; px < x1 - 8; px += 8) g.lineBetween(px, by - 5, px + 4, by);
  }
  // The beater bar and the heddle frames.
  g.fillStyle(PLANK_LIT, 1); g.fillRect(x0 + 2, y - 90, w - 4, 5);
  g.lineStyle(2, PLANK_DARK, 1); g.strokeRect(x0 + 20, y - 112, w - 40, 14);
  // The shuttle in the shed: a boat of polished wood, a bobbin of silk in it.
  g.fillStyle(PLANK_DARK, 1); g.fillEllipse(x + 20, y - 92, 46, 10);
  g.fillStyle(PLANK_LIT, 1); g.fillEllipse(x + 19, y - 93, 40, 6);
  g.fillStyle(SILK_LIT, 1); g.fillRect(x + 12, y - 95, 14, 4);
  // A bench in front.
  g.fillStyle(PLANK, 1); g.fillRect(x - 40, y - 14, 80, 6);
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - 36, y - 8, 4, 8); g.fillRect(x + 32, y - 8, 4, 8);
}

/**
 * The silk pool: a bowl where the Sheet has sagged deep between three trunks and filled with rain
 * and seep — tea-brown water under a skin of floating web, ringed with sagging silk, a fishing jetty
 * of planks out over it. Static; ripples are drawn in `animate`.
 */
export function silkPool(g: G, r: Rect, rng: () => number): void {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  // The sag: rings of darkening silk round the bowl.
  for (let k = 4; k >= 1; k--) {
    g.fillStyle(mixC(SILK_SHADE, SILK_DARK, k / 5), 0.5);
    g.fillEllipse(cx, cy, r.w + k * 34, r.h + k * 22);
  }
  // Fold lines running down into it.
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    g.lineStyle(1, SILK_DARK, 0.5);
    g.lineBetween(cx + Math.cos(a) * (r.w / 2 + 64), cy + Math.sin(a) * (r.h / 2 + 42), cx + Math.cos(a) * (r.w / 2 + 4), cy + Math.sin(a) * (r.h / 2 + 2));
  }
  // The water.
  g.fillStyle(0x2a2a1a, 1); g.fillEllipse(cx, cy, r.w, r.h);
  g.fillStyle(0x3a3a24, 1); g.fillEllipse(cx - 10, cy - 6, r.w * 0.86, r.h * 0.78);
  g.fillStyle(0x4a4a2c, 0.6); g.fillEllipse(cx - 30, cy - 18, r.w * 0.5, r.h * 0.35);
  // The floating web-skin.
  orbWeb(g, cx + r.w * 0.18, cy + 6, r.h * 0.42, SILK_LIT, 0.25, 10, 0.55, 0.3, 0.3);
  orbWeb(g, cx - r.w * 0.25, cy - 4, r.h * 0.32, SILK_LIT, 0.2, 9, 0.55, 0.4, 1.1);
  for (let i = 0; i < 16; i++) { g.fillStyle(SILK_LIT, 0.25); g.fillEllipse(r.x + 20 + rng() * (r.w - 40), r.y + 20 + rng() * (r.h - 40), 10 + rng() * 14, 3); }
  // Lily-like moult husks floating.
  for (let i = 0; i < 5; i++) { g.fillStyle(BONE, 0.45); g.fillEllipse(r.x + 40 + rng() * (r.w - 80), r.y + 30 + rng() * (r.h - 60), 8, 4); }
  // The rim: the silk lip, beaded with dew.
  g.lineStyle(3, SILK_LIT, 0.8); g.strokeEllipse(cx, cy, r.w + 4, r.h + 4);
  for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2; g.fillStyle(DEW, 0.7); g.fillCircle(cx + Math.cos(a) * (r.w / 2 + 2), cy + Math.sin(a) * (r.h / 2 + 2), 1.2); }
}

/** A lamp-post for the bridges: a pole, a crook, and a silk lantern on it. */
export function lampPost(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 20, 6, 0.3);
  g.fillStyle(BARK_DARK, 1); g.fillRect(x - 2.5, y - 70, 5, 70);
  g.lineStyle(3, BARK_DARK, 1); g.beginPath(); g.arc(x + 9, y - 70, 9, Math.PI, Math.PI * 1.9, false); g.strokePath();
  lantern(g, x + 17, y - 54, 0.8, true, 4);
}
