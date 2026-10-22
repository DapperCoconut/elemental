import Phaser from 'phaser';
import {
  Pt, RubberColorFn, boingRing, rubberBall, rubberFist, rubberStrand, rubberStrandLayered, strandWidthFor,
} from '../RubberVisuals';
import { HAKI_TINT, PIRATE, SKIN_TINT, primTint, strawHat } from './PirateAvatar';

/**
 * The Pirate skin's ability art: every Rubber painter redrawn as gum-gum attacks.
 *
 * Each static here has *exactly* the signature of its `RubberFx` twin, so `RubberKit` picks the
 * painter per owner (`painter(owner)`) and calls it with the same live gameplay values — the
 * footprint, reach and timing are the element's, only the drawing is the captain's:
 *
 * - Rubber Punch → Gum-Gum Pistol: a bare stretching arm ending in a knuckled fist, with speed
 *   lines; when the rubber runs hot it is a black Armament fist wreathed in fire (Red Hawk).
 * - Sling Shot → Gum-Gum Rocket: two arms flung to the walls, hands gripping, hauling him back.
 * - Bounce Form → Gum-Gum Balloon: he puffs out flat — vest, bare belly, and the hat on top.
 * - Rubber Banding → his straw hat is the anchor, tied to him by one stretched arm.
 * - Bazooka → a snaking arm of the same skin; the bounced-off anchor is the hat, spinning away.
 * - Rubberage → Gum-Gum Gatling: every ball is a fist, streaking along its heading.
 *
 * The passed `tint` is ignored: it is the Rubber → skin palette remap, and this art is already
 * drawn in the skin's own colours.
 */

/** Red-shirted wrist cuff tint for strands drawn in vest red. */
const VEST_TINT = primTint(PIRATE.vestShade, PIRATE.vestLit, PIRATE.vestShade);

/** Speed lines trailing a moving fist, along `-angle`. */
function speedLines(
  g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number, len: number, spread: number,
  color: number, alpha: number, t: number,
): void {
  const c = Math.cos(angle), s = Math.sin(angle);
  g.lineStyle(1.4, color, alpha);
  for (let i = 0; i < 3; i++) {
    const off = (i - 1) * spread;
    const jitter = Math.sin(t * 23 + i * 2.1) * 3;
    const back = len * (0.7 + 0.3 * ((i + 1) % 2));
    const sx = x - c * (spread * 1.4) - s * off, sy = y - s * (spread * 1.4) + c * off;
    g.lineBetween(sx, sy, sx - c * (back + jitter), sy - s * (back + jitter));
  }
}

/** A flaming wreath round a hot fist: tongues pointing back along the arm. */
function hawkFlames(g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number, r: number, t: number): void {
  const back = angle + Math.PI;
  for (let pass = 0; pass < 2; pass++) {
    g.fillStyle(pass === 0 ? PIRATE.ember : PIRATE.flame, pass === 0 ? 0.75 : 0.9);
    for (let i = 0; i < 5; i++) {
      const a = back + (i - 2) * 0.42;
      const flick = 0.6 + 0.4 * Math.sin(t * 17 + i * 1.9);
      const len = r * (pass === 0 ? 1.9 : 1.3) * flick;
      const wid = r * (pass === 0 ? 0.42 : 0.26);
      const bx = x + Math.cos(a) * r * 0.6, by = y + Math.sin(a) * r * 0.6;
      const nx = -Math.sin(a), ny = Math.cos(a);
      g.fillTriangle(bx + nx * wid, by + ny * wid, bx - nx * wid, by - ny * wid,
        bx + Math.cos(a) * len, by + Math.sin(a) * len);
    }
  }
  g.fillStyle(PIRATE.gold, 0.22 + 0.1 * Math.sin(t * 14));
  g.fillCircle(x, y, r * 1.5);
}

/** The bare-skin fist (or Armament black when hot). */
function gumFist(g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number, r: number, squash: number, hot: boolean, t: number): void {
  if (hot) hawkFlames(g, x, y, angle, r, t);
  rubberFist(g, hot ? HAKI_TINT : SKIN_TINT, x, y, angle, r, squash, hot ? PIRATE.haki : PIRATE.skin, 1);
  // Thumb tucked over the knuckles, so it is unmistakably a hand.
  const c = Math.cos(angle), s = Math.sin(angle);
  const tx = x + c * r * 0.2 + s * r * 0.55, ty = y + s * r * 0.2 - c * r * 0.55;
  g.fillStyle(hot ? PIRATE.hakiSheen : PIRATE.skinShade, 0.9);
  g.fillEllipse(tx, ty, r * 0.9, r * 0.5);
}

