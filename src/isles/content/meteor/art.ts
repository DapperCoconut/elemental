import Phaser from 'phaser';
import { dim, lit, mixC, mulberry } from '../../art/IsleArt';
import { OBS, crackPath, seam } from '../../art/PinnacleArt';
import { METEOR_AT } from './spec';

/**
 * Fallpoint's own brushes, shared by the area painter and the three cinematics.
 *
 * The rule of the palette: Fallpoint is SEA-GLASS — amber and bottle-green, the sea boiled and set
 * with everything that was in it (sand, shells, a ship's timbers, startled fish). It is never the
 * Pinnacle's black. The only black glass here is the thin new shell over the cinder, and that is
 * the King's colour. Three moods ride over it: sealed (cold violet), open (warm gold), the Fall
 * (ember red, beating like a pulse).
 */

export type G = Phaser.GameObjects.Graphics;
export const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

/** Sea-glass and night sea. */
export const FP = {
  amber: 0xc8862a,
  amberLit: 0xf0c070,
  amberDeep: 0x5a3410,
  bottle: 0x2f6a48,
  bottleLit: 0x7ac89a,
  bottleDeep: 0x10301e,
  /** The bowl floor: the two glasses run together and darkened by the heat. */
  bowl: 0x1e2a1c,
  bowlDeep: 0x121812,
  sand: 0xb09a6a,
  timber: 0x4a3222,
  sea: 0x050b18,
  seaLit: 0x1a2c4a,
  foam: 0xc8d4e0,
  /** The King's shell. */
  shell: 0x0c0a12,
} as const;

/** The three moods' light: keyhole, crack and wash colour. */
export const MOOD = {
  sealed: { light: 0x9a88d8, core: 0xd8d0ff, wash: 0x5a4a9a },
  open: { light: 0xffc060, core: 0xfff0c8, wash: 0xffa040 },
  fall: { light: 0xff4a2a, core: 0xffb080, wash: 0xc8200a },
} as const;
export type Mood = keyof typeof MOOD;

// ── The ring's geometry (world coords) ───────────────────────────────

/** The reef's centre and its two ellipses: the sea's edge (outer) and the lip of the bowl (inner). */
export const RING_C = { x: 900, y: 720 };
export const OUTER = { rx: 830, ry: 620 };
export const INNER = { rx: 690, ry: 470 };

/** A point on the rim at angle `a` (screen radians, 0 = east, π/2 = south), `f` 0 inner lip … 1 sea edge. */
export function rimPt(a: number, f: number): { x: number; y: number } {
  const rx = INNER.rx + (OUTER.rx - INNER.rx) * f;
  const ry = INNER.ry + (OUTER.ry - INNER.ry) * f;
  return { x: RING_C.x + Math.cos(a) * rx, y: RING_C.y + Math.sin(a) * ry };
}

/** Half-width of an ellipse centred on the ring at row `y` (0 above / below it). */
export function halfWidth(e: { rx: number; ry: number }, y: number): number {
  const d = (y - RING_C.y) / e.ry;
  return Math.abs(d) >= 1 ? 0 : e.rx * Math.sqrt(1 - d * d);
}

/**
 * The rim's broken teeth: where the boiling sea threw up a crown of glass and it set mid-splash.
 * Seeded once. The south arc (the landing's way in) is left clear; a few others are missing too.
 */
export const TEETH: { x: number; y: number; r: number; h: number; lean: number; green: boolean }[] = (() => {
  const rng = mulberry(52061);
  const out: { x: number; y: number; r: number; h: number; lean: number; green: boolean }[] = [];
  const N = 30;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + (rng() - 0.5) * 0.08;
    const gone = rng() < 0.16;
    const f = 0.4 + rng() * 0.22;
    const r = 18 + rng() * 12;
    const h = 46 + rng() * 70;
    const lean = (rng() - 0.5) * 30;
    const green = rng() < 0.5;
    if (Math.sin(a) > 0.86 || gone) continue;
    const p = rimPt(a, f);
    out.push({ x: Math.round(p.x), y: Math.round(p.y), r: Math.round(r), h, lean, green });
  }
  return out;
})();

// ── Glass bits ───────────────────────────────────────────────────────

