import type Phaser from 'phaser';
import { type G, dim, lit, mixC, shadow } from '../../../../art/IsleArt';

/**
 * The Sepulchre's shared drawing kit — the Regent's hold dug downward into Bedrock Hold.
 *
 * Everything down here is cut stone in layers: the strata the hold is carved through, the
 * ashlar blocks of the Stone Tithe, the sealed cells of the interred with a face at every slit,
 * the sarcophagi of the old capital's dead and the Regent's seal — a crown going under three
 * bands of earth — chiselled into anything he owns.
 */

// ── Palette ──────────────────────────────────────────────────────────

export const STONE = 0x8a7f6c;
export const STONE_DARK = 0x463e33;
export const STONE_LIT = 0xbcb098;
export const STONE_DEEP = 0x231e18;
export const MORTAR = 0xd2c8b0;
export const DUST = 0xc8b494;
export const DUST_DEEP = 0x8a7656;
export const BRASS = 0xc8a050;
export const BRASS_DARK = 0x7a5a26;
export const TITHE_RED = 0xa8402a;
export const BONE = 0xe2d8bc;
export const CANDLE = 0xffc870;
export const SOOT = 0x15110d;
export const IRON = 0x3a3836;
export const CHAIN = 0x6a6660;
export const SKINS = [0xd8b898, 0xb08a68, 0xc8a080, 0x9a7458, 0xe0c4a8, 0x7a5a40];
/** The strata the hold is cut through, top (shallow) to bottom (deep). */
export const STRATA = [0xb89a72, 0x9a7a5a, 0xc4aa82, 0x7a6450, 0xa48868, 0x5a4a3c, 0x8a6e52, 0x463a30];

type V2 = Phaser.Types.Math.Vector2Like;

// ── Strata ───────────────────────────────────────────────────────────

/**
 * A rock face cut through layered strata: wavy bands of sandstone, shale and ironstone, each
 * with its own grain (pebbles, laminae, fossils), lit along the top lip of every band.
 */
export function strataFace(g: G, x: number, y: number, w: number, h: number, rng: () => number, depth = 0): void {
  g.fillStyle(STONE_DEEP, 1); g.fillRect(x, y, w, h);
  let yy = y;
  let band = depth;
  while (yy < y + h) {
    const bh = 12 + rng() * 22;
    const c = dim(STRATA[band % STRATA.length], 0.1 + Math.min(0.5, depth * 0.06));
    g.fillStyle(c, 1);
    const pts: V2[] = [];
    const wav = rng() * 6, ph = rng() * 6;
    for (let k = 0; k <= 16; k++) pts.push({ x: x + (w * k) / 16, y: yy + Math.sin(ph + k * 0.7) * wav * 0.6 });
    for (let k = 16; k >= 0; k--) pts.push({ x: x + (w * k) / 16, y: Math.min(y + h, yy + bh + Math.sin(ph + 1 + k * 0.6) * wav * 0.6) });
    g.fillPoints(pts, true, true);
    // The lit lip and the shadow under it.
    g.lineStyle(1.5, lit(c, 0.18), 0.7);
    g.beginPath(); pts.slice(0, 17).forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.strokePath();
    // Grain: laminae lines, pebbles or the odd ammonite.
    const kind = band % 3;
    for (let i = 0; i < w / 26; i++) {
      const gx = x + rng() * w, gy = yy + 3 + rng() * Math.max(2, bh - 6);
      if (gy > y + h - 2) continue;
      if (kind === 0) { g.lineStyle(1, dim(c, 0.25), 0.6); g.lineBetween(gx, gy, gx + 8 + rng() * 18, gy + (rng() - 0.5) * 2); }
      else if (kind === 1) { g.fillStyle(rng() < 0.5 ? lit(c, 0.2) : dim(c, 0.3), 0.8); g.fillEllipse(gx, gy, 3 + rng() * 4, 2 + rng() * 2); }
      else if (rng() < 0.15) {
        g.lineStyle(1, lit(c, 0.25), 0.7);
        g.beginPath();
        for (let s = 0; s < 14; s++) { const a = s * 0.6, r = 0.4 * s; const px = gx + Math.cos(a) * r, py = gy + Math.sin(a) * r; if (s) g.lineTo(px, py); else g.moveTo(px, py); }
        g.strokePath();
      }
    }
    yy += bh;
    band++;
  }
}

// ── Cut stone ────────────────────────────────────────────────────────

