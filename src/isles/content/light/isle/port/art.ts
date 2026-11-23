import type { Rect } from '../../../../IslesTypes';
import { type G, dim, glow, lit, mixC, shadow } from '../../../../art/IsleArt';
import { inView, poly } from '../../../water/isle/port/art';

export { inView, poly };

/**
 * Meridian Quay's palette and set pieces.
 *
 * Everything on Solmara is drawn as it looks at a noon that never ends: white limestone and marble
 * gone almost too bright to read, gold leaf on every dome, glass where there should be wood, and the
 * shadows — the thing the eye keeps looking for — shrunk to a hard dark sliver straight underneath.
 * Nothing here has a long shadow, so no piece here gets one. The one dark thing on the quay is the
 * Dusk-house, and it is drawn as a hole in the picture.
 */

// ── Palette ──────────────────────────────────────────────────────────
export const LIME = 0xece4d0;
export const LIME_ALT = 0xe2d8c0;
export const LIME_DARK = 0xb8ac90;
export const MARBLE = 0xf6f2e8;
export const MARBLE_SHADE = 0xdcd4c2;
export const MARBLE_DARK = 0xa49a84;
export const VEIN = 0xc8bca8;
export const GOLD = 0xe8c050;
export const GOLD_LIT = 0xfff0a8;
export const GOLD_DARK = 0xa07a24;
export const GLASS = 0xbfe6ee;
export const GLASS_LIT = 0xf4ffff;
export const GLASS_DARK = 0x6a9aa8;
export const IRON = 0x3c3c44;
export const IRON_LIT = 0x6a6a78;
export const BRASS = 0xc8a048;
export const BRASS_DARK = 0x7a5a20;
export const SEA = 0x5ab4cc;
export const SEA_DEEP = 0x2e86a8;
export const SEA_SHALLOW = 0x9adce4;
export const GLARE = 0xf4fcff;
export const WOOD = 0xc8b08a;
export const WOOD_DARK = 0x8a7250;
export const SAIL = 0xf4ecd8;
export const ROPE = 0xc8a878;
export const SUN = 0xfff6c8;
export const SKY = 0xbfe8f4;
export const SOOT = 0x1a1820;
export const DUSK = 0x2a2438;
export const MOTH = 0xc8f0d8;
export const CLEAR = 0xe8f4fa;

/** A hard noon shadow: a thin dark sliver straight under the foot of a thing, never longer than a coin. */
export function noonShadow(g: G, x: number, y: number, w: number): void {
  shadow(g, x, y + 1, w, Math.max(3, w * 0.12), 0.34);
}

/**
 * Auriel's sunburst — a gilt disc ringed with sixteen straight rays, alternate long and short. It is on
 * every coin, door, buoy and loaf-stamp on Solmara.
 */
export function sunburst(g: G, x: number, y: number, r: number, color = GOLD, a = 1): void {
  for (let i = 0; i < 16; i++) {
    const an = (i / 16) * Math.PI * 2;
    const len = i % 2 ? r * 1.25 : r * 1.75;
    const w = r * 0.18;
    const px = Math.cos(an + Math.PI / 2) * w, py = Math.sin(an + Math.PI / 2) * w;
    poly(g, [[x + px, y + py], [x + Math.cos(an) * len, y + Math.sin(an) * len], [x - px, y - py]], color, a);
  }
  g.fillStyle(dim(color, 0.25), a); g.fillCircle(x, y, r * 0.78);
  g.fillStyle(color, a); g.fillCircle(x, y, r * 0.68);
  g.fillStyle(lit(color, 0.55), a * 0.8); g.fillCircle(x - r * 0.2, y - r * 0.22, r * 0.28);
}

/** Shutters nailed open: two louvred boards pinned flat back against the wall, nail heads showing. */
function nailedShutters(g: G, wx: number, wy: number, ww: number, wh: number, color: number): void {
  for (const side of [-1, 1]) {
    const sx = side < 0 ? wx - ww * 0.55 - 2 : wx + ww + 2;
    g.fillStyle(dim(color, 0.2), 1); g.fillRect(sx, wy - 1, ww * 0.55, wh + 2);
    g.fillStyle(color, 1); g.fillRect(sx + 1, wy, ww * 0.55 - 2, wh);
    g.lineStyle(1, dim(color, 0.35), 0.8);
    for (let k = 3; k < wh; k += 4) g.lineBetween(sx + 2, wy + k, sx + ww * 0.55 - 3, wy + k);
    // Three nails driven straight through each one.
    g.fillStyle(IRON, 1);
    for (const ny of [wy + 2, wy + wh / 2, wy + wh - 3]) g.fillCircle(sx + ww * 0.27, ny, 1.2);
  }
}

export interface MarbleHouseOpts {
  /** Gilded onion-less dome on top (the better houses) instead of a flat roof terrace. */
  dome?: boolean;
  /** Two storeys of windows instead of one. */
  tall?: boolean;
  /** Shutter colour (the only colour a Solmaran house is allowed). */
  shutter?: number;
  /** A tiny painted sunburst over the door. */
  burst?: boolean;
}

/**
 * A Solmaran house: white marble walls in coursed blocks, a glass door (Clarity — no wooden doors),
 * curtainless windows with their shutters nailed open, a roof terrace with a stone parapet or a gilt
 * dome, and a hard sliver of shadow underneath. You can see clean through the door to the back wall.
 */
