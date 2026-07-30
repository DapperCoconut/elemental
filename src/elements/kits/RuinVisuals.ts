import Phaser from 'phaser';
import { ArmGesture, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Ruin draws.
 *
 * The element is decay with a point on it, so every primitive here is built out of two things
 * and nothing else: a *spike* (tapered, barbed, never a clean cone) and a *crack* (a jagged
 * polyline that forks and thins as it runs). The wedge you throw is a spike; the skewer is a
 * spike; the F ring is a circle of spikes coming up through cracked ground; the character's
 * back is a row of them and his frame is cracked from crown to feet.
 *
 * The other rule: nothing Ruin owns has a smooth edge or a full-strength fill. Metal is drawn
 * dark and pitted, the red is a dry brick red rather than a hot one, and every silhouette gets
 * a bite taken out of it somewhere. If a shape looks intact, it isn't Ruin's.
 */

export type RuinColorFn = ColorFn;

export const RUI = {
  /** The dark under everything — pits, sockets, the inside of a crack. */
  voidDark: 0x140a09,
  ash: 0x3a2422,
  /** Pitted iron: the skewer's shaft, the padlock's body. */
  iron: 0x6b524a,
  rust: 0xa4552a,
  ember: 0xe07a33,
  /** The element colour — a dry brick red, not a hot one. */
  red: 0xc4392c,
  blood: 0x8f1f18,
  bright: 0xff6a4d,
  bone: 0xe6d8cf,
  /** Unstoppable Decay's sickly ochre — the one colour that isn't red. */
  decay: 0xb08a3a,
};

/** Deterministic 0–1 noise, so anything that has to break the same way every frame can. */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 71.3 + i * 197.7) * 24137.351;
  return v - Math.floor(v);
}

/** Local (along-axis, across-axis) → world, for a shape rotated to `ang` about (x, y). */
function pt(x: number, y: number, ca: number, sa: number, u: number, v: number): Phaser.Geom.Point {
  return new Phaser.Geom.Point(x + ca * u - sa * v, y + sa * u + ca * v);
}

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * A rusted spike, root at (x, y) and point out along `ang`.
 *
 * Not a triangle: the two flanks are sampled independently off `seed` so the silhouette is
 * bitten and uneven, and `barbs` hangs backward-facing hooks off the shaft. `wear` (0–1)
 * eats the metal — at 1 the flanks are ragged and the rust bleeds most of the way to the tip.
 */
export function rustySpike(
  g: Phaser.GameObjects.Graphics,
  tint: RuinColorFn,
  x: number, y: number, ang: number,
  len: number, halfWidth: number, alpha: number,
  { seed = 0, wear = 0.5, barbs = 2, color = RUI.iron } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const steps = 6;

  const flank = (side: number): Phaser.Geom.Point[] => {
    const out: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= steps; i++) {
      const s = i / steps;
      // Taper is quadratic so the point stays needle-thin while the root stays broad.
      const w = halfWidth * (1 - s) * (1 - s * 0.35);
      const bite = (jitter(seed + side * 13, i) - 0.5) * halfWidth * 0.7 * wear * (1 - s * 0.6);
      out.push(P(len * s, side * (w + bite)));
    }
    return out;
  };

  const outline = [...flank(-1), ...flank(1).reverse()];

  // Cast shadow, offset down the screen rather than along the spike — the shaft floats above
  // whatever it is over.
  g.fillStyle(tint(RUI.voidDark), alpha * 0.5);
  g.fillPoints(outline.map((p) => new Phaser.Geom.Point(p.x, p.y + 3)), true);

  g.fillStyle(tint(color), alpha * 0.95);
  g.fillPoints(outline, true);

  // Rust bleeding up from the root, and a lit edge along one flank only.
  g.fillStyle(tint(RUI.rust), alpha * 0.55);
  g.fillPoints([...flank(-1).slice(0, 4), ...flank(1).slice(0, 4).reverse()], true);
  g.lineStyle(1.4, tint(RUI.bone), alpha * 0.35);
  const lit = flank(-1);
  for (let i = 1; i < lit.length; i++) g.lineBetween(lit[i - 1].x, lit[i - 1].y, lit[i].x, lit[i].y);

  // Pitting: holes eaten clean through the metal.
  g.fillStyle(tint(RUI.voidDark), alpha * 0.65);
  for (let i = 0; i < 4; i++) {
    const s = 0.12 + jitter(seed, 40 + i) * 0.6;
    const p = P(len * s, (jitter(seed, 50 + i) - 0.5) * halfWidth * (1 - s));
    g.fillCircle(p.x, p.y, (0.6 + jitter(seed, 60 + i) * 1.4) * (halfWidth / 8));
  }

  // Barbs — hooks raked backward, so the thing reads as impossible to pull out.
  for (let i = 0; i < barbs; i++) {
    const s = 0.34 + (i / Math.max(1, barbs)) * 0.42;
    const side = i % 2 === 0 ? 1 : -1;
    const w = halfWidth * (1 - s);
    const root = P(len * s, side * w);
    const tip = P(len * (s - 0.16), side * (w + halfWidth * 0.95));
    const back = P(len * (s - 0.05), side * w * 0.6);
    g.fillStyle(tint(color), alpha * 0.95);
    g.fillPoints([root, tip, back], true);
    g.lineStyle(1, tint(RUI.voidDark), alpha * 0.6);
    g.lineBetween(root.x, root.y, tip.x, tip.y);
  }
}

