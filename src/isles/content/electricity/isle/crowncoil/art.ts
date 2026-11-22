import { type G, dim, glow, lit, mixC, shadow } from '../../../../art/IsleArt';

/**
 * Shared drawing for the Crown Coil — Empress Ohmrine's tower of copper rings on the summit of
 * Voltreach. Copper windings gone green at the seams, porcelain insulators, Leyden jars as tall
 * as houses, treadwheels with the earthed walking inside them, Faraday cages on chains, brass
 * meters, and lightning — always lightning — drawn as a jagged, forking, flickering line.
 */

// ── Palette ──────────────────────────────────────────────────────────

export const COPPER = 0xc87a3a;
export const COPPER_LIT = 0xf2b277;
export const COPPER_DARK = 0x5e3214;
export const PATINA = 0x4aa08a;
export const PATINA_DARK = 0x1e4a40;
export const IRON = 0x262a32;
export const IRON_LIT = 0x4c5462;
export const IRON_DARK = 0x111318;
export const GLASS = 0x9ad8f0;
export const ARC = 0xa8e0ff;
export const ARC_CORE = 0xf4fbff;
export const STORM = 0x080c18;
export const BRASS = 0xd8b45a;
export const BRASS_DARK = 0x7a5a22;
export const AMBER = 0xffc85a;
export const PORCELAIN = 0xe6e2d4;
export const PORCELAIN_DARK = 0x9a968a;
export const FOIL = 0xc8ccd4;
export const WARN_RED = 0xff5a4a;
export const VIOLET = 0xb48aff;

/** Cheap deterministic jitter in [-1, 1] — the same seed draws the same bolt. */
const jit = (seed: number, i: number): number => {
  const s = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};

/**
 * A bolt of lightning from (x1,y1) to (x2,y2): a jagged path, a soft halo, a white core, and a
 * couple of short forks. Change `seed` every few frames to make it crawl.
 */
export function bolt(g: G, x1: number, y1: number, x2: number, y2: number, seed: number, color = ARC, width = 3, alpha = 1, jag = 0.16, forks = 2): void {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const nx = -dy / len, ny = dx / len;
  const n = Math.max(3, Math.min(14, Math.round(len / 26)));
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const off = i === 0 || i === n ? 0 : jit(seed, i) * len * jag * Math.sin(f * Math.PI);
    pts.push({ x: x1 + dx * f + nx * off, y: y1 + dy * f + ny * off });
  }
  const path = (w: number, c: number, a: number) => {
    g.lineStyle(w, c, a);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
  };
  path(width * 3.2, color, alpha * 0.18);
  path(width * 1.6, color, alpha * 0.6);
  path(Math.max(1, width * 0.6), ARC_CORE, alpha);
  for (let k = 0; k < forks; k++) {
    const i = 1 + Math.floor(((jit(seed, 40 + k) + 1) / 2) * (n - 1));
    const p = pts[Math.min(i, pts.length - 1)];
    const a = Math.atan2(dy, dx) + jit(seed, 60 + k) * 1.1;
    const fl = len * (0.12 + ((jit(seed, 80 + k) + 1) / 2) * 0.14);
    const mx = p.x + Math.cos(a) * fl * 0.5 + nx * jit(seed, 90 + k) * 8, my = p.y + Math.sin(a) * fl * 0.5 + ny * jit(seed, 91 + k) * 8;
    g.lineStyle(Math.max(1, width * 0.7), color, alpha * 0.7);
    g.lineBetween(p.x, p.y, mx, my);
    g.lineBetween(mx, my, p.x + Math.cos(a) * fl, p.y + Math.sin(a) * fl);
  }
}

/** A little star of crackle — a spark burst of short bolts round a point. */
export function crackle(g: G, x: number, y: number, r: number, seed: number, color = ARC, alpha = 1, n = 5): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + jit(seed, i) * 0.6;
    const l = r * (0.55 + (jit(seed, i + 9) + 1) * 0.25);
    const mx = x + Math.cos(a) * l * 0.5 + jit(seed, i + 20) * 4, my = y + Math.sin(a) * l * 0.5 + jit(seed, i + 21) * 4;
    g.lineStyle(1.6, color, alpha);
    g.lineBetween(x, y, mx, my);
    g.lineBetween(mx, my, x + Math.cos(a) * l, y + Math.sin(a) * l);
  }
  g.fillStyle(ARC_CORE, alpha * 0.9); g.fillCircle(x, y, Math.max(1.5, r * 0.12));
}

