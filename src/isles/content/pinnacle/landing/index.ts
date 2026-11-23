import type { PinnacleLandingBundle } from '../../../IslesTypes';
import { PIN_LANDING_AREA } from './area';
import { FERRYMAN } from './ferryman';
import { PIN_BAKERIES, PIN_ITEMS, PIN_SCRIPTS, PIN_SHOPS } from './items';

/**
 * Glasswater Landing — the foot of the Obsidian Pinnacle: the Muster's camp of ten wanderers, the
 * Beachmaster's jetty, the quartermaster's stores and the camp kitchen, and the Ferryman, who climbs
 * with the player. The landing's intro (`cine-landfall`) belongs to the cinematics builder.
 */
export const PIN_LANDING_BUNDLE: PinnacleLandingBundle = {
  area: PIN_LANDING_AREA,
  wanderer: FERRYMAN,
  items: PIN_ITEMS,
  scripts: PIN_SCRIPTS,
  shops: PIN_SHOPS,
  bakeries: PIN_BAKERIES,
  cutscenes: [],
};
