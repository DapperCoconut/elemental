import type { SkinDef } from '../Skins';

/**
 * Conductor: Death's shroud-and-bone ladder walked onto a night platform. Keys are the exact
 * values of the DEA palette in DeathVisuals.ts, ordered rung for rung — the void stays the
 * darkest navy-black, bone becomes ticket cream, white stays white — so every layered Death
 * effect keeps its shading. The three accents keep their jobs: the clock's gold is the brass of
 * the watch, the Disarm yellow is the headlamp, the river is the green signal, and blood is
 * the red of a stop sign.
 */
const CONDUCTOR_PALETTE: Record<number, number> = {
  0x07060d: 0x080b16, // void_  → night
  0x171227: 0x101a30, // shroud → deep navy
  0x342c4e: 0x1c2c4e, // ash    → tunic navy
  0x4d456b: 0x6a7686, // smoke  → coal steam
  0xe9e3d2: 0xf2ead6, // bone   → ticket cream
  0xb0a992: 0xd9c9a0, // pale   → card stock
  0xd6dde8: 0x9aa3ae, // blade  → rail steel
  0xffffff: 0xffffff, // edge   → white
  0xd9b23a: 0xc99a2e, // gold   → brass
  0x8a6a20: 0x7a5a16, // brass  → dark brass
  0xf5e14a: 0xffd84a, // after  → headlamp
  0x54cbb2: 0x3fbf6a, // styx   → signal green
  0x1d5f56: 0x1e5e3a, // deep   → signal green, unlit
  0xc42a3a: 0xd8262e, // blood  → stop red
  0xa8875a: 0x8a5e34, // rope   → strap leather
};

export const CONDUCTOR_SKIN: SkinDef = {
  id: 'conductor',
  name: 'Conductor',
  description: 'The last train is never late. Tickets for shurikens, an umbrella for a sword, a stop sign to hold the line — and at midnight, the express.',
  elementId: 'death',
  avatar: 'conductor',
  bodyTint: [0x324a78, 0x101a30],
  // Death spawns no `proj-*` sprite of its own (every shot is drawn in Graphics), so the
  // palette above is the whole recolour.
  palette: CONDUCTOR_PALETTE,
  paletteFallback: 0x1c2c4e,
};
