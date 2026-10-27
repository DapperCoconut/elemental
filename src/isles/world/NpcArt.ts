import type { NpcLook } from '../IslesTypes';
import { dim, lit, type G } from '../art/IsleArt';

/**
 * The Isles' people: a round body, two floating ball hands, tracking eyes, a hat and a few
 * traits — the same build as the fighters, so townsfolk and champions read as one world.
 * Drawn in world space every frame they are on screen; also used for dialogue portraits.
 */

export interface NpcPose {
  /** World position of the feet. */
  x: number;
  y: number;
  /** Seconds, for idle bob and blink. */
  t: number;
  /** Radians the eyes look toward. */
  look: number;
  moving: boolean;
  /** Talking: the mouth opens and the hands gesture. */
  talking?: boolean;
  /** Overall scale multiplier (portraits draw big). */
  scale?: number;
  /** Cowering / hiding (anarchy state, a scared kid). */
  cower?: boolean;
}

export function drawNpc(g: G, L: NpcLook, p: NpcPose): void {
  const s = (L.size ?? 1) * (p.scale ?? 1);
  const R = 14 * s;
  const bob = p.moving ? Math.abs(Math.sin(p.t * 10)) * 2.4 * s : Math.sin(p.t * 2.1) * 0.9 * s;
  const cx = p.x;
  const cy = p.y - R - 6 * s - bob + (p.cower ? 4 * s : 0);
  const hand = L.hand ?? dim(L.body, 0.25);
  const traits = L.traits ?? [];

  // Shadow
  g.fillStyle(0x000000, 0.3);
  g.fillEllipse(p.x, p.y, R * 2.1, R * 0.65);

  // Back items (pack, satchel strap behind)
  if (traits.includes('pack')) {
    g.fillStyle(dim(L.accent, 0.35), 1); g.fillRoundedRect(cx - R * 1.05, cy - R * 0.6, R * 0.8, R * 1.3, 4 * s);
    g.fillStyle(0x9aa0a8, 1); g.fillCircle(cx - R * 0.9, cy - R * 0.75, 3.2 * s); g.fillCircle(cx - R * 0.55, cy - R * 0.9, 2.6 * s);
  }

  // Body
  g.fillStyle(dim(L.body, 0.45), 1); g.fillCircle(cx, cy, R + 1.6 * s);
  g.fillStyle(L.body, 1); g.fillCircle(cx, cy, R);
  g.fillStyle(lit(L.body, 0.2), 0.75); g.fillCircle(cx - R * 0.32, cy - R * 0.38, R * 0.42);

  // Clothing bits on the body
  if (traits.includes('apron')) {
    g.fillStyle(lit(L.accent, 0.55), 1);
    g.fillRoundedRect(cx - R * 0.55, cy + R * 0.05, R * 1.1, R * 0.85, 3 * s);
    g.lineStyle(1.4 * s, dim(L.accent, 0.2), 1); g.lineBetween(cx - R * 0.5, cy + R * 0.05, cx - R * 0.2, cy - R * 0.6);
    g.lineBetween(cx + R * 0.5, cy + R * 0.05, cx + R * 0.2, cy - R * 0.6);
  }
  if (traits.includes('scarf')) {
    g.fillStyle(L.accent, 1); g.fillRoundedRect(cx - R * 0.85, cy + R * 0.12, R * 1.7, R * 0.32, 4 * s);
    g.fillRect(cx + R * 0.3, cy + R * 0.3, R * 0.28, R * 0.7);
  }
  if (traits.includes('satchel')) {
    g.lineStyle(2 * s, dim(L.accent, 0.3), 1); g.lineBetween(cx - R * 0.7, cy - R * 0.6, cx + R * 0.6, cy + R * 0.6);
    g.fillStyle(dim(L.accent, 0.2), 1); g.fillRoundedRect(cx + R * 0.35, cy + R * 0.35, R * 0.7, R * 0.55, 3 * s);
  }
  if (traits.includes('brand')) {
    // The King's brand burned on the shoulder.
    g.lineStyle(1.6 * s, 0xff7a2f, 0.9);
    g.beginPath(); g.arc(cx + R * 0.45, cy + R * 0.2, R * 0.22, -1.1, 4.2, false); g.strokePath();
  }
  if (traits.includes('bandage')) {
    g.fillStyle(0xe8e0cc, 1); g.fillRect(cx - R * 0.95, cy - R * 0.2, R * 0.5, R * 0.2);
  }

  // Face
  const blink = (p.t * 1000 + (L.body % 997)) % 3600 < 120;
  const eyeC = L.eye ?? 0xf6f2ea;
  const lx = Math.cos(p.look) * R * 0.18, ly = Math.sin(p.look) * R * 0.12;
  const ex = R * 0.33, ey = cy - R * 0.12;
  if (traits.includes('mask')) {
    g.fillStyle(0x1a1a1a, 0.9); g.fillRoundedRect(cx - R * 0.7, ey - R * 0.22, R * 1.4, R * 0.42, 4 * s);
  }
  for (const side of [-1, 1]) {
    if (side === 1 && traits.includes('eyepatch')) {
      g.fillStyle(0x111111, 1); g.fillCircle(cx + ex, ey, R * 0.2);
      g.lineStyle(1.3 * s, 0x111111, 1); g.lineBetween(cx - R * 0.9, ey - R * 0.4, cx + R * 0.9, ey - R * 0.05);
      continue;
    }
    if (blink) {
      g.lineStyle(1.6 * s, dim(L.body, 0.6), 1); g.lineBetween(cx + side * ex - R * 0.12, ey, cx + side * ex + R * 0.12, ey);
    } else {
      g.fillStyle(eyeC, 1); g.fillCircle(cx + side * ex, ey, R * 0.19);
      g.fillStyle(0x15121a, 1); g.fillCircle(cx + side * ex + lx, ey + ly, R * 0.1);
    }
  }
  if (traits.includes('glasses')) {
    g.lineStyle(1.4 * s, 0x2a2a2a, 1);
    g.strokeCircle(cx - ex, ey, R * 0.25); g.strokeCircle(cx + ex, ey, R * 0.25);
    g.lineBetween(cx - ex + R * 0.25, ey, cx + ex - R * 0.25, ey);
  }
  if (traits.includes('beard')) {
    g.fillStyle(lit(L.accent, 0.1), 1);
    g.fillTriangle(cx - R * 0.55, cy + R * 0.1, cx + R * 0.55, cy + R * 0.1, cx, cy + R * 0.95);
    g.fillCircle(cx, cy + R * 0.25, R * 0.48);
  }
  // Mouth
  if (p.talking) {
    const open = Math.abs(Math.sin(p.t * 14)) * R * 0.14 + R * 0.04;
    g.fillStyle(0x2a1010, 1); g.fillEllipse(cx + lx * 0.5, cy + R * 0.32, R * 0.3, open * 2);
  } else if (!traits.includes('beard')) {
    g.lineStyle(1.3 * s, dim(L.body, 0.6), 1);
    g.lineBetween(cx - R * 0.12 + lx * 0.5, cy + R * 0.32, cx + R * 0.12 + lx * 0.5, cy + R * 0.32);
  }
  if (traits.includes('pipe')) {
    g.lineStyle(2 * s, 0x5a3a20, 1); g.lineBetween(cx + R * 0.15, cy + R * 0.32, cx + R * 0.6, cy + R * 0.42);
    g.fillStyle(0x5a3a20, 1); g.fillRect(cx + R * 0.55, cy + R * 0.22, R * 0.2, R * 0.24);
    const puff = (p.t * 0.8) % 1;
    g.fillStyle(0xcccccc, 0.4 * (1 - puff)); g.fillCircle(cx + R * 0.68, cy + R * 0.1 - puff * R, R * 0.12 + puff * R * 0.2);
  }

  // Hat
  drawHat(g, L, cx, cy, R, s, p.t);

  // Hands (in front)
  const sway = p.moving ? Math.sin(p.t * 10) * R * 0.25 : 0;
  const gest = p.talking ? Math.sin(p.t * 5) * R * 0.3 : 0;
  const hands: [number, number][] = [
    [cx - R * 1.15, cy + R * 0.35 + sway - gest],
    [cx + R * 1.15, cy + R * 0.35 - sway],
  ];
  if (p.cower) { hands[0] = [cx - R * 0.45, cy - R * 0.3]; hands[1] = [cx + R * 0.45, cy - R * 0.3]; }
  for (const [hx, hy] of hands) {
    g.fillStyle(dim(hand, 0.4), 1); g.fillCircle(hx, hy, R * 0.32 + 1.2 * s);
    g.fillStyle(hand, 1); g.fillCircle(hx, hy, R * 0.32);
  }
  const [rx, ry] = hands[1];
  if (traits.includes('cane')) {
    g.lineStyle(2.2 * s, 0x3a2614, 1); g.lineBetween(rx, ry, rx + R * 0.2, p.y);
  }
  if (traits.includes('lantern')) {
    g.lineStyle(1.4 * s, 0x2a2a2a, 1); g.lineBetween(rx, ry, rx, ry + R * 0.4);
    g.fillStyle(0x2a2420, 1); g.fillRect(rx - R * 0.22, ry + R * 0.4, R * 0.44, R * 0.5);
    g.fillStyle(0xffc65a, 0.95); g.fillRect(rx - R * 0.15, ry + R * 0.46, R * 0.3, R * 0.36);
    g.fillStyle(0xffc65a, 0.12); g.fillCircle(rx, ry + R * 0.65, R * 0.9);
  }
  if (traits.includes('rod')) {
    g.lineStyle(1.8 * s, 0x6a4a2a, 1); g.lineBetween(rx, ry, rx + R * 1.2, ry - R * 2.2);
    g.lineStyle(0.8 * s, 0xdddddd, 0.7); g.lineBetween(rx + R * 1.2, ry - R * 2.2, rx + R * 1.5, ry - R * 0.4);
  }
  if (traits.includes('book')) {
    g.fillStyle(0x6a2a2a, 1); g.fillRect(hands[0][0] - R * 0.3, hands[0][1] - R * 0.45, R * 0.6, R * 0.75);
    g.fillStyle(0xe8dcc0, 1); g.fillRect(hands[0][0] - R * 0.24, hands[0][1] - R * 0.4, R * 0.5, R * 0.08);
  }
  if (traits.includes('tool')) {
    g.lineStyle(2 * s, 0x5a3a20, 1); g.lineBetween(rx, ry, rx + R * 0.5, ry - R * 0.9);
    g.fillStyle(0x8a8a90, 1); g.fillRect(rx + R * 0.3, ry - R * 1.15, R * 0.55, R * 0.3);
  }
}

