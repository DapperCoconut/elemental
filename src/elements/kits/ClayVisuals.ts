import Phaser from 'phaser';
import { ArmHold, ArmPose, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeOut } from './ElementVisuals';

/**
 * Everything Clay draws.
 *
 * The element's read is *wet potter's clay, worked by hand*: everything is a lump — rounded,
 * irregular, with a wet sheen on its top and the grooves of the fingers that shaped it. The one
 * primitive is `clayLump`; the golem is a stack of them, the shield is a rope of them, the
 * shards are lumps torn into points, and the creature Give Life wakes is whatever rope the
 * player dragged out. Nothing in the element is a clean circle: a circle reads as a marble,
 * and this is mud.
 *
 * Two palettes: raw clay (umber through a warm sheen) for everything, and bedrock (near-black
 * with pale fracture seams) for the mastered golem, so a mastered Clay is identifiable from
 * across the arena before it casts anything.
 */

export type ClayColorFn = ColorFn;

export const CLAY = {
  wet: 0x3d2316,
  deep: 0x57321f,
  slip: 0x704128,
  /** The element colour. */
  body: 0x9a5c32,
  warm: 0xb9743f,
  light: 0xc38352,
  sheen: 0xf3d7ae,
  cream: 0xfff1d6,
  eye: 0xf3d7ae,
  pupil: 0x24150e,
  /** The drawing guide — the one cool colour, so the circle can never be mistaken for clay. */
  guide: 0x4e9cff,
  guideLit: 0x9fd0ff,
  /** Bedrock, for the mastered golem. */
  bedrock: 0x1f1b1a,
  bedrockLit: 0x4a4341,
  seam: 0xb8aa98,
  /** Kiln fire glowing through the mastered bedrock's seams — the mastered form's signature. */
  kiln: 0xff9a3c,
  kilnHot: 0xffe2a8,
  /** The potter's board and tools the HUD readouts sit on. */
  wood: 0x6b4a2b,
  woodDark: 0x2a1a0e,
  woodLit: 0xa47c4f,
} as const;

/** Deterministic 0–1 noise, so a lump keeps its shape frame to frame instead of boiling. */
export function cnoise(seed: number, i: number): number {
  const v = Math.sin(seed * 83.1 + i * 149.7) * 27183.731;
  return v - Math.floor(v);
}

// ── The primitive ─────────────────────────────────────────────────────────

/**
 * A lump of clay: a rounded irregular blob with a wet highlight on its upper left and one or
 * two finger grooves across it. `rx`/`ry` are the half-sizes; `seed` fixes its outline.
 */
export function clayLump(
  g: Phaser.GameObjects.Graphics, tint: ClayColorFn,
  x: number, y: number, rx: number, ry: number, seed: number, color: number, alpha: number, rot = 0, grooves = 2,
): void {
  const pts: Phaser.Geom.Point[] = [];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU;
    const w = 0.84 + cnoise(seed, i) * 0.3;
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rx * w, y + Math.sin(a) * ry * w));
  }
  // Underside shadow, then the body, then the sheen.
  g.fillStyle(tint(CLAY.wet), alpha * 0.55);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x + rx * 0.08, p.y + ry * 0.14)), true);
  g.fillStyle(tint(color), alpha);
  g.fillPoints(pts, true);
  g.fillStyle(tint(CLAY.sheen), alpha * 0.28);
  g.fillEllipse(x - rx * 0.3, y - ry * 0.35, rx * 0.7, ry * 0.4);
  g.fillStyle(tint(CLAY.cream), alpha * 0.5);
  g.fillEllipse(x - rx * 0.42, y - ry * 0.48, rx * 0.22, ry * 0.14);
  // Finger grooves: short darker arcs, where the thumb pressed.
  g.lineStyle(Math.max(1, Math.min(rx, ry) * 0.12), tint(CLAY.slip), alpha * 0.8);
  for (let k = 0; k < grooves; k++) {
    const gy = y + ry * (0.05 + k * 0.32) + (cnoise(seed, 20 + k) - 0.5) * ry * 0.2;
    const gl = rx * (0.5 + cnoise(seed, 30 + k) * 0.5);
    g.beginPath();
    g.arc(x + (cnoise(seed, 40 + k) - 0.5) * rx * 0.3, gy - gl * 0.6, gl, Math.PI * 0.35, Math.PI * 0.65, false);
    g.strokePath();
  }
}

/** A clay shard: a torn, tapering chunk pointing along `angle`. */
export function clayShard(g: Phaser.GameObjects.Graphics, tint: ClayColorFn, x: number, y: number, angle: number, alpha = 1, scale = 1, bedrock = false): void {
  g.save();
  g.translateCanvas(x, y);
  g.rotateCanvas(angle);
  g.scaleCanvas(scale, scale);
  g.fillStyle(tint(CLAY.wet), alpha * 0.6);
  g.fillPoints([new Phaser.Geom.Point(-13, -6), new Phaser.Geom.Point(2, -8), new Phaser.Geom.Point(18, 1), new Phaser.Geom.Point(3, 8), new Phaser.Geom.Point(-14, 6)], true);
  g.fillStyle(tint(bedrock ? CLAY.bedrockLit : CLAY.light), alpha);
  g.fillPoints([new Phaser.Geom.Point(-12, -5), new Phaser.Geom.Point(2, -7), new Phaser.Geom.Point(16, 0), new Phaser.Geom.Point(3, 6), new Phaser.Geom.Point(-12, 4)], true);
  g.fillStyle(tint(bedrock ? CLAY.seam : CLAY.sheen), alpha * 0.7);
  g.fillPoints([new Phaser.Geom.Point(-9, -4), new Phaser.Geom.Point(1, -5), new Phaser.Geom.Point(11, -1)], true);
  g.fillStyle(tint(CLAY.wet), alpha * 0.5);
  g.fillCircle(-8, 1, 1.6);
  g.restore();
}