/** One faceted lump of sea-glass: a lopsided body, a darker underside, a lit plane and a catchlight. */
export function nodule(g: G, x: number, y: number, s: number, base: number, rng: () => number, a = 1): void {
  const n = 6;
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rng() * 0.5;
    const rr = s * (0.7 + rng() * 0.4);
    pts.push(P(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr * 0.6));
  }
  g.fillStyle(dim(base, 0.45), a); g.fillPoints(pts, true);
  g.fillStyle(base, a * 0.9); g.fillEllipse(x - s * 0.1, y - s * 0.12, s * 1.3, s * 0.7);
  g.fillStyle(lit(base, 0.35), a * 0.7); g.fillTriangle(x - s * 0.6, y - s * 0.1, x, y - s * 0.45, x - s * 0.1, y - s * 0.05);
  g.fillStyle(0xffffff, a * 0.5); g.fillCircle(x - s * 0.3, y - s * 0.28, Math.max(0.6, s * 0.1));
}

/** A cockle shell set in the glass — fan, ribs, a pale lip. */
export function shellFan(g: G, x: number, y: number, s: number, rot: number, a = 1): void {
  const c = Math.cos(rot), sn = Math.sin(rot);
  const R = (dx: number, dy: number) => P(x + (dx * c - dy * sn) * s, y + (dx * sn + dy * c) * s);
  g.fillStyle(0xe8d8c0, a);
  g.fillPoints([R(0, 2), R(-5, -1), R(-4, -5), R(0, -7), R(4, -5), R(5, -1)], true);
  g.lineStyle(0.6, 0xa08a70, a);
  for (const dx of [-3, -1.5, 0, 1.5, 3]) { const p0 = R(0, 2), p1 = R(dx, -6 + Math.abs(dx) * 0.4); g.lineBetween(p0.x, p0.y, p1.x, p1.y); }
}

/** A fish caught mid-turn when the sea set: body, tail, an eye, scales gone gold in the heat. */
export function glassFish(g: G, x: number, y: number, s: number, rot: number, col: number, a = 1): void {
  const c = Math.cos(rot), sn = Math.sin(rot);
  const R = (dx: number, dy: number) => P(x + (dx * c - dy * sn) * s, y + (dx * sn + dy * c) * s);
  g.fillStyle(col, a);
  g.fillPoints([R(8, 0), R(4, -3), R(-3, -3), R(-7, 0), R(-3, 3), R(4, 3)], true);
  g.fillPoints([R(-6, 0), R(-11, -4), R(-10, 0), R(-11, 4)], true);
  g.fillStyle(lit(col, 0.4), a * 0.8);
  g.fillPoints([R(6, -1), R(2, -2.6), R(-3, -2.4), R(-1, -1)], true);
  g.fillStyle(0x101010, a); const e = R(5, -0.6); g.fillCircle(e.x, e.y, 0.9 * s);
}

/** A ship's timber fused into the glass — a plank with treenail holes, half sunk. */
export function timber(g: G, x0: number, y0: number, x1: number, y1: number, w: number, a = 1): void {
  g.lineStyle(w, FP.timber, a); g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(w * 0.3, lit(FP.timber, 0.25), a * 0.7); g.lineBetween(x0, y0 - w * 0.25, x1, y1 - w * 0.25);
  const n = Math.floor(Math.hypot(x1 - x0, y1 - y0) / 18);
  g.fillStyle(0x1a120a, a);
  for (let i = 1; i < n; i++) g.fillCircle(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, w * 0.12);
}

/**
 * One of the rim's broken teeth: a splash of glass that set standing — a leaning tongue with a
 * curled lip, two tones of amber or bottle-green, a lit edge and bubbles trapped inside.
 */
