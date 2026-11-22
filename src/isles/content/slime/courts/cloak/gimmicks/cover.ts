import { dim, lit, shadow, type G } from '../../../../../art/IsleArt';
import { barrelArt } from './coverArt';

export type CoverKind = 'barrels' | 'crates' | 'pump' | 'cart';

/** Re-exported so fights can share the one set of street-cover painters. */
export { barrelArt };

/**
 * Street cover for the Cloak fights — the things an informer's lantern cannot see through: a
 * stack of rain-butts, a pile of crates, the square's iron pump and a laundry cart heaped with
 * wet cloaks. Deterministic (drawn every frame), base at (x, y).
 */
export function coverPiece(g: G, x: number, y: number, kind: CoverKind): void {
  shadow(g, x, y + 4, 80, 22, 0.35);
  switch (kind) {
    case 'barrels': {
      barrelArt(g, x - 16, y, 1);
      barrelArt(g, x + 16, y + 4, 1);
      barrelArt(g, x, y - 22, 0.95);
      break;
    }
    case 'crates': {
      const crate = (cx: number, cy: number, s: number, c: number) => {
        g.fillStyle(dim(c, 0.35), 1); g.fillRect(cx - 15 * s, cy - 28 * s, 30 * s, 28 * s);
        g.fillStyle(c, 1); g.fillRect(cx - 13 * s, cy - 26 * s, 26 * s, 24 * s);
        g.lineStyle(2 * s, dim(c, 0.4), 1);
        g.lineBetween(cx - 13 * s, cy - 26 * s, cx + 13 * s, cy - 2 * s); g.lineBetween(cx + 13 * s, cy - 26 * s, cx - 13 * s, cy - 2 * s);
        g.fillStyle(lit(c, 0.2), 0.7); g.fillRect(cx - 13 * s, cy - 26 * s, 26 * s, 3 * s);
        // A stencilled serpent: the Matriarch's freight.
        g.lineStyle(1.4 * s, 0x9ee03a, 0.5); g.beginPath(); g.arc(cx, cy - 14 * s, 5 * s, 0.4, Math.PI * 1.6, false); g.strokePath();
      };
      crate(x - 16, y, 1, 0x5a4630);
      crate(x + 15, y + 2, 1, 0x4e3c2a);
      crate(x, y - 26, 0.9, 0x62503a);
      break;
    }
    case 'pump': {
      // A cast-iron street pump on a stone step, trough at its foot, a drip from the spout.
      g.fillStyle(0x4a4452, 1); g.fillRect(x - 30, y - 10, 60, 12);
      g.fillStyle(0x6a6470, 1); g.fillRect(x - 30, y - 12, 60, 4);
      g.fillStyle(0x26222c, 1); g.fillRect(x + 4, y - 22, 28, 12);
      g.fillStyle(0x1c2a2c, 1); g.fillRect(x + 6, y - 20, 24, 8);
      g.fillStyle(0x2a2a30, 1); g.fillRect(x - 10, y - 64, 18, 54);
      g.fillStyle(0x5a5a66, 0.6); g.fillRect(x - 10, y - 64, 5, 54);
      g.fillStyle(0x2a2a30, 1); g.fillEllipse(x - 1, y - 66, 24, 10); g.fillCircle(x - 1, y - 72, 5);
      g.lineStyle(4, 0x2a2a30, 1); g.lineBetween(x + 8, y - 50, x + 20, y - 46);
      g.lineStyle(3, 0x2a2a30, 1); g.lineBetween(x - 10, y - 58, x - 30, y - 74);
      g.fillStyle(0x2a2a30, 1); g.fillCircle(x - 30, y - 74, 3);
      g.fillStyle(0x9ab0b8, 0.7); g.fillCircle(x + 20, y - 36, 1.6);
      break;
    }
    case 'cart': {
      // A laundry cart heaped with wet cloaks, one wheel, its shafts on the cobbles.
      g.lineStyle(3, 0x33261d, 1); g.lineBetween(x - 34, y - 12, x - 60, y - 2); g.lineBetween(x - 34, y - 20, x - 60, y - 10);
      g.fillStyle(0x33261d, 1); g.fillRect(x - 36, y - 30, 72, 22);
      g.fillStyle(0x4f3c2d, 1); g.fillRect(x - 34, y - 28, 68, 4);
      const cloaks = [0x3b2a4c, 0x2a3c3c, 0x4c2a2c, 0x262a3e, 0x56483a];
      for (let i = 0; i < 7; i++) {
        const cx = x - 28 + i * 9.5, cy = y - 32 - (i % 3) * 7 - (i === 3 ? 8 : 0);
        g.fillStyle(cloaks[i % cloaks.length], 1); g.fillEllipse(cx, cy, 22, 14);
        g.fillStyle(dim(cloaks[i % cloaks.length], 0.3), 0.8); g.fillEllipse(cx + 2, cy + 3, 14, 5);
      }
      g.fillStyle(0x1e1610, 1); g.fillCircle(x + 22, y - 6, 12);
      g.fillStyle(0x4f3c2d, 1); g.fillCircle(x + 22, y - 6, 9);
      g.lineStyle(1.5, 0x1e1610, 1); for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI; g.lineBetween(x + 22 - Math.cos(a) * 9, y - 6 - Math.sin(a) * 9, x + 22 + Math.cos(a) * 9, y - 6 + Math.sin(a) * 9); }
      g.fillStyle(0x9ab0b8, 0.6); g.fillCircle(x - 10, y - 4, 1.4); g.fillCircle(x + 4, y - 2, 1.2);
      break;
    }
  }
}
