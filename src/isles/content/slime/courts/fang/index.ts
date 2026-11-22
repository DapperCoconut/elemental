import type { CourtBundle } from '../../../../IslesTypes';
import { FANG_AREA } from './area';
import { FANG_ENCOUNTERS, FANG_GIMMICKS } from './encounters';
import { FANG_FLOOR } from './floor';
import {
  ART_VENIN, FANG_BAKERIES, FANG_FISH, FANG_FISHERIES, FANG_ITEMS, FANG_SCRIPTS, FANG_SHOPS,
} from './items';
import { FANG_COLOR } from './palette';
import { VENIN_BOSS } from './prince';
import { FANG_QUESTS } from './quests';

/**
 * The Fang Court — slime (Venom), tier 1 of Fangmire, Prince Venin the Milk-Fanged.
 *
 * The venom-milkers' town on a steaming fen, first court up the causeway from Stilthaven: snake
 * pits behind withy walls, the Milking Shed where the serpents are yoked and milked for the
 * Matriarch's still, the vats, the great white fangs standing out of the black water — and the
 * Draught that every Marked wrist on the isle depends on. Home of *The Charmer's Basket* bakery
 * and the venom fen (antivenin rod). See docs/ten-isles/slime.md, and each file here for its part.
 */
export const FANG_COURT: CourtBundle = {
  court: {
    id: 'fang',
    isle: 'slime',
    element: 'slime',
    name: 'The Fang Court',
    prince: { id: 'venin', name: 'Prince Venin', title: 'the Milk-Fanged', artifact: ART_VENIN },
    tier: 1,
    area: 'fang',
    floor: FANG_FLOOR,
    encounters: FANG_ENCOUNTERS,
    quests: FANG_QUESTS,
    color: FANG_COLOR,
  },
  area: FANG_AREA,
  gimmicks: FANG_GIMMICKS,
  boss: VENIN_BOSS,
  items: FANG_ITEMS,
  scripts: FANG_SCRIPTS,
  shops: FANG_SHOPS,
  bakeries: FANG_BAKERIES,
  fish: FANG_FISH,
  fisheries: FANG_FISHERIES,
};
