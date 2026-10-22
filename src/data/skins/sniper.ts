import type { SkinDef } from '../Skins';

/**
 * Sniper: Radiation's lead-and-neon ladder pushed into a bushman's kit. The lead plate becomes
 * khaki canvas and sun-dried timber, the neon load becomes jarate yellow, the hazard stripe a
 * brass shell-casing orange and the hot ladder a laser-sight red. Luminance order is kept rung
 * for rung, so every layered effect keeps its shading. Keys mirror `RAD` in RadiationVisuals.
 */
const SNIPER_PALETTE: Record<number, number> = {
  0x0b0614: 0x120c06, // ink        → bark black
  0x1c1030: 0x2e2012, // leadDeep   → shadowed timber
  0x33194f: 0x5a4024, // lead       → khaki canvas / weathered wood
  0x512b78: 0x8a6a3e, // leadLit    → sunlit khaki
  0x7a3fb0: 0xa8844e, // seam       → rope / stitching tan
  0x1f5a10: 0x6b5a0c, // neonDeep   → stale jarate
  0x3f9e18: 0xb39a14, // neonMid    → jarate body
  0x7cff3d: 0xf2d924, // neon       → fresh jarate yellow
  0xc2ff8f: 0xfaee82, // neonLit    → jarate froth
  0xeeffdc: 0xfff9d8, // wash       → pale wash
  0xe0b52a: 0xe08a2c, // hazard     → brass casing orange
  0x6d550c: 0x6a3a10, // hazardDeep → tarnished brass
  0xf6ffe8: 0xfffbe8, // core       → muzzle-flash white
  0x4d0c05: 0x4a0806, // hotDeep    → laser dark
  0xa8180b: 0xa8100c, // hotMid     → laser mid
  0xff3524: 0xff2a1e, // hot        → laser-sight red
  0xff9b84: 0xff9a88, // hotLit     → laser bloom
};

export const SNIPER_SKIN: SkinDef = {
  id: 'sniper',
  name: 'Sniper',
  description: 'A bushman with a giant rifle, a jar of something nasty, a kukri, and a proper sniper nest.',
  elementId: 'radiation',
  avatar: 'sniper',
  bodyTint: [0x8a6a3e, 0x5a4024],
  palette: SNIPER_PALETTE,
  paletteFallback: 0xb39a14,
};
