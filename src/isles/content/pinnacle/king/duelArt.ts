import type Phaser from 'phaser';
import type { BossEntryKit } from '../../../../boss/framework/BossDefs';
import { mulberry } from '../../../art/IsleArt';
import { OBS, councilMask, crackPath, glassFloor, mixC, lit, seam, shard, slab, starGlow, starfield, throne } from '../../../art/PinnacleArt';
import { type Pt, type Swing, type SwordPose, clampN, easeOut, smooth } from './duelState';

/**
 * Act II — THE CRACKED MASK: everything the duel looks like.
 *
 *  · `drawKing`  — the King on his feet, painted whole (the rig is hidden this act): a black-glass
 *                  knight with a cape, a crown of shards and the cracked mask, the sword in his right
 *                  hand and the folded Aegis — a curved tower of glass — on his left. The shield is
 *                  drawn as an extruded arc in the direction it guards, so from any side it reads.
 *  · `paintHall` — the throne hall for this act: the throne (its sword drawn), the dais steps, the
 *                  sixty empty niches, the long runner down the middle.
 *  · `entryGround` / `entryOver` — the rising: he stands, the mask cracks, he draws the sword out
 *                  of the throne's back, the Aegis folds onto his arm, he walks down the steps.
 */

type G = Phaser.GameObjects.Graphics;

/** The throne for this act (matches the hall act I sits him in). */
export const THRONE = { x: 480, y: 214, s: 0.8 };
/** Where he sits. */
export const SEAT = { x: 480, y: 170 };
/** The foot of the stair, where the duel begins. */
export const STAIR_FOOT = { x: 480, y: 320 };
/** Gold-white starlight leaking through the mask and the cracks. */
const STAR = OBS.star;
const LINING = 0x26123f;
const CAPE = 0x110c1a;

// ── The King ─────────────────────────────────────────────────────────

/** How the painter should hold him this frame. */
export interface KingPose {
  /** Scene ms. */
  t: number;
  /** The direction he guards / faces (rad). */
  face: number;
  swordA: number;
  pose: SwordPose;
  swing: Swing | null;
  /** 'arm' — guarding; 'low' — dropped at his side (sword stuck); 'none' — thrown, broken, or not yet his. */
  shield: 'arm' | 'low' | 'none';
  twoHanded: boolean;
  /** 0–1: the mask's crack (act II opens at ~0.6). */
  crack: number;
  /** 0–1: the split after the shield breaks — starlight through mask and chest. */
  split: number;
  crouch: number;
  air: number;
  braced: number;
  crownFlare: number;
  walk: number;
  hurt: boolean;
  blockAt: number;
  backAt: number;
  /** 0–1 of the blade drawn (the entry pulls it from the throne). 1 = whole. */
  bladeOut?: number;
  /** The blade's buried point (pose 'buried'). */
  stuck?: Pt;
  /** Hand override (the entry: reaching to the hilt). */
  hand?: Pt;
  /** 0–1: sat on the throne (legs folded, lower). */
  seated?: number;
  /** Draw nothing of the sword at all. */
  noSword?: boolean;
}

/** The King's great sword, from the hand at (hx, hy) along `a`. `out` 0–1 hides the tip end (still in the throne). */
export function kingBlade(g: G, hx: number, hy: number, a: number, len: number, o: { star?: number; alpha?: number; t?: number; out?: number; noHilt?: boolean } = {}): void {
  const al = o.alpha ?? 1;
  const ca = Math.cos(a), sa = Math.sin(a);
  const px = -sa, py = ca;
  const t = (o.t ?? 0) / 1000;
  const star = o.star ?? 0;
  const L = len * (o.out ?? 1);
  if (!o.noHilt) {
    // Grip and the pommel stone.
    g.lineStyle(6, OBS.facet, al);
    g.lineBetween(hx - ca * 16, hy - sa * 16, hx + ca * 4, hy + sa * 4);
    g.lineStyle(1, OBS.edge, 0.5 * al);
    g.lineBetween(hx - ca * 16 + px * 3, hy - sa * 16 + py * 3, hx + ca * 4 + px * 3, hy + sa * 4 + py * 3);
    g.fillStyle(OBS.seam, 0.3 * al); g.fillCircle(hx - ca * 21, hy - sa * 21, 8);
    g.fillStyle(OBS.seamLit, al); g.fillCircle(hx - ca * 21, hy - sa * 21, 3.6);
    // The crossguard: a bar of glass whose wings sweep toward the blade.
    const gx = hx + ca * 6, gy = hy + sa * 6;
    g.fillStyle(OBS.sheen, al);
    g.fillPoints([
      { x: gx + px * 22 + ca * 7, y: gy + py * 22 + sa * 7 }, { x: gx + px * 18 - ca * 2, y: gy + py * 18 - sa * 2 },
      { x: gx - px * 18 - ca * 2, y: gy - py * 18 - sa * 2 }, { x: gx - px * 22 + ca * 7, y: gy - py * 22 + sa * 7 },
      { x: gx - px * 10 + ca * 3, y: gy - py * 10 + sa * 3 }, { x: gx + px * 10 + ca * 3, y: gy + py * 10 + sa * 3 },
    ], true);
    g.lineStyle(1.2, OBS.edge, 0.8 * al);
    g.lineBetween(gx + px * 18 - ca * 2, gy + py * 18 - sa * 2, gx - px * 18 - ca * 2, gy - py * 18 - sa * 2);
    g.fillStyle(OBS.seamLit, 0.9 * al); g.fillCircle(gx, gy, 2.4);
  }
  if (L < 4) return;
  // The blade: two planes, a ridge, a violet fuller (starlight once he is splitting).
  const bx = hx + ca * 9, by = hy + sa * 9;
  const tipX = hx + ca * (9 + L), tipY = hy + sa * (9 + L);
  const w0 = 7.5, w1 = 6;
  const sx = hx + ca * (9 + L * 0.86), sy = hy + sa * (9 + L * 0.86);
  g.fillStyle(OBS.glass, al);
  g.fillPoints([{ x: bx + px * w0, y: by + py * w0 }, { x: sx + px * w1, y: sy + py * w1 }, { x: tipX, y: tipY }, { x: bx, y: by }], true);
  g.fillStyle(OBS.facet, al);
  g.fillPoints([{ x: bx - px * w0, y: by - py * w0 }, { x: sx - px * w1, y: sy - py * w1 }, { x: tipX, y: tipY }, { x: bx, y: by }], true);
  g.lineStyle(1.3, OBS.edge, 0.85 * al);
  g.lineBetween(bx + px * w0, by + py * w0, sx + px * w1, sy + py * w1);
  g.lineBetween(sx + px * w1, sy + py * w1, tipX, tipY);
  g.lineStyle(1, OBS.edge, 0.45 * al);
  g.lineBetween(bx - px * w0, by - py * w0, sx - px * w1, sy - py * w1);
  g.lineBetween(sx - px * w1, sy - py * w1, tipX, tipY);
  const pulse = 0.5 + 0.5 * Math.sin(t * 3.1);
  seam(g, [{ x: bx, y: by }, { x: hx + ca * (9 + L * 0.78), y: hy + sa * (9 + L * 0.78) }], 1.3, 0.85 * al, pulse * 0.5, star > 0 ? mixC(OBS.seam, STAR, star) : OBS.seam);
  // A glint that runs the edge.
  const gk = (t * 0.7) % 1;
  g.fillStyle(0xffffff, 0.75 * al * (1 - gk));
  g.fillCircle(bx + (tipX - bx) * gk + px * w0 * (1 - gk), by + (tipY - by) * gk + py * w0 * (1 - gk), 1.6);
  if (star > 0) {
    g.fillStyle(STAR, 0.16 * star * al);
    g.fillCircle(tipX, tipY, 7);
    g.fillCircle(bx + (tipX - bx) * 0.5, by + (tipY - by) * 0.5, 10);
  }
}

