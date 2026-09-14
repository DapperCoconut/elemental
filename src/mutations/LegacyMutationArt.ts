import Phaser from 'phaser';

/**
 * Real art for the original seventeen mutations.
 *
 * Those were written before the visual bar moved: a Titanic shield was a blue
 * circle, an Amber dinosaur was a green circle, an Archfiend trident was a
 * rectangle. The rules were good and are untouched — this module only takes
 * over the *look*. ArenaScene keeps owning the state and the hitboxes, hides
 * the placeholder primitives, and hands a flat snapshot of positions to
 * {@link paintLegacyMutations} once a frame.
 *
 * Same house style as `MutationVisuals.ts`: everything gets a rim, an interior
 * detail and something that moves.
 */

const TAU = Math.PI * 2;

function poly(g: Phaser.GameObjects.Graphics, pts: Array<[number, number]>): void {
  if (pts.length < 3) return;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  g.fillPath();
}

function line(g: Phaser.GameObjects.Graphics, pts: Array<[number, number]>): void {
  if (pts.length < 2) return;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.strokePath();
}

function ring(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number,
  wobble = 0, phase = 0, steps = 24,
): void {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * TAU;
    const rr = r * (1 + wobble * Math.sin(a * 5 + phase));
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  line(g, pts);
}

function rnd(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// ── snapshot handed over by ArenaScene ────────────────────────────────────

export interface LegacyMutationState {
  has(id: string): boolean;
  starred(id: string): boolean;
  npc: { x: number; y: number; scale: number; active: boolean };
  /** Titanic's orbiting projectile-eaters. */
  titanicShields: Array<{ x: number; y: number }>;
  /** Amber's mount, with the direction it is facing and how much of it is left. */
  amberDino: { x: number; y: number; facing: number; hp01: number } | null;
  /** Archfiend's thrown tridents. */
  tridents: Array<{ x: number; y: number; angle: number; stuck: boolean }>;
  /** Clot's blood tree. */
  clotTree: { x: number; y: number; hp01: number } | null;
  /** Tinker's buildings, by kind. */
  tinker: Array<{ x: number; y: number; kind: string; hp01: number }>;
  /** Encroach's land mines. */
  mines: Array<{ x: number; y: number; armed: boolean }>;
  /** Golf's ball. */
  golf: { x: number; y: number; r: number; speed: number; dark: boolean } | null;
}

// ── Titanic ───────────────────────────────────────────────────────────────

/** An aegis: a layered disc with a rune band and a bright leading edge. */
function drawAegis(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, t: number): void {
  g.fillStyle(0x1b2f52, 0.85);
  ring(g, x, y, r);
  g.fillCircle(x, y, r);
  g.fillStyle(0x88aaff, 0.55);
  g.fillCircle(x, y, r * 0.78);
  g.fillStyle(0xdce8ff, 0.35);
  poly(g, [
    [x - r * 0.5, y - r * 0.45], [x + r * 0.1, y - r * 0.62],
    [x + r * 0.3, y - r * 0.3], [x - r * 0.3, y - r * 0.12],
  ]);
  // Rune band.
  g.lineStyle(2, 0xcfe0ff, 0.9);
  ring(g, x, y, r * 0.9);
  for (let i = 0; i < 8; i++) {
    const a = t * 0.0012 + (i / 8) * TAU;
    const r0 = r * 0.62, r1 = r * 0.86;
    g.lineStyle(i % 2 ? 1.2 : 2.2, 0xffffff, 0.6);
    line(g, [
      [x + Math.cos(a) * r0, y + Math.sin(a) * r0],
      [x + Math.cos(a + 0.18) * r1, y + Math.sin(a + 0.18) * r1],
    ]);
  }
  g.lineStyle(2.6, 0xffffff, 0.55 + 0.25 * Math.sin(t * 0.005));
  ring(g, x, y, r * 1.06, 0.03, t * 0.004);
}

// ── Amber ─────────────────────────────────────────────────────────────────

/** The mount. A real theropod: legs, tail, neck, jaw, teeth, and a tracking eye. */
function drawDino(
  g: Phaser.GameObjects.Graphics, x: number, y: number, facing: number, hp01: number, t: number,
): void {
  const flip = Math.cos(facing) < 0 ? -1 : 1;
  const s = 1;
  const at = (lx: number, ly: number): [number, number] => [x + lx * flip * s, y + ly * s];
  const step = Math.sin(t * 0.012) * 4;
  const hurt = 1 - hp01;
  const skin = Phaser.Display.Color.GetColor(
    0x2a + Math.round(hurt * 0x50), 0x8a - Math.round(hurt * 0x28), 0x3a,
  );

  // Tail, counter-swinging with the stride.
  g.lineStyle(9, skin, 1);
  line(g, [at(-8, -2), at(-22, -6 - step * 0.4), at(-34, -14 - step * 0.7)]);
  g.lineStyle(4, 0x1c5c26, 1);
  line(g, [at(-24, -7 - step * 0.4), at(-34, -14 - step * 0.7)]);

  // Back legs.
  g.lineStyle(6, 0x1c5c26, 1);
  line(g, [at(-6, 2), at(-10, 10 + step), at(-3, 16 + step)]);
  line(g, [at(2, 3), at(-1, 11 - step), at(6, 16 - step)]);

  // Body.
  g.fillStyle(skin, 1);
  poly(g, [at(-14, -4), at(-4, -12), at(10, -10), at(16, -2), at(10, 8), at(-6, 8)]);
  g.fillStyle(0xa8dc8c, 0.7);
  poly(g, [at(-4, 2), at(8, 4), at(12, 0), at(4, -3)]);

  // Neck + skull.
  g.lineStyle(7, skin, 1);
  line(g, [at(10, -6), at(18, -12), at(24, -13)]);
  g.fillStyle(skin, 1);
  poly(g, [at(20, -18), at(34, -16), at(38, -11), at(34, -7), at(21, -8)]);
  // Jaw, opening as it lunges.
  const gape = 2 + 3 * Math.max(0, Math.sin(t * 0.009));
  g.fillStyle(0x1c5c26, 1);
  poly(g, [at(24, -8), at(37, -9 + gape), at(37, -6 + gape), at(24, -5)]);
  // Teeth.
  g.fillStyle(0xf2f0e2, 1);
  for (let i = 0; i < 4; i++) {
    const tx = 26 + i * 3;
    poly(g, [at(tx, -8), at(tx + 1.4, -5), at(tx + 2.6, -8)]);
  }
  // Eye, with a slit pupil so it reads as a predator.
  const eye = at(29, -14);
  g.fillStyle(0xffe15c, 1);
  g.fillCircle(eye[0], eye[1], 2.6);
  g.fillStyle(0x101208, 1);
  g.fillRect(eye[0] - 0.6, eye[1] - 2, 1.2, 4);
  // Dorsal ridge.
  g.fillStyle(0x8fbf5c, 1);
  for (let i = 0; i < 5; i++) {
    const bx = -10 + i * 5;
    poly(g, [at(bx, -9 - i * 0.4), at(bx + 2, -14 - i * 0.6), at(bx + 4, -9 - i * 0.4)]);
  }
  // Amber saddle ring the rider sits in.
  g.lineStyle(2.5, 0x33cc55, 0.9);
  ring(g, x, y - 12, 15, 0.05, t * 0.003, 18);
}

// ── Archfiend ─────────────────────────────────────────────────────────────

/** A trident: haft, crossbar, three barbed prongs, and heat off the metal. */
function drawTrident(
  g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number, stuck: boolean, t: number,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const at = (lx: number, ly: number): [number, number] =>
    [x + lx * cos - ly * sin, y + lx * sin + ly * cos];
  const glow = stuck ? 0.35 : 0.6 + 0.25 * Math.sin(t * 0.02);

  g.fillStyle(0xff5522, glow * 0.25);
  g.fillCircle(x, y, 13);
  // Haft.
  g.lineStyle(3.4, 0x4a2417, 1);
  line(g, [at(-17, 0), at(6, 0)]);
  g.lineStyle(1.2, 0x8a5a3a, 0.8);
  line(g, [at(-15, -1), at(4, -1)]);
  // Crossbar.
  g.lineStyle(2.6, 0xcc4422, 1);
  line(g, [at(5, -7), at(5, 7)]);
  // Three prongs.
  for (const off of [-6, 0, 6]) {
    g.lineStyle(2.4, 0xd8603a, 1);
    line(g, [at(5, off), at(12, off * 0.75), at(18, off * 0.4)]);
    g.fillStyle(0xffcf9a, 1);
    poly(g, [at(17, off * 0.4 + 1.8), at(23, off * 0.2), at(17, off * 0.4 - 1.8)]);
    // Barb.
    g.fillStyle(0xcc4422, 1);
    poly(g, [at(16, off * 0.4), at(13, off * 0.4 + 3.4), at(14.5, off * 0.4)]);
  }
  // Butt cap.
  g.fillStyle(0x2a1208, 1);
  const cap = at(-18, 0);
  g.fillCircle(cap[0], cap[1], 2.4);
}

// ── Clot ──────────────────────────────────────────────────────────────────

/** The blood tree: a knotted trunk, splayed roots, and a dripping canopy. */
function drawBloodTree(
  g: Phaser.GameObjects.Graphics, x: number, y: number, hp01: number, t: number,
): void {
  const alive = Phaser.Math.Clamp(hp01, 0, 1);
  // Roots.
  g.lineStyle(4, 0x4a0d0d, 1);
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    line(g, [[x, y + 22], [x + i * 9, y + 28], [x + i * 15, y + 31]]);
  }
  // Trunk, thickening downward with two knots.
  g.fillStyle(0x661111, 1);
  poly(g, [[x - 5, y - 16], [x + 5, y - 16], [x + 9, y + 26], [x - 9, y + 26]]);
  g.fillStyle(0x8a1c1c, 0.8);
  poly(g, [[x - 2, y - 16], [x + 2, y - 16], [x + 3, y + 26], [x - 1, y + 26]]);
  g.fillStyle(0x3d0a0a, 1);
  g.fillCircle(x - 3, y + 4, 2.6);
  g.fillCircle(x + 4, y + 14, 2);

  // Branches into the canopy.
  g.lineStyle(3, 0x661111, 1);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.42;
    line(g, [[x, y - 12], [x + Math.cos(a) * 16, y - 12 + Math.sin(a) * 14]]);
  }

  // Canopy: overlapping lobes, sagging as the tree loses health.
  const lobes = 7;
  const spread = 26 * (0.6 + alive * 0.4);
  for (let i = 0; i < lobes; i++) {
    const a = Math.PI + (i / (lobes - 1)) * Math.PI;
    const lx = x + Math.cos(a) * spread * 0.9;
    const ly = y - 20 + Math.sin(a) * spread * 0.55;
    g.fillStyle(i % 2 ? 0xaa0033 : 0x8c0028, 0.95);
    g.fillCircle(lx, ly, spread * 0.42);
  }
  g.fillStyle(0xd0114a, 0.5);
  g.fillCircle(x - spread * 0.25, y - 30, spread * 0.3);
  g.lineStyle(2, 0xff2255, 0.85);
  ring(g, x, y - 22, spread * 0.95, 0.09, t * 0.001, 20);

  // Drips, on their own falling clock.
  for (let i = 0; i < 4; i++) {
    const seed = rnd(i * 13);
    const fall = ((t * 0.0006 + seed) % 1);
    const dx = x - spread * 0.7 + seed * spread * 1.4;
    const dy = y - 10 + fall * 26;
    g.fillStyle(0xcc0033, 0.85 * (1 - fall));
    g.fillCircle(dx, dy, 2 + (1 - fall) * 1.4);
  }
}

