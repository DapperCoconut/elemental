import Phaser from 'phaser';

/**
 * The Warden skin's bespoke ability art: the sonic boom that replaces Echolocation's crescent,
 * the amethyst clusters that replace echo blossoms (and their seeds and shots), and the blocky
 * pixel bat that replaces Bat Form's silhouette.
 *
 * Visual only. Every painter here draws inside the footprint of the shape it stands in for, so
 * the hitbox the player learned still reads off the art. Deliberately imports nothing from
 * EchoVisuals — EchoVisuals imports *this* file, and a top-level read of `ECHO` here would hit
 * the module cycle before it was initialised. The skin owns its colours outright.
 */

export const WARDEN = {
  deep: 0x03100f,
  sculkDark: 0x061c20,
  sculk: 0x0a2a31,
  teal: 0x0f3d47,
  tealMid: 0x175a66,
  tealLit: 0x23808c,
  cyanDim: 0x1fa8b4,
  cyan: 0x29dfeb,
  cyanHi: 0x8ff7ff,
  soul: 0xd2ffff,
  white: 0xf0ffff,
  ameDeep: 0x2a1250,
  ameDark: 0x4a2287,
  ame: 0x7c3fd0,
  ameMid: 0x9a5fe0,
  ameHi: 0xc59bff,
  amePale: 0xeedcff,
  batDark: 0x2a1f15,
  batBrown: 0x4f3b28,
  batMid: 0x6a5038,
  batLight: 0x8a6a4a,
  batEye: 0x0c0c0c,
} as const;

type G = Phaser.GameObjects.Graphics;

const TAU = Math.PI * 2;

/** Points of an ellipse whose `along` axis points at `ang`. */
function rotEllipse(cx: number, cy: number, ang: number, along: number, across: number, n = 22): Phaser.Geom.Point[] {
  const c = Math.cos(ang), s = Math.sin(ang);
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const lx = Math.cos(a) * along, ly = Math.sin(a) * across;
    pts.push(new Phaser.Geom.Point(cx + lx * c - ly * s, cy + lx * s + ly * c));
  }
  return pts;
}

/** A local-frame mapper: `at(fwd, side)` → world point. */
function frame(cx: number, cy: number, ang: number) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return (f: number, sd: number) => new Phaser.Geom.Point(cx + f * c - sd * s, cy + f * s + sd * c);
}

/** A four-point twinkle — amethyst's chime made visible. */
function twinkle(g: G, x: number, y: number, r: number, color: number, alpha: number): void {
  if (alpha <= 0.01 || r <= 0.2) return;
  g.fillStyle(color, alpha);
  g.fillPoints([
    new Phaser.Geom.Point(x, y - r), new Phaser.Geom.Point(x + r * 0.28, y - r * 0.28),
    new Phaser.Geom.Point(x + r, y), new Phaser.Geom.Point(x + r * 0.28, y + r * 0.28),
    new Phaser.Geom.Point(x, y + r), new Phaser.Geom.Point(x - r * 0.28, y + r * 0.28),
    new Phaser.Geom.Point(x - r, y), new Phaser.Geom.Point(x - r * 0.28, y - r * 0.28),
  ], true);
}

// ── Sonic boom (Echolocation) ─────────────────────────────────────────────

/**
 * The Warden's sonic boom: a beam of concentric shock rings streaming forward from behind the
 * shot point. The lead ring is the crescent's footprint exactly — its front edge rides the crest
 * and it reaches ~53px either side, where the hitbox's horns sit — so a body caught anywhere
 * along the front is visibly inside a ring. Bounces add rings to the beam.
 */
