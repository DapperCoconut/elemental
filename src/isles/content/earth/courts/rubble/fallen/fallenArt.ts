import type { G } from '../../../../../art/IsleArt';
import { TESS_BLUE, TESS_BONE, TESS_OCHRE, TESS_RED } from '../palette';

/**
 * Small drawings the Rubble Court's Fallen Five share. Art only — each gimmick owns its mechanics.
 */

const TESS = [TESS_RED, TESS_OCHRE, TESS_BLUE, TESS_BONE];

/**
 * A scrap of the old Exchange's mosaic showing round a block's foot: a ring of tesserae in the
 * capital's four colours, a few missing where pickers prised them out.
 */
export function mosaicChip(g: G, x: number, y: number, seed: number): void {
  for (let i = 0; i < 18; i++) {
    const a = seed + i * 0.35, r = 30 + (i % 3) * 5;
    if ((i * 7 + Math.floor(seed * 3)) % 5 === 0) continue;
    g.fillStyle(TESS[(i + Math.floor(seed)) % 4], 0.8);
    g.fillRect(x + Math.cos(a) * r - 2.5, y + Math.sin(a) * r * 0.5 - 2, 5, 4);
  }
}
