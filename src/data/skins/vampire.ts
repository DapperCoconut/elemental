import type { SkinDef } from '../Skins';

/**
 * Vampire (hunt): a vampire hunter in a wide-brim hat and long coat, garlic round his neck and
 * stakes on his chest — whose beast morph turns him into the bloodsucker he hunts, and whose
 * hybrid is the hunter half-turned. Crossbow bolts fly as wooden stakes, grenades are lit
 * garlic bulbs.
 *
 * Gothic palette: hunt's gunpowder orange becomes crimson, its hide and fur go to coat-black,
 * brass goes to old silver and bone goes to garlic white. Luminance order is kept key for key.
 */
const VAMPIRE_PALETTE: Record<number, number> = {
  // ── HUNT const ──
  0x1a0a06: 0x0c060c, // pitch → coffin black
  0x3d1a0e: 0x22101e, // hide → coat black-plum
  0x6b2412: 0x4a0a1c, // rust → old wine
  0xcc4400: 0x9c1230, // ember → crimson
  0xff6600: 0xc8243e, // flare → bright crimson
  0xffaa44: 0xe8b8c2, // spark → rose silver
  0x8b0000: 0x5c0016, // gore → dark blood
  0xcc1111: 0x9e0c26, // blood → blood
  0xff2222: 0xd61c3a, // fresh → fresh blood
  0xf2e3c8: 0xf2ecd6, // bone → garlic white
  0xdddde6: 0xe0e2ec, // silver → silver
  0x9aa0ab: 0xa2a6b6, // steel → steel
  0x5a3a1e: 0x5e3a24, // wood → stake ash-wood
  0x8a5c30: 0x92643a, // woodLit → lit ash-wood
  0x41464d: 0x26262e, // gun → blued black
  0x6d757f: 0x585c6a, // gunLit → gunmetal
  0xc9a227: 0xb6b8c6, // brass → old silver
  0xa61e1e: 0x7a0c24, // hull → garnet
  0xd8cbb0: 0xe2d8b8, // cord → garlic string
  0x1c0508: 0x0e0208, // maw → maw
  0xb0384a: 0x8c1a36, // tongue → tongue
  0x452213: 0x1c1018, // fur → cape black
  0x7a4222: 0x3c2032, // furLit → cape sheen
  0xff5544: 0xe0263e, // moon → blood moon
  0x440d0d: 0x2a0612, // moonDark → moon dark
  0x2a2420: 0x1c1a22, // smoke → grave smoke
  0xffffff: 0xffffff, // white → white
  // ── Tone literals (HuntVisuals tone sets) ──
  0x2c0606: 0x1a040c, // beast crust
  0xff8877: 0xf07484, // moon lit
  0x140302: 0x0a0208, // hell crust
  0xffcc66: 0xf6dce4, // hell lit
  0x3a3f46: 0x30323c, // silver crust
  0xf2f4ff: 0xf4f4ff, // silver lit
  // ── Other kit literals ──
  0x5a4736: 0xcfc4a2, // grenade fuse cord → garlic stem
  0x2f4a24: 0x2a3a22, // heal grenade shell
  0x44cc44: 0x8ccf7a, // heal grenade trim
  0xb9bfc6: 0xc0c2d0, // alpha tint
};

export const VAMPIRE_SKIN: SkinDef = {
  id: 'vampire',
  name: 'Vampire',
  description: 'A vampire hunter with garlic and stakes in tow — whose morphs turn him into the bloodsucker he hunts, or something in between.',
  elementId: 'hunt',
  avatar: 'vampire',
  bodyTint: [0x2a1424, 0x0e060c],
  palette: VAMPIRE_PALETTE,
  paletteFallback: 0x9c1230,
};
