import type { PortBundle } from '../../../../IslesTypes';
import { STILTHAVEN_AREA } from './stilthaven';
import { STILTHAVEN_FLOOR } from './floor';
import { ROD_ITEMS, RODS, SEA_FISH, SEA_FISH_ITEMS, STILTHAVEN_SEA } from './fishing';
import { PORT_BAKERIES, PORT_ITEMS, PORT_SCRIPTS, PORT_SHOPS } from './items';
import { STILTHAVEN_QUESTS } from './quests';
import { TANSY } from './wanderer';

/**
 * Fangmire's port content: Stilthaven (the stilt harbour at the mire's edge that every crossing lands
 * at), its five quests, Tansy Rue the wanderer, the six sea fish and the antivenin rod, the port's two
 * shops and the Honeyed Fang — plus the arena floor every Stilthaven quest duel is fought on
 * (registered by the engine under the key `stilthaven`; those duel foes carry `court: 'stilthaven'`).
 */
export const SLIME_PORT: PortBundle = {
  area: STILTHAVEN_AREA,
  wanderer: TANSY,
  quests: STILTHAVEN_QUESTS,
  items: [...PORT_ITEMS, ...SEA_FISH_ITEMS, ...ROD_ITEMS],
  scripts: PORT_SCRIPTS,
  shops: PORT_SHOPS,
  bakeries: PORT_BAKERIES,
  fish: SEA_FISH,
  fisheries: [STILTHAVEN_SEA],
  rods: RODS,
  floor: STILTHAVEN_FLOOR,
};
