import type { CourtBundle } from '../../../../IslesTypes';
import { UMBRAL_AREA } from './area';
import { UMBRAL_ENCOUNTERS, UMBRAL_GIMMICKS } from './encounters';
import { UMBRAL_FLOOR } from './floor';
import { ART_DUSK, UMBRAL_FISH, UMBRAL_FISHERIES, UMBRAL_ITEMS, UMBRAL_SCRIPTS, UMBRAL_SHOPS } from './items';
import { UMBRAL_COLOR } from './palette';
import { DUSK_BOSS } from './prince';
import { UMBRAL_QUESTS } from './quests';

/**
 * The Umbral Court — shadow, tier 3 of Fangmire, Prince Dusk the Lamp-Snuffer.
 *
 * East of Stilthaven along the Dimming Road: a town under a canopy so thick no light reaches,
 * where the lamps burn black by order, the Moult-Tithe is cloth woven from people's own shadows,
 * and a yellow flame is contraband. See docs/ten-isles/slime.md for the court's place on the isle,
 * and each file here for its part.
 */
export const UMBRAL_COURT: CourtBundle = {
  court: {
    id: 'umbral',
    isle: 'slime',
    element: 'shadow',
    name: 'The Umbral Court',
    prince: { id: 'dusk', name: 'Prince Dusk', title: 'the Lamp-Snuffer', artifact: ART_DUSK },
    tier: 3,
    area: 'umbral',
    floor: UMBRAL_FLOOR,
    encounters: UMBRAL_ENCOUNTERS,
    quests: UMBRAL_QUESTS,
    color: UMBRAL_COLOR,
  },
  area: UMBRAL_AREA,
  gimmicks: UMBRAL_GIMMICKS,
  boss: DUSK_BOSS,
  items: UMBRAL_ITEMS,
  scripts: UMBRAL_SCRIPTS,
  shops: UMBRAL_SHOPS,
  fish: UMBRAL_FISH,
  fisheries: UMBRAL_FISHERIES,
};
