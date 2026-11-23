import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Rect } from '../../../../IslesTypes';
import {
  AMBER, BRICK, BRICK_DARK, BRICK_LIT, CANAL, CANAL_DEEP, CANAL_LIT, CANDLE, FACADE, FACADE_DARK, FACADE_LIT, FW_WHITE,
  GILT, GILT_DARK, GILT_LIT, HARLE_GREEN, HARLE_RED, HARLE_YELLOW, IRON, ISTRIA, ISTRIA_DARK, ISTRIA_LIT, LACQUER,
  LACQUER_LIT, MIRROR, MIRROR_DARK, MIRROR_LIT, OAK, OAK_DARK, OAK_LIT, PAVE, PAVE_DARK, PAVE_LIT, PORCELAIN,
  PORCELAIN_DARK, REED_BRASS, ROOF, ROOF_DARK, ROOF_LIT, SEQUINS, SILK_WHITE, STUCCO_CREAM, TEAR, VELVET, VELVET_DARK,
  VELVET_LIT,
} from './palette';

/**
 * Masquerade set pieces — the shapes only a masked canal town has. Everything stands on water or
 * beside it, everything is doubled in it, and everything has a face: the palazzi's windows are
 * ogee-arched like raised eyebrows, the ballroom's windows hold chandeliers, the shutters of the
 * mask-makers are hung with faces nobody is wearing yet, and the Prince's own palazzo *is* a
 * face. Gilt and sequins catch every lantern; stucco flakes to show the brick underneath.
 */

// ── Small motifs ─────────────────────────────────────────────────────

/** A music note: a tilted head, a stem, a flag — the Part painted on every mask's brow. */
export function noteGlyph(g: G, x: number, y: number, s: number, color: number, a = 1): void {
  g.fillStyle(color, a);
  g.fillEllipse(x, y, 5 * s, 3.6 * s);
  g.fillRect(x + 1.8 * s, y - 9 * s, 1.1 * s, 9 * s);
  g.fillTriangle(x + 2.9 * s, y - 9 * s, x + 2.9 * s, y - 5.5 * s, x + 6 * s, y - 4 * s);
}

export type MaskKind = 'volto' | 'colombina' | 'bauta' | 'medico' | 'comedy' | 'tragedy' | 'moretta' | 'harlequin';

/**
 * A mask, centred on (x, y), about 26·s across. Each kind has its own silhouette: the full
 * porcelain volto, the half-face colombina with its fan of feathers, the bauta's jutting chin,
 * the medico's beak, the laughing and weeping masks of the stage, the black oval moretta, and
 * Harlequin's arched black leather. `part` paints the wearer's Part on the brow in brass.
 */
export function mask(g: G, x: number, y: number, s: number, kind: MaskKind, base = PORCELAIN, trim = GILT, part = false): void {
  const w = 26 * s, h = 32 * s;
  const eye = (ex: number, ey: number, tilt: number) => {
    g.fillStyle(0x0a0810, 1);
    g.fillTriangle(ex - 5 * s, ey + tilt * s, ex + 5 * s, ey - tilt * s, ex, ey - 2.6 * s);
    g.fillTriangle(ex - 5 * s, ey + tilt * s, ex + 5 * s, ey - tilt * s, ex, ey + 2.4 * s);
  };
  switch (kind) {
    case 'colombina': {
      // The feathers first: a fan off the upper right.
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + 0.15 + i * 0.2;
        const fx = x + 8 * s + Math.cos(a) * 20 * s, fy = y - 4 * s + Math.sin(a) * 22 * s;
        g.lineStyle(1.6 * s, dim(trim, 0.2), 1); g.lineBetween(x + 8 * s, y - 4 * s, fx, fy);
        g.fillStyle(i % 2 ? SEQUINS[i % SEQUINS.length] : lit(base, 0.2), 0.95);
        g.fillEllipse(fx, fy, 5 * s, 11 * s);
      }
      g.fillStyle(dim(base, 0.3), 1); g.fillEllipse(x, y + 1 * s, w * 1.1, h * 0.42);
      g.fillStyle(base, 1); g.fillEllipse(x, y, w * 1.08, h * 0.4);
      g.fillStyle(lit(base, 0.3), 0.6); g.fillEllipse(x - 4 * s, y - 3 * s, w * 0.5, h * 0.12);
      eye(x - 6 * s, y, 1.2); eye(x + 6 * s, y, -1.2);
      // Sequin rim.
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.fillStyle(i % 2 ? trim : lit(trim, 0.4), 1); g.fillCircle(x + Math.cos(a) * w * 0.52, y + Math.sin(a) * h * 0.19, 1.2 * s);
      }
      break;
    }
    case 'bauta': {
      // A square brow and a chin that juts forward like a shelf (to speak through, unrecognised).
      g.fillStyle(dim(base, 0.3), 1);
      g.fillRoundedRect(x - w / 2 - 1, y - h / 2 + 1, w + 2, h * 0.75, 6 * s);
      g.fillTriangle(x - w / 2, y + h * 0.15, x + w / 2, y + h * 0.15, x, y + h * 0.62);
      g.fillStyle(base, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h * 0.72, 6 * s);
      g.fillTriangle(x - w / 2 + 1, y + h * 0.1, x + w / 2 - 1, y + h * 0.1, x, y + h * 0.58);
      g.fillStyle(PORCELAIN_DARK, 0.5); g.fillTriangle(x - w * 0.3, y + h * 0.25, x + w * 0.3, y + h * 0.25, x, y + h * 0.55);
      g.fillStyle(lit(base, 0.3), 0.5); g.fillRect(x - w * 0.36, y - h * 0.42, w * 0.25, h * 0.5);
      eye(x - 6 * s, y - 4 * s, 0.6); eye(x + 6 * s, y - 4 * s, -0.6);
      g.lineStyle(1.2 * s, dim(base, 0.35), 1); g.lineBetween(x, y - 2 * s, x - 2 * s, y + 6 * s);
      break;
    }
    case 'medico': {
      // A round face and a long downturned beak.
      g.fillStyle(dim(base, 0.3), 1); g.fillEllipse(x, y + 1, w, h * 0.8);
      g.fillStyle(base, 1); g.fillEllipse(x, y, w * 0.96, h * 0.76);
      g.fillStyle(dim(base, 0.15), 1);
      g.fillTriangle(x - 5 * s, y + 1 * s, x + 5 * s, y + 1 * s, x + 2 * s, y + 26 * s);
      g.fillStyle(lit(base, 0.25), 0.7); g.fillTriangle(x - 3 * s, y + 2 * s, x, y + 2 * s, x + 1.5 * s, y + 20 * s);
      for (const k of [-1, 1]) {
        g.fillStyle(trim, 1); g.fillCircle(x + k * 6 * s, y - 4 * s, 4.2 * s);
        g.fillStyle(0x0a0810, 1); g.fillCircle(x + k * 6 * s, y - 4 * s, 2.8 * s);
        g.fillStyle(0xffffff, 0.5); g.fillCircle(x + k * 6 * s - 1, y - 5 * s, 0.9 * s);
      }
      break;
    }
    case 'moretta': {
      // A black velvet oval with two eyes and no mouth at all — held on by biting a button.
      g.fillStyle(0x000000, 0.6); g.fillEllipse(x, y + 1, w * 0.92, h * 0.92);
      g.fillStyle(0x16101c, 1); g.fillEllipse(x, y, w * 0.88, h * 0.88);
      g.fillStyle(0x3a2c48, 0.7); g.fillEllipse(x - 4 * s, y - 6 * s, w * 0.3, h * 0.25);
      for (const k of [-1, 1]) { g.fillStyle(0x000000, 1); g.fillCircle(x + k * 6 * s, y - 3 * s, 2.8 * s); g.fillStyle(trim, 0.6); g.strokeCircle(x + k * 6 * s, y - 3 * s, 3.2 * s); }
      break;
    }
    case 'harlequin': {
      // Black leather half-mask, arched brows, a snub nose and a warty cheek.
      g.fillStyle(0x0a0808, 1); g.fillEllipse(x, y - 2 * s, w * 1.04, h * 0.5);
      g.fillStyle(0x2a2020, 1); g.fillEllipse(x, y - 3 * s, w, h * 0.46);
      for (const k of [-1, 1]) {
        g.lineStyle(2.4 * s, 0x0a0808, 1);
        g.beginPath(); g.arc(x + k * 6 * s, y - 2 * s, 6 * s, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
        g.fillStyle(0x000000, 1); g.fillCircle(x + k * 6 * s, y - 2 * s, 2.4 * s);
      }
      g.fillStyle(0x1a1212, 1); g.fillCircle(x, y + 4 * s, 3 * s);
      g.fillStyle(0x3a2a2a, 1); g.fillCircle(x + 9 * s, y + 3 * s, 1.4 * s);
      // A diamond of motley on the brow.
      const cs = [HARLE_RED, HARLE_GREEN, HARLE_YELLOW];
      for (let i = 0; i < 3; i++) {
        const dx = x + (i - 1) * 5 * s, dy = y - 10 * s;
        g.fillStyle(cs[i], 1); g.fillTriangle(dx - 2.5 * s, dy, dx, dy - 3 * s, dx + 2.5 * s, dy); g.fillTriangle(dx - 2.5 * s, dy, dx, dy + 3 * s, dx + 2.5 * s, dy);
      }
      break;
    }
    default: {
      // volto, comedy, tragedy: a full porcelain face.
      g.fillStyle(dim(base, 0.32), 1); g.fillEllipse(x + 1, y + 1.5, w, h);
      g.fillStyle(base, 1); g.fillEllipse(x, y, w, h);
      g.fillStyle(lit(base, 0.35), 0.55); g.fillEllipse(x - 4 * s, y - 6 * s, w * 0.42, h * 0.34);
      g.fillStyle(PORCELAIN_DARK, 0.35); g.fillEllipse(x + 5 * s, y + 6 * s, w * 0.4, h * 0.36);
      const tilt = kind === 'comedy' ? -1.4 : kind === 'tragedy' ? 1.6 : 0.3;
      eye(x - 6 * s, y - 4 * s, tilt); eye(x + 6 * s, y - 4 * s, -tilt);
      // Painted brows.
      g.lineStyle(1.3 * s, trim, 1);
      for (const k of [-1, 1]) {
        const by = y - 10 * s, bx = x + k * 6 * s;
        if (kind === 'tragedy') g.lineBetween(bx - k * 4 * s, by - 2 * s, bx + k * 4 * s, by + 1.5 * s);
        else { g.beginPath(); g.arc(bx, by + 2 * s, 4.5 * s, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath(); }
      }
      g.lineStyle(1.2 * s, dim(base, 0.3), 1); g.lineBetween(x, y - 3 * s, x - 1.5 * s, y + 4 * s);
      if (kind === 'comedy') {
        g.fillStyle(0x0a0810, 1);
        g.beginPath(); g.arc(x, y + 5 * s, 7 * s, 0.15, Math.PI - 0.15, false); g.closePath(); g.fillPath();
        g.fillStyle(VELVET, 1); g.fillEllipse(x, y + 10 * s, 6 * s, 2.4 * s);
      } else if (kind === 'tragedy') {
        g.fillStyle(0x0a0810, 1);
        g.beginPath(); g.arc(x, y + 14 * s, 7 * s, Math.PI + 0.2, -0.2, false); g.closePath(); g.fillPath();
        g.fillStyle(TEAR, 0.95); g.fillCircle(x - 7 * s, y + 2 * s, 1.6 * s); g.fillTriangle(x - 8.4 * s, y + 1.6 * s, x - 5.6 * s, y + 1.6 * s, x - 7 * s, y - 1.6 * s);
      } else {
        g.fillStyle(dim(base, 0.4), 1); g.fillEllipse(x, y + 9 * s, 7 * s, 2.2 * s);
        g.fillStyle(VELVET, 0.85); g.fillEllipse(x, y + 9 * s, 5 * s, 1.5 * s);
      }
      // Gilt filigree at the temples.
      for (const k of [-1, 1]) {
        g.lineStyle(1, trim, 0.9);
        g.beginPath(); g.arc(x + k * 10 * s, y - 2 * s, 3 * s, 0, Math.PI * 1.5, k < 0); g.strokePath();
        g.fillStyle(trim, 1); g.fillCircle(x + k * 11 * s, y + 3 * s, 1 * s);
      }
    }
  }
  if (part) noteGlyph(g, x - 1.5 * s, y - 11 * s, 0.55 * s, REED_BRASS, 0.95);
}

