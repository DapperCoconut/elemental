import type { SkinDef } from '../Skins';

/**
 * Rage: electricity's whole palette pushed off yellow-and-blue and into red-hot fury. Keys are
 * the exact values of the ELECTRIC palette in ElectricityVisuals.ts (plus the few tone literals
 * declared beside it), ordering preserved rung for rung — char stays char, white-hot stays the
 * brightest thing on screen — so every layered bolt keeps the shading it was drawn with.
 *
 * `volt → 0xff5a2a` is also the gate: `RageFx.isRageTint` recognises a Rage mapper by it, and
 * the bolt primitive redraws itself as a heat streak. Change it in both places or neither.
 */
const RAGE_PALETTE: Record<number, number> = {
  // ── Live side (the player's current) ──
  0x120c00: 0x140303, // tar — char
  0x3a2a00: 0x3d0808, // ash — scab
  0x8a5a00: 0x7a1010, // copper — dried blood
  0xcc8800: 0xb3180f, // amber — crimson
  0xffaa00: 0xe02414, // current — red
  0xffcc22: 0xff3a1f, // live — hot red
  0xffee00: 0xff5a2a, // volt — searing (Rage's gate colour)
  0xffff66: 0xff9a5c, // neon — flare
  0xffffff: 0xfff0e0, // white — white heat
  // ── Storm side (NPC tones, clouds) — darker, bloodier, so two Rages still read apart ──
  0x0e1a2a: 0x1a0406, // abyss
  0x224466: 0x4a0a14, // steel
  0x3377bb: 0x8a1424, // cobalt
  0x66aaee: 0xc8283a, // arc
  0x88ccff: 0xff6070, // sky
  0xcce8ff: 0xffc4c4, // pale
  // ── Ball lightning → a ball of molten temper ──
  0x1a0a2a: 0x2a0604, // plasma shell
  0x7733cc: 0x8f1a0a, // violet
  0xaa66ff: 0xd23c12, // plasma
  0xcc88ff: 0xff7a3a, // orchid
  // ── Phoenix perk — already warm, pushed hotter ──
  0x330800: 0x300404, // phoenix shell
  0x993300: 0x8a1a0c, // phoenix glow
  0xff6600: 0xff4a14, // ember
  0xff9900: 0xffb070, // flare
  // ── Battery casing shadow ──
  0x000000: 0x000000, // black
};

export const RAGE_SKIN: SkinDef = {
  id: 'rage',
  name: 'Rage',
  description: 'Red-hot rage fills him instead of lightning. How dare you hurt him.',
  elementId: 'electricity',
  avatar: 'rage',
  bodyTint: [0xc8301e, 0x5c0c0c],
  projectileTint: [0xff9a5c, 0xb3180f],
  projectileTextures: ['proj-electro'],
  palette: RAGE_PALETTE,
  paletteFallback: 0xe02414,
};
