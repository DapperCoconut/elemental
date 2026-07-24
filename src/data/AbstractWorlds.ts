import { World, makeNodes, WORLDS } from './Worlds';

export const ABSTRACT_WORLDS: World[] = [
  // Tier 0 (root)
  { id: 'electricity', name: 'Electricity', emoji: '⚡', color: 0xffee00, parentId: null,           mapX: 480, mapY: 70,  nodes: makeNodes('electricity') },

  // Tier 1 (children of electricity)
  { id: 'slime',       name: 'Acid',        emoji: '🟢', color: 0x66cc44, parentId: 'electricity', mapX: 140, mapY: 210, nodes: makeNodes('slime') },
  { id: 'fate',        name: 'Fate',        emoji: '🃏', color: 0x88eecc, parentId: 'electricity', mapX: 360, mapY: 210, nodes: makeNodes('fate') },
  { id: 'sound',       name: 'Sound',       emoji: '🔊', color: 0xff66cc, parentId: 'electricity', mapX: 580, mapY: 210, nodes: makeNodes('sound') },
  { id: 'light',       name: 'Light',       emoji: '✨', color: 0xfff4a8, parentId: 'electricity', mapX: 800, mapY: 210, nodes: makeNodes('light') },

  // Tier 2: slime children
  { id: 'magnet',      name: 'Magnet',      emoji: '🧲', color: 0xcc2244, parentId: 'slime', mapX:  40, mapY: 390, nodes: makeNodes('magnet') },
  { id: 'metal',       name: 'Metal',       emoji: '⚙️',  color: 0x8899aa, parentId: 'slime', mapX: 130, mapY: 390, nodes: makeNodes('metal') },
  { id: 'plasma',      name: 'Plasma',      emoji: '🔮', color: 0xaa22ff, parentId: 'slime', mapX: 225, mapY: 390, nodes: makeNodes('plasma') },
  { id: 'rubber',      name: 'Rubber',      emoji: '🪀', color: 0xff5577, parentId: 'slime', mapX: 320, mapY: 390, nodes: makeNodes('rubber') },

  // Tier 2: fate children
  { id: 'gunpowder',   name: 'Gunpowder',   emoji: '💀', color: 0x440066, parentId: 'fate',  mapX: 430, mapY: 390, nodes: makeNodes('gunpowder') },
  { id: 'echo',        name: 'Echo',        emoji: '🦇', color: 0xccccff, parentId: 'fate',  mapX: 520, mapY: 390, nodes: makeNodes('echo') },

  // Tier 2: sound children
  { id: 'silence',     name: 'Silence',     emoji: '🫥', color: 0x1a0022, parentId: 'sound', mapX: 610, mapY: 390, nodes: makeNodes('silence') },

  // Tier 2: light children
  { id: 'magic',       name: 'Magic',       emoji: '📖', color: 0x9944ff, parentId: 'light', mapX: 720, mapY: 390, nodes: makeNodes('magic') },
  { id: 'technology',  name: 'Technology',  emoji: '💻', color: 0x44ccaa, parentId: 'light', mapX: 820, mapY: 390, nodes: makeNodes('technology') },
  { id: 'quantum',     name: 'Subterfuge',  emoji: '🕴️',  color: 0xcc2233, parentId: 'light', mapX: 920, mapY: 390, nodes: makeNodes('quantum') },
];

export function getAbstractWorld(id: string): World | undefined {
  return ABSTRACT_WORLDS.find((w) => w.id === id);
}

export function getAbstractChildWorlds(parentId: string): World[] {
  return ABSTRACT_WORLDS.filter((w) => w.parentId === parentId);
}

export function getAnyWorld(id: string): World | undefined {
  return WORLDS.find((w) => w.id === id) ?? ABSTRACT_WORLDS.find((w) => w.id === id);
}
