import type { Pt, Rect } from '../../../../IslesTypes';
import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import {
  BONE, BONE_SHADE, BRASS, BRASS_DARK, BRASS_LIT, BRUISE, BRUISE_LIT, GAS, HOT, HOT_LIT, INK, INK_RED, IRON,
  IRON_DARK, IRON_LIT, LAMP, LEAF, LEAF_LIT, MIRE, MIRE_DEEP, MIRE_SCUM, MIRE_SHEEN, MUD, MUD_DARK, MUD_LIT, PAPER,
  PAPER_DARK, ROOT, RUST, RUST_DARK, RUST_LIT, SLIME, STONE, STONE_DARK, STONE_LIT, TAR, TIMBER, TIMBER_DARK,
  TIMBER_LIT, VENOM, WEB,
} from './palette';

/**
 * The Shackle Court's set pieces. Everything here is wet, tarred or rusting, and nearly all of
 * it is chained to something. Pieces take `x, y` = their base / feet point and draw upward.
 */

/** A filled polygon from plain points. */
export function poly(g: G, pts: Pt[], color: number, a = 1): void {
  g.fillStyle(color, a);
  g.fillPoints(pts, true, true);
}

// ── Chain and iron ───────────────────────────────────────────────────

/**
 * A chain along a polyline: links alternate flat (an open oval) and edge-on (a short bar), so it
 * reads as real interlocking iron at any scale. `link` is one link's length.
 */
export function chainLinks(g: G, pts: Pt[], link: number, color: number, w = 2, a = 1): void {
  let k = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1];
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    if (len < 0.01) continue;
    const ux = (q.x - p.x) / len, uy = (q.y - p.y) / len;
    const ang = Math.atan2(uy, ux);
    for (let d = 0; d < len; d += link * 0.78, k++) {
      const cx = p.x + ux * (d + link * 0.39), cy = p.y + uy * (d + link * 0.39);
      if (k % 2 === 0) {
        g.lineStyle(w + 1.2, dim(color, 0.55), a);
        strokeOval(g, cx, cy + 0.8, link * 0.5, link * 0.27, ang);
        g.lineStyle(w, color, a);
        strokeOval(g, cx, cy, link * 0.5, link * 0.27, ang);
      } else {
        g.lineStyle(w + 1.4, dim(color, 0.5), a);
        g.lineBetween(cx - ux * link * 0.45, cy - uy * link * 0.45 + 0.8, cx + ux * link * 0.45, cy + uy * link * 0.45 + 0.8);
        g.lineStyle(w + 0.4, lit(color, 0.18), a);
        g.lineBetween(cx - ux * link * 0.45, cy - uy * link * 0.45, cx + ux * link * 0.45, cy + uy * link * 0.45);
      }
    }
  }
}

/** A rotated oval outline (one chain link). */
function strokeOval(g: G, cx: number, cy: number, rx: number, ry: number, a: number): void {
  const c = Math.cos(a), s = Math.sin(a);
  g.beginPath();
  for (let i = 0; i <= 12; i++) {
    const t = (i / 12) * Math.PI * 2;
    const x = Math.cos(t) * rx, y = Math.sin(t) * ry;
    const px = cx + x * c - y * s, py = cy + x * s + y * c;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
}

/** Points along a hanging chain from a to b, sagging by `sag` px at the middle. */
export function sagPoints(ax: number, ay: number, bx: number, by: number, sag: number, n = 12): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t + Math.sin(t * Math.PI) * sag });
  }
  return pts;
}

/** A hanging chain between two points. */
export function sagChain(g: G, ax: number, ay: number, bx: number, by: number, sag: number, link: number, color: number, w = 2): void {
  chainLinks(g, sagPoints(ax, ay, bx, by, sag, Math.max(4, Math.round(Math.hypot(bx - ax, by - ay) / 30))), link, color, w);
}

/** An iron ball: a dark sphere with a riveted band, a rust bloom and a cold highlight. */
export function ironBall(g: G, x: number, y: number, r: number, rust = 0.3): void {
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x + r * 0.15, y + r * 0.85, r * 2, r * 0.6);
  g.fillStyle(IRON_DARK, 1); g.fillCircle(x, y, r);
  g.fillStyle(IRON, 1); g.fillCircle(x - r * 0.12, y - r * 0.12, r * 0.86);
  g.fillStyle(mixC(IRON, RUST, 0.7), rust); g.fillEllipse(x + r * 0.3, y + r * 0.35, r * 0.9, r * 0.6);
  // The casting seam with its rivets.
  g.lineStyle(Math.max(1, r * 0.12), IRON_DARK, 1);
  g.beginPath(); g.arc(x, y + r * 0.6, r * 1.15, Math.PI * 1.22, Math.PI * 1.78, false); g.strokePath();
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * 1.28 + i * 0.15;
    g.fillStyle(IRON_LIT, 0.9); g.fillCircle(x + Math.cos(a) * r * 1.15, y + r * 0.6 + Math.sin(a) * r * 1.15, Math.max(0.8, r * 0.08));
  }
  g.fillStyle(lit(IRON_LIT, 0.3), 0.85); g.fillEllipse(x - r * 0.38, y - r * 0.4, r * 0.5, r * 0.32);
  g.fillStyle(0xffffff, 0.6); g.fillCircle(x - r * 0.45, y - r * 0.45, Math.max(0.8, r * 0.1));
  // The ring the chain hangs from.
  g.lineStyle(Math.max(1.2, r * 0.14), IRON_LIT, 1); g.strokeCircle(x, y - r * 0.98, r * 0.24);
}

/**
 * A manacle: two iron half-rings on a hinge with a keyhole plate. `open` 0 (shut) … 1 (jaws
 * spread); `heat` 0 (cold iron) … 1 (white-hot off the forge); `a` turns the hinge.
 */
export function manacle(g: G, x: number, y: number, r: number, a: number, open: number, heat = 0): void {
  const base = heat > 0 ? mixC(IRON, HOT, Math.min(1, heat * 1.2)) : IRON;
  const edge = heat > 0.6 ? HOT_LIT : IRON_LIT;
  const hx = x + Math.cos(a) * r, hy = y + Math.sin(a) * r;
  const w = Math.max(1.4, r * 0.42);
  let plate: Pt = { x: x - Math.cos(a) * r, y: y - Math.sin(a) * r };
  for (const side of [1, -1]) {
    // Each half swings open about the hinge.
    const rot = side * open * 0.65;
    const c = Math.cos(rot), s = Math.sin(rot);
    const cx = hx + (x - hx) * c - (y - hy) * s, cy = hy + (x - hx) * s + (y - hy) * c;
    const a0 = (side > 0 ? a : a + Math.PI) + rot;
    g.lineStyle(w + 1.2, dim(base, 0.45), 1);
    g.beginPath(); g.arc(cx, cy + 1, r, a0, a0 + Math.PI, false); g.strokePath();
    g.lineStyle(w, base, 1);
    g.beginPath(); g.arc(cx, cy, r, a0, a0 + Math.PI, false); g.strokePath();
    g.lineStyle(1, edge, 0.7);
    g.beginPath(); g.arc(cx, cy, r + w * 0.4, a0 + 0.4, a0 + Math.PI - 0.4, false); g.strokePath();
    if (side > 0) plate = { x: cx - Math.cos(a + rot) * r, y: cy - Math.sin(a + rot) * r };
  }
  // The keyhole plate opposite the hinge.
  g.fillStyle(dim(base, 0.3), 1); g.fillRect(plate.x - r * 0.38, plate.y - r * 0.3, r * 0.76, r * 0.6);
  g.fillStyle(INK, 1); g.fillCircle(plate.x, plate.y - r * 0.06, r * 0.1); g.fillRect(plate.x - r * 0.04, plate.y, r * 0.08, r * 0.16);
  // The hinge pin.
  g.fillStyle(edge, 1); g.fillCircle(hx, hy, Math.max(1.2, r * 0.18));
  if (heat > 0.3) glow(g, x, y, r * 2.2, HOT, 0.05 * heat, 3);
}

/** A padlock: brass body, a shackle loop, a keyhole. */
export function padlock(g: G, x: number, y: number, s: number, body = BRASS, shut = true): void {
  g.lineStyle(2.4 * s, IRON_LIT, 1);
  g.beginPath(); g.arc(x, y - 5 * s - (shut ? 0 : 3 * s), 4.5 * s, Math.PI, 0, false); g.strokePath();
  g.fillStyle(dim(body, 0.35), 1); g.fillRoundedRect(x - 6.5 * s, y - 5 * s, 13 * s, 11 * s, 2 * s);
  g.fillStyle(body, 1); g.fillRoundedRect(x - 6 * s, y - 5.5 * s, 12 * s, 10 * s, 2 * s);
  g.fillStyle(lit(body, 0.35), 0.8); g.fillRect(x - 5 * s, y - 5 * s, 3 * s, 8 * s);
  g.fillStyle(INK, 1); g.fillCircle(x, y - 1.5 * s, 1.4 * s); g.fillRect(x - 0.6 * s, y - 1 * s, 1.2 * s, 3.2 * s);
}

