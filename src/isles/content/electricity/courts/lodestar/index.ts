import type { CourtBundle } from '../../../../IslesTypes';
import { LODESTAR_AREA } from './area';
import { LODESTAR_ENCOUNTERS, LODESTAR_GIMMICKS } from './encounters';
import { LODESTAR_FLOOR } from './floor';
import { ART_POLAR, LODESTAR_FISH, LODESTAR_FISHERIES, LODESTAR_ITEMS, LODESTAR_SCRIPTS, LODESTAR_SHOPS } from './items';
import { LODESTAR_COLOR } from './palette';
import { POLAR_BOSS } from './prince';
import { LODESTAR_QUESTS } from './quests';
import { FALLEN } from './fallen';

/**
 * The Lodestar Court — magnet, tier 3 of Voltreach, Prince Polar, True North.
 *
 * The iron crag round the great lodestone, east up the Needle Road from the Dynamo Court and north
 * of the Halflife: every compass on the isle points here, the sky-quarry floats cut stone on the
 * field, and the aurora never goes out. The stone drags on every Draw meter on the crag, so
 * Lodestar households are switched off for current they cranked. See docs/ten-isles/electricity.md
 * for the court's place on the isle, and each file here for its part.
 */
export const LODESTAR_COURT: CourtBundle = {
  court: {
    id: 'lodestar',
    isle: 'electricity',
    element: 'magnet',
    name: 'The Lodestar Court',
    prince: { id: 'polar', name: 'Prince Polar', title: 'True North', artifact: ART_POLAR },
    tier: 3,
    area: 'lodestar',
    floor: LODESTAR_FLOOR,
    encounters: LODESTAR_ENCOUNTERS,
    quests: LODESTAR_QUESTS,
    color: LODESTAR_COLOR,
  },
  area: LODESTAR_AREA,
  gimmicks: LODESTAR_GIMMICKS,
  boss: POLAR_BOSS,
  items: LODESTAR_ITEMS,
  scripts: LODESTAR_SCRIPTS,
  shops: LODESTAR_SHOPS,
  fish: LODESTAR_FISH,
  fisheries: LODESTAR_FISHERIES,
  fallen: FALLEN,
};
