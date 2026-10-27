import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit, mixC } from '../../../../art/IsleArt';
import { FOAM, LAMP, PLANK, PLANK_DARK, QUEEN_DARK, ROPE, SEA, SEA_DEEP, SEA_SHALLOW, TIDE, crest, crabPot, tideMarks } from './art';

/**
 * The fight floor for every Brinehollow quest duel: a stretch of the harbour boardwalk at the foot
 * of the stilt quarter. A row of stilt-house fronts stands along the top (half under the HUD), each
 * with its ladder down and the green tide line across its legs. The deck runs the width of the arena
 * in silver-grey planks with dark water glinting through the gaps; rope railings close the sides;
 * the bottom edge drops off into the harbour. A worn tithe-stamp — the Queen's crest — is painted on
 * the planks just off centre. The middle is kept clear for the fight.
 */
export const BRINEHOLLOW_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const DECK_TOP = 118;
  const DECK_BOT = H - 30;

  // Water under everything — it shows through the gaps and off the bottom edge.
  g.fillStyle(SEA_DEEP, 1); g.fillRect(0, 0, W, H);

  // ── The deck: long planks running across, each a slightly different grey.
  const PH = 22;
  for (let y = DECK_TOP; y < DECK_BOT; y += PH) {
    // Planks are laid in staggered lengths, butt-joints falling in different places each row.
    let x = -((Math.floor(y / PH) * 97) % 180);
    while (x < W) {
      const len = 140 + rng() * 120;
      const shade = rng();
      const col = mixC(PLANK, shade < 0.5 ? 0x000000 : 0xb8c0b8, shade < 0.5 ? shade * 0.3 : (shade - 0.5) * 0.18);
      g.fillStyle(PLANK_DARK, 1); g.fillRect(x, y, len, PH);
      g.fillStyle(col, 1); g.fillRect(x + 1.5, y + 1.5, len - 3, PH - 3);
      g.fillStyle(lit(col, 0.12), 0.7); g.fillRect(x + 1.5, y + 1.5, len - 3, 2);
      // Grain lines and the odd knot.
      for (let k = 0; k < 3; k++) {
        g.lineStyle(1, dim(col, 0.18), 0.5);
        const gy = y + 5 + k * 5 + rng() * 2;
        g.lineBetween(x + 6, gy, x + len - 6, gy + (rng() - 0.5) * 2);
      }
      if (rng() < 0.4) { g.fillStyle(dim(col, 0.35), 0.8); g.fillEllipse(x + 20 + rng() * (len - 40), y + PH / 2, 7, 4); }
      // Nail heads at both ends.
      g.fillStyle(0x2a2a26, 1);
      g.fillCircle(x + 5, y + 6, 1.3); g.fillCircle(x + 5, y + PH - 6, 1.3);
      g.fillCircle(x + len - 5, y + 6, 1.3); g.fillCircle(x + len - 5, y + PH - 6, 1.3);
      x += len;
    }
    // A gap between this row and the next, here and there, with water glinting through.
    if (rng() < 0.45) {
      const gx = rng() * (W - 200) + 40, gw = 60 + rng() * 120;
      g.fillStyle(SEA_DEEP, 1); g.fillRect(gx, y + PH - 2, gw, 3);
      g.fillStyle(SEA_SHALLOW, 0.8); g.fillRect(gx + gw * 0.3, y + PH - 1.5, gw * 0.2, 1.2);
    }
  }

  // Salt bloom and wet patches.
  for (let i = 0; i < 26; i++) {
    g.fillStyle(0xe6e2d4, 0.05 + rng() * 0.06);
    g.fillEllipse(rng() * W, DECK_TOP + rng() * (DECK_BOT - DECK_TOP), 40 + rng() * 110, 10 + rng() * 26);
  }
  for (let i = 0; i < 9; i++) {
    const px = 60 + rng() * (W - 120), py = DECK_TOP + 40 + rng() * (DECK_BOT - DECK_TOP - 80);
    if (Math.abs(px - W / 2) < 160 && Math.abs(py - H * 0.58) < 120) continue;
    g.fillStyle(SEA, 0.35); g.fillEllipse(px, py, 50 + rng() * 60, 10 + rng() * 10);
    g.fillStyle(0xd8f0ee, 0.18); g.fillEllipse(px - 8, py - 2, 18, 2);
  }

  // The high-water line: where the noon flood reaches across these boards. Green, faint, wavy.
  g.lineStyle(4, TIDE, 0.32);
  g.beginPath();
  for (let x = 0; x <= W; x += 16) {
    const y = H * 0.74 + Math.sin(x / 70) * 8 + Math.sin(x / 23) * 2;
    if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.strokePath();
  for (let x = 6; x < W; x += 9 + rng() * 14) { g.fillStyle(TIDE, 0.25); g.fillRect(x, H * 0.74 + Math.sin(x / 70) * 8 + 2, 1.5, 3 + rng() * 7); }

  // The tithe-stamp: the Queen's crest painted on the planks, scuffed half away by boots.
  crest(g, W / 2 + 70, H * 0.6, 64, 0x1a2a2a, 0.35);
  crest(g, W / 2 + 70, H * 0.6, 60, QUEEN_DARK, 0.22);
  for (let i = 0; i < 40; i++) {
    g.fillStyle(PLANK, 0.5); g.fillEllipse(W / 2 + 10 + rng() * 120, H * 0.6 - 60 + rng() * 120, 6 + rng() * 14, 3);
  }

  // ── The stilt-house fronts along the top.
  const n = 6;
  for (let i = 0; i < n; i++) {
    const w = W / n;
    const x0 = i * w;
    const wall = [0x5e6a62, 0x6a6458, 0x646a60, 0x706a5a, 0x5a6660, 0x6a6a5e][i];
    const base = 70;
    // Legs.
    for (let k = 0; k < 4; k++) {
      const lx = x0 + 10 + k * (w - 20) / 3;
      g.fillStyle(PLANK_DARK, 1); g.fillRect(lx - 4, base, 8, DECK_TOP - base);
      g.fillStyle(TIDE, 0.85); g.fillRect(lx - 4, DECK_TOP - 22, 8, 22);
      for (let b = 0; b < 3; b++) { g.fillStyle(0xd8d4c4, 0.8); g.fillCircle(lx - 2 + rng() * 4, DECK_TOP - 4 - rng() * 16, 1.2); }
    }
    g.lineStyle(2, PLANK_DARK, 1);
    for (let k = 0; k < 3; k++) {
      const a = x0 + 10 + k * (w - 20) / 3, b = x0 + 10 + (k + 1) * (w - 20) / 3;
      g.lineBetween(a, base + 6, b, DECK_TOP - 6);
    }
    // Wall.
    g.fillStyle(dim(wall, 0.45), 1); g.fillRect(x0, 0, w, base + 2);
    g.fillStyle(wall, 1); g.fillRect(x0 + 3, 0, w - 6, base);
    for (let k = 0; k < 12; k++) { g.fillStyle(dim(wall, 0.14), 0.5); g.fillRect(x0 + 6 + rng() * (w - 24), 4 + rng() * (base - 10), 14, 3); }
    tideMarks(g, x0 + 3, x0 + w - 3, base, [10, 24], rng);
    // Windows, lamp-lit.
    for (const s of [-1, 1]) {
      const wx = x0 + w / 2 + s * w * 0.3;
      g.fillStyle(0x1a2422, 1); g.fillRect(wx - 9, 16, 18, 22);
      g.fillStyle(LAMP, 0.16); g.fillCircle(wx, 27, 18);
      g.fillStyle(LAMP, 0.88); g.fillRect(wx - 7, 18, 14, 18);
      g.fillStyle(0x1a2422, 1); g.fillRect(wx - 1, 18, 2, 18); g.fillRect(wx - 7, 26, 14, 2);
    }
    // Door and its ladder down to the deck.
    g.fillStyle(0x1a2422, 1); g.fillRoundedRect(x0 + w / 2 - 11, base - 34, 22, 34, { tl: 9, tr: 9, bl: 0, br: 0 });
    g.fillStyle(QUEEN_DARK, 1); g.fillRoundedRect(x0 + w / 2 - 9, base - 32, 18, 32, { tl: 8, tr: 8, bl: 0, br: 0 });
    g.lineStyle(2, PLANK_DARK, 1);
    g.lineBetween(x0 + w / 2 - 8, base, x0 + w / 2 - 8, DECK_TOP); g.lineBetween(x0 + w / 2 + 8, base, x0 + w / 2 + 8, DECK_TOP);
    for (let ry = base + 8; ry < DECK_TOP; ry += 9) g.lineBetween(x0 + w / 2 - 8, ry, x0 + w / 2 + 8, ry);
    // A bailing bucket on every doorstep but one.
    if (i !== 3) {
      g.fillStyle(0x4a4a44, 1); g.fillRect(x0 + w / 2 + 16, base - 10, 10, 10);
      g.fillStyle(0x2a2a26, 1); g.fillEllipse(x0 + w / 2 + 21, base - 10, 10, 3);
    }
  }
  // The deck's top edge where the houses stand on it.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(0, DECK_TOP - 3, W, 5);
  g.fillStyle(lit(PLANK, 0.15), 1); g.fillRect(0, DECK_TOP + 2, W, 2);

  // ── Rope railings down both sides: posts, two sagging ropes, the harbour glinting beyond.
  for (const side of [0, 1]) {
    const x = side ? W - 14 : 14;
    g.fillStyle(SEA, 1); g.fillRect(side ? W - 8 : 0, DECK_TOP, 8, DECK_BOT - DECK_TOP);
    for (let y = DECK_TOP + 20; y < DECK_BOT; y += 70) {
      g.fillStyle(0x000000, 0.25); g.fillEllipse(x + 2, y + 2, 12, 5);
      g.fillStyle(PLANK_DARK, 1); g.fillRect(x - 4, y - 26, 8, 28);
      g.fillStyle(lit(PLANK_DARK, 0.25), 1); g.fillRect(x - 4, y - 26, 2, 28);
      if (y + 70 < DECK_BOT) {
        for (const off of [-22, -12]) {
          g.lineStyle(2, ROPE, 0.9);
          g.beginPath();
          for (let k = 0; k <= 8; k++) {
            const t = k / 8;
            const yy = y + off + 70 * t;
            const xx = x + (side ? -1 : 1) * Math.sin(t * Math.PI) * 5;
            if (k === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy);
          }
          g.strokePath();
        }
      }
    }
  }

  // ── The bottom edge: the deck stops and the harbour begins.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(0, DECK_BOT, W, 6);
  g.fillStyle(SEA_SHALLOW, 1); g.fillRect(0, DECK_BOT + 6, W, H - DECK_BOT - 6);
  for (let x = 0; x < W; x += 30) {
    g.fillStyle(FOAM, 0.35 + rng() * 0.2); g.fillEllipse(x + 15, DECK_BOT + 10, 24, 4);
  }
  for (let x = 40; x < W; x += 120) {
    g.fillStyle(PLANK_DARK, 1); g.fillRect(x - 5, DECK_BOT - 4, 10, H - DECK_BOT + 4);
    g.fillStyle(TIDE, 0.9); g.fillRect(x - 5, DECK_BOT + 6, 10, H - DECK_BOT - 6);
    g.fillStyle(FOAM, 0.5); g.fillEllipse(x, DECK_BOT + 14, 16, 4);
  }

  // ── Harbour clutter at the corners, kept well out of the middle.
  // A bollard with a coiled mooring line, bottom left.
  {
    const bx = 70, by = DECK_BOT - 30;
    g.fillStyle(0x000000, 0.3); g.fillEllipse(bx, by + 4, 34, 10);
    g.fillStyle(0x1e2626, 1); g.fillRoundedRect(bx - 9, by - 20, 18, 24, 5);
    g.fillStyle(0x3a4444, 1); g.fillEllipse(bx, by - 20, 22, 8);
    for (let k = 0; k < 4; k++) { g.lineStyle(3, k % 2 ? ROPE : dim(ROPE, 0.2), 1); g.strokeEllipse(bx + 34, by, 34 - k * 7, 13 - k * 2.6); }
  }
  // Crab pots stacked, top right under the houses.
  crabPot(g, W - 70, DECK_TOP + 46, 12, rng);
  crabPot(g, W - 100, DECK_TOP + 52, 10, rng);
  crabPot(g, W - 82, DECK_TOP + 30, 9, rng);
  // A herring basket spilled, bottom right.
  {
    const hx = W - 120, hy = DECK_BOT - 34;
    g.fillStyle(0x000000, 0.25); g.fillEllipse(hx, hy + 4, 50, 12);
    g.fillStyle(0x6a5430, 1); g.fillEllipse(hx, hy - 6, 40, 20);
    g.fillStyle(0x8a7040, 1); g.fillEllipse(hx, hy - 9, 34, 12);
    for (let k = 0; k < 7; k++) {
      g.fillStyle(0xc8d0d4, 1); g.fillEllipse(hx + 18 + k * 7, hy + (k % 2) * 4, 9, 3);
      g.fillStyle(0x6a7a8a, 1); g.fillEllipse(hx + 18 + k * 7, hy - 1 + (k % 2) * 4, 7, 1.2);
    }
  }
  // A dropped tithe-coin by the stamp, glinting.
  g.fillStyle(0x8a7a3a, 1); g.fillCircle(W / 2 + 150, H * 0.66, 5);
  g.fillStyle(0xd8c070, 1); g.fillCircle(W / 2 + 149, H * 0.66 - 1, 4);
  crest(g, W / 2 + 149, H * 0.66 - 1, 2.6, 0x6a5a2a, 0.9);
};
