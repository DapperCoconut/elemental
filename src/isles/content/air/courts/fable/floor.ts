import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit } from '../../../../art/IsleArt';
import {
  CLOTH_BLUE, CLOTH_GREEN, CLOTH_PLUM, CLOTH_RED, CLOUD_SHADE, COBBLE, COBBLE_DARK, GILT, GILT_LIT, INK,
  INK_SOFT, MEADOW, MEADOW_DARK, MEADOW_LIT, PAGE, PARCH, PARCH_DARK, SKY, closedBook, cloudPuff, inkCircle,
  inkRect, inked, quill, scribble, storyLamp,
} from './util';

/**
 * The Fable Court's fight floor — a plate out of a picture book. The yard is painted as an
 * illustration on a page: a watercolour green inside a printed double-ruled frame with fleurons at
 * its corners, a cobbled lane wandering through it, and in the top margin the first lines of the
 * licensed tale being performed, under a gilt drop-cap. The bottom of the page is torn, and through
 * the tear there is nothing but sky and the cloud sea far below. In the corners: an inkwell and
 * quill, a stack of licensed editions, a lamp and a signpost that reads THIS WAY TO THE END. The
 * middle is left open so every gimmick's art reads on top of it.
 */
export const FABLE_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  g.fillStyle(PARCH, 1); g.fillRect(0, 0, W, H);
  // Paper grain.
  for (let i = 0; i < 700; i++) { g.fillStyle(rng() < 0.5 ? PARCH_DARK : lit(PARCH, 0.2), 0.2); g.fillRect(rng() * W, top + rng() * (H - top), 1 + rng() * 2, 1); }

  // The top margin: lines of the tale in handwriting and a gilt drop-cap.
  const mY = top + 8;
  inkRect(g, 26, mY, 40, 40, GILT, 1, 2);
  g.lineStyle(4, INK, 0.9); g.strokeCircle(46, mY + 20, 12);
  g.lineStyle(2, CLOTH_RED, 0.9); g.beginPath(); g.arc(46, mY + 20, 16, -0.4, Math.PI * 0.8, false); g.strokePath();
  scribble(g, 76, mY + 10, W - 110, 3, 11, INK_SOFT, 0.6, 31, 1.3);

  // The plate: watercolour meadow inside a double-ruled frame.
  const px = 22, py = top + 54, pw = W - 44, ph = H - py - 44;
  g.fillStyle(MEADOW, 1); g.fillRect(px, py, pw, ph);
  for (let i = 0; i < 60; i++) {
    g.fillStyle(rng() < 0.5 ? MEADOW_LIT : MEADOW_DARK, 0.25 + rng() * 0.2);
    g.fillEllipse(px + rng() * pw, py + rng() * ph, 60 + rng() * 140, 24 + rng() * 50);
  }
  for (let i = 0; i < 26; i++) { g.lineStyle(1.6, dim(MEADOW, 0.25), 0.25); g.strokeEllipse(px + rng() * pw, py + rng() * ph, 50 + rng() * 90, 20 + rng() * 40); }
  for (let i = 0; i < 700; i++) {
    const x = px + rng() * pw, y = py + rng() * ph;
    g.lineStyle(1, rng() < 0.7 ? MEADOW_DARK : INK_SOFT, 0.35); g.lineBetween(x, y, x - 1 + rng() * 2, y - 4 - rng() * 3);
  }
  for (let i = 0; i < 90; i++) { g.fillStyle([CLOTH_RED, GILT_LIT, 0x7aa0e8, PAGE][Math.floor(rng() * 4)], 0.8); g.fillCircle(px + rng() * pw, py + rng() * ph, 1.6 + rng() * 1.2); }

  // A cobbled lane wandering corner to corner across the plate.
  const lane = (t: number): { x: number; y: number } => ({ x: px + t * pw, y: py + ph * 0.78 - t * ph * 0.55 + Math.sin(t * Math.PI * 2) * 40 });
  for (let i = 0; i <= 70; i++) { const p = lane(i / 70); g.fillStyle(INK, 0.4); g.fillCircle(p.x, p.y, 33); }
  for (let i = 0; i <= 70; i++) { const p = lane(i / 70); g.fillStyle(COBBLE, 1); g.fillCircle(p.x, p.y, 30); }
  for (let i = 0; i < 260; i++) {
    const t = rng(), p = lane(t);
    const x = p.x + (rng() - 0.5) * 48, y = p.y + (rng() - 0.5) * 44;
    g.fillStyle(rng() < 0.5 ? lit(COBBLE, 0.12) : dim(COBBLE, 0.06), 1); g.fillRoundedRect(x - 4.5, y - 3, 9, 6, 2.4);
    g.lineStyle(0.8, COBBLE_DARK, 0.5); g.strokeRoundedRect(x - 4.5, y - 3, 9, 6, 2.4);
  }

  // A huge faint "O" washed into the green: Once upon a time.
  g.lineStyle(22, MEADOW_DARK, 0.12); g.strokeCircle(W / 2, py + ph / 2, 120);
  g.lineStyle(6, GILT, 0.12); g.strokeCircle(W / 2, py + ph / 2, 140);

  // The frame: two ink rules and corner fleurons.
  g.lineStyle(3, INK, 0.9); g.strokeRect(px, py, pw, ph);
  g.lineStyle(1.2, INK, 0.7); g.strokeRect(px - 7, py - 7, pw + 14, ph + 14);
  for (const [cx, cy] of [[px, py], [px + pw, py], [px, py + ph], [px + pw, py + ph]] as const) {
    inkCircle(g, cx, cy, 8, GILT, 1, 1.6);
    g.fillStyle(INK, 0.8);
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; g.fillTriangle(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, cx + Math.cos(a + 0.5) * 6, cy + Math.sin(a + 0.5) * 6, cx + Math.cos(a + 0.25) * 16, cy + Math.sin(a + 0.25) * 16); }
  }

  // The torn bottom of the page: sky and cloud through the rip.
  const tearY = H - 30;
  g.fillStyle(SKY, 1); g.fillRect(0, tearY, W, H - tearY);
  for (let x = 20; x < W; x += 90 + rng() * 40) cloudPuff(g, x, H - 6, 26 + rng() * 14, 0.95, CLOUD_SHADE);
  g.fillStyle(PARCH, 1);
  for (let x = 0; x < W; x += 6) g.fillTriangle(x, tearY - 1, x + 6, tearY - 1, x + 3, tearY + 3 + rng() * 6);
  g.lineStyle(1.5, INK, 0.6); g.lineBetween(0, tearY, W, tearY);

  // Corner props. Top-left: an inkwell and quill.
  const iwX = px + 46, iwY = py + 52;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(iwX + 4, iwY + 4, 46, 12);
  inked(g, [{ x: iwX - 18, y: iwY }, { x: iwX + 18, y: iwY }, { x: iwX + 13, y: iwY - 26 }, { x: iwX - 13, y: iwY - 26 }], 0x2a3a5a, 1, 2);
  g.fillStyle(INK, 1); g.fillEllipse(iwX, iwY - 26, 22, 7);
  quill(g, iwX + 4, iwY - 26, -2.2, 46);
  // Top-right: a stack of licensed editions, a censors' slip in the top one.
  const bkX = px + pw - 70, bkY = py + 70;
  for (let k = 0; k < 5; k++) closedBook(g, bkX + (k % 2) * 5, bkY - k * 11, 62 - k * 4, 12, [CLOTH_RED, CLOTH_BLUE, CLOTH_GREEN, CLOTH_PLUM, CLOTH_RED][k], 1);
  g.fillStyle(0xa0202a, 1); g.fillRect(bkX + 6, bkY - 66, 6, 18);
  // Bottom-left: a lamp. Bottom-right: the signpost to THE END.
  storyLamp(g, px + 40, py + ph - 26);
  const sX = px + pw - 60, sY = py + ph - 24;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(sX + 3, sY + 2, 22, 6);
  g.lineStyle(5, INK, 0.85); g.lineBetween(sX, sY, sX, sY - 62);
  g.lineStyle(3, 0x7a5232, 1); g.lineBetween(sX, sY, sX, sY - 62);
  inked(g, [{ x: sX - 36, y: sY - 60 }, { x: sX + 26, y: sY - 60 }, { x: sX + 36, y: sY - 52 }, { x: sX + 26, y: sY - 44 }, { x: sX - 36, y: sY - 44 }], PAGE, 1, 1.6);
  scribble(g, sX - 30, sY - 52, 52, 1, 6, INK, 0.8, 99, 1.4);
};
