import type { SkinDef } from '../Skins';

/**
 * Rockstar (Sound): the drum major turned punk — black leather, hot pink, electric purple and
 * chrome. Keyed by every value of `SOUND` in SoundVisuals.ts, luminance order preserved: the
 * night stays the darkest, the white-hot stays the brightest. The three soul songs, the sour
 * Out of Tune yellow and the Bass perk's water stay close to their own hues — they are reads,
 * not decoration.
 */
const ROCKSTAR_PALETTE: Record<number, number> = {
  0x16060b: 0x0c0714, // night — the venue goes black-purple
  0x0b0306: 0x050309, // shade
  0x6e1427: 0x6a1fb0, // maroon → electric purple (the element)
  0x3a0812: 0x2a0b4a, // maroonDeep
  0xa82c48: 0xa040ff, // maroonHi
  0xdc8a9a: 0xd9a8ff, // maroonPale
  0xb8324f: 0xff2d95, // magenta → hot pink
  0xe47a8f: 0xff70b8, // rose
  0xf6c9d1: 0xffc4e4, // blush
  0x7c2a44: 0x7a1f9e, // violet
  0x4a0f1e: 0x3a0c55, // plum
  0xf0c04e: 0xff3fa4, // gold → hot pink accent (braid, beat window)
  0xffe8a6: 0xffc8ea, // goldHi
  0x93681f: 0x8a1456, // goldShade
  0xffa51c: 0xc24dff, // goldRich → electric purple sliver (Musical Perfection)
  0xffd36b: 0xe6b3ff, // goldRichHi
  0xb87a2e: 0x9aa0b4, // bronze → chrome crash cymbal
  0xf2c072: 0xe8ecf6, // bronzeHi
  0x5e3a12: 0x3c4050, // bronzeDark
  0xd9a441: 0xc4cad8, // brass → chrome
  0xffe9a8: 0xf4f6ff, // brassHi
  0x8c6420: 0x5c6274, // brassShade
  0xe4e8f2: 0xeef0f8, // chrome
  0x8a90a6: 0x8a8ea8, // steel
  0x4a4f62: 0x3a3d4e, // steelDark
  0xfff6ee: 0xfdf2ff, // ivory
  0xf4efe8: 0xf0eaf4, // glove
  0xc9c1b6: 0xbdb4c8, // gloveShade
  0x1c0a10: 0x120a18, // shako → black leather
  0x3a1622: 0x2e1a3c, // shakoHi
  0xff3b4a: 0xff3b5c, // staccato — stays red
  0xff9aa2: 0xff9ab0, // staccatoPale
  0x3f8cff: 0x4f7dff, // melody — stays blue
  0xa6c8ff: 0xaec0ff, // melodyPale
  0x3fd27a: 0x3fe08a, // smooth — stays green
  0xa8f0c4: 0xaef4cc, // smoothPale
  0xc9c43a: 0xc9c43a, // sour — Out of Tune must clash, unchanged
  0x6b6a14: 0x6b6a14, // sourDark
  0xff3333: 0xff3333, // crimson
  0x22bbdd: 0x22bbdd, // aqua — Bass perk water, unchanged
  0x0a3d66: 0x0a3d66, // brine
  0xd8f6ff: 0xd8f6ff, // foam
  0x6b4a2c: 0x3a3344, // wood → black stage deck
  0x3d2916: 0x1e1a26, // woodDark
  0x9a6c40: 0x6a6080, // woodHi
  0xffffff: 0xffffff, // white
};

export const ROCKSTAR_SKIN: SkinDef = {
  id: 'rockstar',
  name: 'Rockstar',
  description: 'Punk hair, a flying guitar for a baton, and an epic drum solo for the finale.',
  elementId: 'sound',
  avatar: 'rockstar',
  bodyTint: [0x2a2236, 0x0e0a14],
  palette: ROCKSTAR_PALETTE,
  paletteFallback: 0xff3fa4,
};
