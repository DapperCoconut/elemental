import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import {
  BONE, BOARD, BOARD_DARK, BOARD_LIT, BRASS, BRASS_DARK, BRASS_LIT, CISTERN, CISTERN_LIT, CLOAKS, COBBLE, COBBLE_DARK,
  COBBLE_LIT, FLAG, FLAG_DARK, FLAG_LIT, INK, IRON, IRON_LIT, LAMP, LAMP_DEEP, MASK_BLACK, MASK_GOLD, MASK_WHITE,
  MIRE, MIRE_LIT, MIRE_SHEEN, MOSS, MOSS_DARK, PAPER, PAPER_DARK, PLASTER, PLASTER_DARK, PLASTER_LIT, ROOF, ROOF_LIT,
  SHUTTER, SHUTTER_LIT, SUGAR, TIMBER, TIMBER_DARK, TIMBER_LIT, VENOM, WAX, WAX_DARK, WAX_LIT, WINE, WINE_LIT,
} from './palette';

/**
 * Cloak set pieces — the shapes only a town of listeners has. Everything is *closed*: shutters
 * latched with eye-holes bored through them, doors with grilles, letters folded and sealed. And
 * everything *listens*: brass ear-trumpets on posts at the corners, horns poking out of upper
 * windows, a gallery whose every niche is a mouth. Where something is open — a lit window, a
 * cracked shutter — someone is watching through it, and a glint says so.
 */

// ── Small things ─────────────────────────────────────────────────────

/** A folded letter, turned `rot` radians, sealed in red wax (or broken open). */
export function letter(g: G, x: number, y: number, s: number, rot: number, sealed = true, a = 1): void {
  const c = Math.cos(rot), si = Math.sin(rot);
  const P = (dx: number, dy: number): Pt => ({ x: x + dx * c - dy * si, y: y + dx * si + dy * c });
  const w = 9 * s, h = 6 * s;
  const corners = [P(-w, -h), P(w, -h), P(w, h), P(-w, h)];
  g.fillStyle(PAPER_DARK, a); g.fillPoints(corners.map((p) => ({ x: p.x + 1, y: p.y + 1.5 })), true);
  g.fillStyle(PAPER, a); g.fillPoints(corners, true);
  // The fold: a shallow V from the top corners.
  const v = P(0, h * 0.25);
  g.lineStyle(Math.max(0.8, s * 0.7), PAPER_DARK, a);
  g.lineBetween(corners[0].x, corners[0].y, v.x, v.y); g.lineBetween(corners[1].x, corners[1].y, v.x, v.y);
  if (sealed) {
    g.fillStyle(WAX_DARK, a); g.fillCircle(v.x + 0.5, v.y + 0.8, 2.6 * s);
    g.fillStyle(WAX, a); g.fillCircle(v.x, v.y, 2.4 * s);
    g.fillStyle(WAX_LIT, a * 0.8); g.fillCircle(v.x - 0.7 * s, v.y - 0.7 * s, 0.8 * s);
  } else {
    // A broken seal: two red crumbs.
    g.fillStyle(WAX, a); g.fillCircle(v.x - 2 * s, v.y, 1.2 * s); g.fillCircle(v.x + 1.6 * s, v.y + 0.6 * s, 1 * s);
  }
}

/** A nail through a letter: a dark head with a bright point. */
export function nail(g: G, x: number, y: number, s = 1): void {
  g.fillStyle(IRON, 1); g.fillCircle(x, y, 1.6 * s);
  g.fillStyle(IRON_LIT, 1); g.fillCircle(x - 0.4 * s, y - 0.4 * s, 0.6 * s);
}

const MASK_TEAR = 0x4a7aa8;

export type MaskKind = 'volto' | 'domino' | 'beak' | 'serpent' | 'moon' | 'weeping' | 'grin' | 'bauta';
export const MASK_KINDS: MaskKind[] = ['volto', 'domino', 'beak', 'serpent', 'moon', 'weeping', 'grin', 'bauta'];

/**
 * A mask, centred on the eyes, about 22×28 px at s = 1. Every kind has its own shape — a
 * listener at a distance should be able to tell a beak from a bauta.
 */
export function mask(g: G, x: number, y: number, s: number, kind: MaskKind, color: number, a = 1): void {
  const sh = dim(color, 0.35), hi = lit(color, 0.35), hole = MASK_BLACK;
  const eyes = (dy = 0, w = 4, h = 2.4) => {
    g.fillStyle(hole, a);
    g.fillEllipse(x - 4.5 * s, y + dy * s, w * s, h * s); g.fillEllipse(x + 4.5 * s, y + dy * s, w * s, h * s);
  };
  switch (kind) {
    case 'domino': {
      // A band across the eyes with swept points and ribbon ties.
      const pts: Pt[] = [
        { x: x - 12 * s, y: y - 3 * s }, { x: x - 4 * s, y: y - 5 * s }, { x, y: y - 3 * s }, { x: x + 4 * s, y: y - 5 * s },
        { x: x + 12 * s, y: y - 3 * s }, { x: x + 9 * s, y: y + 3 * s }, { x: x + 2 * s, y: y + 2 * s }, { x, y: y + 4 * s },
        { x: x - 2 * s, y: y + 2 * s }, { x: x - 9 * s, y: y + 3 * s },
      ];
      g.fillStyle(sh, a); g.fillPoints(pts.map((p) => ({ x: p.x, y: p.y + 1 })), true);
      g.fillStyle(color, a); g.fillPoints(pts, true);
      g.lineStyle(1.2 * s, color, a); g.lineBetween(x - 12 * s, y - 2 * s, x - 16 * s, y + 6 * s); g.lineBetween(x + 12 * s, y - 2 * s, x + 16 * s, y + 6 * s);
      eyes(-0.5, 4.4, 2.2);
      g.fillStyle(hi, a * 0.7); g.fillRect(x - 9 * s, y - 3.5 * s, 4 * s, 1 * s);
      break;
    }
    case 'beak': {
      // A plague beak: round lenses, a long hooked bill.
      g.fillStyle(sh, a); g.fillEllipse(x, y + 1 * s, 20 * s, 18 * s);
      g.fillStyle(color, a); g.fillEllipse(x, y, 19 * s, 16 * s);
      g.fillStyle(sh, a); g.fillTriangle(x - 4 * s, y + 3 * s, x + 4 * s, y + 3 * s, x + 2 * s, y + 20 * s);
      g.fillStyle(color, a); g.fillTriangle(x - 3.5 * s, y + 2 * s, x + 3 * s, y + 2 * s, x + 1.5 * s, y + 18 * s);
      g.lineStyle(0.8 * s, sh, a); g.lineBetween(x - 1 * s, y + 5 * s, x + 1 * s, y + 15 * s);
      for (const k of [-1, 1]) {
        g.fillStyle(BRASS, a); g.fillCircle(x + k * 4.5 * s, y - 1 * s, 3.6 * s);
        g.fillStyle(0x30402e, a); g.fillCircle(x + k * 4.5 * s, y - 1 * s, 2.6 * s);
        g.fillStyle(0xffffff, a * 0.6); g.fillCircle(x + k * 4.5 * s - 1 * s, y - 2 * s, 0.8 * s);
      }
      break;
    }
    case 'serpent': {
      // A long scaled face, slit eyes, two fangs at the jaw — the Matriarch's own.
      g.fillStyle(sh, a); g.fillEllipse(x, y + 3 * s, 18 * s, 26 * s);
      g.fillStyle(color, a); g.fillEllipse(x, y + 2 * s, 17 * s, 24 * s);
      for (let r = 0; r < 4; r++) for (let k = -1; k <= 1; k++) {
        g.lineStyle(0.7 * s, sh, a * 0.8);
        g.beginPath(); g.arc(x + k * 4 * s + (r % 2) * 2 * s, y - 6 * s + r * 4.5 * s, 2.2 * s, 0, Math.PI, false); g.strokePath();
      }
      g.fillStyle(VENOM, a); g.fillEllipse(x - 4.5 * s, y - 1 * s, 4.6 * s, 2.6 * s); g.fillEllipse(x + 4.5 * s, y - 1 * s, 4.6 * s, 2.6 * s);
      g.fillStyle(hole, a); g.fillRect(x - 4.8 * s, y - 2.2 * s, 0.8 * s, 2.6 * s); g.fillRect(x + 4.2 * s, y - 2.2 * s, 0.8 * s, 2.6 * s);
      g.fillStyle(BONE, a); g.fillTriangle(x - 3 * s, y + 11 * s, x - 1.5 * s, y + 11 * s, x - 2.3 * s, y + 16 * s);
      g.fillTriangle(x + 1.5 * s, y + 11 * s, x + 3 * s, y + 11 * s, x + 2.3 * s, y + 16 * s);
      break;
    }
    case 'moon': {
      // A crescent face in profile, a single eye, a star on the brow.
      g.fillStyle(sh, a); g.fillCircle(x, y + 1 * s, 12 * s);
      g.fillStyle(color, a); g.fillCircle(x, y, 12 * s);
      g.fillStyle(MASK_BLACK, a * 0.85); g.fillCircle(x + 6 * s, y - 2 * s, 10 * s);
      g.fillStyle(hole, a); g.fillEllipse(x - 4 * s, y - 1 * s, 3.4 * s, 2 * s);
      g.lineStyle(1 * s, sh, a); g.lineBetween(x - 7 * s, y + 5 * s, x - 3 * s, y + 6 * s);
      g.fillStyle(MASK_GOLD, a); g.fillCircle(x - 6 * s, y - 8 * s, 1.4 * s);
      break;
    }
    case 'grin': {
      g.fillStyle(sh, a); g.fillEllipse(x, y + 4 * s, 22 * s, 27 * s);
      g.fillStyle(color, a); g.fillEllipse(x, y + 3 * s, 21 * s, 25 * s);
      eyes(-1, 4.6, 3.4);
      // A carved grin from ear to ear, teeth marked.
      g.fillStyle(hole, a);
      g.beginPath(); g.arc(x, y + 6 * s, 8 * s, 0.15, Math.PI - 0.15, false); g.closePath(); g.fillPath();
      g.lineStyle(0.8 * s, color, a); for (let i = -3; i <= 3; i++) g.lineBetween(x + i * 2.2 * s, y + 6.5 * s, x + i * 2.2 * s, y + 10 * s);
      g.fillStyle(WAX, a * 0.8); g.fillCircle(x - 7 * s, y + 4 * s, 1.6 * s); g.fillCircle(x + 7 * s, y + 4 * s, 1.6 * s);
      break;
    }
    case 'bauta': {
      // A square jaw that juts, no mouth at all — the speaker's mask.
      const pts: Pt[] = [
        { x: x - 9 * s, y: y - 10 * s }, { x: x + 9 * s, y: y - 10 * s }, { x: x + 10 * s, y: y + 4 * s },
        { x: x + 6 * s, y: y + 15 * s }, { x: x - 6 * s, y: y + 15 * s }, { x: x - 10 * s, y: y + 4 * s },
      ];
      g.fillStyle(sh, a); g.fillPoints(pts.map((p) => ({ x: p.x + 1, y: p.y + 1 })), true);
      g.fillStyle(color, a); g.fillPoints(pts, true);
      eyes(-2, 4.2, 2.4);
      g.lineStyle(1 * s, sh, a); g.lineBetween(x, y - 1 * s, x + 1.5 * s, y + 6 * s); g.lineBetween(x - 6 * s, y + 9 * s, x + 6 * s, y + 9 * s);
      g.fillStyle(hi, a * 0.6); g.fillRect(x - 8 * s, y - 9 * s, 5 * s, 1.2 * s);
      break;
    }
    case 'weeping':
    case 'volto':
    default: {
      // The plain full face: smooth, closed lips, a ridge of nose.
      g.fillStyle(sh, a); g.fillEllipse(x, y + 4 * s, 20 * s, 27 * s);
      g.fillStyle(color, a); g.fillEllipse(x, y + 3 * s, 19 * s, 25 * s);
      g.fillStyle(hi, a * 0.5); g.fillEllipse(x - 3 * s, y - 2 * s, 7 * s, 10 * s);
      eyes(-1, 4.2, 2.2);
      g.lineStyle(0.9 * s, sh, a); g.lineBetween(x, y, x + 1 * s, y + 5 * s);
      g.fillStyle(sh, a); g.fillEllipse(x, y + 9 * s, 5 * s, 1.6 * s);
      if (kind === 'weeping') {
        g.fillStyle(MASK_TEAR, a); g.fillTriangle(x - 5 * s, y + 1 * s, x - 3.8 * s, y + 1 * s, x - 4.6 * s, y + 8 * s);
        g.fillCircle(x - 4.6 * s, y + 8 * s, 1 * s);
        g.fillStyle(MASK_GOLD, a); g.fillCircle(x + 4.5 * s, y - 6 * s, 1 * s);
      }
      break;
    }
  }
}
/**
 * A cloaked figure, feet at (x, y): a bell of cloak, a hood, a face or a mask in the hood's
 * shadow. `lean` tips the head (–1..1); `arm` raises one arm out of the cloak (0..1).
 */