/** A big old key, bow and bit, turned to angle `a`. */
export function key(g: G, x: number, y: number, s: number, a: number, color = BRASS): void {
  const c = Math.cos(a), sn = Math.sin(a);
  const at = (u: number, v: number): Pt => ({ x: x + u * c - v * sn, y: y + u * sn + v * c });
  const bow = at(-7 * s, 0), tip = at(8 * s, 0);
  g.lineStyle(2 * s, dim(color, 0.4), 1); g.lineBetween(bow.x, bow.y + 0.6, tip.x, tip.y + 0.6);
  g.lineStyle(1.6 * s, color, 1); g.lineBetween(bow.x, bow.y, tip.x, tip.y);
  g.lineStyle(1.6 * s, color, 1); g.strokeCircle(bow.x, bow.y, 3.2 * s);
  const b1 = at(5 * s, 0), b2 = at(5 * s, 3.4 * s), b3 = at(8 * s, 3.4 * s);
  g.lineStyle(1.6 * s, color, 1); g.lineBetween(b1.x, b1.y, b2.x, b2.y); g.lineBetween(b2.x, b2.y, b3.x, b3.y);
}

/** An iron mooring post with a ring through its head — debtors are chained to these all over the court. */
export function chainPost(g: G, x: number, y: number, s = 1): void {
  shadow(g, x, y + 1, 26 * s, 8 * s);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 7 * s, y - 30 * s, 14 * s, 30 * s);
  g.fillStyle(IRON, 1); g.fillRect(x - 6 * s, y - 30 * s, 9 * s, 30 * s);
  g.fillStyle(RUST, 0.6); g.fillRect(x - 6 * s, y - 10 * s, 12 * s, 10 * s);
  g.fillStyle(IRON_DARK, 1); g.fillEllipse(x, y - 30 * s, 16 * s, 7 * s);
  g.fillStyle(IRON_LIT, 1); g.fillEllipse(x - 1 * s, y - 31 * s, 12 * s, 4 * s);
  g.lineStyle(2.5 * s, IRON_LIT, 1); g.strokeCircle(x + 7 * s, y - 22 * s, 5 * s);
}

// ── The mire ─────────────────────────────────────────────────────────

/** Black mire water over a rect: deep centre, oily sheens, scum rafts and drowned sticks. */
export function mireFill(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(MIRE, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const n = (r.w * r.h) / 9000;
  for (let i = 0; i < n; i++) {
    g.fillStyle(MIRE_DEEP, 0.5); g.fillEllipse(r.x + rng() * r.w, r.y + rng() * r.h, 60 + rng() * 160, 20 + rng() * 50);
  }
  for (let i = 0; i < n * 0.8; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h, w = 30 + rng() * 90;
    g.fillStyle(MIRE_SHEEN, 0.18 + rng() * 0.12); g.fillEllipse(x, y, w, w * 0.18);
    g.fillStyle(BRUISE_LIT, 0.08); g.fillEllipse(x + w * 0.2, y + 2, w * 0.5, w * 0.08);
  }
  for (let i = 0; i < n * 0.5; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    g.fillStyle(MIRE_SCUM, 0.22); g.fillEllipse(x, y, 10 + rng() * 26, 4 + rng() * 6);
  }
  for (let i = 0; i < n * 0.25; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h, a = rng() * Math.PI;
    g.lineStyle(2, ROOT, 0.5); g.lineBetween(x, y, x + Math.cos(a) * 22, y + Math.sin(a) * 6);
  }
}

/** A mud bank along a mire edge: a ragged lip of mud with slime at the waterline. */
export function mireLip(g: G, x0: number, x1: number, y: number, dir: 1 | -1, rng: () => number): void {
  for (let x = x0; x < x1; x += 14) {
    const h = 8 + rng() * 10;
    g.fillStyle(MUD_DARK, 1); g.fillEllipse(x + 7, y + dir * h * 0.3, 22, h);
    g.fillStyle(SLIME, 0.55); g.fillEllipse(x + 7, y + dir * h * 0.6, 18, 4);
  }
}

/**
 * A white fang of rock standing out of the swamp — one of the old teeth. Curved, cracked, ringed
 * with slime at the waterline and strung with webs.
 */
export function fangRock(g: G, x: number, y: number, s: number, lean: number, rng: () => number): void {
  shadow(g, x + 6 * s, y + 2, 60 * s, 14 * s, 0.4);
  const h = 120 * s, w = 34 * s;
  const tipX = x + lean * 40 * s, tipY = y - h;
  const pts: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const bend = Math.sin(t * Math.PI * 0.5) * lean * 40 * s;
    pts.push({ x: x - w * (1 - t) ** 0.8 + bend, y: y - h * t });
  }
  for (let i = 10; i >= 0; i--) {
    const t = i / 10;
    const bend = Math.sin(t * Math.PI * 0.5) * lean * 40 * s;
    pts.push({ x: x + w * (1 - t) ** 0.8 + bend, y: y - h * t });
  }
  poly(g, pts, BONE_SHADE);
  // The lit face.
  poly(g, pts.slice(0, 11).concat(pts.slice(11).map((p, i) => ({ x: p.x - w * 0.55 * (1 - (10 - i) / 10) ** 0.8, y: p.y }))), BONE);
  // Enamel streaks and cracks.
  for (let i = 0; i < 4; i++) {
    const t0 = 0.15 + rng() * 0.5, sx = x - w * 0.4 + rng() * w * 0.8;
    g.lineStyle(1, BONE_SHADE, 0.8);
    g.lineBetween(sx + Math.sin(t0 * Math.PI * 0.5) * lean * 40 * s, y - h * t0, sx + lean * 10 * s + (rng() - 0.5) * 8, y - h * (t0 + 0.2));
  }
  g.fillStyle(0xffffff, 0.5); g.fillEllipse(tipX - 3 * s, tipY + 12 * s, 4 * s, 18 * s);
  // Slime ring at the waterline and a stain of venom running down.
  g.fillStyle(SLIME, 0.8); g.fillEllipse(x, y - 4, w * 2.2, 10 * s);
  g.fillStyle(VENOM, 0.25); g.fillRect(x + w * 0.2, y - h * 0.45, 3 * s, h * 0.42);
  // A web strung from the tusk to the water.
  const wx = x + w * 0.6 + lean * 20 * s, wy = y - h * 0.5;
  g.lineStyle(0.8, WEB, 0.45);
  for (let i = 0; i < 6; i++) g.lineBetween(wx, wy, wx + 14 * s + i * 6 * s, y - 2 - i * 3);
  for (let k = 1; k < 4; k++) {
    g.beginPath();
    for (let i = 0; i < 6; i++) { const px = wx + (14 * s + i * 6 * s) * (k / 4), py = wy + (y - 2 - i * 3 - wy) * (k / 4); if (i === 0) g.moveTo(px, py); else g.lineTo(px, py); }
    g.strokePath();
  }
}

/**
 * A mangrove: arched stilt-roots splaying into the water, a short twisted trunk, a dark canopy
 * with moss hanging out of it, and a web in the crotch.
 */
