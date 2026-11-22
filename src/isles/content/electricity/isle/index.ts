import type { IsleBundle } from '../../../IslesTypes';
import { ELECTRICITY_PORT } from './port';
import { ELECTRICITY_DUNGEON } from './crowncoil';

/**
 * Voltreach's isle-level content — everything that is not one of the six courts: the isle def,
 * Terminus (the cable harbour, its wanderer, sea fish and the insulated rod) from `port/`, the
 * Crown Coil (Empress Ohmrine's tower, its three wardens and the Empress) from `crowncoil/`, and
 * the Stormglass Mast the Galvaneel drops at sea.
 */
export const ELECTRICITY_CORE: Omit<IsleBundle, 'courts' | 'genes'> = {
  isle: {
    id: 'electricity',
    name: 'Voltreach',
    element: 'electricity',
    monarch: { id: 'ohmrine', name: 'Empress Ohmrine', title: 'of the Grid', artifact: 'art-ohmrine' },
    courts: ['dynamo', 'circuit', 'bounce', 'lodestar', 'halflife', 'superposition'],
    port: 'terminus',
    color: 0x5a8ad8,
    chart: { x: 0.88, y: 0.22 },
    outer: true,
  },
  wanderer: ELECTRICITY_PORT.wanderer,
  areas: [ELECTRICITY_PORT.area, ELECTRICITY_DUNGEON.area],
  quests: ELECTRICITY_PORT.quests,
  encounters: ELECTRICITY_DUNGEON.encounters,
  gimmicks: ELECTRICITY_DUNGEON.gimmicks,
  bosses: [ELECTRICITY_DUNGEON.boss],
  items: [...ELECTRICITY_PORT.items, ...ELECTRICITY_DUNGEON.items],
  scripts: { ...ELECTRICITY_PORT.scripts, ...ELECTRICITY_DUNGEON.scripts },
  shops: ELECTRICITY_PORT.shops,
  bakeries: ELECTRICITY_PORT.bakeries,
  fish: ELECTRICITY_PORT.fish,
  fisheries: ELECTRICITY_PORT.fisheries,
  rods: ELECTRICITY_PORT.rods,
  ubers: [{
    id: 'uber-stormmast', isle: 'electricity', name: 'Stormglass Mast',
    text: 'A lightning rod of the Galvaneel\'s glass cells: every six seconds the mast takes the storm and forks a bolt to the three nearest hazards ahead — rocks, drift and mines smashed, a beast scorched.',
    beast: 'galvaneel',
  }],
  floors: { crowncoil: ELECTRICITY_DUNGEON.floor, terminus: ELECTRICITY_PORT.floor },
};