/** A stack of porcelain insulator skirts on a copper pin. x,y = base. */
export function insulator(g: G, x: number, y: number, s = 1): void {
  g.fillStyle(COPPER_DARK, 1); g.fillRect(x - 2 * s, y - 34 * s, 4 * s, 34 * s);
  for (let i = 0; i < 4; i++) {
    const yy = y - 6 * s - i * 8 * s;
    g.fillStyle(PORCELAIN_DARK, 1); g.fillEllipse(x, yy + 1.5 * s, 18 * s, 6 * s);
    g.fillStyle(PORCELAIN, 1); g.fillEllipse(x, yy, 18 * s, 5 * s);
    g.fillStyle(0xffffff, 0.7); g.fillEllipse(x - 4 * s, yy - 1 * s, 5 * s, 1.6 * s);
  }
  g.fillStyle(COPPER_LIT, 1); g.fillCircle(x, y - 38 * s, 3 * s);
}

/**
 * A Leyden jar as tall as a house: a glass bell with tin foil lining its lower half, a brass rod
 * up through a cork cap to a brass ball, and a ring of earthing chain at its foot. `charge` 0–1
 * fills it with a blue glow; past 0.85 the ball begins to crackle. x,y = base centre.
 */
export function leydenJar(g: G, x: number, y: number, s: number, charge: number, t: number): void {
  const w = 64 * s, h = 120 * s;
  shadow(g, x, y + 2, w * 1.2, 18 * s, 0.4);
  // Copper earthing plinth.
  g.fillStyle(COPPER_DARK, 1); g.fillRect(x - w * 0.62, y - 10 * s, w * 1.24, 10 * s);
  g.fillStyle(COPPER, 1); g.fillRect(x - w * 0.6, y - 12 * s, w * 1.2, 5 * s);
  for (let i = 0; i < 6; i++) { g.fillStyle(PATINA, 0.7); g.fillCircle(x - w * 0.5 + (i * w) / 5, y - 6 * s, 2 * s); }
  // The glass body: dark interior, foil lower half, charge glow.
  const top = y - 12 * s - h;
  g.fillStyle(0x0c1620, 1); g.fillRoundedRect(x - w / 2, top, w, h, 14 * s);
  g.fillStyle(FOIL, 1); g.fillRoundedRect(x - w / 2 + 3 * s, top + h * 0.48, w - 6 * s, h * 0.5, 10 * s);
  g.fillStyle(dim(FOIL, 0.3), 1);
  for (let i = 0; i < 5; i++) g.fillRect(x - w / 2 + 6 * s + i * (w - 12 * s) / 4, top + h * 0.5, 1.5 * s, h * 0.46);
  if (charge > 0.02) {
    g.fillStyle(ARC, 0.12 + charge * 0.4); g.fillRoundedRect(x - w / 2 + 4 * s, top + h * (1 - charge * 0.96), w - 8 * s, h * charge * 0.96, 10 * s);
    glow(g, x, top + h * 0.6, w * (0.6 + charge * 0.5), ARC, 0.025 + charge * 0.04, 3);
  }
  g.fillStyle(GLASS, 0.18); g.fillRoundedRect(x - w / 2, top, w, h, 14 * s);
  g.lineStyle(2 * s, GLASS, 0.75); g.strokeRoundedRect(x - w / 2, top, w, h, 14 * s);
  g.fillStyle(0xffffff, 0.35); g.fillRoundedRect(x - w / 2 + 7 * s, top + 10 * s, 6 * s, h * 0.7, 3 * s);
  // Cork cap, rod and ball.
  g.fillStyle(0x6a4a2a, 1); g.fillRect(x - w * 0.36, top - 8 * s, w * 0.72, 12 * s);
  g.fillStyle(0x8a6a3a, 1); g.fillRect(x - w * 0.36, top - 8 * s, w * 0.72, 3 * s);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 2.5 * s, top - 40 * s, 5 * s, 34 * s);
  g.fillStyle(BRASS, 1); g.fillCircle(x, top - 44 * s, 11 * s);
  g.fillStyle(lit(BRASS, 0.5), 1); g.fillCircle(x - 3.5 * s, top - 48 * s, 4 * s);
  // Chain from the rod down into the jar.
  g.lineStyle(1.2 * s, BRASS, 0.8);
  for (let i = 0; i < 7; i++) g.strokeEllipse(x + Math.sin(i) * 2 * s, top + i * 8 * s, 3 * s, 5 * s);
  if (charge > 0.85) crackle(g, x, top - 44 * s, 20 * s, Math.floor(t * 18), ARC, 0.9);
}