export function drawSonicBoom(g: G, x: number, y: number, angle: number, bounces: number, t: number): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const BACK = 78;
  const bx = x - cos * BACK, by = y - sin * BACK;

  // The beam core the rings ride on.
  g.lineStyle(14, WARDEN.teal, 0.28);
  g.lineBetween(bx, by, x, y);
  g.lineStyle(6, WARDEN.cyanDim, 0.35);
  g.lineBetween(bx + cos * 18, by + sin * 18, x, y);
  g.lineStyle(2, WARDEN.soul, 0.55 + 0.25 * Math.sin(t * 24));
  g.lineBetween(bx + cos * 34, by + sin * 34, x, y);

  // Trailing rings, streaming forward and growing as they go.
  const n = 5 + Math.min(3, bounces);
  const flow = (t * 3.2) % 1;
  for (let i = 0; i < n; i++) {
    const u = (i + flow) / n; // 0 = at the mouth, 1 = at the crest
    const across = 12 + u * 34;
    const along = 3.5 + u * 8;
    const dist = (1 - u) * (BACK - 14) + 16;
    const cx = x - cos * (dist + along), cy = y - sin * (dist + along);
    const fade = Math.min(1, u * 4) * (0.35 + 0.55 * u);
    const pts = rotEllipse(cx, cy, angle, along, across);
    g.lineStyle(5, WARDEN.teal, 0.55 * fade);
    g.strokePoints(pts, true);
    g.lineStyle(2.2, WARDEN.cyan, 0.9 * fade);
    g.strokePoints(pts, true);
  }

  // The lead ring — the crescent's footprint.
  const pulse = 1 + 0.04 * Math.sin(t * 30);
  const leadAlong = 15, leadAcross = 53 * pulse;
  const lcx = x - cos * leadAlong, lcy = y - sin * leadAlong;
  const lead = rotEllipse(lcx, lcy, angle, leadAlong, leadAcross, 28);
  g.fillStyle(WARDEN.cyan, 0.12);
  g.fillPoints(lead, true);
  g.lineStyle(9, WARDEN.teal, 0.6);
  g.strokePoints(lead, true);
  g.lineStyle(4, WARDEN.cyan, 0.95);
  g.strokePoints(lead, true);
  g.lineStyle(1.6, WARDEN.soul, 0.9);
  g.strokePoints(rotEllipse(lcx, lcy, angle, leadAlong * 0.72, leadAcross * 0.86, 26), true);

  // The crest and two horn sparks where the hitbox ends.
  g.fillStyle(WARDEN.white, 0.65 + 0.3 * Math.sin(t * 16));
  g.fillCircle(x, y, 3.8);
  for (const side of [-1, 1]) {
    const hx = lcx - sin * side * leadAcross, hy = lcy + cos * side * leadAcross;
    twinkle(g, hx, hy, 4 + Math.sin(t * 20 + side) * 1.2, WARDEN.cyanHi, 0.8);
  }
}

// ── Amethyst (echo blossoms) ──────────────────────────────────────────────

