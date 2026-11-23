import Phaser from 'phaser';
import { type G, dim, lit, mixC } from '../../../../art/IsleArt';
import { OBS, councilMask, seam, shard, slab } from '../../../../art/PinnacleArt';

/**
 * The Storm Bench's drawings — the spire's conductor, where the Draw was written.
 *
 * The room is black glass like every bench, but this one carries current: arcs crawl inside the
 * walls, Leyden jars stand in ranks, cables as thick as trees climb into the dark, and at the
 * heart of it is the Meter, the great dial that counted the Draw, its needle pinned at the stop.
 * Voltreach's one extra family of colour is its own — storm-yellow light and the copper of the
 * Grid — and it only ever shows as light, inlay and trapped things inside the glass.
 */

// ── Palette ───────────────────────────────────────────────────────────

/** Storm-yellow: the bench's light. */
export const VOLT = 0xffe14a;
export const VOLT_LIT = 0xfff6c4;
export const VOLT_DEEP = 0xc8960e;
/** The white-hot core of an arc. */
export const ARC_CORE = 0xfffdf0;
/** The Grid's copper and the Meter's brass — inlay, never a repaint. */
export const COPPER = 0xc8743a;
export const COPPER_LIT = 0xf2b070;
export const COPPER_DARK = 0x5a2c14;
export const BRASS = 0xc8a048;
export const BRASS_DARK = 0x6a5220;
/** Insulation: the cables' black rubber, a hair warmer than the glass. */
export const RUBBER = 0x141016;
/** The two sides of a fight, as the decrees colour them. */
export const SIDE_PLAYER = 0x8fe8ff;
export const SIDE_NPC = 0xc9a0ff;
export const SIDE_PLAYER_CSS = '#8fe8ff';
export const SIDE_NPC_CSS = '#c9a0ff';
export const VOLT_CSS = '#ffe14a';

const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

/** A cheap stable hash → 0..1 for flickers that must be the same within one frame-bucket. */
export function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// ── Arcs ──────────────────────────────────────────────────────────────

/**
 * A bolt of lightning from a to b: a jagged path re-rolled every `seed`, drawn as a wide soft
 * glow, a bright body and a white core, with a fork or two. Pass a seed that changes every
 * ~50 ms for a live crackle, or a fixed one for a frozen arc.
 */
export function bolt(g: G, ax: number, ay: number, bx: number, by: number, seed: number, w = 2, color: number = VOLT, alpha = 1, forks = 1): void {
  const len = Math.hypot(bx - ax, by - ay);
  if (len < 2) return;
  const steps = Math.max(3, Math.min(14, Math.round(len / 22)));
  const nx = -(by - ay) / len, ny = (bx - ax) / len;
  const jag = Math.min(22, len * 0.12);
  const pts: { x: number; y: number }[] = [{ x: ax, y: ay }];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const off = (hash01(seed * 13.7 + i * 3.1) - 0.5) * 2 * jag;
    pts.push({ x: ax + (bx - ax) * t + nx * off, y: ay + (by - ay) * t + ny * off });
  }
  pts.push({ x: bx, y: by });
  const pass = (width: number, c: number, a: number, path: { x: number; y: number }[]) => {
    g.lineStyle(width, c, a);
    g.beginPath();
    g.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) g.lineTo(path[i].x, path[i].y);
    g.strokePath();
  };
  pass(w * 5, color, 0.12 * alpha, pts);
  pass(w * 2.2, color, 0.45 * alpha, pts);
  pass(w, ARC_CORE, 0.95 * alpha, pts);
  for (let f = 0; f < forks; f++) {
    const i = 1 + Math.floor(hash01(seed * 7.3 + f * 19.1) * (pts.length - 2));
    const a = Math.atan2(by - ay, bx - ax) + (hash01(seed * 3.9 + f) - 0.5) * 1.8;
    const fl = len * (0.12 + hash01(seed + f * 5.5) * 0.18);
    const p0 = pts[i];
    const mid = { x: p0.x + Math.cos(a) * fl * 0.5 + nx * (hash01(seed + f * 2.2) - 0.5) * 8, y: p0.y + Math.sin(a) * fl * 0.5 + ny * (hash01(seed + f * 4.4) - 0.5) * 8 };
    const end = { x: p0.x + Math.cos(a) * fl, y: p0.y + Math.sin(a) * fl };
    pass(w * 1.6, color, 0.3 * alpha, [p0, mid, end]);
    pass(Math.max(0.8, w * 0.6), ARC_CORE, 0.8 * alpha, [p0, mid, end]);
  }
}

