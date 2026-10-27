import type {
  AreaDef, ArenaFloor, BakeryDef, FishDef, FisheryDef, IsleItemDef, ItemScriptFactory, QuestDef, RodDef, ShopDef,
  WandererDef,
} from '../../../../IslesTypes';
import { BRINEHOLLOW_AREA } from './brinehollow';
import { BRINEHOLLOW_FLOOR } from './floor';
import { BRINEHOLLOW_SEA, ROD_ITEMS, RODS, SEA_FISH, SEA_FISH_ITEMS } from './fishing';
import { PORT_BAKERIES, PORT_ITEMS, PORT_SCRIPTS, PORT_SHOPS } from './items';
import { BRINEHOLLOW_QUESTS } from './quests';
import { ODO } from './wanderer';

/**
 * The Drowned Reach's port content: Brinehollow (the harbour every voyage lands at), its five
 * quests, Odo Fathomsby the wanderer, the six sea fish and the whalebone rod, the port's two shops
 * and the Brine Oven — plus the arena floor every Brinehollow quest duel is fought on (registered
 * by the engine under the key `brinehollow`; those duel foes carry `court: 'brinehollow'`).
 */
export const WATER_PORT: {
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
  area: BRINEHOLLOW_AREA,
  wanderer: ODO,
  quests: BRINEHOLLOW_QUESTS,
  items: [...PORT_ITEMS, ...SEA_FISH_ITEMS, ...ROD_ITEMS],
  scripts: PORT_SCRIPTS,
  shops: PORT_SHOPS,
  bakeries: PORT_BAKERIES,
  fish: SEA_FISH,
  fisheries: [BRINEHOLLOW_SEA],
  rods: RODS,
  floor: BRINEHOLLOW_FLOOR,
};