/** Deterministic 0–1 from a seed — the cluster is grown once, not re-rolled every frame. */
function hash(seed: number, k: number): number {
  const v = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** One amethyst point: a long faceted shard, lit face on its left flank, glint at the tip. */
function shard(g: G, x: number, y: number, ang: number, len: number, wid: number, alpha: number, dark: boolean): void {
  const at = frame(x, y, ang);
  const outline = [at(-1, -wid), at(len * 0.7, -wid * 0.92), at(len, 0), at(len * 0.7, wid * 0.92), at(-1, wid)];
  g.fillStyle(WARDEN.ameDeep, alpha);
  g.fillPoints([at(-2, -wid - 1.2), at(len * 0.7, -wid - 1.1), at(len + 1.6, 0), at(len * 0.7, wid + 1.1), at(-2, wid + 1.2)], true);
  g.fillStyle(dark ? WARDEN.ameDark : WARDEN.ame, alpha);
  g.fillPoints(outline, true);
  // Lit facet — the half of a hexagonal prism that faces the light.
  g.fillStyle(dark ? WARDEN.ame : WARDEN.ameHi, alpha * 0.85);
  g.fillPoints([at(-1, -wid), at(len * 0.7, -wid * 0.92), at(len, 0), at(0, -wid * 0.1)], true);
  // Ridge between the facets.
  g.lineStyle(1, WARDEN.amePale, alpha * 0.6);
  const r0 = at(0, -wid * 0.1), r1 = at(len * 0.96, 0);
  g.lineBetween(r0.x, r0.y, r1.x, r1.y);
  const tip = at(len * 0.8, -wid * 0.4);
  g.fillStyle(WARDEN.white, alpha * 0.9);
  g.fillRect(tip.x - 1, tip.y - 1, 2, 2);
}

/**
 * An amethyst cluster growing out of a budding block, in the blossom's footprint (~44px). Echo
 * blooms are clean purple; terror blooms grow sculk-infested — a darker cluster on a sculk
 * block with cyan veins, more points, sharper. `look` nudges the core glint toward the cursor
 * while the player is listening through it, standing in for the blossom's eye.
 */
export function drawAmethystCluster(
  g: G, x: number, y: number, scale: number, alpha: number, time: number, seed: number,
  terror: boolean, grow: number, look: number | null,
): void {
  const s = scale;
  // Ground shadow.
  g.fillStyle(WARDEN.deep, 0.45 * alpha);
  g.fillEllipse(x, y + 12 * s, 36 * s, 11 * s);

  // The budding block: a 3×3 grid of pixel tiles, seeded so the pattern holds still.
  const half = 10 * s, tile = (half * 2) / 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const h = hash(seed, i * 3 + j);
      const col = terror
        ? (h < 0.35 ? WARDEN.sculkDark : h < 0.75 ? WARDEN.sculk : WARDEN.teal)
        : (h < 0.35 ? WARDEN.ameDeep : h < 0.75 ? WARDEN.ameDark : WARDEN.ame);
      g.fillStyle(col, alpha);
      g.fillRect(x - half + i * tile, y - half + j * tile, tile + 0.3, tile + 0.3);
    }
  }
  g.lineStyle(1.4, terror ? WARDEN.deep : WARDEN.ameDeep, alpha);
  g.strokeRect(x - half, y - half, half * 2, half * 2);
  if (terror) {
    // Sculk veins pulsing through the block.
    const vp = 0.5 + 0.5 * Math.sin(time / 260 + seed);
    g.fillStyle(WARDEN.cyan, alpha * (0.4 + 0.5 * vp));
    g.fillRect(x - half + tile * 0.4, y - 1, tile * 2.2, 1.6 * s);
    g.fillRect(x + tile * 0.2, y - half + tile * 0.3, 1.6 * s, tile * 1.6);
  }

  // Shards, sorted so the ones leaning toward the viewer (down-screen) sit in front.
  const count = terror ? 7 : 5;
  const shards: { a: number; len: number; wid: number }[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + seed + (hash(seed, 20 + i) - 0.5) * 0.5;
    const breathe = 1 + 0.04 * Math.sin(time / 380 + i * 1.3 + seed);
    const len = (terror ? 15 : 13) * s * (0.75 + hash(seed, 40 + i) * 0.55) * breathe * (0.4 + 0.6 * grow);
    const wid = (terror ? 3.6 : 4.8) * s * (0.8 + hash(seed, 60 + i) * 0.4);
    shards.push({ a, len, wid });
  }
  shards.sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
  for (const sh of shards) {
    shard(g, x + Math.cos(sh.a) * 4 * s, y + Math.sin(sh.a) * 4 * s, sh.a, sh.len, sh.wid, alpha, terror);
  }
  // The tallest point stands up out of the middle.
  shard(g, x, y + 2 * s, -Math.PI / 2 + Math.sin(time / 600 + seed) * 0.06,
    (terror ? 18 : 16) * s * (0.4 + 0.6 * grow), (terror ? 4 : 5.4) * s, alpha, terror);

  // Core glint — the cluster's "eye". Drifts toward the cursor while listened through.
  const lx = look === null ? 0 : Math.cos(look) * 3 * s;
  const ly = look === null ? 0 : Math.sin(look) * 3 * s;
  const glow = 0.6 + 0.4 * Math.sin(time / 300 + seed);
  g.fillStyle(terror ? WARDEN.cyan : WARDEN.ameHi, alpha * 0.35 * glow);
  g.fillCircle(x + lx, y - 4 * s + ly, 7 * s);
  twinkle(g, x + lx, y - 4 * s + ly, 4.5 * s * (0.8 + 0.3 * glow), terror ? WARDEN.cyanHi : WARDEN.amePale, alpha * 0.95 * grow);

  if (grow >= 1) {
    // Amethyst chimes on its own clock: sparkles winking around the cluster.
    for (let i = 0; i < 4; i++) {
      const p = ((time / 900) + i / 4 + seed) % 1;
      const a = seed * 3 + i * 1.7 + time / 2400;
      const d = (16 + p * 12) * s;
      twinkle(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8 - p * 6,
        3.2 * s * Math.sin(p * Math.PI), terror ? WARDEN.cyanHi : WARDEN.amePale, alpha * 0.85);
    }
  }
}

