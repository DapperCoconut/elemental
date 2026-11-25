import type { CourtBundle } from '../../../../IslesTypes';
import { MURAL_AREA } from './area';
import { MURAL_ENCOUNTERS, MURAL_GIMMICKS } from './encounters';
import { MURAL_FLOOR } from './floor';
import { FALLEN } from './fallen';
import { ART_HUE, MURAL_FISH, MURAL_FISHERIES, MURAL_ITEMS, MURAL_SCRIPTS, MURAL_SHOPS } from './items';
import { MURAL_COLOR } from './palette';
import { HUE_BOSS } from './prince';
import { MURAL_QUESTS } from './quests';

/**
 * The Mural Court — chalk (Paint), tier 2 of Solmara, Prince Hue the Painter Royal.
 *
 * The painters' town in the south-west of the isle, between the Lantern gorge and Meridian Quay:
 * every wall one huge painting of Despot Auriel at noon, and a Canon of Light that bleaches any
 * painter who paints a shadow. See docs/ten-isles/light.md for the court's place on the isle,
 * and each file here for its part.
 */
export const MURAL_COURT: CourtBundle = {
  court: {
    id: 'mural',
    isle: 'light',
    element: 'chalk',
    name: 'The Mural Court',
    prince: { id: 'hue', name: 'Prince Hue', title: 'the Painter Royal', artifact: ART_HUE },
    tier: 2,
    area: 'mural',
    floor: MURAL_FLOOR,
    encounters: MURAL_ENCOUNTERS,
    quests: MURAL_QUESTS,
    color: MURAL_COLOR,
  },
  area: MURAL_AREA,
  gimmicks: MURAL_GIMMICKS,
  boss: HUE_BOSS,
  items: MURAL_ITEMS,
  scripts: MURAL_SCRIPTS,
  shops: MURAL_SHOPS,
  fish: MURAL_FISH,
  fisheries: MURAL_FISHERIES,
  fallen: FALLEN,
};