export function figure(
  g: G, x: number, y: number, s: number, cloak: number,
  o: { mask?: MaskKind; maskColor?: number; hood?: boolean; lean?: number; arm?: number; a?: number; eyeGlint?: boolean } = {},
): void {
  const a = o.a ?? 1;
  const lean = (o.lean ?? 0) * 4 * s;
  shadow(g, x, y + 1, 30 * s, 9 * s, 0.3 * a);
  // The cloak: a bell, wider at the hem, folds marked.
  const hem = 14 * s, top = y - 36 * s;
  g.fillStyle(dim(cloak, 0.35), a);
  g.fillTriangle(x - hem - 1, y, x + hem + 1, y, x + lean, top - 2);
  g.fillStyle(cloak, a);
  g.fillTriangle(x - hem, y - 1, x + hem, y - 1, x + lean, top);
  g.fillEllipse(x, y - 2, hem * 2, 6 * s);
  g.lineStyle(1, dim(cloak, 0.3), a * 0.8);
  g.lineBetween(x - 4 * s, y - 2, x - 2 * s + lean * 0.5, top + 14 * s);
  g.lineBetween(x + 5 * s, y - 2, x + 2 * s + lean * 0.5, top + 16 * s);
  g.fillStyle(lit(cloak, 0.18), a * 0.6); g.fillTriangle(x - hem * 0.8, y - 2, x - hem * 0.3, y - 2, x + lean - 2 * s, top + 6 * s);
  // An arm out of the cloak, a pale hand.
  if (o.arm && o.arm > 0) {
    const hx = x + 12 * s, hy = y - 20 * s - o.arm * 14 * s;
    g.lineStyle(4 * s, dim(cloak, 0.1), a); g.lineBetween(x + 5 * s, y - 22 * s, hx, hy);
    g.fillStyle(0xd8c8b4, a); g.fillCircle(hx, hy, 2.6 * s);
  }
  // Head: a hood with a dark mouth, the face (or mask) inside it.
  const hx = x + lean, hy = top - 4 * s;
  if (o.hood !== false) {
    g.fillStyle(dim(cloak, 0.2), a); g.fillEllipse(hx, hy, 18 * s, 20 * s);
    g.fillTriangle(hx - 8 * s, hy - 4 * s, hx + 8 * s, hy - 4 * s, hx + 3 * s, hy - 15 * s);
    g.fillStyle(0x0b0910, a); g.fillEllipse(hx, hy + 2 * s, 12 * s, 13 * s);
  }
  if (o.mask) mask(g, hx, hy + 1 * s, 0.48 * s, o.mask, o.maskColor ?? MASK_WHITE, a);
  else if (o.eyeGlint !== false) {
    g.fillStyle(0xfff0c8, a * 0.9); g.fillCircle(hx - 2.4 * s, hy + 1 * s, 0.9 * s); g.fillCircle(hx + 2.4 * s, hy + 1 * s, 0.9 * s);
  }
}

// ── Street furniture ─────────────────────────────────────────────────

/**
 * An ear-trumpet on an iron post: a brass horn, its bell flared toward `dir` (radians), the
 * tube coiled once behind it down to an earpiece at a listener's height. Polished bright where
 * people lean on it.
 */
export function earTrumpet(g: G, x: number, y: number, s: number, dir: number, h = 52): void {
  shadow(g, x, y + 1, 22 * s, 7 * s);
  g.fillStyle(IRON, 1); g.fillRect(x - 2 * s, y - h * s, 4 * s, h * s);
  g.fillStyle(IRON_LIT, 0.5); g.fillRect(x - 2 * s, y - h * s, 1.2 * s, h * s);
  g.fillStyle(IRON, 1); g.fillEllipse(x, y, 12 * s, 4 * s);
  const ty = y - h * s;
  // The coil: a loop of brass tube behind the post.
  g.lineStyle(3 * s, BRASS_DARK, 1); g.strokeCircle(x, ty + 10 * s, 6 * s);
  g.lineStyle(2 * s, BRASS, 1); g.strokeCircle(x, ty + 9.5 * s, 6 * s);
  // The earpiece, hanging at a stooping head's height.
  g.lineStyle(2 * s, BRASS, 1); g.lineBetween(x - 6 * s, ty + 12 * s, x - 9 * s, ty + 22 * s);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x - 9 * s, ty + 23 * s, 2.4 * s);
  // The horn: a tapering tube out to a flared bell.
  const cx = Math.cos(dir), cy = Math.sin(dir) * 0.6;
  const bx = x + cx * 20 * s, by = ty + cy * 20 * s - 4 * s;
  g.lineStyle(4 * s, BRASS_DARK, 1); g.lineBetween(x, ty + 2 * s, bx, by + 1);
  g.lineStyle(3 * s, BRASS, 1); g.lineBetween(x, ty + 1 * s, bx, by);
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(bx + cx * 2 * s, by, (8 + Math.abs(cx) * 2) * s, 14 * s);
  g.fillStyle(BRASS, 1); g.fillEllipse(bx + cx * 3 * s, by - 0.5, (7 + Math.abs(cx) * 2) * s, 13 * s);
  g.fillStyle(0x1a140c, 1); g.fillEllipse(bx + cx * 4 * s, by, 4.5 * s * Math.max(0.4, Math.abs(cx)), 9 * s);
  g.fillStyle(BRASS_LIT, 0.9); g.fillEllipse(bx + cx * 2 * s - 1.5 * s, by - 4 * s, 2.4 * s, 3 * s);
  // A little enamel plaque on the post: the Matriarch's two dots — the Mark.
  g.fillStyle(PAPER_DARK, 1); g.fillRect(x - 4 * s, y - h * s * 0.5, 8 * s, 6 * s);
  g.fillStyle(WAX_DARK, 1); g.fillCircle(x - 1.5 * s, y - h * s * 0.5 + 3 * s, 0.9 * s); g.fillCircle(x + 1.5 * s, y - h * s * 0.5 + 3 * s, 0.9 * s);
}

/** A wrought-iron lamp post with a hanging box lantern; the light itself is laid by `lampGlow`. */
export function lampPost(g: G, x: number, y: number, s = 1): void {
  shadow(g, x, y + 1, 18 * s, 6 * s);
  g.fillStyle(IRON, 1); g.fillRect(x - 2.5 * s, y - 70 * s, 5 * s, 70 * s);
  g.fillEllipse(x, y, 14 * s, 5 * s);
  g.fillStyle(IRON_LIT, 0.5); g.fillRect(x - 2.5 * s, y - 70 * s, 1.2 * s, 70 * s);
  // Arm, curled at the end like a fern.
  g.lineStyle(2.5 * s, IRON, 1); g.lineBetween(x, y - 66 * s, x + 16 * s, y - 66 * s);
  g.beginPath(); g.arc(x + 16 * s, y - 62 * s, 4 * s, -Math.PI / 2, Math.PI, false); g.strokePath();
  // The lantern: iron cap, four amber panes, a drip tray.
  const lx = x + 16 * s, ly = y - 56 * s;
  g.lineStyle(1 * s, IRON, 1); g.lineBetween(lx, y - 66 * s, lx, ly - 8 * s);
  g.fillStyle(IRON, 1); g.fillTriangle(lx - 7 * s, ly - 6 * s, lx + 7 * s, ly - 6 * s, lx, ly - 12 * s);
  g.fillStyle(LAMP_DEEP, 1); g.fillRect(lx - 5 * s, ly - 6 * s, 10 * s, 12 * s);
  g.fillStyle(LAMP, 0.95); g.fillRect(lx - 4 * s, ly - 5 * s, 3.4 * s, 10 * s); g.fillRect(lx + 0.6 * s, ly - 5 * s, 3.4 * s, 10 * s);
  g.fillStyle(0xfff4d0, 0.9); g.fillRect(lx - 1 * s, ly - 2 * s, 2 * s, 4 * s);
  g.fillStyle(IRON, 1); g.fillRect(lx - 6 * s, ly + 6 * s, 12 * s, 2 * s);
}

/** Where `lampPost` hangs its lantern, for the animated glow. */
export const lampAt = (x: number, y: number, s = 1): Pt => ({ x: x + 16 * s, y: y - 56 * s });