/** A sweeping crescent left by a cut, from `a0` toward `a1` (the head is thick, the tail thin). */
export function crescent(g: G, ox: number, oy: number, a0: number, a1: number, r: number, alpha: number, color: number = OBS.seamLit): void {
  const n = 16;
  const outer: Pt[] = [], inner: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const a = a0 + (a1 - a0) * k;
    outer.push({ x: ox + Math.cos(a) * r, y: oy + Math.sin(a) * r });
    const ri = r * (0.96 - 0.38 * k);
    inner.push({ x: ox + Math.cos(a) * ri, y: oy + Math.sin(a) * ri });
  }
  g.fillStyle(color, alpha * 0.55);
  g.fillPoints([...outer, ...inner.reverse()], true);
  g.lineStyle(2, 0xffffff, alpha * 0.8);
  g.beginPath();
  g.moveTo(outer[0].x, outer[0].y);
  for (const p of outer) g.lineTo(p.x, p.y);
  g.strokePath();
}

/**
 * The Aegis on his arm: the dome of act I folded into a curved tower of glass. Drawn as an arc in
 * the floor plane (bulging toward `a`) stood up `hgt` px — from any side it shows which way it
 * guards. `inner` paints the strapped back (seen when it faces away from the camera).
 */
export function aegisOnArm(g: G, cx: number, cy: number, a: number, t: number, o: { braced?: number; alpha?: number; low?: boolean } = {}): void {
  const al = o.alpha ?? 1;
  const fx = Math.cos(a), fy = Math.sin(a);
  const px = -fy, py = fx;
  const W = o.low ? 34 : 50, D = o.low ? 10 : 18, HGT = o.low ? 22 : 52;
  const base: Pt[] = [];
  const N = 12;
  for (let i = 0; i <= N; i++) {
    const u = -1 + (2 * i) / N;
    const gx = px * u * W + fx * D * (1 - u * u);
    const gy = py * u * W + fy * D * (1 - u * u);
    base.push({ x: cx + gx, y: cy + gy * 0.6 + 16 });
  }
  const top = base.map((p) => ({ x: p.x, y: p.y - HGT }));
  const facing = fy > -0.15;
  const braced = o.braced ?? 0;
  if (braced > 0) {
    g.fillStyle(OBS.seamLit, 0.08 * braced * al); g.fillCircle(cx + fx * 8, cy - HGT * 0.3, 66);
    g.fillStyle(0xffffff, 0.06 * braced * al); g.fillCircle(cx + fx * 8, cy - HGT * 0.3, 44);
  }
  const face = [...base, ...[...top].reverse()];
  g.fillStyle(facing ? OBS.facet : OBS.glass, al);
  g.fillPoints(face, true);
  // Bands: the dome's ribs, as they folded — lit toward the curve's middle.
  for (let i = 1; i < N; i++) {
    const u = -1 + (2 * i) / N;
    const shadeK = facing ? 1 - Math.abs(u) : 0.25;
    g.fillStyle(facing ? OBS.sheen : OBS.facet, (facing ? 0.5 : 0.35) * shadeK * al);
    g.fillPoints([base[i], base[i + 1], top[i + 1], top[i]], true);
  }
  for (const u of [-0.6, -0.2, 0.2, 0.6]) {
    const i = Math.round(((u + 1) / 2) * N);
    g.lineStyle(1, OBS.edge, (facing ? 0.45 : 0.2) * al);
    g.lineBetween(base[i].x, base[i].y, top[i].x, top[i].y);
  }
  // Rim: the top edge catches the light, the bottom only just.
  g.lineStyle(1.8, OBS.edge, 0.9 * al);
  g.beginPath(); g.moveTo(top[0].x, top[0].y); for (const p of top) g.lineTo(p.x, p.y); g.strokePath();
  g.lineStyle(1, OBS.edge, 0.4 * al);
  g.beginPath(); g.moveTo(base[0].x, base[0].y); for (const p of base) g.lineTo(p.x, p.y); g.strokePath();
  g.lineBetween(base[0].x, base[0].y, top[0].x, top[0].y);
  g.lineBetween(base[N].x, base[N].y, top[N].x, top[N].y);
  const mx = (base[N / 2].x + top[N / 2].x) / 2, my = (base[N / 2].y + top[N / 2].y) / 2;
  if (facing) {
    // The seams of the old dome, now a sigil across the face; the boss, a violet stone.
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
    seam(g, [top[3], { x: mx, y: my }, base[9]], 1.1, 0.55 * al, pulse * 0.4 + braced);
    seam(g, [top[9], { x: mx, y: my }, base[3]], 1.1, 0.55 * al, pulse * 0.4 + braced);
    g.fillStyle(OBS.seam, 0.35 * al); g.fillCircle(mx, my, 10 + braced * 4);
    g.fillStyle(OBS.seamLit, al); g.fillCircle(mx, my, 4.5);
    g.fillStyle(0xffffff, 0.9 * al); g.fillCircle(mx - 1.2, my - 1.4, 1.4);
  } else {
    // The back: a strap and the gauntlet that holds it.
    g.lineStyle(4, 0x3a2e52, al);
    g.lineBetween(base[4].x, (base[4].y + top[4].y) / 2, base[8].x, (base[8].y + top[8].y) / 2);
    g.fillStyle(OBS.sheen, al); g.fillCircle(mx, my, 7);
    g.lineStyle(1, OBS.edge, 0.6 * al); g.strokeCircle(mx, my, 7);
  }
}

