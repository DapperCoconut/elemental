import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Emotion draws (the element keeps the id `conquest`; it replaced Conquest 2026-11-25).
 *
 * Two rules carried over from the board it replaced, because the problem is the same one — a
 * dozen small bodies on the floor that have to be read while somebody is shooting at you:
 *
 * **Silhouette carries the rank, colour carries the side.** A knight, an archer and the barbarian
 * are told apart by outline alone (a plumed helm and a sword, a hood and a bow, horns and an axe).
 * Whose they are is the plume, the hood and the war paint: warm for the player, cool for the npc.
 *
 * **The feeling is a colour of its own.** Depression is a cold blue, euphoria a hard yellow, rage a
 * red. Those three are painted raw, never through the skin mapper, so a soldier who is ecstatic
 * reads as ecstatic whatever the army is wearing.
 */

export type EmotionColorFn = ColorFn;
type G = Phaser.GameObjects.Graphics;
interface Pt { x: number; y: number }

export const EMO = {
  /** The element itself: the commander, his cape and his flag. */
  crimson: 0xc23a2e,
  banner: 0xe8503c,
  gold: 0xe8c23a,
  goldDeep: 0x8f6f14,
  timber: 0x7a5230,
  timberDark: 0x3d2817,
  iron: 0x8f9aa6,
  ironDark: 0x2e3640,
  flesh: 0xe8c9a0,
  steel: 0xd6dde6,
  blood: 0xa8242e,
  muzzle: 0xffe9a8,
  parchment: 0xf2e8d0,
  stone: 0xb8b2a4,
  stoneDark: 0x5d574c,
  /** The feelings. Painted raw. */
  tear: 0x7fc0ff,
  gloom: 0x4a72b8,
  gloomDeep: 0x1c2b52,
  joy: 0xffe24a,
  joyCore: 0xfff8c8,
  rage: 0xff3b2e,
  potion: 0xd43a58,
};

/** Warm is always the player's, cool always the npc's. */
export const PLAYER_SIDE_COLOR = 0xd83a3a;
export const NPC_SIDE_COLOR = 0x3a7fd8;
export function sideColor(owner: 'player' | 'npc'): number {
  return owner === 'player' ? PLAYER_SIDE_COLOR : NPC_SIDE_COLOR;
}

/** Deterministic 0–1 noise, so anything that has to jitter the same way every frame can. */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 41.3 + i * 289.7) * 24571.331;
  return v - Math.floor(v);
}

// ── Shared shading ────────────────────────────────────────────────────────
//
// Everything below is built the way the fighters are: a dark rim, a body, a lit band and one
// glint (`bakeOrb` in BootScene). Shading is mixed *after* the skin mapper has run, so a remapped
// palette still gets its own rims and highlights rather than the original element's.

function mix(a: number, b: number, k: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * k) << 16) | (Math.round(ag + (bg - ag) * k) << 8) | Math.round(ab + (bb - ab) * k);
}
const dark = (c: number, k: number): number => mix(c, 0x000000, k);
const light = (c: number, k: number): number => mix(c, 0xffffff, k);

/** The soft contact shadow every object on the board sits on. */
function groundShadow(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, alpha: number): void {
  g.fillStyle(0x000000, alpha * 0.18);
  g.fillEllipse(x, y, w * 1.15, h * 1.3);
  g.fillStyle(0x000000, alpha * 0.22);
  g.fillEllipse(x, y, w * 0.8, h * 0.85);
}

/** A miniature of the fighters' orb: rim → shell → body → lit core, a rim light and a glint. */
function orb(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, base: number, alpha: number): void {
  g.fillStyle(dark(base, 0.55), alpha);
  g.fillCircle(x, y, r);
  g.fillStyle(dark(base, 0.18), alpha);
  g.fillCircle(x, y, r * 0.86);
  g.fillStyle(base, alpha);
  g.fillCircle(x, y + r * 0.06, r * 0.7);
  g.fillStyle(light(base, 0.22), alpha);
  g.fillCircle(x, y + r * 0.16, r * 0.5);
  g.fillStyle(light(base, 0.45), alpha * 0.6);
  g.fillEllipse(x, y + r * 0.5, r * 0.9, r * 0.36);
  if (r >= 6) {
    g.lineStyle(Math.max(1, r * 0.1), light(base, 0.55), alpha * 0.6);
    g.beginPath();
    g.arc(x, y, r * 0.8, Math.PI * 1.15, Math.PI * 1.85);
    g.strokePath();
  }
  g.fillStyle(0xffffff, alpha * 0.8);
  g.fillEllipse(x - r * 0.32, y - r * 0.36, r * 0.4, r * 0.24);
}

/** A ball hand: rim and a lit centre, like the fighters' own. */
function ballHand(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, base: number, alpha: number): void {
  g.fillStyle(dark(base, 0.5), alpha);
  g.fillCircle(x, y, r);
  g.fillStyle(light(base, 0.12), alpha);
  g.fillCircle(x, y - r * 0.08, r * 0.72);
  g.fillStyle(0xffffff, alpha * 0.55);
  g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.26);
}

/** Two eyes looking along `ang`. `glow` swaps the pupils for lit sockets (wizards, a raging king). */
function troopEyes(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, ang: number,
  alpha: number, glow?: number,
): void {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const er = r * 0.24;
  const sep = r * 0.36;
  const lx = ca * r * 0.2, ly = sa * r * 0.12;
  for (const side of [-1, 1]) {
    const ex = x + side * sep + lx;
    const ey = y + ly;
    if (glow !== undefined) {
      g.fillStyle(glow, alpha * 0.35);
      g.fillCircle(ex, ey, er * 1.7);
      g.fillStyle(glow, alpha);
      g.fillCircle(ex, ey, er * 0.85);
      g.fillStyle(0xffffff, alpha * 0.85);
      g.fillCircle(ex, ey, er * 0.4);
      continue;
    }
    g.fillStyle(0xffffff, alpha);
    g.fillCircle(ex, ey, er);
    g.fillStyle(0x16121e, alpha);
    g.fillCircle(ex + ca * er * 0.35, ey + sa * er * 0.3, er * 0.62);
  }
}

// ── The flag ──────────────────────────────────────────────────────────────

/**
 * A rippling cloth: red, with two crossed golden swords.
 *
 * The hoist starts at (ox, oy) and runs along `v`; the cloth flies out along `u`. Both are unit
 * vectors, so the same painter hangs the pennant off a levelled pike and flies the grand standard
 * off an upright pole. The ripple travels down the fly, grows toward the free end and displaces
 * the cloth along `v`.
 */
export function drawFlag(
  g: G, tint: EmotionColorFn,
  ox: number, oy: number, ux: number, uy: number, vx: number, vy: number,
  w: number, h: number, t: number, seed: number, alpha: number, gilded = false,
): void {
  const N = 8;
  const wave = (k: number): number =>
    (Math.sin(t * 4.2 - k * 4.4 + seed) * 0.13 + Math.sin(t * 2.3 - k * 2.1 + seed * 1.7) * 0.06) * h * k;
  const P = (k: number, vv: number): Pt => {
    const d = vv * h + wave(k);
    return { x: ox + ux * k * w + vx * d, y: oy + uy * k * w + vy * d };
  };
  const outline: Pt[] = [];
  for (let i = 0; i <= N; i++) outline.push(P(i / N, 0));
  outline.push(P(0.8, 0.5));                      // the swallowtail's notch
  for (let i = N; i >= 0; i--) outline.push(P(i / N, 1));

  const red = tint(EMO.banner);
  const gold = tint(EMO.gold);
  g.fillStyle(dark(red, 0.55), alpha);
  g.fillPoints(outline.map((p) => ({ x: p.x + 0.9, y: p.y + 1.1 })), true);
  g.fillStyle(red, alpha);
  g.fillPoints(outline, true);
  // Folds: every other strip of the fly sits in its own shadow or catches the light.
  for (let i = 0; i < N; i++) {
    const k0 = i / N, k1 = (i + 1) / N;
    const slope = Math.cos(t * 4.2 - (k0 + k1) * 2.2 + seed);
    const far = k1 > 0.8 ? 0.72 : 1;
    g.fillStyle(slope > 0 ? light(red, 0.22) : dark(red, 0.26), alpha * Math.min(0.7, Math.abs(slope) * 0.75));
    g.fillPoints([P(k0, 0), P(k1, 0), P(k1, far), P(k0, k0 > 0.8 ? 0.72 : 1)], true);
  }
  // The emblem: two swords crossed, points up.
  const sword = (dir: number): void => {
    const k = h * 0.36;
    const tip = P(0.42 + dir * (k * 0.8) / w, 0.5 - 0.36);
    const hilt = P(0.42 - dir * (k * 0.8) / w, 0.5 + 0.36);
    const dx = tip.x - hilt.x, dy = tip.y - hilt.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    g.lineStyle(Math.max(1.2, h * 0.11), dark(gold, 0.45), alpha);
    g.lineBetween(hilt.x, hilt.y, tip.x, tip.y);
    g.lineStyle(Math.max(0.8, h * 0.065), gold, alpha);
    g.lineBetween(hilt.x, hilt.y, tip.x, tip.y);
    // Crossguard a quarter of the way up from the pommel.
    const gx = hilt.x + dx * 0.26, gy = hilt.y + dy * 0.26;
    g.lineStyle(Math.max(0.9, h * 0.07), gold, alpha);
    g.lineBetween(gx - nx * h * 0.13, gy - ny * h * 0.13, gx + nx * h * 0.13, gy + ny * h * 0.13);
    g.fillStyle(light(gold, 0.4), alpha);
    g.fillCircle(hilt.x, hilt.y, Math.max(0.7, h * 0.05));
  };
  sword(1);
  sword(-1);
  if (gilded) {
    g.lineStyle(1.3, gold, alpha * 0.95);
    g.strokePoints(outline, true, true);
    // A fringe of gold threads off the bottom edge.
    g.lineStyle(1, gold, alpha * 0.85);
    for (let i = 1; i < N; i++) {
      const p = P(i / N, 1);
      const q = P(i / N, 1.12);
      g.lineBetween(p.x, p.y, q.x, q.y + Math.sin(t * 5 + i) * 0.6);
    }
  }
}

