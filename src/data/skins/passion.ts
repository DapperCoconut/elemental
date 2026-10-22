import type { SkinDef } from '../Skins';

/**
 * Passion: Devotion's whole palette (`DEV` in PassionVisuals.ts) turned off holy gold and onto
 * valentine pinks and wine reds. Keys are the exact `DEV` values and the ordering is kept rung for
 * rung — umber ink becomes the deepest wine, the near-white core becomes the palest blush — so
 * every layered Devotion effect keeps its shading. Holy water becomes a violet love potion and the
 * chariot's fire burns rose.
 */
const PASSION_PALETTE: Record<number, number> = {
  0x2b2210: 0x2a0812, // ink → wine black
  0x6e5626: 0x6e1630, // umber → deep wine
  0xb98b2c: 0xb02a4e, // ochre → crimson
  0xe8b93a: 0xe8456e, // gold → rose red
  0xf5e08a: 0xff86a8, // holy (element colour) → love pink
  0xfff2b8: 0xffc4d6, // pale → blush
  0xfffcf0: 0xfff0f5, // white → lace white
  0x2f7fc0: 0x8a2a8c, // waterDeep → potion plum
  0x8fd3ff: 0xe58ad8, // water → potion orchid
  0xd8f2ff: 0xf8d4f2, // waterLit → potion froth
  0xc8461a: 0xb0123a, // fireDeep → ember crimson
  0xff9a2e: 0xff3d6e, // fire → hot rose
  0xffe07a: 0xffa8c0, // fireHot → flame blush
  0x4a2a12: 0x4a1424, // woodDeep → dark cherrywood
  0x8a5a2c: 0x9a2e48, // wood → cherrywood
  0xc08a50: 0xd0607a, // woodLit → lit cherrywood
};

export const PASSION_SKIN: SkinDef = {
  id: 'passion',
  name: 'Passion',
  description: 'The old element reborn — a love meter for faith, and a heart-topped staff, a chest of hearts and a dove-drawn chariot.',
  elementId: 'passion',
  avatar: 'passion',
  bodyTint: [0xff9ab8, 0xd8416a],
  palette: PASSION_PALETTE,
  paletteFallback: 0xff86a8,
};