/** Flags of grave-slab paving: big worn rectangles, mortar between, some with a carved line. */
export function slabFloor(g: G, x: number, y: number, w: number, h: number, base: number, rng: () => number): void {
  g.fillStyle(dim(base, 0.45), 1); g.fillRect(x, y, w, h);
  const rowH = 46;
  for (let yy = y, row = 0; yy < y + h; yy += rowH, row++) {
    let xx = x - (row % 2) * 40;
    while (xx < x + w) {
      const sw = 70 + rng() * 60;
      const c = mixC(base, rng() < 0.5 ? STONE_LIT : STONE_DARK, rng() * 0.3);
      const x0 = Math.max(x, xx + 2), x1 = Math.min(x + w, xx + sw - 2);
      const hh = Math.min(rowH - 4, y + h - yy - 2);
      if (x1 > x0 && hh > 0) {
        g.fillStyle(c, 1); g.fillRect(x0, yy + 2, x1 - x0, hh);
        g.fillStyle(lit(c, 0.12), 0.6); g.fillRect(x0, yy + 2, x1 - x0, 2);
        g.fillStyle(dim(c, 0.2), 0.6); g.fillRect(x0, yy + hh, x1 - x0, 2);
        if (rng() < 0.12 && x1 - x0 > 50) {
          // A worn inscription: three short carved lines, the letters long since walked off.
          g.lineStyle(1, dim(c, 0.35), 0.7);
          for (let k = 0; k < 3; k++) g.lineBetween(x0 + 10, yy + 12 + k * 8, x0 + 10 + (x1 - x0 - 24) * (0.5 + rng() * 0.5), yy + 12 + k * 8);
        }
        if (rng() < 0.1) { g.lineStyle(1, STONE_DEEP, 0.7); g.lineBetween(x0 + rng() * (x1 - x0), yy + 2, x0 + rng() * (x1 - x0), yy + hh); }
      }
      xx += sw;
    }
  }
}

/** Drifted dust over a floor: soft lumps, the edge of each drift lit, footprints scuffed through. */
export function dustDrift(g: G, x: number, y: number, w: number, h: number, rng: () => number, a = 0.7): void {
  for (let i = 0; i < (w * h) / 900; i++) {
    const dx = x + rng() * w, dy = y + rng() * h;
    const rx = 14 + rng() * 40, ry = 5 + rng() * 12;
    g.fillStyle(DUST_DEEP, a * 0.35); g.fillEllipse(dx, dy + 2, rx, ry);
    g.fillStyle(DUST, a * 0.5); g.fillEllipse(dx, dy, rx * 0.9, ry * 0.8);
    g.fillStyle(lit(DUST, 0.25), a * 0.35); g.fillEllipse(dx - rx * 0.15, dy - ry * 0.2, rx * 0.5, ry * 0.35);
  }
}

/**
 * An ashlar tithe-block seen from a little above: a squared stone with a lit top face, a dark
 * side, tool marks, and the red tithe-tally painted on it (strokes in fives).
 */
export function ashlar(g: G, x: number, y: number, s: number, tally = 3, a = 1): void {
  const w = 34 * s, h = 22 * s, d = 12 * s;
  shadow(g, x, y + 2, w * 1.2, 10 * s, 0.3 * a);
  g.fillStyle(STONE_DARK, a); g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle(STONE, a); g.fillRect(x - w / 2, y - h, w, h - 2);
  g.fillStyle(STONE_LIT, a);
  g.fillPoints([{ x: x - w / 2, y: y - h }, { x: x + w / 2, y: y - h }, { x: x + w / 2 - 4 * s, y: y - h - d }, { x: x - w / 2 + 4 * s, y: y - h - d }] as V2[], true, true);
  // Tool marks: the claw chisel's parallel scratches.
  g.lineStyle(1, dim(STONE, 0.25), 0.6 * a);
  for (let k = 0; k < 5; k++) g.lineBetween(x - w / 2 + 4 + k * w / 6, y - h + 3, x - w / 2 + 8 + k * w / 6, y - 4);
  // The tithe-tally in red ochre.
  g.lineStyle(1.6 * s, TITHE_RED, 0.85 * a);
  for (let k = 0; k < Math.min(4, tally); k++) g.lineBetween(x - 9 * s + k * 4 * s, y - h + 5 * s, x - 9 * s + k * 4 * s, y - 5 * s);
  if (tally >= 5) g.lineBetween(x - 11 * s, y - 7 * s, x + 6 * s, y - h + 7 * s);
}

