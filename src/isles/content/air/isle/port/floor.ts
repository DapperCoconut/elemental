import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit, mixC } from '../../../../art/IsleArt';
import {
  AERION_DARK, BRASS, BRASS_DARK, FOAM, GRANITE, GRANITE_DARK, GRANITE_LIT, GUANO, IRON, LICHEN, QUAY, QUAY_DARK, ROPE,
  SEA, SEA_SHALLOW, SETT, SETT_ALT, SETT_DARK, STRATA_A, STRATA_B, TIMBER, TIMBER_DARK, KITE_COLS,
  aerionSeal, bollard, bottleCrate, cliffHouse, gullSitting, hawser, lobsterPot, meterDial, poly,
} from './art';

/**
 * The fight floor for every Windlass quest duel: the Lift Yard at the foot of the cliff. Along the
 * top (half under the HUD) the spire goes straight up — banded granite, gull-white ledges, two
 * rock-cut doors, and the iron rails of the lift coming down the face to the cage landing, its gate
 * chained open. The floor is the Yard's fan-laid setts, arcs of small grey stones laid like fish
 * scales so the rain runs off them, with the cargo-trolley tracks curving across from the landing.
 * Off centre the Yard's great brass dial is set flush into the paving — the town meter, needle stuck
 * in the red. Along the bottom the quay coping, bollards and the cold sea. The middle is clear.
 */
