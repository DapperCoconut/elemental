import type { SkinDef } from '../Skins';

/**
 * Animatronic: Clay's wet umber pushed into the grey of a sad child's world, with tarnished
 * gold where the clay caught the light — the gold of the bear that replaces the golem. Keys are
 * the exact values of the CLAY palette in ClayVisuals.ts, darkest to brightest kept in order.
 */
const ANIMATRONIC_PALETTE: Record<number, number> = {
  0x3d2316: 0x232327, // wet — the darkest shadow
  0x57321f: 0x37373d, // deep
  0x704128: 0x4d4d55, // slip
  0x9a5c32: 0x7c7c85, // body — the element colour, sad grey
  0xb9743f: 0x9e8238, // warm — tarnished gold
  0xc38352: 0xbf9d45, // light — gold
  0xf3d7ae: 0xf0dfa6, // sheen — pale gold
  0xfff1d6: 0xfff7dc, // cream
  // eye (0xf3d7ae) shares the sheen value above.
  0x24150e: 0x111114, // pupil
  0x4e9cff: 0x7d8cab, // guide — a cold, faded blue, the one cool note
  0x9fd0ff: 0xcdd8ec, // guideLit
  0x1f1b1a: 0x141417, // bedrock
  0x4a4341: 0x3f3b33, // bedrockLit — blackened brass
  0xb8aa98: 0xb7a67a, // seam — dull gilt
  0xff9a3c: 0xffc637, // kiln — gold light
  0xffe2a8: 0xfff0b5, // kilnHot
  0x6b4a2b: 0x4b4741, // wood — grey board
  0x2a1a0e: 0x1d1c1b, // woodDark
  0xa47c4f: 0x8b8475, // woodLit
};

export const ANIMATRONIC_SKIN: SkinDef = {
  id: 'animatronic',
  name: 'Animatronic',
  description: 'The crying child, grey and tear-streaked, with a golden animatronic bear in place of the golem.',
  elementId: 'clay',
  avatar: 'animatronic',
  bodyTint: [0x9a9aa2, 0x6a6a73],
  palette: ANIMATRONIC_PALETTE,
  paletteFallback: 0x7c7c85,
};