/** A spark burst: short bright rays round a point (a struck terminal, a shorted pair). */
export function sparks(g: G, x: number, y: number, r: number, seed: number, color: number = VOLT, alpha = 1): void {
  g.fillStyle(color, 0.16 * alpha); g.fillCircle(x, y, r * 0.9);
  for (let i = 0; i < 7; i++) {
    const a = hash01(seed + i * 1.37) * Math.PI * 2;
    const l = r * (0.5 + hash01(seed * 2.1 + i) * 0.6);
    g.lineStyle(1.6, i % 2 ? ARC_CORE : color, 0.9 * alpha);
    g.lineBetween(x + Math.cos(a) * r * 0.15, y + Math.sin(a) * r * 0.15, x + Math.cos(a) * l, y + Math.sin(a) * l);
  }
  g.fillStyle(ARC_CORE, alpha); g.fillCircle(x, y, Math.max(1.5, r * 0.14));
}

// ── Leyden jars ───────────────────────────────────────────────────────

/**
 * A Leyden jar as tall as a man: a glass cylinder (seen a little from above) foiled in copper to
 * half its height, a brass rod up through a black-glass stopper to a ball terminal, and the
 * charge inside as storm-light that rises with `charge` 0–1. `x, y` is the foot; `s` scale
 * (1 ≈ 44 wide, 110 tall). `tint` recolours the charge (a decree's owner colour).
 */
export function leydenJar(g: G, x: number, y: number, s: number, charge: number, t: number, tint: number = VOLT): void {
  const w = 44 * s, h = 92 * s, rx = w / 2, ry = 8 * s;
  const top = y - h;
  g.fillStyle(0x000000, 0.4); g.fillEllipse(x + 4 * s, y + 3 * s, w * 1.3, ry * 2.4);
  // The back wall of the glass, then the charge inside it.
  g.fillStyle(OBS.glass, 0.92); g.fillRect(x - rx, top, w, h);
  g.fillStyle(OBS.glass, 0.92); g.fillEllipse(x, y, w, ry * 2);
  const ch = Math.max(0, Math.min(1, charge));
  if (ch > 0) {
    const fillTop = y - h * 0.94 * ch;
    g.fillStyle(tint, 0.12 + ch * 0.12); g.fillRect(x - rx + 3 * s, fillTop, w - 6 * s, y - fillTop);
    g.fillStyle(tint, 0.25 + ch * 0.25); g.fillEllipse(x, fillTop, w - 6 * s, ry * 1.6);
    // A few slow sparks rising through it.
    for (let i = 0; i < 4; i++) {
      const ph = (t * (0.35 + i * 0.13) + i * 0.27) % 1;
      const sy = y - ph * (y - fillTop);
      g.fillStyle(lit(tint, 0.5), 0.7 * (1 - ph)); g.fillCircle(x - rx * 0.6 + ((i * 37) % 10) / 10 * w * 0.8, sy, 1.6 * s);
    }
    // The core crackle — a short live arc through the middle when it is well charged.
    if (ch > 0.55) bolt(g, x, y - 8 * s, x + Math.sin(t * 9) * 4 * s, fillTop + 4 * s, Math.floor(t * 20) + x, 1.1 * s, tint, ch);
  }
  // Copper foil sleeve on the lower half, banded.
  const foilTop = y - h * 0.5;
  g.fillStyle(COPPER_DARK, 0.95); g.fillRect(x - rx, foilTop, w, y - foilTop);
  g.fillStyle(COPPER, 0.95); g.fillRect(x - rx + w * 0.18, foilTop, w * 0.42, y - foilTop);
  g.fillStyle(COPPER_LIT, 0.7); g.fillRect(x - rx + w * 0.24, foilTop, w * 0.08, y - foilTop);
  g.fillStyle(COPPER_DARK, 1); g.fillEllipse(x, foilTop, w, ry * 2);
  g.lineStyle(1, COPPER_LIT, 0.6); g.strokeEllipse(x, foilTop, w, ry * 2);
  g.fillStyle(COPPER, 1); g.fillEllipse(x, y, w, ry * 2);
  // Glass edges and a long highlight.
  g.lineStyle(1.2, OBS.edge, 0.7);
  g.lineBetween(x - rx, top, x - rx, y); g.lineBetween(x + rx, top, x + rx, y);
  g.fillStyle(0xffffff, 0.12); g.fillRect(x + rx * 0.45, top + 6 * s, 3 * s, h - 14 * s);
  // The rim and the stopper.
  g.fillStyle(OBS.facet, 1); g.fillEllipse(x, top, w, ry * 2);
  g.lineStyle(1.2, OBS.edge, 0.8); g.strokeEllipse(x, top, w, ry * 2);
  g.fillStyle(OBS.glass, 1); g.fillEllipse(x, top - 2 * s, w * 0.62, ry * 1.3);
  g.fillStyle(OBS.sheen, 1); g.fillEllipse(x - 2 * s, top - 3 * s, w * 0.4, ry * 0.7);
  // Brass rod, chain down into the jar, ball terminal.
  g.lineStyle(3 * s, BRASS_DARK, 1); g.lineBetween(x, top - 2 * s, x, top - 22 * s);
  g.lineStyle(1.5 * s, BRASS, 1); g.lineBetween(x - 0.8 * s, top - 2 * s, x - 0.8 * s, top - 22 * s);
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, top - 26 * s, 6.5 * s);
  g.fillStyle(BRASS, 1); g.fillCircle(x - 1 * s, top - 27 * s, 5.2 * s);
  g.fillStyle(0xfff0c0, 0.85); g.fillCircle(x - 2.5 * s, top - 29 * s, 1.8 * s);
  if (ch > 0.85) {
    g.fillStyle(tint, 0.18); g.fillCircle(x, top - 26 * s, 14 * s);
    sparks(g, x, top - 26 * s, 12 * s, Math.floor(t * 12) + x * 0.1, tint, 0.8);
  }
}