/**
 * The golem: a squat heavy figure of stacked lumps — splayed feet, a barrel torso with the
 * potter's thumbprints across it, shoulders, hanging fists, a lumpen head with two pale sunken
 * eyes. `scale` 1 is 35px radius; `mood` changes the stance.
 */
export function drawGolem(
  g: Phaser.GameObjects.Graphics, tint: ClayColorFn,
  x: number, y: number, t: number, seed: number, scale: number, bedrock: boolean, mood: 'idle' | 'rush' | 'slam' = 'idle', alpha = 1,
): void {
  const s = scale;
  const bob = Math.sin(t * 2.4 + seed) * 2 * s;
  const lean = mood === 'rush' ? 0.18 : mood === 'slam' ? -0.1 : 0;
  const body = bedrock ? CLAY.bedrock : CLAY.body;
  const lit = bedrock ? CLAY.bedrockLit : CLAY.light;
  // Shadow and the wet ring it stands in.
  g.fillStyle(tint(CLAY.wet), alpha * 0.45);
  g.fillEllipse(x + 3 * s, y + 30 * s, 76 * s, 22 * s);
  g.fillStyle(tint(CLAY.slip), alpha * 0.3);
  g.fillEllipse(x, y + 28 * s, 56 * s, 14 * s);
  // Feet.
  clayLump(g, tint, x - 18 * s, y + 24 * s, 14 * s, 8 * s, seed + 1, body, alpha, 0.2, 1);
  clayLump(g, tint, x + 19 * s, y + 25 * s, 14 * s, 8 * s, seed + 2, body, alpha, -0.3, 1);
  // Torso and shoulders.
  clayLump(g, tint, x + lean * 10 * s, y + 2 * s + bob, 30 * s, 26 * s, seed + 3, body, alpha, lean, 3);
  clayLump(g, tint, x - 24 * s + lean * 8 * s, y - 12 * s + bob, 13 * s, 10 * s, seed + 4, lit, alpha, 0.4, 1);
  clayLump(g, tint, x + 25 * s + lean * 8 * s, y - 11 * s + bob, 13 * s, 10 * s, seed + 5, lit, alpha, -0.4, 1);
  // Arms hanging to fists (raised on a slam).
  const armDrop = mood === 'slam' ? -16 * s : 0;
  for (const side of [-1, 1]) {
    const ax = x + side * 30 * s + lean * 6 * s;
    const ay = y + 6 * s + bob + armDrop;
    g.lineStyle(9 * s, tint(CLAY.deep), alpha);
    g.lineBetween(x + side * 24 * s, y - 8 * s + bob, ax, ay + 10 * s);
    g.lineStyle(6 * s, tint(body), alpha);
    g.lineBetween(x + side * 24 * s, y - 8 * s + bob, ax, ay + 10 * s);
    clayLump(g, tint, ax, ay + 14 * s, 9 * s, 8 * s, seed + 6 + side, lit, alpha, side * 0.5, 1);
  }
  // Head with sunken eyes and a mouth groove.
  const hx = x + lean * 14 * s, hy = y - 30 * s + bob;
  clayLump(g, tint, hx, hy, 19 * s, 16 * s, seed + 9, body, alpha, 0.1, 1);
  g.fillStyle(tint(CLAY.wet), alpha * 0.8);
  g.fillEllipse(hx - 7 * s, hy - 2 * s, 7 * s, 6 * s);
  g.fillEllipse(hx + 7 * s, hy - 2 * s, 7 * s, 6 * s);
  g.fillStyle(tint(bedrock ? CLAY.seam : CLAY.eye), alpha * 0.95);
  g.fillCircle(hx - 7 * s, hy - 2 * s, 2.6 * s);
  g.fillCircle(hx + 7 * s, hy - 2 * s, 2.6 * s);
  g.lineStyle(2 * s, tint(CLAY.wet), alpha * 0.7);
  g.beginPath();
  g.arc(hx, hy + 4 * s, 6 * s, Math.PI * 0.15, Math.PI * 0.85, false);
  g.strokePath();
  if (bedrock) {
    // Fracture seams: pale cracks across the stone.
    g.lineStyle(1.6 * s, tint(CLAY.seam), alpha * 0.8);
    g.lineBetween(x - 20 * s, y - 2 * s + bob, x - 6 * s, y + 10 * s + bob);
    g.lineBetween(x - 6 * s, y + 10 * s + bob, x + 4 * s, y + 4 * s + bob);
    g.lineBetween(x + 8 * s, y - 14 * s + bob, x + 18 * s, y + 2 * s + bob);
    g.lineBetween(hx + 3 * s, hy - 12 * s, hx + 9 * s, hy - 4 * s);
  } else {
    // A drip or two running off the shoulders.
    const sag = (t * 0.2 + seed) % 1;
    g.fillStyle(tint(CLAY.slip), alpha * 0.9);
    g.fillRoundedRect(x - 27 * s, y - 6 * s + bob, 3 * s, (6 + sag * 10) * s, 1.5 * s);
    g.fillCircle(x - 25.5 * s, y - 6 * s + bob + (6 + sag * 10) * s, 2.2 * s);
  }
}