/** A pike shaft from (ax, ay) to (bx, by), with a leaf blade past the far end. */
function pikeShaft(g: G, tint: EmotionColorFn, ax: number, ay: number, bx: number, by: number, alpha: number, gilded = false): void {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const ca = dx / len, sa = dy / len;
  const px = -sa, py = ca;
  g.lineStyle(4.4, dark(tint(EMO.timberDark), 0.35), alpha);
  g.lineBetween(ax, ay, bx, by);
  g.lineStyle(2.2, tint(gilded ? EMO.gold : EMO.timber), alpha);
  g.lineBetween(ax, ay, bx, by);
  const steel = tint(EMO.steel);
  g.fillStyle(dark(steel, 0.5), alpha);
  g.fillTriangle(bx + ca * 15, by + sa * 15, bx + px * 5.2 - ca * 3, by + py * 5.2 - sa * 3, bx - px * 5.2 - ca * 3, by - py * 5.2 - sa * 3);
  g.fillStyle(steel, alpha);
  g.fillTriangle(bx + ca * 13.5, by + sa * 13.5, bx + px * 4 - ca * 2, by + py * 4 - sa * 2, bx - px * 4 - ca * 2, by - py * 4 - sa * 2);
  g.fillStyle(0xffffff, alpha * 0.6);
  g.fillTriangle(bx + ca * 12, by + sa * 12, bx + px * 1.6, by + py * 1.6, bx - px * 0.4, by - py * 0.4);
  // A gold collar where the blade is socketed.
  g.fillStyle(tint(EMO.gold), alpha);
  g.fillCircle(bx - ca * 2, by - sa * 2, 2.6);
}

/** The cloth on a pike whose tip is at (bx, by): hung just behind the blade, trailing below the shaft. */
function pikeFlag(g: G, tint: EmotionColorFn, bx: number, by: number, ca: number, sa: number, w: number, h: number, t: number, seed: number, alpha: number): void {
  let ux = -sa, uy = ca;
  if (uy < 0 || (Math.abs(uy) < 0.2 && ux * ca > 0)) { ux = -ux; uy = -uy; }
  drawFlag(g, tint, bx - ca * 5, by - sa * 5, ux, uy, -ca, -sa, w, h, t, seed, alpha);
}

/** The pike, drawn as an actual thrust: out fast, back slow, the flag snapping behind the blade. */
export function pikeThrust(
  g: G, tint: EmotionColorFn, x: number, y: number, ang: number, reach: number, t: number, seed: number,
): void {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const ext = t < 0.3 ? easeOut(t / 0.3) : 1 - easeIn((t - 0.3) / 0.7);
  const len = Math.max(18, (reach - 14) * ext);
  const a = 1 - t * 0.5;
  const bx = x + ca * len, by = y + sa * len;
  // The line the point travelled, so the reach reads even after it has come back.
  g.lineStyle(7, 0xffffff, (1 - t) * 0.16);
  g.lineBetween(x + ca * 20, y + sa * 20, x + ca * (reach - 6), y + sa * (reach - 6));
  pikeFlag(g, tint, bx, by, ca, sa, 26, 15, t * 3 + seed, seed, a);
  pikeShaft(g, tint, x - ca * 6, y - sa * 6, bx, by, a);
}

/**
 * The grand standard: a tall gilded pole and a great red cloth. `foot` is where the pole stands
 * (or is held); `planted` drives it into the floor with a ring of cracked stone round it.
 */
export function drawGrandStandard(
  g: G, tint: EmotionColorFn, x: number, footY: number, height: number, t: number, seed: number,
  dir: number, alpha: number, planted: boolean,
): void {
  const top = footY - height;
  const gold = tint(EMO.gold);
  if (planted) {
    g.fillStyle(0x000000, alpha * 0.3);
    g.fillEllipse(x, footY + 1, 30, 9);
    g.lineStyle(1.4, 0x1a1410, alpha * 0.7);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + seed;
      const r = 9 + jitter(seed, i) * 9;
      g.lineBetween(x, footY, x + Math.cos(a) * r, footY + Math.sin(a) * r * 0.4);
    }
  }
  g.lineStyle(4.6, dark(gold, 0.55), alpha);
  g.lineBetween(x, footY, x, top);
  g.lineStyle(2.4, gold, alpha);
  g.lineBetween(x, footY, x, top);
  g.lineStyle(1, light(gold, 0.5), alpha * 0.8);
  g.lineBetween(x - 0.7, footY - 2, x - 0.7, top + 2);
  // Crossbar the cloth hangs from, and a spear-point finial with a glow.
  drawFlag(g, tint, x, top + 5, dir, 0, 0, 1, 44, 27, t, seed, alpha, true);
  const pulse = 0.6 + 0.4 * Math.sin(t * 4 + seed);
  g.fillStyle(EMO.joy, alpha * 0.22 * pulse);
  g.fillCircle(x, top - 4, 9);
  g.fillStyle(dark(gold, 0.5), alpha);
  g.fillTriangle(x, top - 13, x - 4.4, top - 1, x + 4.4, top - 1);
  g.fillStyle(gold, alpha);
  g.fillTriangle(x, top - 11.5, x - 3.2, top - 1.5, x + 3.2, top - 1.5);
  g.fillStyle(0xffffff, alpha * 0.7);
  g.fillTriangle(x, top - 10, x - 1, top - 3, x + 0.4, top - 3);
  g.fillStyle(gold, alpha);
  g.fillCircle(x, top + 1, 3);
}

// ── Troops ────────────────────────────────────────────────────────────────

export type TroopKind = 'knight' | 'archer' | 'barbarian';

/** Body scale per rank, against the fighters' own 20px orb. */
export const TROOP_SCALE: Record<TroopKind, number> = { knight: 2, archer: 1.8, barbarian: 3.3 };

export interface TroopPose {
  /** Facing, radians. */
  ang: number;
  /** A free-running phase, so a rank never steps in lockstep. */
  march: number;
  /** 0 at rest; 0–1 through a sword or axe swing, or through an archer's draw. */
  swing: number;
  /** 0–1 while rising out of the floor. */
  birth: number;
  alpha: number;
  t: number;
  ecstatic?: boolean;
  enraged?: boolean;
  depressed?: boolean;
  /** Under the grand standard. */
  rallied?: boolean;
  /** 0–1 through the barbarian's drink. */
  drinking?: number;
  /** Picked up by the cursor. */
  held?: boolean;
}

/** Tears: two streams off the eyes and a small pool under the feet. */
export function drawTears(g: G, x: number, y: number, r: number, t: number, alpha: number): void {
  g.fillStyle(EMO.tear, alpha * 0.28);
  g.fillEllipse(x, y + r * 1.02, r * 1.5, r * 0.34);
  for (const side of [-1, 1]) {
    const ex = x + side * r * 0.36;
    g.lineStyle(Math.max(1, r * 0.1), EMO.tear, alpha * 0.55);
    g.lineBetween(ex, y - r * 0.02, ex + side * r * 0.1, y + r * 0.5);
    for (let i = 0; i < 3; i++) {
      const k = (t * 1.5 + i / 3 + (side > 0 ? 0.17 : 0)) % 1;
      const dx = ex + side * r * (0.1 + k * 0.32);
      const dy = y + r * 0.1 + k * k * r * 1.1;
      const s = Math.max(1, r * 0.13) * (1 - k * 0.3);
      g.fillStyle(EMO.tear, alpha * (1 - k * 0.7));
      g.fillCircle(dx, dy, s);
      g.fillTriangle(dx - s * 0.8, dy - s * 0.2, dx + s * 0.8, dy - s * 0.2, dx, dy - s * 2.1);
      g.fillStyle(0xffffff, alpha * 0.7 * (1 - k));
      g.fillCircle(dx - s * 0.3, dy - s * 0.2, s * 0.35);
    }
  }
}

/**
 * One soldier, on the fighters' own body plan: an orb, two eyes that look where it is about to
 * strike, two ball hands, one of them holding the weapon. Rank is a hat and a weapon on top.
 */