// ── Cables ────────────────────────────────────────────────────────────

/**
 * A cable as thick as a tree, running along `pts`: black insulation with a soft top light,
 * copper bands every so often (the Grid's splice-collars) and, if `pulse` is given (seconds),
 * packets of storm-light running along it.
 */
export function cable(g: G, pts: { x: number; y: number }[], w: number, pulse?: number, color: number = VOLT): void {
  if (pts.length < 2) return;
  const path = (width: number, c: number, a: number, dx = 0, dy = 0) => {
    g.lineStyle(width, c, a);
    g.beginPath(); g.moveTo(pts[0].x + dx, pts[0].y + dy);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x + dx, pts[i].y + dy);
    g.strokePath();
  };
  /** A hairline `w` (< 4) means "only the current": the caller drew the cable already. */
  const bodyless = w < 4;
  if (bodyless) w = 30;
  if (!bodyless) {
    path(w + 6, 0x000000, 0.35, 3, 5);
    path(w, RUBBER, 1);
    path(w * 0.5, 0x2a2232, 1, -w * 0.12, -w * 0.12);
    path(Math.max(1, w * 0.12), OBS.edge, 0.35, -w * 0.3, -w * 0.3);
  }
  // Splice collars and current packets, walked along the polyline.
  let total = 0;
  const segs: { a: { x: number; y: number }; b: { x: number; y: number }; l: number }[] = [];
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    segs.push({ a: pts[i - 1], b: pts[i], l });
    total += l;
  }
  const at = (d: number): { x: number; y: number; a: number } => {
    let left = d;
    for (const s of segs) {
      if (left <= s.l) { const k = left / (s.l || 1); return { x: s.a.x + (s.b.x - s.a.x) * k, y: s.a.y + (s.b.y - s.a.y) * k, a: Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x) }; }
      left -= s.l;
    }
    const s = segs[segs.length - 1];
    return { x: s.b.x, y: s.b.y, a: Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x) };
  };
  for (let d = w * 2; !bodyless && d < total - w; d += w * 4.5) {
    const p = at(d);
    const nx = -Math.sin(p.a) * w * 0.58, ny = Math.cos(p.a) * w * 0.58;
    const tx = Math.cos(p.a) * w * 0.22, ty = Math.sin(p.a) * w * 0.22;
    g.fillStyle(COPPER_DARK, 1);
    g.fillPoints([P(p.x + nx - tx, p.y + ny - ty), P(p.x + nx + tx, p.y + ny + ty), P(p.x - nx + tx, p.y - ny + ty), P(p.x - nx - tx, p.y - ny - ty)], true);
    g.lineStyle(1, COPPER_LIT, 0.7); g.lineBetween(p.x + nx - tx * 0.4, p.y + ny - ty * 0.4, p.x - nx - tx * 0.4, p.y - ny - ty * 0.4);
  }
  if (pulse !== undefined) {
    for (let k = 0; k < 3; k++) {
      const d = ((pulse * 260 + k * total / 3) % total);
      const p = at(d);
      g.fillStyle(color, 0.14); g.fillCircle(p.x, p.y, w * 0.9);
      g.fillStyle(color, 0.55); g.fillCircle(p.x, p.y, w * 0.32);
      g.fillStyle(ARC_CORE, 0.9); g.fillCircle(p.x, p.y, w * 0.14);
    }
  }
}

