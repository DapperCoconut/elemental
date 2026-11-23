import type { PortBundle } from '../../../../IslesTypes';
import { MERIDIAN_AREA } from './meridian';
import { MERIDIAN_FLOOR } from './floor';
import { MERIDIAN_SEA, ROD_ITEMS, RODS, SEA_FISH, SEA_FISH_ITEMS } from './fishing';
import { PORT_BAKERIES, PORT_ITEMS, PORT_SCRIPTS, PORT_SHOPS } from './items';
import { MERIDIAN_QUESTS } from './quests';
import { SABLE } from './wanderer';

/**
 * Solmara's port content: Meridian Quay (the white harbour under the Endless Noon where every Outer Sea
 * crossing to the Light Isle lands), its five quests, Sable Merrow the wanderer and her luna moth
 * Nocturne, the six sea fish and the prism rod, the port's two shops and the Golden Crust — plus the
 * arena floor every Meridian quest duel is fought on (registered by the engine under the key
 * `meridian`; those duel foes carry `court: 'meridian'`).
 */
export const LIGHT_PORT: PortBundle = {
  area: MERIDIAN_AREA,
  wanderer: SABLE,
  quests: MERIDIAN_QUESTS,
  items: [...PORT_ITEMS, ...SEA_FISH_ITEMS, ...ROD_ITEMS],
  scripts: PORT_SCRIPTS,
  shops: PORT_SHOPS,
  bakeries: PORT_BAKERIES,
  fish: SEA_FISH,
  fisheries: [MERIDIAN_SEA],
  rods: RODS,
  floor: MERIDIAN_FLOOR,
};