/** The strand joining fighter and golem: a sagging clay rope with beads along it. */
export function drawTether(g: Phaser.GameObjects.Graphics, tint: ClayColorFn, x1: number, y1: number, x2: number, y2: number, t: number, alpha = 1): void {
  const segs = 14;
  const d = Phaser.Math.Distance.Between(x1, y1, x2, y2);
  const sag = Math.min(26, d * 0.12);
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    pts.push(new Phaser.Geom.Point(Phaser.Math.Linear(x1, x2, f), Phaser.Math.Linear(y1, y2, f) + Math.sin(f * Math.PI) * sag + Math.sin(t * 5 + i) * 1.2));
  }
  g.lineStyle(5, tint(CLAY.wet), alpha * 0.6);
  g.strokePoints(pts);
  g.lineStyle(3, tint(CLAY.slip), alpha * 0.95);
  g.strokePoints(pts);
  g.lineStyle(1, tint(CLAY.sheen), alpha * 0.35);
  g.strokePoints(pts.map((p) => new Phaser.Geom.Point(p.x, p.y - 1)));
  for (let i = 2; i < segs; i += 4) {
    g.fillStyle(tint(CLAY.light), alpha * 0.9);
    g.fillCircle(pts[i].x, pts[i].y, 2.6);
  }
}

/** A rope of clay through `pts`: dark under-stroke, body, highlight, beads at every node. */
export function drawClayRope(g: Phaser.GameObjects.Graphics, tint: ClayColorFn, pts: Array<{ x: number; y: number }>, width: number, alpha = 1, bedrock = false, breakAt = 26): void {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) > breakAt) continue;
    g.lineStyle(width * 1.5, tint(CLAY.wet), alpha * 0.6);
    g.lineBetween(a.x + 2, a.y + 3, b.x + 2, b.y + 3);
  }
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) > breakAt) continue;
    g.lineStyle(width, tint(bedrock ? CLAY.bedrockLit : CLAY.body), alpha);
    g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(width * 0.32, tint(bedrock ? CLAY.seam : CLAY.sheen), alpha * 0.55);
    g.lineBetween(a.x - 1, a.y - width * 0.25, b.x - 1, b.y - width * 0.25);
  }
  for (const p of pts) {
    g.fillStyle(tint(bedrock ? CLAY.bedrockLit : CLAY.light), alpha * 0.95);
    g.fillCircle(p.x, p.y, width * 0.46);
    g.fillStyle(tint(CLAY.cream), alpha * 0.45);
    g.fillCircle(p.x - width * 0.14, p.y - width * 0.16, width * 0.13);
  }
}

/** The drawing guide: a blue dashed ring the cursor may paint inside, and the clay budget bar over the caster. */
export function drawGuide(g: Phaser.GameObjects.Graphics, tint: ClayColorFn, x: number, y: number, r: number, t: number, alpha = 1): void {
  g.fillStyle(tint(CLAY.guide), alpha * 0.06);
  g.fillCircle(x, y, r);
  const dashes = 36;
  for (let i = 0; i < dashes; i++) {
    const a0 = (i / dashes) * TAU + t * 0.5;
    const a1 = a0 + TAU / dashes * 0.55;
    g.lineStyle(3, tint(i % 2 ? CLAY.guide : CLAY.guideLit), alpha * 0.8);
    g.beginPath();
    g.arc(x, y, r, a0, a1, false);
    g.strokePath();
  }
  g.lineStyle(1, tint(CLAY.guideLit), alpha * 0.35);
  g.strokeCircle(x, y, r * 0.5);
}

/**
 * A clay budget readout: a coil of clay rolled out along a potter's board. The coil shortens as
 * the budget is spent, its pinched end carries a thumbprint, and a little wheel at the left end
 * keeps turning. Same footprint as the old bar (88 x 10 around `x, y`).
 */
export function drawClayBar(
  g: Phaser.GameObjects.Graphics, tint: ClayColorFn, x: number, y: number, ratio: number, alpha = 1,
  t = (globalThis.performance?.now() ?? 0) / 1000,
): void {
  const r = Phaser.Math.Clamp(ratio, 0, 1);
  const L = x - 46, W = 92, H = 14, top = y - H / 2;
  // The board: dark under-shadow, plank, grain lines, lit top edge, pegs.
  g.fillStyle(tint(CLAY.woodDark), alpha * 0.75);
  g.fillRoundedRect(L - 1, top + 1.5, W + 2, H + 1, 4);
  g.fillStyle(tint(CLAY.wood), alpha * 0.96);
  g.fillRoundedRect(L, top, W, H, 4);
  g.lineStyle(1, tint(CLAY.woodDark), alpha * 0.45);
  g.lineBetween(L + 14, top + 3.5, L + W - 6, top + 3.2);
  g.lineBetween(L + 18, top + H - 3, L + W - 10, top + H - 3.4);
  g.lineStyle(1, tint(CLAY.woodLit), alpha * 0.55);
  g.lineBetween(L + 3, top + 0.8, L + W - 3, top + 0.8);
  g.fillStyle(tint(CLAY.woodDark), alpha * 0.8);
  g.fillCircle(L + W - 4, y, 1.3);
  // The trough the coil lies in.
  const tx = L + 14, tw = W - 20;
  g.fillStyle(tint(CLAY.wet), alpha * 0.85);
  g.fillRoundedRect(tx, y - 3.5, tw, 7, 3.5);
  // The little potter's wheel at the left end, always turning.
  const wx = L + 7;
  g.fillStyle(tint(CLAY.woodDark), alpha);
  g.fillCircle(wx, y, 5.6);
  g.fillStyle(tint(CLAY.slip), alpha);
  g.fillCircle(wx, y, 4.4);
  g.lineStyle(1, tint(CLAY.sheen), alpha * 0.7);
  for (let i = 0; i < 3; i++) {
    const a = t * 4 + (i / 3) * TAU;
    g.lineBetween(wx + Math.cos(a) * 1.4, y + Math.sin(a) * 1.4, wx + Math.cos(a) * 4, y + Math.sin(a) * 4);
  }
  g.fillStyle(tint(CLAY.light), alpha);
  g.fillCircle(wx, y, 1.5);
  // The coil itself: lumpy, with a travelling wet glint.
  const cw = tw * r;
  if (cw > 1) {
    g.fillStyle(tint(CLAY.deep), alpha);
    g.fillRoundedRect(tx, y - 3.2 + 1, cw, 6.4, 3.2);
    g.fillStyle(tint(CLAY.light), alpha);
    g.fillRoundedRect(tx, y - 3.2, cw, 6, 3);
    g.fillStyle(tint(CLAY.warm), alpha * 0.9);
    for (let px = tx + 4; px < tx + cw - 2; px += 7) g.fillCircle(px, y + 0.6 + Math.sin(px * 0.7) * 0.5, 2.6);
    g.fillStyle(tint(CLAY.sheen), alpha * 0.6);
    g.fillRect(tx + 2, y - 2.4, Math.max(0, cw - 4), 1.1);
    const gx = tx + ((t * 30) % Math.max(1, cw));
    g.fillStyle(tint(CLAY.cream), alpha * 0.75);
    g.fillEllipse(gx, y - 1.8, 5, 1.6);
    // Pinched end, thumbprint pressed into it.
    const ex = tx + cw;
    g.fillStyle(tint(CLAY.light), alpha);
    g.fillCircle(ex - 1, y, 3.6);
    g.lineStyle(0.8, tint(CLAY.slip), alpha * 0.9);
    g.strokeCircle(ex - 1, y, 2.2);
    g.strokeCircle(ex - 1, y, 1);
  }
}

