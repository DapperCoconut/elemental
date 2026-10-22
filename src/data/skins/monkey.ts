import type { SkinDef } from '../Skins';

/**
 * Monkey: Growth as a dart monkey. The monkey's own kit (darts, bloons, tack clusters, spike
 * piles, the bloontonium canister and the three-path upgrade panel) is drawn bespoke in
 * MonkeyFx, so the recolour only has to move what is left — the culture's puffs, motes, nests
 * and sprays — off leaf green and onto glowing bloontonium.
 *
 * This is a computed remap, not a closed table: Growth draws a lot of one-off literals (the
 * syringe, blood, the npc's warm culture) that should keep their own colours, and a table's
 * fallback would flatten all of them. Keys are the GROWTH palette's player culture, ordered
 * rung for rung so every layered effect keeps its shading. The npc's warm culture is mapped
 * the same way, so the skin reads identically from either slot.
 */
const MONKEY_REMAP: Record<number, number> = {
  0x14290c: 0x0c2410, // rot     → deep vat
  0x1a3a10: 0x123d1a, // humus   → vat shadow
  0x2f5a18: 0x1e6a24, // moss    → dark goo
  0x3f7a1f: 0x2fa83a, // leaf    → goo
  0x557733: 0x3fbf4a, // stem    → goo, lit
  0x88bb22: 0x6dff3a, // lime    → bloontonium
  0x99cc22: 0x7aff4a, // shoot   → bloontonium, bright
  0xaadd44: 0xa8ff7a, // sprout  → bloontonium glow
  0xccee88: 0xccffb0, // spring  → pale glow
  0xddffcc: 0xe0ffd0, // pollen  → hot glow
  0x44ddaa: 0x6dff3a, // helix   → bloontonium
  // The npc's warm culture, so a monkey in the npc slot sprays bloontonium too.
  0x6a3a18: 0x2fa83a, // rust    → goo
  0xcc8833: 0x6dff3a, // amber   → bloontonium
  0xdd7733: 0xa8ff7a, // ochre   → bloontonium glow
};

export const MONKEY_SKIN: SkinDef = {
  id: 'monkey',
  name: 'Dart Monkey',
  description: 'Pop! Darts for bacteria, bloons for spores, tack clusters and spike piles for viruses, bloontonium for DNA — and a three-path upgrade panel that changes the monkey as you climb it.',
  elementId: 'growth',
  avatar: 'monkey',
  bodyTint: [0xa06a36, 0x3e2410],
  remap: (base) => MONKEY_REMAP[base] ?? base,
};
