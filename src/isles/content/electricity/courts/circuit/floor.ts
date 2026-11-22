import type { ArenaFloor } from '../../../../IslesTypes';
import { lit } from '../../../../art/IsleArt';
import { capacitorTower, diodeLamp, pad, segText, silkArrow, silkMark, valve, via } from './art';
import {
  BAND_COLORS, CERAMIC, CERAMIC_DARK, COPPER, COPPER_DARK, COPPER_LIT, EPOXY, EPOXY_LIT, FILAMENT, GOLD, GOLD_DARK,
  MASK, MASK_DARK, MASK_LIT, SILK, SOLDER, SOLDER_DARK,
} from './palette';

/**
 * The fight floor for every Circuit encounter: a yard of bare board in the middle of the court at
 * night. Solder-mask green, faint copper pours and silkscreen house numbers across it, a row of
 * chips along the back wall (half under the HUD) with their gold legs in the board, resistor
 * houses end-on down both sides with their windows lit, a capacitor can in one corner and diode
 * street-lamps in the other. The middle is left as plain board — the traces, gates, cards,
 * automatons and ghosts bring their own.
 */
export const CIRCUIT_FLOOR: ArenaFloor = (g, W, H, rng) => {
  g.fillStyle(MASK, 1); g.fillRect(0, 0, W, H);
  // Fibreglass weave showing through the mask.
  for (let x = 0; x < W; x += 6) { g.fillStyle(MASK_LIT, 0.08); g.fillRect(x, 0, 2, H); }
  for (let y = 0; y < H; y += 6) { g.fillStyle(MASK_DARK, 0.1); g.fillRect(0, y, W, 2); }
  // Ground pour: big soft copper islands under the mask, hatched.
  for (let i = 0; i < 4; i++) {
    const x = 120 + rng() * (W - 240), y = 160 + rng() * (H - 260);
    const w = 120 + rng() * 140, h = 80 + rng() * 100;
    g.fillStyle(COPPER_DARK, 0.12); g.fillRect(x, y, w, h);
    for (let k = 0; k < w + h; k += 10) { g.lineStyle(1, COPPER, 0.07); g.lineBetween(x + Math.max(0, k - h), y + Math.min(h, k), x + Math.min(w, k), y + Math.max(0, k - w)); }
  }
  // Silkscreen: part outlines and numbers, and the Draw's arrows pointing up to the Crown.
  for (let i = 0; i < 12; i++) silkMark(g, 80 + rng() * (W - 160), 140 + rng() * (H - 220), ['R' , 'C', 'U', 'D'][i % 4] + String(10 + Math.floor(rng() * 90)), 8, 0.22);
  for (let i = 0; i < 6; i++) silkArrow(g, 120 + i * 150, H - 70, -Math.PI / 2, 14, 0.18);
  for (let i = 0; i < 20; i++) via(g, 60 + rng() * (W - 120), 130 + rng() * (H - 180), 3 + rng() * 2);
  // The back wall: a row of chips, black epoxy, gold legs down into the board.
  g.fillStyle(MASK_DARK, 1); g.fillRect(0, 0, W, 112);
  for (let i = 0; i < 6; i++) {
    const cx = 80 + i * 160, cw = 120;
    g.fillStyle(0x08070c, 1); g.fillRect(cx - cw / 2 - 2, 26, cw + 4, 62);
    g.fillStyle(EPOXY, 1); g.fillRect(cx - cw / 2, 28, cw, 58);
    g.fillStyle(EPOXY_LIT, 0.8); g.fillRect(cx - cw / 2, 28, cw, 4);
    g.fillStyle(EPOXY_LIT, 1); g.fillCircle(cx - cw / 2 + 12, 44, 4);
    segText(g, cx - 30, 52, ['74', '40', '55', 'EE', '8A', '1C'][i] + String(Math.floor(rng() * 90 + 10)), 12, SILK, 0.5);
    for (let k = 0; k < 8; k++) {
      const lx = cx - cw / 2 + 10 + k * ((cw - 20) / 7);
      g.fillStyle(GOLD_DARK, 1); g.fillRect(lx - 3, 86, 6, 18);
      g.fillStyle(GOLD, 1); g.fillRect(lx - 2, 86, 4, 16);
      pad(g, lx, 106, 9, 6);
    }
  }
  // Copper traces running down from the chip legs and away along the edges.
  for (let i = 0; i < 6; i++) {
    const cx = 80 + i * 160;
    for (const k of [-1, 1]) {
      const x0 = cx + k * 40;
      g.lineStyle(6, COPPER_DARK, 1); g.lineBetween(x0, 110, x0, 140); g.lineBetween(x0, 140, x0 + k * 30, 170);
      g.lineStyle(3, COPPER, 1); g.lineBetween(x0, 110, x0, 140); g.lineBetween(x0, 140, x0 + k * 30, 170);
      g.lineStyle(1, COPPER_LIT, 0.5); g.lineBetween(x0, 110, x0, 140);
      via(g, x0 + k * 30, 170, 4);
    }
  }
  // Resistor houses end-on down both side walls: the round caps, the bands, a lit window.
  for (const side of [0, 1]) {
    for (let y = 170; y < H - 40; y += 118) {
      const x = side ? W - 26 : 26;
      g.fillStyle(CERAMIC_DARK, 1); g.fillEllipse(x, y, 52, 70);
      g.fillStyle(CERAMIC, 1); g.fillEllipse(x, y - 2, 46, 64);
      g.fillStyle(lit(CERAMIC, 0.2), 0.7); g.fillEllipse(x - 6, y - 14, 18, 22);
      const b = BAND_COLORS[Math.floor(rng() * BAND_COLORS.length)];
      g.fillStyle(b, 1); g.fillRect(x - 22, y + 14, 44, 6);
      g.fillStyle(FILAMENT, 0.12); g.fillCircle(x, y - 4, 20);
      g.fillStyle(lit(FILAMENT, 0.2), 0.9); g.fillRoundedRect(x - 6, y - 12, 12, 14, 5);
      g.fillStyle(SOLDER_DARK, 1); g.fillRect(side ? x - 34 : x + 26, y + 4, 8, 3);
    }
  }
  // A capacitor can in one corner and a diode lamp and a spare valve rack in the other.
  capacitorTower(g, W - 92, H - 34, 26, 90, rng);
  diodeLamp(g, 92, H - 30);
  diodeLamp(g, 150, H - 22, 0xff5a4a, 0);
  for (let k = 0; k < 4; k++) valve(g, 196 + k * 16, H - 20, 0.7, k % 3 ? 0.8 : 0);
  // A strip of bare board along the bottom, tinned and riveted.
  g.fillStyle(SOLDER_DARK, 1); g.fillRect(0, H - 14, W, 14);
  g.fillStyle(SOLDER, 1); g.fillRect(0, H - 13, W, 5);
  for (let x = 20; x < W; x += 60) { g.fillStyle(SOLDER_DARK, 1); g.fillCircle(x, H - 6, 2); }
  segText(g, W - 150, H - 64, 'CCT-02', 9, SILK, 0.25);
};