/**
 * A waltzing dancer seen from above-front: a bell of a gown that swings as she turns, a fitted
 * bodice, arms raised in hold, and a mask for a face. `t` (seconds) drives the swirl.
 */
export function dancer(g: G, x: number, y: number, s: number, gown: number, kind: MaskKind, t: number, maskBase = PORCELAIN): void {
  shadow(g, x, y + 2, 34 * s, 10 * s, 0.3);
  const sw = Math.sin(t * 5) * 4 * s;
  // The gown: tiered bell, a lighter hem, a few sequin glints.
  g.fillStyle(dim(gown, 0.35), 1);
  g.fillTriangle(x - 18 * s + sw, y, x + 18 * s + sw, y, x, y - 30 * s);
  g.fillEllipse(x + sw, y - 1 * s, 36 * s, 10 * s);
  g.fillStyle(gown, 1);
  g.fillTriangle(x - 15 * s + sw * 0.8, y - 3 * s, x + 15 * s + sw * 0.8, y - 3 * s, x, y - 31 * s);
  g.fillEllipse(x + sw * 0.8, y - 3 * s, 30 * s, 8 * s);
  g.fillStyle(lit(gown, 0.3), 0.7);
  g.fillTriangle(x - 6 * s, y - 6 * s, x + 1 * s, y - 6 * s, x - 1 * s, y - 28 * s);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3 + t * 3;
    g.fillStyle(SEQUINS[i % SEQUINS.length], 0.5 + Math.sin(t * 9 + i) * 0.4);
    g.fillCircle(x + Math.cos(a) * 12 * s + sw * 0.6, y - 5 * s + Math.sin(a) * 2.5 * s, 1.1 * s);
  }
  // Bodice and arms in hold.
  g.fillStyle(dim(gown, 0.2), 1); g.fillRoundedRect(x - 6 * s, y - 42 * s, 12 * s, 14 * s, 4 * s);
  g.lineStyle(2.6 * s, dim(gown, 0.1), 1);
  g.lineBetween(x - 5 * s, y - 39 * s, x - 13 * s, y - 48 * s + Math.sin(t * 5) * 2 * s);
  g.lineBetween(x + 5 * s, y - 39 * s, x + 12 * s, y - 34 * s);
  g.fillStyle(SILK_WHITE, 1); g.fillCircle(x - 13 * s, y - 48 * s + Math.sin(t * 5) * 2 * s, 2 * s); g.fillCircle(x + 12 * s, y - 34 * s, 2 * s);
  // Head and mask.
  g.fillStyle(0x2a1a14, 1); g.fillCircle(x, y - 50 * s, 8 * s);
  mask(g, x, y - 50 * s, 0.42 * s, kind, maskBase);
}

// ── Ground ───────────────────────────────────────────────────────────

/** Canal water: deep bottle green with slow ripple bands and a lighter skin near the quays. */
export function canalWater(g: G, r: Rect, rng: () => number, deep = CANAL_DEEP, mid = CANAL): void {
  g.fillStyle(deep, 1); g.fillRect(r.x, r.y, r.w, r.h);
  g.fillStyle(mid, 0.8); g.fillRect(r.x + 6, r.y + 6, r.w - 12, r.h - 12);
  for (let i = 0; i < (r.w * r.h) / 2600; i++) {
    const x = r.x + 10 + rng() * (r.w - 20), y = r.y + 8 + rng() * (r.h - 16);
    g.lineStyle(1.2, CANAL_LIT, 0.18 + rng() * 0.2);
    g.beginPath(); g.arc(x, y, 6 + rng() * 14, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
  }
  // Algae line at the waterline of every quay.
  g.lineStyle(3, 0x2f5a3a, 0.6); g.strokeRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3);
}

/** Quay paving: grey trachyte slabs in courses, a white Istrian kerb on the water side(s). */
export function quay(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(PAVE_DARK, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const SH = 22;
  for (let y = r.y, row = 0; y < r.y + r.h; y += SH, row++) {
    let x = r.x - (row % 2) * 18;
    while (x < r.x + r.w) {
      const sw = 30 + rng() * 22;
      const x0 = Math.max(r.x, x), x1 = Math.min(r.x + r.w, x + sw - 2);
      if (x1 > x0) {
        g.fillStyle(mixC(PAVE, PAVE_LIT, rng() * 0.6), 1); g.fillRect(x0, y + 1, x1 - x0, Math.min(SH - 2, r.y + r.h - y - 1));
        g.fillStyle(PAVE_DARK, 0.25); g.fillRect(x0, y + SH - 5, x1 - x0, 2);
      }
      x += sw;
    }
  }
}

/** A white Istrian kerb along an edge of water. */
export function kerb(g: G, x: number, y: number, w: number, h: number): void {
  g.fillStyle(ISTRIA_DARK, 1); g.fillRect(x, y, w, h);
  g.fillStyle(ISTRIA, 1); g.fillRect(x, y, w, h - 2);
  g.fillStyle(ISTRIA_LIT, 0.8); g.fillRect(x, y, w, 1.5);
  for (let k = x; k < x + w; k += 38) { g.fillStyle(ISTRIA_DARK, 0.6); g.fillRect(k, y, 1.2, h); }
}

/** A campo: brick laid in basket-weave, crossed by white stone lines that mark the old wells and gutters. */
export function campo(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(BRICK_DARK, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const B = 12;
  for (let j = 0; j * B < r.h; j++) {
    for (let i = 0; i * B < r.w; i++) {
      const x = r.x + i * B, y = r.y + j * B;
      const cw = Math.min(B, r.x + r.w - x), ch = Math.min(B, r.y + r.h - y);
      g.fillStyle(mixC(BRICK, BRICK_LIT, rng() * 0.5), 1);
      if ((i + j) % 2) { g.fillRect(x + 0.5, y + 0.5, cw - 1, ch / 2 - 1); g.fillRect(x + 0.5, y + ch / 2 + 0.5, cw - 1, ch / 2 - 1); }
      else { g.fillRect(x + 0.5, y + 0.5, cw / 2 - 1, ch - 1); g.fillRect(x + cw / 2 + 0.5, y + 0.5, cw / 2 - 1, ch - 1); }
    }
  }
  g.lineStyle(5, ISTRIA, 0.85);
  for (let x = r.x + 120; x < r.x + r.w - 40; x += 240) g.lineBetween(x, r.y, x, r.y + r.h);
  for (let y = r.y + 120; y < r.y + r.h - 40; y += 240) g.lineBetween(r.x, y, r.x + r.w, y);
  g.lineStyle(3, ISTRIA_DARK, 0.9); g.strokeRect(r.x, r.y, r.w, r.h);
}

/**
 * A humpback bridge across water, drawn flat into the ground: a stone deck of shallow steps that
 * rise to the crown (lighter there), white parapets, and the dark of the arch showing in the
 * water at each side. `across` true = the deck runs left↔right (a north–south canal under it).
 */
export function bridge(g: G, x: number, y: number, len: number, wide: number, across: boolean): void {
  const rx = across ? x - len / 2 : x - wide / 2, ry = across ? y - wide / 2 : y - len / 2;
  const rw = across ? len : wide, rh = across ? wide : len;
  // Arch shadows in the water.
  g.fillStyle(0x000000, 0.35);
  if (across) { g.fillEllipse(x, ry - 4, len * 0.5, 14); g.fillEllipse(x, ry + rh + 6, len * 0.5, 16); }
  else { g.fillEllipse(rx - 6, y, 16, len * 0.5); g.fillEllipse(rx + rw + 6, y, 16, len * 0.5); }
  g.fillStyle(ISTRIA_DARK, 1); g.fillRect(rx, ry, rw, rh);
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const k = 1 - Math.abs(i - (steps - 1) / 2) / (steps / 2);
    const c = mixC(PAVE, ISTRIA, 0.25 + k * 0.6);
    if (across) { const sx = rx + (i * rw) / steps; g.fillStyle(c, 1); g.fillRect(sx + 1, ry + 6, rw / steps - 2, rh - 12); g.fillStyle(ISTRIA_LIT, 0.7); g.fillRect(sx + 1, ry + 6, 2, rh - 12); }
    else { const sy = ry + (i * rh) / steps; g.fillStyle(c, 1); g.fillRect(rx + 6, sy + 1, rw - 12, rh / steps - 2); g.fillStyle(ISTRIA_LIT, 0.7); g.fillRect(rx + 6, sy + 1, rw - 12, 2); }
  }
  // Parapets with balusters.
  g.fillStyle(ISTRIA, 1);
  if (across) {
    for (const py of [ry, ry + rh - 6]) {
      g.fillRect(rx, py, rw, 6);
      for (let bx = rx + 8; bx < rx + rw - 4; bx += 12) { g.fillStyle(ISTRIA_DARK, 1); g.fillRect(bx, py + 1, 2, 4); g.fillStyle(ISTRIA, 1); }
    }
    g.fillStyle(ISTRIA_LIT, 1); g.fillRect(rx, ry, rw, 1.5);
  } else {
    for (const px of [rx, rx + rw - 6]) {
      g.fillRect(px, ry, 6, rh);
      for (let by = ry + 8; by < ry + rh - 4; by += 12) { g.fillStyle(ISTRIA_DARK, 1); g.fillRect(px + 1, by, 4, 2); g.fillStyle(ISTRIA, 1); }
    }
  }
}

/** Roofs seen from above the north edge: rows of curved coppi, altane on stilts, funnel chimneys. */
export function rooftops(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(ROOF_DARK, 1); g.fillRect(r.x, r.y, r.w, r.h);
  let x = r.x;
  while (x < r.x + r.w) {
    const bw = 90 + rng() * 120;
    const base = mixC(ROOF, ROOF_LIT, rng() * 0.5);
    const yTop = r.y + rng() * 30;
    g.fillStyle(base, 1); g.fillRect(x, yTop, bw - 4, r.h - (yTop - r.y));
    for (let yy = yTop + 6; yy < r.y + r.h; yy += 9) {
      g.lineStyle(1, ROOF_DARK, 0.55); g.lineBetween(x, yy, x + bw - 4, yy);
      for (let xx = x + ((yy / 9) % 2) * 5; xx < x + bw - 6; xx += 10) { g.fillStyle(ROOF_LIT, 0.35); g.fillEllipse(xx + 5, yy - 3, 8, 4); }
    }
    g.fillStyle(0x000000, 0.25); g.fillRect(x + bw - 6, yTop, 4, r.h);
    // An altana: a little timber roof-terrace on stilts with washing strung across it.
    if (rng() < 0.35) {
      const ax = x + 20 + rng() * (bw - 70), ay = yTop + 30 + rng() * (r.h - 80);
      g.fillStyle(OAK_DARK, 1); for (const k of [0, 36]) g.fillRect(ax + k, ay, 3, 22);
      g.fillStyle(OAK, 1); g.fillRect(ax - 3, ay - 4, 44, 6);
      g.lineStyle(1, OAK_LIT, 1); for (let k = 0; k < 44; k += 5) g.lineBetween(ax - 3 + k, ay - 4, ax - 3 + k, ay + 2);
      g.lineStyle(1, 0xdedede, 0.8); g.lineBetween(ax, ay - 14, ax + 38, ay - 12);
      for (let k = 0; k < 3; k++) { g.fillStyle([SILK_WHITE, VELVET_LIT, 0x8ab0d0][k], 0.9); g.fillRect(ax + 6 + k * 11, ay - 13, 7, 9); }
    }
    // Funnel chimneys (camini a imbuto), the town's skyline.
    const n = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) chimney(g, x + 20 + rng() * (bw - 40), yTop + 24 + rng() * (r.h - 50), 0.9 + rng() * 0.3);
    x += bw;
  }
}

