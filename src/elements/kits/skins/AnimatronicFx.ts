import Phaser from 'phaser';
import { TAU } from '../ElementVisuals';

/**
 * The Animatronic skin's stand-in for Clay's golem: a slumped golden animatronic bear —
 * worn gold fur torn through to the endoskeleton, a black top hat and bow tie, and two empty
 * eye sockets with a pinpoint of light deep inside each. Same footprint as `drawGolem`
 * (scale 1 ≈ 35px radius, feet at +30, head at −30) so the summon reads the same size in play.
 *
 * Visual only: ClayKit calls this in place of `drawGolem` when the owner wears the skin.
 * Colours are the skin's own final palette (no remap).
 */

export const GOLDEN = {
  shadow: 0x15110a,
  dark: 0x4f3a10,
  deep: 0x7a5a18,
  body: 0xb08528,
  lit: 0xd2a843,
  hi: 0xf0d27a,
  belly: 0xdcbd66,
  /** Mastered: the fur gone dark and tarnished. */
  tarnish: 0x7d6322,
  tarnishLit: 0x9d7f33,
  black: 0x111013,
  hatLit: 0x3a3840,
  socket: 0x050406,
  pin: 0xf6f6f6,
  endo: 0x5b5c63,
  endoLit: 0x8b8c93,
  wire: 0x2a2a2e,
  wireRed: 0x8e2a22,
  spark: 0xfff3a0,
  tooth: 0xe8e0c8,
  /** The Fredbear plush's purple hat and bow (the mastered child carries one). */
  plum: 0x5d3f86,
  plumLit: 0x8a68b8,
} as const;

/** A rounded, slightly squared blob polygon — a stuffed, upholstered shape rather than a circle. */
export function plushBlob(
  g: Phaser.GameObjects.Graphics, x: number, y: number, rx: number, ry: number, bottomFlare = 0, squareness = 0.75,
): void {
  const pts: Phaser.Geom.Point[] = [];
  const n = 20;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const c = Math.cos(a), s = Math.sin(a);
    const px = Math.sign(c) * Math.pow(Math.abs(c), squareness);
    const py = Math.sign(s) * Math.pow(Math.abs(s), squareness);
    const flare = 1 + bottomFlare * Math.max(0, s);
    pts.push(new Phaser.Geom.Point(x + px * rx * flare, y + py * ry));
  }
  g.fillPoints(pts, true);
}

/** A torn patch in the fur: dark hole, a strut of endoskeleton across it, a frayed lip. */
function tear(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, s: number, alpha: number): void {
  g.fillStyle(GOLDEN.socket, alpha * 0.9);
  g.fillEllipse(x, y, w, h);
  g.lineStyle(1.6 * s, GOLDEN.endo, alpha);
  g.lineBetween(x - w * 0.4, y + h * 0.15, x + w * 0.4, y - h * 0.1);
  g.fillStyle(GOLDEN.endoLit, alpha);
  g.fillCircle(x, y + h * 0.02, 1.2 * s);
  g.lineStyle(1 * s, GOLDEN.deep, alpha * 0.9);
  g.strokeEllipse(x, y, w, h);
}

/** A loose wire hanging from (x, y), swinging, with a spark at its frayed end now and then. */
function wire(g: Phaser.GameObjects.Graphics, x: number, y: number, len: number, t: number, seed: number, s: number, color: number, alpha: number): void {
  const sw = Math.sin(t * 2.1 + seed) * 4 * s;
  const ex = x + sw, ey = y + len * s;
  g.lineStyle(1.4 * s, color, alpha);
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + sw * 0.4, y + len * s * 0.5);
  g.lineTo(ex, ey);
  g.strokePath();
  const ph = (t * 1.3 + seed * 0.37) % 1;
  if (ph < 0.12) {
    const k = 1 - ph / 0.12;
    g.fillStyle(GOLDEN.spark, alpha * k);
    g.fillCircle(ex, ey, 2.2 * s * k + 0.5);
    g.lineStyle(1, GOLDEN.spark, alpha * k);
    for (let i = 0; i < 3; i++) {
      const a = seed + i * 2.1 + t * 9;
      g.lineBetween(ex, ey, ex + Math.cos(a) * 5 * s, ey + Math.sin(a) * 5 * s);
    }
  }
}

