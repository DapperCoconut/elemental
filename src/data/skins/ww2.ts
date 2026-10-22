import type { SkinDef } from '../Skins';

/**
 * WW2: Conquest's whole palette moved off heraldic crimson and gold and into olive drab, khaki,
 * gunmetal and brass. Keys are the exact values of `CNQ` in ConquestVisuals.ts, in the same
 * order, with luminance ordering kept (dark stays dark, the hot muzzle/ember colours stay hot).
 *
 * The town colours are mapped to *themselves*: colour is the only thing that says whose a
 * building is, so a skin must never recolour the sides — only the material they are built from.
 */
const WW2_PALETTE: Record<number, number> = {
  0xc23a2e: 0x5b6b2e, // crimson    → olive drab
  0xe8503c: 0x7d8c3e, // banner     → light olive
  0xe8c23a: 0xc9a94a, // gold       → brass
  0x8f6f14: 0x6e5a22, // goldDeep   → dark brass
  0xb8b2a4: 0xb3a47e, // stone      → sandbag khaki
  0x5d574c: 0x5e5640, // stoneDark  → wet burlap
  0x7a5230: 0x6e5a36, // timber     → crate pine
  0x3d2817: 0x34291a, // timberDark → dark pine
  0x8f9aa6: 0x7f8577, // iron       → gunmetal
  0x2e3640: 0x2c302a, // ironDark   → blued steel
  0xe8c9a0: 0xe2c39a, // flesh      → flesh
  0xd6dde6: 0xb9bea8, // steel      → helmet steel
  0xa8242e: 0x8e2a1e, // blood      → dried blood
  0xffe9a8: 0xfff0b8, // muzzle     → muzzle flash
  0xffb03a: 0xffb547, // tracer     → tracer
  0x3a3d4a: 0x3b3e33, // neutral    → mud
  0x54596b: 0x585c4a, // grid       → trench line
  0xf2e8d0: 0xece2c4, // parchment  → field-map paper
  0x9a6ad8: 0x8fae5a, // arcane     → signal green
  0x4a2c78: 0x3c4a26, // arcaneDeep → deep signal green
  0xff7a2a: 0xff7f2e, // ember      → cordite fire
  0xffe08a: 0xffe39a, // emberCore  → cordite core
  0x6b6270: 0x66625a, // ash        → gunsmoke
  0x2a2438: 0x272b1f, // shroud     → camo shadow
  0x6ee87a: 0x8fd879, // mend       → field-medic green
};
// Town colours (PLAYER_TOWN_COLORS / NPC_TOWN_COLORS in ConquestVisuals.ts): identity, so the
// side read survives the skin. Literal rather than imported, to keep Skins.ts free of a
// dependency on the element's visuals module.
for (const c of [0xd83a3a, 0xe8862c, 0xd8c23a, 0xe05fa0, 0x3a7fd8, 0x8f5ad8, 0x2ec4b6, 0x5ad8a0]) WW2_PALETTE[c] = c;

export const WW2_SKIN: SkinDef = {
  id: 'ww2',
  name: 'WW2',
  description: 'A soldier of the Second World War — bayoneted rifle, sandbag bunkers, pillboxes, supply depots and a Sherman for a king.',
  elementId: 'conquest',
  avatar: 'ww2',
  bodyTint: [0x667536, 0x3e4720],
  palette: WW2_PALETTE,
  paletteFallback: 0x5b6b2e,
};
