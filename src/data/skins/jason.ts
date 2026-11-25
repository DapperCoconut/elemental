import type { SkinDef } from '../Skins';

/**
 * Jason — the camp-lake slasher, worn over Fear (element id `silence`; the skin predates the
 * element's replacement). The first block of the palette is the old Silence one, which the
 * skin's own painter (`JasonFx`) still draws with; the second re-dresses Fear's suit tones.
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
    // Fear's palette (the element under this skin since Silence was replaced). Only the suit and
    // the phobias' ink are re-dressed; bone, blood, steel, marble and the rune pass through as they
    // are — there is deliberately no `paletteFallback`, which would paint all of those olive.
    0x121317: 0x141d1a, // suitDeep    → wet pine bark
    0x24262d: 0x2a281e, // suit        → soot-brown work jacket
    0x3f4350: 0x4a4636, // suitLit     → drab olive
    0x0b0a10: 0x070d0b, // tentacle    → night water
    0x3a3350: 0x3a4a40, // tentacleLit → pine shadow
    0xfbf8f0: 0xe6e2d0, // rose        → hockey-mask bone
    0x8d8f96: 0x8a8f6a, // ash         → lichen
    0x3a3b41: 0x22302b, // ashDeep     → murky lake
  },
};