/** A lattice steel pylon with two crossarms and hanging insulators. x,y = base. */
export function pylon(g: G, x: number, y: number, s = 1, color = IRON_LIT): void {
  const h = 150 * s;
  shadow(g, x, y + 2, 60 * s, 14 * s);
  const legs = (k: number) => 26 * s * (1 - k * 0.82);
  g.lineStyle(3 * s, color, 1);
  g.lineBetween(x - legs(0), y, x - legs(1), y - h);
  g.lineBetween(x + legs(0), y, x + legs(1), y - h);
  g.lineStyle(1.5 * s, dim(color, 0.2), 1);
  for (let i = 0; i < 6; i++) {
    const k0 = i / 6, k1 = (i + 1) / 6;
    const y0 = y - h * k0, y1 = y - h * k1;
    g.lineBetween(x - legs(k0), y0, x + legs(k1), y1);
    g.lineBetween(x + legs(k0), y0, x - legs(k1), y1);
    g.lineBetween(x - legs(k1), y1, x + legs(k1), y1);
  }
  for (const [k, span] of [[0.72, 46], [0.9, 34]] as [number, number][]) {
    const yy = y - h * k;
    g.lineStyle(3 * s, color, 1); g.lineBetween(x - span * s, yy, x + span * s, yy);
    for (const sx of [-1, 1]) {
      g.fillStyle(PORCELAIN, 1); g.fillRect(x + sx * span * s - 2 * s, yy, 4 * s, 10 * s);
      g.fillStyle(PORCELAIN_DARK, 1); g.fillRect(x + sx * span * s - 3 * s, yy + 3 * s, 6 * s, 2 * s);
    }
  }
  g.fillStyle(WARN_RED, 1); g.fillCircle(x, y - h - 4 * s, 3 * s);
}

/**
 * A treadwheel seen side-on: an iron-shod wheel on an A-frame, `angle` turning its spokes, one of
 * the earthed walking inside it with their head bowed. A crank on the axle drives a dynamo box.
 * x,y = base centre.
 */