/** The Aegis thrown: a spinning disc of glass, seen from above, with its shadow under it. */
export function aegisDisc(g: G, x: number, y: number, spin: number, o: { alpha?: number; hgt?: number; trail?: Pt[] } = {}): void {
  const al = o.alpha ?? 1;
  const h = o.hgt ?? 20;
  g.fillStyle(0x000000, 0.3 * al); g.fillEllipse(x, y + 6, 58, 18);
  for (const [i, p] of (o.trail ?? []).entries()) {
    g.fillStyle(OBS.seam, 0.12 * al * (1 - i / 4)); g.fillEllipse(p.x, p.y - h, 60, 38);
  }
  const cy = y - h;
  g.fillStyle(OBS.seam, 0.18 * al); g.fillEllipse(x, cy, 80, 54);
  g.fillStyle(OBS.glass, al); g.fillEllipse(x, cy + 3, 62, 40);
  g.fillStyle(OBS.facet, al); g.fillEllipse(x, cy, 60, 37);
  g.fillStyle(OBS.sheen, 0.7 * al); g.fillEllipse(x, cy - 2, 40, 24);
  // The seams turn with it — a wheel of violet.
  for (let i = 0; i < 6; i++) {
    const a = spin + (i / 6) * Math.PI * 2;
    g.lineStyle(1.6, OBS.seamLit, 0.75 * al);
    g.lineBetween(x + Math.cos(a) * 6, cy + Math.sin(a) * 4, x + Math.cos(a) * 29, cy + Math.sin(a) * 18);
  }
  g.lineStyle(1.6, OBS.edge, 0.9 * al); g.strokeEllipse(x, cy, 60, 37);
  g.fillStyle(OBS.seamLit, al); g.fillCircle(x, cy, 4.5);
  g.fillStyle(0xffffff, 0.9 * al); g.fillCircle(x + Math.cos(spin * 2) * 24, cy + Math.sin(spin * 2) * 15, 1.8);
}

/** One piece of the broken Aegis standing in the floor; `rise` 0–1 lifts it out (a recall). */
export function aegisShard(g: G, x: number, y: number, size: number, lean: number, t: number, rise = 0, glowK = 0): void {
  const lift = rise * 26;
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y + 2, size * 1.2, size * 0.34);
  const pulse = 0.5 + 0.5 * Math.sin(t * 2 + x * 0.05);
  g.fillStyle(OBS.seam, (0.1 + glowK * 0.25) * (0.6 + pulse * 0.4)); g.fillEllipse(x, y, size * 1.6, size * 0.6);
  shard(g, x, y - lift, size * 0.8, size * 1.5, lean, 0.4);
  shard(g, x + size * 0.32, y - lift + 2, size * 0.45, size * 0.8, lean * 1.4 + 4, 0.2);
  seam(g, [{ x: x - size * 0.3, y: y - lift - 2 }, { x: x + size * 0.05, y: y - lift - size * 0.7 }, { x: x + lean * 0.6, y: y - lift - size * 1.2 }], 1, 0.7, pulse * 0.6 + glowK);
}

/** Where the sword hand is for a pose (body anchor bx, by). */
function handFor(k: KingPose, x: number, by: number, a: number): Pt {
  switch (k.pose) {
    case 'raised': return { x: x + 14, y: by - 80 };
    case 'thrust': return { x: x + Math.cos(a) * 44, y: by - 4 + Math.sin(a) * 28 };
    case 'cocked': return { x: x + Math.cos(a) * 30, y: by - 8 + Math.sin(a) * 18 };
    case 'guard': return { x: x + 30, y: by - 10 };
    case 'plunge': return { x: x + Math.cos(k.face) * 22, y: by - 10 };
    case 'buried': {
      const s = k.stuck ?? { x: x + Math.cos(a) * 70, y: by + Math.sin(a) * 40 };
      return { x: x + (s.x - x) * 0.45, y: by - 18 + (s.y - by) * 0.3 };
    }
    default: return { x: x + 34 + Math.cos(a) * 6, y: by + 2 + Math.sin(a) * 6 };
  }
}

/**
 * The King, painted whole. (x, y) is his hitbox centre; he stands ~140 px tall over it. Draw order
 * is worked out from where the shield and blade point, so a guard facing north sits behind him.
 */