export function tooth(g: G, x: number, y: number, w: number, h: number, lean: number, green: boolean, rng: () => number): void {
  const base = green ? FP.bottle : FP.amber;
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x + lean * 0.3, y + 2, w * 2.2, w * 0.6);
  const tip = { x: x + lean, y: y - h };
  const curl = lean >= 0 ? 1 : -1;
  g.fillStyle(dim(base, 0.4), 1);
  g.fillPoints([P(x - w, y), P(x - w * 0.6, y - h * 0.5), P(tip.x - w * 0.3, tip.y + 6), P(tip.x + curl * 10, tip.y - 2), P(tip.x + curl * 12, tip.y + 10), P(x + w * 0.5, y - h * 0.45), P(x + w, y)], true);
  g.fillStyle(base, 0.95);
  g.fillPoints([P(x - w * 0.7, y - 2), P(x - w * 0.35, y - h * 0.5), P(tip.x - w * 0.1, tip.y + 8), P(tip.x + curl * 6, tip.y + 2), P(x + w * 0.1, y - h * 0.4), P(x + w * 0.2, y - 2)], true);
  g.fillStyle(lit(base, 0.45), 0.6);
  g.fillPoints([P(x - w * 0.55, y - 4), P(x - w * 0.3, y - h * 0.5), P(tip.x - w * 0.12, tip.y + 10), P(x - w * 0.12, y - h * 0.45)], true);
  g.lineStyle(1, lit(base, 0.7), 0.7);
  g.lineBetween(x - w * 0.6, y - h * 0.5, tip.x - w * 0.3, tip.y + 6);
  g.lineBetween(tip.x - w * 0.3, tip.y + 6, tip.x + curl * 10, tip.y - 2);
  for (let i = 0; i < 4; i++) {
    const by = y - h * (0.15 + rng() * 0.55), bx = x + (rng() - 0.5) * w * 0.8 + lean * ((y - by) / h);
    g.lineStyle(0.8, lit(base, 0.6), 0.6); g.strokeCircle(bx, by, 1 + rng() * 2);
  }
}

// ── The cinder ───────────────────────────────────────────────────────

/**
 * The fallen star as it lies in the crater. `x, y` the middle of its base; `s` 1 ≈ 100 px wide, 84
 * tall (man-sized). Options:
 * - `mood` its light; `t` seconds;
 * - `turned` 0–1: how many of the sixty keys have turned (lit keyholes, bows edge-on);
 * - `keys` 0–1: how many keys stand in their locks;
 * - `split` 0–1: the shell halves fallen apart; `king` 0–1 the figure inside, `sitUp` 0–1 him rising;
 * - `ash` 0–1: the cinder gone grey (the end).
 */
export function cinder(g: G, x: number, y: number, s: number, o: {
  mood: Mood; t: number; turned?: number; keys?: number; split?: number; king?: number; sitUp?: number; ash?: number;
}): void {
  const m = MOOD[o.mood];
  const turned = o.turned ?? 0, keys = o.keys ?? 0, split = o.split ?? 0, ash = o.ash ?? 0;
  const RX = 50 * s, HT = 84 * s;
  // Scorch and the shadow it lies in.
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y + 2 * s, RX * 2.9, RX * 0.8);
  g.fillStyle(dim(m.light, 0.75), 0.25 * (1 - ash)); g.fillEllipse(x, y, RX * 2.4, RX * 0.6);
  // Interior: the cinder itself, the light of it, and — once open — him.
  if (split > 0.01) {
    const heat = (1 - ash) * split;
    for (let i = 3; i >= 1; i--) { g.fillStyle(m.light, 0.08 * heat); g.fillEllipse(x, y - HT * 0.45, (60 + i * 30) * s, (70 + i * 26) * s); }
    const cx = x, cy = y - 26 * s;
    g.fillStyle(mixC(0x2a2220, 0x6a6662, ash), 1); g.fillEllipse(cx, cy, 58 * s, 40 * s);
    const rr = mulberry(911);
    for (let i = 0; i < 7; i++) {
      const a0 = rr() * Math.PI * 2;
      const pts = crackPath({ x: cx, y: cy }, { x: cx + Math.cos(a0) * 26 * s, y: cy + Math.sin(a0) * 18 * s }, rr, 4 * s, 3);
      seam(g, pts, 1.2 * s, heat, 0.3, m.light);
    }
    if ((o.king ?? 0) > 0) fallenKing(g, x, y - 16 * s, 0.62 * s, { t: o.t, heat: 1 - ash, alpha: o.king ?? 0, sit: 1 - (o.sitUp ?? 1) * 0.6, mood: o.mood });
  }
  // The shell: two halves (a seam down the middle that the split opens).
  const half = (side: -1 | 1) => {
    const dx = side * split * 26 * s;
    const lean = side * split * 0.32;
    const pt = (px: number, py: number) => {
      const hgt = (y - py) / HT;
      return P(px + dx + lean * hgt * 40 * s, py + split * hgt * 8 * s);
    };
    const pts: Phaser.Geom.Point[] = [];
    const bump = [0, 0.04, -0.03, 0.05, -0.02, 0.03, 0];
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      pts.push(pt(x + side * Math.cos(a) * RX * (1 + bump[i]), y - Math.sin(a) * HT * (1 + bump[6 - i] * 0.5)));
    }
    // The broken edge down the middle: a zigzag.
    for (let i = 5; i >= 0; i--) pts.push(pt(x + side * (i % 2 ? 4 : 0) * s, y - (i / 6) * HT));
    g.fillStyle(mixC(FP.shell, 0x5a5660, ash), 1); g.fillPoints(pts, true);
    // Facets on the lit side and a cold sheen.
    const f0 = pt(x + side * RX * 0.55, y - HT * 0.1), f1 = pt(x + side * RX * 0.8, y - HT * 0.5), f2 = pt(x + side * RX * 0.3, y - HT * 0.75);
    g.fillStyle(mixC(OBS.facet, 0x6a6670, ash), 0.9); g.fillTriangle(f0.x, f0.y, f1.x, f1.y, f2.x, f2.y);
    const h0 = pt(x + side * RX * 0.25, y - HT * 0.88), h1 = pt(x + side * RX * 0.5, y - HT * 0.7), h2 = pt(x + side * RX * 0.1, y - HT * 0.62);
    g.fillStyle(mixC(OBS.sheen, 0x8a8690, ash), 0.7); g.fillTriangle(h0.x, h0.y, h1.x, h1.y, h2.x, h2.y);
    g.lineStyle(1.2 * s, OBS.edge, 0.55 * (1 - ash * 0.6));
    for (let i = 0; i < pts.length - 6; i++) g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    // Keyholes on this half.
    keyholes(g, x, y, s, side, pt, m, o.t, turned, keys, ash);
    if (split > 0.02) {
      // The inner edge burns.
      g.lineStyle(2 * s, m.light, 0.7 * split * (1 - ash));
      for (let i = pts.length - 6; i < pts.length - 1; i++) g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    }
  };
  half(-1);
  half(1);
  if (split <= 0.01) {
    // Sealed: a hairline where the halves meet, and violet threads under the black.
    g.lineStyle(1 * s, m.light, 0.35 + turned * 0.6);
    g.lineBetween(x, y, x, y - HT);
  }
}