/**
 * The Shred Slice wedge: a thick arrowhead with the trailing edge torn out of it, spinning
 * slowly on its own axis. Deliberately fatter than any other projectile in the game — the
 * ability's whole promise is that it goes *through* things, and a needle wouldn't read that way.
 */
export function shredWedge(
  g: Phaser.GameObjects.Graphics,
  tint: RuinColorFn,
  x: number, y: number, ang: number, len: number, alpha: number, spin: number, seed = 0,
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const half = len * 0.44 * (0.82 + 0.18 * Math.cos(spin));
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);

  // Motion smear behind it, so a shot crossing the arena leaves a wound in the air.
  g.fillStyle(tint(RUI.blood), alpha * 0.18);
  g.fillPoints([P(-len * 1.5, -half * 0.5), P(-len * 0.2, -half), P(-len * 0.2, half), P(-len * 1.5, half * 0.5)], true);

  // The notch: the back edge is bitten in toward the point, which is what makes it a shred
  // rather than a dart.
  const notch = len * 0.3;
  const body = [
    P(len * 0.62, 0),
    P(-len * 0.32, -half),
    P(-len * 0.32 + notch, -half * 0.28),
    P(-len * 0.32 + notch, half * 0.28),
    P(-len * 0.32, half),
  ];

  g.fillStyle(tint(RUI.voidDark), alpha * 0.55);
  g.fillPoints(body.map((p) => new Phaser.Geom.Point(p.x, p.y + 3)), true);
  g.fillStyle(tint(RUI.red), alpha * 0.95);
  g.fillPoints(body, true);
  g.fillStyle(tint(RUI.blood), alpha * 0.8);
  g.fillPoints([P(len * 0.62, 0), P(-len * 0.32, half), P(-len * 0.32 + notch, half * 0.28)], true);

  // Serrations along the leading edges — the teeth that do the cutting.
  g.lineStyle(1.6, tint(RUI.bone), alpha * 0.7);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const s0 = 0.62 - i * 0.24;
      const s1 = s0 - 0.12;
      const a = P(len * s0, side * half * (0.62 - s0 * 0.62));
      const b = P(len * s1, side * half * (0.62 - s1 * 0.62) + side * 2.4);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  // Rust freckling, fixed to the wedge so it spins with it rather than crawling.
  g.fillStyle(tint(RUI.rust), alpha * 0.8);
  for (let i = 0; i < 5; i++) {
    const p = P(len * (0.4 - jitter(seed, i) * 0.6), (jitter(seed, 20 + i) - 0.5) * half * 1.2);
    g.fillCircle(p.x, p.y, 0.9 + jitter(seed, 30 + i) * 1.5);
  }
  const tip = P(len * 0.62, 0);
  g.fillStyle(tint(RUI.bright), alpha * 0.85);
  g.fillCircle(tip.x, tip.y, 2 + Math.abs(Math.sin(spin * 2)) * 1.2);
}