export function mangrove(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 4, 140 * s, 30 * s, 0.35);
  const ty = y - 40 * s;
  for (let i = 0; i < 9; i++) {
    const side = i % 2 ? 1 : -1;
    const reach = (30 + rng() * 40) * s * side;
    const fx = x + reach, fy = y + (rng() - 0.3) * 12 * s;
    const mx = x + reach * 0.45, my = ty - (8 + rng() * 14) * s;
    const pts: Pt[] = [];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      pts.push({ x: (1 - t) ** 2 * x + 2 * (1 - t) * t * mx + t * t * fx, y: (1 - t) ** 2 * ty + 2 * (1 - t) * t * my + t * t * fy });
    }
    g.lineStyle(5 * s, dim(ROOT, 0.35), 1);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y + 1); for (const p of pts) g.lineTo(p.x, p.y + 1); g.strokePath();
    g.lineStyle(3.5 * s, ROOT, 1);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
    g.fillStyle(SLIME, 0.7); g.fillEllipse(fx, fy, 8 * s, 3 * s);
  }
  // Trunk.
  g.fillStyle(dim(ROOT, 0.25), 1); g.fillRect(x - 8 * s, ty - 50 * s, 16 * s, 52 * s);
  g.fillStyle(ROOT, 1); g.fillRect(x - 7 * s, ty - 50 * s, 10 * s, 50 * s);
  g.lineStyle(1.2, dim(ROOT, 0.5), 1);
  for (let k = 0; k < 4; k++) g.lineBetween(x - 4 * s + k * 3 * s, ty - 48 * s, x - 5 * s + k * 3 * s, ty);
  // Canopy: layered dark lobes, lit on top.
  const cy = ty - 80 * s;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, d = 36 * s;
    g.fillStyle(dim(LEAF, 0.35), 1); g.fillCircle(x + Math.cos(a) * d, cy + Math.sin(a) * d * 0.55 + 6 * s, 26 * s);
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3, d = 30 * s;
    g.fillStyle(LEAF, 1); g.fillCircle(x + Math.cos(a) * d, cy + Math.sin(a) * d * 0.5, 22 * s);
  }
  for (let i = 0; i < 6; i++) {
    g.fillStyle(LEAF_LIT, 0.6); g.fillCircle(x - 20 * s + rng() * 40 * s, cy - 18 * s + rng() * 10 * s, 9 * s + rng() * 6 * s);
  }
  // Moss hanging out of the canopy.
  for (let i = 0; i < 8; i++) {
    const mx = x - 50 * s + rng() * 100 * s, my = cy + 10 * s + rng() * 10 * s, len = (16 + rng() * 26) * s;
    g.lineStyle(1.5, mixC(LEAF_LIT, MIRE_SCUM, 0.6), 0.8);
    g.lineBetween(mx, my, mx + (rng() - 0.5) * 4, my + len);
  }
  // A web across the crotch.
  g.lineStyle(0.8, WEB, 0.5);
  const wx = x, wy = ty - 46 * s;
  for (let i = 0; i < 7; i++) { const a = Math.PI * 0.15 + (i / 6) * Math.PI * 0.7; g.lineBetween(wx, wy, wx + Math.cos(a) * 26 * s, wy - Math.sin(a) * 22 * s); }
  for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(wx, wy, 8 * s * k, -Math.PI * 0.85, -Math.PI * 0.15, false); g.strokePath(); }
}

// ── The square ───────────────────────────────────────────────────────

/**
 * A pair of stocks: two posts sunk in a sill, a bottom board with three half-holes (neck and
 * wrists), a top board hinged — raised when `open`, down and padlocked when not — and a crust
 * of old produce down the front.
 */
export function stocks(g: G, x: number, y: number, s: number, open: boolean, rng: () => number): void {
  shadow(g, x, y + 2, 92 * s, 16 * s);
  // Sill.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 44 * s, y - 8 * s, 88 * s, 9 * s);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 44 * s, y - 9 * s, 88 * s, 5 * s);
  // Posts.
  for (const k of [-1, 1]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * 38 * s - 5 * s, y - 52 * s, 10 * s, 45 * s);
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(x + k * 38 * s - 5 * s, y - 52 * s, 4 * s, 45 * s);
    g.fillStyle(IRON_DARK, 1); g.fillRect(x + k * 38 * s - 6 * s, y - 40 * s, 12 * s, 3 * s);
  }
  // Bottom board with its three hollows.
  const by = y - 30 * s;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 36 * s, by - 1 * s, 72 * s, 12 * s);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 36 * s, by, 72 * s, 10 * s);
  for (const [hx, hr] of [[-22, 5], [0, 7.5], [22, 5]] as [number, number][]) {
    g.fillStyle(TAR, 1); g.beginPath(); g.arc(x + hx * s, by, hr * s, 0, Math.PI, false); g.fillPath();
  }
  // Top board: down and locked, or swung up on its hinge.
  if (open) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + 32 * s, by - 46 * s, 10 * s, 44 * s);
    g.fillStyle(TIMBER, 1); g.fillRect(x + 33 * s, by - 46 * s, 7 * s, 44 * s);
    g.fillStyle(IRON_LIT, 1); g.fillCircle(x + 37 * s, by - 2 * s, 2 * s);
  } else {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 36 * s, by - 11 * s, 72 * s, 11 * s);
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 36 * s, by - 11 * s, 72 * s, 4 * s);
    for (const [hx, hr] of [[-22, 5], [0, 7.5], [22, 5]] as [number, number][]) {
      g.fillStyle(TAR, 1); g.beginPath(); g.arc(x + hx * s, by, hr * s, Math.PI, 0, false); g.fillPath();
    }
    padlock(g, x - 37 * s, by - 3 * s, 0.7 * s);
  }
  // Old produce down the front.
  for (let i = 0; i < 6; i++) {
    const c = [0xa8402a, 0x8a9a4a, 0xd8c890][i % 3];
    g.fillStyle(c, 0.5); g.fillEllipse(x - 30 * s + rng() * 60 * s, y - 4 * s - rng() * 20 * s, 6 * s, 4 * s);
  }
}

/** A pillory on a raised platform with steps: one board at head height on a tall post. */
export function pillory(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 2, 110 * s, 18 * s);
  // Platform.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 50 * s, y - 26 * s, 100 * s, 26 * s);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 50 * s, y - 28 * s, 100 * s, 6 * s);
  for (let k = 0; k < 5; k++) { g.lineStyle(1, TAR, 0.7); g.lineBetween(x - 50 * s + k * 20 * s, y - 22 * s, x - 50 * s + k * 20 * s, y); }
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? TIMBER : TIMBER_LIT, 1); g.fillRect(x + 50 * s + k * 7 * s, y - 20 * s + k * 7 * s, 8 * s, 4 * s); }
  // Post and board.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 5 * s, y - 100 * s, 10 * s, 74 * s);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 5 * s, y - 100 * s, 4 * s, 74 * s);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 30 * s, y - 92 * s, 60 * s, 16 * s);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 30 * s, y - 92 * s, 60 * s, 12 * s);
  g.lineStyle(1, TAR, 1); g.lineBetween(x - 30 * s, y - 84 * s, x + 30 * s, y - 84 * s);
  for (const hx of [-18, 0, 18]) { g.fillStyle(TAR, 1); g.fillCircle(x + hx * s, y - 84 * s, (hx ? 3.5 : 5.5) * s); }
  // A painted board nailed under it: the offence.
  g.fillStyle(PAPER, 1); g.fillRect(x - 14 * s, y - 70 * s, 28 * s, 12 * s);
  g.lineStyle(1, INK, 0.7);
  for (let k = 0; k < 3; k++) g.lineBetween(x - 11 * s, y - 67 * s + k * 3 * s, x + 11 * s - k * 4 * s, y - 67 * s + k * 3 * s);
  g.fillStyle(INK_RED, 1); g.fillCircle(x + 9 * s, y - 61 * s, 2 * s);
}

/** The debt-bell: a bronze bell under a little gallows frame, rope hanging. */
export function debtBell(g: G, x: number, y: number, s = 1, swing = 0): void {
  shadow(g, x, y + 2, 70 * s, 12 * s);
  for (const k of [-1, 1]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * 26 * s - 4 * s, y - 92 * s, 8 * s, 92 * s);
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(x + k * 26 * s - 4 * s, y - 92 * s, 3 * s, 92 * s);
  }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 34 * s, y - 98 * s, 68 * s, 9 * s);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 34 * s, y - 98 * s, 68 * s, 5 * s);
  // The bell.
  const bx = x + Math.sin(swing) * 6 * s, by = y - 62 * s;
  g.lineStyle(2 * s, IRON_DARK, 1); g.lineBetween(x, y - 89 * s, bx, by - 18 * s);
  poly(g, [
    { x: bx - 8 * s, y: by - 20 * s }, { x: bx + 8 * s, y: by - 20 * s }, { x: bx + 12 * s, y: by - 4 * s },
    { x: bx + 18 * s, y: by + 6 * s }, { x: bx - 18 * s, y: by + 6 * s }, { x: bx - 12 * s, y: by - 4 * s },
  ], BRASS_DARK);
  poly(g, [
    { x: bx - 7 * s, y: by - 20 * s }, { x: bx + 3 * s, y: by - 20 * s }, { x: bx + 4 * s, y: by + 4 * s }, { x: bx - 16 * s, y: by + 4 * s },
    { x: bx - 11 * s, y: by - 4 * s },
  ], BRASS);
  g.fillStyle(BRASS_LIT, 0.8); g.fillRect(bx - 7 * s, by - 16 * s, 2 * s, 14 * s);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(bx - 18 * s, by + 4 * s, 36 * s, 3 * s);
  g.fillStyle(IRON_DARK, 1); g.fillCircle(bx, by + 9 * s, 3 * s);
  // The rope.
  g.lineStyle(2 * s, 0xb89a6a, 1); g.lineBetween(x + 22 * s, y - 89 * s, x + 22 * s, y - 20 * s);
}