export const WINDLASS_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const TOP = 126;
  const BOT = H - 62;

  // Grout under everything.
  g.fillStyle(SETT_DARK, 1); g.fillRect(0, 0, W, H);

  // ── The fan-laid setts: rows of semicircular fans, each a set of concentric arcs of stones.
  const FAN = 64;
  for (let row = 0, cy = TOP + FAN; cy < BOT + FAN; row++, cy += FAN * 0.62) {
    for (let cx = (row % 2) * FAN - FAN; cx < W + FAN; cx += FAN * 2) {
      for (let r = FAN; r >= 6; r -= 7) {
        const steps = Math.max(3, Math.floor((Math.PI * r) / 8));
        for (let k = 0; k <= steps; k++) {
          const a = Math.PI + (k / steps) * Math.PI;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.78;
          if (y < TOP - 4 || y > BOT + 2) continue;
          const col = mixC(rng() < 0.5 ? SETT : SETT_ALT, rng() < 0.5 ? 0xffffff : 0x000000, rng() * 0.08);
          g.fillStyle(col, 1); g.fillRoundedRect(x - 3.4, y - 2.6, 6.8, 5.2, 1.5);
        }
      }
    }
  }
  // Worn pale paths where the morning queue walks from the landing to the Meter House.
  for (let i = 0; i < 14; i++) {
    g.fillStyle(0xe8e4dc, 0.04 + rng() * 0.04);
    g.fillEllipse(W * 0.7 - i * 40 + rng() * 30, TOP + 40 + i * 22 + rng() * 10, 90 + rng() * 60, 22 + rng() * 14);
  }
  // Puddles in the low setts, sky-pale.
  for (let i = 0; i < 6; i++) {
    const px = rng() * W, py = TOP + 40 + rng() * (BOT - TOP - 80);
    if (Math.abs(px - W / 2) < 170 && Math.abs(py - H * 0.58) < 120) continue;
    g.fillStyle(0xb8d4e4, 0.35); g.fillEllipse(px, py, 40 + rng() * 40, 10 + rng() * 8);
    g.fillStyle(0xffffff, 0.25); g.fillEllipse(px - 6, py - 2, 14, 2);
  }

  // ── The cargo tracks: two iron rails curving from the landing down across the Yard to the quay.
  const track = (off: number): void => {
    g.lineStyle(4, IRON, 1);
    g.beginPath();
    for (let k = 0; k <= 40; k++) {
      const t = k / 40;
      const x = W * 0.72 + off + (W * 0.12 - W * 0.72) * t * t * 0.6 - t * 40;
      const y = TOP + (BOT - TOP) * t;
      if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokePath();
  };
  // Sleepers first, then the rails over them.
  for (let k = 0; k <= 26; k++) {
    const t = k / 26;
    const x = W * 0.72 + (W * 0.12 - W * 0.72) * t * t * 0.6 - t * 40;
    const y = TOP + (BOT - TOP) * t;
    g.fillStyle(TIMBER_DARK, 0.9); g.fillRect(x - 6, y - 3, 34, 6);
  }
  track(0); track(22);
  // A trolley left standing on the tracks near the landing, loaded with bottle crates.
  {
    const tx = W * 0.72 + 11, ty = TOP + 64;
    g.fillStyle(0x000000, 0.25); g.fillEllipse(tx, ty + 6, 70, 12);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(tx - 32, ty - 8, 64, 10);
    g.fillStyle(IRON, 1); for (const wx of [-22, 22]) g.fillCircle(tx + wx, ty + 3, 5);
    bottleCrate(g, tx - 14, ty - 8, 9);
    bottleCrate(g, tx + 15, ty - 8, 9);
  }

  // ── The town meter: a great brass dial set flush into the paving, needle stuck in the red.
  {
    const dx = W / 2 + 120, dy = H * 0.6;
    g.fillStyle(0x000000, 0.2); g.fillEllipse(dx, dy + 6, 170, 60);
    // Drawn squashed for the floor's angle: a ring of brass, a pale face, numerals, the needle.
    g.fillStyle(BRASS_DARK, 0.75); g.fillEllipse(dx, dy, 160, 58);
    g.fillStyle(BRASS, 0.55); g.fillEllipse(dx, dy, 148, 52);
    g.fillStyle(0xe8e0cc, 0.4); g.fillEllipse(dx, dy, 124, 42);
    for (let k = 0; k <= 12; k++) {
      const a = -Math.PI * 1.25 + (k / 12) * Math.PI * 1.5;
      g.lineStyle(2, k >= 10 ? 0xc83a3a : 0x3a3428, 0.55);
      g.lineBetween(dx + Math.cos(a) * 46, dy + Math.sin(a) * 16, dx + Math.cos(a) * 58, dy + Math.sin(a) * 20.5);
    }
    const na = -Math.PI * 1.25 + (11.4 / 12) * Math.PI * 1.5;
    g.lineStyle(4, 0x1a1612, 0.6); g.lineBetween(dx, dy, dx + Math.cos(na) * 54, dy + Math.sin(na) * 19);
    g.fillStyle(BRASS_DARK, 0.8); g.fillEllipse(dx, dy, 14, 6);
    aerionSeal(g, dx - 2, dy + 8, 9, AERION_DARK, 0.4);
    // Scuffs across it where the crates are dragged.
    for (let i = 0; i < 18; i++) { g.lineStyle(1, 0xffffff, 0.12); const sx = dx - 60 + rng() * 120; g.lineBetween(sx, dy - 14 + rng() * 28, sx + 14, dy - 12 + rng() * 28); }
  }

  // Litter the wind brings: kite-ribbon scraps and gull feathers, away from the middle.
  for (let i = 0; i < 46; i++) {
    const lx = rng() * W, ly = TOP + 12 + rng() * (BOT - TOP - 24);
    if (Math.abs(lx - W / 2) < 160 && Math.abs(ly - H * 0.56) < 110) continue;
    if (rng() < 0.5) {
      const a = rng() * Math.PI;
      g.lineStyle(2, KITE_COLS[Math.floor(rng() * KITE_COLS.length)], 0.8);
      g.lineBetween(lx, ly, lx + Math.cos(a) * 9, ly + Math.sin(a) * 3);
    } else {
      g.lineStyle(1, 0xf4f4f0, 0.85); g.lineBetween(lx, ly, lx + 7, ly - 2);
      g.lineStyle(1, 0xc8ccd0, 0.85); g.lineBetween(lx + 1, ly + 1, lx + 6, ly - 1);
    }
  }

  // ── The cliff along the top: banded granite rising out of frame.
  for (let y = 0; y < TOP; y += 3) {
    const band = Math.floor((y + Math.sin(y * 0.2) * 2) / 14) % 2;
    g.fillStyle(band ? STRATA_A : STRATA_B, 1); g.fillRect(0, y, W, 3);
  }
  for (let i = 0; i < 70; i++) {
    const cx = rng() * W;
    g.lineStyle(1 + rng(), GRANITE_DARK, 0.6); g.lineBetween(cx, rng() * 40, cx + (rng() - 0.5) * 8, 30 + rng() * (TOP - 40));
  }
  // Ledges whitened by gulls, lichen patches.
  for (const ly of [26, 58]) {
    g.fillStyle(GRANITE_LIT, 0.8); g.fillRect(0, ly, W, 3);
    for (let x = 0; x < W; x += 6 + rng() * 10) { g.fillStyle(GUANO, 0.7); g.fillRect(x, ly + 3, 2, 3 + rng() * 9); }
  }
  for (let i = 0; i < 26; i++) { g.fillStyle(LICHEN, 0.45); g.fillEllipse(rng() * W, rng() * (TOP - 20), 12 + rng() * 22, 5 + rng() * 6); }
  // Two rock-cut doors in the foot of the cliff, either side of the landing.
  cliffHouse(g, 150, TOP + 2, 150, 92, { door: 0x3a6a8a, trim: 0xe85a4a, washing: true }, rng);
  cliffHouse(g, W - 150, TOP + 2, 150, 92, { door: 0x8a4a3a, trim: 0x4ab0d8, chime: true }, rng);
  // The lift rails coming down the face to the landing, the cage gate chained open.
  const LX = W * 0.72;
  for (const rx of [LX - 26, LX + 26]) {
    g.fillStyle(IRON, 1); g.fillRect(rx - 3, 0, 6, TOP);
    for (let y = 6; y < TOP; y += 18) { g.fillStyle(lit(IRON, 0.3), 1); g.fillRect(rx - 5, y, 10, 3); }
  }
  g.fillStyle(GRANITE_DARK, 1); g.fillRect(LX - 46, TOP - 8, 92, 12);
  g.fillStyle(GRANITE, 1); g.fillRect(LX - 44, TOP - 8, 88, 8);
  g.lineStyle(2, IRON, 1);
  for (let k = 0; k < 6; k++) g.lineBetween(LX - 40 + k * 6, TOP - 60, LX - 40 + k * 6, TOP - 10);
  g.lineBetween(LX - 40, TOP - 60, LX - 10, TOP - 60);
  g.lineStyle(1.5, 0xa8a8a8, 1);
  for (let k = 0; k < 5; k++) { g.strokeEllipse(LX - 6 + k * 6, TOP - 30 + Math.sin(k) * 2, 6, 4); }
  // A painted board over the landing.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(LX - 52, 72, 104, 22);
  g.fillStyle(TIMBER, 1); g.fillRect(LX - 50, 74, 100, 18);
  aerionSeal(g, LX - 36, 83, 7, AERION_DARK, 1);
  g.fillStyle(0xe8e0cc, 1); for (let k = 0; k < 7; k++) g.fillRect(LX - 22 + k * 10, 80, 6, 6);

  // ── The quay along the bottom: coping stones, bollards, then the cold sea.
  g.fillStyle(SEA_SHALLOW, 1); g.fillRect(0, BOT, W, H - BOT);
  g.fillStyle(SEA, 1); g.fillRect(0, BOT + 30, W, H - BOT - 30);
  for (let x = 0; x < W; x += 26) { g.fillStyle(FOAM, 0.22 + rng() * 0.2); g.fillEllipse(x + 13, BOT + 10 + rng() * 6, 20, 3); }
  for (let x = 0; x < W; x += 80) {
    g.fillStyle(QUAY_DARK, 1); g.fillRect(x, BOT - 12, 78, 16);
    g.fillStyle(QUAY, 1); g.fillRect(x + 1, BOT - 12, 76, 11);
    g.fillStyle(lit(QUAY, 0.15), 1); g.fillRect(x + 1, BOT - 12, 76, 2);
  }
  for (const bx of [110, 330, W - 330, W - 110]) bollard(g, bx, BOT - 8);
  gullSitting(g, W - 110, BOT - 30, 12, -1);
  g.lineStyle(3, ROPE, 1); g.beginPath(); g.moveTo(330, BOT - 18); g.lineTo(350, BOT + 10); g.lineTo(380, H); g.strokePath();

  // ── Corner clutter, kept out of the middle.
  bottleCrate(g, W - 90, BOT - 34, 12);
  bottleCrate(g, W - 56, BOT - 34, 12);
  bottleCrate(g, W - 74, BOT - 60, 12);
  hawser(g, 80, BOT - 30, 22);
  lobsterPot(g, 190, BOT - 22, 16);
  lobsterPot(g, 214, BOT - 34, 13);
  // A spare meter-strap dropped by the landing.
  meterDial(g, LX + 70, TOP + 30, 8, -0.3, 0.9);
  g.lineStyle(2, 0x5a3a2a, 0.9); g.lineBetween(LX + 62, TOP + 34, LX + 40, TOP + 40); g.lineBetween(LX + 78, TOP + 34, LX + 98, TOP + 44);
  // Stone weights for the kite stalls, stacked at the left wall.
  for (let k = 0; k < 3; k++) {
    g.fillStyle(GRANITE_DARK, 1); g.fillRoundedRect(36 + k * 4, TOP + 36 - k * 9, 26, 10, 3);
    g.fillStyle(GRANITE, 1); g.fillRoundedRect(37 + k * 4, TOP + 36 - k * 9, 24, 7, 3);
  }
};