/** A tumble of broken stone: a heap of angular chunks with dust caught between them. */
export function rubbleHeap(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 2, 60 * s, 16 * s, 0.35);
  g.fillStyle(DUST_DEEP, 0.8); g.fillEllipse(x, y - 2, 64 * s, 16 * s);
  for (let i = 0; i < 9; i++) {
    const cx = x + (rng() - 0.5) * 50 * s, cy = y - 4 - rng() * 18 * s * (1 - Math.abs(cx - x) / (40 * s));
    const r = (5 + rng() * 8) * s;
    const c = mixC(STONE, STONE_DARK, rng() * 0.6);
    const pts: V2[] = [];
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + rng(); pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.75 }); }
    g.fillStyle(c, 1); g.fillPoints(pts, true, true);
    g.fillStyle(lit(c, 0.2), 0.8); g.fillTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, cx, cy);
  }
  g.fillStyle(DUST, 0.4); g.fillEllipse(x, y - 1, 40 * s, 6 * s);
}

// ── The Regent ───────────────────────────────────────────────────────

/** The Regent's seal: a crown sinking under three bands of earth, inside a ring of cut blocks. */
export function gravaneSeal(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  g.lineStyle(Math.max(1.5, r * 0.07), color, a); g.strokeCircle(x, y, r);
  for (let k = 0; k < 12; k++) {
    const an = (k / 12) * Math.PI * 2;
    g.fillStyle(color, a * 0.8); g.fillRect(x + Math.cos(an) * r * 0.86 - r * 0.06, y + Math.sin(an) * r * 0.86 - r * 0.06, r * 0.12, r * 0.12);
  }
  // The crown, only its points above the earth.
  g.fillStyle(color, a);
  g.fillPoints([
    { x: x - r * 0.45, y: y - r * 0.05 }, { x: x - r * 0.45, y: y - r * 0.4 }, { x: x - r * 0.25, y: y - r * 0.2 },
    { x: x, y: y - r * 0.5 }, { x: x + r * 0.25, y: y - r * 0.2 }, { x: x + r * 0.45, y: y - r * 0.4 }, { x: x + r * 0.45, y: y - r * 0.05 },
  ] as V2[], true, true);
  // Three bands of earth over it.
  for (let k = 0; k < 3; k++) {
    const yy = y + r * (0.02 + k * 0.17);
    const hw = r * (0.62 - k * 0.08);
    g.fillRect(x - hw, yy, hw * 2, r * 0.1);
  }
}

// ── The interred ─────────────────────────────────────────────────────

/**
 * A face at a cell slit: just the eyes and the bridge of a nose in the dark, lit by whatever
 * light comes down the gallery. `t` (seconds) blinks them and shifts the gaze.
 */
export function slitFace(g: G, x: number, y: number, s: number, skin: number, t: number, seed: number, a = 1): void {
  g.fillStyle(SOOT, a); g.fillRect(x - 15 * s, y - 4 * s, 30 * s, 9 * s);
  g.fillStyle(dim(skin, 0.35), a); g.fillRect(x - 13 * s, y - 3 * s, 26 * s, 7 * s);
  g.fillStyle(dim(skin, 0.1), a); g.fillRect(x - 2 * s, y - 3 * s, 4 * s, 7 * s);
  const blink = ((t * 0.31 + seed * 0.17) % 1) < 0.05;
  const look = Math.sin(t * 0.7 + seed) * 2 * s;
  if (!blink) {
    g.fillStyle(0xe8e0d0, a); g.fillEllipse(x - 6 * s, y, 6 * s, 3.4 * s); g.fillEllipse(x + 6 * s, y, 6 * s, 3.4 * s);
    g.fillStyle(0x1a1410, a); g.fillCircle(x - 6 * s + look, y, 1.5 * s); g.fillCircle(x + 6 * s + look, y, 1.5 * s);
  } else {
    g.lineStyle(1, dim(skin, 0.5), a); g.lineBetween(x - 9 * s, y, x - 3 * s, y); g.lineBetween(x + 3 * s, y, x + 9 * s, y);
  }
}

/**
 * The front of a sealed cell in a gallery wall: a frame of dressed stone, the infill of rough
 * blocks mortared shut (the mortar still pale where it is new), a debt plate in brass, and the
 * slit at eye height. `face` < 0 draws an empty slit (the cell is vacant, or quiet).
 */