// ── Tinker ────────────────────────────────────────────────────────────────

/** Turret, dispenser or shredder, each a machine rather than a coloured square. */
function drawBuilding(
  g: Phaser.GameObjects.Graphics, x: number, y: number, kind: string, hp01: number, t: number,
): void {
  const upgraded = kind.endsWith('+');
  const base = kind.replace('+', '');
  const wear = 1 - Phaser.Math.Clamp(hp01, 0, 1);

  // Shared chassis: a bolted plate on four feet.
  g.fillStyle(0x2b2f36, 1);
  poly(g, [[x - 15, y + 6], [x + 15, y + 6], [x + 12, y + 14], [x - 12, y + 14]]);
  g.fillStyle(0x434a55, 1);
  g.fillRect(x - 14, y - 6, 28, 13);
  g.lineStyle(1.2, 0x1a1d22, 0.9);
  g.strokeRect(x - 14, y - 6, 28, 13);
  for (const bx of [-11, 11]) {
    g.fillStyle(0x8f98a4, 1);
    g.fillCircle(x + bx, y + 1, 1.8);
  }
  if (wear > 0.35) {
    g.lineStyle(1.4, 0x1a1d22, wear);
    line(g, [[x - 10, y - 4], [x - 3, y + 3], [x - 6, y + 6]]);
  }

  if (base === 'turret') {
    // Rotating head with a barrel that tracks.
    const sweep = Math.sin(t * 0.003) * 0.7;
    g.fillStyle(upgraded ? 0xc2803a : 0x8a5a2a, 1);
    g.fillCircle(x, y - 8, 8);
    g.lineStyle(2, 0x3a2410, 1);
    ring(g, x, y - 8, 8, 0, 0, 16);
    g.lineStyle(upgraded ? 6 : 4.4, 0x6b4a22, 1);
    line(g, [[x, y - 8], [x + Math.cos(sweep) * 20, y - 8 + Math.sin(sweep) * 20]]);
    g.fillStyle(0xffb347, 0.9);
    g.fillCircle(x + Math.cos(sweep) * 20, y - 8 + Math.sin(sweep) * 20, upgraded ? 3.2 : 2.4);
    if (upgraded) {
      // Rocket pod on the shoulder.
      g.fillStyle(0x9a3a2a, 1);
      g.fillRect(x - 12, y - 16, 8, 5);
      g.fillStyle(0xffd08a, 1);
      g.fillRect(x - 12, y - 16, 2, 5);
    }
  } else if (base === 'dispenser') {
    // Glass tank with a fluid level and a cross.
    g.fillStyle(0x16324f, 1);
    g.fillRect(x - 8, y - 20, 16, 15);
    const lvl = 3 + 9 * Phaser.Math.Clamp(hp01, 0, 1);
    g.fillStyle(upgraded ? 0x66ffcc : 0x44aaff, 0.85);
    g.fillRect(x - 7, y - 6 - lvl, 14, lvl);
    g.fillStyle(0xffffff, 0.25);
    g.fillRect(x - 7, y - 20, 3, 15);
    g.lineStyle(1.4, 0x88ccff, 0.9);
    g.strokeRect(x - 8, y - 20, 16, 15);
    g.fillStyle(0xdcffe8, 0.95);
    g.fillRect(x - 1.6, y - 17, 3.2, 9);
    g.fillRect(x - 4.5, y - 14, 9, 3.2);
    // Bubbles rising in the tank.
    for (let i = 0; i < 3; i++) {
      const p = ((t * 0.0009 + rnd(i * 7)) % 1);
      g.fillStyle(0xffffff, 0.5 * (1 - p));
      g.fillCircle(x - 4 + rnd(i * 3) * 8, y - 6 - p * lvl, 1.2);
    }
  } else {
    // Shredder: a toothed drum, spinning.
    const spin = t * 0.006;
    g.fillStyle(0x4a1226, 1);
    g.fillCircle(x, y - 8, 10);
    g.fillStyle(0x882244, 1);
    for (let i = 0; i < 8; i++) {
      const a = spin + (i / 8) * TAU;
      poly(g, [
        [x + Math.cos(a) * 9, y - 8 + Math.sin(a) * 9],
        [x + Math.cos(a + 0.24) * 15, y - 8 + Math.sin(a + 0.24) * 15],
        [x + Math.cos(a + 0.5) * 9, y - 8 + Math.sin(a + 0.5) * 9],
      ]);
    }
    g.fillStyle(0xff88aa, 0.9);
    g.fillCircle(x, y - 8, 3.4);
    g.lineStyle(1.6, 0xff4488, 0.7);
    ring(g, x, y - 8, 16, 0.08, -spin, 18);
  }
}