// ── The Meter ─────────────────────────────────────────────────────────

/**
 * THE METER — the dial that counted the Draw. A half-round gauge of black glass in a brass
 * bezel the size of a house front: a scale of storm-yellow ticks sweeping up to a red-gold stop,
 * the stop pin, and a needle like a lance pinned hard against it and trembling. A council mask is
 * set in the crest. `x, y` is the needle's pivot; `r` the dial radius; `needle` 0–1 along the
 * scale (1 = pinned at the stop); `t` seconds.
 */
export function meterDial(g: G, x: number, y: number, r: number, needle: number, t: number, o: { mask?: boolean; tremble?: number } = {}): void {
  const A0 = Math.PI * 1.08, A1 = Math.PI * 1.92;
  // The housing: a stepped obsidian plinth under a half-disc.
  g.fillStyle(0x000000, 0.4); g.fillEllipse(x, y + r * 0.2, r * 2.5, r * 0.3);
  g.fillStyle(OBS.glass, 1);
  g.beginPath(); g.arc(x, y, r * 1.12, Math.PI, Math.PI * 2, false); g.closePath(); g.fillPath();
  g.fillStyle(OBS.facet, 1);
  g.beginPath(); g.arc(x, y, r * 1.12, Math.PI * 1.5, Math.PI * 2, false); g.lineTo(x, y); g.closePath(); g.fillPath();
  // Brass bezel: two rings and rivets.
  g.lineStyle(r * 0.07, BRASS_DARK, 1); g.beginPath(); g.arc(x, y, r * 1.05, Math.PI, Math.PI * 2, false); g.strokePath();
  g.lineStyle(r * 0.035, BRASS, 1); g.beginPath(); g.arc(x, y, r * 1.06, Math.PI, Math.PI * 2, false); g.strokePath();
  g.lineStyle(1, 0xfff0c0, 0.5); g.beginPath(); g.arc(x, y, r * 1.085, Math.PI * 1.1, Math.PI * 1.6, false); g.strokePath();
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI + (i / 16) * Math.PI;
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 1.05, r * 0.018 + 1);
    g.fillStyle(0xfff0c0, 0.6); g.fillCircle(x + Math.cos(a) * r * 1.05 - 0.6, y + Math.sin(a) * r * 1.05 - 0.6, r * 0.007 + 0.5);
  }
  // The face: black glass, a faint violet sheen and a starburst of hairline seams.
  g.fillStyle(0x07050c, 1); g.beginPath(); g.arc(x, y, r * 0.98, Math.PI, Math.PI * 2, false); g.closePath(); g.fillPath();
  g.fillStyle(OBS.sheen, 0.18);
  g.beginPath(); g.moveTo(x, y); g.arc(x, y, r * 0.98, Math.PI * 1.15, Math.PI * 1.38, false); g.closePath(); g.fillPath();
  // The red-gold band before the stop — where every household ended.
  g.lineStyle(r * 0.09, 0x8a1a10, 0.85); g.beginPath(); g.arc(x, y, r * 0.8, A1 - 0.2, A1, false); g.strokePath();
  g.lineStyle(r * 0.03, OBS.starDeep, 0.9); g.beginPath(); g.arc(x, y, r * 0.76, A1 - 0.2, A1, false); g.strokePath();
  // The scale: a long sweep of ticks, every fifth long, every tenth with a lamp.
  g.lineStyle(r * 0.012 + 0.6, VOLT, 0.5); g.beginPath(); g.arc(x, y, r * 0.86, A0, A1, false); g.strokePath();
  for (let i = 0; i <= 50; i++) {
    const a = A0 + (i / 50) * (A1 - A0);
    const long = i % 5 === 0;
    const r0 = r * (long ? 0.72 : 0.8), r1 = r * 0.88;
    const hot = i >= 44;
    g.lineStyle(long ? 2 : 1, hot ? 0xff7a3a : VOLT, long ? 0.95 : 0.6);
    g.lineBetween(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    if (i % 10 === 0) {
      const lx = x + Math.cos(a) * r * 0.64, ly = y + Math.sin(a) * r * 0.64;
      g.fillStyle(hot ? 0xff7a3a : VOLT, 0.18); g.fillCircle(lx, ly, r * 0.05);
      g.fillStyle(hot ? 0xffb07a : VOLT_LIT, 0.9); g.fillCircle(lx, ly, r * 0.018 + 1);
    }
  }
  // Ledger notches round the inner ring: one for every household it counted.
  g.lineStyle(1, OBS.edge, 0.25);
  for (let i = 0; i < 90; i++) {
    const a = A0 + (i / 90) * (A1 - A0);
    g.lineBetween(x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42, x + Math.cos(a) * r * 0.46, y + Math.sin(a) * r * 0.46);
  }
  // The stop pin — a brass peg the needle has been leaning on for a hundred years.
  const sx = x + Math.cos(A1 + 0.02) * r * 0.82, sy = y + Math.sin(A1 + 0.02) * r * 0.82;
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(sx, sy, r * 0.04 + 1.5);
  g.fillStyle(BRASS, 1); g.fillCircle(sx - 0.8, sy - 0.8, r * 0.028 + 1);
  // The needle: a lance of black glass edged in yellow, pinned and trembling.
  const tremble = (o.tremble ?? 1) * (needle > 0.97 ? 0.012 : 0.004);
  const na = A0 + Math.max(0, Math.min(1, needle)) * (A1 - A0) + Math.sin(t * 31) * tremble + Math.sin(t * 13.3) * tremble * 0.6;
  const tipX = x + Math.cos(na) * r * 0.9, tipY = y + Math.sin(na) * r * 0.9;
  const tailX = x - Math.cos(na) * r * 0.16, tailY = y - Math.sin(na) * r * 0.16;
  const px = -Math.sin(na) * r * 0.035, py = Math.cos(na) * r * 0.035;
  g.fillStyle(0x000000, 0.4);
  g.fillTriangle(tailX + px + 4, tailY + py + 5, tailX - px + 4, tailY - py + 5, tipX + 4, tipY + 5);
  g.fillStyle(OBS.glass, 1); g.fillTriangle(tailX + px, tailY + py, tailX - px, tailY - py, tipX, tipY);
  g.fillStyle(OBS.sheen, 1); g.fillTriangle(tailX + px, tailY + py, x, y, tipX, tipY);
  g.lineStyle(1.4, VOLT, 0.9); g.lineBetween(tailX + px, tailY + py, tipX, tipY);
  g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(tailX - px, tailY - py, tipX, tipY);
  if (needle > 0.97) {
    // Pinned: it is arcing against the stop.
    sparks(g, tipX, tipY, r * 0.09 + 6, Math.floor(t * 14), VOLT, 0.7 + 0.3 * Math.sin(t * 17));
  }
  // The hub: brass boss over a black-glass cap with the King's violet in the middle.
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, r * 0.085 + 3);
  g.fillStyle(BRASS, 1); g.fillCircle(x - 1, y - 1, r * 0.07 + 2);
  g.fillStyle(OBS.glass, 1); g.fillCircle(x, y, r * 0.045 + 1.5);
  g.fillStyle(OBS.seamLit, 0.9); g.fillCircle(x, y, r * 0.016 + 1);
  // Base rim of the housing.
  g.fillStyle(OBS.sheen, 1); g.fillRect(x - r * 1.14, y - 2, r * 2.28, 5);
  g.lineStyle(1, OBS.edge, 0.7); g.lineBetween(x - r * 1.14, y - 2, x + r * 1.14, y - 2);
  if (o.mask !== false) councilMask(g, x, y - r * 1.2, r * 0.13 + 4, { slit: VOLT, glow: 1 });
}