/** The four rows of keyholes on one half of the shell — 30 a side, 60 in all; each a mask's eye-slit. */
function keyholes(
  g: G, x: number, y: number, s: number, side: -1 | 1, pt: (px: number, py: number) => Phaser.Geom.Point,
  m: { light: number; core: number }, t: number, turned: number, keys: number, ash: number,
): void {
  const ROWS: [number, number][] = [[0.14, 9], [0.36, 8], [0.57, 7], [0.76, 6]];
  let idx = side < 0 ? 0 : 30;
  for (const [f, n] of ROWS) {
    const w = 50 * s * Math.sqrt(1 - f * f) * 0.94;
    for (let j = 0; j < n; j++) {
      const phi = ((j + 0.5) / n) * (Math.PI / 2) * 0.92;
      const kx = x + side * Math.sin(phi) * w;
      const ky = y - f * 84 * s + Math.cos(phi) * 3 * s;
      const k = pt(kx, ky);
      const fs = s * (0.45 + 0.55 * Math.cos(phi));
      // Keys turn in a sweep that runs round the shell, not in index order.
      const order = ((idx * 37) % 60) / 60;
      const on = turned > order ? 1 : 0;
      const held = keys > order * 0.98 ? 1 : 0;
      const pulse = 0.6 + 0.4 * Math.sin(t * 2.2 + idx * 0.7);
      // The slit: almond socket, the light inside.
      g.fillStyle(0x000000, 0.9); g.fillEllipse(k.x, k.y, 7 * fs, 2.6 * s);
      g.fillStyle(on ? m.core : m.light, (on ? 0.95 : 0.35 * pulse) * (1 - ash));
      g.fillTriangle(k.x - 3.4 * fs, k.y, k.x + 3.4 * fs, k.y, k.x + 0.6 * fs * side, k.y - 1.1 * s);
      if (on && ash < 1) { g.fillStyle(m.light, 0.12 * (1 - ash)); g.fillCircle(k.x, k.y, 5 * s); }
      if (held) {
        // The key standing in the lock: a short shaft and its bow — face-on until it turns.
        const kc = KEY_METALS[idx % KEY_METALS.length];
        g.lineStyle(1.2 * s, kc, 1); g.lineBetween(k.x, k.y - 0.5 * s, k.x, k.y - 5 * s);
        g.lineStyle(1.1 * s, kc, 1);
        g.strokeEllipse(k.x, k.y - 7 * s, (on ? 1.2 : 3.6) * s, 3.6 * s);
      }
      idx++;
    }
  }
}

