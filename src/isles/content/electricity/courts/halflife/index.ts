import type { CourtBundle } from '../../../../IslesTypes';
import { HALFLIFE_AREA } from './area';
import { HALFLIFE_ENCOUNTERS, HALFLIFE_GIMMICKS } from './encounters';
import { HALFLIFE_FLOOR } from './floor';
import { ART_ISOTOPE, HALFLIFE_FISH, HALFLIFE_FISHERIES, HALFLIFE_ITEMS, HALFLIFE_SCRIPTS, HALFLIFE_SHOPS } from './items';
import { HALFLIFE_COLOR } from './palette';
import { ISOTOPE_BOSS } from './prince';
import { HALFLIFE_QUESTS } from './quests';

/**
 * The Halflife Court — radiation, tier 3 of Voltreach, Prince Isotope the Unstable.
 *
 * The glowing mining town east of Terminus: pitch-blende pits, lead-roofed cottages lent by the
 * Prince and stripped when the Draw is short, decay clocks on every corner, glowcaps in the
 * gutters, the cooling pond, and the Reactor Dome where the ore is burnt into the Grid's current.
 * See docs/ten-isles/electricity.md for the court's place on the isle, and each file here for its part.
 */
export const HALFLIFE_COURT: CourtBundle = {
  court: {
    id: 'halflife',
    isle: 'electricity',
    element: 'radiation',
    name: 'The Halflife Court',
    prince: { id: 'isotope', name: 'Prince Isotope', title: 'the Unstable', artifact: ART_ISOTOPE },
    tier: 3,
    area: 'halflife',
    floor: HALFLIFE_FLOOR,
    encounters: HALFLIFE_ENCOUNTERS,
    quests: HALFLIFE_QUESTS,
    color: HALFLIFE_COLOR,
  },
  area: HALFLIFE_AREA,
  gimmicks: HALFLIFE_GIMMICKS,
  boss: ISOTOPE_BOSS,
  items: HALFLIFE_ITEMS,
  scripts: HALFLIFE_SCRIPTS,
  shops: HALFLIFE_SHOPS,
  fish: HALFLIFE_FISH,
  fisheries: HALFLIFE_FISHERIES,
};