/**
 * A web of cracks spreading from a point. `grow` (0–1) sweeps how far along each run has got,
 * so the same call animates a fracture opening; `fork` splits a share of the runs partway.
 * Used for the F ring's floor, the decay on a rotting fighter, and the avatar's own frame.
 */
export function crackWeb(
  g: Phaser.GameObjects.Graphics,
  tint: RuinColorFn,
  x: number, y: number, r: number, seed: number, alpha: number, grow = 1,
  { runs = 7, color = RUI.voidDark, width = 2, squash = 1 } = {},
): void {
  for (let i = 0; i < runs; i++) {
    const base = (i / runs) * TAU + jitter(seed, i) * 0.8;
    const reach = r * (0.55 + jitter(seed, 10 + i) * 0.45) * grow;
    const segs = 5;
    let px = x;
    let py = y;
    g.lineStyle(width, tint(color), alpha * 0.9);
    for (let s = 1; s <= segs; s++) {
      // Each segment kinks off the last rather than following a smooth arc: a crack that
      // curves is a river, and a crack that zig-zags is a break.
      const a = base + (jitter(seed, i * 7 + s) - 0.5) * 1.1;
      const d = (reach / segs) * s;
      const cx = x + Math.cos(a) * d;
      const cy = y + Math.sin(a) * d * squash;
      g.lineStyle(Math.max(0.6, width * (1 - s / (segs + 1))), tint(color), alpha * (1 - s / (segs + 2)));
      g.lineBetween(px, py, cx, cy);
      // A fork off the midpoint, thinner and shorter — cracks branch, they don't just run.
      if (s === 3 && jitter(seed, 90 + i) > 0.45) {
        const fa = a + (jitter(seed, 120 + i) - 0.5) * 2.2;
        const fl = reach * 0.28;
        g.lineBetween(cx, cy, cx + Math.cos(fa) * fl, cy + Math.sin(fa) * fl * squash);
      }
      px = cx;
      py = cy;
    }
  }
}

/**
 * The Spikes of Ruin ring on the floor. `charge` (0–1) is the two-second fuse: the ring
 * tightens, the cracks spread and the spike stubs push further up out of the ground, so the
 * whole warning is one shape getting worse rather than a countdown printed over it.
 */
export function ruinRing(
  g: Phaser.GameObjects.Graphics,
  tint: RuinColorFn,
  x: number, y: number, r: number, t: number, alpha: number, charge: number, seed = 0,
): void {
  const steps = 40;
  const rim: Phaser.Geom.Point[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU;
    const rr = r * (1 + (jitter(seed, i) - 0.5) * 0.07 + Math.sin(t * 2 + i * 0.7) * 0.012);
    rim.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.62));
  }

  g.fillStyle(tint(RUI.blood), alpha * (0.08 + charge * 0.14));
  g.fillPoints(rim, true);
  g.lineStyle(2 + charge * 2.5, tint(RUI.red), alpha * (0.55 + charge * 0.45));
  g.strokePoints(rim, true, true);
  g.lineStyle(1, tint(RUI.bright), alpha * 0.4 * charge);
  g.strokePoints(rim.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 0.9, y + (p.y - y) * 0.9)), true, true);

  crackWeb(g, tint, x, y, r * 0.95, seed, alpha * (0.3 + charge * 0.6), charge, { runs: 9, squash: 0.62, width: 2.4 });

  // Stubs coming up around the rim. They only clear the ground in the last third of the fuse,
  // which is the tell that the ring is about to go off.
  const push = Math.max(0, charge - 0.62) / 0.38;
  if (push <= 0) return;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU + seed;
    const rr = r * (0.55 + jitter(seed, 200 + i) * 0.42);
    const sx = x + Math.cos(a) * rr;
    const sy = y + Math.sin(a) * rr * 0.62;
    rustySpike(g, tint, sx, sy + 4, -Math.PI / 2, 8 + push * 14 * (0.6 + jitter(seed, 220 + i) * 0.8), 4,
      alpha * 0.9, { seed: seed + i, wear: 0.8, barbs: 0, color: RUI.ash });
  }
}

