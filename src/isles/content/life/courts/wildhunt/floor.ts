import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit, mixC } from '../../../../art/IsleArt';
import {
  ANTLER, BARK, BARK_DARK, BARK_LIT, GRASS, GRASS_LIT, HUNT_RED, LEAF_GOLD, LOAM, LOAM_LIT, MOSS, MOSS_DARK,
  MOSS_LIT, SUN, antlerPair, fernClump, gardenersMark, hoofprint, leafLitter, logEnd, pawprint,
} from './util';

/**
 * The Wildhunt's fight floor — a glade in the Empress's chase. A clearing of deer-park turf,
 * cropped short by the herd, ringed by the black boles of the old forest along the top and
 * bottom rails, where the grass gives way to loam, moss and fern. A muddy ride crosses it
 * corner to corner, churned with hoof- and pawprints where the hunt went through. A felled oak
 * lies along the top rail with its end-grain showing; a mossy salt-lick stone, a tally-stump
 * notched with kills and an antlered marker pole stand at the edges; and the Gardener's mark is
 * cut faintly into the turf where the Empress's tithe-wardens stand to count the quarry in. The
 * middle is left open so every gimmick's art reads on top of it.
 */
export const WILDHUNT_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  g.fillStyle(MOSS_DARK, 1); g.fillRect(0, 0, W, H);

  // Turf: base fill with mown stripes and clover patches.
  g.fillStyle(GRASS, 1); g.fillRect(0, top, W, H - top);
  for (let y = top; y < H; y += 46) { g.fillStyle(lit(GRASS, 0.06), 0.5); g.fillRect(0, y, W, 22); }
  for (let i = 0; i < 70; i++) {
    g.fillStyle(rng() < 0.5 ? GRASS_LIT : dim(GRASS, 0.2), 0.18 + rng() * 0.2);
    g.fillEllipse(rng() * W, top + rng() * (H - top), 30 + rng() * 90, 10 + rng() * 26);
  }
  for (let i = 0; i < 900; i++) {
    g.fillStyle(rng() < 0.6 ? GRASS_LIT : 0x3a5a22, 0.35);
    const x = rng() * W, y = top + rng() * (H - top);
    g.lineBetween(x, y, x + (rng() - 0.5) * 3, y - 3 - rng() * 3);
    g.fillRect(x, y, 1, 1);
  }

  // The ride: a muddy track corner to corner, churned with tracks.
  const ride = (t: number): { x: number; y: number } => ({ x: -40 + t * (W + 80), y: H - 60 - t * (H - top - 120) + Math.sin(t * Math.PI * 2) * 30 });
  for (let i = 0; i <= 60; i++) {
    const p = ride(i / 60);
    g.fillStyle(LOAM, 0.55); g.fillEllipse(p.x, p.y, 92, 46);
  }
  for (let i = 0; i <= 60; i++) {
    const p = ride(i / 60);
    g.fillStyle(LOAM_LIT, 0.35); g.fillEllipse(p.x + (rng() - 0.5) * 30, p.y + (rng() - 0.5) * 16, 30, 10);
  }
  for (let i = 0; i < 46; i++) {
    const t = rng(), p = ride(t), q = ride(Math.min(1, t + 0.01));
    const a = Math.atan2(q.y - p.y, q.x - p.x) + (rng() < 0.5 ? 0 : Math.PI);
    const ox = (rng() - 0.5) * 50, oy = (rng() - 0.5) * 22;
    if (rng() < 0.55) hoofprint(g, p.x + ox, p.y + oy, a, 7, 0x1a140c, 0.55);
    else pawprint(g, p.x + ox, p.y + oy, a, 6, 0x1a140c, 0.5);
  }

  // The Gardener's mark cut in the turf, where the tithe-wardens count the quarry in.
  gardenersMark(g, W / 2, (top + H) / 2 + 10, 46, 0x2e4a1a, 0.4);
  g.lineStyle(2, 0x2e4a1a, 0.28); g.strokeEllipse(W / 2, (top + H) / 2 + 10, 230, 150);

  // Forest edge along the top and bottom rails: loam, moss, fern and the bases of black boles.
  const edge = (y0: number, h: number, down: boolean): void => {
    g.fillStyle(LOAM, 1); g.fillRect(0, y0, W, h);
    for (let x = 0; x < W; x += 22) {
      const jag = 6 + noiseAt(x) * 14;
      g.fillStyle(LOAM, 1); g.fillEllipse(x, down ? y0 + h : y0, 28, jag * 2);
    }
    for (let i = 0; i < 26; i++) { g.fillStyle(rng() < 0.5 ? MOSS : MOSS_LIT, 0.6); g.fillEllipse(rng() * W, y0 + rng() * h, 20 + rng() * 40, 6 + rng() * 8); }
    leafLitter(g, { x: 0, y: y0, w: W, h }, rng, 140, 0.8);
  };
  edge(top, 40, true);
  edge(H - 36, 36, false);
  for (let x = 30; x < W; x += 110 + rng() * 60) fernClump(g, x, top + 46 + rng() * 6, 18 + rng() * 6, rng);
  for (let x = 60; x < W; x += 120 + rng() * 60) fernClump(g, x, H - 34 - rng() * 4, 16 + rng() * 6, rng);

  // Tree boles cut by the frame: the trunks rise off the top, roots splay into the glade.
  const bole = (x: number, y: number, r: number, up: boolean): void => {
    g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 6, y + (up ? 10 : -6), r * 3, r * 0.9);
    // Buttress roots splaying out into the glade.
    g.fillStyle(BARK_DARK, 1);
    for (let k = 0; k < 4; k++) {
      const spread = (k - 1.5) * r * 1.1;
      g.fillTriangle(x - r * 0.5, y, x + r * 0.5, y, x + spread, y + (up ? r * 0.6 : -r * 0.6));
    }
    g.fillStyle(BARK_DARK, 1); g.fillRect(x - r - 2, up ? 0 : y, r * 2 + 4, up ? y : H - y);
    g.fillStyle(BARK, 1); g.fillRect(x - r, up ? 0 : y, r * 2, up ? y : H - y);
    g.fillStyle(BARK_LIT, 0.7); g.fillRect(x - r + 3, up ? 0 : y, r * 0.4, up ? y : H - y);
    for (let k = 0; k < 4; k++) { const fx = x - r + 4 + rng() * (r * 2 - 8); g.lineStyle(1.4, BARK_DARK, 0.8); g.lineBetween(fx, up ? 0 : y, fx, up ? y : H); }
    g.fillStyle(MOSS, 0.7); g.fillEllipse(x - r * 0.5, y + (up ? -6 : 4), r * 1.2, 6);
  };
  bole(70, top + 30, 22, true); bole(W - 110, top + 26, 26, true);
  bole(160, H - 26, 20, false); bole(W - 60, H - 30, 24, false);

  // A felled oak lying along the top rail, its cut end facing the glade.
  const lx0 = W * 0.36, lx1 = W * 0.64, ly = top + 30;
  g.fillStyle(0x000000, 0.3); g.fillRect(lx0, ly + 10, lx1 - lx0, 8);
  g.fillStyle(BARK_DARK, 1); g.fillRoundedRect(lx0, ly - 14, lx1 - lx0, 28, 12);
  g.fillStyle(BARK, 1); g.fillRoundedRect(lx0 + 2, ly - 12, lx1 - lx0 - 4, 22, 10);
  g.fillStyle(BARK_LIT, 0.6); g.fillRect(lx0 + 8, ly - 9, lx1 - lx0 - 20, 3);
  for (let i = 0; i < 9; i++) { g.fillStyle(MOSS_LIT, 0.7); g.fillEllipse(lx0 + 20 + rng() * (lx1 - lx0 - 40), ly - 12, 14 + rng() * 14, 5); }
  logEnd(g, lx1, ly - 1, 14);
  // An axe left in it.
  g.lineStyle(3, 0x6a4a2a, 1); g.lineBetween(lx0 + 60, ly - 12, lx0 + 46, ly - 34);
  g.fillStyle(0x8a8e90, 1); g.fillTriangle(lx0 + 56, ly - 12, lx0 + 70, ly - 18, lx0 + 64, ly - 6);

  // Salt-lick stone, lower left; tally-stump, lower right; antlered marker pole, upper left.
  g.fillStyle(0x000000, 0.3); g.fillEllipse(W * 0.12, H - 82, 50, 14);
  g.fillStyle(0x9a948a, 1); g.fillEllipse(W * 0.12, H - 92, 44, 24);
  g.fillStyle(0xd8d2c8, 0.8); g.fillEllipse(W * 0.12 - 4, H - 98, 22, 8);
  g.fillStyle(MOSS, 0.8); g.fillEllipse(W * 0.12 + 10, H - 84, 18, 6);
  const sx = W * 0.88, sy = H - 80;
  g.fillStyle(0x000000, 0.3); g.fillEllipse(sx, sy + 6, 46, 12);
  g.fillStyle(BARK_DARK, 1); g.fillRect(sx - 18, sy - 22, 36, 26);
  g.fillStyle(BARK, 1); g.fillRect(sx - 16, sy - 22, 32, 24);
  logEnd(g, sx, sy - 22, 16);
  for (let k = 0; k < 9; k++) { g.lineStyle(1.4, HUNT_RED, 0.85); g.lineBetween(sx - 13 + k * 3, sy - 14, sx - 13 + k * 3, sy - 2); }
  g.lineStyle(1.4, HUNT_RED, 0.85); g.lineBetween(sx - 14, sy - 6, sx + 14, sy - 10);
  const px = 46, py = top + 120;
  g.fillStyle(0x000000, 0.3); g.fillEllipse(px, py + 2, 18, 6);
  g.fillStyle(0x5a4028, 1); g.fillRect(px - 2.5, py - 64, 5, 64);
  antlerPair(g, px, py - 66, 18, ANTLER, 1);
  g.fillStyle(HUNT_RED, 1); g.fillTriangle(px + 2, py - 50, px + 22, py - 46, px + 2, py - 38);

  // Dappled light from the canopy — warm pools on the turf.
  for (let i = 0; i < 9; i++) {
    const x = 80 + rng() * (W - 160), y = top + 70 + rng() * (H - top - 140);
    g.fillStyle(SUN, 0.05); g.fillEllipse(x, y, 90 + rng() * 80, 40 + rng() * 30);
  }
  // Leaves blown out onto the turf.
  leafLitter(g, { x: 0, y: top + 40, w: W, h: H - top - 80 }, rng, 70, 0.55);
  g.fillStyle(mixC(LEAF_GOLD, 0x000000, 0.5), 0.15); g.fillRect(0, top, W, 2);
};

/** Stable jag for the forest-edge outline. */
const noiseAt = (x: number): number => {
  const s = Math.sin(x * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};
