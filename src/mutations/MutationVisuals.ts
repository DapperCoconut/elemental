import Phaser from 'phaser';

/**
 * Bespoke art for the twenty mutations in {@link MutationKit}.
 *
 * Every painter here is a pure function over a `Graphics` — no state, no game
 * objects, no tweens. The kit owns one `Graphics` per depth layer, clears it
 * each frame and calls whichever of these the live mutations need. That keeps
 * the drawing out of the simulation and lets a mutation's look be rewritten
 * without touching a line of its rules.
 *
 * House style, matching the element kits: no bare circles. Anything the player
 * has to read at speed gets a rim, an interior detail and something that moves,
 * so it reads as an object rather than a hitbox with a fill colour.
 */

const TAU = Math.PI * 2;

/** Palette per mutation, so the kit and the art agree on what a thing looks like. */
export const MUT = {
  doppel:     { body: 0x9fd8ff, edge: 0xe6f6ff, void: 0x11213a },
  frostbite:  { ice: 0xbfeaff, deep: 0x4aa6d8, rime: 0xffffff, dark: 0x0e2436 },
  feast:      { meat: 0xc2503a, sear: 0xe8845c, bone: 0xf2e6cf, glow: 0xffcf7a },
  bramble:    { wood: 0x4b3a22, thorn: 0xd8c48a, blood: 0xa8202f, leaf: 0x2f6b32 },
  maelstrom:  { arm: 0x63c6d8, core: 0xdff7ff, deep: 0x123a48, grit: 0x9fe4ef },
  inversion:  { glyph: 0xb08cff, ring: 0x6f4fd0, spark: 0xe8dcff },
  contagion:  { dish: 0x8de08a, culture: 0x4fae52, spore: 0xd9ffca, rim: 0x2b5c2d },
  duel:       { steel: 0xd7dde6, hilt: 0x8a2130, gleam: 0xffffff, shadow: 0x2b2f38 },
  hydra:      { scale: 0x3f8f5c, belly: 0xc9e8a8, eye: 0xffd23f, maw: 0x7a1128 },
  rewind:     { dial: 0x7fd4ff, ghost: 0xa8e9ff, dark: 0x102436 },
  quicksand:  { sand: 0xd7b374, deep: 0x9a7940, grain: 0xf0dcae, pit: 0x6b5228 },
  overload:   { arc: 0xffe14d, coil: 0xb0894a, hot: 0xffffff, burn: 0xff7a3c },
  fragile:    { crack: 0xff5f7a, heart: 0xc21f3a, shard: 0xffd6de },
  swarm:      { body: 0xf2c035, band: 0x2a2216, wing: 0xeaf4ff, sting: 0xff6a4d },
  tempest:    { bolt: 0xd6ecff, hot: 0xffffff, cloud: 0x415a75, mark: 0x7fb4ff },
  bulwark:    { plate: 0xb9c3cf, bevel: 0xeef4fa, rivet: 0x6c7885, lit: 0x8fd8ff },
  vault:      { brass: 0xd8b25c, iron: 0x6b6f78, shine: 0xfff0c2 },
  roulette:   { rim: 0xe0c04a, felt: 0x1f2a3a, pin: 0xfff3c4, mark: 0xff5566 },
  warden:     { iron: 0x8f9aa8, dark: 0x3a424e, rust: 0xa4602f, hot: 0xffd08a },
  oracle:     { rune: 0xbf8cff, inner: 0xffe9ff, burn: 0xff6ad5, deep: 0x2a1240 },
} as const;

// ── shared helpers ────────────────────────────────────────────────────────

/** Fill a closed polygon given as a flat point list. */
function poly(g: Phaser.GameObjects.Graphics, pts: Array<[number, number]>): void {
  if (pts.length < 3) return;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  g.fillPath();
}

/** Stroke an open polyline given as a flat point list. */
function line(g: Phaser.GameObjects.Graphics, pts: Array<[number, number]>): void {
  if (pts.length < 2) return;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.strokePath();
}

/** Deterministic 0..1 noise so a shape keeps the same silhouette frame to frame. */
function rnd(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** A wobbling blob outline — the base for anything organic. */
function blob(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number,
  lumps: number, wobble: number, seed: number, phase: number,
): void {
  const pts: Array<[number, number]> = [];
  const steps = Math.max(14, lumps * 4);
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * TAU;
    const n = Math.sin(t * lumps + phase + rnd(seed + i) * 2) * wobble;
    const rr = r * (1 + n);
    pts.push([x + Math.cos(t) * rr, y + Math.sin(t) * rr]);
  }
  poly(g, pts);
}

// ── 1 · Doppel ────────────────────────────────────────────────────────────

/**
 * The echo that walks your old footsteps. A smeared silhouette with a bright
 * rim and two hollow eyes, leaning into whatever direction the recording was
 * travelling — so it reads as *you*, a moment ago, rather than a blue ball.
 */
export function drawDoppel(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number,
  heading: number, t: number, alpha: number,
): void {
  const c = MUT.doppel;
  const cos = Math.cos(heading), sin = Math.sin(heading);
  const smear = 1 + 0.35 * Math.min(1, r / 18);

  // Trailing smear — a stretched teardrop behind the heading.
  g.fillStyle(c.body, alpha * 0.22);
  const tail: Array<[number, number]> = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * TAU;
    const lx = Math.cos(a) * r * (a > Math.PI * 0.5 && a < Math.PI * 1.5 ? smear * 1.8 : 1);
    const ly = Math.sin(a) * r;
    tail.push([x + lx * cos - ly * sin, y + lx * sin + ly * cos]);
  }
  poly(g, tail);

  // Body — a soft-shouldered figure, not a disc.
  g.fillStyle(c.void, alpha * 0.55);
  blob(g, x, y, r * 0.94, 3, 0.07, 11, t * 0.002);
  g.fillStyle(c.body, alpha * 0.45);
  blob(g, x, y, r * 0.8, 3, 0.06, 11, t * 0.002);

  // Rim light — the tell that it is a copy and not a shadow.
  g.lineStyle(Math.max(1.2, r * 0.11), c.edge, alpha * 0.85);
  const rim: Array<[number, number]> = [];
  for (let i = 0; i <= 20; i++) {
    const a = (i / 20) * TAU;
    const rr = r * (0.92 + 0.05 * Math.sin(a * 3 + t * 0.004));
    rim.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  line(g, rim);

  // Two hollow eyes, facing the way it is walking.
  const ex = cos * r * 0.34, ey = sin * r * 0.34;
  const px = -sin * r * 0.3, py = cos * r * 0.3;
  g.fillStyle(c.edge, alpha * 0.9);
  g.fillCircle(x + ex + px, y + ey + py, r * 0.15);
  g.fillCircle(x + ex - px, y + ey - py, r * 0.15);
  g.fillStyle(c.void, alpha);
  g.fillCircle(x + ex + px, y + ey + py, r * 0.07);
  g.fillCircle(x + ex - px, y + ey - py, r * 0.07);
}