/** A bare arm: skin strand with the gloss of stretched rubber; thinner the further it reaches. */
function gumArm(
  g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number,
  w1: number, w2: number, bow: number, hot: boolean, alpha = 0.97,
): void {
  rubberStrandLayered(g, SKIN_TINT, x1, y1, x2, y2, w1, w2, bow, PIRATE.skin, alpha);
  if (hot) {
    // Armament creeping up from the fist: the last third of the arm goes black.
    const u = 0.66;
    const mx = x1 + (x2 - x1) * u, my = y1 + (y2 - y1) * u;
    g.fillStyle(PIRATE.haki, alpha * 0.92);
    rubberStrand(g, mx, my, x2, y2, (w1 + (w2 - w1) * u) * 0.98, w2 * 0.98, bow * 0.3);
  }
}

export class PirateFx {
  /** Gum-Gum Pistol. */
  static drawPunchArm(
    g: Phaser.GameObjects.Graphics, _tint: RubberColorFn,
    fromX: number, fromY: number, fistX: number, fistY: number,
    reachRatio: number, hot: boolean, t: number,
  ): void {
    const angle = Math.atan2(fistY - fromY, fistX - fromX);
    const w = strandWidthFor(7.5, reachRatio);
    const bow = 14 * (1 - reachRatio) * Math.sin(t * 9);
    gumArm(g, fromX, fromY, fistX, fistY, w * 1.4, w, bow, hot);
    // A spiral twist of stretch marks along the arm when it is way out.
    if (reachRatio > 0.35) {
      g.lineStyle(1, PIRATE.skinShade, 0.55 * reachRatio);
      for (let i = 1; i <= 4; i++) {
        const u = i / 5;
        const mx = fromX + (fistX - fromX) * u, my = fromY + (fistY - fromY) * u;
        const nx = -Math.sin(angle), ny = Math.cos(angle);
        const ww = w * (1.4 - 0.4 * u) * 0.8;
        g.lineBetween(mx + nx * ww - Math.cos(angle) * 2, my + ny * ww - Math.sin(angle) * 2,
          mx - nx * ww + Math.cos(angle) * 2, my - ny * ww + Math.sin(angle) * 2);
      }
      speedLines(g, fistX, fistY, angle, 18 + reachRatio * 14, 6, PIRATE.white, 0.55 * reachRatio, t);
    }
    gumFist(g, fistX, fistY, angle, 13, Phaser.Math.Clamp(reachRatio * 0.5, 0, 0.5), hot, t);
  }

  /** Gum-Gum Rocket: both arms flung out to the walls, hands clamped on, hauling him back. */
  static drawSlingV(
    g: Phaser.GameObjects.Graphics, _tint: RubberColorFn,
    px: number, py: number, ax: number, ay: number, bx: number, by: number,
    tension: number, t: number,
  ): void {
    const w = strandWidthFor(5, tension * 1.6);
    for (const [hx, hy] of [[ax, ay], [bx, by]] as const) {
      const toWall = Math.atan2(hy - py, hx - px);
      // Shoulder roots either side of the body, so the two arms visibly come off him.
      const side = Math.sign(Math.cos(toWall - Math.atan2((ay + by) / 2 - py, (ax + bx) / 2 - px) + Math.PI / 2)) || 1;
      const rx = px + Math.cos(toWall) * 8 - Math.sin(toWall) * side * 4;
      const ry = py + Math.sin(toWall) * 8 + Math.cos(toWall) * side * 4;
      gumArm(g, rx, ry, hx, hy, 5, w, 6 * (1 - tension) * Math.sin(t * 3), false, 0.95);
      // The hand gripping the wall: an open palm with fingers wrapped round the edge.
      g.fillStyle(PIRATE.skinDeep, 0.5);
      g.fillCircle(hx + 1.2, hy + 1.6, 8.5);
      gumFist(g, hx, hy, toWall, 8, 0.3 * tension, false, t);
      g.lineStyle(1.2, PIRATE.skinDeep, 0.8);
      for (let f = -1; f <= 1; f++) {
        const fa = toWall + f * 0.45;
        g.lineBetween(hx + Math.cos(fa) * 3, hy + Math.sin(fa) * 3, hx + Math.cos(fa) * 8, hy + Math.sin(fa) * 8);
      }
    }
    // Strain: stretched skin pales along the lines of pull.
    if (tension > 0.4) {
      g.lineStyle(1.4, PIRATE.skinLit, (tension - 0.4) * 1.3);
      g.lineBetween(ax, ay, px, py);
      g.lineBetween(bx, by, px, py);
      speedLines(g, px, py, Math.atan2(py - (ay + by) / 2, px - (ax + bx) / 2) + Math.PI, 14 * tension, 7,
        PIRATE.white, 0.5 * tension, t);
    }
  }

