import Phaser from 'phaser';
import { ArmGesture, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Bind draws.
 *
 * Two materials, and the tension between them is the element. The first is **gold** — carved,
 * faceted, deliberate, always with an eye set into it, because everything the patron makes is a
 * relic somebody was meant to worship. The second is **cosmic**: unlit violet depth with tendrils
 * coming off it, drawn with no hard edge anywhere, because the thing behind the relics is not
 * made of anything. Gold sits on top of cosmic in every single shape here, which is the whole
 * story of the character: something enormous and formless, wearing jewellery.
 *
 * The silhouette rule is that **the eye is never symmetrical with the thing around it**. The
 * patron's iris drifts, the shards' eyes look at different points, the idol's is set off-centre.
 * A row of identical eyes reads as decoration; a row of eyes all looking at *you* does not.
 *
 * The palette is a gold ladder and a cosmic ladder, plus exactly one alarm colour — the red of a
 * god that has run out of patience — and it is only allowed on the anger bar and on the eye.
 */

export type BindColorFn = ColorFn;

export const BND = {
  /** Under everything. The hole in the sky. */
  void: 0x080415,
  /** Cosmic: the patron itself, and every tendril coming off it. */
  cosmicDeep: 0x180c3a,
  cosmic: 0x3a1f7a,
  cosmicLit: 0x6f3fd0,
  aether: 0xb894ff,
  /** Gold: relics, shards, hexes, the idol. */
  goldDeep: 0x6d4a0c,
  gold: 0xe0b743,
  goldLit: 0xffe49b,
  /** The eye's iris. Purple on gold, everywhere, without exception. */
  iris: 0x8a3fe0,
  irisLit: 0xc79bff,
  /** Chains and locks — the only cold colour in the element. */
  chain: 0x5d5866,
  chainLit: 0xa9a2b8,
  /** Anger, and nothing else. */
  wrath: 0xff4438,
  wrathDeep: 0x8c1008,
  /** Heat, on the beam and on its bar. */
  heat: 0xffa63d,
};

/** Deterministic 0–1 noise, so a hex ring keeps its glyphs between frames. */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 37.3 + i * 83.7) * 21377.911;
  return v - Math.floor(v);
}

/** Scale a colour's channels. Used to sink a fill into shadow, never to recolour it. */
export function shade(color: number, k: number): number {
  const r = Math.round(Math.min(255, ((color >> 16) & 0xff) * k));
  const g = Math.round(Math.min(255, ((color >> 8) & 0xff) * k));
  const b = Math.round(Math.min(255, (color & 0xff) * k));
  return (r << 16) | (g << 8) | b;
}

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * Cosmic energy: a soft irregular mass with tendrils reaching out of it. Built from overlapping
 * ellipses on a fixed seed so it churns without swimming, and drawn with no outline at all —
 * anything in this element that has a hard edge is a relic, and this is not a relic.
 */
export function cosmicVeil(
  g: Phaser.GameObjects.Graphics,
  tint: BindColorFn,
  x: number, y: number, w: number, h: number, alpha: number, t: number, seed = 7,
): void {
  for (const [k, color, a] of [[1.5, BND.void, 0.55], [1.15, BND.cosmicDeep, 0.7], [0.8, BND.cosmic, 0.55]] as const) {
    g.fillStyle(tint(color), alpha * a);
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * TAU;
      const d = 0.32 + jitter(seed, i) * 0.4;
      const pulse = 1 + Math.sin(t * 1.3 + i * 1.7) * 0.07;
      g.fillEllipse(
        x + Math.cos(ang) * w * d * 0.5,
        y + Math.sin(ang) * h * d * 0.5,
        w * k * (0.5 + jitter(seed, 20 + i) * 0.35) * pulse,
        h * k * (0.5 + jitter(seed, 40 + i) * 0.35) * pulse,
      );
    }
  }
  // Tendrils: kinked lines wandering out of the mass and thinning to nothing.
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * TAU + Math.sin(t * 0.4 + i) * 0.3;
    let px = x + Math.cos(ang) * w * 0.35;
    let py = y + Math.sin(ang) * h * 0.35;
    let a = ang;
    for (let k = 0; k < 4; k++) {
      a += Math.sin(t * 1.1 + i * 2.3 + k) * 0.5;
      const len = (w * 0.13) * (1 - k * 0.18);
      const nx = px + Math.cos(a) * len;
      const ny = py + Math.sin(a) * len * 0.8;
      g.lineStyle(3.4 - k * 0.7, tint(k < 2 ? BND.cosmic : BND.cosmicLit), alpha * (0.5 - k * 0.1));
      g.lineBetween(px, py, nx, ny);
      px = nx; py = ny;
    }
  }
}

/**
 * A god's eye. Gold sclera, a purple iris that drifts rather than sitting centred, a slit pupil
 * and a heavy lid that never quite opens all the way — until `wrath`, which drags the lid up,
 * reddens the whole thing and puts a ring of spikes around it. `open` is the resting aperture.
 */
export function patronEye(
  g: Phaser.GameObjects.Graphics,
  tint: BindColorFn,
  x: number, y: number, r: number, open: number, alpha: number,
  { wrath = 0, drift = 0, t = 0, brow = true } = {},
): void {
  const o = Phaser.Math.Clamp(open, 0, 1) * (1 - wrath) + wrath;
  const h = r * (0.1 + o * 0.62);
  const scler = wrath > 0.02 ? BND.wrath : BND.gold;
  const inner = wrath > 0.02 ? BND.wrathDeep : BND.goldDeep;

  // Glow behind, so the eye reads as a light source in a dark hole.
  g.fillStyle(tint(wrath > 0.02 ? BND.wrath : BND.goldLit), alpha * (0.1 + wrath * 0.2) * o);
  g.fillEllipse(x, y, r * 3.4, h * 4.2);

  // The almond: two parabolas so it comes to a point at both corners.
  const pts: Phaser.Geom.Point[] = [];
  const N = 18;
  for (let i = 0; i <= N; i++) {
    const u = -1 + (i / N) * 2;
    pts.push(new Phaser.Geom.Point(x + u * r, y - (1 - u * u) * h));
  }
  for (let i = N; i >= 0; i--) {
    const u = -1 + (i / N) * 2;
    pts.push(new Phaser.Geom.Point(x + u * r, y + (1 - u * u) * h * 0.92));
  }
  g.fillStyle(tint(inner), alpha * 0.95);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 1.06, y + (p.y - y) * 1.14)), true);
  g.fillStyle(tint(scler), alpha);
  g.fillPoints(pts, true);

  if (o > 0.12) {
    // Iris: drifts across the sclera rather than sitting dead centre.
    const ix = x + drift * r * 0.36;
    const iy = y + Math.sin(t * 0.7) * h * 0.1;
    const ir = Math.min(h * 0.92, r * 0.4);
    g.fillStyle(tint(BND.cosmicDeep), alpha);
    g.fillCircle(ix, iy, ir * 1.12);
    g.fillStyle(tint(BND.iris), alpha);
    g.fillCircle(ix, iy, ir);
    // Iris fibres, so it is not a flat disc.
    g.lineStyle(1.1, tint(BND.irisLit), alpha * 0.5);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + t * 0.2;
      g.lineBetween(ix + Math.cos(a) * ir * 0.35, iy + Math.sin(a) * ir * 0.35,
        ix + Math.cos(a) * ir * 0.92, iy + Math.sin(a) * ir * 0.92);
    }
    g.fillStyle(tint(BND.void), alpha);
    g.fillEllipse(ix, iy, ir * 0.36, ir * 1.7);
    g.fillStyle(tint(BND.goldLit), alpha * 0.8);
    g.fillCircle(ix - ir * 0.4, iy - ir * 0.44, ir * 0.2);
  }

  if (brow) {
    // A heavy gold brow across the top, which is what makes the thing read as *judging*.
    g.lineStyle(r * 0.16, tint(BND.goldDeep), alpha * 0.9);
    g.beginPath();
    g.arc(x, y + h * 0.5, r * 1.15, Math.PI * 1.12, Math.PI * 1.88, false);
    g.strokePath();
  }

  if (wrath > 0.02) {
    // Spikes: only ever seen when the patron has turned, so they are the tell.
    g.lineStyle(2.4, tint(BND.wrath), alpha * wrath);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + t * 0.9;
      const l = r * (0.3 + jitter(3, i) * 0.35) * wrath;
      g.lineBetween(x + Math.cos(a) * r * 1.1, y + Math.sin(a) * h * 1.5,
        x + Math.cos(a) * (r * 1.1 + l), y + Math.sin(a) * (h * 1.5 + l * 1.6));
    }
  }
}