// ── 2 · Frostbite ─────────────────────────────────────────────────────────

/** Frost creeping in from the screen edge, thickening with the chill meter. */
export function drawFrostCreep(
  g: Phaser.GameObjects.Graphics,
  bx: number, by: number, bw: number, bh: number, chill01: number, t: number,
): void {
  if (chill01 <= 0.02) return;
  const c = MUT.frostbite;
  const reach = 14 + chill01 * 96;
  // 20 per edge is the point where the frost reads as a rime line rather than a
  // row of triangles, without paying for 270 fill paths a frame.
  const spurs = 20;

  g.fillStyle(c.ice, 0.10 + chill01 * 0.20);
  g.fillRect(bx, by, bw, reach * 0.35);
  g.fillRect(bx, by + bh - reach * 0.35, bw, reach * 0.35);
  g.fillRect(bx, by, reach * 0.35, bh);
  g.fillRect(bx + bw - reach * 0.35, by, reach * 0.35, bh);

  // Needles reaching inward off each edge, each one a fixed shape that grows.
  for (let e = 0; e < 4; e++) {
    for (let i = 0; i < spurs; i++) {
      const s = rnd(e * 97 + i * 13);
      const s2 = rnd(e * 31 + i * 7);
      const len = reach * (0.45 + s * 0.75);
      const w = 3 + s2 * 7;
      let px: number, py: number, dx: number, dy: number;
      if (e === 0)      { px = bx + bw * ((i + s2) / spurs); py = by;          dx = 0;  dy = 1; }
      else if (e === 1) { px = bx + bw * ((i + s2) / spurs); py = by + bh;     dx = 0;  dy = -1; }
      else if (e === 2) { px = bx;           py = by + bh * ((i + s2) / spurs); dx = 1;  dy = 0; }
      else              { px = bx + bw;      py = by + bh * ((i + s2) / spurs); dx = -1; dy = 0; }
      const nx = -dy, ny = dx;
      const sway = Math.sin(t * 0.001 + i) * 1.5 * chill01;
      g.fillStyle(c.rime, 0.16 + chill01 * 0.42);
      poly(g, [
        [px + nx * w, py + ny * w],
        [px + dx * len + nx * sway, py + dy * len + ny * sway],
        [px - nx * w, py - ny * w],
      ]);
      // A barb halfway up, so the needle reads as frost and not a triangle.
      const mx = px + dx * len * 0.5, my = py + dy * len * 0.5;
      g.fillStyle(c.deep, 0.10 + chill01 * 0.3);
      poly(g, [
        [mx, my],
        [mx + (nx + dx) * len * 0.22, my + (ny + dy) * len * 0.22],
        [mx + dx * len * 0.18, my + dy * len * 0.18],
      ]);
    }
  }
}

/** The shell that snaps shut when the chill meter tops out. */
export function drawIceShell(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, t: number,
): void {
  const c = MUT.frostbite;
  const facets = 9;
  g.fillStyle(c.deep, 0.4);
  blob(g, x, y, r * 1.06, 5, 0.1, 3, 0);
  g.fillStyle(c.ice, 0.35);
  blob(g, x, y, r * 0.9, 5, 0.09, 3, 0.5);
  g.lineStyle(1.6, c.rime, 0.85);
  for (let i = 0; i < facets; i++) {
    const a = (i / facets) * TAU + t * 0.0004;
    const rr = r * (0.75 + rnd(i) * 0.45);
    line(g, [[x, y], [x + Math.cos(a) * rr, y + Math.sin(a) * rr]]);
  }
  g.lineStyle(2.2, c.rime, 0.9);
  const rim: Array<[number, number]> = [];
  for (let i = 0; i <= facets; i++) {
    const a = (i / facets) * TAU;
    const rr = r * (0.98 + rnd(i + 40) * 0.16);
    rim.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  line(g, rim);
}

// ── 3 · Feast ─────────────────────────────────────────────────────────────

/** A drumstick on the floor: bone, meat, sear marks and a hunger glow. */
export function drawDrumstick(
  g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, t: number,
): void {
  const c = MUT.feast;
  const bob = Math.sin(t * 0.004) * s * 0.12;
  const yy = y + bob;
  const tilt = -0.5;
  const cos = Math.cos(tilt), sin = Math.sin(tilt);
  const at = (lx: number, ly: number): [number, number] =>
    [x + lx * cos - ly * sin, yy + lx * sin + ly * cos];

  // Hunger glow, pulsing so a dropped meal catches the eye across the arena.
  g.fillStyle(c.glow, 0.14 + 0.06 * Math.sin(t * 0.005));
  g.fillCircle(x, yy, s * 1.7);

  // Bone shaft + two knuckles.
  g.fillStyle(c.bone, 1);
  const b1 = at(s * 0.55, 0), b2 = at(s * 1.25, 0);
  g.lineStyle(s * 0.3, c.bone, 1);
  line(g, [b1, b2]);
  g.fillCircle(b2[0] + cos * s * 0.1 - sin * s * 0.18, b2[1] + sin * s * 0.1 + cos * s * 0.18, s * 0.22);
  g.fillCircle(b2[0] + cos * s * 0.1 + sin * s * 0.18, b2[1] + sin * s * 0.1 - cos * s * 0.18, s * 0.22);

  // Meat — a lumpy mass, darker at the base than the seared top.
  g.fillStyle(c.meat, 1);
  const m: Array<[number, number]> = [];
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * TAU;
    const rr = s * (0.78 + 0.1 * Math.sin(a * 3 + 1.2));
    m.push(at(Math.cos(a) * rr - s * 0.25, Math.sin(a) * rr));
  }
  poly(g, m);
  g.fillStyle(c.sear, 0.85);
  const hl: Array<[number, number]> = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * 0.85 + (i / 12) * Math.PI * 0.9;
    hl.push(at(Math.cos(a) * s * 0.6 - s * 0.28, Math.sin(a) * s * 0.6 - s * 0.12));
  }
  hl.push(at(-s * 0.28, -s * 0.1));
  poly(g, hl);

  // Grill stripes.
  g.lineStyle(Math.max(1, s * 0.09), 0x5c2418, 0.6);
  for (let i = -1; i <= 1; i++) {
    line(g, [at(-s * 0.75, i * s * 0.3), at(s * 0.15, i * s * 0.3 - s * 0.12)]);
  }
}

