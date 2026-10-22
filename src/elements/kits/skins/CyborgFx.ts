import Phaser from 'phaser';
import { FxBase, TAU, easeOut } from '../ElementVisuals';
import { Projectile } from '../../../combat/Projectile';

/**
 * Bespoke ability art for the Cyborg crystal skin (a blood-fuelled combat machine):
 *
 * - **Diamond Shard → a revolver round.** The kite projectile keeps flying exactly as before —
 *   same body, same bounces — but its sprite is hidden and a brass bullet with a tracer is
 *   painted at its position instead (`CyborgBulletLayer`). Every shot leaves a muzzle flash.
 * - **Placed crystals → spinning gold coins.** A placed crystal is still a mirror segment along
 *   the same axis; it is drawn as a coin flipping in the air over a faint ricochet line that
 *   marks the mirror's true length, so the bounce surface stays readable (`drawCyborgCoin`).
 *   A shot striking one rings it with a ricochet flash, and a coin pushed out of the lattice
 *   pops rather than shattering.
 *
 * Visual only: nothing here touches a hitbox, a timer or a velocity.
 */

export const CY = {
  gunmetal: 0x0c0f14,
  steelDeep: 0x1f2a38,
  steelDark: 0x2c3c50,
  steel: 0x3d5a78,
  steelMid: 0x557694,
  steelLit: 0x7a93ad,
  steelPale: 0x9fb4c8,
  chrome: 0xe8eef4,
  optic: 0xffd34a,
  opticHot: 0xfff2b0,
  brassDim: 0x7a5418,
  brass: 0xc08a28,
  gold: 0xe8b030,
  goldLit: 0xffe58a,
  copper: 0xb5652e,
  bloodDark: 0x5a0a0e,
  bloodDried: 0x8a0f14,
  blood: 0xc4302b,
  bloodHot: 0xff5a40,
  white: 0xfffbe8,
} as const;

const pt = (x: number, y: number) => new Phaser.Geom.Point(x, y);

/** An ellipse rotated to `rot`, built point-by-point (Phaser's own ellipse is axis-aligned). */
export function rotEllipse(
  g: Phaser.GameObjects.Graphics, cx: number, cy: number, rx: number, ry: number, rot: number, steps = 20,
): void {
  const c = Math.cos(rot), s = Math.sin(rot);
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU;
    const lx = Math.cos(a) * rx, ly = Math.sin(a) * Math.max(0.6, ry);
    pts.push(pt(cx + lx * c - ly * s, cy + lx * s + ly * c));
  }
  g.fillPoints(pts, true);
}

/** A tapered streak from (x, y) back along -dir: full width at the head, a point at the tail. */
function streak(
  g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, len: number, w: number,
): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  const px = -s, py = c;
  const steps = 6;
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const hw = w * (1 - u) * (1 - u * 0.2);
    pts.push(pt(x - c * len * u + px * hw, y - s * len * u + py * hw));
  }
  for (let i = steps; i >= 0; i--) {
    const u = i / steps;
    const hw = w * (1 - u) * (1 - u * 0.2);
    pts.push(pt(x - c * len * u - px * hw, y - s * len * u - py * hw));
  }
  g.fillPoints(pts, true);
}

/**
 * A revolver round seen side-on: a brass case with a rim at the back and a copper ogive at the
 * nose. `len` runs along `ang`, nose forward.
 */
function bulletShape(
  g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, len: number, w: number, alpha: number,
): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  const px = -s, py = c;
  const at = (f: number, k: number) => pt(x + c * len * f + px * w * k, y + s * len * f + py * w * k);
  // Case: from the rim (-0.5) to the case mouth (0.12).
  g.fillStyle(CY.brassDim, alpha);
  g.fillPoints([at(-0.52, 1.12), at(0.14, 1.0), at(0.14, -1.0), at(-0.52, -1.12)], true);
  g.fillStyle(CY.gold, alpha);
  g.fillPoints([at(-0.46, 0.92), at(0.12, 0.86), at(0.12, -0.2), at(-0.46, -0.3)], true);
  g.fillStyle(CY.goldLit, alpha * 0.9);
  g.fillPoints([at(-0.4, 0.78), at(0.1, 0.72), at(0.1, 0.42), at(-0.4, 0.46)], true);
  // Ogive: copper nose, tapering to a rounded point.
  const nose: Phaser.Geom.Point[] = [];
  const steps = 7;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    nose.push(at(0.12 + u * 0.4, 0.94 * Math.cos(u * Math.PI / 2)));
  }
  for (let i = steps; i >= 0; i--) {
    const u = i / steps;
    nose.push(at(0.12 + u * 0.4, -0.94 * Math.cos(u * Math.PI / 2)));
  }
  g.fillStyle(CY.copper, alpha);
  g.fillPoints(nose, true);
  g.fillStyle(CY.goldLit, alpha * 0.6);
  g.fillCircle(x + c * len * 0.26 + px * w * 0.42, y + s * len * 0.26 + py * w * 0.42, w * 0.28);
}

