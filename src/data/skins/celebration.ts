import type { SkinDef } from '../Skins';

/**
 * Magma → Celebration. Every `MAG` value, darkest to brightest kept in order: cooled rock
 * becomes grape and plum, the lava ramp becomes pink → bubblegum → lemon → cream. The rainbow
 * bits (candy puddles, piñatas, the float, confetti) are drawn by `CelebrationFx` directly —
 * a one-to-one remap can't make a rainbow.
 */
const CELEBRATION_PALETTE: Record<number, number> = {
  0x1d1113: 0x2a1440, // basalt → ink plum
  0x33201c: 0x46206a, // crustDeep → plum
  0x55322a: 0x6e3394, // crust → grape
  0x7d6863: 0xb48ad0, // ash → lilac
  0x2b2226: 0x3a2650, // smoke → dusk violet
  0xff5a1e: 0xff3d9a, // magma → hot pink
  0xff8b22: 0xff8fd0, // lava → bubblegum
  0xffc44a: 0xffe45c, // gold → lemon
  0xfff0c0: 0xfff6e6, // white → frosting cream
  0xff7733: 0xff6fb8, // ember → candy pink
  0x120a0b: 0x1a0d26, // scorch → deep shadow
  0x241316: 0x2e1a4a, // coat → party-suit violet
  0x3b1f22: 0x48306e, // coatLit → lit violet
  0xb8261f: 0x1d9a7e, // sash → mint ribbon
  0xe6dac4: 0xfff1d6, // bone → icing
  0xc4101c: 0xb0168a, // pendant → magenta
  0xff3b4a: 0xff4fd8, // pendantLit → neon pink
};

export const CELEBRATION_SKIN: SkinDef = {
  id: 'celebration',
  name: 'Celebration',
  description: 'Rainbow candy puddles, a party popper, piñatas that burst into sweets and a parade float full of party-goers.',
  elementId: 'magma',
  avatar: 'celebration',
  bodyTint: [0xff5fae, 0xd23c8c],
  palette: CELEBRATION_PALETTE,
  paletteFallback: 0xff8fd0,
};