/** A Venetian funnel chimney: a stuccoed stack flaring into an upturned cone, smoke-blackened at the lip. */
export function chimney(g: G, x: number, y: number, s: number): void {
  shadow(g, x + 4, y + 2, 16 * s, 5 * s, 0.3);
  g.fillStyle(STUCCO_CREAM, 1); g.fillRect(x - 4 * s, y - 22 * s, 8 * s, 22 * s);
  g.fillStyle(dim(STUCCO_CREAM, 0.2), 1); g.fillRect(x + 1 * s, y - 22 * s, 3 * s, 22 * s);
  g.fillStyle(BRICK_LIT, 1); g.fillTriangle(x - 11 * s, y - 34 * s, x + 11 * s, y - 34 * s, x, y - 21 * s);
  g.fillStyle(BRICK_DARK, 1); g.fillTriangle(x + 1 * s, y - 34 * s, x + 11 * s, y - 34 * s, x, y - 21 * s);
  g.fillStyle(0x2a2420, 1); g.fillEllipse(x, y - 34 * s, 22 * s, 5 * s);
  g.fillStyle(0x151210, 1); g.fillEllipse(x, y - 34 * s, 16 * s, 3 * s);
}

// ── Buildings ────────────────────────────────────────────────────────

/** An ogee-arched window (body + reversed-curve point), with an Istrian surround. */
export function ogeeWindow(g: G, cx: number, by: number, w: number, h: number, pane: number, glowA: number, frame = ISTRIA): void {
  const bodyH = h * 0.66;
  const top = by - bodyH;
  g.fillStyle(dim(frame, 0.25), 1); g.fillRect(cx - w / 2 - 3, top, w + 6, bodyH + 2);
  g.fillCircle(cx, top, w / 2 + 3);
  g.fillTriangle(cx - w * 0.3, top - w * 0.3, cx + w * 0.3, top - w * 0.3, cx, top - h * 0.34 - 4);
  g.fillStyle(frame, 1); g.fillRect(cx - w / 2 - 2, top, w + 4, bodyH);
  g.fillCircle(cx, top, w / 2 + 2);
  g.fillTriangle(cx - w * 0.28, top - w * 0.32, cx + w * 0.28, top - w * 0.32, cx, top - h * 0.34 - 2);
  g.fillStyle(pane, 1); g.fillRect(cx - w / 2, top, w, bodyH - 2);
  g.fillCircle(cx, top, w / 2);
  g.fillTriangle(cx - w * 0.22, top - w * 0.34, cx + w * 0.22, top - w * 0.34, cx, top - h * 0.34);
  if (glowA > 0) {
    g.fillStyle(CANDLE, glowA * 0.5); g.fillRect(cx - w / 2 + 2, top + bodyH * 0.2, w - 4, bodyH * 0.7);
    g.fillStyle(lit(CANDLE, 0.4), glowA * 0.5); g.fillCircle(cx, top + bodyH * 0.55, w * 0.25);
  }
  // Glazing bars.
  g.lineStyle(1, dim(frame, 0.4), 0.8);
  g.lineBetween(cx, top - w / 2, cx, top + bodyH - 2);
  g.lineBetween(cx - w / 2, top + bodyH * 0.45, cx + w / 2, top + bodyH * 0.45);
}

export interface PalazzoOpts {
  wall: number;
  /** Lit windows (0 = dark). */
  glow?: number;
  floors?: number;
  /** A water-door arch at the foot (palazzo on a canal). */
  waterDoor?: boolean;
  /** Green shutters on the upper windows. */
  shutters?: boolean;
  /** Banners of velvet hung from the piano nobile balcony. */
  hangings?: number;
}

/**
 * A Venetian Gothic palazzo, x,y = front-wall base centre: an Istrian plinth, weathered stucco
 * flaking to brick, a piano nobile of ogee windows behind a balustraded balcony, a smaller upper
 * floor, white string-courses, a crenellated cornice and funnel chimneys. Returns nothing; the
 * door is at the base centre.
 */
export function palazzo(g: G, x: number, y: number, w: number, h: number, o: PalazzoOpts, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  const floors = o.floors ?? 3;
  const glowA = o.glow ?? 0.8;
  shadow(g, x, y + 4, w * 1.05, 26, 0.35);
  // Wall and its weathering.
  g.fillStyle(dim(o.wall, 0.25), 1); g.fillRect(x0, top, w, h);
  g.fillStyle(o.wall, 1); g.fillRect(x0 + 2, top, w - 4, h - 2);
  for (let i = 0; i < w / 14; i++) {
    const px = x0 + 6 + rng() * (w - 12), py = top + 10 + rng() * (h - 30);
    g.fillStyle(rng() < 0.5 ? lit(o.wall, 0.12) : dim(o.wall, 0.12), 0.5); g.fillEllipse(px, py, 12 + rng() * 26, 6 + rng() * 14);
  }
  for (let i = 0; i < w / 60; i++) {
    // Stucco fallen away: a patch of brick.
    const px = x0 + 10 + rng() * (w - 40), py = top + 30 + rng() * (h - 70);
    g.fillStyle(BRICK, 0.9); g.fillRect(px, py, 18 + rng() * 14, 10 + rng() * 8);
    g.lineStyle(1, BRICK_DARK, 0.8); for (let k = 0; k < 3; k++) g.lineBetween(px, py + 3 + k * 4, px + 28, py + 3 + k * 4);
  }
  // Plinth of Istrian stone, green-stained at the waterline.
  g.fillStyle(ISTRIA_DARK, 1); g.fillRect(x0 - 4, y - 26, w + 8, 26);
  g.fillStyle(ISTRIA, 1); g.fillRect(x0 - 4, y - 28, w + 8, 20);
  g.fillStyle(0x3f6a4a, 0.55); g.fillRect(x0 - 4, y - 8, w + 8, 8);
  // Storeys.
  const fh = (h - 28) / floors;
  for (let f = 0; f < floors; f++) {
    const fy = y - 28 - f * fh;
    // String course.
    g.fillStyle(ISTRIA, 1); g.fillRect(x0, fy - 3, w, 5);
    g.fillStyle(ISTRIA_LIT, 0.8); g.fillRect(x0, fy - 3, w, 1.5);
    const nobile = f === 1;
    const n = Math.max(2, Math.round(w / (nobile ? 34 : 48)));
    const ww = nobile ? 18 : 14, wh = fh * (nobile ? 0.74 : 0.6);
    for (let i = 0; i < n; i++) {
      // The nobile's middle windows bunch into a polifora; outer windows stand alone.
      const span = w - 40;
      let cx = x0 + 20 + (span * (i + 0.5)) / n;
      if (nobile && n >= 5) { const mid = (n - 1) / 2; cx = x + (i - mid) * (Math.abs(i - mid) <= 1.5 ? 26 : 34) + Math.sign(i - mid) * (Math.abs(i - mid) > 1.5 ? 20 : 0); }
      if (f === 0) {
        // Ground floor: the water-door / portal in the middle, small barred windows else.
        if (Math.abs(cx - x) < w / (n * 2)) continue;
        g.fillStyle(dim(o.wall, 0.5), 1); g.fillRect(cx - 7, fy - fh * 0.55, 14, fh * 0.36);
        g.lineStyle(1, IRON, 1); for (let k = -1; k <= 1; k++) g.lineBetween(cx + k * 4, fy - fh * 0.55, cx + k * 4, fy - fh * 0.19);
        continue;
      }
      const isLit = rng() < glowA;
      ogeeWindow(g, cx, fy - 6, ww, wh, isLit ? 0x4a3020 : 0x1a1a24, isLit ? 1 : 0);
      if (o.shutters && !nobile) {
        g.fillStyle(0x2f5a3e, 1); g.fillRect(cx - ww / 2 - 8, fy - 6 - wh * 0.66, 6, wh * 0.66); g.fillRect(cx + ww / 2 + 2, fy - 6 - wh * 0.66, 6, wh * 0.66);
        g.lineStyle(1, 0x1d3b28, 1); for (let k = 0; k < 4; k++) { const ly = fy - 6 - wh * 0.6 + k * wh * 0.15; g.lineBetween(cx - ww / 2 - 8, ly, cx - ww / 2 - 2, ly); g.lineBetween(cx + ww / 2 + 2, ly, cx + ww / 2 + 8, ly); }
      }
    }
    if (nobile) {
      // The balcony: a stone balustrade across the polifora.
      const bw = Math.min(w - 30, 170);
      g.fillStyle(ISTRIA_DARK, 1); g.fillRect(x - bw / 2, fy - 18, bw, 14);
      g.fillStyle(ISTRIA, 1); g.fillRect(x - bw / 2, fy - 20, bw, 4);
      for (let bx = x - bw / 2 + 4; bx < x + bw / 2 - 2; bx += 7) { g.fillStyle(ISTRIA, 1); g.fillEllipse(bx + 1.5, fy - 11, 4, 10); }
      g.fillStyle(ISTRIA_LIT, 1); g.fillRect(x - bw / 2, fy - 6, bw, 3);
      for (let i = 0; i < (o.hangings ?? 0); i++) {
        const hx = x - bw / 2 + 14 + (i * (bw - 28)) / Math.max(1, (o.hangings ?? 1) - 1);
        g.fillStyle(VELVET_DARK, 1); g.fillRect(hx - 7, fy - 6, 14, 34);
        g.fillStyle(VELVET, 1); g.fillRect(hx - 6, fy - 6, 12, 32);
        g.fillTriangle(hx - 6, fy + 26, hx + 6, fy + 26, hx, fy + 34);
        g.fillStyle(GILT, 1); g.fillRect(hx - 6, fy - 6, 12, 3); g.fillCircle(hx, fy + 12, 2.6);
      }
    }
  }
  // Water-door or portal.
  if (o.waterDoor !== false) {
    const dw = Math.min(56, w * 0.2), dh = Math.min(64, fh * 0.9);
    g.fillStyle(ISTRIA, 1); g.fillRect(x - dw / 2 - 5, y - 28 - dh, dw + 10, dh + 2); g.fillCircle(x, y - 28 - dh, dw / 2 + 5);
    g.fillStyle(0x140e10, 1); g.fillRect(x - dw / 2, y - 28 - dh, dw, dh); g.fillCircle(x, y - 28 - dh, dw / 2);
    g.fillStyle(OAK_DARK, 1); g.fillRect(x - dw / 2 + 4, y - 28 - dh * 0.8, dw - 8, dh * 0.8);
    g.lineStyle(1, OAK_LIT, 0.6); for (let k = 1; k < 5; k++) g.lineBetween(x - dw / 2 + 4 + (k * (dw - 8)) / 5, y - 28 - dh * 0.8, x - dw / 2 + 4 + (k * (dw - 8)) / 5, y - 28);
    g.fillStyle(GILT, 1); g.fillCircle(x - 4, y - 28 - dh * 0.4, 2); g.fillCircle(x + 4, y - 28 - dh * 0.4, 2);
  }
  // Cornice and Venetian merlons (little stepped crenels).
  g.fillStyle(ISTRIA, 1); g.fillRect(x0 - 6, top - 8, w + 12, 10);
  g.fillStyle(ISTRIA_DARK, 0.6); g.fillRect(x0 - 6, top, w + 12, 2);
  for (let mx = x0; mx < x0 + w - 6; mx += 22) {
    g.fillStyle(ISTRIA, 1); g.fillRect(mx + 3, top - 18, 10, 10); g.fillTriangle(mx + 3, top - 18, mx + 13, top - 18, mx + 8, top - 26);
    g.fillStyle(ISTRIA_LIT, 0.8); g.fillRect(mx + 3, top - 18, 2, 10);
  }
  chimney(g, x0 + w * 0.18, top - 8, 1.1);
  chimney(g, x0 + w * 0.82, top - 8, 1);
}