/**
 * Stored Slipstream dashes: wet slip droplets resting in a little clay dish. Lit droplets are
 * the guide blue (the element's one cool colour), spent ones are dried-out dimples.
 */
export function drawSlipPips(
  g: Phaser.GameObjects.Graphics, tint: ClayColorFn, x: number, y: number, charges: number, max: number, t: number, alpha = 1,
): void {
  const gap = 18, w = (max - 1) * gap + 20;
  g.fillStyle(tint(CLAY.wet), alpha * 0.6);
  g.fillEllipse(x + 1, y + 6, w + 6, 10);
  g.fillStyle(tint(CLAY.deep), alpha * 0.95);
  g.fillEllipse(x, y + 4, w + 4, 9);
  g.fillStyle(tint(CLAY.slip), alpha);
  g.fillEllipse(x, y + 3, w, 6);
  g.lineStyle(1, tint(CLAY.sheen), alpha * 0.35);
  g.beginPath();
  g.arc(x, y + 6, w * 0.5, Math.PI * 1.15, Math.PI * 1.85, false);
  g.strokePath();
  for (let i = 0; i < max; i++) {
    const px = x - (max - 1) * gap / 2 + i * gap;
    if (i < charges) {
      const wob = Math.sin(t * 5 + i * 1.7) * 0.6;
      g.fillStyle(tint(CLAY.guide), alpha);
      g.fillCircle(px, y + 0.5, 4.6);
      g.fillTriangle(px - 4, y - 1.2, px + 4, y - 1.2, px + wob, y - 9.5);
      g.fillStyle(tint(CLAY.guideLit), alpha);
      g.fillCircle(px - 0.6, y, 3.2);
      g.fillStyle(tint(CLAY.cream), alpha * 0.85);
      g.fillCircle(px - 1.8, y - 1.6, 1.2);
    } else {
      g.fillStyle(tint(CLAY.wet), alpha * 0.85);
      g.fillEllipse(px, y + 3, 8, 3.6);
      g.lineStyle(0.8, tint(CLAY.light), alpha * 0.4);
      g.strokeEllipse(px, y + 3, 8, 3.6);
    }
  }
}

/** A slowing puddle of slip the fused creature leaves behind. */
export function drawClayPuddle(g: Phaser.GameObjects.Graphics, tint: ClayColorFn, x: number, y: number, r: number, t: number, life: number, seed: number): void {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * TAU;
    const rr = r * (0.8 + cnoise(seed, i) * 0.35 + Math.sin(t * 1.1 + i * 2 + seed) * 0.03);
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.62));
  }
  g.fillStyle(tint(CLAY.wet), life * 0.5);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x, p.y + 2)), true);
  g.fillStyle(tint(CLAY.slip), life * 0.85);
  g.fillPoints(pts, true);
  g.fillStyle(tint(CLAY.sheen), life * 0.2);
  g.fillEllipse(x - r * 0.25, y - r * 0.15, r * 0.7, r * 0.2);
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.6 + cnoise(seed, 20 + i)) % 1;
    g.lineStyle(1.2, tint(CLAY.light), life * (1 - ph) * 0.7);
    g.strokeEllipse(x + (cnoise(seed, 30 + i) - 0.5) * r, y + (cnoise(seed, 40 + i) - 0.5) * r * 0.5, 4 + ph * 14, 2.5 + ph * 8);
  }
}

/** The fighter on the wall: a long clay smear pressed flat against the edge, dribbling behind it. */
export function drawWallSmear(g: Phaser.GameObjects.Graphics, tint: ClayColorFn, x: number, y: number, along: number, t: number, alpha = 1): void {
  // `along` is the direction of travel along the wall. The smear stretches behind.
  g.save();
  g.translateCanvas(x, y);
  g.rotateCanvas(along);
  g.fillStyle(tint(CLAY.wet), alpha * 0.55);
  g.fillEllipse(-14, 3, 70, 20);
  g.fillStyle(tint(CLAY.body), alpha);
  g.fillEllipse(-10, 0, 66, 18);
  g.fillStyle(tint(CLAY.light), alpha);
  g.fillEllipse(6, -2, 30, 13);
  g.fillStyle(tint(CLAY.sheen), alpha * 0.45);
  g.fillEllipse(8, -5, 16, 4);
  // Dribbles trailing off the back.
  for (let i = 0; i < 4; i++) {
    const ph = (t * 1.5 + i * 0.25) % 1;
    g.fillStyle(tint(CLAY.slip), alpha * (1 - ph));
    g.fillCircle(-40 - ph * 30, (i - 1.5) * 5, 3.5 * (1 - ph * 0.5));
  }
  // The eyes, pressed into the front.
  g.fillStyle(tint(CLAY.eye), alpha);
  g.fillCircle(14, -3.5, 2.6);
  g.fillCircle(14, 3.5, 2.6);
  g.fillStyle(tint(CLAY.pupil), alpha);
  g.fillCircle(15, -3.5, 1.3);
  g.fillCircle(15, 3.5, 1.3);
  g.restore();
}

