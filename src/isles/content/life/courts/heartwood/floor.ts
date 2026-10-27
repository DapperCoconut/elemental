import type { ArenaFloor } from '../../../../IslesTypes';
import { glow, mixC } from '../../../../art/IsleArt';
import { HW, barkCurl, birchEye, leaf, lenticel, sapLantern, spile } from './palette';

/**
 * The Heartwood Court's fighting floor: a stretch of the trunk itself, between two terraces.
 * Silver birch bark under your feet, barred with lenticels and peeling in curls; a boardwalk
 * ledge across the bottom with its rope rail and two sap lanterns; across the top wall a great
 * birch eye, half open, watching; down the right edge the trunk's flank curving away into the
 * air, where mist hangs over the lesser forest far below. Leaves drift in at the edges. The
 * five gimmicks paint their rules over the middle, so it is kept pale and quiet.
 */
export const heartwoodFloor: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  // The air past the trunk's flank, right edge.
  g.fillStyle(HW.mist, 1); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 18; i++) {
    const y = top + rng() * (H - top);
    g.fillStyle(mixC(HW.canopyGold, HW.mist, 0.5), 1); g.fillCircle(W - 18 + rng() * 30, y, 10 + rng() * 14);
  }
  // The bark: base, then the cylinder's shading toward the right where it turns away.
  const edge = W - 52;
  g.fillStyle(HW.barkDark, 1); g.fillRect(0, 0, edge + 8, H);
  g.fillStyle(HW.barkShade, 1); g.fillRect(0, 0, edge, H);
  g.fillStyle(HW.barkMid, 1); g.fillRect(0, 0, edge - 40, H);
  g.fillStyle(HW.bark, 1); g.fillRect(0, 0, edge - 120, H);
  g.fillStyle(HW.barkLit, 0.5); g.fillRect(90, 0, 320, H);
  // Pale washes, lenticels in their rows, peeling curls.
  for (let i = 0; i < 40; i++) {
    g.fillStyle(rng() < 0.5 ? HW.barkMid : HW.barkLit, 0.25 + rng() * 0.25);
    g.fillEllipse(rng() * edge, top + rng() * (H - top), 80 + rng() * 160, 10 + rng() * 14);
  }
  for (let row = top + 14; row < H; row += 26 + rng() * 14) {
    for (let x = rng() * 60; x < edge - 10; x += 40 + rng() * 90) lenticel(g, x, row + (rng() - 0.5) * 6, 10 + rng() * 26, 0.45 + rng() * 0.4);
  }
  for (let i = 0; i < 24; i++) barkCurl(g, rng() * (edge - 20), top + 20 + rng() * (H - top - 40), 6 + rng() * 8, rng);
  // Lichen rosettes.
  for (let i = 0; i < 14; i++) {
    const x = rng() * edge, y = top + rng() * (H - top);
    g.fillStyle(HW.lichen, 0.3); g.fillCircle(x, y, 6 + rng() * 10);
    g.fillStyle(mixC(HW.lichen, 0xffffff, 0.3), 0.3); g.fillCircle(x - 2, y - 2, 3 + rng() * 4);
  }
  // The eye across the top wall: the tree watches every fight on it.
  birchEye(g, W / 2 - 40, top + 24, 170, 0.45, 1);
  glow(g, W / 2 - 40, top + 24, 40, HW.amber, 0.03, 3);
  // A storm-old knot low on the left, its heartwood showing, a spile driven beside it.
  g.fillStyle(HW.barkDark, 1); g.fillEllipse(70, H - 170, 70, 52);
  g.fillStyle(HW.heartDeep, 1); g.fillEllipse(70, H - 170, 56, 40);
  g.fillStyle(HW.heart, 1); g.fillEllipse(72, H - 168, 40, 28);
  for (let r = 4; r < 18; r += 5) { g.lineStyle(1, HW.heartLit, 0.6); g.strokeEllipse(72, H - 168, r * 2, r * 1.4); }
  spile(g, 116, H - 128, 12, 0.7);
  // The ledge across the bottom: planks, a rope rail, two sap lanterns on crooks.
  const ly = H - 34;
  for (let x = 0; x < edge; x += 15) {
    g.fillStyle(HW.plankDark, 1); g.fillRect(x, ly - 4, 14, 42);
    g.fillStyle(mixC(HW.plank, rng() < 0.5 ? HW.plankLit : HW.plankDark, rng() * 0.5), 1); g.fillRect(x + 1, ly - 3, 12, 40);
  }
  g.lineStyle(2.5, HW.rope, 1);
  g.beginPath(); g.moveTo(0, ly - 10);
  for (let x = 0; x <= edge; x += 20) g.lineTo(x, ly - 10 + Math.sin((x / 120) * Math.PI) * 5);
  g.strokePath();
  for (let x = 30; x < edge; x += 120) { g.fillStyle(HW.plankDark, 1); g.fillRect(x - 3, ly - 22, 6, 24); }
  for (const lx of [210, W - 280]) {
    g.lineStyle(4, HW.barkShade, 1);
    g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx, ly - 70); g.lineTo(lx + 18, ly - 80); g.strokePath();
    sapLantern(g, lx + 18, ly - 80, 12);
    glow(g, lx + 18, ly - 64, 70, HW.amber, 0.035, 4);
  }
  // Leaves blown in against the edges and lying in the corners.
  for (let i = 0; i < 160; i++) {
    const side = rng();
    const x = side < 0.35 ? rng() * 90 : side < 0.7 ? edge - 90 + rng() * 90 : rng() * edge;
    const y = side < 0.7 ? top + rng() * (H - top) : (rng() < 0.5 ? top + rng() * 40 : H - 70 + rng() * 30);
    const c = [HW.leafGold, HW.leafButter, HW.leafRust, HW.leafRed, HW.leafGreen][Math.floor(rng() * 5)];
    leaf(g, x, y, rng() * Math.PI * 2, 7 + rng() * 6, c, 0.7 + rng() * 0.3);
  }
  // The flank's edge: a dark lip where the bark turns away, and mist breathing up past it.
  g.fillStyle(HW.mark, 0.35); g.fillRect(edge - 2, top, 4, H - top);
  for (let i = 0; i < 8; i++) { g.fillStyle(HW.mist, 0.4); g.fillEllipse(W - 10, top + 40 + i * 70, 70, 26); }
};