/**
 * The Ballroom of the Hundred Lamps: a vast pale palazzo whose whole piano nobile is five tall
 * round-headed windows, each holding a lit chandelier and swagged inside with crimson velvet;
 * a grand staircase down to the campo, statues of masked muses on the roof balustrade, and a
 * frieze of carved staves running the length of it. The dancers in the windows are drawn live in
 * `ballroomWindows` (animateOver).
 */
/** Where the ballroom's five great windows are, so the dancers in them can be drawn live. */
export function ballroomWindowRects(x: number, y: number, w: number, h: number): Rect[] {
  const x0 = x - w / 2, top = y - h, bay = w / 5;
  const out: Rect[] = [];
  for (let i = 0; i < 5; i++) {
    const cx = x0 + bay * (i + 0.5), ww = bay * 0.58, wy = top + 52, wh = h - 150;
    out.push({ x: cx - ww / 2, y: wy - ww / 2, w: ww, h: wh + ww / 2 });
  }
  return out;
}

export function ballroom(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 6, w * 1.08, 30, 0.4);
  g.fillStyle(dim(STUCCO_CREAM, 0.2), 1); g.fillRect(x0, top, w, h);
  g.fillStyle(STUCCO_CREAM, 1); g.fillRect(x0 + 3, top, w - 6, h - 3);
  for (let i = 0; i < 30; i++) { g.fillStyle(lit(STUCCO_CREAM, 0.15), 0.4); g.fillEllipse(x0 + rng() * w, top + rng() * h, 30, 10); }
  // Rusticated ground storey.
  g.fillStyle(ISTRIA_DARK, 1); g.fillRect(x0, y - 70, w, 70);
  for (let ry = y - 70; ry < y; ry += 14) {
    for (let rx = x0 + ((ry / 14) % 2) * 20; rx < x0 + w; rx += 40) { g.fillStyle(ISTRIA, 1); g.fillRect(rx + 1, ry + 1, 38, 12); g.fillStyle(ISTRIA_LIT, 0.6); g.fillRect(rx + 1, ry + 1, 38, 2); }
  }
  // Pilasters between the windows.
  const n = 5;
  const bay = w / n;
  for (let i = 0; i < n; i++) {
    const cx = x0 + bay * (i + 0.5);
    if (i > 0) {
      const px = x0 + bay * i;
      g.fillStyle(ISTRIA_DARK, 1); g.fillRect(px - 9, top + 30, 18, h - 100);
      g.fillStyle(ISTRIA, 1); g.fillRect(px - 8, top + 30, 15, h - 100);
      g.fillStyle(GILT, 1); g.fillRect(px - 10, top + 30, 20, 6); g.fillRect(px - 10, y - 76, 20, 6);
    }
    // A great round-headed window.
    const ww = bay * 0.58, wy = top + 52, wh = h - 150;
    g.fillStyle(ISTRIA, 1); g.fillRect(cx - ww / 2 - 5, wy, ww + 10, wh + 6); g.fillCircle(cx, wy, ww / 2 + 5);
    g.fillStyle(0x6a3a1a, 1); g.fillRect(cx - ww / 2, wy, ww, wh); g.fillCircle(cx, wy, ww / 2);
    g.fillStyle(AMBER, 0.55); g.fillRect(cx - ww / 2, wy, ww, wh); g.fillCircle(cx, wy, ww / 2);
    g.fillStyle(CANDLE, 0.35); g.fillCircle(cx, wy + 10, ww * 0.42);
    // The chandelier: tiers of gilt arms, candle flames and hanging crystal drops.
    const chy = wy + 4;
    g.lineStyle(1.5, GILT_DARK, 1); g.lineBetween(cx, wy - ww / 2, cx, chy);
    for (let tier = 0; tier < 3; tier++) {
      const tr = ww * (0.18 + tier * 0.1), ty = chy + tier * 10;
      g.lineStyle(2, GILT, 1); g.strokeEllipse(cx, ty, tr * 2, tr * 0.5);
      for (let k = 0; k < 6 + tier * 2; k++) {
        const a = (k / (6 + tier * 2)) * Math.PI * 2;
        const fx = cx + Math.cos(a) * tr, fy = ty + Math.sin(a) * tr * 0.25;
        g.fillStyle(SILK_WHITE, 1); g.fillRect(fx - 1, fy - 5, 2, 5);
        g.fillStyle(GILT_LIT, 1); g.fillCircle(fx, fy - 7, 1.6);
        g.fillStyle(MIRROR_LIT, 0.9); g.fillCircle(fx, fy + 4, 1.2);
      }
    }
    g.fillStyle(GILT, 1); g.fillCircle(cx, chy + 32, 3);
    // Velvet swags inside the window, a gilt keystone over it.
    g.fillStyle(VELVET, 0.95);
    g.fillTriangle(cx - ww / 2, wy - ww * 0.2, cx - ww / 2 + 12, wy - ww * 0.2, cx - ww / 2, wy + wh);
    g.fillTriangle(cx + ww / 2, wy - ww * 0.2, cx + ww / 2 - 12, wy - ww * 0.2, cx + ww / 2, wy + wh);
    g.fillStyle(VELVET_DARK, 1); g.fillEllipse(cx, wy - ww * 0.24, ww, 10);
    g.fillStyle(GILT, 1); g.fillTriangle(cx - 7, wy - ww / 2 - 4, cx + 7, wy - ww / 2 - 4, cx, wy - ww / 2 + 8);
    // A balcony rail before it.
    g.fillStyle(IRON, 1); g.fillRect(cx - ww / 2 - 6, wy + wh - 16, ww + 12, 3);
    for (let bx = cx - ww / 2 - 4; bx < cx + ww / 2 + 6; bx += 5) g.fillRect(bx, wy + wh - 16, 1.4, 14);
    g.fillStyle(IRON, 1); g.fillRect(cx - ww / 2 - 6, wy + wh - 3, ww + 12, 3);
  }
  // The stave frieze: five gilt lines, notes riding them, the length of the cornice.
  for (let k = 0; k < 5; k++) { g.lineStyle(1, GILT_DARK, 0.9); g.lineBetween(x0 + 10, top + 14 + k * 4, x0 + w - 10, top + 14 + k * 4); }
  for (let nx = x0 + 30; nx < x0 + w - 20; nx += 26) noteGlyph(g, nx, top + 18 + ((nx * 7) % 5) * 3, 0.8, GILT);
  // Cornice, balustrade, and masked muses on the roof.
  g.fillStyle(ISTRIA, 1); g.fillRect(x0 - 10, top - 10, w + 20, 12);
  g.fillStyle(ISTRIA_DARK, 1); g.fillRect(x0 - 10, top, w + 20, 3);
  for (let bx = x0 - 6; bx < x0 + w + 6; bx += 9) { g.fillStyle(ISTRIA, 1); g.fillEllipse(bx + 2, top - 18, 5, 14); }
  g.fillStyle(ISTRIA_LIT, 1); g.fillRect(x0 - 10, top - 28, w + 20, 5);
  for (let i = 0; i <= n; i++) {
    const sx = x0 + bay * i;
    g.fillStyle(ISTRIA, 1); g.fillRect(sx - 8, top - 34, 16, 8);
    g.fillStyle(ISTRIA_LIT, 1); g.fillTriangle(sx - 7, top - 34, sx + 7, top - 34, sx, top - 66);
    g.fillCircle(sx, top - 70, 6);
    mask(g, sx, top - 71, 0.24, i % 2 ? 'comedy' : 'tragedy', ISTRIA_LIT, GILT);
  }
  // The grand stair, splitting round a landing.
  for (let k = 0; k < 6; k++) {
    g.fillStyle(k % 2 ? ISTRIA : ISTRIA_LIT, 1);
    g.fillRect(x - 70 - k * 8, y - 6 + k * 3 - 18, 140 + k * 16, 4);
  }
  g.fillStyle(0x140e10, 1); g.fillRect(x - 30, y - 70, 60, 50); g.fillCircle(x, y - 70, 30);
  g.fillStyle(AMBER, 0.5); g.fillRect(x - 26, y - 70, 52, 48); g.fillCircle(x, y - 70, 26);
  g.fillStyle(GILT, 1); g.fillRect(x - 34, y - 104, 68, 5);
  mask(g, x, y - 112, 0.5, 'volto', GILT, GILT_DARK);
}

/** Live dancers turning past the ballroom windows, and the chandeliers' twinkle. */
export function ballroomWindows(g: G, wins: Rect[], t: number): void {
  for (let i = 0; i < wins.length; i++) {
    const r = wins[i];
    const cx = r.x + r.w / 2;
    const bottom = r.y + r.h - 18;
    // Two couples per window, waltzing across it and back.
    for (let k = 0; k < 2; k++) {
      const ph = (t * 0.16 + i * 0.31 + k * 0.5) % 1;
      const px = r.x + 6 + (Math.sin(ph * Math.PI * 2) * 0.5 + 0.5) * (r.w - 12);
      const c = [VELVET_LIT, SEQUINS[(i + k) % SEQUINS.length], FACADE_LIT][(i + k) % 3];
      g.fillStyle(0x2a1408, 0.7);
      g.fillTriangle(px - 7, bottom, px + 7, bottom, px, bottom - 18);
      g.fillCircle(px, bottom - 22, 3.6);
      g.fillStyle(c, 0.45); g.fillTriangle(px - 6, bottom, px + 6, bottom, px, bottom - 16);
      g.fillStyle(0x2a1408, 0.7); g.fillRect(px + 5, bottom - 26, 3, 24); g.fillCircle(px + 6.5, bottom - 29, 3.2);
    }
    // Twinkle on the chandelier.
    for (let k = 0; k < 3; k++) {
      const a = t * 2 + i + k * 2.1;
      g.fillStyle(0xffffff, 0.3 + Math.sin(t * 7 + i * 3 + k) * 0.3);
      g.fillCircle(cx + Math.cos(a) * r.w * 0.22, r.y + r.w / 2 + 10 + k * 8, 1.5);
    }
  }
}