/** A soft, breathing pool of lamplight in the murk (animate layer). */
export function lampGlow(g: G, x: number, y: number, t: number, seed: number): void {
  const fl = 0.85 + Math.sin(t * 7 + seed) * 0.08 + Math.sin(t * 13.3 + seed * 2) * 0.05;
  glow(g, x, y, 60 * fl, LAMP, 0.035, 4);
  g.fillStyle(LAMP, 0.05 * fl); g.fillEllipse(x, y + 56, 90 * fl, 26 * fl);
}

/** A tall pole for a washing line (the line itself is strung in `animateOver`). */
export function linePole(g: G, x: number, y: number, h: number): void {
  shadow(g, x, y + 1, 14, 5);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 3, y - h, 6, h);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 2, y - h, 3, h);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 8, y - h + 2, 16, 3);
  g.fillStyle(MOSS, 0.6); g.fillRect(x - 3, y - 10, 6, 10);
}

/**
 * A washing line strung between two poles' tops, sagging, with cloaks pegged along it, swaying
 * and dripping. `t` in seconds. Drawn over actors, so people walk under the hems.
 */
export function washLine(g: G, ax: number, ay: number, bx: number, by: number, t: number, seed: number, n = 5): void {
  const sag = 26;
  const at = (k: number): Pt => ({ x: ax + (bx - ax) * k, y: ay + (by - ay) * k + Math.sin(k * Math.PI) * sag });
  g.lineStyle(1.2, 0x1a1612, 0.9);
  let prev = at(0);
  for (let i = 1; i <= 16; i++) { const p = at(i / 16); g.lineBetween(prev.x, prev.y, p.x, p.y); prev = p; }
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n;
    const p = at(k);
    const sway = Math.sin(t * 1.3 + seed + i * 1.7) * 0.12;
    const c = CLOAKS[(i + Math.floor(seed)) % CLOAKS.length];
    const len = 34 + ((i * 7 + seed * 3) % 10);
    const w = 22;
    const hx = p.x + Math.sin(sway) * len, hy = p.y + Math.cos(sway) * len;
    // The cloak: shoulders on the line, hem swinging; the hood hangs down the back.
    g.fillStyle(dim(c, 0.35), 0.95);
    g.fillTriangle(p.x - w / 2, p.y, p.x + w / 2, p.y, hx + w * 0.7, hy);
    g.fillTriangle(p.x - w / 2, p.y, hx - w * 0.7, hy, hx + w * 0.7, hy);
    g.fillStyle(c, 0.95);
    g.fillTriangle(p.x - w / 2 + 2, p.y + 1, p.x + w / 2 - 2, p.y + 1, hx + w * 0.6, hy - 2);
    g.fillTriangle(p.x - w / 2 + 2, p.y + 1, hx - w * 0.6, hy - 2, hx + w * 0.6, hy - 2);
    g.fillStyle(dim(c, 0.25), 1); g.fillEllipse(p.x, p.y + 7, 10, 10);
    g.lineStyle(1, dim(c, 0.4), 0.8); g.lineBetween(p.x - 3, p.y + 12, hx - 4, hy - 3); g.lineBetween(p.x + 4, p.y + 12, hx + 5, hy - 3);
    // Pegs.
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(p.x - w / 2 + 1, p.y - 3, 2, 5); g.fillRect(p.x + w / 2 - 3, p.y - 3, 2, 5);
    // A drip falling from the hem.
    const ph = (t * 0.9 + i * 0.37 + seed) % 1;
    g.fillStyle(0x9ab0b8, 0.7 * (1 - ph)); g.fillCircle(hx + ((i % 3) - 1) * 6, hy + ph * 50, 1.3);
  }
}

/** A board-and-iron lid on the mire with a dropped rope — the duckboard junctions. */
export function mooringPost(g: G, x: number, y: number): void {
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 4, y - 26, 8, 26);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 3, y - 26, 4, 26);
  g.fillStyle(TIMBER_LIT, 1); g.fillEllipse(x, y - 26, 8, 3);
  g.lineStyle(2, 0x6a5a40, 1); g.strokeEllipse(x, y - 12, 12, 5);
  g.fillStyle(MOSS, 0.7); g.fillRect(x - 4, y - 6, 8, 6);
}

// ── Ground ───────────────────────────────────────────────────────────

/** Wet slate cobbles in a rect: rounded setts, every one with a sheen, puddles in the dips. */
export function cobbles(g: G, r: Rect, rng: () => number, size = 14): void {
  g.fillStyle(COBBLE_DARK, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let y = r.y + size / 2; y < r.y + r.h; y += size * 0.78) {
    const off = ((y / size) | 0) % 2 ? size / 2 : 0;
    for (let x = r.x + off; x < r.x + r.w; x += size) {
      const c = mixC(COBBLE, rng() < 0.5 ? COBBLE_LIT : COBBLE_DARK, rng() * 0.45);
      g.fillStyle(c, 1); g.fillEllipse(x, y, size * 0.86, size * 0.62);
      if (rng() < 0.4) { g.fillStyle(COBBLE_LIT, 0.35); g.fillEllipse(x - size * 0.16, y - size * 0.12, size * 0.3, size * 0.14); }
    }
  }
  // Puddles in the dips, each with a cold sheen.
  for (let i = 0; i < (r.w * r.h) / 26000; i++) {
    const px = r.x + 20 + rng() * (r.w - 40), py = r.y + 10 + rng() * (r.h - 20), pw = 18 + rng() * 40;
    g.fillStyle(MIRE, 0.7); g.fillEllipse(px, py, pw, pw * 0.36);
    g.fillStyle(MIRE_LIT, 0.6); g.fillEllipse(px - pw * 0.12, py - 1, pw * 0.5, pw * 0.12);
  }
}

/** A street of cobbles along a polyline (each leg an axis-aligned rect, kerbed). */
export function street(g: G, pts: Pt[], w: number, rng: () => number): void {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const r: Rect = a.x === b.x
      ? { x: a.x - w / 2, y: Math.min(a.y, b.y) - w / 2, w, h: Math.abs(b.y - a.y) + w }
      : { x: Math.min(a.x, b.x) - w / 2, y: a.y - w / 2, w: Math.abs(b.x - a.x) + w, h: w };
    g.fillStyle(FLAG_DARK, 1); g.fillRect(r.x - 5, r.y - 5, r.w + 10, r.h + 10);
    cobbles(g, r, rng);
    g.lineStyle(2, FLAG, 0.7); g.strokeRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6);
  }
}

/** Duckboards: planks laid crosswise along a polyline over the mire, two rails beneath. */
export function duckboards(g: G, pts: Pt[], w: number, rng: () => number): void {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len, nx = -uy, ny = ux;
    for (const k of [-0.36, 0.36]) {
      g.lineStyle(4, BOARD_DARK, 1);
      g.lineBetween(a.x + nx * w * k, a.y + ny * w * k, b.x + nx * w * k, b.y + ny * w * k);
    }
    for (let d = 0; d < len; d += 13) {
      const cx = a.x + ux * d, cy = a.y + uy * d;
      const jog = (rng() - 0.5) * 4;
      const c = mixC(BOARD, rng() < 0.5 ? BOARD_LIT : BOARD_DARK, rng() * 0.5);
      g.lineStyle(10, BOARD_DARK, 1);
      g.lineBetween(cx - nx * (w / 2 + jog), cy - ny * (w / 2 + jog), cx + nx * (w / 2 - jog), cy + ny * (w / 2 - jog));
      g.lineStyle(8, c, 1);
      g.lineBetween(cx - nx * (w / 2 + jog - 1), cy - ny * (w / 2 + jog - 1), cx + nx * (w / 2 - jog - 1), cy + ny * (w / 2 - jog - 1));
      if (rng() < 0.25) { g.fillStyle(MOSS, 0.5); g.fillCircle(cx + nx * (rng() - 0.5) * w, cy + ny * (rng() - 0.5) * w, 3); }
    }
  }
}

/** Black mire: still water, a scum of duckweed at the edges, a sheen of marsh gas. */
export function mire(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(MIRE, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let i = 0; i < (r.w * r.h) / 4000; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    g.fillStyle(rng() < 0.5 ? MIRE_LIT : 0x12201a, 0.5); g.fillEllipse(x, y, 30 + rng() * 60, 6 + rng() * 8);
  }
  for (let i = 0; i < (r.w * r.h) / 1800; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    g.fillStyle(rng() < 0.6 ? MOSS : 0x5a7a34, 0.55); g.fillCircle(x, y, 1.2 + rng() * 2);
  }
  for (let i = 0; i < (r.w * r.h) / 30000; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    g.fillStyle(MIRE_SHEEN, 0.18); g.fillEllipse(x, y, 50 + rng() * 40, 10);
    g.fillStyle(0x8a6aa0, 0.08); g.fillEllipse(x + 8, y + 2, 40, 6);
  }
}

// ── Set pieces ───────────────────────────────────────────────────────

export interface HouseLook { wall: number; shutter: number; roof?: number; trumpet?: -1 | 0 | 1; lit?: boolean; storeys?: number }

/**
 * A shuttered house: two or three storeys of sweating plaster in black timber, the upper floor
 * jettied out over the street, every window shuttered and every shutter bored with a pair of
 * eye-holes (one pair in three has someone behind it — a glint). A grilled peephole in the
 * door; a horn poking from an upper window if `trumpet`; a single lit slit if `lit`. Returns the
 * door point.
 */
