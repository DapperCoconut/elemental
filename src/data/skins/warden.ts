import type { SkinDef } from '../Skins';

/**
 * Warden: echo's whole palette pulled out of moonlit indigo and down into the deep dark —
 * sculk teal for the sound, soul-cyan for its crests, and amethyst where the lantern's warm
 * light used to be. Keys are the exact values of the ECHO palette in EchoVisuals.ts, ordering
 * preserved rung for rung within each family, so every layered chirp keeps its shading.
 */
const WARDEN_PALETTE: Record<number, number> = {
  0x0a0a16: 0x03100f, // voidBlack — the deep dark
  0x221133: 0x0a2228, // umbra — sculk in shadow
  0x3b3566: 0x0f3d47, // dusk — sculk
  0x5a63a0: 0x16606b, // slate — wet sculk
  0x8890d0: 0x1f8f99, // mist — sculk vein
  0xaab4ff: 0x29c4d1, // pale — soul glow
  0xccccff: 0x5fe6ef, // lilac — soul cyan
  0xe8ecff: 0xb4fbff, // ghost — soul crest
  0xffffff: 0xeaffff, // white — sonic white
  0xffffaa: 0xe0c4ff, // lamp — amethyst light
  0xfff7cc: 0xf3e6ff, // lampCore — amethyst core
  0xffdd44: 0xb57cf5, // gold — amethyst
  0xffcc55: 0x9a5fe0, // amber — amethyst shade
  0x551122: 0x2a1250, // terrorDeep — budding amethyst
  0xdd2c44: 0x7c3fd0, // terror — amethyst shard
  0xff6677: 0xb98cff, // terrorHi — amethyst glint
  0x66ffcc: 0x2ee8d8, // biolum — sculk sensor
  0x99ffdd: 0x7af5ea, // biolumHi — sensor lit
  0xccffee: 0xc4fff8, // biolumPale — sensor flare
  0x99ffee: 0x6ff3ff, // sonar — shrieker pulse
};

export const WARDEN_SKIN: SkinDef = {
  id: 'warden',
  name: 'Warden',
  description: 'The deep-dark Warden — sonic booms for clicks, amethyst for blossoms, and a blocky bat form.',
  elementId: 'echo',
  avatar: 'warden',
  bodyTint: [0x0f3d47, 0x08262d],
  palette: WARDEN_PALETTE,
  paletteFallback: 0x29c4d1,
};