export function marbleHouse(g: G, x: number, y: number, w: number, h: number, o: MarbleHouseOpts, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  noonShadow(g, x, y, w * 1.02);
  // Plinth and walls.
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0 - 3, y - 8, w + 6, 8);
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x0, top, w, h - 8);
  g.fillStyle(MARBLE, 1); g.fillRect(x0 + 2, top, w - 4, h - 10);
  // Coursed blocks with the faintest veins.
  for (let ry = top + 10; ry < y - 10; ry += 10) {
    g.lineStyle(1, MARBLE_SHADE, 0.7); g.lineBetween(x0 + 2, ry, x0 + w - 2, ry);
    const off = ((ry - top) / 10) % 2 ? 0 : 11;
    for (let rx = x0 + off; rx < x0 + w - 4; rx += 22) g.lineBetween(rx, ry, rx, ry + 10);
  }
  for (let k = 0; k < w / 24; k++) {
    const vx = x0 + 6 + rng() * (w - 12), vy = top + 6 + rng() * (h - 20);
    g.lineStyle(1, VEIN, 0.45); g.lineBetween(vx, vy, vx + 6 + rng() * 8, vy + 3 + rng() * 6);
  }
  // The sun-side face is bleached whiter still: a glare wash down the left.
  g.fillStyle(0xffffff, 0.25); g.fillRect(x0 + 2, top, w * 0.18, h - 10);
  // Windows: glass, no curtains, shutters nailed back.
  const rows = o.tall ? 2 : 1;
  const sh = o.shutter ?? 0x9ab8c8;
  const cols = Math.max(1, Math.floor((w - 40) / 46));
  for (let r = 0; r < rows; r++) {
    const wy = top + 12 + r * ((h - 30) / rows);
    for (let c = 0; c < cols; c++) {
      const wx = x0 + (w / (cols + 1)) * (c + 1) - 7;
      if (r === rows - 1 && Math.abs(wx + 7 - x) < 20) continue;
      nailedShutters(g, wx, wy, 14, 18, sh);
      g.fillStyle(MARBLE_DARK, 1); g.fillRect(wx - 1, wy - 1, 16, 20);
      g.fillStyle(GLASS_DARK, 1); g.fillRect(wx, wy, 14, 18);
      // You can see in: a chair, a bed with no blanket, the back wall.
      g.fillStyle(MARBLE_SHADE, 0.6); g.fillRect(wx + 2, wy + 10, 10, 6);
      g.fillStyle(GLASS_LIT, 0.55); g.fillTriangle(wx, wy, wx + 6, wy, wx, wy + 8);
      g.fillStyle(MARBLE_DARK, 1); g.fillRect(wx - 2, wy + 18, 18, 2);
    }
  }
  // The glass door, in a gilt frame, with the room showing through it.
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 11, y - 38, 22, 31);
  g.fillStyle(GLASS_DARK, 1); g.fillRect(x - 9, y - 36, 18, 29);
  g.fillStyle(MARBLE_SHADE, 0.55); g.fillRect(x - 7, y - 20, 14, 12);
  g.fillStyle(GLASS_LIT, 0.6); g.fillTriangle(x - 9, y - 36, x - 1, y - 36, x - 9, y - 24);
  g.lineStyle(1, GOLD, 1); g.lineBetween(x, y - 36, x, y - 7);
  g.fillStyle(GOLD_LIT, 1); g.fillCircle(x + 5, y - 21, 1.4);
  if (o.burst) sunburst(g, x, y - 46, 4, GOLD, 1);
  // Doorstep.
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 15, y - 7, 30, 5);
  // Roof.
  if (o.dome) {
    const dr = Math.min(w * 0.3, 48);
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - dr - 4, top - 8, dr * 2 + 8, 9);
    g.fillStyle(GOLD_DARK, 1); g.fillEllipse(x, top - 8, dr * 2, dr * 1.6);
    g.fillStyle(GOLD, 1); g.fillEllipse(x - 2, top - 10, dr * 1.86, dr * 1.48);
    g.fillStyle(GOLD_DARK, 1); g.fillRect(x - dr - 2, top - 8, dr * 2 + 4, dr * 0.85);
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - dr - 4, top - 8, dr * 2 + 8, 9);
    // Gilt ribs and the white-hot highlight the noon puts on every dome.
    g.lineStyle(1.2, GOLD_DARK, 0.8);
    for (let k = -2; k <= 2; k++) {
      g.beginPath(); g.arc(x + k * dr * 0.32, top - 8, dr * 0.78, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
    }
    g.fillStyle(GOLD_LIT, 0.9); g.fillEllipse(x - dr * 0.25, top - 8 - dr * 0.55, dr * 0.5, dr * 0.22);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(x - dr * 0.28, top - 8 - dr * 0.58, 2.5);
    g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 1.5, top - 8 - dr * 0.8 - 12, 3, 12);
    sunburst(g, x, top - 8 - dr * 0.8 - 14, 3.5, GOLD, 1);
  } else {
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0 - 5, top - 4, w + 10, 6);
    g.fillStyle(MARBLE, 1); g.fillRect(x0 - 5, top - 6, w + 10, 3);
    // A parapet of balusters round the roof terrace — and on it, a bedframe dragged out to sleep under the sun.
    for (let bx = x0 - 2; bx < x0 + w; bx += 8) {
      g.fillStyle(MARBLE_SHADE, 1); g.fillRect(bx, top - 16, 4, 10);
      g.fillStyle(MARBLE, 1); g.fillEllipse(bx + 2, top - 11, 5, 4);
    }
    g.fillStyle(MARBLE, 1); g.fillRect(x0 - 5, top - 19, w + 10, 3);
  }
}

/**
 * The old lighthouse on its rock: a white round tower banded with gilt (the Despot's work — it used to be
 * red and white), the gallery, and the lamp room. Unlit, the lamp room is a cage of dusty glass round a
 * great dead lens with a pale luna moth asleep on the sill; lit, the lens burns warm amber. The door at
 * its foot was the keeper's — a real wooden door, nailed open with a plank across it.
 */