export function shutteredHouse(g: G, x: number, y: number, w: number, h: number, o: HouseLook, rng: () => number): Pt {
  const storeys = o.storeys ?? 2;
  const x0 = x - w / 2;
  const top = y - h;
  shadow(g, x, y + 4, w * 1.1, 22);
  // Ground storey.
  const jet = h * (storeys === 3 ? 0.36 : 0.48);
  g.fillStyle(dim(o.wall, 0.25), 1); g.fillRect(x0, y - jet, w, jet);
  g.fillStyle(o.wall, 1); g.fillRect(x0 + 2, y - jet, w - 4, jet - 6);
  // Upper storeys, jettied 8px out each side over a beam.
  const ux0 = x0 - 8, uw = w + 16;
  g.fillStyle(dim(o.wall, 0.15), 1); g.fillRect(ux0, top, uw, h - jet);
  g.fillStyle(lit(o.wall, 0.06), 1); g.fillRect(ux0 + 2, top + 2, uw - 4, h - jet - 6);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(ux0 - 2, y - jet - 6, uw + 4, 7);
  // Joist ends under the jetty.
  for (let jx = ux0 + 4; jx < ux0 + uw; jx += 12) { g.fillStyle(TIMBER, 1); g.fillRect(jx, y - jet + 1, 5, 4); }
  // Black timber framing: posts, a rail, braces.
  g.fillStyle(TIMBER, 1);
  g.fillRect(ux0, top, 5, h - jet); g.fillRect(ux0 + uw - 5, top, 5, h - jet);
  g.fillRect(x0, y - jet, 5, jet); g.fillRect(x0 + w - 5, y - jet, 5, jet);
  const rows = storeys - 1;
  for (let r = 1; r < rows; r++) g.fillRect(ux0, top + ((h - jet) * r) / rows - 3, uw, 5);
  g.lineStyle(3, TIMBER, 1);
  g.lineBetween(ux0 + 5, y - jet - 8, ux0 + 20, top + 6); g.lineBetween(ux0 + uw - 5, y - jet - 8, ux0 + uw - 20, top + 6);
  // Damp: streaks down from the eaves and a rising tide of green at the foot.
  for (let i = 0; i < w / 14; i++) {
    const sx = x0 + 6 + rng() * (w - 12);
    g.fillStyle(dim(o.wall, 0.3), 0.35); g.fillRect(sx, top + 4, 2, 20 + rng() * (h * 0.5));
  }
  g.fillStyle(MOSS, 0.45); g.fillRect(x0, y - 10, w, 10);
  g.fillStyle(MOSS_DARK, 0.5); for (let i = 0; i < w / 8; i++) g.fillCircle(x0 + rng() * w, y - 6 - rng() * 10, 2 + rng() * 2);
  // Windows: shutters, eye-holes, maybe a glint.
  const windows = (wy: number, wx0: number, ww: number) => {
    const n = Math.max(1, Math.round(ww / 46));
    for (let i = 0; i < n; i++) {
      const cx = wx0 + (ww * (i + 0.5)) / n;
      const sw = 13, sh = 22;
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(cx - sw - 2, wy - 2, sw * 2 + 4, sh + 5);
      for (const k of [-1, 1]) {
        const lx = k < 0 ? cx - sw : cx;
        g.fillStyle(o.shutter, 1); g.fillRect(lx + 0.5, wy, sw - 1, sh);
        g.lineStyle(1, dim(o.shutter, 0.35), 1); for (let d = 4; d < sh; d += 4) g.lineBetween(lx + 1.5, wy + d, lx + sw - 1.5, wy + d);
        g.fillStyle(lit(o.shutter, 0.2), 0.6); g.fillRect(lx + 1, wy, 1.5, sh);
      }
      // The pair of eye-holes, bored through at standing height.
      const ey = wy + 7;
      g.fillStyle(0x060508, 1); g.fillCircle(cx - 4, ey, 1.8); g.fillCircle(cx + 4, ey, 1.8);
      if (rng() < 0.34) { g.fillStyle(0xfff0c0, 0.95); g.fillCircle(cx - 4, ey, 0.8); g.fillCircle(cx + 4, ey, 0.8); }
      g.fillStyle(TIMBER_LIT, 1); g.fillRect(cx - sw - 3, wy + sh + 2, sw * 2 + 6, 3);
    }
  };
  for (let r = 0; r < rows; r++) windows(top + 10 + ((h - jet) * r) / rows, ux0 + 10, uw - 20);
  // The ground floor: a door with a grille and a window to one side.
  const doorX = x + (rng() < 0.5 ? -w * 0.18 : w * 0.18);
  const dh = Math.min(40, jet - 12);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(doorX - 13, y - dh - 4, 26, dh + 4);
  g.fillStyle(TIMBER, 1); g.fillRect(doorX - 11, y - dh - 2, 22, dh + 2);
  g.lineStyle(1, TIMBER_DARK, 1); for (let k = -6; k <= 6; k += 6) g.lineBetween(doorX + k, y - dh, doorX + k, y);
  g.fillStyle(IRON, 1); g.fillRect(doorX - 4, y - dh + 5, 8, 7);
  g.lineStyle(1, IRON_LIT, 1); g.lineBetween(doorX - 1.5, y - dh + 5, doorX - 1.5, y - dh + 12); g.lineBetween(doorX + 1.5, y - dh + 5, doorX + 1.5, y - dh + 12);
  g.fillStyle(BRASS, 1); g.fillCircle(doorX + 7, y - dh * 0.45, 1.6);
  g.fillStyle(FLAG, 1); g.fillRect(doorX - 15, y - 2, 30, 4);
  if (jet > 50) windows(y - jet + 12, doorX < x ? x + 4 : x0 + 10, w / 2 - 14);
  // A single lit slit: one shutter cracked, a line of lamplight.
  if (o.lit) {
    const lx = x0 + w * 0.7, ly = top + 12;
    g.fillStyle(LAMP, 0.9); g.fillRect(lx, ly, 2.5, 20);
    glow(g, lx + 1, ly + 10, 14, LAMP, 0.05, 3);
  }
  // Roof: steep slate gable with a ridge, courses of slate, a chimney, a gutter dripping.
  const roof = o.roof ?? 0x272130;
  const rh = Math.min(90, uw * 0.6);
  g.fillStyle(dim(roof, 0.3), 1); g.fillTriangle(ux0 - 10, top + 2, ux0 + uw + 10, top + 2, x, top - rh);
  g.fillStyle(roof, 1); g.fillTriangle(ux0 - 6, top, ux0 + uw + 6, top, x, top - rh + 4);
  for (let k = 1; k < 7; k++) {
    const yy = top - (rh * k) / 7, half = ((uw + 12) / 2) * (1 - k / 7);
    g.lineStyle(1, dim(roof, 0.4), 0.9); g.lineBetween(x - half, yy, x + half, yy);
    for (let sx = x - half + 6; sx < x + half; sx += 8) g.lineBetween(sx, yy, sx + 1, yy + rh / 7);
  }
  g.lineStyle(2, lit(roof, 0.2), 0.8); g.lineBetween(ux0 - 6, top, x, top - rh + 4);
  g.fillStyle(0x1c1820, 1); g.fillRect(ux0 - 8, top - 1, uw + 16, 3);
  const chx = x + uw * 0.22;
  g.fillStyle(PLASTER_DARK, 1); g.fillRect(chx - 6, top - rh * 0.62 - 18, 12, 22);
  g.fillStyle(0x1a1620, 1); g.fillRect(chx - 7, top - rh * 0.62 - 20, 14, 3);
  // A gable eye: a round attic hole, black, and sometimes a horn out of it.
  g.fillStyle(0x0a080c, 1); g.fillCircle(x, top - rh * 0.4, 5);
  if (o.trumpet) {
    const d = o.trumpet;
    g.lineStyle(3, BRASS_DARK, 1); g.lineBetween(x, top - rh * 0.4, x + d * 22, top - rh * 0.4 + 6);
    g.fillStyle(BRASS, 1); g.fillEllipse(x + d * 25, top - rh * 0.4 + 6, 8, 14);
    g.fillStyle(0x1a140c, 1); g.fillEllipse(x + d * 26, top - rh * 0.4 + 6, 4, 9);
  }
  return { x: doorX, y: y + 16 };
}

/**
 * The Asp's Mouth — the denunciation box. A squat stone stele whose top is carved as a serpent's
 * head, jaws wide: the mouth is the letter slot. Letters jut from between the fangs where the
 * box is fuller than it is emptied; a padlocked iron door in the plinth; a carved line of the
 * Matriarch's two dots. Wax drips down the stone.
 */
export function aspsMouth(g: G, x: number, y: number, s = 1): void {
  shadow(g, x, y + 2, 60 * s, 16 * s);
  // Plinth.
  g.fillStyle(FLAG_DARK, 1); g.fillRect(x - 24 * s, y - 16 * s, 48 * s, 16 * s);
  g.fillStyle(FLAG, 1); g.fillRect(x - 22 * s, y - 18 * s, 44 * s, 4 * s);
  // The stele.
  g.fillStyle(dim(BONE, 0.5), 1); g.fillRect(x - 17 * s, y - 86 * s, 34 * s, 70 * s);
  g.fillStyle(dim(BONE, 0.35), 1); g.fillRect(x - 15 * s, y - 86 * s, 30 * s, 68 * s);
  g.fillStyle(dim(BONE, 0.2), 0.7); g.fillRect(x - 15 * s, y - 86 * s, 6 * s, 68 * s);
  // The iron door, padlocked.
  g.fillStyle(IRON, 1); g.fillRect(x - 9 * s, y - 46 * s, 18 * s, 24 * s);
  g.lineStyle(1, IRON_LIT, 0.7); g.strokeRect(x - 9 * s, y - 46 * s, 18 * s, 24 * s);
  g.fillStyle(BRASS, 1); g.fillRect(x - 3 * s, y - 34 * s, 6 * s, 5 * s);
  g.lineStyle(1.4 * s, BRASS, 1); g.strokeCircle(x, y - 35 * s, 2.2 * s);
  // The Mark, carved: two dots.
  g.fillStyle(0x2a2420, 1); g.fillCircle(x - 4 * s, y - 56 * s, 2 * s); g.fillCircle(x + 4 * s, y - 56 * s, 2 * s);
  // The serpent head: a broad wedge with brow ridges, jaws open on a black slot.
  const hy = y - 86 * s;
  g.fillStyle(dim(BONE, 0.42), 1);
  g.fillPoints([
    { x: x - 22 * s, y: hy + 4 * s }, { x: x - 14 * s, y: hy - 22 * s }, { x, y: hy - 30 * s },
    { x: x + 14 * s, y: hy - 22 * s }, { x: x + 22 * s, y: hy + 4 * s },
  ], true);
  g.fillStyle(dim(BONE, 0.25), 1);
  g.fillPoints([{ x: x - 18 * s, y: hy - 4 * s }, { x: x - 11 * s, y: hy - 20 * s }, { x, y: hy - 27 * s }, { x: x + 11 * s, y: hy - 20 * s }, { x: x + 18 * s, y: hy - 4 * s }], true);
  // Scales on the crown.
  for (let r = 0; r < 3; r++) for (let k = -2; k <= 2; k++) {
    g.lineStyle(1, dim(BONE, 0.5), 0.8);
    g.beginPath(); g.arc(x + k * 5 * s + (r % 2) * 2.5 * s, hy - 22 * s + r * 5 * s, 2.6 * s, 0, Math.PI, false); g.strokePath();
  }
  // Eyes: slit, with a smear of green paint left in them.
  for (const k of [-1, 1]) {
    g.fillStyle(0x2a3a1a, 1); g.fillEllipse(x + k * 10 * s, hy - 10 * s, 7 * s, 4 * s);
    g.fillStyle(VENOM, 0.7); g.fillEllipse(x + k * 10 * s, hy - 10 * s, 5 * s, 2.6 * s);
    g.fillStyle(0x0a0a08, 1); g.fillRect(x + k * 10 * s - 0.6 * s, hy - 12 * s, 1.2 * s, 4 * s);
  }
  // The jaws: upper jaw over a black slot, fangs down, lower lip.
  g.fillStyle(0x060508, 1); g.fillEllipse(x, hy + 3 * s, 34 * s, 9 * s);
  g.fillStyle(BONE, 1);
  g.fillTriangle(x - 12 * s, hy - 1 * s, x - 8 * s, hy - 1 * s, x - 10 * s, hy + 7 * s);
  g.fillTriangle(x + 8 * s, hy - 1 * s, x + 12 * s, hy - 1 * s, x + 10 * s, hy + 7 * s);
  g.fillStyle(dim(BONE, 0.45), 1); g.fillRect(x - 17 * s, hy + 6 * s, 34 * s, 4 * s);
  // Letters jutting from the slot.
  letter(g, x - 5 * s, hy + 4 * s, 0.7 * s, -0.25);
  letter(g, x + 6 * s, hy + 3 * s, 0.6 * s, 0.4);
  // Wax drips down the stone.
  for (const [dx, len] of [[-12, 18], [9, 26], [2, 12]] as [number, number][]) {
    g.fillStyle(WAX_DARK, 0.9); g.fillRect(x + dx * s, hy + 10 * s, 2 * s, len * s);
    g.fillCircle(x + dx * s + 1 * s, hy + (10 + len) * s, 1.6 * s);
  }
}