/** A notice board on two legs, papered with debt-lists, a purple seal on each. */
export function noticeBoard(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 2, 70 * s, 12 * s);
  for (const k of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * 26 * s - 3 * s, y - 70 * s, 6 * s, 70 * s); }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 34 * s, y - 74 * s, 68 * s, 44 * s);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 32 * s, y - 72 * s, 64 * s, 40 * s);
  for (let i = 0; i < 5; i++) {
    const px = x - 28 * s + i * 12 * s + (rng() - 0.5) * 3, py = y - 68 * s + (rng() - 0.5) * 4;
    g.fillStyle(i % 2 ? PAPER : PAPER_DARK, 1); g.fillRect(px, py, 11 * s, 28 * s);
    g.lineStyle(0.8, INK, 0.6);
    for (let k = 0; k < 6; k++) g.lineBetween(px + 2 * s, py + 4 * s + k * 4 * s, px + (6 + rng() * 3) * s, py + 4 * s + k * 4 * s);
    g.fillStyle(BRUISE, 1); g.fillCircle(px + 5.5 * s, py + 26 * s, 2 * s);
  }
  g.fillStyle(TIMBER_DARK, 1); g.fillTriangle(x - 38 * s, y - 74 * s, x + 38 * s, y - 74 * s, x, y - 86 * s);
}

// ── Buildings ────────────────────────────────────────────────────────

/** Weeping gaol stone: courses of grey-green block with dark mortar and green streaks. */
function stoneWall(g: G, x0: number, y0: number, w: number, h: number, rng: () => number): void {
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0, y0, w, h);
  const cw = 22, ch = 12;
  for (let yy = y0; yy < y0 + h; yy += ch) {
    const shift = ((yy - y0) / ch) % 2 ? cw / 2 : 0;
    for (let xx = x0 - shift; xx < x0 + w; xx += cw) {
      const a = Math.max(x0, xx + 1), b = Math.min(x0 + w, xx + cw - 1);
      if (b <= a) continue;
      g.fillStyle(mixC(STONE, rng() < 0.5 ? 0x000000 : STONE_LIT, rng() * 0.3), 1);
      g.fillRect(a, yy + 1, b - a, Math.min(ch - 2, y0 + h - yy - 1));
    }
  }
  for (let i = 0; i < w / 30; i++) {
    const sx = x0 + rng() * w;
    g.fillStyle(SLIME, 0.35); g.fillRect(sx, y0 + h * (0.2 + rng() * 0.4), 3, h * 0.4);
    g.fillStyle(RUST, 0.25); g.fillRect(sx + 6, y0 + rng() * h * 0.5, 2, h * 0.3);
  }
}

/** A barred window, a hand or two round the bars. */
function barredWindow(g: G, x: number, y: number, w: number, h: number, hands: number): void {
  g.fillStyle(0x0a0c0a, 1); g.fillRect(x - w / 2, y - h / 2, w, h);
  g.fillStyle(LAMP, 0.08); g.fillRect(x - w / 2 + 2, y - h / 2 + 2, w - 4, h / 3);
  g.lineStyle(2.4, IRON, 1);
  for (let k = 1; k < 4; k++) g.lineBetween(x - w / 2 + (w * k) / 4, y - h / 2, x - w / 2 + (w * k) / 4, y + h / 2);
  g.lineStyle(2, IRON_LIT, 0.6); g.lineBetween(x - w / 2, y, x + w / 2, y);
  g.lineStyle(2, STONE_LIT, 1); g.strokeRect(x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2);
  for (let i = 0; i < hands; i++) {
    const hx = x - w / 2 + (w * (i + 1)) / (hands + 1);
    g.fillStyle(0xc8b8a0, 1); g.fillEllipse(hx, y - 2, 5, 7);
    g.fillStyle(0x9a8a74, 1); g.fillRect(hx - 2.5, y - 4, 5, 1.2);
  }
}

/**
 * The Owing House — the debtors' gaol. Two storeys of weeping stone, barred windows with hands
 * through the bars, an iron-studded door under a grille, chains looped along the cornice and a
 * purple Draught seal over the door: those who owe the Matriarch are kept here first.
 */
export function gaol(g: G, x: number, y: number, w: number, h: number, rng: () => number): Pt {
  shadow(g, x, y + 6, w * 1.08, 34);
  const x0 = x - w / 2, top = y - h;
  // Plinth and walls.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 10, y - 16, w + 20, 16);
  stoneWall(g, x0, top, w, h - 16, rng);
  // A string course between the storeys.
  g.fillStyle(STONE_LIT, 1); g.fillRect(x0 - 4, top + h * 0.42, w + 8, 6);
  // Cornice with chains looped along it.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 8, top - 12, w + 16, 14);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x0 - 8, top - 14, w + 16, 4);
  for (let k = 0; k < 6; k++) {
    const ax = x0 + (w * k) / 6 + 6, bx = x0 + (w * (k + 1)) / 6 - 6;
    sagChain(g, ax, top - 2, bx, top - 2, 14, 7, IRON, 1.4);
  }
  // Slate roof behind, with a crooked chimney.
  poly(g, [{ x: x0 - 6, y: top - 14 }, { x: x0 + w + 6, y: top - 14 }, { x: x0 + w - 30, y: top - 70 }, { x: x0 + 30, y: top - 70 }], 0x2e3036);
  for (let r = 0; r < 5; r++) { g.lineStyle(1, 0x45484e, 1); g.lineBetween(x0 + r * 6, top - 22 - r * 11, x0 + w - r * 6, top - 22 - r * 11); }
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 + w * 0.72, top - 92, 18, 40);
  g.fillStyle(STONE, 1); g.fillRect(x0 + w * 0.72, top - 92, 18, 5);
  // Windows: two rows, hands at the bars.
  const n = Math.max(3, Math.round(w / 70));
  for (let i = 0; i < n; i++) {
    const wx = x0 + (w * (i + 0.5)) / n;
    if (Math.abs(wx - x) < 50) continue;
    barredWindow(g, wx, top + h * 0.22, 24, 26, (i * 7) % 3);
    barredWindow(g, wx, top + h * 0.64, 24, 30, (i * 5 + 1) % 3);
  }
  // The door: studded oak under a grille, a lamp either side.
  const dw = 56, dh = h * 0.5;
  g.fillStyle(STONE_LIT, 1); g.fillRect(x - dw / 2 - 8, y - 16 - dh - 8, dw + 16, dh + 8);
  g.fillStyle(STONE_LIT, 1); g.beginPath(); g.arc(x, y - 16 - dh, dw / 2 + 8, Math.PI, 0, false); g.fillPath();
  g.fillStyle(TAR, 1); g.fillRect(x - dw / 2, y - 16 - dh, dw, dh);
  g.beginPath(); g.arc(x, y - 16 - dh, dw / 2, Math.PI, 0, false); g.fillPath();
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - dw / 2 + 3, y - 16 - dh + 2, dw - 6, dh - 2);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.fillStyle(IRON_LIT, 1); g.fillCircle(x - dw / 2 + 9 + c * 12.5, y - 16 - dh + 12 + r * (dh / 4.2), 1.6); }
  g.fillStyle(0x080808, 1); g.fillRect(x - 9, y - 16 - dh + 8, 18, 12);
  g.lineStyle(1.5, IRON_LIT, 1); for (let k = 1; k < 4; k++) g.lineBetween(x - 9 + k * 4.5, y - 16 - dh + 8, x - 9 + k * 4.5, y - 16 - dh + 20);
  // The Matriarch's seal: a coiled serpent in a ring, bruise-purple.
  draughtSeal(g, x, y - 16 - dh - 26, 11);
  for (const k of [-1, 1]) {
    g.fillStyle(IRON_DARK, 1); g.fillRect(x + k * (dw / 2 + 18) - 2, y - 16 - dh * 0.7, 4, 14);
    g.fillStyle(LAMP, 0.9); g.fillCircle(x + k * (dw / 2 + 18), y - 16 - dh * 0.7 - 4, 4);
    glow(g, x + k * (dw / 2 + 18), y - 16 - dh * 0.7 - 4, 20, LAMP, 0.05, 3);
  }
  // Steps.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? STONE : STONE_LIT, 1); g.fillRect(x - dw / 2 - 10 - k * 6, y - 12 + k * 4, dw + 20 + k * 12, 5); }
  return { x, y: y + 16 };
}

