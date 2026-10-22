import type { SkinDef } from '../Skins';

/**
 * Witch: Creation's forge palette walked off copper and brass and into a witch's colours —
 * soot and iron become crow-black and plum, the copper/bronze body becomes robe violet, and
 * the hot end (ember → brass → gold → spark) becomes brew green, so every layered effect keeps
 * the shading it was drawn with. Keys are the exact values of `CREATION` in CreationVisuals.ts,
 * ordering preserved rung for rung.
 */
const WITCH_PALETTE: Record<number, number> = {
  0x2a1206: 0x0e0814, // soot   → crow black
  0x4a2c14: 0x1f1230, // iron   → deep plum
  0x6b4a2a: 0x2e1a45, // timber → plum
  0x8a4a1c: 0x40235e, // bronze → robe violet
  0x8a5a2a: 0x4b2a6c, // wood   → robe violet, lit
  0xa8551f: 0x60309a, // rust   → violet
  0xcc6622: 0x7a3fc0, // copper → bright violet
  0xcc8844: 0x8c5ccc, // tan    → amethyst
  0xee8833: 0x4fbf46, // ember  → brew green
  0xffaa44: 0x6fd655, // brass  → hex green
  0xffdd22: 0x9be86e, // gold   → lit green
  0xffee99: 0xd0ffa6, // spark  → pale green
  0x8891a8: 0x6c6684, // steel  → pewter violet
  0xccccdd: 0xc9bce0, // silver → lavender
  0xff3399: 0xb048ff, // nexus  → cauldron violet
  0xff88cc: 0xd9a8ff, // nexusLit → lilac glow
  0xffffff: 0xf6fff0, // white  → green-white
};

export const WITCH_SKIN: SkinDef = {
  id: 'witch',
  name: 'Witch',
  description: 'A cackling witch — crows for daggers, a bubbling cauldron for the Nexus, spells for mechs and hexes for everything she builds.',
  elementId: 'creation',
  avatar: 'witch',
  // The sprite peeks out round the face: green skin at the top, robe violet below.
  bodyTint: [0x8cc26a, 0x3c2158],
  // Creation spawns no `proj-*` sprites — daggers, bolts and wrenches are all Graphics, so
  // the palette above (and the witch art in WitchFx) is the whole recolour.
  palette: WITCH_PALETTE,
  paletteFallback: 0x7a3fc0,
};