function drawHat(g: G, L: NpcLook, cx: number, cy: number, R: number, s: number, t: number): void {
  const a = L.accent;
  const top = cy - R;
  switch (L.hat ?? 'none') {
    case 'none': return;
    case 'cap':
      g.fillStyle(a, 1); g.fillEllipse(cx, top + R * 0.25, R * 1.7, R * 0.9);
      g.fillStyle(dim(a, 0.3), 1); g.fillEllipse(cx + R * 0.55, top + R * 0.45, R * 0.9, R * 0.3);
      return;
    case 'tophat':
      g.fillStyle(dim(a, 0.3), 1); g.fillEllipse(cx, top + R * 0.15, R * 1.9, R * 0.45);
      g.fillStyle(a, 1); g.fillRect(cx - R * 0.6, top - R * 1.0, R * 1.2, R * 1.15);
      g.fillStyle(lit(a, 0.4), 1); g.fillRect(cx - R * 0.6, top - R * 0.1, R * 1.2, R * 0.2);
      return;
    case 'hood':
      g.fillStyle(a, 1);
      g.beginPath(); g.arc(cx, cy - R * 0.05, R * 1.12, Math.PI * 1.02, Math.PI * 1.98, false); g.closePath(); g.fillPath();
      g.fillTriangle(cx - R * 0.2, top - R * 0.05, cx + R * 0.2, top - R * 0.05, cx + R * 0.1, top - R * 0.55);
      return;
    case 'helmet':
      g.fillStyle(0x8a8f99, 1);
      g.beginPath(); g.arc(cx, cy - R * 0.1, R * 1.06, Math.PI, 0, false); g.closePath(); g.fillPath();
      g.fillStyle(lit(0x8a8f99, 0.3), 1); g.fillRect(cx - R * 0.08, top - R * 0.2, R * 0.16, R * 0.9);
      g.fillStyle(a, 1); g.fillTriangle(cx - R * 0.12, top - R * 0.15, cx + R * 0.12, top - R * 0.15, cx, top - R * 0.75);
      return;
    case 'crown':
      g.fillStyle(0xe8b33a, 1);
      g.fillRect(cx - R * 0.6, top - R * 0.15, R * 1.2, R * 0.35);
      for (const k of [-0.6, -0.2, 0.2, 0.6]) g.fillTriangle(cx + R * (k - 0.17), top - R * 0.12, cx + R * (k + 0.17), top - R * 0.12, cx + R * k, top - R * 0.6);
      g.fillStyle(a, 1); g.fillCircle(cx, top + R * 0.02, R * 0.1);
      return;
    case 'bandana':
      g.fillStyle(a, 1);
      g.beginPath(); g.arc(cx, cy - R * 0.15, R * 1.02, Math.PI * 1.05, Math.PI * 1.95, false); g.closePath(); g.fillPath();
      g.fillTriangle(cx - R * 1.0, top + R * 0.5, cx - R * 1.45, top + R * 0.75, cx - R * 1.3, top + R * 0.3);
      return;
    case 'chef':
      g.fillStyle(0xf4f0e8, 1);
      g.fillRect(cx - R * 0.6, top - R * 0.4, R * 1.2, R * 0.6);
      g.fillCircle(cx - R * 0.35, top - R * 0.55, R * 0.4); g.fillCircle(cx + R * 0.35, top - R * 0.55, R * 0.4); g.fillCircle(cx, top - R * 0.75, R * 0.45);
      return;
    case 'wizard':
      g.fillStyle(a, 1); g.fillEllipse(cx, top + R * 0.15, R * 2, R * 0.45);
      g.fillTriangle(cx - R * 0.75, top + R * 0.1, cx + R * 0.75, top + R * 0.1, cx + R * 0.35, top - R * 1.8);
      g.fillStyle(0xffe08a, 1); g.fillCircle(cx + R * 0.05, top - R * 0.5, R * 0.12);
      return;
    case 'tricorn':
      g.fillStyle(a, 1);
      g.fillTriangle(cx - R * 1.2, top + R * 0.2, cx + R * 1.2, top + R * 0.2, cx, top - R * 0.6);
      g.fillStyle(lit(a, 0.25), 1); g.fillRect(cx - R * 1.0, top + R * 0.1, R * 2.0, R * 0.14);
      return;
    case 'beanie':
      g.fillStyle(a, 1);
      g.beginPath(); g.arc(cx, cy - R * 0.2, R * 1.0, Math.PI, 0, false); g.closePath(); g.fillPath();
      g.fillStyle(lit(a, 0.3), 1); g.fillRect(cx - R, top + R * 0.62, R * 2, R * 0.22);
      g.fillCircle(cx, top - R * 0.25, R * 0.22);
      return;
    case 'veil':
      g.fillStyle(a, 0.85);
      g.beginPath(); g.arc(cx, cy - R * 0.1, R * 1.15, Math.PI * 1.0, 0, false); g.closePath(); g.fillPath();
      g.fillRect(cx - R * 1.15, cy - R * 0.1, R * 0.35, R * 1.0); g.fillRect(cx + R * 0.8, cy - R * 0.1, R * 0.35, R * 1.0);
      return;
    case 'goggles':
      g.fillStyle(0x3a2a20, 1); g.fillRect(cx - R * 0.95, top + R * 0.3, R * 1.9, R * 0.22);
      g.fillStyle(0x2a2a2a, 1); g.fillCircle(cx - R * 0.36, top + R * 0.4, R * 0.26); g.fillCircle(cx + R * 0.36, top + R * 0.4, R * 0.26);
      g.fillStyle(a, 0.9); g.fillCircle(cx - R * 0.36, top + R * 0.4, R * 0.17); g.fillCircle(cx + R * 0.36, top + R * 0.4, R * 0.17);
      return;
    case 'straw':
      g.fillStyle(0xd8b85a, 1); g.fillEllipse(cx, top + R * 0.2, R * 2.5, R * 0.6);
      g.fillStyle(0xc8a04a, 1); g.fillEllipse(cx, top - R * 0.05, R * 1.2, R * 0.75);
      g.fillStyle(a, 1); g.fillRect(cx - R * 0.6, top + R * 0.02, R * 1.2, R * 0.14);
      return;
    case 'mitre':
      g.fillStyle(lit(a, 0.6), 1);
      g.fillTriangle(cx - R * 0.6, top + R * 0.25, cx + R * 0.6, top + R * 0.25, cx, top - R * 1.25);
      g.fillStyle(0xe8b33a, 1); g.fillRect(cx - R * 0.07, top - R * 0.95, R * 0.14, R * 1.15);
      return;
    case 'diving': {
      // The whole head sits inside the bell; the face shows through the round port.
      const brass = 0xc89a4a;
      g.fillStyle(brass, 1); g.fillCircle(cx, cy - R * 0.05, R * 1.18);
      g.fillStyle(dim(brass, 0.25), 1); g.fillRect(cx - R * 1.0, cy + R * 0.75, R * 2.0, R * 0.3);
      g.fillStyle(lit(brass, 0.35), 1); g.fillEllipse(cx - R * 0.55, cy - R * 0.7, R * 0.35, R * 0.2);
      g.fillStyle(0x9ad8e8, 0.35); g.fillCircle(cx, cy, R * 0.66);
      g.lineStyle(3 * s, dim(brass, 0.35), 1); g.strokeCircle(cx, cy, R * 0.68);
      for (const k of [0, 1, 2, 3]) { const an = k * Math.PI / 2 + Math.PI / 4; g.fillStyle(dim(brass, 0.4), 1); g.fillCircle(cx + Math.cos(an) * R * 0.68, cy + Math.sin(an) * R * 0.68, R * 0.08); }
      g.fillStyle(a, 1); g.fillCircle(cx + R * 1.05, cy - R * 0.15, R * 0.22);
      return;
    }
    case 'souwester':
      g.fillStyle(dim(a, 0.2), 1); g.fillEllipse(cx + R * 0.15, top + R * 0.35, R * 2.4, R * 0.5);
      g.fillStyle(a, 1);
      g.beginPath(); g.arc(cx, cy - R * 0.25, R * 0.98, Math.PI * 1.05, Math.PI * 1.95, false); g.closePath(); g.fillPath();
      g.fillStyle(lit(a, 0.35), 1); g.fillRect(cx - R * 0.5, top + R * 0.05, R * 0.5, R * 0.12);
      return;
    case 'candle': {
      g.fillStyle(0xf2e6c8, 1); g.fillRect(cx - R * 0.22, top - R * 0.9, R * 0.44, R * 1.0);
      g.fillStyle(0xe8d8b0, 1); g.fillEllipse(cx, top - R * 0.9, R * 0.5, R * 0.18);
      const f = 1 + Math.sin(t * 13) * 0.15;
      g.fillStyle(0xffb347, 0.9); g.fillEllipse(cx, top - R * 1.15, R * 0.22 * f, R * 0.42 * f);
      g.fillStyle(0xfff0c0, 1); g.fillEllipse(cx, top - R * 1.08, R * 0.1, R * 0.2);
      g.fillStyle(0xffb347, 0.1); g.fillCircle(cx, top - R * 1.1, R * 0.9);
      return;
    }
  }
}
