import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, lit, type G } from '../../../../../art/IsleArt';
import { BRASS, BRASS_DARK, BRASS_LIT, CHALK, CHALK_DIM, GOLD, SLATE_DARK, SLATE_DEEP, SIDE_NPC, SIDE_PLAYER } from '../palette';

/**
 * Small shared parts for the Arcane Court's Fallen Five: the ember-gold eye every Fallen wears, the
 * half-health test each rule turns on, the side colours, and the HUD's slate — a little lecture
 * slate in a brass frame, chalk-scuffed, that every one of the five chalks its counters onto, so
 * the five read as one wrong term at the Academy.
 */

/** Every Fallen's ember-gold eye. */
export const EYE = 0xffa040;

export type Side = 'player' | 'npc';

/** Below half health: the turn every one of the five rules takes. */
export const pastHalf = (f: Fighter): boolean => f.hp < f.maxHp * 0.5;

/** A side's colour (the court's convention: you cyan, the foe vermilion). */
export const sideColor = (s: Side | null): number => (s === 'player' ? SIDE_PLAYER : s === 'npc' ? SIDE_NPC : CHALK);

/**
 * A lecture slate hung under the HUD line: a brass frame with corner rivets, the dark slate inside
 * with a few old chalk smudges, centred on `x`. The five gimmicks chalk their meters on top of it.
 */
export function slatePlate(g: G, x: number, y: number, w: number, h: number): void {
  const x0 = x - w / 2;
  g.fillStyle(0x000000, 0.35); g.fillRect(x0 + 3, y + 3, w, h);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x0, y, w, h);
  g.fillStyle(BRASS, 1); g.fillRect(x0 + 1, y + 1, w - 2, h - 2);
  g.fillStyle(BRASS_LIT, 0.8); g.fillRect(x0 + 1, y + 1, w - 2, 1.5);
  g.fillStyle(SLATE_DEEP, 1); g.fillRect(x0 + 4, y + 4, w - 8, h - 8);
  g.fillStyle(SLATE_DARK, 0.55); g.fillRect(x0 + 5, y + 5, w - 10, (h - 10) * 0.45);
  // Old chalk, wiped but never gone.
  g.lineStyle(1, CHALK_DIM, 0.12);
  for (let k = 0; k < 5; k++) { const sx = x0 + 10 + ((k * 37) % (w - 20)); g.lineBetween(sx, y + h - 7, sx + 12, y + 7 + (k % 3) * 2); }
  for (const [rx, ry] of [[x0 + 3, y + 3], [x0 + w - 3, y + 3], [x0 + 3, y + h - 3], [x0 + w - 3, y + h - 3]]) {
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(rx, ry, 2.2); g.fillStyle(BRASS_LIT, 1); g.fillCircle(rx - 0.5, ry - 0.5, 1);
  }
}

/** A chalk ring drawn as dashes (a sigil only half-committed to the slate). */
export function dashedRing(g: G, x: number, y: number, r: number, color: number, a: number, w = 1.5, n = 28, squash = 1, rot = 0): void {
  g.lineStyle(w, color, a);
  for (let i = 0; i < n; i++) {
    const a0 = rot + (i / n) * Math.PI * 2, a1 = a0 + (Math.PI / n) * 1.1;
    g.lineBetween(x + Math.cos(a0) * r, y + Math.sin(a0) * r * squash, x + Math.cos(a1) * r, y + Math.sin(a1) * r * squash);
  }
}

/** A progress arc round a point, from twelve o'clock clockwise, `k` 0..1. */
export function progressArc(g: G, x: number, y: number, r: number, k: number, color: number, a: number, w = 3): void {
  if (k <= 0) return;
  g.lineStyle(w, color, a); g.beginPath(); g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + clampK(k) * Math.PI * 2, false); g.strokePath();
}

const clampK = (k: number): number => Math.max(0, Math.min(1, k));

/** A quill feather (vane and shaft), `rot` radians, `s` its length. */
export function feather(g: G, x: number, y: number, s: number, rot: number, color: number, a = 1): void {
  const c = Math.cos(rot), sn = Math.sin(rot);
  const p = (u: number, v: number) => ({ x: x + u * c - v * sn, y: y + u * sn + v * c });
  const tip = p(s * 0.5, 0), base = p(-s * 0.5, 0);
  for (let k = 0; k < 5; k++) {
    const u0 = -s * 0.3 + (k / 5) * s * 0.75, u1 = u0 + s * 0.2;
    const w = s * 0.16 * Math.sin(((k + 0.5) / 5) * Math.PI);
    const a1 = p(u0, 0), b1 = p(u1, -w), b2 = p(u1, w);
    g.fillStyle(k % 2 ? color : lit(color, 0.25), a);
    g.fillTriangle(a1.x, a1.y, b1.x, b1.y, p(u1 + s * 0.08, 0).x, p(u1 + s * 0.08, 0).y);
    g.fillStyle(k % 2 ? dim(color, 0.12) : color, a);
    g.fillTriangle(a1.x, a1.y, b2.x, b2.y, p(u1 + s * 0.08, 0).x, p(u1 + s * 0.08, 0).y);
  }
  g.lineStyle(1, dim(color, 0.35), a); g.lineBetween(base.x, base.y, tip.x, tip.y);
}

/** A heart: two lobes and a point. */
export function heart(g: G, x: number, y: number, s: number, color: number, a = 1): void {
  g.fillStyle(color, a);
  g.fillCircle(x - s * 0.5, y - s * 0.2, s * 0.55);
  g.fillCircle(x + s * 0.5, y - s * 0.2, s * 0.55);
  g.fillTriangle(x - s * 1.02, y - s * 0.05, x + s * 1.02, y - s * 0.05, x, y + s * 1.05);
}

/** A heart in outline only. */
export function heartLine(g: G, x: number, y: number, s: number, color: number, a = 1, w = 1.5): void {
  g.lineStyle(w, color, a);
  g.beginPath(); g.arc(x - s * 0.5, y - s * 0.2, s * 0.55, Math.PI * 0.8, Math.PI * 2, false); g.strokePath();
  g.beginPath(); g.arc(x + s * 0.5, y - s * 0.2, s * 0.55, Math.PI, Math.PI * 2.2, false); g.strokePath();
  g.lineBetween(x - s * 1.02, y - s * 0.05, x, y + s * 1.05);
  g.lineBetween(x + s * 1.02, y - s * 0.05, x, y + s * 1.05);
}

/** A gold pip: a lit five-point mark or an empty chalk ring. */
export function pip(g: G, x: number, y: number, on: boolean, color: number = GOLD): void {
  if (on) { g.fillStyle(color, 1); g.fillCircle(x, y, 4.5); g.fillStyle(lit(color, 0.5), 1); g.fillCircle(x - 1, y - 1, 1.8); }
  else { g.lineStyle(1.2, CHALK_DIM, 0.7); g.strokeCircle(x, y, 4); }
}
