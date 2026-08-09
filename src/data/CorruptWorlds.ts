import { World, makeNodes } from './Worlds';

/**
 * The Corrupt Realm — the third campaign map, behind the scarred portal.
 *
 * Seventeen elements the natural order cast out long ago: unstable, half-made,
 * or simply too strange to keep. Exile left them easy prey for the thing
 * beneath the worlds, and their Sovereigns fell first — which is why every
 * world here reads as a ruin of what it should have been.
 *
 * These are the "test" elements. They stay cheat-gated as *playable* kits; here
 * they appear as opponents, which every one of them already supports
 * (NpcOpponent has a do*Abilities path for each).
 *
 * Root: Ruin — the realm's broken heart. The Amalgam waits behind all of it.
 */
export const CORRUPT_WORLDS: World[] = [
  // Tier 0 (root)
  { id: 'ruin',      name: 'Ruin',      emoji: '🧱', color: 0xc4392c, parentId: null,        mapX: 480, mapY: 70,  nodes: makeNodes('ruin') },

  // Tier 1 (children of ruin)
  { id: 'death',     name: 'Death',     emoji: '⚰️', color: 0x4a4468, parentId: 'ruin',      mapX: 140, mapY: 210, nodes: makeNodes('death') },
  { id: 'illusion',  name: 'Illusion',  emoji: '🎭', color: 0xb45cff, parentId: 'ruin',      mapX: 360, mapY: 210, nodes: makeNodes('illusion') },
  { id: 'conquest',  name: 'Conquest',  emoji: '🏰', color: 0xc23a2e, parentId: 'ruin',      mapX: 580, mapY: 210, nodes: makeNodes('conquest') },
  { id: 'gluttony',  name: 'Gluttony',  emoji: '🍖', color: 0xd8452f, parentId: 'ruin',      mapX: 800, mapY: 210, nodes: makeNodes('gluttony') },

  // Tier 2: Death children — the infected, the chained, the recorded.
  { id: 'marrow',    name: 'Marrow',    emoji: '🦴', color: 0xd1435c, parentId: 'death',     mapX: 40,  mapY: 390, nodes: makeNodes('marrow') },
  { id: 'bind',      name: 'Bind',      emoji: '⛓️', color: 0xe0b743, parentId: 'death',     mapX: 130, mapY: 390, nodes: makeNodes('bind') },
  { id: 'paper',     name: 'Paper',     emoji: '📄', color: 0xf2ead6, parentId: 'death',     mapX: 220, mapY: 390, nodes: makeNodes('paper') },

  // Tier 2: Illusion children — the drawn, the read, the loved, the shimmering.
  { id: 'chalk',     name: 'Chalk',     emoji: '🖍️', color: 0xf4f1e6, parentId: 'illusion',  mapX: 305, mapY: 390, nodes: makeNodes('chalk') },
  { id: 'psychic',   name: 'Psychic',   emoji: '👁️', color: 0x9b4dff, parentId: 'illusion',  mapX: 390, mapY: 390, nodes: makeNodes('psychic') },
  { id: 'passion',   name: 'Passion',   emoji: '💘', color: 0xff5fa2, parentId: 'illusion',  mapX: 475, mapY: 390, nodes: makeNodes('passion') },
  { id: 'dune',      name: 'Sand',      emoji: '🏜️', color: 0xe8c87a, parentId: 'illusion',  mapX: 560, mapY: 390, nodes: makeNodes('dune') },

  // Tier 2: Conquest children — spoils, siege fire, scorched earth.
  { id: 'fortune',   name: 'Fortune',   emoji: '🪙', color: 0xd8a531, parentId: 'conquest',  mapX: 645, mapY: 390, nodes: makeNodes('fortune') },
  { id: 'magma',     name: 'Magma',     emoji: '🌋', color: 0xff5a1e, parentId: 'conquest',  mapX: 730, mapY: 390, nodes: makeNodes('magma') },
  { id: 'radiation', name: 'Radiation', emoji: '☢️', color: 0x7cff3d, parentId: 'conquest',  mapX: 815, mapY: 390, nodes: makeNodes('radiation') },

  // Tier 2: Gluttony children — the swallowing deep and the thing that oozes.
  { id: 'depths',    name: 'Depths',    emoji: '🐟', color: 0x0e8f9c, parentId: 'gluttony',  mapX: 880, mapY: 390, nodes: makeNodes('depths') },
  // Slime kept the id `gum` — Acid owns `slime`.
  { id: 'gum',       name: 'Slime',     emoji: '🫠', color: 0x46b93f, parentId: 'gluttony',  mapX: 945, mapY: 390, nodes: makeNodes('gum') },
];

export function getCorruptWorld(id: string): World | undefined {
  return CORRUPT_WORLDS.find((w) => w.id === id);
}

export function getCorruptChildWorlds(parentId: string): World[] {
  return CORRUPT_WORLDS.filter((w) => w.parentId === parentId);
}

export function isCorruptWorld(worldId: string): boolean {
  return CORRUPT_WORLDS.some((w) => w.id === worldId);
}