/**
 * One fired round: a tracer smeared back along its flight, the bullet itself, and a hot glow at
 * the nose. `hot` (a shot pierced by a moving coin) runs the tracer blood red; `frozen` (held in
 * the air by Atune) drops the tracer and rings the round with a pulsing lock.
 */
export function drawCyborgBullet(
  g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, t: number,
  hot: boolean, frozen: boolean, alpha = 1,
): void {
  if (!frozen) {
    g.fillStyle(hot ? CY.bloodDried : CY.brass, 0.35 * alpha);
    streak(g, x, y, ang, hot ? 58 : 44, hot ? 7 : 5.5);
    g.fillStyle(hot ? CY.bloodHot : CY.optic, 0.7 * alpha);
    streak(g, x, y, ang, hot ? 44 : 34, hot ? 3.6 : 2.8);
    g.fillStyle(CY.white, 0.85 * alpha);
    streak(g, x, y, ang, 18, 1.3);
  } else {
    const pulse = 0.5 + 0.5 * Math.sin(t * 10);
    g.lineStyle(1.6, CY.optic, (0.45 + pulse * 0.4) * alpha);
    g.strokeCircle(x, y, 13 + pulse * 2);
    // Four lock ticks, turning slowly.
    for (let i = 0; i < 4; i++) {
      const a = t * 1.4 + (i / 4) * TAU;
      g.lineBetween(x + Math.cos(a) * 16, y + Math.sin(a) * 16, x + Math.cos(a) * 21, y + Math.sin(a) * 21);
    }
  }
  g.fillStyle(hot ? CY.blood : CY.optic, 0.28 * alpha);
  g.fillCircle(x, y, hot ? 13 : 10);
  bulletShape(g, x, y, ang, hot ? 22 : 19, hot ? 4.6 : 4, alpha);
}

/**
 * A placed crystal as an ULTRAKILL-style coin flipping in mid-air. The coin turns about the
 * mirror's long axis, so it is widest broadside and a bright edge line when it is side-on. A
 * faint ricochet line runs the mirror's whole length with end ticks, because that line — not
 * the coin — is where a shot actually bounces.
 */
export function drawCyborgCoin(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, angle: number, w: number, h: number, t: number,
  gateway: boolean, attuned: boolean, alpha = 1,
): void {
  void w;
  const along = angle + Math.PI / 2;
  const half = h / 2;
  const ca = Math.cos(along), sa = Math.sin(along);
  const rim = attuned ? CY.bloodDark : CY.brassDim;
  const face = attuned ? CY.blood : CY.gold;
  const lit = attuned ? CY.bloodHot : CY.goldLit;

  // Ricochet line along the mirror, dashed, with a tick at each end.
  g.lineStyle(1.4, lit, 0.32 * alpha);
  const dashes = 7;
  for (let i = 0; i < dashes; i++) {
    const u0 = -1 + (i / dashes) * 2, u1 = u0 + (1 / dashes) * 1.2;
    g.lineBetween(x + ca * half * u0, y + sa * half * u0, x + ca * half * u1, y + sa * half * u1);
  }
  g.lineStyle(2, lit, 0.55 * alpha);
  for (const e of [1, -1]) {
    const ex = x + ca * half * e, ey = y + sa * half * e;
    g.lineBetween(ex - sa * 4, ey + ca * 4, ex + sa * 4, ey - ca * 4);
  }

  const R = gateway ? 15 : 12;
  const bob = Math.sin(t * 3.1 + angle * 3) * 1.6;
  const cy = y - 3 + bob;
  const spin = Math.cos(t * 8.5 + angle * 5);
  const breadth = Math.abs(spin);

  // Shadow on the floor, steady while the coin flips above it.
  g.fillStyle(CY.gunmetal, 0.3 * alpha);
  rotEllipse(g, x, y + 6, R * 0.95, R * 0.35, 0, 14);
  // Halo.
  g.fillStyle(face, 0.16 * alpha);
  g.fillCircle(x, cy, R * 1.7);

  // Rim (thickness shows as the coin turns side-on), then face, then the inner milled ring.
  g.fillStyle(rim, alpha);
  rotEllipse(g, x, cy, R, R * breadth + 1.6, along);
  g.fillStyle(spin > 0 ? face : CY.brass, alpha);
  rotEllipse(g, x, cy, R * 0.9, R * 0.9 * breadth + 0.6, along);
  if (breadth > 0.3) {
    g.fillStyle(rim, alpha * 0.55);
    rotEllipse(g, x, cy, R * 0.66, R * 0.66 * breadth, along);
    g.fillStyle(spin > 0 ? lit : face, alpha * 0.9);
    rotEllipse(g, x, cy, R * 0.56, R * 0.56 * breadth, along);
  }
  // Gateway coins are punched through the middle — a slot shots pass straight down.
  if (gateway && breadth > 0.2) {
    g.fillStyle(CY.gunmetal, alpha * 0.85);
    rotEllipse(g, x, cy, R * 0.28, R * 0.28 * breadth, along, 12);
  }
  // Side-on: a hard bright edge. Broadside: a glint flashes across the face.
  if (breadth < 0.35) {
    g.lineStyle(1.6, CY.white, alpha * (1 - breadth / 0.35));
    g.lineBetween(x - ca * R, cy - sa * R, x + ca * R, cy + sa * R);
  } else if (breadth > 0.9) {
    g.fillStyle(CY.white, alpha * (breadth - 0.9) * 8);
    g.fillCircle(x - ca * R * 0.35 - sa * R * 0.3 * breadth, cy - sa * R * 0.35 + ca * R * 0.3 * breadth, 2.2);
  }

  // A sparkle winking off the coin now and then.
  const sp = (t * 0.9 + angle) % 1;
  if (sp < 0.22) {
    const k = Math.sin((sp / 0.22) * Math.PI);
    const sx = x + R * 0.9, sy = cy - R * 0.9;
    g.lineStyle(1.3, CY.white, alpha * k);
    g.lineBetween(sx - 4 * k, sy, sx + 4 * k, sy);
    g.lineBetween(sx, sy - 4 * k, sx, sy + 4 * k);
  }
}