export function drawTroop(g: G, tint: EmotionColorFn, kind: TroopKind, x: number, y: number, side: number, p: TroopPose): void {
  const grow = 0.45 + 0.55 * easeOut(Phaser.Math.Clamp(p.birth, 0, 1));
  const s = TROOP_SCALE[kind] * grow;
  const alpha = p.alpha * Math.min(1, p.birth * 1.6 + 0.15);
  const r = 4.7 * s;
  const bob = Math.abs(Math.sin(p.march)) * -1.3 * s;
  const cy = y + bob - s + (1 - grow) * 14 - (p.held ? 5 : 0);
  const ang = p.ang;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const trim = tint(side);
  const steel = tint(EMO.steel);
  const body = kind === 'knight' ? steel : kind === 'archer' ? trim : tint(EMO.flesh);

  groundShadow(g, x, y + 4.6 * s, 10 * s, 3.2 * s, alpha * (p.held ? 0.6 : 1));

  // ── What it is feeling, under everything else ──
  if (p.rallied) {
    g.lineStyle(1.3, tint(EMO.gold), alpha * (0.4 + 0.2 * Math.sin(p.t * 5 + p.march)));
    g.strokeEllipse(x, y + 4.6 * s, 13 * s, 4.4 * s);
  }
  if (p.enraged) {
    const pulse = 0.7 + 0.3 * Math.sin(p.t * 9);
    g.fillStyle(EMO.rage, alpha * 0.16 * pulse);
    g.fillCircle(x, cy, r * 1.75);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + p.t * 1.6;
      const reach = r * (1.45 + 0.3 * Math.sin(p.t * 11 + i * 2.3));
      g.fillStyle(i % 2 === 0 ? EMO.rage : 0xff8a2a, alpha * 0.5 * pulse);
      g.fillTriangle(
        x + Math.cos(a - 0.2) * r * 0.95, cy + Math.sin(a - 0.2) * r * 0.95,
        x + Math.cos(a + 0.2) * r * 0.95, cy + Math.sin(a + 0.2) * r * 0.95,
        x + Math.cos(a) * reach, cy + Math.sin(a) * reach,
      );
    }
  }
  if (p.ecstatic) {
    // A hard yellow outline, and sparks jumping off it.
    g.fillStyle(EMO.joy, alpha * 0.2);
    g.fillCircle(x, cy, r * 1.55);
    g.lineStyle(Math.max(1.6, r * 0.2), EMO.joy, alpha * 0.95);
    g.strokeCircle(x, cy, r * 1.16);
    for (let i = 0; i < 5; i++) {
      const k = (p.t * 1.9 + i / 5 + p.march * 0.05) % 1;
      const a = i * 2.4 + p.march;
      const sx = x + Math.cos(a) * r * 1.2, sy = cy + Math.sin(a) * r * 0.9 - k * r * 1.6;
      const sz = Math.max(1, r * 0.2) * (1 - k);
      g.fillStyle(k < 0.4 ? EMO.joyCore : EMO.joy, alpha * (1 - k));
      g.fillTriangle(sx, sy - sz * 1.6, sx - sz * 0.6, sy, sx + sz * 0.6, sy);
      g.fillTriangle(sx, sy + sz * 1.6, sx - sz * 0.6, sy, sx + sz * 0.6, sy);
      g.fillTriangle(sx - sz * 1.6, sy, sx, sy - sz * 0.6, sx, sy + sz * 0.6);
      g.fillTriangle(sx + sz * 1.6, sy, sx, sy - sz * 0.6, sx, sy + sz * 0.6);
    }
  }

  // The barbarian's fur cloak, behind the body.
  if (kind === 'barbarian') {
    const fur = tint(EMO.timberDark);
    const sway = Math.sin(p.march * 0.8) * 1.2 * s;
    const pts = [
      { x: x - r * 0.95, y: cy - r * 0.3 }, { x: x + r * 0.95, y: cy - r * 0.3 },
      { x: x + r * 1.2 + sway, y: cy + r * 1.05 }, { x: x + r * 0.45 + sway, y: cy + r * 1.3 },
      { x: x - r * 0.35 + sway, y: cy + r * 1.12 }, { x: x - r * 1.2 + sway, y: cy + r * 1.3 },
    ];
    g.fillStyle(dark(fur, 0.5), alpha);
    g.fillPoints(pts.map((q) => ({ x: q.x + (q.x < x ? -1 : 1), y: q.y + 1 })), true);
    g.fillStyle(fur, alpha);
    g.fillPoints(pts, true);
    g.fillStyle(light(fur, 0.25), alpha);
    for (let i = 0; i < 5; i++) {
      const fx = x - r * 0.9 + i * r * 0.45 + sway * 0.6;
      g.fillTriangle(fx - r * 0.16, cy + r * 0.9, fx + r * 0.16, cy + r * 0.9, fx, cy + r * 1.28);
    }
  }

  // ── Weapon ──
  // A swing carries the weapon hand through an arc across the facing; at rest it is carried high.
  const swinging = p.swing > 0 && kind !== 'archer';
  const wa = ang + (swinging ? -1.25 + 2.5 * easeOut(p.swing) : kind === 'archer' ? 0 : -0.55);
  const wca = Math.cos(wa), wsa = Math.sin(wa);
  const hx = x + wca * r * 1.05, hy = cy + wsa * r * 0.6 + r * 0.3;
  const ox = x - ca * r * 0.95, oy = cy + r * 0.5 + Math.sin(p.march + Math.PI) * 0.7 * s;
  const weaponBehind = wsa < -0.25;

  const weapon = (): void => {
    if (kind === 'knight') {
      const len = 9.5 * s;
      const tx = hx + wca * len, ty = hy + wsa * len - 1.2 * s;
      const da = Math.atan2(ty - hy, tx - hx);
      const dc = Math.cos(da), ds = Math.sin(da);
      const px = -ds, py = dc;
      if (swinging) {
        // The cut itself: a bright arc sweeping ahead of the blade.
        g.lineStyle(2.2 * s, 0xffffff, alpha * 0.5 * (1 - p.swing));
        g.beginPath();
        g.arc(x, cy, r * 1.05 + len * 0.8, wa - 0.9, wa + 0.15);
        g.strokePath();
      }
      g.fillStyle(dark(steel, 0.55), alpha);
      g.fillPoints([
        { x: hx + px * 1.5 * s, y: hy + py * 1.5 * s }, { x: tx + px * 1.1 * s, y: ty + py * 1.1 * s },
        { x: tx + dc * 2.4 * s, y: ty + ds * 2.4 * s },
        { x: tx - px * 1.1 * s, y: ty - py * 1.1 * s }, { x: hx - px * 1.5 * s, y: hy - py * 1.5 * s },
      ], true);
      g.fillStyle(light(steel, 0.2), alpha);
      g.fillPoints([
        { x: hx + px * 0.9 * s, y: hy + py * 0.9 * s }, { x: tx + px * 0.6 * s, y: ty + py * 0.6 * s },
        { x: tx + dc * 1.7 * s, y: ty + ds * 1.7 * s },
        { x: tx - px * 0.6 * s, y: ty - py * 0.6 * s }, { x: hx - px * 0.9 * s, y: hy - py * 0.9 * s },
      ], true);
      g.lineStyle(0.7 * s, 0xffffff, alpha * 0.7);
      g.lineBetween(hx + dc * 1.5 * s, hy + ds * 1.5 * s, tx, ty);
      // Crossguard and pommel in gold.
      const gold = tint(EMO.gold);
      g.lineStyle(1.5 * s, dark(gold, 0.4), alpha);
      g.lineBetween(hx + px * 2.6 * s + dc * s, hy + py * 2.6 * s + ds * s, hx - px * 2.6 * s + dc * s, hy - py * 2.6 * s + ds * s);
      g.lineStyle(0.9 * s, gold, alpha);
      g.lineBetween(hx + px * 2.4 * s + dc * s, hy + py * 2.4 * s + ds * s, hx - px * 2.4 * s + dc * s, hy - py * 2.4 * s + ds * s);
      g.fillStyle(gold, alpha);
      g.fillCircle(hx - dc * 1.6 * s, hy - ds * 1.6 * s, 0.9 * s);
    } else if (kind === 'archer') {
      // A longbow held out along the aim; `swing` is the draw.
      const draw = p.swing > 0 ? Math.min(1, p.swing * 1.25) : 0;
      const bx = hx + wca * 1.5 * s, by = hy + wsa * 1.5 * s;
      const px = -wsa, py = wca;
      const span = 6.6 * s;
      const top = { x: bx + px * span - wca * 2.6 * s, y: by + py * span - wsa * 2.6 * s };
      const bot = { x: bx - px * span - wca * 2.6 * s, y: by - py * span - wsa * 2.6 * s };
      const belly = { x: bx + wca * 1.6 * s, y: by + wsa * 1.6 * s };
      const wood = tint(EMO.timber);
      for (const [w, c] of [[2.2 * s, dark(wood, 0.5)], [1.1 * s, light(wood, 0.15)]] as [number, number][]) {
        g.lineStyle(w, c, alpha);
        g.beginPath();
        g.moveTo(top.x, top.y);
        g.lineTo(bx + px * span * 0.5 + wca * 0.9 * s, by + py * span * 0.5 + wsa * 0.9 * s);
        g.lineTo(belly.x, belly.y);
        g.lineTo(bx - px * span * 0.5 + wca * 0.9 * s, by - py * span * 0.5 + wsa * 0.9 * s);
        g.lineTo(bot.x, bot.y);
        g.strokePath();
      }
      const nock = { x: bx - wca * (2.6 + draw * 4.2) * s, y: by - wsa * (2.6 + draw * 4.2) * s };
      g.lineStyle(0.6 * s, tint(EMO.parchment), alpha * 0.9);
      g.lineBetween(top.x, top.y, nock.x, nock.y);
      g.lineBetween(bot.x, bot.y, nock.x, nock.y);
      if (draw > 0) drawArrow(g, tint, nock.x + wca * 5.5 * s, nock.y + wsa * 5.5 * s, wa, alpha, s * 0.55);
    } else {
      // A bearded axe: haft along the swing, a crescent head each side of it.
      const tx = hx + wca * 7 * s, ty = hy + wsa * 7 * s - 1.6 * s;
      if (swinging) {
        g.lineStyle(3 * s, 0xffffff, alpha * 0.45 * (1 - p.swing));
        g.beginPath();
        g.arc(x, cy, r * 1.05 + 7.5 * s, wa - 1, wa + 0.15);
        g.strokePath();
      }
      g.lineStyle(2.2 * s, dark(tint(EMO.timberDark), 0.3), alpha);
      g.lineBetween(hx - wca * 2.4 * s, hy - wsa * 2.4 * s + s, tx, ty);
      g.lineStyle(1.1 * s, tint(EMO.timber), alpha);
      g.lineBetween(hx - wca * 2.4 * s, hy - wsa * 2.4 * s + s, tx, ty);
      const da = Math.atan2(ty - hy, tx - hx);
      const dc = Math.cos(da), ds = Math.sin(da);
      const px = -ds, py = dc;
      const iron = tint(EMO.iron);
      for (const flip of [-1, 1]) {
        const head = (growBy: number, c: number): void => {
          g.fillStyle(c, alpha);
          g.fillPoints([
            { x: tx - dc * (1.4 * s + growBy), y: ty - ds * (1.4 * s + growBy) },
            { x: tx + px * flip * (3.8 * s + growBy) - dc * 2.6 * s, y: ty + py * flip * (3.8 * s + growBy) - ds * 2.6 * s },
            { x: tx + px * flip * (4.5 * s + growBy), y: ty + py * flip * (4.5 * s + growBy) },
            { x: tx + px * flip * (3.8 * s + growBy) + dc * 2.6 * s, y: ty + py * flip * (3.8 * s + growBy) + ds * 2.6 * s },
            { x: tx + dc * (1.4 * s + growBy), y: ty + ds * (1.4 * s + growBy) },
          ], true);
        };
        head(0.7, dark(iron, 0.55));
        head(0, iron);
        g.lineStyle(0.6 * s, light(iron, 0.6), alpha * 0.8);
        g.lineBetween(
          tx + px * flip * 4.3 * s - dc * 2.2 * s, ty + py * flip * 4.3 * s - ds * 2.2 * s,
          tx + px * flip * 4.3 * s + dc * 2.2 * s, ty + py * flip * 4.3 * s + ds * 2.2 * s,
        );
      }
    }
  };

  if (weaponBehind) weapon();
  ballHand(g, ox, oy, r * 0.36, kind === 'knight' ? tint(EMO.iron) : body, alpha);
  orb(g, x, cy, r, body, alpha);

  // ── What it wears on the orb ──
  if (kind === 'knight') {
    // Plate: a riveted gorget line, and a tabard in the side's colour down the front.
    g.fillStyle(dark(trim, 0.45), alpha);
    g.fillPoints([
      { x: x - r * 0.4, y: cy + r * 0.3 }, { x: x + r * 0.4, y: cy + r * 0.3 },
      { x: x + r * 0.34, y: cy + r * 0.98 }, { x, y: cy + r * 0.8 }, { x: x - r * 0.34, y: cy + r * 0.98 },
    ], true);
    g.fillStyle(trim, alpha);
    g.fillPoints([
      { x: x - r * 0.32, y: cy + r * 0.34 }, { x: x + r * 0.32, y: cy + r * 0.34 },
      { x: x + r * 0.27, y: cy + r * 0.88 }, { x, y: cy + r * 0.72 }, { x: x - r * 0.27, y: cy + r * 0.88 },
    ], true);
    g.lineStyle(Math.max(0.7, r * 0.07), dark(steel, 0.5), alpha * 0.8);
    g.beginPath();
    g.arc(x, cy - r * 0.05, r * 0.9, Math.PI * 0.12, Math.PI * 0.88);
    g.strokePath();
  } else if (kind === 'archer') {
    // A leather baldric and the quiver's fletchings over the shoulder.
    g.lineStyle(Math.max(1, r * 0.16), tint(EMO.timberDark), alpha);
    g.lineBetween(x - r * 0.7, cy - r * 0.35, x + r * 0.6, cy + r * 0.62);
    for (let i = 0; i < 3; i++) {
      const fx = x - r * 0.85 - i * r * 0.16, fy = cy - r * 0.75 - i * r * 0.1;
      g.fillStyle(tint(EMO.parchment), alpha);
      g.fillTriangle(fx, fy - r * 0.36, fx - r * 0.14, fy, fx + r * 0.14, fy);
    }
  } else {
    // War paint: two bars of the side's colour under the eyes, and a studded belt.
    g.fillStyle(trim, alpha * 0.95);
    for (const sd of [-1, 1]) g.fillRect(x + sd * r * 0.36 - r * 0.16, cy + r * 0.36, r * 0.32, r * 0.12);
    g.fillStyle(tint(EMO.timberDark), alpha);
    g.fillRect(x - r * 0.74, cy + r * 0.56, r * 1.48, r * 0.2);
    g.fillStyle(tint(EMO.gold), alpha);
    g.fillRect(x - r * 0.14, cy + r * 0.53, r * 0.28, r * 0.26);
  }

  troopEyes(g, x, cy + r * 0.12, r, ang, alpha, kind === 'knight' ? EMO.rage : p.enraged ? EMO.rage : p.ecstatic ? EMO.joy : undefined);

  // ── Hat ──
  if (kind === 'knight') {
    // A great helm's dome and nasal bar, with a plume in the side's colour.
    const hy0 = cy - r * 0.18;
    g.fillStyle(dark(steel, 0.55), alpha);
    g.beginPath();
    g.arc(x, hy0, r * 0.98, Math.PI, TAU, false);
    g.closePath();
    g.fillPath();
    g.fillRect(x - r * 0.15, hy0 - 0.4, r * 0.3, r * 0.62);
    g.fillStyle(steel, alpha);
    g.beginPath();
    g.arc(x, hy0 - 0.4, r * 0.86, Math.PI, TAU, false);
    g.closePath();
    g.fillPath();
    g.fillRect(x - r * 0.09, hy0 - 0.4, r * 0.18, r * 0.54);
    g.fillStyle(dark(steel, 0.3), alpha);
    g.fillRect(x - r * 0.86, hy0 - r * 0.16, r * 1.72, r * 0.13);
    g.fillStyle(0xffffff, alpha * 0.75);
    g.fillEllipse(x - r * 0.36, hy0 - r * 0.5, r * 0.34, r * 0.2);
    const lean = -ca * r * 0.5 + Math.sin(p.march * 1.3) * r * 0.1;
    const plume = [
      { x: x - r * 0.16, y: hy0 - r * 0.8 }, { x: x + r * 0.16, y: hy0 - r * 0.8 },
      { x: x + r * 0.42 + lean, y: hy0 - r * 1.5 }, { x: x + lean * 1.5, y: hy0 - r * 1.95 },
      { x: x - r * 0.3 + lean * 0.6, y: hy0 - r * 1.45 },
    ];
    g.fillStyle(dark(trim, 0.5), alpha);
    g.fillPoints(plume.map((q) => ({ x: q.x + 0.7, y: q.y + 0.8 })), true);
    g.fillStyle(trim, alpha);
    g.fillPoints(plume, true);
    g.fillStyle(light(trim, 0.35), alpha);
    g.fillTriangle(plume[0].x, plume[0].y, plume[4].x, plume[4].y, plume[3].x, plume[3].y);
  } else if (kind === 'archer') {
    // A pointed hood, its tip thrown back off the facing, with a feather pinned to it.
    const hood = light(trim, 0.08);
    const by = cy - r * 0.3;
    const lean = -ca * r * 0.55;
    const pts = [
      { x: x - r * 0.92, y: by + r * 0.1 }, { x: x + r * 0.92, y: by + r * 0.1 },
      { x: x + r * 0.5 + lean * 0.4, y: by - r * 0.85 }, { x: x + lean * 1.6, y: by - r * 1.5 },
      { x: x - r * 0.5 + lean * 0.4, y: by - r * 0.85 },
    ];
    g.fillStyle(dark(hood, 0.55), alpha);
    g.fillPoints(pts.map((q) => ({ x: q.x + (q.x < x ? -0.9 : 0.9), y: q.y - 0.5 })), true);
    g.fillStyle(dark(hood, 0.12), alpha);
    g.fillPoints(pts, true);
    g.fillStyle(light(hood, 0.3), alpha);
    g.fillTriangle(pts[0].x, pts[0].y, x - r * 0.1, by, pts[4].x, pts[4].y);
    g.lineStyle(Math.max(0.8, r * 0.1), tint(EMO.parchment), alpha);
    g.lineBetween(x + r * 0.5, by - r * 0.2, x + r * 0.95 + lean * 0.3, by - r * 1.25);
  } else {
    // An iron cap with a fur band and two curled horns.
    const horn = tint(EMO.parchment);
    const iron = tint(EMO.iron);
    const cy0 = cy - r * 0.5;
    for (const sd of [-1, 1]) {
      const base = { x: x + sd * r * 0.66, y: cy0 };
      const mid = { x: x + sd * r * 1.2, y: cy0 - r * 0.3 };
      const tip = { x: x + sd * r * 1.05, y: cy0 - r * 1.05 };
      g.fillStyle(dark(horn, 0.5), alpha);
      g.fillPoints([{ x: base.x - sd * 1.4, y: base.y + 1.4 }, { x: mid.x + sd * 1.6, y: mid.y + 1 }, { x: tip.x, y: tip.y - 1.6 }, { x: base.x, y: base.y - r * 0.36 }], true);
      g.fillStyle(horn, alpha);
      g.fillPoints([{ x: base.x, y: base.y + 0.6 }, { x: mid.x + sd * 0.5, y: mid.y + 0.4 }, { x: tip.x, y: tip.y }, { x: base.x + sd * 0.6, y: base.y - r * 0.28 }], true);
    }
    g.fillStyle(dark(iron, 0.55), alpha);
    g.beginPath();
    g.arc(x, cy0 + r * 0.08, r * 0.86, Math.PI, TAU, false);
    g.closePath();
    g.fillPath();
    g.fillStyle(iron, alpha);
    g.beginPath();
    g.arc(x, cy0 + r * 0.04, r * 0.74, Math.PI, TAU, false);
    g.closePath();
    g.fillPath();
    g.fillStyle(tint(EMO.timberDark), alpha);
    g.fillRect(x - r * 0.84, cy0 - r * 0.06, r * 1.68, r * 0.24);
    g.fillStyle(0xffffff, alpha * 0.6);
    g.fillEllipse(x - r * 0.3, cy0 - r * 0.4, r * 0.3, r * 0.16);
  }

  if (!weaponBehind) weapon();
  ballHand(g, hx, hy, r * 0.36, kind === 'knight' ? tint(EMO.iron) : body, alpha);

  // The rage potion, tipped up to the mouth.
  if (p.drinking && p.drinking > 0 && p.drinking < 1) {
    const k = Math.sin(p.drinking * Math.PI);
    const bx = x - ca * r * 0.2, by = cy - r * 0.1 - k * r * 0.5;
    g.fillStyle(0x1a0a10, alpha);
    g.fillRoundedRect(bx - r * 0.3, by - r * 0.72, r * 0.6, r * 0.9, r * 0.14);
    g.fillStyle(EMO.potion, alpha);
    g.fillRoundedRect(bx - r * 0.23, by - r * 0.72 + r * 0.76 * p.drinking, r * 0.46, r * 0.76 * (1 - p.drinking) + 0.1, r * 0.1);
    g.fillStyle(tint(EMO.timber), alpha);
    g.fillRect(bx - r * 0.12, by - r * 0.9, r * 0.24, r * 0.2);
    g.fillStyle(0xffffff, alpha * 0.6);
    g.fillRect(bx - r * 0.18, by - r * 0.6, r * 0.08, r * 0.5);
  }

  if (p.depressed) drawTears(g, x, cy + r * 0.12, r, p.t + p.march * 0.1, alpha);
}