// ── 4 · Bramble ───────────────────────────────────────────────────────────

/** The thorn shell: tapered spines on a woody ring, flaring when it bites back. */
export function drawThornShell(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number,
  spin: number, flash: number,
): void {
  const c = MUT.bramble;
  const n = 14;
  g.lineStyle(Math.max(2, r * 0.09), c.wood, 0.8);
  const ring: Array<[number, number]> = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * TAU;
    ring.push([x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82]);
  }
  line(g, ring);

  for (let i = 0; i < n; i++) {
    const a = spin + (i / n) * TAU;
    const grow = r * (0.34 + rnd(i) * 0.3) * (1 + flash * 0.7);
    const base = r * 0.8;
    const tip = base + grow;
    const nx = -Math.sin(a), ny = Math.cos(a);
    const w = r * 0.1;
    g.fillStyle(i % 3 === 0 ? c.blood : c.thorn, 0.75 + flash * 0.25);
    poly(g, [
      [x + Math.cos(a) * base + nx * w, y + Math.sin(a) * base + ny * w],
      [x + Math.cos(a) * tip,           y + Math.sin(a) * tip],
      [x + Math.cos(a) * base - nx * w, y + Math.sin(a) * base - ny * w],
    ]);
    // A leaf every fourth spine — the shell is a bramble, not a mace.
    if (i % 4 === 1) {
      const la = a + 0.4;
      g.fillStyle(c.leaf, 0.55);
      poly(g, [
        [x + Math.cos(a) * base, y + Math.sin(a) * base],
        [x + Math.cos(la) * (base + grow * 0.5) - ny * w * 1.6, y + Math.sin(la) * (base + grow * 0.5) + nx * w * 1.6],
        [x + Math.cos(la) * (base + grow * 0.2), y + Math.sin(la) * (base + grow * 0.2)],
      ]);
    }
  }
  if (flash > 0.02) {
    g.lineStyle(2.5, c.blood, flash * 0.9);
    const f: Array<[number, number]> = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * TAU;
      f.push([x + Math.cos(a) * r * (1.15 + flash * 0.3), y + Math.sin(a) * r * (1.15 + flash * 0.3)]);
    }
    line(g, f);
  }
}

// ── 5 · Maelstrom ─────────────────────────────────────────────────────────

/** A spiral of curved arms with grit orbiting the eye. */
export function drawVortex(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, core: number, spin: number,
): void {
  const c = MUT.maelstrom;
  g.fillStyle(c.deep, 0.13);
  g.fillCircle(x, y, r);

  const arms = 5;
  for (let a = 0; a < arms; a++) {
    const base = spin + (a / arms) * TAU;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= 22; i++) {
      const t = i / 22;
      const ang = base + t * 3.1;
      const rr = core * 0.6 + t * (r - core * 0.6);
      pts.push([x + Math.cos(ang) * rr, y + Math.sin(ang) * rr]);
    }
    g.lineStyle(Math.max(1.5, r * 0.05), c.arm, 0.45);
    line(g, pts);
    g.lineStyle(Math.max(1, r * 0.02), c.grit, 0.35);
    line(g, pts.map(([px, py]) => [px + 2, py + 2] as [number, number]));
  }

  // Grit caught in the pull.
  for (let i = 0; i < 14; i++) {
    const t = rnd(i * 5);
    const ang = spin * (1.6 + t) + i * 0.9;
    const rr = core + (r - core) * ((t + (spin * 0.12) % 1) % 1);
    g.fillStyle(c.grit, 0.5);
    g.fillCircle(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, 1.2 + t * 1.8);
  }

  // The eye: bright, tight, and the only part that actually hurts.
  g.fillStyle(c.core, 0.55);
  g.fillCircle(x, y, core * 0.7);
  g.lineStyle(2, c.core, 0.85);
  const eye: Array<[number, number]> = [];
  for (let i = 0; i <= 18; i++) {
    const ang = (i / 18) * TAU;
    eye.push([x + Math.cos(ang) * core * (0.95 + 0.08 * Math.sin(ang * 4 + spin * 3)),
              y + Math.sin(ang) * core * (0.95 + 0.08 * Math.sin(ang * 4 + spin * 3))]);
  }
  line(g, eye);
}

// ── 6 · Inversion ─────────────────────────────────────────────────────────

/** Two arrows chasing each other round a ring — the "your keys are backwards" mark. */
export function drawInversionGlyph(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, spin: number, alpha: number,
): void {
  const c = MUT.inversion;
  g.lineStyle(Math.max(2, r * 0.16), c.ring, alpha * 0.8);
  for (let half = 0; half < 2; half++) {
    const from = spin + half * Math.PI + 0.35;
    const to = from + Math.PI - 0.9;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= 12; i++) {
      const a = from + (to - from) * (i / 12);
      pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    line(g, pts);
    // Arrowhead at the open end.
    const a = to;
    const tx = x + Math.cos(a) * r, ty = y + Math.sin(a) * r;
    const tang = a + Math.PI / 2;
    g.fillStyle(c.glyph, alpha);
    poly(g, [
      [tx + Math.cos(tang) * r * 0.42, ty + Math.sin(tang) * r * 0.42],
      [tx + Math.cos(tang - 2.3) * r * 0.34, ty + Math.sin(tang - 2.3) * r * 0.34],
      [tx + Math.cos(tang + 2.3) * r * 0.34, ty + Math.sin(tang + 2.3) * r * 0.34],
    ]);
  }
  for (let i = 0; i < 6; i++) {
    const a = -spin * 1.7 + (i / 6) * TAU;
    g.fillStyle(c.spark, alpha * 0.6);
    g.fillCircle(x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 1.35, 1.6);
  }
}

// ── 7 · Contagion ─────────────────────────────────────────────────────────