/** The one-shot effects the Cyborg skin swaps in for crystal's. */
export class CyborgFx extends FxBase {
  constructor(scene: Phaser.Scene) {
    super(scene, (c) => c);
  }

  /** Revolver muzzle flash: a star of flame along the aim, a white core, a puff of smoke. */
  muzzleFlash(x: number, y: number, ang: number, depth = 6): void {
    const mx = x + Math.cos(ang) * 22, my = y + Math.sin(ang) * 22;
    this.anim(depth, 110, (g, t) => {
      const f = 1 - t;
      g.fillStyle(CY.optic, 0.5 * f);
      g.fillCircle(mx, my, 12 * (0.7 + t * 0.6));
      for (const [off, len, wd] of [[0, 22, 5], [0.7, 10, 3], [-0.7, 10, 3]] as const) {
        g.fillStyle(CY.goldLit, 0.9 * f);
        streak(g, mx + Math.cos(ang + off) * len, my + Math.sin(ang + off) * len, ang + off, len, wd * f + 0.5);
      }
      g.fillStyle(CY.white, f);
      g.fillCircle(mx, my, 4.5 * f + 1);
    });
    const drift = (Math.random() - 0.5) * 10;
    this.anim(depth - 0.1, 420, (g, t) => {
      g.fillStyle(CY.steelLit, 0.32 * (1 - t));
      g.fillCircle(mx + Math.cos(ang) * 10 * easeOut(t) + drift * t, my + Math.sin(ang) * 10 * easeOut(t) - 10 * t, 4 + 7 * t);
    });
  }

