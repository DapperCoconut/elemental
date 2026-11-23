import type { IsleBundle } from '../../../IslesTypes';
import { FATE_PORT } from './port';
import { FATE_DUNGEON } from './house';

/**
 * Lotterhaven's isle-level content — everything that is not one of the six courts: the isle def,
 * Tosswater (the lottery harbour, its wanderer, sea fish and the fortune rod) from `port/`, the
 * House (the Croupier-King's casino-palace, its three wardens and Lucan himself) from `house/`, and
 * the Fortune Helm the Wheelback drops at sea.
 */
export const FATE_CORE: Omit<IsleBundle, 'courts' | 'genes'> = {
  isle: {
    id: 'fate',
    name: 'Lotterhaven',
    element: 'fate',
    monarch: { id: 'lucan', name: 'the Croupier-King Lucan', title: 'Dealer of the Draw', artifact: 'art-lucan' },
    courts: ['card', 'clockwork', 'treasury', 'remembrance', 'mind', 'war'],
    port: 'tosswater',
    color: 0x88eecc,
    chart: { x: 0.94, y: 0.46 },
    outer: true,
  },
  wanderer: FATE_PORT.wanderer,
  areas: [FATE_PORT.area, FATE_DUNGEON.area],
  quests: FATE_PORT.quests,
  encounters: FATE_DUNGEON.encounters,
  gimmicks: FATE_DUNGEON.gimmicks,
  bosses: [FATE_DUNGEON.boss],
  items: [...FATE_PORT.items, ...FATE_DUNGEON.items],
  scripts: { ...FATE_PORT.scripts, ...FATE_DUNGEON.scripts },
  shops: FATE_PORT.shops,
  bakeries: FATE_PORT.bakeries,
  fish: FATE_PORT.fish,
  fisheries: FATE_PORT.fisheries,
  rods: FATE_PORT.rods,
  ubers: [{
    id: 'uber-fortunehelm', isle: 'fate', name: 'Fortune Helm',
    text: 'The ship\'s wheel is a little roulette wheel that spins itself every seven seconds and lands on a boon: gust (a burst of speed), ward (shrug off the next blow) or broadside (a shot at the nearest hazard ahead).',
    beast: 'wheelback',
  }],
  floors: { house: FATE_DUNGEON.floor, tosswater: FATE_PORT.floor },
};
