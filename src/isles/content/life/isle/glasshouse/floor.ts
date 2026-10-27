import type Phaser from 'phaser';
import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit } from '../../../../art/IsleArt';
import { BRASS, ROSE, ROSE_PALE, VERDIGRIS, VERDIGRIS_DEEP, YEW, YEW_LIT, glassPane, graftedSubject, ironRib, rose, verdigraSigil } from './art';

/**
 * The warden arena: a glass-roofed antechamber of the Glasshouse. Octagonal tiles of green-glazed
 * clay laid on the diagonal, a mown border, the back wall a run of iron-framed panes with the
 * Heartwood's leaves pressed dark behind them, and along both sides a clipped yew hedge with
 * the pruned grafted into it at intervals — faces in the leaves, breathing. The Empress's sigil
 * is inlaid in brass at the centre, and the lattice shadow of the roof lies over everything.
 */
export const GLASSHOUSE_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  g.fillStyle(0x0a120e, 1); g.fillRect(0, 0, W, H);
  // Glazed tiles: octagons with little square keystones between them.
  const S = 52;
  for (let y = top; y < H + S; y += S) {
    for (let x = 0; x < W + S; x += S) {
      const c = rng() < 0.5 ? 0x2a5a48 : 0x245040;
      const cut = S * 0.29;
      g.fillStyle(c, 1);
      g.fillPoints([
        { x: x + cut, y }, { x: x + S - cut, y }, { x: x + S, y: y + cut }, { x: x + S, y: y + S - cut },
        { x: x + S - cut, y: y + S }, { x: x + cut, y: y + S }, { x, y: y + S - cut }, { x, y: y + cut },
      ] as Phaser.Types.Math.Vector2Like[], true, true);
      g.fillStyle(lit(c, 0.12), 0.5); g.fillRect(x + cut, y + 3, S - cut * 2, 3);
      g.fillStyle(0xd8c8a0, 0.85); g.fillRect(x - cut * 0.5, y - cut * 0.5, cut, cut);
      if (rng() < 0.12) { g.lineStyle(1, 0x0a1a14, 0.7); g.lineBetween(x + rng() * S, y + 6, x + rng() * S, y + S - 6); }
    }
  }
  // Earth spilled from pots, and a scatter of clippings.
  for (let i = 0; i < 40; i++) {
    g.fillStyle(rng() < 0.5 ? YEW_LIT : 0x3a2a1a, 0.4);
    g.fillEllipse(rng() * W, top + 50 + rng() * (H - top - 60), 6 + rng() * 10, 3 + rng() * 3);
  }
  // The back wall: panes and ribs, leaves pressed against the glass.
  for (let x = 0; x < W; x += 48) glassPane(g, x, top, 48, 46, 1, rng() < 0.1);
  for (let i = 0; i < 30; i++) {
    g.fillStyle(0x0e2a14, 0.6); g.fillEllipse(rng() * W, top + 6 + rng() * 34, 14 + rng() * 14, 7 + rng() * 6);
  }
  ironRib(g, 0, top + 46, W, top + 46, 6);
  // Side hedges with the pruned grafted into them.
  for (const x0 of [0, W - 40]) {
    g.fillStyle(dim(YEW, 0.35), 1); g.fillRect(x0, top + 46, 40, H - top - 46);
    g.fillStyle(YEW, 1); g.fillRect(x0 + 3, top + 46, 34, H - top - 46);
    for (let i = 0; i < 70; i++) {
      g.fillStyle(rng() < 0.5 ? YEW_LIT : dim(YEW, 0.15), 0.6);
      g.fillEllipse(x0 + 4 + rng() * 32, top + 50 + rng() * (H - top - 50), 5, 3);
    }
  }
  [0xd8b898, 0xb08a68, 0xc8a080, 0x9a7458].forEach((skin, i) => {
    graftedSubject(g, i % 2 ? W - 20 : 20, top + 190 + Math.floor(i / 2) * 210, 0.85, i * 1.7, skin, 0);
  });
  // Roses trained along the foot of the back wall.
  for (let x = 60; x < W - 40; x += 70) rose(g, x + rng() * 20, top + 58, 5 + rng() * 2, rng() < 0.6 ? ROSE : ROSE_PALE, 0.8);
  // The sigil in brass at the centre, a ring of rose-tiles round it.
  const cx = W / 2, cy = (top + H) / 2 + 16;
  g.fillStyle(0x0a1a14, 0.65); g.fillCircle(cx, cy, 98);
  g.lineStyle(4, BRASS, 0.7); g.strokeCircle(cx, cy, 92);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    rose(g, cx + Math.cos(a) * 92, cy + Math.sin(a) * 92, 4, k % 2 ? ROSE : ROSE_PALE, 0.6);
  }
  verdigraSigil(g, cx, cy, 66, VERDIGRIS_DEEP, 0.85);
  verdigraSigil(g, cx, cy, 62, VERDIGRIS, 0.25);
  // The roof's lattice shadow over everything.
  g.lineStyle(5, 0x000000, 0.08);
  for (let x = -200; x < W + 200; x += 110) g.lineBetween(x, top, x + 160, H);
  for (let y = top + 60; y < H; y += 120) g.lineBetween(0, y, W, y + 24);
};