/**
 * The watchtower over Tattle Square: four splayed timber legs braced in X's, a ladder, a railed
 * platform, a shingled lookout cabin with a slit window, a spyglass poking out, a crossbow
 * levelled on the rail, and an alarm bell on a bracket. A lamp hangs under the eaves.
 */
export function watchtower(g: G, x: number, y: number, s = 1): void {
  shadow(g, x, y + 4, 90 * s, 26 * s);
  const ph = 150 * s, base = 34 * s, topW = 22 * s;
  // Legs, back pair darker.
  for (const [dx, c] of [[-0.5, TIMBER_DARK], [0.5, TIMBER_DARK], [-1, TIMBER], [1, TIMBER]] as [number, number][]) {
    g.lineStyle(6 * s, c, 1); g.lineBetween(x + dx * base, y - (Math.abs(dx) < 1 ? 10 : 0) * s, x + dx * topW, y - ph);
  }
  // X-bracing.
  g.lineStyle(3 * s, TIMBER_DARK, 1);
  for (let k = 0; k < 3; k++) {
    const y0 = y - k * ph / 3, y1 = y - (k + 1) * ph / 3;
    const w0 = base - (base - topW) * (k / 3), w1 = base - (base - topW) * ((k + 1) / 3);
    g.lineBetween(x - w0, y0, x + w1, y1); g.lineBetween(x + w0, y0, x - w1, y1);
  }
  // Ladder up the front.
  g.lineStyle(2 * s, TIMBER_LIT, 1); g.lineBetween(x - 6 * s, y, x - 4 * s, y - ph); g.lineBetween(x + 6 * s, y, x + 4 * s, y - ph);
  for (let k = 8; k < ph; k += 10 * s) g.lineBetween(x - 6 * s + (k / ph) * 2 * s, y - k, x + 6 * s - (k / ph) * 2 * s, y - k);
  // Platform and rail.
  const py = y - ph;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 40 * s, py - 4 * s, 80 * s, 8 * s);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 40 * s, py - 6 * s, 80 * s, 3 * s);
  // The cabin.
  g.fillStyle(dim(PLASTER, 0.2), 1); g.fillRect(x - 28 * s, py - 46 * s, 56 * s, 42 * s);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 28 * s, py - 46 * s, 4 * s, 42 * s); g.fillRect(x + 24 * s, py - 46 * s, 4 * s, 42 * s);
  g.fillStyle(0x08070a, 1); g.fillRect(x - 18 * s, py - 32 * s, 36 * s, 6 * s);
  g.fillStyle(0xfff0c0, 0.9); g.fillCircle(x - 5 * s, py - 29 * s, 1.1 * s); g.fillCircle(x - 1 * s, py - 29 * s, 1.1 * s);
  // Rail in front of the cabin.
  for (let k = -36; k <= 36; k += 9) { g.fillStyle(TIMBER, 1); g.fillRect(x + k * s - 1.5 * s, py - 20 * s, 3 * s, 16 * s); }
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 40 * s, py - 22 * s, 80 * s, 3 * s);
  // A spyglass out of the slit and a crossbow on the rail.
  g.lineStyle(3 * s, BRASS, 1); g.lineBetween(x + 8 * s, py - 29 * s, x + 30 * s, py - 34 * s);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x + 31 * s, py - 34 * s, 2.4 * s);
  g.lineStyle(3 * s, TIMBER_DARK, 1); g.lineBetween(x - 34 * s, py - 24 * s, x - 10 * s, py - 24 * s);
  g.lineStyle(2 * s, IRON, 1);
  g.beginPath(); g.arc(x - 30 * s, py - 24 * s, 10 * s, -Math.PI / 2 - 0.9, -Math.PI / 2 + 0.9, false); g.strokePath();
  g.lineStyle(0.8, 0xd8d0b8, 0.8); g.lineBetween(x - 38 * s, py - 30 * s, x - 22 * s, py - 30 * s);
  // Shingled pyramid roof.
  g.fillStyle(dim(ROOF, 0.2), 1); g.fillTriangle(x - 38 * s, py - 44 * s, x + 38 * s, py - 44 * s, x, py - 84 * s);
  g.fillStyle(ROOF, 1); g.fillTriangle(x - 34 * s, py - 46 * s, x + 34 * s, py - 46 * s, x, py - 82 * s);
  for (let k = 1; k < 5; k++) {
    const yy = py - 46 * s - k * 9 * s, half = 34 * s * (1 - k / 4.2);
    g.lineStyle(1, ROOF_LIT, 0.7); g.lineBetween(x - half, yy, x + half, yy);
  }
  // A weathervane: a serpent.
  g.lineStyle(1.5, IRON, 1); g.lineBetween(x, py - 82 * s, x, py - 96 * s);
  g.lineStyle(2, IRON, 1); g.beginPath(); g.arc(x + 4 * s, py - 96 * s, 4 * s, Math.PI, Math.PI * 2.2, false); g.strokePath();
  // The alarm bell on its bracket.
  g.lineStyle(2, IRON, 1); g.lineBetween(x + 28 * s, py - 40 * s, x + 42 * s, py - 40 * s);
  g.fillStyle(BRASS_DARK, 1); g.fillTriangle(x + 36 * s, py - 38 * s, x + 48 * s, py - 38 * s, x + 42 * s, py - 30 * s - 0);
  g.fillStyle(BRASS, 1); g.fillEllipse(x + 42 * s, py - 28 * s, 14 * s, 5 * s);
  g.fillCircle(x + 42 * s, py - 35 * s, 5 * s);
}

/** A section of the Whispering Gallery's curved wall between arc angles a0..a1 (base on the ellipse). */
export function gallerySegment(g: G, cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, rng: () => number): void {
  const H = 112;
  const n = 6;
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  // The wall face, its upper half in shadow under the cornice.
  for (let i = 1; i <= n; i++) {
    const p = pts[i - 1], q = pts[i];
    const shade = 0.12 + 0.3 * Math.abs(Math.cos((a0 + a1) / 2));
    g.fillStyle(dim(FLAG_LIT, shade), 1);
    g.fillPoints([{ x: p.x, y: p.y }, { x: q.x, y: q.y }, { x: q.x, y: q.y - H }, { x: p.x, y: p.y - H }], true);
    // Courses of stone.
    g.lineStyle(1, FLAG_DARK, 0.6);
    for (let k = 14; k < H; k += 14) g.lineBetween(p.x, p.y - k, q.x, q.y - k);
    if (rng() < 0.6) { g.fillStyle(MOSS, 0.4); g.fillRect(Math.min(p.x, q.x), Math.min(p.y, q.y) - 12, Math.abs(q.x - p.x) + 1, 10); }
  }
  // Niches, each with a brass mouth set in its back.
  for (let i = 1; i < n; i += 2) {
    const p = pts[i];
    g.fillStyle(0x1a1620, 1); g.fillEllipse(p.x, p.y - 58, 26, 46); g.fillRect(p.x - 13, p.y - 58, 26, 30);
    g.fillStyle(dim(FLAG, 0.5), 1); g.fillRect(p.x - 15, p.y - 28, 30, 5);
    g.fillStyle(BRASS_DARK, 1); g.fillEllipse(p.x, p.y - 52, 18, 18);
    g.fillStyle(BRASS, 1); g.fillEllipse(p.x, p.y - 53, 15, 15);
    g.fillStyle(0x140f08, 1); g.fillEllipse(p.x, p.y - 53, 7, 7);
    g.fillStyle(BRASS_LIT, 0.8); g.fillEllipse(p.x - 4, p.y - 57, 4, 3);
  }
  // Pilasters at each end and a heavy cornice.
  for (const p of [pts[0], pts[n]]) {
    g.fillStyle(FLAG_DARK, 1); g.fillRect(p.x - 8, p.y - H - 4, 16, H + 4);
    g.fillStyle(FLAG_LIT, 1); g.fillRect(p.x - 6, p.y - H - 4, 5, H + 4);
    g.fillStyle(FLAG, 1); g.fillRect(p.x - 11, p.y - 8, 22, 8);
  }
  for (let i = 1; i <= n; i++) {
    const p = pts[i - 1], q = pts[i];
    g.fillStyle(FLAG_DARK, 1); g.fillPoints([{ x: p.x, y: p.y - H }, { x: q.x, y: q.y - H }, { x: q.x, y: q.y - H - 12 }, { x: p.x, y: p.y - H - 12 }], true);
    g.fillStyle(FLAG_LIT, 1); g.fillPoints([{ x: p.x, y: p.y - H - 10 }, { x: q.x, y: q.y - H - 10 }, { x: q.x, y: q.y - H - 14 }, { x: p.x, y: p.y - H - 14 }], true);
  }
}

/**
 * The Hall of Letters — Prince Whisper's seat. A tall black-timbered hall, its whole front
 * a palimpsest of paper: hundreds of denunciations nailed up in overlapping rows, each sealed
 * red, the oldest gone grey with damp. A round gable window painted as an open eye; two cowled
 * stone listeners flank the doors, each cupping a hand to its ear; the doors are iron-banded,
 * with a brass letter-slot the width of a hand; the Matriarch's serpent banner hangs above.
 */
