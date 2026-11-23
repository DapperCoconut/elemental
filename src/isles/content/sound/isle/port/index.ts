import type { PortBundle } from '../../../../IslesTypes';
import { CARILLON_AREA } from './carillon';
import { CARILLON_FLOOR } from './floor';
import { CARILLON_SEA, ROD_ITEMS, RODS, SEA_FISH, SEA_FISH_ITEMS } from './fishing';
import { PORT_BAKERIES, PORT_ITEMS, PORT_SCRIPTS, PORT_SHOPS } from './items';
import { CARILLON_QUESTS } from './quests';
import { LARK } from './wanderer';

/**
 * Choirholm's port content: Carillon Quay (the harbour of bells that every crossing lands at), its
 * five quests, Lark Halloway the wanderer (and Patter, who speaks for her), the six sea fish and the
 * tuning rod, the port's two shops and the Rising Loaf — plus the arena floor every Carillon quest
 * duel is fought on (registered by the engine under the key `carillon`; those duel foes carry
 * `court: 'carillon'`).
 */
export const SOUND_PORT: PortBundle = {
  area: CARILLON_AREA,
  wanderer: LARK,
  quests: CARILLON_QUESTS,
  items: [...PORT_ITEMS, ...SEA_FISH_ITEMS, ...ROD_ITEMS],
  scripts: PORT_SCRIPTS,
  shops: PORT_SHOPS,
  bakeries: PORT_BAKERIES,
  fish: SEA_FISH,
  fisheries: [CARILLON_SEA],
  rods: RODS,
  floor: CARILLON_FLOOR,
};