export function cellFront(g: G, x: number, y: number, w: number, h: number, rng: () => number, face: number, fresh: boolean): void {
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0, top, w, h);
  // Dressed jambs and lintel.
  g.fillStyle(STONE_LIT, 1); g.fillRect(x0, top, 8, h); g.fillRect(x0 + w - 8, top, 8, h); g.fillRect(x0, top, w, 9);
  g.fillStyle(dim(STONE_LIT, 0.2), 1); g.fillRect(x0 + 7, top + 9, 2, h - 9); g.fillRect(x0 + w - 9, top + 9, 2, h - 9);
  // The infill, block by block.
  const bh = 11;
  for (let yy = top + 10, r = 0; yy < y - 1; yy += bh, r++) {
    let xx = x0 + 9 - (r % 2) * 8;
    while (xx < x0 + w - 9) {
      const bw = 12 + rng() * 10;
      const bx0 = Math.max(x0 + 9, xx), bx1 = Math.min(x0 + w - 9, xx + bw - 1.5);
      const c = mixC(STONE, STONE_DARK, rng() * 0.5);
      g.fillStyle(c, 1); g.fillRect(bx0, yy, bx1 - bx0, Math.min(bh - 1.5, y - yy - 1));
      g.fillStyle(lit(c, 0.12), 0.6); g.fillRect(bx0, yy, bx1 - bx0, 1.5);
      xx += bw;
    }
    g.fillStyle(fresh ? MORTAR : dim(MORTAR, 0.35), fresh ? 0.9 : 0.6); g.fillRect(x0 + 9, yy + bh - 1.5, w - 18, 1.5);
  }
  // The slit, a dark slot at eye height, and the face behind it.
  const sy = top + 24;
  g.fillStyle(SOOT, 1); g.fillRect(x - 16, sy - 5, 32, 10);
  if (face >= 0) slitFace(g, x, sy, 1, SKINS[face % SKINS.length], 0, face);
  // The debt plate.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 10, y - 26, 20, 11);
  g.fillStyle(BRASS, 1); g.fillRect(x - 9, y - 25, 18, 9);
  g.lineStyle(1, BRASS_DARK, 1);
  for (let k = 0; k < 3; k++) g.lineBetween(x - 6, y - 23 + k * 3, x + 6 - (k === 2 ? 5 : 0), y - 23 + k * 3);
}

// ── The Old King's dead ──────────────────────────────────────────────

/**
 * A sarcophagus seen from above and a little in front: a plinth, the coffer with carved arcading
 * down its side, and the lid with its effigy (folded hands, a sword down the body, feet on a
 * little hound). `lidShift` slides the lid sideways off the coffer (0 shut, 1 fully off) and
 * shows the dark inside.
 */
export function sarcophagus(g: G, x: number, y: number, w: number, h: number, lidShift: number, crowned = false, a = 1): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 4, w * 1.25, 16, 0.4 * a);
  g.fillStyle(STONE_DEEP, a); g.fillRect(x0 - 5, y - 12, w + 10, 14);
  g.fillStyle(STONE_DARK, a); g.fillRect(x0 - 4, y - 12, w + 8, 10);
  // The coffer front: a band of little arches.
  g.fillStyle(dim(STONE, 0.15), a); g.fillRect(x0, y - 30, w, 18);
  g.lineStyle(1.2, STONE_DARK, a);
  const n = Math.max(2, Math.round(w / 14));
  for (let k = 0; k < n; k++) {
    const ax = x0 + (k + 0.5) * (w / n);
    g.beginPath(); g.arc(ax, y - 22, w / n / 2 - 1.5, Math.PI, 0, false); g.strokePath();
    g.lineBetween(ax - w / n / 2 + 1.5, y - 22, ax - w / n / 2 + 1.5, y - 13);
  }
  // The coffer top (the inside, where the lid has moved).
  g.fillStyle(STONE, a); g.fillRect(x0, top, w, h - 30);
  if (lidShift > 0.01) {
    g.fillStyle(SOOT, a); g.fillRect(x0 + 4, top + 4, w - 8, h - 38);
    g.fillStyle(DUST_DEEP, 0.4 * a); g.fillRect(x0 + 6, top + h - 48, w - 12, 10);
  }
  // The lid and its effigy.
  const lx = x0 + lidShift * (w * 0.8);
  const lw = w, lh = h - 30;
  g.fillStyle(dim(STONE_LIT, 0.1), a); g.fillRect(lx - 2, top - 4, lw + 4, lh + 2);
  g.fillStyle(STONE_LIT, a); g.fillRect(lx, top - 4, lw, 3);
  const ex = lx + lw / 2, ey = top + 6;
  const eh = lh - 16;
  // Effigy: head on a pillow, a gown in folds, the hands and the sword, the hound at the feet.
  g.fillStyle(lit(STONE, 0.1), a); g.fillRect(ex - lw * 0.22, ey, lw * 0.44, 7);
  g.fillStyle(lit(STONE, 0.18), a); g.fillCircle(ex, ey + 9, Math.min(8, lw * 0.16));
  if (crowned) {
    g.fillStyle(BRASS, 0.9 * a);
    g.fillPoints([{ x: ex - 7, y: ey + 4 }, { x: ex - 7, y: ey - 2 }, { x: ex - 3, y: ey + 2 }, { x: ex, y: ey - 4 }, { x: ex + 3, y: ey + 2 }, { x: ex + 7, y: ey - 2 }, { x: ex + 7, y: ey + 4 }] as V2[], true, true);
  }
  g.fillStyle(lit(STONE, 0.12), a);
  g.fillPoints([{ x: ex - lw * 0.18, y: ey + 16 }, { x: ex + lw * 0.18, y: ey + 16 }, { x: ex + lw * 0.26, y: ey + eh }, { x: ex - lw * 0.26, y: ey + eh }] as V2[], true, true);
  g.lineStyle(1, dim(STONE, 0.2), 0.7 * a);
  for (let k = 1; k < 4; k++) g.lineBetween(ex - lw * 0.12 + k * lw * 0.06, ey + 22, ex - lw * 0.18 + k * lw * 0.09, ey + eh - 2);
  g.lineStyle(2, dim(STONE_LIT, 0.05), a); g.lineBetween(ex, ey + 18, ex, ey + eh - 4);
  g.lineBetween(ex - 5, ey + 24, ex + 5, ey + 24);
  g.fillStyle(lit(STONE, 0.22), a); g.fillEllipse(ex, ey + 30, 10, 6);
  g.fillStyle(dim(STONE, 0.05), a); g.fillEllipse(ex, ey + eh + 2, lw * 0.36, 7);
}