export function hallOfLetters(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 8, w * 1.1, 34);
  // Steps.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? FLAG : FLAG_LIT, 1); g.fillRect(x - 80 - k * 10, y - 12 + k * 5, 160 + k * 20, 6); }
  // The body: dark plaster, black timber.
  g.fillStyle(dim(PLASTER, 0.35), 1); g.fillRect(x0, top, w, h - 12);
  for (let k = 0; k <= 6; k++) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 + (k * (w - 8)) / 6, top, 8, h - 12); }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0, top + h * 0.45, w, 7);
  // The letters: rows and rows, nailed, overlapping, a few torn.
  for (let r = 0; r < 9; r++) {
    const ly = top + 18 + r * ((h - 70) / 9);
    for (let lx = x0 + 14; lx < x0 + w - 10; lx += 11 + rng() * 7) {
      if (Math.abs(lx - x) < 62 && ly > y - 120) continue;
      const age = rng();
      const rot = (rng() - 0.5) * 0.5;
      const a = 0.65 + rng() * 0.35;
      g.fillStyle(age < 0.35 ? PAPER_DARK : age < 0.5 ? 0x9a9488 : PAPER, a);
      const pw = 9 + rng() * 5, ph = 11 + rng() * 6;
      g.fillPoints([
        { x: lx - pw / 2, y: ly - ph / 2 + rot * 6 }, { x: lx + pw / 2, y: ly - ph / 2 - rot * 6 },
        { x: lx + pw / 2, y: ly + ph / 2 - rot * 6 }, { x: lx - pw / 2, y: ly + ph / 2 + rot * 6 },
      ], true);
      g.lineStyle(0.6, INK, 0.5); for (let k = 2; k < ph - 3; k += 2.4) g.lineBetween(lx - pw / 2 + 1.5, ly - ph / 2 + k, lx + pw / 2 - 2 - rng() * 3, ly - ph / 2 + k);
      if (age > 0.4) { g.fillStyle(WAX, 0.95); g.fillCircle(lx, ly + ph / 2 - 2, 1.6); }
      nail(g, lx, ly - ph / 2 + 2, 0.8);
    }
  }
  // Gable: a steep black pediment with the eye window.
  g.fillStyle(dim(ROOF, 0.2), 1); g.fillTriangle(x0 - 16, top + 4, x0 + w + 16, top + 4, x, top - h * 0.5);
  g.fillStyle(ROOF, 1); g.fillTriangle(x0 - 10, top, x0 + w + 10, top, x, top - h * 0.5 + 6);
  for (let k = 1; k < 8; k++) {
    const yy = top - ((h * 0.5 - 6) * k) / 8, half = ((w + 20) / 2) * (1 - k / 8);
    g.lineStyle(1, ROOF_LIT, 0.6); g.lineBetween(x - half, yy, x + half, yy);
  }
  g.fillStyle(0x1a1620, 1); g.fillRect(x0 - 14, top - 2, w + 28, 6);
  const ey = top - h * 0.18;
  g.fillStyle(TIMBER_DARK, 1); g.fillCircle(x, ey, 32);
  g.fillStyle(BONE, 1); g.fillEllipse(x, ey, 50, 30);
  g.fillStyle(0x6a4a8a, 1); g.fillCircle(x, ey, 12);
  g.fillStyle(0x08060a, 1); g.fillCircle(x, ey, 6);
  g.fillStyle(0xffffff, 0.8); g.fillCircle(x - 4, ey - 4, 2.4);
  g.lineStyle(3, TIMBER_DARK, 1); g.strokeEllipse(x, ey, 52, 32);
  for (let k = -3; k <= 3; k++) { g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(x + k * 8, ey - 15 + Math.abs(k) * 1.4, x + k * 10, ey - 24 + Math.abs(k) * 2); }
  // The serpent banner hung from the gable.
  g.fillStyle(0x2a3a1e, 1); g.fillRect(x - 18, top + 6, 36, 70);
  g.fillTriangle(x - 18, top + 76, x + 18, top + 76, x, top + 90);
  g.lineStyle(3, VENOM, 0.85);
  g.beginPath(); g.arc(x - 4, top + 26, 8, -Math.PI * 0.2, Math.PI * 0.9, false); g.strokePath();
  g.beginPath(); g.arc(x + 4, top + 44, 8, Math.PI * 0.8, Math.PI * 1.9, false); g.strokePath();
  g.fillStyle(VENOM, 1); g.fillCircle(x + 9, top + 58, 3);
  g.fillStyle(0xd8b050, 1); g.fillRect(x - 20, top + 4, 40, 3);
  // The doors: iron-banded, a slot, two ring handles.
  const dw = 70, dh = 98;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - dw / 2 - 6, y - 12 - dh - 6, dw + 12, dh + 6);
  g.fillStyle(0x2a1c14, 1); g.fillRect(x - dw / 2, y - 12 - dh, dw, dh);
  g.lineStyle(1, TIMBER_DARK, 1); g.lineBetween(x, y - 12 - dh, x, y - 12);
  for (const by of [0.2, 0.55, 0.85]) { g.fillStyle(IRON, 1); g.fillRect(x - dw / 2, y - 12 - dh + dh * by, dw, 5); }
  g.fillStyle(BRASS, 1); g.fillRect(x - 14, y - 12 - dh * 0.66, 28, 6);
  g.fillStyle(0x0a0806, 1); g.fillRect(x - 12, y - 12 - dh * 0.66 + 2, 24, 2);
  for (const k of [-1, 1]) { g.lineStyle(2, BRASS, 1); g.strokeCircle(x + k * 10, y - 12 - dh * 0.4, 4); }
  // The two stone listeners, cowled, a hand to the ear.
  for (const k of [-1, 1]) {
    const sx = x + k * (dw / 2 + 34), sy = y - 12;
    g.fillStyle(FLAG_DARK, 1); g.fillRect(sx - 16, sy - 14, 32, 14);
    g.fillStyle(FLAG, 1); g.fillRect(sx - 14, sy - 16, 28, 4);
    g.fillStyle(dim(BONE, 0.4), 1); g.fillTriangle(sx - 14, sy - 16, sx + 14, sy - 16, sx, sy - 76);
    g.fillStyle(dim(BONE, 0.3), 1); g.fillEllipse(sx, sy - 76, 22, 24);
    g.fillStyle(0x15121a, 1); g.fillEllipse(sx, sy - 74, 13, 14);
    g.fillStyle(dim(BONE, 0.3), 1); g.fillCircle(sx - k * 12, sy - 74, 5);
    g.lineStyle(4, dim(BONE, 0.38), 1); g.lineBetween(sx - k * 4, sy - 50, sx - k * 12, sy - 72);
    g.lineStyle(1, dim(BONE, 0.55), 0.8); g.lineBetween(sx - 4, sy - 18, sx - 2, sy - 58); g.lineBetween(sx + 5, sy - 18, sx + 3, sy - 56);
  }
}

/**
 * The Pay Office — the Dose Window, where informers are paid in Draught. A squat stone office,
 * a hatch with a barred grille and a little brass tray, shelves of green vials glinting behind
 * the bars, a rope-and-post queue line, and the Paymaster's board of names, each with a tally
 * of doses chalked beside it.
 */
export function doseWindow(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 4, w * 1.1, 24);
  g.fillStyle(FLAG_DARK, 1); g.fillRect(x0, top, w, h);
  for (let r = 0; r < h / 14; r++) for (let k = 0; k < w / 26; k++) {
    g.fillStyle(mixC(FLAG, FLAG_DARK, rng() * 0.6), 1);
    g.fillRect(x0 + k * 26 + (r % 2) * 13 + 1, top + r * 14 + 1, 24, 12);
  }
  // Flat roof with a parapet and a drainpipe gurgling into a barrel.
  g.fillStyle(FLAG_DARK, 1); g.fillRect(x0 - 6, top - 12, w + 12, 12);
  g.fillStyle(FLAG_LIT, 1); g.fillRect(x0 - 6, top - 14, w + 12, 4);
  g.fillStyle(IRON, 1); g.fillRect(x0 + w - 12, top - 4, 5, h - 10);
  // The hatch.
  const hx = x - w * 0.12, hy = top + h * 0.3, hw = 64, hh = 46;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(hx - hw / 2 - 6, hy - 6, hw + 12, hh + 12);
  g.fillStyle(0x0e0c12, 1); g.fillRect(hx - hw / 2, hy, hw, hh);
  // Vials on shelves behind the bars, glinting green.
  for (let r = 0; r < 2; r++) {
    g.fillStyle(TIMBER, 1); g.fillRect(hx - hw / 2 + 2, hy + 18 + r * 16, hw - 4, 2);
    for (let k = 0; k < 7; k++) {
      const vx = hx - hw / 2 + 6 + k * 8.5, vy = hy + 18 + r * 16;
      g.fillStyle(0x2a5a2a, 1); g.fillRect(vx - 2, vy - 9, 4, 9);
      g.fillStyle(VENOM, 0.8); g.fillRect(vx - 1.5, vy - 5, 3, 5);
      g.fillStyle(0xd8d0b8, 1); g.fillRect(vx - 1, vy - 11, 2, 2);
    }
  }
  for (let k = 0; k <= 6; k++) { g.fillStyle(IRON, 1); g.fillRect(hx - hw / 2 + (k * hw) / 6 - 1.5, hy, 3, hh); }
  g.fillStyle(BRASS, 1); g.fillRect(hx - 18, hy + hh, 36, 6);
  g.fillStyle(BRASS_LIT, 0.8); g.fillRect(hx - 18, hy + hh, 36, 1.5);
  // The board of names: rows of scrawl, tallies of doses.
  const bx = x + w * 0.3, by = top + h * 0.22;
  g.fillStyle(0x1a1c18, 1); g.fillRect(bx - 34, by, 68, 74);
  g.lineStyle(2, TIMBER, 1); g.strokeRect(bx - 34, by, 68, 74);
  for (let r = 0; r < 8; r++) {
    const ly = by + 8 + r * 8.4;
    g.lineStyle(1, 0xd8d4c4, 0.7); g.lineBetween(bx - 28, ly, bx - 2 - rng() * 12, ly);
    const tally = 1 + Math.floor(rng() * 5);
    for (let t = 0; t < tally; t++) g.lineBetween(bx + 6 + t * 4, ly - 3, bx + 6 + t * 4, ly + 2);
    if (tally === 5) g.lineBetween(bx + 4, ly + 2, bx + 24, ly - 3);
  }
  // The door, low and heavy.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 + 14, y - 52, 30, 52);
  g.fillStyle(TIMBER, 1); g.fillRect(x0 + 16, y - 50, 26, 50);
  g.fillStyle(IRON, 1); g.fillRect(x0 + 16, y - 40, 26, 3); g.fillRect(x0 + 16, y - 14, 26, 3);
  // A painted sign over the hatch: a vial and an ear.
  g.fillStyle(PAPER_DARK, 1); g.fillRect(hx - 30, hy - 26, 60, 16);
  g.fillStyle(0x2a5a2a, 1); g.fillRect(hx - 18, hy - 23, 5, 10);
  g.fillStyle(WAX, 1); g.beginPath(); g.arc(hx + 12, hy - 18, 5, -Math.PI / 2, Math.PI / 2, false); g.strokePath();
  g.lineStyle(2, WAX, 1); g.beginPath(); g.arc(hx + 12, hy - 18, 5, -Math.PI / 2, Math.PI * 0.6, false); g.strokePath();
}