export function drawKing(g: G, x: number, y: number, k: KingPose): void {
  const t = k.t / 1000;
  const seated = k.seated ?? 0;
  const lift = k.air * 64;
  const by = y - lift + k.crouch * 7 + seated * 6;
  const fx = Math.cos(k.face), fy = Math.sin(k.face);
  const len = k.twoHanded ? 132 : 116;

  // ── The sword's frame state.
  let bladeA = k.swordA;
  let sw: { a0: number; a: number; prog: number; r: number } | null = null;
  if (k.swing) {
    const prog = clampN((k.t - k.swing.at) / Math.max(1, k.swing.ms), 0, 1);
    if (k.t - k.swing.at < k.swing.ms + 200) {
      bladeA = k.swing.from + (k.swing.to - k.swing.from) * easeOut(prog);
      sw = { a0: k.swing.from, a: bladeA, prog: (k.t - k.swing.at) / (k.swing.ms + 200), r: k.swing.r };
    }
  }
  if (k.pose === 'raised') bladeA = -Math.PI / 2 + 0.18;
  if (k.pose === 'guard') bladeA = k.twoHanded ? k.face - Math.PI / 2 : k.face + Math.PI * 0.85;
  if (k.pose === 'plunge') bladeA = Math.PI / 2;
  const hand = k.hand ?? handFor(k, x, by, bladeA);
  let bladeLen = len;
  if (k.pose === 'plunge') bladeLen = 52;
  if (k.pose === 'buried' && k.stuck) { bladeA = Math.atan2(k.stuck.y - hand.y, k.stuck.x - hand.x); bladeLen = Math.max(20, Math.hypot(k.stuck.x - hand.x, k.stuck.y - hand.y) - 9); }
  const swordBehind = !k.noSword && k.pose !== 'raised' && k.pose !== 'buried' && k.pose !== 'plunge' && Math.sin(bladeA) < -0.35 && !sw;
  const shieldBehind = k.shield === 'arm' && fy < -0.15;
  const shieldC = { x: x + fx * 40 - (k.shield === 'low' ? 30 : 0), y: by - 18 + fy * 24 + (k.shield === 'low' ? 26 : 0) };

  const drawSword = (): void => {
    if (k.noSword) return;
    kingBlade(g, hand.x, hand.y, bladeA, bladeLen, { star: k.split, t: k.t, out: k.bladeOut });
    // Gauntlets on the grip: one, or both once the shield is gone.
    g.fillStyle(OBS.sheen, 1); g.fillCircle(hand.x, hand.y, 7.5);
    g.lineStyle(1.2, OBS.edge, 0.8); g.strokeCircle(hand.x, hand.y, 7.5);
    if (k.twoHanded) {
      const ca = Math.cos(bladeA), sa = Math.sin(bladeA);
      g.fillStyle(OBS.facet, 1); g.fillCircle(hand.x - ca * 11, hand.y - sa * 11, 7);
      g.lineStyle(1.2, OBS.edge, 0.7); g.strokeCircle(hand.x - ca * 11, hand.y - sa * 11, 7);
    }
  };

  // ── Shadow (stays on the floor when he leaps).
  g.fillStyle(0x000000, 0.42 - k.air * 0.18);
  g.fillEllipse(x, y + 38, 120 * (1 - k.air * 0.3), 30 * (1 - k.air * 0.3));
  if (k.air > 0.05) { g.lineStyle(2, OBS.seam, 0.3 * k.air); g.strokeEllipse(x, y + 38, 120, 30); }

  // ── The cut's crescent, on the air under the blade.
  if (sw && sw.prog < 1) {
    const fade = 1 - clampN(sw.prog, 0, 1);
    crescent(g, x, by - 4, sw.a0, sw.a, sw.r, 0.55 * fade, k.split > 0 ? mixC(OBS.seamLit, STAR, 0.6) : OBS.seamLit);
  }

  if (shieldBehind) aegisOnArm(g, shieldC.x, shieldC.y, k.face, t, { braced: k.braced });
  if (swordBehind) drawSword();

  // ── Cape: black glass cloth, a violet lining at the hem, swaying and trailing his facing.
  const sway = Math.sin(t * 1.7) * 4 + Math.sin(k.walk / 23) * 3;
  const tr = -fx * 10;
  const hem: Pt[] = [
    { x: x + 48 + sway + tr, y: by + 36 }, { x: x + 28 + sway * 0.6 + tr, y: by + 44 }, { x: x + 8 + tr, y: by + 40 },
    { x: x - 12 + tr, y: by + 46 }, { x: x - 30 - sway * 0.4 + tr, y: by + 41 }, { x: x - 50 + sway + tr, y: by + 37 },
  ];
  if (seated < 0.9) {
    g.fillStyle(LINING, 1);
    g.fillPoints([{ x: x - 32, y: by - 40 }, { x: x + 32, y: by - 40 }, ...hem.map((p) => ({ x: p.x, y: p.y + 3 }))], true);
    g.fillStyle(CAPE, 1);
    g.fillPoints([{ x: x - 32, y: by - 40 }, { x: x + 32, y: by - 40 }, ...hem], true);
    g.fillStyle(OBS.facet, 0.5);
    g.fillPoints([{ x: x + 10, y: by - 38 }, { x: x + 32, y: by - 40 }, hem[0], hem[1]], true);
    g.lineStyle(1, OBS.edge, 0.3);
    g.lineBetween(x + 32, by - 40, hem[0].x, hem[0].y);
    g.lineBetween(x - 32, by - 40, hem[5].x, hem[5].y);
    seam(g, hem, 1, 0.5, 0.2 + k.braced * 0.5);
  }

  // ── Legs: greaves and sabatons, a stride when he walks.
  if (seated < 0.5) {
    const step = Math.sin(k.walk / 14) * 6;
    for (const side of [-1, 1]) {
      const lx = x + side * 13 + side * step * 0.5;
      const ly = by + 14 - (side * step > 0 ? 2 : 0);
      g.fillStyle(OBS.glass, 1);
      g.fillPoints([{ x: lx - 8, y: ly }, { x: lx + 8, y: ly }, { x: lx + 6, y: ly + 24 }, { x: lx - 6, y: ly + 24 }], true);
      g.fillStyle(OBS.facet, 1);
      g.fillPoints([{ x: lx, y: ly }, { x: lx + 8, y: ly }, { x: lx + 6, y: ly + 24 }, { x: lx + 1, y: ly + 24 }], true);
      g.fillStyle(OBS.sheen, 1); g.fillEllipse(lx + side * 2, ly + 27, 18, 8);
      g.lineStyle(1, OBS.edge, 0.5); g.strokeEllipse(lx + side * 2, ly + 27, 18, 8);
      g.fillStyle(OBS.edge, 0.7); g.fillCircle(lx + 1, ly + 8, 2);
    }
  }

  // ── Faulds (the plated skirt) and the cuirass.
  for (let i = 0; i < 3; i++) {
    const fyy = by + 14 + i * 6;
    const w = 32 - i * 3;
    g.fillStyle(i % 2 ? OBS.glass : OBS.facet, 1);
    g.fillPoints([{ x: x - w, y: fyy }, { x: x + w, y: fyy }, { x: x + w - 4, y: fyy + 9 }, { x: x - w + 4, y: fyy + 9 }], true);
    g.lineStyle(1, OBS.edge, 0.4); g.lineBetween(x - w + 4, fyy + 9, x + w - 4, fyy + 9);
  }
  const chest: Pt[] = [
    { x: x - 30, y: by - 38 }, { x: x + 30, y: by - 38 }, { x: x + 36, y: by - 8 }, { x: x + 24, y: by + 18 },
    { x, y: by + 24 }, { x: x - 24, y: by + 18 }, { x: x - 36, y: by - 8 },
  ];
  g.fillStyle(OBS.glass, 1); g.fillPoints(chest, true);
  g.fillStyle(OBS.facet, 1);
  g.fillPoints([{ x, y: by - 38 }, chest[1], chest[2], chest[3], chest[4]], true);
  g.fillStyle(OBS.sheen, 0.8);
  g.fillTriangle(x + 4, by - 34, x + 26, by - 34, x + 30, by - 10);
  g.fillStyle(0xffffff, 0.08); g.fillTriangle(x + 6, by - 33, x + 18, by - 33, x + 22, by - 22);
  g.lineStyle(1.4, OBS.edge, 0.6); g.strokePoints(chest, true);
  g.lineStyle(1, OBS.edge, 0.4); g.lineBetween(x, by - 38, x, by + 24);
  // The belt and its stone.
  g.fillStyle(0x07050b, 1); g.fillRect(x - 33, by + 8, 66, 6);
  g.lineStyle(1, OBS.edge, 0.35); g.strokeRect(x - 33, by + 8, 66, 6);
  g.fillStyle(OBS.seam, 0.5); g.fillCircle(x, by + 11, 6);
  g.fillStyle(OBS.seamLit, 1); g.fillCircle(x, by + 11, 2.6);
  // The chest seam — violet, and once he splits, starlight that widens as he weakens.
  const cpulse = 0.5 + 0.5 * Math.sin(t * 2.2);
  const chestCrack: Pt[] = [{ x: x - 4, y: by - 36 }, { x: x + 5, y: by - 24 }, { x: x - 3, y: by - 12 }, { x: x + 6, y: by }, { x: x + 1, y: by + 8 }];
  seam(g, chestCrack, 1.2 + k.split * 1.5, 0.8, cpulse * 0.5 + k.split, k.split > 0 ? STAR : OBS.seam);
  if (k.split > 0) {
    g.fillStyle(STAR, 0.12 * k.split); g.fillEllipse(x + 1, by - 14, 30, 50);
    const extra: Pt[][] = [
      [{ x: x + 5, y: by - 24 }, { x: x + 18, y: by - 30 }, { x: x + 27, y: by - 26 }],
      [{ x: x - 3, y: by - 12 }, { x: x - 16, y: by - 6 }, { x: x - 30, y: by - 9 }],
      [{ x: x + 6, y: by }, { x: x + 17, y: by + 9 }],
      [{ x: x - 4, y: by - 36 }, { x: x - 18, y: by - 30 }],
    ];
    const n = Math.min(extra.length, Math.ceil(k.split * extra.length));
    for (let i = 0; i < n; i++) seam(g, extra[i], 1, 0.75, cpulse * 0.5, STAR);
  }
  // A blow through the open back: gold breaks across him for a beat.
  if (k.t - k.backAt < 240) {
    const a = 1 - (k.t - k.backAt) / 240;
    seam(g, [{ x: x - 30, y: by - 30 }, { x: x - 6, y: by - 16 }, { x: x + 10, y: by - 26 }, { x: x + 34, y: by - 6 }], 1.6, a, 1, STAR);
    g.fillStyle(STAR, 0.2 * a); g.fillCircle(x, by - 12, 46);
  }

  // ── Pauldrons: stacked plates, a shard-spike on each.
  for (const side of [-1, 1]) {
    const sx = x + side * 34;
    for (let i = 0; i < 3; i++) {
      const dy = i * 6;
      g.fillStyle(i === 0 ? OBS.sheen : i === 1 ? OBS.facet : OBS.glass, 1);
      g.fillPoints([
        { x: sx - side * 14, y: by - 46 + dy }, { x: sx + side * 12, y: by - 44 + dy },
        { x: sx + side * 18, y: by - 30 + dy }, { x: sx - side * 10, y: by - 32 + dy },
      ], true);
      g.lineStyle(1, OBS.edge, 0.5 - i * 0.12);
      g.lineBetween(sx - side * 14, by - 46 + dy, sx + side * 12, by - 44 + dy);
    }
    shard(g, sx + side * 6, by - 44, 10, 18, side * 7, 0.35);
  }

  // ── Head: the hood of glass, the mask, the crown.
  const hx = x + fx * 3, hy = by - 62;
  g.fillStyle(OBS.glass, 1); g.fillEllipse(x, by - 44, 34, 12);
  g.fillStyle(OBS.glass, 1); g.fillCircle(hx, hy, 20);
  g.lineStyle(1.2, OBS.edge, 0.45); g.strokeCircle(hx, hy, 20);
  if (k.split > 0) {
    // Starlight round the head, leaking through the split.
    g.fillStyle(STAR, 0.07 * k.split); g.fillCircle(hx, hy, 40 + k.split * 14);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.42 + Math.sin(t * 0.9 + i) * 0.06;
      const l = (26 + k.split * 34) * (0.7 + 0.3 * Math.sin(t * 2 + i * 1.7));
      g.fillStyle(STAR, 0.14 * k.split);
      g.fillTriangle(hx - 2, hy - 4, hx + 2, hy - 4, hx + Math.cos(a) * l, hy - 4 + Math.sin(a) * l);
    }
  }
  councilMask(g, hx, hy, 17, { crack: k.crack, glow: 0.5 + k.braced * 0.5, slit: k.crownFlare > 0.3 ? mixC(OBS.seam, STAR, k.crownFlare) : OBS.seam });
  if (k.split > 0) {
    const sp: Pt[] = [{ x: hx - 1, y: hy - 18 }, { x: hx + 3, y: hy - 9 }, { x: hx - 2, y: hy - 2 }, { x: hx + 2, y: hy + 7 }, { x: hx - 1, y: hy + 17 }];
    g.fillStyle(STAR, 0.5 * k.split);
    g.fillPoints([...sp.map((p) => ({ x: p.x - 1.5 * k.split, y: p.y })), ...[...sp].reverse().map((p) => ({ x: p.x + 1.5 * k.split, y: p.y }))], true);
    seam(g, sp, 1 + k.split * 1.4, 1, k.split, STAR);
    starGlow(g, hx, hy - 3, 2.2 + k.split * 2, t, 0.5 + k.split * 0.5);
  }
  // Crown of shards.
  const heights = [12, 18, 25, 33, 25, 18, 12];
  for (let i = 0; i < heights.length; i++) {
    const off = (i - 3) * 8;
    if (k.split > 0.6 && i === 5) continue; // a tip broken off as he splits
    shard(g, hx + off, hy - 16, 9, heights[i], off * 0.25, 0.3);
  }
  g.lineStyle(3, OBS.glass, 1); g.lineBetween(hx - 28, hy - 16, hx + 28, hy - 16);
  seam(g, [{ x: hx - 27, y: hy - 16 }, { x: hx + 27, y: hy - 16 }], 1, 0.7, 0.3 + k.crownFlare);
  if (k.crownFlare > 0) {
    g.fillStyle(STAR, 0.14 * k.crownFlare); g.fillCircle(hx, hy - 30, 34);
    for (let i = 0; i < heights.length; i++) {
      const off = (i - 3) * 8;
      g.fillStyle(STAR, 0.8 * k.crownFlare); g.fillCircle(hx + off + off * 0.25, hy - 16 - heights[i], 2);
    }
  }

  if (!swordBehind) drawSword();
  if (k.shield === 'arm' && !shieldBehind) aegisOnArm(g, shieldC.x, shieldC.y, k.face, t, { braced: k.braced });
  if (k.shield === 'low') aegisOnArm(g, shieldC.x, shieldC.y, Math.PI / 2 + 0.5, t, { low: true, alpha: 0.95 });

  // A blow turned by the shield: sparks off its face.
  if (k.shield === 'arm' && k.t - k.blockAt < 200) {
    const a = 1 - (k.t - k.blockAt) / 200;
    const sx = shieldC.x + fx * 16, sy = shieldC.y - 10;
    for (let i = 0; i < 8; i++) {
      const ang = k.face + (i / 8 - 0.5) * 2.4;
      const l = 10 + (1 - a) * 26 + (i % 3) * 5;
      g.lineStyle(2, i % 2 ? 0xffffff : OBS.seamLit, a);
      g.lineBetween(sx + Math.cos(ang) * 6, sy + Math.sin(ang) * 4, sx + Math.cos(ang) * l, sy + Math.sin(ang) * l * 0.7);
    }
    g.fillStyle(0xffffff, 0.5 * a); g.fillCircle(sx, sy, 10 * a + 4);
  }
  if (k.hurt) { g.fillStyle(0xffffff, 0.16); g.fillCircle(x, by - 14, 40); }
}