/**
 * One shard of oblivion: a faceted gold sliver with a purple eye set through it. Drawn as two
 * asymmetric triangles sharing a spine so it reads as *carved* rather than as a diamond, with a
 * bright facet down the lit side and the eye slightly off the centreline.
 */
export function oblivionShard(
  g: Phaser.GameObjects.Graphics,
  tint: BindColorFn,
  x: number, y: number, ang: number, alpha: number,
  { scale = 1, eye = 1, turned = false } = {},
): void {
  const L = 13 * scale;
  const W = 5.2 * scale;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const tipX = x + c * L;
  const tipY = y + s * L;
  const tailX = x - c * L * 0.72;
  const tailY = y - s * L * 0.72;
  const lx = x - s * W;
  const ly = y + c * W;
  const rx = x + s * W * 0.72;
  const ry = y - c * W * 0.72;

  g.fillStyle(tint(BND.cosmicDeep), alpha * 0.5);
  g.fillCircle(x, y, L * 0.85);

  g.fillStyle(tint(BND.goldDeep), alpha);
  g.fillTriangle(tipX, tipY, lx, ly, tailX, tailY);
  g.fillStyle(tint(turned ? BND.wrath : BND.gold), alpha);
  g.fillTriangle(tipX, tipY, rx, ry, tailX, tailY);
  g.fillStyle(tint(turned ? BND.wrathDeep : BND.goldLit), alpha * 0.85);
  g.fillTriangle(tipX, tipY, x + (rx - x) * 0.4, y + (ry - y) * 0.4, x, y);

  if (eye > 0) {
    const ex = x + c * L * 0.1 - s * W * 0.12;
    const ey = y + s * L * 0.1 + c * W * 0.12;
    const er = 2.6 * scale;
    g.fillStyle(tint(BND.void), alpha);
    g.fillCircle(ex, ey, er * 1.25);
    g.fillStyle(tint(BND.iris), alpha * eye);
    g.fillCircle(ex, ey, er);
    g.fillStyle(tint(BND.void), alpha * eye);
    g.fillEllipse(ex, ey, er * 0.42, er * 1.6);
    g.fillStyle(tint(BND.irisLit), alpha * eye * 0.9);
    g.fillCircle(ex - er * 0.35, ey - er * 0.38, er * 0.28);
  }
}

/**
 * The patron's beam. Cosmic sheath, gold body, white throat, and a spiral of glyph-motes running
 * down it whose speed rides `heat` — the beam gets brighter, fatter and busier as it winds up,
 * which is the only readout the ability's damage rate ever gets in the world.
 */
export function godBeam(
  g: Phaser.GameObjects.Graphics,
  tint: BindColorFn,
  x0: number, y0: number, x1: number, y1: number, alpha: number, heat: number, t: number,
): void {
  const w = 1 + heat * 1.1;
  const hot = heat > 0.75;
  const passes: [number, number, number][] = [
    [22, 0.1, BND.cosmicDeep],
    [11, 0.26, BND.cosmic],
    [5.4, 0.85, hot ? BND.heat : BND.gold],
    [1.8, 1.0, BND.goldLit],
  ];
  for (const [ww, a, color] of passes) {
    g.lineStyle(ww * w, tint(color), alpha * a);
    g.lineBetween(x0, y0, x1, y1);
  }

  const len = Math.hypot(x1 - x0, y1 - y0);
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const n = Math.max(6, Math.round(len / 34));
  for (let i = 0; i < n; i++) {
    const u = ((i / n) + t * (0.25 + heat * 1.1)) % 1;
    const px = x0 + (x1 - x0) * u;
    const py = y0 + (y1 - y0) * u;
    const off = Math.sin(u * 22 + t * 6) * (5 + heat * 7);
    g.fillStyle(tint(hot ? BND.goldLit : BND.aether), alpha * 0.75);
    g.fillCircle(px + Math.cos(ang + 1.57) * off, py + Math.sin(ang + 1.57) * off, 1.6 + heat * 1.4);
  }

  // Contact bloom, with a small eye opening in it at high heat.
  g.fillStyle(tint(hot ? BND.heat : BND.gold), alpha * 0.28);
  g.fillCircle(x1, y1, 15 + heat * 16);
  g.fillStyle(tint(BND.goldLit), alpha * 0.85);
  g.fillCircle(x1, y1, 4 + heat * 4);
  if (hot) {
    g.fillStyle(tint(BND.iris), alpha);
    g.fillEllipse(x1, y1, 8, 4 + heat * 4);
    g.fillStyle(tint(BND.void), alpha);
    g.fillEllipse(x1, y1, 2.4, 4 + heat * 3);
  }
}

/**
 * Prophet's Protection: a ring of hex glyphs standing around the wearer, one per remaining
 * charge plus a fixed border of smaller ones. The glyphs are drawn as closed polygons with a bar
 * through them so they read as *writing* rather than as shapes, and they rotate against each
 * other so the ward never sits still.
 */
export function hexWard(
  g: Phaser.GameObjects.Graphics,
  tint: BindColorFn,
  x: number, y: number, r: number, alpha: number, charges: number, t: number,
): void {
  g.lineStyle(1.6, tint(BND.gold), alpha * 0.6);
  g.strokeCircle(x, y, r);
  g.lineStyle(1, tint(BND.goldDeep), alpha * 0.45);
  g.strokeCircle(x, y, r * 1.16);

  // Border glyphs — the fixed part of the ward.
  for (let i = 0; i < 12; i++) {
    const a = t * 0.5 + (i / 12) * TAU;
    const gx = x + Math.cos(a) * r * 1.08;
    const gy = y + Math.sin(a) * r * 0.62;
    const sides = 3 + (i % 3);
    g.lineStyle(1.2, tint(BND.goldLit), alpha * (0.3 + 0.3 * Math.sin(t * 3 + i)));
    const p: Phaser.Geom.Point[] = [];
    for (let k = 0; k < sides; k++) {
      const b = a * 2 + (k / sides) * TAU;
      p.push(new Phaser.Geom.Point(gx + Math.cos(b) * 4.2, gy + Math.sin(b) * 4.2));
    }
    g.strokePoints(p, true);
  }

  // Charge glyphs — big, gold, one per hit the ward can still eat.
  for (let i = 0; i < charges; i++) {
    const a = -t * 1.1 + (i / Math.max(1, charges)) * TAU;
    const gx = x + Math.cos(a) * r * 0.78;
    const gy = y + Math.sin(a) * r * 0.5 - 6;
    const p: Phaser.Geom.Point[] = [];
    for (let k = 0; k < 6; k++) {
      const b = -a * 1.5 + (k / 6) * TAU;
      p.push(new Phaser.Geom.Point(gx + Math.cos(b) * 9, gy + Math.sin(b) * 9));
    }
    g.fillStyle(tint(BND.cosmicDeep), alpha * 0.8);
    g.fillPoints(p, true);
    g.lineStyle(1.8, tint(BND.gold), alpha * 0.95);
    g.strokePoints(p, true);
    g.lineStyle(1.4, tint(BND.goldLit), alpha * 0.9);
    g.lineBetween(gx - 5, gy, gx + 5, gy);
    g.lineBetween(gx, gy - 5, gx, gy + 5);
  }
}

/**
 * The idol. A carved gold pillar on a stepped base with an eye set into it off-centre, a collar
 * of faith beads that fill as it is fed, and — when it is starving — cracks running up the shaft
 * and red bleeding out of the seams.
 */