// ── Arcs in the walls ─────────────────────────────────────────────────

/** Arcs crawling *inside* a pane of black glass: faint, slow, never leaving it. `t` seconds. */
export function glassArcs(g: G, x: number, y: number, w: number, h: number, t: number, seed: number, n = 2): void {
  for (let i = 0; i < n; i++) {
    const cyc = 2.6 + hash01(seed + i) * 2.2;
    const ph = ((t + hash01(seed * 3 + i) * cyc) % cyc) / cyc;
    if (ph > 0.55) continue;
    const k = Math.sin((ph / 0.55) * Math.PI);
    const ax = x + hash01(seed + i * 9.1 + Math.floor(t / cyc)) * w;
    const ay = y + hash01(seed + i * 4.7 + Math.floor(t / cyc)) * h * 0.4;
    const bx = x + hash01(seed + i * 2.3 + Math.floor(t / cyc) + 1) * w;
    const by = y + h * 0.55 + hash01(seed + i * 6.1 + Math.floor(t / cyc)) * h * 0.45;
    bolt(g, ax, ay, bx, by, Math.floor(t * 16) + i * 31 + seed, 1, VOLT, 0.35 + k * 0.4, 1);
  }
}

// ── Seats ─────────────────────────────────────────────────────────────

/** The six glyphs inlaid in the seat-backs, one per court element. */
export type SeatGlyph = 'electricity' | 'technology' | 'magnet' | 'radiation' | 'rubber' | 'quantum';