export function lighthouse(g: G, x: number, y: number, lit_: boolean, rng: () => number): void {
  const H = 300, rb = 40, rt = 26;
  noonShadow(g, x, y, rb * 2.4);
  // The rock it stands on.
  g.fillStyle(LIME_DARK, 1); g.fillEllipse(x, y - 6, rb * 3.1, 34);
  g.fillStyle(0xd0c6ae, 1); g.fillEllipse(x - 4, y - 10, rb * 2.8, 26);
  for (let k = 0; k < 9; k++) { g.fillStyle(0xf4eedc, 0.6); g.fillEllipse(x - rb * 1.2 + rng() * rb * 2.4, y - 14 + rng() * 10, 10, 4); }
  // The tower: a tapering drum.
  const tx = (t: number): number => rb + (rt - rb) * t;
  poly(g, [[x - rb, y - 14], [x - rt, y - 14 - H], [x + rt, y - 14 - H], [x + rb, y - 14]], MARBLE_SHADE);
  poly(g, [[x - rb + 4, y - 14], [x - rt + 3, y - 14 - H], [x + rt * 0.3, y - 14 - H], [x + rb * 0.3, y - 14]], MARBLE);
  // Gilt bands where the red ones used to be (a ghost of red still shows at their edges).
  for (let b = 0; b < 4; b++) {
    const t0 = 0.18 + b * 0.2, t1 = t0 + 0.07;
    const y0 = y - 14 - H * t0, y1 = y - 14 - H * t1;
    poly(g, [[x - tx(t0), y0], [x - tx(t1), y1], [x + tx(t1), y1], [x + tx(t0), y0]], GOLD);
    g.lineStyle(1, 0xb85a4a, 0.35); g.lineBetween(x - tx(t0), y0 + 1, x + tx(t0), y0 + 1);
    g.fillStyle(GOLD_LIT, 0.7); g.fillRect(x - tx(t0) + 5, y1 + 1, 4, y0 - y1 - 2);
  }
  // Slit windows up the stair, glass, no shutters to nail.
  for (let k = 0; k < 4; k++) {
    const wy = y - 60 - k * 62;
    g.fillStyle(GLASS_DARK, 1); g.fillRect(x + 6, wy, 6, 14);
    g.fillStyle(GLASS_LIT, 0.5); g.fillRect(x + 6, wy, 2, 6);
  }
  // The keeper's door — wood, nailed open, a plank across.
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 13, y - 50, 26, 36);
  g.fillStyle(SOOT, 1); g.fillRect(x - 11, y - 48, 22, 34);
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x - 24, y - 48, 12, 34);
  g.lineStyle(1, dim(WOOD_DARK, 0.3), 1); for (let k = 0; k < 3; k++) g.lineBetween(x - 21 + k * 4, y - 47, x - 21 + k * 4, y - 15);
  g.fillStyle(WOOD, 1); poly(g, [[x - 15, y - 40], [x + 15, y - 30], [x + 15, y - 25], [x - 15, y - 35]], WOOD);
  g.fillStyle(IRON, 1); g.fillCircle(x - 12, y - 37, 1.4); g.fillCircle(x + 12, y - 28, 1.4);
  // Gallery: a ring deck and a railing.
  const gy = y - 14 - H;
  g.fillStyle(IRON, 1); g.fillRect(x - rt - 14, gy - 4, rt * 2 + 28, 7);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - rt - 14, gy - 5, rt * 2 + 28, 2);
  for (let rx = x - rt - 12; rx <= x + rt + 12; rx += 6) { g.lineStyle(1, IRON, 1); g.lineBetween(rx, gy - 5, rx, gy - 18); }
  g.lineStyle(2, IRON, 1); g.lineBetween(x - rt - 14, gy - 18, x + rt + 14, gy - 18);
  // The lamp room: a cage of glass panes in iron astragals round the great lens.
  const ly = gy - 18, lh = 44;
  g.fillStyle(IRON, 1); g.fillRect(x - rt + 2, ly - lh, rt * 2 - 4, lh);
  g.fillStyle(lit_ ? 0x8a5a1a : 0x4a5a60, 1); g.fillRect(x - rt + 4, ly - lh + 2, rt * 2 - 8, lh - 4);
  // The lens: stacked glass rings of a Fresnel drum.
  for (let k = 0; k < 6; k++) {
    const ry = ly - lh + 8 + k * 6;
    g.fillStyle(lit_ ? mixC(0xffc860, 0xfff4c0, k % 2 ? 0.3 : 0.8) : (k % 2 ? 0x8aa4ac : 0xa8c0c8), 1);
    g.fillEllipse(x, ry, (rt - 8) * 2 - Math.abs(k - 2.5) * 3, 5);
  }
  if (lit_) {
    glow(g, x, ly - lh / 2, 46, 0xffd070, 0.1, 5);
    g.fillStyle(0xffffff, 0.95); g.fillCircle(x, ly - lh / 2, 5);
  } else {
    // Dust and cobweb in the corners of the panes; a moth asleep on the sill.
    g.lineStyle(0.8, 0xe0e8ea, 0.6);
    g.lineBetween(x - rt + 4, ly - lh + 2, x - rt + 12, ly - lh + 10); g.lineBetween(x - rt + 4, ly - lh + 8, x - rt + 10, ly - lh + 2);
    g.fillStyle(MOTH, 0.9); g.fillTriangle(x + 8, ly - 4, x + 15, ly - 9, x + 15, ly - 2); g.fillTriangle(x + 8, ly - 4, x + 1, ly - 9, x + 1, ly - 2);
  }
  g.lineStyle(1.5, IRON, 1);
  for (let k = -2; k <= 2; k++) g.lineBetween(x + k * (rt - 4) / 2.2, ly - lh, x + k * (rt - 4) / 2.2, ly);
  g.fillStyle(GLASS_LIT, 0.22); g.fillRect(x - rt + 4, ly - lh + 2, (rt - 4) * 0.7, lh - 4);
  // Cupola, a gilt sunburst vane where the old wind-arrow was.
  g.fillStyle(IRON, 1); poly(g, [[x - rt - 2, ly - lh], [x, ly - lh - 26], [x + rt + 2, ly - lh]], IRON);
  g.fillStyle(IRON_LIT, 1); poly(g, [[x - rt + 2, ly - lh - 1], [x - 2, ly - lh - 22], [x - 2, ly - lh - 1]], IRON_LIT);
  g.fillStyle(IRON, 1); g.fillRect(x - 1, ly - lh - 42, 2, 18);
  sunburst(g, x, ly - lh - 44, 4, GOLD, 1);
}

/**
 * The fish market: a long glass roof on white iron ribs, open at the sides (walls would be shade), the
 * stalls under it piled with silver fish on beds of ice that melts as fast as it is laid. The whole
 * roof throws a dazzle of glare on the paving.
 */
export function fishMarket(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  noonShadow(g, x, y, w);
  // Slab floor and a gutter of meltwater.
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0 - 6, y - 10, w + 12, 10);
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x0 - 4, y - 12, w + 8, 6);
  g.fillStyle(SEA_SHALLOW, 0.7); g.fillRect(x0, y - 4, w, 3);
  // Stalls: slab counters with fish on ice.
  const n = Math.floor(w / 70);
  for (let i = 0; i < n; i++) {
    const sx = x0 + 12 + i * (w - 24) / n, sw = (w - 24) / n - 12;
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(sx, y - 34, sw, 22);
    g.fillStyle(MARBLE, 1); g.fillRect(sx, y - 36, sw, 6);
    g.fillStyle(0xe8f8fc, 1); g.fillRect(sx + 2, y - 40, sw - 4, 5);
    for (let k = 0; k < sw / 9; k++) {
      const fx = sx + 6 + k * 9, fy = y - 41 - (k % 2) * 2;
      const col = [0xd8e4ec, 0xe8c860, 0xb8c8d4, 0xc8d8e0][(i + k) % 4];
      g.fillStyle(col, 1); g.fillEllipse(fx, fy, 10, 4);
      g.fillTriangle(fx + 4, fy, fx + 8, fy - 3, fx + 8, fy + 3);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(fx - 2, fy - 0.5, 0.9);
    }
    // A price slate on a stick; prices chalked, then chalked again higher.
    g.fillStyle(IRON, 1); g.fillRect(sx + sw - 6, y - 58, 2, 22);
    g.fillStyle(0x2a2e30, 1); g.fillRect(sx + sw - 16, y - 66, 20, 10);
    g.lineStyle(1, 0xf0f0f0, 0.8); g.lineBetween(sx + sw - 13, y - 61, sx + sw - 3, y - 61);
  }
  // White iron ribs.
  const bays = Math.round(w / 60);
  for (let i = 0; i <= bays; i++) {
    const bx = x0 + (w * i) / bays;
    g.fillStyle(0xd8dce0, 1); g.fillRect(bx - 2, top + 20, 4, h - 30);
    g.fillStyle(0xffffff, 1); g.fillRect(bx - 2, top + 20, 1.5, h - 30);
  }
  // The glass roof: a long pitched glazing seen from the front, panes catching the sun at different angles.
  const ry = top + 20;
  poly(g, [[x0 - 14, ry], [x0 + 20, top - 18], [x0 + w - 20, top - 18], [x0 + w + 14, ry]], GLASS, 0.75);
  for (let i = 0; i < bays * 2; i++) {
    const px = x0 - 10 + ((w + 20) * i) / (bays * 2);
    const flash = rng();
    g.fillStyle(flash > 0.7 ? GLARE : GLASS_LIT, flash > 0.7 ? 0.95 : 0.35);
    poly(g, [[px, ry - 1], [px + 8, top - 16], [px + 8 + (w + 20) / (bays * 2) - 4, top - 16], [px + (w + 20) / (bays * 2) - 4, ry - 1]],
      flash > 0.7 ? GLARE : GLASS_LIT, flash > 0.7 ? 0.9 : 0.3);
  }
  g.lineStyle(2, 0xf0f4f8, 1);
  g.lineBetween(x0 - 14, ry, x0 + w + 14, ry); g.lineBetween(x0 + 20, top - 18, x0 + w - 20, top - 18);
  for (let i = 0; i <= bays; i++) { const bx = x0 + (w * i) / bays; g.lineBetween(bx, ry, x0 + 20 + ((w - 40) * i) / bays, top - 18); }
  // Ridge cresting in gilt fish-tails and a sunburst at the gable.
  for (let cx = x0 + 30; cx < x0 + w - 30; cx += 22) { g.fillStyle(GOLD, 1); g.fillTriangle(cx, top - 18, cx + 5, top - 26, cx + 10, top - 18); }
  sunburst(g, x, top - 30, 7, GOLD, 1);
}