// ── The hall ─────────────────────────────────────────────────────────

/** Old cracks in the floor, seeded once: where starlight comes up when the shield breaks. */
const FLOOR_CRACKS: Pt[][] = (() => {
  const rng = mulberry(0x51ca7);
  const out: Pt[][] = [];
  const from = { x: 480, y: 300 };
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.08 + (i / 8) * 0.84) + (rng() - 0.5) * 0.15;
    const l = 260 + rng() * 260;
    out.push(crackPath(from, { x: from.x + Math.cos(a) * l * 1.2, y: from.y + Math.sin(a) * l * 0.8 }, rng, 16, 8));
  }
  return out;
})();

/** The throne hall for act II, painted once (opaque): the throne bare of its sword. */
export function paintHall(g: G, W: number, H: number): void {
  const rng = mulberry(0x7e2ad);
  g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, W, H);
  // The back wall: tall panels of black glass, each a slightly different lean of light.
  for (let i = 0; i < 16; i++) {
    const x0 = i * 60;
    g.fillStyle(i % 2 ? OBS.glass : 0x130f1c, 1); g.fillRect(x0, 0, 60, 246);
    g.fillStyle(OBS.facet, 0.25 + rng() * 0.25);
    g.fillTriangle(x0 + 4, 0, x0 + 34, 0, x0 + 4, 120 + rng() * 80);
    g.lineStyle(1, OBS.edge, 0.18); g.lineBetween(x0, 0, x0, 246);
  }
  // The great pointed window behind the throne: the night, through a crack in the spire.
  const arch: Pt[] = [{ x: 372, y: 246 }, { x: 372, y: 90 }, { x: 420, y: 30 }, { x: 480, y: 0 }, { x: 540, y: 30 }, { x: 588, y: 90 }, { x: 588, y: 246 }];
  g.fillStyle(0x0b0818, 1); g.fillPoints(arch, true);
  for (let i = 0; i < 6; i++) {
    g.fillStyle(OBS.skyGlow, 0.12 + i * 0.03);
    g.fillEllipse(480, 120 + i * 18, 200 - i * 22, 230 - i * 30);
  }
  starfield(g, 378, 6, 204, 236, rng, 70, 0);
  g.lineStyle(2, OBS.edge, 0.5); g.strokePoints(arch, false);
  g.lineStyle(6, OBS.glass, 1); g.strokePoints(arch, false);
  g.lineStyle(1.2, OBS.edge, 0.7); g.strokePoints(arch.map((p) => ({ x: p.x + (p.x < 480 ? -4 : 4), y: p.y })), false);
  // The sixty niches, emptied: ten masks on the wall, all cracked.
  for (let i = 0; i < 10; i++) {
    const nx = i < 5 ? 70 + i * 62 : 890 - (9 - i) * 62;
    if (Math.abs(nx - 480) < 130) continue;
    const ny = 168;
    g.fillStyle(0x07050c, 1);
    g.fillPoints([{ x: nx - 22, y: ny + 40 }, { x: nx - 22, y: ny - 24 }, { x: nx, y: ny - 46 }, { x: nx + 22, y: ny - 24 }, { x: nx + 22, y: ny + 40 }], true);
    g.lineStyle(1, OBS.edge, 0.35);
    g.strokePoints([{ x: nx - 22, y: ny + 40 }, { x: nx - 22, y: ny - 24 }, { x: nx, y: ny - 46 }, { x: nx + 22, y: ny - 24 }, { x: nx + 22, y: ny + 40 }], false);
    g.fillStyle(OBS.seam, 0.06); g.fillCircle(nx, ny, 26);
    councilMask(g, nx, ny, 13, { crack: 0.6 + rng() * 0.4, alpha: 0.8, glow: 0.3 });
    slab(g, nx, ny + 46, 40, 8);
  }
  // The wall foot.
  g.fillStyle(0x05040a, 1); g.fillRect(0, 238, W, 10);
  g.lineStyle(1.6, OBS.edge, 0.55); g.lineBetween(0, 248, W, 248);

  // The floor.
  glassFloor(g, 0, 248, W, H - 248, 48, rng);
  // The throne's light lies down the floor like a reflection on water.
  for (let i = 0; i < 5; i++) { g.fillStyle(OBS.seam, 0.04); g.fillEllipse(480, 360 + i * 30, 120 - i * 14, 260 - i * 30); }
  // The runner: one long dark tongue of polished glass from the stair to the door, inlaid in violet.
  g.fillStyle(0x050409, 0.9); g.fillRect(414, 290, 132, H - 290);
  g.lineStyle(2, OBS.seam, 0.45); g.lineBetween(414, 290, 414, H); g.lineBetween(546, 290, 546, H);
  g.lineStyle(1, OBS.seamLit, 0.35); g.lineBetween(420, 290, 420, H); g.lineBetween(540, 290, 540, H);
  for (let y = 320; y < H; y += 64) {
    g.fillStyle(OBS.facet, 0.9);
    g.fillPoints([{ x: 480, y: y - 16 }, { x: 498, y }, { x: 480, y: y + 16 }, { x: 462, y }], true);
    g.lineStyle(1, OBS.edge, 0.5);
    g.strokePoints([{ x: 480, y: y - 16 }, { x: 498, y }, { x: 480, y: y + 16 }, { x: 462, y }], true);
    g.fillStyle(OBS.seamLit, 0.8); g.fillCircle(480, y, 2.2);
  }
  // Old cracks — faint now; the backdrop lights them.
  for (const c of FLOOR_CRACKS) seam(g, c, 0.8, 0.25);
  // What act I left: the Host's broken tower-shields and spent shards along the walls.
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1;
    const sx = side < 0 ? 40 + rng() * 140 : W - 40 - rng() * 140;
    const sy = 300 + rng() * 300;
    if (rng() < 0.5) {
      shard(g, sx, sy, 12 + rng() * 14, 14 + rng() * 22, (rng() - 0.5) * 12, rng() * 0.4);
    } else {
      // A fallen tower-shield: a long slab of glass on its side.
      g.fillStyle(0x000000, 0.35); g.fillEllipse(sx, sy + 4, 54, 12);
      g.fillStyle(OBS.glass, 1); g.fillRect(sx - 24, sy - 8, 48, 12);
      g.fillStyle(OBS.facet, 1); g.fillRect(sx - 24, sy - 8, 48, 4);
      g.lineStyle(1, OBS.edge, 0.4); g.strokeRect(sx - 24, sy - 8, 48, 12);
      seam(g, [{ x: sx - 10, y: sy - 8 }, { x: sx - 4, y: sy - 2 }, { x: sx - 12, y: sy + 4 }], 0.8, 0.6);
    }
  }
  // Pillars down both walls.
  for (const px of [20, W - 20]) {
    slab(g, px, H, 46, H - 40, rng, 3);
    g.fillStyle(OBS.seam, 0.08); g.fillRect(px - 30, 0, 60, H);
  }
  for (const px of [150, W - 150]) {
    g.fillStyle(0x000000, 0.4); g.fillEllipse(px, 252, 70, 14);
    slab(g, px, 250, 44, 230, rng, 2);
    g.fillStyle(OBS.seam, 0.25); g.fillCircle(px, 120, 18);
    g.fillStyle(OBS.seamLit, 0.9); g.fillCircle(px, 120, 4);
  }
  // The dais: three steps down from the throne.
  slab(g, 480, 236, 300, 28);
  slab(g, 480, 262, 356, 26);
  slab(g, 480, 290, 412, 28);
  for (const [w, yy] of [[300, 210], [356, 238], [412, 264]] as const) {
    g.lineStyle(1, OBS.seam, 0.35); g.lineBetween(480 - w / 2 + 6, yy, 480 + w / 2 - 6, yy);
  }
  // The stumps of the Aegis dome's ribs, standing round the throne where it was rooted.
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    shard(g, 480 + Math.cos(a) * 150, 228 + Math.sin(a) * 30 + 6, 12, 18 + (i % 2) * 10, Math.cos(a) * 6, 0.3);
  }
  throne(g, THRONE.x, THRONE.y, THRONE.s, { sword: false, glow: 0.8 });
  // The empty slot in the throne's back, still glowing where the blade stood.
  g.fillStyle(OBS.seam, 0.35); g.fillEllipse(THRONE.x, THRONE.y - 128 * THRONE.s, 10, 26);
  g.fillStyle(OBS.seamLit, 0.9); g.fillRect(THRONE.x - 1.5, THRONE.y - 140 * THRONE.s, 3, 22);
  // Edges sink into dark.
  for (let i = 0; i < 6; i++) {
    g.fillStyle(0x000000, 0.07);
    g.fillRect(0, 0, 30 + i * 18, H); g.fillRect(W - 30 - i * 18, 0, 30 + i * 18, H);
    g.fillRect(0, H - 14 - i * 10, W, 14 + i * 10);
  }
}