/** Draws one element glyph in storm-yellow inlay at (x, y), size `s` (≈ radius). */
export function glyph(g: G, kind: SeatGlyph, x: number, y: number, s: number, color: number = VOLT, a = 1): void {
  g.fillStyle(color, 0.12 * a); g.fillCircle(x, y, s * 1.4);
  g.lineStyle(Math.max(1.2, s * 0.16), color, a);
  switch (kind) {
    case 'electricity': {
      g.fillStyle(color, a);
      g.fillPoints([P(x + s * 0.2, y - s), P(x - s * 0.55, y + s * 0.12), P(x - s * 0.02, y + s * 0.12), P(x - s * 0.25, y + s), P(x + s * 0.55, y - s * 0.18), P(x + s * 0.04, y - s * 0.18)], true);
      break;
    }
    case 'technology': {
      g.strokeRect(x - s * 0.55, y - s * 0.55, s * 1.1, s * 1.1);
      for (let i = -1; i <= 1; i++) {
        g.lineBetween(x + i * s * 0.32, y - s * 0.55, x + i * s * 0.32, y - s * 0.9);
        g.lineBetween(x + i * s * 0.32, y + s * 0.55, x + i * s * 0.32, y + s * 0.9);
        g.lineBetween(x - s * 0.55, y + i * s * 0.32, x - s * 0.9, y + i * s * 0.32);
        g.lineBetween(x + s * 0.55, y + i * s * 0.32, x + s * 0.9, y + i * s * 0.32);
      }
      g.fillStyle(color, a); g.fillTriangle(x - s * 0.25, y + s * 0.22, x + s * 0.25, y + s * 0.22, x, y - s * 0.25);
      break;
    }
    case 'magnet': {
      g.beginPath(); g.arc(x, y - s * 0.1, s * 0.6, Math.PI, 0, false); g.strokePath();
      g.lineBetween(x - s * 0.6, y - s * 0.1, x - s * 0.6, y + s * 0.8);
      g.lineBetween(x + s * 0.6, y - s * 0.1, x + s * 0.6, y + s * 0.8);
      g.fillStyle(color, a); g.fillRect(x - s * 0.78, y + s * 0.55, s * 0.36, s * 0.3); g.fillRect(x + s * 0.42, y + s * 0.55, s * 0.36, s * 0.3);
      break;
    }
    case 'radiation': {
      g.fillStyle(color, a);
      g.fillCircle(x, y, s * 0.16);
      for (let i = 0; i < 3; i++) {
        const a0 = -Math.PI / 2 + (i * Math.PI * 2) / 3 - 0.5;
        g.beginPath(); g.moveTo(x + Math.cos(a0) * s * 0.28, y + Math.sin(a0) * s * 0.28);
        g.arc(x, y, s * 0.9, a0, a0 + 1, false);
        g.arc(x, y, s * 0.28, a0 + 1, a0, true);
        g.closePath(); g.fillPath();
      }
      break;
    }
    case 'rubber': {
      g.strokeCircle(x, y, s * 0.62);
      g.beginPath(); g.arc(x, y, s * 0.62, -0.4, 0.4, false); g.strokePath();
      g.lineBetween(x - s * 0.62, y, x - s * 0.95, y - s * 0.55);
      g.lineBetween(x + s * 0.62, y, x + s * 0.95, y - s * 0.55);
      g.fillStyle(color, a); g.fillCircle(x - s * 0.18, y - s * 0.2, s * 0.14);
      break;
    }
    case 'quantum': {
      g.strokeEllipse(x, y, s * 1.8, s * 0.6);
      const r = s * 0.9;
      for (const rot of [Math.PI / 3, -Math.PI / 3]) {
        g.beginPath();
        for (let i = 0; i <= 24; i++) {
          const th = (i / 24) * Math.PI * 2;
          const ex = Math.cos(th) * r, ey = Math.sin(th) * r * 0.33;
          const px = x + ex * Math.cos(rot) - ey * Math.sin(rot), py = y + ex * Math.sin(rot) + ey * Math.cos(rot);
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
      }
      g.fillStyle(color, a); g.fillCircle(x, y, s * 0.18);
      break;
    }
  }
}

/**
 * A councilor's seat: a tall chair of black glass on a stepped plinth — a high split back with
 * the seat's glyph inlaid in storm-yellow, arms of dressed obsidian, a copper conductor-spike on
 * the crest arcing faintly to nothing. `x, y` the plinth's front foot; `s` scale (1 ≈ 120 wide,
 * 250 tall). `empty` once the councilor is unseated (the glyph goes dark, the spike stops).
 */
export function seatChair(g: G, x: number, y: number, s: number, kind: SeatGlyph, rng: () => number): void {
  g.fillStyle(0x000000, 0.45); g.fillEllipse(x, y + 4 * s, 150 * s, 28 * s);
  // Plinth: three steps.
  slab(g, x, y, 132 * s, 18 * s, rng, 1);
  slab(g, x, y - 18 * s, 112 * s, 16 * s);
  slab(g, x, y - 34 * s, 94 * s, 14 * s);
  const base = y - 48 * s;
  // The back: two leaning shards split by a lit seam, a crest shard between.
  shard(g, x - 26 * s, base - 36 * s, 46 * s, 170 * s, -8 * s, 0.18);
  shard(g, x + 26 * s, base - 36 * s, 46 * s, 176 * s, 8 * s, 0.28);
  shard(g, x, base - 40 * s, 30 * s, 200 * s, 0, 0.4);
  seam(g, [{ x: x - 1 * s, y: base - 48 * s }, { x: x + 3 * s, y: base - 100 * s }, { x: x - 2 * s, y: base - 150 * s }, { x, y: base - 196 * s }], 1.4 * s, 0.75, 0.3);
  // Inlay roundel for the glyph.
  const gy = base - 108 * s;
  g.fillStyle(OBS.glass, 1); g.fillCircle(x, gy, 20 * s);
  g.lineStyle(2 * s, COPPER, 0.9); g.strokeCircle(x, gy, 20 * s);
  g.lineStyle(1, COPPER_LIT, 0.6); g.strokeCircle(x, gy, 17 * s);
  glyph(g, kind, x, gy, 11 * s, VOLT, 0.95);
  // Seat block and arms.
  slab(g, x, base, 84 * s, 30 * s);
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 38 * s, base - 70 * s, 76 * s, 40 * s);
  g.fillStyle(OBS.facet, 0.85); g.fillTriangle(x - 38 * s, base - 70 * s, x + 8 * s, base - 70 * s, x - 38 * s, base - 34 * s);
  g.lineStyle(1, OBS.edge, 0.45); g.strokeRect(x - 38 * s, base - 70 * s, 76 * s, 40 * s);
  slab(g, x - 48 * s, base, 22 * s, 54 * s);
  slab(g, x + 48 * s, base, 22 * s, 54 * s);
  // Copper conductor spike up from the crest.
  const cx = x, cy = base - 238 * s;
  g.lineStyle(3 * s, COPPER_DARK, 1); g.lineBetween(cx, base - 196 * s, cx, cy);
  g.lineStyle(1.4 * s, COPPER_LIT, 0.9); g.lineBetween(cx - 1 * s, base - 196 * s, cx - 1 * s, cy);
  g.fillStyle(COPPER, 1); g.fillCircle(cx, cy, 4 * s);
}