export function treadwheel(g: G, x: number, y: number, r: number, angle: number, skin: number, t: number, walker = true): void {
  const cy = y - r - 10;
  // A-frame.
  g.lineStyle(6, IRON_DARK, 1);
  g.lineBetween(x - r * 0.8, y, x, cy); g.lineBetween(x + r * 0.8, y, x, cy);
  g.lineStyle(4, IRON_LIT, 1);
  g.lineBetween(x - r * 0.8, y - 1, x, cy); g.lineBetween(x + r * 0.8, y - 1, x, cy);
  // Rim.
  g.lineStyle(9, dim(COPPER, 0.5), 1); g.strokeCircle(x, cy, r);
  g.lineStyle(5, COPPER, 1); g.strokeCircle(x, cy, r);
  g.lineStyle(1.5, COPPER_LIT, 0.8); g.strokeCircle(x, cy, r - 3);
  // Slats round the inside of the rim — the treads.
  for (let i = 0; i < 18; i++) {
    const a = angle + (i / 18) * Math.PI * 2;
    g.lineStyle(2, dim(COPPER, 0.3), 1);
    g.lineBetween(x + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4), x + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10));
  }
  // Spokes.
  for (let i = 0; i < 6; i++) {
    const a = angle + (i / 6) * Math.PI * 2;
    g.lineStyle(2.5, IRON_LIT, 0.85);
    g.lineBetween(x, cy, x + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6));
  }
  g.fillStyle(BRASS, 1); g.fillCircle(x, cy, 6);
  // The walker: at the bottom of the wheel, legs scissoring, head bowed, arms hanging.
  const fy = cy + r - 12;
  if (walker) {
  const step = Math.sin(t * 7 + x) * 6;
  g.lineStyle(3, 0x3a3440, 1);
  g.lineBetween(x, fy - 16, x - step, fy); g.lineBetween(x, fy - 16, x + step, fy);
  g.fillStyle(0x4a4450, 1); g.fillRoundedRect(x - 6, fy - 32, 12, 18, 4);
  g.lineStyle(2.5, skin, 1); g.lineBetween(x - 5, fy - 28, x - 7 + step * 0.3, fy - 16); g.lineBetween(x + 5, fy - 28, x + 7 - step * 0.3, fy - 16);
  g.fillStyle(skin, 1); g.fillCircle(x + 3, fy - 35, 5);
  // A brass earthing collar on their neck.
  g.lineStyle(1.5, BRASS, 1); g.strokeEllipse(x + 2, fy - 30, 10, 3);
  }
  // Crank arm and the dynamo box it turns.
  const ca = angle * 1.5;
  g.lineStyle(3, IRON_LIT, 1); g.lineBetween(x, cy, x + Math.cos(ca) * 14, cy + Math.sin(ca) * 14);
  g.fillStyle(IRON, 1); g.fillRect(x + r * 0.55, y - 22, 26, 22);
  g.lineStyle(1.5, COPPER, 1); g.strokeRect(x + r * 0.55, y - 22, 26, 22);
  for (let i = 0; i < 4; i++) { g.lineStyle(1, COPPER_LIT, 0.8); g.lineBetween(x + r * 0.55 + 4, y - 18 + i * 5, x + r * 0.55 + 22, y - 18 + i * 5); }
  g.fillStyle(AMBER, 0.6 + Math.sin(t * 9 + x) * 0.3); g.fillCircle(x + r * 0.55 + 13, y - 26, 3);
}

/** A brass meter dial: cream face, ticks, a red quota band, the needle at `k` 0–1. */
export function meterDial(g: G, x: number, y: number, r: number, k: number, alpha = 1): void {
  g.fillStyle(BRASS_DARK, alpha); g.fillCircle(x, y, r + 3);
  g.fillStyle(BRASS, alpha); g.fillCircle(x, y, r + 1);
  g.fillStyle(0xf2ead2, alpha); g.fillCircle(x, y, r - 2);
  const a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
  g.lineStyle(Math.max(2, r * 0.16), WARN_RED, alpha * 0.85);
  g.beginPath(); g.arc(x, y, r * 0.72, a0 + (a1 - a0) * 0.8, a1, false); g.strokePath();
  g.lineStyle(1, 0x3a2e1a, alpha);
  for (let i = 0; i <= 10; i++) {
    const a = a0 + ((a1 - a0) * i) / 10;
    const l = i % 5 === 0 ? 0.62 : 0.74;
    g.lineBetween(x + Math.cos(a) * r * l, y + Math.sin(a) * r * l, x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86);
  }
  const na = a0 + (a1 - a0) * Math.max(0, Math.min(1, k));
  g.lineStyle(Math.max(1.5, r * 0.09), 0x1a1410, alpha);
  g.lineBetween(x, y, x + Math.cos(na) * r * 0.8, y + Math.sin(na) * r * 0.8);
  g.fillStyle(0x1a1410, alpha); g.fillCircle(x, y, Math.max(2, r * 0.12));
  g.fillStyle(0xffffff, alpha * 0.35); g.fillEllipse(x - r * 0.3, y - r * 0.4, r * 0.6, r * 0.25);
}

/**
 * A Faraday cage: a box of copper bars with a mesh between them, hung on a chain. `lift` 0 =
 * standing on the floor, 1 = hauled up out of reach (drawn higher and smaller in shadow).
 * `live` lights arcs crawling along the bars. x,y = base centre of the footprint.
 */