// ── Encroach ──────────────────────────────────────────────────────────────

/**
 * A pressure mine: pronged shell, plate, and an LED that only just gives it away.
 *
 * Deliberately painted at the same near-nothing alpha the flat circles used —
 * Encroach's mines are *meant* to be almost invisible, so this is a character
 * upgrade at identical visibility, not a nerf to the mutation.
 */
function drawMine(
  g: Phaser.GameObjects.Graphics, x: number, y: number, armed: boolean, t: number,
): void {
  const a = armed ? 0.16 : 0.06;
  g.fillStyle(0x14161a, 0.9 * a);
  g.fillCircle(x, y, 9);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * TAU + 0.3;
    g.lineStyle(1.8, 0x8a6a30, a);
    line(g, [[x + Math.cos(ang) * 6, y + Math.sin(ang) * 6],
             [x + Math.cos(ang) * 11, y + Math.sin(ang) * 11]]);
  }
  g.fillStyle(0x553300, a);
  g.fillCircle(x, y, 6);
  g.lineStyle(1.2, 0x886600, a);
  ring(g, x, y, 6, 0, 0, 14);
  const blink = 0.25 + 0.6 * Math.max(0, Math.sin(t * 0.004));
  g.fillStyle(0xcc2222, blink * a * 1.4);
  g.fillCircle(x, y, 2.2);
}

