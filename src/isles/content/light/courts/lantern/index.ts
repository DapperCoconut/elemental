import type { CourtBundle } from '../../../../IslesTypes';
import { LANTERN_AREA } from './area';
import { LANTERN_ENCOUNTERS, LANTERN_GIMMICKS } from './encounters';
import { FALLEN } from './fallen';
import { LANTERN_FLOOR } from './floor';
import { ART_WISP, LANTERN_FISH, LANTERN_FISHERIES, LANTERN_ITEMS, LANTERN_SCRIPTS, LANTERN_SHOPS } from './items';
import { LANTERN_COLOR } from './palette';
import { WISP_BOSS } from './prince';
import { LANTERN_QUESTS } from './quests';

/**
 * The Lantern Court — soul, tier 2 of Solmara, Prince Wisp the Lamplighter.
 *
 * The town of caught souls, down in a white limestone gorge west of the Noon Court: thousands of
 * lanterns hung on wires across the gorge, every one holding a soul that is not allowed to lie in
 * the dark. See docs/ten-isles/light.md for the court's place on the isle, and each file here for
 * its part.
 */
export const LANTERN_COURT: CourtBundle = {
  court: {
    id: 'lantern',
    isle: 'light',
    element: 'soul',
    name: 'The Lantern Court',
    prince: { id: 'wisp', name: 'Prince Wisp', title: 'the Lamplighter', artifact: ART_WISP },
    tier: 2,
    area: 'lantern',
    floor: LANTERN_FLOOR,
    encounters: LANTERN_ENCOUNTERS,
    quests: LANTERN_QUESTS,
    color: LANTERN_COLOR,
  },
  area: LANTERN_AREA,
  gimmicks: LANTERN_GIMMICKS,
  boss: WISP_BOSS,
  items: LANTERN_ITEMS,
  scripts: LANTERN_SCRIPTS,
  shops: LANTERN_SHOPS,
  fish: LANTERN_FISH,
  fisheries: LANTERN_FISHERIES,
  fallen: FALLEN,
};