/** A living drawing: the rope the player dragged, stood on little legs, with two blue eyes at its head. */
export function drawCreature(
  g: Phaser.GameObjects.Graphics, tint: ClayColorFn, x: number, y: number, angle: number, nodes: Array<{ x: number; y: number }>, t: number, alpha: number, bedrock: boolean,
): void {
  g.save();
  g.translateCanvas(x, y);
  g.rotateCanvas(angle);
  // Legs: four stubs scuttling under the body.
  for (let i = 0; i < 4; i++) {
    const side = i % 2 ? 1 : -1;
    const lx = -14 + Math.floor(i / 2) * 20;
    const step = Math.sin(t * 14 + i * 1.6) * 4;
    g.lineStyle(4, tint(CLAY.deep), alpha);
    g.lineBetween(lx, side * 6, lx + step, side * 15);
  }
  g.fillStyle(tint(CLAY.wet), alpha * 0.4);
  g.fillEllipse(2, 12, 44, 12);
  drawClayRope(g, tint, nodes, 11, alpha, bedrock);
  g.fillStyle(tint(CLAY.guideLit), alpha);
  g.fillCircle(9, -5, 3.4);
  g.fillCircle(9, 5, 3.4);
  g.fillStyle(tint(CLAY.pupil), alpha);
  g.fillCircle(10.5, -5, 1.6);
  g.fillCircle(10.5, 5, 1.6);
  g.restore();
}

// ── Fx ─────────────────────────────────────────────────────────────────────

export class ClayFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: ClayColorFn = (c) => c) {
    super(scene, tint);
  }

  /** Clods of clay flung out and slapping back down. */
  clods(x: number, y: number, count: number, speed = 170, life = 520, depth = 14, bedrock = false): void {
    const bits = Array.from({ length: count }, () => ({ a: Math.random() * TAU, v: speed * (0.45 + Math.random() * 0.7), r: 2.5 + Math.random() * 3.5, fall: 30 + Math.random() * 50, seed: Math.random() * 10, spin: Math.random() * TAU }));
    this.anim(depth, life, (g, t) => {
      const e = easeOut(t);
      for (const b of bits) {
        const px = x + Math.cos(b.a) * b.v * e * (life / 1000), py = y + Math.sin(b.a) * b.v * e * (life / 1000) * 0.7 + b.fall * t * t;
        clayLump(g, this.tint, px, py, b.r * (1 - t * 0.3), b.r * 0.8 * (1 - t * 0.3), b.seed, bedrock ? CLAY.bedrockLit : CLAY.light, 1 - t, b.spin + t * 3, 0);
      }
    });
  }

  /** The slam: a flash, a jagged shock ring, a crater of pressed clay, clods, and a camera-sized thud. */
  slamShock(x: number, y: number, r: number, depth = 13, bedrock = false): void {
    this.flashIn(x, y, r * 0.28, CLAY.cream, CLAY.light, depth + 1);
    const segs = 28;
    const jitter = Array.from({ length: segs }, () => 0.86 + Math.random() * 0.28);
    this.anim(depth, 480, (g, t) => {
      const e = easeOut(t);
      const rr = r * (0.2 + e * 0.9);
      g.lineStyle(9 * (1 - t) + 1, this.tint(CLAY.light), 0.85 * (1 - t));
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const a = (i % segs) / segs * TAU;
        const px = x + Math.cos(a) * rr * jitter[i % segs], py = y + Math.sin(a) * rr * jitter[i % segs] * 0.8;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.strokePath();
      g.lineStyle(3 * (1 - t), this.tint(CLAY.sheen), 0.6 * (1 - t));
      g.strokeEllipse(x, y, rr * 1.4, rr * 1.1);
    });
    this.anim(1, 2600, (g, t) => {
      g.fillStyle(this.tint(CLAY.wet), (1 - t) * 0.45);
      g.fillEllipse(x, y + 4, r * 0.9, r * 0.5);
      g.lineStyle(2, this.tint(CLAY.slip), (1 - t) * 0.6);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.4;
        g.lineBetween(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.12, x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.3);
      }
    });
    this.clods(x, y, Math.round(r / 9), r * 1.8, 560, depth, bedrock);
  }

  /** A body coming apart into shards: a bloom of torn clay and a ring. */
  burst(x: number, y: number, r: number, depth = 14, bedrock = false): void {
    this.flashIn(x, y, r * 0.3, CLAY.cream, CLAY.light, depth + 1);
    this.anim(depth, 420, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(6 * (1 - t) + 1, this.tint(bedrock ? CLAY.seam : CLAY.light), 0.8 * (1 - t));
      g.strokeCircle(x, y, 8 + r * e);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + t * 0.6;
        clayLump(g, this.tint, x + Math.cos(a) * r * e * 0.78, y + Math.sin(a) * r * e * 0.78, 5 * (1 - t), 4 * (1 - t), i, bedrock ? CLAY.bedrockLit : CLAY.light, 1 - t, a, 0);
      }
    });
    this.clods(x, y, 8, r * 2, 520, depth, bedrock);
  }

  /** A shot eaten by clay: a wet splat and a few clods knocked loose. */
  splat(x: number, y: number, depth = 14): void {
    this.anim(depth, 260, (g, t) => {
      g.fillStyle(this.tint(CLAY.slip), 0.8 * (1 - t));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.5;
        g.fillCircle(x + Math.cos(a) * (4 + 14 * easeOut(t)), y + Math.sin(a) * (3 + 10 * easeOut(t)), 3 * (1 - t));
      }
      g.lineStyle(2 * (1 - t), this.tint(CLAY.sheen), 0.7 * (1 - t));
      g.strokeCircle(x, y, 4 + 14 * easeOut(t));
    });
    this.clods(x, y, 3, 90, 380, depth);
  }

  /** The merge: golem and fighter pulled into one body — rings converge, clay slaps on. */
  merge(x: number, y: number, depth = 14): void {
    this.anim(depth, 520, (g, t) => {
      const r = 92 * (1 - easeOut(t));
      g.lineStyle(5 * t + 1, this.tint(CLAY.light), 0.85 * (1 - t * 0.3));
      g.strokeCircle(x, y, r + 8);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU - t * 2;
        clayLump(g, this.tint, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, 7, 5.5, i, CLAY.body, 1 - t * 0.6, a, 0);
      }
    });
    this.flashIn(x, y, 30, CLAY.cream, CLAY.light, depth + 1);
    this.clods(x, y, 10, 120, 480, depth);
  }

  /** The guide opening: a blue pulse. */
  guidePulse(x: number, y: number, r: number, depth = 14): void {
    this.anim(depth, 360, (g, t) => {
      g.lineStyle(4 * (1 - t) + 1, this.tint(CLAY.guideLit), 0.9 * (1 - t));
      g.strokeCircle(x, y, r * (0.5 + easeOut(t) * 0.6));
    });
  }

  /** The clay landing on the wall. */
  wallSplat(x: number, y: number, angle: number, depth = 14): void {
    this.clods(x, y, 7, 140, 440, depth);
    this.anim(depth, 300, (g, t) => {
      g.fillStyle(this.tint(CLAY.slip), 0.7 * (1 - t));
      for (let i = -2; i <= 2; i++) {
        const a = angle + Math.PI / 2 + i * 0.35;
        g.fillCircle(x + Math.cos(a) * 18 * easeOut(t) * Math.abs(i + 0.5), y + Math.sin(a) * 18 * easeOut(t) * Math.abs(i + 0.5), 3.5 * (1 - t));
      }
    });
  }

  /** The creature waking: a blue spark at its eyes and a shiver of clods. */
  wake(x: number, y: number, depth = 14): void {
    this.flashIn(x, y, 16, CLAY.guideLit, CLAY.guide, depth + 1);
    this.clods(x, y, 6, 80, 400, depth);
  }
}