/**
 * A mask-maker's workshop, x,y = shopfront base: a narrow stucco house whose ground floor is
 * all open shutters, every shutter and the lintel hung with masks on ribbons; papier-mâché faces
 * drying on a rack, a bench with paint-pots, and a hanging sign cut in the shape of a mask.
 */
export function maskShop(g: G, x: number, y: number, w: number, wall: number, rng: () => number): void {
  const h = 190, x0 = x - w / 2;
  shadow(g, x, y + 4, w * 1.05, 18, 0.35);
  g.fillStyle(dim(wall, 0.25), 1); g.fillRect(x0, y - h, w, h);
  g.fillStyle(wall, 1); g.fillRect(x0 + 2, y - h, w - 4, h - 2);
  for (let i = 0; i < 8; i++) { g.fillStyle(lit(wall, 0.12), 0.5); g.fillEllipse(x0 + rng() * w, y - h + rng() * h, 20, 8); }
  // Upper floor: two windows with flower boxes, and a roof edge.
  for (const k of [-1, 1]) {
    const wx = x + k * w * 0.24;
    ogeeWindow(g, wx, y - 120, 14, 40, 0x3a2418, 0.8);
    g.fillStyle(OAK, 1); g.fillRect(wx - 12, y - 118, 24, 6);
    for (let f = 0; f < 5; f++) { g.fillStyle([VELVET_LIT, GILT_LIT, SILK_WHITE][f % 3], 1); g.fillCircle(wx - 9 + f * 4.5, y - 120, 2.4); }
  }
  g.fillStyle(ROOF, 1); g.fillRect(x0 - 8, y - h - 10, w + 16, 12);
  g.fillStyle(ROOF_DARK, 1); g.fillRect(x0 - 8, y - h + 1, w + 16, 3);
  chimney(g, x0 + w * 0.7, y - h - 8, 0.9);
  // The open shop: a dark interior glowing from a lamp, two shutters swung out.
  const sy = y - 86;
  g.fillStyle(ISTRIA, 1); g.fillRect(x0 + 8, sy - 6, w - 16, 6);
  g.fillStyle(0x2a1a12, 1); g.fillRect(x0 + 12, sy, w - 24, 80);
  g.fillStyle(CANDLE, 0.25); g.fillRect(x0 + 12, sy, w - 24, 80);
  glow(g, x, sy + 30, 30, CANDLE, 0.06, 3);
  // Shelves of masks inside.
  const kinds: MaskKind[] = ['volto', 'colombina', 'bauta', 'medico', 'moretta', 'comedy', 'tragedy', 'harlequin'];
  for (let row = 0; row < 2; row++) {
    g.fillStyle(OAK, 1); g.fillRect(x0 + 14, sy + 30 + row * 26, w - 28, 3);
    for (let k = 0; k < Math.floor((w - 40) / 18); k++) {
      const mx = x0 + 26 + k * 18, my = sy + 20 + row * 26;
      const kind = kinds[(k + row * 3) % kinds.length];
      mask(g, mx, my, 0.32, kind, kind === 'moretta' ? 0x16101c : [PORCELAIN, GILT, VELVET_LIT, SEQUINS[k % 5]][(k + row) % 4], GILT);
    }
  }
  // Shutters swung open, hung with masks on ribbons.
  for (const k of [-1, 1]) {
    const shx = k < 0 ? x0 - 2 : x0 + w - 12;
    g.fillStyle(0x2f5a3e, 1); g.fillRect(shx, sy, 14, 80);
    g.lineStyle(1, 0x1d3b28, 1); for (let l = 0; l < 8; l++) g.lineBetween(shx, sy + 6 + l * 10, shx + 14, sy + 6 + l * 10);
    for (let m = 0; m < 3; m++) {
      const mx = shx + 7, my = sy + 14 + m * 24;
      g.lineStyle(1, SEQUINS[(m + (k > 0 ? 2 : 0)) % 5], 1); g.lineBetween(mx, my - 12, mx, my - 6);
      mask(g, mx, my, 0.3, kinds[(m * 3 + (k > 0 ? 1 : 0)) % kinds.length], [PORCELAIN, GILT, VELVET][m], GILT);
    }
  }
  // The counter with paint pots and brushes.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x0 + 10, y - 16, w - 20, 16);
  g.fillStyle(OAK, 1); g.fillRect(x0 + 10, y - 18, w - 20, 5);
  for (let k = 0; k < 4; k++) {
    const px = x0 + 22 + k * ((w - 44) / 3);
    g.fillStyle(0xdedede, 1); g.fillRect(px - 4, y - 26, 8, 8);
    g.fillStyle([VELVET, GILT, SEQUINS[1], 0x1a1a1a][k], 1); g.fillEllipse(px, y - 26, 8, 3);
    if (k % 2) { g.lineStyle(1.2, OAK_LIT, 1); g.lineBetween(px + 1, y - 26, px + 4, y - 36); }
  }
  // The sign: a gilt mask on an iron bracket.
  const bx = x0 + w - 6;
  g.lineStyle(2, IRON, 1); g.lineBetween(bx, y - 150, bx + 34, y - 150); g.lineBetween(bx, y - 140, bx + 14, y - 150);
  g.lineStyle(1, IRON, 1); g.lineBetween(bx + 28, y - 150, bx + 28, y - 144);
  mask(g, bx + 28, y - 132, 0.55, 'colombina', GILT, GILT_DARK);
}

/** Papier-mâché faces drying on a rack: pale blanks, a few half-painted, a pot of gesso beside. */
export function dryingRack(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 60, 12, 0.3);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 28, y - 46, 3, 46); g.fillRect(x + 25, y - 46, 3, 46);
  for (let row = 0; row < 2; row++) {
    const ry = y - 40 + row * 20;
    g.lineStyle(1, 0xd0c8b8, 1); g.lineBetween(x - 28, ry, x + 28, ry);
    for (let k = 0; k < 4; k++) {
      const mx = x - 20 + k * 13;
      mask(g, mx, ry + 7, 0.28, 'volto', k === 2 && row === 0 ? PORCELAIN : 0xe8e0cc, k === 1 ? GILT : 0xbcb4a4);
    }
  }
  g.fillStyle(0xdcd6c8, 1); g.fillRect(x + 32, y - 12, 12, 12); g.fillStyle(SILK_WHITE, 1); g.fillEllipse(x + 38, y - 12, 12, 4);
}

/**
 * The Hall of Mirrors, x,y = base centre: a severe palazzo of grey stone whose every window is a
 * tall mirror, so the building shows you the campo instead of its rooms. Silvered pilasters,
 * a gilt hand-glass over the door, and a strip of reflected lantern light down each mirror.
 */
/** Where the Hall's mirror-windows are, for the live sheen. */
export function mirrorHallRects(x: number, y: number, w: number, h: number): Rect[] {
  const x0 = x - w / 2, top = y - h;
  const n = Math.max(3, Math.round(w / 70));
  const bay = w / n;
  const out: Rect[] = [];
  for (let i = 0; i < n; i++) { const cx = x0 + bay * (i + 0.5), mw = bay * 0.5; out.push({ x: cx - mw / 2, y: top + 30 - mw / 2, w: mw, h: h - 90 + mw / 2 }); }
  return out;
}

export function mirrorHall(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 4, w * 1.06, 24, 0.38);
  g.fillStyle(0x5a5a66, 1); g.fillRect(x0, top, w, h);
  g.fillStyle(0x7a7a88, 1); g.fillRect(x0 + 2, top, w - 4, h - 3);
  for (let ry = top + 4; ry < y; ry += 16) { g.lineStyle(1, 0x5a5a66, 0.6); g.lineBetween(x0, ry, x0 + w, ry); }
  const n = Math.max(3, Math.round(w / 70));
  const bay = w / n;
  for (let i = 0; i < n; i++) {
    const cx = x0 + bay * (i + 0.5);
    const mw = bay * 0.5, my = top + 30, mh = h - 90;
    g.fillStyle(GILT_DARK, 1); g.fillRect(cx - mw / 2 - 5, my - 5, mw + 10, mh + 10); g.fillCircle(cx, my, mw / 2 + 5);
    g.fillStyle(GILT, 1); g.fillRect(cx - mw / 2 - 3, my - 3, mw + 6, mh + 6); g.fillCircle(cx, my, mw / 2 + 3);
    g.fillStyle(MIRROR_DARK, 1); g.fillRect(cx - mw / 2, my, mw, mh); g.fillCircle(cx, my, mw / 2);
    // What the mirror shows: the lantern-lit campo, upside down in the silver.
    g.fillStyle(MIRROR, 0.85); g.fillRect(cx - mw / 2 + 2, my + mh * 0.45, mw - 4, mh * 0.55 - 2);
    g.fillStyle(BRICK, 0.35); g.fillRect(cx - mw / 2 + 2, my + mh * 0.7, mw - 4, mh * 0.3 - 2);
    g.fillStyle(CANDLE, 0.6); g.fillCircle(cx + (rng() - 0.5) * mw * 0.4, my + mh * 0.35, 3);
    g.fillStyle(MIRROR_LIT, 0.55); g.fillTriangle(cx - mw / 2 + 3, my + mh, cx - mw / 2 + 10, my + mh, cx + mw / 2 - 3, my - mw * 0.2);
    if (i > 0) {
      const px = x0 + bay * i;
      g.fillStyle(MIRROR_DARK, 1); g.fillRect(px - 6, top + 12, 12, h - 40);
      g.fillStyle(MIRROR, 1); g.fillRect(px - 4, top + 12, 6, h - 40);
    }
  }
  // Cornice of silvered stone.
  g.fillStyle(MIRROR_DARK, 1); g.fillRect(x0 - 8, top - 10, w + 16, 12);
  g.fillStyle(MIRROR_LIT, 0.8); g.fillRect(x0 - 8, top - 10, w + 16, 3);
  // The door, with a gilt hand-glass over it.
  g.fillStyle(0x16141c, 1); g.fillRect(x - 22, y - 56, 44, 56); g.fillCircle(x, y - 56, 22);
  g.fillStyle(MIRROR_DARK, 0.8); g.fillRect(x - 18, y - 52, 36, 52);
  g.lineStyle(1, MIRROR_LIT, 0.5); g.lineBetween(x - 14, y - 4, x + 10, y - 48);
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - 3, y - 96, 6, 18);
  g.fillStyle(GILT, 1); g.fillEllipse(x, y - 108, 26, 32);
  g.fillStyle(MIRROR_LIT, 1); g.fillEllipse(x, y - 108, 18, 24);
  g.fillStyle(0xffffff, 0.6); g.fillEllipse(x - 4, y - 113, 5, 9);
}

/** Light moving in the Hall's mirrors: a sheen that slides down each glass in turn. */
export function mirrorSheen(g: G, mirrors: Rect[], t: number): void {
  for (let i = 0; i < mirrors.length; i++) {
    const r = mirrors[i];
    const ph = (t * 0.25 + i * 0.27) % 1.6;
    if (ph > 1) continue;
    const sy = r.y + ph * r.h;
    g.fillStyle(0xffffff, 0.22 * Math.sin(ph * Math.PI));
    g.fillTriangle(r.x + 2, sy, r.x + r.w - 2, sy - 18, r.x + r.w - 2, sy - 8);
    g.fillTriangle(r.x + 2, sy, r.x + 2, sy + 10, r.x + r.w - 2, sy - 8);
  }
}

