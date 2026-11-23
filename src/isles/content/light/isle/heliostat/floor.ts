import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, mixC } from '../../../../art/IsleArt';
import {
  BRASS, BRASS_DARK, GOLD, GOLD_DARK, GOLD_LIT, IRON, IRON_LIT, MIRROR, MIRROR_DARK, SCORCH, SKY,
  girder, mirrorPane, scorch, standingMirror, sunburst,
} from './art';

/**
 * The warden arena: a landing inside the Heliostat between two halls. A floor of thick glass
 * blocks set in an iron grid, the sea glittering white far below through them; a gilt sunburst
 * inlaid at the centre where the floor is solid brass; the back wall a gallery of standing mirrors
 * under a brass rail, each throwing a slant of sky; iron girders down both sides with mirror
 * panes riveted between them; and the scorch-rings of old burning spots everywhere, because in
 * the Heliostat something is always focusing on the floor.
 */
export const HELIOSTAT_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  g.fillStyle(0x10141c, 1); g.fillRect(0, 0, W, H);
  // Glass blocks, the glittering drop beneath.
  const S = 58;
  for (let y = top + 50; y < H + S; y += S) {
    for (let x = 0; x < W + S; x += S) {
      const k = rng();
      g.fillStyle(mixC(0x9ab8cc, 0xd8eaf4, k * 0.5), 1); g.fillRect(x + 3, y + 3, S - 6, S - 6);
      // The sea far below: white flecks under the glass.
      for (let i = 0; i < 4; i++) { g.fillStyle(0xffffff, 0.35 + rng() * 0.4); g.fillRect(x + 6 + rng() * (S - 16), y + 6 + rng() * (S - 14), 2 + rng() * 5, 1); }
      g.fillStyle(SKY, 0.45); g.fillTriangle(x + 3, y + 3, x + S * 0.6, y + 3, x + 3, y + S * 0.6);
      g.fillStyle(0xffffff, 0.5); g.fillRect(x + 6, y + 5, S - 14, 2);
      g.fillStyle(dim(0x9ab8cc, 0.3), 0.6); g.fillRect(x + 3, y + S - 6, S - 6, 3);
    }
  }
  // The iron grid that holds the blocks.
  g.lineStyle(6, IRON, 1);
  for (let x = 0; x <= W + S; x += S) g.lineBetween(x, top + 50, x, H);
  for (let y = top + 50; y <= H + S; y += S) g.lineBetween(0, y, W, y);
  g.lineStyle(2, IRON_LIT, 0.6);
  for (let x = 0; x <= W + S; x += S) g.lineBetween(x - 2, top + 50, x - 2, H);
  for (let x = 0; x <= W; x += S) for (let y = top + 50; y <= H; y += S) { g.fillStyle(BRASS, 1); g.fillCircle(x, y, 3.5); }

  // Old burns where spots have walked.
  for (let i = 0; i < 9; i++) scorch(g, 80 + rng() * (W - 160), top + 110 + rng() * (H - top - 160), 16 + rng() * 14, rng, 0.7);

  // The brass heart: a disc of solid metal with the Despot's seal.
  const cx = W / 2, cy = (top + H) / 2 + 20;
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(cx, cy, 104);
  g.fillStyle(BRASS, 1); g.fillCircle(cx, cy, 98);
  g.lineStyle(3, GOLD_LIT, 0.8); g.strokeCircle(cx, cy, 92);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    g.lineStyle(2, GOLD_DARK, 0.8); g.lineBetween(cx + Math.cos(a) * 84, cy + Math.sin(a) * 84, cx + Math.cos(a) * 92, cy + Math.sin(a) * 92);
  }
  sunburst(g, cx, cy, 76, GOLD, 1);
  // Graduations round it like a dial: hours that never pass.
  g.lineStyle(1, SCORCH, 0.5); g.strokeCircle(cx, cy, 116);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    g.fillStyle(i === 0 ? GOLD_LIT : GOLD_DARK, 1); g.fillCircle(cx + Math.cos(a) * 116, cy + Math.sin(a) * 116, i === 0 ? 6 : 3);
  }

  // The back wall: a gallery of standing mirrors under a rail.
  g.fillStyle(0x1a1a24, 1); g.fillRect(0, top, W, 54);
  for (let i = 0; i < 12; i++) {
    const x = 40 + i * ((W - 80) / 11);
    standingMirror(g, x, top + 52, 52, 44, Math.sin(i * 1.3) * 0.5, 0, rng);
  }
  g.lineStyle(6, BRASS_DARK, 1); g.lineBetween(0, top + 4, W, top + 4);
  g.lineStyle(2, GOLD_LIT, 0.9); g.lineBetween(0, top + 2, W, top + 2);

  // Side girders with mirror panes riveted between them.
  for (const x0 of [0, W - 36]) {
    girder(g, x0, top + 54, 36, H - top - 54);
    for (let y = top + 80; y < H - 50; y += 70) mirrorPane(g, x0 + 7, y, 22, 54, GOLD, 1);
  }

  // Slants of sky thrown off the back mirrors across the floor.
  for (let i = 0; i < 5; i++) {
    const x = 120 + i * 180 + rng() * 40;
    g.fillStyle(0xffffff, 0.06);
    g.fillTriangle(x, top + 56, x + 50, top + 56, x + 170, H);
    g.fillTriangle(x + 10, top + 56, x + 26, top + 56, x + 120, H);
  }
  // A few loose mirror shards glittering on the glass.
  for (let i = 0; i < 14; i++) {
    const x = 60 + rng() * (W - 120), y = top + 90 + rng() * (H - top - 120), s = 3 + rng() * 5;
    g.fillStyle(MIRROR_DARK, 1); g.fillTriangle(x, y, x + s, y + s * 0.4, x + s * 0.2, y + s);
    g.fillStyle(MIRROR, 1); g.fillTriangle(x + 0.5, y + 0.5, x + s * 0.8, y + s * 0.4, x + s * 0.3, y + s * 0.8);
  }
};
