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
    case 'wizard': {
      // A tall pointed wizard's hat: a broad soft brim, a cone that rises tall and then flops over at the
      // tip (swaying), a band with a gold buckle, and spangled stars and moons that twinkle on the cloth.
      const sw = Math.sin(t * 1.6) * R * 0.08;
      g.fillStyle(0x000000, 0.18); g.fillEllipse(cx, top + R * 0.32, R * 2.2, R * 0.4);
      g.fillStyle(dim(a, 0.35), 1); g.fillEllipse(cx, top + R * 0.2, R * 2.3, R * 0.55);
      g.fillStyle(a, 1); g.fillEllipse(cx, top + R * 0.15, R * 2.15, R * 0.45);
      g.fillStyle(lit(a, 0.25), 0.8); g.fillEllipse(cx - R * 0.35, top + R * 0.08, R * 1.0, R * 0.12);
      // Cone (shaded right half) up to the bend.
      const bx = cx + R * 0.18 + sw * 0.4, by = top - R * 1.45;
      g.fillStyle(a, 1); g.fillTriangle(cx - R * 0.72, top + R * 0.12, cx + R * 0.72, top + R * 0.12, bx, by);
      g.fillStyle(dim(a, 0.25), 1); g.fillTriangle(cx + R * 0.1, top + R * 0.12, cx + R * 0.72, top + R * 0.12, bx, by);
      g.fillStyle(lit(a, 0.3), 0.6); g.fillTriangle(cx - R * 0.5, top + R * 0.05, cx - R * 0.3, top + R * 0.05, bx - R * 0.04, by + R * 0.15);
      // Wrinkles round the bend, then the flopped tip.
      g.lineStyle(1 * s, dim(a, 0.45), 0.8);
      g.lineBetween(bx - R * 0.16, by + R * 0.32, bx + R * 0.1, by + R * 0.26); g.lineBetween(bx - R * 0.1, by + R * 0.18, bx + R * 0.08, by + R * 0.14);
      const tx = bx + R * 0.62 + sw, ty = by + R * 0.42 + Math.abs(sw) * 0.5;
      g.fillStyle(dim(a, 0.15), 1); g.fillTriangle(bx - R * 0.12, by + R * 0.1, bx + R * 0.14, by + R * 0.2, tx, ty);
      g.fillStyle(dim(a, 0.35), 1); g.fillTriangle(bx + R * 0.02, by + R * 0.16, bx + R * 0.14, by + R * 0.2, tx, ty);
      g.fillStyle(0xffe08a, 1); g.fillCircle(tx, ty + R * 0.04, R * 0.08);
      g.fillStyle(0xffffff, 0.8); g.fillCircle(tx - R * 0.02, ty + R * 0.02, R * 0.03);
      // Band and buckle.
      g.fillStyle(dim(a, 0.55), 1);
      g.beginPath(); g.moveTo(cx - R * 0.7, top + R * 0.08); g.lineTo(cx + R * 0.7, top + R * 0.08); g.lineTo(cx + R * 0.62, top - R * 0.12); g.lineTo(cx - R * 0.62, top - R * 0.12); g.closePath(); g.fillPath();
      g.lineStyle(1.4 * s, 0xe8c050, 1); g.strokeRect(cx - R * 0.12, top - R * 0.11, R * 0.24, R * 0.18);
      g.fillStyle(0xfff0b0, 0.9); g.fillRect(cx - R * 0.1, top - R * 0.1, R * 0.05, R * 0.04);
      // Stars and a crescent moon.
      const star = (x: number, y: number, r: number, k: number) => {
        const tw = 0.55 + 0.45 * Math.sin(t * 3 + k * 2.1);
        g.fillStyle(0xffe08a, tw);
        for (let j = 0; j < 5; j++) {
          const a0 = -Math.PI / 2 + j * (Math.PI * 2 / 5), a1 = a0 + Math.PI / 5, a2 = a0 - Math.PI / 5;
          g.fillTriangle(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r * 0.4, y + Math.sin(a1) * r * 0.4, x + Math.cos(a2) * r * 0.4, y + Math.sin(a2) * r * 0.4);
        }
        g.fillCircle(x, y, r * 0.4);
        if (tw > 0.95) { g.fillStyle(0xffffff, 0.9); g.fillCircle(x, y, r * 0.25); }
      };
      star(cx - R * 0.3, top - R * 0.35, R * 0.13, 0); star(cx + R * 0.25, top - R * 0.62, R * 0.1, 1);
      star(cx - R * 0.05, top - R * 0.95, R * 0.09, 2); star(cx + R * 0.45, top - R * 0.2, R * 0.08, 3);
      g.fillStyle(0xf4f0e8, 1); g.fillCircle(cx - R * 0.22, top - R * 0.68, R * 0.11);
      g.fillStyle(a, 1); g.fillCircle(cx - R * 0.17, top - R * 0.71, R * 0.1);
      for (let k = 0; k < 4; k++) { g.fillStyle(0xffffff, 0.5 + 0.4 * Math.sin(t * 4 + k)); g.fillCircle(cx + R * (-0.45 + k * 0.3), top - R * (0.1 + (k % 2) * 0.55), R * 0.025); }
      return;
    }
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
    case 'aviator': {
      // Leather flying cap: a close dome, ear-flaps down the cheeks, goggles pushed up on the brow.
      const leather = 0x7a4a2a;
      g.fillStyle(leather, 1);
      g.beginPath(); g.arc(cx, cy - R * 0.15, R * 1.04, Math.PI, 0, false); g.closePath(); g.fillPath();
      g.fillRoundedRect(cx - R * 1.06, cy - R * 0.2, R * 0.32, R * 0.85, R * 0.12);
      g.fillRoundedRect(cx + R * 0.74, cy - R * 0.2, R * 0.32, R * 0.85, R * 0.12);
      g.lineStyle(1.5 * s, dim(leather, 0.35), 1); g.lineBetween(cx, top - R * 0.05, cx, top + R * 0.45);
      g.fillStyle(0x3a2a20, 1); g.fillRect(cx - R * 0.98, top + R * 0.2, R * 1.96, R * 0.16);
      g.fillStyle(0xb8b0a0, 1); g.fillCircle(cx - R * 0.34, top + R * 0.24, R * 0.25); g.fillCircle(cx + R * 0.34, top + R * 0.24, R * 0.25);
      g.fillStyle(a, 0.85); g.fillCircle(cx - R * 0.34, top + R * 0.24, R * 0.16); g.fillCircle(cx + R * 0.34, top + R * 0.24, R * 0.16);
      g.fillStyle(0xffffff, 0.7); g.fillCircle(cx - R * 0.4, top + R * 0.19, R * 0.05); g.fillCircle(cx + R * 0.28, top + R * 0.19, R * 0.05);
      return;
    }
    case 'nightcap': {
      // A long floppy cone that flops over to one side, a pompom swinging at its tip.
      g.fillStyle(lit(a, 0.15), 1); g.fillRect(cx - R * 1.0, top + R * 0.28, R * 2.0, R * 0.22);
      g.fillStyle(a, 1);
      g.beginPath(); g.moveTo(cx - R * 0.98, top + R * 0.32); g.lineTo(cx + R * 0.98, top + R * 0.32);
      g.lineTo(cx + R * 0.55, top - R * 0.55); g.lineTo(cx + R * 1.35, top - R * 0.15); g.lineTo(cx + R * 0.2, top - R * 0.8);
      g.closePath(); g.fillPath();
      g.lineStyle(1.2 * s, lit(a, 0.35), 0.8);
      for (const k of [-0.5, 0, 0.5]) g.lineBetween(cx + R * k, top + R * 0.3, cx + R * (0.3 + k * 0.3), top - R * 0.5);
      g.fillStyle(0xfff8ee, 1); g.fillCircle(cx + R * 1.42, top - R * 0.08, R * 0.22);
      return;
    }
    case 'plume': {
      // A soft velvet cap with a long feather swept back over the crown.
      g.fillStyle(a, 1); g.fillEllipse(cx, top + R * 0.12, R * 1.95, R * 0.7);
      g.fillStyle(dim(a, 0.25), 1); g.fillRect(cx - R * 0.95, top + R * 0.25, R * 1.9, R * 0.14);
      const fx0 = cx + R * 0.35, fy0 = top - R * 0.05;
      g.lineStyle(1.4 * s, 0xf0e8d8, 1);
      g.beginPath(); g.moveTo(fx0, fy0);
      for (let k = 1; k <= 8; k++) { const u = k / 8; g.lineTo(fx0 - R * 1.8 * u, fy0 - R * 1.0 * Math.sin(u * 2.2)); }
      g.strokePath();
      for (let k = 1; k <= 7; k++) {
        const u = k / 8, px = fx0 - R * 1.8 * u, py = fy0 - R * 1.0 * Math.sin(u * 2.2), w = R * 0.32 * Math.sin(u * Math.PI);
        g.fillStyle(k % 2 ? 0xfff6e8 : 0xe8dcc8, 1); g.fillEllipse(px, py - w * 0.4, w * 1.4, w * 0.9);
      }
      return;
    }
    case 'miner': {
      // A hard hat: a domed shell with a ridge and a short brim, a brass lamp lit on the brow.
      g.fillStyle(dim(a, 0.25), 1); g.fillEllipse(cx, top + R * 0.4, R * 2.3, R * 0.42);
      g.fillStyle(a, 1);
      g.beginPath(); g.arc(cx, top + R * 0.38, R * 0.98, Math.PI, 0, false); g.closePath(); g.fillPath();
      g.fillStyle(lit(a, 0.3), 1); g.fillRect(cx - R * 0.1, top - R * 0.58, R * 0.2, R * 0.9);
      g.fillStyle(0xb88a3a, 1); g.fillRoundedRect(cx - R * 0.26, top - R * 0.02, R * 0.52, R * 0.36, R * 0.08);
      g.fillStyle(0xfff4c0, 1); g.fillCircle(cx, top + R * 0.16, R * 0.14);
      g.fillStyle(0xfff0a0, 0.25); g.fillCircle(cx, top + R * 0.16, R * 0.34);
      return;
    }
    case 'headwrap': {
      // Cloth wound round the head in bands, the loose tail hanging down behind one ear.
      g.fillStyle(dim(a, 0.2), 1); g.fillRoundedRect(cx + R * 0.55, top + R * 0.2, R * 0.38, R * 1.25, R * 0.15);
      g.fillStyle(a, 1); g.fillEllipse(cx, top + R * 0.12, R * 2.1, R * 0.95);
      g.lineStyle(1.4 * s, dim(a, 0.3), 0.9);
      for (const k of [-0.18, 0.06, 0.3]) g.lineBetween(cx - R * 1.0, top + R * (k + 0.1), cx + R * 1.0, top + R * (k - 0.08));
      g.fillStyle(lit(a, 0.3), 1); g.fillEllipse(cx - R * 0.35, top - R * 0.12, R * 0.6, R * 0.22);
      return;
    }
    case 'coif': {
      // A laced leather coif hugging the skull, smoked welding goggles riding on the brow.
      const leather = 0x5a3a24;
      g.fillStyle(leather, 1);
      g.beginPath(); g.arc(cx, cy - R * 0.1, R * 1.06, Math.PI, 0, false); g.closePath(); g.fillPath();
      g.lineStyle(1.2 * s, 0xc8a878, 1);
      for (let k = 0; k < 3; k++) g.lineBetween(cx - R * 0.12, top + R * (0.0 + k * 0.16), cx + R * 0.12, top + R * (0.08 + k * 0.16));
      g.fillStyle(0x2a2a2a, 1); g.fillRect(cx - R * 1.0, top + R * 0.3, R * 2.0, R * 0.14);
      g.fillStyle(0x6a6a6a, 1); g.fillRoundedRect(cx - R * 0.72, top + R * 0.2, R * 0.6, R * 0.34, R * 0.1); g.fillRoundedRect(cx + R * 0.12, top + R * 0.2, R * 0.6, R * 0.34, R * 0.1);
      g.fillStyle(0x2a3a2a, 1); g.fillRoundedRect(cx - R * 0.66, top + R * 0.25, R * 0.48, R * 0.24, R * 0.08); g.fillRoundedRect(cx + R * 0.18, top + R * 0.25, R * 0.48, R * 0.24, R * 0.08);
      g.fillStyle(a, 0.6); g.fillCircle(cx - R * 0.55, top + R * 0.3, R * 0.05); g.fillCircle(cx + R * 0.29, top + R * 0.3, R * 0.05);
      return;
    }
    case 'antenna': {
      // A snug skullcap, a coiled antenna sprung from the crown, a spark winking at its tip.
      g.fillStyle(a, 1);
      g.beginPath(); g.arc(cx, top + R * 0.42, R * 0.98, Math.PI, 0, false); g.closePath(); g.fillPath();
      g.fillStyle(dim(a, 0.3), 1); g.fillRect(cx - R * 0.98, top + R * 0.34, R * 1.96, R * 0.12);
      g.lineStyle(1.4 * s, 0xc8ccd4, 1);
      g.beginPath(); g.moveTo(cx, top - R * 0.5);
      for (let k = 1; k <= 10; k++) { const u = k / 10; g.lineTo(cx + Math.sin(u * Math.PI * 6) * R * 0.14, top - R * 0.5 - u * R * 1.0); }
      g.strokePath();
      const tw = 0.5 + 0.5 * Math.sin(t * 9);
      g.fillStyle(0xd8202a, 1); g.fillCircle(cx, top - R * 1.52, R * 0.12);
      g.fillStyle(0xbfe8ff, 0.4 * tw); g.fillCircle(cx, top - R * 1.52, R * 0.32);
      return;
    }
    case 'hazmat': {
      // A lead-grey hood over the whole head, a round glass visor with a glint, filter canister at the chin.
      g.fillStyle(dim(a, 0.15), 1); g.fillEllipse(cx, cy - R * 0.05, R * 2.25, R * 2.2);
      g.fillStyle(a, 1); g.fillEllipse(cx, cy - R * 0.12, R * 2.05, R * 2.0);
      g.fillStyle(0x1a2a2a, 0.55); g.fillCircle(cx, cy + R * 0.05, R * 0.72);
      g.lineStyle(2 * s, dim(a, 0.4), 1); g.strokeCircle(cx, cy + R * 0.05, R * 0.74);
      g.fillStyle(0xffffff, 0.45); g.fillEllipse(cx - R * 0.28, cy - R * 0.25, R * 0.3, R * 0.16);
      g.fillStyle(0x4a4e56, 1); g.fillRoundedRect(cx - R * 0.22, cy + R * 0.72, R * 0.44, R * 0.3, R * 0.08);
      g.fillStyle(0xe8c83a, 1); g.fillCircle(cx + R * 0.7, top + R * 0.3, R * 0.14);
      return;
    }
    case 'propeller': {
      // A striped beanie with a button on top carrying a little two-blade propeller, turning.
      g.fillStyle(a, 1);
      g.beginPath(); g.arc(cx, top + R * 0.42, R * 0.98, Math.PI, 0, false); g.closePath(); g.fillPath();
      g.fillStyle(lit(a, 0.35), 1);
      for (const k of [-0.5, 0, 0.5]) { g.beginPath(); g.moveTo(cx + k * R * 0.9, top + R * 0.42); g.lineTo(cx + k * R * 0.35, top - R * 0.52); g.lineTo(cx + k * R * 0.35 + R * 0.16, top - R * 0.5); g.lineTo(cx + k * R * 0.9 + R * 0.28, top + R * 0.42); g.closePath(); g.fillPath(); }
      g.fillStyle(0x3a3a42, 1); g.fillRect(cx - R * 0.05, top - R * 0.85, R * 0.1, R * 0.32);
      const sw = Math.cos(t * 14);
      g.fillStyle(0xffd04a, 1); g.fillEllipse(cx - R * 0.42 * sw, top - R * 0.85, R * 0.84 * Math.abs(sw) + R * 0.08, R * 0.16);
      g.fillStyle(0xff5a6a, 1); g.fillCircle(cx, top - R * 0.85, R * 0.09);
      return;
    }
    case 'cowl': {
      // A deep cowl over the whole head: drapes falling to the shoulders, the opening black as a well,
      // only two eye-glints in it that narrow now and then.
      g.fillStyle(dim(a, 0.3), 1); g.fillEllipse(cx, cy + R * 0.55, R * 2.5, R * 1.0);
      g.fillStyle(a, 1);
      g.beginPath(); g.arc(cx, cy - R * 0.05, R * 1.18, Math.PI * 0.92, Math.PI * 2.08, false); g.closePath(); g.fillPath();
      g.fillTriangle(cx - R * 0.25, top - R * 0.12, cx + R * 0.25, top - R * 0.12, cx + R * 0.05, top - R * 0.6);
      g.lineStyle(1.2 * s, dim(a, 0.35), 0.9);
      g.lineBetween(cx - R * 0.95, cy - R * 0.2, cx - R * 1.1, cy + R * 0.7); g.lineBetween(cx + R * 0.95, cy - R * 0.2, cx + R * 1.1, cy + R * 0.7);
      g.fillStyle(dim(a, 0.55), 1); g.fillEllipse(cx, cy + R * 0.05, R * 1.55, R * 1.55);
      g.fillStyle(0x07050a, 1); g.fillEllipse(cx, cy + R * 0.12, R * 1.3, R * 1.35);
      g.lineStyle(1.4 * s, lit(a, 0.2), 0.8);
      g.beginPath(); g.arc(cx, cy + R * 0.05, R * 0.78, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
      const sq = Math.sin(t * 0.7) > 0.92 ? 0.25 : 1;
      g.fillStyle(0xe8f0c8, 0.9); g.fillEllipse(cx - R * 0.26, cy + R * 0.08, R * 0.2, R * 0.1 * sq); g.fillEllipse(cx + R * 0.26, cy + R * 0.08, R * 0.2, R * 0.1 * sq);
      g.fillStyle(0xe8f0c8, 0.15); g.fillCircle(cx - R * 0.26, cy + R * 0.08, R * 0.2); g.fillCircle(cx + R * 0.26, cy + R * 0.08, R * 0.2);
      return;
    }
    case 'plague': {
      // A plague-doctor's mask: leather face with round glass eyes and a long curved beak, a wide-brimmed
      // hat over it, a band round the crown.
      const leather = 0x2a2420;
      g.fillStyle(leather, 1); g.fillEllipse(cx, cy, R * 1.9, R * 1.85);
      g.fillStyle(0x3a322c, 1);
      g.beginPath(); g.moveTo(cx - R * 0.3, cy + R * 0.05); g.lineTo(cx + R * 0.3, cy + R * 0.05);
      g.lineTo(cx + R * 0.12, cy + R * 0.9); g.lineTo(cx + R * 0.02, cy + R * 1.45); g.lineTo(cx - R * 0.12, cy + R * 0.9); g.closePath(); g.fillPath();
      g.lineStyle(1 * s, 0x14100c, 0.9); g.lineBetween(cx, cy + R * 0.1, cx + R * 0.02, cy + R * 1.4);
      g.lineStyle(1 * s, 0x5a4a3a, 1); for (const k of [0.4, 0.7]) g.lineBetween(cx - R * 0.22 * (1.1 - k), cy + R * k, cx + R * 0.22 * (1.1 - k), cy + R * k);
      for (const d of [-1, 1]) {
        g.fillStyle(0x8a6a3a, 1); g.fillCircle(cx + d * R * 0.4, cy - R * 0.12, R * 0.27);
        g.fillStyle(0x1a2a2a, 1); g.fillCircle(cx + d * R * 0.4, cy - R * 0.12, R * 0.2);
        g.fillStyle(0xd8f0e8, 0.6); g.fillCircle(cx + d * R * 0.4 - R * 0.07, cy - R * 0.19, R * 0.06);
      }
      g.fillStyle(dim(a, 0.35), 1); g.fillEllipse(cx, top + R * 0.15, R * 2.8, R * 0.55);
      g.fillStyle(a, 1); g.fillRoundedRect(cx - R * 0.7, top - R * 0.75, R * 1.4, R * 0.95, R * 0.2);
      g.fillStyle(dim(a, 0.5), 1); g.fillRect(cx - R * 0.7, top - R * 0.02, R * 1.4, R * 0.16);
      g.fillStyle(lit(a, 0.25), 1); g.fillRect(cx - R * 0.55, top - R * 0.68, R * 0.18, R * 0.6);
      return;
    }
    case 'snake': {
      // A live serpent coiled round the head like a turban — three scaled coils, the tail tucked in — its
      // head reared on a curve of neck above the brow, swaying, the forked tongue flicking out.
      const scale = a, belly = lit(a, 0.45);
      for (let k = 0; k < 3; k++) {
        const y = top + R * (0.32 - k * 0.3), w = R * (2.1 - k * 0.42), h = R * (0.58 - k * 0.06);
        g.fillStyle(dim(scale, 0.35), 1); g.fillEllipse(cx, y + R * 0.06, w, h);
        g.fillStyle(scale, 1); g.fillEllipse(cx, y, w, h * 0.85);
        g.fillStyle(belly, 0.5); g.fillEllipse(cx, y + h * 0.2, w * 0.8, h * 0.22);
        g.fillStyle(dim(scale, 0.45), 1);
        for (let j = -3; j <= 3; j++) g.fillCircle(cx + j * w * 0.13, y - h * 0.12, R * 0.06);
      }
      // Tail tip tucked down one side.
      g.fillStyle(scale, 1); g.fillTriangle(cx - R * 0.95, top + R * 0.35, cx - R * 0.75, top + R * 0.45, cx - R * 1.1, top + R * 0.85);
      // Neck rising from the top coil, head swaying.
      const sway = Math.sin(t * 1.4) * R * 0.22, hx = cx + R * 0.35 + sway, hy = top - R * 1.25;
      g.lineStyle(R * 0.34, dim(scale, 0.2), 1);
      g.beginPath(); g.moveTo(cx + R * 0.25, top - R * 0.4);
      for (let k = 1; k <= 6; k++) { const u = k / 6; g.lineTo(cx + R * 0.25 + Math.sin(u * Math.PI) * R * 0.3 + sway * u, top - R * 0.4 - u * R * 0.75); }
      g.strokePath();
      g.lineStyle(R * 0.14, belly, 0.6);
      g.beginPath(); g.moveTo(cx + R * 0.2, top - R * 0.4);
      for (let k = 1; k <= 6; k++) { const u = k / 6; g.lineTo(cx + R * 0.16 + Math.sin(u * Math.PI) * R * 0.3 + sway * u, top - R * 0.4 - u * R * 0.75); }
      g.strokePath();
      g.fillStyle(scale, 1); g.fillEllipse(hx, hy, R * 0.62, R * 0.42);
      g.fillStyle(dim(scale, 0.3), 1); g.fillEllipse(hx, hy - R * 0.06, R * 0.4, R * 0.16);
      g.fillStyle(0xffd83a, 1); g.fillCircle(hx - R * 0.14, hy - R * 0.04, R * 0.07); g.fillCircle(hx + R * 0.14, hy - R * 0.04, R * 0.07);
      g.fillStyle(0x0a0a0a, 1); g.fillRect(hx - R * 0.15, hy - R * 0.09, R * 0.02, R * 0.1); g.fillRect(hx + R * 0.13, hy - R * 0.09, R * 0.02, R * 0.1);
      // Tongue flicks out in quick bursts.
      const fl = (t * 1.3) % 1, out = fl < 0.25 ? Math.sin((fl / 0.25) * Math.PI) : 0;
      if (out > 0.05) {
        const tx = hx, ty = hy + R * 0.2, tl = R * 0.4 * out, fork = Math.sin(t * 40) * R * 0.03;
        g.lineStyle(1.2 * s, 0xd8203a, 1); g.lineBetween(tx, ty, tx, ty + tl);
        g.lineBetween(tx, ty + tl, tx - R * 0.08 - fork, ty + tl + R * 0.1); g.lineBetween(tx, ty + tl, tx + R * 0.08 + fork, ty + tl + R * 0.1);
      }
      return;
    }
    case 'visor': {
      // A dealer's eyeshade: translucent green celluloid bill on a band round the brow, the green light
      // it throws on the face, a sleeve-garter-style buckle at the side and a shine along the bill.
      const cel = 0x3aa85a;
      g.fillStyle(0x2a2a2a, 1); g.fillRect(cx - R * 1.0, top + R * 0.3, R * 2.0, R * 0.16);
      g.fillStyle(a, 1); g.fillRect(cx - R * 1.0, top + R * 0.32, R * 2.0, R * 0.09);
      g.fillStyle(cel, 0.14); g.fillEllipse(cx, top + R * 0.85, R * 1.6, R * 0.7);
      g.fillStyle(dim(cel, 0.35), 0.95);
      g.beginPath(); g.moveTo(cx - R * 1.0, top + R * 0.36); g.lineTo(cx + R * 1.0, top + R * 0.36);
      g.lineTo(cx + R * 0.78, top + R * 0.78); g.lineTo(cx - R * 0.78, top + R * 0.78); g.closePath(); g.fillPath();
      g.fillStyle(cel, 0.75);
      g.beginPath(); g.moveTo(cx - R * 0.94, top + R * 0.38); g.lineTo(cx + R * 0.94, top + R * 0.38);
      g.lineTo(cx + R * 0.74, top + R * 0.72); g.lineTo(cx - R * 0.74, top + R * 0.72); g.closePath(); g.fillPath();
      g.lineStyle(1.2 * s, lit(cel, 0.6), 0.8); g.lineBetween(cx - R * 0.7, top + R * 0.45, cx + R * 0.2, top + R * 0.45);
      g.lineStyle(1 * s, 0x1a3a22, 0.9); g.lineBetween(cx - R * 0.78, top + R * 0.78, cx + R * 0.78, top + R * 0.78);
      g.fillStyle(0xd8b048, 1); g.fillRect(cx + R * 0.82, top + R * 0.28, R * 0.18, R * 0.2);
      g.fillStyle(0xfff0b0, 0.8); g.fillRect(cx + R * 0.85, top + R * 0.3, R * 0.05, R * 0.08);
      return;
    }
    case 'jester': {
      // A fool's cap: a snug band and three floppy points in two colours — one left, one up, one right —
      // each tipped with a little brass bell that jingles as the head moves.
      const b = lit(a, 0.15), c2 = 0xe8c83a;
      g.fillStyle(dim(a, 0.3), 1); g.fillRect(cx - R * 1.0, top + R * 0.26, R * 2.0, R * 0.24);
      const points: [number, number, number][] = [[-1.55, 0.15, 0], [0.08, -1.25, 1], [1.55, 0.15, 2]];
      for (const [px, py, k] of points) {
        const sw = Math.sin(t * 3 + k * 1.7) * R * 0.08, tipX = cx + R * px + sw, tipY = top + R * py + Math.abs(sw) * 0.5;
        g.fillStyle(k === 1 ? c2 : b, 1);
        g.beginPath(); g.moveTo(cx + R * (k - 1) * 0.55 - R * 0.42, top + R * 0.3); g.lineTo(cx + R * (k - 1) * 0.55 + R * 0.42, top + R * 0.3);
        g.lineTo(cx + R * (px * 0.6), top + R * (py * 0.4 - 0.2)); g.lineTo(tipX, tipY); g.closePath(); g.fillPath();
        g.lineStyle(1 * s, dim(k === 1 ? c2 : b, 0.35), 0.8); g.lineBetween(cx + R * (k - 1) * 0.4, top + R * 0.2, tipX, tipY);
        g.fillStyle(0xd8a838, 1); g.fillCircle(tipX, tipY + R * 0.08, R * 0.14);
        g.fillStyle(0xfff0b0, 0.9); g.fillCircle(tipX - R * 0.04, tipY + R * 0.04, R * 0.05);
        g.fillStyle(0x3a2a10, 1); g.fillRect(tipX - R * 0.06, tipY + R * 0.13, R * 0.12, R * 0.03);
      }
      g.fillStyle(lit(a, 0.35), 1);
      for (let k = -2; k <= 2; k++) g.fillTriangle(cx + R * k * 0.4 - R * 0.18, top + R * 0.5, cx + R * k * 0.4 + R * 0.18, top + R * 0.5, cx + R * k * 0.4, top + R * 0.68);
      return;
    }
    case 'shako': {
      // A tall military shako: a flared cylinder with a glossy black peak, a brass plate on the front,
      // braid cords looped across, a chin-strap, and a stiff plume on top that trembles as they walk.
      g.fillStyle(0x0e0e12, 1); g.fillEllipse(cx + R * 0.1, top + R * 0.42, R * 1.7, R * 0.36);
      g.fillStyle(0xffffff, 0.35); g.fillEllipse(cx + R * 0.25, top + R * 0.38, R * 0.6, R * 0.08);
      g.fillStyle(dim(a, 0.25), 1);
      g.beginPath(); g.moveTo(cx - R * 0.72, top + R * 0.35); g.lineTo(cx + R * 0.72, top + R * 0.35);
      g.lineTo(cx + R * 0.85, top - R * 0.95); g.lineTo(cx - R * 0.85, top - R * 0.95); g.closePath(); g.fillPath();
      g.fillStyle(a, 1);
      g.beginPath(); g.moveTo(cx - R * 0.64, top + R * 0.32); g.lineTo(cx + R * 0.4, top + R * 0.32);
      g.lineTo(cx + R * 0.5, top - R * 0.92); g.lineTo(cx - R * 0.77, top - R * 0.92); g.closePath(); g.fillPath();
      g.fillStyle(0x1a1a1e, 1); g.fillEllipse(cx, top - R * 0.95, R * 1.7, R * 0.3);
      g.fillStyle(0x1a1a1e, 1); g.fillRect(cx - R * 0.72, top + R * 0.2, R * 1.44, R * 0.14);
      g.lineStyle(1.4 * s, 0xe8c050, 1);
      g.beginPath(); g.moveTo(cx - R * 0.7, top - R * 0.3);
      for (let k = 1; k <= 8; k++) { const u = k / 8; g.lineTo(cx - R * 0.7 + u * R * 1.4, top - R * 0.3 + Math.sin(u * Math.PI) * R * 0.25); }
      g.strokePath();
      g.fillStyle(0xd8a838, 1);
      g.beginPath(); g.moveTo(cx, top - R * 0.72); g.lineTo(cx + R * 0.28, top - R * 0.45); g.lineTo(cx + R * 0.2, top - R * 0.05);
      g.lineTo(cx - R * 0.2, top - R * 0.05); g.lineTo(cx - R * 0.28, top - R * 0.45); g.closePath(); g.fillPath();
      g.fillStyle(0xfff0b0, 0.85); g.fillCircle(cx - R * 0.08, top - R * 0.45, R * 0.06);
      g.fillStyle(dim(0xd8a838, 0.4), 1); g.fillCircle(cx, top - R * 0.32, R * 0.08);
      g.lineStyle(1 * s, 0x2a2a2a, 0.9); g.lineBetween(cx - R * 0.72, top + R * 0.32, cx - R * 0.55, cy + R * 0.7);
      const tr = Math.sin(t * 6) * R * 0.05;
      g.fillStyle(0xf4f0e8, 1); g.fillEllipse(cx + tr * 0.5, top - R * 1.35, R * 0.34, R * 0.8);
      g.fillStyle(0xc8202a, 1); g.fillEllipse(cx + tr, top - R * 1.62, R * 0.26, R * 0.38);
      g.fillStyle(0xe8c050, 1); g.fillCircle(cx, top - R * 1.0, R * 0.12);
      return;
    }
    case 'bandmaster': {
      // A bandmaster's peaked cap: a stiff crown flaring to a flat top, a glossy black peak, a band of
      // gold oak-leaf braid round it, a gold chin cord on two buttons, and a little lyre badge in front.
      const gold = 0xe8c050;
      g.fillStyle(0x0e0e12, 1); g.fillEllipse(cx + R * 0.05, top + R * 0.5, R * 1.65, R * 0.4);
      g.fillStyle(0xffffff, 0.3); g.fillEllipse(cx + R * 0.2, top + R * 0.45, R * 0.7, R * 0.09);
      g.fillStyle(dim(a, 0.3), 1);
      g.beginPath(); g.moveTo(cx - R * 0.82, top + R * 0.42); g.lineTo(cx + R * 0.82, top + R * 0.42);
      g.lineTo(cx + R * 1.05, top - R * 0.38); g.lineTo(cx - R * 1.05, top - R * 0.38); g.closePath(); g.fillPath();
      g.fillStyle(a, 1);
      g.beginPath(); g.moveTo(cx - R * 0.74, top + R * 0.4); g.lineTo(cx + R * 0.5, top + R * 0.4);
      g.lineTo(cx + R * 0.7, top - R * 0.36); g.lineTo(cx - R * 0.98, top - R * 0.36); g.closePath(); g.fillPath();
      g.fillStyle(lit(a, 0.2), 1); g.fillEllipse(cx, top - R * 0.4, R * 2.15, R * 0.42);
      g.fillStyle(lit(a, 0.4), 0.7); g.fillEllipse(cx - R * 0.3, top - R * 0.44, R * 0.9, R * 0.14);
      g.lineStyle(1 * s, dim(a, 0.45), 0.9); g.strokeEllipse(cx, top - R * 0.4, R * 2.15, R * 0.42);
      // Braid band.
      g.fillStyle(dim(gold, 0.35), 1); g.fillRect(cx - R * 0.8, top + R * 0.12, R * 1.6, R * 0.26);
      g.fillStyle(gold, 1);
      for (let k = 0; k < 8; k++) {
        const x = cx - R * 0.72 + k * R * 0.2;
        g.fillEllipse(x, top + R * 0.2, R * 0.17, R * 0.09); g.fillEllipse(x + R * 0.08, top + R * 0.3, R * 0.17, R * 0.09);
      }
      g.lineStyle(1 * s, lit(gold, 0.5), 0.8); g.lineBetween(cx - R * 0.8, top + R * 0.12, cx + R * 0.8, top + R * 0.12);
      // Chin cord.
      g.lineStyle(1.3 * s, gold, 1); g.lineBetween(cx - R * 0.7, top + R * 0.44, cx + R * 0.7, top + R * 0.44);
      g.fillStyle(gold, 1); g.fillCircle(cx - R * 0.72, top + R * 0.44, R * 0.07); g.fillCircle(cx + R * 0.72, top + R * 0.44, R * 0.07);
      // Lyre badge.
      const by = top - R * 0.08;
      g.fillStyle(dim(gold, 0.45), 1); g.fillEllipse(cx, by, R * 0.42, R * 0.42);
      g.lineStyle(1.4 * s, gold, 1);
      g.beginPath(); g.moveTo(cx - R * 0.07, by + R * 0.14); g.lineTo(cx - R * 0.15, by); g.lineTo(cx - R * 0.12, by - R * 0.13); g.lineTo(cx - R * 0.17, by - R * 0.18); g.strokePath();
      g.beginPath(); g.moveTo(cx + R * 0.07, by + R * 0.14); g.lineTo(cx + R * 0.15, by); g.lineTo(cx + R * 0.12, by - R * 0.13); g.lineTo(cx + R * 0.17, by - R * 0.18); g.strokePath();
      g.lineBetween(cx - R * 0.1, by + R * 0.14, cx + R * 0.1, by + R * 0.14); g.lineBetween(cx - R * 0.13, by - R * 0.1, cx + R * 0.13, by - R * 0.1);
      g.lineStyle(0.7 * s, lit(gold, 0.5), 0.9);
      for (const k of [-0.05, 0, 0.05]) g.lineBetween(cx + R * k, by - R * 0.1, cx + R * k, by + R * 0.13);
      g.fillStyle(0xfff0b0, 0.9); g.fillCircle(cx - R * 0.08, by - R * 0.06, R * 0.03);
      return;
    }
    case 'domino': {
      // A masquerade half-mask over the eyes: a swept domino shape crusted in sequins that twinkle, dark
      // almond eyeholes with a glint, a gilt edge, and a spray of curled feathers rising from one temple.
      const ey = cy - R * 0.12;
      for (let k = 0; k < 3; k++) {
        const sw = Math.sin(t * 2 + k * 1.3) * R * 0.06, ang = -0.35 + k * 0.32;
        const bx = cx + R * 0.62, byy = ey - R * 0.2, len = R * (1.35 - k * 0.15);
        const col = k === 1 ? lit(a, 0.35) : k === 0 ? 0xf4f0e8 : dim(a, 0.15);
        g.lineStyle(1 * s, dim(col, 0.3), 1);
        const pts: [number, number][] = [];
        for (let j = 0; j <= 8; j++) {
          const u = j / 8, bend = Math.sin(u * Math.PI * 0.8) * R * 0.25;
          pts.push([bx + Math.sin(ang) * len * u + bend + sw * u, byy - Math.cos(ang) * len * u]);
        }
        for (let j = 1; j < pts.length; j++) {
          const [px, py] = pts[j], w = R * 0.18 * Math.sin((j / 8) * Math.PI) + R * 0.04;
          g.fillStyle(col, 1); g.fillEllipse(px, py, w * 1.4, R * 0.22);
          g.lineBetween(px - w * 0.6, py + R * 0.05, px + w * 0.6, py - R * 0.05);
        }
        g.lineStyle(1 * s, dim(col, 0.4), 1); g.lineBetween(pts[0][0], pts[0][1], pts[8][0], pts[8][1]);
      }
      g.fillStyle(dim(a, 0.4), 1);
      g.beginPath(); g.moveTo(cx - R * 0.98, ey - R * 0.22); g.lineTo(cx - R * 0.5, ey - R * 0.36); g.lineTo(cx, ey - R * 0.2);
      g.lineTo(cx + R * 0.5, ey - R * 0.36); g.lineTo(cx + R * 0.98, ey - R * 0.22); g.lineTo(cx + R * 0.86, ey + R * 0.2);
      g.lineTo(cx + R * 0.4, ey + R * 0.32); g.lineTo(cx, ey + R * 0.14); g.lineTo(cx - R * 0.4, ey + R * 0.32); g.lineTo(cx - R * 0.86, ey + R * 0.2); g.closePath(); g.fillPath();
      g.fillStyle(a, 1);
      g.beginPath(); g.moveTo(cx - R * 0.9, ey - R * 0.18); g.lineTo(cx - R * 0.5, ey - R * 0.3); g.lineTo(cx, ey - R * 0.15);
      g.lineTo(cx + R * 0.5, ey - R * 0.3); g.lineTo(cx + R * 0.9, ey - R * 0.18); g.lineTo(cx + R * 0.8, ey + R * 0.15);
      g.lineTo(cx + R * 0.4, ey + R * 0.26); g.lineTo(cx, ey + R * 0.1); g.lineTo(cx - R * 0.4, ey + R * 0.26); g.lineTo(cx - R * 0.8, ey + R * 0.15); g.closePath(); g.fillPath();
      for (let k = 0; k < 16; k++) {
        const sx = cx + (-0.8 + (k % 8) * 0.23) * R, sy = ey + (k < 8 ? -0.12 : 0.1) * R + (k % 2) * R * 0.04;
        const tw = Math.max(0, Math.sin(t * 3 + k * 1.9));
        g.fillStyle(tw > 0.85 ? 0xffffff : lit(a, 0.3 + 0.3 * tw), 1); g.fillCircle(sx, sy, R * 0.045);
      }
      for (const d of [-1, 1]) {
        g.fillStyle(0x0a0608, 1); g.fillEllipse(cx + d * R * 0.42, ey, R * 0.42, R * 0.2);
        g.fillStyle(0xffffff, 0.8); g.fillCircle(cx + d * R * 0.42 - R * 0.06, ey - R * 0.03, R * 0.04);
      }
      g.lineStyle(1 * s, 0xe8c050, 1);
      g.beginPath(); g.moveTo(cx - R * 0.98, ey - R * 0.22); g.lineTo(cx - R * 0.5, ey - R * 0.36); g.lineTo(cx, ey - R * 0.2);
      g.lineTo(cx + R * 0.5, ey - R * 0.36); g.lineTo(cx + R * 0.98, ey - R * 0.22); g.strokePath();
      g.fillStyle(0xe8c050, 1); g.fillCircle(cx + R * 0.66, ey - R * 0.24, R * 0.09);
      return;
    }
    case 'earmuffs': {
      // Quilted earmuffs: a padded band arching over the crown and two plump muffs over the ears, each
      // diamond-stitched with a fluffy rim and a soft shine — the Hush's wardens hear nothing they don't want to.
      g.lineStyle(R * 0.22, dim(a, 0.35), 1);
      g.beginPath(); g.arc(cx, cy, R * 1.0, Math.PI * 1.08, Math.PI * 1.92, false); g.strokePath();
      g.lineStyle(R * 0.12, a, 1);
      g.beginPath(); g.arc(cx, cy, R * 1.0, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
      g.lineStyle(1 * s, lit(a, 0.4), 0.7);
      g.beginPath(); g.arc(cx, cy, R * 0.97, Math.PI * 1.2, Math.PI * 1.55, false); g.strokePath();
      for (const d of [-1, 1]) {
        const mx = cx + d * R * 0.98, my = cy + R * 0.05;
        g.fillStyle(0x000000, 0.2); g.fillEllipse(mx + d * R * 0.05, my + R * 0.06, R * 0.66, R * 0.82);
        g.fillStyle(lit(a, 0.55), 1);
        for (let k = 0; k < 12; k++) { const an = k * (Math.PI / 6); g.fillCircle(mx + Math.cos(an) * R * 0.3, my + Math.sin(an) * R * 0.37, R * 0.09); }
        g.fillStyle(dim(a, 0.15), 1); g.fillEllipse(mx, my, R * 0.56, R * 0.7);
        g.lineStyle(0.8 * s, dim(a, 0.45), 0.9);
        for (const o of [-0.14, 0, 0.14]) { g.lineBetween(mx - R * 0.22, my + R * (o - 0.2), mx + R * 0.22, my + R * (o + 0.2)); g.lineBetween(mx + R * 0.22, my + R * (o - 0.2), mx - R * 0.22, my + R * (o + 0.2)); }
        g.fillStyle(0xffffff, 0.3); g.fillEllipse(mx - d * R * 0.08, my - R * 0.18, R * 0.2, R * 0.12);
      }
      return;
    }
    case 'wig': {
      // A judge's long full-bottomed wig: a powdered white cap over the crown with a centre parting and
      // rows of tight sausage curls falling on each side to the shoulders, each curl shaded and lit, the
      // outermost bouncing a little as the wearer moves, and a dusting of powder on the curls.
      const wig = 0xf4f0e6, shade = 0xc8c0b0, deep = 0x9a9284, bob = Math.sin(t * 2.2) * R * 0.03;
      // Side falls behind/beside the face, curl by curl, top to bottom.
      for (const d of [-1, 1]) {
        for (let row = 0; row < 5; row++) {
          for (let col = 0; col < 2; col++) {
            const x = cx + d * R * (0.88 + col * 0.3 + row * 0.03), y = top + R * (0.55 + row * 0.36) + (col ? bob : 0);
            const rr = R * (0.2 - row * 0.008);
            g.fillStyle(deep, 1); g.fillEllipse(x + d * R * 0.03, y + R * 0.04, rr * 2.3, rr * 1.9);
            g.fillStyle(shade, 1); g.fillEllipse(x, y, rr * 2.2, rr * 1.8);
            g.fillStyle(wig, 1); g.fillEllipse(x - d * R * 0.02, y - R * 0.03, rr * 1.8, rr * 1.35);
            g.lineStyle(0.8 * s, deep, 0.7);
            g.beginPath(); g.arc(x, y, rr * 0.55, Math.PI * 0.1, Math.PI * 1.3, d > 0); g.strokePath();
            g.fillStyle(0xffffff, 0.8); g.fillCircle(x - d * rr * 0.35, y - rr * 0.35, rr * 0.2);
          }
        }
        // Long tail curl to the shoulder.
        const lx = cx + d * R * 1.12, ly = top + R * 2.4 + bob;
        g.fillStyle(shade, 1); g.fillEllipse(lx, ly, R * 0.34, R * 0.46);
        g.fillStyle(wig, 1); g.fillEllipse(lx - d * R * 0.03, ly - R * 0.05, R * 0.26, R * 0.34);
        g.lineStyle(0.8 * s, deep, 0.6); g.beginPath(); g.arc(lx, ly + R * 0.04, R * 0.08, 0, Math.PI * 1.5, false); g.strokePath();
      }
      // Crown cap: dome with rows of small curls, parted down the middle.
      g.fillStyle(deep, 1);
      g.beginPath(); g.arc(cx, cy - R * 0.08, R * 1.12, Math.PI * 1.03, Math.PI * 1.97, false); g.closePath(); g.fillPath();
      g.fillStyle(shade, 1);
      g.beginPath(); g.arc(cx, cy - R * 0.1, R * 1.07, Math.PI * 1.04, Math.PI * 1.96, false); g.closePath(); g.fillPath();
      for (let row = 0; row < 3; row++) {
        const n = 7 - row * 2, ry = top + R * (0.42 - row * 0.28), span = R * (1.7 - row * 0.5);
        for (let k = 0; k < n; k++) {
          const x = cx - span / 2 + (k + 0.5) * (span / n), rr = R * 0.15;
          g.fillStyle(wig, 1); g.fillEllipse(x, ry, rr * 2, rr * 1.5);
          g.lineStyle(0.7 * s, deep, 0.55); g.beginPath(); g.arc(x, ry, rr * 0.5, Math.PI * 0.2, Math.PI * 1.4, false); g.strokePath();
          g.fillStyle(0xffffff, 0.75); g.fillCircle(x - rr * 0.35, ry - rr * 0.3, rr * 0.22);
        }
      }
      g.lineStyle(1.2 * s, deep, 0.7); g.lineBetween(cx, top - R * 0.12, cx, top + R * 0.3);
      g.fillStyle(0xffffff, 0.35); g.fillEllipse(cx - R * 0.35, top - R * 0.02, R * 0.5, R * 0.14);
      // Powder.
      for (let k = 0; k < 6; k++) { g.fillStyle(0xffffff, 0.6); g.fillCircle(cx + R * (-0.9 + k * 0.36), top + R * (0.2 + ((k * 7) % 5) * 0.3), R * 0.025); }
      return;
    }
    case 'beret': {
      // A floppy painter's beret: a soft round crown slouching over to one side and drooping past the
      // brow, a rolled band, a little stalk on top, flecked and dripped with paint in every colour, and a
      // brush tucked into the band.
      const sl = Math.sin(t * 1.2) * R * 0.04;
      // Brush tucked into the band behind.
      g.lineStyle(1.6 * s, 0x8a5a2a, 1); g.lineBetween(cx + R * 0.5, top + R * 0.25, cx + R * 1.15, top - R * 0.55);
      g.fillStyle(0xb8b8c0, 1); g.fillRect(cx + R * 1.05, top - R * 0.66, R * 0.14, R * 0.16);
      g.fillStyle(0x3a6ae8, 1); g.fillEllipse(cx + R * 1.2, top - R * 0.76, R * 0.12, R * 0.22);
      // Band.
      g.fillStyle(dim(a, 0.45), 1); g.fillEllipse(cx, top + R * 0.28, R * 1.75, R * 0.36);
      g.fillStyle(dim(a, 0.25), 1); g.fillEllipse(cx, top + R * 0.24, R * 1.7, R * 0.28);
      // Slouching crown: a big disc offset to the left, falling over the band.
      const kx = cx - R * 0.32 + sl, ky = top - R * 0.12;
      g.fillStyle(dim(a, 0.4), 1); g.fillEllipse(kx + R * 0.04, ky + R * 0.08, R * 2.5, R * 1.15);
      g.fillStyle(a, 1); g.fillEllipse(kx, ky, R * 2.45, R * 1.08);
      g.fillStyle(dim(a, 0.18), 1); g.fillEllipse(kx - R * 0.72, ky + R * 0.26, R * 1.0, R * 0.55);
      g.fillStyle(lit(a, 0.3), 0.8); g.fillEllipse(kx + R * 0.15, ky - R * 0.26, R * 1.3, R * 0.36);
      g.fillStyle(lit(a, 0.55), 0.5); g.fillEllipse(kx + R * 0.3, ky - R * 0.32, R * 0.55, R * 0.12);
      g.lineStyle(0.8 * s, dim(a, 0.5), 0.6);
      g.beginPath(); g.arc(kx - R * 0.2, ky + R * 0.1, R * 0.7, Math.PI * 0.75, Math.PI * 1.05, false); g.strokePath();
      // Stalk.
      g.lineStyle(1.6 * s, dim(a, 0.45), 1); g.lineBetween(kx + R * 0.1, ky - R * 0.46, kx + R * 0.18, ky - R * 0.68);
      // Paint flecks and drips.
      const pal = [0xe83a4a, 0xf0c020, 0x2a6ae8, 0x3ab85a, 0xf4f0e8, 0xe86ac8];
      const fl: [number, number, number][] = [[-0.9, 0.0, 0.08], [-0.4, -0.3, 0.06], [0.3, -0.1, 0.09], [0.75, 0.1, 0.05], [-0.1, 0.25, 0.07], [0.5, -0.32, 0.05], [-0.7, 0.3, 0.05], [0.05, -0.05, 0.04]];
      fl.forEach(([fx, fy, fr], k) => {
        const x = kx + fx * R, y = ky + fy * R;
        g.fillStyle(pal[k % pal.length], 1); g.fillCircle(x, y, R * fr);
        g.fillCircle(x + R * fr * 1.6, y - R * fr * 0.6, R * fr * 0.35);
        if (k % 3 === 0) { g.fillRect(x - R * 0.015, y, R * 0.03, R * 0.14); g.fillCircle(x, y + R * 0.15, R * 0.035); }
      });
      return;
    }
    case 'wreath': {
      // Wildflowers round the brow: a leafy band studded with blooms in the accent colour.
      g.lineStyle(3 * s, 0x5a8a3a, 1); g.strokeEllipse(cx, top + R * 0.12, R * 1.9, R * 0.5);
      for (let k = 0; k < 7; k++) {
        const an = Math.PI + (k / 6) * Math.PI, fx = cx + Math.cos(an) * R * 0.95, fy = top + R * 0.12 + Math.sin(an) * R * 0.25;
        g.fillStyle(k % 2 ? a : 0xfff0f6, 1); g.fillCircle(fx, fy, R * 0.16);
        g.fillStyle(0xffd84a, 1); g.fillCircle(fx, fy, R * 0.06);
      }
      return;
    }
    case 'antlers': {
      const bone = 0xd8c8a0;
      g.lineStyle(3.2 * s, bone, 1);
      for (const d of [-1, 1]) {
        const bx = cx + d * R * 0.45, by = top + R * 0.1;
        g.lineBetween(bx, by, bx + d * R * 0.7, by - R * 1.2);
        g.lineBetween(bx + d * R * 0.28, by - R * 0.48, bx + d * R * 0.05, by - R * 0.95);
        g.lineBetween(bx + d * R * 0.52, by - R * 0.88, bx + d * R * 1.05, by - R * 1.05);
        g.lineBetween(bx + d * R * 0.62, by - R * 1.05, bx + d * R * 0.45, by - R * 1.45);
      }
      return;
    }
    case 'mushroom': {
      g.fillStyle(dim(a, 0.3), 1); g.fillEllipse(cx, top + R * 0.25, R * 2.3, R * 0.5);
      g.fillStyle(a, 1);
      g.beginPath(); g.arc(cx, top + R * 0.25, R * 1.15, Math.PI, Math.PI * 2, false); g.closePath(); g.fillPath();
      g.fillStyle(0xfff6e8, 1);
      g.fillCircle(cx - R * 0.5, top - R * 0.2, R * 0.18); g.fillCircle(cx + R * 0.15, top - R * 0.55, R * 0.22);
      g.fillCircle(cx + R * 0.65, top - R * 0.05, R * 0.14); g.fillCircle(cx - R * 0.1, top + R * 0.05, R * 0.1);
      return;
    }
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