/** The pod that grows where you were standing when it hit you. */
export function drawSporePod(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, ripe: number, t: number,
): void {
  const c = MUT.contagion;
  g.fillStyle(c.rim, 0.5);
  blob(g, x, y, r * (0.7 + ripe * 0.4), 4, 0.14, 5, t * 0.004);
  g.fillStyle(c.culture, 0.7 + ripe * 0.25);
  blob(g, x, y, r * (0.5 + ripe * 0.38), 4, 0.16, 9, t * 0.005);
  g.fillStyle(c.spore, 0.8);
  for (let i = 0; i < 4; i++) {
    const a = t * 0.003 + (i / 4) * TAU;
    g.fillCircle(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, 1.4 + ripe * 1.4);
  }
  // Ripeness ring: a full circle means it is about to open.
  g.lineStyle(2, c.dish, 0.5 + ripe * 0.5);
  const pts: Array<[number, number]> = [];
  const span = TAU * Math.min(1, ripe);
  for (let i = 0; i <= 20; i++) {
    const a = -Math.PI / 2 + span * (i / 20);
    pts.push([x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25]);
  }
  line(g, pts);
}

/** The culture the pod bursts into — a bubbling dish that eats the floor tile. */
export function drawCulture(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, life01: number, t: number,
): void {
  const c = MUT.contagion;
  const a = 0.18 + 0.22 * life01;
  g.fillStyle(c.culture, a);
  blob(g, x, y, r, 6, 0.07, 21, t * 0.0016);
  g.fillStyle(c.rim, a * 0.7);
  blob(g, x, y, r * 0.66, 5, 0.09, 33, -t * 0.0021);
  g.lineStyle(1.6, c.dish, 0.35 + 0.35 * life01);
  const rim: Array<[number, number]> = [];
  for (let i = 0; i <= 22; i++) {
    const ang = (i / 22) * TAU;
    rim.push([x + Math.cos(ang) * r * (1 + 0.05 * Math.sin(ang * 5 + t * 0.003)),
              y + Math.sin(ang) * r * (1 + 0.05 * Math.sin(ang * 5 + t * 0.003))]);
  }
  line(g, rim);
  for (let i = 0; i < 9; i++) {
    const s = rnd(i * 17);
    const ang = t * 0.0012 * (1 + s) + i;
    const rr = r * (0.2 + s * 0.7);
    g.fillStyle(c.spore, 0.5 * life01 + 0.2);
    g.fillCircle(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, 1 + s * 2);
  }
}

// ── 8 · Duel ──────────────────────────────────────────────────────────────

/** Crossed sabres, flaring on every hit that lands anywhere in the match. */
export function drawDuelCrest(
  g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, flash: number,
): void {
  const c = MUT.duel;
  const drawSabre = (tilt: number) => {
    const cos = Math.cos(tilt), sin = Math.sin(tilt);
    const at = (lx: number, ly: number): [number, number] =>
      [x + lx * cos - ly * sin, y + lx * sin + ly * cos];
    g.fillStyle(c.shadow, 0.5);
    poly(g, [at(-s, 2.5), at(s * 0.72, 1.6), at(s * 0.96, 0), at(s * 0.72, -1.6), at(-s, -2.5)]);
    g.fillStyle(c.steel, 0.95);
    poly(g, [at(-s * 0.9, 1.8), at(s * 0.7, 1.1), at(s * 0.94, 0), at(s * 0.7, -1.1), at(-s * 0.9, -1.8)]);
    g.lineStyle(1, c.gleam, 0.5 + flash * 0.5);
    line(g, [at(-s * 0.8, -0.5), at(s * 0.7, -0.3)]);
    g.fillStyle(c.hilt, 1);
    poly(g, [at(-s, 5), at(-s * 0.78, 5), at(-s * 0.78, -5), at(-s, -5)]);
    g.fillCircle(at(-s * 1.12, 0)[0], at(-s * 1.12, 0)[1], 3);
  };
  drawSabre(-0.5);
  drawSabre(0.5 + Math.PI);
  if (flash > 0.02) {
    g.lineStyle(2, 0xff4455, flash);
    const ring: Array<[number, number]> = [];
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * TAU;
      ring.push([x + Math.cos(a) * s * (1.3 + flash * 0.5), y + Math.sin(a) * s * (1.3 + flash * 0.5)]);
    }
    line(g, ring);
  }
}

// ── 9 · Hydra ─────────────────────────────────────────────────────────────

/** A serpent head crest, painted over a split-off Head's body. */
export function drawHydraHead(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, facing: number, t: number,
): void {
  const c = MUT.hydra;
  const cos = Math.cos(facing), sin = Math.sin(facing);
  const at = (lx: number, ly: number): [number, number] =>
    [x + lx * cos - ly * sin, y + lx * sin + ly * cos];
  const sway = Math.sin(t * 0.006) * r * 0.12;

  // Neck, curving back from the head.
  g.lineStyle(r * 0.5, c.scale, 0.9);
  line(g, [at(-r * 1.5, sway * 1.4), at(-r * 0.7, sway * 0.6), at(0, 0)]);

  // Skull.
  g.fillStyle(c.scale, 1);
  poly(g, [at(-r * 0.7, r * 0.62), at(r * 0.55, r * 0.4), at(r * 1.15, 0), at(r * 0.55, -r * 0.4), at(-r * 0.7, -r * 0.62)]);
  g.fillStyle(c.belly, 0.85);
  poly(g, [at(r * 0.1, r * 0.28), at(r * 0.6, r * 0.2), at(r * 1.05, 0), at(r * 0.6, -r * 0.2), at(r * 0.1, -r * 0.28)]);

  // Open maw when it lunges.
  const gape = 0.4 + 0.35 * Math.max(0, Math.sin(t * 0.005));
  g.fillStyle(c.maw, 0.9);
  poly(g, [at(r * 0.5, 0), at(r * 1.2, r * 0.16 * gape * 3), at(r * 1.2, -r * 0.16 * gape * 3)]);
  g.fillStyle(0xffffff, 0.9);
  poly(g, [at(r * 1.0, r * 0.3 * gape), at(r * 1.18, r * 0.42 * gape), at(r * 1.16, r * 0.16 * gape)]);
  poly(g, [at(r * 1.0, -r * 0.3 * gape), at(r * 1.18, -r * 0.42 * gape), at(r * 1.16, -r * 0.16 * gape)]);

  // Eyes — slit pupils, so it reads as a snake and not a frog.
  const e1 = at(r * 0.3, r * 0.3), e2 = at(r * 0.3, -r * 0.3);
  g.fillStyle(c.eye, 1);
  g.fillCircle(e1[0], e1[1], r * 0.14);
  g.fillCircle(e2[0], e2[1], r * 0.14);
  g.fillStyle(0x101010, 1);
  g.fillRect(e1[0] - 0.7, e1[1] - 2, 1.4, 4);
  g.fillRect(e2[0] - 0.7, e2[1] - 2, 1.4, 4);
}