/** An arrow in flight: shaft, steel head, two fletchings. */
export function drawArrow(g: G, tint: EmotionColorFn, x: number, y: number, ang: number, alpha: number, scale = 1): void {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const px = -sa, py = ca;
  const L = 15 * scale;
  const tx = x - ca * L, ty = y - sa * L;
  g.lineStyle(2.4 * scale, 0x1a120a, alpha * 0.8);
  g.lineBetween(tx, ty, x, y);
  g.lineStyle(1.2 * scale, tint(EMO.timber), alpha);
  g.lineBetween(tx, ty, x, y);
  g.fillStyle(tint(EMO.steel), alpha);
  g.fillTriangle(x + ca * 5 * scale, y + sa * 5 * scale, x + px * 2.4 * scale, y + py * 2.4 * scale, x - px * 2.4 * scale, y - py * 2.4 * scale);
  g.fillStyle(tint(EMO.parchment), alpha);
  for (const sd of [-1, 1]) {
    g.fillTriangle(tx, ty, tx + ca * 5 * scale, ty + sa * 5 * scale, tx + px * sd * 3 * scale - ca * 1.5 * scale, ty + py * sd * 3 * scale - sa * 1.5 * scale);
  }
}

/** A soldier's hit points: a pip bar, with anything over the maximum in yellow past its end. */
export function drawTroopHp(g: G, x: number, y: number, w: number, ratio: number, over: number, color: number, alpha: number): void {
  const l = x - w / 2;
  g.fillStyle(0x000000, alpha * 0.7);
  g.fillRoundedRect(l - 1, y - 1, w + 2, 5, 2);
  g.fillStyle(0x2a2f3a, alpha);
  g.fillRect(l, y, w, 3);
  g.fillStyle(color, alpha);
  g.fillRect(l, y, w * Phaser.Math.Clamp(ratio, 0, 1), 3);
  if (over > 0) {
    const ow = Math.min(w, w * over);
    g.fillStyle(0x000000, alpha * 0.7);
    g.fillRoundedRect(l + w, y - 1, ow + 2, 5, 2);
    g.fillStyle(EMO.joy, alpha);
    g.fillRect(l + w + 1, y, ow, 3);
  }
}

