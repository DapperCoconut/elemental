import Phaser from 'phaser';
import type { Fighter } from '../../../../../entities/Fighter';
import type { Pt } from '../../../../IslesTypes';
import { mixC } from '../../../../art/IsleArt';

/**
 * The Abyssal Court's colours and the drawing bricks every part of it shares — the world
 * painter, the arena floor, the five gimmicks, Prince Lanternjaw and the charms all paint with
 * these, so the trench city reads as one place from the map to the fight.
 *
 * The look: a city at the bottom of the sea inside one vast bubble of air. The ground is
 * blue-black silt and salvaged ship planking; everything built is bone (whale ribs, vertebrae,
 * jaws) or drowned hulls crusted with coral; the light is never the sun — it is cold cyan and
 * rose from the coral, and warm amber from the anglerfish lamps. Darkness is the default and
 * light is the event, but every edge keeps a pale rim so nothing is lost in it.
 */
export const ABY = {
  /** The deep beyond the bubble wall. */
  abyss: 0x02060f,
  deep: 0x061024,
  deepMid: 0x0b1a33,
  /** Silt floor inside the bubble. */
  silt: 0x111b29,
  siltMid: 0x18263a,
  siltLit: 0x2a3d55,
  siltPale: 0x46607d,
  /** Bone — whale ribs, vertebrae, the Gape. */
  bone: 0xd8ceb6,
  boneMid: 0xaea288,
  boneDark: 0x6a604d,
  boneShadow: 0x2e2a24,
  /** Drowned ship timber. */
  hull: 0x33291f,
  hullMid: 0x4a3b2c,
  hullLit: 0x6a5640,
  tar: 0x16110d,
  /** Coral and its light. */
  coralCyan: 0x3ff0d6,
  coralTeal: 0x1c8f92,
  coralRose: 0xff5c9e,
  coralRoseDark: 0x7a2050,
  coralViolet: 0x8a6cff,
  /** Anglerfish lamplight — the only warm colour in the trench. */
  lure: 0xffcf5a,
  lureHot: 0xfff3b8,
  lureDeep: 0xc9780e,
  /** The bubble's skin. */
  membrane: 0x9fe4ff,
  membraneDim: 0x3f7fa8,
  /** Photophores — small blue lights in rows down a fish's flank. */
  photo: 0x6ec2ff,
  /** Kelp and weed. */
  kelp: 0x24503c,
  kelpLit: 0x3f7a58,
  /** Brass and iron (diving gear, pumps, the stair). */
  brass: 0xc39744,
  brassDark: 0x6e5222,
  iron: 0x23282e,
  ironLit: 0x4a5562,
  rust: 0x7a4026,
  /** Teeth: a hair warmer than bone, with a glassy edge. */
  tooth: 0xf2ecdc,
  gum: 0x4a1a26,
  blood: 0xb0283c,
};

/** Seconds since the last call — gimmicks and scripts keep their own clock so dt units never matter. */
export function makeClock(): (time: number) => number {
  let last = -1;
  return (time: number): number => {
    if (last < 0) { last = time; return 0; }
    const dt = Math.min(0.05, Math.max(0, (time - last) / 1000));
    last = time;
    return dt;
  };
}

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

/** Shortest signed difference between two angles. */
export function angDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Distance from a point to the segment a–b. */
export function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const L = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / L, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