export function idolStatue(
  g: Phaser.GameObjects.Graphics,
  tint: BindColorFn,
  x: number, y: number, alpha: number, faith: number, max: number, t: number,
): void {
  const starved = faith <= 0;
  const bob = Math.sin(t * 1.6) * 1.4;

  g.fillStyle(tint(BND.void), alpha * 0.5);
  g.fillEllipse(x, y + 24, 46, 13);

  // Stepped base.
  g.fillStyle(tint(BND.goldDeep), alpha);
  g.fillRect(x - 20, y + 14, 40, 9);
  g.fillStyle(tint(starved ? BND.wrathDeep : BND.gold), alpha);
  g.fillRect(x - 15, y + 8, 30, 8);

  // Shaft: a tapered pillar, lit down one side.
  const shaft: Phaser.Geom.Point[] = [
    new Phaser.Geom.Point(x - 9, y + 10 + bob * 0.2),
    new Phaser.Geom.Point(x + 9, y + 10 + bob * 0.2),
    new Phaser.Geom.Point(x + 12, y - 12 + bob),
    new Phaser.Geom.Point(x, y - 26 + bob),
    new Phaser.Geom.Point(x - 12, y - 12 + bob),
  ];
  g.fillStyle(tint(BND.goldDeep), alpha);
  g.fillPoints(shaft, true);
  g.fillStyle(tint(starved ? BND.wrathDeep : BND.gold), alpha);
  g.fillPoints(shaft.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 0.82, y + (p.y - y) * 0.96)), true);
  g.fillStyle(tint(starved ? BND.wrath : BND.goldLit), alpha * 0.7);
  g.fillPoints(shaft.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 0.38 - 3, y + (p.y - y) * 0.9)), true);

  // The eye, set off the centreline on purpose.
  patronEye(g, tint, x + 1.5, y - 8 + bob, 8, starved ? 0.15 : 0.55 + 0.3 * Math.sin(t * 1.9),
    alpha, { wrath: starved ? 0.85 : 0, drift: Math.sin(t * 0.8), t, brow: false });

  // Carved bands.
  g.lineStyle(1.6, tint(BND.goldDeep), alpha * 0.9);
  g.lineBetween(x - 10.5, y + 2 + bob * 0.5, x + 10.5, y + 2 + bob * 0.5);
  g.lineBetween(x - 9, y + 6 + bob * 0.4, x + 9, y + 6 + bob * 0.4);

  // Faith beads: a collar around the base, filling clockwise.
  for (let i = 0; i < max; i++) {
    const a = -Math.PI / 2 + (i / max) * TAU;
    const bx = x + Math.cos(a) * 24;
    const by = y + 12 + Math.sin(a) * 8;
    const on = i < faith;
    g.fillStyle(tint(on ? BND.aether : BND.cosmicDeep), alpha * (on ? 0.95 : 0.6));
    g.fillCircle(bx, by, on ? 3 : 2);
    if (on) {
      g.fillStyle(tint(BND.goldLit), alpha * 0.8);
      g.fillCircle(bx - 0.8, by - 0.8, 1.1);
    }
  }

  if (starved) {
    // Cracks, and the seams bleeding. The idol asks for one thing and it is not subtle.
    g.lineStyle(1.4, tint(BND.wrath), alpha * (0.5 + 0.5 * Math.sin(t * 7)));
    for (let i = 0; i < 4; i++) {
      let px = x + (jitter(11, i) - 0.5) * 16;
      let py = y + 8;
      let a = -Math.PI / 2 + (jitter(11, 10 + i) - 0.5) * 1.2;
      for (let k = 0; k < 3; k++) {
        a += (jitter(11, 20 + i * 3 + k) - 0.5) * 1.1;
        const nx = px + Math.cos(a) * 7;
        const ny = py + Math.sin(a) * 7;
        g.lineBetween(px, py, nx, ny);
        px = nx; py = ny;
      }
    }
  }
}

/**
 * The idol's faith ring. A dashed gold circle on the floor with inward chevrons — the chevrons
 * point in when it is hungry and stop when it is full, which is the read the player actually
 * needs at a glance.
 */
export function faithRing(
  g: Phaser.GameObjects.Graphics,
  tint: BindColorFn,
  x: number, y: number, r: number, alpha: number, hunger: number, t: number,
): void {
  const base = hunger > 0.5 ? BND.wrath : BND.gold;
  g.fillStyle(tint(BND.cosmicDeep), alpha * 0.12);
  g.fillEllipse(x, y, r * 2, r * 1.2);
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * TAU;
    if (Math.sin(a * 8 - t * 2) < 0) continue;
    const a2 = a + TAU / 44;
    g.lineStyle(2.4, tint(base), alpha * 0.75);
    g.lineBetween(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6,
      x + Math.cos(a2) * r, y + Math.sin(a2) * r * 0.6);
  }
  if (hunger <= 0.01) return;
  // Chevrons crawling inward along the radius, pointing at the idol — the ring is asking.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + t * 0.7;
    const u = (t * 0.9 + i * 0.13) % 1;
    const d = r * (1 - u * 0.75);
    const cx = x + Math.cos(a) * d;
    const cy = y + Math.sin(a) * d * 0.6;
    // Each arm is swept back from the tip by 140°, so the pair reads as an arrowhead.
    g.lineStyle(2, tint(BND.aether), alpha * (1 - u) * hunger);
    for (const side of [-1, 1]) {
      const b = a + Math.PI + side * 0.6;
      g.lineBetween(cx, cy, cx + Math.cos(b) * 7, cy + Math.sin(b) * 7 * 0.6);
    }
  }
}

/** A stretch of arena about to be erased: the footprint a dark-light beam paints before it lands. */
export function darkMark(
  g: Phaser.GameObjects.Graphics,
  tint: BindColorFn,
  x: number, y: number, r: number, alpha: number, k: number, t: number,
): void {
  const flash = 0.5 + 0.5 * Math.sin(t * (5 + k * 24));
  g.fillStyle(tint(BND.void), alpha * 0.3 * (0.4 + k));
  g.fillCircle(x, y, r);
  g.lineStyle(3, tint(BND.iris), alpha * 0.9 * flash);
  g.strokeCircle(x, y, r);
  g.lineStyle(1.4, tint(BND.aether), alpha * 0.6);
  g.strokeCircle(x, y, r * (1 - k * 0.8));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU - t * 0.8;
    g.lineStyle(2, tint(BND.cosmicLit), alpha * 0.7 * flash);
    g.lineBetween(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3,
      x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95);
  }
}

/**
 * A run of chain between two points, sagging under its own weight.
 *
 * Every chain in the element is drawn with this: the leash from a prophet to one of their cult,
 * and the four that come out of the corners of the room when the god takes the body. `pull` is
 * how taut it is — 0 hangs in a deep curve, 1 is a straight line that has been pulled hard — and
 * it is the only thing that separates *linked to* from *held down*.
 */
export function chainRun(
  g: Phaser.GameObjects.Graphics,
  tint: BindColorFn,
  x0: number, y0: number, x1: number, y1: number,
  alpha: number, pull: number, t: number, seed = 3,
): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 6) return;
  const links = Phaser.Math.Clamp(Math.round(len / 11), 2, 42);
  const sag = (1 - Phaser.Math.Clamp(pull, 0, 1)) * Math.min(46, len * 0.22);
  // The sway runs perpendicular to the chain, so a slack run swings instead of stretching.
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;

  let px = x0;
  let py = y0;
  for (let i = 1; i <= links; i++) {
    const u = i / links;
    const bow = Math.sin(u * Math.PI);
    const sway = Math.sin(t * 2.1 + u * 4.2 + seed) * (1.2 + sag * 0.12);
    const cx = x0 + (x1 - x0) * u + nx * sway;
    const cy = y0 + (y1 - y0) * u + ny * sway + bow * sag;
    chainLink(g, tint, cx, cy, Math.atan2(cy - py, cx - px), alpha, 0.86, pull);
    px = cx; py = cy;
  }
}

/**
 * The four chains that come out of the corners of the arena and hold a body in the middle of it.
 * Drawn taut, with a shackle ring at the wrist end and the corner anchors bolted into the floor —
 * the god is using the summoner as a fixture, and fixtures do not move.
 */
export function arenaBinding(
  g: Phaser.GameObjects.Graphics,
  tint: BindColorFn,
  x: number, y: number,
  corners: [number, number][],
  alpha: number, pull: number, t: number,
): void {
  for (let i = 0; i < corners.length; i++) {
    const [cx, cy] = corners[i];
    // Anchor plate: a gold boss hammered into the corner, with the chain coming out of its eye.
    g.fillStyle(tint(BND.void), alpha * 0.8);
    g.fillCircle(cx, cy, 11);
    g.fillStyle(tint(BND.goldDeep), alpha);
    g.fillCircle(cx, cy, 8.5);
    g.fillStyle(tint(BND.gold), alpha);
    g.fillCircle(cx, cy, 5.5);
    g.fillStyle(tint(BND.void), alpha);
    g.fillCircle(cx, cy, 2.6);
    chainRun(g, tint, cx, cy, x, y, alpha, pull, t, i * 2.7);
  }
  // The shackle: a gold ring around the middle of it all, rattling as the chains pull.
  const rattle = Math.sin(t * 21) * 1.1 * pull;
  g.lineStyle(4, tint(BND.void), alpha * 0.8);
  g.strokeCircle(x + rattle * 0.4, y, 19);
  g.lineStyle(2.6, tint(BND.chainLit), alpha);
  g.strokeCircle(x + rattle * 0.4, y, 19);
  g.lineStyle(1.4, tint(BND.gold), alpha * 0.85);
  g.strokeCircle(x + rattle * 0.4, y, 22.5);
}

/**
 * A cultist of the Broken God.
 *
 * Hooded, they are a silhouette and nothing else: a robe with no body in it, a cowl with one of
 * the patron's eyes stitched onto the front, and hands folded because they are not here to fight.
 * Awakened, the hood is thrown back and there is no head under it at all — a cluster of golden
 * eyes, all open, all looking somewhere slightly different, which is the only moment in the
 * element where the thing wearing the jewellery is visible.
 */
