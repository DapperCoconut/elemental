import type Phaser from 'phaser';
import type { Fighter } from '../../../entities/Fighter';

/**
 * Shared plumbing and street-furniture for the unrest fights: the mob at the edge of the ring, a rioter,
 * fire. Every rule paints its own centrepiece; these are the things all of them have in common.
 */

type G = Phaser.GameObjects.Graphics;

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;
export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** Seconds since the last call, clamped so a hitch cannot fast-forward a fuse. */
export function frameClock(): (time: number) => number {
  let last = -1;
  return (time) => {
    const dt = last < 0 ? 0 : Math.max(0, Math.min(0.1, (time - last) / 1000));
    last = time;
    return dt;
  };
}

export const RIOT = {
  coat: [0x4a3a34, 0x3a4048, 0x54402c, 0x403446, 0x35443a],
  skin: [0xd8a884, 0xb88462, 0x8a5c40, 0xe8c4a0],
  rag: 0xb83a2a,
  torch: 0xffa040,
  torchLit: 0xffe08a,
  wood: 0x6a4a2c,
  woodDark: 0x3a2814,
  iron: 0x4a4a52,
  soot: 0x14100e,
};

/**
 * One rioter, feet at (x, y): hunched coat, a rag over the face, one arm up. `arm` 0–1 raises the arm (a
 * wind-up); `torch` puts a lit brand in the raised hand.
 */
export function rioter(g: G, x: number, y: number, s: number, seed: number, t: number, o: { arm?: number; torch?: boolean; face?: number } = {}): void {
  const coat = RIOT.coat[seed % RIOT.coat.length];
  const skin = RIOT.skin[(seed >> 2) % RIOT.skin.length];
  const bob = Math.sin(t / 180 + seed) * 1.5 * s;
  const face = o.face ?? 1;
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 1, 18 * s, 6 * s);
  // Legs.
  g.fillStyle(0x221c1a, 1);
  g.fillRect(x - 5 * s, y - 9 * s, 4 * s, 9 * s);
  g.fillRect(x + 1 * s, y - 9 * s, 4 * s, 9 * s);
  // Coat.
  g.fillStyle(coat, 1); g.fillRoundedRect(x - 8 * s, y - 25 * s + bob, 16 * s, 18 * s, 4 * s);
  g.fillStyle(0x000000, 0.18); g.fillRect(x - 8 * s, y - 13 * s + bob, 16 * s, 3 * s);
  // Head, with the rag tied over nose and mouth.
  g.fillStyle(skin, 1); g.fillCircle(x, y - 30 * s + bob, 6 * s);
  g.fillStyle(RIOT.rag, 1); g.fillRect(x - 6 * s, y - 30 * s + bob, 12 * s, 5 * s);
  g.fillTriangle(x - 6 * s * face, y - 29 * s + bob, x - 11 * s * face, y - 26 * s + bob, x - 6 * s * face, y - 25 * s + bob);
  g.fillStyle(0x0c0a0a, 1);
  g.fillCircle(x - 2 * s + face * s, y - 32 * s + bob, 1 * s); g.fillCircle(x + 2 * s + face * s, y - 32 * s + bob, 1 * s);
  // The raised arm.
  const lift = o.arm ?? 0.5;
  const hx = x + face * (8 + 4 * lift) * s, hy = y - (20 + 16 * lift) * s + bob;
  g.lineStyle(3.2 * s, coat, 1); g.lineBetween(x + face * 6 * s, y - 22 * s + bob, hx, hy);
  g.fillStyle(skin, 1); g.fillCircle(hx, hy, 2.4 * s);
  if (o.torch) {
    g.lineStyle(2 * s, RIOT.woodDark, 1); g.lineBetween(hx, hy, hx + face * 2 * s, hy - 12 * s);
    flame(g, hx + face * 2 * s, hy - 13 * s, 6 * s, t + seed * 37);
  }
}