/** The queue rope in front of the Dose Window: brass-capped posts and a sagging red rope. */
export function queueRope(g: G, x0: number, x1: number, y: number): void {
  const n = Math.max(2, Math.round((x1 - x0) / 60) + 1);
  const xs = Array.from({ length: n }, (_, i) => x0 + ((x1 - x0) * i) / (n - 1));
  for (let i = 1; i < n; i++) {
    g.lineStyle(2.5, WAX_DARK, 1);
    let px = xs[i - 1], py = y - 24;
    for (let k = 1; k <= 8; k++) {
      const qx = xs[i - 1] + ((xs[i] - xs[i - 1]) * k) / 8, qy = y - 24 + Math.sin((k / 8) * Math.PI) * 8;
      g.lineBetween(px, py, qx, qy); px = qx; py = qy;
    }
  }
  for (const x of xs) {
    shadow(g, x, y + 1, 12, 4);
    g.fillStyle(IRON, 1); g.fillRect(x - 2, y - 28, 4, 28); g.fillEllipse(x, y, 10, 4);
    g.fillStyle(BRASS, 1); g.fillCircle(x, y - 29, 3.2);
  }
}

/**
 * A mask stall in the Mask Market: a striped awning on posts, a back-board hung with masks in
 * rows on pegs, a counter with masks on stands and a bolt of black velvet, ribbons fluttering.
 * `seed` picks the masks so no two stalls hang the same faces.
 */
export function maskStall(g: G, x: number, y: number, w: number, seed: number, rng: () => number): void {
  const x0 = x - w / 2;
  shadow(g, x, y + 4, w * 1.05, 18);
  // Back-board.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 + 4, y - 96, w - 8, 66);
  g.fillStyle(0x24182a, 1); g.fillRect(x0 + 7, y - 93, w - 14, 60);
  const colors = [MASK_WHITE, MASK_GOLD, MASK_BLACK, WAX, 0x3a8a86, 0x7a4aa0];
  let i = 0;
  for (let r = 0; r < 2; r++) {
    for (let mx = x0 + 22; mx < x0 + w - 16; mx += 26) {
      const kind = ['volto', 'domino', 'beak', 'serpent', 'moon', 'weeping', 'grin', 'bauta'][(i * 3 + seed) % 8] as MaskKind;
      const c = colors[(i * 5 + seed) % colors.length];
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(mx, y - 88 + r * 28, 1.4);
      mask(g, mx, y - 80 + r * 28, 0.62, kind, c === MASK_BLACK && kind === 'domino' ? MASK_GOLD : c);
      i++;
    }
  }
  // Posts.
  for (const px of [x0, x0 + w]) { g.fillStyle(TIMBER, 1); g.fillRect(px - 3, y - 110, 6, 110); g.fillStyle(TIMBER_DARK, 1); g.fillRect(px - 3, y - 110, 2, 110); }
  // Counter with masks on stands and a bolt of velvet.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 - 4, y - 30, w + 8, 30);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x0 - 6, y - 34, w + 12, 6);
  g.fillStyle(0x2a1a34, 1); g.fillRect(x0 + 2, y - 26, w - 4, 20);
  g.lineStyle(1, MASK_GOLD, 0.6); g.lineBetween(x0 + 2, y - 10, x0 + w - 2, y - 10);
  for (let k = 0; k < 3; k++) {
    const sx = x0 + w * (0.2 + k * 0.3);
    g.fillStyle(IRON, 1); g.fillRect(sx - 1, y - 48, 2, 14); g.fillEllipse(sx, y - 34, 10, 3);
    mask(g, sx, y - 52, 0.7, (['bauta', 'volto', 'domino', 'grin', 'beak'] as MaskKind[])[(seed + k * 2) % 5], colors[(seed + k) % colors.length] === MASK_BLACK ? MASK_WHITE : colors[(seed + k) % colors.length]);
  }
  g.fillStyle(MASK_BLACK, 1); g.fillEllipse(x0 + w - 18, y - 38, 26, 10);
  g.fillStyle(0x3a3448, 1); g.fillEllipse(x0 + w - 18, y - 40, 22, 6);
  // The awning: scalloped stripes of plum and black, a drip line.
  const ay = y - 112;
  for (let k = 0; k < w / 16; k++) {
    const sx = x0 - 8 + k * 16;
    g.fillStyle(k % 2 ? 0x5a2a6a : 0x16121c, 1);
    g.fillPoints([{ x: sx, y: ay - 14 }, { x: sx + 16, y: ay - 14 }, { x: sx + 18, y: ay + 6 }, { x: sx - 2, y: ay + 6 }], true);
    g.beginPath(); g.arc(sx + 8, ay + 6, 10, 0, Math.PI, false); g.closePath(); g.fillPath();
  }
  g.fillStyle(lit(0x5a2a6a, 0.2), 0.6); g.fillRect(x0 - 8, ay - 14, w + 16, 3);
  // Ribbons.
  for (let k = 0; k < 4; k++) {
    const rx = x0 + 10 + rng() * (w - 20);
    g.lineStyle(1.5, [WAX, MASK_GOLD, 0x3a8a86, MASK_WHITE][k], 0.9); g.lineBetween(rx, ay + 10, rx + (rng() - 0.5) * 8, ay + 26 + rng() * 10);
  }
}

/** A dead-drop pillar box: an iron post box with a domed cap, a slot, a lamp atop that burns when live. */
export function dropBox(g: G, x: number, y: number, s = 1, live = false): void {
  shadow(g, x, y + 1, 26 * s, 8 * s);
  g.fillStyle(IRON, 1); g.fillRect(x - 10 * s, y - 44 * s, 20 * s, 44 * s);
  g.fillEllipse(x, y, 22 * s, 6 * s);
  g.fillStyle(IRON_LIT, 0.45); g.fillRect(x - 10 * s, y - 44 * s, 4 * s, 44 * s);
  g.fillStyle(IRON, 1); g.fillEllipse(x, y - 44 * s, 24 * s, 12 * s);
  g.fillStyle(IRON_LIT, 0.6); g.fillEllipse(x - 3 * s, y - 47 * s, 8 * s, 3 * s);
  g.fillStyle(0x060508, 1); g.fillRect(x - 7 * s, y - 34 * s, 14 * s, 3 * s);
  g.fillStyle(BRASS, 1); g.fillRect(x - 8 * s, y - 36 * s, 16 * s, 1.5 * s);
  g.fillStyle(WAX_DARK, 1); g.fillCircle(x, y - 22 * s, 3 * s);
  g.fillStyle(IRON, 1); g.fillRect(x - 1.5 * s, y - 58 * s, 3 * s, 10 * s);
  g.fillStyle(live ? LAMP : 0x3a3428, 1); g.fillCircle(x, y - 60 * s, 4 * s);
  if (live) glow(g, x, y - 60 * s, 16 * s, LAMP, 0.08, 3);
}

/** A goblet: stem, foot, bowl with wine (`fill` 0..1). */
export function goblet(g: G, x: number, y: number, s: number, wine = WINE, fill = 1, a = 1): void {
  g.fillStyle(BRASS_DARK, a); g.fillEllipse(x, y, 10 * s, 3 * s);
  g.fillStyle(BRASS, a); g.fillRect(x - 1 * s, y - 8 * s, 2 * s, 8 * s);
  g.fillStyle(BRASS, a); g.fillCircle(x, y - 6 * s, 1.6 * s);
  g.fillStyle(BRASS_DARK, a);
  g.beginPath(); g.arc(x, y - 14 * s, 6 * s, 0, Math.PI, false); g.closePath(); g.fillPath();
  g.fillRect(x - 6 * s, y - 16 * s, 12 * s, 2 * s);
  g.fillStyle(BRASS, a);
  g.beginPath(); g.arc(x, y - 14.5 * s, 5.2 * s, 0, Math.PI, false); g.closePath(); g.fillPath();
  if (fill > 0) { g.fillStyle(wine, a); g.fillEllipse(x, y - 15 * s, 10 * s * fill + 1, 2.6 * s); }
  g.fillStyle(BRASS_LIT, a * 0.8); g.fillRect(x - 4 * s, y - 13 * s, 1.2 * s, 3 * s);
  g.lineStyle(1, BRASS_LIT, a); g.strokeEllipse(x, y - 15.5 * s, 12 * s, 2.8 * s);
}

/** A round tavern table with a cloth, for the cups. */
export function cupTable(g: G, x: number, y: number, s = 1): void {
  shadow(g, x, y + 4 * s, 64 * s, 16 * s);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 3 * s, y - 16 * s, 6 * s, 18 * s); g.fillEllipse(x, y + 2 * s, 24 * s, 6 * s);
  g.fillStyle(TIMBER, 1); g.fillEllipse(x, y - 16 * s, 64 * s, 24 * s);
  g.fillStyle(TIMBER_LIT, 1); g.fillEllipse(x, y - 18 * s, 60 * s, 20 * s);
  g.fillStyle(0xe4dccc, 1); g.fillEllipse(x, y - 18 * s, 44 * s, 14 * s);
  g.fillStyle(WINE, 0.25); g.fillCircle(x + 9 * s, y - 16 * s, 3 * s);
  // A little sugar bowl: the Taster's tell.
  g.fillStyle(SUGAR, 1); g.fillEllipse(x - 16 * s, y - 20 * s, 7 * s, 3 * s);
}