// ── The character ─────────────────────────────────────────────────────────

const CLAY_AVATAR: AvatarSpec = {
  hands: [
    { r: 10, color: CLAY.deep, alpha: 0.28 },
    { r: 7.6, color: CLAY.body, alpha: 1 },
    { r: 4.4, color: CLAY.light, alpha: 0.9, ox: -1.2, oy: -1.2 },
    { r: 1.7, color: CLAY.cream, alpha: 0.75, ox: -2.4, oy: -2.6 },
  ],
  eyeWhite: CLAY.eye,
  eyePupil: CLAY.pupil,
  squash: { div: 10, x: 0.55, y: 0.3 },
};

/**
 * The shaper: an orb of wet clay (the baked `elem-clay` texture) with ball hands. The body layer
 * presses the potter's marks into the orb — a thumbprint swirl, two finger-drag grooves, a fleck
 * of grit — and the crown carries a fresh **dollop of clay** with a drip running off it and a
 * wooden modelling tool stuck in it.
 *
 * Fused with the golem, the fighter itself grows (`claySizeMult` scales the sprite and, via
 * `setRigScale`, this whole rig): a crack across the orb for every layer lost, and the layer
 * stack over the head, both gameplay readouts.
 *
 * Mastered, the clay has been *fired*: the orb takes dark bedrock strata with kiln-orange light
 * pulsing through its seams, the dollop hardens into a crown of three stone spires glowing at the
 * joins, three bedrock chips orbit the body, the hands become embers in stone and the eyes burn
 * kiln-white. Side by side, wet brown vs. fired black-and-orange is impossible to confuse.
 */
export class ClayAvatar extends BaseAvatar {
  private fx: ClayFx;
  private fusedOn = false;
  private layers = 8;
  private maxLayers = 8;

  constructor(scene: Phaser.Scene, tint: ClayColorFn, depth = 6) {
    super(scene, tint, depth, CLAY_AVATAR);
    this.fx = new ClayFx(scene, tint);
  }

  /** Drop whatever sustained pose is held — a drawing or a wall run ending must not strand it. */
  releaseHold(): void { this.setHold(null); }

