import type {
  AreaDef, ArenaFloor, BakeryDef, FishDef, FisheryDef, IsleItemDef, ItemScriptFactory, QuestDef, RodDef, ShopDef,
  WandererDef,
} from '../../../../IslesTypes';
import { QUARRYMOUTH_AREA } from './quarrymouth';
import { QUARRYMOUTH_FLOOR } from './floor';
import { QUARRYMOUTH_SEA, ROD_ITEMS, RODS, SEA_FISH, SEA_FISH_ITEMS } from './fishing';
import { PORT_BAKERIES, PORT_ITEMS, PORT_SCRIPTS, PORT_SHOPS } from './items';
import { QUARRYMOUTH_QUESTS } from './quests';
import { GIDEON } from './wanderer';

/**
 * Bedrock Hold's port content: Quarrymouth (the harbour cut into the old quarry face that every
 * crossing lands at), its five quests, Gideon Flint the wanderer, the six sea fish and the delver
 * rod, the port's two shops and the Hearthstone — plus the arena floor every Quarrymouth quest duel
 * is fought on (registered by the engine under the key `quarrymouth`; those duel foes carry
 * `court: 'quarrymouth'`).
 */
export const EARTH_PORT: {
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
  area: QUARRYMOUTH_AREA,
  wanderer: GIDEON,
  quests: QUARRYMOUTH_QUESTS,
  items: [...PORT_ITEMS, ...SEA_FISH_ITEMS, ...ROD_ITEMS],
  scripts: PORT_SCRIPTS,
  shops: PORT_SHOPS,
  bakeries: PORT_BAKERIES,
  fish: SEA_FISH,
  fisheries: [QUARRYMOUTH_SEA],
  rods: RODS,
  floor: QUARRYMOUTH_FLOOR,
};