/**
 * A rusted padlock, hanging under whatever it has been snapped onto. `shackle` (0–1) closes
 * the hoop, so the moment of locking is the shape itself rather than a flash over it.
 */
export function padlock(
  g: Phaser.GameObjects.Graphics,
  tint: RuinColorFn,
  x: number, y: number, size: number, alpha: number, shackle = 1, wobble = 0,
): void {
  const tilt = Math.sin(wobble) * 0.16;
  const ca = Math.cos(tilt);
  const sa = Math.sin(tilt);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);

  // Shackle: an open hoop that swings shut as `shackle` goes to 1.
  const open = (1 - shackle) * 0.9;
  g.lineStyle(size * 0.22, tint(RUI.iron), alpha * 0.95);
  g.beginPath();
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI + (i / 12) * (Math.PI - open);
    const p = P(Math.cos(a) * size * 0.42, -size * 0.55 + Math.sin(a) * size * 0.42);
    if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
  }
  g.strokePath();

  const bodyPts = [
    P(-size * 0.6, -size * 0.5), P(size * 0.6, -size * 0.5),
    P(size * 0.68, size * 0.55), P(-size * 0.68, size * 0.55),
  ];
  g.fillStyle(tint(RUI.voidDark), alpha * 0.55);
  g.fillPoints(bodyPts.map((p) => new Phaser.Geom.Point(p.x, p.y + 2.5)), true);
  g.fillStyle(tint(RUI.rust), alpha * 0.95);
  g.fillPoints(bodyPts, true);
  g.lineStyle(1.4, tint(RUI.ash), alpha * 0.9);
  g.strokePoints(bodyPts, true, true);
  // Pitting and the keyhole.
  g.fillStyle(tint(RUI.ash), alpha * 0.7);
  for (let i = 0; i < 4; i++) {
    const p = P((jitter(i, 3) - 0.5) * size, (jitter(i, 9) - 0.5) * size * 0.8);
    g.fillCircle(p.x, p.y, size * 0.07);
  }
  const key = P(0, size * 0.02);
  g.fillStyle(tint(RUI.voidDark), alpha);
  g.fillCircle(key.x, key.y, size * 0.2);
  g.fillPoints([P(-size * 0.1, size * 0.05), P(size * 0.1, size * 0.05), P(size * 0.06, size * 0.42), P(-size * 0.06, size * 0.42)], true);
}

/** One chain link, drawn along a segment. The Lockdown tether is a run of these. */
export function chainRun(
  g: Phaser.GameObjects.Graphics,
  tint: RuinColorFn,
  x0: number, y0: number, x1: number, y1: number, alpha: number, sag = 14, seed = 0,
): void {
  const links = Math.max(3, Math.round(Phaser.Math.Distance.Between(x0, y0, x1, y1) / 13));
  for (let i = 0; i < links; i++) {
    const s = i / (links - 1);
    const lx = x0 + (x1 - x0) * s;
    const ly = y0 + (y1 - y0) * s + Math.sin(s * Math.PI) * sag;
    // Links alternate flat and edge-on, which is what stops a chain reading as a dotted line.
    const wide = i % 2 === 0;
    g.lineStyle(2.6, tint(wide ? RUI.iron : RUI.ash), alpha * 0.9);
    g.strokeEllipse(lx, ly, wide ? 10 : 5, wide ? 5.5 : 8 + jitter(seed, i) * 1.5);
  }
}

/**
 * The rot on a decayed fighter: an ochre wash over the body with cracks crawling across it and
 * flakes falling off the bottom. `stacks` drives how far gone they are.
 */