/** A small black top hat, brim centred on (0, 0) in the current canvas frame. */
export function topHat(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, alpha: number, color: number = GOLDEN.black, lit: number = GOLDEN.hatLit): void {
  g.fillStyle(color, alpha);
  g.fillEllipse(x, y, 19 * s, 4.6 * s);
  g.fillPoints([
    new Phaser.Geom.Point(x - 6 * s, y),
    new Phaser.Geom.Point(x - 5.4 * s, y - 12 * s),
    new Phaser.Geom.Point(x + 5.4 * s, y - 12 * s),
    new Phaser.Geom.Point(x + 6 * s, y),
  ], true);
  g.fillEllipse(x, y - 12 * s, 10.8 * s, 2.6 * s);
  g.fillStyle(lit, alpha * 0.9);
  g.fillRect(x - 5.8 * s, y - 3.6 * s, 11.6 * s, 1.8 * s);
  g.fillStyle(lit, alpha * 0.5);
  g.fillRect(x - 4.4 * s, y - 11 * s, 1.4 * s, 7 * s);
}

/** The bow tie: two flared triangles and a knot. */
function bowTie(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, alpha: number): void {
  g.fillStyle(GOLDEN.black, alpha);
  g.fillTriangle(x, y, x - 9 * s, y - 4.5 * s, x - 9 * s, y + 4.5 * s);
  g.fillTriangle(x, y, x + 9 * s, y - 4.5 * s, x + 9 * s, y + 4.5 * s);
  g.fillStyle(GOLDEN.hatLit, alpha);
  g.fillCircle(x, y, 2.6 * s);
  g.fillStyle(GOLDEN.hatLit, alpha * 0.6);
  g.fillTriangle(x - 2 * s, y - 1 * s, x - 7.5 * s, y - 3.4 * s, x - 7.5 * s, y - 1.4 * s);
}

/**
 * The golden bear. `mood` mirrors the golem's: idle slumps (head lolled to one side, arms
 * dangling), rush pitches forward, slam throws both arms up. `mastered` (Clay's bedrock) is a
 * darker, more torn suit with wires hanging out of it and the pinpoints in the sockets burning.
 */