/** A grave candle: a stub of tallow on a pricket, its little flame and the soot above. */
export function candle(g: G, x: number, y: number, t: number, s = 1): void {
  g.fillStyle(IRON, 1); g.fillRect(x - 4 * s, y - 2 * s, 8 * s, 2 * s);
  g.fillStyle(0xe8dcc0, 1); g.fillRect(x - 2 * s, y - 10 * s, 4 * s, 8 * s);
  g.fillStyle(0xd0c4a4, 1); g.fillEllipse(x, y - 10 * s, 5 * s, 2 * s);
  const f = 1 + Math.sin(t * 13 + x) * 0.15;
  g.fillStyle(CANDLE, 0.18); g.fillCircle(x, y - 14 * s, 9 * s * f);
  g.fillStyle(CANDLE, 0.9); g.fillEllipse(x, y - 14 * s, 3.4 * s, 6 * s * f);
  g.fillStyle(0xfff4d0, 1); g.fillEllipse(x, y - 13 * s, 1.4 * s, 3 * s);
}

/** A headstone, leaning a little: a round-topped slab, a carved cross-band, moss at the foot. */
export function headstone(g: G, x: number, y: number, s: number, lean: number, a = 1): void {
  shadow(g, x, y + 1, 30 * s, 8 * s, 0.3 * a);
  const c = Math.cos(lean), sn = Math.sin(lean);
  const P = (px: number, py: number): V2 => ({ x: x + px * c - py * sn, y: y + px * sn + py * c });
  const pts: V2[] = [P(-11 * s, 0), P(11 * s, 0), P(11 * s, -26 * s)];
  for (let k = 0; k <= 8; k++) { const an = (k / 8) * Math.PI; pts.push(P(Math.cos(an) * 11 * s, -26 * s - Math.sin(an) * 9 * s)); }
  pts.push(P(-11 * s, -26 * s));
  g.fillStyle(STONE_DARK, a); g.fillPoints(pts.map((p) => ({ x: p.x + 2, y: p.y + 1 })), true, true);
  g.fillStyle(STONE, a); g.fillPoints(pts, true, true);
  const l1 = P(-6 * s, -20 * s), l2 = P(6 * s, -20 * s), l3 = P(-6 * s, -14 * s), l4 = P(4 * s, -14 * s);
  g.lineStyle(1.2, STONE_DARK, a); g.lineBetween(l1.x, l1.y, l2.x, l2.y); g.lineBetween(l3.x, l3.y, l4.x, l4.y);
  g.fillStyle(0x4a5a32, 0.6 * a); g.fillEllipse(x, y - 1, 22 * s, 5 * s);
}