/**
 * The Customs of Clarity: a white portico of fluted columns under a pediment carved with the sunburst
 * and the words SEEN IS SAFE, a lictor's mirror on a pole either side of the steps. In front of it is
 * the inspection table, drawn separately.
 */
export function customsHouse(g: G, x: number, y: number, w: number, h: number): void {
  const x0 = x - w / 2, top = y - h;
  noonShadow(g, x, y, w);
  // Steps.
  for (let k = 0; k < 3; k++) {
    g.fillStyle(k % 2 ? MARBLE_SHADE : MARBLE, 1); g.fillRect(x0 - 10 + k * 5, y - 6 - k * 6, w + 20 - k * 10, 6);
    g.fillStyle(MARBLE_DARK, 0.6); g.fillRect(x0 - 10 + k * 5, y - 1 - k * 6, w + 20 - k * 10, 1);
  }
  // Back wall (there is no front wall — you can see straight into the hall).
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x0 + 6, top + 26, w - 12, h - 44);
  // Through the colonnade: racks of confiscated things on view, labelled.
  for (let k = 0; k < 7; k++) {
    const ix = x0 + 26 + k * (w - 52) / 6;
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(ix - 10, y - 46, 20, 3);
    const kind = k % 4;
    if (kind === 0) { g.fillStyle(0x2a2a30, 1); g.fillTriangle(ix - 9, y - 50, ix + 9, y - 50, ix, y - 62); g.lineStyle(1, IRON, 1); g.lineBetween(ix, y - 50, ix, y - 46); }
    if (kind === 1) { g.fillStyle(0x6a3a4a, 1); g.fillRect(ix - 8, y - 66, 16, 20); g.lineStyle(1, dim(0x6a3a4a, 0.3), 1); for (let f = 0; f < 4; f++) g.lineBetween(ix - 6 + f * 4, y - 66, ix - 6 + f * 4, y - 46); }
    if (kind === 2) { g.fillStyle(0x3a2e24, 1); g.fillRect(ix - 7, y - 58, 14, 12); g.fillStyle(0x6a5a44, 1); g.fillRect(ix - 7, y - 60, 14, 3); }
    if (kind === 3) { g.fillStyle(0x24242c, 1); g.fillEllipse(ix, y - 52, 16, 10); g.fillStyle(0x4a4a58, 1); g.fillEllipse(ix, y - 54, 10, 4); }
    g.fillStyle(0xf4ecd0, 1); g.fillRect(ix - 4, y - 44, 8, 4);
  }
  // Fluted columns.
  const cols = Math.max(4, Math.round(w / 44));
  for (let i = 0; i < cols; i++) {
    const cx = x0 + 10 + (i * (w - 20)) / (cols - 1);
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(cx - 9, y - 26, 18, 6);
    g.fillStyle(MARBLE, 1); g.fillRect(cx - 7, top + 22, 14, h - 46);
    g.lineStyle(1, MARBLE_SHADE, 1); for (let f = -4; f <= 4; f += 2.7) g.lineBetween(cx + f, top + 24, cx + f, y - 26);
    g.fillStyle(0xffffff, 0.6); g.fillRect(cx - 6, top + 24, 2, h - 50);
    g.fillStyle(MARBLE_SHADE, 1); g.fillRect(cx - 10, top + 16, 20, 7);
  }
  // Entablature and pediment.
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0 - 6, top + 6, w + 12, 12);
  g.fillStyle(MARBLE, 1); g.fillRect(x0 - 6, top + 4, w + 12, 8);
  poly(g, [[x0 - 10, top + 4], [x, top - 46], [x0 + w + 10, top + 4]], MARBLE_SHADE);
  poly(g, [[x0 + 4, top + 1], [x, top - 38], [x0 + w - 4, top + 1]], MARBLE);
  sunburst(g, x, top - 14, 11, GOLD, 1);
  // SEEN IS SAFE in gilt letters along the frieze (as little gilt bars).
  for (let k = 0; k < 11; k++) { if (k === 4 || k === 7) continue; g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 46 + k * 8.5, top + 7, 5, 4); }
  // Mirrors on poles at either end of the steps — the Clarity lictors' rods.
  for (const mx of [x0 - 22, x0 + w + 22]) {
    g.fillStyle(IRON, 1); g.fillRect(mx - 1.5, y - 74, 3, 72);
    g.fillStyle(GOLD_DARK, 1); g.fillCircle(mx, y - 84, 12);
    g.fillStyle(GLASS_LIT, 1); g.fillCircle(mx, y - 84, 10);
    g.fillStyle(0xffffff, 1); g.fillCircle(mx - 3, y - 87, 3);
  }
}

/**
 * The inspection table: a long sunlit trestle where every bag landed at Meridian is emptied and spread
 * out, item by item, under the glare — shirts, a comb, letters unfolded, a loaf cut open, a child's doll
 * with its head off to see inside. A brass sunburst stamp and a ledger at the end.
 */