// ── 10 · Rewind ───────────────────────────────────────────────────────────

/** The dial that spins backwards over a rewinding body. */
export function drawRewindDial(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, prog: number, t: number,
): void {
  const c = MUT.rewind;
  g.lineStyle(Math.max(2, r * 0.13), c.dark, 0.6);
  const ring: Array<[number, number]> = [];
  for (let i = 0; i <= 26; i++) {
    const a = (i / 26) * TAU;
    ring.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  line(g, ring);

  // Filled arc, draining anticlockwise.
  g.lineStyle(Math.max(2, r * 0.13), c.dial, 0.9);
  const arc: Array<[number, number]> = [];
  const span = TAU * Phaser.Math.Clamp(prog, 0, 1);
  for (let i = 0; i <= 24; i++) {
    const a = -Math.PI / 2 - span * (i / 24);
    arc.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  line(g, arc);

  // Two backward chevrons in the middle.
  g.fillStyle(c.ghost, 0.85);
  for (let k = 0; k < 2; k++) {
    const ox = r * (0.16 - k * 0.34) + Math.sin(t * 0.008) * r * 0.05;
    poly(g, [[x + ox, y - r * 0.34], [x + ox, y + r * 0.34], [x + ox - r * 0.36, y]]);
  }
}

/** A faint after-image left along the path a rewind is undoing. */
export function drawRewindEcho(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, alpha: number,
): void {
  const c = MUT.rewind;
  g.lineStyle(1.5, c.ghost, alpha);
  const ring: Array<[number, number]> = [];
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * TAU;
    ring.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  line(g, ring);
  g.fillStyle(c.dial, alpha * 0.3);
  g.fillCircle(x, y, r * 0.55);
}

// ── 11 · Quicksand ────────────────────────────────────────────────────────

/** A sinking pit: concentric grain bands drifting inward. */
export function drawQuicksandPit(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, t: number, fade: number,
): void {
  const c = MUT.quicksand;
  g.fillStyle(c.pit, 0.30 * fade);
  g.fillCircle(x, y, r);
  const bands = 5;
  for (let i = 0; i < bands; i++) {
    const p = ((i / bands) + (t * 0.00008) % 1) % 1;
    const rr = r * (1 - p);
    g.lineStyle(Math.max(1.5, r * 0.06), i % 2 === 0 ? c.sand : c.deep, (0.5 - p * 0.35) * fade);
    const ring: Array<[number, number]> = [];
    for (let k = 0; k <= 24; k++) {
      const a = (k / 24) * TAU;
      const wob = 1 + 0.05 * Math.sin(a * 4 + i + t * 0.001);
      ring.push([x + Math.cos(a) * rr * wob, y + Math.sin(a) * rr * wob]);
    }
    line(g, ring);
  }
  for (let i = 0; i < 22; i++) {
    const s = rnd(i * 3);
    const a = i * 1.37 + t * 0.0006 * (1 + s);
    const rr = r * (0.15 + ((s + (t * 0.00006) % 1) % 1) * 0.8);
    g.fillStyle(c.grain, 0.55 * fade);
    g.fillCircle(x + Math.cos(a) * rr, y + Math.sin(a) * rr, 0.9 + s * 1.4);
  }
}

// ── 12 · Overload ─────────────────────────────────────────────────────────

/** An arcing coil clamped to the caster: fast cooldowns, at a price in blood. */
export function drawOverloadCoil(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, t: number, heat: number,
): void {
  const c = MUT.overload;
  // Coil windings, wrapping the body.
  g.lineStyle(Math.max(1.5, r * 0.1), c.coil, 0.85);
  for (let i = 0; i < 4; i++) {
    const yy = y - r * 0.6 + (i / 3) * r * 1.2;
    const w = r * Math.sqrt(Math.max(0.05, 1 - Math.pow((yy - y) / r, 2)));
    line(g, [[x - w, yy], [x + w, yy - r * 0.12]]);
  }
  // Arcs jumping between the windings — the moving part.
  const arcs = 3;
  for (let i = 0; i < arcs; i++) {
    const seed = Math.floor(t / 90) * 7 + i * 31;
    const a0 = rnd(seed) * TAU;
    const a1 = a0 + 1.4 + rnd(seed + 1) * 2;
    const pts: Array<[number, number]> = [];
    for (let k = 0; k <= 5; k++) {
      const a = a0 + (a1 - a0) * (k / 5);
      const jitter = (rnd(seed + k * 3) - 0.5) * r * 0.4;
      const rr = r * 1.05 + jitter;
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    g.lineStyle(2.4, c.hot, 0.75);
    line(g, pts);
    g.lineStyle(1, c.arc, 0.95);
    line(g, pts);
  }
  if (heat > 0.02) {
    g.fillStyle(c.burn, heat * 0.35);
    g.fillCircle(x, y, r * (1.2 + heat * 0.6));
  }
}

// ── 13 · Fragile ──────────────────────────────────────────────────────────

/** Cracks spreading over a body that has lost most of its health to hold. */
export function drawFragileCracks(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, severity: number,
): void {
  const c = MUT.fragile;
  const branches = 5;
  for (let i = 0; i < branches; i++) {
    const a0 = (i / branches) * TAU + rnd(i) * 0.8;
    const pts: Array<[number, number]> = [[x, y]];
    let a = a0, rr = 0;
    for (let k = 0; k < 4; k++) {
      a += (rnd(i * 10 + k) - 0.5) * 1.1;
      rr += r * (0.22 + rnd(i + k * 3) * 0.16);
      if (rr > r * (0.35 + severity * 0.8)) break;
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    g.lineStyle(Math.max(1, r * 0.09 * (0.5 + severity)), c.crack, 0.5 + severity * 0.45);
    line(g, pts);
  }
  g.fillStyle(c.shard, 0.5 * severity);
  for (let i = 0; i < 4; i++) {
    const a = rnd(i * 9) * TAU;
    const rr = r * (0.5 + rnd(i * 4) * 0.6);
    poly(g, [
      [x + Math.cos(a) * rr, y + Math.sin(a) * rr],
      [x + Math.cos(a + 0.3) * (rr + 3), y + Math.sin(a + 0.3) * (rr + 3)],
      [x + Math.cos(a + 0.1) * (rr + 5), y + Math.sin(a + 0.1) * (rr + 5)],
    ]);
  }
}

/** A cracked heart, drawn beside the health bar so the trade is legible. */
export function drawCrackedHeart(
  g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, beat: number,
): void {
  const c = MUT.fragile;
  const k = 1 + beat * 0.12;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= 28; i++) {
    const t = (i / 28) * TAU;
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    pts.push([x + hx * s * k / 16, y + hy * s * k / 16]);
  }
  g.fillStyle(c.heart, 0.95);
  poly(g, pts);
  g.lineStyle(Math.max(1, s * 0.12), c.crack, 1);
  line(g, [[x - s * 0.1, y - s * 0.55], [x + s * 0.16, y - s * 0.1], [x - s * 0.12, y + s * 0.2], [x + s * 0.06, y + s * 0.62]]);
}

// ── 14 · Swarm ────────────────────────────────────────────────────────────

/** One wasp: striped body, blurred wings, and a sting that points where it flies. */
export function drawWasp(
  g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, facing: number, t: number,
): void {
  const c = MUT.swarm;
  const cos = Math.cos(facing), sin = Math.sin(facing);
  const at = (lx: number, ly: number): [number, number] =>
    [x + lx * cos - ly * sin, y + lx * sin + ly * cos];

  // Wings — two fast blurs that change size every few frames.
  const beat = 0.5 + 0.5 * Math.sin(t * 0.06 + x);
  g.fillStyle(c.wing, 0.35 + beat * 0.25);
  poly(g, [at(0, 0), at(-s * 0.9, -s * (1.1 + beat * 0.5)), at(s * 0.5, -s * 0.5)]);
  poly(g, [at(0, 0), at(-s * 0.9, s * (1.1 + beat * 0.5)), at(s * 0.5, s * 0.5)]);

  // Abdomen with bands.
  g.fillStyle(c.body, 1);
  poly(g, [at(s * 0.5, s * 0.42), at(-s * 1.2, s * 0.26), at(-s * 1.5, 0), at(-s * 1.2, -s * 0.26), at(s * 0.5, -s * 0.42)]);
  g.fillStyle(c.band, 0.9);
  for (let i = 0; i < 3; i++) {
    const bx = -s * (0.2 + i * 0.42);
    const h = s * (0.36 - i * 0.06);
    poly(g, [at(bx, h), at(bx - s * 0.16, h * 0.9), at(bx - s * 0.16, -h * 0.9), at(bx, -h)]);
  }
  // Head + sting.
  const head = at(s * 0.62, 0);
  g.fillStyle(c.band, 1);
  g.fillCircle(head[0], head[1], s * 0.3);
  g.fillStyle(c.sting, 1);
  poly(g, [at(-s * 1.5, s * 0.1), at(-s * 2.1, 0), at(-s * 1.5, -s * 0.1)]);
}

// ── 15 · Tempest ──────────────────────────────────────────────────────────

/** The mark that says a bolt is already on its way here. */
export function drawStrikeMark(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, prog: number, t: number,
): void {
  const c = MUT.tempest;
  g.lineStyle(2, c.mark, 0.35 + prog * 0.5);
  const ring: Array<[number, number]> = [];
  for (let i = 0; i <= 26; i++) {
    const a = (i / 26) * TAU;
    ring.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  line(g, ring);
  // Closing ring — the timer you actually read.
  g.lineStyle(3, c.hot, 0.5 + prog * 0.5);
  const close: Array<[number, number]> = [];
  const rr = r * (1.9 - prog * 0.9);
  for (let i = 0; i <= 26; i++) {
    const a = (i / 26) * TAU;
    close.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  line(g, close);
  // Converging chevrons.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + t * 0.002;
    const tip = r * (0.35 + (1 - prog) * 0.4);
    const nx = -Math.sin(a), ny = Math.cos(a);
    g.fillStyle(c.mark, 0.4 + prog * 0.5);
    poly(g, [
      [x + Math.cos(a) * r * 0.95 + nx * r * 0.22, y + Math.sin(a) * r * 0.95 + ny * r * 0.22],
      [x + Math.cos(a) * tip, y + Math.sin(a) * tip],
      [x + Math.cos(a) * r * 0.95 - nx * r * 0.22, y + Math.sin(a) * r * 0.95 - ny * r * 0.22],
    ]);
  }
}

/** The bolt itself: a jagged trunk from the ceiling with two forks. */
export function drawBolt(
  g: Phaser.GameObjects.Graphics,
  topY: number, x: number, y: number, seed: number, alpha: number,
): void {
  const c = MUT.tempest;
  const build = (jit: number): Array<[number, number]> => {
    const pts: Array<[number, number]> = [];
    const steps = 9;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const py = topY + (y - topY) * t;
      const px = x + (rnd(seed + i * 3) - 0.5) * jit * (1 - t * 0.6);
      pts.push([px, py]);
    }
    return pts;
  };
  const trunk = build(34);
  g.lineStyle(7, c.bolt, alpha * 0.25);
  line(g, trunk);
  g.lineStyle(3.4, c.bolt, alpha * 0.8);
  line(g, trunk);
  g.lineStyle(1.4, c.hot, alpha);
  line(g, trunk);
  // Forks off the trunk.
  for (let f = 0; f < 2; f++) {
    const anchor = trunk[3 + f * 3];
    const dir = f === 0 ? -1 : 1;
    const fork: Array<[number, number]> = [anchor];
    let fx = anchor[0], fy = anchor[1];
    for (let i = 0; i < 3; i++) {
      fx += dir * (10 + rnd(seed + f * 11 + i) * 18);
      fy += 14 + rnd(seed + f * 5 + i) * 12;
      fork.push([fx, fy]);
    }
    g.lineStyle(1.8, c.bolt, alpha * 0.6);
    line(g, fork);
  }
  g.fillStyle(c.hot, alpha * 0.5);
  g.fillCircle(x, y, 16);
}

// ── 16 · Bulwark ──────────────────────────────────────────────────────────

/** The riveted plate the enemy keeps between you and it. */
export function drawBulwarkPlate(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number,
  facing: number, halfArc: number, lit: number,
): void {
  const c = MUT.bulwark;
  const inner = r, outer = r + 11;
  const band = (r0: number, r1: number, color: number, alpha: number) => {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= 18; i++) {
      const a = facing - halfArc + (halfArc * 2) * (i / 18);
      pts.push([x + Math.cos(a) * r1, y + Math.sin(a) * r1]);
    }
    for (let i = 18; i >= 0; i--) {
      const a = facing - halfArc + (halfArc * 2) * (i / 18);
      pts.push([x + Math.cos(a) * r0, y + Math.sin(a) * r0]);
    }
    g.fillStyle(color, alpha);
    poly(g, pts);
  };
  band(inner, outer, c.plate, 0.92);
  band(outer - 4, outer, c.bevel, 0.5);
  // Rivets along the plate.
  for (let i = 0; i <= 5; i++) {
    const a = facing - halfArc * 0.86 + (halfArc * 1.72) * (i / 5);
    g.fillStyle(c.rivet, 0.95);
    g.fillCircle(x + Math.cos(a) * (inner + 5.5), y + Math.sin(a) * (inner + 5.5), 2.1);
    g.fillStyle(c.bevel, 0.6);
    g.fillCircle(x + Math.cos(a) * (inner + 5.5) - 0.7, y + Math.sin(a) * (inner + 5.5) - 0.7, 0.9);
  }
  // Boss stud at the centre of the plate.
  g.fillStyle(c.rivet, 1);
  g.fillCircle(x + Math.cos(facing) * (outer + 2), y + Math.sin(facing) * (outer + 2), 4.5);
  g.fillStyle(c.bevel, 0.8);
  g.fillCircle(x + Math.cos(facing) * (outer + 1), y + Math.sin(facing) * (outer + 1), 2);
  if (lit > 0.02) {
    g.lineStyle(3, c.lit, lit);
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= 18; i++) {
      const a = facing - halfArc + (halfArc * 2) * (i / 18);
      pts.push([x + Math.cos(a) * (outer + 3), y + Math.sin(a) * (outer + 3)]);
    }
    line(g, pts);
  }
}

// ── 17 · Vault ────────────────────────────────────────────────────────────

/** A padlock. Shackle swings open on the frame a slot is released. */
export function drawPadlock(
  g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, open01: number,
): void {
  const c = MUT.vault;
  // Shackle.
  g.lineStyle(Math.max(2, s * 0.22), c.iron, 1);
  const lift = open01 * s * 0.5;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI + (i / 14) * Math.PI;
    pts.push([x + Math.cos(a) * s * 0.52 + open01 * s * 0.35, y - s * 0.5 - lift + Math.sin(a) * s * 0.52]);
  }
  line(g, pts);
  // Body.
  g.fillStyle(c.brass, 1);
  g.fillRect(x - s * 0.78, y - s * 0.5, s * 1.56, s * 1.2);
  g.fillStyle(c.shine, 0.45);
  g.fillRect(x - s * 0.7, y - s * 0.42, s * 0.3, s * 1.04);
  g.lineStyle(1.4, 0x6b5320, 0.8);
  g.strokeRect(x - s * 0.78, y - s * 0.5, s * 1.56, s * 1.2);
  // Keyhole.
  g.fillStyle(0x2a2210, 1);
  g.fillCircle(x, y - s * 0.02, s * 0.2);
  poly(g, [[x - s * 0.11, y + s * 0.05], [x + s * 0.11, y + s * 0.05], [x + s * 0.06, y + s * 0.5], [x - s * 0.06, y + s * 0.5]]);
}