export function faradayCage(g: G, x: number, y: number, w: number, h: number, lift: number, live: number, t: number, seed: number): void {
  const up = lift * 150;
  const fy = y - up;
  const ht = 70;
  // Footprint shadow on the floor grows dark and sharp as it comes down.
  g.fillStyle(0x000000, 0.12 + (1 - lift) * 0.28); g.fillRect(x - w / 2 * (0.8 + 0.2 * (1 - lift)), y - h / 2 * (0.8 + 0.2 * (1 - lift)), w * (0.8 + 0.2 * (1 - lift)), h * (0.8 + 0.2 * (1 - lift)));
  // The chain to the ceiling.
  g.lineStyle(2, IRON_LIT, 0.8); g.lineBetween(x, fy - h / 2 - ht, x, fy - h / 2 - ht - 400);
  const x0 = x - w / 2, x1 = x + w / 2, y0 = fy - h / 2, y1 = fy + h / 2;
  // Back top and front faces as a little box in oblique view: floor rect + roof rect raised by ht.
  const bar = (ax: number, ay: number, bx: number, by: number, wd = 3) => {
    g.lineStyle(wd + 2, COPPER_DARK, 0.95); g.lineBetween(ax, ay, bx, by);
    g.lineStyle(wd, mixC(COPPER, ARC, live * 0.6), 1); g.lineBetween(ax, ay, bx, by);
  };
  // Mesh on the roof.
  g.lineStyle(1, COPPER, 0.35);
  for (let i = 1; i < 8; i++) {
    const xx = x0 + (w * i) / 8;
    g.lineBetween(xx, y0 - ht, xx, y1 - ht);
  }
  for (let i = 1; i < 5; i++) {
    const yy = y0 - ht + (h * i) / 5;
    g.lineBetween(x0, yy, x1, yy);
  }
  // Vertical bars along front and sides.
  for (let i = 0; i <= 8; i++) {
    const xx = x0 + (w * i) / 8;
    bar(xx, y1, xx, y1 - ht, i % 4 === 0 ? 4 : 2);
  }
  for (let i = 1; i < 4; i++) {
    const yy = y0 + (h * i) / 4;
    bar(x0, yy, x0, yy - ht, 2); bar(x1, yy, x1, yy - ht, 2);
  }
  bar(x0, y1, x1, y1, 4); bar(x0, y1 - ht, x1, y1 - ht, 3);
  bar(x0, y0 - ht, x1, y0 - ht, 3); bar(x0, y0 - ht, x0, y1 - ht, 3); bar(x1, y0 - ht, x1, y1 - ht, 3);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y0 - ht + 2, 5);
  if (live > 0.05) {
    // Arcs crawling round the bars.
    const s = Math.floor(t * 14) + seed;
    const perim = [[x0, y1], [x1, y1], [x1, y1 - ht], [x0, y1 - ht]];
    for (let k = 0; k < 3; k++) {
      const f = ((t * 0.9 + k / 3 + seed * 0.13) % 1) * 4;
      const i = Math.floor(f);
      const a = perim[i % 4], b = perim[(i + 1) % 4];
      const fr = f - i;
      const px = a[0] + (b[0] - a[0]) * fr, py = a[1] + (b[1] - a[1]) * fr;
      crackle(g, px, py, 14, s + k * 7, ARC, live);
    }
    g.lineStyle(2, ARC, 0.3 * live); g.strokeRect(x0 - 2, y1 - ht - 2, w + 4, ht + 4);
  }
}

/**
 * Ohmrine's sign: an omega (the ohm) with a bolt struck down through its gap, inside a ring of
 * ten studs — one for every hour the Grid draws. It is on every meter on the isle.
 */
export function ohmSigil(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  g.lineStyle(Math.max(1.5, r * 0.08), color, a);
  g.strokeCircle(x, y, r);
  for (let i = 0; i < 10; i++) {
    const an = (i / 10) * Math.PI * 2 - Math.PI / 2;
    g.fillStyle(color, a); g.fillCircle(x + Math.cos(an) * r, y + Math.sin(an) * r, Math.max(1.2, r * 0.07));
  }
  g.lineStyle(Math.max(2, r * 0.14), color, a);
  g.beginPath(); g.arc(x, y - r * 0.08, r * 0.48, Math.PI * 0.72, Math.PI * 2.28, false); g.strokePath();
  const fx = Math.cos(Math.PI * 0.72) * r * 0.48;
  const fyy = y - r * 0.08 + Math.sin(Math.PI * 0.72) * r * 0.48;
  g.lineBetween(x + fx, fyy, x + fx - r * 0.2, fyy);
  g.lineBetween(x - fx, fyy, x - fx + r * 0.2, fyy);
  g.fillStyle(color, a);
  g.fillTriangle(x + r * 0.08, y - r * 0.72, x - r * 0.16, y + r * 0.06, x + r * 0.04, y + r * 0.02);
  g.fillTriangle(x + r * 0.04, y - r * 0.04, x + r * 0.16, y - r * 0.02, x - r * 0.1, y + r * 0.72);
}