/** Per-frame hall life: the runner breathing, motes rising, and starlight in the old cracks once the Aegis is broken. */
export function hallLife(g: G, tMs: number, W: number, H: number, broken: number): void {
  const t = tMs / 1000;
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.1);
  seam(g, [{ x: 480, y: 300 }, { x: 480, y: H }], 0.8, 0.25 + pulse * 0.15, pulse * 0.4);
  if (broken > 0) {
    for (let i = 0; i < FLOOR_CRACKS.length; i++) {
      const c = FLOOR_CRACKS[i];
      const reach = Math.max(2, Math.round(c.length * clampN(broken * 1.4 - i * 0.05, 0, 1)));
      seam(g, c.slice(0, reach), 1.1, 0.6 * broken, 0.4 + 0.4 * Math.sin(t * 2 + i), STAR);
    }
  }
  for (let i = 0; i < 22; i++) {
    const sx = (i * 173.7) % W;
    const k = ((t * (0.05 + (i % 5) * 0.012) + i * 0.137) % 1);
    const sy = H - k * (H - 120);
    g.fillStyle(i % 4 === 0 && broken > 0 ? STAR : OBS.seamLit, 0.35 * Math.sin(k * Math.PI));
    g.fillCircle(sx + Math.sin(t + i) * 8, sy, i % 3 === 0 ? 1.6 : 1);
  }
}