// ── Decree props ──────────────────────────────────────────────────────

/**
 * An induction coil seen from above: a fat torus of copper winding round a glowing bore.
 * `charge` 0–1 lights the bore and runs the winding; `spin` (radians) turns the winding pattern.
 */
export function inductionCoil(g: G, x: number, y: number, r: number, charge: number, spin: number, tint: number = VOLT): void {
  const thick = r * 0.42;
  g.fillStyle(0x000000, 0.4); g.fillEllipse(x + 4, y + 6, r * 2.3, r * 2.1);
  g.fillStyle(COPPER_DARK, 1); g.fillCircle(x, y, r + thick * 0.5);
  // Windings: alternating copper strands radiating across the torus.
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a = spin + (i / n) * Math.PI * 2;
    const r0 = r - thick * 0.5, r1 = r + thick * 0.5;
    g.lineStyle(r * 0.09, i % 2 ? COPPER : mixC(COPPER, COPPER_LIT, 0.4), 1);
    g.lineBetween(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a + 0.05) * r1, y + Math.sin(a + 0.05) * r1);
  }
  g.lineStyle(2, COPPER_LIT, 0.55); g.beginPath(); g.arc(x, y, r + thick * 0.3, Math.PI * 1.05, Math.PI * 1.6, false); g.strokePath();
  g.lineStyle(1.2, 0x000000, 0.5); g.strokeCircle(x, y, r + thick * 0.5);
  // The bore: black glass, then the field.
  g.fillStyle(OBS.glass, 1); g.fillCircle(x, y, r - thick * 0.5);
  g.lineStyle(1, OBS.edge, 0.6); g.strokeCircle(x, y, r - thick * 0.5);
  if (charge > 0) {
    g.fillStyle(tint, 0.08 + charge * 0.18); g.fillCircle(x, y, r - thick * 0.5);
    for (let i = 0; i < 3; i++) {
      g.lineStyle(1.2, tint, (0.2 + charge * 0.5) * (1 - i * 0.25));
      g.strokeCircle(x, y, (r - thick * 0.5) * (0.35 + 0.25 * i + 0.08 * Math.sin(spin * 3 + i)));
    }
    g.fillStyle(lit(tint, 0.4), 0.3 + charge * 0.6); g.fillCircle(x, y, 3 + charge * 3);
  }
}