/** The Matriarch's seal: a serpent coiled in a ring, head raised over two fang marks. */
export function draughtSeal(g: G, x: number, y: number, r: number): void {
  g.fillStyle(dim(BRUISE, 0.4), 1); g.fillCircle(x, y, r + 2);
  g.fillStyle(BRUISE, 1); g.fillCircle(x, y, r);
  g.lineStyle(Math.max(1, r * 0.18), BRUISE_LIT, 1);
  g.beginPath(); g.arc(x, y + r * 0.1, r * 0.62, Math.PI * 0.2, Math.PI * 1.75, false); g.strokePath();
  g.fillStyle(BRUISE_LIT, 1); g.fillCircle(x + r * 0.45, y - r * 0.45, r * 0.18);
  g.fillStyle(0xffffff, 0.9); g.fillCircle(x - r * 0.12, y + r * 0.05, r * 0.08); g.fillCircle(x + r * 0.12, y + r * 0.05, r * 0.08);
}

/**
 * The Great Ledger — a book the size of a door, open on an iron lectern-frame against the gaol
 * wall, chained shut across its covers at night and chained to the wall always. Two ruled pages,
 * columns of names in black and sums in red.
 */
export function bigLedger(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 2, 120 * s, 18 * s);
  // The frame.
  for (const k of [-1, 1]) {
    g.fillStyle(IRON_DARK, 1); g.fillRect(x + k * 44 * s - 3 * s, y - 70 * s, 6 * s, 70 * s);
    g.lineStyle(2 * s, IRON, 1); g.lineBetween(x + k * 44 * s, y, x + k * 30 * s, y - 40 * s);
  }
  // The open book, tipped toward the reader.
  const top = y - 130 * s, h = 76 * s;
  poly(g, [{ x: x - 58 * s, y: top + 6 * s }, { x: x, y: top + 12 * s }, { x: x + 58 * s, y: top + 6 * s }, { x: x + 62 * s, y: top + h }, { x: x, y: top + h + 8 * s }, { x: x - 62 * s, y: top + h }], 0x3a1a20);
  for (const k of [-1, 1]) {
    poly(g, [{ x, y: top + 10 * s }, { x: x + k * 54 * s, y: top + 4 * s }, { x: x + k * 57 * s, y: top + h - 4 * s }, { x, y: top + h + 2 * s }], k < 0 ? PAPER : lit(PAPER, 0.08));
    // Ruled columns.
    g.lineStyle(0.8, INK_RED, 0.5);
    g.lineBetween(x + k * 36 * s, top + 8 * s, x + k * 37 * s, top + h - 2 * s);
    for (let r = 0; r < 11; r++) {
      const ly = top + 14 * s + r * 5.4 * s;
      g.lineStyle(0.6, PAPER_DARK, 0.8); g.lineBetween(x + k * 4 * s, ly + 1 * s, x + k * 54 * s, ly - 1 * s);
      g.lineStyle(0.9, INK, 0.7); g.lineBetween(x + k * 6 * s, ly, x + k * (10 + rng() * 22) * s, ly - 0.2 * s);
      g.lineStyle(0.9, r % 4 === 3 ? INK_RED : INK, 0.8); g.lineBetween(x + k * 40 * s, ly, x + k * (44 + rng() * 8) * s, ly);
    }
  }
  g.lineStyle(1.5, PAPER_DARK, 1); g.lineBetween(x, top + 10 * s, x, top + h + 2 * s);
  // A chain across both pages, slack in the day; a brass hasp at the gutter.
  sagChain(g, x - 62 * s, top + h * 0.45, x + 62 * s, top + h * 0.45, 10 * s, 8 * s, IRON, 1.6);
  padlock(g, x, top + h * 0.45 + 10 * s, 0.9 * s, BRASS);
  // The wall chain.
  sagChain(g, x + 60 * s, top + h * 0.8, x + 86 * s, top - 10 * s, 6 * s, 8 * s, IRON_DARK, 1.6);
  // A quill in a horn standing on the frame.
  g.fillStyle(BONE_SHADE, 1); g.fillTriangle(x + 50 * s, y - 52 * s, x + 58 * s, y - 52 * s, x + 54 * s, y - 40 * s);
  g.lineStyle(1.4, 0xf4f0e6, 1); g.lineBetween(x + 54 * s, y - 52 * s, x + 66 * s, y - 80 * s);
  g.lineStyle(3, 0xf4f0e6, 0.7); g.lineBetween(x + 58 * s, y - 60 * s, x + 65 * s, y - 76 * s);
}

/**
 * The Manacle Works: a long brick foundry, two tall stacks, the furnace mouth glowing orange,
 * racks of new manacles cooling on pegs along the front and a stamp press beside the door.
 */
export function manacleWorks(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 8, w * 1.1, 36);
  const x0 = x - w / 2, top = y - h;
  // Brick walls, soot-stained.
  g.fillStyle(0x4a2a22, 1); g.fillRect(x0, top, w, h);
  for (let yy = top; yy < y; yy += 8) {
    const shift = ((yy - top) / 8) % 2 ? 7 : 0;
    for (let xx = x0 - shift; xx < x0 + w; xx += 14) {
      const a = Math.max(x0, xx + 1), b = Math.min(x0 + w, xx + 13);
      if (b <= a) continue;
      g.fillStyle(mixC(0x7a3a2a, 0x000000, 0.1 + rng() * 0.3 + Math.max(0, (yy - top) / h - 0.5) * -0.1), 1);
      g.fillRect(a, yy + 1, b - a, 6);
    }
  }
  g.fillStyle(0x000000, 0.35); g.fillRect(x0, top, w, h * 0.25);
  // Roof: corrugated iron, rusted through.
  poly(g, [{ x: x0 - 12, y: top + 4 }, { x: x0 + w + 12, y: top + 4 }, { x: x0 + w - 20, y: top - 40 }, { x: x0 + 20, y: top - 40 }], RUST_DARK);
  for (let k = 0; k < w / 10; k++) { g.lineStyle(2, k % 2 ? RUST : RUST_LIT, 0.6); g.lineBetween(x0 - 10 + k * 10 + 2, top + 2, x0 + 20 + k * (w - 40) / (w / 10), top - 38); }
  // Stacks.
  for (const sx of [x0 + w * 0.22, x0 + w * 0.78]) {
    g.fillStyle(0x3a2018, 1); g.fillRect(sx - 12, top - 130, 24, 100);
    for (let k = 0; k < 8; k++) { g.lineStyle(1, 0x2a160e, 1); g.lineBetween(sx - 12, top - 120 + k * 12, sx + 12, top - 120 + k * 12); }
    g.fillStyle(IRON_DARK, 1); g.fillRect(sx - 15, top - 136, 30, 8);
    g.fillStyle(0x000000, 0.4); g.fillRect(sx + 4, top - 128, 8, 96);
  }
  // Furnace mouth: an arch of fire.
  const fx = x0 + w * 0.3, fy = y - 14;
  g.fillStyle(0x1a0c08, 1); g.fillRect(fx - 30, fy - 50, 60, 50);
  g.beginPath(); g.arc(fx, fy - 50, 30, Math.PI, 0, false); g.fillPath();
  g.fillStyle(HOT, 0.9); g.fillRect(fx - 24, fy - 30, 48, 30);
  g.fillStyle(HOT_LIT, 0.9); g.fillRect(fx - 18, fy - 14, 36, 14);
  g.beginPath(); g.fillStyle(HOT, 0.7); g.arc(fx, fy - 30, 24, Math.PI, 0, false); g.fillPath();
  glow(g, fx, fy - 20, 70, HOT, 0.06, 4);
  // Door.
  const dx = x0 + w * 0.62;
  g.fillStyle(TAR, 1); g.fillRect(dx - 24, y - 64, 48, 64);
  g.lineStyle(2, IRON, 1); g.strokeRect(dx - 24, y - 64, 48, 64); g.lineBetween(dx, y - 64, dx, y);
  g.fillStyle(PAPER, 1); g.fillRect(dx - 18, y - 92, 36, 14);
  g.lineStyle(1, INK, 0.8); for (let k = 0; k < 2; k++) g.lineBetween(dx - 14, y - 88 + k * 5, dx + 14, y - 88 + k * 5);
  // Racks of manacles on pegs.
  for (const rx of [x0 + 40, x0 + w - 70]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(rx - 4, y - 60, 52, 6);
    for (let k = 0; k < 4; k++) {
      g.lineStyle(1, IRON_DARK, 1); g.lineBetween(rx + 4 + k * 12, y - 54, rx + 4 + k * 12, y - 48);
      manacle(g, rx + 4 + k * 12, y - 42, 4.5, -Math.PI / 2, 0.15, k === 0 ? 0.7 : 0);
    }
  }
}