/**
 * A fireworks barge moored in the lagoon, x,y = waterline centre: a flat hull of tarred timber
 * painted with red and white chevrons, a deck of rocket racks (sticks and coloured cones),
 * stubby mortar tubes, kegs of powder under a tarpaulin, bunting between two lantern poles.
 */
export function fireworksBarge(g: G, x: number, y: number, w: number): void {
  // Reflection.
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 12, w * 1.05, 26);
  const x0 = x - w / 2;
  g.fillStyle(0x1a120c, 1); g.fillRect(x0, y - 22, w, 24);
  g.fillTriangle(x0, y - 22, x0, y + 2, x0 - 16, y - 22);
  g.fillTriangle(x0 + w, y - 22, x0 + w, y + 2, x0 + w + 16, y - 22);
  for (let cx = x0; cx < x0 + w; cx += 24) {
    g.fillStyle(FW_WHITE, 0.9); g.fillTriangle(cx, y - 18, cx + 12, y - 6, cx + 24, y - 18);
    g.fillStyle(0xc0302a, 1); g.fillTriangle(cx, y - 6, cx + 12, y - 18, cx + 24, y - 6);
  }
  g.fillStyle(OAK, 1); g.fillRect(x0 - 16, y - 26, w + 32, 5);
  g.fillStyle(OAK_LIT, 1); g.fillRect(x0 - 16, y - 26, w + 32, 1.5);
  // Rocket racks.
  for (let r = 0; r < 3; r++) {
    const rx = x0 + 18 + r * (w * 0.22);
    g.fillStyle(OAK_DARK, 1); g.fillRect(rx, y - 58, 3, 32); g.fillRect(rx + 34, y - 58, 3, 32); g.fillRect(rx, y - 44, 37, 3);
    for (let k = 0; k < 5; k++) {
      const sx = rx + 4 + k * 7;
      g.lineStyle(1.2, 0xcab08a, 1); g.lineBetween(sx, y - 28, sx + 1, y - 70);
      g.fillStyle([0xc0302a, 0x2a70c0, 0x30a050, GILT, 0x8a40c0][(k + r) % 5], 1); g.fillRect(sx - 2, y - 84, 5, 14);
      g.fillStyle(FW_WHITE, 1); g.fillTriangle(sx - 2, y - 84, sx + 3, y - 84, sx + 0.5, y - 92);
    }
  }
  // Mortar tubes, angled.
  for (let k = 0; k < 4; k++) {
    const mx = x0 + w * 0.72 + k * 12;
    g.fillStyle(0x3a3a3a, 1); g.fillRect(mx - 4, y - 50, 8, 26);
    g.fillStyle(0x1a1a1a, 1); g.fillEllipse(mx, y - 50, 8, 3);
    g.fillStyle(0x7a7a7a, 1); g.fillRect(mx - 4, y - 40, 8, 2);
  }
  // Kegs under a tarpaulin.
  g.fillStyle(0x5a4a30, 1); g.fillRect(x0 + w * 0.62, y - 46, 26, 20);
  g.fillStyle(0x6a6a4a, 1); g.fillTriangle(x0 + w * 0.6, y - 26, x0 + w * 0.6 + 30, y - 26, x0 + w * 0.62 + 13, y - 52);
  // Lantern poles and bunting.
  const lp = [x0 + 4, x0 + w - 4];
  for (const px of lp) {
    g.fillStyle(IRON, 1); g.fillRect(px - 1.5, y - 120, 3, 96);
    g.fillStyle(CANDLE, 0.9); g.fillRect(px - 4, y - 128, 8, 9);
    glow(g, px, y - 124, 14, CANDLE, 0.06, 2);
  }
  for (let k = 0; k <= 12; k++) {
    const t = k / 12;
    const bx = lp[0] + (lp[1] - lp[0]) * t, by = y - 112 + Math.sin(t * Math.PI) * 22;
    g.fillStyle(SEQUINS[k % SEQUINS.length], 0.95); g.fillTriangle(bx - 5, by, bx + 5, by, bx, by + 10);
  }
  g.lineStyle(1, 0xd0c8b0, 0.7);
  for (let k = 0; k < 12; k++) {
    const t0 = k / 12, t1 = (k + 1) / 12;
    g.lineBetween(lp[0] + (lp[1] - lp[0]) * t0, y - 112 + Math.sin(t0 * Math.PI) * 22, lp[0] + (lp[1] - lp[0]) * t1, y - 112 + Math.sin(t1 * Math.PI) * 22);
  }
}

/** A firework bursting: a peony of streaks with a bright core, `k` 0..1 through its life. */
export function fireworkBurst(g: G, x: number, y: number, r: number, k: number, color: number, spokes = 14): void {
  const fade = 1 - k;
  const rr = r * Math.sqrt(k);
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    const ex = x + Math.cos(a) * rr, ey = y + Math.sin(a) * rr + k * k * r * 0.3;
    g.lineStyle(1.6, color, fade * 0.8);
    g.lineBetween(x + Math.cos(a) * rr * 0.6, y + Math.sin(a) * rr * 0.6 + k * k * r * 0.2, ex, ey);
    g.fillStyle(lit(color, 0.5), fade); g.fillCircle(ex, ey, 1.8);
  }
  if (k < 0.3) { g.fillStyle(0xffffff, (0.3 - k) * 2.5); g.fillCircle(x, y, 6 * (1 - k)); }
}

/**
 * The Teatrino: a travelling commedia stage on trestles, x,y = front base. A gilt-and-red
 * proscenium hung with the stock masks, a painted backdrop of a canal under the moon, red
 * curtains half drawn, tin-hooded footlights, and a hand-lettered board: COMMEDIA.
 */
export function teatrino(g: G, x: number, y: number, w: number, rng: () => number): void {
  const x0 = x - w / 2, stageY = y - 40, ph = 140;
  shadow(g, x, y + 4, w * 1.1, 20, 0.35);
  // Trestles and a valance of striped cloth hiding them.
  g.fillStyle(OAK_DARK, 1); for (let k = 0; k < 5; k++) g.fillRect(x0 + 8 + k * ((w - 20) / 4), stageY, 5, 40);
  for (let k = 0; k < w; k += 18) { g.fillStyle(k % 36 ? HARLE_YELLOW : VELVET, 1); g.fillRect(x0 + k, stageY + 4, 18, 26); }
  for (let k = 0; k < w; k += 18) { g.fillStyle(k % 36 ? dim(HARLE_YELLOW, 0.2) : VELVET_DARK, 1); g.fillTriangle(x0 + k, stageY + 30, x0 + k + 18, stageY + 30, x0 + k + 9, stageY + 38); }
  // Boards.
  g.fillStyle(OAK, 1); g.fillRect(x0 - 6, stageY - 8, w + 12, 12);
  g.lineStyle(1, OAK_DARK, 1); for (let k = 0; k < w + 12; k += 22) g.lineBetween(x0 - 6 + k, stageY - 8, x0 - 6 + k, stageY + 4);
  // The backdrop: night canal, palazzi, a moon.
  const by0 = stageY - ph;
  g.fillStyle(0x1a2a4a, 1); g.fillRect(x0 + 10, by0, w - 20, ph - 8);
  g.fillStyle(0x2a4a6a, 1); g.fillRect(x0 + 10, by0 + ph * 0.6, w - 20, ph * 0.4 - 8);
  g.fillStyle(0xf6f0d0, 1); g.fillCircle(x0 + w * 0.7, by0 + 26, 12);
  for (let k = 0; k < 6; k++) { const hx = x0 + 18 + k * ((w - 40) / 5); g.fillStyle([0xa06a5a, 0xb08a4a, 0x7a8a8a][k % 3], 1); g.fillRect(hx, by0 + ph * 0.3 + (k % 2) * 8, 24, ph * 0.3); g.fillStyle(CANDLE, 0.8); g.fillRect(hx + 6, by0 + ph * 0.4, 4, 5); g.fillRect(hx + 14, by0 + ph * 0.4, 4, 5); }
  for (let k = 0; k < 8; k++) { g.lineStyle(1, 0xf6f0d0, 0.4); g.lineBetween(x0 + w * 0.6 + k * 4, by0 + ph * 0.65 + k * 5, x0 + w * 0.68 + k * 2, by0 + ph * 0.65 + k * 5); }
  // Proscenium: gilt posts, a red pelmet with tassels.
  for (const px of [x0, x0 + w - 12]) {
    g.fillStyle(GILT_DARK, 1); g.fillRect(px, by0 - 20, 12, ph + 12);
    g.fillStyle(GILT, 1); g.fillRect(px + 2, by0 - 20, 7, ph + 12);
  }
  g.fillStyle(VELVET_DARK, 1); g.fillRect(x0 - 4, by0 - 34, w + 8, 30);
  g.fillStyle(VELVET, 1); g.fillRect(x0 - 4, by0 - 34, w + 8, 24);
  for (let k = 0; k < 9; k++) { const tx = x0 + 6 + k * ((w - 12) / 8); g.fillStyle(VELVET, 1); g.fillEllipse(tx, by0 - 10, (w - 12) / 8, 12); g.fillStyle(GILT, 1); g.fillRect(tx - 1, by0 - 6, 2, 8); g.fillCircle(tx, by0 + 3, 2.4); }
  // Curtains half-drawn.
  for (const k of [-1, 1]) {
    const cx = k < 0 ? x0 + 12 : x0 + w - 12;
    const cw = w * 0.22;
    const xs = k < 0 ? cx : cx - cw;
    g.fillStyle(VELVET_DARK, 1); g.fillRect(xs, by0 - 4, cw, ph - 4);
    for (let f = 0; f < 5; f++) { g.fillStyle(f % 2 ? VELVET : VELVET_LIT, 0.8); g.fillRect(xs + f * (cw / 5), by0 - 4, cw / 10, ph - 6); }
    g.fillStyle(GILT, 1); g.fillCircle(k < 0 ? cx + cw : cx - cw, by0 + ph * 0.55, 3);
  }
  // Masks of the stock characters on the proscenium.
  mask(g, x0 + 6, by0 + 18, 0.42, 'harlequin');
  mask(g, x0 + w - 6, by0 + 18, 0.42, 'colombina', PORCELAIN, GILT);
  mask(g, x, by0 - 22, 0.5, 'comedy', PORCELAIN, GILT);
  // Footlights.
  for (let k = 0; k < 7; k++) {
    const fx = x0 + 20 + k * ((w - 40) / 6);
    g.fillStyle(0x8a8a8a, 1); g.fillTriangle(fx - 6, stageY - 8, fx + 6, stageY - 8, fx, stageY - 16);
    g.fillStyle(CANDLE, 1); g.fillCircle(fx, stageY - 14, 2);
  }
  // The board.
  g.fillStyle(OAK_LIT, 1); g.fillRect(x + w / 2 + 14, y - 36, 44, 30);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x + w / 2 + 34, y - 6, 4, 8);
  for (let k = 0; k < 3; k++) { g.lineStyle(1.5, VELVET_DARK, 1); g.lineBetween(x + w / 2 + 18, y - 30 + k * 8, x + w / 2 + 18 + 30 + (rng() * 6), y - 30 + k * 8); }
}

/**
 * The Squero, x,y = base centre: the gondola yard on the canal. A timber boat-shed with a deep
 * overhanging roof and geraniums on the balcony (the builders come from the mountains and build
 * like it), a black hull up on trestles under the eaves with its ferro still unpolished, stacked
 * oak planks, a rack of oars and forcole, and a tarred slipway running down to the water.
 */