/** The order being given: a marching dashed line from the soldier to the cursor, and where it will land. */
export function drawOrderLine(g: G, x0: number, y0: number, x1: number, y1: number, t: number, attack: boolean): void {
  const color = attack ? EMO.rage : EMO.joy;
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len > 4) {
    const ux = dx / len, uy = dy / len;
    const step = 12;
    const drift = (t * 40) % step;
    g.lineStyle(2.4, color, 0.75);
    for (let d = drift; d < len; d += step) {
      const e = Math.min(len, d + 6);
      g.lineBetween(x0 + ux * d, y0 + uy * d, x0 + ux * e, y0 + uy * e);
    }
  }
  const pulse = 0.6 + 0.4 * Math.sin(t * 9);
  if (attack) {
    // Crossed swords over whoever it is being sent at.
    g.lineStyle(3, 0x000000, 0.5);
    g.strokeCircle(x1, y1, 17);
    g.lineStyle(2, color, 0.9);
    g.strokeCircle(x1, y1, 16 + pulse * 2);
    g.lineBetween(x1 - 7, y1 + 7, x1 + 7, y1 - 7);
    g.lineBetween(x1 + 7, y1 + 7, x1 - 7, y1 - 7);
  } else {
    g.lineStyle(2, color, 0.85);
    g.strokeEllipse(x1, y1, 22 + pulse * 3, 9 + pulse);
    g.fillStyle(color, 0.7);
    g.fillTriangle(x1, y1 - 3, x1 - 4, y1 - 12 - pulse * 2, x1 + 4, y1 - 12 - pulse * 2);
  }
}

/** A ring under a soldier the cursor could pick up. */
export function drawPickRing(g: G, x: number, y: number, r: number, t: number): void {
  g.lineStyle(1.6, EMO.joyCore, 0.55 + 0.25 * Math.sin(t * 7));
  g.strokeEllipse(x, y + r * 0.9, r * 2.6, r * 0.9);
}

// ── Abilities ─────────────────────────────────────────────────────────────

/** Depress: a blast of cold out of the cape, in a cone. `t` runs 0–1 over its life. */
export function drawDepressCone(g: G, x: number, y: number, ang: number, half: number, len: number, t: number, seed: number): void {
  const front = len * easeOut(Math.min(1, t * 1.7));
  const fade = 1 - easeIn(t);
  g.fillStyle(EMO.gloomDeep, 0.3 * fade);
  g.slice(x, y, front, ang - half, ang + half, false);
  g.fillPath();
  g.fillStyle(EMO.gloom, 0.22 * fade);
  g.slice(x, y, front * 0.8, ang - half * 0.78, ang + half * 0.78, false);
  g.fillPath();
  // The front itself: ragged arcs of cold air, each a little behind the last.
  for (let i = 0; i < 3; i++) {
    const r = front * (1 - i * 0.16);
    if (r <= 4) continue;
    g.lineStyle(3.4 - i, i === 0 ? 0xdcebff : EMO.tear, fade * (0.7 - i * 0.18));
    g.beginPath();
    g.arc(x, y, r, ang - half * (1 - i * 0.08), ang + half * (1 - i * 0.08));
    g.strokePath();
  }
  // Rain carried on it: every streak falls the same way, whichever way the blast went.
  for (let i = 0; i < 22; i++) {
    const a = ang + (jitter(seed, i) * 2 - 1) * half * 0.94;
    const k = (jitter(seed, i + 40) + t * 1.5) % 1;
    const d = front * (0.15 + k * 0.82);
    const rx = x + Math.cos(a) * d, ry = y + Math.sin(a) * d + t * 16;
    const L = 6 + jitter(seed, i + 80) * 8;
    g.lineStyle(1.5, i % 3 === 0 ? 0xdcebff : EMO.tear, fade * (0.35 + 0.5 * (1 - k)));
    g.lineBetween(rx, ry, rx - 2, ry + L);
  }
  // The cape itself, thrown forward across the opening of the cone.
  if (t < 0.55) {
    const k = t / 0.55;
    const sweep = ang - half * 1.3 + half * 2.6 * easeOut(k);
    g.lineStyle(9 * (1 - k) + 2, 0xa8242e, (1 - k) * 0.85);
    g.beginPath();
    g.arc(x, y, 30 + k * 10, sweep - 0.9, sweep);
    g.strokePath();
    g.lineStyle(2, 0xe8c23a, (1 - k) * 0.8);
    g.beginPath();
    g.arc(x, y, 35 + k * 10, sweep - 0.9, sweep);
    g.strokePath();
  }
}

