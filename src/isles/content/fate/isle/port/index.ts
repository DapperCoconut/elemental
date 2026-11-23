import type { PortBundle } from '../../../../IslesTypes';
import { TOSSWATER_AREA } from './tosswater';
import { TOSSWATER_FLOOR } from './floor';
import { ROD_ITEMS, RODS, SEA_FISH, SEA_FISH_ITEMS, TOSSWATER_SEA } from './fishing';
import { PORT_BAKERIES, PORT_ITEMS, PORT_SCRIPTS, PORT_SHOPS } from './items';
import { TOSSWATER_QUESTS } from './quests';
import { MARLO } from './wanderer';

/**
 * Lotterhaven's port content: Tosswater (the harbour of the Draw that every Outer Sea crossing
 * lands at), its five quests, Marlo Fairshake the wanderer and her magpie Tuppence, the six sea fish
 * and the fortune rod, the port's two shops and the Lucky Loaf — plus the arena floor every
 * Tosswater quest duel is fought on (registered by the engine under the key `tosswater`; those duel
 * foes carry `court: 'tosswater'`).
 */
export const FATE_PORT: PortBundle = {
  area: TOSSWATER_AREA,
  wanderer: MARLO,
  quests: TOSSWATER_QUESTS,
  items: [...PORT_ITEMS, ...SEA_FISH_ITEMS, ...ROD_ITEMS],
  scripts: PORT_SCRIPTS,
  shops: PORT_SHOPS,
  bakeries: PORT_BAKERIES,
  fish: SEA_FISH,
  fisheries: [TOSSWATER_SEA],
  rods: RODS,
  floor: TOSSWATER_FLOOR,
};