/** Sample points along a polyline every `step` px. */
export function samplePolyline(pts: Pt[], step: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.floor(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// ── Light in the dark ────────────────────────────────────────────────

export interface Glim { x: number; y: number; r: number; tint?: number; strength?: number }

/**
 * The abyss overlay. Graphics cannot cut holes, so the dark is laid as a grid of cells whose
 * alpha falls off near the nearest light. Unlike a plain blackout, a light here *tints* the
 * cells at its edge (amber near a lure, cyan near coral), so a pool of sight reads as lit by
 * something rather than simply missing its shadow.
 */
export function abyssDark(
  g: Phaser.GameObjects.Graphics, W: number, H: number, top: number, lights: Glim[], alpha: number, cell = 32,
): void {
  if (alpha <= 0.01) return;
  for (let y = top; y < H; y += cell) {
    for (let x = 0; x < W; x += cell) {
      const cx = x + cell / 2, cy = y + cell / 2;
      let k = 1;
      let tint = -1;
      let edge = 0;
      for (const l of lights) {
        const d = Math.hypot(cx - l.x, cy - l.y) / l.r;
        const lt = clamp((d - 0.5) / 0.5, 0, 1) / (l.strength ?? 1);
        if (lt < k) {
          k = Math.max(0, lt);
          if (l.tint !== undefined && d < 1.05) { tint = l.tint; edge = 1 - Math.abs(d - 0.78) / 0.3; }
        }
        if (k <= 0) break;
      }
      if (k <= 0) continue;
      g.fillStyle(0x01040b, alpha * k);
      g.fillRect(x, y, cell, cell);
      if (tint >= 0 && edge > 0) {
        g.fillStyle(tint, 0.06 * edge);
        g.fillRect(x, y, cell, cell);
      }
    }
  }
}

// ── Bricks ───────────────────────────────────────────────────────────

/**
 * A ring of teeth closing on a point — the court's signature hazard art. `open` 1 is a wide,
 * slack mouth (the telegraph); 0 is shut. Upper and lower jaws are two arcs of needle teeth
 * pointing inward, so the shape reads as a bite, not a circle.
 */
export function drawJaws(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, open: number, alpha = 1, teeth = 11): void {
  const gap = r * (0.08 + open * 0.92);
  for (const side of [-1, 1]) {
    const cy = y + side * gap * 0.55;
    // Gum line.
    g.lineStyle(Math.max(3, r * 0.12), ABY.gum, 0.85 * alpha);
    g.beginPath();
    g.arc(x, cy, r, side < 0 ? Math.PI * 1.08 : Math.PI * 0.08, side < 0 ? Math.PI * 1.92 : Math.PI * 0.92, false);
    g.strokePath();
    for (let i = 0; i < teeth; i++) {
      const t = (i + 0.5) / teeth;
      const a = side < 0 ? Math.PI * (1.1 + t * 0.8) : Math.PI * (0.1 + t * 0.8);
      const bx = x + Math.cos(a) * r, by = cy + Math.sin(a) * r * 0.9;
      const len = r * (0.28 + (i % 3 === 1 ? 0.22 : 0)) * (0.6 + 0.4 * (1 - Math.abs(t - 0.5) * 2));
      const tx = bx - Math.cos(a) * len * 0.4, ty = by - side * len;
      const w = r * 0.07;
      g.fillStyle(ABY.tooth, 0.95 * alpha);
      g.fillTriangle(bx - w, by, bx + w, by, tx, ty);
      g.fillStyle(0xffffff, 0.5 * alpha);
      g.fillTriangle(bx - w * 0.3, by, bx + w * 0.3, by, tx, ty);
    }
  }
}

/** An anglerfish esca — the lure bulb on its stalk tip, with a soft halo and a hot core. */
export function drawEsca(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, t: number, alpha = 1): void {
  const pulse = 0.85 + Math.sin(t * 5.2) * 0.1 + Math.sin(t * 13) * 0.05;
  for (let k = 5; k >= 1; k--) { g.fillStyle(ABY.lure, 0.05 * alpha); g.fillCircle(x, y, r * (1.4 + k * 0.9) * pulse); }
  g.fillStyle(ABY.lureDeep, alpha); g.fillCircle(x, y, r * 1.05);
  g.fillStyle(ABY.lure, alpha); g.fillCircle(x, y, r * 0.86 * pulse);
  g.fillStyle(ABY.lureHot, alpha); g.fillCircle(x - r * 0.2, y - r * 0.25, r * 0.42);
  // The little filaments that hang off a real esca.
  g.lineStyle(1, ABY.lure, 0.7 * alpha);
  for (let i = 0; i < 3; i++) {
    const a = Math.PI * 0.35 + i * 0.3 + Math.sin(t * 2 + i) * 0.1;
    g.lineBetween(x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a) * r * 2, y + Math.sin(a) * r * 2.2);
  }
}

/** A curved whale rib standing up out of the ground, three-quarters on. `lean` tips it sideways. */
export function drawRib(g: Phaser.GameObjects.Graphics, x: number, y: number, h: number, span: number, lean = 0, tone = 0): void {
  const c = mixC(ABY.boneMid, ABY.bone, tone);
  const pts: Phaser.Geom.Point[] = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push(new Phaser.Geom.Point(x + Math.sin(t * Math.PI * 0.9) * span + lean * t * t * h * 0.3, y - t * h));
  }
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x + span * 0.2, y + 2, 26, 8);
  for (let i = 0; i < pts.length - 1; i++) {
    const w = 9 * (1 - (i / steps) * 0.65);
    g.lineStyle(w + 3, ABY.boneShadow, 1); g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const w = 9 * (1 - (i / steps) * 0.65);
    g.lineStyle(w, c, 1); g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  }
  for (let i = 0; i < pts.length - 1; i += 2) {
    g.lineStyle(2, mixC(c, 0xffffff, 0.35), 0.7); g.lineBetween(pts[i].x - 2, pts[i].y, pts[i + 1].x - 2, pts[i + 1].y);
  }
}

