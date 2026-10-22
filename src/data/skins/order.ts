import type { SkinDef } from '../Skins';

/**
 * Order — Ruin's opposite. Clean veined marble, gold trim, a soft lapis blue where Ruin burns
 * its ruinic green. Every crumbling thing Ruin draws is drawn intact (see `OrderFx.ts`), so the
 * palette below only has to carry the shading: dark slate shadow → blue-grey vein → marble →
 * gold → white marble, the same dark-to-light order as Ruin's void → ash → iron → ember → bone.
 */
const ORDER_PALETTE: Record<number, number> = {
  0x140a09: 0x262d3d, // voidDark → deep slate: the shadow under a block, never a hole
  0x3a2422: 0x55617a, // ash      → blue-grey marble vein
  0x8f1f18: 0x71809b, // blood    → cool shadow side of the marble
  0x574a49: 0x8d97a8, // stone    → polished grey floor marble
  0xd8203c: 0x6f93cc, // ruby     → lapis / sapphire
  0x6b524a: 0xbfc4cc, // iron     → shaded marble
  0xc4392c: 0xe9e3d6, // red      → cream marble (the element colour)
  0xa4552a: 0xb88d34, // rust     → antique gold
  0xb08a3a: 0xd0ad55, // decay    → bright gold (the Q's mark of order)
  0xe07a33: 0xe8c86e, // ember    → lit gold
  0x7fd6b4: 0x9fcdef, // ancient  → soft sky blue glow
  0xff6a4d: 0xfff2cf, // bright   → white-gold gleam
  0xe6d8cf: 0xfcfaf4, // bone     → pure white marble
};

export const ORDER_SKIN: SkinDef = {
  id: 'order',
  name: 'Order',
  description: 'The opposite of ruin — clean, perfect marble, every pillar still standing.',
  elementId: 'ruin',
  avatar: 'order',
  bodyTint: [0xf4f0e6, 0xcfcac0],
  palette: ORDER_PALETTE,
  paletteFallback: 0xe9e3d6,
};