export function decayCoat(
  g: Phaser.GameObjects.Graphics,
  tint: RuinColorFn,
  x: number, y: number, r: number, t: number, alpha: number, stacks: number, seed = 0,
): void {
  const depth = Math.min(1, stacks / 6);
  g.fillStyle(tint(RUI.decay), alpha * (0.1 + depth * 0.24));
  g.fillCircle(x, y, r);
  g.fillStyle(tint(RUI.rust), alpha * (0.06 + depth * 0.16));
  g.fillCircle(x - r * 0.2, y + r * 0.2, r * 0.7);
  crackWeb(g, tint, x, y, r * 1.05, seed, alpha * (0.35 + depth * 0.5), 1,
    { runs: 3 + Math.min(6, stacks), color: RUI.ash, width: 1.6 });

  // Flakes coming off — the visible half of "they are falling apart".
  for (let i = 0; i < 3 + Math.min(6, stacks); i++) {
    const ph = (t * 0.6 + jitter(seed, 300 + i)) % 1;
    const fx = x + (jitter(seed, 310 + i) - 0.5) * r * 1.8;
    const fy = y - r * 0.4 + ph * r * 1.8;
    g.fillStyle(tint(i % 3 === 0 ? RUI.rust : RUI.decay), alpha * (1 - ph) * 0.8);
    g.fillRect(fx, fy, 2.4, 2.4);
  }
}

// ── Fx ────────────────────────────────────────────────────────────────────

