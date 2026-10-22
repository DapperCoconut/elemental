import type { SkinDef } from '../Skins';

/**
 * Amber: oil's crude pushed off black-and-chrome and into fossil resin. Keys are the exact
 * values of the OIL palette in OilVisuals.ts, ordered rung for rung — tar becomes the deepest
 * resin, white stays the palest honey — so every layered oil effect keeps its shading.
 * The iridescent film (violet/teal) becomes the honey streaks running through amber, and the
 * steel hardware becomes fossil stone and bone.
 */
const AMBER_PALETTE: Record<number, number> = {
  0x07050a: 0x3a1a05, // tar → deepest resin
  0x140d08: 0x5c2a07, // crude → dark amber
  0x2b1c0c: 0x7a3c0c, // sludge → resin shadow
  0x5a3a12: 0x9a5212, // brown → burnt amber
  0x8a4f14: 0xb8661a, // rust → copal
  0xc47a2a: 0xd9861f, // amber → amber
  0xffaa00: 0xffb52e, // gold → lit honey
  0xff6600: 0xff7a1a, // flame → resin fire
  0xff2200: 0xff3b1f, // ember → laser red
  0x7a4fd0: 0xa8641a, // violet (film) → honey streak, dim
  0x2fd6c0: 0xe0a848, // teal (film) → honey streak, bright
  0x555f6b: 0x6b5a45, // steel → fossil stone
  0xb8c4d0: 0xe8d6b0, // chrome → old bone
  0xffffff: 0xfff6e0, // white → pale honey
  0x4f5c2f: 0x4e5a28, // olive → cycad leaf
  0x303c27: 0x2f3b1a, // moss → fern shade
};

export const AMBER_SKIN: SkinDef = {
  id: 'amber',
  name: 'Amber',
  description: 'Become a hatchling set in fossil resin — pterosaurs that fire lasers, and a T-rex stampede for a train.',
  elementId: 'oil',
  avatar: 'amber',
  bodyTint: [0xffc04a, 0x9a4e0c],
  // Oil spawns no `proj-*` sprite of its own (every shot is a hitscan beam drawn in Graphics),
  // so the palette above is the whole recolour.
  palette: AMBER_PALETTE,
  paletteFallback: 0xd9861f,
};
