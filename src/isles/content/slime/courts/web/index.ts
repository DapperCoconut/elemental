import type { CourtBundle } from '../../../../IslesTypes';
import { WEB_AREA } from './area';
import { WEB_ENCOUNTERS, WEB_GIMMICKS } from './encounters';
import { FALLEN } from './fallen';
import { WEB_FLOOR } from './floor';
import { ART_WEFT, WEB_FISH, WEB_FISHERIES, WEB_ITEMS, WEB_SCRIPTS, WEB_SHOPS } from './items';
import { WEB_COLOR } from './palette';
import { WEFT_BOSS } from './prince';
import { WEB_QUESTS } from './quests';

/**
 * The Web Court — string, tier 2 of Fangmire, Prince Weft the Spymaster.
 *
 * The silk town in the canopy, west of the Fang Court and north of the Shackle Court: farmed
 * spiders, spinning mills, drying racks, bridges for streets and the woven Sheet for a floor, and
 * on the plaza the Spymaster's Web — a map of the isle in thread, one strand for every informer.
 * See docs/ten-isles/slime.md for the court's place on the isle, and each file here for its part.
 */
export const WEB_COURT: CourtBundle = {
  court: {
    id: 'web',
    isle: 'slime',
    element: 'string',
    name: 'The Web Court',
    prince: { id: 'weft', name: 'Prince Weft', title: 'the Spymaster', artifact: ART_WEFT },
    tier: 2,
    area: 'web',
    floor: WEB_FLOOR,
    encounters: WEB_ENCOUNTERS,
    quests: WEB_QUESTS,
    color: WEB_COLOR,
  },
  area: WEB_AREA,
  gimmicks: WEB_GIMMICKS,
  boss: WEFT_BOSS,
  items: WEB_ITEMS,
  scripts: WEB_SCRIPTS,
  shops: WEB_SHOPS,
  fish: WEB_FISH,
  fisheries: WEB_FISHERIES,
  fallen: FALLEN,
};