// ── 18 · Roulette ─────────────────────────────────────────────────────────

/** The wheel that decides what happens next. Segments, pins, and a pointer. */
export function drawRouletteWheel(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number,
  segments: number, spin: number, landedIdx: number, glow: number,
): void {
  const c = MUT.roulette;
  const step = TAU / segments;
  for (let i = 0; i < segments; i++) {
    const a0 = spin + i * step, a1 = a0 + step;
    const pts: Array<[number, number]> = [[x, y]];
    for (let k = 0; k <= 6; k++) {
      const a = a0 + (a1 - a0) * (k / 6);
      pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    const hit = i === landedIdx && glow > 0;
    g.fillStyle(hit ? c.mark : c.felt, hit ? 0.35 + glow * 0.5 : (i % 2 ? 0.85 : 0.65));
    poly(g, pts);
  }
  // Rim and spokes.
  g.lineStyle(Math.max(2, r * 0.09), c.rim, 0.95);
  const rim: Array<[number, number]> = [];
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * TAU;
    rim.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  line(g, rim);
  for (let i = 0; i < segments; i++) {
    const a = spin + i * step;
    g.lineStyle(1.2, c.rim, 0.6);
    line(g, [[x, y], [x + Math.cos(a) * r, y + Math.sin(a) * r]]);
    g.fillStyle(c.pin, 0.9);
    g.fillCircle(x + Math.cos(a) * r * 0.94, y + Math.sin(a) * r * 0.94, 1.6);
  }
  g.fillStyle(c.rim, 1);
  g.fillCircle(x, y, r * 0.16);
  // Pointer at the top.
  g.fillStyle(c.mark, 1);
  poly(g, [[x, y - r * 0.82], [x - r * 0.13, y - r * 1.16], [x + r * 0.13, y - r * 1.16]]);
}

// ── 19 · Warden ───────────────────────────────────────────────────────────

/** An anchor post: a driven iron stake with a ring the chains run through. */
export function drawAnchorPost(
  g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, t: number,
): void {
  const c = MUT.warden;
  g.fillStyle(c.dark, 0.35);
  g.fillCircle(x, y + s * 0.5, s * 0.9);
  g.fillStyle(c.iron, 1);
  poly(g, [[x - s * 0.34, y - s], [x + s * 0.34, y - s], [x + s * 0.2, y + s * 0.7], [x - s * 0.2, y + s * 0.7]]);
  g.fillStyle(c.rust, 0.55);
  poly(g, [[x - s * 0.34, y - s * 0.2], [x + s * 0.34, y - s * 0.28], [x + s * 0.28, y + s * 0.2], [x - s * 0.28, y + s * 0.26]]);
  g.lineStyle(Math.max(2, s * 0.2), c.iron, 1);
  const ring: Array<[number, number]> = [];
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * TAU;
    ring.push([x + Math.cos(a) * s * 0.46, y - s * 0.92 + Math.sin(a) * s * 0.46]);
  }
  line(g, ring);
  g.fillStyle(c.hot, 0.25 + 0.15 * Math.sin(t * 0.004 + x));
  g.fillCircle(x, y - s * 0.92, s * 0.2);
}