export function squero(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 4, w * 1.08, 24, 0.4);
  // The shed: plank walls, a broad open front.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x0, top + 40, w, h - 40);
  for (let px = x0; px < x0 + w; px += 12) { g.fillStyle(rng() < 0.5 ? OAK : mixC(OAK, OAK_LIT, 0.4), 1); g.fillRect(px + 1, top + 40, 10, h - 40); }
  g.fillStyle(0x140e0a, 1); g.fillRect(x0 + 24, y - 110, w - 48, 110);
  g.fillStyle(CANDLE, 0.12); g.fillRect(x0 + 24, y - 110, w - 48, 110);
  // A hull on trestles inside, half-built: ribs showing at one end.
  g.fillStyle(OAK_LIT, 1); g.fillRect(x - 90, y - 30, 6, 26); g.fillRect(x + 84, y - 30, 6, 26);
  g.fillStyle(LACQUER, 1); g.fillEllipse(x + 10, y - 40, 200, 26);
  g.fillTriangle(x + 100, y - 46, x + 100, y - 34, x + 116, y - 64);
  g.fillStyle(LACQUER_LIT, 1); g.fillEllipse(x + 10, y - 46, 180, 6);
  for (let k = 0; k < 6; k++) { g.lineStyle(2, OAK_LIT, 1); g.beginPath(); g.arc(x - 70 + k * 12, y - 40, 12, Math.PI, 0, false); g.strokePath(); }
  g.fillStyle(MIRROR_DARK, 1); g.fillRect(x + 112, y - 76, 4, 14);
  // Oars and forcole on a rack by the door.
  for (let k = 0; k < 5; k++) { g.lineStyle(2.5, OAK_LIT, 1); g.lineBetween(x0 + 10 + k * 3, y - 4, x0 + 14 + k * 3, y - 120); }
  for (let k = 0; k < 3; k++) {
    const fx = x0 + w - 18, fy = y - 30 - k * 26;
    g.fillStyle(OAK_LIT, 1); g.fillRect(fx - 3, fy - 16, 6, 16); g.fillTriangle(fx - 3, fy - 16, fx + 8, fy - 22, fx + 3, fy - 10);
  }
  // Stacked planks out front.
  for (let k = 0; k < 4; k++) { g.fillStyle(k % 2 ? OAK : OAK_LIT, 1); g.fillRect(x0 - 30, y - 8 - k * 6, 70, 5); }
  // The balcony with geraniums, the deep eaves.
  g.fillStyle(OAK, 1); g.fillRect(x0 + 10, top + 52, w - 20, 8);
  for (let bx = x0 + 14; bx < x0 + w - 10; bx += 8) { g.fillStyle(OAK_DARK, 1); g.fillRect(bx, top + 60, 3, 16); }
  g.fillStyle(OAK, 1); g.fillRect(x0 + 10, top + 76, w - 20, 4);
  for (let k = 0; k < 9; k++) { g.fillStyle(0x3a7a3a, 1); g.fillEllipse(x0 + 24 + k * ((w - 48) / 8), top + 50, 12, 7); g.fillStyle(VELVET_LIT, 1); g.fillCircle(x0 + 24 + k * ((w - 48) / 8), top + 46, 3); }
  g.fillStyle(ROOF_DARK, 1); g.fillTriangle(x0 - 30, top + 44, x0 + w + 30, top + 44, x, top - 30);
  g.fillStyle(ROOF, 1); g.fillTriangle(x0 - 20, top + 38, x0 + w + 20, top + 38, x, top - 24);
  for (let k = 1; k < 8; k++) { g.lineStyle(1, ROOF_LIT, 0.5); g.lineBetween(x0 - 20 + k * ((w + 40) / 8), top + 38, x, top - 24); }
  // The board over the door: a gondola painted in gilt.
  g.fillStyle(OAK_LIT, 1); g.fillRect(x - 40, y - 132, 80, 18);
  g.fillStyle(GILT, 1); g.fillEllipse(x, y - 123, 54, 6); g.fillTriangle(x + 24, y - 125, x + 24, y - 121, x + 32, y - 131);
  // The slipway: tarred planks down to the water in front.
  g.fillStyle(0x2a2018, 1); g.fillRect(x - 70, y, 140, 64);
  for (let k = 0; k < 6; k++) { g.lineStyle(1, OAK, 0.8); g.lineBetween(x - 70 + k * 28, y, x - 70 + k * 28, y + 64); }
  for (let k = 0; k < 4; k++) { g.lineStyle(2, OAK_DARK, 1); g.lineBetween(x - 70, y + 12 + k * 15, x + 70, y + 12 + k * 15); }
}

/**
 * The Palazzo Facciata, Prince Facade's house, x,y = base centre. Its whole front is a face:
 * the piano nobile's two great oval windows are eyes behind gilt lashes and lids, the water-portal
 * is a mouth between gilded lips, a brow of crenellations arches over it, and a plume of carved
 * feathers fans out from the roof like a colombina's. Porcelain stucco, midnight velvet hangings.
 */
export function facciata(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 6, w * 1.1, 32, 0.45);
  // The plume behind the roof.
  for (let i = 0; i < 11; i++) {
    const a = Math.PI + 0.25 + (i / 10) * (Math.PI - 0.5);
    const fx = x + Math.cos(a) * w * 0.42, fy = top + 10 + Math.sin(a) * h * 0.38;
    g.lineStyle(3, GILT_DARK, 1); g.lineBetween(x, top + 20, fx, fy);
    g.fillStyle(i % 2 ? FACADE : FACADE_LIT, 1); g.fillEllipse(fx, fy, 22, 52);
    g.fillStyle(GILT, 0.8); g.fillEllipse(fx, fy - 14, 8, 10);
    g.lineStyle(1, FACADE_DARK, 0.8); g.lineBetween(fx, fy - 24, fx, fy + 24);
  }
  // The face: porcelain stucco, fine crazing.
  g.fillStyle(PORCELAIN_DARK, 1); g.fillRect(x0, top, w, h);
  g.fillStyle(PORCELAIN, 1); g.fillRect(x0 + 3, top, w - 6, h - 3);
  for (let i = 0; i < 26; i++) {
    const cx = x0 + 20 + rng() * (w - 40), cy = top + 20 + rng() * (h - 60);
    g.lineStyle(0.8, PORCELAIN_DARK, 0.5); g.lineBetween(cx, cy, cx + (rng() - 0.5) * 30, cy + (rng() - 0.5) * 20);
  }
  // Cheek blush and a beauty spot.
  g.fillStyle(0xf0a8b8, 0.25); g.fillEllipse(x0 + w * 0.2, top + h * 0.6, 80, 40); g.fillEllipse(x0 + w * 0.8, top + h * 0.6, 80, 40);
  g.fillStyle(FACADE_DARK, 1); g.fillCircle(x0 + w * 0.76, top + h * 0.66, 5);
  // The brow: a crenellated arch over each eye.
  for (const k of [-1, 1]) {
    const ex = x + k * w * 0.23, ey = top + h * 0.38;
    g.lineStyle(10, ISTRIA_DARK, 1); g.beginPath(); g.arc(ex, ey + 8, 70, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
    g.lineStyle(7, GILT, 1); g.beginPath(); g.arc(ex, ey + 6, 70, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
    for (let m = 0; m < 7; m++) {
      const a = Math.PI * 1.15 + (m / 6) * Math.PI * 0.7;
      g.fillStyle(GILT_LIT, 1); g.fillTriangle(ex + Math.cos(a) * 72 - 3, ey + 6 + Math.sin(a) * 72, ex + Math.cos(a) * 72 + 3, ey + 6 + Math.sin(a) * 72, ex + Math.cos(a) * 84, ey + 6 + Math.sin(a) * 84);
    }
    // The eye: a lit oval window behind gilt lids and lashes, its iris a rose of glazing.
    g.fillStyle(GILT_DARK, 1); g.fillEllipse(ex, ey + 30, 120, 62);
    g.fillStyle(0x24163f, 1); g.fillEllipse(ex, ey + 30, 112, 54);
    g.fillStyle(AMBER, 0.55); g.fillEllipse(ex, ey + 30, 104, 48);
    g.fillStyle(FACADE, 1); g.fillCircle(ex + k * 4, ey + 30, 22);
    g.fillStyle(CANDLE, 0.9); g.fillCircle(ex + k * 4, ey + 30, 14);
    for (let s = 0; s < 8; s++) { const a = (s / 8) * Math.PI * 2; g.lineStyle(1.5, GILT_DARK, 1); g.lineBetween(ex + k * 4, ey + 30, ex + k * 4 + Math.cos(a) * 22, ey + 30 + Math.sin(a) * 22); }
    g.fillStyle(0x0a0810, 1); g.fillCircle(ex + k * 4, ey + 30, 6);
    g.fillStyle(PORCELAIN, 1); g.fillEllipse(ex, ey + 6, 118, 18);
    g.fillStyle(GILT, 1); g.fillEllipse(ex, ey + 12, 114, 6);
    for (let l = 0; l < 9; l++) { const lx = ex - 48 + l * 12; g.lineStyle(2, GILT_DARK, 1); g.lineBetween(lx, ey + 13, lx + k * 2, ey + 1); }
    // A balcony under each eye, hung with violet velvet.
    g.fillStyle(ISTRIA, 1); g.fillRect(ex - 54, ey + 62, 108, 8);
    for (let b = ex - 50; b < ex + 50; b += 8) { g.fillStyle(ISTRIA_DARK, 1); g.fillRect(b, ey + 70, 3, 12); }
    g.fillStyle(ISTRIA, 1); g.fillRect(ex - 54, ey + 80, 108, 4);
    g.fillStyle(FACADE, 1); g.fillRect(ex - 18, ey + 84, 36, 34); g.fillTriangle(ex - 18, ey + 118, ex + 18, ey + 118, ex, ey + 128);
    g.fillStyle(GILT, 1); g.fillCircle(ex, ey + 100, 6);
    mask(g, ex, ey + 100, 0.18, k < 0 ? 'comedy' : 'tragedy', GILT_LIT, GILT_DARK);
  }
  // The nose: a pilaster down the middle.
  g.fillStyle(PORCELAIN_DARK, 1); g.fillRect(x - 10, top + h * 0.36, 20, h * 0.26);
  g.fillStyle(lit(PORCELAIN, 0.3), 1); g.fillRect(x - 8, top + h * 0.36, 7, h * 0.26);
  // The mouth: the water-portal between gilt lips, a red-lacquered door.
  const my = y - 40;
  g.fillStyle(GILT_DARK, 1); g.fillEllipse(x, my, 170, 70);
  g.fillStyle(GILT, 1); g.fillEllipse(x, my - 2, 160, 62);
  g.fillStyle(GILT_LIT, 0.8); g.fillEllipse(x - 20, my - 20, 60, 10);
  g.fillStyle(0x0a0408, 1); g.fillEllipse(x, my, 128, 38);
  g.fillStyle(VELVET, 1); g.fillRect(x - 30, my - 16, 60, 40);
  g.lineStyle(1.5, VELVET_DARK, 1); g.lineBetween(x, my - 16, x, my + 24);
  g.fillStyle(GILT, 1); g.fillCircle(x - 7, my + 2, 2.4); g.fillCircle(x + 7, my + 2, 2.4);
  // Crown cornice: a gilt band with stave lines.
  g.fillStyle(GILT_DARK, 1); g.fillRect(x0 - 8, top - 12, w + 16, 16);
  g.fillStyle(GILT, 1); g.fillRect(x0 - 8, top - 12, w + 16, 11);
  for (let k = 0; k < 5; k++) { g.lineStyle(0.8, GILT_DARK, 0.9); g.lineBetween(x0 - 4, top - 10 + k * 2, x0 + w + 4, top - 10 + k * 2); }
  // Steps.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? ISTRIA : ISTRIA_LIT, 1); g.fillRect(x - 100 - k * 8, y - 8 + k * 3, 200 + k * 16, 5); }
}

/** A gondola, x,y = waterline centre, `dir` 1 = prow to the right. Black lacquer, a silver ferro, a velvet seat. */
export function gondola(g: G, x: number, y: number, s: number, dir: number, gondolier = true, t = 0): void {
  const L = 110 * s;
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 6 * s, L * 1.05, 12 * s);
  // Hull: a long crescent, the stern lifting.
  g.fillStyle(LACQUER, 1);
  g.fillEllipse(x, y, L, 16 * s);
  g.fillTriangle(x + dir * L * 0.4, y - 4 * s, x + dir * L * 0.4, y + 4 * s, x + dir * L * 0.56, y - 14 * s);
  g.fillTriangle(x - dir * L * 0.4, y - 4 * s, x - dir * L * 0.4, y + 4 * s, x - dir * L * 0.54, y - 10 * s);
  g.fillStyle(LACQUER_LIT, 1); g.fillEllipse(x, y - 3 * s, L * 0.9, 4 * s);
  // The ferro: a silver comb on the prow.
  const fx = x + dir * L * 0.53, fy = y - 14 * s;
  g.fillStyle(MIRROR, 1); g.fillRect(fx - 2 * s, fy - 8 * s, 4 * s, 12 * s);
  for (let k = 0; k < 6; k++) g.fillRect(fx - dir * (2 + k * 2.4) * s, fy - 2 * s + k * 1.2 * s, -dir * 5 * s, 1.4 * s);
  g.fillStyle(MIRROR_LIT, 1); g.fillTriangle(fx - 3 * s, fy - 8 * s, fx + 3 * s, fy - 8 * s, fx + dir * 5 * s, fy - 14 * s);
  // The seat: red velvet, gilt seahorses either side.
  g.fillStyle(VELVET_DARK, 1); g.fillRoundedRect(x - 10 * s, y - 9 * s, 20 * s, 8 * s, 3 * s);
  g.fillStyle(VELVET, 1); g.fillRoundedRect(x - 9 * s, y - 10 * s, 18 * s, 6 * s, 3 * s);
  for (const k of [-1, 1]) { g.fillStyle(GILT, 1); g.fillCircle(x + k * 12 * s, y - 8 * s, 2.4 * s); g.fillTriangle(x + k * 12 * s, y - 10 * s, x + k * 14 * s, y - 10 * s, x + k * 13 * s, y - 16 * s); }
  if (!gondolier) return;
  // The gondolier at the stern: striped shirt, straw boater with a ribbon, the long oar.
  const gx = x - dir * L * 0.32, gy = y - 6 * s;
  const sweep = Math.sin(t * 1.6) * 6 * s;
  g.lineStyle(2 * s, OAK_LIT, 1); g.lineBetween(gx + dir * 4 * s, gy - 18 * s, gx + dir * (12 * s + sweep), gy + 10 * s);
  g.fillStyle(SILK_WHITE, 1); g.fillRect(gx - 4 * s, gy - 22 * s, 8 * s, 14 * s);
  g.fillStyle(LACQUER, 1); for (let k = 0; k < 3; k++) g.fillRect(gx - 4 * s, gy - 20 * s + k * 4.5 * s, 8 * s, 1.6 * s);
  g.fillStyle(LACQUER, 1); g.fillRect(gx - 3 * s, gy - 8 * s, 6 * s, 6 * s);
  g.fillStyle(0xd8b090, 1); g.fillCircle(gx, gy - 26 * s, 4 * s);
  mask(g, gx, gy - 26 * s, 0.16 * s, 'bauta');
  g.fillStyle(0xe8d08a, 1); g.fillEllipse(gx, gy - 30 * s, 13 * s, 3.5 * s); g.fillRect(gx - 3.5 * s, gy - 34 * s, 7 * s, 4 * s);
  g.fillStyle(VELVET, 1); g.fillRect(gx - 3.5 * s, gy - 31 * s, 7 * s, 1.4 * s);
}