// ── Golf ──────────────────────────────────────────────────────────────────

/** Dimples, a spin mark and a speed streak — the faster it flies, the more it shows. */
function drawGolfSkin(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, r: number, speed: number, dark: boolean, t: number,
): void {
  const spin = t * 0.004 + speed * 0.0015;
  const dimple = dark ? 0x2a2a2a : 0xdddddd;
  g.fillStyle(dimple, 0.5);
  for (let ringI = 1; ringI <= 2; ringI++) {
    const rr = r * (0.34 * ringI);
    const n = 6 * ringI;
    for (let i = 0; i < n; i++) {
      const a = spin * (ringI % 2 ? 1 : -1) + (i / n) * TAU;
      g.fillCircle(x + Math.cos(a) * rr, y + Math.sin(a) * rr, r * 0.08);
    }
  }
  g.lineStyle(1.5, dark ? 0x555555 : 0xaaaaaa, 0.8);
  ring(g, x, y, r * 0.92, 0, 0, 20);
  g.fillStyle(0xffffff, dark ? 0.25 : 0.5);
  g.fillCircle(x - r * 0.32, y - r * 0.32, r * 0.2);
  // Speed streak behind it, so a live ball reads differently from a parked one.
  if (speed > 60) {
    const k = Math.min(1, speed / 700);
    g.lineStyle(r * 0.5, dark ? 0x666666 : 0xffffff, 0.18 * k);
    line(g, [[x, y], [x - r * 3 * k, y]]);
  }
}

