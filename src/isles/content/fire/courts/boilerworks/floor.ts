import type { ArenaFloor } from '../../../../IslesTypes';
import { brandSigil, dim, lit } from '../../../../art/IsleArt';
import {
  BRASS, COPPER_DARK, IRON, IRON_DARK, VERDIGRIS, copperPipe, dial, hazardStripes, pipeElbow, plate, rivets,
} from './util';

/**
 * The Boilerworks fight floor — a riveted iron test deck on the works' shop floor. Square deck
 * plates in two tones, a copper feed main hugging the top and bottom rails, drain grates
 * breathing up from the boiler room below, painted hazard kerbs at the edges and the King's
 * brand stencilled faintly where the foreman can see it from the gantry. The middle stays calm
 * so each encounter's machinery reads on top of it.
 */
export const BOILERWORKS_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  // Under-deck darkness first, so plate seams read as gaps.
  g.fillStyle(IRON_DARK, 1); g.fillRect(0, 0, W, H);

  // Deck plates — 80px squares, alternate tone in a loose checker, with weld seams.
  const S = 80;
  for (let y = top; y < H; y += S) {
    for (let x = 0; x < W; x += S) {
      const alt = ((x / S + (y - top) / S) % 2) === 0;
      const base = alt ? IRON : dim(IRON, 0.12);
      plate(g, x, y, S, Math.min(S, H - y), base, rng);
    }
  }

  // Tread-plate diamonds on a few plates, the "walk here" panels.
  for (let i = 0; i < 9; i++) {
    const px = Math.floor(rng() * (W / S)) * S, py = top + Math.floor(rng() * ((H - top) / S)) * S;
    for (let yy = py + 12; yy < py + S - 10; yy += 10) {
      for (let xx = px + 12 + ((yy / 10) % 2) * 5; xx < px + S - 10; xx += 12) {
        g.lineStyle(1.4, lit(IRON, 0.16), 0.6);
        g.lineBetween(xx - 3, yy + 2, xx + 3, yy - 2);
      }
    }
  }

  // Oil and soot stains.
  for (let i = 0; i < 16; i++) {
    g.fillStyle(0x0c0b0a, 0.18 + rng() * 0.2);
    g.fillEllipse(rng() * W, top + rng() * (H - top), 30 + rng() * 90, 12 + rng() * 34);
  }

  // Drain grates — the boiler room below glows through them.
  const grates = [{ x: 200, y: 260 }, { x: 760, y: 260 }, { x: 200, y: 500 }, { x: 760, y: 500 }, { x: 480, y: 380 }];
  for (const gr of grates) {
    g.fillStyle(0xff6a2a, 0.08); g.fillCircle(gr.x, gr.y, 40);
    g.fillStyle(0x0a0706, 1); g.fillRoundedRect(gr.x - 26, gr.y - 18, 52, 36, 5);
    g.fillStyle(0xff7a30, 0.35); g.fillRoundedRect(gr.x - 22, gr.y - 14, 44, 28, 4);
    g.lineStyle(3, IRON_DARK, 1);
    for (let k = -18; k <= 18; k += 7) g.lineBetween(gr.x + k, gr.y - 16, gr.x + k, gr.y + 16);
    g.lineStyle(2, lit(IRON, 0.2), 1); g.strokeRoundedRect(gr.x - 26, gr.y - 18, 52, 36, 5);
  }

  // The King's brand stencilled in rust at centre.
  brandSigil(g, W / 2, (H + top) / 2 + 6, 70, 0x7a2a12, 0.22);
  g.lineStyle(2, 0x7a2a12, 0.18); g.strokeCircle(W / 2, (H + top) / 2 + 6, 96);

  // Hazard kerbs down the left and right rails.
  hazardStripes(g, { x: 0, y: top, w: 14, h: H - top }, 0.55);
  hazardStripes(g, { x: W - 14, y: top, w: 14, h: H - top }, 0.55);

  // Copper feed mains along top and bottom with elbows going into the deck.
  copperPipe(g, { x: 0, y: top + 10 }, { x: W, y: top + 10 }, 9, rng, 140);
  copperPipe(g, { x: 0, y: H - 10 }, { x: W, y: H - 10 }, 9, rng, 140);
  for (const x of [120, W - 120]) {
    pipeElbow(g, x, top + 10, 9);
    pipeElbow(g, x, H - 10, 9);
  }

  // Little panel dials bolted to the mains — frozen at their reading.
  for (let i = 0; i < 4; i++) {
    const x = 220 + i * 170;
    dial(g, x, top + 10, 8, 0.25 + rng() * 0.6);
  }

  // Weld beads where plates were patched after an overpressure.
  for (let i = 0; i < 7; i++) {
    const x = 40 + rng() * (W - 80), y = top + 30 + rng() * (H - top - 60);
    const len = 30 + rng() * 60;
    g.lineStyle(3, dim(BRASS, 0.5), 0.55);
    g.lineBetween(x, y, x + len, y + (rng() - 0.5) * 10);
    rivets(g, { x, y: y - 6 }, { x: x + len, y: y - 6 }, 10, 1.2);
  }

  // Verdigris drips beneath the lower main.
  for (let i = 0; i < 10; i++) {
    g.fillStyle(VERDIGRIS, 0.2 + rng() * 0.15);
    g.fillEllipse(rng() * W, H - 26 - rng() * 12, 6 + rng() * 10, 10 + rng() * 14);
  }
  g.fillStyle(COPPER_DARK, 0.25); g.fillRect(0, top, W, 3);
};
