import type { SkinDef } from '../Skins';

/**
 * Cyborg: crystal's palette moved off ice-blue glass and onto a blood-fuelled war machine —
 * gunmetal and steel blue for the body of every effect, brass and gold where crystal caught the
 * light, and blood red where crystal split it into violet and magenta fringes.
 *
 * Keys are the exact values of the CRYSTAL palette in CrystalVisuals.ts (plus the two raw shades
 * that file routes through the mapper: the attuned shell and the diadem's dark gold). Ordering is
 * preserved rung for rung — onyx becomes gunmetal black, white stays the hottest muzzle white.
 */
const CYBORG_PALETTE: Record<number, number> = {
  0x0d1a2a: 0x0c0f14, // onyx    → gunmetal black
  0x1a3350: 0x1f2a38, // slate   → dark steel
  0x2b6ea8: 0x3d5a78, // azure   → steel blue
  0x66bbdd: 0x7a93ad, // sky     → light steel
  0x88ccff: 0x9fb4c8, // glass   → pale steel
  0x88eeff: 0xffd34a, // prism   → optic gold (crystal's lit edge is V1's yellow light)
  0xaaeeff: 0xc9d6e2, // shine   → polished steel
  0xd8f4ff: 0xe8eef4, // pale    → chrome
  0xffffff: 0xfffbe8, // white   → muzzle white
  0xaa44ff: 0x8a0f14, // violet  → dried blood
  0xcc88ff: 0xc4302b, // orchid  → blood
  0xeeccff: 0xff8a70, // rose    → hot blood
  0xff44aa: 0xd81e1e, // magenta → arterial red
  0xffcc44: 0xe8b030, // gold    → brass
  0xffee88: 0xffe58a, // flare   → pale gold
  0x99ccee: 0x8a9bab, // dull    → worn steel (the NPC's duller lattice)
  0x2a0d40: 0x3a0808, // attuned shell → clotted red
  0x8a6a18: 0x7a5418, // diadem dark gold → dark brass
};

export const CYBORG_SKIN: SkinDef = {
  id: 'cyborg',
  name: 'Cyborg',
  description: 'A blood-fuelled war machine — bullets for shards, and every placed crystal is a coin to ricochet.',
  elementId: 'crystal',
  avatar: 'cyborg',
  bodyTint: [0x4a6584, 0x26364a],
  projectileTint: [0xffd34a, 0xb07a22],
  projectileTextures: ['proj-crystal-kite'],
  palette: CYBORG_PALETTE,
  paletteFallback: 0x7a93ad,
};
