import type {
  AreaDef, ArenaFloor, BakeryDef, FishDef, FisheryDef, IsleItemDef, ItemScriptFactory, QuestDef, RodDef, ShopDef,
  WandererDef,
} from '../../../../IslesTypes';
import { MOSSGATE_AREA } from './mossgate';
import { MOSSGATE_FLOOR } from './floor';
import { MOSSGATE_SEA, ROD_ITEMS, RODS, SEA_FISH, SEA_FISH_ITEMS } from './fishing';
import { PORT_BAKERIES, PORT_ITEMS, PORT_SCRIPTS, PORT_SHOPS } from './items';
import { MOSSGATE_QUESTS } from './quests';
import { WENDELINE } from './wanderer';

/**
 * Thornwild's port content: Mossgate (the harbour in the Fallen Elder that every crossing lands at),
 * its five quests, Wendeline Burrows the wanderer, the six sea fish and the briarwood rod, the
 * port's two shops and the Crumb & Thistle — plus the arena floor every Mossgate quest duel is fought
 * on (registered by the engine under the key `mossgate`; those duel foes carry `court: 'mossgate'`).
 */
export const LIFE_PORT: {
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
  area: MOSSGATE_AREA,
  wanderer: WENDELINE,
  quests: MOSSGATE_QUESTS,
  items: [...PORT_ITEMS, ...SEA_FISH_ITEMS, ...ROD_ITEMS],
  scripts: PORT_SCRIPTS,
  shops: PORT_SHOPS,
  bakeries: PORT_BAKERIES,
  fish: SEA_FISH,
  fisheries: [MOSSGATE_SEA],
  rods: RODS,
  floor: MOSSGATE_FLOOR,
};