/** A run of chain: real links, alternating orientation, drawn along a segment. */
export function drawChain(
  g: Phaser.GameObjects.Graphics,
  x1: number, y1: number, x2: number, y2: number, phase: number, hot: number,
): void {
  const c = MUT.warden;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux;
  const step = 13;
  const n = Math.floor(len / step);
  g.lineStyle(2.4, c.dark, 0.5);
  line(g, [[x1, y1], [x2, y2]]);
  for (let i = 0; i < n; i++) {
    const d = (i + (phase % 1)) * step;
    if (d > len) break;
    const px = x1 + ux * d, py = y1 + uy * d;
    const flat = i % 2 === 0;
    const a = flat ? 5.5 : 3.2;
    const b = flat ? 3.2 : 5.5;
    g.lineStyle(2.2, hot > 0.02 ? c.hot : c.iron, 0.9);
    const link: Array<[number, number]> = [];
    for (let k = 0; k <= 12; k++) {
      const th = (k / 12) * TAU;
      const lx = Math.cos(th) * a, ly = Math.sin(th) * b;
      link.push([px + ux * lx + nx * ly, py + uy * lx + ny * ly]);
    }
    line(g, link);
  }
  if (hot > 0.02) {
    g.lineStyle(6, c.hot, hot * 0.4);
    line(g, [[x1, y1], [x2, y2]]);
  }
}