export function cultistFigure(
  g: Phaser.GameObjects.Graphics,
  tint: BindColorFn,
  x: number, y: number, alpha: number,
  { awakened = false, t = 0, seed = 0, lean = 0, scale = 1 } = {},
): void {
  const bob = Math.sin(t * 2.2 + seed) * 1.6 * scale;
  const sway = Math.sin(t * 1.3 + seed * 1.7) * 1.9 * scale + lean * 9;
  const S = scale;

  g.fillStyle(tint(BND.void), alpha * 0.5);
  g.fillEllipse(x, y + 20 * S, 30 * S, 9 * S);

  // ── Robe ──
  // A bell with a wandering hem, so three of them standing together do not read as one shape.
  const hem: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    const hx = x - 16 * S + u * 32 * S + sway * (0.2 + u * 0.1);
    const hy = y + 18 * S + Math.sin(u * 7 + t * 3 + seed) * 1.8 * S;
    hem.push(new Phaser.Geom.Point(hx, hy));
  }
  const robe: Phaser.Geom.Point[] = [
    new Phaser.Geom.Point(x - 8 * S + sway * 0.5, y - 12 * S + bob),
    new Phaser.Geom.Point(x + 8 * S + sway * 0.5, y - 12 * S + bob),
    ...hem.slice().reverse(),
  ];
  g.fillStyle(tint(BND.void), alpha);
  g.fillPoints(robe.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 1.14, y + (p.y - y) * 1.06)), true);
  g.fillStyle(tint(BND.cosmicDeep), alpha);
  g.fillPoints(robe, true);
  // One lit fold down the near side — the robe has a body-shaped absence in it.
  g.fillStyle(tint(BND.cosmic), alpha * (awakened ? 0.7 : 0.45));
  g.fillEllipse(x - 3 * S + sway * 0.4, y + 4 * S, 10 * S, 20 * S);

  // Hem band and vertical seams: gold, because everything the patron issues is a relic.
  g.lineStyle(2 * S, tint(BND.goldDeep), alpha * 0.95);
  g.strokePoints(hem, false);
  g.lineStyle(1 * S, tint(BND.gold), alpha * 0.7);
  for (let i = 0; i < 3; i++) {
    const u = 0.28 + i * 0.22;
    g.lineBetween(x - 6 * S + u * 12 * S + sway * 0.5, y - 8 * S + bob,
      x - 15 * S + u * 30 * S + sway * 0.3, y + 17 * S);
  }

  // ── Sleeves ──
  // Folded in front while hooded; thrown wide the moment the eyes are showing.
  const spread = awakened ? 11 * S : 4 * S;
  for (const side of [-1, 1] as const) {
    const ax = x + side * spread + sway * 0.6;
    const ay = y + (awakened ? -2 : 4) * S + bob * 0.6;
    g.fillStyle(tint(BND.cosmicDeep), alpha);
    g.fillEllipse(ax, ay, 8 * S, 11 * S);
    g.fillStyle(tint(BND.goldDeep), alpha * 0.9);
    g.fillEllipse(ax, ay + 5 * S, 6.4 * S, 3 * S);
    if (awakened) {
      // Bare hands out of the cuffs, lit from inside.
      g.fillStyle(tint(BND.goldLit), alpha * 0.85);
      g.fillCircle(ax + side * 2 * S, ay + 8 * S, 2.6 * S);
    }
  }

  // Cord belt with a hanging tassel.
  g.lineStyle(1.6 * S, tint(BND.gold), alpha * 0.9);
  g.lineBetween(x - 8 * S + sway * 0.5, y + 3 * S, x + 8 * S + sway * 0.5, y + 3 * S);
  const tas = Math.sin(t * 2.6 + seed) * 2 * S;
  g.lineStyle(1.2 * S, tint(BND.goldDeep), alpha * 0.85);
  g.lineBetween(x + 6 * S + sway * 0.5, y + 3 * S, x + 6 * S + tas, y + 12 * S);

  const hx = x + sway * 0.7;
  const hy = y - 16 * S + bob;

  if (!awakened) {
    // ── Cowl ──
    // A peak that overhangs the face, so what is under it is a hole rather than a head.
    const cowl: Phaser.Geom.Point[] = [
      new Phaser.Geom.Point(hx, hy - 12 * S),
      new Phaser.Geom.Point(hx + 10 * S, hy - 2 * S),
      new Phaser.Geom.Point(hx + 11 * S, hy + 8 * S),
      new Phaser.Geom.Point(hx - 11 * S, hy + 8 * S),
      new Phaser.Geom.Point(hx - 10 * S, hy - 2 * S),
    ];
    g.fillStyle(tint(BND.void), alpha);
    g.fillPoints(cowl.map((p) => new Phaser.Geom.Point(hx + (p.x - hx) * 1.16, hy + (p.y - hy) * 1.12)), true);
    g.fillStyle(tint(BND.cosmicDeep), alpha);
    g.fillPoints(cowl, true);

    // The face opening: an almond of absolute nothing, set low under the brow of the hood.
    g.fillStyle(tint(BND.void), alpha);
    g.fillEllipse(hx, hy + 4 * S, 12 * S, 7 * S);
    // Two pinpricks in it, barely there. A hood with nothing in it is scenery.
    g.fillStyle(tint(BND.aether), alpha * (0.4 + 0.3 * Math.sin(t * 3 + seed)));
    g.fillCircle(hx - 3 * S, hy + 4 * S, 1.1 * S);
    g.fillCircle(hx + 3 * S, hy + 4.4 * S, 1.1 * S);

    // Gold trim running the edge of the cowl, and the patron's eye stitched on the front of it.
    g.lineStyle(1.8 * S, tint(BND.goldDeep), alpha * 0.95);
    g.strokePoints(cowl, true);
    patronEye(g, tint, hx, hy - 3.5 * S, 5.6 * S,
      0.34 + 0.16 * Math.sin(t * 1.7 + seed), alpha,
      { drift: Math.sin(t * 0.9 + seed), t, brow: false });
    return;
  }

  // ── Awakened ──
  // The hood comes off backwards and folds into a collar; the light it was hiding comes out.
  g.fillStyle(tint(BND.cosmicDeep), alpha);
  g.fillEllipse(hx - 9 * S, hy + 11 * S, 15 * S, 9 * S);
  g.fillEllipse(hx + 9 * S, hy + 11 * S, 15 * S, 9 * S);
  g.lineStyle(1.6 * S, tint(BND.goldDeep), alpha * 0.9);
  g.strokeEllipse(hx - 9 * S, hy + 11 * S, 15 * S, 9 * S);
  g.strokeEllipse(hx + 9 * S, hy + 11 * S, 15 * S, 9 * S);

  // Glow first, so the cluster reads as a light source sitting on the shoulders.
  g.fillStyle(tint(BND.goldLit), alpha * (0.12 + 0.06 * Math.sin(t * 5 + seed)));
  g.fillCircle(hx, hy + 2 * S, 20 * S);
  g.fillStyle(tint(BND.cosmicDeep), alpha * 0.9);
  g.fillEllipse(hx, hy + 2 * S, 22 * S, 24 * S);

  // The mass. Seven eyes on a fixed seed so the face keeps its shape between frames, each with
  // its own aperture and its own drift — none of them is looking at what the others are.
  for (let i = 0; i < 7; i++) {
    const a = jitter(seed + 5, i) * TAU;
    const d = (0.25 + jitter(seed + 5, 10 + i) * 0.75) * 9 * S;
    const r = (2.6 + jitter(seed + 5, 20 + i) * 2.6) * S;
    patronEye(g, tint,
      hx + Math.cos(a) * d, hy + 2 * S + Math.sin(a) * d * 1.15, r,
      0.5 + 0.45 * Math.sin(t * (1.4 + i * 0.3) + i * 2), alpha,
      { drift: Math.sin(t * (0.8 + i * 0.2) + i), t, brow: false });
  }
  // Light spilling out of the seams the eyes are set in.
  g.lineStyle(1 * S, tint(BND.goldLit), alpha * (0.3 + 0.25 * Math.sin(t * 6 + seed)));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + t * 0.5;
    g.lineBetween(hx + Math.cos(a) * 10 * S, hy + 2 * S + Math.sin(a) * 11 * S,
      hx + Math.cos(a) * 16 * S, hy + 2 * S + Math.sin(a) * 18 * S);
  }
}

/**
 * Eviscerate, winding up. Shards spiral in toward the caster's raised hand and the ring around
 * them closes as the charge fills — the same gesture the barrage will make in reverse.
 */