/**
 * A pinball bumper of black rubber in a copper skirt with a glass cap — lit in `litColor` (or dark
 * when null). `pop` 0–1 is the flash of a fresh bounce.
 */
export function bumper(g: G, x: number, y: number, r: number, litColor: number | null, pop: number, t: number): void {
  g.fillStyle(0x000000, 0.45); g.fillEllipse(x + 3, y + r * 0.55, r * 2.3, r * 0.9);
  // Skirt.
  g.fillStyle(COPPER_DARK, 1); g.fillCircle(x, y + 4, r + 6);
  g.fillStyle(COPPER, 1); g.fillCircle(x, y + 2, r + 4);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.fillStyle(COPPER_LIT, 0.8); g.fillCircle(x + Math.cos(a) * (r + 2), y + 2 + Math.sin(a) * (r + 2), 1.4);
  }
  // The rubber ring, bulged on a pop.
  const rr = r * (1 + pop * 0.12);
  g.fillStyle(RUBBER, 1); g.fillCircle(x, y, rr);
  g.lineStyle(r * 0.18, 0x2a2232, 1); g.strokeCircle(x, y, rr * 0.86);
  // Glass cap.
  const c = litColor ?? OBS.facet;
  g.fillStyle(litColor ? dim(c, 0.4) : OBS.glass, 1); g.fillCircle(x, y - 3, r * 0.66);
  if (litColor) {
    g.fillStyle(c, 0.25 + 0.15 * Math.sin(t * 6)); g.fillCircle(x, y - 3, r * 1.25);
    g.fillStyle(c, 0.85); g.fillCircle(x, y - 3, r * 0.5);
    g.fillStyle(0xffffff, 0.8); g.fillCircle(x, y - 3, r * 0.2);
  }
  g.fillStyle(0xffffff, 0.35); g.fillEllipse(x - r * 0.24, y - r * 0.32, r * 0.32, r * 0.16);
  g.lineStyle(1.2, OBS.edge, 0.7); g.strokeCircle(x, y - 3, r * 0.66);
  if (pop > 0) {
    g.lineStyle(3, litColor ?? VOLT, pop); g.strokeCircle(x, y, r + 10 + (1 - pop) * 26);
  }
}

/** The radiation trefoil, flat on the floor or a sign — `color` fill on a black disc. */
export function trefoil(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  g.fillStyle(0x0a0a06, a); g.fillCircle(x, y, r);
  g.lineStyle(Math.max(1, r * 0.08), color, a); g.strokeCircle(x, y, r * 0.96);
  glyph(g, 'radiation', x, y, r * 0.82, color, a);
}

export { mixC, lit, dim };
