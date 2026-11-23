import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, glow } from '../../../../art/IsleArt';
import { bookStack, copyDesk, inkBlot, litter, paperLantern, shelfBay, typeCase } from './art';
import { GLOW_LIT, INK, LEATHER_DARK, OAK, OAK_DARK, OAK_LIT, PAPER, PAPER_LIT, SETT, SLATE_DARK, WASH } from './palette';

/**
 * The fight floor for every Libretto encounter: the long copying room of a scriptorium after
 * hours. Wide oak boards worn pale down the middle where the copyists walk, slanted copy-desks
 * down both side walls with their stools, the tall leaded windows of the back wall (under the
 * HUD) throwing long bars of lamplight across the floor, shelves of bound Scores, a type cabinet
 * in one corner, ink spilt and sheets dropped everywhere. The middle is left open — the bars,
 * cranes, cues, lanterns and gales bring their own.
 */
export const LIBRETTO_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // Boards, laid lengthways, pale down the middle aisle.
  g.fillStyle(OAK, 1); g.fillRect(0, 0, W, H);
  for (let y = 100; y < H; y += 28) {
    g.fillStyle(y % 56 ? OAK : dim(OAK, 0.06), 1); g.fillRect(0, y, W, 28);
    g.lineStyle(1, OAK_DARK, 0.8); g.lineBetween(0, y, W, y);
    let x = (y * 37) % 160;
    while (x < W) { g.lineStyle(1, OAK_DARK, 0.6); g.lineBetween(x, y, x, y + 28); x += 140 + ((x * 7) % 90); }
    for (let i = 0; i < 6; i++) { g.fillStyle(OAK_LIT, 0.25); g.fillRect(rng() * W, y + 6 + rng() * 16, 20 + rng() * 40, 1); }
  }
  g.fillStyle(OAK_LIT, 0.18); g.fillRect(140, 100, W - 280, H - 100);
  // The back wall under the HUD: limewash, tall leaded windows lit gold, a stave frieze.
  g.fillStyle(WASH, 1); g.fillRect(0, 0, W, 100);
  for (let i = 0; i < 6; i++) {
    const wx = 80 + i * 160;
    g.fillStyle(SLATE_DARK, 1); g.fillRect(wx - 26, 8, 52, 90);
    g.fillStyle(0xe8b860, 1); g.fillRect(wx - 22, 12, 44, 86);
    g.beginPath(); g.arc(wx, 12, 22, Math.PI, 0, false); g.fillPath();
    g.lineStyle(0.8, 0x3a2a1a, 0.8);
    for (let d = -90; d < 44; d += 7) { g.lineBetween(wx - 22 + d, 12, wx - 22 + d + 86, 98); g.lineBetween(wx - 22 + d + 86, 12, wx - 22 + d, 98); }
  }
  g.fillStyle(OAK_DARK, 1); g.fillRect(0, 96, W, 8);
  // Bars of lamplight from the windows, slanting across the boards.
  for (let i = 0; i < 6; i++) {
    const wx = 80 + i * 160;
    g.fillStyle(GLOW_LIT, 0.07);
    g.fillPoints([{ x: wx - 22, y: 104 }, { x: wx + 22, y: 104 }, { x: wx + 140, y: H }, { x: wx + 70, y: H }], true);
  }
  // Copy-desks down both side walls, the shelves behind them.
  shelfBay(g, 0, 110, 40, H - 120, rng);
  shelfBay(g, W - 40, 110, 40, H - 120, rng);
  g.fillStyle(LEATHER_DARK, 0.5); g.fillRect(40, 110, 4, H - 120); g.fillRect(W - 44, 110, 4, H - 120);
  for (let y = 190; y < H - 40; y += 120) { copyDesk(g, 80, y, 1, rng); copyDesk(g, W - 80, y + 50, 1, rng); }
  // A type cabinet and a stack of bound Scores in the far corners.
  typeCase(g, 90, H - 18, rng);
  bookStack(g, W - 90, H - 20, 7, rng);
  bookStack(g, W - 130, H - 18, 4, rng);
  // Spilt ink and dropped sheets.
  for (let i = 0; i < 4; i++) inkBlot(g, 180 + rng() * (W - 360), 160 + rng() * (H - 240), 6 + rng() * 6, rng, INK, 0.7);
  litter(g, 120, 130, W - 240, H - 170, 18, rng);
  // Two hanging paper lanterns at the window bays, and their glow.
  for (const x of [240, W - 240]) { glow(g, x, 130, 60, GLOW_LIT, 0.04, 3); paperLantern(g, x, 124, 9, 0.9); }
  // A worn runner of felt down the aisle (snow-felt: Choirholm muffles its floors).
  g.fillStyle(PAPER, 0.06); g.fillRect(W / 2 - 60, 104, 120, H - 104);
  g.lineStyle(1, PAPER_LIT, 0.12); g.lineBetween(W / 2 - 60, 104, W / 2 - 60, H); g.lineBetween(W / 2 + 60, 104, W / 2 + 60, H);
  g.fillStyle(SETT, 0.3); g.fillRect(0, H - 6, W, 6);
};