export function eviscerateCharge(
  g: Phaser.GameObjects.Graphics,
  tint: BindColorFn,
  x: number, y: number, k: number, alpha: number, t: number,
): void {
  const full = k >= 0.995;
  g.lineStyle(2 + k * 2, tint(full ? BND.goldLit : BND.gold), alpha * (0.4 + k * 0.55));
  g.strokeCircle(x, y - 34, 30 * (1 - k * 0.62) + 4);
  g.lineStyle(1.2, tint(BND.cosmicLit), alpha * 0.5);
  g.strokeCircle(x, y - 34, 34 * (1 - k * 0.5) + 4);

  const n = 3 + Math.round(k * 5);
  for (let i = 0; i < n; i++) {
    const a = t * (2.2 + k * 3.4) + (i / n) * TAU;
    const d = (30 - k * 19) + Math.sin(t * 5 + i) * 2;
    oblivionShard(g, tint, x + Math.cos(a) * d, y - 34 + Math.sin(a) * d * 0.7,
      a + Math.PI, alpha * (0.55 + k * 0.45), { scale: 0.5 + k * 0.34, eye: k });
  }
  if (full) {
    // Topped out: the god has heard enough. A hard gold flare, and nothing more is gained.
    g.fillStyle(tint(BND.goldLit), alpha * (0.2 + 0.2 * Math.sin(t * 16)));
    g.fillCircle(x, y - 34, 13);
  }
}

/**
 * The footprint the barrage is currently going to land in, drawn at the cursor. A charge that
 * tightens the spread has to be legible as a *place*, not as a bar — this is that place.
 */
export function spreadReticle(
  g: Phaser.GameObjects.Graphics,
  tint: BindColorFn,
  x: number, y: number, r: number, alpha: number, k: number, t: number,
): void {
  g.lineStyle(1.6, tint(BND.goldDeep), alpha * 0.5);
  g.strokeCircle(x, y, r);
  // Dashes, closing in as the charge fills.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU + t * 0.6;
    if (i % 2) continue;
    g.lineStyle(2.2, tint(k > 0.85 ? BND.goldLit : BND.gold), alpha * (0.5 + k * 0.45));
    g.lineBetween(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86,
      x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  g.lineStyle(1.4, tint(BND.aether), alpha * 0.8);
  g.lineBetween(x - 7, y, x + 7, y);
  g.lineBetween(x, y - 7, x, y + 7);
}

/**
 * Over-rage: the beam being held past the point the patron said stop. Red where the element is
 * usually gold, with the heat cracking off the body in rings — the only place in Bind where the
 * alarm colour touches the *player* rather than the bar.
 */
export function overrageAura(
  g: Phaser.GameObjects.Graphics,
  tint: BindColorFn,
  x: number, y: number, alpha: number, t: number,
): void {
  for (let i = 0; i < 3; i++) {
    const u = ((t * 1.5 + i / 3) % 1);
    g.lineStyle(2.6 * (1 - u) + 0.4, tint(i % 2 ? BND.wrath : BND.heat), alpha * (1 - u) * 0.7);
    g.strokeCircle(x, y, 16 + u * 30);
  }
  // Embers coming off the shoulders, because something is actually burning.
  for (let i = 0; i < 7; i++) {
    const u = ((t * 1.1 + jitter(9, i)) % 1);
    const a = jitter(9, 10 + i) * TAU;
    g.fillStyle(tint(u < 0.5 ? BND.heat : BND.wrath), alpha * (1 - u) * 0.8);
    g.fillCircle(x + Math.cos(a) * 15, y - u * 34 + Math.sin(a) * 8, 2.4 * (1 - u) + 0.6);
  }
}

/**
 * Chosen Vessel: a rung of gold light per hex still standing, climbing the body. Deliberately
 * drawn as steps rather than as a glow — the bonus is counted, so the tell has to be countable.
 */
export function vesselHalo(
  g: Phaser.GameObjects.Graphics,
  tint: BindColorFn,
  x: number, y: number, hexes: number, alpha: number, t: number,
): void {
  for (let i = 0; i < hexes; i++) {
    const lift = ((t * 0.7 + i * 0.33) % 1);
    const ry = y + 16 - lift * 42;
    const w = 30 - lift * 10;
    g.lineStyle(2.2, tint(BND.goldLit), alpha * (1 - lift) * 0.8);
    g.strokeEllipse(x, ry, w * 2, w * 0.6);
    g.fillStyle(tint(BND.gold), alpha * (1 - lift) * 0.7);
    for (const side of [-1, 1] as const) {
      g.fillTriangle(x + side * w, ry, x + side * (w - 5), ry - 5, x + side * (w - 5), ry + 5);
    }
  }
  g.fillStyle(tint(BND.goldLit), alpha * (0.06 + hexes * 0.05));
  g.fillEllipse(x, y, 46, 54);
}

/**
 * Mastery — the mark of the vessel: a knot of the patron's own cosmic dark hanging over the body
 * with a small copy of its eye set into it, tethered down by a thread of gold.
 *
 * Deliberately the *same two painters* the sky uses at a fifth of the size rather than a bespoke
 * badge, because the whole passive is "you are carrying a piece of it now" — and it means the eye
 * on the body reddens, opens and grows its ring of spikes on `wrath` in exactly the same frames
 * the one in the ceiling does.
 */
export function vesselMark(
  g: Phaser.GameObjects.Graphics,
  tint: BindColorFn,
  x: number, y: number, r: number, alpha: number,
  { wrath = 0, t = 0, seed = 11 } = {},
): void {
  cosmicVeil(g, tint, x, y + r * 0.2, r * 5.2, r * 2.8, alpha * (0.42 + wrath * 0.2), t * 0.85, seed);
  patronEye(g, tint, x, y, r, 0.36 + wrath * 0.4, alpha,
    { wrath, drift: Math.sin(t * 1.1 + seed) * 0.8, t, brow: false });
  // The tether. Without it the eye reads as escorting the body rather than being worn by it.
  const col = wrath > 0.02 ? BND.wrath : BND.gold;
  g.lineStyle(1.6, tint(col), alpha * 0.45);
  g.lineBetween(x, y + r * 0.7, x + Math.sin(t * 1.6 + seed) * 2, y + r * 2.2);
  if (wrath > 0.02) {
    // Enraged: the knot bleeds red motes down onto the shoulders it is sitting on.
    for (let i = 0; i < 5; i++) {
      const u = ((t * 1.3 + jitter(seed, i)) % 1);
      g.fillStyle(tint(i % 2 ? BND.wrath : BND.wrathDeep), alpha * (1 - u) * 0.7);
      g.fillCircle(x + (jitter(seed, 20 + i) - 0.5) * r * 2.4, y + r * 0.6 + u * r * 2.6,
        1.8 * (1 - u) + 0.5);
    }
  }
}

/**
 * The vessel's own dagger: a stubby two-facet gold blade with the patron's eye set through the
 * crossguard and a single chain link hanging off the pommel. Drawn point-first along `ang`, so one
 * painter serves both the stab into your own chest and the little lunge the taken slot hands back.
 */
export function ritualDagger(
  g: Phaser.GameObjects.Graphics,
  tint: BindColorFn,
  x: number, y: number, ang: number, alpha: number, scale = 1,
): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const L = 17 * scale;
  const W = 3.4 * scale;
  const tipX = x + c * L;
  const tipY = y + s * L;
  // Two asymmetric facets sharing the spine, so the blade reads as carved rather than as a lozenge.
  g.fillStyle(tint(BND.goldDeep), alpha);
  g.fillTriangle(tipX, tipY, x - s * W, y + c * W, x - c * W, y - s * W);
  g.fillStyle(tint(BND.gold), alpha);
  g.fillTriangle(tipX, tipY, x + s * W * 0.8, y - c * W * 0.8, x - c * W, y - s * W);
  g.fillStyle(tint(BND.goldLit), alpha * 0.9);
  g.fillTriangle(tipX, tipY, x + s * W * 0.35, y - c * W * 0.35, x, y);
  // Crossguard, and the eye set through it.
  g.lineStyle(2.4 * scale, tint(BND.chain), alpha);
  g.lineBetween(x - s * W * 2.3, y + c * W * 2.3, x + s * W * 2.3, y - c * W * 2.3);
  g.fillStyle(tint(BND.void), alpha);
  g.fillCircle(x, y, 2.7 * scale);
  g.fillStyle(tint(BND.iris), alpha);
  g.fillCircle(x, y, 1.9 * scale);
  g.fillStyle(tint(BND.void), alpha);
  g.fillEllipse(x, y, 0.8 * scale, 3.2 * scale);
  // Grip and a chained pommel — everything this element holds is on a leash.
  const gx = x - c * L * 0.62;
  const gy = y - s * L * 0.62;
  g.lineStyle(3.4 * scale, tint(BND.chainLit), alpha * 0.9);
  g.lineBetween(x - c * W, y - s * W, gx, gy);
  chainLink(g, tint, gx - c * 3.2 * scale, gy - s * 3.2 * scale, ang, alpha * 0.9, scale * 0.85, 0);
}

