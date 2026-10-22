import type { SkinDef } from '../Skins';

/**
 * Jason — Silence as the camp-lake slasher. The plum fog becomes night mist off a black lake,
 * the violets become pine shadow and moss, and the blood stays blood. Silence spawns no
 * `proj-*` sprites (its spit is painted), so there is no projectile tint.
 */
export const JASON_SKIN: SkinDef = {
  id: 'jason',
  name: 'Jason',
  description: 'Bulky, masked, machete in hand. He bursts into flame when the hunt turns final.',
  elementId: 'silence',
  avatar: 'jason',
  // Work jacket: drab olive at the shoulders, soot-brown at the hem.
  bodyTint: [0x4a4636, 0x2a281e],
  palette: {
    0x05000a: 0x020605, // void      → lake bottom
    0x0a0010: 0x070d0b, // pitch     → night water
    0x1a0022: 0x141d1a, // bruise    → wet pine bark
    0x2a1038: 0x22302b, // plum      → murky lake
    0x442255: 0x3a4a40, // violet    → pine shadow
    0x6622aa: 0x5b6b4a, // amethyst  → moss
    0x8844cc: 0x8a8f6a, // orchid    → lichen
    0xcc99ff: 0xc4cbb2, // lilac     → lake mist
    0xeeddff: 0xe8ecdc, // pale      → moonlit mist
    0xffffff: 0xffffff, // white     → white
    0xddddcc: 0xe6e2d0, // bone      → hockey-mask bone
    0xddddee: 0xdcdcd0, // sclera    → dull sclera
    0xcc1133: 0xb3101c, // blood     → blood
    0xff2233: 0xe62a1e, // gore      → fresh gore
    0x881122: 0x7a1410, // rust      → dried blood
    0x661122: 0x5c1a12, // meat      → raw meat
    0xb49a6a: 0xa48d62, // burlap    → sack-cloth
    0x7d6440: 0x6e5a3a, // twine     → rope
    0x7a8a66: 0x6d7a52, // bile      → lake slime
    0x9aaa88: 0x8c9a70, // bileHi    → lit slime
  },
  paletteFallback: 0x3a4a40,
};