/** The barbed hook on the end of the warden's throw. */
export function drawHook(
  g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, facing: number,
): void {
  const c = MUT.warden;
  const cos = Math.cos(facing), sin = Math.sin(facing);
  const at = (lx: number, ly: number): [number, number] =>
    [x + lx * cos - ly * sin, y + lx * sin + ly * cos];
  g.fillStyle(c.iron, 1);
  poly(g, [at(-s, s * 0.34), at(s * 0.2, s * 0.24), at(s * 0.2, -s * 0.24), at(-s, -s * 0.34)]);
  g.lineStyle(Math.max(2, s * 0.3), c.iron, 1);
  const claw: Array<[number, number]> = [];
  for (let i = 0; i <= 10; i++) {
    const a = -1.5 + (i / 10) * 3.0;
    claw.push(at(s * 0.2 + Math.cos(a) * s * 0.75, Math.sin(a) * s * 0.75));
  }
  line(g, claw);
  g.fillStyle(c.rust, 1);
  poly(g, [at(s * 0.95, s * 0.2), at(s * 1.4, 0), at(s * 0.95, -s * 0.2)]);
}

// ── 20 · Oracle ───────────────────────────────────────────────────────────

export type ProphecyShape = 'ring' | 'cross' | 'triangle' | 'star' | 'eye';

/**
 * A prophecy inscribed on the floor. Every shape is the same contract — it
 * finishes drawing itself, then it happens — so the player learns to read the
 * completion rather than the silhouette.
 */
export function drawProphecy(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number,
  shape: ProphecyShape, prog: number, t: number,
): void {
  const c = MUT.oracle;
  const a = 0.25 + prog * 0.55;

  g.fillStyle(c.deep, 0.16 + prog * 0.2);
  g.fillCircle(x, y, r);

  // Outer inscription ring with radial ticks, filling as the prophecy completes.
  g.lineStyle(2, c.rune, 0.35);
  const outer: Array<[number, number]> = [];
  for (let i = 0; i <= 30; i++) {
    const th = (i / 30) * TAU;
    outer.push([x + Math.cos(th) * r, y + Math.sin(th) * r]);
  }
  line(g, outer);
  g.lineStyle(3, prog > 0.92 ? c.burn : c.rune, a);
  const fill: Array<[number, number]> = [];
  for (let i = 0; i <= 30; i++) {
    const th = -Math.PI / 2 + TAU * prog * (i / 30);
    fill.push([x + Math.cos(th) * r, y + Math.sin(th) * r]);
  }
  line(g, fill);
  for (let i = 0; i < 16; i++) {
    const th = (i / 16) * TAU + t * 0.0004;
    const inR = r * (i % 4 === 0 ? 0.86 : 0.93);
    g.lineStyle(i % 4 === 0 ? 2 : 1, c.rune, 0.45);
    line(g, [[x + Math.cos(th) * inR, y + Math.sin(th) * inR],
             [x + Math.cos(th) * r, y + Math.sin(th) * r]]);
  }

  const R = r * 0.66;
  g.lineStyle(2.6, c.inner, a);
  if (shape === 'ring') {
    const inner: Array<[number, number]> = [];
    for (let i = 0; i <= 26; i++) {
      const th = (i / 26) * TAU;
      inner.push([x + Math.cos(th) * R, y + Math.sin(th) * R]);
    }
    line(g, inner);
    const inner2: Array<[number, number]> = [];
    for (let i = 0; i <= 26; i++) {
      const th = (i / 26) * TAU;
      inner2.push([x + Math.cos(th) * R * 0.55, y + Math.sin(th) * R * 0.55]);
    }
    line(g, inner2);
  } else if (shape === 'cross') {
    line(g, [[x - R, y], [x + R, y]]);
    line(g, [[x, y - R], [x, y + R]]);
    line(g, [[x - R * 0.5, y - R * 0.5], [x + R * 0.5, y + R * 0.5]]);
    line(g, [[x + R * 0.5, y - R * 0.5], [x - R * 0.5, y + R * 0.5]]);
  } else if (shape === 'triangle') {
    for (let k = 0; k < 2; k++) {
      const off = k * Math.PI;
      const tri: Array<[number, number]> = [];
      for (let i = 0; i <= 3; i++) {
        const th = off - Math.PI / 2 + (i / 3) * TAU;
        tri.push([x + Math.cos(th) * R, y + Math.sin(th) * R]);
      }
      line(g, tri);
    }
  } else if (shape === 'star') {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= 5; i++) {
      const th = -Math.PI / 2 + (i * 2 / 5) * TAU;
      pts.push([x + Math.cos(th) * R, y + Math.sin(th) * R]);
    }
    line(g, pts);
  } else {
    // Eye: two arcs and a pupil that tracks the passage of the prophecy.
    const lid = (sign: number) => {
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= 16; i++) {
        const th = -1 + (i / 16) * 2;
        pts.push([x + th * R, y + sign * Math.cos(th * 1.2) * R * 0.55]);
      }
      line(g, pts);
    };
    lid(1); lid(-1);
    g.fillStyle(c.inner, a);
    g.fillCircle(x + Math.sin(t * 0.002) * R * 0.25, y, R * 0.26);
    g.fillStyle(c.deep, a);
    g.fillCircle(x + Math.sin(t * 0.002) * R * 0.25, y, R * 0.12);
  }

  if (prog > 0.9) {
    g.lineStyle(4, c.burn, (prog - 0.9) * 10 * 0.8);
    const flare: Array<[number, number]> = [];
    for (let i = 0; i <= 26; i++) {
      const th = (i / 26) * TAU;
      flare.push([x + Math.cos(th) * r * 1.06, y + Math.sin(th) * r * 1.06]);
    }
    line(g, flare);
  }
}