/** The metals of sixty different keys: brass, iron, silver, gold, copper, bone. */
export const KEY_METALS = [0xc9a44a, 0x8a8a90, 0xd8d8e0, 0xffd860, 0xc87a4a, 0xe8dcc0];

/** A key in flight or in the hand: bow, shaft, bit. `rot` radians, `x, y` the bow's centre. */
export function key(g: G, x: number, y: number, s: number, rot: number, col: number, a = 1, glint = 0): void {
  const c = Math.cos(rot), sn = Math.sin(rot);
  const R = (dx: number, dy: number) => ({ x: x + (dx * c - dy * sn) * s, y: y + (dx * sn + dy * c) * s });
  if (glint > 0) { g.fillStyle(lit(col, 0.5), 0.15 * glint * a); g.fillCircle(x, y, 9 * s); }
  g.lineStyle(1.8 * s, col, a); g.strokeCircle(x, y, 3.4 * s);
  const s0 = R(3.4, 0), s1 = R(16, 0);
  g.lineBetween(s0.x, s0.y, s1.x, s1.y);
  const b0 = R(12, 0), b1 = R(12, 3.5), b2 = R(15, 0), b3 = R(15, 4);
  g.lineBetween(b0.x, b0.y, b1.x, b1.y); g.lineBetween(b2.x, b2.y, b3.x, b3.y);
  g.fillStyle(lit(col, 0.6), a * 0.8); g.fillCircle(x - 1.6 * s, y - 1.6 * s, 0.9 * s);
}

// ── Him ──────────────────────────────────────────────────────────────

/**
 * The Fallen King: man-sized, a judge's robe of ash over a cinder that shows through the cracks, a
 * judge's white bands gone grey at the throat, no crown — only the pale ring on his brow where one
 * sat. Ember-gold eyes. `x, y` his feet; `s` 1 ≈ 66 px tall; `sit` 0–1 folds him down; `heat` 0–1
 * how much the cinder burns through; ash lifts off him as he moves.
 */