/** Euphoria, winding up: yellow drawn in toward the pike from all round. `k` is 0–1 through the second. */
export function drawEuphoriaCharge(g: G, x: number, y: number, ang: number, reach: number, k: number, t: number): void {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  // Where the charge will go: a lane that fills as the second runs out.
  const px = -sa, py = ca;
  g.fillStyle(EMO.joy, 0.07 + 0.09 * k);
  g.fillPoints([
    { x: x + px * 13, y: y + py * 13 }, { x: x + ca * reach + px * 13, y: y + sa * reach + py * 13 },
    { x: x + ca * (reach + 16), y: y + sa * (reach + 16) },
    { x: x + ca * reach - px * 13, y: y + sa * reach - py * 13 }, { x: x - px * 13, y: y - py * 13 },
  ], true);
  g.lineStyle(1.6, EMO.joy, 0.3 + 0.5 * k);
  g.lineBetween(x + px * 13, y + py * 13, x + ca * reach * k + px * 13, y + sa * reach * k + py * 13);
  g.lineBetween(x - px * 13, y - py * 13, x + ca * reach * k - px * 13, y + sa * reach * k - py * 13);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + t * 2.2;
    const u = (t * 2.4 + i * 0.37) % 1;
    const r0 = 46 * (1 - u) + 12;
    g.lineStyle(2, i % 2 ? EMO.joy : EMO.joyCore, (0.25 + 0.6 * k) * u);
    g.lineBetween(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * (r0 + 9), y + Math.sin(a) * (r0 + 9));
  }
  g.fillStyle(EMO.joyCore, 0.2 + 0.35 * k);
  g.fillCircle(x + ca * 20, y + sa * 20, 5 + 6 * k + Math.sin(t * 30) * k * 1.5);
}

/** The reach of the grand standard while it is held: a faint gold ring and banners of light on it. */
export function drawRallyRing(g: G, tint: EmotionColorFn, x: number, y: number, r: number, t: number, alpha: number): void {
  const gold = tint(EMO.gold);
  g.lineStyle(1.6, gold, alpha * (0.3 + 0.1 * Math.sin(t * 3)));
  g.strokeEllipse(x, y, r * 2, r * 2);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + t * 0.35;
    const bx = x + Math.cos(a) * r, by = y + Math.sin(a) * r;
    g.fillStyle(i % 2 ? gold : tint(EMO.banner), alpha * 0.55);
    g.fillTriangle(bx - 3, by - 4, bx + 3, by - 4, bx, by + 3 + Math.sin(t * 4 + i) * 1.2);
  }
}

/** The planted standard's summons: a ring of six seals, one lit for each soldier already called. */
export function drawMusterSeals(g: G, tint: EmotionColorFn, x: number, y: number, called: number, total: number, k: number, t: number): void {
  const gold = tint(EMO.gold);
  g.lineStyle(1.4, gold, 0.35);
  g.strokeEllipse(x, y, 96, 36);
  for (let i = 0; i < total; i++) {
    const a = -Math.PI / 2 + (i / total) * TAU;
    const sx = x + Math.cos(a) * 48, sy = y + Math.sin(a) * 18;
    const lit = i < called;
    const next = i === called;
    g.fillStyle(0x000000, 0.45);
    g.fillCircle(sx, sy, 5);
    g.fillStyle(lit ? gold : next ? light(gold, 0.3) : 0x4a4436, lit ? 0.95 : next ? 0.35 + 0.5 * k : 0.7);
    g.fillCircle(sx, sy, lit ? 3.6 : next ? 2 + 2 * k : 2.4);
    if (next) {
      g.lineStyle(1.5, EMO.joyCore, 0.7 * (1 - k));
      g.strokeCircle(sx, sy, 4 + 8 * k + Math.sin(t * 9) * 0.5);
    }
  }
}

// ── Fx ────────────────────────────────────────────────────────────────────

export class EmotionFx extends FxBase {
  /** A pike thrust, drawn for its whole duration. */
  thrust(x: number, y: number, ang: number, reach: number, seed = 1, depth = 9): void {
    this.anim(depth, 260, (g, t) => pikeThrust(g, this.tint, x, y, ang, reach, t, seed));
  }

  /** Chips flying off something that was just hit. */
  spark(x: number, y: number, color: number, count = 5, depth = 10): void {
    const seed = Math.random() * 99;
    this.anim(depth, 320, (g, t) => {
      for (let i = 0; i < count; i++) {
        const a = jitter(seed, i) * TAU;
        const d = (8 + jitter(seed, i + 9) * 16) * easeOut(t);
        g.fillStyle(color, 1 - t);
        g.fillRect(x + Math.cos(a) * d - 1.3, y + Math.sin(a) * d - 1.3 + t * t * 8, 2.6, 2.6);
      }
    });
  }