/** A lick of flame, base at (x, y). */
export function flame(g: G, x: number, y: number, r: number, t: number): void {
  const f = Math.sin(t / 70) * 0.18 + Math.sin(t / 31) * 0.1;
  g.fillStyle(0xff5a1a, 0.28); g.fillCircle(x, y - r * 0.4, r * 1.7);
  g.fillStyle(0xff6a1e, 0.95);
  g.fillTriangle(x - r * 0.75, y, x + r * 0.75, y, x + r * f * 2, y - r * (2.2 + f));
  g.fillCircle(x, y - r * 0.15, r * 0.75);
  g.fillStyle(RIOT.torch, 1);
  g.fillTriangle(x - r * 0.45, y, x + r * 0.45, y, x - r * f, y - r * (1.5 + f));
  g.fillStyle(RIOT.torchLit, 1); g.fillCircle(x, y - r * 0.2, r * 0.32);
}

/**
 * The mob pressed up against the ring: two ragged ranks along the top and bottom rails, torches and
 * fists up, swaying. `heat` 0–1 makes them surge (they lean in and the torches flare).
 */
export function drawMob(g: G, W: number, H: number, top: number, time: number, heat = 0): void {
  for (const row of [0, 1]) {
    const y = row === 0 ? top + 14 : H - 6;
    const n = 26;
    for (let i = 0; i < n; i++) {
      const seed = i * 7 + row * 101;
      const x = 18 + (i + 0.5) * ((W - 36) / n) + Math.sin(seed) * 5;
      const sway = Math.sin(time / (420 + (seed % 5) * 60) + seed) * (2 + heat * 4);
      const yy = y + Math.abs(Math.sin(time / 230 + seed)) * heat * -5;
      const s = 0.62 + (seed % 3) * 0.05;
      const coat = RIOT.coat[seed % RIOT.coat.length];
      g.fillStyle(coat, 0.95); g.fillRoundedRect(x - 6 * s + sway, yy - 20 * s, 12 * s, 16 * s, 3);
      g.fillStyle(RIOT.skin[seed % RIOT.skin.length], 0.95); g.fillCircle(x + sway, yy - 24 * s, 5 * s);
      g.fillStyle(RIOT.rag, 0.9); g.fillRect(x - 5 * s + sway, yy - 24 * s, 10 * s, 4 * s);
      if (seed % 4 === 0) {
        g.lineStyle(2, RIOT.woodDark, 1); g.lineBetween(x + sway + 6 * s, yy - 16 * s, x + sway + 9 * s, yy - 34 * s);
        flame(g, x + sway + 9 * s, yy - 35 * s, 3.4 + heat * 1.6, time + seed * 91);
      } else if (seed % 4 === 1) {
        g.lineStyle(2.4, coat, 1); g.lineBetween(x + sway - 5 * s, yy - 16 * s, x + sway - 8 * s, yy - 30 * s - Math.abs(sway));
        g.fillStyle(RIOT.skin[seed % RIOT.skin.length], 1); g.fillCircle(x + sway - 8 * s, yy - 31 * s - Math.abs(sway), 2.2);
      }
    }
    // The rail they lean on.
    g.fillStyle(RIOT.woodDark, 0.9); g.fillRect(12, y - 5, W - 24, 4);
    g.fillStyle(RIOT.wood, 0.9); g.fillRect(12, y - 6, W - 24, 2);
  }
}

/** A patch of burning ground: scorch, a bed of embers, a ring of tongues. `k` 0–1 is how much life is left. */
export function firePatch(g: G, x: number, y: number, r: number, time: number, k: number, seed: number): void {
  g.fillStyle(RIOT.soot, 0.55); g.fillEllipse(x, y, r * 2.1, r * 1.5);
  g.fillStyle(0xff5a1a, 0.16 + 0.1 * k); g.fillEllipse(x, y, r * 2, r * 1.4);
  g.fillStyle(0xffa040, 0.14 * k); g.fillEllipse(x, y, r * 1.3, r * 0.9);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + seed;
    const rr = r * (0.35 + ((i * 37 + seed * 11) % 10) / 16);
    const fx = x + Math.cos(a) * rr, fy = y + Math.sin(a) * rr * 0.68;
    flame(g, fx, fy, (5 + (i % 3) * 2) * (0.5 + 0.5 * k), time + i * 173 + seed * 50);
  }
  for (let i = 0; i < 6; i++) {
    const p = ((time / 900 + i / 6 + seed) % 1);
    g.fillStyle(0xffd27a, (1 - p) * 0.8 * k);
    g.fillCircle(x + Math.sin(i * 2.4 + seed) * r * 0.7, y - p * 46, 1.6);
  }
}