// ── The entry: THE CRACKED MASK ──────────────────────────────────────

/** Length of the rising (ms). */
export const ENTRY_MS = 7600;
const T_CRACK = 800, T_RISE = 1500, T_REACH = 2500, T_PULL = 2800, T_FREE = 3350, T_REST = 3750;
const T_FOLD = 3900, T_ARM = 4800, T_WALK = 5000;

/** Where the entry paints him at `tm` ms. */
function entryPos(tm: number): Pt & { walking: boolean } {
  if (tm < T_RISE) return { ...SEAT, walking: false };
  if (tm < T_WALK) {
    const k = smooth((tm - T_RISE) / (T_REACH - T_RISE));
    return { x: SEAT.x, y: SEAT.y + 14 * k, walking: false };
  }
  const k = smooth((tm - T_WALK) / (ENTRY_MS - 300 - T_WALK));
  return { x: SEAT.x + (STAIR_FOOT.x - SEAT.x) * k, y: SEAT.y + 14 + (STAIR_FOOT.y - SEAT.y - 14) * k, walking: k > 0 && k < 1 };
}

/** The dome of act I, cracked, standing over the throne — and folding, `fold` 0–1, into a shield at `to`. */
function foldingDome(g: G, tm: number, fold: number, to: Pt): void {
  const cx = THRONE.x, cy = THRONE.y - 50;
  const t = tm / 1000;
  const N = 9;
  for (let i = 0; i < N; i++) {
    const a0 = Math.PI + (i / N) * Math.PI, a1 = Math.PI + ((i + 1) / N) * Math.PI;
    const am = (a0 + a1) / 2;
    // Each pane swings in, shrinks and flies to his arm in turn.
    const k = smooth(fold * 1.6 - (i / N) * 0.6);
    const r = 190 * (1 - k * 0.85);
    const ox = cx + (to.x - cx) * k, oy = cy + (to.y - cy) * k;
    const p0 = { x: ox + Math.cos(a0 + k * 1.2) * r, y: oy + Math.sin(a0 + k * 1.2) * r * 0.72 };
    const p1 = { x: ox + Math.cos(a1 + k * 1.2) * r, y: oy + Math.sin(a1 + k * 1.2) * r * 0.72 };
    const pi = { x: ox + Math.cos(am + k * 1.2) * r * 0.35, y: oy + Math.sin(am + k * 1.2) * r * 0.25 };
    const al = (1 - k * 0.6) * (fold > 0 ? 1 : 0.5);
    g.fillStyle(OBS.seam, 0.08 * al); g.fillTriangle(p0.x, p0.y, p1.x, p1.y, pi.x, pi.y);
    g.lineStyle(1.4, OBS.seamLit, 0.5 * al); g.lineBetween(p0.x, p0.y, p1.x, p1.y);
    g.lineStyle(1, OBS.edge, 0.3 * al); g.lineBetween(p0.x, p0.y, pi.x, pi.y);
    if (fold > 0 && k > 0.05 && k < 0.95) { g.fillStyle(0xffffff, 0.7); g.fillCircle(p0.x, p0.y, 1.6); }
  }
  if (fold === 0) {
    // Hairline cracks across the dome where act I broke it.
    seam(g, [{ x: cx - 120, y: cy - 90 }, { x: cx - 80, y: cy - 60 }, { x: cx - 92, y: cy - 20 }], 1, 0.5 + 0.2 * Math.sin(t * 3), 0.3);
    seam(g, [{ x: cx + 60, y: cy - 120 }, { x: cx + 96, y: cy - 82 }, { x: cx + 140, y: cy - 70 }], 1, 0.5, 0.3);
  }
}