/**
 * Pathetic Stab: the lunge, drawn as the wake behind the dagger rather than as the dagger. A thin
 * gold smear down the run with a few shed motes off it — small on purpose. The ability is meant to
 * look like the consolation prize it is.
 */
export function patheticLunge(
  g: Phaser.GameObjects.Graphics,
  tint: BindColorFn,
  x0: number, y0: number, x1: number, y1: number, alpha: number, seed = 3,
): void {
  g.lineStyle(9, tint(BND.cosmicDeep), alpha * 0.22);
  g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(3, tint(BND.goldDeep), alpha * 0.6);
  g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(1.1, tint(BND.goldLit), alpha * 0.85);
  g.lineBetween(x0, y0, x1, y1);
  for (let i = 0; i < 4; i++) {
    const u = jitter(seed, i);
    const px = Phaser.Math.Linear(x0, x1, u);
    const py = Phaser.Math.Linear(y0, y1, u);
    g.fillStyle(tint(BND.gold), alpha * 0.5);
    g.fillCircle(px + (jitter(seed, 10 + i) - 0.5) * 7, py + (jitter(seed, 20 + i) - 0.5) * 7, 1.7);
  }
}

/** One link of chain, drawn as a ring squashed along its run. The avatar is made of these. */
export function chainLink(
  g: Phaser.GameObjects.Graphics,
  tint: BindColorFn,
  x: number, y: number, ang: number, alpha: number, scale = 1, strain = 0,
): void {
  const w = 5 * scale;
  const h = 3.4 * scale;
  const col = strain > 0.5 ? BND.chainLit : BND.chain;
  g.lineStyle(1.9 * scale, tint(BND.void), alpha * 0.8);
  g.strokeEllipse(x, y, w * 2.2, h * 2.2);
  g.lineStyle(1.4 * scale, tint(col), alpha);
  // Rotation is not available on strokeEllipse, so the run direction is faked with two arcs.
  g.beginPath();
  g.arc(x, y, w, ang - 1.9, ang + 1.9, false);
  g.strokePath();
  g.beginPath();
  g.arc(x, y, w, ang + Math.PI - 1.9, ang + Math.PI + 1.9, false);
  g.strokePath();
  g.lineStyle(1 * scale, tint(BND.chainLit), alpha * 0.7);
  g.lineBetween(x + Math.cos(ang + 1.57) * h, y + Math.sin(ang + 1.57) * h,
    x - Math.cos(ang + 1.57) * h, y - Math.sin(ang + 1.57) * h);
}

// ── Fx ────────────────────────────────────────────────────────────────────