export function inspectionTable(g: G, x: number, y: number, w: number, rng: () => number): void {
  const x0 = x - w / 2;
  noonShadow(g, x, y, w);
  g.fillStyle(WOOD_DARK, 1);
  for (const lx of [x0 + 6, x0 + w / 2 - 2, x0 + w - 10]) g.fillRect(lx, y - 20, 4, 20);
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x0, y - 24, w, 6);
  g.fillStyle(MARBLE, 1); g.fillRect(x0, y - 26, w, 4);
  let cx = x0 + 10;
  while (cx < x0 + w - 40) {
    const k = Math.floor(rng() * 6);
    if (k === 0) { g.fillStyle([0xe8e0d0, 0xa8c0d8, 0xd8b0a0][Math.floor(rng() * 3)], 1); g.fillRect(cx, y - 32, 16, 7); g.lineStyle(1, 0x000000, 0.12); g.lineBetween(cx + 8, y - 32, cx + 8, y - 25); cx += 20; }
    else if (k === 1) { g.fillStyle(0xfaf6ea, 1); g.fillRect(cx, y - 30, 10, 5); g.lineStyle(0.6, 0x5a5a6a, 0.6); g.lineBetween(cx + 1, y - 28, cx + 8, y - 28); cx += 13; }
    else if (k === 2) { g.fillStyle(0xc89050, 1); g.fillEllipse(cx + 6, y - 29, 12, 6); g.fillStyle(0xf4e0b0, 1); g.fillEllipse(cx + 6, y - 29, 6, 4); cx += 15; }
    else if (k === 3) { g.fillStyle(0xe8b8a0, 1); g.fillRect(cx, y - 30, 9, 4); g.fillCircle(cx + 13, y - 29, 2.5); cx += 18; }
    else if (k === 4) { g.fillStyle(0x7a5a3a, 1); g.fillRect(cx, y - 29, 10, 3); for (let t = 0; t < 5; t++) g.fillRect(cx + 1 + t * 2, y - 32, 1, 3); cx += 13; }
    else { g.fillStyle(0x5a4a3a, 1); g.fillRoundedRect(cx, y - 34, 14, 9, 2); g.fillStyle(0x3a2a1e, 1); g.fillRect(cx + 1, y - 35, 12, 2); cx += 18; }
  }
  // Ledger and stamp at the end.
  g.fillStyle(0x6a2a2a, 1); g.fillRect(x0 + w - 34, y - 31, 20, 6);
  g.fillStyle(0xfaf6ea, 1); g.fillRect(x0 + w - 33, y - 32, 18, 2);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x0 + w - 10, y - 36, 3, 10);
  sunburst(g, x0 + w - 8.5, y - 38, 3, BRASS, 1);
}

/**
 * The licensed Dusk-house: the only dark thing on the quay — a windowless black-stuccoed block with a
 * heavy curtain in the doorway (the one legal curtain in Meridian) and DUSK · ONE HOUR · BY TICKET in
 * gilt over it. The booth at its door, the queue rail and the clerk are separate.
 */
export function duskHouse(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  noonShadow(g, x, y, w);
  g.fillStyle(0x0e0c14, 1); g.fillRect(x0 - 3, top - 3, w + 6, h + 3);
  g.fillStyle(DUSK, 1); g.fillRect(x0, top, w, h - 6);
  // Stucco texture, scorched and blistered by the sun on its outer skin.
  for (let k = 0; k < w * h / 260; k++) {
    g.fillStyle(rng() < 0.5 ? 0x34304a : 0x221e2e, 0.8);
    g.fillCircle(x0 + rng() * w, top + rng() * (h - 8), 1 + rng() * 2);
  }
  g.fillStyle(0x6a5a6a, 0.35); g.fillRect(x0, top, w, 6);
  // A gilt cornice — even the dark is the Despot's.
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x0 - 6, top - 8, w + 12, 8);
  g.fillStyle(GOLD, 1); g.fillRect(x0 - 6, top - 10, w + 12, 4);
  for (let k = 0; k < 14; k++) { g.fillStyle(GOLD_LIT, 1); g.fillRect(x - 56 + k * 8, top + 10, 5, 3); }
  // The door: a black velvet curtain, slightly parted, darker than anything on the isle.
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 20, y - 56, 40, 50);
  g.fillStyle(0x050408, 1); g.fillRect(x - 17, y - 53, 34, 47);
  g.fillStyle(0x1a1424, 1);
  for (let f = 0; f < 6; f++) g.fillRect(x - 17 + f * 6, y - 53, 3, 47);
  g.fillStyle(0x000000, 1); g.fillTriangle(x - 3, y - 53, x + 3, y - 53, x, y - 6);
  // Ventilation slots near the roof, louvred inward so no light gets in.
  for (const vx of [x0 + 18, x0 + w - 34]) for (let s = 0; s < 3; s++) { g.fillStyle(0x000000, 1); g.fillRect(vx, top + 22 + s * 5, 16, 2); }
}

/**
 * The ticket booth at the Dusk-house door: a glass box (of course) with a clerk inside, a huge brass
 * stopwatch hung in the window and a rack of punched Dusk Tickets. `hand` is the stopwatch hand angle.
 */
export function ticketBooth(g: G, x: number, y: number, hand: number): void {
  noonShadow(g, x, y, 46);
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 22, y - 62, 44, 62);
  g.fillStyle(GLASS, 0.85); g.fillRect(x - 19, y - 59, 38, 40);
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x - 19, y - 19, 38, 17);
  // The clerk: a grey back, sleeve-garters, a visor.
  g.fillStyle(0x6a6a74, 1); g.fillEllipse(x - 6, y - 26, 16, 18);
  g.fillStyle(0xe8c8a8, 1); g.fillCircle(x - 6, y - 38, 6);
  g.fillStyle(0x3a6a4a, 0.85); g.fillEllipse(x - 4, y - 42, 14, 4);
  // The stopwatch: brass case, white face, one hand.
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x + 8, y - 44, 9); g.fillRect(x + 6.5, y - 56, 3, 4);
  g.fillStyle(BRASS, 1); g.fillCircle(x + 8, y - 44, 8);
  g.fillStyle(0xfaf6ea, 1); g.fillCircle(x + 8, y - 44, 6.5);
  g.lineStyle(1.3, SOOT, 1); g.lineBetween(x + 8, y - 44, x + 8 + Math.cos(hand) * 5.5, y - 44 + Math.sin(hand) * 5.5);
  g.fillStyle(0xc83a2a, 1); g.fillCircle(x + 8, y - 44, 1.2);
  g.fillStyle(GLASS_LIT, 0.5); g.fillTriangle(x - 19, y - 59, x - 6, y - 59, x - 19, y - 44);
  // Roof and a sign: NEXT.
  g.fillStyle(GOLD, 1); g.fillRect(x - 25, y - 66, 50, 5);
  g.fillStyle(0x2a2438, 1); g.fillRect(x - 12, y - 76, 24, 9);
  g.fillStyle(GOLD_LIT, 1); for (let k = 0; k < 4; k++) g.fillRect(x - 9 + k * 5, y - 73, 3, 3);
}

/** Brass queue stanchions with a red rope sagging between them, along `pts`. */
export function queueRail(g: G, pts: [number, number][]): void {
  for (let i = 0; i < pts.length; i++) {
    const [px, py] = pts[i];
    if (i > 0) {
      const [qx, qy] = pts[i - 1];
      g.lineStyle(2.5, 0x8a2a2a, 1);
      g.beginPath(); g.moveTo(qx, qy - 22);
      for (let k = 1; k <= 8; k++) { const t = k / 8; g.lineTo(qx + (px - qx) * t, qy + (py - qy) * t - 22 + Math.sin(t * Math.PI) * 6); }
      g.strokePath();
    }
  }
  for (const [px, py] of pts) {
    shadow(g, px, py + 1, 12, 3, 0.34);
    g.fillStyle(BRASS_DARK, 1); g.fillEllipse(px, py, 12, 5);
    g.fillStyle(BRASS, 1); g.fillRect(px - 1.5, py - 24, 3, 24);
    g.fillStyle(GOLD_LIT, 1); g.fillCircle(px, py - 25, 2.5);
  }
}