  /** Fuse: mark the cracks and layer pips, with `layers` of `max` still intact. */
  setFused(on: boolean, layers = 8, max = 8): void {
    this.fusedOn = on;
    this.layers = layers;
    this.maxLayers = max;
  }

  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? CLAY.kilnHot : CLAY.eye);
    this.forEachHandLayer(1, (shell) => shell.setFillStyle(this.tint(on ? CLAY.bedrockLit : CLAY.body), 1));
    this.forEachHandLayer(2, (core) => core.setFillStyle(this.tint(on ? CLAY.kiln : CLAY.light), on ? 0.95 : 0.9));
    this.forEachHandLayer(3, (glint) => glint.setFillStyle(this.tint(on ? CLAY.kilnHot : CLAY.cream), on ? 0.95 : 0.75));
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 14 : 10);
      halo.setFillStyle(this.tint(on ? CLAY.kiln : CLAY.deep), on ? 0.3 : 0.28);
    });
  }

  /** `ride` — on the wall: arms thrown wide for balance. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'ride') return null;
    return { ang: this.holdAngle + side * 1.5 + Math.sin(this.t * 7) * 0.08, dist: 34, scale: idle.scale * 1.05 };
  }

  protected emitTrail(x: number, y: number): void {
    this.fx.clods(x, y, 1, 40, 360, 5, this.mastered);
  }

  /** A wet slick under a wet body; mastered, a kiln-heat ring breathing on the floor. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const k = this.intensity * (this.mastered ? 1.15 : 1);
    g.fillStyle(this.tint(this.mastered ? CLAY.bedrock : CLAY.wet), a * (this.mastered ? 0.4 : 0.32) * k);
    g.fillEllipse(x + 2, y + 9, 50 * k, 22 * k);
    g.fillStyle(this.tint(this.mastered ? CLAY.kiln : CLAY.warm), a * (this.mastered ? 0.2 : 0.14) * k);
    g.fillCircle(x, y, 26 * k);
    if (this.mastered) {
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 3);
      g.lineStyle(2, this.tint(CLAY.kiln), a * (0.35 + pulse * 0.3));
      g.strokeEllipse(x, y + 12, 58 + pulse * 6, 22 + pulse * 2);
      g.lineStyle(1, this.tint(CLAY.kilnHot), a * 0.3);
      g.strokeEllipse(x, y + 12, 46, 16);
    }
  }

  /**
   * The potter's marks pressed into the orb (or, mastered, fired strata and glowing seams), then —
   * fused only — one crack per layer the golem-body has lost, the fused form's health readout.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const m = this.mastered;
    if (!m) {
      // Thumbprint swirl low on one side.
      g.lineStyle(1, this.tint(CLAY.slip), alpha * 0.7);
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.arc(x + 9, y + 9, 2 + k * 1.8, Math.PI * (0.9 + k * 0.1), Math.PI * (2.3 - k * 0.1), false);
        g.strokePath();
      }
      // Two finger-drag grooves across the lower belly, each with its sheen lip.
      for (let k = 0; k < 2; k++) {
        const gy = y + 10 + k * 4;
        g.lineStyle(1.4, this.tint(CLAY.deep), alpha * 0.6);
        g.beginPath();
        g.arc(x - 3, gy - 14, 14 - k * 2, Math.PI * 0.62, Math.PI * 0.86, false);
        g.strokePath();
        g.lineStyle(0.8, this.tint(CLAY.sheen), alpha * 0.35);
        g.beginPath();
        g.arc(x - 3, gy - 15, 14 - k * 2, Math.PI * 0.62, Math.PI * 0.86, false);
        g.strokePath();
      }
      // Grit flecks and a wet sheen band.
      g.fillStyle(this.tint(CLAY.wet), alpha * 0.7);
      g.fillCircle(x - 12, y + 4, 1.1);
      g.fillCircle(x + 3, y + 15, 0.9);
      g.fillStyle(this.tint(CLAY.sheen), alpha * 0.22);
      g.fillEllipse(x - 7, y - 12, 14, 4);
    } else {
      // Fired: dark strata bands across the lower orb...
      g.fillStyle(this.tint(CLAY.bedrock), alpha * 0.5);
      g.fillEllipse(x, y + 12, 34, 9);
      g.fillStyle(this.tint(CLAY.bedrockLit), alpha * 0.45);
      g.fillEllipse(x + 1, y + 6.5, 36, 3);
      // ...and kiln light pulsing through the seams.
      const glow = 0.55 + 0.45 * Math.sin(this.t * 3.4);
      const seams: number[][] = [
        [-15, -6, -8, 2, -10, 10], [6, 4, 13, 9, 11, 16], [-2, 14, 3, 10, 8, 12],
      ];
      for (const sm of seams) {
        g.lineStyle(3, this.tint(CLAY.kiln), alpha * 0.35 * glow);
        g.lineBetween(x + sm[0], y + sm[1], x + sm[2], y + sm[3]);
        g.lineBetween(x + sm[2], y + sm[3], x + sm[4], y + sm[5]);
        g.lineStyle(1.2, this.tint(CLAY.kilnHot), alpha * (0.6 + 0.4 * glow));
        g.lineBetween(x + sm[0], y + sm[1], x + sm[2], y + sm[3]);
        g.lineBetween(x + sm[2], y + sm[3], x + sm[4], y + sm[5]);
      }
    }
    if (!this.fusedOn) return;
    const lost = this.maxLayers - this.layers;
    g.lineStyle(1.8, this.tint(m ? CLAY.kiln : CLAY.wet), alpha * 0.9);
    for (let i = 0; i < lost; i++) {
      const ang = (i / this.maxLayers) * TAU + 0.6;
      const sx = x + Math.cos(ang) * 8, sy = y + 2 + Math.sin(ang) * 7;
      g.lineBetween(sx, sy, sx + Math.cos(ang) * 11, sy + Math.sin(ang) * 10);
      g.lineBetween(sx + Math.cos(ang) * 6, sy + Math.sin(ang) * 5, sx + Math.cos(ang + 0.9) * 10, sy + Math.sin(ang + 0.9) * 8);
    }
  }

  /** The crown (`y - 18`): wet dollop + tool, or the fired spire crown and orbiting chips; then the fused layer stack. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const bed = this.mastered;
    const rootY = y - 18;
    const lean = Math.cos(this.facing) * 1.5;
    if (!bed) {
      // The modelling tool, stuck in at an angle behind the dollop: a wooden shaft with a wire loop.
      const tx0 = x + lean - 4, ty0 = rootY - 4;
      const tx1 = tx0 - 9, ty1 = ty0 - 15;
      g.lineStyle(3, this.tint(CLAY.woodDark), alpha);
      g.lineBetween(tx0, ty0, tx1, ty1);
      g.lineStyle(1.8, this.tint(CLAY.woodLit), alpha);
      g.lineBetween(tx0, ty0, tx1, ty1);
      g.lineStyle(1, this.tint(CLAY.seam), alpha * 0.9);
      g.strokeEllipse(tx1 - 1.5, ty1 - 3, 4, 6);
      // The dollop: a squat lump sat on the crown, its base pressed flat into the body.
      clayLump(g, this.tint, x + lean, rootY - 3.5, 13, 7.5, 7, CLAY.warm, alpha, 0.15, 1);
      // Thumb dent on top.
      g.fillStyle(this.tint(CLAY.slip), alpha * 0.6);
      g.fillEllipse(x + lean + 2, rootY - 7, 6, 2.4);
      // One drip slowly sagging off the lip of the wet dollop.
      const sag = (this.t * 0.18) % 1;
      g.fillStyle(this.tint(CLAY.slip), alpha * 0.95);
      g.fillRoundedRect(x + lean + 5, rootY - 1, 3, 4 + sag * 7, 1.5);
      g.fillCircle(x + lean + 6.5, rootY + 3 + sag * 7, 2);
    } else {
      // Bedrock slab at the base, three jagged spires rising off it, kiln light in every join.
      clayLump(g, this.tint, x + lean, rootY - 3, 15, 6.5, 7, CLAY.bedrockLit, alpha, 0.15, 0);
      const glow = 0.55 + 0.45 * Math.sin(this.t * 3.4 + 1);
      const spires = [[-8, 13, 5], [0, 20, 6.5], [8, 14, 5]];
      for (const [dx, h, w] of spires) {
        const bx = x + lean + dx, by = rootY - 6;
        g.fillStyle(this.tint(CLAY.bedrock), alpha);
        g.fillTriangle(bx - w, by, bx + w, by, bx + dx * 0.15, by - h);
        g.fillStyle(this.tint(CLAY.bedrockLit), alpha * 0.9);
        g.fillTriangle(bx - w * 0.7, by, bx, by, bx + dx * 0.15, by - h);
        g.lineStyle(1.1, this.tint(CLAY.kilnHot), alpha * (0.5 + 0.5 * glow));
        g.lineBetween(bx + dx * 0.15, by - h * 0.85, bx + 1, by - h * 0.35);
      }
      g.fillStyle(this.tint(CLAY.kiln), alpha * 0.4 * glow);
      g.fillEllipse(x + lean, rootY - 6, 26, 4);
      g.fillStyle(this.tint(CLAY.kilnHot), alpha * (0.7 + 0.3 * glow));
      g.fillEllipse(x + lean, rootY - 6, 18, 1.8);
      // Three bedrock chips orbiting the body, embers trailing.
      for (let i = 0; i < 3; i++) {
        const ang = this.t * 1.6 + (i / 3) * TAU;
        const ox = x + Math.cos(ang) * 30, oy = y + 4 + Math.sin(ang) * 11;
        if (Math.sin(ang) < -0.2) continue; // behind the body
        g.fillStyle(this.tint(CLAY.kiln), alpha * 0.35);
        g.fillCircle(ox - Math.cos(ang + 0.5) * 3, oy - Math.sin(ang + 0.5) * 1.5, 2.2);
        g.fillStyle(this.tint(CLAY.bedrock), alpha);
        g.fillTriangle(ox - 3.5, oy + 2, ox + 3.5, oy + 1.5, ox, oy - 3.5);
        g.fillStyle(this.tint(CLAY.kilnHot), alpha * 0.9);
        g.fillCircle(ox, oy, 0.9);
      }
    }
    // Fused: the layer stack over the head — little thrown rings on a board.
    if (this.fusedOn) {
      const py = rootY - (bed ? 34 : 30);
      const w = this.maxLayers * 9 + 6;
      g.fillStyle(this.tint(CLAY.woodDark), alpha * 0.85);
      g.fillRoundedRect(x - w / 2, py + 3, w, 4, 2);
      g.fillStyle(this.tint(CLAY.wood), alpha);
      g.fillRoundedRect(x - w / 2, py + 2.5, w, 2.5, 1.5);
      for (let i = 0; i < this.maxLayers; i++) {
        const px = x - (this.maxLayers - 1) * 4.5 + i * 9;
        const live = i < this.layers;
        if (live) {
          g.fillStyle(this.tint(bed ? CLAY.bedrock : CLAY.deep), alpha);
          g.fillRoundedRect(px - 3.6, py - 7, 7.2, 10, 2.5);
          g.fillStyle(this.tint(bed ? CLAY.bedrockLit : CLAY.light), alpha);
          g.fillRoundedRect(px - 3, py - 7, 6, 9, 2.2);
          g.lineStyle(0.8, this.tint(bed ? CLAY.kiln : CLAY.slip), alpha * 0.9);
          g.lineBetween(px - 3, py - 4, px + 3, py - 4);
          g.lineBetween(px - 3, py - 1, px + 3, py - 1);
          g.fillStyle(this.tint(bed ? CLAY.kilnHot : CLAY.cream), alpha * 0.7);
          g.fillRect(px - 2, py - 6.4, 1.2, 4);
        } else {
          g.fillStyle(this.tint(CLAY.wet), alpha * 0.6);
          g.fillEllipse(px, py + 1, 6, 3);
        }
      }
    }
  }
}