export function drawGoldenBear(
  g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, seed: number, scale: number,
  mastered: boolean, mood: 'idle' | 'rush' | 'slam' = 'idle', alpha = 1,
): void {
  const s = scale;
  const bob = Math.sin(t * 1.6 + seed) * 1.4 * s;
  const lean = mood === 'rush' ? 0.2 : mood === 'slam' ? -0.08 : 0;
  // The slump: the head hangs off to one side and drifts, the way a powered-down suit sags.
  const tilt = mood === 'slam' ? -0.08 : mood === 'rush' ? 0.12 : -0.34 + Math.sin(t * 0.7 + seed) * 0.06;
  const body = mastered ? GOLDEN.tarnish : GOLDEN.body;
  const lit = mastered ? GOLDEN.tarnishLit : GOLDEN.lit;
  const deep = mastered ? GOLDEN.dark : GOLDEN.deep;

  // Shadow.
  g.fillStyle(GOLDEN.shadow, alpha * 0.45);
  g.fillEllipse(x + 3 * s, y + 30 * s, 76 * s, 20 * s);

  // Legs and feet.
  for (const side of [-1, 1]) {
    const hx = x + side * 13 * s, hy = y + 14 * s + bob;
    const fx = x + side * 18 * s, fy = y + 26 * s;
    g.lineStyle(12 * s, deep, alpha);
    g.lineBetween(hx, hy, fx, fy - 3 * s);
    g.lineStyle(9 * s, body, alpha);
    g.lineBetween(hx, hy, fx, fy - 3 * s);
    // The gap at the ankle where the suit doesn't meet: endoskeleton showing.
    g.fillStyle(GOLDEN.socket, alpha * 0.85);
    g.fillEllipse(fx, fy - 3 * s, 9 * s, 3 * s);
    g.fillStyle(deep, alpha);
    plushBlob(g, fx + 1 * s, fy + 1.5 * s, 11.5 * s, 6.5 * s);
    g.fillStyle(body, alpha);
    plushBlob(g, fx, fy, 11 * s, 6 * s);
    g.fillStyle(lit, alpha * 0.55);
    g.fillEllipse(fx - 3 * s, fy - 2.4 * s, 10 * s, 3 * s);
  }

  // Torso: a pear of upholstered fur, wider at the hips.
  const tx = x + lean * 8 * s, ty = y + 1 * s + bob;
  g.fillStyle(deep, alpha);
  plushBlob(g, tx + 2 * s, ty + 3 * s, 25 * s, 23 * s, 0.14);
  g.fillStyle(body, alpha);
  plushBlob(g, tx, ty, 25 * s, 23 * s, 0.14);
  g.fillStyle(GOLDEN.belly, alpha * (mastered ? 0.55 : 0.8));
  plushBlob(g, tx + 1 * s, ty + 6 * s, 15 * s, 13 * s, 0.1, 0.9);
  g.fillStyle(lit, alpha * 0.45);
  g.fillEllipse(tx - 10 * s, ty - 11 * s, 16 * s, 8 * s);
  // Worn through in places.
  tear(g, tx + 13 * s, ty + 4 * s, 7 * s, 5 * s, s, alpha);
  if (mastered) {
    tear(g, tx - 12 * s, ty + 12 * s, 8 * s, 5.5 * s, s, alpha);
    tear(g, tx + 3 * s, ty - 9 * s, 6 * s, 4 * s, s, alpha);
  }
  // Stitch seam down the belly.
  g.lineStyle(1 * s, deep, alpha * 0.7);
  for (let i = 0; i < 4; i++) {
    const sy = ty - 2 * s + i * 5 * s;
    g.lineBetween(tx - 1.5 * s, sy, tx + 1.5 * s, sy + 1.5 * s);
  }

  // Arms: limp from the shoulders. Idle they dangle and sway; rush they trail; slam they rise.
  for (const side of [-1, 1]) {
    const sx = tx + side * 22 * s, sy = ty - 12 * s;
    let hx: number, hy: number;
    if (mood === 'slam') { hx = sx + side * 8 * s; hy = sy - 22 * s; }
    else if (mood === 'rush') { hx = sx + side * 4 * s - 8 * s; hy = sy + 26 * s; }
    else { hx = sx + side * 7 * s + Math.sin(t * 1.2 + seed + side) * 1.5 * s; hy = sy + 30 * s; }
    const ex = (sx + hx) / 2 + side * 3 * s, ey = (sy + hy) / 2;
    g.lineStyle(10 * s, deep, alpha);
    g.lineBetween(sx, sy, ex, ey);
    g.lineBetween(ex, ey, hx, hy);
    g.lineStyle(7 * s, body, alpha);
    g.lineBetween(sx, sy, ex, ey);
    g.lineBetween(ex, ey, hx, hy);
    // Elbow joint: the suit split there.
    g.fillStyle(GOLDEN.endo, alpha);
    g.fillCircle(ex, ey, 2.4 * s);
    g.fillStyle(GOLDEN.endoLit, alpha);
    g.fillCircle(ex - 0.6 * s, ey - 0.6 * s, 1 * s);
    // Mitt.
    g.fillStyle(deep, alpha);
    plushBlob(g, hx + 1 * s, hy + 1 * s, 7.5 * s, 7 * s);
    g.fillStyle(body, alpha);
    plushBlob(g, hx, hy, 7 * s, 6.5 * s);
    g.fillStyle(lit, alpha * 0.6);
    g.fillEllipse(hx - 2 * s, hy - 2 * s, 5 * s, 3 * s);
    // Shoulder cap over the arm root.
    g.fillStyle(body, alpha);
    plushBlob(g, sx, sy, 8 * s, 7 * s);
    g.fillStyle(lit, alpha * 0.5);
    g.fillEllipse(sx - 2 * s, sy - 3 * s, 7 * s, 3 * s);
  }

  // Mastered: loose wiring hanging out of the tears.
  if (mastered) {
    wire(g, tx - 12 * s, ty + 13 * s, 12, t, seed + 1, s, GOLDEN.wireRed, alpha);
    wire(g, tx + 13 * s, ty + 5 * s, 10, t, seed + 2, s, GOLDEN.wire, alpha);
    wire(g, tx + 4 * s, ty - 8 * s, 8, t, seed + 3, s, GOLDEN.wireRed, alpha);
  }

  // Neck and bow tie.
  const nx = tx + lean * 6 * s, ny = ty - 20 * s;
  bowTie(g, nx, ny, s, alpha);

  // Head — drawn in its own frame so the whole thing lolls together.
  const hx = x + lean * 14 * s + tilt * 7 * s;
  const hy = y - 31 * s + bob + Math.abs(tilt) * 4 * s;
  g.save();
  g.translateCanvas(hx, hy);
  g.rotateCanvas(tilt);
  // Ears.
  for (const side of [-1, 1]) {
    g.fillStyle(deep, alpha);
    g.fillCircle(side * 14 * s, -13 * s, 6.6 * s);
    g.fillStyle(body, alpha);
    g.fillCircle(side * 14 * s - 0.5 * s, -13.5 * s, 6 * s);
    g.fillStyle(GOLDEN.dark, alpha * 0.85);
    g.fillCircle(side * 14 * s, -12.5 * s, 3.2 * s);
  }
  // Skull.
  g.fillStyle(deep, alpha);
  plushBlob(g, 1.5 * s, 1.5 * s, 19 * s, 16 * s, 0.08);
  g.fillStyle(body, alpha);
  plushBlob(g, 0, 0, 19 * s, 16 * s, 0.08);
  g.fillStyle(lit, alpha * 0.5);
  g.fillEllipse(-7 * s, -9 * s, 16 * s, 6 * s);
  // Eye sockets: dark, empty, heavy-lidded.
  const flick = mastered ? 1 : ((t * 0.9 + seed * 0.13) % 1 < 0.86 ? 1 : 0);
  for (const side of [-1, 1]) {
    const ex = side * 7 * s, ey = -3.5 * s;
    g.fillStyle(GOLDEN.socket, alpha);
    g.fillEllipse(ex, ey, 9 * s, 9.5 * s);
    // Drooping lid over the top third.
    g.fillStyle(body, alpha);
    g.fillEllipse(ex, ey - 4 * s, 10.5 * s, 4.6 * s);
    g.lineStyle(1 * s, deep, alpha);
    g.beginPath();
    g.arc(ex, ey - 5.4 * s, 5.2 * s, Math.PI * 0.15, Math.PI * 0.85, false);
    g.strokePath();
    // The pinpoint deep inside.
    if (flick) {
      if (mastered) {
        g.fillStyle(GOLDEN.spark, alpha * (0.3 + 0.15 * Math.sin(t * 6 + side)));
        g.fillCircle(ex, ey + 0.8 * s, 3.4 * s);
      }
      g.fillStyle(GOLDEN.pin, alpha);
      g.fillCircle(ex + Math.cos(tilt) * 0.4 * s, ey + 0.8 * s, (mastered ? 1.3 : 0.9) * s);
    }
  }
  // Muzzle, nose, and the jaw hanging slack.
  g.fillStyle(GOLDEN.belly, alpha);
  g.fillEllipse(0, 6 * s, 20 * s, 11 * s);
  g.fillStyle(GOLDEN.socket, alpha * 0.9);
  g.fillRoundedRect(-7 * s, 8 * s, 14 * s, 4 * s, 2 * s);
  g.fillStyle(GOLDEN.tooth, alpha * 0.9);
  for (let i = -2; i <= 2; i++) g.fillRect(i * 2.6 * s - 0.9 * s, 8 * s, 1.8 * s, 1.6 * s);
  g.fillStyle(deep, alpha);
  g.fillEllipse(0, 13.5 * s, 16 * s, 4.6 * s);
  g.fillStyle(GOLDEN.belly, alpha);
  g.fillEllipse(0, 13 * s, 15 * s, 4 * s);
  g.fillStyle(GOLDEN.black, alpha);
  g.fillEllipse(0, 2.4 * s, 7.5 * s, 4.6 * s);
  g.fillStyle(GOLDEN.hatLit, alpha);
  g.fillEllipse(-1.4 * s, 1.4 * s, 2.6 * s, 1.4 * s);
  // Top hat, cocked on the crown.
  g.save();
  g.translateCanvas(3 * s, -15 * s);
  g.rotateCanvas(0.16);
  topHat(g, 0, 0, s, alpha);
  g.restore();
  g.restore();
}
