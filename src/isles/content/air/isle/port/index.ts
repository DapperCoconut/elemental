import type {
  AreaDef, ArenaFloor, BakeryDef, FishDef, FisheryDef, IsleItemDef, ItemScriptFactory, QuestDef, RodDef, ShopDef,
  WandererDef,
} from '../../../../IslesTypes';
import { WINDLASS_AREA } from './windlass';
import { WINDLASS_FLOOR } from './floor';
import { ROD_ITEMS, RODS, SEA_FISH, SEA_FISH_ITEMS, WINDLASS_SEA } from './fishing';
import { PORT_BAKERIES, PORT_ITEMS, PORT_SCRIPTS, PORT_SHOPS } from './items';
import { WINDLASS_QUESTS } from './quests';
import { BARNABY } from './wanderer';

/**
 * Highspire's port content: Windlass (the cliff harbour at the spire's foot that every crossing
 * lands at), its five quests, Barnaby Tuft the wanderer, the six sea fish and the skyline rod, the
 * port's two shops and the Rising Loaf — plus the arena floor every Windlass quest duel is fought on
 * (registered by the engine under the key `windlass`; those duel foes carry `court: 'windlass'`).
 */
export const AIR_PORT: {
  area: AreaDef;
  wanderer: WandererDef;
  quests: QuestDef[];
  items: IsleItemDef[];
  scripts: Record<string, ItemScriptFactory>;
  shops: ShopDef[];
  bakeries: BakeryDef[];
  fish: FishDef[];
  fisheries: FisheryDef[];
  rods: RodDef[];
  floor: ArenaFloor;
} = {
  area: WINDLASS_AREA,
  wanderer: BARNABY,
  quests: WINDLASS_QUESTS,
  items: [...PORT_ITEMS, ...SEA_FISH_ITEMS, ...ROD_ITEMS],
  scripts: PORT_SCRIPTS,
  shops: PORT_SHOPS,
  bakeries: PORT_BAKERIES,
  fish: SEA_FISH,
  fisheries: [WINDLASS_SEA],
  rods: RODS,
  floor: WINDLASS_FLOOR,
};
