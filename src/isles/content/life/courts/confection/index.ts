import type { CourtBundle } from '../../../../IslesTypes';
import { CONFECTION_AREA } from './area';
import { SACCHARO_BOSS } from './boss';
import { CONFECTION_ENCOUNTERS } from './encounters';
import { FALLEN } from './fallen';
import { confectionFloor } from './floor';
import { CARAMEL_POUR } from './gimmicks/caramel';
import { GINGERBREAD } from './gimmicks/gingerbread';
import { PINATA } from './gimmicks/pinata';
import { SUGAR_RUSH } from './gimmicks/sugarRush';
import { TAFFY_PULL } from './gimmicks/taffyPull';
import {
  ART_SACCHARO, CONFECTION_BAKERIES, CONFECTION_FISH, CONFECTION_FISHERIES, CONFECTION_ITEMS, CONFECTION_SCRIPTS,
  CONFECTION_SHOPS,
} from './items';
import { CONFECTION_QUESTS } from './quests';

/**
 * The Confection Court — gum (Savor: sugar and salt), tier 2 of Thornwild, Prince Saccharo.
 * A sugar town of gingerbread and syrup under the Sweet-Tax — a loaf a head a season, and the
 * short go up the hill to the Glasshouse — with the grey Saltcellar underneath holding it all
 * up. See docs/ten-isles.md for the concept, and each file here for its part.
 */
export const CONFECTION_COURT: CourtBundle = {
  court: {
    id: 'confection',
    isle: 'life',
    element: 'gum',
    name: 'The Confection Court',
    prince: { id: 'saccharo', name: 'Prince Saccharo', title: 'His Sweetness, Keeper of the Sweet-Tax', artifact: ART_SACCHARO },
    tier: 2,
    area: 'confection',
    floor: confectionFloor,
    encounters: CONFECTION_ENCOUNTERS,
    quests: CONFECTION_QUESTS,
    color: 0xf27aa8,
  },
  area: CONFECTION_AREA,
  gimmicks: [SUGAR_RUSH, TAFFY_PULL, GINGERBREAD, CARAMEL_POUR, PINATA],
  boss: SACCHARO_BOSS,
  items: CONFECTION_ITEMS,
  scripts: CONFECTION_SCRIPTS,
  shops: CONFECTION_SHOPS,
  bakeries: CONFECTION_BAKERIES,
  fish: CONFECTION_FISH,
  fisheries: CONFECTION_FISHERIES,
  fallen: FALLEN,
};