/** One of the piles the causeway stands on: a tarred stake, wound with rope, slimed at the foot. */
export function pile(g: G, x: number, y: number, s: number): void {
  g.fillStyle(TAR, 1); g.fillRect(x - 5 * s, y - 34 * s, 10 * s, 36 * s);
  g.fillStyle(TIMBER, 0.6); g.fillRect(x - 4 * s, y - 34 * s, 3 * s, 34 * s);
  g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(x, y - 34 * s, 10 * s, 4 * s);
  g.lineStyle(1.5, 0xa88a5a, 1); for (let k = 0; k < 3; k++) g.lineBetween(x - 5 * s, y - 20 * s + k * 3 * s, x + 5 * s, y - 22 * s + k * 3 * s);
  g.fillStyle(SLIME, 0.8); g.fillEllipse(x, y, 16 * s, 5 * s);
}

/**
 * A debtor's stilt hut: a plank box on four tarred legs over the mud, a ladder, a tarpaper roof,
 * and the household's debt chalked on its shutters in tally marks.
 */
export function stiltHut(g: G, x: number, y: number, w: number, h: number, tone: number, tallies: number, rng: () => number): void {
  shadow(g, x, y + 2, w * 1.2, 18);
  const legH = 22, x0 = x - w / 2, floorY = y - legH;
  for (const lx of [x0 + 6, x0 + w * 0.35, x0 + w * 0.65, x0 + w - 6]) {
    g.fillStyle(TAR, 1); g.fillRect(lx - 3, floorY, 6, legH);
    g.fillStyle(SLIME, 0.7); g.fillEllipse(lx, y, 10, 4);
  }
  // Ladder.
  g.lineStyle(2, TIMBER, 1); g.lineBetween(x + w * 0.18, floorY, x + w * 0.24, y); g.lineBetween(x + w * 0.3, floorY, x + w * 0.36, y);
  for (let k = 1; k < 4; k++) g.lineBetween(x + w * 0.18 + k * 1.5, floorY + k * 5.5, x + w * 0.3 + k * 1.5, floorY + k * 5.5);
  // Plank walls.
  g.fillStyle(dim(tone, 0.35), 1); g.fillRect(x0, floorY - h, w, h);
  for (let px = x0; px < x0 + w; px += 8) {
    g.fillStyle(mixC(tone, 0x000000, rng() * 0.25), 1); g.fillRect(px + 0.5, floorY - h, 7, h);
  }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 - 2, floorY - 3, w + 4, 4);
  // Roof of tarred paper, sagging, weighed with stones.
  poly(g, [{ x: x0 - 10, y: floorY - h + 2 }, { x: x0 + w + 10, y: floorY - h + 2 }, { x: x0 + w - 6, y: floorY - h - 26 }, { x: x0 + 6, y: floorY - h - 24 }], TAR);
  g.lineStyle(1, 0x3a322a, 1); for (let k = 0; k < 3; k++) g.lineBetween(x0 - 6 + k * 2, floorY - h - 4 - k * 8, x0 + w + 6 - k * 2, floorY - h - 4 - k * 8);
  for (let k = 0; k < 3; k++) { g.fillStyle(STONE, 1); g.fillCircle(x0 + 10 + k * (w - 20) / 2, floorY - h - 22, 3.5); }
  // Shutter with the debt in chalk.
  const sx = x0 + w * 0.3, sy = floorY - h * 0.62;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(sx - 12, sy - 10, 24, 20);
  g.fillStyle(LAMP, 0.25); g.fillRect(sx - 1, sy - 9, 2, 18);
  g.lineStyle(1.2, 0xe8e4d8, 0.85);
  for (let k = 0; k < Math.min(tallies, 9); k++) {
    const gx = sx - 10 + (k % 5) * 3.6 + Math.floor(k / 5) * 2, gy = sy - 8 + Math.floor(k / 5) * 10;
    if (k % 5 === 4) g.lineBetween(gx - 15, gy + 6, gx + 1, gy + 1); else g.lineBetween(gx, gy, gx, gy + 7);
  }
  // Door.
  const dx = x0 + w * 0.74;
  g.fillStyle(TAR, 1); g.fillRect(dx - 8, floorY - 30, 16, 30);
  g.fillStyle(IRON_LIT, 1); g.fillCircle(dx + 5, floorY - 15, 1.2);
}

/**
 * The Hock & Chain — the court's pawnshop on stilts. The pawnbroker's three balls hang from its
 * bracket, here cast in iron like convicts' shot; the window is crammed with redeemed and
 * unredeemed things, each with a paper ticket.
 */
export function pawnShop(g: G, x: number, y: number, rng: () => number): void {
  stiltHut(g, x, y, 150, 74, 0x5a3e2e, 0, rng);
  const floorY = y - 22, top = floorY - 74;
  // Bay window full of pledges.
  g.fillStyle(0x161210, 1); g.fillRect(x - 64, top + 18, 64, 36);
  g.fillStyle(LAMP, 0.18); g.fillRect(x - 64, top + 18, 64, 36);
  const things = [BRASS, IRON_LIT, 0xc8c0b0, RUST_LIT, BRUISE_LIT, 0x8ab0c0];
  for (let i = 0; i < 10; i++) {
    const tx = x - 58 + (i % 5) * 12, ty = top + 28 + Math.floor(i / 5) * 14;
    g.fillStyle(things[i % things.length], 0.9); g.fillCircle(tx, ty, 3 + rng() * 2);
    g.fillStyle(PAPER, 1); g.fillRect(tx + 2, ty + 2, 4, 3);
  }
  g.lineStyle(2, TIMBER_LIT, 1); g.strokeRect(x - 64, top + 18, 64, 36); g.lineBetween(x - 32, top + 18, x - 32, top + 54);
  // Bracket and the three iron balls.
  const bx = x - 75, by = top - 10;
  g.lineStyle(3, IRON_DARK, 1); g.lineBetween(bx + 10, by + 30, bx - 26, by + 30); g.lineBetween(bx + 10, by + 46, bx - 20, by + 30);
  for (const [ox, oy] of [[-34, 52], [-20, 52], [-27, 64]] as [number, number][]) {
    g.lineStyle(1, IRON_DARK, 1); g.lineBetween(bx - 27, by + 30, bx + ox, by + oy - 6);
    ironBall(g, bx + ox, by + oy, 6, 0.4);
  }
  // Signboard.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 40, top - 26, 92, 20);
  g.fillStyle(BRASS, 1); g.fillRect(x - 38, top - 24, 88, 16);
  g.fillStyle(INK, 1);
  for (let k = 0; k < 8; k++) g.fillRect(x - 32 + k * 10, top - 20, 6, 8);
}

/**
 * The Fetterhold — Prince Fetter's keep. A square tower bound in iron bands like a strongbox,
 * chains hanging from its battlements with gibbet cages on two of them, a portcullis of chain
 * over the gate, a great brass key over the arch, and the Matriarch's seal under it.
 */