/** An amethyst shard in flight, for bloom seeds and bloom shots: a spinning crystal and its glitter. */
export function drawAmethystDart(
  g: G, x: number, y: number, angle: number, size: number, alpha: number, t: number,
  trail: { x: number; y: number }[] = [], terror = false,
): void {
  for (let i = 0; i < trail.length; i++) {
    const p = trail[i];
    const u = i / trail.length;
    twinkle(g, p.x, p.y, 1.2 + u * 2.2, terror ? WARDEN.cyan : WARDEN.ameHi, alpha * (0.1 + 0.5 * u));
  }
  g.fillStyle(terror ? WARDEN.cyan : WARDEN.ameMid, alpha * 0.28);
  g.fillCircle(x, y, size * 1.1);
  shard(g, x - Math.cos(angle) * size * 0.7, y - Math.sin(angle) * size * 0.7, angle,
    size * 1.6, size * 0.45, alpha, terror);
  twinkle(g, x + Math.cos(angle) * size * 0.9, y + Math.sin(angle) * size * 0.9,
    2.4 + Math.sin(t * 20), WARDEN.white, alpha * 0.85);
}

// ── Pixel bat (Bat Form) ──────────────────────────────────────────────────

/**
 * A blocky Minecraft bat, axis-aligned and built from pixel rects: brown body, a square head
 * with two ear nubs and black bead eyes, and stepped wings that flap by sliding each segment.
 * `size` matches `batSilhouette`'s, so the wingspan lands in the same footprint (~2.8× size).
 *
 * @param flap -1 (wings up) → 1 (wings down)
 */
export function drawPixelBat(
  g: G, x: number, y: number, size: number, flap: number, alpha: number, faceRight = true,
): void {
  const p = size * 0.25;
  const beat = Phaser.Math.Clamp(flap, -1, 1);
  const r = (px: number, py: number, w: number, h: number, c: number, a = 1) => {
    g.fillStyle(c, alpha * a);
    g.fillRect(x + px * p, y + py * p, w * p, h * p);
  };
  const dir = faceRight ? 1 : -1;

  // Soft shadow so the bat reads against the floor.
  g.fillStyle(0x000000, alpha * 0.22);
  g.fillEllipse(x, y + p * 4.2, p * 7, p * 1.6);

  // Wings: four stepped segments a side, each sliding with the beat.
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const off = beat * (k + 1) * 0.55;
      const h = 3.2 - k * 0.6;
      const wx = side > 0 ? 1 + k * 1.1 : -1 - (k + 1) * 1.1;
      const wy = -1.6 + off - (k === 3 ? 0.3 : 0);
      r(wx, wy, 1.2, h, WARDEN.batDark);
      r(wx + 0.15, wy + 0.5, 0.9, h - 0.8, WARDEN.batBrown, 0.85);
      // The finger bone along the leading edge.
      r(wx, wy, 1.2, 0.4, WARDEN.batLight);
    }
  }

  // Body.
  r(-1.05, -0.9, 2.1, 3.2, WARDEN.batDark);
  r(-0.9, -0.8, 1.8, 3.0, WARDEN.batBrown);
  r(-0.55, 0.2, 1.1, 1.7, WARDEN.batMid);
  // Feet.
  r(-0.75, 2.3, 0.45, 0.5, WARDEN.batDark);
  r(0.3, 2.3, 0.45, 0.5, WARDEN.batDark);

  // Head: a square block, a little forward of the body in the way it faces.
  const hx = -1.3 + dir * 0.15;
  r(hx - 0.1, -3.2, 2.8, 2.6, WARDEN.batDark);
  r(hx, -3.1, 2.6, 2.4, WARDEN.batMid);
  r(hx, -3.1, 2.6, 0.5, WARDEN.batLight, 0.7);
  // Ears.
  r(hx + 0.1, -3.9, 0.6, 0.9, WARDEN.batBrown);
  r(hx + 1.9, -3.9, 0.6, 0.9, WARDEN.batBrown);
  // Eyes: black beads, one pixel of shine.
  r(hx + 0.45, -2.3, 0.55, 0.55, WARDEN.batEye);
  r(hx + 1.6, -2.3, 0.55, 0.55, WARDEN.batEye);
  r(hx + 0.45, -2.3, 0.2, 0.2, 0xffffff, 0.8);
  r(hx + 1.6, -2.3, 0.2, 0.2, 0xffffff, 0.8);
  // Snout.
  r(hx + 1.0, -1.4, 0.6, 0.5, WARDEN.batBrown);
}