  /** Gum-Gum Balloon: the captain puffed flat into a wobbling slab — vest, belly, hat on top. */
  static drawBounceForm(
    g: Phaser.GameObjects.Graphics, _tint: RubberColorFn,
    x: number, y: number, angle: number, t: number,
  ): void {
    const c = Math.cos(angle), s = Math.sin(angle);
    const at = (lx: number, ly: number): Pt => ({ x: x + lx * c - ly * s, y: y + lx * s + ly * c });
    const half = 48;
    const outline = (k: number, dx = 0, dy = 0): Phaser.Geom.Point[] => {
      const top: Pt[] = [], bot: Pt[] = [];
      for (let i = 0; i <= 20; i++) {
        const u = i / 20;
        const h = 9 * k * (0.7 + 0.5 * Math.sin(u * Math.PI)) * (1 + 0.16 * Math.sin(t * 12 - u * 5));
        top.push(at(-half + u * half * 2, -h));
        bot.push(at(-half + u * half * 2, h));
      }
      return top.concat(bot.reverse()).map((p) => new Phaser.Geom.Point(p.x + dx, p.y + dy));
    };
    g.fillStyle(PIRATE.skinDeep, 0.45);
    g.fillPoints(outline(1, 1.5, 2.5), true);
    // Vest red at both ends, the bare puffed belly in the middle.
    g.fillStyle(PIRATE.vest, 0.98);
    g.fillPoints(outline(1), true);
    const belly: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      const lx = -24 + u * 48;
      const h = 9 * (0.7 + 0.5 * Math.sin((0.25 + u * 0.5) * Math.PI)) * (1 + 0.16 * Math.sin(t * 12 - (0.25 + u * 0.5) * 5)) * 0.92;
      const p = at(lx, -h);
      belly.push(new Phaser.Geom.Point(p.x, p.y));
    }
    for (let i = 16; i >= 0; i--) {
      const u = i / 16;
      const lx = -24 + u * 48;
      const h = 9 * (0.7 + 0.5 * Math.sin((0.25 + u * 0.5) * Math.PI)) * (1 + 0.16 * Math.sin(t * 12 - (0.25 + u * 0.5) * 5)) * 0.92;
      const p = at(lx, h);
      belly.push(new Phaser.Geom.Point(p.x, p.y));
    }
    g.fillStyle(PIRATE.skin, 1);
    g.fillPoints(belly, true);
    // Belly button and the X scar, so the slab reads as a body.
    const bb = at(0, 2.5);
    g.fillStyle(PIRATE.skinShade, 1);
    g.fillEllipse(bb.x, bb.y, 3, 2);
    const sc = at(-8, -3);
    g.lineStyle(1.2, PIRATE.scar, 0.8);
    g.lineBetween(sc.x - 2.5, sc.y - 2.5, sc.x + 2.5, sc.y + 2.5);
    g.lineBetween(sc.x + 2.5, sc.y - 2.5, sc.x - 2.5, sc.y + 2.5);
    // Gloss along the top edge.
    g.fillStyle(PIRATE.skinLit, 0.5);
    g.fillEllipse(at(-4, -6).x, at(-4, -6).y, 20, 3);
    // Vest-shadow rim round the whole slab.
    g.lineStyle(2.4, PIRATE.vestShade, 1);
    g.strokePoints(outline(1), true);
    // The hat, perched on the slab's upper edge.
    const hp = at(0, -13);
    strawHat(g, hp.x, hp.y, 0.55, Math.sin(t * 5) * 0.1, 1, t * 2);
    // The reflect radius, unchanged — it is what tells the player where the slab catches.
    boingRing(g, VEST_TINT, x, y, 50, 0.03, t * 4, PIRATE.straw, 0.22 + 0.1 * Math.sin(t * 6), 2);
  }

  /** Rubber Banding: one arm stretched from the captain back to the hat he planted. */
  static drawBand(
    g: Phaser.GameObjects.Graphics, _tint: RubberColorFn,
    ax: number, ay: number, px: number, py: number, tension: number, t: number,
  ): void {
    const w = strandWidthFor(4.6, tension * 2.2);
    const sag = (1 - tension) * 34 + Math.sin(t * 2.6) * 3 * (1 - tension);
    gumArm(g, px, py, ax, ay, w * 1.2, w, -sag, false, 0.92);
    if (tension > 0.55) {
      const strain = (tension - 0.55) / 0.45;
      g.fillStyle(PIRATE.skinLit, strain * 0.55);
      rubberStrand(g, px, py, ax, ay, w * 0.4, w * 0.4, -sag + Math.sin(t * 30) * strain * 3);
    }
  }

  /** The anchor is the straw hat, held down by his hand on the brim. */
  static drawAnchor(
    g: Phaser.GameObjects.Graphics, _tint: RubberColorFn,
    x: number, y: number, radius: number, bouncy: boolean, hot: boolean, spin: number, t: number,
  ): void {
    const s = radius / 20;
    g.fillStyle(PIRATE.skinDeep, 0.4);
    g.fillEllipse(x, y + radius * 0.7, radius * 2.6, radius * 0.7);
    if (hot) {
      g.fillStyle(PIRATE.flame, 0.16 + 0.1 * Math.sin(t * 5));
      g.fillCircle(x, y, radius * (2.4 + 0.25 * Math.sin(t * 5)));
    }
    if (bouncy) {
      // Bounced, the hat spins on its brim like a top, sea-blue spray off the edge.
      g.lineStyle(2, PIRATE.sea, 0.5);
      g.strokeEllipse(x, y + 2, radius * 3, radius * 1.1);
      strawHat(g, x, y, s, Math.sin(spin * 1.3) * 0.25, 1, spin * 2, 0.75 + 0.25 * Math.cos(spin * 2));
    } else {
      strawHat(g, x, y, s, -0.12, 1, 0.6);
    }
    // His hand flat on the crown, where the arm ties on.
    rubberBall(g, SKIN_TINT, x + 2, y - 8 * s, 5.2 * s + 1.5, 0, 0.35, PIRATE.skin, 1, 0, PIRATE.skinShade);
  }

  /** Gum-Gum Bazooka: the arm snakes along everywhere the fist has been. */
  static drawBazookaArm(
    g: Phaser.GameObjects.Graphics, _tint: RubberColorFn,
    ownerX: number, ownerY: number, path: Pt[], fx: number, fy: number, hot: boolean, t: number,
  ): void {
    let px = ownerX, py = ownerY;
    const total = Math.max(1, path.length);
    const step = Math.max(1, Math.floor(total / 26));
    for (let i = 0; i < total; i += step) {
      const p = path[i];
      const u = i / total;
      const w = strandWidthFor(7, u * 1.4);
      rubberStrandLayered(g, SKIN_TINT, px, py, p.x, p.y, w, w, 0, PIRATE.skin, 0.88, false);
      px = p.x; py = p.y;
    }
    gumArm(g, px, py, fx, fy, 5, 5.5, 0, hot, 0.92);
    const ang = Math.atan2(fy - py, fx - px);
    speedLines(g, fx, fy, ang, 22, 7, PIRATE.white, 0.6, t);
    gumFist(g, fx, fy, ang, 15, 0.25, hot, t);
  }

  /** Gum-Gum Gatling: one fist of the barrage, stretched along its heading. */
  static drawRageBall(
    g: Phaser.GameObjects.Graphics, _tint: RubberColorFn,
    x: number, y: number, vx: number, vy: number, radius: number,
    hot: boolean, maxSpeed: number, t: number,
  ): void {
    const speed = Math.hypot(vx, vy);
    const a = Math.atan2(vy, vx);
    const k = Phaser.Math.Clamp(speed / maxSpeed, 0, 1);
    // After-image fists: the barrage is a blur of them.
    for (let i = 2; i >= 1; i--) {
      rubberFist(g, hot ? HAKI_TINT : SKIN_TINT, x - vx * 0.014 * i, y - vy * 0.014 * i, a,
        radius * (1 - 0.1 * i), 0.3, hot ? PIRATE.hakiSheen : PIRATE.skinShade, 0.22 * (3 - i));
    }
    speedLines(g, x, y, a, 8 + k * 14, radius * 0.55, PIRATE.white, 0.35 + 0.35 * k, t);
    gumFist(g, x, y, a, radius * 1.1, k * 0.45, hot, t);
  }

  /** The hat, knocked clean off the arena and spinning away, after-images behind it. */
  static drawFreeAnchor(
    g: Phaser.GameObjects.Graphics, _tint: RubberColorFn,
    x: number, y: number, vx: number, vy: number, radius: number,
  ): void {
    const s = radius / 20;
    const spin = (x + y) * 0.06;
    for (let i = 3; i >= 1; i--) {
      g.fillStyle(PIRATE.straw, 0.12 * (4 - i));
      g.fillEllipse(x - vx * 0.01 * i, y - vy * 0.01 * i, 58 * s, 13 * s);
    }
    strawHat(g, x, y, s, Math.sin(spin) * 0.4, 1, spin * 3, 0.6 + 0.4 * Math.abs(Math.cos(spin)));
  }
}