export function fallenKing(g: G, x: number, y: number, s: number, o: { t: number; heat?: number; alpha?: number; sit?: number; mood?: Mood; face?: number }): void {
  const a = o.alpha ?? 1, heat = o.heat ?? 1, sit = o.sit ?? 0, t = o.t;
  const ember = MOOD[o.mood ?? 'open'].light;
  const f = o.face ?? 1;
  const drop = sit * 16 * s;
  const breathe = Math.sin(t * 1.4) * 0.8 * s;
  const top = y - 66 * s + drop + breathe;
  const robe = 0x5c5854, robeDk = 0x34302e, robeLt = 0x8a8480;
  g.fillStyle(0x000000, 0.3 * a); g.fillEllipse(x, y + 1, (30 + sit * 12) * s, 7 * s);
  // The robe: a long bell, ragged at the hem where it is turning to ash.
  const hemW = (17 + sit * 7) * s;
  const hem: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= 8; i++) hem.push(P(x + hemW - (i / 8) * hemW * 2, y - (i % 2 ? 3 : 0) * s));
  g.fillStyle(robeDk, a);
  g.fillPoints([P(x - 8 * s, top + 22 * s), P(x + 8 * s, top + 22 * s), ...hem], true);
  g.fillStyle(robe, a);
  g.fillPoints([P(x - 7 * s, top + 22 * s), P(x + 9 * s * f, top + 22 * s), P(x + hemW * f * 0.9, y - 2 * s), P(x - hemW * f * 0.1, y - 2 * s)], true);
  g.lineStyle(1 * s, robeLt, 0.5 * a);
  g.lineBetween(x + 4 * s * f, top + 26 * s, x + hemW * f * 0.7, y - 3 * s);
  g.lineStyle(1.2 * s, 0x221e1c, 0.8 * a);
  g.lineBetween(x - 3 * s, top + 28 * s, x - 7 * s, y - 2 * s); g.lineBetween(x + 1 * s, top + 30 * s, x + 2 * s, y - 2 * s);
  // Cinder through the cracks in the robe.
  if (heat > 0.02) {
    const rr = mulberry(77);
    for (let i = 0; i < 4; i++) {
      const sx = x + (rr() - 0.5) * 18 * s, sy = top + (32 + rr() * 26) * s;
      const pts = crackPath({ x: sx, y: sy }, { x: sx + (rr() - 0.5) * 8 * s, y: sy + (6 + rr() * 6) * s }, rr, 2 * s, 3);
      seam(g, pts, 0.9 * s, a * heat * (0.7 + 0.3 * Math.sin(t * 3 + i)), 0.2, ember);
    }
  }
  // Shoulders, sleeves, the hands folded in front.
  g.fillStyle(robe, a); g.fillEllipse(x, top + 24 * s, 24 * s, 11 * s);
  g.fillStyle(robeLt, 0.4 * a); g.fillEllipse(x + 4 * s * f, top + 21 * s, 12 * s, 4 * s);
  g.fillStyle(0x2a2220, a); g.fillEllipse(x + 1 * s * f, top + 38 * s, 10 * s, 5 * s);
  g.fillStyle(ember, 0.7 * a * heat); g.fillCircle(x + 3 * s * f, top + 37 * s, 1 * s); g.fillCircle(x - 1 * s * f, top + 38.5 * s, 0.8 * s);
  // The judge's bands, gone grey.
  g.fillStyle(0xb8b2a8, a);
  g.fillRect(x - 2.6 * s, top + 17 * s, 2.2 * s, 7 * s); g.fillRect(x + 0.4 * s, top + 17 * s, 2.2 * s, 7 * s);
  // The head: dark cinder, a pale ring where the crown sat, ember eyes.
  g.fillStyle(0x2a2220, a); g.fillCircle(x, top + 9 * s, 8.5 * s);
  g.fillStyle(0x3e3430, a); g.fillCircle(x - 2 * s * f, top + 7 * s, 5 * s);
  g.lineStyle(1.2 * s, 0xd8d0c8, 0.45 * a); g.beginPath(); g.arc(x, top + 9 * s, 7.4 * s, Math.PI * 1.1, Math.PI * 1.9); g.strokePath();
  const blink = Math.sin(t * 0.7) > 0.985 ? 0.15 : 1;
  g.fillStyle(0xffa040, 0.25 * a * heat); g.fillCircle(x + 2 * s * f, top + 9 * s, 5 * s);
  g.fillStyle(0xffa040, a * blink * (0.4 + 0.6 * heat));
  g.fillEllipse(x - 0.6 * s + 2 * s * f, top + 9 * s, 2.6 * s, 1.3 * s); g.fillEllipse(x + 3.8 * s + 2 * s * f, top + 9 * s, 2.6 * s, 1.3 * s);
  // Ash lifting off him.
  for (let i = 0; i < 6; i++) {
    const k = ((t * 0.35 + i / 6) % 1);
    g.fillStyle(i % 2 ? 0x9a948e : ember, (1 - k) * 0.6 * a * (i % 2 ? 1 : heat));
    g.fillRect(x + Math.sin(i * 2.1 + t) * 10 * s, top + 20 * s - k * 40 * s, 1.4 * s, 1.4 * s);
  }
}

// ── Crowns ───────────────────────────────────────────────────────────

/** A crown glyph burning on a far horizon — one per isle. `a` 0 dark … 1 burning; `x, y` its base. */
export function crownGlyph(g: G, x: number, y: number, s: number, col: number, a: number, t: number): void {
  if (a > 0.04) for (let i = 3; i >= 1; i--) { g.fillStyle(col, 0.06 * a); g.fillCircle(x, y - 6 * s, (6 + i * 8) * s * (0.92 + 0.08 * Math.sin(t * 5 + x))); }
  g.fillStyle(mixC(0x1a1420, col, 0.2 + 0.8 * a), 0.4 + 0.6 * a);
  g.fillPoints([P(x - 9 * s, y), P(x + 9 * s, y), P(x + 10 * s, y - 12 * s), P(x + 5 * s, y - 6 * s), P(x, y - 15 * s), P(x - 5 * s, y - 6 * s), P(x - 10 * s, y - 12 * s)], true);
  if (a > 0.04) {
    g.fillStyle(0xffffff, 0.7 * a);
    g.fillCircle(x, y - 15 * s, 1.1 * s); g.fillCircle(x - 10 * s, y - 12 * s, 0.9 * s); g.fillCircle(x + 10 * s, y - 12 * s, 0.9 * s);
  }
}

/** The ten isles' crown colours, in the order the campaign freed them. */
export const CROWN_COLS = [0xff6a2a, 0x3aa0ff, 0x5fd068, 0xbfe8ff, 0xd8a45a, 0xffe24a, 0x9ee04a, 0xd07aff, 0xff8ad0, 0xfff0b0];

/** Where the star lies, for anyone drawing round it. */
export const STAR = METEOR_AT;