  /** Rile: the flag's call going out across the floor — a red ring with a gold edge, and pennants on it. */
  call(x: number, y: number, r: number, depth = 4): void {
    this.anim(depth, 620, (g, t) => {
      const rr = r * easeOut(t);
      g.lineStyle(6 * (1 - t) + 1, this.tint(EMO.banner), (1 - t) * 0.7);
      g.strokeEllipse(x, y, rr * 2, rr * 2);
      g.lineStyle(1.6, this.tint(EMO.gold), (1 - t) * 0.9);
      g.strokeEllipse(x, y, rr * 2 + 8, rr * 2 + 8);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + t * 0.6;
        const bx = x + Math.cos(a) * rr, by = y + Math.sin(a) * rr;
        g.fillStyle(this.tint(i % 2 ? EMO.gold : EMO.banner), (1 - t) * 0.85);
        g.fillTriangle(bx - 3.5, by - 5, bx + 3.5, by - 5, bx, by + 5);
      }
    });
  }

  /** A soldier breaking out of the floor: a ring of thrown dirt and a crack where it came up. */
  rise(x: number, y: number, size: number, depth = 3.6): void {
    const seed = Math.random() * 99;
    this.anim(depth, 520, (g, t) => {
      g.fillStyle(0x1a1410, (1 - t) * 0.55);
      g.fillEllipse(x, y + size * 0.4, size * 2.4 * (0.6 + 0.4 * t), size * 0.8);
      for (let i = 0; i < 9; i++) {
        const a = jitter(seed, i) * TAU;
        const d = size * (0.5 + jitter(seed, i + 20) * 1.3) * easeOut(t);
        const up = Math.sin(t * Math.PI) * size * (0.6 + jitter(seed, i + 40));
        g.fillStyle(i % 2 ? this.tint(EMO.stoneDark) : this.tint(EMO.timberDark), 1 - t * 0.8);
        g.fillCircle(x + Math.cos(a) * d, y + size * 0.4 + Math.sin(a) * d * 0.35 - up, 1.4 + jitter(seed, i + 60) * 2);
      }
      g.lineStyle(2, EMO.rage, (1 - t) * 0.5);
      g.strokeEllipse(x, y + size * 0.4, size * 2.2 * t + 4, size * 0.7 * t + 2);
    });
  }

  /** Depress going off. */
  coldBlast(x: number, y: number, ang: number, half: number, len: number, depth = 8): void {
    const seed = Math.random() * 99;
    this.anim(depth, 620, (g, t) => drawDepressCone(g, x, y, ang, half, len, t, seed));
  }

  /** Somebody has just been depressed: a little raincloud opens over them. */
  gloom(x: number, y: number, depth = 12): void {
    this.anim(depth, 700, (g, t) => {
      const a = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
      const cy = y - 34 - t * 4;
      g.fillStyle(EMO.gloomDeep, a * 0.9);
      g.fillCircle(x - 9, cy, 7); g.fillCircle(x, cy - 4, 9); g.fillCircle(x + 10, cy, 7);
      g.fillRoundedRect(x - 15, cy, 30, 7, 3);
      g.fillStyle(EMO.gloom, a * 0.7);
      g.fillCircle(x - 2, cy - 5, 5);
      for (let i = 0; i < 5; i++) {
        const k = (t * 2.4 + i * 0.2) % 1;
        g.lineStyle(1.5, EMO.tear, a * (1 - k));
        g.lineBetween(x - 12 + i * 6, cy + 8 + k * 16, x - 13 + i * 6, cy + 13 + k * 16);
      }
    });
  }

  /** Euphoria's charge: the lane it tore through, afterimages of the pike along it. */
  dashTrail(x0: number, y0: number, x1: number, y1: number, depth = 8): void {
    const ang = Math.atan2(y1 - y0, x1 - x0);
    const px = -Math.sin(ang), py = Math.cos(ang);
    this.anim(depth, 460, (g, t) => {
      const w = 15 * (1 - t);
      g.fillStyle(EMO.joy, (1 - t) * 0.4);
      g.fillPoints([
        { x: x0 + px * w * 0.3, y: y0 + py * w * 0.3 }, { x: x1 + px * w, y: y1 + py * w },
        { x: x1 + Math.cos(ang) * 22, y: y1 + Math.sin(ang) * 22 },
        { x: x1 - px * w, y: y1 - py * w }, { x: x0 - px * w * 0.3, y: y0 - py * w * 0.3 },
      ], true);
      g.lineStyle(3, EMO.joyCore, (1 - t) * 0.9);
      g.lineBetween(x0, y0, x1 + Math.cos(ang) * 18, y1 + Math.sin(ang) * 18);
      for (let i = 1; i <= 4; i++) {
        const k = i / 5;
        const gx = x0 + (x1 - x0) * k, gy = y0 + (y1 - y0) * k;
        g.lineStyle(2, EMO.joy, (1 - t) * 0.5 * k);
        g.lineBetween(gx + px * (10 + t * 16), gy + py * (10 + t * 16), gx + px * (18 + t * 26) - Math.cos(ang) * 12, gy + py * (18 + t * 26) - Math.sin(ang) * 12);
        g.lineBetween(gx - px * (10 + t * 16), gy - py * (10 + t * 16), gx - px * (18 + t * 26) - Math.cos(ang) * 12, gy - py * (18 + t * 26) - Math.sin(ang) * 12);
      }
    });
  }

  /** A soldier turning ecstatic: a burst of yellow stars going up off it. */
  joy(x: number, y: number, size: number, depth = 11): void {
    const seed = Math.random() * 99;
    this.anim(depth, 560, (g, t) => {
      g.lineStyle(3 * (1 - t), EMO.joy, 1 - t);
      g.strokeCircle(x, y, size * (0.8 + t * 1.6));
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (jitter(seed, i) - 0.5) * 2.6;
        const d = size * (0.8 + jitter(seed, i + 9) * 1.6) * easeOut(t);
        const sx = x + Math.cos(a) * d, sy = y + Math.sin(a) * d;
        const sz = (2 + jitter(seed, i + 18) * 2.4) * (1 - t);
        g.fillStyle(i % 2 ? EMO.joy : EMO.joyCore, 1 - t);
        g.fillTriangle(sx, sy - sz * 1.7, sx - sz * 0.6, sy, sx + sz * 0.6, sy);
        g.fillTriangle(sx, sy + sz * 1.7, sx - sz * 0.6, sy, sx + sz * 0.6, sy);
        g.fillTriangle(sx - sz * 1.7, sy, sx, sy - sz * 0.6, sx, sy + sz * 0.6);
        g.fillTriangle(sx + sz * 1.7, sy, sx, sy - sz * 0.6, sx, sy + sz * 0.6);
      }
    });
  }

  /** The grand standard driven into the floor: a shockwave, a ring of cracks and thrown stone. */
  slam(x: number, y: number, r: number, depth = 4): void {
    const seed = Math.random() * 99;
    this.flashIn(x, y, r * 0.3, EMO.joyCore, EMO.banner, depth + 6);
    this.anim(depth, 700, (g, t) => {
      const rr = r * easeOut(Math.min(1, t * 1.5));
      g.fillStyle(this.tint(EMO.banner), (1 - t) * 0.2);
      g.fillCircle(x, y, rr);
      g.lineStyle(9 * (1 - t) + 1, this.tint(EMO.gold), (1 - t) * 0.9);
      g.strokeCircle(x, y, rr);
      g.lineStyle(3, 0xffffff, (1 - t) * 0.6);
      g.strokeCircle(x, y, rr * 0.82);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU + jitter(seed, i) * 0.3;
        const len = r * (0.45 + jitter(seed, i + 30) * 0.5);
        const mid = len * 0.55;
        const bend = (jitter(seed, i + 60) - 0.5) * 0.5;
        g.lineStyle(2.2, 0x120c08, (1 - t * 0.7) * 0.8);
        g.beginPath();
        g.moveTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10);
        g.lineTo(x + Math.cos(a + bend) * mid, y + Math.sin(a + bend) * mid);
        g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        g.strokePath();
        const d = r * (0.3 + jitter(seed, i + 90) * 0.8) * easeOut(t);
        const up = Math.sin(t * Math.PI) * (14 + jitter(seed, i + 120) * 22);
        g.fillStyle(this.tint(i % 2 ? EMO.stone : EMO.stoneDark), 1 - t);
        g.fillRect(x + Math.cos(a) * d - 2, y + Math.sin(a) * d - up - 2, 4, 4);
      }
    });
  }

  /** A soldier going down: armour and dust. */
  fall(x: number, y: number, color: number, size: number, depth = 10): void {
    const seed = Math.random() * 99;
    this.anim(depth, 480, (g, t) => {
      g.fillStyle(0x8a8478, (1 - t) * 0.5);
      g.fillCircle(x, y, size * (0.6 + t * 1.2));
      for (let i = 0; i < 6; i++) {
        const a = jitter(seed, i) * TAU;
        const d = size * (0.4 + jitter(seed, i + 7) * 1.5) * easeOut(t);
        g.fillStyle(i % 2 ? this.tint(color) : this.tint(EMO.steel), 1 - t);
        g.fillRect(x + Math.cos(a) * d - 1.6, y + Math.sin(a) * d - 1.6 - Math.sin(t * Math.PI) * 8, 3.2, 3.2);
      }
    });
  }

  /** The barbarian's potion going down: a red flare and a roar ring. */
  rage(x: number, y: number, size: number, depth = 11): void {
    this.anim(depth, 620, (g, t) => {
      g.lineStyle(5 * (1 - t) + 1, EMO.rage, 1 - t);
      g.strokeCircle(x, y, size * (1 + t * 2.4));
      g.lineStyle(2, 0xff8a2a, (1 - t) * 0.8);
      g.strokeCircle(x, y, size * (0.6 + t * 1.6));
      g.fillStyle(EMO.rage, (1 - t) * 0.25);
      g.fillCircle(x, y, size * (1 + t));
    });
  }

  /** A shot that ran out of heart: it sags, greys and drips out. */
  fizzle(x: number, y: number, depth = 9): void {
    this.anim(depth, 360, (g, t) => {
      g.fillStyle(EMO.gloom, (1 - t) * 0.6);
      g.fillCircle(x, y + t * 8, 5 * (1 - t) + 1);
      g.fillStyle(EMO.tear, 1 - t);
      for (let i = 0; i < 3; i++) g.fillCircle(x - 4 + i * 4, y + 4 + t * (10 + i * 5), 1.6 * (1 - t));
    });
  }
}

// ── The commander ─────────────────────────────────────────────────────────

const EMOTION_AVATAR: AvatarSpec = {
  hands: [
    { r: 10, color: EMO.crimson, alpha: 0.22 },
    { r: 6.8, color: EMO.crimson, alpha: 0.98 },
    { r: 3.4, color: EMO.banner, alpha: 0.9 },
    { r: 1.8, color: EMO.parchment, alpha: 0.85, ox: -1.8, oy: -1.8 },
  ],
  eyeWhite: EMO.parchment,
  eyePupil: 0x1a1206,
  squash: { div: 15, x: 0.42, y: 0.24 },
};

/**
 * The commander: a plain crimson orb (the baked `elem-conquest`) carrying a **pike with a red
 * flag** — two crossed golden swords on the cloth — and a cape off his shoulders. The pike is the
 * kit's weapon and the cape is what Depress throws, so both stay on the rig; everything else is a
 * gold sash and epaulettes on the one-hue body.
 *
 * The rig shows what the kit is doing: the pike levels along the aim while Euphoria winds up, the
 * cape flares forward on Depress, and Maximum Nationalism swaps the pike for the grand standard
 * held overhead.
 *
 * He wears a plain gold crown. Mastered: the crown is jewelled and glowing, an ermine hem on the cape, a gilded shaft, gold eyes and wider gold
 * hand coronas.
 */
export class EmotionAvatar extends BaseAvatar {
  private seed = Math.random() * 999;
  private standard = false;
  private pikeHiddenMs = 0;
  private capeFlare = 0;
  private charge = 0;

  constructor(scene: Phaser.Scene, tint: EmotionColorFn, depth = 6) {
    super(scene, tint, depth, EMOTION_AVATAR);
  }

