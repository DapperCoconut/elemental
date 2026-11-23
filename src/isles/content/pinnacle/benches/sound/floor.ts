import type { ArenaFloor } from '../../../../IslesTypes';
import { glassFloor } from '../../../../art/PinnacleArt';
import { OBS, PAPER, VOICE, VOICE_LIT, councilMask, houseSeat, hymnSheet, note, organPipe, ribbon, seam, voiceJar } from './art';

/**
 * The fighting floor of the Choir Bench: the stage of the empty amphitheatre. Across the top (half
 * under the HUD) the Voice Vault's lowest shelves, jars humming; down each side a slice of the
 * empty house, seats rising into the dark, and a glass organ pipe at each corner; underfoot the
 * polished apron with a great stave inlaid in a ring round the middle and the same note written
 * on it all the way round. The middle is left open — the decrees bring their own.
 */
export const CHOIR_FLOOR: ArenaFloor = (g, W, H, rng) => {
  glassFloor(g, 0, 0, W, H, 48, rng);
  // A long polish across the apron, and a darker rim toward the edges.
  g.fillStyle(OBS.sheen, 0.1); g.fillEllipse(W * 0.42, H * 0.58, W * 0.7, H * 0.32);
  g.fillStyle(0x000000, 0.25); g.fillRect(0, H - 24, W, 24);
  // The great stave ring, the Part on it.
  const cx = W / 2, cy = (96 + H) / 2 + 10;
  for (let i = 0; i < 5; i++) { g.lineStyle(1.2, VOICE, 0.16); g.strokeEllipse(cx, cy, 520 + i * 14, 300 + i * 9); }
  for (let k = 0; k < 22; k++) {
    const a = (k / 22) * Math.PI * 2;
    note(g, cx + Math.cos(a) * 267, cy + Math.sin(a) * 154 + 4, 3.4, VOICE, 0.32);
  }
  // A tuning reed inlaid in the middle: the brass tongue every child of Choirholm was pinned with.
  g.lineStyle(2, VOICE, 0.22); g.strokeRect(cx - 9, cy - 36, 18, 72);
  g.lineStyle(1, VOICE_LIT, 0.25); g.lineBetween(cx, cy - 28, cx, cy + 22);
  g.fillStyle(VOICE, 0.18); g.fillCircle(cx, cy + 30, 4);
  // The Vault along the top: two shelves of jars and the boards under them.
  g.fillStyle(0x05040a, 1); g.fillRect(0, 0, W, 104);
  for (const sy of [48, 100]) {
    let x = 6;
    while (x < W - 6) {
      const s = 14 + rng() * 9;
      voiceJar(g, x + s * 0.31, sy, s, { glow: 0.35 + rng() * 0.5, label: s > 17 });
      x += s * 0.62 + 2 + rng() * 3;
    }
    g.fillStyle(OBS.facet, 1); g.fillRect(0, sy, W, 4);
    g.fillStyle(OBS.sheen, 1); g.fillRect(0, sy, W, 1.2);
  }
  g.lineStyle(1.4, OBS.edge, 0.5); g.lineBetween(0, 104, W, 104);
  // The empty house down both sides: three seats a row, rows stepping down toward the stage.
  for (const side of [0, 1]) {
    const x0 = side ? W - 58 : 0;
    g.fillStyle(OBS.glass, 1); g.fillRect(x0, 104, 58, H - 104);
    g.lineStyle(1.4, OBS.edge, 0.45); g.lineBetween(side ? x0 : 58, 104, side ? x0 : 58, H);
    for (let y = 150; y < H - 20; y += 46) {
      g.fillStyle(OBS.facet, 1); g.fillRect(x0, y, 58, 3);
      houseSeat(g, x0 + 16, y, 0.6);
      houseSeat(g, x0 + 36, y, 0.6);
      const r = rng();
      if (r < 0.2) voiceJar(g, x0 + 36, y - 8, 9, { glow: 0.8, label: false });
      else if (r < 0.32) ribbon(g, x0 + 16, y - 10, 4, 0.9);
    }
  }
  // A glass organ pipe at each lower corner, and a rank of short ones at the top corners.
  organPipe(g, 30, H - 6, 18, 170, 0.6);
  organPipe(g, W - 30, H - 6, 18, 190, 0.4);
  for (let i = 0; i < 3; i++) { organPipe(g, 20 + i * 16, 150, 11, 54 - i * 9, 0.5); organPipe(g, W - 20 - i * 16, 150, 11, 54 - i * 9, 0.5); }
  // Dropped things: hymn sheets, a ribbon, cracks with violet in them.
  for (let i = 0; i < 9; i++) hymnSheet(g, 90 + rng() * (W - 180), 140 + rng() * (H - 200), 6, rng() * 6.28, 0.55);
  ribbon(g, 120 + rng() * 120, H - 60, 6, 0.8, 2);
  for (let i = 0; i < 4; i++) {
    const x = 100 + rng() * (W - 200), y = 160 + rng() * (H - 240);
    seam(g, [{ x, y }, { x: x + 20, y: y + 14 }, { x: x + 12, y: y + 34 }, { x: x + 34, y: y + 46 }], 1, 0.5);
  }
  // A mask watching from the house on each side — the bench is in session.
  councilMask(g, 29, 120, 9, { glow: 0.6 });
  councilMask(g, W - 29, 120, 9, { glow: 0.6 });
  g.fillStyle(PAPER, 0.12); g.fillRect(cx - 220, H - 18, 440, 2);
};