// ── entry point ───────────────────────────────────────────────────────────

/**
 * Repaint every original mutation that has something on the floor this frame.
 *
 * Two layers, because these objects do not all sit on the same side of the
 * fighters: `below` (under the bodies) carries the dinosaur the enemy is riding,
 * the tree, the buildings and the mines, and `above` carries the one thing that
 * has to be painted over a sprite — the golf ball's dimples and speed streak.
 */
export function paintLegacyMutations(
  below: Phaser.GameObjects.Graphics, above: Phaser.GameObjects.Graphics,
  s: LegacyMutationState, time: number,
): void {
  if (s.has('titanic')) {
    for (const sh of s.titanicShields) drawAegis(below, sh.x, sh.y, 18, time);
  }
  if (s.has('amber') && s.amberDino) {
    drawDino(below, s.amberDino.x, s.amberDino.y, s.amberDino.facing, s.amberDino.hp01, time);
  }
  if (s.has('archfiend')) {
    for (const t of s.tridents) drawTrident(below, t.x, t.y, t.angle, t.stuck, time);
  }
  if (s.has('clot') && s.clotTree) {
    drawBloodTree(below, s.clotTree.x, s.clotTree.y, s.clotTree.hp01, time);
  }
  if (s.has('tinker')) {
    for (const b of s.tinker) drawBuilding(below, b.x, b.y, b.kind, b.hp01, time);
  }
  if (s.has('encroach')) {
    for (const m of s.mines) drawMine(below, m.x, m.y, m.armed, time);
  }
  if (s.has('golf') && s.golf) {
    drawGolfSkin(above, s.golf.x, s.golf.y, s.golf.r, s.golf.speed, s.golf.dark, time);
  }
}