/** A copper busbar: a fat flat conductor bolted to porcelain feet, patina at the bolts. */
export function busbar(g: G, x0: number, y: number, x1: number, h = 16): void {
  g.fillStyle(COPPER_DARK, 1); g.fillRect(x0, y - h / 2 + 2, x1 - x0, h);
  g.fillStyle(COPPER, 1); g.fillRect(x0, y - h / 2, x1 - x0, h - 3);
  g.fillStyle(COPPER_LIT, 0.8); g.fillRect(x0, y - h / 2, x1 - x0, 2.5);
  for (let x = x0 + 30; x < x1 - 10; x += 90) {
    g.fillStyle(PORCELAIN, 1); g.fillRect(x - 7, y + h / 2 - 1, 14, 6);
    g.fillStyle(PATINA, 0.9); g.fillCircle(x, y, 3.5);
    g.fillStyle(IRON_DARK, 1); g.fillCircle(x, y, 1.6);
  }
}

/** One turn of the great coil: a fat copper torus seen edge-on as an ellipse band. */
export function coilTurn(g: G, cx: number, cy: number, rx: number, ry: number, thick: number, front: boolean): void {
  // Phaser has no ellipse arc on a path, so the half-ellipse is walked as points.
  const seg = 28;
  const a0 = front ? 0 : Math.PI, a1 = front ? Math.PI : Math.PI * 2;
  for (const [w, c, al] of [[thick + 3, COPPER_DARK, 1], [thick, front ? COPPER : dim(COPPER, 0.35), 1], [Math.max(1, thick * 0.3), COPPER_LIT, front ? 0.8 : 0.2]] as [number, number, number][]) {
    g.lineStyle(w, c, al);
    g.beginPath();
    for (let i = 0; i <= seg; i++) {
      const a = a0 + ((a1 - a0) * i) / seg;
      const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry - (c === COPPER_LIT ? thick * 0.3 : 0);
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }
}

/**
 * One of the earthed: a figure in a grey Grid smock with a brass earthing collar, a number
 * stencilled on the back, shoulders down. Used for the cranking rows painted into the hall.
 */
export function earthedFigure(g: G, x: number, y: number, s: number, skin: number, t: number, crank = true): void {
  shadow(g, x, y + 1, 22 * s, 6 * s, 0.3);
  const bob = Math.sin(t * 5 + x * 0.1) * 1.5 * s;
  g.fillStyle(0x3a3a44, 1); g.fillRect(x - 5 * s, y - 14 * s, 4 * s, 14 * s); g.fillRect(x + 1 * s, y - 14 * s, 4 * s, 14 * s);
  g.fillStyle(0x5a5a66, 1); g.fillRoundedRect(x - 8 * s, y - 32 * s + bob, 16 * s, 20 * s, 4 * s);
  g.fillStyle(0x3a3a44, 1); g.fillRect(x - 3 * s, y - 26 * s + bob, 6 * s, 8 * s);
  g.fillStyle(skin, 1); g.fillCircle(x, y - 37 * s + bob, 5.5 * s);
  g.lineStyle(1.6 * s, BRASS, 1); g.strokeEllipse(x, y - 32 * s + bob, 11 * s, 3.5 * s);
  if (crank) {
    const a = t * 4 + x * 0.05;
    const hx = x + 12 * s + Math.cos(a) * 6 * s, hy = y - 22 * s + Math.sin(a) * 6 * s;
    g.lineStyle(2.4 * s, skin, 1); g.lineBetween(x + 6 * s, y - 28 * s + bob, hx, hy);
    g.fillStyle(IRON_LIT, 1); g.fillCircle(x + 12 * s, y - 22 * s, 2.5 * s);
    g.lineStyle(2 * s, IRON_LIT, 1); g.lineBetween(x + 12 * s, y - 22 * s, hx, hy);
  }
}
