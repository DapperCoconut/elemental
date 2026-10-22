import type { SkinDef } from '../Skins';

/**
 * Hollow: Cloth's whole palette pulled out of rose wool and into a small knight's colours —
 * black-blue cloak, white shell, pale soul. Keys are the exact values of the CLT palette in
 * ClothVisuals.ts (plus the kit's BANDAGE and the tapestry's artwork colours, which are drawn
 * through the same mapper), ordering preserved rung for rung: the ink end stays the darkest,
 * steel-white stays the brightest.
 */
const HOLLOW_PALETTE: Record<number, number> = {
  0x1a0d12: 0x05060a, // ink — void black
  0x30161f: 0x10121c, // deep — abyss
  0xd1435c: 0x3b4258, // cloth — the cloak
  0xf5788c: 0x6a7590, // clothLit — cloak in the light
  0x8a2135: 0x1f2433, // clothDeep — cloak folds
  0x52101f: 0x12141d, // clothRim — cloak edge
  0xae2f48: 0x2c3244, // clothMid — cloak mid
  0xf7c3cc: 0xdfe6f2, // clothPale — pale shell
  0xd8dfe8: 0xe8ecf4, // steel — the nail
  0xffffff: 0xffffff, // steelLit — nail edge
  0x6d7684: 0x6e7688, // steelDark — nail shadow
  0xe0a33c: 0xa9c6e8, // brass — soul
  0xffd98a: 0xe6f0ff, // brassLit / emberLit (same value) — bright soul
  0x7a5312: 0x46597a, // brassDark — dim soul
  0x9b5de5: 0x5b8fd6, // pinned — lifeblood
  0xd0a8ff: 0x9fd0ff, // pinnedLit — lifeblood glow
  0x4b2472: 0x23406f, // pinnedDark — lifeblood deep
  0xff7a4d: 0x8fb5a0, // thorn — thorns of agony (also the Thorns artwork)
  0x6fd6f0: 0x9ad8ee, // line — soul thread (also the Speedy artwork)
  0xc7f2ff: 0xd8f4ff, // lineLit — soul thread lit
  0x1f6b85: 0x2c6d86, // lineDark — soul thread deep
  0xe8ddc4: 0xd9d4c8, // web — silk
  0x9a8d6f: 0x8a8578, // webDark — old silk
  0xff9130: 0xe04848, // ember — grimm flame
  0x8c3a06: 0x7a1420, // emberDark — grimm ember
  0x3d2630: 0x1b1f2b, // loom — charm board
  0x6b4453: 0x3c4560, // loomLit — charm board edge
  0x2b2b33: 0x22252f, // suit
  0x6b4a2f: 0x4a3f36, // coat
  0xcfe4f5: 0xd8e4f0, // silk
  0x4d7a5c: 0x3f6656, // hoodie
  0xf2ede4: 0xf0f2f6, // BANDAGE (ClothKit)
  0xf1e7d0: 0xeef0f4, // artwork: sharpness — nail white
  0x67d98a: 0x5fbf7f, // artwork: survive — grub green
  0xc79bf0: 0xb7a2e8, // artwork: braid — dreamer violet
  0xffd166: 0xf0c870, // artwork: quick — quick slash gold
  0xb8c4d6: 0xa8b8cc, // artwork: technique — pale ore
  0xe08bb8: 0xd88fb0, // artwork: odd — unbreakable pink
  0xff4d6d: 0xe85a5a, // artwork: right-click — fury red
};

export const HOLLOW_SKIN: SkinDef = {
  id: 'hollow',
  name: 'Hollow',
  description: 'A small horned knight in a dragging cloak — direct nail stabs, a charm board for a tapestry, and Bleed Stop gives way to the void within.',
  elementId: 'cloth',
  avatar: 'hollow',
  // Cloth is bodyless; the repaint only matters if a sprite ever peeks past the cloak.
  bodyTint: [0x262c3d, 0x0d0f17],
  palette: HOLLOW_PALETTE,
  paletteFallback: 0x3b4258,
};
