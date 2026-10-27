import type { IsleBundle } from '../../../IslesTypes';
import { EMBERPORT_AREA } from './emberport';
import { EMBERPORT_QUESTS } from './emberportQuests';
import { KILN_AREA } from './kiln';
import { KILN_FLOOR, KILN_GIMMICKS, KILN_WARDENS } from './wardens';
import { ASHGRAVE_BOSS } from './ashgrave';
import { TAMSIN } from './wanderer';
import { EMBERPORT_SEA, ROD_ITEMS, RODS, SEA_FISH, SEA_FISH_ITEMS } from './fishing';
import { PORT_BAKERIES, PORT_ITEMS, PORT_SCRIPTS, PORT_SHOPS } from './portItems';

/**
 * Brandmark's isle-level content — everything that is not one of the six courts: the isle def,
 * Emberport (the harbour), the Kiln (the King's dungeon) with its three wardens, King Ashgrave,
 * Tamsin the wanderer, the sea fish, the rods, the port's shops and bakery, and the Brazier
 * Turret the Magmaw drops at sea.
 */
export const FIRE_CORE: Omit<IsleBundle, 'courts' | 'genes'> = {
  isle: {
    id: 'fire',
    name: 'Brandmark',
    element: 'fire',
    monarch: { id: 'ashgrave', name: 'King Ashgrave', title: 'the Brand-King', artifact: 'art-ashgrave' },
    courts: ['hearth', 'powder', 'boilerworks', 'candlewick', 'corona', 'caldera'],
    port: 'emberport',
    color: 0xff6a1a,
    chart: { x: 0.2, y: 0.62 },
  },
  wanderer: TAMSIN,
  areas: [EMBERPORT_AREA, KILN_AREA],
  quests: EMBERPORT_QUESTS,
  encounters: KILN_WARDENS,
  gimmicks: KILN_GIMMICKS,
  bosses: [ASHGRAVE_BOSS],
  items: [...PORT_ITEMS, ...SEA_FISH_ITEMS, ...ROD_ITEMS],
  scripts: PORT_SCRIPTS,
  shops: PORT_SHOPS,
  bakeries: PORT_BAKERIES,
  fish: SEA_FISH,
  fisheries: [EMBERPORT_SEA],
  rods: RODS,
  ubers: [{
    id: 'uber-brazier', isle: 'fire', name: 'Brazier Turret',
    text: 'An auto-firing brazier on the bow that lobs fireballs at rocks and beasts.', beast: 'magmaw',
  }],
  floors: { kiln: KILN_FLOOR },
};