/** A mooring pole (palina) striped in a house's colours, a gilt knob on top. */
export function palina(g: G, x: number, y: number, a: number, b: number): void {
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 4, y + 2, 14, 5);
  for (let k = 0; k < 8; k++) { g.fillStyle(k % 2 ? a : b, 1); g.fillRect(x - 3, y - 70 + k * 9, 6, 9); }
  g.fillStyle(0xffffff, 0.3); g.fillRect(x - 3, y - 70, 1.5, 72);
  g.fillStyle(GILT, 1); g.fillCircle(x, y - 72, 4);
  g.fillStyle(CANAL_LIT, 0.6); g.fillEllipse(x, y + 1, 12, 3);
}

/** A three-armed Venetian lamp-post: cast-iron shaft, scrolled bracket, lanterns with a warm core. */
export function lampPost(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 22, 7, 0.3);
  g.fillStyle(IRON, 1); g.fillRect(x - 4, y - 6, 8, 6); g.fillRect(x - 2, y - 74, 4, 70);
  g.fillStyle(LACQUER_LIT, 1); g.fillRect(x - 1, y - 74, 1, 70);
  for (const k of [-1, 0, 1]) {
    const lx = x + k * 13, ly = y - 82 - (k === 0 ? 8 : 0);
    if (k) { g.lineStyle(2, IRON, 1); g.lineBetween(x, y - 70, lx, ly); g.lineBetween(x, y - 64, x + k * 8, y - 72); }
    g.fillStyle(IRON, 1); g.fillTriangle(lx - 6, ly - 10, lx + 6, ly - 10, lx, ly - 16);
    g.fillStyle(CANDLE, 0.9); g.fillRect(lx - 4, ly - 10, 8, 10);
    g.fillStyle(0xffffff, 0.7); g.fillRect(lx - 1, ly - 7, 2, 4);
    g.fillStyle(IRON, 1); g.fillRect(lx - 5, ly, 10, 2);
  }
}

/** A wellhead (vera da pozzo): a carved stone drum with a masked face on each side and an iron lid. */
export function wellhead(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 64, 16, 0.35);
  g.fillStyle(ISTRIA_DARK, 1); g.fillRect(x - 26, y - 36, 52, 36);
  g.fillStyle(ISTRIA, 1); g.fillRect(x - 24, y - 36, 48, 34);
  g.fillStyle(ISTRIA_LIT, 1); g.fillEllipse(x, y - 36, 52, 14);
  g.fillStyle(IRON, 1); g.fillEllipse(x, y - 37, 40, 10);
  g.lineStyle(1.5, LACQUER_LIT, 1); g.lineBetween(x - 18, y - 37, x + 18, y - 37); g.strokeEllipse(x, y - 37, 40, 10);
  mask(g, x - 11, y - 20, 0.3, 'tragedy', ISTRIA_LIT, ISTRIA_DARK);
  mask(g, x + 11, y - 20, 0.3, 'comedy', ISTRIA_LIT, ISTRIA_DARK);
  g.fillStyle(ISTRIA_DARK, 1); g.fillRect(x - 28, y - 4, 56, 4);
}

/**
 * The Masquerade waystone: a column of Istrian stone with a stave carved spiralling up it, a gilt
 * volto mask on the capital whose eyes glow when you are attuned, and ribbons tied round its foot.
 */
export function masqueWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 44, 12, 0.35);
  g.fillStyle(ISTRIA_DARK, 1); g.fillRect(x - 16, y - 12, 32, 12);
  g.fillStyle(ISTRIA, 1); g.fillRect(x - 11, y - 82, 22, 72);
  g.fillStyle(ISTRIA_LIT, 0.8); g.fillRect(x - 11, y - 82, 5, 72);
  for (let k = 0; k < 6; k++) {
    const yy = y - 18 - k * 11;
    g.lineStyle(1, GILT_DARK, 0.9); g.lineBetween(x - 11, yy, x + 11, yy - 6);
    noteGlyph(g, x - 4 + (k % 2) * 7, yy - 1, 0.5, GILT_DARK);
  }
  g.fillStyle(ISTRIA, 1); g.fillRect(x - 16, y - 90, 32, 8);
  mask(g, x, y - 104, 0.62, 'volto', GILT, GILT_DARK);
  for (let k = 0; k < 3; k++) { g.lineStyle(2, SEQUINS[k], 0.9); g.lineBetween(x - 11, y - 14 + k * 3, x + 11, y - 12 + k * 3); }
  g.fillStyle(SEQUINS[0], 1); g.fillTriangle(x + 11, y - 14, x + 20, y - 4, x + 14, y - 2);
}

/** A mirror on a stand, seen from the front (props round the Hall). */
export function chevalMirror(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 2, 40 * s, 10 * s, 0.3);
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - 14 * s, y - 4 * s, 28 * s, 4 * s); g.fillRect(x - 2 * s, y - 14 * s, 4 * s, 10 * s);
  g.fillStyle(GILT, 1); g.fillEllipse(x, y - 40 * s, 30 * s, 52 * s);
  g.fillStyle(MIRROR_DARK, 1); g.fillEllipse(x, y - 40 * s, 24 * s, 46 * s);
  g.fillStyle(MIRROR, 0.8); g.fillEllipse(x - 2 * s, y - 42 * s, 18 * s, 38 * s);
  g.fillStyle(MIRROR_LIT, 0.8); g.fillTriangle(x - 8 * s, y - 24 * s, x - 4 * s, y - 24 * s, x + 6 * s, y - 58 * s);
}

/** A stack of fireworks crates and a rocket stand on the quay. */
export function rocketStand(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 48, 12, 0.3);
  g.fillStyle(OAK, 1); g.fillRect(x - 20, y - 18, 24, 18); g.fillRect(x - 14, y - 32, 20, 14);
  g.lineStyle(1, OAK_DARK, 1); g.strokeRect(x - 20, y - 18, 24, 18); g.strokeRect(x - 14, y - 32, 20, 14);
  g.fillStyle(0xc0302a, 1); g.fillRect(x - 18, y - 12, 20, 4);
  g.fillStyle(IRON, 1); g.fillRect(x + 10, y - 40, 3, 40);
  for (let k = 0; k < 4; k++) {
    g.lineStyle(1, 0xcab08a, 1); g.lineBetween(x + 14 + k * 3, y - 2, x + 15 + k * 3, y - 44);
    g.fillStyle(FIREWORKS_C[k], 1); g.fillRect(x + 13 + k * 3, y - 56, 3, 12);
  }
}
const FIREWORKS_C = [0xc0302a, 0x2a70c0, 0x30a050, GILT];

/** The velvet theatre curtain (gate look is the engine's; this is the court's own prop). */
export function velvetSwag(g: G, x: number, y: number, w: number): void {
  g.fillStyle(VELVET_DARK, 1); g.fillRect(x - w / 2, y - 12, w, 12);
  for (let k = 0; k < 6; k++) { const sx = x - w / 2 + (k + 0.5) * (w / 6); g.fillStyle(VELVET, 1); g.fillEllipse(sx, y - 4, w / 6, 12); g.fillStyle(GILT, 1); g.fillCircle(sx, y + 3, 1.8); }
}