  /** Maximum Nationalism: the grand standard is out, held over the head. */
  setStandard(on: boolean): void { this.standard = on; }
  /** The pike is somewhere else for a moment (a thrust is being drawn with it). */
  hidePike(ms: number): void { this.pikeHiddenMs = Math.max(this.pikeHiddenMs, ms); }
  /** Depress: the cape goes forward. */
  flareCape(): void { this.capeFlare = 1; }
  /** Euphoria: 0–1 through the wind-up. The pike comes down level as it fills. */
  setCharge(k: number): void { this.charge = Phaser.Math.Clamp(k, 0, 1); }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.pikeHiddenMs = Math.max(0, this.pikeHiddenMs - delta);
    this.capeFlare = Math.max(0, this.capeFlare - delta / 520);
    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? EMO.gold : EMO.parchment);
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 13.5 : 10);
      glow.setFillStyle(this.tint(on ? EMO.gold : EMO.crimson), on ? 0.3 : 0.22);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new EmotionFx(this.scene, this.tint).spark(x, y, this.tint(EMO.gold), 2, 4);
  }

  /** The cape, behind the body: hung off the shoulders, trailing away from the aim. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const m = this.mastered;
    const k = this.intensity * (m ? 1.15 : 1);
    g.fillStyle(this.tint(m ? EMO.gold : EMO.crimson), a * (m ? 0.24 : 0.2) * k);
    g.fillCircle(x, y, 28 * k);
    if (this.charge > 0) {
      g.fillStyle(EMO.joy, a * 0.3 * this.charge);
      g.fillCircle(x, y, 26 + this.charge * 12 + Math.sin(this.t * 26) * 2 * this.charge);
    }
    const P = (px: number, py: number) => new Phaser.Geom.Point(px, py);
    const back = -Math.cos(this.facing);
    const sway = Math.sin(this.t * 1.9 + this.seed) * 1.6 + back * 5 - this.capeFlare * back * 7;
    const drop = 26 - this.capeFlare * 6;
    const cape = [
      P(x - 15, y - 11), P(x + 15, y - 11),
      P(x + 21 + sway, y + drop - 3), P(x + 9 + sway * 1.2, y + drop + Math.sin(this.t * 3.1) * 1.2),
      P(x - 2 + sway * 1.3, y + drop - 3), P(x - 12 + sway * 1.2, y + drop + Math.cos(this.t * 2.7) * 1.2),
      P(x - 22 + sway, y + drop - 4),
    ];
    const cloth = this.tint(EMO.blood);
    g.fillStyle(0x000000, alpha * 0.25);
    g.fillPoints(cape.map((q) => P(q.x + 1.2, q.y + 1.6)), true);
    g.fillStyle(cloth, alpha * 0.98);
    g.fillPoints(cape, true);
    g.fillStyle(dark(cloth, 0.3), alpha * 0.8);
    g.fillPoints([cape[1], cape[2], cape[3], P(x + 6, y - 11)], true);
    g.lineStyle(1.3, this.tint(EMO.gold), alpha * 0.95);
    g.strokePoints([cape[2], cape[3], cape[4], cape[5], cape[6]], false, false);
    if (m) {
      // Ermine along the hem: white fur with the black tails.
      g.fillStyle(this.tint(EMO.parchment), alpha);
      g.fillPoints([
        P(cape[6].x, cape[6].y - 5), P(cape[4].x, cape[4].y - 5), P(cape[2].x, cape[2].y - 5),
        cape[2], cape[3], cape[4], cape[5], cape[6],
      ], true);
      g.fillStyle(0x15100a, alpha * 0.9);
      for (let i = 0; i < 6; i++) {
        const tx = x - 16 + i * 6.4 + sway;
        g.fillTriangle(tx - 1, y + drop - 6, tx + 1, y + drop - 6, tx, y + drop - 3);
      }
    }
  }

  /** On the orb: a gold sash from the left shoulder to the right hip, and a fringed epaulette each side. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const m = this.mastered;
    const P = (px: number, py: number) => new Phaser.Geom.Point(px, py);
    const sash = [P(x - 17, y - 6), P(x - 12, y - 11), P(x + 15, y + 9), P(x + 10, y + 14)];
    g.fillStyle(0x000000, alpha * 0.25);
    g.fillPoints(sash.map((q) => P(q.x + 0.8, q.y + 1.2)), true);
    g.fillStyle(this.tint(m ? EMO.parchment : EMO.gold), alpha * 0.95);
    g.fillPoints(sash, true);
    g.lineStyle(0.9, this.tint(EMO.goldDeep), alpha);
    g.lineBetween(x - 17, y - 6, x + 10, y + 14);
    g.lineBetween(x - 12, y - 11, x + 15, y + 9);
    if (m) {
      g.lineStyle(1.6, this.tint(EMO.crimson), alpha * 0.9);
      g.lineBetween(x - 14.5, y - 8.5, x + 12.5, y + 11.5);
    }
    for (const side of [-1, 1]) {
      const ex = x + side * 15.5, ey = y - 9;
      g.fillStyle(this.tint(EMO.goldDeep), alpha);
      g.fillEllipse(ex, ey + 0.6, 10, 5);
      g.fillStyle(this.tint(EMO.gold), alpha);
      g.fillEllipse(ex, ey, 9, 4);
      g.lineStyle(1, this.tint(EMO.gold), alpha * 0.9);
      for (let i = 0; i < 5; i++) {
        const fx = ex - 3.6 + i * 1.8;
        g.lineBetween(fx, ey + 1.5, fx + side * 0.3, ey + 4.5 + Math.sin(this.t * 3 + i) * 0.4);
      }
    }
  }

  /** The pike and its flag in the right hand — or the grand standard over the head. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const m = this.mastered;
    const ca = Math.cos(this.facing);

    if (this.capeFlare > 0) {
      // The cape thrown forward: a crimson sweep across the front of the body.
      const k = 1 - this.capeFlare;
      const sweep = this.facing - 1.1 + 2.2 * easeOut(k);
      g.lineStyle(8 * this.capeFlare + 2, this.tint(EMO.blood), alpha * this.capeFlare * 0.9);
      g.beginPath();
      g.arc(x, y, 24 + k * 8, sweep - 1, sweep);
      g.strokePath();
      g.lineStyle(1.6, this.tint(EMO.gold), alpha * this.capeFlare * 0.9);
      g.beginPath();
      g.arc(x, y, 29 + k * 8, sweep - 1, sweep);
      g.strokePath();
    }

    if (this.standard) {
      // Held high in both hands, the cloth streaming back off the way he is facing.
      const hx = (this.armX[0] + this.armX[1]) / 2;
      const hy = Math.min(this.armY[0], this.armY[1]);
      drawGrandStandard(g, this.tint, hx, hy + 6, 66, this.t, this.seed, ca >= 0 ? -1 : 1, alpha, false);
    } else if (this.pikeHiddenMs <= 0) {
      const hx = this.armX[1], hy = this.armY[1];
      // Carried near upright, leaning with the aim; levelled along it as a charge winds up.
      const carry = -Math.PI / 2 + ca * 0.32;
      const dirA = carry + Phaser.Math.Angle.Wrap(this.facing - carry) * easeOut(this.charge);
      const dc = Math.cos(dirA), ds = Math.sin(dirA);
      const bx = hx + dc * 34, by = hy + ds * 34;
      pikeFlag(g, this.tint, bx, by, dc, ds, 21, 12, this.t, this.seed, alpha);
      pikeShaft(g, this.tint, hx - dc * 15, hy - ds * 15, bx, by, alpha, m);
      if (this.charge > 0) {
        g.fillStyle(EMO.joyCore, alpha * this.charge * (0.6 + 0.4 * Math.sin(this.t * 30)));
        g.fillCircle(bx + dc * 10, by + ds * 10, 3 + this.charge * 4);
      }
    }

    // The crown: plain gold on every commander; jewelled, pearled and glinting once mastered.
    {
      const cx = x + ca * 1.2;
      const cy = y - 17;
      const P = (px2: number, py2: number) => new Phaser.Geom.Point(cx + px2, cy + py2);
      const crown = [P(-8, 1), P(-8.5, -6), P(-5, -2.5), P(-2.5, -8), P(0, -3), P(2.5, -8), P(5, -2.5), P(8.5, -6), P(8, 1)];
      g.fillStyle(0x000000, alpha * 0.35);
      g.fillPoints(crown.map((q) => new Phaser.Geom.Point(q.x + 0.8, q.y + 1)), true);
      g.fillStyle(this.tint(EMO.gold), alpha);
      g.fillPoints(crown, true);
      g.fillStyle(this.tint(EMO.goldDeep), alpha);
      g.fillRect(cx - 8, cy - 1, 16, 2.4);
      g.fillStyle(this.tint(EMO.muzzle), alpha * 0.7);
      g.fillRect(cx - 7.5, cy - 1.6, 15, 0.7);
      if (m) {
        g.fillStyle(EMO.joy, alpha * (0.2 + 0.08 * Math.sin(this.t * 4)));
        g.fillCircle(cx, cy - 3, 13);
        g.fillStyle(this.tint(EMO.crimson), alpha);
        g.fillCircle(cx, cy + 0.2, 1.4);
        g.fillStyle(this.tint(EMO.parchment), alpha);
        for (const px2 of [-8.5, -2.5, 2.5, 8.5]) g.fillCircle(cx + px2, cy + (Math.abs(px2) > 5 ? -6 : -8), 1.1);
        const u = (this.t * 0.5) % 1;
        g.fillStyle(this.tint(EMO.muzzle), alpha * Math.sin(u * Math.PI) * 0.8);
        g.fillCircle(cx - 7 + u * 14, cy, 1.2);
      }
    }
  }
}