export function fetterhold(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 8, w * 1.2, 40);
  const x0 = x - w / 2, top = y - h;
  // Wings either side, lower.
  for (const k of [-1, 1]) {
    const wx0 = k < 0 ? x0 - w * 0.36 : x0 + w, ww = w * 0.36, wh = h * 0.5;
    stoneWall(g, wx0, y - wh, ww, wh, rng);
    for (let c = 0; c < 4; c++) { g.fillStyle(STONE_DARK, 1); g.fillRect(wx0 + c * (ww / 4) + 2, y - wh - 10, ww / 8, 10); }
    barredWindow(g, wx0 + ww / 2, y - wh * 0.55, 18, 24, 1);
  }
  // The tower.
  stoneWall(g, x0, top, w, h, rng);
  // Iron bands, riveted, like a strongbox.
  for (const by of [top + h * 0.18, top + h * 0.5, top + h * 0.82]) {
    g.fillStyle(IRON_DARK, 1); g.fillRect(x0 - 4, by, w + 8, 10);
    g.fillStyle(IRON, 1); g.fillRect(x0 - 4, by, w + 8, 6);
    for (let rx = x0; rx < x0 + w; rx += 16) { g.fillStyle(IRON_LIT, 1); g.fillCircle(rx + 6, by + 3, 1.6); }
    g.fillStyle(RUST, 0.5); g.fillRect(x0 + rng() * w * 0.7, by + 6, 30, 12);
  }
  // Battlements.
  for (let c = 0; c < 7; c++) {
    g.fillStyle(STONE_DARK, 1); g.fillRect(x0 + c * (w / 7) + 3, top - 18, w / 14, 18);
    g.fillStyle(STONE_LIT, 1); g.fillRect(x0 + c * (w / 7) + 3, top - 18, w / 14, 3);
  }
  // Chains hanging from the battlements, two with gibbet cages.
  for (const [cx, len, cage] of [[x0 + 14, 70, false], [x0 + w * 0.3, 110, true], [x0 + w * 0.7, 90, true], [x0 + w - 14, 60, false]] as [number, number, boolean][]) {
    chainLinks(g, [{ x: cx, y: top - 4 }, { x: cx + 2, y: top - 4 + len }], 8, IRON_DARK, 1.6);
    if (cage) {
      const cy = top - 4 + len;
      g.lineStyle(1.6, IRON, 1);
      g.strokeEllipse(cx + 2, cy + 4, 22, 8); g.strokeEllipse(cx + 2, cy + 34, 22, 8);
      for (let k = 0; k < 5; k++) g.lineBetween(cx - 9 + k * 5.5, cy + 4, cx - 9 + k * 5.5, cy + 34);
      g.fillStyle(0xd8d0c0, 0.5); g.fillCircle(cx + 2, cy + 18, 4);
    }
  }
  // The gate: a portcullis of chain under an arch.
  const gw = w * 0.4, gh = h * 0.42;
  g.fillStyle(STONE_LIT, 1); g.fillRect(x - gw / 2 - 10, y - gh - 4, gw + 20, gh + 4);
  g.beginPath(); g.arc(x, y - gh, gw / 2 + 10, Math.PI, 0, false); g.fillPath();
  g.fillStyle(0x080a08, 1); g.fillRect(x - gw / 2, y - gh, gw, gh);
  g.beginPath(); g.arc(x, y - gh, gw / 2, Math.PI, 0, false); g.fillPath();
  g.fillStyle(LAMP, 0.08); g.fillRect(x - gw / 2, y - gh * 0.5, gw, gh * 0.5);
  for (let k = 0; k < 6; k++) {
    const cx = x - gw / 2 + 6 + (k * (gw - 12)) / 5;
    chainLinks(g, [{ x: cx, y: y - gh - gw / 2 * Math.sqrt(Math.max(0, 1 - ((cx - x) / (gw / 2)) ** 2)) + 4 }, { x: cx, y: y - 8 }], 7, IRON, 1.4);
  }
  // The great key over the arch, and the seal under it.
  key(g, x, y - gh - gw / 2 - 24, 3.2, 0, BRASS);
  draughtSeal(g, x, y - gh - gw / 2 - 2, 9);
  // Banners: bruise purple, a broken-open manacle on each.
  for (const k of [-1, 1]) {
    const bx = x + k * (w / 2 - 18), by = top + h * 0.24;
    poly(g, [{ x: bx - 12, y: by }, { x: bx + 12, y: by }, { x: bx + 12, y: by + 56 }, { x: bx, y: by + 46 }, { x: bx - 12, y: by + 56 }], BRUISE);
    g.fillStyle(BRUISE_LIT, 0.4); g.fillRect(bx - 12, by, 4, 54);
    manacle(g, bx, by + 22, 6, -Math.PI / 2, 0, 0);
  }
  // Steps.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? STONE : STONE_LIT, 1); g.fillRect(x - gw / 2 - 16 - k * 8, y - 8 + k * 4, gw + 32 + k * 16, 5); }
}

/**
 * A stone pylon of the Great Chain Bridge: a squat tower with a cast-iron saddle on top, over
 * which the bridge's suspension chain is draped.
 */
export function bridgeTower(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 2, 60 * s, 14 * s, 0.4);
  stoneWall(g, x - 22 * s, y - 110 * s, 44 * s, 110 * s, rng);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x - 26 * s, y - 114 * s, 52 * s, 8 * s);
  g.fillStyle(IRON_DARK, 1); g.fillEllipse(x, y - 118 * s, 30 * s, 12 * s);
  g.fillStyle(IRON, 1); g.fillEllipse(x, y - 120 * s, 26 * s, 8 * s);
  g.fillStyle(SLIME, 0.8); g.fillRect(x - 22 * s, y - 12 * s, 44 * s, 12 * s);
}

/** The gaol's moat-cage: a gibbet arm reaching over the water with an iron cage hung low over it. */
export function moatCage(g: G, x: number, y: number, s: number): void {
  // The gibbet post on the bank.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 5 * s, y - 120 * s, 10 * s, 120 * s);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 5 * s, y - 120 * s, 3 * s, 120 * s);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 5 * s, y - 124 * s, 80 * s, 9 * s);
  g.lineStyle(4 * s, TIMBER_DARK, 1); g.lineBetween(x, y - 90 * s, x + 30 * s, y - 118 * s);
  // The windlass.
  g.fillStyle(IRON, 1); g.fillCircle(x, y - 40 * s, 7 * s);
  g.lineStyle(2 * s, IRON_LIT, 1); g.lineBetween(x, y - 40 * s, x + 10 * s, y - 50 * s);
}

/** The cage itself — hung on its chain, a little sunk, with someone sitting in it. Drawn in `animate`. */
export function cage(g: G, x: number, y: number, s: number, sway: number, sitter: number): void {
  const cx = x + Math.sin(sway) * 4 * s;
  chainLinks(g, [{ x, y: y - 70 * s }, { x: cx, y: y - 34 * s }], 7 * s, IRON_DARK, 1.4);
  g.fillStyle(0x000000, 0.25); g.fillEllipse(cx, y + 6 * s, 40 * s, 10 * s);
  // Sitter, knees up.
  g.fillStyle(sitter, 1); g.fillCircle(cx, y - 12 * s, 7 * s); g.fillEllipse(cx, y + 2 * s, 18 * s, 14 * s);
  g.fillStyle(0xffffff, 0.8); g.fillCircle(cx - 2 * s, y - 13 * s, 1.2 * s); g.fillCircle(cx + 2 * s, y - 13 * s, 1.2 * s);
  g.lineStyle(1.8 * s, IRON, 1);
  g.strokeEllipse(cx, y - 32 * s, 32 * s, 9 * s); g.strokeEllipse(cx, y + 6 * s, 34 * s, 10 * s);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI;
    const ox = Math.cos(a) * 16 * s;
    g.lineStyle(1.6 * s, k % 2 ? IRON : IRON_LIT, 1); g.lineBetween(cx + ox, y - 30 * s + Math.sin(a) * 3 * s, cx + ox * 1.05, y + 8 * s + Math.sin(a) * 4 * s);
  }
  g.fillStyle(MIRE, 0.7); g.fillRect(cx - 18 * s, y + 2 * s, 36 * s, 8 * s);
}

/** The Shackle Court's waystone: a stub of fang rock wrapped in chain, a brass padlock glowing on it. */
export function shackleWaystone(g: G, x: number, y: number, rng: () => number): void {
  fangRock(g, x, y, 0.55, 0.15, rng);
  for (let k = 0; k < 3; k++) {
    const yy = y - 18 - k * 18;
    chainLinks(g, [{ x: x - 20 + k * 3, y: yy + 4 }, { x: x + 24 + k * 3, y: yy - 4 }], 7, IRON, 1.5);
  }
  padlock(g, x + 4, y - 30, 1.2, BRASS);
  glow(g, x + 4, y - 32, 22, GAS, 0.05, 3);
}

/** A lamp on a post with a cage round its flame — the court's lamps are locked too. */
export function cagedLamp(g: G, x: number, y: number): void {
  shadow(g, x, y + 1, 18, 6);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 2, y - 58, 4, 58);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 8, y - 70, 16, 3);
  g.fillStyle(LAMP, 0.95); g.fillCircle(x, y - 64, 4);
  g.lineStyle(1, IRON, 1); for (let k = -1; k <= 1; k++) g.lineBetween(x + k * 5, y - 70, x + k * 5, y - 58);
  g.strokeRect(x - 7, y - 70, 14, 12);
}

// ── Ground helpers ───────────────────────────────────────────────────

/** A boardwalk of tarred planks across a rect, its long axis `horiz` or not, nails and gaps. */
export function boardwalk(g: G, r: Rect, horiz: boolean, rng: () => number): void {
  g.fillStyle(TAR, 1); g.fillRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6);
  const step = 12;
  const len = horiz ? r.w : r.h, across = horiz ? r.h : r.w;
  for (let d = 0; d < len; d += step) {
    const c = mixC(TIMBER, rng() < 0.5 ? TIMBER_DARK : TIMBER_LIT, rng() * 0.6);
    const w = Math.min(step - 1.5, len - d);
    if (horiz) { g.fillStyle(c, 1); g.fillRect(r.x + d, r.y, w, across); }
    else { g.fillStyle(c, 1); g.fillRect(r.x, r.y + d, across, w); }
    if (rng() < 0.4) {
      g.fillStyle(SLIME, 0.25);
      if (horiz) g.fillRect(r.x + d, r.y + across * rng(), w, 6); else g.fillRect(r.x + across * rng(), r.y + d, 6, w);
    }
    g.fillStyle(IRON_DARK, 0.8);
    if (horiz) { g.fillCircle(r.x + d + 3, r.y + 4, 0.9); g.fillCircle(r.x + d + 3, r.y + across - 4, 0.9); }
    else { g.fillCircle(r.x + 4, r.y + d + 3, 0.9); g.fillCircle(r.x + across - 4, r.y + d + 3, 0.9); }
  }
}