/** Under the fighters: the throne (with its sword until he draws it), the dome folding, and the King himself. */
export function entryGround(g: G, k: BossEntryKit): void {
  const tm = k.t;
  const pos = entryPos(tm);
  // The throne with its hilt, painted over the act's floor until the blade comes free.
  if (tm < T_FREE) throne(g, THRONE.x, THRONE.y, THRONE.s, { sword: false, glow: 0.8 + 0.2 * Math.sin(tm / 200), t: tm / 1000 });
  if (tm < T_PULL) {
    const s = THRONE.s;
    const hy = THRONE.y - 150 * s;
    g.fillStyle(OBS.sheen, 1); g.fillRect(THRONE.x - 3 * s, hy - 34 * s, 6 * s, 34 * s);
    g.fillStyle(OBS.edge, 1); g.fillRect(THRONE.x - 17 * s, hy - 6 * s, 34 * s, 5 * s);
    g.fillStyle(OBS.seam, 0.35 + (tm > T_REACH ? 0.4 : 0)); g.fillCircle(THRONE.x, hy - 38 * s, 9 * s);
    g.fillStyle(OBS.seamLit, 1); g.fillCircle(THRONE.x, hy - 38 * s, 3.6 * s);
  }
  // The dome, until it has folded onto his arm.
  const fold = clampN((tm - T_FOLD) / (T_ARM - T_FOLD), 0, 1);
  const armPt = { x: pos.x + 40, y: pos.y + 6 };
  if (tm < T_ARM) foldingDome(g, tm, fold, armPt);

  // The King.
  const seated = tm < T_RISE ? 1 : 1 - smooth((tm - T_RISE) / 700);
  const crack = clampN((tm - T_CRACK) / 600, 0, 1) * 0.62;
  let pose: SwordPose = 'rest';
  let hand: Pt | undefined;
  let bladeA = Math.PI / 2 + 0.6;
  let bladeOut = 1;
  let noSword = tm < T_REACH;
  let swing: Swing | null = null;
  const hiltTop = { x: THRONE.x, y: THRONE.y - 150 * THRONE.s - 30 };
  if (tm >= T_REACH && tm < T_FREE) {
    // The reach and the pull: the hand to the hilt, then up and out; the blade still in the throne.
    noSword = false;
    const up = smooth((tm - T_PULL) / (T_FREE - T_PULL));
    const reach = smooth((tm - T_REACH) / (T_PULL - T_REACH));
    hand = {
      x: pos.x + 30 + (hiltTop.x - pos.x - 30) * reach + up * 40,
      y: pos.y - 30 + (hiltTop.y - pos.y + 30) * reach - up * 38,
    };
    const slot = { x: THRONE.x, y: THRONE.y - 100 * THRONE.s };
    bladeA = Math.atan2(slot.y - hand.y, slot.x - hand.x);
    bladeOut = clampN(Math.hypot(slot.x - hand.x, slot.y - hand.y) / 132, 0.1, 1);
  } else if (tm >= T_FREE && tm < T_REST) {
    noSword = false;
    pose = 'rest';
    swing = { from: -Math.PI / 2 - 0.4, to: Math.PI / 2 + 0.6, at: k.time - (tm - T_FREE), ms: 360, r: 130 };
  } else if (tm >= T_REST) {
    noSword = false;
    // A salute at the foot of the stair: the blade lifted before his face.
    pose = tm > ENTRY_MS - 1100 && tm < ENTRY_MS - 350 ? 'raised' : 'rest';
  }
  const walk = pos.walking ? (tm - T_WALK) * 0.09 : 0;
  drawKing(g, pos.x, pos.y, {
    t: k.time, face: Math.PI / 2, swordA: bladeA, pose, swing, shield: tm >= T_ARM ? 'arm' : 'none',
    twoHanded: false, crack, split: 0, crouch: tm > T_RISE - 200 && tm < T_RISE + 300 ? 1 : 0, air: 0, braced: tm >= T_ARM && tm < T_ARM + 500 ? 1 - (tm - T_ARM) / 500 : 0,
    crownFlare: 0, walk, hurt: false, blockAt: -1e9, backAt: -1e9, hand, bladeOut, seated, noSword,
  });
}

/** Over everything: starlight from the mask, the flash of the drawn blade, glass falling from the shaking roof. */
export function entryOver(g: G, k: BossEntryKit): void {
  const tm = k.t;
  const t = k.time / 1000;
  const pos = entryPos(tm);
  // Glass flakes from the roof while the hall shakes.
  const shaking = tm < T_RISE + 600 || (tm > T_WALK && tm < ENTRY_MS - 400);
  if (shaking) {
    for (let i = 0; i < 26; i++) {
      const sx = (i * 97.3 + 40) % k.W;
      const fall = ((tm / 1000) * (180 + (i % 7) * 40) + i * 53) % (k.H + 40);
      g.fillStyle(i % 3 ? OBS.edge : OBS.seamLit, 0.55);
      g.fillTriangle(sx, fall, sx + 3, fall + 5, sx - 1, fall + 7);
    }
  }
  // The mask cracks: starlight through it, in rays.
  const crackK = clampN((tm - T_CRACK) / 500, 0, 1) * (1 - clampN((tm - T_REACH) / 1400, 0, 0.7));
  if (crackK > 0) {
    const hx = pos.x, hy = pos.y - 62 + (tm < T_RISE ? 6 : 0);
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.35 + Math.sin(t * 0.7 + i) * 0.05;
      const l = (90 + 70 * Math.sin(i * 1.9 + t * 2)) * crackK;
      g.fillStyle(OBS.star, 0.1 * crackK);
      g.fillTriangle(hx - 3, hy, hx + 3, hy, hx + Math.cos(a) * l, hy + Math.sin(a) * l);
    }
    if (tm < T_CRACK + 300) { g.fillStyle(OBS.starCore, 0.6 * (1 - (tm - T_CRACK) / 300)); g.fillCircle(hx + 4, hy - 4, 22); }
  }
  // The blade comes free: a flash along it and a ring of glass dust.
  if (tm >= T_FREE - 60 && tm < T_FREE + 600) {
    const a = 1 - (tm - T_FREE + 60) / 660;
    g.fillStyle(OBS.seamLit, 0.25 * a); g.fillCircle(THRONE.x + 30, THRONE.y - 130, 90 * (1.2 - a));
    g.lineStyle(3, 0xffffff, 0.8 * a); g.strokeCircle(THRONE.x + 30, THRONE.y - 130, 120 * (1.1 - a));
  }
  // The shield seats on his arm: a ring of violet light.
  if (tm >= T_ARM - 40 && tm < T_ARM + 500) {
    const a = 1 - (tm - T_ARM + 40) / 540;
    g.lineStyle(3, OBS.seamLit, a); g.strokeEllipse(pos.x + 40, pos.y - 10, 120 * (1.4 - a), 80 * (1.4 - a));
  }
  // A cinema grade: the edges in dark, the throne end lit.
  for (let i = 0; i < 4; i++) {
    g.fillStyle(0x000000, 0.06);
    g.fillRect(0, 0, 60 + i * 40, k.H); g.fillRect(k.W - 60 - i * 40, 0, 60 + i * 40, k.H);
  }
  const lightK = 0.5 + 0.5 * Math.sin(t * 1.3);
  g.fillStyle(lit(OBS.seam, 0.3), 0.03 + lightK * 0.02); g.fillEllipse(THRONE.x, THRONE.y - 40, 520, 300);
}