/**
 * The Golden Crust: a round bakery under a gilt dome like a loaf, a sun-shaped window full of bread,
 * the oven's mouth glowing in its side and a stamp-board of sunburst rolls cooling on the sill.
 */
export function goldenCrust(g: G, x: number, y: number, rng: () => number): void {
  const w = 200, h = 96, x0 = x - w / 2, top = y - h;
  noonShadow(g, x, y, w);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0 - 2, y - 8, w + 4, 8);
  g.fillStyle(0xf0dcb0, 1); g.fillRect(x0, top, w, h - 8);
  g.fillStyle(0xfaecc8, 1); g.fillRect(x0 + 3, top, w - 6, h - 12);
  // Floury handprints by the door.
  for (let k = 0; k < 5; k++) { g.fillStyle(0xffffff, 0.5); g.fillCircle(x0 + 30 + rng() * 40, y - 30 - rng() * 30, 3); }
  // The loaf dome: crust brown at the base going to gilt at the crown, slashed like a cob.
  const dr = 74;
  g.fillStyle(0x8a5422, 1); g.fillEllipse(x, top - 2, dr * 2 + 8, dr * 1.3);
  g.fillStyle(0xc88a3a, 1); g.fillEllipse(x, top - 6, dr * 2, dr * 1.2);
  g.fillStyle(GOLD, 1); g.fillEllipse(x - 6, top - 14, dr * 1.4, dr * 0.8);
  g.fillStyle(0xfaecc8, 1); g.fillRect(x0 - 4, top - 2, w + 8, dr * 0.6);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0 - 6, top - 4, w + 12, 6);
  for (let k = -2; k <= 2; k++) {
    g.lineStyle(3, 0xf4dca0, 1); g.lineBetween(x + k * 22 - 10, top - 26 - Math.abs(k) * -3, x + k * 22 + 10, top - 40 + Math.abs(k) * 6);
  }
  g.fillStyle(GOLD_LIT, 0.9); g.fillEllipse(x - 26, top - 40, 30, 10);
  // A flour-white chimney.
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x + 50, top - 56, 16, 30);
  g.fillStyle(MARBLE, 1); g.fillRect(x + 48, top - 58, 20, 5);
  // The sun window: round, spoked like the sunburst, loaves stacked behind the glass.
  const wx = x - 44, wy = top + 40;
  g.fillStyle(GOLD_DARK, 1); g.fillCircle(wx, wy, 24);
  g.fillStyle(0x6a3a14, 1); g.fillCircle(wx, wy, 21);
  for (let k = 0; k < 7; k++) { g.fillStyle([0xc88a3a, 0xe0a850, 0xa86a2a][k % 3], 1); g.fillEllipse(wx - 12 + (k % 4) * 8, wy + 8 - Math.floor(k / 4) * 9, 11, 7); }
  g.lineStyle(1.5, GOLD, 1); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.lineBetween(wx, wy, wx + Math.cos(a) * 21, wy + Math.sin(a) * 21); }
  g.fillStyle(GLASS_LIT, 0.35); g.fillCircle(wx - 7, wy - 8, 8);
  // The oven mouth in the east wall.
  g.fillStyle(0x3a1e0a, 1); g.fillEllipse(x + 54, y - 34, 40, 30);
  g.fillStyle(0xff9a3a, 0.95); g.fillEllipse(x + 54, y - 32, 32, 22);
  g.fillStyle(0xfff0a0, 0.95); g.fillEllipse(x + 54, y - 28, 18, 8);
  // Door: glass, gilded, with a sheaf painted on it.
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 2, y - 46, 26, 40);
  g.fillStyle(GLASS_DARK, 1); g.fillRect(x + 1, y - 43, 20, 36);
  g.lineStyle(1.5, GOLD, 1); for (let k = -1; k <= 1; k++) g.lineBetween(x + 11, y - 14, x + 11 + k * 5, y - 30);
  // Sunburst rolls cooling on the sill.
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0 + 10, y - 16, 56, 4);
  for (let k = 0; k < 5; k++) { sunburst(g, x0 + 16 + k * 11, y - 20, 2.6, 0xd89a44, 1); }
  // Hanging sign: a gilt loaf.
  g.lineStyle(2, IRON, 1); g.lineBetween(x0 - 4, top + 12, x0 - 26, top + 12);
  g.lineBetween(x0 - 18, top + 12, x0 - 18, top + 18); g.lineBetween(x0 - 32, top + 12, x0 - 32, top + 18);
  g.fillStyle(GOLD_DARK, 1); g.fillEllipse(x0 - 25, top + 26, 32, 16);
  g.fillStyle(GOLD, 1); g.fillEllipse(x0 - 25, top + 24, 28, 12);
  g.lineStyle(1.5, GOLD_DARK, 1); for (let k = 0; k < 3; k++) g.lineBetween(x0 - 34 + k * 8, top + 20, x0 - 30 + k * 8, top + 28);
}

/**
 * The Glass Counter: a general store that is all window — the whole front is one leaded grid of glass,
 * every item on view on stepped white shelves, nothing in a box, nothing under a cloth. A gilt fascia,
 * and a brass bell over the glass door.
 */
export function glassCounter(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  noonShadow(g, x, y, w);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0 - 4, y - 8, w + 8, 8);
  // Inside: back wall and stepped shelves of goods.
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x0, top, w, h - 8);
  for (let s = 0; s < 3; s++) {
    const sy = top + 22 + s * 18;
    g.fillStyle(MARBLE, 1); g.fillRect(x0 + 6, sy, w - 12, 3);
    for (let k = 0; k < (w - 20) / 11; k++) {
      const gx = x0 + 10 + k * 11;
      const kind = Math.floor(rng() * 5);
      const col = [0xc8a048, 0x8ac0d8, 0xe8d8b8, 0xb85a4a, 0x6aa86a][kind];
      if (kind < 2) { g.fillStyle(col, 1); g.fillRect(gx, sy - 9, 6, 9); g.fillStyle(lit(col, 0.5), 1); g.fillRect(gx + 1, sy - 8, 1.5, 6); }
      else if (kind < 4) { g.fillStyle(col, 1); g.fillCircle(gx + 3, sy - 4, 3.5); }
      else { g.fillStyle(col, 1); g.fillTriangle(gx, sy, gx + 6, sy, gx + 3, sy - 8); }
    }
  }
  g.fillStyle(0x5a3a24, 1); g.fillRect(x0 + 10, y - 30, w * 0.55, 20);
  g.fillStyle(0x7a5434, 1); g.fillRect(x0 + 10, y - 32, w * 0.55, 4);
  // The leaded glass front over all of it.
  g.fillStyle(GLASS, 0.32); g.fillRect(x0, top, w, h - 8);
  g.lineStyle(1.5, 0x5a5a64, 1);
  for (let gx = x0; gx <= x0 + w; gx += 18) g.lineBetween(gx, top, gx, y - 8);
  for (let gy = top; gy <= y - 8; gy += 16) g.lineBetween(x0, gy, x0 + w, gy);
  // Glare streaks.
  for (let k = 0; k < 4; k++) {
    const sx = x0 + 10 + rng() * (w - 40);
    poly(g, [[sx, top + 4], [sx + 14, top + 4], [sx + 4, y - 12], [sx - 10, y - 12]], GLASS_LIT, 0.22);
  }
  // Door, bell, fascia.
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x + w * 0.22 - 12, y - 44, 24, 36);
  g.fillStyle(GLASS, 0.55); g.fillRect(x + w * 0.22 - 10, y - 42, 20, 34);
  g.fillStyle(BRASS, 1); g.fillCircle(x + w * 0.22, y - 50, 4); g.fillTriangle(x + w * 0.22 - 4, y - 48, x + w * 0.22 + 4, y - 48, x + w * 0.22, y - 54);
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x0 - 6, top - 16, w + 12, 16);
  g.fillStyle(GOLD, 1); g.fillRect(x0 - 6, top - 18, w + 12, 12);
  for (let k = 0; k < 16; k++) { if (k === 5 || k === 11) continue; g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 64 + k * 8, top - 15, 5, 6); }
  g.fillStyle(MARBLE, 1); g.fillRect(x0 - 8, top - 22, w + 16, 4);
}