  /** A spent case kicked out sideways, spinning and dropping. */
  casing(x: number, y: number, ang: number, depth = 5): void {
    const side = ang + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1) + Math.PI * 0.15;
    const dist = 16 + Math.random() * 10;
    const spin0 = Math.random() * TAU;
    this.anim(depth, 520, (g, t) => {
      const e = easeOut(t);
      const cx = x + Math.cos(side) * dist * e;
      const cy = y + Math.sin(side) * dist * e - 10 * Math.sin(t * Math.PI) + 8 * t;
      const a = spin0 + t * 14;
      const c = Math.cos(a), s = Math.sin(a);
      g.fillStyle(CY.gold, 1 - t * 0.6);
      g.fillPoints([
        pt(cx - c * 3.2 + s * 1.4, cy - s * 3.2 - c * 1.4), pt(cx + c * 3.2 + s * 1.4, cy + s * 3.2 - c * 1.4),
        pt(cx + c * 3.2 - s * 1.4, cy + s * 3.2 + c * 1.4), pt(cx - c * 3.2 - s * 1.4, cy - s * 3.2 + c * 1.4),
      ], true);
    });
  }

  /** A shot striking a wall or a coin: sparks spraying off the impact and a hard white ping. */
  ricochet(x: number, y: number, depth = 8, blood = false): void {
    const sparks = Array.from({ length: 7 }, () => ({
      a: Math.random() * TAU, d: 14 + Math.random() * 18,
    }));
    this.anim(depth, 260, (g, t) => {
      const f = 1 - t;
      g.fillStyle(blood ? CY.blood : CY.optic, 0.45 * f);
      g.fillCircle(x, y, 8 + 10 * t);
      g.fillStyle(CY.white, f);
      g.fillCircle(x, y, 4 * f);
      g.lineStyle(1.6, blood ? CY.bloodHot : CY.goldLit, f);
      for (const s of sparks) {
        const r0 = s.d * easeOut(t), r1 = r0 + 6 * f;
        g.lineBetween(x + Math.cos(s.a) * r0, y + Math.sin(s.a) * r0, x + Math.cos(s.a) * r1, y + Math.sin(s.a) * r1);
      }
      g.lineStyle(1.4, CY.white, 0.8 * f);
      g.strokeCircle(x, y, 6 + 18 * easeOut(t));
    });
  }

  /** A coin flicked up off the thumb: it arcs up from the hand and spins to where it hangs. */
  coinToss(fromX: number, fromY: number, toX: number, toY: number, depth = 6): void {
    this.anim(depth, 260, (g, t) => {
      const e = easeOut(t);
      const cx = fromX + (toX - fromX) * e;
      const cy = fromY + (toY - fromY) * e - 26 * Math.sin(t * Math.PI);
      const b = Math.abs(Math.cos(t * 22));
      g.fillStyle(CY.gold, 0.25 * (1 - t));
      g.fillCircle(cx, cy, 14);
      g.fillStyle(CY.brassDim, 1);
      g.fillEllipse(cx, cy, 16, 16 * b + 2);
      g.fillStyle(CY.gold, 1);
      g.fillEllipse(cx, cy, 13, 13 * b + 1);
    });
    // The ding where it settles.
    this.scene.time.delayedCall(240, () => {
      this.anim(depth, 300, (g, t) => {
        g.lineStyle(2, CY.goldLit, 1 - t);
        g.strokeCircle(toX, toY - 3, 12 + 20 * easeOut(t));
      });
    });
  }

  /** A coin knocked out of play: a burst of gold flecks and a spinning half-coin dropping. */
  coinPop(x: number, y: number, depth = 6): void {
    const flecks = Array.from({ length: 8 }, () => ({ a: Math.random() * TAU, d: 12 + Math.random() * 22 }));
    this.anim(depth, 380, (g, t) => {
      const f = 1 - t;
      g.fillStyle(CY.goldLit, 0.5 * f);
      g.fillCircle(x, y, 10 + 12 * t);
      for (const fl of flecks) {
        g.fillStyle(CY.gold, f);
        g.fillCircle(x + Math.cos(fl.a) * fl.d * easeOut(t), y + Math.sin(fl.a) * fl.d * easeOut(t) + 14 * t * t, 2 * f + 0.6);
      }
      const b = Math.abs(Math.cos(t * 18));
      g.fillStyle(CY.brass, f);
      g.fillEllipse(x, y + 20 * t * t, 12, 12 * b + 1.5);
    });
  }
}

/**
 * The bullets: one Graphics painted every frame with a round for each crystal kite whose owner
 * wears the skin. The kite's own sprite is hidden while the skin paints it, and shown again if
 * it ever stops being a cyborg's (a skin is per-owner, so a mixed fight paints only one side).
 */
export class CyborgBulletLayer {
  private g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(4.2);
  }

  paint(projectiles: Phaser.GameObjects.GameObject[], isCyborg: (owner: 'player' | 'npc') => boolean, t: number): void {
    const g = this.g;
    g.clear();
    for (const child of projectiles) {
      const proj = child as Projectile;
      if (!proj.active || proj.texture?.key !== 'proj-crystal-kite') continue;
      if (!isCyborg(proj.isFromPlayer ? 'player' : 'npc')) {
        if (!proj.visible) proj.setVisible(true);
        continue;
      }
      proj.setVisible(false);
      const body = proj.body as Phaser.Physics.Arcade.Body | null;
      const vx = body?.velocity.x ?? 0, vy = body?.velocity.y ?? 0;
      const frozen = Math.hypot(vx, vy) < 5;
      // The kite texture points "up", so its rotation is the heading plus a quarter turn.
      const ang = frozen ? proj.rotation - Math.PI / 2 : Math.atan2(vy, vx);
      const hot = !!(proj as unknown as { kitePierce?: boolean }).kitePierce;
      drawCyborgBullet(g, proj.x, proj.y, ang, t, hot, frozen, proj.alpha);
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}