/**
 * A small deep-sea fish seen from the side — used for shoals, hagfish, lanternfish on the
 * charms and the trench. `glow` lights a row of photophores along its belly.
 */
export function drawFish(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, s: number, body: number, glow: number, alpha = 1): void {
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const P = (f: number, side: number): [number, number] => [x + ux * f * s + nx * side * s, y + uy * f * s + ny * side * s];
  const [hx, hy] = P(1, 0), [tx, ty] = P(-1, 0), [ux1, uy1] = P(0, 0.45), [lx1, ly1] = P(0, -0.45);
  g.fillStyle(body, alpha);
  g.fillTriangle(hx, hy, ux1, uy1, lx1, ly1);
  g.fillTriangle(tx, ty, ux1, uy1, lx1, ly1);
  const [f1x, f1y] = P(-1.5, 0.45), [f2x, f2y] = P(-1.5, -0.45);
  g.fillTriangle(tx, ty, f1x, f1y, f2x, f2y);
  if (glow >= 0) {
    for (let i = 0; i < 4; i++) {
      const [px, py] = P(0.6 - i * 0.38, 0.22);
      g.fillStyle(glow, 0.9 * alpha); g.fillCircle(px, py, Math.max(0.8, s * 0.1));
    }
  }
  const [ex, ey] = P(0.6, -0.12);
  g.fillStyle(0xffffff, 0.8 * alpha); g.fillCircle(ex, ey, Math.max(0.8, s * 0.12));
}

/** A clump of bioluminescent coral: branching fingers with lit tips. Draw at the clump's foot. */
export function drawCoral(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, hue: number, rng: () => number): void {
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y + 2, 60 * s, 16 * s);
  const n = 5 + Math.floor(rng() * 4);
  const tips: Pt[] = [];
  for (let i = 0; i < n; i++) {
    let bx = x + (rng() - 0.5) * 30 * s, by = y;
    let a = -Math.PI / 2 + (rng() - 0.5) * 1.1;
    const segs = 3 + Math.floor(rng() * 3);
    let w = 7 * s;
    for (let k = 0; k < segs; k++) {
      const len = (12 + rng() * 14) * s;
      const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
      g.lineStyle(w + 2, mixC(hue, 0x000000, 0.7), 1); g.lineBetween(bx, by, ex, ey);
      g.lineStyle(w, mixC(hue, 0x000000, 0.35), 1); g.lineBetween(bx, by, ex, ey);
      bx = ex; by = ey; a += (rng() - 0.5) * 0.9; w *= 0.78;
    }
    tips.push({ x: bx, y: by });
  }
  for (const t of tips) {
    g.fillStyle(hue, 0.18); g.fillCircle(t.x, t.y, 8 * s);
    g.fillStyle(hue, 1); g.fillCircle(t.x, t.y, 2.6 * s);
    g.fillStyle(0xffffff, 0.7); g.fillCircle(t.x - 0.6, t.y - 0.6, 1 * s);
  }
}

/** Rising bubble streams (animated; call from `animate*` or a gimmick's draw). */
export function bubbleStream(g: Phaser.GameObjects.Graphics, x: number, y: number, h: number, t: number, seed: number, n = 5, alpha = 0.6): void {
  for (let i = 0; i < n; i++) {
    const ph = (t * (0.35 + (seed % 7) * 0.03) + i / n + seed * 0.13) % 1;
    const bx = x + Math.sin(t * 2.1 + i * 1.9 + seed) * 4 * ph;
    const by = y - ph * h;
    const r = 1.4 + ph * 3;
    g.lineStyle(1, ABY.membrane, alpha * (1 - ph * 0.6));
    g.strokeCircle(bx, by, r);
    g.fillStyle(0xffffff, alpha * 0.5 * (1 - ph)); g.fillCircle(bx - r * 0.35, by - r * 0.35, r * 0.3);
  }
}