/**
 * The bare frame of an awning — iron poles and spars with no canvas on them. Awnings were made illegal
 * the year the noon began; every shop on Solmara still has the frame bolted to its front.
 */
export function bareAwning(g: G, x: number, y: number, w: number, frontH: number, wallH: number): void {
  const x0 = x - w / 2;
  g.lineStyle(2, IRON, 1);
  g.lineBetween(x0, y, x0, y - frontH); g.lineBetween(x0 + w, y, x0 + w, y - frontH);
  g.lineBetween(x0, y - frontH, x0 + w, y - frontH);
  g.lineBetween(x0, y - frontH, x0 + 10, y - wallH); g.lineBetween(x0 + w, y - frontH, x0 + w - 10, y - wallH);
  for (let k = 1; k < 5; k++) g.lineBetween(x0 + (w * k) / 5, y - frontH, x0 + 10 + ((w - 20) * k) / 5, y - wallH);
  // Torn grommets where the canvas was cut off.
  g.fillStyle(BRASS, 1); for (let k = 0; k <= 5; k++) g.fillCircle(x0 + (w * k) / 5, y - frontH, 1.6);
  g.fillStyle(SAIL, 0.9); g.fillTriangle(x0 + w * 0.4, y - frontH, x0 + w * 0.4 + 6, y - frontH, x0 + w * 0.4 + 2, y - frontH + 7);
}

/**
 * A statue of Auriel on a plinth: robed, arms raised, and where the head should be a gilt sunburst.
 * `s` scales it.
 */
export function aurielStatue(g: G, x: number, y: number, s: number): void {
  noonShadow(g, x, y, 44 * s);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 22 * s, y - 26 * s, 44 * s, 26 * s);
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x - 20 * s, y - 28 * s, 40 * s, 24 * s);
  g.fillStyle(MARBLE, 1); g.fillRect(x - 24 * s, y - 30 * s, 48 * s, 4 * s);
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 10 * s, y - 18 * s, 20 * s, 5 * s);
  // Robe: a tall white cone with folds.
  poly(g, [[x - 18 * s, y - 30 * s], [x - 7 * s, y - 100 * s], [x + 7 * s, y - 100 * s], [x + 18 * s, y - 30 * s]], MARBLE_SHADE);
  poly(g, [[x - 15 * s, y - 30 * s], [x - 6 * s, y - 100 * s], [x + 2 * s, y - 100 * s], [x + 3 * s, y - 30 * s]], MARBLE);
  g.lineStyle(1, MARBLE_DARK, 0.6); for (let k = -2; k <= 2; k++) g.lineBetween(x + k * 4 * s, y - 92 * s, x + k * 6 * s, y - 32 * s);
  // Arms up in a V, palms open to the sun.
  g.lineStyle(6 * s, MARBLE_SHADE, 1); g.lineBetween(x - 6 * s, y - 94 * s, x - 22 * s, y - 128 * s); g.lineBetween(x + 6 * s, y - 94 * s, x + 22 * s, y - 128 * s);
  g.lineStyle(4 * s, MARBLE, 1); g.lineBetween(x - 6 * s, y - 95 * s, x - 21 * s, y - 127 * s); g.lineBetween(x + 6 * s, y - 95 * s, x + 21 * s, y - 127 * s);
  g.fillStyle(MARBLE, 1); g.fillCircle(x - 23 * s, y - 131 * s, 3.5 * s); g.fillCircle(x + 23 * s, y - 131 * s, 3.5 * s);
  // The sunburst head.
  sunburst(g, x, y - 112 * s, 9 * s, GOLD, 1);
  g.fillStyle(0xffffff, 0.95); g.fillCircle(x - 3 * s, y - 115 * s, 2 * s);
}

/**
 * A sundial on a drum plinth whose gnomon's shadow has been a dot at its foot for twenty-two years.
 * Someone has chalked the hours on it anyway.
 */
export function sundial(g: G, x: number, y: number): void {
  noonShadow(g, x, y, 40);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 14, y - 26, 28, 26);
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x - 12, y - 28, 24, 26);
  g.fillStyle(MARBLE, 1); g.fillEllipse(x, y - 30, 46, 16);
  g.fillStyle(BRASS, 1); g.fillEllipse(x, y - 31, 40, 12);
  g.fillStyle(BRASS_DARK, 1);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.fillRect(x + Math.cos(a) * 16 - 0.5, y - 31 + Math.sin(a) * 5 - 0.5, 1.5, 1.5); }
  g.fillStyle(BRASS_DARK, 1); g.fillTriangle(x - 1, y - 31, x + 1, y - 31, x, y - 46);
  // The shadow: a dot, exactly under the tip.
  g.fillStyle(0x000000, 0.45); g.fillCircle(x, y - 31, 1.6);
}

/**
 * The boatwright's slip: a ramp of bleached planks down to the water, a hull on its stocks with its
 * ribs half-planked, a sawhorse and a coil of rope. Hulls on Solmara are painted white to keep them
 * from splitting in the sun; the strakes still crack.
 */