/** A cistern column: a broken pillar on a square base, a chain and bucket hung from an iron arm. */
export function cisternColumn(g: G, x: number, y: number, h: number, bucket = false): void {
  shadow(g, x, y + 2, 34, 10);
  g.fillStyle(FLAG_DARK, 1); g.fillRect(x - 13, y - 10, 26, 10);
  g.fillStyle(FLAG, 1); g.fillRect(x - 12, y - 12, 24, 4);
  g.fillStyle(dim(BONE, 0.45), 1); g.fillRect(x - 9, y - h, 18, h - 10);
  g.fillStyle(dim(BONE, 0.3), 1); g.fillRect(x - 9, y - h, 5, h - 10);
  for (let k = 0; k < 3; k++) { g.lineStyle(1, dim(BONE, 0.55), 0.7); g.lineBetween(x - 5 + k * 5, y - h + 2, x - 5 + k * 5, y - 10); }
  // The broken top.
  g.fillStyle(dim(BONE, 0.45), 1); g.fillTriangle(x - 9, y - h, x + 9, y - h, x + 3, y - h - 10);
  g.fillStyle(MOSS, 0.6); g.fillRect(x - 9, y - 22, 18, 10);
  if (bucket) {
    g.lineStyle(2, IRON, 1); g.lineBetween(x, y - h + 10, x + 30, y - h + 10);
    g.lineStyle(1, IRON_LIT, 1); for (let k = 0; k < 8; k++) g.strokeEllipse(x + 30, y - h + 14 + k * 5, 3, 5);
    g.fillStyle(TIMBER, 1); g.fillRect(x + 24, y - h + 52, 12, 12);
    g.fillStyle(IRON, 1); g.fillRect(x + 24, y - h + 54, 12, 2); g.fillRect(x + 24, y - h + 60, 12, 2);
  }
}

/** The cistern basin in the ground: a sunken stone square with steps down one side and ink water. */
export function cisternBasin(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(FLAG_DARK, 1); g.fillRect(r.x - 22, r.y - 22, r.w + 44, r.h + 44);
  g.fillStyle(FLAG, 1); g.fillRect(r.x - 16, r.y - 16, r.w + 32, r.h + 32);
  for (let k = 0; k < (r.w + 32) / 30; k++) { g.lineStyle(1, FLAG_DARK, 0.7); g.lineBetween(r.x - 16 + k * 30, r.y - 16, r.x - 16 + k * 30, r.y - 4); g.lineBetween(r.x - 16 + k * 30, r.y + r.h + 4, r.x - 16 + k * 30, r.y + r.h + 16); }
  // The inner drop: dark stone going down to the water.
  g.fillStyle(0x1c1a22, 1); g.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
  g.fillStyle(CISTERN, 1); g.fillRect(r.x, r.y + 8, r.w, r.h - 8);
  // Steps down at the west end.
  for (let k = 0; k < 4; k++) { g.fillStyle(k % 2 ? FLAG_DARK : FLAG, 1); g.fillRect(r.x + k * 10, r.y + r.h * 0.3, 10, r.h * 0.4); }
  for (let i = 0; i < 18; i++) {
    const x = r.x + 50 + rng() * (r.w - 70), y = r.y + 14 + rng() * (r.h - 24);
    g.fillStyle(CISTERN_LIT, 0.35); g.fillEllipse(x, y, 20 + rng() * 40, 3);
  }
  // A scum of paper: letters thrown in, floating sodden.
  for (let i = 0; i < 9; i++) {
    const x = r.x + 60 + rng() * (r.w - 90), y = r.y + 20 + rng() * (r.h - 34);
    letter(g, x, y, 0.8, rng() * 3, rng() < 0.5, 0.35);
  }
  g.fillStyle(MOSS, 0.5); g.fillRect(r.x - 4, r.y - 4, r.w + 8, 4);
}

/**
 * A mangrove on stilt-roots, standing in the mire: arched roots, a twisted trunk, a dark crown
 * hung with grey moss and old webs.
 */
export function mangrove(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 2, 90 * s, 22 * s, 0.4);
  const bark = 0x2e2a24, barkLit = 0x4a4436;
  const ty = y - 34 * s;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI + (i / 6) * Math.PI;
    const fx = x + Math.cos(a) * (30 + rng() * 14) * s, fy = y + Math.abs(Math.sin(a)) * 2;
    const mx = x + Math.cos(a) * 16 * s, my = ty - 6 * s;
    g.lineStyle(3.5 * s, bark, 1);
    let px = x + Math.cos(a) * 4 * s, py = ty;
    for (let k = 1; k <= 6; k++) {
      const t = k / 6;
      const qx = (1 - t) * (1 - t) * (x + Math.cos(a) * 4 * s) + 2 * (1 - t) * t * mx + t * t * fx;
      const qy = (1 - t) * (1 - t) * ty + 2 * (1 - t) * t * my + t * t * fy;
      g.lineBetween(px, py, qx, qy); px = qx; py = qy;
    }
    g.fillStyle(MIRE_LIT, 0.6); g.fillEllipse(fx, fy + 1, 8 * s, 2.5 * s);
  }
  g.fillStyle(bark, 1); g.fillTriangle(x - 7 * s, ty, x + 7 * s, ty, x + 2 * s, ty - 60 * s);
  g.fillStyle(barkLit, 0.7); g.fillTriangle(x - 5 * s, ty, x - 1 * s, ty, x + 1 * s, ty - 54 * s);
  // Crown.
  const cy = ty - 66 * s;
  for (let i = 0; i < 9; i++) {
    const cx = x + (rng() - 0.5) * 70 * s, yy = cy + (rng() - 0.5) * 30 * s;
    g.fillStyle(i % 3 ? 0x1c2e1c : 0x26401f, 1); g.fillCircle(cx, yy, (16 + rng() * 10) * s);
  }
  g.fillStyle(0x3a5a2c, 0.6); g.fillCircle(x - 14 * s, cy - 12 * s, 10 * s);
  // Hanging moss and a web.
  for (let i = 0; i < 6; i++) {
    const mx = x + (rng() - 0.5) * 70 * s, my = cy + 10 * s;
    g.lineStyle(1.4, 0x7a8470, 0.75); g.lineBetween(mx, my, mx + (rng() - 0.5) * 6, my + (18 + rng() * 26) * s);
  }
  const wx = x + 20 * s, wy = cy + 20 * s;
  g.lineStyle(0.6, 0xd8d8e0, 0.45);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.lineBetween(wx, wy, wx + Math.cos(a) * 14 * s, wy + Math.sin(a) * 14 * s); }
  for (let r = 4; r < 14; r += 4) g.strokeCircle(wx, wy, r * s);
}

/** The Cloak waystone: a fang of white rock, a carved closed eye, a black veil pinned over its top. */
export function cloakWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 44, 12);
  g.fillStyle(dim(BONE, 0.3), 1); g.fillTriangle(x - 16, y, x + 16, y, x + 2, y - 74);
  g.fillStyle(BONE, 1); g.fillTriangle(x - 13, y - 1, x + 10, y - 1, x + 1, y - 70);
  g.fillStyle(lit(BONE, 0.3), 0.7); g.fillTriangle(x - 12, y - 2, x - 5, y - 2, x, y - 64);
  // The carved eye, shut.
  g.lineStyle(2, 0x6a5a8a, 1); g.beginPath(); g.arc(x, y - 36, 7, 0.2, Math.PI - 0.2, false); g.strokePath();
  for (let k = -2; k <= 2; k++) g.lineBetween(x + k * 3, y - 31 + Math.abs(k) * 0.6, x + k * 3.6, y - 27);
  // The veil.
  g.fillStyle(0x16121e, 0.92); g.fillTriangle(x - 10, y - 50, x + 10, y - 50, x + 1, y - 72);
  g.fillTriangle(x - 10, y - 50, x - 14, y - 40, x - 4, y - 48);
  g.fillTriangle(x + 10, y - 50, x + 13, y - 38, x + 4, y - 48);
  g.fillStyle(WAX, 1); g.fillCircle(x + 1, y - 54, 2.2);
}

/** A gate-clerk's booth by the west road: a sentry box, a lectern with the Name Book chained to it. */
export function nameBooth(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 3, 70, 16);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 22, y - 86, 44, 86);
  g.fillStyle(SHUTTER, 1); g.fillRect(x - 19, y - 83, 38, 80);
  g.fillStyle(0x0a080c, 1); g.fillRect(x - 13, y - 66, 26, 16);
  g.fillStyle(0xfff0c0, 0.9); g.fillCircle(x - 3, y - 58, 1); g.fillCircle(x + 3, y - 58, 1);
  g.fillStyle(ROOF, 1); g.fillTriangle(x - 28, y - 84, x + 28, y - 84, x, y - 108);
  // The lectern and book, chained.
  const lx = x + 36;
  g.fillStyle(TIMBER, 1); g.fillRect(lx - 2, y - 36, 4, 36);
  g.fillStyle(TIMBER_LIT, 1); g.fillPoints([{ x: lx - 14, y: y - 34 }, { x: lx + 14, y: y - 38 }, { x: lx + 14, y: y - 44 }, { x: lx - 14, y: y - 40 }], true);
  g.fillStyle(PAPER, 1); g.fillPoints([{ x: lx - 12, y: y - 40 }, { x: lx, y: y - 42 }, { x: lx, y: y - 47 }, { x: lx - 12, y: y - 45 }], true);
  g.fillStyle(lit(PAPER, 0.1), 1); g.fillPoints([{ x: lx, y: y - 42 }, { x: lx + 12, y: y - 44 }, { x: lx + 12, y: y - 49 }, { x: lx, y: y - 47 }], true);
  g.lineStyle(0.6, INK, 0.6); for (let k = 0; k < 3; k++) { g.lineBetween(lx - 10, y - 42.5 - k * 1.4, lx - 2 - rng() * 3, y - 43 - k * 1.4); }
  g.lineStyle(1, IRON_LIT, 0.8); for (let k = 0; k < 5; k++) g.strokeEllipse(lx + 12 + k * 2, y - 36 + k * 6, 3, 4);
}

/** The Two Cups' hanging sign: two goblets on a board, swinging from a bracket. */
export function twoCupsSign(g: G, x: number, y: number, swing: number): void {
  g.lineStyle(3, IRON, 1); g.lineBetween(x, y, x + 40, y);
  const sx = x + 30 + Math.sin(swing) * 2, sy = y + 4;
  g.lineStyle(1, IRON_LIT, 1); g.lineBetween(x + 22, y, sx - 10, sy + 4); g.lineBetween(x + 38, y, sx + 10, sy + 4);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(sx - 18, sy + 4, 36, 28);
  g.fillStyle(0x3a1a22, 1); g.fillRect(sx - 16, sy + 6, 32, 24);
  goblet(g, sx - 7, sy + 27, 0.9, WINE_LIT); goblet(g, sx + 7, sy + 27, 0.9, VENOM);
}

/** A sodden pile of torn letters at a wall's foot (ground layer). */
export function letterLitter(g: G, x: number, y: number, n: number, rng: () => number): void {
  for (let i = 0; i < n; i++) letter(g, x + (rng() - 0.5) * 50, y + (rng() - 0.5) * 18, 0.7, rng() * 6, rng() < 0.3, 0.45);
}