/** Bind's one-shot effects. Everything sustained is painted per-frame by the kit instead. */
export class BindFx extends FxBase {
  /** A shard bursting: the gold coming apart and the eye inside it opening as it goes. */
  shardBurst(x: number, y: number, turned: boolean, depth = 16): void {
    const seed = Math.random() * 999;
    this.anim(depth, 380, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(2.6 * (1 - t) + 0.4, this.tint(turned ? BND.wrath : BND.gold), (1 - t) * 0.9);
      g.strokeCircle(x, y, 6 + e * 26);
      for (let i = 0; i < 6; i++) {
        const a = jitter(seed, i) * TAU;
        const d = e * (10 + jitter(seed, 10 + i) * 18);
        oblivionShard(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d, a,
          (1 - t) * 0.9, { scale: 0.55, eye: 1 - t, turned });
      }
      patronEye(g, this.tint, x, y, 9 * (0.6 + e), 1 - t, (1 - t) * 0.8,
        { wrath: turned ? 1 : 0, t, brow: false });
    });
  }

  /** The beam biting: a small ring and a scatter of glyph sparks at the contact point. */
  scald(x: number, y: number, heat: number, depth = 16): void {
    const seed = Math.random() * 999;
    this.anim(depth, 260, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(2.4 * (1 - t) + 0.4, this.tint(heat > 0.7 ? BND.heat : BND.gold), (1 - t) * 0.85);
      g.strokeCircle(x, y, 5 + e * (14 + heat * 16));
      for (let i = 0; i < 5; i++) {
        const a = jitter(seed, i) * TAU;
        const d = e * (8 + jitter(seed, 10 + i) * 16);
        g.fillStyle(this.tint(BND.goldLit), (1 - t) * 0.8);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 2 * (1 - t) + 0.5);
      }
    });
  }

  /** A ward eating a hit: the hexes flaring gold and the damage draining upward as anger. */
  wardBlock(x: number, y: number, depth = 17): void {
    this.anim(depth, 520, (g, t) => {
      const e = easeOut(t);
      hexWard(g, this.tint, x, y, 34 + e * 14, (1 - t) * 0.95, 3, t * 6);
      g.lineStyle(2.2, this.tint(BND.wrath), (1 - t) * 0.7);
      for (let i = 0; i < 3; i++) {
        const px = x + (i - 1) * 9;
        g.lineBetween(px, y - 10 - e * 26, px, y - 22 - e * 34);
      }
    });
  }

  /** The idol taking a meal: a column of faith rising off whoever fed it. */
  offering(x: number, y: number, depth = 15): void {
    this.anim(depth, 620, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 4; i++) {
        const u = Phaser.Math.Clamp(t * 1.6 - i * 0.18, 0, 1);
        if (u <= 0) continue;
        g.fillStyle(this.tint(BND.aether), (1 - u) * 0.7);
        g.fillCircle(x + Math.sin(u * 7 + i) * 6, y - u * 40, 3 * (1 - u) + 1);
      }
      g.lineStyle(1.4, this.tint(BND.gold), (1 - t) * 0.5);
      g.strokeEllipse(x, y + 10, 26 * (0.5 + e), 9 * (0.5 + e));
    });
  }

  /** A claw coming out of the sky: three parallel gashes torn across the target. */
  swipe(x: number, y: number, ang: number, reach: number, turned: boolean, depth = 17): void {
    this.flashIn(x, y, reach * 0.4, BND.goldLit, turned ? BND.wrath : BND.iris, depth);
    this.anim(depth, 460, (g, t) => {
      const e = easeOut(t);
      for (let i = -1; i <= 1; i++) {
        const off = i * 16;
        const a = ang + i * 0.12;
        const x0 = x - Math.cos(a) * reach * 0.6 - Math.sin(a) * off;
        const y0 = y - Math.sin(a) * reach * 0.6 + Math.cos(a) * off;
        const x1 = x0 + Math.cos(a) * reach * 1.6 * e;
        const y1 = y0 + Math.sin(a) * reach * 1.6 * e;
        g.lineStyle(9 * (1 - t) + 1, this.tint(BND.cosmicDeep), (1 - t) * 0.6);
        g.lineBetween(x0, y0, x1, y1);
        g.lineStyle(3.4 * (1 - t) + 0.6, this.tint(turned ? BND.wrath : BND.goldLit), (1 - t) * 0.95);
        g.lineBetween(x0, y0, x1, y1);
      }
    });
  }

  /** A beam of dark light landing: the arena punched out, then the light falling back in. */
  darkBlast(x: number, y: number, r: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.anim(depth, 720, (g, t) => {
      const e = easeOut(t);
      // The column first, from the sky down.
      const k = Phaser.Math.Clamp(t * 4, 0, 1);
      g.fillStyle(this.tint(BND.void), (1 - t) * 0.7);
      g.fillRect(x - r * 0.45, y - 900 * k, r * 0.9, 900 * k);
      g.fillStyle(this.tint(BND.cosmic), (1 - t) * 0.5);
      g.fillRect(x - r * 0.24, y - 900 * k, r * 0.48, 900 * k);
      g.fillStyle(this.tint(BND.iris), (1 - t) * 0.85);
      g.fillRect(x - 4, y - 900 * k, 8, 900 * k);

      g.lineStyle(6 * (1 - t) + 1, this.tint(BND.iris), (1 - t) * 0.9);
      g.strokeCircle(x, y, r * e);
      for (let i = 0; i < 12; i++) {
        const a = jitter(seed, i) * TAU;
        const d = r * e * (0.5 + jitter(seed, 20 + i) * 0.7);
        oblivionShard(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7,
          a, (1 - t) * 0.8, { scale: 0.6, eye: 0.6 });
      }
    });
  }

  /** The patron turning: a red bloom across the whole top of the arena. */
  wrath(x: number, y: number, depth = 22): void {
    this.anim(depth, 1000, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(8 * (1 - t) + 1, this.tint(BND.wrath), (1 - t) * 0.85);
      g.strokeEllipse(x, y, 900 * e, 500 * e);
      g.fillStyle(this.tint(BND.wrathDeep), (1 - t) * 0.25);
      g.fillEllipse(x, y, 700 * e, 380 * e);
      patronEye(g, this.tint, x, y + 12, 54 * (1 + e * 0.3), 1, 1 - easeIn(t),
        { wrath: 1, drift: Math.sin(t * 9), t: t * 6 });
    });
  }

  /** A convert arriving: the robe rising out of the floor with the eye lighting up last. */
  cultistRise(x: number, y: number, depth = 16): void {
    this.anim(depth, 700, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(2.6 * (1 - t) + 0.5, this.tint(BND.gold), (1 - t) * 0.8);
      g.strokeEllipse(x, y + 18, 46 * e, 15 * e);
      // The robe unfolding upward out of its own shadow.
      cultistFigure(g, this.tint, x, y + (1 - e) * 26, Math.min(1, t * 2.4) * 0.9,
        { t: t * 6, seed: 4, scale: 0.5 + e * 0.5 });
      for (let i = 0; i < 6; i++) {
        const a = jitter(21, i) * TAU;
        g.fillStyle(this.tint(BND.aether), (1 - t) * 0.7);
        g.fillCircle(x + Math.cos(a) * 20 * e, y + 14 - e * 32 + Math.sin(a) * 6, 2.4 * (1 - t) + 0.6);
      }
    });
  }

  /** The hood coming off: it flies back and the light that was under it floods out. */
  cultistAwaken(x: number, y: number, depth = 17): void {
    this.anim(depth, 620, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(BND.goldLit), (1 - t) * 0.5);
      g.fillCircle(x, y - 16, 10 + e * 30);
      g.lineStyle(3 * (1 - t) + 0.5, this.tint(BND.gold), (1 - t) * 0.9);
      g.strokeCircle(x, y - 16, 8 + e * 40);
      // Eyes opening outward through the flare.
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + t * 2;
        const d = e * 26;
        patronEye(g, this.tint, x + Math.cos(a) * d, y - 16 + Math.sin(a) * d * 0.8,
          5 * (1 - t * 0.4), e, (1 - t) * 0.95, { drift: Math.sin(t * 8 + i), t: t * 5, brow: false });
      }
    });
  }

  /** A cultist crossing the room: a gold smear with the robe's afterimages strung along it. */
  cultistDash(x0: number, y0: number, x1: number, y1: number, depth = 16): void {
    this.anim(depth, 300, (g, t) => {
      const a = 1 - t;
      g.lineStyle(13 * a + 1, this.tint(BND.cosmic), a * 0.3);
      g.lineBetween(x0, y0, x1, y1);
      g.lineStyle(4.4 * a + 0.6, this.tint(BND.goldLit), a * 0.85);
      g.lineBetween(x0, y0, x1, y1);
      for (let i = 1; i <= 3; i++) {
        const u = i / 4;
        cultistFigure(g, this.tint, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, a * 0.35,
          { awakened: true, t: t * 4, seed: i, scale: 0.85 });
      }
    });
  }

  /** The end of the ultimate: a cultist puts a shard of oblivion into its own chest. */
  cultistStab(x: number, y: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.anim(depth, 760, (g, t) => {
      const e = easeOut(t);
      // The figure folding, then coming apart into the gold it was wearing.
      cultistFigure(g, this.tint, x, y + e * 8, (1 - t) * 0.95,
        { awakened: true, t: t * 3, seed, lean: e * 0.5, scale: 1 - e * 0.25 });
      // The shard going in, hilt-first out of the chest.
      const k = Math.min(1, t * 3);
      oblivionShard(g, this.tint, x, y - 2 - (1 - k) * 22, Math.PI / 2,
        (1 - t) * 0.95, { scale: 1.15, eye: 1 - t });
      if (t > 0.3) {
        const u = (t - 0.3) / 0.7;
        g.lineStyle(2.4 * (1 - u) + 0.4, this.tint(BND.gold), (1 - u) * 0.8);
        g.strokeCircle(x, y - 2, 6 + u * 30);
        for (let i = 0; i < 7; i++) {
          const a = jitter(seed, i) * TAU;
          const d = u * (14 + jitter(seed, 10 + i) * 26);
          g.fillStyle(this.tint(BND.goldLit), (1 - u) * 0.75);
          g.fillCircle(x + Math.cos(a) * d, y - 2 + Math.sin(a) * d * 0.8 - u * 12, 2.2 * (1 - u) + 0.5);
        }
      }
    });
  }

  /** The corner chains arriving: four runs slamming taut around whoever just opened the sky. */
  chainDown(x: number, y: number, corners: [number, number][], depth = 18): void {
    this.anim(depth, 520, (g, t) => {
      const e = easeOut(t);
      arenaBinding(g, this.tint, x, y, corners, (1 - t) * 0.9, e, t * 8);
      g.lineStyle(4 * (1 - t) + 0.6, this.tint(BND.chainLit), (1 - t) * 0.8);
      g.strokeCircle(x, y, 20 + e * 38);
    });
  }

  /**
   * Mastery — Ritual Sacrifice: the vessel's dagger driven hilt-deep into its own chest, and gold
   * coming out rather than red. The thrust is over in the first fifth of the animation; the rest
   * of it is the patron's anger leaving the body as a ring of the stuff.
   */
  ritualStab(x: number, y: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.anim(depth, 620, (g, t) => {
      const k = Math.min(1, t * 5);
      ritualDagger(g, this.tint, x + 3 - k * 3, y - 6 - (1 - k) * 26, Math.PI * 0.58,
        (1 - t) * 0.95, 1.05);
      // The offering leaving: a ring of gold opening off the wound, and motes going up.
      if (t > 0.18) {
        const u = (t - 0.18) / 0.82;
        g.lineStyle(2.6 * (1 - u) + 0.4, this.tint(BND.gold), (1 - u) * 0.75);
        g.strokeCircle(x, y - 2, 5 + u * 26);
        g.lineStyle(1.2 * (1 - u) + 0.3, this.tint(BND.goldLit), (1 - u) * 0.6);
        g.strokeCircle(x, y - 2, 3 + u * 17);
        for (let i = 0; i < 8; i++) {
          const a = jitter(seed, i) * TAU;
          const d = u * (10 + jitter(seed, 10 + i) * 22);
          g.fillStyle(this.tint(i % 3 ? BND.goldLit : BND.iris), (1 - u) * 0.8);
          g.fillCircle(x + Math.cos(a) * d, y - 2 + Math.sin(a) * d * 0.7 - u * 16,
            2.1 * (1 - u) + 0.5);
        }
      }
    });
  }

  /** Mastery — Pathetic Stab landing: one small gold puncture, and nothing else. */
  stabHit(x: number, y: number, ang: number, depth = 17): void {
    this.anim(depth, 300, (g, t) => {
      const e = easeOut(t);
      ritualDagger(g, this.tint, x - Math.cos(ang) * (10 - e * 8), y - Math.sin(ang) * (10 - e * 8),
        ang, (1 - t) * 0.9, 0.9);
      g.lineStyle(2 * (1 - t) + 0.3, this.tint(BND.goldLit), (1 - t) * 0.8);
      g.strokeCircle(x, y, 4 + e * 15);
    });
  }

  /**
   * Mastery — the enrage lighting: the mark on the body goes red, and the body goes with it. A
   * red shell blowing outward through a shed layer of whatever was stuck to it.
   */
  vesselEnrage(x: number, y: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.anim(depth, 720, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 3; i++) {
        const u = Phaser.Math.Clamp(e * 1.2 - i * 0.16, 0, 1);
        g.lineStyle(4 * (1 - u) + 0.6, this.tint(i % 2 ? BND.wrath : BND.wrathDeep), (1 - u) * 0.8);
        g.strokeCircle(x, y, 14 + u * 62);
      }
      // The debuffs coming off, drawn as grey scraps thrown clear of the body.
      for (let i = 0; i < 9; i++) {
        const a = jitter(seed, i) * TAU;
        const d = e * (22 + jitter(seed, 10 + i) * 40);
        g.fillStyle(this.tint(i % 2 ? BND.chain : BND.cosmicDeep), (1 - t) * 0.7);
        g.fillRect(x + Math.cos(a) * d - 2, y + Math.sin(a) * d * 0.8 - 2,
          3.6 * (1 - t) + 0.8, 3.6 * (1 - t) + 0.8);
      }
      patronEye(g, this.tint, x, y - 30, 13 * (1 + e * 0.5), 1, (1 - t) * 0.9,
        { wrath: 1, drift: Math.sin(t * 22), t: t * 6, brow: false });
    });
  }

  /** The shed particle behind a moving hand: a mote of the patron's own dust. */
  mote(x: number, y: number, depth = 4): void {
    const a = Math.random() * TAU;
    this.anim(depth, 480, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(t < 0.5 ? BND.goldLit : BND.cosmicLit), (1 - t) * 0.6);
      g.fillCircle(x + Math.cos(a) * 9 * e, y + Math.sin(a) * 9 * e - t * 7, 2.2 * (1 - t) + 0.5);
    });
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const BIND_AVATAR: AvatarSpec = {
  hands: [
    { r: 13.5, color: BND.cosmicDeep, alpha: 0.32 },
    { r: 7.2, color: BND.chain, alpha: 0.92 },
    { r: 2.8, color: BND.goldLit, alpha: 0.95, ox: -1.6, oy: -1.9 },
  ],
  eyeWhite: BND.goldLit,
  eyePupil: BND.void,
  // Dragging weight: the squash is slow and shallow, like something hauling its own chains.
  squash: { div: 20, x: 0.36, y: 0.22 },
};