export function boatSlip(g: G, x: number, y: number, rng: () => number): void {
  noonShadow(g, x, y, 170);
  // The stocks.
  for (const sx of [x - 60, x - 10, x + 40]) { g.fillStyle(WOOD_DARK, 1); g.fillRect(sx, y - 18, 10, 18); }
  // The hull: a long boat seen side-on, half planked; the forward ribs bare.
  poly(g, [[x - 84, y - 26], [x + 70, y - 26], [x + 92, y - 62], [x - 96, y - 58]], 0xe8e4d8);
  g.lineStyle(1, 0xb8b0a0, 1); for (let k = 0; k < 4; k++) g.lineBetween(x - 88 + k * 2, y - 34 - k * 7, x + 76 + k * 4, y - 34 - k * 7);
  for (let k = 0; k < 7; k++) { g.lineStyle(1, 0xa8a090, 0.7); const cx = x - 70 + rng() * 140; g.lineBetween(cx, y - 30 - rng() * 20, cx + 6, y - 32 - rng() * 20); }
  g.fillStyle(0x8a6a4a, 1); g.fillRect(x - 84, y - 30, 154, 4);
  // Bare ribs at the bow.
  for (let k = 0; k < 4; k++) {
    const rx = x + 40 + k * 12;
    g.lineStyle(3, WOOD, 1);
    g.beginPath(); g.arc(rx, y - 44, 18 - k * 1.5, Math.PI * 0.55, Math.PI * 1.45, true); g.strokePath();
  }
  g.lineStyle(3, WOOD_DARK, 1); g.lineBetween(x + 92, y - 62, x + 100, y - 80);
  // Sawhorse, plank, rope coil.
  g.lineStyle(2, WOOD_DARK, 1); g.lineBetween(x - 120, y, x - 110, y - 22); g.lineBetween(x - 100, y, x - 110, y - 22);
  g.fillStyle(WOOD, 1); g.fillRect(x - 128, y - 24, 40, 4);
  g.lineStyle(2, ROPE, 1); for (let k = 0; k < 4; k++) g.strokeEllipse(x + 110, y - 4 - k * 2, 22 - k * 3, 7 - k);
}

/**
 * Halloran's tackle stall: a little white kiosk with rods racked up its side, a bare awning frame, lenses
 * and prisms hanging in the window throwing rainbows, and a bucket of bait.
 */
export function tackleKiosk(g: G, x: number, y: number): void {
  noonShadow(g, x, y, 110);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 50, y - 8, 100, 8);
  g.fillStyle(MARBLE, 1); g.fillRect(x - 46, y - 72, 92, 64);
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x - 46, y - 72, 92, 4);
  // Counter window with prisms hanging in it.
  g.fillStyle(GLASS_DARK, 1); g.fillRect(x - 36, y - 62, 50, 30);
  for (let k = 0; k < 4; k++) {
    const px = x - 30 + k * 12;
    g.lineStyle(0.8, IRON, 1); g.lineBetween(px, y - 62, px, y - 52 - (k % 2) * 4);
    poly(g, [[px - 4, y - 46 - (k % 2) * 4], [px, y - 54 - (k % 2) * 4], [px + 4, y - 46 - (k % 2) * 4]], GLASS_LIT, 0.95);
  }
  // A smear of rainbow on the counter.
  for (let k = 0; k < 5; k++) { g.fillStyle([0xff6a6a, 0xffc04a, 0xe8f06a, 0x6ad89a, 0x6aa0ff][k], 0.55); g.fillRect(x - 32 + k * 4, y - 34, 4, 4); }
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 38, y - 32, 54, 4);
  // Racked rods up the right side.
  for (let k = 0; k < 5; k++) {
    const rx = x + 22 + k * 5;
    g.lineStyle(1.5, [WOOD_DARK, IRON, 0xe8e8f0, WOOD, GLASS][k], 1); g.lineBetween(rx, y - 10, rx + 2, y - 110 + k * 4);
  }
  g.lineStyle(1, 0xffffff, 0.6); g.lineBetween(x + 44, y - 106, x + 30, y - 70);
  bareAwning(g, x - 10, y - 60, 70, 4, 18);
  // Bait bucket.
  g.fillStyle(0x7a8a90, 1); g.fillRect(x - 48, y - 14, 14, 12);
  g.fillStyle(0xc8d8e0, 1); g.fillEllipse(x - 41, y - 14, 14, 4);
}

/** A mirror-buoy: a gilt float with a tilting round mirror on a mast, flashing in the sun. `t` seconds. */
export function mirrorBuoy(g: G, x: number, y: number, t: number, seed: number): void {
  const bob = Math.sin(t * 1.6 + seed) * 2;
  const tilt = Math.sin(t * 0.9 + seed * 1.7);
  g.fillStyle(SEA_DEEP, 0.45); g.fillEllipse(x, y + 4, 26, 7);
  g.fillStyle(GOLD_DARK, 1); g.fillEllipse(x, y + bob, 18, 10);
  g.fillStyle(GOLD, 1); g.fillEllipse(x, y - 2 + bob, 16, 7);
  g.fillStyle(IRON, 1); g.fillRect(x - 1, y - 24 + bob, 2, 22);
  const mw = 8 * Math.abs(tilt) + 2;
  g.fillStyle(GOLD_DARK, 1); g.fillEllipse(x, y - 28 + bob, mw + 3, 13);
  g.fillStyle(GLASS_LIT, 1); g.fillEllipse(x, y - 28 + bob, mw, 11);
  const flash = Math.max(0, Math.sin(t * 2.3 + seed * 3.1));
  if (flash > 0.93) {
    const a = (flash - 0.93) / 0.07;
    g.fillStyle(0xffffff, 0.25 * a); g.fillCircle(x, y - 28 + bob, 26);
    g.fillStyle(0xffffff, 0.9 * a); g.fillCircle(x, y - 28 + bob, 6);
    g.lineStyle(1.5, 0xffffff, 0.7 * a);
    g.lineBetween(x - 22, y - 28 + bob, x + 22, y - 28 + bob); g.lineBetween(x, y - 48 + bob, x, y - 8 + bob);
  }
}

/**
 * A Clear walking: a person you can see through, the outline faintly blue and the quay showing through
 * the middle, and — the thing everyone looks for — no shadow at all under their feet. `p` 0..1 stride.
 */
export function clearFigure(g: G, x: number, y: number, p: number, a: number): void {
  const step = Math.sin(p * Math.PI * 2) * 3;
  g.lineStyle(1.2, 0xbfe4f4, 0.55 * a);
  g.fillStyle(CLEAR, 0.16 * a);
  g.fillEllipse(x, y - 16, 16, 22); g.strokeEllipse(x, y - 16, 16, 22);
  g.fillCircle(x, y - 32, 6.5); g.strokeCircle(x, y - 32, 6.5);
  g.lineBetween(x - 3, y - 6, x - 3 + step, y); g.lineBetween(x + 3, y - 6, x + 3 - step, y);
  g.fillStyle(0xffffff, 0.35 * a); g.fillCircle(x - 2, y - 34, 1.2); g.fillCircle(x + 2, y - 34, 1.2);
}

/** Heat shimmer over hot stone: wavering pale bands, only inside `view`. */
export function heatShimmer(g: G, view: Rect, t: number, region: Rect): void {
  const x0 = Math.max(view.x, region.x), x1 = Math.min(view.x + view.w, region.x + region.w);
  const y0 = Math.max(view.y, region.y), y1 = Math.min(view.y + view.h, region.y + region.h);
  if (x1 <= x0 || y1 <= y0) return;
  for (let yy = y0 - (y0 % 46); yy < y1; yy += 46) {
    const wob = Math.sin(t * 2.2 + yy * 0.05) * 18;
    g.fillStyle(0xffffff, 0.035 + 0.02 * Math.sin(t * 3 + yy));
    g.fillEllipse((x0 + x1) / 2 + wob, yy, x1 - x0, 6);
  }
}