/** Trodden causeway clay: the long road, rutted by chain-gangs dragging their irons. */
export function causeway(g: G, pts: Pt[], w: number, rng: () => number): void {
  for (const [ww, c] of [[w + 26, MUD_DARK], [w + 10, MUD], [w, MUD_LIT]] as [number, number][]) {
    g.lineStyle(ww, c, 1);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
    g.fillStyle(c, 1); for (const p of pts) g.fillCircle(p.x, p.y, ww / 2);
  }
  // Drag-ruts: pairs of grooves where the gangs' chains scrape, and scattered gravel.
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / (len || 1), uy = (b.y - a.y) / (len || 1);
    for (const off of [-w * 0.22, w * 0.18]) {
      g.lineStyle(2, MUD_DARK, 0.6);
      g.lineBetween(a.x - uy * off, a.y + ux * off, b.x - uy * off, b.y + ux * off);
    }
    for (let k = 0; k < len / 14; k++) {
      const t = rng(), off = (rng() - 0.5) * w * 0.9;
      g.fillStyle(rng() < 0.5 ? STONE : MUD_DARK, 0.5);
      g.fillCircle(a.x + (b.x - a.x) * t - uy * off, a.y + (b.y - a.y) * t + ux * off, 1 + rng() * 2);
    }
  }
}

// ── Animated bits (called every frame — keep them light) ─────────────

/** Marsh-gas bubbles rising and popping over a patch of mire. */
export function gasBubbles(g: G, x: number, y: number, t: number, n: number, spread: number, seed: number): void {
  for (let i = 0; i < n; i++) {
    const ph = (t * (0.3 + ((i * 37 + seed) % 10) / 30) + i / n) % 1;
    const bx = x + (((i * 131 + seed * 17) % 100) / 100 - 0.5) * spread;
    const by = y + (((i * 71 + seed * 29) % 100) / 100 - 0.5) * spread * 0.35;
    if (ph < 0.75) {
      const r = 1.5 + ph * 5;
      g.lineStyle(1, GAS, 0.5); g.strokeCircle(bx, by, r);
      g.fillStyle(0xffffff, 0.4); g.fillCircle(bx - r * 0.3, by - r * 0.3, 0.8);
    } else {
      const k = (ph - 0.75) / 0.25;
      g.lineStyle(1, GAS, 0.5 * (1 - k)); g.strokeEllipse(bx, by, 10 + k * 22, 4 + k * 7);
      g.fillStyle(GAS, 0.08 * (1 - k)); g.fillCircle(bx, by - 10 - k * 14, 8 + k * 10);
    }
  }
}

/** Smoke out of a stack: soft dark puffs climbing and leaning with the air. */
export function stackSmoke(g: G, x: number, y: number, t: number, seed: number): void {
  for (let i = 0; i < 7; i++) {
    const ph = (t * 0.18 + i / 7 + seed * 0.13) % 1;
    const px = x + ph * 40 + Math.sin(t + i + seed) * 6, py = y - ph * 120;
    g.fillStyle(mixC(0x2a2622, 0x6a665e, ph), 0.35 * (1 - ph)); g.fillCircle(px, py, 8 + ph * 22);
  }
  if (Math.sin(t * 3 + seed) > 0.6) { g.fillStyle(HOT, 0.5); g.fillCircle(x + Math.sin(t * 7) * 4, y - 6, 1.5); }
}

/** A chain-gang: four convicts in a file, one chain through their ankle-irons, shuffling. */
export function chainGang(g: G, x: number, y: number, t: number, dir: 1 | -1, n = 4, chained = true): void {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const px = x - dir * i * 26, py = y + Math.sin(t * 6 + i * 1.3) * 1.2;
    const step = Math.sin(t * 6 + i * 1.3);
    g.fillStyle(0x000000, 0.25); g.fillEllipse(px, py + 2, 18, 6);
    // Legs.
    g.lineStyle(3, 0x4a4238, 1); g.lineBetween(px - 3, py - 10, px - 3 + step * 3, py); g.lineBetween(px + 3, py - 10, px + 3 - step * 3, py);
    // Body in striped grey.
    g.fillStyle(0x7a7468, 1); g.fillRoundedRect(px - 7, py - 28, 14, 18, 4);
    g.lineStyle(1.5, 0x4a463e, 1); for (let k = 0; k < 3; k++) g.lineBetween(px - 7, py - 24 + k * 5, px + 7, py - 24 + k * 5);
    // Head, bowed.
    g.fillStyle(0xc8b096, 1); g.fillCircle(px + dir * 2, py - 33, 5.5);
    g.fillStyle(0x3a3028, 1); g.fillEllipse(px + dir * 1, py - 37, 10, 4);
    // Tools on the shoulder, every other one.
    if (i % 2 === 0) { g.lineStyle(1.6, TIMBER, 1); g.lineBetween(px - dir * 6, py - 30, px + dir * 10, py - 44); }
    pts.push({ x: px, y: py - 2 });
  }
  if (!chained) return;
  for (let i = 0; i < pts.length - 1; i++) {
    sagChain(g, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, 5, 5, IRON, 1.1);
  }
}

/** A drifting lamp-glow in the murk (lit lamps, the furnace mouth). */
export function murkGlow(g: G, x: number, y: number, t: number, r: number, color = LAMP): void {
  const f = 0.85 + Math.sin(t * 7.3 + x) * 0.08 + Math.sin(t * 2.1 + y) * 0.07;
  glow(g, x, y, r * f, color, 0.045, 3);
}

/** A thin mire ripple where something under the water moved. */
export function ripple(g: G, x: number, y: number, t: number, seed: number): void {
  const ph = (t * 0.4 + seed) % 1;
  g.lineStyle(1, MIRE_SHEEN, 0.6 * (1 - ph)); g.strokeEllipse(x, y, 6 + ph * 40, 2 + ph * 12);
  g.lineStyle(1, MIRE_DEEP, 0.4 * (1 - ph)); g.strokeEllipse(x, y + 1, 4 + ph * 30, 1.5 + ph * 9);
}

/** A fallen tally board: reused on the arena floor and in the world. */
export function tallyMarks(g: G, x: number, y: number, n: number, color: number, a = 0.8, s = 1): void {
  g.lineStyle(1.4 * s, color, a);
  for (let k = 0; k < n; k++) {
    const gx = x + (k % 5) * 4 * s + Math.floor(k / 5) * 26 * s;
    if (k % 5 === 4) g.lineBetween(gx - 17 * s, y + 7 * s, gx + 1 * s, y + 1 * s);
    else g.lineBetween(gx, y, gx, y + 9 * s);
  }
}

/** Stone setts for the Square of Stocks, laid in a fan, with iron rings let into them. */
export function setts(g: G, cx: number, cy: number, r: number, rng: () => number): void {
  g.fillStyle(STONE_DARK, 1); g.fillCircle(cx, cy, r + 10);
  g.fillStyle(MUD_DARK, 1); g.fillCircle(cx, cy, r);
  for (let rr = 14; rr < r; rr += 13) {
    const n = Math.floor((rr * Math.PI * 2) / 15);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rr * 0.1;
      g.fillStyle(mixC(STONE, rng() < 0.5 ? STONE_DARK : STONE_LIT, rng() * 0.6), 1);
      g.fillRoundedRect(cx + Math.cos(a) * rr - 6, cy + Math.sin(a) * rr - 5, 12, 10, 2);
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2, d = r * 0.82;
    g.lineStyle(2.5, IRON, 1); g.strokeCircle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 6);
    g.fillStyle(IRON_DARK, 1); g.fillCircle(cx + Math.cos(a) * d, cy + Math.sin(a) * d - 6, 2.4);
  }
}

/** Mud with standing puddles — the ground everywhere the boards and setts aren't. */
export function mudPatch(g: G, x: number, y: number, w: number, rng: () => number): void {
  g.fillStyle(MUD_DARK, 0.6); g.fillEllipse(x, y, w, w * 0.35);
  g.fillStyle(MIRE, 0.7); g.fillEllipse(x + w * 0.05, y, w * 0.6, w * 0.18);
  g.fillStyle(MIRE_SHEEN, 0.3); g.fillEllipse(x - w * 0.05, y - w * 0.03, w * 0.3, w * 0.05);
  if (rng() < 0.5) { g.fillStyle(VENOM, 0.15); g.fillEllipse(x + w * 0.15, y + 2, w * 0.2, w * 0.06); }
}
