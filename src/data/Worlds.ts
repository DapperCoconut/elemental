export type NodeKind = 'fight' | 'shop' | 'challenge' | 'invasion' | 'gauntlet';

export interface WorldNode {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
}

export interface World {
  id: string;
  name: string;
  emoji: string;
  color: number;
  parentId: string | null;
  mapX: number;
  mapY: number;
  nodes: WorldNode[];
}

export function makeNodes(worldId: string): WorldNode[] {
  return [
    { id: `${worldId}-fight-1`, kind: 'fight', x: 190, y: 290 },
    { id: `${worldId}-fight-2`, kind: 'fight', x: 310, y: 230 },
    { id: `${worldId}-fight-3`, kind: 'fight', x: 450, y: 290 },
    { id: `${worldId}-fight-4`, kind: 'fight', x: 590, y: 230 },
    { id: `${worldId}-fight-5`, kind: 'fight', x: 720, y: 290 },
    { id: `${worldId}-shop`,      kind: 'shop',      x: 190, y: 450 },
    { id: `${worldId}-challenge`, kind: 'challenge', x: 820, y: 430 },
    { id: `${worldId}-invasion`,  kind: 'invasion',  x: 340, y: 515 },
    { id: `${worldId}-gauntlet`,  kind: 'gauntlet',  x: 580, y: 515 },
  ];
}

export const WORLDS: World[] = [
  // ── Root ──────────────────────────────────────────────────────────
  { id: 'fire',     name: 'Fire',     emoji: '🔥', color: 0xff4400, parentId: null, mapX: 480, mapY: 70,  nodes: makeNodes('fire') },

  // ── Tier 1 (children of fire) ─────────────────────────────────────
  { id: 'water',    name: 'Water',    emoji: '💧', color: 0x0088ff, parentId: 'fire', mapX: 140, mapY: 210, nodes: makeNodes('water') },
  { id: 'life',     name: 'Life',     emoji: '🌿', color: 0x44cc44, parentId: 'fire', mapX: 360, mapY: 210, nodes: makeNodes('life') },
  { id: 'air',      name: 'Air',      emoji: '💨', color: 0xaaddff, parentId: 'fire', mapX: 580, mapY: 210, nodes: makeNodes('air') },
  { id: 'earth',    name: 'Earth',    emoji: '🪨', color: 0x887755, parentId: 'fire', mapX: 800, mapY: 210, nodes: makeNodes('earth') },

  // ── Tier 2: Water children ────────────────────────────────────────
  { id: 'oil',      name: 'Oil',      emoji: '🛢️', color: 0x664400, parentId: 'water', mapX: 40,  mapY: 390, nodes: makeNodes('oil') },
  { id: 'ice',      name: 'Ice',      emoji: '🧊', color: 0x88ccff, parentId: 'water', mapX: 130, mapY: 390, nodes: makeNodes('ice') },
  { id: 'growth',   name: 'Growth',   emoji: '🦠', color: 0x88bb22, parentId: 'water', mapX: 225, mapY: 390, nodes: makeNodes('growth') },
  { id: 'crystal',  name: 'Crystal',  emoji: '💎', color: 0x88ccff, parentId: 'water', mapX: 320, mapY: 390, nodes: makeNodes('crystal') },

  // ── Tier 2: Life children ─────────────────────────────────────────
  { id: 'hunt',     name: 'Hunt',     emoji: '🐺', color: 0xcc4400, parentId: 'life',  mapX: 430, mapY: 390, nodes: makeNodes('hunt') },
  { id: 'soul',     name: 'Soul',     emoji: '👻', color: 0xccaaff, parentId: 'life',  mapX: 520, mapY: 390, nodes: makeNodes('soul') },

  // ── Tier 2: Air children ──────────────────────────────────────────
  { id: 'shadow',   name: 'Shadow',   emoji: '🌑', color: 0x330044, parentId: 'air',   mapX: 610, mapY: 390, nodes: makeNodes('shadow') },

  // ── Tier 2: Earth children ────────────────────────────────────────
  { id: 'creation', name: 'Creation', emoji: '⚒️', color: 0xcc6622, parentId: 'earth', mapX: 720, mapY: 390, nodes: makeNodes('creation') },
  { id: 'gravity',  name: 'Gravity',  emoji: '🌌', color: 0x8844cc, parentId: 'earth', mapX: 820, mapY: 390, nodes: makeNodes('gravity') },
  { id: 'sand',     name: 'Time',     emoji: '⏳', color: 0xffdd44, parentId: 'earth', mapX: 920, mapY: 390, nodes: makeNodes('sand') },
];

export function getWorld(id: string): World | undefined {
  return WORLDS.find((w) => w.id === id);
}

export function getChildWorlds(parentId: string): World[] {
  return WORLDS.filter((w) => w.parentId === parentId);
}

export function getFightNodes(world: World): WorldNode[] {
  return world.nodes.filter((n) => n.kind === 'fight');
}

// Campaign totals live in AbstractWorlds.ts, next to ALL_WORLDS — counting them here
// would have meant counting one realm out of three, and this module cannot see the
// other two without an import cycle.