/**
 * The bound thing.
 *
 * Three ideas, in order of how much they matter. First, the **chains**: four runs of link wrapped
 * around a body that is barely drawn at all, with a padlock hanging off each one. They are the
 * silhouette, they sway with movement, and they are the only cold-coloured thing in the element.
 * Second, the **strain**: `setStrain` pulls every chain taut and rattles the locks, and the kit
 * feeds it the patron's anger — so a character about to be turned on is visibly straining against
 * something. Third, the **gap**: under the chains there is no body, only cosmic dark with two
 * eyes in it, because whatever is wearing this is not a person.
 *
 * Mastered breaks the topmost lock open and leaves it hanging by one shackle — the only thing in
 * the element that ever looks like progress.
 */
export class BindAvatar extends BaseAvatar {
  /** 0–1: the patron's patience, running out. Drives chain tension and lock rattle. */
  private strain = 0;
  private strainTarget = 0;
  /** 0–1: raised while the god is awake and acting through this body. */
  private channel = 0;
  private channelTarget = 0;

  constructor(scene: Phaser.Scene, tint: BindColorFn, depth = 6) {
    super(scene, tint, depth, BIND_AVATAR);
  }

  /** How close the patron is to turning, 0–1. */
  setStrain(v: number): void { this.strainTarget = Phaser.Math.Clamp(v, 0, 1); }

  /** Whether the god is currently acting — awakened, or mid-beam. */
  setChannelling(on: boolean): void { this.channelTarget = on ? 1 : 0; }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.strain += (this.strainTarget - this.strain) * Math.min(1, delta / 300);
    this.channel += (this.channelTarget - this.channel) * Math.min(1, delta / 160);
    super.update(delta, x, y, alpha);
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.channelTarget = Math.max(this.channelTarget, 0.6);
    super.play(gesture, angle, duration);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(2, (glint) => {
      glint.setRadius(on ? 4 : 2.8);
      glint.setAlpha(on ? 1 : 0.95);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new BindFx(this.scene, this.tint).mote(x, y);
  }

  /** A shadow that is deeper than it should be, with the patron's colour bleeding through it. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    g.fillStyle(this.tint(BND.void), a * 0.6);
    g.fillEllipse(x, y + 17, 46, 15);
    g.fillStyle(this.tint(this.strain > 0.6 ? BND.wrathDeep : BND.cosmic), a * (0.18 + this.channel * 0.3));
    g.fillEllipse(x, y + 17, 32 + this.channel * 18, 11);
    g.fillStyle(this.tint(BND.gold), a * (0.06 + this.channel * 0.16));
    g.fillEllipse(x, y + 17, 16 + this.channel * 14, 6);
  }

  /**
   * The body: a hooded absence with a gold gorget at the throat, drawn dark enough that the
   * chains over it are what the eye actually reads.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const sway = Math.sin(this.t * 1.4) * 1.6 * (1 - this.strain * 0.6);

    const shell: Phaser.Geom.Point[] = [
      new Phaser.Geom.Point(x - 6, y - 19),
      new Phaser.Geom.Point(x + 6, y - 19),
      new Phaser.Geom.Point(x + 13, y - 4),
      new Phaser.Geom.Point(x + 15 + sway * 0.4, y + 14),
      new Phaser.Geom.Point(x - 15 + sway * 0.4, y + 14),
      new Phaser.Geom.Point(x - 13, y - 4),
    ];
    g.fillStyle(this.tint(BND.void), alpha);
    g.fillPoints(shell.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 1.12, y + (p.y - y) * 1.08)), true);
    g.fillStyle(this.tint(BND.cosmicDeep), alpha);
    g.fillPoints(shell, true);
    // A single cosmic highlight inside the shell, so the absence has depth rather than being flat.
    g.fillStyle(this.tint(BND.cosmic), alpha * (0.35 + this.channel * 0.4));
    g.fillEllipse(x - 3, y + 2 + Math.sin(this.t * 2.1) * 1.5, 13, 17);

    // Gorget: a gold collar, the one relic it is allowed to keep.
    g.fillStyle(this.tint(BND.goldDeep), alpha);
    g.fillRect(x - 10, y - 17, 20, 5.4);
    g.fillStyle(this.tint(BND.gold), alpha);
    g.fillRect(x - 9, y - 16.4, 18, 3.4);
    g.fillStyle(this.tint(BND.iris), alpha * (0.5 + this.channel * 0.5));
    g.fillCircle(x, y - 14.6, 2.2);
  }

  /**
   * The chains and the locks. Four runs at different angles wrapped around the torso, each drawn
   * link by link so they can be pulled taut, plus a padlock hanging off two of them that swings
   * on its own pendulum and rattles as the strain comes up.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const rattle = this.strain * (Math.sin(this.t * 26) * 1.2);

    // ── Chain runs ──
    // Each run is a shallow arc across the body; tension flattens the arc and lifts the links.
    const runs: [number, number, number][] = [
      [-11, 0.42, 1],
      [-3, -0.36, -1],
      [5, 0.3, 1],
      [12, -0.24, -1],
    ];
    for (let r = 0; r < runs.length; r++) {
      const [oy, tilt, dir] = runs[r];
      const slack = (1 - this.strain) * 4;
      const links = 7;
      for (let i = 0; i < links; i++) {
        const u = i / (links - 1);
        const lx = x - 15 + u * 30;
        const droop = Math.sin(u * Math.PI) * slack;
        const ly = y + oy + tilt * (u - 0.5) * 22 + droop
          + Math.sin(this.t * 2.6 * dir + u * 3 + r) * (0.8 + this.strain * 1.4);
        chainLink(g, this.tint, lx, ly, tilt * 1.2 + rattle * 0.02, alpha * 0.95, 1, this.strain);
      }
    }

    // ── Padlocks ──
    // Two, on their own pendulums, hanging off the lower runs.
    for (const [side, anchorY] of [[-1, 6], [1, 13]] as const) {
      const swing = Math.sin(this.t * (2.2 + side * 0.4)) * (0.34 * (1 - this.strain * 0.5)) + rattle * 0.03;
      const ax = x + side * 11;
      const ay = y + anchorY;
      const lx = ax + Math.sin(swing) * 13;
      const ly = ay + Math.cos(swing) * 13;
      g.lineStyle(1.6, this.tint(BND.chain), alpha * 0.9);
      g.lineBetween(ax, ay, lx, ly);

      // Broken open once mastered — the shackle lifts clear on one side.
      const open = this.mastered && side < 0;
      g.lineStyle(2.2, this.tint(BND.chainLit), alpha);
      g.beginPath();
      g.arc(lx, ly - 4, 3.6, Math.PI + (open ? 0.9 : 0), TAU + (open ? 0.2 : 0), false);
      g.strokePath();
      g.fillStyle(this.tint(BND.goldDeep), alpha);
      g.fillRect(lx - 4.6, ly - 2, 9.2, 8);
      g.fillStyle(this.tint(open ? BND.goldLit : BND.gold), alpha);
      g.fillRect(lx - 3.8, ly - 1.3, 7.6, 6.6);
      g.fillStyle(this.tint(BND.void), alpha);
      g.fillCircle(lx, ly + 1.6, 1.5);
      g.fillRect(lx - 0.6, ly + 1.6, 1.2, 3);
    }

    // ── The patron's attention ──
    // While the god is acting through this body, a small ring of its own eyes orbits the crown.
    if (this.channel > 0.05) {
      const crown = y - 20;
      for (let i = 0; i < 3; i++) {
        const ang = this.t * 1.5 + (i / 3) * TAU;
        patronEye(g, this.tint,
          x + Math.cos(ang) * 17, crown + Math.sin(ang) * 6,
          4.4, 0.8, alpha * this.channel * 0.9,
          { wrath: this.strain > 0.95 ? 1 : 0, drift: Math.sin(this.t + i), t: this.t, brow: false });
      }
    }
  }
}
