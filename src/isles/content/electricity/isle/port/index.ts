import type { PortBundle } from '../../../../IslesTypes';
import { TERMINUS_AREA } from './terminus';
import { TERMINUS_FLOOR } from './floor';
import { ROD_ITEMS, RODS, SEA_FISH, SEA_FISH_ITEMS, TERMINUS_SEA } from './fishing';
import { PORT_BAKERIES, PORT_ITEMS, PORT_SCRIPTS, PORT_SHOPS } from './items';
import { TERMINUS_QUESTS } from './quests';
import { WREN } from './wanderer';

/**
 * Voltreach's port content: Terminus (the harbour where the great undersea cable comes ashore, and
 * where every Outer Sea crossing lands), its five quests, Wren Filament the last lamplighter, the six
 * sea fish and the insulated rod, Sockets & Sundries and Varnish & Line, and the Element — plus the
 * arena floor every Terminus quest duel is fought on (registered by the engine under the key
 * `terminus`; those duel foes carry `court: 'terminus'`).
 */
export const ELECTRICITY_PORT: PortBundle = {
  area: TERMINUS_AREA,
  wanderer: WREN,
  quests: TERMINUS_QUESTS,
  items: [...PORT_ITEMS, ...SEA_FISH_ITEMS, ...ROD_ITEMS],
  scripts: PORT_SCRIPTS,
  shops: PORT_SHOPS,
  bakeries: PORT_BAKERIES,
  fish: SEA_FISH,
  fisheries: [TERMINUS_SEA],
  rods: RODS,
  floor: TERMINUS_FLOOR,
};