export class RuinFx extends FxBase {
  /** Something broke. Shards thrown off a point on straight lines, tumbling as they go. */
  shatter(x: number, y: number, count = 8, spread = 34, color = RUI.red, ms = 460, depth = 10): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      a: Math.random() * TAU,
      d: spread * (0.4 + Math.random() * 0.8),
      s: 3 + Math.random() * 4,
      r: (Math.random() - 0.5) * 9,
      i,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        const px = x + Math.cos(p.a) * p.d * e;
        const py = y + Math.sin(p.a) * p.d * e + e * e * 14;
        const rot = p.a + p.r * t;
        const c = Math.cos(rot);
        const s = Math.sin(rot);
        const P = (u: number, v: number) => pt(px, py, c, s, u, v);
        g.fillStyle(this.tint(p.i % 3 === 0 ? RUI.rust : color), (1 - t) * 0.9);
        g.fillPoints([P(p.s, 0), P(-p.s * 0.6, p.s * 0.7), P(-p.s * 0.4, -p.s * 0.8)], true);
      }
    });
  }

  /** A spike driving up out of the ground and sinking back. The F ring's per-spike beat. */
  spikeBurst(x: number, y: number, count = 10, r = 60, ms = 520, depth = 10, seed = 0): void {
    this.anim(depth, ms, (g, t) => {
      // Out fast, back slowly — the whole read is the moment they arrive.
      const up = t < 0.28 ? easeOut(t / 0.28) : 1 - easeIn((t - 0.28) / 0.72);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU + jitter(seed, i) * 0.5;
        const d = r * (0.25 + jitter(seed, 20 + i) * 0.75);
        const sx = x + Math.cos(a) * d;
        const sy = y + Math.sin(a) * d * 0.62;
        rustySpike(g, this.tint, sx, sy + 6, -Math.PI / 2 + (jitter(seed, 40 + i) - 0.5) * 0.5,
          (22 + jitter(seed, 60 + i) * 26) * up, 6 * up, 1,
          { seed: seed + i, wear: 0.7, barbs: 1, color: RUI.ash });
      }
    });
  }

  /** An expanding ring of broken ground. Casts, eruptions, releases. */
  ring(x: number, y: number, r0: number, r1: number, color = RUI.red, ms = 460, depth = 9): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      const r = r0 + (r1 - r0) * easeOut(t);
      const pts: Phaser.Geom.Point[] = [];
      for (let i = 0; i <= 26; i++) {
        const a = (i / 26) * TAU;
        const rr = r * (1 + (jitter(seed, i) - 0.5) * 0.13);
        pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7));
      }
      g.lineStyle(3.5 * (1 - t) + 0.8, this.tint(color), (1 - t) * 0.85);
      g.strokePoints(pts, true, true);
      g.lineStyle(1.2, this.tint(RUI.rust), (1 - t) * 0.5);
      g.strokePoints(pts.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 0.84, y + (p.y - y) * 0.84)), true, true);
    });
  }

  /** Rust coming off something in a puff — the cheap "this got worse" beat. */
  rustPuff(x: number, y: number, count = 7, spread = 22, ms = 520, depth = 9): void {
    const seeds = Array.from({ length: count }, () => ({
      a: Math.random() * TAU, d: spread * (0.3 + Math.random() * 0.8), s: 1.6 + Math.random() * 2.6,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        const px = x + Math.cos(p.a) * p.d * e;
        const py = y + Math.sin(p.a) * p.d * e + e * 12;
        g.fillStyle(this.tint(RUI.rust), (1 - t) * 0.75);
        g.fillRect(px, py, p.s, p.s);
      }
    });
  }

  /** A crack tearing open across the floor, then healing shut. */
  crack(x: number, y: number, r = 50, ms = 620, depth = 4): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      crackWeb(g, this.tint, x, y, r, seed, 1 - t, Math.min(1, t * 2.4), { runs: 8, squash: 0.65, width: 2.6 });
    });
  }

  /** The lock landing: a chain whipping out and a padlock snapping shut on the far end. */
  lockSnap(x0: number, y0: number, x1: number, y1: number, ms = 520, depth = 11): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      const reach = Math.min(1, t * 3);
      const alpha = 1 - Math.max(0, (t - 0.55) / 0.45);
      chainRun(g, this.tint, x0, y0, x0 + (x1 - x0) * reach, y0 + (y1 - y0) * reach, alpha, 18 * (1 - reach), seed);
      if (t > 0.28) {
        padlock(g, this.tint, x1, y1 - 34, 13 + (1 - alpha) * 4, alpha,
          Math.min(1, (t - 0.28) / 0.25), t * 20);
      }
    });
    this.flashIn(x1, y1, 22, RUI.rust, RUI.red, depth);
  }

  /** Impact — the standard "a Ruin thing hit you" flash, with shards. */
  bite(x: number, y: number, size = 26, color = RUI.red, depth = 10): void {
    this.flashIn(x, y, size * 0.55, RUI.bright, color, depth);
    this.shatter(x, y, 6, size, color, 420, depth);
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const RUIN_AVATAR: AvatarSpec = {
  hands: [
    { r: 12, color: RUI.red, alpha: 0.2 },
    { r: 7, color: RUI.ash, alpha: 0.95 },
    { r: 2.4, color: RUI.rust, alpha: 0.95, ox: -1.6, oy: -1.6 },
  ],
  eyeWhite: RUI.bone,
  eyePupil: RUI.voidDark,
  squash: { div: 13, x: 0.5, y: 0.3 },
};

/**
 * Ruin himself: a cracked red frame with a row of spikes down his back, one eye burning and
 * the other an empty socket.
 *
 * Two things make him read at a glance. The spikes are drawn *behind* the crown and rake
 * backward, so the silhouette has teeth from any angle; and the right eye socket is painted
 * over the rig's own eye in `drawExtras` — the base rig always builds two eyes, so the only
 * way to take one away is to put a hole on top of it. The cracks widen as he loses health,
 * which is the one honest thing about him: he really is coming apart.
 */
export class RuinAvatar extends BaseAvatar {
  /** 0–1 — how far gone the frame is. Driven off the fighter's own HP ratio. */
  private ruinLevel = 0;
  /** Ability tell: brightens the spikes and the socket for a moment after a cast. */
  private flare = 0;
  private seed = Math.random() * 999;

  constructor(scene: Phaser.Scene, tint: RuinColorFn, depth = 6) {
    super(scene, tint, depth, RUIN_AVATAR);
  }

  /** 0 = intact, 1 = about to fall apart. */
  setRuinLevel(v: number): void { this.ruinLevel = Phaser.Math.Clamp(v, 0, 1); }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.flare = Math.max(0, this.flare - delta / 420);
    super.update(delta, x, y, alpha);
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.flare = 1;
    super.play(gesture, angle, duration);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 15 : 12);
      glow.setAlpha(on ? 0.34 : 0.2);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new RuinFx(this.scene, this.tint).rustPuff(x, y, 2, 6, 380, 4);
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    // He stands in his own debris: a dark pool with cracks running out of it.
    g.fillStyle(this.tint(RUI.voidDark), a * 0.45);
    g.fillEllipse(x, y + 14, 48, 18);
    g.fillStyle(this.tint(RUI.red), a * (0.1 + this.ruinLevel * 0.1));
    g.fillEllipse(x, y + 13, 64 + Math.sin(this.t * 2) * 5, 24);
    crackWeb(g, this.tint, x, y + 14, 34 + this.ruinLevel * 16, this.seed, a * 0.5, 1,
      { runs: 6, squash: 0.35, width: 1.8, color: RUI.ash });
  }

  /** The frame itself: cracks across the torso that open as the health goes. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    crackWeb(g, this.tint, x + 2, y + 2, 15 + this.ruinLevel * 7, this.seed + 4, alpha * (0.5 + this.ruinLevel * 0.5), 1,
      { runs: 4 + Math.round(this.ruinLevel * 4), width: 1.8, color: RUI.voidDark });
    // Chips missing out of the shell, more of them the worse he is.
    g.fillStyle(this.tint(RUI.voidDark), alpha * 0.75);
    const chips = 2 + Math.round(this.ruinLevel * 4);
    for (let i = 0; i < chips; i++) {
      const a2 = jitter(this.seed, 500 + i) * TAU;
      const d = 12 + jitter(this.seed, 520 + i) * 8;
      const cx = x + Math.cos(a2) * d;
      const cy = y + Math.sin(a2) * d;
      g.fillPoints([
        new Phaser.Geom.Point(cx, cy),
        new Phaser.Geom.Point(cx + 4 + jitter(this.seed, 540 + i) * 3, cy + 1),
        new Phaser.Geom.Point(cx + 1, cy + 4 + jitter(this.seed, 560 + i) * 3),
      ], true);
    }
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const heat = 0.55 + this.flare * 0.45;

    // ── The spikes down his back ──
    // Raked backward from the crown and fanned, so there is a silhouette of teeth whichever
    // way he is facing. The mastered rig grows a longer middle spine.
    const back = this.facing + Math.PI;
    const count = 5;
    for (let i = 0; i < count; i++) {
      const s = i / (count - 1) - 0.5;
      const ang = back + s * 1.15 - 0.12;
      const len = (this.mastered ? 26 : 20) * (1 - Math.abs(s) * 0.45) + Math.sin(this.t * 3 + i) * 1.2;
      rustySpike(g, this.tint, x + Math.cos(ang) * 12, y - 6 + Math.sin(ang) * 8, ang,
        len, 5.5, alpha * 0.95, { seed: this.seed + i * 3, wear: 0.6, barbs: 1, color: RUI.ash });
    }
    // Shoulder spikes, shorter and pointed out sideways.
    for (const side of [-1, 1]) {
      const ang = this.facing + side * (Math.PI / 2);
      rustySpike(g, this.tint, x + Math.cos(ang) * 13, y + 2 + Math.sin(ang) * 9, ang,
        13, 4.5, alpha * 0.9, { seed: this.seed + 30 + side, wear: 0.7, barbs: 0, color: RUI.iron });
    }

    // ── The empty socket ──
    // Painted over the rig's right eye — `BaseAvatar` always builds two, so a hole on top is
    // the only way to be down one. Same maths as the base rig's eye placement.
    const bob = Math.sin(this.t * 2.6) * 1.1;
    const ex = x + 7.2 + Math.cos(this.facing) * 2.4;
    const ey = y - 4 + Math.sin(this.facing) * 2.0 + bob;
    g.fillStyle(this.tint(RUI.voidDark), alpha);
    g.fillCircle(ex, ey, 5.2);
    g.fillStyle(this.tint(RUI.ash), alpha * 0.6);
    g.fillCircle(ex + 0.8, ey + 0.8, 3.4);
    // Cracks running out of the socket across the face — the eye didn't fall out, it broke out.
    crackWeb(g, this.tint, ex, ey, 12, this.seed + 9, alpha * 0.8, 1,
      { runs: 4, width: 1.5, color: RUI.voidDark });
    // The good eye burns rather than looks.
    const gx = x - 7.2 + Math.cos(this.facing) * 2.4;
    const gy = ey;
    g.fillStyle(this.tint(RUI.red), alpha * 0.22 * heat);
    g.fillCircle(gx, gy, 8 + Math.sin(this.t * 5) * 1.2);
  }
}
